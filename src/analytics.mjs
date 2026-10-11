// 売れた時刻の追跡と、曜日×時間帯の分析。
// Cloudflare無料プランは1回の処理の通信回数に上限(約50)があるため、
// 過去データの取り込みやチャットの読み込みは、10分ごとの実行で少しずつ進める。
import { fetchPage, fetchChatSoldAt, TARGET_CATEGORY } from "./scrape.mjs";
import { db, load } from "./core.mjs";
import { jstParts } from "./gc.mjs";

const DATA_VERSION = 2;
const PENDING_MS = 48 * 3600e3; // 出品から48時間たっていない売れ残りは「結果待ち」
// 1回のスキャンで使う通信回数の目安(上限50に対して余裕を持たせる)
const BUDGET = { onsalePages: 3, backfillPages: 6, chats: 8 };

// 「売れた」とみなす状態(購入された)。キャンセル系は売れていない扱い。
const SOLD = new Set(["支払完了", "商品お渡し", "完了", "キャンセル申請", "取引中"]);
const NOT_SOLD = new Set(["キャンセル", "未払キャンセル", "終了"]);

function emptyData() {
  return {
    version: DATA_VERSION,
    records: {}, // productId -> { l: 出品時刻, s: 売れた時刻|null, v: 閲覧数, sold: bool, x: 販売時刻が正確か, st: 状態 }
    chatQueue: [], // [productId, chatId] 販売日時を取りに行く待ち行列
    backfill: null, // { queue: [[status, page], ...], total, done }
    onsaleCursor: 1,
    lastScan: 0,
  };
}

export async function loadData(env) {
  const v = await db(env).get("salesData");
  if (!v || v.version !== DATA_VERSION) {
    // 旧形式のデータは作り直す(取り込み漏れがあったため)
    return emptyData();
  }
  return { ...emptyData(), ...v };
}
export const saveData = (env, d) => db(env).put("salesData", d);

const isTarget = (it) => it.category === TARGET_CATEGORY;

// 一覧の1件を記録に反映する
function upsert(data, it, { live, now }) {
  const r = (data.records[it.productId] ||= { l: it.listedAt, s: null, v: 0, sold: false, x: false, st: it.status });
  if (it.listedAt) r.l = it.listedAt;
  r.v = Math.max(r.v || 0, it.views || 0);
  r.st = it.status;
  if (SOLD.has(it.status) && !r.sold) {
    r.sold = true;
    // 普段のスキャンで初めて見つけた売れた商品は、発見時刻を仮の販売時刻にする(±10分)
    if (live && !r.s) r.s = now;
    if (it.chatId && !it.unread && !r.x) data.chatQueue.push([it.productId, it.chatId]);
  } else if (NOT_SOLD.has(it.status) && it.status !== "終了") {
    // キャンセルになったものは売れていない扱いに戻す
    r.sold = false; r.s = null; r.x = false;
  }
}

// 10分ごと(または手動)に呼ばれる
export async function scanSales(env, now = Date.now()) {
  const secret = await load(env, "secret");
  if (!secret.phpsessid) return { skipped: "nosession" };
  const S = secret.phpsessid;
  const data = await loadData(env);
  const report = { newlySold: 0, pages: 0, chats: 0 };
  const firstRun = !data.backfill;

  // 1) 取引中(売れた直後の商品が来る場所)を毎回確認
  const tr = await fetchPage(S, "trading", 1);
  report.pages++;
  if (!tr.ok) { if (tr.status === "session") return { skipped: "session" }; }
  const beforeSold = Object.values(data.records).filter((r) => r.sold).length;
  for (const it of tr.items.filter(isTarget)) upsert(data, it, { live: !firstRun, now });
  for (let p = 2; p <= Math.min(tr.maxPage, 3); p++) {
    const r = await fetchPage(S, "trading", p); report.pages++;
    for (const it of r.items.filter(isTarget)) upsert(data, it, { live: !firstRun, now });
  }

  // 2) 完了の1ページ目(10分以内に取引完了まで進んだ商品も取りこぼさない)
  const cp = await fetchPage(S, "completed", 1);
  report.pages++;
  for (const it of cp.items.filter(isTarget)) upsert(data, it, { live: !firstRun, now });

  // 3) 出品中を少しずつ巡回(閲覧数と出品時刻の記録用)。1ページ目は毎回見る
  const op1 = await fetchPage(S, "onsale", 1);
  report.pages++;
  for (const it of op1.items.filter(isTarget)) upsert(data, it, { live: false, now });
  const maxOn = op1.maxPage || 1;
  for (let i = 0; i < BUDGET.onsalePages - 1 && maxOn > 1; i++) {
    data.onsaleCursor = data.onsaleCursor >= maxOn ? 2 : data.onsaleCursor + 1;
    const r = await fetchPage(S, "onsale", data.onsaleCursor); report.pages++;
    for (const it of r.items.filter(isTarget)) upsert(data, it, { live: false, now });
  }

  // 4) 過去データの取り込み(初回に待ち行列を作り、毎回少しずつ進める)
  if (!data.backfill) {
    const closed1 = await fetchPage(S, "closed", 1);
    report.pages++;
    for (const it of closed1.items.filter(isTarget)) upsert(data, it, { live: false, now });
    const queue = [];
    for (let p = 2; p <= (cp.maxPage || 1); p++) queue.push(["completed", p]);
    for (let p = 2; p <= (closed1.maxPage || 1); p++) queue.push(["closed", p]);
    data.backfill = { queue, total: queue.length + 2, done: queue.length === 0 };
  }
  if (!data.backfill.done) {
    for (let i = 0; i < BUDGET.backfillPages && data.backfill.queue.length; i++) {
      const [status, page] = data.backfill.queue.shift();
      const r = await fetchPage(S, status, page); report.pages++;
      for (const it of r.items.filter(isTarget)) upsert(data, it, { live: false, now });
    }
    if (!data.backfill.queue.length) data.backfill.done = true;
  }

  // 5) 正確な販売日時を、待ち行列から少しずつ取りに行く(未読のない取引のみ)
  const seen = new Set();
  data.chatQueue = data.chatQueue.filter(([pid]) => { if (seen.has(pid) || data.records[pid]?.x) return false; seen.add(pid); return true; });
  for (let i = 0; i < BUDGET.chats && data.chatQueue.length; i++) {
    const [pid, chatId] = data.chatQueue.shift();
    const soldAt = await fetchChatSoldAt(S, chatId).catch(() => null);
    report.chats++;
    const r = data.records[pid];
    if (r && soldAt) { r.s = soldAt; r.x = true; }
  }

  report.newlySold = Object.values(data.records).filter((r) => r.sold).length - beforeSold;
  data.lastScan = now;
  await saveData(env, data);
  return { ...report, backfillLeft: data.backfill.queue.length, chatLeft: data.chatQueue.length };
}

// ===== 分析 =====
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

export function analyze(data, now = Date.now()) {
  const all = Object.values(data.records).filter((r) => r.l);
  // 結果が出ているもの: 売れた、または出品から48時間以上たった
  const eligible = all.filter((r) => r.sold || now - r.l >= PENDING_MS);
  const pending = all.length - eligible.length;
  const soldAll = all.filter((r) => r.sold);

  const cell = {}; const hour = Array.from({ length: 24 }, () => ({ listed: 0, sold: 0, ms: [], views: [] }));
  const wday = Array.from({ length: 7 }, () => ({ listed: 0, sold: 0 }));
  for (const r of eligible) {
    const p = jstParts(r.l), k = p.wd + "-" + p.h;
    const c = (cell[k] ||= { listed: 0, sold: 0, ms: [], views: [] });
    c.listed++; hour[p.h].listed++; wday[p.wd].listed++;
    c.views.push(r.v || 0); hour[p.h].views.push(r.v || 0);
    if (r.sold) {
      c.sold++; hour[p.h].sold++; wday[p.wd].sold++;
      if (r.x && r.s > r.l) { c.ms.push(r.s - r.l); hour[p.h].ms.push(r.s - r.l); }
    }
  }
  const g = eligible.length ? eligible.filter((r) => r.sold).length / eligible.length : 0;
  const K = 5;
  const sm = (c) => ({ listed: c.listed, sold: c.sold, rate: (c.sold + K * g) / (c.listed + K), medHours: median(c.ms) ? median(c.ms) / 3600e3 : null, avgViews: c.views.length ? c.views.reduce((a, b) => a + b, 0) / c.views.length : 0 });
  const score = {};
  for (let wd = 0; wd < 7; wd++) for (let h = 0; h < 24; h++) score[wd + "-" + h] = sm(cell[wd + "-" + h] || { listed: 0, sold: 0, ms: [], views: [] });

  // 購入が多い時間帯(販売時刻が分かっているものの分布)
  const buy = {}; const buyHour = new Array(24).fill(0);
  for (const r of soldAll) if (r.s) { const p = jstParts(r.s); buy[p.wd + "-" + p.h] = (buy[p.wd + "-" + p.h] || 0) + 1; buyHour[p.h]++; }

  return {
    totalListed: eligible.length, totalSold: soldAll.length, globalRate: g, pending,
    exactCount: soldAll.filter((r) => r.x).length, score, hour: hour.map(sm), wday,
    buy, buyHour,
    backfill: data.backfill ? { left: data.backfill.queue.length, total: data.backfill.total, done: data.backfill.done } : null,
    chatLeft: data.chatQueue.length,
  };
}

// おすすめ出品時刻。「その時間に出した出品の売れやすさ」と「その直後(3時間)の購入の多さ」を組み合わせる
export function recommendSlots(a, { count = 15, minGapMin = 90 } = {}) {
  const conv = a.hour.map((c) => c.rate);
  const buyNext = Array.from({ length: 24 }, (_, h) => a.buyHour[h] + a.buyHour[(h + 1) % 24] + a.buyHour[(h + 2) % 24]);
  const norm = (arr) => { const mx = Math.max(...arr), mn = Math.min(...arr); return arr.map((x) => (mx > mn ? (x - mn) / (mx - mn) : 0.5)); };
  const nc = norm(conv), nb = norm(buyNext);
  const hasBuy = a.buyHour.some((x) => x > 0);
  const hourScore = nc.map((x, h) => (hasBuy ? 0.6 * x + 0.4 * nb[h] : x));

  const gap = Math.max(minGapMin, Math.floor(1440 / count) - 2);
  const blocked = new Uint8Array(1440); const chosen = [];
  const order = [...Array(1440).keys()].sort((x, y) => hourScore[Math.floor(y / 60)] - hourScore[Math.floor(x / 60)] || x - y);
  for (const m of order) {
    if (chosen.length >= count) break;
    if (blocked[m]) continue;
    chosen.push(m);
    for (let d = 0; d < gap; d++) { blocked[(m + d) % 1440] = 1; blocked[(m - d + 1440) % 1440] = 1; }
  }
  for (let i = 0; chosen.length < count && i < count; i++) { const m = i * Math.floor(1440 / count); if (!chosen.some((x) => Math.abs(x - m) < 30)) chosen.push(m); }
  return chosen.sort((x, y) => x - y).slice(0, count).map((m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
}

export function confidence(a) {
  if (a.backfill && !a.backfill.done) return { level: "low", label: "取り込み中", note: `過去データを取り込んでいます(残り${a.backfill.left}ページ)。終わるまで推奨は当てになりません。` };
  if (a.totalSold < 20) return { level: "low", label: "データ不足", note: "売れた記録が少なく、推奨はまだ当てになりません。" };
  if (a.totalSold < 60) return { level: "mid", label: "参考程度", note: "傾向が見え始めています。推奨は参考程度に。" };
  return { level: "high", label: "十分", note: "十分なデータがあります。自動最適化を使えます。" };
}

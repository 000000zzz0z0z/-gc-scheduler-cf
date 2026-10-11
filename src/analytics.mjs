// 売れた時刻の追跡と、曜日×時間帯の分析。
// データは Durable Object に salesData として貯める。
import { fetchList, fetchChatSoldAt, onlyTarget } from "./scrape.mjs";
import { db, load } from "./core.mjs";
import { jstParts } from "./gc.mjs";

// 取引中・完了・キャンセル系は「売れた(購入された)」とみなす
const SOLD_STATUSES = ["支払完了", "商品お渡し", "完了", "キャンセル申請", "キャンセル", "取引中"];
// 売れずに終わった
const UNSOLD_STATUSES = ["終了", "未払キャンセル"];

function emptyData() {
  // records: productId -> { listedAt, soldAt, views, sold, exact(販売日時が正確か) }
  // seen: 出品中で最後に見た productId の集合(消えたら「売れた」候補)
  return { records: {}, lastOnsaleIds: [], importedHistory: false, lastScan: 0 };
}

export async function loadData(env) {
  const v = await db(env).get("salesData");
  return v ? { ...emptyData(), ...v } : emptyData();
}
export const saveData = (env, d) => db(env).put("salesData", d);

// 10分おきに呼ばれる: 出品中・取引中を見て、売れた時刻を追跡
export async function scanSales(env, now = Date.now()) {
  const secret = await load(env, "secret");
  if (!secret.phpsessid) return { skipped: "nosession" };
  const data = await loadData(env);

  // 初回だけ過去の履歴を取り込む
  if (!data.importedHistory) {
    await importHistory(env, secret.phpsessid, data, now);
    data.importedHistory = true;
  }

  const [onsale, trading] = await Promise.all([
    fetchList(secret.phpsessid, "onsale", { maxPages: 40 }),
    fetchList(secret.phpsessid, "trading", { maxPages: 5 }),
  ]);
  if (onsale.ok === false && onsale.items.length === 0 && onsale.status === "session") return { skipped: "session" };

  const onItems = onlyTarget(onsale.items);
  const trItems = onlyTarget(trading.items);
  const onIds = new Set(onItems.map((i) => i.productId));

  // 出品中の各商品の情報を記録・更新(閲覧数の最新値も)
  for (const it of onItems) {
    const rec = (data.records[it.productId] ||= { listedAt: it.listedAt, soldAt: null, views: 0, sold: false, exact: false });
    rec.listedAt = it.listedAt || rec.listedAt;
    rec.views = Math.max(rec.views, it.views);
  }

  // 取引中に現れた = 売れた。前回まで出品中にあって今回消えたものも売れた候補。
  let newlySold = 0;
  for (const it of trItems) {
    const rec = (data.records[it.productId] ||= { listedAt: it.listedAt, soldAt: null, views: it.views, sold: false, exact: false });
    rec.views = Math.max(rec.views, it.views);
    if (!rec.sold) {
      rec.sold = true;
      // 正確な販売日時を取りに行く(未読がない取引だけ。既読を付けないため)
      if (it.chatId && !it.unread) {
        const soldAt = await fetchChatSoldAt(secret.phpsessid, it.chatId).catch(() => null);
        if (soldAt) { rec.soldAt = soldAt; rec.exact = true; }
      }
      if (!rec.soldAt) { rec.soldAt = now; rec.exact = false; } // 取れなければ発見時刻(±10分)
      newlySold++;
    }
  }

  // 前回は出品中だったのに、今回は出品中にも取引中にもいない → 売れた見込み(取り下げの可能性もあるので発見時刻で控えめに)
  const trIds = new Set(trItems.map((i) => i.productId));
  for (const pid of data.lastOnsaleIds || []) {
    if (!onIds.has(pid) && !trIds.has(pid)) {
      const rec = data.records[pid];
      if (rec && !rec.sold) { rec.sold = true; rec.soldAt = now; rec.exact = false; newlySold++; }
    }
  }

  data.lastOnsaleIds = [...onIds];
  data.lastScan = now;
  // 古すぎる記録は捨てる(1年)
  for (const [pid, rec] of Object.entries(data.records)) {
    if (rec.listedAt && now - rec.listedAt > 365 * 86400e3) delete data.records[pid];
  }
  await saveData(env, data);
  return { onsale: onItems.length, trading: trItems.length, newlySold };
}

// 過去の「完了・キャンセル」を取り込む(初回のみ)。売れた=完了/キャンセル系。
async function importHistory(env, session, data, now) {
  const completed = await fetchList(session, "completed", { maxPages: 25 });
  const closed = await fetchList(session, "closed", { maxPages: 25 });
  for (const it of onlyTarget(completed.items)) {
    const sold = !["未払キャンセル"].includes(it.status); // 未払いキャンセルは売れていない
    const rec = (data.records[it.productId] ||= { listedAt: it.listedAt, soldAt: null, views: it.views, sold: false, exact: false });
    rec.views = Math.max(rec.views, it.views);
    if (sold && !rec.sold) {
      rec.sold = true;
      if (it.chatId && !it.unread) {
        const soldAt = await fetchChatSoldAt(session, it.chatId).catch(() => null);
        if (soldAt) { rec.soldAt = soldAt; rec.exact = true; }
      }
      // 正確な時刻が取れない過去データは、売れたことだけ記録し時刻は出品時刻で代用(分析では控えめに扱う)
      if (!rec.soldAt) { rec.soldAt = it.listedAt; rec.exact = false; }
    }
  }
  // 出品終了(売れ残り)は「その時間に出すと売れなかった」実績として使う
  for (const it of onlyTarget(closed.items)) {
    const rec = (data.records[it.productId] ||= { listedAt: it.listedAt, soldAt: null, views: it.views, sold: false, exact: false });
    rec.views = Math.max(rec.views, it.views);
  }
}

// ===== 分析 =====
// 各出品を「出品した曜日×時間帯」に割り当て、売れたか・何時間で売れたかを集計
export function analyze(data, now = Date.now()) {
  const recs = Object.values(data.records).filter((r) => r.listedAt);
  const cells = {}; // "wd-h" -> {listed, sold, sellMs[], views[]}
  const hour = Array.from({ length: 24 }, () => ({ listed: 0, sold: 0, sellMs: [], views: [] }));
  const wday = Array.from({ length: 7 }, () => ({ listed: 0, sold: 0 }));

  for (const r of recs) {
    const p = jstParts(r.listedAt);
    const key = p.wd + "-" + p.h;
    const c = (cells[key] ||= { listed: 0, sold: 0, sellMs: [], views: [] });
    c.listed++; hour[p.h].listed++; wday[p.wd].listed++;
    c.views.push(r.views || 0); hour[p.h].views.push(r.views || 0);
    if (r.sold) {
      c.sold++; hour[p.h].sold++; wday[p.wd].sold++;
      if (r.soldAt && r.exact && r.soldAt > r.listedAt) { const ms = r.soldAt - r.listedAt; c.sellMs.push(ms); hour[p.h].sellMs.push(ms); }
    }
  }

  const totalListed = recs.length;
  const totalSold = recs.filter((r) => r.sold).length;
  const globalRate = totalListed ? totalSold / totalListed : 0;

  // 各セルのスコア: データが少ないセルは全体平均に寄せる(ベイズ平滑化)。
  const K = 5; // 平滑化の強さ(この件数ぶん、全体平均を混ぜる)
  const score = {};
  for (let wd = 0; wd < 7; wd++) for (let h = 0; h < 24; h++) {
    const c = cells[wd + "-" + h] || { listed: 0, sold: 0, sellMs: [], views: [] };
    const rate = (c.sold + K * globalRate) / (c.listed + K);
    const medMs = median(c.sellMs);
    const avgViews = c.views.length ? c.views.reduce((a, b) => a + b, 0) / c.views.length : 0;
    score[wd + "-" + h] = { listed: c.listed, sold: c.sold, rate, medHours: medMs ? medMs / 3600e3 : null, avgViews };
  }

  return { totalListed, totalSold, globalRate, score, hour: hour.map(summ(globalRate, K)), wday, exactCount: recs.filter((r) => r.exact).length };
}

const summ = (g, K) => (c) => ({ listed: c.listed, sold: c.sold, rate: (c.sold + K * g) / (c.listed + K), medHours: median(c.sellMs) ? median(c.sellMs) / 3600e3 : null, avgViews: c.views.length ? c.views.reduce((a, b) => a + b, 0) / c.views.length : 0 });
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

// 分析から、1日 n 枠のおすすめ出品時刻(分)を作る。
// スコア(売れやすさ)の高い時間帯に枠を寄せるが、30分ルールのため最低間隔をあける。
export function recommendSlots(analysis, { count = 15, minGapMin = 90, targetWeekday = null } = {}) {
  const sc = analysis.score;
  const hourScore = Array.from({ length: 24 }, (_, h) => {
    if (targetWeekday != null) { const c = sc[targetWeekday + "-" + h]; return c ? c.rate : 0; }
    let s = 0; for (let wd = 0; wd < 7; wd++) s += sc[wd + "-" + h]?.rate || 0; return s / 7;
  });
  // 96分×15枠=1440分なので、間隔はぴったりでないと15枠入らない。
  // 最低間隔を max(90, 1日/枠数) として、その制約下で合計スコア最大の配置を探す。
  const gap = Math.max(minGapMin, Math.floor(1440 / count) - 2);

  // 分ごとのスコア(その時間帯の売れやすさ)
  const minScore = (m) => hourScore[Math.floor((m % 1440) / 60)];

  // 貪欲法: 最良の点を置き、その前後 gap 分を禁止。count 個になるまで繰り返す。
  const blocked = new Uint8Array(1440);
  const chosen = [];
  const order = [...Array(1440).keys()].sort((a, b) => minScore(b) - minScore(a));
  for (const m of order) {
    if (chosen.length >= count) break;
    if (blocked[m]) continue;
    chosen.push(m);
    for (let d = 0; d < gap; d++) { blocked[(m + d) % 1440] = 1; blocked[(m - d + 1440) % 1440] = 1; }
  }
  // 足りなければ(混み合って置けない)間隔を詰めて補充
  if (chosen.length < count) {
    const step = Math.floor(1440 / count);
    for (let i = 0; i < count && chosen.length < count; i++) {
      const m = i * step;
      if (!chosen.some((x) => Math.abs(x - m) < 15)) chosen.push(m);
    }
  }
  return chosen.sort((a, b) => a - b).slice(0, count).map((m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
}

// 分析の信頼度(データ量)に応じて、推奨をどれだけ採用してよいかの目安
export function confidence(analysis) {
  const n = analysis.totalSold;
  if (n < 10) return { level: "low", label: "データ不足", note: "売れた記録が少なく、推奨はまだ当てになりません。もうしばらくデータを集めてください。" };
  if (n < 40) return { level: "mid", label: "参考程度", note: "傾向が見え始めています。推奨は参考程度に。" };
  return { level: "high", label: "十分", note: "十分なデータがあります。自動最適化を使えます。" };
}

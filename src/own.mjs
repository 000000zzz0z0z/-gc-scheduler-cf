// 自分の出品の売れ行き追跡。
// ・記録対象は「このツールが出品した商品」と「このツールが更新(一覧の先頭へ)した商品」だけ
// ・最適化の学習単位は「1回の出品・1回の更新」。更新は一覧の先頭に出し直すことなので、出品と同じに扱う
//   その1回の成果 = 次に同じ商品を更新するまで(最長48時間)の間に売れたか
// ・売れた時刻 = 取引情報の「販売日時」(買い手が支払った時刻)
//   売れた直後はチャットに未読があることが多く、開くと既読が付くため、
//   まず「取引中に現れた時刻」を仮の販売時刻として記録し、
//   未読がなくなった後で販売日時を取りに行って正確な時刻に書き換える。
import { fetchPage, fetchChatSoldAt, TARGET_CATEGORY } from "./scrape.mjs";
import { jstParts } from "./gc.mjs";

// 「支払いが済んだ(=売れた)」とみなす状態。支払い待ちは含めない
const SOLD = new Set(["支払完了", "商品お渡し", "受取評価待ち", "完了", "キャンセル申請"]);
const CANCEL = new Set(["キャンセル", "未払キャンセル"]);
// 購入ボタンは押されたが、まだ入金されていない状態
const PENDING = new Set(["支払待ち", "支払い待ち", "支払確認中", "支払い確認中"]);
export const PENDING_MS = 48 * 3600e3; // 出品・更新から最長48時間は「結果待ち」
const KEEP_MS = 120 * 86400e3;
const CHATS_PER_SCAN = 2;

const fmt = (t) => { const p = jstParts(t); return `${p.mo}/${p.d} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`; };

export async function loadOwn(store) {
  const v = await store.get("own");
  return v && v.v === 1 ? v : { v: 1, records: {}, chatQueue: [], since: null, lastScan: 0 };
}
export const saveOwn = (store, own) => store.put("own", own);

// 出品に成功したら呼ぶ
export function addOwnListing(own, listingId, at, label) {
  if (!listingId) return;
  own.records[listingId] = { l: at, s: null, sold: false, x: false, lb: (label || "").slice(0, 30) };
  if (!own.since) own.since = at;
}

// 更新に成功したら呼ぶ。商品を追跡対象に入れ(売れたかを確認するため)、更新1回を学習データに残す
const BOOSTS_MAX = 6000;
export function addOwnBoost(own, productId, at, label) {
  if (!productId) return;
  const r = own.records[productId];
  if (!r) own.records[productId] = { l: at, s: null, sold: false, x: false, lb: (label || "").slice(0, 30), b: 1, t: at };
  else r.t = at;
  (own.boosts ||= []).push([String(productId), at]);
  if (own.boosts.length > BOOSTS_MAX) own.boosts.splice(0, own.boosts.length - BOOSTS_MAX);
  if (!own.since) own.since = at;
}
const lastTouch = (r) => Math.max(r.l || 0, r.t || 0);

export async function scanOwn(store, session, fetcher, log, now = Date.now()) {
  const own = await loadOwn(store);
  const ids = Object.keys(own.records);
  if (!ids.length) { own.lastScan = now; await saveOwn(store, own); log.info("売れ行き", "まだツールが出品・更新した商品がないため、確認を省略しました"); return { skipped: "empty" }; }

  const report = { sold: 0, exact: 0, canceled: 0 };
  const tracking = Object.values(own.records);
  log.info("売れ行き", `自分の売れ行き確認を開始: 追跡中${tracking.length}件(うち売れた記録${tracking.filter((r) => r.sold).length}件・販売日時の補正待ち${own.chatQueue.length}件)`, { tracking: tracking.length, queue: own.chatQueue.length, since: own.since });
  const ignored = { cat: 0, notTool: 0 };
  const summarize = (label, r) => {
    const by = {}; r.items.forEach((x) => (by[x.status || "(なし)"] = (by[x.status || "(なし)"] || 0) + 1));
    log.debug("売れ行き", `${label}: ${r.items.length}件を読み取り(データ${Math.round((r.bytes || 0) / 1024)}KB・読み取り${r.parseMs ?? "?"}ms・全${r.maxPage || 1}ページ)`, { 状態の内訳: by });
  };
  const snap = {}; // 今回見えた全商品: id -> {状態, カテゴリ, タブ}
  const listAll = (label, tabKey, r) => {
    const rows = r.items.map((x) => { snap[x.productId] = { st: x.status, cat: x.category, tab: tabKey, chat: x.chatId }; return `${x.productId}(${x.category === TARGET_CATEGORY ? "X" : x.category}・${x.status || "状態なし"}${x.unread ? "・未読あり" : ""}${own.records[x.productId] ? "・ツールが出品/更新" : ""})`; });
    log.debug("売れ行き", `${label}に並んでいる全商品: ${rows.join(" / ") || "なし"}`);
  };
  const handle = (it) => {
    if (it.category !== TARGET_CATEGORY) { ignored.cat++; return; }
    const r = own.records[it.productId];
    if (!r) { ignored.notTool++; return; } // ツールが出品・更新したもの以外は無視
    log.debug("売れ行き", `ツールが出品・更新した商品を発見: 商品${it.productId}「${r.lb}」状態「${it.status}」(記録: ${r.sold ? (r.x ? "売れた・販売日時確定" : "売れた・仮の時刻") : "未販売"})`, { productId: it.productId, status: it.status, chatId: it.chatId, unread: it.unread });
    if (PENDING.has(it.status) && !r.sold && !r.pw) {
      // 購入ボタンが押された(入金待ち)。この発見時刻を「購入時刻の目安」として残す
      r.pw = now;
      log.info("売れ行き", `購入されました(入金待ち): 商品${it.productId}「${r.lb}」。入金が確認できたら「売れた」として記録します(購入時刻の目安: ${fmt(now)}・正確な時刻は後で販売日時から取得)`, { productId: it.productId, status: it.status });
    }
    if (SOLD.has(it.status) && !r.sold) {
      // 売れた時刻 = 購入ボタンが押された時刻。正確な値(販売日時)は後でチャットの取引情報から取る。
      // それまでの仮の値は、入金待ちを最初に見つけた時刻(なければ今回の発見時刻)
      r.sold = true; r.s = r.pw || now; r.x = false;
      report.sold++;
      log.info("売れ行き", `売れました(入金確認): 商品${it.productId}「${r.lb}」(出品 ${fmt(r.l)})。販売時刻は仮に ${fmt(r.s)}(${r.pw ? "入金待ちを見つけた時刻" : "今回の発見時刻"})で記録し、あとで販売日時(購入ボタンが押された時刻)に補正します`, { productId: it.productId, status: it.status });
    } else if (CANCEL.has(it.status) && (r.sold || r.pw)) {
      const was = r.sold ? "売れた" : "入金待ち";
      r.sold = false; r.s = null; r.x = false; r.pw = null;
      report.canceled++;
      log.warn("売れ行き", `取引が「${it.status}」になったため、「${was}」の記録を取り消しました: 商品${it.productId}`, { productId: it.productId, status: it.status });
    }
    if (r.sold && !r.x && it.chatId) {
      if (it.unread) { r.wait = true; log.debug("売れ行き", `商品${it.productId}: チャットに未読があるため開きません(既読を付けないため)。読んだ後に販売日時を取りに行きます`, { chatId: it.chatId }); }
      else if (!own.chatQueue.some((q) => q[0] === it.productId)) { own.chatQueue.push([it.productId, it.chatId]); r.wait = false; log.debug("売れ行き", `商品${it.productId}: 未読がないので、販売日時の取得待ちに追加しました`, { chatId: it.chatId }); }
    }
  };

  try {
    const tr = await fetchPage(session, "trading", 1, fetcher);
    if (!tr.ok) {
      log.warn("売れ行き", tr.status === "session" ? "ログイン状態が切れているため、売れ行きを確認できませんでした" : `取引中ページを読めませんでした(ステータス${tr.status})`);
      return { skipped: tr.status };
    }
    summarize("取引中 1ページ目", tr);
    listAll("取引中 1ページ目", "取引中", tr);
    tr.items.forEach(handle);
    for (let p = 2; p <= Math.min(tr.maxPage, 3); p++) { const rp = await fetchPage(session, "trading", p, fetcher); summarize(`取引中 ${p}ページ目`, rp); listAll(`取引中 ${p}ページ目`, "取引中", rp); rp.items.forEach(handle); }
    const cp = await fetchPage(session, "completed", 1, fetcher);
    summarize("完了・キャンセル 1ページ目", cp);
    listAll("完了・キャンセル 1ページ目", "完了", cp);
    cp.items.forEach(handle);
    const prev = own.snap || null;
    if (prev) {
      const changes = [];
      for (const [id, v] of Object.entries(snap)) {
        const p0 = prev[id];
        const name = `商品${id}(${v.cat === TARGET_CATEGORY ? "X" : v.cat})`;
        if (!p0) changes.push(`${name}が「${v.tab}」に新しく現れました(状態: ${v.st})`);
        else if (p0.tab !== v.tab) changes.push(`${name}が「${p0.tab}」から「${v.tab}」へ移りました(状態: ${p0.st} → ${v.st})`);
        else if (p0.st !== v.st) changes.push(`${name}の状態が変わりました: ${p0.st} → ${v.st}`);
      }
      for (const [id, p0] of Object.entries(prev)) {
        if (!snap[id] && p0.tab === "取引中") changes.push(`商品${id}(${p0.cat === TARGET_CATEGORY ? "X" : p0.cat})が「取引中」から見えなくなりました(直前の状態: ${p0.st})。完了タブの1ページ目にもありません`);
      }
      if (changes.length) changes.forEach((c) => log.info("売れ行き", `【変化】${c}`));
      else log.debug("売れ行き", "前回の確認から、取引中・完了タブに変化はありませんでした");
    } else log.debug("売れ行き", "初回のため、次回からタブの中身の変化を記録します");
    // 「見えなくなった」の判定は取引中タブの商品だけ(完了タブは1ページ目しか見ないため、押し出された古い商品は対象外)
    own.snap = snap;
    log.debug("売れ行き", `対象外として無視: 他カテゴリ(X以外)${ignored.cat}件・ツールが出品も更新もしていない商品${ignored.notTool}件`, ignored);

    // 未読のない取引だけ、販売日時を取りに行く
    for (let i = 0; i < CHATS_PER_SCAN && own.chatQueue.length; i++) {
      const [pid, chatId] = own.chatQueue.shift();
      const r = own.records[pid];
      if (!r || r.x) continue;
      const soldAt = await fetchChatSoldAt(session, chatId, fetcher).catch(() => null);
      if (soldAt) {
        const diff = Math.round((r.s - soldAt) / 60e3);
        r.s = soldAt; r.x = true; report.exact++;
        log.info("売れ行き", `販売日時で補正しました: 商品${pid} → ${fmt(soldAt)}(発見時刻との差 ${diff}分)`, { productId: pid, chatId });
      } else {
        log.warn("売れ行き", `販売日時を読み取れませんでした(チャット${chatId})。次回また試します`, { productId: pid });
        own.chatQueue.push([pid, chatId]);
      }
    }
  } catch (e) {
    if (e?.constructor?.name !== "PausedError") log.error("売れ行き", "売れ行きの確認中にエラーが起きました", { error: String(e.message || e) });
  }

  for (const [pid, r] of Object.entries(own.records)) if (now - lastTouch(r) > KEEP_MS) delete own.records[pid];
  if (own.boosts) own.boosts = own.boosts.filter(([pid, t]) => now - t <= KEEP_MS && own.records[pid]);
  own.lastScan = now;
  await saveOwn(store, own);
  log.info("売れ行き", `確認完了: 新たに売れた${report.sold}件・販売日時で補正${report.exact}件・キャンセル${report.canceled}件・補正待ち残り${own.chatQueue.length}件`, report);
  return report;
}

// 曜日×時間(168マス)ごとの集計。
// 学習の1件 = 1回の出品(ツールが出品した商品の出品時刻)、または1回の更新。
// その1件の「持ち時間」は、次に同じ商品を更新するまで(最長48時間)。持ち時間の中で売れたら成功。
// 持ち時間が終わっていなくて、まだ売れていないものは「結果待ち」。
export function ownStats(own, now = Date.now()) {
  const cells = Array.from({ length: 168 }, () => ({ n: 0, sold: 0, hours: [] }));
  let pending = 0, eligible = 0, sold48 = 0, soldAll = 0, exact = 0;
  const buy = new Array(168).fill(0);
  for (const r of Object.values(own.records)) {
    if (r.sold) { soldAll++; if (r.x) exact++; if (r.s) { const q = jstParts(r.s); buy[q.wd * 24 + q.h]++; } }
  }
  // 商品ごとに、出品・更新の時刻を古い順に並べる
  const byPid = {};
  for (const [pid, r] of Object.entries(own.records)) if (!r.b) (byPid[pid] ||= []).push(r.l);
  for (const [pid, t] of own.boosts || []) if (own.records[pid]) (byPid[pid] ||= []).push(t);
  let events = 0;
  for (const [pid, times] of Object.entries(byPid)) {
    const r = own.records[pid];
    times.sort((a, b) => a - b);
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const end = Math.min(t + PENDING_MS, i + 1 < times.length ? times[i + 1] : Infinity);
      events++;
      const won = r.sold && r.s && r.s >= t && r.s < end;
      if (!won && now < end) { pending++; continue; }
      const p = jstParts(t), c = cells[p.wd * 24 + p.h];
      c.n++; eligible++;
      if (won) { c.sold++; sold48++; if (r.x) c.hours.push((r.s - t) / 3600e3); }
    }
  }
  const days = own.since ? Math.floor((now - own.since) / 86400e3) : 0;
  return { cells, pending, eligible, sold48, soldAll, exact, buy, days, since: own.since, total: events, products: Object.keys(own.records).length, waiting: own.chatQueue.length };
}

// 自分の出品の売れ行き追跡。
// ・記録対象は「このツールが出品した商品」だけ(過去の偏ったデータは使わない)
// ・売れた時刻 = 取引情報の「販売日時」(買い手が支払った時刻)
//   売れた直後はチャットに未読があることが多く、開くと既読が付くため、
//   まず「取引中に現れた時刻」を仮の販売時刻として記録し、
//   未読がなくなった後で販売日時を取りに行って正確な時刻に書き換える。
import { fetchPage, fetchChatSoldAt, TARGET_CATEGORY } from "./scrape.mjs";
import { jstParts } from "./gc.mjs";

// 「支払いが済んだ(=売れた)」とみなす状態。支払い待ちは含めない
const SOLD = new Set(["支払完了", "商品お渡し", "受取評価待ち", "完了", "キャンセル申請"]);
const CANCEL = new Set(["キャンセル", "未払キャンセル"]);
export const PENDING_MS = 48 * 3600e3; // 出品から48時間は「結果待ち」
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

export async function scanOwn(store, session, fetcher, log, now = Date.now()) {
  const own = await loadOwn(store);
  const ids = Object.keys(own.records);
  if (!ids.length) { own.lastScan = now; await saveOwn(store, own); log.info("売れ行き", "まだツールが出品した商品がないため、確認を省略しました"); return { skipped: "empty" }; }

  const report = { sold: 0, exact: 0, canceled: 0 };
  const tracking = Object.values(own.records);
  log.info("売れ行き", `自分の売れ行き確認を開始: 追跡中${tracking.length}件(うち売れた記録${tracking.filter((r) => r.sold).length}件・販売日時の補正待ち${own.chatQueue.length}件)`, { tracking: tracking.length, queue: own.chatQueue.length, since: own.since });
  const ignored = { cat: 0, notTool: 0 };
  const summarize = (label, r) => {
    const by = {}; r.items.forEach((x) => (by[x.status || "(なし)"] = (by[x.status || "(なし)"] || 0) + 1));
    log.debug("売れ行き", `${label}: ${r.items.length}件を読み取り(データ${Math.round((r.bytes || 0) / 1024)}KB・読み取り${r.parseMs ?? "?"}ms・全${r.maxPage || 1}ページ)`, { 状態の内訳: by });
  };
  const handle = (it) => {
    if (it.category !== TARGET_CATEGORY) { ignored.cat++; return; }
    const r = own.records[it.productId];
    if (!r) { ignored.notTool++; return; } // ツールが出品したもの以外は無視
    log.debug("売れ行き", `ツールの出品を発見: 商品${it.productId}「${r.lb}」状態「${it.status}」(記録: ${r.sold ? (r.x ? "売れた・販売日時確定" : "売れた・仮の時刻") : "未販売"})`, { productId: it.productId, status: it.status, chatId: it.chatId, unread: it.unread });
    if (SOLD.has(it.status) && !r.sold) {
      r.sold = true; r.s = now; r.x = false;
      report.sold++;
      log.info("売れ行き", `売れました: 商品${it.productId}「${r.lb}」(出品 ${fmt(r.l)})。販売時刻はいったん発見時刻 ${fmt(now)} で記録し、あとで販売日時に補正します`, { productId: it.productId, status: it.status });
    } else if (CANCEL.has(it.status) && r.sold) {
      r.sold = false; r.s = null; r.x = false;
      report.canceled++;
      log.warn("売れ行き", `取引がキャンセルされたため「売れた」記録を取り消しました: 商品${it.productId}`, { productId: it.productId, status: it.status });
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
    tr.items.forEach(handle);
    for (let p = 2; p <= Math.min(tr.maxPage, 3); p++) { const rp = await fetchPage(session, "trading", p, fetcher); summarize(`取引中 ${p}ページ目`, rp); rp.items.forEach(handle); }
    const cp = await fetchPage(session, "completed", 1, fetcher);
    summarize("完了・キャンセル 1ページ目", cp);
    cp.items.forEach(handle);
    log.debug("売れ行き", `対象外として無視: 他カテゴリ(にゃんこ大戦争など)${ignored.cat}件・ツール以外の出品${ignored.notTool}件`, ignored);

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

  for (const [pid, r] of Object.entries(own.records)) if (now - r.l > KEEP_MS) delete own.records[pid];
  own.lastScan = now;
  await saveOwn(store, own);
  log.info("売れ行き", `確認完了: 新たに売れた${report.sold}件・販売日時で補正${report.exact}件・キャンセル${report.canceled}件・補正待ち残り${own.chatQueue.length}件`, report);
  return report;
}

// 曜日×時間(168マス)ごとの集計。成果 = 出品から48時間以内に売れたか
export function ownStats(own, now = Date.now()) {
  const cells = Array.from({ length: 168 }, () => ({ n: 0, sold: 0, hours: [] }));
  let pending = 0, eligible = 0, sold48 = 0, soldAll = 0, exact = 0;
  const buy = new Array(168).fill(0);
  for (const r of Object.values(own.records)) {
    if (r.sold) { soldAll++; if (r.x) exact++; if (r.s) { const q = jstParts(r.s); buy[q.wd * 24 + q.h]++; } }
    const within = r.sold && r.s && r.s - r.l <= PENDING_MS;
    if (!within && now - r.l < PENDING_MS) { pending++; continue; }
    const p = jstParts(r.l), c = cells[p.wd * 24 + p.h];
    c.n++; eligible++;
    if (within) { c.sold++; sold48++; if (r.x) c.hours.push((r.s - r.l) / 3600e3); }
  }
  const days = own.since ? Math.floor((now - own.since) / 86400e3) : 0;
  return { cells, pending, eligible, sold48, soldAll, exact, buy, days, since: own.since, total: Object.keys(own.records).length, waiting: own.chatQueue.length };
}

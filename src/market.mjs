// X全体の市場調査。
// 一覧は「更新日の新しい順」で、売れた・終了した商品は最後尾に回される。
// そこで15分おきに先頭4ページを読み、
//   ・前回あった商品が消えていて、それより古い商品はまだ残っている → 一覧から外された
//   ・その商品ページを1回だけ見て「売り切れ」なら売れた(終了・削除は除外)
// として、他人の商品も含めた「売れた時刻」を推定する(誤差は最大15分)。
// あわせて、1時間ごとの新規出品・更新の数(ライバルの数)も数える。
import { fetchMarketPage, fetchProductState } from "./scrape.mjs";
import { jstParts, dayKey } from "./gc.mjs";

export const MARKET_PAGES = 4;
export const PRICE_MAX = 5000; // 集計する価格帯(0〜5,000円)
const VERIFY_PER_POLL = 4;
const MAX_GAP_MS = 40 * 60e3; // 前回の確認からこれ以上あいたら、消えた判定はしない(取りこぼし防止)

const cellOf = (t) => { const p = jstParts(t); return p.wd * 24 + p.h; };
const cellName = (t) => { const p = jstParts(t); return ["日", "月", "火", "水", "木", "金", "土"][p.wd] + "曜" + p.h + "時台"; };
const inRangeF = (x) => x.price <= PRICE_MAX;
const hm = (t) => { const p = jstParts(t); return `${p.mo}/${p.d} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`; };

export async function loadMarket(store) {
  const v = await store.get("market");
  if (v && v.v === 2) return v; // v2 = 引退垢だけの市場データ(v1の全X混在データは使わない)
  return {
    v: 2, prev: [], prevAt: 0, verify: [], seen: {}, events: [],
    sales: new Array(168).fill(0), supply: new Array(168).fill(0), obs: new Array(168).fill(0),
    days: {}, firstAt: 0, polls: 0, lastPoll: 0,
  };
}
export const saveMarket = (store, m) => store.put("market", m);

export async function pollMarket(store, fetcher, log, now = Date.now(), { verifyMax = VERIFY_PER_POLL } = {}) {
  const m = await loadMarket(store);
  const t0 = Date.now();
  let items = [];
  try {
    for (let p = 1; p <= MARKET_PAGES; p++) {
      const r = await fetchMarketPage(p, fetcher);
      if (!r.ok) { log.warn("市場調査", `引退垢一覧${p}ページ目を読めなかったため、今回の判定は見送ります(ステータス${r.status})`); return { skipped: "page" }; }
      const c = { 販売中: 0, 売れた: 0, 終了: 0, 注目アカウント: 0, 対象価格帯: 0 };
      for (const x of r.items) { if (x.featured) c.注目アカウント++; else if (x.state === "sold") c.売れた++; else if (x.state === "ended") c.終了++; else { c.販売中++; if (x.price <= PRICE_MAX) c.対象価格帯++; } }
      const ts = r.items.filter((x) => !x.featured && x.t).map((x) => x.t);
      log.debug("市場調査", `引退垢一覧${p}ページ目: ${r.items.length}件(データ${Math.round((r.bytes || 0) / 1024)}KB・読み取り${r.parseMs}ms)${ts.length ? `・更新日時 ${hm(Math.max(...ts))}〜${hm(Math.min(...ts))}` : ""}`, c);
      items = items.concat(r.items);
    }
  } catch (e) {
    if (e?.constructor?.name !== "PausedError") log.error("市場調査", "引退垢一覧の読み込み中にエラーが起きました", { error: String(e.message || e) });
    return { skipped: "error" };
  }

  // 注目アカウント(広告枠)と、売れた/終了の商品は判定から除く
  const regular = items.filter((x) => !x.featured && x.state === "active" && x.t);
  const inRange = (x) => x.price <= PRICE_MAX;
  const report = { listed: 0, vanished: 0, sold: 0, notSold: 0 };
  const newIds = [], cellAdd = {};
  log.debug("市場調査", `判定の対象: 全${items.length}件のうち、販売中・注目アカウント以外・更新日時あり ${regular.length}件(うち0〜${PRICE_MAX}円 ${regular.filter(inRangeF).length}件)`);

  // ライバルの数: 新しく先頭に来た(新規出品・更新)商品を、更新時刻の1時間ごとに数える
  // 初回や、前回から長く空いた後は、観測前から並んでいた出品が混ざるので数えない(覚えるだけ)
  const fresh = !!(m.prevAt && now - m.prevAt < MAX_GAP_MS);
  if (!fresh) log.info("市場調査", "初回(または前回から時間が空いた)ため、今並んでいる出品はライバルとして数えず、記憶だけします。次回から新しく出てきた出品を数えます");
  for (const x of regular) {
    if (!inRange(x)) continue;
    const key = x.id + "@" + x.t;
    if (m.seen[key]) continue;
    m.seen[key] = now;
    if (fresh && now - x.t < 3 * 3600e3) { m.supply[cellOf(x.t)]++; report.listed++; newIds.push(x.id); const ck = cellName(x.t); cellAdd[ck] = (cellAdd[ck] || 0) + 1; }
  }
  if (newIds.length) log.debug("市場調査", `新しく見つけた出品(ライバル)${newIds.length}件を記録: ${newIds.slice(0, 30).join(", ")}${newIds.length > 30 ? " ほか" : ""}`, { 時間帯別の加算: cellAdd });
  else log.debug("市場調査", "前回から新しく増えた対象価格帯の出品はありませんでした");

  // 観測時間(この時間帯を何分見ていたか)。売れた数を「1時間あたり」に直すのに使う
  if (m.prevAt && now - m.prevAt < MAX_GAP_MS) {
    const add = Math.round((now - m.prevAt) / 60e3);
    m.obs[cellOf(now)] += add;
    log.debug("市場調査", `観測時間を加算: ${cellName(now)} に +${add}分(この時間帯の累計 ${m.obs[cellOf(now)]}分)`);
  } else if (m.prevAt) log.warn("市場調査", `前回の調査から${Math.round((now - m.prevAt) / 60e3)}分空いたため、今回は観測時間に加えず、消えた商品の判定もしません(取りこぼしで誤判定しないため)`);
  else log.info("市場調査", "初回の調査です。消えた商品の判定は次回の調査から始まります");

  // 消えた商品の判定
  if (m.prevAt && now - m.prevAt < MAX_GAP_MS && regular.length) {
    const cur = new Set(items.map((x) => x.id));
    const oldestVisible = Math.min(...regular.map((x) => x.t));
    let still = 0, flowed = 0, out = 0, dup = 0;
    for (const p of m.prev) {
      if (cur.has(p.id)) { still++; continue; }
      if (!(p.t > oldestVisible + 60e3)) { flowed++; continue; } // 流れて後ろへ行っただけのものは除外
      if (p.price > PRICE_MAX) { out++; continue; }
      if (m.verify.some((v) => v.id === p.id) || m.events.some((e) => e.id === p.id)) { dup++; continue; }
      const est = Math.round((m.prevAt + now) / 2);
      m.verify.push({ id: p.id, est, price: p.price, tries: 0 });
      report.vanished++;
      log.info("市場調査", `一覧から外された商品を発見: 商品${p.id}(${p.price.toLocaleString()}円・更新${hm(p.t)})。表示中の最も古い出品(${hm(oldestVisible)})より新しいのに消えたので、売れたか取り下げられた可能性。商品ページで確認します(推定時刻 ${hm(est)})`, { id: p.id, price: p.price });
    }
    log.debug("市場調査", `前回の${m.prev.length}件の行方: まだ表示中${still}件・後ろに流れただけ${flowed}件・一覧から外された${report.vanished}件・価格帯外${out}件・確認済み/確認待ち${dup}件`, { 表示中で最も古い更新: hm(oldestVisible) });
  }
  m.prev = regular.map((x) => ({ id: x.id, t: x.t, price: x.price }));
  m.prevAt = now;

  // 消えた商品の商品ページを確認(1回の確認で最大4件)
  try {
    for (let i = 0; i < verifyMax && m.verify.length; i++) {
      const v = m.verify.shift();
      const st = await fetchProductState(v.id, fetcher);
      if (st === "sold") {
        m.events.push({ id: v.id, at: v.est, price: v.price });
        m.sales[cellOf(v.est)]++;
        report.sold++;
        log.info("市場調査", `引退垢: 商品${v.id}(${v.price.toLocaleString()}円)が売れました(推定 ${hm(v.est)})`, { id: v.id, price: v.price });
      } else if (st === "unknown" && v.tries < 2) {
        v.tries++; m.verify.push(v);
      } else {
        report.notSold++;
        log.info("市場調査", `商品${v.id}は売れたのではなく${st === "active" ? "まだ販売中(一時的に見えなかっただけ)" : "出品終了・削除"}のため除外`, { id: v.id, state: st });
      }
    }
  } catch (e) {
    if (e?.constructor?.name !== "PausedError") log.error("市場調査", "商品ページの確認中にエラーが起きました", { error: String(e.message || e) });
  }

  // 後片付け
  for (const [k, t] of Object.entries(m.seen)) if (now - t > 8 * 3600e3) delete m.seen[k];
  if (m.events.length > 5000) m.events = m.events.slice(-5000);
  if (m.verify.length > 60) m.verify = m.verify.slice(-60);
  m.days[dayKey(now)] = true;
  const dk = Object.keys(m.days).sort(); while (dk.length > 120) delete m.days[dk.shift()];
  if (!m.firstAt) m.firstAt = now;
  m.polls++; m.lastPoll = now;
  await saveMarket(store, m);
  log.info("市場調査", `確認完了: 一覧${items.length}件(対象価格帯の新着${report.listed}件)・消えた商品${report.vanished}件・売れた${report.sold}件・除外${report.notSold}件・処理${Date.now() - t0}ms`);
  return report;
}

// 消えた商品の確認だけを行う(一覧の読み取りとは別の分に、少しずつ)
export async function verifyMarket(store, fetcher, log, max = 2, now = Date.now()) {
  const m = await loadMarket(store);
  if (!m.verify.length) return { checked: 0 };
  let checked = 0, sold = 0;
  try {
    for (let i = 0; i < max && m.verify.length; i++) {
      const v = m.verify.shift();
      const st = await fetchProductState(v.id, fetcher);
      checked++;
      if (st === "sold") {
        m.events.push({ id: v.id, at: v.est, price: v.price });
        m.sales[cellOf(v.est)]++;
        sold++;
        log.info("市場調査", `引退垢: 商品${v.id}(${v.price.toLocaleString()}円)が売れました(推定 ${hm(v.est)})`, { id: v.id, price: v.price });
      } else if (st === "unknown" && v.tries < 2) {
        v.tries++; m.verify.push(v);
      } else {
        log.info("市場調査", `商品${v.id}は売れたのではなく${st === "active" ? "まだ販売中(一時的に見えなかっただけ)" : "出品終了・削除"}のため除外`, { id: v.id, state: st });
      }
    }
  } catch (e) {
    if (e?.constructor?.name !== "PausedError") log.error("市場調査", "商品ページの確認中にエラーが起きました", { error: String(e.message || e) });
  }
  await saveMarket(store, m);
  return { checked, sold, left: m.verify.length };
}

export function marketStats(m, now = Date.now()) {
  const totalSales = m.sales.reduce((a, b) => a + b, 0);
  const totalSupply = m.supply.reduce((a, b) => a + b, 0);
  const obsHours = m.obs.reduce((a, b) => a + b, 0) / 60;
  return {
    sales: m.sales, supply: m.supply, obs: m.obs, totalSales, totalSupply, obsHours,
    days: Object.keys(m.days).length, firstAt: m.firstAt, lastPoll: m.lastPoll, polls: m.polls, verifyLeft: m.verify.length,
    recent: m.events.slice(-30).reverse(),
  };
}

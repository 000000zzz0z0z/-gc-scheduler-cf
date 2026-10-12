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
const hm = (t) => { const p = jstParts(t); return `${p.mo}/${p.d} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`; };

export async function loadMarket(store) {
  const v = await store.get("market");
  if (v && v.v === 1) return v;
  return {
    v: 1, prev: [], prevAt: 0, verify: [], seen: {}, events: [],
    sales: new Array(168).fill(0), supply: new Array(168).fill(0), obs: new Array(168).fill(0),
    days: {}, firstAt: 0, polls: 0, lastPoll: 0,
  };
}
export const saveMarket = (store, m) => store.put("market", m);

export async function pollMarket(store, fetcher, log, now = Date.now()) {
  const m = await loadMarket(store);
  const t0 = Date.now();
  let items = [];
  try {
    for (let p = 1; p <= MARKET_PAGES; p++) {
      const r = await fetchMarketPage(p, fetcher);
      if (!r.ok) { log.warn("市場調査", `X一覧${p}ページ目を読めなかったため、今回の判定は見送ります(ステータス${r.status})`); return { skipped: "page" }; }
      items = items.concat(r.items);
    }
  } catch (e) {
    if (e?.constructor?.name !== "PausedError") log.error("市場調査", "X一覧の読み込み中にエラーが起きました", { error: String(e.message || e) });
    return { skipped: "error" };
  }

  // 注目アカウント(広告枠)と、売れた/終了の商品は判定から除く
  const regular = items.filter((x) => !x.featured && x.state === "active" && x.t);
  const inRange = (x) => x.price <= PRICE_MAX;
  const report = { listed: 0, vanished: 0, sold: 0, notSold: 0 };

  // ライバルの数: 新しく先頭に来た(新規出品・更新)商品を、更新時刻の1時間ごとに数える
  for (const x of regular) {
    if (!inRange(x)) continue;
    const key = x.id + "@" + x.t;
    if (m.seen[key]) continue;
    m.seen[key] = now;
    if (now - x.t < 3 * 3600e3) { m.supply[cellOf(x.t)]++; report.listed++; }
  }

  // 観測時間(この時間帯を何分見ていたか)。売れた数を「1時間あたり」に直すのに使う
  if (m.prevAt && now - m.prevAt < MAX_GAP_MS) m.obs[cellOf(now)] += Math.round((now - m.prevAt) / 60e3);

  // 消えた商品の判定
  if (m.prevAt && now - m.prevAt < MAX_GAP_MS && regular.length) {
    const cur = new Set(items.map((x) => x.id));
    const oldestVisible = Math.min(...regular.map((x) => x.t));
    for (const p of m.prev) {
      if (cur.has(p.id) || !(p.t > oldestVisible + 60e3)) continue; // 流れて後ろへ行っただけのものは除外
      if (p.price > PRICE_MAX) continue;
      if (m.verify.some((v) => v.id === p.id) || m.events.some((e) => e.id === p.id)) continue;
      m.verify.push({ id: p.id, est: Math.round((m.prevAt + now) / 2), price: p.price, tries: 0 });
      report.vanished++;
    }
  }
  m.prev = regular.map((x) => ({ id: x.id, t: x.t, price: x.price }));
  m.prevAt = now;

  // 消えた商品の商品ページを確認(1回の確認で最大4件)
  try {
    for (let i = 0; i < VERIFY_PER_POLL && m.verify.length; i++) {
      const v = m.verify.shift();
      const st = await fetchProductState(v.id, fetcher);
      if (st === "sold") {
        m.events.push({ id: v.id, at: v.est, price: v.price });
        m.sales[cellOf(v.est)]++;
        report.sold++;
        log.info("市場調査", `X全体: 商品${v.id}(${v.price.toLocaleString()}円)が売れました(推定 ${hm(v.est)})`, { id: v.id, price: v.price });
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

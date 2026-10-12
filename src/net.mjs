// ゲームクラブへのすべての通信はここを通す。
// ・同じ処理の中では、通信と通信の間に3〜5秒(ランダム)の間隔を空ける
// ・429(多すぎ)/503/Cloudflareの確認画面が返ったら、すぐに止めて60分休む(連打しない)
// ・1日の通信回数に上限を設ける
// ・すべての通信を動作ログに記録する
const PAUSE_MS = 60 * 60e3;
export const DAILY_CAP = 2500;
const GAP_MIN = 3000, GAP_MAX = 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jstDay = (t) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

export class PausedError extends Error {}

// store: Durable Object, log: createLogger() の戻り値, cat: ログの種類
export function createFetcher(store, log, { gap = true } = {}) {
  let last = 0;
  let checked = false;
  let pauseUntil = 0;
  let counter = null; // { day, n }
  let pending = 0;

  async function init(now) {
    if (checked) return;
    checked = true;
    pauseUntil = (await store.get("net:pauseUntil")) || 0;
    counter = (await store.get("net:count")) || { day: jstDay(now), n: 0 };
    if (counter.day !== jstDay(now)) counter = { day: jstDay(now), n: 0 };
  }

  const fetcher = async (url, init_ = {}, meta = {}) => {
    const now = Date.now();
    await init(now);
    const cat = meta.cat || "通信";
    const path = String(url).replace("https://gameclub.jp", "");
    if (pauseUntil > now) {
      const mins = Math.ceil((pauseUntil - now) / 60e3);
      log.warn(cat, `休止中のため通信しませんでした(あと約${mins}分)`, { path });
      throw new PausedError(`ゲームクラブから「アクセスが多い」と返されたため休止中です(あと約${mins}分)`);
    }
    if (counter.n >= DAILY_CAP) {
      log.warn(cat, `今日の通信上限(${DAILY_CAP}回)に達したため通信しませんでした`, { path });
      throw new PausedError("今日の通信上限に達しました");
    }
    // 間隔を空ける
    if (gap && last) {
      const wait = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN) - (Date.now() - last);
      if (wait > 0) await sleep(wait);
    }
    last = Date.now();
    counter.n++;
    pending++;
    const t0 = Date.now();
    let res;
    try {
      res = await fetch(url, init_);
    } catch (e) {
      log.error(cat, `通信エラー: ${meta.what || path}`, { path, method: init_.method || "GET", error: String(e.message || e), ms: Date.now() - t0 });
      throw e;
    } finally {
      last = Date.now();
    }
    const ms = Date.now() - t0;
    const status = res.status;
    const cfMitigated = res.headers.get("cf-mitigated");
    const d = { path, method: init_.method || "GET", status, ms };
    if (status === 429 || status === 503 || cfMitigated) {
      pauseUntil = Date.now() + PAUSE_MS;
      await store.put("net:pauseUntil", pauseUntil);
      log.error("通信", `ゲームクラブから「アクセスが多い/確認が必要」と返されたため、60分休止します(ステータス${status})`, d);
    } else {
      log.info(cat, meta.what || `${init_.method || "GET"} ${path}`, d);
    }
    return res;
  };
  fetcher.finish = async () => { if (counter) await store.put("net:count", counter); };
  fetcher.count = () => counter?.n || 0;
  return fetcher;
}

export async function netStatus(store, now = Date.now()) {
  const pauseUntil = (await store.get("net:pauseUntil")) || 0;
  let c = (await store.get("net:count")) || { day: jstDay(now), n: 0 };
  if (c.day !== jstDay(now)) c = { day: jstDay(now), n: 0 };
  return { pauseUntil: pauseUntil > now ? pauseUntil : 0, today: c.n, cap: DAILY_CAP };
}

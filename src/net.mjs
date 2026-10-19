// ゲームクラブへのすべての通信はここを通す。
// ・同じ処理の中では、通信と通信の間に3〜5秒(ランダム)の間隔を空ける
// ・429(多すぎ)/503/Cloudflareの確認画面が返ったら、すぐに止めて60分休む(連打しない)
// ・1日の通信回数に上限を設ける
// ・すべての通信を、待機時間・送信内容・応答の詳細まで記録する(PHPSESSIDの値は記録しない)
import { errInfo } from "./log.mjs";

const PAUSE_MS = 60 * 60e3;
export const DAILY_CAP = 2500;
const GAP_MIN = 3000, GAP_MAX = 5000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jstDay = (t) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
async function getMany(store, keys) {
  if (typeof store.getMany === "function") { try { return await store.getMany(keys); } catch {} }
  const o = {}; for (const k of keys) o[k] = await store.get(k); return o;
}
const kb = (n) => (n >= 1024 ? (n / 1024).toFixed(1) + "KB" : n + "B");

export class PausedError extends Error {}

// ゲームクラブへの通信は、保存領域(Durable Object)に中継してもらう。
// 保存領域は場所が固定されている(日本にある見込み)ため、日本以外を止める設定でも通れる。
// テスト用の保存領域(relayFetchを持たない)のときは、そのまま通信する。
export async function relay(store, url, init = {}) {
  if (!store || typeof store.relayFetch !== "function") return fetch(url, init);
  const r = await store.relayFetch(String(url), init);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: r.headers });
}

export function createFetcher(store, log, { gap = true } = {}) {
  let last = 0, checked = false, pauseUntil = 0, counter = null, made = 0;

  async function init(now) {
    if (checked) return;
    checked = true;
    const got = await getMany(store, ["net:pauseUntil", "net:count"]);
    pauseUntil = got["net:pauseUntil"] || 0;
    counter = got["net:count"] || { day: jstDay(now), n: 0 };
    if (counter.day !== jstDay(now)) {
      log.info("通信", `日付が変わったため、通信回数のカウントをリセットしました(前日 ${counter.day}: ${counter.n}回)`);
      counter = { day: jstDay(now), n: 0 };
    }
  }

  const fetcher = async (url, init_ = {}, meta = {}) => {
    const now = Date.now();
    await init(now);
    const cat = meta.cat || "通信";
    const path = String(url).replace("https://gameclub.jp", "");
    const method = init_.method || "GET";
    if (pauseUntil > now) {
      const mins = Math.ceil((pauseUntil - now) / 60e3);
      log.warn(cat, `休止中のため通信しませんでした(あと約${mins}分): ${meta.what || path}`, { path, pauseUntil });
      throw new PausedError(`ゲームクラブから「アクセスが多い」と返されたため休止中です(あと約${mins}分)`);
    }
    if (counter.n >= DAILY_CAP) {
      log.warn(cat, `今日の通信上限(${DAILY_CAP}回)に達したため通信しませんでした: ${meta.what || path}`, { path });
      throw new PausedError("今日の通信上限に達しました");
    }
    // 間隔を空ける
    let waited = 0;
    if (gap && last) {
      const target = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
      const wait = target - (Date.now() - last);
      if (wait > 0) { waited = Math.round(wait); log.debug("通信", `ゲームクラブに負担をかけないよう ${(waited / 1000).toFixed(1)}秒 待機します(次: ${meta.what || path})`, { waitMs: waited }); await sleep(wait); }
    }
    counter.n++; made++;
    const hdrs = init_.headers || {};
    const reqInfo = {
      method, path, waitMs: waited,
      cookie: hdrs.Cookie ? "あり(値は記録しません)" : "なし",
      ua: String(hdrs["User-Agent"] || "").includes("Edg/") ? "ブラウザ同等(Edge)" : String(hdrs["User-Agent"] || "既定"),
      sendHeaders: Object.keys(hdrs).filter((k) => k !== "Cookie").join(", "),
      bodyBytes: init_.body ? (init_.body.byteLength ?? String(init_.body).length) : 0,
      todayCount: counter.n,
      via: "保存領域(場所固定)",
    };
    const t0 = Date.now();
    let res;
    try {
      res = await relay(store, url, init_);
    } catch (e) {
      last = Date.now();
      log.error(cat, `通信エラー(届きませんでした): ${meta.what || path}`, { ...reqInfo, ms: Date.now() - t0, ...errInfo(e) });
      throw e;
    }
    // 中身を読んでデータ量を測り、同じ内容で返し直す
    const text = await res.text();
    last = Date.now();
    const ms = last - t0;
    const h = res.headers;
    const d = {
      ...reqInfo, status: res.status, ms, bytes: kb(text.length),
      type: (h.get("content-type") || "").split(";")[0],
      location: h.get("location") || undefined,
      cfRay: h.get("cf-ray") || undefined,
      cfCache: h.get("cf-cache-status") || undefined,
      cfMitigated: h.get("cf-mitigated") || undefined,
      setCookie: h.get("set-cookie") ? "あり" : undefined,
    };
    Object.keys(d).forEach((k) => d[k] === undefined && delete d[k]);
    if (res.status === 429 || res.status === 503 || d.cfMitigated) {
      pauseUntil = Date.now() + PAUSE_MS;
      await store.put("net:pauseUntil", pauseUntil);
      log.error("通信", `ゲームクラブから「アクセスが多い/確認が必要」と返されたため、60分休止します(応答${res.status}): ${meta.what || path}`, d);
    } else if (res.status >= 400) {
      log.warn(cat, `応答${res.status}(${ms}ms・${kb(text.length)}): ${meta.what || path}`, d);
    } else {
      log.info(cat, `応答${res.status}(${ms}ms・${kb(text.length)}): ${meta.what || `${method} ${path}`}`, d);
    }
    const nullBody = [101, 204, 205, 304].includes(res.status);
    return new Response(nullBody ? null : text, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
  fetcher.finish = async () => { if (counter) await store.put("net:count", counter); };
  fetcher.count = () => counter?.n || 0;
  fetcher.made = () => made;
  return fetcher;
}

export async function netStatus(store, now = Date.now()) {
  const got = await getMany(store, ["net:pauseUntil", "net:count"]);
  const pauseUntil = got["net:pauseUntil"] || 0;
  let c = got["net:count"] || { day: jstDay(now), n: 0 };
  if (c.day !== jstDay(now)) c = { day: jstDay(now), n: 0 };
  return { pauseUntil: pauseUntil > now ? pauseUntil : 0, today: c.n, cap: DAILY_CAP };
}

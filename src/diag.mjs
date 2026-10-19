// 原因究明の実験。
// 「中身がまったく同じ通信」を、①画面の操作 ②自動実行 の2つのきっかけで送り、結果を比べる。
// 通信は今使っている出どころ(中継専用の保存領域など)から出す。出品はしない。休止は延長しない。
import { GC, UA } from "./gc.mjs";

const isCfIp = (ip) => /^2a06:98c[0-7]:/i.test(ip) || /^2a09:bac[0-9a-f]:/i.test(ip) || /^104\.28\./.test(ip); // Cloudflare 自身の送信元アドレス帯
const head = (r, k) => new Headers(r.headers).get(k) || "";
const text = (r) => (r.body ? new TextDecoder().decode(r.body) : "");

async function one(store, url, init) {
  const t0 = Date.now();
  try {
    const r = await store.relayFetch(url, init);
    const t = text(r), ray = head(r, "cf-ray");
    return {
      status: r.status, ms: Date.now() - t0, ray, colo: ray.split("-").pop() || "",
      challenge: !!head(r, "cf-mitigated") || /Just a moment|cf-chl|challenge-platform|Attention Required/i.test(t),
      loggedIn: /ログアウト|logout/i.test(t), _t: t,
    };
  } catch (e) { return { error: String(e.message || e), ms: Date.now() - t0 }; }
}

export async function runDiag(store, session, ctx) {
  const at = Date.now();
  const h = { "User-Agent": UA, "Accept-Language": "ja", Accept: "text/html" };
  // ③ Cloudflareの診断ページ: 相手(Cloudflare上のサイト)から、この通信が「どの国の・どんなアドレス」に見えているか
  const tr = await one(store, "https://www.cloudflare.com/cdn-cgi/trace", { headers: { "User-Agent": UA } });
  const g = (k) => ((tr._t || "").match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1] || "";
  const ip = g("ip");
  const seen = { colo: g("colo"), loc: g("loc"), ipKind: !ip ? "不明" : isCfIp(ip) ? "Cloudflareのアドレス" : ip.includes(":") ? "IPv6(Cloudflare以外)" : "IPv4(Cloudflare以外)", error: tr.error };
  // ① トップページ(ログインなし)
  const top = await one(store, GC + "/", { redirect: "manual", headers: h });
  // ② マイページ(ログインあり)
  const my = session ? await one(store, GC + "/mypage", { redirect: "manual", headers: { ...h, Cookie: `PHPSESSID=${session}` } }) : { skipped: true };
  const strip = (x) => { const { _t, ...o } = x; return o; };
  return { at, ctx, seen, top: strip(top), mypage: strip(my) };
}

export function diagLine(r) {
  const f = (x) => x.skipped ? "未実施" : x.error ? `通信エラー` : `${x.challenge ? "✕確認画面" : x.status === 200 ? "✓" : "?"}${x.status}(${x.colo})`;
  return `[${r.ctx === "auto" ? "自動実行" : "画面の操作"}] 相手から見た国=${r.seen.loc || "?"}・アドレス=${r.seen.ipKind} / トップ=${f(r.top)} / マイページ=${f(r.mypage)}`;
}

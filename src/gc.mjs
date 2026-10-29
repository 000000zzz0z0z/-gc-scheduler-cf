// サイト(ゲームクラブ/M&Aクラブ)との通信と、時刻・スケジュール計算などの「純粋な」処理。
// ストレージには触らないので、単体でテストできます。
// どのサイトに送るかは、通信の窓口(fetcher)が持っているサイト情報(fetcher.site)で決まる。
import { randomUUID } from "node:crypto";
import { DEFAULT_SITE } from "./sites.mjs";

export const GC = DEFAULT_SITE.origin; // 互換のため残す(fetcher にサイト情報がないときの送り先)
const siteOfFetcher = (fetcher) => (fetcher && fetcher.site) || DEFAULT_SITE;
// 運営の了承を得たうえで、通常のブラウザと同じ名乗りを使います
export const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0";

const JST = 9 * 3600e3;
const pad = (n) => String(n).padStart(2, "0");

export function jstParts(ms = Date.now()) {
  const d = new Date(ms + JST);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() };
}
export function dayKey(ms = Date.now()) {
  const p = jstParts(ms);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
}
export function minuteOfDay(ms = Date.now()) {
  const p = jstParts(ms);
  return p.h * 60 + p.mi;
}
export function hm(s) {
  const m = String(s).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}
export function isHM(s) {
  const v = hm(s);
  return Number.isFinite(v) && v >= 0 && v <= 1440;
}

// 1日の出品時刻(0時からの分)を計算
export function computeSlots(schedule, limit) {
  let slots = [];
  if (schedule.mode === "manual") {
    slots = (schedule.manual || []).map(hm).filter((n) => Number.isFinite(n) && n >= 0 && n < 1440);
  } else {
    const n = Math.max(1, Math.min(limit, schedule.count | 0));
    const s = hm(schedule.start);
    const e = hm(schedule.end);
    const span = e - s;
    if (!(span > 0)) return [];
    const step = span / n;
    for (let i = 0; i < n; i++) slots.push(Math.round(s + i * step));
    slots = slots.filter((x) => x < 1440);
  }
  return [...new Set(slots)].sort((a, b) => a - b).slice(0, limit);
}

// DevTools の Payload →「View source」で表示される生データを読み取る
export function parseMultipart(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  const first = text.split("\n").find((l) => l.startsWith("--"));
  if (!first) throw new Error("区切り線(------WebKitFormBoundary…で始まる行)が見つかりません。Payloadの「View source」の内容を丸ごと貼り付けてください。");
  const boundary = first.trim().replace(/--$/, "");
  const parts = text.split(boundary).slice(1);
  const fields = [];
  for (let part of parts) {
    if (part.startsWith("--")) break;
    part = part.replace(/^\n/, "");
    const idx = part.indexOf("\n\n");
    if (idx < 0) continue;
    const head = part.slice(0, idx);
    const body = part.slice(idx + 2).replace(/\n$/, "");
    const name = (head.match(/name="([^"]*)"/) || [])[1];
    if (name == null) continue;
    const fn = head.match(/filename="([^"]*)"/);
    if (fn) {
      const ct = (head.match(/Content-Type:\s*(.+)/i) || [])[1];
      fields.push({ name, value: "", file: true, filename: fn[1], ctype: (ct || "application/octet-stream").trim() });
    } else {
      fields.push({ name, value: body });
    }
  }
  if (!fields.length) throw new Error("項目を1つも読み取れませんでした。貼り付けた内容を確認してください。");
  if (!fields.some((f) => f.name === "name")) throw new Error("商品名(name)の項目が見つかりません。出品(add?draft=…)の通信のPayloadか確認してください。");
  const priceField = fields.find((f) => f.name === "price");
  if (!priceField || !String(priceField.value).trim()) throw new Error("価格(price)が見つかりません。データが途中で切れている可能性があります。View sourceの一番下にある「Show more」を押して全文を表示してからコピーしてください(最後が ------WebKitFormBoundary…-- で終わる行ならOK)。");
  if (!/--\s*$/.test(text.trim())) throw new Error("データが途中で切れているようです。View sourceの「Show more」を押して全文を表示してからコピーしてください(最後が ------WebKitFormBoundary…-- で終わる行ならOK)。");
  return fields;
}

export function buildMultipart(fields, prefix = DEFAULT_SITE.boundary) {
  const b = prefix + randomUUID().replace(/-/g, "");
  let out = "";
  for (const f of fields) {
    out += `--${b}\r\n`;
    if (f.file) {
      out += `Content-Disposition: form-data; name="${f.name}"; filename="${f.filename || ""}"\r\nContent-Type: ${f.ctype || "application/octet-stream"}\r\n\r\n\r\n`;
    } else {
      out += `Content-Disposition: form-data; name="${f.name}"\r\n\r\n${String(f.value ?? "").replace(/\r?\n/g, "\r\n")}\r\n`;
    }
  }
  out += `--${b}--\r\n`;
  return { body: new TextEncoder().encode(out), contentType: `multipart/form-data; boundary=${b}` };
}

// 出品期限(limit_day / limit_time)を常に遠い未来(約100年後)に設定する。
// サイトのフォームは日時が必須のため「無期限」そのものにはできないが、
// 100年後にすることで、期限切れで出品が消えることは実質なくなる。
export function prepareFields(fields, now) {
  const p = jstParts(now + 100 * 365 * 24 * 3600e3);
  return fields.map((f) => {
    if (f.name === "limit_day") return { ...f, value: `${p.y}-${pad(p.mo)}-${pad(p.d)}` };
    if (f.name === "limit_time") return { ...f, value: String(p.h) };
    return f;
  });
}

export function cleanSession(s) {
  return String(s || "").trim().replace(/^PHPSESSID=/i, "").replace(/;.*$/, "").trim();
}

// session は、文字列(PHPSESSIDだけ)でも、オブジェクト {phpsessid, cf, ua, chua} でもよい。
// cf = Cloudflareの通行証(cf_clearance)、ua = ブラウザの名乗り、chua = sec-ch-ua 系のヘッダー。
// 通行証はブラウザの指紋と結びついているので、cf を使うときは ua も同じブラウザのものにそろえる。
export function asCreds(session) {
  if (session && typeof session === "object") {
    return { phpsessid: cleanSession(session.phpsessid), cf: cleanCf(session.cf), ua: (session.ua || "").trim(), chua: session.chua && typeof session.chua === "object" ? session.chua : null, extra: session.extra && typeof session.extra === "object" ? session.extra : null };
  }
  return { phpsessid: cleanSession(session), cf: "", ua: "", chua: null, extra: null };
}

// 出品時に追加するヘッダーのうち、ツールが自分で正しく決めるもの・付けると害になるものは
// ユーザーが貼っても無視する。
//  - cookie / content-length / host 系: ツールや通信層が正しい値を付ける。古い値を混ぜると壊れる
//  - sec-fetch-*: 「ページの中から送った」ことを主張するヘッダー。サーバーから手で付けるのは偽装に近いので付けない
//    (本当にブラウザのページから送る方式に進んだときだけ、本物として付く)
const BLOCKED_EXTRA = /^(cookie|content-length|content-type|host|connection|:|accept-encoding$|sec-fetch-|user-agent$|accept-language$|origin$|referer$|x-requested-with$|accept$)/i;
// ヘッダーの貼り付けテキスト(「名前: 値」を1行ずつ)を、送ってよいものだけの表にする
export function parseHeaderLines(raw) {
  const out = {};
  for (const line of String(raw || "").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z][A-Za-z0-9-]*)\s*[:：]\s*(.+?)\s*$/);
    if (!m) continue;
    const name = m[1].toLowerCase();
    if (BLOCKED_EXTRA.test(name)) continue;
    out[name] = m[2];
  }
  return Object.keys(out).length ? out : null;
}
// cf_clearance の値だけを取り出す(「cf_clearance=…」ごと貼られても、ほかのCookieが混ざっていても拾う)
export function cleanCf(s) {
  const t = String(s || "").trim();
  const m = t.match(/cf_clearance=([^;\s]+)/);
  return (m ? m[1] : t.replace(/;.*$/, "")).trim();
}

// fetcher: net.mjs の通信制御(省略時は素のfetch)。meta: ログ用の情報
export async function gcFetch(path, session, opts = {}, fetcher = null, meta = {}) {
  const f = fetcher || ((u, i) => fetch(u, i));
  const { headers, ...rest } = opts;
  const c = asCreds(session);
  const cookie = [c.phpsessid ? `PHPSESSID=${c.phpsessid}` : "", c.cf ? `cf_clearance=${c.cf}` : ""].filter(Boolean).join("; ");
  // sec-ch-ua 系・追加ヘッダーは、cf(通行証)と ua の両方があるときだけ付ける(通行証なしで付けるとかえって不自然)
  const dress = c.cf && c.ua;
  const ch = dress && c.chua ? c.chua : null;
  const extra = dress && c.extra ? c.extra : null;
  return f(siteOfFetcher(fetcher).origin + path, {
    ...rest,
    redirect: "manual",
    headers: { "User-Agent": c.ua || UA, "Accept-Language": "ja", ...(cookie ? { Cookie: cookie } : {}), ...(ch || {}), ...(extra || {}), ...(headers || {}) },
  }, meta);
}

async function readRes(res) {
  const text = await res.text().catch(() => "");
  const location = res.headers.get("location") || "";
  const cf =
    !!res.headers.get("cf-mitigated") || /Just a moment|cf-chl|challenge-platform|Attention Required/i.test(text);
  let kind = "ok";
  if (cf && [403, 429, 503].includes(res.status)) kind = "blocked";
  else if (res.status >= 300 && res.status < 400) kind = /login/i.test(location) ? "session" : "redirect";
  return { kind, status: res.status, text, location };
}

const plain = (html) =>
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function summarizeErrors(j) {
  const flat = (v) => (v == null ? [] : typeof v === "object" ? Object.values(v).flatMap(flat) : [String(v)]);
  const parts = [];
  if (j.errors) parts.push(...flat(j.errors));
  for (const k of ["message", "error", "msg", "alert"]) if (j[k]) parts.push(...flat(j[k]));
  const msg = parts.map((x) => x.trim()).filter(Boolean).join(" / ");
  return msg || "応答: " + JSON.stringify(j).slice(0, 300);
}

export async function publishDraft(draft, session, { now = Date.now(), fetcher = null } = {}) {
  const site = siteOfFetcher(fetcher);
  const fields = prepareFields(draft.fields, now);
  const { body, contentType } = buildMultipart(fields, site.boundary);
  // M&Aクラブはブラウザでも add?draft=番号&subcategory_item_id=カテゴリ番号 の形で送っているので、それに合わせる
  const sub = site.subcatInPath ? String((draft.fields.find((f) => f.name === "subcategory_item_id") || {}).value || "").trim() : "";
  const path = `/mypage/products/add?draft=${encodeURIComponent(draft.draftId)}${sub ? `&subcategory_item_id=${encodeURIComponent(sub)}` : ""}`;
  let res;
  try {
    res = await gcFetch(path, session, {
      method: "POST",
      body,
      headers: {
        "Content-Type": contentType,
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Origin: site.origin,
        Referer: site.origin + path,
      },
    }, fetcher, { cat: "出品", what: `出品を送信(下書き #${draft.draftId})` });
  } catch (e) {
    // 休止中・上限で送らなかった場合は "paused"(出品は作られていない)
    if (e && e.constructor && e.constructor.name === "PausedError") return { ok: false, kind: "paused", message: e.message };
    return { ok: false, kind: "network", message: `通信できませんでした(${e.message})` };
  }
  const r0 = await readRes(res);
  const colo = (res.headers.get("cf-ray") || "").split("-").pop() || "";
  const r = { ...r0, colo };
  if (r.kind === "blocked") return { ok: false, kind: "blocked", status: r.status, colo, message: `Cloudflareにアクセスを拒否されました(確認画面・通信の出どころ ${colo || "不明"})。` };
  if (r.kind === "session") return { ok: false, kind: "session", status: r.status, colo, message: "ログイン状態が切れています。設定からPHPSESSIDを貼り直してください。" };
  let json = null;
  try { json = JSON.parse(r.text); } catch {}
  if (res.status === 200 && json && typeof json.location === "string" && /complete=1/.test(json.location)) {
    const m = json.location.match(/\/([A-Za-z0-9_-]+)\/(\d+)\?complete/);
    return { ok: true, status: 200, colo, listingId: m ? m[2] : null, url: json.location.replace(/\?complete=1.*$/, "") };
  }
  if (json && typeof json.location === "string" && /login/i.test(json.location)) {
    return { ok: false, kind: "session", status: r.status, message: "ログイン状態が切れています。設定からPHPSESSIDを貼り直してください。" };
  }
  const detail = json ? summarizeErrors(json) : plain(r.text).slice(0, 300);
  const message = `${detail || "空の応答"}(ステータス${r.status})`;
  return { ok: false, kind: res.status === 422 ? "invalid" : "unknown", status: r.status, message };
}

// 出品せずに、ログイン状態とアクセス可否だけを確かめる
export async function testConnection(session, { fetcher = null } = {}) {
  let res;
  try {
    res = await gcFetch("/mypage", session, { headers: { Accept: "text/html" } }, fetcher, { cat: "システム", what: "接続テスト(マイページを確認)" });
  } catch (e) {
    return { ok: false, kind: "network", message: `通信できませんでした(${e.message})` };
  }
  const r = await readRes(res);
  const title = (r.text.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || "";
  const colo = (res.headers.get("cf-ray") || "").split("-").pop() || "不明";
  const out = (o) => ({ ...o, colo, message: `${o.message}(通信の出どころ: ${colo})` });
  if (r.kind === "blocked") return out({ ok: false, kind: "blocked", status: r.status, message: "Cloudflareにアクセスを拒否されました(確認画面で止められました)。" });
  if (r.kind === "session") return out({ ok: false, kind: "session", status: r.status, message: "ログインしていない状態として扱われました。PHPSESSIDを確認してください。" });
  if (r.kind === "redirect") return out({ ok: false, kind: "unknown", status: r.status, message: `別のページへ転送されました: ${r.location}` });
  if (res.status !== 200) return out({ ok: false, kind: "unknown", status: r.status, message: `想定外の応答です(ステータス${r.status})` });
  const loggedIn = /ログアウト|logout/i.test(r.text);
  return loggedIn
    ? out({ ok: true, status: 200, message: `接続できました。ログイン状態も有効です(ページ名: ${title || "不明"})` })
    : out({ ok: false, kind: "session", status: 200, message: `ページは開けましたが、ログイン状態を確認できませんでした(ページ名: ${title || "不明"})` });
}

// ===== 下書きの編集(画面で直接入力された項目のチェック) =====
// 画面から届いた項目の一覧を、保存してよい形に整える。おかしければ分かりやすい言葉でエラーにする。
// ・文字の項目は {name, value}。ファイルの項目(動画など)は中身を持たないので、元の下書きのものを使う
// ・商品名と価格は必須。価格は半角数字だけ
export const EDITABLE_LIMITS = { name: 200, detail: 20000, other: 20000 };
export function normalizeFields(input, original = []) {
  if (!Array.isArray(input) || !input.length) throw new Error("項目が空です。");
  const files = original.filter((f) => f.file);
  const out = [];
  for (const raw of input) {
    if (!raw || typeof raw.name !== "string" || !raw.name.trim()) throw new Error("名前のない項目があります。");
    const name = raw.name.trim();
    if (!/^[A-Za-z0-9_\[\]\-.]{1,80}$/.test(name)) throw new Error(`項目名「${name}」に使えない文字が入っています。`);
    if (raw.file) {
      const src = files.find((f) => f.name === name);
      out.push(src ? { ...src } : { name, value: "", file: true, filename: "", ctype: "application/octet-stream" });
      continue;
    }
    const value = String(raw.value ?? "").replace(/\r\n?/g, "\n");
    const max = EDITABLE_LIMITS[name] || EDITABLE_LIMITS.other;
    if (value.length > max) throw new Error(`「${name}」が長すぎます(${value.length}文字・上限${max}文字)。`);
    out.push({ name, value });
  }
  const title = out.find((f) => f.name === "name");
  if (!title || !title.value.trim()) throw new Error("商品名を入力してください。");
  const price = out.find((f) => f.name === "price");
  if (!price) throw new Error("価格の項目がありません。");
  price.value = price.value.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[,，円]/g, "");
  if (!/^\d{1,9}$/.test(price.value)) throw new Error("価格は数字だけで入力してください(例: 3333)。");
  return out;
}

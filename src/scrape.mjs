// サイト(ゲームクラブ/M&Aクラブ)のページを読み取る部分。両サイトは同じ作りなので、読み方も共通。
// ・自分のマイページ(出品中/取引中/完了)
// ・取引チャットの「取引情報」(販売日時)
// 他の人の出品(公開一覧・商品ページ)は読みません。
import { gcFetch } from "./gc.mjs";

export const TARGET_CATEGORY = "twitter";

// "2026/10/11 16:58" → epoch(ms)。どちらのサイトも表示は日本時間。
export function parseJst(str) {
  if (!str) return null;
  const m = String(str).trim().match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]);
}

// HTMLの文字参照(&amp; など)を元の文字に戻す
export function decodeEntities(s) {
  return String(s || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, "\u00a0").replace(/&yen;/g, "¥")
    .replace(/&amp;/g, "&");
}
// タグを取り除いて文字だけにする(<br> は改行に)
const textOf = (h) => decodeEntities(String(h || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));

// 商品サムネイルのURLを取り出す。
// 一覧のHTMLは遅延読み込みのため、src には読み込み中の仮画像(preloader など)が入り、
// 本物のURLは data-src などに入っていることがある。本物らしいものを優先して選ぶ。
const THUMB_ATTRS = ["data-src", "data-original", "data-lazy-src", "data-lazy", "srcset", "src"];
export function thumbTagOf(rowHtml) {
  return (String(rowHtml || "").match(/<img\b[^>]*class="(?:[^"]*\s)?item-thumb(?:\s[^"]*)?"[^>]*>/) || [])[0] || "";
}
export function pickThumb(rowHtml) {
  const tag = thumbTagOf(rowHtml);
  for (const a of THUMB_ATTRS) {
    let v = (tag.match(new RegExp(`\\s${a}="([^"]+)"`)) || [])[1];
    if (!v) continue;
    v = decodeEntities(v).trim().split(/\s+/)[0]; // srcset は最初のURLだけ
    if (/preloader|placeholder|loading|spacer|blank\.|^data:/i.test(v)) continue;
    if (v.startsWith("//")) v = "https:" + v;
    if (/^https?:\/\//i.test(v)) return v;
  }
  return "";
}

// ===== マイページの一覧 =====
export function parseListHtml(htmlText) {
  // 商品1件は <div class="item-row "> で始まる(item-row-top などと区別するため末尾の空白で判定)
  const parts = htmlText.split(/<div class="item-row\s+">/);
  const items = [];
  for (let i = 1; i < parts.length; i++) {
    const r = parts[i];
    const idm = r.match(/href="\/([a-z0-9_-]+)\/(\d+)"/);
    if (!idm) continue;
    const status = (r.match(/<span class="item-status dealing">([^<]*)<\/span>/) || [])[1] || "";
    items.push({
      productId: idm[2],
      category: idm[1],
      status,
      listedAt: parseJst((r.match(/fa-history"><\/i>\s*([0-9/: ]+?)\s*<\/span>/) || [])[1]),
      // 閲覧数: ゲームクラブは目のアイコンの横の数字、M&Aクラブは「○人が検討中」
      views: Number((r.match(/fa-eye"><\/i>\s*(\d+)/) || r.match(/(\d+)\s*人が検討中/) || [])[1] || 0),
      chatId: (r.match(/\/mypage\/chat\/(\d+)/) || [])[1] || null,
      price: Number(((r.match(/class="price">&yen;([\d,]+)/) || [])[1] || "").replace(/,/g, "")) || 0,
      unread: /class="btn[^"]*\bunread\b/.test(r),
      // 更新する種類の見分けに使う(タイトル・説明・サムネイル)
      title: textOf((r.match(/<h3>[\s\S]*?<a [^>]*>([\s\S]*?)<\/a>/) || [])[1]).trim(),
      desc: textOf((r.match(/<div class="detail">([\s\S]*?)<\/div>/) || [])[1]),
      thumb: pickThumb(r),
    });
  }
  return items;
}

// ページ番号の最大値。リンクは "?page=32" と "&amp;page=21" の両方の書き方がある
export function parseMaxPage(htmlText) {
  const nums = [...htmlText.matchAll(/(?:\?|&|&amp;)page=(\d+)/g)].map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 1;
}

export async function fetchPage(session, status, page = 1, fetcher = null) {
  const base = status === "onsale" ? "/mypage/products" : `/mypage/products?status=${status}`;
  const url = page > 1 ? `${base}${base.includes("?") ? "&" : "?"}page=${page}` : base;
  const label = { onsale: "出品中", trading: "取引中", completed: "完了・キャンセル", closed: "出品終了" }[status] || status;
  const res = await gcFetch(url, session, { headers: { Accept: "text/html" } }, fetcher, { cat: "売れ行き", what: `マイページ「${label}」${page}ページ目を確認` });
  if (res.status !== 200) return { ok: false, status: res.status, items: [], maxPage: 0 };
  const h = await res.text();
  if (!/rows-list|item-row/.test(h)) return { ok: false, status: "session", items: [], maxPage: 0, bytes: h.length };
  const t0 = Date.now();
  const items = parseListHtml(h), maxPage = parseMaxPage(h);
  return { ok: true, items, maxPage, bytes: h.length, parseMs: Date.now() - t0 };
}

// 取引チャットのページから、取引情報タブの「販売日時」だけを取る(チャット本文は読まない)
export function parseSoldAtFromChat(htmlText) {
  const block = htmlText.split("trade-info-block")[1] || "";
  const m = block.match(/販売日時[\s\S]{0,200}?(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/);
  return m ? parseJst(m[1]) : null;
}
export async function fetchChatSoldAt(session, chatId, fetcher = null) {
  const res = await gcFetch(`/mypage/chat/${chatId}`, session, { headers: { Accept: "text/html" } }, fetcher, { cat: "売れ行き", what: `取引情報の販売日時を確認(チャット${chatId}・未読なし)` });
  if (res.status !== 200) return null;
  return parseSoldAtFromChat(await res.text());
}

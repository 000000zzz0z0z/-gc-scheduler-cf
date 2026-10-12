// ゲームクラブのページを読み取る部分。
// ・自分のマイページ(出品中/取引中/完了)
// ・取引チャットの「取引情報」(販売日時)
// ・X(Twitter)カテゴリの公開一覧と商品ページ(市場調査)
import { gcFetch } from "./gc.mjs";

export const TARGET_CATEGORY = "twitter";

// "2026/10/11 16:58" → epoch(ms)。ゲームクラブの表示は日本時間。
export function parseJst(str) {
  if (!str) return null;
  const m = String(str).trim().match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]);
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
      views: Number((r.match(/fa-eye"><\/i>\s*(\d+)/) || [])[1] || 0),
      chatId: (r.match(/\/mypage\/chat\/(\d+)/) || [])[1] || null,
      price: Number(((r.match(/class="price">&yen;([\d,]+)/) || [])[1] || "").replace(/,/g, "")) || 0,
      unread: /class="btn[^"]*\bunread\b/.test(r),
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
  if (!/rows-list|item-row/.test(h)) return { ok: false, status: "session", items: [], maxPage: 0 };
  return { ok: true, items: parseListHtml(h), maxPage: parseMaxPage(h) };
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

// ===== 市場調査: X(Twitter)カテゴリの公開一覧 =====
// 1件: { id, t(更新日時), price, state: "active"|"sold"|"ended", featured(注目アカウント/PR) }
export function parseMarketHtml(htmlText) {
  const parts = htmlText.split(/<div class="item-row\s+">/);
  const items = [];
  for (let i = 1; i < parts.length; i++) {
    const r = parts[i];
    const idm = r.match(/href="\/twitter\/(\d+)"/);
    if (!idm) continue;
    const st = (r.match(/class="product-statuses ([^"]*)"/) || [])[1] || "";
    const tags = [...r.matchAll(/<span class="item-status ([^"]*)">([^<]*)<\/span>/g)].map((m) => m[2]);
    items.push({
      id: idm[1],
      t: parseJst((r.match(/fa-history"><\/i>\s*([0-9/: ]+?)\s*<\/span>/) || [])[1]),
      price: Number(((r.match(/class="price">&yen;([\d,]+)/) || [])[1] || "").replace(/,/g, "")) || 0,
      state: /\bsold\b/.test(st) ? "sold" : /end-sales/.test(st) ? "ended" : "active",
      featured: tags.includes("注目アカウント") || tags.includes("PR"),
    });
  }
  return items;
}
export async function fetchMarketPage(page, fetcher) {
  const url = page > 1 ? `/twitter?page=${page}` : "/twitter";
  const res = await gcFetch(url, null, { headers: { Accept: "text/html" } }, fetcher, { cat: "市場調査", what: `X一覧 ${page}ページ目を確認` });
  if (res.status !== 200) return { ok: false, status: res.status, items: [] };
  const h = await res.text();
  return { ok: true, items: parseMarketHtml(h) };
}
// 商品ページで「売り切れ」ボタンが出ているか(説明文中の言葉とは区別する)
export function parseProductState(htmlText) {
  if (/btn-buy[^"]*btn-disabled[^>]*>\s*売り切れ/.test(htmlText)) return "sold";
  if (/btn-buy/.test(htmlText) && !/btn-disabled/.test((htmlText.match(/class="btn-buy[^"]*"/) || [""])[0])) return "active";
  return "other";
}
export async function fetchProductState(id, fetcher) {
  const res = await gcFetch(`/twitter/${id}`, null, { headers: { Accept: "text/html" } }, fetcher, { cat: "市場調査", what: `一覧から消えた商品${id}が売れたか確認` });
  if (res.status === 404) return "gone";
  if (res.status !== 200) return "unknown";
  return parseProductState(await res.text());
}

// ゲームクラブのマイページ(出品一覧・チャット)を読み取る部分。
// 対象カテゴリ以外(例: にゃんこ大戦争)は呼び出し側で除外する。
import { GC, UA } from "./gc.mjs";

// 分析対象のカテゴリ。URLの /カテゴリ名/番号 のカテゴリ名で判定する。
export const TARGET_CATEGORY = "twitter";

function gcFetch(path, session) {
  return fetch(GC + path, {
    redirect: "manual",
    headers: { "User-Agent": UA, "Accept-Language": "ja", Accept: "text/html", Cookie: `PHPSESSID=${session}` },
  });
}

// 一覧ページのHTMLから1件ずつ情報を取り出す
export function parseListHtml(htmlText) {
  // 商品1件は <div class="item-row "> で始まる(item-row-top など子要素と区別するため末尾の空白+引用符で判定)
  const parts = htmlText.split(/<div class="item-row\s*">/);
  const items = [];
  for (let i = 1; i < parts.length; i++) {
    const r = parts[i];
    const idm = r.match(/href="\/([a-z0-9_-]+)\/(\d+)"/);  // 最初の商品リンク
    if (!idm) continue;
    const category = idm[1];
    const productId = idm[2];
    const status = (r.match(/<span class="item-status dealing">([^<]*)<\/span>/) || [])[1] || "";
    const listedAt = parseJst((r.match(/fa-history"><\/i>\s*([0-9/: ]+?)\s*<\/span>/) || [])[1]);
    const views = Number((r.match(/fa-eye"><\/i>\s*(\d+)/) || [])[1] || 0);
    const chatId = (r.match(/\/mypage\/chat\/(\d+)/) || [])[1] || null;
    const priceStr = (r.match(/class="price">&yen;([\d,]+)/) || [])[1] || "";
    const price = Number(priceStr.replace(/,/g, "")) || 0;
    const unread = /class="btn[^"]*unread/.test(r);
    items.push({ productId, category, status, listedAt, views, chatId, price, unread });
  }
  return items;
}

// ページ番号の最大値(ページ送り)
export function parseMaxPage(htmlText) {
  const nums = [...htmlText.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 1;
}

// "2026/10/11 16:58" → epoch(ms)。ゲームクラブの表示は日本時間。
function parseJst(str) {
  if (!str) return null;
  const m = str.trim().match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]);
}

// チャットページのHTMLから、取引情報タブの「販売日時」を取る(チャット本文は読まない)
export function parseSoldAtFromChat(htmlText) {
  const block = htmlText.split('trade-info-block')[1] || "";
  const m = block.match(/販売日時[\s\S]{0,200}?(\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2})/);
  return m ? parseJst(m[1]) : null;
}

// 1ステータスの全ページを読む。maxPages で読み過ぎを防ぐ。
export async function fetchList(session, status, { maxPages = 40 } = {}) {
  const base = status === "onsale" ? "/mypage/products" : `/mypage/products?status=${status}`;
  const sep = base.includes("?") ? "&" : "?";
  const first = await gcFetch(base, session);
  if (first.status !== 200) return { ok: false, status: first.status, items: [] };
  const firstHtml = await first.text();
  if (/login/i.test(first.headers.get("location") || "") || !/item-row|rows-list/.test(firstHtml))
    return { ok: false, status: "session", items: [] };
  const pages = Math.min(maxPages, parseMaxPage(firstHtml));
  let items = parseListHtml(firstHtml);
  for (let p = 2; p <= pages; p++) {
    const res = await gcFetch(`${base}${sep}page=${p}`, session);
    if (res.status !== 200) break;
    items = items.concat(parseListHtml(await res.text()));
  }
  return { ok: true, items, pages };
}

export async function fetchChatSoldAt(session, chatId) {
  const res = await gcFetch(`/mypage/chat/${chatId}`, session);
  if (res.status !== 200) return null;
  return parseSoldAtFromChat(await res.text());
}

export const onlyTarget = (items) => items.filter((it) => it.category === TARGET_CATEGORY);

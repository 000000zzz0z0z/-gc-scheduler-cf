// 「更新」(出品中の商品を一覧の先頭へ上げる)の自動実行。
// ブラウザで「更新」を押すと GET /mypage/products/boost-product/{商品番号} が送られ、302 で戻り、
// 画面に「更新しました」と出る(本人の画面で確認・ツールからの更新も2026-10-31に成功を確認済み)。
//
// 選び方:
// ・登録した「種類」(タイトル+説明で見分ける)を、登録順に A→B→C→A… と1回ずつ回す
// ・その種類に一致する出品のうち、一覧でいちばん下にあるものを上げる
// ・一致する出品が0件の種類は飛ばして次へ
// ・見分けるときは空白(スペース・全角スペース・改行・タブ)だけを無視し、それ以外の文字は完全一致
//
// 守ること:
// ・出品と更新は合わせて1日の上限まで(ゲームクラブは15回)。今日の回数を数えて止める
// ・出品と同じ「前回から○分あける」ロックを使う
// ・ログイン情報は PHPSESSID だけを送る(通行証や追加ヘッダーは使わない)
// ・確認画面(blocked)・ログイン切れ(session)のときは警告を出して自動更新を止める(繰り返さない)
import { gcFetch, readRes, dayKey } from "./gc.mjs";
import { parseListHtml, parseMaxPage } from "./scrape.mjs";

export const BOOST_PATH = (id) => `/mypage/products/boost-product/${encodeURIComponent(id)}`;
const LIST_PATH = "/mypage/products";
const FLASH_OK = /更新しました/;
export const MAX_PAGES = 5; // 出品中の一覧は最大5ページ(50件)まで見る
export const RESERVE_TTL = 10 * 60e3; // 画面からの「今すぐ1回更新」の予約の期限
const HISTORY_MAX = 60;
// これらの結果のときは、その予定枠は再挑戦しない
const GIVE_UP = ["limit", "notypes", "nomatch", "nosession", "blocked", "session", "empty", "notfound"];
const STOP = ["blocked", "session"];

// ===== 見分け方 =====
// 空白だけを取り除く(\s はスペース・全角スペース・改行・タブ・ノーブレークスペースを含む)
export const normText = (s) => String(s || "").replace(/\s+/g, "");
// タイトルと説明から「種類の指紋」を作る。同じ文字なら必ず同じ指紋になる
export async function fingerprint(title, desc) {
  const data = new TextEncoder().encode(normText(title) + "\u0000" + normText(desc));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const isDealing = (x) => /取引/.test(x.status || "");

// ===== 種類の選択(通信しない・単体でテストできる) =====
// types: 登録順の種類の一覧 [{id, key, label}]、items: 一覧の商品(上から順・key付き)、cursor: 次に見る種類の番号
export function chooseTarget(types, items, cursor = 0) {
  const counts = {};
  for (const t of types) counts[t.id] = items.filter((x) => !isDealing(x) && x.key === t.key).length;
  if (!types.length) return { ok: false, kind: "notypes", message: "更新する種類がまだ登録されていません。「種類」タブで登録してください。", counts };
  const n = types.length;
  const start = ((cursor % n) + n) % n;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    const t = types[i];
    const hits = items.filter((x) => !isDealing(x) && x.key === t.key);
    if (!hits.length) continue;
    const item = hits.reduce((a, b) => (b.position > a.position ? b : a)); // いちばん下
    return { ok: true, type: t, typeIndex: i, item, skipped: k, nextCursor: (i + 1) % n, counts };
  }
  return { ok: false, kind: "nomatch", message: "登録した種類のどれにも一致する出品がありません(売り切れ、またはタイトル・説明が変わった可能性があります)。", counts };
}

// ===== 一覧の読み取り =====
async function readPage(session, fetcher, page) {
  const path = page > 1 ? `${LIST_PATH}?page=${page}` : LIST_PATH;
  const res = await gcFetch(path, session, { headers: { Accept: "text/html" } }, fetcher, { cat: "更新", what: `「出品中」${page}ページ目を確認` });
  const r = await readRes(res);
  if (r.kind === "blocked") return { ok: false, kind: "blocked", status: r.status, message: "一覧を読むときにCloudflareの確認画面で止められました。" };
  if (r.kind === "session") return { ok: false, kind: "session", status: r.status, message: "ログインしていない状態として扱われました。PHPSESSIDを取り直してください。" };
  if (res.status !== 200 || !/rows-list|item-row/.test(r.text)) return { ok: false, kind: "session", status: res.status, message: `一覧のページを読めませんでした(応答${res.status})。PHPSESSIDが切れている可能性があります。` };
  return { ok: true, html: r.text, items: parseListHtml(r.text), maxPage: parseMaxPage(r.text) };
}

// 出品中の一覧を最大 MAX_PAGES ページ読み、上から順の位置(position)と指紋(key)を付けて返す
export async function readOnsale(session, fetcher, log) {
  const p1 = await readPage(session, fetcher, 1);
  if (!p1.ok) return p1;
  const last = Math.min(p1.maxPage || 1, MAX_PAGES);
  const raw = [...p1.items];
  for (let p = 2; p <= last; p++) {
    const r = await readPage(session, fetcher, p);
    if (!r.ok) return r;
    raw.push(...r.items);
  }
  if ((p1.maxPage || 1) > MAX_PAGES) log && log.warn("更新", `出品中が${p1.maxPage}ページあります。${MAX_PAGES + 1}ページ目以降の出品は更新の対象に入りません`);
  const items = [];
  for (let i = 0; i < raw.length; i++) items.push({ ...raw[i], position: i, key: await fingerprint(raw[i].title, raw[i].desc) });
  return { ok: true, items, pages: last, maxPage: p1.maxPage || 1 };
}

// 画面表示用に小さくした一覧(説明は先頭だけ)
export function snapshotOf(items, now) {
  return { at: now, items: items.map((x) => ({ productId: x.productId, position: x.position, status: x.status, title: x.title.slice(0, 120), descHead: x.desc.trim().slice(0, 160), descLen: normText(x.desc).length, thumb: x.thumb, key: x.key })) };
}

// 一覧の中で、出どころの違う文字(サイトのメッセージ)を1つ拾う(成功の文言が無かったときの手がかり用)
function noticeOf(html) {
  const t = String(html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const m = t.match(/[^。!！\s]{0,30}(上限|回数|できません|しばらく|エラー|失敗)[^。!！]{0,40}/);
  return m ? m[0].trim().slice(0, 80) : "";
}

// ===== 1件を更新して、結果を確かめる =====
export async function boostItem(item, session, fetcher) {
  const out = { productId: item.productId, positionBefore: item.position + 1 };
  const res = await gcFetch(BOOST_PATH(item.productId), session, { headers: { Accept: "text/html" } }, fetcher, { cat: "更新", what: `商品 ${item.productId} を一覧の先頭へ` });
  const r = await readRes(res);
  out.sent = true;
  out.status = r.status;
  out.location = r.location || null;
  out.cfRay = res.headers.get("cf-ray") || null;
  out.colo = (out.cfRay || "").split("-").pop() || null;
  if (r.kind === "blocked") return { ...out, ok: false, kind: "blocked", message: `更新がCloudflareの確認画面で止められました(応答${r.status})。自動更新を止めました。` };
  if (r.kind === "session") return { ...out, ok: false, kind: "session", message: "ログイン画面へ転送されました。PHPSESSIDを取り直してください。自動更新を止めました。" };
  if (!(r.status >= 300 && r.status < 400)) return { ...out, ok: false, kind: "unknown", message: `想定外の応答です(応答${r.status})。`, notice: noticeOf(r.text) || undefined };
  // 1ページ目を読み直して「更新しました」の表示と、先頭に来たかを確かめる
  const v = await readPage(session, fetcher, 1);
  if (!v.ok) return { ...out, ok: false, kind: "unconfirmed", message: `更新は送れました(応答${r.status})が、確認のための読み直しに失敗しました: ${v.message}` };
  out.flash = FLASH_OK.test(v.html);
  out.movedToTop = v.items[0]?.productId === item.productId;
  out.positionAfter = v.items.findIndex((x) => x.productId === item.productId) + 1 || null;
  out.notice = out.flash ? undefined : noticeOf(v.html) || undefined;
  if (out.flash || (out.movedToTop && item.position !== 0)) return { ...out, ok: true, kind: "boosted", message: `更新しました(${out.positionBefore}番目→${out.positionAfter || "?"}番目${out.flash ? "・「更新しました」の表示あり" : ""})。` };
  return { ...out, ok: false, kind: "unconfirmed", message: `更新は送れました(応答${r.status})が、「更新しました」の表示も先頭への移動も確認できませんでした。${out.notice ? "サイトのメッセージ: " + out.notice : ""}` };
}

// ===== 1回分の更新(自動実行の予定枠、または画面からの「今すぐ1回」) =====
// deps: { load, save, db, createFetcher, siteOfEnv }(core.mjs から渡す。循環読み込みを避けるため)
export async function runBoost(env, { now = Date.now(), log, slot = null, manual = false, productId = "", deps }) {
  const { load, save, db, createFetcher, siteOfEnv } = deps;
  const store = db(env);
  const site = siteOfEnv(env);
  const dk = dayKey(now);
  const [settings, secret, state0, g] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "state"), store.getMany(["boost:types", "boost:cursor"])]);
  const types = g["boost:types"] || [];
  const cursor = g["boost:cursor"] || 0;

  // 結果を保存する(予定枠の状態・回数・履歴・警告・次の種類)
  const finish = async (result, { counted = false, lockPrev = null, release = false } = {}) => {
    if (release && lockPrev !== null) await store.release(lockPrev);
    const state = await load(env, "state"); // 送信中に変わっている可能性があるので読み直す
    const day = (state.days[dk] ||= { count: 0, slots: {} });
    if (counted) { day.count = (day.count || 0) + 1; day.boosts = (day.boosts || 0) + 1; }
    if (slot != null) {
      day.bslots ||= {};
      const prev = day.bslots[slot] || { attempts: 0 };
      const attempts = prev.attempts + 1;
      const giveUp = result.ok || result.kind === "unconfirmed" || attempts >= 2 || GIVE_UP.includes(result.kind);
      day.bslots[slot] = { status: result.ok ? "done" : giveUp ? "failed" : "retry", attempts, at: now, message: result.ok ? undefined : result.message };
    }
    if (STOP.includes(result.kind)) state.alert = { kind: result.kind, message: result.message, at: now };
    else if (result.ok && state.alert && STOP.includes(state.alert.kind)) state.alert = null;
    const keys = Object.keys(state.days).sort();
    while (keys.length > 14) delete state.days[keys.shift()];
    const hist = (await store.get("boost:history")) || [];
    hist.unshift({ at: now, ok: !!result.ok, kind: result.kind, productId: result.productId || null, type: result.typeLabel || null, message: result.message, manual, slot });
    await Promise.all([save(env, "state", state), store.put("boost:history", hist.slice(0, HISTORY_MAX))]);
    const d = { 種類: result.typeLabel, 商品番号: result.productId, 応答: result.status, 転送先: result.location, "cf-ray": result.cfRay, 位置: result.positionBefore ? `${result.positionBefore}番目→${result.positionAfter || "?"}番目` : undefined, 飛ばした種類: result.skipped || undefined, サイトのメッセージ: result.notice, 今日の回数: counted ? `${day.count}/${settings.dailyLimit}` : undefined };
    Object.keys(d).forEach((k) => (d[k] === undefined || d[k] === null) && delete d[k]);
    const head = manual ? "今すぐ1回更新" : slot != null ? `予定枠 ${Math.floor(slot / 60)}:${String(slot % 60).padStart(2, "0")} の更新` : "更新";
    if (result.ok) log.info("更新", `${head}: ${result.typeLabel ? `「${result.typeLabel}」` : ""}${result.message}`, d);
    else if (["nomatch", "notypes", "interval"].includes(result.kind)) log.warn("更新", `${head}: ${result.message}`, d);
    else log.error("更新", `${head}: ${result.message}`, d);
    return { ...result, counted };
  };

  if (!secret.phpsessid) return finish({ ok: false, kind: "nosession", message: "ログイン情報(PHPSESSID)が未登録です。" });
  const day0 = state0.days[dk] || { count: 0 };
  if ((day0.count || 0) >= settings.dailyLimit) return finish({ ok: false, kind: "limit", message: `今日の上限(出品と更新を合わせて${settings.dailyLimit}回)に達しています。` });
  if (!manual && !productId && !types.length) return finish({ ok: false, kind: "notypes", message: "更新する種類がまだ登録されていません。「種類」タブで登録してください。" });

  const lock = await store.claim(now, settings.minIntervalMin * 60e3);
  if (!lock.ok) {
    const r = { ok: false, kind: "interval", message: `前回の更新から${settings.minIntervalMin}分たっていません(あと約${Math.ceil(lock.waitMs / 60e3)}分)。` };
    // 予定枠は記録しない(次の自動実行でもう一度試す)
    if (slot != null) { log.debug("更新", r.message); return r; }
    return finish(r);
  }

  const fetcher = createFetcher(store, log, { site });
  const session = { phpsessid: secret.phpsessid }; // PHPSESSID だけ
  try {
    const list = await readOnsale(session, fetcher, log);
    if (!list.ok) return await finish({ ...list, sent: false }, { lockPrev: lock.prev, release: true });
    await store.put("boost:snapshot", snapshotOf(list.items, now));

    let pick;
    if (productId) {
      const item = list.items.find((x) => x.productId === productId);
      if (!item) pick = { ok: false, kind: "notfound", message: `商品番号 ${productId} が「出品中」に見つかりませんでした。` };
      else if (isDealing(item)) pick = { ok: false, kind: "notfound", message: `商品番号 ${productId} は「${item.status}」のため更新しません。` };
      else pick = { ok: true, item, type: types.find((t) => t.key === item.key) || null };
    } else {
      pick = chooseTarget(types, list.items, cursor);
    }
    if (!pick.ok) return await finish(pick, { lockPrev: lock.prev, release: true });

    const label = pick.type ? pick.type.label : null;
    log.info("更新", `更新する出品: 商品 ${pick.item.productId}${label ? `(種類「${label}」${pick.skipped ? `・一致0件の種類を${pick.skipped}つ飛ばしました` : ""})` : ""}・一覧の${pick.item.position + 1}番目/${list.items.length}件`);
    const r = await boostItem(pick.item, session, fetcher);
    const result = { ...r, typeLabel: label, skipped: pick.skipped || 0 };
    const sent = !!r.sent && !STOP.includes(r.kind);
    const counted = r.ok || r.kind === "unconfirmed";

    // 次の種類へ進める(送れたときだけ)。種類の最終更新時刻も記録する
    if (sent && !productId && pick.nextCursor !== undefined) await store.put("boost:cursor", pick.nextCursor);
    if (r.ok && pick.type) {
      const cur = (await store.get("boost:types")) || [];
      const t = cur.find((x) => x.id === pick.type.id);
      if (t) { t.lastAt = now; t.boosted = (t.boosted || 0) + 1; await store.put("boost:types", cur); }
      // 画面の一覧も、上げた商品を先頭に並べ替えておく
      const snap = snapshotOf([pick.item, ...list.items.filter((x) => x.productId !== pick.item.productId)].map((x, i) => ({ ...x, position: i })), now);
      await store.put("boost:snapshot", snap);
    }
    return await finish(result, { counted, lockPrev: lock.prev, release: !sent });
  } catch (e) {
    const paused = e?.constructor?.name === "PausedError";
    return await finish({ ok: false, kind: paused ? "paused" : "network", sent: false, message: paused ? e.message : `通信できませんでした(${e.message})` }, { lockPrev: lock.prev, release: true });
  } finally {
    await fetcher.finish();
  }
}

// ===== 種類の登録(画面から) =====
// 最後に読んだ一覧(snapshot)の中から商品を選び、その商品のタイトル+説明を「種類」として登録する
export function newTypeFrom(snapItem, label, types) {
  if (types.some((t) => t.key === snapItem.key)) throw new Error("この出品と同じタイトル・説明の種類は、すでに登録されています。");
  const id = Math.random().toString(36).slice(2, 10);
  return { id, key: snapItem.key, label: String(label || snapItem.title || "").trim().slice(0, 40) || `種類${types.length + 1}`, title: snapItem.title, descHead: snapItem.descHead, thumb: snapItem.thumb, createdAt: Date.now(), boosted: 0, lastAt: null };
}

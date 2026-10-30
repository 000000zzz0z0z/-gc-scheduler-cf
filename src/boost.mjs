// 「更新ボタン」(出品中の商品を一覧の先頭へ上げる)のテスト。
// ブラウザで「更新」を押すと GET /mypage/products/boost-product/{商品番号} が送られ、
// 302 で /mypage/products に戻り、画面に「更新しました」と出る(本人の画面で確認済み)。
//
// このファイルは「1回だけ送って、ツールから通るかを確かめる」ためのもの。自動で繰り返す機能はまだない。
// ・画面から予約し、次の自動実行(日本からの外部起動と同じ経路)の中で1回だけ実行する
// ・出品と更新は合わせて1日15回までなので、成功したら今日の回数(出品と共通)を1つ増やす
// ・出品と同じ「前回から○分あける」ロックを使う(更新と出品が近い時刻に重ならないように)
// ・ログイン情報は PHPSESSID だけを送る(通行証 cf_clearance や追加ヘッダーは使わない)
import { gcFetch, readRes, dayKey } from "./gc.mjs";
import { parseListHtml } from "./scrape.mjs";

export const BOOST_PATH = (id) => `/mypage/products/boost-product/${encodeURIComponent(id)}`;
const LIST_PATH = "/mypage/products";
const FLASH_OK = /更新しました/;
// 予約から実行までの期限(これを過ぎた予約は取り消す)
export const BOOST_RESERVE_TTL = 10 * 60e3;

// 応答の本文から、サイトのメッセージらしき文を1つだけ拾う(成功の文言が無かったときの手がかり用)
function noticeOf(html) {
  const t = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const m = t.match(/[^。!！\s]{0,30}(上限|回数|できません|しばらく|エラー|失敗)[^。!！]{0,40}/);
  return m ? m[0].trim().slice(0, 80) : "";
}

// 一覧から更新する商品を選ぶ。
// 指定がなければ、1ページ目の「取引中でない」商品のうち、いちばん下のものを選ぶ
// (先頭へ移動したかどうかが一番はっきり分かるため)。
export function pickTarget(items, wanted = "") {
  const free = items.filter((x) => !x.status);
  if (wanted) {
    const hit = items.find((x) => x.productId === wanted);
    if (!hit) return { ok: false, kind: "notfound", message: `商品番号 ${wanted} が「出品中」の1ページ目に見つかりませんでした。` };
    if (hit.status) return { ok: false, kind: "notfound", message: `商品番号 ${wanted} は「${hit.status}」のため更新しません。` };
    return { ok: true, item: hit, picked: "指定", position: items.indexOf(hit) };
  }
  if (!free.length) return { ok: false, kind: "empty", message: "「出品中」に更新できる商品がありません(取引中でない商品が1ページ目にありません)。" };
  const item = free[free.length - 1];
  return { ok: true, item, picked: "自動(1ページ目のいちばん下)", position: items.indexOf(item) };
}

async function readList(session, fetcher, what) {
  const res = await gcFetch(LIST_PATH, session, { headers: { Accept: "text/html" } }, fetcher, { cat: "更新", what });
  const r = await readRes(res);
  if (r.kind === "blocked") return { ok: false, kind: "blocked", status: r.status, message: "一覧を読むときにCloudflareの確認画面で止められました。" };
  if (r.kind === "session") return { ok: false, kind: "session", status: r.status, message: "ログインしていない状態として扱われました。PHPSESSIDを取り直してください。" };
  if (res.status !== 200 || !/rows-list|item-row/.test(r.text)) return { ok: false, kind: "session", status: res.status, message: `一覧のページを読めませんでした(応答${res.status})。PHPSESSIDが切れている可能性があります。` };
  return { ok: true, items: parseListHtml(r.text), html: r.text };
}

// 更新を1回だけ送って、結果を確かめる。
// 送るのは最大3回: ①一覧を読む(商品の指定がないときだけ) ②更新を送る ③一覧を読み直して確認
export async function boostOnce({ productId = "", session, fetcher, log }) {
  const out = { productId: productId || null, picked: null };
  let before = null;
  let position = null;

  // ① 対象を決める(指定があっても、取引中でないかを確かめるため一覧を読む)
  const l1 = await readList(session, fetcher, "更新テスト: 「出品中」の一覧で対象を確認");
  if (!l1.ok) return { ...out, ...l1, sent: false };
  before = l1.items.map((x) => x.productId);
  const t = pickTarget(l1.items, productId);
  if (!t.ok) return { ...out, ...t, sent: false };
  out.productId = t.item.productId;
  out.picked = t.picked;
  position = t.position;
  log.info("更新", `更新する商品: ${out.productId}(${t.picked}・今は1ページ目の${position + 1}番目/${before.length}件)`);

  // ② 更新を送る(ブラウザで「更新」を押したときと同じ GET)
  const res = await gcFetch(BOOST_PATH(out.productId), session, { headers: { Accept: "text/html" } }, fetcher, { cat: "更新", what: `更新テスト: 商品 ${out.productId} を一覧の先頭へ` });
  const r = await readRes(res);
  out.sent = true;
  out.status = r.status;
  out.location = r.location || null;
  out.cfRay = res.headers.get("cf-ray") || null;
  out.colo = (out.cfRay || "").split("-").pop() || null;
  out.cfMitigated = res.headers.get("cf-mitigated") || null;

  if (r.kind === "blocked") return { ...out, ok: false, kind: "blocked", message: `更新もCloudflareの確認画面で止められました(応答${r.status})。この方法は使えません。` };
  if (r.kind === "session") return { ...out, ok: false, kind: "session", message: "ログイン画面へ転送されました。PHPSESSIDを取り直してから、もう一度テストしてください。" };
  if (!(r.status >= 300 && r.status < 400)) return { ...out, ok: false, kind: "unknown", message: `想定外の応答です(応答${r.status})。ブラウザでは302が返っていました。`, notice: noticeOf(r.text) || undefined };

  // ③ 一覧を読み直して、「更新しました」の表示と、先頭に来たかを確かめる
  const l2 = await readList(session, fetcher, "更新テスト: 一覧を読み直して結果を確認");
  if (!l2.ok) return { ...out, ok: false, kind: "unconfirmed", message: `更新は送れました(応答${r.status})が、確認のための一覧の読み直しに失敗しました: ${l2.message}` };
  const after = l2.items.map((x) => x.productId);
  out.flash = FLASH_OK.test(l2.html);
  out.positionBefore = position + 1;
  out.positionAfter = after.indexOf(out.productId) + 1 || null;
  out.movedToTop = after[0] === out.productId && position !== 0;
  out.notice = out.flash ? undefined : noticeOf(l2.html) || undefined;

  if (out.flash || out.movedToTop) {
    const how = [out.flash ? "画面に「更新しました」の表示あり" : null, out.movedToTop ? `${out.positionBefore}番目→先頭へ移動` : null].filter(Boolean).join("・");
    return { ...out, ok: true, kind: "boosted", message: `更新できました(${how})。` };
  }
  return { ...out, ok: false, kind: "unconfirmed", message: `更新は送れました(応答${r.status})が、「更新しました」の表示も先頭への移動も確認できませんでした(${out.positionBefore}番目→${out.positionAfter || "見つからない"})。${out.notice ? "サイトのメッセージ: " + out.notice : ""}` };
}

// 予約された更新テストを、自動実行(tick)の中で1回だけ実行する。
// 停止中(スイッチオフ)でも動く。結果は boostResult に保存し、画面で表示する。
export async function runBoostReserve(env, { now = Date.now(), log, reserve, deps }) {
  const { load, save, db, createFetcher, siteOfEnv } = deps;
  const store = db(env);
  const site = siteOfEnv(env);
  const done = async (result) => {
    const r = { at: now, reservedAt: reserve.at, ...result };
    await store.put("boostResult", r);
    return r;
  };

  if (now - (reserve.at || 0) > BOOST_RESERVE_TTL) return done({ ok: false, kind: "expired", message: "予約から10分たっても実行できなかったため、予約を取り消しました。" });

  const [settings, secret, state0] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "state")]);
  if (!secret.phpsessid) return done({ ok: false, kind: "nosession", message: "ログイン情報(PHPSESSID)が未登録です。" });
  const dk = dayKey(now);
  const day0 = state0.days[dk] || { count: 0 };
  if ((day0.count || 0) >= settings.dailyLimit) return done({ ok: false, kind: "limit", message: `今日の上限(出品と更新を合わせて${settings.dailyLimit}回)に達しています。` });

  // 出品と同じロック。前回の出品・更新から minIntervalMin 分たっていなければ送らない
  const gap = settings.minIntervalMin * 60e3;
  const lock = await store.claim(now, gap);
  if (!lock.ok) return done({ ok: false, kind: "interval", message: `前回の出品・更新から${settings.minIntervalMin}分たっていません(あと約${Math.ceil(lock.waitMs / 60e3)}分)。少し待ってからもう一度予約してください。` });

  const fetcher = createFetcher(store, log, { site });
  let result;
  try {
    // PHPSESSID だけで送る(通行証・追加ヘッダーは付けない)
    result = await boostOnce({ productId: reserve.productId || "", session: { phpsessid: secret.phpsessid }, fetcher, log });
  } catch (e) {
    const paused = e?.constructor?.name === "PausedError";
    result = { ok: false, kind: paused ? "paused" : "network", sent: false, message: paused ? e.message : `通信できませんでした(${e.message})` };
  } finally {
    await fetcher.finish();
  }

  // 更新が行われていないと確定しているときだけロックを戻す(すぐ出品・再テストできるように)
  if (!result.sent || ["blocked", "session"].includes(result.kind)) {
    await store.release(lock.prev);
    log.debug("更新", "更新は行われていないため、ロックを戻しました");
  }
  // 成功、または「送れたが確認できなかった」ときは、上限を超えないよう回数(出品と共通)に数える
  if (result.ok || result.kind === "unconfirmed") {
    const state = await load(env, "state"); // 送信中に変わっている可能性があるので読み直す
    const day = (state.days[dk] ||= { count: 0, slots: {} });
    day.count = (day.count || 0) + 1;
    day.boosts = (day.boosts || 0) + 1;
    await save(env, "state", state);
    log.debug("更新", `今日の回数(出品と更新の合計)を ${day.count}/${settings.dailyLimit} にしました${result.ok ? "" : "(確認できなかったが、上限を超えないよう数えました)"}`);
  }

  const d = { 商品番号: result.productId || undefined, 選び方: result.picked || undefined, 応答: result.status, 転送先: result.location || undefined, "cf-ray": result.cfRay || undefined, "cf-mitigated": result.cfMitigated || undefined, 更新しましたの表示: result.flash === undefined ? undefined : result.flash ? "あり" : "なし", 位置: result.positionBefore ? `${result.positionBefore}番目→${result.positionAfter || "?"}番目` : undefined, サイトのメッセージ: result.notice || undefined };
  Object.keys(d).forEach((k) => d[k] === undefined && delete d[k]);
  if (result.ok) log.info("更新", `更新テスト: 成功 - ${result.message}`, d);
  else log.error("更新", `更新テスト: 失敗 - ${result.message}`, d);
  return done(result);
}

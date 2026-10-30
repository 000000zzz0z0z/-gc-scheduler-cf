// Cloudflare Workers の入口。
// - fetch: 管理画面の表示と API
// - scheduled: 1分おきの自動出品(wrangler.toml の triggers.crons)
import { PAGE } from "./page.mjs";
import { load, save, loadLogs, db, tick, planBoosts, boostSlots, siteOfEnv } from "./core.mjs";
export { GcStore } from "./store.mjs";
import { dayKey, testConnection } from "./gc.mjs";
import { SITES, SITE_IDS, siteOf, siteEnv } from "./sites.mjs";

// どのサイトの操作か。画面は x-site ヘッダー、外部起動やリアルタイム表示は ?s= で伝える(なければゲームクラブ)
function requestSite(request, url) {
  return siteOf(request.headers.get("x-site")) || siteOf(url.searchParams.get("s")) || SITES.gc;
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

function uuid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2)).slice(0, 8);
}

// タイミング攻撃に強い比較
function safeEqual(a, b) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}
function authorized(request, env) {
  const expected = env.ADMIN_PASSWORD || "";
  let given = request.headers.get("x-admin-key") || "";
  try { given = decodeURIComponent(given); } catch {}
  return !!expected && safeEqual(given, expected);
}

function mergeSettings(cur, body) {
  const s = JSON.parse(JSON.stringify(cur));
  if ("paused" in body) s.paused = !!body.paused;

  return s;
}

function who(request) {
  const cf = request.cf || {};
  const ua = request.headers.get("user-agent") || "";
  const dev = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "不明";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "不明";
  return { IP: request.headers.get("cf-connecting-ip") || "不明", 国: cf.country || "不明", 地域: cf.city || cf.region || undefined, 端末: dev, ブラウザ: br };
}
// 画面が数秒おきに自動で取りに来る通信は、記録すると大量になるので個別には残さない
const POLLING = new Set(["GET /api/ops", "GET /api/state", "GET /api/logs", "POST /api/hello", "GET /api/overview"]);
async function accessLog(env, request, lvl, msg, extra) {
  try { const { createLogger } = await import("./log.mjs"); const l = createLogger("access"); l[lvl]("アクセス", msg, { ...who(request), ...(extra || {}) }); await l.flush(db(env)); } catch {}
}

async function adminLog(env, msg, d) {
  try { const { createLogger } = await import("./log.mjs"); const l = createLogger("manual"); l.info("管理画面", msg, d); await l.flush(db(env)); } catch {}
}

async function handleApi(request, env, path, baseEnv = env) {
  if (!env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD が未設定です。CloudflareのSettings → Variables and Secrets で設定してください。" }, 500);
  if (!authorized(request, env)) {
    const given = request.headers.get("x-admin-key");
    if (given) await accessLog(env, request, "warn", `パスワード違いのアクセスを拒否しました(${request.method} ${path})`, { 入力されたパスワードの長さ: decodeURIComponent(given).length + "文字(中身は記録しません)" });
    return json({ error: "パスワードが違います。" }, 401);
  }
  if (!env.GC_STORE) return json({ error: "保存領域(Durable Object)が未接続です。wrangler.toml を最新版にしてください。" }, 500);

  const site = siteOfEnv(env);
  const method = request.method;
  const body = ["POST", "PATCH", "PUT"].includes(method) ? await request.json().catch(() => ({})) : {};
  const seg = path.split("/").filter(Boolean); // ["api", ...]
  const sub = seg.slice(1);

  try {
    if (method === "GET" && sub[0] === "state" && sub.length === 1) {
      const { netStatus } = await import("./net.mjs");
      const st = db(env);
      const [settings, secret, state, lastTick, net, g] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "state"), st.get("lastTick"), netStatus(st), st.getMany(["ext:info", "lock:last", "boost:types", "boost:cursor", "boost:snapshot", "boostReserve"])]);
      const now = Date.now();
      const types = g["boost:types"] || [];
      const snap = g["boost:snapshot"] || null;
      // 種類ごとの一致件数は、最後に読んだ一覧から数える(画面を開くたびにサイトへは通信しない)
      const counts = {};
      for (const t of types) counts[t.id] = snap ? snap.items.filter((x) => x.key === t.key && !/取引/.test(x.status || "")).length : null;
      const today = state.days[dayKey(now)] || { count: 0, slots: {} };
      return json({
        now, site: { id: site.id, name: site.name }, settings,
        session: { set: !!secret.phpsessid, updatedAt: secret.updatedAt || null },
        slots: boostSlots(settings), plan: planBoosts({ settings, state, now }),
        today: { count: today.count || 0, boosts: today.boosts || 0, bslots: today.bslots || {} },
        types, counts, cursor: types.length ? (g["boost:cursor"] || 0) % types.length : 0,
        snapshot: snap, reserve: g.boostReserve || null,
        alert: state.alert, lastTick, net, lockLast: g["lock:last"] || 0, ext: g["ext:info"] || null,
      });
    }
    if (method === "GET" && sub[0] === "logs" && sub.length === 1) return json({ logs: await loadLogs(env, 3000) });

    if (method === "POST" && sub[0] === "settings") {
      const s = mergeSettings(await load(env, "settings"), body); await save(env, "settings", s);
      if ("paused" in body) await adminLog(env, body.paused ? `${site.name}の自動更新をオフにしました` : `${site.name}の自動更新をオンにしました`);
      else await adminLog(env, "設定を変更しました", { keys: Object.keys(body) });
      return json({ ok: true, settings: s });
    }

    if (method === "POST" && sub[0] === "session") {
      const v = String(body.phpsessid || "").trim().replace(/^PHPSESSID=/i, "").replace(/;.*$/, "").trim();
      if (!/^[A-Za-z0-9,-]{10,128}$/.test(v)) throw new Error("PHPSESSIDの値の形式が正しくありません。値の部分だけを貼り付けてください。");
      const prev = await load(env, "secret");
      // 通行証(cf/ua/chua)はそのまま残す。PHPSESSIDだけ入れ替える
      await save(env, "secret", { ...prev, phpsessid: v, updatedAt: Date.now() });
      await adminLog(env, "ログイン情報(PHPSESSID)を登録しました");
      const state = await load(env, "state");
      if (state.alert?.kind === "session") { state.alert = null; await save(env, "state", state); }
      return json({ ok: true });
    }

    if (method === "DELETE" && sub[0] === "session") { await save(env, "secret", {}); await adminLog(env, "ログイン情報を削除しました"); return json({ ok: true }); }

    if (method === "POST" && sub[0] === "test") {
      const secret = await load(env, "secret");
      if (!secret.phpsessid) throw new Error("先に設定タブでPHPSESSIDを登録してください。");
      // 自動実行と同じく、保存領域から通信する(=本番と同じ経路を確かめる)
      const { relay } = await import("./net.mjs");
      const st = db(env);
      const viaRelay = (u, i) => relay(st, u, i);
      viaRelay.site = site; // 送り先のサイト
      const r = await testConnection({ phpsessid: secret.phpsessid }, { fetcher: viaRelay });
      await adminLog(env, `接続テスト: ${r.ok ? "成功" : "失敗"} - ${r.message}`, { status: r.status, colo: r.colo });
      return json(r);
    }
    // ===== 通信の出どころテスト =====
    // 保存領域がどこの拠点にあるかと、そこからゲームクラブ(ログインなしのトップページ)に通れるかを確かめる。
    // 候補は2つ: データ本体の保存領域(main)と、中継専用の保存領域(relay-jp。画面=東京から初めて作るのでアジアに置かれる見込み)。
    // 日本にあって通れたほうを、以後の通信の出どころにする。休止中でも各1回だけ通信する(確認用)。
    // ===== 日本からの外部起動の設定 =====
    if (sub[0] === "ext") {
      const st = db(env);
      const mk = () => (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "").slice(0, 40);
      let key = await st.get("ext:key");
      if (method === "POST" && sub[1] === "regen") { key = mk(); await st.put("ext:key", key); await adminLog(env, "外部起動の合言葉を作り直しました(古いURLは使えなくなりました)"); }
      if (!key) { key = mk(); await st.put("ext:key", key); }
      const g = await st.getMany(["ext:info"]);
      // ゲームクラブは統合前と同じURL(Lambdaの URL はそのまま使える)。他のサイトは &s=サイト を付ける
      return json({ url: `${new URL(request.url).origin}/ext-tick?k=${key}${site.id === "gc" ? "" : "&s=" + site.id}`, info: g["ext:info"] || null });
    }
    // ===== 更新(今すぐ1回・結果・履歴) =====
    // 「今すぐ1回更新」は次の自動実行(1分以内)に予約し、本番と同じ経路で送る。スイッチがオフでも実行される。
    if (sub[0] === "boost") {
      const st = db(env);
      if (method === "POST" && sub[1] === "reserve") {
        const [settings, secret, state, g] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "state"), st.getMany(["lock:last", "net:pauseUntil", "boostReserve"])]);
        const now = Date.now();
        const no = (m) => json({ ok: false, message: m });
        const productId = String(body.productId || "").trim();
        if (productId && !/^\d{1,12}$/.test(productId)) return no("商品番号は数字だけで入力してください。");
        if (!secret.phpsessid) return no("ログイン情報(PHPSESSID)が未登録です。");
        const day = state.days[dayKey(now)] || { count: 0 };
        if ((day.count || 0) >= settings.dailyLimit) return no(`今日の上限(${settings.dailyLimit}回)に達しています。`);
        const left = settings.minIntervalMin * 60e3 - (now - (g["lock:last"] || 0));
        if (left > 0) return no(`前回の更新から${settings.minIntervalMin}分たっていません(あと約${Math.ceil(left / 60e3)}分)。`);
        if ((g["net:pauseUntil"] || 0) > now) return no(`${site.name}への通信を休止中です(あと約${Math.ceil((g["net:pauseUntil"] - now) / 60e3)}分)。`);
        if (g.boostReserve) return no("すでに予約済みです。1分以内に実行されます。");
        await st.put("boostReserve", { at: now, productId });
        await adminLog(env, `${site.name}の「今すぐ1回更新」を予約しました(${productId ? "商品 " + productId : "種類の順番どおり"})`);
        return json({ ok: true, at: now });
      }
      if (method === "GET") {
        const g = await st.getMany(["boostReserve", "boostResult", "boost:history"]);
        return json({ pending: g.boostReserve || null, result: g.boostResult || null, history: g["boost:history"] || [] });
      }
    }

    // ===== 出品中の一覧を読み込む(種類の登録・一致件数の確認用) =====
    if (method === "POST" && sub[0] === "listing" && sub[1] === "refresh") {
      const { createLogger } = await import("./log.mjs");
      const { createFetcher } = await import("./net.mjs");
      const { readOnsale, snapshotOf } = await import("./boost.mjs");
      const store = db(env);
      const secret = await load(env, "secret");
      if (!secret.phpsessid) throw new Error("先に設定タブでPHPSESSIDを登録してください。");
      const log = createLogger("manual");
      await log.enableLive(store);
      log.info("管理画面", "「出品中の一覧を読み込む」が押されました");
      const fetcher = createFetcher(store, log, { site });
      try {
        const r = await readOnsale({ phpsessid: secret.phpsessid }, fetcher, log);
        if (!r.ok) throw new Error(r.message);
        const snap = snapshotOf(r.items, Date.now());
        await store.put("boost:snapshot", snap);
        log.info("更新", `出品中の一覧を読み込みました(${r.items.length}件・${r.pages}ページ)`);
        return json({ ok: true, snapshot: snap, pages: r.pages, maxPage: r.maxPage });
      } finally { await fetcher.finish(); await log.flush(store); }
    }

    // ===== 更新する種類(タイトル+説明で見分ける) =====
    if (sub[0] === "types") {
      const st = db(env);
      const types = (await st.get("boost:types")) || [];
      const saveTypes = (v) => st.put("boost:types", v);
      // 追加: 最後に読み込んだ一覧の中の商品を選び、そのタイトル+説明を種類として登録
      if (method === "POST" && sub.length === 1) {
        const { newTypeFrom } = await import("./boost.mjs");
        const snap = (await st.get("boost:snapshot")) || { items: [] };
        const item = snap.items.find((x) => x.productId === String(body.productId || ""));
        if (!item) throw new Error("その商品が一覧に見つかりません。「出品中の一覧を読み込む」を押してから選んでください。");
        const t = newTypeFrom(item, body.label, types);
        types.push(t);
        await saveTypes(types);
        await adminLog(env, `更新する種類を追加しました:「${t.label}」(${types.length}番目)`);
        return json({ ok: true, type: t });
      }
      // 並べ替え(更新はこの順番で A→B→C→A…)
      if (method === "POST" && sub[1] === "order") {
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        if (ids.length !== types.length || !types.every((t) => ids.includes(t.id))) throw new Error("並べ替えの内容が正しくありません。画面を読み込み直してください。");
        const sorted = ids.map((id) => types.find((t) => t.id === id));
        await Promise.all([saveTypes(sorted), st.put("boost:cursor", 0)]);
        await adminLog(env, `更新する種類の順番を変えました: ${sorted.map((t) => t.label).join(" → ")}(次は1番目から)`);
        return json({ ok: true });
      }
      // 名前の変更
      if (method === "POST" && sub[1] && sub[2] === "label") {
        const t = types.find((x) => x.id === sub[1]);
        if (!t) throw new Error("種類が見つかりません。");
        const label = String(body.label || "").trim().slice(0, 40);
        if (!label) throw new Error("名前を入力してください。");
        t.label = label;
        await saveTypes(types);
        return json({ ok: true });
      }
      // 削除
      if (method === "DELETE" && sub[1]) {
        const i = types.findIndex((x) => x.id === sub[1]);
        if (i < 0) throw new Error("種類が見つかりません。");
        const [t] = types.splice(i, 1);
        const cur = (await st.get("boost:cursor")) || 0;
        await Promise.all([saveTypes(types), st.put("boost:cursor", types.length ? (cur > i ? cur - 1 : cur) % types.length : 0)]);
        await adminLog(env, `更新する種類を削除しました:「${t.label}」`);
        return json({ ok: true });
      }
    }
    if (method === "POST" && sub[0] === "origin") {
      const { UA } = await import("./gc.mjs");
      const GC = site.origin;
      const main = db(env);
      const ns = env.GC_STORE;
      const cands = [["main", main]];
      if (ns && !env.__db) cands.push(["relay-jp", ns.get(ns.idFromName("relay-jp"), { locationHint: "apac" })]);
      else if (env.__relay) cands.push(["relay-jp", env.__relay]);
      const JP = ["NRT", "KIX", "FUK", "OKA"];
      const results = [];
      for (const [name, st] of cands) {
        const where = await st.whereAmI();
        const t0 = Date.now();
        let gc;
        try {
          const r = await st.relayHere(GC + "/", { redirect: "manual", headers: { "User-Agent": UA, "Accept-Language": "ja", Accept: "text/html" } });
          const text = r.body ? new TextDecoder().decode(r.body) : "";
          const h = new Headers(r.headers);
          const ray = h.get("cf-ray") || "";
          const challenge = !!h.get("cf-mitigated") || /Just a moment|cf-chl|challenge-platform|Attention Required/i.test(text);
          gc = { status: r.status, ray, colo: ray.split("-").pop() || "", challenge, ms: Date.now() - t0 };
        } catch (e) { gc = { error: e.message }; }
        const ok = gc.status === 200 && !gc.challenge;
        // 判定は「ゲームクラブに届いた通信の出どころ拠点」(cf-rayの末尾)だけで行う。
        // ※trace の loc(国)は、画面から押したときはあなたの国(JP)が引き継がれることがあり、当てにならない
        const inJp = JP.includes(gc.colo);
        results.push({ name, where, gc, ok, inJp });
        await adminLog(env, `通信の出どころテスト[${name === "main" ? "データ本体" : "中継専用"}]: 拠点=${where.colo || "不明"}(${where.loc || "?"}) / ${site.name}=${gc.error ? "通信エラー" : `応答${gc.status}${gc.challenge ? "・確認画面" : ""}`}(出どころ ${gc.colo || "?"})`, { colo: where.colo, loc: where.loc, status: gc.status, cfRay: gc.ray });
      }
      const prev = (await main.get("net:relay")) || "main";
      // 中継専用(アジア指定)を優先し、だめならデータ本体
      const best = results.find((x) => x.name === "relay-jp" && x.ok && x.inJp) || results.find((x) => x.ok && x.inJp) || null;
      const chosen = best ? best.name : prev;
      if (best && chosen !== prev) await main.put("net:relay", chosen);
      // 日本から通れると確かめられたので、海外から止められて入っていた休止は解除する
      if (best && ((await main.get("net:pauseUntil")) || 0) > Date.now()) { await main.put("net:pauseUntil", 0); await adminLog(env, "日本から通れることを確認したため、通信の休止を解除しました"); }
      await adminLog(env, best ? `以後の${site.name}への通信は「${chosen === "main" ? "データ本体の保存領域" : "中継専用の保存領域"}」(${best.gc.colo})から出します` : `日本から通れる保存領域が見つからなかったため、通信の出どころは変更しません(現在: ${prev})`);
      return json({ ok: !!best, chosen, changed: !!best && chosen !== prev, results });
    }
    if (method === "POST" && sub[0] === "alert" && sub[1] === "clear") { const state = await load(env, "state"); state.alert = null; await save(env, "state", state); return json({ ok: true }); }

    // ===== 両サイトの状態をまとめて(画面上部の切り替えボタン用) =====
    if (method === "GET" && sub[0] === "overview") {
      const { netStatus } = await import("./net.mjs");
      const now = Date.now();
      const out = {};
      await Promise.all(SITE_IDS.map(async (id) => {
        const e = siteEnv(baseEnv, id);
        try {
          const [settings, state, secret, net, g] = await Promise.all([load(e, "settings"), load(e, "state"), load(e, "secret"), netStatus(db(e), now), db(e).getMany(["ext:info", "lastTick"])]);
          const day = state.days[dayKey(now)] || { count: 0 };
          out[id] = { name: SITES[id].name, paused: !!settings.paused, today: day.count || 0, limit: settings.dailyLimit, alert: state.alert ? state.alert.kind : null, session: !!secret.phpsessid, pauseUntil: net.pauseUntil || 0, ext: g["ext:info"] || null, lastTick: g.lastTick || null };
        } catch (err) { out[id] = { name: SITES[id].name, error: err.message }; }
      }));
      return json({ now, sites: out });
    }

    if (method === "POST" && sub[0] === "hello") { await accessLog(env, request, "info", "管理画面にログインしました"); return json({ ok: true }); }

    // ===== 動作ログ(リアルタイム表示用) =====
    if (method === "GET" && sub[0] === "ops") {
      const url = new URL(request.url);
      const after = url.searchParams.get("after") || "";
      const before = url.searchParams.get("before") || "";
      const limit = Math.min(500, Number(url.searchParams.get("limit")) || 300);
      const store = db(env);
      const now = Date.now();
      if (before) return json({ ops: await store.listOpsBefore(Math.min(500, Number(url.searchParams.get("limit")) || 500), before), now });
      const r = store.opsWithNet ? await store.opsWithNet(limit, after, now) : { ops: await store.listOps(limit, after), net: await (await import("./net.mjs")).netStatus(store) };
      return json({ ...r, now });
    }

    return json({ error: "見つかりません。" }, 404);
  } catch (e) {
    return json({ error: e.message || String(e) }, 400);
  }
}

// ===== 日本からの外部起動 =====
// Cloudflareの自動実行(Cron)には「人」がいないため、通信に「アメリカ」の札が付き、ゲームクラブに止められる。
// 日本のサーバーが1分おきにこのURLを開くと、その通信には「日本」の札が付くので通れる(原因究明の実験で確定)。
// 合言葉(k=)は保存領域に保存し、設定タブで確認・作り直しできる。
async function extTick(request, env, url) {
  const site = siteOfEnv(env);
  const st = db(env);
  const key = await st.get("ext:key");
  const k = url.searchParams.get("k") || "";
  if (!key || !safeEqual(k, key)) { await accessLog(env, request, "warn", `${site.name}の日本からの外部起動を拒否しました(合言葉が違います)`); return json({ ok: false }, 401); }
  const now = Date.now();
  const country = (request.cf && request.cf.country) || "?", colo = (request.cf && request.cf.colo) || "?";
  const g = await st.getMany(["ext:last", "ext:warnAt"]);
  if (now - (g["ext:last"] || 0) < 40e3) return json({ ok: true, site: site.id, ran: false, reason: "前回の起動から40秒たっていないため、今回は処理しません" });
  const first = !g["ext:last"] || now - g["ext:last"] > 10 * 60e3;
  await st.put("ext:last", now);
  await st.put("ext:info", { at: now, country, colo });
  const { createLogger } = await import("./log.mjs");
  const l = createLogger("auto");
  if (first) {
    l.info("システム", `日本からの外部起動が始まりました(起動元の国 ${country}・拠点 ${colo})。以後、Cloudflareの自動実行は${site.name}に通信せず待機します`);
    if (country === "JP" && ((await st.get("net:pauseUntil")) || 0) > now) { await st.put("net:pauseUntil", 0); l.info("システム", "日本の札が付く起動になったため、通信の休止を解除しました"); }
  }
  if (country !== "JP" && now - (g["ext:warnAt"] || 0) > 3600e3) { await st.put("ext:warnAt", now); l.warn("システム", `外部起動の国が日本(JP)ではありません(国 ${country})。${site.name}に止められる可能性があります。起動元のサーバーが日本にあるか確認してください`); }
  await l.flush(st);
  try {
    const r = await tick(env, now);
    return json({ ok: true, site: site.id, ran: true, country, colo, did: Object.keys(r || {}) });
  } catch (e) { return json({ ok: false, site: site.id, ran: true, country, error: e.message }, 500); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ext-tick") return extTick(request, siteEnv(env, siteOf(url.searchParams.get("s")) || SITES.gc), url);
    // ===== リアルタイム表示の専用回線(WebSocket) =====
    // ブラウザの WebSocket は独自のヘッダーを付けられないので、パスワードは接続時の1回だけ k= で受け取る
    if (url.pathname === "/api/stream") {
      if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket only", { status: 426 });
      let k = url.searchParams.get("k") || "";
      try { k = decodeURIComponent(k); } catch {}
      const expected = env.ADMIN_PASSWORD || "";
      if (!expected || !safeEqual(k, expected)) {
        await accessLog(env, request, "warn", "リアルタイム表示への接続を拒否しました(パスワード違い)");
        return new Response("Unauthorized", { status: 401 });
      }
      if (!env.GC_STORE) return new Response("no store", { status: 500 });
      await accessLog(env, request, "debug", "リアルタイム表示の回線がつながりました");
      const site = siteOf(url.searchParams.get("s")) || SITES.gc;
      return env.GC_STORE.get(env.GC_STORE.idFromName(site.store)).fetch(request);
    }

    if (url.pathname.startsWith("/api/")) {
      const t0 = Date.now();
      const senv = siteEnv(env, requestSite(request, url));
      const res = await handleApi(request, senv, url.pathname, env);
      const key = `${request.method} ${url.pathname}`;
      if (!POLLING.has(key) && res.status !== 401) await accessLog(senv, request, res.status >= 400 ? "warn" : "debug", `管理画面の操作: ${key} → 応答${res.status}(${Date.now() - t0}ms)`);
      return res;
    }
    if (url.pathname === "/health") return json({ ok: true, storeBound: !!env.GC_STORE, passwordSet: !!env.ADMIN_PASSWORD, sites: SITE_IDS, oldMacBound: !!env.OLD_MAC_STORE });
    if (url.pathname === "/" || url.pathname === "/index.html") await accessLog(env, request, "info", "管理画面が開かれました");
    return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  },
  // waitUntil を使うと約30秒で打ち切られるため、処理を直接待つ。
  // サイトごとに順番に処理する(片方でエラーが起きても、もう片方は動く)
  async scheduled(event, env, ctx) {
    for (const id of SITE_IDS) {
      const senv = siteEnv(env, id);
      // 日本からの外部起動が動いている間(最後の起動から3分以内)は、そのサイトは何もしない
      // (アメリカの札でサイトに通信すると止められ、60分休止を招くため)
      try {
        const st = db(senv);
        const last = (await st.get("ext:last")) || 0;
        if (Date.now() - last < 3 * 60e3) {
          if (Date.now() - ((await st.get("ext:idleLog")) || 0) > 3600e3) {
            await st.put("ext:idleLog", Date.now());
            const { createLogger } = await import("./log.mjs"); const l = createLogger("auto");
            l.debug("定期実行", "日本からの外部起動が動いているため、Cloudflareの自動実行は待機しています(このメッセージは1時間に1回)"); await l.flush(st);
          }
          continue;
        }
      } catch {}
      try { const r = await tick(senv); console.log("tick", id, JSON.stringify(r)); }
      catch (e) { console.log("tick error", id, e.message); }
    }
  },
};

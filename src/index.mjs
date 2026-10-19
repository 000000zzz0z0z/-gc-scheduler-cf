// Cloudflare Workers の入口。
// - fetch: 管理画面の表示と API
// - scheduled: 1分おきの自動出品(wrangler.toml の triggers.crons)
import { PAGE } from "./page.mjs";
import { load, save, loadLogs, db, publishNext, nextDraftIndex, tick } from "./core.mjs";
export { GcStore } from "./store.mjs";
import { computeSlots, dayKey, parseMultipart, testConnection, isHM } from "./gc.mjs";

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

const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };

function mergeSettings(cur, body) {
  const s = JSON.parse(JSON.stringify(cur));
  if ("paused" in body) s.paused = !!body.paused;
  if (body.schedule) {
    const sc = body.schedule;
    if (sc.mode && !["interval", "manual"].includes(sc.mode)) throw new Error("スケジュールの方式が正しくありません。");
    if (sc.start && !isHM(sc.start)) throw new Error("開始時刻は 9:00 のような形式で入力してください。");
    if (sc.end && !isHM(sc.end)) throw new Error("終了時刻は 24:00 のような形式で入力してください。");
    if (sc.manual) { const bad = sc.manual.filter((t) => !isHM(t) || t === "24:00"); if (bad.length) throw new Error(`時刻の形式が正しくありません: ${bad.join(", ")}`); }
    s.schedule = { ...s.schedule, ...sc };
    if ("count" in sc) s.schedule.count = clamp(sc.count, 1, 15, cur.schedule.count);
  }
  return s;
}

const draftSummary = (d) => {
  const get = (n) => d.fields.find((f) => f.name === n)?.value;
  return { key: d.key, label: d.label, draftId: d.draftId, repeat: d.repeat, enabled: d.enabled, publishedCount: d.publishedCount || 0, lastPublishedAt: d.lastPublishedAt || null, price: get("price") || null, title: (get("name") || "").slice(0, 80) };
};

function who(request) {
  const cf = request.cf || {};
  const ua = request.headers.get("user-agent") || "";
  const dev = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "不明";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "不明";
  return { IP: request.headers.get("cf-connecting-ip") || "不明", 国: cf.country || "不明", 地域: cf.city || cf.region || undefined, 端末: dev, ブラウザ: br };
}
// 画面が数秒おきに自動で取りに来る通信は、記録すると大量になるので個別には残さない
const POLLING = new Set(["GET /api/ops", "GET /api/state", "GET /api/analysis", "GET /api/logs", "POST /api/hello"]);
async function accessLog(env, request, lvl, msg, extra) {
  try { const { createLogger } = await import("./log.mjs"); const l = createLogger("access"); l[lvl]("アクセス", msg, { ...who(request), ...(extra || {}) }); await l.flush(db(env)); } catch {}
}

async function adminLog(env, msg, d) {
  try { const { createLogger } = await import("./log.mjs"); const l = createLogger("manual"); l.info("管理画面", msg, d); await l.flush(db(env)); } catch {}
}

async function handleApi(request, env, path) {
  if (!env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD が未設定です。CloudflareのSettings → Variables and Secrets で設定してください。" }, 500);
  if (!authorized(request, env)) {
    const given = request.headers.get("x-admin-key");
    if (given) await accessLog(env, request, "warn", `パスワード違いのアクセスを拒否しました(${request.method} ${path})`, { 入力されたパスワードの長さ: decodeURIComponent(given).length + "文字(中身は記録しません)" });
    return json({ error: "パスワードが違います。" }, 401);
  }
  if (!env.GC_STORE) return json({ error: "保存領域(Durable Object)が未接続です。wrangler.toml を最新版にしてください。" }, 500);

  const method = request.method;
  const body = ["POST", "PATCH", "PUT"].includes(method) ? await request.json().catch(() => ({})) : {};
  const seg = path.split("/").filter(Boolean); // ["api", ...]
  const sub = seg.slice(1);

  try {
    if (method === "GET" && sub[0] === "state" && sub.length === 1) {
      const { netStatus } = await import("./net.mjs");
      const [settings, secret, drafts, state, lastTick, net, force] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "drafts"), load(env, "state"), db(env).get("lastTick"), netStatus(db(env)), db(env).getMany(["forcePublish", "forceResult", "ext:info"])]);
      const now = Date.now();
      const idx = nextDraftIndex(drafts, state.pointer);
      return json({ now, settings, session: { set: !!secret.phpsessid, updatedAt: secret.updatedAt || null }, drafts: drafts.map(draftSummary), nextDraftKey: idx >= 0 ? drafts[idx].key : null, slots: computeSlots(settings.schedule, settings.dailyLimit), today: state.days[dayKey(now)] || { count: 0, slots: {} }, alert: state.alert, lastTick, net, force: { pending: force.forcePublish || null, result: force.forceResult || null }, ext: force["ext:info"] || null });
    }
    if (method === "GET" && sub[0] === "logs" && sub.length === 1) return json({ logs: await loadLogs(env, 3000) });

    if (method === "POST" && sub[0] === "settings") {
      const s = mergeSettings(await load(env, "settings"), body); await save(env, "settings", s);
      if ("paused" in body) await adminLog(env, body.paused ? "稼働を停止しました" : "稼働を開始しました");
      else await adminLog(env, "設定を変更しました", { keys: Object.keys(body) });
      return json({ ok: true, settings: s });
    }

    if (method === "POST" && sub[0] === "session") {
      const v = String(body.phpsessid || "").trim().replace(/^PHPSESSID=/i, "").replace(/;.*$/, "").trim();
      if (!/^[A-Za-z0-9,-]{10,128}$/.test(v)) throw new Error("PHPSESSIDの値の形式が正しくありません。値の部分だけを貼り付けてください。");
      await save(env, "secret", { phpsessid: v, updatedAt: Date.now() });
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
      const r = await testConnection(secret.phpsessid, { fetcher: (u, i) => relay(st, u, i) });
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
      return json({ url: `${new URL(request.url).origin}/ext-tick?k=${key}`, info: g["ext:info"] || null });
    }
    // ===== 原因究明の実験 =====
    if (sub[0] === "diag") {
      const st = db(env);
      if (method === "POST" && sub[1] === "ui") {
        const { runDiag, diagLine } = await import("./diag.mjs");
        const secret = await load(env, "secret");
        const r = await runDiag(st, secret.phpsessid ? String(secret.phpsessid).trim() : "", "ui");
        await st.put("diag:ui", r);
        await adminLog(env, `原因究明の実験(画面の操作): ${diagLine(r)}`, { cfRay: r.mypage.ray || r.top.ray, status: r.mypage.status ?? r.top.status });
        return json({ ok: true, result: r });
      }
      if (method === "POST" && sub[1] === "reserve") {
        await st.put("diagReserve", { at: Date.now() });
        await adminLog(env, "原因究明の実験(自動実行)を予約しました");
        return json({ ok: true, at: Date.now() });
      }
      if (method === "GET") {
        const g = await st.getMany(["diag:ui", "diag:auto", "diagReserve"]);
        return json({ ui: g["diag:ui"] || null, auto: g["diag:auto"] || null, pending: g.diagReserve || null });
      }
    }
    if (method === "POST" && sub[0] === "origin") {
      const { GC, UA } = await import("./gc.mjs");
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
        await adminLog(env, `通信の出どころテスト[${name === "main" ? "データ本体" : "中継専用"}]: 拠点=${where.colo || "不明"}(${where.loc || "?"}) / ゲームクラブ=${gc.error ? "通信エラー" : `応答${gc.status}${gc.challenge ? "・確認画面" : ""}`}(出どころ ${gc.colo || "?"})`, { colo: where.colo, loc: where.loc, status: gc.status, cfRay: gc.ray });
      }
      const prev = (await main.get("net:relay")) || "main";
      // 中継専用(アジア指定)を優先し、だめならデータ本体
      const best = results.find((x) => x.name === "relay-jp" && x.ok && x.inJp) || results.find((x) => x.ok && x.inJp) || null;
      const chosen = best ? best.name : prev;
      if (best && chosen !== prev) await main.put("net:relay", chosen);
      // 日本から通れると確かめられたので、海外から止められて入っていた休止は解除する
      if (best && ((await main.get("net:pauseUntil")) || 0) > Date.now()) { await main.put("net:pauseUntil", 0); await adminLog(env, "日本から通れることを確認したため、通信の休止を解除しました"); }
      await adminLog(env, best ? `以後のゲームクラブへの通信は「${chosen === "main" ? "データ本体の保存領域" : "中継専用の保存領域"}」(${best.gc.colo})から出します` : `日本から通れる保存領域が見つからなかったため、通信の出どころは変更しません(現在: ${prev})`);
      return json({ ok: !!best, chosen, changed: !!best && chosen !== prev, results });
    }
    // ===== 今すぐ自動出品(予約) =====
    // 画面から直接出品すると「あなたの国」が引き継がれて本番と条件が変わるため、
    // 次の自動実行(1分以内)に出品を予約し、本番と同じ経路で出品する。
    if (method === "POST" && sub[0] === "autopublish") {
      const st = db(env);
      const [settings, secret, drafts, state, g] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "drafts"), load(env, "state"), st.getMany(["lock:last", "net:pauseUntil", "forcePublish"])]);
      const now = Date.now();
      const no = (m) => json({ ok: false, message: m });
      if (settings.paused) return no("停止中です。ホームのスイッチをオンにしてから押してください。");
      if (!secret.phpsessid) return no("ログイン情報(PHPSESSID)が未登録です。");
      if (nextDraftIndex(drafts, state.pointer) < 0) return no("出品できる下書きがありません。");
      const day = state.days[dayKey(now)] || { count: 0 };
      if (day.count >= settings.dailyLimit) return no(`今日の上限(${settings.dailyLimit}回)に達しています。`);
      const gap = (settings.minIntervalMin ?? 30) * 60e3, left = gap - (now - (g["lock:last"] || 0));
      if (left > 0) return no(`前回の出品から${settings.minIntervalMin ?? 30}分たっていません(あと約${Math.ceil(left / 60e3)}分)。`);
      if ((g["net:pauseUntil"] || 0) > now) return no(`ゲームクラブへの通信を休止中です(あと約${Math.ceil((g["net:pauseUntil"] - now) / 60e3)}分)。設定タブの「通信の出どころテスト」で日本から通れると確認できれば、休止は解除されます。`);
      if (g.forcePublish) return no("すでに予約済みです。1分以内に出品されます。");
      await st.put("forcePublish", { at: now });
      await adminLog(env, "「今すぐ自動出品」を予約しました(次の自動実行で出品します)");
      return json({ ok: true, at: now });
    }
    if (method === "POST" && sub[0] === "publish") return json(await publishNext(env, { draftKey: body.key || null, manual: true }));
    if (method === "POST" && sub[0] === "alert" && sub[1] === "clear") { const state = await load(env, "state"); state.alert = null; await save(env, "state", state); return json({ ok: true }); }

    if (sub[0] === "drafts") {
      const drafts = await load(env, "drafts");
      if (method === "POST" && sub.length === 1) {
        const draftId = String(body.draftId || "").trim();
        if (!/^\d+$/.test(draftId)) throw new Error("下書き番号は数字で入力してください(URLの draft= の後ろの数字です)。");
        const fields = parseMultipart(body.raw);
        const title = fields.find((f) => f.name === "name")?.value || "";
        const d = { key: uuid(), label: String(body.label || "").trim() || title.slice(0, 40) || `下書き${draftId}`, draftId, fields, repeat: true, enabled: true, publishedCount: 0, createdAt: Date.now() };
        drafts.push(d);
        await save(env, "drafts", drafts);
        await adminLog(env, `下書きを追加しました: #${draftId}「${d.label}」(${fields.length}項目)`);
        return json({ ok: true, draft: draftSummary(d), fieldCount: fields.length });
      }
      if (method === "POST" && sub[1] === "order") {
        const order = Array.isArray(body.keys) ? body.keys : [];
        const state = await load(env, "state");
        const nextKey = drafts[nextDraftIndex(drafts, state.pointer)]?.key;
        const sorted = [...drafts].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
        const ni = sorted.findIndex((d) => d.key === nextKey);
        state.pointer = ni >= 0 ? ni : 0;
        await Promise.all([save(env, "drafts", sorted), save(env, "state", state)]);
        return json({ ok: true });
      }
      if (method === "POST" && sub[2] === "next") {
        const i = drafts.findIndex((d) => d.key === sub[1]);
        if (i < 0) throw new Error("下書きが見つかりません。");
        const state = await load(env, "state"); state.pointer = i; await save(env, "state", state);
        return json({ ok: true });
      }
      const d = drafts.find((x) => x.key === sub[1]);
      if (!d) throw new Error("下書きが見つかりません。");
      if (method === "PATCH") {
        if ("label" in body) d.label = String(body.label).trim() || d.label;
        if ("enabled" in body) d.enabled = !!body.enabled;
        if ("draftId" in body) { if (!/^\d+$/.test(String(body.draftId))) throw new Error("下書き番号は数字で入力してください。"); d.draftId = String(body.draftId); }
        if (body.raw) d.fields = parseMultipart(body.raw);
        await save(env, "drafts", drafts);
        return json({ ok: true, draft: draftSummary(d) });
      }
      if (method === "DELETE") {
        const state = await load(env, "state");
        const i = drafts.indexOf(d);
        drafts.splice(i, 1);
        await adminLog(env, `下書きを削除しました: #${d.draftId}「${d.label}」`);
        if (state.pointer > i) state.pointer--;
        if (state.pointer >= drafts.length) state.pointer = 0;
        await Promise.all([save(env, "drafts", drafts), save(env, "state", state)]);
        return json({ ok: true });
      }
    }

    if (sub[0] === "logs" && sub[1] && method === "PATCH") {
      const sold = !!body.sold;
      const l = await db(env).patchLog(sub[1], { sold, soldAt: sold ? Number(body.soldAt) || Date.now() : null, soldBy: sold ? "manual" : null });
      if (!l) throw new Error("記録が見つかりません。");
      return json({ ok: true });
    }

    // ===== 分析(自分の売れ行き) =====
    if (method === "GET" && sub[0] === "analysis") {
      const store = db(env);
      const { loadOwn, ownStats } = await import("./own.mjs");
      const { recommendFromOwn, readiness } = await import("./optimize.mjs");
      const settings = await load(env, "settings");
      const now = Date.now();
      const own = ownStats(await loadOwn(store), now);
      return json({ now, ready: readiness(own), own, recommend: recommendFromOwn(own, { count: settings.dailyLimit, now }) });
    }

    // ===== スケジュールを今すぐ作り直す =====
    if (method === "POST" && sub[0] === "rebuild") {
      const { createLogger } = await import("./log.mjs");
      const { rebuildSchedule } = await import("./core.mjs");
      const log = createLogger("manual");
      const s = await load(env, "settings");
      log.info("管理画面", "「今すぐ作り直す」が押されました");
      const r = await rebuildSchedule(env, s, log);
      await log.flush(db(env));
      return json({ ok: true, ...r });
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

    // ===== 今すぐ確認(自分の売れ行き) =====
    if (method === "POST" && sub[0] === "scan") {
      const { createLogger } = await import("./log.mjs");
      const { createFetcher } = await import("./net.mjs");
      const store = db(env);
      const log = createLogger("manual");
      await log.enableLive(store);
      log.info("管理画面", "「今すぐ確認」が押されました");
      const fetcher = createFetcher(store, log);
      const out = {};
      try {
        const secret = await load(env, "secret");
        if (secret.phpsessid) {
          const { scanOwn } = await import("./own.mjs");
          await store.put("lastOwnScan", Date.now());
          out.own = await scanOwn(store, secret.phpsessid, fetcher, log);
        } else throw new Error("先に設定タブでPHPSESSIDを登録してください。");
      } finally { await fetcher.finish(); await log.flush(store); }
      return json({ ok: true, ...out });
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
  const st = db(env);
  const key = await st.get("ext:key");
  const k = url.searchParams.get("k") || "";
  if (!key || !safeEqual(k, key)) { await accessLog(env, request, "warn", "日本からの外部起動を拒否しました(合言葉が違います)"); return json({ ok: false }, 401); }
  const now = Date.now();
  const country = (request.cf && request.cf.country) || "?", colo = (request.cf && request.cf.colo) || "?";
  const g = await st.getMany(["ext:last", "ext:warnAt"]);
  if (now - (g["ext:last"] || 0) < 40e3) return json({ ok: true, ran: false, reason: "前回の起動から40秒たっていないため、今回は処理しません" });
  const first = !g["ext:last"] || now - g["ext:last"] > 10 * 60e3;
  await st.put("ext:last", now);
  await st.put("ext:info", { at: now, country, colo });
  const { createLogger } = await import("./log.mjs");
  const l = createLogger("auto");
  if (first) {
    l.info("システム", `日本からの外部起動が始まりました(起動元の国 ${country}・拠点 ${colo})。以後、Cloudflareの自動実行はゲームクラブに通信せず待機します`);
    if (country === "JP" && ((await st.get("net:pauseUntil")) || 0) > now) { await st.put("net:pauseUntil", 0); l.info("システム", "日本の札が付く起動になったため、通信の休止を解除しました"); }
  }
  if (country !== "JP" && now - (g["ext:warnAt"] || 0) > 3600e3) { await st.put("ext:warnAt", now); l.warn("システム", `外部起動の国が日本(JP)ではありません(国 ${country})。ゲームクラブに止められる可能性があります。起動元のサーバーが日本にあるか確認してください`); }
  await l.flush(st);
  try {
    const r = await tick(env, now);
    return json({ ok: true, ran: true, country, colo, did: Object.keys(r || {}) });
  } catch (e) { return json({ ok: false, ran: true, country, error: e.message }, 500); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ext-tick") return extTick(request, env, url);
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
      return env.GC_STORE.get(env.GC_STORE.idFromName("main")).fetch(request);
    }

    if (url.pathname.startsWith("/api/")) {
      const t0 = Date.now();
      const res = await handleApi(request, env, url.pathname);
      const key = `${request.method} ${url.pathname}`;
      if (!POLLING.has(key) && res.status !== 401) await accessLog(env, request, res.status >= 400 ? "warn" : "debug", `管理画面の操作: ${key} → 応答${res.status}(${Date.now() - t0}ms)`);
      return res;
    }
    if (url.pathname === "/health") return json({ ok: true, storeBound: !!env.GC_STORE, passwordSet: !!env.ADMIN_PASSWORD });
    if (url.pathname === "/" || url.pathname === "/index.html") await accessLog(env, request, "info", "管理画面が開かれました");
    return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  },
  // waitUntil を使うと約30秒で打ち切られるため、処理を直接待つ
  async scheduled(event, env, ctx) {
    // 日本からの外部起動が動いている間(最後の起動から3分以内)は、こちらは何もしない
    // (アメリカの札でゲームクラブに通信すると止められ、60分休止を招くため)
    try {
      const st = db(env);
      const last = (await st.get("ext:last")) || 0;
      if (Date.now() - last < 3 * 60e3) {
        if (Date.now() - ((await st.get("ext:idleLog")) || 0) > 3600e3) {
          await st.put("ext:idleLog", Date.now());
          const { createLogger } = await import("./log.mjs"); const l = createLogger("auto");
          l.debug("定期実行", "日本からの外部起動が動いているため、Cloudflareの自動実行は待機しています(このメッセージは1時間に1回)"); await l.flush(st);
        }
        return;
      }
    } catch {}
    try { const r = await tick(env); console.log("tick", JSON.stringify(r)); }
    catch (e) { console.log("tick error", e.message); }
  },
};

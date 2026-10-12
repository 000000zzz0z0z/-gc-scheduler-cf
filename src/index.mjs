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
  if ("optimizeMode" in body) {
    if (!["even", "own", "market"].includes(body.optimizeMode)) throw new Error("出品モードが正しくありません。");
    s.optimizeMode = body.optimizeMode;
  }
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
      const [settings, secret, drafts, state, lastTick, net] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "drafts"), load(env, "state"), db(env).get("lastTick"), netStatus(db(env))]);
      const now = Date.now();
      const idx = nextDraftIndex(drafts, state.pointer);
      return json({ now, settings, session: { set: !!secret.phpsessid, updatedAt: secret.updatedAt || null }, drafts: drafts.map(draftSummary), nextDraftKey: idx >= 0 ? drafts[idx].key : null, slots: computeSlots(settings.schedule, settings.dailyLimit), today: state.days[dayKey(now)] || { count: 0, slots: {} }, alert: state.alert, lastTick, net });
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
      const r = await testConnection(secret.phpsessid);
      await adminLog(env, `接続テスト: ${r.ok ? "成功" : "失敗"} - ${r.message}`, { status: r.status });
      return json(r);
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

    // ===== 分析(②自分 / ③X全体) =====
    if (method === "GET" && sub[0] === "analysis") {
      const store = db(env);
      const { loadOwn, ownStats } = await import("./own.mjs");
      const { loadMarket, marketStats } = await import("./market.mjs");
      const { recommendFromOwn, recommendFromMarket, evenSlots, readiness } = await import("./optimize.mjs");
      const settings = await load(env, "settings");
      const now = Date.now();
      const own = ownStats(await loadOwn(store), now);
      const market = marketStats(await loadMarket(store), now);
      const ready = readiness(own, market);
      return json({
        now, mode: settings.optimizeMode, ready, own, market,
        recommend: {
          even: evenSlots(settings.dailyLimit),
          own: recommendFromOwn(own, { count: settings.dailyLimit, now }),
          market: recommendFromMarket(market, { count: settings.dailyLimit, now }),
        },
      });
    }

    // ===== 出品モードの切り替え(すぐにスケジュールを作り直す) =====
    if (method === "POST" && sub[0] === "mode") {
      const { createLogger } = await import("./log.mjs");
      const { rebuildSchedule } = await import("./core.mjs");
      const log = createLogger("manual");
      const s = mergeSettings(await load(env, "settings"), { optimizeMode: body.mode });
      await save(env, "settings", s);
      const label = { even: "①均等", own: "②自分データ", market: "③引退垢全体データ" }[s.optimizeMode];
      log.info("管理画面", `出品モードを「${label}」に変更しました`);
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

    // ===== 今すぐ確認(自分の売れ行き＋市場調査) =====
    if (method === "POST" && sub[0] === "scan") {
      const { createLogger } = await import("./log.mjs");
      const { createFetcher } = await import("./net.mjs");
      const store = db(env);
      const log = createLogger("manual");
      log.info("管理画面", "「今すぐ確認」が押されました");
      const fetcher = createFetcher(store, log);
      const out = {};
      try {
        const secret = await load(env, "secret");
        if (secret.phpsessid) {
          const { scanOwn } = await import("./own.mjs");
          await store.put("lastOwnScan", Date.now());
          out.own = await scanOwn(store, secret.phpsessid, fetcher, log);
        }
        if (body.market !== false) {
          const { pollMarket } = await import("./market.mjs");
          await store.put("lastMarketScan", Date.now());
          out.market = await pollMarket(store, fetcher, log, Date.now(), { verifyMax: 0 });
        }
      } finally { await fetcher.finish(); await log.flush(store); }
      return json({ ok: true, ...out });
    }

    return json({ error: "見つかりません。" }, 404);
  } catch (e) {
    return json({ error: e.message || String(e) }, 400);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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
    try { const r = await tick(env); console.log("tick", JSON.stringify(r)); }
    catch (e) { console.log("tick error", e.message); }
  },
};

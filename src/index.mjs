// Cloudflare Workers の入口。
// - fetch: 管理画面の表示と API
// - scheduled: 1分おきの自動出品(wrangler.toml の triggers.crons)
import { PAGE } from "./page.mjs";
import { load, save, publishNext, nextDraftIndex, tick, DEFAULT_SETTINGS } from "./core.mjs";
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
  if ("dailyLimit" in body) s.dailyLimit = clamp(body.dailyLimit, 1, 15, cur.dailyLimit);
  if ("graceMin" in body) s.graceMin = clamp(body.graceMin, 2, 90, cur.graceMin);
  if ("limitHours" in body) s.limitHours = clamp(body.limitHours, 0, 720, cur.limitHours);
  if (body.schedule) {
    const sc = body.schedule;
    if (sc.mode && !["interval", "manual"].includes(sc.mode)) throw new Error("スケジュールの方式が正しくありません。");
    if (sc.start && !isHM(sc.start)) throw new Error("開始時刻は 9:00 のような形式で入力してください。");
    if (sc.end && !isHM(sc.end)) throw new Error("終了時刻は 24:00 のような形式で入力してください。");
    if (sc.manual) { const bad = sc.manual.filter((t) => !isHM(t) || t === "24:00"); if (bad.length) throw new Error(`時刻の形式が正しくありません: ${bad.join(", ")}`); }
    s.schedule = { ...s.schedule, ...sc };
    if ("count" in sc) s.schedule.count = clamp(sc.count, 1, 15, cur.schedule.count);
  }
  if ("discordWebhook" in body) {
    const w = String(body.discordWebhook || "").trim();
    if (w && !/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(w)) throw new Error("通知先はDiscordのWebhook URLを入力してください。");
    s.discordWebhook = w;
  }
  if (body.autoSold) {
    s.autoSold = { enabled: !!body.autoSold.enabled, keywords: Array.isArray(body.autoSold.keywords) ? body.autoSold.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 10) : cur.autoSold.keywords };
  }
  return s;
}

const draftSummary = (d) => {
  const get = (n) => d.fields.find((f) => f.name === n)?.value;
  return { key: d.key, label: d.label, draftId: d.draftId, repeat: d.repeat, enabled: d.enabled, publishedCount: d.publishedCount || 0, lastPublishedAt: d.lastPublishedAt || null, price: get("price") || null, title: (get("name") || "").slice(0, 80) };
};

async function handleApi(request, env, path) {
  if (!env.ADMIN_PASSWORD) return json({ error: "ADMIN_PASSWORD が未設定です。CloudflareのSettings → Variables and Secrets で設定してください。" }, 500);
  if (!authorized(request, env)) return json({ error: "パスワードが違います。" }, 401);
  if (!env.GC_KV) return json({ error: "保存領域(KV)が未接続です。READMEの手順を確認してください。" }, 500);

  const method = request.method;
  const body = ["POST", "PATCH", "PUT"].includes(method) ? await request.json().catch(() => ({})) : {};
  const seg = path.split("/").filter(Boolean); // ["api", ...]
  const sub = seg.slice(1);

  try {
    if (method === "GET" && sub[0] === "state" && sub.length === 1) {
      const [settings, secret, drafts, state] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "drafts"), load(env, "state")]);
      const now = Date.now();
      const idx = nextDraftIndex(drafts, state.pointer);
      return json({ now, settings, session: { set: !!secret.phpsessid, updatedAt: secret.updatedAt || null }, drafts: drafts.map(draftSummary), nextDraftKey: idx >= 0 ? drafts[idx].key : null, slots: computeSlots(settings.schedule, settings.dailyLimit), today: state.days[dayKey(now)] || { count: 0, slots: {} }, alert: state.alert, lastTick: state.lastTick });
    }
    if (method === "GET" && sub[0] === "logs" && sub.length === 1) return json({ logs: await load(env, "logs") });

    if (method === "POST" && sub[0] === "settings") { const s = mergeSettings(await load(env, "settings"), body); await save(env, "settings", s); return json({ ok: true, settings: s }); }

    if (method === "POST" && sub[0] === "session") {
      const v = String(body.phpsessid || "").trim().replace(/^PHPSESSID=/i, "").replace(/;.*$/, "").trim();
      if (!/^[A-Za-z0-9,-]{10,128}$/.test(v)) throw new Error("PHPSESSIDの値の形式が正しくありません。値の部分だけを貼り付けてください。");
      await save(env, "secret", { phpsessid: v, updatedAt: Date.now() });
      const state = await load(env, "state");
      if (state.alert?.kind === "session") { state.alert = null; await save(env, "state", state); }
      return json({ ok: true });
    }
    if (method === "DELETE" && sub[0] === "session") { await save(env, "secret", {}); return json({ ok: true }); }

    if (method === "POST" && sub[0] === "test") {
      const secret = await load(env, "secret");
      if (!secret.phpsessid) throw new Error("先に設定タブでPHPSESSIDを登録してください。");
      return json(await testConnection(secret.phpsessid));
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
        const d = { key: uuid(), label: String(body.label || "").trim() || title.slice(0, 40) || `下書き${draftId}`, draftId, fields, repeat: body.repeat !== false, enabled: true, publishedCount: 0, createdAt: Date.now() };
        drafts.push(d);
        await save(env, "drafts", drafts);
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
        if ("repeat" in body) d.repeat = !!body.repeat;
        if ("draftId" in body) { if (!/^\d+$/.test(String(body.draftId))) throw new Error("下書き番号は数字で入力してください。"); d.draftId = String(body.draftId); }
        if (body.raw) d.fields = parseMultipart(body.raw);
        await save(env, "drafts", drafts);
        return json({ ok: true, draft: draftSummary(d) });
      }
      if (method === "DELETE") {
        const state = await load(env, "state");
        const i = drafts.indexOf(d);
        drafts.splice(i, 1);
        if (state.pointer > i) state.pointer--;
        if (state.pointer >= drafts.length) state.pointer = 0;
        await Promise.all([save(env, "drafts", drafts), save(env, "state", state)]);
        return json({ ok: true });
      }
    }

    if (sub[0] === "logs" && sub[1] && method === "PATCH") {
      const logs = await load(env, "logs");
      const l = logs.find((x) => x.id === sub[1]);
      if (!l) throw new Error("記録が見つかりません。");
      l.sold = !!body.sold; l.soldAt = l.sold ? Number(body.soldAt) || Date.now() : null; l.soldBy = l.sold ? "manual" : null;
      await save(env, "logs", logs);
      return json({ ok: true });
    }

    return json({ error: "見つかりません。" }, 404);
  } catch (e) {
    return json({ error: e.message || String(e) }, 400);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, url.pathname);
    if (url.pathname === "/health") return json({ ok: true, kvBound: !!env.GC_KV, passwordSet: !!env.ADMIN_PASSWORD });
    return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try { const r = await tick(env); console.log("tick", JSON.stringify(r)); }
      catch (e) { console.log("tick error", e.message); }
    })());
  },
};

// データ保存(Durable Object)と、自動出品の判断ロジック。
import { computeSlots, dayKey, minuteOfDay, publishDraft, jstParts } from "./gc.mjs";

export const DEFAULT_SETTINGS = {
  paused: true,
  dailyLimit: 15, // 固定(画面からは変更不可)
  graceMin: 100000, // 事実上無制限(予定を過ぎても出品する)
  minIntervalMin: 30, // ゲームクラブの「30分に1回」制限
  schedule: { mode: "interval", start: "00:00", end: "24:00", count: 15, manual: [] },
  autoOptimize: false, // 分析結果を毎日スケジュールに自動反映するか
};
const DEFAULT_STATE = { pointer: 0, days: {}, alert: null };

// 保存先(テスト時は env.__db で差し替え可能)
export function db(env) {
  if (env.__db) return env.__db;
  return env.GC_STORE.get(env.GC_STORE.idFromName("main"));
}

function newLogId(at) {
  return String(at).padStart(15, "0") + "-" + Math.random().toString(36).slice(2, 8);
}

export async function load(env, key) {
  const store = db(env);
  let v = await store.get(key);
  // 以前のKVからの引っ越し(初回のみ)
  if (v == null && env.GC_KV && ["settings", "secret", "drafts", "state"].includes(key)) {
    const old = await env.GC_KV.get(key, { type: "json" });
    if (old != null) { await store.put(key, old); v = old; }
  }
  if (key === "settings") return { ...DEFAULT_SETTINGS, ...(v || {}), schedule: { ...DEFAULT_SETTINGS.schedule, ...(v?.schedule || {}) } };
  if (key === "state") return { ...DEFAULT_STATE, ...(v || {}) };
  if (key === "drafts") return v || [];
  if (key === "secret") return v || {};
  return v;
}
export const save = (env, key, val) => db(env).put(key, val);

export async function loadLogs(env, limit = 3000) {
  const store = db(env);
  let logs = await store.listLogs(limit);
  if (!logs.length && env.GC_KV && !(await store.get("migrated:logs"))) {
    const old = (await env.GC_KV.get("logs", { type: "json" })) || [];
    for (const l of old.slice().reverse()) await store.addLog({ ...l, id: newLogId(l.at) });
    await store.put("migrated:logs", true);
    logs = await store.listLogs(limit);
  }
  return logs;
}


export function nextDraftIndex(drafts, pointer) {
  const n = drafts.length;
  for (let i = 0; i < n; i++) {
    const idx = (pointer + i) % n;
    if (drafts[idx].enabled) return idx;
  }
  return -1;
}

const STOP_KINDS = ["session", "blocked"];
// ゲームクラブに出品が作られていないと確実に言える失敗(ロックを戻してよい)
const SAFE_TO_RELEASE = ["session", "blocked", "invalid"];

export async function publishNext(env, { now = Date.now(), draftKey = null, slot = null, manual = false } = {}) {
  const store = db(env);
  const [settings, secret] = await Promise.all([load(env, "settings"), load(env, "secret")]);
  let drafts = await load(env, "drafts");
  let state = await load(env, "state");
  const dk = dayKey(now);

  const markSlot = (st, result) => {
    if (slot == null) return;
    const day = (st.days[dk] ||= { count: 0, slots: {} });
    const prev = day.slots[slot] || { attempts: 0 };
    const attempts = prev.attempts + 1;
    const giveUp = result.ok || attempts >= 2 || ["limit", "empty", "nosession", ...STOP_KINDS].includes(result.kind);
    day.slots[slot] = { status: result.ok ? "done" : giveUp ? "failed" : "retry", attempts, at: now, message: result.ok ? undefined : result.message };
  };
  const writeLog = (draft, result) =>
    store.addLog({ id: newLogId(now), at: now, draftKey: draft?.key || null, label: draft?.label || "(下書きなし)", ok: !!result.ok, kind: result.kind || null, message: result.ok ? null : result.message, listingId: result.listingId || null, url: result.url || null, manual, sold: false });

  const failEarly = async (result) => {
    markSlot(state, result);
    await save(env, "state", state);
    await writeLog(null, result);
    return result;
  };

  if (!secret.phpsessid) return failEarly({ ok: false, kind: "nosession", message: "ログイン情報(PHPSESSID)が未登録です。" });
  const day0 = state.days[dk] || { count: 0 };
  if (day0.count >= settings.dailyLimit) return failEarly({ ok: false, kind: "limit", message: `今日の上限(${settings.dailyLimit}回)に達しています。` });

  let idx = draftKey ? drafts.findIndex((d) => d.key === draftKey) : nextDraftIndex(drafts, state.pointer);
  if (idx < 0) return failEarly({ ok: false, kind: "empty", message: "出品できる下書きがありません。" });
  const draft = drafts[idx];

  // ここが二重出品防止の要。前回の出品(または出品中)から minIntervalMin 分たっていなければ送信しない
  const gap = (settings.minIntervalMin ?? 30) * 60e3;
  const lock = await store.claim(now, gap);
  if (!lock.ok) {
    const wait = Math.ceil(lock.waitMs / 60e3);
    // 予定枠からの呼び出しなら何も記録しない(すでに出品済みの枠を上書きしないため)
    return { ok: false, kind: "interval", message: `前回の出品から${settings.minIntervalMin ?? 30}分たっていません(あと約${wait}分)。`, label: draft.label };
  }

  const result = await publishDraft(draft, secret.phpsessid, { now });
  if (!result.ok && SAFE_TO_RELEASE.includes(result.kind)) await store.release(lock.prev);

  // 送信中に他の操作で変わっている可能性があるので、最新を読み直してから反映する
  drafts = await load(env, "drafts");
  state = await load(env, "state");
  const d = drafts.find((x) => x.key === draft.key);
  if (result.ok) {
    const day = (state.days[dk] ||= { count: 0, slots: {} });
    day.count++;
    if (d) {
      d.publishedCount = (d.publishedCount || 0) + 1;
      d.lastPublishedAt = now;
    }
    if (!draftKey) {
      const i = drafts.findIndex((x) => x.key === draft.key);
      state.pointer = drafts.length ? ((i >= 0 ? i : idx) + 1) % drafts.length : 0;
    }
    if (state.alert && STOP_KINDS.includes(state.alert.kind)) state.alert = null;
  } else if (STOP_KINDS.includes(result.kind)) {
    state.alert = { kind: result.kind, message: result.message, at: now };
  } else {
  }
  markSlot(state, result);
  const keys = Object.keys(state.days).sort();
  while (keys.length > 14) delete state.days[keys.shift()];
  await Promise.all([save(env, "state", state), save(env, "drafts", drafts), writeLog(draft, result)]);
  return { ...result, label: draft.label };
}

// 1分おきに呼ばれる
export async function tick(env, now = Date.now()) {
  const store = db(env);
  await store.put("lastTick", now); // 状態本体とは別に保存(上書き事故を防ぐ)
  const settings = await load(env, "settings");
  if (settings.paused) return { skipped: "paused" };

  const state = await load(env, "state");
  const slots = computeSlots(settings.schedule, settings.dailyLimit);
  const dk = dayKey(now);
  const m = minuteOfDay(now);
  const day = state.days[dk] || { count: 0, slots: {} };
  let due = null, changed = false;
  for (const s of slots) {
    if (s > m) break;
    const st = day.slots[s];
    if (st && st.status !== "retry") continue;
    if (m - s > settings.graceMin) {
      day.slots[s] = { status: "skipped", at: now, attempts: st?.attempts || 0, message: "予定時刻から時間が経ちすぎたため見送りました。" };
      changed = true;
      continue;
    }
    due = s;
    break;
  }
  if (changed) { state.days[dk] = day; await save(env, "state", state); }

  const out = { due };
  if (due != null) out.publish = await publishNext(env, { now, slot: due });

  // 10分おきに売れ行きをスキャン(別モジュール)
  try {
    const { scanSales } = await import("./analytics.mjs");
    if (now - (await db(env).get("lastSalesScan") || 0) > 10 * 60e3) {
      await db(env).put("lastSalesScan", now);
      out.scan = await scanSales(env, now);
    }
  } catch (e) { out.scanError = e.message; }

  // 自動最適化: 1日1回(JST 0:05頃)、分析結果をスケジュールに反映
  if (settings.autoOptimize) {
    const p = jstParts(now);
    const key = dayKey(now);
    if (p.h === 0 && p.mi < 10 && (await db(env).get("lastOptimize")) !== key) {
      await db(env).put("lastOptimize", key);
      try {
        const { loadData, analyze, recommendSlots, confidence } = await import("./analytics.mjs");
        const data = await loadData(env);
        const a = analyze(data, now);
        if (confidence(a).level !== "low") {
          const times = recommendSlots(a, { count: settings.dailyLimit });
          const st = await load(env, "settings");
          st.schedule = { ...st.schedule, mode: "manual", manual: times };
          await save(env, "settings", st);
          out.optimized = times.length;
        }
      } catch (e) { out.optimizeError = e.message; }
    }
  }
  return out;
}


// データ保存(Cloudflare KV)と、自動出品の判断ロジック。
// env.GC_KV が Cloudflare の保存領域です。
import { computeSlots, dayKey, minuteOfDay, publishDraft, checkSold } from "./gc.mjs";

export const DEFAULT_SETTINGS = {
  paused: true,
  dailyLimit: 15,
  graceMin: 20, // Cron が1分おきなので短くてよい
  limitHours: 24,
  schedule: { mode: "interval", start: "00:00", end: "24:00", count: 15, manual: [] },
  discordWebhook: "",
  autoSold: { enabled: false, keywords: ["SOLD OUT", "売り切れ", "取引中"] },
};
const DEFAULT_STATE = { pointer: 0, days: {}, alert: null, lastTick: null };
const MAX_LOGS = 3000;

function uuid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2)).slice(0, 8);
}

export async function load(env, key) {
  const v = await env.GC_KV.get(key, { type: "json" });
  if (key === "settings") return { ...DEFAULT_SETTINGS, ...(v || {}), schedule: { ...DEFAULT_SETTINGS.schedule, ...(v?.schedule || {}) }, autoSold: { ...DEFAULT_SETTINGS.autoSold, ...(v?.autoSold || {}) } };
  if (key === "state") return { ...DEFAULT_STATE, ...(v || {}) };
  if (key === "drafts" || key === "logs") return v || [];
  if (key === "secret") return v || {};
  return v;
}
export const save = (env, key, val) => env.GC_KV.put(key, JSON.stringify(val));

export async function notify(settings, content) {
  if (!settings.discordWebhook) return;
  try {
    await fetch(settings.discordWebhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: content.slice(0, 1900) }) });
  } catch {}
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

export async function publishNext(env, { now = Date.now(), draftKey = null, slot = null, manual = false } = {}) {
  const [settings, secret, drafts, state, logs] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "drafts"), load(env, "state"), load(env, "logs")]);
  const dk = dayKey(now);
  const day = (state.days[dk] ||= { count: 0, slots: {} });

  const finish = async (result, draft) => {
    if (slot != null) {
      const prev = day.slots[slot] || { attempts: 0 };
      const attempts = prev.attempts + 1;
      const giveUp = result.ok || attempts >= 2 || ["limit", "empty", "nosession", ...STOP_KINDS].includes(result.kind);
      day.slots[slot] = { status: result.ok ? "done" : giveUp ? "failed" : "retry", attempts, at: now, message: result.ok ? undefined : result.message };
    }
    if (draft || !result.ok) {
      logs.unshift({ id: uuid(), at: now, draftKey: draft?.key || null, label: draft?.label || "(下書きなし)", ok: !!result.ok, kind: result.kind || null, message: result.ok ? null : result.message, listingId: result.listingId || null, url: result.url || null, manual, sold: false });
      if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    }
    await Promise.all([save(env, "state", state), save(env, "drafts", drafts), save(env, "logs", logs)]);
    return { ...result, label: draft?.label };
  };

  if (!secret.phpsessid) return finish({ ok: false, kind: "nosession", message: "ログイン情報(PHPSESSID)が未登録です。" });
  if (day.count >= settings.dailyLimit) return finish({ ok: false, kind: "limit", message: `今日の上限(${settings.dailyLimit}回)に達しています。` });

  let idx;
  if (draftKey) idx = drafts.findIndex((d) => d.key === draftKey);
  else idx = nextDraftIndex(drafts, state.pointer);
  if (idx < 0) return finish({ ok: false, kind: "empty", message: "出品できる下書きがありません。" });
  const draft = drafts[idx];

  const result = await publishDraft(draft, secret.phpsessid, { limitHours: settings.limitHours, now });
  if (result.ok) {
    day.count++;
    draft.publishedCount = (draft.publishedCount || 0) + 1;
    draft.lastPublishedAt = now;
    if (!draft.repeat) draft.enabled = false;
    if (!draftKey) state.pointer = (idx + 1) % drafts.length;
    if (state.alert && STOP_KINDS.includes(state.alert.kind)) state.alert = null;
  } else if (STOP_KINDS.includes(result.kind)) {
    state.alert = { kind: result.kind, message: result.message, at: now };
    await notify(settings, `⚠️ ゲームクラブ自動出品: ${result.message}`);
  } else {
    await notify(settings, `⚠️ 出品に失敗しました(${draft.label}): ${result.message}`);
  }
  return finish(result, draft);
}

// 1分おきに呼ばれる
export async function tick(env, now = Date.now()) {
  const settings = await load(env, "settings");
  const state = await load(env, "state");
  state.lastTick = now;

  const keys = Object.keys(state.days).sort();
  while (keys.length > 14) delete state.days[keys.shift()];

  if (settings.paused) { await save(env, "state", state); return { skipped: "paused" }; }

  const slots = computeSlots(settings.schedule, settings.dailyLimit);
  const dk = dayKey(now);
  const m = minuteOfDay(now);
  const day = (state.days[dk] ||= { count: 0, slots: {} });
  let due = null;
  for (const s of slots) {
    if (s > m) break;
    const st = day.slots[s];
    if (st && st.status !== "retry") continue;
    if (m - s > settings.graceMin) {
      day.slots[s] = { status: "skipped", at: now, attempts: st?.attempts || 0, message: "予定時刻から時間が経ちすぎたため見送りました。" };
      continue;
    }
    due = s;
    break;
  }
  await save(env, "state", state);

  const out = { due };
  if (due != null) out.publish = await publishNext(env, { now, slot: due });
  if (settings.autoSold.enabled) out.soldChecks = await runSoldChecks(env, now, settings);
  return out;
}

async function runSoldChecks(env, now, settings) {
  const secret = await load(env, "secret");
  if (!secret.phpsessid) return 0;
  const logs = await load(env, "logs");
  const targets = logs.filter((l) => l.ok && l.url && !l.sold && now - l.at < 7 * 86400e3 && (!l.lastCheckedAt || now - l.lastCheckedAt > 3 * 3600e3)).slice(0, 4);
  for (const l of targets) {
    try {
      const sold = await checkSold(l.url, secret.phpsessid, settings.autoSold.keywords);
      l.lastCheckedAt = now;
      if (sold) { l.sold = true; l.soldAt = now; l.soldBy = "auto"; }
    } catch { l.lastCheckedAt = now; }
  }
  if (targets.length) await save(env, "logs", logs);
  return targets.length;
}

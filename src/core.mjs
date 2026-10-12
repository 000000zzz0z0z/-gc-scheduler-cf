// データ保存(Durable Object)と、自動出品の判断ロジック。
import { computeSlots, dayKey, minuteOfDay, publishDraft, jstParts } from "./gc.mjs";

export const DEFAULT_SETTINGS = {
  paused: true,
  dailyLimit: 15, // 固定(画面からは変更不可)
  graceMin: 100000, // 事実上無制限(予定を過ぎても出品する)
  minIntervalMin: 30, // ゲームクラブの「30分に1回」制限
  schedule: { mode: "interval", start: "00:00", end: "24:00", count: 15, manual: [] },
  // 出品モード: "even"=①均等 / "own"=②自分データ最適化 / "market"=③X全体データ最適化
  optimizeMode: "even",
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

export async function publishNext(env, { now = Date.now(), draftKey = null, slot = null, manual = false, log = null } = {}) {
  const store = db(env);
  let ownLog = log;
  if (!ownLog) { const { createLogger } = await import("./log.mjs"); ownLog = createLogger(manual ? "manual" : "auto"); }
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

  const { createFetcher } = await import("./net.mjs");
  const pubFetcher = createFetcher(store, ownLog, { gap: false }); // 出品は単発なので間隔待ち不要
  const result = await publishDraft(draft, secret.phpsessid, { now, fetcher: pubFetcher });
  await pubFetcher.finish();
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
    // 自分の売れ行き追跡に登録(モード②のデータ源)
    try {
      const { loadOwn, addOwnListing, saveOwn } = await import("./own.mjs");
      const own = await loadOwn(store);
      addOwnListing(own, result.listingId, now, draft.label);
      await saveOwn(store, own);
    } catch {}
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
  if (!log) await ownLog.flush(store);
  return { ...result, label: draft.label };
}

// 1分おきに呼ばれる
export async function tick(env, now = Date.now()) {
  const store = db(env);
  await store.put("lastTick", now);
  const { createLogger } = await import("./log.mjs");
  const { createFetcher } = await import("./net.mjs");
  const log = createLogger("auto");
  const settings = await load(env, "settings");

  if (settings.paused) { log.info("システム", "停止中のため何もしませんでした"); await log.flush(store); return { skipped: "paused" }; }

  const out = {};
  try {
    // --- 1) 予定枠の出品 ---
    const state = await load(env, "state");
    const slots = computeSlots(settings.schedule, settings.dailyLimit);
    const dk = dayKey(now);
    const mod = minuteOfDay(now);
    const day = state.days[dk] || { count: 0, slots: {} };
    let due = null, changed = false;
    for (const sl of slots) {
      if (sl > mod) break;
      const st = day.slots[sl];
      if (st && st.status !== "retry") continue;
      if (mod - sl > settings.graceMin) { day.slots[sl] = { status: "skipped", at: now, attempts: st?.attempts || 0, message: "予定時刻から時間が経ちすぎたため見送りました。" }; changed = true; continue; }
      due = sl; break;
    }
    if (changed) { state.days[dk] = day; await save(env, "state", state); }
    out.due = due;
    if (due != null) {
      log.info("出品", `予定時刻 ${Math.floor(due / 60)}:${String(due % 60).padStart(2, "0")} の出品を実行します`);
      out.publish = await publishNext(env, { now, slot: due, log });
    }

    // --- 2) 自分の売れ行き確認(10分おき) ---
    const secret = await load(env, "secret");
    const fetcher = createFetcher(store, log);
    try {
      if (secret.phpsessid && now - (await store.get("lastOwnScan") || 0) >= 10 * 60e3) {
        await store.put("lastOwnScan", now);
        const { scanOwn } = await import("./own.mjs");
        out.own = await scanOwn(store, secret.phpsessid, fetcher, log, now);
      }
      // --- 3) 市場調査(15分おき) ---
      if (now - (await store.get("lastMarketScan") || 0) >= 15 * 60e3) {
        await store.put("lastMarketScan", now);
        const { pollMarket } = await import("./market.mjs");
        out.market = await pollMarket(store, fetcher, log, now);
      }
    } finally {
      await fetcher.finish();
    }

    // --- 4) モードに応じたスケジュール再構築(1日1回・JST 0時台) ---
    const p = jstParts(now);
    if (settings.optimizeMode !== "even" && p.h === 0 && p.mi < 10 && (await store.get("lastOptimize")) !== dk) {
      await store.put("lastOptimize", dk);
      out.optimize = await rebuildSchedule(env, settings, log, now);
    }
    // 曜日別最適化のモードでは毎朝作り直す(今日の曜日に合わせるため)。上の0時枠で実施済み。
  } catch (e) {
    log.error("システム", "自動処理中にエラーが起きました", { error: String(e.message || e) });
    out.error = e.message;
  }
  await log.flush(store);
  // 1時間に1回、古い動作ログを整理(最新4000件を残す)
  try {
    if (now - ((await store.get("lastPrune")) || 0) > 3600e3) {
      await store.put("lastPrune", now);
      const n = await store.pruneOps(4000);
      if (n) { const l = (await import("./log.mjs")).createLogger("auto"); l.info("システム", `古い動作ログを${n}件整理しました`); await l.flush(store); }
    }
  } catch {}
  return out;
}

// モードに応じて schedule.manual を作り直す
export async function rebuildSchedule(env, settings, log, now = Date.now()) {
  const store = db(env);
  const { evenSlots, recommendFromOwn, recommendFromMarket, readiness } = await import("./optimize.mjs");
  let times, reason;
  if (settings.optimizeMode === "own") {
    const { loadOwn, ownStats } = await import("./own.mjs");
    const st = ownStats(await loadOwn(store), now);
    const r = readiness(st, { totalSales: 0, days: 0 }).own;
    if (r.level === "low") { log.info("最適化", `自分データが不足のため、均等出品のままにします(${r.note})`); times = evenSlots(settings.dailyLimit); reason = "own-low"; }
    else { times = recommendFromOwn(st, { count: settings.dailyLimit, now }); reason = "own"; log.info("最適化", `自分の売れ行きからスケジュールを更新しました(${r.note})`, { times }); }
  } else if (settings.optimizeMode === "market") {
    const { loadMarket, marketStats } = await import("./market.mjs");
    const ms = marketStats(await loadMarket(store), now);
    const r = readiness({ sold48: 0 }, ms).market;
    if (r.level === "low") { log.info("最適化", `市場データが不足のため、均等出品のままにします(${r.note})`); times = evenSlots(settings.dailyLimit); reason = "market-low"; }
    else { times = recommendFromMarket(ms, { count: settings.dailyLimit, now }); reason = "market"; log.info("最適化", `X全体の市場データからスケジュールを更新しました(${r.note})`, { times }); }
  } else {
    times = evenSlots(settings.dailyLimit); reason = "even";
  }
  const s = await load(env, "settings");
  s.schedule = { ...s.schedule, mode: "manual", manual: times };
  await save(env, "settings", s);
  return { times, reason };
}


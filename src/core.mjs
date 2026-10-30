// データ保存(Durable Object)と、自動更新の判断ロジック。
import { computeSlots, dayKey, minuteOfDay, jstParts } from "./gc.mjs";
import { DEFAULT_SITE } from "./sites.mjs";

// サイトごとの既定の設定。上限と間隔はサイトのルール(sites.mjs)から決まる
export function defaultSettings(site = DEFAULT_SITE) {
  return {
    paused: true,
    dailyLimit: site.dailyLimit, // 固定(画面からは変更不可)
    graceMin: 100000, // 事実上無制限(予定を過ぎても出品する)
    minIntervalMin: site.minIntervalMin, // 「前回から○分あける」制限
    schedule: { mode: "interval", start: "00:00", end: "24:00", count: site.dailyLimit, manual: [] },
    // 出品モードは「自分の売れ行きで最適化」だけ(データが少ないうちは均等に出品)
    optimizeMode: "own",
    // 更新の時刻の決め方: own=自分の売れ行きから毎日0時に作り直すスケジュール(データが少ないうちは24時間均等) / even=常に24時間均等
    timeMode: "own",
  };
}
export const siteOfEnv = (env) => env.__site || DEFAULT_SITE;
// 既定の状態は毎回新しく作る(共有のオブジェクトを返すと、書き換えが別のサイトに漏れるため)
const defaultState = () => ({ pointer: 0, days: {}, alert: null });

// 保存先(テスト時は env.__db で差し替え可能)
export function db(env) {
  const site = siteOfEnv(env);
  if (env.__dbs) return env.__dbs[site.id];
  if (env.__db) return env.__db;
  return env.GC_STORE.get(env.GC_STORE.idFromName(site.store));
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
  // 上限と間隔はサイトのルールなので、保存値に関係なく常に固定値を使う
  if (key === "settings") { const D = defaultSettings(siteOfEnv(env)); return { ...D, ...(v || {}), dailyLimit: D.dailyLimit, minIntervalMin: D.minIntervalMin, optimizeMode: "own", schedule: { ...D.schedule, ...(v?.schedule || {}) } }; }
  if (key === "state") return { ...defaultState(), ...(v || {}) };
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

// ===== 更新の予定枠 =====
// 均等: 0:00〜24:00 を1日の上限回数で均等に割る(ゲームクラブは15回=96分おき)
// 最適化: 自分の売れ行きから毎日0時に作り直すスケジュール(settings.schedule)を使う
export function boostSlots(settings) {
  const limit = settings.dailyLimit;
  if (settings.timeMode === "own") return computeSlots(settings.schedule, limit);
  return computeSlots({ mode: "interval", start: "00:00", end: "24:00", count: limit }, limit);
}
// 予定時刻を過ぎてもこの分数までは実行する。それより古い枠は見送る(まとめて連続で更新しないため)
export const boostGrace = (slots) => Math.max(30, Math.round(1440 / Math.max(1, slots.length)));

// 画面表示用: これからの予定時刻(最大 max 件)
export function planBoosts({ settings, state, now = Date.now(), max = 6 }) {
  const slots = boostSlots(settings);
  const out = [];
  const grace = boostGrace(slots);
  for (let d = 0; d < 3 && out.length < max; d++) {
    const t0 = now + d * 86400e3;
    const dk = dayKey(t0);
    const mod = d === 0 ? minuteOfDay(now) : -1;
    const day = (state.days || {})[dk] || {};
    const bs = day.bslots || {};
    for (const sl of slots) {
      if (out.length >= max) break;
      const st = bs[sl];
      if (st && st.status !== "retry") continue;
      if (d === 0 && sl < mod - grace) continue;
      // その日の0時(日本時間)+ sl分 の時刻
      const p = jstParts(t0);
      const at = Date.UTC(p.y, p.mo - 1, p.d, 0, 0) - 9 * 3600e3 + sl * 60e3;
      out.push({ at, slot: sl, late: d === 0 && sl <= mod });
    }
  }
  return out;
}

// 1分おきに呼ばれる。1回の処理で行う「重い仕事」(サイトへの複数回の通信)は1つだけにする。
// 優先順: 画面からの「今すぐ1回更新」 → 予定枠の更新 → 自分の売れ行き確認(10分おき)
const fmtHM = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const agoMin = (now, t) => (t ? Math.floor((now - t) / 60e3) + "分前" : "未実施");

export async function tick(env, now = Date.now()) {
  const T0 = Date.now();
  const store = db(env);
  const site = siteOfEnv(env);
  await store.put("lastTick", now);
  const { createLogger, errInfo } = await import("./log.mjs");
  const { createFetcher } = await import("./net.mjs");
  const { runBoost, RESERVE_TTL } = await import("./boost.mjs");
  const deps = { load, save, db, createFetcher, siteOfEnv };
  const log = createLogger("auto");
  await log.enableLive(store); // 画面を開いている人がいれば、ログを1行ずつ即座に流す
  const settings = await load(env, "settings");
  const p = jstParts(now);
  const nowLabel = `${p.mo}/${p.d} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
  const out = {};

  // --- 0) 画面から予約された「今すぐ1回更新」。スイッチがオフでも実行する(本番と同じこの経路で送る) ---
  try {
    const br = await store.get("boostReserve");
    if (br) {
      await store.put("boostReserve", null);
      let r;
      if (now - (br.at || 0) > RESERVE_TTL) {
        r = { ok: false, kind: "expired", message: "予約から10分たっても実行できなかったため、予約を取り消しました。" };
        log.warn("更新", "「今すぐ1回更新」の予約が10分たっても実行できなかったため、取り消しました");
      } else {
        log.info("定期実行", `${nowLabel} 判断: 画面から予約された「今すぐ1回更新」を実行します`);
        r = await runBoost(env, { now, log, manual: true, productId: br.productId || "", deps });
      }
      await store.put("boostResult", { at: now, reservedAt: br.at, ...r });
      out.manual = r;
      await log.flush(store);
      return out; // 重い仕事は1回の処理につき1つ
    }
  } catch (e) { log.error("システム", "「今すぐ1回更新」でエラーが起きました", errInfo(e)); await log.flush(store); }

  if (settings.paused) {
    if (now - ((await store.get("lastPausedLog")) || 0) > 3600e3) {
      await store.put("lastPausedLog", now);
      log.info("定期実行", `${nowLabel} ${site.name}の自動更新はオフです(売れ行き確認も止まっています)。このメッセージは1時間に1回だけ出ます`);
      await log.flush(store);
    }
    return { skipped: "paused" };
  }

  const step = async (name, label, fn) => {
    const t0 = Date.now();
    const fetcher = createFetcher(store, log, { site });
    log.debug("定期実行", `「${label}」を開始します`);
    try { out[name] = await fn(fetcher); }
    catch (e) { if (e?.constructor?.name !== "PausedError") log.error("システム", `「${label}」の処理中にエラーが起きました`, errInfo(e)); else log.warn("定期実行", `「${label}」は休止中・上限のため中断しました: ${e.message}`); out[name] = { error: e.message }; }
    finally {
      await fetcher.finish();
      log.debug("定期実行", `「${label}」を終了しました(所要${Date.now() - t0}ms・通信${fetcher.made()}回・今日の通信累計${fetcher.count()}回)`);
      await log.flush(store);
    }
  };

  try {
    const [state, secret, ts] = await Promise.all([
      load(env, "state"), load(env, "secret"),
      store.getMany(["lastOwnScan", "lock:last", "lastOptimize"]),
    ]);
    const slots = boostSlots(settings);
    const grace = boostGrace(slots);
    const dk = dayKey(now);
    const mod = minuteOfDay(now);
    const day = state.days[dk] || { count: 0, slots: {} };
    const bs = day.bslots || {};
    const gapMs = settings.minIntervalMin * 60e3;
    const lockLeft = Math.max(0, gapMs - (now - (ts["lock:last"] || 0)));
    const nextSlot = slots.find((sl) => sl > mod);

    log.debug("定期実行", `${nowLabel} の定期実行を開始(処理番号 ${log.trace})`, {
      今日の回数: `${day.count || 0}/${settings.dailyLimit}`,
      時刻の決め方: settings.timeMode === "own" ? "売れ行きで最適化" : "24時間で均等",
      次の予定枠: nextSlot != null ? fmtHM(nextSlot) : "今日はもうなし",
      [`${settings.minIntervalMin}分ルール`]: lockLeft ? `あと${Math.ceil(lockLeft / 60e3)}分は更新できない` : "更新できる",
      売れ行き確認: agoMin(now, ts.lastOwnScan), ログイン情報: secret.phpsessid ? "登録済み" : "未登録",
    });

    // --- 1) 予定枠の更新 ---
    let due = null, changed = false;
    for (const sl of slots) {
      if (sl > mod) break;
      const st = bs[sl];
      if (st && st.status !== "retry") continue;
      if (mod - sl > grace) { bs[sl] = { status: "skipped", at: now, attempts: st?.attempts || 0, message: "予定時刻から時間がたちすぎたため見送りました。" }; changed = true; continue; }
      if (state.alert) { bs[sl] = { status: "skipped", at: now, attempts: st?.attempts || 0, message: `警告が出ているため見送りました(${state.alert.message})` }; changed = true; log.warn("更新", `予定枠 ${fmtHM(sl)} は、警告が出ているため見送りました。警告の原因を直してから、画面の警告を消してください`); continue; }
      due = sl; break;
    }
    if (changed) { const st2 = await load(env, "state"); const d2 = (st2.days[dk] ||= { count: 0, slots: {} }); d2.bslots = { ...(d2.bslots || {}), ...bs }; await save(env, "state", st2); }

    let decision = "";
    if (due != null && lockLeft > 0) {
      out.deferred = due;
      decision = `予定枠 ${fmtHM(due)} の更新は、${settings.minIntervalMin}分ルールのため後回し(あと${Math.ceil(lockLeft / 60e3)}分)`;
      due = null;
    }

    if (due != null) {
      log.info("定期実行", `${nowLabel} 判断: 予定枠 ${fmtHM(due)} の更新を実行します`);
      out.boost = await runBoost(env, { now, log, slot: due, deps });
      await log.flush(store);
    } else {
      const ownDue = secret.phpsessid && now - (ts.lastOwnScan || 0) >= 10 * 60e3;
      if (ownDue) {
        log.info("定期実行", `${nowLabel} 判断: ${decision ? decision + " → " : ""}前回の売れ行き確認から10分以上たったので、自分の売れ行きを確認します`);
        await store.put("lastOwnScan", now);
        const { scanOwn } = await import("./own.mjs");
        await step("own", "自分の売れ行き確認", (f) => scanOwn(store, secret.phpsessid, f, log, now));
      } else {
        log.debug("定期実行", `${nowLabel} 判断: ${decision || "予定枠なし"}。売れ行き確認(${agoMin(now, ts.lastOwnScan)})はまだ間隔内なので、今回は待機します`);
      }
    }

    // --- 2) 自分の売れ行きからスケジュール再構築(1日1回・JST 0時台) ---
    if (p.h === 0 && p.mi < 10 && ts.lastOptimize !== dk) {
      await store.put("lastOptimize", dk);
      log.info("定期実行", `${nowLabel} 判断: 0時台なので、自分の売れ行きからスケジュールを作り直します${settings.timeMode === "own" ? "" : "(今は「24時間で均等」を使っているので、更新の時刻は変わりません)"}`);
      out.optimize = await rebuildSchedule(env, settings, log, now);
    }
  } catch (e) {
    log.error("システム", "自動処理中にエラーが起きました", errInfo(e));
    out.error = e.message;
  }
  log.debug("定期実行", `${nowLabel} の定期実行を終了(合計所要${Date.now() - T0}ms)`);
  await log.flush(store);
  // 1時間に1回、7日より古い動作ログを整理
  try {
    if (now - ((await store.get("lastPrune")) || 0) > 3600e3) {
      await store.put("lastPrune", now);
      const n = await store.pruneOps(7);
      const l = createLogger("auto", { trace: log.trace });
      l.debug("システム", n ? `7日より古い動作ログのまとまりを${n}件削除しました` : "古い動作ログの整理: 削除するものはありませんでした");
      await l.flush(store);
    }
  } catch {}
  return out;
}

// 自分の売れ行きから schedule.manual を作り直す(データ不足の間は均等)
export async function rebuildSchedule(env, settings, log, now = Date.now()) {
  const store = db(env);
  const { evenSlots, recommendFromOwn, readiness } = await import("./optimize.mjs");
  const { loadOwn, ownStats } = await import("./own.mjs");
  const st = ownStats(await loadOwn(store), now);
  const r = readiness(st);
  let times, reason;
  log.debug("最適化", `入力データ: 出品・更新${st.total}回(商品${st.products}件)・結果が出た${st.eligible}回・持ち時間(次の更新まで・最長48時間)の中で売れた${st.sold48}回・結果待ち${st.pending}回・集計${st.days}日目`, { 信頼度: r.level });
  if (r.level === "low") { log.info("最適化", `自分データが不足のため、24時間均等の時刻にします(${r.note})`); times = evenSlots(settings.dailyLimit); reason = "own-low"; }
  else { times = recommendFromOwn(st, { count: settings.dailyLimit, now }); reason = "own"; log.info("最適化", `自分の売れ行きからスケジュールを更新しました(${r.note})`, { times }); }
  const s = await load(env, "settings");
  const before = computeSlots(s.schedule, s.dailyLimit).map((m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
  s.schedule = { ...s.schedule, mode: "manual", manual: times };
  await save(env, "settings", s);
  const added = times.filter((t) => !before.includes(t)), removed = before.filter((t) => !times.includes(t));
  log.info("最適化", `スケジュールを保存しました(${times.length}枠): ${times.join(" ")}`, { 変更前: before.join(" "), 追加された時刻: added.join(" ") || "なし", 外された時刻: removed.join(" ") || "なし", 理由: reason });
  return { times, reason };
}

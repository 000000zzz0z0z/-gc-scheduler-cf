// データ保存(Durable Object)と、自動出品の判断ロジック。
import { computeSlots, dayKey, minuteOfDay, publishDraft, jstParts, prepareFields } from "./gc.mjs";

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
  if (idx < 0) { ownLog.warn("出品", `出品できる下書きがありません(登録${drafts.length}件・有効${drafts.filter((d) => d.enabled).length}件)`); return failEarly({ ok: false, kind: "empty", message: "出品できる下書きがありません。" }); }
  const draft = drafts[idx];
  ownLog.info("出品", `下書きを選択: 「${draft.label}」(#${draft.draftId}・これまで${draft.publishedCount || 0}回出品)`, {
    選び方: draftKey ? "指定された下書き" : `順番どおり(次の位置=${state.pointer + 1}番目から、有効な下書きを探して${idx + 1}番目)`,
    登録数: drafts.length, 有効数: drafts.filter((d) => d.enabled).length, 項目数: draft.fields.length,
    価格: (draft.fields.find((f) => f.name === "price") || {}).value,
  });

  // ここが二重出品防止の要。前回の出品(または出品中)から minIntervalMin 分たっていなければ送信しない
  const gap = (settings.minIntervalMin ?? 30) * 60e3;
  const lock = await store.claim(now, gap);
  ownLog.debug("出品", lock.ok ? `二重出品防止のロックを取得しました(前回の出品: ${lock.prev ? Math.floor((now - lock.prev) / 60e3) + "分前" : "記録なし"})` : `ロックを取得できませんでした(前回の出品から${settings.minIntervalMin ?? 30}分たっていない)`);
  if (!lock.ok) {
    const wait = Math.ceil(lock.waitMs / 60e3);
    // 予定枠からの呼び出しなら何も記録しない(すでに出品済みの枠を上書きしないため)
    return { ok: false, kind: "interval", message: `前回の出品から${settings.minIntervalMin ?? 30}分たっていません(あと約${wait}分)。`, label: draft.label };
  }

  const { createFetcher } = await import("./net.mjs");
  try {
    const pf = prepareFields(draft.fields, now);
    const ld = (pf.find((f) => f.name === "limit_day") || {}).value, lt = (pf.find((f) => f.name === "limit_time") || {}).value;
    ownLog.debug("出品", `送信データを作成: ${pf.length}項目・出品期限を ${ld} ${lt}時 に設定(約100年後=実質無期限)・画像は下書きに保存済みのものを使用`, { 画像: (pf.find((f) => f.name.startsWith("item_images")) || {}).value });
  } catch {}
  const pubFetcher = createFetcher(store, ownLog, { gap: false }); // 出品は単発なので間隔待ち不要
  const result = await publishDraft(draft, secret.phpsessid, { now, fetcher: pubFetcher });
  await pubFetcher.finish();
  if (result.ok) ownLog.info("出品", `出品に成功しました: 「${draft.label}」→ 出品番号 ${result.listingId}`, { listingId: result.listingId, url: result.url, status: result.status });
  else ownLog.error("出品", `出品に失敗しました: 「${draft.label}」${result.message}`, { kind: result.kind, status: result.status });
  if (!result.ok && SAFE_TO_RELEASE.includes(result.kind)) { await store.release(lock.prev); ownLog.debug("出品", "ゲームクラブに出品は作られていないため、ロックを戻しました(すぐ再挑戦できます)"); }
  else if (!result.ok) ownLog.debug("出品", "出品が作られた可能性を否定できないため、ロックは戻しません(30分後に再挑戦)");

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
      ownLog.debug("売れ行き", `出品番号 ${result.listingId} を売れ行きの追跡対象に追加しました(追跡中${Object.keys(own.records).length}件)`);
    } catch (e) { ownLog.warn("売れ行き", "売れ行きの追跡対象への追加に失敗しました", { error: String(e.message || e) }); }
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
  if (slot != null) { const sv = (state.days[dk] || { slots: {} }).slots[slot]; ownLog.debug("出品", `予定枠 ${Math.floor(slot / 60)}:${String(slot % 60).padStart(2, "0")} の状態を「${{ done: "出品済み", failed: "失敗(諦め)", retry: "再挑戦待ち" }[sv?.status] || sv?.status}」にしました(試行${sv?.attempts || 0}回目)`); }
  if (result.ok && !draftKey) ownLog.debug("出品", `次の出品は${state.pointer + 1}番目の下書きから探します`);
  const keys = Object.keys(state.days).sort();
  while (keys.length > 14) delete state.days[keys.shift()];
  await Promise.all([save(env, "state", state), save(env, "drafts", drafts), writeLog(draft, result)]);
  if (!log) await ownLog.flush(store);
  return { ...result, label: draft.label };
}

// 1分おきに呼ばれる。
// 1回の処理で行う「重い仕事」(ゲームクラブへの複数回の通信)は1つだけにする。
// 優先順: 予定枠の出品 → 自分の売れ行き確認(10分おき) → 市場調査の一覧(15分おき) → 消えた商品の確認(少しずつ)
// 各作業が終わるたびにログと通信回数を保存するので、万一途中で止まっても経過が残る。
const MODE_LABEL = { even: "①均等", own: "②自分データ", market: "③引退垢全体データ" };
const fmtHM = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const agoMin = (now, t) => (t ? Math.floor((now - t) / 60e3) + "分前" : "未実施");

export async function tick(env, now = Date.now()) {
  const T0 = Date.now();
  const store = db(env);
  await store.put("lastTick", now);
  const { createLogger, errInfo } = await import("./log.mjs");
  const { createFetcher } = await import("./net.mjs");
  const log = createLogger("auto");
  const live = await log.enableLive(store); // 画面を開いている人がいれば、ログを1行ずつ即座に流す
  const settings = await load(env, "settings");
  const p = jstParts(now);
  const nowLabel = `${p.mo}/${p.d} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;

  if (settings.paused) {
    if (now - ((await store.get("lastPausedLog")) || 0) > 3600e3) {
      await store.put("lastPausedLog", now);
      log.info("定期実行", `${nowLabel} 停止中です(出品・売れ行き確認・市場調査はすべて止まっています)。このメッセージは1時間に1回だけ出ます`);
      await log.flush(store);
    }
    return { skipped: "paused" };
  }

  const out = {};
  const step = async (name, label, fn) => {
    const t0 = Date.now();
    const fetcher = createFetcher(store, log);
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
      store.getMany ? store.getMany(["lastOwnScan", "lastMarketScan", "lock:last", "lastOptimize"]) : Promise.resolve({}),
    ]);
    const slots = computeSlots(settings.schedule, settings.dailyLimit);
    const dk = dayKey(now);
    const mod = minuteOfDay(now);
    const day = state.days[dk] || { count: 0, slots: {} };
    const gapMs = (settings.minIntervalMin ?? 30) * 60e3;
    const lockLeft = Math.max(0, gapMs - (now - (ts["lock:last"] || 0)));
    const nextSlot = slots.find((sl) => sl > mod);
    const pending = slots.filter((sl) => sl <= mod && (!day.slots[sl] || day.slots[sl].status === "retry"));

    // その時点の状態を記録(何が起きているかを後から追えるように)
    log.debug("定期実行", `${nowLabel} の定期実行を開始(処理番号 ${log.trace})`, {
      モード: MODE_LABEL[settings.optimizeMode || "even"], 今日の出品: `${day.count}/${settings.dailyLimit}`,
      次の予定枠: nextSlot != null ? fmtHM(nextSlot) : "今日はもうなし", 未処理の過去の枠: pending.map(fmtHM).join(" ") || "なし",
      "30分ルール": lockLeft ? `あと${Math.ceil(lockLeft / 60e3)}分は出品できない` : "出品できる",
      売れ行き確認: agoMin(now, ts.lastOwnScan), 市場調査: agoMin(now, ts.lastMarketScan), ログイン情報: secret.phpsessid ? "登録済み" : "未登録",
    });

    // --- 1) 予定枠の出品 ---
    let due = null, changed = false;
    for (const sl of slots) {
      if (sl > mod) break;
      const st = day.slots[sl];
      if (st && st.status !== "retry") continue;
      if (mod - sl > settings.graceMin) { day.slots[sl] = { status: "skipped", at: now, attempts: st?.attempts || 0, message: "予定時刻から時間が経ちすぎたため見送りました。" }; changed = true; log.warn("出品", `予定枠 ${fmtHM(sl)} は時間が経ちすぎたため見送りました`); continue; }
      due = sl; break;
    }
    if (changed) { state.days[dk] = day; await save(env, "state", state); }

    let decision = "";
    if (due != null && lockLeft > 0) {
      out.deferred = due;
      decision = `予定枠 ${fmtHM(due)} の出品は、30分ルールのため後回し(あと${Math.ceil(lockLeft / 60e3)}分)。この分は他の仕事をします`;
      due = null;
    }

    if (due != null) {
      log.info("定期実行", `${nowLabel} 判断: 予定枠 ${fmtHM(due)} の出品を実行します`);
      out.publish = await publishNext(env, { now, slot: due, log });
      await log.flush(store);
    } else {
      const ownDue = secret.phpsessid && now - (ts.lastOwnScan || 0) >= 10 * 60e3;
      const marketDue = now - (ts.lastMarketScan || 0) >= 15 * 60e3;
      if (ownDue) {
        log.info("定期実行", `${nowLabel} 判断: ${decision ? decision + " → " : ""}前回の売れ行き確認から10分以上たったので、自分の売れ行きを確認します`);
        await store.put("lastOwnScan", now);
        const { scanOwn } = await import("./own.mjs");
        await step("own", "自分の売れ行き確認", (f) => scanOwn(store, secret.phpsessid, f, log, now));
      } else if (marketDue) {
        log.info("定期実行", `${nowLabel} 判断: ${decision ? decision + " → " : ""}前回の市場調査から15分以上たったので、X一覧を調査します`);
        await store.put("lastMarketScan", now);
        const { pollMarket } = await import("./market.mjs");
        await step("market", "市場調査(X一覧4ページ)", (f) => pollMarket(store, f, log, now, { verifyMax: 0 }));
      } else {
        const { loadMarket, verifyMarket } = await import("./market.mjs");
        const m = await loadMarket(store);
        if (m.verify.length) {
          log.info("定期実行", `${nowLabel} 判断: ${decision ? decision + " → " : ""}一覧から消えた商品が${m.verify.length}件あるので、売れたか確認します(1分に最大2件)`);
          await step("verify", "消えた商品の確認", (f) => verifyMarket(store, f, log, 2, now));
        } else {
          log.debug("定期実行", `${nowLabel} 判断: ${decision || "予定枠なし"}。売れ行き確認(${agoMin(now, ts.lastOwnScan)})・市場調査(${agoMin(now, ts.lastMarketScan)})はまだ間隔内、確認待ちの商品もないので、今回は待機します`);
        }
      }
    }

    // --- 5) モードに応じたスケジュール再構築(1日1回・JST 0時台) ---
    if (settings.optimizeMode !== "even" && p.h === 0 && p.mi < 10 && ts.lastOptimize !== dk) {
      await store.put("lastOptimize", dk);
      log.info("定期実行", `${nowLabel} 判断: 0時台なので、${MODE_LABEL[settings.optimizeMode]}モードのスケジュールを作り直します`);
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

// モードに応じて schedule.manual を作り直す
export async function rebuildSchedule(env, settings, log, now = Date.now()) {
  const store = db(env);
  const { evenSlots, recommendFromOwn, recommendFromMarket, readiness } = await import("./optimize.mjs");
  let times, reason;
  if (settings.optimizeMode === "own") {
    const { loadOwn, ownStats } = await import("./own.mjs");
    const st = ownStats(await loadOwn(store), now);
    const r = readiness(st, { totalSales: 0, days: 0 }).own;
    log.debug("最適化", `②の入力データ: ツールの出品${st.total}件・結果が出た${st.eligible}件・48時間以内に売れた${st.sold48}件・結果待ち${st.pending}件・集計${st.days}日目`, { 信頼度: r.level });
    if (r.level === "low") { log.info("最適化", `自分データが不足のため、均等出品のままにします(${r.note})`); times = evenSlots(settings.dailyLimit); reason = "own-low"; }
    else { times = recommendFromOwn(st, { count: settings.dailyLimit, now }); reason = "own"; log.info("最適化", `自分の売れ行きからスケジュールを更新しました(${r.note})`, { times }); }
  } else if (settings.optimizeMode === "market") {
    const { loadMarket, marketStats } = await import("./market.mjs");
    const ms = marketStats(await loadMarket(store), now);
    const r = readiness({ sold48: 0 }, ms).market;
    log.debug("最適化", `③の入力データ: 観測${ms.days}日・${ms.obsHours.toFixed(1)}時間・売れた${ms.totalSales}件・ライバルの新着${ms.totalSupply}件`, { 信頼度: r.level });
    if (r.level === "low") { log.info("最適化", `市場データが不足のため、均等出品のままにします(${r.note})`); times = evenSlots(settings.dailyLimit); reason = "market-low"; }
    else { times = recommendFromMarket(ms, { count: settings.dailyLimit, now }); reason = "market"; log.info("最適化", `引退垢全体の市場データからスケジュールを更新しました(${r.note})`, { times }); }
  } else {
    times = evenSlots(settings.dailyLimit); reason = "even";
  }
  const s = await load(env, "settings");
  const before = computeSlots(s.schedule, s.dailyLimit).map((m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
  s.schedule = { ...s.schedule, mode: "manual", manual: times };
  await save(env, "settings", s);
  const added = times.filter((t) => !before.includes(t)), removed = before.filter((t) => !times.includes(t));
  log.info("最適化", `スケジュールを保存しました(${times.length}枠): ${times.join(" ")}`, { 変更前: before.join(" "), 追加された時刻: added.join(" ") || "なし", 外された時刻: removed.join(" ") || "なし", 理由: reason });
  return { times, reason };
}


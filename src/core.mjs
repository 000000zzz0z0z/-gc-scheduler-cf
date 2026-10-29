// データ保存(Durable Object)と、自動出品の判断ロジック。
import { computeSlots, dayKey, minuteOfDay, publishDraft, jstParts, prepareFields } from "./gc.mjs";
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


export function nextDraftIndex(drafts, pointer) {
  const n = drafts.length;
  for (let i = 0; i < n; i++) {
    const idx = (pointer + i) % n;
    if (drafts[idx].enabled) return idx;
  }
  return -1;
}

const STOP_KINDS = ["session", "blocked"];
// サイトに出品が作られていないと確実に言える失敗(ロックを戻してよい)
const SAFE_TO_RELEASE = ["session", "blocked", "invalid"];

export async function publishNext(env, { now = Date.now(), draftKey = null, slot = null, manual = false, log = null } = {}) {
  const store = db(env);
  const site = siteOfEnv(env);
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
  const gap = (settings.minIntervalMin) * 60e3;
  const lock = await store.claim(now, gap);
  ownLog.debug("出品", lock.ok ? `二重出品防止のロックを取得しました(前回の出品: ${lock.prev ? Math.floor((now - lock.prev) / 60e3) + "分前" : "記録なし"})` : `ロックを取得できませんでした(前回の出品から${settings.minIntervalMin}分たっていない)`);
  if (!lock.ok) {
    const wait = Math.ceil(lock.waitMs / 60e3);
    // 予定枠からの呼び出しなら何も記録しない(すでに出品済みの枠を上書きしないため)
    return { ok: false, kind: "interval", message: `前回の出品から${settings.minIntervalMin}分たっていません(あと約${wait}分)。`, label: draft.label };
  }

  const { createFetcher } = await import("./net.mjs");
  try {
    const pf = prepareFields(draft.fields, now);
    const ld = (pf.find((f) => f.name === "limit_day") || {}).value, lt = (pf.find((f) => f.name === "limit_time") || {}).value;
    ownLog.debug("出品", `送信データを作成: ${pf.length}項目・出品期限を ${ld} ${lt}時 に設定(約100年後=実質無期限)・画像は下書きに保存済みのものを使用`, { 画像: (pf.find((f) => f.name.startsWith("item_images")) || {}).value });
  } catch {}
  const pubFetcher = createFetcher(store, ownLog, { gap: false, site }); // 出品は単発なので間隔待ち不要
  const result = await publishDraft(draft, { phpsessid: secret.phpsessid, cf: secret.cf, ua: secret.ua, chua: secret.chua }, { now, fetcher: pubFetcher });
  await pubFetcher.finish();
  if (result.ok) ownLog.info("出品", `出品に成功しました: 「${draft.label}」→ 出品番号 ${result.listingId}(通信の出どころ ${result.colo || "不明"})`, { listingId: result.listingId, url: result.url, status: result.status, colo: result.colo });
  else ownLog.error("出品", `出品に失敗しました: 「${draft.label}」${result.message}`, { kind: result.kind, status: result.status, colo: result.colo });
  if (!result.ok && SAFE_TO_RELEASE.includes(result.kind)) { await store.release(lock.prev); ownLog.debug("出品", `${site.name}に出品は作られていないため、ロックを戻しました(すぐ再挑戦できます)`); }
  else if (!result.ok) ownLog.debug("出品", `出品が作られた可能性を否定できないため、ロックは戻しません(${settings.minIntervalMin}分後に再挑戦)`);

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
    // 自分の売れ行き追跡に登録(最適化のデータ源)
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
// 1回の処理で行う「重い仕事」(サイトへの複数回の通信)は1つだけにする。
// 優先順: 予定枠の出品 → 自分の売れ行き確認(10分おき)
// 他の人の出品(公開一覧・商品ページ)は確認しない。
// 各作業が終わるたびにログと通信回数を保存するので、万一途中で止まっても経過が残る。
const fmtHM = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
const agoMin = (now, t) => (t ? Math.floor((now - t) / 60e3) + "分前" : "未実施");

export async function tick(env, now = Date.now()) {
  const T0 = Date.now();
  const store = db(env);
  const site = siteOfEnv(env);
  await store.put("lastTick", now);
  const { createLogger, errInfo } = await import("./log.mjs");
  const { createFetcher } = await import("./net.mjs");
  const log = createLogger("auto");
  const live = await log.enableLive(store); // 画面を開いている人がいれば、ログを1行ずつ即座に流す
  const settings = await load(env, "settings");
  const p = jstParts(now);
  const nowLabel = `${p.mo}/${p.d} ${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;

  // 旧バージョン(①均等/③市場データ)からの切り替え: 一度だけスケジュールを作り直し、市場調査の保存データを消す
  try {
    const raw = await store.get("settings");
    if (raw && raw.optimizeMode !== "own") {
      log.info("システム", `出品モードを「自分の売れ行きで最適化」に統一しました(以前: ${raw.optimizeMode || "未設定"})。市場調査(他の人の出品の確認)は廃止しました`);
      await rebuildSchedule(env, settings, log, now);
      if (typeof store.del === "function") await store.del(["market", "lastMarketScan"]);
      await log.flush(store);
    }
  } catch (e) { log.warn("システム", "旧バージョンからの切り替えに失敗しました(次回また試します)", errInfo(e)); await log.flush(store); }

  // 原因究明の実験(画面で予約されたもの)。停止中・休止中でも、確認用に3回だけ通信する
  try {
    const dr = await store.get("diagReserve");
    if (dr) {
      await store.put("diagReserve", null);
      const { runDiag, diagLine } = await import("./diag.mjs");
      const secret = await load(env, "secret");
      const r = await runDiag(store, secret.phpsessid ? String(secret.phpsessid).trim() : "", "auto", site.origin);
      await store.put("diag:auto", r);
      log.info("システム", `原因究明の実験(自動実行): ${diagLine(r)}`, { cfRay: r.mypage.ray || r.top.ray, status: r.mypage.status ?? r.top.status });
      await log.flush(store);
    }
  } catch (e) { log.error("システム", "原因究明の実験(自動実行)でエラーが起きました", errInfo(e)); await log.flush(store); }

  if (settings.paused) {
    if (now - ((await store.get("lastPausedLog")) || 0) > 3600e3) {
      await store.put("lastPausedLog", now);
      log.info("定期実行", `${nowLabel} ${site.name}は停止中です(出品・売れ行き確認はすべて止まっています)。このメッセージは1時間に1回だけ出ます`);
      await log.flush(store);
    }
    return { skipped: "paused" };
  }

  const out = {};
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
      store.getMany ? store.getMany(["lastOwnScan", "lock:last", "lastOptimize", "forcePublish"]) : Promise.resolve({}),
    ]);
    const slots = computeSlots(settings.schedule, settings.dailyLimit);
    const dk = dayKey(now);
    const mod = minuteOfDay(now);
    const day = state.days[dk] || { count: 0, slots: {} };
    const gapMs = (settings.minIntervalMin) * 60e3;
    const lockLeft = Math.max(0, gapMs - (now - (ts["lock:last"] || 0)));
    const nextSlot = slots.find((sl) => sl > mod);
    const pending = slots.filter((sl) => sl <= mod && (!day.slots[sl] || day.slots[sl].status === "retry"));

    // その時点の状態を記録(何が起きているかを後から追えるように)
    log.debug("定期実行", `${nowLabel} の定期実行を開始(処理番号 ${log.trace})`, {
      今日の出品: `${day.count}/${settings.dailyLimit}`,
      次の予定枠: nextSlot != null ? fmtHM(nextSlot) : "今日はもうなし", 未処理の過去の枠: pending.map(fmtHM).join(" ") || "なし",
      [`${settings.minIntervalMin}分ルール`]: lockLeft ? `あと${Math.ceil(lockLeft / 60e3)}分は出品できない` : "出品できる",
      売れ行き確認: agoMin(now, ts.lastOwnScan), ログイン情報: secret.phpsessid ? "登録済み" : "未登録",
    });

    // --- 0) 画面から予約された「今すぐ自動出品」(本番と同じ経路で、この自動実行の中で出品する) ---
    const fp = ts.forcePublish;
    if (fp && now - (fp.at || 0) > 10 * 60e3) {
      await store.put("forcePublish", null);
      await store.put("forceResult", { at: now, reservedAt: fp.at, ok: false, message: "予約から10分たっても出品できる状態にならなかったため、予約を取り消しました。" });
      log.warn("出品", "「今すぐ自動出品」の予約が10分たっても実行できなかったため、取り消しました");
    } else if (fp && lockLeft === 0) {
      await store.put("forcePublish", null);
      log.info("定期実行", `${nowLabel} 判断: 画面から予約された「今すぐ自動出品」を実行します(予定枠とは別の1回)`);
      const r = await publishNext(env, { now, log });
      out.publish = r;
      await store.put("forceResult", { at: now, reservedAt: fp.at, ok: !!r.ok, listingId: r.listingId || null, colo: r.colo || null, message: r.ok ? null : r.message, label: r.label || null });
      await log.flush(store);
      log.debug("定期実行", `${nowLabel} の定期実行を終了(合計所要${Date.now() - T0}ms)`);
      await log.flush(store);
      return out;
    }

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
      decision = `予定枠 ${fmtHM(due)} の出品は、${settings.minIntervalMin}分ルールのため後回し(あと${Math.ceil(lockLeft / 60e3)}分)。この分は他の仕事をします`;
      due = null;
    }

    if (due != null) {
      log.info("定期実行", `${nowLabel} 判断: 予定枠 ${fmtHM(due)} の出品を実行します`);
      out.publish = await publishNext(env, { now, slot: due, log });
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
      log.info("定期実行", `${nowLabel} 判断: 0時台なので、自分の売れ行きからスケジュールを作り直します`);
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
  log.debug("最適化", `入力データ: ツールの出品${st.total}件・結果が出た${st.eligible}件・48時間以内に売れた${st.sold48}件・結果待ち${st.pending}件・集計${st.days}日目`, { 信頼度: r.level });
  if (r.level === "low") { log.info("最適化", `自分データが不足のため、均等出品のままにします(${r.note})`); times = evenSlots(settings.dailyLimit); reason = "own-low"; }
  else { times = recommendFromOwn(st, { count: settings.dailyLimit, now }); reason = "own"; log.info("最適化", `自分の売れ行きからスケジュールを更新しました(${r.note})`, { times }); }
  const s = await load(env, "settings");
  const before = computeSlots(s.schedule, s.dailyLimit).map((m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`);
  s.schedule = { ...s.schedule, mode: "manual", manual: times };
  await save(env, "settings", s);
  const added = times.filter((t) => !before.includes(t)), removed = before.filter((t) => !times.includes(t));
  log.info("最適化", `スケジュールを保存しました(${times.length}枠): ${times.join(" ")}`, { 変更前: before.join(" "), 追加された時刻: added.join(" ") || "なし", 外された時刻: removed.join(" ") || "なし", 理由: reason });
  return { times, reason };
}

// ===== 次の出品予定の計算(画面表示用) =====
// tick() と同じルール(予定枠の順番・最低間隔・1日の上限・0時の日付切り替え)で、
// 1分おきの自動実行を先までなぞり、「実際に出品される時刻」を予想する。
// 自動実行は毎分0秒すぎに動くので、ここでは「毎分5秒」に動くとみなして計算する。
export function planUpcoming({ settings, state, drafts, lockLast = 0, hasSession = true, now = Date.now(), max = 6, horizonMin = 3 * 1440 }) {
  const enabled = (drafts || []).filter((d) => d.enabled);
  if (settings.paused) return { blocked: "paused", message: "停止中のため、自動出品はしません。ホームのスイッチをオンにすると予定どおり出品します。", items: [], today: {} };
  if (!hasSession) return { blocked: "nosession", message: "ログイン情報(PHPSESSID)が未登録のため、出品できません。設定タブで登録してください。", items: [], today: {} };
  if (!enabled.length) return { blocked: "empty", message: "有効な下書きがないため、出品できません。下書きタブで登録・有効化してください。", items: [], today: {} };

  const slots = computeSlots(settings.schedule, settings.dailyLimit);
  if (!slots.length) return { blocked: "noslots", message: "予定の枠がありません。時間タブで予定を作成してください。", items: [], today: {} };
  const gap = (settings.minIntervalMin) * 60e3;
  const limit = settings.dailyLimit;
  const days = {}; // シミュレーション用の日ごとの状態(実データは変更しない)
  const dayOf = (dk) => (days[dk] ||= (() => { const d = state.days?.[dk] || { count: 0, slots: {} }; return { count: d.count || 0, slots: Object.fromEntries(Object.entries(d.slots || {}).map(([k, v]) => [k, v.status])) }; })());
  let lock = lockLast || 0, pointer = state.pointer || 0;
  const items = [], today = {};
  const todayKey = dayKey(now);
  const startMin = Math.floor(now / 60e3) + 1; // 次の自動実行(次の分)から
  for (let i = 0; i < horizonMin && items.length < max; i++) {
    const t = (startMin + i) * 60e3 + 5e3;
    const dk = dayKey(t), mod = minuteOfDay(t), day = dayOf(dk);
    let due = null;
    for (const sl of slots) {
      if (sl > mod) break;
      const st = day.slots[sl];
      if (st && st !== "retry") continue;
      if (mod - sl > settings.graceMin) { day.slots[sl] = "skipped"; continue; }
      due = sl; break;
    }
    if (due == null || t - lock < gap) continue;
    if (day.count >= limit) { day.slots[due] = "failed"; if (dk === todayKey) today[due] = { at: t, kind: "limit" }; continue; }
    // 出品する下書き(順番どおり)
    let idx = -1;
    for (let k = 0; k < drafts.length; k++) { const j = (pointer + k) % drafts.length; if (drafts[j].enabled) { idx = j; break; } }
    const d = drafts[idx];
    pointer = (idx + 1) % drafts.length;
    const slotAt = Date.parse(dk + "T00:00:00+09:00") + due * 60e3;
    const reasons = [];
    if (t - slotAt >= 2 * 60e3) reasons.push(`予定 ${fmtHM(due)} の枠のぶん(遅れを取り戻し中)`);
    else reasons.push(`予定 ${fmtHM(due)} の枠`);
    if (lock && lock + gap > slotAt + 60e3) reasons.push(`前回の出品(${fmtHM(minuteOfDay(lock))})から${settings.minIntervalMin}分あける必要があるため、この時刻になります`);
    items.push({ at: t - 5e3, slot: due, day: dk, late: t - slotAt >= 2 * 60e3, draft: d ? d.label : null, reason: reasons.join("。") });
    if (dk === todayKey) today[due] = { at: t - 5e3, kind: "plan" };
    day.slots[due] = "done"; day.count++; lock = t;
  }
  return { blocked: null, items, today, gapMin: settings.minIntervalMin, limit };
}

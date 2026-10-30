// Cloudflare Workers の入口。
// - fetch: 管理画面の表示と API
// - scheduled: 1分おきの自動出品(wrangler.toml の triggers.crons)
import { PAGE } from "./page.mjs";
import { load, save, loadLogs, db, publishNext, nextDraftIndex, tick, planUpcoming, siteOfEnv } from "./core.mjs";
export { GcStore } from "./store.mjs";
import { computeSlots, dayKey, parseMultipart, normalizeFields, testConnection, isHM } from "./gc.mjs";
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

const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d; };

function mergeSettings(cur, body, limit) {
  const s = JSON.parse(JSON.stringify(cur));
  if ("paused" in body) s.paused = !!body.paused;
  if (body.schedule) {
    const sc = body.schedule;
    if (sc.mode && !["interval", "manual"].includes(sc.mode)) throw new Error("スケジュールの方式が正しくありません。");
    if (sc.start && !isHM(sc.start)) throw new Error("開始時刻は 9:00 のような形式で入力してください。");
    if (sc.end && !isHM(sc.end)) throw new Error("終了時刻は 24:00 のような形式で入力してください。");
    if (sc.manual) { const bad = sc.manual.filter((t) => !isHM(t) || t === "24:00"); if (bad.length) throw new Error(`時刻の形式が正しくありません: ${bad.join(", ")}`); }
    s.schedule = { ...s.schedule, ...sc };
    if ("count" in sc) s.schedule.count = clamp(sc.count, 1, limit, cur.schedule.count);
  }
  return s;
}

const draftSummary = (d) => {
  const get = (n) => d.fields.find((f) => f.name === n)?.value;
  return { key: d.key, label: d.label, draftId: d.draftId, repeat: d.repeat, enabled: d.enabled, publishedCount: d.publishedCount || 0, lastPublishedAt: d.lastPublishedAt || null, price: get("price") || null, title: (get("name") || "").slice(0, 80), updatedAt: d.updatedAt || null, fieldCount: d.fields.length };
};

function who(request) {
  const cf = request.cf || {};
  const ua = request.headers.get("user-agent") || "";
  const dev = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "不明";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "不明";
  return { IP: request.headers.get("cf-connecting-ip") || "不明", 国: cf.country || "不明", 地域: cf.city || cf.region || undefined, 端末: dev, ブラウザ: br };
}
// 画面が数秒おきに自動で取りに来る通信は、記録すると大量になるので個別には残さない
const POLLING = new Set(["GET /api/ops", "GET /api/state", "GET /api/analysis", "GET /api/logs", "POST /api/hello", "GET /api/overview"]);
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
      const [settings, secret, drafts, state, lastTick, net, force] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "drafts"), load(env, "state"), db(env).get("lastTick"), netStatus(db(env)), db(env).getMany(["forcePublish", "forceResult", "ext:info", "lock:last", "migrated:from"])]);
      const now = Date.now();
      const idx = nextDraftIndex(drafts, state.pointer);
      // 次の出品予定(実際の自動実行と同じルールで計算)
      let plan;
      try { plan = planUpcoming({ settings, state, drafts, lockLast: force["lock:last"] || 0, hasSession: !!secret.phpsessid, now }); } catch (e) { plan = { blocked: "error", message: "予定の計算に失敗しました: " + e.message, items: [], today: {} }; }
      return json({ now, site: { id: site.id, name: site.name }, plan, lockLast: force["lock:last"] || 0, migratedFrom: force["migrated:from"] || null, settings, session: { set: !!secret.phpsessid, updatedAt: secret.updatedAt || null }, clearance: { set: !!secret.cf, ua: !!secret.ua, chua: secret.chua ? Object.keys(secret.chua).length : 0, extra: secret.extra ? Object.keys(secret.extra).length : 0, at: secret.cfAt || null }, drafts: drafts.map(draftSummary), nextDraftKey: idx >= 0 ? drafts[idx].key : null, slots: computeSlots(settings.schedule, settings.dailyLimit), today: state.days[dayKey(now)] || { count: 0, slots: {} }, alert: state.alert, lastTick, net, force: { pending: force.forcePublish || null, result: force.forceResult || null }, ext: force["ext:info"] || null });
    }
    if (method === "GET" && sub[0] === "logs" && sub.length === 1) return json({ logs: await loadLogs(env, 3000) });

    if (method === "POST" && sub[0] === "settings") {
      const s = mergeSettings(await load(env, "settings"), body, site.dailyLimit); await save(env, "settings", s);
      if ("paused" in body) await adminLog(env, body.paused ? `${site.name}の稼働を停止しました` : `${site.name}の稼働を開始しました`);
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

    // Cloudflareの通行証(cf_clearance)とブラウザの名乗り。出品が確認画面(403)で止められるときに使う。
    if (method === "POST" && sub[0] === "clearance") {
      const { cleanCf, parseHeaderLines } = await import("./gc.mjs");
      const prev = await load(env, "secret");
      const cf = cleanCf(body.cf || "");
      if (cf && cf.length < 20) throw new Error("通行証(cf_clearance)の値が短すぎます。Cookieの中の cf_clearance= の後ろを貼り付けてください。");
      const ua = String(body.ua || "").trim().replace(/[\r\n]/g, "").slice(0, 400);
      // sec-ch-ua 系は「ヘッダー名: 値」を1行ずつ貼れる。関係する行だけ拾う
      let chua = null;
      const raw = String(body.chua || "");
      if (raw.trim()) {
        chua = {};
        for (const line of raw.split(/\r?\n/)) {
          const m = line.match(/^\s*(sec-ch-ua[a-z-]*)\s*[:：]\s*(.+?)\s*$/i);
          if (m) chua[m[1].toLowerCase()] = m[2];
        }
        if (!Object.keys(chua).length) chua = null;
      }
      const extra = cf ? parseHeaderLines(body.extra || "") : null;
      await save(env, "secret", { ...prev, cf, ua, chua, extra, cfAt: cf ? Date.now() : null });
      await adminLog(env, cf ? "Cloudflareの通行証(cf_clearance)を登録しました" : "Cloudflareの通行証を削除しました", cf ? { ブラウザの名乗り: ua ? "あり" : "なし", "sec-ch-ua": chua ? Object.keys(chua).length + "項目" : "なし", 追加ヘッダー: extra ? Object.keys(extra).length + "項目" : "なし" } : undefined);
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
      const r = await testConnection({ phpsessid: secret.phpsessid, cf: secret.cf, ua: secret.ua, chua: secret.chua, extra: secret.extra }, { fetcher: viaRelay });
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
    // ===== 原因究明の実験 =====
    if (sub[0] === "diag") {
      const st = db(env);
      if (method === "POST" && sub[1] === "ui") {
        const { runDiag, diagLine } = await import("./diag.mjs");
        const secret = await load(env, "secret");
        const r = await runDiag(st, secret.phpsessid ? String(secret.phpsessid).trim() : "", "ui", site.origin);
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
    // ===== 更新ボタンのテスト(1回だけ) =====
    // 次の自動実行(1分以内)に予約し、本番と同じ経路で1回だけ送る。停止中(スイッチオフ)でも実行される。
    if (sub[0] === "boost") {
      const st = db(env);
      if (method === "POST" && sub[1] === "reserve") {
        const [settings, secret, state, g] = await Promise.all([load(env, "settings"), load(env, "secret"), load(env, "state"), st.getMany(["lock:last", "net:pauseUntil", "boostReserve"])]);
        const now = Date.now();
        const no = (m) => json({ ok: false, message: m });
        const productId = String(body.productId || "").trim();
        if (productId && !/^\d{1,12}$/.test(productId)) return no("商品番号は数字だけで入力してください(空欄なら自動で選びます)。");
        if (!secret.phpsessid) return no("ログイン情報(PHPSESSID)が未登録です。");
        const day = state.days[dayKey(now)] || { count: 0 };
        if ((day.count || 0) >= settings.dailyLimit) return no(`今日の上限(出品と更新を合わせて${settings.dailyLimit}回)に達しています。`);
        const left = settings.minIntervalMin * 60e3 - (now - (g["lock:last"] || 0));
        if (left > 0) return no(`前回の出品・更新から${settings.minIntervalMin}分たっていません(あと約${Math.ceil(left / 60e3)}分)。`);
        if ((g["net:pauseUntil"] || 0) > now) return no(`${site.name}への通信を休止中です(あと約${Math.ceil((g["net:pauseUntil"] - now) / 60e3)}分)。`);
        if (g.boostReserve) return no("すでに予約済みです。1分以内に実行されます。");
        await st.put("boostReserve", { at: now, productId });
        await adminLog(env, `${site.name}の「更新ボタンのテスト」を予約しました(${productId ? "商品 " + productId : "商品は自動で選ぶ"})`);
        return json({ ok: true, at: now });
      }
      if (method === "GET") {
        const g = await st.getMany(["boostReserve", "boostResult"]);
        return json({ pending: g.boostReserve || null, result: g.boostResult || null });
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
      const gap = settings.minIntervalMin * 60e3, left = gap - (now - (g["lock:last"] || 0));
      if (left > 0) return no(`前回の出品から${settings.minIntervalMin}分たっていません(あと約${Math.ceil(left / 60e3)}分)。`);
      if ((g["net:pauseUntil"] || 0) > now) return no(`${site.name}への通信を休止中です(あと約${Math.ceil((g["net:pauseUntil"] - now) / 60e3)}分)。設定タブの「通信の出どころテスト」で日本から通れると確認できれば、休止は解除されます。`);
      if (g.forcePublish) return no("すでに予約済みです。1分以内に出品されます。");
      await st.put("forcePublish", { at: now });
      await adminLog(env, `${site.name}の「今すぐ自動出品」を予約しました(次の自動実行で出品します)`);
      return json({ ok: true, at: now });
    }
    if (method === "POST" && sub[0] === "publish") return json(await publishNext(env, { draftKey: body.key || null, manual: true }));
    if (method === "POST" && sub[0] === "alert" && sub[1] === "clear") { const state = await load(env, "state"); state.alert = null; await save(env, "state", state); return json({ ok: true }); }

    if (sub[0] === "drafts") {
      const drafts = await load(env, "drafts");
      const cleanLabel = (v) => String(v || "").trim().slice(0, 60);
      // 追加: ①Payloadの貼り付け(raw) ②画面で入力した項目(fields。複製して編集したものなど)
      if (method === "POST" && sub.length === 1) {
        const draftId = String(body.draftId || "").trim();
        if (!/^\d+$/.test(draftId)) throw new Error("下書き番号は数字で入力してください(URLの draft= の後ろの数字です)。");
        let fields, how;
        if (Array.isArray(body.fields)) {
          const src = body.copyOf ? drafts.find((x) => x.key === body.copyOf) : null;
          fields = normalizeFields(body.fields, src ? src.fields : []);
          how = src ? `「${src.label}」を複製して編集` : "画面で入力";
        } else { fields = parseMultipart(body.raw); how = "Payloadの貼り付け"; }
        const title = fields.find((f) => f.name === "name")?.value || "";
        const now = Date.now();
        const d = { key: uuid(), label: cleanLabel(body.label) || title.slice(0, 40) || `下書き${draftId}`, draftId, fields, repeat: true, enabled: body.enabled === false ? false : true, publishedCount: 0, createdAt: now, updatedAt: now };
        drafts.push(d);
        await save(env, "drafts", drafts);
        await adminLog(env, `下書きを追加しました(${how}): #${draftId}「${d.label}」(${fields.length}項目)`, { 価格: fields.find((f) => f.name === "price")?.value });
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
      if (!d) throw new Error("下書きが見つかりません。別の画面で削除された可能性があります。");
      // 編集画面用: 全項目を返す
      if (method === "GET") return json({ ok: true, draft: { ...draftSummary(d), fields: d.fields } });
      if (method === "PATCH") {
        // 編集画面を開いた後に別の場所で変更されていたら、上書きせずに知らせる
        if (body.baseUpdatedAt !== undefined && (d.updatedAt || null) !== (body.baseUpdatedAt || null)) {
          return json({ error: "この下書きは、編集画面を開いた後に別の画面で変更されました。いったん閉じて開き直してください。", conflict: true }, 409);
        }
        const changed = [];
        if ("label" in body) { const v = cleanLabel(body.label); if (v && v !== d.label) { d.label = v; changed.push("管理名"); } }
        if ("enabled" in body) d.enabled = !!body.enabled;
        if ("draftId" in body) { if (!/^\d+$/.test(String(body.draftId))) throw new Error("下書き番号は数字で入力してください。"); if (String(body.draftId) !== d.draftId) { d.draftId = String(body.draftId); changed.push("下書き番号"); } }
        if (Array.isArray(body.fields)) {
          const before = new Map(d.fields.filter((f) => !f.file).map((f, i) => [f.name + "#" + i, f.value]));
          const next = normalizeFields(body.fields, d.fields);
          const after = new Map(next.filter((f) => !f.file).map((f, i) => [f.name + "#" + i, f.value]));
          for (const [k, v] of after) if (before.get(k) !== v) changed.push(k.split("#")[0]);
          if (before.size !== after.size) changed.push(`項目数 ${before.size}→${after.size}`);
          d.fields = next;
        }
        if (body.raw) { d.fields = parseMultipart(body.raw); changed.push("Payloadから全項目"); }
        if (changed.length || "enabled" in body) d.updatedAt = Date.now();
        await save(env, "drafts", drafts);
        if (changed.length) await adminLog(env, `下書きを編集しました: #${d.draftId}「${d.label}」`, { 変更した項目: [...new Set(changed)].join(", ") });
        return json({ ok: true, draft: draftSummary(d), changed: [...new Set(changed)] });
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

    // ===== 説明文の一括書き換え(ゲームクラブ・M&Aクラブの両方) =====
    // 選んだ下書きの「説明文(detail)」だけを、同じ文章に置き換える。商品名・価格・画像などは変えない。
    // 書き換える前の説明文はサイトごとに "bulk:undo" に1回分だけ取っておき、「元に戻す」で戻せる。
    if (sub[0] === "bulk-detail") {
      const { EDITABLE_LIMITS } = await import("./gc.mjs");
      const detailOf = (d) => d.fields.find((f) => f.name === "detail" && !f.file);
      if (method === "GET") {
        const out = {};
        let undo = null;
        for (const id of SITE_IDS) {
          const e = siteEnv(baseEnv, id);
          const [drafts, u] = await Promise.all([load(e, "drafts"), db(e).get("bulk:undo")]);
          out[id] = drafts.map((d) => ({ key: d.key, label: d.label, title: (d.fields.find((f) => f.name === "name") || {}).value || "", enabled: d.enabled, detail: detailOf(d) ? detailOf(d).value : null }));
          if (u && u.items && u.items.length) undo = { op: u.op, at: u.at, count: (undo && undo.op === u.op ? undo.count : 0) + u.items.length };
        }
        return json({ ok: true, sites: out, undo, max: EDITABLE_LIMITS.detail });
      }
      if (method === "POST" && sub.length === 1) {
        const text = String(body.text ?? "").replace(/\r\n?/g, "\n");
        if (!text.trim()) throw new Error("新しい説明文を入力してください。");
        if (text.length > EDITABLE_LIMITS.detail) throw new Error(`説明文が長すぎます(${text.length}文字・上限${EDITABLE_LIMITS.detail}文字)。`);
        const targets = body.targets && typeof body.targets === "object" ? body.targets : {};
        const total = SITE_IDS.reduce((n, id) => n + (Array.isArray(targets[id]) ? targets[id].length : 0), 0);
        if (!total) throw new Error("書き換える下書きを1つ以上選んでください。");
        const op = uuid(), now = Date.now(), result = {};
        for (const id of SITE_IDS) {
          const keys = new Set(Array.isArray(targets[id]) ? targets[id] : []);
          const e = siteEnv(baseEnv, id);
          if (!keys.size) { result[id] = { changed: 0, same: 0, missing: 0 }; continue; }
          const drafts = await load(e, "drafts");
          const items = [];
          let same = 0, missing = 0;
          for (const d of drafts) {
            if (!keys.has(d.key)) continue;
            const f = detailOf(d);
            if (!f) { missing++; continue; }
            if (f.value === text) { same++; continue; }
            items.push({ key: d.key, label: d.label, before: f.value });
            f.value = text;
            d.updatedAt = now;
          }
          // 書き換えたサイトは「元に戻す」の記録を今回の分に入れ替える。書き換えがなかったサイトは前の記録を消す(古い記録で戻さないため)
          await Promise.all([save(e, "drafts", drafts), db(e).put("bulk:undo", items.length ? { op, at: now, text, items } : null)]);
          if (items.length) await adminLog(e, `説明文を一括で書き換えました(${items.length}件)`, { 下書き: items.map((x) => x.label).join(", "), 新しい説明文の文字数: text.length, 同じ内容のため変更なし: same || undefined, 説明文の欄がない: missing || undefined });
          result[id] = { changed: items.length, same, missing };
        }
        // 選ばれていないサイトの古い「元に戻す」記録も消す(戻す対象を今回の1回分にそろえる)
        for (const id of SITE_IDS) if (!(Array.isArray(targets[id]) && targets[id].length)) await db(siteEnv(baseEnv, id)).put("bulk:undo", null);
        return json({ ok: true, op, result, changed: SITE_IDS.reduce((n, id) => n + result[id].changed, 0) });
      }
      if (method === "POST" && sub[1] === "undo") {
        const result = {};
        let restored = 0, skipped = 0;
        for (const id of SITE_IDS) {
          const e = siteEnv(baseEnv, id);
          const u = await db(e).get("bulk:undo");
          if (!u || !u.items || !u.items.length) { result[id] = { restored: 0, skipped: [] }; continue; }
          const drafts = await load(e, "drafts");
          const r = { restored: 0, skipped: [] };
          for (const it of u.items) {
            const d = drafts.find((x) => x.key === it.key);
            const f = d && detailOf(d);
            // 一括書き換えの後に、画面で個別に直した下書きは戻さない(その人の編集を消さないため)
            if (!f) { r.skipped.push(`${it.label}(削除済み)`); continue; }
            if (f.value !== u.text) { r.skipped.push(`${d.label}(あとから編集済み)`); continue; }
            f.value = it.before; d.updatedAt = Date.now(); r.restored++;
          }
          await Promise.all([save(e, "drafts", drafts), db(e).put("bulk:undo", null)]);
          await adminLog(e, `説明文の一括書き換えを元に戻しました(${r.restored}件)`, r.skipped.length ? { 戻さなかった下書き: r.skipped.join(", ") } : undefined);
          result[id] = r; restored += r.restored; skipped += r.skipped.length;
        }
        return json({ ok: true, restored, skipped, result });
      }
    }

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

    // ===== 旧M&Aクラブ版(mac-scheduler)からの引っ越し =====
    // wrangler.toml の OLD_MAC_STORE(旧ツールの保存領域)を読むだけ。旧ツール側は何も変えない。
    // 実際の読み書きは、M&Aクラブの保存領域の中で行う(store.mjs の migrateFromOldMac)
    if (sub[0] === "migrate-mac") {
      const mac = siteEnv(baseEnv, "mac");
      const dst = db(mac);
      if (method === "GET") {
        const [peek, done, cur] = await Promise.all([dst.peekOldMac().catch((e) => ({ bound: true, error: e.message })), dst.get("migrated:from"), load(mac, "drafts")]);
        return json({ ok: true, old: peek, done: done || null, currentDrafts: cur.length });
      }
      if (method === "POST") {
        const r = await dst.migrateFromOldMac({ force: !!body.force });
        if (r.needForce) return json({ ok: false, needForce: true, message: "すでに引っ越し済みです。もう一度行うと、今のM&Aクラブ側の下書き・設定・ログイン情報は、旧ツールの内容で上書きされます。" });
        if (!r.ok) throw new Error(r.message);
        await adminLog(mac, `旧M&Aクラブ版からデータを引っ越しました(下書き${r.drafts}件・出品記録${r.logs}件・動作ログ${r.ops}件)。二重出品を防ぐため、停止中にしてあります`);
        return json(r);
      }
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
      const fetcher = createFetcher(store, log, { site });
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

// Durable Object: 強い一貫性を持つ保存領域 + 出品ロック + 動作ログ。
// KV は反映に時間がかかり二重出品の原因になったため、こちらを使う。
import { DurableObject } from "cloudflare:workers";

// 旧M&Aクラブ版から引っ越すキー(下書き・設定・ログイン情報・売れ行きの記録・31分ルールのロックなど)
const MIGRATE_KEYS = ["settings", "secret", "drafts", "state", "own", "lock:last", "lastOwnScan", "lastOptimize"];

export class GcStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // 画面から30秒ごとに届く「ping」には自動で「pong」を返す(保存領域を起こさずに済む)
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong")); } catch {}
  }

  // ===== リアルタイム配信(WebSocket) =====
  // 画面とつなぎっぱなしの回線を受け付ける。休止(ハイバネーション)対応なので、
  // ログが流れていない間は保存領域が眠り、無料プランの処理時間を使わない。
  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("WebSocket only", { status: 426 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    try { pair[1].send(JSON.stringify({ t: "hello", viewers: this.ctx.getWebSockets().length })); } catch {}
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  async webSocketMessage(ws, msg) { /* ping以外は使わない */ }
  async webSocketClose(ws, code, reason) { try { ws.close(code, reason); } catch {} }
  async webSocketError(ws) { try { ws.close(1011, "error"); } catch {} }
  // 今つながっている画面の数(誰も見ていなければ、1行ずつの即時配信をしない)
  async viewers() { return this.ctx.getWebSockets().length; }

  // ===== ゲームクラブへの通信の中継 =====
  // ゲームクラブは日本以外からのアクセスを確認画面で止めるため、
  // 自動実行(世界中のどこかの拠点で動く)からは直接通信せず、
  // 場所が固定されている保存領域から通信する。
  // どの保存領域から出すか(net:relay)は「通信の出どころテスト」で日本にあると確かめたものを使う:
  //   "main"     = この保存領域(データ本体)
  //   "relay-jp" = 中継専用の保存領域(画面=東京から初めて作り、アジア寄りを指定)
  async relayFetch(url, init = {}) {
    const target = (await this.ctx.storage.get("net:relay")) || "main";
    if (target !== "main" && this.env && this.env.GC_STORE) {
      const ns = this.env.GC_STORE;
      return ns.get(ns.idFromName(target), { locationHint: "apac" }).relayHere(url, init);
    }
    return this.relayHere(url, init);
  }
  // この保存領域から実際に通信する
  async relayHere(url, init = {}) {
    const res = await fetch(url, init);
    const nullBody = [101, 204, 205, 304].includes(res.status);
    const body = nullBody ? null : await res.arrayBuffer();
    return { status: res.status, statusText: res.statusText, headers: [...res.headers], body };
  }
  // この保存領域が、どこのCloudflare拠点から通信しているか(IPアドレスは返さない)
  async whereAmI() {
    try {
      const r = await fetch("https://www.cloudflare.com/cdn-cgi/trace");
      const t = await r.text();
      const g = (k) => (t.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1] || "";
      return { colo: g("colo"), loc: g("loc") };
    } catch (e) { return { error: e.message }; }
  }
  broadcast(obj) {
    const socks = this.ctx.getWebSockets();
    if (!socks.length) return 0;
    const data = JSON.stringify(obj);
    for (const ws of socks) { try { ws.send(data); } catch {} }
    return socks.length;
  }
  // 保存せずに、つながっている画面へ即座に送るだけ(処理の途中経過を流すため)
  async liveOps(entries) { return this.broadcast({ t: "ops", ops: entries }); }

  async get(key) {
    const v = await this.ctx.storage.get(key);
    return v === undefined ? null : v;
  }
  async put(key, val) {
    await this.ctx.storage.put(key, val);
    if (key === "net:count" || key === "net:pauseUntil") this.pushNet();
  }
  async pushNet() {
    if (!this.ctx.getWebSockets().length) return;
    const now = Date.now();
    const jstDay = (t) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
    const got = await this.ctx.storage.get(["net:pauseUntil", "net:count"]);
    const pauseUntil = got.get("net:pauseUntil") || 0;
    let c = got.get("net:count") || { day: jstDay(now), n: 0 };
    if (c.day !== jstDay(now)) c = { day: jstDay(now), n: 0 };
    this.broadcast({ t: "net", net: { pauseUntil: pauseUntil > now ? pauseUntil : 0, today: c.n, cap: 2500 } });
  }
  async del(keys) {
    await this.ctx.storage.delete(Array.isArray(keys) ? keys : [keys]);
  }
  // 出品の権利を取る。前回から gapMs 経っていなければ断る(判定と記録は割り込まれない)
  async claim(now, gapMs) {
    const last = (await this.ctx.storage.get("lock:last")) || 0;
    if (now - last < gapMs) return { ok: false, waitMs: gapMs - (now - last) };
    await this.ctx.storage.put("lock:last", now);
    return { ok: true, prev: last };
  }
  async release(prev) {
    await this.ctx.storage.put("lock:last", prev || 0);
  }
  // 出品記録(従来)
  async addLog(entry) {
    await this.ctx.storage.put("log:" + entry.id, entry);
  }
  async listLogs(limit = 3000) {
    const m = await this.ctx.storage.list({ prefix: "log:", reverse: true, limit });
    return [...m.values()];
  }
  async patchLog(id, patch) {
    const k = "log:" + id;
    const v = await this.ctx.storage.get(k);
    if (!v) return null;
    Object.assign(v, patch);
    await this.ctx.storage.put(k, v);
    return v;
  }
  // ===== 動作ログ =====
  // 1回の処理のログを「1行」にまとめて保存する。キーは「まとまりの中で一番新しいログのID」
  // (こうすると「あるIDより新しいログ」を、キーの範囲だけで正しく取り出せる)
  async addOpsBatch(entries) {
    if (!entries || !entries.length) return;
    const newest = entries.reduce((a, e) => (e.id > a ? e.id : a), "");
    await this.ctx.storage.put("opb:" + newest, { e: entries });
    this.broadcast({ t: "ops", ops: entries });
  }
  // 旧形式(1件ずつ)。互換のため残す
  async addOps(entries) {
    if (!entries || !entries.length) return;
    await this.addOpsBatch(entries);
  }
  // after より新しいログを新しい順で返す(after なしなら最新から)
  async listOps(limit = 300, after = "") {
    const opt = { prefix: "opb:", reverse: true, limit: after ? 200 : 80 };
    if (after) opt.start = "opb:" + after + "\uffff";
    const m = await this.ctx.storage.list(opt);
    let all = [];
    for (const v of m.values()) all = all.concat(v.e || []);
    if (after) all = all.filter((e) => e.id > after);
    all.sort((a, b) => (a.id < b.id ? 1 : -1));
    return all.slice(0, limit);
  }
  // before より古いログ(「さらに古いログを読む」用)
  // まとまり(1回の処理のログ)の途中で切ると、次に読むときにその残りが飛ばされるので、
  // limit 件を超えても「まとまり単位」で丸ごと返す
  async listOpsBefore(limit = 500, before = "") {
    const opt = { prefix: "opb:", reverse: true, limit: 80 };
    if (before) opt.end = "opb:" + before;
    const m = await this.ctx.storage.list(opt);
    let all = [];
    for (const v of m.values()) { all = all.concat(v.e || []); if (all.length >= limit) break; }
    if (before) all = all.filter((e) => e.id < before);
    all.sort((a, b) => (a.id < b.id ? 1 : -1));
    return all;
  }
  // 画面のログ取得を1回の呼び出しで(呼び出し回数の節約)
  async opsWithNet(limit, after, now) {
    const ops = await this.listOps(limit, after);
    const jstDay = (t) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
    const got = await this.ctx.storage.get(["net:pauseUntil", "net:count"]);
    const pauseUntil = got.get("net:pauseUntil") || 0;
    let c = got.get("net:count") || { day: jstDay(now), n: 0 };
    if (c.day !== jstDay(now)) c = { day: jstDay(now), n: 0 };
    return { ops, net: { pauseUntil: pauseUntil > now ? pauseUntil : 0, today: c.n, cap: 2500 } };
  }
  // 古いログを消す: 保存期間(日)より古いまとまりを削除。旧形式(op:)も少しずつ削除
  async pruneOps(keepDays = 7) {
    const cutoff = String(Date.now() - keepDays * 86400e3).padStart(15, "0");
    const old = await this.ctx.storage.list({ prefix: "opb:", end: "opb:" + cutoff, limit: 500 });
    const legacy = await this.ctx.storage.list({ prefix: "op:", limit: 500 });
    const del = [...old.keys(), ...legacy.keys()];
    for (let i = 0; i < del.length; i += 120) await this.ctx.storage.delete(del.slice(i, i + 120));
    return del.length;
  }
  // ===== 旧M&Aクラブ版からの引っ越し(受け入れ側) =====
  // 呼び出し回数を節約するため、設定・出品記録・動作ログをまとめて1回で受け取って書き込む。
  //   kv:   { キー: 値 }(settings / drafts / own など)
  //   logs: 出品記録の配列(id 付き)
  //   ops:  動作ログの配列(id 付き。300件ずつのまとまりにして保存)
  async importBundle({ kv = {}, logs = [], ops = [] } = {}) {
    const entries = Object.entries(kv).filter(([, v]) => v !== null && v !== undefined);
    for (let i = 0; i < entries.length; i += 100) await this.ctx.storage.put(Object.fromEntries(entries.slice(i, i + 100)));
    const lg = logs.filter((l) => l && l.id).map((l) => ["log:" + l.id, l]);
    for (let i = 0; i < lg.length; i += 100) await this.ctx.storage.put(Object.fromEntries(lg.slice(i, i + 100)));
    const sorted = ops.filter((o) => o && o.id).sort((a, b) => (a.id < b.id ? -1 : 1));
    let batches = 0;
    for (let i = 0; i < sorted.length; i += 300) {
      const chunk = sorted.slice(i, i + 300);
      await this.ctx.storage.put("opb:" + chunk[chunk.length - 1].id, { e: chunk });
      batches++;
    }
    return { keys: entries.length, logs: lg.length, ops: sorted.length, batches };
  }

  // ===== 旧M&Aクラブ版からの引っ越し(読み取り側) =====
  // 旧ツール(mac-scheduler)の保存領域から、この保存領域が直接読み取る。
  // 重い処理を Worker ではなく保存領域の中で行うので、無料プランの処理時間の制限にかかりにくい。
  _oldMac() {
    const e = this.env || {};
    if (e.__oldMac) return e.__oldMac;
    return e.OLD_MAC_STORE ? e.OLD_MAC_STORE.get(e.OLD_MAC_STORE.idFromName("main")) : null;
  }
  async peekOldMac() {
    const old = this._oldMac();
    if (!old) return { bound: false };
    const g = await old.getMany(MIGRATE_KEYS);
    const drafts = Array.isArray(g.drafts) ? g.drafts : [];
    return {
      bound: true, drafts: drafts.length, draftLabels: drafts.slice(0, 10).map((d) => d.label),
      session: !!(g.secret && g.secret.phpsessid), own: g.own && g.own.records ? Object.keys(g.own.records).length : 0,
      paused: g.settings ? !!g.settings.paused : null, empty: !g.settings && !g.drafts,
    };
  }
  async migrateFromOldMac({ force = false } = {}) {
    const old = this._oldMac();
    if (!old) return { ok: false, message: "旧M&Aクラブ版の保存領域につながっていません(wrangler.toml の OLD_MAC_STORE)。" };
    const done = await this.ctx.storage.get("migrated:from");
    if (done && !force) return { ok: false, needForce: true, doneAt: done.at };
    const g = await old.getMany(MIGRATE_KEYS);
    if (!g.settings && !g.drafts) return { ok: false, message: "旧M&Aクラブ版にデータが見つかりませんでした。" };
    const kv = {};
    for (const k of MIGRATE_KEYS) if (g[k] != null) kv[k] = g[k];
    // 引っ越し直後は必ず「停止中」にする(旧ツールと二重に出品しないため)
    kv.settings = { ...(g.settings || {}), paused: true };
    const logs = await old.listLogs(3000).catch(() => []);
    let ops = [];
    if (!done) {
      // 動作ログ(7日分)も持ってくる。多すぎるときは新しい方から6000件まで(2回目以降は重複するので持ってこない)
      // 旧ツールの読み取りは「まとまり」の途中で切れることがあるので、件数の上限を大きくして丸ごと受け取る
      let before = "";
      for (let i = 0; i < 40 && ops.length < 6000; i++) {
        const page = await old.listOpsBefore(1e9, before).catch(() => []);
        if (!page.length) break;
        ops = ops.concat(page);
        before = page[page.length - 1].id;
      }
      ops = ops.slice(0, 6000);
    }
    const r = await this.importBundle({ kv, logs, ops });
    const info = { at: Date.now(), drafts: Array.isArray(g.drafts) ? g.drafts.length : 0, logs: r.logs, ops: r.ops, session: !!(g.secret && g.secret.phpsessid) };
    await this.ctx.storage.put("migrated:from", info);
    return { ok: true, ...info };
  }

  // 複数のキーを1回で読む(呼び出し回数の節約)
  async getMany(keys) {
    const m = await this.ctx.storage.get(keys);
    const o = {};
    for (const k of keys) { const v = m.get(k); o[k] = v === undefined ? null : v; }
    return o;
  }
}

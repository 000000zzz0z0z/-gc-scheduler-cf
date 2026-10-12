// Durable Object: 強い一貫性を持つ保存領域 + 出品ロック + 動作ログ。
// KV は反映に時間がかかり二重出品の原因になったため、こちらを使う。
import { DurableObject } from "cloudflare:workers";

export class GcStore extends DurableObject {
  async get(key) {
    const v = await this.ctx.storage.get(key);
    return v === undefined ? null : v;
  }
  async put(key, val) {
    await this.ctx.storage.put(key, val);
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
  async listOpsBefore(limit = 500, before = "") {
    const opt = { prefix: "opb:", reverse: true, limit: 80 };
    if (before) opt.end = "opb:" + before;
    const m = await this.ctx.storage.list(opt);
    let all = [];
    for (const v of m.values()) all = all.concat(v.e || []);
    if (before) all = all.filter((e) => e.id < before);
    all.sort((a, b) => (a.id < b.id ? 1 : -1));
    return all.slice(0, limit);
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
  // 複数のキーを1回で読む(呼び出し回数の節約)
  async getMany(keys) {
    const m = await this.ctx.storage.get(keys);
    const o = {};
    for (const k of keys) { const v = m.get(k); o[k] = v === undefined ? null : v; }
    return o;
  }
}

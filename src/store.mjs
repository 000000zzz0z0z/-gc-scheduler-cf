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
  // 動作ログ(新規)。まとめて書き込む
  async addOps(entries) {
    if (!entries || !entries.length) return;
    const obj = {};
    for (const e of entries) obj["op:" + e.id] = e;
    // put は一度に128件まで
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i += 120) {
      const part = {};
      for (const k of keys.slice(i, i + 120)) part[k] = obj[k];
      await this.ctx.storage.put(part);
    }
  }
  // after より新しいログを新しい順で返す
  async listOps(limit = 300, after = "") {
    const opt = { prefix: "op:", reverse: true, limit };
    if (after) opt.start = "op:" + after + "\uffff";
    const m = await this.ctx.storage.list(opt);
    return [...m.values()];
  }
  // 古いログを消して keep 件だけ残す
  async pruneOps(keep = 4000) {
    const m = await this.ctx.storage.list({ prefix: "op:", reverse: true, limit: keep + 1000 });
    const ks = [...m.keys()];
    if (ks.length <= keep) return 0;
    const del = ks.slice(keep);
    for (let i = 0; i < del.length; i += 120) await this.ctx.storage.delete(del.slice(i, i + 120));
    return del.length;
  }
}

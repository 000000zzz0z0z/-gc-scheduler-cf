// Durable Object: 強い一貫性を持つ保存領域 + 出品ロック。
// KV は書き込みが他の場所へ反映されるまで最大60秒ほどかかるため、
// 1分おきの自動実行と組み合わせると「出品済み」の記録が見えずに二重出品が起きていました。
// Durable Object は常に最新の値を返し、処理も1つずつ順番に実行されます。
import { DurableObject } from "cloudflare:workers";

export class GcStore extends DurableObject {
  async get(key) {
    const v = await this.ctx.storage.get(key);
    return v === undefined ? null : v;
  }
  async put(key, val) {
    await this.ctx.storage.put(key, val);
  }
  // 出品の権利を取る。前回から gapMs 経っていなければ断る(この判定と記録は途中で割り込まれない)
  async claim(now, gapMs) {
    const last = (await this.ctx.storage.get("lock:last")) || 0;
    if (now - last < gapMs) return { ok: false, waitMs: gapMs - (now - last) };
    await this.ctx.storage.put("lock:last", now);
    return { ok: true, prev: last };
  }
  async release(prev) {
    await this.ctx.storage.put("lock:last", prev || 0);
  }
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
}

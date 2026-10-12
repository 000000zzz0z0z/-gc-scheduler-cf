// 動作ログ。1回の処理の中でためておき、最後にまとめて保存する。
// cat(種類): 出品 / 売れ行き / 市場調査 / 最適化 / 通信 / システム / 管理画面
let seq = 0;
function newId(t) {
  seq = (seq + 1) % 1000;
  return String(t).padStart(15, "0") + "-" + String(seq).padStart(3, "0") + Math.random().toString(36).slice(2, 5);
}

export function createLogger(source = "auto") {
  const buf = [];
  const add = (lvl, cat, msg, d) => {
    const t = Date.now();
    const e = { id: newId(t), t, lvl, cat, msg, src: source };
    if (d && Object.keys(d).length) e.d = d;
    buf.push(e);
    if (buf.length > 400) buf.shift();
    return e;
  };
  return {
    info: (cat, msg, d) => add("info", cat, msg, d),
    warn: (cat, msg, d) => add("warn", cat, msg, d),
    error: (cat, msg, d) => add("error", cat, msg, d),
    entries: () => buf,
    async flush(store) {
      if (!buf.length) return;
      const out = buf.splice(0, buf.length);
      try { await store.addOps(out); } catch {}
    },
  };
}

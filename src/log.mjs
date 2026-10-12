// 動作ログ。ツールのすべての動きを記録する。
// 無料プランの書き込み回数(1日10万回)を守るため、1回の処理で出たログを
// 「1つのまとまり」として1回で保存する(何十件出しても書き込みは1回)。
//
// lvl(重要度): debug=詳細 / info=通常 / warn=警告 / error=エラー
// cat(種類): 定期実行 / 出品 / 売れ行き / 市場調査 / 最適化 / 通信 / 管理画面 / アクセス / システム
let seq = 0;
function newId(t) {
  seq = (seq + 1) % 1000;
  // 固定長(22文字)。辞書順=時刻順になる
  return String(t).padStart(15, "0") + "-" + String(seq).padStart(3, "0") + Math.random().toString(36).slice(2, 5).padEnd(3, "0");
}
const shortTrace = () => Math.random().toString(36).slice(2, 7);

export function createLogger(source = "auto", { trace = shortTrace() } = {}) {
  const buf = [];
  let n = 0;
  const add = (lvl, cat, msg, d) => {
    const t = Date.now();
    const e = { id: newId(t), t, lvl, cat, msg, src: source, tk: trace, n: ++n };
    if (d && typeof d === "object" && Object.keys(d).length) e.d = d;
    buf.push(e);
    if (buf.length > 1500) buf.shift();
    return e;
  };
  return {
    trace,
    debug: (cat, msg, d) => add("debug", cat, msg, d),
    info: (cat, msg, d) => add("info", cat, msg, d),
    warn: (cat, msg, d) => add("warn", cat, msg, d),
    error: (cat, msg, d) => add("error", cat, msg, d),
    count: () => buf.length,
    entries: () => buf,
    // ためたログをまとめて1回で保存
    async flush(store) {
      if (!buf.length) return 0;
      const out = buf.splice(0, buf.length);
      try { await store.addOpsBatch(out); } catch (e) { try { await store.addOps(out); } catch {} }
      return out.length;
    },
  };
}

// エラーの詳細(スタックの先頭数行)をログ用にまとめる
export function errInfo(e) {
  if (!e) return {};
  return { error: String(e.message || e), kind: e.constructor?.name, stack: String(e.stack || "").split("\n").slice(1, 4).map((x) => x.trim()).join(" | ") };
}

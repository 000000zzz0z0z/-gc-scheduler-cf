"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const KEY = "gc_admin_key";
let state = null, logs = null, tab = "home", pw = sessionStorage.getItem(KEY) || "";

function hm2str(m) { return `${Math.floor(m / 60)}:${pad(m % 60)}`; }
// ===== 時刻はすべて「サーバー(インターネット)の時計」×「日本時間」で扱う =====
// 端末の時計がずれていても影響しないよう、サーバーの現在時刻との差を記録して補正します。
let clockOffset = 0;
const nowMs = () => Date.now() + clockOffset;
const J = (ms) => { const d = new Date(ms + 9 * 3600e3); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay() }; };
function fmtTime(ms) { const d = J(ms); return `${pad(d.h)}:${pad(d.mi)}`; }
function fmtDate(ms) { const d = J(ms), n = J(nowMs()); const t = `${pad(d.h)}:${pad(d.mi)}`; if (d.y === n.y && d.mo === n.mo && d.d === n.d) return `今日 ${t}`; return `${d.mo}/${d.d} ${t}`; }
function ago(ms) { const s = (nowMs() - ms) / 1000; if (s < 90) return "さっき"; if (s < 3600) return `${Math.floor(s / 60)}分前`; if (s < 86400) return `${Math.floor(s / 3600)}時間前`; return `${Math.floor(s / 86400)}日前`; }

let toastT;
function toast(msg, bad) {
  const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
  if(window.Snd){ bad?Snd.fail():Snd.success(); } clearTimeout(toastT); toastT = setTimeout(() => (t.className = "toast"), 2600);
}

async function api(path, opts = {}) {
  const res = await fetch("/api" + path, { ...opts, headers: { "Content-Type": "application/json", "x-admin-key": encodeURIComponent(pw), ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { sessionStorage.removeItem(KEY); location.reload(); throw new Error("auth"); }
  if (!res.ok) throw new Error(data.error || `エラー(${res.status})`);
  return data;
}

// ---- ログイン ----
$("#loginBtn").onclick = tryLogin;
$("#pw").addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });
async function tryLogin() {
  pw = $("#pw").value.trim();
  if (!pw) return;
  $("#loginMsg").textContent = "確認中…";
  try {
    const d = await fetch("/api/state", { headers: { "x-admin-key": encodeURIComponent(pw) } });
    if (d.status === 401) { $("#loginMsg").textContent = "パスワードが違います。"; return; }
    if (!d.ok) { $("#loginMsg").textContent = (await d.json()).error || "エラー"; return; }
    sessionStorage.setItem(KEY, pw); window.Snd&&Snd.boot(); fetch("/api/hello", { method: "POST", headers: { "x-admin-key": encodeURIComponent(pw) } }).catch(() => {}); start();
  } catch { $("#loginMsg").textContent = "接続できませんでした。"; }
}
$("#logout").onclick = () => { sessionStorage.removeItem(KEY); location.reload(); };

// 全体のタイピング音・ホバー音・クリック時のオーディオ有効化
document.addEventListener("keydown",(e)=>{ if((e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA") && e.key.length===1 || e.key==="Backspace") window.Snd&&Snd.key(); },true);
document.addEventListener("pointerdown",()=>{ window.Snd&&Snd.resume(); },{once:false});

function start() {
  $("#login").classList.add("hide");
  $("#app").classList.remove("hide");
  $$(".tabs button").forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
  refresh();
  setInterval(() => { if (!document.hidden) refresh(true); }, 30000);
  document.addEventListener("click",(e)=>{ const b=e.target.closest("button"); if(b && !b.disabled && window.Snd) Snd.click(); },true);
}
function switchTab(t) {
  window.Snd&&Snd.tabSwitch();
  if (t !== "logs") stopOps();
  tab = t;
  $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  $$(".tab").forEach((el) => el.classList.add("hide"));
  $("#tab-" + t).classList.remove("hide");
  if ((t === "analysis" || t === "schedule") && !analysisData) loadAnalysis().then(render).catch(() => {});
  render();
}

async function refresh(quiet) {
  try {
    const t0 = Date.now();
    state = await api("/state");
    clockOffset = state.now - Math.round((t0 + Date.now()) / 2); // 通信にかかった時間の半分を補正
    if (tab === "home") { if (!logs || !quiet) logs = (await api("/logs")).logs; }
    if ((tab === "analysis" || tab === "schedule") && !quiet) await loadAnalysis();
    render();
  } catch (e) { if (!quiet) toast(e.message, true); }
}
async function loadLogs() { logs = (await api("/logs")).logs; }

function render() {
  if (!state) return;
  const s = state.settings;
  $("#statusLine").innerHTML = (s.paused
    ? `<span class="dot pause"></span>停止中`
    : `<span class="dot run"></span>稼働中 ・ 今日 ${state.today.count}/${s.dailyLimit} 回`) + ` ・ <span id="clock" title="インターネット(サーバー)の時刻・日本時間"></span>`;
  tickClock();
  renderBanners();
  if (tab === "home") renderHome();
  if (tab === "drafts") renderDrafts();
  if (tab === "schedule") renderSchedule();
  if (tab === "analysis") renderAnalysis();
  if (tab === "logs" && !$("#ops_list")) renderLogs();
  if (tab === "settings") renderSettings();
}

function tickClock() {
  const el = document.getElementById("clock"); if (!el) return;
  const d = J(nowMs());
  el.textContent = `${d.mo}/${d.d} ${pad(d.h)}:${pad(d.mi)}:${pad(d.s)} JST`;
}
setInterval(tickClock, 1000);

function renderBanners() {
  const b = $("#banners"); b.innerHTML = "";
  const a = state.alert;
  if (a) {
    const cls = a.kind === "session" ? "warn" : "bad";
    b.innerHTML += `<div class="banner ${cls}"><div><b>${a.kind === "session" ? "ログイン状態が切れました" : "アクセスが拒否されました"}</b><br>${esc(a.message)}<br><span class="muted">${fmtDate(a.at)}</span></div><button class="btn gho sm x" onclick="clearAlert()">×</button></div>`;
  }
  if (!state.session.set) {
    b.innerHTML += `<div class="banner info">はじめに「設定」タブで、ゲームクラブのログイン情報(PHPSESSID)を登録してください。</div>`;
  }
  const t = state.lastTick;
  if (t && nowMs() - t > 20 * 60000 && !state.settings.paused) {
    b.innerHTML += `<div class="banner warn">自動実行が${ago(t)}から動いていないようです。Netlifyの Functions → tick のログを確認してください。</div>`;
  }
}
window.clearAlert = async () => { await api("/alert/clear", { method: "POST" }); refresh(); };

// ---- ホーム ----
function renderHome() {
  const s = state.settings, now = state.now;
  const curMin = J(nowMs()).h * 60 + J(nowMs()).mi;
  const slotHtml = state.slots.map((m) => {
    const st = state.today.slots[m];
    const cls = st?.status === "done" ? "done" : (st?.status === "failed" || st?.status === "skipped") ? "failed" : "";
    const isNext = !st && m > curMin && state.slots.filter((x) => !state.today.slots[x] && x > curMin)[0] === m;
    const mark = st?.status === "done" ? "✓ " : (st?.status === "failed" || st?.status === "skipped") ? "✕ " : "";
    const tip = st?.message ? esc(st.message) : (st?.status === "done" ? "出品済み" : "");
    return `<span class="slot ${cls} ${isNext ? "now" : ""}" title="${tip}">${mark}${hm2str(m)}</span>`;
  }).join("");
  const legend = `<div class="legend"><span><i class="lg done"></i>出品済み</span><span><i class="lg failed"></i>出品されなかった</span><span><i class="lg now"></i>次の予定</span><span><i class="lg none"></i>これから</span></div>`;
  const nextDraft = state.drafts.find((d) => d.key === state.nextDraftKey);
  const recent = (logs || []).slice(0, 6);
  $("#tab-home").innerHTML = `
    <div class="card">
      <h2>稼働状態</h2>
      <label class="switch" style="margin-bottom:14px">
        <input type="checkbox" id="pauseToggle" ${!s.paused ? "checked" : ""}>
        <span class="track"></span>
        <span>${s.paused ? "停止中 — 自動出品はされません" : "稼働中 — 予定時刻に自動出品します"}</span>
      </label>
      <dl class="dl">
        <dt>出品モード</dt><dd>自分の売れ行きで最適化</dd>
        <dt>今日の出品</dt><dd>${state.today.count} / ${s.dailyLimit} 回</dd>
        <dt>次に出す下書き</dt><dd>${nextDraft ? esc(nextDraft.label) : "<span class='muted'>なし</span>"}</dd>
        <dt>ログイン状態</dt><dd>${state.session.set ? "<span class='pill ok'>登録済み</span>" : "<span class='pill off'>未登録</span>"}</dd>
      </dl>
    </div>
    <div class="card">
      <h2>今日の予定 <span class="q">${state.slots.length}枠</span></h2>
      <div class="slots">${slotHtml || "<span class='muted'>時間設定タブで予定を作成してください。</span>"}</div>
      ${state.slots.length ? legend : ""}
    </div>

    <div class="card">
      <h2>最近の記録</h2>
      <div id="homeLogs">${recent.length ? recent.map(logRow).join("") : "<div class='center'>まだ記録がありません</div>"}</div>
    </div>`;
  $("#pauseToggle").onchange = async (e) => {
    try { await api("/settings", { method: "POST", body: JSON.stringify({ paused: !e.target.checked }) }); window.Snd&&(e.target.checked?Snd.toggleOn():Snd.toggleOff()); toast(e.target.checked ? "稼働を開始しました" : "停止しました"); refresh(); }
    catch (err) { toast(err.message, true); e.target.checked = !e.target.checked; }
  };

}

function logRow(l) {
  return `<div class="log"><span class="ico ${l.ok ? "ok" : "ng"}"></span><span class="t">${fmtDate(l.at)}</span><span class="m">${esc(l.label)}${l.manual ? " <span class='pill'>手動</span>" : ""}${l.sold ? " <span class='pill ok'>売れた</span>" : ""}${l.ok ? "" : `<br><span class="muted">${esc(l.message || "")}</span>`}</span></div>`;
}

// ---- 下書き ----
function renderDrafts() {
  const list = state.drafts.map((d) => {
    const cls = "draft" + (d.enabled ? "" : " dis") + (d.key === state.nextDraftKey ? " next" : "");
    return `<div class="${cls}" data-key="${d.key}" draggable="false">
      <div class="top">
        <span class="grip" data-grip>⠿</span>
        <span class="nm">${esc(d.label)}</span>
        ${d.enabled ? "" : '<span class="pill off">無効</span>'}
      </div>
      <div class="meta">下書き #${d.draftId}${d.price ? ` ・ ${Number(d.price).toLocaleString()}円` : ""} ・ 出品${d.publishedCount}回${d.lastPublishedAt ? ` ・ 最終 ${fmtDate(d.lastPublishedAt)}` : ""}${d.key === state.nextDraftKey ? " ・ <b style='color:var(--green)'>次はこれ</b>" : ""}</div>
      <div class="acts">
        <button class="btn sm" data-act="toggle">${d.enabled ? "無効化" : "有効化"}</button>
        <button class="btn sm" data-act="first">次に出す</button>
        <button class="btn sm gho" data-act="del">削除</button>
      </div>
    </div>`;
  }).join("");
  $("#tab-drafts").innerHTML = `
    <div class="card">
      <h2>下書き一覧 <span class="q">上から順に出品されます</span></h2>
      ${state.drafts.length ? `<div id="draftList">${list}</div>` : "<div class='center'>まだ下書きが登録されていません。<br>下に貼り付けて追加してください。</div>"}
    </div>
    <div class="card">
      <h2>下書きを追加</h2>
      ${addFormHtml()}
    </div>`;
  bindAddForm();
  bindDraftActs();
  bindDrag();
}

function addFormHtml() {
  return `
    <div class="field"><label>表示名(自分用のメモ。空欄なら商品名が入ります)</label><input type="text" id="d_label" placeholder="例: 10年代アカウント A"></div>
    <div class="field"><label>下書き番号</label><input type="text" id="d_id" inputmode="numeric" placeholder="213159"></div>
    <div class="field"><label>出品データ(Payloadの「View source」の内容を丸ごと貼り付け)</label>
      <textarea id="d_raw" rows="5" placeholder="------WebKitFormBoundary...... で始まる内容"></textarea></div>
    <button class="btn p" id="d_add">追加する</button>
    <details class="help"><summary>データの取り方</summary><div>
      <ol>
        <li>ゲームクラブで対象の下書きを一度出品する(開発者ツールのNetworkを記録しながら)</li>
        <li>名前が <code>add?draft=番号</code> の通信をクリック</li>
        <li>「Payload」タブ → 上の「View source」ボタンを押す</li>
        <li>表示された内容を全部コピーして、上の欄に貼り付け</li>
      </ol>
      番号は、その通信のURL <code>draft=</code> の後ろの数字です。画像は下書きに保存済みのものが使われるので、貼り直し不要です。
    </div></details>`;
}
function bindAddForm() {
  const btn = $("#d_add"); if (!btn) return;
  btn.onclick = async () => {
    const draftId = $("#d_id").value.trim(), raw = $("#d_raw").value.trim();
    if (!draftId || !raw) return toast("下書き番号とデータを入力してください", true);
    btn.disabled = true; btn.textContent = "追加中…";
    try {
      const r = await api("/drafts", { method: "POST", body: JSON.stringify({ draftId, raw, label: $("#d_label").value}) });
      toast(`追加しました(${r.fieldCount}項目を読み取り)`); refresh();
    } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = "追加する"; }
  };
}
function bindDraftActs() {
  $$("#draftList [data-act]").forEach((btn) => {
    btn.onclick = async () => {
      const key = btn.closest("[data-key]").dataset.key;
      const d = state.drafts.find((x) => x.key === key);
      const act = btn.dataset.act;
      try {
        if (act === "toggle") await api("/drafts/" + key, { method: "PATCH", body: JSON.stringify({ enabled: !d.enabled }) });
        else if (act === "first") { await api(`/drafts/${key}/next`, { method: "POST", body: "{}" }); toast("次に出品します"); }
        else if (act === "del") { if (!confirm(`「${d.label}」を削除しますか?`)) return; await api("/drafts/" + key, { method: "DELETE" }); }
        refresh();
      } catch (e) { toast(e.message, true); }
    };
  });
}
function bindDrag() {
  const list = $("#draftList"); if (!list) return;
  let dragging = null;
  $$("[data-grip]", list).forEach((g) => {
    const card = g.closest("[data-key]");
    const down = (e) => {
      e.preventDefault(); dragging = card; card.style.opacity = ".5";
      const move = (ev) => {
        const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
        const after = [...list.querySelectorAll("[data-key]:not([style*='0.5'])")].find((el) => y < el.getBoundingClientRect().top + el.offsetHeight / 2);
        if (after) list.insertBefore(dragging, after); else list.appendChild(dragging);
      };
      const up = async () => {
        document.removeEventListener("mousemove", move); document.removeEventListener("touchmove", move);
        document.removeEventListener("mouseup", up); document.removeEventListener("touchend", up);
        dragging.style.opacity = ""; dragging = null;
        const keys = $$("[data-key]", list).map((el) => el.dataset.key);
        try { await api("/drafts/order", { method: "POST", body: JSON.stringify({ keys }) }); toast("順番を保存しました"); refresh(); } catch (e) { toast(e.message, true); }
      };
      document.addEventListener("mousemove", move); document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("mouseup", up); document.addEventListener("touchend", up);
    };
    g.addEventListener("mousedown", down); g.addEventListener("touchstart", down, { passive: false });
  });
}

// ---- 時間(自分の売れ行きで最適化) ----
let analysisData = null;
async function loadAnalysis() { analysisData = await api("/analysis"); }

function renderSchedule() {
  if (!analysisData) { $("#tab-schedule").innerHTML = "<div class='card'><div class='center'>読み込み中…</div></div>"; loadAnalysis().then(render).catch((e) => toast(e.message, true)); return; }
  const r = analysisData.ready;
  const lv = { low: "データ不足", mid: "参考程度", high: "十分" };
  $("#tab-schedule").innerHTML = `
    <div class="card">
      <h2>出品モード</h2>
      <div class="mode on">
        <div class="mode-top"><span class="mode-name">自分の売れ行きで最適化</span><span class="pill ok">使用中</span></div>
        <div class="muted" style="margin:6px 0 8px">このツールが出品した商品の売れ行きを記録し、売れやすい時間帯に寄せます。データが少ないうちは24時間に均等に出品します(約96分おき)。最適化後も一部の枠は未知の時間帯に回し続け、見落としを防ぎます。他の人の出品は確認しません。</div>
        <div class="mode-ready ${r.level}">データ: ${lv[r.level]} ・ ${esc(r.note)}</div>
      </div>
    </div>
    <div class="card">
      <h2>現在のスケジュール <span class="q">${state.slots.length}枠</span></h2>
      <div class="slots">${state.slots.map((m) => `<span class="slot">${hm2str(m)}</span>`).join("")}</div>
      <div class="muted" style="margin-top:10px">毎日0時に、自分の売れ行きデータから作り直します。データが足りない間は均等スケジュールになります。</div>
      <button class="btn" id="sc_rebuild" style="margin-top:12px">今すぐ作り直す</button>
    </div>`;
  $("#sc_rebuild").onclick = async () => {
    try { const r = await api("/rebuild", { method: "POST", body: "{}" }); toast(r.reason === "own-low" ? `作り直しました(${r.times.length}枠・データ不足のため均等)` : `作り直しました(${r.times.length}枠)`); analysisData = null; refresh(); }
    catch (e) { toast(e.message, true); }
  };
}

// ---- 分析 ----
const WD = ["日", "月", "火", "水", "木", "金", "土"];
let anMetric = { own: "rate" };

// 168マス(曜日×時間)の表。values[i] は数値 or null(データなし)。color[i] は 0〜1 の濃さ
function grid(values, color, { fmt = (v) => v, hue = "pink", id = "g" } = {}) {
  const rgb = hue === "green" ? "57,255,139" : hue === "cyan" ? "56,245,230" : "255,45,149";
  let h = `<div class="grid"><table><thead><tr><th class="wdh"></th>`;
  for (let hr = 0; hr < 24; hr++) h += `<th>${hr}</th>`;
  h += `</tr></thead><tbody>`;
  for (let w = 0; w < 7; w++) {
    h += `<tr><th class="wdh">${WD[w]}</th>`;
    for (let hr = 0; hr < 24; hr++) {
      const i = w * 24 + hr, v = values[i];
      const has = v !== null && v !== undefined;
      const a = has ? 0.1 + 0.85 * Math.max(0, Math.min(1, color[i] || 0)) : 0;
      const txt = has ? fmt(v) : "";
      const dark = a > 0.55;
      h += `<td data-g="${id}" data-i="${i}" style="background:${has ? `rgba(${rgb},${a.toFixed(2)})` : "transparent"};color:${dark ? "#05060a" : "var(--ink)"}">${txt}</td>`;
    }
    h += `</tr>`;
  }
  return h + `</tbody></table></div><div class="grid-detail" id="${id}-detail">マスをタップすると詳細が出ます</div>`;
}
const cellName = (i) => `${WD[Math.floor(i / 24)]}曜 ${Math.floor(i % 24)}時台`;
const norm01 = (arr) => { const v = arr.filter((x) => x !== null && x !== undefined); const mx = Math.max(...v, 0), mn = Math.min(...v, 0); return arr.map((x) => (x === null || x === undefined ? 0 : mx > mn ? (x - mn) / (mx - mn) : 0.5)); };

function renderAnalysis() {
  if (!analysisData) { $("#tab-analysis").innerHTML = "<div class='card'><div class='center'>分析データを読み込み中…</div></div>"; loadAnalysis().then(render).catch((e) => toast(e.message, true)); return; }
  const a = analysisData;
  $("#tab-analysis").innerHTML = `
    <div id="an-body"></div>
    <div class="card">
      <h2>今すぐ確認</h2>
      <div class="muted" style="margin-bottom:10px">通常は自動(自分の売れ行き10分おき)です。すぐ最新にしたいときに押してください。ゲームクラブに負担をかけないよう、数十秒かかります。</div>
      <button class="btn" id="an_scan">今すぐ確認する</button>
      <div class="muted" id="an_scanMsg" style="margin-top:8px"></div>
    </div>`;
  renderOwnView(a);
  $("#an_scan").onclick = async (e) => {
    e.target.disabled = true; $("#an_scanMsg").textContent = "確認中…(30〜60秒かかります)";
    try {
      const r = await api("/scan", { method: "POST", body: "{}" });
      const o = r.own || {};
      $("#an_scanMsg").textContent = `完了: 新たに売れた${o.sold || 0}件・販売日時で補正${o.exact || 0}件`;
      analysisData = null; await loadAnalysis(); renderAnalysis();
    } catch (err) { $("#an_scanMsg").textContent = err.message; }
    e.target.disabled = false;
  };
}

function bindGrid(id, detailOf) {
  $$(`td[data-g="${id}"]`).forEach((td) => (td.onclick = () => {
    $$(`td[data-g="${id}"].sel`).forEach((x) => x.classList.remove("sel"));
    td.classList.add("sel");
    $(`#${id}-detail`).innerHTML = detailOf(Number(td.dataset.i));
  }));
}

function rankList(items, empty) {
  if (!items.length) return `<div class="center">${empty}</div>`;
  return items.map((x, k) => `<div class="rank"><span class="rk">${k + 1}</span><span class="rn">${x.name}</span><span class="rv">${x.text}</span></div>`).join("");
}

function renderOwnView(a) {
  const o = a.own, r = a.ready;
  const lv = { low: "データ不足", mid: "参考程度", high: "十分" };
  const g = o.eligible ? o.sold48 / o.eligible : 0;
  const metric = anMetric.own;
  let values, color, fmt, hue, detail, ranking;
  if (metric === "rate") {
    values = o.cells.map((c) => (c.n ? c.sold / c.n : null));
    const K = 2; color = norm01(o.cells.map((c) => (c.n ? (c.sold + K * g) / (c.n + K) : null)));
    fmt = (v) => Math.round(v * 100); hue = "pink";
    detail = (i) => { const c = o.cells[i]; return c.n ? `<b>${cellName(i)}</b> に出品: ${c.n}件中 <b>${c.sold}件</b> が48時間以内に売れた(${Math.round((c.sold / c.n) * 100)}%)${c.hours.length ? ` ・ 売れるまで平均${(c.hours.reduce((x, y) => x + y, 0) / c.hours.length).toFixed(1)}時間` : ""}` : `<b>${cellName(i)}</b>: まだこの時間に出品した結果がありません`; };
    ranking = o.cells.map((c, i) => ({ i, c })).filter((x) => x.c.n >= 2).sort((p, q) => q.c.sold / q.c.n - p.c.sold / p.c.n || q.c.n - p.c.n).slice(0, 10)
      .map((x) => ({ name: cellName(x.i), text: `${Math.round((x.c.sold / x.c.n) * 100)}%(${x.c.n}件中${x.c.sold}件)` }));
  } else {
    values = o.buy.map((v) => (v ? v : null)); color = norm01(o.buy); fmt = (v) => v; hue = "green";
    detail = (i) => `<b>${cellName(i)}</b> に購入された: <b>${o.buy[i]}件</b>`;
    ranking = o.buy.map((v, i) => ({ i, v })).filter((x) => x.v > 0).sort((p, q) => q.v - p.v).slice(0, 10).map((x) => ({ name: cellName(x.i), text: `${x.v}件` }));
  }
  $("#an-body").innerHTML = `
    <div class="card">
      <h2>概要 <span class="q">このツールが出品した商品だけ(過去の偏ったデータは使いません)</span></h2>
      <dl class="dl">
        <dt>集計開始</dt><dd>${o.since ? fmtDate(o.since) + `(${o.days}日目)` : "まだ出品なし"}</dd>
        <dt>ツールが出品した数</dt><dd>${o.total} 件</dd>
        <dt>結果が出た出品</dt><dd>${o.eligible} 件</dd>
        <dt>48時間以内に売れた</dt><dd>${o.sold48} 件(${(g * 100).toFixed(1)}%)</dd>
        <dt>結果待ち(出品48時間以内)</dt><dd>${o.pending} 件</dd>
        <dt>売れた総数 / 正確な販売時刻</dt><dd>${o.soldAll} 件 / ${o.exact} 件</dd>
        <dt>販売日時の取得待ち</dt><dd>${o.waiting} 件</dd>
      </dl>
      <div class="banner ${r.level === "high" ? "info" : "warn"}" style="margin:12px 0 0"><div><b>データの信頼度: ${lv[r.level]}</b><br>${esc(r.note)}</div></div>
    </div>
    <div class="card">
      <h2>曜日 × 時間</h2>
      <div class="seg sm"><button data-m="rate" class="${metric === "rate" ? "on" : ""}">売れた割合(出品した時刻)</button><button data-m="buy" class="${metric === "buy" ? "on" : ""}">買われた時刻</button></div>
      <div class="muted" style="margin:8px 0">${metric === "rate" ? "マスの数字=その曜日・時間に出品したもののうち、48時間以内に売れた割合(%)。件数が少ないマスは色を控えめにしています。" : "マスの数字=その曜日・時間に実際に買われた件数。"}</div>
      ${grid(values, color, { fmt, hue, id: "go" })}
    </div>
    <div class="card"><h2>${metric === "rate" ? "売れやすい曜日×時間 上位10" : "よく買われる曜日×時間 上位10"}</h2>${rankList(ranking, metric === "rate" ? "同じマスに2件以上の結果がたまると表示されます" : "購入の記録がたまると表示されます")}</div>
    <div class="card"><h2>このデータから作ったスケジュール</h2><div class="slots">${a.recommend.map((t) => `<span class="slot">${t}</span>`).join("")}</div>
      <div class="muted" style="margin-top:8px">${r.level === "low" ? "データ不足のため、当面は均等出品になります。" : "毎日0時(または時間タブの「今すぐ作り直す」)でこのスケジュールが使われます。"}</div></div>`;
  $$("[data-m]").forEach((b) => (b.onclick = () => { anMetric.own = b.dataset.m; renderAnalysis(); }));
  bindGrid("go", detail);
}

// ---- ログ(リアルタイム) ----
// ツールとの間に専用回線(WebSocket)を張り、ログが書かれた瞬間に受け取って、上から滑り込ませる。
// 回線がつながらない環境では、5秒ごとに取りに行く方式に自動で切り替える。
const LOG_CATS = ["すべて", "定期実行", "出品", "売れ行き", "最適化", "通信", "管理画面", "アクセス", "システム"];
let opsBuf = [], opsIds = new Set(), opsNewest = "", opsCat = "すべて", opsLevel = "all", opsPaused = false, opsNet = null, opsOpen = new Set(), opsQ = "", opsTrace = "";
let ws = null, wsState = "off", wsRetry = 0, wsTimer = null, wsPing = null, pollTimer = null, held = [];

function setLiveState(st) {
  wsState = st;
  const el = $("#ops_live_st"); if (!el) return;
  const m = { live: ["LIVE", "リアルタイムで受信中"], connecting: ["接続中", "回線をつないでいます…"], retry: ["再接続中", "回線が切れたので、つなぎ直しています…"], poll: ["5秒ごと", "回線がつながらないため、5秒ごとに取りに行っています"], off: ["停止", ""] }[st] || ["", ""];
  el.className = "livest " + st; el.innerHTML = `<i></i>${m[0]}`; el.title = m[1];
}

function ingest(list, { animate = true } = {}) {
  const fresh = list.filter((o) => o && o.id && !opsIds.has(o.id));
  if (!fresh.length) return;
  fresh.forEach((o) => { opsIds.add(o.id); const nc = o.d && o.d.todayCount; if (nc && opsNet && nc > opsNet.today) { opsNet.today = nc; drawNet(); } });
  const topBefore = opsBuf.length ? opsBuf[0].id : "";
  opsBuf = fresh.concat(opsBuf).sort((x, y) => (x.id < y.id ? 1 : -1));
  if (opsBuf.length > 6000) { opsBuf.slice(6000).forEach((o) => opsIds.delete(o.id)); opsBuf.length = 6000; }
  opsNewest = opsBuf[0].id;
  if (tab !== "logs" || !$("#ops_list")) return;
  const allNewer = fresh.every((o) => o.id > topBefore);
  const show = fresh.filter(passOps).sort((x, y) => (x.id < y.id ? 1 : -1));
  if (!show.length) { drawCount(); return; }
  if (opsPaused) { held.push(...show); drawHeld(); drawCount(); return; }
  if (allNewer && animate) insertTop(show); else drawOps();
}

function insertTop(list) {
  const box = $("#ops_list"); if (!box) return;
  const empty = box.querySelector(".center"); if (empty) empty.remove();
  const frag = document.createElement("div");
  frag.innerHTML = list.map((o) => opHtml(o, true)).join("");
  const nodes = [...frag.children];
  for (let i = nodes.length - 1; i >= 0; i--) box.insertBefore(nodes[i], box.firstChild);
  // 少し遅らせて光らせ、落ち着かせる
  requestAnimationFrame(() => nodes.forEach((n, i) => setTimeout(() => n.classList.add("in"), i * 45)));
  setTimeout(() => nodes.forEach((n) => n.classList.remove("enter", "in")), 1600 + nodes.length * 45);
  // 表示しきれない古い行を下から消す
  const rows = box.querySelectorAll(".op");
  for (let i = 700; i < rows.length; i++) rows[i].remove();
  drawCount();
  if (window.Snd && list.some((o) => o.lvl === "error")) Snd.fail();
}

function connectWS() {
  if (!("WebSocket" in window)) return startPolling();
  clearTimeout(wsTimer);
  setLiveState(wsRetry ? "retry" : "connecting");
  try { ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/stream?k=${encodeURIComponent(pw)}`); }
  catch { return startPolling(); }
  ws.onopen = () => {
    wsRetry = 0; setLiveState("live"); stopPolling();
    clearInterval(wsPing); wsPing = setInterval(() => { try { ws.readyState === 1 && ws.send("ping"); } catch {} }, 30000);
    catchUp(); // 回線が切れていた間のログを取り戻す
  };
  ws.onmessage = (ev) => {
    if (ev.data === "pong") return;
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.t === "ops") ingest(m.ops);
    else if (m.t === "net") { opsNet = m.net; drawNet(); }
  };
  ws.onclose = () => {
    clearInterval(wsPing);
    if (tab !== "logs") { setLiveState("off"); return; }
    wsRetry++;
    if (wsRetry >= 3) startPolling(); // つながらない間は5秒ごとの方式で補う
    setLiveState(wsRetry >= 3 ? "poll" : "retry");
    wsTimer = setTimeout(connectWS, Math.min(30000, 1000 * 2 ** Math.min(wsRetry, 5)));
  };
  ws.onerror = () => { try { ws.close(); } catch {} };
}
async function catchUp() {
  try {
    const r = await api(`/ops?limit=500${opsNewest ? "&after=" + encodeURIComponent(opsNewest) : ""}`);
    if (r.net) { opsNet = r.net; drawNet(); }
    ingest(r.ops, { animate: !!opsNewest });
    if (!opsNewest) drawOps();
  } catch {}
}
function startPolling() { if (pollTimer) return; pollTimer = setInterval(() => { if (!document.hidden) catchUp(); }, 5000); }
function stopPolling() { clearInterval(pollTimer); pollTimer = null; }
function startOps() { if (!opsBuf.length) catchUp(); if (!ws || ws.readyState > 1) connectWS(); }
function stopOps() { clearTimeout(wsTimer); clearInterval(wsPing); stopPolling(); if (ws) { ws.onclose = null; try { ws.close(); } catch {} ws = null; } wsRetry = 0; setLiveState("off"); }

function renderLogs() {
  $("#tab-logs").innerHTML = `
    <div class="card">
      <h2>動作ログ <span class="q">ツールのすべての動きを記録しています(7日間保存)</span><span id="ops_live_st" class="livest"></span></h2>
      <div id="ops_net" class="netbar"></div>
      <div class="chips" id="ops_cats">${LOG_CATS.map((c) => `<button data-c="${c}" class="${c === opsCat ? "on" : ""}">${c}</button>`).join("")}</div>
      <div class="row" style="margin-top:10px;align-items:center;gap:8px">
        <select id="ops_lvl" style="flex:1 1 160px">
          <option value="all" ${opsLevel === "all" ? "selected" : ""}>すべて(詳細も表示)</option>
          <option value="info" ${opsLevel === "info" ? "selected" : ""}>詳細を隠す</option>
          <option value="warn" ${opsLevel === "warn" ? "selected" : ""}>警告とエラーだけ</option>
          <option value="error" ${opsLevel === "error" ? "selected" : ""}>エラーだけ</option>
        </select>
        <input type="text" id="ops_q" placeholder="文字で検索(例: 15344261 / 429 / 取引中)" value="${esc(opsQ)}" style="flex:2 1 220px">
      </div>
      <div class="row" style="margin-top:10px;align-items:center;gap:8px">
        <label class="switch" style="flex:0 0 auto"><input type="checkbox" id="ops_live" ${opsPaused ? "" : "checked"}><span class="track"></span><span>流れる表示</span></label>
        <button class="btn sm" id="ops_more">さらに古いログを読む</button>
        <button class="btn sm" id="ops_dl">表示中のログを保存</button>
      </div>
      <button class="btn sm p hide" id="ops_held" style="margin-top:10px;width:100%"></button>
      <div id="ops_tr" class="trbar ${opsTrace ? "" : "hide"}"></div>
    </div>
    <div class="card" style="padding:8px 10px"><div class="muted" id="ops_count" style="margin:2px 4px 6px"></div><div id="ops_list"><div class="center">読み込み中…</div></div></div>`;
  setLiveState(ws && ws.readyState === 1 ? "live" : pollTimer ? "poll" : "connecting");
  $$("#ops_cats button").forEach((b) => (b.onclick = () => { opsCat = b.dataset.c; $$("#ops_cats button").forEach((x) => x.classList.toggle("on", x === b)); drawOps(); }));
  $("#ops_lvl").onchange = (e) => { opsLevel = e.target.value; drawOps(); };
  let qt; $("#ops_q").oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { opsQ = e.target.value.trim(); drawOps(); }, 250); };
  $("#ops_live").onchange = (e) => { opsPaused = !e.target.checked; if (!opsPaused && held.length) { held = []; drawHeld(); drawOps(); } };
  $("#ops_held").onclick = () => { held = []; drawHeld(); drawOps(); };
  $("#ops_dl").onclick = () => {
    const rows = filteredOps();
    const blob = new Blob([JSON.stringify(rows, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    const d = J(nowMs()); a.download = `gc-log-${d.y}${pad(d.mo)}${pad(d.d)}-${pad(d.h)}${pad(d.mi)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000); toast(`${rows.length}件を保存しました`);
  };
  $("#ops_more").onclick = async (e) => {
    e.target.disabled = true;
    try {
      const oldest = opsBuf.length ? opsBuf[opsBuf.length - 1].id : "";
      const r = await api(`/ops?limit=500&before=${encodeURIComponent(oldest)}`);
      const add = r.ops.filter((x) => !opsIds.has(x.id));
      add.forEach((o) => opsIds.add(o.id));
      opsBuf = opsBuf.concat(add).sort((x, y) => (x.id < y.id ? 1 : -1));
      toast(add.length ? `${add.length}件読み込みました` : "これより古いログはありません"); drawOps();
    } catch (err) { toast(err.message, true); }
    e.target.disabled = false;
  };
  // クリックはまとめて受け取る(後から差し込んだ行にも効くように)
  $("#ops_list").onclick = (ev) => {
    const tk = ev.target.closest("[data-tk]");
    if (tk) { opsTrace = tk.dataset.tk; drawOps(); return; }
    const el = ev.target.closest(".op"); if (!el) return;
    const id = el.dataset.id; opsOpen.has(id) ? opsOpen.delete(id) : opsOpen.add(id);
    const o = opsBuf.find((x) => x.id === id); if (o) { const tmp = document.createElement("div"); tmp.innerHTML = opHtml(o, false); el.replaceWith(tmp.firstElementChild); }
  };
  drawNet();
  drawOps();
  startOps();
}

function passOps(o) {
  const rank = { debug: 0, info: 1, warn: 2, error: 3 };
  const min = { all: 0, info: 1, warn: 2, error: 3 }[opsLevel];
  const q = opsQ.toLowerCase();
  return (opsCat === "すべて" || o.cat === opsCat) && rank[o.lvl] >= min && (!opsTrace || o.tk === opsTrace)
    && (!q || (o.msg + " " + (o.d ? JSON.stringify(o.d) : "")).toLowerCase().includes(q));
}
function filteredOps() { return opsBuf.filter(passOps); }

function drawNet() {
  const el = $("#ops_net"); if (!el || !opsNet) return;
  const pause = opsNet.pauseUntil ? `<span class="bad">休止中(${fmtTime(opsNet.pauseUntil)}まで)</span>` : `<span class="okc">通常稼働</span>`;
  el.innerHTML = `ゲームクラブへの通信: 今日 <b class="tick">${opsNet.today}</b> / ${opsNet.cap} 回 ・ ${pause}`;
}
function drawCount() { const c = $("#ops_count"); if (c) { const n = filteredOps().length; c.textContent = n ? `${n}件(読み込み済み ${opsBuf.length}件)` : ""; } }
function drawHeld() { const b = $("#ops_held"); if (!b) return; b.classList.toggle("hide", !held.length); b.textContent = `新着 ${held.length}件 ― 押して表示`; }

function opHtml(o, enter) {
  const d = J(o.t), time = `${d.mo}/${d.d} ${pad(d.h)}:${pad(d.mi)}:${pad(d.s)}`;
  const det = o.d ? Object.entries(o.d).map(([k, v]) => `<span class="kv"><i>${esc(OPS_KEY[k] || k)}</i>${esc(typeof v === "object" ? JSON.stringify(v) : String(v))}</span>`).join("") : "";
  const open = opsOpen.has(o.id);
  const src = o.src === "manual" ? '<span class="op-s">手動</span>' : o.src === "access" ? '<span class="op-s acc">アクセス</span>' : "";
  return `<div class="op ${o.lvl}${enter ? " enter" : ""}" data-id="${o.id}">
    <div class="op-h"><span class="op-t">${time}</span><span class="op-c">${esc(o.cat)}</span>${o.lvl === "debug" ? '<span class="op-l">詳細</span>' : ""}${src}${o.tk ? `<span class="op-k" data-tk="${esc(o.tk)}" title="この処理のログだけ見る">#${esc(o.tk)}</span>` : ""}<span class="op-m">${esc(o.msg)}</span>${det ? `<span class="op-x">${open ? "▲" : "▼"}</span>` : ""}</div>
    ${det && open ? `<div class="op-d">${det}</div>` : ""}
  </div>`;
}

function drawOps() {
  const list = $("#ops_list"); if (!list) return;
  const trb = $("#ops_tr");
  if (trb) { trb.classList.toggle("hide", !opsTrace); trb.innerHTML = opsTrace ? `処理番号 <b>#${esc(opsTrace)}</b> のログだけを表示中 <button class="btn sm gho" id="ops_trc">解除</button>` : ""; const c = $("#ops_trc"); if (c) c.onclick = () => { opsTrace = ""; drawOps(); }; }
  const rows = filteredOps().slice(0, 700);
  drawCount();
  if (!rows.length) { list.innerHTML = `<div class="center">${opsBuf.length ? "この条件のログはありません" : "まだログがありません(稼働を開始すると記録されます)"}</div>`; return; }
  list.innerHTML = rows.map((o) => opHtml(o, false)).join("");
}
const OPS_KEY = { path: "アクセス先", method: "方式", status: "応答コード", ms: "所要(ミリ秒)", bytes: "データ量", type: "データの種類", location: "転送先", cfRay: "Cloudflare識別番号", cfCache: "キャッシュ", cfMitigated: "Cloudflareの防御", setCookie: "Cookieの更新", waitMs: "待機(ミリ秒)", cookie: "ログイン情報の送信", ua: "名乗り", sendHeaders: "送ったヘッダー", bodyBytes: "送信データ量", todayCount: "今日の通信回数", error: "エラー内容", kind: "エラーの種類", stack: "発生箇所", productId: "商品番号", chatId: "チャット番号", unread: "未読", id: "商品番号", price: "価格", state: "状態", times: "時刻", keys: "変更項目", listingId: "出品番号", url: "出品ページ", pauseUntil: "休止の終了", tracking: "追跡中", queue: "補正待ち", since: "集計開始", waitMs2: "待機" };

// ---- 設定 ----
function renderSettings() {
  const s = state.settings;
  $("#tab-settings").innerHTML = `
    <div class="card">
      <h2>ログイン情報(PHPSESSID)</h2>
      <div class="muted" style="margin-bottom:10px">現在: ${state.session.set ? `<span class="pill ok">登録済み</span> ${state.session.updatedAt ? "(" + fmtDate(state.session.updatedAt) + ")" : ""}` : '<span class="pill off">未登録</span>'}</div>
      <div class="field"><label>PHPSESSIDの値</label><input type="password" id="st_sess" placeholder="値の部分だけを貼り付け"></div>
      <div class="row">
        <button class="btn p" id="st_sessSave">保存</button>
        <button class="btn" id="st_test" ${!state.session.set ? "disabled" : ""}>接続テスト</button>
        ${state.session.set ? '<button class="btn gho" id="st_sessDel">削除</button>' : ""}
      </div>
      <div class="muted" id="st_testMsg" style="margin-top:10px"></div>
      <details class="help"><summary>値の取り方</summary><div>
        <ol>
          <li>ゲームクラブを開き、開発者ツール(F12)の「Application」タブへ</li>
          <li>左の Cookies → https://gameclub.jp を選ぶ</li>
          <li><code>PHPSESSID</code> の行の Value をコピーして貼り付け</li>
        </ol>
        ブラウザでログアウトすると無効になります。普段どおり放置すれば長期間有効です。
      </div></details>
    </div>
  `;
  $("#st_sessSave").onclick = async () => { const v = $("#st_sess").value.trim(); if (!v) return toast("値を入力してください", true); try { await api("/session", { method: "POST", body: JSON.stringify({ phpsessid: v }) }); toast("保存しました"); $("#st_sess").value = ""; refresh(); } catch (e) { toast(e.message, true); } };
  if ($("#st_sessDel")) $("#st_sessDel").onclick = async () => { if (!confirm("削除しますか?")) return; await api("/session", { method: "DELETE" }); toast("削除しました"); refresh(); };
  $("#st_test").onclick = async (e) => { e.target.disabled = true; $("#st_testMsg").textContent = "確認中…"; try { const r = await api("/test", { method: "POST", body: "{}" }); window.Snd&&(r.ok?Snd.success():Snd.fail()); $("#st_testMsg").innerHTML = `<span style="color:var(--${r.ok ? "ok" : "bad"})">${r.ok ? "✓ " : "✕ "}${esc(r.message)}</span>`; } catch (err) { $("#st_testMsg").textContent = err.message; } e.target.disabled = false; };
}

if (pw) { fetch("/api/state", { headers: { "x-admin-key": encodeURIComponent(pw) } }).then((r) => { if (r.ok) start(); else { sessionStorage.removeItem(KEY); } }); }

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
    sessionStorage.setItem(KEY, pw); window.Snd&&Snd.boot(); start();
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
  tab = t;
  $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  $$(".tab").forEach((el) => el.classList.add("hide"));
  $("#tab-" + t).classList.remove("hide");
  if (t === "analysis" && !analyticsData) loadAnalytics().then(render);
  render();
}

async function refresh(quiet) {
  try {
    const t0 = Date.now();
    state = await api("/state");
    clockOffset = state.now - Math.round((t0 + Date.now()) / 2); // 通信にかかった時間の半分を補正
    if (tab === "home") { if (!logs || !quiet) logs = (await api("/logs")).logs; }
    if (tab === "analysis" && (!analyticsData || !quiet)) await loadAnalytics();
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

// ---- 時間設定 ----
function renderSchedule() {
  const s = state.settings, sc = s.schedule;
  $("#tab-schedule").innerHTML = `
    <div class="card">
      <h2>出品する時間の決め方</h2>
      <div class="field">
        <select id="sc_mode">
          <option value="interval" ${sc.mode === "interval" ? "selected" : ""}>時間帯と回数を決めて等間隔で出す</option>
          <option value="manual" ${sc.mode === "manual" ? "selected" : ""}>時刻を自分で1つずつ指定する</option>
        </select>
      </div>
      <div id="sc_interval" class="${sc.mode === "manual" ? "hide" : ""}">
        <div class="row">
          <div class="field"><label>開始</label><input type="text" id="sc_start" value="${sc.start}" placeholder="9:00"></div>
          <div class="field"><label>終了</label><input type="text" id="sc_end" value="${sc.end}" placeholder="24:00"></div>
          <div class="field"><label>回数(最大${s.dailyLimit})</label><input type="number" id="sc_count" value="${sc.count}" min="1" max="${s.dailyLimit}"></div>
        </div>
        <div class="muted" id="sc_preview"></div>
      </div>
      <div id="sc_manual" class="${sc.mode === "manual" ? "" : "hide"}">
        <div class="field"><label>時刻(1行に1つ、24時間表記)</label>
          <textarea id="sc_times" rows="6" style="font-family:ui-monospace,monospace">${(sc.manual || []).join("\n")}</textarea></div>
        <button class="btn sm" id="sc_suggest">分析結果から推奨時刻を入れる</button>
      </div>
      <button class="btn p" id="sc_save" style="margin-top:14px">保存する</button>
    </div>
    </div>`;
  const upd = () => {
    const slots = previewSlots();
    $("#sc_preview").innerHTML = slots.length ? `出品時刻: ${slots.map(hm2str).join(" / ")}<br>間隔 約${slots.length > 1 ? Math.round((slots[slots.length - 1] - slots[0]) / (slots.length - 1)) : 0}分` : "時間帯が正しくありません";
  };
  $("#sc_mode").onchange = (e) => { $("#sc_interval").classList.toggle("hide", e.target.value === "manual"); $("#sc_manual").classList.toggle("hide", e.target.value !== "manual"); };
  ["sc_start", "sc_end", "sc_count"].forEach((id) => $("#" + id) && ($("#" + id).oninput = upd));
  upd();
  $("#sc_suggest").onclick = async () => { if (!logs) await loadLogs(); const best = bestHours(6); if (!best.length) return toast("まだ分析データがありません", true); $("#sc_times").value = best.map((h) => `${h}:00`).join("\n"); toast("推奨時刻を入れました(確認して保存してください)"); };
  $("#sc_save").onclick = async () => {
    const mode = $("#sc_mode").value;
    const body = { schedule: { mode } };
    if (mode === "interval") { body.schedule.start = $("#sc_start").value.trim(); body.schedule.end = $("#sc_end").value.trim(); body.schedule.count = Number($("#sc_count").value); }
    else body.schedule.manual = $("#sc_times").value.split("\n").map((x) => x.trim()).filter(Boolean);
    try { await api("/settings", { method: "POST", body: JSON.stringify(body) }); toast("保存しました"); refresh(); } catch (e) { toast(e.message, true); }
  };
}
function previewSlots() {
  const n = Math.max(1, Math.min(state.settings.dailyLimit, Number($("#sc_count").value) || 1));
  const p = (v) => { const m = String(v).match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : NaN; };
  const s = p($("#sc_start").value), e = p($("#sc_end").value);
  if (!(e - s > 0)) return [];
  const step = (e - s) / n, out = [];
  for (let i = 0; i < n; i++) { const v = Math.round(s + i * step); if (v < 1440) out.push(v); }
  return out;
}

// ---- 分析 ----
let analyticsData = null;
async function loadAnalytics() { analyticsData = await api("/analytics"); }

function renderAnalysis() {
  if (!analyticsData) { $("#tab-analysis").innerHTML = "<div class='card'><div class='center'>分析データを読み込み中…</div></div>"; loadAnalytics().then(render); return; }
  const a = analyticsData;
  const conf = a.confidence;
  const wd = ["日", "月", "火", "水", "木", "金", "土"];
  const lastScan = a.lastScan ? fmtDate(a.lastScan) : "まだ";

  // 時間帯ランキング(売れやすさスコア順)
  const hourRank = a.hour.map((c, h) => ({ h, ...c })).filter((x) => x.listed > 0).sort((x, y) => y.rate - x.rate).slice(0, 6);
  // 曜日ランキング
  const wdRank = a.wday.map((c, w) => ({ w, rate: c.listed ? c.sold / c.listed : 0, ...c })).filter((x) => x.listed > 0).sort((x, y) => y.rate - x.rate);

  $("#tab-analysis").innerHTML = `
    <div class="card">
      <h2>概要 <span class="q">Xアカウントのみ・ゲームクラブの実データ</span></h2>
      <dl class="dl">
        <dt>分析した出品</dt><dd>${a.totalListed} 件</dd>
        <dt>売れた数</dt><dd>${a.totalSold} 件</dd>
        <dt>全体の売却率</dt><dd>${(a.globalRate * 100).toFixed(1)} %</dd>
        <dt>正確な販売時刻</dt><dd>${a.exactCount} 件</dd>
        <dt>最終スキャン</dt><dd>${lastScan}</dd>
      </dl>
      <div class="banner ${conf.level === "high" ? "info" : "warn"}" style="margin-top:12px;margin-bottom:0">
        <div><b>データの信頼度: ${conf.label}</b><br>${esc(conf.note)}</div>
      </div>
    </div>

    <div class="card">
      <h2>時間帯 × 曜日(売れやすさ)</h2>
      <div class="muted" style="margin-bottom:8px">濃いマスほど、その曜日・時間に出すと売れやすい傾向です。マスに触れると件数が出ます。</div>
      ${buildHeatV2(a)}
    </div>

    <div class="card">
      <h2>売れやすい時間帯 上位</h2>
      ${hourRank.length ? hourRank.map((x) => `<div class="log"><span class="t">${pad(x.h)}:00</span><span class="m">売れやすさ ${(x.rate * 100).toFixed(0)}% ・ 出品${x.listed}件/売れた${x.sold}件${x.medHours ? ` ・ 中央${x.medHours.toFixed(1)}時間で成約` : ""}${x.avgViews ? ` ・ 平均閲覧${x.avgViews.toFixed(0)}` : ""}</span></div>`).join("") : "<div class='center'>データがたまると表示されます</div>"}
    </div>

    <div class="card">
      <h2>曜日別</h2>
      ${wdRank.length ? wdRank.map((x) => `<div class="log"><span class="t">${wd[x.w]}曜</span><span class="m">売却率 ${(x.rate * 100).toFixed(0)}% ・ 出品${x.listed}件/売れた${x.sold}件</span></div>`).join("") : "<div class='center'>データがたまると表示されます</div>"}
    </div>

    <div class="card">
      <h2>おすすめスケジュール</h2>
      <div class="muted" style="margin-bottom:10px">分析から、売れやすい時間帯に寄せた${a.recommend.length}枠の出品時刻です。</div>
      <div class="slots">${a.recommend.map((t) => `<span class="slot">${t}</span>`).join("")}</div>
      <button class="btn p" id="an_apply" style="margin-top:14px" ${conf.level === "low" ? "disabled" : ""}>この時刻を時間設定に反映する</button>
      ${conf.level === "low" ? "<div class='muted' style='margin-top:8px'>データが集まるまで反映はできません。</div>" : ""}
    </div>

    <div class="card">
      <h2>今すぐデータ更新</h2>
      <div class="muted" style="margin-bottom:10px">通常は10分おきに自動で集計されます。すぐ最新にしたいときに押してください(少し時間がかかります)。</div>
      <button class="btn" id="an_scan">今すぐスキャン</button>
      <div class="muted" id="an_scanMsg" style="margin-top:8px"></div>
    </div>`;

  if ($("#an_apply")) $("#an_apply").onclick = async () => {
    try { const r = await api("/analytics/apply", { method: "POST", body: "{}" }); toast(`${r.times.length}枠を反映しました`); refresh(); } catch (e) { toast(e.message, true); }
  };
  $("#an_scan").onclick = async (e) => {
    e.target.disabled = true; $("#an_scanMsg").textContent = "スキャン中…(最大1分)";
    try { const r = await api("/scan", { method: "POST", body: "{}" }); $("#an_scanMsg").textContent = r.skipped ? `スキップ: ${r.skipped}` : `完了(出品中${r.onsale}・取引中${r.trading}・新たに売れた${r.newlySold})`; await loadAnalytics(); render(); }
    catch (err) { $("#an_scanMsg").textContent = err.message; }
    e.target.disabled = false;
  };
}

function buildHeatV2(a) {
  const wd = ["日", "月", "火", "水", "木", "金", "土"];
  let max = 0.0001;
  for (const k in a.score) if (a.score[k].listed > 0) max = Math.max(max, a.score[k].rate);
  let html = '<div class="heat"><table><tr><th></th>';
  for (let h = 0; h < 24; h += 2) html += `<th colspan="2">${h}</th>`;
  html += "</tr>";
  for (let w = 0; w < 7; w++) {
    html += `<tr><th>${wd[w]}</th>`;
    for (let h = 0; h < 24; h++) {
      const c = a.score[w + "-" + h];
      const has = c && c.listed > 0;
      const alpha = has ? 0.12 + 0.88 * (c.rate / max) : 0;
      const bg = has ? `rgba(255,45,149,${alpha})` : "transparent";
      const title = has ? `${wd[w]} ${h}時: 出品${c.listed} 売れた${c.sold} (${(c.rate * 100).toFixed(0)}%)` : `${wd[w]} ${h}時: データなし`;
      html += `<td class="c" style="background:${bg}" title="${title}"></td>`;
    }
    html += "</tr>";
  }
  return html + "</table></div>";
}
function fmtDur(ms) { const h = ms / 3600e3; if (h < 1) return `${Math.round(ms / 60e3)}分`; if (h < 24) return `${h.toFixed(1)}時間`; return `${(h / 24).toFixed(1)}日`; }

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
    <div class="card">
      <h2>スケジュールの自動最適化</h2>
      <label class="switch" style="margin-bottom:10px"><input type="checkbox" id="st_opt" ${s.autoOptimize ? "checked" : ""}><span class="track"></span><span>毎日0時に、分析結果を時間設定へ自動反映する</span></label>
      <div class="muted">オンにすると、売れやすい時間帯に15枠を自動で寄せ直します。オフなら手動のままです(分析タブからいつでも手動反映できます)。データが少ないうちは自動反映されません。</div>
    </div>
  `;
  $("#st_opt").onchange = async (e) => { try { await api("/settings", { method: "POST", body: JSON.stringify({ autoOptimize: e.target.checked }) }); window.Snd&&(e.target.checked?Snd.toggleOn():Snd.toggleOff()); toast("保存しました"); refresh(); } catch (err) { toast(err.message, true); e.target.checked = !e.target.checked; } };
  $("#st_sessSave").onclick = async () => { const v = $("#st_sess").value.trim(); if (!v) return toast("値を入力してください", true); try { await api("/session", { method: "POST", body: JSON.stringify({ phpsessid: v }) }); toast("保存しました"); $("#st_sess").value = ""; refresh(); } catch (e) { toast(e.message, true); } };
  if ($("#st_sessDel")) $("#st_sessDel").onclick = async () => { if (!confirm("削除しますか?")) return; await api("/session", { method: "DELETE" }); toast("削除しました"); refresh(); };
  $("#st_test").onclick = async (e) => { e.target.disabled = true; $("#st_testMsg").textContent = "確認中…"; try { const r = await api("/test", { method: "POST", body: "{}" }); window.Snd&&(r.ok?Snd.success():Snd.fail()); $("#st_testMsg").innerHTML = `<span style="color:var(--${r.ok ? "ok" : "bad"})">${r.ok ? "✓ " : "✕ "}${esc(r.message)}</span>`; } catch (err) { $("#st_testMsg").textContent = err.message; } e.target.disabled = false; };
}

if (pw) { fetch("/api/state", { headers: { "x-admin-key": encodeURIComponent(pw) } }).then((r) => { if (r.ok) start(); else { sessionStorage.removeItem(KEY); } }); }

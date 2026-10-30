"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const KEY = "gc_admin_key";
let state = null, logs = null, tab = "home", pw = sessionStorage.getItem(KEY) || "";

// ===== どちらのサイトを操作しているか =====
// 選んだサイトはこの端末に覚えておく(次に開いたときも同じサイトから)
const SITE_INFO = {
  gc: { name: "ゲームクラブ", origin: "https://gameclub.jp", rule: "1日15回・前回から30分" },
  mac: { name: "M&Aクラブ", origin: "https://maclub.jp", rule: "1日5回・前回から31分" },
};
const SITE_KEY = "gc_site";
let site = (() => { try { const v = localStorage.getItem(SITE_KEY); return SITE_INFO[v] ? v : "gc"; } catch { return "gc"; } })();
const SN = () => SITE_INFO[site].name;
let overview = null;
document.body.classList.add("site-" + site);

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
  const res = await fetch("/api" + path, { ...opts, headers: { "Content-Type": "application/json", "x-admin-key": encodeURIComponent(pw), "x-site": site, ...(opts.headers || {}) } });
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
  loadOverview();
  setInterval(() => { if (!document.hidden) { refresh(true); loadOverview(); } }, 30000);
  document.addEventListener("click",(e)=>{ const b=e.target.closest("button"); if(b && !b.disabled && window.Snd) Snd.click(); },true);
}
function switchTab(t) {
  window.Snd&&Snd.tabSwitch();
  if (t !== "logs") stopOps();
  tab = t;
  $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  $$(".tab").forEach((el) => el.classList.add("hide"));
  $("#tab-" + t).classList.remove("hide");
  if (t === "home") loadBoost().then(render);
  render();
}

async function refresh(quiet) {
  try {
    const t0 = Date.now();
    state = await api("/state");
    clockOffset = state.now - Math.round((t0 + Date.now()) / 2); // 通信にかかった時間の半分を補正
    if (tab === "home") await loadBoost();
    quietRender = !!quiet; render(); quietRender = false;
  } catch (e) { if (!quiet) toast(e.message, true); }
}
async function loadLogs() { logs = (await api("/logs")).logs; }

let quietRender = false;
function render() {
  if (!state) return;
  const s = state.settings;
  $("#statusLine").innerHTML = (s.paused
    ? `<span class="dot pause"></span>自動更新オフ`
    : `<span class="dot run"></span>自動更新オン ・ 今日 ${state.today.count}/${s.dailyLimit} 回`) + ` ・ <span id="clock" title="インターネット(サーバー)の時刻・日本時間"></span>`;
  tickClock();
  renderBanners();
  if (tab === "home") renderHome();
  if (tab === "types" && !(quietRender && document.querySelector("#tab-types .tfull:not(.hide)"))) renderTypes();
  if (tab === "logs" && !$("#ops_list")) renderLogs();
  if (tab === "settings" && (!$("#tab-settings").children.length || !quietRender)) renderSettings();
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
    const head = a.kind === "session" ? "ログイン状態が切れたため、自動更新を止めています" : a.kind === "blocked" ? "Cloudflareの確認画面で止められたため、自動更新を止めています" : "自動更新を止めています";
    const how = a.kind === "session" ? "設定タブでPHPSESSIDを貼り直すと、警告が消えて再開します。" : "原因を確かめてから右の×で警告を消すと、次の予定枠から再開します。止められた直後は60分の休止もかかっています。";
    b.innerHTML += `<div class="banner ${a.kind === "session" ? "warn" : "bad"}"><div><b>${head}</b><br>${esc(a.message)}<br><span class="muted">${how} ・ ${fmtDate(a.at)}</span></div><button class="btn gho sm x" onclick="clearAlert()" aria-label="警告を消す">×</button></div>`;
  }
  if (!state.session.set) b.innerHTML += `<div class="banner info">はじめに「設定」タブで、${SN()}のログイン情報(PHPSESSID)を登録してください。</div>`;
  else if (!(state.types || []).length) b.innerHTML += `<div class="banner info">「種類」タブで、更新する出品の種類を登録してください。登録した順番で更新します。</div>`;
  const t = state.lastTick;
  if (t && nowMs() - t > 20 * 60000) b.innerHTML += `<div class="banner warn">自動実行が${ago(t)}から動いていないようです。日本のサーバー(外部起動)とCloudflareの Workers → gc-scheduler → Logs を確認してください(${SN()})。</div>`;
  const x = state.ext;
  if (x && nowMs() - x.at > 5 * 60000 && !state.settings.paused) b.innerHTML += `<div class="banner warn"><div><b>日本からの外部起動が止まっています</b>(最後: ${fmtDate(x.at)})。AWSのLambda(gc-trigger)が動いているか確認してください。止まっている間は、${SN()}に止められる可能性が高いです。</div></div>`;
  else if (x && x.country !== "JP") b.innerHTML += `<div class="banner warn"><div><b>外部起動の国が日本ではありません</b>(国 ${esc(x.country)})。起動元のサーバーが日本のリージョンにあるか確認してください。</div></div>`;
}
window.clearAlert = async () => { await api("/alert/clear", { method: "POST" }); refresh(); };

// ---- ホーム ----
// 「次の更新」までの残り時間を1秒ごとに更新
function fmtLeft(ms) {
  if (ms <= 0) return "まもなく(1分以内)";
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h ? `あと ${h}時間${pad(m)}分${pad(sec)}秒` : `あと ${m}分${pad(sec)}秒`;
}
function tickNext() {
  const el = document.getElementById("nextLeft"); if (!el || !state || !state.plan || !state.plan.length) return;
  const left = state.plan[0].at - nowMs();
  el.textContent = fmtLeft(left);
  // 予定時刻を過ぎて1分半たったら、最新の状態を読み直す(更新されたかを反映)
  if (left < -90000 && !tickNext.busy) { tickNext.busy = true; refresh(true).finally(() => { tickNext.busy = false; }); }
}
setInterval(tickNext, 1000);
// 日付つきの時刻表示(今日なら時刻だけ、明日なら「明日」)
function dayTime(ms) {
  const d = J(ms), n = J(nowMs()), tm = J(nowMs() + 86400e3);
  const t = `${d.h}:${pad(d.mi)}`;
  if (d.y === n.y && d.mo === n.mo && d.d === n.d) return t;
  if (d.y === tm.y && d.mo === tm.mo && d.d === tm.d) return `明日 ${t}`;
  return `${d.mo}/${d.d} ${t}`;
}

// ---- ホーム ----
let boostInfo = null; // /boost の結果(今すぐ1回の予約・結果・履歴)
async function loadBoost() { try { boostInfo = await api("/boost"); } catch { boostInfo = boostInfo || null; } }
const KIND = { boosted: "更新しました", blocked: "確認画面で止められた", session: "ログイン切れ", unconfirmed: "送れたが未確認", unknown: "想定外の応答", notfound: "商品が見つからない", empty: "対象なし", nomatch: "一致する出品なし", notypes: "種類が未登録", limit: "今日の上限", interval: "間隔ルール", paused: "休止中", network: "通信エラー", expired: "予約切れ", nosession: "ログイン情報なし" };
const timeModeText = (s) => `24時間で均等(約${Math.round(1440 / Math.max(1, s.dailyLimit))}分おき)`;

// 次に更新される種類(一致0件の種類は飛ばす。一覧を読んでいなければ順番どおり)
function nextTypeInfo() {
  const types = state.types || [];
  if (!types.length) return null;
  const n = types.length;
  for (let k = 0; k < n; k++) {
    const t = types[(state.cursor + k) % n];
    const c = state.counts[t.id];
    if (c === null || c === undefined || c > 0) return { type: t, count: c, skipped: k };
  }
  return { type: null };
}

// 次に自動で更新される出品(次の種類に一致する出品のうち、取引中を除いて一覧の一番下)
function nextTarget() {
  const nt = nextTypeInfo();
  const snap = state.snapshot;
  if (!nt || !nt.type || !snap) return null;
  const hits = snap.items.filter((x) => x.key === nt.type.key && !/取引/.test(x.status || ""));
  return hits.length ? hits.reduce((a, b) => (b.position > a.position ? b : a)) : null;
}
const LIST_PER = 10; // 出品中の一覧の1ページの件数(ゲームクラブと同じ)
let listPage = 1;
function pagerHtml(cur, pages) {
  if (pages <= 1) return "";
  const b = (p, label, dis, on, aria) => `<button class="pg ${on ? "on" : ""}" data-pg="${p}" ${dis ? "disabled" : ""} aria-label="${aria || p + "ページ目"}">${label}</button>`;
  let h = b(1, "«", cur === 1, false, "最初のページ") + b(cur - 1, "‹", cur === 1, false, "前のページ");
  for (let p = 1; p <= pages; p++) h += b(p, p, false, p === cur);
  h += b(cur + 1, "›", cur === pages, false, "次のページ") + b(pages, "»", cur === pages, false, "最後のページ");
  return `<div class="pager">${h}</div>`;
}

function slotChips() {
  const bs = state.today.bslots || {};
  const next = state.plan && state.plan[0];
  const nowMin = J(nowMs()).h * 60 + J(nowMs()).mi;
  return state.slots.map((m) => {
    const st = bs[m];
    const cls = st?.status === "done" ? "done" : st?.status === "failed" || st?.status === "skipped" ? "failed" : "";
    const mark = st?.status === "done" ? "✓ " : st?.status === "failed" ? "✕ " : st?.status === "skipped" ? "– " : "";
    const isNext = next && next.slot === m && J(next.at).d === J(nowMs()).d;
    const tip = st?.message ? esc(st.message) : st?.status === "done" ? "更新済み" : m <= nowMin ? "" : "これから";
    return `<span class="slot ${cls} ${isNext ? "now" : ""}" title="${tip}">${mark}${hm2str(m)}</span>`;
  }).join("");
}

function historyRow(h) {
  const ok = h.ok;
  return `<div class="hrow ${ok ? "ok" : "ng"}">
    <span class="hrow-t">${fmtDate(h.at)}</span>
    <span class="hrow-m">${ok ? "✓" : "✕"} ${h.type ? `<b>${esc(h.type)}</b> ・ ` : ""}${esc(ok ? h.message : `${KIND[h.kind] || h.kind}: ${h.message}`)}${h.manual ? ' <span class="pill off">手動</span>' : ""}</span>
  </div>`;
}

function renderHome() {
  const s = state.settings;
  const plan = state.plan || [];
  const next = plan[0];
  const nt = nextTypeInfo();
  const ext = state.ext && nowMs() - state.ext.at < 5 * 60000;
  const nextTypeLine = !nt ? `<span class="bad">種類が未登録です。「種類」タブで登録してください。</span>`
    : !nt.type ? `<span class="bad">登録した種類のどれにも一致する出品がありません。</span>`
    : `「${esc(nt.type.label)}」${nt.count === null || nt.count === undefined ? "" : `(一致 ${nt.count}件・いちばん下のものを上げます)`}${nt.skipped ? ` <span class="muted">一致0件の種類を${nt.skipped}つ飛ばします</span>` : ""}`;
  const hist = (boostInfo && boostInfo.history) || [];
  const res = boostInfo && boostInfo.result;
  const pending = (boostInfo && boostInfo.pending) || state.reserve;

  $("#tab-home").innerHTML = `
    <div class="card">
      <h2>自動更新 <span class="q">${esc(SN())} ・ 1日${s.dailyLimit}回まで(出品と合わせて)</span></h2>
      <label class="switch" style="margin-bottom:14px">
        <input type="checkbox" id="pauseToggle" ${!s.paused ? "checked" : ""}>
        <span class="track"></span>
        <span>${s.paused ? "オフ: 予定時刻になっても更新しません" : `オン: ${esc(timeModeText(s))}に、種類の順番で更新します`}</span>
      </label>
      <dl class="dl">
        <dt>今日の回数</dt><dd>${state.today.count} / ${s.dailyLimit} 回${state.today.boosts && state.today.boosts !== state.today.count ? ` <span class="muted">(うち更新 ${state.today.boosts}回)</span>` : ""}</dd>
        <dt>更新の時刻</dt><dd>${esc(timeModeText(s))}</dd>
        <dt>ログイン状態</dt><dd>${state.session.set ? "<span class='pill ok'>登録済み</span>" : "<span class='pill off'>未登録</span>"}</dd>
        <dt>起動のしかた</dt><dd>${ext ? `<span class='pill ok'>日本からの外部起動</span> <span class='muted'>${Math.max(0, Math.round((nowMs() - state.ext.at) / 1000))}秒前</span>` : "<span class='pill off'>外部起動が止まっています</span>"}</dd>
      </dl>
    </div>

    <div class="card nextcard">
      <h2>次の更新</h2>
      ${s.paused ? `<div class="next-big off">オフ</div><div class="next-why">スイッチをオンにすると、予定時刻に自動で更新します。</div>`
        : !next ? `<div class="next-big off">予定なし</div>`
        : `<div class="next-big">${dayTime(next.at)}<span class="next-left" id="nextLeft">${fmtLeft(next.at - nowMs())}</span></div>
           <div class="next-why">更新する種類: ${nextTypeLine}</div>
           <div class="muted next-note">自動実行は1分おきなので、実際の更新はこの時刻から1分以内です。前回から${s.minIntervalMin}分たっていないときは少し後ろにずれます。</div>
           ${plan.length > 1 ? `<div class="next-sub">このあとの予定</div><ul class="next-list">${plan.slice(1).map((p) => `<li><b>${dayTime(p.at)}</b><span>${hm2str(p.slot)}の枠</span></li>`).join("")}</ul>` : ""}`}
    </div>

    <div class="card">
      <h2>今日の予定 <span class="q">${state.slots.length}枠</span></h2>
      <div class="slots">${slotChips()}</div>
      <div class="legend"><span><i class="lg done"></i>更新した</span><span><i class="lg failed"></i>更新しなかった</span><span><i class="lg now"></i>次の枠</span><span><i class="lg none"></i>これから</span></div>
    </div>

    <div class="card">
      <h2>今すぐ1回更新</h2>
      <div class="muted" style="margin-bottom:10px">予定とは別に、次の自動実行(1分以内)で1回だけ更新します。種類の順番どおりに選びます。スイッチがオフでも動きます。今日の回数を1つ使います。</div>
      <button class="btn p" id="nowBtn" ${pending ? "disabled" : ""}>今すぐ1回更新</button>
      <div id="nowMsg" style="margin-top:10px">${pending ? `<span class="muted">実行待ち…(予約 ${fmtTime(pending.at)})</span>` : res ? historyRow({ ...res, type: res.typeLabel, manual: true }) : ""}</div>
    </div>

    <div class="card">
      <h2>最近の更新</h2>
      <div id="homeHist">${hist.length ? hist.slice(0, 12).map(historyRow).join("") : "<div class='center'>まだ更新していません</div>"}</div>
    </div>`;

  $("#pauseToggle").onchange = async (e) => {
    if (e.target.checked && !(state.types || []).length) { toast("先に「種類」タブで、更新する種類を登録してください", true); e.target.checked = false; return; }
    try { await api("/settings", { method: "POST", body: JSON.stringify({ paused: !e.target.checked }) }); window.Snd && (e.target.checked ? Snd.toggleOn() : Snd.toggleOff()); toast(e.target.checked ? "自動更新をオンにしました" : "自動更新をオフにしました"); refresh(); loadOverview(); }
    catch (err) { toast(err.message, true); e.target.checked = !e.target.checked; }
  };
  $("#nowBtn").onclick = async (e) => {
    if (!confirm("次の自動実行で1回だけ更新します。今日の回数を1つ使います。よろしいですか?")) return;
    e.target.disabled = true;
    try {
      const r = await api("/boost/reserve", { method: "POST", body: "{}" });
      if (!r.ok) { toast(r.message, true); e.target.disabled = false; return; }
      toast("予約しました。1分以内に更新します");
      $("#nowMsg").innerHTML = `<span class="muted">実行待ち…(予約 ${fmtTime(r.at)})</span>`;
      watchBoost(r.at);
    } catch (err) { toast(err.message, true); e.target.disabled = false; }
  };
  if (pending) watchBoost(pending.at);
}

let boostWatch = null;
function watchBoost(since) {
  clearInterval(boostWatch); const t0 = Date.now();
  boostWatch = setInterval(async () => {
    await loadBoost();
    const r = boostInfo && boostInfo.result;
    const got = boostInfo && !boostInfo.pending && r && r.reservedAt >= since;
    if (got || Date.now() - t0 > 12 * 60e3) {
      clearInterval(boostWatch); boostWatch = null;
      if (got) { toast(r.ok ? "更新しました" : `更新できませんでした: ${KIND[r.kind] || r.kind}`, !r.ok); }
      await refresh(true);
    }
  }, 8000);
}

// ---- 種類 ----
function thumb(src) { return src ? `<img class="tthumb" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'tthumb none',title:'画像を読み込めませんでした'}))">` : `<span class="tthumb none" title="画像のURLを取得できませんでした"></span>`; }
// 説明の全文(同じ内容ごとにサーバーに保存してあるものを、押したときだけ取りに行く)
const descCache = {};
let fullSeq = 0;
function fullBtn(key) {
  if (!key) return "";
  const id = "f" + (++fullSeq);
  return `<button class="linkbtn" data-full="${esc(key)}" data-box="${id}">全文を表示</button><div class="tfull hide" id="${id}"></div>`;
}
function bindFull() {
  $$("[data-full]").forEach((b) => (b.onclick = async () => {
    const box = document.getElementById(b.dataset.box);
    if (!box) return;
    if (!box.classList.contains("hide")) { box.classList.add("hide"); b.textContent = "全文を表示"; return; }
    const key = b.dataset.full;
    if (descCache[key] === undefined) {
      b.disabled = true; b.textContent = "読み込み中…";
      try { const r = await api(`/listing/desc?key=${encodeURIComponent(key)}`); if (!r.ok) { toast(r.message, true); b.disabled = false; b.textContent = "全文を表示"; return; } descCache[key] = r.desc; }
      catch (e) { toast(e.message, true); b.disabled = false; b.textContent = "全文を表示"; return; }
      b.disabled = false;
    }
    box.textContent = descCache[key];
    box.classList.remove("hide");
    b.textContent = "閉じる";
  }));
}

function renderTypes() {
  const types = state.types || [], counts = state.counts || {}, snap = state.snapshot;
  const nt = nextTypeInfo();
  const typeOf = {}; types.forEach((t) => (typeOf[t.key] = t));
  const rows = types.map((t, i) => {
    const c = counts[t.id];
    const isNext = nt && nt.type && nt.type.id === t.id && !state.settings.paused;
    return `<div class="trow ${isNext ? "is-next" : ""}" data-id="${esc(t.id)}">
      <div class="tnum">${i + 1}</div>
      ${thumb(t.thumb)}
      <div class="tinfo">
        <div class="tlabel">${esc(t.label)}${isNext ? ' <span class="pill ok">次はこれ</span>' : ""}</div>
        <div class="ttitle">${esc(t.title)}</div>
        <div class="tdesc">${esc(t.descHead)}</div>
        ${fullBtn(t.key)}
        <div class="tmeta">${c === null || c === undefined ? '<span class="muted">一致件数: 一覧を読み込むと表示</span>' : c ? `一致 <b>${c}</b>件` : '<span class="bad">一致 0件(飛ばします)</span>'} ・ 更新 ${t.boosted || 0}回${t.lastAt ? ` ・ 最後 ${ago(t.lastAt)}` : ""}</div>
      </div>
      <div class="tact">
        <button class="btn sm gho" data-act="up" ${i === 0 ? "disabled" : ""} aria-label="上へ">↑</button>
        <button class="btn sm gho" data-act="down" ${i === types.length - 1 ? "disabled" : ""} aria-label="下へ">↓</button>
        <button class="btn sm gho" data-act="label">名前</button>
        <button class="btn sm gho" data-act="del">削除</button>
      </div>
    </div>`;
  }).join("");

  // 出品中の一覧は1件ずつ、ゲームクラブと同じく10件ごとのページで表示する。次に更新される1件を光らせる
  const tgt = nextTarget();
  let listHtml = `<div class="center">まだ読み込んでいません。「出品中の一覧を読み込む」を押してください。</div>`;
  let pagerTop = "", pagerBottom = "", tgtJump = "";
  if (snap) {
    const items = snap.items;
    const pages = Math.max(1, Math.ceil(items.length / LIST_PER));
    listPage = Math.min(Math.max(1, listPage), pages);
    const tgtPage = tgt ? Math.floor(tgt.position / LIST_PER) + 1 : null;
    if (tgt) tgtJump = `<button class="btn sm" id="ty_jump">次に更新する出品を表示(${tgtPage}ページ目・${tgt.position + 1}番目)</button>`;
    listHtml = items.slice((listPage - 1) * LIST_PER, listPage * LIST_PER).map((x) => {
      const t = typeOf[x.key];
      const isT = tgt && tgt.productId === x.productId;
      const deal = /取引/.test(x.status || "");
      const isC = !isT && t && !deal; // 今の設定のままなら、いずれ更新される出品
      return `<div class="lrow ${t ? "has" : ""} ${isT ? "is-target" : ""} ${isC ? "is-cand" : ""}" ${isT ? 'id="ty_target"' : ""}>
        <div class="lpos">${x.position + 1}</div>
        ${thumb(x.thumb)}
        <div class="tinfo">
          <div class="ltags">${isT ? '<span class="pill ok tgt">▲ 次に更新</span>' : ""}${x.status ? `<span class="ltag ${deal ? "deal" : ""}">${esc(x.status)}</span>` : ""}${t ? `<span class="pill rep">種類「${esc(t.label)}」${deal ? "・取引中のため対象外" : ""}</span>` : ""}</div>
          <div class="ttitle">${esc(x.title)}</div>
          <div class="tdesc">${esc(x.descHead)}</div>
          ${fullBtn(x.key)}
          <div class="tmeta">商品 ${esc(x.productId)}${x.at ? ` ・ 最後の更新 ${fmtDate(x.at)}` : ""}${x.price ? ` ・ ¥${Number(x.price).toLocaleString()}` : ""}</div>
        </div>
        <div class="tact">${t ? "" : `<button class="btn sm p" data-add="${esc(x.productId)}">種類に追加</button>`}</div>
      </div>`;
    }).join("") || `<div class="center">出品中の商品がありません。</div>`;
    pagerTop = pagerHtml(listPage, pages);
    pagerBottom = pagerHtml(listPage, pages);
  }

  $("#tab-types").innerHTML = `
    <div class="card">
      <h2>更新する種類 <span class="q">${types.length}種類</span></h2>
      <div class="muted" style="margin-bottom:12px">上から順に1回ずつ、${types.length >= 2 ? types.slice(0, 3).map((t) => `「${esc(t.label)}」`).join("→") + (types.length > 3 ? "→…" : "→") + "最初に戻る" : "A→B→C→最初に戻る"}、の順番で更新します。それぞれの種類に一致する出品のうち、一覧でいちばん下にあるものを上げます。一致は<b>タイトルと説明が同じ</b>かどうかで判断します(空白・改行の違いだけは無視します)。一致する出品が0件の種類は飛ばします。</div>
      ${rows || `<div class="center">まだ種類がありません。下の一覧から「種類に追加」を押してください。</div>`}
    </div>
    <div class="card">
      <h2>出品中の一覧 <span class="q">${snap ? `${fmtDate(snap.at)}に読み込み ・ ${snap.items.length}件` : ""}</span></h2>
      <div class="muted" style="margin-bottom:10px">ゲームクラブの「出品中」と同じ並び(上ほど最近更新・下ほど昔)で、5ページ目(50件)まで表示します。<span class="lg lg-t">強く光っている1件</span>が次に自動で更新される出品(種類の順番で、その種類に一致する出品のうち一番下のもの)、<span class="lg lg-c">控えめに光っている出品</span>が今の設定のままならいずれ更新される出品(登録した種類に一致し、取引中でないもの${snap ? `・5ページ目までで${snap.items.filter((y) => typeOf[y.key] && !/取引/.test(y.status || "")).length}件` : ""})です。一覧は、自動更新が1回動くたびと、下のボタンを押したときに最新になります。読み込みには数十秒かかります(サイトに負担をかけないよう、ページの間に数秒あけるため)。</div>
      <div class="row"><button class="btn" id="ty_refresh">出品中の一覧を読み込む</button>${tgtJump}</div>
      <div id="ty_list" style="margin-top:12px">${pagerTop}${listHtml}${pagerBottom}</div>
    </div>`;

  bindFull();
  $$("[data-pg]").forEach((b) => (b.onclick = () => { listPage = Number(b.dataset.pg); renderTypes(); $("#ty_list") && $("#ty_list").scrollIntoView({ behavior: "smooth", block: "start" }); }));
  if ($("#ty_jump")) $("#ty_jump").onclick = () => { listPage = Math.floor(tgt.position / LIST_PER) + 1; renderTypes(); const el = $("#ty_target"); el && el.scrollIntoView({ behavior: "smooth", block: "center" }); };
  $("#ty_refresh").onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = "読み込み中…";
    try { const r = await api("/listing/refresh", { method: "POST", body: "{}" }); toast(`読み込みました(${r.snapshot.items.length}件)`); await refresh(); }
    catch (err) { toast(err.message, true); e.target.disabled = false; e.target.textContent = "出品中の一覧を読み込む"; }
  };
  $$("[data-add]").forEach((b) => (b.onclick = async () => {
    const it = snap.items.find((x) => x.productId === b.dataset.add);
    const label = prompt("この種類の名前(あとで変えられます)", (it?.title || "").slice(0, 20));
    if (label === null) return;
    try { await api("/types", { method: "POST", body: JSON.stringify({ productId: b.dataset.add, label }) }); toast("種類に追加しました"); await refresh(); }
    catch (err) { toast(err.message, true); }
  }));
  $$(".trow [data-act]").forEach((b) => (b.onclick = async () => {
    const id = b.closest(".trow").dataset.id;
    const i = types.findIndex((t) => t.id === id);
    try {
      if (b.dataset.act === "up" || b.dataset.act === "down") {
        const ids = types.map((t) => t.id);
        const j = b.dataset.act === "up" ? i - 1 : i + 1;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await api("/types/order", { method: "POST", body: JSON.stringify({ ids }) });
        toast("順番を変えました(次は1番目から)");
      } else if (b.dataset.act === "label") {
        const label = prompt("新しい名前", types[i].label);
        if (!label) return;
        await api(`/types/${encodeURIComponent(id)}/label`, { method: "POST", body: JSON.stringify({ label }) });
        toast("名前を変えました");
      } else if (b.dataset.act === "del") {
        if (!confirm(`種類「${types[i].label}」を削除しますか?(出品そのものは消えません)`)) return;
        await api(`/types/${encodeURIComponent(id)}`, { method: "DELETE" });
        toast("削除しました");
      }
      await refresh();
    } catch (err) { toast(err.message, true); }
  }));
}

// ---- 設定 ----
function renderSettings() {
  $("#tab-settings").innerHTML = `
    <div class="card">
      <h2>${esc(SN())}のログイン情報(PHPSESSID)</h2>
      <div class="muted" style="margin-bottom:10px">現在: ${state.session.set ? `<span class="pill ok">登録済み</span> ${state.session.updatedAt ? "(" + fmtDate(state.session.updatedAt) + ")" : ""}` : '<span class="pill off">未登録</span>'}</div>
      <div class="field"><label>PHPSESSIDの値</label><input type="password" id="st_sess" placeholder="値の部分だけを貼り付け" autocomplete="off"></div>
      <div class="row">
        <button class="btn p" id="st_sessSave">保存</button>
        <button class="btn" id="st_test" ${!state.session.set ? "disabled" : ""}>接続テスト</button>
        ${state.session.set ? '<button class="btn gho" id="st_sessDel">削除</button>' : ""}
      </div>
      <div class="muted" id="st_testMsg" style="margin-top:10px"></div>
      <details class="help"><summary>値の取り方</summary><div>
        <ol>
          <li>${SN()}を開き、開発者ツール(F12)の「Application」タブへ</li>
          <li>左の Cookies → ${SITE_INFO[site].origin} を選ぶ</li>
          <li><code>PHPSESSID</code> の行の Value をコピーして貼り付け</li>
        </ol>
        ブラウザでログアウトすると無効になります。値は人に見せないでください。
      </div></details>
    </div>
    <div class="card">
      <h2>日本からの外部起動</h2>
      <div class="muted" style="margin-bottom:10px">日本のサーバー(AWS Lambda)が1分おきに下のURLを開くことで、ツールを動かします。URLには合言葉が入っているので、他人に見せないでください。</div>
      <div id="ex_box" class="muted">読み込み中…</div>
    </div>
    <div class="card">
      <h2>通信の出どころテスト</h2>
      <div class="muted" style="margin-bottom:10px">ツールがどこの拠点から${SN()}に通信しているか、日本から通れるかを確かめます(ログインなしのトップページを各1回だけ読みます)。<b>新しくした直後に一度押してください。</b></div>
      <button class="btn" id="st_origin">通信の出どころテスト</button>
      <div id="st_originMsg" style="margin-top:12px"></div>
    </div>`;
  $("#st_sessSave").onclick = async () => { const v = $("#st_sess").value.trim(); if (!v) return toast("値を入力してください", true); try { await api("/session", { method: "POST", body: JSON.stringify({ phpsessid: v }) }); toast("保存しました"); $("#st_sess").value = ""; refresh(); } catch (e) { toast(e.message, true); } };
  if ($("#st_sessDel")) $("#st_sessDel").onclick = async () => { if (!confirm("削除しますか?")) return; await api("/session", { method: "DELETE" }); toast("削除しました"); refresh(); };
  $("#st_test").onclick = async (e) => { e.target.disabled = true; $("#st_testMsg").textContent = "確認中…"; try { const r = await api("/test", { method: "POST", body: "{}" }); window.Snd && (r.ok ? Snd.success() : Snd.fail()); $("#st_testMsg").innerHTML = `<span class="${r.ok ? "okc" : "bad"}">${r.ok ? "✓ " : "✕ "}${esc(r.message)}</span>`; } catch (err) { $("#st_testMsg").textContent = err.message; } e.target.disabled = false; };
  // 外部起動
  const drawExt = (d) => {
    const i = d.info, live = i && nowMs() - i.at < 5 * 60000;
    $("#ex_box").innerHTML = `
      <dl class="dl"><dt>状態</dt><dd>${!i ? "<span class='pill off'>まだ一度も起動されていません</span>" : live ? `<span class='pill ok'>動作中</span> 最後の起動 ${Math.round((nowMs() - i.at) / 1000)}秒前 ・ 国 <b class="${i.country === "JP" ? "okc" : "bad"}">${esc(i.country)}</b> ・ 拠点 ${esc(COLO_NAME[i.colo] || i.colo)}` : `<span class='pill off'>停止中</span> 最後の起動 ${fmtDate(i.at)}`}</dd></dl>
      <div class="exl">起動用URL(合言葉入り)</div>
      <div class="exrow"><input type="password" readonly id="ex_url" value="${esc(d.url)}"><button class="btn sm" id="ex_show">表示</button><button class="btn sm" id="ex_cu">コピー</button></div>
      <div class="row" style="margin-top:10px"><button class="btn gho sm" id="ex_regen">合言葉を作り直す</button><span class="muted" style="font-size:12px">URLを人に見られたときだけ押してください(Lambdaの環境変数も貼り直しが必要です)</span></div>`;
    $("#ex_show").onclick = () => { const e = $("#ex_url"); e.type = e.type === "password" ? "text" : "password"; $("#ex_show").textContent = e.type === "password" ? "表示" : "隠す"; };
    $("#ex_cu").onclick = async () => { try { await navigator.clipboard.writeText(d.url); toast("URLをコピーしました"); } catch { toast("コピーできませんでした。表示してから手動でコピーしてください", true); } };
    $("#ex_regen").onclick = async () => { if (!confirm("合言葉を作り直します。今のURLは使えなくなります。よろしいですか?")) return; try { drawExt(await api("/ext/regen", { method: "POST", body: "{}" })); toast("作り直しました。Lambdaの環境変数も貼り直してください"); } catch (e) { toast(e.message, true); } };
  };
  api("/ext").then(drawExt).catch((e) => { $("#ex_box").textContent = e.message; });
  // 出どころテスト
  $("#st_origin").onclick = async (e) => {
    e.target.disabled = true; $("#st_originMsg").innerHTML = '<span class="muted">確認中…(10秒ほどかかります)</span>';
    try {
      const r = await api("/origin", { method: "POST", body: "{}" });
      const name = (c) => (COLO_NAME[c] ? `${c}(${COLO_NAME[c]})` : c || "不明");
      const rows = r.results.map((x) => {
        const g = x.gc;
        const gLine = g.error ? `<span class="bad">通信エラー: ${esc(g.error)}</span>`
          : g.challenge ? `<span class="bad">✕ 確認画面で止められました(応答${g.status}・出どころ ${esc(name(g.colo))})</span>`
          : g.status === 200 ? `<span class="okc">✓ 通れました(応答200・${g.ms}ms・出どころ ${esc(name(g.colo))})</span>`
          : `<span class="bad">想定外の応答 ${g.status}(出どころ ${esc(name(g.colo))})</span>`;
        const label = x.name === "main" ? "データ本体の保存領域" : "中継専用の保存領域";
        return `<dt>${label}</dt><dd>拠点 ${esc(name(x.where.colo))}${x.where.error ? ` ・ ${esc(x.where.error)}` : ""}${x.inJp ? "" : ' <span class="bad">(日本以外)</span>'}<br>${gLine}${r.chosen === x.name ? ' <span class="pill ok">使用中</span>' : ""}</dd>`;
      }).join("");
      const verdict = r.ok
        ? `<div class="banner info" style="margin:10px 0 0"><div><b>日本から通信できています。</b>更新も、この保存領域から通信します${r.changed ? "(今回切り替えました)" : ""}。</div></div>`
        : '<div class="banner warn" style="margin:10px 0 0"><div><b>日本から通れる保存領域が見つかりませんでした。</b>この結果のスクショを送ってください。</div></div>';
      window.Snd && (r.ok ? Snd.success() : Snd.fail());
      $("#st_originMsg").innerHTML = `<dl class="dl">${rows}</dl>${verdict}`;
    } catch (err) { $("#st_originMsg").textContent = err.message; }
    e.target.disabled = false;
  };
}

const LOG_CATS = ["すべて", "定期実行", "更新", "通信", "管理画面", "アクセス", "システム"];
let opsBuf = [], opsIds = new Set(), opsNewest = "", opsCat = "すべて", opsLevel = "info", opsPaused = false, opsNet = null, opsOpen = new Set(), opsQ = "", opsTrace = "";
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
  try { ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/stream?k=${encodeURIComponent(pw)}&s=${site}`); }
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
      <div class="presets" id="ops_presets">
          <span class="muted">よく使う:</span>
          <button class="btn sm" data-p="pub">出品の結果</button>
          <button class="btn sm" data-p="err">エラーだけ</button>
          <button class="btn sm" data-p="net">${SN()}への通信</button>
          <button class="btn sm gho" data-p="reset">元に戻す</button>
        </div>
        <div class="row" style="margin-top:10px;align-items:center;gap:8px">
        <select id="ops_lvl" style="flex:1 1 160px">
          <option value="info" ${opsLevel === "info" ? "selected" : ""}>重要なものだけ</option>
          <option value="all" ${opsLevel === "all" ? "selected" : ""}>すべて(細かい記録も表示)</option>
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
  // よく使う絞り込み(カテゴリ・表示レベル・検索語をまとめて切り替える)
  $$("#ops_presets [data-p]").forEach((b) => (b.onclick = () => {
    const p = { pub: ["出品", "info", ""], err: ["すべて", "error", ""], net: ["すべて", "info", "cfray"], reset: ["すべて", "info", ""] }[b.dataset.p];
    [opsCat, opsLevel, opsQ] = p; opsTrace = "";
    $$("#ops_cats button").forEach((x) => x.classList.toggle("on", x.dataset.c === opsCat));
    $("#ops_lvl").value = opsLevel; $("#ops_q").value = opsQ;
    $$("#ops_presets [data-p]").forEach((x) => x.classList.toggle("on", x === b && b.dataset.p !== "reset"));
    drawOps();
  }));
  let qt; $("#ops_q").oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => { opsQ = e.target.value.trim(); drawOps(); }, 250); };
  $("#ops_live").onchange = (e) => { opsPaused = !e.target.checked; if (!opsPaused && held.length) { held = []; drawHeld(); drawOps(); } };
  $("#ops_held").onclick = () => { held = []; drawHeld(); drawOps(); };
  $("#ops_dl").onclick = () => {
    const rows = filteredOps();
    const blob = new Blob([JSON.stringify(rows, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    const d = J(nowMs()); a.download = `${site}-log-${d.y}${pad(d.mo)}${pad(d.d)}-${pad(d.h)}${pad(d.mi)}.json`; a.click();
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
    const o = opsBuf.find((x) => x.id === id); if (o) { const tmp = document.createElement("div"); tmp.innerHTML = opHtml(o, false, el.classList.contains("sep")); el.replaceWith(tmp.firstElementChild); }
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
  el.innerHTML = `${SN()}への通信: 今日 <b class="tick">${opsNet.today}</b> / ${opsNet.cap} 回 ・ ${pause}`;
}
function drawCount() { const c = $("#ops_count"); if (c) { const n = filteredOps().length; c.textContent = n ? `${n}件(読み込み済み ${opsBuf.length}件)` : ""; } }
function drawHeld() { const b = $("#ops_held"); if (!b) return; b.classList.toggle("hide", !held.length); b.textContent = `新着 ${held.length}件 ― 押して表示`; }

// 通信の記録の要点(応答・出どころ・所要時間)を、開かなくても見えるバッジにする
function opBadges(o) {
  const x = o.d || {}; let h = "";
  if (x.status != null && (x.cfRay || x.path)) {
    const ok = x.status >= 200 && x.status < 400 && !x.cfMitigated;
    h += `<span class="bd ${ok ? "ok" : "ng"}">${ok ? "✓" : "✕"}${x.status}${x.cfMitigated ? " 確認画面" : ""}</span>`;
  }
  // 出どころは「サイト側で記録された拠点」(cf-rayの末尾)を優先する
  const c = (x.cfRay ? String(x.cfRay).split("-").pop() : "") || x.colo || "";
  if (c) { const jp = ["NRT", "KIX", "FUK", "OKA"].includes(c); h += `<span class="bd ${jp ? "jp" : "ab"}">${esc(COLO_NAME[c] || c)}</span>`; }
  if (x.ms != null && x.status != null) h += `<span class="bd">${x.ms >= 1000 ? (x.ms / 1000).toFixed(1) + "秒" : x.ms + "ms"}</span>`;
  if (x.listingId) h += `<span class="bd ok">出品番号 ${esc(x.listingId)}</span>`;
  return h;
}
function shortTime(t) {
  const d = J(t), n = J(nowMs()), y = J(nowMs() - 86400e3);
  const hm = `${pad(d.h)}:${pad(d.mi)}:${pad(d.s)}`;
  if (d.y === n.y && d.mo === n.mo && d.d === n.d) return `今日 ${hm}`;
  if (d.y === y.y && d.mo === y.mo && d.d === y.d) return `昨日 ${hm}`;
  return `${d.mo}/${d.d} ${hm}`;
}
function opHtml(o, enter, sep) {
  const time = shortTime(o.t);
  const det = o.d ? Object.entries(o.d).map(([k, v]) => `<span class="kv"><i>${esc(OPS_KEY[k] || k)}</i>${esc(typeof v === "object" ? JSON.stringify(v) : String(v))}</span>`).join("") : "";
  const open = opsOpen.has(o.id);
  // 同じ札が2つ並ばないように(カテゴリ「アクセス」とアクセス記録の札は1つにまとめる)
  const src = o.src === "manual" ? '<span class="op-s">手動</span>' : o.src === "access" && o.cat !== "アクセス" ? '<span class="op-s acc">アクセス</span>' : "";
  return `<div class="op ${o.lvl}${enter ? " enter" : ""}${sep ? " sep" : ""}" data-id="${o.id}">
    <div class="op-h"><span class="op-t">${time}</span><span class="op-c">${esc(o.cat)}</span>${o.lvl === "debug" ? '<span class="op-l">細かい記録</span>' : ""}${src}<span class="op-m">${esc(o.msg)}</span>${opBadges(o)}${o.tk ? `<span class="op-k" data-tk="${esc(o.tk)}" title="この処理のログだけ見る">#${esc(o.tk)}</span>` : ""}${det ? `<span class="op-x">${open ? "▲" : "▼"}</span>` : ""}</div>
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
  // 1回の自動実行(処理番号)ごとに区切り線を入れる
  list.innerHTML = rows.map((o, i) => opHtml(o, false, i > 0 && o.tk && rows[i - 1].tk !== o.tk)).join("");
}
const COLO_NAME = { NRT: "東京", KIX: "大阪", FUK: "福岡", OKA: "那覇", ICN: "ソウル", TPE: "台北", HKG: "香港", SIN: "シンガポール", BKK: "バンコク", MNL: "マニラ", SYD: "シドニー", MEL: "メルボルン", BNE: "ブリスベン", LAX: "ロサンゼルス", SJC: "サンノゼ", SEA: "シアトル", DFW: "ダラス", ORD: "シカゴ", DEN: "デンバー", ATL: "アトランタ", MIA: "マイアミ", IAD: "ワシントン", EWR: "ニューアーク", LHR: "ロンドン", FRA: "フランクフルト", AMS: "アムステルダム", CDG: "パリ" };
const OPS_KEY = { path: "アクセス先", method: "方式", status: "応答コード", ms: "所要(ミリ秒)", bytes: "データ量", type: "データの種類", location: "転送先", cfRay: "Cloudflare識別番号", cfCache: "キャッシュ", cfMitigated: "Cloudflareの防御", via: "経由", colo: "拠点", loc: "国", setCookie: "Cookieの更新", waitMs: "待機(ミリ秒)", cookie: "ログイン情報の送信", ua: "名乗り", sendHeaders: "送ったヘッダー", bodyBytes: "送信データ量", todayCount: "今日の通信回数", error: "エラー内容", kind: "エラーの種類", stack: "発生箇所", productId: "商品番号", chatId: "チャット番号", unread: "未読", id: "商品番号", price: "価格", state: "状態", times: "時刻", keys: "変更項目", listingId: "出品番号", url: "出品ページ", pauseUntil: "休止の終了", tracking: "追跡中", queue: "補正待ち", since: "集計開始", waitMs2: "待機" };

// ---- 設定 ----
// ---- サイトの切り替え(画面上部) ----
// ===================================================================
async function loadOverview() {
  try { overview = (await api("/overview")).sites; } catch { overview = overview || null; }
  renderSites();
}
function siteStatus(o) {
  if (!o) return { cls: "", text: "読み込み中…" };
  if (o.error) return { cls: "is-bad", text: "読み込めません" };
  if (o.alert) return { cls: "is-bad", text: o.alert === "session" ? "ログイン切れ" : "拒否された" };
  if (o.pauseUntil && o.pauseUntil > nowMs()) return { cls: "is-bad", text: `休止中 ${fmtTime(o.pauseUntil)}まで` };
  if (o.paused) return { cls: "is-off", text: `オフ ・ 今日 ${o.today}/${o.limit}` };
  if (!o.session) return { cls: "is-bad", text: "ログイン情報なし" };
  return { cls: "is-run", text: `オン ・ 今日 ${o.today}/${o.limit}` };
}
function renderSites() {
  const box = $("#sites"); if (!box) return;
  box.innerHTML = Object.entries(SITE_INFO).map(([id, info]) => {
    const st = siteStatus(overview && overview[id]);
    return `<button class="site-b ${id}${id === site ? " on" : ""}" data-site="${id}" aria-pressed="${id === site}">
      <span class="site-n">${esc(info.name)}</span>
      <span class="site-s ${st.cls}"><i></i>${esc(st.text)}</span>
    </button>`;
  }).join("");
  $$("#sites [data-site]").forEach((b) => (b.onclick = () => switchSite(b.dataset.site)));
}
function switchSite(id) {
  if (id === site || !SITE_INFO[id]) return;
  stopOps();
  clearInterval(boostWatch); boostWatch = null;
  document.body.classList.remove("site-" + site);
  site = id;
  try { localStorage.setItem(SITE_KEY, id); } catch {}
  document.body.classList.add("site-" + site);
  // サイトごとのデータは全部読み直す
  state = null; logs = null; boostInfo = null;
  opsBuf = []; opsIds = new Set(); opsNewest = ""; opsNet = null; opsOpen = new Set(); opsTrace = ""; held = [];
  $$(".tab").forEach((el) => (el.innerHTML = ""));
  renderSites();
  window.Snd && Snd.tabSwitch();
  refresh().then(() => { if (tab === "logs") renderLogs(); });
}


if (pw) { fetch("/api/state", { headers: { "x-admin-key": encodeURIComponent(pw), "x-site": site } }).then((r) => { if (r.ok) start(); else { sessionStorage.removeItem(KEY); } }); }

// build/ から自動生成。直接編集しないでください。
export const PAGE = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>更新スケジューラー</title>
<style>:root{
  --bg:#05060a; --bg2:#0a0d16; --panel:rgba(14,18,30,.72); --panel-solid:#0e1220;
  --line:rgba(57,255,139,.18); --line-pink:rgba(255,45,149,.25);
  --ink:#eafff2; --mut:#7fa6a0; --mut2:#51615f;
  --green:#39ff8b; --green-d:#0a6b3a; --pink:#ff2d95; --pink-d:#8a0f4a;
  --cyan:#38f5e6; --amber:#ffd23c; --bad:#ff5a5a;
  --g3:57,255,139; --c3:56,245,230; --panel3:14,18,30; --deep3:5,7,12; --mut3:127,166,160;
  --green2:#2be38a; --on-green:#042012; --fail:var(--pink); --fail3:255,45,149;
  --r:16px; --r2:11px;
  --glow-g:0 0 10px rgba(57,255,139,.55),0 0 24px rgba(57,255,139,.28);
  --glow-p:0 0 10px rgba(255,45,149,.6),0 0 26px rgba(255,45,149,.3);
  font-family:"Hiragino Kaku Gothic ProN","Noto Sans JP",system-ui,-apple-system,"Segoe UI",sans-serif;
  box-sizing:border-box;padding-top:env(safe-area-inset-top,0);padding-bottom:env(safe-area-inset-bottom,0);
}
*{box-sizing:border-box}
html,body{margin:0}
body{
  background:var(--bg);color:var(--ink);font-size:15px;line-height:1.6;min-height:100vh;-webkit-text-size-adjust:100%;
  background-image:
    radial-gradient(1200px 600px at 15% -10%,rgba(var(--g3),.10),transparent 60%),
    radial-gradient(1000px 500px at 100% 0%,rgba(255,45,149,.10),transparent 55%),
    linear-gradient(transparent 0 97%,rgba(var(--g3),.05) 97% 100%);
  background-size:auto,auto,100% 3px;
  position:relative;overflow-x:hidden;
}
/* 走査線 */
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.14) 2px 3px);mix-blend-mode:multiply;opacity:.5}
/* ふわっと動くグロー背景 */
body::after{content:"";position:fixed;inset:-20%;pointer-events:none;z-index:0;opacity:.5;
  background:radial-gradient(400px 400px at 50% 50%,rgba(var(--c3),.06),transparent 70%);
  animation:drift 22s ease-in-out infinite alternate}
@keyframes drift{0%{transform:translate(-8%,-6%)}100%{transform:translate(10%,8%)}}

button{font-family:inherit;cursor:pointer}
input,select,textarea{font-family:inherit;font-size:15px}
a{color:var(--cyan)}
.wrap{max-width:900px;margin:0 auto;padding:20px 16px 90px;position:relative;z-index:2}

/* ===== ヘッダー / タイトル ===== */
h1{font-size:23px;margin:0;font-weight:800;letter-spacing:.06em;line-height:1.2}
h1 .g{color:var(--green);text-shadow:var(--glow-g)}
h1 .p{color:var(--pink);text-shadow:var(--glow-p)}
.sub{color:var(--mut);font-size:12px;margin-top:4px;letter-spacing:.14em}
.hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}
.dot{width:9px;height:9px;border-radius:50%;display:inline-block;vertical-align:middle;margin-right:7px}
.run{background:var(--green);box-shadow:var(--glow-g);animation:pulse 1.6s ease-in-out infinite}
.pause{background:var(--mut2)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.statusLine{color:var(--mut);font-size:12.5px;margin-top:6px;letter-spacing:.04em}

/* ===== カード ===== */
.card{position:relative;background:var(--panel);backdrop-filter:blur(8px);border:1px solid var(--line);
  border-radius:var(--r);padding:17px;margin-bottom:15px;overflow:hidden;
  box-shadow:0 0 0 1px rgba(var(--g3),.04),0 10px 40px rgba(0,0,0,.5),inset 0 0 30px rgba(var(--g3),.03)}
.card::before{content:"";position:absolute;left:0;top:0;height:2px;width:100%;
  background:linear-gradient(90deg,transparent,var(--green),var(--cyan),var(--pink),transparent);opacity:.7}
.card h2{font-size:13px;margin:0 0 13px;font-weight:700;letter-spacing:.12em;color:var(--green);text-shadow:0 0 8px rgba(var(--g3),.4)}
.card h2 .q{color:var(--mut2);font-weight:400;font-size:11px;margin-left:8px;letter-spacing:.06em;text-shadow:none}

label{display:block;font-size:11.5px;color:var(--mut);margin:0 0 6px;letter-spacing:.08em}
.field{margin-bottom:13px}
input[type=text],input[type=number],input[type=password],select,textarea{
  width:100%;background:rgba(var(--deep3),.7);border:1px solid rgba(var(--g3),.22);color:var(--ink);
  border-radius:var(--r2);padding:11px 13px;outline:none;transition:border-color .15s,box-shadow .15s}
input:focus,select:focus,textarea:focus{border-color:var(--green);box-shadow:0 0 0 2px rgba(var(--g3),.15),var(--glow-g)}
textarea{resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.5}
select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--green) 50%),linear-gradient(135deg,var(--green) 50%,transparent 50%);background-position:calc(100% - 18px) center,calc(100% - 13px) center;background-size:5px 5px,5px 5px;background-repeat:no-repeat}

.row{display:flex;gap:10px;flex-wrap:wrap}
.row>*{flex:1;min-width:120px}

/* ===== ボタン ===== */
.btn{position:relative;background:rgba(var(--deep3),.6);border:1px solid rgba(var(--g3),.35);color:var(--green);
  border-radius:var(--r2);padding:11px 18px;font-size:14px;font-weight:700;letter-spacing:.05em;
  transition:all .13s;text-shadow:0 0 6px rgba(var(--g3),.3);overflow:hidden}
.btn:hover{box-shadow:var(--glow-g);border-color:var(--green);background:rgba(var(--g3),.08)}
.btn:active{transform:translateY(1px) scale(.99)}
.btn.p{background:linear-gradient(135deg,var(--green),var(--green2));border-color:var(--green);color:var(--on-green);text-shadow:none;box-shadow:var(--glow-g)}
.btn.p:hover{filter:brightness(1.12);box-shadow:0 0 16px rgba(var(--g3),.7),0 0 34px rgba(var(--g3),.4)}
.btn.pink{border-color:rgba(255,45,149,.45);color:var(--pink);text-shadow:0 0 6px rgba(255,45,149,.3)}
.btn.pink:hover{box-shadow:var(--glow-p);border-color:var(--pink);background:rgba(255,45,149,.08)}
.btn.sm{padding:6px 12px;font-size:12px;font-weight:600;letter-spacing:.03em}
.btn.gho{background:transparent;border-color:transparent;color:var(--mut);text-shadow:none}
.btn.gho:hover{color:var(--ink);background:rgba(255,255,255,.04);box-shadow:none}
.btn:disabled{opacity:.4;cursor:default;transform:none;box-shadow:none}
/* ボタンのスイープ光 */
.btn.p::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);transform:skewX(-20deg);transition:left .5s}
.btn.p:hover::after{left:130%}

/* ===== タブ ===== */
.tabs{display:flex;gap:4px;background:var(--panel);backdrop-filter:blur(8px);border:1px solid var(--line);
  border-radius:var(--r);padding:5px;margin-bottom:17px;position:sticky;top:env(safe-area-inset-top,0);z-index:9;
  box-shadow:0 8px 30px rgba(0,0,0,.5)}
.tabs button{flex:1;background:transparent;border:0;color:var(--mut);padding:10px 5px;border-radius:9px;
  font-size:12.5px;font-weight:700;letter-spacing:.04em;transition:all .15s;position:relative}
.tabs button:hover{color:var(--ink)}
.tabs button.on{color:var(--on-green);background:linear-gradient(135deg,var(--green),var(--green2));box-shadow:var(--glow-g)}

/* ===== バッジ・ピル ===== */
.pill{display:inline-block;font-size:10.5px;padding:2px 9px;border-radius:999px;border:1px solid var(--mut2);color:var(--mut);letter-spacing:.06em;white-space:nowrap}
.pill.ok{color:var(--green);border-color:rgba(var(--g3),.5);box-shadow:0 0 8px rgba(var(--g3),.2);text-shadow:0 0 6px rgba(var(--g3),.4)}
.pill.off{color:var(--mut2);border-color:var(--mut2)}
.pill.rep{color:var(--cyan);border-color:rgba(var(--c3),.5);text-shadow:0 0 6px rgba(var(--c3),.4)}
.pill.pink{color:var(--pink);border-color:rgba(255,45,149,.5);text-shadow:0 0 6px rgba(255,45,149,.4)}

.muted{color:var(--mut);font-size:12.5px}
.dl{display:grid;grid-template-columns:auto 1fr;gap:7px 14px;font-size:13px}
.dl dt{color:var(--mut);letter-spacing:.04em}
.dl dd{margin:0;text-align:right;font-weight:600}

/* ===== バナー ===== */
.banner{position:relative;border-radius:var(--r);padding:13px 15px;margin-bottom:14px;font-size:13.5px;display:flex;gap:11px;align-items:flex-start;overflow:hidden}
.banner.bad{background:rgba(255,45,149,.1);border:1px solid var(--pink);box-shadow:var(--glow-p)}
.banner.warn{background:rgba(255,210,60,.08);border:1px solid rgba(255,210,60,.4)}
.banner.info{background:rgba(var(--c3),.07);border:1px solid rgba(var(--c3),.35)}
.banner .x{margin-left:auto}

/* ===== 下書き ===== */
.draft{position:relative;border:1px solid var(--line);border-radius:var(--r2);padding:12px 14px;margin-bottom:10px;
  background:rgba(var(--deep3),.5);transition:border-color .15s,box-shadow .15s}
.draft:hover{border-color:rgba(var(--g3),.4)}
.draft.dis{opacity:.45}
.draft.next{border-color:var(--green);box-shadow:var(--glow-g),inset 0 0 20px rgba(var(--g3),.05)}
.draft .top{display:flex;align-items:center;gap:9px}
.draft .nm{font-weight:700;font-size:14px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:.02em}
.draft .meta{font-size:11px;color:var(--mut);margin-top:4px;letter-spacing:.03em}
.draft .meta b{color:var(--green);text-shadow:0 0 6px rgba(var(--g3),.4)}
.draft .acts{display:flex;gap:5px;margin-top:10px;flex-wrap:wrap}
.grip{color:var(--mut2);cursor:grab;font-size:17px;line-height:1;touch-action:none;padding:0 3px}
.grip:hover{color:var(--green)}

/* ===== スロット ===== */
.slots{display:flex;flex-wrap:wrap;gap:7px;margin-top:4px}
.slot{font-size:12px;padding:4px 10px;border-radius:8px;border:1px solid rgba(var(--g3),.2);color:var(--mut);font-variant-numeric:tabular-nums;letter-spacing:.03em;transition:all .15s}
.slot.done{background:rgba(var(--g3),.15);border-color:var(--green);color:var(--green);text-shadow:0 0 6px rgba(var(--g3),.5);box-shadow:0 0 10px rgba(var(--g3),.2)}
.slot.failed{background:rgba(255,70,70,.18);border-color:#ff4646;color:#ff6b6b;text-shadow:0 0 7px rgba(255,70,70,.6);box-shadow:0 0 10px rgba(255,70,70,.25)}
.slot.skipped{color:var(--mut2);text-decoration:line-through;border-color:var(--mut2)}
.slot.now{border-color:var(--cyan);color:var(--cyan);box-shadow:0 0 12px rgba(var(--c3),.5);animation:pulse 1.4s infinite}

/* ===== ログ ===== */
.log{display:flex;gap:11px;padding:10px 3px;border-bottom:1px solid rgba(var(--g3),.08);font-size:12.5px;align-items:flex-start}
.log:last-child{border-bottom:0}
.log .t{color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums;letter-spacing:.03em}
.log .m{flex:1;min-width:0}
.ico{width:7px;height:7px;border-radius:50%;margin-top:7px;flex:none}
.ico.ok{background:var(--green);box-shadow:0 0 8px rgba(var(--g3),.6)}
.ico.ng{background:var(--pink);box-shadow:0 0 8px rgba(255,45,149,.6)}

/* ===== ヒートマップ ===== */
.heat{overflow-x:auto;margin:0 -4px;padding-bottom:4px}
.heat table{border-collapse:collapse;font-size:10px;margin:0 4px}
.heat td,.heat th{width:16px;height:18px;text-align:center;color:var(--mut)}
.heat th{font-weight:400;color:var(--mut2);letter-spacing:0}
.heat td.c{border-radius:3px;transition:transform .1s}
.heat td.c:hover{transform:scale(1.3);outline:1px solid var(--green)}

/* ===== トグルスイッチ ===== */
.switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none}
.switch input{display:none}
.track{width:46px;height:25px;border-radius:999px;background:rgba(var(--deep3),.8);border:1px solid var(--mut2);position:relative;transition:all .2s;flex:none}
.track::after{content:"";position:absolute;top:2px;left:2px;width:19px;height:19px;border-radius:50%;background:var(--mut);transition:all .2s}
.switch input:checked+.track{background:rgba(var(--g3),.2);border-color:var(--green);box-shadow:var(--glow-g)}
.switch input:checked+.track::after{left:23px;background:var(--green);box-shadow:0 0 10px rgba(var(--g3),.8)}

/* ===== トースト ===== */
.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(10px);
  background:var(--panel-solid);border:1px solid var(--green);color:var(--ink);padding:12px 20px;border-radius:999px;
  font-size:13px;z-index:99;box-shadow:var(--glow-g),0 10px 30px rgba(0,0,0,.6);max-width:90%;opacity:0;
  transition:opacity .2s,transform .2s;pointer-events:none;letter-spacing:.03em}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.bad{border-color:var(--pink);box-shadow:var(--glow-p),0 10px 30px rgba(0,0,0,.6)}

.center{text-align:center;color:var(--mut);padding:28px 0;letter-spacing:.04em}
code{background:rgba(var(--deep3),.8);padding:2px 7px;border-radius:5px;font-size:12px;color:var(--cyan);border:1px solid rgba(var(--c3),.2)}
details.help{margin-top:9px}
details.help summary{color:var(--cyan);font-size:12.5px;cursor:pointer;letter-spacing:.03em}
details.help div{font-size:12.5px;color:var(--mut);margin-top:8px;line-height:1.8}
ol{margin:6px 0;padding-left:20px}ol li{margin-bottom:5px}
.hide{display:none!important}

/* ===== ログイン画面 ===== */
.login-wrap{min-height:100vh;display:grid;place-items:center;padding:20px;position:relative;z-index:2}
.login-box{width:min(94%,420px);text-align:center}
.login-title{font-size:30px;font-weight:800;letter-spacing:.08em;margin-bottom:8px}
.login-title .g{color:var(--green);text-shadow:var(--glow-g)}
.login-title .p{color:var(--pink);text-shadow:var(--glow-p)}
.login-sub{color:var(--mut);font-size:12px;letter-spacing:.2em;margin-bottom:28px}
.glitch{position:relative;display:inline-block}

/* ページ読み込み時の一度きりの演出 */
.boot{animation:bootIn .6s ease both}
@keyframes bootIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}

@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important}
  body::after{animation:none}
}

/* 枠の凡例 */
.legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px;font-size:11px;color:var(--mut);letter-spacing:.03em}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend i.lg{width:12px;height:12px;border-radius:4px;display:inline-block;border:1px solid var(--line)}
.legend i.lg.done{background:rgba(var(--g3),.2);border-color:var(--green);box-shadow:0 0 6px rgba(var(--g3),.4)}
.legend i.lg.failed{background:rgba(var(--fail3),.2);border-color:var(--fail);box-shadow:0 0 6px rgba(var(--fail3),.4)}
.legend i.lg.now{border-color:var(--cyan);box-shadow:0 0 6px rgba(var(--c3),.5)}
.legend i.lg.none{border-color:rgba(var(--g3),.2)}

/* ===== 出品モード ===== */
.mode{border:1px solid var(--line);border-radius:var(--r2);padding:13px 14px;margin-bottom:10px;background:rgba(var(--deep3),.5);transition:all .15s}
.mode.on{border-color:var(--green);box-shadow:var(--glow-g),inset 0 0 22px rgba(var(--g3),.06)}
.mode-top{display:flex;align-items:center;gap:9px}
.mode-no{font-size:20px;font-weight:800;color:var(--pink);text-shadow:var(--glow-p);line-height:1}
.mode-name{font-weight:800;font-size:14.5px;flex:1;letter-spacing:.03em}
.mode-ready{font-size:11.5px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);color:var(--mut)}
.mode-ready.high{border-color:rgba(var(--g3),.45);color:var(--green)}
.mode-ready.mid{border-color:rgba(255,210,60,.45);color:var(--amber)}
.mode-ready.low{border-color:rgba(255,45,149,.4);color:#ff8ec4}

/* ===== 切り替えボタン(セグメント) ===== */
.seg{display:flex;gap:4px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:4px;margin-bottom:15px}
.seg button{flex:1;background:transparent;border:0;color:var(--mut);padding:9px 6px;border-radius:9px;font-size:12.5px;font-weight:700;letter-spacing:.02em}
.seg button.on{background:linear-gradient(135deg,var(--pink),#ff5cb0);color:#fff;box-shadow:var(--glow-p)}
.seg.sm{margin-bottom:0;background:rgba(var(--deep3),.6)}
.seg.sm button{font-size:11.5px;padding:7px 4px}
.seg.sm button.on{background:rgba(var(--g3),.16);color:var(--green);box-shadow:inset 0 0 0 1px var(--green)}

/* ===== 曜日×時間の表 ===== */
.grid{overflow-x:auto;margin:4px -4px 0;padding-bottom:6px;-webkit-overflow-scrolling:touch}
.grid table{border-collapse:separate;border-spacing:2px;margin:0 4px}
.grid th{font-size:9.5px;font-weight:500;color:var(--mut2);padding:0;min-width:24px;height:16px;text-align:center}
.grid th.wdh{position:sticky;left:0;background:var(--panel-solid);color:var(--green);font-weight:700;font-size:11px;min-width:20px;z-index:1}
.grid td{width:24px;min-width:24px;height:24px;border-radius:5px;text-align:center;font-size:9.5px;font-weight:700;font-variant-numeric:tabular-nums;border:1px solid rgba(var(--g3),.07);cursor:pointer;transition:transform .08s}
.grid td:hover{transform:scale(1.18);outline:1px solid var(--green);position:relative;z-index:2}
.grid td.sel{outline:2px solid var(--cyan);box-shadow:0 0 10px rgba(var(--c3),.7);position:relative;z-index:2}
.grid-detail{margin-top:10px;font-size:12.5px;color:var(--mut);background:rgba(var(--deep3),.6);border:1px solid var(--line);border-radius:9px;padding:9px 11px;line-height:1.7}
.grid-detail b{color:var(--ink)}

/* ===== ランキング ===== */
.rank{display:flex;align-items:center;gap:10px;padding:9px 2px;border-bottom:1px solid rgba(var(--g3),.08);font-size:13px}
.rank:last-child{border-bottom:0}
.rk{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;background:rgba(255,45,149,.15);color:var(--pink);flex:none}
.rank:nth-child(-n+3) .rk{background:var(--pink);color:#fff;box-shadow:var(--glow-p)}
.rn{font-weight:700;flex:1;letter-spacing:.03em}
.rv{color:var(--mut);font-size:12px;text-align:right}

/* ===== ログ ===== */
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chips button{background:rgba(var(--deep3),.6);border:1px solid var(--line);color:var(--mut);border-radius:999px;padding:5px 11px;font-size:11.5px;font-weight:700}
.chips button.on{border-color:var(--green);color:var(--green);box-shadow:0 0 8px rgba(var(--g3),.35)}
.netbar{font-size:12px;color:var(--mut);margin-bottom:10px;padding:8px 11px;border:1px solid var(--line);border-radius:9px;background:rgba(var(--deep3),.6)}
.netbar b{color:var(--ink)}
.okc{color:var(--green)} .bad{color:var(--pink)}
.newbadge{display:inline-block;margin-left:8px;font-size:10.5px;color:var(--on-green);background:var(--green);border-radius:999px;padding:1px 8px;opacity:0;transition:opacity .25s}
.newbadge.show{opacity:1}
.op{border-left:3px solid rgba(var(--g3),.35);padding:7px 9px;margin:4px 0;border-radius:0 8px 8px 0;background:rgba(var(--deep3),.45);cursor:pointer}
.op.warn{border-left-color:var(--amber);background:rgba(255,210,60,.05)}
.op.error{border-left-color:var(--pink);background:rgba(255,45,149,.07)}
.op-h{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;font-size:12px}
.op-t{color:var(--mut2);font-variant-numeric:tabular-nums;font-size:11px;white-space:nowrap}
.op-c{font-size:10.5px;font-weight:700;color:var(--cyan);border:1px solid rgba(var(--c3),.35);border-radius:6px;padding:0 6px}
.op-s{font-size:10.5px;font-weight:700;color:var(--pink);border:1px solid rgba(255,45,149,.4);border-radius:6px;padding:0 6px}
.op-m{flex:1 1 220px;color:var(--ink);line-height:1.55}
.op.error .op-m{color:#ffb3d6}
.op-x{color:var(--mut2);font-size:10px}
.op-d{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}
.kv{font-size:11px;background:rgba(var(--c3),.06);border:1px solid rgba(var(--c3),.18);border-radius:6px;padding:2px 7px;color:var(--ink);word-break:break-all}
.kv i{font-style:normal;color:var(--mut);margin-right:5px}

/* ===== ログ(詳細版) ===== */
.op-l{font-size:10px;color:var(--mut2);border:1px solid var(--mut2);border-radius:6px;padding:0 5px}
.op.debug{border-left-color:rgba(var(--mut3),.3);background:rgba(var(--deep3),.3)}
.op.debug .op-m{color:var(--mut)}
.op-k{font-size:10px;color:var(--mut2);font-family:ui-monospace,monospace;cursor:pointer;border-bottom:1px dotted var(--mut2)}
.op-k:hover{color:var(--cyan);border-color:var(--cyan)}
.op-s.acc{color:var(--amber);border-color:rgba(255,210,60,.45)}
.trbar{margin-top:10px;font-size:12px;color:var(--mut);padding:7px 10px;border:1px solid rgba(var(--c3),.35);border-radius:9px;background:rgba(var(--c3),.06);display:flex;align-items:center;gap:8px}
.trbar b{color:var(--cyan)}

/* ===== リアルタイム表示(流れるログ) ===== */
.livest{display:inline-flex;align-items:center;gap:6px;margin-left:10px;font-size:10.5px;font-weight:800;letter-spacing:.12em;padding:2px 9px;border-radius:999px;border:1px solid var(--mut2);color:var(--mut);vertical-align:middle}
.livest i{width:7px;height:7px;border-radius:50%;background:var(--mut2);display:inline-block}
.livest.live{color:var(--green);border-color:rgba(var(--g3),.55);box-shadow:0 0 10px rgba(var(--g3),.25)}
.livest.live i{background:var(--green);box-shadow:0 0 8px var(--green);animation:livepulse 1.2s ease-in-out infinite}
.livest.connecting,.livest.retry{color:var(--amber);border-color:rgba(255,210,60,.45)}
.livest.connecting i,.livest.retry i{background:var(--amber);animation:livepulse .6s ease-in-out infinite}
.livest.poll{color:var(--cyan);border-color:rgba(var(--c3),.45)}
.livest.poll i{background:var(--cyan)}
@keyframes livepulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.55);opacity:.45}}

/* 新しい行: 上からスッと滑り込んで、一瞬光ってから落ち着く */
.op.enter{opacity:0;transform:translateY(-10px);max-height:0;margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;overflow:hidden}
.op.enter.in{opacity:1;transform:none;max-height:420px;margin:4px 0;padding:7px 9px;
  transition:opacity .35s ease,transform .45s cubic-bezier(.2,.9,.25,1),max-height .45s cubic-bezier(.2,.9,.25,1),margin .3s,padding .3s;
  animation:opglow 1.4s ease-out .1s}
.op.enter.in.error{animation:opglowp 1.4s ease-out .1s}
@keyframes opglow{0%{box-shadow:0 0 0 1px rgba(var(--g3),.9),0 0 18px rgba(var(--g3),.55);background:rgba(var(--g3),.16)}100%{box-shadow:none}}
@keyframes opglowp{0%{box-shadow:0 0 0 1px rgba(255,45,149,.95),0 0 20px rgba(255,45,149,.6);background:rgba(255,45,149,.2)}100%{box-shadow:none}}
.netbar b.tick{display:inline-block;transition:color .3s}
@media (prefers-reduced-motion:reduce){.op.enter{opacity:1;transform:none;max-height:none;margin:4px 0;padding:7px 9px}}

/* ===== 今すぐ自動出品 ===== */
.fp{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.fp-note{font-size:12px;margin:8px 0 0}
.fp-st{margin-top:10px;padding:9px 12px;border-radius:10px;font-size:13px;border:1px solid var(--line);background:rgba(var(--deep3),.45)}
.fp-st.ok{color:var(--green);border-color:rgba(var(--g3),.45)}
.fp-st.ng{color:#ff8fb8;border-color:rgba(255,45,149,.5)}
.fp-st.wait{color:var(--cyan)}
.spin{display:inline-block;width:11px;height:11px;margin-right:8px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin 1s linear infinite;vertical-align:-1px}
@keyframes spin{to{transform:rotate(360deg)}}

/* ===== ログの見やすさ ===== */
.presets{display:flex;flex-wrap:wrap;gap:6px;align-items:center;width:100%;margin-bottom:8px}
.presets .muted{font-size:12px;margin-right:2px}
.presets .btn.on{border-color:var(--green);color:var(--green);box-shadow:0 0 10px rgba(var(--g3),.35)}
.bd{font-size:11px;padding:1px 7px;border-radius:999px;border:1px solid var(--line);color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums}
.bd.ok{color:var(--green);border-color:rgba(var(--g3),.45)}
.bd.ng{color:#ff8fb8;border-color:rgba(255,45,149,.55)}
.bd.jp{color:var(--cyan);border-color:rgba(var(--c3),.45)}
.bd.ab{color:#ffd23c;border-color:rgba(255,210,60,.45)}
.op.sep{margin-top:12px;position:relative}
.op.sep::before{content:"";position:absolute;left:-3px;right:0;top:-7px;border-top:1px dashed rgba(var(--mut3),.25)}
.op-t{font-variant-numeric:tabular-nums}

/* ===== 原因究明の実験 ===== */
.tblwrap{overflow-x:auto}
.dgt{width:100%;border-collapse:collapse;font-size:13px}
.dgt th,.dgt td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.dgt tr:first-child th{color:var(--green);font-size:12px}
.dgt th:first-child{color:var(--mut);font-weight:600;white-space:nowrap}

/* ===== 日本からの外部起動 ===== */
.exl{font-size:12px;color:var(--mut);margin:12px 0 5px}
.exrow{display:flex;gap:6px;align-items:center}
.exrow input{flex:1;min-width:0;font-family:ui-monospace,monospace;font-size:12px}


/* ===================================================================
   M&Aクラブ(ピンク基調)。変数をまとめて差し替えるだけで全体の色が変わる
   ※:root で別の変数から作った値は引き継がれないので、すべて値で書く
   =================================================================== */
body.site-mac{
  --bg:#0a0508; --bg2:#160a12; --panel:rgba(32,10,24,.72); --panel-solid:#200a18;
  --line:rgba(255,110,199,.18); --line-pink:rgba(255,45,149,.25);
  --ink:#fff0f8; --mut:#c091ad; --mut2:#6e5163;
  --green:#ff6ec7; --green-d:#8a2a5e; --cyan:#ffa0d7;
  --glow-g:0 0 10px rgba(255,110,199,.55),0 0 24px rgba(255,110,199,.28);
  --g3:255,110,199; --c3:255,160,215; --panel3:32,10,24; --deep3:12,4,9; --mut3:192,145,173;
  --green2:#ff4fb0; --on-green:#2a0418; --fail:#ff4646; --fail3:255,70,70;
}
body{transition:background-color .35s ease}

/* ===== サイトの切り替え(画面上部) ===== */
.sites{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:14px 0 16px;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:rgba(var(--deep3),.55)}
.site-b{all:unset;box-sizing:border-box;cursor:pointer;padding:12px 16px 11px;display:flex;flex-direction:column;gap:3px;position:relative;color:var(--mut);transition:background .2s,color .2s}
.site-b + .site-b{border-left:1px solid var(--line)}
.site-b .site-n{font-size:17px;font-weight:800;letter-spacing:.05em;line-height:1.25}
.site-b .site-s{font-size:12px;display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}
.site-b .site-s i{width:7px;height:7px;border-radius:50%;background:var(--mut2);flex:0 0 auto}
.site-b .site-s.is-run i{background:#39ff8b;box-shadow:0 0 6px #39ff8b}
.site-b.mac .site-s.is-run i{background:#ff6ec7;box-shadow:0 0 6px #ff6ec7}
.site-b .site-s.is-bad{color:#ff8fb8}.site-b .site-s.is-bad i{background:#ff5a5a;box-shadow:0 0 6px #ff5a5a}
.site-b::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;opacity:0;transition:opacity .2s}
.site-b.gc::after{background:#39ff8b;box-shadow:0 0 12px #39ff8b}
.site-b.mac::after{background:#ff6ec7;box-shadow:0 0 12px #ff6ec7}
.site-b.on{color:var(--ink);background:rgba(var(--g3),.08)}
.site-b.on .site-n{color:var(--green);text-shadow:var(--glow-g)}
.site-b.on::after{opacity:1}
.site-b:not(.on):hover{color:var(--ink);background:rgba(255,255,255,.03)}
.site-b:focus-visible{outline:2px solid var(--cyan);outline-offset:-2px}

/* ===== 次の出品 ===== */
.nextcard .next-big{font-size:40px;font-weight:800;color:var(--green);text-shadow:var(--glow-g);letter-spacing:.03em;line-height:1.15;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;flex-wrap:wrap;gap:6px 16px}
.nextcard .next-big.off{font-size:22px;color:var(--mut);text-shadow:none}
.nextcard .next-left{font-size:17px;font-weight:700;color:var(--cyan);text-shadow:0 0 8px rgba(var(--c3),.5)}
.nextcard .next-why{margin-top:8px;color:var(--ink);font-size:14px}
.nextcard .next-note{font-size:12px;margin-top:4px}
.nextcard .next-sub{margin-top:14px;font-size:13px;font-weight:700;color:var(--green)}
.nextcard .next-list{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:4px}
.nextcard .next-list li{display:flex;gap:12px;align-items:baseline;font-size:14px;padding:5px 10px;border:1px solid var(--line);border-radius:9px;background:rgba(var(--deep3),.4)}
.nextcard .next-list li b{min-width:86px;font-variant-numeric:tabular-nums;color:var(--ink)}
.nextcard .next-list li span{color:var(--mut);font-size:13px}
.slot small{display:block;font-size:10.5px;opacity:.85;letter-spacing:0;text-shadow:none}

/* ===== 下書き一覧の追加分 ===== */
.dhint{font-size:12.5px;margin:-4px 0 10px}
.draft .dtitle{font-size:13px;color:var(--ink);opacity:.82;margin:2px 0 0 26px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ===== 下書きエディタ(シート) ===== */
body.ed-open{overflow:hidden}
#sheet{position:relative;z-index:50}
.ed-back{position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:50}
.ed{position:fixed;z-index:51;left:50%;top:max(3vh,env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(820px,calc(100vw - 20px));max-height:calc(100dvh - 6vh);display:flex;flex-direction:column;background:var(--panel-solid);border:1px solid rgba(var(--g3),.4);border-radius:var(--r);box-shadow:0 0 0 1px rgba(var(--g3),.08),0 20px 60px rgba(0,0,0,.6),0 0 40px rgba(var(--g3),.12);animation:edIn .22s ease-out}
@keyframes edIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
.ed-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--line)}
.ed-head h2{margin:2px 0 0;font-size:18px;line-height:1.35}
.ed-site{font-size:12px;color:var(--green);font-weight:700;letter-spacing:.06em}
.ed-body{overflow-y:auto;padding:16px 18px 6px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
.ed-row{display:grid;grid-template-columns:1fr 200px;gap:12px}
.ed-f{margin-bottom:16px;padding-left:10px;border-left:2px solid transparent;transition:border-color .2s}
.ed-f.chg{border-left-color:var(--green)}
.ed-f.err{border-left-color:#ff5a5a}
.ed-f.err input,.ed-f.err textarea{border-color:#ff5a5a}
.ed-f label{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px}
.ed-f label code{font-size:12.5px;color:var(--cyan);background:none;padding:0}
.ed-note{font-weight:400;color:var(--mut);font-size:12px}
.ed-count{margin-left:auto;font-weight:400;color:var(--mut);font-size:12px;font-variant-numeric:tabular-nums}
.ed-hint{font-size:12px;color:var(--mut);margin-top:4px}
.ed-f input,.ed-f textarea{width:100%}
.ed-f textarea{resize:vertical;line-height:1.7;min-height:4.5em}
.ed-f textarea.ed-long{min-height:16em}
.ed-f input[disabled]{opacity:.55}
.ed-price{display:flex;align-items:center;gap:8px;max-width:240px}
.ed-price input{font-size:18px;font-weight:700;font-variant-numeric:tabular-nums}
.ed-price span{color:var(--mut)}
.ed-more{margin:4px 0 14px;border:1px solid var(--line);border-radius:var(--r2);background:rgba(var(--deep3),.35)}
.ed-more summary{cursor:pointer;padding:10px 12px;font-size:13.5px;font-weight:700}
.ed-more summary .muted{font-weight:400;font-size:12px;margin-left:6px}
.ed-more-b{padding:6px 12px 2px}
.ed-o{margin-bottom:12px}
.ed-o.file .ed-on{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12.5px;color:var(--mut);padding-left:12px}
.ed-o.file code{color:var(--cyan);background:none;padding:0}
.ed-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);background:rgba(var(--deep3),.5);border-radius:0 0 var(--r) var(--r)}
.ed-msg{flex:1 1 180px;font-size:12.5px;color:var(--mut);min-height:1.2em}
.ed-msg.bad{color:#ff8fb8;font-weight:700}
@media (max-width:620px){
  .ed{top:0;width:100vw;max-height:100dvh;height:100dvh;border-radius:0;border-left:0;border-right:0}
  .ed-foot{border-radius:0}
  .ed-row{grid-template-columns:1fr}
  .ed-foot .btn{flex:1 1 auto}
  .site-b{padding:10px 12px}.site-b .site-n{font-size:15px}
}
@media (prefers-reduced-motion:reduce){.ed{animation:none}body{transition:none}}

/* ===== 説明文の一括書き換え ===== */
.bulkcard .row{align-items:center;gap:10px}
.bk-from{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;font-size:13px}
.bk-from select{flex:1 1 220px;max-width:100%}
.bk-site{border:1px solid var(--line);border-radius:var(--r2);margin-bottom:12px;overflow:hidden;background:rgba(var(--deep3),.35)}
.bk-site.gc{border-left:3px solid #39ff8b}
.bk-site.mac{border-left:3px solid #ff6ec7}
.bk-sh{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--line);font-weight:700;font-size:14px}
.bk-sh .bk-n{color:var(--mut);font-weight:400;font-size:12.5px;margin-right:auto;font-variant-numeric:tabular-nums}
.bk-i{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;cursor:pointer;border-top:1px solid rgba(255,255,255,.04);font-weight:400}
.bk-i:first-of-type{border-top:0}
.bk-i:hover{background:rgba(255,255,255,.025)}
.bk-i input{width:18px;height:18px;margin-top:2px;flex:0 0 auto;accent-color:var(--green)}
.bk-i span{min-width:0;display:flex;flex-direction:column}
.bk-i b{font-size:14px;color:var(--ink)}
.bk-i small{color:var(--mut);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bk-i.dis{opacity:.5;cursor:default}
.bk-empty{padding:10px 12px;font-size:13px}
.bk-pre{white-space:pre-wrap;word-break:break-word;margin:0;padding:12px 14px;border:1px solid rgba(var(--g3),.35);border-radius:var(--r2);background:rgba(var(--deep3),.6);font:inherit;font-size:14px;line-height:1.7;max-height:16em;overflow:auto}
.bk-cmp{padding:9px 12px;border:1px solid var(--line);border-radius:var(--r2);margin-bottom:8px;font-size:13px}
.bk-ch{display:flex;align-items:center;gap:8px;margin-bottom:3px}
.bk-ch b{font-size:14px}
.bk-tag{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid}
.bk-tag.gc{color:#39ff8b;border-color:rgba(57,255,139,.5)}
.bk-tag.mac{color:#ff6ec7;border-color:rgba(255,110,199,.5)}
.bk-before{color:var(--mut);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bk-before i{font-style:normal;font-size:11px;border:1px solid var(--line);border-radius:6px;padding:0 6px;margin-right:6px}
.bk-i .bk-t{display:flex;flex-direction:row;align-items:center;gap:8px;flex-wrap:wrap}
.bk-i .bk-t .pill{font-size:11px}
.bk-i small{font-weight:400}

/* ===== 更新する種類・出品中の一覧 ===== */
.trow,.lrow{display:grid;grid-template-columns:auto 64px 1fr auto;gap:12px;align-items:start;padding:12px 0;border-top:1px solid var(--line)}
.lrow{grid-template-columns:64px 1fr auto}
.trow:first-of-type,.lrow:first-of-type{border-top:0}
.trow.is-next{background:linear-gradient(90deg,rgba(var(--c3),.08),transparent 70%);border-radius:var(--r2);padding-left:8px;padding-right:8px}
.lrow.has{opacity:.72}
.tnum{font-size:22px;font-weight:800;line-height:1;color:var(--cyan);text-shadow:0 0 8px rgba(var(--c3),.5);min-width:1.4em;text-align:center;padding-top:6px;font-variant-numeric:tabular-nums}
.tthumb{width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line);background:var(--bg2);display:block}
.tthumb.none{display:inline-block}
.tinfo{min-width:0}
.tlabel{font-weight:700;color:var(--ink);margin-bottom:2px}
.ttitle{font-size:13px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tdesc{font-size:12px;color:var(--mut);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-line;margin-top:2px}
.tmeta{font-size:12px;color:var(--mut);margin-top:6px}
.tact{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:210px}
@media (max-width:600px){
  .trow{grid-template-columns:auto 52px 1fr}
  .lrow{grid-template-columns:52px 1fr}
  .tthumb{width:52px;height:52px}
  .trow .tact,.lrow .tact{grid-column:1/-1;justify-content:flex-start;max-width:none}
}

/* ===== 更新の履歴 ===== */
.hrow{display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--line);font-size:13px;align-items:baseline}
.hrow:first-child{border-top:0}
.hrow-t{color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums;min-width:6.5em}
.hrow-m{min-width:0;overflow-wrap:anywhere}
.hrow.ok .hrow-m{color:var(--ink)}
.hrow.ng .hrow-m{color:#ff8a8a}

/* 説明の全文 */
.linkbtn{background:none;border:0;padding:2px 0;margin-top:4px;color:var(--green);font:inherit;font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.linkbtn:disabled{opacity:.6;cursor:default}
.tfull{white-space:pre-wrap;word-break:break-word;font-size:12.5px;line-height:1.7;color:var(--ink);background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:6px;max-height:460px;overflow:auto}
.tfull.hide{display:none}
</style>
</head>
<body>
<div id="login" class="login-wrap">
  <div class="login-box boot">
    <div class="login-title"><span class="g">更新</span><span class="p">スケジューラー</span></div>
    <div class="login-sub">ゲームクラブ ／ M&amp;Aクラブ 自動更新</div>
    <div class="card" style="text-align:left">
      <div class="field">
        <label>管理パスワード</label>
        <input type="password" id="pw" placeholder="ADMIN_PASSWORD" autocomplete="current-password">
      </div>
      <button class="btn p" id="loginBtn" style="width:100%">接続する</button>
      <div class="muted" style="margin-top:11px" id="loginMsg"></div>
    </div>
  </div>
</div>

<div id="app" class="wrap hide">
  <div class="hd">
    <div>
      <h1><span class="g">更新</span><span class="p">スケジューラー</span></h1>
      <div class="statusLine" id="statusLine">接続中…</div>
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      <button class="btn gho sm" id="soundToggle" title="サウンド切替">♪ ON</button>
      <button class="btn gho sm" id="logout">切断</button>
    </div>
  </div>
  <nav class="sites" id="sites" aria-label="操作するサイト"></nav>
  <div id="banners"></div>
  <div class="tabs">
    <button data-tab="home" class="on">ホーム</button>
    <button data-tab="types">種類</button>
    <button data-tab="logs">ログ</button>
    <button data-tab="settings">設定</button>
  </div>
  <div id="tab-home" class="tab"></div>
  <div id="tab-types" class="tab hide"></div>
  <div id="tab-logs" class="tab hide"></div>
  <div id="tab-settings" class="tab hide"></div>
</div>
<div id="sheet"></div>
<div class="toast" id="toast"></div>
<script>// Web Audio で操作音・タイピング音を合成します(音声ファイル不要)。
// 初回クリック後に有効化されます(ブラウザの自動再生制限のため)。
const Snd = (() => {
  let ctx = null, master = null, on = true;
  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch { on = false; }
  }
  function resume() { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); }

  function tone(freq, dur, type = "sine", vol = 1, slideTo = null) {
    if (!on) return;
    ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.5, hp = 1200) {
    if (!on) return;
    ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  // タイピング音(キーごとに少し高さを散らす)
  let lastKey = 0;
  function key() {
    const now = performance.now();
    if (now - lastKey < 18) return; // 連打抑制
    lastKey = now;
    noise(0.025, 0.35, 2600 + Math.random() * 1400);
    tone(420 + Math.random() * 180, 0.03, "square", 0.08);
  }
  const api = {
    resume,
    setEnabled(v) { on = v; if (v) resume(); },
    enabled: () => on,
    key,
    click() { tone(660, 0.05, "triangle", 0.5); noise(0.02, 0.2, 2000); },
    tabSwitch() { tone(520, 0.06, "sine", 0.4, 780); },
    toggleOn() { tone(600, 0.07, "sine", 0.5, 1000); tone(1000, 0.09, "sine", 0.3); },
    toggleOff() { tone(700, 0.08, "sine", 0.5, 380); },
    save() { tone(700, 0.07, "triangle", 0.4, 950); setTimeout(() => tone(1100, 0.1, "sine", 0.35), 70); },
    success() { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.14, "triangle", 0.45), i * 80)); },
    fail() { tone(300, 0.18, "sawtooth", 0.4, 140); setTimeout(() => tone(220, 0.2, "sawtooth", 0.35, 110), 90); },
    publish() { // 出品成功の華やかな音
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.4), i * 70));
      setTimeout(() => noise(0.15, 0.25, 3000), 60);
    },
    hover() { tone(900, 0.02, "sine", 0.08); },
    boot() { tone(200, 0.3, "sawtooth", 0.3, 800); setTimeout(() => tone(1200, 0.2, "sine", 0.2), 150); },
  };
  return api;
})();
window.Snd = Snd;
</script>
<script>"use strict";
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

function hm2str(m) { return \`\${Math.floor(m / 60)}:\${pad(m % 60)}\`; }
// ===== 時刻はすべて「サーバー(インターネット)の時計」×「日本時間」で扱う =====
// 端末の時計がずれていても影響しないよう、サーバーの現在時刻との差を記録して補正します。
let clockOffset = 0;
const nowMs = () => Date.now() + clockOffset;
const J = (ms) => { const d = new Date(ms + 9 * 3600e3); return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay() }; };
function fmtTime(ms) { const d = J(ms); return \`\${pad(d.h)}:\${pad(d.mi)}\`; }
function fmtDate(ms) { const d = J(ms), n = J(nowMs()); const t = \`\${pad(d.h)}:\${pad(d.mi)}\`; if (d.y === n.y && d.mo === n.mo && d.d === n.d) return \`今日 \${t}\`; return \`\${d.mo}/\${d.d} \${t}\`; }
function ago(ms) { const s = (nowMs() - ms) / 1000; if (s < 90) return "さっき"; if (s < 3600) return \`\${Math.floor(s / 60)}分前\`; if (s < 86400) return \`\${Math.floor(s / 3600)}時間前\`; return \`\${Math.floor(s / 86400)}日前\`; }

let toastT;
function toast(msg, bad) {
  const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
  if(window.Snd){ bad?Snd.fail():Snd.success(); } clearTimeout(toastT); toastT = setTimeout(() => (t.className = "toast"), 2600);
}

async function api(path, opts = {}) {
  const res = await fetch("/api" + path, { ...opts, headers: { "Content-Type": "application/json", "x-admin-key": encodeURIComponent(pw), "x-site": site, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { sessionStorage.removeItem(KEY); location.reload(); throw new Error("auth"); }
  if (!res.ok) throw new Error(data.error || \`エラー(\${res.status})\`);
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
    ? \`<span class="dot pause"></span>自動更新オフ\`
    : \`<span class="dot run"></span>自動更新オン ・ 今日 \${state.today.count}/\${s.dailyLimit} 回\`) + \` ・ <span id="clock" title="インターネット(サーバー)の時刻・日本時間"></span>\`;
  tickClock();
  renderBanners();
  if (tab === "home") renderHome();
  if (tab === "types") renderTypes();
  if (tab === "logs" && !$("#ops_list")) renderLogs();
  if (tab === "settings" && (!$("#tab-settings").children.length || !quietRender)) renderSettings();
}

function tickClock() {
  const el = document.getElementById("clock"); if (!el) return;
  const d = J(nowMs());
  el.textContent = \`\${d.mo}/\${d.d} \${pad(d.h)}:\${pad(d.mi)}:\${pad(d.s)} JST\`;
}
setInterval(tickClock, 1000);

function renderBanners() {
  const b = $("#banners"); b.innerHTML = "";
  const a = state.alert;
  if (a) {
    const head = a.kind === "session" ? "ログイン状態が切れたため、自動更新を止めています" : a.kind === "blocked" ? "Cloudflareの確認画面で止められたため、自動更新を止めています" : "自動更新を止めています";
    const how = a.kind === "session" ? "設定タブでPHPSESSIDを貼り直すと、警告が消えて再開します。" : "原因を確かめてから右の×で警告を消すと、次の予定枠から再開します。止められた直後は60分の休止もかかっています。";
    b.innerHTML += \`<div class="banner \${a.kind === "session" ? "warn" : "bad"}"><div><b>\${head}</b><br>\${esc(a.message)}<br><span class="muted">\${how} ・ \${fmtDate(a.at)}</span></div><button class="btn gho sm x" onclick="clearAlert()" aria-label="警告を消す">×</button></div>\`;
  }
  if (!state.session.set) b.innerHTML += \`<div class="banner info">はじめに「設定」タブで、\${SN()}のログイン情報(PHPSESSID)を登録してください。</div>\`;
  else if (!(state.types || []).length) b.innerHTML += \`<div class="banner info">「種類」タブで、更新する出品の種類を登録してください。登録した順番で更新します。</div>\`;
  const t = state.lastTick;
  if (t && nowMs() - t > 20 * 60000) b.innerHTML += \`<div class="banner warn">自動実行が\${ago(t)}から動いていないようです。日本のサーバー(外部起動)とCloudflareの Workers → gc-scheduler → Logs を確認してください(\${SN()})。</div>\`;
  const x = state.ext;
  if (x && nowMs() - x.at > 5 * 60000 && !state.settings.paused) b.innerHTML += \`<div class="banner warn"><div><b>日本からの外部起動が止まっています</b>(最後: \${fmtDate(x.at)})。AWSのLambda(gc-trigger)が動いているか確認してください。止まっている間は、\${SN()}に止められる可能性が高いです。</div></div>\`;
  else if (x && x.country !== "JP") b.innerHTML += \`<div class="banner warn"><div><b>外部起動の国が日本ではありません</b>(国 \${esc(x.country)})。起動元のサーバーが日本のリージョンにあるか確認してください。</div></div>\`;
}
window.clearAlert = async () => { await api("/alert/clear", { method: "POST" }); refresh(); };

// ---- ホーム ----
// 「次の更新」までの残り時間を1秒ごとに更新
function fmtLeft(ms) {
  if (ms <= 0) return "まもなく(1分以内)";
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h ? \`あと \${h}時間\${pad(m)}分\${pad(sec)}秒\` : \`あと \${m}分\${pad(sec)}秒\`;
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
  const t = \`\${d.h}:\${pad(d.mi)}\`;
  if (d.y === n.y && d.mo === n.mo && d.d === n.d) return t;
  if (d.y === tm.y && d.mo === tm.mo && d.d === tm.d) return \`明日 \${t}\`;
  return \`\${d.mo}/\${d.d} \${t}\`;
}

// ---- ホーム ----
let boostInfo = null; // /boost の結果(今すぐ1回の予約・結果・履歴)
async function loadBoost() { try { boostInfo = await api("/boost"); } catch { boostInfo = boostInfo || null; } }
const KIND = { boosted: "更新しました", blocked: "確認画面で止められた", session: "ログイン切れ", unconfirmed: "送れたが未確認", unknown: "想定外の応答", notfound: "商品が見つからない", empty: "対象なし", nomatch: "一致する出品なし", notypes: "種類が未登録", limit: "今日の上限", interval: "間隔ルール", paused: "休止中", network: "通信エラー", expired: "予約切れ", nosession: "ログイン情報なし" };
const timeModeText = (s) => \`24時間で均等(約\${Math.round(1440 / Math.max(1, s.dailyLimit))}分おき)\`;

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
    return \`<span class="slot \${cls} \${isNext ? "now" : ""}" title="\${tip}">\${mark}\${hm2str(m)}</span>\`;
  }).join("");
}

function historyRow(h) {
  const ok = h.ok;
  return \`<div class="hrow \${ok ? "ok" : "ng"}">
    <span class="hrow-t">\${fmtDate(h.at)}</span>
    <span class="hrow-m">\${ok ? "✓" : "✕"} \${h.type ? \`<b>\${esc(h.type)}</b> ・ \` : ""}\${esc(ok ? h.message : \`\${KIND[h.kind] || h.kind}: \${h.message}\`)}\${h.manual ? ' <span class="pill off">手動</span>' : ""}</span>
  </div>\`;
}

function renderHome() {
  const s = state.settings;
  const plan = state.plan || [];
  const next = plan[0];
  const nt = nextTypeInfo();
  const ext = state.ext && nowMs() - state.ext.at < 5 * 60000;
  const nextTypeLine = !nt ? \`<span class="bad">種類が未登録です。「種類」タブで登録してください。</span>\`
    : !nt.type ? \`<span class="bad">登録した種類のどれにも一致する出品がありません。</span>\`
    : \`「\${esc(nt.type.label)}」\${nt.count === null || nt.count === undefined ? "" : \`(一致 \${nt.count}件・いちばん下のものを上げます)\`}\${nt.skipped ? \` <span class="muted">一致0件の種類を\${nt.skipped}つ飛ばします</span>\` : ""}\`;
  const hist = (boostInfo && boostInfo.history) || [];
  const res = boostInfo && boostInfo.result;
  const pending = (boostInfo && boostInfo.pending) || state.reserve;

  $("#tab-home").innerHTML = \`
    <div class="card">
      <h2>自動更新 <span class="q">\${esc(SN())} ・ 1日\${s.dailyLimit}回まで(出品と合わせて)</span></h2>
      <label class="switch" style="margin-bottom:14px">
        <input type="checkbox" id="pauseToggle" \${!s.paused ? "checked" : ""}>
        <span class="track"></span>
        <span>\${s.paused ? "オフ: 予定時刻になっても更新しません" : \`オン: \${esc(timeModeText(s))}に、種類の順番で更新します\`}</span>
      </label>
      <dl class="dl">
        <dt>今日の回数</dt><dd>\${state.today.count} / \${s.dailyLimit} 回\${state.today.boosts && state.today.boosts !== state.today.count ? \` <span class="muted">(うち更新 \${state.today.boosts}回)</span>\` : ""}</dd>
        <dt>更新の時刻</dt><dd>\${esc(timeModeText(s))}</dd>
        <dt>ログイン状態</dt><dd>\${state.session.set ? "<span class='pill ok'>登録済み</span>" : "<span class='pill off'>未登録</span>"}</dd>
        <dt>起動のしかた</dt><dd>\${ext ? \`<span class='pill ok'>日本からの外部起動</span> <span class='muted'>\${Math.max(0, Math.round((nowMs() - state.ext.at) / 1000))}秒前</span>\` : "<span class='pill off'>外部起動が止まっています</span>"}</dd>
      </dl>
    </div>

    <div class="card nextcard">
      <h2>次の更新</h2>
      \${s.paused ? \`<div class="next-big off">オフ</div><div class="next-why">スイッチをオンにすると、予定時刻に自動で更新します。</div>\`
        : !next ? \`<div class="next-big off">予定なし</div>\`
        : \`<div class="next-big">\${dayTime(next.at)}<span class="next-left" id="nextLeft">\${fmtLeft(next.at - nowMs())}</span></div>
           <div class="next-why">更新する種類: \${nextTypeLine}</div>
           <div class="muted next-note">自動実行は1分おきなので、実際の更新はこの時刻から1分以内です。前回から\${s.minIntervalMin}分たっていないときは少し後ろにずれます。</div>
           \${plan.length > 1 ? \`<div class="next-sub">このあとの予定</div><ul class="next-list">\${plan.slice(1).map((p) => \`<li><b>\${dayTime(p.at)}</b><span>\${hm2str(p.slot)}の枠</span></li>\`).join("")}</ul>\` : ""}\`}
    </div>

    <div class="card">
      <h2>今日の予定 <span class="q">\${state.slots.length}枠</span></h2>
      <div class="slots">\${slotChips()}</div>
      <div class="legend"><span><i class="lg done"></i>更新した</span><span><i class="lg failed"></i>更新しなかった</span><span><i class="lg now"></i>次の枠</span><span><i class="lg none"></i>これから</span></div>
    </div>

    <div class="card">
      <h2>今すぐ1回更新</h2>
      <div class="muted" style="margin-bottom:10px">予定とは別に、次の自動実行(1分以内)で1回だけ更新します。種類の順番どおりに選びます。スイッチがオフでも動きます。今日の回数を1つ使います。</div>
      <button class="btn p" id="nowBtn" \${pending ? "disabled" : ""}>今すぐ1回更新</button>
      <div id="nowMsg" style="margin-top:10px">\${pending ? \`<span class="muted">実行待ち…(予約 \${fmtTime(pending.at)})</span>\` : res ? historyRow({ ...res, type: res.typeLabel, manual: true }) : ""}</div>
    </div>

    <div class="card">
      <h2>最近の更新</h2>
      <div id="homeHist">\${hist.length ? hist.slice(0, 12).map(historyRow).join("") : "<div class='center'>まだ更新していません</div>"}</div>
    </div>\`;

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
      $("#nowMsg").innerHTML = \`<span class="muted">実行待ち…(予約 \${fmtTime(r.at)})</span>\`;
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
      if (got) { toast(r.ok ? "更新しました" : \`更新できませんでした: \${KIND[r.kind] || r.kind}\`, !r.ok); }
      await refresh(true);
    }
  }, 8000);
}

// ---- 種類 ----
function thumb(src) { return src ? \`<img class="tthumb" src="\${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'tthumb none',title:'画像を読み込めませんでした'}))">\` : \`<span class="tthumb none" title="画像のURLを取得できませんでした"></span>\`; }
// 説明の全文(同じ内容ごとにサーバーに保存してあるものを、押したときだけ取りに行く)
const descCache = {};
let fullSeq = 0;
function fullBtn(key) {
  if (!key) return "";
  const id = "f" + (++fullSeq);
  return \`<button class="linkbtn" data-full="\${esc(key)}" data-box="\${id}">全文を表示</button><div class="tfull hide" id="\${id}"></div>\`;
}
function bindFull() {
  $$("[data-full]").forEach((b) => (b.onclick = async () => {
    const box = document.getElementById(b.dataset.box);
    if (!box) return;
    if (!box.classList.contains("hide")) { box.classList.add("hide"); b.textContent = "全文を表示"; return; }
    const key = b.dataset.full;
    if (descCache[key] === undefined) {
      b.disabled = true; b.textContent = "読み込み中…";
      try { const r = await api(\`/listing/desc?key=\${encodeURIComponent(key)}\`); if (!r.ok) { toast(r.message, true); b.disabled = false; b.textContent = "全文を表示"; return; } descCache[key] = r.desc; }
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
    return \`<div class="trow \${isNext ? "is-next" : ""}" data-id="\${esc(t.id)}">
      <div class="tnum">\${i + 1}</div>
      \${thumb(t.thumb)}
      <div class="tinfo">
        <div class="tlabel">\${esc(t.label)}\${isNext ? ' <span class="pill ok">次はこれ</span>' : ""}</div>
        <div class="ttitle">\${esc(t.title)}</div>
        <div class="tdesc">\${esc(t.descHead)}</div>
        \${fullBtn(t.key)}
        <div class="tmeta">\${c === null || c === undefined ? '<span class="muted">一致件数: 一覧を読み込むと表示</span>' : c ? \`一致 <b>\${c}</b>件\` : '<span class="bad">一致 0件(飛ばします)</span>'} ・ 更新 \${t.boosted || 0}回\${t.lastAt ? \` ・ 最後 \${ago(t.lastAt)}\` : ""}</div>
      </div>
      <div class="tact">
        <button class="btn sm gho" data-act="up" \${i === 0 ? "disabled" : ""} aria-label="上へ">↑</button>
        <button class="btn sm gho" data-act="down" \${i === types.length - 1 ? "disabled" : ""} aria-label="下へ">↓</button>
        <button class="btn sm gho" data-act="label">名前</button>
        <button class="btn sm gho" data-act="del">削除</button>
      </div>
    </div>\`;
  }).join("");

  // 一覧は「同じ内容(タイトル+説明)」ごとにまとめて表示する
  let listHtml = \`<div class="center">まだ読み込んでいません。「出品中の一覧を読み込む」を押してください。</div>\`;
  if (snap) {
    const groups = [];
    const byKey = {};
    for (const x of snap.items) {
      if (!byKey[x.key]) { byKey[x.key] = { key: x.key, items: [] }; groups.push(byKey[x.key]); }
      byKey[x.key].items.push(x);
    }
    listHtml = groups.map((g) => {
      const x = g.items[0], t = typeOf[g.key];
      const free = g.items.filter((y) => !/取引/.test(y.status || ""));
      const pos = g.items.map((y) => \`\${y.position + 1}\`).join("・");
      return \`<div class="lrow \${t ? "has" : ""}">
        \${thumb(x.thumb)}
        <div class="tinfo">
          <div class="ttitle">\${esc(x.title)}</div>
          <div class="tdesc">\${esc(x.descHead)}</div>
          \${fullBtn(g.key)}
          <div class="tmeta">\${g.items.length}件(一覧の\${pos}番目)\${free.length !== g.items.length ? \` ・ うち取引中 \${g.items.length - free.length}件\` : ""}</div>
        </div>
        <div class="tact">\${t ? \`<span class="pill ok">種類「\${esc(t.label)}」</span>\` : \`<button class="btn sm p" data-add="\${esc(x.productId)}">種類に追加</button>\`}</div>
      </div>\`;
    }).join("") || \`<div class="center">出品中の商品がありません。</div>\`;
  }

  $("#tab-types").innerHTML = \`
    <div class="card">
      <h2>更新する種類 <span class="q">\${types.length}種類</span></h2>
      <div class="muted" style="margin-bottom:12px">上から順に1回ずつ、\${types.length >= 2 ? types.slice(0, 3).map((t) => \`「\${esc(t.label)}」\`).join("→") + (types.length > 3 ? "→…" : "→") + "最初に戻る" : "A→B→C→最初に戻る"}、の順番で更新します。それぞれの種類に一致する出品のうち、一覧でいちばん下にあるものを上げます。一致は<b>タイトルと説明が同じ</b>かどうかで判断します(空白・改行の違いだけは無視します)。一致する出品が0件の種類は飛ばします。</div>
      \${rows || \`<div class="center">まだ種類がありません。下の一覧から「種類に追加」を押してください。</div>\`}
    </div>
    <div class="card">
      <h2>出品中の一覧 <span class="q">\${snap ? \`\${fmtDate(snap.at)}に読み込み ・ \${snap.items.length}件\` : ""}</span></h2>
      <div class="muted" style="margin-bottom:10px">同じタイトル・説明の出品は1つにまとめています。最大5ページ(50件)まで読みます。読み込みには数十秒かかります(サイトに負担をかけないよう、ページの間に数秒あけるため)。</div>
      <button class="btn" id="ty_refresh">出品中の一覧を読み込む</button>
      <div style="margin-top:12px">\${listHtml}</div>
    </div>\`;

  bindFull();
  $("#ty_refresh").onclick = async (e) => {
    e.target.disabled = true; e.target.textContent = "読み込み中…";
    try { const r = await api("/listing/refresh", { method: "POST", body: "{}" }); toast(\`読み込みました(\${r.snapshot.items.length}件)\`); await refresh(); }
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
        await api(\`/types/\${encodeURIComponent(id)}/label\`, { method: "POST", body: JSON.stringify({ label }) });
        toast("名前を変えました");
      } else if (b.dataset.act === "del") {
        if (!confirm(\`種類「\${types[i].label}」を削除しますか?(出品そのものは消えません)\`)) return;
        await api(\`/types/\${encodeURIComponent(id)}\`, { method: "DELETE" });
        toast("削除しました");
      }
      await refresh();
    } catch (err) { toast(err.message, true); }
  }));
}

// ---- 設定 ----
function renderSettings() {
  $("#tab-settings").innerHTML = \`
    <div class="card">
      <h2>\${esc(SN())}のログイン情報(PHPSESSID)</h2>
      <div class="muted" style="margin-bottom:10px">現在: \${state.session.set ? \`<span class="pill ok">登録済み</span> \${state.session.updatedAt ? "(" + fmtDate(state.session.updatedAt) + ")" : ""}\` : '<span class="pill off">未登録</span>'}</div>
      <div class="field"><label>PHPSESSIDの値</label><input type="password" id="st_sess" placeholder="値の部分だけを貼り付け" autocomplete="off"></div>
      <div class="row">
        <button class="btn p" id="st_sessSave">保存</button>
        <button class="btn" id="st_test" \${!state.session.set ? "disabled" : ""}>接続テスト</button>
        \${state.session.set ? '<button class="btn gho" id="st_sessDel">削除</button>' : ""}
      </div>
      <div class="muted" id="st_testMsg" style="margin-top:10px"></div>
      <details class="help"><summary>値の取り方</summary><div>
        <ol>
          <li>\${SN()}を開き、開発者ツール(F12)の「Application」タブへ</li>
          <li>左の Cookies → \${SITE_INFO[site].origin} を選ぶ</li>
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
      <div class="muted" style="margin-bottom:10px">ツールがどこの拠点から\${SN()}に通信しているか、日本から通れるかを確かめます(ログインなしのトップページを各1回だけ読みます)。<b>新しくした直後に一度押してください。</b></div>
      <button class="btn" id="st_origin">通信の出どころテスト</button>
      <div id="st_originMsg" style="margin-top:12px"></div>
    </div>\`;
  $("#st_sessSave").onclick = async () => { const v = $("#st_sess").value.trim(); if (!v) return toast("値を入力してください", true); try { await api("/session", { method: "POST", body: JSON.stringify({ phpsessid: v }) }); toast("保存しました"); $("#st_sess").value = ""; refresh(); } catch (e) { toast(e.message, true); } };
  if ($("#st_sessDel")) $("#st_sessDel").onclick = async () => { if (!confirm("削除しますか?")) return; await api("/session", { method: "DELETE" }); toast("削除しました"); refresh(); };
  $("#st_test").onclick = async (e) => { e.target.disabled = true; $("#st_testMsg").textContent = "確認中…"; try { const r = await api("/test", { method: "POST", body: "{}" }); window.Snd && (r.ok ? Snd.success() : Snd.fail()); $("#st_testMsg").innerHTML = \`<span class="\${r.ok ? "okc" : "bad"}">\${r.ok ? "✓ " : "✕ "}\${esc(r.message)}</span>\`; } catch (err) { $("#st_testMsg").textContent = err.message; } e.target.disabled = false; };
  // 外部起動
  const drawExt = (d) => {
    const i = d.info, live = i && nowMs() - i.at < 5 * 60000;
    $("#ex_box").innerHTML = \`
      <dl class="dl"><dt>状態</dt><dd>\${!i ? "<span class='pill off'>まだ一度も起動されていません</span>" : live ? \`<span class='pill ok'>動作中</span> 最後の起動 \${Math.round((nowMs() - i.at) / 1000)}秒前 ・ 国 <b class="\${i.country === "JP" ? "okc" : "bad"}">\${esc(i.country)}</b> ・ 拠点 \${esc(COLO_NAME[i.colo] || i.colo)}\` : \`<span class='pill off'>停止中</span> 最後の起動 \${fmtDate(i.at)}\`}</dd></dl>
      <div class="exl">起動用URL(合言葉入り)</div>
      <div class="exrow"><input type="password" readonly id="ex_url" value="\${esc(d.url)}"><button class="btn sm" id="ex_show">表示</button><button class="btn sm" id="ex_cu">コピー</button></div>
      <div class="row" style="margin-top:10px"><button class="btn gho sm" id="ex_regen">合言葉を作り直す</button><span class="muted" style="font-size:12px">URLを人に見られたときだけ押してください(Lambdaの環境変数も貼り直しが必要です)</span></div>\`;
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
      const name = (c) => (COLO_NAME[c] ? \`\${c}(\${COLO_NAME[c]})\` : c || "不明");
      const rows = r.results.map((x) => {
        const g = x.gc;
        const gLine = g.error ? \`<span class="bad">通信エラー: \${esc(g.error)}</span>\`
          : g.challenge ? \`<span class="bad">✕ 確認画面で止められました(応答\${g.status}・出どころ \${esc(name(g.colo))})</span>\`
          : g.status === 200 ? \`<span class="okc">✓ 通れました(応答200・\${g.ms}ms・出どころ \${esc(name(g.colo))})</span>\`
          : \`<span class="bad">想定外の応答 \${g.status}(出どころ \${esc(name(g.colo))})</span>\`;
        const label = x.name === "main" ? "データ本体の保存領域" : "中継専用の保存領域";
        return \`<dt>\${label}</dt><dd>拠点 \${esc(name(x.where.colo))}\${x.where.error ? \` ・ \${esc(x.where.error)}\` : ""}\${x.inJp ? "" : ' <span class="bad">(日本以外)</span>'}<br>\${gLine}\${r.chosen === x.name ? ' <span class="pill ok">使用中</span>' : ""}</dd>\`;
      }).join("");
      const verdict = r.ok
        ? \`<div class="banner info" style="margin:10px 0 0"><div><b>日本から通信できています。</b>更新も、この保存領域から通信します\${r.changed ? "(今回切り替えました)" : ""}。</div></div>\`
        : '<div class="banner warn" style="margin:10px 0 0"><div><b>日本から通れる保存領域が見つかりませんでした。</b>この結果のスクショを送ってください。</div></div>';
      window.Snd && (r.ok ? Snd.success() : Snd.fail());
      $("#st_originMsg").innerHTML = \`<dl class="dl">\${rows}</dl>\${verdict}\`;
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
  el.className = "livest " + st; el.innerHTML = \`<i></i>\${m[0]}\`; el.title = m[1];
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
  try { ws = new WebSocket(\`\${location.protocol === "https:" ? "wss" : "ws"}://\${location.host}/api/stream?k=\${encodeURIComponent(pw)}&s=\${site}\`); }
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
    const r = await api(\`/ops?limit=500\${opsNewest ? "&after=" + encodeURIComponent(opsNewest) : ""}\`);
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
  $("#tab-logs").innerHTML = \`
    <div class="card">
      <h2>動作ログ <span class="q">ツールのすべての動きを記録しています(7日間保存)</span><span id="ops_live_st" class="livest"></span></h2>
      <div id="ops_net" class="netbar"></div>
      <div class="chips" id="ops_cats">\${LOG_CATS.map((c) => \`<button data-c="\${c}" class="\${c === opsCat ? "on" : ""}">\${c}</button>\`).join("")}</div>
      <div class="presets" id="ops_presets">
          <span class="muted">よく使う:</span>
          <button class="btn sm" data-p="pub">出品の結果</button>
          <button class="btn sm" data-p="err">エラーだけ</button>
          <button class="btn sm" data-p="net">\${SN()}への通信</button>
          <button class="btn sm gho" data-p="reset">元に戻す</button>
        </div>
        <div class="row" style="margin-top:10px;align-items:center;gap:8px">
        <select id="ops_lvl" style="flex:1 1 160px">
          <option value="info" \${opsLevel === "info" ? "selected" : ""}>重要なものだけ</option>
          <option value="all" \${opsLevel === "all" ? "selected" : ""}>すべて(細かい記録も表示)</option>
          <option value="warn" \${opsLevel === "warn" ? "selected" : ""}>警告とエラーだけ</option>
          <option value="error" \${opsLevel === "error" ? "selected" : ""}>エラーだけ</option>
        </select>
        <input type="text" id="ops_q" placeholder="文字で検索(例: 15344261 / 429 / 取引中)" value="\${esc(opsQ)}" style="flex:2 1 220px">
      </div>
      <div class="row" style="margin-top:10px;align-items:center;gap:8px">
        <label class="switch" style="flex:0 0 auto"><input type="checkbox" id="ops_live" \${opsPaused ? "" : "checked"}><span class="track"></span><span>流れる表示</span></label>
        <button class="btn sm" id="ops_more">さらに古いログを読む</button>
        <button class="btn sm" id="ops_dl">表示中のログを保存</button>
      </div>
      <button class="btn sm p hide" id="ops_held" style="margin-top:10px;width:100%"></button>
      <div id="ops_tr" class="trbar \${opsTrace ? "" : "hide"}"></div>
    </div>
    <div class="card" style="padding:8px 10px"><div class="muted" id="ops_count" style="margin:2px 4px 6px"></div><div id="ops_list"><div class="center">読み込み中…</div></div></div>\`;
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
    const d = J(nowMs()); a.download = \`\${site}-log-\${d.y}\${pad(d.mo)}\${pad(d.d)}-\${pad(d.h)}\${pad(d.mi)}.json\`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000); toast(\`\${rows.length}件を保存しました\`);
  };
  $("#ops_more").onclick = async (e) => {
    e.target.disabled = true;
    try {
      const oldest = opsBuf.length ? opsBuf[opsBuf.length - 1].id : "";
      const r = await api(\`/ops?limit=500&before=\${encodeURIComponent(oldest)}\`);
      const add = r.ops.filter((x) => !opsIds.has(x.id));
      add.forEach((o) => opsIds.add(o.id));
      opsBuf = opsBuf.concat(add).sort((x, y) => (x.id < y.id ? 1 : -1));
      toast(add.length ? \`\${add.length}件読み込みました\` : "これより古いログはありません"); drawOps();
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
  const pause = opsNet.pauseUntil ? \`<span class="bad">休止中(\${fmtTime(opsNet.pauseUntil)}まで)</span>\` : \`<span class="okc">通常稼働</span>\`;
  el.innerHTML = \`\${SN()}への通信: 今日 <b class="tick">\${opsNet.today}</b> / \${opsNet.cap} 回 ・ \${pause}\`;
}
function drawCount() { const c = $("#ops_count"); if (c) { const n = filteredOps().length; c.textContent = n ? \`\${n}件(読み込み済み \${opsBuf.length}件)\` : ""; } }
function drawHeld() { const b = $("#ops_held"); if (!b) return; b.classList.toggle("hide", !held.length); b.textContent = \`新着 \${held.length}件 ― 押して表示\`; }

// 通信の記録の要点(応答・出どころ・所要時間)を、開かなくても見えるバッジにする
function opBadges(o) {
  const x = o.d || {}; let h = "";
  if (x.status != null && (x.cfRay || x.path)) {
    const ok = x.status >= 200 && x.status < 400 && !x.cfMitigated;
    h += \`<span class="bd \${ok ? "ok" : "ng"}">\${ok ? "✓" : "✕"}\${x.status}\${x.cfMitigated ? " 確認画面" : ""}</span>\`;
  }
  // 出どころは「サイト側で記録された拠点」(cf-rayの末尾)を優先する
  const c = (x.cfRay ? String(x.cfRay).split("-").pop() : "") || x.colo || "";
  if (c) { const jp = ["NRT", "KIX", "FUK", "OKA"].includes(c); h += \`<span class="bd \${jp ? "jp" : "ab"}">\${esc(COLO_NAME[c] || c)}</span>\`; }
  if (x.ms != null && x.status != null) h += \`<span class="bd">\${x.ms >= 1000 ? (x.ms / 1000).toFixed(1) + "秒" : x.ms + "ms"}</span>\`;
  if (x.listingId) h += \`<span class="bd ok">出品番号 \${esc(x.listingId)}</span>\`;
  return h;
}
function shortTime(t) {
  const d = J(t), n = J(nowMs()), y = J(nowMs() - 86400e3);
  const hm = \`\${pad(d.h)}:\${pad(d.mi)}:\${pad(d.s)}\`;
  if (d.y === n.y && d.mo === n.mo && d.d === n.d) return \`今日 \${hm}\`;
  if (d.y === y.y && d.mo === y.mo && d.d === y.d) return \`昨日 \${hm}\`;
  return \`\${d.mo}/\${d.d} \${hm}\`;
}
function opHtml(o, enter, sep) {
  const time = shortTime(o.t);
  const det = o.d ? Object.entries(o.d).map(([k, v]) => \`<span class="kv"><i>\${esc(OPS_KEY[k] || k)}</i>\${esc(typeof v === "object" ? JSON.stringify(v) : String(v))}</span>\`).join("") : "";
  const open = opsOpen.has(o.id);
  // 同じ札が2つ並ばないように(カテゴリ「アクセス」とアクセス記録の札は1つにまとめる)
  const src = o.src === "manual" ? '<span class="op-s">手動</span>' : o.src === "access" && o.cat !== "アクセス" ? '<span class="op-s acc">アクセス</span>' : "";
  return \`<div class="op \${o.lvl}\${enter ? " enter" : ""}\${sep ? " sep" : ""}" data-id="\${o.id}">
    <div class="op-h"><span class="op-t">\${time}</span><span class="op-c">\${esc(o.cat)}</span>\${o.lvl === "debug" ? '<span class="op-l">細かい記録</span>' : ""}\${src}<span class="op-m">\${esc(o.msg)}</span>\${opBadges(o)}\${o.tk ? \`<span class="op-k" data-tk="\${esc(o.tk)}" title="この処理のログだけ見る">#\${esc(o.tk)}</span>\` : ""}\${det ? \`<span class="op-x">\${open ? "▲" : "▼"}</span>\` : ""}</div>
    \${det && open ? \`<div class="op-d">\${det}</div>\` : ""}
  </div>\`;
}

function drawOps() {
  const list = $("#ops_list"); if (!list) return;
  const trb = $("#ops_tr");
  if (trb) { trb.classList.toggle("hide", !opsTrace); trb.innerHTML = opsTrace ? \`処理番号 <b>#\${esc(opsTrace)}</b> のログだけを表示中 <button class="btn sm gho" id="ops_trc">解除</button>\` : ""; const c = $("#ops_trc"); if (c) c.onclick = () => { opsTrace = ""; drawOps(); }; }
  const rows = filteredOps().slice(0, 700);
  drawCount();
  if (!rows.length) { list.innerHTML = \`<div class="center">\${opsBuf.length ? "この条件のログはありません" : "まだログがありません(稼働を開始すると記録されます)"}</div>\`; return; }
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
  if (o.pauseUntil && o.pauseUntil > nowMs()) return { cls: "is-bad", text: \`休止中 \${fmtTime(o.pauseUntil)}まで\` };
  if (o.paused) return { cls: "is-off", text: \`オフ ・ 今日 \${o.today}/\${o.limit}\` };
  if (!o.session) return { cls: "is-bad", text: "ログイン情報なし" };
  return { cls: "is-run", text: \`オン ・ 今日 \${o.today}/\${o.limit}\` };
}
function renderSites() {
  const box = $("#sites"); if (!box) return;
  box.innerHTML = Object.entries(SITE_INFO).map(([id, info]) => {
    const st = siteStatus(overview && overview[id]);
    return \`<button class="site-b \${id}\${id === site ? " on" : ""}" data-site="\${id}" aria-pressed="\${id === site}">
      <span class="site-n">\${esc(info.name)}</span>
      <span class="site-s \${st.cls}"><i></i>\${esc(st.text)}</span>
    </button>\`;
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
</script>
<script>
// サウンドのON/OFFボタン
(function(){
  const b=document.getElementById("soundToggle");
  if(!b)return;
  let on=true;
  b.onclick=()=>{ on=!on; window.Snd&&Snd.setEnabled(on); b.textContent= on?"♪ ON":"♪ OFF"; b.style.color= on?"":"var(--mut2)"; };
})();
</script>
</body>
</html>
`;

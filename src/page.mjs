// build/ から自動生成。直接編集しないでください。
export const PAGE = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>出品スケジューラー</title>
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
</style>
</head>
<body>
<div id="login" class="login-wrap">
  <div class="login-box boot">
    <div class="login-title"><span class="g">出品</span><span class="p">スケジューラー</span></div>
    <div class="login-sub">ゲームクラブ ／ M&amp;Aクラブ 自動出品</div>
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
      <h1><span class="g">出品</span><span class="p">スケジューラー</span></h1>
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
    <button data-tab="drafts">下書き</button>
    <button data-tab="schedule">時間</button>
    <button data-tab="analysis">分析</button>
    <button data-tab="logs">ログ</button>
    <button data-tab="settings">設定</button>
  </div>
  <div id="tab-home" class="tab"></div>
  <div id="tab-drafts" class="tab hide"></div>
  <div id="tab-schedule" class="tab hide"></div>
  <div id="tab-analysis" class="tab hide"></div>
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
    quietRender = !!quiet; render(); quietRender = false;
  } catch (e) { if (!quiet) toast(e.message, true); }
}
async function loadLogs() { logs = (await api("/logs")).logs; }

let quietRender = false;
function render() {
  if (!state) return;
  const s = state.settings;
  $("#statusLine").innerHTML = (s.paused
    ? \`<span class="dot pause"></span>停止中\`
    : \`<span class="dot run"></span>稼働中 ・ 今日 \${state.today.count}/\${s.dailyLimit} 回\`) + \` ・ <span id="clock" title="インターネット(サーバー)の時刻・日本時間"></span>\`;
  tickClock();
  renderBanners();
  if (tab === "home") renderHome();
  if (tab === "drafts") renderDrafts();
  if (tab === "schedule") renderSchedule();
  if (tab === "analysis") renderAnalysis();
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
    const cls = a.kind === "session" ? "warn" : "bad";
    const hint = a.kind === "blocked" ? \`<br><span class="muted">出品だけが止められているときは、「設定」タブの<b>Cloudflareの通行証</b>を登録すると通ることがあります。</span>\` : "";
    b.innerHTML += \`<div class="banner \${cls}"><div><b>\${a.kind === "session" ? "ログイン状態が切れました" : "アクセスが拒否されました"}</b><br>\${esc(a.message)}\${hint}<br><span class="muted">\${fmtDate(a.at)}</span></div><button class="btn gho sm x" onclick="clearAlert()">×</button></div>\`;
  }
  if (!state.session.set) {
    b.innerHTML += \`<div class="banner info">はじめに「設定」タブで、\${SN()}のログイン情報(PHPSESSID)を登録してください。</div>\`;
  }
  const t = state.lastTick;
  if (t && nowMs() - t > 20 * 60000 && !state.settings.paused) {
    b.innerHTML += \`<div class="banner warn">自動実行が\${ago(t)}から動いていないようです。日本のサーバー(外部起動)とCloudflareの Workers → gc-scheduler → Logs を確認してください(\${SN()})。</div>\`;
  }
  const x = state.ext;
  if (x && nowMs() - x.at > 5 * 60000 && !state.settings.paused) {
    b.innerHTML += \`<div class="banner warn"><div><b>日本からの外部起動が止まっています</b>(最後: \${fmtDate(x.at)})。日本のサーバーが動いているか確認してください。止まっている間はCloudflareの自動実行に戻りますが、\${SN()}に止められる可能性が高いです。</div></div>\`;
  } else if (x && x.country !== "JP") {
    b.innerHTML += \`<div class="banner warn"><div><b>外部起動の国が日本ではありません</b>(国 \${esc(x.country)})。起動元のサーバーが日本のリージョンにあるか確認してください。</div></div>\`;
  }
}
window.clearAlert = async () => { await api("/alert/clear", { method: "POST" }); refresh(); };

// ---- ホーム ----
// 「次の出品」までの残り時間を1秒ごとに更新
function fmtLeft(ms) {
  if (ms <= 0) return "まもなく(1分以内)";
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return h ? \`あと \${h}時間\${pad(m)}分\${pad(sec)}秒\` : \`あと \${m}分\${pad(sec)}秒\`;
}
function tickNext() {
  const el = document.getElementById("nextLeft"); if (!el || !state || !state.plan || !state.plan.items.length) return;
  const left = state.plan.items[0].at - nowMs();
  el.textContent = fmtLeft(left);
  // 予定時刻を過ぎて1分半たったら、最新の状態を読み直す(出品されたかを反映)
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

function renderHome() {
  const s = state.settings;
  const curMin = J(nowMs()).h * 60 + J(nowMs()).mi;
  const plan = state.plan || { items: [], today: {} };
  const nextItem = plan.items[0];
  const slotHtml = state.slots.map((m) => {
    const st = state.today.slots[m];
    const pl = plan.today[m];
    const cls = st?.status === "done" ? "done" : (st?.status === "failed" || st?.status === "skipped") ? "failed" : "";
    const isNext = !!(nextItem && pl && pl.at === nextItem.at && pl.kind === "plan");
    const mark = st?.status === "done" ? "✓ " : (st?.status === "failed" || st?.status === "skipped") ? "✕ " : "";
    let sub = "";
    if (st?.status === "done" && st.at) {
      const a = J(st.at), am = a.h * 60 + a.mi;
      sub = Math.abs(am - m) >= 2 ? \`<small>→ \${a.h}:\${pad(a.mi)}に出品</small>\` : "";
    } else if (!st || st.status === "retry") {
      const late = m <= curMin;
      if (pl && pl.kind === "plan") {
        const a = J(pl.at), am = a.h * 60 + a.mi;
        sub = late || Math.abs(am - m) >= 2 ? \`<small>\${late ? "遅れ・" : ""}→ \${dayTime(pl.at)}に出品予定</small>\` : "";
      } else if (pl && pl.kind === "limit") sub = \`<small>今日の上限のため出品なし</small>\`;
      else if (late && !s.paused) sub = \`<small>遅れ・今日中には出品されません</small>\`;
    }
    const tip = st?.message ? esc(st.message) : (st?.status === "done" ? "出品済み" : "");
    return \`<span class="slot \${cls} \${isNext ? "now" : ""}" title="\${tip}">\${mark}\${hm2str(m)}\${sub}</span>\`;
  }).join("");
  const nextCard = (() => {
    if (plan.blocked) return \`<div class="card nextcard"><h2>次の出品</h2><div class="next-big off">出品しません</div><div class="next-why">\${esc(plan.message || "")}</div></div>\`;
    if (!nextItem) return \`<div class="card nextcard"><h2>次の出品</h2><div class="next-big off">3日以内の予定なし</div></div>\`;
    const rest = plan.items.slice(1).map((it) => \`<li><b>\${dayTime(it.at)}</b><span>\${esc(it.late ? \`\${hm2str(it.slot)}枠の取り戻し\` : \`\${hm2str(it.slot)}枠\`)}\${it.draft ? \` ・ \${esc(it.draft)}\` : ""}</span></li>\`).join("");
    return \`<div class="card nextcard">
      <h2>次の出品</h2>
      <div class="next-big">\${dayTime(nextItem.at)}<span class="next-left" id="nextLeft">\${fmtLeft(nextItem.at - nowMs())}</span></div>
      <div class="next-why">\${esc(nextItem.reason)}\${nextItem.draft ? \`<br>出す下書き: \${esc(nextItem.draft)}\` : ""}</div>
      <div class="muted next-note">自動実行は1分おきなので、実際の出品はこの時刻から1分以内になります。</div>
      \${rest ? \`<div class="next-sub">このあとの出品予定</div><ul class="next-list">\${rest}</ul>\` : ""}
    </div>\`;
  })();
  const legend = \`<div class="legend"><span><i class="lg done"></i>出品済み</span><span><i class="lg failed"></i>出品されなかった</span><span><i class="lg now"></i>次に出品する枠</span><span><i class="lg none"></i>これから</span></div>\`;
  const nextDraft = state.drafts.find((d) => d.key === state.nextDraftKey);
  const recent = (logs || []).slice(0, 6);
  $("#tab-home").innerHTML = \`
    \${nextCard}
    <div class="card">
      <h2>稼働状態 <span class="q">\${esc(SN())} ・ \${esc(SITE_INFO[site].rule)}</span></h2>
      <label class="switch" style="margin-bottom:14px">
        <input type="checkbox" id="pauseToggle" \${!s.paused ? "checked" : ""}>
        <span class="track"></span>
        <span>\${s.paused ? \`停止中 — \${esc(SN())}には自動出品しません\` : \`稼働中 — 予定時刻に\${esc(SN())}へ自動出品します\`}</span>
      </label>
      <dl class="dl">
        <dt>出品モード</dt><dd>自分の売れ行きで最適化</dd>
        <dt>今日の出品</dt><dd>\${state.today.count} / \${s.dailyLimit} 回</dd>
        <dt>次に出す下書き</dt><dd>\${nextDraft ? esc(nextDraft.label) : "<span class='muted'>なし</span>"}</dd>
        <dt>ログイン状態</dt><dd>\${state.session.set ? "<span class='pill ok'>登録済み</span>" : "<span class='pill off'>未登録</span>"}</dd>
        <dt>起動のしかた</dt><dd>\${state.ext && nowMs() - state.ext.at < 5 * 60000 ? \`<span class='pill ok'>日本からの外部起動</span> <span class='muted'>\${Math.max(0, Math.round((nowMs() - state.ext.at) / 1000))}秒前・国 \${esc(state.ext.country)}</span>\` : "<span class='pill off'>Cloudflareの自動実行(アメリカ扱い)</span>"}</dd>
      </dl>
      <div class="fp">
        <button class="btn p" id="fpBtn" \${state.force && state.force.pending ? "disabled" : ""}>今すぐ自動出品</button>
        <div class="muted fp-note">次の自動実行(1分以内)で、本番と同じ経路で\${esc(SN())}に1回出品します。予定の枠とは別の1回です(1日の上限には数えます)。</div>
        <div id="fpMsg">\${forceHtml()}</div>
      </div>
    </div>
    <div class="card">
      <h2>今日の予定 <span class="q">\${state.slots.length}枠</span></h2>
      <div class="slots">\${slotHtml || "<span class='muted'>時間タブで予定を作成してください。</span>"}</div>
      \${state.slots.length ? legend : ""}
    </div>

    <div class="card">
      <h2>最近の記録</h2>
      <div id="homeLogs">\${recent.length ? recent.map(logRow).join("") : "<div class='center'>まだ記録がありません</div>"}</div>
    </div>\`;
  $("#fpBtn").onclick = async (e) => {
    e.target.disabled = true;
    try {
      const r = await api("/autopublish", { method: "POST", body: "{}" });
      if (!r.ok) { toast(r.message, true); window.Snd && Snd.fail(); e.target.disabled = false; return; }
      toast("予約しました。1分以内に出品します"); window.Snd && Snd.success();
      await refresh(true); watchForce(r.at);
    } catch (err) { toast(err.message, true); e.target.disabled = false; }
  };
  if (state.force && state.force.pending) watchForce(state.force.pending.at);
  $("#pauseToggle").onchange = async (e) => {
    try { await api("/settings", { method: "POST", body: JSON.stringify({ paused: !e.target.checked }) }); window.Snd&&(e.target.checked?Snd.toggleOn():Snd.toggleOff()); toast(e.target.checked ? \`\${SN()}の稼働を開始しました\` : \`\${SN()}を停止しました\`); refresh(); loadOverview(); }
    catch (err) { toast(err.message, true); e.target.checked = !e.target.checked; }
  };
}

// 「今すぐ自動出品」の状態表示
function forceHtml() {
  const f = state.force || {};
  const name = (c) => (c ? (COLO_NAME[c] ? \`\${c}(\${COLO_NAME[c]})\` : c) : "不明");
  if (f.pending) {
    const at = f.pending.at, eta = new Date(Math.ceil((at + 1) / 60e3) * 60e3), d = J(eta.getTime());
    return \`<div class="fp-st wait"><span class="spin"></span>予約中 — \${d.h}:\${pad(d.mi)}頃に出品します(予約 \${fmtTime(at)})</div>\`;
  }
  const r = f.result;
  if (!r || nowMs() - r.at > 6 * 3600e3) return "";
  return r.ok
    ? \`<div class="fp-st ok">✓ \${fmtTime(r.at)} に出品しました ・ 出品番号 \${esc(r.listingId || "?")} ・ 通信の出どころ \${esc(name(r.colo))}</div>\`
    : \`<div class="fp-st ng">✕ \${fmtTime(r.at)} 出品できませんでした ・ \${esc(r.message || "")}</div>\`;
}
let forceWatch = null;
function watchForce(since) {
  if (forceWatch) return;
  const t0 = Date.now();
  forceWatch = setInterval(async () => {
    try { await refresh(true); } catch {}
    const f = state.force || {};
    const done = !f.pending && f.result && f.result.reservedAt >= since;
    if (done || Date.now() - t0 > 12 * 60e3) {
      clearInterval(forceWatch); forceWatch = null;
      if (done) { toast(f.result.ok ? "出品しました" : "出品できませんでした", !f.result.ok); window.Snd && (f.result.ok ? Snd.success() : Snd.fail()); }
      if (tab === "home") renderHome();
    } else if (tab === "home" && $("#fpMsg")) $("#fpMsg").innerHTML = forceHtml();
  }, 8000);
}

function logRow(l) {
  return \`<div class="log"><span class="ico \${l.ok ? "ok" : "ng"}"></span><span class="t">\${fmtDate(l.at)}</span><span class="m">\${esc(l.label)}\${l.manual ? " <span class='pill'>手動</span>" : ""}\${l.sold ? " <span class='pill ok'>売れた</span>" : ""}\${l.ok ? "" : \`<br><span class="muted">\${esc(l.message || "")}</span>\`}</span></div>\`;
}

// ---- 下書き ----
function renderDrafts() {
  const list = state.drafts.map((d) => {
    const cls = "draft" + (d.enabled ? "" : " dis") + (d.key === state.nextDraftKey ? " next" : "");
    return \`<div class="\${cls}" data-key="\${d.key}" draggable="false">
      <div class="top">
        <span class="grip" data-grip>⠿</span>
        <span class="nm">\${esc(d.label)}</span>
        \${d.enabled ? "" : '<span class="pill off">無効</span>'}
      </div>
      \${d.title && d.title !== d.label ? \`<div class="dtitle">\${esc(d.title)}</div>\` : ""}
      <div class="meta">下書き #\${d.draftId}\${d.price ? \` ・ \${Number(d.price).toLocaleString()}円\` : ""} ・ 出品\${d.publishedCount}回\${d.lastPublishedAt ? \` ・ 最終 \${fmtDate(d.lastPublishedAt)}\` : ""}\${d.updatedAt ? \` ・ 編集 \${fmtDate(d.updatedAt)}\` : ""}\${d.key === state.nextDraftKey ? " ・ <b style='color:var(--green)'>次はこれ</b>" : ""}</div>
      <div class="acts">
        <button class="btn sm p" data-act="edit">編集</button>
        <button class="btn sm" data-act="copy">複製</button>
        <button class="btn sm" data-act="toggle">\${d.enabled ? "無効化" : "有効化"}</button>
        <button class="btn sm" data-act="first">次に出す</button>
        <button class="btn sm gho" data-act="del">削除</button>
      </div>
    </div>\`;
  }).join("");
  $("#tab-drafts").innerHTML = \`
    <div class="card bulkcard">
      <h2>説明文をまとめて書き換え <span class="q">ゲームクラブ・M&Aクラブの両方</span></h2>
      <div class="muted" style="margin-bottom:10px">選んだ下書きの説明文を、同じ文章に置き換えます。商品名・価格・画像は変わりません。すでに出品済みの商品は変わらず、次の出品から新しい説明文になります。</div>
      <div class="row"><button class="btn p" id="bk_open">書き換える下書きを選ぶ</button><span id="bk_undo"></span></div>
    </div>
    <div class="card">
      <h2>下書き一覧 <span class="q">上から順に出品されます</span></h2>
      \${state.drafts.length ? \`<div class="muted dhint">文章や価格を変えるときは「編集」、似た商品を増やすときは「複製」を押してください。</div><div id="draftList">\${list}</div>\` : \`<div class='center'>まだ\${esc(SN())}の下書きが登録されていません。<br>下の「Payloadを貼り付けて追加」から1つ登録すると、あとは画面で編集・複製できます。</div>\`}
    </div>
    <div class="card">
      <h2>Payloadを貼り付けて追加 <span class="q">新しい画像を使うとき</span></h2>
      \${addFormHtml()}
    </div>\`;
  bindAddForm();
  bindDraftActs();
  bindDrag();
  $("#bk_open").onclick = () => openBulk();
  drawBulkUndo();
}

function addFormHtml() {
  return \`
    <div class="field"><label>表示名(自分用のメモ。空欄なら商品名が入ります)</label><input type="text" id="d_label" placeholder="例: 10年代アカウント A"></div>
    <div class="field"><label>下書き番号</label><input type="text" id="d_id" inputmode="numeric" placeholder="213159"></div>
    <div class="field"><label>出品データ(Payloadの「View source」の内容を丸ごと貼り付け)</label>
      <textarea id="d_raw" rows="5" placeholder="------WebKitFormBoundary...... で始まる内容"></textarea></div>
    <button class="btn p" id="d_add">追加する</button>
    <details class="help"><summary>データの取り方</summary><div>
      <ol>
        <li>\${SN()}で対象の下書きを一度出品する(開発者ツールのNetworkを記録しながら)</li>
        <li>名前が <code>add?draft=番号</code> の通信をクリック</li>
        <li>「Payload」タブ → 上の「View source」ボタンを押す</li>
        <li>表示された内容を全部コピーして、上の欄に貼り付け</li>
      </ol>
      番号は、その通信のURL <code>draft=</code> の後ろの数字です。画像は下書きに保存済みのものが使われるので、貼り直し不要です。
    </div></details>\`;
}
function bindAddForm() {
  const btn = $("#d_add"); if (!btn) return;
  btn.onclick = async () => {
    const draftId = $("#d_id").value.trim(), raw = $("#d_raw").value.trim();
    if (!draftId || !raw) return toast("下書き番号とデータを入力してください", true);
    btn.disabled = true; btn.textContent = "追加中…";
    try {
      const r = await api("/drafts", { method: "POST", body: JSON.stringify({ draftId, raw, label: $("#d_label").value}) });
      toast(\`追加しました(\${r.fieldCount}項目を読み取り)\`); refresh();
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
        if (act === "edit" || act === "copy") return openEditor(key, act);
        if (act === "toggle") await api("/drafts/" + key, { method: "PATCH", body: JSON.stringify({ enabled: !d.enabled }) });
        else if (act === "first") { await api(\`/drafts/\${key}/next\`, { method: "POST", body: "{}" }); toast("次に出品します"); }
        else if (act === "del") { if (!confirm(\`「\${d.label}」を削除しますか?\`)) return; await api("/drafts/" + key, { method: "DELETE" }); }
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
  $("#tab-schedule").innerHTML = \`
    <div class="card">
      <h2>出品モード</h2>
      <div class="mode on">
        <div class="mode-top"><span class="mode-name">自分の売れ行きで最適化</span><span class="pill ok">使用中</span></div>
        <div class="muted" style="margin:6px 0 8px">このツールが出品した商品の売れ行きを記録し、売れやすい時間帯に寄せます。データが少ないうちは24時間に均等に出品します(\${site === "mac" ? "約4時間48分おき" : "約96分おき"})。最適化後も一部の枠は未知の時間帯に回し続け、見落としを防ぎます。他の人の出品は確認しません。</div>
        <div class="mode-ready \${r.level}">データ: \${lv[r.level]} ・ \${esc(r.note)}</div>
      </div>
    </div>
    <div class="card">
      <h2>現在のスケジュール <span class="q">\${state.slots.length}枠</span></h2>
      <div class="slots">\${state.slots.map((m) => \`<span class="slot">\${hm2str(m)}</span>\`).join("")}</div>
      <div class="muted" style="margin-top:10px">毎日0時に、自分の売れ行きデータから作り直します。データが足りない間は均等スケジュールになります。</div>
      <button class="btn" id="sc_rebuild" style="margin-top:12px">今すぐ作り直す</button>
    </div>\`;
  $("#sc_rebuild").onclick = async () => {
    try { const r = await api("/rebuild", { method: "POST", body: "{}" }); toast(r.reason === "own-low" ? \`作り直しました(\${r.times.length}枠・データ不足のため均等)\` : \`作り直しました(\${r.times.length}枠)\`); analysisData = null; refresh(); }
    catch (e) { toast(e.message, true); }
  };
}

// ---- 分析 ----
const WD = ["日", "月", "火", "水", "木", "金", "土"];
let anMetric = { own: "rate" };

// 168マス(曜日×時間)の表。values[i] は数値 or null(データなし)。color[i] は 0〜1 の濃さ
function grid(values, color, { fmt = (v) => v, hue = "pink", id = "g" } = {}) {
  const css = getComputedStyle(document.body), cv = (n) => css.getPropertyValue(n).trim();
  const rgb = hue === "green" ? cv("--g3") : hue === "cyan" ? cv("--c3") : "255,45,149";
  let h = \`<div class="grid"><table><thead><tr><th class="wdh"></th>\`;
  for (let hr = 0; hr < 24; hr++) h += \`<th>\${hr}</th>\`;
  h += \`</tr></thead><tbody>\`;
  for (let w = 0; w < 7; w++) {
    h += \`<tr><th class="wdh">\${WD[w]}</th>\`;
    for (let hr = 0; hr < 24; hr++) {
      const i = w * 24 + hr, v = values[i];
      const has = v !== null && v !== undefined;
      const a = has ? 0.1 + 0.85 * Math.max(0, Math.min(1, color[i] || 0)) : 0;
      const txt = has ? fmt(v) : "";
      const dark = a > 0.55;
      h += \`<td data-g="\${id}" data-i="\${i}" style="background:\${has ? \`rgba(\${rgb},\${a.toFixed(2)})\` : "transparent"};color:\${dark ? "var(--bg)" : "var(--ink)"}">\${txt}</td>\`;
    }
    h += \`</tr>\`;
  }
  return h + \`</tbody></table></div><div class="grid-detail" id="\${id}-detail">マスをタップすると詳細が出ます</div>\`;
}
const cellName = (i) => \`\${WD[Math.floor(i / 24)]}曜 \${Math.floor(i % 24)}時台\`;
const norm01 = (arr) => { const v = arr.filter((x) => x !== null && x !== undefined); const mx = Math.max(...v, 0), mn = Math.min(...v, 0); return arr.map((x) => (x === null || x === undefined ? 0 : mx > mn ? (x - mn) / (mx - mn) : 0.5)); };

function renderAnalysis() {
  if (!analysisData) { $("#tab-analysis").innerHTML = "<div class='card'><div class='center'>分析データを読み込み中…</div></div>"; loadAnalysis().then(render).catch((e) => toast(e.message, true)); return; }
  const a = analysisData;
  $("#tab-analysis").innerHTML = \`
    <div id="an-body"></div>
    <div class="card">
      <h2>今すぐ確認</h2>
      <div class="muted" style="margin-bottom:10px">通常は自動(自分の売れ行き10分おき)です。すぐ最新にしたいときに押してください。\${SN()}に負担をかけないよう、数十秒かかります。</div>
      <button class="btn" id="an_scan">今すぐ確認する</button>
      <div class="muted" id="an_scanMsg" style="margin-top:8px"></div>
    </div>\`;
  renderOwnView(a);
  $("#an_scan").onclick = async (e) => {
    e.target.disabled = true; $("#an_scanMsg").textContent = "確認中…(30〜60秒かかります)";
    try {
      const r = await api("/scan", { method: "POST", body: "{}" });
      const o = r.own || {};
      $("#an_scanMsg").textContent = \`完了: 新たに売れた\${o.sold || 0}件・販売日時で補正\${o.exact || 0}件\`;
      analysisData = null; await loadAnalysis(); renderAnalysis();
    } catch (err) { $("#an_scanMsg").textContent = err.message; }
    e.target.disabled = false;
  };
}

function bindGrid(id, detailOf) {
  $$(\`td[data-g="\${id}"]\`).forEach((td) => (td.onclick = () => {
    $$(\`td[data-g="\${id}"].sel\`).forEach((x) => x.classList.remove("sel"));
    td.classList.add("sel");
    $(\`#\${id}-detail\`).innerHTML = detailOf(Number(td.dataset.i));
  }));
}

function rankList(items, empty) {
  if (!items.length) return \`<div class="center">\${empty}</div>\`;
  return items.map((x, k) => \`<div class="rank"><span class="rk">\${k + 1}</span><span class="rn">\${x.name}</span><span class="rv">\${x.text}</span></div>\`).join("");
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
    detail = (i) => { const c = o.cells[i]; return c.n ? \`<b>\${cellName(i)}</b> に出品: \${c.n}件中 <b>\${c.sold}件</b> が48時間以内に売れた(\${Math.round((c.sold / c.n) * 100)}%)\${c.hours.length ? \` ・ 売れるまで平均\${(c.hours.reduce((x, y) => x + y, 0) / c.hours.length).toFixed(1)}時間\` : ""}\` : \`<b>\${cellName(i)}</b>: まだこの時間に出品した結果がありません\`; };
    ranking = o.cells.map((c, i) => ({ i, c })).filter((x) => x.c.n >= 2).sort((p, q) => q.c.sold / q.c.n - p.c.sold / p.c.n || q.c.n - p.c.n).slice(0, 10)
      .map((x) => ({ name: cellName(x.i), text: \`\${Math.round((x.c.sold / x.c.n) * 100)}%(\${x.c.n}件中\${x.c.sold}件)\` }));
  } else {
    values = o.buy.map((v) => (v ? v : null)); color = norm01(o.buy); fmt = (v) => v; hue = "green";
    detail = (i) => \`<b>\${cellName(i)}</b> に購入された: <b>\${o.buy[i]}件</b>\`;
    ranking = o.buy.map((v, i) => ({ i, v })).filter((x) => x.v > 0).sort((p, q) => q.v - p.v).slice(0, 10).map((x) => ({ name: cellName(x.i), text: \`\${x.v}件\` }));
  }
  $("#an-body").innerHTML = \`
    <div class="card">
      <h2>概要 <span class="q">このツールが出品した商品だけ(過去の偏ったデータは使いません)</span></h2>
      <dl class="dl">
        <dt>集計開始</dt><dd>\${o.since ? fmtDate(o.since) + \`(\${o.days}日目)\` : "まだ出品なし"}</dd>
        <dt>ツールが出品した数</dt><dd>\${o.total} 件</dd>
        <dt>結果が出た出品</dt><dd>\${o.eligible} 件</dd>
        <dt>48時間以内に売れた</dt><dd>\${o.sold48} 件(\${(g * 100).toFixed(1)}%)</dd>
        <dt>結果待ち(出品48時間以内)</dt><dd>\${o.pending} 件</dd>
        <dt>売れた総数 / 正確な販売時刻</dt><dd>\${o.soldAll} 件 / \${o.exact} 件</dd>
        <dt>販売日時の取得待ち</dt><dd>\${o.waiting} 件</dd>
      </dl>
      <div class="banner \${r.level === "high" ? "info" : "warn"}" style="margin:12px 0 0"><div><b>データの信頼度: \${lv[r.level]}</b><br>\${esc(r.note)}</div></div>
    </div>
    <div class="card">
      <h2>曜日 × 時間</h2>
      <div class="seg sm"><button data-m="rate" class="\${metric === "rate" ? "on" : ""}">売れた割合(出品した時刻)</button><button data-m="buy" class="\${metric === "buy" ? "on" : ""}">買われた時刻</button></div>
      <div class="muted" style="margin:8px 0">\${metric === "rate" ? "マスの数字=その曜日・時間に出品したもののうち、48時間以内に売れた割合(%)。件数が少ないマスは色を控えめにしています。" : "マスの数字=その曜日・時間に実際に買われた件数。"}</div>
      \${grid(values, color, { fmt, hue, id: "go" })}
    </div>
    <div class="card"><h2>\${metric === "rate" ? "売れやすい曜日×時間 上位10" : "よく買われる曜日×時間 上位10"}</h2>\${rankList(ranking, metric === "rate" ? "同じマスに2件以上の結果がたまると表示されます" : "購入の記録がたまると表示されます")}</div>
    <div class="card"><h2>このデータから作ったスケジュール</h2><div class="slots">\${a.recommend.map((t) => \`<span class="slot">\${t}</span>\`).join("")}</div>
      <div class="muted" style="margin-top:8px">\${r.level === "low" ? "データ不足のため、当面は均等出品になります。" : "毎日0時(または時間タブの「今すぐ作り直す」)でこのスケジュールが使われます。"}</div></div>\`;
  $$("[data-m]").forEach((b) => (b.onclick = () => { anMetric.own = b.dataset.m; renderAnalysis(); }));
  bindGrid("go", detail);
}

// ---- ログ(リアルタイム) ----
// ツールとの間に専用回線(WebSocket)を張り、ログが書かれた瞬間に受け取って、上から滑り込ませる。
// 回線がつながらない環境では、5秒ごとに取りに行く方式に自動で切り替える。
const LOG_CATS = ["すべて", "定期実行", "出品", "更新", "売れ行き", "最適化", "通信", "管理画面", "アクセス", "システム"];
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
function renderSettings() {
  const s = state.settings;
  $("#tab-settings").innerHTML = \`
    \${migrateCardHtml()}
    <div class="card">
      <h2>\${esc(SN())}のログイン情報(PHPSESSID)</h2>
      <div class="muted" style="margin-bottom:10px">現在: \${state.session.set ? \`<span class="pill ok">登録済み</span> \${state.session.updatedAt ? "(" + fmtDate(state.session.updatedAt) + ")" : ""}\` : '<span class="pill off">未登録</span>'}</div>
      <div class="field"><label>PHPSESSIDの値</label><input type="password" id="st_sess" placeholder="値の部分だけを貼り付け"></div>
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
        ブラウザでログアウトすると無効になります。普段どおり放置すれば長期間有効です。
      </div></details>
    </div>
    \${clearanceCardHtml()}
    <div class="card">
      <h2>日本からの外部起動</h2>
      <div class="muted" style="margin-bottom:10px">Cloudflareの自動実行は、\${SN()}から「アメリカからの通信」と見られて止められます。そこで、<b>日本のサーバーが1分おきに下のURLを開く</b>ことでツールを動かします(その通信は「日本」と見られるので通れます)。URLには合言葉が入っているので、他人に見せないでください。</div>
      <div id="ex_box" class="muted">読み込み中…</div>
    </div>
    <div class="card">
      <h2>原因究明の実験</h2>
      <div class="muted" style="margin-bottom:10px">中身がまったく同じ3つの通信(相手から見た自分の姿の確認・トップページ・マイページ)を、<b>①画面の操作</b>と<b>②自動実行</b>の2つのきっかけで送り、結果を比べます。出品はしません。①を押したあと②を押し、1分ほど待ってください。</div>
      <div class="row">
        <button class="btn p" id="dg_ui">① 画面の操作で実行</button>
        <button class="btn" id="dg_auto">② 自動実行で実行(予約)</button>
      </div>
      <div id="dg_out" style="margin-top:12px"></div>
    </div>
    <div class="card">
      <h2>更新ボタンのテスト(1回だけ)</h2>
      <div class="muted" style="margin-bottom:10px">出品中の商品を一覧の先頭へ上げる「更新」を、ツールから<b>1回だけ</b>送って、通れるかを確かめます。次の自動実行(1分以内)で、本番と同じ経路で送ります。<b>ホームのスイッチがオフのままでも動きます。</b>ログイン情報はPHPSESSIDだけを使います。成功すると、今日の回数(出品と共通の上限)を1つ使います。商品番号を空欄にすると、出品中の1ページ目のいちばん下の商品を自動で選びます(先頭へ動いたかが分かりやすいため)。</div>
      <div class="row">
        <input id="bt_pid" inputmode="numeric" placeholder="商品番号(空欄で自動)" style="max-width:220px">
        <button class="btn p" id="bt_go">更新テストを予約</button>
      </div>
      <div id="bt_out" style="margin-top:12px"></div>
    </div>
    <div class="card">
      <h2>通信の出どころテスト</h2>
      <div class="muted" style="margin-bottom:10px">\${SN()}は日本以外からのアクセスを確認画面で止めるため、ツールは「保存領域」(場所が固定されている部分)から通信します。このボタンで、保存領域がどこの拠点にあるかと、そこから\${SN()}に通れるか(ログインなしのトップページを各1回だけ読みます)を確かめ、日本から通れるものを自動で選びます。<b>新しくした直後に一度押してください。</b></div>
      <button class="btn" id="st_origin">通信の出どころテスト</button>
      <div id="st_originMsg" style="margin-top:12px"></div>
    </div>
  \`;
  $("#st_sessSave").onclick = async () => { const v = $("#st_sess").value.trim(); if (!v) return toast("値を入力してください", true); try { await api("/session", { method: "POST", body: JSON.stringify({ phpsessid: v }) }); toast("保存しました"); $("#st_sess").value = ""; refresh(); } catch (e) { toast(e.message, true); } };
  if ($("#st_sessDel")) $("#st_sessDel").onclick = async () => { if (!confirm("削除しますか?")) return; await api("/session", { method: "DELETE" }); toast("削除しました"); refresh(); };
  // ---- 日本からの外部起動 ----
  const drawExt = (d) => {
    const cmd = \`(crontab -l 2>/dev/null | grep -v ext-tick; echo '* * * * * curl -fsS --max-time 110 "\${d.url}" >/dev/null 2>&1') | crontab -\`;
    const i = d.info, live = i && nowMs() - i.at < 5 * 60000;
    $("#ex_box").innerHTML = \`
      <dl class="dl">
        <dt>状態</dt><dd>\${!i ? "<span class='pill off'>まだ一度も起動されていません</span>" : live ? \`<span class='pill ok'>動作中</span> 最後の起動 \${Math.round((nowMs() - i.at) / 1000)}秒前 ・ 国 <b class="\${i.country === "JP" ? "okc" : "bad"}">\${esc(i.country)}</b> ・ 拠点 \${esc(COLO_NAME[i.colo] || i.colo)}\` : \`<span class='pill off'>停止中</span> 最後の起動 \${fmtDate(i.at)}\`}</dd>
      </dl>
      <div class="exl">① 起動用URL(合言葉入り)</div>
      <div class="exrow"><input type="password" readonly id="ex_url" value="\${esc(d.url)}"><button class="btn sm" id="ex_show">表示</button><button class="btn sm" id="ex_cu">コピー</button></div>
      <div class="exl">② 日本のサーバーに貼るコマンド(1分おきに上のURLを開く設定)</div>
      <div class="exrow"><input type="password" readonly id="ex_cmd" value="\${esc(cmd)}"><button class="btn sm" id="ex_cc">コピー</button></div>
      <div class="row" style="margin-top:10px"><button class="btn gho sm" id="ex_regen">合言葉を作り直す</button><span class="muted" style="font-size:12px">URLを人に見られたときに押してください(サーバーのコマンドも貼り直しが必要になります)</span></div>\`;
    const copy = async (v, m) => { try { await navigator.clipboard.writeText(v); toast(m); } catch { toast("コピーできませんでした。表示してから手動でコピーしてください", true); } };
    $("#ex_show").onclick = () => { const e = $("#ex_url"); e.type = e.type === "password" ? "text" : "password"; $("#ex_cmd").type = e.type; $("#ex_show").textContent = e.type === "password" ? "表示" : "隠す"; };
    $("#ex_cu").onclick = () => copy(d.url, "URLをコピーしました");
    $("#ex_cc").onclick = () => copy(cmd, "コマンドをコピーしました");
    $("#ex_regen").onclick = async () => { if (!confirm("合言葉を作り直します。今のURL・コマンドは使えなくなります。よろしいですか?")) return; try { drawExt(await api("/ext/regen", { method: "POST", body: "{}" })); toast("作り直しました。サーバーのコマンドも貼り直してください"); } catch (e) { toast(e.message, true); } };
  };
  api("/ext").then(drawExt).catch((e) => { $("#ex_box").textContent = e.message; });
  bindClearance();
  bindMigrate();

  // ---- 原因究明の実験 ----
  const dgCell = (x) => !x ? "—" : x.skipped ? '<span class="muted">未実施(ログイン情報なし)</span>' : x.error ? \`<span class="bad">通信エラー</span>\` : x.challenge ? \`<span class="bad">✕ 確認画面(\${x.status})</span>\` : x.status === 200 ? \`<span class="okc">✓ \${x.status}</span>\` : \`<span class="bad">\${x.status}</span>\`;
  const dgCol = (r) => !r ? '<td class="muted">まだ</td>' : \`<td>\${fmtTime(r.at)}<br><span class="muted">拠点 \${esc(COLO_NAME[r.seen.colo] || r.seen.colo || "?")}</span></td>\`;
  const drawDiag = (d) => {
    const u = d.ui, a = d.auto;
    const row = (label, f) => \`<tr><th>\${label}</th><td>\${u ? f(u) : "—"}</td><td>\${a ? f(a) : d.pending ? '<span class="muted">実行待ち…</span>' : "—"}</td></tr>\`;
    let verdict = "";
    if (u && a) {
      const okU = !u.top.challenge && !u.mypage.challenge && !u.top.error, okA = !a.top.challenge && !a.mypage.challenge && !a.top.error;
      const diffSeen = u.seen.loc !== a.seen.loc || u.seen.ipKind !== a.seen.ipKind;
      verdict = okU && !okA ? \`<div class="banner warn" style="margin:10px 0 0"><div><b>確定: きっかけだけで結果が変わります。</b>同じ場所・同じ中身の通信でも、自動実行だけ止められました。\${diffSeen ? \`相手から見た姿も違います(画面の操作=国 \${esc(u.seen.loc)}・\${esc(u.seen.ipKind)} / 自動実行=国 \${esc(a.seen.loc)}・\${esc(a.seen.ipKind)})。<b>止められている理由は、この「見え方の違い」</b>だと考えられます。\` : "相手から見た国・アドレスは同じなので、別の手がかりで判定されています。"}</div></div>\`
        : okU && okA ? \`<div class="banner info" style="margin:10px 0 0"><div><b>どちらも通れました。</b>今は\${SN()}側の判定が緩んでいる可能性があります。「今すぐ自動出品」も試してください。</div></div>\`
        : !okU && !okA ? '<div class="banner warn" style="margin:10px 0 0"><div><b>どちらも止められました。</b>きっかけに関係なく止められています(判定がさらに厳しくなった可能性)。</div></div>'
        : '<div class="banner warn" style="margin:10px 0 0"><div><b>画面の操作だけ止められ、自動実行は通れました。</b>想定外の結果です。このまま教えてください。</div></div>';
    }
    $("#dg_out").innerHTML = \`<div class="tblwrap"><table class="dgt"><tr><th></th><th>① 画面の操作</th><th>② 自動実行</th></tr>
      <tr><th>実行時刻</th>\${dgCol(u).replace("<td>", "<td>")}\${a ? dgCol(a) : \`<td>\${d.pending ? '<span class="muted">実行待ち…</span>' : '<span class="muted">まだ</span>'}</td>\`}</tr>
      \${row("相手から見た国", (r) => esc(r.seen.loc || "?"))}
      \${row("相手から見たアドレス", (r) => esc(r.seen.ipKind))}
      \${row("トップページ", (r) => dgCell(r.top))}
      \${row("マイページ", (r) => dgCell(r.mypage))}
      \${row(\`\${SN()}側の拠点\`, (r) => esc(COLO_NAME[r.top.colo] || r.top.colo || "?"))}
    </table></div>\${verdict}\`;
  };
  let dgTimer = null;
  const loadDiag = async () => { try { const d = await api("/diag"); drawDiag(d); return d; } catch (e) { $("#dg_out").textContent = e.message; } };
  const watchDiag = (since) => {
    clearInterval(dgTimer); const t0 = Date.now();
    dgTimer = setInterval(async () => {
      if (!$("#dg_out")) return clearInterval(dgTimer);
      const d = await loadDiag();
      if ((d && d.auto && d.auto.at >= since) || Date.now() - t0 > 5 * 60e3) { clearInterval(dgTimer); if (d && d.auto && d.auto.at >= since) { toast("②自動実行の結果が出ました"); window.Snd && Snd.success(); } }
    }, 8000);
  };
  loadDiag();
  $("#dg_ui").onclick = async (e) => { e.target.disabled = true; $("#dg_out").innerHTML = '<span class="muted">実行中…(10秒ほど)</span>'; try { await api("/diag/ui", { method: "POST", body: "{}" }); await loadDiag(); } catch (err) { toast(err.message, true); } e.target.disabled = false; };
  $("#dg_auto").onclick = async (e) => { try { const r = await api("/diag/reserve", { method: "POST", body: "{}" }); toast("予約しました。1分以内に実行されます"); await loadDiag(); watchDiag(r.at); } catch (err) { toast(err.message, true); } };
  // ---- 更新ボタンのテスト ----
  const BT_KIND = { boosted: "成功", blocked: "確認画面で拒否", session: "ログイン切れ", unconfirmed: "送れたが未確認", unknown: "想定外の応答", notfound: "商品が見つからない", empty: "対象なし", limit: "今日の上限", interval: "間隔ルール", paused: "休止中", network: "通信エラー", expired: "予約切れ", nosession: "ログイン情報なし" };
  const drawBoost = (d) => {
    const r = d.result;
    if (d.pending) { $("#bt_out").innerHTML = \`<span class="muted">実行待ち…(予約 \${fmtTime(d.pending.at)}・\${d.pending.productId ? "商品 " + esc(d.pending.productId) : "商品は自動で選ぶ"})</span>\`; return; }
    if (!r) { $("#bt_out").innerHTML = '<span class="muted">まだテストしていません</span>'; return; }
    const rows = [
      ["実行時刻", esc(fmtTime(r.at))],
      ["結果", \`\${r.ok ? '<span class="okc">✓ ' : '<span class="bad">✕ '}\${esc(BT_KIND[r.kind] || r.kind || "?")}</span>\`],
      r.productId ? ["商品番号", \`\${esc(r.productId)}\${r.picked ? \` <span class="muted">(\${esc(r.picked)})</span>\` : ""}\`] : null,
      r.status ? ["応答", \`\${esc(r.status)}\${r.location ? \` → \${esc(r.location)}\` : ""}\`] : null,
      r.flash !== undefined ? ["「更新しました」", r.flash ? '<span class="okc">表示あり</span>' : '<span class="bad">表示なし</span>'] : null,
      r.positionBefore ? ["一覧の位置", \`\${esc(r.positionBefore)}番目 → \${r.positionAfter ? esc(r.positionAfter) + "番目" : "見つからない"}\`] : null,
      r.colo ? [\`\${SN()}側の拠点\`, esc(COLO_NAME[r.colo] || r.colo)] : null,
      r.cfRay ? ["Cloudflare識別番号", esc(r.cfRay)] : null,
      r.notice ? ["サイトのメッセージ", esc(r.notice)] : null,
    ].filter(Boolean).map(([k, v]) => \`<dt>\${k}</dt><dd>\${v}</dd>\`).join("");
    const banner = r.ok
      ? '<div class="banner info" style="margin:10px 0 0"><div><b>ツールから更新できました。</b>この結果のスクショを送ってください。自動で更新する機能の設計に進みます。</div></div>'
      : r.kind === "blocked"
        ? '<div class="banner warn" style="margin:10px 0 0"><div><b>更新にもCloudflareの確認がかかっていました。</b>運営側がこの操作も止めているということなので、この方法はここで終わりにします。通信は自動で60分休止します。</div></div>'
        : \`<div class="banner warn" style="margin:10px 0 0"><div>\${esc(r.message || "")}</div></div>\`;
    $("#bt_out").innerHTML = \`<dl class="dl">\${rows}</dl>\${banner}\`;
  };
  let btTimer = null;
  const loadBoost = async () => { try { const d = await api("/boost"); drawBoost(d); return d; } catch (e) { $("#bt_out").textContent = e.message; } };
  const watchBoost = (since) => {
    clearInterval(btTimer); const t0 = Date.now();
    btTimer = setInterval(async () => {
      if (!$("#bt_out")) return clearInterval(btTimer);
      const d = await loadBoost();
      const got = d && !d.pending && d.result && d.result.reservedAt >= since;
      if (got || Date.now() - t0 > 12 * 60e3) { clearInterval(btTimer); if (got) { toast("更新テストの結果が出ました"); window.Snd && (d.result.ok ? Snd.success() : Snd.fail()); } }
    }, 8000);
  };
  loadBoost();
  $("#bt_go").onclick = async (e) => {
    const pid = $("#bt_pid").value.trim();
    if (pid && !/^\\d+$/.test(pid)) return toast("商品番号は数字だけで入力してください", true);
    if (!confirm(\`\${pid ? "商品 " + pid : "出品中の1ページ目のいちばん下の商品"}を、ツールから1回だけ「更新」します。成功すると今日の回数を1つ使います。よろしいですか?\`)) return;
    e.target.disabled = true;
    try {
      const r = await api("/boost/reserve", { method: "POST", body: JSON.stringify({ productId: pid }) });
      if (!r.ok) { toast(r.message, true); }
      else { toast("予約しました。1分以内に実行されます"); await loadBoost(); watchBoost(r.at); }
    } catch (err) { toast(err.message, true); }
    e.target.disabled = false;
  };
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
        ? \`<div class="banner info" style="margin:10px 0 0"><div><b>日本から通信できています。</b>自動出品・売れ行き確認も、この「\${r.chosen === "main" ? "データ本体" : "中継専用"}の保存領域」から通信します\${r.changed ? "(今回切り替えました)" : ""}。</div></div>\`
        : '<div class="banner warn" style="margin:10px 0 0"><div><b>日本から通れる保存領域が見つかりませんでした。</b>この結果のスクショを送ってください。別の方法を考えます。</div></div>';
      window.Snd && (r.ok ? Snd.success() : Snd.fail());
      $("#st_originMsg").innerHTML = \`<dl class="dl">\${rows}</dl>\${verdict}\`;
    } catch (err) { $("#st_originMsg").textContent = err.message; }
    e.target.disabled = false;
  };
  $("#st_test").onclick = async (e) => { e.target.disabled = true; $("#st_testMsg").textContent = "確認中…"; try { const r = await api("/test", { method: "POST", body: "{}" }); window.Snd&&(r.ok?Snd.success():Snd.fail()); $("#st_testMsg").innerHTML = \`<span style="color:var(--\${r.ok ? "ok" : "bad"})">\${r.ok ? "✓ " : "✕ "}\${esc(r.message)}</span>\`; } catch (err) { $("#st_testMsg").textContent = err.message; } e.target.disabled = false; };
}


// ===================================================================
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
  if (o.paused) return { cls: "is-off", text: \`停止中 ・ 今日 \${o.today}/\${o.limit}\` };
  if (!o.session) return { cls: "is-bad", text: "ログイン情報なし" };
  return { cls: "is-run", text: \`稼働中 ・ 今日 \${o.today}/\${o.limit}\` };
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
  if (editor && editor.dirty() && !confirm("編集中の下書きが保存されていません。破棄してサイトを切り替えますか?")) return;
  closeEditor(true);
  stopOps();
  clearInterval(forceWatch); forceWatch = null;
  document.body.classList.remove("site-" + site);
  site = id;
  try { localStorage.setItem(SITE_KEY, id); } catch {}
  document.body.classList.add("site-" + site);
  // サイトごとのデータは全部読み直す
  state = null; logs = null; analysisData = null;
  opsBuf = []; opsIds = new Set(); opsNewest = ""; opsNet = null; opsOpen = new Set(); opsTrace = ""; held = [];
  $$(".tab").forEach((el) => (el.innerHTML = ""));
  renderSites();
  window.Snd && Snd.tabSwitch();
  refresh().then(() => { if (tab === "logs") renderLogs(); });
}

// ===================================================================
// ---- 下書きエディタ(画面で直接入力して編集・複製) ----
// 一覧とは別の「シート」に表示するので、30秒ごとの自動更新で入力中の文字が消えることはありません。
// ===================================================================
const MAIN_FIELDS = [
  { name: "name", label: "商品名", kind: "line", hint: "一覧に表示されるタイトルです。" },
  { name: "detail", label: "説明文", kind: "long", hint: "改行もそのまま反映されます。" },
  { name: "price", label: "価格", kind: "price", hint: "半角数字で。全角やカンマは保存時に直します。" },
  { name: "notice_information", label: "注意事項", kind: "mid", hint: "" },
];
// その他の項目の、わかっている範囲での説明(わからない項目は名前だけ出す)
const FIELD_NOTE = {
  "item_images[0]": "画像(サイトの下書きに保存済みの画像の番号)",
  subcategory_item_id: "カテゴリの番号",
  account_type_id: "アカウントの種類の番号",
  product_type_id: "商品の種類の番号",
  _method: "送信方式(内部用)",
  is_draft: "内部用", is_edit: "内部用", draft_id: "内部用",
  limit_day: "出品期限の日付(出品のたびに約100年後へ自動で書き換えます)",
  limit_time: "出品期限の時刻(出品のたびに自動で書き換えます)",
};
const AUTO_FIELDS = new Set(["limit_day", "limit_time"]);
let editor = null;

async function openEditor(key, mode) {
  let d;
  try { d = (await api("/drafts/" + key)).draft; } catch (e) { return toast(e.message, true); }
  const copy = mode === "copy";
  const fields = d.fields.map((f) => ({ ...f }));
  const init = JSON.stringify({ label: copy ? "" : d.label, draftId: d.draftId, f: fields.map((f) => f.value) });
  editor = { key, copy, base: d, fields, init, dirty: () => !!$("#sheet .ed") && JSON.stringify(readEditor()) !== init };
  renderEditor();
}

function readEditor() {
  const ed = editor;
  const vals = ed.fields.map((f, i) => { const el = document.getElementById("ef_" + i); return el ? el.value : f.value; });
  return { label: $("#ed_label").value, draftId: $("#ed_id").value.trim(), f: vals };
}

function fieldInput(f, i, meta) {
  const v = esc(f.value);
  const kind = meta ? meta.kind : AUTO_FIELDS.has(f.name) ? "auto" : f.value.length > 60 || f.value.includes("\\n") ? "mid" : "line";
  if (kind === "auto") return \`<input type="text" id="ef_\${i}" value="\${v}" disabled>\`;
  if (kind === "price") return \`<div class="ed-price"><input type="text" id="ef_\${i}" value="\${v}" inputmode="numeric" autocomplete="off"><span>円</span></div>\`;
  if (kind === "line") return \`<input type="text" id="ef_\${i}" value="\${v}" autocomplete="off">\`;
  const rows = kind === "long" ? 12 : 4;
  return \`<textarea id="ef_\${i}" rows="\${rows}" class="\${kind === "long" ? "ed-long" : ""}">\${v}</textarea>\`;
}

function renderEditor() {
  const ed = editor, d = ed.base;
  const used = new Set();
  const main = MAIN_FIELDS.map((m) => {
    const i = ed.fields.findIndex((f, k) => f.name === m.name && !f.file && !used.has(k));
    if (i < 0) return "";
    used.add(i);
    return \`<div class="ed-f" data-i="\${i}">
      <label for="ef_\${i}">\${esc(m.label)}\${m.kind === "price" ? "" : \`<span class="ed-count" id="ec_\${i}"></span>\`}</label>
      \${fieldInput(ed.fields[i], i, m)}
      \${m.hint ? \`<div class="ed-hint">\${esc(m.hint)}</div>\` : ""}
    </div>\`;
  }).join("");
  const others = ed.fields.map((f, i) => ({ f, i })).filter((x) => !used.has(x.i));
  const otherHtml = others.map(({ f, i }) => f.file
    ? \`<div class="ed-o file"><div class="ed-on"><code>\${esc(f.name)}</code><span>ファイルの項目(変更できません。空のまま送ります)</span></div></div>\`
    : \`<div class="ed-f ed-o" data-i="\${i}"><label for="ef_\${i}"><code>\${esc(f.name)}</code>\${FIELD_NOTE[f.name] ? \`<span class="ed-note">\${esc(FIELD_NOTE[f.name])}</span>\` : ""}</label>\${fieldInput(f, i)}</div>\`).join("");
  $("#sheet").innerHTML = \`
    <div class="ed-back"></div>
    <div class="ed" role="dialog" aria-modal="true" aria-labelledby="ed_title">
      <div class="ed-head">
        <div>
          <div class="ed-site">\${esc(SN())}</div>
          <h2 id="ed_title">\${ed.copy ? \`「\${esc(d.label)}」を複製して新しい下書きを作る\` : \`下書きを編集\`}</h2>
        </div>
        <button class="btn gho sm" id="ed_x" aria-label="閉じる">閉じる</button>
      </div>
      <div class="ed-body">
        \${ed.copy ? \`<div class="banner info" style="margin:0 0 14px"><div>元の下書きはそのまま残ります。ここで変えた内容は、<b>新しい下書き</b>として一覧の最後に追加されます。画像は元の下書きと同じものが使われます。</div></div>\` : ""}
        <div class="ed-row">
          <div class="ed-f"><label for="ed_label">管理名<span class="ed-note">自分用のメモ。空欄なら商品名が入ります</span></label><input type="text" id="ed_label" value="\${esc(ed.copy ? "" : d.label)}" placeholder="\${esc(ed.copy ? d.label + "(コピー)" : "")}" maxlength="60" autocomplete="off"></div>
          <div class="ed-f ed-id"><label for="ed_id">下書き番号<span class="ed-note">画像はこの番号の下書きのもの</span></label><input type="text" id="ed_id" value="\${esc(d.draftId)}" inputmode="numeric" autocomplete="off"></div>
        </div>
        \${main}
        <details class="ed-more">
          <summary>その他の項目(\${others.length}件) <span class="muted">ふだんは触らなくて大丈夫です</span></summary>
          <div class="ed-more-b">\${otherHtml}</div>
        </details>
      </div>
      <div class="ed-foot">
        <div class="ed-msg" id="ed_msg" aria-live="polite"></div>
        <button class="btn gho" id="ed_cancel">キャンセル</button>
        \${ed.copy ? "" : \`<button class="btn" id="ed_tocopy" title="今の入力内容で新しい下書きを作ります(元の下書きは変わりません)">新しい下書きとして保存</button>\`}
        <button class="btn p" id="ed_save">\${ed.copy ? "新しい下書きとして保存" : "保存する"}</button>
      </div>
    </div>\`;
  document.body.classList.add("ed-open");
  const sheet = $("#sheet");
  const update = () => {
    ed.fields.forEach((f, i) => {
      const el = document.getElementById("ef_" + i), c = document.getElementById("ec_" + i);
      if (!el) return;
      const changed = !ed.copy && el.value !== f.value;
      el.closest(".ed-f")?.classList.toggle("chg", changed);
      if (c) c.textContent = \`\${el.value.length}文字\`;
    });
    const dirty = ed.dirty();
    $("#ed_msg").textContent = dirty ? "保存していない変更があります" : "";
  };
  sheet.addEventListener("input", update);
  update();
  $("#ed_x").onclick = () => closeEditor();
  $("#ed_cancel").onclick = () => closeEditor();
  $(".ed-back").onclick = () => closeEditor();
  $("#ed_save").onclick = () => saveEditor(ed.copy);
  if ($("#ed_tocopy")) $("#ed_tocopy").onclick = () => saveEditor(true);
  setTimeout(() => { const n = document.getElementById(ed.copy ? "ed_label" : "ed_id"); if (ed.copy && n) n.focus(); }, 50);
}

async function saveEditor(asNew) {
  const ed = editor; if (!ed) return;
  const v = readEditor();
  if (!/^\\d+$/.test(v.draftId)) return editorError("下書き番号は数字で入力してください。", "#ed_id");
  const fields = ed.fields.map((f, i) => (f.file ? { name: f.name, file: true } : { name: f.name, value: v.f[i] }));
  const ni = ed.fields.findIndex((f) => f.name === "name" && !f.file), pi = ed.fields.findIndex((f) => f.name === "price" && !f.file);
  if (ni >= 0 && !v.f[ni].trim()) return editorError("商品名を入力してください。", "#ef_" + ni);
  if (pi >= 0 && !/^[0-9０-９,，円\\s]+$/.test(v.f[pi]) ) return editorError("価格は数字だけで入力してください(例: 3333)。", "#ef_" + pi);
  const btns = $$("#sheet .ed-foot .btn"); btns.forEach((b) => (b.disabled = true));
  try {
    if (asNew) {
      const label = v.label.trim() || (ed.copy ? \`\${ed.base.label}(コピー)\` : "");
      const r = await api("/drafts", { method: "POST", body: JSON.stringify({ draftId: v.draftId, copyOf: ed.key, label, fields }) });
      toast(\`新しい下書き「\${r.draft.label}」を追加しました\`);
    } else {
      const r = await api("/drafts/" + ed.key, { method: "PATCH", body: JSON.stringify({ label: v.label, draftId: v.draftId, fields, baseUpdatedAt: ed.base.updatedAt || null }) });
      toast(r.changed.length ? \`保存しました(\${r.changed.length}か所)\` : "変更はありませんでした");
    }
    closeEditor(true);
    refresh();
  } catch (e) {
    btns.forEach((b) => (b.disabled = false));
    editorError(e.message);
  }
}
function editorError(msg, focusSel) {
  const m = $("#ed_msg"); if (m) { m.textContent = msg; m.classList.add("bad"); setTimeout(() => m.classList.remove("bad"), 4000); }
  if (focusSel) { const el = $(focusSel); if (el) { el.focus(); el.closest(".ed-f")?.classList.add("err"); setTimeout(() => el.closest(".ed-f")?.classList.remove("err"), 2500); } }
  window.Snd && Snd.fail();
}
function closeEditor(force) {
  if (!editor) return;
  if (!force && editor.dirty() && !confirm("保存していない変更があります。破棄して閉じますか?")) return;
  editor = null;
  $("#sheet").innerHTML = "";
  document.body.classList.remove("ed-open");
}
document.addEventListener("keydown", (e) => {
  if (bulk && e.key === "Escape") { e.preventDefault(); closeBulk(); return; }
  if (!editor) return;
  if (e.key === "Escape") { e.preventDefault(); closeEditor(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveEditor(editor.copy); }
});
window.addEventListener("beforeunload", (e) => { if ((editor && editor.dirty()) || (bulk && bulk.dirty())) { e.preventDefault(); e.returnValue = ""; } });

// ---- Cloudflareの通行証(cf_clearance) ----
// 出品の送信だけが確認画面(403)で止められるとき、ブラウザが持っている本物の通行証を
// ツールにも持たせて、正面から通す。値は数時間〜1日で切れるので、切れたら貼り直す。
function clearanceAgeNote(at) {
  if (!at) return "";
  const h = Math.floor((nowMs() - at) / 3600e3);
  const warn = h >= 12;
  return \` <span class="muted">(\${h < 1 ? "1時間以内" : h + "時間前"}に登録\${warn ? " ・ 切れているかも" : ""})</span>\`;
}
function clearanceCardHtml() {
  const c = state.clearance || { set: false };
  return \`<div class="card">
    <h2>Cloudflareの通行証 <span class="q">出品が確認画面で止められるとき</span></h2>
    <div class="muted" style="margin-bottom:10px">\${esc(SN())}が出品の送信だけを確認画面(403)で止めるとき、あなたのブラウザが持っている本物の通行証(<code>cf_clearance</code>)を、ツールの出品にも付けて送ります。<b>ごまかしではなく、あなたのブラウザの操作を正しく代理する</b>ための設定です。普段は空のままで大丈夫です。</div>
    <div class="muted" style="margin-bottom:10px">現在: \${c.set ? \`<span class="pill ok">登録済み</span>\${clearanceAgeNote(c.at)}\${c.ua ? "" : ' <span class="pill off">名乗り未設定</span>'}\${c.extra ? \` <span class="muted">追加ヘッダー\${c.extra}項目</span>\` : ""}\` : '<span class="pill off">未登録</span>'}</div>
    <div class="field"><label>cf_clearance の値</label><input type="password" id="cf_val" placeholder="Cookie の cf_clearance= の後ろを貼り付け"></div>
    <div class="field"><label>user-agent(ブラウザの名乗り)</label><input type="text" id="cf_ua" placeholder="Request Headers の user-agent の行を貼り付け" autocomplete="off"></div>
    <div class="field"><label>sec-ch-ua 系(任意・まとめて貼れます)</label><textarea id="cf_chua" rows="4" placeholder="Request Headers の sec-ch-ua で始まる行を、まとめて貼り付け"></textarea></div>
    <div class="field"><label>その他の追加ヘッダー(任意)<span class="muted" style="font-weight:400"> ブラウザにそろえたいとき</span></label><textarea id="cf_extra" rows="4" placeholder="Request Headers の行を、まとめて貼り付け(priority, prefer, sec-ch-ua-arch など)"></textarea><div class="muted" style="font-size:12px;margin-top:4px">Request Headers をまるごと貼ってOKです。cookie・content-length・sec-fetch- で始まる行などは、ツールが自動で正しく扱うので無視します。</div></div>
    <div class="row">
      <button class="btn p" id="cf_save">保存</button>
      <button class="btn" id="cf_test" \${!state.session.set ? "disabled" : ""}>接続テスト</button>
      \${c.set ? '<button class="btn gho" id="cf_del">削除</button>' : ""}
    </div>
    <div class="muted" id="cf_msg" style="margin-top:10px"></div>
    <details class="help"><summary>値の取り方(3つとも同じ画面から)</summary><div>
      <ol>
        <li>\${esc(SN())}で、下書きから商品を1件、手で出品する(確認画面が出たら解いてから)</li>
        <li>その前に F12 → <b>Network</b> を開き、「Preserve log」にチェック</li>
        <li>出品の送信(<code>add?draft=…</code>)をクリック → <b>Headers</b> → <b>Request Headers</b></li>
        <li><code>cookie</code> の中の <code>cf_clearance=</code> の後ろ(次の <code>;</code> まで)を1つ目の欄へ</li>
        <li><code>user-agent</code> の行の値を2つ目の欄へ</li>
        <li><code>sec-ch-ua</code> で始まる行を全部まとめて3つ目の欄へ(<code>sec-ch-ua: …</code> のように名前ごと貼ってOK)</li>
      </ol>
      <b>大事:</b> 通行証はブラウザと結びついているので、必ず<b>同じブラウザ</b>の値をそろえて入れてください。値は数時間〜1日で切れます。切れたら、同じ手順で貼り直してください。
    </div></details>
  </div>\`;
}
async function bindClearance() {
  const save = $("#cf_save"); if (!save) return;
  save.onclick = async () => {
    const cf = $("#cf_val").value.trim(), ua = $("#cf_ua").value.trim(), chua = $("#cf_chua").value, extra = $("#cf_extra").value;
    if (!cf) return toast("cf_clearance の値を入力してください(削除は「削除」ボタン)", true);
    save.disabled = true;
    try {
      await api("/clearance", { method: "POST", body: JSON.stringify({ cf, ua, chua, extra }) });
      toast("通行証を保存しました");
      $("#cf_val").value = ""; $("#cf_ua").value = ""; $("#cf_chua").value = ""; $("#cf_extra").value = "";
      refresh();
    } catch (e) { toast(e.message, true); save.disabled = false; }
  };
  if ($("#cf_del")) $("#cf_del").onclick = async () => {
    if (!confirm("通行証を削除しますか?(出品は元のPHPSESSIDだけで送られます)")) return;
    try { await api("/clearance", { method: "POST", body: JSON.stringify({ cf: "" }) }); toast("削除しました"); refresh(); } catch (e) { toast(e.message, true); }
  };
  if ($("#cf_test")) $("#cf_test").onclick = async () => {
    const m = $("#cf_msg"); m.textContent = "確認中…";
    try { const r = await api("/test", { method: "POST" }); m.innerHTML = r.ok ? \`<span class="pill ok">通れました</span> 出どころ \${esc(r.colo || "?")}\` : \`<span class="pill off">\${esc(r.message || "通れませんでした")}</span>\`; }
    catch (e) { m.textContent = e.message; }
  };
}

// ---- 旧M&Aクラブ版からの引っ越し(設定タブ・M&Aクラブのときだけ) ----
function migrateCardHtml() {
  if (site !== "mac") return "";
  return \`<div class="card" id="mg_card">
    <h2>旧M&Aクラブ版から引っ越す</h2>
    <div class="muted" style="margin-bottom:10px">以前の「mac-scheduler」に入っている下書き・設定・ログイン情報・売れ行きの記録・ログを、このツールにコピーします。旧ツールの中身は変わりません。<b>二重出品を防ぐため、引っ越し直後は「停止中」になります。</b></div>
    <div id="mg_box" class="muted">確認中…</div>
  </div>\`;
}
async function bindMigrate() {
  const box = $("#mg_box"); if (!box) return;
  let info;
  try { info = await api("/migrate-mac"); } catch (e) { if (box.isConnected) box.innerHTML = \`<span class="bad">\${esc(e.message)}</span>\`; return; }
  // 読み込みの間に設定タブが描き直されていたら、新しい枠の方に任せる
  if (!box.isConnected || site !== "mac") return;
  const o = info.old || {};
  if (!o.bound) { box.innerHTML = "旧ツールの保存領域につながっていません。引っ越しは不要か、すでに旧ツールを削除済みです。"; return; }
  if (o.error) { box.innerHTML = \`<span class="bad">旧ツールを読めませんでした: \${esc(o.error)}</span>\`; return; }
  const done = info.done;
  box.innerHTML = \`
    <dl class="dl">
      <dt>旧ツールの中身</dt><dd>\${o.empty ? "データなし" : \`下書き \${o.drafts}件\${o.draftLabels && o.draftLabels.length ? \`(\${o.draftLabels.map(esc).join("、")})\` : ""} ・ 売れ行きの記録 \${o.own}件 ・ ログイン情報 \${o.session ? "あり" : "なし"}\`}</dd>
      <dt>状態</dt><dd>\${done ? \`<span class="pill ok">引っ越し済み</span> \${fmtDate(done.at)}(下書き\${done.drafts}件・出品記録\${done.logs}件・動作ログ\${done.ops}件)\` : \`<span class="pill off">まだ</span>\${info.currentDrafts ? \` ・ こちらに下書きが\${info.currentDrafts}件あります(上書きされます)\` : ""}\`}</dd>
    </dl>
    <div class="row" style="margin-top:10px"><button class="btn \${done ? "" : "p"}" id="mg_go" \${o.empty ? "disabled" : ""}>\${done ? "もう一度引っ越す(上書き)" : "引っ越す"}</button></div>
    <div id="mg_msg" style="margin-top:10px"></div>\`;
  const go = box.querySelector("#mg_go"); if (!go) return;
  go.onclick = async (e) => {
    if (!confirm(done || info.currentDrafts ? "今のM&Aクラブ側の下書き・設定・ログイン情報は、旧ツールの内容で上書きされます。よろしいですか?" : "旧M&Aクラブ版のデータをこのツールにコピーします。よろしいですか?")) return;
    e.target.disabled = true; $("#mg_msg").innerHTML = '<span class="muted">引っ越し中…</span>';
    try {
      let r = await api("/migrate-mac", { method: "POST", body: JSON.stringify({ force: !!done }) });
      if (r.needForce) r = await api("/migrate-mac", { method: "POST", body: JSON.stringify({ force: true }) });
      $("#mg_msg").innerHTML = \`<div class="banner info" style="margin:0"><div><b>引っ越しました。</b>下書き\${r.drafts}件・出品記録\${r.logs}件・動作ログ\${r.ops}件。いまは<b>停止中</b>です。旧ツールを止めてから(またはもう動いていないことを確かめてから)、ホームのスイッチをオンにしてください。</div></div>\`;
      window.Snd && Snd.success();
      toast(\`引っ越しました(下書き\${r.drafts}件)。いまは停止中です\`);
      refresh(); loadOverview();
    } catch (err) { $("#mg_msg").innerHTML = \`<span class="bad">\${esc(err.message)}</span>\`; e.target.disabled = false; }
  };
}


// ===================================================================
// ---- 説明文の一括書き換え(両サイト) ----
// 手順: ①新しい説明文を書く・書き換える下書きを選ぶ → ②変更前と変更後を確認 → 書き換える
// ===================================================================
let bulk = null;
const firstLines = (t, n = 2) => { const a = String(t || "").split("\\n"); return a.slice(0, n).join(" / ") + (a.length > n ? " …" : ""); };

async function drawBulkUndo() {
  const el = $("#bk_undo"); if (!el) return;
  try {
    const d = await api("/bulk-detail");
    if (!el.isConnected) return;
    el.innerHTML = d.undo ? \`<button class="btn gho sm" id="bk_undo_b">直前の一括書き換え(\${fmtDate(d.undo.at)}・\${d.undo.count}件)を元に戻す</button>\` : "";
    const b = $("#bk_undo_b");
    if (b) b.onclick = async () => {
      if (!confirm(\`\${fmtDate(d.undo.at)} の一括書き換え(\${d.undo.count}件)を元に戻しますか?\\nそのあと個別に直した下書きは、そのまま残します。\`)) return;
      b.disabled = true;
      try {
        const r = await api("/bulk-detail/undo", { method: "POST", body: "{}" });
        toast(r.skipped ? \`\${r.restored}件を元に戻しました(あとから直した\${r.skipped}件はそのまま)\` : \`\${r.restored}件を元に戻しました\`);
        refresh();
      } catch (e) { toast(e.message, true); b.disabled = false; }
    };
  } catch {}
}

async function openBulk() {
  let d;
  try { d = await api("/bulk-detail"); } catch (e) { return toast(e.message, true); }
  const sel = {};
  for (const id of Object.keys(SITE_INFO)) sel[id] = new Set((d.sites[id] || []).filter((x) => x.detail !== null).map((x) => x.key));
  bulk = { data: d, sel, text: "", step: 1, init: "", dirty: () => !!bulk && (bulk.text || ($("#bk_text") ? $("#bk_text").value : "")).trim() !== "" };
  renderBulk();
}

function bulkTargets() {
  const out = {};
  for (const id of Object.keys(SITE_INFO)) out[id] = [...bulk.sel[id]];
  return out;
}

function renderBulk() {
  const b = bulk, d = b.data;
  const count = Object.values(b.sel).reduce((n, x) => n + x.size, 0);
  let body, foot;
  if (b.step === 1) {
    const all = Object.entries(SITE_INFO).flatMap(([id, info]) => (d.sites[id] || []).filter((x) => x.detail !== null).map((x) => \`<option value="\${id}:\${esc(x.key)}">\${esc(info.name)} ・ \${esc(x.label)}</option>\`)).join("");
    const lists = Object.entries(SITE_INFO).map(([id, info]) => {
      const rows = (d.sites[id] || []).map((x) => x.detail === null
        ? \`<label class="bk-i dis"><input type="checkbox" disabled><span><b>\${esc(x.label)}</b><small>説明文の欄がないため対象外</small></span></label>\`
        : \`<label class="bk-i"><input type="checkbox" data-s="\${id}" data-k="\${esc(x.key)}" \${b.sel[id].has(x.key) ? "checked" : ""}><span><span class="bk-t"><b>\${esc(x.label)}</b>\${x.enabled ? "" : '<span class="pill off">無効</span>'}</span><small>\${esc(firstLines(x.detail, 1)) || "(説明文が空)"}</small></span></label>\`).join("");
      return \`<div class="bk-site \${id}"><div class="bk-sh"><span>\${esc(info.name)}</span><span class="bk-n">\${b.sel[id].size} / \${(d.sites[id] || []).filter((x) => x.detail !== null).length}件</span><button class="btn gho sm" data-all="\${id}">全部選ぶ</button><button class="btn gho sm" data-none="\${id}">全部外す</button></div>\${rows || '<div class="muted bk-empty">下書きがありません</div>'}</div>\`;
    }).join("");
    body = \`
      <div class="ed-f">
        <label for="bk_text">新しい説明文<span class="ed-count" id="bk_cnt"></span></label>
        <textarea id="bk_text" class="ed-long" rows="12" placeholder="ここに書いた文章が、選んだ下書きすべての説明文になります。改行もそのまま反映されます。">\${esc(b.text)}</textarea>
        \${all ? \`<div class="bk-from"><span class="muted">今の説明文から書き始める:</span><select id="bk_from"><option value="">下書きを選ぶ</option>\${all}</select></div>\` : ""}
      </div>
      <div class="ed-f"><label>書き換える下書き<span class="ed-note">最初は全部選ばれています</span></label>\${lists}</div>\`;
    foot = \`<div class="ed-msg" id="ed_msg" aria-live="polite">\${count}件を選択中</div>
      <button class="btn gho" id="bk_cancel">キャンセル</button>
      <button class="btn p" id="bk_next">確認する</button>\`;
  } else {
    const items = Object.entries(SITE_INFO).flatMap(([id, info]) => (d.sites[id] || []).filter((x) => b.sel[id].has(x.key)).map((x) => ({ id, info, x })));
    const changed = items.filter((it) => it.x.detail !== b.text);
    const same = items.length - changed.length;
    body = \`
      <div class="banner \${changed.length ? "info" : "warn"}" style="margin:0 0 14px"><div><b>\${changed.length}件</b>の説明文を書き換えます\${same ? \`(\${same}件はすでに同じ文章なので変わりません)\` : ""}。商品名・価格・画像は変わりません。すでに出品済みの商品はそのままで、次の出品から新しい説明文になります。</div></div>
      <div class="ed-f"><label>新しい説明文<span class="ed-count">\${b.text.length}文字</span></label><pre class="bk-pre">\${esc(b.text)}</pre></div>
      <div class="ed-f"><label>書き換える下書き</label>
        \${items.map((it) => \`<div class="bk-cmp \${it.id}"><div class="bk-ch"><span class="bk-tag \${it.id}">\${esc(it.info.name)}</span><b>\${esc(it.x.label)}</b></div>\${it.x.detail === b.text ? '<div class="muted">同じ文章なので変わりません</div>' : \`<div class="bk-before"><i>変更前</i>\${esc(firstLines(it.x.detail, 3)) || "(空)"}</div>\`}</div>\`).join("")}
      </div>\`;
    foot = \`<div class="ed-msg" id="ed_msg" aria-live="polite"></div>
      <button class="btn gho" id="bk_back">戻って直す</button>
      <button class="btn p" id="bk_go" \${changed.length ? "" : "disabled"}>\${changed.length}件を書き換える</button>\`;
  }
  $("#sheet").innerHTML = \`
    <div class="ed-back"></div>
    <div class="ed" role="dialog" aria-modal="true" aria-labelledby="bk_title">
      <div class="ed-head">
        <div><div class="ed-site">ゲームクラブ・M&Aクラブ</div><h2 id="bk_title">\${b.step === 1 ? "説明文をまとめて書き換え" : "書き換える前の確認"}</h2></div>
        <button class="btn gho sm" id="bk_x" aria-label="閉じる">閉じる</button>
      </div>
      <div class="ed-body">\${body}</div>
      <div class="ed-foot">\${foot}</div>
    </div>\`;
  document.body.classList.add("ed-open");
  $("#bk_x").onclick = () => closeBulk();
  $(".ed-back").onclick = () => closeBulk();
  if (b.step === 1) {
    const ta = $("#bk_text"), cnt = $("#bk_cnt");
    const upd = () => { b.text = ta.value; cnt.textContent = \`\${ta.value.length}文字\`; };
    ta.addEventListener("input", upd); upd();
    const from = $("#bk_from");
    if (from) from.onchange = () => {
      if (!from.value) return;
      const [id, key] = [from.value.slice(0, from.value.indexOf(":")), from.value.slice(from.value.indexOf(":") + 1)];
      const x = (d.sites[id] || []).find((y) => y.key === key);
      if (x && (!ta.value.trim() || confirm("入力中の文章を、この下書きの説明文で置き換えますか?"))) { ta.value = x.detail || ""; upd(); ta.focus(); }
      from.value = "";
    };
    const sync = () => { const n = Object.values(b.sel).reduce((a, x) => a + x.size, 0); $("#ed_msg").textContent = \`\${n}件を選択中\`; $$(".bk-site").forEach((el) => { const id = el.classList.contains("mac") ? "mac" : "gc"; el.querySelector(".bk-n").textContent = \`\${b.sel[id].size} / \${(d.sites[id] || []).filter((x) => x.detail !== null).length}件\`; }); };
    $$("#sheet [data-k]").forEach((cb) => (cb.onchange = () => { const set = b.sel[cb.dataset.s]; cb.checked ? set.add(cb.dataset.k) : set.delete(cb.dataset.k); sync(); }));
    $$("#sheet [data-all],#sheet [data-none]").forEach((bt) => (bt.onclick = (e) => {
      e.preventDefault();
      const id = bt.dataset.all || bt.dataset.none, on = !!bt.dataset.all;
      $$(\`#sheet [data-s="\${id}"]\`).forEach((cb) => { cb.checked = on; on ? b.sel[id].add(cb.dataset.k) : b.sel[id].delete(cb.dataset.k); });
      sync();
    }));
    $("#bk_cancel").onclick = () => closeBulk();
    $("#bk_next").onclick = () => {
      const t = ta.value.replace(/\\r\\n?/g, "\\n");
      if (!t.trim()) return editorError("新しい説明文を入力してください。", "#bk_text");
      if (t.length > d.max) return editorError(\`説明文が長すぎます(\${t.length}文字・上限\${d.max}文字)。\`, "#bk_text");
      if (!Object.values(b.sel).some((x) => x.size)) return editorError("書き換える下書きを1つ以上選んでください。");
      b.text = t; b.step = 2; renderBulk();
      $(".ed-body").scrollTop = 0;
    };
  } else {
    $("#bk_back").onclick = () => { b.step = 1; renderBulk(); };
    $("#bk_go").onclick = async (e) => {
      $$("#sheet .ed-foot .btn").forEach((x) => (x.disabled = true));
      try {
        const r = await api("/bulk-detail", { method: "POST", body: JSON.stringify({ text: b.text, targets: bulkTargets() }) });
        toast(\`\${r.changed}件の説明文を書き換えました\`);
        closeBulk(true); refresh();
      } catch (err) { $$("#sheet .ed-foot .btn").forEach((x) => (x.disabled = false)); editorError(err.message); }
    };
  }
}
function closeBulk(force) {
  if (!bulk) return;
  if (!force && bulk.dirty() && !confirm("入力した説明文は保存されていません。破棄して閉じますか?")) return;
  bulk = null;
  $("#sheet").innerHTML = "";
  document.body.classList.remove("ed-open");
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

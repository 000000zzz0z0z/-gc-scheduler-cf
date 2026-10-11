// Cloudflare Workers 接続テスト専用の最小版。
// 目的はただ1つ: このサーバーからゲームクラブに入れるか(Cloudflareに拒否されないか)を確かめる。

const GC = "https://gameclub.jp";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0";

const PAGE = `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>接続テスト</title>
<style>
 body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0a0f0d;color:#eaffea;
   font-family:"Hiragino Kaku Gothic ProN",system-ui,sans-serif}
 .box{width:min(92%,440px);background:#111a16;border:1px solid #1d2b24;border-radius:16px;padding:26px}
 h1{font-size:19px;margin:0 0 6px}
 h1 b{color:#39ff8b}
 .s{color:#7fa890;font-size:13px;margin-bottom:20px}
 label{display:block;font-size:12px;color:#7fa890;margin-bottom:6px}
 input{width:100%;box-sizing:border-box;background:#0a0f0d;border:1px solid #274034;color:#eaffea;
   border-radius:9px;padding:11px 13px;outline:none;font-size:15px}
 input:focus{border-color:#39ff8b}
 button{width:100%;margin-top:16px;background:#39ff8b;color:#062012;border:0;border-radius:9px;
   padding:13px;font-size:15px;font-weight:700;cursor:pointer}
 button:disabled{opacity:.5}
 .r{margin-top:18px;font-size:14px;line-height:1.7;white-space:pre-wrap}
 .ok{color:#39ff8b}.ng{color:#ff5aa0}
</style></head><body>
<div class="box">
 <h1>接続<b>テスト</b></h1>
 <div class="s">Cloudflareからゲームクラブに入れるか確認します</div>
 <label>PHPSESSIDの値</label>
 <input id="s" placeholder="値の部分だけを貼り付け" autocomplete="off">
 <button id="b">テストする</button>
 <div class="r" id="r"></div>
</div>
<script>
 const b=document.getElementById("b"),r=document.getElementById("r");
 b.onclick=async()=>{
   const v=document.getElementById("s").value.trim();
   if(!v){r.textContent="値を入力してください";return;}
   b.disabled=true;r.textContent="確認中…";
   try{
     const res=await fetch("/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({s:v})});
     const d=await res.json();
     r.className="r "+(d.ok?"ok":"ng");
     r.textContent=(d.ok?"✓ ":"✕ ")+d.message;
   }catch(e){r.className="r ng";r.textContent="通信エラー: "+e.message;}
   b.disabled=false;
 };
</script></body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/test" && request.method === "POST") {
      const { s } = await request.json().catch(() => ({}));
      const session = String(s || "").replace(/^PHPSESSID=/i, "").replace(/;.*$/, "").trim();
      if (!session) return json({ ok: false, message: "値が空です。" });
      try {
        const res = await fetch(GC + "/mypage", {
          redirect: "manual",
          headers: { "User-Agent": UA, "Accept-Language": "ja", Accept: "text/html", Cookie: `PHPSESSID=${session}` },
        });
        const text = await res.text().catch(() => "");
        const loc = res.headers.get("location") || "";
        const cf = !!res.headers.get("cf-mitigated") || /Just a moment|cf-chl|challenge-platform|Attention Required/i.test(text);
        if (cf && [403, 429, 503].includes(res.status))
          return json({ ok: false, message: `Cloudflareに拒否されました(ステータス${res.status})。この方式も使えません。` });
        if (res.status >= 300 && res.status < 400 && /login/i.test(loc))
          return json({ ok: false, message: "ゲームクラブには入れましたが、ログイン状態が切れています。PHPSESSIDを取り直してください。" });
        if (res.status !== 200)
          return json({ ok: false, message: `想定外の応答です(ステータス${res.status})。` });
        const title = (text.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || "不明";
        const loggedIn = /ログアウト|logout/i.test(text);
        return json({
          ok: true,
          message: loggedIn
            ? `成功! Cloudflareを通過し、ログイン状態も有効です。\nページ名: ${title}\n\nこの方式で本番を作れます。`
            : `Cloudflareは通過しました(ページ名: ${title})。ただしログイン状態は確認できませんでした。PHPSESSIDを取り直してもう一度お試しください。`,
        });
      } catch (e) {
        return json({ ok: false, message: "通信できませんでした: " + e.message });
      }
    }
    return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  },
};

function json(o) {
  return new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } });
}

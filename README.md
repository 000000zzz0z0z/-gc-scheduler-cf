# ゲームクラブ 出品スケジューラー(Cloudflare版)

保存した下書きを、決めた時刻に自動で出品するツールです。Cloudflare上で24時間動くので、PCやスマホを起動しておく必要はありません。ネオン風デザイン・サウンド付き。

接続テストでCloudflareからゲームクラブに入れることは確認済みです。

---

## はじめに

- **運営の了承について**:自動出品・再出品の可否は運営に確認済みという前提です。状況が変わったら使用を見直してください。
- **最初は「停止中」で始まります**。設定が終わるまで勝手に出品はされません。

---

## 導入手順

### 1. GitHubにファイルを置く
このフォルダ一式を、GitHubリポジトリ(Private推奨)にアップロードします。

### 2. Cloudflareでデプロイ
1. dash.cloudflare.com → Compute (Workers) → Create → Import a repository
2. このリポジトリを選ぶ
3. **Project name は `gc-scheduler`**(wrangler.tomlのnameと一致させる)
4. Deploy

### 3. データ保存領域(KV)を作って接続する
1. 左メニュー Storage & Databases → KV → Create namespace
2. 名前は `gc-data` など。作成後に表示される **ID をコピー**
3. GitHubで `wrangler.toml` を開き、`id = "PLACEHOLDER_REPLACE_ME"` の部分を、コピーしたIDに書き換えて Commit
4. 書き換えると自動で再デプロイされます

> KVを接続しないと、ログインしても「保存領域が未接続」と出ます。

### 4. 管理パスワードを設定する
1. Workersのプロジェクト → Settings → Variables and Secrets
2. Add → Type は **Secret** を選ぶ
3. Name: `ADMIN_PASSWORD` / Value: 自分で決めたパスワード(英数字12文字以上推奨)
4. Save → Deploy(反映のため)

### 5. URLを有効にして開く
1. Settings → Domains & Routes → workers.dev を Enable
2. `gc-scheduler.〇〇.workers.dev` を開き、決めたパスワードでログイン

動作確認用に、`/health` を開くと `{"ok":true,"kvBound":true,"passwordSet":true}` が出ます。両方 true なら準備OKです。

---

## 使い方

1. **設定タブ**でPHPSESSIDを登録 → 接続テスト
2. **下書きタブ**で下書きを登録(出品時のPayload「View source」を貼り付け)
3. **時間タブ**で予定を作成(00:00〜24:00に15回で約96分おき)
4. **ホームタブ**のスイッチをオンにして稼働開始

PHPSESSIDと下書きの取り方は、各タブ内の「データの取り方」に書いてあります。

---

## 分析・通知
- 出品時刻と売れた時刻を集計し、時間帯×曜日のヒートマップと売れやすい時間ランキングを表示します。
- 「売れた」は分析タブで手動で印をつけるか、設定タブの自動判定をオンにします。
- 設定タブにDiscord Webhookを入れると、ログイン切れ・アクセス拒否・出品失敗を通知します。

---

## コードを直したとき(開発者向け)
見た目(build/style.css, build/app.js, build/sound.js, build/index.html)を変えたら、
`npm run build` で src/page.mjs を再生成してからCommitしてください。
※GitHubだけで完結させたい場合は、build/の各ファイルとsrc/page.mjsを手で合わせる必要があります。通常の運用では触りません。

---

## トラブル対処
| 症状 | 対処 |
|------|------|
| 保存領域が未接続 | 手順3のKV IDの書き換えを確認 |
| パスワードが違う | Secretの ADMIN_PASSWORD を確認、再デプロイ |
| ログイン状態が切れました | 設定タブでPHPSESSIDを貼り直す |
| 自動実行が動いていない警告 | CloudflareのWorker → Logs を確認 |
| 出品が1分ほどずれる | 仕様です(1分おきに実行) |

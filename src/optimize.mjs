// スケジュール最適化の中核。データ管理のノウハウを詰め込んである。
//
// 考え方(見落としを防ぐための工夫):
//  1. 探索期間: データが少ないうちは均等出品のまま。少数の偶然で判断しない。
//  2. 粗→細: 1日15回(M&Aクラブは5回)では168マス(曜日×時間)が埋まらないので、最初は広い時間帯に
//     まとめて評価し、データが増えるほど解像度を上げる。
//  3. 平滑化(ベイズ): 各マスの成績は全体平均に寄せる。サンプルが少ないマスほど強く寄せる。
//  4. 探索枠を残す(ε-greedy): 最適化モードでも一部の枠は、まだよく分かっていない
//     時間帯に回し続け、データの偏りが固定されるのを防ぐ。
//  5. 急に変えない: 最低間隔(サイトの30分/31分ルール)を守りつつ、スコアの高い時間へ寄せる。
import { jstParts } from "./gc.mjs";

const DAY = 1440;

// 均等 n 枠。データが少ないうちの出品時刻に使う。
export function evenSlots(count = 15) {
  const step = DAY / count;
  const out = [];
  for (let i = 0; i < count; i++) out.push(Math.round(i * step) % DAY);
  return dedupe(out, count);
}

function dedupe(mins, count) {
  const s = [...new Set(mins.map((m) => ((m % DAY) + DAY) % DAY))].sort((a, b) => a - b);
  return s.slice(0, count).map(toHM);
}
const toHM = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

// 1時間ごとのスコア配列(24個)から、最低間隔を守って count 枠を貪欲に選ぶ。
// explore 枠は、スコアではなく「観測の少ない時間帯」を優先して散らす。
function pickSlots(hourScore, hourSamples, { count = 15, minGapMin = 90, explore = 0 } = {}) {
  const gap = Math.max(minGapMin, Math.floor(DAY / count) - 2);
  const blocked = new Uint8Array(DAY);
  const chosen = [];
  const place = (m) => { chosen.push(m); for (let d = 0; d < gap; d++) { blocked[(m + d) % DAY] = 1; blocked[(m - d + DAY) % DAY] = 1; } };

  const exploreN = Math.min(explore, Math.max(0, count - 1));
  // 活用枠: スコアの高い時間帯から
  const byScore = [...Array(DAY).keys()].sort((a, b) => hourScore[Math.floor(b / 60)] - hourScore[Math.floor(a / 60)] || a - b);
  // 探索枠: 観測サンプルの少ない時間帯から(未知を優先)
  const bySparse = [...Array(DAY).keys()].sort((a, b) => (hourSamples[Math.floor(a / 60)] - hourSamples[Math.floor(b / 60)]) || a - b);

  for (const m of bySparse) { if (chosen.length >= exploreN) break; if (!blocked[m]) place(m); }
  for (const m of byScore) { if (chosen.length >= count) break; if (!blocked[m]) place(m); }
  // 間隔がきつくて埋まらない場合は均等に補充
  for (let i = 0; chosen.length < count && i < count; i++) { const m = Math.round(i * (DAY / count)); if (!chosen.some((x) => Math.abs(x - m) < 20)) place(m); }
  return dedupe(chosen, count);
}

// 曜日ごとに最適化するか、全曜日共通にするか。
// 1日の枠数 × 7曜日に十分なデータが要るので、データ量で自動判断する。
function weekdayResolution(totalSamples) {
  return totalSamples >= 400; // これ未満は曜日をまたいで平均(全曜日同じスケジュール)
}

// --- 自分の売れ行きデータから ---
// stats: ownStats() の戻り。cells[168] = {n, sold, hours[]}, buy[168], days, eligible, sold48
export function recommendFromOwn(stats, { count = 15, now = Date.now() } = {}) {
  const totalN = stats.eligible || 0;
  const globalRate = totalN ? stats.sold48 / totalN : 0;
  const K = 6; // 平滑化の強さ

  // 「出品した時間帯の売れやすさ」+「実際に買われた時間帯」を合成
  const hourConv = new Array(24).fill(0), hourSamp = new Array(24).fill(0), hourBuy = new Array(24).fill(0);
  const perWd = Array.from({ length: 7 }, () => ({ conv: new Array(24).fill(0), samp: new Array(24).fill(0) }));
  for (let wd = 0; wd < 7; wd++) for (let h = 0; h < 24; h++) {
    const c = stats.cells[wd * 24 + h];
    const rate = (c.sold + K * globalRate) / (c.n + K);
    hourConv[h] += c.n ? c.sold : 0; hourSamp[h] += c.n;
    perWd[wd].conv[h] = rate; perWd[wd].samp[h] = c.n;
  }
  for (let i = 0; i < 168; i++) hourBuy[i % 24] += stats.buy[i];

  const hourRate = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) hourRate[h] = (hourConv[h] + K * globalRate) / (hourSamp[h] + K);

  // 買われた時間帯(直後2hに寄せる)も混ぜる
  const buyNext = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) buyNext[h] = hourBuy[h] + hourBuy[(h + 1) % 24] + hourBuy[(h + 2) % 24];
  const hasBuy = hourBuy.some((x) => x > 0);
  const score = normMix(hourRate, buyNext, hasBuy ? 0.6 : 1);

  // データ量に応じて探索枠を減らす(最初は多めに探索)
  const explore = totalN < 150 ? 5 : totalN < 400 ? 3 : 2;

  if (weekdayResolution(totalN)) {
    // 曜日別(今日の曜日のスケジュールを返す)。呼び出し側で日付ごとに呼ぶ。
    const wd = jstParts(now).wd;
    const r = perWd[wd];
    const wdScore = normMix(r.conv, buyNext, hasBuy ? 0.6 : 1);
    return pickSlots(wdScore, r.samp, { count, explore });
  }
  return pickSlots(score, hourSamp, { count, explore });
}

function norm(arr) {
  const mx = Math.max(...arr), mn = Math.min(...arr);
  return arr.map((x) => (mx > mn ? (x - mn) / (mx - mn) : 0.5));
}
function normMix(a, b, wa) {
  const na = norm(a), nb = norm(b);
  return na.map((x, i) => wa * x + (1 - wa) * nb[i]);
}

// 自分のデータ量から、最適化がどれだけ信頼できるかを返す
export function readiness(ownStats) {
  const own = ownStats.sold48 || 0;
  return own < 15 ? { level: "low", note: `自分の売れたデータ ${own}件。あと少し集めると最適化できます(目安20件〜)。それまでは24時間均等に更新します。` }
    : own < 50 ? { level: "mid", note: `自分の売れたデータ ${own}件。傾向が見え始めています。` }
    : { level: "high", note: `自分の売れたデータ ${own}件。十分です。` };
}

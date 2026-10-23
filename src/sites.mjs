// サイトごとの違いは、すべてこの表にまとめる。
// ほかのファイルはこの表を見て動くので、サイトを増やすときもここに1行足すだけで済む。
//   store:        保存領域の名前(サイトごとに別の箱。データは混ざらない)
//   dailyLimit:   1日の出品回数の上限(サイトのルール。画面からは変えられない)
//   minIntervalMin: 前回の出品からあける分数(サイトのルール)
//   subcatInPath: 出品URLに subcategory_item_id を付けるか(M&Aクラブはブラウザが付けて送る)
export const SITES = {
  gc: {
    id: "gc",
    name: "ゲームクラブ",
    origin: "https://gameclub.jp",
    store: "main", // 統合前から使っている箱をそのまま使う(データの引っ越し不要)
    dailyLimit: 15,
    minIntervalMin: 30,
    subcatInPath: false,
    boundary: "----GCSchedulerBoundary",
  },
  mac: {
    id: "mac",
    name: "M&Aクラブ",
    origin: "https://maclub.jp",
    store: "mac-main",
    dailyLimit: 5,
    minIntervalMin: 31,
    subcatInPath: true,
    boundary: "----MACSchedulerBoundary",
  },
};
export const SITE_IDS = Object.keys(SITES);
export const DEFAULT_SITE = SITES.gc;

export function siteOf(id) {
  return SITES[String(id || "").toLowerCase()] || null;
}

// env にサイト情報を足したもの(元の env は変更しない)。
// db(env) や load(env, …) は env.__site を見て、そのサイトの箱を使う。
export function siteEnv(env, site) {
  const s = typeof site === "string" ? siteOf(site) || DEFAULT_SITE : site || DEFAULT_SITE;
  const e = Object.create(env);
  e.__site = s;
  // 以前の保存領域(KV)からの引っ越しは、ゲームクラブの箱だけ(M&Aクラブに混ざらないように)
  if (s.id !== "gc") e.GC_KV = undefined;
  return e;
}

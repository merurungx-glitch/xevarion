/* MagiBurst のステージ攻略情報・キャラ所持／詳細をアカウントに紐づけてクラウド保存（magiburst） */
import { initAppCloud } from "../app-cloud.js?v=4";
/* ★ 同期するキーの一覧は ../xeva-keys.js の台帳が正。
   ここに直接書くと「ログアウト時に消すキー」の一覧とズレて、
   前のアカウントのセーブが端末に残る（＝新規登録に引き継がれる）原因になる。 */
import { APP_SYNC_KEYS } from "../xeva-keys.js?v=8";

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-12 「引いたはずのキャラが、持っていないことになる」への対策

   ── なにが起きていたか ──
   magiburst_v1（所持キャラ・限界突破・Lv が入っている）の同期は
   「あとから書いたほうが勝つ」というタイムスタンプ勝負だった。
   ところが<b>ガチャは XEVARION のポータル（gacha.html）からも引ける</b>。
   ポータルは magiburst_v1 に書き込むのに、この magiburst-cloud.js を
   読み込んでいなかったので、
     ・クラウドへ上がらない
     ・書込時刻（appcloud_meta_magiburst）も更新されない
   という状態だった。そのあと別の端末で MagiBurst を開くと、
   そちらの（そのキャラを知らない）セーブがクラウドで新しくなり、
   次にポータルの端末が取り込んだときに<b>まるごと上書き</b>される。
   ＝ 引いたキャラが「持っていない」に戻る。

   ── 直しかた（2段構え）──
   ① gacha.html / characters.html にもこのファイルを読ませる（ポータルでも同期する）。
   ② それでも、すでに食いちがってしまった端末とクラウドは自動では直らない。
      そこで<b>負けた側にしか無い所持キャラ・凸を、勝った側に足し戻す</b>。
      所持キャラと限界突破は<b>増えるいっぽう</b>の記録なので、
      「新しいほうが正しい」ではなく「<b>両方の合計が正しい</b>」で合流させてよい。
   ══════════════════════════════════════════════════════════════ */

/* 増えるいっぽうの記録＝大きいほうを採る項目 */
const MAX_FIELDS = ["awk", "lv", "exp"];

/* chars（所持キャラ）を合流させる。片方にしか無いキャラは必ず残す。 */
function mergeChars(a, b) {
  const out = Object.assign({}, a || {});
  let fixed = 0;
  Object.keys(b || {}).forEach((id) => {
    const bv = b[id];
    if (!bv) return;
    const av = out[id];
    if (!av) { out[id] = bv; fixed++; return; }      /* 片方にしか無い＝そのまま残す */
    if (typeof av !== "object" || typeof bv !== "object") return;
    MAX_FIELDS.forEach((f) => {
      const x = Number(av[f]) || 0, y = Number(bv[f]) || 0;
      if (y > x) { av[f] = y; fixed++; }
    });
  });
  return { out, fixed };
}

/* 数値の「最高記録」を持つ台帳（園の開放に使う通算WAVE）も大きいほうを採る */
function mergeMaxMap(a, b) {
  const out = Object.assign({}, a || {});
  let fixed = 0;
  Object.keys(b || {}).forEach((id) => {
    const y = Number(b[id]) || 0;
    if (y > (Number(out[id]) || 0)) { out[id] = y; fixed++; }
  });
  return { out, fixed };
}

function rescue(key, winStr, loseStr) {
  if (key !== "magiburst_v1") return null;
  let win, lose;
  try { win = JSON.parse(winStr); lose = JSON.parse(loseStr); } catch (e) { return null; }
  if (!win || !lose || typeof win !== "object" || typeof lose !== "object") return null;
  let fixed = 0;
  const c = mergeChars(win.chars, lose.chars);
  win.chars = c.out; fixed += c.fixed;
  /* 幽冥の庭園の開放に使う通算WAVE。これも減らしてはいけない記録。 */
  const g = mergeMaxMap(win.gwBest, lose.gwBest);
  win.gwBest = g.out; fixed += g.fixed;
  /* 一度でも手に入れたクロスの書の使い先も、消えると取り返しがつかない */
  if (lose.crossBook) {
    win.crossBook = Object.assign({}, lose.crossBook, win.crossBook || {});
  }
  /* ★★ 2026-08-12 超越の書（trans＝レベル上限60の解放）と英傑の証（hero＝ルーン第3枠）も同じ。
     どちらも「使ったら二度と戻せない一方通行の記録」なのに合流していなかったので、
     <b>lv だけ 60 のまま解放フラグが消える</b>（＝最大レベルが 50 と表示される）ことがあった。 */
  ["trans", "hero"].forEach((k) => {
    if (lose[k]) win[k] = Object.assign({}, lose[k], win[k] || {});
  });
  if (!fixed) return null;                 /* 直すところが無ければ従来どおり */
  try {
    console.log("[magiburst-cloud] 所持キャラ／記録を " + fixed + " 件ぶん合流しました");
    return JSON.stringify(win);
  } catch (e) { return null; }
}

/* ★ 返り値を窓口として公開する。ガチャ直後など「いま確実に送りたい」場面で
   window.MagiBurstCloud.flush() を呼べるようにするため（mb-boot.js の saveNow が使う）。 */
window.MagiBurstCloud = initAppCloud({
  name: "magiburst",
  config: {
    apiKey: "AIzaSyAEobH5IHlUNR3ryHKxsYNgHlIFSzNTJ7M",
    authDomain: "magiburst.firebaseapp.com",
    databaseURL: "https://magiburst-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "magiburst",
    storageBucket: "magiburst.firebasestorage.app",
    messagingSenderId: "107493819618",
    appId: "1:107493819618:web:727adc2ff9fcf00713cabb",
    measurementId: "G-907875JXTS",
  },
  /* magiburst_v1 に「クリア済みステージ・WAVE踏破・所持キャラ・Lv/覚醒/ルーン・編成」が入っている */
  keys: APP_SYNC_KEYS.magiburst,
  rescue,
});

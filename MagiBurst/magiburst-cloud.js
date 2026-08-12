/* MagiBurst のステージ攻略情報・キャラ所持／詳細をアカウントに紐づけてクラウド保存（magiburst） */
import { initAppCloud } from "../app-cloud.js";
/* ★ 同期するキーの一覧は ../xeva-keys.js の台帳が正。
   ここに直接書くと「ログアウト時に消すキー」の一覧とズレて、
   前のアカウントのセーブが端末に残る（＝新規登録に引き継がれる）原因になる。 */
import { APP_SYNC_KEYS } from "../xeva-keys.js?v=2";

initAppCloud({
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
});

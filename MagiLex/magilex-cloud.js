/* MagiLex の学習・習得状況をアカウントに紐づけてクラウド保存（magilex-cb250） */
import { initAppCloud } from "../app-cloud.js?v=4";
/* ★ 同期するキーの一覧は ../xeva-keys.js の台帳が正（ログアウト時に消す一覧と共通）。 */
import { APP_SYNC_KEYS } from "../xeva-keys.js?v=5";

/* ★★ 2026-08-19 返ってくる窓口を window に置く。
   XEVYNAR へ移る前に <b>その場で書き切る</b>（flush）ために、magilex.js から呼ぶ。
   ページを離れるときの beacon 送信だけに任せると、
   端末やブラウザによっては送りきる前に遷移してしまい、記録が飛ぶことがある。 */
window.MagiLexCloud = initAppCloud({
  name: "magilex",
  config: {
    apiKey: "AIzaSyDc-qq84CItflAxIxYqntZHDGzcQHysv38",
    authDomain: "magilex-cb250.firebaseapp.com",
    databaseURL: "https://magilex-cb250-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "magilex-cb250",
    storageBucket: "magilex-cb250.firebasestorage.app",
    messagingSenderId: "989249755543",
    appId: "1:989249755543:web:24263029322d9f9c9d4cd2",
    measurementId: "G-3N6J8D1YK7",
  },
  /* 学習記録・習得状況・設定。XEVA ウォレットは含めない（あちらは xevarion-account） */
  keys: APP_SYNC_KEYS.magilex,
});

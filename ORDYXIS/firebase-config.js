// ============================================================
// ORDYXIS 完全版 - Firebase 設定ファイル（本番プロジェクト）
// ------------------------------------------------------------
// 複数の Firebase プロジェクトを登録し、ACTIVE_FIREBASE で切り替えます。
// 無料枠（同時接続100 / 月10GB ダウンロード / 1GB 保存）を使い切った場合は、
//   ① このファイルの DEFAULT_FIREBASE を別プロジェクト名に変えて配信し直す（全員に反映）
//   ② または端末ごとに localStorage["ordyxis_fb"] にプロジェクト名を入れる（その端末だけ即切替・テスト用）
// で差し替えられます。
// ※ 注意: プロジェクト間でデータは移動しません。切替先（例 ordyxis2）は空の状態から始まります。
//   イベント途中で切り替えると、進行中の注文番号などは引き継がれません。
// Realtime Database を使用するため databaseURL を含みます。
// ============================================================

const FIREBASE_CONFIGS = {
  // 既定のプロジェクト
  ordyxis: {
    apiKey: "AIzaSyBa2Qu9XjyD5smZC-5KQdw92qSy5FkxN8I",
    authDomain: "ordyxis.firebaseapp.com",
    databaseURL: "https://ordyxis-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ordyxis",
    storageBucket: "ordyxis.firebasestorage.app",
    messagingSenderId: "781406617029",
    appId: "1:781406617029:web:afce8a724911cd90c0dfac",
    measurementId: "G-1RHM5GY4M5"
  },
  // 予備（無料枠を使い切った場合の差し替え先）
  ordyxis2: {
    apiKey: "AIzaSyBc4tdbHAKB5DqDooU3hT0ulyS2PF4J0X4",
    authDomain: "ordyxis2.firebaseapp.com",
    databaseURL: "https://ordyxis2-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ordyxis2",
    storageBucket: "ordyxis2.firebasestorage.app",
    messagingSenderId: "773194567762",
    appId: "1:773194567762:web:c48fc6bbcf1d1a502acf8b",
    measurementId: "G-RXBVGFBKN8"
  }
};

// ★ ここを変えると全員の接続先が切り替わります（配信し直しが必要）。
const DEFAULT_FIREBASE = "ordyxis";

// 端末ごとの上書き（localStorage["ordyxis_fb"] が有効なプロジェクト名なら優先）。
let ACTIVE_FIREBASE = DEFAULT_FIREBASE;
try {
  const sel = localStorage.getItem("ordyxis_fb");
  if (sel && FIREBASE_CONFIGS[sel]) ACTIVE_FIREBASE = sel;
} catch (e) {}

// app-common.js は FIREBASE_CONFIG（単数）を参照するので、選択結果を代入する。
const FIREBASE_CONFIG = FIREBASE_CONFIGS[ACTIVE_FIREBASE] || FIREBASE_CONFIGS[DEFAULT_FIREBASE];

// ============================================================
// セカンダリ接続先（DB2 / ordyxis2 用）
// ------------------------------------------------------------
// 「調理完了」マークや「もう一度呼び出す」シグナルなど、注文・番号には関わらない
// 補助的な共有データは、メイン(ordyxis)と分けて ordyxis2 に保存する（app-common.js の DB2）。
// メイン(ordyxis)に最重要データを集約し、補助データの読み書きで負荷・リスクを増やさないため。
//   既定はメインの「相手側」プロジェクト（メインが ordyxis なら ordyxis2、逆も同様）。
//   端末ごとの上書きは localStorage["ordyxis_fb2"] にプロジェクト名を入れる。
// ※ メインと同一プロジェクトを指定しても動作する（同じ DB に別ノードで保存される）。
const DEFAULT_FIREBASE_2 = (ACTIVE_FIREBASE === "ordyxis2") ? "ordyxis" : "ordyxis2";
let ACTIVE_FIREBASE_2 = DEFAULT_FIREBASE_2;
try {
  const sel2 = localStorage.getItem("ordyxis_fb2");
  if (sel2 && FIREBASE_CONFIGS[sel2]) ACTIVE_FIREBASE_2 = sel2;
} catch (e) {}
const FIREBASE_CONFIG_2 = FIREBASE_CONFIGS[ACTIVE_FIREBASE_2] || FIREBASE_CONFIGS[DEFAULT_FIREBASE_2];

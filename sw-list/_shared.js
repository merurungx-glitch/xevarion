/* ============================================================
   XEVARION — 全アプリの Service Worker が読む共通の部品（sw-list/_shared.js）
   ★★ 2026-11-12 新規（ご指定「更新のたびに sw のファイルをすべてアップロードするのが手間 → まとめて楽に」）
   ------------------------------------------------------------
   ■ sw-list フォルダのしくみ
     ・これまで：版（VERSION）と、オフライン用に控えるファイルの一覧（CORE）が、アプリごとの sw.js（22本）に入っていた。
       更新のたびに、ほぼ全部の sw.js が変わり、22個のフォルダへ1本ずつ上げる必要があった。
     ・これから：版と一覧は <b>このフォルダ（sw-list）に全アプリぶん</b>を集めた（_root.js＝ホーム・MagiQuiz.js・MagiBurst.js …）。
       各アプリの sw.js は importScripts("../sw-list/_shared.js", "../sw-list/<アプリ>.js") で読むだけ。
       → 更新で上げるのは <b>sw-list フォルダ1つ</b>。各アプリの sw.js は「しくみ」を直したときだけ上げる。
   ■ ブラウザは importScripts で読んだファイルの中身が変わったことにも気づいて、新しい版の SW を入れる
     （sw.js 本体が変わったときと同じ）。＝一覧を書きかえれば、これまでどおり新しい版が入る。
     ・<アプリ>.js を直す → そのアプリの SW だけ入れかわる。
     ・このファイル（_shared.js）を直す → 全アプリの SW が入れかわる（＝全部に効く）。
   ============================================================ */

/* 版の文字（…-v123）から番号を取り出す（読めなければ -1） */
function xevVerNum(v) { const m = /v(\d+)$/.exec(String(v || "")); return m ? Number(m[1]) : -1; }

/* ══ 一覧の確かめ（保険）══
   ふつうは、一覧（sw-list/<アプリ>.js）が変わるとブラウザが気づいて新しい版の SW を入れる。
   ただ、ブラウザの控え（HTTP キャッシュ・GitHub Pages は10分）が古いあいだや、気づかないブラウザでも取りこぼさないように、
   ホームの「ダウンロード」（xev-refresh）のたびに、SW が<b>自分でサーバーの一覧を読み直す</b>。
   ・サーバーの一覧のほうが新しい版なら、その一覧を返す＝今回の確かめで<b>新しいファイルも取りこむ</b>（いまの置き場へ）。
     読み直しは cache:"reload"＝ブラウザの控えも新しくなるので、次にページを開いたときブラウザが気づいて新しい版の SW が入る。
   ・取れない／同じ版／サーバーのほうが古い／ほかのアプリの一覧 → null（これまでどおり、いまの一覧で確かめる）。
   ★ ここで registration.update() は呼ばない（確かめている途中で SW が入れかわると、ホームの更新画面が終わりの便りを受け取れない）。 */
async function xevListNewer() {
  try {
    if (typeof XEV_LIST_URL !== "string" || !XEV_LIST_URL) return null;
    const res = await fetch(XEV_LIST_URL, { cache: "reload" });
    if (!res || !res.ok) return null;
    const box = {};
    new Function("self", await res.text())(box);
    const now = box.XEV_SW;
    if (!now || typeof now.v !== "string" || !Array.isArray(now.core) || !now.core.length) return null;
    if (now.v.replace(/v\d+$/, "") !== VERSION.replace(/v\d+$/, "")) return null;
    if (xevVerNum(now.v) <= xevVerNum(VERSION)) return null;
    return now.core;
  } catch (e) { return null; }
}

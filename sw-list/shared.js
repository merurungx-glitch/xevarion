/* ============================================================
   XEVARION — 全アプリの Service Worker が読む共通の部品（sw-list/shared.js）
   ★★ 2026-11-12 新規（ご指定「更新のたびに sw のファイルをすべてアップロードするのが手間 → まとめて楽に」）
   ------------------------------------------------------------
   ■ sw-list フォルダのしくみ
     ・これまで：版（VERSION）と、オフライン用に控えるファイルの一覧（CORE）が、アプリごとの sw.js（22本）に入っていた。
       更新のたびに、ほぼ全部の sw.js が変わり、22個のフォルダへ1本ずつ上げる必要があった。
     ・これから：版と一覧は <b>このフォルダ（sw-list）に全アプリぶん</b>を集めた（root.js＝ホーム・MagiQuiz.js・MagiBurst.js …）。
       各アプリの sw.js は importScripts("../sw-list/shared.js", "../sw-list/<アプリ>.js") で読むだけ。
       → 更新で上げるのは <b>sw-list フォルダ1つ</b>。各アプリの sw.js は「しくみ」を直したときだけ上げる。
   ■ ブラウザは importScripts で読んだファイルの中身が変わったことにも気づいて、新しい版の SW を入れる
     （sw.js 本体が変わったときと同じ）。＝一覧を書きかえれば、これまでどおり新しい版が入る。
     ・<アプリ>.js を直す → そのアプリの SW だけ入れかわる。
     ・このファイル（shared.js）を直す → 全アプリの SW が入れかわる（＝全部に効く）。
   ■ ★★★ 2026-11-19 ご報告「オフライン版のインストールができない」の真因
     前の名前は _shared.js・_root.js だった。GitHub Pages（Jekyll）は<b>名前が「_」で始まるファイルを配らない</b>（404）。
     importScripts が 404 で失敗 → 全アプリの sw.js が「script evaluation failed」で登録できず、
     11-13 からオフライン用のデータが1つも入らなかった（手元の serve.py では配られるので気づけなかった）。
     → 「_」を外した名前にした。<b>sw-list や公開するフォルダに「_」で始まるファイルを作らない</b>こと。
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

/* ══ ★★ 2026-11-17 オフラインの取りこぼしを拾う（ご報告「XEVARION でオフラインでできないことがある」）══
   オフラインで調べると、いくつかのアプリの SW が<b>自分の置き場しか見ていなかった</b>ため、
   ほかのアプリの置き場には入っている共通の部品（xeva-cloud.js・xeva-back.js・mb-newchars.js・キャラの絵など）が読めず、
   「オフラインのときだけ同期の部品・新キャラ・絵が欠ける」ことがあった（MagiBurst・ChainParty・XEVYNAR・Jackpot・Lotto・MagiMusic・MagiBattle・Boccia Rush）。
   → 一覧（sw-list）に足りない部品を足したうえで、保険として<b>全部の SW に共通の網</b>を張る：
     各 SW の fetch の答えが「取れない（504・通信の失敗）」だったときだけ、
       ① 全部の置き場を URL ぴったりで → ② （軽量×オフラインでなければ）? ちがいも → ③ 大きいキャラの絵は小さい絵（t_）で
     を探して返す。ふだん（取れたとき）は何もしない＝これまでの動きは変わらない。
   ★ しかけ：このファイルは各 sw.js の<b>いちばん先</b>に読まれるので、ここで addEventListener("fetch") を包む
     （各 SW の fetch の処理はそのまま。respondWith に渡された答えだけを、あとから見なおす）。 */
function xevRescueOK(u) { return /\.(js|mjs|css|html?|webp|png|jpe?g|gif|svg|webmanifest|woff2?|ttf|mp3|m4a|ogg|wav)$/i.test(u.pathname) || /\/$/.test(u.pathname); }
async function xevRescue(req, res) {
  try {
    if (res && res.status !== 504 && res.type !== "error") return res;
    if (!req || req.method !== "GET") return res;
    const u = new URL(req.url);
    if (u.origin !== self.location.origin || u.pathname.indexOf("/sw-list/") >= 0) return res;
    let hit = await caches.match(req);
    const lite = typeof xevOffLite === "function" && xevOffLite();
    if (!hit && !lite && xevRescueOK(u)) hit = await caches.match(req, { ignoreSearch: true });
    if (!hit && /\/img\/(?!t_)[^/]+\.webp$/i.test(u.pathname)) {
      const t = u.origin + u.pathname.replace(/\/([^/]+)$/, "/t_$1");
      hit = (await caches.match(t)) || (await (await caches.open("xev-img-v1")).match(t, { ignoreSearch: true }));
    }
    return hit || res;
  } catch (e) { return res; }
}
(function () {
  const add = self.addEventListener.bind(self);
  self.addEventListener = function (type, fn, opt) {
    if (type !== "fetch" || typeof fn !== "function") return add(type, fn, opt);
    return add(type, function (e) {
      try {
        const orig = e.respondWith.bind(e);
        Object.defineProperty(e, "respondWith", {
          configurable: true,
          value: (p) => orig(Promise.resolve(p).then((r) => xevRescue(e.request, r), () => xevRescue(e.request, null).then((r) => r || Response.error()))),
        });
      } catch (err) { /* 包めないときは、これまでどおり */ }
      return fn.call(this, e);
    }, opt);
  };
})();

/* ══ ★★ 2026-11-17 オフラインの準備ができているか（ホームの「オフライン」の画面が聞く）══
   ご指定「XEVARION のダウンロード・更新・オフライン対応は XEVARION の中で」→ ホームがアプリごとに
   「控えるファイル（一覧の core）のうち、いくつが置き場に入っているか」を聞けるようにする。
   答え：{ type:"xev-status", scope, v（版）, total（一覧の数）, have（置き場にある数） } */
self.addEventListener("message", (e) => {
  const m = e.data;
  if (!m || m.type !== "xev-status") return;
  e.waitUntil((async () => {
    const out = { type: "xev-status", scope: self.registration ? self.registration.scope : "", v: "", total: 0, have: 0 };
    try {
      const L = self.XEV_SW || {}, core = Array.isArray(L.core) ? L.core : [];
      out.v = String(L.v || ""); out.total = core.length;
      if (out.v && (await caches.has(out.v))) {
        const c = await caches.open(out.v);
        for (const u of core) { try { if (await c.match(u)) out.have++; } catch (err) {} }
      }
    } catch (err) {}
    try { if (e.ports && e.ports[0]) e.ports[0].postMessage(out); else if (e.source) e.source.postMessage(out); } catch (err) {}
  })());
});

/* ══════════════════════════════════════════════════════════════
   Xevion OS — XEVARION の「土台」レイヤー（2026-08-22b 新設）
   ------------------------------------------------------------
   ねらい（ご指定）
     XEVARION の UI を<b>ひとつの OS</b>として扱い、iPhone のように
     「見た目・音・通知・連携」をまとめて設定できる場所を作る。
     ここは<b>その第1版</b>で、今後アプリを増やしても設定はここに足していく。

   決めごと（増やすときもここを守る）
     ★ 設定は必ず <b>XOS.get(key)</b> / <b>XOS.set(key, value)</b> で読み書きする。
       画面のあちこちで localStorage を直に触らない（＝どこで何が変わるか追えなくする）。
     ★ 値を変えたら <b>XOS.apply()</b> が body のクラス／CSS変数に落とす。
       見た目の切り替えは<b>すべて CSS 側</b>で行う（JS でスタイルを直に書かない）。
     ★ 既定値は DEF に1か所だけ。新しい設定を足すときは
       ① DEF に既定値 ② apply() に反映 ③ 設定シートに1行、の3点セット。
     ★ 保存は localStorage（xevion_os_v1）。アカウントに紐づけないので、
       端末ごとに好みを変えられる（文字の大きさ・テーマは端末の都合が大きいため）。

   XEVYNAR 連携
     XEVYNAR は XEVARION の学習AI。ここでは
       ・ホームの AI アシスタントから XEVYNAR へ引きつぐかどうか
       ・ホームに XEVYNAR の提案カードを出すかどうか
     を持つ。実際の橋渡しは xevarion-home.js の xhAi* 側が XOS.get で見る。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var KEY = "xevion_os_v1";
  var OS_NAME = "Xevion OS";
  var OS_VER = "1.0";                 /* Xevion OS そのものの版。UI の作りを変えたら上げる */

  /* 既定値。★ 新しい設定はここに1行足すところから始める。 */
  var DEF = {
    theme: "light",      /* light / dark / auto（端末の設定にしたがう） */
    textSize: "m",       /* s / m / l  … 文字の大きさ */
    motion: 1,           /* 1=アニメーションあり 0=動きを減らす */
    haptics: 1,          /* 1=タップで軽く振動（対応端末のみ） */
    updateDots: 1,       /* 1=更新のあったアプリ・タブに赤い点を出す */
    /* ★★ 2026-08-24 キャラ画像（ご指定・既定はオン＝出す）。
       オフにすると、<b>すべてのアプリ</b>でキャラの絵の場所に<b>キャラ名</b>が出る。
       実際に絵を差し替えているのは xeva.js（全アプリが読んでいる唯一のファイル）。
       ここは<b>設定の置き場所</b>だけを持つ。 */
    charImg: 1,          /* 1=キャラ画像を出す 0=名前だけにする */
    newCharTab: 1,       /* 1=ガチャタブをいちばん新しいキャラの絵にする */
    xevynarAi: 1,        /* 1=AIアシスタントから XEVYNAR へ引きつぐ */
    xevynarTips: 1       /* 1=ホームに XEVYNAR の提案を出す */
  };

  var state = null;

  function load() {
    if (state) return state;
    var o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!o || typeof o !== "object") o = {};
    state = {};
    Object.keys(DEF).forEach(function (k) { state[k] = (o[k] === undefined ? DEF[k] : o[k]); });
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(load())); } catch (e) {}
  }

  function get(k) { return load()[k]; }
  function set(k, v) {
    if (!(k in DEF)) return;
    load()[k] = v;
    save();
    apply();
    try { window.dispatchEvent(new CustomEvent("xos:change", { detail: { key: k, value: v } })); } catch (e) {}
  }
  function toggle(k) { set(k, get(k) ? 0 : 1); return get(k); }
  function reset() { state = null; try { localStorage.removeItem(KEY); } catch (e) {} apply(); }

  /* 端末が「ダークがいい」と言っているか（theme:"auto" のときだけ見る） */
  function prefersDark() {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return false; }
  }
  function darkNow() {
    var t = get("theme");
    return t === "dark" || (t === "auto" && prefersDark());
  }

  /* ★ 見た目の切り替えは、body のクラスと CSS 変数に落とすだけ。
     実際の色・大きさは xevion-os.css が持つ（JS からスタイルを直に書かない）。 */
  function apply() {
    var b = document.body;
    if (!b) return;
    b.classList.toggle("xos-dark", darkNow());
    b.classList.toggle("xos-nomotion", !get("motion"));
    b.classList.remove("xos-tx-s", "xos-tx-m", "xos-tx-l");
    b.classList.add("xos-tx-" + (get("textSize") || "m"));
    b.classList.toggle("xos-nodots", !get("updateDots"));
    b.classList.toggle("xv-nochar", !get("charImg"));
    /* ★ 2026-08-24 絵の差し替えは xeva.js が持っている（全アプリ共通のため）。
       読めていれば、その場で切り替える。 */
    try { if (window.XEVA && XEVA.applyCharImg) XEVA.applyCharImg(); } catch (e) {}
  }

  /* 端末の設定が変わったら（theme:"auto" のとき）ついていく */
  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onMq = function () { if (get("theme") === "auto") apply(); };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);
  } catch (e) {}

  /* ── 触覚フィードバック ──
     ★ 対応していない端末では何も起きない（例外も出ない）。
     ★ 長く鳴らさない。10ms 程度の「コツン」だけにする。 */
  function haptic(ms) {
    if (!get("haptics")) return;
    /* ★ まだ一度も画面を触っていないうちに vibrate を呼ぶと、
       Chrome がコンソールにエラーを出す（振動もしない）。
       ユーザーが触ったあとかどうかを先に見て、触っていなければ何もしない。 */
    try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {}
  }

  /* ── ストレージの使用量（システム情報に出す） ── */
  function storage() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(function (e) {
      return { used: e.usage || 0, quota: e.quota || 0 };
    }).catch(function () { return null; });
  }
  /* いま端末に入っているパッケージの版（＝ビルド番号のかわり） */
  function buildVer() {
    try { return localStorage.getItem("xeva_pkg_ver_v1") || ""; } catch (e) { return ""; }
  }

  window.XOS = {
    NAME: OS_NAME, VERSION: OS_VER, DEF: DEF,
    get: get, set: set, toggle: toggle, reset: reset,
    apply: apply, darkNow: darkNow, haptic: haptic,
    storage: storage, buildVer: buildVer
  };

  /* body ができ次第あてる（defer 読み込みなら即・そうでなければ DOMContentLoaded） */
  if (document.body) apply();
  else document.addEventListener("DOMContentLoaded", apply);
})();

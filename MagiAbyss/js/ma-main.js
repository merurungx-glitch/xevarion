/* ============================================================
   MagiAbyss — ma-main.js
   起動：セーブを読む → 入力・ボタンをつなぐ → タイトル
   ・XEVARION の同期（xeva-cloud）でセーブが書きかわったら読み直す（探索中は終わってから）。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});
  function pickDefaultChar() {
    const S = MA.Save.S;
    if (MA.Save.owned(S.sel)) return;
    const own = MA.D.CHAR_ORDER.find((id) => MA.Save.owned(id));
    if (own) S.sel = own;
  }
  function boot() {
    try {
      MA.Save.load();
      MA.Save.rollMissions();
      pickDefaultChar();
      MA.Audio.setVol(MA.Save.S.set.bgm, MA.Save.S.set.se);
      MA.UI.bind();
      MA.Input.bindGame(document.getElementById("gc"));
      document.body.classList.toggle("stick-right", MA.Save.S.set.stickSide === "right");
      document.body.classList.toggle("touchdev", ("ontouchstart" in window) || navigator.maxTouchPoints > 0);
      MA.Guild.title();
    } catch (e) {
      console.error(e);
      document.getElementById("title").innerHTML = '<div style="padding:24px;color:#fff;font-family:monospace">起動できませんでした：' + String(e && e.message || e) + "<br>ページを読み直してください。</div>";
    }
  }
  /* 同期で magiabyss_v1 や所持キャラが変わったとき */
  let pending = false;
  function onSynced() {
    MA.Save.dropShared();
    if (MA.G && MA.G.running) { pending = true; return; }
    const before = MA.Save.S && MA.Save.S.updated;
    MA.Save.load();
    pickDefaultChar();
    if (document.body.dataset.scr === "guild" && MA.Guild) MA.Guild.renderTop();
    void before;
  }
  window.addEventListener("xeva:synced", onSynced);
  window.addEventListener("storage", (e) => { if (e.key === "magiburst_v1" || e.key === "xeva_gacha_v1" || e.key === MA.Save.KEY) onSynced(); });
  /* 探索が終わったら、たまっていた読み直しを行う */
  setInterval(() => { if (pending && !(MA.G && MA.G.running)) { pending = false; onSynced(); } }, 2000);
  /* スクロール・拡大の抑止（ゲーム画面） */
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => { if (document.body.dataset.scr === "run" || document.body.dataset.scr === "guild") { if (!e.target.closest(".mdl-in")) e.preventDefault(); } }, { passive: false });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

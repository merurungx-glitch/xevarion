/* ============================================================
   MagiBattle 3.0 — mb3-main.js（はじまり）
   ・セーブを読み、タイトル → ロビーへ。上のバーの「もどる」・下のナビをつなぐ。
   ・ほかの端末で育てたぶん（magibattle_v2）や、ガチャで増えたキャラ（magiburst_v1）がクラウドから届いたら読み直す。
   ★★ 2026-10-31 下のナビは 部隊・編成・ロビー・アリーナ・ショップ（キーの 1〜5 も同じ順）。
     ロビー・キャラ詳細で Space／H＝全体を隠す（もう一度・どこかを押すともどる）。G＝使い方。BGM と音量は設定から。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = window.MB3, UI = MB3.UI, SV = MB3.Save;
  function boot() {
    SV.load();
    try { MB3.Audio.set(SV.setting("sfx") !== false); MB3.Audio.setVol(SV.setting("sfxVol") == null ? 1 : SV.setting("sfxVol")); } catch (e) {}
    try { MB3.BGM.set(SV.setting("bgm") !== false); MB3.BGM.setVol(SV.setting("bgmVol") == null ? 0.55 : SV.setting("bgmVol")); } catch (e) {}
    UI.$("#tbBack").onclick = () => UI.back();
    UI.$$("#nav button").forEach((b) => (b.onclick = () => { UI.click(); UI.go(b.dataset.go, {}, { root: b.dataset.go === "lobby" }); }));
    UI.go("title", {}, { root: true });
    /* 音はさわってから（ブラウザの決まり）→ 最初にさわったときに BGM を始める */
    const kick = () => { try { MB3.Audio.init(); MB3.BGM.kick(); } catch (e) {} };
    ["pointerdown", "keydown", "touchend"].forEach((ev) => window.addEventListener(ev, kick, { passive: true }));
    /* 隠しているときは、どこを押してももどる */
    document.getElementById("app").addEventListener("pointerdown", (e) => {
      const app = document.getElementById("app");
      if (app.classList.contains("hideui")) { e.preventDefault(); e.stopPropagation(); app.classList.remove("hideui"); }
    }, true);
    /* 同期で手元が書きかわったら読み直す（戦闘中はさわらない） */
    const reload = () => {
      if (!UI.$("#battle").hidden) return;
      SV.refreshOwned();
      SV.load();
      const c = UI.cur(); if (c && c.name !== "title" && c.name !== "result" && UI.$("#sheet").hidden) UI.refresh();
      UI.paintCur();
    };
    ["xeva:synced", "xeva:prefetched"].forEach((ev) => window.addEventListener(ev, reload));
    window.addEventListener("storage", (e) => { if (!e.key || e.key === "magibattle_v2" || e.key === "magiburst_v1" || e.key === "xeva_gacha_v1") reload(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { SV.daily(); reload(); } });
    window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (!UI.$("#battle").hidden || !UI.$("#story").hidden) return;
      if (document.querySelector(".xt")) return;   /* 使い方（ガイド）を見ているあいだはそちらのキー */
      const c = UI.cur(); if (!c) return;
      const typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement && document.activeElement.tagName) || "");
      const app = document.getElementById("app");
      if (app.classList.contains("hideui")) { e.preventDefault(); app.classList.remove("hideui"); return; }
      if (c.name === "title") { if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); const s = UI.$("#main .scr"); if (s) s.click(); } return; }
      if ((e.code === "Space" || e.code === "KeyH") && !typing && UI.canHide()) { e.preventDefault(); UI.toggleHide(true); return; }
      if (e.code === "KeyG" && !typing && UI.$("#sheet").hidden) { e.preventDefault(); UI.guide(); return; }
      if (e.code === "Escape" || (e.code === "Backspace" && !typing)) {
        e.preventDefault();
        if (!UI.$("#sheet").hidden) { UI.closeSheet(); return; }
        if (c.name !== "lobby") UI.back();
        return;
      }
      const dg = /^Digit([1-5])$/.exec(e.code);
      if (dg && !typing && UI.$("#sheet").hidden && !UI.$("#nav").hidden) { const b = UI.$$("#nav button")[+dg[1] - 1]; if (b) { e.preventDefault(); b.click(); } }
    });
    /* 1分ごとに前哨基地などの表示を新しく */
    setInterval(() => { const c = UI.cur(); if (c && (c.name === "lobby" || c.name === "post") && UI.$("#sheet").hidden && UI.$("#battle").hidden && !document.getElementById("app").classList.contains("hideui")) UI.refresh(); }, 60000);
  }
  /* ★★ 2026-10-31 iPhone・iPad のアプリ表示（html.xv-full）では文書が箱より少し長い（本当の画面の高さ）。
     中身はすべて #app の中でスクロールする作りなので、文書そのものが動くと（入力でキーボードが出たあと等）
     下のナビごと上へずれて浮いて見える → いつも 0 に留める（入力中は iOS が持ち上げているので触らない）。ChainParty と同じ。 */
  function pinDoc() {
    if (!document.documentElement.classList.contains("xv-full")) return;
    if (!window.scrollY && !window.scrollX) return;
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable) && !a.readOnly) return;
    window.scrollTo(0, 0);
  }
  window.addEventListener("scroll", pinDoc, { passive: true });
  document.addEventListener("focusout", () => { setTimeout(pinDoc, 60); setTimeout(pinDoc, 360); });
  if (window.visualViewport) visualViewport.addEventListener("resize", () => setTimeout(pinDoc, 60));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

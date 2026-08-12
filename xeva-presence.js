/* ============================================================
   XEVA-Presence — 「いま何を開いているか」をフレンドに知らせる
   ・XEVARION アカウント（xevarion-account）の accounts/{uid}/presence に
     最終アクセス時刻とアプリIDを書く。5分以内ならコミュニティで「オンライン」表示。
   ・オンライン対戦アプリは、部屋を作った／入ったときに
     XevaPresence.room(code, stage) を呼ぶと accounts/{uid}/room が公開され、
     フレンドは番号を聞かずに「参加」から合流できる。抜けたら XevaPresence.leave()。
   ・置くだけで動く（読み込むだけで presence を更新する）。
   ============================================================ */
(function () {
  "use strict";

  var HEARTBEAT = 90 * 1000;   // 90秒ごとに更新

  function jparse(s, d) { try { return s == null ? d : JSON.parse(s); } catch (e) { return d; } }
  function uid() {
    var ls = jparse(localStorage.getItem("xeva_session_v1"), null);
    if (ls && ls.uid) return ls.uid;
    var a = jparse(localStorage.getItem("xeva_account_v1"), null);
    return (a && a.xvUid) || null;
  }
  function loggedIn() {
    var a = jparse(localStorage.getItem("xeva_account_v1"), null);
    if (!a || !a.setupDone) return false;
    var s = jparse(localStorage.getItem("xeva_session_v1"), null);
    return !(s && s.active === false);
  }

  /* このページのアプリID（ポータル直下のフォルダ名） */
  var APP_ID = (function () {
    try {
      var segs = location.pathname.split("/").filter(Boolean);
      for (var i = segs.length - 1; i >= 0; i--) {
        if (!/\.html?$/i.test(segs[i])) return segs[i].toLowerCase();
      }
    } catch (e) {}
    return "portal";
  })();

  function whenFB() {
    return new Promise(function (res) {
      if (window.XEVARIONFB) return res(window.XEVARIONFB);
      var done = false;
      var f = function () { if (!done) { done = true; res(window.XEVARIONFB || null); } };
      window.addEventListener("xevarionfb:ready", f, { once: true });
      setTimeout(f, 8000);
    });
  }

  var timer = null;
  async function beat() {
    if (!loggedIn() || navigator.onLine === false) return;
    var u = uid(); if (!u) return;
    var FB = await whenFB();
    if (!FB || !FB.setPresence) return;
    FB.setPresence(u, APP_ID);
  }

  async function room(code, stage) {
    var u = uid(); if (!u || !code) return;
    var FB = await whenFB();
    if (FB && FB.publishRoom) FB.publishRoom(u, APP_ID, code, stage);
  }
  async function leave() {
    var u = uid(); if (!u) return;
    var FB = await whenFB();
    if (FB && FB.clearRoom) FB.clearRoom(u);
  }

  /* URL の ?join=CODE を取り出す（フレンドの部屋へ合流する導線） */
  function joinCode() {
    try { return new URLSearchParams(location.search).get("join") || ""; } catch (e) { return ""; }
  }

  window.XevaPresence = { beat: beat, room: room, leave: leave, joinCode: joinCode, appId: APP_ID };

  beat();
  timer = setInterval(beat, HEARTBEAT);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") beat(); });
  window.addEventListener("online", beat);
  window.addEventListener("pagehide", function () { try { clearInterval(timer); leave(); } catch (e) {} });
})();

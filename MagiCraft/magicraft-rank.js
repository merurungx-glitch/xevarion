/* ============================================================
   MagiCraftRank — クリア記録（タイムアタック / 死亡回数）を
   XEVARION アカウントに紐づけて MagiRanking へ送信する。
   ・ログイン中のポータルアカウント（xeva_account_v1）を本人とみなす
   ・クリア時に main.js の onBossWin から submit(time, deaths) が呼ばれる
   ・アカウント未設定なら送信しない（ローカルのベストタイムは従来どおり保存）
   window.MagiCraftRank として公開（プレーンスクリプト）。
   ============================================================ */
(function () {
  "use strict";

  function whenFB(timeout) {
    return new Promise(function (res) {
      if (window.XEVARIONFB) return res(window.XEVARIONFB);
      var done = false, fin = function () { if (!done) { done = true; res(window.XEVARIONFB || null); } };
      window.addEventListener("xevarionfb:ready", fin, { once: true });
      setTimeout(fin, timeout || 6000);
    });
  }

  function myAccount() {
    try {
      var a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
      if (!a || !a.xvUid) return null;
      var charFile = a.charFile || "";
      // charFile 未保存でも XEVA.account.getChar から補完
      if (!charFile && window.XEVA && XEVA.account && XEVA.account.getChar) {
        var ch = XEVA.account.getChar(); if (ch && ch.file) charFile = ch.file;
      }
      return { uid: a.xvUid, name: a.name || "プレイヤー", charFile: charFile };
    } catch (e) { return null; }
  }

  function toast(msg) {
    try { if (window.UI && UI.toast) UI.toast(msg, 'gold'); } catch (e) {}
  }

  function submit(timeSec, deaths) {
    var acc = myAccount();
    if (!acc) return; // 未ログインは記録しない
    whenFB().then(function (FB) {
      if (!FB || !FB.submitMagiCraftRecord) return;
      FB.submitMagiCraftRecord(acc.uid, { name: acc.name, charFile: acc.charFile }, timeSec, deaths)
        .then(function (r) {
          if (r && r.ok) {
            setTimeout(function () { toast("🏆 記録を MagiRanking に送信しました！"); }, 1400);
          }
        });
    });
  }

  window.MagiCraftRank = { submit: submit };
})();

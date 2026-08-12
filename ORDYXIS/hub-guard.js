// ============================================================
// ORDYXIS アクセスガード (店舗用 / モニター用)
//  - 店舗用(store.html) / モニター用(monitor.html) を index(ハブ) を経由せず
//    直接URLで開かれた場合のみ、その場でアクセスコードを要求する。
//  - index.html を開くと解錠トークンが付与されるため、ハブ経由ならコード入力は不要。
//  - お客様用(customer.html)は QR から直接開くため保護しない（常に公開）。
//  - 認証状態はセッション中のみ保持 (sessionStorage キー ordyxis_access_v1)。
// ============================================================
(function () {
  "use strict";
  var KEY = "ordyxis_access_v1";
  var ACCESS_CODE = "ODX613Prime26";

  // アクセスコードによるページ保護を無効化 (店舗用・モニター用とも素通り)。
  //   ※ 再びコードを要求したい場合は GUARD_ENABLED を true に戻す。
  var GUARD_ENABLED = false;
  if (!GUARD_ENABLED) {
    // 互換のため解錠トークンは付与しておく (将来 GUARD_ENABLED を戻しても影響が出ないように)。
    try { sessionStorage.setItem(KEY, ACCESS_CODE); } catch (e) {}
    return;
  }

  // 保護対象は店舗用・モニター用のみ。お客様用・その他のページは素通り。
  var path = (location.pathname || "").toLowerCase();
  if (!/(?:^|\/)(store|monitor)\.html$/.test(path)) return;

  function isUnlocked() {
    try { return sessionStorage.getItem(KEY) === ACCESS_CODE; } catch (e) { return false; }
  }
  // index(ハブ)経由などで既に解錠済み → コード入力なしでそのまま表示
  if (isUnlocked()) return;

  // --- 直接アクセス → その場でパスワードを要求 (index へは戻さない) ---
  var css = "" +
    "#odxg{position:fixed;inset:0;z-index:2147483647;background:#0b0e16;color:#e6ebf5;" +
    "display:flex;align-items:center;justify-content:center;padding:24px;" +
    "font-family:'Segoe UI','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;}" +
    "#odxg .box{width:min(420px,100%);background:rgba(20,26,40,.7);border:1px solid rgba(255,255,255,.1);" +
    "border-radius:22px;padding:32px 28px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.5);}" +
    "#odxg .lock{width:58px;height:58px;margin:0 auto 16px;border-radius:50%;display:flex;" +
    "align-items:center;justify-content:center;font-size:26px;" +
    "background:linear-gradient(135deg,#49a8ff,#a07ae0,#f0a73d);box-shadow:0 8px 26px rgba(73,168,255,.4);}" +
    "#odxg h2{font-size:17px;font-weight:700;margin-bottom:6px;}" +
    "#odxg p{font-size:12.5px;color:#9aa6bd;margin-bottom:20px;line-height:1.7;}" +
    "#odxg .field{position:relative;margin-bottom:14px;}" +
    "#odxg input{width:100%;background:rgba(8,11,18,.7);border:1.5px solid rgba(255,255,255,.14);" +
    "border-radius:12px;color:#fff;font-size:16px;letter-spacing:.12em;padding:14px 56px 14px 16px;outline:none;}" +
    "#odxg input:focus{border-color:#49a8ff;box-shadow:0 0 0 3px rgba(73,168,255,.18);}" +
    "#odxg .eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;" +
    "color:#7d8aa3;cursor:pointer;padding:6px;font-size:13px;}" +
    "#odxg .go{width:100%;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:800;" +
    "letter-spacing:.06em;color:#fff;cursor:pointer;background:linear-gradient(135deg,#49a8ff,#a07ae0,#f0a73d);" +
    "box-shadow:0 8px 24px rgba(73,168,255,.3);}" +
    "#odxg .msg{min-height:18px;margin-top:12px;font-size:12.5px;color:#ff8a8a;}" +
    "#odxg.shake .box{animation:odxgShake .4s;}" +
    "@keyframes odxgShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}" +
    "40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}";

  var pageTitle = /monitor\.html$/.test(path) ? "モニター用" : "店舗用";
  var html = '<div class="box">' +
    '<div class="lock">🔒</div>' +
    '<h2>アクセスコードを入力</h2>' +
    '<p>この画面（' + pageTitle + '）はアクセスコードが必要です。<br>関係者の方はコードを入力してください。</p>' +
    '<div class="field">' +
    '<input id="odxg-code" type="password" inputmode="text" autocomplete="off" placeholder="アクセスコードを入力" aria-label="アクセスコード">' +
    '<button class="eye" id="odxg-eye" type="button" aria-label="表示切替">表示</button>' +
    '</div>' +
    '<button class="go" id="odxg-go" type="button">ロックを解除</button>' +
    '<div class="msg" id="odxg-msg"></div>' +
    '</div>';

  function mount() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head ? document.head.appendChild(style) : document.documentElement.appendChild(style);

    var ov = document.createElement("div");
    ov.id = "odxg";
    ov.innerHTML = html;
    document.body.appendChild(ov);
    // 背後のページが見えたり操作されたりしないようにスクロールを止める
    document.documentElement.style.overflow = "hidden";

    var input = ov.querySelector("#odxg-code");
    var msg   = ov.querySelector("#odxg-msg");

    function tryUnlock() {
      if (input.value === ACCESS_CODE) {
        try { sessionStorage.setItem(KEY, ACCESS_CODE); } catch (e) {}
        document.documentElement.style.overflow = "";
        ov.remove();
      } else {
        msg.textContent = "アクセスコードが正しくありません。";
        ov.classList.remove("shake"); void ov.offsetWidth; ov.classList.add("shake");
        input.select();
      }
    }
    ov.querySelector("#odxg-go").addEventListener("click", tryUnlock);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryUnlock(); else msg.textContent = "";
    });
    ov.querySelector("#odxg-eye").addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      this.textContent = show ? "隠す" : "表示";
      input.focus();
    });
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 100);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();

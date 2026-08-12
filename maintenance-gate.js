/* ============================================================
   XEVARION メンテナンスゲート
   ・system/maintenance を REST で読み取り（SDK 非依存・最速）
   ・on かつ 非管理者 のとき全画面オーバーレイでアクセスを遮断
   ・管理者は admin.html でアクセスコードを入力すると解錠フラグが付き、
     メンテ中でも各ページを閲覧できる。オーバーレイ上でも同コードで解錠可能。
   ・どのフォルダ階層のページからでも読めるよう Firebase の絶対URLを使用。
     使い方（各ページの <head> 先頭付近に）:
       <script src="maintenance-gate.js?v=1"></script>          （ルート）
       <script src="../maintenance-gate.js?v=1"></script>       （1階層下）
   ============================================================ */
(function () {
  "use strict";
  /* ★ 参照先は現行の xevarion-account（xevarion-fb.js と同じプロジェクト）。
     旧 xevarion-b6425 を見ていたため、管理画面で解除しても
     「旧DBに残った on:true」を読み続けてメンテが解けない状態になっていた。 */
  var DB = "https://xevarion-account-default-rtdb.asia-southeast1.firebasedatabase.app";

  /* 入力コードは平文では保持せず、SHA-256ハッシュで照合する（コード流出防止） */
  var ACCESS_HASH = "043597417b58703ba306393a392628045baf99cb0da899f496680e65667f90df";
  function sha256hex(str, cb) {
    try {
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        var a = Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
        cb(a);
      }).catch(function () { cb(""); });
    } catch (e) { cb(""); }
  }
  var ADMIN_KEY = "xeva_admin_ok_v1";        // localStorage: 管理者としてブラウザに記憶
  var SESS_KEY = "xeva_admin_unlocked_v1";   // sessionStorage: admin.html の解錠

  // このゲートスクリプトの場所からポータル index.html を解決（どの階層のページからでも）
  var GATE_SRC = (document.currentScript && document.currentScript.src) || "";
  var PORTAL_URL = (function () { try { return new URL("index.html", GATE_SRC).href; } catch (e) { return ""; } })();
  // 現在のページが属するアプリID（＝親フォルダ名を小文字化。例 /MagiBattle/index.html → "magibattle"）と表示名
  var APP = (function () {
    try {
      var segs = location.pathname.split("/").filter(Boolean);
      if (segs.length >= 2) { var f = segs[segs.length - 2]; return { id: f.toLowerCase(), label: f }; }
    } catch (e) {}
    return { id: "", label: "" };
  })();

  function isAdmin() {
    try { if (localStorage.getItem(ADMIN_KEY) === "1") return true; } catch (e) {}
    try { if (sessionStorage.getItem(SESS_KEY) === "1") return true; } catch (e) {}
    return false;
  }
  function grantAdmin() { try { localStorage.setItem(ADMIN_KEY, "1"); } catch (e) {} }

  function fmt(ts) {
    if (!ts) return "";
    try {
      var d = new Date(ts), p = function (n) { return String(n).padStart(2, "0"); };
      return d.getFullYear() + "/" + p(d.getMonth() + 1) + "/" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
    } catch (e) { return ""; }
  }

  // ブロックすべきか（scheduled は終了時刻を過ぎたら自動的に解除）
  function isBlocking(m) {
    if (!(m && m.on)) return false;
    if (m.type === "scheduled" && m.until && Date.now() >= m.until) return false;
    return true;
  }
  function remainText(until) {
    var ms = until - Date.now();
    if (ms <= 0) return "まもなく再開します";
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60), sc = s % 60;
    var p = function (n) { return String(n).padStart(2, "0"); };
    return (h > 0 ? h + "時間" : "") + p(mn) + "分" + p(sc) + "秒";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function removeOverlay() {
    var ov = document.getElementById("xevaMaint");
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    try { document.documentElement.style.overflow = ""; } catch (e) {}
    try { if (document.body) document.body.style.overflow = ""; } catch (e) {}
  }

  function showOverlay(m, opts) {
    if (document.getElementById("xevaMaint")) return;
    opts = opts || {};
    var perApp = opts.scope === "app";
    var appLabel = opts.appLabel || APP.label || "このアプリ";
    var emergency = (m && m.type) !== "scheduled";
    var scheduled = !emergency && m && m.until;
    var defMsg = perApp
      ? "「" + appLabel + "」は現在メンテナンス中です。\nほかのアプリはこれまで通りご利用いただけます。"
      : (emergency
        ? "緊急メンテナンスを行っています。\nご不便をおかけします。復旧までしばらくお待ちください。"
        : "メンテナンスを行っています。\nしばらく経ってから再度アクセスしてください。");
    var msg = (m && m.message) ? String(m.message) : defMsg;
    var reason = (m && m.reason) ? String(m.reason) : "";
    var accent = emergency ? "#ff5d6c,#ff7a45" : "#6b8bff,#ff6ba8";

    var ov = document.createElement("div");
    ov.id = "xevaMaint";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483647",
      "display:flex", "align-items:center", "justify-content:center",
      "padding:24px", "box-sizing:border-box",
      "font-family:'Noto Sans JP',system-ui,-apple-system,sans-serif",
      "color:#e8ecff",
      "background:radial-gradient(120% 60% at 12% -10%," + (emergency ? "rgba(255,93,108,.22)" : "rgba(107,139,255,.22)") + ",transparent 60%)," +
        "radial-gradient(110% 55% at 100% 0%,rgba(155,107,255,.18),transparent 55%)," +
        "linear-gradient(180deg,#0d1022,#141a33)",
      "-webkit-backdrop-filter:blur(2px)", "backdrop-filter:blur(2px)"
    ].join(";");

    var badge = perApp
      ? '<div style="display:inline-block;font-size:11px;font-weight:900;letter-spacing:.08em;padding:5px 13px;border-radius:100px;margin-bottom:14px;background:rgba(107,139,255,.18);color:#9db2ff">🛠️ ' + esc(appLabel) + ' メンテナンス</div>'
      : (emergency
        ? '<div style="display:inline-block;font-size:11px;font-weight:900;letter-spacing:.08em;padding:5px 13px;border-radius:100px;margin-bottom:14px;background:rgba(255,93,108,.18);color:#ff8b96">🚨 緊急メンテナンス</div>'
        : '<div style="display:inline-block;font-size:11px;font-weight:900;letter-spacing:.08em;padding:5px 13px;border-radius:100px;margin-bottom:14px;background:rgba(107,139,255,.18);color:#9db2ff">🛠️ メンテナンス</div>');

    var timeBlock = scheduled
      ? '<div style="margin:0 auto 20px;max-width:340px;padding:12px 14px;border:1px solid rgba(150,170,255,.18);border-radius:14px;background:rgba(26,33,64,.6)">' +
          '<div style="font-size:11px;color:#98a2cf;font-weight:700;margin-bottom:4px">終了予定</div>' +
          '<div style="font-size:15px;font-weight:800;color:#e8ecff;font-family:\'Orbitron\',monospace">' + esc(fmt(m.until)) + '</div>' +
          '<div id="xmCountdown" style="font-size:12px;color:#9db2ff;font-weight:700;margin-top:5px">あと ' + esc(remainText(m.until)) + '</div>' +
        '</div>'
      : '<div style="height:8px"></div>';

    ov.innerHTML =
      '<div style="max-width:460px;width:100%;text-align:center">' +
        '<div style="font-size:56px;line-height:1;margin-bottom:14px">' + (emergency ? '🚨' : '🛠️') + '</div>' +
        badge +
        '<h1 style="font-family:\'Orbitron\',sans-serif;font-size:22px;letter-spacing:.5px;margin:0 0 14px;' +
          'background:linear-gradient(120deg,' + accent + ');-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">' +
          'MAINTENANCE</h1>' +
        (reason
          ? '<div style="display:inline-block;max-width:400px;margin:0 auto 14px;padding:8px 14px;border:1px solid rgba(150,170,255,.22);border-radius:12px;background:rgba(26,33,64,.55);font-size:13px;line-height:1.6;color:#e8ecff">' +
              '<span style="color:#98a2cf;font-weight:800;margin-right:6px">理由</span>' + esc(reason) + '</div>'
          : '') +
        '<p style="font-size:14px;line-height:1.9;color:#c3cbf2;white-space:pre-wrap;margin:0 auto 18px;max-width:400px">' +
          esc(msg) + '</p>' +
        timeBlock +
        ((perApp && PORTAL_URL)
          ? '<div style="margin:2px 0 14px"><a href="' + esc(PORTAL_URL) + '" style="display:inline-block;padding:12px 22px;border-radius:12px;font-weight:800;font-size:14px;text-decoration:none;color:#fff;background:linear-gradient(120deg,#6b8bff,#9b6bff)">← ポータルへ戻る</a></div>'
          : '') +
        '<button id="xmAdminToggle" style="background:none;border:none;color:#6b76a8;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:underline;padding:6px">管理者の方はこちら</button>' +
        '<div id="xmAdminBox" style="display:none;margin-top:14px">' +
          '<div style="display:flex;gap:8px;max-width:340px;margin:0 auto">' +
            '<input id="xmCode" type="password" inputmode="text" autocomplete="off" placeholder="アクセスコード" ' +
              'style="flex:1;padding:12px 14px;border:1.5px solid rgba(150,170,255,.22);border-radius:12px;background:#1a2140;color:#e8ecff;font-size:16px;outline:none;font-family:inherit">' +
            '<button id="xmGo" style="border:none;border-radius:12px;padding:12px 18px;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;background:linear-gradient(120deg,#6b8bff,#9b6bff);color:#fff">解錠</button>' +
          '</div>' +
          '<div id="xmMsg" style="min-height:18px;font-size:12px;font-weight:700;color:#ff5d6c;margin-top:10px"></div>' +
        '</div>' +
      '</div>';

    (document.body || document.documentElement).appendChild(ov);
    try { document.documentElement.style.overflow = "hidden"; } catch (e) {}
    try { if (document.body) document.body.style.overflow = "hidden"; } catch (e) {}

    // scheduled：カウントダウン更新＆終了時刻で自動解除（サイト復帰）
    if (scheduled) {
      var cd = ov.querySelector("#xmCountdown");
      var timer = setInterval(function () {
        if (!document.getElementById("xevaMaint")) { clearInterval(timer); return; }
        if (Date.now() >= m.until) { clearInterval(timer); removeOverlay(); return; }
        if (cd) cd.textContent = "あと " + remainText(m.until);
      }, 1000);
    }

    var toggle = ov.querySelector("#xmAdminToggle");
    var box = ov.querySelector("#xmAdminBox");
    var input = ov.querySelector("#xmCode");
    var go = ov.querySelector("#xmGo");
    var msgEl = ov.querySelector("#xmMsg");

    toggle.addEventListener("click", function () {
      box.style.display = "block";
      toggle.style.display = "none";
      setTimeout(function () { input.focus(); }, 40);
    });
    function tryUnlock() {
      sha256hex((input.value || "").trim(), function (hex) { if (hex === ACCESS_HASH) {
        grantAdmin();
        removeOverlay();
      } else {
        msgEl.textContent = "アクセスコードが正しくありません。";
        input.value = "";
        input.focus();
      } });
    }
    go.addEventListener("click", tryUnlock);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") tryUnlock(); });
  }

  function block(m, opts) {
    if (document.body) showOverlay(m, opts);
    else document.addEventListener("DOMContentLoaded", function () { showOverlay(m, opts); });
  }

  // グローバル → アプリ個別 の順で判定（グローバルが優先）。
  // 「いま塞ぐべき状態」を返し、塞がないなら null。
  function blockerOf(sys) {
    sys = sys || {};
    if (isAdmin()) return null;                         // 管理者 → 通過
    var g = sys.maintenance;
    if (isBlocking(g)) return { m: g, opts: { scope: "global" } };
    // このページのアプリだけのメンテ
    if (APP.id && sys.maintenanceApps && sys.maintenanceApps[APP.id]) {
      var a = sys.maintenanceApps[APP.id];
      if (isBlocking(a)) return { m: a, opts: { scope: "app", appLabel: APP.label } };
    }
    return null;
  }

  /* ★ 解除がその場で効くようにする。
     旧実装は起動時に1回読むだけだったので、管理画面で解除しても
     開きっぱなしの端末は再読込するまでメンテ画面のままだった。
     ここでは定期的に読み直し、解除されていればオーバーレイを外して
     ページをそのまま使えるようにする（逆に開始も反映される）。 */
  var lastKey = "";
  function apply(sys) {
    var b = blockerOf(sys);
    var key = b ? (b.opts.scope + ":" + b.m.type + ":" + b.m.until + ":" + b.m.updatedAt) : "";
    if (key === lastKey) return;                        // 状態が変わっていない
    lastKey = key;
    removeOverlay();                                    // いったん外してから貼り直す
    if (b) block(b.m, b.opts);
  }

  function poll() {
    if (isAdmin()) { removeOverlay(); return; }
    fetch(DB + "/system.json?_=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(apply)
      .catch(function () { /* 取得失敗時は現状維持（締め出しも解除もしない） */ });
  }

  // 管理者はネットワークを待たずに即通過（無用な取得も避ける）
  if (isAdmin()) return;

  poll();                                               // 起動時に1回
  setInterval(poll, 30000);                             // 以後30秒ごとに追従
  // タブに戻ってきた時は即座に確認（バックグラウンドのタイマーは間引かれるため）
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") poll();
  });
})();

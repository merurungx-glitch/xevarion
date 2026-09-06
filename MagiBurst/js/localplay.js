/* ══════════════════════════════════════════════════════════════
   localplay.js — LOCAL PLAY（近距離ローカルマルチ）の画面
   ──────────────────────────────────────────────────────────────
   ★★ 2026-09-06 ご指定のプロンプトどおりに作り直したもの。

   【通信】
     ・WebRTC DataChannel（P2P）。ゲームサーバーは<b>使わない</b>。
     ・最大4人。iPhone / Android / PC。
     ・Wi-Fiルーターは必須ではない（テザリングでも、同じ LAN ならつながる）。
     ・無料（外部サービスを1つも使わない。iceServers は空＝ローカル網だけ）。
   【接続の流れ】
     ① 「ルームを作る」でホストになる
     ② <b>接続用コード</b>と<b>QRコード</b>を出す
     ③ 相手がコードを入れる／QRを読む
     ④ WebRTC で P2P につながる
     ⑤ 最大4人まで
     ⑥ ホストが「ゲーム開始」
     ⑦ ゲーム中は<b>ゲームイベントだけ</b>を P2P で送る
        （CARD_PLAY / ATTACK / USE_SKILL / END_TURN / PLAYER_READY）
   【画面】
     LOCAL PLAY → [ルームを作る] [ルームに参加]
     作成後: Room Code / QR / 参加者 1/4
     接続後: Player 01〜04 → [ゲーム開始]

   ★★ なぜ「短い6文字の合い言葉（ABC123）」にできないのか（大事なところ）
     短い合い言葉で相手を見つけるには、その文字列と接続情報を結びつける
     <b>受付サーバー</b>が要ります。ご指定は「ゲームサーバーは使用しない」なので、
     <b>接続情報そのものを渡す</b>しかありません。
     そこで、この画面の Room Code は<b>接続情報を圧縮した文字列</b>です。
     人が打ちこむのは大変なので、
       ・<b>QRコード</b>（いちばん早い。iPhone は標準のカメラでよい）
       ・<b>コピー</b>（LINE などで貼って渡す）
     の2つを用意してあります。QRの中身は<b>このページのURL ＋ #mbjoin=コード</b>なので、
     読むだけで MagiBurst が開き、この画面の「参加」まで自動で進みます。

   ★ 通信の中身は js/local.js（window.BurstLocal）。ここは<b>画面だけ</b>。
     BurstLocal は BurstOnline と同じ名前・同じ戻り値なので、
     つながったあとのバトルは<b>オンラインとまったく同じコード</b>が動きます。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var MAX = 4;
  var S = {
    open: false,
    view: "top",     /* top / host / guest / lobby */
    code: "",        /* ホストが出す接続用コード（フル） */
    qr: "",          /* QR に入れる短い形（無ければ code） */
    answer: "",      /* ゲストが出すへんじコード */
    invite: "",      /* ゲストが受け取ったまねきコード */
    msg: "",
    joined: 1,
  };
  window.LP = S;

  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function say(t) { S.msg = t || ""; render(); }

  /* ── 参加の URL（QR の中身）。標準のカメラで読むだけで開ける ── */
  function joinURL(code) {
    var base = location.href.split("#")[0].replace(/index\.html$/, "");
    return base + "index.html#mbjoin=" + encodeURIComponent(code || "");
  }

  /* ── 画面を作る（初回だけ） ── */
  function ensureDom() {
    if (document.getElementById("lpOv")) return;
    var ov = document.createElement("div");
    ov.id = "lpOv";
    ov.className = "lpov";
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    ov.innerHTML = '<div class="lpcard" id="lpCard"></div>';
    document.body.appendChild(ov);
  }

  /* ── 参加者の行（Player 01〜04）── */
  function playersHTML() {
    var room = null;
    try { room = (window.BurstLocal && BurstLocal.room && BurstLocal.room()) || null; } catch (e) {}
    var ids = room && room.players ? Object.keys(room.players) : [];
    var n = Math.max(S.joined, ids.length || 1);
    var rows = "";
    for (var i = 0; i < MAX; i++) {
      var on = i < n;
      var p = ids[i] ? room.players[ids[i]] : null;
      var nm = p && p.name ? p.name : (on ? "接続ずみ" : "空き");
      rows += '<div class="lprow ' + (on ? "on" : "") + '">'
        + '<span class="lpno">PLAYER ' + ("0" + (i + 1)).slice(-2) + "</span>"
        + '<span class="lpnm">' + esc(nm) + "</span>"
        + '<span class="lpdot ' + (on ? "on" : "") + '"></span></div>';
    }
    return rows;
  }

  function render() {
    ensureDom();
    var card = document.getElementById("lpCard");
    if (!card) return;
    var head = '<div class="lphead"><div class="lptitle">LOCAL PLAY</div>'
      + '<button class="lpx" onclick="LocalPlay.close()">✕</button></div>';
    var msg = S.msg ? '<div class="lpmsg">' + S.msg + "</div>" : "";

    if (S.view === "top") {
      card.innerHTML = head
        + '<div class="lpnote">近くの人と<b>インターネットを使わずに</b>遊べます。<b>最大4人</b>。'
        + '<br>ゲームサーバーは<b>使いません</b>。通信量もかかりません。</div>'
        + '<div class="lpbtns">'
        + '<button class="lpbtn go" onclick="LocalPlay.createRoom()">ルームを作る</button>'
        + '<button class="lpbtn" onclick="LocalPlay.goJoin()">ルームに参加</button>'
        + "</div>" + msg
        + '<div class="lphelp">'
        + '<b>Wi-Fi もテザリングも無しで遊べる？</b><br>'
        + '——<b>ブラウザで動くゲームでは、残念ながらできません。</b>'
        + 'すれちがい通信のような<b>Bluetooth や Wi-Fi Direct を、ブラウザから直接さわる方法が'
        + 'iPhone にも Android にも用意されていない</b>ためです。'
        + '<br>ただし<b>インターネット回線はいりません</b>。'
        + '2台が<b>同じ小さなネットワーク</b>にいれば、そのまま直接つながります。'
        + '<br>・同じ Wi-Fi につなぐ（お店・家・学校のどれでも／<b>その Wi-Fi が外につながっていなくてもOK</b>）'
        + '<br>・どちらかの<b>インターネット共有（テザリング）</b>をオンにして、もう一方がそこへつなぐ'
        + '<br>　<b>回線が無くても・契約が切れていても</b>、Wi-Fi の輪さえできれば遊べます。'
        + "</div>";
      return;
    }

    if (S.view === "host") {
      var url = joinURL(S.qr || S.code);
      card.innerHTML = head
        + '<div class="lpsec">ROOM CODE</div>'
        + '<div class="lpqr" id="lpQR"></div>'
        + '<div class="lpcode"><textarea id="lpCodeBox" readonly onclick="this.select()">' + esc(S.code) + "</textarea>"
        + '<span class="lplen">' + (S.code || "").length + " 文字</span></div>"
        + '<button class="lpbtn sm" onclick="LocalPlay.copy(\'lpCodeBox\')">📋 コードをコピー</button>'
        + '<div class="lpjoined">参加者：<b>' + S.joined + "</b> / " + MAX + "</div>"
        + '<div class="lplist">' + playersHTML() + "</div>"
        + '<div class="lpsec">へんじコード（相手からもらう）</div>'
        + (canScan()
            ? '<button class="lpbtn sm" onclick="LocalPlay.scan(\'lpAns\')">📷 カメラで相手の QR を読み取る</button>'
            : '<div class="lphelp">📷 この端末はゲームの中からカメラを使えません。'
              + '相手に「📋 へんじコードをコピー」を押してもらい、送ってもらったものを'
              + '<b>下の欄に貼りつけ</b>てください。</div>')
        + '<div class="lpcode"><textarea id="lpAns" placeholder="相手の画面に出た『へんじコード』をここに貼りつけ"'
        + ' autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"></textarea></div>'
        + '<button class="lpbtn sm" onclick="LocalPlay.paste(\'lpAns\')">📥 貼りつける</button>'
        + '<button class="lpbtn go" onclick="LocalPlay.accept()">つなぐ</button>'
        + msg
        + (S.joined >= 2
            ? '<button class="lpbtn go big" onclick="LocalPlay.start()">ゲーム開始</button>'
            : '<div class="lphelp">2人めがつながると「ゲーム開始」が出ます。'
              + 'さらに増やすときは、つながったあとに<b>もう一度この画面</b>を開いてください。</div>')
        + '<button class="lpbtn sm" onclick="LocalPlay.close()">とじる</button>';
      paintQR("lpQR", url);
      return;
    }

    if (S.view === "guest") {
      card.innerHTML = head
        + '<div class="lpsec">① ルームのコードを入れる</div>'
        + (canScan()
            ? '<button class="lpbtn go" onclick="LocalPlay.scan(\'lpInv\')">📷 カメラでホストの QR を読み取る</button>'
              + '<div class="lphelp">ホストの画面に出ている QR に、カメラを向けてください。'
              + '読み取れたら下の欄にひとりでに入ります。</div>'
            : '<div class="lphelp">📷 <b>この端末のブラウザは、ゲームの中からカメラで QR を読めません</b>'
              + '（iPhone の Safari など）。<br>'
              + '<b>端末の「カメラ」アプリでホストの QR を写してください。</b>'
              + '出てきたリンクを開くと、この画面が<b>コードの入った状態</b>で開きます。</div>')
        + '<div class="lpcode"><textarea id="lpInv" placeholder="ホストの画面に出た『ROOM CODE』をここに貼りつけ"'
        + ' autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false">' + esc(S.invite) + "</textarea></div>"
        + '<button class="lpbtn sm" onclick="LocalPlay.paste(\'lpInv\')">📥 貼りつける</button>'
        + '<button class="lpbtn go" onclick="LocalPlay.joinRoom()">ルームに参加</button>'
        + msg
        + (S.answer
            ? '<div class="lpsec">② へんじコードをホストに渡す</div>'
              + '<div class="lpqr" id="lpQR2"></div>'
              + '<div class="lpcode"><textarea id="lpAnsBox" readonly onclick="this.select()">' + esc(S.answer) + "</textarea></div>"
              + '<button class="lpbtn sm" onclick="LocalPlay.copy(\'lpAnsBox\')">📋 へんじコードをコピー</button>'
              + '<div class="lphelp">ホストがこれを読むと<b>つながります</b>。そのまま待っていてください。</div>'
            : "")
        + '<button class="lpbtn sm" onclick="LocalPlay.close()">とじる</button>';
      if (S.answer) paintQR("lpQR2", joinURL(S.answerQR || S.answer));
      return;
    }

    /* lobby */
    card.innerHTML = head
      + '<div class="lpjoined">参加者：<b>' + S.joined + "</b> / " + MAX + "</div>"
      + '<div class="lplist">' + playersHTML() + "</div>"
      + msg
      + '<button class="lpbtn go big" onclick="LocalPlay.start()">ゲーム開始</button>'
      + '<button class="lpbtn sm" onclick="LocalPlay.close()">とじる</button>';
  }

  /* ── QR ── */
  function paintQR(id, text) {
    var box = document.getElementById(id);
    if (!box) return;
    box.innerHTML = "";
    if (!text) { box.innerHTML = '<div class="lphelp">コードを作っています…</div>'; return; }
    if (!window.XevaQR) { box.innerHTML = '<div class="lphelp">QR を作る部品が読みこめませんでした。コピーで渡してください。</div>'; return; }
    if (!XevaQR.fits(text)) {
      /* ★ 長すぎて QR に入らないとき。ここで<b>だまって何も出さない</b>と
         「QRが表示されない」に見えるので、理由を必ず書く。 */
      box.innerHTML = '<div class="lphelp">この回のコードは QR に入る長さ（' + XevaQR.MAX_BYTES
        + 'バイト）を超えました。<b>コピー</b>で渡してください。</div>';
      return;
    }
    try { box.appendChild(XevaQR.canvas(text, 240)); }
    catch (e) { box.innerHTML = '<div class="lphelp">QR を作れませんでした。コピーで渡してください。</div>'; }
  }

  function canScan() { return typeof window.BarcodeDetector === "function"; }

  /* ── 操作 ── */
  async function createRoom() {
    if (!window.BurstLocal) { say("ローカル通信の部品が読みこめませんでした。"); return; }
    say("ルームを作っています…");
    try {
      var prof = (typeof window.onProfile === "function") ? window.onProfile() : { name: "Player 01" };
      var stage = (typeof window.ON === "object" && ON.stage) ? ON.stage : "";
      await BurstLocal.create(prof, stage);
      if (typeof window.watchRoom === "function") { try { watchRoom(); } catch (e) {} }
      var r = await BurstLocal.hostInvite();
      if (!r || r.error) { say("ルームを作れませんでした（" + ((r && r.error) || "?") + "）"); return; }
      S.code = r.code || "";
      S.qr = r.qr || r.code || "";
      S.joined = 1;
      S.view = "host";
      say("");
    } catch (e) { say("ルームを作れませんでした。"); }
  }

  function goJoin() { S.view = "guest"; say(""); }

  async function joinRoom() {
    var el = document.getElementById("lpInv");
    var code = (el ? el.value : S.invite || "").trim();
    if (!code) { say("ROOM CODE を入れてください。"); return; }
    say("つないでいます…");
    try {
      var prof = (typeof window.onProfile === "function") ? window.onProfile() : { name: "Player" };
      var r = await BurstLocal.guestAnswer(code, prof);
      if (!r || r.error) { say("コードが読めませんでした（全部を貼れているか確かめてください）。"); return; }
      S.invite = code;
      S.answer = r.code || "";
      S.answerQR = r.qr || "";
      if (typeof window.watchRoom === "function") { try { watchRoom(); } catch (e) {} }
      say("へんじコードができました。ホストに渡してください。");
    } catch (e) { say("つなげませんでした。"); }
  }

  async function accept() {
    var el = document.getElementById("lpAns");
    var code = (el ? el.value : "").trim();
    if (!code) { say("へんじコードを貼りつけてください。"); return; }
    say("つないでいます…");
    try {
      var r = await BurstLocal.hostAccept(code);
      if (!r || r.error) { say("へんじコードが読めませんでした。"); return; }
      S.joined = Math.min(MAX, S.joined + 1);
      /* つぎの人ぶんのコードを作っておく（4人まで順番に増やせる） */
      var nx = await BurstLocal.hostInvite();
      if (nx && !nx.error) { S.code = nx.code || ""; S.qr = nx.qr || nx.code || ""; }
      say("つながりました！（参加者 " + S.joined + " / " + MAX + "）");
    } catch (e) { say("つなげませんでした。"); }
  }

  function start() {
    if (typeof window.onStart === "function") { close(); try { onStart(); } catch (e) {} return; }
    /* onStart が無い版のための保険：ロビーの「はじめる」を押す */
    var b = document.querySelector("#onCard .onbtn");
    if (b) { close(); b.click(); return; }
    say("ゲームを開始できませんでした。");
  }

  function copy(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.select();
    try { document.execCommand("copy"); say("コピーしました。相手に渡してください。"); }
    catch (e) {
      try { navigator.clipboard.writeText(el.value); say("コピーしました。"); }
      catch (e2) { say("コピーできませんでした。長押しで選んでコピーしてください。"); }
    }
  }
  async function paste(id) {
    var el = document.getElementById(id);
    if (!el) return;
    try { el.value = await navigator.clipboard.readText(); say("貼りつけました。"); }
    catch (e) { say("貼りつけられませんでした。長押しで貼りつけてください。"); }
  }

  /* カメラで QR を読む（BarcodeDetector がある端末だけ） */
  var stopScan = null;
  async function scan(targetId) {
    if (!canScan()) { say("この端末はアプリの中で QR を読めません。コピー＆貼りつけで渡してください。"); return; }
    if (typeof window.onScanQR === "function") {
      /* 既存のスキャナ（#qrScanOv）をそのまま借りる */
      try { window.__lpScanTarget = targetId; } catch (e) {}
    }
    var ov = document.getElementById("qrScanOv");
    var vid = document.getElementById("qrScanVid");
    if (!ov || !vid) { say("カメラの画面が見つかりませんでした。"); return; }
    ov.classList.add("on");
    var stream = null;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); }
    catch (e) { ov.classList.remove("on"); say("カメラを使えませんでした（許可を確かめてください）。"); return; }
    vid.srcObject = stream; await vid.play().catch(function () {});
    var det = new BarcodeDetector({ formats: ["qr_code"] });
    var stop = false;
    stopScan = function () {
      stop = true; stopScan = null;
      try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      vid.srcObject = null; ov.classList.remove("on");
    };
    var tick = async function () {
      if (stop) return;
      try {
        var codes = await det.detect(vid);
        if (codes && codes.length) {
          var raw = String(codes[0].rawValue || "");
          var m = /#mbjoin=([^&\s]+)/.exec(raw);
          var code = m ? decodeURIComponent(m[1]) : raw;
          stopScan();
          var t = document.getElementById(targetId);
          if (t) t.value = code;
          say("読み取りました。ボタンを押してください。");
          return;
        }
      } catch (e) {}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function closeScan() { if (stopScan) stopScan(); }

  function open(preset) {
    ensureDom();
    S.open = true;
    S.view = preset === "guest" ? "guest" : "top";
    S.msg = "";
    render();
    document.getElementById("lpOv").classList.add("on");
  }
  function close() {
    closeScan();
    var ov = document.getElementById("lpOv");
    if (ov) ov.classList.remove("on");
    S.open = false;
  }

  /* 外から「人が増えた」ことを知らせる（room の watch から呼ぶ） */
  function refresh(n) {
    if (typeof n === "number") S.joined = Math.max(1, Math.min(MAX, n));
    if (S.open) render();
  }

  window.LocalPlay = {
    open: open, close: close, render: render, refresh: refresh,
    createRoom: createRoom, goJoin: goJoin, joinRoom: joinRoom, accept: accept,
    start: start, copy: copy, paste: paste, scan: scan, closeScan: closeScan,
    joinURL: joinURL,
  };
})();

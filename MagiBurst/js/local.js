/* ============================================================
   MagiBurst LOCAL — ★★ 2026-09-01 <b>ローカル通信マルチ</b>（ご指定）
   ------------------------------------------------------------
   ご指定: 「オフラインでも近くの人と部屋を作ってマルチで遊べるように」

   ■ なぜこの作りなのか
     ブラウザ（PWA）には Bluetooth や Wi-Fi Direct で
     「近くの端末をさがす」しくみがありません。
     使えるのは <b>WebRTC</b> だけで、これは
       <b>同じ Wi-Fi の中なら、インターネットが無くてもつながります</b>
     （相手の住所として <b>ローカルIP</b> だけを使うため）。
     ただし最初の「合い言葉」だけは<b>人の手で渡す</b>必要があります。
     そこで
       ① ホストが <b>まねきコード</b> を出す
       ② ゲストがそれを貼りつけて <b>へんじコード</b> を出す
       ③ ホストがそれを貼りつける → つながる
     という3手で始める形にしました（コピー＆ペーストでも、読み上げでもOK）。

   ■ つながったあとの決まりごと
     ・<b>ホストが部屋そのもの</b>を持ちます（room をメモリに置き、変わるたびに配る）。
     ・ゲストはホストにだけつながります（星の形）。ゲストどうしは直接つながりません。
     ・やりとりの中身（room / shot / sync）は<b>オンラインとまったく同じ形</b>にしてあるので、
       画面側は「どちらの通信を使うか」を切り替えるだけで動きます。
   ★ window.BurstLocal として公開。<b>BurstOnline と同じ名前・同じ戻り値</b>にそろえてあります。
     ここを崩すと、画面側で分岐が増えて必ず食いちがいます。
   ============================================================ */
(function () {
  "use strict";

  var MAX_PLAYERS = 4;
  var cur = null;        /* { uid, host } */
  var room = null;       /* ホストだけが持つ「部屋そのもの」。ゲストは配られたものを控える */
  var cbs = null;        /* watch() で渡された受け口 */
  var lastRound = -1;
  var peers = [];        /* ホスト: [{pc, dc, uid}] ／ ゲスト: [{pc, dc}] 1本だけ */
  var seenShot = {};     /* 二重に届いたショットを捨てる */

  /* ══════════ 合い言葉の圧縮（長い SDP を短くする） ══════════
     ★ CompressionStream があれば deflate、無ければそのまま Base64。
       どちらで作ったコードかは<b>頭の1文字</b>で見分ける（Z=圧縮 / P=素）。 */
  function b64e(u8) {
    var s = "";
    for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64d(str) {
    var s = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  async function pack(obj) {
    var raw = new TextEncoder().encode(JSON.stringify(obj));
    try {
      if (typeof CompressionStream === "function") {
        var cs = new CompressionStream("deflate-raw");
        var buf = await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();
        return "Z" + b64e(new Uint8Array(buf));
      }
    } catch (e) {}
    return "P" + b64e(raw);
  }
  async function unpack(code) {
    var s = String(code || "").trim().replace(/\s+/g, "");
    if (!s) return null;
    var head = s[0], body = s.slice(1);
    try {
      var u8 = b64d(body);
      if (head === "Z") {
        var ds = new DecompressionStream("deflate-raw");
        var buf = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
        return JSON.parse(new TextDecoder().decode(buf));
      }
      return JSON.parse(new TextDecoder().decode(u8));
    } catch (e) { return null; }
  }

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-09-03 合い言葉を <b>QRコードに入る長さ</b>まで短くする
     ──────────────────────────────────────────────────────────────
     ご指定:「接続用コードまたはQRコードを表示 → 他の端末がコード入力またはQR読み取り」

     ■ なぜそのままでは QR にできないのか
       WebRTC の SDP は 1〜2KB あり、圧縮して Base64 にしても 900〜1500 文字。
       自前の QR（xeva-qr.js）は<b>最大 858 バイト</b>なので入りません。

     ■ 何をしたか
       SDP は「ほとんど毎回おなじ」形をしています。相手ごとに変わるのは4つだけ:
         <b>ice-ufrag / ice-pwd / fingerprint(sha-256) / candidate の行</b>
       この4つだけを運び、受け取った側で<b>同じ型紙に流しこむ</b>ようにしました。
       これで 300〜450 文字になり、QR に収まります。

     ★ 安全のため<b>2つの形を同時に出します</b>。
         ・QR … 短い形（v:2）
         ・文字（コピー＆貼りつけ） … これまでどおり<b>全文</b>（v:1）
       もし短い形でつながらないブラウザがあっても、貼りつけならかならず通ります。
     ★ 音声・映像は使わないので、型紙はデータチャネル1本ぶんで足ります。
     ══════════════════════════════════════════════════════════════ */
  function sdpPick(sdp) {
    var u = /^a=ice-ufrag:(.+)$/m.exec(sdp);
    var pw = /^a=ice-pwd:(.+)$/m.exec(sdp);
    var f = /^a=fingerprint:sha-256 (.+)$/m.exec(sdp);
    if (!u || !pw || !f) return null;
    var cands = [];
    (sdp.match(/^a=candidate:.+$/gm) || []).forEach(function (line) {
      var m = /^a=candidate:(\S+) (\d+) (\S+) (\d+) (\S+) (\d+) typ (\S+)/.exec(line);
      if (!m) return;
      if (String(m[3]).toLowerCase() !== "udp") return;   /* 同じ Wi-Fi 内では TCP は要らない */
      if (m[7] !== "host" && m[7] !== "srflx") return;
      cands.push([m[1], m[2] | 0, m[4] | 0, m[5], m[6] | 0, m[7]]);
    });
    if (!cands.length) return null;                       /* 住所が1つも無いならつながらない */
    return { u: u[1].trim(), p: pw[1].trim(),
             f: f[1].trim().replace(/:/g, ""), c: cands.slice(0, 8) };
  }
  function sdpBuild(o, type) {
    var fp = (String(o.f).match(/.{2}/g) || []).join(":").toUpperCase();
    var lines = [
      "v=0",
      "o=- " + (Date.now() % 1e10) + " 2 IN IP4 127.0.0.1",
      "s=-", "t=0 0",
      "a=group:BUNDLE 0",
      "a=extmap-allow-mixed",
      "a=msid-semantic: WMS",
      "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
      "c=IN IP4 0.0.0.0",
      "a=ice-ufrag:" + o.u,
      "a=ice-pwd:" + o.p,
      "a=ice-options:trickle",
      "a=fingerprint:sha-256 " + fp,
      "a=setup:" + (type === "offer" ? "actpass" : "active"),
      "a=mid:0",
      "a=sctp-port:5000",
      "a=max-message-size:262144"
    ];
    (o.c || []).forEach(function (c) {
      lines.push("a=candidate:" + c[0] + " " + c[1] + " udp " + c[2] + " " + c[3] +
                 " " + c[4] + " typ " + c[5] + " generation 0");
    });
    return lines.join("\r\n") + "\r\n";
  }
  /* 受け取ったコードから SDP を取り出す（短い形・全文のどちらでも） */
  function sdpOf(o, type) {
    if (!o) return "";
    if (o.sdp) return o.sdp;
    if (o.m) { try { return sdpBuild(o.m, type); } catch (e) { return ""; } }
    return "";
  }

  /* ══════════ つなぎ方 ══════════
     ★ iceServers は<b>空</b>。インターネットに出ないので、
       相手の住所は同じ Wi-Fi の中のものだけになる（＝オフラインでつながる）。 */
  function newPC() { return new RTCPeerConnection({ iceServers: [] }); }
  /* 相手の住所を集めきるまで待つ（集めきってから1つのコードにまとめる） */
  function whenIceDone(pc) {
    return new Promise(function (res) {
      if (pc.iceGatheringState === "complete") return res();
      var done = false, fin = function () { if (!done) { done = true; res(); } };
      pc.addEventListener("icegatheringstatechange", function () {
        if (pc.iceGatheringState === "complete") fin();
      });
      setTimeout(fin, 2500);          /* 集まりきらなくても、集まったぶんで始める */
    });
  }
  function sendTo(p, msg) {
    try { if (p && p.dc && p.dc.readyState === "open") p.dc.send(JSON.stringify(msg)); } catch (e) {}
  }
  function broadcast(msg) { peers.forEach(function (p) { sendTo(p, msg); }); }

  /* ══════════ 部屋の中身（オンラインと同じ形） ══════════ */
  function playerNode(p) {
    var chars = (p.chars || []).slice(0, 2).map(function (c) {
      return { id: String(c.id), lv: c.lv | 0, awk: c.awk | 0, fruit: c.fruit || "",
               fruits: c.fruits || [], emblem: c.emblem || [], arc: c.arc || null };
    });
    return {
      name: String(p.name || "?").slice(0, 12),
      charId: chars[0] ? chars[0].id : p.charId,
      lv: chars[0] ? chars[0].lv : (p.lv | 0),
      awk: chars[0] ? chars[0].awk : (p.awk | 0),
      fruit: chars[0] ? chars[0].fruit : (p.fruit || ""),
      chars: chars, tenkyu: !!p.tenkyu, th: p.th || "",
      online: true, left: false, joined: Date.now(),
    };
  }
  function emitRoom() {
    if (!cbs) return;
    try { if (cbs.onRoom) cbs.onRoom(room); } catch (e) {}
    if (room && room.meta && room.meta.status === "playing" && room.meta.order) {
      var rd = room.meta.round | 0;
      if (rd !== lastRound) { lastRound = rd; try { if (cbs.onStart) cbs.onStart(room); } catch (e) {} }
    }
    if (room && room.meta && room.meta.status === "aborted" && cbs.onAbort) {
      try { cbs.onAbort(room); } catch (e) {}
    }
  }
  function pushRoom() { broadcast({ t: "room", room: room }); emitRoom(); }

  /* ══════════ 受け取り ══════════ */
  function onMsg(from, raw) {
    var m = null;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || !m.t) return;
    if (cur && cur.host) {
      /* ── ホスト側 ── */
      if (m.t === "hello") {
        from.uid = m.profile && m.profile.uid;
        if (!room.players[from.uid]) {
          if (Object.keys(room.players).length >= MAX_PLAYERS) { sendTo(from, { t: "full" }); return; }
          room.players[from.uid] = playerNode(m.profile);
        }
        pushRoom();
        return;
      }
      if (m.t === "chars" && from.uid && room.players[from.uid]) {
        var cs = (m.chars || []).slice(0, 2);
        var pl = room.players[from.uid];
        pl.chars = cs; pl.th = m.th || pl.th;
        if (cs[0]) { pl.charId = cs[0].id; pl.lv = cs[0].lv | 0; pl.awk = cs[0].awk | 0; pl.fruit = cs[0].fruit || ""; }
        pushRoom();
        return;
      }
      if (m.t === "shot") {
        /* ゲストのショットは、ホストが<b>全員へ配り直す</b>（ゲストどうしはつながっていないため） */
        if (seenShot[m.v.seq]) return;
        seenShot[m.v.seq] = 1;
        broadcast({ t: "shot", v: m.v });
        try { if (cbs && cbs.onShot) cbs.onShot(m.v); } catch (e) {}
        return;
      }
      if (m.t === "bye" && from.uid && room.players[from.uid]) {
        room.players[from.uid].left = true; room.players[from.uid].online = false;
        pushRoom();
        return;
      }
      return;
    }
    /* ── ゲスト側 ── */
    if (m.t === "room") { room = m.room; emitRoom(); return; }
    if (m.t === "shot") {
      if (seenShot[m.v.seq]) return;
      seenShot[m.v.seq] = 1;
      try { if (cbs && cbs.onShot) cbs.onShot(m.v); } catch (e) {}
      return;
    }
    if (m.t === "sync") { try { if (cbs && cbs.onSync) cbs.onSync(m.v); } catch (e) {} return; }
    if (m.t === "full") { try { if (cbs && cbs.onClosed) cbs.onClosed(); } catch (e) {} return; }
  }
  function wireDC(p) {
    p.dc.onmessage = function (e) { onMsg(p, e.data); };
    p.dc.onclose = function () {
      if (cur && cur.host && p.uid && room && room.players[p.uid]) {
        room.players[p.uid].online = false;
        pushRoom();
      } else if (cur && !cur.host) {
        try { if (cbs && cbs.onClosed) cbs.onClosed(); } catch (e) {}
      }
    };
  }

  /* ══════════ ホスト ══════════ */
  var pending = null;   /* いま返事待ちの相手 */
  /* 部屋をつくる（まだ誰ともつながっていない） */
  function create(profile, stageId) {
    cur = { uid: profile.uid, host: true };
    peers = []; seenShot = {}; lastRound = -1;
    room = {
      meta: { host: profile.uid, stage: stageId, status: "lobby",
              seed: (Math.floor(Math.random() * 2147483646) + 1) | 0, created: Date.now(), local: true },
      players: {},
    };
    room.players[profile.uid] = playerNode(profile);
    return Promise.resolve({ code: "LOCAL", local: true });
  }
  /* ══ ★★ 2026-09-01 <b>1台でまわして遊ぶ</b>（おすそわけプレイ）══
     ------------------------------------------------------------
     ご報告: 「Wi-Fi なしでも近くならマルチしたい」

     ブラウザには <b>Bluetooth で端末どうしをつなぐ手立てがありません</b>
     （Web Bluetooth は「相手を見つけに行く」側だけで、自分が相手役になれない）。
     だから<b>通信がまったく無い</b>場所では、どうやってもデータは行き来できません。
     そこで<b>通信をつかわない道</b>を用意しました——
     <b>1台を順番にまわして</b>、2〜4人で同じバトルを遊びます。
     ★ 部屋の形（room）は通信ありのときと<b>まったく同じ</b>なので、
       バトルの中身は1行も変えずに動きます。ちがうのは
       「全員がこの端末にいる」という印（meta.pass）だけ。
     ★ 印が立っていると、画面側は<b>だれの手番でも撃てる</b>ようにします。 */
  function createPass(list, stageId) {
    var me = list[0];
    cur = { uid: me.uid, host: true };
    peers = []; seenShot = {}; lastRound = -1;
    room = {
      meta: { host: me.uid, stage: stageId, status: "lobby",
              seed: (Math.floor(Math.random() * 2147483646) + 1) | 0,
              created: Date.now(), local: true, pass: true },
      players: {},
    };
    list.slice(0, MAX_PLAYERS).forEach(function (p) { room.players[p.uid] = playerNode(p); });
    return Promise.resolve({ code: "PASS", local: true, pass: true });
  }

  /* ① まねきコードを作る（1人ぶん。人を増やすたびに作り直す） */
  async function hostInvite() {
    if (!cur || !cur.host) return { error: "nothost" };
    if (Object.keys(room.players).length >= MAX_PLAYERS) return { error: "full" };
    var pc = newPC();
    var dc = pc.createDataChannel("mb", { ordered: true });
    var p = { pc: pc, dc: dc, uid: null };
    wireDC(p);
    dc.onopen = function () { sendTo(p, { t: "room", room: room }); };
    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await whenIceDone(pc);
    pending = p;
    /* ★ クエストも入れておく。ゲストは<b>つなぐ前に</b>どのクエストか分かるので、
         「対応キャラ・ギミック・クリア編成を見ながらキャラを選ぶ」ができる（ご指定）。 */
    var stage = (room.meta && room.meta.stage) || "";
    var code = await pack({ v: 1, t: "offer", sdp: pc.localDescription.sdp, stage: stage });
    /* ★★ 2026-09-03 QR 用の短い形（入らなければ空を返す＝画面はコードだけ出す） */
    var mini = sdpPick(pc.localDescription.sdp);
    var qr = mini ? await pack({ v: 2, t: "offer", m: mini, stage: stage }) : "";
    return { ok: true, code: code, qr: qr };
  }
  /* ③ ゲストの「へんじコード」を受け取ってつなぐ */
  async function hostAccept(answerCode) {
    if (!cur || !cur.host || !pending) return { error: "noinvite" };
    var o = await unpack(answerCode);
    var sdp = sdpOf(o, "answer");
    if (!o || o.t !== "answer" || !sdp) return { error: "badcode" };
    try {
      await pending.pc.setRemoteDescription({ type: "answer", sdp: sdp });
    } catch (e) { return { error: "badcode" }; }
    peers.push(pending);
    pending = null;
    return { ok: true };
  }

  /* ══════════ ゲスト ══════════ */
  /* まねきコードを<b>つなぐ前に</b>のぞく（クエストだけ知る） */
  async function peekInvite(inviteCode) {
    var o = await unpack(inviteCode);
    if (!o || o.t !== "offer" || !sdpOf(o, "offer")) return { error: "badcode" };
    return { ok: true, stage: o.stage || "" };
  }
  /* ② まねきコードを受け取って、へんじコードを作る */
  async function guestAnswer(inviteCode, profile) {
    var o = await unpack(inviteCode);
    var offerSdp = sdpOf(o, "offer");
    if (!o || o.t !== "offer" || !offerSdp) return { error: "badcode" };
    cur = { uid: profile.uid, host: false };
    peers = []; seenShot = {}; lastRound = -1; room = null;
    var pc = newPC();
    var p = { pc: pc, dc: null, uid: profile.uid };
    pc.ondatachannel = function (e) {
      p.dc = e.channel;
      wireDC(p);
      p.dc.onopen = function () { sendTo(p, { t: "hello", profile: profile }); };
      if (p.dc.readyState === "open") sendTo(p, { t: "hello", profile: profile });
    };
    try {
      await pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
      var ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      await whenIceDone(pc);
    } catch (e) { return { error: "fail" }; }
    peers.push(p);
    var code = await pack({ v: 1, t: "answer", sdp: pc.localDescription.sdp });
    /* ★★ 2026-09-03 ホストがカメラで読めるよう、短い形も返す */
    var mini = sdpPick(pc.localDescription.sdp);
    var qr = mini ? await pack({ v: 2, t: "answer", m: mini }) : "";
    return { ok: true, code: code, qr: qr };
  }

  /* ══════════ オンラインと同じ名前の入口 ══════════ */
  function watch(c) { cbs = c; if (room) emitRoom(); }
  function orderedUids(keepLeft) {
    var ps = (room && room.players) || {};
    var uids = Object.keys(ps).filter(function (u) { return keepLeft ? true : !ps[u].left; });
    var forced = (room.meta && room.meta.forder) || null;
    if (Array.isArray(forced) && forced.length) {
      var rank = {}; forced.forEach(function (u, i) { rank[u] = i; });
      uids.sort(function (a, b) {
        var ra = rank[a] == null ? 999 : rank[a], rb = rank[b] == null ? 999 : rank[b];
        if (ra !== rb) return ra - rb;
        return (ps[a].joined || 0) - (ps[b].joined || 0);
      });
      return uids;
    }
    return uids.sort(function (a, b) { return (ps[a].joined || 0) - (ps[b].joined || 0); });
  }
  function start() {
    if (!cur || !cur.host) return Promise.resolve({ error: "nothost" });
    var order = orderedUids(true);
    if (order.length < 2) return Promise.resolve({ error: "few" });
    room.meta.status = "playing"; room.meta.order = order; room.meta.round = 0; room.meta.started = Date.now();
    seenShot = {};
    pushRoom();
    return Promise.resolve({ ok: true });
  }
  function nextRound(stageId) {
    if (!cur || !cur.host) return Promise.resolve({ error: "nothost" });
    var order = orderedUids(false);
    if (order.length < 2) return Promise.resolve({ error: "few" });
    seenShot = {};
    room.meta.status = "playing"; room.meta.stage = stageId; room.meta.order = order;
    room.meta.round = (room.meta.round | 0) + 1;
    room.meta.seed = (Math.floor(Math.random() * 2147483646) + 1) | 0;
    room.meta.started = Date.now();
    pushRoom();
    return Promise.resolve({ ok: true });
  }
  function toLobby(stageId) {
    if (!cur || !cur.host) return Promise.resolve({ error: "nothost" });
    seenShot = {};
    room.meta.status = "lobby"; if (stageId) room.meta.stage = stageId;
    lastRound = -1;
    pushRoom();
    return Promise.resolve({ ok: true });
  }
  function abort(reason) {
    if (!cur || !cur.host) return Promise.resolve({ error: "nothost" });
    room.meta.status = "aborted"; room.meta.abortedBy = cur.uid; room.meta.reason = reason || "host";
    pushRoom();
    return Promise.resolve({ ok: true });
  }
  function setOrder(order) {
    if (!cur || !cur.host) return Promise.resolve({ error: "nothost" });
    room.meta.forder = order.slice(); pushRoom();
    return Promise.resolve({ ok: true });
  }
  function setSlots(slots) {
    if (!cur || !cur.host) return Promise.resolve({ error: "nothost" });
    room.meta.slots = slots.slice(); pushRoom();
    return Promise.resolve({ ok: true });
  }
  function sendShot(s) {
    if (!cur) return;
    var v = { seq: s.seq | 0, ux: +Number(s.ux).toFixed(5), uy: +Number(s.uy).toFixed(5),
              power: +Number(s.power).toFixed(5), ss: !!s.ss, uid: cur.uid, t: Date.now() };
    seenShot[v.seq] = 1;
    broadcast({ t: "shot", v: v });
  }
  function sendSync(state) {
    if (!cur || !cur.host) return;
    broadcast({ t: "sync", v: state });
  }
  function updateChars(chars, th) {
    if (!cur) return Promise.resolve({ error: "noroom" });
    var cs = (chars || []).slice(0, 2);
    if (cur.host) {
      var pl = room.players[cur.uid];
      if (pl) {
        pl.chars = cs; pl.th = th || pl.th;
        if (cs[0]) { pl.charId = cs[0].id; pl.lv = cs[0].lv | 0; pl.awk = cs[0].awk | 0; pl.fruit = cs[0].fruit || ""; }
      }
      pushRoom();
    } else {
      broadcast({ t: "chars", chars: cs, th: th || "" });
    }
    return Promise.resolve({ ok: true });
  }
  function leave() {
    try {
      if (cur && !cur.host) broadcast({ t: "bye" });
      if (cur && cur.host && room) { room.meta.status = "closed"; broadcast({ t: "room", room: room }); }
    } catch (e) {}
    peers.forEach(function (p) { try { p.pc.close(); } catch (e) {} });
    if (pending) { try { pending.pc.close(); } catch (e) {} }
    peers = []; pending = null; cur = null; room = null; cbs = null; lastRound = -1; seenShot = {};
    return Promise.resolve();
  }
  /* オンライン側にあって、ローカルでは使わないもの（画面が呼んでも落ちないようにそろえる） */
  function join() { return Promise.resolve({ error: "nofound" }); }
  function peek() { return Promise.resolve({ error: "nofound" }); }

  window.addEventListener("beforeunload", function () { try { if (cur) leave(); } catch (e) {} });

  window.BurstLocal = {
    create: create, join: join, peek: peek, watch: watch, start: start, nextRound: nextRound,
    toLobby: toLobby, leave: leave, sendShot: sendShot, abort: abort,
    setOrder: setOrder, setSlots: setSlots, sendSync: sendSync, updateChars: updateChars,
    /* ローカル通信だけの入口（合い言葉の受けわたし） */
    hostInvite: hostInvite, hostAccept: hostAccept, guestAnswer: guestAnswer, peekInvite: peekInvite,
    createPass: createPass,
    isPass: function () { return !!(room && room.meta && room.meta.pass); },
    peerCount: function () { return peers.length; },
    isHost: function () { return !!(cur && cur.host); },
    myUid: function () { return cur ? cur.uid : null; },
    code: function () { return cur ? "LOCAL" : null; },
    inRoom: function () { return !!cur; },
    MAX_PLAYERS: MAX_PLAYERS,
    isLocal: true,
  };
  try { window.dispatchEvent(new Event("burstlocal:ready")); } catch (e) {}
})();

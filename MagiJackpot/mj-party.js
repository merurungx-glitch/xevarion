/* ============================================================
   MagiJackpot — パーティープレイ（2〜6人・1台のiPadを囲む）
   ------------------------------------------------------------
   ・Jackpot Arena         … 全員が同時に BET / HOLD / DOUBLE を選ぶ読み合い
   ・Grand Roulette Party  … 全員が同じ盤に自由にベットする大乱戦

   ★ お金の扱い
     卓の中で動くのは「チップ」＝その場かぎりの持ち点。
     ほかの人の XEVA には<b>いっさい触れない</b>（端末は1台でも、財布は主催者のものだけ）。
     XEVA が動くのは <b>参加費</b>と<b>賞金</b>だけで、
     賞金表は「順位が均等に散らばれば、平均が参加費とぴったり同じ」になるよう組んである。
       倍率 = 0.1 + 0.9 × (2 − 2×(順位−1)/(人数−1))
       → 1位 1.9倍 ／ 最下位 0.1倍 ／ 平均 1.0倍
     ＝ 長い目で見て、参加費と賞金の総量がつり合う。

   ★ Jackpot Arena のイベントルーレットは <b>期待値ちょうど 1.0</b>。
     つまり BET し続けても平均では増えも減りもしない。
     増えるのは「HOLD の小さな確定収入」だけ。
     だから「いま自分は1位か、最下位か」で最適な選択が変わる＝読み合いになる。
   ============================================================ */
(function () {
  "use strict";
  const M = window.MJ;
  const fmt = M.fmt, esc = M.esc;

  const COLORS = ["#ff6a3d", "#4b8bff", "#3fd9b0", "#ff5da8", "#c07bff", "#ffc93c"];
  const START_CHIPS = 1000;
  const ENTRY_FEE = 300;              // 1席あたりの参加費（XEVA）

  /* ══════════════════════════════════════════
     席ごとのアカウント紐づけ（MagiChainParty と同じしくみ）
     ------------------------------------------
     1台を囲んで遊ぶので、賞金を「誰の XEVARION アカウントに入れるか」を
     席ごとに決められるようにする。流れは MagiChainParty とまったく同じ：
       表示名で検索 → アカウントを選ぶ → 4桁パスワード

     ★ 参加費と賞金の関係
       この端末から引き落とせるのは「いまログインしているアカウント」だけ。
       ほかの席のアカウントから勝手に XEVA を抜くことはできないので、
       紐づけた他人の席へは <b>賞金から参加費を引いた純額</b>だけを届ける
       （純額がマイナス＝負けた席には何も届かない＝取られない）。
       自分の席（この端末の持ち主）は、いままでどおり手元の残高から
       参加費を払い、賞金を受け取る。
     ══════════════════════════════════════════ */
  const LINK_KEY = "mj_party_links_v1";
  /* 前回の紐づけを覚えておく。ただし confirmed:false で置く＝
     次に使うときは必ず4桁パスワードの確認を通す（本人以外が勝手に使えない）。 */
  function loadLinks() {
    try {
      const a = JSON.parse(localStorage.getItem(LINK_KEY) || "[]");
      if (Array.isArray(a)) return a.map((l) => (l && l.uid ? { uid: l.uid, name: l.name || "", charFile: l.charFile || "", confirmed: false } : null));
    } catch (e) {}
    return [];
  }
  function saveLinks(links) {
    try { localStorage.setItem(LINK_KEY, JSON.stringify(links.map((l) => (l && l.uid ? { uid: l.uid, name: l.name, charFile: l.charFile } : null)))); } catch (e) {}
  }

  /* 順位 → 賞金倍率。平均がちょうど 1.0 になる線形の表 */
  function prizeMul(rank, n) {
    if (n <= 1) return 1;
    return 0.1 + 0.9 * (2 - 2 * (rank - 1) / (n - 1));
  }

  let S = null;   // セッション

  /* ══════════════════════════════════════════
     セットアップ画面（2ゲーム共通）
     ══════════════════════════════════════════ */
  function setup(root, gameId) {
    const nm = gameId === "arena" ? "Jackpot Arena" : "Grand Roulette Party";
    const en = gameId === "arena" ? "READ YOUR RIVALS" : "EVERYONE ON ONE WHEEL";
    S = { game: gameId, n: 4, names: ["", "", "", "", "", ""], rounds: 8, seat: 1, prize: true,
          links: loadLinks() };
    root.innerHTML =
      '<div class="mjg">' +
        '<div class="mjg-top">' +
          '<button class="x" id="ptBack" aria-label="ロビーへ戻る">‹</button>' +
          '<div class="ttl"><b>' + nm + '</b><small>' + en + "</small></div>" +
          '<div class="bal"><img src="../XEVA.png" alt=""><span id="ptBal">0</span></div>' +
        "</div>" +
        '<div class="mjg-body">' +
          '<div class="mjp"><div class="hd"><span>人数</span></div>' +
            '<div class="mj-seg" id="ptN"></div></div>' +
          '<div class="mjp"><div class="hd"><span>プレイヤー名</span></div>' +
            '<div class="mj-namelist" id="ptNames"></div>' +
            '<div class="mj-note" style="margin-top:9px">1台のiPadを回さずに、みんなで同じ画面を見ながら遊びます。' +
            "全員 <b>" + fmt(START_CHIPS) + " チップ</b>からスタート。</div></div>" +
          '<div class="mjp"><div class="hd"><span>ラウンド数</span></div>' +
            '<div class="mj-seg" id="ptR"></div></div>' +
          '<div class="mjp"><div class="hd"><span>賞金（XEVA）</span><span id="ptPrizeSw" style="cursor:pointer;color:#ffd257">ON</span></div>' +
            '<div class="mj-note" id="ptPrizeNote"></div>' +
            '<div class="hd" style="margin-top:11px"><span>あなたの席</span></div>' +
            '<div class="mj-seg" id="ptSeat"></div></div>' +
          '<div class="mjp"><div class="hd"><span>あそびかた</span></div>' +
            '<div class="mj-note">' + rulesText(gameId) + "</div></div>" +
        "</div>" +
        '<div class="mjg-act"><button class="mj-btn wide" id="ptStart">はじめる</button></div>' +
      "</div>";

    document.getElementById("ptBack").onclick = () => { M.SFX.click(); window.mjGo("party"); };
    document.getElementById("ptPrizeSw").onclick = () => {
      S.prize = !S.prize;
      document.getElementById("ptPrizeSw").textContent = S.prize ? "ON" : "OFF";
      M.SFX.click(); paintPrize(); paintStartBtn();
    };
    document.getElementById("ptStart").onclick = start;
    paintN(); paintNames(); paintRounds(); paintSeat(); paintPrize(); paintBal(); paintStartBtn();
    window.addEventListener("mj:wallet", paintBal);
  }
  function paintBal() { const b = document.getElementById("ptBal"); if (b) b.textContent = fmt(M.xeva()); }

  function rulesText(g) {
    if (g === "arena") {
      return "各ラウンド、全員が同時に <b>BET／HOLD／DOUBLE</b> のどれかを選びます。<br>" +
        "・<b>BET</b>＝持ちチップの 20% を賭ける。イベントルーレットの倍率ぶんだけ増減。<br>" +
        "・<b>HOLD</b>＝賭けない。そのかわり<b>確実に少しだけ増える</b>。<br>" +
        "・<b>DOUBLE</b>＝40% を賭ける。跳ねるときは一気に、沈むときも一気に。<br>" +
        "ルーレットの<b>平均倍率はちょうど 1.0</b>。つまり BET を続けても平均では増えません。" +
        "<b>勝っているなら HOLD で守り、負けているなら DOUBLE で獲りにいく</b>——どこで踏み込むかがすべてです。<br>" +
        "後半の各ラウンドでは<b>最下位に逆転チャンス</b>が発生します。";
    }
    return "24マスの盤をみんなで囲み、<b>好きなマスに自由にチップを置いて</b>いっせいに回します。<br>" +
      "・<b>赤／黒／偶数／奇数／大／小</b>＝9マスぶん。<b>0</b>と<b>単一の数字</b>は1マスぶん。<br>" +
      "・<b>イベントマス</b>に止まると、倍率アップ・シャッフル・全員ボーナス・ジャックポット・ラストチャンスのどれかが発生。<br>" +
      "・<b>終盤はイベントの出現率が上がります</b>。トップが一瞬で転落することも、最下位から一気に逆転することもあります。";
  }
  function paintN() {
    const box = document.getElementById("ptN");
    box.innerHTML = [2, 3, 4, 5, 6].map((n) =>
      '<button class="' + (n === S.n ? "on" : "") + '" data-n="' + n + '">' + n + "人</button>").join("");
    box.querySelectorAll("[data-n]").forEach((b) => {
      b.onclick = () => { S.n = +b.dataset.n; if (S.seat > S.n) S.seat = 1; M.SFX.click(); paintN(); paintNames(); paintSeat(); paintPrize(); };
    });
  }
  function paintNames() {
    const box = document.getElementById("ptNames");
    box.innerHTML = Array.from({ length: S.n }, (_, i) => {
      const l = S.links[i];
      const btn = !l || !l.uid
        ? '<button class="mj-glink" data-l="' + i + '" title="XEVARION アカウントを紐づける">🔗</button>'
        : l.confirmed
          ? '<button class="mj-glink on" data-l="' + i + '" title="タップで紐づけを解除">✓ ' + esc(l.name) + "</button>"
          : '<button class="mj-glink pend" data-l="' + i + '" title="前回の紐づけ — タップして4桁パスワードで確認">🔒 ' + esc(l.name) + "</button>";
      return '<div class="mj-nameinp"><span class="no" style="background:' + COLORS[i] + '">' + (i + 1) + "</span>" +
        '<input type="text" maxlength="8" placeholder="プレイヤー' + (i + 1) + '" value="' + esc(S.names[i]) + '" data-i="' + i + '">' +
        btn + "</div>";
    }).join("");
    box.querySelectorAll("input").forEach((el) => {
      el.oninput = () => { S.names[+el.dataset.i] = el.value; };
    });
    box.querySelectorAll("[data-l]").forEach((b) => { b.onclick = () => openSeatLink(+b.dataset.l); });
  }

  /* 席のアカウント紐づけ（MagiChainParty と同じ流れ） */
  function openSeatLink(i) {
    if (!window.GameLink) { M.toast("紐づけ機能を準備中です…"); return; }
    if (M.offline()) { M.toast("オフライン中は紐づけできません（オンラインで可能になります）"); return; }
    const l = S.links[i];
    /* 前回から引き継いだぶん → 検索をとばして4桁パスワードの確認だけ */
    if (l && l.uid && !l.confirmed) {
      window.GameLink.confirm(l).then((res) => {
        if (res && res.remove) { S.links[i] = null; saveLinks(S.links); paintNames(); paintPrize(); M.toast("紐づけを解除しました"); return; }
        if (res && res.uid) {
          S.links[i] = { uid: res.uid, name: res.name, charFile: res.charFile || "", confirmed: true };
          saveLinks(S.links); paintNames(); paintPrize();
          M.SFX.chip(); M.toast("🔗 <b>" + esc(res.name) + "</b> の紐づけを確認しました");
        }
      });
      return;
    }
    if (l && l.uid) { S.links[i] = null; saveLinks(S.links); paintNames(); paintPrize(); M.toast("紐づけを解除しました"); return; }
    window.GameLink.link(S.names[i] || "").then((res) => {
      if (!res || !res.uid) return;
      /* 同じアカウントを2席に入れると賞金が二重になるので弾く */
      if (S.links.some((x, k) => k !== i && x && x.uid === res.uid)) { M.toast("そのアカウントは別の席で紐づけ済みです"); return; }
      S.links[i] = { uid: res.uid, name: res.name, charFile: res.charFile || "", confirmed: true };
      if (!S.names[i]) S.names[i] = String(res.name || "").slice(0, 8);
      saveLinks(S.links); paintNames(); paintPrize();
      M.SFX.chip(); M.toast("🔗 <b>" + esc(res.name) + "</b> を紐づけました");
    });
  }
  function paintRounds() {
    const box = document.getElementById("ptR");
    box.innerHTML = [6, 8, 12].map((r) =>
      '<button class="' + (r === S.rounds ? "on" : "") + '" data-r="' + r + '">' + r + " ラウンド</button>").join("");
    box.querySelectorAll("[data-r]").forEach((b) => {
      b.onclick = () => { S.rounds = +b.dataset.r; M.SFX.click(); paintRounds(); };
    });
  }
  function paintSeat() {
    const box = document.getElementById("ptSeat");
    box.innerHTML = Array.from({ length: S.n }, (_, i) =>
      '<button class="' + (i + 1 === S.seat ? "on" : "") + '" data-s="' + (i + 1) + '">' + (i + 1) + "</button>").join("");
    box.querySelectorAll("[data-s]").forEach((b) => {
      b.onclick = () => { S.seat = +b.dataset.s; M.SFX.click(); paintSeat(); paintPrize(); };
    });
  }
  function paintPrize() {
    const el = document.getElementById("ptPrizeNote");
    if (!S.prize) {
      el.innerHTML = "賞金なしのフリープレイです。<b>XEVA はいっさい動きません</b>。みんなで気軽にどうぞ。";
      return;
    }
    const rows = Array.from({ length: S.n }, (_, i) =>
      (i + 1) + "位 " + fmt(ENTRY_FEE * prizeMul(i + 1, S.n)) + " XEVA").join("　／　");
    const linked = S.links.slice(0, S.n).filter((l) => l && l.uid);
    el.innerHTML = "参加費 <b>" + fmt(ENTRY_FEE) + " XEVA</b>（あなたの XEVA から1回だけ）。<br>" +
      "終了時、<b>あなた（" + S.seat + "番の席）の順位</b>に応じて賞金が入ります。<br>" +
      rows + "<br>" +
      "<b>順位が均等に散らばれば、平均は参加費とちょうど同じ</b>になります（勝てば増え、負ければ減る）。" +
      '<br><br><b>🔗 アカウント紐づけ</b>：名前の右のボタンから、席ごとに XEVARION アカウントを' +
      "紐づけられます。紐づけた席は、その人の順位に応じた賞金が<b>本人のアカウント</b>に届きます" +
      "（ポータルを開いたときに受け取り）。<br>" +
      "※ ほかの人のアカウントからこの端末で参加費を引き落とすことはできないので、" +
      "あなた以外の席には<b>参加費を引いた残り</b>だけが届きます（負けた席は<b>取られません</b>）。" +
      (linked.length ? "<br>いま紐づけ済み：<b>" + linked.map((l) => esc(l.name)).join("・") + "</b>" : "");
  }
  function paintStartBtn() {
    const b = document.getElementById("ptStart");
    if (!b) return;
    const need = S.prize ? ENTRY_FEE : 0;
    b.disabled = M.xeva() < need;
    b.textContent = S.prize ? "はじめる（参加費 " + fmt(need) + " XEVA）" : "はじめる（フリープレイ）";
  }

  function start() {
    if (S.prize) {
      if (M.xeva() < ENTRY_FEE) { M.toast("XEVA が足りません"); return; }
      /* パーティーはチップのやりとりなので、ジャックポットには積まない */
      if (!M.bet(ENTRY_FEE, S.game, 0)) { M.toast("参加費を支払えませんでした"); return; }
    }
    M.SFX.chip();
    S.players = Array.from({ length: S.n }, (_, i) => ({
      i, nm: (S.names[i] || "プレイヤー" + (i + 1)).slice(0, 8), c: COLORS[i], chips: START_CHIPS,
      pick: null, delta: 0, bets: {},
      /* 確認済みの紐づけだけを卓に持ち込む（🔒＝未確認は賞金の対象外） */
      link: (S.links[i] && S.links[i].uid && S.links[i].confirmed) ? S.links[i] : null,
    }));
    S.round = 0;
    const root = document.getElementById("mjGameRoot");
    if (S.game === "arena") arenaMount(root); else groulMount(root);
  }

  /* 共通：順位づけ */
  function ranked() {
    return S.players.slice().sort((a, b) => b.chips - a.chips);
  }
  function rankOf(p) { return ranked().indexOf(p) + 1; }

  /* 共通：終了処理（賞金の精算） */
  async function finishSession(gameId) {
    if (!S || !S.players || S.finished) return;
    S.finished = true;   // 二重精算（賞金の二重払い）を防ぐ
    const rk = ranked();
    const me = S.players[S.seat - 1];
    const myRank = rk.indexOf(me) + 1;
    let prize = 0;
    if (S.prize) {
      prize = Math.round(ENTRY_FEE * prizeMul(myRank, S.n));
      if (prize > 0) M.payout(prize, gameId, "パーティー賞金（" + myRank + "位）");
    }
    M.round({ game: gameId, bet: S.prize ? ENTRY_FEE : 0, win: prize, replay: null });

    /* ── 紐づけた「あなた以外の席」への賞金 ──
       この端末から引き落とせるのは自分のアカウントだけなので、
       他の席へは「賞金 − 参加費」の純額を届ける（マイナスなら何も届けない）。
       受け取りは本人が XEVARION ホームを開いたとき。 */
    const awarded = [];
    if (S.prize && window.GameLink) {
      const jobs = [];
      rk.forEach((p, idx) => {
        if (p === me || !p.link || !p.link.uid) return;
        const net = Math.round(ENTRY_FEE * prizeMul(idx + 1, S.n)) - ENTRY_FEE;
        if (net <= 0) return;
        awarded.push({ nm: p.link.name, rank: idx + 1, amount: net });
        jobs.push(window.GameLink.whenFB().then((FB) =>
          FB && FB.awardXeva
            ? FB.awardXeva(p.link.uid, net, (idx + 1) + "位 賞金（MagiJackpot パーティー）")
            : null));
      });
      if (jobs.length) Promise.all(jobs).catch(() => {});
    }

    const root = document.getElementById("mjGameRoot");
    root.innerHTML =
      '<div class="mjg">' +
        '<div class="mjg-top"><button class="x" id="ptEndBack">‹</button>' +
          '<div class="ttl"><b>最終結果</b><small>FINAL STANDINGS</small></div>' +
          '<div class="bal"><img src="../XEVA.png" alt=""><span>' + fmt(M.xeva()) + "</span></div></div>" +
        '<div class="mjg-body">' +
          '<div class="mj-rank">' + rk.map((p, i) =>
            '<div class="mj-rk p' + (i + 1) + '"><span class="no">' + (i + 1) + "</span>" +
            '<span class="nm" style="color:' + p.c + '">' + esc(p.nm) + (p === me ? "（あなた）" : "") +
            (p.link && p.link.uid ? ' <b style="font-size:9.5px;color:#37e0a0">🔗' + esc(p.link.name) + "</b>" : "") + "</span>" +
            '<span class="ch">' + fmt(p.chips) + "</span></div>").join("") + "</div>" +
          (S.prize
            ? '<div class="mj-ev gold" style="margin-top:14px">🏆 あなたは <b>' + myRank + "位</b>　賞金 <b>+" + fmt(prize) +
              " XEVA</b><br><span style=\"font-size:10.5px;font-weight:700\">（参加費 " + fmt(ENTRY_FEE) + " XEVA）</span></div>"
            : '<div class="mj-ev" style="margin-top:14px">フリープレイのため XEVA の増減はありません</div>') +
          (awarded.length
            ? '<div class="mj-ev" style="margin-top:10px">🔗 紐づけたプレイヤーへの賞金<br>' +
              awarded.map((a) => "<b>" + esc(a.nm) + "</b>（" + a.rank + "位） +" + fmt(a.amount) + " XEVA").join("<br>") +
              '<br><span style="font-size:10.5px;font-weight:700">XEVARION ホームを開くと受け取れます</span></div>'
            : "") +
        "</div>" +
        '<div class="mjg-act">' +
          '<button class="mj-btn ghost" id="ptEndHome" style="flex:1">ロビーへ</button>' +
          '<button class="mj-btn" id="ptEndAgain" style="flex:1">もう一度</button>' +
        "</div>" +
      "</div>";
    document.getElementById("ptEndBack").onclick = () => window.mjGo("party");
    document.getElementById("ptEndHome").onclick = () => { M.SFX.click(); window.mjGo("party"); };
    document.getElementById("ptEndAgain").onclick = () => { M.SFX.click(); setup(document.getElementById("mjGameRoot"), gameId); };
    if (myRank === 1) { M.SFX.bigwin(); M.rain(200, 2200); M.shake(true); } else M.SFX.win();
  }

  /* ══════════════════════════════════════════════════════════
     Jackpot Arena
     ══════════════════════════════════════════════════════════ */
  /* イベントルーレット。期待値ちょうど 1.0（下の EV チェックを参照） */
  const WHEEL = [
    { m: 0,   w: 30, nm: "BUST",  ic: "💥", c: "#e8395f" },
    { m: 0.5, w: 20, nm: "×0.5",  ic: "🌧", c: "#7a86a8" },
    { m: 1,   w: 15, nm: "×1.0",  ic: "➖", c: "#9aa6c8" },
    { m: 1.5, w: 15, nm: "×1.5",  ic: "✨", c: "#3fd9b0" },
    { m: 2,   w: 12, nm: "×2.0",  ic: "🔥", c: "#ffb020" },
    { m: 3,   w: 6,  nm: "×3.0",  ic: "⚡", c: "#ff5da8" },
    { m: 5,   w: 2,  nm: "×5.0",  ic: "👑", c: "#c07bff" },
  ];
  /* Σ(w·m)/Σw = (0+10+15+22.5+24+18+10)/100 = 0.995 ≒ 1.00 */
  function wheelEV() { let a = 0, b = 0; WHEEL.forEach((x) => { a += x.w * x.m; b += x.w; }); return a / b; }

  const HOLD_GAIN = 0.04;      // HOLD の確定収入（持ちチップに対する割合）
  const BET_RATE = 0.20, DBL_RATE = 0.40;

  function arenaMount(root) {
    root.innerHTML =
      '<div class="mjg">' +
        '<div class="mjg-top"><button class="x" id="arBack">‹</button>' +
          '<div class="ttl"><b>Jackpot Arena</b><small id="arRound">ROUND 1</small></div>' +
          '<div class="bal" id="arEvBal">—</div></div>' +
        '<div class="mjg-body" id="arBody">' +
          '<div class="mjp"><div class="hd"><span id="arPhase">全員、選んでください</span><span id="arLeft"></span></div>' +
            '<div class="mj-players" id="arPl"></div></div>' +
          '<div id="arEvent"></div>' +
          '<div class="mjp" id="arPick"></div>' +
          '<div class="mjp"><div class="hd"><span>イベントルーレットの中身</span></div>' +
            '<div class="mj-bethint">' + WHEEL.map((x) =>
              '<span style="background:' + x.c + '33;color:' + x.c + '">' + x.ic + " " + x.nm + " " + x.w + "%</span>").join("") +
            '</div><div class="mj-note" style="margin-top:8px">平均倍率は <b>' + wheelEV().toFixed(2) +
            "</b>。BET を続けても平均では増えません。増えるのは <b>HOLD の確定 +" + Math.round(HOLD_GAIN * 100) +
            "%</b> だけ。<b>いつ守り、いつ踏み込むか</b>が勝敗を分けます。</div></div>" +
        "</div>" +
        '<div class="mjg-act"><button class="mj-btn wide" id="arGo" disabled>全員の選択を待っています…</button></div>' +
      "</div>";
    document.getElementById("arBack").onclick = () => confirmQuit();
    document.getElementById("arGo").onclick = arenaSpin;
    arenaNextRound();
  }

  function confirmQuit() {
    M.confirmBox("いま抜けると、この卓は終了します。<b>賞金は支払われません</b>。よろしいですか？", "卓から抜ける", "🚪", "抜ける")
      .then((ok) => { if (ok) window.mjGo("party"); });
  }

  /* ★ 画面を作り直したあとの「古いボタン」から呼ばれても壊れないようにする。
     卓を抜けたり最終結果に進んだあとは S が null になっているので、
     ここで必ず止める（detached なボタンのクリックでクラッシュさせない）。 */
  function arenaNextRound() {
    if (!S || !S.players) return;
    S.round++;
    if (S.round > S.rounds) { finishSession("arena"); return; }
    S.players.forEach((p) => { p.pick = null; p.delta = 0; });
    /* 後半は最下位に逆転チャンス */
    const late = S.round > Math.ceil(S.rounds / 2);
    const last = ranked()[S.n - 1];
    S.comeback = late && last.chips < ranked()[0].chips * 0.7 ? last : null;
    document.getElementById("arRound").textContent = "ROUND " + S.round + " / " + S.rounds;
    document.getElementById("arPhase").textContent = "全員、選んでください";
    document.getElementById("arEvent").innerHTML = S.comeback
      ? '<div class="mj-ev">🔄 <b>逆転チャンス！</b> 最下位の <b>' + esc(S.comeback.nm) +
        "</b> は、このラウンドの<b>勝ちが 2倍</b>・<b>負けが半分</b>になります</div>" : "";
    arenaPaintPlayers();
    arenaPaintPick();
    document.getElementById("arGo").disabled = true;
    document.getElementById("arGo").textContent = "全員の選択を待っています…";
  }

  function arenaPaintPlayers(reveal) {
    const box = document.getElementById("arPl"); if (!box || !S || !S.players) return;
    const rk = ranked();
    box.innerHTML = S.players.map((p) => {
      const r = rk.indexOf(p) + 1;
      const pk = p.pick;
      const tag = !pk ? '<span class="pick">…</span>'
        : reveal
          ? '<span class="pick ' + (pk === "BET" ? "bet" : pk === "HOLD" ? "hold" : "dbl") + '">' + pk + "</span>"
          : '<span class="pick">✔ 決定</span>';
      return '<div class="mj-pl' + (p.i + 1 === S.seat ? " me" : "") + (p.chips <= 0 ? " out" : "") + '">' +
        '<span class="av" style="background:' + p.c + '">' + r + "</span>" +
        '<span class="nm">' + esc(p.nm) + (p.i + 1 === S.seat ? " ★" : "") + "</span>" +
        (reveal && p.delta ? '<span class="dt' + (p.delta < 0 ? " minus" : "") + '">' + (p.delta > 0 ? "+" : "") + fmt(p.delta) + "</span>" : "") +
        tag + '<span class="ch">' + fmt(p.chips) + "</span></div>";
    }).join("");
  }

  function arenaPaintPick() {
    const box = document.getElementById("arPick"); if (!box || !S || !S.players) return;
    const alive = S.players.filter((p) => p.chips > 0);
    box.innerHTML = '<div class="hd"><span>順番にタップして選ぼう</span></div>' +
      S.players.map((p) => {
        if (p.chips <= 0) return '<div class="mj-note" style="margin:6px 0">' + esc(p.nm) + " はチップがなくなりました（HOLD 扱い）</div>";
        const stake = Math.max(1, Math.round(p.chips * BET_RATE));
        const dbl = Math.max(1, Math.round(p.chips * DBL_RATE));
        return '<div style="margin:9px 0 4px;font-size:11.5px;font-weight:900;color:' + p.c + '">' + esc(p.nm) +
          '<span style="color:#8f7fae;font-weight:700"> — 持ち ' + fmt(p.chips) + "</span></div>" +
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">' +
          ['<button class="mj-btn sm ' + (p.pick === "BET" ? "" : "ghost") + '" data-p="' + p.i + '" data-k="BET">BET<br><small>' + fmt(stake) + "</small></button>",
           '<button class="mj-btn sm ' + (p.pick === "HOLD" ? "" : "ghost") + '" data-p="' + p.i + '" data-k="HOLD">HOLD<br><small>+' + fmt(Math.round(p.chips * HOLD_GAIN)) + "</small></button>",
           '<button class="mj-btn sm ' + (p.pick === "DOUBLE" ? "neon" : "ghost") + '" data-p="' + p.i + '" data-k="DOUBLE">DOUBLE<br><small>' + fmt(dbl) + "</small></button>"].join("") +
          "</div>";
      }).join("");
    box.querySelectorAll("[data-k]").forEach((b) => {
      b.onclick = () => {
        const p = S.players[+b.dataset.p];
        p.pick = b.dataset.k;
        M.SFX.chip();
        arenaPaintPick(); arenaPaintPlayers(false);
        const ready = S.players.every((x) => x.chips <= 0 || x.pick);
        const go = document.getElementById("arGo");
        go.disabled = !ready;
        go.textContent = ready ? "🎡 イベントルーレットを回す！" : "全員の選択を待っています…";
      };
    });
  }

  async function arenaSpin() {
    if (!S || !S.players) return;
    const go = document.getElementById("arGo");
    go.disabled = true; go.textContent = "回転中…";
    document.getElementById("arPhase").textContent = "抽選中…";
    M.SFX.reel();

    const seg = M.weighted(WHEEL);
    /* 演出：候補をぐるぐる見せてから止める */
    const evBox = document.getElementById("arEvent");
    for (let i = 0; i < 14; i++) {
      const s = WHEEL[i % WHEEL.length];
      evBox.innerHTML = '<div class="mj-ev" style="border-color:' + s.c + '99;color:' + s.c + '">' + s.ic + " " + s.nm + "</div>";
      M.SFX.tick();
      await M.sleep(70 + i * 14);
    }
    M.slow(true);
    await M.sleep(320);
    M.slow(false);
    evBox.innerHTML = '<div class="mj-ev' + (seg.m >= 2 ? " gold" : "") + '" style="border-color:' + seg.c + ';color:' + seg.c + '">' +
      seg.ic + " <b>" + seg.nm + "</b>　" + (seg.m === 0 ? "BET したぶんは没収！" : seg.m < 1 ? "半分だけ返ってきた…" : seg.m === 1 ? "増えも減りもせず（元返し）" : "大きく増えた！") + "</div>";
    if (seg.m >= 2) { M.SFX.bigwin(); M.burst(90, 10); M.shake(seg.m >= 3); } else if (seg.m === 0) M.SFX.lose(); else M.SFX.stop();

    /* 精算 */
    S.players.forEach((p) => {
      if (p.chips <= 0) { p.pick = "HOLD"; p.delta = 0; return; }
      if (p.pick === "HOLD") { p.delta = Math.round(p.chips * HOLD_GAIN); p.chips += p.delta; return; }
      const rate = p.pick === "DOUBLE" ? DBL_RATE : BET_RATE;
      const stake = Math.max(1, Math.round(p.chips * rate));
      let d = Math.round(stake * (seg.m - 1));
      if (S.comeback === p) d = d > 0 ? d * 2 : Math.round(d / 2);   // 逆転チャンス
      p.delta = d;
      p.chips = Math.max(0, p.chips + d);
    });
    arenaPaintPlayers(true);
    document.getElementById("arPhase").textContent = "結果";
    document.getElementById("arPick").innerHTML = '<div class="mj-note" style="text-align:center">精算しました。次のラウンドへ。</div>';

    await M.sleep(1300);
    go.disabled = false;
    go.textContent = S.round >= S.rounds ? "最終結果を見る" : "次のラウンドへ";
    go.onclick = () => { M.SFX.click(); go.onclick = arenaSpin; arenaNextRound(); };
  }

  /* ══════════════════════════════════════════════════════════
     Grand Roulette Party
     ══════════════════════════════════════════════════════════ */
  /* 24マスの盤。1〜9 が赤・10〜18 が黒・0 が緑・E1〜E5 がイベント。 */
  const EV_NM = ["倍率アップ", "シャッフル", "全員ボーナス", "ジャックポット", "ラストチャンス"];
  const SLOTS = (function () {
    /* ★ 盤面の並びは「色が交互になる」ように組む。
       1〜9を赤、10〜18を黒とまとめて並べると、円グラフ上では
       赤の大きな扇・黒の大きな扇……になってしまい、ルーレットに見えない。
       赤→黒→赤→黒 と交互にし、0とイベントを等間隔に散らす。 */
    const a = [{ k: "0", nm: "0", type: "zero" }];
    let ev = 0;
    for (let i = 1; i <= 9; i++) {
      a.push({ k: String(i), nm: String(i), type: "red", n: i });
      a.push({ k: String(i + 9), nm: String(i + 9), type: "blk", n: i + 9 });
      /* 2組ごとにイベントを1つはさむ → 全部で 1 + 18 + 5 = 24 マス */
      if (i % 2 === 0 && ev < EV_NM.length) { a.push({ k: "E" + (ev + 1), nm: EV_NM[ev], type: "ev", ev: ev }); ev++; }
    }
    while (ev < EV_NM.length) { a.push({ k: "E" + (ev + 1), nm: EV_NM[ev], type: "ev", ev: ev }); ev++; }
    return a;
  })();
  const NSLOT = SLOTS.length;                 // 24
  const HOUSE = 0.97;                         // 盤のとりぶん 3%（チップの卓なので控えめ）
  /* n マスをカバーするベットの配当。どのベットも同じ控除率になる。 */
  function payFor(n) { return Math.round((NSLOT / n) * HOUSE * 10) / 10; }

  const CELLS = [
    { id: "red",  nm: "赤",   sub: "1〜9",   cls: "red", match: (s) => s.type === "red",  n: 9 },
    { id: "blk",  nm: "黒",   sub: "10〜18", cls: "blk", match: (s) => s.type === "blk",  n: 9 },
    { id: "even", nm: "偶数", sub: "2,4,6…", cls: "ev",  match: (s) => s.n && s.n % 2 === 0, n: 9 },
    { id: "odd",  nm: "奇数", sub: "1,3,5…", cls: "ev",  match: (s) => s.n && s.n % 2 === 1, n: 9 },
    { id: "low",  nm: "小",   sub: "1〜9",   cls: "ev",  match: (s) => s.n && s.n <= 9,   n: 9 },
    { id: "high", nm: "大",   sub: "10〜18", cls: "ev",  match: (s) => s.n && s.n >= 10,  n: 9 },
    { id: "zero", nm: "0",    sub: "緑",     cls: "grn", match: (s) => s.type === "zero", n: 1 },
    { id: "evt",  nm: "イベント", sub: "5マス", cls: "grn", match: (s) => s.type === "ev", n: 5 },
  ];

  function groulMount(root) {
    S.stake = 100;
    root.innerHTML =
      '<div class="mjg">' +
        '<div class="mjg-top"><button class="x" id="grBack">‹</button>' +
          '<div class="ttl"><b>Grand Roulette Party</b><small id="grRound">ROUND 1</small></div>' +
          '<div class="bal" id="grBal">—</div></div>' +
        '<div class="mjg-body" id="grBody">' +
          '<div class="mj-wheelwrap"><div class="mj-needle"></div><div class="mj-wheel" id="grWheel"></div></div>' +
          '<div id="grEvent"></div>' +
          '<div class="mjp"><div class="hd"><span id="grWho">ベットする人を選ぼう</span><span id="grStakeV"></span></div>' +
            '<div class="mj-players" id="grPl"></div></div>' +
          '<div class="mjp"><div class="hd"><span>賭ける額</span></div>' +
            '<div class="mj-seg" id="grStake"></div>' +
            '<div class="mj-board" id="grBoard"></div>' +
            '<div class="mj-note" style="margin-top:9px" id="grNote"></div></div>' +
        "</div>" +
        '<div class="mjg-act">' +
          '<button class="mj-btn ghost" id="grClear" style="flex:0 0 92px">取り消し</button>' +
          '<button class="mj-btn" id="grSpin">回す</button>' +
        "</div>" +
      "</div>";
    buildWheel();
    S.cur = 0;
    document.getElementById("grBack").onclick = () => confirmQuit();
    document.getElementById("grSpin").onclick = groulSpin;
    document.getElementById("grClear").onclick = () => {
      const p = S.players[S.cur]; if (!p) return;
      p.bets = {}; M.SFX.click(); groulPaint();
    };
    groulNextRound();
  }

  function buildWheel() {
    const w = document.getElementById("grWheel");
    const per = 360 / NSLOT;
    const stops = SLOTS.map((s, i) => {
      const c = s.type === "red" ? "#c8283c" : s.type === "blk" ? "#14141e" : s.type === "zero" ? "#159a5a" : "#8b2bd6";
      return c + " " + (i * per) + "deg " + ((i + 1) * per) + "deg";
    }).join(",");
    w.style.background = "conic-gradient(" + stops + ")";
    /* ラベルは「盤と同じ大きさの板」を回して、文字を外周ぎりぎりに置く。
       transform-origin と translate(%) を組み合わせる方式は、
       文字の幅で位置がずれるうえ端末ごとに結果が変わるので使わない。 */
    w.innerHTML = SLOTS.map((s, i) => {
      const a = (i + 0.5) * per;
      return '<span class="lbl" style="transform:rotate(' + a + 'deg)">' +
        (s.type === "ev" ? "★" : s.nm) + "</span>";
    }).join("") + '<span class="hub">GRAND</span>';
  }

  function groulNextRound() {
    if (!S || !S.players) return;
    S.round++;
    if (S.round > S.rounds) { finishSession("groul"); return; }
    S.players.forEach((p) => { p.bets = {}; p.delta = 0; });
    S.cur = 0;
    document.getElementById("grRound").textContent = "ROUND " + S.round + " / " + S.rounds;
    /* 終盤ほどイベントマスに止まりやすくする（逆転が起きやすい） */
    S.evBoost = S.round > S.rounds - 3 ? (S.round === S.rounds ? 2.2 : 1.6) : 1;
    document.getElementById("grEvent").innerHTML = S.evBoost > 1
      ? '<div class="mj-ev">⚡ <b>終盤ボーナス</b>：イベントマスの出現率が <b>×' + S.evBoost + "</b> に上がっています</div>" : "";
    groulPaint();
    const sp = document.getElementById("grSpin");
    sp.disabled = false; sp.textContent = "回す";
    sp.onclick = groulSpin;
  }

  function groulPaint() {
    if (!S || !S.players || !document.getElementById("grPl")) return;
    const rk = ranked();
    document.getElementById("grPl").innerHTML = S.players.map((p, i) => {
      const total = Object.values(p.bets).reduce((a, b) => a + b, 0);
      return '<button class="mj-pl' + (i === S.cur ? " me" : "") + '" data-p="' + i + '" style="cursor:pointer">' +
        '<span class="av" style="background:' + p.c + '">' + (rk.indexOf(p) + 1) + "</span>" +
        '<span class="nm">' + esc(p.nm) + (p.i + 1 === S.seat ? " ★" : "") + "</span>" +
        (p.delta ? '<span class="dt' + (p.delta < 0 ? " minus" : "") + '">' + (p.delta > 0 ? "+" : "") + fmt(p.delta) + "</span>" : "") +
        (total ? '<span class="pick bet">賭 ' + fmt(total) + "</span>" : "") +
        '<span class="ch">' + fmt(p.chips) + "</span></button>";
    }).join("");
    document.getElementById("grPl").querySelectorAll("[data-p]").forEach((b) => {
      b.onclick = () => { S.cur = +b.dataset.p; M.SFX.click(); groulPaint(); };
    });

    const p = S.players[S.cur];
    document.getElementById("grWho").innerHTML = '<span style="color:' + p.c + '">' + esc(p.nm) + "</span> のベット";
    document.getElementById("grBal").textContent = fmt(p.chips);
    const opts = [50, 100, 300, 1000];
    document.getElementById("grStake").innerHTML = opts.map((v) =>
      '<button class="' + (v === S.stake ? "on" : "") + '" data-s="' + v + '">' + fmt(v) + "</button>").join("");
    document.getElementById("grStake").querySelectorAll("[data-s]").forEach((b) => {
      b.onclick = () => { S.stake = +b.dataset.s; M.SFX.click(); groulPaint(); };
    });
    document.getElementById("grStakeV").textContent = "持ち " + fmt(p.chips);

    const placed = Object.values(p.bets).reduce((a, b) => a + b, 0);
    document.getElementById("grBoard").innerHTML = CELLS.map((c) => {
      const st = p.bets[c.id] || 0;
      const dis = p.chips - placed < S.stake && !st;
      return '<button class="mj-cell ' + c.cls + (dis ? " dis" : "") + '" data-c="' + c.id + '">' +
        (st ? '<span class="stk">' + fmt(st) + "</span>" : "") +
        esc(c.nm) + "<small>" + esc(c.sub) + "</small><small>×" + payFor(c.n) + "</small></button>";
    }).join("");
    document.getElementById("grBoard").querySelectorAll("[data-c]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.c;
        const used = Object.values(p.bets).reduce((a, x) => a + x, 0);
        if (p.chips - used < S.stake) { M.toast("チップが足りません"); return; }
        p.bets[id] = (p.bets[id] || 0) + S.stake;
        M.SFX.chip(); groulPaint();
      };
    });
    document.getElementById("grNote").innerHTML =
      "マスをタップするたびに <b>" + fmt(S.stake) + "</b> ずつ積まれます。人を切り替えれば、何人でも同じ盤に賭けられます。<br>" +
      "配当はどのマスも<b>同じ控除率（" + Math.round((1 - HOUSE) * 100) + "%）</b>です。イベントマスは 5マスぶんなので ×" + payFor(5) + "。";
  }

  async function groulSpin() {
    if (!S || !S.players) return;
    const anyBet = S.players.some((p) => Object.keys(p.bets).length);
    if (!anyBet) { M.toast("だれもベットしていません"); return; }
    const sp = document.getElementById("grSpin");
    sp.disabled = true; sp.textContent = "回転中…";

    /* 終盤はイベントマスの重みを上げる */
    const pool = SLOTS.map((s) => ({ s, w: s.type === "ev" ? S.evBoost : 1 }));
    const hit = M.weighted(pool).s;
    const idx = SLOTS.indexOf(hit);
    const per = 360 / NSLOT;
    const target = 360 * 6 + (360 - (idx + 0.5) * per);
    const wheel = document.getElementById("grWheel");
    /* 「演出を早くする」設定のときは回転そのものを短くする（見た目と待ち時間をそろえる） */
    const spinMs = M.S.set.fast ? 2600 : 6200;
    wheel.style.transition = "transform " + (spinMs / 1000) + "s cubic-bezier(.12,.66,.16,1)";
    wheel.style.transform = "rotate(" + target + "deg)";
    let t = 0;
    const iv = setInterval(() => { M.SFX.tick(); if (++t > 40) clearInterval(iv); }, 130);
    await new Promise((r) => setTimeout(r, spinMs - 900));
    M.slow(true); await new Promise((r) => setTimeout(r, 900)); M.slow(false);
    clearInterval(iv);
    M.SFX.stop();
    /* 次の回転のために角度を丸めておく（数値が無限に増えないように） */
    wheel.style.transition = "none";
    wheel.style.transform = "rotate(" + (target % 360) + "deg)";

    /* 精算 */
    const lines = [];
    S.players.forEach((p) => {
      let d = 0;
      Object.keys(p.bets).forEach((id) => {
        const c = CELLS.find((x) => x.id === id); if (!c) return;
        const stake = p.bets[id];
        d -= stake;
        if (c.match(hit)) d += Math.round(stake * payFor(c.n));
      });
      p.delta = d;
      p.chips = Math.max(0, p.chips + d);
    });

    let evHTML = "";
    if (hit.type === "ev") {
      evHTML = await groulEvent(hit.ev);
    }
    document.getElementById("grEvent").innerHTML =
      '<div class="mj-ev' + (hit.type === "ev" ? " gold" : "") + '">🎯 <b>' + esc(hit.nm) + "</b> に止まりました</div>" + evHTML;
    if (hit.type === "ev") { M.SFX.bigwin(); M.burst(120, 11); M.shake(true); } else M.SFX.win();

    S.players.forEach((p) => { p.bets = {}; });
    groulPaint();
    await M.sleep(900);
    sp.disabled = false;
    sp.textContent = S.round >= S.rounds ? "最終結果を見る" : "次のラウンドへ";
    sp.onclick = () => { M.SFX.click(); groulNextRound(); };
  }

  /* イベントマス（0〜4） */
  async function groulEvent(kind) {
    const rk = ranked();
    if (kind === 0) {                       // 倍率マス
      S.players.forEach((p) => { if (p.delta > 0) { const add = p.delta; p.chips += add; p.delta += add; } });
      return '<div class="mj-ev gold">✨ <b>倍率マス</b>：このラウンドの<b>勝ちぶんが2倍</b>になりました</div>';
    }
    if (kind === 1) {                       // シャッフル
      const chips = S.players.map((p) => p.chips);
      M.shuffle(chips);
      S.players.forEach((p, i) => { p.chips = chips[i]; });
      return '<div class="mj-ev gold">🌀 <b>シャッフル</b>：全員の持ちチップを<b>入れ替えました</b>！</div>';
    }
    if (kind === 2) {                       // 全員ボーナス
      S.players.forEach((p) => { const add = Math.round(p.chips * 0.15) + 100; p.chips += add; });
      return '<div class="mj-ev gold">🎁 <b>全員ボーナス</b>：全員が <b>+15% ＋100</b> チップ</div>';
    }
    if (kind === 3) {                       // ジャックポット
      const win = rk[M.ri(Math.min(3, rk.length))];
      const amt = Math.round(S.players.reduce((a, p) => a + p.chips, 0) * 0.18);
      win.chips += amt;
      M.rain(160, 1800);
      return '<div class="mj-ev gold">🎰 <b>ジャックポット</b>：<b>' + esc(win.nm) + "</b> が <b>+" + fmt(amt) + "</b> チップを獲得！</div>";
    }
    /* ラストチャンス */
    const last = rk[rk.length - 1];
    const top = rk[0];
    const amt = Math.round((top.chips - last.chips) * 0.5);
    last.chips += amt;
    return '<div class="mj-ev gold">🔄 <b>ラストチャンス</b>：最下位の <b>' + esc(last.nm) +
      "</b> が、トップとの差の<b>半分（" + fmt(amt) + "）</b>を受け取りました</div>";
  }

  function unmount() { window.removeEventListener("mj:wallet", paintBal); S = null; }

  window.MJParty = {
    setup, unmount, ENTRY_FEE, START_CHIPS, prizeMul, wheelEV, payFor, NSLOT, HOUSE,
  };
})();

/* ============================================================
   MagiJackpot — スロット「LUXURIA — ROSE OF FATE」（ルクシア／薔薇の祝福）
   ------------------------------------------------------------
   コンセプト：<b>お店にあるアレ</b>。3リール・3つのストップボタンで、
   自分の手でリールを止める本格タイプ。

   ★ 「目押しが上手い人だけ得をする」を作らないための設計
     普通に作ると、腕のいい人ほど還元率が上がってしまう（＝腕で収支が変わる）。
     この台は実機と同じ2つのしくみで、それを消してある。

       ① <b>引き込み（最大4コマ）</b>
          ベル・薔薇・チェリーは、リール上に<b>4コマ以内で必ず1つ</b>あるように
          並べてある。だからどこで押しても引き込まれて成立する（＝取りこぼし不可能）。

       ② <b>フラグの持ち越し</b>
          セブン／BAR／魔女／ダイヤは1リールに1つずつしか無いので目押しが必要。
          でも <b>一度成立した役は、そろうまで消えない</b>（キューに積む）。
          外しても翌ゲームに残るので、<b>長い目で見た取り分は誰でも同じ</b>。
          「そのゲームでそろうか、次にまわるか」だけが変わる。

     ＝ アシスト（自動で目押し）を入れても切っても、損得はまったく同じ。
       だから安心して「自力で狙う」を楽しめる。これが本作の背骨と同じ考えかた。

   ★ 還元率（合計 98% ＝ MJ.BASE_RTP。残り 2% はジャックポットへ）
     配当そのもので 98% を出す（ゲージのような預かりは無い＝いちばん素直な台）。
     ★ この 98% には<b>本日の倍率（MJ.dayMul）</b>が掛かる＝毎日すこし動く。
       払い出しも配当表の表示も ps() を通すので、必ず一致する。
     検算は MJLuxMath.mc(400000) / MJLuxMath.table()
       （設計値を見たいときは先に MJ.setDayRtp(0.98) で平均の日に固定する）。

   ★ 計算部（MJLuxMath）は DOM に触らない。
   ============================================================ */

/* ══════════════════════════════════════════════════════════
   計算部
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const R = () => (window.MJ ? window.MJ.rng() : Math.random());

  /* ── 図柄 ── */
  const SYM = {
    R7: { nm: "ラッキーセブン", img: "img/sym_seven.webp",   cls: "big"  },
    BR: { nm: "BAR",           img: "img/sym_bar.webp",     cls: "reg"  },
    DM: { nm: "ダイヤモンド",   img: "img/sym_diamond.webp", cls: "dia"  },
    /* ★ 三魔女は <b>薔薇の魔女</b>（この台のテーマは ROSE OF FATE）。
       sym_boss1〜3 は Jackpot Rush の FINAL BATTLE 専用の絵なので使わない——
       あの3人は「対戦相手」として取っておきたい。 */
    W1: { nm: "紅薔薇の魔女",   img: "img/sym_rose_r.webp",  cls: "prem" },
    W2: { nm: "白薔薇の魔女",   img: "img/sym_rose_w.webp",  cls: "prem" },
    W3: { nm: "黒薔薇の魔女",   img: "img/sym_rose_b.webp",  cls: "prem" },
    RS: { nm: "薔薇",           g: "🌹", cls: "rose"   },
    BL: { nm: "ベル",           g: "🔔", cls: "bell"   },
    CH: { nm: "チェリー",       g: "🍒", cls: "cherry" },
  };

  /* ── リール帯（21コマ）──
     ★ ベル(BL) / 薔薇(RS) / チェリー(CH) は 4コマおきに置いてある。
       停止は「押したコマから最大4コマ滑る」ので、
       どこで押しても中段に引き込める＝取りこぼしが起きない。
       ダイヤ(DM) は 8コマおき、セブン(R7)・BAR・魔女は1つだけ＝目押しが要る。 */
  const BASE_STRIP = [
    "BL", "RS", "CH", "DM",
    "BL", "RS", "CH", "R7",
    "BL", "RS", "CH", "DM",
    "BL", "RS", "CH", "BR",
    "BL", "RS", "CH", "DM",
    "W",                       /* ← リールごとに違う魔女に置きかえる */
  ];
  const WITCH = ["W1", "W2", "W3"];     // 左・中・右にそれぞれ別の魔女
  const SLIP  = 4;                      // 引き込みの最大コマ数（実機と同じ）

  function buildStrip(reel) {
    const rot = reel * 7;               // リールごとに位相をずらす（同じ絵柄が並んで見えないように）
    const src = BASE_STRIP.map((s) => (s === "W" ? WITCH[reel] : s));
    const out = [];
    for (let i = 0; i < src.length; i++) out.push(src[(i + rot) % src.length]);
    return out;
  }
  const STRIPS = [buildStrip(0), buildStrip(1), buildStrip(2)];
  const NCOMA = STRIPS[0].length;

  /* ── 役 ──
     pay は「ベットの何倍を払い出すか」。bonus はボーナスのゲーム数。
     ★ 確率と配当の積の合計が 98% になるように選んである（下の table() で検算）。 */
  const ROLES = [
    { id: "prem",   nm: "PREMIUM",    jp: "三魔女降臨",     ic: "👑", p: 1 / 8000, pay: 500, bonus: 30, kind: "bonus", sym: "W" },
    { id: "big",    nm: "BIG BONUS",  jp: "LUXURIA RUSH",   ic: "🌟", p: 1 / 340,  pay: 150, bonus: 30, kind: "bonus", sym: "R7" },
    { id: "reg",    nm: "ROSE BONUS", jp: "薔薇の祝福",     ic: "🌹", p: 1 / 420,  pay: 40,  bonus: 10, kind: "bonus", sym: "BR" },
    { id: "dia",    nm: "ダイヤモンド", jp: "高配当の小役",  ic: "💎", p: 1 / 220,  pay: 20,  kind: "small", sym: "DM", aim: 1 },
    { id: "cherry", nm: "チェリー",    jp: "左だけで成立",   ic: "🍒", p: 1 / 80,   pay: 3,   kind: "small", sym: "CH", left: 1 },
    { id: "bell",   nm: "ベル",        jp: "ふだんの主役",   ic: "🔔", p: 1 / 14,   pay: 2,   kind: "small", sym: "BL" },
    { id: "rose",   nm: "ローズ",      jp: "ベットが返る",   ic: "🌷", p: 1 / 9,    pay: 1,   kind: "small", sym: "RS" },
  ];
  /* ★ 還元率あわせの1点つまみ。素の設計値は 98.13% なので、98% にそろえる。
     配当表やリールをいじったら MJLuxMath.table().rtp を見て、ここを更新すること。
     ★ 検算するときは先に MJ.setDayRtp(0.98)（平均の日に固定）してから。 */
  const PAY_SCALE = 0.98 / 0.981291;
  /* 実際に使う倍率＝設計値 × 本日の還元率ぶん。
     配当表の表示もこの ps() を通すので、見えている金額と払い出しが必ず一致する。 */
  const DAY = () => (window.MJ && window.MJ.dayMul ? window.MJ.dayMul() : 1);
  function ps() { return PAY_SCALE * DAY(); }

  function role(id) { return ROLES.find((r) => r.id === id) || null; }
  function payOf(id, bet) {
    const r = role(id); if (!r) return 0;
    return Math.round(r.pay * ps() * bet);
  }

  /* 1ゲームぶんの抽選。優先順の高いものから順に見る（重なりは作らない） */
  function draw() {
    const x = R();
    let acc = 0;
    for (const r of ROLES) { acc += r.p; if (x < acc) return r.id; }
    return "";
  }

  /* ── 停止位置の計算 ──
     リール位置 p は「上段に strip[p] が来ている」状態。中段は strip[p+1]。
     press から SLIP コマまでの中で、中段に want を持ってこられる位置をさがす。
     assist のときは全コマから探す（＝自動で目押し）。 */
  function at(reel, p, row) { return STRIPS[reel][((p + row) % NCOMA + NCOMA) % NCOMA]; }
  function midOf(reel, p) { return at(reel, p, 1); }

  function solve(reel, press, want, assist, forbid) {
    const max = assist ? NCOMA - 1 : SLIP;
    forbid = forbid || [];
    /* ① want を中段へ */
    if (want) {
      for (let s = 0; s <= max; s++) {
        const p = press + s;
        if (midOf(reel, p) === want) return { p: p, slip: s, got: true };
      }
    }
    /* ② 引き込めない／はずれ → 成立しない位置に止める。
       できれば want を上段か下段に見せて「惜しい」を作る。 */
    let best = null, tease = null;
    for (let s = 0; s <= SLIP; s++) {
      const p = press + s, mid = midOf(reel, p);
      if (forbid.indexOf(mid) >= 0) continue;
      if (want && (at(reel, p, 0) === want || at(reel, p, 2) === want)) { tease = { p: p, slip: s, got: false }; break; }
      if (!best) best = { p: p, slip: s, got: false };
    }
    return tease || best || { p: press, slip: 0, got: false };
  }

  /* ── 出目の判定（実際に中段に並んだものだけを見る＝ごまかしなし） ── */
  function evalMid(mid) {
    const isW = (s) => s === "W1" || s === "W2" || s === "W3";
    if (isW(mid[0]) && isW(mid[1]) && isW(mid[2])) return "prem";
    if (mid[0] === mid[1] && mid[1] === mid[2]) {
      if (mid[0] === "R7") return "big";
      if (mid[0] === "BR") return "reg";
      if (mid[0] === "DM") return "dia";
      if (mid[0] === "BL") return "bell";
      if (mid[0] === "RS") return "rose";
      if (mid[0] === "CH") return "cherry";
    }
    if (mid[0] === "CH") return "cherry";      // チェリーは左リールだけで成立
    return "";
  }

  /* ── ボーナスの出玉を、ゲーム数ぶんに配る ──
     ★ 合計は「ぴったり pay×bet」。配りかたをランダムにしても総額は動かないので、
       演出（1ゲームごとの当たり方）は自由に荒くできる。 */
  function bonusPlan(id, bet) {
    const r = role(id); if (!r || !r.bonus) return null;
    const total = payOf(id, bet), n = r.bonus;
    const w = [];
    let sum = 0;
    for (let i = 0; i < n; i++) { const v = 0.45 + R() * 1.35; w.push(v); sum += v; }
    const out = [];
    let used = 0;
    for (let i = 0; i < n; i++) {
      const v = i === n - 1 ? total - used : Math.round(total * w[i] / sum);
      out.push(Math.max(0, v)); used += out[i];
    }
    /* 端数のズレを最後に寄せる（合計は必ず total） */
    const diff = total - out.reduce((a, b) => a + b, 0);
    out[n - 1] = Math.max(0, out[n - 1] + diff);
    return { id: id, total: total, games: n, pays: out };
  }

  /* ══════════════════════════════════════════
     検算
     ══════════════════════════════════════════ */
  /* 式で出した還元率（配当のみ）。表示用の一覧つき。 */
  function table() {
    let rtp = 0;
    const sc = ps();
    const rows = ROLES.map((r) => {
      const ev = r.p * r.pay * sc;
      rtp += ev;
      return { id: r.id, nm: r.nm, oneIn: Math.round(1 / r.p), pay: r.pay, ev: ev };
    });
    return { rows: rows, rtp: rtp };
  }
  /* 実際に回して確かめる（アシストON＝毎ゲーム必ずそろう前提。
     アシストOFFでも持ち越しがあるので、長い目では同じ値になる） */
  function mc(n) {
    n = n || 400000;
    const bet = 1000;
    let wag = 0, pay = 0;
    for (let i = 0; i < n; i++) {
      wag += bet;
      const id = draw();
      if (!id) continue;
      pay += payOf(id, bet);
    }
    return { n: n, rtp: pay / wag };
  }
  /* 引き込みの検算：ベル・薔薇・チェリーが「どこで押しても中段に来る」ことの確認。
     false が返ったら並びが壊れている（取りこぼしが発生してしまう）。 */
  function checkPull() {
    const ok = { BL: true, RS: true, CH: true };
    ["BL", "RS", "CH"].forEach((s) => {
      for (let r = 0; r < 3; r++) {
        for (let press = 0; press < NCOMA; press++) {
          let hit = false;
          for (let k = 0; k <= SLIP; k++) if (midOf(r, press + k) === s) { hit = true; break; }
          if (!hit) ok[s] = false;
        }
      }
    });
    return ok;
  }

  window.MJLuxMath = {
    SYM, STRIPS, NCOMA, SLIP, ROLES, PAY_SCALE, ps,
    role, payOf, draw, solve, evalMid, midOf, at, bonusPlan,
    table, mc, checkPull,
  };
})();


/* ══════════════════════════════════════════════════════════
   表示部
   ══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const M = window.MJ, X = window.MJLuxMath;
  const fmt = M.fmt, esc = M.esc;
  const G = "lux";
  const MS_PER_COMA = 46;          // 1コマ流れるのにかかる時間（目押しできる速さ）
  let st = null, ro = null, raf = 0;

  /* 演出図鑑 */
  const FX_BOOK = [
    { id: "tenpai", ic: "🎯", nm: "テンパイ",         ds: "左と中に同じ図柄がそろって止まる",           rate: "右を狙え！" },
    { id: "lamp",   ic: "💡", nm: "ロゼットランプ",   ds: "台の下のランプが点灯する",                   rate: "ボーナス成立中（持ち越し）" },
    { id: "cut1",   ic: "🌙", nm: "誘惑のカットイン", ds: "ルクシアが手をのばす",                       rate: "期待度 ふつう" },
    { id: "cut2",   ic: "💜", nm: "紫電のカットイン", ds: "紫の光がはじける",                           rate: "期待度 高" },
    { id: "cut3",   ic: "🔥", nm: "薔薇の祝福",       ds: "画面全体が金色に燃える",                     rate: "プレミアム級" },
    { id: "slip",   ic: "🎚", nm: "ロングスベリ",     ds: "押したのに4コマ滑って止まる",                rate: "何かが成立している合図" },
    { id: "prem",   ic: "👑", nm: "三魔女降臨",       ds: "3人の魔女が中段にそろう",                    rate: "最上位（1/8000）" },
  ];

  function symHTML(id, h, cls) {
    const s = X.SYM[id];
    const inner = s.img
      ? '<img src="' + s.img + '" alt="' + esc(s.nm) + '" loading="lazy">'
      : '<span class="g">' + s.g + "</span>";
    return '<div class="mj-sym ' + s.cls + (cls ? " " + cls : "") + '" style="height:' + h + 'px">' + inner + "</div>";
  }

  /* ══════════════════════════════════════════
     組み立て
     ══════════════════════════════════════════ */
  function mount(root) {
    const sv = M.S.lux || {};
    st = {
      bet: 500,
      assist: sv.assist == null ? 1 : (sv.assist ? 1 : 0),
      /* 成立して「まだそろっていない」役を積んでおく（＝持ち越し）。
         これがあるおかげで、目押しの腕は取り分を動かさない。 */
      q: Object.assign({ prem: 0, big: 0, reg: 0, dia: 0, cherry: 0, bell: 0, rose: 0 }, sv.q || {}),
      spinning: false, stopped: [0, 0, 0], pos: [0, 0, 0], anim: [null, null, null],
      /* fin は「止めると決まったコマ位置」。pos はスベリの途中で小数になるので、
         出目の判定にはこちらを使う（途中の見た目で判定すると1コマずれる）。 */
      fin: [0, 0, 0],
      target: "", aims: [null, null, null], plan: null,
      bonus: null, bonusLeft: 0, bonusWon: 0,
      auto: false, busy: false, rowh: 60, needBuild: false,
      fxSeen: sv.fx || {}, lastMid: null, t0: 0,
    };
    root.innerHTML =
      '<div class="mjs g-lux">' +
        '<div class="mjs-top">' +
          '<button class="x" id="lxBack" aria-label="ロビーへ戻る">‹</button>' +
          '<div class="ttl"><b>ROSE OF FATE</b><i>LUXURIA</i><u>3 REEL</u></div>' +
          '<div class="bal"><img src="../XEVA.png" alt=""><span id="lxBal">0</span></div>' +
        "</div>" +

        '<div class="mjs-main">' +
          '<div class="mjs-bar">' +
            '<div class="mjs-jp"><div class="k">JACKPOT' +
              '<span class="live" id="lxJpLive">SHARED</span></div>' +
              '<div class="v" id="lxJp">0</div></div>' +
            '<div class="mjs-meter" id="lxBonusBox"><span class="k">BONUS</span>' +
              '<span class="v" id="lxBonusV">—</span></div>' +
            '<div class="mjs-meter"><span class="k">GET</span>' +
              '<span class="v" id="lxGetV">0</span></div>' +
          "</div>" +

          '<div class="lx-stage" id="lxStage">' +
            '<div class="lx-machine" id="lxMachine">' +
              '<div class="lx-plate" id="lxPlate">LUXURIA</div>' +
              '<div class="lx-reels" id="lxReels"><div class="lx-payline"></div></div>' +
              '<div class="lx-lamps">' +
                '<span class="lx-lamp rose" id="lxLampRose"><i></i>ROSE</span>' +
                '<span class="lx-lamp" id="lxLampBig"><i></i>BIG</span>' +
                '<span class="lx-lamp" id="lxLampDia"><i></i>DIA</span>' +
              "</div>" +
            "</div>" +
          "</div>" +

          '<div class="lx-stops">' +
            '<button class="lx-stop" id="lxS0" disabled><b>STOP</b><small>LEFT</small></button>' +
            '<button class="lx-stop" id="lxS1" disabled><b>STOP</b><small>CENTER</small></button>' +
            '<button class="lx-stop" id="lxS2" disabled><b>STOP</b><small>RIGHT</small></button>' +
          "</div>" +
          '<div class="mjs-msg" id="lxMsg">' + M.rtpLine() + " — BET を決めて、レバーをたたこう</div>" +

          '<div class="mjs-ov" id="lxOv"></div>' +
          '<div class="mjs-burst" id="lxBurst"><div class="t" id="lxBurstT"></div>' +
            '<div class="s" id="lxBurstS"></div><div class="n" id="lxBurstN"></div></div>' +
        "</div>" +

        '<div class="mjs-act">' +
          '<div class="r">' +
            '<div class="mjs-seg" id="lxAssist"></div>' +
            '<div class="mjs-bet"><span class="k">BET</span><span class="v" id="lxBetV">500</span>' +
              '<button id="lxBetD" aria-label="ベットを下げる">−</button>' +
              '<button id="lxBetU" aria-label="ベットを上げる">＋</button></div>' +
          "</div>" +
          '<div class="r">' +
            '<button class="mjs-ic" id="lxMenu">☰<br><i>MENU</i></button>' +
            '<button class="mjs-go" id="lxGo"><b>START</b><small>レバーをたたく</small></button>' +
            '<button class="mjs-ic wide" id="lxExtra">MAX<br><i>BET</i></button>' +
            '<button class="mjs-ic wide" id="lxAuto">AUTO<br><i>OFF</i></button>' +
          "</div>" +
        "</div>" +
      "</div>";

    paintAssist(); paintBetV(); paintBal(); paintJp(); paintLamps(); paintBonusBox();
    document.getElementById("lxBack").onclick = () => { M.SFX.click(); window.mjGo("home"); };
    document.getElementById("lxMenu").onclick = openMenu;
    document.getElementById("lxBetU").onclick = () => stepBet(1);
    document.getElementById("lxBetD").onclick = () => stepBet(-1);
    document.getElementById("lxAuto").onclick = toggleAuto;
    document.getElementById("lxGo").onclick = () => { if (!st.busy) go(); };
    document.getElementById("lxExtra").onclick = () => {
      if (st.bonus) { skipBonus(); return; }
      st.bet = M.BETS[M.BETS.length - 1]; M.SFX.chip(); paintBetV();
    };
    for (let i = 0; i < 3; i++) {
      document.getElementById("lxS" + i).onclick = () => stopReel(i);
    }

    requestAnimationFrame(buildReels);
    /* ★ 見張るのは筐体。窓は自分で高さを入れるので、窓を見張ると自分の変更で鳴き続ける。 */
    const box = document.getElementById("lxStage");
    if (window.ResizeObserver && box) {
      ro = new ResizeObserver(() => {
        if (!st) return;
        if (st.spinning) { st.needBuild = true; return; }
        buildReels();
      });
      ro.observe(box);
    }
    if (!M.tutorialSeen(G)) { showTutorial(); M.tutorialMark(G); }
    window.addEventListener("mj:wallet", paintBal);
    /* ★ 2026-08-12 登録もれ: ほかの台（スロット・パチンコ）には付いていたのに
       ここだけ無く、クラウドの残高が届いた瞬間に札が切り替わらなかった。 */
    window.addEventListener("mj:jackpot", paintJp);
    st.jpTimer = setInterval(paintJp, 2000);
    if (heldBonus()) msg("💡 <b>ランプ点灯中！</b>　" + esc(X.role(heldBonus()).nm) + " をそろえよう", "hot");
  }

  /* ══════════════════════════════════════════
     リールの組み立てと回転
     ══════════════════════════════════════════ */
  /* 1コマの高さ。
     ★ 「残った高さを3で割る」だけだと、縦長の端末でコマが細長くなって
       図柄がすかすかに見える。コマの横幅を上限にして、正方形に近づける。
       あまったぶんは上下の余白（.lx-machine の justify-content:center）に流す。 */
  function rowH() {
    const mc = document.getElementById("lxStage");
    const box = document.getElementById("lxReels");
    if (!mc || !box) return 60;
    const avail = mc.clientHeight - 66;                    // 名札とランプのぶんを引く
    const colw = (box.clientWidth - 10 - 10) / 3;          // padding とすきまを引く
    if (avail < 90 || colw < 20) return 60;
    return Math.max(34, Math.floor(Math.min(avail / 3, colw * 1.35)));
  }
  function buildReels() {
    const box = document.getElementById("lxReels"); if (!box || !st) return;
    const h = rowH();
    st.rowh = h;
    st.needBuild = false;
    box.style.height = (h * 3 + 10) + "px";
    /* 絵柄の大きさ（画像も絵文字も）はこの1つの数字から起こす */
    const colw = (box.clientWidth - 20) / 3;
    box.style.setProperty("--cell", Math.round(Math.min(h, colw) * 0.92) + "px");
    box.innerHTML = '<div class="lx-payline"></div>';
    for (let c = 0; c < 3; c++) {
      const reel = document.createElement("div");
      reel.className = "lx-reel";
      reel.id = "lxR" + c;
      const strip = document.createElement("div");
      strip.className = "lx-strip";
      /* 21コマを2周ぶん並べておく。translateY を 0〜21コマの範囲で動かせば途切れない。 */
      let html = "";
      for (let k = 0; k < 2; k++)
        for (let i = 0; i < X.NCOMA; i++) html += symHTML(X.STRIPS[c][i], h);
      strip.innerHTML = html;
      reel.appendChild(strip);
      box.appendChild(reel);
    }
    drawReels();
  }
  function drawReels() {
    if (!st) return;
    for (let c = 0; c < 3; c++) {
      const s = document.querySelector("#lxR" + c + " .lx-strip"); if (!s) continue;
      const f = ((st.pos[c] % X.NCOMA) + X.NCOMA) % X.NCOMA;
      s.style.transform = "translateY(" + (-f * st.rowh) + "px)";
    }
  }
  /* ★ 回転も「止まるときのスベリ」も、この1つのループで動かす。
     CSS の transition でスベリを表現すると、リールが 21コマの境目をまたぐ瞬間に
     translateY が小さい値へ戻るせいで<b>逆回転して見える</b>。
     毎フレーム位置を計算して剰余だけ描けば、境目をまたいでも前へ流れたままになる。 */
  function startLoop() {
    if (raf) return;
    st.t0 = performance.now();
    const step = (t) => {
      if (!st) { raf = 0; return; }
      const dt = Math.min(120, t - st.t0); st.t0 = t;
      let live = false;
      for (let c = 0; c < 3; c++) {
        const a = st.anim[c];
        if (a) {
          const k = Math.min(1, (t - a.t0) / a.ms);
          st.pos[c] = a.from + (a.to - a.from) * (1 - Math.pow(1 - k, 3));
          if (k >= 1) { st.pos[c] = a.to; st.anim[c] = null; }
          live = true;
        } else if (!st.stopped[c]) {
          st.pos[c] += dt / MS_PER_COMA;
          live = true;
        }
      }
      drawReels();
      raf = live ? requestAnimationFrame(step) : 0;
    };
    raf = requestAnimationFrame(step);
  }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  /* 位置を「いまより必ず前」の目標へ動かす。to は絶対コマ数（剰余は描画時にとる）。 */
  function slideTo(c, to, ms) {
    st.anim[c] = { from: st.pos[c], to: to, t0: performance.now(), ms: Math.max(90, ms) };
    startLoop();
  }

  /* 狙っている図柄を光らせる（casual 向けの親切機能。結果には影響しない） */
  function markAim() {
    document.querySelectorAll("#lxReels .mj-sym.aim").forEach((e) => e.classList.remove("aim"));
    for (let c = 0; c < 3; c++) {
      const want = st.aims[c]; if (!want) continue;
      const cells = document.querySelectorAll("#lxR" + c + " .mj-sym");
      cells.forEach((el, i) => { if (X.STRIPS[c][i % X.NCOMA] === want) el.classList.add("aim"); });
    }
  }

  /* ══════════════════════════════════════════
     1ゲーム
     ══════════════════════════════════════════ */
  function heldBonus() {
    if (st.q.prem) return "prem";
    if (st.q.big) return "big";
    if (st.q.reg) return "reg";
    return "";
  }
  /* このゲームで狙う役を決める。
     ★ 順番がとても大事。<b>必ず引き込める役から先に</b>消化する。
       ボーナスを最優先にすると、目押しが苦手な人は
       「ボーナスが揃うまで、ベルも薔薇もいっさい引き込まれない」状態になり、
       そのあいだに成立した小役がどんどん積み上がって出てこない
       （＝当たっているのに出玉が来ない、実質の還元率が落ちる）。
       実機でも「小役に取られる」ことは起きるので、こちらのほうが自然でもある。
       ボーナスは<b>ランプが点いたまま消えない</b>ので、損はしない。 */
  function pickTarget() {
    if (st.q.bell) return "bell";
    if (st.q.rose) return "rose";
    if (st.q.cherry) return "cherry";
    if (st.q.dia) return "dia";
    return heldBonus();
  }

  async function go() {
    if (!st || st.busy) return;
    /* ボーナス中は「1回押すごとに1ゲーム」進む */
    if (st.bonus) { await bonusGame(); return; }
    if (st.spinning) return;
    if (M.xeva() < st.bet) { msg("XEVA が足りません", "bad"); stopAuto(); return; }
    if (!M.bet(st.bet, G)) { msg("ベットできませんでした", "bad"); stopAuto(); return; }
    st.busy = true;
    paintBal(); paintBetV();

    /* 抽選 → 成立したものはキューへ積む（そろわなくても消えない）
       ★ ここで上限をつけて捨ててはいけない。捨てたぶんはそのまま還元率の目減りになる。 */
    const got = X.draw();
    if (got) st.q[got] = (st.q[got] || 0) + 1;

    st.target = pickTarget();
    st.aims = aimsFor(st.target);
    st.stopped = [0, 0, 0];
    st.anim = [null, null, null];
    st.fin = st.pos.map((p) => Math.ceil(p));
    st.spinning = true;
    st.jpPending = await M.jackpotRoll(st.bet);
    if (!st) return;
    setStops(true);
    document.getElementById("lxGo").disabled = true;
    const reels = document.getElementById("lxReels");
    if (reels) reels.classList.remove("win");
    M.SFX.chip();
    startLoop();
    markAim();

    const b = heldBonus();
    paintLamps();
    if (b) msg("💡 <b>" + esc(X.role(b).nm) + " 成立中！</b>　" + aimText(b) + " を狙って！", "hot");
    else if (st.target === "dia") msg("💎 <b>ダイヤ成立中</b>　狙えば取れる", "hot");
    else msg("3つのボタンで、自分のタイミングで止めよう");

    st.busy = false;
    /* アシスト or オートのときは、こちらで押してあげる */
    if (st.auto) autoStops();
  }

  function aimsFor(target) {
    if (!target) return [null, null, null];
    const r = X.role(target); if (!r) return [null, null, null];
    if (target === "prem") return ["W1", "W2", "W3"];
    if (r.left) return [r.sym, null, null];
    return [r.sym, r.sym, r.sym];
  }
  function aimText(id) {
    if (id === "prem") return "魔女";
    const r = X.role(id);
    return r ? (X.SYM[r.sym] ? X.SYM[r.sym].nm : r.nm) : "";
  }
  function setStops(on) {
    for (let i = 0; i < 3; i++) {
      const b = document.getElementById("lxS" + i); if (!b) continue;
      b.disabled = !on || !!st.stopped[i];
      b.classList.toggle("done", !!st.stopped[i]);
      b.classList.toggle("ready", !!on && !st.stopped[i]);
    }
  }
  function autoStops() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => { if (st && st.spinning && !st.stopped[i]) stopReel(i, true); },
        (M.S.set.fast ? 130 : 260) * (i + 1));
    }
  }

  /* リールを1本止める。ここが目押しの本体。 */
  function stopReel(i, auto) {
    if (!st || !st.spinning || st.stopped[i]) return;
    const press = Math.ceil(st.pos[i]);
    const want = st.aims[i];
    /* ★ 「抽選していない役が偶然そろってしまう」のを止める。
       ここを忘れると、たとえばセブンを狙って外したときに
       3つのリールがそろってベルになり、<b>絵はそろっているのに配当が出ない</b>
       という理不尽な出目が生まれる（配当を出せば還元率が狂う）。
       狙いを引き込めなかったときは、成立しない位置に落とす。 */
    const forbid = [];
    const mids = [];
    for (let c = 0; c < 3; c++) if (st.stopped[c]) mids.push(X.midOf(c, st.fin[c]));
    if (mids.length === 2 && mids[0] === mids[1]) forbid.push(mids[0]);
    /* ★ 三魔女は「同じ図柄が3つ」ではなく「別々の魔女が3人」でそろう役なので、
       上の同一図柄チェックだけではすり抜ける。まとめて避ける。 */
    const isW = (x) => x === "W1" || x === "W2" || x === "W3";
    if (mids.length === 2 && isW(mids[0]) && isW(mids[1]) && st.target !== "prem") {
      forbid.push("W1", "W2", "W3");
    }
    if (i === 0 && st.target !== "cherry") forbid.push("CH");   // 意図しないチェリーを作らない
    const assist = !!st.assist || !!auto;
    const sol = X.solve(i, press, want, assist, forbid);
    st.stopped[i] = 1;
    st.fin[i] = sol.p;

    /* スベリを見せる（押した位置から何コマ動いたか） */
    const dist = sol.p - press;
    const ms = Math.min(520, 110 + dist * 24);
    slideTo(i, sol.p, ms);
    if (dist >= X.SLIP) seeFx("slip");
    const reel = document.getElementById("lxR" + i);
    if (reel) { reel.classList.remove("stopped"); void reel.offsetWidth; reel.classList.add("stopped"); }
    M.SFX.stop();
    setStops(true);
    st.lastMs = ms;

    /* テンパイの合図 */
    if (st.stopped[0] && st.stopped[1] && !st.stopped[2]) {
      const a = X.midOf(0, st.fin[0]), b = X.midOf(1, st.fin[1]);
      const isW = (x) => x === "W1" || x === "W2" || x === "W3";
      if (a === b || (isW(a) && isW(b))) {
        seeFx("tenpai"); M.SFX.hot();
        msg("🎯 <b>テンパイ！</b>　右リールを狙え", "hot");
      }
    }
    /* 3本そろったら、スベリのアニメが終わってから精算する */
    if (st.stopped[0] && st.stopped[1] && st.stopped[2]) setTimeout(settle, ms + 200);
  }

  /* 3本止まったあとの精算 */
  async function settle() {
    if (!st) return;
    st.spinning = false;
    stopLoop();
    /* アニメの端数を捨てて、決まったコマにきっちり合わせる */
    st.anim = [null, null, null];
    st.pos = st.fin.slice();
    drawReels();
    setStops(false);
    document.querySelectorAll("#lxReels .mj-sym.aim").forEach((e) => e.classList.remove("aim"));
    const mid = [X.midOf(0, st.fin[0]), X.midOf(1, st.fin[1]), X.midOf(2, st.fin[2])];
    st.lastMid = mid;
    const hit = X.evalMid(mid);
    const grid = [0, 1, 2].map((c) => [X.at(c, st.fin[c], 0), X.at(c, st.fin[c], 1), X.at(c, st.fin[c], 2)]);
    const reels = document.getElementById("lxReels");

    let win = 0, role = null;
    if (hit && st.q[hit]) {                       // 成立していた役がそろった
      st.q[hit]--;
      role = X.role(hit);
      win = X.payOf(hit, st.bet);
      if (reels) reels.classList.add("win");
    } else if (hit) {
      /* ★ 抽選していない役が偶然そろった場合は配当を出さない（還元率が狂うため）。
         solve() の forbid でここには来ない想定だが、念のための最後の砦。 */
      role = null; win = 0;
    }
    saveLux();
    paintLamps();

    const jp = st.jpPending || 0; st.jpPending = 0;

    if (role && role.kind === "bonus") {
      M.round({ game: G, bet: st.bet, win: 0,
        replay: { kind: "lux", grid: grid, role: role.nm, assist: !!st.assist } });
      await enterBonus(hit, mid);
      if (!st) return;
    } else if (win > 0) {
      M.payout(win, G, "LUXURIA：" + role.nm);
      paintBal();
      const r = win / Math.max(1, st.bet);
      if (r >= 10) { M.SFX.bigwin(); M.burst(120, 11); msg("💎 <b>" + esc(role.nm) + "!</b>　+" + fmt(win), "win"); }
      else { M.SFX.win(); M.burst(30, 7); msg(role.ic + " " + esc(role.nm) + "　+" + fmt(win)); }
      M.round({ game: G, bet: st.bet, win: win, replay: null });
    } else {
      const b = heldBonus();
      msg(b ? "💡 まだ <b>" + esc(X.role(b).nm) + "</b> は残っています。次で狙おう" : "…はずれ");
      M.round({ game: G, bet: st.bet, win: 0, replay: null });
    }
    if (!st) return;

    const goB = document.getElementById("lxGo");
    if (goB) goB.disabled = false;
    if (st.needBuild) buildReels();

    if (jp > 0) { M.payout(jp, G, "プログレッシブ・ジャックポット"); paintBal(); await M.jackpotShow(jp); }
    if (!st) return;

    if (st.auto && !st.bonus) {
      if (M.xeva() < st.bet) { stopAuto(); M.toast("XEVA が足りなくなったのでオートを止めました"); return; }
      st.timer = setTimeout(() => { if (st && st.auto && !st.spinning && !st.busy) go(); }, M.S.set.fast ? 180 : 420);
    }
  }

  /* ══════════════════════════════════════════
     ボーナス
     ══════════════════════════════════════════ */
  async function enterBonus(id, mid) {
    const r = X.role(id);
    st.plan = X.bonusPlan(id, st.bet);
    st.bonus = id; st.bonusLeft = st.plan.games; st.bonusWon = 0;
    const mc = document.getElementById("lxMachine");
    if (mc) mc.classList.add("bonus");
    const plate = document.getElementById("lxPlate");
    if (plate) plate.textContent = r.nm;
    if (id === "prem") seeFx("prem");

    /* カットイン → 全画面バナー */
    await M.cutIn({ level: id === "reg" ? 2 : 3, word: id === "prem" ? "三魔女、降臨" : id === "big" ? "運命を、誘惑する" : "薔薇の、祝福を" });
    if (!st) return;
    M.SFX.bigwin(); M.shake(true); M.burst(id === "prem" ? 260 : 180, 13);
    if (id === "prem") M.rain(200, 1800);
    await banner(r.nm, r.jp, "総獲得 " + fmt(st.plan.total) + " XEVA（" + st.plan.games + " ゲーム）", "rose", 1900);
    if (!st) return;
    paintBonusBox(); paintGet();
    msg("▶ <b>" + esc(r.nm) + "</b>　PUSH でゲームを進めよう（⏩ で一気に受け取り）");
    const ex = document.getElementById("lxExtra");
    if (ex) ex.innerHTML = "⏩<br><i>一気</i>";
    const goB = document.getElementById("lxGo");
    if (goB) goB.innerHTML = "<b>PUSH</b><small>ボーナス消化</small>";
    if (st.auto) st.timer = setTimeout(() => { if (st && st.auto && st.bonus) go(); }, 380);
  }

  /* ボーナス中の1ゲーム（ベットは要らない＝出玉だけ） */
  async function bonusGame() {
    if (!st || !st.bonus || st.busy) return;
    st.busy = true;
    const idx = st.plan.games - st.bonusLeft;
    const pay = st.plan.pays[idx] || 0;
    /* 出玉に見合った図柄を中段にそろえる（大きいほど豪華な絵） */
    const big = pay >= st.plan.total / st.plan.games * 1.4;
    const sym = big ? "DM" : (idx % 3 === 0 ? "BL" : idx % 3 === 1 ? "RS" : "CH");
    /* ひと呼吸ぶん回してから、その図柄が中段に来る位置へ止める（静止画にならないように） */
    for (let c = 0; c < 3; c++) {
      const base = Math.ceil(st.pos[c]) + 7 + c * 2;
      let p = base;
      for (let k = 0; k < X.NCOMA; k++) if (X.midOf(c, base + k) === sym) { p = base + k; break; }
      st.fin[c] = p;
      slideTo(c, p, (M.S.set.fast ? 190 : 330) + c * 60);
    }
    M.SFX.stop();
    if (big) { M.SFX.win(); M.burst(40, 8); } else M.SFX.chip();
    await M.sleep(M.S.set.fast ? 260 : 440);
    if (!st || !st.bonus) { st.busy = false; return; }

    st.bonusWon += pay;
    st.bonusLeft--;
    M.payout(pay, G, "LUXURIA：" + X.role(st.bonus).nm);
    paintBal(); paintBonusBox(); paintGet();
    M.round({ game: G, bet: 0, win: pay, replay: null });
    msg((big ? "💎 " : X.SYM[sym].g + " ") + "+" + fmt(pay) + " XEVA　／ 残り " + st.bonusLeft + " ゲーム",
      big ? "win" : "");
    await M.sleep(240);
    strips.forEach((s) => { s.style.transition = ""; });
    st.busy = false;
    if (!st) return;
    if (st.bonusLeft <= 0) { await endBonus(); return; }
    if (st.auto) st.timer = setTimeout(() => { if (st && st.auto && st.bonus && !st.busy) go(); }, M.S.set.fast ? 90 : 220);
  }

  /* 残りをまとめて受け取る（時間を取らせないための救済） */
  async function skipBonus() {
    if (!st || !st.bonus || st.busy) return;
    st.busy = true;
    let rest = 0;
    for (let i = st.plan.games - st.bonusLeft; i < st.plan.games; i++) rest += st.plan.pays[i] || 0;
    st.bonusWon += rest; st.bonusLeft = 0;
    M.payout(rest, G, "LUXURIA：" + X.role(st.bonus).nm);
    M.round({ game: G, bet: 0, win: rest, replay: null });
    paintBal(); paintBonusBox(); paintGet();
    M.SFX.bigwin(); M.burst(120, 11);
    st.busy = false;
    await endBonus();
  }

  async function endBonus() {
    const won = st.bonusWon, id = st.bonus;
    const r = X.role(id);
    st.bonus = null; st.plan = null; st.bonusLeft = 0;
    const mc = document.getElementById("lxMachine");
    if (mc) mc.classList.remove("bonus");
    const plate = document.getElementById("lxPlate"); if (plate) plate.textContent = "LUXURIA";
    const ex = document.getElementById("lxExtra"); if (ex) ex.innerHTML = "MAX<br><i>BET</i>";
    const goB = document.getElementById("lxGo"); if (goB) goB.innerHTML = "<b>START</b><small>レバーをたたく</small>";
    paintBonusBox();
    await banner(r.nm + " 終了", "+" + fmt(won) + " XEVA", "", "brk", 1600);
    if (!st) return;
    msg("🌹 <b>" + esc(r.nm) + "</b> で <b>" + fmt(won) + " XEVA</b> を獲得しました", "win");
    st.bonusWon = 0;
    if (st.auto) st.timer = setTimeout(() => { if (st && st.auto && !st.spinning && !st.busy) go(); }, 420);
  }

  /* ══════════════════════════════════════════
     描画
     ══════════════════════════════════════════ */
  function paintBal() { const b = document.getElementById("lxBal"); if (b) b.textContent = fmt(M.xeva()); }
  function paintJp() {
    const v = document.getElementById("lxJp"); if (!v) return;
    v.textContent = fmt(M.jackpot());
    const l = document.getElementById("lxJpLive");
    /* ★ 2026-08-12 「なぜ共有できていないのか」を札に出す。
       waiting＝まだ届いていない（起動直後・回線が遅い）／denied＝読めない（DBのルール） */
    if (l) {
      const s = M.jackpotState ? M.jackpotState() : (M.jackpotShared() ? "shared" : "denied");
      l.textContent = s === "shared" ? "SHARED" : s === "waiting" ? "同期中…" : "OFFLINE";
      l.className = "live" + (s === "shared" ? "" : " off");
      l.title = s === "shared" ? "みんなで共有しているプールです"
        : s === "waiting" ? "共有プールの残高を読み込んでいます"
        : "共有プールに接続できません（この端末のプールで遊んでいます）";
    }
  }
  function paintBetV() {
    const e = document.getElementById("lxBetV"); if (e) e.textContent = fmt(st.bet);
    const chips = document.getElementById("lxBets"); if (chips) paintChips(chips);
  }
  function paintChips(box) {
    box.innerHTML = M.BETS.map((v, i) =>
      '<button class="mj-chip c' + (i + 1) + (v === st.bet ? " on" : "") + '" data-b="' + v + '"' +
      (M.xeva() < v ? " disabled" : "") + ">" + (v >= 1000 ? (v / 1000) + "K" : v) + "</button>").join("");
    box.querySelectorAll("[data-b]").forEach((b) => {
      b.onclick = () => { st.bet = +b.dataset.b; M.SFX.chip(); paintBetV(); };
    });
  }
  function paintAssist() {
    const box = document.getElementById("lxAssist"); if (!box) return;
    box.innerHTML =
      '<button class="' + (st.assist ? "on" : "") + '" data-a="1">🤝 アシスト<small>自動で目押し</small></button>' +
      '<button class="' + (st.assist ? "" : "on") + '" data-a="0">👁 自力<small>本気の目押し</small></button>';
    box.querySelectorAll("[data-a]").forEach((b) => {
      b.onclick = () => {
        if (st.spinning) { M.toast("回転中は切りかえられません"); return; }
        st.assist = +b.dataset.a; M.SFX.click(); paintAssist(); saveLux();
        M.toast(st.assist ? "アシストON：押せば必ず引き込みます" : "自力モード：4コマ以内に狙おう（外しても役は消えません）");
      };
    });
  }
  function paintLamps() {
    const b = heldBonus();
    const rose = document.getElementById("lxLampRose"), bigL = document.getElementById("lxLampBig"),
          dia = document.getElementById("lxLampDia");
    if (rose) rose.className = "lx-lamp rose" + (b === "reg" ? " on" : "");
    if (bigL) bigL.className = "lx-lamp" + (b === "big" || b === "prem" ? " on" : "");
    if (dia) dia.className = "lx-lamp" + (st.q.dia ? " on" : "");
    if (b) seeFx("lamp");
    const mc = document.getElementById("lxMachine");
    if (mc) mc.classList.toggle("hot", !!b && !st.bonus);
  }
  function paintBonusBox() {
    const v = document.getElementById("lxBonusV"); if (!v) return;
    v.textContent = st.bonus ? st.bonusLeft + "G" : "—";
    const box = document.getElementById("lxBonusBox");
    if (box) box.classList.toggle("full", !!st.bonus);
  }
  function paintGet() {
    const v = document.getElementById("lxGetV"); if (v) v.textContent = fmt(st.bonusWon);
  }
  function msg(html, cls) {
    const f = document.getElementById("lxMsg"); if (!f) return;
    f.innerHTML = html; f.className = "mjs-msg" + (cls ? " " + cls : "");
  }
  function seeFx(id) { st.fxSeen[id] = 1; }
  function saveLux() {
    M.S.lux = { flag: heldBonus(), dia: st.q.dia, assist: st.assist, q: st.q, fx: st.fxSeen };
    M.save();
  }
  async function banner(t, s, n, cls, ms) {
    const box = document.getElementById("lxBurst"); if (!box) return;
    document.getElementById("lxBurstT").textContent = t;
    document.getElementById("lxBurstS").textContent = s;
    document.getElementById("lxBurstN").textContent = n || "";
    box.className = "mjs-burst on" + (cls ? " " + cls : "");
    await M.sleep(ms || 1500);
    box.className = "mjs-burst";
  }
  function stepBet(d) {
    if (st.bonus) { M.toast("ボーナス中はベットを変えられません"); return; }
    const i = M.BETS.indexOf(st.bet);
    const n = Math.max(0, Math.min(M.BETS.length - 1, (i < 0 ? 1 : i) + d));
    st.bet = M.BETS[n]; M.SFX.chip(); paintBetV();
  }
  function toggleAuto() {
    if (!st) return;
    if (st.auto) { stopAuto(); return; }
    st.auto = true;
    const b = document.getElementById("lxAuto");
    b.classList.add("on"); b.innerHTML = "AUTO<br><i>ON</i>";
    M.SFX.click();
    if (st.spinning) autoStops();
    else if (!st.busy) go();
  }
  function stopAuto() {
    if (!st) return;
    st.auto = false;
    clearTimeout(st.timer); st.timer = 0;
    const b = document.getElementById("lxAuto");
    if (b) { b.classList.remove("on"); b.innerHTML = "AUTO<br><i>OFF</i>"; }
  }

  /* ══════════════════════════════════════════
     MENU（ボトムシート）
     ══════════════════════════════════════════ */
  function openMenu() {
    M.SFX.click();
    const ov = M.sheet({
      icon: "☰", title: "LUXURIA", ok: "とじる",
      html:
        '<div class="sh-hd2">ベット額（1ゲーム）</div>' +
        '<div class="mj-bets" id="lxBets"></div>' +
        '<div class="sh-hd2">見る</div>' +
        '<button class="sh-sw" data-m="pay"><span class="bd"><span class="t1">📋 配当表とスペック</span>' +
          '<span class="t2">役ごとの確率・配当・還元率</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="how"><span class="bd"><span class="t1">📖 あそびかた</span>' +
          '<span class="t2">目押しと持ち越しのしくみ</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="book"><span class="bd"><span class="t1">🎬 演出図鑑</span>' +
          '<span class="t2">見たことのある演出の期待度</span></span><span class="rt">›</span></button>' +
        '<button class="sh-sw" data-m="rtp"><span class="bd"><span class="t1">' + M.dayRtpInfo().ic +
          ' 本日の還元率</span><span class="t2">' + M.dayRtpInfo().nm + "・毎日 0:00 に変わります</span></span>" +
          '<span class="rt">' + M.dayRtpInfo().pct + "%</span></button>" +
        '<div class="sh-hd2">設定</div>' +
        '<button class="sh-sw' + (st.assist ? " on" : "") + '" data-m="assist"><span class="bd">' +
          '<span class="t1">🤝 アシスト（自動で目押し）</span>' +
          '<span class="t2">押した瞬間に狙いの図柄を引き込みます。<b>還元率は変わりません</b></span></span>' +
          '<span class="rt">' + (st.assist ? "ON" : "OFF") + "</span></button>" +
        '<button class="sh-sw' + (M.S.set.sound ? " on" : "") + '" data-m="sound"><span class="bd">' +
          '<span class="t1">🔊 効果音</span><span class="t2">リールと配当の音</span></span>' +
          '<span class="rt">' + (M.S.set.sound ? "ON" : "OFF") + "</span></button>" +
        '<button class="sh-sw' + (M.S.set.fast ? " on" : "") + '" data-m="fast"><span class="bd">' +
          '<span class="t1">⚡ 演出を早くする</span><span class="t2">カットインやバナーを短縮</span></span>' +
          '<span class="rt">' + (M.S.set.fast ? "ON" : "OFF") + "</span></button>",
    });
    if (!ov) return;
    paintChips(ov.querySelector("#lxBets"));
    ov.querySelectorAll("[data-m]").forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.m;
        if (k === "assist") { st.assist = st.assist ? 0 : 1; saveLux(); paintAssist(); M.SFX.click(); openMenu(); return; }
        if (k === "sound") { M.S.set.sound = !M.S.set.sound; M.save(); M.SFX.click(); openMenu(); return; }
        if (k === "fast")  { M.S.set.fast  = !M.S.set.fast;  M.save(); M.SFX.click(); openMenu(); return; }
        if (k === "pay")  { showPay(); return; }
        if (k === "how")  { showTutorial(); return; }
        if (k === "book") { openBook(); return; }
        if (k === "rtp")  { M.SFX.click(); M.rtpSheet(); return; }
      };
    });
  }

  function showPay() {
    M.SFX.click();
    const t = X.table();
    const rows = X.ROLES.map((r) => {
      const s = r.id === "prem" ? X.SYM.W1 : X.SYM[r.sym];
      const ic = s && s.img ? '<img src="' + s.img + '" alt="">' : '<span class="g">' + (s ? s.g : r.ic) + "</span>";
      return '<div class="sh-row"><span class="ic">' + ic + "</span>" +
        '<span class="nm">' + esc(r.nm) + "<small>" + esc(r.jp) +
          (r.bonus ? "・" + r.bonus + "ゲーム" : "") + "・1/" + Math.round(1 / r.p) + "</small></span>" +
        '<span class="pv">' + fmt(X.payOf(r.id, st.bet)) + "<br>×" + (Math.round(r.pay * X.ps() * 10) / 10) + "</span></div>";
    }).join("");
    M.sheet({
      icon: "📋", title: "配当表とスペック", ok: "とじる",
      html: rows +
        '<div class="sh-hd2">スペック</div>' +
        '<div class="sh-kv"><span>ライン</span><span>中段の1ライン</span></div>' +
        '<div class="sh-kv"><span>リール</span><span>3リール × ' + X.NCOMA + "コマ</span></div>" +
        '<div class="sh-kv"><span>引き込み</span><span>最大 ' + X.SLIP + "コマ</span></div>" +
        '<div class="sh-kv"><span>理論還元率（配当・本日）</span><span><b>' + Math.round(t.rtp * 1000) / 10 + "%</b></span></div>" +
        '<div class="sh-kv"><span>ジャックポット積立</span><span>' + Math.round(M.JP_RATE * 1000) / 10 + "%</span></div>" +
        '<div class="mj-note" style="margin-top:10px">' +
        "ベル・薔薇・チェリーは<b>4コマ以内に必ず1つ</b>並んでいるので、" +
        "どこで押しても引き込まれます（取りこぼしません）。<br>" +
        "セブン・BAR・魔女・ダイヤは目押しが要りますが、<b>一度成立した役はそろうまで消えません</b>。" +
        "だから<b>目押しの上手さで還元率は変わりません</b>。<br>" +
        "<b>" + M.dayRtpInfo().ic + " " + M.rtpLine() + "</b>——上の配当は<b>今日の金額</b>です" +
        "（毎日 0:00 に変わります／あと " + M.dayLeftText() + "）。<br>" +
        "配当 <b>" + Math.round(t.rtp * 1000) / 10 + "%</b> ＋ ジャックポット <b>" + Math.round(M.JP_RATE * 100) +
        "%</b> ＝ <b>" + M.dayRtpInfo().total + "%</b>（長い目で見た平均は 100%）。</div>",
    });
  }

  function showTutorial() {
    M.SFX.click();
    M.sheet({
      icon: "🌹", title: "LUXURIA のあそびかた", ok: "はじめる",
      html: '<div class="mj-note">' +
        "<b>運命を誘惑する、薔薇の祝福。</b><br>" +
        "お店にあるアレと同じ、<b>自分の手で止める3リール</b>です。<br><br>" +
        "① <b>START</b>（レバー）でベットしてリールが回りだします。<br>" +
        "② <b>STOP</b> を3つ、好きな順番・好きなタイミングで押します。<br>" +
        "③ <b>中段の1ライン</b>に図柄がそろえば配当。" +
        "🔔ベル・🌹薔薇・🍒チェリーは<b>どこで押しても勝手にそろいます</b>（取りこぼしなし）。<br>" +
        "④ 💎ダイヤ・BAR・7・魔女は<b>目押しが必要</b>。" +
        "でも<b>成立した役はそろうまで消えません</b>——外しても次のゲームに残ります。" +
        "台の下の<b>ランプ</b>が点いていたら「いま何かが成立中」の合図なので、狙いましょう。<br>" +
        "　※ ベルなどの小役が成立しているゲームは、<b>そちらが先に引き込まれます</b>" +
        "（実機でいう「小役に取られた」）。ボーナスは消えないので、損はしません。<br>" +
        "⑤ <b>7</b>で BIG BONUS、<b>BAR</b>で ROSE BONUS、<b>3人の魔女</b>で PREMIUM。" +
        "ボーナス中はベット不要、PUSH で出玉が増えていきます（⏩ で一気に受け取れます）。<br><br>" +
        "★ <b>目押しが苦手でも損しません。</b>" +
        "外しても役は消えないので、<b>還元率は腕に関係なく同じ</b>です。" +
        "自信がないうちは <b>アシスト</b>（自動で目押し）を ON のままで大丈夫。" +
        "慣れてきたら「自力」に切りかえて、狙って止める気持ちよさを試してください。" +
        "</div>",
    });
  }
  function openBook() {
    M.SFX.click();
    M.sheet({
      icon: "🎬", title: "演出図鑑", ok: "とじる",
      html: '<div class="mj-note" style="margin-bottom:9px">見たことのある演出だけ、期待度が開きます。</div>' +
        FX_BOOK.map((f) => {
          const got = !!st.fxSeen[f.id];
          return '<div class="sh-row' + (got ? "" : " lock") + '"><span class="ic"><span class="g">' +
            (got ? f.ic : "❓") + "</span></span>" +
            '<span class="nm">' + (got ? esc(f.nm) : "？？？") +
            "<small>" + (got ? esc(f.ds) : "まだ見ていません") + "</small></span>" +
            '<span class="pv">' + (got ? esc(f.rate) : "—") + "</span></div>";
        }).join(""),
    });
  }

  function unmount() {
    stopLoop(); stopAuto();
    window.removeEventListener("mj:wallet", paintBal);
    window.removeEventListener("mj:jackpot", paintJp);
    if (ro) { try { ro.disconnect(); } catch (e) {} ro = null; }
    if (st) { clearInterval(st.jpTimer); clearTimeout(st.timer); saveLux(); }
    M.slow(false);
    st = null;
  }

  window.MJLux = { mount, unmount, id: G, nm: "LUXURIA" };
})();

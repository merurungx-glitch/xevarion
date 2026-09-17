/* ══════════════════════════════════════════════════════════════
   MagiBocciaRush — 画面（v4・2026-09-17 全面刷新）
   ──────────────────────────────────────────────────────────────
   ★ 計算は mbr-core.js（window.MBR）、演出は mbr-fx.js（window.MBRFX）。ここは<b>見せかたと入力</b>。
   ★ 画面
       タイトル（TAP TO START）→ HOME ─┬ MATCH SELECT → 試合の設定 → 試合 → エンドの得点 → 結果・MVP
                                       ├ TEAM EDIT（3人の順番）
                                       ├ CHARACTER（一覧）→ キャラ詳細（能力・スキル・ボール・ボイス・ストーリー）
                                       ├ PROFILE（戦績・称号・リプレイ）／ RANKING
                                       └ PRIVATE ROOM（オンライン）／ RULE BOOK ／ TUTORIAL ／ SETTINGS
   ★ ボタンは onclick の文字列を書かず、<b>data-a="動作" data-v="値"</b> を1か所（act）で受ける。
     （引用符の入れ子で壊れる事故を起こさないため）
   ★ 引っぱって離す操作は<b>モンスト式</b>：引いた向きの<b>反対</b>へ飛ぶ／引いた長さが強さ。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const B = window.MBR, FX = window.MBRFX;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const C = B.COURT;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ══════════ 言葉 ══════════ */
  function lang() { try { return localStorage.getItem("xeva_lang_v1") === "en" ? "en" : "ja"; } catch (e) { return "ja"; } }
  const en = () => lang() === "en";
  function L(o) { return typeof o === "string" ? o : (o && (en() ? o.en : o.ja)) || (o && o.ja) || ""; }
  const J = (ja, e) => (en() ? e : ja);

  /* ══════════ 状態 ══════════ */
  let ROSTER = [], OWN = new Set(), TRIAL = false;
  let cur = "home", prev = "home", detailId = "";
  let M = null, raf = 0, lastTs = 0;
  let aim = null, slot = 2, busy = false, thinking = false, hold = false;
  let sel = { special: "", active: false, ult: false };
  let lastGuide = null, pendingCfg = null, shownTurn = "";
  let trail = [];
  let predCache = null, predKey = "";
  let tut = null;
  let online = null;           /* { me, side, host, code, ok } */
  let endPending = false;      /* エンドの得点を見せている間（オンラインの投球はこの間待たせる） */
  let pendingStage = null, stageAnim = false, stageFx = [];   /* ★ 2026-09-17d BOSS STAGE */

  /* ══════════ キャラ ══════════ */
  function ownedIds() {
    try {
      const db = JSON.parse(localStorage.getItem("magiburst_v1") || "null");
      return db && db.chars ? Object.keys(db.chars) : [];
    } catch (e) { return []; }
  }
  function loadRoster() {
    const all = B.buildRoster();
    OWN = new Set(ownedIds());
    ROSTER = all.filter((c) => OWN.has(c.id));
    TRIAL = !ROSTER.length;
    /* ★ 1体も持っていなくても遊べるように、型がばらけるよう6体を「体験」で貸す */
    if (TRIAL) {
      const seen = {};
      all.forEach((c) => { if (ROSTER.length < 6 && !seen[c.type]) { seen[c.type] = 1; ROSTER.push(c); } });
    }
    return ROSTER;
  }
  const charOf = (id) => B.charOf(id);
  const img = (c) => (c ? FX.imgPath(c) : "");
  const imgFull = (c) => (c ? FX.imgPath(c, true) : "");
  /* ★★ 2026-09-17b 1エンドに6球投げるので、<b>編成は6体</b>（ご指定）。1人1球ずつ順番に投げる。 */
  const LINEUP_N = 6;
  function fillLineup(L0, pool) {
    L0 = (L0 || []).filter((id, i, a) => a.indexOf(id) === i && pool.some((c) => c.id === id)).slice(0, LINEUP_N);
    if (L0.length < LINEUP_N) {
      /* 足りない枠は「守り→崩し→仕上げ」×2 になるよう型で埋める */
      const want = ["defense", "power", "technique", "jack", "bounce", "support", "trick"];
      want.forEach((ty) => {
        if (L0.length >= LINEUP_N) return;
        const c = pool.find((x) => x.type === ty && L0.indexOf(x.id) < 0);
        if (c) L0.push(c.id);
      });
      pool.forEach((c) => { if (L0.length < LINEUP_N && L0.indexOf(c.id) < 0) L0.push(c.id); });
    }
    return L0.slice(0, LINEUP_N);
  }
  function myLineup() { return fillLineup(B.load().lineup, ROSTER); }
  function levelsOf(ids) {
    const o = {};
    ids.forEach((id) => { o[id] = B.charProg(id).lv; });
    return o;
  }
  /* ★★ 2026-09-17e MagiBurst の凸（magiburst_v1 の chars[id].awk）。持っていない子は 0 */
  function awkOne(id) {
    try {
      const db = JSON.parse(localStorage.getItem("magiburst_v1") || "null");
      const c = db && db.chars && db.chars[id];
      return c ? B.awkBonus(c.awk) : 0;
    } catch (e) { return 0; }
  }
  function awksOf(ids) {
    const o = {};
    ids.forEach((id) => { const a = awkOne(id); if (a) o[id] = a; });
    return o;
  }
  /* ★★ 2026-09-17f 凸の表示（MagiBurst の図鑑と同じ「限界突破+n／👑限界突破MAX」のピル）。
     完凸の SSR には MagiBurst と同じ<b>金の脈動＋斜めのシャイン</b>（.mx）。SR には付けない（MagiBurst と同じ）。 */
  /* short … 編成の小さな枠用（👑MAX／凸n） */
  function awkTag(aw, short) {
    if (!aw) return "";
    return '<span class="awk' + (aw >= B.AWK_MAX ? " mx" : "") + '">'
      + (aw >= B.AWK_MAX ? (short ? "👑MAX" : J("👑限界突破MAX", "👑MAX")) : (short ? J("凸", "+") + aw : J("限界突破+", "Awaken +") + aw)) + "</span>";
  }
  function mxCls(c, aw) { return c && c.star5 && aw >= B.AWK_MAX ? " mx" : ""; }
  /* ★★ 2026-09-17f 1台対戦（FRIEND MATCH）の<b>育成状況</b>（ご指定）。
     none＝育成なし（Lv1・凸なし）／ mine＝この端末の育成（熟練度 Lv と MagiBurst の凸）／ max＝最大（Lv20・完凸）。
     1P・2P で別々にえらべる。最後にえらんだものは mbr_v1.friendTrain に残す。 */
  const TRAIN_OPTS = () => [["none", J("育成なし", "None")], ["mine", J("この端末の育成", "This device")], ["max", J("最大", "Max")]];
  function trainLv(mode, ids) {
    if (mode === "none") return {};
    if (mode === "max") { const o = {}; ids.forEach((id) => { o[id] = B.LV_MAX; }); return o; }
    return levelsOf(ids);
  }
  function trainAw(mode, ids) {
    if (mode === "none") return {};
    if (mode === "max") { const o = {}; ids.forEach((id) => { o[id] = B.AWK_MAX; }); return o; }
    return awksOf(ids);
  }
  function trainAwOne(mode, id) { return mode === "none" ? 0 : mode === "max" ? B.AWK_MAX : awkOne(id); }
  /* ★★ 2026-09-17f 「育成の反映」の補足（？を押すと開く）。試合の設定と SETTINGS の両方で使う */
  let growHelpOpen = false;
  function growthHelpHTML() {
    return '<div class="ghelp note"' + (growHelpOpen ? "" : " hidden") + ">"
      + J("<b>育成の反映</b>＝キャラクターの6能力に上乗せされる補正です。<br>"
          + "・<b>熟練度レベル</b>：5レベルごとに全能力 +1（Lv5で+1・Lv10で+2・Lv15で+3、<b>最大+3</b>）<br>"
          + "・<b>凸</b>（MagiBurst の限界突破）：1つごとに全能力 +1（完凸で<b>+4</b>）<br>"
          + "・2つを合わせて<b>最大 +7</b>。能力の上限は 95 です。<br><br>"
          + "<b>性能統一</b>：補正なし。全員が素の能力（合計396）で戦います。<br>"
          + "<b>+1まで</b>：レベルと凸を合わせても +1 まで（育てた子が少しだけ有利）。<br>"
          + "<b>そのまま</b>：レベル＋凸をすべて反映（最大+7）。<br>"
          + "※ ランクマッチとオンライン対戦はいつも性能統一です。",
          "<b>Training bonus</b> is added to all six stats.<br>"
          + "· <b>Mastery level</b>: +1 every 5 levels (Lv5 +1, Lv10 +2, Lv15 +3, <b>max +3</b>)<br>"
          + "· <b>Awakening</b> (MagiBurst): +1 per awakening (<b>+4</b> when maxed)<br>"
          + "· Up to <b>+7</b> combined. Stats cap at 95.<br><br>"
          + "<b>Unified</b>: no bonus, everyone uses base stats (total 396).<br>"
          + "<b>Cap +1</b>: level and awakening together give at most +1.<br>"
          + "<b>Full</b>: the whole bonus (up to +7).<br>"
          + "Ranked and online matches always use unified stats.")
      + "</div>";
  }
  const qBtn = () => '<button class="qh" data-a="growhelp" aria-label="?">?</button>';
  function skinOf(id) {
    const p = B.charProg(id), c = charOf(id);
    if (!c) return "std";
    const sk = B.skinsOf(c, p.lv).find((x) => x.k === p.ball);
    return sk && sk.open ? sk.k : "std";
  }

  /* ══════════ 画面のきりかえ ══════════ */
  function go(id, arg) {
    if (id !== cur) prev = cur;
    cur = id;
    if (id === "detail") detailId = arg || detailId;
    $$(".scr").forEach((s) => s.classList.toggle("on", s.id === "s-" + id));
    const navKey = { detail: "chars", ranking: "profile", room: "play", stages: "play", match: "" }[id];
    $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === (navKey != null ? navKey : id)));
    document.body.classList.toggle("inmatch", id === "match");
    if (id !== "match") window.scrollTo(0, 0);
    const R = { home: renderHome, play: renderPlay, team: renderTeam, chars: renderChars, detail: renderDetail,
                profile: renderProfile, ranking: renderRanking, room: renderRoom, stages: renderStages };
    if (R[id]) R[id]();
    paintTop();
  }

  /* ══════════ 共通の部品 ══════════ */
  function ttl(e, j) { return '<div class="ttl"><div class="e">' + esc(e) + '</div><div class="j">' + esc(j) + "</div></div>"; }
  function hd(e, j, more) { return '<div class="hd">' + esc(e) + (j ? "<small>" + esc(j) + "</small>" : "") + (more || "") + "</div>"; }
  function typeTag(c) { const ty = B.TYPES[c.type]; return '<span class="tag" style="background:' + ty.c + ';color:#000">' + ty.ja + "</span>"; }
  function statRows(st, mainK, weakK) {
    return '<div class="stats">' + B.STAT_KEYS.map((k) => {
      const v = st[k];
      const cls = k === mainK ? "hi" : k === weakK ? "lo" : "";
      return '<div class="k">' + B.STAT_NM[k].en + "<small>" + esc(en() ? "" : B.STAT_NM[k].ja) + "</small></div>"
        + '<div class="bar"><i class="' + cls + '" style="width:' + Math.round((v - 20) / 80 * 100) + '%"></i></div>'
        + '<div class="v">' + v + "</div>";
    }).join("") + "</div>";
  }
  function radar(st, col) {
    const K = B.STAT_KEYS, n = K.length, cx = 140, cy = 118, R = 92;
    const pt = (i, v) => { const a = -Math.PI / 2 + i * Math.PI * 2 / n; const r = R * clamp((v - 30) / 65, 0, 1); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    let grid = "";
    [0.33, 0.66, 1].forEach((f) => {
      grid += '<polygon points="' + K.map((k, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / n; return (cx + Math.cos(a) * R * f).toFixed(1) + "," + (cy + Math.sin(a) * R * f).toFixed(1); }).join(" ")
        + '" fill="none" stroke="rgba(255,255,255,.14)"/>';
    });
    const poly = K.map((k, i) => pt(i, st[k]).map((v) => v.toFixed(1)).join(",")).join(" ");
    const labels = K.map((k, i) => {
      const a = -Math.PI / 2 + i * Math.PI * 2 / n;
      const x = cx + Math.cos(a) * (R + 20), y = cy + Math.sin(a) * (R + 14) + 4;
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle" font-family="Anton,Orbitron,sans-serif" font-style="italic" font-size="11" fill="#fff">'
        + B.STAT_NM[k].en.replace("SKILL ", "") + " " + st[k] + "</text>";
    }).join("");
    return '<svg class="radar" viewBox="0 0 280 236">' + grid
      + '<polygon points="' + poly + '" fill="' + (col || "#e8173a") + '55" stroke="' + (col || "#e8173a") + '" stroke-width="2.5"/>' + labels + "</svg>";
  }
  function open(html, noClose) {
    $("#ovc").innerHTML = (noClose ? "" : '<button class="ovx" data-a="close">✕</button>') + html;
    $("#ov").classList.add("on");
    $("#ovc").scrollTop = 0;
  }
  function close() { $("#ov").classList.remove("on"); $("#ovc").innerHTML = ""; }
  function toast(tx) {
    const e = $("#toast");
    if (!e) return;
    e.textContent = tx; e.style.opacity = "1";
    clearTimeout(e._t); e._t = setTimeout(() => { e.style.opacity = "0"; }, 2300);
  }
  function accName() {
    try { const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); if (a && a.name) return a.name; } catch (e) {}
    return "PLAYER";
  }

  /* ══════════════════════════════════════════════════════════════
     ① ホーム
     ══════════════════════════════════════════════════════════════ */
  function renderHome() {
    const s = B.load();
    const r = B.rankOf(s.rp), nx = B.nextRank(s.rp);
    const lu = myLineup().map(charOf).filter(Boolean);
    /* ★★ 2026-09-17e ホームの大きな絵は<b>アカツキ固定</b>（ご指定。もとは編成の1番手＝ルナ）。
       アカツキが読めない環境だけ編成の1番手にもどす。 */
    const lead = charOf("akatsuki") || lu[0];
    const tile = (a, v, e, j, cls, ic, bdg) => '<button class="tile ' + (cls || "") + '" data-a="' + a + '" data-v="' + (v || "") + '">'
      + (bdg ? '<span class="bdg">' + esc(bdg) + "</span>" : "")
      + '<span class="e">' + esc(e) + '</span><span class="j">' + esc(j) + "</span>" + (ic ? '<span class="ic">' + ic + "</span>" : "") + "</button>";
    $("#s-home").innerHTML = ''
      + '<div class="hero">' + (lead ? '<img class="art" src="' + esc(imgFull(lead)) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(img(lead)) + '\'">' : "")
      + '<div class="slash"></div><div class="tx"><div class="m">Magi</div><div class="s">BOCCIA RUSH</div>'
      + '<div class="p">' + J("本格ボッチャ × 引っぱりショット × キャラクター固有能力", "Real boccia × pull shots × character powers") + "</div></div>"
      + (lead ? '<div class="who">' + esc(lead.nm) + "</div>" : "") + "</div>"
      + (s.suspend ? '<div class="pn red" style="display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div class="en" style="font-size:20px">SUSPENDED MATCH</div>'
          + '<div class="note">' + esc(kindName(s.suspend.kind)) + " ・ " + new Date(s.suspend.at).toLocaleString() + "</div></div>"
          + '<button class="btn sm pri" data-a="resume">RESUME</button><button class="btn sm gh" data-a="discard">✕</button></div>' : "")
      + '<div class="tiles">'
      + tile("go", "play", "PLAY", J("プレイ ─ 試合をえらぶ", "Choose a match"), "big", "▶")
      + tile("setup", "quick", "QUICK MATCH", J("すぐに対戦", "Jump in"), "red", "⚡")
      + tile("soon", "", "RANKED", J("ランクマッチ", "Ranked"), "soon", "♛", J("準備中", "SOON"))
      + tile("soon", "", "TEAM MATCH", J("チーム対戦", "Team match"), "soon", "👥", J("準備中", "SOON"))
      + tile("setup", "friend", "FRIEND MATCH", J("1台で友達と", "Same device"), "", "🤝")
      + tile("go", "room", "PRIVATE ROOM", J("ルームコードでオンライン", "Online room code"), "", "🔑")
      + tile("setup", "practice", "PRACTICE", J("練習モード", "Free practice"), "wh", "◎")
      + "</div>"
      + hd("TEAM", J("編成（投げる順番・6体）", "Lineup order (6)"), '<span class="more" data-a="go" data-v="team">' + J("編成する ›", "Edit ›") + "</span>")
      + '<div class="lineup mini">' + [0, 1, 2, 3, 4, 5].map((i) => slotHTML(lu[i], i, "go", "team", lu[i] && awkOne(lu[i].id))).join("") + "</div>"
      + (TRIAL ? '<div class="pn tight" style="margin-top:8px"><div class="note">' + J("まだキャラクターを持っていないので、<b>体験用の6体</b>で遊べます。XEVARION のガチャで仲間にすると、その子がここに並びます。",
          "You don't own any characters yet, so <b>6 trial characters</b> are available. Pull in the XEVARION gacha to add your own.") + "</div></div>" : "")
      + hd("RANK", J("ランク", "Your rank"), '<span class="more" data-a="go" data-v="ranking">RANKING ›</span>')
      + '<div class="pn"><div style="display:flex;align-items:center;gap:12px"><div class="en" style="font-size:30px;color:' + r.c + '">' + r.ja + "</div>"
      + '<div style="margin-left:auto;text-align:right"><div class="en" style="font-size:26px">' + s.rp + '</div><div class="note">RP</div></div></div>'
      + (nx ? '<div class="mast" style="margin-top:8px"><div class="bar"><i style="width:' + Math.round(clamp((s.rp - r.need) / (nx.need - r.need), 0, 1) * 100) + '%"></i></div>'
        + '<div class="note">' + J("次 ", "Next ") + nx.ja + " " + (nx.need - s.rp) + "RP</div></div>" : "") + "</div>"
      + '<div class="tiles" style="margin-top:4px">'
      + tile("rule", "", "RULE BOOK", J("ルールブック", "Learn the rules"), "", "📖")
      + tile("tutorial", "", "TUTORIAL", J("チュートリアル", "Guided lesson"), "", "🎓")
      + tile("gacha", "", "GACHA", J("XEVARION のガチャ", "XEVARION gacha"), "", "✦")
      + tile("settings", "", "SETTINGS", J("設定", "Settings"), "", "⚙")
      + "</div>";
  }
  /* ★ aw（凸の数）を渡したときだけ凸を出す（CPU の編成には渡さない） */
  function slotHTML(c, i, a, v, aw) {
    if (!c) return '<button class="lslot empty" data-a="' + a + '" data-v="' + v + '">＋</button>';
    const ty = B.TYPES[c.type];
    return '<button class="lslot' + mxCls(c, aw) + '" data-a="' + a + '" data-v="' + v + '"><img src="' + esc(img(c)) + '" alt="" loading="lazy">'
      + '<span class="no">' + (i + 1) + '</span><span class="ty" style="background:' + ty.c + '">' + ty.ja + "</span>"
      + awkTag(aw, true) + '<span class="nm">' + esc(c.nm) + "</span></button>";
  }

  /* ══════════════════════════════════════════════════════════════
     ② マッチ選択
     ══════════════════════════════════════════════════════════════ */
  function renderPlay() {
    /* ★★ 2026-09-17b 背景のキャラは<b>いちばん新しいキャラ</b>から順に（ご指定）。キャラが増えれば自動で入れかわる。 */
    /* ★★ 2026-09-17e <b>QUICK MATCH＝カナ・BOSS STAGE＝マキは固定</b>（ご指定）。それ以外は新しいキャラから順に。
       固定の2体は「新しいキャラ」の列からは外す（同じ子が2回並ばないように）。
       ★ i に文字列（キャラ id）を渡すと、その子を固定で出す。 */
    const FIXED = ["kana", "maki"];
    const fresh = B.buildRoster().filter((c) => FIXED.indexOf(c.id) < 0).slice(-8).reverse();
    const im = (i) => {
      if (typeof i === "string") { const c = charOf(i); return c ? '<img src="' + esc(img(c)) + '" alt="" loading="lazy">' : ""; }
      return fresh[i % Math.max(1, fresh.length)] ? '<img src="' + esc(img(fresh[i % fresh.length])) + '" alt="" loading="lazy">' : "";
    };
    const md = (a, v, e, j, d, cls, i) => '<button class="mode ' + (cls || "") + '" data-a="' + a + '" data-v="' + v + '">' + im(i || 0)
      + (/soon/.test(cls || "") ? '<span class="bdg">' + J("準備中", "SOON") + "</span>" : "")
      + '<span class="e">' + esc(e) + '</span><span class="j">' + esc(j) + '</span><span class="d">' + esc(d) + "</span></button>";
    $("#s-play").innerHTML = ttl("MATCH SELECT", J("プレイするモードを選択してください", "Choose a mode"))
      + '<div class="modes">'
      + md("setup", "quick", "QUICK MATCH", J("クイックマッチ", "Quick match"), J("オンラインで相手をさがす（いなければCPU）", "Online first, CPU if nobody is around"), "hot full", "kana")
      + md("go", "stages", "BOSS STAGE", J("ボスステージ", "Boss stages"), J("5ステージ×難易度3つ・初回クリアでジェム", "5 stages × 3 difficulties · gems on first clear"), "full stagemode", "maki")
      + md("soon", "", "RANKED MATCH", J("ランクマッチ", "Ranked"), J("準備中です", "Coming soon"), "soon", 1)
      + md("setup", "friend", "FRIEND MATCH", J("フレンド対戦", "Friend match"), J("1台で交代・全キャラから編成", "Pass the device, any character"), "", 2)
      + md("soon", "", "TEAM MATCH", J("チーム対戦", "Team match"), J("準備中です", "Coming soon"), "soon", 3)
      + md("go", "room", "PRIVATE ROOM", J("プライベートルーム", "Private room"), J("ルームコードでオンライン", "Online with a room code"), "", 4)
      + md("setup", "cpu", "CPU MATCH", J("CPU対戦", "CPU match"), "EASY 〜 MASTER", "", 5)
      + md("setup", "practice", "PRACTICE", J("練習モード", "Practice"), J("得点なしで自由に投げる", "Free throws, no score"), "", 6)
      + md("tutorial", "", "TUTORIAL", J("チュートリアル", "Tutorial"), J("投げながら覚える7ステップ", "Learn by throwing"), "", 7)
      + "</div>"
      + '<div class="pn tight" style="margin-top:10px"><div class="note">'
      + J("<b>キャラクター能力モード</b>＝特殊ショット・スキル・アルティメットあり。<br><b>ルール準拠モード</b>＝スキルなし・能力の効き1/3で腕前勝負。どちらもコートの壁で反射します。",
          "<b>Ability mode</b>: special shots, skills and ultimates.<br><b>Rules mode</b>: no skills, stats at 1/3 — pure skill. Both modes bounce off the rails.")
      + "</div></div>";
  }
  const DIFF = [["easy", "EASY"], ["normal", "NORMAL"], ["hard", "HARD"], ["expert", "EXPERT"], ["master", "MASTER"]];
  const RANK_DIFF = { bronze: "normal", silver: "normal", gold: "hard", platinum: "hard", diamond: "expert", master: "master", grand: "master" };
  function kindName(k) {
    return { quick: "QUICK MATCH", ranked: "RANKED MATCH", friend: "FRIEND MATCH", team: "TEAM MATCH", cpu: "CPU MATCH", practice: "PRACTICE", online: "ONLINE" }[k] || k;
  }
  function setup(kind) {
    const s = B.load();
    pendingCfg = {
      kind, difficulty: kind === "ranked" ? RANK_DIFF[B.rankOf(s.rp).k] : (s.lastDiff || "normal"),
      ends: kind === "practice" ? 1 : 4, vs: kind === "team" ? 2 : 1, cpuFill: true,
      rules: kind === "ranked" ? "rules" : (s.rules || "ability"),
      growth: kind === "ranked" ? "unify" : (s.growth || "full"),
      rival: B.rivalLineup((Date.now() ^ 0x5bd1e995) >>> 0, LINEUP_N),
    };
    /* ★★ 2026-09-17b 1台で友達と遊ぶときは<b>全キャラ</b>から両チームを編成できる（ご指定） */
    if (kind === "friend") {
      const all = B.buildRoster();
      pendingCfg.redLineup = fillLineup(s.friendRed && s.friendRed.length ? s.friendRed : myLineup(), all);
      pendingCfg.rival = fillLineup(s.friendBlue && s.friendBlue.length ? s.friendBlue : pendingCfg.rival, all);
      const ft = s.friendTrain || {};
      pendingCfg.trainRed = ft.red || "mine";
      pendingCfg.trainBlue = ft.blue || "mine";
    }
    if (kind === "quick" && window.MBROnline && navigator.onLine) {
      pendingCfg.tryOnline = true;
    }
    drawSetup();
  }
  function drawSetup() {
    const p = pendingCfg;
    const segBtns = (key, list) => '<div class="seg">' + list.map((d) => '<button class="' + (String(p[key]) === String(d[0]) ? "on" : "")
      + '" data-a="cfg" data-v="' + key + ":" + d[0] + '">' + esc(d[1]) + "</button>").join("") + "</div>";
    const lu = myLineup().map(charOf).filter(Boolean);
    const rv = (p.rival || []).map(charOf).filter(Boolean);
    let h = ttl(kindName(p.kind), J("試合の設定", "Match settings"));
    if (p.kind === "quick" && p.tryOnline) {
      h += '<div class="pn red tight"><div class="note">' + J("オンラインで対戦相手をさがします。<b>10秒</b>見つからなければ CPU との対戦に切りかえます。", "We'll look for an online opponent for <b>10s</b>, then fall back to a CPU match.") + "</div></div>";
    }
    if (p.kind !== "friend" && p.kind !== "practice") {
      h += '<div class="pn tight"><div class="note" style="margin-bottom:6px"><b>' + J("CPU の強さ", "CPU level") + "</b>"
        + (p.kind === "ranked" ? J("（ランクで自動）", " (set by rank)") : "") + "</div>"
        + (p.kind === "ranked" ? '<div class="en" style="font-size:20px">' + p.difficulty.toUpperCase() + "</div>" : segBtns("difficulty", DIFF)) + "</div>";
    }
    if (p.kind === "team") {
      h += '<div class="pn tight"><div class="note" style="margin-bottom:6px"><b>' + J("人数", "Players per side") + "</b></div>"
        + segBtns("vs", [[2, "2 vs 2"], [3, "3 vs 3"]])
        + '<div class="sw"><div class="k">' + J("CPU補充", "CPU fill") + "<small>" + J("相手チームをCPUにする（OFFなら全員を1台で交代）", "Opponents are CPU (OFF = everyone shares this device)") + "</small></div>"
        + '<button class="btn sm ' + (p.cpuFill ? "pri" : "gh") + '" data-a="cfg" data-v="cpuFill:' + (!p.cpuFill) + '">' + (p.cpuFill ? "ON" : "OFF") + "</button></div></div>";
    }
    if (p.kind !== "practice") {
      h += '<div class="pn tight"><div class="note" style="margin-bottom:6px"><b>' + J("エンド数", "Ends") + "</b></div>" + segBtns("ends", [[2, "2"], [4, "4"], [6, "6"]]) + "</div>";
    }
    h += '<div class="pn tight"><div class="note" style="margin-bottom:6px"><b>' + J("モード", "Mode") + "</b></div>"
      + (p.kind === "ranked" ? '<div class="en" style="font-size:18px">RULES MODE</div>'
        : segBtns("rules", [["ability", J("キャラクター能力", "Ability")], ["rules", J("ルール準拠", "Rules")]]))
      + '<div class="note" style="margin-top:6px">' + (p.rules === "rules"
        ? J("スキルなし・能力の効き 1/3（壁では反射します）。", "No skills, stats at 1/3 (rails still bounce).")
        : J("特殊ショット・スキル・アルティメットあり（壁で反射）。", "Specials, skills and ultimates (rails bounce).")) + "</div>";
    if (p.kind !== "ranked") {
      h += '<div class="note" style="margin:10px 0 6px;display:flex;align-items:center;gap:6px"><b>' + J("育成の反映", "Training bonus") + "</b>" + qBtn() + "</div>"
        + growthHelpHTML()
        + segBtns("growth", [["unify", J("性能統一", "Unified")], ["cap", J("+1まで", "Cap +1")], ["full", J("そのまま(最大+7)", "Full (up to +7)")]]);
      if (p.kind === "friend") {
        h += '<div class="note" style="margin:10px 0 6px"><b>' + J("1P の育成状況", "Player 1 training") + "</b></div>" + segBtns("trainRed", TRAIN_OPTS())
          + '<div class="note" style="margin:8px 0 6px"><b>' + J("2P の育成状況", "Player 2 training") + "</b></div>" + segBtns("trainBlue", TRAIN_OPTS())
          + '<div class="note" style="margin-top:6px">' + J("<b>育成なし</b>＝Lv1・凸なし／<b>この端末の育成</b>＝この端末の熟練度と MagiBurst の凸／<b>最大</b>＝Lv20・完凸。どれも上の「育成の反映」の範囲で効きます。",
            "<b>None</b> = Lv1, no awakening / <b>This device</b> = this device's mastery and MagiBurst awakening / <b>Max</b> = Lv20, max awakening. Applied within the training bonus above.") + "</div>";
      }
    } else {
      h += '<div class="note" style="margin-top:6px">' + J("ランクマッチは<b>性能統一</b>（育成の補正なし）。", "Ranked uses <b>unified stats</b>.") + "</div>";
    }
    h += "</div>";
    const six = [0, 1, 2, 3, 4, 5];
    if (p.kind === "friend") {
      const rl = (p.redLineup || []).map(charOf).filter(Boolean);
      h += hd("RED", J("1Pの編成（タップで変更）", "Player 1 (tap to change)"))
        + '<div class="lineup mini">' + six.map((i) => slotHTML(rl[i], i, "fpick", "red:" + i, rl[i] && trainAwOne(p.trainRed, rl[i].id))).join("") + "</div>"
        + hd("BLUE", J("2Pの編成（タップで変更）", "Player 2 (tap to change)"), '<span class="more" data-a="reroll">' + J("おまかせ ↻", "Random ↻") + "</span>")
        + '<div class="lineup mini">' + six.map((i) => slotHTML(rv[i], i, "fpick", "blue:" + i, rv[i] && trainAwOne(p.trainBlue, rv[i].id))).join("") + "</div>";
    } else {
      h += hd("RED", J("あなたの編成", "Your lineup"), '<span class="more" data-a="toteam">' + J("編成する ›", "Edit ›") + "</span>")
        + '<div class="lineup mini">' + six.map((i) => slotHTML(lu[i], i, "toteam", "", lu[i] && awkOne(lu[i].id))).join("") + "</div>";
      if (p.kind !== "practice") {
        h += hd("BLUE", J("相手の編成", "Opponent"), '<span class="more" data-a="reroll">' + J("入れかえ ↻", "Shuffle ↻") + "</span>")
          + '<div class="lineup mini">' + six.map((i) => slotHTML(rv[i], i, "reroll", "")).join("") + "</div>";
      }
    }
    h += '<button class="btn pri" style="margin-top:14px" data-a="start">START</button>';
    open(h);
  }

  /* ══════════════════════════════════════════════════════════════
     ③ 編成（TEAM EDIT）
     ══════════════════════════════════════════════════════════════ */
  function renderTeam() {
    const lu = myLineup();
    const cs = lu.map(charOf).filter(Boolean);
    const sum = {};
    B.STAT_KEYS.forEach((k) => { sum[k] = cs.length ? Math.round(cs.reduce((a, c) => a + c.st[k], 0) / cs.length) : 0; });
    const tips = teamTips(cs);
    $("#s-team").innerHTML = ttl("TEAM EDIT", J("投げる順番がそのまま作戦になります", "Your throwing order is your tactic"))
      + '<div class="lineup">' + [0, 1, 2, 3, 4, 5].map((i) => slotHTML(cs[i], i, "pickslot", String(i), cs[i] && awkOne(cs[i].id))).join("") + "</div>"
      + '<div class="note" style="margin:6px 0 2px">' + J("枠をタップすると、<b>検索・絞り込み・キャラ詳細</b>つきで選べます。", "Tap a slot to pick with <b>search, filters and details</b>.") + "</div>"
      + '<div class="swaps">' + [0, 1, 2, 3, 4].map((i) => '<button class="btn sm gh" data-a="swapslot" data-v="' + i + '">' + (i + 1) + "⇄" + (i + 2) + "</button>").join("") + "</div>"
      + '<button class="btn sm" style="width:100%;margin-top:6px" data-a="autoteam">' + J("おすすめ編成", "Auto build") + "</button>"
      + hd("BALANCE", J("チームの平均", "Team average"))
      + '<div class="pn">' + radar(sum) + "</div>"
      + hd("ORDER TIPS", J("順番のコツ", "Order tips"))
      + '<div class="pn">' + tips.map((t) => '<div class="note" style="margin-bottom:5px">・' + t + "</div>").join("") + "</div>"
      + hd("ROTATION", J("1エンドの流れ（6投＝6体が1球ずつ）", "One end (each of 6 throws once)"))
      + '<div class="pn tight"><div class="note">' + [0, 1, 2, 3, 4, 5].map((i) => {
          const c = cs[i];
          return (i + 1) + J("投目 ", ". ") + "<b>" + esc(c ? c.nm : "—") + "</b>" + (c ? "（" + B.TYPES[c.type].ja + "）" : "");
        }).join("<br>") + "</div></div>";
  }
  function teamTips(cs) {
    const t = [];
    if (!cs.length) return [J("キャラクターをえらんでください。", "Pick characters.")];
    const ty = cs.map((c) => c.type);
    if (ty[0] === "defense" || ty[0] === "technique") t.push(J("1人目が<b>置き・守り</b>型なので、最初にジャックのそばへ安全に置けます。", "Your opener <b>places and guards</b> — a safe start near the jack."));
    else if (ty[0] === "power") t.push(J("1人目が<b>POWER</b>型。まだ崩す相手がいない序盤は、弱めに置くのがコツです。", "Opening with <b>POWER</b>: throw softly early — there's nothing to break yet."));
    if (ty.indexOf("power") > 0) t.push(J("<b>POWER</b>を中盤に置くと、相手が寄せてきたボールを弾き出せます。", "<b>POWER</b> mid-order knocks out the balls your opponent just placed."));
    const last = ty[ty.length - 1];
    if (last === "technique" || last === "jack") t.push(J("最後が<b>" + B.TYPES[last].ja + "</b>型。仕上げの1投でジャックを取りに行けます。", "Closing with <b>" + B.TYPES[last].ja + "</b> lets you finish on the jack."));
    if (ty.indexOf("support") >= 0) t.push(J("<b>SUPPORT</b>型は次の味方にゲージを渡せます。ULT を撃たせたい子の<b>直前</b>に。", "Put <b>SUPPORT</b> right <b>before</b> the teammate who should fire an ULT."));
    if (ty.indexOf("bounce") >= 0) t.push(J("<b>BOUNCE</b>型は壁を使ったバンクショットで、正面をふさがれても回りこめます。", "<b>BOUNCE</b> can bank around a blocked lane."));
    const set = new Set(ty);
    if (set.size === 1) t.push(J("同じ型だけだと対策されやすいです。1人ちがう型を入れてみましょう。", "One type only is easy to counter — mix in another."));
    if (!t.length) t.push(J("守り→崩し→仕上げ、の順にすると安定します。", "Guard → break → finish is a stable order."));
    return t;
  }

  /* ══════════════════════════════════════════════════════════════
     ④ キャラクター一覧
     ══════════════════════════════════════════════════════════════ */
  /* ══ 検索・並び替え・絞り込み（★ 2026-09-17c MagiBurst と同じ形に・ご指定）══
     scope … "chars"（キャラクター一覧）／ "pick"（キャラをえらぶシート）
     ・検索ボックスは入力中に作り直さない（IME 対策）。作り直すのはリストだけ。
     ・並び替えは<b>画面の中に開くパネル</b>＋「▼通常／▲逆順」。
     ・絞り込みは<b>全画面のシート</b>（選んだ条件・枠ごとの開閉・下に「解除」「この条件で見る（該当 N 体）」）。
       特殊ショットだけは「選んだものを<b>すべて</b>持つ」、ほかの枠は複数えらぶと「どれか」。 */
  const FS = {
    chars: { q: "", qmode: "name", sort: "no", desc: false, keys: [] },
    pick:  { q: "", qmode: "name", sort: "no", desc: false, keys: [] },
  };
  let fsSortOpen = "", fsSheet = "";
  const fsGrpOpen = { "el:": 1, "rar:": 1, "type:": 1 };
  const EL_ORDER = ["fire", "water", "wood", "light", "dark"];
  let charsY = null, pickY = null, pickN = 0;
  function ownedC(c) { return OWN.has(c.id) || (TRIAL && ROSTER.some((x) => x.id === c.id)); }
  function fsModes() {
    return [
      { k: "name", l: J("名前", "Name"), ph: J("キャラ名でさがす", "Search by name") },
      { k: "skill", l: J("スキル", "Skills"), ph: J("技の名前・効果でさがす（例：GUARD）", "Skill name or effect (e.g. GUARD)") },
      { k: "type", l: J("型・属性", "Type / element"), ph: J("型や属性でさがす（例：POWER・火）", "Type or element (e.g. POWER)") },
    ];
  }
  function fsSorts() {
    return [
      { k: "no", l: J("図鑑No.順", "No.") }, { k: "lv", l: J("熟練度 Lv", "Mastery Lv") },
      { k: "rar", l: J("レアリティ", "Rarity") }, { k: "el", l: J("属性", "Element") },
      { k: "type", l: J("型", "Type") }, { k: "name", l: J("名前", "Name") },
    ].concat(B.STAT_KEYS.map((k) => ({ k, l: B.STAT_NM[k].en + (en() ? "" : "（" + B.STAT_NM[k].ja + "）") })));
  }
  function fsGroups(scope) {
    const G = [
      { t: "el:", nm: J("属性", "Element"), or: 1, opts: EL_ORDER.map((e) => ({ k: "el:" + e, l: B.ELEM_JA[e] + J("属性", "") })) },
      { t: "rar:", nm: J("レアリティ", "Rarity"), or: 1, opts: [{ k: "rar:SSR", l: "SSR" }, { k: "rar:SR", l: "SR" }] },
      { t: "type:", nm: J("型", "Type"), or: 1, opts: B.TYPE_KEYS.map((k) => ({ k: "type:" + k, l: B.TYPES[k].ja })) },
      { t: "sp:", nm: J("特殊ショット", "Special shots"), or: 0, opts: Object.keys(B.SPECIALS).map((k) => ({ k: "sp:" + k, l: B.SPECIALS[k].en })) },
      { t: "act:", nm: J("アクティブ", "Active skill"), or: 1, opts: Object.keys(B.ACTIVES).map((k) => ({ k: "act:" + k, l: J(B.ACTIVES[k].ja, B.ACTIVES[k].en) })) },
      { t: "pas:", nm: J("パッシブ", "Passive skill"), or: 1, opts: Object.keys(B.PASSIVES).map((k) => ({ k: "pas:" + k, l: J(B.PASSIVES[k].ja, B.PASSIVES[k].en) })) },
    ];
    if (scope === "chars") G.push({ t: "own:", nm: J("所持", "Owned"), or: 1, opts: [{ k: "own:yes", l: J("所持している", "Owned") }, { k: "own:no", l: J("未所持", "Not owned") }] });
    G.push({ t: "team:", nm: J("編成", "Lineup"), or: 1, opts: [{ k: "team:in", l: J("編成中", "In lineup") }, { k: "team:out", l: J("編成していない", "Not in lineup") }] });
    return G;
  }
  function fsNames(scope) { const m = {}; fsGroups(scope).forEach((g) => g.opts.forEach((o) => { m[o.k] = o.l; })); return m; }
  function fsLabel(scope) {
    const ks = FS[scope].keys;
    if (!ks.length) return J("なし（すべて）", "None (all)");
    const nm = fsNames(scope);
    return ks.slice(0, 3).map((k) => nm[k] || k).join("・") + (ks.length > 3 ? J(" ほか", " +") + (ks.length - 3) : "");
  }
  function fsPool(scope) { return scope === "chars" ? B.buildRoster() : pickPool(); }
  function fsLineup(scope) { return scope === "chars" ? myLineup() : pickLineup(); }
  function plain(t) { return String(t || "").replace(/<[^>]*>/g, ""); }
  function fsHay(c, mode) {
    if (mode === "skill") {
      const k = B.kitText(c, lang());
      return plain([k.active.nm, k.active.sub, k.active.d, k.passive.nm, k.passive.sub, k.passive.d, k.ult.nm, k.ult.sub, k.ult.d]
        .concat(k.specials.map((x) => x.nm + " " + x.sub + " " + x.d)).join(" "));
    }
    if (mode === "type") {
      const ty = B.TYPES[c.type];
      return [ty.ja, ty.nm, B.ELEM_JA[c.el] || "", B.ELEM_JA[c.el2] || "", c.el, c.el2 || ""].join(" ") + " " + (B.ELEM_JA[c.el] || "") + "属性";
    }
    return c.nm + " " + c.id;
  }
  function fsList(scope) {
    const st = FS[scope];
    const lu = fsLineup(scope);
    const q = st.q.trim().toLowerCase();
    const by = {};
    st.keys.forEach((k) => { const t = k.slice(0, k.indexOf(":") + 1); (by[t] = by[t] || []).push(k.slice(t.length)); });
    const test = (c) => {
      for (const t in by) {
        const v = by[t];
        if (t === "el:" && !v.some((e) => c.el === e || c.el2 === e)) return false;
        if (t === "rar:" && v.indexOf(c.rarity) < 0) return false;
        if (t === "type:" && v.indexOf(c.type) < 0) return false;
        if (t === "sp:" && !v.every((x) => c.specials.indexOf(x) >= 0)) return false;
        if (t === "act:" && v.indexOf(c.active) < 0) return false;
        if (t === "pas:" && v.indexOf(c.passive) < 0) return false;
        if (t === "own:" && !v.some((o) => (o === "yes") === ownedC(c))) return false;
        if (t === "team:" && !v.some((o) => (o === "in") === (lu.indexOf(c.id) >= 0))) return false;
      }
      return true;
    };
    const list = fsPool(scope).filter((c) => test(c) && (!q || fsHay(c, st.qmode).toLowerCase().indexOf(q) >= 0));
    const k = st.sort;
    const cmp = {
      no: () => 0,
      lv: (a, b) => B.charProg(b.id).lv - B.charProg(a.id).lv,
      rar: (a, b) => (b.rarity === "SSR" ? 1 : 0) - (a.rarity === "SSR" ? 1 : 0),
      el: (a, b) => EL_ORDER.indexOf(a.el) - EL_ORDER.indexOf(b.el),
      type: (a, b) => B.TYPE_KEYS.indexOf(a.type) - B.TYPE_KEYS.indexOf(b.type),
      name: (a, b) => a.nm.localeCompare(b.nm, "ja"),
    }[k] || ((a, b) => b.st[k] - a.st[k]);
    list.sort(cmp);
    if (st.desc) list.reverse();
    return list;
  }
  function fsUI(scope) {
    const st = FS[scope];
    const md = fsModes(), S = fsSorts();
    const now = (S.find((x) => x.k === st.sort) || S[0]).l;
    const m = md.find((x) => x.k === st.qmode) || md[0];
    const n = st.keys.length;
    return '<div class="csmode"><span class="csmlab">🔎 ' + J("さがす対象", "Search in") + "</span>"
      + md.map((x) => '<button class="csmb' + (x.k === st.qmode ? " on" : "") + '" data-a="fsmode" data-v="' + scope + ":" + x.k + '">' + esc(x.l) + "</button>").join("") + "</div>"
      + '<div class="csearch' + (st.q ? " has" : "") + '"><span class="csic">🔍</span>'
      + '<input type="search" id="fsq_' + scope + '" enterkeyhint="search" autocomplete="off" placeholder="' + esc(m.ph) + '" value="' + esc(st.q) + '">'
      + '<button class="csx" data-a="fsclearq" data-v="' + scope + '" aria-label="clear">✕</button></div>'
      + '<div class="csort"><span class="cslab">↕ ' + J("並び替え", "Sort") + "</span>"
      + '<button class="cssel' + (fsSortOpen === scope ? " open" : "") + '" data-a="fssortopen" data-v="' + scope + '"><span>' + esc(now) + '</span><span class="csar">' + (fsSortOpen === scope ? "▴" : "▾") + "</span></button>"
      + '<button class="csdir' + (st.desc ? " up" : "") + '" data-a="fsdir" data-v="' + scope + '">' + (st.desc ? J("▲ 逆順", "▲ Reverse") : J("▼ 通常", "▼ Normal")) + "</button></div>"
      + (fsSortOpen === scope ? '<div class="cspanel">' + S.map((x) => '<button class="' + (x.k === st.sort ? "on" : "") + '" data-a="fssort" data-v="' + scope + ":" + x.k + '">' + esc(x.l) + "</button>").join("") + "</div>" : "")
      + '<button class="cffold' + (n ? " act" : "") + '" data-a="fsopen" data-v="' + scope + '"><span class="cfl">🔍 ' + J("絞り込み", "Filter") + "：</span><b>" + esc(fsLabel(scope)) + "</b>"
      + (n ? '<i class="cffn">' + n + "</i>" : "") + '<span class="cfarrow">' + J("選ぶ ▸", "Choose ▸") + "</span></button>";
  }
  function paintFS(scope) {
    const box = $("#fsui_" + scope);
    if (!box) return;
    box.innerHTML = fsUI(scope);
    const q = $("#fsq_" + scope);
    if (!q) return;
    const on = () => { FS[scope].q = q.value; q.parentNode.classList.toggle("has", !!q.value); fsRefresh(scope); };
    q.addEventListener("input", (e) => { if (e.isComposing) return; on(); });
    q.addEventListener("compositionend", on);
  }
  function emptyHTML() { return '<div class="empty" style="grid-column:1/-1">' + J("あてはまるキャラクターがいません。<br>検索や絞り込みの条件を見直してください。", "No characters match.<br>Try other search or filter settings.") + "</div>"; }
  function fsRefresh(scope) {
    if (scope === "chars") {
      const g = $("#cfg");
      if (g) {
        const list = fsList("chars"), lu = myLineup();
        g.innerHTML = list.length ? list.map((c) => ccHTML(c, lu)).join("") : emptyHTML();
        const n = $("#cfn"); if (n) n.textContent = list.length + J(" 体", " characters");
      }
    } else {
      const g = $("#pfg");
      if (g) { g.innerHTML = pickCards(); const n = $("#pfn"); if (n) n.textContent = pickN + J(" 体", " characters"); }
    }
    if (fsSheet === scope) paintSheet();
  }
  function sheetEl() {
    let o = $("#fsOv");
    if (!o) {
      o = document.createElement("div");
      o.id = "fsOv";
      o.innerHTML = '<div class="cfsheet" id="fsCard"></div>';
      document.body.appendChild(o);
      o.addEventListener("click", (e) => { if (e.target === o) ACT.fsclose(); });
    }
    return o;
  }
  function paintSheet() {
    const scope = fsSheet;
    const card = $("#fsCard");
    if (!scope || !card) return;
    const st = FS[scope];
    const n = fsList(scope).length;
    const nm = fsNames(scope);
    const oldBody = $("#fsBody");
    const keepY = oldBody ? oldBody.scrollTop : 0;
    const chosen = st.keys.length
      ? st.keys.map((k) => '<button class="cfchip" data-a="fspick" data-v="' + scope + "|" + k + '">' + esc(nm[k] || k) + " <i>✕</i></button>").join("")
      : '<span class="cfnone2">' + J("まだ条件はありません（すべて表示）", "No conditions (showing all)") + "</span>";
    const body = fsGroups(scope).map((g) => {
      const on = st.keys.filter((k) => k.indexOf(g.t) === 0).length;
      const op = !!fsGrpOpen[g.t];
      return '<div class="cfsec' + (op ? " open" : "") + '"><button class="cfsecb" data-a="fsgrp" data-v="' + g.t + '">'
        + '<span class="cfsn">' + esc(g.nm) + (on ? '<i class="cfsnn">' + on + "</i>" : "") + "</span>"
        + "<small>" + (g.or ? J("複数えらぶと「どれか」", "Any of the chosen") : J("選んだものを<b>すべて</b>持つ", "Has <b>all</b> chosen")) + "</small>"
        + '<span class="cfsar">' + (op ? "▲" : "▼") + "</span></button>"
        + (op ? '<div class="cfsbody">' + g.opts.map((o) => '<button class="cfbtn' + (st.keys.indexOf(o.k) >= 0 ? " on" : "") + '" data-a="fspick" data-v="' + scope + "|" + o.k + '">' + esc(o.l) + "</button>").join("") + "</div>" : "")
        + "</div>";
    }).join("");
    card.innerHTML = '<div class="cfhead"><div class="cfht">🔍 ' + J("絞り込み", "Filter") + "<small>" + (scope === "chars" ? J("キャラクター一覧", "All characters") : J("キャラをえらぶ", "Pick a character")) + "</small></div>"
      + '<button class="cfx" data-a="fsclose" aria-label="close">✕</button></div>'
      + '<div class="cfcur">' + chosen + "</div>"
      + '<div class="cfbody" id="fsBody"><div class="cfnote">' + J("<b>特殊ショット</b>だけは「選んだものをすべて持つ」キャラ、ほかの枠は複数えらぶと「<b>どれか</b>」で絞り込みます。<br>枠をまたいだ条件は、<b>すべて満たす</b>キャラを表示します。",
        "<b>Special shots</b> require all chosen; other groups match <b>any</b> chosen option.<br>Across groups, characters must match <b>every</b> group.") + "</div>" + body + "</div>"
      + '<div class="cffoot"><button class="cfreset" data-a="fsreset" data-v="' + scope + '"' + (st.keys.length ? "" : " disabled") + ">" + J("条件をすべて解除", "Clear all") + "</button>"
      + '<button class="cfdone' + (n ? "" : " zero") + '" data-a="fsclose">' + (n ? J("この条件で見る（該当 " + n + " 体）", "Show " + n + " characters") : J("該当 0 体 — 条件を見直してください", "0 matches — adjust filters")) + "</button></div>";
    const nb = $("#fsBody"); if (nb) nb.scrollTop = keepY;
  }
  function renderChars() {
    $("#s-chars").innerHTML = ttl("CHARACTER", J("キャラクター一覧", "All characters"))
      + '<div class="fsui" id="fsui_chars"></div>'
      + '<div class="fcount" id="cfn"></div>'
      + '<div class="cgrid" id="cfg"></div>'
      + '<div class="pn tight" style="margin-top:10px"><div class="note">' + J("キャラクターとガチャは <b>XEVARION と共通</b>。ガチャで仲間にした子がそのまま使えます。能力の<b>合計はどの子も同じ</b>で、ちがうのは得意・苦手の配分です。",
        "Characters and the gacha are <b>shared with XEVARION</b>. Every character has the <b>same stat total</b> — they differ in strengths and weaknesses.") + "</div></div>";
    paintFS("chars");
    fsRefresh("chars");
  }
  function ccHTML(c, lu) {
    const ty = B.TYPES[c.type];
    const own = ownedC(c);
    const p = B.charProg(c.id);
    const k = FS.chars.sort;
    const aw = own && !TRIAL ? awkOne(c.id) : 0;
    return '<div class="cc' + (own ? "" : " lock") + mxCls(c, aw) + '" data-a="detail" data-v="' + c.id + '"><img src="' + esc(img(c)) + '" alt="" loading="lazy">'
      + '<span class="rr ' + c.rarity + '">' + c.rarity + "</span>" + awkTag(aw)
      + (own ? '<span class="lv">Lv.' + p.lv + "</span>" : '<span class="lv no">' + J("未所持", "NOT OWNED") + "</span>")
      + (lu.indexOf(c.id) >= 0 ? '<span class="inl">' + (lu.indexOf(c.id) + 1) + "</span>" : "")
      + (B.STAT_KEYS.indexOf(k) >= 0 ? '<span class="num">' + c.st[k] + "</span>" : "")
      + '<div class="bt"><div class="nm">' + esc(c.nm) + '</div><div class="ty" style="color:' + ty.c + '">' + ty.ja + "</div></div></div>";
  }

  /* ══════════════════════════════════════════════════════════════
     ⑤ キャラクター詳細
     ══════════════════════════════════════════════════════════════ */
  function renderDetail() {
    const c = charOf(detailId);
    if (!c) { go("chars"); return; }
    $("#s-detail").innerHTML = detailHTML(c, "");
    fillBalls($("#dballs"), c, true);
    bindFruitRange();
  }
  /* ★★ 2026-09-17c 詳細の中身は<b>画面（mode ""）とバトル中のシート（mode "match"）で同じ</b>。
     バトル中は「この試合」の欄（ゲージ・使用ずみ）を足し、編成の操作ボタンは出さない。 */
  function detailHTML(c, mode) {
    const inMatch = mode === "match";
    const kit = B.kitText(c, lang());
    const ty = kit.type;
    const p = B.charProg(c.id);
    const own = ownedC(c);
    const lu = myLineup();
    const nextXp = B.xpForLv(Math.min(B.LV_MAX, p.lv + 1)), curXp = B.xpForLv(p.lv);
    return ''
      + '<div class="dhero' + mxCls(c, own && !TRIAL ? awkOne(c.id) : 0) + '"><img class="bg" src="' + esc(img(c)) + '" alt=""><img class="fg" src="' + esc(imgFull(c)) + '" alt="" onerror="this.onerror=null;this.src=\'' + esc(img(c)) + '\'"><div class="sh"></div>'
      + (inMatch ? '<button class="tb back" data-a="mteam">← TEAM</button>' : '<button class="tb back" data-a="back">← BACK</button>')
      + '<div class="info"><div class="rar">' + c.rarity + "</div>"
      + '<div class="nm">' + esc(c.nm) + "</div>"
      + '<div class="row">' + typeTag(c) + '<span class="tag">' + B.ELEM_JA[c.el] + (c.el2 ? "・" + B.ELEM_JA[c.el2] : "") + J("属性", "") + "</span>"
      + '<span class="tag">' + B.titleOf(p.lv) + "</span>" + (own ? "" : '<span class="tag" style="background:#555">' + J("未所持", "Not owned") + "</span>")
      + (own && !TRIAL ? awkTag(awkOne(c.id)) : "") + "</div></div></div>"

      + (inMatch ? matchStatusHTML(c) : "")

      + '<div class="pn"><div class="mast"><div class="lvb">Lv.' + p.lv + "<small>/" + B.LV_MAX + "</small></div>"
      + '<div style="flex:1"><div class="bar"><i style="width:' + (p.lv >= B.LV_MAX ? 100 : Math.round((p.xp - curXp) / Math.max(1, nextXp - curXp) * 100)) + '%"></i></div>'
      + '<div class="note" style="margin-top:3px">' + J("ショット熟練度 ", "Shot mastery ") + p.xp + " XP ・ " + J("試合 ", "Games ") + (p.games || 0) + "</div></div></div>"
      + '<div class="note" style="margin-top:6px">' + J("5レベルごとに全能力+1（最大+3）。凸と合わせて最大+7。ランクマッチ・性能統一では反映されません。", "+1 all stats every 5 levels (max +3), up to +7 with awakening. Ignored in ranked / unified matches.") + "</div>"
      /* ★★ 2026-09-17e 凸（MagiBurst の限界突破）も反映 */
      + (own && !TRIAL ? '<div class="note" style="margin-top:4px"><b>' + J("凸 ", "Awakening ") + awkOne(c.id) + "/" + B.AWK_MAX + "</b> ・ "
          + J("MagiBurst の凸1つごとに全能力+1（完凸で+" + B.AWK_MAX + "）。レベルと同じく性能統一では反映されません。",
              "+1 all stats per MagiBurst awakening (+" + B.AWK_MAX + " when maxed). Ignored in unified matches like levels.")
          + (awkOne(c.id) ? ' <b style="color:var(--r)">+' + awkOne(c.id) + "</b>" : "") + "</div>" : "")
      + (!inMatch && own && !TRIAL ? fruitHTML(c, p) : "") + "</div>"

      + hd("STATUS", J("基本性能", "Stats"))
      + '<div class="pn">' + radar(c.st, ty.c) + statRows(c.st, ty.main, ty.weak)
      + '<div class="note" style="margin-top:8px"><b style="color:' + ty.c + '">' + ty.ja + " TYPE</b> ─ " + L(ty.d) + "<br>"
      + J("得意：", "Strong: ") + "<b>" + esc(kit.strong) + "</b>　" + J("苦手：", "Weak: ") + "<b>" + esc(kit.weak) + "</b>"
      + "<br>" + (c.special
        ? J("<b>花宴祭の特別なキャラ</b>：能力の合計は <b>" + B.statSumOf(c) + "</b>（ふつうは " + B.STAT_SUM + "）。専用パッシブ「サクラ・ブルーム」を持つ、MagiBocciaRush で最強の性能です。",
            "<b>Special festival character</b>: stat total <b>" + B.statSumOf(c) + "</b> (normally " + B.STAT_SUM + ") with the unique passive Sakura Bloom — the strongest kit in MagiBocciaRush.")
        : J("能力の合計はどのキャラも ", "Every character totals ") + B.STAT_SUM + J("（レアリティで変わりません）。", " (rarity doesn't change it).")) + "</div>"
      + '<div class="note" style="margin-top:6px">' + B.STAT_KEYS.map((k) => "<b>" + B.STAT_NM[k].en + "</b> " + esc(L(B.STAT_NM[k].d))).join(" ／ ") + "</div></div>"

      + hd("SHOTS", J("ショットとスキル", "Shots & skills"), '<span class="more" data-a="rulesec" data-v="SKILLS">' + J("発動のルール ▸", "How skills work ▸") + "</span>")
      + '<div class="sk"><div class="h"><span class="e">NORMAL SHOT</span><span class="j">' + J("通常ショット", "Normal shot") + "</span></div>"
      + '<div class="d">' + normalShotText(c) + "</div></div>"
      + kit.specials.map((x) => '<div class="sk" style="border-left-color:' + x.c + '"><div class="h"><span class="e">' + esc(x.nm) + '</span><span class="j">' + esc(J("特殊ショット " + x.sub, "Special shot")) + "</span>"
        + '<span class="c tag">' + J("1エンド1回", "1/end") + (x.cost ? " ・ " + J("ゲージ", "gauge ") + x.cost : "") + "</span></div><div class=\"d\">" + x.d
        + "<br><small>" + J("投げる前に下のボタンで選ぶ。", "Select it below before throwing.") + (x.cost ? J("投げた瞬間にこのキャラのゲージから " + x.cost + " 引かれます。", " " + x.cost + " gauge is spent on release.") : "") + "</small></div></div>").join("")
      + '<div class="sk act"><div class="h"><span class="e">' + esc(kit.active.nm) + '</span><span class="j">' + esc(J("アクティブ " + kit.active.sub, "Active skill")) + '</span><span class="c tag">' + J("1エンド1回", "1/end") + "</span></div><div class=\"d\">" + kit.active.d
      + "<br><small>" + J("特殊ショット・ULT と同じ1投に重ねて使えます。", "Stacks with a special shot and the ULT on the same throw.") + "</small></div></div>"
      + '<div class="sk pas"><div class="h"><span class="e">' + esc(kit.passive.nm) + '</span><span class="j">' + esc(J("パッシブ " + kit.passive.sub, "Passive skill")) + '</span><span class="c tag">' + J("常に発動", "Always on") + "</span></div><div class=\"d\">" + kit.passive.d + "</div></div>"
      + '<div class="sk ult"><div class="h"><span class="e">' + esc(kit.ult.nm) + '</span><span class="j">ULTIMATE ・ ' + esc(kit.ult.sub) + '</span><span class="c tag">' + J("ゲージ100・チームで1エンド1回", "Gauge 100 · once per end per team") + "</span></div>"
      + '<div class="d">' + kit.ult.d + "<br><small>" + J("撃つとこのキャラのゲージは 0 に戻り、その1投ではゲージがたまりません。※ ルール準拠モード・ランクマッチでは、特殊ショット／スキル／アルティメットは使えません。", "Firing resets this character's gauge to 0 and that throw earns none. Specials, skills and ultimates are disabled in rules mode / ranked.") + "</small></div></div>"

      + hd("BALL", J("専用ボール（見た目だけ・性能は同じ）", "Signature ball (cosmetic)"))
      + '<div class="balls" id="dballs"></div>'

      + (inMatch ? '<button class="btn" style="margin-top:10px" data-a="close">' + J("試合にもどる", "Back to match") + "</button>"
        : own ? '<div class="stick">'
        + (lu.indexOf(c.id) >= 0 ? '<button class="btn gh">' + J("編成中 ", "In team #") + (lu.indexOf(c.id) + 1) + "</button>"
          : '<button class="btn" data-a="addteam" data-v="' + c.id + '">' + J("編成に入れる", "Add to team") + "</button>")
        + '<button class="btn pri" data-a="lead" data-v="' + c.id + '">' + J("1番手にする", "SET AS #1") + "</button></div>"
        : '<div class="stick"><button class="btn gh">' + J("未所持", "Not owned") + '</button><button class="btn pri" data-a="gacha">' + J("ガチャで仲間にする", "GET IN GACHA") + "</button></div>");
  }
  /* ══ ★★ 2026-09-17d 叡智の果実で熟練度 Lv を上げる（ご指定）══
     ・所持数は <b>MagiBurst と共有</b>（magiburst_v1 の items.wisdom）。同期は magiburst-cloud.js が受け持つ。
     ・果実は<b>ガチャでだけ</b>手に入る（MagiBurst のクエスト報酬からは外した）＝持っている果実はすべてガチャ産。
     ・1個で Lv +1（上限 LV_MAX）。 */
  function mbSave() { try { return JSON.parse(localStorage.getItem("magiburst_v1") || "null"); } catch (e) { return null; } }
  function fruitCount() { const d = mbSave(); return Math.max(0, (d && d.items && d.items.wisdom) | 0); }
  /* ★★ 2026-09-17g <b>使う個数を自由にえらび、画面の中で確認してから使う</b>（ご指定）。
     confirm() は出ない環境があるので使わない。状態は fruitSel（キャラが変わったら 1 にもどす）。
     ・−／＋・スライダー・+1／+5／+10／MAX のチップで個数をえらぶ
     ・「使う」を押すと、同じ枠の中に「Lv.a → Lv.b・果実 n 個（残り m 個）」の確認が出る
     ・枠だけ描き直す（詳細画面ぜんぶを描き直すとスクロール位置が飛ぶ） */
  let fruitSel = { id: "", n: 1, ask: false };
  function fruitMax(c, p) { return Math.max(0, Math.min(fruitCount(), B.LV_MAX - p.lv)); }
  function fruitHTML(c, p) {
    const n = fruitCount();
    const room = B.LV_MAX - p.lv;
    const mx = fruitMax(c, p);
    if (fruitSel.id !== c.id) fruitSel = { id: c.id, n: 1, ask: false };
    fruitSel.n = Math.max(mx ? 1 : 0, Math.min(fruitSel.n, mx));
    const k = fruitSel.n;
    const head = '<div class="fh"><div class="fi">🍐</div><div class="ft"><b>' + J("叡智の果実", "Fruit of Wisdom") + "</b> "
      + J("所持 ", "Owned ") + "<b>" + n + "</b>" + J("個", "")
      + "<small>" + (room <= 0 ? J("熟練度は最大です", "Mastery is maxed")
        : !n ? J("果実がありません（ガチャで入手できます）", "No fruit (get it from the gacha)")
        : J("1個で Lv +1。ガチャで入手した果実を MagiBurst と共有しています", "+1 Lv each. Shared with MagiBurst; obtained from the gacha")) + "</small></div></div>";
    if (!mx) return '<div class="fruit" id="fruitBox">' + head + "</div>";
    const after = p.lv + k;
    if (fruitSel.ask) {
      return '<div class="fruit ask" id="fruitBox">' + head
        + '<div class="fq">' + J("叡智の果実を <b>" + k + "個</b> 使って、熟練度を上げますか？", "Use <b>" + k + "</b> Fruit of Wisdom?")
        + '<div class="fl">Lv.' + p.lv + ' <i>→</i> <b>Lv.' + after + "</b></div>"
        + '<div class="note">' + J("果実 ", "Fruit ") + n + " → " + (n - k) + J("個（MagiBurst と共有）", " (shared with MagiBurst)")
        + (B.lvBonus(after) > B.lvBonus(p.lv) ? J(" ・ 全能力 +", " · all stats +") + (B.lvBonus(after) - B.lvBonus(p.lv)) : "") + "</div></div>"
        + '<div class="brow"><button class="btn gh" data-a="fruitno">' + J("やめる", "CANCEL") + '</button>'
        + '<button class="btn pri" data-a="fruitgo" data-v="' + c.id + '">' + J("使う", "USE") + "</button></div></div>";
    }
    const chip = (v, l) => '<button class="fchip' + (k === v ? " on" : "") + '" data-a="fruitn" data-v="set:' + v + '">' + l + "</button>";
    const chips = [1, 5, 10].filter((v) => v < mx).map((v) => chip(v, "+" + v)).join("") + chip(mx, "MAX");
    return '<div class="fruit" id="fruitBox">' + head
      + '<div class="fsel"><button class="fstep" data-a="fruitn" data-v="-1"' + (k <= 1 ? " disabled" : "") + ">−</button>"
      + '<input type="range" id="fruitRange" min="1" max="' + mx + '" value="' + k + '"' + (mx <= 1 ? " disabled" : "") + ">"
      + '<button class="fstep" data-a="fruitn" data-v="+1"' + (k >= mx ? " disabled" : "") + ">＋</button></div>"
      + '<div class="fchips">' + chips + "</div>"
      + '<div class="fpre">' + J("使う数 ", "Use ") + "<b>" + k + "</b>" + J("個", "") + " ・ Lv." + p.lv + " → <b>Lv." + after + "</b>"
      + (B.lvBonus(after) > B.lvBonus(p.lv) ? ' <span class="up">' + J("全能力 +", "stats +") + (B.lvBonus(after) - B.lvBonus(p.lv)) + "</span>" : "") + "</div>"
      + '<button class="btn pri" data-a="fruitask">' + J("🍐 " + k + "個 使う", "🍐 USE " + k) + "</button></div>";
  }
  /* 果実の枠だけ描き直す */
  function paintFruit() {
    const box = $("#fruitBox"), c = charOf(detailId);
    if (!box || !c) return;
    const w = document.createElement("div");
    w.innerHTML = fruitHTML(c, B.charProg(c.id));
    box.replaceWith(w.firstChild);
    bindFruitRange();
  }
  function bindFruitRange() {
    const r = $("#fruitRange");
    /* ★ スライダーは<b>動かしている最中に作り直さない</b>（つまみが指から外れる）。文字とボタンだけ差しかえる */
    if (r) r.addEventListener("input", () => {
      fruitSel.n = +r.value || 1; fruitSel.ask = false;
      const box = $("#fruitBox"), c = charOf(detailId); if (!box || !c) return;
      const w = document.createElement("div"); w.innerHTML = fruitHTML(c, B.charProg(c.id));
      [".fchips", ".fpre", ".btn.pri"].forEach((q) => { const a = $(q, box), b = w.querySelector(q); if (a && b) a.innerHTML = b.innerHTML; });
      $$(".fstep", box).forEach((el, i) => { const b = w.querySelectorAll(".fstep")[i]; if (b) el.disabled = b.disabled; });
    });
  }
  function useFruit(id, want) {
    const d = mbSave();
    if (!d || !d.chars || !d.chars[id]) { toast(J("このキャラは持っていません", "You don't own this character")); return; }
    d.items = d.items || {};
    const have = Math.max(0, d.items.wisdom | 0);
    const room = B.LV_MAX - B.charProg(id).lv;
    const use = Math.min(have, room, want === "max" ? 999 : Math.max(1, want | 0));
    if (use <= 0) { toast(have ? J("熟練度は最大です", "Mastery is maxed") : J("叡智の果実がありません（ガチャで入手できます）", "No Fruit of Wisdom (get it from the gacha)")); return; }
    d.items.wisdom = have - use;
    try { localStorage.setItem("magiburst_v1", JSON.stringify(d)); } catch (e) { toast("SAVE ERROR"); return; }
    const r = B.addCharLevels(id, use);
    FX.sfx("guard");
    toast("🍐 ×" + use + " ─ Lv." + r.before + " → Lv." + r.after);
    fruitSel = { id, n: 1, ask: false };
    const y = window.scrollY;
    renderDetail();
    window.scrollTo(0, y);
  }
  function fillBalls(box, c, interactive) {
    if (!box) return;
    const p = B.charProg(c.id);
    B.skinsOf(c, p.lv).forEach((sk) => {
      const b = document.createElement("button");
      const on = (p.ball || "std") === sk.k && sk.open;
      b.className = "bsk" + (on ? " on" : "") + (sk.open ? "" : " lock");
      b.dataset.a = sk.open && interactive ? "ball" : "";
      b.dataset.v = c.id + ":" + sk.k;
      b.appendChild(FX.ballThumb(c, sk.k, "red", 58));
      const n = document.createElement("div"); n.className = "n"; n.textContent = en() ? sk.en : sk.ja;
      const g = document.createElement("div"); g.className = "g";
      g.textContent = sk.open ? (on ? J("使用中", "IN USE") : J("解放ずみ", "UNLOCKED")) : (!sk.gradeOk ? J("極祭キャラ専用", "Festival only") : "🔒 Lv." + sk.need);
      b.appendChild(n); b.appendChild(g);
      box.appendChild(b);
    });
    animThumbs(box);
  }
  /* バトル中：このキャラの「いま」の状態 */
  function matchStatusHTML(c) {
    if (!M) return "";
    let out = "";
    ["red", "blue"].forEach((sd) => {
      const lu = B.lineupOf(M, sd);
      const i = lu.indexOf(c.id);
      if (i < 0) return;
      const kit = B.kitText(c, lang());
      const now = M.phase === "play" && M.turn === sd && B.charIdx(M, sd) === i;
      const who = B.playerOf(M, sd);
      let h = '<div class="pn ' + (sd === "red" ? "red" : "blue") + '"><div class="note"><b>' + J("この試合", "THIS MATCH") + " ・ " + sd.toUpperCase() + (who ? " " + esc(who.name) : "") + " ・ " + J((i + 1) + "番手", "#" + (i + 1)) + "</b>"
        + (now ? ' <span class="tag" style="background:var(--gold);color:#000">' + J("いま投げる番", "THROWING NOW") + "</span>" : "") + "</div>";
      if (M.md.skills) {
        const g = Math.round(M.gauge[sd][i] || 0);
        const spU = M.spUsed[sd][i] || {};
        const tg = (nm, used, sub) => '<span class="tag' + (used ? " used" : "") + '">' + esc(nm) + " " + (used ? J("使用ずみ", "USED") : sub) + "</span>";
        h += '<div class="gauge' + (g >= 100 ? " full" : "") + '" style="margin-top:6px"><i style="width:' + g + '%"></i><span>GAUGE ' + g + "</span></div>"
          + '<div class="mstat">' + kit.specials.map((x) => tg(x.nm, (spU[x.k] || 0) >= B.SPECIALS[x.k].uses, M.gauge[sd][i] >= x.cost ? J("使える", "READY") : J("ゲージ不足", "NEED G" + x.cost))).join("")
          + tg(kit.active.nm, M.actUsed[sd][i], J("使える", "READY"))
          + tg("ULT", M.ultUsed[sd], g >= B.GAUGE_MAX ? J("使える", "READY") : g + "%") + "</div>"
          + '<div class="note" style="margin-top:4px;font-size:10.5px">' + J("使用回数はエンドが変わると戻ります。ゲージは持ちこし。ULT は<b>チームで1エンド1回</b>。", "Uses reset each end; gauge carries over. ULT is <b>once per end per team</b>.") + "</div>";
      } else {
        h += '<div class="note" style="margin-top:4px">' + J("ルール準拠モード：スキルは使えません（能力の効きは 1/3）。", "Rules mode: no skills (stats at 1/3).") + "</div>";
      }
      out += h + "</div>";
    });
    return out;
  }
  function openMatchTeam() {
    if (!M) return;
    const me = mySide();
    const sideHTML = (sd) => {
      const lu = B.lineupOf(M, sd);
      const who = B.playerOf(M, sd);
      return hd(sd.toUpperCase(), (who ? who.name : "") + (sd === me && !M.cfg.local ? J("（あなた）", " (you)") : ""))
        + '<div class="mteam">' + lu.map((id, i) => {
          const c = charOf(id);
          if (!c) return "";
          const ty = B.TYPES[c.type];
          const g = M.md.skills ? Math.round(M.gauge[sd][i] || 0) : -1;
          const now = M.phase === "play" && M.turn === sd && B.charIdx(M, sd) === i;
          const aw = ((M.cfg.awk || {})[sd] || {})[id] | 0;
          return '<div class="mtc side-' + sd + (now ? " now" : "") + mxCls(c, aw) + '" data-a="mchar" data-v="' + sd + ":" + id + '"><img src="' + esc(img(c)) + '" alt="" loading="lazy">'
            + '<span class="no">' + (i + 1) + "</span>" + (now ? '<span class="nw">NOW</span>' : "") + awkTag(aw, true)
            + '<div class="bt"><div class="nm">' + esc(c.nm) + '</div><div class="ty"><span style="color:' + ty.c + '">' + ty.ja + "</span>" + (g >= 0 ? " ・ G" + g : "") + "</div></div></div>";
        }).join("") + "</div>";
    };
    open(ttl("TEAM", J("編成キャラの詳細", "Lineup details"))
      + '<div class="note" style="margin-bottom:2px">' + J("キャラを押すと、能力・スキル・ボールと<b>この試合の状態</b>（ゲージ・使用ずみ）をすべて確認できます。", "Tap a character to see stats, skills, ball and <b>its state in this match</b>.") + "</div>"
      + sideHTML(me) + sideHTML(B.other(me))
      + '<div class="brow"><button class="btn gh" data-a="rulesec" data-v="SKILLS">RULE BOOK</button><button class="btn" data-a="close">' + J("試合にもどる", "Back to match") + "</button></div>");
  }
  function animThumbs(box) {
    let t0 = performance.now();
    const tick = (ts) => {
      if (!box.isConnected) return;
      const tt = (ts - t0) / 1000;
      $$("canvas", box).forEach((cv) => { if (cv._paint) cv._paint(tt); });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function normalShotText(c) {
    const s = c.st;
    const pw = s.power >= 75 ? J("強い", "strong") : s.power <= 55 ? J("弱め", "light") : J("ふつう", "medium");
    const ct = s.control >= 75 ? J("ブレが小さい", "very accurate") : s.control <= 55 ? J("ブレが大きい", "wobbly") : J("ブレはふつう", "average accuracy");
    const fr = s.friction >= 75 ? J("よく止まる", "stops readily") : s.friction <= 55 ? J("よく転がる", "rolls far") : J("転がりはふつう", "average roll");
    return J("威力は<b>" + pw + "</b>、<b>" + ct + "</b>、<b>" + fr + "</b>。壁の反発 " + Math.round((1 + (s.bounce - 66) / 100 * 0.35) * 100) + "%、ジャックへの押し " + Math.round((1 + (s.jack - 66) / 100 * 0.3) * 100) + "%。",
      "Power <b>" + pw + "</b>, <b>" + ct + "</b>, <b>" + fr + "</b>. Rail rebound " + Math.round((1 + (s.bounce - 66) / 100 * 0.35) * 100) + "%, jack push " + Math.round((1 + (s.jack - 66) / 100 * 0.3) * 100) + "%.");
  }

  /* ══════════════════════════════════════════════════════════════
     ⑥ プロフィール・ランキング
     ══════════════════════════════════════════════════════════════ */
  function badgesOf(s) {
    return [
      { ok: s.wins >= 1, e: "FIRST WIN", j: J("はじめての勝利", "First win") },
      { ok: s.wins >= 10, e: "10 WINS", j: J("10勝", "10 wins") },
      { ok: s.bestChain >= 3, e: "CHAIN ×3", j: J("コンボ3", "Chain ×3") },
      { ok: s.bestChain >= 4, e: "CHAIN MAX", j: J("コンボ上限", "Max chain") },
      { ok: s.banks >= 20, e: "RAIL RIDER", j: J("バンク20回", "20 banks") },
      { ok: s.jackHits >= 20, e: "JACK MASTER", j: J("ジャック20回", "20 jack hits") },
      { ok: s.rankWins >= 5, e: "RANKER", j: J("ランク5勝", "5 ranked wins") },
      { ok: s.onWins >= 1, e: "ONLINE WIN", j: J("オンライン勝利", "Online win") },
    ];
  }
  function renderProfile() {
    const s = B.load();
    const r = B.rankOf(s.rp);
    const wr = s.matches ? Math.round(s.wins / s.matches * 100) : 0;
    let favId = "", favG = -1;
    Object.keys(s.chars || {}).forEach((id) => { const g = s.chars[id].games || 0; if (g > favG && charOf(id)) { favG = g; favId = id; } });
    const fav = charOf(favId) || charOf(myLineup()[0]);
    const bd = badgesOf(s);
    $("#s-profile").innerHTML = ttl("PROFILE", J("プロフィール", "Profile"))
      + '<div class="pn red"><div style="display:flex;gap:12px;align-items:center">'
      + (fav ? '<img src="' + esc(img(fav)) + '" alt="" style="width:64px;height:64px;object-fit:cover;object-position:50% 15%;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)">' : "")
      + '<div style="min-width:0;flex:1"><div style="font-size:18px;font-weight:900">' + esc(accName()) + "</div>"
      + '<div class="en" style="font-size:18px;color:' + r.c + '">' + r.ja + " ・ " + s.rp + " RP</div></div>"
      + '<div style="text-align:right"><div class="en" style="font-size:30px">' + wr + '%</div><div class="note">WIN RATE</div></div></div></div>'
      + '<div class="brow" style="margin-top:0"><button class="btn sm" data-a="go" data-v="ranking">RANKING</button><button class="btn sm gh" data-a="settings">SETTINGS</button></div>'
      + hd("RECORD", J("戦績", "Record"))
      + '<div class="pn"><div class="kv">'
      + kv(J("試合", "Matches"), s.matches) + kv(J("勝利", "Wins"), s.wins)
      + kv(J("ランク", "Ranked"), s.rankWins + " / " + s.rankMatches) + kv(J("CPU戦", "CPU"), s.cpuWins + " / " + s.cpuMatches)
      + kv(J("チーム戦", "Team"), s.teamWins + " / " + s.teamMatches) + kv(J("オンライン", "Online"), s.onWins + " / " + s.onMatches)
      + kv(J("投球", "Throws"), s.throws) + kv(J("ヒット率", "Hit rate"), s.throws ? Math.round(s.hits / s.throws * 100) + "%" : "—")
      + kv(J("ジャックヒット", "Jack hits"), s.jackHits) + kv(J("バンク", "Banks"), s.banks)
      + kv(J("最大コンボ", "Best chain"), s.bestChain ? "×" + s.bestChain : "—")
      + kv(J("平均ジャック距離", "Avg. distance"), s.nDist ? Math.round(s.sumDist / s.nDist * 100) + "cm" : "—")
      + "</div></div>"
      + hd("FAVORITE", J("よく使うキャラ", "Favorite character"))
      + (fav ? '<div class="pn" data-a="detail" data-v="' + fav.id + '" style="cursor:pointer"><div style="display:flex;gap:10px;align-items:center">'
        + '<img src="' + esc(img(fav)) + '" style="width:52px;height:52px;object-fit:cover;object-position:50% 15%">'
        + '<div><b>' + esc(fav.nm) + '</b><div class="note">Lv.' + B.charProg(fav.id).lv + " ・ " + B.titleOf(B.charProg(fav.id).lv) + " ・ " + (favG > 0 ? favG : 0) + J("試合", " games") + "</div></div></div></div>" : "")
      + hd("BADGE", J("称号・バッジ", "Badges"))
      + '<div class="pn"><div style="display:flex;flex-wrap:wrap;gap:5px">' + bd.map((b) => '<span class="tag" style="' + (b.ok ? "background:#fff;color:#000" : "opacity:.4") + '" title="' + esc(b.j) + '">' + (b.ok ? "★ " : "🔒 ") + b.e + "</span>").join("") + "</div></div>"
      + hd("REPLAY", J("リプレイ", "Replays"))
      + (s.replays.length ? s.replays.map((rp, i) => '<div class="pn tight" style="display:flex;align-items:center;gap:10px">'
          + '<div><div class="en" style="font-size:18px"><span style="color:var(--r2)">' + rp.score.red + '</span> - <span style="color:var(--b2)">' + rp.score.blue + "</span> <small style=\"font-size:11px;color:var(--sub)\">" + esc(kindName(rp.kind)) + "</small></div>"
          + '<div class="note">' + new Date(rp.at).toLocaleString() + (rp.best ? " ・ BEST SHOT ×" + rp.best : "") + "</div></div>"
          + '<button class="btn sm" style="margin-left:auto" data-a="replay" data-v="' + i + '">▶</button></div>').join("")
        : '<div class="pn"><div class="empty">' + J("リプレイはまだありません。", "No replays yet.") + "</div></div>");
  }
  function kv(k, v) { return '<span class="k">' + esc(k) + "</span><span>" + esc(String(v)) + "</span>"; }
  function renderRanking() {
    const s = B.load();
    const r = B.rankOf(s.rp);
    $("#s-ranking").innerHTML = ttl("RANKING", J("ランキング", "Ranking"))
      + '<div class="pn red"><div style="display:flex;align-items:center;gap:10px"><div class="en" style="font-size:14px;color:var(--w2)">YOUR RANK</div>'
      + '<div class="en" style="font-size:24px;color:' + r.c + ';margin-left:auto">' + r.ja + '</div><div class="en" style="font-size:24px">' + s.rp + "</div></div></div>"
      + hd("GLOBAL", J("全国（オンライン）", "Global (online)"))
      + '<div id="rkList"><div class="empty">' + J("読みこんでいます…", "Loading…") + "</div></div>"
      + hd("TIERS", J("ランクの段階", "Tiers"))
      + '<div class="pn">' + B.RANKS.map((x) => '<div class="sw"><div class="k"><span class="en" style="color:' + x.c + ';font-size:16px">' + x.ja + "</span></div><div class=\"en\">" + x.need + " RP</div></div>").join("") + "</div>";
    const box = $("#rkList");
    if (!window.MBROnline || !MBROnline.fetchRank) {
      box.innerHTML = '<div class="pn"><div class="empty">' + J("オンラインに接続できないため表示できません。", "Online ranking unavailable.") + "</div></div>";
      return;
    }
    MBROnline.fetchRank().then((rows) => {
      if (!box.isConnected) return;
      if (!rows) { box.innerHTML = '<div class="pn"><div class="note">' + J("全国ランキングを読めませんでした。<b>通信を確認</b>するか、サーバーの設定（Firebase のルール）が公開されるまでお待ちください。あなたのランクは上のとおり端末に保存されています。",
        "Couldn't load the global ranking. Check your connection, or wait until the server rules are published. Your rank above is saved on this device.") + "</div></div>"; return; }
      if (!rows.length) { box.innerHTML = '<div class="pn"><div class="empty">' + J("まだ誰も登録されていません。ランクマッチで最初の1人になろう。", "Nobody yet — be the first in ranked.") + "</div></div>"; return; }
      const me = MBROnline.myUid ? MBROnline.myUid() : "";
      box.innerHTML = rows.map((x, i) => '<div class="rk-row' + (i < 3 ? " top" + (i + 1) : "") + (x.uid === me ? " me" : "") + '"><div class="n">' + (i + 1) + "</div>"
        + '<div class="p">' + esc(x.name || "PLAYER") + "<small>" + esc(B.rankOf(x.rp).ja) + (x.fav && charOf(x.fav) ? " ・ " + esc(charOf(x.fav).nm) : "") + "</small></div>"
        + '<div class="v">' + x.rp + "</div></div>").join("");
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ⑦ プライベートルーム（オンライン）
     ══════════════════════════════════════════════════════════════ */
  function renderRoom() {
    const s = B.load();
    const ok = !!window.MBROnline;
    $("#s-room").innerHTML = ttl("PRIVATE ROOM", J("プライベートルーム", "Private room"))
      + '<div class="pn"><div class="note" style="margin-bottom:8px">' + J("部屋を作ってルームコードを伝えるか、友達のコードを入れてください。<b>2〜6人</b>でチーム対戦ができ、足りない席は<b>CPU補充</b>できます。",
        "Create a room and share the code, or enter a friend's. <b>2–6 players</b> in teams; empty seats can be <b>filled by CPU</b>.") + "</div>"
      + '<button class="btn pri" data-a="roomcreate"' + (ok ? "" : " disabled") + ">CREATE ROOM</button>"
      + '<input class="inp code" id="roomIn" maxlength="6" placeholder="A82K91" value="' + esc(s.lastRoom || "") + '" style="margin-top:10px">'
      + '<button class="btn" style="margin-top:8px" data-a="roomjoin"' + (ok ? "" : " disabled") + ">JOIN</button></div>"
      + '<div id="roomBox"></div>'
      + '<div class="pn tight"><div class="note">' + J("● オンラインでは<b>角度・強さ・スキルの選択だけ</b>を送り、盤面はそれぞれの端末が同じ物理で計算します。1投ごとに<b>盤面の指紋を照らし合わせ</b>、ずれたら記録から組み立て直します。<br>● 切断しても、同じ部屋に入り直せば<b>記録から試合を復元</b>します。",
        "● Only aim, power and skill choices are sent; each device computes the same physics. <b>Board fingerprints are compared</b> every throw and rebuilt from the log on mismatch.<br>● If you disconnect, rejoin the room to <b>restore the match</b>.") + "</div></div>"
      + (ok ? "" : '<div class="pn red"><div class="note">' + J("オンライン機能を読みこめませんでした。通信を確認して再読み込みしてください。", "Online module failed to load. Check your connection and reload.") + "</div></div>");
    if (ok && MBROnline.room) MBROnline.repaint();
  }

  /* ══════════════════════════════════════════════════════════════
     ⑧ 試合をはじめる
     ══════════════════════════════════════════════════════════════ */
  function startMatch(cfg) {
    const s = B.load();
    const p = cfg || pendingCfg;
    if (!p) return;
    if (p.difficulty && p.kind !== "ranked") { s.lastDiff = p.difficulty; B.save(); }
    const mine = myLineup();
    const rival = p.rival && p.rival.length ? p.rival : B.rivalLineup(Date.now() >>> 0, LINEUP_N);
    const n = p.kind === "team" ? p.vs : 1;
    const players = { red: [], blue: [] };
    const cpuBlue = !(p.kind === "friend" || p.kind === "practice" || (p.kind === "team" && !p.cpuFill));
    for (let i = 0; i < n; i++) {
      players.red.push({ name: n > 1 ? "RED " + (i + 1) : accName(), cpu: false });
      players.blue.push({ name: cpuBlue ? "CPU" + (n > 1 ? " " + (i + 1) : "") : (p.kind === "friend" ? "2P" : "BLUE " + (i + 1)), cpu: cpuBlue });
    }
    const lineup = { red: (p.redLineup && p.redLineup.length ? p.redLineup : mine).slice(0, LINEUP_N), blue: rival.slice(0, LINEUP_N) };
    /* 新しく始めたら、中断していた試合は消える */
    if (!p.resume && !p.online && s.suspend) { s.suspend = null; B.save(); }
    if (p.lineupOverride) { lineup.red = p.lineupOverride.red; lineup.blue = p.lineupOverride.blue; }
    if (p.playersOverride) { players.red = p.playersOverride.red; players.blue = p.playersOverride.blue; }
    M = B.newMatch({
      kind: p.kind, mode: p.kind,
      ends: p.kind === "practice" ? 99 : (p.ends || 4), perSide: 6, players, lineup,
      /* 凸は<b>自分（赤）の編成だけ</b>。CPU に自分の凸が乗らないように。
         ★★ 2026-09-17f 1台対戦は 1P・2P それぞれえらんだ育成状況（trainRed / trainBlue）で */
      levels: p.kind === "friend" ? { red: trainLv(p.trainRed, lineup.red), blue: trainLv(p.trainBlue, lineup.blue) }
        : { red: levelsOf(lineup.red), blue: levelsOf(lineup.blue) },
      awk: p.kind === "friend" ? { red: trainAw(p.trainRed, lineup.red), blue: trainAw(p.trainBlue, lineup.blue) }
        : { red: awksOf(lineup.red), blue: {} },
      rules: p.rules || "ability", growth: p.growth || "full",
      first: p.first || "red", difficulty: p.difficulty || "normal", guide: s.guide,
      seed: p.seed != null ? p.seed : ((Date.now() ^ (Math.random() * 1e9)) >>> 0),
    });
    M.kind = p.kind;
    M.practice = p.kind === "practice";
    online = p.online || null;
    if (M.cfg.rules === "rules") B.pushHint(M, "rulesmode");
    B.pushHint(M, "order");
    busy = false; thinking = false; hold = false; aim = null; slot = 2; lastGuide = null; shownTurn = ""; trail = [];
    sel = { special: "", active: false, ult: false };
    predCache = null; predKey = "";
    if (!p.tutorial) tut = null;
    close();
    go("match");
    buildMatchDOM();
    startLoop();
    lineup.red.concat(lineup.blue).forEach((id) => FX.imgOf(charOf(id)));
    setTimeout(startTurn, 250);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑧-b BOSS STAGE（★ 2026-09-17d 新モード・ご指定）
     ・ステージの中身（ギミック・ボス・難易度）は mbr-stage.js。ここは画面だけ。
     ・属性は<b>見た目とテーマ</b>。相性は ×1.15 まで（攻略に必須にしない）。
     ══════════════════════════════════════════════════════════════ */
  const ELEM_EN = { fire: "Fire", water: "Water", wood: "Wood", light: "Light", dark: "Dark" };
  function elemNm(el) { return en() ? ELEM_EN[el] : B.ELEM_JA[el] + "属性"; }
  function renderStages() {
    const ST = window.MBRStage;
    if (!ST) { $("#s-stages").innerHTML = ttl("BOSS STAGE", "") + '<div class="pn"><div class="empty">LOADING…</div></div>'; return; }
    const P = ST.progress();
    const cleared = ST.STAGES.reduce((a, d) => a + ST.DIFF_KEYS.filter((k) => P[d.id + ":" + k] && P[d.id + ":" + k].clear).length, 0);
    $("#s-stages").innerHTML = ttl("BOSS STAGE", J("ボスステージ", "Boss stages"))
      + '<div class="pn tight"><div class="note">'
      + J("ギミックとボスを<b>ショットの向き・強さ・止める位置・壁反射・衝突・ジャック・固有スキル・編成順</b>で攻略するモードです。"
          + "<b>属性は見た目とテーマ</b>で、相性が良くてもダメージは ×" + ST.ADV_MUL + " だけ——どの属性・どのキャラでもクリアできます。"
          + "<br>難易度 <b>HARD・NORMAL・EASY</b> を<b>初回クリア</b>すると 💎ジェム <b>15・10・5</b> 個。",
          "Beat gimmicks and bosses with <b>aim, power, placement, banks, collisions, the jack, skills and lineup order</b>. "
          + "<b>Elements are theme only</b> — a good matchup adds just ×" + ST.ADV_MUL + ", so every element and character can clear."
          + "<br>First clears on <b>HARD / NORMAL / EASY</b> give 💎 <b>15 / 10 / 5</b> gems.")
      + '<div style="margin-top:5px"><b>' + J("クリア ", "Cleared ") + cleared + " / " + ST.STAGES.length * 3 + "</b></div></div></div>"
      + ST.STAGES.map((d) => '<div class="stgcard" style="--sc:' + d.c + '">'
        + '<div class="h"><span class="no">' + d.no + '</span><div style="min-width:0"><div class="e">' + esc(L(d.nm)) + "</div>"
        + '<div class="j">BOSS ・ ' + esc(L(d.boss)) + ' ・ <span style="color:' + d.c + '">' + esc(elemNm(d.el)) + "</span></div></div></div>"
        + '<div class="d">' + esc(L(d.theme)) + "</div>"
        + '<div class="gm">' + d.gimmicks.map((g) => '<span class="tag">' + esc(L(g.nm)) + "</span>").join("") + "</div>"
        + '<div class="dfs">' + ST.DIFF_KEYS.map((k) => {
            const pr = P[d.id + ":" + k] || {};
            return '<button class="stgdfb' + (pr.clear ? " ok" : "") + '" style="--dc:' + ST.DIFF[k].c + '" data-a="stageinfo" data-v="' + d.id + ":" + k + '">'
              + "<b>" + esc(L(ST.DIFF[k])) + "</b><small>" + (pr.clear ? J("クリア ✓", "CLEAR ✓") : "💎 " + ST.DIFF[k].gems) + "</small></button>";
          }).join("") + "</div></div>").join("")
      + hd("TYPES", J("型ごとの攻略のしかた（属性とは無関係）", "How each type helps (not tied to element)"))
      + '<div class="pn">' + B.TYPE_KEYS.map((k) => '<div class="rli" style="border-left-color:' + B.TYPES[k].c + '"><b>' + B.TYPES[k].ja + "</b><br>" + esc(L(ST.TYPE_EFFECT[k])) + "</div>").join("") + "</div>";
  }
  function stageInfo(v) {
    const ST = window.MBRStage; if (!ST) return;
    const [id, diff] = v.split(":");
    const d = ST.BY_ID[id]; if (!d) return;
    const D = d.diffs[diff];
    const pr = ST.progress()[id + ":" + diff] || {};
    const advEl = Object.keys(ST.ELEM_ADV).filter((k) => ST.ELEM_ADV[k] === d.el);
    const row = (k, val) => '<div class="gr"><span>' + esc(k) + "</span><div>" + esc(L(val)) + "</div></div>";
    const lu = myLineup();
    open(ttl(L(d.nm), J("ボス ", "Boss ") + L(d.boss) + " ・ " + J("難易度 ", "Difficulty ") + L(ST.DIFF[diff]))
      + '<div class="pn" style="border-left:4px solid ' + d.c + '"><div class="note">' + esc(L(d.bossDesc)) + "</div>"
      + '<div class="kv" style="margin-top:8px">'
      + kv(J("ボスのHP", "Boss HP"), D.hp) + kv(J("ショット数", "Shots"), D.shots)
      + kv(J("テーマ属性", "Theme element"), elemNm(d.el)) + kv(J("相性の良い属性", "Good matchup"), advEl.map(elemNm).join("・") + " ×" + ST.ADV_MUL)
      + kv(J("初回クリア報酬", "First clear"), pr.clear ? J("受け取りずみ", "Claimed") : "💎 " + ST.DIFF[diff].gems)
      + kv(J("ベスト", "Best"), pr.best ? pr.best + J("投", " shots") : "—")
      + "</div></div>"
      + hd("FLOW", J("攻略の流れ", "Flow"))
      + '<div class="pn tight"><ol class="stgol">' + d.flow.map((f) => "<li>" + esc(L(f)) + "</li>").join("") + "</ol></div>"
      + hd("ROUTES", J("攻略ルート（どれでもクリアできます）", "Routes (any of them can win)"))
      + '<div class="pn tight"><ul class="stgol">' + d.routes.map((f) => "<li>" + esc(L(f)) + "</li>").join("") + "</ul></div>"
      + hd("GIMMICKS", J("ギミック", "Gimmicks"))
      + d.gimmicks.map((g) => '<details class="gim"><summary><b>' + esc(L(g.nm)) + "</b><small>" + esc(L(g.look)) + "</small></summary>"
        + row(J("発動条件", "Trigger"), g.trigger) + row(J("発動までの時間", "Timing"), g.time)
        + row(J("ボールへの影響", "Effect on balls"), g.ball) + row(J("キャラクターへの影響", "Effect on characters"), g.chara)
        + row(J("解除条件", "How to clear"), g.clear) + row(J("失敗したとき", "Penalty"), g.fail)
        + '<div class="gr"><span>' + J("攻略方法", "Strategies") + "</span><div><ul>" + g.ways.map((w) => "<li>" + esc(L(w)) + "</li>").join("") + "</ul></div></div>"
        + '<div class="gr hint"><span>💡 ' + J("ヒント", "Hint") + "</span><div>" + esc(L(g.hint)) + "</div></div></details>").join("")
      + hd("LINEUP", J("出撃する編成（6体・順番に投げます）", "Your lineup (6, in order)"))
      + '<div class="lineup mini">' + lu.map((cid, i) => { const c = charOf(cid); return c ? slotHTML(c, i, "", "", awkOne(c.id)) : ""; }).join("") + "</div>"
      + '<div class="brow"><button class="btn gh" data-a="toteam">' + J("編成を変える", "Edit lineup") + '</button><button class="btn pri" data-a="stagestart" data-v="' + v + '">' + J("出撃", "START") + "</button></div>");
  }
  function startStage(id, diff) {
    const ST = window.MBRStage; if (!ST) return;
    const s = B.load();
    const mine = myLineup().slice(0, LINEUP_N);
    M = B.newMatch({
      kind: "stage", mode: "stage", ends: 1, perSide: 6,
      players: { red: [{ name: accName(), cpu: false }], blue: [] },
      lineup: { red: mine, blue: [] },
      levels: { red: levelsOf(mine), blue: {} },
      awk: { red: awksOf(mine), blue: {} },
      rules: "ability", growth: s.growth || "full", first: "red", difficulty: "normal", guide: s.guide,
      seed: ((Date.now() ^ (Math.random() * 1e9)) >>> 0),
    });
    M.kind = "stage"; M.practice = false;
    online = null;
    ST.setup(M, id, diff);
    pendingStage = { id, diff };
    busy = false; thinking = false; hold = false; aim = null; slot = 2; lastGuide = null; shownTurn = ""; trail = [];
    sel = { special: "", active: false, ult: false };
    predCache = null; predKey = ""; tut = null; stageAnim = false; stageFx = []; endPending = false;
    close();
    go("match");
    buildMatchDOM();
    startLoop();
    mine.forEach((cid) => FX.imgOf(charOf(cid)));
    setTimeout(startTurn, 250);
  }
  function stageSettled() {
    if (stageAnim) { stageAnim = false; M.balls.forEach((b) => { b._cd = {}; }); M.turn = "red"; shownTurn = ""; updateHUD(); startTurn(); return; }
    const r = window.MBRStage.turnEnd(M);
    updateHUD();
    if (r.win || r.lose) { M.phase = "over"; setTimeout(() => showStageResult(!!r.win), 650); return; }
    if (r.anim) { stageAnim = true; M.cur = null; busy = true; return; }
    M.turn = "red"; shownTurn = "";
    startTurn();
  }
  function showStageResult(win) {
    if (!M || !M.stage) return;
    const ST = window.MBRStage, S = M.stage;
    const used = S.shotsMax - Math.max(0, M.left.red | 0);
    const rec = ST.record(S.id, S.diff, win, used);
    B.lineupOf(M, "red").forEach((id) => B.addCharXp(id, win ? 60 : 20));
    B.save();
    FX.sfx(win ? "score" : "ui");
    const tips = S.def.gimmicks.map((g) => "・" + esc(L(g.hint))).join("<br>");
    open('<div class="vic"><div class="w' + (win ? "" : " lose") + '">' + (win ? "STAGE CLEAR" : "FAILED") + "</div>"
      + '<div class="note" style="margin-top:4px">' + esc(L(S.def.nm)) + " ・ " + esc(L(ST.DIFF[S.diff])) + "</div></div>"
      + '<div class="pn"><div class="kv">'
      + kv(J("ボス", "Boss"), L(S.def.boss)) + kv(J("与えたダメージ", "Damage dealt"), S.dealt)
      + kv(J("使ったショット", "Shots used"), used + " / " + S.shotsMax) + kv(J("ボスの残りHP", "Boss HP left"), Math.ceil(S.hp))
      + kv(J("熟練度", "Mastery"), "+" + (win ? 60 : 20) + " XP")
      + "</div></div>"
      + (rec.gems ? '<div class="pn red"><div class="en" style="font-size:22px">💎 +' + rec.gems + "</div><div class=\"note\">" + J("初回クリア報酬を受け取りました", "First clear reward received") + "</div></div>"
        : win ? '<div class="pn tight"><div class="note">' + J("この難易度の初回クリア報酬は受け取りずみです。", "The first clear reward for this difficulty was already claimed.") + "</div></div>" : "")
      + (win ? "" : '<div class="pn tight"><div class="note"><b>' + J("攻略のヒント", "Tips") + "</b><br>" + tips + "</div></div>")
      + '<div class="brow"><button class="btn" data-a="stageretry">RETRY</button><button class="btn pri" data-a="stagelist">STAGES</button></div>'
      + '<button class="btn gh" style="margin-top:8px" data-a="tohome">HOME</button>', true);
  }
  function stageEvent(e) {
    if (e.t === "stagepop") { FX.pop(e.title, e.sub, e.c); return true; }
    if (e.t === "stagedmg") {
      const host = $("#cwrap"); if (!host) return true;
      const p = toS(e.x, e.y);
      const el = document.createElement("div");
      el.className = "stgfloat";
      el.style.left = p.X + "px"; el.style.top = p.Y + "px"; el.style.color = e.c || "#fff";
      el.textContent = (e.n ? "-" + e.n + " " : "") + (e.label || "");
      host.appendChild(el);
      setTimeout(() => el.remove(), 950);
      return true;
    }
    if (e.t === "stagering" || e.t === "stagebeam") {
      stageFx.push(Object.assign({ age: 0 }, e));
      if (e.t === "stagering") FX.shake(12);
      return true;
    }
    return false;
  }
  function drawStageFx(dt) {
    stageFx = stageFx.filter((f) => (f.age += dt) < 0.7);
    stageFx.forEach((f) => {
      const k = f.age / 0.7;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.c; ctx.lineWidth = 5;
      if (f.t === "stagering") { ctx.beginPath(); ctx.arc(sx(f.x), sy(f.y), Math.max(1, f.r * k) * PX, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.shadowColor = f.c; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(sx(f.x1), sy(f.y1)); ctx.lineTo(sx(f.x2), sy(f.y2)); ctx.stroke(); }
      ctx.restore();
    });
  }

  /* ══════════════════════════════════════════════════════════════
     ⑨ 試合画面
     ══════════════════════════════════════════════════════════════ */
  function buildMatchDOM() {
    $("#s-match").innerHTML = ''
      + '<div class="mhead"><div class="msd red" id="mRed"><span class="sc" id="mScR">0</span><span class="nm" id="mNmR"></span></div>'
      + '<button class="mend" data-a="pause" title="MENU"><span class="e">END ❚❚</span><span class="n" id="mEnd">1/4</span></button>'
      + '<div class="msd blue" id="mBlue"><span class="nm" id="mNmB"></span><span class="sc" id="mScB">0</span></div></div>'
      + '<div class="order" id="mOrder"></div>'
      + '<div id="mStage"></div>'
      + '<div class="cwrap" id="cwrap"><canvas id="court"></canvas><div id="mGuide"></div><div class="aimhud" id="aimhud" hidden></div><div id="mTut"></div>'
      + '<span id="mNet" class="mnet"></span></div>'
      + '<div id="mCtrl"></div>';
    FX.setHost($("#cwrap"));
    bindCourt();
    fitCanvas();
    updateHUD();
  }
  function isCpuTurn() {
    if (!M) return false;
    if (M.replay) return true;
    if (tut) return false;
    const p = B.playerOf(M, M.turn);
    if (online) {
      if (p && p.cpu) return !online.host;          /* CPU の席はホストが動かす */
      if (p && online.host && online.absent && online.absent[p.uid]) return false;   /* 離脱中の人の番はホストが代わりに投げる */
      return !p || p.uid !== online.me;
    }
    return !!(p && p.cpu);
  }
  function isMyControl() {
    if (!M || M.phase === "over" || busy || thinking || M.replay) return false;
    if (online) {
      const p = B.playerOf(M, M.turn);
      if (!p || p.cpu) return false;
      return p.uid === online.me || !!(online.host && online.absent && online.absent[p.uid]);
    }
    return !isCpuTurn();
  }
  function updateHUD() {
    if (!M || cur !== "match") return;
    $("#mScR").textContent = M.score.red;
    $("#mScB").textContent = M.score.blue;
    $("#mEnd").textContent = M.stage ? L(window.MBRStage.DIFF[M.stage.diff]) : M.practice ? "—" : M.end + "/" + M.cfg.ends;
    const stg = $("#mStage");
    if (stg) stg.innerHTML = M.stage ? window.MBRStage.hudHTML(M) : "";
    const pr = B.playerOf(M, "red"), pb = B.playerOf(M, "blue");
    $("#mNmR").textContent = pr ? pr.name : "RED";
    $("#mNmB").textContent = pb ? pb.name : "BLUE";
    if (M.stage) {
      $("#mScR").textContent = Math.max(0, M.left.red | 0);
      $("#mScB").textContent = Math.max(0, Math.round(M.stage.hp / M.stage.maxHp * 100)) + "%";
      $("#mNmB").textContent = L(M.stage.def.boss);
    }
    $("#mRed").classList.toggle("turn", M.turn === "red");
    $("#mBlue").classList.toggle("turn", M.turn === "blue");
    /* 順番の帯：いまの担当＋次の3投 */
    const side = M.turn;
    const ch = M.phase === "jack" ? null : B.curCharOf(M, side);
    const ty = ch ? B.TYPES[ch.type] : null;
    const who = B.playerOf(M, side);
    let nx = "";
    for (let k = 1; k <= 3; k++) {
      const c2 = B.nextCharOf(M, side, k);
      if (c2) nx += '<div class="nx side-' + side + '" data-a="mchar" data-v="' + side + ":" + c2.id + '"><img src="' + esc(img(c2)) + '" alt=""><i>' + (k === 1 ? "NEXT" : "") + "</i></div>";
    }
    const dots = (sd) => { let h = ""; for (let i = 0; i < M.cfg.perSide; i++) h += '<i class="' + (i < M.left[sd] ? "" : "off") + '"></i>'; return h; };
    $("#mOrder").innerHTML = '<div class="cur" data-a="mchar" data-v="' + (ch ? side + ":" + ch.id : "") + '">' + (ch ? '<img src="' + esc(img(ch)) + '" alt="">' : '<div style="width:40px;height:40px;display:grid;place-items:center;background:#fff;color:#000;border-radius:50%;font-weight:900">J</div>')
      + '<div class="t"><div class="l1">' + (M.phase === "jack" ? "JACK BALL" : esc(ch ? ch.nm : "—")) + "</div>"
      + '<div class="l2" style="color:' + (ty ? ty.c : "#fff") + '">' + (M.phase === "jack" ? J("ジャックを投げる", "Throw the jack") : (ty ? ty.ja : "")) + " ・ "
      + '<span style="color:' + (side === "red" ? "var(--r3)" : "var(--b2)") + '">' + side.toUpperCase() + (who ? " " + esc(who.name) : "") + "</span></div></div></div>"
      + (M.phase === "jack" ? "" : '<span class="lbl">NEXT</span>' + nx)
      + (M.stage ? "" : '<div class="bl"><span>' + dots("red") + '</span><span class="b">' + dots("blue") + "</span></div>")
      + '<button class="pausebtn" data-a="pause" aria-label="MENU">❚❚</button>';
    /* 説明 */
    const g = B.takeHint(M);
    if (g) lastGuide = g;
    $("#mGuide").innerHTML = lastGuide ? '<div class="guide"><button class="gx" data-a="clearguide">✕</button>' + L(lastGuide) + "</div>" : "";
    /* 操作盤 */
    paintCtrl();
    const net = $("#mNet");
    if (net) net.innerHTML = online ? '<span class="netst' + (online.ok === false ? " bad" : "") + '"><i></i>' + (online.ok === false ? "OFFLINE" : "ONLINE") + " ・ " + esc(online.code || "") + "</span>"
      + (online.absentNames && online.absentNames.length ? '<span class="netst bad"><i></i>⚠ ' + esc(online.absentNames.join("・")) + J(" 離脱中（試合は続きます）", " away (match continues)") + "</span>" : "") : "";
    paintTut();
  }
  function paintCtrl() {
    const box = $("#mCtrl"); if (!box || !M) return;
    const side = M.turn;
    const mineNow = isMyControl() || (busy && !isCpuTurn());
    if (M.phase === "jack" || !M.md.skills) {
      box.innerHTML = '<div class="pn tight" style="margin:6px 0 0"><div class="note">'
        + (M.phase === "jack" ? J("白いジャックボールを<b>Vライン（黄色の点線）より奥</b>へ。ボールを引っぱって、はなす。", "Throw the white jack <b>past the V line</b>. Pull the ball back and release.")
          : J("ルール準拠モード：特殊ショットとスキルは使えません。腕前で勝負！", "Rules mode: no specials or skills — pure skill."))
        + (isCpuTurn() && !busy ? "<br><b>" + J("相手が考えています…", "Opponent is thinking…") + "</b>" : "") + "</div></div>";
      return;
    }
    const ch = B.curCharOf(M, side);
    if (!ch) { box.innerHTML = ""; return; }
    const i = B.charIdx(M, side);
    const gv = Math.round(M.gauge[side][i]);
    const kit = B.kitText(ch, lang());
    const dis = !isMyControl();
    const spBtn = (s) => {
      const can = B.canSpecial(M, side, s.k);
      const used = (M.spUsed[side][i][s.k] || 0) >= B.SPECIALS[s.k].uses;
      return '<button class="skb' + (sel.special === s.k ? " on" : "") + '" data-a="sp" data-v="' + s.k + '"' + (dis || !can ? " disabled" : "") + ' style="' + (sel.special === s.k ? "" : "box-shadow:inset 0 -3px 0 " + s.c) + '">'
        + '<span class="e">' + esc(s.nm) + '</span><span class="j">' + (used ? J("使用済み", "USED") : (s.cost ? "G" + s.cost + (en() ? "" : " ・ ") : "") + (en() ? (s.cost ? "" : "SPECIAL") : esc(s.sub))) + "</span></button>";
    };
    const actUsed = M.actUsed[side][i];
    const ultReady = gv >= B.GAUGE_MAX && !M.ultUsed[side];
    let desc = sel.ult ? kit.ult.d : sel.special ? kit.specials.find((x) => x.k === sel.special).d : sel.active ? kit.active.d : "";
    if (desc) desc += ' <span class="rlink" data-a="mchar" data-v="' + side + ":" + ch.id + '">ⓘ ' + J("キャラ詳細", "Details") + "</span>";
    box.innerHTML = '<div class="gauge' + (gv >= 100 ? " full" : "") + '"><i style="width:' + gv + '%"></i><span>' + (M.ultUsed[side] ? "ULT USED" : "GAUGE " + gv) + "</span></div>"
      + '<div class="skbar">' + kit.specials.map(spBtn).join("")
      + '<button class="skb' + (sel.active ? " on" : "") + '" data-a="act"' + (dis || actUsed ? " disabled" : "") + ' style="' + (sel.active ? "" : "box-shadow:inset 0 -3px 0 #2f8fff") + '">'
      + '<span class="e">' + esc(kit.active.nm) + '</span><span class="j">' + (actUsed ? J("使用済み", "USED") : "ACTIVE") + "</span></button>"
      + '<button class="skb ult' + (ultReady ? " ready" : "") + (sel.ult ? " on" : "") + '" data-a="ult"' + (dis || !ultReady ? " disabled" : "") + ">"
      + '<span class="e">ULT</span><span class="j">' + (M.ultUsed[side] ? J("使用済み", "USED") : gv + "%") + "</span></button></div>"
      + (desc ? '<div class="note" style="margin-top:5px;padding:5px 9px;background:#17171e">' + desc + "</div>"
        : '<div class="note" style="margin-top:4px;font-size:10.5px">' + (isCpuTurn() && !busy ? "<b>" + J("相手が考えています…", "Opponent is thinking…") + "</b>"
          : online && !isMyControl() && !busy ? "<b>" + J("相手の番です", "Opponent's turn") + "</b>"
          : "PASSIVE: <b>" + esc(kit.passive.nm) + "</b> ─ " + kit.passive.d) + ' <span class="rlink" data-a="rulesec" data-v="SKILLS">ⓘ ' + J("発動のルール", "Skill rules") + "</span></div>");
  }
  function paintTut() {
    const box = $("#mTut"); if (!box) return;
    if (!tut) { box.innerHTML = ""; return; }
    const S = TUT_STEPS[tut.step];
    box.innerHTML = S ? '<div class="tut"><div class="st">STEP ' + (tut.step + 1) + " / " + TUT_STEPS.length + " ・ " + esc(S.e) + '<span class="navi">NAVI ' + J("ずんだもん", "Zundamon") + "</span></div>"
      + '<div class="tx">' + L(S.tx) + "</div></div>" : "";
    /* ★ 2026-09-17c ステップが変わったら、ずんだもん（VOICEVOX）が読み上げる */
    if (S && tut.spoke !== tut.step) { tut.spoke = tut.step; FX.speak(B.tutClip(tut.step)); }
  }

  /* ── コートの描画 ── */
  let cv = null, ctx = null, PX = 40, OX = 0, OY = 0;
  function fitCanvas() {
    cv = $("#court"); if (!cv) return;
    ctx = cv.getContext("2d");
    const wrap = cv.parentNode;
    const w = wrap.clientWidth;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const ctrlH = 124 + 10;   /* 操作盤（#mCtrl は CSS で高さ固定） */
    const h = Math.max(260, Math.min(window.innerHeight - top - ctrlH - 8, w * 2.2));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    PX = Math.min((w - 20) / C.W, (h - 14) / C.L);
    OX = (w - C.W * PX) / 2;
    OY = (h - C.L * PX) / 2;
    cv._w = w; cv._h = h;
  }
  const sx = (x) => OX + x * PX;
  const sy = (y) => OY + (C.L - y) * PX;
  const ux = (px) => (px - OX) / PX;
  const toS = (x, y) => ({ X: sx(x), Y: sy(y) });

  function drawCourt(dt, tsec) {
    if (!ctx || !M) return;
    const w = cv._w, h = cv._h;
    const sh = FX.shakeOffset(dt);
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#07090e"; ctx.fillRect(0, 0, w, h);
    /* 外の地：斜めの赤い光 */
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = "#e8173a";
    ctx.beginPath(); ctx.moveTo(w * 0.62, 0); ctx.lineTo(w * 0.7, 0); ctx.lineTo(w * 0.3, h); ctx.lineTo(w * 0.22, h); ctx.fill(); ctx.restore();
    ctx.translate(sh.x, sh.y);
    /* コート面 */
    const g = ctx.createLinearGradient(0, sy(C.L), 0, sy(0));
    g.addColorStop(0, "#1b3a5e"); g.addColorStop(1, "#24507c");
    ctx.fillStyle = g; ctx.fillRect(sx(0), sy(C.L), C.W * PX, C.L * PX);
    ctx.strokeStyle = "rgba(255,255,255,.04)"; ctx.lineWidth = 1;
    for (let i = 1; i < 30; i++) { const xx = sx(C.W * i / 30); ctx.beginPath(); ctx.moveTo(xx, sy(C.L)); ctx.lineTo(xx, sy(0)); ctx.stroke(); }
    /* 壁（能力モード）／外枠 */
    if (M.cfg.walls) {
      ctx.shadowColor = "#ff3b52"; ctx.shadowBlur = 10;
      ctx.strokeStyle = "#ff3b52"; ctx.lineWidth = 4;
      ctx.strokeRect(sx(0) - 2, sy(C.L) - 2, C.W * PX + 4, C.L * PX + 4);
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2;
      ctx.strokeRect(sx(0), sy(C.L), C.W * PX, C.L * PX);
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.font = "10px Anton,Orbitron,sans-serif";
      ctx.fillText("OUT = DEAD BALL", sx(0) + 4, sy(C.L) - 4);
    }
    /* 投球ボックス */
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(sx(0), sy(C.BOXD)); ctx.lineTo(sx(C.W), sy(C.BOXD)); ctx.stroke();
    for (let i = 1; i < C.BOXES; i++) { const x = sx(C.W * i / C.BOXES); ctx.beginPath(); ctx.moveTo(x, sy(0)); ctx.lineTo(x, sy(C.BOXD)); ctx.stroke(); }
    if (isMyControl()) {
      ctx.fillStyle = M.turn === "red" ? "rgba(255,59,82,.18)" : "rgba(47,143,255,.2)";
      ctx.fillRect(sx(C.W * slot / C.BOXES), sy(C.BOXD), C.W / C.BOXES * PX, C.BOXD * PX);
    }
    /* V ライン */
    ctx.strokeStyle = "#ffc83d"; ctx.lineWidth = 2; ctx.setLineDash([9, 7]);
    ctx.beginPath(); ctx.moveTo(sx(0), sy(C.VLINE)); ctx.lineTo(sx(C.W), sy(C.VLINE)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,200,61,.9)"; ctx.font = "italic 11px Anton,Orbitron,sans-serif";
    ctx.fillText("V LINE", sx(0) + 6, sy(C.VLINE) - 5);
    /* クロス */
    ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 1.6;
    const cx = sx(C.W / 2), cy = sy(C.CROSS);
    ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx + 9, cy); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx, cy + 9); ctx.stroke();
    const V = { x: sx, y: sy, px: PX };
    if (M.stage && window.MBRStage) window.MBRStage.drawUnder(ctx, M, V, tsec);

    const r = B.ballR(M) * PX;
    const j = B.jackOf(M);
    /* ジャックまでの線（止まっているとき） */
    if (j && !busy && !M.stage) {
      const list = B.live(M).filter((b) => !b.jack).sort((a, b) => B.dist(a, j) - B.dist(b, j));
      if (list[0]) {
        ctx.setLineDash([4, 5]); ctx.lineWidth = 1.5;
        ctx.strokeStyle = list[0].side === "red" ? "rgba(255,90,110,.9)" : "rgba(124,196,255,.9)";
        ctx.beginPath(); ctx.moveTo(sx(j.x), sy(j.y)); ctx.lineTo(sx(list[0].x), sy(list[0].y)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#fff"; ctx.font = "italic 12px Anton,Orbitron,sans-serif";
        ctx.fillText(Math.round(B.dist(list[0], j) * 100) + "cm", (sx(j.x) + sx(list[0].x)) / 2 + 6, (sy(j.y) + sy(list[0].y)) / 2);
      }
    }
    /* 軌跡 */
    if (M.cur && !M.cur.dead) {
      trail.push({ x: M.cur.x, y: M.cur.y });
      if (trail.length > 26) trail.shift();
    }
    if (trail.length > 1 && FXlevel() !== "off") {
      const col = M.cur ? (M.cur.jack ? "255,255,255" : M.cur.side === "red" ? "255,70,95" : "90,170,255") : "255,255,255";
      for (let i = 1; i < trail.length; i++) {
        ctx.strokeStyle = "rgba(" + col + "," + (i / trail.length * 0.55) + ")";
        ctx.lineWidth = r * 1.3 * (i / trail.length);
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(sx(trail[i - 1].x), sy(trail[i - 1].y)); ctx.lineTo(sx(trail[i].x), sy(trail[i].y)); ctx.stroke();
      }
    }
    if (!busy) trail.length = 0;
    /* ボール */
    B.live(M).forEach((b) => {
      const c = b.jack ? null : charOf(b.charId);
      FX.drawBall(ctx, sx(b.x), sy(b.y), r, {
        side: b.side, jack: b.jack, char: c, skin: c ? (b.side === mySide() || !online ? skinForSide(b) : "std") : "",
        rot: (b.roll || 0) / Math.max(0.05, B.ballR(M)) * (b.vx >= 0 ? 1 : -1), guard: b.guard, shock: b.shockT > 0, t: tsec,
      });
    });
    if (M.stage && window.MBRStage) { window.MBRStage.drawOver(ctx, M, V, tsec); drawStageFx(dt); }
    /* 手元のボールと引っぱり */
    if (isMyControl()) drawAim(r, tsec);
    FX.drawParticles(ctx, dt);
    ctx.restore();
  }
  function mySide() { return online ? online.side : "red"; }
  function skinForSide(b) { return b.charId ? skinOf(b.charId) : "std"; }
  function FXlevel() { return B.load().fxLevel || "full"; }

  function aimVec() {
    const sp = B.throwSpot(M, M.turn, slot);
    const X = sx(sp.x), Y = sy(sp.y);
    const dx = aim.x - X, dy = aim.y - Y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const maxLen = Math.min(cv._w, cv._h) * 0.42;
    const p = clamp(len / maxLen, 0, 1);
    const sang = Math.atan2(-dy, -dx);
    return { X, Y, p, sang, cang: toCourtAngle(sang) };
  }
  function drawAim(r, tsec) {
    const sp = B.throwSpot(M, M.turn, slot);
    const X = sx(sp.x), Y = sy(sp.y);
    const isJack = M.phase === "jack";
    const ch = isJack ? null : B.curCharOf(M, M.turn);
    FX.drawBall(ctx, X, Y, r, { side: M.turn, jack: isJack, char: ch, skin: ch ? skinOf(ch.id) : "", t: tsec });
    /* 押せる場所の目印（脈打つ輪） */
    ctx.strokeStyle = "rgba(255,255,255," + (0.35 + Math.sin(tsec * 4) * 0.25) + ")";
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, r * 1.6 + Math.sin(tsec * 4) * 2, 0, Math.PI * 2); ctx.stroke();
    const hud = $("#aimhud");
    if (!aim || !aim.dragging) {
      if (hud) hud.hidden = true;
      ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "900 11px 'Noto Sans JP',sans-serif"; ctx.textAlign = "center";
      ctx.fillText(J("引っぱって、はなす", "PULL & RELEASE"), X, Y - r - 12);
      ctx.textAlign = "left";
      return;
    }
    const v = aimVec();
    const col = isJack ? "#ffffff" : (M.turn === "red" ? "#ff3b52" : "#2f8fff");
    /* 引いた側の線（指まで） */
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(aim.x, aim.y); ctx.stroke(); ctx.setLineDash([]);
    /* 矢印 */
    ctx.save(); ctx.translate(X, Y); ctx.rotate(v.sang);
    /* ★ 矢印は短め・チーム色。長い白い矢印だと、上に重ねる予測の点線が見えなくなる */
    const L2 = 26 + v.p * 58;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(r + 2, -4 - v.p * 3); ctx.lineTo(L2, -2); ctx.lineTo(L2, -11); ctx.lineTo(L2 + 18, 0); ctx.lineTo(L2, 11); ctx.lineTo(L2, 2); ctx.lineTo(r + 2, 4 + v.p * 3); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    /* 予測 */
    const mods = isJack ? { preview: 0.6 } : B.shotMods(M, M.turn, ch, sel);
    let vis = mods.preview;
    const assist = B.load().aimAssist || "normal";
    if (assist === "beginner") vis = Math.max(vis, 0.92);
    if (assist === "expert") vis = Math.min(vis, 0.3);
    if (M.cfg.competition) vis = Math.min(vis, 0.35);
    if (M.kind !== "practice" && !tut) { if (M.cfg.difficulty === "expert") vis *= 0.8; if (M.cfg.difficulty === "master") vis *= 0.6; }
    if (mods.fullPreview) vis = 1;
    const key = [slot, v.cang.toFixed(3), v.p.toFixed(3), sel.special, sel.active, sel.ult, M.shotNo].join("|");
    if (key !== predKey) {
      predKey = key;
      predCache = B.predict(M, { side: M.turn, jack: isJack, angle: v.cang, power: v.p, slot, special: sel.special, active: sel.active, ult: sel.ult });
    }
    const pr = predCache;
    const n = Math.max(2, Math.round(pr.path.length * clamp(vis, 0.3, 1)));
    /* ★★ 2026-09-17b 「点線が表示されないエリアがある」（ご報告）。
       CONTROL で見える長さを切っていたので、その先が<b>丸ごと消えて</b>見えていた。
       いまは<b>終点までうすい細線</b>を必ず引き、見える長さのぶんだけ<b>太い黄色の点線</b>を重ねる。
       ★ ドラッグ中は上の説明の帯も隠す（帯の下に線がもぐりこんでいた）。 */
    ctx.beginPath();
    for (let i = 0; i < pr.path.length; i++) { const q = pr.path[i]; if (i === 0) ctx.moveTo(sx(q.x), sy(q.y)); else ctx.lineTo(sx(q.x), sy(q.y)); }
    ctx.setLineDash([3, 6]); ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const q = pr.path[i]; if (i === 0) ctx.moveTo(sx(q.x), sy(q.y)); else ctx.lineTo(sx(q.x), sy(q.y)); }
    ctx.setLineDash([7, 6]); ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = "#ffe14d"; ctx.lineWidth = 2.6; ctx.stroke(); ctx.setLineDash([]);
    const shown = pr.path.slice(0, n);
    const within = (pt) => shown.some((q) => Math.abs(q.x - pt.x) < 0.4 && Math.abs(q.y - pt.y) < 0.4);
    /* 反射の印 */
    if (assist !== "expert") pr.bounces.forEach((bp) => {
      if (!within(bp)) return;
      ctx.fillStyle = "#ff8a2a"; ctx.save(); ctx.translate(sx(bp.x), sy(bp.y)); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10); ctx.restore();
    });
    /* 衝突の印 */
    if (pr.firstHit && within(pr.firstHit) && assist !== "expert") {
      const hx = sx(pr.firstHit.x), hy = sy(pr.firstHit.y);
      ctx.strokeStyle = pr.firstHit.t === "jack" ? "#7cc4ff" : "#ffc83d"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(hx - 8, hy - 8); ctx.lineTo(hx + 8, hy + 8); ctx.moveTo(hx + 8, hy - 8); ctx.lineTo(hx - 8, hy + 8); ctx.stroke();
    }
    /* 止まる位置 */
    if (vis >= 0.9 && assist !== "expert") {
      ctx.beginPath(); ctx.arc(sx(pr.stop.x), sy(pr.stop.y), r, 0, Math.PI * 2);
      ctx.strokeStyle = pr.dead ? "#ff3b52" : "rgba(255,255,255,.9)"; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (pr.dead) { ctx.fillStyle = "#ff3b52"; ctx.font = "italic 11px Anton,Orbitron"; ctx.fillText("OUT", sx(pr.stop.x) + r + 3, sy(pr.stop.y)); }
    }
    if (hud) {
      hud.hidden = false;
      const deg = Math.round(Math.atan2(Math.cos(v.cang), Math.sin(v.cang)) * 180 / Math.PI);
      hud.innerHTML = '<div><small>POWER</small><b>' + Math.round(v.p * 100) + '%</b></div><div><small>ANGLE</small><b>' + deg + '°</b></div>'
        + (sel.special || sel.active || sel.ult ? '<div style="background:rgba(232,23,58,.85)"><small>SKILL</small><b>' + esc(sel.ult ? "ULT" : sel.special ? B.SPECIALS[sel.special].en : "ACTIVE") + "</b></div>" : "");
    }
  }

  /* ── ループ ── */
  function startLoop() {
    cancelAnimationFrame(raf);
    lastTs = performance.now();
    const tick = (ts) => {
      if (cur !== "match") { raf = 0; return; }
      const dt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
      /* ★ BOSS STAGE：投げる前もゲートや動く障害物は動いている（止まっている間は実時間で進める） */
      if (M && M.stage && !busy && M.phase !== "over") M.envT = (M.envT || 0) + dt;
      /* ★ ゲートの開閉など、時間で変わる表示は HUD も 0.25 秒ごとに描き直す */
      if (M && M.stage && ts - (M._hudTs || 0) > 250) { M._hudTs = ts; const stg = $("#mStage"); if (stg) stg.innerHTML = window.MBRStage.hudHTML(M); }
      if (busy && !thinking && !hold && M && M.phase !== "over") {
        let moved = false;
        for (let i = 0; i < 4; i++) moved = B.step(M) || moved;
        if (M.fx && M.fx.length) {
          const evs = M.fx.splice(0);
          evs.forEach((e) => {
            if (stageEvent(e)) return;
            FX.onEvent(e, toS, PX);
            if (e.t === "hit" && M.cur && M.cur.charId) FXvoice(charOf(M.cur.charId), "hit");
            if (e.t === "jack" && M.cur && M.cur.charId) FXvoice(charOf(M.cur.charId), "jack");
          });
        }
        if (!moved) onSettled();
      } else if (M && M.fx && M.fx.length) {
        M.fx.splice(0).forEach((e) => { if (!stageEvent(e)) FX.onEvent(e, toS, PX); });
      }
      drawCourt(dt, ts / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  let voiceT = 0;
  function FXvoice(c, kind) {
    if (!c || tut || Date.now() - voiceT < 2500) return;
    voiceT = Date.now();
    /* ★★ 2026-09-17d キャラのボイスは廃止（ご指定） */
  }
  function bindCourt() {
    const el = $("#court");
    if (!el || el._bound) return;
    el._bound = 1;
    const pos = (e) => {
      const r = el.getBoundingClientRect();
      const p = e.touches ? e.touches[0] || e.changedTouches[0] : e;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const down = (e) => {
      if (!isMyControl()) return;
      e.preventDefault();
      const q = pos(e);
      const sp = B.throwSpot(M, M.turn, slot);
      const X = sx(sp.x), Y = sy(sp.y);
      const near = Math.sqrt((q.x - X) * (q.x - X) + (q.y - Y) * (q.y - Y)) < 80;
      if (!near && q.y > sy(C.BOXD) && q.y < sy(0) + 10) {
        slot = clamp(Math.floor(ux(q.x) / (C.W / C.BOXES)), 0, C.BOXES - 1);
        FX.sfx("ui");
        return;
      }
      aim = { x: q.x, y: q.y, dragging: true };
      const gd = $("#mGuide"); if (gd) gd.hidden = true;
    };
    const move = (e) => { if (aim && aim.dragging) { e.preventDefault(); const q = pos(e); aim.x = q.x; aim.y = q.y; } };
    const up = (e) => {
      if (!aim || !aim.dragging) { aim = null; return; }
      e.preventDefault();
      const v = aimVec();
      aim = null;
      const hud = $("#aimhud"); if (hud) hud.hidden = true;
      const gd = $("#mGuide"); if (gd) gd.hidden = false;
      if (v.p < 0.06) return;
      localThrow(v.cang, v.p);
    };
    el.addEventListener("mousedown", down); el.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("mousemove", move); el.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up); el.addEventListener("touchend", up, { passive: false });
    el.addEventListener("touchcancel", () => { aim = null; });
  }
  function toCourtAngle(a) { return Math.atan2(-Math.sin(a), Math.cos(a)); }

  /* ── 投げる ── */
  function localThrow(angle, power) {
    if (!isMyControl()) return;
    const isJack = M.phase === "jack";
    const shot = { side: M.turn, jack: isJack, angle, power, slot,
                   special: isJack ? "" : sel.special, active: !isJack && sel.active, ult: !isJack && sel.ult,
                   playerIdx: M.idx[M.turn], noJitter: false };
    const b = applyThrow(shot);
    if (online && window.MBROnline && b) {
      const lg = M.log[M.log.length - 1];
      MBROnline.sendShot({ n: M.log.length - 1, side: lg.side, jack: lg.jack, dx: lg.dx, dy: lg.dy, power: lg.power, slot: lg.slot,
                           special: lg.special, active: lg.active, ult: lg.ult });
    }
    if (tut) tut.lastShot = shot;
  }
  function applyThrow(shot) {
    const ch = shot.jack ? null : B.curCharOf(M, shot.side);
    const b = B.throwBall(M, shot);
    sel = { special: "", active: false, ult: false };
    predKey = "";
    busy = true; trail = [];
    FX.sfx("throw"); FX.vib(12);
    if (b.use && b.use.ult && ch) {
      hold = true;
      FX.sfx("ult");
      const vo = B.voiceOf(ch, "ult", M.shotNo);
      FX.cutIn(ch, "ult", ch.ult.nm, B.ULTS[ch.type].en, vo).then(() => { hold = false; });
    } else if (b.use && (b.use.special || b.use.active) && ch) {
      FX.sfx("special");
      const t1 = b.use.special ? B.SPECIALS[b.use.special].en : B.ACTIVES[ch.active].en;
      const t2 = b.use.special ? (en() ? "SPECIAL SHOT" : B.SPECIALS[b.use.special].ja) : (en() ? "ACTIVE SKILL" : B.ACTIVES[ch.active].ja);
      FX.cutIn(ch, "special", t1, t2);
    }
    updateHUD();
    return b;
  }
  /* オンライン：相手の投球 */
  function remoteShot(s) {
    if (!M || !online) return false;
    if (busy || thinking || hold || endPending) return false;   /* まだ前の球が転がっている／得点表示中 → 呼び出し側が待つ */
    if (s.side !== M.turn) return true;               /* 順番でない投球は捨てる（処理済みあつかい） */
    applyThrow({ side: s.side, jack: !!s.jack, dx: s.dx, dy: s.dy, power: s.power, slot: s.slot,
                 special: s.special || "", active: !!s.active, ult: !!s.ult, noJitter: true });
    return true;
  }
  function selToggle(k, v) {
    if (!isMyControl()) return;
    if (k === "sp") sel.special = sel.special === v ? "" : v;
    if (k === "act") sel.active = !sel.active;
    if (k === "ult") sel.ult = !sel.ult;
    predKey = "";
    FX.sfx("ui");
    paintCtrl();
  }

  /* ── 手番 ── */
  function startTurn() {
    if (!M || cur !== "match" || M.phase === "over") return;
    updateHUD();
    const side = M.turn;
    const key = side + ":" + M.end + ":" + M.idx[side] + ":" + M.phase;
    if (key === shownTurn) { maybeCpu(); return; }
    shownTurn = key;
    if (M.phase === "play" && !M.replay) {
      const ch = B.curCharOf(M, side);
      if (ch) {
        const vo = B.voiceOf(ch, "enter", M.idx[side]);
        FX.cutIn(ch, "enter", "", "NEXT THROW ・ " + side.toUpperCase(), vo);
      }
      if (M.cfg.players[side] && M.cfg.players[side].length > 1 && !isCpuTurn() && !online) {
        const p = B.playerOf(M, side);
        toast((p ? p.name : side.toUpperCase()) + J(" の番です ─ 端末をわたしてください", "'s turn — pass the device"));
      }
      if (B.canUlt(M, side) && !isCpuTurn()) B.pushHint(M, "ultready");
    }
    maybeCpu();
  }
  function maybeCpu() {
    if (!M || M.replay || tut || M.phase === "over" || !isCpuTurn() || busy || thinking) return;
    if (online) {
      const p = B.playerOf(M, M.turn);
      if (!(p && p.cpu && online.host)) return;       /* オンラインで CPU を動かすのはホストだけ */
    }
    thinking = true;
    updateHUD();
    setTimeout(() => {
      if (!M || cur !== "match" || M.phase === "over" || endPending) { thinking = false; return; }
      const side = M.turn;
      let shot;
      if (M.phase === "jack") shot = B.cpuJack(M, side, 2);
      else {
        /* ★ オンラインでは試合の乱数を使わない（クローンの乱数で考える＝相手の端末とずれない） */
        const base = online ? B.cloneM(M) : M;
        shot = B.cpuPick(base, side, M.cfg.difficulty);
      }
      thinking = false;
      const b = applyThrow(Object.assign({ side, jack: M.phase === "jack", playerIdx: M.idx[side], noJitter: !!online }, shot));
      if (online && window.MBROnline && b) {
        const lg = M.log[M.log.length - 1];
        MBROnline.sendShot({ n: M.log.length - 1, side: lg.side, jack: lg.jack, dx: lg.dx, dy: lg.dy, power: lg.power, slot: lg.slot,
                             special: lg.special, active: lg.active, ult: lg.ult, cpu: true });
      }
    }, 650 + Math.random() * 450);
  }

  /* ── 止まった ── */
  function onSettled() {
    busy = false;
    const res = B.finishShot(M);
    trail = [];
    if (online && window.MBROnline) MBROnline.sendHash(M.log.length - 1, B.boardHash(M));
    if (M.phase === "jack") {
      if (!B.jackValid(M)) {
        M.balls = M.balls.filter((b) => !b.jack);
        B.pushHint(M, "jackline", true);
        FX.pop("RETHROW", J("Vラインを越えていません", "Didn't pass the V line"), "#ffc83d");
        if (tut) tutEvent("jackfail");
        updateHUD(); maybeCpu();
        return;
      }
      M.phase = "play";
      B.pushHint(M, "firstcolor");
      M.turn = M.first;
      if (tut) tutEvent("jack");
      shownTurn = "";
      startTurn();
      return;
    }
    if (res.chain >= 2) B.pushHint(M, "chain");
    if (res.gain >= 14 && FXlevel() !== "off") FX.popLite("GAUGE +" + res.gain, "#ffc83d");
    if (M.balls.some((b) => b.dead && !b._noted)) { M.balls.forEach((b) => { if (b.dead) b._noted = 1; }); B.pushHint(M, "deadball"); }
    if (M.cur == null && M.balls.some((b) => (b.banks || 0) > 0)) B.pushHint(M, "bank");
    if (tut) { tutEvent("settled", res); return; }
    if (M.stage) { stageSettled(); return; }
    if (M.practice) {
      if (M.left.red <= 0 && M.left.blue <= 0) { M.balls = []; M.left = { red: 6, blue: 6 }; M.phase = "jack"; M.idx = { red: 0, blue: 0 }; M.turn = "red"; }
      else M.turn = M.left[B.other(M.turn)] > 0 ? B.other(M.turn) : M.turn;
      startTurn();
      return;
    }
    hintByBoard();
    const nx = B.nextTurn(M);
    if (!nx) { showEnd(); return; }
    if (nx !== M.turn) B.pushHint(M, "farthrows");
    M.turn = nx;
    startTurn();
  }
  function hintByBoard() {
    const j = B.jackOf(M); if (!j) return;
    const last = M.balls.filter((b) => !b.jack).slice(-1)[0];
    if (!last) return;
    const d = B.dist(last, j);
    if (d > 1.6 && last.y < j.y) B.pushHint(M, "tooweak");
    else if (last.y > j.y + 1.6) B.pushHint(M, "toostrong");
    const near = B.live(M).filter((b) => b.side === last.side && B.dist(b, j) < 0.7).length;
    if (near >= 2) B.pushHint(M, "guarding");
    const opp = B.live(M).filter((b) => b.side && b.side !== last.side);
    if (opp.some((b) => B.dist(b, j) < 0.5)) B.pushHint(M, "canhit");
  }

  /* ── エンドの得点 ── */
  function showEnd() {
    endPending = true;
    const res = B.scoreEnd(M);
    B.pushHint(M, "scoring");
    FX.sfx("score");
    const rows = res.rows || [];
    const maxd = rows.length ? Math.max(0.4, rows[rows.length - 1].d) : 1;
    const last = M.end >= M.cfg.ends && M.score.red + (res.side === "red" ? res.pts : 0) !== M.score.blue + (res.side === "blue" ? res.pts : 0);
    open(ttl("END " + M.end, J("エンドの得点", "End score"))
      + '<div class="vic"><div class="w" style="font-size:54px;color:' + (res.side === "red" ? "var(--r2)" : res.side === "blue" ? "var(--b2)" : "#fff") + '">'
      + (res.side ? "+" + res.pts + " " + res.side.toUpperCase() : "NO SCORE") + "</div></div>"
      + '<div class="pn">' + rows.slice(0, 12).map((x) => {
          const c = charOf(x.b.charId);
          return '<div class="sw" style="padding:5px 0"><span style="width:12px;height:12px;border-radius:50%;flex:none;background:' + (x.b.side === "red" ? "var(--r2)" : "var(--b)") + '"></span>'
            + '<div class="k" style="font-size:11.5px">' + esc(c ? c.nm : "") + (x.b.guard ? " 🛡" : "") + '<div class="stats" style="display:block"><div class="bar"><i style="width:' + Math.round(clamp(x.d / maxd, 0.04, 1) * 100) + '%;background:' + (x.b.side === "red" ? "var(--r)" : "var(--b)") + '"></i></div></div></div>'
            + '<div class="en" style="font-size:15px">' + Math.round(x.d * 100) + "cm</div></div>";
        }).join("") + "</div>"
      + '<div class="pn tight"><div class="note">' + esc(B.scoreText(M, res, lang())) + "</div></div>"
      + '<button class="btn pri" data-a="nextend">' + (last ? "RESULT" : "NEXT END") + "</button>", true);
  }
  function nextEnd() {
    if (!endPending || !M) return;          /* ★ 二度押し・閉じたシートの残りから呼ばれても1回だけ */
    endPending = false;
    close();
    B.closeEnd(M);
    if (M.phase === "over") { showResult(); return; }
    lastGuide = null; shownTurn = "";
    updateHUD();
    startTurn();
  }

  /* ── 結果・MVP ── */
  function showResult() {
    const s = B.load();
    const me = mySide();
    const win = M.score.red > M.score.blue ? "red" : M.score.blue > M.score.red ? "blue" : null;
    const won = win === me;
    const loc = !online && !M.cfg.players.blue.some((p) => p.cpu) && !M.cfg.players.red.some((p) => p.cpu);
    s.matches++; if (won) s.wins++;
    if (M.kind === "cpu" || M.kind === "quick" || M.kind === "ranked") { s.cpuMatches++; if (won) s.cpuWins++; }
    if (M.kind === "ranked") { s.rankMatches++; if (won) s.rankWins++; }
    if (M.kind === "team") { s.teamMatches++; if (won) s.teamWins++; }
    if (online) { s.onMatches++; if (won) s.onWins++; }
    const st = M.stats[me];
    s.throws += st.throws; s.hits += st.hits; s.jackHits += st.jackHits; s.banks += st.banks;
    s.chains += st.chains; s.bestChain = Math.max(s.bestChain, st.bestChain);
    s.sumDist += st.sumDist; s.nDist += st.nDist;
    let rp = 0;
    if (M.kind === "ranked") {
      const base = { easy: 12, normal: 20, hard: 28, expert: 38, master: 50 }[M.cfg.difficulty] || 20;
      rp = won ? base + Math.max(0, M.score[me] - M.score[B.other(me)]) * 2 : win ? -Math.round(base * 0.45) : 0;
      B.addRp(rp);
      if (window.MBROnline && MBROnline.pushRank) MBROnline.pushRank(B.load().rp, myLineup()[0]);
    }
    /* MVP：味方（ローカル2人対戦ならどちらでも）で、いちばん働いたキャラ */
    const sides = loc ? ["red", "blue"] : [me];
    let mvp = null, mvpS = -1, mvpSide = me;
    sides.forEach((sd) => {
      const per = M.stats[sd].perChar;
      Object.keys(per).forEach((id) => {
        const x = per[id];
        const sc = x.hits * 3 + x.jack * 3 + x.chain * 2 + x.banks + x.throws * 0.5 + (sd === win ? 2 : 0);
        if (sc > mvpS) { mvpS = sc; mvp = id; mvpSide = sd; }
      });
    });
    const mc = charOf(mvp);
    /* 熟練度 */
    const xpRows = [];
    const lu = M.cfg.lineup[me] || [];
    const trained = !(M.kind === "friend" && false);
    lu.forEach((id) => {
      if (!OWN.has(id) || !trained) return;
      const x = M.stats[me].perChar[id] || { throws: 0, hits: 0, jack: 0, chain: 0 };
      const gain = 20 + x.throws * 5 + x.hits * 3 + x.jack * 3 + x.chain * 4 + (won ? 30 : 0) + (id === mvp ? 20 : 0);
      const lvup = B.addCharXp(id, gain);
      const pr = s.chars[id]; pr.games = (pr.games || 0) + 1; if (won) pr.wins = (pr.wins || 0) + 1;
      xpRows.push({ id, gain, lvup });
    });
    s.replays.unshift({ at: Date.now(), kind: M.kind, score: Object.assign({}, M.score), log: M.log.slice(0, 260),
      cfg: { seed: M.cfg.seed, ends: M.cfg.ends, lineup: M.cfg.lineup, rules: M.cfg.rules, growth: M.cfg.growth, levels: M.cfg.levels, awk: M.cfg.awk, first: M.cfg.first, perSide: M.cfg.perSide },
      best: st.bestChain });
    s.replays = s.replays.slice(0, 5);
    B.save();
    if (online && window.MBROnline) MBROnline.sendResult(M.score, B.boardHash(M));
    const vo = mc ? B.voiceOf(mc, won || loc ? "win" : "lose", 0) : "";
    open(''
      + '<div class="vic"><div class="w' + (won || loc ? "" : " lose") + '">' + (win ? (loc ? win.toUpperCase() + " WIN" : won ? "VICTORY" : "DEFEAT") : "DRAW") + "</div>"
      + '<div class="sc"><span class="r">' + M.score.red + '</span><span style="font-size:24px;color:var(--sub)">-</span><span class="b">' + M.score.blue + "</span></div>"
      + (rp ? '<div class="rp" style="color:' + (rp > 0 ? "var(--gold)" : "var(--r3)") + '">RP ' + (rp > 0 ? "+" : "") + rp + " ・ " + B.rankOf(s.rp).ja + "</div>" : "")
      + (online ? '<div class="note" style="margin-top:4px">' + J("結果は両方の端末の盤面照合で確定します。", "Result is confirmed by both devices' board check.") + '<span id="resConf"></span></div>' : "")
      + "</div>"
      + (mc ? '<div class="mvp"><img src="' + esc(img(mc)) + '" alt=""><div><div class="e">MVP</div><div class="nm">' + esc(mc.nm) + "</div>"
        + '<div class="why">' + mvpWhy(M.stats[mvpSide].perChar[mvp]) + "</div>" + (vo ? '<div class="why" style="color:#fff">「' + esc(vo) + "」</div>" : "") + "</div></div>" : "")
      + hd("STATS", J("この試合の記録", "Match stats"))
      + '<div class="pn"><div class="kv">'
      + kv(J("投球", "Throws"), st.throws) + kv(J("ヒット", "Hits"), st.hits) + kv(J("ジャックヒット", "Jack hits"), st.jackHits)
      + kv(J("バンク", "Banks"), st.banks) + kv(J("最大コンボ", "Best chain"), st.bestChain ? "×" + st.bestChain : "—")
      + kv(J("特殊ショット", "Specials"), st.specials) + kv("ULT", st.ults)
      + kv(J("最短距離", "Closest"), st.best < 90 ? Math.round(st.best * 100) + "cm" : "—")
      + "</div></div>"
      + (xpRows.length ? hd("MASTERY", J("熟練度", "Mastery")) + '<div class="pn tight">' + xpRows.map((x) => {
          const c = charOf(x.id);
          return '<div class="xpl"><img src="' + esc(img(c)) + '" alt=""><b>' + esc(c.nm) + '</b><span class="note">+' + x.gain + " XP</span>"
            + (x.lvup.after > x.lvup.before ? '<span class="up">LEVEL UP! Lv.' + x.lvup.after + "</span>" : '<span class="note" style="margin-left:auto">Lv.' + x.lvup.after + "</span>") + "</div>";
        }).join("") + "</div>" : "")
      + '<div class="brow"><button class="btn" data-a="replay" data-v="0">▶ REPLAY</button>'
      + (online ? "" : '<button class="btn" data-a="again">AGAIN</button>') + "</div>"
      + '<button class="btn pri" style="margin-top:8px" data-a="tohome">HOME</button>', true);
  }
  function mvpWhy(x) {
    if (!x) return "";
    const t = [];
    if (x.hits) t.push(J("ヒット", "Hits ") + x.hits);
    if (x.jack) t.push(J("ジャック", "Jack ") + x.jack);
    if (x.chain >= 2) t.push("CHAIN ×" + x.chain);
    if (x.banks) t.push(J("バンク", "Banks ") + x.banks);
    return t.join(" ・ ") || J("堅実な置き", "Steady placement");
  }

  /* ── リプレイ ── */
  function openReplay(i) {
    const s = B.load();
    const rep = s.replays[i || 0];
    if (!rep || !rep.cfg) { toast(J("このリプレイは古い形式のため再生できません。", "This replay uses an old format.")); return; }
    close();
    const c = rep.cfg;
    M = B.newMatch({ kind: "replay", ends: c.ends, perSide: c.perSide || 6, seed: c.seed, lineup: c.lineup, rules: c.rules, growth: c.growth,
      levels: c.levels, awk: c.awk, first: c.first, guide: "off", players: { red: [{ name: "RED" }], blue: [{ name: "BLUE" }] } });
    M.kind = rep.kind;
    M.replay = { log: rep.log.slice(), i: 0 };
    online = null; tut = null;
    busy = false; thinking = false; hold = false; shownTurn = "";
    go("match"); buildMatchDOM(); startLoop();
    stepReplay();
  }
  function stepReplay() {
    if (!M || !M.replay || cur !== "match") return;
    const r = M.replay;
    if (busy || hold) { setTimeout(stepReplay, 150); return; }
    if (r.i >= r.log.length) { FX.pop("REPLAY END", "", "#fff"); return; }
    const e = r.log[r.i];
    if (e.end !== M.end) { B.closeEnd(M); updateHUD(); }
    r.i++;
    M.turn = e.side;
    if (e.jack) M.phase = "jack";
    applyThrow({ side: e.side, jack: e.jack, dx: e.dx, dy: e.dy, power: e.power, slot: e.slot == null ? 2 : e.slot,
                 special: e.special, active: e.active, ult: e.ult, noJitter: true });
    const wait = () => {
      if (!M || !M.replay) return;
      if (busy || hold) { setTimeout(wait, 120); return; }
      if (M.phase === "jack" && B.jackValid(M)) M.phase = "play";
      setTimeout(stepReplay, 380);
    };
    setTimeout(wait, 200);
  }

  /* ══════════════════════════════════════════════════════════════
     ⑩ チュートリアル（投げながら覚える7ステップ）
     ══════════════════════════════════════════════════════════════ */
  const TUT_STEPS = [
    { e: "JACK BALL", tx: { ja: "白いボールが<b>ジャック</b>。まずはこれを<b>黄色のVラインより奥</b>へ投げましょう。手元の白いボールを<b>下へ引っぱって、はなす</b>。", en: "The white ball is the <b>jack</b>. Throw it <b>past the yellow V line</b>: <b>pull down and release</b>." } },
    { e: "THROW", tx: { ja: "次は自分の<b>赤いボール</b>。引っぱる長さが強さ、向きの<b>反対</b>へ飛びます。好きなように1球投げてみましょう。", en: "Now your <b>red ball</b>. Pull length is power; it flies the <b>opposite</b> way. Throw one." } },
    { e: "GET CLOSE", tx: { ja: "ボッチャの目標は<b>ジャックに近づける</b>こと。ジャックから<b>1m 以内</b>に止めてみましょう（点線の先に止まる位置が出ます）。", en: "The goal is to get <b>close to the jack</b>. Stop within <b>1m</b> of it (the dashed line shows where it stops)." } },
    { e: "KNOCK OUT", tx: { ja: "青い相手のボールがジャックのそばに来ました。<b>ぶつけて遠ざけましょう</b>。強めに引くのがコツ。", en: "A blue ball sits near the jack. <b>Knock it away</b> — pull harder." } },
    { e: "SCORE", tx: { ja: "エンドの終わりに、<b>いちばん近いチーム</b>が、相手の最短より近いボールの数だけ得点します。", en: "At the end, the <b>closest side</b> scores one point per ball closer than the opponent's nearest." } },
    { e: "SPECIAL SHOT", tx: { ja: "下の<b>特殊ショット</b>（左の2つ）をどちらか押してから投げましょう。キャラごとに技がちがいます。", en: "Tap a <b>special shot</b> below (left two buttons), then throw." } },
    { e: "ULTIMATE", tx: { ja: "ゲージを満タンにしました！ <b>ULT</b> を押してから投げると<b>アルティメット</b>が発動します。", en: "Gauge filled! Tap <b>ULT</b> then throw to fire your <b>ultimate</b>." } },
  ];
  function startTutorial() {
    tut = { step: 0 };
    const s = B.load();
    s.guide = s.guide === "off" ? "normal" : s.guide;
    startMatch({ kind: "practice", tutorial: true, rules: "ability", growth: "full", ends: 99, difficulty: "easy", rival: B.rivalLineup(7, 3) });
    tut = { step: 0, spoke: tut ? tut.spoke : -1 };
    M.cfg.guide = "off";
    updateHUD();
  }
  function tutEvent(k, res) {
    if (!tut || !M) return;
    const j = B.jackOf(M);
    const refill = () => { M.left.red = 6; M.turn = "red"; };
    const S = tut.step;
    if (k === "jack" && S === 0) { tut.step = 1; refill(); }
    else if (k === "settled") {
      if (S === 1) { tut.step = 2; }
      else if (S === 2) {
        const last = M.balls.filter((b) => b.side === "red").slice(-1)[0];
        if (last && j && B.dist(last, j) < 1.0) {
          tut.step = 3;
          FX.pop("NICE!", J("1m 以内", "Within 1m"), "#35d49a");
          /* 青のボールをジャックのそばに置く */
          M.balls.push({ id: "tutb", side: "blue", jack: false, x: clamp(j.x + 0.25, 0.3, C.W - 0.3), y: j.y - 0.35, vx: 0, vy: 0, mass: 1, baseMass: 1,
                         fric: 1, dead: 0, events: [], charId: M.cfg.lineup.blue[0] || "", banks: 0, roll: 0 });
          const tb = M.balls[M.balls.length - 1]; tut.bx = tb.x; tut.by = tb.y;
        } else FX.popLite(J("もう一度", "Try again"), "#fff");
      } else if (S === 3) {
        const bb = M.balls.find((b) => b.id === "tutb");
        if (!bb || bb.dead || Math.abs(bb.x - tut.bx) + Math.abs(bb.y - tut.by) > 0.4) {
          tut.step = 4;
          FX.pop("IMPACT!", J("追い出した！", "Knocked out!"), "#ff3b52");
          setTimeout(() => {
            const r2 = B.scoreEnd(M);
            open(ttl("SCORE", J("得点のしくみ", "How scoring works")) + '<div class="pn"><div class="note">' + L(TUT_STEPS[4].tx) + "<br><br>" + esc(B.scoreText(M, r2, lang())) + "</div></div>"
              + '<button class="btn pri" data-a="tutnext">NEXT</button>', true);
          }, 500);
        } else FX.popLite(J("もっと強く！", "Harder!"), "#fff");
      } else if (S === 5) {
        if (tut.lastShot && tut.lastShot.special) {
          tut.step = 6;
          const i = B.charIdx(M, "red");
          M.gauge.red[i] = 100;
          M.ultUsed.red = false;
        } else FX.popLite(J("特殊ショットを選んでから", "Pick a special first"), "#fff");
      } else if (S === 6) {
        if (tut.lastShot && tut.lastShot.ult) {
          open(ttl("COMPLETE", J("チュートリアル完了！", "Tutorial complete!"))
            + '<div class="pn"><div class="note">' + J("これで基本はばっちり。<br>・順番（編成）も作戦<br>・壁を使うバンクショット<br>・壁→ヒット→ジャックの<b>Tactical Chain</b><br>はルールブックでくわしく見られます。", "You've got the basics. Check the rule book for lineup order, bank shots and <b>Tactical Chain</b>.") + "</div></div>"
            + '<button class="btn pri" data-a="tutdone">CPU MATCH (EASY)</button><button class="btn gh" style="margin-top:8px" data-a="tohome">HOME</button>', true);
          const s = B.load(); s.tutorial = true; B.save();
          FX.speak(B.tutClip(7));
          tut = null;
          return;
        } else {
          const i = B.charIdx(M, "red"); M.gauge.red[i] = 100; M.ultUsed.red = false;
          FX.popLite(J("ULT を押してから", "Tap ULT first"), "#fff");
        }
      }
      /* 赤のボールが増えすぎたら古いものから片づける（ジャックと青の練習用ボールは残す） */
      const reds = M.balls.filter((b) => b.side === "red");
      if (reds.length > 4) { const drop = reds.slice(0, reds.length - 4); M.balls = M.balls.filter((b) => drop.indexOf(b) < 0); }
      refill();
    } else if (k === "jackfail") { /* そのまま投げ直し */ }
    shownTurn = "";
    updateHUD();
  }

  /* ══════════════════════════════════════════════════════════════
     ⑪ ルールブック・設定
     ══════════════════════════════════════════════════════════════ */
  /* ★★ 2026-09-17c スキルの発動・ゲージ・状態の<b>くわしいルール</b>を追加（ご指定）。
     一覧（特殊ショット／アクティブ／パッシブ／ULT）は mbr-core.js の台帳から作る＝数字は本物と必ず一致する。 */
  function poolTypes(pool, k) {
    if (!pool) return "";
    return Object.keys(pool).filter((t) => pool[t].indexOf(k) >= 0).map((t) => B.TYPES[t].ja).join("・");
  }
  function ruleList(tbl, pool, extra) {
    return Object.keys(tbl).map((k) => {
      const x = tbl[k];
      const tys = poolTypes(pool, k);
      return '<div class="rli"' + (x.c ? ' style="border-left-color:' + x.c + '"' : "") + "><b>" + esc(x.en) + "</b> <small>" + esc(x.ja || "") + "</small>"
        + (extra ? extra(k, x) : "") + "<br>" + L(x.d) + (tys ? '<br><small>' + J("持っている型：", "Types: ") + tys + "</small>" : "") + "</div>";
    }).join("");
  }
  function gaugeTable() {
    const rows = en() ? [
      ["Every throw", "+6"], ["Each rail bank (up to 3)", "+4 each"], ["Each ball hit (up to 2)", "+8 each"],
      ["Touching the jack", "+6"], ["Stopping within 50cm of the jack", "+6"], ["Tactical Chain ×2 or more", "+6 per link (max +18)"],
      ["Passive / active bonuses", "see lists"], ["Cap per throw", "40"], ["SKILL CHARGE multiplier", "≈ ×0.8 – ×1.2"], ["The throw that fires an ULT", "0"],
    ] : [
      ["1回投げる", "+6"], ["壁で反射（3回まで）", "1回 +4"], ["ボールに当てる（2回まで）", "1回 +8"],
      ["ジャックに触れる", "+6"], ["ジャックの 50cm 以内に止まる", "+6"], ["Tactical Chain ×2 以上", "1段 +6（最大 +18）"],
      ["パッシブ・アクティブのボーナス", "一覧を参照"], ["1投で増える上限", "40"], ["SKILL CHARGE の倍率（上限のあとに掛ける）", "およそ ×0.8〜×1.2"], ["ULT を撃った1投", "0"],
    ];
    return '<table class="rtbl">' + rows.map((r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>").join("") + "</table>";
  }
  const RULES = [
    ["BASIC", { ja: "基本", en: "Basics" }, { ja: "赤と青の2チームで、白い<b>ジャックボール</b>に自分のボールを近づけ合います。1エンドに片側<b>6球</b>。数エンドの合計点で勝敗を決めます。", en: "Red and blue compete to get closer to the white <b>jack</b>. Six balls per side per end; total points decide the match." }],
    ["COURT", { ja: "コート", en: "Court" }, { ja: "長さ12.5m・幅6m。手前に投球ボックスが6つ。<b>Vライン</b>（3m）はジャックが越えなければならない線、<b>クロス</b>（5m）は中央の印です。<br>コートのふちは<b>壁（赤く光る）</b>で、どのモードでもバンクショットが使えます。", en: "12.5m × 6m with six throwing boxes. The jack must pass the <b>V line</b> (3m); the <b>cross</b> marks 5m. The edge is a glowing <b>rail</b> for bank shots in every mode." }],
    ["THROW", { ja: "投げかた", en: "Throwing" }, { ja: "コートの手前で<b>ボールを引っぱって、はなす</b>と、<b>引いた向きの反対</b>へ飛びます。引く長さが強さです。<br>"
        + "・点線は<b>軌道の予測</b>。どこまで見えるかは設定の「軌道予測」とキャラの <b>CONTROL</b> で変わります（「止まる位置まで見える」効果のときは最後まで）。<br>"
        + "・投げた瞬間に、CONTROL が低いほど大きい<b>ブレ</b>（向きのばらつき）が入ります。<br>"
        + "・特殊ショット／アクティブ／ULT は<b>投げる前</b>に下のボタンで選びます。もう一度押すと取り消し。",
        en: "<b>Pull the ball back and release</b> — it flies the opposite way; pull length = power.<br>· The dotted line is the <b>preview</b>; its length depends on the Aim assist setting and <b>CONTROL</b>.<br>· On release a random <b>scatter</b> is added — smaller with higher CONTROL.<br>· Choose specials / active / ULT with the buttons <b>before</b> throwing; tap again to cancel." }],
    ["BALL", { ja: "ボール", en: "Balls" }, { ja: "外周の色がチーム（赤・青）、中のエンブレムがキャラクター。専用ボールの見た目（スタンダード〜プリズム）は熟練度で解放され、<b>性能とは無関係</b>です。GUARD 状態は紫の六角形で表示されます。", en: "Outer colour = team; emblem = character. Ball skins unlock with mastery and are <b>cosmetic only</b>. GUARD shows as a purple hexagon." }],
    ["JACK", { ja: "ジャック", en: "Jack" }, { ja: "先攻がジャックを投げ、Vラインを越えなければ投げ直し。ジャックに当ててずらすのも立派な作戦で、JACK 型が得意です。", en: "The starting side throws the jack; if it doesn't pass the V line, rethrow. Moving the jack is a valid tactic — JACK types excel." }],
    ["TURN", { ja: "投げる順番", en: "Turn order" }, { ja: "ジャックを投げた側が最初の1球。以後は<b>ジャックから遠いほう</b>が投げます。投げるたびに<b>編成の順番</b>でキャラが交代します（6球＝6人が1球ずつ）。<br>試合中は上の帯（いまの担当・NEXT）を押すと、そのキャラの詳細を見られます。", en: "The jack thrower goes first; afterwards the side <b>farther from the jack</b> throws. Characters rotate in <b>lineup order</b> (6 balls = 6 characters, one each).<br>During a match, tap the order bar to see that character's details." }],
    ["SCORE", { ja: "得点", en: "Scoring" }, { ja: "エンド終了時、いちばん近いチームが<b>相手の最短より近いボールの数</b>だけ得点。同点なら<b>タイブレーク</b>のエンドを追加します。", en: "The closest side scores one point per ball closer than the opponent's nearest. A tie adds a <b>tie-break end</b>." }],
    ["SKILLS", { ja: "スキルの発動", en: "Using skills" }, { ja: "<b>使えるのは、いま投げる番のキャラのスキルだけ</b>です（編成の順に1投ずつ交代）。<br><br>"
        + "<b>① 特殊ショット</b>（キャラごとに2種）… 投げる前にボタンで選ぶ。<b>1エンドにそれぞれ1回</b>。ゲージを使うもの（POWER HIT・JACK PUSH＝15、SPLIT＝10）は、そのキャラのゲージが足りないと押せず、<b>投げた瞬間に引かれます</b>。<br>"
        + "<b>② アクティブ</b> … ボタンで選ぶ。<b>キャラごとに1エンド1回</b>。ゲージは使いません。<br>"
        + "<b>③ パッシブ</b> … 選ばなくても<b>常に</b>効きます。条件つきのものは条件を満たしたときだけ。<br>"
        + "<b>④ アルティメット（ULT）</b> … そのキャラのゲージが <b>100</b> で押せます。<b>チームで1エンド1回</b>。撃つとそのキャラのゲージは 0、その1投ではゲージがたまりません。<br><br>"
        + "・特殊ショット1つ＋アクティブ＋ULT は<b>同じ1投に重ねて</b>使えます。<br>"
        + "・ゲージは<b>キャラごと</b>で、<b>エンドをまたいで持ちこし</b>。使用回数はエンドの始まりに戻ります。<br>"
        + "・「次の味方」「チームの次の2投」に効く効果は、<b>同じチームの次の投球</b>で消費されます。<br>"
        + "・技が出るとカットインが入ります（設定の「演出の強さ」で短く／なしにできます。盤面には影響しません）。<br>"
        + "・CPU・オンラインの相手も同じルールです。ルール準拠モード・ランクマッチでは<b>すべて使えません</b>。",
        en: "<b>Only the character whose turn it is can use skills</b> (characters rotate in lineup order).<br><br>"
        + "<b>1. Special shots</b> (2 per character) — pick before throwing, <b>once per end each</b>. Gauge-cost shots (POWER HIT/JACK PUSH 15, SPLIT 10) need enough gauge and <b>spend it on release</b>.<br>"
        + "<b>2. Active</b> — pick with its button, <b>once per end per character</b>, no gauge.<br>"
        + "<b>3. Passive</b> — <b>always on</b>; conditional ones trigger when their condition is met.<br>"
        + "<b>4. Ultimate</b> — needs <b>100</b> gauge on that character; <b>once per end per team</b>. Firing resets that gauge to 0 and the throw earns none.<br><br>"
        + "· A special + active + ULT can <b>stack on one throw</b>.<br>· Gauge is <b>per character</b> and <b>carries across ends</b>; uses reset each end.<br>"
        + "· \"Next teammate\" effects are consumed by <b>your team's next throw</b>.<br>· Cut-ins can be shortened/disabled in Settings (never affects the board).<br>"
        + "· CPU and online opponents follow the same rules. Rules mode / ranked disable <b>all</b> skills." }],
    ["GAUGE", { ja: "ゲージのたまりかた", en: "Gauge" }, () => L({ ja: "ゲージは<b>投げたキャラ</b>にたまります（止まったあとにまとめて計算）。", en: "Gauge goes to <b>the character who threw</b>, calculated after the balls stop." })
        + gaugeTable() + '<div class="note" style="margin-top:6px">' + J("ほかに：サポート系の効果で<b>次の味方</b>に +8〜+25 が入ることがあります。ゲージの上限は 100。", "Support effects can also give the <b>next teammate</b> +8 to +25. Max gauge is 100.") + "</div>"],
    ["SPECIAL", { ja: "特殊ショット一覧", en: "Special shots" }, () => ruleList(B.SPECIALS, B.SPECIAL_POOL, (k, x) => ' <span class="tag">' + J("1エンド1回", "1/end") + (x.cost ? " ・ " + J("ゲージ", "G") + x.cost : "") + "</span>")],
    ["ACTIVE", { ja: "アクティブ一覧", en: "Active skills" }, () => ruleList(B.ACTIVES, B.ACTIVE_POOL, () => ' <span class="tag">' + J("キャラごとに1エンド1回", "1/end per character") + "</span>")],
    ["PASSIVE", { ja: "パッシブ一覧", en: "Passive skills" }, () => ruleList(B.PASSIVES, B.PASSIVE_POOL, () => ' <span class="tag">' + J("常に発動", "Always on") + "</span>")],
    ["ULT", { ja: "アルティメット一覧", en: "Ultimates" }, () => L({ ja: "効果は<b>型</b>で決まり、技の名前はキャラごとの必殺技です。", en: "The effect depends on <b>type</b>; the name is the character's own finisher." })
        + B.TYPE_KEYS.map((t) => '<div class="rli" style="border-left-color:' + B.TYPES[t].c + '"><b>' + esc(B.ULTS[t].en) + '</b> <small style="color:' + B.TYPES[t].c + '">' + B.TYPES[t].ja + " TYPE</small><br>" + L(B.ULTS[t].d) + "</div>").join("")],
    ["STATUS", { ja: "状態・効果の用語", en: "Status terms" }, { ja: "<b>GUARD</b> … 紫の六角形。重さ ×1.65（アイアン・ウォールは ×1.9）で<b>押されにくい</b>。そのエンドのあいだ続きます。POWER HIT で当てると<b>解除</b>。<br>"
        + "<b>SHOCK</b> … 当てられたボールが <b>1.2秒</b>、減速 ×1.6（すぐ止まる）。<br>"
        + "<b>CURVE</b> … 投げてから <b>0.9秒</b>、コートの中央へ向かって曲がる。<br>"
        + "<b>SPLIT</b> … 最初に当てたあと、横向きの勢いを <b>35%</b> 残して2つ目を狙える。<br>"
        + "<b>ブレ</b> … 投げた瞬間の向きのばらつき。「ブレ -40%」はばらつきが 6割に、「ブレゼロ」は完全にまっすぐ。<br>"
        + "<b>押し出し</b> … 当てた相手（またはジャック）を動かす強さ。「×1.25」は 1.25倍よく動く。<br>"
        + "<b>予測が止まる位置まで</b> … 点線が最後（止まる点）まで見える。<br>"
        + "<b>JACK LOCK</b> … 次に自分が投げるまで、相手がジャックを動かす力が半分。",
        en: "<b>GUARD</b> — purple hexagon; mass ×1.65 (Iron Wall ×1.9) so it <b>resists pushes</b> for the end. A POWER HIT <b>breaks</b> it.<br>"
        + "<b>SHOCK</b> — the hit ball brakes ×1.6 for <b>1.2s</b>.<br><b>CURVE</b> — bends toward the centre for <b>0.9s</b>.<br>"
        + "<b>SPLIT</b> — keeps <b>35%</b> sideways speed after the first hit.<br><b>Scatter</b> — random aim error; \"-40%\" means 60% of normal, \"zero\" is perfectly straight.<br>"
        + "<b>Push</b> — how far hit balls (or the jack) move.<br><b>Full preview</b> — the dotted line reaches the stop point.<br><b>JACK LOCK</b> — until your next throw, opponents move the jack half as far." }],
    ["COMBO", { ja: "コンボ", en: "Combos" }, { ja: "1投の中で<b>壁→ヒット→ジャック</b>のように<b>ちがう種類</b>を続けて決めると <b>Tactical Chain</b>。2.2秒以内につながると数え、ちがうボールへの連続ヒットは2つまで。上限は×4（PHANTOM CHAIN は×5）。×2 以上で 1段ごとにゲージ +6（最大+18）。", en: "Chaining <b>different</b> events like <b>rail → hit → jack</b> in one throw builds a <b>Tactical Chain</b> (within 2.2s; up to 2 hits on different balls; max ×4, ×5 with PHANTOM CHAIN) for +6 gauge per link (max +18)." }],
    ["FOUL", { ja: "ファウル", en: "Fouls" }, { ja: "コートのまわりは<b>どのモードでも壁</b>になっていて、ボールは反射して戻ってきます（外に出ることはありません）。", en: "The court is enclosed by <b>rails</b> in every mode, so balls bounce back in." }],
    ["TEAM", { ja: "チーム戦", en: "Teams" }, { ja: "2vs2・3vs3。プレイヤーは投げるたびに交代し、キャラも順番で交代します。空いた席は<b>CPU補充</b>できます。", en: "2v2 / 3v3. Players and characters rotate each throw; empty seats can be <b>CPU-filled</b>." }],
    ["COMPETITION", { ja: "競技・バランス", en: "Competition" }, { ja: "<b>ルール準拠モード</b>：スキルなし・能力の効き1/3（壁は反射）。ランクマッチは常にこれ＋<b>性能統一</b>（育成の補正なし）。能力の合計は全キャラ同じ（396）なので、レアリティで勝敗は決まりません（<b>花宴祭のアカツキだけは特別</b>に合計が高い）。", en: "<b>Rules mode</b>: no skills, stats at 1/3 (rails bounce). Ranked always uses it with <b>unified stats</b>. Every character totals 396, so rarity never decides a match (the festival character <b>Akatsuki</b> is the one exception)." }],
  ];
  RULES.push(["STAGE", { ja: "ボスステージ", en: "Boss stages" }, {
    ja: "<b>ボスステージ</b>は、ボールをボスやギミックに<b>当てて</b>ボスのHPを0にするモードです（得点ではありません）。<br>"
      + "・ダメージ＝<b>当たった速さ</b>×そのボールの押し出し（POWER・POWER HIT・ULT）×<b>型の得意</b>×<b>角度</b>（正面ほど重い）×<b>状態</b>（装甲・シールド・結界…）。<br>"
      + "・<b>属性</b>はテーマ。相性が良いと ×1.15 だけで、攻略に必須ではありません。<br>"
      + "・<b>投げるたびにボスの攻撃ゲージ</b>がたまり、満タンで攻撃（衝撃波・凍結・突風…）。HUD に「〜まで あと◯投」が出ます。<br>"
      + "・コートに残る自分のボールは<b>3個まで</b>（古い順に片づきます）。<b>ショット数</b>を使い切る前に倒せばクリア。<br>"
      + "・特殊ショット・アクティブ・パッシブ・ULT は対戦と同じように使えます。<br>"
      + "・難易度 HARD・NORMAL・EASY の<b>初回クリア</b>で 💎ジェム 15・10・5。",
    en: "In <b>boss stages</b> you <b>hit</b> the boss and its gimmicks to bring its HP to 0 (no scoring).<br>"
      + "· Damage = <b>impact speed</b> × the ball's push (POWER, POWER HIT, ULT) × <b>type strengths</b> × <b>angle</b> (head-on hits harder) × <b>state</b> (armor, shield, ward…).<br>"
      + "· <b>Elements</b> are theme: a good matchup adds only ×1.15 and is never required.<br>"
      + "· <b>Every throw fills the boss attack gauge</b>; when full it attacks (shockwave, freeze, gust…). The HUD counts down.<br>"
      + "· You keep up to <b>3 balls</b> on court (oldest are cleared). Win before your <b>shots</b> run out.<br>"
      + "· Specials, actives, passives and ULTs work as in matches.<br>"
      + "· First clears on HARD / NORMAL / EASY give 💎 15 / 10 / 5 gems." }]);
  function openRule(sec) {
    const i = Math.max(0, RULES.findIndex((r) => r[0] === sec));
    const r = RULES[i];
    const pv = RULES[(i + RULES.length - 1) % RULES.length], nx = RULES[(i + 1) % RULES.length];
    const inMatch = cur === "match" && !!M;
    open(ttl("RULE BOOK", J("ルールブック", "Rule book"))
      + '<div class="rtabs">' + RULES.map((x) => '<button class="chip' + (x[0] === r[0] ? " on" : "") + '" data-a="rulesec" data-v="' + x[0] + '">' + esc(L(x[1])) + "</button>").join("") + "</div>"
      + '<div class="pn"><div class="en" style="font-size:24px">' + r[0] + '</div><div class="note" style="font-weight:900;margin-bottom:6px">' + L(r[1]) + "</div>"
      + (r[0] === "COURT" ? courtSVG() : "")
      + '<div class="note">' + (typeof r[2] === "function" ? r[2]() : L(r[2])) + "</div></div>"
      + '<div class="brow"><button class="btn gh sm" data-a="rulesec" data-v="' + pv[0] + '">◀ ' + esc(L(pv[1])) + '</button><button class="btn gh sm" data-a="rulesec" data-v="' + nx[0] + '">' + esc(L(nx[1])) + " ▶</button></div>"
      + (inMatch ? '<div class="brow"><button class="btn" data-a="mteam">TEAM</button><button class="btn pri" data-a="close">' + J("試合にもどる", "BACK TO MATCH") + "</button></div>"
        : '<button class="btn pri" style="margin-top:10px" data-a="tutorial">TUTORIAL</button>'));
  }
  function courtSVG() {
    return '<svg viewBox="0 0 120 250" style="width:120px;display:block;margin:0 auto 8px"><rect x="4" y="4" width="112" height="242" fill="#24507c" stroke="#ff3b52" stroke-width="3"/>'
      + '<line x1="4" y1="198" x2="116" y2="198" stroke="#fff" stroke-opacity=".6"/>'
      + [1, 2, 3, 4, 5].map((k) => '<line x1="' + (4 + k * 112 / 6) + '" y1="198" x2="' + (4 + k * 112 / 6) + '" y2="246" stroke="#fff" stroke-opacity=".5"/>').join("")
      + '<line x1="4" y1="188" x2="116" y2="188" stroke="#ffc83d" stroke-dasharray="5 4" stroke-width="2"/>'
      + '<path d="M55 150h10M60 145v10" stroke="#fff"/><circle cx="62" cy="100" r="5" fill="#fff"/><circle cx="48" cy="108" r="6" fill="#ff3b52"/><circle cx="74" cy="92" r="6" fill="#2f8fff"/>'
      + '<text x="8" y="184" font-size="9" fill="#ffc83d" font-style="italic">V LINE</text></svg>';
  }
  function openSettings() {
    const s = B.load();
    const seg = (key, list) => '<div class="seg">' + list.map((d) => '<button class="' + (String(s[key]) === String(d[0]) ? "on" : "") + '" data-a="set" data-v="' + key + ":" + d[0] + '">' + esc(d[1]) + "</button>").join("") + "</div>";
    const sw = (key, k, sub) => '<div class="sw"><div class="k">' + esc(k) + "<small>" + esc(sub) + "</small></div>"
      + '<button class="btn sm ' + (s[key] ? "pri" : "gh") + '" data-a="set" data-v="' + key + ":" + (!s[key]) + '">' + (s[key] ? "ON" : "OFF") + "</button></div>";
    open(ttl("SETTINGS", J("設定", "Settings"))
      + '<div class="pn"><div class="note"><b>' + J("ルール説明（ヒント）", "Rule hints") + "</b></div>"
      + seg("guide", [["full", "FULL"], ["normal", "NORMAL"], ["minimal", "MINIMAL"], ["off", "OFF"]])
      + '<div class="note" style="margin:10px 0 0"><b>' + J("演出の強さ", "Effects") + "</b></div>"
      + seg("fxLevel", [["full", "FULL"], ["short", "SHORT"], ["off", "OFF"]])
      + '<div class="note" style="margin-top:3px">' + J("SHORT は短く、OFF はカットインや文字演出を出しません（オンラインでも盤面には影響しません）。", "SHORT shortens, OFF hides cut-ins and text (never affects the board).") + "</div>"
      + '<div class="note" style="margin:10px 0 0"><b>' + J("軌道予測", "Aim assist") + "</b></div>"
      + seg("aimAssist", [["beginner", J("初心者", "Beginner")], ["normal", J("ふつう", "Normal")], ["expert", J("上級者", "Expert")]])
      + '<div class="note" style="margin-top:3px">' + J("初心者は止まる位置まで、上級者は短い線だけ。キャラの CONTROL でも見える長さが変わります。", "Beginner shows the stop point; expert shows a short line only. CONTROL also affects it.") + "</div></div>"
      + '<div class="pn">'
      + sw("sound", J("効果音", "Sound"), J("衝突・壁・ジャックの音", "Hits, rails, jack"))
      + sw("voice", J("チュートリアルの音声", "Tutorial voice"), J("ずんだもん（VOICEVOX）がチュートリアルを読み上げます", "Zundamon (VOICEVOX) narrates the tutorial"))
      + sw("vib", J("振動", "Vibration"), J("対応端末のみ", "Supported devices"))
      + "</div>"
      + '<div class="pn"><div class="note"><b>' + J("はじめに選ぶモード", "Default mode") + "</b></div>"
      + seg("rules", [["ability", J("キャラクター能力", "Ability")], ["rules", J("ルール準拠", "Rules")]])
      + '<div class="note" style="margin:10px 0 0;display:flex;align-items:center;gap:6px"><b>' + J("育成の反映（ランク以外）", "Training bonus (non-ranked)") + "</b>" + qBtn() + "</div>"
      + growthHelpHTML()
      + seg("growth", [["unify", J("性能統一", "Unified")], ["cap", J("+1まで", "+1")], ["full", J("そのまま(最大+7)", "Full +7")]]) + "</div>"
      + '<div class="pn"><div class="sw"><div class="k">' + J("言語", "Language") + '</div><button class="btn sm gh" data-a="lang">' + (en() ? "日本語" : "English") + "</button></div>"
      + '<div class="sw"><div class="k">' + J("チュートリアル", "Tutorial") + '</div><button class="btn sm gh" data-a="tutorial">START</button></div>'
      + (B.voiceCredits && B.voiceCredits().length ? '<div class="sw"><div class="k">' + J("音声", "Voices") + "<small>" + esc(B.voiceCredits().map((n) => "VOICEVOX:" + n).join(" ／ ")) + "</small></div></div>" : "")
      + '<div class="sw"><div class="k">' + J("アカウント", "Account") + "<small>" + J("戦績・編成・熟練度は XEVARION アカウントで同期されます", "Records, lineup and mastery sync with your XEVARION account") + '</small></div><button class="btn sm gh" data-a="portal">XEVARION</button></div></div>');
  }

  /* ══════════════════════════════════════════════════════════════
     ⑫ 動作の受け口（data-a）
     ══════════════════════════════════════════════════════════════ */
  const ACT = {
    close, go: (v) => { close(); go(v); },
    back: () => {
      /* ピッカーから詳細を開いたときは、そのピッカーへ戻す */
      const rt = detailReturn; detailReturn = "";
      const reopen = (t) => { openPicker(pickSlot, t); if (pickY != null) $("#ovc").scrollTop = pickY; };
      if (rt === "me") { go("team"); reopen("me"); return; }
      if (rt === "fred" || rt === "fblue") { go("play"); drawSetup(); reopen(rt); return; }
      if (rt === "draft") { go("room"); reopen("draft"); return; }
      const to = prev && prev !== "detail" ? prev : "chars";
      go(to);
      /* ★ 2026-09-17c 一覧に戻るときは、詳細を押す前の位置へ（ご指定） */
      if (to === "chars" && charsY != null) { const y = charsY; window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y)); }
    },
    setup: (v) => setup(v),
    cfg: (v) => {
      const i = v.indexOf(":"), k = v.slice(0, i); let val = v.slice(i + 1);
      if (val === "true" || val === "false") val = val === "true"; else if (/^\d+$/.test(val)) val = +val;
      pendingCfg[k] = val; FX.sfx("ui");
      if (k === "trainRed" || k === "trainBlue") {
        const s = B.load();
        s.friendTrain = { red: pendingCfg.trainRed, blue: pendingCfg.trainBlue }; B.save();
      }
      const y = $("#ovc").scrollTop; drawSetup(); $("#ovc").scrollTop = y;
    },
    growhelp: () => { growHelpOpen = !growHelpOpen; $$(".ghelp").forEach((el) => { el.hidden = !growHelpOpen; }); },
    reroll: () => { if (!pendingCfg) return; pendingCfg.rival = B.rivalLineup((Math.random() * 1e9) >>> 0, LINEUP_N); drawSetup(); },
    soon: () => toast(J("このモードは準備中です。", "This mode is coming soon.")),
    fpick: (v) => { const [side, i] = v.split(":"); openPicker(+i, side === "red" ? "fred" : "fblue"); },
    pinfo: (v) => { detailReturn = pickTarget; pickY = $("#ovc").scrollTop; close(); go("detail", v); },
    resume: () => resumeSuspended(),
    discard: () => { const s = B.load(); s.suspend = null; B.save(); renderHome(); toast(J("中断した試合を破棄しました", "Discarded the suspended match")); },
    suspend: () => {
      if (!M || online || M.replay || tut || M.practice || M.phase === "over") return;
      const s = B.load();
      s.suspend = { at: Date.now(), kind: M.kind, cfg: JSON.parse(JSON.stringify(M.cfg)), log: M.log.slice() };
      B.save();
      close(); endMatch(); go("home");
      toast(J("試合を中断しました。ホームの RESUME から続きを遊べます", "Match suspended — resume it from HOME"));
    },
    toteam: () => { close(); go("team"); },
    start: () => {
      const p = pendingCfg;
      if (p && p.kind === "quick" && p.tryOnline && window.MBROnline && MBROnline.quick) {
        close();
        showMatching();
        MBROnline.quick(10000).then((ok) => {
          hideMatching();
          if (!ok) { toast(J("相手が見つからなかったので CPU と対戦します", "No opponent found — CPU match")); p.tryOnline = false; startMatch(p); }
        });
        return;
      }
      startMatch();
    },
    pickslot: (v) => openPicker(+v, "me"),
    pickchar: (v) => {
      const i = pickSlot;
      const s = B.load();
      const put = (lu) => { const at = lu.indexOf(v); if (at >= 0 && at !== i) lu[at] = lu[i]; lu[i] = v; return lu; };
      const c = charOf(v);
      if (pickTarget === "fred" || pickTarget === "fblue") {
        const key = pickTarget === "fred" ? "redLineup" : "rival";
        pendingCfg[key] = put(pendingCfg[key].slice());
        s.friendRed = pendingCfg.redLineup; s.friendBlue = pendingCfg.rival; B.save();
        drawSetup();
        return;
      }
      if (pickTarget === "draft") { if (draftCb) draftCb(put(draftLineup.slice())); close(); return; }
      s.lineup = put(myLineup()); B.save();
      close(); renderTeam();
      FX.cutIn(c, "enter", "", "TEAM #" + (i + 1), B.voiceOf(c, "enter", 0));
    },
    swapslot: (v) => { const s = B.load(); const lu = myLineup(); const i = +v; const t = lu[i]; lu[i] = lu[i + 1]; lu[i + 1] = t; s.lineup = lu; B.save(); renderTeam(); FX.sfx("ui"); },
    autoteam: () => {
      const s = B.load();
      const pick = [];
      [["defense", "technique"], ["power", "bounce", "trick"], ["technique", "jack", "support"],
       ["defense", "support"], ["power", "bounce", "trick"], ["technique", "jack"]].forEach((tys) => {
        let best = null;
        ROSTER.forEach((c) => { if (pick.indexOf(c.id) < 0 && tys.indexOf(c.type) >= 0 && (!best || B.charProg(c.id).lv > B.charProg(best.id).lv)) best = c; });
        if (!best) best = ROSTER.find((c) => pick.indexOf(c.id) < 0);
        if (best) pick.push(best.id);
      });
      s.lineup = pick; B.save(); renderTeam(); toast(J("守り→崩し→仕上げ の順で組みました", "Built guard → break → finish"));
    },
    detail: (v) => { if (cur === "chars") charsY = window.scrollY; close(); go("detail", v); },
    ball: (v) => { const [id, k] = v.split(":"); const s = B.load(); const p = s.chars[id] || (s.chars[id] = { xp: 0, games: 0, wins: 0 }); p.ball = k; B.save(); renderDetail(); FX.sfx("guard"); },
    addteam: (v) => { const s = B.load(); const lu = myLineup(); if (lu.indexOf(v) < 0) { lu[LINEUP_N - 1] = v; s.lineup = lu; B.save(); } renderDetail(); toast(J("6番手に入れました", "Added as #6")); },
    lead: (v) => { const s = B.load(); let lu = myLineup().filter((x) => x !== v); lu.unshift(v); s.lineup = lu.slice(0, LINEUP_N); B.save(); renderDetail(); const c = charOf(v); FX.cutIn(c, "enter", "", "TEAM #1", B.voiceOf(c, "enter", 0)); },
    gacha: () => { location.href = "../gacha.html"; },
    portal: () => { location.href = "../index.html"; },
    replay: (v) => openReplay(+v || 0),
    again: () => { close(); if (M && M.kind) { setup(M.kind === "replay" ? "cpu" : M.kind); } },
    tohome: () => { close(); endMatch(); go("home"); },
    nextend: nextEnd,
    sp: (v) => selToggle("sp", v), act: () => selToggle("act"), ult: () => selToggle("ult"),
    clearguide: () => { lastGuide = null; updateHUD(); },
    pause: () => open(ttl("MENU", J("一時停止", "Paused"))
      + '<button class="btn" data-a="close">' + J("再開", "Resume") + "</button>"
      + (M && !online && !M.replay && !tut && !M.practice && !M.stage ? '<button class="btn wh" style="margin-top:8px" data-a="suspend">' + J("中断する（あとで続きから）", "Suspend (resume later)") + "</button>" : "")
      + '<button class="btn wh" style="margin-top:8px" data-a="mteam">' + J("TEAM ・ 編成キャラの詳細", "TEAM · lineup details") + "</button>"
      + '<button class="btn gh" style="margin-top:8px" data-a="rule">RULE BOOK</button>'
      + '<button class="btn gh" style="margin-top:8px" data-a="settings">SETTINGS</button>'
      + '<button class="btn pri" style="margin-top:14px" data-a="quit">' + J("試合をやめる", "Leave match") + "</button>"),
    quit: () => { close(); if (online && window.MBROnline) MBROnline.leave(false, true); endMatch(); go("home"); },
    rule: () => openRule(), rulesec: (v) => openRule(v),
    mteam: () => openMatchTeam(),
    stageinfo: (v) => stageInfo(v),
    stagestart: (v) => { const [id, diff] = v.split(":"); startStage(id, diff); },
    stageretry: () => { const p = pendingStage; close(); endMatch(); if (p) startStage(p.id, p.diff); else go("stages"); },
    stagelist: () => { close(); endMatch(); go("stages"); },
    fruit: (v) => { const i = v.lastIndexOf(":"); useFruit(v.slice(0, i), v.slice(i + 1)); },
    /* ★★ 2026-09-17g 果実の個数えらび → 確認 → 使う */
    fruitn: (v) => {
      const c = charOf(detailId); if (!c) return;
      const mx = fruitMax(c, B.charProg(c.id));
      fruitSel.n = /^set:/.test(v) ? +v.slice(4) : fruitSel.n + (+v);
      fruitSel.n = Math.max(1, Math.min(mx, fruitSel.n)); fruitSel.ask = false;
      FX.sfx("ui"); paintFruit();
    },
    fruitask: () => { fruitSel.ask = true; FX.sfx("ui"); paintFruit(); },
    fruitno: () => { fruitSel.ask = false; paintFruit(); },
    fruitgo: (v) => { const k = fruitSel.n; fruitSel.ask = false; useFruit(v, k); },
    mchar: (v) => {
      if (!M || !v) { openMatchTeam(); return; }
      const id = v.indexOf(":") >= 0 ? v.slice(v.indexOf(":") + 1) : v;
      const c = charOf(id);
      if (!c) { openMatchTeam(); return; }
      open(detailHTML(c, "match"));
      fillBalls($("#ovc #dballs"), c, false);
    },
    fsmode: (v) => { const [sc, k] = v.split(":"); FS[sc].qmode = k; paintFS(sc); fsRefresh(sc); FX.sfx("ui"); },
    fsclearq: (v) => { FS[v].q = ""; paintFS(v); fsRefresh(v); },
    fssortopen: (v) => { fsSortOpen = fsSortOpen === v ? "" : v; paintFS(v); FX.sfx("ui"); },
    fssort: (v) => { const [sc, k] = v.split(":"); FS[sc].sort = k; fsSortOpen = ""; paintFS(sc); fsRefresh(sc); FX.sfx("ui"); },
    fsdir: (v) => { FS[v].desc = !FS[v].desc; paintFS(v); fsRefresh(v); FX.sfx("ui"); },
    fsopen: (v) => { fsSheet = v; sheetEl().classList.add("on"); paintSheet(); const b = $("#fsBody"); if (b) b.scrollTop = 0; FX.sfx("ui"); },
    fsclose: () => { const sc = fsSheet; fsSheet = ""; const o = $("#fsOv"); if (o) o.classList.remove("on"); if (sc) { paintFS(sc); fsRefresh(sc); } },
    fsgrp: (v) => { fsGrpOpen[v] = !fsGrpOpen[v]; paintSheet(); },
    fspick: (v) => { const i = v.indexOf("|"); const sc = v.slice(0, i), k = v.slice(i + 1); const ks = FS[sc].keys; const at = ks.indexOf(k); if (at >= 0) ks.splice(at, 1); else ks.push(k); fsRefresh(sc); FX.sfx("ui"); },
    fsreset: (v) => { FS[v].keys = []; fsRefresh(v); },
    settings: () => openSettings(),
    set: (v) => {
      const i = v.indexOf(":"), k = v.slice(0, i); let val = v.slice(i + 1);
      if (val === "true" || val === "false") val = val === "true";
      const s = B.load(); s[k] = val; B.save();
      if (k === "guide" && M) M.cfg.guide = val;
      FX.sfx("ui"); openSettings();
    },
    lang: () => { try { localStorage.setItem("xeva_lang_v1", en() ? "ja" : "en"); } catch (e) {} document.documentElement.lang = lang(); close(); paintNav(); go(cur === "match" ? "home" : cur); },
    tutorial: () => { close(); startTutorial(); },
    tutnext: () => {
      close();
      if (!tut) return;
      tut.step = 5; M.left.red = 6; M.turn = "red"; M.phase = "play"; shownTurn = "";
      /* 特殊ショットがゲージ不足で押せない、を起こさない */
      const i = B.charIdx(M, "red"); M.gauge.red[i] = Math.max(M.gauge.red[i], 40); M.spUsed.red[i] = {};
      updateHUD();
    },
    tutdone: () => { close(); pendingCfg = null; setup("cpu"); pendingCfg.difficulty = "easy"; drawSetup(); },
    rule2: () => openRule(),
    roomcreate: () => { if (window.MBROnline) MBROnline.create(); },
    roomjoin: () => { const v = (($("#roomIn") || {}).value || "").trim().toUpperCase(); if (window.MBROnline) MBROnline.join(v); },
    net: (v, el) => { if (window.MBROnline && MBROnline[v]) MBROnline[v](el && el.dataset.x); },
    cancelmatch: () => { if (window.MBROnline && MBROnline.cancelQuick) MBROnline.cancelQuick(); hideMatching(); },
  };
  /* ══ キャラをえらぶシート（★ 2026-09-17b 検索・絞り込み・詳細つき・ご指定）══
     target … "me"（自分の編成＝所持キャラ）／ "fred"・"fblue"（1台で友達と＝全キャラ）／ "draft"（オンラインの編成） */
  let pickSlot = 0, pickTarget = "me", detailReturn = "";
  let draftLineup = [], draftCb = null;
  function pickPool() { return (pickTarget === "fred" || pickTarget === "fblue") ? B.buildRoster() : ROSTER; }
  function pickLineup() {
    if (pickTarget === "fred") return pendingCfg.redLineup || [];
    if (pickTarget === "fblue") return pendingCfg.rival || [];
    if (pickTarget === "draft") return draftLineup;
    return myLineup();
  }
  function pickCards() {
    const lu = pickLineup();
    const list = fsList("pick");
    const k = FS.pick.sort;
    pickN = list.length;
    if (!list.length) return emptyHTML();
    const awOf = (id) => pickTarget === "fred" ? trainAwOne(pendingCfg && pendingCfg.trainRed, id)
      : pickTarget === "fblue" ? trainAwOne(pendingCfg && pendingCfg.trainBlue, id) : awkOne(id);
    return list.map((c) => { const aw = awOf(c.id); return '<div class="cc' + mxCls(c, aw) + '" data-a="pickchar" data-v="' + c.id + '"><img src="' + esc(img(c)) + '" loading="lazy" alt="">'
      + '<span class="rr ' + c.rarity + '">' + c.rarity + "</span>" + awkTag(aw)
      + (lu.indexOf(c.id) >= 0 ? '<span class="inl">' + (lu.indexOf(c.id) + 1) + "</span>" : "")
      + (B.STAT_KEYS.indexOf(k) >= 0 ? '<span class="num">' + c.st[k] + "</span>" : "")
      + '<button class="pinfo" data-a="pinfo" data-v="' + c.id + '" aria-label="' + J("詳細", "Details") + '">i</button>'
      + '<div class="bt"><div class="nm">' + esc(c.nm) + '</div><div class="ty" style="color:' + B.TYPES[c.type].c + '">' + B.TYPES[c.type].ja + "</div></div></div>"; }).join("");
  }
  function openPicker(i, target) {
    pickSlot = i; pickTarget = target || "me";
    const who = pickTarget === "fred" ? "1P " : pickTarget === "fblue" ? "2P " : "";
    open(ttl("SELECT", who + J((i + 1) + "番手をえらぶ", "Pick #" + (i + 1)))
      + '<div class="fsui" id="fsui_pick"></div>'
      + '<div class="note" style="margin:2px 0 0">' + (pickTarget === "fred" || pickTarget === "fblue"
          ? J("1台で遊ぶときは<b>全キャラ</b>から選べます。右上の <b>i</b> で詳細。", "Any character can be used on one device. Tap <b>i</b> for details.")
          : J("所持しているキャラから選べます。右上の <b>i</b> で詳細。", "Pick from your characters. Tap <b>i</b> for details.")) + "</div>"
      + '<div class="fcount" id="pfn"></div>'
      + '<div class="cgrid" id="pfg"></div>');
    paintFS("pick");
    fsRefresh("pick");
  }
  /* オンラインの編成（90秒）から呼ぶ */
  function pickDraft(lineup, i, cb) { draftLineup = lineup.slice(); draftCb = cb; openPicker(i, "draft"); }

  /* ══ 中断した試合の再開：記録を同じ物理でたどり直す（オンラインの組み立て直しと同じ考えかた）══ */
  function rebuildFromLog(Mx, shots) {
    shots.forEach((sh) => {
      if (Mx.phase === "over") return;
      const isJack = !!sh.jack;
      if (isJack) { Mx.phase = "jack"; Mx.turn = sh.side; }
      else if (sh.side !== Mx.turn) Mx.turn = sh.side;
      B.throwBall(Mx, { side: sh.side, jack: isJack, dx: sh.dx, dy: sh.dy, power: sh.power, slot: sh.slot,
                        special: sh.special, active: sh.active, ult: sh.ult, noJitter: true });
      B.settle(Mx, 6000); B.finishShot(Mx);
      Mx.fx = [];
      if (Mx.phase === "jack") {
        if (!B.jackValid(Mx)) Mx.balls = Mx.balls.filter((b) => !b.jack);
        else { Mx.phase = "play"; Mx.turn = Mx.first; }
        return;
      }
      const nx = B.nextTurn(Mx);
      if (!nx) { B.closeEnd(Mx); return; }
      Mx.turn = nx;
    });
    return Mx;
  }
  function resumeSuspended() {
    const s = B.load();
    const sp = s.suspend;
    if (!sp || !sp.cfg) return;
    s.suspend = null; B.save();
    online = null; tut = null;
    M = B.newMatch(Object.assign({}, sp.cfg, { guide: s.guide }));
    M.kind = sp.kind;
    rebuildFromLog(M, sp.log || []);
    M.hints = []; M.fx = [];                          /* たどり直しで積もった説明・演出は出さない */
    busy = false; thinking = false; hold = false; aim = null; lastGuide = null; shownTurn = ""; trail = [];
    sel = { special: "", active: false, ult: false }; predKey = "";
    close(); go("match"); buildMatchDOM(); startLoop();
    M.cfg.lineup.red.concat(M.cfg.lineup.blue).forEach((id) => FX.imgOf(charOf(id)));
    toast(J("中断した試合を再開しました", "Resumed your match"));
    setTimeout(() => { if (M && M.phase === "over") showResult(); else startTurn(); }, 250);
  }
  function endMatch() {
    endPending = false;
    M = null; busy = false; thinking = false; hold = false; tut = null; online = null;
    cancelAnimationFrame(raf); raf = 0;
    FX.clearCut();
    document.body.classList.remove("inmatch");
  }
  function showMatching() {
    const el = $("#recon");
    el.hidden = false;
    el.innerHTML = '<div class="sp"></div><div class="t">MATCHING…</div><div class="s">' + J("オンラインの対戦相手をさがしています", "Looking for an online opponent") + "</div>"
      + '<button class="btn sm gh" data-a="cancelmatch" style="width:auto">' + J("キャンセル", "Cancel") + "</button>";
  }
  function hideMatching() { $("#recon").hidden = true; }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el || !el.dataset.a) return;
    const f = ACT[el.dataset.a];
    if (f) { e.preventDefault(); f(el.dataset.v || "", el); }
  });

  /* ══════════ 上・下のバー ══════════ */
  const NAV_IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3Z" stroke-linejoin="round"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="8" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 20c.6-4 3-6 5.5-6s4.9 2 5.5 6M14 20c.4-3 1.7-4.6 3.5-4.6S21 17 21.5 20"/></svg>',
    chars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="12" cy="10" r="3"/><path d="M7.5 18c1-2.4 2.6-3.4 4.5-3.4s3.5 1 4.5 3.4"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  };
  function paintNav() {
    $("#nav").innerHTML = ''
      + '<button data-a="go" data-v="home">' + NAV_IC.home + "<span>HOME</span></button>"
      + '<button data-a="go" data-v="team">' + NAV_IC.team + "<span>TEAM</span></button>"
      + '<button class="play" data-a="go" data-v="play"><span class="pl"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 4v16l13-8Z" fill="#fff"/></svg></span><span>PLAY</span></button>'
      + '<button data-a="go" data-v="chars">' + NAV_IC.chars + "<span>CHARACTER</span></button>"
      + '<button data-a="go" data-v="profile">' + NAV_IC.profile + "<span>PROFILE</span></button>";
  }
  function paintTop() {
    const s = B.load(), r = B.rankOf(s.rp);
    const rk = $("#topRank");
    if (rk) { rk.textContent = r.ja + " " + s.rp; rk.style.color = r.c; }
  }

  /* ══════════ 起動（タイトル → ロード → ホーム）══════════ */
  function boot() {
    document.documentElement.lang = lang();
    paintNav();
    const el = $("#boot");
    const bar = el ? $(".ld i", el) : null;
    const setBar = (p) => { if (bar) bar.style.width = Math.round(p * 100) + "%"; };
    setBar(0.2);
    let ok = true, why = "";
    try {
      const all = B.buildRoster();
      if (!all.length) { ok = false; why = "nochars"; }
    } catch (e) { ok = false; why = String(e && e.message || e); }
    setBar(0.6);
    if (!ok) {
      if (el) {
        el.hidden = false;
        el.insertAdjacentHTML("beforeend", '<div class="err"><b>' + J("キャラクターデータを読みこめませんでした", "Couldn't load character data") + "</b><br>"
          + J("原因：XEVARION 共通のキャラクター表（mb-core.js）が読みこめていません。", "Cause: the shared character table (mb-core.js) didn't load.") + (why && why !== "nochars" ? "（" + esc(why) + "）" : "") + "<br>"
          + J("対処：通信を確認して再読み込みするか、一度 XEVARION を開いてから戻ってきてください。", "Fix: check your connection and reload, or open XEVARION once and come back.")
          + '<div class="brow"><button class="btn sm" onclick="location.reload()">RELOAD</button><button class="btn sm gh" onclick="location.href=\'../index.html\'">XEVARION</button></div></div>');
      }
      return;
    }
    loadRoster();
    myLineup().forEach((id) => FX.imgOf(charOf(id)));
    setBar(1);
    let seen = false;
    try { seen = sessionStorage.getItem("mbr_boot") === "1"; } catch (e) {}
    const enter = () => {
      try { sessionStorage.setItem("mbr_boot", "1"); } catch (e) {}
      if (el) { el.style.transition = "opacity .35s"; el.style.opacity = "0"; setTimeout(() => { el.hidden = true; }, 360); }
      FX.sfx("ui");
      const s = B.load();
      if (!s.tutorial) setTimeout(askTutorial, 500);
      if (window.MBROnline && MBROnline.tryResume) MBROnline.tryResume();
    };
    go("home");
    if (seen || !el) { if (el) el.hidden = true; enter(); }
    else {
      const tap = $(".tap", el); if (tap) tap.hidden = false;
      el.addEventListener("click", enter, { once: true });
    }
    window.addEventListener("resize", () => { if (cur === "match") fitCanvas(); });
    /* ★★ 2026-09-17d オフライン対応：通信できるうちに、編成と所持キャラの絵を SW の入れ物へ控えておく
       （SW は ../img/ を「一度取ったら控える」ので、fetch するだけでよい）。少しずつ・あとから。 */
    try {
      if (navigator.onLine && "serviceWorker" in navigator) {
        const ids = myLineup().concat(ROSTER.map((c) => c.id)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 260);
        let k = 0;
        const warm = () => {
          if (!navigator.onLine || k >= ids.length) return;
          ids.slice(k, k + 8).forEach((id) => { const c = charOf(id); if (c) { fetch(img(c)).catch(() => {}); fetch(imgFull(c)).catch(() => {}); } });
          k += 8; setTimeout(warm, 700);
        };
        setTimeout(warm, 5000);
      }
    } catch (e) {}
    /* ★ ✕ のある（閉じてよい）シートだけ、外側のタップで閉じる */
    $("#ov").addEventListener("click", (e) => { if (e.target.id === "ov" && $("#ovc .ovx")) close(); });
    window.addEventListener("storage", (e) => { if (e.key === "magiburst_v1") loadRoster(); });
  }
  function askTutorial() {
    FX.speak(B.tutClip(8));
    open(ttl("WELCOME", J("ボッチャを知っていますか？", "Do you know boccia?"))
      + '<div class="pn"><div class="note">' + J("はじめてなら、<b>実際に投げながら覚える</b>7ステップのチュートリアルがおすすめです（3分ほど）。", "If you're new, the 7-step tutorial teaches you <b>by throwing</b> (about 3 minutes).") + "</div></div>"
      + '<div class="brow"><button class="btn pri" data-a="tutorial">' + J("はじめて", "I'm new") + '</button><button class="btn" data-a="skiptut">' + J("知っている", "I know it") + "</button></div>");
  }
  ACT.skiptut = () => { const s = B.load(); s.tutorial = true; B.save(); close(); };

  /* ══════════ 公開（オンライン側から呼ぶ）══════════ */
  window.MBRUI = {
    go, toast, open, close, startMatch, updateHUD,
    get match() { return M; },
    get busy() { return busy || thinking || hold; },
    myLineup, accName, charOf, pickDraft, fillLineup, LINEUP_N,
    get roster() { return ROSTER; },
    _absent(map, names) { if (online) { online.absent = map; online.absentNames = names; updateHUD(); } },
    _abort(reason) {
      if (!M || M.phase === "over") return;
      endPending = true;
      open(ttl("DISCONNECTED", J("試合を中断しました", "Match ended"))
        + '<div class="pn red"><div class="note">' + esc(reason) + "</div></div>"
        + '<button class="btn pri" data-a="tohome">HOME</button>', true);
    },
    _startOnline(cfg, net) { online = net; pendingCfg = cfg; startMatch(Object.assign({}, cfg, { online: net })); },
    _remoteShot: remoteShot,
    _net(ok) { if (online) { online.ok = ok; updateHUD(); } },
    _resync(shots, net) {
      /* 記録から試合を組み立て直す（再接続・同期ずれ） */
      if (!M) return;
      const cfg = M.cfg;
      const keep = { kind: M.kind };
      M = B.newMatch(Object.assign({}, cfg, { ends: cfg.ends }));
      M.kind = keep.kind;
      online = net || online;
      busy = false; thinking = false; hold = false; shownTurn = "";
      rebuildFromLog(M, shots);
      updateHUD();
      startTurn();
    },
    _cancelMatching: hideMatching,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

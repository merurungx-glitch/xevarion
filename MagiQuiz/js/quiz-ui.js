/* ============================================================
   MagiQuiz — quiz-ui.js（共通の部品・タイトル・準備・連携・ルール・記録）
   ★★ 2026-11-05 全面作り直し
   ------------------------------------------------------------
   画面：タイトル → 準備（① あそびかた ② メンバー ③ ルール）→ quiz-play.js（試合）→ quiz-result.js（結果）
   ・アイコンの色（紫・黄・白）とボタン（ブザー）を全体の軸にする。答えを決めるのも、次へ進むのも、黄色いブザー。
   ・準備は前回の内容を覚えていて、タイトルから1タップで同じメンバー・ルールで始められる。
   ・席のつなぎかた：「この端末の本人」チェック（オフラインでも XEVA が入る）／アカウント連携（表示名で検索 → 4桁）。
     連携の画面は GameLink のモーダルをやめて、このアプリの画面の中に作り直した（通信は quiz-account.js）。
   ============================================================ */
(function () {
  "use strict";
  const MQ = window.MQ, Q = MQ.Data, A = MQ.Account, FX = MQ.FX;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtN = (n) => Number(n || 0).toLocaleString("ja-JP");
  const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.round(s % 60)).padStart(2, "0");

  /* ══ アイコン（線の絵） ══ */
  const IC = {
    play: '<path class="fl" d="M8 5.2v13.6l11-6.8z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    book: '<path d="M5 4.5h9.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h9.5"/><path d="M8.5 8.5h5M8.5 11.5h4"/>',
    trophy: '<path d="M7 4.5h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.6M17 6h2.5a2.5 2.5 0 0 1-2.6 3.6"/><path d="M12 13.5v3M8.5 19.5h7"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><path d="M12 16.6v.4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
    menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
    pause: '<path class="fl" d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/>',
    again: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4.5V9h-4.5"/>',
    home: '<path d="M4 11.2 12 4.5l8 6.7"/><path d="M6.5 9.5v9.5h11V9.5"/><path d="M10 19v-5h4v5"/>',
    crown: '<path d="M4 17.5 3 7.5l5 4 4-6.5 4 6.5 5-4-1 10z"/><path d="M5 20h14"/>',
    hint: '<path d="M9 18h6M10 21h4"/><path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-.6c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.5z"/>',
    people: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3.3 2.7-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.6 14.4c2.5-.3 4.3 1.2 4.9 4.1"/>',
    half: '<circle cx="12" cy="12" r="8.5"/><path class="fl" d="M12 3.5a8.5 8.5 0 0 1 0 17z"/>',
    swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
    stop: '<path d="M6 21V5M6 5.5c4-2.5 7 2 12-.5v8c-5 2.5-8-2-12 .5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    heart: '<path class="fl" d="M12 20.2C10.9 19.2 3.6 14.7 3.6 9.3 3.6 6.5 5.6 4.6 8.1 4.6c1.6 0 3 .9 3.9 2.2.9-1.3 2.3-2.2 3.9-2.2 2.5 0 4.5 1.9 4.5 4.7 0 5.4-7.3 9.9-8.4 10.9Z"/>',
    star: '<path class="fl" d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    seon: '<path class="fl" d="M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    seoff: '<path class="fl" d="M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    team: '<circle cx="8" cy="9" r="2.6"/><circle cx="16" cy="9" r="2.6"/><path d="M3.5 18.5c.5-2.8 2.2-4.3 4.5-4.3s4 1.5 4.5 4.3M11.5 18.5c.5-2.8 2.2-4.3 4.5-4.3s4 1.5 4.5 4.3"/>',
    solo: '<circle cx="12" cy="8.5" r="3.2"/><path d="M5.5 19.5c.7-3.6 3-5.5 6.5-5.5s5.8 1.9 6.5 5.5"/>',
    shuffle: '<path d="M4 7h3l10 10h3M4 17h3l2.6-2.6M14.4 9.6 17 7h3"/><path d="M18 4.5 20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5"/>',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 3h5"/>',
    pen: '<path d="M4 20l1-4.2L16.3 4.5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.2 19z"/><path d="M14.5 6.3l3.2 3.2"/>',
    calc: '<rect x="5.5" y="3" width="13" height="18" rx="2.4"/><rect x="8.2" y="5.8" width="7.6" height="3.4" rx=".8"/><path d="M8.7 12.6h.01M12 12.6h.01M15.3 12.6h.01M8.7 15.7h.01M12 15.7h.01M15.3 15.7h.01M8.7 18.4h.01M12 18.4h.01M15.3 18.4h.01"/>',
    table: '<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><path d="M3.5 10h17M9 10v9"/>',
    keyboard: '<rect x="3" y="6.5" width="18" height="11" rx="2.2"/><path d="M6.5 10h.01M9.5 10h.01M12.5 10h.01M15.5 10h.01M18 10h.01M6.5 13h.01M9.5 13h.01M12.5 13h.01M15.5 13h.01M8 15.2h8"/>',
    eraser: '<path d="M8.5 19.5 4 15a2 2 0 0 1 0-2.8l8.2-8.2a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L12.3 19.5z"/><path d="M8 8.5l7.5 7.5M8.5 19.5H20"/>',
    undo: '<path d="M8.5 8.5H15a5 5 0 0 1 0 10H9"/><path d="M12 5 8.5 8.5 12 12"/>',
    hand: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5v-1a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14a6.5 6.5 0 0 1-6.5 6.5A6 6 0 0 1 5.8 18l-2-3.4a1.5 1.5 0 0 1 2.6-1.5L8 15"/>',
    zin: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20M10.5 8v5M8 10.5h5"/>',
    zout: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20M8 10.5h5"/>',
    fit: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l1 12.5h9L17.5 7M10 11v5M14 11v5"/>',
    expand: '<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>',
    list: '<path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
    flame: '<path d="M12 21.5a6.6 6.6 0 0 0 6.6-6.6c0-3.7-2.8-5.6-3.8-9.4-1 1.9-1.9 2.8-3.3 3.3-.9-1.8-1.9-3.7-1.6-5.8C6.5 5 5.4 9.8 5.4 14.9a6.6 6.6 0 0 0 6.6 6.6z"/>',
    tower: '<path d="M6 21V9l6-5 6 5v12"/><path d="M6 13h12M6 17h12M10.5 21v-4h3v4"/>',
    stopw: '<circle cx="12" cy="14" r="7.2"/><path d="M12 10.4V14l2.4 1.6M9.8 3.4h4.4M12 3.4v3.2M18 7l1.3-1.3"/>',
    bomb: '<circle cx="10.5" cy="14.5" r="6.4" stroke-dasharray="2.6 2.6"/><path d="M14.8 9.8l1.9-1.9"/><path d="M16 7.5c.9-1.7 2.6-2.2 4.1-1.3"/><path d="M20.8 2.6v1.7M22.4 4.3h-1.7M19.1 2.9l.8.9"/>',
    buzzer: '<path d="M6 16a6 6 0 0 1 12 0"/><path d="M4.500 16h15l1.500 4h-18z"/><path d="M12 3v3M6.300 5.300l1.600 2M17.700 5.300l-1.600 2"/>',
    gift: '<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.5 13v7.5h13V13M12 9v11.5M12 9C10 9 7.5 8 7.5 5.9 7.5 4 10.5 4 12 9zM12 9c2 0 4.5-1 4.5-3.1C16.500 4 13.500 4 12 9z"/>',
  };
  const ic = (n, cls) => '<svg class="ic' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || "") + "</svg>";

  /* ══ 色 ══ */
  const COLORS = ["#ff4d6d", "#2f9bff", "#18c37e", "#ffb81c", "#ff6fd0", "#ff8a3d", "#16cfe0", "#a98bff"];
  const TEAMS = [{ nm: "レッド", c: "#ff4d6d" }, { nm: "ブルー", c: "#2f9bff" }, { nm: "グリーン", c: "#18c37e" }, { nm: "イエロー", c: "#ffb81c" }];
  const LET = "ABCDEFGHIJKL";

  const MODES = {
    bomb: { nm: "見えない爆弾", en: "HIDDEN BOMB", icon: "bomb", c: "#ff5a3c", tag: "どこで爆発するか、だれにも見えない", min: 2,
      d: "姿の見えない爆弾を<b>交互に</b>回すサバイバル。正解すれば次の人へ、まちがえたらもう1問。爆発した人はライフ −1。", pl: "2〜8人", tm: "10〜30分" },
    /* ★★ 2026-11-05 作りかけで後回し → ★★ 2026-11-08 ご指定「以前の提案の 2 の早押しモードを追加」で公開（off を付けると画面から隠せる） */
    rush: { nm: "早押しバトル", en: "BUZZER BATTLE", icon: "buzzer", c: "#f0509a", tag: "わかった瞬間に押せ", min: 2,
      d: "問題文が1文字ずつ出ます。わかった人が<b>自分のブザー</b>を押して答える早い者勝ち。お手つきはライフ −1。", pl: "2〜8人", tm: "5〜15分" },
    tower: { nm: "クイズタワー", en: "QUIZ TOWER", icon: "tower", c: "#27b4ff", tag: "10階のてっぺんをめざせ", min: 1,
      d: "<b>1問ずつ交互に</b>、自分のタワーを登る。上の階ほど高得点。まちがえるとチェックポイントまで転落。やめどきも作戦のうち。", pl: "1〜8人", tm: "10〜20分" },
    score: { nm: "スコアアタック", en: "SCORE ATTACK", icon: "stopw", c: "#ffb81c", tag: "速く、正確に", min: 1,
      d: "全員が同じ数の問題に<b>交互に</b>挑戦。速く答えるほど高得点、連続正解でボーナス。ひとり練習にもおすすめ。", pl: "1〜8人", tm: "5〜15分" },
  };

  const modeIds = () => Object.keys(MODES).filter((k) => !MODES[k].off);

  /* ══ 画面・シート・トースト ══ */
  function show(id) {
    $$(".scr").forEach((s) => s.classList.toggle("on", s.id === id));
    document.body.dataset.scr = id;
    const s = $("#" + id); if (s) s.scrollTop = 0;
  }
  const UI = { onClose: null, lock: false };
  function sheet(html, o) {
    o = o || {};
    const sh = $("#sheet");
    sh.className = "sheet" + (o.cls ? " " + o.cls : ""); sh.innerHTML = html; sh.scrollTop = 0;
    $("#ov").classList.add("on");
    UI.onClose = o.onClose || null; UI.lock = !!o.lock;
    return sh;
  }
  function closeSheet(force) {
    if (!$("#ov").classList.contains("on")) return;
    $("#ov").classList.remove("on");
    UI.lock = false;
    if (UI.onClose && force !== "silent") { const f = UI.onClose; UI.onClose = null; f(); } else UI.onClose = null;
  }
  const sheetOpen = () => $("#ov").classList.contains("on");
  let toastT = 0;
  function toast(h, ms) {
    const t = $("#toast"); t.innerHTML = h; t.hidden = false; t.classList.remove("on"); void t.offsetWidth; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("on"); setTimeout(() => { t.hidden = true; }, 260); }, ms || 2300);
  }
  /* アバター：連携した人・本人はキャラの絵／ほかは名前の頭文字
     ★★ 2026-11-10 ご指定「オフライン時や紐づけがないプレイヤーのアイコン画像を、アプリに実装されている UR キャラからそれぞれ選べるように（名前のままも）」
       → 席ごとの pic（キャラの id）。絵は xeva.js の MB_CHAR_MASTER（XEVA.MB_CHARS）の UR の小さい絵 */
  function urList() {
    let L = []; try { L = (window.XEVA && XEVA.MB_CHARS) || []; } catch (e) { L = []; }
    return L.filter((c) => c && c.rarLabel === "UR" && c.mbId && c.file).slice().sort((a, b) => String(b.since || "").localeCompare(String(a.since || "")));
  }
  function picSrc(id) { const c = urList().find((x) => x.mbId === id); return c ? c.file : ""; }
  function avatar(o, cls) {
    const th = o.acc ? A.thumb(o.acc) : o.pic ? picSrc(o.pic) : "", ch = o.icon ? ic(o.icon) : esc(String(o.name || "?").slice(0, 1));
    return '<span class="av' + (cls ? " s-" + cls : "") + '" style="--c:' + (o.color || "#a98bff") + '"><i>' + ch + "</i>" + (th ? '<img src="' + esc(th) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + "</span>";
  }

  /* ══ 黄色いブザーのボタン ══ */
  const buzzBtn = (act, label, cls, attrs) => '<button class="buzz' + (cls ? " " + cls : "") + '" data-a="' + act + '"' + (attrs || "") + "><span>" + label + "</span></button>";

  /* ══ ロゴ（アイコンの Q とブザーをそのまま動かせる形で） ══ */
  const LOGO = '<svg class="lg" viewBox="100 80 1054 1050" role="img" aria-label="MagiQuiz"><defs>' +
    '<linearGradient id="lgDome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffe94f"/><stop offset=".78" stop-color="#ffe33d"/><stop offset="1" stop-color="#f6b525"/></linearGradient></defs>' +
    '<g class="lg-spk"><path d="M166 272l66-44 74 144-20 16z"/><path d="M130 446l18-74 110 52-8 24z"/><path d="M1088 272l-66-44-74 144 20 16z"/><path d="M1124 446l-18-74-110 52 8 24z"/></g>' +
    '<g class="lg-q"><circle cx="620" cy="365" r="200" fill="none" stroke="#fff" stroke-width="104"/><path d="M622 418l68-60 196 182-74 68z" fill="#fff" stroke="#6a07e0" stroke-width="10" stroke-linejoin="round" paint-order="stroke"/></g>' +
    '<g class="lg-bz"><g class="lg-dome"><path d="M385 734c10-88 112-134 240-134s230 46 240 134z" fill="url(#lgDome)"/><path d="M385 734h480l-6 12H390z" fill="#f6a81e"/><ellipse cx="497" cy="646" rx="56" ry="13" fill="#fff6c2" transform="rotate(-11 497 646)"/></g>' +
    '<path d="M330 728h594c14 0 22 6 26 18l-3 0 26 62H304l26-68c2-8 0-12 0-12z" fill="#fff"/></g>' +
    '<text x="627" y="1042" text-anchor="middle" class="lg-tx"><tspan fill="#fff">Magi</tspan><tspan fill="#ffe33d">Quiz</tspan></text></svg>';

  /* ══════════════════════════════════════════════════════════════
     ① タイトル
     ══════════════════════════════════════════════════════════════ */
  function openTitle() {
    FX.ambOn(false);
    show("title");
    FX.music("title");
    const n = Q && Q.ok ? Q.all().length : 0, sv = MQ.Play ? MQ.Play.saved() : null, m = MODES[setup.mode];
    const hasLast = !!setup.played;
    $("#title").innerHTML =
      '<a class="t-home" href="../index.html" aria-label="XEVARION へもどる">' + ic("back") + "<span>XEVARION</span></a>" +
      '<button class="t-gear" data-a="opts" aria-label="設定">' + ic("gear") + "</button>" +
      '<div class="t-main">' +
        '<button class="t-logo" data-a="logo" aria-label="あそぶ">' + LOGO + "</button>" +
        '<p class="t-tag">化学の基礎で、みんなでクイズバトル！</p>' +
        '<div class="t-btns">' +
          (sv ? '<button class="t-resume" data-a="resume"><b>つづきから</b><small>' + esc(MODES[sv.mode].nm) + "・" + esc(sv.who) + "</small></button>" : "") +
          buzzBtn("start", "あそぶ", "lg") +
          (hasLast ? '<button class="t-last" data-a="quick">' + ic("again") + "<span>前回と同じで始める<small>" + esc(m.nm) + "・" + seats().length + "人</small></span></button>" : "") +
          /* ★★ 2026-11-08 ご指定「2台での対戦」：それぞれの端末で同じ問題に同時に答える（quiz-online.js） */
          '<button class="t-last t-ol" data-a="online">' + ic("people") + "<span>2台で対戦<small>それぞれの端末で、同じ問題にスピード勝負</small></span></button>" +
          '<div class="t-sub"><button data-a="rules">' + ic("book") + '<span>あそび方</span></button><button data-a="records">' + ic("trophy") + "<span>記録</span></button></div>" +
        "</div>" +
        '<p class="t-src">' + (n ? "出題：MagiChemLex 基礎セット1〜4 の改題 <b>" + fmtN(n) + "</b>問" : "問題を読みこめませんでした。通信のあるところで開き直してください") + "</p>" +
      "</div>";
  }

  /* ══════════════════════════════════════════════════════════════
     ② 準備：① あそびかた ② メンバー ③ ルール
     ══════════════════════════════════════════════════════════════ */
  const SETUP_KEY = "magiquiz_setup_v2";
  const blankSeat = (i) => ({ name: "プレイヤー" + (i + 1), link: null, owner: false, team: i % 2, pic: "" });
  const setup = {
    mode: "bomb", team: false, nTeams: 2, n: 3, all: COLORS.map((c, i) => blankSeat(i)),
    sets: Q && Q.SETS ? Q.SETS.map((s) => s[0]) : [], fields: Q && Q.FIELDS ? Q.FIELDS.map((f) => f[0]) : [], calc: true,
    limit: "mid", fuse: "mid", hearts: 2, miss: 5, tmiss: 3, rounds: 10, items: true, played: false, rtarget: 5, rhearts: 3, rspeed: "mid",
  };
  function saveSetup() {
    try {
      const o = {}; ["mode", "team", "nTeams", "n", "sets", "fields", "calc", "limit", "fuse", "hearts", "miss", "tmiss", "rounds", "items", "played", "rtarget", "rhearts", "rspeed"].forEach((k) => { o[k] = setup[k]; });
      o.players = setup.all.map((p) => ({ name: p.name, owner: !!p.owner, pic: p.pic || "", link: p.link && p.link.uid ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || "", charId: p.link.charId || "" } : null }));
      localStorage.setItem(SETUP_KEY, JSON.stringify(o));
    } catch (e) {}
  }
  function loadSetup() {
    try {
      let d = JSON.parse(localStorage.getItem(SETUP_KEY) || "null");
      if (!d) {
        /* 前の版の準備（名前と連携だけ引きつぐ） */
        const o = JSON.parse(localStorage.getItem("magiquiz_setup_v1") || "null");
        if (o) d = { n: o.n, players: o.players, team: o.team, nTeams: o.nTeams };
      }
      if (!d) return;
      if (MODES[d.mode] && !MODES[d.mode].off) setup.mode = d.mode;
      setup.team = !!d.team;
      if (d.nTeams >= 2 && d.nTeams <= 4) setup.nTeams = d.nTeams;
      if (d.n >= 1 && d.n <= 8) setup.n = d.n;
      if (Array.isArray(d.sets) && d.sets.length) setup.sets = d.sets.filter((v) => Q.SETS.some((s) => s[0] === v));
      if (Array.isArray(d.fields) && d.fields.length) setup.fields = d.fields.filter((v) => Q.FIELDS.some((s) => s[0] === v));
      if (!setup.sets.length) setup.sets = Q.SETS.map((s) => s[0]);
      if (!setup.fields.length) setup.fields = Q.FIELDS.map((f) => f[0]);
      if (d.calc === false) setup.calc = false;
      if (Q.RULE.LIMIT[d.limit]) setup.limit = d.limit;
      if (Q.RULE.FUSE[d.fuse]) setup.fuse = d.fuse;
      if ([1, 2, 3].indexOf(d.hearts) >= 0) setup.hearts = d.hearts;
      if ([0, 3, 5, 8].indexOf(d.miss) >= 0) setup.miss = d.miss;
      if ([1, 2, 3].indexOf(d.tmiss) >= 0) setup.tmiss = d.tmiss;
      if ([5, 10, 15].indexOf(d.rounds) >= 0) setup.rounds = d.rounds;
      if ([3, 5, 7, 10].indexOf(d.rtarget) >= 0) setup.rtarget = d.rtarget;
      if ([1, 2, 3].indexOf(d.rhearts) >= 0) setup.rhearts = d.rhearts;
      if (Q.RULE.RUSH.read[d.rspeed]) setup.rspeed = d.rspeed;
      if (d.items === false) setup.items = false;
      setup.played = !!d.played;
      if (Array.isArray(d.players)) d.players.slice(0, 8).forEach((sp, i) => {
        const p = setup.all[i]; if (!sp) return;
        if (sp.name) p.name = String(sp.name).slice(0, 8);
        p.owner = !!sp.owner;
        p.pic = sp.pic ? String(sp.pic).slice(0, 24) : "";
        if (sp.link && sp.link.uid) p.link = { uid: sp.link.uid, name: sp.link.name, charFile: sp.link.charFile || "", charId: sp.link.charId || "", confirmed: false };
      });
    } catch (e) {}
  }
  const seats = () => setup.all.slice(0, setup.n);
  const ST = { step: 1 };
  const minSeats = () => (setup.team ? 2 : MODES[setup.mode].min);

  function openSetup(step) {
    ST.step = step || 1;
    show("setup");
    FX.music("title");
    renderSetup();
    refreshProfiles();
  }
  const STEP_NM = ["あそびかた", "メンバー", "ルール"];
  function renderSetup() {
    if (setup.n < minSeats()) setup.n = minSeats();
    const s = ST.step, m = MODES[setup.mode];
    const head = '<div class="su-top"><button class="su-back" data-a="suBack" aria-label="もどる">' + ic("back") + "</button>" +
      '<ol class="su-steps">' + STEP_NM.map((t, i) => '<li class="' + (i + 1 === s ? "on" : i + 1 < s ? "done" : "") + '"><button data-a="suGo" data-v="' + (i + 1) + '"><i>' + (i + 1 < s ? ic("check") : i + 1) + "</i><span>" + t + "</span></button></li>").join("") + "</ol>" +
      '<button class="su-help" data-a="rules" aria-label="あそび方">' + ic("help") + "</button></div>";
    let body = "", foot = "";
    if (s === 1) {
      body = '<h2 class="su-h">どれであそぶ？</h2><div class="md-list">' + modeIds().map((id) => {
        const v = MODES[id];
        return '<button class="md' + (setup.mode === id ? " on" : "") + '" data-a="setMode" data-v="' + id + '" style="--c:' + v.c + '"><span class="md-ic">' + ic(v.icon) + '</span><span class="md-t"><small>' + v.en + "</small><b>" + v.nm + "</b><em>" + v.tag + "</em></span>" +
          '<span class="md-d">' + v.d + '</span><span class="md-m"><i>' + ic("people") + v.pl + "</i><i>" + ic("timer") + v.tm + "</i></span></button>";
      }).join("") + "</div>";
    } else if (s === 2) {
      body = stepMembers();
      foot = buzzBtn("suNext", "つぎへ（ルール）", "wide");
    } else {
      body = stepRules();
      const n = Q.count(setup), ok = n >= 10;
      foot = '<p class="su-sum">' + esc(m.nm) + "・" + (setup.team ? setup.nTeams + "チーム " : "") + setup.n + "人・<b>" + n + "問</b>から出題</p>" + buzzBtn("begin", "ゲームスタート", "wide" + (ok ? "" : " off"));
    }
    $("#setup").innerHTML = head + '<div class="su-body">' + body + "</div>" + (foot ? '<div class="su-foot">' + foot + "</div>" : "");
  }
  /* ── メンバー ── */
  function stepMembers() {
    const me = A.me(), mn = minSeats();
    const rows = seats().map((p, i) => {
      const col = COLORS[i], acc = p.owner ? me : p.link;
      const linked = !p.owner && p.link && p.link.uid, ok = linked && p.link.confirmed !== false;
      const lk = p.owner ? '<span class="st-lk me">' + ic("check") + "<span>XEVA 受取</span></span>"
        : !linked ? '<button class="st-lk" data-a="seatLink" data-i="' + i + '">' + ic("link") + "<span>連携</span></button>"
        : ok ? '<button class="st-lk on" data-a="seatLink" data-i="' + i + '">' + ic("check") + "<span>" + esc(p.link.name) + "</span></button>"
        : '<button class="st-lk wait" data-a="seatLink" data-i="' + i + '">' + ic("lock") + "<span>" + esc(p.link.name) + "（要確認）</span></button>";
      /* ★★ 2026-11-10 本人でも連携ずみでもない席は、絵を押すと UR キャラのアイコンをえらべる */
      const av = avatar({ name: p.name, color: col, acc, pic: !p.owner && !linked ? p.pic : "" }, "md");
      return '<div class="st" data-i="' + i + '" style="--c:' + col + '">' +
        (!p.owner && !linked ? '<button class="mqpic-av" data-a="seatPic" data-i="' + i + '" aria-label="' + (i + 1) + '人目のアイコンをえらぶ">' + av + '<i class="mqpic-ed">' + ic("pen") + "</i></button>" : av) +
        '<div class="st-m"><input class="st-nm" maxlength="8" value="' + esc(p.name) + '" aria-label="' + (i + 1) + '人目の名前" enterkeyhint="done"' + (p.owner ? " readonly" : "") + ">" +
        '<div class="st-row">' + lk +
        (me ? '<label class="st-own' + (p.owner ? " on" : "") + '"><input type="checkbox" data-c="own" data-i="' + i + '"' + (p.owner ? " checked" : "") + "><i>" + ic("check") + "</i><span>この端末の本人</span></label>" : "") + "</div></div>" +
        (setup.n > mn ? '<button class="st-x" data-a="seatDel" data-i="' + i + '" aria-label="この席を消す">' + ic("x") + "</button>" : "") + "</div>";
    }).join("");
    const k = Math.min(4, setup.n);
    return '<h2 class="su-h">だれが参加する？</h2>' +
      '<div class="su-seg"><button class="' + (setup.team ? "" : "on") + '" data-a="setTeam" data-v="0">' + ic("solo") + "個人戦</button><button class=\"" + (setup.team ? "on" : "") + '" data-a="setTeam" data-v="1">' + ic("team") + "チーム戦</button></div>" +
      (setup.team ? '<div class="su-seg sm">' + [2, 3, 4].map((v) => '<button class="' + (setup.nTeams === v ? "on" : "") + '" data-a="setTeams" data-v="' + v + '"' + (v > k ? " disabled" : "") + ">" + v + "チーム</button>").join("") + "</div>" +
        '<p class="su-note">チームは全員そろってから<b>くじ引き</b>で決めます（チームで相談して答えます）。</p>' : "") +
      '<div class="st-list">' + rows + "</div>" +
      (setup.n < 8 ? '<button class="st-add" data-a="seatAdd">' + ic("plus") + "プレイヤーを追加（" + setup.n + "/8）</button>" : "") +
      '<div class="su-tip">' + ic("gift") + "<div><b>順位で XEVA がもらえます</b>（1位 1,000・2位 700・3位 500…）。「この端末の本人」にチェックすると<b>オフラインでも</b>この端末に入ります。ほかの人はアカウント連携すると本人のアカウントに届きます。</div></div>";
  }
  /* ── ルール ── */
  function segRow(key, label, icon, list, note) {
    return '<div class="ru"><div class="ru-l">' + ic(icon) + "<b>" + label + "</b></div><div class=\"su-seg sm\">" + list.map((o) => '<button class="' + (String(setup[key]) === String(o[0]) ? "on" : "") + '" data-a="setOpt" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + "</button>").join("") + "</div>" + (note ? '<p class="ru-n">' + note + "</p>" : "") + "</div>";
  }
  function stepRules() {
    const m = setup.mode, L = Q.RULE.LIMIT[setup.limit], F = Q.RULE.FUSE[setup.fuse];
    const chip = (list, key, cnt) => list.map((s) => '<button class="ch' + (setup[key].indexOf(s[0]) >= 0 ? " on" : "") + '" data-a="chip" data-k="' + key + '" data-v="' + s[0] + '">' + esc(s[1]) + "<small>" + cnt(s[0]) + "</small></button>").join("");
    const nS = (v) => Q.count({ sets: [v], fields: setup.fields, calc: setup.calc }), nF = (v) => Q.count({ sets: setup.sets, fields: [v], calc: setup.calc });
    const n = Q.count(setup), calcN = Q.count({ sets: setup.sets, fields: setup.fields, calc: true }) - Q.count({ sets: setup.sets, fields: setup.fields, calc: false });
    let html = '<h2 class="su-h">' + esc(MODES[m].nm) + " のルール</h2>";
    if (m === "bomb") {
      html += '<section class="ru-c">' +
        segRow("fuse", "爆弾の時間", "bomb", Object.keys(Q.RULE.FUSE).map((k) => [k, Q.RULE.FUSE[k].nm]), "答えている間だけ進みます。" + mmss(F.r[0]) + "〜" + mmss(F.r[1]) + " のどこかで爆発（だれにも見えません）。") +
        segRow("hearts", "ライフ", "heart", [[1, "1"], [2, "2"], [3, "3"]], "爆発すると −1。0 でアウト。") +
        segRow("miss", "ミスの上限", "x", [[3, "3回"], [5, "5回"], [8, "8回"], [0, "なし"]], "まちがえすぎるとライフ −1（時間切れもミス）。") + "</section>";
    } else if (m === "tower") {
      html += '<section class="ru-c">' + segRow("tmiss", "ライフ", "heart", [[1, "1"], [2, "2"], [3, "3"]], "まちがえると −1 して、チェックポイント（3階・7階）まで転落。0 でそのタワーは終わり。") + "</section>";
    } else if (m === "rush") {
      html += '<section class="ru-c">' +
        segRow("rtarget", "先に何問正解で勝ち", "trophy", [[3, "3問"], [5, "5問"], [7, "7問"], [10, "10問"]]) +
        segRow("rhearts", "ライフ", "heart", [[1, "1"], [2, "2"], [3, "3"]], "お手つき（まちがい・時間切れ）で −1。0 でアウト。") +
        segRow("rspeed", "問題文が出る速さ", "book", Object.keys(Q.RULE.RUSH.read).map((k) => [k, Q.RULE.RUSH.read[k].nm])) + "</section>";
    } else {
      html += '<section class="ru-c">' + segRow("rounds", "1人あたりの問題数", "list", [[5, "5問"], [10, "10問"], [15, "15問"]], "全部で " + (setup.rounds * Math.max(1, setup.team ? setup.nTeams : setup.n)) + " 問くらい。") + "</section>";
    }
    const RL = Q.RULE.RUSH.limit[setup.limit] || Q.RULE.RUSH.limit.mid;
    const limNote = m === "rush" ? (RL[0] ? "ブザーを押してから 約" + RL[0] + "秒・<b>計算問題 " + RL[1] + "秒</b>" : "押してからの時間制限なし")
      : L.n ? "ふつうの問題 約" + L.n + "秒・<b>計算問題 " + L.c + "秒</b>（長い問題は少しのびます）" : "時間制限なし" + (m === "bomb" ? "（爆弾の時間だけ進みます）" : "");
    html += '<section class="ru-c">' + segRow("limit", m === "rush" ? "答える時間" : "1回の解答時間", "timer", Object.keys(Q.RULE.LIMIT).map((k) => [k, Q.RULE.LIMIT[k].nm]), limNote) +
      (m === "bomb" || m === "tower" ? segRow("items", "アイテム", "star", [[true, "あり"], [false, "なし"]], m === "bomb" ? "しぼる・ヒント・チェンジを1回ずつ" : "しぼる・ヒント・みんなの声を1回ずつ") : "") +
      (m === "rush" ? "" : '<p class="ru-n">順番は、試合のはじめにくじ引きで決めます。</p>') + "</section>";
    html += '<section class="ru-c"><div class="ru"><div class="ru-l">' + ic("book") + "<b>出題範囲</b><em>MagiChemLex 基礎セットの改題</em></div>" +
      '<div class="ch-w">' + chip(Q.SETS, "sets", nS) + "</div>" + '<div class="ch-w">' + chip(Q.FIELDS, "fields", nF) + "</div></div>" +
      segRow("calc", "計算問題", "calc", [[true, "出す（" + calcN + "問）"], [false, "出さない"]], "計算問題は MagiChemLex で指定されているもの。") +
      '<p class="ru-pool' + (n >= 10 ? "" : " bad") + '">' + (n >= 10 ? "この範囲から <b>" + n + "問</b>" : "この範囲は " + n + "問だけです。10問以上になるように広げてください") + "</p></section>";
    return html;
  }
  let profDone = false;
  function refreshProfiles() {
    if (profDone) return;
    profDone = true;
    const jobs = setup.all.filter((p) => p.link && p.link.uid).map((p) => A.refresh(p.link).then((v) => {
      if (!v || !p.link) return false;
      const ch = (v.charFile || "") !== (p.link.charFile || "") || (v.name || "") !== (p.link.name || "");
      p.link.name = v.name || p.link.name; p.link.charFile = v.charFile || ""; p.link.charId = v.charId || "";
      return ch;
    }));
    if (jobs.length) Promise.all(jobs).then((rs) => { if (!rs.some(Boolean)) return; saveSetup(); if ($("#setup").classList.contains("on") && ST.step === 2) renderSetup(); });
  }
  function setOwner(i, on) {
    const me = A.me();
    if (!me) return;
    setup.all.forEach((p) => { if (p.owner) { p.owner = false; if (p.name === String(me.name).slice(0, 8)) p.name = "プレイヤー" + (setup.all.indexOf(p) + 1); } });
    if (on) { const p = setup.all[i]; p.owner = true; p.link = null; p.name = String(me.name).slice(0, 8); }
    FX.sfx("sel"); saveSetup(); renderSetup();
  }
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches && t.matches(".st-nm")) { const i = +t.closest(".st").dataset.i; setup.all[i].name = t.value.slice(0, 8); saveSetup(); const av = t.closest(".st").querySelector(".av i"); if (av) av.textContent = t.value.slice(0, 1) || "?"; }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.c === "own") setOwner(+t.dataset.i, t.checked);
  });

  /* ══ アカウント連携（検索 → 4桁）══ */
  const LK = { i: 0, step: "search", rows: [], q: "", hit: null, pin: "", msg: "", busy: false, confirm: false };
  /* ★★ 2026-11-10 アイコンをえらぶ（UR キャラ・名前のまま） */
  function openPic(i) {
    const p = setup.all[i]; if (!p) return;
    const col = COLORS[i], list = urList();
    const cell = (v, inner, nm, on) => '<button class="mqpic-c' + (on ? " on" : "") + '" data-a="picSet" data-i="' + i + '" data-v="' + esc(v) + '" style="--c:' + col + '">' + inner + "<small>" + esc(nm) + "</small></button>";
    sheet('<h3 class="sh-t">' + ic("people") + esc(p.name) + " のアイコン</h3>" +
      '<p class="sh-p">XEVARION に実装されている <b>UR キャラ</b>からえらべます（連携していない人・オフラインのとき用）。</p>' +
      '<div class="mqpic-g">' + cell("", avatar({ name: p.name, color: col }, "md"), "名前のまま", !p.pic) +
      list.map((c) => cell(c.mbId, '<span class="mqpic-im"><img src="' + esc(c.file) + '" alt="" loading="lazy"></span>', c.name, p.pic === c.mbId)).join("") + "</div>" +
      '<div class="sh-b"><button class="btn" data-a="close">とじる</button></div>', { cls: "mqpic" });
  }
  function openLink(i) {
    const p = setup.all[i];
    if (navigator.onLine === false) { toast("オフライン中は連携できません。自分の端末なら「この端末の本人」にチェックするだけで XEVA が入ります", 3400); return; }
    if (p.link && p.link.uid && p.link.confirmed !== false) {
      sheet('<h3 class="sh-t">' + ic("link") + esc(p.link.name) + "</h3><p class=\"sh-p\">連携を解除しますか？</p><div class=\"sh-b\"><button class=\"btn danger\" data-a=\"lkOff\" data-i=\"" + i + '">解除する</button><button class="btn" data-a="close">そのまま</button></div>');
      return;
    }
    Object.assign(LK, { i, step: "search", rows: [], q: p.name && !/^プレイヤー\d$/.test(p.name) ? p.name : "", hit: null, pin: "", msg: "", busy: false, confirm: false });
    if (p.link && p.link.uid) { LK.step = "pin"; LK.hit = p.link; LK.confirm = true; }
    paintLink();
  }
  function lkRow(r, k) {
    return '<button class="lk-r" data-a="lkPick" data-k="' + k + '">' + avatar({ name: r.name, acc: r, color: "#a98bff" }, "sm") + "<b>" + esc(r.name) + "</b>" + ic("next") + "</button>";
  }
  function paintLink() {
    const recent = A.recent().filter((r) => !setup.all.some((p) => p.link && p.link.uid === r.uid));
    let html;
    if (LK.step === "search") {
      html = '<h3 class="sh-t">' + ic("link") + "アカウント連携</h3><p class=\"sh-p\">順位の XEVA が、その人の XEVARION アカウントに届きます。</p>" +
        '<div class="lk-s"><input id="lkQ" type="search" placeholder="表示名で検索" value="' + esc(LK.q) + '" maxlength="20" autocomplete="off" enterkeyhint="search"><button class="btn pri" data-a="lkSearch"' + (LK.busy ? " disabled" : "") + ">" + (LK.busy ? "検索中…" : "検索") + "</button></div>" +
        (LK.msg ? '<p class="lk-msg">' + esc(LK.msg) + "</p>" : "") +
        (LK.rows.length ? '<div class="lk-l">' + LK.rows.map((r, k) => lkRow(r, "r" + k)).join("") + "</div>" : "") +
        (!LK.rows.length && recent.length ? '<p class="lk-h">この端末で連携したことのある人</p><div class="lk-l">' + recent.slice(0, 5).map((r, k) => lkRow(r, "h" + k)).join("") + "</div>" : "") +
        '<div class="sh-b"><button class="btn" data-a="close">とじる</button></div>';
    } else {
      const dots = [0, 1, 2, 3].map((k) => '<i class="' + (k < LK.pin.length ? "on" : "") + '"></i>').join("");
      const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "bs"];
      html = '<div class="lk-who">' + avatar({ name: LK.hit.name, acc: LK.hit, color: "#a98bff" }, "md") + "<div><b>" + esc(LK.hit.name) + "</b><small>" + (LK.confirm ? "前回の連携を引きつぎます" : "このアカウントに連携します") + "</small></div></div>" +
        '<p class="sh-p center">4桁のパスワードを入力</p><div class="lk-dots' + (LK.msg ? " bad" : "") + '">' + dots + "</div>" +
        '<p class="lk-msg center">' + esc(LK.msg || " ") + "</p>" +
        '<div class="lk-pad">' + keys.map((k) => (k === "" ? "<span></span>" : '<button data-a="lkKey" data-v="' + k + '"' + (LK.busy ? " disabled" : "") + ">" + (k === "bs" ? ic("back") : k) + "</button>")).join("") + "</div>" +
        '<div class="sh-b">' + (LK.confirm ? '<button class="btn danger" data-a="lkOff" data-i="' + LK.i + '">連携を解除</button>' : '<button class="btn" data-a="lkBack">検索にもどる</button>') + '<button class="btn" data-a="close">やめる</button></div>';
    }
    if (sheetOpen() && $("#sheet").classList.contains("lk")) { const sh = $("#sheet"); sh.innerHTML = html; } else sheet(html, { cls: "lk" });
    const q = $("#lkQ");
    if (q) {
      q.addEventListener("input", () => { LK.q = q.value; });
      q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); lkSearch(); } });
    }
  }
  async function lkSearch() {
    const nm = String(LK.q || "").trim();
    if (!nm) { LK.msg = "表示名を入力してください"; paintLink(); return; }
    LK.busy = true; LK.msg = ""; paintLink();
    const r = await A.search(nm);
    LK.busy = false;
    if (r.error) LK.msg = "通信できませんでした";
    else { LK.rows = r.rows || []; if (!LK.rows.length) LK.msg = "その名前のアカウントが見つかりません"; }
    paintLink();
  }
  function lkPick(k) {
    const list = k[0] === "r" ? LK.rows : A.recent().filter((r) => !setup.all.some((p) => p.link && p.link.uid === r.uid));
    const r = list[+k.slice(1)]; if (!r) return;
    if (("hasPw" in r || "gamePwHash" in r) && !r.gamePwHash && !r.hasPw) { LK.msg = "このアカウントは4桁パスワードが未設定です（ホームの設定で決められます）"; paintLink(); return; }
    const me = A.me();
    if (me && me.uid && r.uid === me.uid) { LK.msg = "自分のアカウントは「この端末の本人」にチェックしてください"; paintLink(); return; }
    if (setup.all.some((p, j) => j !== LK.i && j < setup.n && p.link && p.link.uid === r.uid)) { LK.msg = "そのアカウントはほかの席で使われています"; paintLink(); return; }
    LK.hit = { uid: r.uid, name: r.name, charFile: r.charFile || "", charId: r.charId || "" }; LK.step = "pin"; LK.pin = ""; LK.msg = ""; paintLink();
  }
  async function lkKey(v) {
    if (LK.busy) return;
    if (v === "bs") LK.pin = LK.pin.slice(0, -1); else if (LK.pin.length < 4) LK.pin += v;
    LK.msg = ""; FX.sfx("tap");
    paintLink();
    if (LK.pin.length < 4) return;
    LK.busy = true; paintLink();
    const r = await A.verify(LK.hit.uid, LK.pin);
    LK.busy = false; LK.pin = "";
    if (r.error) { LK.msg = "通信できませんでした"; paintLink(); return; }
    if (!r.ok) { LK.msg = "パスワードが正しくありません"; FX.sfx("ng"); paintLink(); return; }
    const p = setup.all[LK.i];
    p.link = Object.assign({}, LK.hit, { confirmed: true }); p.owner = false;
    if (/^プレイヤー\d$/.test(p.name) || !p.name) p.name = String(LK.hit.name).slice(0, 8);
    A.remember(p.link); saveSetup(); closeSheet(); renderSetup();
    FX.sfx("ok"); toast("🔗 " + esc(LK.hit.name) + " を連携しました");
  }

  /* ══ チーム抽選（くじ引き） ══ */
  function teamDraw(go) {
    const ps = seats(), k = Math.max(2, Math.min(setup.nTeams, ps.length));
    const ix = ps.map((p, i) => i);
    for (let i = ix.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; }
    ix.forEach((pi, n) => { setup.all[pi].team = n % k; });
    FX.sfx("drum");
    let delay = 0;
    sheet('<h3 class="sh-t center">' + ic("shuffle") + "チーム抽選</h3>" +
      '<div class="td">' + TEAMS.slice(0, k).map((t, ti) => '<div class="td-t" style="--c:' + t.c + '"><b>' + t.nm + "</b>" +
        ps.map((p, i) => ({ p, i })).filter((o) => setup.all[o.i].team === ti).map((o) => '<span style="animation-delay:' + ((delay++) * 0.26).toFixed(2) + 's">' + esc(o.p.name) + "</span>").join("") + "</div>").join("") + "</div>" +
      '<div class="sh-b col">' + buzzBtn("tdGo", "このチームではじめる", "wide") + '<button class="btn" data-a="tdAgain">' + ic("shuffle") + "もう一度抽選</button></div>", { cls: "tdsh" });
    UI.tdGo = go;
  }

  function begin() {
    if (!Q || !Q.ok) { toast("問題を読みこめませんでした"); return; }
    if (Q.count(setup) < 10) { toast("出題範囲を広げてください（10問以上）"); return; }
    if (MODES[setup.mode].min > 1 && (setup.team ? Math.min(setup.nTeams, setup.n) : setup.n) < 2) { toast(MODES[setup.mode].nm + "は2人以上で遊べます"); return; }
    const go = () => { setup.played = true; saveSetup(); MQ.Play.start(setup, seats()); };
    if (setup.team) teamDraw(go); else go();
  }

  /* ══════════════════════════════════════════════════════════════
     設定・あそび方・記録
     ══════════════════════════════════════════════════════════════ */
  function openOpts() {
    const o = FX.opt;
    const sw = (k, nm, d) => '<button class="cfg-r" data-a="optTog" data-k="' + k + '"><span><b>' + nm + "</b>" + (d ? "<small>" + d + "</small>" : "") + '</span><i class="sw' + (o[k] ? " on" : "") + '"></i></button>';
    /* ★★ 2026-11-08 司会キャラ（オンオフ・だれにするか） */
    const H = MQ.Host;
    const hostSec = H ? sw("host", "司会キャラ", "試合の実況とカットイン") + (o.host ? '<div class="cfg-r2"><b>司会をするキャラ</b>' + H.pickerHTML() + "</div>" : "") : "";
    sheet('<h3 class="sh-t">' + ic("gear") + "設定</h3><div class=\"cfg\">" + sw("se", "効果音") + sw("bgm", "BGM") + sw("vib", "振動", "対応している端末のみ") + sw("sol", "解説をいつも開く", "オフのときは、まちがえたときだけ開きます") + hostSec +
      '<div class="cfg-r2"><b>文字の大きさ</b><div class="su-seg sm">' + [[1, "ふつう"], [1.12, "大きい"], [1.26, "とても大きい"]].map((v) => '<button class="' + (Number(o.fs) === v[0] ? "on" : "") + '" data-a="optFs" data-v="' + v[0] + '">' + v[1] + "</button>").join("") + "</div></div></div>" +
      '<div class="sh-b"><button class="btn pri" data-a="close">とじる</button></div>', { onClose: UI.optBack || null });
  }
  const RULE_TX = {
    bomb: ["姿の見えない爆弾を、交互に回していくサバイバルです。",
      "持っている人が問題に答えます。<b>正解 → 次の人へ</b>。<b>まちがい → もう1問</b>（ミス +1）。",
      "爆弾は<b>見えません</b>。時間は答えている間だけ進み、ラウンドごとに長さが変わります。画面のふちの光・鼓動・チクタクが、だんだん激しくなります。",
      "爆発した人は<b>ライフ −1</b>。<b>ミスが上限</b>に達しても<b>ライフ −1</b>（ミスは0に戻り、爆弾は次の人へ）。ライフが 0 でアウト。最後の1人（1チーム）が勝ち。",
      "答えたあとは<b>時間が止まる</b>ので、解説をゆっくり確認できます。"],
    rush: ["問題文が1文字ずつ出ます。<b>わかった瞬間に自分のブザー</b>を押した人が答えます（文はそこで止まります）。",
      "正解で <b>+1</b>。先に決めた数だけ正解した人（チーム）の勝ち。",
      "<b>お手つき</b>（まちがい・時間切れ）はライフ −1 で、その問題はもう押せません。文のつづきが出て、のこりの人が押せます。ライフが 0 でアウト。",
      "文が出おわると選択肢がみんなに見えて、少しのあいだ押せます。だれも押さなければ次の問題へ。",
      "問題が終わると<b>時間が止まり</b>、解説を確認できます。パソコンは数字キー（1〜8）でも押せます。"],
    tower: ["1問ずつ交互に、自分のタワーを登ります（10階 32,000 pt まで）。",
      "正解で1階上へ。上の階ほど点が大きく、問題も難しくなります。",
      "まちがえると<b>チェックポイント（3階・7階）まで転落</b>し、ライフ −1。0 になるとそこで終わりです。",
      "自分の番に<b>「降りる」</b>を押すと、いまの点で確定して終われます（そのときの問題の答えも見られます）。",
      "アイテム（各1回）：<b>しぼる</b>（選択肢を半分に）・<b>ヒント</b>・<b>みんなの声</b>（まわりの人の投票）。"],
    score: ["全員が同じ数の問題に、交互に挑戦します。",
      "正解すると 100〜200 点（難しいほど高い・計算問題は +50）。のこり時間に応じて最大 +100、連続正解で最大 +100。",
      "1人でも遊べます（ひとり練習。ベスト記録が残ります）。"],
  };
  function openRules(mode) {
    mode = mode || MQ.Play.mode() || setup.mode;
    const tabs = '<div class="su-seg sm rv-seg">' + modeIds().map((k) => '<button class="' + (k === mode ? "on" : "") + '" data-a="rulesTab" data-v="' + k + '">' + MODES[k].nm + "</button>").join("") + "</div>";
    sheet('<h3 class="sh-t">' + ic("book") + "あそび方</h3>" + tabs + '<ul class="rl">' + RULE_TX[mode].map((t) => "<li>" + t + "</li>").join("") + "</ul>" +
      '<h4 class="rl-h">どの遊び方でも</h4><ul class="rl"><li>問題は MagiChemLex の基礎セット1〜4 の改題です。図のある問題は図も出ます。</li><li>問題中は<b>メモ・電卓・公式</b>が使えます。</li><li>答えは選んでから<b>ブザー</b>で決定。時間切れはまちがいと同じです。</li><li>順番は試合のはじめにくじ引きで決まります。</li>' +
      "<li>チーム戦はくじ引きでチームを決めて、相談して答えます。</li><li>賞金：1位 1,000・2位 700・3位 500・4位 350・5位 250・6位 180・7位 120・8位 80 XEVA（3問以上答えた人）。ひとりプレイは 正解×40 XEVA（最大 400）。</li>" +
      "<li><b>2台で対戦</b>：タイトルの「2台で対戦」から。それぞれの端末で同じ問題に同時に答えるスピード勝負（2〜4台）。</li><li><b>司会キャラ</b>：設定でオン／オフと、司会をするキャラ（ホームのパートナー・完凸ロビーのキャラ）を選べます。</li></ul>" +
      '<div class="sh-b"><button class="btn pri" data-a="close">とじる</button></div>', { cls: "rules", onClose: UI.rulesBack || null });
  }
  function openRecords() {
    show("records");
    const st = A.stats(), rows = Object.keys(st).map((k) => Object.assign({ id: k }, st[k])).sort((a, b) => (b.id === "me") - (a.id === "me") || b.wins - a.wins || b.games - a.games);
    const seen = new Set(Q.recent()), tot = Q.all().length, cov = Q.all().filter((x) => seen.has(x.id)).length;
    const fieldRows = (r) => Q.FIELDS.map((f) => { const a = (r.fields || {})[f[0]]; if (!a || !a.n) return ""; const p = Math.round(a.ok / a.n * 100); return '<div class="rc-f"><span>' + f[1] + '</span><i><b style="width:' + p + '%"></b></i><em>' + p + "%</em></div>"; }).join("");
    const weak = (r) => Object.keys(r.topics || {}).map((t) => ({ t, ...r.topics[t] })).filter((x) => x.n >= 2 && x.ok / x.n < 0.7).sort((a, b) => a.ok / a.n - b.ok / b.n).slice(0, 3).map((x) => "<span>" + esc(Q.topicName(x.t)) + " " + Math.round(x.ok / x.n * 100) + "%</span>").join("");
    $("#records").innerHTML = '<div class="su-top"><button class="su-back" data-a="toTitle" aria-label="もどる">' + ic("back") + '</button><h2 class="rc-h">記録</h2><span class="su-help"></span></div>' +
      '<div class="su-body">' +
      '<section class="rc-cov"><b>' + cov + "<small> / " + tot + " 問</small></b><span>この端末で出題された問題</span><i><u style=\"width:" + (tot ? cov / tot * 100 : 0).toFixed(1) + '%"></u></i></section>' +
      (rows.length ? rows.map((r) => {
        const w = weak(r);
        return '<section class="rc-c"><h3>' + esc(r.name) + (r.id === "me" ? '<em class="me">本人</em>' : /^local:/.test(r.id) ? "" : '<em>連携</em>') + "</h3>" +
          '<div class="rc-n"><span><b>' + r.games + "</b>試合</span><span><b>" + (r.wins || 0) + "</b>優勝</span><span><b>" + (r.n ? Math.round(r.ok / r.n * 100) : 0) + "</b>%正解</span>" +
          (r.best ? "<span><b>" + fmtN(r.best) + "</b>タワー最高</span>" : "") + (r.bestS ? "<span><b>" + fmtN(r.bestS) + "</b>スコア最高</span>" : "") + (r.boom ? "<span><b>" + r.boom + "</b>爆発</span>" : "") + "</div>" +
          fieldRows(r) + (w ? '<p class="rc-w"><small>苦手かも</small>' + w + "</p>" : "") + "</section>";
      }).join("") : '<p class="rc-e">まだ記録がありません。遊ぶとここにたまります。</p>') + "</div>";
  }

  /* ══ data-a の表 ══ */
  const ACT = {
    logo: () => { const l = $(".t-logo"); if (l) { l.classList.remove("hit"); void l.offsetWidth; l.classList.add("hit"); } FX.sfx("buzz"); FX.burst(innerWidth / 2, innerHeight * 0.34, 34, ["#ffe33d", "#fff", "#ffb020"], 520); setTimeout(() => openSetup(1), 300); },
    start: () => { FX.sfx("buzz"); openSetup(1); },
    quick: () => { FX.sfx("buzz"); begin(); },
    resume: () => { FX.sfx("buzz"); MQ.Play.resume(); },
    toTitle: () => { FX.sfx("tap"); openTitle(); },
    opts: () => { FX.sfx("tap"); UI.optBack = null; openOpts(); },
    rules: () => { FX.sfx("tap"); UI.rulesBack = null; openRules(); },
    rulesTab: (el) => { const f = UI.onClose; UI.onClose = null; openRules(el.dataset.v); UI.onClose = f; },
    records: () => { FX.sfx("tap"); openRecords(); },
    close: () => closeSheet(),
    /* 準備 */
    suBack: () => { FX.sfx("tap"); if (ST.step > 1) { ST.step--; renderSetup(); $("#setup .su-body").scrollTop = 0; } else openTitle(); },
    suGo: (el) => { const v = +el.dataset.v; if (v !== ST.step) { FX.sfx("tap"); ST.step = v; renderSetup(); } },
    suNext: () => {
      const names = seats().map((p) => String(p.name || "").trim());
      if (names.some((n) => !n)) { toast("名前を入れてください"); return; }
      FX.sfx("buzz"); ST.step = 3; renderSetup();
    },
    setMode: (el) => { setup.mode = el.dataset.v; saveSetup(); FX.sfx("sel"); ST.step = 2; renderSetup(); },
    setTeam: (el) => { setup.team = el.dataset.v === "1"; if (setup.team && setup.n < 2) setup.n = 2; saveSetup(); FX.sfx("tap"); renderSetup(); },
    setTeams: (el) => { setup.nTeams = +el.dataset.v; saveSetup(); FX.sfx("tap"); renderSetup(); },
    seatAdd: () => { if (setup.n < 8) { const i = setup.n; setup.all[i] = setup.all[i] || blankSeat(i); setup.n++; saveSetup(); FX.sfx("tap"); renderSetup(); const l = $("#setup .su-body"); l.scrollTop = 99999; } },
    seatDel: (el) => {
      const i = +el.dataset.i, p = setup.all.splice(i, 1)[0];
      p.link = null; p.owner = false; p.pic = ""; p.name = "プレイヤー" + setup.all.length;
      setup.all.push(p); setup.n--;
      saveSetup(); FX.sfx("tap"); renderSetup();
    },
    seatLink: (el) => { FX.sfx("tap"); openLink(+el.dataset.i); },
    seatPic: (el) => { FX.sfx("tap"); openPic(+el.dataset.i); },
    picSet: (el) => { const p = setup.all[+el.dataset.i]; if (!p) return; p.pic = el.dataset.v || ""; saveSetup(); FX.sfx("sel"); closeSheet(); keepScroll(renderSetup); },
    lkSearch: () => lkSearch(),
    lkPick: (el) => { FX.sfx("tap"); lkPick(el.dataset.k); },
    lkKey: (el) => lkKey(el.dataset.v),
    lkBack: () => { LK.step = "search"; LK.msg = ""; paintLink(); },
    lkOff: (el) => { const p = setup.all[+el.dataset.i]; p.link = null; saveSetup(); closeSheet(); renderSetup(); toast("連携を解除しました"); },
    chip: (el) => {
      const k = el.dataset.k, v = k === "sets" ? +el.dataset.v : el.dataset.v, a = setup[k], i = a.indexOf(v);
      if (i >= 0) { if (a.length <= 1) { toast("1つ以上えらんでください"); return; } a.splice(i, 1); } else a.push(v);
      saveSetup(); FX.sfx("tap"); keepScroll(renderSetup);
    },
    setOpt: (el) => {
      const k = el.dataset.k, v = el.dataset.v;
      setup[k] = v === "true" ? true : v === "false" ? false : /^\d+$/.test(v) ? +v : v;
      saveSetup(); FX.sfx("tap"); keepScroll(renderSetup);
    },
    begin: () => { FX.sfx("buzz"); begin(); },
    tdGo: () => { const f = UI.tdGo; UI.tdGo = null; closeSheet("silent"); if (f) f(); },
    tdAgain: () => { const f = UI.tdGo; closeSheet("silent"); setTimeout(() => teamDraw(f), 60); },
    /* 設定 */
    optTog: (el) => {
      const k = el.dataset.k; FX.opt[k] = FX.opt[k] ? 0 : 1; if (k === "se" || k === "bgm") FX.opt[k] = !!FX.opt[k];
      FX.saveOpt(); if (k === "bgm") FX.refreshBgm();
      el.querySelector(".sw").classList.toggle("on", !!FX.opt[k]); FX.sfx("tap");
      /* ★★ 2026-11-08 司会キャラ：オンにしたら選ぶ欄を出して、ひとこと */
      if (k === "host") { const f = UI.onClose; const y = $("#sheet").scrollTop; UI.onClose = null; openOpts(); UI.onClose = f; $("#sheet").scrollTop = y; if (FX.opt.host && MQ.Host) MQ.Host.say("start", {}, { noCut: true }); else if (MQ.Host) MQ.Host.hide(); }
    },
    hostPick: (el) => {
      FX.opt.hostId = el.dataset.v || ""; FX.saveOpt(); FX.sfx("sel");
      $$("#sheet .mh-pk").forEach((b) => b.classList.toggle("on", b === el));
      if (MQ.Host) MQ.Host.say("start", {}, { noCut: true, force: true });
    },
    optFs: (el) => { FX.opt.fs = +el.dataset.v; FX.saveOpt(); FX.applyFs(); $$("#sheet .cfg-r2 button").forEach((b) => b.classList.toggle("on", b === el)); FX.sfx("tap"); },
  };
  function keepScroll(fn) { const b = $("#setup .su-body"), y = b ? b.scrollTop : 0; fn(); const n = $("#setup .su-body"); if (n) n.scrollTop = y; }
  document.addEventListener("click", (e) => {
    const el = e.target.closest ? e.target.closest("[data-a]") : null;
    if (el && !el.disabled) { const f = ACT[el.dataset.a]; if (f) { e.preventDefault(); f(el); } return; }
    if (e.target === $("#ov") && !UI.lock) closeSheet();
  });

  MQ.U = { $, $$, esc, fmtN, mmss, ic, IC, COLORS, TEAMS, LET, MODES, ACT, UI, show, sheet, closeSheet, sheetOpen, toast, avatar, buzzBtn, openTitle, openOpts, openRules, setup, seats, saveSetup, begin };
  MQ.boot = function () { loadSetup(); openTitle(); };
})();

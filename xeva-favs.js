/* ══════════════════════════════════════════════════════════════
   xeva-favs.js — ★★ 2026-11-03 お気に入りキャラ（全キャラ・カードのバインダー）
   ──────────────────────────────────────────────────────────────
   ご指定：
     ・キャラの図鑑でお気に入り登録をそれぞれできるように・その絞り込みも
     ・お気に入りキャラをコレクションとして<b>ポケモンカードのように</b>保存して閲覧できるように
     ・いまのお気に入りキャラは一部のキャラしかいない（＝前の「お気に入りキャラ」は XEVA.CHARS の約30体からしか選べなかった）
     ・図鑑のように名前で検索・絞り込み・並び替え
     ・お気に入りはコミュニティなどから自分のも含めて見られるように
   ★★ 2026-11-03（2回目のご指定）
     ・図鑑のキャラ詳細でも登録できるように → mb-char-detail.js の detFavHTML（絵の右下の ☆）
     ・お気に入りの一覧で「性能を見る」と画面が戻ってしまう → 一覧と拡大のカードは閉じずに、<b>その上に</b>詳細を開く（openDet）。
       詳細の無い画面（ホーム・コミュニティ）は、押したときだけ mb-boot → mb-core → mb-char-detail を読む（MagiLex の KP交換所と同じ）。
     ・カードの裏に XEVARION のロゴ・回転できるように → 拡大は 3D のカード（表＝キャラ／裏＝XEVARION）。ドラッグで回す・タップで裏返す。
     ・UR はアートレアのように<b>全面イラスト</b>で、SS の絵を使う → cardHTML の .fa（SS 絵が無い・読めないときは大きい絵）。
   しくみ：
     ・保存はアカウント（xeva_account_v1 の fav＝MagiBurst の id の配列・登録順）。アカウントは同期するキーなので端末をまたぐ。
       前の showcase（最大5体）は、fav の先頭5体を写す（MagiLink のプロフィールの表示はそのまま動く）。
     ・コミュニティ用に accounts/{uid}.fav へも写す（xevarion-fb.js の updateProfile・getCollection が fav を読み書き）。
     ・選べるのは<b>持っているキャラ</b>（図鑑で名前が見えるキャラ）。キャラの台帳は xeva.js の MB_CHAR_MASTER（XEVA.MB_CHARS）。
   使いかた：
     XevaFav.ids() / has(id) / toggle(id) / canFav(id)
     XevaFav.open()                         … 自分のお気に入りカード
     XevaFav.open({ ids, name })            … ほかの人のお気に入りカード（見るだけ）
     XevaFav.cardHTML(info) / info(id)      … カード1枚
     XevaFav.toast(文)                      … いちばん上に出る小さな知らせ（詳細の ☆ からも使う）
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.XevaFav) return;
  /* このファイルの置き場（ロゴ・SS 絵・あとから読む詳細の JS をページの場所によらず読むため） */
  const BASE = (function () {
    try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/xeva-favs\.js.*$/, ""); } catch (e) {}
    return "";
  })();
  const P2M = { shion: "shiona", rinon: "rinonx" }, M2P = { shiona: "shion", rinonx: "rinon" };
  const EL = { fire: ["火", "#ff5d47", "#ffc2b3"], water: ["水", "#38a6ff", "#bfe2ff"], wood: ["木", "#2fbf71", "#b9f2d2"], light: ["光", "#f0b429", "#ffe9a8"], dark: ["闇", "#8a55f0", "#d8c6ff"] };
  const EL_ORDER = ["fire", "water", "wood", "light", "dark"];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const X = () => window.XEVA || null;
  function acc() {
    try { const x = X(); if (x && x.account) return x.account.get() || null; } catch (e) {}
    try { return JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); } catch (e) { return null; }
  }
  /* ── キャラの台帳（XEVA.MB_CHARS・No. 順）── */
  let _by = null, _byN = -1;
  function byId() {
    const m = (X() && X().MB_CHARS) || [];
    if (_by && _byN === m.length) return _by;
    _by = {}; _byN = m.length;
    m.forEach((c, i) => { if (c && c.mbId) _by[c.mbId] = Object.assign({ no: i + 1 }, c); });
    return _by;
  }
  function elOf(id, c) {
    try { if (typeof CHARS !== "undefined" && CHARS[id] && CHARS[id].el) return CHARS[id].el; } catch (e) {}
    try { if (window.XevaElOfFile) return window.XevaElOfFile(c && c.file) || ""; } catch (e) {}
    return "";
  }
  function typeOf(id) { try { if (typeof CHARS !== "undefined" && CHARS[id] && CHARS[id].type) return CHARS[id].type; } catch (e) {} return ""; }
  function catchOf(id) {
    try { const L = window.MB_NEW_CHARS || []; for (let i = 0; i < L.length; i++) if (L[i] && L[i].id === id && L[i].catch) return L[i].catch; } catch (e) {}
    return "";
  }
  /* ★★ 2026-11-03 UR の全面イラストに使う SS 絵（縦長 619×1100）。
     mb-core がある画面は CHARS[id].ss、無い画面は小さい絵の名前から（t_Haru.webp → MagiBurst/img/ss/HaruSS.webp＝UR 29体ぜんぶこの名前）。 */
  function ssOf(id, c) {
    try { if (typeof CHARS !== "undefined" && CHARS[id] && CHARS[id].ss) return BASE + "MagiBurst/img/ss/" + CHARS[id].ss; } catch (e) {}
    const m = /\/t_([^\/.]+)\.webp/.exec(String((c && c.file) || ""));
    return m ? BASE + "MagiBurst/img/ss/" + m[1] + "SS.webp" : "";
  }
  function info(id) {
    const c = byId()[id]; if (!c) return null;
    const f = String(c.file || "").replace(/^\.\.\//, "");
    const rar = c.rarLabel || (c.star5 ? "SSR" : "SR");
    return { id, name: c.name, no: c.no, rar, el: elOf(id, c), img: f, big: f.replace(/\/t_/, "/"),
      ss: rar === "UR" ? ssOf(id, c) : "", type: typeOf(id), catch: catchOf(id), since: c.since || "" };
  }
  /* 持っているか（MagiBurst のセーブ・ポータルのガチャのどちらか） */
  function owned(id) {
    try { const d = JSON.parse(localStorage.getItem("magiburst_v1") || "{}"); if (d && d.chars && d.chars[id]) return true; } catch (e) {}
    try { const g = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "{}"); if (g && g.owned && g.owned[M2P[id] || id]) return true; } catch (e) {}
    return id === "hina";
  }
  function canFav(id) { return !!byId()[id] && owned(id); }

  /* ── 保存（アカウント＝同期する）── */
  function ids() {
    const a = acc() || {};
    const L = Array.isArray(a.fav) ? a.fav : (Array.isArray(a.showcase) ? a.showcase.map((x) => P2M[x] || x) : []);
    return L.filter((id, i) => typeof id === "string" && L.indexOf(id) === i);
  }
  function has(id) { return ids().indexOf(id) >= 0; }
  let pushT = null;
  function save(list) {
    const x = X(); if (!x || !x.account) return false;
    const a = x.account.get() || {};
    a.fav = list.slice(0, 500);
    a.showcase = a.fav.slice(0, 5);
    try { x.account.save(a); } catch (e) { return false; }
    clearTimeout(pushT);
    pushT = setTimeout(() => {
      try { if (window.XEVASync && window.XEVASync.syncProfile) window.XEVASync.syncProfile(a); } catch (e) {}
      try { const FB = window.XEVARIONFB; if (FB && FB.updateProfile && a.xvUid) FB.updateProfile(a); } catch (e) {}
    }, 1200);
    try { window.dispatchEvent(new CustomEvent("xeva:fav", { detail: { ids: a.fav.slice() } })); } catch (e) {}
    return true;
  }
  function toggle(id) {
    const L = ids(), i = L.indexOf(id);
    if (i >= 0) L.splice(i, 1);
    else { if (!canFav(id)) return null; L.push(id); }
    return save(L) ? i < 0 : null;
  }

  /* ══ カード（トレーディングカード風）══
     ★★ 2026-11-03 UR は<b>全面イラスト</b>（アートレア風）：SS 絵をカードいっぱいに敷き、名前と説明は絵の上の帯に。虹のホイルと星のきらめき。 */
  function cardHTML(f, opt) {
    opt = opt || {};
    const E = EL[f.el] || ["", "#8a90a8", "#d8dce8"];
    const st = f.rar === "UR" ? 5 : f.rar === "SSR" ? 4 : 3;
    const top = '<b class="xfc-rar">' + esc(f.rar) + '</b><b class="xfc-nm">' + esc(f.name) + '</b><i class="xfc-no">No.' + f.no + "</i>";
    const type = '<span class="xfc-type"><i class="xfc-el">' + (E[0] || "?") + "</i>" + (E[0] ? E[0] + "属性" : "") + (f.type ? '<small>・' + esc(f.type) + "</small>" : "") + "</span>";
    const txt = '<span class="xfc-txt">' + esc(f.catch || f.name + " ― XEVARION のなかま") + "</span>";
    const ft = '<span class="xfc-ft"><i>' + "★".repeat(st) + "</i><em>XEVARION</em></span>";
    if (f.rar === "UR" && f.ss) {
      return '<button type="button" class="xfc r-ur fa" style="--ec:' + E[1] + ";--ec2:" + E[2] + '" data-id="' + esc(f.id) + '">' +
        '<span class="xfc-fa">' +
          '<img class="xfc-faimg" src="' + esc(f.ss) + '" alt="" loading="lazy" draggable="false" onerror="this.onerror=null;this.src=\'' + esc(f.big) + '\';this.classList.add(\'sq\')">' +
          '<i class="xfc-foil"></i><i class="xfc-spark"></i><i class="xfc-holo"></i>' +
          '<span class="xfc-top xfc-fatop">' + top + "</span>" +
          '<span class="xfc-fabot">' + type + txt + ft + "</span>" +
        "</span></button>";
    }
    return '<button type="button" class="xfc r-' + f.rar.toLowerCase() + '" style="--ec:' + E[1] + ";--ec2:" + E[2] + '" data-id="' + esc(f.id) + '">' +
      '<span class="xfc-in">' +
        '<span class="xfc-top">' + top + "</span>" +
        '<span class="xfc-art"><img src="' + esc(f.img) + '" alt="" loading="lazy" draggable="false"><i class="xfc-holo"></i></span>' +
        type + txt + ft +
      "</span></button>";
  }
  /* ★★ 2026-11-03 カードの裏（XEVARION のロゴ）。拡大したカードを回すと見える */
  function backHTML() {
    return '<span class="xfb"><i class="xfb-pat"></i><i class="xfb-rays"></i><i class="xfb-ring"></i>' +
      '<img class="xfb-orb" src="' + BASE + 'brand-xevarion-orb.png" alt="" draggable="false">' +
      '<img class="xfb-word" src="' + BASE + 'brand-xevarion-wordmark-dark.png" alt="XEVARION" draggable="false">' +
      '<small class="xfb-sub">CHARACTER CARD</small><i class="xfb-c c1"></i><i class="xfb-c c2"></i><i class="xfb-c c3"></i><i class="xfb-c c4"></i></span>';
  }

  /* ══ バインダー（自分＝編集できる／ほかの人＝見るだけ）══ */
  const S = { q: "", rar: "all", el: "all", sort: "add", list: [], own: true, name: "" };
  try { const v = JSON.parse(localStorage.getItem("xev_fav_view") || "null"); if (v) { S.sort = v.sort || "add"; } } catch (e) {}
  function css() {
    if (document.getElementById("xfvCss")) return;
    const s = document.createElement("style"); s.id = "xfvCss";
    s.textContent = `
.xfv-ov{position:fixed;inset:0;z-index:1180;display:none;align-items:flex-end;justify-content:center;background:rgba(20,26,60,.5);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.xfv-ov.on{display:flex}
.xfv-card{width:100%;max-width:760px;height:min(92svh,980px);display:flex;flex-direction:column;border-radius:24px 24px 0 0;overflow:hidden;
  background:radial-gradient(120% 60% at 50% 0,#3a2a70,#191433 60%,#100c22);color:#fff;box-shadow:0 -12px 40px rgba(0,0,0,.4);font-family:'M PLUS Rounded 1c','Noto Sans JP',sans-serif}
.xfv-hd{flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px 10px}
.xfv-hd b{font-size:16px;font-weight:900;letter-spacing:.04em}
.xfv-hd small{font-size:11px;font-weight:800;opacity:.75}
.xfv-hd .xfv-x{margin-left:auto;width:36px;height:36px;border-radius:12px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font-size:16px;cursor:pointer}
.xfv-ctl{flex:none;display:flex;flex-direction:column;gap:7px;padding:0 14px 10px}
.xfv-ctl input{width:100%;box-sizing:border-box;border-radius:12px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font:800 13px inherit;padding:9px 12px;outline:none}
.xfv-ctl input::placeholder{color:rgba(255,255,255,.55)}
.xfv-row{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.xfv-row::-webkit-scrollbar{display:none}
.xfv-row button,.xfv-row select{flex:none;border-radius:99px;border:1.5px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;font:900 11.5px inherit;padding:6px 11px;cursor:pointer}
.xfv-row button.on{background:linear-gradient(135deg,#ffd257,#ff8ac0);color:#2a1440;border-color:transparent}
.xfv-row button i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:-1px}
.xfv-row select option{color:#222}
.xfv-grid{flex:1;min-height:0;overflow-y:auto;padding:6px 14px calc(env(safe-area-inset-bottom,0px) + 18px);display:grid;grid-template-columns:repeat(auto-fill,minmax(min(30%,170px),1fr));gap:12px;align-content:start;
  background-image:radial-gradient(circle at 6px 50%,rgba(255,255,255,.06) 0 3px,transparent 3.5px);background-size:100% 26px}
.xfv-empty{grid-column:1/-1;text-align:center;padding:40px 14px;font-size:12.5px;font-weight:800;line-height:1.9;opacity:.8}
.xfv-empty a{color:#ffd257}
.xfv-foot{flex:none;display:flex;align-items:center;gap:8px;padding:9px 14px calc(env(safe-area-inset-bottom,0px) + 10px);font-size:11px;font-weight:800;opacity:.9;border-top:1px solid rgba(255,255,255,.12)}
.xfv-foot a{margin-left:auto;flex:none;border-radius:99px;padding:7px 12px;background:linear-gradient(135deg,#7b5cf0,#f0509a);color:#fff;text-decoration:none;font-weight:900}
/* カード */
.xfc{position:relative;display:block;width:100%;aspect-ratio:63/88;padding:0;border:0;cursor:pointer;border-radius:10px;container-type:inline-size;
  background:linear-gradient(145deg,var(--ec2),var(--ec) 45%,#1a1430 140%);box-shadow:0 6px 16px rgba(0,0,0,.4),inset 0 0 0 1.5px rgba(255,255,255,.55);transition:transform .18s}
.xfc:hover{transform:translateY(-3px) rotate(-.6deg)}
.xfc.r-ur{background:linear-gradient(135deg,#ff9ad8,#ffe08a 25%,#9cffd9 50%,#9fd0ff 75%,#d6b8ff);box-shadow:0 6px 18px rgba(255,120,200,.45),inset 0 0 0 1.5px #fff}
.xfc.r-ssr{background:linear-gradient(145deg,#fff2b0,#e0a92a 55%,#7a5200);box-shadow:0 6px 16px rgba(224,169,42,.45),inset 0 0 0 1.5px #fff6d0}
.xfc-in{position:absolute;inset:4.2cqw;display:flex;flex-direction:column;gap:2.4cqw;border-radius:6px;padding:3.2cqw;
  background:linear-gradient(180deg,color-mix(in srgb,var(--ec2) 70%,#fff),#fff 40%,color-mix(in srgb,var(--ec2) 55%,#fff));color:#1c1830;text-align:left;overflow:hidden}
.xfc-top{display:flex;align-items:center;gap:2.4cqw;min-width:0}
.xfc-rar{flex:none;font:900 6.2cqw/1 'Orbitron',sans-serif;padding:1.2cqw 2.4cqw;border-radius:99px;background:#1c1830;color:#fff}
.r-ur .xfc-rar{background:linear-gradient(90deg,#ff5fa2,#ffb020,#41d98a,#2fa8ff,#a35cff);color:#fff}
.r-ssr .xfc-rar{background:linear-gradient(90deg,#b8860b,#f0c040);color:#2a1a00}
.xfc-nm{flex:1;min-width:0;font:900 8.6cqw/1.1 'M PLUS Rounded 1c','Noto Sans JP',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xfc-no{flex:none;font:900 5.2cqw/1 'Orbitron',sans-serif;font-style:normal;opacity:.6}
.xfc-art{position:relative;display:block;flex:none;aspect-ratio:1/0.86;border-radius:4px;overflow:hidden;border:1.2cqw solid var(--ec);box-shadow:0 0 0 .6cqw #fff,0 0 3cqw var(--ec)}
.xfc-art img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 22%}
.xfc-holo{position:absolute;inset:0;pointer-events:none;opacity:0;mix-blend-mode:screen;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.45) 47%,rgba(255,170,230,.35) 50%,rgba(170,255,230,.35) 53%,transparent 60%);background-size:300% 100%;animation:xfcHolo 3.6s linear infinite}
.r-ur .xfc-holo{opacity:.7}
.r-ssr .xfc-holo{opacity:.5;background:linear-gradient(115deg,transparent 42%,rgba(255,240,180,.55) 50%,transparent 58%);background-size:300% 100%}
@keyframes xfcHolo{from{background-position:120% 0}to{background-position:-120% 0}}
.xfc-type{display:flex;align-items:center;gap:1.8cqw;font:900 5.8cqw/1.2 'M PLUS Rounded 1c','Noto Sans JP',sans-serif;white-space:nowrap;overflow:hidden}
.xfc-type small{font-size:5cqw;opacity:.75;overflow:hidden;text-overflow:ellipsis}
.xfc-el{flex:none;display:grid;place-items:center;width:8cqw;height:8cqw;border-radius:50%;background:var(--ec);color:#fff;font:900 5cqw/1 'Noto Sans JP',sans-serif;font-style:normal;box-shadow:0 0 0 .7cqw #fff}
.xfc-txt{flex:1;min-height:0;font:800 5.2cqw/1.45 'M PLUS Rounded 1c','Noto Sans JP',sans-serif;opacity:.85;border-top:.5cqw solid color-mix(in srgb,var(--ec) 50%,transparent);padding-top:1.8cqw;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical}
.xfc-ft{display:flex;align-items:center;justify-content:space-between;font:900 5cqw/1 'Orbitron',sans-serif}
.xfc-ft i{font-style:normal;color:#e0a92a;letter-spacing:.06em}
.r-ur .xfc-ft i{color:#ff5fa2}
.xfc-ft em{font-style:normal;opacity:.45;letter-spacing:.12em}
/* ★★ 2026-11-03 UR の全面イラスト（アートレア風） */
.xfc-fa{position:absolute;inset:2.6cqw;display:block;border-radius:7px;overflow:hidden;background:#1a1430;color:#fff;text-align:left;
  box-shadow:inset 0 0 0 .7cqw rgba(255,255,255,.75)}
.xfc-faimg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 16%;display:block}
.xfc-faimg.sq{object-position:50% 25%}
.xfc-foil{position:absolute;inset:0;pointer-events:none;mix-blend-mode:color-dodge;opacity:.22;
  background:linear-gradient(125deg,#ff5fa2,#ffd257 18%,#7dffb0 36%,#5fd0ff 54%,#a35cff 72%,#ff5fa2 90%);background-size:260% 260%;animation:xfcFoil 7s linear infinite}
@keyframes xfcFoil{from{background-position:0% 50%}to{background-position:260% 50%}}
.xfc-spark{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:.5;
  background-image:radial-gradient(circle,rgba(255,255,255,.95) 0 .45cqw,transparent .9cqw),radial-gradient(circle,rgba(255,236,190,.85) 0 .55cqw,transparent 1.1cqw);
  background-size:13cqw 15cqw,19cqw 13cqw;background-position:2cqw 3cqw,8cqw 9cqw;animation:xfcTw 2.6s ease-in-out infinite alternate}
@keyframes xfcTw{from{opacity:.18}to{opacity:.65}}
.xfc-fa .xfc-holo{opacity:.75}
.xfc-fatop{position:absolute;left:0;right:0;top:0;padding:3.4cqw 3.6cqw 11cqw;background:linear-gradient(180deg,rgba(14,8,34,.74),rgba(14,8,34,.38) 58%,transparent)}
.xfc-fa .xfc-nm{color:#fff;text-shadow:0 .5cqw 2cqw rgba(0,0,0,.65)}
.xfc-fa .xfc-no{color:#fff;opacity:.85}
.xfc-fa .xfc-rar{box-shadow:0 0 0 .5cqw rgba(255,255,255,.9)}
.xfc-fabot{position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;gap:1.8cqw;padding:14cqw 3.6cqw 3.4cqw;
  background:linear-gradient(0deg,rgba(14,8,34,.9),rgba(14,8,34,.62) 55%,transparent)}
.xfc-fa .xfc-type{color:#fff;text-shadow:0 .4cqw 1.6cqw rgba(0,0,0,.6)}
.xfc-fa .xfc-txt{flex:none;color:#fff;opacity:.95;border-top-color:rgba(255,255,255,.4);-webkit-line-clamp:2}
.xfc-fa .xfc-ft i{color:#ffd257;text-shadow:0 0 2cqw rgba(255,200,80,.8)}
.xfc-fa .xfc-ft em{color:#fff;opacity:.7}
/* 拡大：3D のカード（表＝キャラ／裏＝XEVARION）。ドラッグで回る・タップで裏返る */
.xfz-ov{position:fixed;inset:0;z-index:1190;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;background:rgba(8,6,20,.84);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);perspective:1100px;font-family:'M PLUS Rounded 1c','Noto Sans JP',sans-serif}
.xfz-ov.on{display:flex}
.xfz-ov .xfz-wrap{position:relative;width:min(78vw,52svh,380px);aspect-ratio:63/88;touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none;animation:xfzIn .5s cubic-bezier(.2,1.25,.4,1)}
.xfz-ov .xfz-wrap.drag{cursor:grabbing}
@keyframes xfzIn{from{transform:scale(.5);opacity:0}}
.xfz-3d{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
.xfz-face{position:absolute;inset:0;border-radius:10px;backface-visibility:hidden;-webkit-backface-visibility:hidden;container-type:inline-size}
.xfz-back{transform:rotateY(180deg)}
.xfz-ov .xfc{height:100%;cursor:inherit}
.xfz-ov .xfc:hover{transform:none}
.xfz-glare{position:absolute;inset:0;border-radius:10px;pointer-events:none;mix-blend-mode:overlay;background:radial-gradient(circle at var(--gx,50%) var(--gy,30%),rgba(255,255,255,.8),transparent 55%)}
.xfz-hint{margin:0;font-size:11px;font-weight:800;color:rgba(255,255,255,.62);letter-spacing:.04em;transition:opacity .6s}
.xfz-hint.off{opacity:0}
.xfz-ov .xfz-btns{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;padding:0 12px}
.xfz-ov .xfz-btns button{border-radius:99px;border:1.5px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;font:900 12.5px 'M PLUS Rounded 1c','Noto Sans JP',sans-serif;padding:9px 16px;cursor:pointer}
.xfz-ov .xfz-btns button.pri{background:linear-gradient(135deg,#7b5cf0,#f0509a);border-color:transparent}
/* ★★ 2026-11-03 カードの裏（XEVARION） */
.xfb{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4cqw;border-radius:10px;overflow:hidden;
  background:radial-gradient(75% 55% at 50% 44%,#5a3fd6 0%,#2a1c78 42%,#120c34 78%,#0a0720 100%);
  box-shadow:0 8px 22px rgba(0,0,0,.5),inset 0 0 0 1.4cqw #d8b25a,inset 0 0 0 2.2cqw #1a1246,inset 0 0 0 2.7cqw rgba(255,226,150,.55)}
.xfb-pat{position:absolute;inset:0;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(45deg,rgba(255,255,255,.06) 0 .35cqw,transparent .35cqw 6cqw),repeating-linear-gradient(-45deg,rgba(255,255,255,.06) 0 .35cqw,transparent .35cqw 6cqw)}
.xfb-rays{position:absolute;left:50%;top:44%;width:150cqw;aspect-ratio:1;margin:-75cqw 0 0 -75cqw;pointer-events:none;opacity:.5;
  background:repeating-conic-gradient(from 0deg,rgba(150,190,255,.35) 0 4deg,transparent 4deg 15deg);
  -webkit-mask:radial-gradient(circle,#000 8%,transparent 58%);mask:radial-gradient(circle,#000 8%,transparent 58%);animation:xfbSpin 26s linear infinite}
@keyframes xfbSpin{to{transform:rotate(360deg)}}
.xfb-ring{position:absolute;left:50%;top:40%;width:74cqw;aspect-ratio:1;margin:-37cqw 0 0 -37cqw;border-radius:50%;pointer-events:none;
  border:.5cqw solid rgba(255,226,150,.55);box-shadow:0 0 6cqw rgba(140,120,255,.6),inset 0 0 6cqw rgba(140,120,255,.45)}
.xfb-orb{position:relative;width:52cqw;margin-top:-6cqw;filter:drop-shadow(0 0 4cqw rgba(120,160,255,.85))}
.xfb-word{position:relative;width:70cqw;filter:brightness(0) invert(1) drop-shadow(0 0 2.4cqw rgba(170,150,255,.95))}
.xfb-sub{position:relative;font:900 3.6cqw/1 'Orbitron',sans-serif;letter-spacing:.42em;color:#ffe29a;opacity:.9;padding-left:.42em}
.xfb-c{position:absolute;width:6cqw;height:6cqw;transform:rotate(45deg);border:.6cqw solid #d8b25a;background:#1a1246;pointer-events:none}
.xfb-c.c1{left:5cqw;top:5cqw}.xfb-c.c2{right:5cqw;top:5cqw}.xfb-c.c3{left:5cqw;bottom:5cqw}.xfb-c.c4{right:5cqw;bottom:5cqw}
#xfvToast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);z-index:1400;transform:translate(-50%,12px);opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;
  max-width:88vw;padding:11px 18px;border-radius:99px;background:rgba(24,18,52,.94);color:#fff;font:900 12.5px/1.4 'M PLUS Rounded 1c','Noto Sans JP',sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);border:1.5px solid rgba(255,255,255,.22)}
#xfvToast.on{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion:reduce){.xfc-holo,.xfc-foil,.xfc-spark,.xfb-rays{animation:none}.xfz-ov .xfz-wrap{animation:none}}
body.xos-nomotion .xfc-holo,body.xos-nomotion .xfc-foil,body.xos-nomotion .xfc-spark,body.xos-nomotion .xfb-rays{animation:none}
`;
    document.head.appendChild(s);
  }
  function toast(msg) {
    css();
    let t = document.getElementById("xfvToast");
    if (!t) { t = document.createElement("div"); t.id = "xfvToast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.remove("on"); void t.offsetWidth; t.classList.add("on");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 1900);
  }
  function rank(r) { return r === "UR" ? 3 : r === "SSR" ? 2 : 1; }
  function filtered() {
    const kf = (s) => String(s || "").toLowerCase().replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    const q = kf(S.q);
    const order = S.list.slice();
    let L = order.map((id, i) => { const f = info(id); if (f) f.at = i; return f; }).filter(Boolean)
      .filter((f) => (S.rar === "all" || f.rar === S.rar) && (S.el === "all" || f.el === S.el) && (!q || kf(f.name).indexOf(q) >= 0));
    const by = { add: (a, b) => a.at - b.at, recent: (a, b) => b.at - a.at, no: (a, b) => a.no - b.no, name: (a, b) => kf(a.name).localeCompare(kf(b.name), "ja"),
      rar: (a, b) => rank(b.rar) - rank(a.rar) || a.no - b.no, el: (a, b) => EL_ORDER.indexOf(a.el) - EL_ORDER.indexOf(b.el) || rank(b.rar) - rank(a.rar) || a.no - b.no };
    return L.sort(by[S.sort] || by.add);
  }
  function paint() {
    const ov = document.getElementById("xfvOv"); if (!ov) return;
    const L = filtered(), all = S.list.filter((id) => info(id)).length;
    ov.querySelector(".xfv-hd small").textContent = (S.own ? "" : S.name + " さん・") + all + "枚" + (L.length !== all ? "（表示 " + L.length + "）" : "");
    ov.querySelectorAll("[data-rar]").forEach((b) => b.classList.toggle("on", b.dataset.rar === S.rar));
    ov.querySelectorAll("[data-el]").forEach((b) => b.classList.toggle("on", b.dataset.el === S.el));
    const sel = ov.querySelector("select"); if (sel) sel.value = S.sort;
    const g = ov.querySelector(".xfv-grid");
    if (!all) {
      g.innerHTML = '<div class="xfv-empty">' + (S.own ? "⭐ まだお気に入りがありません。<br>キャラの図鑑で、持っているキャラの <b>☆</b>（キャラ詳細の絵の右下にもあります）を押すとカードになってここに入ります。<br><a href=\"characters.html?fav=1\">図鑑をひらく</a>"
        : esc(S.name) + " さんはまだお気に入りを公開していません。") + "</div>";
      return;
    }
    g.innerHTML = L.length ? L.map((f) => cardHTML(f)).join("") : '<div class="xfv-empty">条件に合うカードがありません</div>';
  }
  function build() {
    css();
    let ov = document.getElementById("xfvOv"); if (ov) return ov;
    ov = document.createElement("div"); ov.id = "xfvOv"; ov.className = "xfv-ov";
    ov.innerHTML = '<div class="xfv-card" role="dialog" aria-label="お気に入りカード">' +
      '<div class="xfv-hd"><b>⭐ お気に入りカード</b><small></small><button type="button" class="xfv-x" aria-label="とじる">✕</button></div>' +
      '<div class="xfv-ctl"><input type="search" placeholder="名前で検索（例：チフル）" autocomplete="off">' +
        '<div class="xfv-row">' + [["all", "すべて"], ["UR", "UR"], ["SSR", "SSR"], ["SR", "SR"]].map(([k, t]) => '<button type="button" data-rar="' + k + '">' + t + "</button>").join("") +
          '<select aria-label="並び替え"><option value="add">登録順</option><option value="recent">新しく登録した順</option><option value="no">番号</option><option value="name">名前</option><option value="rar">レア度</option><option value="el">属性</option></select></div>' +
        '<div class="xfv-row"><button type="button" data-el="all">全属性</button>' + EL_ORDER.map((k) => '<button type="button" data-el="' + k + '"><i style="background:' + EL[k][1] + '"></i>' + EL[k][0] + "</button>").join("") + "</div></div>" +
      '<div class="xfv-grid"></div>' +
      '<div class="xfv-foot"><span class="xfv-ftx"></span><a href="characters.html?fav=1">図鑑で ☆ をつける</a></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => {
      if (e.target === ov || e.target.closest(".xfv-x")) { close(); return; }
      const r = e.target.closest("[data-rar]"); if (r) { S.rar = r.dataset.rar; paint(); return; }
      const el = e.target.closest("[data-el]"); if (el) { S.el = el.dataset.el; paint(); return; }
      const c = e.target.closest(".xfc"); if (c && c.dataset.id) zoom(c.dataset.id);
    });
    ov.querySelector("input").addEventListener("input", (e) => { S.q = e.target.value.trim(); paint(); });
    ov.querySelector("select").addEventListener("change", (e) => { S.sort = e.target.value; try { localStorage.setItem("xev_fav_view", JSON.stringify({ sort: S.sort })); } catch (er) {} paint(); });
    /* ★★ 2026-11-03 上に開いた詳細の ☆ で足し外ししたら、下の一覧も描き直す */
    window.addEventListener("xeva:fav", () => { if (S.own && ov.classList.contains("on")) { S.list = ids(); paint(); } });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const d = document.getElementById("detOv"); if (d && d.classList.contains("on")) return;   /* 詳細はそちらで閉じる */
      const z = zEl(); if (z && z.classList.contains("on")) { z.classList.remove("on"); return; }
      if (ov.classList.contains("on")) close();
    });
    return ov;
  }
  function open(opt) {
    opt = opt || {};
    const ov = build();
    S.own = !opt.ids; S.name = opt.name || ""; S.list = (opt.ids || ids()).slice(); S.q = ""; S.rar = "all"; S.el = "all";
    ov.querySelector("input").value = "";
    ov.querySelector(".xfv-hd b").textContent = S.own ? "⭐ お気に入りカード" : "⭐ " + S.name + " さんのお気に入り";
    ov.querySelector(".xfv-foot").style.display = S.own ? "" : "none";
    ov.querySelector(".xfv-ftx").textContent = "図鑑・キャラ詳細の ☆ でカードを足したり外したりできます";
    paint();
    ov.classList.add("on");
    try { document.body.style.overflow = "hidden"; } catch (e) {}
  }
  function close() {
    const ov = document.getElementById("xfvOv"); if (ov) ov.classList.remove("on");
    try { document.body.style.overflow = ""; } catch (e) {}
  }

  /* ══ ★★ 2026-11-03 「性能を見る」は一覧・拡大を閉じずに<b>その上に</b>詳細を開く（閉じれば元の一覧に戻る）══
     詳細（openDetX）の無い画面は、押したときだけ読む：mb-boot → mb-core（ホームは xhMbReady）→ mb-char-detail（＋ CSS）。 */
  let detP = null;
  function hasChars() { try { return typeof CHARS !== "undefined"; } catch (e) { return false; } }
  function loadJs(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error(src)); document.head.appendChild(s); });
  }
  function ensureDet() {
    if (typeof window.openDetX === "function" && document.getElementById("detOv")) return Promise.resolve(true);
    if (detP) return detP;
    if (!document.querySelector('link[href*="mb-char-detail.css"]')) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = BASE + "mb-char-detail.css?v=32"; document.head.appendChild(l);
    }
    window.MB_ELEM_JA_NOWATCH = true;   /* 属性名を漢字にする見張り（mb-core の elJaWatch）はこの画面ではしない */
    const core = () => {
      if (hasChars() && typeof window.openDetX === "function") return Promise.resolve();
      if (hasChars()) return Promise.resolve();
      if (typeof window.xhMbReady === "function") return window.xhMbReady();
      return loadJs(BASE + "mb-boot.js?v=18").then(() => loadJs(BASE + "MagiBurst/js/mb-core.js?v=146"));
    };
    detP = core()
      .then(() => (typeof window.openDetX === "function" ? null : loadJs(BASE + "mb-char-detail.js?v=54")))
      .then(() => {
        if (!document.getElementById("detOv")) {
          const ov = document.createElement("div"); ov.id = "detOv";
          ov.addEventListener("click", (e) => { if (e.target === ov && typeof window.closeDetX === "function") window.closeDetX(); });
          const card = document.createElement("div"); card.id = "detCard";
          ov.appendChild(card); document.body.appendChild(ov);
        }
        return typeof window.openDetX === "function";
      })
      .catch(() => { detP = null; return false; });
    return detP;
  }
  function openDet(id) {
    const slow = !(typeof window.openDetX === "function");
    if (slow) toast("性能を読みこんでいます…");
    ensureDet().then((ok) => {
      if (!ok) { toast("性能を読みこめませんでした（通信を確かめてください）"); return; }
      const d = document.getElementById("detOv");
      try { window.openDetX(id); } catch (e) { toast("性能を開けませんでした"); return; }
      if (!d || !d.classList.contains("on")) return;
      const prev = d.style.zIndex;
      d.style.zIndex = "1210";
      const mo = new MutationObserver(() => { if (!d.classList.contains("on")) { d.style.zIndex = prev; mo.disconnect(); } });
      mo.observe(d, { attributes: true, attributeFilter: ["class"] });
    });
  }

  /* ══ 拡大：3D で回せるカード ══
     ・ドラッグ（指・マウス）で左右に回す（はなすと勢いで回って、表か裏でぴたりと止まる）・上下は少しだけ傾く
     ・タップ／「↻ うらを見る」で裏返す・マウスはカードの上で動かすと少し傾く（光が動く）
     ・開いたときはくるっと回りながら出てくる（動きを減らす設定のときは回らない） */
  const Z = { ry: 0, rx: 0, tx: 0, ty: 0, ttx: 0, tty: 0, vy: 0, drag: false, moved: false, sx: 0, sy: 0, sry: 0, srx: 0, lx: 0, lt: 0, tw: null, raf: 0, back: null, last: 0, just: 0 };
  const RM = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("xos-nomotion"); } catch (e) { return false; } };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function zEl() { return document.getElementById("xfzOv"); }
  function zApply() {
    const z = zEl(); if (!z) return;
    const d = z.querySelector(".xfz-3d"); if (!d) return;
    const ry = Z.ry + Z.ty, rx = Z.rx + Z.tx;
    d.style.transform = "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg)";
    const a = ((ry % 360) + 360) % 360;
    d.style.setProperty("--gx", (50 + Math.sin(a * Math.PI / 180) * 60).toFixed(0) + "%");
    d.style.setProperty("--gy", (30 - rx * 1.4).toFixed(0) + "%");
    const back = a > 90 && a < 270;
    if (back !== Z.back) { Z.back = back; const b = z.querySelector("[data-flip]"); if (b) b.textContent = back ? "↻ おもてを見る" : "↻ うらを見る"; }
  }
  function zKick() { if (!Z.raf) Z.raf = requestAnimationFrame(zFrame); }
  function zTween(to, dur, ease, rxTo) {
    Z.tw = { f: Z.ry, t: to, fx: Z.rx, tx: rxTo == null ? 0 : rxTo, t0: performance.now(), d: Math.max(1, dur), e: ease || easeOut };
    Z.vy = 0; zKick();
  }
  function zFrame(now) {
    Z.raf = 0;
    const z = zEl(); if (!z || !z.classList.contains("on")) { Z.last = 0; return; }
    const dt = Math.min(48, now - (Z.last || now)); Z.last = now;
    let busy = false;
    if (Z.tw) {
      const p = Math.min(1, (now - Z.tw.t0) / Z.tw.d), k = Z.tw.e(p);
      Z.ry = Z.tw.f + (Z.tw.t - Z.tw.f) * k; Z.rx = Z.tw.fx + (Z.tw.tx - Z.tw.fx) * k;
      if (p >= 1) { Z.tw = null; Z.ry = ((Z.ry % 360) + 360) % 360; } else busy = true;
    } else if (!Z.drag && Math.abs(Z.vy) > 0) {
      Z.ry += Z.vy * dt; Z.vy *= Math.pow(0.93, dt / 16); Z.rx *= Math.pow(0.86, dt / 16);
      if (Math.abs(Z.vy) <= 0.06) { Z.vy = 0; zTween(Math.round(Z.ry / 180) * 180, 520, easeOut); }
      busy = true;
    }
    const k2 = 1 - Math.pow(0.8, dt / 16);
    Z.tx += (Z.ttx - Z.tx) * k2; Z.ty += (Z.tty - Z.ty) * k2;
    if (Math.abs(Z.ttx - Z.tx) > 0.05 || Math.abs(Z.tty - Z.ty) > 0.05) busy = true;
    zApply();
    if (busy || Z.drag) zKick(); else Z.last = 0;
  }
  function zFlip() { zTween(Math.round(Z.ry / 180) * 180 + 180, RM() ? 1 : 680, easeInOut); }
  function zBind(w) {
    w.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0) return;
      Z.drag = true; Z.moved = false; Z.sx = e.clientX; Z.sy = e.clientY; Z.sry = Z.ry; Z.srx = Z.rx; Z.lx = e.clientX; Z.lt = performance.now();
      Z.vy = 0; Z.tw = null; Z.ttx = 0; Z.tty = 0;
      try { w.setPointerCapture(e.pointerId); } catch (er) {}
      w.classList.add("drag"); zKick();
    });
    w.addEventListener("pointermove", (e) => {
      if (Z.drag) {
        const dx = e.clientX - Z.sx, dy = e.clientY - Z.sy;
        if (!Z.moved && Math.hypot(dx, dy) > 6) Z.moved = true;
        const k = 180 / Math.max(160, w.offsetWidth);      /* カードの幅ぶん動かすと半回転 */
        Z.ry = Z.sry + dx * k;
        Z.rx = Math.max(-28, Math.min(28, Z.srx - dy * 0.25));
        const now = performance.now(), d = Math.max(1, now - Z.lt);
        Z.vy = Z.vy * 0.5 + ((e.clientX - Z.lx) * k / d) * 0.5;   /* 度／ミリ秒 */
        Z.lx = e.clientX; Z.lt = now;
        zKick(); return;
      }
      if (e.pointerType === "mouse" && !RM()) {
        const r = w.getBoundingClientRect();
        const px = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5)), py = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
        Z.tty = px * 20; Z.ttx = -py * 20; zKick();
      }
    });
    const up = (e) => {
      if (!Z.drag) return;
      Z.drag = false; w.classList.remove("drag");
      if (!Z.moved) { if (e.type === "pointerup") zFlip(); else zTween(Math.round(Z.ry / 180) * 180, 300, easeOut); return; }
      Z.just = performance.now();
      if (performance.now() - Z.lt > 90) Z.vy = 0;        /* 止めてからはなした */
      if (Math.abs(Z.vy) < 0.06 || RM()) zTween(Math.round(Z.ry / 180) * 180, 480, easeOut);
      zKick();
    };
    w.addEventListener("pointerup", up);
    w.addEventListener("pointercancel", up);
    w.addEventListener("pointerleave", () => { if (!Z.drag) { Z.ttx = 0; Z.tty = 0; zKick(); } });
  }
  function zoom(id) {
    const f = info(id); if (!f) return;
    css();
    let z = zEl();
    if (!z) {
      z = document.createElement("div"); z.id = "xfzOv"; z.className = "xfz-ov";
      document.body.appendChild(z);
      z.addEventListener("click", (e) => {
        if (e.target.closest("[data-flip]")) { zFlip(); return; }
        if (e.target.closest("[data-unfav]")) { const k = e.target.closest("[data-unfav]").dataset.unfav; toggle(k); S.list = ids(); z.classList.remove("on"); paint(); return; }
        if (e.target.closest("[data-detail]")) { openDet(e.target.closest("[data-detail]").dataset.detail); return; }
        if (performance.now() - Z.just < 350) return;      /* 回したあとの指はなし */
        if (!e.target.closest(".xfz-wrap")) z.classList.remove("on");
      });
    }
    z.innerHTML = '<div class="xfz-wrap" aria-label="' + esc(f.name) + ' のカード（ドラッグで回転）">' +
        '<div class="xfz-3d"><div class="xfz-face xfz-front">' + cardHTML(f) + '<i class="xfz-glare"></i></div>' +
        '<div class="xfz-face xfz-back">' + backHTML() + '<i class="xfz-glare"></i></div></div></div>' +
      '<p class="xfz-hint">ドラッグで回転・タップで裏返す</p>' +
      '<div class="xfz-btns"><button type="button" data-flip>↻ うらを見る</button><button type="button" class="pri" data-detail="' + esc(id) + '">性能を見る</button>' +
      (S.own ? '<button type="button" data-unfav="' + esc(id) + '">☆ お気に入りから外す</button>' : "") + "</div>";
    zBind(z.querySelector(".xfz-wrap"));
    Z.back = null; Z.tx = Z.ty = Z.ttx = Z.tty = 0; Z.vy = 0; Z.drag = false; Z.tw = null; Z.last = 0;
    z.classList.add("on");
    if (RM()) { Z.ry = 0; Z.rx = 0; zApply(); }
    else { Z.ry = -540; Z.rx = -14; zApply(); zTween(0, 1150, easeOut, 0); }
    const h = z.querySelector(".xfz-hint"); setTimeout(() => { if (h) h.classList.add("off"); }, 3600);
  }

  window.XevaFav = { ids, has, toggle, canFav, info, cardHTML, backHTML, open, close, zoom, toast, openDet, EL };
})();

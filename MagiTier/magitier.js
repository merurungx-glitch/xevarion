/* ============================================================
   MagiTier — Tier表 作成・管理アプリ（★ 2026-08-16 全面刷新）
   ------------------------------------------------------------
   ★ データは<b>これまでと同じ IndexedDB（magitier_db / tables）</b>に置く。
     旧バージョンで作った Tier表もそのまま開けるよう、読み込み時に
     normalize() で足りない項目だけ埋める（作り直さない）。
   ★ 画面は「ホーム／マイTier／テンプレート／マイページ／エディタ」の5枚。
     PC は3カラム、スマホ（900px未満）は縦型UI＋下部ナビに切り替える。
   ============================================================ */
(function () {
"use strict";

/* ══════════════════════════════════════════════
   0. 小さな道具
   ══════════════════════════════════════════════ */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const uid = (p) => (p || "x") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isPhone = () => window.matchMedia("(max-width:900px)").matches;
function toast(msg) {
  const t = $("#toast"); if (!t) return;
  t.textContent = msg; t.classList.add("on");
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2300);
}
function fmtDate(ms) {
  if (!ms) return "";
  const d = new Date(ms), n = new Date();
  const p = (x) => String(x).padStart(2, "0");
  const hm = p(d.getHours()) + ":" + p(d.getMinutes());
  if (d.toDateString() === n.toDateString()) return "今日 " + hm;
  const y = new Date(n - 86400000);
  if (d.toDateString() === y.toDateString()) return "昨日 " + hm;
  return (d.getMonth() + 1) + "/" + d.getDate() + " " + hm;
}

/* ══════════════════════════════════════════════
   1. テンプレート（Tier構成のひな形）
   ══════════════════════════════════════════════ */
const C = { s:"#ef4444", a:"#f97316", b:"#eab308", c:"#22c55e", d:"#3b82f6", e:"#8b5cf6", f:"#6b7280",
            gold:"#d4a017", pink:"#ec4899", teal:"#14b8a6", gray:"#94a3b8" };
/* 文字色は背景の明るさから自動で決める（黄色に白文字だと読めない） */
function inkFor(bg) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(bg).trim()); if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#111827" : "#ffffff";
}
function mkTiers(list) {
  return list.map((x) => ({ id: uid("tr"), label: x[0], name: x[1] || (x[0] + " Tier"),
    bg: x[2], tc: inkFor(x[2]), h: 80, w: 78, fs: 22, bold: true, align: "center", images: [], criteria: "" }));
}
const TEMPLATES = [
  { key:"sd",   cat:"標準", nm:"S 〜 D（5段階）", sub:"S / A / B / C / D",
    tiers:[["S","S Tier",C.s],["A","A Tier",C.a],["B","B Tier",C.b],["C","C Tier",C.c],["D","D Tier",C.d]] },
  { key:"ssd",  cat:"標準", nm:"SS 〜 D（6段階）", sub:"SS / S / A / B / C / D",
    tiers:[["SS","SS Tier","#be123c"],["S","S Tier",C.s],["A","A Tier",C.a],["B","B Tier",C.b],["C","C Tier",C.c],["D","D Tier",C.d]] },
  { key:"sf",   cat:"標準", nm:"S 〜 F（6段階）", sub:"S / A / B / C / D / F",
    tiers:[["S","S Tier",C.s],["A","A Tier",C.a],["B","B Tier",C.b],["C","C Tier",C.c],["D","D Tier",C.d],["F","F Tier",C.f]] },
  { key:"kami", cat:"標準", nm:"神 〜 E（6段階）", sub:"神 / 最強 / 強い / 普通 / 微妙 / 産廃",
    tiers:[["神","神",C.gold],["S","最強",C.s],["A","強い",C.a],["B","普通",C.b],["C","微妙",C.c],["E","産廃",C.gray]] },
  { key:"yn",   cat:"標準", nm:"Yes / No（2段階）", sub:"Yes / No",
    tiers:[["Yes","Yes",C.c],["No","No",C.s]] },
  { key:"game", cat:"ゲーム", nm:"ゲームキャラ Tier", sub:"環境トップ 〜 使用非推奨",
    tiers:[["S","環境トップ",C.s],["A","強キャラ",C.a],["B","一般的",C.b],["C","趣味枠",C.c],["D","使用非推奨",C.d]] },
  { key:"gacha",cat:"ゲーム", nm:"ガチャ 引くべき度", sub:"確保必須 〜 見送り",
    tiers:[["確保必須","確保必須",C.s],["おすすめ","おすすめ",C.a],["余裕があれば","余裕があれば",C.b],["見送り","見送り",C.d]] },
  { key:"anime",cat:"アニメ", nm:"アニメ 名作度", sub:"神作 〜 未視聴でOK",
    tiers:[["神作","神作",C.gold],["名作","名作",C.s],["良作","良作",C.a],["普通","普通",C.b],["合わず","合わず",C.gray]] },
  { key:"chara",cat:"キャラクター", nm:"推しキャラ Tier", sub:"最推し 〜 これから",
    tiers:[["最推し","最推し",C.pink],["推し","推し",C.a],["好き","好き",C.b],["気になる","気になる",C.c],["これから","これから",C.gray]] },
  { key:"pc",   cat:"PC", nm:"PCパーツ 性能 Tier", sub:"ハイエンド 〜 エントリー",
    tiers:[["S","ハイエンド",C.s],["A","ハイミドル",C.a],["B","ミドル",C.b],["C","エントリー",C.c],["D","非推奨",C.gray]] },
  { key:"food", cat:"食品", nm:"食べもの おいしさ Tier", sub:"また食べたい 〜 うーん",
    tiers:[["絶品","絶品",C.s],["おいしい","おいしい",C.a],["ふつう","ふつう",C.b],["いまいち","いまいち",C.c],["うーん","うーん",C.gray]] },
  { key:"free", cat:"標準", nm:"自由（1段だけ）", sub:"あとから足していく",
    tiers:[["S","S Tier",C.s]] },
];
const TPL_CATS = ["すべて", "標準", "ゲーム", "アニメ", "キャラクター", "PC", "食品"];

/* 評価項目（複数項目の評価）。既定は汎用の5項目 */
const DEF_AXES = [
  { key:"power", label:"火力" }, { key:"tough", label:"耐久" },
  { key:"speed", label:"速度" }, { key:"util",  label:"汎用性" },
];

/* ══════════════════════════════════════════════
   2. IndexedDB（旧バージョンと同じ入れもの）
   ══════════════════════════════════════════════ */
const DB_NAME = "magitier_db", DB_VER = 2, STORE = "tables";
let idb = null;
function openIDB() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, DB_VER);
    rq.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }); };
    rq.onsuccess = (e) => { idb = e.target.result; res(idb); };
    rq.onerror = rej;
  });
}
const idbAll = () => new Promise((res, rej) => { const r = idb.transaction(STORE, "readonly").objectStore(STORE).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = rej; });
const idbPut = (t) => new Promise((res, rej) => { const r = idb.transaction(STORE, "readwrite").objectStore(STORE).put(t); r.onsuccess = res; r.onerror = rej; });
const idbDel = (id) => new Promise((res, rej) => { const r = idb.transaction(STORE, "readwrite").objectStore(STORE).delete(id); r.onsuccess = res; r.onerror = rej; });

/* 旧データ → いまの形。足りない項目だけ足す（既存の値は絶対に触らない） */
function normalize(t) {
  t.id = t.id || uid("t");
  t.name = t.name || "New Tier Table";
  t.tiers = Array.isArray(t.tiers) ? t.tiers : [];
  t.images = Array.isArray(t.images) ? t.images : [];
  t.tiers.forEach((tr) => {
    tr.id = tr.id || uid("tr");
    tr.label = tr.label != null ? tr.label : "S";
    tr.name = tr.name || (tr.label + " Tier");
    tr.bg = tr.bg || C.s;
    tr.tc = tr.tc || inkFor(tr.bg);
    tr.h = tr.h || 80; tr.w = tr.w || 78; tr.fs = tr.fs || 22;
    tr.bold = tr.bold !== false;
    tr.align = tr.align || "center";
    tr.images = Array.isArray(tr.images) ? tr.images : [];
    tr.criteria = tr.criteria || "";
    tr.images.forEach(normImg);
  });
  t.images.forEach(normImg);
  t.cardName = t.cardName !== false;          // 名前を出すか
  t.cardMemo = !!t.cardMemo;                  // メモを出すか
  t.cardScore = !!t.cardScore;                // 評価を出すか
  t.sortMode = t.sortMode || "manual";
  t.cardSize = t.cardSize || 84;    /* ★ 2026-08-17d 未配置プールのカードの大きさ（px） */
  t.tableSize = t.tableSize || 84;  /* ★ 2026-08-17e Tier表の中のカードの大きさ（px） */
  t.axes = Array.isArray(t.axes) && t.axes.length ? t.axes : DEF_AXES.slice();
  t.rateMax = t.rateMax === 10 ? 10 : 5;      // 5段階 or 10点
  t.autoRule = t.autoRule || { on: false, cuts: [] };
  t.publicOn = !!t.publicOn;
  t.password = t.password || "";
  t.eval = t.eval || "";
  t.author = t.author || "";
  t.createdAt = t.createdAt || Date.now();
  t.updatedAt = t.updatedAt || t.createdAt;
  t.slides = Array.isArray(t.slides) ? t.slides : [];   // 旧プレゼン用データは消さずに持っておく
  return t;
}
function normImg(im) {
  im.id = im.id || uid("i");
  im.name = im.name || "";
  im.memo = im.memo || im.criteria || "";
  im.rating = typeof im.rating === "number" ? im.rating : 0;
  im.scores = im.scores && typeof im.scores === "object" ? im.scores : {};
  im.addedAt = im.addedAt || Date.now();
  return im;
}

/* ══════════════════════════════════════════════
   3. 状態
   ══════════════════════════════════════════════ */
let tables = [];
let cur = null;          // 開いている Tier表
let selImg = null;       // 選択中の画像id
let screen = "home";
let query = "";
let tplCat = "すべて";
let mbUnlocked = false;  // MagiBurst キャラTier表の編集ロック
let presentZoom = 1;

const RECENT_KEY = "magitier_recent_v1";
const THEME_KEY = "magitier_theme_v1";
const MYTPL_KEY = "magitier_mytpl_v1";
const MB_CODE_KEY = "magitier_mbcode_v1";

/* ── MagiBurst キャラTier表 ── */
const MB_TABLE_ID = "t_mb_chars";
const MB_ACCESS_CODE = "MB613Tier26";
const MB_FB_PATH = "magitier/mbtier";
function fbUrl() {
  const u = (window.XEVARIONFB && window.XEVARIONFB.DB_URL)
    || "https://xevarion-account-default-rtdb.asia-southeast1.firebasedatabase.app";
  return u.replace(/\/$/, "");
}

function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

/* ══════════════════════════════════════════════
   4. 保存
   ══════════════════════════════════════════════ */
let saveTimer = null;
async function save(t, quiet) {
  t = t || cur; if (!t) return;
  t.updatedAt = Date.now();
  await idbPut(JSON.parse(JSON.stringify(t)));
  if (!quiet) renderHomeSoft();
}
function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(() => save(cur, true), 400); }

function pushRecent(id) {
  let r = lsGet(RECENT_KEY, []);
  r = [id].concat(r.filter((x) => x !== id)).slice(0, 6);
  lsSet(RECENT_KEY, r);
}

/* ══════════════════════════════════════════════
   5. 画面のきりかえ
   ══════════════════════════════════════════════ */
function go(name) {
  /* エディタから出るときは必ず保存する（未保存でホームに戻ると消えたように見える） */
  if (screen === "edit" && name !== "edit") save(cur, true);
  screen = name;
  const map = { home:"scr-home", mine:"scr-home", tpl:"scr-tpl", me:"scr-me", edit:"scr-edit", mbview:"scr-mbview" };
  $$(".screen").forEach((s) => s.classList.toggle("on", s.id === map[name]));
  $$("[data-nav]").forEach((b) => b.classList.toggle("on", b.dataset.nav === name));
  window.scrollTo(0, 0);
  if (name === "home" || name === "mine") renderHome(name === "mine");
  if (name === "tpl") renderTpl();
  if (name === "me") renderMe();
  if (name === "edit") renderEditor();
}

/* ══════════════════════════════════════════════
   6. ホーム
   ══════════════════════════════════════════════ */
function tierThumbHTML(t) {
  const rows = t.tiers.slice(0, 4).map((tr) => {
    const imgs = tr.images.slice(0, 6).map((im) => `<img src="${esc(im.src)}" alt="" loading="lazy">`).join("");
    return `<div class="tr"><span style="background:${esc(tr.bg)};color:${esc(tr.tc)}">${esc(String(tr.label).slice(0, 2))}</span>${imgs}</div>`;
  }).join("");
  return `<div class="thumb">${rows || '<div class="muted" style="padding:8px">まだ空です</div>'}</div>`;
}
function cardHTML(t) {
  const n = t.tiers.reduce((s, x) => s + x.images.length, 0) + t.images.length;
  const comp = t.tiers.map((x) => x.label).join(" / ");
  /* ★ 2026-08-17b MagiBurst のキャラTier表は<b>いちばん上に固定</b>して、
     ひと目でそれと分かるようにする。消せない表なので削除ボタンも出さない
     （押せるのに断られる、という見た目にしない）。編集にはアクセスコードが要る。 */
  const isMb = t.id === MB_TABLE_ID;
  return `<div class="tcard${isMb ? " mbfix" : ""}" data-id="${t.id}" onclick="MT.open('${t.id}')">
    ${isMb ? '<div class="mbtag">⚔ MagiBurst 公式・固定<span>編集にはアクセスコード</span></div>' : ""}
    ${t.password ? '<div class="lock">🔒</div>' : ""}
    <div class="acts">
      <button title="名前を変える" onclick="event.stopPropagation();MT.renameDlg('${t.id}')">✎</button>
      <button title="複製" onclick="event.stopPropagation();MT.dup('${t.id}')">⧉</button>
      ${isMb ? "" : `<button title="削除" onclick="event.stopPropagation();MT.del('${t.id}')">🗑</button>`}
    </div>
    ${tierThumbHTML(t)}
    <div class="bd">
      <div class="nm">${esc(t.name)}</div>
      <div class="mt">${esc(comp) || "—"}</div>
      <div class="mt">${n} 枚 ・ 更新 ${fmtDate(t.updatedAt)}</div>
    </div>
  </div>`;
}
function renderHome(mineOnly) {
  const q = query.trim().toLowerCase();
  /* ★ 2026-08-16 MagiBurst のキャラTier表は必ず先頭に固定する。
     更新日順にまかせると、しばらく触らないうちに下へ流れて見失う。
     この1枚は MagiBurst から常に参照されているので、いつでも入口が見えている必要がある。 */
  let list = tables.slice().sort((a, b) =>
    (a.id === MB_TABLE_ID ? -1 : b.id === MB_TABLE_ID ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0));
  if (q) list = list.filter((t) => t.name.toLowerCase().includes(q));
  $("#tcnt").textContent = "（" + list.length + " 件）";
  const g = $("#tgrid");
  g.innerHTML = (mineOnly ? "" : `<button class="newcard" onclick="MT.newDlg()"><span class="plus">＋</span>新しい Tier表をつくる</button>`)
    + (list.length ? list.map(cardHTML).join("") : (q ? '<div class="empty">見つかりませんでした</div>' : (mineOnly ? '<div class="empty">まだ Tier表がありません</div>' : "")));

  /* 最近つかった Tier表（検索中は出さない） */
  const rec = lsGet(RECENT_KEY, []).map((id) => tables.find((t) => t.id === id)).filter(Boolean).slice(0, 4);
  const rw = $("#recentWrap");
  if (!q && !mineOnly && rec.length) { rw.classList.remove("hide"); $("#recentGrid").innerHTML = rec.map(cardHTML).join(""); }
  else rw.classList.add("hide");
  $("#allLabel").firstChild.nodeValue = mineOnly ? "マイ Tier表 " : "すべての Tier表 ";
}
function renderHomeSoft() { if (screen === "home" || screen === "mine") renderHome(screen === "mine"); }

/* ══════════════════════════════════════════════
   7. Tier表の作成・複製・削除
   ══════════════════════════════════════════════ */
function dlgOpen(html) { $("#dlg").innerHTML = html; $("#ov").classList.add("on"); }
/* ★ 2026-08-17e 「はい／いいえ」を自前のダイアログで聞く。
   ------------------------------------------------------------
   これまで confirm() を使っていたが、**ホーム画面から起動したアプリ表示では
   確認ダイアログが出ないことがある**。そのとき confirm() は false 相当を返すので、
   削除の処理が<b>何も起きずに終わる</b>＝「消去ボタンを押しても消えない」になっていた。
   （MagiLex のメモ「全部消す」がまったく同じ原因だった）
   自前のダイアログなら必ず出るので、確認そのものは残したまま直せる。 */
let _askResolve = null;
/* ★ 2026-08-17e 評価を星で見せる部品。
   プレゼン・閲覧モード・キャラ詳細で<b>同じ関数</b>を通す。
   別々に書くと、片方だけ項目が増えて食いちがう（実際そうなっていた）。 */
function fmtN(n) { return (Number(n) || 0).toLocaleString("ja-JP"); }
function starRow(label, val, max) {
  const m = max || 5;
  const v = Math.max(0, Math.min(m, Number(val) || 0));
  let st = "";
  for (let i = 1; i <= m; i++) st += '<i class="' + (v >= i ? "on" : "") + '">★</i>';
  return '<div class="strow"><span class="sl">' + esc(label) + '</span>'
       + '<span class="ss">' + st + '</span>'
       + '<span class="sv">' + (Math.round(v * 10) / 10) + '</span></div>';
}
/* 1枚の画像について、評価項目ぜんぶ＋総合を返す（項目が無ければ空文字） */
function scoreBlockHTML(im, t) {
  if (!im || !t) return "";
  const axes = t.axes || [];
  const rows = axes.map((ax) => starRow(ax.label || ax.name || ax.key, (im.scores || {})[ax.key] || 0, 5)).join("");
  const tot = totalScore(im);
  const rate = t.rateMax === 10
    ? '<div class="strow tot"><span class="sl">評価</span><span class="ss num">' + (im.rating || 0).toFixed(1) + ' / 10</span></div>'
    : starRow("評価", im.rating || 0, 5);
  if (!rows && !(im.rating > 0)) return "";
  return '<div class="scblock">' + rate + rows
       + '<div class="strow tot"><span class="sl">総合</span><span class="ss num">' + tot.toFixed(1) + ' / 10</span></div></div>';
}
function askYesNo(title, body, okLabel) {
  return new Promise((resolve) => {
    _askResolve = resolve;
    dlgOpen(`<h2>${esc(title)}</h2>
      <p class="dsub" style="white-space:pre-wrap">${esc(body)}</p>
      <div class="foot">
        <button class="btn" onclick="MT.askAnswer(false)">やめる</button>
        <button class="btn dgr" onclick="MT.askAnswer(true)">${esc(okLabel || "実行する")}</button>
      </div>`);
  });
}
function askAnswer(v) {
  const f = _askResolve; _askResolve = null;
  dlgClose();
  if (f) f(!!v);
}
function dlgClose() { $("#ov").classList.remove("on"); }

function newDlg(tplKey) {
  const t = TEMPLATES.map((x) => `<option value="${x.key}"${x.key === (tplKey || "sd") ? " selected" : ""}>${esc(x.nm)}</option>`).join("");
  dlgOpen(`<h2>新しい Tier表</h2><p class="dsub">テンプレートをえらんで、すぐに並べはじめられます。</p>
    <div class="fld"><label class="lbl">タイトル</label><input class="inp" id="nName" placeholder="例）キャラクター Tier表" value=""></div>
    <div class="fld"><label class="lbl">Tier構成（テンプレート）</label><select class="inp" id="nTpl">${t}</select></div>
    <div class="fld"><label class="lbl">パスワード（任意・開くときに聞きます）</label><input class="inp" id="nPw" type="text" placeholder="空ならロックなし"></div>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">やめる</button><button class="btn pri" onclick="MT.create()">つくる</button></div>`);
  setTimeout(() => { const e = $("#nName"); if (e) e.focus(); }, 60);
}
async function create() {
  const name = ($("#nName").value || "").trim() || "新しい Tier表";
  const key = $("#nTpl").value;
  const pw = ($("#nPw").value || "").trim();
  const tpl = TEMPLATES.find((x) => x.key === key) || TEMPLATES[0];
  const t = normalize({ id: uid("t"), name, tiers: mkTiers(tpl.tiers), images: [], password: pw,
    author: (window.XEVA && XEVA.account.get() || {}).name || "" });
  tables.push(t); await save(t, true);
  try { if (window.XEVA && XEVA.completeMission) XEVA.completeMission("magitier_make"); } catch (e) {}
  dlgClose(); openTable(t.id);
}
function renameDlg(id) {
  const t = tables.find((x) => x.id === id); if (!t) return;
  dlgOpen(`<h2>名前を変える</h2>
    <div class="fld"><label class="lbl">タイトル</label><input class="inp" id="rName" value="${esc(t.name)}"></div>
    <div class="fld"><label class="lbl">パスワード</label><input class="inp" id="rPw" value="${esc(t.password)}" placeholder="空ならロックなし"></div>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">やめる</button><button class="btn pri" onclick="MT.doRename('${id}')">保存</button></div>`);
}
async function doRename(id) {
  const t = tables.find((x) => x.id === id); if (!t) return;
  t.name = ($("#rName").value || "").trim() || t.name;
  t.password = ($("#rPw").value || "").trim();
  await save(t, true); dlgClose(); renderHomeSoft(); toast("保存しました");
}
async function dup(id) {
  const src = tables.find((x) => x.id === id); if (!src) return;
  const t = normalize(JSON.parse(JSON.stringify(src)));
  t.id = uid("t"); t.name = src.name + "（コピー）"; t.createdAt = t.updatedAt = Date.now();
  tables.push(t); await save(t, true); renderHomeSoft(); toast("複製しました");
}
async function del(id) {
  const t = tables.find((x) => x.id === id); if (!t) return;
  /* ★ 2026-08-16 MagiBurst のキャラTier表は消せない。
     この表は MagiBurst 側から参照されている「共有の1枚」で、
     消すと向こうの画面から中身が消えるうえ、作り直しても別物になる。 */
  if (id === MB_TABLE_ID) {
    /* ★ 2026-08-16c ここはトーストだと気づかれず「押しても反応しない」と受け取られていた。
       消せない理由と、代わりにできること（中身を空にする）まで出す。 */
    alert([
      "この表は削除できません。",
      "",
      "「MagiBurst キャラTier表」は MagiBurst のゲーム内から参照している共有の1枚です。",
      "消すと向こうの画面から中身が消えてしまうため、常に1枚だけ残す作りにしています。",
      "",
      "並びをやり直したいときは、表を開いて キャラを「未配置の画像」へ戻してください。",
    ].join("\n"));
    return;
  }
  if (!await askYesNo("Tier表を削除します", "「" + t.name + "」を削除します。\nもとに戻せません。よろしいですか？", "削除する")) return;
  tables = tables.filter((x) => x.id !== id); await idbDel(id);
  lsSet(RECENT_KEY, lsGet(RECENT_KEY, []).filter((x) => x !== id));
  renderHomeSoft(); toast("削除しました");
}
function open(id) {
  const t = tables.find((x) => x.id === id); if (!t) return;
  if (t.password) {
    const pw = prompt("🔒 パスワードを入力してください");
    if (pw === null) return;
    if (pw !== t.password) { toast("パスワードがちがいます"); return; }
  }
  openTable(id);
}
function openTable(id) {
  cur = tables.find((x) => x.id === id); if (!cur) return;
  normalize(cur); selImg = null; pushRecent(id);
  /* ★ 2026-08-17f MagiBurst 表は、開くたびに中身をそろえ直す
     （キャラでない t_ 画像が残っていたのを、ここで必ず片づける） */
  if (id === MB_TABLE_ID && typeof mbChars === "function" && mbChars()) {
    mbNormalizeTable(cur); save(cur, true);
  }
  $("#etName").value = cur.name;
  go("edit");
}
function renameCur(v) { if (!cur) return; cur.name = v; saveSoon(); }
async function saveNow() { await save(cur); toast("保存しました"); }
/* ══ ★ 2026-08-17f MagiBurst 表は「保存」ではなく「公開」 ══
   ------------------------------------------------------------
   この表は<b>ほかの端末や MagiBurst から見られてはじめて意味がある</b>。
   これまでは 保存＝端末の中だけ で、別に「公開」を押さないと
   MagiBurst 側は「まだ公開されていません」のままだった。
   ボタンそのものを「公開」に変えて、押したら
   <b>端末に保存 → Firebase へ公開</b>まで通す。 */
async function saveOrPublish() {
  if (cur && cur.id === MB_TABLE_ID) {
    await save(cur);          // まず手元に確実に残す
    await mbPublish();        // そのまま共有まで
    return;
  }
  await saveNow();
}
/* ボタンの見た目を表に合わせて出し分ける */
function syncSaveBtn() {
  const b = $("#etSaveBtn"); if (!b) return;
  const isMb = !!(cur && cur.id === MB_TABLE_ID);
  b.textContent = isMb ? "公開" : "保存";
  b.title = isMb ? "端末に保存して、MagiBurst と他の端末に共有します" : "この端末に保存します";
  b.classList.toggle("pub", isMb);
}

/* ══════════════════════════════════════════════
   8. エディタ — 描画
   ══════════════════════════════════════════════ */
function allImages(t) { return t.tiers.reduce((a, tr) => a.concat(tr.images), []).concat(t.images); }
function findImg(id) {
  if (!cur) return null;
  for (const tr of cur.tiers) { const f = tr.images.find((x) => x.id === id); if (f) return { img: f, tier: tr }; }
  const f = cur.images.find((x) => x.id === id); return f ? { img: f, tier: null } : null;
}
/* 総合点（0〜10）。評価項目があればその平均、なければ rating をそのまま */
function totalScore(im) {
  const ax = cur ? cur.axes : DEF_AXES;
  const vals = ax.map((a) => im.scores[a.key]).filter((v) => typeof v === "number" && v > 0);
  if (!vals.length) return im.rating || 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;   // 1〜5
  return Math.round(avg * 2 * 10) / 10;                        // 10点満点に直す
}
function sortImages(arr) {
  const m = cur.sortMode;
  if (m === "manual") return arr;
  const a = arr.slice();
  if (m === "name")  a.sort((x, y) => String(x.name).localeCompare(String(y.name), "ja"));
  if (m === "score") a.sort((x, y) => totalScore(y) - totalScore(x));
  if (m === "added") a.sort((x, y) => (x.addedAt || 0) - (y.addedAt || 0));
  if (m === "new")   a.sort((x, y) => (y.addedAt || 0) - (x.addedAt || 0));
  return a;
}

function imgCardHTML(im, where, idx) {
  const full = cur.cardName || cur.cardMemo;
  const sc = cur.cardScore ? `<span class="sc">${totalScore(im).toFixed(1)}</span>` : "";
  const cls = "icard" + (full ? " full" : "") + (selImg === im.id ? " sel" : "");
  const body = full
    ? `<img src="${esc(im.src)}" alt="" loading="lazy">${sc}
       ${cur.cardName ? `<div class="cn">${esc(im.name || "—")}</div>` : ""}
       ${cur.cardMemo ? `<div class="cm">${esc(im.memo || "")}</div>` : ""}`
    : `<img src="${esc(im.src)}" alt="${esc(im.name)}" title="${esc(im.name)}" loading="lazy">${sc}`;
  return `<div class="${cls}" draggable="true" data-img="${im.id}" data-where="${where}" data-idx="${idx}"
    onclick="MT.pickImg('${im.id}')" oncontextmenu="event.preventDefault();MT.imgMenu('${im.id}')">${body}</div>`;
}
function renderTable(host, forPresent) {
  const t = cur;
  host.innerHTML = t.tiers.map((tr, ti) => {
    const imgs = sortImages(tr.images);
    const cells = imgs.map((im, i) => imgCardHTML(im, "t" + ti, i)).join("")
      + (forPresent ? "" : `<button class="addbtn" onclick="MT.addDlg(${ti})" title="このTierに画像を追加">＋</button>`);
    const alignCls = tr.align === "top" ? " top" : tr.align === "bottom" ? " bottom" : "";
    return `<div class="trow" data-ti="${ti}">
      <div class="tlab${alignCls}" style="background:${esc(tr.bg)};color:${esc(tr.tc)};min-height:${tr.h}px;width:${tr.w}px;font-size:${tr.fs}px;font-weight:${tr.bold ? 900 : 600}"
        ${forPresent ? "" : `onclick="MT.tierDlg(${ti})" title="このTierを編集"`}>${esc(tr.label)}</div>
      <div class="tcell" data-ti="${ti}">${cells}</div>
    </div>`;
  }).join("");
  if (!forPresent) bindDnD(host);
}
function renderTierList() {
  const el = $("#tierList");
  el.innerHTML = cur.tiers.map((tr, i) => `
    <div class="tlrow">
      <span class="bdg" style="background:${esc(tr.bg)};color:${esc(tr.tc)}">${esc(String(tr.label).slice(0, 2))}</span>
      <span class="nm">${esc(tr.name)}</span>
      <button title="上へ" onclick="MT.moveTier(${i},-1)">↑</button>
      <button title="下へ" onclick="MT.moveTier(${i},1)">↓</button>
      <button title="編集" onclick="MT.tierDlg(${i})">⋮</button>
    </div>`).join("") || '<div class="muted">Tierがありません</div>';
}
/* ★ 2026-08-17d プールの検索文字。表そのものには保存しない（その場かぎりの絞り込み） */
let poolQuery = "";
let poolAttr = "";                       // MagiBurst 表むけの属性しぼり
function setPoolQuery(v) { poolQuery = String(v || ""); renderPool(); }
function setPoolAttr(v) { poolAttr = (poolAttr === v) ? "" : v; renderPool(); }
/* ★ memo に入っているのは mb-core の属性キー（light / water …）で、日本語ではない。
   チップの見た目は日本語、当てるのはキー、と分けておく。
   （最初これを見落として、どの属性を押しても0件だった） */
const MB_ATTR_KEY = { "火": "fire", "水": "water", "木": "wood", "光": "light", "闇": "dark" };
/* MagiBurst のキャラ表だけ、属性のチップを出す。
   ★ memo に「属性 / 型」を入れてあるので、そこを見れば mb-core を読み直さずに絞れる。 */
const MB_ATTRS = [["火","#ff6b4d"],["水","#38a6ff"],["木","#3ec98a"],["光","#f0b429"],["闇","#a86bff"]];
/* ★ 2026-08-17e 並び替えは「並び替え」ダイアログの奥にあって気づかれなかった。
   いちばん使う<b>追加した順</b>を含めて、プールのバーから直に選べるようにする。 */
const POOL_SORTS = [["manual", "手動"], ["added", "追加順"], ["new", "新しい順"],
                    ["name", "名前順"], ["score", "評価順"]];
function renderPoolSort() {
  const box = $("#poolSort"); if (!box) return;
  box.innerHTML = '<span class="pslbl">並び</span>' + POOL_SORTS.map(([k, l]) =>
    `<button class="pschip${cur.sortMode === k ? " on" : ""}" onclick="MT.setSortQuick('${k}')">${l}</button>`).join("");
}
function setSortQuick(k) { cur.sortMode = k; save(cur, true); refresh(); toast("「" + (POOL_SORTS.find(x => x[0] === k) || [, k])[1] + "」に並べ替えました"); }
function renderPoolChips() {
  const box = $("#poolChips"); if (!box) return;
  if (!cur || cur.id !== MB_TABLE_ID) { box.innerHTML = ""; return; }
  box.innerHTML = MB_ATTRS.map(([nm, c]) =>
    `<button class="pchip${poolAttr === nm ? " on" : ""}" style="--pc:${c}"
       onclick="MT.setPoolAttr('${nm}')">${nm}</button>`).join("");
}
/* カードの大きさは表ごとに覚える（1枚の絵が細かい表と、顔だけの表で見やすさが違うため） */
function setCardSize(v) {
  cur.cardSize = Math.max(52, Math.min(150, parseInt(v, 10) || 84));
  applyCardSize(); save(cur, true);
}
/* ★ 2026-08-17e Tier表の中の大きさは<b>プールとは別</b>に持つ。
   プールは一覧しやすい小さめ、表は見せる用に大きめ、という使い分けができる。 */
function setTableSize(v) {
  cur.tableSize = Math.max(44, Math.min(180, parseInt(v, 10) || 84));
  applyCardSize(); save(cur, true);
}
function applyCardSize() {
  const root = document.documentElement;
  root.style.setProperty("--icard", (cur && cur.cardSize ? cur.cardSize : 84) + "px");
  root.style.setProperty("--icard-t", (cur && cur.tableSize ? cur.tableSize : 84) + "px");
  const r = $("#poolSize"); if (r) r.value = (cur && cur.cardSize) || 84;
  const r2 = $("#tableSize"); if (r2) r2.value = (cur && cur.tableSize) || 84;
}
/* ★ 検索は「名前」だけでなく<b>元のファイル名</b>にも当てる。
   まとめて取りこんだ直後は名前が空のことがあり、そのときファイル名だけが手がかりになる。 */
function poolMatch(im) {
  if (poolAttr) {
    const memo = String(im.memo || "");
    const key = MB_ATTR_KEY[poolAttr] || poolAttr;
    if (!memo.includes(key) && !memo.includes(poolAttr)) return false;
  }
  const q = poolQuery.trim().toLowerCase();
  if (!q) return true;
  return [im.name, im.file, im.memo].filter(Boolean)
    .some((t) => String(t).toLowerCase().includes(q));
}
function togglePool() {
  const w = $("#poolWrap"); if (!w) return;
  w.classList.toggle("folded");
  const b = $("#poolFold"); if (b) b.textContent = w.classList.contains("folded") ? "▸" : "▾";
}
function renderPool() {
  const p = $("#pool");
  const all = sortImages(cur.images);
  const imgs = all.filter(poolMatch);
  p.innerHTML = imgs.map((im, i) => imgCardHTML(im, "pool", i)).join("")
    || (poolQuery.trim()
        ? '<div class="muted" style="padding:12px">「' + esc(poolQuery) + '」に当たる画像がありません</div>'
        : '<div class="muted" style="padding:12px">ここに画像をドラッグすると外せます</div>');
  $("#poolCnt").textContent = (poolQuery.trim() || poolAttr)
    ? "（" + imgs.length + " / " + all.length + " 枚）"
    : "（" + cur.images.length + " 枚）";
  renderPoolChips(); renderPoolSort();
  bindDnD(p.parentElement);
}
function renderSel() {
  const box = $("#selBox");
  const f = selImg && findImg(selImg);
  if (!f) { box.innerHTML = '<div class="empty" style="padding:26px 8px">画像をえらぶと<br>ここで編集できます</div>'; return; }
  const im = f.img;
  const tierOpts = ['<option value="">（未配置）</option>']
    .concat(cur.tiers.map((tr, i) => `<option value="${i}"${f.tier === tr ? " selected" : ""}>${esc(tr.label)} — ${esc(tr.name)}</option>`)).join("");
  const stars = (val, key) => {
    let h = '<div class="stars">';
    for (let i = 1; i <= 5; i++) h += `<button class="${val >= i ? "on" : ""}" onclick="MT.setScore('${key}',${i})">★</button>`;
    return h + "</div>";
  };
  box.innerHTML = `
    <img class="selprev" src="${esc(im.src)}" alt="">
    <div class="row" style="margin:9px 0 4px">
      <button class="btn sm" onclick="MT.replaceImg('${im.id}')">画像を差し替え</button>
      <span class="sp"></span>
      <button class="btn sm dgr" onclick="MT.delImg('${im.id}')">削除</button>
    </div>
    <div class="fld"><label class="lbl">名前</label><input class="inp" value="${esc(im.name)}" oninput="MT.setImgField('name',this.value)"></div>
    <div class="fld"><label class="lbl">メモ</label><textarea class="inp" style="min-height:56px" oninput="MT.setImgField('memo',this.value)">${esc(im.memo)}</textarea></div>
    <div class="fld"><label class="lbl">現在の Tier</label><select class="inp" onchange="MT.moveImgTo('${im.id}',this.value)">${tierOpts}</select></div>
    <div class="fld">
      <label class="lbl">評価（${cur.rateMax === 10 ? "10点" : "5段階"}）</label>
      ${cur.rateMax === 10
        ? `<input class="rng" type="range" min="0" max="10" step="0.5" value="${im.rating || 0}" oninput="MT.setImgField('rating',parseFloat(this.value))">
           <div class="muted" style="text-align:right">${(im.rating || 0).toFixed(1)} / 10</div>`
        : stars(im.rating, "__rating")}
    </div>
    <div class="fld">
      <label class="lbl">項目べつの評価</label>
      ${cur.axes.map((a) => `<div class="axrow"><span class="an">${esc(a.label)}</span>${stars(im.scores[a.key] || 0, a.key)}</div>`).join("")}
      <div class="row" style="margin-top:8px"><span class="muted">総合</span><span class="sp"></span>
        <span class="total">${totalScore(im).toFixed(1)}<small>/ 10</small></span></div>
      <button class="btn sm wide" style="margin-top:8px" onclick="MT.axesDlg()">評価項目を編集</button>
      ${cur.autoRule.on ? `<button class="btn sm wide" style="margin-top:6px" onclick="MT.applyAuto('${im.id}')">評価から Tier を決める</button>` : ""}
    </div>`;
}
function renderSwitches() {
  $("#swName").classList.toggle("on", cur.cardName);
  $("#swMemo").classList.toggle("on", cur.cardMemo);
  $("#swScore").classList.toggle("on", cur.cardScore);
}
function renderEditor() {
  if (!cur) { go("home"); return; }
  renderTierList(); renderTable($("#tt"), false); renderPool(); renderSel(); renderSwitches();
  applyCardSize(); fitEditTools(); syncSaveBtn();
  /* スマホでは左右のパネルを畳んでおく（3カラムを縮小せず、必要なときだけシートで開く） */
  if (isPhone()) { $("#paneL").classList.remove("mopen"); $("#paneR").classList.toggle("mopen", !!selImg); }
}
function refresh() { if (screen === "edit") renderEditor(); }
/* ══ ★ 2026-08-17e ハンバーガーは<b>実際にはみ出したときだけ</b>出す ══
   これまで「画面が900px未満なら出す」という決め打ちだったので、
   ・PCの広い画面でも出てしまう（ボタンは全部見えているのに）
   ・ボタンを増やすと900px以上でも収まらなくなる
   の両方が起きていた。ボタンの並び（.etop-acts）の中身の幅と、
   置ける幅を実測して比べる。 */
function fitEditTools() {
  const acts = $(".etop-acts"), btn = $("#etMenuBtn");
  if (!acts || !btn) return;
  /* いったん出して素の幅を測る（隠れていると幅が0になる） */
  acts.classList.remove("hide");
  const bar = acts.parentElement;
  const need = acts.scrollWidth;
  /* 並びの中で、ボタン以外（名前の入力・保存ボタンなど）が使っている幅を引く */
  let used = 0;
  Array.prototype.forEach.call(bar.children, (el) => { if (el !== acts) used += el.offsetWidth; });
  const room = bar.clientWidth - used - 12;
  const overflow = need > room;
  acts.classList.toggle("hide", overflow);
  btn.classList.toggle("show", overflow);
}
/* 窓の大きさが変わったら測り直す */
window.addEventListener("resize", () => { if (screen === "edit") fitEditTools(); });

/* ══════════════════════════════════════════════
   9. Tier の追加・編集・並び替え
   ══════════════════════════════════════════════ */
function addTier() {
  const n = cur.tiers.length;
  const pal = [C.s, C.a, C.b, C.c, C.d, C.e, C.f, C.teal, C.pink, C.gold];
  const bg = pal[n % pal.length];
  cur.tiers.push({ id: uid("tr"), label: String.fromCharCode(65 + Math.min(n, 25)), name: "Tier " + (n + 1),
    bg, tc: inkFor(bg), h: 80, w: 78, fs: 22, bold: true, align: "center", images: [], criteria: "" });
  save(cur, true); refresh();
}
function moveTier(i, d) {
  const j = i + d; if (j < 0 || j >= cur.tiers.length) return;
  const [x] = cur.tiers.splice(i, 1); cur.tiers.splice(j, 0, x);
  save(cur, true); refresh();
}
function tierDlg(i) {
  const tr = cur.tiers[i]; if (!tr) return;
  dlgOpen(`<h2>Tierの設定</h2><p class="dsub">ラベル・色・大きさを自由に変えられます。</p>
    <div class="grid2">
      <div class="fld"><label class="lbl">ラベル（表に出る文字）</label><input class="inp" id="tLabel" value="${esc(tr.label)}"></div>
      <div class="fld"><label class="lbl">Tier名（一覧に出る名前）</label><input class="inp" id="tName2" value="${esc(tr.name)}"></div>
    </div>
    <div class="grid2">
      <div class="fld"><label class="lbl">背景色</label><div class="colorrow"><input type="color" id="tBg" value="${esc(tr.bg)}"><input class="inp" id="tBgT" value="${esc(tr.bg)}"></div></div>
      <div class="fld"><label class="lbl">文字色</label><div class="colorrow"><input type="color" id="tTc" value="${esc(tr.tc)}"><input class="inp" id="tTcT" value="${esc(tr.tc)}"></div></div>
    </div>
    <div class="fld"><label class="lbl">高さ <b id="tHv">${tr.h}</b>px</label><input class="rng" type="range" id="tH" min="46" max="220" value="${tr.h}" oninput="document.getElementById('tHv').textContent=this.value"></div>
    <div class="fld"><label class="lbl">ラベルの幅 <b id="tWv">${tr.w}</b>px</label><input class="rng" type="range" id="tW" min="44" max="220" value="${tr.w}" oninput="document.getElementById('tWv').textContent=this.value"></div>
    <div class="fld"><label class="lbl">文字の大きさ <b id="tFv">${tr.fs}</b>px</label><input class="rng" type="range" id="tF" min="11" max="52" value="${tr.fs}" oninput="document.getElementById('tFv').textContent=this.value"></div>
    <div class="fld"><label class="lbl">ラベルの位置</label>
      <div class="row">
        <button class="chip ${tr.align === "top" ? "on" : ""}" onclick="MT.pickAlign(this,'top')">上</button>
        <button class="chip ${tr.align === "center" ? "on" : ""}" onclick="MT.pickAlign(this,'center')">中央</button>
        <button class="chip ${tr.align === "bottom" ? "on" : ""}" onclick="MT.pickAlign(this,'bottom')">下</button>
        <span class="sp"></span>
        <label class="row" style="gap:6px;font-size:12.5px;font-weight:700"><input type="checkbox" id="tBold" ${tr.bold ? "checked" : ""}>太字</label>
      </div></div>
    <div class="fld"><label class="lbl">この Tier の基準（メモ）</label><textarea class="inp" id="tCri" style="min-height:52px">${esc(tr.criteria)}</textarea></div>
    <div class="foot">
      <button class="btn dgr" onclick="MT.delTier(${i})">この Tier を削除</button>
      <span class="sp"></span>
      <button class="btn" onclick="MT.closeDlg()">やめる</button>
      <button class="btn pri" onclick="MT.saveTier(${i})">保存</button>
    </div>`);
  $("#dlg").dataset.align = tr.align;
  const sync = (a, b) => { $(a).oninput = () => { $(b).value = $(a).value; }; $(b).oninput = () => { if (/^#[0-9a-f]{6}$/i.test($(b).value)) $(a).value = $(b).value; }; };
  sync("#tBg", "#tBgT"); sync("#tTc", "#tTcT");
}
function pickAlign(btn, v) { $("#dlg").dataset.align = v; $$("#dlg .chip").forEach((b) => b.classList.remove("on")); btn.classList.add("on"); }
function saveTier(i) {
  const tr = cur.tiers[i]; if (!tr) return;
  tr.label = $("#tLabel").value; tr.name = $("#tName2").value || tr.label;
  tr.bg = $("#tBgT").value || tr.bg; tr.tc = $("#tTcT").value || inkFor(tr.bg);
  tr.h = +$("#tH").value; tr.w = +$("#tW").value; tr.fs = +$("#tF").value;
  tr.bold = $("#tBold").checked; tr.align = $("#dlg").dataset.align || "center";
  tr.criteria = $("#tCri").value;
  save(cur, true); dlgClose(); refresh();
}
async function delTier(i) {
  const tr = cur.tiers[i]; if (!tr) return;
  if (!await askYesNo("Tierを削除します", "「" + tr.name + "」を削除します。\n中の画像は未配置にもどります。", "削除する")) return;
  cur.images = cur.images.concat(tr.images);
  cur.tiers.splice(i, 1);
  save(cur, true); dlgClose(); refresh();
}

/* ══════════════════════════════════════════════
   10. 画像の追加（PC D&D／ファイル／写真／カメラ／URL／一括）
   ══════════════════════════════════════════════ */
let addTargetTier = null;   // 追加先の Tier（null＝未配置プール）
const BULK_MAX = 20;

function addDlg(ti) {
  addTargetTier = (typeof ti === "number") ? ti : null;
  const where = addTargetTier == null ? "未配置" : cur.tiers[addTargetTier].label + " Tier";
  dlgOpen(`<h2>画像を追加</h2><p class="dsub">追加先：<b>${esc(where)}</b>　一度に <b>${BULK_MAX}枚</b>まで選べます。</p>
    <button class="pickrow" onclick="MT.pickFile(false)"><span class="pi">
      <svg class="ico" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 2.5-2.5L20 17"/></svg></span>
      <span><b>写真から選択</b><small>スマホの写真・PCの画像ファイルから</small></span></button>
    <button class="pickrow" onclick="MT.pickFile(true)"><span class="pi">
      <svg class="ico" viewBox="0 0 24 24"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.4"/></svg></span>
      <span><b>カメラで撮影</b><small>その場で撮って追加します</small></span></button>
    <button class="pickrow" onclick="MT.pickFile(false)"><span class="pi">
      <svg class="ico" viewBox="0 0 24 24"><path d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2z"/></svg></span>
      <span><b>ファイルから選択</b><small>まとめて選ぶと一括で追加されます</small></span></button>
    <button class="pickrow" onclick="MT.urlDlg()"><span class="pi">
      <svg class="ico" viewBox="0 0 24 24"><path d="M10 13a4 4 0 006 .5l2-2a4 4 0 10-5.7-5.7l-1 1"/><path d="M14 11a4 4 0 00-6-.5l-2 2a4 4 0 105.7 5.7l1-1"/></svg></span>
      <span><b>URLから追加</b><small>画像のアドレスを貼り付けます</small></span></button>
    <p class="muted" style="margin:12px 2px 0">PC では、この画面に画像を<b>ドラッグ＆ドロップ</b>しても追加できます。</p>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">とじる</button></div>`);
}
function pickFile(cam) { (cam ? $("#camIn") : $("#fileIn")).click(); }
function bulkAdd() { addTargetTier = null; $("#fileIn").click(); }
function urlDlg() {
  dlgOpen(`<h2>URLから追加</h2><p class="dsub">画像のアドレスを1行に1つずつ貼り付けてください。</p>
    <div class="fld"><textarea class="inp" id="uUrl" style="min-height:110px" placeholder="https://example.com/a.png"></textarea></div>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">やめる</button><button class="btn pri" onclick="MT.addUrls()">追加する</button></div>`);
}
async function addUrls() {
  const lines = ($("#uUrl").value || "").split(/\s*\n\s*/).map((s) => s.trim()).filter(Boolean).slice(0, BULK_MAX);
  if (!lines.length) { toast("URLを入れてください"); return; }
  lines.forEach((u) => pushImage({ src: u, name: (u.split("/").pop() || "").replace(/\.[^.]+$/, "") }));
  await save(cur, true); dlgClose(); refresh(); toast(lines.length + " 枚を追加しました");
}
function pushImage(o) {
  const im = normImg({ id: uid("i"), src: o.src, name: o.name || "", memo: "", rating: 0, scores: {}, addedAt: Date.now() });
  if (addTargetTier != null && cur.tiers[addTargetTier]) cur.tiers[addTargetTier].images.push(im);
  else cur.images.push(im);
  return im;
}
/* 画像は長辺 512px の WebP に縮めて持つ（数百枚でも IndexedDB が膨らまないように） */
function shrink(file) {
  return new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const M = 512, sc = Math.min(1, M / Math.max(img.width, img.height));
        const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        let out; try { out = cv.toDataURL("image/webp", 0.86); } catch (e) { out = null; }
        if (!out || out.length < 100) out = cv.toDataURL("image/jpeg", 0.86);
        res(out);
      };
      img.onerror = () => res(fr.result);
      img.src = fr.result;
    };
    fr.onerror = () => res(null);
    fr.readAsDataURL(file);
  });
}
async function onFiles(files) {
  const list = Array.from(files || []).filter((f) => /^image\//.test(f.type)).slice(0, BULK_MAX);
  if (!list.length) return;
  toast(list.length + " 枚を読み込み中…");
  for (const f of list) {
    const src = await shrink(f);
    if (src) pushImage({ src, name: f.name.replace(/\.[^.]+$/, "") });
  }
  await save(cur, true); dlgClose(); refresh(); toast(list.length + " 枚を追加しました");
}
function replaceImg(id) {
  const f = findImg(id); if (!f) return;
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = async () => { const file = inp.files[0]; if (!file) return; const src = await shrink(file); if (src) { f.img.src = src; await save(cur, true); refresh(); } };
  inp.click();
}
async function delImg(id) {
  const f = findImg(id); if (!f) return;
  if (f.tier) f.tier.images = f.tier.images.filter((x) => x.id !== id);
  else cur.images = cur.images.filter((x) => x.id !== id);
  if (selImg === id) selImg = null;
  await save(cur, true); refresh();
}
function imgMenu(id) {
  selImg = id; refresh();
  if (isPhone()) tierPickDlg(id);
}

/* ══════════════════════════════════════════════
   11. 画像の選択・移動
   ══════════════════════════════════════════════ */
function pickImg(id) {
  /* スマホは「タップで選ぶ → 移動先の Tier をえらぶ」。PC は右パネルで編集。 */
  if (selImg === id && isPhone()) { tierPickDlg(id); return; }
  selImg = id; refresh();
  if (isPhone()) tierPickDlg(id);
}
function tierPickDlg(id) {
  const f = findImg(id); if (!f) return;
  const im = f.img;
  const btns = cur.tiers.map((tr, i) => `<button style="background:${esc(tr.bg)};color:${esc(tr.tc)}" class="${f.tier === tr ? "on" : ""}" onclick="MT.moveImgTo('${id}',${i})">${esc(tr.label)}</button>`).join("")
    + `<button style="background:var(--panel2);color:var(--ink2);border:1px solid var(--line)" class="${f.tier ? "" : "on"}" onclick="MT.moveImgTo('${id}','')">未配置</button>`;
  dlgOpen(`<h2>Tierを変更</h2>
    <div class="row" style="margin-bottom:14px">
      <img src="${esc(im.src)}" alt="" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:1px solid var(--line)">
      <div style="flex:1;min-width:0">
        <div style="font-weight:800">${esc(im.name || "（名前なし）")}</div>
        <div class="muted">現在の Tier：${f.tier ? esc(f.tier.label) : "未配置"}</div>
      </div>
    </div>
    <label class="lbl">移動先をえらぶ</label>
    <div class="tierpick" style="margin-bottom:14px">${btns}</div>
    <div class="fld"><label class="lbl">名前</label><input class="inp" value="${esc(im.name)}" oninput="MT.setImgFieldOf('${id}','name',this.value)"></div>
    <div class="fld"><label class="lbl">メモ</label><textarea class="inp" style="min-height:52px" oninput="MT.setImgFieldOf('${id}','memo',this.value)">${esc(im.memo)}</textarea></div>
    ${/* スマホでは右パネルが出ないので、評価もこのシートで付けられるようにする */""}
    <div class="fld">
      <label class="lbl">評価（${cur.rateMax === 10 ? "10点" : "5段階"}）</label>
      ${cur.rateMax === 10
        ? `<input class="rng" type="range" min="0" max="10" step="0.5" value="${im.rating || 0}" oninput="MT.setImgFieldOf('${id}','rating',parseFloat(this.value));this.nextElementSibling.textContent=parseFloat(this.value).toFixed(1)+' / 10'">
           <div class="muted" style="text-align:right">${(im.rating || 0).toFixed(1)} / 10</div>`
        : `<div class="stars">${[1,2,3,4,5].map((i) => `<button class="${(im.rating || 0) >= i ? "on" : ""}" onclick="MT.setScoreOf('${id}','__rating',${i})">★</button>`).join("")}</div>`}
    </div>
    <div class="fld">
      <label class="lbl">項目べつの評価</label>
      ${cur.axes.map((a) => `<div class="axrow"><span class="an">${esc(a.label)}</span><div class="stars">${
        [1,2,3,4,5].map((i) => `<button class="${(im.scores[a.key] || 0) >= i ? "on" : ""}" onclick="MT.setScoreOf('${id}','${a.key}',${i})">★</button>`).join("")
      }</div></div>`).join("")}
      <div class="row" style="margin-top:6px"><span class="muted">総合</span><span class="sp"></span>
        <span class="total">${totalScore(im).toFixed(1)}<small>/ 10</small></span></div>
    </div>
    <div class="foot">
      <button class="btn dgr" onclick="MT.delImg('${id}');MT.closeDlg()">削除</button>
      <span class="sp"></span>
      <button class="btn pri" onclick="MT.closeDlg()">とじる</button>
    </div>`);
}
async function moveImgTo(id, ti) {
  const f = findImg(id); if (!f) return;
  const im = f.img;
  if (f.tier) f.tier.images = f.tier.images.filter((x) => x.id !== id);
  else cur.images = cur.images.filter((x) => x.id !== id);
  if (ti === "" || ti == null) cur.images.push(im);
  else cur.tiers[+ti].images.push(im);
  await save(cur, true); refresh();
  if ($("#ov").classList.contains("on")) tierPickDlg(id);
}
function setImgField(k, v) { const f = findImg(selImg); if (!f) return; f.img[k] = v; saveSoon(); if (k !== "name" && k !== "memo") refresh(); else redrawCards(); }
function setImgFieldOf(id, k, v) { const f = findImg(id); if (!f) return; f.img[k] = v; saveSoon(); redrawCards(); }
function setScore(key, v) { setScoreOf(selImg, key, v); }
/* シート（スマホ）からも同じ操作ができるように、id を受け取る形にしてある */
function setScoreOf(id, key, v) {
  const f = findImg(id); if (!f) return;
  if (key === "__rating") f.img.rating = (f.img.rating === v ? 0 : v);
  else f.img.scores[key] = (f.img.scores[key] === v ? 0 : v);
  saveSoon();
  if ($("#ov").classList.contains("on")) { tierPickDlg(id); redrawCards(); }
  else refresh();
}
/* 名前・メモを打っている最中に全部描き直すと入力欄が作り直されて変換中の文字が消える。
   カードだけを描き直す。 */
function redrawCards() { if (screen === "edit") { renderTable($("#tt"), false); renderPool(); } }

/* ══════════════════════════════════════════════
   12. ドラッグ＆ドロップ（PC）＋ 長押しドラッグ（スマホ）
   ══════════════════════════════════════════════ */
let dragId = null;
function bindDnD(root) {
  $$(".icard", root).forEach((el) => {
    el.ondragstart = (e) => { dragId = el.dataset.img; el.classList.add("drag"); try { e.dataTransfer.setData("text/plain", dragId); e.dataTransfer.effectAllowed = "move"; } catch (x) {} };
    el.ondragend = () => { el.classList.remove("drag"); dragId = null; $$(".dragover").forEach((c) => c.classList.remove("dragover")); };
    el.ondragover = (e) => { e.preventDefault(); e.stopPropagation();
      const r = el.getBoundingClientRect(); const left = (e.clientX - r.left) < r.width / 2;
      el.classList.toggle("dropL", left); el.classList.toggle("dropR", !left); };
    el.ondragleave = () => { el.classList.remove("dropL", "dropR"); };
    el.ondrop = (e) => { e.preventDefault(); e.stopPropagation();
      const left = el.classList.contains("dropL"); el.classList.remove("dropL", "dropR");
      dropOn(el.dataset.where, +el.dataset.idx + (left ? 0 : 1)); };
  });
  $$(".tcell", root).forEach((c) => {
    c.ondragover = (e) => { e.preventDefault(); c.classList.add("dragover"); };
    c.ondragleave = () => c.classList.remove("dragover");
    c.ondrop = (e) => { e.preventDefault(); c.classList.remove("dragover"); dropOn("t" + c.dataset.ti, -1); };
  });
  const p = $("#pool");
  if (p) {
    p.ondragover = (e) => { e.preventDefault(); p.classList.add("dragover"); };
    p.ondragleave = () => p.classList.remove("dragover");
    p.ondrop = (e) => { e.preventDefault(); p.classList.remove("dragover"); dropOn("pool", -1); };
  }
}
async function dropOn(where, at) {
  if (!dragId) return;
  const f = findImg(dragId); if (!f) return;
  const im = f.img;
  /* いったん元の場所から外す */
  if (f.tier) f.tier.images = f.tier.images.filter((x) => x.id !== dragId);
  else cur.images = cur.images.filter((x) => x.id !== dragId);
  const dst = where === "pool" ? cur.images : cur.tiers[+where.slice(1)].images;
  if (at < 0 || at > dst.length) dst.push(im); else dst.splice(at, 0, im);
  /* 手で並べたのだから、並び順は「手動」にもどす（自動整列だと戻ってしまう） */
  if (cur.sortMode !== "manual") { cur.sortMode = "manual"; toast("並び順を「手動」にもどしました"); }
  dragId = null;
  await save(cur, true); refresh();
}
/* スマホ：長押しでドラッグを始め、指を離したところの Tier へ移す */
(function touchDrag() {
  let timer = null, startEl = null, ghost = null, moved = false;
  document.addEventListener("touchstart", (e) => {
    const el = e.target.closest && e.target.closest(".icard");
    if (!el || !isPhone()) return;
    startEl = el; moved = false;
    timer = setTimeout(() => {
      dragId = el.dataset.img;
      ghost = el.cloneNode(true); ghost.style.cssText = "position:fixed;z-index:400;opacity:.85;pointer-events:none;transform:translate(-50%,-50%) scale(1.08)";
      document.body.appendChild(ghost);
      const t = e.touches[0]; ghost.style.left = t.clientX + "px"; ghost.style.top = t.clientY + "px";
      if (navigator.vibrate) navigator.vibrate(12);
    }, 320);
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (timer && !ghost) { clearTimeout(timer); timer = null; }
    if (!ghost) return;
    moved = true;
    const t = e.touches[0];
    ghost.style.left = t.clientX + "px"; ghost.style.top = t.clientY + "px";
    $$(".tcell,.pool").forEach((c) => c.classList.remove("dragover"));
    const under = document.elementFromPoint(t.clientX, t.clientY);
    const cell = under && under.closest && (under.closest(".tcell") || under.closest(".pool"));
    if (cell) cell.classList.add("dragover");
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchend", (e) => {
    clearTimeout(timer); timer = null;
    if (!ghost) return;
    const t = e.changedTouches[0];
    const under = document.elementFromPoint(t.clientX, t.clientY);
    const cell = under && under.closest && (under.closest(".tcell") || under.closest(".pool"));
    ghost.remove(); ghost = null;
    $$(".tcell,.pool").forEach((c) => c.classList.remove("dragover"));
    if (cell && moved) dropOn(cell.classList.contains("pool") ? "pool" : "t" + cell.dataset.ti, -1);
    else dragId = null;
    startEl = null;
  });
})();

/* ══════════════════════════════════════════════
   13. 並び替え・カード表示・評価項目・自動Tier
   ══════════════════════════════════════════════ */
function toggleCard(k) {
  const map = { name: "cardName", memo: "cardMemo", score: "cardScore" };
  cur[map[k]] = !cur[map[k]];
  save(cur, true); refresh();
}
function sortDlg() {
  const modes = [["manual","手動（自分で並べる）"],["name","名前順"],["score","評価順（高い順）"],["added","追加順"],["new","新しい順"]];
  dlgOpen(`<h2>並び替え・表示</h2><p class="dsub">Tierの中の並び順と、カードの見せかたを決めます。</p>
    <label class="lbl">並び替え</label>
    <div style="margin-bottom:14px">${modes.map(([k, l]) => `<button class="pickrow" onclick="MT.setSort('${k}')">
      <span class="pi">${cur.sortMode === k ? "✓" : "・"}</span><span><b>${l}</b></span></button>`).join("")}</div>
    <label class="lbl">カードの表示</label>
    <div class="swrow"><div style="flex:1"><b>名前を表示</b></div><button class="sw ${cur.cardName ? "on" : ""}" onclick="MT.toggleCard('name');MT.sortDlg()"><i></i></button></div>
    <div class="swrow"><div style="flex:1"><b>メモを表示</b></div><button class="sw ${cur.cardMemo ? "on" : ""}" onclick="MT.toggleCard('memo');MT.sortDlg()"><i></i></button></div>
    <div class="swrow"><div style="flex:1"><b>評価を表示</b></div><button class="sw ${cur.cardScore ? "on" : ""}" onclick="MT.toggleCard('score');MT.sortDlg()"><i></i></button></div>
    <label class="lbl" style="margin-top:14px">評価のかたち</label>
    <div class="row"><button class="chip ${cur.rateMax === 5 ? "on" : ""}" onclick="MT.setRateMax(5)">5段階</button>
      <button class="chip ${cur.rateMax === 10 ? "on" : ""}" onclick="MT.setRateMax(10)">10点</button></div>
    <div class="foot"><button class="btn pri" onclick="MT.closeDlg()">とじる</button></div>`);
}
function setSort(k) { cur.sortMode = k; save(cur, true); refresh(); dlgClose(); toast("並び替えました"); }
function setRateMax(n) { cur.rateMax = n; save(cur, true); refresh(); sortDlg(); }
function axesDlg() {
  dlgOpen(`<h2>評価項目</h2><p class="dsub">火力・耐久などの項目を自由に決められます（総合点は平均から自動計算）。</p>
    <div id="axList">${cur.axes.map((a, i) => `<div class="row" style="margin-bottom:7px">
      <input class="inp" value="${esc(a.label)}" data-ax="${i}">
      <button class="btn sm dgr" onclick="MT.delAxis(${i})">削除</button></div>`).join("")}</div>
    <button class="btn sm wide" onclick="MT.addAxis()">＋ 項目を追加</button>
    <label class="lbl" style="margin-top:16px">評価から Tier を自動で決める</label>
    <div class="swrow"><div style="flex:1"><b>自動決定をつかう</b><p>総合点のしきい値で Tier を決めます</p></div>
      <button class="sw ${cur.autoRule.on ? "on" : ""}" onclick="MT.toggleAuto()"><i></i></button></div>
    ${cur.autoRule.on ? `<div style="margin-top:10px">${cur.tiers.map((tr, i) => `
      <div class="row" style="margin-bottom:6px">
        <span class="chip" style="background:${esc(tr.bg)};color:${esc(tr.tc)};border-color:transparent;min-width:52px;justify-content:center">${esc(tr.label)}</span>
        <span class="muted">総合</span>
        <input class="inp" style="width:80px" type="number" step="0.1" min="0" max="10" value="${cutOf(i)}" data-cut="${i}">
        <span class="muted">点 以上</span>
      </div>`).join("")}
      <button class="btn sm wide" style="margin-top:6px" onclick="MT.applyAutoAll()">すべての画像に適用する</button></div>` : ""}
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">やめる</button><button class="btn pri" onclick="MT.saveAxes()">保存</button></div>`);
}
function cutOf(i) {
  const c = (cur.autoRule.cuts || []).find((x) => x.i === i);
  if (c) return c.min;
  const n = cur.tiers.length;
  return Math.round((10 - (10 / n) * i) * 10) / 10;   // 上から等間隔の初期値
}
function addAxis() { cur.axes.push({ key: uid("ax"), label: "新しい項目" }); save(cur, true); axesDlg(); }
function delAxis(i) { cur.axes.splice(i, 1); save(cur, true); axesDlg(); }
function toggleAuto() { cur.autoRule.on = !cur.autoRule.on; save(cur, true); axesDlg(); }
function saveAxes() {
  $$("#axList input[data-ax]").forEach((el) => { const i = +el.dataset.ax; if (cur.axes[i]) cur.axes[i].label = el.value || cur.axes[i].label; });
  const cuts = [];
  $$("#dlg input[data-cut]").forEach((el) => cuts.push({ i: +el.dataset.cut, min: parseFloat(el.value) || 0 }));
  if (cuts.length) cur.autoRule.cuts = cuts;
  save(cur, true); dlgClose(); refresh(); toast("保存しました");
}
function tierForScore(sc) {
  const cuts = (cur.autoRule.cuts && cur.autoRule.cuts.length) ? cur.autoRule.cuts : cur.tiers.map((_, i) => ({ i, min: cutOf(i) }));
  const sorted = cuts.slice().sort((a, b) => b.min - a.min);
  for (const c of sorted) if (sc >= c.min) return c.i;
  return cur.tiers.length - 1;
}
async function applyAuto(id) {
  const f = findImg(id); if (!f) return;
  await moveImgTo(id, tierForScore(totalScore(f.img)));
  toast("評価から Tier を決めました");
}
async function applyAutoAll() {
  const all = allImages(cur).filter((im) => totalScore(im) > 0);
  if (!all.length) { toast("評価が入っている画像がありません"); return; }
  all.forEach((im) => {
    const f = findImg(im.id);
    if (f.tier) f.tier.images = f.tier.images.filter((x) => x.id !== im.id);
    else cur.images = cur.images.filter((x) => x.id !== im.id);
  });
  all.forEach((im) => cur.tiers[tierForScore(totalScore(im))].images.push(im));
  await save(cur, true); dlgClose(); refresh(); toast(all.length + " 枚を並べ直しました");
}

/* ══════════════════════════════════════════════
   14. 比較モード（2〜4個）
   ══════════════════════════════════════════════ */
let cmpSel = [];
function compareDlg() {
  const all = allImages(cur);
  if (all.length < 2) { toast("画像が2枚以上ないと比較できません"); return; }
  cmpSel = cmpSel.filter((id) => all.some((x) => x.id === id));
  const picks = all.map((im) => `<button class="${cmpSel.includes(im.id) ? "on" : ""}" onclick="MT.cmpToggle('${im.id}')" title="${esc(im.name)}"><img src="${esc(im.src)}" alt=""></button>`).join("");
  let body = '<div class="empty" style="padding:24px">2〜4個えらんでください</div>';
  if (cmpSel.length >= 2) {
    const items = cmpSel.map((id) => findImg(id)).filter(Boolean).map((f) => f.img);
    const cols = items.map((im) => `<div class="cmpcol"><img src="${esc(im.src)}" alt=""><div class="nm">${esc(im.name || "—")}</div></div>`).join("");
    const rows = cur.axes.map((a) => `<tr><th>${esc(a.label)}</th>${items.map((im) => {
      const v = im.scores[a.key] || 0;
      return `<td><span style="color:#f6b93b">${"★".repeat(v)}</span><span style="color:var(--line)">${"★".repeat(5 - v)}</span></td>`;
    }).join("")}</tr>`).join("");
    const tot = `<tr class="tot"><td>総合評価</td>${items.map((im) => `<td>${totalScore(im).toFixed(1)}</td>`).join("")}</tr>`;
    body = `<div class="cmpgrid">${cols}</div><table class="cmptbl">${rows}${tot}</table>`;
  }
  dlgOpen(`<h2>比較モード</h2><p class="dsub">2〜4個をならべて、評価を見くらべます。</p>
    <label class="lbl">くらべる画像をえらぶ（最大4）</label>
    <div class="cmppick" style="max-height:130px;overflow:auto;margin-bottom:14px">${picks}</div>
    ${body}
    <div class="foot">
      <button class="btn" onclick="MT.closeDlg()">とじる</button>
      <button class="btn pri" ${cmpSel.length >= 2 ? "" : "disabled"} onclick="MT.cmpApply()">比較結果を Tier表へ反映</button>
    </div>`);
}
function cmpToggle(id) {
  const i = cmpSel.indexOf(id);
  if (i >= 0) cmpSel.splice(i, 1);
  else { if (cmpSel.length >= 4) { toast("4個までです"); return; } cmpSel.push(id); }
  compareDlg();
}
async function cmpApply() {
  /* 総合点の高い順に、上の Tier から順に入れ直す（比べた結果をそのまま表へ） */
  const items = cmpSel.map((id) => findImg(id)).filter(Boolean).map((f) => f.img)
    .sort((a, b) => totalScore(b) - totalScore(a));
  items.forEach((im, k) => {
    const f = findImg(im.id);
    if (f.tier) f.tier.images = f.tier.images.filter((x) => x.id !== im.id);
    else cur.images = cur.images.filter((x) => x.id !== im.id);
    const ti = cur.autoRule.on ? tierForScore(totalScore(im)) : Math.min(k, cur.tiers.length - 1);
    cur.tiers[ti].images.push(im);
  });
  await save(cur, true); dlgClose(); refresh(); toast("比較結果を反映しました");
}

/* ══════════════════════════════════════════════
   15. プレゼンモード（全画面・閲覧専用）
   ══════════════════════════════════════════════ */
function present() {
  if (!cur) return;
  $("#pTitle").textContent = cur.name;
  $("#pSub").textContent = (cur.author ? cur.author + " ・ " : "") + "更新 " + fmtDate(cur.updatedAt);
  presentZoom = 1;
  renderTable($("#pTable"), true);
  $("#pTable").style.zoom = "";
  $("#present").classList.add("on");
  document.body.style.overflow = "hidden";
}
function pClose() {
  $("#present").classList.remove("on");
  document.body.style.overflow = "";
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function pFull() {
  const el = $("#present");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("全画面にできませんでした"));
}
function pZoom() {
  presentZoom = presentZoom >= 1.5 ? 0.75 : presentZoom + 0.25;
  $("#pTable").style.zoom = presentZoom;
}

/* ══════════════════════════════════════════════
   15b. スライドプレゼン（★ 2026-08-16）
   ══════════════════════════════════════════════
   全画面プレゼン（#present）は表を1枚まるごと出すもので、
   人前で1つずつ説明していくのには向かない。
   そこで、パワーポイントのようにスライドを送る方式を別に用意した。

   決めごと
     ・スライドは canvas に描く（HTML を画像化するライブラリは入れない）。
       画面表示と PDF 書き出しで同じ描画関数を通すので、
       「画面ではきれいなのに PDF だと崩れる」が起こらない。
     ・1枚は 1920×1080（16:9）で固定。表示はそこへ縮めて収める。
     ・モードは3つ。
         tier … 1枚に1Tier（そのTierの画像を大きく並べる）
         item … 1枚に1アイテム（画像・名前・所属Tier・メモ・評価）
         all  … 表紙＋表全体（従来の見え方をスライドにしたもの）
       どのモードでも先頭に表紙を付ける。 */
const SLIDE_W = 1920, SLIDE_H = 1080;
let slides = [], slideIx = 0, slideImgs = {};

function slideDlg() {
  if (!cur) return;
  dlgOpen(`<h2>スライドで見せる</h2>
    <p class="dsub">1枚ずつ送って説明できます。PDF に保存して配ることもできます。</p>
    <div class="fld"><label class="lbl">分けかた</label>
      <div class="row" style="flex-wrap:wrap">
        <button class="chip on" data-sl="tier" onclick="MT.pickSlide(this)">Tierごと</button>
        <button class="chip" data-sl="item" onclick="MT.pickSlide(this)">1つずつ</button>
        <button class="chip" data-sl="all" onclick="MT.pickSlide(this)">表紙＋表ぜんぶ</button>
      </div>
      <p class="dsub" style="margin-top:8px" id="slHint">Tierを1つずつ、大きく見せていきます。</p>
    </div>
    <div class="foot">
      <button class="btn" onclick="MT.closeDlg()">やめる</button>
      <button class="btn pri" onclick="MT.slStart()">はじめる</button>
    </div>`);
}
const SLIDE_HINT = {
  tier: "Tierを1つずつ、大きく見せていきます。",
  item: "画像を1つずつ、名前・所属Tier・メモ・評価と一緒に見せます。",
  all: "表紙のあと、Tier表を1枚にまとめて見せます。",
};
function pickSlide(b) {
  $$("#dlg [data-sl]").forEach((x) => x.classList.remove("on"));
  b.classList.add("on");
  const h = $("#slHint"); if (h) h.textContent = SLIDE_HINT[b.dataset.sl] || "";
}

/* スライドの組み立て。描画そのものはせず「何を出すか」だけを決める */
function buildSlides(mode) {
  const t = cur, out = [];
  out.push({ kind: "cover" });
  if (mode === "tier") {
    t.tiers.forEach((tr, i) => out.push({ kind: "tier", ti: i }));
  } else if (mode === "item") {
    t.tiers.forEach((tr, i) => sortImages(tr.images).forEach((im) => out.push({ kind: "item", ti: i, im })));
    /* 未配置のぶんも最後に見せる（説明のときに抜けると気づけない） */
    (t.pool || []).forEach((im) => out.push({ kind: "item", ti: -1, im }));
  } else {
    out.push({ kind: "all" });
  }
  return out;
}

async function slStart() {
  const mode = ($("#dlg [data-sl].on") || { dataset: { sl: "tier" } }).dataset.sl;
  dlgClose();
  toast("スライドを作っています…");
  slideImgs = {};
  await Promise.all(allImages(cur).map((im) => new Promise((res) => {
    const g = new Image(); g.crossOrigin = "anonymous";
    g.onload = () => { slideImgs[im.id] = g; res(); };
    g.onerror = () => res();
    g.src = im.src;
  })));
  slides = buildSlides(mode);
  slideIx = 0;
  $("#slideOv").classList.add("on");
  document.body.style.overflow = "hidden";
  slFit(); slPaint();
}
function slClose() {
  $("#slideOv").classList.remove("on");
  document.body.style.overflow = "";
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function slFull() {
  const el = $("#slideOv");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast("全画面にできませんでした"));
}
function slPrev() { if (slideIx > 0) { slideIx--; slPaint(); } }
function slNext() { if (slideIx < slides.length - 1) { slideIx++; slPaint(); } }
/* 表示用のキャンバスは、見えている大きさに合わせて実ピクセルを取る */
function slFit() {
  const cv = $("#slCanvas"); if (!cv) return;
  const r = cv.getBoundingClientRect();
  if (r.width < 2) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.width * dpr * SLIDE_H / SLIDE_W);
}
function slPaint() {
  const cv = $("#slCanvas"); if (!cv || !slides.length) return;
  const g = cv.getContext("2d");
  g.save();
  g.scale(cv.width / SLIDE_W, cv.width / SLIDE_W);
  drawSlide(g, slides[slideIx]);
  g.restore();
  const c = $("#slCnt"); if (c) c.textContent = (slideIx + 1) + " / " + slides.length;
}

/* スライド1枚を 1920×1080 の座標系で描く。
   表示も PDF もここを通るので、見た目が食い違わない。 */
function drawSlide(g, sl) {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const bg = dark ? "#12151a" : "#ffffff";
  const ink = dark ? "#e9edf3" : "#1f2733", ink2 = dark ? "#a6b0be" : "#5b6676", line = dark ? "#2a313b" : "#e4e7ec";
  g.fillStyle = bg; g.fillRect(0, 0, SLIDE_W, SLIDE_H);
  g.textBaseline = "middle";

  /* 右下の署名は全スライド共通 */
  const sign = () => {
    g.textAlign = "right"; g.fillStyle = ink2;
    g.font = "800 26px 'Noto Sans JP',sans-serif";
    g.fillText("MagiTier", SLIDE_W - 54, SLIDE_H - 44);
  };

  if (sl.kind === "cover") {
    g.textAlign = "center"; g.fillStyle = ink;
    g.font = "900 96px 'Noto Sans JP',sans-serif";
    wrapText(g, cur.name || "Tier表", SLIDE_W / 2, SLIDE_H / 2 - 40, SLIDE_W - 240, 110, 2);
    g.font = "700 34px 'Noto Sans JP',sans-serif"; g.fillStyle = ink2;
    const sub = [cur.author || "", fmtDate(cur.updatedAt)].filter(Boolean).join("　・　");
    g.fillText(sub, SLIDE_W / 2, SLIDE_H / 2 + 110);
    g.strokeStyle = line; g.lineWidth = 3;
    g.beginPath(); g.moveTo(SLIDE_W / 2 - 160, SLIDE_H / 2 + 46); g.lineTo(SLIDE_W / 2 + 160, SLIDE_H / 2 + 46); g.stroke();
    sign(); return;
  }

  if (sl.kind === "tier") {
    const tr = cur.tiers[sl.ti]; if (!tr) return;
    /* 上に Tier の帯 */
    const bandH = 150;
    g.fillStyle = tr.bg; g.fillRect(0, 0, SLIDE_W, bandH);
    g.fillStyle = tr.tc; g.textAlign = "left";
    g.font = "900 84px 'Noto Sans JP',sans-serif";
    g.fillText(String(tr.label), 60, bandH / 2);
    if (tr.name) {
      g.font = "700 34px 'Noto Sans JP',sans-serif";
      g.fillText(String(tr.name), 60 + g.measureText(String(tr.label)).width + 200, bandH / 2 + 4);
    }
    g.textAlign = "right"; g.font = "800 30px 'Noto Sans JP',sans-serif";
    g.fillText(tr.images.length + " 件", SLIDE_W - 60, bandH / 2);

    const list = sortImages(tr.images);
    if (!list.length) {
      g.textAlign = "center"; g.fillStyle = ink2; g.font = "700 40px 'Noto Sans JP',sans-serif";
      g.fillText("（このTierにはまだ何も入っていません）", SLIDE_W / 2, SLIDE_H / 2 + 40);
      sign(); return;
    }
    /* 収まるように列数と大きさを決める */
    const top = bandH + 50, availH = SLIDE_H - top - 90, availW = SLIDE_W - 120;
    let cols = Math.ceil(Math.sqrt(list.length * availW / availH)) || 1;
    cols = Math.max(1, Math.min(cols, list.length));
    let rows = Math.ceil(list.length / cols);
    let cell = Math.min((availW - (cols - 1) * 22) / cols, (availH - (rows - 1) * 22) / rows);
    cell = Math.min(cell, 330);
    const gridW = cols * cell + (cols - 1) * 22;
    const x0 = (SLIDE_W - gridW) / 2, y0 = top + Math.max(0, (availH - (rows * cell + (rows - 1) * 22)) / 2);
    list.forEach((im, i) => {
      const cx = x0 + (i % cols) * (cell + 22), cy = y0 + Math.floor(i / cols) * (cell + 22);
      drawCard(g, im, cx, cy, cell, { line, ink, ink2 });
    });
    sign(); return;
  }

  if (sl.kind === "item") {
    const tr = sl.ti >= 0 ? cur.tiers[sl.ti] : null;
    const im = sl.im, size = 620;
    drawCard(g, im, 90, (SLIDE_H - size) / 2, size, { line, ink, ink2 }, true);
    const lx = 90 + size + 80;
    let y = 260;
    if (tr) {
      /* 所属Tierのバッジ */
      g.fillStyle = tr.bg; roundRect(g, lx, y - 46, 190, 76, 16); g.fill();
      g.fillStyle = tr.tc; g.textAlign = "center"; g.font = "900 46px 'Noto Sans JP',sans-serif";
      g.fillText(String(tr.label), lx + 95, y - 6);
      if (tr.name) {
        g.textAlign = "left"; g.fillStyle = ink2; g.font = "700 30px 'Noto Sans JP',sans-serif";
        g.fillText(String(tr.name), lx + 214, y - 6);
      }
    } else {
      g.fillStyle = ink2; g.textAlign = "left"; g.font = "800 30px 'Noto Sans JP',sans-serif";
      g.fillText("未配置", lx, y - 6);
    }
    y += 90;
    g.textAlign = "left"; g.fillStyle = ink; g.font = "900 62px 'Noto Sans JP',sans-serif";
    y = wrapText(g, im.name || "（名前なし）", lx, y, SLIDE_W - lx - 90, 74, 2);
    /* ★ 2026-08-17e 総合だけでなく<b>項目べつの星もぜんぶ</b>描く。
       説明のときに「なぜこの Tier なのか」が総合点だけでは伝わらなかった。
       画面の詳細（scoreBlockHTML）と同じ順・同じ最大値でそろえること。 */
    y += 46;
    const axes = cur.axes || [];
    const drawStars = (label, val, max) => {
      const m = max || 5, v = Math.max(0, Math.min(m, Number(val) || 0));
      g.fillStyle = ink2; g.font = "800 30px 'Noto Sans JP',sans-serif"; g.textAlign = "left";
      g.fillText(String(label), lx, y);
      let sx = lx + 260;
      for (let i = 1; i <= m; i++) {
        g.fillStyle = v >= i ? "#f0b429" : "rgba(140,140,160,.30)";
        g.font = "900 34px 'Noto Sans JP',sans-serif";
        g.fillText("★", sx, y); sx += 38;
      }
      g.fillStyle = ink; g.font = "900 30px 'Noto Sans JP',sans-serif";
      g.fillText(String(Math.round(v * 10) / 10), sx + 12, y);
      y += 48;
    };
    if (cur.rateMax === 10) {
      g.fillStyle = ink2; g.font = "800 30px 'Noto Sans JP',sans-serif";
      g.fillText("評価", lx, y);
      g.fillStyle = ink; g.font = "900 34px 'Noto Sans JP',sans-serif";
      g.fillText((im.rating || 0).toFixed(1) + " / 10", lx + 260, y);
      y += 48;
    } else if ((im.rating || 0) > 0) {
      drawStars("評価", im.rating, 5);
    }
    axes.forEach((ax) => drawStars(ax.label || ax.name || ax.key, (im.scores || {})[ax.key] || 0, 5));
    /* 総合はいちばん下にまとめて出す */
    g.fillStyle = ink2; g.font = "800 30px 'Noto Sans JP',sans-serif";
    g.fillText("総合", lx, y);
    g.fillStyle = ink; g.font = "900 40px 'Noto Sans JP',sans-serif";
    g.fillText(totalScore(im).toFixed(1) + " / 10", lx + 260, y + 4);
    y += 20;
    if (im.memo) {
      y += 62;
      g.fillStyle = ink2; g.font = "600 32px 'Noto Sans JP',sans-serif";
      wrapText(g, im.memo, lx, y, SLIDE_W - lx - 90, 44, 5);
    }
    sign(); return;
  }

  /* all: 表ぜんぶを1枚に収める */
  if (sl.kind === "all") {
    const t = cur, pad = 40, gap = 8, labelW = 190;
    const perRow = 10;
    const rows = t.tiers.map((tr) => Math.max(1, Math.ceil(tr.images.length / perRow)));
    const totalRows = rows.reduce((a, b) => a + b, 0);
    const availH = SLIDE_H - pad * 2 - 40;
    const cell = Math.min(140, (availH - totalRows * gap) / Math.max(1, totalRows));
    let y = pad + 20;
    t.tiers.forEach((tr, ti) => {
      const h = rows[ti] * (cell + gap) + gap;
      g.fillStyle = tr.bg; g.fillRect(pad, y, labelW, h);
      g.fillStyle = tr.tc; g.textAlign = "center";
      g.font = "900 " + Math.min(52, h * 0.5) + "px 'Noto Sans JP',sans-serif";
      g.fillText(String(tr.label), pad + labelW / 2, y + h / 2);
      g.fillStyle = dark ? "#1f242c" : "#fbfcfd";
      g.fillRect(pad + labelW, y, SLIDE_W - pad * 2 - labelW, h);
      g.strokeStyle = line; g.lineWidth = 1;
      g.strokeRect(pad + .5, y + .5, SLIDE_W - pad * 2 - 1, h - 1);
      sortImages(tr.images).forEach((im, i) => {
        const cx = pad + labelW + gap + (i % perRow) * (cell + gap);
        const cy = y + gap + Math.floor(i / perRow) * (cell + gap);
        drawCard(g, im, cx, cy, cell, { line, ink, ink2 });
      });
      y += h;
    });
    sign(); return;
  }
}
/* 画像1枚ぶんの角丸カード。名前・評価の帯は表の設定に合わせる */
function drawCard(g, im, x, y, size, col, big) {
  const src = slideImgs[im.id];
  g.save();
  roundRect(g, x, y, size, size, Math.max(8, size * 0.06)); g.clip();
  if (src) {
    const s = Math.max(size / src.width, size / src.height);
    g.drawImage(src, x + (size - src.width * s) / 2, y + (size - src.height * s) / 2, src.width * s, src.height * s);
  } else { g.fillStyle = col.line; g.fillRect(x, y, size, size); }
  if (!big && cur.cardName && im.name) {
    const bh = Math.max(20, size * 0.19);
    g.fillStyle = "rgba(0,0,0,.62)"; g.fillRect(x, y + size - bh, size, bh);
    g.fillStyle = "#fff"; g.textAlign = "center";
    g.font = "800 " + Math.max(11, Math.round(bh * 0.52)) + "px 'Noto Sans JP',sans-serif";
    g.fillText(clip(g, im.name, size - 10), x + size / 2, y + size - bh / 2);
  }
  g.restore();
  if (!big && cur.cardScore) {
    const w = Math.max(30, size * 0.28), h = Math.max(16, size * 0.15);
    g.fillStyle = "rgba(0,0,0,.62)"; roundRect(g, x + size - w - 5, y + 5, w, h, 5); g.fill();
    g.fillStyle = "#fff"; g.textAlign = "center";
    g.font = "800 " + Math.max(10, Math.round(h * 0.62)) + "px 'Noto Sans JP',sans-serif";
    g.fillText(totalScore(im).toFixed(1), x + size - w / 2 - 5, y + 5 + h / 2);
  }
}
/* 折り返して書く。返り値は「最後に書いた行の y」 */
function wrapText(g, text, x, y, maxW, lh, maxLines) {
  const s = String(text == null ? "" : text);
  const lines = [];
  let line = "";
  for (const ch of s) {
    if (ch === "\n") { lines.push(line); line = ""; continue; }
    if (g.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  const show = lines.slice(0, maxLines);
  if (lines.length > maxLines && show.length) show[show.length - 1] = show[show.length - 1].slice(0, -1) + "…";
  show.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return y + Math.max(0, show.length - 1) * lh;
}

/* ── スライドを PDF にする ──────────────────────
   外部ライブラリは入れず、PDF を必要な範囲だけ自前で組み立てる（QRと同じ方針）。
   各ページは 1920×1080 の JPEG を1枚貼るだけなので、
   必要なのは Catalog / Pages / Page / XObject(DCTDecode) / Contents の5種類。 */
async function slPdf() {
  if (!slides.length) return;
  toast("PDF を作っています…");
  try {
    const work = document.createElement("canvas");
    work.width = SLIDE_W; work.height = SLIDE_H;
    const g = work.getContext("2d");
    const pages = [];
    for (const sl of slides) {
      g.clearRect(0, 0, SLIDE_W, SLIDE_H);
      drawSlide(g, sl);
      const blob = await new Promise((r) => work.toBlob(r, "image/jpeg", 0.9));
      pages.push(new Uint8Array(await blob.arrayBuffer()));
    }
    const pdf = buildPdf(pages, SLIDE_W, SLIDE_H);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    a.download = (cur.name || "tier") + ".pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("PDF を保存しました");
  } catch (e) { toast("PDF を作れませんでした"); }
}
/* JPEG の配列から PDF のバイト列を組み立てる。
   ページの大きさは 16:9 を A4 横（842×595pt）に収めた寸法にする。 */
function buildPdf(jpegs, iw, ih) {
  const PW = 842, PH = Math.round(842 * ih / iw);   // 16:9 なら 474pt
  const chunks = [];
  const offsets = [];
  let len = 0;
  const put = (u8) => { chunks.push(u8); len += u8.length; };
  const putStr = (s) => {
    const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
    put(b);
  };
  const obj = (n, body) => { offsets[n] = len; putStr(n + " 0 obj\n" + body + "\nendobj\n"); };

  putStr("%PDF-1.4\n");
  const n = jpegs.length;
  /* 1=Catalog, 2=Pages, 3..=Page/Image/Contents を3つ組で */
  const pageIds = [], imgIds = [], contIds = [];
  for (let i = 0; i < n; i++) { pageIds.push(3 + i * 3); imgIds.push(4 + i * 3); contIds.push(5 + i * 3); }

  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Count " + n + " /Kids [" + pageIds.map((p) => p + " 0 R").join(" ") + "] >>");
  for (let i = 0; i < n; i++) {
    obj(pageIds[i],
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH + "] " +
      "/Resources << /XObject << /Im0 " + imgIds[i] + " 0 R >> >> " +
      "/Contents " + contIds[i] + " 0 R >>");
    /* 画像オブジェクト（JPEG をそのまま入れる＝再圧縮しない） */
    offsets[imgIds[i]] = len;
    putStr(imgIds[i] + " 0 obj\n<< /Type /XObject /Subtype /Image /Width " + iw + " /Height " + ih +
      " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + jpegs[i].length + " >>\nstream\n");
    put(jpegs[i]);
    putStr("\nendstream\nendobj\n");
    const cont = "q " + PW + " 0 0 " + PH + " 0 0 cm /Im0 Do Q";
    obj(contIds[i], "<< /Length " + cont.length + " >>\nstream\n" + cont + "\nendstream");
  }
  const xref = len;
  const total = 3 + n * 3;
  let x = "xref\n0 " + total + "\n0000000000 65535 f \n";
  for (let i = 1; i < total; i++) x += String(offsets[i] || 0).padStart(10, "0") + " 00000 n \n";
  putStr(x + "trailer\n<< /Size " + total + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");

  const out = new Uint8Array(len);
  let p = 0;
  chunks.forEach((c) => { out.set(c, p); p += c.length; });
  return out;
}

/* ══════════════════════════════════════════════
   16. Export（PNG / JPG / WebP / 透過PNG）
   ══════════════════════════════════════════════ */
const EXPORT_SIZES = [["auto","そのまま（等倍）"],["1080x1080","1080 × 1080（正方形）"],["1920x1080","1920 × 1080（フルHD）"],["1080x1920","1080 × 1920（縦・ストーリー）"],["custom","カスタム"]];
function exportDlg() {
  dlgOpen(`<h2>Export</h2><p class="dsub">SNS に投稿できる画像として書き出します。</p>
    <div class="fld"><label class="lbl">ファイル形式</label>
      <div class="row" style="flex-wrap:wrap">
        <button class="chip on" data-fmt="png" onclick="MT.pickFmt(this)">PNG</button>
        <button class="chip" data-fmt="jpg" onclick="MT.pickFmt(this)">JPG</button>
        <button class="chip" data-fmt="webp" onclick="MT.pickFmt(this)">WebP</button>
        <button class="chip" data-fmt="pngt" onclick="MT.pickFmt(this)">透過PNG</button>
      </div></div>
    <div class="fld"><label class="lbl">サイズ</label>
      <select class="inp" id="exSize" onchange="document.getElementById('exCustom').style.display=this.value==='custom'?'':'none'">
        ${EXPORT_SIZES.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}
      </select>
      <div class="grid2" id="exCustom" style="display:none;margin-top:8px">
        <input class="inp" id="exW" type="number" value="1600" placeholder="幅"><input class="inp" id="exH" type="number" value="1200" placeholder="高さ">
      </div></div>
    <div class="fld"><label class="lbl">解像度</label>
      <div class="row"><button class="chip" data-sc="1" onclick="MT.pickScale(this)">標準</button>
        <button class="chip on" data-sc="2" onclick="MT.pickScale(this)">高解像度 ×2</button>
        <button class="chip" data-sc="3" onclick="MT.pickScale(this)">超高解像度 ×3</button></div></div>
    <label class="lbl">表示するもの</label>
    <div class="swrow"><div style="flex:1"><b>タイトル</b></div><button class="sw on" id="exTitle" onclick="this.classList.toggle('on')"><i></i></button></div>
    <div class="swrow"><div style="flex:1"><b>Tier名（ラベルの下の名前）</b></div><button class="sw" id="exTierNm" onclick="this.classList.toggle('on')"><i></i></button></div>
    <div class="swrow"><div style="flex:1"><b>作成者名</b></div><button class="sw on" id="exAuthor" onclick="this.classList.toggle('on')"><i></i></button></div>
    <div class="swrow"><div style="flex:1"><b>更新日時</b></div><button class="sw on" id="exDate" onclick="this.classList.toggle('on')"><i></i></button></div>
    <div class="swrow"><div style="flex:1"><b>MagiTier ロゴ</b></div><button class="sw on" id="exLogo" onclick="this.classList.toggle('on')"><i></i></button></div>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">やめる</button><button class="btn pri" onclick="MT.doExport()">画像を保存</button></div>`);
}
function pickFmt(b) { $$("#dlg [data-fmt]").forEach((x) => x.classList.remove("on")); b.classList.add("on"); }
function pickScale(b) { $$("#dlg [data-sc]").forEach((x) => x.classList.remove("on")); b.classList.add("on"); }

/* Tier表を canvas に描く。CSS には頼らず、ここで1から組み立てる。 */
async function drawTable(opt) {
  const t = cur;
  const pad = 26, gap = 8, cell = 92, labelW = 132;
  const showTitle = opt.title, showAuthor = opt.author, showDate = opt.date, showLogo = opt.logo, showTierNm = opt.tierNm;
  /* 画像をぜんぶ読み込む */
  const imgs = {};
  await Promise.all(allImages(t).map((im) => new Promise((res) => {
    const g = new Image(); g.crossOrigin = "anonymous";
    g.onload = () => { imgs[im.id] = g; res(); };
    g.onerror = () => res();
    g.src = im.src;
  })));
  /* 1行の高さを決める（画像の数で折り返す） */
  const perRow = 8;
  const rows = t.tiers.map((tr) => {
    const n = Math.max(1, Math.ceil(tr.images.length / perRow));
    return Math.max(cell + gap * 2, n * (cell + gap) + gap);
  });
  const W = pad * 2 + labelW + perRow * (cell + gap) + gap;
  const headH = showTitle ? 84 : 18;
  const footH = (showAuthor || showDate || showLogo) ? 46 : 12;
  const H = headH + rows.reduce((a, b) => a + b, 0) + footH + pad;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  const bg = opt.transparent ? null : (dark ? "#12151a" : "#ffffff");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  const ink = dark ? "#e9edf3" : "#1f2733", ink2 = dark ? "#a6b0be" : "#5b6676", line = dark ? "#2a313b" : "#e4e7ec";
  g.textBaseline = "middle";
  if (showTitle) {
    g.fillStyle = ink; g.font = "900 34px 'Noto Sans JP',sans-serif"; g.textAlign = "center";
    g.fillText(t.name, W / 2, 46);
  }
  let y = headH;
  t.tiers.forEach((tr, ti) => {
    const h = rows[ti];
    /* ラベル */
    g.fillStyle = tr.bg; g.fillRect(pad, y, labelW, h);
    g.fillStyle = tr.tc; g.textAlign = "center";
    g.font = (tr.bold ? "900 " : "600 ") + Math.min(tr.fs + 6, 44) + "px 'Noto Sans JP',sans-serif";
    const ly = tr.align === "top" ? y + 30 : tr.align === "bottom" ? y + h - 30 : y + h / 2;
    g.fillText(String(tr.label), pad + labelW / 2, showTierNm ? ly - 11 : ly);
    if (showTierNm) { g.font = "700 14px 'Noto Sans JP',sans-serif"; g.fillText(String(tr.name), pad + labelW / 2, ly + 15); }
    /* セルの地 */
    if (bg) { g.fillStyle = dark ? "#1f242c" : "#fbfcfd"; g.fillRect(pad + labelW, y, W - pad * 2 - labelW, h); }
    g.strokeStyle = line; g.lineWidth = 1;
    g.strokeRect(pad + .5, y + .5, W - pad * 2 - 1, h - 1);
    /* 画像 */
    sortImages(tr.images).forEach((im, i) => {
      const cx = pad + labelW + gap + (i % perRow) * (cell + gap);
      const cy = y + gap + Math.floor(i / perRow) * (cell + gap);
      const src = imgs[im.id];
      if (src) {
        g.save();
        roundRect(g, cx, cy, cell, cell, 10); g.clip();
        const s = Math.max(cell / src.width, cell / src.height);
        g.drawImage(src, cx + (cell - src.width * s) / 2, cy + (cell - src.height * s) / 2, src.width * s, src.height * s);
        g.restore();
      } else { g.fillStyle = line; roundRect(g, cx, cy, cell, cell, 10); g.fill(); }
      if (t.cardName && im.name) {
        g.fillStyle = "rgba(0,0,0,.62)"; g.fillRect(cx, cy + cell - 20, cell, 20);
        g.fillStyle = "#fff"; g.font = "800 11px 'Noto Sans JP',sans-serif"; g.textAlign = "center";
        g.fillText(clip(g, im.name, cell - 8), cx + cell / 2, cy + cell - 10);
      }
      if (t.cardScore) {
        const sc = totalScore(im).toFixed(1);
        g.fillStyle = "rgba(0,0,0,.62)"; roundRect(g, cx + cell - 34, cy + 4, 30, 16, 5); g.fill();
        g.fillStyle = "#fff"; g.font = "800 10px 'Noto Sans JP',sans-serif"; g.textAlign = "center";
        g.fillText(sc, cx + cell - 19, cy + 12);
      }
    });
    y += h;
  });
  /* フッター */
  if (showAuthor || showDate || showLogo) {
    g.font = "700 13px 'Noto Sans JP',sans-serif"; g.fillStyle = ink2;
    const parts = [];
    if (showAuthor && (t.author || "")) parts.push(t.author);
    if (showDate) parts.push(new Date(t.updatedAt).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }));
    g.textAlign = "left"; g.fillText(parts.join("  ・  "), pad, y + 24);
    if (showLogo) { g.textAlign = "right"; g.fillStyle = ink; g.font = "900 15px 'Noto Sans JP',sans-serif"; g.fillText("MagiTier", W - pad, y + 24); }
  }
  return cv;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function clip(g, s, max) { let t = String(s); while (t.length > 1 && g.measureText(t).width > max) t = t.slice(0, -1); return t === String(s) ? t : t.slice(0, -1) + "…"; }

async function renderExportCanvas() {
  const fmt = ($("#dlg [data-fmt].on") || {}).dataset ? $("#dlg [data-fmt].on").dataset.fmt : "png";
  const scale = +($("#dlg [data-sc].on") || { dataset: { sc: 2 } }).dataset.sc;
  const size = $("#exSize").value;
  const base = await drawTable({
    title: $("#exTitle").classList.contains("on"),
    tierNm: $("#exTierNm").classList.contains("on"),
    author: $("#exAuthor").classList.contains("on"),
    date: $("#exDate").classList.contains("on"),
    logo: $("#exLogo").classList.contains("on"),
    transparent: fmt === "pngt",
  });
  let W = base.width * scale, H = base.height * scale, fit = false;
  if (size !== "auto") {
    if (size === "custom") { W = Math.max(64, +$("#exW").value || 1600); H = Math.max(64, +$("#exH").value || 1200); }
    else { const [a, b] = size.split("x").map(Number); W = a; H = b; }
    fit = true;
  }
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const g = out.getContext("2d");
  g.imageSmoothingQuality = "high";
  if (fmt !== "pngt") { g.fillStyle = document.documentElement.getAttribute("data-theme") === "dark" ? "#12151a" : "#ffffff"; g.fillRect(0, 0, W, H); }
  if (fit) {
    const s = Math.min(W / base.width, H / base.height);
    const w = base.width * s, h = base.height * s;
    g.drawImage(base, (W - w) / 2, (H - h) / 2, w, h);
  } else g.drawImage(base, 0, 0, W, H);
  return { canvas: out, fmt };
}
async function doExport() {
  toast("画像を作っています…");
  try {
    const { canvas, fmt } = await renderExportCanvas();
    const mime = fmt === "jpg" ? "image/jpeg" : fmt === "webp" ? "image/webp" : "image/png";
    const ext = fmt === "jpg" ? "jpg" : fmt === "webp" ? "webp" : "png";
    const url = canvas.toDataURL(mime, 0.92);
    const a = document.createElement("a");
    a.href = url; a.download = (cur.name || "tier").replace(/[\\/:*?"<>|]/g, "_") + "." + ext;
    document.body.appendChild(a); a.click(); a.remove();
    dlgClose(); toast("保存しました");
  } catch (e) { toast("書き出せませんでした"); }
}

/* ══════════════════════════════════════════════
   17. 共有（画像・URL・QR・SNS・公開設定）
   ══════════════════════════════════════════════ */
function shareUrl() { return location.origin + location.pathname + "#t=" + encodeURIComponent(cur.id); }
function shareDlg() {
  dlgOpen(`<h2>共有</h2><p class="dsub">画像として送るか、URL で見てもらうかを選べます。</p>
    <div class="row" style="flex-wrap:wrap;margin-bottom:12px">
      <button class="btn" onclick="MT.shareImage()">画像を共有</button>
      <button class="btn" onclick="MT.copyUrl()">URLをコピー</button>
      <button class="btn" onclick="MT.showQR()">QRコードを表示</button>
    </div>
    <div id="qrbox" class="hide"></div>
    <div class="fld" style="margin-top:10px"><label class="lbl">URL</label><input class="inp" id="shUrl" readonly value="${esc(shareUrl())}"></div>
    <!-- ★ 2026-08-16 URL・QR がだれでも開けるわけではないことを、その場で必ず伝える。
         Tier表は端末の中（IndexedDB）にあり、サーバーには送っていないので、
         リンクは「同じ端末・同じブラウザ」でしか中身を開けない。
         これを書かないと、送った相手が空の画面を見ることになる。 -->
    <div class="note warn">
      <b>URL・QRコードで見られる範囲</b>
      <p>この Tier表は<b>この端末の中だけ</b>に保存されています。URL や QR コードは
        <b>同じ端末の同じブラウザ</b>で開いたときだけ、この表を開きます。</p>
      <p>ほかの人に見せたいときは <b>「画像を共有」</b>（または Export・スライドの PDF）を使ってください。
        画像や PDF なら相手の端末でもそのまま見られます。</p>
      <p class="muted">※ 開くには XEVARION のアカウント登録も必要です（未登録だとポータルへ戻されます）。</p>
    </div>
    <label class="lbl">SNSでシェア</label>
    <div class="snsrow" style="margin-bottom:6px">
      <a class="snsbtn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(cur.name + " | MagiTier")}&url=${encodeURIComponent(shareUrl())}"><span class="sq" style="background:#111">𝕏</span>X</a>
      <a class="snsbtn" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl())}"><span class="sq" style="background:#06c755">L</span>LINE</a>
      <a class="snsbtn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}"><span class="sq" style="background:#1877f2">f</span>Facebook</a>
      <button class="snsbtn" onclick="MT.copyUrl()"><span class="sq" style="background:linear-gradient(135deg,#f09433,#dc2743,#bc1888)">◎</span>その他</button>
    </div>
    <div class="swrow" style="margin-top:10px"><div style="flex:1"><b>共有してよい印を付ける</b><p>あとで見返したときに「人に見せてよい表」だと分かるようにする目印です（この端末の中だけの設定）</p></div>
      <button class="sw ${cur.publicOn ? "on" : ""}" onclick="MT.togglePublic(this)"><i></i></button></div>
    <div class="foot"><button class="btn pri" onclick="MT.closeDlg()">とじる</button></div>`);
}
function togglePublic(b) { cur.publicOn = !cur.publicOn; b.classList.toggle("on", cur.publicOn); save(cur, true); toast(cur.publicOn ? "印を付けました" : "印を外しました"); }

/* スマホ用の操作メニュー（上のボタンが画面に収まらないため）。
   出す項目は .etop のボタンと同じもので、増やすときは両方に足す。 */
function editMenu() {
  const items = [
    ["画像を追加", "addDlg"], ["一括追加", "bulkAdd"], ["並び替え", "sortDlg"],
    ["比較", "compareDlg"], ["Export（画像）", "exportDlg"], ["共有", "shareDlg"],
    ["スライドで見せる", "slideDlg"], ["全画面プレゼン", "present"],
    ["この構成をテンプレート保存", "saveAsTpl"],
  ];
  dlgOpen(`<h2>メニュー</h2>
    <div class="menulist">
      ${items.map(([label, fn]) => `<button class="menurow" onclick="MT.closeDlg();MT.${fn}()">${label}</button>`).join("")}
    </div>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">とじる</button></div>`);
}
function copyUrl() {
  const u = shareUrl();
  if (navigator.clipboard) navigator.clipboard.writeText(u).then(() => toast("URLをコピーしました"), () => toast(u));
  else { const el = $("#shUrl"); if (el) { el.select(); document.execCommand("copy"); toast("URLをコピーしました"); } }
}
async function shareImage() {
  toast("画像を作っています…");
  try {
    const base = await drawTable({ title: true, tierNm: false, author: true, date: true, logo: true, transparent: false });
    const blob = await new Promise((r) => base.toBlob(r, "image/png"));
    const file = new File([blob], (cur.name || "tier") + ".png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: cur.name, text: cur.name + " | MagiTier" });
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = (cur.name || "tier") + ".png"; a.click(); toast("画像を保存しました");
    }
  } catch (e) { toast("共有できませんでした"); }
}
function showQR() {
  const box = $("#qrbox"); box.classList.remove("hide");
  box.innerHTML = ""; box.appendChild(qrCanvas(shareUrl(), 190));
}

/* ── 最小の QR コード（バイトモード・誤り訂正L・自動バージョン） ──
   外部ライブラリを読まずに描くために、必要な範囲だけ実装してある。 */
function qrCanvas(text, px) {
  const qr = qrEncode(text);
  const n = qr.size, q = 4, scale = Math.max(2, Math.floor(px / (n + q * 2)));
  const cv = document.createElement("canvas");
  cv.width = cv.height = (n + q * 2) * scale;
  const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = "#000";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.get(x, y)) g.fillRect((x + q) * scale, (y + q) * scale, scale, scale);
  return cv;
}
function qrEncode(str) {
  /* --- GF(256) --- */
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];
  function rsPoly(deg) { let p = [1]; for (let i = 0; i < deg; i++) { const q = [1, EXP[i]], r = new Array(p.length + 1).fill(0);
    for (let j = 0; j < p.length; j++) for (let k = 0; k < 2; k++) r[j + k] ^= mul(p[j], q[k]); p = r; } return p; }
  function rsEnc(data, deg) {
    const gen = rsPoly(deg), res = new Array(deg).fill(0);
    data.forEach((b) => { const f = b ^ res[0]; res.shift(); res.push(0);
      for (let i = 0; i < deg; i++) res[i] ^= mul(gen[i + 1], f); });
    return res;
  }
  /* --- バージョンごとの容量（誤り訂正L・バイトモード） --- */
  const CAP_L = [17,32,53,78,106,134,154,192,230,271,321,367,425,458,520,586,644,718,792,858];
  const ECC_L = [7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28];
  const BLK_L = [1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8];
  const ALIGN = [[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],
                 [6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],
                 [6,30,56,82],[6,30,58,86],[6,34,62,90]];
  const data = new TextEncoder().encode(str);
  let ver = 0;
  while (ver < CAP_L.length && data.length > CAP_L[ver]) ver++;
  if (ver >= CAP_L.length) { ver = CAP_L.length - 1; }
  const V = ver + 1, size = 17 + V * 4;
  const ecc = ECC_L[ver], blocks = BLK_L[ver];
  /* --- ビット列 --- */
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(4, 4);                                    // バイトモード
  put(data.length, V < 10 ? 8 : 16);
  data.forEach((b) => put(b, 8));
  /* 総コードワード数は表から引く（機能パターンを引いた概算では合わない） */
  const RAW = rawCodewords(V);
  const dataCw = RAW - ecc * blocks;
  put(0, Math.min(4, dataCw * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; bytes.push(b); }
  const PAD = [0xEC, 0x11];
  for (let i = 0; bytes.length < dataCw; i++) bytes.push(PAD[i % 2]);
  /* --- ブロック分割 + RS --- */
  const short = Math.floor(dataCw / blocks), extra = dataCw % blocks;
  const dblocks = [], eblocks = [];
  let p = 0;
  for (let i = 0; i < blocks; i++) {
    const len = short + (i >= blocks - extra ? 1 : 0);
    const d = bytes.slice(p, p + len); p += len;
    dblocks.push(d); eblocks.push(rsEnc(d, ecc));
  }
  const final = [];
  const maxLen = Math.max.apply(null, dblocks.map((d) => d.length));
  for (let i = 0; i < maxLen; i++) dblocks.forEach((d) => { if (i < d.length) final.push(d[i]); });
  for (let i = 0; i < ecc; i++) eblocks.forEach((e) => final.push(e[i]));
  /* --- モジュール配置 --- */
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < size && y < size) m[y][x] = v; };
  const finder = (ox, oy) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const on = (x >= 0 && x <= 6 && (y === 0 || y === 6)) || (y >= 0 && y <= 6 && (x === 0 || x === 6)) || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      set(ox + x, oy + y, on ? 1 : 0);
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  for (let i = 8; i < size - 8; i++) { const v = i % 2 === 0 ? 1 : 0; set(i, 6, v); set(6, i, v); }
  const al = ALIGN[ver];
  al.forEach((ax) => al.forEach((ay) => {
    if ((ax < 8 && ay < 8) || (ax < 8 && ay > size - 9) || (ax > size - 9 && ay < 8)) return;
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++)
      set(ax + x, ay + y, (Math.abs(x) === 2 || Math.abs(y) === 2 || (x === 0 && y === 0)) ? 1 : 0);
  }));
  set(8, size - 8, 1);                           // ダークモジュール
  /* 形式情報の場所を予約 */
  for (let i = 0; i < 9; i++) { if (m[8][i] === null) m[8][i] = 0; if (m[i][8] === null) m[i][8] = 0; }
  for (let i = 0; i < 8; i++) { if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = 0; if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = 0; }
  if (V >= 7) {
    const vb = versionBits(V);
    for (let i = 0; i < 18; i++) { const b = (vb >> i) & 1, r = Math.floor(i / 3), c = i % 3;
      m[size - 11 + c][r] = b; m[r][size - 11 + c] = b; }
  }
  /* データを右下からジグザグに詰める */
  let idx = 0, bit = 7, dir = -1;
  for (let x = size - 1; x > 0; x -= 2) {
    if (x === 6) x--;
    for (let cnt = 0; cnt < size; cnt++) {
      const y = dir < 0 ? size - 1 - cnt : cnt;
      for (let k = 0; k < 2; k++) {
        const cx = x - k;
        if (m[y][cx] !== null) continue;
        let v = 0;
        if (idx < final.length) v = (final[idx] >> bit) & 1;
        if (--bit < 0) { bit = 7; idx++; }
        /* マスク0（(x+y)%2==0 で反転） */
        m[y][cx] = ((cx + y) % 2 === 0) ? (v ^ 1) : v;
      }
    }
    dir = -dir;
  }
  /* 形式情報（EC=L, mask=0） */
  const fmtBits = formatBits(0b01, 0);
  for (let i = 0; i <= 5; i++) m[8][i] = (fmtBits >> i) & 1;
  m[8][7] = (fmtBits >> 6) & 1; m[8][8] = (fmtBits >> 7) & 1; m[7][8] = (fmtBits >> 8) & 1;
  for (let i = 9; i < 15; i++) m[14 - i][8] = (fmtBits >> i) & 1;
  for (let i = 0; i < 8; i++) m[size - 1 - i][8] = (fmtBits >> i) & 1;
  for (let i = 8; i < 15; i++) m[8][size - 15 + i] = (fmtBits >> i) & 1;
  m[size - 8][8] = 1;
  return { size, get: (x, y) => !!m[y][x] };

  function rawCodewords(v) {
    /* 全モジュール数 − 機能パターン を 8 で割った数（バージョン1〜20ぶんを表で持つ） */
    const T = [26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085];
    return T[v - 1];
  }
  function formatBits(ec, mask) {
    let d = (ec << 3) | mask, v = d << 10;
    for (let i = 4; i >= 0; i--) if (v & (1 << (i + 10))) v ^= 0x537 << i;
    return ((d << 10) | v) ^ 0x5412;
  }
  function versionBits(v) {
    let x = v << 12;
    for (let i = 5; i >= 0; i--) if (x & (1 << (i + 12))) x ^= 0x1f25 << i;
    return (v << 12) | x;
  }
}

/* ══════════════════════════════════════════════
   18. テンプレート画面
   ══════════════════════════════════════════════ */
function renderTpl() {
  $("#tplCats").innerHTML = TPL_CATS.map((c) => `<button class="chip ${tplCat === c ? "on" : ""}" onclick="MT.setTplCat('${c}')">${c}</button>`).join("");
  const list = TEMPLATES.filter((t) => tplCat === "すべて" || t.cat === tplCat);
  $("#tplGrid").innerHTML = list.map((t) => `<div class="tplcard">
    <div class="pv">${t.tiers.slice(0, 5).map((x) => `<i style="background:${x[2]}"></i>`).join("")}</div>
    <div class="bd"><b>${esc(t.nm)}</b><small>${esc(t.sub)}</small></div>
    <button class="btn sm pri" onclick="MT.newDlg('${t.key}')">使用する</button>
  </div>`).join("");
  const my = lsGet(MYTPL_KEY, []);
  $("#myTplGrid").innerHTML = my.length ? my.map((t, i) => `<div class="tplcard">
    <div class="pv">${t.tiers.slice(0, 5).map((x) => `<i style="background:${x.bg}"></i>`).join("")}</div>
    <div class="bd"><b>${esc(t.nm)}</b><small>${esc(t.tiers.map((x) => x.label).join(" / "))}</small></div>
    <button class="btn sm" onclick="MT.delMyTpl(${i})">削除</button>
    <button class="btn sm pri" onclick="MT.useMyTpl(${i})">使用する</button>
  </div>`).join("") : '<div class="empty">Tier表の編集画面から「テンプレートとして保存」できます</div>';
}
function setTplCat(c) { tplCat = c; renderTpl(); }
function saveAsTpl() {
  if (!cur) return;
  const nm = prompt("テンプレート名", cur.name + " のTier構成");
  if (!nm) return;
  const my = lsGet(MYTPL_KEY, []);
  my.unshift({ nm, tiers: cur.tiers.map((t) => ({ label: t.label, name: t.name, bg: t.bg, tc: t.tc, h: t.h, w: t.w, fs: t.fs, bold: t.bold, align: t.align })) });
  lsSet(MYTPL_KEY, my.slice(0, 20));
  toast("テンプレートとして保存しました");
}
async function useMyTpl(i) {
  const my = lsGet(MYTPL_KEY, [])[i]; if (!my) return;
  const t = normalize({ id: uid("t"), name: my.nm, images: [],
    tiers: my.tiers.map((x) => Object.assign({ id: uid("tr"), images: [], criteria: "" }, x)) });
  tables.push(t); await save(t, true); openTable(t.id);
}
function delMyTpl(i) { const my = lsGet(MYTPL_KEY, []); my.splice(i, 1); lsSet(MYTPL_KEY, my); renderTpl(); }

/* ══════════════════════════════════════════════
   19. マイページ・設定
   ══════════════════════════════════════════════ */
function renderMe() {
  const a = (window.XEVA && XEVA.account.get()) || {};
  $("#meName").textContent = a.name || "ゲスト";
  const f = a.charFile ? String(a.charFile).replace(/^\.\.\//, "../") : "../thumbs/MagiTier.jpg";
  ["#meAvatar", "#meAvatar2"].forEach((s) => { const e = $(s); if (e) e.src = f; });
  const th = document.documentElement.getAttribute("data-theme");
  $("#thLight").classList.toggle("on", th !== "dark");
  $("#thDark").classList.toggle("on", th === "dark");
  const mb = tables.find((t) => t.id === MB_TABLE_ID);
  $("#mbState").textContent = mb
    ? "キャラTier表：" + mb.tiers.reduce((s, x) => s + x.images.length, 0) + " 体を配置ずみ ・ 更新 " + fmtDate(mb.updatedAt)
    : "キャラTier表はまだ作られていません。";
}
function setTheme(v) {
  document.documentElement.setAttribute("data-theme", v);
  try { localStorage.setItem(THEME_KEY, v); } catch (e) {}
  renderMe();
}
function toggleTheme() { setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); }
function backup() {
  const blob = new Blob([JSON.stringify({ app: "MagiTier", ver: 2, at: Date.now(), tables }, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "MagiTier-backup-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
  toast("バックアップを保存しました");
}
function exportJson() {
  if (!cur) { toast("Tier表をひらいてから使ってください"); return; }
  const blob = new Blob([JSON.stringify(cur, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = (cur.name || "tier") + ".json"; a.click();
}
function restore() { $("#jsonIn").click(); }
async function onJson(file) {
  try {
    const txt = await file.text();
    const d = JSON.parse(txt);
    const list = Array.isArray(d) ? d : (d.tables || [d]);
    let n = 0;
    for (const raw of list) {
      if (!raw || !raw.tiers) continue;
      const t = normalize(raw);
      if (tables.some((x) => x.id === t.id)) t.id = uid("t");
      tables.push(t); await save(t, true); n++;
    }
    toast(n + " 件を復元しました"); renderHomeSoft();
  } catch (e) { toast("読み込めませんでした"); }
}
function help() {
  dlgOpen(`<h2>MagiTier のつかいかた</h2>
    <p class="dsub">画像をならべるだけで、きれいな Tier表ができます。</p>
    <button class="pickrow"><span class="pi">1</span><span><b>Tier表をつくる</b><small>テンプレートをえらぶと S〜D の段がすぐ用意されます</small></span></button>
    <button class="pickrow"><span class="pi">2</span><span><b>画像を追加する</b><small>写真・カメラ・ファイル・URL から。PC はドラッグ＆ドロップでも入ります</small></span></button>
    <button class="pickrow"><span class="pi">3</span><span><b>ならべる</b><small>PCはドラッグ、スマホは画像をタップして移動先の Tier をえらびます（長押しドラッグも可）</small></span></button>
    <button class="pickrow"><span class="pi">4</span><span><b>見せる・配る</b><small>プレゼンモードで全画面表示、Export で SNS 用の画像を保存できます</small></span></button>
    <div class="foot"><button class="btn pri" onclick="MT.closeDlg()">とじる</button></div>`);
}

/* ══════════════════════════════════════════════
   20. MagiBurst キャラTier表
   ══════════════════════════════════════════════
   ・編集は<b>アクセスコードを知っている人だけ</b>。閲覧は MagiBurst 側から誰でも。
   ・プールには<b>全キャラ</b>を並べておく（キャラが増えたら自動で足りないぶんだけ入る）。
   ・公開すると Firebase の magitier/mbtier に「キャラidの並び」だけを書く。
     画像そのものは送らない（MagiBurst 側が自分のキャラ絵で描くので要らない）。 */
function mbCodeOK() { return mbUnlocked || lsGet(MB_CODE_KEY, "") === MB_ACCESS_CODE; }
/* ★ 2026-08-16 起動時に必ず1枚だけ用意しておく（常時表示のため）。
   ここではキャラ絵のプールは作らない。プールを作るには mb-core.js（大きい）が要り、
   毎回の起動で読むと重いので、実際に開いたとき（buildMbTable）に足す。 */
async function ensureMbTable() {
  if (tables.some((x) => x.id === MB_TABLE_ID)) return;
  const t = normalize({
    id: MB_TABLE_ID, name: "MagiBurst キャラTier表", images: [],
    tiers: mkTiers([["SS","最強","#be123c"],["S","トップ",C.s],["A","強い",C.a],["B","ふつう",C.b],["C","趣味枠",C.c],["D","これから",C.d]]),
  });
  t.cardName = true; t.author = "MagiBurst 運営";
  tables.push(t);
  await save(t, true);
}
/* ★ 2026-08-16b 開くときに「閲覧」か「編集」かを先に選ばせる。
   これまではいきなりアクセスコードを聞いていたので、
   ただ見たいだけの人が入口で止まっていた（閲覧にコードは要らない）。 */
function openMbTier() {
  dlgOpen(`<h2>MagiBurst キャラTier表</h2>
    <p class="dsub">どちらで開きますか？</p>
    <div class="menulist">
      <button class="menurow" onclick="MT.closeDlg();MT.openMbViewer()">
        👀 <b>閲覧する</b><br><small class="muted">公開されている表とキャラの評価を読みます（コードは要りません）</small></button>
      <button class="menurow" onclick="MT.closeDlg();MT.openMbEdit()">
        ✎ <b>編集する</b><br><small class="muted">表を並べ替えます。<b>アクセスコード</b>が必要です</small></button>
    </div>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">やめる</button></div>`);
}
/* 編集：コードを持っていなければここで聞く */
function openMbEdit() {
  if (!mbCodeOK()) { mbCodeDlg(); return; }
  mbUnlocked = true;
  buildMbTable();
}
function mbCodeDlg() {
  dlgOpen(`<h2>アクセスコードが必要です</h2>
    <p class="dsub">MagiBurst のキャラTier表を<b>編集</b>するには、アクセスコードが要ります。<br>
      （閲覧は MagiBurst の「キャラTier表」ボタンから、だれでもできます）</p>
    <div class="fld"><label class="lbl">アクセスコード</label><input class="inp" id="mbCode" placeholder="コードを入力"></div>
    <div class="foot"><button class="btn" onclick="MT.closeDlg()">やめる</button><button class="btn pri" onclick="MT.mbCheck()">かくにん</button></div>`);
  setTimeout(() => { const e = $("#mbCode"); if (e) e.focus(); }, 60);
}
function mbCheck() {
  const v = ($("#mbCode").value || "").trim();
  if (v !== MB_ACCESS_CODE) { toast("コードがちがいます"); return; }
  mbUnlocked = true; lsSet(MB_CODE_KEY, v); dlgClose(); buildMbTable();
}
/* mb-core.js を必要になったときだけ読む（766KB あるので、いつも読むと重い） */
/* ★ mb-core.js は const で CHARS / CHAR_IDS を宣言している。
   トップレベルの const は<b>window のプロパティにならない</b>ので、
   window.CHARS ではなく「素の名前」で受け取ること（ここで一度つまずいた）。 */
function mbChars()   { return (typeof CHARS !== "undefined") ? CHARS : null; }
function mbCharIds() { return (typeof CHAR_IDS !== "undefined") ? CHAR_IDS : null; }
function loadMbCore() {
  return new Promise((res, rej) => {
    if (mbChars() && mbCharIds()) return res();
    const s = document.createElement("script");
    /* ★ 2026-08-17e mb-core.js は MagiBurst の本体ページにある小道具を当てにしている。
       clamp が無いと statsOf() が例外で落ち、キャラの性能欄だけが黙って消える
       （try/catch の中なので画面はふつうに出るぶん、気づきにくい）。
       読みこむ前に同じ働きのものを用意しておく。 */
    if (typeof window.clamp !== "function") window.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    if (typeof window.fmt !== "function") window.fmt = (n) => (Number(n) || 0).toLocaleString("ja-JP");
    s.src = "../MagiBurst/js/mb-core.js?v=35";
    s.onload = () => res(); s.onerror = () => rej(new Error("mb-core"));
    document.head.appendChild(s);
  });
}
/* ══ ★ 2026-08-17f MagiBurst 表の中身をそろえ直す ══
   ------------------------------------------------------------
   この表は<b>1体のキャラにつき画像は1枚だけ</b>に保つ。
   ・キャラでない画像（手で足した t_ ファイルなど）は、
     <b>ファイル名からキャラを言い当てて mb:◯◯ に付け替える</b>。
     ただ捨てると、その絵を Tier に置いた作業まで消えてしまうため。
   ・同じキャラが2枚以上あるときは<b>Tier に置いてあるほう</b>を残す
     （プールの1枚が残って「表にいるのにプールにも居る」になっていた）。
   ・いなくなったキャラは外す。
   ★ 以前は buildMbTable の中だけで掃除していたので、
     表を直接ひらいた（アクセスコードを通っていない）ときは掃除されず、
     t_ の画像がそのまま残っていた。<b>開くたびに通す</b>ようにした。 */
function mbNormalizeTable(t) {
  const CH = mbChars() || {};
  const ids = mbCharIds() || Object.keys(CH);
  const alive = {}; ids.forEach((id) => { alive["mb:" + id] = 1; });
  /* ファイル名 → キャラid の逆引き（"t_Grace.webp" も "Grace.webp" も拾う） */
  const byFile = {};
  ids.forEach((id) => {
    const c = CH[id]; if (!c) return;
    [c.th, c.img].filter(Boolean).forEach((f) => {
      const base = String(f).split("/").pop().replace(/\?.*$/, "").toLowerCase();
      byFile[base] = id;
      byFile[base.replace(/^t_/, "")] = id;
    });
  });
  const guessId = (im) => {
    if (alive[im.id]) return im.id;
    const cand = [im.src, im.file, im.name].filter(Boolean);
    for (const v of cand) {
      const base = String(v).split("/").pop().replace(/\?.*$/, "").toLowerCase();
      if (byFile[base]) return "mb:" + byFile[base];
      if (byFile["t_" + base]) return "mb:" + byFile["t_" + base];
    }
    /* 名前がキャラ名そのものなら、それでも拾う */
    for (const id of ids) { if (CH[id] && CH[id].nm && im.name === CH[id].nm) return "mb:" + id; }
    return null;
  };
  /* まず Tier のぶんを見る（置いてあるほうを勝たせるため） */
  const seen = {};
  const pass = (im) => {
    const nid = guessId(im);
    if (!nid) return false;                 // キャラに結びつかない絵は捨てる
    if (seen[nid]) return false;            // 2枚目以降は捨てる
    seen[nid] = 1;
    im.id = nid;
    const cid = nid.replace(/^mb:/, "");
    if (CH[cid] && CH[cid].th) im.src = CH[cid].th;
    if (CH[cid] && CH[cid].nm) im.name = CH[cid].nm;
    if (CH[cid]) im.memo = (CH[cid].el || "") + " / " + (CH[cid].type || "");
    return true;
  };
  t.tiers.forEach((tr) => { tr.images = (tr.images || []).filter(pass); });
  t.images = (t.images || []).filter(pass);
  return t;
}
async function buildMbTable() {
  toast("キャラを読み込んでいます…");
  try { await loadMbCore(); } catch (e) { toast("キャラ情報を読み込めませんでした"); return; }
  let t = tables.find((x) => x.id === MB_TABLE_ID);
  if (!t) {
    t = normalize({ id: MB_TABLE_ID, name: "MagiBurst キャラTier表", images: [],
      tiers: mkTiers([["SS","最強",  "#be123c"],["S","トップ",C.s],["A","強い",C.a],["B","ふつう",C.b],["C","趣味枠",C.c],["D","これから",C.d]]) });
    t.cardName = true; t.author = "MagiBurst 運営";
    tables.push(t);
  }
  /* 全キャラをプールに並べる（すでに表に置いてあるキャラは動かさない） */
  const placed = {};
  t.tiers.forEach((tr) => tr.images.forEach((im) => { placed[im.id] = 1; }));
  t.images.forEach((im) => { placed[im.id] = 1; });
  const CH = mbChars() || {};
  const ids = mbCharIds() || Object.keys(CH);
  let added = 0;
  ids.forEach((id) => {
    const c = CH[id]; if (!c) return;
    if (placed["mb:" + id]) return;
    t.images.push(normImg({ id: "mb:" + id, src: c.th, name: c.nm, memo: (c.el || "") + " / " + (c.type || ""), addedAt: Date.now() }));
    added++;
  });
  mbNormalizeTable(t);
  await save(t, true);
  dlgClose(); openTable(MB_TABLE_ID);
  if (added) toast(added + " 体をプールに追加しました");
}
/* ══════════════════════════════════════════════
   20b. 閲覧モード（★ 2026-08-16）
   ══════════════════════════════════════════════
   MagiBurst の「MagiTier で詳細を見る」から #view=mb で入ってくる。
   ・アクセスコードは要らない（読むだけなので）。
   ・中身は端末のIndexedDBではなく <b>公開ぶん（Firebase）</b>を出す。
     編集した人の端末以外では、手元の表は空だから。
   ・キャラをタップすると、そのキャラの評価・メモを1体ぶん出す。 */
let mvData = null;
async function openMbViewer() {
  go("mbview");
  $("#mvTable").innerHTML = '<div class="empty">読み込んでいます…</div>';
  $("#mvEmpty").classList.add("hide");
  /* キャラ絵と名前は mb-core から取る（公開ぶんには id しか入っていない） */
  try { await loadMbCore(); } catch (e) {}
  try {
    const r = await fetch(fbUrl() + "/" + MB_FB_PATH + ".json", { cache: "no-store" });
    mvData = r.ok ? await r.json() : null;
  } catch (e) { mvData = null; }
  renderMbViewer();
}
function renderMbViewer() {
  const box = $("#mvTable"), CH = mbChars() || {};
  if (!mvData || !Array.isArray(mvData.tiers) || !mvData.tiers.length) {
    box.innerHTML = ""; $("#mvEmpty").classList.remove("hide");
    $("#mvSub").textContent = "";
    return;
  }
  $("#mvEmpty").classList.add("hide");
  $("#mvTitle").textContent = mvData.nm || "キャラ Tier表";
  const at = mvData.at ? fmtDate(mvData.at) : "";
  $("#mvSub").textContent = [mvData.by || "", at ? "更新 " + at : ""].filter(Boolean).join("　・　");
  box.innerHTML = mvData.tiers.map((tr) => {
    const cells = (tr.ids || []).map((id) => {
      const c = CH[id];
      if (!c) return "";           // 消えたキャラは出さない
      return `<button class="mvc" onclick="MT.mvChar('${esc(id)}')">
        <img src="${esc(c.th)}" alt="" loading="lazy"><span>${esc(c.nm)}</span></button>`;
    }).join("");
    return `<div class="mvrow">
      <div class="mvlab" style="background:${esc(tr.bg || "#555")};color:${esc(tr.tc || "#fff")}">
        <b>${esc(tr.label || "")}</b>${tr.name ? `<small>${esc(tr.name)}</small>` : ""}</div>
      <div class="mvcell">${cells || '<span class="muted">まだ入っていません</span>'}</div>
    </div>`;
  }).join("");
}
/* キャラ1体の詳細。公開ぶんには評価が入っていないので、
   手元にその表があるとき（＝編集した端末）だけ評価とメモも出す。 */
function mvChar(id) {
  const CH = mbChars() || {};
  const c = CH[id]; if (!c) return;
  /* この子が入っている Tier を、公開ぶんから探す */
  let inTier = null;
  /* ★ 2026-08-17e 公開ぶんがまだ無い（Firebase 未反映など）ときも、
     キャラの性能だけは見られるようにする。ここで落ちると詳細が丸ごと開かない。 */
  ((mvData && mvData.tiers) || []).forEach((tr) => { if ((tr.ids || []).indexOf(id) >= 0) inTier = tr; });
  /* 手元に表があれば、その子のメモ・評価も添える */
  const local = tables.find((x) => x.id === MB_TABLE_ID);
  let im = null;
  if (local) {
    const all = local.tiers.reduce((a, tr) => a.concat(tr.images), []).concat(local.images);
    im = all.find((x) => x.id === "mb:" + id) || null;
  }
  /* el は "wood" のようなキーなので、mb-core の ELEM から日本語名にする。
     shot は反射／貫通、type は「バランス型」などの役割名。 */
  const EL = (typeof ELEM !== "undefined") ? ELEM : null;
  const elNm = (EL && EL[c.el] && EL[c.el].nm) || c.el || "";
  const shotNm = c.shot ? (c.shot === "pierce" ? "貫通" : "反射") : "";
  const rows = [];
  if (inTier) rows.push(["評価（Tier）", (inTier.label || "") + (inTier.name ? "　" + inTier.name : "")]);
  if (elNm) rows.push(["属性", elNm]);
  if (shotNm) rows.push(["撃種", shotNm]);
  if (c.type) rows.push(["タイプ", c.type]);
  /* メモが属性・タイプの写しでしかないときは出さない（同じことが2回並ぶだけなので） */
  const memoIsDup = im && im.memo && im.memo.replace(/\s/g, "") === ((c.el || "") + "/" + (c.type || "")).replace(/\s/g, "");
  if (im && im.memo && !memoIsDup) rows.push(["メモ", im.memo]);
  /* ★ 2026-08-17e ゲームの実際の性能も出す。
     mb-core.js を読みこんであるので、最大Lv・最大限界突破のステータスと
     アビリティ・フルバースト・リンクを、ゲーム内と同じ関数から取れる。
     ★ 手で写さないこと。写すと必ずゲーム側と食いちがう。 */
  try {
    if (typeof statsOf === "function" && typeof MAX_LV !== "undefined") {
      const st = statsOf(id, (typeof MAX_LV_TRANS !== "undefined" ? MAX_LV_TRANS : MAX_LV), MAX_AWK);
      if (st) {
        rows.push(["HP（最大）", fmtN(st.hp)]);
        rows.push(["こうげき（最大）", fmtN(st.atk)]);
        rows.push(["スピード", (typeof spdKmh === "function") ? spdKmh(st.spd) : fmtN(st.spd)]);
      }
    }
    if (c.ssName) rows.push(["フルバースト", c.ssName + "（" + c.ssTurns + "ターン）"]);
    if (c.fsName) rows.push(["リンクスキル", c.fsName]);
    if (c.subfs && typeof SUBFS !== "undefined" && SUBFS[c.subfs]) rows.push(["サブリンク", SUBFS[c.subfs].nm]);
    if ((c.abil || []).length && typeof abilName === "function") {
      rows.push(["アビリティ", c.abil.map((a) => abilName(a)).join("・")]);
    }
    if (c.connect && typeof CONNECT !== "undefined" && CONNECT[c.connect]) {
      const cx = CONNECT[c.connect];
      rows.push(["クロススキル", cx.nm + "：" + (cx.skills || []).map((k) => k.nm).join("・")]);
    }
  } catch (e) { /* mb-core が読めていないときは性能欄を出さないだけにする */ }
  if (im && local && local.axes && local.axes.length) {
    local.axes.forEach((ax) => {
      const v = (im.scores || {})[ax.key];
      if (v != null) rows.push([ax.name || ax.key, String(v)]);
    });
  }
  $("#mvDlg").innerHTML = `
    <div class="mvhead">
      <img src="${esc(c.th)}" alt="">
      <div style="flex:1;min-width:0"><h2 style="margin:0">${esc(c.nm)}</h2>
        <div class="muted">${esc([elNm, shotNm, c.type].filter(Boolean).join(" / "))}</div></div>
    </div>
    <div class="mvrows">
      ${rows.map(([k, v]) => `<div class="mvkv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}
    </div>
    ${scoreBlockHTML(im, local)}
    ${!im ? '<p class="muted" style="margin-top:10px">※ 評価・メモは、この表を作った端末でだけ表示されます。</p>' : ""}
    <div class="foot"><button class="btn pri" onclick="MT.mvCloseChar()">とじる</button></div>`;
  $("#mvOv").classList.add("on");
}
function mvCloseChar() { $("#mvOv").classList.remove("on"); }

/* Firebase へ公開（キャラidの並びだけ） */
async function mbPublish() {
  const t = tables.find((x) => x.id === MB_TABLE_ID);
  if (!t) { toast("先にキャラTier表をつくってください"); return; }
  if (!mbCodeOK()) { mbCodeDlg(); return; }
  const payload = {
    nm: t.name,
    at: Date.now(),
    by: ((window.XEVA && XEVA.account.get()) || {}).name || "",
    tiers: t.tiers.map((tr) => ({ label: tr.label, name: tr.name, bg: tr.bg, tc: tr.tc,
      ids: tr.images.map((im) => String(im.id).replace(/^mb:/, "")) })),
  };
  try {
    const r = await fetch(fbUrl() + "/" + MB_FB_PATH + ".json", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (r.status === 401 || r.status === 403) throw new Error("denied");
    if (!r.ok) throw new Error("http " + r.status);
    /* ★ 2026-08-17f いつ公開したかを控える。
       これで「直したけれど、まだ公開していない」を出し分けられる。 */
    t.publishedAt = Date.now();
    await save(t, true);
    toast("公開しました。MagiBurst と他の端末から見られます");
    syncSaveBtn(); renderMe();
  } catch (e) {
    /* ★ 2026-08-16b 「権限がない」と「通信できない」を分けて出す。
       まとめて「通信」と言っていたので、Firebase のルールを配っていないだけなのに
       電波のせいだと思って何度も押す、ということが起きていた。 */
    if (String(e.message) === "denied") {
      alert([
        "公開できませんでした（アクセス権がありません）。",
        "",
        "Firebase Realtime Database の「ルール」に magitier の項目が要ります。",
        "リポジトリの firebase-rules/xevarion-account.rules.json にある magitier のブロックを、",
        "Firebase コンソールのルールに貼り付けて「公開」してください。",
      ].join("\n"));
    } else toast("公開できませんでした（通信）");
  }
}

/* ══════════════════════════════════════════════
   21. 起動
   ══════════════════════════════════════════════ */
function bindGlobal() {
  $("#fileIn").onchange = (e) => { onFiles(e.target.files); e.target.value = ""; };
  $("#camIn").onchange = (e) => { onFiles(e.target.files); e.target.value = ""; };
  $("#jsonIn").onchange = (e) => { const f = e.target.files[0]; if (f) onJson(f); e.target.value = ""; };
  /* PC：画面へのドラッグ＆ドロップで追加 */
  ["dragover", "drop"].forEach((ev) => document.addEventListener(ev, (e) => {
    if (!e.dataTransfer || !e.dataTransfer.types || e.dataTransfer.types.indexOf("Files") < 0) return;
    e.preventDefault();
    if (ev === "drop" && screen === "edit") { addTargetTier = null; onFiles(e.dataTransfer.files); }
  }));
  /* Esc でダイアログ・プレゼンを閉じる */
  document.addEventListener("keydown", (e) => {
    /* スライド表示中は矢印・スペースで送る（人前で操作するときはキーが速い） */
    if ($("#slideOv").classList.contains("on")) {
      if (e.key === "Escape") { slClose(); return; }
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); slNext(); return; }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); slPrev(); return; }
      return;
    }
    if (e.key === "Escape") { if ($("#present").classList.contains("on")) pClose(); else dlgClose(); }
  });
  /* スライドは画面幅で実ピクセル数が変わるので、そのたび描き直す */
  window.addEventListener("resize", () => { if ($("#slideOv").classList.contains("on")) { slFit(); slPaint(); } });
  window.addEventListener("resize", () => { if (screen === "edit") renderEditor(); });
}
/* 起動。スプラッシュは ../xeva-splash.js（全アプリ共通）が描く。
   読み込みが終わるまで XevaSplash.wait で保持してもらうので、
   ここでバーを自前で動かす必要はない。 */
async function boot() {
  const ready = (async () => {
    await openIDB();
    const raw = await idbAll();
    tables = raw.map(normalize);
    try { await ensureMbTable(); } catch (e) {}
    bindGlobal();
    /* ★ MagiBurst の「MagiTier で詳細を見る」から来たときは閲覧モードで開く */
    if (/#view=mb\b/.test(location.hash || "")) { openMbViewer(); return; }
    /* URL に #t=<id> が付いていたら、そのままその Tier表を開く（共有リンク） */
    const m = /#t=([^&]+)/.exec(location.hash || "");
    if (m && tables.some((t) => t.id === decodeURIComponent(m[1]))) openTable(decodeURIComponent(m[1]));
    else go("home");
  })();
  try { if (window.XevaSplash && XevaSplash.wait) XevaSplash.wait(ready); } catch (e) {}
  await ready;
}

/* ══════════════════════════════════════════════
   22. 公開する窓口
   ══════════════════════════════════════════════ */
window.MT = {
  go, open, openTable, newDlg, create, renameDlg, doRename, dup, del, search: (v) => { query = v; renderHome(screen === "mine"); },
  closeDlg: dlgClose, renameCur, saveNow,
  addTier, moveTier, tierDlg, saveTier, delTier, pickAlign,
  addDlg, pickFile, bulkAdd, urlDlg, addUrls, replaceImg, delImg, imgMenu,
  pickImg, moveImgTo, setImgField, setImgFieldOf, setScore, setScoreOf, toggleCard,
  sortDlg, setSort, setRateMax, axesDlg, addAxis, delAxis, toggleAuto, saveAxes, applyAuto, applyAutoAll,
  setPoolQuery, setPoolAttr, setCardSize, togglePool,   /* ★ 2026-08-17d プールの検索・属性・大きさ・開閉 */
  setTableSize, setSortQuick, askAnswer,                /* ★ 2026-08-17e 表内の大きさ・並び替え・確認ダイアログ */
  saveOrPublish,                                        /* ★ 2026-08-17f MB表は「公開」まで通す */
  compareDlg, cmpToggle, cmpApply,
  present, pClose, pFull, pZoom,
  slideDlg, pickSlide, slStart, slPrev, slNext, slClose, slFull, slPdf,
  editMenu,
  exportDlg, pickFmt, pickScale, doExport,
  shareDlg, copyUrl, shareImage, showQR, togglePublic,
  setTplCat, saveAsTpl, useMyTpl, delMyTpl,
  setTheme, toggleTheme, backup, restore, exportJson, help,
  openMbTier, openMbEdit, mbCodeDlg, mbCheck, mbPublish,
  openMbViewer, mvChar, mvCloseChar,
};
boot();
})();

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
/* ★★ 2026-08-22b 日付だけの表記（時刻を出さない）。
   MagiBurst のキャラTier表は「いつの目安か」が分かればよく、
   時刻まで出ていると更新のたびに数字が動いて落ち着かない（ご指定）。 */
function fmtDay(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
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
      <div class="mt">${n} 枚 ・ 更新 ${isMb ? fmtDay(t.updatedAt) : fmtDate(t.updatedAt)}</div>
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
/* ★ 2026-08-18 本文に太字などを入れたい確認ダイアログ（askYesNo は本文を esc する）。
   公開のように「押すと外へ出ていく」操作の確認に使う。 */
function askHtml(o) {
  o = o || {};
  return new Promise((resolve) => {
    _askResolve = resolve;
    dlgOpen(`<h2>${esc((o.icon ? o.icon + " " : "") + (o.title || "確認"))}</h2>
      <p class="dsub" style="line-height:1.9">${o.body || ""}</p>
      <div class="foot">
        <button class="btn" onclick="MT.askAnswer(false)">${esc(o.cancel || "やめる")}</button>
        <button class="btn dgr" onclick="MT.askAnswer(true)">${esc(o.ok || "実行する")}</button>
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
  /* ★★ 2026-08-19 MagiBurst 表は<b>押したら閲覧モード</b>で開く。
     いきなりアクセスコードを聞かれると、ただ見たいだけの人が入口で止まってしまう。
     編集は閲覧モードの中の「✎ 編集する」から（そこでコードを聞く）。 */
  if (id === MB_TABLE_ID) { openMbViewer(); return; }
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
  $("#etName").value = cur.name;
  go("edit");
  /* ★★ 2026-08-18 MagiBurst 表は、開くたびに
       ① mb-core.js を読む ② まだ表に無いキャラをプールへ足す ③ 中身をそろえ直す
     まで通す。以前は「mb-core がもう読めていたら片づけるだけ」だったので、
       ・ホームの一覧から直接ひらくと<b>プールが空</b>（mb-core を読んでいない）
       ・キャラを足しても、もう一度「編集する」を通すまでプールに出てこない
     という2つが起きていた。 */
  if (id === MB_TABLE_ID) mbRefreshPool();
}
/* まだ表に置かれていないキャラを、ぜんぶプールへならべる。戻り値は足した数。 */
function mbFillPool(t) {
  const CH = mbChars() || {};
  const ids = mbCharIds() || Object.keys(CH);
  if (!ids.length) return 0;
  const placed = {};
  t.tiers.forEach((tr) => tr.images.forEach((im) => { placed[im.id] = 1; }));
  t.images.forEach((im) => { placed[im.id] = 1; });
  let added = 0;
  ids.forEach((id, i) => {
    const c = CH[id]; if (!c) return;
    if (placed["mb:" + id]) return;
    t.images.push(normImg({ id: "mb:" + id, src: c.th, name: c.nm,
      memo: (c.el || "") + " / " + (c.type || ""), addedAt: mbAddedAt(i) }));
    added++;
  });
  return added;
}
/* ══ ★★ 2026-08-22 「プールの並び替えが効かない」の真因 ══
   ------------------------------------------------------------
   ここは同期のくり返しなので Date.now() が<b>全キャラで同じ値</b>になっていた。
   その結果「追加順」「新しい順」「評価順（まだ全員0点）」は
   どれも<b>並べても順番が1つも変わらない</b>＝押しても何も起きないように見えていた
   （名前順だけが動くので「たまに効く」というややこしい見え方になっていた）。
   ★ 直しかた: キャラの<b>登場順（CHAR_IDS の並び）</b>をそのまま addedAt にする。
     これで「追加順＝No.順」「新しい順＝新キャラが先」と、意味のある並びになる。
   ★ 基準の時刻は固定値。Date.now() を混ぜると開くたびに値が変わり、
     手で足した画像との前後関係が毎回ひっくり返る。 */
const MB_ADDED_BASE = 1704067200000;      // 2024-01-01（固定の基準。意味は「並びの原点」だけ）
function mbAddedAt(i) { return MB_ADDED_BASE + (i | 0) * 60000; }
/* ★★ 2026-08-19 「1キャラにつき1枚」を必ず守る。
   Tier に置いてあるキャラは、プールから必ず外す。
   ★ mbNormalizeTable でも同じことをしているが、
     並べかえ・読み込み・同期の直後など<b>いつ呼ばれても</b>成り立たせたいので、
     軽い1本を切り出して、変更のたびに通す。 */
function mbDedupe(t) {
  if (!t) return 0;
  const inTier = {};
  t.tiers.forEach((tr) => {
    const seen = {};
    tr.images = (tr.images || []).filter((im) => {
      if (seen[im.id]) return false;      /* 同じ Tier に2枚あったら1枚に */
      seen[im.id] = 1; inTier[im.id] = 1; return true;
    });
  });
  /* 別の Tier に同じキャラがいたら、最初の1枚だけ残す */
  const used = {};
  t.tiers.forEach((tr) => {
    tr.images = tr.images.filter((im) => (used[im.id] ? false : (used[im.id] = 1)));
  });
  const before = (t.images || []).length;
  const seenP = {};
  t.images = (t.images || []).filter((im) => {
    if (used[im.id]) return false;        /* すでに表に置いてある＝プールからは消す */
    if (seenP[im.id]) return false;
    seenP[im.id] = 1; return true;
  });
  return before - t.images.length;
}
/* MagiBurst 表のプールを最新のキャラでそろえ直す（開いたあとに非同期で走る） */
async function mbRefreshPool() {
  const t = tables.find((x) => x.id === MB_TABLE_ID);
  if (!t) return;
  try { await loadMbCore(); }
  catch (e) { toast("キャラ情報を読み込めませんでした（通信）"); return; }
  if (!mbChars()) return;
  const added = mbFillPool(t);
  mbNormalizeTable(t);
  mbDedupe(t);                 /* ★ 1キャラ1枚を守る */
  await save(t, true);
  if (screen === "edit" && cur && cur.id === MB_TABLE_ID) renderEditor();
  if (added) toast(added + " 体をプールに追加しました");
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
/* ★★ 2026-08-22 MagiBurst 表むけの並び（属性・レア度）。
   memo に "fire / バランス型" の形で入っているので、そこから属性キーを拾う。
   mb-core を読めているときは CHARS からも引く（memo より確実）。 */
const MB_EL_ORDER = ["fire", "water", "wood", "light", "dark"];
function mbElOf(im) {
  const cid = String(im.id || "").replace(/^mb:/, "");
  const CH = mbChars();
  if (CH && CH[cid] && CH[cid].el) return CH[cid].el;
  const memo = String(im.memo || "");
  return MB_EL_ORDER.find((k) => memo.includes(k)) || "";
}
function mbRareOf(im) {
  const cid = String(im.id || "").replace(/^mb:/, "");
  try { if (typeof isStar5 === "function" && mbChars() && mbChars()[cid]) return isStar5(cid) ? 1 : 0; } catch (e) {}
  return 0;
}
function sortImages(arr) {
  const m = cur.sortMode;
  if (m === "manual") return arr;
  const a = arr.slice();
  if (m === "name")  a.sort((x, y) => String(x.name).localeCompare(String(y.name), "ja"));
  if (m === "score") a.sort((x, y) => totalScore(y) - totalScore(x));
  if (m === "added") a.sort((x, y) => (x.addedAt || 0) - (y.addedAt || 0));
  if (m === "new")   a.sort((x, y) => (y.addedAt || 0) - (x.addedAt || 0));
  /* 属性順は「属性ごとにまとめて、その中は登場順」。属性の中がばらばらだと見比べられない */
  if (m === "el")    a.sort((x, y) => (MB_EL_ORDER.indexOf(mbElOf(x)) - MB_EL_ORDER.indexOf(mbElOf(y)))
                                      || ((x.addedAt || 0) - (y.addedAt || 0)));
  /* レア度順は SSR が先。同じレア度の中は新しい順（新キャラを見つけやすい） */
  if (m === "rare")  a.sort((x, y) => (mbRareOf(y) - mbRareOf(x)) || ((y.addedAt || 0) - (x.addedAt || 0)));
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
  /* ★★ 2026-08-22 MagiBurst 表は<b>表を作っている最中でも</b>ゲームのキャラ詳細を見られるようにする。
     ★ カードそのものを押すと「えらぶ」なので、そこは変えない
       （押すたびに詳細が開くと、Tier へ動かす作業ができなくなる）。
       右下の小さな ⓘ を押したときだけ詳細を開く。stopPropagation を忘れると
       「詳細が開くと同時にえらばれる」になるので必ず止める。 */
  const info = (cur.id === MB_TABLE_ID)
    ? `<button class="mbinfo" title="${esc(im.name)} のキャラ詳細を見る" aria-label="キャラ詳細"
        onclick="event.stopPropagation();MT.mbDetail('${im.id}')"
        onpointerdown="event.stopPropagation()" draggable="false">i</button>`
    : "";
  return `<div class="${cls}" draggable="true" data-img="${im.id}" data-where="${where}" data-idx="${idx}"
    onclick="MT.pickImg('${im.id}')" oncontextmenu="event.preventDefault();MT.imgMenu('${im.id}')">${body}${info}</div>`;
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
      ${/* ★★ 2026-08-26e この段の<b>すぐ下</b>に段を足す（アルファベットのずらしも選べる） */""}
      <button title="この下に段を追加" onclick="MT.insertDlg(${i},true)">＋</button>
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
/* ★★ 2026-08-22 MagiBurst キャラ表だけは並びの言い方を変え、属性・レア度も足す。
   ・「追加順」は中身としては<b>キャラの登場順（No.順）</b>なので、そう書く。
   ・「新しい順」は<b>新キャラが先</b>。実装を足したばかりの子を探すのに使う。
   ★ ここで名前を変えるだけ。並べる規則そのものは sortImages に1本化してある。 */
const MB_POOL_SORTS = [["manual", "手動"], ["added", "No.順"], ["new", "新キャラ順"],
                       ["name", "名前順"], ["el", "属性順"], ["rare", "レア度順"], ["score", "評価順"]];
function poolSorts() { return (cur && cur.id === MB_TABLE_ID) ? MB_POOL_SORTS : POOL_SORTS; }
function renderPoolSort() {
  const box = $("#poolSort"); if (!box) return;
  box.innerHTML = '<span class="pslbl">並び</span>' + poolSorts().map(([k, l]) =>
    `<button class="pschip${cur.sortMode === k ? " on" : ""}" onclick="MT.setSortQuick('${k}')">${l}</button>`).join("");
}
function setSortQuick(k) { cur.sortMode = k; save(cur, true); refresh(); toast("「" + (poolSorts().find(x => x[0] === k) || [, k])[1] + "」に並べ替えました"); }
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
    ${/* ★★ 2026-08-22 MagiBurst 表では、えらんだキャラの詳細をここからも開ける。
          カードの ⓘ は小さいので、指では押しにくいことがある。 */""}
    ${cur.id === MB_TABLE_ID
      ? `<button class="btn sm wide" style="margin:9px 0 4px" onclick="MT.mbDetail('${im.id}')">🔍 ゲームのキャラ詳細を見る</button>`
      : ""}
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

/* ══════════════════════════════════════════════
   ★★ 2026-08-26e Tier の<b>間</b>に段を足す（ご指定）
   ------------------------------------------------------------
   これまで「＋ Tierを追加」はいちばん下に足すことしかできず、
   S と A のあいだに1段ほしいときは、足してから ↑ で何度も動かす必要があった。

   ・`insertDlg(i, below)` … どこに入れるかを見せて確認する
   ・<b>ラベルを1つずつずらす</b>かを選べる（ご指定）
       例）S / A / B / C の A と B のあいだに入れて「ずらす」と
           S / A / <b>B（新）</b> / C / D になる
   ★ ずらすのは<b>ラベルが1文字のアルファベット（A〜Z）の段だけ</b>。
     「S+」「Tier 1」のような自由なラベルは触らない（勝手に壊さない）。
     Z の次は無いのでそのまま残す。
   ★ 何がどう変わるかは<b>ダイアログの中で先に見せる</b>（押してから驚かない）。
   ══════════════════════════════════════════════ */
/* 1文字のアルファベットか */
function isAlphaLabel(s) { return /^[A-Za-z]$/.test(String(s || "")); }
/* 次の文字（Z / z はそのまま） */
function nextAlpha(s) {
  const c = String(s);
  if (c === "Z" || c === "z") return c;
  return String.fromCharCode(c.charCodeAt(0) + 1);
}
/* 2色の中間（新しい段の色は、上下の段の中間にすると表のグラデーションが崩れない） */
function mixColor(a, b) {
  const p = (x) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(x || "").trim()); return m ? parseInt(m[1], 16) : null; };
  const A = p(a), B = p(b);
  if (A == null) return b || C.gray;
  if (B == null) return a;
  const mid = (sh) => Math.round((((A >> sh) & 255) + ((B >> sh) & 255)) / 2);
  const h = (v) => ("0" + v.toString(16)).slice(-2);
  return "#" + h(mid(16)) + h(mid(8)) + h(mid(0));
}
/* 挿入したときのラベルの並びを先に作る（プレビューにも本番にも同じものを使う）。
   at ＝ 新しい段が入る位置（0〜tiers.length）。 */
function insertLabelPlan(at, shift) {
  const out = { newLabel: "", moves: [] };     // moves: {i, from, to}
  const t = cur.tiers;
  const here = t[at];                          // 押しのけられる段（末尾に足すときは undefined）
  if (shift && here && isAlphaLabel(here.label)) {
    /* 新しい段が、いまその位置にいる段のラベルを引きつぐ */
    out.newLabel = String(here.label);
    for (let i = at; i < t.length; i++) {
      const lb = t[i].label;
      if (!isAlphaLabel(lb)) break;            // 途中に自由なラベルが来たら、そこで止める
      const to = nextAlpha(lb);
      if (to === lb) break;                    // Z まで来たら打ち止め
      out.moves.push({ i, from: String(lb), to });
    }
  } else {
    /* ずらさないとき＝空いている文字をさがして付ける（かぶらないように） */
    const used = {};
    t.forEach((x) => { used[String(x.label).toUpperCase()] = 1; });
    let lb = "";
    for (let k = 0; k < 26; k++) { const ch = String.fromCharCode(65 + k); if (!used[ch]) { lb = ch; break; } }
    out.newLabel = lb || ("T" + (t.length + 1));
  }
  return out;
}
/* いま開いている挿入ダイアログの状態 */
let insAt = 0, insShift = true;
function insertDlg(i, below) {
  const at = Math.max(0, Math.min(cur.tiers.length, (i | 0) + (below ? 1 : 0)));
  insAt = at; insShift = true;
  dlgOpen('<h2>Tier のあいだに段を追加</h2><div id="insBody"></div>');
  paintInsert();
}
function toggleInsShift() { insShift = !insShift; paintInsert(); }
function paintInsert() {
  const box = $("#insBody"); if (!box) return;
  const t = cur.tiers;
  const plan = insertLabelPlan(insAt, insShift);
  const to = {};
  plan.moves.forEach((m) => { to[m.i] = m.to; });
  const chip = (lb, bg, tc, mark) =>
    `<span class="insbdg${mark ? " new" : ""}" style="background:${esc(bg)};color:${esc(tc)}">${esc(lb)}</span>`;
  /* できあがりの並びを、そのまま札で見せる */
  const rows = [];
  const bgOf = (k) => {
    const a = t[k - 1], b = t[k];
    return a && b ? mixColor(a.bg, b.bg) : (b ? b.bg : (a ? a.bg : C.gray));
  };
  const newBg = bgOf(insAt);
  for (let k = 0; k <= t.length; k++) {
    if (k === insAt) rows.push(chip(plan.newLabel || "?", newBg, inkFor(newBg), true));
    const tr = t[k];
    if (tr) rows.push(chip(to[k] != null ? to[k] : tr.label, tr.bg, tr.tc, false));
  }
  const where = insAt === 0
    ? "いちばん上"
    : insAt >= t.length
      ? "いちばん下"
      : "「" + esc(t[insAt - 1].label) + "」と「" + esc(t[insAt].label) + "」のあいだ";
  const changed = plan.moves.length
    ? plan.moves.map((m) => esc(m.from) + "→" + esc(m.to)).join("　")
    : "ありません";
  box.innerHTML = `<p class="dsub">入れる場所：<b>${where}</b></p>
    <div class="fld"><label class="lbl">どこに入れますか</label>
      <select class="inp" onchange="MT.setInsAt(this.value)">
        ${(() => {
          const o = [];
          for (let k = 0; k <= t.length; k++) {
            const lb = k === 0 ? "いちばん上"
              : k >= t.length ? "いちばん下"
              : "「" + esc(t[k - 1].label) + "」と「" + esc(t[k].label) + "」のあいだ";
            o.push(`<option value="${k}"${k === insAt ? " selected" : ""}>${lb}</option>`);
          }
          return o.join("");
        })()}
      </select></div>
    <label class="row" style="gap:8px;font-size:13px;font-weight:700;margin:2px 2px 10px">
      <input type="checkbox" ${insShift ? "checked" : ""} onchange="MT.toggleInsShift()">
      Tier のアルファベットを1つずつずらす</label>
    <p class="muted" style="margin:0 2px 8px">
      ずらすのは<b>ラベルが1文字のアルファベット（A〜Z）の段だけ</b>です。<br>
      「S+」「Tier 1」のような自由なラベルは、そのままにします（Z の次はありません）。</p>
    <div class="fld"><label class="lbl">できあがり</label>
      <div class="insrow">${rows.join('<i class="insar">›</i>')}</div>
      <div class="muted" style="margin-top:6px">ずれる段：${changed}</div></div>
    <div class="foot">
      <button class="btn" onclick="MT.closeDlg()">やめる</button>
      <button class="btn pri" onclick="MT.doInsertTier()">この場所に追加</button>
    </div>`;
}
function setInsAt(v) { insAt = Math.max(0, Math.min(cur.tiers.length, parseInt(v, 10) || 0)); paintInsert(); }
function doInsertTier() {
  const t = cur.tiers;
  const at = Math.max(0, Math.min(t.length, insAt));
  const plan = insertLabelPlan(at, insShift);
  /* 先に「ずらす」を当ててから入れる（入れてから当てると位置がずれる） */
  plan.moves.forEach((m) => { t[m.i].label = m.to; });
  const a = t[at - 1], b = t[at];
  const bg = a && b ? mixColor(a.bg, b.bg) : (b ? b.bg : (a ? a.bg : C.gray));
  t.splice(at, 0, {
    id: uid("tr"), label: plan.newLabel || "?", name: "Tier " + (at + 1),
    bg, tc: inkFor(bg), h: (b && b.h) || (a && a.h) || 80, w: (b && b.w) || (a && a.w) || 78,
    fs: (b && b.fs) || (a && a.fs) || 22, bold: true, align: "center", images: [], criteria: "",
  });
  save(cur, true); dlgClose(); refresh();
  toast(plan.moves.length ? "段を追加し、" + plan.moves.length + "段のラベルをずらしました" : "段を追加しました");
}

/* ══════════════════════════════════════════════
   ★★ 2026-08-26e 表から「未配置」へ戻す（ご指定）
   ------------------------------------------------------------
   作り直したいときに、1枚ずつドラッグして戻すのは現実的ではない。
     ・<b>全部</b>を未配置へ
     ・<b>えらんだ段だけ</b>を未配置へ（複数えらべる）
   ★ 段そのものは消さない（並びと色はそのまま残る）。中身だけを戻す。
   ★ 戻した順番は、表で並んでいた順のまま未配置のうしろに付く。
   ══════════════════════════════════════════════ */
let resetSel = {};
function resetDlg() {
  resetSel = {};
  dlgOpen('<h2>表からもどす</h2><div id="rsBody"></div>');
  paintReset();
}
function toggleResetTier(i) { resetSel[i] = !resetSel[i]; paintReset(); }
function resetPickAll(on) {
  resetSel = {};
  if (on) cur.tiers.forEach((tr, i) => { if ((tr.images || []).length) resetSel[i] = true; });
  paintReset();
}
function paintReset() {
  const box = $("#rsBody"); if (!box) return;
  const t = cur.tiers;
  const inTable = t.reduce((a, tr) => a + (tr.images || []).length, 0);
  const picked = t.reduce((a, tr, i) => a + (resetSel[i] ? (tr.images || []).length : 0), 0);
  const nSel = Object.keys(resetSel).filter((k) => resetSel[k]).length;
  box.innerHTML = `<p class="dsub">表に置いてある画像を<b>未配置</b>にもどします。段そのものは消えません。</p>
    <div class="fld"><label class="lbl">段をえらぶ（複数えらべます）</label>
      <div class="rslist">
        ${t.map((tr, i) => {
          const n = (tr.images || []).length;
          return `<button class="rsrow${resetSel[i] ? " on" : ""}${n ? "" : " empty"}"
            ${n ? `onclick="MT.toggleResetTier(${i})"` : "disabled"}>
            <span class="rsck">${resetSel[i] ? "☑" : "☐"}</span>
            <span class="bdg" style="background:${esc(tr.bg)};color:${esc(tr.tc)}">${esc(String(tr.label).slice(0, 2))}</span>
            <span class="nm">${esc(tr.name)}</span>
            <span class="rsn">${n} 枚</span></button>`;
        }).join("") || '<div class="muted">Tierがありません</div>'}
      </div>
      <div class="row" style="margin-top:8px">
        <button class="btn sm" onclick="MT.resetPickAll(true)">すべてえらぶ</button>
        <button class="btn sm" onclick="MT.resetPickAll(false)">えらび直す</button>
        <span class="sp"></span>
        <span class="muted">えらんだ段：<b>${nSel}</b>／もどる枚数：<b>${picked}</b></span>
      </div>
    </div>
    <div class="foot">
      <button class="btn" onclick="MT.closeDlg()">やめる</button>
      <button class="btn dgr" ${inTable ? "" : "disabled"} onclick="MT.resetAllToPool()">
        全部もどす（${inTable} 枚）</button>
      <button class="btn pri" ${picked ? "" : "disabled"} onclick="MT.resetPickedToPool()">
        えらんだ段をもどす（${picked} 枚）</button>
    </div>`;
}
/* 実際に戻す。idxs ＝ 戻す段の番号の配列 */
function tiersToPool(idxs) {
  let n = 0;
  idxs.forEach((i) => {
    const tr = cur.tiers[i]; if (!tr) return;
    const imgs = sortImages(tr.images);        // 表で見えていた並びのまま戻す
    n += imgs.length;
    cur.images = cur.images.concat(imgs);
    tr.images = [];
  });
  if (!n) return 0;
  save(cur, true); dlgClose(); refresh();
  return n;
}
async function resetAllToPool() {
  const inTable = cur.tiers.reduce((a, tr) => a + (tr.images || []).length, 0);
  if (!inTable) return;
  if (!await askYesNo("表を空にします",
    inTable + " 枚をすべて未配置にもどします。\n段（Tier）そのものは残ります。", "全部もどす")) { paintReset(); return; }
  const n = tiersToPool(cur.tiers.map((_, i) => i));
  toast(n + " 枚を未配置にもどしました");
}
async function resetPickedToPool() {
  const idxs = cur.tiers.map((_, i) => i).filter((i) => resetSel[i]);
  const cnt = idxs.reduce((a, i) => a + ((cur.tiers[i].images || []).length), 0);
  if (!cnt) return;
  const nms = idxs.map((i) => cur.tiers[i].label).join("・");
  if (!await askYesNo("えらんだ段をもどします",
    "「" + nms + "」の " + cnt + " 枚を未配置にもどします。", "もどす")) { paintReset(); return; }
  const n = tiersToPool(idxs);
  toast(n + " 枚を未配置にもどしました");
}
/* 1段だけ戻す（Tierの設定ダイアログから） */
async function tierToPool(i) {
  const tr = cur.tiers[i]; if (!tr) return;
  const n = (tr.images || []).length;
  if (!n) { toast("この段には画像がありません"); return; }
  if (!await askYesNo("この段をもどします",
    "「" + tr.name + "」の " + n + " 枚を未配置にもどします。\n段そのものは残ります。", "もどす")) return;
  tiersToPool([i]);
  toast(n + " 枚を未配置にもどしました");
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
    ${/* ★★ 2026-08-26e この段の上下に段を足す／この段の中身を未配置へもどす（ご指定） */""}
    <div class="fld"><label class="lbl">この段に対しての操作</label>
      <div class="row" style="flex-wrap:wrap;gap:6px">
        <button class="btn sm" onclick="MT.insertDlg(${i},false)">↑ この上に段を追加</button>
        <button class="btn sm" onclick="MT.insertDlg(${i},true)">↓ この下に段を追加</button>
        <button class="btn sm" onclick="MT.tierToPool(${i})">この段のキャラを未配置へ（${(tr.images || []).length}枚）</button>
      </div></div>
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
  if (cur.id === MB_TABLE_ID) mbDedupe(cur);   /* ★ 2026-08-19 1キャラ1枚を守る */
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
  if (cur.id === MB_TABLE_ID) mbDedupe(cur);   /* ★ 2026-08-19 1キャラ1枚を守る */
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

/* ★★ 2026-08-19 「スライドで見せる」を押したら、まず<b>編集画面</b>をひらく。
   いきなり再生が始まると、順番も見出しも直せないまま人前に出すことになる。
   ここで1枚ずつ足す・消す・入れかえる・書きかえるをやってから ▶ で再生する。 */
function slideDlg() {
  if (!cur) return;
  openDeck();
}
/* もとの「分けかた」ダイアログは、はじめて作るときの<b>下じき選び</b>として残す */
function slidePreset() {
  dlgOpen(`<h2>下じきをえらぶ</h2>
    <p class="dsub">まずこの形で1式つくります。あとから1枚ずつ直せます。</p>
    <div class="fld"><label class="lbl">分けかた</label>
      <div class="row" style="flex-wrap:wrap">
        <button class="chip on" data-sl="tier" onclick="MT.pickSlide(this)">Tierごと</button>
        <button class="chip" data-sl="item" onclick="MT.pickSlide(this)">1つずつ</button>
        <button class="chip" data-sl="list" onclick="MT.pickSlide(this)">評価とメモの一覧</button>
        <button class="chip" data-sl="all" onclick="MT.pickSlide(this)">表紙＋表ぜんぶ</button>
      </div>
      <p class="dsub" style="margin-top:8px" id="slHint">Tierを1つずつ、大きく見せていきます。</p>
    </div>
    <div class="foot">
      <button class="btn" onclick="MT.closeDlg()">やめる</button>
      <button class="btn pri" onclick="MT.deckReset()">この形でつくる</button>
    </div>`);
}
const SLIDE_HINT = {
  tier: "Tierを1つずつ、大きく見せていきます。",
  item: "画像を1つずつ、名前・所属Tier・メモ・評価と一緒に見せます。",
  list: "Tierごとに、入れた評価（★）とメモを表にして読みます。",
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
    t.tiers.forEach((tr, i) => sortImages(tr.images).forEach((im) => out.push({ kind: "item", ti: i, im: im.id })));
    /* 未配置のぶんも最後に見せる（説明のときに抜けると気づけない） */
    (t.images || []).forEach((im) => out.push({ kind: "item", ti: -1, im: im.id }));
  } else if (mode === "list") {
    /* ★ 2026-08-19 入れた評価とメモを読ませる形。
       1枚に LIST_PER 行までしか入らないので、多い Tier はページに分ける。 */
    t.tiers.forEach((tr, i) => {
      const n = Math.max(1, Math.ceil(sortImages(tr.images).length / LIST_PER));
      for (let p = 0; p < n; p++) out.push({ kind: "list", ti: i, pg: p });
    });
  } else {
    out.push({ kind: "all" });
  }
  return out;
}
const LIST_PER = 6;
/* スライドが指している画像を引く（保存できるように id で持たせている） */
function slImg(sl) {
  if (!sl || !sl.im) return null;
  if (typeof sl.im === "object") return sl.im;                 /* 昔のデータ（そのまま持っていた） */
  return allImages(cur).find((x) => x.id === sl.im) || null;
}

/* 画像をぜんぶ読みこむ（描くのは canvas なので、先に Image にしておく必要がある） */
let _slLoaded = 0;
async function slPreload() {
  const list = allImages(cur);
  if (_slLoaded === list.length && Object.keys(slideImgs).length) return;   /* もう読んである */
  await Promise.all(list.map((im) => new Promise((res) => {
    if (slideImgs[im.id]) return res();
    const g = new Image(); g.crossOrigin = "anonymous";
    g.onload = () => { slideImgs[im.id] = g; res(); };
    g.onerror = () => res();
    g.src = im.src;
  })));
  _slLoaded = list.length;
}
/* 2026-08-19 再生は編集した1式（deck）をそのまま出す。
   from を渡すと、その枚めから始める（編集画面で選んでいる枚から流したいため）。 */
async function slStart(from) {
  if (!cur) return;
  if (!deck.length) { slidePreset(); return; }
  toast("スライドを作っています…");
  await slPreload();
  slides = deck.slice();
  slideIx = Math.max(0, Math.min(slides.length - 1, from | 0));
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
    wrapText(g, sl.title || cur.name || "Tier表", SLIDE_W / 2, SLIDE_H / 2 - 40, SLIDE_W - 240, 110, 2);
    g.font = "700 34px 'Noto Sans JP',sans-serif"; g.fillStyle = ink2;
    const sub = (sl.sub != null && sl.sub !== "")
      ? sl.sub : [cur.author || "", fmtDate(cur.updatedAt)].filter(Boolean).join("　・　");
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
    /* 収まるように列数と大きさを決める。
       2026-08-19 sl.memo が立っていたら、カードの下に名前・総合・メモのぶんを空ける。 */
    const foot = sl.memo ? 132 : 0;
    const top = bandH + 50, availH = SLIDE_H - top - 90, availW = SLIDE_W - 120;
    let cols = Math.ceil(Math.sqrt(list.length * availW / Math.max(1, availH - foot))) || 1;
    cols = Math.max(1, Math.min(cols, list.length));
    let rows = Math.ceil(list.length / cols);
    let cell = Math.min((availW - (cols - 1) * 22) / cols, (availH - (rows - 1) * 22) / rows - foot);
    cell = Math.min(cell, sl.memo ? 250 : 330);
    cell = Math.max(60, cell);
    const gridW = cols * cell + (cols - 1) * 22, rowH = cell + foot + 22;
    const x0 = (SLIDE_W - gridW) / 2, y0 = top + Math.max(0, (availH - (rows * rowH - 22)) / 2);
    list.forEach((im, i) => {
      const cx = x0 + (i % cols) * (cell + 22), cy = y0 + Math.floor(i / cols) * rowH;
      drawCard(g, im, cx, cy, cell, { line, ink, ink2 });
      if (!sl.memo) return;
      /* 入れた評価とメモをカードの下に */
      let ty = cy + cell + 30;
      g.textAlign = "center"; g.fillStyle = ink; g.font = "800 26px 'Noto Sans JP',sans-serif";
      g.fillText(clip(g, im.name || "", cell), cx + cell / 2, ty);
      ty += 32;
      g.fillStyle = "#f0b429"; g.font = "900 24px 'Noto Sans JP',sans-serif";
      g.fillText(starStr(im), cx + cell / 2, ty);
      if (im.memo) {
        ty += 30;
        g.fillStyle = ink2; g.font = "600 21px 'Noto Sans JP',sans-serif";
        wrapText(g, im.memo, cx + cell / 2, ty, cell, 26, 2);
      }
    });
    sign(); return;
  }

  if (sl.kind === "item") {
    const tr = sl.ti >= 0 ? cur.tiers[sl.ti] : null;
    const im = slImg(sl), size = 620;
    if (!im) { g.textAlign = "center"; g.fillStyle = ink2; g.font = "700 40px 'Noto Sans JP',sans-serif";
      g.fillText("（この画像は消されています）", SLIDE_W / 2, SLIDE_H / 2); sign(); return; }
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

  /* 2026-08-19 text: 見出しと本文だけの1枚（まとめ・言いたいこと・区切り） */
  if (sl.kind === "text") {
    g.textAlign = "left"; g.fillStyle = ink;
    g.font = "900 76px 'Noto Sans JP',sans-serif";
    const ty = wrapText(g, sl.title || "", 120, 220, SLIDE_W - 240, 92, 2);
    g.strokeStyle = line; g.lineWidth = 4;
    g.beginPath(); g.moveTo(120, ty + 70); g.lineTo(400, ty + 70); g.stroke();
    g.fillStyle = ink2; g.font = "600 40px 'Noto Sans JP',sans-serif";
    wrapText(g, sl.body || "", 120, ty + 150, SLIDE_W - 240, 60, 9);
    sign(); return;
  }

  /* 2026-08-19 list: 入れた評価とメモを読ませる1枚 */
  if (sl.kind === "list") {
    const tr = cur.tiers[sl.ti]; if (!tr) return;
    const bandH = 118;
    g.fillStyle = tr.bg; g.fillRect(0, 0, SLIDE_W, bandH);
    g.fillStyle = tr.tc; g.textAlign = "left"; g.font = "900 64px 'Noto Sans JP',sans-serif";
    g.fillText(String(tr.label), 60, bandH / 2);
    g.font = "700 30px 'Noto Sans JP',sans-serif";
    g.fillText((tr.name ? String(tr.name) + "　" : "") + "評価とメモ",
      60 + g.measureText(String(tr.label)).width + 40, bandH / 2 + 4);
    const all = sortImages(tr.images);
    const pages = Math.max(1, Math.ceil(all.length / LIST_PER));
    const pg = Math.max(0, Math.min(pages - 1, sl.pg | 0));
    const list = all.slice(pg * LIST_PER, pg * LIST_PER + LIST_PER);
    if (pages > 1) {
      g.textAlign = "right"; g.font = "800 26px 'Noto Sans JP',sans-serif";
      g.fillText((pg + 1) + " / " + pages, SLIDE_W - 60, bandH / 2);
    }
    if (!list.length) {
      g.textAlign = "center"; g.fillStyle = ink2; g.font = "700 40px 'Noto Sans JP',sans-serif";
      g.fillText("（このTierにはまだ何も入っていません）", SLIDE_W / 2, SLIDE_H / 2 + 40);
      sign(); return;
    }
    const rowH = (SLIDE_H - bandH - 110) / LIST_PER, th = Math.min(rowH - 18, 132);
    list.forEach((im, i) => {
      const y = bandH + 34 + i * rowH;
      g.strokeStyle = line; g.lineWidth = 1;
      g.beginPath(); g.moveTo(60, y - 10); g.lineTo(SLIDE_W - 60, y - 10); g.stroke();
      drawCard(g, im, 70, y, th, { line, ink, ink2 }, true);
      const lx = 70 + th + 34;
      g.textAlign = "left"; g.fillStyle = ink; g.font = "900 38px 'Noto Sans JP',sans-serif";
      g.fillText(clip(g, im.name || "（名前なし）", 520), lx, y + 26);
      g.fillStyle = "#f0b429"; g.font = "900 30px 'Noto Sans JP',sans-serif";
      g.fillText(starStr(im), lx, y + 76);
      g.fillStyle = ink2; g.font = "800 26px 'Noto Sans JP',sans-serif";
      g.fillText("総合 " + totalScore(im).toFixed(1), lx + 250, y + 76);
      if (im.memo) {
        g.fillStyle = ink2; g.font = "600 27px 'Noto Sans JP',sans-serif";
        wrapText(g, im.memo, lx + 640, y + 26, SLIDE_W - lx - 640 - 70, 36, 3);
      }
    });
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
/* 入れた評価を星の並びにする（10段階の表では数字で出す） */
function starStr(im) {
  const v = Number(im.rating) || 0;
  if (cur && cur.rateMax === 10) return v ? v.toFixed(1) + " / 10" : "－";
  const n = Math.round(v);
  return n ? "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n)) : "－";
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


/* ══════════════════════════════════════════════════════════════
   15c. スライド編集（★★ 2026-08-19）

   これまでは「分けかた」を選ぶと、そのまま再生が始まっていた。
   人前で使うものなので、送る前に
     ・順番を入れかえる ・要らない枚を消す ・見出しを書きかえる
     ・言いたいことの1枚をはさむ ・評価とメモを出すかどうか決める
   をやりたい。そこで PowerPoint のような編集画面をあいだに入れた。

   決めごと
     ・1式（deck）は <b>cur.slides</b> に入れて保存する（同期にも乗る）。
     ・スライドは<b>データだけ</b>を持つ（描くのは drawSlide 1本）。
       ★ 画像は id で持つ。中身をコピーして持つと、
         あとで名前やメモを直しても<b>スライドだけ古いまま</b>になる。
     ・左に小さい見取り図、右に大きい下書きと設定。せまい画面では上下に積む。
   ══════════════════════════════════════════════════════════════ */
let deck = [], deckIx = 0;

/* 種類の名まえ（見取り図とメニューで使う） */
const DECK_KIND = {
  cover: "表紙", tier: "Tierを1枚", item: "1つずつ",
  list: "評価とメモの一覧", text: "文章", all: "表ぜんぶ",
};

async function openDeck() {
  if (!cur) return;
  deck = Array.isArray(cur.slides) ? cur.slides.map((s) => Object.assign({}, s)) : [];
  deck = deck.filter((s) => s && DECK_KIND[s.kind]);
  if (!deck.length) deck = buildSlides("tier");
  deckIx = 0;
  $("#deckOv").classList.add("on");
  document.body.style.overflow = "hidden";
  renderDeck();
  await slPreload();
  renderDeck();          /* 画像が来たら描き直す */
}
function deckClose() {
  $("#deckOv").classList.remove("on");
  document.body.style.overflow = "";
}
/* 1式を保存する（表そのものと同じ入れもの） */
function deckSave() {
  if (!cur) return;
  cur.slides = deck.map((s) => Object.assign({}, s));
  save(cur, true);
}
/* 下じきから作り直す */
function deckReset() {
  const mode = ($("#dlg [data-sl].on") || { dataset: { sl: "tier" } }).dataset.sl;
  dlgClose();
  deck = buildSlides(mode);
  deckIx = 0;
  deckSave(); renderDeck();
  toast(deck.length + " 枚つくりました");
}

function deckRender1(cv, sl, w) {
  const g = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr); cv.height = Math.round(w * dpr * SLIDE_H / SLIDE_W);
  g.save(); g.scale(cv.width / SLIDE_W, cv.width / SLIDE_W);
  try { drawSlide(g, sl); } catch (e) {}
  g.restore();
}
function renderDeck() {
  const box = $("#deckOv"); if (!box || !box.classList.contains("on")) return;
  deckIx = Math.max(0, Math.min(deck.length - 1, deckIx));
  const sl = deck[deckIx];

  /* ── 左：見取り図 ── */
  const strip = $("#dkStrip");
  strip.innerHTML = deck.map((s, i) => `
    <button class="dkth${i === deckIx ? " on" : ""}" onclick="MT.deckSel(${i})">
      <span class="dkn">${i + 1}</span>
      <canvas data-th="${i}"></canvas>
      <span class="dkk">${DECK_KIND[s.kind] || s.kind}</span>
    </button>`).join("") || '<div class="dkempty">スライドがありません</div>';
  /* 一気に描くと止まって見えるので、少しずつ描く */
  const ths = $$("#dkStrip canvas");
  let k = 0;
  const step = () => {
    for (let n = 0; n < 6 && k < ths.length; n++, k++) deckRender1(ths[k], deck[+ths[k].dataset.th], 168);
    if (k < ths.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  /* ── 右：大きい下書き ── */
  const big = $("#dkBig");
  if (sl) {
    const r = big.getBoundingClientRect();
    deckRender1(big, sl, Math.max(280, r.width || 640));
  }
  $("#dkPos").textContent = deck.length ? (deckIx + 1) + " / " + deck.length : "0 / 0";

  /* ── 右下：この1枚の設定 ── */
  $("#dkProp").innerHTML = sl ? propHTML(sl) : '<p class="dsub">左の＋から1枚足してください。</p>';
}
function propHTML(sl) {
  const t = cur;
  const kindSel = `<div class="fld"><label class="lbl">この1枚の種類</label>
    <select class="inp" onchange="MT.deckSet('kind',this.value)">
      ${Object.keys(DECK_KIND).map((k) => `<option value="${k}"${sl.kind === k ? " selected" : ""}>${DECK_KIND[k]}</option>`).join("")}
    </select></div>`;
  const tierSel = (label) => `<div class="fld"><label class="lbl">${label}</label>
    <select class="inp" onchange="MT.deckSet('ti',+this.value)">
      ${t.tiers.map((tr, i) => `<option value="${i}"${(sl.ti | 0) === i ? " selected" : ""}>${esc(tr.label)}${tr.name ? "　" + esc(tr.name) : ""}（${tr.images.length}件）</option>`).join("")}
    </select></div>`;
  let h = kindSel;
  if (sl.kind === "cover") {
    h += `<div class="fld"><label class="lbl">見出し</label>
      <input class="inp" value="${esc(sl.title || "")}" placeholder="${esc(t.name || "Tier表")}"
        oninput="MT.deckSet('title',this.value)"></div>
      <div class="fld"><label class="lbl">小見出し</label>
      <input class="inp" value="${esc(sl.sub || "")}" placeholder="${esc([t.author || "", fmtDate(t.updatedAt)].filter(Boolean).join("　・　"))}"
        oninput="MT.deckSet('sub',this.value)"></div>
      <p class="dsub">からっぽのときは、表の名まえと作った人が出ます。</p>`;
  } else if (sl.kind === "tier") {
    h += tierSel("どのTierを見せるか");
    h += `<div class="rowsw"><span>入れた評価とメモも出す</span>
      <button class="sw${sl.memo ? " on" : ""}" onclick="MT.deckSet('memo',!${!!sl.memo})"><i></i></button></div>
      <p class="dsub">画像の下に、名まえ・★・メモが並びます（そのぶん画像は小さくなります）。</p>`;
  } else if (sl.kind === "item") {
    const list = allImages(t);
    h += `<div class="fld"><label class="lbl">どれを見せるか</label>
      <select class="inp" onchange="MT.deckSet('im',this.value)">
        ${list.map((im) => `<option value="${esc(im.id)}"${sl.im === im.id ? " selected" : ""}>${esc(im.name || "（名前なし）")}</option>`).join("")}
      </select></div>
      <p class="dsub">名まえ・所属Tier・入れた評価（項目べつの★もぜんぶ）・メモが出ます。</p>`;
  } else if (sl.kind === "list") {
    h += tierSel("どのTierの評価とメモを読むか");
    const n = Math.max(1, Math.ceil(((t.tiers[sl.ti | 0] || { images: [] }).images.length) / LIST_PER));
    h += `<div class="fld"><label class="lbl">何ページめ（1枚に${LIST_PER}件まで）</label>
      <select class="inp" onchange="MT.deckSet('pg',+this.value)">
        ${Array.from({ length: n }, (_, i) => `<option value="${i}"${(sl.pg | 0) === i ? " selected" : ""}>${i + 1} / ${n}</option>`).join("")}
      </select></div>`;
  } else if (sl.kind === "text") {
    h += `<div class="fld"><label class="lbl">見出し</label>
      <input class="inp" value="${esc(sl.title || "")}" placeholder="たとえば：この表の見かた"
        oninput="MT.deckSet('title',this.value)"></div>
      <div class="fld"><label class="lbl">本文</label>
      <textarea class="inp ta" rows="5" placeholder="言いたいことを書きます（改行できます）"
        oninput="MT.deckSet('body',this.value)">${esc(sl.body || "")}</textarea></div>`;
  } else {
    h += `<p class="dsub">Tier表を1枚にまとめて出します。設定はありません。</p>`;
  }
  return h;
}
function deckSel(i) { deckIx = i; renderDeck(); }
function deckSet(k, v) {
  const sl = deck[deckIx]; if (!sl) return;
  sl[k] = v;
  if (k === "kind") {
    /* 種類を変えたら、その種類に要るものだけそろえる */
    if ((v === "tier" || v === "list") && sl.ti == null) sl.ti = 0;
    if (v === "item" && !sl.im) { const a = allImages(cur)[0]; sl.im = a ? a.id : ""; }
    if (v === "list") sl.pg = 0;
  }
  deckSave();
  /* 文字を打っている最中に作り直すと、入れ物から手が離れてしまう。
     ★ 中身だけ描き直して、設定の欄はそのままにする。 */
  if (k === "title" || k === "sub" || k === "body") {
    const big = $("#dkBig");
    if (big) deckRender1(big, sl, Math.max(280, big.getBoundingClientRect().width || 640));
    const th = $('#dkStrip canvas[data-th="' + deckIx + '"]');
    if (th) deckRender1(th, sl, 168);
    return;
  }
  renderDeck();
}
function deckAdd() {
  dlgOpen(`<h2>スライドを足す</h2>
    <p class="dsub">いま選んでいる<b>次</b>に入ります。</p>
    <div class="menulist">
      ${Object.keys(DECK_KIND).map((k) => `<button class="menurow" onclick="MT.deckAddKind('${k}')">${DECK_KIND[k]}</button>`).join("")}
    </div>
    <div class="foot">
      <button class="btn" onclick="MT.closeDlg()">やめる</button>
      <button class="btn" onclick="MT.closeDlg();MT.slidePreset()">下じきから作り直す</button>
    </div>`);
}
function deckAddKind(kind) {
  dlgClose();
  const sl = { kind };
  if (kind === "tier" || kind === "list") sl.ti = 0;
  if (kind === "list") sl.pg = 0;
  if (kind === "item") { const a = allImages(cur)[0]; sl.im = a ? a.id : ""; }
  if (kind === "text") { sl.title = ""; sl.body = ""; }
  deck.splice(deck.length ? deckIx + 1 : 0, 0, sl);
  if (deck.length > 1) deckIx++;
  deckSave(); renderDeck();
}
function deckDup() {
  const sl = deck[deckIx]; if (!sl) return;
  deck.splice(deckIx + 1, 0, Object.assign({}, sl));
  deckIx++;
  deckSave(); renderDeck();
}
function deckDel() {
  if (!deck.length) return;
  deck.splice(deckIx, 1);
  deckSave(); renderDeck();
  toast("1枚けしました");
}
function deckMove(d) {
  const j = deckIx + d;
  if (j < 0 || j >= deck.length) return;
  const s = deck[deckIx]; deck[deckIx] = deck[j]; deck[j] = s;
  deckIx = j;
  deckSave(); renderDeck();
}
/* 編集画面から PDF にする（再生しなくても配れるように） */
async function deckPdf() {
  if (!deck.length) return;
  await slPreload();
  slides = deck.slice();
  slPdf();
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

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-18 「公開」を、ほんとうに人に見せられるものにした

   これまでの「公開／共有してよい印」は<b>この端末の中の目印</b>でしかなく、
   URL や QR を送っても、相手の端末では<b>何も出ませんでした</b>
   （Tier表は IndexedDB＝その端末の中にしか無かったため）。
   ＝「公開したのに開けない」の正体はこれ。

   いまは「公開する」を押すと、表そのものを
   Firebase の <b>magitier/pub/&lt;表のid&gt;</b> へ送ります。
     ・リンク（#t=&lt;id&gt;）を開いた人は、手元に表が無ければ公開ぶんを読む
     ・画像は長辺 256px の JPEG に縮めてから送る（枚数が多くても届く大きさに）
     ・リンクを知っている人はだれでも見られるので、<b>送る前に必ず確かめる</b>
     ・「公開をやめる」で取り下げられる
   ══════════════════════════════════════════════════════════════ */
const PUB_FB_DIR = "magitier/pub";
const PUB_MAX_BYTES = 3 * 1024 * 1024;   /* これを超えたら公開させない（画像/PDF を案内する） */
function pubFbUrl(id) { return fbUrl() + "/" + PUB_FB_DIR + "/" + encodeURIComponent(id) + ".json"; }

/* 公開用に画像を小さくする。元の src（長辺512のデータURL）はさわらない。 */
function pubShrink(src) {
  return new Promise((res) => {
    if (!src || !/^data:/.test(src)) { res(src || ""); return; }   /* 外部URLはそのまま渡す */
    const img = new Image();
    img.onload = () => {
      try {
        const M = 256, sc = Math.min(1, M / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(img.width * sc));
        cv.height = Math.max(1, Math.round(img.height * sc));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL("image/jpeg", 0.82));
      } catch (e) { res(src); }
    };
    img.onerror = () => res(src);
    img.src = src;
  });
}
/* 表1つぶんの公開データを組み立てる（読むのに要るものだけ） */
/* ★★ 2026-08-19 <b>アプリの中にある絵は、絵そのものを送らない</b>（ユーザー指示）。
   MagiBurst のキャラや、URL で足した絵は「どこにあるか」が決まっているので、
   <b>ファイル名（またはパス）だけ</b>を送れば、読む側が同じ絵を出せる。
   Firebase に画像の中身（data URL）を積むと、
     ・1体ぶんで数十KB、100体で数MB になり、書き込みそのものが通らなくなる
     ・同じ絵をキャラの数だけ持つことになる（MagiBurst の img/ に同じ絵があるのに）
   ので、送るのは<b>端末から取りこんだ写真だけ</b>にする。 */
function isDataSrc(s) { return /^data:/i.test(String(s || "")); }
/* MagiBurst のキャラ（id が "mb:◯◯"）かどうか */
function isMbImg(im) { return /^mb:/.test(String((im && im.id) || "")); }
/* 送る形にする。file があれば読む側はそこから絵を作れる（src は空のまま） */
function pubSrcOf(im) {
  const src = String(im.src || "");
  if (isMbImg(im)) {
    /* キャラはファイル名だけ。読む側は ../img/<ファイル名> で引く */
    return { file: src.split("/").pop().replace(/\?.*$/, ""), src: "" };
  }
  if (!isDataSrc(src)) return { file: "", src };     /* すでに URL・パス。そのまま渡すだけ */
  return null;                                        /* 端末の写真。縮めて送る */
}
async function pubPayload(t) {
  const im1 = async (im) => {
    const o = pubSrcOf(im);
    return {
      id: im.id, name: im.name || "", memo: im.memo || "",
      rating: im.rating || 0,
      file: o ? o.file : "",
      src: o ? o.src : await pubShrink(im.src),
    };
  };
  const tiers = [];
  for (const tr of t.tiers) {
    const images = [];
    for (const im of tr.images) images.push(await im1(im));
    tiers.push({ label: tr.label || "", name: tr.name || "", bg: tr.bg || "#555",
      tc: tr.tc || "#fff", criteria: tr.criteria || "", images });
  }
  const pool = [];
  for (const im of t.images) pool.push(await im1(im));
  return {
    id: t.id, nm: t.name || "", at: Date.now(),
    by: ((window.XEVA && XEVA.account.get()) || {}).name || "",
    cardName: t.cardName !== false, cardMemo: !!t.cardMemo, cardScore: !!t.cardScore,
    tableSize: t.tableSize || 84,
    tiers, pool,
  };
}
/* 公開する（この表の中身をだれでも読める場所へ送る） */
async function publishTable() {
  if (!cur) return;
  if (cur.id === MB_TABLE_ID) { mbPublish(); return; }   /* MagiBurst 表は専用の窓口へ */
  const ok = await askHtml({
    icon: "🌐", title: "この Tier表を公開しますか？",
    body: "公開すると、<b>URL や QR コードを知っている人はだれでも</b>この表を見られるようになります"
      + "（XEVARION のアカウントは要りません）。<br>"
      + "送るのは<b>表の中身と画像</b>です。人に見せたくない写真やメモが入っていないか、"
      + "もう一度たしかめてください。<br><br>"
      + "公開したあとでも「<b>公開をやめる</b>」で取り下げられます。",
    ok: "公開する", cancel: "やめる",
  });
  if (!ok) return;
  toast("公開の準備をしています…");
  let body;
  try {
    const payload = await pubPayload(cur);
    body = JSON.stringify(payload);
  } catch (e) { toast("公開できませんでした（データを作れません）"); return; }
  if (body.length > PUB_MAX_BYTES) {
    alert([
      "この表は大きすぎて公開できません（" + Math.round(body.length / 1024 / 1024 * 10) / 10 + "MB）。",
      "",
      "画像の枚数を減らすか、「画像を共有」／スライドのPDFで見せてください。",
    ].join("\n"));
    return;
  }
  try {
    const r = await fetch(pubFbUrl(cur.id), {
      method: "PUT", headers: { "Content-Type": "application/json" }, body,
    });
    if (r.status === 401 || r.status === 403) throw new Error("denied");
    if (!r.ok) throw new Error("http " + r.status);
    cur.publicOn = true;
    cur.publishedAt = Date.now();
    await save(cur, true);
    toast("公開しました。URL を送れば、だれでも見られます");
    if (screen === "edit") renderEditor();
    dlgClose(); shareDlg();
  } catch (e) {
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
/* 公開をやめる（取り下げる） */
async function unpublishTable() {
  if (!cur) return;
  const ok = await askHtml({
    icon: "🔒", title: "公開をやめますか？",
    body: "いま出している URL・QR コードからは、この表が<b>見られなくなります</b>。"
      + "手元の表は消えません。",
    ok: "公開をやめる", cancel: "やめる",
  });
  if (!ok) return;
  try {
    const r = await fetch(pubFbUrl(cur.id), { method: "DELETE" });
    if (!r.ok && r.status !== 404) throw new Error("http " + r.status);
    cur.publicOn = false;
    cur.publishedAt = 0;
    await save(cur, true);
    toast("公開をやめました");
    dlgClose(); shareDlg();
  } catch (e) { toast("取り下げられませんでした（通信）"); }
}
/* 公開ぶんを読む（共有リンクから来た人むけ） */
async function fetchPublished(id) {
  try {
    const r = await fetch(pubFbUrl(id), { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    return (d && Array.isArray(d.tiers)) ? d : null;
  } catch (e) { return null; }
}
/* 公開ぶんの1枚から、実際に出す絵の場所を決める。
   file … MagiBurst のキャラ画像のファイル名（絵は XEVARION/img/ にある）
   src  … もともと URL だったもの、または端末の写真を縮めたもの */
function pubImgSrc(im) {
  if (im && im.file) return "../img/" + im.file;
  return (im && im.src) || "";
}
/* 公開ぶんを閲覧モードの画面に出す（編集はできない） */
function renderPubViewer(d) {
  go("mbview");
  const note = $(".mvnote");
  if (note) note.innerHTML = "<b>閲覧モード</b><p>この Tier表は <b>MagiTier</b> で作られ、公開されたものです。"
    + "ここからは<b>読むだけ</b>で、編集はできません。</p>";
  const back = document.querySelector("#scr-mbview .homehead .btn");
  if (back) { back.textContent = "MagiTier のホームへ"; back.setAttribute("href", "#"); back.onclick = (e) => { e.preventDefault(); location.hash = ""; go("home"); }; }
  $("#mvTitle").textContent = d.nm || "Tier表";
  $("#mvSub").textContent = [d.by || "", d.at ? "更新 " + fmtDate(d.at) : ""].filter(Boolean).join("　・　");
  $("#mvEmpty").classList.add("hide");
  $("#mvTable").innerHTML = d.tiers.map((tr) => {
    /* ★ 2026-08-19 file が入っていたら、そこから絵の場所を組み立てる
       （公開ぶんには絵そのものが入っていない＝軽い）。 */
    const cells = (tr.images || []).map((im) => `<div class="mvc" style="cursor:default">
        <img src="${esc(pubImgSrc(im))}" alt="" loading="lazy">
        ${d.cardName === false ? "" : `<span>${esc(im.name || "")}</span>`}
      </div>`).join("");
    return `<div class="mvrow">
      <div class="mvlab" style="background:${esc(tr.bg || "#555")};color:${esc(tr.tc || "#fff")}">
        <b>${esc(tr.label || "")}</b>${tr.name ? `<small>${esc(tr.name)}</small>` : ""}</div>
      <div class="mvcell">${cells || '<span class="muted">まだ入っていません</span>'}</div>
    </div>`;
  }).join("");
}
function shareDlg() {
  dlgOpen(`<h2>共有</h2><p class="dsub">画像として送るか、URL で見てもらうかを選べます。</p>
    <div class="row" style="flex-wrap:wrap;margin-bottom:12px">
      <button class="btn" onclick="MT.shareImage()">画像を共有</button>
      <button class="btn" onclick="MT.copyUrl()">URLをコピー</button>
      <button class="btn" onclick="MT.showQR()">QRコードを表示</button>
    </div>
    <div id="qrbox" class="hide"></div>
    <div class="fld" style="margin-top:10px"><label class="lbl">URL</label><input class="inp" id="shUrl" readonly value="${esc(shareUrl())}"></div>
    <!-- ★★ 2026-08-18 「公開しているかどうか」で、URL の届く範囲が変わる。
         公開していない表はこれまでどおり<b>この端末の中だけ</b>にあるので、
         リンクを送っても相手の画面は空になる（＝「公開したのに開けない」の原因）。
         公開すると Firebase へ表そのものを送るので、だれの端末でも開ける。 -->
    ${cur.publishedAt
      ? `<div class="note">
          <b>🌐 公開中です（${esc(fmtDate(cur.publishedAt))} に公開）</b>
          <p>上の URL・QR コードは、<b>どの端末からでも</b>この表を開けます。
            表を直したら、もう一度<b>「公開する」</b>を押して送り直してください。</p>
        </div>
        <div class="row" style="flex-wrap:wrap;margin-bottom:10px">
          <button class="btn pri" onclick="MT.publishTable()">🌐 公開しなおす（最新にする）</button>
          <button class="btn" onclick="MT.unpublishTable()">🔒 公開をやめる</button>
        </div>`
      : `<div class="note warn">
          <b>いまは「この端末の中だけ」です</b>
          <p>この Tier表はまだ公開していないので、URL や QR コードは
            <b>同じ端末の同じブラウザ</b>で開いたときしか中身が出ません。
            人に送っても、相手の画面は空になります。</p>
          <p>だれでも見られるようにするには <b>「公開する」</b>を押してください
            （表と画像をサーバーへ送ります。あとから取り下げられます）。</p>
          <p class="muted">※ 送らずに見せたいときは「画像を共有」・Export・スライドのPDFが使えます。</p>
        </div>
        <div class="row" style="flex-wrap:wrap;margin-bottom:10px">
          <button class="btn pri" onclick="MT.publishTable()">🌐 公開する（だれでも見られるようにする）</button>
        </div>`}
    <label class="lbl">SNSでシェア</label>
    <div class="snsrow" style="margin-bottom:6px">
      <a class="snsbtn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(cur.name + " | MagiTier")}&url=${encodeURIComponent(shareUrl())}"><span class="sq" style="background:#111">𝕏</span>X</a>
      <a class="snsbtn" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl())}"><span class="sq" style="background:#06c755">L</span>LINE</a>
      <a class="snsbtn" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}"><span class="sq" style="background:#1877f2">f</span>Facebook</a>
      <button class="snsbtn" onclick="MT.copyUrl()"><span class="sq" style="background:linear-gradient(135deg,#f09433,#dc2743,#bc1888)">◎</span>その他</button>
    </div>
    <div class="swrow" style="margin-top:10px"><div style="flex:1"><b>「人に見せてよい表」の目印を付ける</b><p>一覧で見分けるための、この端末の中だけの目印です（公開そのものは上のボタンで行います）</p></div>
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
    ["スライドを作る・見せる", "slideDlg"], ["全画面プレゼン", "present"],
    ["この構成をテンプレート保存", "saveAsTpl"],
    /* ★★ 2026-08-26e 作り直したいときの入口（全部／えらんだ段だけ 未配置へ） */
    ["表からもどす（未配置へ）", "resetDlg"],
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
    ? "キャラTier表：" + mb.tiers.reduce((s, x) => s + x.images.length, 0) + " 体を配置ずみ ・ 更新 " + fmtDay(mb.updatedAt)
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
/* ★ 2026-08-19 まず閲覧モードで開く。編集はその中のボタンから。 */
function openMbTier() { openMbViewer(); }
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
/* ══ ★★ 2026-08-22 mb-core.js を動かすための最小限の土台 ══
   ------------------------------------------------------------
   mb-core.js は MagiBurst の本体ページにある小道具（$ / DB / clamp / fmt / B）を
   当てにして書かれている。ここに無いと statsOf() などが例外で落ち、
   キャラの性能欄だけが<b>黙って</b>消える（try/catch の中なので画面は出る）。
   ★ ポータル用の mb-boot.js は読まない。あれは画像フォルダを "img/"（＝ポータル直下）に
     決め打ちするので、1つ下の /MagiTier/ から読むと絵がぜんぶ 404 になる。
     ここで要るぶんだけを、パスを正しくして用意する。
   ★ DB は<b>本物の magiburst_v1</b> を読む（同じ端末・同じオリジンなので読める）。
     こうすると「所持済み／未所持」「いまのLv」まで MagiBurst と同じものが出る。 */
function mbShim() {
  if (!window.MB_IMGD) window.MB_IMGD = "../img/";
  if (!window.MB_GIMGD) window.MB_GIMGD = "../MagiBurst/img/";
  if (typeof window.$ !== "function") window.$ = (q) => document.querySelector(q);
  if (typeof window.clamp !== "function") window.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  if (typeof window.fmt !== "function") window.fmt = (n) => (Number(n) || 0).toLocaleString("ja-JP");
  if (typeof window.sleep !== "function") window.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  /* B はバトル中の盤面。ここでは戦わないので必ず null（宣言が無いと ReferenceError） */
  if (!("B" in window)) window.B = null;
  if (!window.DB) {
    let db = null;
    try { db = JSON.parse(localStorage.getItem("magiburst_v1") || "null"); } catch (e) {}
    if (!db || typeof db !== "object") db = {};
    ["chars", "items", "hero", "trans", "jade", "fruits", "equip", "equip2", "equip3",
     "fav", "crossBook", "arc", "emblem", "lend"].forEach((k) => { if (!db[k]) db[k] = {}; });
    if (!Array.isArray(db.party)) db.party = [];
    window.DB = db;
  }
}
/* mb-core とキャラ詳細（XEVARION の図鑑・ガチャとまったく同じもの）を、必要になったときだけ読む */
let _mbDetailReady = false;
function loadScriptOnce(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error(src));
    document.head.appendChild(s);
  });
}
function loadMbCore() {
  mbShim();
  if (mbChars() && mbCharIds()) return Promise.resolve();
  return loadScriptOnce("../MagiBurst/js/mb-core.js?v=58");
}
/* ══ ★★ 2026-08-22 キャラ詳細は XEVARION と<b>同じ1本</b>（mb-char-detail.js）を読む ══
   自前で組み直すと、アビリティ・クロススキル・リンクの文面が必ず食いちがっていく。
   ここは openDetX を呼ぶだけにして、MagiTier の評価は<b>その下に足す</b>。 */
async function loadMbDetail() {
  await loadMbCore();
  if (_mbDetailReady) return;
  if (!$('link[data-mbdet]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "../mb-char-detail.css?v=11"; l.setAttribute("data-mbdet", "1");
    document.head.appendChild(l);
  }
  /* MagiBattle の評価も出したいので、その計算だけ先に読む（無くても詳細は開く） */
  if (!window.MBStats) { try { await loadScriptOnce("../magibattle-stats.js?v=6"); } catch (e) {} }
  if (typeof window.openDetX !== "function") await loadScriptOnce("../mb-char-detail.js?v=10");
  _mbDetailReady = true;
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
    /* ★★ 2026-08-22 すでに保存ずみの表は addedAt が全員同じ値のままなので、
       ここで<b>キャラの登場順</b>に貼り直す。これをやらないと、直したあとも
       手元の表だけ「追加順・新しい順が効かない」ままになる。 */
    const oi = ids.indexOf(cid);
    if (oi >= 0) im.addedAt = mbAddedAt(oi);
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
  /* 全キャラをプールに並べる（すでに表に置いてあるキャラは動かさない）
     ★ 2026-08-18 中身は mbFillPool に切り出した。開くたびの埋め直しと同じ道すじを通す。 */
  const added = mbFillPool(t);
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
  /* ★★ 2026-08-22b MagiBurst の表を見る画面では、更新は<b>日付だけ</b>（ご指定） */
  const at = mvData.at ? fmtDay(mvData.at) : "";
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
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-22 キャラ1体の詳細は「XEVARION の図鑑・ガチャとまったく同じもの」

   これまでは MagiTier が自前で行を組み立てていたので、
   アビリティの説明・クロススキル・リンクの文面が MagiBurst と少しずつずれていった。
   ★ 中身は <b>mb-char-detail.js の openDetX</b> にまかせる（XEVARION と同じ1本）。
     ここには性能の計算も文面も1行も書かない＝食いちがいが原理的に起きない。
   ★ MagiTier ならではの<b>Tier・評価・星・メモ</b>は、その詳細の<b>下に足す</b>。
   ★ 開けなかったとき（mb-core が読めない・通信が無い）は、それが分かる形で出す。
      黙って何も起きないと「押しても反応しない」に見えてしまう。
   ══════════════════════════════════════════════════════════════ */
/* いま手元にある MagiBurst 表から、そのキャラの1枚を探す */
function mbImgOf(id) {
  const local = tables.find((x) => x.id === MB_TABLE_ID);
  if (!local) return { im: null, table: null };
  const all = local.tiers.reduce((a, tr) => a.concat(tr.images), []).concat(local.images);
  return { im: all.find((x) => x.id === "mb:" + id) || null, table: local };
}
/* その子が入っている Tier を探す。公開ぶん（mvData）→ 手元の表 の順に見る */
function mbTierOf(id) {
  let hit = null;
  ((mvData && mvData.tiers) || []).forEach((tr) => { if ((tr.ids || []).indexOf(id) >= 0) hit = tr; });
  if (hit) return hit;
  const local = tables.find((x) => x.id === MB_TABLE_ID);
  if (local) local.tiers.forEach((tr) => { if ((tr.images || []).some((im) => im.id === "mb:" + id)) hit = tr; });
  return hit;
}
/* ★ MagiTier ぶんの1枚（Tier・評価・星・メモ）。
   見た目は mb-char-detail.css の .dsec / .t / .ddesc にそろえるので、
   XEVARION の詳細の中に置いても浮かない。 */
function mtEvalSectionHTML(id) {
  const { im, table } = mbImgOf(id);
  const tr = mbTierOf(id);
  const axes = (table && table.axes) || [];
  const stars = (v) => {
    const n = Math.round(Number(v) || 0);
    return '<span class="mtstars" aria-label="' + n + '/5">'
      + [1, 2, 3, 4, 5].map((k) => '<i class="' + (n >= k ? "on" : "") + '">★</i>').join("") + "</span>";
  };
  let rows = "";
  if (tr) {
    rows += '<div class="mtrow"><span class="mtk">Tier</span>'
      + '<span class="mttier" style="background:' + esc(tr.bg || "#555") + ';color:' + esc(tr.tc || "#fff") + '">'
      + esc(tr.label || "") + "</span>"
      + (tr.name ? '<span class="mtv">' + esc(tr.name) + "</span>" : "") + "</div>";
  }
  if (im) {
    const tot = totalScore(im);
    rows += '<div class="mtrow"><span class="mtk">総合</span><span class="mtnum">' + tot.toFixed(1) + "<small> / 10</small></span></div>";
    if (table && table.rateMax === 10) {
      if (im.rating > 0) rows += '<div class="mtrow"><span class="mtk">評価</span><span class="mtnum">' + Number(im.rating).toFixed(1) + "<small> / 10</small></span></div>";
    } else if (im.rating > 0) {
      rows += '<div class="mtrow"><span class="mtk">評価</span>' + stars(im.rating) + "</div>";
    }
    axes.forEach((ax) => {
      const v = (im.scores || {})[ax.key];
      if (!v) return;
      rows += '<div class="mtrow"><span class="mtk">' + esc(ax.label || ax.name || ax.key) + "</span>" + stars(v) + "</div>";
    });
  }
  /* メモが「属性 / タイプ」の写しでしかないときは出さない（同じことが2度並ぶだけ） */
  let memo = "";
  if (im && im.memo) {
    const CH = mbChars() || {};
    const c = CH[id];
    const dup = c && im.memo.replace(/\s/g, "") === ((c.el || "") + "/" + (c.type || "")).replace(/\s/g, "");
    if (!dup) memo = '<div class="mtmemo">' + esc(im.memo).split("\n").join("<br>") + "</div>";
  }
  if (!rows && !memo) {
    return '<div class="dsec mtsec"><div class="t">📊 MagiTier の評価</div>'
      + '<div class="ddesc">この表ではまだ評価が付いていません。'
      + '<br><small>評価・コメントは<b>この表を作った端末</b>で付けたぶんが出ます。</small></div></div>';
  }
  return '<div class="dsec mtsec"><div class="t">📊 MagiTier の評価</div>'
    + (rows ? '<div class="mtrows">' + rows + "</div>" : "")
    + (memo ? '<div class="mtmt">コメント</div>' + memo : "")
    + "</div>";
}
/* ★ 詳細を開く本体。閲覧モードからも、表を作っている最中からも、ここを通る。 */
async function mbOpenDetail(id) {
  const cid = String(id || "").replace(/^mb:/, "");
  if (!cid) return;
  try { await loadMbDetail(); } catch (e) { toast("キャラ情報を読み込めませんでした（通信）"); return; }
  const CH = mbChars() || {};
  if (!CH[cid]) { toast("このキャラの情報が見つかりませんでした"); return; }
  try { window.openDetX(cid); } catch (e) { toast("詳細を開けませんでした"); return; }
  /* ★ XEVARION の詳細の<b>中身の下</b>（.dbody の末尾）に足す。
     カードの外に付けると、余白も背景も合わずに浮いて見える。 */
  const body = $("#detCard .dbody") || $("#detCard");
  if (body) body.insertAdjacentHTML("beforeend", mtEvalSectionHTML(cid));
}
/* 閲覧モードのキャラ（従来の入口。名前はそのまま） */
function mvChar(id) { mbOpenDetail(id); }
function mvCloseChar() { $("#mvOv").classList.remove("on"); }

/* Firebase へ公開（キャラidの並びだけ） */
async function mbPublish() {
  const t = tables.find((x) => x.id === MB_TABLE_ID);
  if (!t) { toast("先にキャラTier表をつくってください"); return; }
  if (!mbCodeOK()) { mbCodeDlg(); return; }
  /* ★★ 2026-08-19 送るのは<b>キャラの id の並びだけ</b>。絵は1枚も送らない。
     読む側（MagiBurst の Tier表・MagiTier の閲覧モード）は、その id から
     mb-core の CHARS で絵を引くので、キャラ絵を差し替えても表はそのまま追従する。
     ★ ここに src や画像データを足さないこと。100体ぶんの data URL は数MBになり、
       書き込みが通らなくなる。 */
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
    /* ★ 2026-08-19 編集画面：Esc でとじる／矢印で選ぶ枚を変える
       （文字を打っている最中は横取りしない） */
    if ($("#deckOv").classList.contains("on") && !$("#slideOv").classList.contains("on")) {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
      if (e.key === "Escape") { deckClose(); return; }
      if (!typing && (e.key === "ArrowDown" || e.key === "ArrowRight")) { e.preventDefault(); deckSel(Math.min(deck.length - 1, deckIx + 1)); return; }
      if (!typing && (e.key === "ArrowUp" || e.key === "ArrowLeft")) { e.preventDefault(); deckSel(Math.max(0, deckIx - 1)); return; }
    }
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
  window.addEventListener("resize", () => {
    if ($("#slideOv").classList.contains("on")) { slFit(); slPaint(); }
    if ($("#deckOv").classList.contains("on")) renderDeck();
  });
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
    /* URL に #t=<id> が付いていたら、そのままその Tier表を開く（共有リンク）
       ★★ 2026-08-18 手元に無いときは<b>公開ぶん</b>を読みにいく。
         これが無かったので、送られたリンクを開いてもホームに落ちていた
         （＝「公開したのに開けない」）。 */
    const m = /#t=([^&]+)/.exec(location.hash || "");
    const wantId = m ? decodeURIComponent(m[1]) : "";
    if (wantId && tables.some((t) => t.id === wantId)) { openTable(wantId); return; }
    if (wantId) {
      const pub = await fetchPublished(wantId);
      if (pub) { renderPubViewer(pub); return; }
      go("home");
      toast("この Tier表は見つかりませんでした（公開されていないか、取り下げられています）");
      return;
    }
    go("home");
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
  /* ★★ 2026-08-26e 段の挿入（アルファベットのずらし）と、表→未配置のもどし */
  insertDlg, setInsAt, toggleInsShift, doInsertTier,
  resetDlg, toggleResetTier, resetPickAll, resetAllToPool, resetPickedToPool, tierToPool,
  addDlg, pickFile, bulkAdd, urlDlg, addUrls, replaceImg, delImg, imgMenu,
  pickImg, moveImgTo, setImgField, setImgFieldOf, setScore, setScoreOf, toggleCard,
  sortDlg, setSort, setRateMax, axesDlg, addAxis, delAxis, toggleAuto, saveAxes, applyAuto, applyAutoAll,
  setPoolQuery, setPoolAttr, setCardSize, togglePool,   /* ★ 2026-08-17d プールの検索・属性・大きさ・開閉 */
  setTableSize, setSortQuick, askAnswer,                /* ★ 2026-08-17e 表内の大きさ・並び替え・確認ダイアログ */
  saveOrPublish,                                        /* ★ 2026-08-17f MB表は「公開」まで通す */
  compareDlg, cmpToggle, cmpApply,
  present, pClose, pFull, pZoom,
  slideDlg, pickSlide, slStart, slPrev, slNext, slClose, slFull, slPdf,
  /* ★ 2026-08-19 スライド編集 */
  slidePreset, openDeck, deckClose, deckReset, deckSel, deckSet,
  deckAdd, deckAddKind, deckDup, deckDel, deckMove, deckPdf,
  editMenu,
  exportDlg, pickFmt, pickScale, doExport,
  shareDlg, copyUrl, shareImage, showQR, togglePublic,
  publishTable, unpublishTable,                         /* ★ 2026-08-18 ほんものの「公開」 */
  setTplCat, saveAsTpl, useMyTpl, delMyTpl,
  setTheme, toggleTheme, backup, restore, exportJson, help,
  openMbTier, openMbEdit, mbCodeDlg, mbCheck, mbPublish,
  mbDetail: mbOpenDetail,                               /* ★ 2026-08-22 ゲームのキャラ詳細（XEVARION と同じ） */
  mbDedupe,
  openMbViewer, mvChar, mvCloseChar,
};
boot();
})();

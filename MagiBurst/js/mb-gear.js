/* ══════════════════════════════════════════════════════════════
   mb-gear.js — 装備（頭・腕・胸・足）  ★★ 2026-09-06 新設（ご指定）
   ------------------------------------------------------------
   ・<b>天界の審判</b>を 5WAVE 踏破するごとに 1つ落ちる。
     部位は 頭／腕／胸／足 が<b>それぞれ 25%</b>。
   ・1つにつき<b>効果は1つだけ</b>。効果の種類は下の表の確率で、
     数値はその効果の<b>下限〜上限のあいだ</b>から一様に引く。
   ・引いた数値が範囲の<b>上位3割（＝下限＋0.7×幅 以上）</b>なら
     <b>色を変える</b>（金の枠）。ひと目で当たりが分かる。
   ・キャラ1体につき<b>各部位1つずつ・最大4つ</b>まで着けられる。
     効果は<b>着けた本人だけ</b>に効く（ルーンと同じ考えかた）。

   ★ 効果は NIKKE 風の名前を <b>MagiBurst の盤面の言葉</b>に読みかえてある（ご指定）:
       有利コードダメージ  → 属性が有利な敵へのダメージ
       命中率              → 弱点の判定半径（当たり判定が広がる）
       最大装弾数          → 1ターンの移動距離（＝ヒット数が伸びる）
       攻撃力              → 攻撃力
       チャージダメージ    → フルバースト中の与ダメージ
       チャージ速度        → フルバーストの必要ターン短縮
       クリティカル確率    → クリティカル率（素は 1%）
       クリティカルダメージ→ クリティカル倍率（素は 3.0倍）
       防御力              → 受けるダメージの軽減

   ★ 効かせる場所は<b>1効果につき1か所</b>にしてある（掛け忘れが起きないように）:
       atk / chgdmg … atkMulOf()             （直殴り・リンク・FB派生の全部に乗る）
       elemdmg      … elemMultOf()           （属性有利のときだけ）
       hitrate      … hitEnemy() の弱点判定
       ammo         … effFriction()          （止まりにくくなる＝遠くまで走る）
       chgspd       … fbTurnsOf()            （必要ターンそのもの）
       critrate/dmg … hitEnemy() のクリティカル
       def          … damageMember()         （着けた本人が受けるぶん）
   ══════════════════════════════════════════════════════════════ */

/* ── 部位 ── */
const GEAR_PARTS = ["head", "arm", "body", "leg"];
const GEAR_PART = {
  head: { id: "head", nm: "頭", full: "ヘッドギア", img: "eq_head.webp", c: "#8ec7ff" },
  arm:  { id: "arm",  nm: "腕", full: "アームガード", img: "eq_arm.webp", c: "#a6b4ff" },
  body: { id: "body", nm: "胸", full: "ブレストプレート", img: "eq_body.webp", c: "#ffd9a0" },
  leg:  { id: "leg",  nm: "足", full: "レッグアーマー", img: "eq_leg.webp", c: "#b8ffe0" },
};

/* ── 効果（下限・上限・排出確率%）。合計はちょうど 100%。 ── */
const GEAR_FX = {
  elemdmg:  { id: "elemdmg",  nm: "有利コードダメージ増加", short: "属性有利DMG", min: 9.54,  max: 29.16, p: 10, c: "#ff8f5e" },
  hitrate:  { id: "hitrate",  nm: "命中率増加",             short: "弱点判定",    min: 4.77,  max: 14.63, p: 12, c: "#7cc4ff" },
  ammo:     { id: "ammo",     nm: "最大装弾数増加",         short: "移動距離",    min: 27.84, max: 85.37, p: 12, c: "#8affc4" },
  atk:      { id: "atk",      nm: "攻撃力増加",             short: "攻撃力",      min: 4.77,  max: 14.63, p: 10, c: "#ff5d47" },
  chgdmg:   { id: "chgdmg",   nm: "チャージダメージ増加",   short: "FB威力",      min: 4.77,  max: 14.63, p: 12, c: "#ffb020" },
  chgspd:   { id: "chgspd",   nm: "チャージ速度増加",       short: "FB短縮",      min: 1.98,  max: 6.09,  p: 12, c: "#ffd257" },
  critrate: { id: "critrate", nm: "クリティカル確率増加",   short: "クリ率",      min: 2.30,  max: 7.07,  p: 12, c: "#ff6f91" },
  critdmg:  { id: "critdmg",  nm: "クリティカルダメージ増加", short: "クリDMG",   min: 6.64,  max: 20.36, p: 10, c: "#ff3d6e" },
  def:      { id: "def",      nm: "防御力増加",             short: "被ダメ減",    min: 4.77,  max: 14.63, p: 10, c: "#9ad4ff" },
};
const GEAR_FX_IDS = Object.keys(GEAR_FX);
/* 効果の説明（MagiBurst で何が起きるか） */
const GEAR_FX_DESC = {
  elemdmg:  "<b>属性が有利な敵</b>へのダメージが増える",
  hitrate:  "<b>弱点の判定半径</b>が広がる（弱点に当てやすくなる）",
  ammo:     "<b>1ターンに走る距離</b>がのびる（そのぶんヒット数が増える）",
  atk:      "<b>攻撃力</b>が上がる（直殴り・リンク・フルバーストすべて）",
  chgdmg:   "<b>フルバースト中の与ダメージ</b>が増える",
  chgspd:   "<b>フルバーストの必要ターン</b>が短くなる",
  critrate: "<b>クリティカル率</b>が上がる（素は 1%）",
  critdmg:  "<b>クリティカル倍率</b>が上がる（素は 3.0倍）",
  def:      "<b>受けるダメージ</b>が減る（着けた本人ぶん）",
};

/* 上位3割（＝当たり）の境目 */
const GEAR_HIGH = 0.70;
function gearIsHigh(g) {
  const f = g && GEAR_FX[g.e]; if (!f) return false;
  return g.v >= f.min + (f.max - f.min) * GEAR_HIGH;
}
/* 引いた値が範囲のどのあたりか（0〜1） */
function gearRatio(g) {
  const f = g && GEAR_FX[g.e]; if (!f || f.max <= f.min) return 0;
  return Math.max(0, Math.min(1, (g.v - f.min) / (f.max - f.min)));
}

/* ── 抽選 ── */
function gearRandId() {
  let s = "g";
  for (let i = 0; i < 10; i++) s += "0123456789abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 36)];
  return s;
}
function gearRollPart() { return GEAR_PARTS[Math.floor(Math.random() * GEAR_PARTS.length)]; }
function gearRollFx() {
  let r = Math.random() * 100;
  for (const k of GEAR_FX_IDS) { if (r < GEAR_FX[k].p) return k; r -= GEAR_FX[k].p; }
  return GEAR_FX_IDS[GEAR_FX_IDS.length - 1];
}
/* 1つ引く（保存はしない）。part を指定すればその部位で作る。 */
function gearRoll(part) {
  const p = part || gearRollPart();
  const e = gearRollFx();
  const f = GEAR_FX[e];
  const v = Math.round((f.min + Math.random() * (f.max - f.min)) * 100) / 100;
  /* ★★ 2026-09-07 t ＝ 手に入れた時刻（一覧の「新しい順」で使う）。
     これより前に引いた装備には t がないが、並べ替えは安定なので
     もとの並び（手に入れた順）のまま後ろに並ぶ。 */
  return { id: gearRandId(), p, e, v, t: Date.now() };
}

/* ── 保管（DB.gear = { id: {id,p,e,v} } ／ DB.gearOn = { charId: {head:id,...} }）── */
function gearStore() {
  if (typeof DB === "undefined" || !DB) return {};
  if (!DB.gear) DB.gear = {};
  return DB.gear;
}
function gearOnStore() {
  if (typeof DB === "undefined" || !DB) return {};
  if (!DB.gearOn) DB.gearOn = {};
  return DB.gearOn;
}
function gearById(gid) { return gearStore()[gid] || null; }
function gearAll() { return Object.values(gearStore()); }
function gearCount() { return Object.keys(gearStore()).length; }
/* 1つ手に入れる（保存まで） */
function gearGrant(part) {
  const g = gearRoll(part);
  gearStore()[g.id] = g;
  return g;
}
/* いま誰かが着けているか（着けている相手の id を返す） */
function gearWearer(gid) {
  const on = gearOnStore();
  for (const cid in on) { const s = on[cid] || {}; for (const p in s) if (s[p] === gid) return cid; }
  return null;
}
/* そのキャラの装備（部位 → 装備オブジェクト。空きは含めない） */
function gearOf(charId) {
  const s = gearOnStore()[charId] || {};
  const out = {};
  GEAR_PARTS.forEach((p) => { const g = gearById(s[p]); if (g && g.p === p) out[p] = g; });
  return out;
}
function gearListOf(charId) { const o = gearOf(charId); return GEAR_PARTS.map((p) => o[p]).filter(Boolean); }
/* 着ける／外す（同じものを2人が着けることはできない＝先に外す） */
function gearEquip(charId, gid) {
  const g = gearById(gid); if (!g) return false;
  const prev = gearWearer(gid);
  if (prev) { const s = gearOnStore()[prev] || {}; if (s[g.p] === gid) delete s[g.p]; }
  const s2 = gearOnStore()[charId] = gearOnStore()[charId] || {};
  s2[g.p] = gid;
  return true;
}
function gearUnequip(charId, part) {
  const s = gearOnStore()[charId]; if (!s) return;
  delete s[part];
}
/* 壊れた参照を掃除（未所持キャラ・消えた装備） */
function gearCleanup() {
  const st = gearStore(), on = gearOnStore();
  Object.keys(on).forEach((cid) => {
    if (typeof CHARS !== "undefined" && !CHARS[cid]) { delete on[cid]; return; }
    const s = on[cid] || {};
    Object.keys(s).forEach((p) => { const g = st[s[p]]; if (!g || g.p !== p) delete s[p]; });
    if (!Object.keys(s).length) delete on[cid];
  });
}

/* ══ 効果を数える ══
   ball.gear（バトル中に持ちよったぶん）か、手元の DB から。
   ★ マルチでは<b>持ち主のぶん</b>を使う（ルーンの ball.fruits と同じ考えかた）。 */
function gearPct(list, key) {
  let v = 0;
  (list || []).forEach((g) => { if (g && g.e === key) v += (+g.v || 0); });
  return v / 100;
}
/* バトル中の玉から */
function ballGear(ball, key) {
  if (!ball) return 0;
  return gearPct(ball.gear, key);
}
/* キャラ定義（CHARS[id]）から引く。バトル中はその玉のぶん、外では手元のぶん。 */
function gearPctOfChar(c, key) {
  if (!c) return 0;
  try {
    if (typeof B !== "undefined" && B && B.balls) {
      const b = B.balls.find((x) => x && x.ch === c);
      if (b) return gearPct(b.gear, key);
      return 0;                       /* バトル中に見つからない＝他人のキャラ。手元のぶんは乗せない */
    }
  } catch (e) {}
  return gearPct(gearListOf(c.id), key);
}
/* 出撃するときの持ちより（ball.gear に入れる形） */
function gearSnapshot(charId) {
  return gearListOf(charId).map((g) => ({ p: g.p, e: g.e, v: g.v }));
}

/* ══ クリティカル（★★ 2026-09-06 新設・ご指定）══
   全キャラ共通で、敵にふれたとき <b>1%</b> でその殴りが <b>3倍</b>になる。
   装備でこの2つ（確率・倍率）を伸ばせる。 */
const CRIT_BASE_P = 0.01;
const CRIT_BASE_MUL = 3.0;
function critRateOf(ball) { return CRIT_BASE_P + ballGear(ball, "critrate"); }
function critMulOf(ball) { return CRIT_BASE_MUL * (1 + ballGear(ball, "critdmg")); }

/* ══ 見た目 ══ */
function gearImg(part) {
  const p = GEAR_PART[part]; if (!p) return "";
  return (typeof GIMGD !== "undefined" ? GIMGD : "img/") + p.img;
}
function gearName(g) {
  if (!g) return "";
  const p = GEAR_PART[g.p] || {};
  return p.full || p.nm || "";
}
function gearValText(g) {
  if (!g) return "";
  return (GEAR_FX[g.e] ? GEAR_FX[g.e].nm : g.e) + " +" + (+g.v).toFixed(2) + "%";
}
function gearShortText(g) {
  if (!g) return "";
  return (GEAR_FX[g.e] ? GEAR_FX[g.e].short : g.e) + " +" + (+g.v).toFixed(1) + "%";
}
/* 一覧・装備欄の札。high なら金の枠になる。 */
function gearCardHTML(g, opt) {
  if (!g) return "";
  const o = opt || {};
  const f = GEAR_FX[g.e] || {};
  const hi = gearIsHigh(g);
  return `<div class="gcard${hi ? " hi" : ""}${o.on ? " on" : ""}" ${o.click ? `onclick="${o.click}"` : ""}>
    <div class="gci"><img src="${gearImg(g.p)}" alt=""></div>
    <div class="gcb">
      <div class="gcn">${gearName(g)}<span class="gcp">${(GEAR_PART[g.p] || {}).nm || ""}</span></div>
      <div class="gcf" style="color:${f.c || "#fff"}">${f.nm || g.e}<b> +${(+g.v).toFixed(2)}%</b></div>
      <div class="gcr"><i style="width:${(gearRatio(g) * 100).toFixed(0)}%;background:${f.c || "#fff"}"></i></div>
    </div>
    ${hi ? '<span class="gchi">★</span>' : ""}
  </div>`;
}
/* 編成カード・バトル中に出す小さな印（ルーンの隣） */
function gearBadgeHTML(charId, px) {
  const list = gearListOf(charId);
  if (!list.length) return "";
  const s = px || 15;
  const hi = list.some(gearIsHigh);
  return `<span class="gbdg${hi ? " hi" : ""}" title="装備 ${list.length}／4">`
    + list.map((g) => `<img src="${gearImg(g.p)}" style="width:${s}px;height:${s}px" alt="">`).join("")
    + `</span>`;
}

/* ══════════════════════════════════════════════════════════════
   ここから下は<b>画面まわり</b>（index.html から呼ばれる）。
   ★ $ / CHARS / DB / SFX などは index.html の中で作られるが、
     ここは<b>呼ばれたときに</b>参照するので、読み込み順は問題にならない。
   ══════════════════════════════════════════════════════════════ */

/* ── 育成タブ「装備の装着」──────────────────────────── */
let gearPickFor = null;                 /* "charId#part" */

/* ★★ 2026-09-06b 枠を作り直しました（ご報告「一覧が見づらい」）。
   ・部位の名前を<b>いつも</b>出す（着けていない枠も何の枠か分かる）。
   ・着けているときは<b>絵・効果の名前・数値</b>を3段で出す。
   ・上位3割は<b>金の枠＋★</b>。 */
function gearSlotHTML(id, part) {
  const g = gearOf(id)[part];
  const p = GEAR_PART[part];
  const f = g ? (GEAR_FX[g.e] || {}) : null;
  return `<button class="gslot ${g ? "on" : ""}${g && gearIsHigh(g) ? " hi" : ""}"
      onclick="openGearPick('${id}','${part}')" title="${p.full}">
    <span class="gsp">${p.nm}</span>
    ${g ? `<img src="${gearImg(part)}" alt="">
           <span class="gsfx" style="color:${f.c}">${f.short}</span>
           <span class="gsv">+${(+g.v).toFixed(1)}%</span>
           ${gearIsHigh(g) ? '<i class="gshi">★</i>' : ""}`
        : `<span class="gsempty">＋</span><span class="gsnone">未装備</span>`}
  </button>`;
}
/* ══ ★★ 2026-09-07 育成の「装備の装着」に<b>装備で絞る</b>帯を付けた（ご指定）══
   上にもとからある #gearFilter は<b>キャラで探す</b>帯（名前検索・属性など）。
   こちらは<b>装備そのもの</b>で絞るための帯で、役割がちがう。
   ★ 文字の入力欄は<b>ここには置かない</b>。一覧を描き直すたびに
     入力欄ごと作り直されて、打っている途中でカーソルが飛ぶため
     （名前検索は上の #gearFilter がもっている）。 */
let gFilter = { only: "all", fx: "all", sort: "no" };
function gSet(k, v) {
  gFilter[k] = v;
  renderGearList();
  try { SFX.pick(); } catch (e) {}
}
window.gSet = gSet;
function gearBarHTML() {
  const chip = (k, v, nm, ttl) =>
    `<button class="ilchip ${gFilter[k] === v ? "on" : ""}" onclick="gSet('${k}','${v}')"${ttl ? ' title="' + ttl + '"' : ""}>${nm}</button>`;
  return `<div class="gbar">
    <div class="ilchips">
      ${chip("only", "all", "すべて")}
      ${chip("only", "free", "空き枠あり", "4か所のうち、まだ着けていない枠があるキャラ")}
      ${chip("only", "full", "満タン 4/4")}
      ${chip("only", "none", "未装備 0/4")}
      ${chip("only", "hi", "★ 上位3割もち")}
    </div>
    <div class="ilchips">
      ${chip("fx", "all", "すべての効果")}${GEAR_FX_IDS.map((k) => chip("fx", k, GEAR_FX[k].short, GEAR_FX[k].nm)).join("")}
    </div>
    <div class="ilchips">
      <span class="gblb">並び替え</span>
      ${chip("sort", "no", "図鑑順")}
      ${chip("sort", "cnt", "装備の多い順")}
      ${chip("sort", "atk", "装備の攻撃力順")}
      ${chip("sort", "party", "編成を上に")}
    </div>
  </div>`;
}
function gearListHTML() {
  const st = (typeof FSCOPE !== "undefined" && FSCOPE.gear) ? FSCOPE.gear : null;
  let ids = (typeof filteredIds === "function")
    ? filteredIds("gear", CHAR_IDS.filter((id) => DB.chars[id]))
    : CHAR_IDS.filter((id) => DB.chars[id]);
  if (st && st.sort === "def") {
    ids = ids.slice().sort((a, b) => (DB.party.includes(b) ? 1 : 0) - (DB.party.includes(a) ? 1 : 0));
  }
  /* ★ 装備で絞る */
  if (gFilter.only !== "all" || gFilter.fx !== "all") {
    ids = ids.filter((id) => {
      const list = gearListOf(id), n = list.length;
      if (gFilter.only === "free" && n >= 4) return false;
      if (gFilter.only === "full" && n < 4) return false;
      if (gFilter.only === "none" && n > 0) return false;
      if (gFilter.only === "hi" && !list.some(gearIsHigh)) return false;
      if (gFilter.fx !== "all" && !list.some((g) => g.e === gFilter.fx)) return false;
      return true;
    });
  }
  /* ★ 並び替え */
  if (gFilter.sort === "cnt") ids = ids.slice().sort((a, b) => gearListOf(b).length - gearListOf(a).length);
  else if (gFilter.sort === "atk") ids = ids.slice().sort((a, b) => (gearSumOf(b).atk || 0) - (gearSumOf(a).atk || 0));
  else if (gFilter.sort === "party") ids = ids.slice().sort((a, b) => (DB.party.includes(b) ? 1 : 0) - (DB.party.includes(a) ? 1 : 0));
  if (!ids.length) return gearBarHTML() + '<div class="ipempty">該当するキャラがいません。条件を見直してください。</div>';
  return gearBarHTML() + `<div class="eqgrid">${ids.map((id) => {
    const c = CHARS[id]; if (!c) return "";
    const inParty = DB.party.includes(id);
    const rows = GEAR_PARTS.map((p) => gearSlotHTML(id, p)).join("");
    const n = gearListOf(id).length;
    const sum = gearSumOf(id);
    const sumTx = Object.keys(sum).map((k) =>
      `<span class="gsm" style="--bc:${(GEAR_FX[k] || {}).c}">${(GEAR_FX[k] || {}).short} +${(sum[k] * 100).toFixed(1)}%</span>`).join("");
    return `<div class="eqcard gearcard${n ? " has" : ""}">
      ${inParty ? '<span class="eqin">編成</span>' : ""}
      <button class="eqavb" onclick="openDet('${id}','train')" title="${c.nm} の詳細を見る">
        <img class="eqav" src="${c.th}" alt="${c.nm}">
      </button>
      <div class="eqnm">${c.nm}<span class="gcnt">${n}/4</span></div>
      <div class="gslots">${rows}</div>
      ${sumTx ? `<div class="gsums">${sumTx}</div>` : ""}
    </div>`;
  }).join("")}</div>`;
}
function renderGearList() { const el = document.getElementById("gearlist"); if (el) el.innerHTML = gearListHTML(); }
function renderGearPick() {
  const wrap = document.getElementById("gearlist"); if (!wrap) return;
  if (typeof paintFilterUI === "function") paintFilterUI("gear", document.getElementById("gearFilter"));
  renderGearList();
}
window.gearListHTML = gearListHTML; window.renderGearList = renderGearList; window.renderGearPick = renderGearPick;

function openGearPick(charId, part) {
  gearPickFor = charId + "#" + part;
  paintGearPick();
  document.getElementById("gearOv").classList.add("on");
  try { SFX.pick(); } catch (e) {}
}
function closeGearPick() { gearPickFor = null; document.getElementById("gearOv").classList.remove("on"); }
window.openGearPick = openGearPick; window.closeGearPick = closeGearPick;

function paintGearPick() {
  const card = document.getElementById("gearCard"); if (!card || !gearPickFor) return;
  const sp = String(gearPickFor).split("#");
  const id = sp[0], part = sp[1];
  const c = CHARS[id]; if (!c) return;
  const cur = gearOf(id)[part];
  /* ★★ 2026-09-07 並びを直しました（ご指定）。
       ① <b>いまこのキャラが付けているもの</b>（いちばん上）
       ② 空き（だれも着けていない）
       ③ ほかのキャラが付けているもの
     それぞれの中では<b>効果の強い順</b>。
     前は強い順だけだったので、いま付けているものが下のほうに埋もれ、
     「今何を付けているのか」を探すのにスクロールが要った。 */
  const rank = (g) => { const w = gearWearer(g.id); return w === id ? 0 : (w ? 2 : 1); };
  const list = gearAll().filter((g) => g.p === part)
    .sort((a, b) => (rank(a) - rank(b)) || (gearRatio(b) - gearRatio(a)));
  const opts = list.map((g) => {
    const w = gearWearer(g.id);
    const mine = w === id;
    const f = GEAR_FX[g.e] || {};
    return `<button class="fsopt ${mine ? "cur" : ""}" onclick="equipGear('${id}','${g.id}')" style="border-color:${f.c}66">
      <span class="fsic"><img src="${gearImg(part)}" style="width:30px;height:30px;object-fit:contain" alt=""></span>
      <span class="fstx"><b style="color:${f.c}">${f.nm} +${(+g.v).toFixed(2)}%</b>
        <small>${GEAR_FX_DESC[g.e] || ""}${gearIsHigh(g) ? "　<b style='color:#ffd257'>★ 上位3割</b>" : ""}</small></span>
      <span class="fsr"><i style="color:${f.c}">${(gearRatio(g) * 100).toFixed(0)}%</i>
        <small>${w ? (mine ? "装備中" : (CHARS[w] || {}).nm + " が装備") : "空き"}</small></span>
    </button>`;
  }).join("") || '<div class="fsnone">この部位の装備を持っていません。<b>⚖ 天界の審判</b>を <b>5WAVE</b> 踏破するごとに1つ手に入ります。</div>';
  card.innerHTML = `
    <div class="fshead2">
      <button class="fshb" onclick="openDet('${id}','train')" title="${c.nm} の詳細を見る">
        <img src="${c.th}" alt=""><div><b>${c.nm}</b> の ${(GEAR_PART[part] || {}).full}<small>タップでキャラ詳細　▸</small></div>
      </button>
      <button class="fsx" onclick="closeGearPick()" aria-label="とじる">✕</button></div>
    <div class="fslist">${opts}</div>
    <div class="gpnote">※ 上から <b>いま付けているもの → 空き → ほかのキャラが付けているもの</b> の順で、
      それぞれ<b>効果の強い順</b>に並んでいます。</div>
    ${cur ? `<button class="fsremove" onclick="equipGear('${id}','')">✕ 「${gearName(cur)}」をはずす</button>` : ""}`;
}
window.paintGearPick = paintGearPick;

function equipGear(charId, gid) {
  const part = String(gearPickFor || "").split("#")[1];
  if (!gid) { gearUnequip(charId, part); }
  else {
    const g = gearById(gid);
    if (!g) return;
    /* 同じものをもう一度押したら「はずす」 */
    if (gearWearer(gid) === charId) gearUnequip(charId, g.p);
    else gearEquip(charId, gid);
  }
  try { save(); } catch (e) {}
  paintGearPick();
  renderGearList();
  try { if (typeof renderTeam === "function" && curView === "vteam") renderTeam(); } catch (e) {}
  try { SFX.pick(); } catch (e) {}
}
window.equipGear = equipGear;

/* ── ホームの「所持アイテム一覧」──────────────────────
   ★★ 2026-09-06 ご指定でホームの「キャラクター一覧」をここに置きかえた。
     <b>装備・ルーン・アイテム</b>の<b>種類と個数</b>をまとめて確認できる。
     絞り込みは「種類」と「装備の部位／効果」の2段。 */
/* ★★ 2026-09-07 q（検索の文字）と sort（並び替え）を足しました。 */
let ilFilter = { kind: "all", part: "all", fx: "all", hiOnly: false, freeOnly: false, q: "", sort: "part" };

function openItemList() {
  document.getElementById("ilOv").classList.add("on");
  paintItemList();
  try { SFX.pick(); } catch (e) {}
}
function closeItemList() { document.getElementById("ilOv").classList.remove("on"); }
window.openItemList = openItemList; window.closeItemList = closeItemList;

function ilSet(k, v) {
  if (k === "hiOnly" || k === "freeOnly") ilFilter[k] = !ilFilter[k];
  else ilFilter[k] = v;
  paintItemList();
  try { SFX.pick(); } catch (e) {}
}
window.ilSet = ilSet;
/* ★ 検索欄。<b>入力欄ごと描き直すとカーソルが飛ぶ</b>ので、
   描き直したあとに<b>焦点とカーソルの位置を戻す</b>。 */
function ilSearch(v) {
  ilFilter.q = String(v || "");
  const box = document.getElementById("ilQ");
  const pos = box ? box.selectionStart : null;
  paintItemList();
  const b2 = document.getElementById("ilQ");
  if (b2) { b2.focus(); try { if (pos != null) b2.setSelectionRange(pos, pos); } catch (e) {} }
}
window.ilSearch = ilSearch;
/* 検索の当たり判定：部位・効果の名前・短い名前・付けているキャラの名前 */
function gearMatch(g, q) {
  if (!q) return true;
  const f = GEAR_FX[g.e] || {}, p = GEAR_PART[g.p] || {};
  const w = gearWearer(g.id);
  const hay = [p.nm, p.full, f.nm, f.short, gearName(g), (+g.v).toFixed(2),
               w ? (CHARS[w] || {}).nm : "", gearIsHigh(g) ? "上位3割 ★" : ""].join(" ");
  return hay.toLowerCase().indexOf(q.toLowerCase()) >= 0;
}

function paintItemList() {
  const card = document.getElementById("ilCard"); if (!card) return;
  const chip = (k, v, nm) => `<button class="ilchip ${ilFilter[k] === v ? "on" : ""}" onclick="ilSet('${k}','${v}')">${nm}</button>`;
  const tgl = (k, nm) => `<button class="ilchip ${ilFilter[k] ? "on" : ""}" onclick="ilSet('${k}',0)">${nm}</button>`;

  /* ── 装備 ── */
  let gs = gearAll();
  if (ilFilter.part !== "all") gs = gs.filter((g) => g.p === ilFilter.part);
  if (ilFilter.fx !== "all") gs = gs.filter((g) => g.e === ilFilter.fx);
  if (ilFilter.hiOnly) gs = gs.filter(gearIsHigh);
  if (ilFilter.freeOnly) gs = gs.filter((g) => !gearWearer(g.id));
  if (ilFilter.q) gs = gs.filter((g) => gearMatch(g, ilFilter.q));
  /* ★★ 2026-09-07 並び替え（ご指定） */
  const _byPart = (a, b) => (GEAR_PARTS.indexOf(a.p) - GEAR_PARTS.indexOf(b.p)) || (gearRatio(b) - gearRatio(a));
  if (ilFilter.sort === "strong") gs.sort((a, b) => (gearRatio(b) - gearRatio(a)) || _byPart(a, b));
  else if (ilFilter.sort === "fx") gs.sort((a, b) => (GEAR_FX_IDS.indexOf(a.e) - GEAR_FX_IDS.indexOf(b.e)) || (gearRatio(b) - gearRatio(a)));
  else if (ilFilter.sort === "new") gs.sort((a, b) => (b.t || 0) - (a.t || 0));
  else if (ilFilter.sort === "wear") gs.sort((a, b) => ((gearWearer(a.id) ? 0 : 1) - (gearWearer(b.id) ? 0 : 1)) || _byPart(a, b));
  else gs.sort(_byPart);

  const byPart = {};
  gearAll().forEach((g) => { byPart[g.p] = (byPart[g.p] || 0) + 1; });
  const gearHTML = `
    <div class="ilsub">部位ごとの数：${GEAR_PARTS.map((p) =>
      `<b>${GEAR_PART[p].nm} ${byPart[p] || 0}</b>`).join("　")}　／　合計 <b>${gearCount()}</b>個</div>
    <div class="ilchips">
      ${chip("part", "all", "すべての部位")}${GEAR_PARTS.map((p) => chip("part", p, GEAR_PART[p].nm)).join("")}
    </div>
    <div class="ilchips">
      ${chip("fx", "all", "すべての効果")}${GEAR_FX_IDS.map((k) => chip("fx", k, GEAR_FX[k].short)).join("")}
    </div>
    <div class="ilchips">
      ${tgl("hiOnly", "★ 上位3割だけ")}${tgl("freeOnly", "空き（誰も着けていない）だけ")}
    </div>
    <div class="ilchips">
      <span class="gblb">並び替え</span>
      ${chip("sort", "part", "部位ごと")}
      ${chip("sort", "strong", "強い順")}
      ${chip("sort", "fx", "効果ごと")}
      ${chip("sort", "new", "新しい順")}
      ${chip("sort", "wear", "装備中を上に")}
    </div>
    <div class="ilfind">
      <input id="ilQ" type="search" placeholder="装備をさがす（部位・効果・数値・キャラの名前）"
        value="${String(ilFilter.q).replace(/"/g, "&quot;")}" oninput="ilSearch(this.value)">
      ${ilFilter.q ? `<button class="ilqx" onclick="ilSearch('')" title="消す">✕</button>` : ""}
    </div>
    <div class="ilsub">この条件に合う装備：<b>${gs.length}</b>個</div>
    <div class="ilgear">${gs.length
      ? gs.map((g) => {
          const w = gearWearer(g.id);
          return gearCardHTML(g).replace("</div>\n  </div>", "</div>\n  </div>")
            + (w ? `<div class="ilwear">${(CHARS[w] || {}).nm} が装備中</div>` : "");
        }).join("")
      : '<div class="ipempty">条件に合う装備がありません。</div>'}</div>`;

  /* ── ルーン ── */
  const runeHTML = `<div class="ilrow">${FRUIT_IDS.map((k) => {
    const f = FRUITS[k], have = (DB.fruits && DB.fruits[k]) || 0;
    const free = (typeof fruitFree === "function") ? fruitFree(k) : have;
    return `<div class="ilcell ${have ? "" : "zero"}">
      <span class="ilic">${fruitSVG(k, 26)}</span>
      <span class="iltx"><b style="color:${f.c}">${f.nm}</b><small>${f.short}</small></span>
      <span class="ilnum">${have}<small>空き ${free}</small></span>
    </div>`;
  }).join("")}</div>`;

  /* ── アイテム ── */
  const itemHTML = `<div class="ilrow">${Object.keys(ITEMS).map((k) => {
    const it = ITEMS[k], have = (DB.items && DB.items[k]) || 0;
    return `<div class="ilcell ${have ? "" : "zero"}">
      <span class="ilic">${itemIcon(k, 26)}</span>
      <span class="iltx"><b style="color:${it.c}">${it.nm}</b><small>${it.icon || ""}</small></span>
      <span class="ilnum">${have}</span>
    </div>`;
  }).join("")}</div>`;

  const sect = (k, nm, body) => (ilFilter.kind === "all" || ilFilter.kind === k)
    ? `<div class="ilsec"><div class="ilsh">${nm}</div>${body}</div>` : "";

  card.innerHTML = `
    <button class="ovx" onclick="closeItemList()" aria-label="とじる" title="とじる">✕</button>
    <h3>🎒 所持アイテム一覧</h3>
    <div class="ilhint">いま持っている<b>装備・ルーン・アイテム</b>を、種類と個数でまとめて確認できます。</div>
    <div class="ilchips top">
      ${chip("kind", "all", "すべて")}${chip("kind", "gear", "🛡 装備")}${chip("kind", "rune", "🔮 ルーン")}${chip("kind", "item", "🎁 アイテム")}
    </div>
    ${sect("gear", "🛡 装備（頭・腕・胸・足）", gearHTML)}
    ${sect("rune", "🔮 ルーン", runeHTML)}
    ${sect("item", "🎁 特別アイテム", itemHTML)}`;
}
window.paintItemList = paintItemList;

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-06b 装備を<b>ステータスに含めて</b>見せる（ご指定）
   ------------------------------------------------------------
   ・<b>同じ効果を別の部位で持っていたら、両方とも足す</b>（gearPct が合計する）。
     例: 頭に「攻撃力 +12%」・腕に「攻撃力 +9%」なら <b>+21%</b>。
   ・画面に出すステータスは <b>statsGeared()</b> を通す。
     ★ バトルの計算は atkMulOf() 側で乗せているので、
       <b>ここを damage の式に使わないこと</b>（二重に乗る）。表示専用。
   ══════════════════════════════════════════════════════════════ */
function gearSumOf(charId) {
  const list = gearListOf(charId);
  const o = {};
  GEAR_FX_IDS.forEach((k) => { const v = gearPct(list, k); if (v) o[k] = v; });
  return o;
}
/* 表示用のステータス（装備ぶんを足したもの） */
function statsGeared(id) {
  const st = (typeof charStats === "function") ? charStats(id) : null;
  if (!st) return st;
  const g = gearSumOf(id);
  const out = Object.assign({}, st);
  out.gear = g;
  out.atkG = Math.round(st.atk * (1 + (g.atk || 0)));
  out.hpG = st.hp;                       /* 装備にHPを上げる効果は無い */
  out.spdG = st.spd;
  return out;
}
/* 装備の効果を「札」で並べる（キャラ詳細・編成・バトルで共通に使う） */
/* ★★ 2026-09-06b 第1引数は <b>id でも、装備の一覧でも</b>よい。
   バトル中は玉2（ball.gear）をそのまま渡すと、
   オンラインで他人のキャラを見たときでも正しく出る。 */
function gearChipsHTML(charId, opt) {
  const list = Array.isArray(charId) ? charId : gearListOf(charId);
  if (!list.length) return '<span class="bdnone">なし</span>';
  const o = opt || {};
  return list.map((g) => {
    const f = GEAR_FX[g.e] || {};
    return `<span class="bdchip gchip${gearIsHigh(g) ? " hi" : ""}" style="--bc:${f.c}"
      title="${(GEAR_PART[g.p] || {}).full}：${f.nm} +${(+g.v).toFixed(2)}%">
      <img src="${gearImg(g.p)}" alt="">${f.short} +${(+g.v).toFixed(1)}%</span>`;
  }).join("") + (o.sum === false ? "" : gearSumChipsHTML(list));
}
/* 合計（同じ効果を2つ以上持っているときだけ出す） */
function gearSumChipsHTML(charId) {
  const list = Array.isArray(charId) ? charId : gearListOf(charId);
  const cnt = {};
  list.forEach((g) => { cnt[g.e] = (cnt[g.e] || 0) + 1; });
  const dup = Object.keys(cnt).filter((k) => cnt[k] >= 2);
  if (!dup.length) return "";
  return dup.map((k) => {
    const f = GEAR_FX[k] || {};
    return `<span class="bdchip gsum" style="--bc:${f.c}" title="同じ効果を${cnt[k]}か所ぶん合計しています">
      Σ ${f.short} +${(gearPct(list, k) * 100).toFixed(2)}%</span>`;
  }).join("");
}
window.statsGeared = statsGeared; window.gearChipsHTML = gearChipsHTML; window.gearSumOf = gearSumOf;

/* ── バトル中の印は<b>玉が持っているぶん</b>を見る ────────────────
   ★ オンラインでは他人のキャラも並ぶ。手元の DB.gearOn を見ると
     「相手の装備」を自分のもので描いてしまうので、必ず ball.gear を使う。 */
function gearBadgeBallHTML(ball, px) {
  const list = (ball && ball.gear) || [];
  if (!list.length) return "";
  const s = px || 14;
  const hi = list.some((g) => gearIsHigh(g));
  const nm = list.map((g) => ((GEAR_PART[g.p] || {}).nm || "") + " " + ((GEAR_FX[g.e] || {}).short || g.e)
    + " +" + (+g.v).toFixed(1) + "%").join(" / ");
  return `<span class="gbdg${hi ? " hi" : ""}" title="装備: ${nm}">`
    + list.map((g) => `<img src="${gearImg(g.p)}" style="width:${s}px;height:${s}px" alt="">`).join("")
    + `</span>`;
}
window.gearBadgeBallHTML = gearBadgeBallHTML;

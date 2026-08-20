/* ══════════════════════════════════════════════════════════════
   XEVARION ガチャ — 画面まわり（2026-08-10）

   ★ 抽選の規則はここに1行も書かない。
     プール・排出率・10連のSSR確定・限界突破・キャラ評価は、すべて
     MagiBurst/js/mb-core.js（MagiBurst と<b>同じファイル</b>）の関数を呼んでいる。
     ＝ キャラを1体足しても、両方の画面に自動で反映される。

   ★ mb-core.js の中には MagiBurst の画面用に書かれた描画関数もある
     （paintGacha / revealGacha / paintGachaStick …）。それらは
     <b>あとから同じ名前で宣言し直して上書き</b>している。関数宣言なので、
     このファイルが読み込まれた時点で中身が入れ替わる。
   ══════════════════════════════════════════════════════════════ */
"use strict";

/* いま見ているガチャ。"premium" か FESTS のキー
   ★ 2026-08-11 既定は<b>いちばん新しいキャラが引けるガチャ</b>（mb-core の newestGachaMode）。
     新キャラを足したら、開いた瞬間にそのバナーが出る。 */
let gMode = (function () {
  /* この画面では mb-boot.js が先に DB を作っているので、ここで決めてよい。
     それでも念のため、失敗したらプレミアムに落とす。 */
  try { return newestGachaMode(); } catch (e) { return "premium"; }
})();

/* MagiBurst から「?#fes2」のように飛んでくることがある（バナーを押したときなど）。
   ハッシュの指定があれば、そちらが既定より優先される。 */
(function bootMode() {
  const h = String(location.hash || "").replace("#", "");
  /* ★ 2026-08-20 GRAND DEBUT GACHA（#debut）も受ける。
     新キャラ告知の「ガチャへ行く」が gacha.html#debut で飛んでくる。 */
  if (h === "premium" || h === "debut" || (typeof isFesMode === "function" && isFesMode(h))) gMode = h;
})();

/* ══════════ mb-core の描画関数を、この画面のものに差し替える ══════════ */
function missionTick() {}                 /* ミッションは MagiBurst 側の機能なのでここでは数えない */
/* ★ 2026-08-10 結果の演出は mb-core の revealGacha（＝MagiBurst と同じもの）に任せる。
   1枚ずつ公開・SR→SSR の昇格演出・確定枠は最後、まで全部そのまま動く。
   ここで上書きしていた簡易版（グリッドを一気に出すだけ）は廃止した。
   閉じたときにこの画面を塗り直すところだけ、この画面用に差し替える。 */
function closeGres() { const g = $("#gres"); if (g) g.classList.remove("on"); paintAll(); }
function paintGachaStick() { paintPullBar(); }
function paintGacha() { paintAll(); }
/* mb-core の revealGacha が呼ぶ（MagiBurst では図鑑と編成を描き直す）。ここでは不要 */
function renderTeam() {}

/* ══════════ ウォレット ══════════
   ★ 2026-08-13 チケットは2種類（フェス専用／全ガチャ共通）。
     数字だけ並べても見分けられないので、券面のミニ絵を添える。 */
function paintWal() {
  $("#walGem").textContent = fmt(DB.orbs);
  $("#walTkt").textContent = fmt(fesTickets());
  const g = $("#walGtk"); if (g) g.textContent = fmt(gachaTickets());
  const fi = $("#walFesIc"); if (fi && !fi.innerHTML) fi.innerHTML = fesTicketSVG(13);
  const gi = $("#walGacIc"); if (gi && !gi.innerHTML) gi.innerHTML = gachaTicketSVG(13);
}

/* ══════════ ガチャえらび ══════════ */
function toggleMenu() { $("#gmenu").classList.toggle("on"); }
window.toggleMenu = toggleMenu;
function pickMode(k) {
  gMode = k;
  $("#gmenu").classList.remove("on");
  paintAll();
  window.scrollTo(0, 0);
}
window.pickMode = pickMode;

function modeDef(k) {
  /* ★ 2026-08-20 GRAND DEBUT GACHA。新キャラはここだけで引ける（フェス・プレミアムには出ない） */
  if (k === "debut") return { nm: DEBUT_NM, sub: gachaVerText() + "・新キャラ" + DEBUT_CHARS.length + "体はここだけ", c: DEBUT_C, ic: "✧" };
  /* ★ 2026-08-20c ご指定により、ガチャの画面では<b>プレミアムも英語表記</b>（PREMIUM_NM）にそろえる */
  if (k === "premium") return { nm: PREMIUM_NM, sub: "ピックアップを1体えらべる常設ガチャ", c: "#ff9d2e", ic: "🎰" };
  const f = fesDef(k);
  return { nm: f.nm, sub: fesLocked(k) ? fesOpenText(f) : "フェス限定SSR・🎫チケット優先", c: f.c, ic: "✦", soon: fesLocked(k) };
}

function paintPicker() {
  const d = modeDef(gMode);
  $("#gpName").textContent = d.nm;
  $("#gpSub").textContent = d.sub;
  $("#gpIcon").textContent = d.ic;
  $("#gpIcon").style.background = "linear-gradient(135deg," + d.c + ",#ff6f91)";
  /* 一覧は mb-core の gachaMenuList（ガチャが増えても自動でここに出る） */
  $("#gmenu").innerHTML = gachaMenuList().map((m) => {
    const on = m.k === gMode;
    return `<button class="gmi ${on ? "on" : ""} ${m.soon ? "soon" : ""}" onclick="pickMode('${m.k}')">
      <span class="gmdot" style="background:${m.c}"></span>
      <span style="flex:1;min-width:0"><b>${m.nm}</b><span>${m.sub}</span></span>
      ${on ? '<span style="color:#7b5cf0;font-weight:900">✓</span>' : ""}</button>`;
  }).join("");
}

/* ══════════ バナー ══════════ */
function paintHero() {
  /* ★ 2026-08-20 バナーは3種類（GRAND DEBUT／プレミアム／各フェス）。
     GRAND DEBUT には<b>版（Ver.）の帯</b>を添える＝どの回のキャラが入っているか一目で分かる。 */
  const src = gMode === "debut" ? debutBannerOf()
    : gMode === "premium" ? "MagiBurst/img/bn_premium_s.webp"
    : fesBannerOf(gMode);
  const d = modeDef(gMode);
  const lab = gMode === "debut" ? "DEBUT" : gMode === "premium" ? "PREMIUM" : "FEST";
  const ver = gMode === "debut"
    ? `<span class="ghver">${gachaVerText()}<small>${GACHA_VER_DATE}</small></span>` : "";
  $("#ghero").innerHTML = `<img src="${src}" alt="${d.nm}"><span class="ghlab">${lab}</span>${ver}`;
}

/* ══════════ ピックアップ／フェス限定キャラ ══════════
   ★ 2026-08-10
     ・プレミアム … いまのピックアップ1体（押すとキャラ詳細／「えらぶ」で入れ替え画面）
     ・フェス     … そのフェスの<b>限定SSRを全員</b>ならべる（押すとキャラ詳細）
       画面の下にあった「排出キャラクター」の一覧を廃止したので、
       いちばん知りたい顔ぶれ＝<b>限定キャラだけ</b>をここに出す。 */
function paintPickup() {
  const w = $("#pkwrap");
  /* ★ 2026-08-20 GRAND DEBUT GACHA。ピックアップは無く、<b>新キャラ全員が同じ確率</b>。
     フェスと同じ見た目の一覧にそろえてある（押すと性能が見られる）。 */
  if (gMode === "debut") {
    const cards = DEBUT_CHARS.map((id) => {
      const c = CHARS[id];
      if (charSecret(id)) return `<div class="fcard veil"><div class="fq">?</div><div class="fn">???</div></div>`;
      const own = !!DB.chars[id], mx = isMaxAwk(id);
      const aw = own ? Math.max(0, Math.min(MAX_AWK, DB.chars[id].awk || 0)) : 0;
      return `<button class="fcard" onclick="openDetX('${id}')" title="${c.nm} の性能を見る">
        <img src="${c.th}" alt="${c.nm}">
        <span class="fr">${mx ? "対象外" : ratePct(debutEachRate())}</span>
        <span class="fo ${own ? "ok" : "no"}">${own ? (mx ? "👑MAX" : aw ? "+" + aw + "凸" : "所持") : "未所持"}</span>
        <span class="fn">${c.nm}</span></button>`;
    }).join("");
    w.innerHTML = `<div class="pkbox" style="border-color:${DEBUT_C}55">
      <div class="pkhd" style="color:${DEBUT_C}"><span>✧ ${gachaVerText()} の新キャラ（${DEBUT_CHARS.length}体）</span>
        <span style="color:var(--txt2);font-weight:800">タップで性能</span></div>
      <div class="fgrid">${cards}</div>
      <div class="pksub" style="margin-top:9px">
        新キャラSSR <b>${DEBUT_CHARS.length}体</b>（合計10%・ピックアップなし）に加えて、
        <b>${PREMIUM_NM} のSSRも合計${ratePct(FES_PREMIUM_TOTAL)}で排出</b>されます（フェスガチャと同じしくみ）。<br>
        <b>この${DEBUT_CHARS.length}体は ${DEBUT_NM} でしか引けません</b>——
        フェスや ${PREMIUM_NM} の<b>すり抜け・10連の確定枠には出ません</b>。<br>
        次の更新で<b>新しいキャラが GRAND DEBUT に入ると</b>、この${DEBUT_CHARS.length}体は
        <b>${PREMIUM_NM} へ移り</b>、現行のキャラと同じ扱いになります。
      </div>
    </div>`;
    return;
  }
  if (gMode !== "premium") {
    const f = fesDef(gMode), locked = fesLocked(gMode);
    const cards = f.chars.map((id) => {
      const c = CHARS[id];
      /* 開催前は顔ぶれを伏せる（ガチャ側で伏せている意味がなくなるため） */
      if (locked || charSecret(id)) {
        return `<div class="fcard veil"><div class="fq">?</div><div class="fn">???</div></div>`;
      }
      const own = !!DB.chars[id], mx = isMaxAwk(id);
      /* ★ 2026-08-18 「所持」だけでなく<b>いま何凸か</b>まで出す */
      const aw = own ? Math.max(0, Math.min(MAX_AWK, DB.chars[id].awk || 0)) : 0;
      return `<button class="fcard" onclick="openDetX('${id}')" title="${c.nm} の性能を見る">
        <img src="${c.th}" alt="${c.nm}">
        <span class="fr">${mx ? "対象外" : ratePct(fesEachRate(gMode))}</span>
        <span class="fo ${own ? "ok" : "no"}">${own ? (mx ? "👑MAX" : aw ? "+" + aw + "凸" : "所持") : "未所持"}</span>
        <span class="fn">${c.nm}</span></button>`;
    }).join("");
    w.innerHTML = `<div class="pkbox" style="border-color:${f.c}55">
      <div class="pkhd" style="color:${f.c}"><span>✦ ${f.nm} 限定SSR（${f.chars.length}体）</span>
        <span style="color:var(--txt2);font-weight:800">タップで性能</span></div>
      <div class="fgrid">${cards}</div>
      <div class="pksub" style="margin-top:9px">${f.lead}。<br>${f.note}</div>
    </div>`;
    return;
  }
  const id = curPickup(), c = CHARS[id], maxed = isMaxAwk(id);
  /* ★ 2026-08-10 限界突破MAXのキャラは排出対象から外れるので、確率はどうしても 0% になる。
     以前はその 0.00% だけが出ていて「ピックアップなのに 0%？」と読めてしまったので、
     MagiBurst と同じように<b>理由</b>まで書く。 */
  w.innerHTML = `<div class="pkbox">
    <div class="pkhd"><span>✨ ピックアップ中のSSR</span>
      <span style="color:${maxed ? "#c98a10" : "#e0577f"}">${maxed ? "👑 限界突破MAX・排出対象外" : ratePct(pickupRate())}</span></div>
    <div class="pkrow">
      <img src="${c.th}" alt="${c.nm}" onclick="openDetX('${id}')" style="cursor:pointer" title="${c.nm} の性能を見る">
      <div class="pkinfo" onclick="openDetX('${id}')" style="cursor:pointer">
        <div class="pknm">${charNoText(id)} ${c.nm}</div>
        <div class="pksub">${ELEM[c.el].nm}／${c.shot === "pierce" ? "貫通" : "反射"}／${c.type}<br>
          <b>${c.ssName}</b>（${c.ssTurns}ターン）<br>
          <b style="color:${maxed ? "#c98a10" : DB.chars[id] ? "#0e7f57" : "#6f82ad"}">${dupeText(id).tx}</b></div>
      </div>
      <button class="pkbtn" onclick="openPick()">えらぶ</button>
    </div>
  </div>`;
}

/* ══════════ ピックアップをえらぶ（★ 2026-08-10 作り直し）══════════
   ・<b>絵を押した時点で選ぶ</b>。ただし押しまちがい対策に、
     <b>この画面の中で</b>「◯◯にしますか？」と確かめてから入れ替える。
     別のダイアログを重ねると、選んだキャラの絵が隠れてしまうのでそうしていない。
   ・下の「決定」「とじる」ボタンは廃止（選んだ時点で決まる／✕は右上に出しっぱなし）。
   ・右上の「i」でそのキャラの性能を見られる。 */
let _pickAsk = null;     // 確認中のキャラid（null＝確認していない）
function openPick() {
  _pickAsk = null;
  paintPickSheet();
  $("#resOv").classList.add("on");
}
window.openPick = openPick;
function paintPickSheet() {
  const cur = curPickup();
  const list = PREMIUM_CHARS.slice().reverse();
  const ask = _pickAsk && CHARS[_pickAsk] ? _pickAsk : null;
  const conf = ask ? `<div class="psconf">
      <img src="${CHARS[ask].th}" alt="">
      <div class="pci">
        <div class="pcq">ピックアップを入れ替えますか？</div>
        <div class="pcn">${charNoText(ask)} ${CHARS[ask].nm}</div>
        <div class="pcr">えらぶと ${ratePct(wouldPickRate())}（いまは ${ratePct(otherRate())}）</div>
      </div>
      <div class="pcb">
        <button class="yes" onclick="confirmPick('${ask}')">これにする</button>
        <button class="no" onclick="cancelPick()">やめる</button>
      </div>
    </div>` : "";
  $("#resCard").innerHTML = `
    <div class="pshd"><b>✦ ピックアップをえらぶ<small>絵を押すと、その場で確認してから入れ替わります</small></b>
      <button class="rtx" onclick="closeRes()" aria-label="とじる" title="とじる">✕</button></div>
    <div class="psbody">
      ${conf}
      <div class="psnow">いまのピックアップ： <b>${CHARS[cur].nm}</b>　—
        えらんだSSRだけ <b>${ratePct(wouldPickRate())}</b>、ほかのSSRは各 <b>${ratePct(otherRate())}</b>（SSRの合計は常に10%）。</div>
      <div class="cgrid">${list.map((id) => {
        const c = CHARS[id], own = !!DB.chars[id], mx = isMaxAwk(id), sec = charSecret(id);
        /* ★ 2026-08-18 一覧でも「いま何凸か」が分かるようにした。
           完凸(👑MAX)のキャラは排出対象から外れるので、ここで見分けられないと
           ピックアップに選んでから 0% だと気づくことになってしまう。 */
        return `<div class="cc s5 ${own ? "" : "noown"} ${id === ask ? "asking" : ""}" onclick="askPick('${id}')">
          <img class="${sec ? "silh" : ""}" src="${c.th}" alt="">
          <span class="ccr">SSR</span><span class="ccno">${charNoOf(id)}</span>
          <button class="ccinfo" onclick="event.stopPropagation();openDetX('${id}')" title="${c.nm} の性能を見る">i</button>
          ${id === cur ? '<span class="ccpk">PICKUP</span>' : ""}
          <div class="ccn">${charNmOf(id)}</div>
          ${dupeBadge(id)}</div>`;
      }).join("")}</div>
    </div>`;
}
/* 絵を押した ＝ まだ入れ替えない。この画面の上に確認を出すだけ */
function askPick(id) {
  if (id === curPickup()) { _pickAsk = null; paintPickSheet(); return; }   // いまのピックアップなら何もしない
  _pickAsk = id;
  paintPickSheet();
  const card = $("#resCard"); if (card) card.scrollTop = 0;   // 確認は上に出るので先頭へ
}
window.askPick = askPick;
function cancelPick() { _pickAsk = null; paintPickSheet(); }
window.cancelPick = cancelPick;
/* 確認して「これにする」を押したときだけ入れ替える */
function confirmPick(id) {
  setPickup(id);
  _pickAsk = null;
  paintPickSheet();
  paintAll();
}
window.confirmPick = confirmPick;
function closeRes() { $("#resOv").classList.remove("on"); _pickAsk = null; paintAll(); }
window.closeRes = closeRes;

/* ══════════ 説明 ══════════ */
function paintNote() {
  const s4 = STAR4_POOL.length;
  /* 🎫の案内。★ 2026-08-13 チケットは2種類になった（フェス専用／全ガチャ共通） */
  const tktLine = (gMode === "premium" || gMode === "debut")
    ? `🎫 <b>ガチャチケット</b>を持っているときは<b>チケットから先に</b>使います（1枚＝1回ぶん）。
       足りない分だけ<i class='icc ic-gem'></i>ジェムを消費します。
       <b>フェスチケットはここでは使えません</b>（フェスガチャ専用です）。`
    : `🎫 消費の順は <b>フェスチケット → ガチャチケット → <i class='icc ic-gem'></i>ジェム</b>（どちらも1枚＝1回ぶん）。
       <b>フェスチケット</b>はどのフェスでも、<b>ガチャチケット</b>はどのガチャでも使えます。`;
  if (gMode === "debut") {
    /* ★ 2026-08-20 GRAND DEBUT。SSR・SR の確率はプレミアムと同じで、変えたのは中身だけ。 */
    $("#gnote").innerHTML = `<b>新キャラSSR 合計10%</b>（${DEBUT_CHARS.length}体で等分・各 ${ratePct(debutEachRate())}）
      ／ <b>${PREMIUM_NM} のSSR 合計${ratePct(FES_PREMIUM_TOTAL)}</b>
      ／ <b>SR 合計50%</b>（${s4}体で等分・各 ${ratePct(0.50 / s4)}）／ <b>育成アイテム 35%</b>。<br>
      ${tktLine}<br>
      <b>10連は最後の1枠が SSR 確定</b>（新キャラ＋${PREMIUM_NM} のSSRをまとめた中から等確率）。
      同じキャラを引くと<b>限界突破（最大${MAX_AWK}）</b>になります。<br>
      ★ <b>キャラの排出と確定枠のしくみはフェスガチャと同じ</b>です。ちがうのは<b>育成アイテムの中身</b>——
      🎫ガチャチケット・📕超越の書・🎖️英傑の証が厚く、<b>🪭九天の玉簡</b>と<b>📘クロスの書</b>も極低確率で出ます。<br>
      ★ 所持キャラ・限界突破・<i class='icc ic-gem'></i>ジェムは <b>MagiBurst と共通</b>です。`;
  } else if (gMode === "premium") {
    $("#gnote").innerHTML = `<b>SSR 合計10%</b>（ピックアップ ${ratePct(pickupRate())}／ほかは各 ${ratePct(otherRate())}）
      ／ <b>SR 合計55%</b>（${s4}体で等分・各 ${ratePct(0.55 / s4)}）／ <b>育成アイテム 35%</b>。<br>
      ${tktLine}<br>
      <b>10連は最後の1枠がSSR確定</b>。同じキャラを引くと<b>限界突破（最大${MAX_AWK}）</b>になり、
      限界突破MAXのキャラは排出対象から外れます。<br>
      ★ 所持キャラ・限界突破・<i class='icc ic-gem'></i>ジェムは <b>MagiBurst と共通</b>です。`;
  } else {
    const f = fesDef(gMode);
    $("#gnote").innerHTML = `${f.sub}<br>
      ${tktLine}<br>
      <b>10連は最後の1枠がSSR確定</b>（このフェスの限定SSR＋${PREMIUM_NM} のSSRから等確率）。`;
  }
}

/* ★ 2026-08-10 画面下の「排出キャラクター」グリッド（paintGrid）は廃止しました。
   同じ顔ぶれが提供割合の表にも出ていて二度手間だったので、絵は提供割合の表へ移し、
   この画面にはピックアップ／フェス限定キャラだけを残しています。 */

/* ══════════ 引くボタン ══════════ */
function paintPullBar() {
  const bar = $("#pullbar"); if (!bar) return;
  /* ★ 2026-08-20 フェス券を使ってよいのは<b>フェスのときだけ</b>。
     GRAND DEBUT ではご指定どおりフェス券を使わない（gachaCost/payGacha に fes=false を渡す）。
     ここを `gMode !== "premium"` のままにすると、GRAND DEBUT でフェス券が減ってしまう。 */
  const fes = isFesMode(gMode);
  const locked = fes && fesLocked(gMode);
  /* ★ 値段の見積もりは mb-core.js の gachaCost() ひとつに任せる
     （ここで計算し直すと、実際に払う payGacha と食いちがう）。
     消費の順は フェス券 → ガチャ券 → 💎ジェム。プレミアムではフェス券は使わない。 */
  const btn = (n, cls, label) => {
    const c = gachaCost(n, fes);
    const ok = !locked && DB.orbs >= c.gems;
    /* ★ 2026-08-10 ジェムは絵文字（💎）ではなく XEVARION 共通のアイコンで出す */
    const gemIc = "<i class='icc ic-gem'></i>";
    const p = [];
    if (c.fes) p.push(`<i class="pf">F</i>${c.fes}`);
    if (c.tickets) p.push(`<i class="pg">G</i>${c.tickets}`);
    if (c.gems || !p.length) p.push(`${gemIc}${c.gems}`);
    return `<button class="pbtn ${cls}" ${ok ? "" : "disabled"} onclick="pull(${n})"><b>${label}</b><small>${p.join(" ＋ ")}</small></button>`;
  };
  bar.innerHTML = locked
    ? `<div style="grid-column:1/-1;text-align:center;font-size:12px;font-weight:900;color:#6f82ad;padding:12px">⏳ ${fesOpenText(fesDef(gMode))}</div>`
    : btn(1, "", "1回") + btn(5, "", "5連") + btn(10, "p10", "10連 SSR確定");
}
/* いま何凸かの1行（ピックアップ一覧・提供割合で共通に使う）。
   awk は DB.chars[id].awk（0〜MAX_AWK）。持っていなければ「未所持」。 */
function dupeText(id) {
  if (!DB.chars[id]) return { cls: "", tx: "未所持" };
  const a = Math.max(0, Math.min(MAX_AWK, DB.chars[id].awk || 0));
  if (a >= MAX_AWK) return { cls: "max", tx: "👑 完凸(" + MAX_AWK + ")" };
  return { cls: "have", tx: a === 0 ? "所持・0凸" : "所持・+" + a + "凸" };
}
function dupeBadge(id) {
  const d = dupeText(id);
  return '<div class="ccow ' + d.cls + '">' + d.tx + "</div>";
}

/* ★★ 2026-08-18 ピックアップが<b>すでに完凸</b>のまま回そうとしたときの確認。
   完凸したキャラはガチャの排出対象から外れる（isMaxAwk）ので、
   そのままだとピックアップ枠がまるごと無駄になり、
   SSR合計10%はほかのキャラで分け合われる。気づかずに回してしまわないよう、
   回す直前に一度だけ確かめる。フェスにはピックアップが無いので premium のときだけ。 */
async function okToPullPremium(n) {
  const id = curPickup();
  if (!isMaxAwk(id)) return true;
  const c = CHARS[id] || { nm: id };
  const pool = gachaPool();                       /* まだ完凸していないSSR */
  if (!pool.length) {
    return await uiConfirm(
      "<b>プレミアムのSSRはすべて完凸ずみ</b>です。<br>" +
      "このまま回しても<b>SSRは出ません</b>（SRと育成アイテムだけになります）。",
      { icon: "👑", title: "このまま回しますか？", ok: "それでも" + n + "回まわす", cancel: "やめる" });
  }
  const names = byCharNoDesc(pool).slice(0, 8).map((x) => CHARS[x].nm).join("・");
  const more = pool.length > 8 ? " ほか" + (pool.length - 8) + "体" : "";
  const ok = await uiConfirm(
    "ピックアップ中の <b>" + c.nm + "</b> は<b>すでに👑完凸（限界突破MAX）</b>です。<br>" +
    "完凸したキャラは<b>ガチャの排出対象から外れる</b>ので、いまピックアップ枠は<b>はたらいていません</b>" +
    "（SSR合計10%は、ほかのSSRで分け合っています）。<br><br>" +
    "ほかのキャラに変えると、その子だけ <b>" + ratePct(wouldPickRate()) + "</b> になります。<br>" +
    '<span style="font-size:11px">まだ完凸していないSSR：' + names + more + "</span>",
    { icon: "👑", title: "このまま回しますか？", ok: "このまま" + n + "回まわす", cancel: "ピックアップをえらび直す" });
  if (!ok) openPick();      /* 「えらび直す」＝そのまま選ぶ画面へ */
  return ok;
}

async function pull(n) {
  if (gMode === "debut") { doDebutGacha(n); return; }        /* ★ 2026-08-20 GRAND DEBUT */
  if (gMode !== "premium") { doFesGacha(n, gMode); return; }
  if (!(await okToPullPremium(n))) return;
  doGacha(n);
}
window.pull = pull;

/* ══════════ 結果 ══════════
   ★ 2026-08-10 ここにあった簡易版の revealGacha（結果をグリッドで一気に出すだけ）は
     <b>廃止</b>しました。いまは mb-core.js の revealGacha ＝ MagiBurst とまったく同じ
     豪華な演出（1枚ずつ公開／SR→SSR の昇格演出 RANK UP!!／確定枠は最後）が動きます。
   ★ 「もう一度（10連）」のボタンも廃止しました。結果を見たら OK でこの画面に戻ります。
     見た目（CSS）は mb-gacha-reveal.css、進行は mb-core.js の revealGacha にあります。 */

/* ══════════ キャラ詳細 ══════════
   ★ 2026-08-10 <b>mb-char-detail.js</b> へ切り出しました（図鑑と共通で使うため）。
     openDetX / closeDetX / magiBattleHTML はそちらにあります。 */

/* ══════════════════════════════════════════════════════════════
   提供割合（★ 2026-08-10 この画面用に作り直し）

   ★ 数字は mb-core.js の関数から取る（pickupRate / otherRate / fesEachRate …）＝
     抽選の規則はここに1行も書かない。MagiBurst と食いちがわない。
   ★ mb-core の openRates（文字だけの表）は使わない。理由は3つ。
       ① 確率がキャラ名よりずっと右に離れていて読みづらかった
       ② キャラの絵が無く、名前だけで誰のことか分からなかった
       ③ 閉じるボタンが表のいちばん下にしか無かった
   ══════════════════════════════════════════════════════════════ */
/* キャラ1行（絵＋名前＋確率）。押すとそのキャラの詳細が開く
   ★ 確率は<b>名前とおなじ行の、名前のすぐ右</b>に置く。
     表の列にすると、下の説明文（属性・撃種…）のほうが長いぶんだけ
     確率が右へ押し出されて「名前とかけ離れた場所に数字がある」状態になっていた。 */
function rateCharRow(id, rate, tag) {
  const c = CHARS[id]; if (!c) return "";
  const sec = charSecret(id), mx = isMaxAwk(id), own = !!DB.chars[id];
  const nm = sec ? "???" : c.nm;
  const sub = sec ? "登場前" : [ELEM[c.el].nm, c.shot === "pierce" ? "貫通" : "反射", dupeText(id).tx].join("・");
  return `<div class="rtrow ${sec ? "silh" : ""}" ${sec ? "" : `onclick="openDetX('${id}')"`}>
    <img src="${c.th}" alt="" loading="lazy" class="${isStar5(id) ? "s5" : ""}">
    <span class="rti">
      <span class="rtl"><b class="rtnm">${charNoOf(id)} ${nm}</b><i class="rtp">${mx ? "—" : ratePct(rate)}</i></span>
      <span class="rtsub">${sub}${tag ? "・" + tag : ""}</span>
    </span>
    ${sec ? "" : '<span class="rtar">›</span>'}
  </div>`;
}
function rateHeadRow(tx, rate, c) {
  return `<div class="rthead" style="${c ? "color:" + c : ""}"><span>${tx}</span>${rate ? "<i>" + rate + "</i>" : ""}</div>`;
}
function rateNoteRow(tx) { return `<div class="rtnote">${tx}</div>`; }
/* ★ 2026-08-13 🎫は2種類になった。提供割合の下に出す共通の注記。 */
const TKT_NOTE = "※ 🎫チケットは<b>2種類</b>あります。"
  + "<b>フェスチケット</b>は<b>フェスガチャ専用</b>（どのフェスでも使えます）、"
  + "<b>ガチャチケット</b>は<b>プレミアムでも各フェスでも</b>使えます（どちらも1枚＝1回ぶん）。<br>"
  + "回すときは <b>フェスチケット → ガチャチケット → <i class='icc ic-gem'></i>ジェム</b> の順に消費します"
  + "（フェス専用のほうから先に使わないと、余ってしまうため）。"
  + "XEVARION の📧メールやジェムショップで受け取ったぶんは<b>その場ですぐ使えます</b>。";
/* 育成アイテム。★ アイコンは MagiBurst と同じ自作SVG（itemIcon）にそろえてある
   （以前はこの画面だけ 🍐 📕 の絵文字で、MagiBurst の絵と食いちがっていた） */
function rateItemRows(total, table) {
  const tb = table || G_ITEM_TABLE;
  const sum = tb.reduce((a, b) => a + b.p, 0) || 1;
  return tb.map((it) => {
    /* ★ 2026-08-11 🎫フェスチケットだけ大きく見えていたのを、ほかのアイコンと同じ大きさにそろえる。
       fesTicketSVG(s) は<b>横長</b>（幅 = s × 1.55）なので、s に 28 を渡すと 43×28 になり、
       28×28 の育成アイテムより<b>横に1.5倍</b>はみ出していた。
       ほかと同じ「幅28px」に収まるよう、逆算した値（28 ÷ 1.55 ≒ 18）を渡す。 */
    /* ★ 2026-08-20 🎫は2種類。フェス券とガチャ券で券面がちがうので、絵も出し分ける */
    const ic = it.ticket ? fesTicketSVG(18) : it.gticket ? gachaTicketSVG(18) : itemIcon(it.item, 28);
    return `<div class="rtrow item">
      <span class="rtic">${ic}</span>
      <span class="rti"><span class="rtl"><b class="rtnm">${it.nm}${it.n > 1 ? " ×" + it.n : ""}</b>
        <i class="rtp">${ratePct(total * (it.p / sum))}</i></span></span>
    </div>`;
  }).join("");
}
function openRatesX() {
  const rows = [];
  const fes = isFesMode(gMode);
  const d = modeDef(gMode);
  $("#rateTtl").innerHTML = `提供割合<small>${d.nm}${gMode === "debut" ? "　" + gachaVerText() : ""}</small>`;
  if (gMode === "debut") {
    /* ★ 2026-08-20 GRAND DEBUT GACHA。SSR/SR の確率はプレミアムと同じ、中身だけがちがう。 */
    rows.push(rateHeadRow("<i class='icc ic-gem'></i> " + DEBUT_NM + " " + gachaVerText()
      + "（1回 5 ／ 5連 25 ／ 10連 50・SSR確定）", GACHA_VER_DATE, DEBUT_C));
    rows.push(rateHeadRow("✨ 新キャラSSR 排出（合計・" + DEBUT_CHARS.length + "体で等分）", "10%"));
    byCharNoDesc(DEBUT_CHARS).forEach((id) => rows.push(rateCharRow(id, debutEachRate(), "GRAND DEBUT 限定")));
    /* ★ 2026-08-20c フェスと同じしくみ＝道中でも PREMIUM SELECT GACHA のSSRが合計5%で出る */
    const dprem = byCharNoDesc(gachaPool().filter((id) => debutPool().indexOf(id) < 0));
    const dpEach = dprem.length ? FES_PREMIUM_TOTAL / dprem.length : 0;
    rows.push(rateHeadRow("✨ " + PREMIUM_NM + " のSSR（合計）", ratePct(FES_PREMIUM_TOTAL)));
    dprem.forEach((id) => rows.push(rateCharRow(id, dpEach, PREMIUM_NM)));
    rows.push(rateHeadRow("⭐ SR（合計・" + STAR4_POOL.length + "体で等分）", "50%"));
    STAR4_POOL.forEach((id) => rows.push(rateCharRow(id, 0.50 / STAR4_POOL.length)));
    rows.push(rateHeadRow("🎁 育成アイテム（合計）", "35%"));
    rows.push(rateItemRows(0.35, D_ITEM_TABLE));
    const dsure = byCharNoDesc(debutSurePool());
    rows.push(rateHeadRow("🎯 10連の SSR 確定枠（最後の1枠・" + dsure.length + "体から等確率）", "", DEBUT_C));
    dsure.forEach((id) => rows.push(rateCharRow(id, dsure.length ? 1 / dsure.length : 0,
      DEBUT_CHARS.indexOf(id) >= 0 ? "GRAND DEBUT 限定" : PREMIUM_NM)));
    rows.push(rateNoteRow("※ <b>ピックアップはありません</b>。新キャラSSR 合計10%を排出対象で等分します。"));
    rows.push(rateNoteRow("※ <b>キャラの排出と確定枠のしくみはフェスガチャと同じ</b>です。"
      + "道中でも <b>" + PREMIUM_NM + " のSSRが合計 " + ratePct(FES_PREMIUM_TOTAL) + "</b> で出て、"
      + "<b>確定枠は新キャラと " + PREMIUM_NM + " のSSRをまとめた " + dsure.length + "体から全員おなじ確率</b>です"
      + "（限界突破MAXのキャラは除外）。"));
    rows.push(rateNoteRow("※ <b>この" + DEBUT_CHARS.length + "体は " + DEBUT_NM + " でしか引けません</b>。"
      + "フェスガチャ・" + PREMIUM_NM + " の<b>すり抜け（他の SSR 枠）にも、10連の確定枠にも出ません</b>。"));
    rows.push(rateNoteRow("※ <b>次の更新で新しいキャラが GRAND DEBUT に入ると</b>、この" + DEBUT_CHARS.length
      + "体は<b>" + PREMIUM_NM + " へ移り</b>、現行のキャラと同じ扱いになります"
      + "（そのときバナーの版は <b>" + gachaVerText() + " → Ver.2.0</b> のように上がります）。"));
    rows.push(rateNoteRow("※ <b>🎫フェスチケットはこのガチャでは使えません</b>（フェスガチャ専用）。"
      + "<b>🎫ガチャチケット</b>は使えます（1枚＝1回ぶん）。消費は <b>ガチャチケット → <i class='icc ic-gem'></i>ジェム</b> の順です。"));
    rows.push(rateNoteRow("※ ちがうのは<b>育成アイテムの中身</b>だけです——"
      + "🎫ガチャチケット・📕超越の書・🎖️英傑の証を厚くし、"
      + "<b>🪭九天の玉簡</b>と<b>📘クロスの書</b>を極低確率で入れてあります。"));
  } else if (fes) {
    const f = fesDef(gMode);
    rows.push(rateHeadRow("✨ SSR 排出（合計）", "10%", f.c));
    /* ★ 2026-08-11 並びは番号の新しい順 */
    byCharNoDesc(f.chars).forEach((id) => rows.push(rateCharRow(id, fesEachRate(gMode), "フェス限定SSR")));
    const fprem = byCharNoDesc(gachaPool().filter((id) => fesPool(gMode).indexOf(id) < 0));
    const fpEach = fprem.length ? FES_PREMIUM_TOTAL / fprem.length : 0;
    rows.push(rateHeadRow("✨ " + PREMIUM_NM + " のSSR（合計）", ratePct(FES_PREMIUM_TOTAL)));
    fprem.forEach((id) => rows.push(rateCharRow(id, fpEach, PREMIUM_NM)));
    rows.push(rateHeadRow("⭐ SR（合計・" + STAR4_POOL.length + "体で等分）", "50%"));
    STAR4_POOL.forEach((id) => rows.push(rateCharRow(id, 0.50 / STAR4_POOL.length)));
    rows.push(rateHeadRow("🎁 育成アイテム（合計）", "35%"));
    rows.push(rateItemRows(0.35));
    const sure = byCharNoDesc(fesSurePool(gMode));
    rows.push(rateHeadRow("🎯 10連のSSR確定枠（最後の1枠・" + sure.length + "体から等確率）", "", f.c));
    sure.forEach((id) => rows.push(rateCharRow(id, sure.length ? 1 / sure.length : 0, CHARS[id].fes ? "フェス限定SSR" : PREMIUM_NM)));
    rows.push(rateNoteRow("※ <b>ピックアップはありません</b>。フェス限定SSRの合計10%を排出対象で等分します。"));
    rows.push(rateNoteRow(TKT_NOTE));
  } else {
    const pick = curPickup();
    rows.push(rateHeadRow("<i class='icc ic-gem'></i> " + PREMIUM_NM + "（1回 5 ／ 5連 25 ／ 10連 50・SSR確定）", "", "#d97800"));
    rows.push(rateHeadRow("✨ SSR 排出（合計）", "10%"));
    /* ★ 2026-08-11 ピックアップをいちばん上に、そのほかは番号の新しい順に */
    rateOrder(PREMIUM_CHARS, pick).forEach((id) => {
      const on = id === pick;
      rows.push(rateCharRow(id, on ? pickupRate() : otherRate(), on ? "<b style='color:#e0405e'>PICKUP</b>" : "SSR ガチャ限定"));
    });
    rows.push(rateHeadRow("⭐ SR（合計・" + STAR4_POOL.length + "体で等分）", "55%"));
    STAR4_POOL.forEach((id) => rows.push(rateCharRow(id, 0.55 / STAR4_POOL.length)));
    rows.push(rateHeadRow("🎁 育成アイテム（合計）", "35%"));
    rows.push(rateItemRows(0.35));
    /* ★ 2026-08-11 フェスガチャと同じく、10連の確定枠の中身も一覧で出す
       （これまでは注意書きに「全員おなじ確率」と書いてあるだけだった）。 */
    const psure = byCharNoDesc(gachaPool());
    rows.push(rateHeadRow("🎯 10連のSSR確定枠（最後の1枠・" + psure.length + "体から等確率）", "", "#d97800"));
    psure.forEach((id) => rows.push(rateCharRow(id, psure.length ? 1 / psure.length : 0,
      id === pick ? "<b style='color:#e0405e'>PICKUP</b>" : "SSR ガチャ限定")));
    rows.push(rateNoteRow("※ <b>10連は「最後の1枠」がSSR確定</b>です（前半9回も通常抽選なので、そこでもSSRは出ます）。<b>確定枠は排出対象のSSRがすべて同じ確率</b>で、<b>ピックアップの優遇はありません</b>（限界突破MAXのキャラは除外）。"));
    rows.push(rateNoteRow("※ 限界突破MAX（👑）のキャラは排出対象から外れ、その分は残りのSSRに配分されます（SSR合計は常に10%）。"));
    rows.push(rateNoteRow(TKT_NOTE));
  }
  rows.push(rateNoteRow("※ 同じキャラを引くと<b>限界突破</b>（最大" + MAX_AWK + "）になります。所持キャラ・限界突破・<i class='icc ic-gem'></i>ジェムは <b>MagiBurst と共通</b>です。"));
  rows.push(rateNoteRow("※ キャラの行を押すと、そのキャラの<b>性能</b>が見られます。"));
  $("#rateTbl").innerHTML = rows.join("");
  $("#rateCard").scrollTop = 0;
  $("#rateOv").classList.add("on");
}
window.openRatesX = openRatesX;
function closeRatesX() { $("#rateOv").classList.remove("on"); }
window.closeRatesX = closeRatesX;

/* ══════════ 描き直し ══════════ */
function paintAll() {
  paintWal(); paintPicker(); paintHero(); paintPickup(); paintNote(); paintPullBar();
}
window.addEventListener("xeva:change", () => { paintWal(); paintPullBar(); });
/* 💎ジェム・🎫チケットは XEVARION 共通ウォレット。別タブや同期で動いたら値段表示もそろえる */
window.addEventListener("xeva:gem", () => { paintWal(); paintPullBar(); });
window.addEventListener("xeva:ticket", () => { paintWal(); paintPullBar(); });
window.addEventListener("xeva:festicket", () => { paintWal(); paintPullBar(); });
paintAll();

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
/* ★★ 2026-08-29 ご指定により、最初に開くのは<b>開催中の 極彩祭・極華祭・極煌祭</b>。
   開催中のものが無いときだけ「いちばん新しいキャラが引けるガチャ」に落ちる（firstGachaMode）。 */
let gMode = (function () {
  /* この画面では mb-boot.js が先に DB を作っているので、ここで決めてよい。
     それでも念のため、失敗したらプレミアムに落とす。 */
  try { return firstGachaMode(); } catch (e) { return "premium"; }
})();

/* MagiBurst から「?#fes2」のように飛んでくることがある（バナーを押したときなど）。
   ハッシュの指定があれば、そちらが既定より優先される。 */
(function bootMode() {
  const h = String(location.hash || "").replace("#", "");
  /* ★ 2026-08-20 GRAND DEBUT GACHA（#debut）も受ける。
     新キャラ告知の「ガチャへ行く」が gacha.html#debut で飛んでくる。 */
  /* ★ 2026-08-26 版ちがいの GRAND DEBUT（#debut:3.0）も受ける。#debut は「いまの版」 */
  if (h === "premium" || (typeof isDebutMode === "function" && isDebutMode(h))
      || (typeof isFesMode === "function" && isFesMode(h))) gMode = h;
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
/* ★★ 2026-09-06 せまい画面むけの短い書きかた。
   4枠を1列に並べると、6桁の数字は枠から出てしまう。
   1,000 未満はそのまま／それ以上は K・M にまとめる（44.0K のように小数1桁まで）。
   ★ 画面が広いときは<b>これまでどおり</b>桁つきで出す。 */
function walFmt(n) {
  n = Math.max(0, Math.round(n || 0));
  const narrow = (typeof matchMedia === "function") && matchMedia("(max-width:560px)").matches;
  if (!narrow || n < 1000) return fmt(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 100000 ? 1 : 0) + "K";
  return (n / 1000000).toFixed(1) + "M";
}

function paintWal() {
  $("#walGem").textContent = walFmt(DB.orbs);
  $("#walTkt").textContent = walFmt(fesTickets());
  const g = $("#walGtk"); if (g) g.textContent = walFmt(gachaTickets());
  const fi = $("#walFesIc"); if (fi && !fi.innerHTML) fi.innerHTML = fesTicketSVG(13);
  const gi = $("#walGacIc"); if (gi && !gi.innerHTML) gi.innerHTML = gachaTicketSVG(13);
  /* ★★ 2026-08-30 💠結晶（完凸したプレミアムのキャラが出るともらえる） */
  const cw = $("#walCryWrap"), cb = $("#walCry"), ci = $("#walCryIc");
  if (cb) cb.textContent = walFmt(crystGet());
  if (ci && !ci.innerHTML) ci.innerHTML = crystIcon(16);
  if (cw) cw.style.display = "";
}

/* ══════════ ガチャえらび ══════════ */
function toggleMenu() { $("#gmenu").classList.toggle("on"); }
window.toggleMenu = toggleMenu;
function pickMode(k) {
  gMode = k;
  $("#gmenu").classList.remove("on");
  /* ★★ 2026-08-29 押したガチャの NEW マークは、その場で消す（次の更新まで出ない） */
  try { markGachaSeen(k); } catch (e) {}
  paintAll();
  window.scrollTo(0, 0);
  /* ★★ 2026-09-13c 切りかえた先のガチャにまだ見ていない紹介があれば 1回だけ流す */
  try { nciMaybeAuto(); } catch (e) {}
}
window.pickMode = pickMode;

function modeDef(k) {
  /* ★ 2026-08-20 GRAND DEBUT GACHA。新キャラはここだけで引ける（フェス・プレミアムには出ない）
     ★★ 2026-08-26 版ごとに10日間。掲載中の版が無いあいだは<b>スタンバイ</b>（引けない）。 */
  if (isDebutMode(k)) {
    const v = debutVerOfMode(k);
    if (!v) return { nm: DEBUT_NM, ic: "✧", c: DEBUT_C, soon: true,
      sub: "スタンバイ中（次のバージョンの準備中です）" };
    return { nm: DEBUT_NM, ic: "✧", c: DEBUT_C, ver: v,
      sub: gachaVerText(v) + "・新キャラ" + v.chars.length + "体はここだけ／あと" + debutDaysLeft(v) + "日"
        /* ★★ 2026-08-26b 版ごとに<b>初回の10連が無料</b>（ご指定）。1日1回の無料単発とは別枠。 */
        + (debutFree10Left(k) > 0 ? "／🎁 初回10連 無料" : "")
        + (debutFreeLeft(k) > 0 ? "／🎁 1日1回無料の単発あり" : "") };
  }
  /* ★ 2026-08-20c ご指定により、ガチャの画面では<b>プレミアムも英語表記</b>（PREMIUM_NM）にそろえる */
  if (k === "premium") return { nm: PREMIUM_NM, sub: "ピックアップを1体えらべる常設ガチャ", c: "#ff9d2e", ic: "🎰" };
  /* ★★ 2026-08-28 Festival Archive GACHA（終わったフェスの限定SSRを引き直せる常設ガチャ） */
  if (k === ARCHIVE_KEY) {
    const n = archiveChars().length;
    return { nm: ARCHIVE_NM, ic: "🗂", c: fesDef(k).c, soon: !n,
      sub: n ? "封入 " + n + "体／属性ごとに1体ずつピックアップをえらべます"
             : "封入されたキャラクターがまだいません" };
  }
  const f = fesDef(k);
  /* ★★ 2026-08-29 極彩祭・極華祭・極煌祭・戦姫祭は<b>🎫フェス券が使えない</b>ので、
     ここの1行にもそう書く（gachaMenuList の sub とそろえること）。 */
  return { nm: f.nm, ic: "✦", c: f.c, soon: fesLocked(k),
    sub: fesLocked(k) ? fesOpenText(f)
      /* ★★ 2026-09-17g 極◯祭は今回の残り日数（gachaMenuList とそろえる） */
      : f.monthly ? (f.noFesTicket ? "限定キャラクター・🎫ガチャ券のみ" : "限定キャラクター・🎫チケット優先") + "／" + fesMonthlyLeftText(f)
      : (fesTimed(f) ? "フェス限定SSR・🎫チケット優先／あと" + fesDaysLeft(k) + "日"
        /* ★★ 2026-09-13 無期限開催（perm）は「あと◯日」でなくそう書く */
        : (fesPerm(f) ? (f.noFesTicket ? "限定キャラクター・🎫ガチャ券のみ／無期限開催"
                                       : "フェス限定SSR・🎫チケット優先／無期限開催")
        : (f.noFesTicket ? "限定キャラクター・🎫ガチャ券のみ"
                         : "限定キャラクター・🎫チケット優先"))) };
}

function paintPicker() {
  const d = modeDef(gMode);
  $("#gpName").textContent = d.nm;
  $("#gpSub").textContent = d.sub;
  $("#gpIcon").textContent = d.ic;
  $("#gpIcon").style.background = "linear-gradient(135deg," + d.c + ",#ff6f91)";
  /* 一覧は mb-core の gachaMenuList（ガチャが増えても自動でここに出る）
     ★★ 2026-08-29 更新されてからまだ一度も開いていないガチャには <b>NEW</b> を付ける。 */
  const list = gachaMenuList();
  $("#gmenu").innerHTML = list.map((m) => {
    const on = m.k === gMode;
    return `<button class="gmi ${on ? "on" : ""} ${m.soon ? "soon" : ""}" onclick="pickMode('${m.k}')">
      <span class="gmdot" style="background:${m.c}"></span>
      <span style="flex:1;min-width:0"><b>${m.nm}${m.isNew ? '<i class="gmnew">NEW</i>' : ""}</b><span>${m.sub}</span></span>
      ${on ? '<span style="color:#7b5cf0;font-weight:900">✓</span>' : ""}</button>`;
  }).join("");
  /* ★ 一覧を開くボタンにも「NEW が何本あるか」を出す（開かないと気づけないため） */
  const nNew = list.filter((m) => m.isNew && m.k !== gMode).length;
  const bd = $("#gpNew");
  if (bd) { bd.textContent = nNew ? "NEW " + nNew : ""; bd.style.display = nNew ? "" : "none"; }
}

/* ══════════ バナー ══════════ */
function paintHero() {
  /* ★ 2026-08-20 バナーは3種類（GRAND DEBUT／プレミアム／各フェス）。
     GRAND DEBUT には<b>版（Ver.）の帯</b>を添える＝どの回のキャラが入っているか一目で分かる。 */
  const dv = isDebutMode(gMode) ? debutVerOfMode(gMode) : null;
  const src = isDebutMode(gMode) ? debutBannerOf()
    : gMode === "premium" ? "MagiBurst/img/bn_premium_s.webp"
    : fesBannerOf(gMode);
  const d = modeDef(gMode);
  const lab = isDebutMode(gMode) ? "DEBUT" : gMode === "premium" ? "PREMIUM"
    : gMode === ARCHIVE_KEY ? "ARCHIVE" : "FEST";
  /* ★★ 2026-08-26 版が2本並ぶことがあるので、帯には<b>その版</b>の番号と公開日を出す */
  const ver = dv
    ? `<span class="ghver">${gachaVerText(dv)}<small>${dv.date}</small></span>` : "";
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
  if (isDebutMode(gMode)) {
    const dv = debutVerOfMode(gMode);
    if (!dv) {
      w.innerHTML = `<div class="pkbox" style="border-color:${DEBUT_C}55">
        <div class="pkhd" style="color:${DEBUT_C}"><span>✧ ${DEBUT_NM}</span></div>
        <div class="pknote">いまは<b>スタンバイ中</b>です。次のバージョンの新キャラがそろうと、また開きます。<br>
          前のバージョンのキャラは、公開から<b>${DEBUT_DAYS}日</b>で
          <b>${PREMIUM_NM}</b> へ移り、そこで引けるようになっています。</div>
      </div>`;
      return;
    }
    const dchars = debutCharsOfMode(gMode);
    const cards = dchars.map((id) => {
      const c = CHARS[id];
      if (charSecret(id)) return `<div class="fcard veil"><div class="fq">?</div><div class="fn">???</div></div>`;
      const own = !!DB.chars[id], mx = isMaxAwk(id);
      const aw = own ? Math.max(0, Math.min(MAX_AWK, DB.chars[id].awk || 0)) : 0;
      return `<button class="fcard" onclick="openDetX('${id}')" title="${c.nm} の性能を見る">
        <img src="${c.th}" alt="${c.nm}">
        <span class="fr">${mx ? "対象外" : ratePct(debutEachRateOf(gMode))}</span>
        <span class="fo ${own ? "ok" : "no"}">${own ? (mx ? "👑MAX" : aw ? "+" + aw + "凸" : "所持") : "未所持"}</span>
        <span class="fn">${c.nm}</span></button>`;
    }).join("");
    w.innerHTML = `<div class="pkbox" style="border-color:${DEBUT_C}55">
      <div class="pkhd" style="color:${DEBUT_C}"><span>✧ ${gachaVerText(dv)} の新キャラ（${dchars.length}体）</span>
        <span style="color:var(--txt2);font-weight:800">タップで性能</span></div>
      <div class="fgrid">${cards}</div>
      <div class="pksub" style="margin-top:9px">
        新キャラSSR <b>${dchars.length}体</b>（合計${ratePct(DEBUT_S5_TOTAL)}・ピックアップなし）に加えて、
        <b>${PREMIUM_NM} のSSRも合計${ratePct(FES_PREMIUM_TOTAL)}で排出</b>されます（フェスガチャと同じしくみ）。<br>
        ${/* ★★ 2026-08-26b 版ごとに初回の10連が無料（ご指定）。1日1回の無料単発とは別枠。 */""}
        🎁 <b>この版の初回10連は無料</b>です（🎫チケットも<i class='icc ic-gem'></i>ジェムも減りません。
        <b>最後の1枠のSSR確定つき</b>）。${debutFree10Left(gMode) > 0
          ? "<b style='color:" + DEBUT_C + "'>まだ使っていません。</b>"
          : "この版のぶんは使いました。"}<br>
        🎁 <b>1日1回、単発を無料で引けます</b>（🎫チケットも<i class='icc ic-gem'></i>ジェムも減りません）。
        <b>どちらも版ごとに1回ずつ</b>なので、2本並んでいるときは2回ぶんもらえます。<br>
        <b>この${dchars.length}体は ${DEBUT_NM} ${gachaVerText(dv)} でしか引けません</b>——
        フェスや ${PREMIUM_NM} の<b>すり抜け・10連の確定枠には出ません</b>。<br>
        ${/* ★★ 2026-08-26 10日ルール（ご指定）。いつまで並ぶのかを必ず書く。 */""}
        ⏳ この版は <b>${dv.date} から${DEBUT_DAYS}日間</b>（あと<b>${debutDaysLeft(dv)}日</b>）。
        期間が終わると、この${dchars.length}体は<b>自動で ${PREMIUM_NM} へ移り</b>、
        現行のキャラと同じ扱いになります。
      </div>
    </div>`;
    return;
  }
  /* ══ ★★ 2026-08-28 Festival Archive GACHA ══
     属性ごとに1体ずつ（火・水・木・光・闇）ピックアップをえらべる。
     ★ えらべる顔ぶれは「登場から FES_ARCHIVE_DAYS 日を過ぎたフェス」の限定SSRだけ。 */
  if (gMode === ARCHIVE_KEY) {
    const f = fesDef(ARCHIVE_KEY);
    const all = archiveChars();
    if (!all.length) {
      w.innerHTML = `<div class="pkbox" style="border-color:${f.c}55">
        <div class="pkhd" style="color:${f.c}"><span>🗂 ${ARCHIVE_NM}</span></div>
        <div class="pknote">まだ<b>封入されたキャラクターがいません</b>。<br>
          各フェスガチャは<b>登場から${FES_DAYS}日</b>で終わり、
          <b>${FES_ARCHIVE_DAYS}日</b>を過ぎたフェスのキャラクターがここへ封入されます。</div>
      </div>`;
      return;
    }
    const cards = ARCHIVE_ELS.map((el) => {
      const id = archivePickOf(el);
      const n = archiveByEl(el).length;
      if (!id) {
        return `<div class="fcard veil"><div class="fq">—</div><div class="fn">${ELEM[el].nm}属性なし</div></div>`;
      }
      const c = CHARS[id], own = !!DB.chars[id], mx = isMaxAwk(id);
      const aw = own ? Math.max(0, Math.min(MAX_AWK, DB.chars[id].awk || 0)) : 0;
      return `<button class="fcard" onclick="openPickArc('${el}')" title="${ELEM[el].nm}属性のピックアップをえらぶ">
        <img src="${c.th}" alt="${c.nm}">
        <span class="fr">${mx ? "対象外" : ratePct(PICK_ARCHIVE)}</span>
        <span class="fo ${own ? "ok" : "no"}">${own ? (mx ? "👑MAX" : aw ? "+" + aw + "凸" : "所持") : "未所持"}</span>
        <span class="fn">${ELEM[el].nm}・${c.nm}${n > 1 ? "（他" + (n - 1) + "体）" : ""}</span></button>`;
    }).join("");
    w.innerHTML = `<div class="pkbox" style="border-color:${f.c}55">
      <div class="pkhd" style="color:${f.c}"><span>🗂 ピックアップ（属性ごとに1体・計5体）</span>
        <span style="color:var(--txt2);font-weight:800">タップでえらぶ</span></div>
      <div class="fgrid">${cards}</div>
      <div class="pksub" style="margin-top:9px">
        えらんだ<b>5体が各 ${ratePct(PICK_ARCHIVE)}</b>で排出されます（合計 ${ratePct(PICK_ARCHIVE * 5)}）。
        残りの <b>${ratePct(fillTotalOfMode(ARCHIVE_KEY))}</b> は <b>${PREMIUM_NM} のSSR</b>が等確率で受け取ります
        （SSRの合計はどのガチャも <b>${ratePct(SSR_TOTAL)}</b>）。<br>
        いま封入されているのは <b>${all.length}体</b>です。
        各フェスガチャは<b>登場から${FES_DAYS}日</b>で終わり、<b>${FES_ARCHIVE_DAYS}日</b>を過ぎた時点で
        そのフェスのキャラクターがここへ封入されます。<br>
        ★ <b>極彩祭・極華祭・極煌祭のキャラクターは封入されません</b>
        （あちらはフェスガチャではなく、毎月まわってくる限定キャラクターのガチャです）。
      </div>
    </div>`;
    return;
  }
  if (gMode !== "premium") {
    const f = fesDef(gMode);
    /* ★★ 2026-08-28 「まだ始まっていない（fesSoon）」ときだけ顔ぶれを伏せる。
       配信が終わったフェスは、もう見たことがあるので伏せない。 */
    /* ★★ 2026-09-17d 毎月の極◯祭は期間外でも ? で伏せない（ご指定）。伏せるのは openAt の前だけ */
    const locked = fesVeiled(gMode);
    /* ★★ 2026-09-08 表紙のカードの確率が<b>全員同じ</b>になっていた（fesEachRate）。
       実際の抽選は 1体ずつちがう（pickRateOf）ので、古いキャラも 1.2% と出ていた。
       ★ 提供割合の表と同じ <b>pickRateOf(gMode, id)</b> を見ること。 */
    const _newIds = (typeof fesNewIds === "function") ? fesNewIds(gMode) : (f.newChars || []);
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
        <span class="fr">${mx ? "対象外" : ratePct(pickRateOf(gMode, id))}</span>
        ${_newIds.indexOf(id) >= 0 ? '<span class="fnew">NEW</span>' : ""}
        <span class="fo ${own ? "ok" : "no"}">${own ? (mx ? "👑MAX" : aw ? "+" + aw + "凸" : "所持") : "未所持"}</span>
        <span class="fn">${c.nm}</span></button>`;
    }).join("");
    w.innerHTML = `<div class="pkbox" style="border-color:${f.c}55">
      <div class="pkhd" style="color:${f.c}"><span>✦ ${f.nm} 限定SSR（${f.chars.length}体）</span>
        <span style="color:var(--txt2);font-weight:800">タップで性能</span></div>
      <div class="fgrid">${cards}</div>
      <div class="pksub" style="margin-top:9px">${f.lead}。<br>${f.note}
        ${fesTimed(f) ? (fesEnded(gMode)
          ? `<br>⏳ <b>このフェスの配信は終了しました</b>（${fesPeriodText(gMode)}）。
             この${f.chars.length}体は <b>${ARCHIVE_NM}</b> で引けます。`
          : `<br>⏳ このフェスは ${fesPeriodText(gMode)}（あと<b>${fesDaysLeft(gMode)}日</b>）。
             ${fesArchiveText(gMode)}、この${f.chars.length}体は
             <b>${ARCHIVE_NM}</b> にも封入されます${fesArchived(gMode) ? "（<b>封入ずみ</b>）" : ""}。`)
          : (fesPerm(f) ? `<br>⏳ このフェスは <b>無期限開催</b>です（配信終了はありません）。` : "")}
        ${f.monthly && fesMonthlyLeft(f) ? `<br>⏳ <b>${fesMonthlyLeftText(f)}</b>。次は ${fesNextMonthlyText(f)}です。` : ""}
      </div>
    </div>`;
    return;
  }
  const id = curPickup(), c = CHARS[id], maxed = isMaxAwk(id);
  /* ★★ 2026-08-30 完凸していても<b>排出は止まらない</b>（PREMIUM SELECT のキャラだから）。
     出たときはキャラのかわりに 💠結晶が CRYST_SSR 個もらえる。
     以前ここに出していた「排出対象外」は、いまは正しくないので出さない。 */
  w.innerHTML = `<div class="pkbox">
    <div class="pkhd"><span>✨ ピックアップ中のSSR</span>
      <span style="color:${maxed ? "#8e6bff" : "#e0577f"}">${ratePct(pickupRate())}${maxed ? "（👑完凸 → " + crystIcon(13) + "結晶+" + CRYST_SSR + "）" : ""}</span></div>
    <div class="pkrow">
      <img src="${c.th}" alt="${c.nm}" onclick="openDetX('${id}')" style="cursor:pointer" title="${c.nm} の性能を見る">
      <div class="pkinfo" onclick="openDetX('${id}')" style="cursor:pointer">
        <div class="pknm">${charNoText(id)} ${c.nm}</div>
        <div class="pksub">${typeof elemNameOf === "function" ? elemNameOf(c) : ELEM[c.el].nm}／${c.shot === "pierce" ? "貫通" : "反射"}／${c.type}<br>
          <b>${c.ssName}</b>（${fbTurnsText(c)}ターン）<br>
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
  _pickAsk = null; _arcEl = null;
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
        えらんだSSRだけ <b>${ratePct(wouldPickRate())}</b>、ほかのSSRは各 <b>${ratePct(otherRate())}</b>（SSRの合計は常に${ratePct(SSR_TOTAL)}）。</div>
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
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-28 Festival Archive GACHA のピックアップ（属性ごとに1体）
   ★ 仕組みは PREMIUM のピックアップとまったく同じ（押す → 確認 → 入れ替え）。
     ちがうのは「属性ごとに1枠ずつある」ことだけ。
   ══════════════════════════════════════════════════════════════ */
let _arcEl = null;
function openPickArc(el) {
  _arcEl = el; _pickAsk = null;
  paintArcSheet();
  $("#resOv").classList.add("on");
}
window.openPickArc = openPickArc;
function paintArcSheet() {
  const el = _arcEl, list = archiveByEl(el), cur = archivePickOf(el);
  const ask = _pickAsk && CHARS[_pickAsk] && list.indexOf(_pickAsk) >= 0 ? _pickAsk : null;
  const conf = ask ? `<div class="psconf">
      <img src="${CHARS[ask].th}" alt="">
      <div class="pci">
        <div class="pcq">${ELEM[el].nm}属性のピックアップを入れ替えますか？</div>
        <div class="pcn">${charNoText(ask)} ${CHARS[ask].nm}</div>
        <div class="pcr">えらぶと ${ratePct(PICK_ARCHIVE)}</div>
      </div>
      <div class="pcb">
        <button class="yes" onclick="confirmPickArc('${ask}')">これにする</button>
        <button class="no" onclick="cancelPick()">やめる</button>
      </div>
    </div>` : "";
  $("#resCard").innerHTML = `
    <div class="pshd"><b>🗂 ${ELEM[el].nm}属性のピックアップをえらぶ<small>${ARCHIVE_NM}（封入 ${list.length}体）</small></b>
      <button class="rtx" onclick="closeRes()" aria-label="とじる" title="とじる">✕</button></div>
    <div class="psbody">
      ${conf}
      <div class="psnow">いまのピックアップ： <b>${cur ? CHARS[cur].nm : "—"}</b>　—
        えらんだ1体だけ <b>${ratePct(PICK_ARCHIVE)}</b>（属性ごとに1体・計5体で ${ratePct(PICK_ARCHIVE * 5)}）。</div>
      <div class="cgrid">${list.map((id) => {
        const c = CHARS[id], own = !!DB.chars[id];
        return `<div class="cc s5 ${own ? "" : "noown"} ${id === ask ? "asking" : ""}" onclick="askPick('${id}')">
          <img src="${c.th}" alt="">
          <span class="ccr">SSR</span><span class="ccno">${charNoOf(id)}</span>
          <button class="ccinfo" onclick="event.stopPropagation();openDetX('${id}')" title="${c.nm} の性能を見る">i</button>
          ${id === cur ? '<span class="ccpk">PICKUP</span>' : ""}
          <div class="ccn">${charNmOf(id)}</div>
          ${dupeBadge(id)}</div>`;
      }).join("")}</div>
    </div>`;
}
function confirmPickArc(id) {
  setArchivePick(_arcEl, id);
  _pickAsk = null;
  paintArcSheet();
  paintAll();
}
window.confirmPickArc = confirmPickArc;

/* 絵を押した ＝ まだ入れ替えない。この画面の上に確認を出すだけ */
function askPick(id) {
  /* ★★ 2026-08-28 アーカイブの画面（属性ごとの枠）でも同じ関数を使う */
  if (_arcEl) {
    if (id === archivePickOf(_arcEl)) { _pickAsk = null; paintArcSheet(); return; }
    _pickAsk = id; paintArcSheet();
    const card0 = $("#resCard"); if (card0) card0.scrollTop = 0;
    return;
  }
  if (id === curPickup()) { _pickAsk = null; paintPickSheet(); return; }   // いまのピックアップなら何もしない
  _pickAsk = id;
  paintPickSheet();
  const card = $("#resCard"); if (card) card.scrollTop = 0;   // 確認は上に出るので先頭へ
}
window.askPick = askPick;
function cancelPick() { _pickAsk = null; if (_arcEl) paintArcSheet(); else paintPickSheet(); }
window.cancelPick = cancelPick;
/* 確認して「これにする」を押したときだけ入れ替える */
function confirmPick(id) {
  setPickup(id);
  _pickAsk = null;
  paintPickSheet();
  paintAll();
}
window.confirmPick = confirmPick;
function closeRes() { $("#resOv").classList.remove("on"); _pickAsk = null; _arcEl = null; paintAll(); }
window.closeRes = closeRes;

/* ══════════ 説明 ══════════ */
function paintNote() {
  const s4 = STAR4_POOL.length;
  /* 🎫の案内。★ 2026-08-13 チケットは2種類になった（フェス専用／全ガチャ共通） */
  /* ★★ 2026-08-29 極彩祭・極華祭・極煌祭・戦姫祭は<b>フェスガチャではない</b>ので
     🎫フェス券が使えない（ご指定）。案内文も支払いと同じ fesTicketOK を見て出し分ける。 */
  const tktLine = (isFesMode(gMode) && !fesTicketOK(gMode))
    ? `🎫 <b>ガチャチケット</b>を持っているときは<b>チケットから先に</b>使います（1枚＝1回ぶん）。
       足りない分だけ<i class='icc ic-gem'></i>ジェムを消費します。
       <b>フェスチケットはここでは使えません</b>——このガチャは<b>フェスガチャではなく、限定キャラクターのガチャ</b>だからです。`
    : (gMode === "premium" || isDebutMode(gMode))
    ? `🎫 <b>ガチャチケット</b>を持っているときは<b>チケットから先に</b>使います（1枚＝1回ぶん）。
       足りない分だけ<i class='icc ic-gem'></i>ジェムを消費します。
       <b>フェスチケットはここでは使えません</b>（フェスガチャ専用です）。`
    : `🎫 消費の順は <b>フェスチケット → ガチャチケット → <i class='icc ic-gem'></i>ジェム</b>（どちらも1枚＝1回ぶん）。
       <b>フェスチケット</b>はどのフェスでも、<b>ガチャチケット</b>はどのガチャでも使えます。`;
  if (isDebutMode(gMode)) {
    const dv = debutVerOfMode(gMode);
    if (!dv) {
      $("#gnote").innerHTML = `<b>${DEBUT_NM} はスタンバイ中</b>です。`
        + `次のバージョンの新キャラがそろうと開きます。`;
      return;
    }
    const dchars = debutCharsOfMode(gMode);
    /* ★ 2026-08-20 GRAND DEBUT。SSR・SR の確率はプレミアムと同じで、変えたのは中身だけ。 */
    /* ★★ 2026-08-25 限定SSR は 10% → 15%（DEBUT_S5_TOTAL）。アイテム枠は 35% → 30%。 */
    const freeLine = (debutFreeLeft(gMode) > 0)
      ? `🎁 <b>きょうの無料単発はまだ残っています</b>（1日1回・下の「1回」ボタンが無料になります）。`
      : `🎁 <b>1日1回、単発を無料で引けます</b>（きょうのぶんは使いました。あと約 ${typeof debutFreeNextText === "function" ? debutFreeNextText() : "1日"} でもどります）。`;
    /* ★★ 2026-08-26b 版ごとに<b>初回の10連が無料</b>（ご指定）。1日1回の単発とは別の台帳で、
       こちらは日付では戻らない（その版で一度きり）。 */
    const free10Line = (debutFree10Left(gMode) > 0)
      ? `🎁 <b>この版の初回10連は無料です</b>（下の「10連 SSR確定」ボタンが無料になります。SSR確定枠もそのまま付きます）。`
      : `🎁 <b>初回10連の無料は版ごとに1回</b>です（${gachaVerText(dv)} のぶんは使いました。次のバージョンでまた引けます）。`;
    $("#gnote").innerHTML = `<b>新キャラSSR 各${ratePct(PICK_DEBUT)}</b>（${dchars.length}体・合計 ${ratePct(pickTotalOfMode(gMode))}）
      ／ <b>${PREMIUM_NM} のSSR 合計${ratePct(fillTotalOfMode(gMode))}</b>
      ／ <b>SSRの合計は ${ratePct(SSR_TOTAL)}</b>
      ／ <b>SR 合計50%</b>（${s4}体で等分・各 ${ratePct(0.50 / s4)}）／ <b>育成アイテム ${ratePct(itemTotalOfMode(gMode))}</b>。<br>
      ${free10Line}<br>
      ${freeLine}<br>
      ${tktLine}<br>
      <b>10連は最後の1枠が SSR 確定</b>（新キャラ＋${PREMIUM_NM} のSSRをまとめた中から等確率）。
      同じキャラを引くと<b>限界突破（最大${MAX_AWK}）</b>になります。<br>
      ★ <b>キャラの排出と確定枠のしくみはフェスガチャと同じ</b>です。ちがうのは<b>育成アイテムの中身</b>——
      🎫ガチャチケット・📕超越の書・🎖️英傑の証が厚く、<b>🪭九天の玉簡</b>と<b>📘クロスの書</b>も極低確率で出ます。<br>
      ★ 所持キャラ・限界突破・<i class='icc ic-gem'></i>ジェムは <b>MagiBurst と共通</b>です。`;
  } else if (gMode === ARCHIVE_KEY) {
    /* ★★ 2026-08-28 Festival Archive GACHA */
    const n = archiveChars().length;
    $("#gnote").innerHTML = `<b>ピックアップ 各${ratePct(PICK_ARCHIVE)}</b>（属性ごとに1体・計5体＝合計 ${ratePct(pickTotalOfMode(gMode))}）
      ／ <b>${PREMIUM_NM} のSSR 合計${ratePct(fillTotalOfMode(gMode))}</b>
      ／ <b>SSRの合計は ${ratePct(SSR_TOTAL)}</b>
      ／ <b>SR 合計50%</b>（${s4}体で等分・各 ${ratePct(0.50 / s4)}）／ <b>育成アイテム ${ratePct(itemTotalOfMode(gMode))}</b>。<br>
      🗂 いま封入されているのは <b>${n}体</b>です（<b>登場から${FES_ARCHIVE_DAYS}日</b>を過ぎたフェスガチャの限定SSR）。<br>
      ${tktLine}<br>
      <b>10連は最後の1枠がSSR確定</b>（ピックアップ5体＋${PREMIUM_NM} のSSRから等確率）。<br>
      ★ <b>極彩祭・極華祭・極煌祭のキャラクターは封入されません</b>。`;
  } else if (gMode === "premium") {
    $("#gnote").innerHTML = `<b>SSR 合計${ratePct(SSR_TOTAL)}</b>（ピックアップ ${ratePct(pickupRate())}／ほかは各 ${ratePct(otherRate())}）
      ／ <b>SR 合計55%</b>（${s4}体で等分・各 ${ratePct(0.55 / s4)}）／ <b>育成アイテム ${ratePct(itemTotalOfMode("premium"))}</b>。<br>
      ${tktLine}<br>
      <b>10連は最後の1枠がSSR確定</b>。同じキャラを引くと<b>限界突破（最大${MAX_AWK}）</b>になり、
      限界突破MAXのキャラは排出対象から外れます。<br>
      ★ 所持キャラ・限界突破・<i class='icc ic-gem'></i>ジェムは <b>MagiBurst と共通</b>です。`;
  } else {
    const f = fesDef(gMode);
    $("#gnote").innerHTML = `${f.sub}<br>
      <b>限定SSR ${(f.newChars && f.newChars.length)
        ? "新キャラ 各" + ratePct(pickRateOfMode(gMode)) + "／それ以外 各" + ratePct(PICK_OLD)
        : "各" + ratePct(pickRateOfMode(gMode))}</b>（${f.chars.length}体・合計 ${ratePct(pickTotalOfMode(gMode))}）
      ／ <b>${PREMIUM_NM} のSSR 合計${ratePct(fillTotalOfMode(gMode))}</b>
      ／ <b>SSRの合計は ${ratePct(SSR_TOTAL)}</b>
      ／ <b>SR 合計50%</b>／ <b>育成アイテム ${ratePct(itemTotalOfMode(gMode))}</b>。<br>
      ${fesTimed(f) ? (fesEnded(gMode)
        ? "⏳ <b>このフェスの配信は終了しました</b>。キャラクターは <b>" + ARCHIVE_NM + "</b> で引けます。<br>"
        : "⏳ このフェスは " + fesPeriodText(gMode) + "（あと<b>" + fesDaysLeft(gMode) + "日</b>）。"
          + fesArchiveText(gMode) + " <b>" + ARCHIVE_NM + "</b> にも封入されます"
          + (fesArchived(gMode) ? "（<b>封入ずみ</b>）" : "") + "。<br>")
        : (fesPerm(f) ? "⏳ このフェスは <b>無期限開催</b>です（配信終了はありません）。<br>" : "")}
      ${f.monthly && fesMonthlyLeft(f) ? "⏳ <b>" + fesMonthlyLeftText(f) + "</b>。<br>" : ""}
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
  /* ★★ 2026-08-29 「フェスの画面かどうか」と「フェス券が使えるかどうか」は<b>別</b>。
     極彩祭・極華祭・極煌祭・戦姫祭はフェスの画面だが<b>フェス券は使えない</b>（ご指定）。
     ここを1つの変数で兼ねると、券が使えないガチャで開催前の判定まで外れてしまう。 */
  const isFes = isFesMode(gMode);
  const fes = isFes && fesTicketOK(gMode);
  /* ★★ 2026-08-26 GRAND DEBUT がスタンバイ中（掲載中の版が無い）なら引けない */
  const dStandby = isDebutMode(gMode) && !debutVerOfMode(gMode);
  /* ★★ 2026-08-28 Festival Archive は「封入0体」のときだけ回せない */
  const arcEmpty = gMode === ARCHIVE_KEY && !archiveChars().length;
  const locked = (isFes && fesLocked(gMode)) || dStandby || arcEmpty;
  /* ★ 値段の見積もりは mb-core.js の gachaCost() ひとつに任せる
     （ここで計算し直すと、実際に払う payGacha と食いちがう）。
     消費の順は フェス券 → ガチャ券 → 💎ジェム。プレミアムではフェス券は使わない。 */
  /* ★★ 2026-08-25 GRAND DEBUT の「1日1回 無料の単発」。
     残っているときは<b>単発だけ</b>を FREE にする（5連・10連はこれまでどおり有料）。 */
  const freeOn = isDebutMode(gMode) && !dStandby && debutFreeLeft(gMode) > 0;
  /* ★★ 2026-08-26b 版ごとに<b>初回の10連が無料</b>（ご指定）。
     見せかたは 1日1回の無料単発と<b>そろえる</b>——ボタンはふつうのまま、右上に札を出すだけ。
     ★ 札の文だけ変える（「初回無料」）。日付では戻らないので「1回無料」とは書かない。 */
  const free10On = isDebutMode(gMode) && !dStandby && debutFree10Left(gMode) > 0;
  /* ★★ 2026-08-26 ご指定により、無料の単発は<b>ふつうのボタンと同じ見た目</b>に戻し、
     そのボタンの<b>右上に「1回無料」の札</b>を出すだけにした。
     （2026-08-25b の「全幅で光る大きなボタン」は、下の 5連・10連 が押しづらく、
       ボタンの並びも日によって変わってしまっていた） */
  bar.classList.remove("hasfree");
  const btn = (n, cls, label) => {
    if (n === 1 && freeOn) {
      /* 見た目・大きさ・並びは「1回」のボタンとまったく同じ。
         ちがうのは右上の札と、値段のかわりに「無料」と出るところだけ。 */
      return `<button class="pbtn" onclick="pull(1)"><span class="freetag">1回無料</span>`
        + `<b>1回</b><small>無料</small></button>`;
    }
    /* ★★ 2026-08-26b 初回の10連も同じ見せかたで無料にする（ご指定）。
       10連の枠は色ちがい（.p10）なので、クラスはそのまま残す＝並びも大きさも変わらない。 */
    if (n === 10 && free10On) {
      return `<button class="pbtn ${cls}" onclick="pull(10)"><span class="freetag">初回無料</span>`
        + `<b>${label}</b><small>無料</small></button>`;
    }
    const ssrTag = n === 10 ? '<span class="ssrtag">SSR確定</span>' : "";
    const c = gachaCost(n, fes);
    const ok = !locked && DB.orbs >= c.gems;
    /* ★ 2026-08-10 ジェムは絵文字（💎）ではなく XEVARION 共通のアイコンで出す */
    const gemIc = "<i class='icc ic-gem'></i>";
    const p = [];
    if (c.fes) p.push(`<i class="pf">F</i>${c.fes}`);
    if (c.tickets) p.push(`<i class="pg">G</i>${c.tickets}`);
    if (c.gems || !p.length) p.push(`${gemIc}${c.gems}`);
    return `<button class="pbtn ${cls}" ${ok ? "" : "disabled"} onclick="pull(${n})">${ssrTag}<b>${label}</b><small>${p.join(" ＋ ")}</small></button>`;
  };
  bar.innerHTML = locked
    ? `<div style="grid-column:1/-1;text-align:center;font-size:12px;font-weight:900;color:#6f82ad;padding:12px">⏳ ${
        dStandby ? DEBUT_NM + " はスタンバイ中です"
        : arcEmpty ? ARCHIVE_NM + " はまだ封入されたキャラクターがいません"
        : fesOpenText(fesDef(gMode))}</div>`
    /* ★★ 2026-09-19e 5連は廃止（ご指定）。10連には「SSR確定」の札 */
    : btn(1, "", "1回") + btn(10, "p10", "10連");
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
   ★★ 2026-08-30 <b>もう止めない</b>——PREMIUM SELECT のキャラは完凸しても
     出続けるようになり、出たときは 💠結晶 が CRYST_SSR 個もらえる（＝枠は無駄にならない）。
     判定は isMaxAwk ではなく <b>isDropOut</b>（＝完凸で、かつ結晶にも換わらない）を見る。
     プレミアムのピックアップは isDropOut が必ず false なので、実質いつも素通りする。
     フェス・GRAND DEBUT の限定キャラを将来ここに通したときのために、形は残してある。 */
async function okToPullPremium(n) {
  const id = curPickup();
  if (!isDropOut(id)) return true;
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
  /* ★★ 2026-08-26 版ごとの GRAND DEBUT。gMode をそのまま渡す（"debut" / "debut:3.0"） */
  if (isDebutMode(gMode)) { if (debutVerOfMode(gMode)) doDebutGacha(n, gMode); return; }
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
  const sec = charSecret(id), mx = isDropOut(id), own = !!DB.chars[id];
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
  + "XEVARION の📧メールやパックストアで受け取ったぶんは<b>その場ですぐ使えます</b>。";
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
  const _dv = isDebutMode(gMode) ? debutVerOfMode(gMode) : null;
  $("#rateTtl").innerHTML = `提供割合<small>${d.nm}${_dv ? "　" + gachaVerText(_dv) : ""}</small>`;
  if (_dv) {
    const dchars = debutCharsOfMode(gMode);
    /* ★ 2026-08-20 GRAND DEBUT GACHA。SSR/SR の確率はプレミアムと同じ、中身だけがちがう。 */
    rows.push(rateHeadRow("<i class='icc ic-gem'></i> " + DEBUT_NM + " " + gachaVerText(_dv)
      + "（1回 5 ／ 5連 25 ／ 10連 50・SSR確定）", _dv.date, DEBUT_C));
    rows.push(rateHeadRow("✨ 新キャラSSR（各 " + ratePct(PICK_DEBUT) + "・" + dchars.length + "体）",
      ratePct(pickTotalOfMode(gMode))));
    byCharNoDesc(dchars).forEach((id) => rows.push(rateCharRow(id, debutEachRateOf(gMode), "GRAND DEBUT 限定")));
    /* ★ 2026-08-20c フェスと同じしくみ＝道中でも PREMIUM SELECT GACHA のSSRが合計5%で出る */
    const dprem = byCharNoDesc(fillIdsOfMode(gMode));
    const dpEach = fillEachOfMode(gMode);
    rows.push(rateHeadRow("✨ " + PREMIUM_NM + " のSSR（合計・等分）", ratePct(fillTotalOfMode(gMode))));
    dprem.forEach((id) => rows.push(rateCharRow(id, dpEach, PREMIUM_NM)));
    rows.push(rateHeadRow("⭐ SR（合計・" + STAR4_POOL.length + "体で等分）", "50%"));
    STAR4_POOL.forEach((id) => rows.push(rateCharRow(id, 0.50 / STAR4_POOL.length)));
    rows.push(rateHeadRow("🎁 育成アイテム（合計）", ratePct(itemTotalOfMode(gMode))));
    rows.push(rateItemRows(itemTotalOfMode(gMode), DEBUT_ITEM_TABLE));
    const dsure = byCharNoDesc(guaranteedPoolOfMode(gMode));
    rows.push(rateHeadRow("🎯 10連の SSR 確定枠（最後の1枠・" + dsure.length + "体から等確率）", "", DEBUT_C));
    rows.push(rateNoteRow("※ <b>限界突破MAX（👑）のキャラは10連の確定枠には出ません</b>（そのガチャで出るSSRが全員 限界突破MAX のときだけ、その全員から等確率で出ます）。"));
    dsure.forEach((id) => rows.push(rateCharRow(id, dsure.length ? 1 / dsure.length : 0,
      dchars.indexOf(id) >= 0 ? "GRAND DEBUT 限定" : PREMIUM_NM)));
    rows.push(rateNoteRow("※ <b>新キャラは1体あたり " + ratePct(PICK_DEBUT) + "</b>（合計 "
      + ratePct(pickTotalOfMode(gMode)) + "）。<b>SSRの合計はどのガチャも " + ratePct(SSR_TOTAL)
      + "</b>で、差の <b>" + ratePct(fillTotalOfMode(gMode)) + "</b> は "
      + PREMIUM_NM + " のSSRが等確率で受け取ります。"));
    rows.push(rateNoteRow("※ <b>この版の初回10連は無料です</b>（🎫チケットも"
      + "<i class='icc ic-gem'></i>ジェムも減りません）。中身・確率・<b>最後の1枠のSSR確定</b>は、"
      + "ふつうの10連とまったく同じです。<b>版ごとに1回だけ</b>で、日付が変わっても戻りません。"
      + (debutFree10Left(gMode) > 0
        ? "　<b>この版のぶんはまだ残っています。</b>"
        : "　この版のぶんは使いました。")));
    rows.push(rateNoteRow("※ <b>1日1回、単発を無料で引けます</b>（🎫チケットも"
      + "<i class='icc ic-gem'></i>ジェムも減りません）。中身はふつうの単発とまったく同じです。"
      + (debutFreeLeft(gMode) > 0
        ? "　<b>きょうのぶんはまだ残っています。</b>"
        : "　きょうのぶんは使いました（あと約 "
          + (typeof debutFreeNextText === "function" ? debutFreeNextText() : "1日") + "）。")));
    rows.push(rateNoteRow("※ <b>キャラの排出と確定枠のしくみはフェスガチャと同じ</b>です。"
      + "道中でも <b>" + PREMIUM_NM + " のSSRが合計 " + ratePct(FES_PREMIUM_TOTAL) + "</b> で出て、"
      + "<b>確定枠は新キャラと " + PREMIUM_NM + " のSSRをまとめた " + dsure.length + "体から全員おなじ確率</b>です"
      + "（限界突破MAXのキャラは除外）。"));
    rows.push(rateNoteRow("※ <b>この" + dchars.length + "体は " + DEBUT_NM + " " + gachaVerText(_dv) + " でしか引けません</b>。"
      + "フェスガチャ・" + PREMIUM_NM + " の<b>すり抜け（他の SSR 枠）にも、10連の確定枠にも出ません</b>。"));
    rows.push(rateNoteRow("※ <b>この版は公開日から" + DEBUT_DAYS + "日間だけ</b>の掲載です"
      + "（" + _dv.date + " から・あと <b>" + debutDaysLeft(_dv) + "日</b>）。"
      + "期間が終わると、この" + dchars.length + "体は<b>自動で " + PREMIUM_NM + " へ移り</b>、"
      + "現行のキャラと同じ扱い（ピックアップ・すり抜け・確定枠）になります。"));
    rows.push(rateNoteRow("※ <b>前の版の掲載中に新しい版が出ると、GRAND DEBUT は2本並びます</b>"
      + "（版ごとに別のガチャです――片方を回してももう片方の新キャラは出ません）。"
      + "掲載中の版が1つも無いあいだは、<b>スタンバイ</b>になります。"));
    rows.push(rateNoteRow("※ <b>🎫フェスチケットはこのガチャでは使えません</b>（フェスガチャ専用）。"
      + "<b>🎫ガチャチケット</b>は使えます（1枚＝1回ぶん）。消費は <b>ガチャチケット → <i class='icc ic-gem'></i>ジェム</b> の順です。"));
    rows.push(rateNoteRow("※ ちがうのは<b>育成アイテムの中身</b>だけです——"
      + "🎫ガチャチケット・📕超越の書・🎖️英傑の証を厚くし、"
      + "<b>🪭九天の玉簡</b>と<b>📘クロスの書</b>を極低確率で入れてあります。"));
  } else if (fes) {
    const f = fesDef(gMode);
    /* ★★ 2026-09-06 1体ずつ確率がちがうガチャ（newChars を書いたもの）は、
       見出しにも「新キャラ 各◯% ／ それ以外 各0.2%」と出す。
       ★ 行の確率は必ず <b>pickRateOf(gMode, id)</b> を使うこと（表と実物がずれないように）。 */
    /* ★★ 2026-09-08 「新キャラ」は<b>実装から10日</b>だけ。
       10日を過ぎたら newChars に残っていても全員 PICK_OLD になるので、
       見出しも「各 0.4%」に切りかえる（表と実物がズレないように）。 */
    const _newIds = (typeof fesNewIds === "function") ? fesNewIds(gMode) : (f.newChars || []);
    const _hasNew = !!_newIds.length;
    const _wasNew = !!(f.newChars && f.newChars.length);
    rows.push(rateHeadRow("✨ " + (gMode === ARCHIVE_KEY ? "ピックアップ" : "フェス限定SSR")
      + (_hasNew ? "（新キャラ 各 " + ratePct(pickRateOfMode(gMode)) + " ／ それ以外 各 " + ratePct(PICK_OLD) + "）"
                 : _wasNew ? "（各 " + ratePct(PICK_OLD) + "）"
                 : "（各 " + ratePct(pickRateOfMode(gMode)) + "）"),
      ratePct(pickTotalOfMode(gMode)), f.c));
    /* ★ 2026-08-11 並びは番号の新しい順 */
    byCharNoDesc(pickIdsOfMode(gMode)).forEach((id) => rows.push(rateCharRow(id, pickRateOf(gMode, id),
      gMode === ARCHIVE_KEY ? "<b style='color:#e0405e'>PICKUP</b>"
        : (_newIds.indexOf(id) >= 0 ? "<b style='color:#e0405e'>NEW</b> フェス限定SSR" : "フェス限定SSR"))));
    if (gMode === ARCHIVE_KEY) {
      const rest = byCharNoDesc(archivePool().filter((id) => pickIdsOfMode(gMode).indexOf(id) < 0));
      if (rest.length) {
        rows.push(rateHeadRow("🗂 封入ずみ（ピックアップにえらばれていない）", "—"));
        rest.forEach((id) => rows.push(rateCharRow(id, 0, "属性ごとにえらぶと " + ratePct(PICK_ARCHIVE))));
      }
    }
    const fprem = byCharNoDesc(fillIdsOfMode(gMode));
    const fpEach = fillEachOfMode(gMode);
    rows.push(rateHeadRow("✨ " + PREMIUM_NM + " のSSR（合計・等分）", ratePct(fillTotalOfMode(gMode))));
    fprem.forEach((id) => rows.push(rateCharRow(id, fpEach, PREMIUM_NM)));
    rows.push(rateHeadRow("⭐ SR（合計・" + STAR4_POOL.length + "体で等分）", "50%"));
    STAR4_POOL.forEach((id) => rows.push(rateCharRow(id, 0.50 / STAR4_POOL.length)));
    rows.push(rateHeadRow("🎁 育成アイテム（合計）", ratePct(itemTotalOfMode(gMode === "premium" ? "premium" : gMode))));
    /* ★★ 2026-08-22 フェスに itemTable が書いてあれば、その表で出す。
       いまは Starlight Academy Fest だけが GRAND DEBUT と同じ中身（ご指定）。
       書いていないフェスは undefined が渡り、rateItemRows が G_ITEM_TABLE に落とす
       ＝ 既存のフェスの表示は1つも変わらない。
       ★ ここを直さないと「引くと出るもの」と「提供割合に書いてあるもの」が食いちがう。 */
    rows.push(rateItemRows(itemTotalOfMode(gMode), f.itemTable));
    const sure = byCharNoDesc(guaranteedPoolOfMode(gMode));
    rows.push(rateHeadRow("🎯 10連のSSR確定枠（最後の1枠・" + sure.length + "体から等確率）", "", f.c));
    rows.push(rateNoteRow("※ <b>限界突破MAX（👑）のキャラは10連の確定枠には出ません</b>（そのガチャで出るSSRが全員 限界突破MAX のときだけ、その全員から等確率で出ます）。"));
    sure.forEach((id) => rows.push(rateCharRow(id, sure.length ? 1 / sure.length : 0, CHARS[id].fes ? "フェス限定SSR" : PREMIUM_NM)));
    rows.push(rateNoteRow(gMode === ARCHIVE_KEY
      ? "※ <b>属性ごとに1体ずつ（計5体）</b>をピックアップにえらべます（各 " + ratePct(PICK_ARCHIVE) + "）。"
        + "<b>SSRの合計はどのガチャも " + ratePct(SSR_TOTAL) + "</b>で、差の <b>"
        + ratePct(fillTotalOfMode(gMode)) + "</b> は " + PREMIUM_NM + " のSSRが等確率で受け取ります。"
      : "※ <b>限定SSRは" + (_hasNew
          ? "新キャラが1体あたり " + ratePct(pickRateOfMode(gMode)) + "、それ以外は1体あたり " + ratePct(PICK_OLD)
          : _wasNew ? "1体あたり " + ratePct(PICK_OLD)
          : "1体あたり " + ratePct(pickRateOfMode(gMode))) + "</b>（合計 "
        + ratePct(pickTotalOfMode(gMode)) + "）。<b>SSRの合計はどのガチャも " + ratePct(SSR_TOTAL)
        + "</b>で、差の <b>" + ratePct(fillTotalOfMode(gMode)) + "</b> は "
        + PREMIUM_NM + " のSSRが等確率で受け取ります。"));
    /* ★★ 2026-08-22 中身がふつうのフェスとちがうときは、そのことを画面に書く */
    if (f.itemTable === D_ITEM_TABLE) {
      rows.push(rateNoteRow("※ <b>キャラの排出確率はほかのフェスとまったく同じ</b>です。"
        + "ちがうのは<b>育成アイテムの中身</b>だけで、<b>" + DEBUT_NM + " と同じ内容</b>になっています——"
        + "叡智の果実は<b>3個・5個の束</b>が主体、🎫ガチャチケット・📕超越の書・🎖️英傑の証を厚くし、"
        + "<b>🪭九天の玉簡</b>と<b>📘クロスの書</b>も極低確率で出ます。"));
    }
    /* ★★ 2026-09-08 「あと何日で確率が下がるのか」を画面に書く */
    if (_hasNew && typeof fesNewDaysLeft === "function") {
      const _dl = fesNewDaysLeft(gMode);
      /* ★★ 2026-09-19i NEW のきまり：いちばん新しい子は次の新キャラが出るまで／それ以外は登場から10日 */
      rows.push(rateNoteRow("※ <b>NEW（確率アップ）</b>は、このガチャに<b>いちばん最近追加されたキャラ</b>が"
        + "<b>次の新キャラが出るまで</b>。それより前の子も<b>登場から " + NEW_CHAR_DAYS + "日間</b>は NEW のままです"
        + ((fesDef(gMode) || {}).monthly ? "（このガチャは毎月の開催期間だけ引けるので、<b>引けるようになった日から</b>" + NEW_CHAR_DAYS + "日間）" : "")
        + (_dl > 0 && _dl < 999 ? "（いちばん長い子であと<b>" + _dl + "日</b>）" : "")
        + "。NEW でなくなった子は<b>各 " + ratePct(PICK_OLD) + "</b>になります。"));
    } else if (_wasNew) {
      rows.push(rateNoteRow("※ このガチャの限定SSRは<b>全員が実装から " + NEW_CHAR_DAYS
        + "日を過ぎている</b>ので、<b>各 " + ratePct(PICK_OLD) + "</b>です。"));
    }
    rows.push(rateNoteRow(TKT_NOTE));
  } else {
    const pick = curPickup();
    rows.push(rateHeadRow("<i class='icc ic-gem'></i> " + PREMIUM_NM + "（1回 5 ／ 5連 25 ／ 10連 50・SSR確定）", "", "#d97800"));
    rows.push(rateHeadRow("✨ SSR 排出（合計）", ratePct(SSR_TOTAL)));
    /* ★ 2026-08-11 ピックアップをいちばん上に、そのほかは番号の新しい順に */
    rateOrder(PREMIUM_CHARS, pick).forEach((id) => {
      const on = id === pick;
      rows.push(rateCharRow(id, on ? pickupRate() : otherRate(), on ? "<b style='color:#e0405e'>PICKUP</b>" : "SSR ガチャ限定"));
    });
    rows.push(rateHeadRow("⭐ SR（合計・" + STAR4_POOL.length + "体で等分）", "55%"));
    STAR4_POOL.forEach((id) => rows.push(rateCharRow(id, 0.55 / STAR4_POOL.length)));
    rows.push(rateHeadRow("🎁 育成アイテム（合計）", ratePct(itemTotalOfMode(gMode === "premium" ? "premium" : gMode))));
    rows.push(rateItemRows(itemTotalOfMode("premium")));
    /* ★ 2026-08-11 フェスガチャと同じく、10連の確定枠の中身も一覧で出す
       （これまでは注意書きに「全員おなじ確率」と書いてあるだけだった）。 */
    const psure = byCharNoDesc(guaranteedPoolOfMode("premium"));
    rows.push(rateHeadRow("🎯 10連のSSR確定枠（最後の1枠・" + psure.length + "体から等確率）", "", "#d97800"));
    psure.forEach((id) => rows.push(rateCharRow(id, psure.length ? 1 / psure.length : 0,
      id === pick ? "<b style='color:#e0405e'>PICKUP</b>" : "SSR ガチャ限定")));
    rows.push(rateNoteRow("※ <b>10連は「最後の1枠」がSSR確定</b>です（前半9回も通常抽選なので、そこでもSSRは出ます）。<b>確定枠は排出対象のSSRがすべて同じ確率</b>で、<b>ピックアップの優遇はありません</b>。"));
    rows.push(rateNoteRow("※ <b>限界突破MAX（👑）のキャラは10連の確定枠には出ません</b>（そのガチャで出るSSRが全員 限界突破MAX のときだけ、その全員から等確率で出ます）。"));
    rows.push(rateNoteRow("※ 限界突破MAX（👑）のキャラは排出対象から外れ、その分は残りのSSRに配分されます（SSR合計は常に"
      + ratePct(SSR_TOTAL) + "）。"));
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
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-24 ★プレミアムセレクト券（夏限定パックの中身）
   ------------------------------------------------------------
   1枚につき、<b>PREMIUM SELECT GACHA から出るSSR</b>の中から
   好きな1体を<b>確定で</b>受け取れる。
   ★ 使う場所をここ（ガチャ画面）にしているのは、<b>いま何が出るのか</b>を
     知っているのが mb-core.js の gachaPool() だけだから。
     ホーム側に同じ一覧を書くと、キャラを足すたびに片方だけ古くなる。
   ★ えらぶ画面は BLACK SELECT と同じ luxOpenSelect を使いまわす
     （＝限界突破の進みかた・演出・所持の反映が必ずそろう）。
   ══════════════════════════════════════════════════════════════ */
function selTickets() {
  try { return (window.XEVA && XEVA.selectTicket) ? XEVA.selectTicket.get() : 0; } catch (e) { return 0; }
}
/* ═════════════════════════════════════════════════════
   ★★ 2026-09-13 フェスセレクト券（ご指定）
   ------------------------------------------------------------
   BUNNY GIRL FEST（fes13）・戦姫祭（fes11）・RISING STAR FEST（fes12）に
   「好きなキャラを 1体えらんで入手できるパック」を作った。その券を使うのがここ。
   ★ 券は<b>そのフェスを開いているときだけ</b>出す（プレミアム券と同じ考えかた）。
   ★ えらぶ画面は BLACK SELECT と同じ luxOpenSelect を使いまわす
     （＝限界突破の進みかた・演出・所持の反映が必ずそろう）。
   ═════════════════════════════════════════════════════ */
function fesSelTickets(key) {
  try { return (window.XEVA && XEVA.fesSelect) ? XEVA.fesSelect.get(key) : 0; } catch (e) { return 0; }
}
function paintFesSelTicket() {
  const box = $("#fselbar"); if (!box) return;
  const key = gMode;
  const n = (typeof FESSEL_KEYS !== "undefined" && FESSEL_KEYS.indexOf(key) >= 0) ? fesSelTickets(key) : 0;
  if (!n) { box.innerHTML = ""; return; }
  const f = fesDef(key), pool = fesSelPool(key);
  box.innerHTML =
    '<button class="selcard f" onclick="useFesSelTicket()">' +
      '<span class="seli">★</span>' +
      '<span class="selt"><b>' + f.nm + ' セレクト券を使う</b>' +
        "<small>" + f.nm + " の<b>限定SSR " + pool.length +
        "体</b>の中から、<b>好きな1体を確定で</b>受け取れます" +
        "（持っているキャラをえらぶと限界突破が進みます）</small></span>" +
      '<span class="seln">' + fmt(n) + "</span>" +
    "</button>";
}
let _fselUsing = false;
/* ══ ★★ 2026-09-19j えらべるキャラが<b>全員 完凸</b>のとき（ご指定：案1）══
   セレクト券・フェスセレクト券・★星煌印の交換は、<b>💠結晶 CRYST_EXCHANGE（75）個</b>と交換する。
   75個＝結晶の交換所でキャラ1体と換えられる数なので、券1枚ぶんの価値がそのまま残る。
   （前は完凸キャラをえらばせて 💠5個 しか出ず、確定券が大きく損になっていた）
   ★ 先に券を減らせたときだけ結晶を足す（減らせなかったら何もしない＝二重取りしない）。 */
async function allMaxExchange(what, spend) {
  const ok = await uiConfirm(
    "えらべるキャラが<b>全員 完凸（限界突破MAX）</b>です。<br>"
    + "<b>" + what + "</b> 1つを、<b>💠" + CRYST_NM + " " + CRYST_EXCHANGE + "個</b>"
    + "（交換所でキャラ1体と交換できる数）に換えますか？",
    { icon: "💠", title: "全員 完凸です", ok: "💠" + CRYST_EXCHANGE + "個と交換する", cancel: "まだ使用しない" });
  if (!ok) return false;
  let spent = false;
  try { spent = spend() !== false; } catch (e) { spent = false; }
  if (!spent) { paintAll(); return false; }
  crystAdd(CRYST_EXCHANGE, what + "（全員完凸のため💠" + CRYST_NM + "に交換）");
  try { luxFlash("black"); } catch (e) {}
  try { if (window.SFX && SFX.win) SFX.win(); } catch (e) {}
  paintAll();
  try { uiAlert("<b>💠" + CRYST_NM + " " + CRYST_EXCHANGE + "個</b>を受け取りました。<br>XEVARION ホームの 🛒ショップの<b>結晶交換所</b>で、好きなキャラと交換できます。", { icon: "💠", title: "交換しました" }); } catch (e) {}
  return true;
}
function useFesSelTicket() {
  if (_fselUsing) return;
  const key = gMode;
  if (typeof FESSEL_KEYS === "undefined" || FESSEL_KEYS.indexOf(key) < 0) return;
  if (fesSelTickets(key) <= 0) { paintFesSelTicket(); return; }
  const f = fesDef(key), pool = fesSelPool(key);
  if (!pool.length) { paintFesSelTicket(); return; }
  /* ★★ 2026-09-19j 全員 完凸なら 💠75個と交換 */
  if (!pool.some((id) => !isMaxAwk(id))) {
    allMaxExchange(f.nm + " セレクト券", () => XEVA.fesSelect.spend(key, 1, f.nm + " セレクト券（結晶に交換）"));
    return;
  }
  _fselUsing = true;
  luxOpenSelect(pool, (id) => {
    _fselUsing = false;
    if (!id) { paintFesSelTicket(); return; }   // えらばずに閉じた＝券はそのまま残す
    /* ★ キャラを受け取れてから券を減らす。順番を逆にすると、
       途中で失敗したときに「券だけ消えてキャラが来ない」が起きる。 */
    try { if (window.XEVA && XEVA.fesSelect) XEVA.fesSelect.spend(key, 1, f.nm + " セレクト券"); } catch (e) {}
    paintAll();
  }, {
    cap: (f.nm || "FEST") + " SELECT TICKET",
    ttl: "★ " + f.nm + " セレクト券",
    sub: "<b>" + f.nm + "</b> の <b>限定SSR " + pool.length + "体</b>から、"
       + "<b>好きな1体</b>をえらんで手に入れられます。<br>"
       + "すでに持っているキャラをえらぶと<b>限界突破</b>が進みます。",
    cancel: "まだ使用しない",
    note: "※ この一覧は<b>" + f.nm + " にいま入っている限定SSR そのまま</b>です"
        + "（あとから加わったキャラもえらべます）。"
        + "<br>※「まだ使用しない」を押しても<b>券は減りません</b>。あとからいつでも使えます。",
  });
}
window.useFesSelTicket = useFesSelTicket;
window.addEventListener("xeva:fessel", () => { try { paintFesSelTicket(); } catch (e) {} });

function paintSelTicket() {
  const box = $("#selbar"); if (!box) return;
  const n = selTickets();
  /* ★★ 2026-08-26 券は<b>PREMIUM SELECT GACHA を開いているときだけ</b>出す（ご指定）。
     ほかのガチャ（GRAND DEBUT・各フェス）では使えない券なので、
     そこに出ていると「このガチャで使えるのかな」と読めてしまう。 */
  if (!n || gMode !== "premium") { box.innerHTML = ""; return; }
  box.innerHTML =
    '<button class="selcard" onclick="useSelTicket()">' +
      '<span class="seli">★</span>' +
      '<span class="selt"><b>プレミアムセレクト券を使う</b>' +
        "<small>" + PREMIUM_NM + " の<b>SSR（最新のキャラまで）</b>（" + selTicketAll().length +
        "体）の中から、<b>好きな1体を確定で</b>受け取れます" +
        "（持っているキャラをえらぶと限界突破が進みます）</small></span>" +
      '<span class="seln">' + fmt(n) + "</span>" +
    "</button>";
}
let _selUsing = false;
function useSelTicket() {
  if (_selUsing) return;
  if (selTickets() <= 0) { paintSelTicket(); return; }
  /* ★★ 2026-08-26 えらべる顔ぶれは<b>凍結した一覧（SELTICKET_CHARS）</b>（ご指定）。
     ＝「券が登場する前までにプレミアムセレクトガチャに実装されていたキャラ」だけ。
     あとから増えたキャラは入らない＝中身は更新されない。
     ★ 全員が限界突破MAXの人は selTicketPool() が空になる。
       ★★ 2026-09-19j そのときは<b>💠結晶 75個と交換</b>する（ご指定：案1）。 */
  if (!selTicketPool().length && selTicketAll().length) {
    allMaxExchange("★プレミアムセレクト券", () => XEVA.selectTicket.spend(1, "プレミアムセレクト券（結晶に交換）"));
    return;
  }
  const pool = selTicketPool();
  if (!pool.length) { paintSelTicket(); return; }
  _selUsing = true;
  luxOpenSelect(pool, (id) => {
    _selUsing = false;
    if (!id) { paintSelTicket(); return; }  // えらばずに閉じた＝券はそのまま残す
    /* ★ キャラを受け取れてから券を減らす。順番を逆にすると、
       途中で失敗したときに「券だけ消えてキャラが来ない」が起きる。 */
    try { if (window.XEVA && XEVA.selectTicket) XEVA.selectTicket.spend(1, "プレミアムセレクト券"); } catch (e) {}
    paintAll();
  }, {
    cap: "PREMIUM SELECT TICKET",
    ttl: "★ プレミアムセレクト券",
    sub: "<b>" + PREMIUM_NM + "</b> の <b>SSR " + pool.length + "体</b>（最新のキャラまで）から、"
       + "<b>好きな1体</b>をえらんで手に入れられます。<br>"
       + "すでに持っているキャラをえらぶと<b>限界突破</b>が進みます。",
    /* ★★ 2026-08-26 ご指定: えらぶ画面まで来てから<b>やめられる</b>ようにする。
       押しても券は減らない（キャラを受け取ったときだけ減る作りなので、閉じるだけでよい）。 */
    cancel: "まだ使用しない",
    note: "※ この一覧は<b>これから増えません</b>（券が出たあとに追加されたキャラは入りません）。"
        + "<br>※「まだ使用しない」を押しても<b>券は減りません</b>。あとからいつでも使えます。",
  });
}
window.useSelTicket = useSelTicket;
window.addEventListener("xeva:selticket", () => { try { paintSelTicket(); } catch (e) {} });

/* ═════════════════════════════════════════════════════
   ★★ 2026-09-13c ガチャの<b>天井</b>＝★星煌印（ご指定）
   ------------------------------------------------------------
   ・ガチャ<b>1連ごとに 1つ</b>たまる（数えるのは mb-core.js の sealAdd）。
   ・<b>150個</b>で、そのガチャの<b>ピックアップキャラ</b>から好きな1体と交換。
   ★ たまっていないときも帯を<b>出しておく</b>。「あと何回で確実にもらえるか」を
     見せるのが天井の役目なので、隠すと機能そのものが伝わらない。
   ★ えらぶ画面は BLACK SELECT と同じ luxOpenSelect を使いまわす
     （＝限界突破の進みかた・演出・所持の反映が必ずそろう）。
   ═════════════════════════════════════════════════════ */
/* ★★ 2026-09-19j 天井の顔ぶれ（表示用）。全員 完凸で sealPool が空のときも、そのガチャの顔ぶれを返す
   （帯を消すと印が使えなくなるため。使うと 💠75個との交換になる） */
function sealShowPool(m) {
  const p = (typeof sealPool === "function") ? sealPool(m) : [];
  if (p.length) return p;
  try {
    if (isFesMode(m) && fesDef(m) && Array.isArray(fesDef(m).chars)) return fesDef(m).chars.filter((id) => CHARS[id]);
    if (isDebutMode(m)) return debutVerOfMode(m) ? debutCharsOfMode(m) : [];
    return [curPickup()];
  } catch (e) { return []; }
}
function paintSealBar() {
  const box = $("#sealbar"); if (!box) return;
  if (typeof sealGet !== "function" || typeof sealKeyOfMode !== "function") { box.innerHTML = ""; return; }
  const key = sealKeyOfMode(gMode);
  const pool = sealShowPool(gMode);
  /* 交換できる相手がいないガチャ（スタンバイ中の GRAND DEBUT など）では出さない */
  if (!key || !pool.length) { box.innerHTML = ""; return; }
  const n = sealGet(gMode), need = SEAL_NEED;
  const rdy = n >= need;
  const pct = Math.max(0, Math.min(100, (n / need) * 100));
  const left = Math.max(0, need - n);
  box.innerHTML =
    '<div class="sealcard' + (rdy ? " rdy" : "") + '"' + (rdy ? ' onclick="useSeal()"' : "") + ">" +
      '<img class="sealic" src="' + SEAL_IMG + '" alt="★星煌印">' +
      '<span class="sealbd"><b>★星煌印（天井）</b>' +
        "<small>" + (rdy
          ? "<b>" + need + "個</b>たまりました！ <b>" + gachaNmOfMode(gMode) +
            "</b> のピックアップ <b>" + pool.length + "体</b>から好きな1体と交換できます"
          : "1連ごとに1つたまります。<b>あと " + left + "個</b>（＝あと " + left +
            "回）で、ピックアップ <b>" + pool.length + "体</b>から好きな1体と交換できます") +
        "</small>" +
        '<span class="sealtr"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
      "</span>" +
      /* ★★ 2026-09-19e MAX（150）をこえても数は止めずに出す（ご指定）。交換すると150だけ減る */
      '<span class="sealn"><b>' + fmt(n) + "</b><span>／ " + need + "</span></span>" +
      (rdy ? '<button class="sealgo" onclick="event.stopPropagation();useSeal()">交換する</button>' : "") +
    "</div>";
}
let _sealUsing = false;
function useSeal() {
  if (_sealUsing) return;
  const mode = gMode, key = sealKeyOfMode(mode);
  if (!key) return;
  if (sealGet(mode) < SEAL_NEED) { paintSealBar(); return; }
  const pool = sealPool(mode);
  const nm = gachaNmOfMode(mode);
  /* ★★ 2026-09-19j ピックアップが全員 完凸だと sealPool が空になる（完凸は排出対象から外れるため）。
     そのときも印が使えなくならないよう、そのガチャの顔ぶれを見て 💠75個と交換する。 */
  if (!pool.length) {
    let all = [];
    try { all = (isFesMode(mode) && fesDef(mode) && Array.isArray(fesDef(mode).chars)) ? fesDef(mode).chars.filter((id) => CHARS[id])
      : isDebutMode(mode) ? debutCharsOfMode(mode) : [curPickup()]; } catch (e) {}
    if (all.length && all.every((id) => isMaxAwk(id))) {
      allMaxExchange("★星煌印 " + SEAL_NEED + "個", () => XEVA.seal.spend(key, SEAL_NEED, nm + " 天井（結晶に交換）"));
      return;
    }
    paintSealBar(); return;
  }
  /* ★★ 2026-09-19j 交換できるピックアップが全員 完凸なら 💠75個と交換 */
  if (!pool.some((id) => !isMaxAwk(id))) {
    allMaxExchange("★星煌印 " + SEAL_NEED + "個", () => XEVA.seal.spend(key, SEAL_NEED, nm + " 天井（結晶に交換）"));
    return;
  }
  _sealUsing = true;
  luxOpenSelect(pool, (id) => {
    _sealUsing = false;
    if (!id) { paintSealBar(); return; }   // えらばずに閉じた＝印はそのまま残す
    /* ★ キャラを受け取れてから印を減らす。順番を逆にすると、
       途中で失敗したときに「印だけ消えてキャラが来ない」が起きる。 */
    try { if (window.XEVA && XEVA.seal) XEVA.seal.spend(key, SEAL_NEED, nm + " 天井交換"); } catch (e) {}
    paintAll();
  }, {
    cap: "SEAL EXCHANGE",
    ttl: "★星煌印 " + SEAL_NEED + "個 と交換",
    sub: "<b>" + nm + "</b> の <b>ピックアップ " + pool.length + "体</b>から、"
       + "<b>好きな1体</b>をえらんで手に入れられます。<br>"
       + "すでに持っているキャラをえらぶと<b>限界突破</b>が進みます。",
    cancel: "まだ交換しない",
    note: "※ ★星煌印は<b>ガチャごとに別</b>にたまります（このガチャのぶんだけが減ります）。"
        + "<br>※「まだ交換しない」を押しても<b>印は減りません</b>。あとからいつでも交換できます。",
  });
}
window.useSeal = useSeal;
window.addEventListener("xeva:seal", () => { try { paintSealBar(); } catch (e) {} });

/* ═════════════════════════════════════════════════════
   ★★ 2026-09-13c 新キャラの<b>紹介アニメ</b>（ご指定）
   ------------------------------------------------------------
   「それぞれのガチャで新キャラの紹介のアニメーションを作成し、
     それぞれのガチャで表示してください」＝ ガチャごとに、そのガチャの
   NEW キャラを1体ずつ舞台に出す短い映像を流す。

   ★ 出演者は <b>gachaNewIds(mode) 1本</b>（mb-core.js）。
     確率の NEW 判定（charIsNewNow）と<b>同じ関数</b>を使うので、
     「NEW と出ているのに紹介に居ない」が起きない。
   ★ 演出は<b>全部 CSS のアニメ</b>。動画も画像シーケンスも使わない
     （更新画面と同じ理由——重いし、端末によっては再生されない）。
   ★ 絵は<b>すでにガチャで読んでいるキャラ絵</b>（CHARS[id].img）だけ。
     新しい素材を作らないので、キャラを足せば紹介も自動で増える。
   ★ 自動再生は<b>そのガチャの その顔ぶれで1回だけ</b>（見た印を localStorage に持つ）。
     顔ぶれが変われば印も変わる＝キャラが増えたらまた流れる。
     何度でも見たい人のために、帯（#ncibar）から手で開ける。
   ═════════════════════════════════════════════════════ */
const NCI_SEEN_KEY = "mb_nci_seen_v1";
/* ★ このファイルにはエスケープの道具が無かったので作る
   （キャラの名前・技の名前を innerHTML へ入れるので必ず通す）。 */
function nciEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const NCI_MS = 5200;                 /* 1体を見せる長さ（帯が5本あるので長め） */

/* ══ ★★ 2026-09-13d 技の帯の台帳（ご指定の配置案どおり）══
   BURST ／ LINK SKILL ／ SUB LINK SKILL ／ SHOT SKILL ／ NEXUS SKILL の5本。
   ★ 色と印はここ1か所。帯を足すときもここへ1行足すだけにする。
   ★ 印（SVG）は<b>直に書く</b>——外の画像にすると、オフラインで穴が開く。 */
const NCI_KIND = {
  burst: { en: "BURST",          jp: "バースト",         c: "#ff5b9c", c2: "#c2185b",
    ic: '<svg viewBox="0 0 24 24"><path d="M12 1.6l2.2 6.1 6.2 2.3-6.2 2.3L12 18.4l-2.2-6.1L3.6 10l6.2-2.3Z" fill="#fff"/><path d="M19.4 15.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9Z" fill="#fff" opacity=".85"/></svg>' },
  link:  { en: "LINK SKILL",     jp: "リンクスキル",      c: "#4fb0ff", c2: "#1f5cbe",
    ic: '<svg viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"><path d="M9.6 14.4l4.8-4.8"/><path d="M13 6.6l1.3-1.3a3.9 3.9 0 015.5 5.5l-1.3 1.3"/><path d="M11 17.4l-1.3 1.3a3.9 3.9 0 01-5.5-5.5l1.3-1.3"/></g></svg>' },
  sub:   { en: "SUB LINK SKILL", jp: "サブリンクスキル",  c: "#3fd9b4", c2: "#0e8a5c",
    ic: '<svg viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M8.4 13.2l4-4"/><path d="M11.4 6.4l1.1-1.1a3.5 3.5 0 014.9 4.9l-1.1 1.1"/><path d="M9.6 16l-1.1 1.1a3.5 3.5 0 01-4.9-4.9l1.1-1.1"/><path d="M18 15v5M15.5 17.5h5"/></g></svg>' },
  shot:  { en: "SHOT SKILL",     jp: "ショットスキル",    c: "#a97bff", c2: "#5b32c8",
    ic: '<svg viewBox="0 0 24 24"><g fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="6.6"/><circle cx="12" cy="12" r="2.4" fill="#fff" stroke="none"/><path d="M12 1.8v3.2M12 19v3.2M1.8 12h3.2M19 12h3.2" stroke-linecap="round"/></g></svg>' },
  nexus: { en: "NEXUS SKILL",    jp: "ネクサススキル",    c: "#ffc247", c2: "#c07a00",
    ic: '<svg viewBox="0 0 24 24"><path d="M12 1.4l2 6.1 6.1 2-6.1 2-2 6.1-2-6.1-6.1-2 6.1-2Z" fill="#fff"/><path d="M12 19.2l.9 2.6.9-2.6-.9-.5Z" fill="#fff" opacity=".8"/><circle cx="12" cy="11.5" r="1.6" fill="#c07a00"/></svg>' },
};
/* 説明は台帳のまま（<b> や <br> 入り）なので、<b>ふつうの文字にほどく</b>。
   ★ innerHTML へ入れる前に必ず通すこと。 */
function nciPlain(s) {
  return String(s == null ? "" : s)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
/* そのキャラの5本ぶんを組み立てる。★ <b>持っているものだけ</b>並べる。 */
function nciRowsOf(c) {
  const rows = [];
  const push = (k, nm, d) => { if (nm) rows.push({ k, nm, d: nciPlain(d) }); };
  push("burst", c.ssName, c.ssDesc || c.ssPow);
  push("link", c.fsName, c.fsDesc || c.fsPow);
  try {
    const s = (typeof SUBFS !== "undefined" && c.subfs) ? SUBFS[c.subfs] : null;
    if (s) push("sub", s.nm, s.desc || s.pow);
  } catch (e) {}
  try {
    const s = (typeof SHOTSKILLS !== "undefined" && c.shotskill) ? SHOTSKILLS[c.shotskill] : null;
    if (s) push("shot", s.nm, s.desc || s.pow);
  } catch (e) {}
  try {
    const n = (typeof NEXUS !== "undefined" && c.nexus) ? NEXUS[c.nexus] : null;
    if (n) push("nexus", n.nm, n.desc);
  } catch (e) {}
  return rows;
}

function nciSeenLoad() {
  try { const r = localStorage.getItem(NCI_SEEN_KEY); const o = r ? JSON.parse(r) : null;
        return (o && typeof o === "object") ? o : {}; } catch (e) { return {}; }
}
function nciSeenSave(o) { try { localStorage.setItem(NCI_SEEN_KEY, JSON.stringify(o)); } catch (e) {} }
/* 「そのガチャの いまの顔ぶれ」を1本の文字列にしたもの（＝見た印のしるし） */
function nciSig(mode) {
  const ids = (typeof gachaNewIds === "function") ? gachaNewIds(mode) : [];
  return ids.length ? ids.slice().sort().join(",") : "";
}
function nciIsSeen(mode) {
  const sig = nciSig(mode);
  return !sig || nciSeenLoad()[sealKeyOfMode(mode) || mode] === sig;
}
function nciMarkSeen(mode) {
  const sig = nciSig(mode); if (!sig) return;
  const o = nciSeenLoad(); o[sealKeyOfMode(mode) || mode] = sig; nciSeenSave(o);
}

/* 入口の帯。NEW のキャラがいるときだけ出す。 */
function paintNciBar() {
  const box = $("#ncibar"); if (!box) return;
  if (typeof gachaNewIds !== "function") { box.innerHTML = ""; return; }
  const ids = gachaNewIds(gMode);
  if (!ids.length) { box.innerHTML = ""; return; }
  const face = ids.slice(0, 5).map((id) =>
    '<img src="' + CHARS[id].th + '" alt="' + nciEsc(CHARS[id].nm) + '" loading="lazy">').join("");
  box.innerHTML =
    '<button class="ncib" onclick="nciOpen()">' +
      '<span class="ncibi">🎬</span>' +
      '<span class="ncibt"><b>新キャラクター紹介を見る</b>' +
        "<small>" + gachaNmOfMode(gMode) + " の <b>NEW " + ids.length + "体</b>を紹介します</small></span>" +
      '<span class="ncibf">' + face + "</span>" +
    "</button>";
}

let _nciIds = [], _nciAt = 0, _nciT = 0, _nciMode = "";
function nciClose() {
  const ov = $("#nciOv"); if (!ov) return;
  if (_nciT) { clearTimeout(_nciT); _nciT = 0; }
  ov.classList.remove("on");
  try { document.body.style.overflow = ""; } catch (e) {}
  try { if (!_nciModeOf) nciMarkSeen(_nciMode); } catch (e) {}
  try { paintNciBar(); } catch (e) {}
}
window.nciClose = nciClose;
/* ══ ★★ 2026-09-19g ガチャのタブを押したとき、<b>前回開いたとき以降に出た新キャラ</b>をまとめて紹介（ご指定）══
   ・「前回」はこの画面の控え（NCI_ALL_KEY の at）。はじめての人は NEW の期間（charIsNewNow）のキャラ全員。
   ・キャラごとに<b>どのガチャで出るか</b>を表示する（_nciModeOf）。 */
const NCI_ALL_KEY = "mb_nci_all_v1";
function nciAllCast() {
  let seen = null;
  try { seen = JSON.parse(localStorage.getItem(NCI_ALL_KEY) || "null"); } catch (e) {}
  const list = (window.MB_NEW_CHARS || []).filter((n) => n && CHARS[n.id] && n.mode && !charSecret(n.id));
  const out = [], modeOf = {};
  /* はじめて（控えが無い）ときは、いちばん新しい追加日のキャラだけ（NEW の期間まるごとだと多すぎる） */
  const latest = list.reduce((m, n) => (String(n.since || "") > m ? String(n.since || "") : m), "");
  /* 2回目からは<b>前回紹介した日以降</b>に追加されたキャラだけ（同じ日に増えたぶんは見た控えで外す） */
  let from = latest;
  if (seen && seen.at) { const d = new Date(seen.at); from = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  list.forEach((n) => {
    if (String(n.since || "") < from) return;
    let isNew = false; try { isNew = charIsNewNow(n.id, fesDef(n.mode)); } catch (e) {}
    if (!isNew) return;
    if (seen && Array.isArray(seen.ids) && seen.ids.indexOf(n.id) >= 0) return;
    if (out.indexOf(n.id) < 0) { out.push(n.id); modeOf[n.id] = n.mode; }
  });
  return { ids: out, modeOf };
}
function nciAllMarkSeen(ids) {
  let seen = null;
  try { seen = JSON.parse(localStorage.getItem(NCI_ALL_KEY) || "null"); } catch (e) {}
  const s = (seen && Array.isArray(seen.ids)) ? seen.ids : [];
  ids.forEach((id) => { if (s.indexOf(id) < 0) s.push(id); });
  try { localStorage.setItem(NCI_ALL_KEY, JSON.stringify({ ids: s.slice(-400), at: Date.now() })); } catch (e) {}
}
function nciOpenAll() {
  const c = nciAllCast();
  if (!c.ids.length) return false;
  nciAllMarkSeen(c.ids);
  nciOpen(gMode, c.ids, c.modeOf);
  return true;
}
window.nciOpenAll = nciOpenAll;

/* 1体ぶんを舞台に出す。★ 毎回 class を付け直さないとアニメが再生されない
   （同じ要素を使いまわしているので、いったん外して次のフレームで付ける）。 */
function nciShow(i) {
  const c = CHARS[_nciIds[i]]; if (!c) { nciClose(); return; }
  const el = ELEM[c.el] || { jp: "", nm: "", c: "#4f9bf0" };
  const ov = $("#nciOv");
  /* 空の色はその子の属性に寄せる（案の「水色の空」を属性色でうっすら染める） */
  ov.style.setProperty("--nc", el.c);
  ov.style.setProperty("--nc2", el.tint || el.c);

  const fl = $("#nciFlash"); fl.classList.remove("go"); void fl.offsetWidth; fl.classList.add("go");

  /* ★★ 2026-09-13c 立ち絵（c.img）はキャッシュしていないので、
     オフラインだと取れないことがある。そのときは<b>サムネイル（c.th）へ落とす</b>。 */
  const art = $("#nciArt");
  art.classList.remove("go");
  art.innerHTML = '<img src="' + c.img + '" alt="' + nciEsc(c.nm) + '" ' +
    'onerror="if(this.dataset.fb)return;this.dataset.fb=1;this.src=' + "'" + c.th + "'" + '">';
  void art.offsetWidth; art.classList.add("go");

  $("#nciEl").textContent = el.jp + "属性 ・ " + el.nm;

  /* 名前は1文字ずつ跳ねる（更新画面・同期画面とそろえてある） */
  const nm = $("#nciNm");
  nm.innerHTML = String(c.nm).split("").map((ch, k) =>
    '<span class="hp' + (ch === " " ? " sp" : "") + '" style="animation-delay:'
    + (0.28 + k * 0.07).toFixed(3) + 's">' + (ch === " " ? "" : nciEsc(ch)) + "</span>").join("");

  const no = (typeof charNoOf === "function") ? charNoOf(_nciIds[i]) : "";
  /* ★★ 2026-09-19g どのガチャで出るかも出す（まとめて流すときに分からなくならないように） */
  const _gm = (_nciModeOf && _nciModeOf[_nciIds[i]]) || _nciMode;
  let _gnm = ""; try { _gnm = gachaNmOfMode(_gm) || ""; } catch (e) {}
  $("#nciTy").textContent = (no ? no + " ・ " : "") + (c.type || "") + (_gnm ? " ・ 🎰 " + _gnm + " で登場" : "");

  /* 技の帯。★ ある項目だけ出す（無いキャラで空の帯が残らないように） */
  const rows = nciRowsOf(c);
  const sk = $("#nciSk");
  sk.innerHTML = rows.map((r, k) => {
    const d = NCI_KIND[r.k];
    return '<div class="nrow" style="--rc:' + d.c + ';--rc2:' + d.c2 + ';animation-delay:'
      + (0.5 + k * 0.15).toFixed(2) + 's">' +
      '<span class="nr-badge"><span class="nr-ic">' + d.ic + "</span>" +
        '<span class="nr-lb">' + d.en + "<i>" + d.jp + "</i></span></span>" +
      '<span class="nr-bd">' +
        '<span class="nr-t"><b>' + nciEsc(r.nm) + "</b><s></s><em>✦</em></span>" +
        '<span class="nr-d">' + nciEsc(r.d) + "</span>" +
      "</span>" +
      '<span class="nr-th"><img src="' + c.th + '" alt="" loading="lazy"></span>' +
      "</div>";
  }).join("");
  requestAnimationFrame(() => sk.querySelectorAll(".nrow").forEach((r) => r.classList.add("go")));

  /* ★★ 2026-09-17b 詳細は<b>ボタンを作らず一面に</b>（ご指定の言い直し）。
     まず MagiBurst の面（技の帯＋ステータス＋アビリティ）、時間がたつと<b>自動で MagiBocciaRush の面</b>へ。
     ★ MagiBurst の適性クエストは出さない（ご指定）。 */
  const bx = $("#nciBurstX");
  if (bx) bx.innerHTML = nciBurstHTML(_nciIds[i]);
  const bc = $("#nciBoccia");
  if (bc) bc.innerHTML = nciBocciaHTML(_nciIds[i]);
  const mb = $("#nciBattle");
  if (mb) mb.innerHTML = nciBattleHTML(_nciIds[i]);
  nciPage("burst");

  const dots = $("#nciDots");
  dots.innerHTML = _nciIds.map((x, k) => '<i class="' + (k === i ? "on" : "") + '"></i>').join("");
  $("#nciCap").textContent = (i + 1) + " / " + _nciIds.length;

  /* パネルは1体ごとに上へ戻す（前の子で下までスクロールしたまま次が出ない） */
  try { const p = ov.querySelector(".nci-panel"); if (p) p.scrollTop = 0; } catch (e) {}

  if (_nciT) { clearTimeout(_nciT); }
  _nciT = setTimeout(nciAdvance, NCI_MS);
}
/* ══ ★★ 2026-09-17b 1体の中の2つの面（MagiBurst → MagiBocciaRush）══ */
const NCI_BOCCIA_MS = 5200;
let _nciPg = "burst";
function nciPage(pg) {
  _nciPg = pg;
  const ov = $("#nciOv"); if (!ov) return;
  ov.classList.toggle("pg-boccia", pg === "boccia");
  ov.classList.toggle("pg-battle", pg === "battle");
  document.querySelectorAll("#nciPg button").forEach((b) => b.classList.toggle("on", b.dataset.pg === pg));
  try { const p = ov.querySelector(".nci-panel"); if (p) p.scrollTop = 0; } catch (e) {}
  if (pg === "boccia" || pg === "battle") {
    const bc = $(pg === "boccia" ? "#nciBoccia" : "#nciBattle");
    if (bc) { bc.classList.remove("go"); void bc.offsetWidth; bc.classList.add("go"); }
  }
}
/* 時間がたったとき・余白をタップしたとき：MagiBurst の面なら Boccia の面へ、Boccia の面なら次のキャラへ */
function nciAdvance() {
  if (_nciT) { clearTimeout(_nciT); _nciT = 0; }
  /* ★★ 2026-09-23 MagiBurst → MagiBattle → MagiBocciaRush → 次のキャラ */
  if (_nciPg === "burst") {
    nciPage("battle");
    _nciT = setTimeout(nciAdvance, NCI_BOCCIA_MS);
  } else if (_nciPg === "battle") {
    nciPage("boccia");
    _nciT = setTimeout(nciAdvance, NCI_BOCCIA_MS);
  } else {
    nciNext();
  }
}
function nciGoPage(pg, ev) {
  if (ev) ev.stopPropagation();
  if (_nciT) { clearTimeout(_nciT); _nciT = 0; }
  nciPage(pg);
  _nciT = setTimeout(nciAdvance, pg === "burst" ? NCI_MS : NCI_BOCCIA_MS);
}
window.nciGoPage = nciGoPage;
function nciBurstHTML(id) {
  const c = CHARS[id];
  let st = null;
  try { st = statsOf(id, MAX_LV, MAX_AWK, null); } catch (e) {}
  const num = (v) => Number(v || 0).toLocaleString();
  let abs = [];
  try { abs = (typeof sortedAbil === "function" ? sortedAbil(c) : (c.abil || [])); } catch (e) { abs = c.abil || []; }
  const abil = abs.map((a) => '<span class="nd-chip">' + nciEsc(typeof abilName === "function" ? abilName(a) : a.t) + "</span>").join("");
  return (st ? '<div class="nd-stats">'
    + '<span><i>HP</i><b>' + num(st.hp) + "</b></span>"
    + '<span><i>攻撃力</i><b>' + num(st.atk) + "</b></span>"
    + '<span><i>スピード</i><b>' + nciEsc(typeof spdKmh === "function" ? spdKmh(st.spd) : num(st.spd)) + "</b></span></div>" : "")
    + '<div class="nd-chips">' + abil + "</div>";
}
/* ★★ 2026-09-23 MagiBattle の面（ガチャなので Lv.80・完凸の値）。性能は magibattle-stats.js の1本 */
function nciBattleHTML(id) {
  if (!(window.MBStats && MBStats.VERSION >= 2)) {
    if (typeof mbtEnsure === "function") mbtEnsure().then(() => {
      if (window.MBStats && MBStats.VERSION >= 2 && _nciIds[_nciAt] === id) { const el = $("#nciBattle"); if (el) el.innerHTML = nciBattleHTML(id); }
    });
    return '<div class="nd-note">MagiBattle の性能を読みこんでいます…</div>';
  }
  if (!MBStats.unit(id)) return '<div class="nd-note">このキャラの MagiBattle の性能はまだありません。</div>';
  try { MBStats.ensureCSS(); } catch (e) {}
  return MBStats.detailHTML(id, { lv: MBStats.MAX_LV, awk: MBStats.MAX_AWK, compact: true });
}
function nciBocciaHTML(id) {
  if (!(window.MBR && MBR.VERSION >= 4)) {
    if (typeof mbrEnsure === "function") mbrEnsure().then(() => {
      if (window.MBR && MBR.VERSION >= 4 && _nciIds[_nciAt] === id) { const bc = $("#nciBoccia"); if (bc) bc.innerHTML = nciBocciaHTML(id); }
    });
    return '<div class="nd-note">MagiBocciaRush の性能を読みこんでいます…</div>';
  }
  const c = MBR.charOf(id);
  if (!c) return '<div class="nd-note">このキャラの MagiBocciaRush の性能はまだありません。</div>';
  const kit = MBR.kitText(c, "ja");
  const ty = kit.type;
  const bars = MBR.STAT_KEYS.map((k) => '<div class="nd-bar"><span class="k">' + MBR.STAT_NM[k].en.replace("SKILL ", "") + "</span>"
    + '<span class="b"><i style="width:' + Math.round((c.st[k] - 20) / 80 * 100) + "%;background:" + (k === ty.main ? "#ff3b52" : k === ty.weak ? "#9aa3b5" : "#4f9bf0") + '"></i></span>'
    + '<span class="v">' + c.st[k] + "</span></div>").join("");
  const sk = (tag, col, nm, d) => '<div class="nd-sk" style="--kc:' + col + '"><b>' + nciEsc(nm) + "</b><small>" + tag + "</small><div>" + d + "</div></div>";
  return '<div class="nd-ty"><span style="background:' + ty.c + '">' + ty.ja + " TYPE</span>"
    + "得意 <b>" + nciEsc(kit.strong) + "</b>／苦手 <b>" + nciEsc(kit.weak) + "</b></div>"
    + '<div class="nd-bars">' + bars + "</div>"
    + kit.specials.map((x) => sk("特殊ショット", x.c, x.nm, x.d)).join("")
    + sk("アクティブ", "#2f8fff", kit.active.nm, kit.active.d)
    + sk("パッシブ", "#2fd18c", kit.passive.nm, kit.passive.d)
    + sk("アルティメット", "#e39a10", kit.ult.nm, kit.ult.d);
}
function nciNext() {
  _nciAt++;
  if (_nciAt >= _nciIds.length) { nciClose(); return; }
  nciShow(_nciAt);
}

/* ★★ 2026-09-19g まとめて流すときの「そのキャラがどのガチャか」 */
let _nciModeOf = null;
function nciOpen(mode, idsIn, modeOf) {
  mode = mode || gMode;
  if (typeof gachaNewIds !== "function") return;
  const ids = idsIn || gachaNewIds(mode);
  if (!ids.length) return;
  const ov = $("#nciOv"); if (!ov) return;
  _nciIds = ids; _nciAt = 0; _nciMode = mode; _nciModeOf = modeOf || null;
  ov.classList.add("on");
  try { document.body.style.overflow = "hidden"; } catch (e) {}
  /* ★ タップで次へ。閉じるボタンと<b>スクロールできる帯の上</b>では拾わない
     （説明を読もうとしただけで次へ飛んでしまう）。 */
  ov.onclick = (e) => {
    const t = e.target;
    if (t && t.closest && (t.closest(".nci-x") || t.closest(".nrow") || t.closest(".nd-sk") || t.closest("#nciPg"))) return;
    nciAdvance();
  };
  try { if (window.SFX && SFX.pick) SFX.pick(); } catch (e) {}
  nciShow(0);
}
window.nciOpen = nciOpen;

/* ガチャを開いたとき・切りかえたときに、まだ見ていない紹介を1回だけ自動で流す。
   ★ 描き終わってから開く（描画の途中で全画面をかぶせると、下の画面が組み上がらない）。 */
let _nciAuto = 0;
/* ★★ 2026-09-19g ガチャの画面を<b>初めて開いたときの自動再生はやめた</b>（ご指定）。帯（#ncibar）から手で見られる。 */
function nciMaybeAuto() { return; }
function nciMaybeAutoOld() {
  if (_nciAuto) { clearTimeout(_nciAuto); _nciAuto = 0; }
  const mode = gMode;
  _nciAuto = setTimeout(() => {
    try {
      if (document.getElementById("nciOv") && !nciIsSeen(mode) && mode === gMode
          && !document.querySelector("#luxSelOv")) nciOpen(mode);
    } catch (e) {}
  }, 620);
}

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-19e ガチャの一覧（ご指定の画像の構造・横にスライドしてえらぶ）
   ------------------------------------------------------------
   ・1枚のカード＝「期間 ＋ 提供割合・詳細」「バナー」「注目キャラ（所持・凸）」「単発・10連」。
   ・カードは横にスライド（scroll-snap）。上の名前の札を押してもそのガチャへ動く。
   ・単発・10連を押すと<b>そのガチャの画面へ行って、その場で回す</b>（演出は今までどおり）。
   ・それぞれのガチャの左上には一覧へ戻る BACK を常に出す（gachaBack）。
   ★ 顔ぶれ・値段・無料・天井は<b>今までと同じ関数</b>（gachaMenuList / gachaCost / sealGet…）を見る。
   ══════════════════════════════════════════════════════════════ */
let glMode = true;       // いま一覧を見ているか
let glIdx = 0;           // 一覧でいま中央にあるカード
function glBanner(k) {
  return isDebutMode(k) ? debutBannerOf() : k === "premium" ? "MagiBurst/img/bn_premium_s.webp" : fesBannerOf(k);
}
function glLocked(k) {
  if (isDebutMode(k)) return !debutVerOfMode(k);
  if (k === ARCHIVE_KEY) return !archiveChars().length;
  return isFesMode(k) && fesLocked(k);
}
function glChars(k) {
  /* ★★ 2026-09-19g PREMIUM SELECT と Festival Archive は<b>直近でそのガチャに追加された5体</b>（ご指定） */
  if (k === "premium") return byCharNoDesc(PREMIUM_CHARS.filter((id) => CHARS[id])).slice(0, 5);
  if (k === ARCHIVE_KEY) return byCharNoDesc(archiveChars().filter((id) => CHARS[id])).slice(0, 5);
  if (isFesMode(k) && k !== ARCHIVE_KEY && fesDef(k) && Array.isArray(fesDef(k).chars)) return fesDef(k).chars.slice();
  try { return pickIdsOfMode(k); } catch (e) { return []; }
}
function glCostBtn(k, n) {
  const fes = isFesMode(k) && fesTicketOK(k);
  const ssr = n === 10 ? '<span class="ssrtag">SSR確定</span>' : "";
  const label = n === 1 ? "シングル" : "10連";
  if (isDebutMode(k) && debutVerOfMode(k)) {
    if (n === 1 && debutFreeLeft(k) > 0) return `<button class="pbtn" onclick="glPull('${k}',1)"><span class="freetag">1回無料</span><b>${label}</b><small>無料</small></button>`;
    if (n === 10 && debutFree10Left(k) > 0) return `<button class="pbtn p10" onclick="glPull('${k}',10)"><span class="freetag">初回無料</span><b>${label}</b><small>無料</small></button>`;
  }
  const c = gachaCost(n, fes);
  const ok = DB.orbs >= c.gems;
  const p = [];
  if (c.fes) p.push(`<i class="pf">F</i>${c.fes}`);
  if (c.tickets) p.push(`<i class="pg">G</i>${c.tickets}`);
  if (c.gems || !p.length) p.push(`<i class='icc ic-gem'></i>${c.gems}`);
  return `<button class="pbtn ${n === 10 ? "p10" : ""}" ${ok ? "" : "disabled"} onclick="glPull('${k}',${n})">${ssr}<b>${label}</b><small>${p.join(" ＋ ")}</small></button>`;
}
/* ★★ 2026-09-19g そのガチャで使えるセレクト券を持っていれば、「このガチャを引く」の下に小さく出す（ご指定） */
function glSelInfo(k) {
  try {
    if (k === "premium" && selTickets() > 0) return { n: selTickets(), nm: "★プレミアムセレクト券" };
    if (typeof FESSEL_KEYS !== "undefined" && FESSEL_KEYS.indexOf(k) >= 0 && fesSelTickets(k) > 0) return { n: fesSelTickets(k), nm: "フェスセレクト券" };
  } catch (e) {}
  return null;
}
function glSelBtn(k) {
  const s = glSelInfo(k); if (!s) return "";
  return `<button class="gl-sel" onclick="glSel('${k}')">🎟 ${s.nm}を使う<small>所持 ${s.n}枚・好きな1体と交換</small></button>`;
}
function glSel(k) {
  showDetail(k);
  setTimeout(() => { try { if (k === "premium") useSelTicket(); else useFesSelTicket(); } catch (e) {} }, 80);
}
window.glSel = glSel;
/* ★★ 2026-09-19g 開催の予定がもう無いガチャは一覧に出さない（ご指定）。
   ・毎月まわってくる極◯祭（monthly）と無期限（perm）は残す。
   ・終わったフェス（期間つき）・掲載の終わった GRAND DEBUT の古い版は隠す（Festival Archive で引ける）。 */
function glVisible(m) {
  const k = m.k;
  try {
    if (isDebutMode(k)) return k === "debut" || !!debutVerOfMode(k);
    if (k === "premium" || k === ARCHIVE_KEY) return true;
    if (isFesMode(k)) { const f = fesDef(k); if (f && (f.monthly || fesPerm(f))) return true; return !fesEnded(k); }
  } catch (e) {}
  return true;
}
function glList() { return gachaMenuList().filter(glVisible); }
function glCard(m, i) {
  const k = m.k, d = modeDef(k), locked = glLocked(k) || m.soon;
  let seal = "";
  try {
    if (sealKeyOfMode(k) && sealShowPool(k).length) {
      const n = sealGet(k);
      seal = `<span class="gl-seal${n >= SEAL_NEED ? " rdy" : ""}" title="★星煌印（天井）"><img src="${SEAL_IMG}" alt="">${fmt(n)}/${SEAL_NEED}</span>`;
    }
  } catch (e) {}
  const lab = isDebutMode(k) ? "DEBUT" : k === "premium" ? "PREMIUM" : k === ARCHIVE_KEY ? "ARCHIVE" : "FEST";
  const chars = glChars(k).filter((id) => CHARS[id]);
  const row = chars.map((id) => {
    const sec = charSecret(id);
    const dt = dupeText(id);
    /* ★★ 2026-09-19g NEW のキャラには NEW の印（確率の NEW と同じ charIsNewNow） */
    let nw = false; try { nw = !sec && charIsNewNow(id, fesDef(k)); } catch (e) {}
    return `<button class="gl-ch${sec ? " sec" : ""}" ${sec ? "" : `onclick="openDetX('${id}')"`}>${nw ? '<i class="gl-new">NEW</i>' : ""}<img src="${CHARS[id].img}" alt="" loading="lazy">`
      + `<span class="${dt.cls}">${sec ? "???" : dt.cls === "max" ? "完凸" : dt.cls === "have" ? (DB.chars[id].awk ? "+" + DB.chars[id].awk + "凸" : "所持") : "未所持"}</span></button>`;
  }).join("");
  return `<div class="gl-card" data-k="${k}" style="border-color:${m.c}55">
    <div class="gl-hd"><span class="per">${nciEsc(m.nm)}<small>${nciEsc(nciPlain(d.sub || m.sub || ""))}</small></span>
      ${seal}<button onclick="glRates('${k}')">提供割合</button><button onclick="glInfo('${k}')">詳細</button></div>
    <div class="gl-ban"><img src="${glBanner(k)}" alt="${nciEsc(m.nm)}" loading="${i < 2 ? "eager" : "lazy"}">
      <span class="lab">${lab}</span>${m.isNew ? '<span class="nw">NEW</span>' : ""}<span class="nm">${nciEsc(m.nm)}</span></div>
    ${chars.length ? `<div class="gl-pk"><div class="cap">注目キャラ</div><div class="row">${row}</div></div>` : ""}
    ${locked ? `<div class="gl-lock">⏳ ${nciEsc(nciPlain(d.sub || "準備中です"))}</div>`
      /* ★★ 2026-09-19f 一覧では「このガチャを引く」1つだけ。押すとガチャの画面へ（そこで 1回・10連） */
      : `<div class="gl-go"><button class="gl-draw" onclick="glOpen('${k}')">このガチャを引く<small>シングル・10連（SSR確定）</small></button>${glSelBtn(k)}</div>`}
  </div>`;
}
function paintList() {
  const box = $("#glist"); if (!box) return;
  const list = glList();
  if (glIdx >= list.length) glIdx = 0;
  box.innerHTML = `<div class="gl-ttl"><b>注目ガチャ</b><span>下へスクロールしてえらぶ</span></div>`
    + `<div class="gl-tabs">${list.map((m, i) => `<button class="gl-tab${i === glIdx ? " on" : ""}" onclick="glGo(${i})"><i style="background:${m.c}"></i>${nciEsc(m.nm)}${m.isNew ? "<em>NEW</em>" : ""}</button>`).join("")}</div>`
    + `<div class="gl-rail" id="glRail">${list.map(glCard).join("")}</div>`;
}
function glMarkTabs() {
  const tabs = document.querySelectorAll("#glist .gl-tab");
  tabs.forEach((b, i) => b.classList.toggle("on", i === glIdx));
  /* ★★ 2026-09-19g 札の列も、いま見ているガチャの札が見える位置へ横に動かす */
  const bar = document.querySelector("#glist .gl-tabs"), on = tabs[glIdx];
  if (bar && on) bar.scrollTo({ left: on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2, behavior: "smooth" });
}
/* ★★ 2026-09-19g 縦にスクロールしたら、画面の上のほうにあるカードの札を光らせる */
let _glScrollT = 0;
addEventListener("scroll", () => {
  if (!glMode) return;
  clearTimeout(_glScrollT);
  _glScrollT = setTimeout(() => {
    const cards = document.querySelectorAll("#glRail .gl-card"); if (!cards.length) return;
    const tabs = document.querySelector("#glist .gl-tabs");
    const top = (tabs ? tabs.getBoundingClientRect().bottom : 120) + 40;
    let best = 0;
    cards.forEach((c, i) => { if (c.getBoundingClientRect().top <= top) best = i; });
    if (best !== glIdx) { glIdx = best; glMarkTabs(); }
  }, 60);
}, { passive: true });
/* 名前の札を押す＝そのカードまで<b>縦に</b>スクロール */
function glGo(i, instant) {
  const rail = $("#glRail"); if (!rail) return;
  const c = rail.querySelectorAll(".gl-card")[i]; if (!c) return;
  glIdx = i; glMarkTabs();
  if (instant) return;
  const tabs = document.querySelector("#glist .gl-tabs");
  const off = (tabs ? tabs.getBoundingClientRect().bottom : 120) + 6;
  window.scrollTo({ top: window.scrollY + c.getBoundingClientRect().top - off, behavior: "smooth" });
}
/* ★★ 2026-09-19f 「詳細」＝ガチャの画面でキャラより下にある説明（#gnote）を、そのガチャぶん開く */
function glInfo(k) {
  const keep = gMode;
  let html = "", pkText = "";
  try {
    gMode = k; paintPickup(); paintNote();
    html = ($("#gnote") || {}).innerHTML || "";
    /* ★★ 2026-09-19g ガチャの画面で<b>キャラ画像の下にある説明</b>も載せる（絵の並びは外して文だけ） */
    const w = $("#pkwrap");
    if (w) {
      const cl = w.cloneNode(true);
      cl.querySelectorAll(".fgrid,.pkrow,.fcard,button,img").forEach((x) => x.remove());
      pkText = [...cl.querySelectorAll(".pknote,.pksub,.pkhd,div")].filter((x) => !x.children.length && x.textContent.trim())
        .map((x) => x.innerHTML).filter((v, i, a) => a.indexOf(v) === i).map((t) => "<p>" + t + "</p>").join("");
    }
  } catch (e) {}
  gMode = keep;
  try { paintPickup(); paintNote(); } catch (e) {}
  /* ★★ 2026-09-19k 詳細には<b>そのガチャの注目キャラ全員</b>を出す（ご指定）。
     完凸で排出されなくなった子も外さず、「完凸・排出なし」と印を付けて並べる。
     あわせて<b>ガチャの登場日</b>と<b>キャラごとの登場日</b>も書く。 */
  let cast = [];
  try {
    if (k === "premium") cast = PREMIUM_CHARS.slice();
    else if (k === ARCHIVE_KEY) cast = archiveChars();
    else if (isDebutMode(k)) cast = debutVerOfMode(k) ? debutCharsOfMode(k) : [];
    else if (isFesMode(k) && fesDef(k) && Array.isArray(fesDef(k).chars)) cast = fesDef(k).chars.slice();
    cast = byCharNoDesc(cast.filter((id, i, a) => CHARS[id] && a.indexOf(id) === i));
  } catch (e) {}
  const f0 = isFesMode(k) ? fesDef(k) : null;
  /* 登場日：新キャラ台帳（mb-newchars）→ キャラ台帳（xeva.js の MB_CHAR_MASTER の since）→ ガチャの since の順 */
  const master = {};
  try { ((window.XEVA && XEVA.MB_CHARS) || []).forEach((c) => { if (c && c.mbId && c.since) master[c.mbId] = String(c.since).slice(0, 10); }); } catch (e) {}
  const dateOf = (id) => {
    let d = "";
    try {
      d = charImplDate(id) || master[id] || "";
      /* 元のフェスの開始日（Festival Archive のキャラなど） */
      if (!d && typeof fesKeyOf === "function") { const fk = fesKeyOf(id); const ff = fk && FESTS[fk]; if (ff && ff.since) d = ff.since; }
      if (!d && f0 && f0.since) d = f0.since;
    } catch (e) {}
    return d;
  };
  const fmtD = (d) => d ? d.replace(/^(\d+)-(\d+)-(\d+)$/, (m, y, mo, da) => y + "/" + (+mo) + "/" + (+da)) : "";
  /* ガチャの登場日：since があればそれ／無ければ顔ぶれの中でいちばん早い登場日／GRAND DEBUT は版の公開日 */
  let gStart = "";
  try {
    if (isDebutMode(k)) { const v = debutVerOfMode(k); gStart = v ? v.date : ""; }
    else if (f0 && f0.since) gStart = f0.since;
    else if (k !== "premium") gStart = cast.map(dateOf).filter(Boolean).sort()[0] || "";
  } catch (e) {}
  const startHTML = `<div class="gl-start">📅 ガチャの登場日：<b>${gStart ? fmtD(gStart) : (k === "premium" ? "常設（XEVARION 開始時から）" : "—")}</b></div>`;
  const everHTML = cast.length
    ? `<div class="gl-ever"><b>✦ 注目キャラ（${cast.length}体）</b><small>完凸して排出されなくなったキャラも表示しています（押すと性能）</small>`
      + `<div class="gl-evergrid">${cast.map((id) => {
          const sec = charSecret(id);
          const out = !sec && isDropOut(id), cry = !sec && isMaxAwk(id) && isEverDrop(id);
          let nw = false; try { nw = !sec && charIsNewNow(id, f0); } catch (e) {}
          return `<button ${sec ? "" : `onclick="openDetX('${id}')"`} class="${out ? "out" : ""}"><img src="${CHARS[id].th}" alt="" loading="lazy">`
            + `<span>${sec ? "???" : nciEsc(CHARS[id].nm)}</span><em>${sec ? "登場前" : fmtD(dateOf(id)) || "初期から"}</em>`
            + (nw ? '<i class="nw">NEW</i>' : out ? "<i>完凸・排出なし</i>" : cry ? "<i>完凸→💠</i>" : "") + `</button>`;
        }).join("")}</div></div>`
    : "";
  const d = modeDef(k);
  $("#glInfoCard").innerHTML = `<div class="hd"><b>${nciEsc(d.nm)} の詳細</b><button onclick="glInfoClose()" aria-label="とじる">✕</button></div>`
    + startHTML
    + (pkText ? `<div class="note gl-pktx">${pkText}</div>` : "")
    + `<div class="note">${html || "説明はありません"}</div>` + everHTML;
  $("#glInfoOv").classList.add("on");
  $("#glInfoCard").scrollTop = 0;
}
function glInfoClose() { $("#glInfoOv").classList.remove("on"); }
window.glInfo = glInfo; window.glInfoClose = glInfoClose;
/* 見出しの高さ（せまい画面では2段になる）を測って、一覧へ戻るボタンをその下に置く */
function glMeasureHead() {
  const g = document.querySelector(".gh");
  if (g) document.documentElement.style.setProperty("--ghH", Math.round(g.getBoundingClientRect().height) + "px");
}
addEventListener("resize", glMeasureHead);
function showList() {
  glMode = true;
  document.body.classList.add("glmode");
  try { const i = glList().findIndex((m) => m.k === gMode); if (i >= 0) glIdx = i; } catch (e) {}
  paintList();
  glGo(glIdx, true);
  /* 戻ってきたときは、いま見ていたガチャのカードの位置へ（先頭のときはいちばん上） */
  window.scrollTo(0, 0);
  if (glIdx > 0) { const c = document.querySelectorAll("#glRail .gl-card")[glIdx]; if (c) c.scrollIntoView({ block: "start" }); }
}
function showDetail(k) {
  glMode = false;
  document.body.classList.remove("glmode");
  glMeasureHead();
  if (k && k !== gMode) { pickMode(k); } else { paintAll(); window.scrollTo(0, 0); }
}
/* 左上の ← は<b>いつも XEVARION ホームへ</b>。ガチャ一覧へは見出しの下の「‹ ガチャ一覧へ」 */
function gachaBack() { location.href = "index.html"; }
function glOpen(k) { showDetail(k); try { nciMaybeAuto(); } catch (e) {} }
/* 単発・10連：そのガチャの画面へ行って、その場で回す（ご指定） */
function glPull(k, n) {
  showDetail(k);
  setTimeout(() => { try { pull(n); } catch (e) {} }, 60);
}
function glRates(k) {
  if (k !== gMode) { gMode = k; try { markGachaSeen(k); } catch (e) {} }
  openRatesX();
}
window.showList = showList; window.showDetail = showDetail; window.gachaBack = gachaBack;
window.glOpen = glOpen; window.glPull = glPull; window.glRates = glRates; window.glGo = glGo;

function paintAll() {
  if (glMode && document.getElementById("glist")) { paintWal(); paintList(); }
  paintWal(); paintPicker(); paintHero(); paintPickup(); paintNote(); paintPullBar();
  paintNciBar();
  paintSelTicket();
  paintFesSelTicket();
  paintSealBar();
  /* ★★ 2026-08-22b えらばずに閉じた BLACK SELECT（SSRセレクト）があれば出しなおす。
     mb-core.js の paintGacha は gacha-ui.js が丸ごと上書きしているので、こちらにも要る。 */
  try {
    if (window.DB && DB.luxSel && !document.getElementById("luxSelOv") && typeof luxResume === "function") {
      setTimeout(luxResume, 300);
    }
  } catch (e) {}
}
window.addEventListener("xeva:change", () => { paintWal(); paintPullBar(); });
/* 💎ジェム・🎫チケットは XEVARION 共通ウォレット。別タブや同期で動いたら値段表示もそろえる */
window.addEventListener("xeva:gem", () => { paintWal(); paintPullBar(); });
window.addEventListener("xeva:ticket", () => { paintWal(); paintPullBar(); });
window.addEventListener("xeva:festicket", () => { paintWal(); paintPullBar(); });
/* ★★ 2026-08-30 💠結晶（ガチャで増える／ホームの交換所で減る） */
window.addEventListener("xeva:cryst", () => { paintWal(); });
/* ★★ 2026-08-29 最初に開いているガチャも「開いた」ものとして NEW を消す。
   ★ 塗ったあとに消すこと。先に消すと、いま見ているガチャの NEW が
     1回目の描画から出なくなる（気づかないうちに消えた、になる）。 */
/* ★★ 2026-09-19e ハッシュ（#fes15 など）で来たときはそのガチャの画面から、ふつうは<b>一覧</b>から */
if (String(location.hash || "").replace("#", "")) { glMode = false; showDetail(gMode); }
else { glMode = true; showList(); }
try { if (!glMode && markGachaSeen(gMode)) paintPicker(); } catch (e) {}
/* ★★ 2026-09-19g ガチャのタブで開いたとき（一覧）は、前回から増えた新キャラをすぐにまとめて紹介 */
try { if (glMode) setTimeout(() => { try { nciOpenAll(); } catch (e) {} }, 350); } catch (e) {}

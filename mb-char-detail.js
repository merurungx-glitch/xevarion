/* ==========================================================
   キャラクター詳細（性能画面）— ガチャと図鑑で共通

   ★ 中身は MagiBurst の性能そのもの（mb-core.js の CHARS / 評価関数）。
     ここには性能の計算を1行も書かない＝MagiBurst と食いちがわない。
   ★ 使う側（gacha.html / characters.html）は、先に mb-core.js を読んでおくこと。
   ★ 見た目は mb-char-detail.css。
   ========================================================== */
"use strict";

/* ══════════ キャラ詳細（MagiBurst の評価そのまま ＋ MagiBattle の評価） ══════════ */
function openDetX(id) {
  const c = CHARS[id]; if (!c) return;
  if (charSecret(id)) return;
  const st = charStats(id), own = !!DB.chars[id], awk = own ? (DB.chars[id].awk || 0) : 0;
  const sub = SUBFS[c.subfs] || {};
  const s5 = isStar5(id);
  $("#detCard").innerHTML = `
    ${/* ★ 2026-08-11 ✕ は<b>カードの直下</b>に置く。
          以前は .dhero（いちばん上のキャラ絵）の中に position:absolute で置いていたので、
          下へスクロールすると絵ごと画面の外へ流れて<b>閉じるボタンが見えなくなっていた</b>。
          float:right ＋ position:sticky にして、どこまでスクロールしても右上に残るようにする。 */""}
    <button class="dx" onclick="closeDetX()" aria-label="とじる" title="とじる">✕</button>
    <div class="dhero">
      <img src="${c.img}" alt="${c.nm}">
      <div class="dnm"><b>${c.nm}</b><span>${charNoText(id)}　${s5 ? "★★★★★" : "★★★★"}${awk ? (awk >= MAX_AWK ? "　👑完凸" : "　覚醒+" + awk) : ""}</span></div>
    </div>
    <div class="dbody">
      <div class="dchips">
        <span class="dchip" style="color:${ELEM[c.el].c};border-color:${ELEM[c.el].c}66">${ELEM[c.el].nm}属性</span>
        <span class="dchip">${c.shot === "pierce" ? "貫通" : "反射"}</span>
        <span class="dchip">${c.type}</span>
        <span class="dchip">${own ? "所持済み" : "未所持"}</span>
      </div>
      <div class="dstats">
        ${["HP", "攻撃力", "スピード"].map((k, i) => `<div class="dst"><i>${k}</i><b>${fmt([st.hp, st.atk, st.spd][i])}</b></div>`).join("")}
      </div>

      <div class="dsec"><div class="t">アビリティ</div>
        <div class="dabs">${sortedAbil(c).map((a) => `<span class="dab" title="${abilDesc(a)}">${abilName(a)}</span>`).join("")
          + connectAbils(id).map((k) => connectChip(k, "dab")).join("")}</div>
        <div class="ddesc" style="margin-top:7px">${sortedAbil(c).map((a) => "<b>" + abilName(a) + "</b>：" + abilDesc(a)).join("<br>")}</div>
      </div>

      ${/* ★ 2026-08-11 発動／未発動は<b>MagiBurst の編成画面だけ</b>で出す。
            XEVARION 側（図鑑・ガチャ）には編成そのものが無いので、状態を出すと必ず「未発動」になり、
            そのキャラの性能が低いように見えてしまっていた。ここでは持っている中身だけを見せる。 */""}
      ${connectDef(id) ? `<div class="dsec"><div class="t">🔗 クロススキル</div>
        <div class="ddesc"><b>発動条件：</b>${connectDef(id).condTx}</div>
        ${connectDef(id).skills.map((s) => `<div class="ddesc" style="margin-top:5px"><b>${s.nm}</b>：${cnxSkillDesc(id, s)}</div>`).join("")}
        <div class="ddesc" style="margin-top:5px"><small>※ 発動しているかどうかは MagiBurst の<b>編成画面</b>で確認できます。<b>クロスの書</b>を持っていると条件を無視して常に発動します。</small></div></div>` : ""}

      <div class="dsec"><div class="t">フルバースト<span class="turn">${c.ssTurns}ターン</span></div>
        <div class="dsk">${c.ssName}</div>
        <div class="dpow">${c.ssPow || ""}</div>
        <div class="ddesc">${c.ssDesc || ""}</div></div>

      <div class="dsec"><div class="t">リンクスキル</div>
        <div class="dsk">${fsIcon(c.fsGlyph || c.fsKind, false, "#7b5cf0", 18)} ${c.fsName}</div>
        <div class="dpow">${c.fsPow || ""}</div>
        <div class="ddesc">${c.fsDesc || ""}</div></div>

      <div class="dsec"><div class="t">サブリンク</div>
        <div class="dsk">${fsIcon(c.subfs, true, "#2e8bff", 18)} ${sub.nm || ""}</div>
        <div class="dpow">${sub.pow || ""}</div>
        <div class="ddesc">${sub.desc || ""}</div></div>

      <div class="dsec"><div class="t">評価（MagiBurst）</div>
        ${strengthBarsHTML(id, "gx_" + id)}
        ${evalHTML(id)}</div>

      ${magiBattleHTML(id)}
    </div>`;
  $("#detOv").classList.add("on");
  try { replayStrengthAnim($("#detCard")); } catch (e) {}
}
window.openDetX = openDetX;
function closeDetX() { $("#detOv").classList.remove("on"); }
window.closeDetX = closeDetX;

/* ══ MagiBattle の評価 ══
   ★ MagiBattle のキャラは XEVA ガチャのマスタ（XEVA.CHARS）でできている。
     MagiBurst 生まれのキャラはそこに居ないので、<b>MagiBattle の性能そのものが無い</b>。
     無いものを計算して出すと嘘になるので、その場合は「性能なし」とはっきり書く。
   ★ ガチャ統合で移ってきたキャラ（コトミ〜リノン・ミオン〜アリサなど）は
     XEVA.CHARS にも居るので、これまでどおり MagiBattle の性能が出る。
     ただし id が食いちがう2体だけ、ここで読み替える。 */
const MB_XEVA_ID = { rinonx: "rinon", shiona: "shion" };
function xevaCharOf(id) {
  const key = MB_XEVA_ID[id] || id;
  const list = (window.XEVA && window.XEVA.CHARS) || [];
  return list.find((x) => x.id === key) || null;
}
function magiBattleHTML(id) {
  const xc = xevaCharOf(id);
  if (!xc || !window.MBStats) {
    return `<div class="dsec mbb"><div class="t">評価（MagiBattle）</div>
      <div class="mbnone">このキャラには <b>MagiBattle 用の性能がありません</b>。<br>
      MagiBattle に出られるのは <b>XEVA ガチャから引き継いだキャラ</b>だけで、
      MagiBurst で生まれたキャラ（および今後の新キャラ）には MagiBattle の性能を用意していません。</div></div>`;
  }
  const el = MBStats.ELEM[MBStats.elemOf(xc)];
  const role = MBStats.ROLES[MBStats.roleOf(xc)];
  const s40 = MBStats.statsAt(xc, 40, 4);
  const kit = MBStats.kitOf(xc);
  return `<div class="dsec mbb"><div class="t">評価（MagiBattle）<span class="turn" style="background:${role.c}">${role.nm}</span></div>
    <div class="dchips">
      <span class="dchip" style="color:${el.c};border-color:${el.c}66">${el.nm}属性</span>
      <span class="dchip">戦力 ${MBStats.powerOf(s40).toLocaleString()}</span>
      <span class="dchip">HP ${s40.hp.toLocaleString()}</span>
      <span class="dchip">攻撃 ${s40.atk.toLocaleString()}</span>
    </div>
    <div class="ddesc"><b>${role.nm}</b>：${role.d}。Lv.40・限界突破MAX での値です。
      スキル${kit.skills.length}種／必殺技${kit.bursts.length}種。</div>
    ${MBStats.statsHTML ? MBStats.statsHTML(xc) : ""}
    <div class="ddesc" style="margin-top:6px;font-size:10px">※ MagiBattle と MagiBurst は<b>別の性能</b>です（属性・役割も別々に決まります）。</div>
  </div>`;
}

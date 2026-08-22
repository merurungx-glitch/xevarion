/* ==========================================================
   キャラクター詳細（性能画面）— ガチャと図鑑で共通

   ★ 中身は MagiBurst の性能そのもの（mb-core.js の CHARS / 評価関数）。
     ここには性能の計算を1行も書かない＝MagiBurst と食いちがわない。
   ★ 使う側（gacha.html / characters.html）は、先に mb-core.js を読んでおくこと。
   ★ 見た目は mb-char-detail.css。
   ========================================================== */
"use strict";


/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-22b MagiTier の評価（ガチャ・図鑑の詳細に出す）
   ------------------------------------------------------------
   MagiTier で公開されているキャラTier表を読んで、
   「この子がどの段にいるか」を詳細の中に出す（ご指定: ガチャでも見られるように）。

   ★ 中身は MagiBurst が読んでいるのとまったく同じ場所（magitier/mbtier）。
     キャッシュのキーも MagiBurst と共有する（magiburst_chartier_v1）ので、
     どちらかで一度開けば、もう片方はオフラインでも出る。
   ★ 表が無い／読めないときは「まだ公開されていません」とだけ出す。
     通信の失敗で詳細そのものが出なくなることは無い。
   ══════════════════════════════════════════════════════════════ */
const MT_CACHE_KEY = "magiburst_chartier_v1";
const MT_FB_PATH = "magitier/mbtier";
function mtFbUrl() {
  const u = (window.XEVARIONFB && window.XEVARIONFB.DB_URL)
    || "https://xevarion-account-default-rtdb.asia-southeast1.firebasedatabase.app";
  return String(u).replace(/\/$/, "") + "/" + MT_FB_PATH + ".json";
}
function mtCacheGet() { try { return JSON.parse(localStorage.getItem(MT_CACHE_KEY) || "null"); } catch (e) { return null; } }
function mtCacheSet(d) { try { localStorage.setItem(MT_CACHE_KEY, JSON.stringify(d)); } catch (e) {} }
let _mtRun = null, _mtAt = 0;
function mtLoad() {
  const cached = mtCacheGet();
  if (cached && Date.now() - _mtAt < 300000) return Promise.resolve(cached);
  if (_mtRun) return _mtRun;
  _mtRun = fetch(mtFbUrl(), { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      _mtRun = null;
      if (d && Array.isArray(d.tiers)) { _mtAt = Date.now(); mtCacheSet(d); return d; }
      return cached;
    })
    .catch(() => { _mtRun = null; return cached; });
  return _mtRun;
}
/* その表の中で、このキャラが何段目にいるか */
function mtRankOf(d, id) {
  const tiers = (d && d.tiers) || [];
  for (let i = 0; i < tiers.length; i++) {
    if ((tiers[i].ids || []).indexOf(id) >= 0) {
      return { i: i, n: tiers.length, label: tiers[i].label || "", bg: tiers[i].bg || "#555", tc: tiers[i].tc || "#fff" };
    }
  }
  return null;
}
/* 詳細の中の枠を、あとから埋める */
function paintTierInto(id) {
  const box = document.getElementById("detTier");
  if (!box) return;
  mtLoad().then((d) => {
    const cur = document.getElementById("detTier");
    if (!cur || cur.getAttribute("data-cid") !== id) return;   /* 読んでいる間に別のキャラを開いたら捨てる */
    if (!d || !Array.isArray(d.tiers) || !d.tiers.length) {
      cur.innerHTML = '<div class="t">評価（MagiTier）</div>'
        + '<div class="mtnone">まだ <b>キャラTier表が公開されていません</b>。'
        + '<br>表を作れるのは <b>MagiTier でアクセスコードを持っている人</b>だけです。</div>';
      return;
    }
    const r = mtRankOf(d, id);
    /* 同じ段にいるキャラの数と、全体で何体が載っているか */
    const total = d.tiers.reduce((a, t) => a + ((t.ids || []).length), 0);
    const at = d.at ? new Date(d.at).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }) : "";
    const scale = d.tiers.map((t, i) => {
      const on = r && r.i === i;
      return '<span class="mtstep' + (on ? " on" : "") + '" style="background:' + (t.bg || "#555")
        + ';color:' + (t.tc || "#fff") + '">' + (t.label || "") + "</span>";
    }).join("");
    cur.innerHTML = '<div class="t">評価（MagiTier）'
      + (r ? '<span class="turn" style="background:' + r.bg + ';color:' + r.tc + '">' + r.label + "</span>" : "")
      + "</div>"
      + '<div class="mtscale">' + scale + "</div>"
      + '<div class="ddesc">'
      + (r
          ? "このキャラは <b>" + r.label + "</b>（上から " + (r.i + 1) + " / " + r.n + " 段目）に置かれています。"
          : "このキャラは<b>まだ表に置かれていません</b>。")
      + "<br><small>" + (d.nm || "キャラTier表") + (at ? " ・ 更新 " + at : "")
      + " ・ 掲載 " + total + " 体。あくまで<b>目安</b>で、クエストのギミックや編成しだいで相性は大きく変わります。</small>"
      + "</div>"
      + '<a class="mtlink" href="MagiTier/MagiTier.html#view=mb">MagiTier で表ぜんたいを見る</a>';
  }).catch(() => {});
}
/* 見た目は<b>直書き</b>ではなく、1回だけ差しこむ（ガチャ・図鑑で同じ CSS を使うため） */
function mtEnsureCSS() {
  if (document.getElementById("mtDetCSS")) return;
  const st = document.createElement("style");
  st.id = "mtDetCSS";
  st.textContent = `
  #detOv .dsec.mt .mtscale{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0 6px}
  #detOv .dsec.mt .mtstep{font-size:10px;font-weight:900;padding:3px 9px;border-radius:99px;opacity:.34;
    line-height:1.3;letter-spacing:.02em}
  #detOv .dsec.mt .mtstep.on{opacity:1;box-shadow:0 0 0 2px rgba(255,255,255,.85),0 3px 10px rgba(0,0,0,.18)}
  #detOv .dsec.mt .mtnone{font-size:11.5px;font-weight:700;line-height:1.8;opacity:.8;margin-top:6px}
  #detOv .dsec.mt .mtlink{display:inline-block;margin-top:8px;font-size:11px;font-weight:900;
    text-decoration:none;padding:6px 12px;border-radius:99px;
    border:1.5px solid rgba(124,232,255,.55);color:#1d78d8}
  #detOv .dsec.mt .mtdate{font-size:10px;opacity:.7}
  `;
  document.head.appendChild(st);
}
/* ══════════ キャラ詳細（MagiBurst の評価そのまま ＋ MagiBattle の評価） ══════════ */
function openDetX(id) {
  const c = CHARS[id]; if (!c) return;
  if (charSecret(id)) return;
  const st = charStats(id), own = !!DB.chars[id], awk = own ? (DB.chars[id].awk || 0) : 0;
  const sub = SUBFS[c.subfs] || {};
  const s5 = isStar5(id);
  /* ★★ 2026-08-22 ガチャの詳細だけ「このキャラの最大値」も出す（ご指定）。
     ガチャで見ているキャラはたいてい未所持＝Lv.1 なので、素の数字だけでは
     その子がどこまで伸びるのかが分からない。<b>図鑑はこれまでどおりいまの値だけ</b>。
     どちらの画面かは、ページ側が立てる window.MBDET_MAXSTATS で決める
     （gacha.html だけが true にする＝ここで画面名を判定しない）。 */
  /* ══ ★★ 2026-08-22b ガチャの詳細は「初期値」と「最大値」だけを出す（ご指定） ══
     ------------------------------------------------------------
     ここは<b>引くかどうかを決める</b>画面なので、知りたいのは
     「この子は素でいくつで、育てきるとどこまで行くのか」。
     ところが前は<b>いまの自分の値</b>（レベル・限界突破・アーク込み）を主役にしていたので、
     ・持っていない子は Lv.1、育てた子は Lv.60 と<b>キャラごとに基準がバラバラ</b>
     ・アークを振っている属性の子だけ数字が大きく見える
     と、キャラどうしを見くらべられなかった。
     ★ statsOf の第4引数に <b>null</b> を渡すと<b>アークを乗せない</b>。
       ここを省略すると手元の DB.arc が乗ってしまう（＝自分の状況に左右される）。 */
  const showMax = !!window.MBDET_MAXSTATS;
  const stBase = showMax ? statsOf(id, 1, 0, null) : null;
  const stMax = showMax ? statsOf(id, MAX_LV, MAX_AWK, null) : null;
  $("#detCard").innerHTML = `
    ${/* ★ 2026-08-11 ✕ は<b>カードの直下</b>に置く。
          以前は .dhero（いちばん上のキャラ絵）の中に position:absolute で置いていたので、
          下へスクロールすると絵ごと画面の外へ流れて<b>閉じるボタンが見えなくなっていた</b>。
          float:right ＋ position:sticky にして、どこまでスクロールしても右上に残るようにする。 */""}
    <button class="dx" onclick="closeDetX()" aria-label="とじる" title="とじる">✕</button>
    <div class="dhero">
      <img src="${c.img}" alt="${c.nm}">
      ${/* ★★ 2026-08-22b レアリティは<b>SSR / SR</b> で統一（ご指定）。
            ★の本数はもう使っていない（クエストの難易度表示の★とまぎらわしいため）。 */""}
      <div class="dnm"><b>${c.nm}</b><span>${charNoText(id)}　<em class="drar ${s5 ? "ssr" : "sr"}">${s5 ? "SSR" : "SR"}</em>${awk ? (awk >= MAX_AWK ? "　👑完凸" : "　覚醒+" + awk) : ""}</span></div>
    </div>
    <div class="dbody">
      <div class="dchips">
        <span class="dchip" style="color:${ELEM[c.el].c};border-color:${ELEM[c.el].c}66">${ELEM[c.el].nm}属性</span>
        <span class="dchip">${c.shot === "pierce" ? "貫通" : "反射"}</span>
        <span class="dchip">${c.type}</span>
        <span class="dchip">${own ? "所持済み" : "未所持"}</span>
      </div>
      ${/* ★ 2026-08-12d 数字のうち<b>アーク強化で増えたぶん</b>を「＋◯◯」で添える（arcPlus は mb-core.js）
            ★ 2026-08-15 数字のうしろではなく<b>下の専用行</b>へ。
              くっつけていたころは、アークを振った項目だけ中の要素が増えて
              3つのマスの高さがそろわず、数字も「8500+420」と一続きに読めていた。
              .hasarc のときは<b>振っていないマスにも空の行</b>を置くので高さがそろう。 */""}
      ${/* ★★ 2026-08-18 数字の下に<b>バー</b>を足した。満タンは全キャラの最大値
            （最大Lv・限界突破MAX）なので、いまどのへんの強さかがひと目で分かる。
            満タンの基準は MagiBurst の性能画面とまったく同じ statMinMax()。 */""}
      <div class="dstats${!showMax && arcHas(st) ? " hasarc" : ""}${showMax ? " hasmax" : ""}">
        ${(() => {
          const mm = (typeof statMinMax === "function") ? statMinMax() : null;
          const gMax = { hp: (mm && mm.hp[1]) || 8500, atk: (mm && mm.atk[1]) || 3200, spd: (mm && mm.spd[1]) || 460 };
          const grad = { hp: "linear-gradient(90deg,#12a97a,#5fd6a0)",
                         atk: "linear-gradient(90deg,#e0642e,#ffb020)",
                         spd: "linear-gradient(90deg,#2e8bff,#7cc4ff)" };
          return ["HP", "攻撃力", "スピード"].map((k, i) => {
            const key = ["hp", "atk", "spd"][i];
            /* ★ 2026-08-16c スピードだけ km/h を付ける（HP・攻撃力は単位なしのまま） */
            const unit = (v) => key === "spd" ? spdKmh(v).replace(" km/h", "<u>km/h</u>") : fmt(v);
            /* ★ 2026-08-22b ガチャは「初期値」を大きい数字に出す（図鑑はこれまでどおり いまの値） */
            const stNow = showMax ? stBase : st;
            const val = unit(stNow[key]);
            const p = Math.max(6, Math.min(100, (stNow[key] / gMax[key]) * 100));
            /* ★★ 2026-08-22 ガチャの詳細だけ「このキャラの最大値」も並べる（stMax）。
               バーは <b>うすい帯＝最大値・濃い帯＝いまの値</b> の二重にして、
               あとどれだけ伸びるのかが長さで分かるようにする。 */
            const pMax = showMax ? Math.max(6, Math.min(100, (stMax[key] / gMax[key]) * 100)) : 0;
            return `<div class="dst"><i>${k}${showMax ? '<em class="dstini">初期</em>' : ""}</i><b>${val}</b>`
              + (!showMax && arcHas(st) ? `<span class="dstarc">${arcPlus(st, key)}</span>` : "")
              + (showMax ? `<span class="dstmax">最大 <b>${unit(stMax[key])}</b></span>` : "")
              + `<span class="dstb">`
              + (showMax ? `<span class="ghost" style="width:${pMax.toFixed(1)}%;background:${grad[key]}"></span>` : "")
              + `<span style="width:${p.toFixed(1)}%;background:${grad[key]}"></span></span></div>`;
          }).join("");
        })()}
      </div>
      <div class="dstnote">バーの満タンは<b>全キャラの最大値</b>（最大Lv・限界突破MAX）です。${
        showMax ? '大きい数字は <b>Lv.1・限界突破なし</b>の<b>初期値</b>、下の「最大」は <b>Lv.' + MAX_LV + '・限界突破MAX</b> まで育てたときの値です'
          + '（バーのうすい帯がそこまでの伸びしろ）。<br><b>あなたの凸・レベル・アークは反映していません</b>——'
          + 'キャラどうしを同じ条件で見くらべられるようにするためです。' : ""}${
        !showMax && arcHas(st) ? '青い <i class="arcup">＋</i> は<b>アーク強化</b>で増えたぶん（上の数字にはもう含まれています）。' : ""}</div>

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
        ${evalHTMLWithMarks(id)}</div>

      ${/* ★★ 2026-08-22b MagiTier の評価（ご指定: ガチャ画面でも見られるように）。
            中身はあとから（通信が返ってから）paintTierInto が入れる。 */""}
      <div class="dsec mt" id="detTier" data-cid="${id}">
        <div class="t">評価（MagiTier）</div>
        <div class="ddesc">読み込んでいます…</div></div>

      ${magiBattleHTML(id)}
    </div>`;
  $("#detOv").classList.add("on");
  try { replayStrengthAnim($("#detCard")); } catch (e) {}
  try { mtEnsureCSS(); paintTierInto(id); } catch (e) {}
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

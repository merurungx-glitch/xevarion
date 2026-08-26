/* ══════════════════════════════════════════════════════════════
   MagiBurst コア（ドメイン層） — MagiBurst と XEVARION のガチャで共有する

   ── なぜ切り出したか ──
   2026-08-10 のガチャ統合で、ガチャの画面が MagiBurst から XEVARION（gacha.html）へ移った。
   このとき<b>キャラとガチャの規則を2か所に書かない</b>ことを最優先にしている。
   コピーを作ると、キャラを1体足すたびに両方を直すことになり、必ずどちらかが古くなるため。
   ここに入っているのは<b>画面に依存しない部分だけ</b>:
     ・属性／アビリティ／リンク・サブリンクの定義とアイコン
     ・キャラクター（CHARS）とその番号・戦型・ステータス計算
     ・ガチャのプール・排出率・抽選・限界突破・キャラ評価
   クエスト・バトル・UI は MagiBurst の index.html に残してある。

   ── 読み込みかた ──
   <b>ふつうの &lt;script&gt;</b>（type="module" ではない）で読むこと。
   トップレベルの const/let はグローバルの字句環境に入るので、
   あとから読み込む MagiBurst 本体のスクリプトからそのまま見える。
     MagiBurst : <script src="js/mb-core.js?v=50"></script>
     gacha.html: <script src="MagiBurst/js/mb-core.js?v=50"></script>

   ── ホストが先に用意しておくもの ──
     window.MB_IMGD … 画像フォルダへの相対パス（MagiBurst は "../img/"、ポータルは "img/"）
     ACC            … ログイン中のアカウント（xeva_account_v1）
     DB / save()    … セーブ（magiburst_v1）。所持キャラ・ジェム・アイテムはここが持ち主
     $  / uiConfirm / uiAlert / SFX / toast … 画面まわりの最小限のもの
   ★ gacha.html はこれらの「軽い実装」を先に置いてから読み込んでいる。

   ── さわるときの注意 ──
   ・このファイルは index.html から<b>行ごと切り出した</b>ものなので、
     中身の書きかた（コメント・並び）は元のままにしてある。
   ・新しいキャラ・新しいガチャはここだけ直せば<b>両方の画面に反映される</b>。
   ══════════════════════════════════════════════════════════════ */
"use strict";

/* ══════════ A: 属性・アビリティ・技・キャラクター・ステータス ══════════ */
/* ══════════ 属性 ══════════ */
const ELEM = {
  fire:  { nm: "火", c: "#ff5d47", tint: "#ff2a00" },
  wood:  { nm: "木", c: "#2fbf71", tint: "#00cc44" },
  water: { nm: "水", c: "#38a6ff", tint: "#0077ff" },
  light: { nm: "光", c: "#f0b429", tint: "#ffcc00" },
  dark:  { nm: "闇", c: "#a86bff", tint: null },
};
const ELEM_GLYPH = {
  fire:  (c, l) => `<path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-2.6 1.4-4.2 2.7-5.7C10.2 9 11 9.4 12 9c.9-.4 1-2.8 0-7Z" fill="${c}"/><path d="M12 11.5c1.3 1.3 2.1 2.3 2.1 3.8a2.1 2.1 0 01-4.2 0c0-1.4 .9-2.4 2.1-3.8Z" fill="${l}"/>`,
  wood:  (c, l) => `<path d="M12 21C6 17 5 9 12 3c7 6 6 14 0 18Z" fill="${c}"/><path d="M12 6.5v12.5M12 11l3-2.2M12 14.5l-3-2.2" stroke="${l}" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
  water: (c, l) => `<path d="M12 3c3.6 4.6 6 7.7 6 10.6A6 6 0 016 13.6C6 10.7 8.4 7.6 12 3Z" fill="${c}"/><path d="M9 14.2a3 3 0 003 3" stroke="${l}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
  light: (c, l) => `<path d="M12 2l1.9 6.3L20 10l-6.1 1.7L12 18l-1.9-6.3L4 10l6.1-1.7Z" fill="${c}"/><path d="M12 6.5l.9 3.1 3.1.9-3.1.9L12 15l-.9-3.1L8 11l3.1-.9Z" fill="${l}"/>`,
  /* ★ 2026-08-06 闇だけ作り直した。
     もとの三日月は「細い弧＋白い星」で、丸い白地（.elch）の上に大きく描くと
     欠けた側が白地にとけこみ、<b>ただの白い円</b>にしか見えなかった。
     ・欠けを浅くした<b>太い三日月</b>にする（白地でも紫の形が残る）。
     ・星は白ではなく<b>属性色</b>で欠けのなかに置く（白地でも消えない）。

     ★ 2026-08-06（その2）右上に四角い角が見えていたのを直した。
       原因は三日月の作り方。「大きい円 −（ずらした円）」を fill-rule:evenodd で
       1本のパスにしていたが、<b>ずらした円は大きい円からはみ出している</b>ので、
       そのはみ出した三日月形（右上）は evenodd では<b>「1回だけ内側」＝塗りつぶし</b>になる。
       それが viewBox の外まで伸び、SVG の枠でスパッと切られて<b>四角い角</b>に見えていた。
     ★ 直し方: 引き算をやめ、<b>三日月そのものの輪郭</b>を描く。
       2つの円の交点 (11.28,2.03) と (21.97,12.72) を結ぶ
       「外側の円の大きいほうの弧」＋「切り取る円の内向きの弧」の2本だけで閉じるので、
       はみ出す部分は最初から存在しない（塗り足しも切れ端も出ない）。 */
  dark:  (c, l) => `<path fill="${c}"`
    + ` d="M11.28 2.03A10 10 0 1 0 21.97 12.72A7.6 7.6 0 0 1 11.28 2.03Z"/>`
    + `<path d="M17 3.9 17.95 5.95 20 6.9 17.95 7.85 17 9.9 16.05 7.85 14 6.9 16.05 5.95Z" fill="${c}"/>`
    + `<path d="M6.2 14.4a6.2 6.2 0 003.6 3.9" stroke="${l}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
};
/* ★ 2026-08-06 属性アイコンを「枠いっぱい」に描き直した。
   これまでは 24×24 の絵をさらに 0.7 倍に縮めて丸のなかへ置いていたので、
   絵そのものは丸の直径の 6割ていどしかなく、小さい表示では火と水の区別すら付かなかった。
   ・グリフごとに「中身の大きさ・中心」がバラバラ（火はたて長・光は星形…）なので、
     ELEM_FIT に <b>中身の中心(cx,cy)と拡大率(s)</b> を持たせ、丸の中心にそろえて拡大する。
   ・拡大率は「中心からいちばん遠い点が半径11まで届く」ように実測して決めた。
     丸（.elch）に内接する大きさなので、絵だけが大きくなり、丸からははみ出さない。
   ・新しい属性を足すときは、ここに { s, cx, cy } を書き足す（書かなければ等倍のまま）。 */
const ELEM_FIT = {
  fire:  { s: 1.38, cx: 12.00, cy: 10.00 },
  wood:  { s: 1.22, cx: 12.00, cy: 12.00 },
  water: { s: 1.32, cx: 12.00, cy: 11.30 },
  light: { s: 1.38, cx: 12.00, cy: 10.00 },
  dark:  { s: 1.09, cx: 12.00, cy: 12.00 },
};
/* 無属性（属性が関係しないリンクスキル・サブリンク）のマーク。
   どの属性の色とも重ならないよう、銀色のひし形にしてある。 */
const NOEL = { nm: "無", c: "#8f8ab0", l: "#ffffffcc" };
const NOEL_GLYPH = (c, l) => `<path d="M12 1.6 22.4 12 12 22.4 1.6 12Z" fill="${c}"/>`
  + `<path d="M12 6.8 17.2 12 12 17.2 6.8 12Z" fill="${l}"/>`;
function elIcon(el, px) {
  const e = ELEM[el];
  if (!e) return noElIcon(px);
  const f = ELEM_FIT[el] || { s: 1, cx: 12, cy: 12 };
  const s = px || 20, g = Math.round(s * 0.98 * 10) / 10;
  return `<span class="elch" style="width:${s}px;height:${s}px"><svg viewBox="0 0 24 24" style="width:${g}px;height:${g}px">`
    + `<g transform="translate(12 12) scale(${f.s}) translate(${-f.cx} ${-f.cy})">`
    + ELEM_GLYPH[el](e.c, e.c === "#f0b429" ? "#fff1b8" : "#ffffffb0")
    + "</g></svg></span>";
}
function noElIcon(px) {
  const s = px || 20, g = Math.round(s * 0.98 * 10) / 10;
  return `<span class="elch" style="width:${s}px;height:${s}px"><svg viewBox="0 0 24 24" style="width:${g}px;height:${g}px">`
    + NOEL_GLYPH(NOEL.c, NOEL.l) + "</svg></span>";
}
/* ══ ★ 2026-08-06 リンクスキル／サブリンクの「属性つき／無属性」表示 ══
   リンクスキル・サブリンクのダメージは <b>持ち主の属性</b> で計算される（dealDamage の elemMult）。
   ところが回復・加速・バフ・FBターン短縮のように <b>ダメージを出さないもの</b> は属性が関係ない。
   どちらなのかがキャラ詳細から読み取れなかったので、技名のとなりに
   <b>属性マーク（火・木・水・光・闇）／無属性マーク</b> を出す。
   ★ ここに載せるのは「ダメージをまったく出さない技」だけ。
     新しい技を足すときは、ダメージが出るなら何も書かなくてよい（＝属性つき扱い）。 */
const NOELEM_FS = { heal: 1 };                       /* リンクスキル（ヒーリングボム） */
const NOELEM_SUB = {                                  /* サブリンク */
  accel: 1, linkspeedup: 1, bubbly: 1, boundheal: 1,
  boundcharge: 1, roundcharge: 1, fbburst4: 1,
  atkspdup: 1,   /* ★ 2026-08-08 攻スピアップ（ダメージを出さない支援） */
};
function isNoElemFs(kind, sub) { return !!(sub ? NOELEM_SUB[kind] : NOELEM_FS[kind]); }
/* el=持ち主の属性／kind=fsKind か subfs／sub=サブリンクなら true／sm=小さい版（バトル中の詳細） */
function fsElemChip(el, kind, sub, sm) {
  const px = sm ? 15 : 19;
  if (isNoElemFs(kind, sub)) {
    return `<span class="elmk no${sm ? " sm" : ""}" title="属性に関係なく効果が出ます">${noElIcon(px)}無属性</span>`;
  }
  const e = ELEM[el] || {};
  return `<span class="elmk${sm ? " sm" : ""}" style="--emc:${e.c}" title="${e.nm}属性のダメージになります（属性相性が乗ります）">${elIcon(el, px)}${e.nm}属性</span>`;
}
const BEATS = { fire: "wood", wood: "water", water: "fire" };
/* 属性相性: 有利属性への攻撃は1.25倍・不利属性へは0.75倍 */
function elemMult(a, d) {
  /* ★ 有利のときの倍率は「アドバンテージ・ネクサス」で伸びる（elemUpMul は後方で定義・関数なのでOK） */
  const up = (typeof elemUpMul === "function") ? elemUpMul() : 1.25;
  if ((a === "light" && d === "dark") || (a === "dark" && d === "light")) return up;
  if (BEATS[a] === d) return up;
  if (BEATS[d] === a) return 0.75;
  return 1;
}
/* 撃種イラスト（SVG） */
function shotSVG(shot, px) {
  const s = px || 15;
  if (shot === "bounce") return `<svg viewBox="0 0 24 24" style="width:${s}px;height:${s}px"><path d="M3 19L8.5 9.5 13 15 19 5" fill="none" stroke="#7cc4ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.5 10.5V4.4h-6.1" fill="none" stroke="#7cc4ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<svg viewBox="0 0 24 24" style="width:${s}px;height:${s}px"><circle cx="12" cy="12" r="5.6" fill="none" stroke="#ffd257" stroke-width="2" opacity=".55"/><path d="M2.5 12h16" stroke="#ffd257" stroke-width="2.4" stroke-linecap="round"/><path d="M15.5 7.5l5 4.5-5 4.5" fill="none" stroke="#ffd257" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function shotChip(shot) {
  return `<span class="shoticon" style="color:${shot === "pierce" ? "#ffd257" : "#7cc4ff"}">${shotSVG(shot)}${shot === "pierce" ? "貫通" : "反射"}</span>`;
}

/* ══════════ アビリティ ══════════ */
const OMNI_TURNS = 2;        // オムニアンチ: 各WAVEの最初の2行動ターンはオールアンチ
const DRAIN_RATE = 0.06;     // ドレイン: 敵ヒット1回につきチームHPの6%を回復
const SOUL_RATE = 0.10;      // ソウルスティール: 敵を1体倒すごとにチームHPの10%を回復
const FSBOOST_MUL = 1.5;     // リンクブースト: リンクスキルの威力1.5倍
const ALLRES_CUT = 0.25;     // 全属性耐性: すべての属性からの被ダメージを25%カット
const SUPERAW_PER = 0.10;    // 超アンチワープ: 画面上のワープ1つにつきステータス+10%
/* ★ 2026-08-03: 超アンチ重力バリアの加速。
   そのショットで最初に重力バリアにふれた1回だけ、このぶんスピードが上がる。 */
const SGRAV_ACCEL = 1.55;
/* ★ 2026-08-03 フェスガチャの道中で出るプレミアムSSRの合計確率（対象キャラで等分）。
   ★ NEWS の本文から参照するので、必ず NEWS より前で定義すること（const の TDZ 対策）。 */
const FES_PREMIUM_TOTAL = 0.05;
/* ★ 2026-08-03 新ギミック「減速壁」: ふれるとその攻撃ターンのあいだ大幅に減速する */
const SLOWWALL_MUL = 0.42;   // ふれた瞬間にスピードをこの倍率にする
const SLOWWALL_FRICTION = 0.045;  // さらに、そのターンのあいだ摩擦をこのぶん強くする
const PRAY_CHANCE = 0.30;    // 治癒の祈り: ボス戦のマップ開始時に30%でHP全回復
const AB_NM = {
  adw: "アンチダメージウォール", aw: "アンチワープ", ms: "マインスイーパー",
  ssboost: "FBブースト", regen: "リジェネ", barrier: "バリア", aura: "パワーオーラ",
  vital: "バイタルキラー", omni: "オムニアンチ", allkiller: "全属性キラー", drain: "ドレイン",
  fsboost: "リンクブースト", allres: "全属性耐性", pray: "治癒の祈り", superaw: "超アンチワープ",
  ablock: "アンチブロック", soul: "ソウルスティール", weakkiller: "弱点キラー",
  poisonkiller: "毒キラー", firstkiller: "ファーストキラー",
  poisonkillerM: "毒キラーM", firstkillerM: "ファーストキラーM",   /* 等級M＝倍率2倍 */
  agrav: "アンチ重力バリア", defkiller: "防御変化キラー", dash: "ダッシュ", bubblemode: "バブリーモード",
  pimmune: "毒無効", fatalkiller: "フェイタルキラー", destroyboost: "デストロイブースト",
  darkmatch: "ダークマッチ", waveboost: "パワーオーラ",
  superms: "超マインスイーパー", sokojikara: "底力", eternalphoton: "エターナルエーテル", resonance: "レゾナンス",
  /* 新アビリティ（v8: 新キャラ4体・新ギミック対応） */
  sgrav: "超アンチ重力バリア", msM: "マインスイーパーM", supermsM: "超マインスイーパーM",
  dashM: "ダッシュM", superadw: "超アンチダメージウォール", regenM: "リジェネM",
  fsboostM: "リンクブーストM", antilock: "アンチロックゾーン", protection: "プロテクション", vitalL: "バイタルキラーL",
  /* v9: プレミアム4体（コハル・ユリ・ホタル・リンネ）用 */
  weakkillerM: "弱点キラーM", vitalM: "バイタルキラーM", sscharge: "FBターンチャージ",
  supermsL: "超マインスイーパーL", soulM: "ソウルスティールM", laserstop: "超レーザーストップ",
  wallboostL: "ウォールブーストL", overheat: "オーバーヒート",
  /* v10: 幽冥の庭園（ヘカーティア）／プレミアム（レゼリア）用 */
  upkillerM: "アップポジションキラーM", drainM: "ドレインM",
  /* v11.3: エルシア用 */
  fsdouble: "リンク×2", counterkiller: "カウンターキラー",
  /* v12: カリナ／ネフィア用 */
  barrierM: "バリアM", wallboostM: "ウォールブーストM", fbaccel: "FBターンアクセル", mobkiller: "ザコキラー",
  /* v13: セツナ／セレネ／ナズナ／リリア／レヴィア用 */
  fsboostL: "リンクブーストL", dashL: "ダッシュL", fbshort: "FBターン短縮",
  /* ★ 2026-08-16 fbtouch は fbshort とまったく同じ「FBターン短縮」という名前だったが、
     中身は別物（fbshort＝毎ターン1多く進む／fbtouch＝ふれた味方の数だけ縮む）。
     同じ名前のアビリティは効果も同じ、という決まりに反していたので
     壁で縮む wallfbshort＝「壁FBターン短縮」にならって「味方FBターン短縮」に改名した。 */
  fbtouch: "味方FBターン短縮", combokillerM: "連撃キラーM", judgment: "ジャッジメント",
  infinitybreakM: "インフィニティブレイクM", fewfoeM: "敵少底力M",
  /* v14: Nocturne Bloom Fest 5体（フィオナ・ミルフィ・メイベル・アビス・アーク）用 */
  msEL: "マインスイーパーEL", lightning: "ライトニング", atkturnkillerM: "アタックターンキラーM",
  mirage: "ミラージュ", linkcharge: "リンクチャージ", weakkillerL: "弱点キラーL",
  auraM: "パワーオーラM", cumulonimbus: "キュムロニンバス", vitalEL: "バイタルキラーEL",
  phantomdrive: "ファントムドライブ",
  /* v14.5: クロエ用 */
  supermsEL: "超マインスイーパーEL", fatalkillerM: "フェイタルキラーM",
  /* v15: Luminous Summer Fest（カグヤα・ミオンα）用 */
  fsboostEL: "リンクブーストEL", combokillerEL: "連撃キラーEL", auraEL: "パワーオーラEL",
  /* 2026-08-03: 新アンチギミック「減速壁」用 */
  aslow: "アンチ減速壁",
  /* ★ v16: プレミアム新SSR 6体（シェリル・フィア・リセラ・ソレリア・ベルティア・アステラ）用 */
  superaslow: "超アンチ減速壁", gravkiller: "重力バリアキラー", healM: "回復M",
  wallfbshort: "壁FBターン短縮", impulseboost: "インパルスブースト", barrierL: "バリアL",
  /* ★ 2026-08-06: プレミアム新SSR 3体（ユリア・アルティア・リアナ）用。
     冥花種キラーは「種族」を見る初めてのキラー。属性キラーとは別枠なので重ねがけできる。 */
  netherkillerEL: "冥花種キラーEL", netherkillerM: "冥花種キラーM",
  sokojikaraM: "底力M", allkillerM: "全属性キラーM",
  /* ★ 2026-08-06: プレミアム新SSR「ソレア」用（重力バリアキラーの等級M） */
  gravkillerM: "重力バリアキラーM",
  /* ★ 2026-08-07: Phantom Legend Fest「野獣先輩」用 */
  allykillfb: "やりますねぇ!", beastrage: "野獣の本気", ailmentresist: "状態異常レジスト",
  /* ★ 2026-08-07: 新アンチギミック「断絶界」（旧・結界）用 */
  award: "アンチ断絶界",
  /* ★ 2026-08-08c: プレミアム新SSR 3体（コトネ・ラン・セリス）用 */
  wallboostEL: "ウォールブーストEL", soulEL: "ソウルスティールEL", manyfoeM: "敵多底力M",
  /* ★ 2026-08-07: プレミアム新SSR 4体（イオリ・ノエル・ユキノ・レイカ）用。
     elemresM は属性を持つので abilName 側で名前を組み立てる（elemres と同じ扱い）。 */
  netherkillerL: "冥花種キラーL", combokillerL: "連撃キラーL",
  barrierEL: "バリアEL", eclipseslayerM: "蝕冥滅殺M",
  /* ★ 2026-08-07 ドミニアの作り直し用。
     ・msL       … マインスイーパーの等級L（無印1.5／M 2.0／L 2.5／EL 3.0）。
                   「超」なしなので<b>WAVE開始時の地雷は持たない</b>（拾って使う）。
     ・mobkillerL … ザコキラーの等級L（無印1.5／L 2.5）。ボス以外の敵に効く。 */
  msL: "マインスイーパーL", mobkillerL: "ザコキラーL",
  /* ★ 2026-08-08 プレミアム新SSR（ナナミ・チトセ）用。
     ・eclipsekillerM  … 蝕魔族キラーM。幽冥の庭園 第11〜15ノ園のボス（蝕魔族）だけに効く。
                        冥花種にも効く「蝕冥滅殺M」とはちがい、蝕魔族ひとつに絞ったぶん扱いやすい。
     ・mobkillerM      … ザコキラーの等級M（無印1.5／M 2.0／L 2.5）。
     ・rightkillerL    … ライトポジションキラーL。画面の<b>右半分</b>にいる敵に効く。
                        アップポジションキラーM（上半分）の左右版。 */
  eclipsekillerM: "蝕魔族キラーM", mobkillerM: "ザコキラーM", rightkillerL: "ライトポジションキラーL",
  /* ★ 2026-08-10 蝕魔族キラーの等級EL（M 2.0／EL 3.0）。カホが冥花種キラーELから乗り換えた先。 */
  eclipsekillerEL: "蝕魔族キラーEL",
  /* ★ 2026-08-08 プレミアム新SSR 4体（カエデ・リノン・ココロ・アンジェ）用。
     ・regenL        … リジェネの等級L（無印5%／M 10%／L 15%）。
     ・fbturnboost   … FBターンブースト。<b>自分の手番で敵を倒すたび</b>にFBが1ターン縮む。
                       「やりますねぇ!」（1体につき3ターン）より小刻みだが、条件が自分の手番だけ。
     ・bosskillerM   … ボスキラーM。ボスにだけ効く（ザコキラーの裏返し）。
     ・allresM       … 全属性耐性M。全属性耐性（30%）の上位で50%カット。
     ・leftkillerM   … レフトポジションキラーM。画面の<b>左半分</b>。rightkillerL の左右版。
     ・laserstopM    … 超レーザーストップM。レーザーを止めるうえ回復量も大きい。
     ・ailsokojikaraM… 状態異常底力M。<b>毒などの状態異常を受けているあいだ</b>だけ与ダメージ2倍。 */
  regenL: "リジェネL", fbturnboost: "FBターンブースト", bosskillerM: "ボスキラーM",
  allresM: "全属性耐性M", leftkillerM: "レフトポジションキラーM",
  laserstopM: "超レーザーストップM", ailsokojikaraM: "状態異常底力M",
  /* ★ 2026-08-10 XEVAガチャ移行SSR（コトミ〜リノン）のクロススキル用の等級EL */
  manyfoeEL: "敵多底力EL", poisonkillerEL: "毒キラーEL",
  /* ★ 2026-08-11 Luminous Summer Fest 限定SSR（シェリーα・ココナα）用。
     ・killerL      … 属性キラーの等級L（無印1.5／M 2.0／L 2.5）。名前は abilName が属性から組み立てる。
     ・allkillerEL  … 全属性キラーの等級EL（無印1.5／M 2.0／EL 3.0）。 */
  allkillerEL: "全属性キラーEL",
  /* ★ 2026-08-17b グレースぶん */
  firstkillerEL: "ファーストキラーEL", phantomdriveEL: "ファントムドライブEL",
  lightningEL: "ライトニングEL", atkcharge: "攻撃力チャージ",
  /* ══ ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定SSR 6体用 ══
     ・sokojikaraEL     … 底力の等級EL（無印1.5／M 2.0／EL 3.0）。
     ・fatalkillerL     … フェイタルキラーの等級L（無印1.5／M 2.0／L 2.5）。
     ・outkillerM／L    … アウトポジションキラー。<b>画面の壁ぎわ</b>にいる敵に効く。
                          アップ／レフト／ライトの「位置キラー」の仲間で、外周が対象。
     ・eclipseslayerEL  … 蝕冥滅殺の等級EL（冥花種と蝕魔族の両方へ）。
     ・konshin          … 渾身。攻撃力が上がるかわりにスピードが下がる（クロススキル専用）。 */
  sokojikaraEL: "底力EL", fatalkillerL: "フェイタルキラーL",
  outkillerM: "アウトポジションキラーM", outkillerL: "アウトポジションキラーL",
  eclipseslayerEL: "蝕冥滅殺EL", konshin: "渾身",
  /* ══ ★ 2026-08-12 蒼夏祭 セイラ用 ══
     ・firstkillerL   … ファーストキラーの等級L（無印1.5／M 2.0／L 2.6）。
     ・destroyboostM  … デストロイブーストの等級M。<b>短縮するFBターンが1→2</b>になるだけで、
                        きっかけ（画面内の敵が倒れる）は無印とまったく同じ。 */
  firstkillerL: "ファーストキラーL", destroyboostM: "デストロイブーストM",
  /* ══ ★ 2026-08-16 プレミアム新SSR「アンナ」用 ══
     ・sokojikaraL … 底力の等級L（無印1.5／M 2.0／L 2.5／EL 3.0）。
       ほかのキラーと同じ 無印→M→L→EL の刻みにそろえた。 */
  sokojikaraL: "底力L",
  /* ══ ★ 2026-08-16b プレミアム新SSR 6体（モエカ・スズハ・ヴィオレット・カナタ・トウカ・エレナ）用 ══
     ・killerEL        … 属性キラーの等級EL（無印1.5／M 2.0／L 2.5／EL 3.0）。
                         名前は abilName が属性から組み立てる（killer/killerM/killerL と同じ）。
     ・gravkillerEL    … 重力バリアキラーの等級EL（無印／M の上）。
     ・fewfoeEL        … 敵少底力の等級EL（M の上）。
     ・eternalphotonM  … エターナルエーテルの等級M。持ち直す数が 2個 → 3個。
     ・speedmode       … スピードモード。<b>各WAVEの開始時</b>から、自分が2回行動し終えるまで
                         スピードが上がる。WAVEをまたぐたびに何度でもかかり直す。 */
  killerEL: "属性キラーEL", gravkillerEL: "重力バリアキラーEL", fewfoeEL: "敵少底力EL",
  eternalphotonM: "エターナルエーテルM", speedmode: "スピードモード",
  weakkillerEL: "弱点キラーEL",   /* 無印1.5／M 2.0／L 2.5／EL 3.0 */
  /* ══ ★ 2026-08-18 ロキシー用 ══
     ・cumulonimbusEL … キュムロニンバスの等級EL。しくみは無印と同じで、
                        落雷の威力・距離ボーナス・着弾の衝撃波が上がる。
     ・houraikillerL  … 蓬莱族キラーL。冥花種キラー・蝕魔族キラーと同じ<b>種族キラー</b>で、
                        敵のスプライトから種族を引く（raceOfSp）。等級は L のみ。
     ・gravkillerL    … 重力バリアキラーの等級L（無印1.5／M 2.0／L 2.5／EL 3.0）。
                        <b>M と EL のあいだが空いていた</b>ので、ほかのキラーと同じ刻みにそろえる。 */
  cumulonimbusEL: "キュムロニンバスEL", houraikillerL: "蓬莱族キラーL", gravkillerL: "重力バリアキラーL",
  /* ══ ★ 2026-08-22b Starlight Academy Fest の調整で新設 ══
     ・atkchargeM  … 攻撃力チャージの等級M。しくみ（1ショットで味方N体にふれる）は
                     無印とまったく同じで、上がる倍率だけ 1.5 → 2.0 になる。
     ・defkillerM  … 防御ダウンキラーの等級M（無印1.5／M 2.0）。
     ★ 等級ちがいは<b>無印と同じ判定・倍率だけ差し替え</b>にすること。
       別の判定を書くと「無印は乗るのにMは乗らない」がすぐ起きる。 */
  atkchargeM: "攻撃力チャージM", defkillerM: "防御ダウンキラーM",
};
/* ══ ★ 2026-08-16b 上の新アビリティの数値 ══ */
const KILLER_EL_MUL = 3.0;        // 属性キラーEL
const GRAVKILLER_EL_MUL = 3.0;    // 重力バリアキラーEL
const FEWFOE_EL_MUL = 3.0;        // 敵少底力EL
const ETERNAL_PHOTON_M_N = 3;     // エターナルエーテルM: 各WAVE開始時に持つエーテルの数
const SPEEDMODE_MUL = 1.5;        // スピードモード: スピードの倍率
const SPEEDMODE_ACTS = 2;         // 同・何回行動し終えるまで続くか
const WEAKKILLER_EL_MUL = 3.0;    // 弱点キラーEL: 弱点直撃・弱点通過の追加倍率（L 2.5 の上）
/* ラウンドヒール: 止まったとき、円の内部にいる味方1体につきチームHPをこの割合だけ回復する */
const ROUNDHEAL_RATE = 0.05;
/* ══ ★ 2026-08-18 ラウンドチャージ／ラウンドヒールの「円」の大きさ ══
   <b>2つの技で同じ値を使う</b>（同じ名前の形の技なので、片方だけ広いと覚え直しになる）。
   これまでは 初期56 → 1フレーム 2.4 ずつ広がり 上限300 だったが、
   ★ 盤面の対角はおよそ 900px あるので、上限300では<b>画面のごく一部</b>しか覆えず、
     「なぞった味方の近くにたまたま居た1体」にしか届かないことが多かった。
     短いショットだと 56＋α のまま止まるので、<b>1体も入らない</b>ことすらあった。
   ・初期半径を広げて、ほとんど動かずに止まっても最低限は届くようにする
   ・広がる速さも上げて、ふつうのショット（60〜120フレーム）で上限近くまで届かせる
   ・上限を上げて、そこまで広がれば<b>編成の大半</b>を巻きこめるようにする */
const ROUND_R0 = 108;          // 円の初期半径（旧 56）
const ROUND_GROW = 3.8;        // 1フレームあたりの広がり（旧 2.4）
const ROUND_RMAX = 520;        // 円の上限（旧 300）
const ROUND_STACK_R = 70;      // 重ねがけ1回ぶんの追加半径（旧 40）
/* ══ ★ 2026-08-16b エレナのフルバースト（アクア・ダブルレクイエム）══
   レヴィアの「撃った瞬間に味方全員で総攻撃」を<b>2回</b>にしたもの。
   1回目は撃った瞬間、2回目は<b>自分が止まったあと もう一度動き出したとき</b>。 */
const ELENA_ATK = 1.7;            // 自強化の攻撃倍率
const ELENA_SPD = 1.2;            // 同・スピード倍率
const ELENA_2ND_POWER = 0.85;     // 2回目に自分で動き出すときの初速（1回目に対する割合）
/* ══ ★ 2026-08-12 蒼夏祭の新アビリティの数値 ══
   ★ ここは killerMul / atkMulOf / spdMulOf / abilDesc から参照される。
     どれも関数なので前後どちらでもよいが、まとめて1か所に置いておく。 */
const SOKOJIKARA_EL_MUL = 3.0;     // 底力EL: チームの残りHPが50%以下のときの倍率
const SOKOJIKARA_L_MUL = 2.5;      // 底力L: 同・等級L（★ 2026-08-16 追加。M 2.0 と EL 3.0 のあいだ）
/* 底力（無印／M／EL）が乗りはじめる、チームHPの割合。
   ★ killerMul の条件も sokojikaraState の判定も、必ずこの1つを見ること。
     片方だけ直すと「光っているのに倍率が乗っていない」が起きる。 */
const SOKO_HP_RATE = 0.5;
const FATALKILLER_L_MUL = 2.5;     // フェイタルキラーL: 残りHP50%以下の敵への倍率
const OUTKILLER_L_MUL = 2.0;       // アウトポジションキラーL: 壁ぎわの敵への倍率
const OUTKILLER_M_MUL = 1.7;       // 同・等級M
/* 「壁ぎわ」とみなす帯の太さ（画面の短いほうの辺に対する割合）。
   盤面のどこが対象なのかが見て分かるよう、外周のおよそ1/5を対象にしている。 */
const OUT_EDGE_RATIO = 0.20;
const ECLIPSE_SLAYER_EL_MUL = 3.0; // 蝕冥滅殺EL: 冥花種・蝕魔族の両方へ
const KONSHIN_ATK = 3.0;           // 渾身: 攻撃力の倍率
const KONSHIN_SPD = 0.5;           // 渾身: スピードの倍率（＝そのぶん飛距離が短くなる）
/* ══ ★ 2026-08-12 蒼夏祭 セイラ（闇／反射）の数値 ══
   ★ フルバーストは<b>史上最高火力</b>。乱打の合計は
     シェリーα／カレム（40連 × ×0.9 ＝ ×36.0）を上回る 40連 × ×1.25 ＝ <b>×50.0</b>。
     そのぶん「壁をすり抜けて最初にふれた敵で止まる」＝<b>狙った1体にしか入らない</b>
     という制約を付けて、範囲型のフルバーストと役割を分けてある。 */
const SEIRA_ATK = 2.4;             // セイラFB: 自強化の攻撃倍率
const SEIRA_SPD = 1.35;            // セイラFB: 自強化のスピード倍率
const SEIRA_BARRAGE_N = 40;        // セイラFB: 乱打の連数
const SEIRA_BARRAGE_PER = 1.25;    // セイラFB: 乱打1発ぶんの攻撃力倍率
const FIRSTKILLER_L_MUL = 2.6;     // ファーストキラーL: そのショットで最初にふれた敵への倍率
const FIRSTKILLER_EL_MUL = 3.4;    /* ★ 2026-08-17b ファーストキラーEL（グレース）。無印1.5／M 2.0／L 2.6／EL 3.4 */
const DESTROYBOOST_M = 2;          // デストロイブーストM: 敵が倒れるたびに縮むFBターン（無印は1）
const PSEEKER20_N = 20;            // ピアスシーカー20: 撃つ発数（12発版と1発の威力は同じ）
/* 敵が「壁ぎわ」にいるか（アウトポジションキラーの判定）。
   ★ 判定はここ1か所だけ。倍率の等級ごとに条件を書き分けないこと。 */
function atOuterEdge(e) {
  if (!e) return false;
  const d = Math.min(W, H) * OUT_EDGE_RATIO;
  return e.x < d || e.x > W - d || e.y < d || e.y > H - d;
}
/* ══ ★ 2026-08-11 属性キラーL／全属性キラーEL の倍率 ══ */
const KILLER_L_MUL = 2.5;          // 属性キラーL: その属性の敵へのダメージ倍率（無印1.5／M 2.0）
const ALLKILLER_EL_MUL = 3.0;      // 全属性キラーEL: すべての属性の敵へのダメージ倍率（M は 2.0）
/* ══ ★ 2026-08-08 新アビリティの数値 ══ */
const ECLIPSEKILLER_M_MUL = 2.0;   // 蝕魔族キラーM: 蝕魔族へのダメージ倍率
const ECLIPSEKILLER_EL_MUL = 3.0;  // 蝕魔族キラーEL: 同・等級EL（冥花種キラーELと同じ倍率）
const MOBKILLER_M_MUL = 2.0;       // ザコキラーM: ボス以外の敵へのダメージ倍率
const RIGHTKILLER_L_MUL = 2.0;     // ライトポジションキラーL: 画面右半分の敵へのダメージ倍率
/* ══ ★ 2026-08-08 プレミアム新SSR 4体のアビリティの数値 ══ */
const REGENL_RATE = 0.15;          // リジェネL: 自ターン終了時の回復量（無印5%／M 10%）
const FBTURNBOOST = 1;             // FBターンブースト: 自分の手番で敵を1体倒すごとに縮むFBターン
const BOSSKILLER_M_MUL = 2.0;      // ボスキラーM: ボスへのダメージ倍率
const ALLRES_M_CUT = 0.50;         // 全属性耐性M: 本人が受けるダメージのカット率（無印は30%）
const LEFTKILLER_M_MUL = 2.0;      // レフトポジションキラーM: 画面左半分の敵へのダメージ倍率
const LASERSTOP_HEAL  = 0.08;      // 超レーザーストップ: レーザーを止めた本人が起こすチームHP回復量
const LASERSTOPM_HEAL = 0.12;      // 超レーザーストップM: レーザーを止めたときのチームHP回復量
const AILSOKOJIKARA_M_MUL = 2.0;   // 状態異常底力M: 状態異常を受けているあいだの与ダメージ倍率
/* ══ ★ 2026-08-08 リフレクションリング（カエデのリンクスキル）══
   キャラからリング状の属性弾を放ち、<b>1回だけ壁で反射</b>して広範囲の敵を攻撃する。
   ★ REFRING_EVERY は「何フレームごとに1発撃つか」。
     ご指定は「3秒毎」だったが、1ショットはふつう3〜5秒で終わるので、
     3秒（180フレーム）だとショット中に1〜2発しか出ず、上限30発にまるで届かない。
     そこで<b>0.3秒（18フレーム）</b>にしてある。3秒に戻すならこの1か所を 180 にするだけでよい。 */
const REFRING_EVERY = 18;      // 射出間隔（フレーム。60フレーム＝1秒）
/* ══ ★ クリア判定の永久引き継ぎ（黄昏の王城・禁忌の迷宮 第1〜25の間）══
   ・<b>一度クリアすれば、翌月も、その先の月もずっとクリア判定</b>として扱う。
     判定のもとは DB.clears（クリアした事実）で、これは毎月のリセットで<b>消さない</b>。
     つまり「先月クリアしたか」ではなく「これまでに一度でもクリアしたか」で引き継ぐ。
   ・毎月ぜんぶ踏み直さなくてよくなるぶん、この範囲の<b>初クリアジェムは CARRY_ORB_CUT ぶん減らす</b>。
   ★ ステージ定義（castleStage / labStage）より前で宣言すること。
     ステージを組み立てたあと、applyCarryOrbCut() でまとめてジェムを下げている。 */
const CARRY_MAX_ROOM = 25;
const CARRY_ORB_CUT = 0.7;     // 第1〜25の間の初クリアジェムに掛ける係数（1未満で減る・最低1個）
/* ══ ★ 2026-08-10 サマーキャンペーン ══
   期間中は<b>クエスト初クリアのジェムが2倍</b>になる。
   ★ 掛け算は必ず firstOrbOf() を通すこと。ジェムを配る場所は
     victory()（ふつうのクリア）と showMonthlyCarry()（月またぎの一括受取）の2か所、
     表示は クエストカード と 一覧のバッジ の2か所ある。直接 st.orb を使うと
     「表示は2倍なのにもらえるのは等倍」のような食いちがいが出る。
   ★ 日付は<b>ローカル日付</b>で見る（toISOString は UTC なので日本は9時間おくれる）。
     ここは const today より前なので、その場で作っている。 */
const SUMMER_FROM = "2026-07-20", SUMMER_TO = "2026-09-15";
const SUMMER_ORB_MUL = 2;
function summerOn() {
  const d = new Date().toLocaleDateString("sv-SE");
  return d >= SUMMER_FROM && d <= SUMMER_TO;
}
/* ステージの「初クリアでもらえるジェム」。キャンペーン中は2倍 */
function firstOrbOf(st) {
  const base = (st && st.orb) || 0;
  return base ? base * (summerOn() ? SUMMER_ORB_MUL : 1) : 0;
}
/* ══ ★ 2026-08-10 ハイクロススティンガー（ナツキのリンク）══
   左右へ展開したあと、近くの敵へ弧を描いて折り返す貫通弾2本。
   ★ 倍率をここ1か所にまとめた。以前は
       ・実際のダメージ … index.html に 1.1 を直書き
       ・技の説明        … mb-core に「×1.1」を手書き
       ・!ボタンの見積り … FS_HIT.hicross が ×0.30 × 1本（＝まるで別の技の数字）
     と3か所に散っていて、!ボタンの威力表示が実戦と合っていなかった。
   ★ 上位の「超強ハイクロススティンガー」は 4本 × 1.70 なので、
     2本 × 1.55 = 3.10 と、上位（6.80）との差はきちんと保たれている。 */
const HICROSS_PER = 1.55;      // ハイクロススティンガー 1発ぶんの攻撃力倍率（1.1 → 1.55）
const HICROSS_N = 2;           // 発射する貫通弾の本数
/* ══ ★ 2026-08-20c 超強ハイクロススティンガー（ソレリア／スカーレット）══
   ご指定で<b>威力を大幅に強化</b>し、演出も派手にした。
   ★ 数字はここ1か所。実装（index.html の case "superhicross"）も
     !ボタンの見積り（FS_HIT.superhicross）も、この定数だけを見ること。
     片方だけ直すと「表示と実ダメージが食いちがう」型の不具合になる。 */
const SHICROSS_PER = 3.60;     // 1発ぶんの攻撃力倍率（1.70 → 3.60）
const SHICROSS_N = 6;          // 発射する貫通弾の本数（4 → 6・左右＋斜め上下）
const SHICROSS_SPD = 19;       // 弾速（17 → 19）
const SHICROSS_TURN = 260;     // ここまで進んだら近くの敵へ折り返す
const REFRING_MAX = 30;        // 1回のリンクで撃てる弾数の上限
const REFRING_PER = 0.30;      // リング1発ぶんの攻撃力倍率
const REFRING_R = 26;          // リングの当たり判定の半径
const REFRING_SPD = 16.5;      // リングの飛ぶ速さ（★2026-08-10 13→16.5：射出が遅く見えたので少し速く）
/* ★ 2026-08-08b ピアスシーカー12（ホタルのリンク／ミオンのサブリンク 共通）の1ヒット倍率
   ★ 2026-08-08c: <b>同じ名前の技は同じ効果</b>にそろえる方針にしたので、1つの値に統一した。
     以前はリンク版 ×0.16 ／ サブリンク版 ×0.20 と、
     <b>同じ「ピアスシーカー12」なのにサブリンクのほうが強い</b>という逆転が起きていた。 */
const PSEEKER_PER = 0.20;      // リンク・サブリンク共通
const PHOMING_PER = PSEEKER_PER;
/* ══ ★ 2026-08-08c 新アビリティ（プレミアム新SSR コトネ・ラン・セリス用） ══ */
const WALLBOOSTEL_MAX = 3.0;   // ウォールブーストEL: 壁ヒットで伸びる攻撃倍率の上限（L=2.5 / M=2.0）
const WALLBOOSTEL_STEP = 0.22; // ウォールブーストEL: 壁1回ごとの上昇量（L=0.18 / M=0.15）
const SOULEL_RATE = 0.22;      // ソウルスティールEL: 敵を1体倒すごとのチームHP回復（M=0.15 / 無印=0.10）
const MANYFOE_M_MUL = 2.0;     // 敵多底力M: 画面上の敵が「敵少底力」の数より多いときの倍率
/* ★ 2026-08-10 XEVAガチャ移行SSR のクロススキルで付く等級EL（アビリティ欄には出ない、
   クロスが発動しているあいだだけ効く）。等級は 無印1.5 ／ M 2.0 ／ L 2.5 ／ EL 3.0。 */
const MANYFOE_EL_MUL = 3.0;    // 敵多底力EL
const POISONKILLER_EL_MUL = 3.0;  // 毒キラーEL
/* ══ ★ 2026-08-08b クロス分身弾／超強クロス分身弾 ══
   ★ 「クロス分身弾」は<b>ココナのもの（fsKind:"cross"）に統一</b>した。
     以前は同じ名前で
       ・ココナ … 6体の分身が壁で反射しながら動きまわり、敵を貫通して削り続ける
       ・リセラ … 4体の分身が十字に並んで外向きの貫通弾を連射する
     という<b>まったく別の技</b>が2つあり、名前だけでは見分けられなかった。
     いまはどちらも spawnCrossClones() の1本にまとめてある。
   ★ 「超強クロス分身弾」はその<b>強化版</b>＝分身の数・1ヒットの威力・動く時間を伸ばしたもの。 */
const CC_CLONES = 6;           // クロス分身弾: 分身の数
const CC_PER = 0.52;           // クロス分身弾: 分身1ヒットぶんの攻撃力倍率
const CC_SPD = 17;             // クロス分身弾: 分身の初速
const SCC_CLONES = 10;         // 超強クロス分身弾: 分身の数（無印は6体）
const SCC_PER = 0.86;          // 超強クロス分身弾: 1ヒットぶんの攻撃力倍率（無印は0.52）
const SCC_SPD = 21;            // 超強クロス分身弾: 分身の初速（無印は17）
/* ══ ★ 2026-08-08 攻スピアップ（カエデのサブリンク）══ */
const ATKSPD_ATK = 1.6;        // ふれた味方の攻撃力倍率（そのショットのあいだ）
const ATKSPD_SPD = 1.4;        // ふれた味方の弾速倍率
/* ══ ★ 2026-08-08 アンジェのフルバースト ══ */
const ANGE_HEAL = 0.08;        // 味方に1体ふれるごとに回復するチームHPの割合
const ANGE_MOB_MUL = 3.0;      // ボス以外（ザコ）に入る追撃ちダメージの倍率
/* ══ ★ 2026-08-07 新アビリティの数値 ══ */
const MOBKILLER_L_MUL = 2.5;       // ザコキラーL: ボス以外の敵へのダメージ倍率（無印は1.5）
const MSL_MUL = 2.5;               // マインスイーパーL: 地雷1個消費で攻撃倍率（等級L）
const AWARD_ONE_HIT = true;        // アンチ断絶界: 1回ふれるだけで断絶界を破壊できる
const NETHERKILLER_L_MUL = 2.5;    // 冥花種キラーL（M=2.0／EL=3.0 のあいだ）
const COMBOKILLERL_MAX = 2.5;      // 連撃キラーL: 同じ敵に連続で触れたときの上限倍率
const COMBOKILLERL_STEP = 0.32;    // 連撃キラーL: 1回ごとの上昇量
const BARRIER_EL = 8000;           // バリアEL: 等級EL（L=5,600）
const ECLIPSE_SLAYER_M_MUL = 2.0;  // 蝕冥滅殺M: 冥花種・蝕魔族の両方へ ×2.0
const ELEMRES_M_CUT = 0.50;        // 属性耐性M: その属性から受けるダメージを50%カット
/* ══ ★ 2026-08-07 野獣先輩のアビリティの数値 ══ */
const ALLYKILL_FB = 3;        // やりますねぇ!: 敵1体撃破につき短縮するFBターン
const BEASTRAGE_HP = 0.25;    // 野獣の本気: 残りHPがこの割合以下で発動
const BEASTRAGE_MUL = 2.5;    // 野獣の本気: ステータス倍率
const AILRESIST_HP = 0.75;    // 状態異常レジスト: 残りHPがこの割合以上なら状態異常を受けない
/* ══ ★ 2026-08-06 新アビリティの数値 ══ */
const NETHERKILLER_EL_MUL = 3.0;  // 冥花種キラーEL: 冥花種（幽冥の庭園のボス）への倍率
const NETHERKILLER_M_MUL = 2.0;   // 冥花種キラーM
const SOKOJIKARA_M_MUL = 2.0;     // 底力M: 自チームの残りHPが50%以下のときの倍率（底力は1.5）
const ALLKILLER_M_MUL = 2.0;      // 全属性キラーM: すべての属性の敵への倍率（全属性キラーは1.5）
/* キラー対象の種族。ここを見る場所は killerMul と abilDesc の2か所だけ */
const NETHER_RACE = "netherbloom";
/* ★ 2026-08-07 蝕魔族（Dominia の種族）。幽冥の庭園 第11〜15ノ園のボスがこの種族。
   蝕冥滅殺（eclipseslayerM）は「冥花種＋蝕魔族」の両方に効く庭園特化キラー。 */
/* ★ キーは "eclipsedemon"。BOSSES には既に "eclipse"（エクリプス）がいるので、
   読むときに取りちがえないよう別の綴りにしてある。 */
const ECLIPSE_RACE = "eclipsedemon";
/* ★ 2026-08-17i 蓬莱族（蓬莱の九重のボス）。
   瑶華＆玉蘭（第一重〜第九重）と瑶妃（蓬莱天宮）が属する。
   ★ 種族を増やすときに直すのは RACES と SP_RACE と SP_NAME の3か所だけ。 */
const HOURAI_RACE = "houraifolk";
/* ══ v16 新アビリティの数値 ══ */
const SUPERASLOW_MUL = 1.6;    // 超アンチ減速壁: 減速壁にふれたときの加速倍率（各ターン最初の1回）
const GRAVKILLER_MUL = 1.5;    // 重力バリアキラー: 重力バリアを持つ敵への倍率
const GRAVKILLER_M_MUL = 2.0;  // 重力バリアキラーM（等級M）
/* ══ ★ 2026-08-08 「回復」と「リジェネ」の役割を分けた ══
   これまで 回復M（healM）は リジェネM（regenM）とまったく同じ「自分のターン終了時に◯%」で、
   名前がちがうだけの重複アビリティになっていた。以後は
     リジェネ … <b>毎ターン</b>かならず一定量回復する（安定・受け身）
     回復     … <b>そのターンに自分がふれた味方の数</b>に応じて回復する（動いた分だけ・攻め）
   ・回復量は「等級が同じなら、最終的におなじくらい」になるようにそろえてある。
     リジェネM = 10%（毎ターン確定）／回復M = ふれた味方1体につき4%（最大3体＝12%）。
     味方2体をなぞる標準的な1ショットで 8%、全員なぞって 12%。
   ・上限を3体（＝自分以外の全員）で止めているのは、同じ味方に何度もふれて
     回復を無限に伸ばせないようにするため（回復しすぎ防止）。 */
const HEALM_PER = 0.04;        // 回復M: ふれた味方1体につき回復するチームHPの割合
const HEALM_MAX_ALLY = 3;      // 回復M: 数える味方の上限（＝自分以外の3体まで）
const WALLFB_MAX = 4;          // 壁FBターン短縮: 1ショットで短縮できる上限
const IMPULSE_P = 0.20;        // インパルスブースト: 敵にふれたときの発動確率
const IMPULSE_MUL = 1.45;      // インパルスブースト: 発動したときの加速倍率
const BARRIER_L = 5600;        // バリアL: 等級L
const SOLERIA_WEAK_MUL = 6.0;  // ソレリアFB: 弱点ヒットごとの追加ダメージ（攻撃力×）
/* ══ v14 新アビリティの数値（フェスキャラ用） ══ */
const MSEL_MUL = 3.0;          // マインスイーパーEL: 地雷1個消費で攻撃倍率（等級EL）
const VITALEL_MUL = 3.0;       // バイタルキラーEL: 残りHP50%以上の敵への倍率
const WEAKKILLERL_MUL = 2.5;   // 弱点キラーL: 弱点直撃・弱点通過の追加倍率
const AURAM_MUL = 2.0;         // パワーオーラM: チームHP50%以上のとき攻撃・スピード倍率
const ATKTURN_KILLER_MUL = 2.0;// アタックターンキラーM: 攻撃ターンが残り1の敵への倍率
const LIGHTNING_P = 0.20;      // ライトニング: 発動確率
const LIGHTNING_MUL = 3.2;     // ライトニング: 落雷の威力（攻撃力×）
/* ★ 2026-08-17b ライトニングEL（グレースのクロススキル）。確率も威力も上がる */
const LIGHTNING_EL_P = 0.35;
const LIGHTNING_EL_MUL = 5.0;
const MIRAGE_P = 0.20;         // ミラージュ: 敵の攻撃を回避する確率
const LINKCHARGE_P = 0.50;     // リンクチャージ: リンク命中でFBターンを1短縮する確率
const CUMULO_MUL = 12.0;       // キュムロニンバス: 予約した敵への落雷ダメージ（攻撃力×）
const CUMULO_DIST = 2400;      // キュムロニンバス: この距離を走ると強化が最大になる
const CUMULO_MAX = 2.2;        // キュムロニンバス: 距離で得られるステータス倍率の上限
/* ══ ★ 2026-08-18 キュムロニンバスEL（ロキシー）══
   無印と<b>まったく同じしくみ</b>の上位等級。ちがうのは数字と、落雷のあとに走る衝撃波だけ。
   ・落雷の威力が上がる（×12.0 → ×" + CUMULO_EL_MUL + "）
   ・距離のボーナスが早く満ちて、上限も高い（2400px で×2.2 → 1800px で×2.6）
   ・落雷の着弾点から<b>まわりの敵へも衝撃波</b>が走る（落雷の CUMULO_EL_SPLASH ぶん） */
const CUMULO_EL_MUL = 18.0;    // キュムロニンバスEL: 予約した敵への落雷ダメージ（攻撃力×）
const CUMULO_EL_DIST = 1800;   // 同・この距離を走ると強化が最大になる
const CUMULO_EL_MAX = 2.6;     // 同・距離で得られるステータス倍率の上限
const CUMULO_EL_SPLASH = 0.35; // 同・まわりの敵へ走る衝撃波（落雷ダメージに対する割合）
const CUMULO_EL_SPLASH_R = 320;// 同・衝撃波がとどく半径
const HOURAIKILLER_L_MUL = 2.5;// 蓬莱族キラーL: 蓬莱族（🏯 蓬莱の九重のボスなど）へのダメージ倍率
const GRAVKILLER_L_MUL = 2.5;  // 重力バリアキラーL: 重力バリアを持つ敵へのダメージ倍率（M 2.0 と EL 3.0 のあいだ）
const PHANTOM_WALLS = 3;       // ファントムドライブ: 何回目の壁ヒットで発動するか
const PHANTOM_MUL = 1.8;       // ファントムドライブ: 発動中のステータス倍率
const PHANTOM_TURNS = 2;       // ファントムドライブ: 効果が続く自分の行動回数
/* ★ 2026-08-17b ファントムドライブEL（グレースのクロススキル）。
   発動に必要な壁ヒットが1回少なく、倍率も持続も上。 */
const PHANTOM_EL_WALLS = 2;
const PHANTOM_EL_MUL = 2.6;
const PHANTOM_EL_TURNS = 3;
/* ★ 2026-08-17b 攻撃力チャージ（グレース）。
   1ショットのあいだに味方を数えて、ちょうど ATKCHARGE_N 体目にふれた味方の
   攻撃力を1巡のあいだ上げる。「なぞる順番」に意味が出るアビリティ。 */
const ATKCHARGE_N = 3;
const ATKCHARGE_MUL = 1.5;
/* ★ 2026-08-22b 攻撃力チャージM（サヤカ）。ふれる人数は無印と同じ3体で、倍率だけ上がる。 */
const ATKCHARGE_M_MUL = 2.0;
/* ★ 2026-08-22b 防御ダウンキラーM（サユリのクロススキル）。無印1.5 → M 2.0。 */
const DEFKILLER_M_MUL = 2.0;
/* ★ 2026-08-17b グレースのフルバースト（自強化の倍率） */
const GRACE_ATK = 1.75;
const GRACE_SPD = 1.15;
const GRACE_KILL_TURNS = 2;    // 弱点キラー＋全属性キラーになる「自分の行動」回数
/* ★ 2026-08-17b 超強インフィニティレーザー（グレース）。
   インフィニティレーザー（×1.60＋八方分裂×0.55）の強化版。 */
const SINFL_PER = 3.20;        // 本体の極太レーザー
const SINFL_SPLIT_PER = 1.15;  // 分裂レーザー1本ぶん
const SINFL_SPLIT_N = 12;      // 分裂する方向の数（8 → 12）
const SINFL_W = 96;            // 本体レーザーの太さ（62 → 96）
/* ══ ★ 2026-08-18 ロキシーのフルバースト「豪雷積層雲」 ══
   ゲーム内でいちばん重い一撃。<b>チームHPを支払って</b>、盤面ごと落雷で塗りつぶす。
   ★ 定数はここ1か所。演出（index.html の runRoxyFB）も効果もこの値だけを見る。
   ★ 削り量は<b>最大HPに対する割合</b>。残りHP割合にすると、削るほど効かなくなって
     「詰めに使えない」技になる（ココナのハート爆撃と逆の設計にしてある）。 */
const ROXY_TURNS = 20;         // フルバーストに必要なターン
const ROXY_HP_COST = 0.15;     // 撃つときに支払うチームHPの割合
const ROXY_ATK = 2.5;          // 自強化の攻撃倍率
const ROXY_SPD = 1.25;         // 同・スピード倍率（暗転中に走るので少しだけ上げる）
const ROXY_MAXHP_CUT = 0.35;   // 落雷で削る「敵の最大HP」に対する割合
const ROXY_DELAY = 2;          // 落雷で入る攻撃ターンの遅延（即死カウントにも同じだけ入る）
const ROXY_DEBUFF_TURNS = 4;   // 防御ダウン・毒の継続ターン
/* 積乱雲の下ぶちが降りてくる位置（盤面の高さに対する割合）。
   ★ ここを大きくすると敵が雲に隠れるので、<b>敵の上ぎりぎり</b>で止めてある。 */
const ROXY_CLOUD_BOTTOM = 0.30;
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-20 GRAND DEBUT GACHA 新SSR 5体のフルバースト定数
   ------------------------------------------------------------
   ミレーユ／スカーレット／コユキの3体は<b>新しい ssKind</b> を持つ。
   どれも「自強化＋撃った瞬間の全体効果」だけで完結する形にしてあるので、
   停止後の再走やヒットごとのフックは要らない（＝取りこぼしが出ない）。
   ★ 新しい ssKind を足したら必ず次の4か所も直すこと（どれか1つでも抜けると静かに壊れる）:
     ① SS_TAGS（FB種別の絞り込み）
     ② launchShot の「自強化型は初速1.3倍」の一覧
     ③ ssBumpMul の「体当たり倍率は selfBuff 側で乗る」一覧（＝既定の×1.5を二重に掛けない）
     ④ runSS の分岐そのもの（index.html）
   ══════════════════════════════════════════════════════════════ */
const MIRELLE_TURNS = 18;        // フルバーストに必要なターン
const MIRELLE_ATK = 2.2;         // 自強化の攻撃倍率
const MIRELLE_SPD = 1.3;         // 同・スピード倍率
const MIRELLE_DEF_TURNS = 3;     // 敵全体の防御ダウンの継続ターン
const MIRELLE_METEOR_N = 6;      // 紅蓮メテオの数
const MIRELLE_METEOR_MUL = 1.6;  // 紅蓮メテオ1発の倍率（火属性・属性有利が乗る）
const SCARLET_TURNS = 18;
const SCARLET_ATK = 2.1;
const SCARLET_SPD = 1.35;
const SCARLET_HEAL = 0.30;       // 撃った瞬間に回復するチームHPの割合（最大HPに対する割合）
const SCARLET_DELAY = 2;         // 敵全体の攻撃ターン遅延（即死のカウントにも同じだけ入る）
const KOYUKI_TURNS = 18;
const KOYUKI_ATK = 2.15;
const KOYUKI_SPD = 1.3;
const KOYUKI_POISON_TURNS = 3;   // 敵全体の毒の継続ターン
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-22 Starlight Academy Fest 限定SSR 5体のフルバースト定数
   ------------------------------------------------------------
   オトハ（火）／サヤカ（水）／サユリ（闇）／アカリ（木）／ヒナタ（光）。
   5体とも<b>新しい ssKind</b> を持つ。強さの基準は<b>ミレーユ級</b>
   （自強化 ＋ 撃った瞬間の全体効果ひとつ）でそろえてある。必要ターンも18で共通。

   ★ 全体効果は5体とも<b>別のもの</b>にしてある:
       オトハ … 敵全体の弱点コアを開放（味方全員の弱点ヒットが伸びる）
       サヤカ … 味方全員がそのあいだ貫通になる
       サユリ … 敵全体の攻撃力ダウン
       アカリ … 味方全員のフルバーストターンを進める
       ヒナタ … 画面上のすべての敵へ光の柱が落ちる
     同じ効果を2人に持たせると、片方を引く意味がなくなるため。

   ★ 新しい ssKind を足したら必ず次の4か所も直すこと（どれか1つでも抜けると<b>静かに</b>壊れる）:
     ① SS_TAGS（FB種別の絞り込み）
     ② launchShot の「自強化型は初速1.3倍」の一覧
     ③ ssBumpMul の「体当たり倍率は selfBuff 側で乗る」一覧（＝既定の×1.5を二重に掛けない）
     ④ applyNewSS の分岐そのもの（index.html）
   ══════════════════════════════════════════════════════════════ */
const STARLIGHT_TURNS = 18;        // 5体とも共通（ミレーユたちと同じ）
const OTOHA_ATK = 2.25;
const OTOHA_SPD = 1.30;
const OTOHA_WEAK_TURNS = 4;        // 敵全体の弱点コア開放が続くターン
const SAYAKA_ATK = 2.10;
const SAYAKA_SPD = 1.40;
const SAYAKA_PIERCE_ACTS = 2;      // 味方全員が貫通でいられる「その味方の行動」回数
const SAYURI_ATK = 2.20;
const SAYURI_SPD = 1.30;
const SAYURI_ATKDOWN_TURNS = 4;    // 敵全体の攻撃力ダウンが続くターン
const SAYURI_ATKDOWN_MUL = 0.55;   // 同・敵の攻撃力にかかる倍率（ミズキの 0.65 より強い）
const AKARI_ATK = 2.05;
const AKARI_SPD = 1.25;
const AKARI_FB_CUT = 4;            // 味方全員のフルバーストターンを進めるぶん
const HINATA_ATK = 2.15;
const HINATA_SPD = 1.35;
/* ★★ 2026-08-22b 光の柱を強化（1.55 → 2.40）。
   ねらいを付けずに全体へ入るぶん1本を軽くしていたが、
   ほかの4人が「弱点開放」「総攻撃」「攻撃力ダウン」「FB加速」と
   <b>チーム全体をまるごと動かす</b>のに対して、ヒナタだけ数字が伸びなかった。
   柱は<b>本人のキラー倍率が乗る</b>（withDmgSrc で包んである）ので、
   闇属性キラーL・蓬莱族キラーL と重なると蓬莱天宮でそのまま火力になる。 */
const HINATA_PILLAR_MUL = 2.40;    // 全敵に落ちる光柱1本の倍率（光属性・属性有利が乗る）
/* ══ 共通サブリンク「スターライト・ヴェール」（Starlight Academy Fest の目印） ══
   本人を中心に五芒星の光の帯が開き、<b>5本の極大レイ</b>が STARVEIL_SPINS 回転ぶん薙ぎ払う。
   ★ アブソリュートレイ10 との違いは「本数は少ないが<b>1本が太く・長く・強く</b>、
     しかも<b>回転ごとに当たり直す</b>」こと。近くで撃つほど当たり直しの回数が増える。
   ★ 描画は既存の absweep（アブソリュートレイの薙ぎ払い）を流用する＝
     新しい描画分岐を作らないので「絵が出ないリンク」になりようがない。 */
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 新SSR 5体のリンクスキル定数
   ------------------------------------------------------------
   グレン（火）／ユウナ（水）／モモ（闇）／チハヤ（木）／ユイ（光）。
   5体とも<b>新しいリンクスキル</b>を持つ（ご指定）。

   ★ 新しい fsKind を足したら、必ず次の<b>4か所すべて</b>に足すこと。
     1つでも抜けると「絵が出ない」「威力が0と表示される」「絞り込みに出ない」が起きる。
       ① fireFriendMain の case（index.html）… 実際の効果
       ② FS_HIT（index.html）                … !ボタンの威力の見積り
       ③ FS_TYPE / FS_TAGS（index.html）     … 絞り込み
       ④ drawFsGlyph の case（このファイル）  … アイコン
   ★ 描画（drawEffect）は<b>既存の type を使いまわす</b>（laser / wave / ring / phbullet /
     wallring / circulation / pillar）。新しい描画分岐を作らないので
     「効果は出るのに絵が出ない」が原理的に起きない。
   ══════════════════════════════════════════════════════════════ */
/* ── グレン「クロスフレイムノヴァ」 ──
   十字の極太レーザーが走り、そのあと中心で大爆発が起きる2段の技。 */
const GUREN_CROSS_PER = 2.30;      // 十字レーザー1本ぶんの倍率（縦・横で別に当たる）
const GUREN_NOVA_PER = 1.70;       // 遅れて起こる中心の大爆発
const GUREN_NOVA_R = 340;          // 大爆発がとどく半径
/* ── ユウナ「タイダルサージ」 ──
   大波が時間差で YUUNA_WAVES 回おしよせる。波は貫通し、波ごとに当たり直す。 */
const YUUNA_PER = 1.15;
const YUUNA_WAVES = 3;
const YUUNA_GAP = 16;              // 波と波のあいだ（フレーム）
/* ── モモ「ノワールスパイラル」 ──
   闇の貫通弾を、角度を少しずつずらしながら螺旋状に撃ち出す。1体につき1ヒット。 */
const MOMO_PER = 0.72;
const MOMO_N = 24;                 // 撃ち出す弾の数
const MOMO_TWIST = 0.42;           // 1発ごとに回す角度（螺旋の巻きの強さ）
/* ── チハヤ「ヴェルデサイクロン」 ──
   ウォールサーキットリングの上位。竜巻が壁沿いを旋回し、ふれた味方が止まるまで削り続ける。 */
const CHIHAYA_PER = 0.48;          // 1ヒットの倍率（ウォールサーキットは 0.36）
/* ★ 竜巻は<b>盤面ぜんぶをなでる</b>ので当たる回数がとても多い。
   実測（味方が200フレーム動きつづけた場合）で 0.62 だと約5万ダメージ出てしまい、
   ほかの超強リンク（超強ハイクロス＝3.60×3本）とくらべて明らかに行きすぎだった。
   1ヒットを軽くし、当たり直しの間かくも少し延ばして釣り合わせてある。 */
const CHIHAYA_N = 5;               // 竜巻の数（7基 → 5基だが1基あたりが大きく強い）
const CHIHAYA_R = 48;              // 竜巻の当たり判定の半径（34 → 48）
const CHIHAYA_SPD = 16;            // 壁沿いを進む速さ（13 → 16）
const CHIHAYA_COOL = 10;           // 同じ敵に当たり直すまでのフレーム（もとの技と同じ）
/* ── ユイ「セイクリッドヘイロー」 ──
   光の輪が<b>2重</b>に広がりながら多段ヒットし、広がりきった瞬間に
   画面上のすべての敵へ光の柱が落ちる。 */
const YUI_RING_PER = 0.58;         // 輪1ヒットの倍率
const YUI_RING_N = 14;             // 輪の上に並ぶ当たり判定の数（内・外で共通）
const YUI_RING_COOL = 12;          // 同じ敵に当たり直すまでのフレーム
const YUI_PILLAR_PER = 1.55;       // 広がりきったときに全敵へ落ちる光の柱

const STARVEIL_N = 5;              // レイの本数（五芒星）
const STARVEIL_SPINS = 2;          // 回転数（1回転ごとに当たり直す）
const STARVEIL_MUL = 1.35;         // 1ヒットの倍率
const STARVEIL_LEN = 520;          // レイの長さ（固定。アブソリュートレイはランダム）
const STARVEIL_W = 26;             // レイの太さ（ABSRAY_W より太い）
const STARVEIL_TURN = 52;          // 何フレームで STARVEIL_SPINS 回転するか
/* ════════════════════════════════════════════════════════════
   ★★ 2026-08-25 Starlight Academy Fest 2 の定数（限定SSR 5体）
   ------------------------------------------------------------
   スズネ（火）／ミナモ（水）／カレン（闇）／トモエ（木）／ヒマリ（光）。

   ★ リンクスキルは5体とも<b>新設</b>で、どれも<b>これまでに無い挙動</b>にしてある（ご指定）。
       スズネ    … 敵から敵へ<b>飛び火して連鎖</b>し、連鎖するほど威力が上がる
       ミナモ    … 輪刃が<b>行って帰ってくる</b>（往路と復路で別に当たる）
       カレン    … <b>敵を引き寄せながら</b>削り、最後に崩壊して大爆発（敵を動かす初のリンク）
       トモエ    … 盤面に<b>種を撒き</b>、置いた順に<b>時間差で芽吹いて</b>範囲爆発
       ヒマリ  … <b>敵どうしを光の線で結んだ星座</b>が何度も明滅して削る

   ★ 新しい fsKind を足したら、必ず次の<b>4か所すべて</b>に足すこと。
       ① fireFriendMain の case（index.html）… 実際の効果
       ② FS_HIT（index.html）                … ！ボタンの威力の見積り
       ③ FS_TYPE / FS_TAGS / FS_SHORT（index.html）… 絞り込み
       ④ drawFsGlyph の case（このファイル） … アイコン
   ★ 描画（drawEffect）は<b>できるかぎり既存の type を使いまわす</b>。
     連鎖の線と星座の線は boltlink、輪刃は wallring、種は aimbit、
     重力井は gravity + whirlpool。新しく作ったのは<b>オーロラの帯（aurora）だけ</b>。
   ════════════════════════════════════════════════════════════ */
/* ── 共通サブリンク「オーロラ・カーテン」（Starlight Academy Fest 2 の目印）──
   本人を中心に<b>極光の帯が上と下へ AURORA_N 枚ずつ</b>広がっていき、
   画面のはしで<b>折り返してもう一度</b>戻ってくる。帯は貫通し、<b>1枚ごとに当たり直す</b>。
   ★ スターライト・ヴェールが「近くで撃つほど強い」のに対して、
     こちらは<b>盤面のどこにいても必ず入る</b>かわりに1ヒットが軽め。 */
const AURORA_N = 4;                // 片側の枚数（上へ AURORA_N 枚・下へ AURORA_N 枚）
const AURORA_MUL = 1.10;           // 1ヒットの倍率
const AURORA_SPD = 21;             // 帯が進む速さ（px/フレーム）
const AURORA_H = 52;               // 帯の厚み（当たり判定）
const AURORA_GAP = 6;              // 枚と枚の間かく（フレーム）
/* ── スズネ「フレイムチェイン」──
   もっとも近い敵に着火し、そこから<b>次に近い敵へ飛び火</b>していく。
   ★ 連鎖が1回進むごとに威力が SUZUNE_STEP ずつ上がる。
   ★ 敵を一周したら<b>同じ敵へ戻ってもよい</b>（ボス＋護衛だけの盤面でも連鎖が止まらない）。 */
const SUZUNE_PER = 1.35;           // 1つめの着火の倍率
const SUZUNE_STEP = 0.26;          // 連鎖が1回進むごとの上乗せ
const SUZUNE_N = 8;                // 最大の連鎖数
const SUZUNE_GAP = 7;              // 次へ飛び火するまでのフレーム
/* ── ミナモ「アクアブーメラン」──
   水の輪刃がもっとも近い敵の方向へ飛び、壁まで行って<b>本人のところへ戻る</b>。
   往路と復路は<b>別の当たり判定</b>なので、途中の敵には2回入る。 */
const MINAMO_PER = 3.40;           // 1ヒットの倍率（往路・復路でそれぞれ1回）
const MINAMO_R = 62;               // 輪刃の当たり半径
const MINAMO_SPD = 27;             // 飛ぶ速さ（px/フレーム）
/* ── カレン「ノワールシンギュラリティ」──
   敵の集まっているところへ暗黒の重力球を置き、<b>まわりの敵を引き寄せながら</b>
   KAREN_PULSES 回削り、最後に崩壊して大爆発する。
   ★★ <b>ボスは引き寄せない</b>。蓬莱のボスは「壁とのすきま」を計算して置いてあるので
     （HOURAI_BOSS_SPOT）、動かすと盤面の設計そのものが崩れる。 */
const KAREN_R = 330;               // 引き寄せ・ダメージがとどく半径
const KAREN_PULL = 7.0;            // 1フレームに引き寄せる距離（px／ボスは0）
const KAREN_PULSES = 6;            // 継続ダメージの回数
const KAREN_TICK_PER = 0.55;       // 1回ぶんの倍率
const KAREN_BOOM_PER = 3.20;       // 最後の崩壊（大爆発）
const KAREN_TICK_GAP = 13;         // 削りと削りの間かく（フレーム）
/* ── トモエ「ヴェルデシード」──
   盤面に翠の種を TOMOE_N 個撒き、<b>置いた順に時間差で芽吹いて</b>範囲爆発する。
   ★ 種は<b>敵のいるところから優先して</b>落ちるので、取りこぼしが少ない。 */
const TOMOE_N = 7;                 // 撒く種の数
const TOMOE_PER = 1.75;            // 1つの芽吹きの倍率
const TOMOE_R = 165;               // 芽吹きの半径
const TOMOE_GAP = 9;               // 種と種の芽吹く間かく（フレーム）
/* ── ヒマリ「ステラコンステレーション」──
   画面上の敵を「星」とみなして<b>星と星を光の線で結び</b>、その星座が
   HIMARI_PULSES 回明滅する。明滅のたび、<b>線にふれている敵</b>にダメージが入る。
   ★ 敵が多いほど線が増える（＝1体がふれる線の本数が増える）ので、<b>集団に強い</b>。
   ★ 敵が1体だけのときは<b>本人と敵を結ぶ線</b>が引かれるので、ボス単体でも必ず入る。
   ★ 1回の明滅で同じ敵に入るのは<b>最大 HIMARI_CAP 本まで</b>（限度なく伸びないように）。 */
const HIMARI_PER = 0.95;           // 線1本ぶんの倍率
const HIMARI_PULSES = 5;           // 星座が明滅する回数
const HIMARI_CAP = 2;              // 1回の明滅で同じ敵に入る上限本数
const HIMARI_W = 30;               // 線の当たり判定の太さ
const HIMARI_GAP = 12;             // 明滅と明滅の間かく（フレーム）
const HIMARI_MAX_LINES = 14;       // 引く線の上限（敵が多すぎると重くなるので）
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-26 GRAND DEBUT GACHA Ver.3.0 の5体（カリン／ミレイ／ユウカ／ミヤビ／スミレ）
   ══════════════════════════════════════════════════════════════ */
/* ── 共通サブリンク「アフターグロウ・トレイル」──
   ふれた瞬間から、その味方が<b>通った道すじ</b>が光の帯として盤面に残る。
   帯は TRAIL_LIFE フレームかけて消えていき、そのあいだ<b>ふれた敵にくり返しダメージ</b>。
   ★★ MagiBurst で<b>「動いた跡そのものが武器になる」サブリンクはこれがはじめて</b>。
     よく動く味方（スピードが高い・壁で何度も跳ねる）ほど帯が長くなり、そのぶん強い。 */
const TRAIL_PER = 1.50;            // 帯に1回ふれるごとの倍率
const TRAIL_CD = 13;               // 同じ敵に次に入るまでの間かく（フレーム）
const TRAIL_LIFE = 170;            // 1点ぶんの帯が消えるまで（フレーム）
const TRAIL_W = 26;                // 帯の太さ（当たり判定の半径）
const TRAIL_MAXPT = 110;           // 記録する道すじの点の数（多すぎると重くなる）
const TRAIL_HITS = 13;             // 表示用: 1体に入りうるおおよその回数
/* ── カリン「ローズケージ」──
   大きな茨の輪が生まれ、<b>だんだん小さくなりながら中心へ閉じていく</b>。
   輪にふれた敵はそのたびに削られ、閉じきった瞬間に中心で大爆発する。
   ★ 既存の輪（セイクリッドヘイロー）は<b>広がる</b>。こちらは<b>縮む</b>ので、
     外にいた敵ほど早く当たり、逃げ場が中心へ追いこまれていく。 */
const KARIN_R0 = 360;              // 輪の初期半径
const KARIN_R1 = 70;               // 閉じきったときの半径
const KARIN_TICKS = 8;             // 削りの回数（＝輪が縮む段数）
const KARIN_PER = 1.20;            // 1回ぶんの倍率
const KARIN_GAP = 11;              // 段と段の間かく（フレーム）
const KARIN_W = 34;                // 輪の太さ（当たり判定）
const KARIN_BOOM_PER = 6.20;       // 閉じきったときの大爆発
const KARIN_BOOM_R = 200;          // 同・半径
/* ── ミレイ「ミラーブルーム」──
   本人の位置と、<b>盤面の中心をはさんだ点対称の位置</b>の2か所から、
   青い波紋が同時に MIREI_WAVES 回広がる。両方の波にふれた敵には2回入る。
   ★★ <b>「本人がいない場所からも撃つ」リンクはこれがはじめて</b>。
     自分の立ち位置を決めると、盤面の反対側の当たりかたも同時に決まる。 */
const MIREI_PER = 1.80;            // 波1回ぶんの倍率（1つの波紋につき1体1回）
const MIREI_WAVES = 3;             // 波の回数
const MIREI_RMAX = 430;            // 波が広がりきる半径
const MIREI_GROW = 9.5;            // 1フレームに広がる量
const MIREI_GAP = 16;              // 波と波の間かく（フレーム）
const MIREI_W = 30;                // 波の輪の太さ（当たり判定）
/* ── ユウカ「クロスグレイヴ」──
   黒い十字の刃が<b>敵を貫通しながら</b>まっすぐ走り、ふれた敵に<b>十字の刻印</b>を刻む。
   刃が止まった瞬間、<b>刻印がいっせいに起爆</b>する。
   ★★ <b>刻印の数が多いほど「1つあたり」が重くなる</b>のがこの技の顔。
     まとめて刻めるほど得なので、敵の並びを1本の線に通す撃ちかたがそのまま火力になる。 */
const YUUKA_MARK_PER = 2.60;       // 刻んだ瞬間のダメージ
const YUUKA_BOOM_PER = 6.00;       // 起爆1つぶんの基本倍率
const YUUKA_STEP = 0.50;           // 刻印が1つ増えるごとの上乗せ（全部の刻印に乗る）
const YUUKA_CAP = 6;               // 上乗せを数える刻印の上限
const YUUKA_SPD = 24;              // 刃の進む速さ（px/フレーム）
const YUUKA_W = 40;                // 刃の当たり半径
const YUUKA_BOUNCE = 3;            // 壁で折り返せる回数（1本の線だけでは当たる敵が少なすぎたため）
/* ── ミヤビ「ピーコックファン」──
   扇のかたちに羽根の刃が広がる。羽根は<b>壁に当たるたびに2枚へ分かれて増える</b>
   （3枚 → 6枚 → 12枚）。分かれるたびに1枚あたりは少し軽くなるが、総量は増える。
   ★★ <b>壁で「分裂して増える」リンクはこれがはじめて</b>。壁の多い盤面ほど伸びる。 */
const MIYABI_PER = 1.00;           // 羽根1枚1ヒットの倍率
const MIYABI_N0 = 3;               // 最初の羽根の枚数
const MIYABI_SPLITS = 2;           // 分裂できる回数（3→6→12）
const MIYABI_DECAY = 0.78;         // 分裂1回ごとの1枚あたりの倍率
const MIYABI_SPD = 16;             // 羽根の進む速さ
const MIYABI_R = 34;               // 羽根の当たり半径
const MIYABI_SPREAD = 0.62;        // 扇のひろがり（ラジアン）
/* ── スミレ「ソレイユサンクタム」──
   本人のいる場所に<b>陽だまりの聖域</b>がひらき、中にいる敵へ光の矢が連続で降る。
   ★★ <b>1本ごとの威力が「その敵がすでに失っているHPの割合」で伸びる</b>のが顔。
     削れば削るほど重くなるので、<b>あとの1本ほど強い</b>——長期戦のボスに刺さる。 */
const SUMIRE_PER = 1.00;           // 光の矢1本の基本倍率
const SUMIRE_TICKS = 10;           // 降る回数
const SUMIRE_GAP = 10;             // 回と回の間かく（フレーム）
const SUMIRE_R = 300;              // 聖域の半径
const SUMIRE_LOSTMUL = 1.00;       // 失ったHP割合1.0ぶんの上乗せ（＝最大2倍）
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-26 MagiLex の交換キャラ5体（ミズキ／カナデ／ホムラ／ヨイヅキ／スミカ）
   ══════════════════════════════════════════════════════════════ */
/* ── 共通サブリンク「ノウレッジ・レゾナンス」──
   ふれた味方を中心に、知識の環が<b>3重・時間差</b>でひらく。
   ★ 内側より<b>外側のほうが強い</b>（KNOW_STEP ずつ重くなる）ので、
     広がりきったところに敵が居るほど伸びる。
   ★ ひらききると、その味方の<b>フルバーストが1ターン近づく</b>。 */
const KNOW_PER = 3.20;             // 1重目の倍率
const KNOW_STEP = 0.95;            // 1重進むごとの上乗せ
const KNOW_RINGS = 3;              // 重ねる数
const KNOW_R0 = 150;               // 1重目が広がりきる半径
const KNOW_RSTEP = 120;            // 1重進むごとに広がる半径
const KNOW_GROW = 11;              // 1フレームに広がる量
const KNOW_GAP = 14;               // 重と重の間かく（フレーム）
const KNOW_W = 30;                 // 環の太さ（当たり判定）
const KNOW_FBCUT = 1;              // ひらききったときに縮むフルバーストターン
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-26b GRAND DEBUT GACHA Ver.4.0（セイナ／シヅキ／サユキ／サラ／サクヤ）
   ------------------------------------------------------------
   ★★ この版から<b>新しいリンクスキルに「超強」を付けない</b>（ご指定）。
     「超強◯◯」は<b>無印の◯◯があってはじめて成り立つ</b>名前なので、
     もとになる技が無いものは素の名前にする。強さは変えていない。
   ══════════════════════════════════════════════════════════════ */
/* ── 共通サブリンク「ブルーミング・エコー」──
   ふれた味方が<b>跳ね返るたび</b>、その場所に花が咲いて範囲ダメージ。
   ★★ MagiBurst で<b>「跳ね返った回数で発動回数が決まる」サブリンクはこれがはじめて</b>。
     ・咲くたびに<b>1つあたりが強くなる</b>ので、長く走る味方ほど伸びる
     ・壁でも敵でも「向きが変わったら」1回と数える
       ＝ 反射の味方のほうが咲きやすい（貫通は壁だけ）
   ★ 数えすぎると際限なく伸びるので BLOOM_N 回で打ち止め。 */
const BLOOM_PER = 5.00;            // 1つめの花の倍率
const BLOOM_STEP = 1.35;           // 1回跳ねるごとの上乗せ
const BLOOM_N = 6;                 // 咲く回数の上限
const BLOOM_R = 300;               // 花の当たり半径（跳ねた場所は壁ぎわが多いので広くとる）
const BLOOM_MINGAP = 6;            // 続けて数えない間かく（フレーム）
/* ── セイナ「クリムゾンワルツ」──
   紅い旋風が本人を中心に何度も広がる。
   ★★ <b>次のターンが始まったとき、もう一度おなじ場所で旋風が起こる</b>——
     ターンをまたいで効くリンクスキルはこれがはじめて。
     ＝ 撃ったあとに敵が寄ってきても、2回目でちゃんと当たる。 */
const CRIMSON_PER = 1.75;          // 旋風1段の倍率
const CRIMSON_TICKS = 5;           // 1回ぶんの段数
const CRIMSON_R = 320;             // 旋風の半径
const CRIMSON_GAP = 10;            // 段と段の間かく（フレーム）
/* ── シヅキ「ブルーローズ・レイン」──
   蒼い雨が降る。降る本数は決まっているが、
   ★★ <b>HPの高い敵ほど多くの雨粒が落ちる</b>（本数の配分が敵のHPで変わる）。
     ＝ ボス1体なら全部ボスへ。ねらいを自動で「重い敵」に寄せる、はじめての形。 */
const BLUERAIN_N = 18;             // 降る雨粒の総数
const BLUERAIN_PER = 2.35;         // 1粒の倍率
const BLUERAIN_GAP = 6;            // 粒と粒の間かく（フレーム）
/* ── サユキ「ヴォイド・コンボ」──
   闇の刃を放つ。★★ <b>このバトル中にこの技が出るたび「段」が1つ上がり、刃が1本増える</b>。
     WAVEをまたいでも段は保たれる＝<b>バトルを通して育つリンク</b>ははじめて。
   ★ 段はバトルごとにリセットする（B.voidStep）。オンラインでも
     両方の端末で同じ回数だけ発動するので、ずれない。 */
const VOID_N0 = 4;                 // はじめの刃の本数
const VOID_MAX_STEP = 4;           // 段の上限（＝最大 VOID_N0 + VOID_MAX_STEP 本）
const VOID_PER = 3.10;             // 刃1本1ヒットの倍率
const VOID_SPD = 22;               // 刃の速さ
const VOID_R = 30;                 // 刃の当たり半径
const VOID_BOUNCE = 2;             // 壁で折り返せる回数
/* ── サラ「クローバー・フォーチュン」──
   四つ葉のかたちに翠の葉が伸びる。
   ★★ <b>1周で敵に当たった数だけ、次の周の葉が増える</b>（当たらなければそこで終わり）。
     ＝ 当たるほど続くリンクははじめて。運まかせではなく<b>ねらいの上手さ</b>が伸びる。 */
const CLOVER_N0 = 4;               // 1周目の葉の数
const CLOVER_MAX = 12;             // 葉の数の上限
const CLOVER_ROUNDS = 4;           // 周の上限
const CLOVER_PER = 2.20;           // 葉1枚1ヒットの倍率
const CLOVER_LEN = 360;            // 葉の伸びる長さ
const CLOVER_SPD = 20;             // 葉の伸びる速さ
const CLOVER_R = 30;               // 葉の当たり半径
/* ── サクヤ「ペタル・エコー」──
   桜の花びらが舞う。
   ★★ <b>そのあとしばらくのあいだに敵が受けたダメージの一部を、もう一度まとめて与える</b>。
     ＝ 「与えたダメージそのものを写して返す」リンクははじめて。
     よく当たったショットほど跳ね上がる。
   ★ エコーぶんは<b>raw</b>（キラー倍率を乗せない）で入れる。
     乗せると自分の火力で自分を増幅してしまい、際限なく伸びる。 */
const PETAL_PER = 2.00;            // 舞う花びら1回ぶんの倍率
const PETAL_TICKS = 4;             // 花びらが舞う回数
const PETAL_R = 300;               // 花びらのとどく半径
const PETAL_GAP = 12;              // 回と回の間かく（フレーム）
const PETAL_WATCH = 150;           // 「そのあとしばらく」の長さ（フレーム）
const PETAL_RATE = 0.30;           // 写して返す割合
const FSBOOSTL_MUL = 2.5;      // リンクブーストL: リンクスキルの威力
const DASHL_MUL = 2.5;         // ダッシュL: スピード倍率
const COMBOKILLER_MAX = 2.0;   // 連撃キラーM: 同じ敵に連続で触れたときの上限倍率
const COMBOKILLER_STEP = 0.25; // 連撃キラーM: 1回ごとの上昇量
const INFBREAK_MAX = 2.0;      // インフィニティブレイクM: 上限倍率（毎ターンリセット）
const INFBREAK_STEP = 0.2;     // インフィニティブレイクM: 1ヒットごとの上昇量
const FEWFOE_N = 2;            // 敵少底力M: この数以下でブースト
const FEWFOE_MUL = 2.0;        // 敵少底力M: 倍率
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-15 「底力」がいま乗っているかを1か所で判定する
   ------------------------------------------------------------
   底力の仲間は5系統ある（底力／状態異常底力／敵少底力／敵多底力）。
   どれも<b>条件を満たしているあいだだけ</b>倍率が乗る一時的なものなのに、
   これまでは画面のどこにも出ていなかった。
   ・HPが半分を切ったのか
   ・敵が2体以下になったのか
   を頭の中で数えながら、「いま殴れば強い」を判断するしかなかった。

   → いま乗っているものを1つ返して、<b>ボールの見た目</b>（燃えるような輪）と
     ボールの上のチップの両方に出す。

   ★ ここの条件は killerMul の中の式と<b>必ず同じ</b>にすること。
     見た目だけ光っていて実際は乗っていない（またはその逆）が、いちばん困る食い違いになる。
   ★ 等級は重ねがけしないので、上から順に1つだけ返す（killerMul の else if と同じ順番）。
   ══════════════════════════════════════════════════════════════ */
function sokojikaraState(ball) {
  if (!ball || !ball.ch || typeof B === "undefined" || !B) return null;
  const c = ball.ch;
  /* ① 底力（チームHPが半分以下） */
  if (B.hp <= B.maxhp * SOKO_HP_RATE) {
    if (hasAbil(c, "sokojikaraEL")) return { nm: "底力EL", mul: SOKOJIKARA_EL_MUL, c: "#ff3a6b" };
    if (hasAbil(c, "sokojikaraL"))  return { nm: "底力L",  mul: SOKOJIKARA_L_MUL,  c: "#ff4a58" };
    if (hasAbil(c, "sokojikaraM"))  return { nm: "底力M",  mul: SOKOJIKARA_M_MUL,  c: "#ff5d47" };
    if (hasAbil(c, "sokojikara"))   return { nm: "底力",   mul: 1.5,               c: "#ff8a4d" };
  }
  /* ② 状態異常底力M（毒などを受けているあいだ。判定は ballAiling に一本化） */
  if (hasAbil(c, "ailsokojikaraM") && ballAiling(ball)) {
    return { nm: "状態異常底力M", mul: AILSOKOJIKARA_M_MUL, c: "#c86bff" };
  }
  /* ③④ 敵の数で決まるもの（少ないとき／多いとき） */
  const n = aliveEnemies().length;
  if (n <= FEWFOE_N) {
    if (hasAbil(c, "fewfoeEL")) return { nm: "敵少底力EL", mul: FEWFOE_EL_MUL, c: "#ffd257" };
    if (hasAbil(c, "fewfoeM")) return { nm: "敵少底力M", mul: FEWFOE_MUL, c: "#ffd257" };
  } else {
    if (hasAbil(c, "manyfoeEL")) return { nm: "敵多底力EL", mul: MANYFOE_EL_MUL, c: "#7ce8ff" };
    if (hasAbil(c, "manyfoeM"))  return { nm: "敵多底力M",  mul: MANYFOE_M_MUL,  c: "#7cc4ff" };
  }
  return null;
}
const JUDGMENT_TURNS = 5;      // ジャッジメント: 防御ダウンの持続ターン
const BARRIER_BASE = 1600;     // バリア: 肩代わりする量
const BARRIER_M = 3200;        // バリアM: 等級Mは2倍
const FBACCEL_HP = 0.70;       // FBターンアクセル: 残りHPがこの割合を下回ると発動
const FBACCEL_TURNS = 2;       // FBターンアクセル: 毎ターン追加で短縮するターン数
const MOBKILLER_MUL = 1.5;     // ザコキラー: ボス以外の敵へのダメージ倍率
const FSDOUBLE_MAX = 2;        // リンク×2: 1ショット中に自分のリンクを発動できる回数
const COUNTER_KILLER_MUL = 1.5; // カウンターキラー: 最後に攻撃してきた敵へのダメージ倍率
const ELSIA_HP_COST = 0.40;    // エルシアFB: 消費する残りチームHPの割合
const ELSIA_DMG_RATE = 6.0;    // エルシアFB: 消費HP × この値 が最初にふれた敵へのダメージ
const UPKILLER_MUL = 2.0;     // アップポジションキラーM: 画面上半分の敵へのダメージ倍率
const DRAINM_RATE = 0.10;     // ドレインM: 敵ヒット1回につきチームHPの回復量
const SOULM_RATE = 0.15;      // ソウルスティールM: 敵撃破ごとの回復
const OVERHEAT_COST = 0.03;   // オーバーヒート: 毎ターンのHP消費
const OVERHEAT_MUL = 1.75;    // オーバーヒート: 自強化倍率
const INNER_WEAK_MUL = 1.6;   // 内部弱点: 貫通の直殴り／リンクスキルで殴ったときの倍率
const PROTECT_THRESH = 900;   // プロテクション: 1ヒットの被ダメがこれ以下ならダメージ1に
const REGENM_RATE = 0.10;     // リジェネM: 自ターン終了時の回復量
/* ══ v14.5 クロエ用 ══ */
const FATALKILLERM_MUL = 2.0;  // フェイタルキラーM: 残りHP50%以下の敵への倍率（等級M）
const CHLOE_ORCAS = 7;         // ホロックスストリーム: 周回するシャチの数
const CHLOE_ORCA_PER = 0.30;   // ホロックスストリーム: シャチ1体が1ヒットしたときの威力（攻撃力×）
const CHLOE_SEA_MUL = 2.6;     // クロエFB: シャチに乗って再攻撃するときの体当たり倍率
const CHLOE_SEA_HITS = 0.9;    // クロエFB: 海のシャチ召喚1体ぶんの威力（攻撃力×）
/* ══ 直殴り（体当たり）の基本倍率 ══
   v10 で 0.55 → 0.92、★ v12.4 で 0.92 → 1.50 に引き上げ。
   リンクスキルが強すぎて「味方に触れて回るだけ」のゲームになっていたため、
   体当たり本体の火力を全体に約1.6倍して主役に戻す。弱点直撃・弱点通過・キラー系は
   すべてこの倍率のうえに乗るので、殴りを当てる立ち回りがそのまま火力になる。
   ★ 2026-08-08: 1.50 → 1.85。超強◯◯系のリンクスキルが増えて、また
     「味方をなぞるだけ」が最適解に戻りつつあったので、殴りの取り分をもう一段上げる。
   ★ お知らせ（NEWS）の本文から読むので、必ず NEWS より前で宣言すること。 */
const MELEE_MUL = 1.85;
/* ★ 2026-08-08 全キャラ共通のスピード補正。
   ボールの初速（launchShot・再走・号令）にまとめて掛かる。
   1ショットで走れる距離が伸びるぶん、味方をなぞる手数も殴れる回数も増える。
   ※ 上限（Math.min の値）にも同じ倍率を掛けること。掛け忘れると
     スピードの高いキャラだけが上限に張りついて、まったく速くならない。
   ★ こちらも NEWS より前で宣言すること。 */
const SPD_GLOBAL = 1.22;
/* ══ ★ 2026-08-17 スピードを「本物の km/h」にする ══
   ------------------------------------------------------------
   2026-08-16c の版は SPD_KMH_PER_UNIT = 1 で、素の数値のうしろに
   " km/h" と書き足していただけだった（440 → 「440 km/h」）。
   単位の名前が付いただけで、中身は km/h ではなかった。
   ここで実際のボールの速さから逆算する。

     ものさし  … ボールの直径 90px（BALL_R=45）を、キャラの背たけぶん 1.8m と見る
                  → 1m = 50px
     初速      … いっぱいまで引いたときの launchShot の値
                  (SHOT_BASE + spd × SHOT_PER_SPD) × SPD_GLOBAL  [px/フレーム]
     時間      … 1秒 = 60フレーム

     px/フレーム ×60 → px/秒 ÷50 → m/秒 ×3.6 → km/時

   ★ 下じき（SHOT_BASE=30）は誰でも出る速さなので、
     spd が 286〜440 でも km/h は 190〜250 くらいの幅にしかならない。
     これは「そういう乗り物」なので正しい。ゲージは今までどおり
     素の spd を見ているので、キャラどうしの比べやすさは落ちない。
   ★ SHOT_BASE / SHOT_PER_SPD は index.html の launchShot と
     必ず同じ値を使うこと（あちらもこの定数を参照している）。 */
const SHOT_BASE = 30;            // 初速の下じき（スピード0でも出る速さ）
const SHOT_PER_SPD = 0.042;      // スピード1あたりの上乗せ
/* ★ 2026-08-17b ものさしを見直した。90px を 1.8m と見ると全キャラが 235〜262km/h に
   収まってしまい、「引っぱりハンティング」の弾としては遅く見えた。
   盤面（720×920px）を <b>19.5m × 24.9m の闘技場</b>、ボールを直径 2.4m の魔弾と見る
   ことにして 1m = 37px にそろえた。これで全キャラが <b>300km/h 以上</b>になる
   （spd349 で約318km/h・spd469 で約354km/h）。換算のしかた自体は変えていない。 */
const PX_PER_METER = 37;         // ボールの直径 90px ≒ 2.4m
const GAME_FPS = 60;
const PX_FRAME_TO_KMH = GAME_FPS / PX_PER_METER * 3.6;   // px/フレーム → km/h
function spdKmhNum(v) { return (SHOT_BASE + (v || 0) * SHOT_PER_SPD) * SPD_GLOBAL * PX_FRAME_TO_KMH; }
function spdKmh(v) { return fmt(Math.round(spdKmhNum(v))) + " km/h"; }
/* アーク強化などの「＋◯◯」ぶん。下じきは打ち消し合うので上乗せぶんだけを換算する */
function spdKmhDelta(d) { return Math.round((d || 0) * SHOT_PER_SPD * SPD_GLOBAL * PX_FRAME_TO_KMH); }
/* ══ ★ 2026-08-08 超強オービタルエッジ（ユキノ）══
   オービタルエッジ（巨大リング7基・r=64・×0.30・速度上限15）の上位版。
   ★ キャラ定義（CHARS）の fsPow から読むので、必ず CHARS より前で宣言すること。 */
const SSPIN_N = 11;            // リングの数（7基 → 11基）
const SSPIN_R = 86;            // リングの半径＝当たり判定（64 → 86）
const SSPIN_MUL = 0.52;        // リング1ヒットの威力（攻撃力×。0.30 → 0.52）
const SSPIN_CAP = 19;          // リングの速度上限（15 → 19）
/* ══ ★ 2026-08-08 超強クイックチャージショット（チトセ）══
   クイックチャージショット（味方が止まった瞬間に最寄りの敵へ ×2.4 の一撃）の上位版。
   ・狙う敵が SCHG_N 体に増える（近い順）
   ・1発の威力が上がり、着弾でさらに周囲へ衝撃波（SCHG_BOOM_MUL）が走る */
const SCHG_N = 3;              // ロックオンする敵の数（1体 → 3体）
const SCHG_MUL = 4.2;          // チャージ弾1発の威力（攻撃力×。2.4 → 4.2）
const SCHG_BOOM_MUL = 1.1;     // 着弾地点の衝撃波（まわりの敵にも入る）
const SCHG_BOOM_R = 210;       // 衝撃波の半径
/* ══ ★ 2026-08-08 ナナミのフルバースト「紅蓮疾走・ブレイズランナー」══
   壁にふれるたびに<b>確率で</b>1段ずつ強くなる。上がるのは攻撃とスピードの両方。
   ★ CHARS の ssPow / ssDesc から読むので、必ず CHARS より前で宣言すること。 */
const NANAMI_WALL_P = 0.20;    // 壁1回ごとの発動確率
const NANAMI_WALL_ATK = 1.22;  // 1段ごとの攻撃倍率（積算）
const NANAMI_WALL_SPD = 1.10;  // 1段ごとのスピード倍率（積算）
const NANAMI_WALL_MAX = 8;     // 積み上げの上限（攻撃 最大 ×1.22^8 ≒ ×4.9）
/* ══ ★ 2026-08-08 貫通拡散弾3（チトセのサブリンク）══
   16方向へ特大の貫通弾を、時間差で3回まとめて撃ち出す。 */
const PSPREAD3_DIRS = 16;      // 1回あたりの方向数
const PSPREAD3_VOLLEY = 3;     // 撃つ回数（時間差）
const PSPREAD3_PER = 0.30;     // 1発の威力（攻撃力×）
const PSPREAD3_SPD = 17;       // 弾速
const PSPREAD3_R = 20;         // 弾の当たり判定（特大）
/* ══ v15 Luminous Summer Fest 用（等級EL＝いまある最上位の一段上） ══ */
/* ══ 2026-08-05 ネムのサブリンク「リンスピアップ」 ══ */
const LINKUP_MUL = 1.5;          // リンスピアップ: ふれた味方のリンクスキル威力の倍率
/* ══ 乱FB短縮弾（fbburst4）══
   ★ 2026-08-06: 壁で跳ねまわる4発だと、ふれた味方のFBがまとめて縮んで
     「撃つ前からフルバーストがたまっている」状態になりやすかったので3発に減らしていた。
   ★ 2026-08-07 作り直し: 弾の性質そのものを変えた。
       旧: 3発が<b>壁で跳ね返りながら</b>飛び回り、ふれた味方1体で消える
       新: <b>四方へ8発</b>を<b>まっすぐ</b>撃ち出す。<b>壁で反射せず</b>、
           <b>敵も味方も貫通</b>して、そのまま<b>画面外へ抜けていく</b>。
           通り道にいた味方は<b>全員</b>フルバーストのターンが1縮む。
     跳ね回らなくなったぶん「どの向きに撃つか＝どこに味方を並べておくか」で
     効きが決まる、position を読む技になった。
   ★ 表示（SUBFS の pow / desc）とここの実装の両方がこの定数を見ること。 */
const FBBURST_N = 8;        // 撃ち出す弾の数（四方＝8方向）
const FBBURST_SPD = 15;     // 弾速（まっすぐ飛んで画面外へ抜ける）
/* ★ 2026-08-06 リンクスキル「爆発」（blast／プラズマノヴァ／防御ダウンブラストの土台）
   ・範囲を少し小さく（250 → 200）。画面の半分以上を1発で覆っていて、
     どこで爆発したのか・誰を巻き込んだのかが分からなかった。
   ・そのぶん威力を上げる（×0.70 → ×0.95）。当てる位置を選ぶ意味が出る。
   ・演出は層を増やして「中心 → 衝撃波 → 破片」の順にはっきり見えるようにする。
   ★ 表示（SUBFS の pow／SUB_HIT／FS_HIT）と実装の両方がこの定数を見ること。 */
const BLAST_MUL = 0.95;   // 爆発の威力（攻撃力に対する倍率）
const BLAST_R = 200;      // 爆発が届く距離（px）
/* ★ 2026-08-06 超強三方向追従型貫通弾（リアナ）＝ 三方向追従型貫通弾（×0.28・12F間隔）の強化版 */
const SUPTRI_PER = 0.46;  // 1発あたりの威力（攻撃力×）
const SUPTRI_CD = 7;      // 連射の間隔（フレーム。小さいほど速い）
/* ★ 2026-08-10 超強「鋭角」三方向追従型貫通弾（カホ）。
   鋭角＝3発が同じ敵に入りやすいぶん、1発の威力は超強三方向より少しだけ控えめにする。 */
const SUPTRI_SHARP_PER = 0.42;
const LINKUP_MAX = 2.25;         // 同じショットで重ねがけしたときの上限（1.5 → 2.25 まで）
/* ══ ★ 2026-08-07 Phantom Legend Fest の開催日時 ══
   ★ NEWS / EVENTS の中から読むので、必ずそれらより前で定義すること（const の TDZ 対策）。
     FESTS 自体は EVENTS より後ろで定義されるため、イベントの本文から FESTS を
     直接読むことはできない。日付とバナーだけをここに切り出しておく。 */
const FES3_OPEN = "2026-08-10T11:45:14";   /* ★ 秒までぴったりの解禁時刻 */
const FES3_BANNER = "../img/bn_fes3_s.webp";
/* ★ 開催前に出すバナー（人物をシルエットに落とした差し替え版）。
   通常のバナーには顔が大きく写っているので、そのまま出すと予告の意味がなくなる。 */
const FES3_BANNER_SOON = "../img/bn_fes3_soon.webp";
/* ★ 2026-08-08 Event（お知らせのイベント一覧）に出す「COMING SOON」の絵。
   ガチャのバナー（FES3_BANNER_SOON＝シルエット版）とは別物で、こちらは
   「まだ始まっていない」ことだけを伝える1枚。開催後は通常バナー（FES3_BANNER）に戻る。 */
const FES3_EVENT_SOON = "../img/bn_comingsoon_s.webp";
/* "YYYY-MM-DD" / "YYYY-MM-DDThh:mm" / "YYYY-MM-DDThh:mm:ss" をローカル時刻のミリ秒に変換する。
   ★ toISOString は UTC なので日本では9時間ずれる。必ずこちらを使うこと。
   ★ 2026-08-07: 秒（:ss）まで書けるようにした。書かなければ 0 秒あつかい。 */
function localTimeOf(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return 0;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0), 0).getTime();
}
function beforeOpen(s) { const t = localTimeOf(s); return t > 0 && Date.now() < t; }
/* 「8月10日 11:45:14 から開催」。秒が 0 のときだけ秒を省く */
function openTimeText(s) {
  const t = localTimeOf(s); if (!t) return "";
  const d = new Date(t), p2 = (n) => String(n).padStart(2, "0");
  const hm = p2(d.getHours()) + ":" + p2(d.getMinutes()) + (d.getSeconds() ? ":" + p2(d.getSeconds()) : "");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm} から開催`;
}
/* 日付だけの短い表記（「8月10日 11:45:14」）。バナーの1行案内などで使う */
function openTimeShort(s) {
  const t = localTimeOf(s); if (!t) return "";
  const d = new Date(t), p2 = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p2(d.getHours())}:${p2(d.getMinutes())}${d.getSeconds() ? ":" + p2(d.getSeconds()) : ""}`;
}
/* ★ 2026-08-07 野獣インパクト（野獣先輩のサブリンク）: ふれた味方の攻撃力と弾速を上げる
   ★ 2026-08-08b: 効果を「加速＋攻撃力アップ＋<b>リンクスキル威力アップ</b>」の3本立てにした。
     リンク威力は linkspeedup（リンスピアップ）と同じ mover.linkUp に積む。 */
const BEASTIMPACT_MUL = 1.5;     // ふれた味方の攻撃力の倍率（そのショットのあいだ）
const BEASTIMPACT_MAX = 2.25;    // 同じショットで重ねがけしたときの上限
const BEASTIMPACT_LINK = 1.4;    // ふれた味方のリンクスキル威力の倍率
const BEASTIMPACT_LINKMAX = 2.0; // リンク威力の重ねがけ上限
const BEASTCHARGE_PER = 0.62;    // 野獣突撃（リンクスキル）: 突進弾1発が1ヒットしたときの威力（攻撃力×）
const BEASTCHARGE_N = 3;         // 野獣突撃: 同時に飛ばす突進弾の数
const FSBOOSTEL_MUL = 3.0;       // リンクブーストEL: リンクスキル・サブリンクの威力
const AURAEL_MUL = 2.5;          // パワーオーラEL: チームHP50%以上のときの攻撃・スピード倍率
const COMBOKILLEREL_MAX = 3.0;   // 連撃キラーEL: 同じ敵に連続で触れたときの上限倍率
const COMBOKILLEREL_STEP = 0.40; // 連撃キラーEL: 1回ごとの上昇量
/* ══ ★ 2026-08-11 Luminous Summer Fest 追加の限定SSR（シェリーα・ココナα）══
   どちらも「ノーマル版と同じ手ざわりのまま倍率だけ引き上げ、効果をひとつ足す」作り。
   ・シェリーα … 乱打の連数・1発の威力を強化し、さらに<b>自分の次のターンまで無敵</b>になる
   ・ココナα   … ハート爆撃の割合を上げ、さらに<b>ふれた味方の数だけチームHPを回復</b>する */
const CHERYLA_BARRAGE_N = 40;    // シェリーα: 乱打の連数（ノーマル版は30連）
const CHERYLA_BARRAGE_PER = 0.9; // シェリーα: 乱打1発ぶんの攻撃力倍率（ノーマル版は0.7）
const CHERYLA_INVULN = 1;        // シェリーα: 無敵が続く「自分の行動」回数
const KOKONAA_HEART = 0.40;      // ココナα: ハート爆撃で削る「敵の残りHP」の割合（ノーマル版は0.25）
const KOKONAA_HEAL = 0.12;       // ココナα: ふれた味方1体につき回復するチームHPの割合
function abilName(a) {
  if (a.t === "killer") return ELEM[a.el].nm + "属性キラー";
  if (a.t === "killerM") return ELEM[a.el].nm + "属性キラーM";
  if (a.t === "killerL") return ELEM[a.el].nm + "属性キラーL";   /* ★ 2026-08-11 等級L＝×2.5 */
  if (a.t === "killerEL") return ELEM[a.el].nm + "属性キラーEL";  /* ★ 2026-08-16b 等級EL＝×3.0 */
  if (a.t === "elemres") return ELEM[a.el].nm + "属性耐性";
  if (a.t === "elemresM") return ELEM[a.el].nm + "属性耐性M";   /* ★ 2026-08-07 等級M＝50%カット */
  return AB_NM[a.t] || a.t;
}
function abilDesc(a) {
  switch (a.t) {
    case "adw": return "ダメージウォールを無効化する";
    case "aw": return "ワープを無効化する";
    case "ms": return "地雷を回収し、敵ヒット時に1個消費して1.5倍攻撃";
    case "ssboost": return "味方に触れるとその味方のFBターンを1短縮";
    case "regen": return "自分のターン終了時、チームHPを5%回復";
    case "barrier": return "一定量（1,600）のダメージを代わりに受け止める";
    case "aura": return "チームHP50%以上のとき攻撃・スピード1.5倍";
    case "killer": return ELEM[a.el].nm + "属性の敵へのダメージが1.5倍";
    case "vital": return "残りHPが50%以上の敵へのダメージが1.5倍";
    case "omni": return "各WAVEの開始から、<b>自分が" + OMNI_TURNS + "回行動するまで</b>"
      + "<b>ダメージウォール・重力バリア・ワープ・地雷</b>を無効化（地雷は回収せず無効化のみ）"
      + "<br><small>※ ブロック・ロックゾーン・減速壁など、ほかのギミックには効きません</small>";
    case "allkiller": return "すべての属性の敵へのダメージが1.5倍";
    case "drain": return "敵にふれるたびにチームHPを" + Math.round(DRAIN_RATE * 100) + "%回復する";
    case "fsboost": return "自分のリンクスキル・サブリンクの威力が" + FSBOOST_MUL + "倍になる";
    /* ★ 2026-08-07: 耐性・プロテクションは「攻撃を受けたキャラ本人」だけに効く。
       実装（memberCut）はずっと本人ぶんだけだったのに、説明文が（チーム全体）のままで
       「1体入れればチーム全員が軽減される」と読めていたので、表記をそろえた。 */
    case "allres": return "<b>このキャラ自身が</b>すべての属性から受けるダメージを" + Math.round(ALLRES_CUT * 100) + "%カットする<br><small>※ 軽減されるのは<b>このキャラが受けた攻撃だけ</b>です（チーム全体の被ダメージは減りません）</small>";
    case "pray": return "ボスが出てくるマップの開始時、" + Math.round(PRAY_CHANCE * 100) + "%の確率でチームHPを全回復する";
    case "superaw": return "ワープを無効化し、さらに画面上のワープ1つにつき攻撃・スピードが" + Math.round(SUPERAW_PER * 100) + "%アップする";
    case "ablock": return "ブロックをすり抜ける（反射しない）";
    case "soul": return "敵を倒すたびにチームHPを" + Math.round(SOUL_RATE * 100) + "%回復する";
    case "weakkiller": return "弱点コアへ直撃したときのダメージがさらに1.5倍";
    case "poisonkiller": return "毒状態の敵へのダメージが1.5倍";
    case "firstkiller": return "そのショットで最初にふれた敵へのダメージが1.5倍";
    case "poisonkillerM": return "毒状態の敵へのダメージが<b>2倍</b>（等級M）";
    case "poisonkillerEL": return "毒状態の敵へのダメージが<b>" + POISONKILLER_EL_MUL + "倍</b>（等級EL）";
    case "manyfoeEL": return "画面上の敵が<b>" + FEWFOE_N + "体より多い</b>とき、与えるダメージが<b>" + MANYFOE_EL_MUL + "倍</b>になる（等級EL）";
    case "firstkillerM": return "そのショットで最初にふれた敵へのダメージが<b>2倍</b>（等級M）";
    case "firstkillerL": return "そのショットで最初にふれた敵へのダメージが<b>" + FIRSTKILLER_L_MUL + "倍</b>（等級L）";
    case "firstkillerEL": return "そのショットで最初にふれた敵へのダメージが<b>" + FIRSTKILLER_EL_MUL + "倍</b>（等級EL）";
    case "agrav": return "敵の重力バリアの減速を受けない";
    case "defkiller": return "防御ダウン中の敵へのダメージが1.5倍";
    case "defkillerM": return "防御ダウン中の敵へのダメージが<b>" + DEFKILLER_M_MUL + "倍</b>（等級M）";
    case "dash": return "自分のスピードが常に1.5倍";
    case "bubblemode": return "各WAVEの開始から自分が" + WAVE_SELF + "回行動するまで、減速しにくいバブリー状態になる";
    case "pimmune": return "毒状態にならない";
    case "fatalkiller": return "残りHPが50%以下の敵へのダメージが1.5倍";
    case "destroyboost": return "画面内の敵が倒れるたびに、自分のFBターンを1短縮する";
    case "destroyboostM": return "画面内の敵が倒れるたびに、自分のFBターンを<b>" + DESTROYBOOST_M + "短縮</b>する（等級M）";
    case "darkmatch": return "敵にふれるたびにその敵を毒状態にする";
    case "waveboost": return "各WAVEの開始から<b>自分が" + WAVE_SELF + "回行動するまで</b>、チームHP50%以上なら攻撃・スピード1.5倍（パワーモード）";
    case "superms": return "各WAVEの開始時に地雷を4つ所持してスタート。敵ヒット時に1個消費して1.5倍攻撃";
    case "sokojikara": return "自分（チーム）の残りHPが50%以下のとき、与えるダメージが1.5倍になる";
    case "eternalphoton": return "クエストにエーテルがある場合、各WAVEの開始時にエーテルを2つ所持してスタートする";
    case "resonance": return "自分のターンごとに30%の確率で、そのターンのステータス・リンクスキルが1.5倍になる";
    case "sgrav": return "敵の重力バリアの減速を受けず、さらに<b>そのショットで最初に重力バリアにふれたとき、スピードが" + SGRAV_ACCEL + "倍</b>になる";
    case "aslow": return "減速壁を無効化する（ふれてもスピードが落ちない）";
    case "msM": return "地雷を回収し、敵ヒット時に1個消費して<b>2倍</b>攻撃（等級M）";
    case "supermsM": return "各WAVEの開始時に地雷を4つ所持してスタート。敵ヒット時に1個消費して<b>2倍</b>攻撃（等級M）";
    case "elemres": return "<b>このキャラ自身が</b>" + ELEM[a.el].nm + "属性の敵から受けるダメージを" + Math.round(ALLRES_CUT * 100) + "%カットする<br><small>※ 軽減されるのは<b>このキャラが受けた攻撃だけ</b>です</small>";
    case "elemresM": return "<b>このキャラ自身が</b>" + ELEM[a.el].nm + "属性の敵から受けるダメージを<b>" + Math.round(ELEMRES_M_CUT * 100) + "%</b>カットする（等級M）<br><small>※ 軽減されるのは<b>このキャラが受けた攻撃だけ</b>です</small>";
    case "dashM": return "自分のスピードが常に<b>2倍</b>（等級M）";
    case "superadw": return "ダメージウォールを無効化し、さらにダメージウォールに触れると1.3倍に自強化する";
    case "regenM": return "自分のターン終了時、チームHPを" + Math.round(REGENM_RATE * 100) + "%回復する（等級M）";
    case "fsboostM": return "自分のリンクスキル・サブリンクの威力が<b>2倍</b>になる（等級M）";
    case "antilock": return "ロックゾーンの中でもリンクスキルが無効化されない";
    case "protection": return "<b>このキャラが受けた</b>1ヒットの威力が一定以下（" + PROTECT_THRESH + "）の場合、その被ダメージを1にする<br><small>※ 効くのは<b>このキャラが受けた攻撃だけ</b>です</small>";
    case "vitalL": return "残りHPが50%以上の敵へのダメージが<b>2.5倍</b>（等級L）";
    case "weakkillerM": return "弱点コアへ直撃したときのダメージがさらに<b>2倍</b>（等級M）";
    case "vitalM": return "残りHPが50%以上の敵へのダメージが<b>2倍</b>（等級M）";
    case "killerM": return ELEM[a.el].nm + "属性の敵へのダメージが<b>2倍</b>（等級M）";
    case "killerL": return ELEM[a.el].nm + "属性の敵へのダメージが<b>" + KILLER_L_MUL + "倍</b>（等級L）";
    case "killerEL": return ELEM[a.el].nm + "属性の敵へのダメージが<b>" + KILLER_EL_MUL + "倍</b>（等級EL）";
    case "gravkillerEL": return "<b>重力バリアを持つ敵</b>へのダメージが<b>" + GRAVKILLER_EL_MUL + "倍</b>（等級EL）";
    case "fewfoeEL": return "画面上の敵が<b>" + FEWFOE_N + "体以下</b>のとき、与えるダメージが<b>" + FEWFOE_EL_MUL + "倍</b>になる（等級EL）";
    case "eternalphotonM": return "クエストにエーテルがある場合、各WAVEの開始時にエーテルを<b>" + ETERNAL_PHOTON_M_N + "つ</b>所持してスタートする（等級M）";
    case "speedmode": return "<b>各WAVEの開始時</b>から、自分が<b>" + SPEEDMODE_ACTS + "回行動し終えるまで</b>スピードが<b>" + SPEEDMODE_MUL + "倍</b>になる";
    case "allkillerEL": return "すべての属性の敵へのダメージが<b>" + ALLKILLER_EL_MUL + "倍</b>（等級EL）";
    case "sscharge": return "1回のショットで味方3体に触れると、3体目に触れた味方のフルバーストターンを2短縮する（FBターンチャージ）";
    case "supermsL": return "各WAVEの開始時に地雷を4つ所持してスタート。敵ヒット時に1個消費して<b>2.5倍</b>攻撃（等級L）";
    case "soulM": return "敵を倒すたびにチームHPを" + Math.round(SOULM_RATE * 100) + "%回復する（等級M）";
    case "laserstop": return "敵のレーザーが<b>このキャラに当たったとき</b>、その身で受け止めてビームを<b>そこで消し止め</b>、チームHPを<b>" + Math.round(LASERSTOP_HEAL * 100) + "%</b>回復する<br><small>※ レーザーそのものは撃たれます。<b>射線上でこのキャラより敵に近い味方</b>はふつうにダメージを受けます</small>";
    case "wallboostL": return "そのショットで壁にふれた回数に応じて攻撃力がアップ（最大<b>2.5倍</b>・等級L）";
    case "fsdouble": return "1回のショットで、<b>自分のリンクスキルを最大" + FSDOUBLE_MAX + "回まで発動</b>できる（味方に2回ふれれば2回発動）";
    case "counterkiller": return "<b>最後に攻撃してきた敵</b>へのダメージが" + COUNTER_KILLER_MUL + "倍になる";
    case "upkillerM": return "画面の<b>上半分にいる敵</b>へのダメージが<b>" + UPKILLER_MUL + "倍</b>（等級M）";
    case "drainM": return "敵にふれるたびにチームHPを" + Math.round(DRAINM_RATE * 100) + "%回復する（等級M）";
    case "overheat": return "自分のターン終了時にチームHPを" + Math.round(OVERHEAT_COST * 100) + "%消費する代わりに、常に自強化（攻撃<b>×" + OVERHEAT_MUL + "</b>）する";
    case "barrierM": return "一定量（<b>" + fmt(BARRIER_M) + "</b>）のダメージを代わりに受け止める（等級M）";
    case "barrierL": return "一定量（<b>" + fmt(BARRIER_L) + "</b>）のダメージを代わりに受け止める（等級L）";
    case "superaslow": return "<b>減速壁で減速しない</b>うえに、<b>そのターンで最初にふれた減速壁</b>ではむしろ<b>スピードが" + SUPERASLOW_MUL + "倍</b>になる（アンチ減速壁の上位）";
    case "gravkiller": return "<b>重力バリアを持つ敵</b>へのダメージが<b>" + GRAVKILLER_MUL + "倍</b>";
    case "gravkillerL": return "<b>重力バリアを持つ敵</b>へのダメージが<b>" + GRAVKILLER_L_MUL + "倍</b>（等級L）";
    case "houraikillerL": return "<b>蓬莱族</b>（🏯 蓬莱の九重のボスなど）へのダメージが<b>" + HOURAIKILLER_L_MUL + "倍</b>（等級L）。<b>属性キラーとは別枠</b>なので重ねて効く";
    case "gravkillerM": return "<b>重力バリアを持つ敵</b>へのダメージが<b>" + GRAVKILLER_M_MUL + "倍</b>（等級M）";
    case "healM": return "自分の攻撃ターンに<b>ふれた味方の数</b>だけチームHPを回復する"
      + "（1体につき" + Math.round(HEALM_PER * 100) + "%・最大" + HEALM_MAX_ALLY + "体＝"
      + Math.round(HEALM_PER * HEALM_MAX_ALLY * 100) + "%／等級M）<br><small>※ 毎ターン確定で回復する「リジェネ」とは別枠です（両方持っていれば両方乗ります）</small>";
    case "wallfbshort": return "<b>壁にふれるたびにフルバーストのターンが1短縮</b>される（1ショットで最大<b>" + WALLFB_MAX + "ターン</b>まで）";
    case "impulseboost": return "敵にふれたとき<b>" + Math.round(IMPULSE_P * 100) + "%の確率</b>でスピードが<b>" + IMPULSE_MUL + "倍</b>になる";
    case "wallboostM": return "そのショットで壁にふれた回数に応じて攻撃力がアップ（最大<b>2倍</b>・等級M）";
    case "fbaccel": return "残りチームHPが<b>" + Math.round(FBACCEL_HP * 100) + "%未満</b>のとき、自分のフルバーストターンを毎ターン<b>" + FBACCEL_TURNS + "ターン</b>短縮する";
    case "mobkiller": return "<b>ボス以外の敵</b>へのダメージが" + MOBKILLER_MUL + "倍になる";
    case "fsboostL": return "自分のリンクスキル・サブリンクの威力が<b>" + FSBOOSTL_MUL + "倍</b>になる（等級L）";
    case "dashL": return "自分のスピードが常に<b>" + DASHL_MUL + "倍</b>（等級L）";
    case "fbshort": return "自分のフルバーストターンが<b>毎ターン1多く進む</b>（＝実質2ターンぶん短縮される）";
    case "fbtouch": return "1回のショットで<b>味方に触れた数だけ</b>、自分のフルバーストターンを短縮する（1体につき1ターン）";
    case "combokillerM": return "<b>同じ敵に連続で触れる</b>たびに攻撃力がアップ（1回ごと+" + Math.round(COMBOKILLER_STEP * 100) + "%・最大<b>" + COMBOKILLER_MAX + "倍</b>／別の敵に触れるとリセット）";
    case "judgment": return "<b>ボスがいるWAVE</b>で自分が最初に行動したとき、<b>画面上のすべての敵の防御力を" + JUDGMENT_TURNS + "ターンダウン</b>させる";
    case "infinitybreakM": return "<b>敵にふれるたび</b>に攻撃力がアップ（1回ごと+" + Math.round(INFBREAK_STEP * 100) + "%・最大<b>" + INFBREAK_MAX + "倍</b>）。<b>毎ターンリセット</b>される";
    case "fewfoeM": return "画面上の敵が<b>" + FEWFOE_N + "体以下</b>のとき、与えるダメージが<b>" + FEWFOE_MUL + "倍</b>になる（等級M）";
    /* ══ v14 フェスキャラの新アビリティ ══ */
    case "msEL": return "地雷を回収し、敵ヒット時に1個消費して<b>" + MSEL_MUL + "倍</b>攻撃（等級EL）";
    case "lightning": return "<b>自分の攻撃ターン</b>に<b>直殴り</b>で敵にふれたとき、" + Math.round(LIGHTNING_P * 100) + "%の確率でその敵へ<b>強力な魔法（攻撃力×" + LIGHTNING_MUL + "）</b>を放つ";
    case "lightningEL": return "<b>自分の攻撃ターン</b>に<b>直殴り</b>で敵にふれたとき、" + Math.round(LIGHTNING_EL_P * 100) + "%の確率でその敵へ<b>強力な魔法（攻撃力×" + LIGHTNING_EL_MUL + "）</b>を放つ（等級EL）";
    case "atkturnkillerM": return "<b>攻撃ターンの表示が「1」の敵</b>へのダメージが<b>" + ATKTURN_KILLER_MUL + "倍</b>（等級M）";
    case "mirage": return "敵の攻撃を" + Math.round(MIRAGE_P * 100) + "%の確率で<b>回避</b>する（チーム全体の被ダメージが0になる）";
    case "linkcharge": return "自分の<b>リンクスキルが敵に命中</b>したとき、" + Math.round(LINKCHARGE_P * 100) + "%の確率で<b>自分のFBターンを1短縮</b>する";
    case "weakkillerL": return "弱点コアへ直撃したときのダメージがさらに<b>" + WEAKKILLERL_MUL + "倍</b>（等級L）";
    case "weakkillerEL": return "弱点コアへ直撃したときのダメージがさらに<b>" + WEAKKILLER_EL_MUL + "倍</b>（等級EL）";
    case "auraM": return "チームHP50%以上のとき攻撃・スピードが<b>" + AURAM_MUL + "倍</b>（等級M）";
    case "cumulonimbus": return "そのショットで<b>最初にふれた敵</b>を雷雲の標的にする。<b>次のターンの終了時にその敵へ落雷（攻撃力×" + CUMULO_MUL + "）</b>。さらに<b>そのショットで動いた距離に応じてステータスが最大×" + CUMULO_MAX + "</b>までアップする";
    case "cumulonimbusEL": return "そのショットで<b>最初にふれた敵</b>を雷雲の標的にする。<b>次のターンの終了時にその敵へ落雷（攻撃力×" + CUMULO_EL_MUL + "）</b>。さらに<b>そのショットで動いた距離に応じてステータスが最大×" + CUMULO_EL_MAX + "</b>までアップする（等級EL）<br><small>※ 落雷の着弾点から<b>半径" + CUMULO_EL_SPLASH_R + "の衝撃波</b>が走り、まわりの敵にも落雷の" + Math.round(CUMULO_EL_SPLASH * 100) + "%が入ります。距離のボーナスも<b>" + CUMULO_EL_DIST + "px</b>で満ちます（無印は" + CUMULO_DIST + "px）</small>";
    case "vitalEL": return "残りHPが50%以上の敵へのダメージが<b>" + VITALEL_MUL + "倍</b>（等級EL）";
    case "phantomdrive": return "そのショットで<b>壁に" + PHANTOM_WALLS + "回ふれる</b>と、<b>" + PHANTOM_TURNS + "回行動するあいだステータスが×" + PHANTOM_MUL + "</b>にアップする";
    case "phantomdriveEL": return "そのショットで<b>壁に" + PHANTOM_EL_WALLS + "回ふれる</b>と、<b>" + PHANTOM_EL_TURNS + "回行動するあいだステータスが×" + PHANTOM_EL_MUL + "</b>にアップする（等級EL）";
    case "atkcharge": return "1回のショットで<b>味方" + ATKCHARGE_N + "体にふれる</b>と、<b>" + ATKCHARGE_N + "体目にふれた味方</b>の攻撃力が<b>1巡のあいだ×" + ATKCHARGE_MUL + "</b>になる";
    case "atkchargeM": return "1回のショットで<b>味方" + ATKCHARGE_N + "体にふれる</b>と、<b>" + ATKCHARGE_N + "体目にふれた味方</b>の攻撃力が<b>1巡のあいだ×" + ATKCHARGE_M_MUL + "</b>になる（等級M）";
    /* ══ v14.5 クロエの新アビリティ ══ */
    case "supermsEL": return "各WAVEの開始時に地雷を4つ所持してスタート。敵ヒット時に1個消費して<b>" + MSEL_MUL + "倍</b>攻撃（等級EL）";
    case "fatalkillerM": return "残りHPが50%以下の敵へのダメージが<b>" + FATALKILLERM_MUL + "倍</b>（等級M）";
    /* ══ v15 Luminous Summer Fest の新アビリティ ══ */
    case "fsboostEL": return "自分のリンクスキル・サブリンクの威力が<b>" + FSBOOSTEL_MUL + "倍</b>になる（等級EL）";
    case "auraEL": return "チームHP50%以上のとき攻撃・スピードが<b>" + AURAEL_MUL + "倍</b>（等級EL）";
    case "combokillerEL": return "<b>同じ敵に連続で触れる</b>たびに攻撃力がアップ（1回ごと+" + Math.round(COMBOKILLEREL_STEP * 100) + "%・最大<b>" + COMBOKILLEREL_MAX + "倍</b>／別の敵に触れるとリセット・等級EL）";
    /* ══ ★ 2026-08-06 プレミアム新SSR 3体（ユリア・アルティア・リアナ）の新アビリティ ══ */
    case "netherkillerEL": return "<b>冥花種</b>（🌸 幽冥の庭園のボスなど）へのダメージが<b>" + NETHERKILLER_EL_MUL + "倍</b>（等級EL）。<b>属性キラーとは別枠</b>なので重ねて効く";
    case "netherkillerM": return "<b>冥花種</b>（🌸 幽冥の庭園のボスなど）へのダメージが<b>" + NETHERKILLER_M_MUL + "倍</b>（等級M）。<b>属性キラーとは別枠</b>なので重ねて効く";
    case "sokojikaraM": return "自分（チーム）の残りHPが50%以下のとき、与えるダメージが<b>" + SOKOJIKARA_M_MUL + "倍</b>になる（等級M）";
    case "allkillerM": return "すべての属性の敵へのダメージが<b>" + ALLKILLER_M_MUL + "倍</b>（等級M）";
    /* ★ 2026-08-07 野獣先輩 */
    case "allykillfb": return "味方が敵を倒すたびに、<b>1体につき" + ALLYKILL_FB + "ターン</b>自分のフルバーストターンを短縮する";
    case "beastrage": return "自分（チーム）の残りHPが<b>" + Math.round(BEASTRAGE_HP * 100) + "%以下</b>のとき、自分のステータスが<b>" + BEASTRAGE_MUL + "倍</b>になる";
    case "ailmentresist": return "自分（チーム）の残りHPが<b>" + Math.round(AILRESIST_HP * 100) + "%以上</b>のあいだ、<b>状態異常にならない</b>（毒など）";
    /* ★ 2026-08-07 新アンチギミック「断絶界」＋ プレミアム新SSR 4体 */
    case "award": return "<b>断絶界を1回ふれるだけで破壊</b>できる。ふつうは内外どちらからでも" + WARD_HITS
      + "回たたく必要があり、しかも<b>1ショットで削れるのは" + WARD_PER_SHOT + "回まで</b>なので、"
      + "アンチ断絶界があるかどうかで「閉じこめられた仲間を助け出すまでの手数」がまるごと変わる";
    case "netherkillerL": return "<b>冥花種</b>（🌸 幽冥の庭園のボスなど）へのダメージが<b>" + NETHERKILLER_L_MUL + "倍</b>（等級L）。<b>属性キラーとは別枠</b>なので重ねて効く";
    case "combokillerL": return "<b>同じ敵に連続で</b>ふれるほどダメージが上がる（1回ごと +" + Math.round(COMBOKILLERL_STEP * 100) + "%・最大<b>×" + COMBOKILLERL_MAX + "</b>／等級L）。別の敵にふれると数え直し";
    case "barrierEL": return "一定量（<b>" + fmt(BARRIER_EL) + "</b>）のダメージを代わりに受け止める（等級EL）";
    case "eclipseslayerM": return "<b>冥花種</b>（🌸）と<b>蝕魔族</b>（🌑）の<b>両方</b>へのダメージが<b>" + ECLIPSE_SLAYER_M_MUL + "倍</b>（等級M）。"
      + "幽冥の庭園に出る2種族をまとめて狩れる、庭園特化のキラー";
    case "msL": return "地雷を回収し、敵ヒット時に1個消費して<b>" + MSL_MUL + "倍</b>攻撃（等級L）";
    case "mobkillerL": return "<b>ボス以外の敵</b>へのダメージが<b>" + MOBKILLER_L_MUL + "倍</b>になる（等級L）";
    /* ★ 2026-08-08 */
    case "mobkillerM": return "<b>ボス以外の敵</b>へのダメージが<b>" + MOBKILLER_M_MUL + "倍</b>になる（等級M）";
    case "eclipsekillerM": return "<b>" + (RACES[ECLIPSE_RACE] || {}).nm + "</b>の敵へのダメージが<b>" + ECLIPSEKILLER_M_MUL + "倍</b>（等級M）"
      + "<br><small>幽冥の庭園 第11〜15ノ園のボス（ドミニア）がこの種族です</small>";
    case "eclipsekillerEL": return "<b>" + (RACES[ECLIPSE_RACE] || {}).nm + "</b>の敵へのダメージが<b>" + ECLIPSEKILLER_EL_MUL + "倍</b>（等級EL）。<b>属性キラーとは別枠</b>なので重ねて効く"
      + "<br><small>幽冥の庭園 第11〜15ノ園のボス（ドミニア）がこの種族です</small>";
    case "rightkillerL": return "画面の<b>右半分にいる敵</b>へのダメージが<b>" + RIGHTKILLER_L_MUL + "倍</b>（等級L）";
    /* ★ 2026-08-08 プレミアム新SSR 4体（カエデ・リノン・ココロ・アンジェ）用 */
    case "regenL": return "自分のターン終了時、チームHPを" + Math.round(REGENL_RATE * 100) + "%回復する（等級L）";
    case "fbturnboost": return "<b>自分のターンで敵を倒すたび</b>に、自分のフルバーストが<b>" + FBTURNBOOST + "ターン</b>縮む<br><small>※ 1回のショットで何体倒しても、そのぶんだけ縮みます</small>";
    case "bosskillerM": return "<b>ボス</b>へのダメージが<b>" + BOSSKILLER_M_MUL + "倍</b>（等級M）";
    case "allresM": return "<b>このキャラ自身が</b>すべての属性から受けるダメージを" + Math.round(ALLRES_M_CUT * 100) + "%カットする（等級M）<br><small>※ 軽減されるのは<b>このキャラが受けた攻撃だけ</b>です</small>";
    case "leftkillerM": return "画面の<b>左半分にいる敵</b>へのダメージが<b>" + LEFTKILLER_M_MUL + "倍</b>（等級M）";
    case "laserstopM": return "敵のレーザーが<b>このキャラに当たったとき</b>、その身で受け止めてビームを<b>そこで消し止め</b>、チームHPを<b>" + Math.round(LASERSTOPM_HEAL * 100) + "%</b>回復する（等級M）<br><small>※ レーザーそのものは撃たれます。<b>射線上でこのキャラより敵に近い味方</b>はふつうにダメージを受けます</small>";
    /* ══ ★ 2026-08-08c プレミアム新SSR 3体（コトネ・ラン・セリス）の新アビリティ ══ */
    case "wallboostEL": return "そのショットで壁にふれた回数に応じて攻撃力がアップ（最大<b>" + WALLBOOSTEL_MAX + "倍</b>・等級EL）";
    case "soulEL": return "敵を倒すたびにチームHPを<b>" + Math.round(SOULEL_RATE * 100) + "%</b>回復する（等級EL）";
    case "manyfoeM": return "画面上の敵が<b>" + FEWFOE_N + "体より多い</b>とき、与えるダメージが<b>" + MANYFOE_M_MUL + "倍</b>になる（等級M）"
      + "<br><small>※「敵少底力」が発動しない状況＝敵が多い場面で効く、敵少底力の裏返しのアビリティです</small>";
    case "ailsokojikaraM": return "<b>状態異常（毒など）を受けているあいだ</b>、与えるダメージが<b>" + AILSOKOJIKARA_M_MUL + "倍</b>になる（等級M）<br><small>※ 状態異常には<b>敵の毒攻撃</b>も含まれます</small>";
    /* ══ ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）の新アビリティ ══ */
    case "sokojikaraL": return "自分（チーム）の残りHPが50%以下のとき、与えるダメージが<b>" + SOKOJIKARA_L_MUL + "倍</b>になる（等級L）";
    case "sokojikaraEL": return "自分（チーム）の残りHPが50%以下のとき、与えるダメージが<b>" + SOKOJIKARA_EL_MUL + "倍</b>になる（等級EL）";
    case "fatalkillerL": return "残りHPが50%以下の敵へのダメージが<b>" + FATALKILLER_L_MUL + "倍</b>（等級L）";
    case "outkillerM": return "画面の<b>壁ぎわ（外周" + Math.round(OUT_EDGE_RATIO * 100) + "%の帯）にいる敵</b>へのダメージが<b>" + OUTKILLER_M_MUL + "倍</b>（等級M）";
    case "outkillerL": return "画面の<b>壁ぎわ（外周" + Math.round(OUT_EDGE_RATIO * 100) + "%の帯）にいる敵</b>へのダメージが<b>" + OUTKILLER_L_MUL + "倍</b>（等級L）";
    case "eclipseslayerEL": return "<b>冥花種</b>（🌸）と<b>蝕魔族</b>（🌑）の<b>両方</b>へのダメージが<b>" + ECLIPSE_SLAYER_EL_MUL + "倍</b>（等級EL）。"
      + "<br><small>※ 幽冥の庭園のボスはすべてこのどちらかです</small>";
    case "konshin": return "自分の攻撃力が<b>" + KONSHIN_ATK + "倍</b>になるかわりに、スピードが<b>" + KONSHIN_SPD + "倍</b>になる"
      + "<br><small>※ スピードが下がるぶん<b>1ショットで走る距離が短くなります</b>。近づいてから撃つのが基本です</small>";
  }
  return "";
}
/* ★ 2026-08-10 クロススキルで<b>アビリティが増える</b>ようにした。
   CONNECT のスキルに abil: "xxx" と書いておくと、条件を満たしているあいだ
   そのキャラは そのアビリティを持っているものとして扱われる。
   ここ1か所で見るので、キラー倍率もアンチ判定も自動でついてくる。
   ★ ch.connect が無いキャラは1行目で必ず抜けるので、当たり判定の中で
     毎フレーム呼ばれても重くならない。 */
function hasAbil(ch, t) {
  if (!ch) return false;
  if ((ch.abil || []).some((a) => a.t === t)) return true;
  if (!ch.connect) return false;
  return connectGrants(ch.id, t);
}
/* ★ 2026-08-18 キュムロニンバスは「無印」と「EL」で<b>しくみがまったく同じ</b>。
   等級ごとに hasAbil を2回書くと、片方を足し忘れて「予約はされるのに落ちない」型の
   抜けが必ず出るので、<b>持っているか</b>の判定はこの1か所にまとめる。
   数字を出し分けるところだけ hasAbil(ch, "cumulonimbusEL") を見ること。 */
function hasCumulo(ch) { return hasAbil(ch, "cumulonimbus") || hasAbil(ch, "cumulonimbusEL"); }
/* ★ 2026-08-16b 属性を持つキラー（killerM / killerL / killerEL）を、
   <b>本人のアビリティとクロススキルの両方</b>から探す。
   hasAbil はキーしか見ないので、クロスで配られた「火属性キラーEL」のように
   <b>属性がキーの外にある</b>ものは、これを通さないと属性が分からず効かない。
   クロス側は skills[].abil にキー、skills[].el に属性を持たせる決まり。 */
function elemKillerAbil(ch, t) {
  if (!ch) return null;
  const own = (ch.abil || []).find((a) => a.t === t);
  if (own) return own;
  if (!ch.connect) return null;
  let d;
  try { d = connectDef(ch.id); } catch (e) { return null; }
  if (!d) return null;
  const sk = (d.skills || []).find((x) => x.abil === t && x.el);
  if (!sk) return null;
  return connectGrants(ch.id, t) ? { t: t, el: sk.el } : null;
}
/* クロススキルで t が付いているか（発動していなければ false） */
function connectGrants(id, t) {
  let d;
  try { d = connectDef(id); } catch (e) { return false; }   // 定義より前に呼ばれた場合の保険
  if (!d || !d.skills.some((s) => s.abil === t)) return false;
  return connectInParty(id) && connectOnId(id);
}

/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-06 アビリティの並び順（アンチ対応 → キラー系 → その他）
   ------------------------------------------------------------
   これまではキャラ定義に書いた順のまま出していたので、キャラごとに
   「アンチが先の子」「キラーが先の子」がバラバラだった。
   バトル中はとくに「このクエストのギミックに対応できるか」を最初に見たいので、
   どの画面でも同じ順番でそろえる。
   ・アンチ対応 … ギミックを無効化・軽減するもの（COUNTER_ABIL の need ＋ オムニ ＋
     ギミックそのものを打ち消すもの＝毒無効・レーザーストップ・エーテル所持）
   ・キラー系   … 特定の相手への与ダメージ倍率（〜キラー・キラーM/L/EL）
   ・その他     … 自強化・回復・バリア・FB短縮 など
   ★ ここは表示の順番だけを決める。効果の計算には一切かかわらない。
   ★ COUNTER_ABIL はこの下（クエスト側）で定義されるので参照しない。
     アンチの一覧はここに直接書き、追加時は両方に足すこと。 */
const ABIL_ANTI = new Set([
  /* ダメージウォール／ワープ／地雷／ブロック／重力バリア／減速壁／ロックゾーン／断絶界 */
  "adw", "superadw", "aw", "superaw",
  "ms", "superms", "msM", "supermsM", "msL", "supermsL", "msEL", "supermsEL",
  "ablock", "agrav", "sgrav", "aslow", "superaslow", "antilock",
  "award",           /* ★ 2026-08-07 アンチ断絶界 */
  /* まとめて無効化するもの・ギミックそのものを打ち消すもの */
  "omni", "pimmune", "laserstop", "eternalphoton",
  "ailmentresist",   /* ★ 2026-08-07 状態異常レジスト（HPが高いあいだ毒などを受けない） */
]);
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-07 アンチギミックの「並び順」をアプリ全体で1本にそろえる
   ------------------------------------------------------------
   キャラ詳細のアビリティ、クエストのアンチチップ、対応キャラさがし、
   ギミック詳細 —— どこで出すときも必ずこの順番にする。

     オムニアンチ → ダメージウォール → 重力バリア → ワープ → 地雷
     → 減速壁 → ブロック → ロックゾーン → 断絶界

   ★ ANTI_ORDER が「ギミックのキー」、ANTI_ABIL_RANK が「アビリティのtype」。
     新しいアンチギミックを足すときは、必ずこの2つにも足すこと。
   ══════════════════════════════════════════════════════════════ */
const ANTI_ORDER = ["dw", "grav", "warp", "mine", "slowwall", "block", "lockzone", "ward"];
const ANTI_ABIL_RANK = (function () {
  /* 0 はオムニアンチ専用。以降は ANTI_ORDER の並びに 1 から番号を振る */
  const byGim = {
    dw: ["adw", "superadw"],
    grav: ["agrav", "sgrav"],
    warp: ["aw", "superaw"],
    mine: ["ms", "superms", "msM", "supermsM", "msL", "supermsL", "msEL", "supermsEL"],
    slowwall: ["aslow", "superaslow"],
    block: ["ablock"],
    lockzone: ["antilock"],
    ward: ["award"],
  };
  const m = { omni: 0 };
  ANTI_ORDER.forEach((g, i) => (byGim[g] || []).forEach((t) => { m[t] = i + 1; }));
  return m;
})();
/* アンチ枠のなかでの並び順（表に無いもの＝毒無効・レーザーストップなどは最後） */
function antiAbilRank(t) {
  const r = ANTI_ABIL_RANK[t];
  return r == null ? ANTI_ORDER.length + 1 : r;
}
/* ギミックキーの一覧を、決められた順番にそろえ直す（重複は落とす） */
function orderAntiKeys(keys) {
  const set = new Set(keys || []);
  return ANTI_ORDER.filter((k) => set.has(k));
}
function abilGroup(a) {
  const t = a && a.t;
  if (ABIL_ANTI.has(t)) return 0;
  /* キラー系は名前で拾う（killer / killerM / weakkillerL … と増え続けるため）。
     "allkiller" や "counterkiller" もここに入る。 */
  if (/killer/i.test(String(t))) return 1;
  return 2;
}
/* 表示用に並べ替えた配列を返す（元の配列は壊さない＝定義側の順番はそのまま残す）
   ★ 2026-08-07: アンチ枠の中は ANTI_ABIL_RANK の順（オムニ → DW → 重力 → ワープ →
     地雷 → 減速壁 → ブロック → ロックゾーン → 断絶界）に固定する。 */
function sortedAbil(ch) {
  const list = (ch && ch.abil) || [];
  return list.map((a, i) => ({ a, i }))
    .sort((x, y) => (abilGroup(x.a) - abilGroup(y.a))
      || (abilGroup(x.a) === 0 ? antiAbilRank(x.a.t) - antiAbilRank(y.a.t) : 0)
      || (x.i - y.i))
    .map((o) => o.a);
}
/* ── 等級ちがいをまとめて見るヘルパー（M / L / EL が増えるたびに書き換えるのはここだけ） ── */
/* 連撃キラー: 持っていなければ null。等級ごとの上限・1回あたりの上昇量・表示名を返す */
function comboKillerOf(ch) {
  if (hasAbil(ch, "combokillerEL")) return { max: COMBOKILLEREL_MAX, step: COMBOKILLEREL_STEP, nm: "連撃KILLER EL" };
  if (hasAbil(ch, "combokillerL")) return { max: COMBOKILLERL_MAX, step: COMBOKILLERL_STEP, nm: "連撃KILLER L" };
  if (hasAbil(ch, "combokillerM")) return { max: COMBOKILLER_MAX, step: COMBOKILLER_STEP, nm: "連撃KILLER M" };
  return null;
}
/* リンクブースト: リンクスキル・サブリンクにかかる倍率と表示名 */
function fsBoostMul(ch) {
  if (hasAbil(ch, "fsboostEL")) return FSBOOSTEL_MUL;
  if (hasAbil(ch, "fsboostL")) return FSBOOSTL_MUL;
  if (hasAbil(ch, "fsboostM")) return 2.0;
  if (hasAbil(ch, "fsboost")) return FSBOOST_MUL;
  return 1;
}
function fsBoostName(ch) {
  return hasAbil(ch, "fsboostEL") ? "リンクブーストEL" : hasAbil(ch, "fsboostL") ? "リンクブーストL"
    : hasAbil(ch, "fsboostM") ? "リンクブーストM" : "リンクブースト";
}
/* マインバーストの倍率（等級 EL=3.0 ／ L=2.5 ／ M=2.0 ／ 無印=1.5） */
function mineBurstMul(ball) {
  const c = ball && ball.ch; if (!c) return 1.5;
  if (hasAbil(c, "msEL") || hasAbil(c, "supermsEL")) return MSEL_MUL;
  if (hasAbil(c, "msL") || hasAbil(c, "supermsL")) return MSL_MUL;
  if (hasAbil(c, "msM") || hasAbil(c, "supermsM")) return 2.0;
  return 1.5;
}
/* 地雷を回収できるアビリティを持っているか（アンチ扱いのマインスイーパー系すべて） */
function canSweepMine(c) {
  return hasAbil(c, "ms") || hasAbil(c, "superms") || hasAbil(c, "msM")
    || hasAbil(c, "supermsM") || hasAbil(c, "msL") || hasAbil(c, "supermsL")
    || hasAbil(c, "msEL") || hasAbil(c, "supermsEL");
}
function killerEl(ch) { const k = (ch.abil || []).find((a) => a.t === "killer"); return k ? k.el : null; }
/* 実効の撃種（"pierce" | "bounce"）。
   反射化（アリシアフルバースト）を受けている間は素の撃種より shotMode が優先される。
   第19・20の間の「反射のみ／貫通のみ通過できるブロック」判定もこれを見る。 */
function shotOf(ball) {
  if (!ball) return "pierce";
  if (ball.shotMode && (ball.shotMode.left || 0) > 0) return ball.shotMode.v;
  return ball.ch.shot;
}
/* ══ ★ 2026-08-08c 撃種が変わるフルバースト ══
   フルバーストを予約している（★ボタンが点灯している）あいだは、
   <b>そのフルバーストで変わったあとの撃種</b>で狙いのガイドを引かないと、
   「反射のつもりで引いたのに貫通で飛んでいった」という食いちがいが起きる。
   ここに載っている ssKind は、撃った瞬間に shotMode が変わるフルバースト。
   ★ 撃種が変わるフルバーストを足したら、ここにも1行足すこと。 */
const SS_SHOTMODE = {
  alicia: "bounce",      // オールクリア（貫通 → 反射）
  shirayuki: "pierce",   // 自強化＆貫通化（壁にふれると反射に戻る）
  selene: "pierce",      // 貫通化して止まったら再走
  yukino: "pierce",      // シルフィード・ブレイクスルー（貫通化）
};
/* 狙っているあいだにガイド・矢印へ出す撃種。
   フルバーストの予約中は、そのフルバーストで変わったあとの撃種を返す。 */
function aimShotOf(ball) {
  if (!ball) return "pierce";
  if (B && B.ssArmed == null && B.ssPlan && ball.sc >= ball.st.ssTurns) {
    const v = SS_SHOTMODE[ball.ch.ssKind];
    if (v) return v;
  }
  return shotOf(ball);
}
/* 各WAVEで「自分が2回行動するまで」系（オムニアンチ／バブリーモード／パワーオーラ＋） */
const WAVE_SELF = 2;
function waveSelfActive(ball) { return B && (ball.waveActs || 0) < WAVE_SELF; }
/* オムニアンチ発動中か */
function omniActive(ball) { return B && hasAbil(ball.ch, "omni") && waveSelfActive(ball); }
function bubbleModeOn(ball) { return hasAbil(ball.ch, "bubblemode") && waveSelfActive(ball); }
function waveBoostOn(ball) { return hasAbil(ball.ch, "waveboost") && waveSelfActive(ball); }
/* ★ 2026-08-17b グレースのフルバースト中かどうか。
   発動中は<b>弱点キラーEL と 全属性キラーEL の両方</b>を持っているものとして扱う。
   selfBuff.gkill を目印にしているので、他のキャラの自強化には反応しない。
   ★ ここを1か所にまとめること。倍率を掛ける場所が3つあるので、
     条件を書き写すと必ずどれかがずれる。 */
function graceKill(ball) {
  return !!(ball && ball.ch && ball.ch.ssKind === "grace"
    && ball.selfBuff && ball.selfBuff.left > 0 && ball.selfBuff.gkill);
}
/* ギミック無効判定（アンチ系 or オムニアンチ発動中）。超アンチワープはアンチワープを兼ねる。
   アリシアSF中は全ギミック無効 */
function antiGim(ball, t) {
  if (hasAbil(ball.ch, t)) return true;
  if (t === "aw" && hasAbil(ball.ch, "superaw")) return true;
  if (t === "adw" && hasAbil(ball.ch, "superadw")) return true;   // 超アンチダメージウォールはADWを兼ねる
  if (t === "agrav" && hasAbil(ball.ch, "sgrav")) return true;    // 超アンチ重力バリアはアンチ重力バリアを兼ねる
  /* アリシアフルバースト：全ギミック無効。自強化(selfBuff)が続く「次の自分のターンを終えるまで」持続 */
  if (ball.ch.ssKind === "alicia" && ((B.ssArmed === ball.i) || (ball.selfBuff && ball.selfBuff.left > 0))) return true;
  /* ★ v14 アビスフルバースト：そのショット中はダメージウォールと重力バリアを無効化する */
  if (ball.ch.ssKind === "abyss" && B.ssArmed === ball.i && (t === "adw" || t === "agrav")) return true;
  /* ★ v14.5 クロエフルバースト（ホロックス・オーシャン）：
     「自分が2回行動し終えるまで」すべてのアンチギミックを無効化する。
     selfBuff に own:1 が付いているので、本人が手番を終えるたびに1ずつ減る＝2行動ぶん確実に続く。 */
  if (ball.ch.ssKind === "chloe" && ((B.ssArmed === ball.i) || (ball.selfBuff && ball.selfBuff.left > 0))) return true;
  /* ★ 2026-08-07 ユキノフルバースト（シルフィード・ブレイクスルー）：
     そのショットのあいだ ダメージウォール・重力バリア・ワープ・地雷 を無効化する。
     地雷は antiGim を通らないので stepBall 側で ssIgnoresMine() を見ている。 */
  if (ball.ch.ssKind === "yukino" && B.ssArmed === ball.i && (t === "adw" || t === "agrav" || t === "aw")) return true;
  /* ★ 2026-08-16b モエカフルバースト（アクア・ブレイクスルー）：
     ユキノと同じ形だが、無効化するのは<b>ブロックだけ</b>。
     ブロックで通り道が塞がれた面を、まっすぐ突っ切って味方をなぞるための技。 */
  if (ball.ch.ssKind === "moeka" && B.ssArmed === ball.i && t === "ablock") return true;
  /* ★ 2026-08-12 ツムギフルバースト（ヴェルデ・ブレイクスルー）：
     <b>そのショットのあいだ</b> ダメージウォール・重力バリア・ワープ・地雷 を無効化する
     （地雷は antiGim を通らないので ssIgnoresMine 側でも見ている）。 */
  if (ball.ch.ssKind === "tsumugi" && B.ssArmed === ball.i && (t === "adw" || t === "agrav" || t === "aw")) return true;
  /* ★ 2026-08-12 チヅルフルバースト（宵闇廻遊）：
     同じ4つを<b>自分の次の行動ターンが終わるまで</b>無効化する。
     selfBuff に own:1 が付いているので、本人が手番を終えたときに切れる。 */
  if (ball.ch.ssKind === "chizuru" && ((B.ssArmed === ball.i) || (ball.selfBuff && ball.selfBuff.left > 0))
      && (t === "adw" || t === "agrav" || t === "aw")) return true;
  /* ★ 2026-08-03: オムニアンチの有効範囲を
     「ダメージウォール・重力バリア・ワープ・地雷」の4つだけに絞った。
     以前はブロックまで通り抜けられたため、ブロックで通り道を作るクエストの
     組み立てがオムニアンチ1体で丸ごと崩れていた。
     地雷は antiGim を通らず stepBall の中で omniActive を直接見ている（そちらは据え置き）。
     新ギミックの減速壁（aslow）も対象外＝専用のアンチが要る。 */
  return OMNI_COVERS.has(t) && omniActive(ball);
}
/* オムニアンチが肩代わりできるアンチアビリティ（＋地雷） */
const OMNI_COVERS = new Set(["adw", "agrav", "aw"]);
/* ★ 2026-08-07: 「地雷を踏んでもダメージを受けない（回収はしない）」状態か。
   オムニアンチと、ユキノのフルバースト中がこれにあたる。stepBall の地雷判定から呼ぶ。 */
function ssIgnoresMine(ball) {
  if (!ball || !B) return false;
  const k = ball.ch.ssKind;
  if (k === "yukino" && B.ssArmed === ball.i) return true;
  /* ★ 2026-08-12 ツムギ（そのショット中）／チヅル（次の自分の行動ターンまで） */
  if (k === "tsumugi" && B.ssArmed === ball.i) return true;
  if (k === "chizuru" && ((B.ssArmed === ball.i) || (ball.selfBuff && ball.selfBuff.left > 0))) return true;
  return false;
}
/* 超アンチワープ: 画面上のワープ数に応じてステータスアップ（攻撃・スピード両方） */
function statMul(ball) {
  if (!B || !ball || !hasAbil(ball.ch, "superaw")) return 1;
  return 1 + SUPERAW_PER * (B.warps ? B.warps.length : 0);
}
/* 攻撃倍率（超アンチワープ＋一定期間の自強化フルバースト[selfBuff]＋レゾナンス） */
function atkMulOf(ball) {
  let m = statMul(ball);
  /* ★ ネクサススキル（リーダーのものだけがチーム全体に効く） */
  m *= nexusVal("atk", 1);
  const nx = nexusDef();
  if (nx && nx.sameEl && B && B.balls[0] && ball.ch.el === B.balls[0].ch.el) m *= nx.sameEl;
  if (ball.selfBuff && ball.selfBuff.left > 0) m *= ball.selfBuff.atk;
  if (ball.reso) m *= 1.5;   // レゾナンス発動中
  if (hasAbil(ball.ch, "overheat")) m *= OVERHEAT_MUL;   // オーバーヒート: 常時自強化（HPは自ターン終了時に消費）
  if (hasAbil(ball.ch, "konshin")) m *= KONSHIN_ATK;     /* ★ 2026-08-12 渾身（スピードは spdMulOf 側で下がる） */
  if (ball.phantom && ball.phantom.left > 0) m *= ball.phantom.mul;   // v14 ファントムドライブ
  if (hasCumulo(ball.ch)) m *= (ball._cumuloBoost || 1); // v14 キュムロニンバス（走った距離ぶん）
  if (ball.atkUp && ball.atkUp > 1) m *= ball.atkUp;   /* ★ 2026-08-07 サブリンク「野獣インパクト」 */
  /* ★ 2026-08-17b 攻撃力チャージ（グレースが配る）。1巡＝味方の人数ぶんの行動で切れる */
  if (ball.atkCharge && ball.atkCharge.left > 0) m *= ball.atkCharge.mul;
  m *= beastMulOf(ball);   /* ★ 2026-08-07 野獣先輩（野獣の本気＋クロススキル） */
  return m;
}
/* ══ ★ 2026-08-07 野獣先輩のステータス倍率（攻撃・スピードの両方にかかる） ══
   ・野獣の本気     … 残りHP25%以下で ×2.5
   ・お待たせ!      … ボス戦に入るたび、本人が1回行動し終えるまで ×2.5（cnxBuff）
   ・伝説の逸材     … 完凸なら常時 ×5.0
   後ろ2つは<b>クロススキル</b>なので、編成条件を満たしているときだけ効く。
   ★ 2026-08-08b: 内訳を beastParts() として別に返せるようにした。
     クロススキルは<b>発動するとアビリティと同じ扱い</b>なので、
     「!」ボタンの最終倍率でも「自強化」にまぎれず1つずつチップで見えるようにする。 */
function beastParts(ball) {
  const out = [];
  if (!ball || !ball.ch) return out;
  if (B && hasAbil(ball.ch, "beastrage") && B.hp <= B.maxhp * BEASTRAGE_HP) out.push({ nm: "野獣の本気", m: BEASTRAGE_MUL });
  if (ball.cnxBuff && ball.cnxBuff.left > 0) out.push({ nm: "🔗お待たせ!", m: CONNECT_BUFF });
  if (connectOn(ball, "legend") && ((ball.st && ball.st.awk) | 0) >= MAX_AWK) out.push({ nm: "🔗伝説の逸材", m: LEGEND_BUFF });
  return out;
}
function beastMulOf(ball) {
  return beastParts(ball).reduce((a, x) => a * x.m, 1);
}
/* スピード倍率（ダッシュ＋自強化フルバースト[selfBuff.spd]＋超アンチワープ＋レゾナンス） */
function spdMulOf(ball) {
  let m = statMul(ball);
  if (hasAbil(ball.ch, "dashL")) m *= DASHL_MUL;
  else if (hasAbil(ball.ch, "dashM")) m *= 2.0;
  else if (hasAbil(ball.ch, "dash")) m *= 1.5;
  if (hasAbil(ball.ch, "konshin")) m *= KONSHIN_SPD;     /* ★ 2026-08-12 渾身（攻撃は atkMulOf 側で上がる） */
  if (ball.selfBuff && ball.selfBuff.left > 0) m *= (ball.selfBuff.spd || 1);
  if (ball.reso) m *= 1.5;   // レゾナンス発動中
  /* ★ 2026-08-16b スピードモード: 各WAVEの開始時からかかり、
     自分が SPEEDMODE_ACTS 回 行動し終えると切れる（残り回数は spdMode に持つ）。 */
  if (ball.spdMode && ball.spdMode.left > 0) m *= SPEEDMODE_MUL;
  if (ball.phantom && ball.phantom.left > 0) m *= ball.phantom.mul;   // v14 ファントムドライブ
  if (hasCumulo(ball.ch)) m *= (ball._cumuloBoost || 1); // v14 キュムロニンバス
  m *= beastMulOf(ball);   /* ★ 2026-08-07 野獣先輩（野獣の本気＋クロススキル） */
  return m;
}
/* バブリー状態（減速しにくい）: サブリンクギフト／バブリーモード／セリーヌフルバースト／メイベルFB */
function isBubbly(ball) {
  return (ball.bubbly || 0) > 0 || bubbleModeOn(ball)
    || (B.ssArmed === ball.i && (ball.ch.ssKind === "celine" || ball.ch.ssKind === "mabel"));
}
/* ★ v14 無敵（ミルフィFB）: この味方は行動を1回終えるまであらゆるダメージを受けない */
function isInvuln(ball) { return !!(ball && ball.invuln && ball.invuln.left > 0); }
/* ★ v14 ミラージュ（ミルフィ）: 編成にいると、敵の攻撃を一定確率で回避する */
function teamMirage() { return B && B.balls && B.balls.some((b) => hasAbil(b.ch, "mirage")); }
function effFriction(ball) {
  /* 減速率（1フレームごとに速度へ掛ける値）。1に近いほど長く走る。
     走る距離はおおよそ 初速 ÷ (1 - この値) に比例するので、
     小数第3〜4位のちがいがそのまま「1ショットの長さ」になる。
     ★ 2026-08-08: 全体スピードUPに合わせて減速もゆるめた
       （通常 0.982 → 0.9865 ＝ 走る距離およそ1.35倍。
        バブリー 0.9880 → 0.9905 ＝ v14.2 でしぼったぶんを一段もどした）。 */
  let f = isBubbly(ball) ? 0.9905 : 0.9865;
  /* 敵の重力バリアの中にいると減速する（アンチ重力バリア／アリシアフルバーストで無効）
     ★ v10: 減速率を強化（0.03 → 0.045）＝バリア内に居座るとかなり止まりやすい */
  if (inGravField(ball) && !antiGim(ball, "agrav")) f -= 0.045;
  /* ★ 減速壁にふれたショットは、そのターンのあいだ止まりやすい */
  if (ball._slowWall) f -= SLOWWALL_FRICTION;
  return f;
}
/* 重力バリア: そのアビリティを持つ敵の周囲フィールド */
function inGravField(ball) {
  if (!B || !B.enemies) return false;
  return B.enemies.some((e) => e.hp > 0 && e.grav && Math.hypot(e.x - ball.x, e.y - ball.y) < e.r + e.grav);
}
/* 敵が防御ダウン中か */
function enemyDefDown(e) { return e && e.defdown && e.defdown.left > 0; }

/* ロックゾーン: この円の中にいる味方はリンクスキルが無効になる（アンチロックゾーンで解除） */
function inLockZone(ball) {
  if (!B || !B.lockZones || !B.lockZones.length) return false;
  return B.lockZones.some((z) => Math.hypot(ball.x - z.x, ball.y - z.y) < z.r + ball.r);
}

/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-05 新システム「魂の紋章」と「魂気」
   ──────────────────────────────────────────────
   ・紋章は<b>属性ごとに1つ</b>（火・水・木・光・闇の5つ）。
     その属性のキャラ1体に付けられる＝チームに最大5つまで効く。
   ・1つの紋章には<b>効果を2つまで</b>刻める。効果を1つ刻むのに<b>魂気 20,000</b>。
   ・キャラに付けるだけなら無料。<b>別のキャラに付け替える</b>ときだけ<b>魂気 5,000</b>。
   ・魂気は<b>各クエストのWAVE突破報酬</b>で手に入る。
   ══════════════════════════════════════════════════════════════ */
const EMBLEM_COST = 20000;      // 効果を1つ刻むのに必要な魂気
const EMBLEM_MOVE_COST = 5000;  // 別のキャラへ付け替えるのに必要な魂気
const EMBLEM_SLOTS = 2;         // 1つの紋章に刻める効果の数
/* 刻める効果。key は保存にそのまま使うので、あとから名前を変えないこと */
const EMBLEM_FX = {
  "el:fire":  { nm: "対火の心得",   sh: "対火", ic: "🔥", c: "#ff5d47", mul: 1.25, kind: "el", el: "fire",  desc: "<b>火属性</b>の敵へのダメージが <b>×1.25</b>" },
  "el:water": { nm: "対水の心得",   sh: "対水", ic: "💧", c: "#38a6ff", mul: 1.25, kind: "el", el: "water", desc: "<b>水属性</b>の敵へのダメージが <b>×1.25</b>" },
  "el:wood":  { nm: "対木の心得",   sh: "対木", ic: "🌿", c: "#2fbf71", mul: 1.25, kind: "el", el: "wood",  desc: "<b>木属性</b>の敵へのダメージが <b>×1.25</b>" },
  "el:light": { nm: "対光の心得",   sh: "対光", ic: "✨", c: "#f0b429", mul: 1.25, kind: "el", el: "light", desc: "<b>光属性</b>の敵へのダメージが <b>×1.25</b>" },
  "el:dark":  { nm: "対闇の心得",   sh: "対闇", ic: "🌙", c: "#a86bff", mul: 1.25, kind: "el", el: "dark",  desc: "<b>闇属性</b>の敵へのダメージが <b>×1.25</b>" },
  weak:       { nm: "対弱の心得",   sh: "対弱", ic: "🎯", c: "#ffd257", mul: 1.5,  kind: "weak", desc: "<b>弱点</b>へのダメージが <b>×1.5</b>" },
  boss:       { nm: "対将の心得",   sh: "対将", ic: "👑", c: "#ff8ab5", mul: 1.25, kind: "boss", desc: "<b>ボス</b>へのダメージが <b>×1.25</b>" },
  mob:        { nm: "対兵の心得",   sh: "対兵", ic: "⚔",  c: "#baffd9", mul: 1.25, kind: "mob",  desc: "<b>ボス以外の敵</b>へのダメージが <b>×1.25</b>" },
  fbguard:    { nm: "不惑の心得",   sh: "不惑", ic: "🛡", c: "#7cc4ff", kind: "fbguard", desc: "<b>FB遅延攻撃</b>を受けなくなる" },
  heal:       { nm: "癒しの心得",   sh: "癒し", ic: "💚", c: "#8affc4", mul: 1.25, kind: "heal", desc: "<b>ヒーリングウォールなどの回復量</b>が <b>×1.25</b>" },
};
const EMBLEM_FX_KEYS = Object.keys(EMBLEM_FX);
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-05 助っ人（フレンドからキャラを1体借りる）
   ・自分の「貸し出しキャラ」は<b>属性ごとに5体</b>まで登録できる（育成タブ）。
     登録したキャラは<b>育成状況（レベル・限界突破・ルーン・紋章）ごと</b>貸し出される。
   ・XEVARION のフレンドから<b>1体だけ</b>編成に入れられる。
     借りているあいだも、<b>貸した側は自分でそのキャラを使える</b>（コピーが渡るだけ）。
   ・<b>マルチでは助っ人を使えない</b>（持ちよる体数の取り決めが崩れるため）。
   ══════════════════════════════════════════════════════════════ */
/* ★ 2026-08-06: 属性ごと 5 体 → 2 体。
   5体だと「所持しているキャラをとりあえず全部出す」だけの設定になり、
   借りる側も1属性5体×フレンド人数の長い一覧から選ぶことになっていた。
   2体に絞ると「この属性はこの2体を貸す」という選択そのものが意味を持つ。
   ★ 上限を下げたぶんは、読み込みのところ（DB.lend の正規化）で先頭から切り落とす。 */
const LEND_PER_EL = 2;      // 属性ごとに貸し出せる体数
const LEND_KEY = "xeva_mb_lend_v1";   // クラウド共有キー（xevarion-fb.js 経由）
/* 属性ごとの紋章（保存の実体）。DB の初期化のところで必ず埋める */
function emblemSlot(el) {
  DB.emblem = DB.emblem || {};
  if (!DB.emblem[el]) DB.emblem[el] = { fx: [], id: null };
  return DB.emblem[el];
}
/* そのキャラが紋章を身につけているか（属性が一致していて、付け先が本人のとき） */
function emblemOfChar(id) {
  const c = CHARS[id]; if (!c || !DB.emblem) return null;
  const s = DB.emblem[c.el];
  return (s && s.id === id && s.fx && s.fx.length) ? s : null;
}
/* ★ 2026-08-06 「紋章を付けている」を見せるための小さな部品（一覧・スロット・詳細で共用）
   ・emblemFxNames(id) … 刻んである効果の名前（「対火の心得 ／ 対将の心得」）
   ・emblemBadge(id, cls) … 写真に重ねる ❖ のバッジ（付けていなければ空文字） */
function emblemFxNames(id) {
  const s = emblemOfChar(id); if (!s) return "";
  return s.fx.map((k) => (EMBLEM_FX[k] || {}).nm || k).join(" ／ ");
}
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-15 キャラ一覧のセルに出す紋章の表記を短くする
   ------------------------------------------------------------
   これまでは emblemFxNames（＝「対火の心得 ／ 対弱の心得」）を
   そのままセルの下の帯に流し込んでいた。1セルは 100px しかないので、
   効果を2つ刻んだキャラは <b>ほぼ必ず「対火の心得 ／ 対…」で切れて</b>、
   2つめが何なのか読めなかった（text-overflow の …）。

   → 「の心得」を落とした2文字（sh）＋アイコンの<b>チップ2つ</b>にする。
     ・2つ刻んでも 100px に収まる
     ・切れないので、2つめが何かが必ず読める
   フルネームは title に入れてあるので、長押し・ホバーで確かめられる。
   ══════════════════════════════════════════════════════════════ */
function emblemFxChips(id) {
  const s = emblemOfChar(id);
  if (!s || !s.fx || !s.fx.length) return "";
  const full = emblemFxNames(id);
  return '<span class="rcemt" title="魂の紋章: ' + full + '">'
    + s.fx.map((k) => {
        const f = EMBLEM_FX[k] || {};
        return '<i class="emc">' + (f.ic || "❖") + '<b>' + (f.sh || f.nm || k) + '</b></i>';
      }).join("")
    + '</span>';
}
function emblemBadge(id, cls) {
  const nm = emblemFxNames(id); if (!nm) return "";
  return `<i class="${cls}" title="魂の紋章: ${nm}">❖</i>`;
}
/* バトル中のボールが持っている紋章の効果キー一覧 */
function ballEmblemFx(ball) {
  if (!ball || !ball.ch) return [];
  /* 助っ人（借りたキャラ）はホスト側で設定した紋章をそのまま持ってくる */
  if (ball.lentEmblem) return ball.lentEmblem;
  const s = emblemOfChar(ball.ch.id);
  return s ? s.fx : [];
}
function ballHasEmblem(ball, key) { return ballEmblemFx(ball).indexOf(key) >= 0; }
/* 紋章によるダメージ倍率（killerMul の中から呼ぶ） */
function emblemKillerMul(ball, e, tag) {
  const fx = ballEmblemFx(ball);
  if (!fx.length) return 1;
  let m = 1;
  fx.forEach((k) => {
    const f = EMBLEM_FX[k]; if (!f) return;
    if (f.kind === "el" && e.el === f.el) { m *= f.mul; if (tag) tag("紋章 " + f.nm); }
    else if (f.kind === "boss" && e.boss) { m *= f.mul; if (tag) tag("紋章 " + f.nm); }
    else if (f.kind === "mob" && !e.boss) { m *= f.mul; if (tag) tag("紋章 " + f.nm); }
  });
  return m;
}
/* 紋章による弱点倍率（ネクサスの weak と同じ場所に掛ける） */
function emblemWeakMul(ball) {
  const f = EMBLEM_FX.weak;
  return ballHasEmblem(ball, "weak") ? f.mul : 1;
}
/* 回復量の倍率（ヒーリングウォールなど）。ボールが分からないときは1倍 */
function healBonusOf(ball) {
  const f = EMBLEM_FX.heal;
  return ballHasEmblem(ball, "heal") ? f.mul : 1;
}
/* FB遅延攻撃を受けないか */
function emblemFbGuard(ball) { return ballHasEmblem(ball, "fbguard"); }

/* ══════════ キラー系アビリティ倍率（直殴り・リンク・サブリンク・フルバースト派生 共通） ══════════
   ★ 以前は hitEnemy（直殴り）の中でしか計算していなかったため、キラーを持っていても
     リンクスキルにはまったく乗っていなかった。ここに切り出して dealDamage からも参照する。
   ※ ファーストキラー／マインバースト／弱点直撃は「ボールが直接ふれた」ことが条件なので
     ここには含めず hitEnemy 側で処理する。 */
/* forLink = true のときは「直殴りの当て方に依存するキラー」を外す（v14）。
   連撃キラーM（同じ敵に連続で“ふれる”）／インフィニティブレイクM（敵に“ふれる”たび）は
   ボールが直接ぶつかった回数で伸びる殴り依存の倍率なので、リンクスキル・サブリンクには乗せない。 */
const MELEE_ONLY_KILLERS = ["combokillerM", "combokillerL", "combokillerEL", "infinitybreakM"];
function killerMul(ball, e, tags, forLink) {
  if (!ball || !ball.ch || !e || !B) return 1;
  let m = 1;
  const tag = (t) => { if (tags) tags.push(t); };
  const kEl = killerEl(ball.ch);
  if (kEl && kEl === e.el) { m *= 1.5; tag("KILLER"); }
  /* 属性キラーは等級ごとに別枠のアビリティ。上の等級だけが効く（重ねがけしない） */
  /* ★ 2026-08-16b クロスで配られた属性キラーにも効かせるため elemKillerAbil を通す */
  const kEL = elemKillerAbil(ball.ch, "killerEL"); // ★ 2026-08-16b 属性キラーEL（×3.0）
  const kL = elemKillerAbil(ball.ch, "killerL");   // ★ 2026-08-11 属性キラーL（×2.5）
  const kM = elemKillerAbil(ball.ch, "killerM");   // 属性キラーM（×2）
  if (kEL && kEL.el === e.el) { m *= KILLER_EL_MUL; tag("KILLER EL"); }
  else if (kL && kL.el === e.el) { m *= KILLER_L_MUL; tag("KILLER L"); }
  else if (kM && kM.el === e.el) { m *= 2.0; tag("KILLER M"); }
  if (hasAbil(ball.ch, "allkillerEL")) { m *= ALLKILLER_EL_MUL; tag("全属性KILLER EL"); }
  else if (hasAbil(ball.ch, "allkillerM")) { m *= ALLKILLER_M_MUL; tag("全属性KILLER M"); }
  /* ★ 2026-08-17b グレースのFB中は、アビリティとして持っていなくても全属性キラーになる */
  else if (graceKill(ball)) { m *= ALLKILLER_EL_MUL; tag("聖光・全属性KILLER"); }
  else if (hasAbil(ball.ch, "allkiller")) { m *= 1.5; tag("全属性KILLER"); }
  /* ★ 2026-08-06 冥花種キラー: 敵の<b>種族</b>を見る初めてのキラー。
     属性キラーとは別枠なので、同じ敵に両方が重なることがある（そういう設計）。
     種族は敵のスプライト（e.sp）から引く＝ raceOfSp と同じ道すじ。 */
  const eRace = raceOfSp(e.sp);
  if (eRace === NETHER_RACE) {
    if (hasAbil(ball.ch, "netherkillerEL")) { m *= NETHERKILLER_EL_MUL; tag("冥花種KILLER EL"); }
    else if (hasAbil(ball.ch, "netherkillerL")) { m *= NETHERKILLER_L_MUL; tag("冥花種KILLER L"); }
    else if (hasAbil(ball.ch, "netherkillerM")) { m *= NETHERKILLER_M_MUL; tag("冥花種KILLER M"); }
  }
  /* ★ 2026-08-07 蝕冥滅殺M: 冥花種と蝕魔族の<b>どちらにも</b>効く（幽冥の庭園まるごと担当）。
     冥花種キラーとは別のアビリティなので、両方持っていれば重なる。 */
  /* ★ 2026-08-12 蝕冥滅殺に等級ELを追加（上の等級だけが効く＝重ねがけしない） */
  if (eRace === NETHER_RACE || eRace === ECLIPSE_RACE) {
    if (hasAbil(ball.ch, "eclipseslayerEL")) { m *= ECLIPSE_SLAYER_EL_MUL; tag("蝕冥滅殺EL"); }
    else if (hasAbil(ball.ch, "eclipseslayerM")) { m *= ECLIPSE_SLAYER_M_MUL; tag("蝕冥滅殺M"); }
  }
  /* ★ 2026-08-08 蝕魔族キラー: 蝕魔族<b>だけ</b>に効く（蝕冥滅殺とは別のアビリティなので重なる）。
     ★ 2026-08-10 等級ELを追加。冥花種キラーと同じく<b>上の等級だけが効く</b>（重ねがけしない）。 */
  if (eRace === ECLIPSE_RACE) {
    if (hasAbil(ball.ch, "eclipsekillerEL")) { m *= ECLIPSEKILLER_EL_MUL; tag("蝕魔族KILLER EL"); }
    else if (hasAbil(ball.ch, "eclipsekillerM")) { m *= ECLIPSEKILLER_M_MUL; tag("蝕魔族KILLER M"); }
  }
  /* ★ 2026-08-18 蓬莱族キラーL（ロキシーのクロススキル）。
     冥花種・蝕魔族と<b>まったく同じ形</b>の種族キラー。属性キラーとは別枠なので重なる。 */
  if (eRace === HOURAI_RACE && hasAbil(ball.ch, "houraikillerL")) { m *= HOURAIKILLER_L_MUL; tag("蓬莱族KILLER L"); }
  if (hasAbil(ball.ch, "vitalEL") && e.hp >= e.maxhp * 0.5) { m *= VITALEL_MUL; tag("VITAL EL"); }
  else if (hasAbil(ball.ch, "vitalL") && e.hp >= e.maxhp * 0.5) { m *= 2.5; tag("VITAL L"); }
  else if (hasAbil(ball.ch, "vitalM") && e.hp >= e.maxhp * 0.5) { m *= 2.0; tag("VITAL M"); }
  else if (hasAbil(ball.ch, "vital") && e.hp >= e.maxhp * 0.5) { m *= 1.5; tag("VITAL"); }
  /* アタックターンキラーM: 攻撃ターンの表示が「1」＝次のターンに攻撃してくる敵に大ダメージ */
  if (hasAbil(ball.ch, "atkturnkillerM") && e.cd === 1) { m *= ATKTURN_KILLER_MUL; tag("ATK TURN KILLER M"); }
  if (hasAbil(ball.ch, "poisonkiller") && e.poison && e.poison.left > 0) { m *= 1.5; tag("毒KILLER"); }
  if (hasAbil(ball.ch, "poisonkillerEL") && e.poison && e.poison.left > 0) { m *= POISONKILLER_EL_MUL; tag("毒KILLER EL"); }
  else if (hasAbil(ball.ch, "poisonkillerM") && e.poison && e.poison.left > 0) { m *= 2.0; tag("毒KILLER M"); }
  /* ★ 2026-08-12 フェイタルキラーに等級Lを追加（上の等級だけが効く＝重ねがけしない） */
  if (hasAbil(ball.ch, "fatalkillerL") && e.hp <= e.maxhp * 0.5) { m *= FATALKILLER_L_MUL; tag("FATAL L"); }
  else if (hasAbil(ball.ch, "fatalkillerM") && e.hp <= e.maxhp * 0.5) { m *= FATALKILLERM_MUL; tag("FATAL M"); }
  else if (hasAbil(ball.ch, "fatalkiller") && e.hp <= e.maxhp * 0.5) { m *= 1.5; tag("FATAL"); }
  /* ★ 2026-08-12 底力に等級ELを追加
     ★ 2026-08-15 HPのしきい値は SOKO_HP_RATE 1本（sokojikaraState と同じ式にする） */
  if (hasAbil(ball.ch, "sokojikaraEL") && B.hp <= B.maxhp * SOKO_HP_RATE) { m *= SOKOJIKARA_EL_MUL; tag("底力EL"); }
  else if (hasAbil(ball.ch, "sokojikaraL") && B.hp <= B.maxhp * SOKO_HP_RATE) { m *= SOKOJIKARA_L_MUL; tag("底力L"); }
  else if (hasAbil(ball.ch, "sokojikaraM") && B.hp <= B.maxhp * SOKO_HP_RATE) { m *= SOKOJIKARA_M_MUL; tag("底力M"); }
  else if (hasAbil(ball.ch, "sokojikara") && B.hp <= B.maxhp * SOKO_HP_RATE) { m *= 1.5; tag("底力"); }
  /* ★ 2026-08-22b 等級Mを先に見る（無印と重ねがけしない） */
  if (hasAbil(ball.ch, "defkillerM") && enemyDefDown(e)) { m *= DEFKILLER_M_MUL; tag("防御KILLER M"); }
  else if (hasAbil(ball.ch, "defkiller") && enemyDefDown(e)) { m *= 1.5; tag("防御KILLER"); }
  /* アップポジションキラーM: 画面の上半分にいる敵に大ダメージ */
  if (hasAbil(ball.ch, "upkillerM") && e.y < H * 0.5) { m *= UPKILLER_MUL; tag("UP KILLER M"); }
  /* ★ 2026-08-08 ライトポジションキラーL: 画面の右半分にいる敵に大ダメージ */
  if (hasAbil(ball.ch, "rightkillerL") && e.x > W * 0.5) { m *= RIGHTKILLER_L_MUL; tag("RIGHT KILLER L"); }
  /* ★ 2026-08-12 アウトポジションキラー: 画面の壁ぎわにいる敵に大ダメージ（M／L） */
  if (hasAbil(ball.ch, "outkillerL") && atOuterEdge(e)) { m *= OUTKILLER_L_MUL; tag("OUT KILLER L"); }
  else if (hasAbil(ball.ch, "outkillerM") && atOuterEdge(e)) { m *= OUTKILLER_M_MUL; tag("OUT KILLER M"); }
  /* ★ 2026-08-08 プレミアム新SSR 4体ぶん */
  if (hasAbil(ball.ch, "leftkillerM") && e.x < W * 0.5) { m *= LEFTKILLER_M_MUL; tag("LEFT KILLER M"); }
  if (hasAbil(ball.ch, "bosskillerM") && e.boss) { m *= BOSSKILLER_M_MUL; tag("BOSS KILLER M"); }
  /* 状態異常底力M: 毒などを受けているあいだだけ乗る。判定は ballAiling に一本化してある
     （＝毒も「状態異常」に含める。ここに条件を書き足さないこと）。 */
  if (hasAbil(ball.ch, "ailsokojikaraM") && ballAiling(ball)) { m *= AILSOKOJIKARA_M_MUL; tag("状態異常底力M"); }
  /* ★ v16 重力バリアキラー: 重力バリアを張っている敵に大ダメージ。
     アンチ重力バリアで無効化していても「敵が持っている」ことは変わらないので、
     e.grav の有無だけで判定する（無効化しているかどうかは見ない）。 */
  /* ★ 2026-08-16b 重力バリアキラーに等級ELを追加（上の等級だけが効く＝重ねがけしない） */
  /* ★ 2026-08-18 等級L を追加。上の等級だけが効く（重ねがけしない）ので、
     EL → L → M → 無印 の順に else if でつなぐこと。 */
  if (hasAbil(ball.ch, "gravkillerEL") && e.grav) { m *= GRAVKILLER_EL_MUL; tag("重力KILLER EL"); }
  else if (hasAbil(ball.ch, "gravkillerL") && e.grav) { m *= GRAVKILLER_L_MUL; tag("重力KILLER L"); }
  else if (hasAbil(ball.ch, "gravkillerM") && e.grav) { m *= GRAVKILLER_M_MUL; tag("重力KILLER M"); }
  else if (hasAbil(ball.ch, "gravkiller") && e.grav) { m *= GRAVKILLER_MUL; tag("重力KILLER"); }
  /* カウンターキラー: 最後に攻撃してきた敵に大ダメージ */
  if (hasAbil(ball.ch, "counterkiller") && B.lastAttacker && B.lastAttacker === e.id) { m *= COUNTER_KILLER_MUL; tag("COUNTER"); }
  /* ザコキラー: ボス以外の敵に大ダメージ（等級L＝×2.5／無印＝×1.5。重ねがけはしない） */
  if (hasAbil(ball.ch, "mobkillerL") && !e.boss) { m *= MOBKILLER_L_MUL; tag("ザコKILLER L"); }
  else if (hasAbil(ball.ch, "mobkillerM") && !e.boss) { m *= MOBKILLER_M_MUL; tag("ザコKILLER M"); }
  else if (hasAbil(ball.ch, "mobkiller") && !e.boss) { m *= MOBKILLER_MUL; tag("ザコKILLER"); }
  /* 敵少底力M: 画面上の敵が少ないほど強い */
  /* ★ 2026-08-16b 敵少底力に等級ELを追加（上の等級だけが効く＝重ねがけしない） */
  if (hasAbil(ball.ch, "fewfoeEL") && aliveEnemies().length <= FEWFOE_N) { m *= FEWFOE_EL_MUL; tag("敵少底力EL"); }
  else if (hasAbil(ball.ch, "fewfoeM") && aliveEnemies().length <= FEWFOE_N) { m *= FEWFOE_MUL; tag("敵少底力M"); }
  /* ★ 2026-08-08c 敵多底力M: 「敵少底力が発動しない敵」＝敵が多いときに効く（敵少底力の裏返し） */
  if (hasAbil(ball.ch, "manyfoeEL") && aliveEnemies().length > FEWFOE_N) { m *= MANYFOE_EL_MUL; tag("敵多底力EL"); }
  else if (hasAbil(ball.ch, "manyfoeM") && aliveEnemies().length > FEWFOE_N) { m *= MANYFOE_M_MUL; tag("敵多底力M"); }
  /* 連撃キラーM／EL: 同じ敵に連続で触れるほど強くなる（別の敵に触れるとリセット）＝殴り依存 */
  const ck = comboKillerOf(ball.ch);
  if (!forLink && ck && ball.comboId === e.id && (ball.comboN || 0) > 1) {
    const cm = Math.min(ck.max, 1 + (ball.comboN - 1) * ck.step);
    m *= cm; tag(ck.nm + " ×" + cm.toFixed(2));
  }
  /* ★ ネクサススキル（リーダーのものだけ・チーム全員に効く） */
  const nx2 = nexusDef();
  if (nx2) {
    if (nx2.boss && e.boss) { m *= nx2.boss; tag("NEXUS"); }
    if (nx2.mob && !e.boss) { m *= nx2.mob; tag("NEXUS"); }
  }
  /* インフィニティブレイクM: 敵にふれるほど強くなる（毎ターンリセット）＝殴り依存 */
  if (!forLink && hasAbil(ball.ch, "infinitybreakM") && (ball.infN || 0) > 0) {
    const im = Math.min(INFBREAK_MAX, 1 + ball.infN * INFBREAK_STEP);
    m *= im; tag("∞BREAK M ×" + im.toFixed(2));
  }
  /* ★ 2026-08-05 フルバーストで一時的に手に入れたキラー（ロゼリアの「ロサ・ヴィンディクタ」）。
     アビリティのキラーと同じ扱いで掛かるので、直殴りにもリンクスキルにも乗る。
     残りターンの管理は selfBuff とまったく同じ場所（endTurn の減算）で行っている。 */
  const sk = ball.ssKiller;
  if (sk && sk.left > 0) {
    if (sk.counter && B.lastAttacker && B.lastAttacker === e.id) { m *= sk.counter; tag("COUNTER"); }
    if (sk.el && sk.el === e.el) { m *= (sk.elMul || 1.5); tag(ELEM[sk.el].nm + "KILLER"); }
  }
  /* ★ 2026-08-05 魂の紋章（属性／ボス／ザコ）。弱点ぶんは弱点判定の側で掛ける */
  m *= emblemKillerMul(ball, e, tag);
  return m;
}
/* いま処理中のダメージの持ち主（friend/subfriend/SS の演出から dealDamage を呼ぶときに使う）。
   B.effects へ push されたエフェクトには自動で src が付き、updateEffects がそれを復元する。 */
let DMG_SRC = null;
/* いま処理中のエフェクト（リンクスキルの弾など）。弱点コアの通過判定に使う（v11） */
let DMG_FX = null;
function withDmgSrc(ball, fn) {
  const prev = DMG_SRC; DMG_SRC = ball || null;
  try { return fn(); } finally { DMG_SRC = prev; }
}
/* B.effects.push をラップして、生成時点の DMG_SRC を各エフェクトに焼き付ける。
   （エフェクトの中でさらにエフェクトを生む場合も、親の src を引き継げる） */
function tagEffects(arr) {
  if (!arr || arr._tagged) return arr;
  const orig = Array.prototype.push;
  Object.defineProperty(arr, "push", {
    value: function () {
      for (let i = 0; i < arguments.length; i++) {
        const it = arguments[i];
        if (it && typeof it === "object" && it.src === undefined) it.src = DMG_SRC;
      }
      return orig.apply(this, arguments);
    },
    writable: true, configurable: true,
  });
  Object.defineProperty(arr, "_tagged", { value: true, writable: true, configurable: true });
  return arr;
}
/* 全属性耐性／属性耐性: 持っている味方が編成にいればチームの被ダメージをカット。
   srcEl を渡すと、その属性に一致する「属性耐性」持ちがいる場合もカットする。 */
/* ══════════ 被ダメージの軽減（2026-08-03 から「本人ぶんだけ」）══════════
   ★ 変更のねらい
     以前は「編成の誰かが全属性耐性を持っていれば、チームが受けるダメージが全部25%カット」
     という作りだった。1体入れるだけで全員が守られるので、耐性持ちが実質必須になり、
     どのキャラが狙われたかも意味を持たなかった。
     いまは <b>攻撃を受けたキャラクター本人の耐性だけ</b> が効く。
     チームHPが1本であること（＝総HP）は変えていない。 */
function memberCut(b, srcEl) {
  if (!b || !b.ch) return 1;
  let m = 1;
  /* ★ 2026-08-08 全属性耐性M（50%カット）。無印（30%）とは重ねず、大きいほうだけを使う。 */
  if (hasAbil(b.ch, "allresM")) m *= (1 - ALLRES_M_CUT);
  else if (hasAbil(b.ch, "allres")) m *= (1 - ALLRES_CUT);
  if (srcEl) {
    const ab = b.ch.abil || [];
    /* ★ 2026-08-07: 属性耐性の等級M（50%カット）を追加。無印と重ならないよう M を優先する */
    if (ab.some((a) => a.t === "elemresM" && a.el === srcEl)) m *= (1 - ELEMRES_M_CUT);
    else if (ab.some((a) => a.t === "elemres" && a.el === srcEl)) m *= (1 - ALLRES_CUT);
  }
  return m;
}
/* 旧API互換（チーム全体の見積もりが要る画面用）。いちばん軽減の大きい味方の値を返す。 */
function resistCut(srcEl) {
  if (!B || !B.balls || !B.balls.length) return 1;
  return Math.min.apply(null, B.balls.map((b) => memberCut(b, srcEl)));
}
/* 毒無効: pimmune 持ちが編成にいればチームは毒にならない */
function teamPimmune() { return B && B.balls && B.balls.some((b) => hasAbil(b.ch, "pimmune")); }
/* ══ ★ 2026-08-08 「状態異常」の定義を 1 か所にまとめた ══
   <b>毒（チーム毒）も状態異常に含まれる</b>。
   状態異常レジスト・状態異常底力など「状態異常」と名のつくアビリティは、
   必ずこの関数を見ること（別々に条件を書くと毒だけ漏れる）。 */
function ballAiling(b) {
  if (!B || !b) return false;
  /* 毒：チーム全体にかかるが、毒無効持ち本人には効いていない */
  if (B.teamPoison && B.teamPoison.left > 0 && !hasAbil(b.ch, "pimmune")) return true;
  return false;
}
/* ★ 2026-08-07 状態異常レジスト（野獣先輩）: 残りHPが高いあいだは状態異常そのものを受け付けない。
   毒無効（pimmune）とちがい、HPが減ると効果が切れる＝守りにも回復にも意味が出るようにしてある。 */
function ailmentResistOn(b) {
  return !!(B && b && hasAbil(b.ch, "ailmentresist") && B.hp >= B.maxhp * AILRESIST_HP);
}
function teamAilmentResist() { return B && B.balls && B.balls.some(ailmentResistOn); }

/* ══ ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）の新しい技の数値 ══
   ★ SUBFS / CHARS の説明文がこの値を読むので、<b>必ずそれより前</b>で宣言すること
     （const は巻き上がらないので、後ろに置くと読み込み時に TDZ で落ちる）。

   ── サーキュレーション（チヅルのリンクスキル）──
     円形の刃が回転しながら、じわじわ大きくなって広がっていく。
     輪の上のどこにふれてもヒットし、輪が育つほど巻きこむ敵が増える。
   ── ポジションリミット（チヅルのサブリンク）──
     いちばん近い敵1体だけを撃つかわりに、<b>距離が近いほど倍率が跳ね上がる</b>。 */
/* ★ 2026-08-16 サーキュレーションを大幅強化。
   輪が広がりきるまでに時間がかかるぶん、撃ってすぐ効く技に比べて手数が出ず、
   多段ヒットの回数のわりに合計が伸びていなかった（刃×0.30／プラズマ×0.18）。
   1ヒットの威力を刃・プラズマともに引き上げ、プラズマの当たり幅も広げて、
   「回りきったときの合計」で上位のリンクスキルと並ぶようにする。 */
/* ★ 2026-08-16b さらに引き上げ。
   0.30 → 0.52 に上げてもまだ、輪が広がりきるまでの待ち時間に見合っていなかった。
   刃・プラズマともにもう一段上げ、プラズマの当たり幅も広げて
   「輪が回りきったときの合計」で最上位のリンクスキルとはっきり並ぶようにする。 */
const CIRC_N = 14;            // 輪をつくるノード（当たり判定）の数
const CIRC_PER = 0.95;        // ノード1つが1回ヒットしたときの威力（攻撃力×0.52 → 0.95）
const CIRC_R0 = 70;           // 輪の初期の半径
const CIRC_COOL = 8;          // 同じ敵に続けて入るまでの間かく（フレーム）
/* ★ 2026-08-12d サーキュレーションに<b>プラズマをまとわせた</b>。
   刃は輪の上の CIRC_N 点だけが当たり判定なので、点と点のあいだをすり抜ける敵がいた。
   輪の線ぜんぶをプラズマで包み、<b>線のどこにふれても</b>入るようにする＝
   刃のヒットに<b>プラズマのヒットが重なって</b>、1回の発動で入る回数が大きく増える。
   ・プラズマは刃より軽いかわりに、<b>刃より短い間かく</b>で何度も入る。
   ・当たり判定は「輪の線からの距離」なので、輪が育っても線のどこでもヒットする。 */
const CIRC_PLZ_PER = 0.58;    // まとったプラズマ1ヒットの威力（攻撃力×0.32 → 0.58）
const CIRC_PLZ_COOL = 5;      // プラズマが同じ敵に入る間かく（刃の CIRC_COOL より短い）
const CIRC_PLZ_W = 32;        // プラズマの当たり幅（輪の線からこの距離まで届く。26 → 32）
/* !ボタンの見積もりに使う「1回の発動で敵1体にプラズマが入るおよその回数」。
   ・輪は広がりながら通り過ぎるので、実際は敵の位置と大きさで前後する。
   ・実測（第1の間・敵2体）では 1体あたり およそ11ヒットだった。 */
const CIRC_PLZ_N = 11;
/* ── ツムギのフルバースト（ヴェルデ・ブレイクスルー）──
   8ターンで撃てるかわりに、効くのは<b>そのターンのあいだ</b>だけ。
   チームHPを削って、削ったぶんをそのまま攻撃力に変える。 */
const TSUMUGI_ATK = 1.9;        // 自強化の攻撃倍率
const TSUMUGI_SPD = 1.30;       // 自強化のスピード倍率
const TSUMUGI_HP_COST = 0.25;   // 撃つときに燃やすチームHPの割合（残りHPに対して）
const TSUMUGI_BURN_MAX = 2.0;   // 燃やして得られる追加倍率の上限（HP満タンで撃つと最大）
/* ── チヅルのフルバースト（宵闇廻遊・ミッドナイトチェイス）── */
const CHIZURU_ATK = 1.95;       // 自強化の攻撃倍率
const CHIZURU_SPD = 1.35;       // 自強化のスピード倍率
const CHIZURU_SHARKS = 7;       // 停止後に引き連れる鮫の数
const CHIZURU_RUN2_MUL = 3.2;   // 再走中の体当たり倍率
const CHIZURU_SHARK_PER = 1.10; // 鮫1体が敵に食いついたときの威力（攻撃力×）
const CHIZURU_DEFDOWN = 4;      // ふれた敵の防御力ダウンが続くターン数
const POSLIMIT_MAX = 12.0;    // 密着で撃ったときの倍率（ゲーム最高レベル）
const POSLIMIT_MIN = 1.2;     // 遠くで撃ったときの倍率
const POSLIMIT_NEAR = 90;     // ここまで近ければ最大倍率（px）
const POSLIMIT_FAR = 700;     // ここより遠いと最小倍率（px）
/* 距離から倍率を出す。★ 実ダメージも !ボタンの見積りも必ずこの関数を通すこと。 */
function positionLimitMul(dist) {
  const d = Math.max(0, Number(dist) || 0);
  if (d <= POSLIMIT_NEAR) return POSLIMIT_MAX;
  if (d >= POSLIMIT_FAR) return POSLIMIT_MIN;
  const q = (d - POSLIMIT_NEAR) / (POSLIMIT_FAR - POSLIMIT_NEAR);
  /* 近いほど急に伸びるよう、まっすぐではなく2乗でつなぐ */
  return POSLIMIT_MIN + (POSLIMIT_MAX - POSLIMIT_MIN) * (1 - q) * (1 - q);
}

/* ══════════ サブリンクスキル ══════════ */
const BOUND_SHOTS = 4;   // バウンドヒール／バウンドチャージの弾数（v7.5: 1 → 4）
/* ★ v14.1: アブソリュートレイ10を「回転スイープ型」に作り直した。
   旧: 画面上のすべての敵へ必中の10連レイ（位置取りが関係なかった）
   新: <b>放った本人を中心に、10本のレイがそれぞれランダムな長さで伸び、1回転ぶん薙ぎ払う</b>。
       レイは貫通なので、通り道にいる敵は全員（レイ1本につき1回）斬られる。
       近くにいる敵ほど多くのレイが届く＝<b>どこで撃つかが火力に直結する</b>。 */
const ABSRAY_N = 10;          // レイの本数
const ABSRAY_MUL = 0.82;      // レイ1本が1回ヒットしたときの威力（攻撃力×）※v14.5 で 1.05 → 0.82（強すぎたので調整）
const ABSRAY_MIN = 74;        // レイの長さの下限（本人からの距離）※v14.5 で 92 → 74
const ABSRAY_MAX = 300;       // レイの長さの上限 ※v14.5 で 380 → 300（当たる範囲を少しせまく）
const ABSRAY_TURN = 54;       // 1回転にかけるフレーム数（薙ぎ払いが目で追える速さ）
const ABSRAY_W = 14;          // レイの当たり判定の太さ（半分）※v14.5 で 18 → 14
/* ══ ★ 2026-08-13 オートエイムビット（アーク）の弱体化 ══
   ビット4個が「味方が止まるまで」ずっと自動連射する技なので、
   1発の威力よりも<b>連射のはやさ</b>のほうが総ダメージに効く。
   そこで威力と発射間隔の<b>両方</b>を下げた（合計でおよそ半分）。
     威力   ×0.30 → ×0.22 → ×0.17 → <b>×0.13</b>
     発射間隔  9F → <b>13F</b>（1個あたり毎秒 約6.7発 → 約4.6発）
   ★ ここは実装（index.html の case "autoaimbit"）・FS_HIT（!ボタンの威力計算）・
     キャラの説明文（fsPow）の<b>3か所</b>から参照する。
     数字を直接書くと必ず食いちがうので、必ずこの定数を使うこと。 */
const AIMBIT_N = 4;           // ビットの数
const AIMBIT_PER = 0.13;      // 弾1発が当たったときの威力（攻撃力×）
const AIMBIT_CD = 13;         // 発射の間隔（フレーム）。大きいほど遅い
/* 説明文（3体ぶんの fsPow で使い回す。フレームは伝わらないので秒に直して見せる） */
const AIMBIT_POW = "ビット" + AIMBIT_N + "個 1ヒット 攻撃力×" + AIMBIT_PER
  + "（味方が止まるまで、約" + (Math.round(AIMBIT_CD / 60 * 100) / 100) + "秒ごとに自動連射）";
/* ★ v14.2 「味方全員を率いて撃ちこむ」FBの突撃中の直殴り補正
   （NEWS の本文でも参照するので、ステージ・お知らせより前で定義しておく） */
const RALLY_MUL = 1.5;
/* ★ v14.3 ガチャの昇格演出（SR → RANK UP!! → SSR）の発動率。
   SSRでも毎回見せると演出がくどくなるので、ふだんは最初からSSRの星で出し、
   この確率のときだけ昇格演出にする（＝稀に起こるサプライズ）。
   ※ NEWS の本文でも参照するので、お知らせより前で定義しておくこと。 */
const RANKUP_CHANCE = 0.30;
/* ══════════ ★ 2026-08-05 プレミアム新SSR「ロゼリア」「シズカ」のリンクスキル ══════════
   どちらも<b>既存のリンクスキルの強化版</b>なので、元の技の数値をここに並べて置き、
   「どこがどれだけ強くなったのか」を一目で追えるようにしておく。
   （元の数値は LUMINOUS＝×0.95・砲台4基 ／ energycircle＝×1.25）*/
/* ★ 2026-08-06 超強ルミナスレイを大幅強化。
   「上位技」と名乗るわりに、元のルミナスレイ（×0.95・4基）に対して ×1.45・6基しかなく、
   同じ枠の超強ハイエナジーサークル（全体×2.10・2連発）に比べて明らかに見劣りしていた。
   威力・砲台数・レーザーの太さの3つをまとめて引き上げ、
   <b>止まった瞬間に盤面を光の網で塗りつぶす</b>技として立たせる。 */
/* ★ 2026-08-16 さらに引き上げ。
   砲台は8基あってもレーザーの射線に敵がいなければ当たらないので、
   実戦では超強ハイエナジーサークル（全体×2.10 の2連発＝どの敵にも必ず4.20）に
   まだ届いていなかった。1本あたりの威力と太さを上げて「射線に入れば最上位」にそろえる。 */
const SLUMI_MUL = 4.60;       // 超強ルミナスレイ: 砲台1基のレーザー威力（ルミナスレイ ×0.95 → ×4.60）
const SLUMI_N = 8;            // 砲台の最大数（4基 → 8基）
const SLUMI_HALF = 118;       // レーザーの当たり判定の太さ（半分）。ルミナスレイは BEAM_HALF=46
const SENERGY_MUL = 2.10;     // 超強ハイエナジーサークル: 画面上の全敵へのダメージ（×1.25 → ×2.10）
const SENERGY_WAVES = 2;      // 輪の数。時間差で2連発する（元は1発）
/* ══════════ ★ 2026-08-06 プレミアム新SSR「ソレア」のリンクスキル ══════════
   全敵ロックオンレーザー: 画面上の<b>すべての敵を1体ずつロックオン</b>し、
   それぞれへ<b>特大レーザー</b>を撃ちこむ（レーザーは貫通なので射線上の敵にも当たる）。
   ・全体攻撃としては最上位クラス（超強ハイエナジーサークル＝×2.10 と同じ土俵）だが、
     こちらは<b>1体ずつ狙って撃つ</b>ので、射線が重なった敵には複数本ぶん入る。 */
const ALLLASER_MUL = 2.20;    // レーザー1本の威力（敵1体につき1本）
const ALLLASER_W = 54;        // レーザーの見た目の太さ（当たり判定はこの半分）
/* ★ アーク強化: プレイヤーLvが1上がるごとにもらえるポイント数。
   ★ NEWS の本文から参照するので、必ずお知らせより前で定義しておくこと
     （ここより後ろで const 宣言すると、お知らせの組み立て時に TDZ で落ちる）。 */
const ARC_PT_PER_LV = 2;
/* ══ ★ 2026-08-08 プレイヤーEXP（→ レベル → アークのポイント）を難易度に比例させる ══
   以前は max(20, クエストEXP ÷ 8) だった。
   これだと
     ・下限の 20 が効いて<b>いちばんやさしい部屋を周回するのがいちばん早い</b>
     ・単純な割り算なので、高難易度を抱える意味が薄い
   という問題があった。
   いまは<b>クエストEXP（＝そのクエストの難易度そのもの）のべき乗</b>で決める。
   PLV_POW が 1 より大きいので、難しいクエストほど<b>比例よりさらに多く</b>もらえる。
     王城 第1の間  （EXP   125）… 約   8（旧 20）
     王城 第15の間 （EXP   755）… 約  77（旧 94）
     席園 第1ノ園  （EXP 2,000）… 約 261（旧 250）
     王城 EX15    （EXP 5,900）… 約1008（旧 738）
   ★ NEWS の本文から参照するので、必ずお知らせより前で定義すること。 */
const PLV_REF_EXP = 1700;   // 基準にするクエストEXP（黄昏の王城 EX1 あたり）
const PLV_REF_GAIN = 213;   // そのときもらえるプレイヤーEXP
const PLV_POW = 1.25;       // 1 なら単純比例。大きいほど高難易度が優遇される
/* そのクエストをクリアしたときにもらえるプレイヤーEXP */
function playerExpForStage(st) {
  const e = Math.max(1, (st && st.exp) || 200);
  return Math.max(1, Math.round(PLV_REF_GAIN * Math.pow(e / PLV_REF_EXP, PLV_POW)));
}
const SUBFS = {
  plasma: { nm: "プラズマ", pow: "初撃 攻撃力×0.8 ＋ 電撃リンク中 1ヒット 攻撃力×0.34", desc: "自分と触れた味方の間に強力なプラズマを走らせて攻撃（味方が止まるまで持続）" },
  accel: { nm: "加速", pow: "弾速 ×1.4（ダメージなし）", desc: "触れた味方（動いているキャラ）を加速させる" },
  blast: { nm: "爆発", pow: "爆発 攻撃力×" + BLAST_MUL + " ＋ 他の味方のリンクスキルを威力75%で誘発", desc: "自分を中心に<b>強烈な爆発</b>を起こし、まわりの敵をまとめて吹き飛ばす。さらに<b>他の味方全員のリンクスキルを誘発</b>する（範囲はせまいぶん威力が高い）" },
  phoming: { nm: "ピアスシーカー12", pow: "12発 × 攻撃力×" + PHOMING_PER + "（貫通・1体につき1ヒット）", desc: "敵を追尾しながら貫通していく光弾を12発放つ" },
  /* ★ 2026-08-12 セイラのサブリンク。1発の威力は12発版と<b>同じ</b>（PSEEKER_PER）。
     ちがうのは発数だけ（12 → 20）＝「同じ名前の技は同じ効果」の原則を守っている。 */
  phoming20: { nm: "ピアスシーカー" + PSEEKER20_N, pow: PSEEKER20_N + "発 × 攻撃力×" + PHOMING_PER + "（貫通・1体につき1ヒット）",
    desc: "敵を追尾しながら貫通していく光弾を" + PSEEKER20_N + "発放つ（ピアスシーカー12の発数を増やした上位版）" },
  /* ★ 2026-08-16b リフレクションリング（エレナのサブリンク）。
     リンクスキル版とまったく同じ技をサブリンクからも撃てるようにしたもの＝
     名前が同じなので威力も挙動もそろえる（REFRING_PER を共有）。 */
  reflectring: { nm: "リフレクションリング", pow: "リング1発 攻撃力×" + REFRING_PER + "（最大" + REFRING_MAX + "発・壁で1回だけ反射）",
    desc: "ふれた味方から<b>属性のリング弾</b>を放ち、<b>1回だけ壁で反射</b>して広範囲の敵を攻撃する" },
  field: { nm: "パワーフィールド", pow: "フィールド内の敵に 1ヒット 攻撃力×0.30（連続ヒット）", desc: "自分のまわりに力場を張り、フィールドに入った敵を連続で削り続ける" },
  poison: { nm: "全敵ポイズンレイン", pow: "隕石 攻撃力×0.45 ＋ 毒（3ターン・毎ターン最大HPの4%）", desc: "画面上のすべての敵に毒の隕石を落とし、毒状態にする" },
  bubbly: { nm: "バブリーギフト", pow: "減速しにくい状態を付与（ダメージなし）", desc: "触れた味方を減速しにくい「バブリー状態」にして、長く動き回れるようにする" },
  boundheal: { nm: "バウンドヒール", pow: "回復弾4発 各 チームHP6%回復（壁でバウンド）", desc: "壁でランダムに跳ね返る回復弾を4つ放ち、拾うとチームHPを回復する" },
  weaklock: { nm: "弱点ロックオン衝撃波4", pow: "衝撃波 攻撃力×0.6 ×4（弱点持ちを狙う）", desc: "弱点を持つ敵をロックオンして4連の衝撃波を撃ち込む" },
  hitouchray: { nm: "ハイアタッチレイ", pow: "触れた敵へ 閃光レイ 攻撃力×0.9", desc: "ふれた敵に向けて強烈な閃光レイを一撃撃ち込む" },
  pspread5: { nm: "貫通拡散弾5", pow: "5発 × 攻撃力×0.5（貫通・敵を突き抜ける）", desc: "全方位に5発の貫通弾をばらまき、並んだ敵をまとめて撃ち抜く" },
  /* ★ 2026-08-08 チトセのサブリンク。貫通拡散弾5の「数」ではなく「密度と手数」を極めた版 */
  pspread3: { nm: "貫通拡散弾3",
    pow: PSPREAD3_DIRS + "方向 × " + PSPREAD3_VOLLEY + "発 × 攻撃力×" + PSPREAD3_PER + "（特大の貫通弾・時間差で乱れ撃ち）",
    desc: "<b>" + PSPREAD3_DIRS + "方向へ、強烈な特大の貫通弾を" + PSPREAD3_VOLLEY + "発ずつ乱れ撃つ</b>。"
      + "1回きりではなく<b>少しずつ角度をずらしながら" + PSPREAD3_VOLLEY + "回に分けて</b>放たれるので、"
      + "動いている敵にも当たりやすい。弾は<b>当たり判定が特大</b>で、敵を貫通して画面外まで走り抜ける" },
  hiplasma: { nm: "ハイプラズマ", pow: "プラズマ 1ヒット 攻撃力×0.4（味方が止まるまで持続）", desc: "自分と触れた味方の間に画面端まで伸びる巨大なプラズマを走らせ、味方が止まるまで攻撃し続ける" },
  divinepillar: { nm: "ディバインピラー", pow: "光の柱 攻撃力×0.8 ×3本（ランダムな敵）", desc: "ランダムな敵3体の頭上から光の柱を落として攻撃する" },
  boundcharge: { nm: "バウンドチャージ", pow: "FB短縮弾4発（壁でバウンド・ふれた味方のFBターン-1）", desc: "壁でランダムに跳ね返るチャージ弾を4つ放ち、ふれた味方のFBターンを1ずつ短縮する" },
  roundcharge: { nm: "ラウンドチャージ", pow: "触れた味方の移動に応じて広がる円（ダメージなし・最大 半径" + ROUND_RMAX + "）",
    desc: "触れた味方の移動に応じて範囲が広がる円を張り、その味方が止まると<b>円の内部にいる味方</b>のフルバーストターンを1短縮する"
      + "<br>★ 2026-08-18 <b>円を大きくした</b>（初期 半径" + ROUND_R0 + "／広がる速さ" + ROUND_GROW + "／上限 半径" + ROUND_RMAX + "）。"
      + "少ししか動かずに止まっても届き、長く走れば<b>編成の大半</b>を巻きこめる" },
  /* ★ 2026-08-16b ラウンドヒール（スズハのサブリンク）＝ラウンドチャージの回復版。
     円の広がりかたも重ねがけの仕組みもラウンドチャージとまったく同じで、
     止まったときに配るものが「FBターン短縮」ではなく「チームHPの回復」になる。 */
  roundheal: { nm: "ラウンドヒール", pow: "触れた味方の移動に応じて広がる円（ダメージなし・最大 半径" + ROUND_RMAX + "）／円内の味方1体につきチームHPを" + Math.round(ROUNDHEAL_RATE * 100) + "%回復",
    desc: "触れた味方の移動に応じて範囲が広がる円を張り、その味方が止まると<b>円の内部にいる味方1体につきチームHPを" + Math.round(ROUNDHEAL_RATE * 100) + "%回復</b>する（ラウンドチャージの回復版）"
      + "<br>★ 2026-08-18 <b>円を大きくした</b>（初期 半径" + ROUND_R0 + "／広がる速さ" + ROUND_GROW + "／上限 半径" + ROUND_RMAX + "）。"
      + "ラウンドチャージと<b>まったく同じ大きさ</b>で広がる" },
  /* ★ 2026-08-08b 「FB短縮弾」（サブリンク版・キー fbshorten）は廃止した。
     中身は boundcharge とまったく同じ（fireSubFriend の先頭で読み替えていた）のに
     名前が<b>別物であるリンクスキルの「FB短縮弾」</b>とかぶっていたため。
     持っていたキャラは boundcharge（バウンドチャージ）に付け替えてある。 */
  splitpierce: { nm: "全敵貫通分裂弾", pow: "5発 × 攻撃力×0.5（貫通・敵を突き抜ける）", desc: "全方位に分裂する貫通弾をばらまき、並んだ敵をまとめて撃ち抜く" },
  plasmanet: { nm: "プラズマネット", pow: "網1本 1ヒット 攻撃力×0.30（味方4体を結ぶ）", desc: "味方どうしをプラズマでつないで網を張り、網にかかった敵を連続で攻撃する" },
  plasmanova: { nm: "プラズマノヴァ", pow: "自分を中心に連続爆発 攻撃力×" + BLAST_MUL + "＋リンク誘発", desc: "自分を中心に何度も爆発を起こして攻撃し、他の味方のリンクスキルも誘発する" },
  defdownblast: { nm: "防御ダウンブラスト", pow: "爆発 攻撃力×" + BLAST_MUL + " ＋ 巻き込んだ敵を防御ダウン（3ターン）", desc: "爆発でまわりの敵を攻撃し、巻き込んだ敵すべての防御力を3ターンのあいだダウンさせる" },
  discharge: { nm: "放電", pow: "1体目 攻撃力×0.55 → 伝うたび +40%（最大6体・×3.0）", desc: "強力な電撃を放ち、敵から敵へ伝わせる。<b>伝うたびに威力が上がっていく</b>連鎖型の攻撃" },
  nebula: { nm: "ネビュラスフィア", pow: "エネルギー球 1ヒット 攻撃力×0.42（敵に当たるたび分裂・最大7個）", desc: "巨大なエネルギー球を発射し、<b>敵に当たるたびに貫通しながら分裂</b>（最大7分裂）。ふれた味方が止まるまで攻撃し続ける" },
  /* ★ v14.1: アブソリュートレイ10は「本人を中心に10本のレイが1回転する薙ぎ払い」。
     フェス5体の共通サブリンクであり、サクラのリンクスキル本体でもある。 */
  absoluteray: { nm: "アブソリュートレイ10", pow: "レイ10本 × 攻撃力×" + ABSRAY_MUL + "（貫通・レイ1本につき1ヒット／長さはランダム " + ABSRAY_MIN + "〜" + ABSRAY_MAX + "）",
    desc: "放った本人を中心に、<b>長さのちがう10本の極大レイ</b>が伸び、<b>1回転ぶん薙ぎ払う</b>。レイは<b>貫通</b>なので通り道の敵をまとめて斬り裂く。<b>本人の近くにいる敵ほど多くのレイが届く</b>ため、どこで撃つかがそのまま火力になる" },
  /* ★ v14.5 クロエのサブリンク */
  /* ★ v16 プレミアム新SSR 6体のサブリンク */
  alllock3: { nm: "全敵貫通ロックオン衝撃波3", pow: "衝撃波 攻撃力×0.55 ×3（画面上の<b>すべての敵</b>を個別にロックオン・貫通）",
    desc: "画面上の<b>すべての敵をひとりずつロックオン</b>し、それぞれに<b>3連の貫通衝撃波</b>を叩き込む。敵が多いほど総ダメージが伸びる殲滅型のサブリンク" },
  fbburst4: { nm: "乱FB短縮弾", pow: "FB短縮弾" + FBBURST_N + "発（四方へ直進・敵も味方も貫通・画面外へ／ふれた味方のFBターン-1）",
    desc: "<b>自分を中心に" + FBBURST_N + "発のチャージ弾を四方へ撃ち出す</b>。"
      + "弾は<b>壁で跳ね返らず、まっすぐ飛んで画面外へ抜けていく</b>。"
      + "<b>敵も味方も貫通</b>するので途中で止まることがなく、<b>通り道にいた味方全員のフルバーストターンを1ずつ短縮</b>する。"
      + "どの向きに撃つかで効きが決まるので、<b>味方を線の上に並べておく</b>のがコツ" },
  /* ★ 2026-08-10 カホのサブリンク。リンクスキル版（アビス）と<b>まったく同じ効果</b>にそろえる
     （同じ名前の技で威力が変わらないようにする）。 */
  wallcircuit: { nm: "ウォールサーキットリング", pow: "リング7基 1ヒット 攻撃力×0.36（味方が止まるまで壁沿いを旋回）",
    desc: "<b>7つのリングが壁沿いをぐるりと旋回</b>し、ふれた味方が止まるまで通り道の敵を削り続ける。盤面の外周に敵が並ぶクエストでとくに強い" },
  lock8: { nm: "貫通ロックオン衝撃波8", pow: "衝撃波 攻撃力×0.60 ×8（敵をロックオン・貫通）",
    desc: "敵をロックオンして<b>8連の貫通衝撃波</b>を撃ち込む。標的が倒れたら次の敵へ自動で切り替わるので、8発が無駄にならない" },
  /* ★ 2026-08-05 ネムのサブリンク */
  linkspeedup: { nm: "リンスピアップ", pow: "ふれた味方の<b>リンクスキル威力 ×" + LINKUP_MUL + "</b>＋<b>弾速 ×1.4</b>（ダメージなし）",
    desc: "ふれた味方の<b>リンクスキルの威力</b>と<b>スピード</b>を同時に引き上げる。"
      + "強力なリンクを持つ味方にぶつけてから走らせれば、<b>そのショットで起こすリンクがまるごと" + LINKUP_MUL + "倍</b>になる。"
      + "加速の効果は<b>「加速」サブリンクとまったく同じ</b>。重ねがけは<b>×" + LINKUP_MAX + "</b>まで" },
  poisoncurrent: { nm: "ポイズンカレント", pow: "海流 1ヒット 攻撃力×0.38 ＋ 渦潮 攻撃力×0.9 ＋ 毒（3ターン・毎ターン最大HPの4%）",
    desc: "<b>毒の海流</b>が押し寄せて敵を飲みこみ、巻きこんだ場所に<b>渦潮</b>を発生させて追い打ちする。海流と渦潮にふれた敵は<b>毒状態</b>になり、毎ターン継続ダメージを受け続ける" },
  /* ★ 2026-08-08 プレミアム新SSR 4体（カエデ・リノン・ココロ・アンジェ）のサブリンク */
  atkspdup: { nm: "攻スピアップ", pow: "ふれた味方の<b>攻撃力 ×" + ATKSPD_ATK + "</b>＋<b>弾速 ×" + ATKSPD_SPD + "</b>（ダメージなし）",
    desc: "ふれた味方の<b>攻撃力とスピードを同時に上げる</b>。効くのは<b>そのターンのあいだ</b>だけなので、"
      + "直殴りで押し切る味方を、先になぞってから走らせるのが基本。加速の効果は<b>「加速」サブリンクと同じ</b>" },
  /* ══ ★ 2026-08-12 ポジションリミット（チヅルのサブリンク）══
     いちばん近い敵1体だけを撃つかわりに、<b>距離が近いほど倍率が跳ね上がる</b>。
     密着で撃てばゲーム内でも最上位の一撃になるが、離れていると並のサブリンク以下。
     ★ 倍率の計算は positionLimitMul() ひとつだけ。ここ以外に書かないこと。 */
  positionlimit: { nm: "ポジションリミット",
    pow: "最も近い敵1体へ 攻撃力×" + POSLIMIT_MIN + "〜<b>×" + POSLIMIT_MAX + "</b>（近いほど強い・密着で最大）",
    desc: "<b>このキャラからいちばん近い敵</b>へ、距離ぶんの力を凝縮した一撃を撃ちこむ。"
      + "<b>敵との距離が近ければ近いほど威力が上がり</b>、"
      + "密着（" + POSLIMIT_NEAR + "px 以内）で撃てば<b>攻撃力×" + POSLIMIT_MAX + "</b>という"
      + "<b>ゲーム最高レベルの超高火力</b>になる。"
      + "逆に " + POSLIMIT_FAR + "px より遠いと<b>×" + POSLIMIT_MIN + "</b>まで落ちるので、"
      + "<b>敵の真横まで踏みこんでから当てにいく</b>のがこの技のすべて" },
  crossclone: { nm: "クロス分身弾", pow: "分身" + CC_CLONES + "体 1ヒット 攻撃力×" + CC_PER + "（壁で反射・貫通・止まるまで）",
    desc: "ふれた瞬間に<b>" + CC_CLONES + "体の分身</b>を放出。分身は<b>壁で反射しながらフィールドを動きまわり、"
      + "敵を貫通して削り続ける</b>（止まるまで）" },
  /* ══ ★★ 2026-08-22 Starlight Academy Fest の共通サブリンク ══
     フェス5体（オトハ・サヤカ・サユリ・アカリ・ヒナタ）が全員そろって持つ目印。
     ノクターンブルームフェスの「アブソリュートレイ10」と同じ位置づけ。 */
  starveil: { nm: "スターライト・ヴェール",
    pow: "レイ" + STARVEIL_N + "本 × " + STARVEIL_SPINS + "回転 × 攻撃力×" + STARVEIL_MUL
      + "（貫通・<b>1回転ごとに当たり直す</b>）",
    desc: "放った本人を中心に<b>五芒星の光の帯</b>が開き、頂点から伸びた<b>" + STARVEIL_N
      + "本の極大レイ</b>が<b>" + STARVEIL_SPINS + "回転ぶん薙ぎ払う</b>。"
      + "<br>アブソリュートレイ10と違って本数は少ないが、<b>1本が太く・長く・威力も上</b>で、"
      + "しかも<b>1回転するたびに当たり判定がよみがえる</b>——"
      + "同じ敵に<b>最大 " + (STARVEIL_N * STARVEIL_SPINS) + "回</b>まで入るので、"
      + "<b>敵のかたまりの中心で撃つほど</b>総ダメージが伸びる" },
  /* ══ ★★ 2026-08-25 Starlight Academy Fest 2 の共通サブリンク ══
     フェス5体（スズネ・ミナモ・カレン・トモエ・ヒマリ）が全員そろって持つ目印。
     スターライト・ヴェール（fes5）と同じ位置づけ。 */
  auroracurtain: { nm: "オーロラ・カーテン",
    pow: "極光の帯 " + (AURORA_N * 2) + "枚（上下へ " + AURORA_N + "枚ずつ）× 往復 × 攻撃力×" + AURORA_MUL
      + "（貫通・<b>1枚ごとに当たり直す</b>）",
    desc: "放った本人を中心に<b>極光の帯が上と下へ" + AURORA_N + "枚ずつ</b>広がっていき、"
      + "盤面を縦に渡っていく。帯は<b>画面のはしで折り返してもう一度</b>戻ってくる。"
      + "<br>スターライト・ヴェールが「<b>敵のかたまりの中心で撃つほど強い</b>」のに対して、"
      + "こちらは<b>盤面のどこに敵がいても必ず同じだけ入る</b>のが違い。"
      + "散らばった敵にも、隠れている敵にも、同じだけ通る" },
  /* ══ ★★ 2026-08-26 GRAND DEBUT Ver.3.0 の共通サブリンク ══
     5体（カリン・ミレイ・ユウカ・ミヤビ・スミレ）が全員そろって持つ目印。
     スターライト・ヴェール（fes5）／オーロラ・カーテン（fes6）と同じ位置づけ。 */
  afterglowtrail: { nm: "アフターグロウ・トレイル",
    pow: "残った光の帯 1ヒット 攻撃力×" + TRAIL_PER + "（同じ敵にも " + TRAIL_CD + "フレームおきに何度でも／帯は "
      + TRAIL_LIFE + "フレームで消える）",
    desc: "ふれた瞬間から、その味方が<b>通った道すじ</b>が光の帯になって盤面に残る。"
      + "帯は後ろから順に消えていき、消えるまでのあいだ<b>ふれた敵をくり返し削る</b>。"
      + "<br>いちばんのちがいは<b>「動いた跡」そのものが武器になる</b>こと——"
      + "スピードが高い味方、壁で何度も跳ねる味方ほど帯が長くなり、そのぶん強い。"
      + "<br>置きっぱなしなので、<b>撃ったあとに敵が寄ってきても当たる</b>。"
      + "敵の通り道をふさぐように走らせるのがいちばん伸びる" },
  /* ══ ★★ 2026-08-26b GRAND DEBUT Ver.4.0 の共通サブリンク ══
     5体（セイナ・シヅキ・サユキ・サラ・サクヤ）が全員そろって持つ目印。 */
  bloomingecho: { nm: "ブルーミング・エコー",
    pow: "跳ね返るたびに花が咲く（最大" + BLOOM_N + "回・半径 " + BLOOM_R + "）／1つめ 攻撃力×" + BLOOM_PER
      + " → <b>1回ごとに +" + BLOOM_STEP + "</b>（すべて咲くと合計 攻撃力×"
      + (BLOOM_N * BLOOM_PER + BLOOM_STEP * (BLOOM_N * (BLOOM_N - 1) / 2)).toFixed(2) + "）",
    desc: "ふれた味方が<b>跳ね返るたび</b>、その場所に花が咲いて<b>まわりの敵をまとめて削る</b>。"
      + "<br>いちばんのちがいは<b>「何回跳ねたか」で発動する回数が決まる</b>こと。"
      + "壁でも敵でも、向きが変わればそのたびに1つ咲く。"
      + "<br>しかも<b>あとから咲く花ほど強い</b>（1回ごとに +" + BLOOM_STEP + "）ので、"
      + "長く走れる味方・よく跳ねる味方にふれさせるほど伸びる。"
      + "<br>反射の味方は敵に当たっても跳ねるので<b>とくに咲きやすい</b>——"
      + "撃ちかたそのものが威力になるサブリンク" },
  /* ══ ★★ 2026-08-26 MagiLex の交換キャラ5体の共通サブリンク ══ */
  knowledgeresonance: { nm: "ノウレッジ・レゾナンス",
    pow: "知識の環 " + KNOW_RINGS + "重（内から 攻撃力×" + KNOW_PER + " → +" + KNOW_STEP
      + " ずつ／合計 攻撃力×"
      + (KNOW_RINGS * KNOW_PER + KNOW_STEP * (KNOW_RINGS * (KNOW_RINGS - 1) / 2)).toFixed(2)
      + "）＋ その味方のフルバーストターン −" + KNOW_FBCUT,
    desc: "ふれた味方を中心に、知識の環が<b>" + KNOW_RINGS + "重・時間差</b>でひらいていく。"
      + "<br>いちばんのちがいは<b>外側の環ほど強い</b>こと（1重進むごとに +" + KNOW_STEP + "）。"
      + "近くの敵より<b>遠くの敵のほうが重い</b>ので、囲まれているより"
      + "「まわりに散らばっている」盤面のほうが伸びる。"
      + "<br>ひらききると、ふれた味方の<b>フルバーストが" + KNOW_FBCUT + "ターン近づく</b>" },
  supercrossclone: { nm: "超強クロス分身弾", pow: "分身" + SCC_CLONES + "体 1ヒット 攻撃力×" + SCC_PER + "（壁で反射・貫通・止まるまで）",
    desc: "クロス分身弾の<b>強化版</b>。分身が<b>" + CC_CLONES + "体 → " + SCC_CLONES + "体</b>に増え、"
      + "<b>1ヒットの威力（×" + CC_PER + " → ×" + SCC_PER + "）も、走る速さも、動きまわる時間も上</b>。"
      + "分身ひとつひとつが大きくなり、当たり直しの間隔も短いので<b>盤面まるごとを削り取る</b>" },
  /* ★ 2026-08-07 野獣先輩のサブリンク */
  beastimpact: { nm: "野獣インパクト",
    pow: "ふれた味方の<b>弾速 ×1.4</b>＋<b>攻撃力 ×" + BEASTIMPACT_MUL + "</b>＋<b>リンクスキル威力 ×" + BEASTIMPACT_LINK + "</b>（ダメージなし）",
    desc: "ふれた味方に野獣の闘気を叩き込み、<b>加速</b>・<b>そのショットの攻撃力</b>・<b>リンクスキルの威力</b>を"
      + "いっぺんに引き上げる。加速の効果は<b>「加速」サブリンクとまったく同じ</b>。"
      + "重ねがけの上限は<b>攻撃力 ×" + BEASTIMPACT_MAX + " ／ リンク威力 ×" + BEASTIMPACT_LINKMAX + "</b>" },
};

/* ══════════ ネクサススキル（v13.1） ══════════
   ★ 編成のいちばん左＝<b>リーダーポジション</b>に置いたキャラ「1体だけ」が発動する。
     効果はチーム全員に届く（発動するのはリーダーのネクサスだけ）。
   ★ 実装したばかりなので、どれも「ちょっと得をする」程度の控えめな性能にしてある。 */
const NEXUS = {
  vigor:     { nm: "ヴィガー・ネクサス",     c: "#2fbf71", desc: "チームの最大HPが<b>5%</b>アップする", hp: 1.05 },
  force:     { nm: "フォース・ネクサス",     c: "#ff5d47", desc: "味方全員の攻撃力が<b>5%</b>アップする", atk: 1.05 },
  gale:      { nm: "ゲイル・ネクサス",       c: "#38a6ff", desc: "味方全員のスピードが<b>6%</b>アップする", spd: 1.06 },
  ignition:  { nm: "イグニッション・ネクサス", c: "#c9a6ff", desc: "バトル開始時、味方全員のフルバーストターンを<b>1</b>短縮する", fb: 1 },
  mercy:     { nm: "マーシー・ネクサス",     c: "#7dffb0", desc: "各WAVEの開始時、チームHPを<b>3%</b>回復する", waveHeal: 0.03 },
  aegis:     { nm: "イージス・ネクサス",     c: "#7ce8ff", desc: "バトル開始時、味方全員に<b>400</b>のバリアを張る", barrier: 400 },
  guard:     { nm: "ガード・ネクサス",       c: "#88a6d8", desc: "チームの被ダメージを<b>5%</b>カットする", cut: 0.05 },
  bond:      { nm: "ボンド・ネクサス",       c: "#8affc4", desc: "リンクスキル・サブリンクのダメージが<b>6%</b>アップする", link: 1.06 },
  pierce:    { nm: "ピアース・ネクサス",     c: "#ffd257", desc: "弱点へのダメージが<b>8%</b>アップする", weak: 1.08 },
  slayer:    { nm: "スレイヤー・ネクサス",   c: "#ff8ab5", desc: "ボスへのダメージが<b>6%</b>アップする", boss: 1.06 },
  sweep:     { nm: "スイープ・ネクサス",     c: "#baffd9", desc: "ボス以外の敵へのダメージが<b>8%</b>アップする", mob: 1.08 },
  resonance: { nm: "レゾナンス・ネクサス",   c: "#e9d8ff", desc: "<b>リーダーと同じ属性</b>の味方は攻撃力が<b>8%</b>アップする", sameEl: 1.08 },
  advantage: { nm: "アドバンテージ・ネクサス", c: "#4ade80", desc: "<b>属性有利</b>のときの倍率が 1.25 → <b>1.32</b> になる", elem: 0.07 },
  fortune:   { nm: "フォーチュン・ネクサス", c: "#ffb84d", desc: "クリア報酬の<b>ゴールドが10%</b>アップする", gold: 1.10 },
  wisdom:    { nm: "ウィズダム・ネクサス",   c: "#7cc4ff", desc: "クリア報酬の<b>EXPが10%</b>アップする", exp: 1.10 },
  scout:     { nm: "スカウト・ネクサス",     c: "#f0b429", desc: "ハート・剣・砂時計などの<b>アイテムが出やすく</b>なる", item: 1.4 },
  charge:    { nm: "チャージ・ネクサス",     c: "#a86bff", desc: "エーテルの出るクエストでは、各WAVEの開始時に<b>エーテルを1つ</b>持ってスタートする", photon: 1 },
  demolish:  { nm: "デモリッシュ・ネクサス", c: "#e0405e", desc: "各WAVEの開始時、<b>マインスイーパー系の味方は地雷を1つ多く</b>持つ", mine: 1 },
  tempo:     { nm: "テンポ・ネクサス",       c: "#c46bff", desc: "各WAVEの開始時、味方全員のフルバーストターンを<b>1</b>短縮する", waveFb: 1 },
  vanguard:  { nm: "ヴァンガード・ネクサス", c: "#ff9d2e", desc: "そのショットで<b>最初にふれた敵</b>へのダメージが<b>8%</b>アップする", first: 1.08 },
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-26 MagiLex の交換キャラ専用ネクサス（ご指定: 通常より強い）
     ------------------------------------------------------------
     ふつうのネクサスは「ちょっと得をする」程度（+5〜8%）に抑えてある。
     MagiLex のキャラは<b>ガチャでは手に入らず、勉強でためた KP でしか交換できない</b>ので、
     ここだけ<b>おおよそ2倍</b>の効き目にしてある。
     ★ 発動するのは<b>編成のいちばん左（リーダー）1体だけ</b>という決まりは同じ。
       強いネクサスを2つ重ねることはできない。
     ★ 名前の頭を「アカデミー」でそろえてあるので、一覧で見分けがつく。
     ══════════════════════════════════════════════════════════════ */
  lexforce:   { nm: "アカデミー・フォース",     c: "#ff5d47", desc: "味方全員の攻撃力が<b>11%</b>アップする（フォース・ネクサスの約2倍）", atk: 1.11 },
  lexvigor:   { nm: "アカデミー・ヴィガー",     c: "#2fbf71", desc: "チームの最大HPが<b>11%</b>アップする（ヴィガー・ネクサスの約2倍）", hp: 1.11 },
  lexignition:{ nm: "アカデミー・イグニッション", c: "#c9a6ff", desc: "バトル開始時、味方全員のフルバーストターンを<b>2</b>短縮する（イグニッションの2倍）", fb: 2 },
  lexbond:    { nm: "アカデミー・ボンド",       c: "#8affc4", desc: "リンクスキル・サブリンクのダメージが<b>13%</b>アップする（ボンド・ネクサスの約2倍）", link: 1.13 },
  lexaegis:   { nm: "アカデミー・イージス",     c: "#7ce8ff", desc: "バトル開始時、味方全員に<b>900</b>のバリアを張る（イージス・ネクサスの約2倍）", barrier: 900 },
};
/* ネクサススキルのカテゴリ（絞り込み用）。 */
const NEXUS_CAT = {
  force: "atk", slayer: "atk", sweep: "atk", pierce: "atk", vanguard: "atk", resonance: "atk", advantage: "atk",
  vigor: "def", mercy: "def", aegis: "def", guard: "def",
  gale: "tempo", ignition: "tempo", tempo: "tempo",
  bond: "support", scout: "support", charge: "support", demolish: "support",
  fortune: "reward", wisdom: "reward",
  /* ★ 2026-08-26 MagiLex 専用ネクサス。絞り込みの分類はもとになったネクサスと同じにする */
  lexforce: "atk", lexvigor: "def", lexignition: "tempo", lexbond: "support", lexaegis: "def",
};
/* いま発動しているネクサス（＝編成のいちばん左のキャラのもの）。バトル中は B.balls[0] を見る */
function nexusLeaderId() {
  if (B && B.balls && B.balls.length) return B.balls[0].id;
  return (DB.party && DB.party[0]) || null;
}
function nexusDef() {
  const id = nexusLeaderId();
  const c = id && CHARS[id];
  return (c && NEXUS[c.nexus]) || null;
}
function nexusVal(key, dflt) {
  const n = nexusDef();
  return (n && n[key] != null) ? n[key] : dflt;
}

/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-07 新システム「クロススキル」
   ──────────────────────────────────────────────
   ・特定の<b>編成の条件</b>を満たしたときだけ、そのキャラに<b>アビリティが増える</b>仕組み。
     ネクサススキル（リーダー1体だけ・チーム全体に効く）とは別枠で、
     こちらは<b>持ち主本人にだけ</b>効く。
   ・キャラ定義に connect: "yaju" のように書くと、下の CONNECT の中身が使われる。
   ・条件（cond）は関数で書く。引数は「編成のキャラidの配列」と「本人のid」。
     編成画面でもバトル中でも同じ関数を使うので、判定がズレない。
   ★ 新しいクロスを足すときは CONNECT にエントリを1つ足すだけでよい。
     効果そのものは、それぞれの効き場所（atkMulOf / ボスWAVE開始 など）で
     connectOn(ball,"キー") を見て分岐する。
   ══════════════════════════════════════════════════════════════ */
/* ★ CONNECT は定義するその場で desc の文章を組み立てるので、
   参照する倍率の定数は必ず CONNECT より<b>前</b>に置くこと（後ろだと TDZ で落ちる）。 */
const CONNECT_BUFF = 2.5;        // お待たせ! の倍率
const LEGEND_BUFF = 5.0;         // ★ 2026-08-08b 伝説の逸材の倍率（2.5 → 5.0）
const CONNECT = {
  /* ══ ★ 2026-08-20 GRAND DEBUT GACHA 新SSR 3体のクロススキル ══
     ★ どれも <b>abil:</b> だけを配る形にしてある。こう書いておくと、条件を満たしているあいだ
       そのキャラが<b>そのアビリティを持っているものとして扱われる</b>（hasAbil が見る）ので、
       効果を別に実装する必要がない＝「クロスの効果だけ入っていない」型の抜けが起きない。
     ★ 名前（nm）は<b>アビリティ名そのもの</b>にしてある。同じ名前のアビリティは
       どこでも同じ効果、という決まりを守るため（説明も abilDesc から引かれる）。
     ★ アンチ系のアビリティは<b>配らない</b>。配るとクロスの発動状況で
       charAntiKeys が変わり、「アンチちょうど3種」という設計が崩れるため。 */
  /* ══ ★★ 2026-08-22 Starlight Academy Fest 5体のクロススキル ══
     ★ どれも <b>abil:</b> だけを配る形。条件を満たしているあいだ、そのキャラが
       そのアビリティを持っているものとして扱われる（hasAbil が見る）ので、
       効果を別に実装する必要がない＝「クロスの効果だけ入っていない」型の抜けが起きない。
     ★ 名前（nm）は<b>アビリティ名そのもの</b>。同じ名前のアビリティはどこでも同じ効果、
       という決まりを守るため（説明も abilDesc から引かれる）。
     ★ アンチ系のアビリティは<b>配らない</b>。配るとクロスの発動状況で charAntiKeys が変わり、
       「アンチちょうど2種」という設計そのものが崩れるため。
     ★ 発動条件は<b>1体ずつ別</b>（ご指定）。1体だけ引いた人でも発動しうる形にしてある。 */
  otoha: {
    nm: "星譜のクロス",
    condTx: "<b>自分と撃種がちがう味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 1,
    skills: [
      { k: "otohaFirst", nm: "ザコキラー", abil: "mobkiller" },
      { k: "otohaBoost", nm: "リンクブーストL", abil: "fsboostL" },
    ],
  },
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 の5体のクロススキル
     ------------------------------------------------------------
     ★ アビリティは<b>クロススキルもふくめて8つ</b>（ご指定）。
       5体とも「アンチ3種＋キラー2種＋非キラー1種」の6つを素で持ち、
       クロスで「キラー1種＋非キラー1種」の2つが足されて合計8つになる。
     ★ キラーは<b>クロスもふくめて3つまで</b>（ご指定）なので、
       クロスに入れてよいキラーは<b>1つだけ</b>。もう1枠は必ず
       ダメージを増やさないアビリティ（バリア・回復・加速・FB短縮など）にする。
     ★ 発動条件は5体とも別のものにしてある（同じ条件だと編成の幅が広がらない）。
     ══════════════════════════════════════════════════════════════ */
  guren: {
    nm: "業火のクロス",
    condTx: "<b>自分と同じ撃種の味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot === m.shot) >= 2,
    skills: [
      { k: "gurenGrav", nm: "重力バリアキラーEL", abil: "gravkillerEL" },
      { k: "gurenDash", nm: "ダッシュL", abil: "dashL" },
    ],
  },
  yuuna: {
    nm: "碧漣のクロス",
    condTx: "<b>自分より攻撃力が低い味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.atk[1] || 0) < (m.atk[1] || 0)) >= 2,
    skills: [
      /* ★★ 2026-08-25 ご指定により、パワーオーラ・底力系も<b>キラー枠として</b>使えるようになった。
         ユウナは リジェネL＋ドレインM＋バウンドヒール で<b>HPを高く保つ</b>キャラなので、
         「チームHP50%以上で攻撃・スピード×2.5」の<b>パワーオーラEL</b>がいちばん噛み合う。
         ★ キラーの数は変わらない（属性キラーEL・蓬莱族キラーL・パワーオーラEL の<b>3つ</b>）。 */
      { k: "yuunaAura", nm: "パワーオーラEL", abil: "auraEL" },
      { k: "yuunaDrain", nm: "ドレインM", abil: "drainM" },
    ],
  },
  momo: {
    nm: "宵桃のクロス",
    condTx: "<b>自分と同じ属性の味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 1,
    skills: [
      { k: "momoGrav", nm: "重力バリアキラーEL", abil: "gravkillerEL" },
      { k: "momoRes", nm: "全属性耐性M", abil: "allresM" },
    ],
  },
  chihaya: {
    nm: "翠風のクロス",
    condTx: "<b>自分より速い味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.spd[1] || 0) > (m.spd[1] || 0)) >= 2,
    skills: [
      { k: "chihayaWeak", nm: "弱点キラーEL", abil: "weakkillerEL" },
      { k: "chihayaDash", nm: "ダッシュL", abil: "dashL" },
    ],
  },
  yui: {
    nm: "聖環のクロス",
    condTx: "<b>自分と戦型がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.type !== m.type) >= 2,
    skills: [
      /* ★★ 2026-08-25 ご指定により、パワーオーラ・底力系も<b>キラー枠として</b>使える。
         ユイの持ち場は<b>蓬莱天宮</b>＝いちばん長く削り合うクエストなので、
         「チームHP50%以下で与ダメージ×3.0」の<b>底力EL</b>を最後の一押しに置く。
         ★ キラーの数は変わらない（属性キラーEL・蓬莱族キラーL・底力EL の<b>3つ</b>）。
         ★ 相方のユウナは<b>パワーオーラEL</b>（HPが高いほど強い）＝ちょうど裏返しの組。 */
      { k: "yuiSoko", nm: "底力EL", abil: "sokojikaraEL" },
      { k: "yuiFb", nm: "FBターンブースト", abil: "fbturnboost" },
    ],
  },
  sayaka: {
    nm: "蒼波のクロス",
    condTx: "<b>自分と戦型がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.type !== m.type) >= 2,
    skills: [
      { k: "sayakaMany", nm: "敵多底力EL", abil: "manyfoeEL" },
      { k: "sayakaDrain", nm: "ドレインM", abil: "drainM" },
    ],
  },
  sayuri: {
    nm: "玄墨のクロス",
    condTx: "<b>自分と同じ属性の味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 1,
    skills: [
      { k: "sayuriDestroy", nm: "デストロイブーストM", abil: "destroyboostM" },
      { k: "sayuriDef", nm: "防御ダウンキラーM", abil: "defkillerM" },
    ],
  },
  akari: {
    nm: "陽だまりのクロス",
    condTx: "<b>自分より攻撃力が高い味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.atk[1] || 0) > (m.atk[1] || 0)) >= 1,
    skills: [
      { k: "akariAura", nm: "パワーオーラEL", abil: "auraEL" },
      { k: "akariAccel", nm: "FBターンアクセル", abil: "fbaccel" },
    ],
  },
  hinata: {
    nm: "曙光のクロス",
    condTx: "<b>自分より遅い味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.spd[1] || 0) < (m.spd[1] || 0)) >= 2,
    skills: [
      { k: "hinataCombo", nm: "連撃キラーEL", abil: "combokillerEL" },
      { k: "hinataDash", nm: "ダッシュL", abil: "dashL" },
    ],
  },
  /* ════════════════════════════════════════════════════════════
     ★★ 2026-08-25 Starlight Academy Fest 2 の5体のクロススキル
     ------------------------------------------------------------
     ★ アビリティは<b>クロスもふくめて8つ</b>（ご指定）。
       5体とも「アンチ2種＋キラー2種＋非キラー2種」の6つを素で持ち、
       クロスで「キラー1種＋非キラー1種」の2つが足されて合計8つになる。
     ★ キラーは<b>クロスもふくめて3つまで</b>なので、クロスに入れてよいキラーは<b>1つだけ</b>。
       パワーオーラ系・底力系も<b>キラーの中に数える</b>（2026-08-25 のご指定）。
     ★ アンチ系は<b>配らない</b>。配るとクロスの発動状況で charAntiKeys が変わり、
       「アンチちょうど2種」という設計そのものが崩れるため。
     ★ 発動条件は5体とも別。<b>HPの高低</b>と<b>属性のばらけら</b>を見る条件はこの版がはじめて。
     ════════════════════════════════════════════════════════════ */
  /* ════════════════════════════════════════════════════════════
     ★★ 2026-08-26 GRAND DEBUT Ver.3.0 のクロススキル（3体ぶん）
     ------------------------------------------------------------
     ★ クロスを持つのは<b>ユウカ・ミヤビ・スミレ</b>の3体だけ（ご指定）。
       カリン・ミレイはクロスを持たず、そのぶんアビリティ6つ・キラー2つで
       すっきりまとめてある。
     ★ キラーは<b>クロスもふくめて3つまで</b>なので、クロスに入れてよいキラーは1つだけ。
     ★ アンチ系は配らない（クロスの発動状況で charAntiKeys が変わってしまうため）。
     ★★ ユウカとスミレの条件は<b>「1体もいないこと」を見る</b>——この形はこの版がはじめて。
       「同じ属性・同じ撃種でかためる」ふつうの編成とは<b>逆向き</b>のごほうびになる。
     ════════════════════════════════════════════════════════════ */
  /* ════════════════════════════════════════════════════════════
     ★★ 2026-08-26b GRAND DEBUT Ver.4.0 のクロススキル（5体ぶん）
     ------------------------------------------------------------
     ★ 5体ともクロスを持つ（ご指定）。キラーは<b>クロスもふくめて3つまで</b>なので、
       クロスに入れてよいキラーは<b>1つだけ</b>。
     ★ アンチ系は配らない（クロスの発動状況で charAntiKeys が変わってしまうため）。
     ★★ 条件はどれもこの版がはじめての形にしてある——
       「自分がチームで一番」（0体を見る）／「速い味方が2体以上」（これまでは遅い側）／
       「撃種がちょうど半々」／「4人の戦型が全員ちがう」。
     ════════════════════════════════════════════════════════════ */
  seina: {
    nm: "紅薔薇のクロス",
    condTx: "<b>自分より攻撃力が高い味方が1体もいない</b>こと（＝自分がチームでいちばん攻撃力が高い）",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.atk[1] || 0) > (m.atk[1] || 0)) === 0,
    skills: [
      { k: "seinaSoko", nm: "底力EL", abil: "sokojikaraEL" },
      { k: "seinaDash", nm: "ダッシュL", abil: "dashL" },
    ],
  },
  shiduki: {
    nm: "蒼薔薇のクロス",
    condTx: "<b>自分よりスピードが速い味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.spd[1] || 0) > (m.spd[1] || 0)) >= 2,
    skills: [
      { k: "shidukiWeak", nm: "弱点キラーEL", abil: "weakkillerEL" },
      { k: "shidukiDrain", nm: "ドレインM", abil: "drainM" },
    ],
  },
  sayuki: {
    nm: "夜想のクロス",
    condTx: "<b>編成の撃種がちょうど半々</b>であること（貫通2体・反射2体）",
    cond: (ids, me) => cnxSelfIn(ids, me)
      && (ids || []).filter((x) => CHARS[x] && CHARS[x].shot === "pierce").length === 2
      && (ids || []).filter((x) => CHARS[x] && CHARS[x].shot === "bounce").length === 2,
    skills: [
      { k: "sayukiCombo", nm: "連撃キラーEL", abil: "combokillerEL" },
      { k: "sayukiFb", nm: "FBターンブースト", abil: "fbturnboost" },
    ],
  },
  sara: {
    nm: "四つ葉のクロス",
    condTx: "<b>編成の4人の戦型がすべてちがう</b>こと",
    cond: (ids, me) => cnxSelfIn(ids, me)
      && (ids || []).filter((x) => CHARS[x]).length === 4
      && new Set((ids || []).filter((x) => CHARS[x]).map((x) => CHARS[x].type)).size === 4,
    skills: [
      { k: "saraAura", nm: "パワーオーラEL", abil: "auraEL" },
      { k: "saraRes", nm: "全属性耐性M", abil: "allresM" },
    ],
  },
  sakuya: {
    nm: "陽笑のクロス",
    condTx: "<b>自分よりHPが高い味方が1体もいない</b>こと（＝自分がチームでいちばんHPが高い）",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.hp[1] || 0) > (m.hp[1] || 0)) === 0,
    skills: [
      { k: "sakuyaVital", nm: "バイタルキラーEL", abil: "vitalEL" },
      { k: "sakuyaStop", nm: "超レーザーストップM", abil: "laserstopM" },
    ],
  },
  yuuka: {
    nm: "黒十字のクロス",
    condTx: "<b>自分と同じ撃種の味方が1体もいない</b>こと（＝貫通は自分ひとり）",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot === m.shot) === 0,
    skills: [
      { k: "yuukaWeak", nm: "弱点キラーEL", abil: "weakkillerEL" },
      { k: "yuukaBarrier", nm: "バリアEL", abil: "barrierEL" },
    ],
  },
  miyabi: {
    nm: "翠孔雀のクロス",
    condTx: "<b>自分とちがう属性の味方が3体</b>いること（＝編成の4人が全員ちがう属性）",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el !== m.el) >= 3,
    skills: [
      { k: "miyabiCombo", nm: "連撃キラーEL", abil: "combokillerEL" },
      { k: "miyabiDash", nm: "ダッシュL", abil: "dashL" },
    ],
  },
  sumire: {
    nm: "菫花のクロス",
    condTx: "<b>自分と同じ属性の味方が1体もいない</b>こと（＝光は自分ひとり）",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) === 0,
    skills: [
      { k: "sumireAura", nm: "パワーオーラEL", abil: "auraEL" },
      { k: "sumireFb", nm: "FBターンブースト", abil: "fbturnboost" },
    ],
  },
  suzune: {
    nm: "鈴音のクロス",
    condTx: "<b>自分よりHPが低い味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.hp[1] || 0) < (m.hp[1] || 0)) >= 2,
    skills: [
      { k: "suzuneWeak", nm: "弱点キラーEL", abil: "weakkillerEL" },
      { k: "suzuneFb", nm: "FBターンブースト", abil: "fbturnboost" },
    ],
  },
  minamo: {
    nm: "碧環のクロス",
    /* ★★ 2026-08-26 ご指定により<b>「ちがう属性」→「同じ属性」</b>へ変更。
       ヒマリの星辰のクロス（同じ属性が2体以上）とは<b>必要な人数がちがう</b>ので、
       2つを同じ編成で同時に満たすこともできる。 */
    condTx: "<b>自分と同じ属性の味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 1,
    skills: [
      { k: "minamoGrav", nm: "重力バリアキラーEL", abil: "gravkillerEL" },
      { k: "minamoDrain", nm: "ドレインM", abil: "drainM" },
    ],
  },
  karen: {
    nm: "黒華のクロス",
    condTx: "<b>自分と同じ撃種の味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot === m.shot) >= 1,
    skills: [
      { k: "karenSoko", nm: "底力EL", abil: "sokojikaraEL" },
      { k: "karenRes", nm: "全属性耐性M", abil: "allresM" },
    ],
  },
  tomoe: {
    nm: "翠芽のクロス",
    condTx: "<b>自分よりHPが高い味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => (c.hp[1] || 0) > (m.hp[1] || 0)) >= 1,
    skills: [
      { k: "tomoeCombo", nm: "連撃キラーEL", abil: "combokillerEL" },
      { k: "tomoeDash", nm: "ダッシュL", abil: "dashL" },
    ],
  },
  himari: {
    nm: "星辰のクロス",
    condTx: "<b>自分と同じ属性の味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 2,
    skills: [
      { k: "himariAura", nm: "パワーオーラEL", abil: "auraEL" },
      { k: "himariAccel", nm: "FBターンアクセル", abil: "fbaccel" },
    ],
  },
  mirelle: {
    nm: "煌焔のクロス",
    condTx: "<b>自分と同じ属性の味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 1,
    skills: [
      { k: "mirelleFirst", nm: "ファーストキラーEL", abil: "firstkillerEL" },
      { k: "mirelleAccel", nm: "FBターンアクセル", abil: "fbaccel" },
    ],
  },
  scarlet: {
    nm: "蒼涙のクロス",
    condTx: "<b>自分と撃種がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 2,
    skills: [
      { k: "scarletFew", nm: "敵少底力EL", abil: "fewfoeEL" },
      { k: "scarletBoost", nm: "リンクブーストL", abil: "fsboostL" },
    ],
  },
  koyuki: {
    nm: "宵猫のクロス",
    condTx: "<b>自分と戦型がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.type !== m.type) >= 2,
    skills: [
      { k: "koyukiCombo", nm: "連撃キラーEL", abil: "combokillerEL" },
      { k: "koyukiDestroy", nm: "デストロイブーストM", abil: "destroyboostM" },
    ],
  },
  yaju: {
    nm: "野獣のクロス",
    condTx: "<b>自分のほかにアタッカー型の味方が1体以上</b>いること"
      + "（＝編成に<b>アタッカー型が自分をふくめて2体以上</b>）",
    /* ids ＝ 編成に入っているキャラid（自分をふくむ）／me ＝ 本人のid
       ★ 2026-08-07: 「自分が編成に入っていること」も条件に入れる。
         入れていなくても ids のなかにアタッカー型がいれば true になっていたため、
         キャラ詳細を図鑑から開いただけで「発動中」と出ていた。 */
    cond: (ids, me) => {
      const mine = CHARS[me] && CHARS[me].type;
      if (!mine) return false;
      if (ids.indexOf(me) < 0) return false;
      return ids.some((id) => id && id !== me && CHARS[id] && CHARS[id].type === mine);
    },
    skills: [
      { k: "omachitase", nm: "お待たせ!", desc: "<b>ボス戦に入るたび</b>、<b>自分が1回行動し終えるまで</b>自分のステータスが<b>" + CONNECT_BUFF + "倍</b>になる" },
      { k: "legend", nm: "伝説の逸材", desc: "自分が<b>完凸（限界突破MAX）</b>のとき、自分のステータスが<b>" + LEGEND_BUFF + "倍</b>になる" },
    ],
  },
  /* ══════════ ★ 2026-08-10 XEVAガチャ移行SSR 6体のクロス ══════════
     ここから下のスキルは <b>abil</b> を持つ。abil を書いておくと、条件を満たしているあいだ
     そのキャラが<b>そのアビリティを持っているものとして扱われる</b>（hasAbil が見る）。
     効果を別に実装しなくてよいので、既存のアビリティを配るクロスはこれだけで済む。 */
  kotomi: {
    nm: "夜想のクロス",
    condTx: "<b>自分と戦型がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.type !== m.type) >= 2,
    skills: [
      { k: "kotomiAccel", nm: "FBターンアクセル", abil: "fbaccel" },
    ],
  },
  riko: {
    nm: "祝祭のクロス",
    condTx: "<b>自分と戦型が同じ味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.type === m.type) >= 1,
    skills: [
      { k: "rikoVital", nm: "バイタルキラーL", abil: "vitalL" },
    ],
  },
  kaho: {
    nm: "潮鳴のクロス",
    condTx: "<b>自分と同じ撃種の味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot === m.shot) >= 1,
    skills: [
      { k: "kahoAccel", nm: "FBターンアクセル", abil: "fbaccel" },
      { k: "kahoBoost", nm: "リンクブーストM", abil: "fsboostM" },
    ],
  },
  nana: {
    nm: "灼華のクロス",
    condTx: "<b>自分と同じ撃種の味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot === m.shot) >= 2,
    skills: [
      { k: "nanaPoison", nm: "毒キラーEL", abil: "poisonkillerEL" },
    ],
  },
  rea: {
    nm: "深淵のクロス",
    condTx: "<b>自分と同じ撃種の味方が2体以上</b>いること＋<b>自分と属性のちがう味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me)
      && cnxCount(ids, me, (c, m) => c.shot === m.shot) >= 2
      && cnxCount(ids, me, (c, m) => c.el !== m.el) >= 1,
    skills: [
      { k: "reaMany", nm: "敵多底力EL", abil: "manyfoeEL" },
      { k: "reaNether", nm: "冥花種キラーM", abil: "netherkillerM" },
    ],
  },
  rinonx: {
    nm: "常夏のクロス",
    condTx: "<b>自分と撃種がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 2,
    skills: [
      { k: "rinonxMany", nm: "敵多底力EL", abil: "manyfoeEL" },
      /* ★ 2026-08-11: ここには「ブロックなどの障害物を壊すと攻撃力が上がる」と書いてあったが、
         デストロイブーストの実際の効果は<b>敵が倒れるたびにFBターンを1短縮</b>。
         同名のアビリティは中身も同じでなければならないので、説明は abilDesc から引くようにした
         （＝ desc を書かない。cnxSkillDesc がアビリティの説明をそのまま返す）。 */
      { k: "rinonxDestroy", nm: "デストロイブースト", abil: "destroyboost" },
    ],
  },
  /* ══ ★ 2026-08-11 Luminous Summer Fest 追加2体のクロススキル ══ */
  cherylalpha: {
    nm: "蒼夏のクロス",
    condTx: "<b>自分と撃種がちがう味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 1,
    skills: [
      { k: "cherylaBoost", nm: "リンクブーストL", abil: "fsboostL" },
      { k: "cherylaWallFb", nm: "壁FBターン短縮", abil: "wallfbshort" },
    ],
  },
  /* ══ ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）のクロススキル ══
     ・カレム … 撃種ちがいが1体でも入っていれば「渾身」。攻撃×3 のかわりにスピード×0.5。
     ・マユ   … 同じ条件で FBターンアクセル＋蝕魔族キラーEL（幽冥の庭園むけ）。
     ・チヅル … <b>自分が完凸（限界突破MAX）</b>であることが条件。育てきってはじめて開く。 */
  karem: {
    nm: "灼夏のクロス",
    condTx: "<b>自分と撃種がちがう味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 1,
    skills: [
      { k: "karemKonshin", nm: "渾身", abil: "konshin" },
    ],
  },
  mayu: {
    nm: "翠夏のクロス",
    condTx: "<b>自分と撃種がちがう味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 1,
    skills: [
      { k: "mayuAccel", nm: "FBターンアクセル", abil: "fbaccel" },
      { k: "mayuEclipse", nm: "蝕魔族キラーEL", abil: "eclipsekillerEL" },
    ],
  },
  chizuru: {
    nm: "宵夏のクロス",
    condTx: "<b>自分が完凸（限界突破MAX）</b>であること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxFullAwk(me),
    skills: [
      { k: "chizuruAllKiller", nm: "全属性キラーM", abil: "allkillerM" },
      { k: "chizuruBubbly", nm: "バブリーモード", abil: "bubblemode" },
    ],
  },
  /* ★ 2026-08-12 セイラのクロススキル。
     条件は<b>自分と撃種がちがう味方が2体以上</b>（＝反射のセイラなら貫通の味方が2体）。
     ・ファーストキラーL   … 最初にふれた敵へのダメージが大きく伸びる。
                             乱打FBが最初の1体に全部入るので噛み合う。
     ・デストロイブーストM … 敵が倒れるたびFBが2ターン縮む（無印は1）。
     ・ドレイン           … 敵にふれるたびチームHPを回復。
     ★ 説明文は書かない（abil があるものは cnxSkillDesc が abilDesc から組み立てる）。 */
  seira: {
    nm: "宵闇のクロス",
    condTx: "<b>自分と撃種がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 2,
    skills: [
      { k: "seiraFirst", nm: "ファーストキラーL", abil: "firstkillerL" },
      { k: "seiraDestroy", nm: "デストロイブーストM", abil: "destroyboostM" },
      { k: "seiraDrain", nm: "ドレイン", abil: "drain" },
    ],
  },
  kokonaalpha: {
    nm: "灯夏のクロス",
    condTx: "<b>自分と属性が同じ味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 2,
    skills: [
      { k: "kokonaaDouble", nm: "リンク×2", abil: "fsdouble" },
      { k: "kokonaaSoul", nm: "ソウルスティールEL", abil: "soulEL" },
      { k: "kokonaaProtect", nm: "プロテクション", abil: "protection" },
    ],
  },
  /* ★ 2026-08-16 ツキノのクロススキル。
     条件は<b>自分と撃種が同じ味方が2体以上</b>（＝貫通のツキノなら貫通の味方が2体）。
     ・毒キラーEL     … 毒状態の敵へのダメージが大きく伸びる。
     ・FBターンアクセル … フルバーストのたまりが速くなる。支援型なので回転が要。
     ★ 説明文は書かない（abil があるものは cnxSkillDesc が abilDesc から組み立てる）。 */
  tsukino: {
    nm: "紅月のクロス",
    condTx: "<b>自分と撃種が同じ味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot === m.shot) >= 2,
    skills: [
      { k: "tsukinoPoison", nm: "毒キラーEL", abil: "poisonkillerEL" },
      { k: "tsukinoAccel", nm: "FBターンアクセル", abil: "fbaccel" },
    ],
  },
  /* ══ ★ 2026-08-16b 新SSR 3体のクロス ══ */
  suzuha: {
    nm: "宵闇のクロス",
    condTx: "<b>自分と撃種がちがう味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.shot !== m.shot) >= 2,
    skills: [
      { k: "suzuhaGrav", nm: "重力バリアキラーEL", abil: "gravkillerEL" },
      { k: "suzuhaDestroy", nm: "デストロイブーストM", abil: "destroyboostM" },
    ],
  },
  kanata: {
    nm: "紅蓮のクロス",
    condTx: "<b>自分と戦型が同じ味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.type === m.type) >= 1,
    skills: [
      { k: "kanataLeft", nm: "レフトポジションキラーM", abil: "leftkillerM" },
      { k: "kanataAll", nm: "全属性キラー", abil: "allkiller" },
    ],
  },
  /* ★ 2026-08-17b グレース。エレナと同じ「属性がそろうほど強い」条件 */
  youka: {
    nm: "瑶玉のクロス",
    condTx: "<b>編成に光属性か闇属性の味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c) => c.el === "light" || c.el === "dark") >= 2,
    skills: [
      { k: "youkaSpd", nm: "ダッシュL", abil: "dashL" },
      { k: "youkaWeak", nm: "弱点キラーL", abil: "weakkillerL" },
    ],
  },
  youhi: {
    nm: "九天のクロス",
    condTx: "<b>自分と属性が同じ味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 2,
    skills: [
      { k: "youhiNether", nm: "蝕冥滅殺EL", abil: "eclipseslayerEL" },
      { k: "youhiVital", nm: "バイタルキラーEL", abil: "vitalEL" },
    ],
  },
  grace: {
    nm: "聖光のクロス",
    condTx: "<b>自分と属性が同じ味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 2,
    skills: [
      { k: "gracePhantom", nm: "ファントムドライブEL", abil: "phantomdriveEL" },
      { k: "graceLightning", nm: "ライトニングEL", abil: "lightningEL" },
    ],
  },
  /* ★ 2026-08-18 ロキシー。条件が<b>2つ同時</b>（属性も撃種もそろえる）なので、
     水・反射をもう1体ずつ足す＝<b>編成の半分をロキシーに寄せる</b>と点く。
     見返りは蓬莱の九重にまるごと刺さる<b>蓬莱族キラーL</b>と、
     重力バリア面で効く<b>重力バリアキラーL</b>。 */
  roxy: {
    nm: "豪雷のクロス",
    condTx: "<b>自分と属性が同じ味方が1体以上</b>、かつ<b>自分と撃種が同じ味方が1体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me)
      && cnxCount(ids, me, (c, m) => c.el === m.el) >= 1
      && cnxCount(ids, me, (c, m) => c.shot === m.shot) >= 1,
    skills: [
      { k: "roxyHourai", nm: "蓬莱族キラーL", abil: "houraikillerL" },
      { k: "roxyGrav", nm: "重力バリアキラーL", abil: "gravkillerL" },
    ],
  },
  elena: {
    nm: "蒼波のクロス",
    condTx: "<b>自分と属性が同じ味方が2体以上</b>いること",
    cond: (ids, me) => cnxSelfIn(ids, me) && cnxCount(ids, me, (c, m) => c.el === m.el) >= 2,
    skills: [
      { k: "elenaFire", nm: "火属性キラーEL", abil: "killerEL", el: "fire" },
      { k: "elenaBarrier", nm: "バリアEL", abil: "barrierEL" },
    ],
  },
};
/* ── クロスの条件を書くためのヘルパー（2026-08-10） ──
   ★ 「自分が編成に入っていること」を毎回書かずに済むように切り出した。
     これを忘れると、図鑑からキャラ詳細を開いただけで「発動中」と出てしまう。 */
function cnxSelfIn(ids, me) { return ids.indexOf(me) >= 0; }
/* ★ 2026-08-12 「自分が完凸（限界突破MAX）」を条件にするクロススキル用。
   ★ バトル中は<b>盤面のボールが持っている凸数</b>を見る。
     マルチでは相手の凸数が手元のセーブと食いちがうので、DB を見ると
     端末ごとにダメージが変わって盤面がズレる（＝紋章のときと同じ落とし穴）。 */
function cnxFullAwk(me) {
  try {
    if (B && B.balls && B.balls.length) {
      const b = B.balls.find((x) => x.id === me);
      if (b && b.st) return ((b.st.awk) | 0) >= MAX_AWK;
    }
    return ((DB.chars[me] && DB.chars[me].awk) | 0) >= MAX_AWK;
  } catch (e) { return false; }
}
/* 自分以外の味方のうち、pred(相手, 自分) を満たす数。pred には CHARS のエントリが渡る */
function cnxCount(ids, me, pred) {
  const m = CHARS[me]; if (!m) return 0;
  return ids.filter((id) => id && id !== me && CHARS[id] && pred(CHARS[id], m)).length;
}
function connectDef(id) { const c = CHARS[id]; return (c && CONNECT[c.connect]) || null; }
/* ══ ★ 2026-08-11 クロススキルの説明は「アビリティの説明」から引く ══
   abil を持つクロススキルは、条件を満たしているあいだ<b>そのアビリティを持っているのと同じ</b>。
   つまり<b>同じ名前なら中身も同じ</b>でなければならない。
   以前は CONNECT 側に説明を手書きしていたので、アビリティ本体を直しても
   クロススキル側が古いままになり、実際に食いちがっていた
   （リノンの「デストロイブースト」＝実際はFBターン短縮なのに「攻撃力が上がる」と書いてあった）。
   これを防ぐため、abil があるものは<b>必ず abilDesc() から組み立てる</b>。
   属性を見るアビリティ（属性キラー・属性耐性）のために、本人の属性も渡す。 */
function cnxSkillDesc(id, s) {
  if (!s) return "";
  if (s.abil) { try { return abilDesc({ t: s.abil, el: (CHARS[id] || {}).el }); } catch (e) {} }
  return s.desc || "";
}
/* ══ ★ 2026-08-11 クロスの書 ══
   クロススキルの<b>発動条件を無視して常に発動</b>させるアイテム。
   幽冥の庭園の「今回の10クエスト」をすべてクリアすると手に入る（1回のスパンにつき1冊）。
   ★ 2026-08-12 仕様変更: 以前は「1冊でも持っていれば全員に効く」だったが、
     <b>1冊につきキャラ1体</b>に使って、そのキャラだけを永久に開放する方式にした。
     ・使うと本は1冊減り、そのキャラは以後ずっと条件を無視して発動する。
     ・同じキャラに2冊は使えない（開放済みのキャラは選べない）。
   ★ 開放したかどうかは DB.crossBook（charId → 1）。判定は crossBookOn(id) 1か所だけ。 */
function crossBookCount() { return Math.max(0, (DB.items && DB.items.crossbook) | 0); }
function crossBookOn(id) { return !!(id && DB.crossBook && DB.crossBook[id]); }
/* 開放済みのキャラ数（画面の案内に出す） */
function crossBookUsedCount() { return DB.crossBook ? Object.keys(DB.crossBook).length : 0; }
/* いまの編成（バトル中は B.balls、それ以外は DB.party）でクロススキルが発動しているか */
function connectPartyIds() {
  if (B && B.balls && B.balls.length) return B.balls.map((b) => b.id);
  return (DB.party || []).slice();
}
function connectOnId(id, ids) {
  const d = connectDef(id); if (!d) return false;
  const list = ids || connectPartyIds();
  /* クロスの書は「条件」だけを無視する。編成に入っていないキャラまで発動させはしない
     （入っていないキャラは、そもそも盤面にいないので効きようがない）。 */
  if (crossBookOn(id) && cnxSelfIn(list, id)) return true;
  return !!d.cond(list, id);
}
/* いまの編成（またはバトル）に本人が入っているか。詳細の表示を出し分けるのに使う */
function connectInParty(id) { return connectPartyIds().indexOf(id) >= 0; }
function connectOn(ball, key) {
  if (!ball || !ball.ch) return false;
  const d = connectDef(ball.ch.id); if (!d) return false;
  if (key && !d.skills.some((s) => s.k === key)) return false;
  return connectOnId(ball.ch.id);
}
/* ══ ★ 2026-08-08b クロススキルは「発動したらアビリティと同じ扱い」 ══
   条件を満たしているあいだは、キャラ詳細のアビリティ欄にも並べる。
   ・条件を満たしていない（＝編成にいない／アタッカーが足りない）ときは出さない。
   ・完凸が要る「伝説の逸材」は、凸が足りていなければまだ効いていないので出さない。
   awk を渡さなければ手元のセーブ（DB.chars）を見る。バトル中は ball.st.awk を渡すこと
   （オンラインでは相手の凸数が手元のセーブと食いちがうため）。 */
/* ★ 2026-08-10 作り直し。
   以前は「発動しているときだけ返す」だったので、発動していないクロスは
   アビリティ欄から<b>丸ごと消えて</b>いた。持っていること自体が見えないと
   「なぜ光らないのか」も分からないので、<b>常に全部返して on を添える</b>。
     on   … いま効いている
     why  … 効いていない理由（未編成／条件外／凸不足）
   描画側は connectChip() を使う。 */
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-11 「発動しているか」を出してよい場面をひとつに絞る
   ------------------------------------------------------------
   発動／未発動は<b>編成しだいで変わる状態</b>なので、意味があるのは
   <b>MagiBurst の編成画面（とバトル中＝その編成で戦っている最中）だけ</b>。
   図鑑・ガチャ・XEVARION 側のキャラ詳細では、編成に入れていないというだけで
   「未発動」と薄く出てしまい、<b>そのキャラの性能が低いように見えていた</b>。
   そこで、状態を出すあいだだけ cnxShowState() が true になるようにして、
   それ以外の場所では<b>ふつうのアビリティと同じ見た目</b>（薄くしない・未発動と書かない）にする。
   ★ 使いかた: 描画する側が cnxWithState(true, () => ...HTMLを組み立てる...) で包むだけ。
   ══════════════════════════════════════════════════════════════ */
let _cnxState = false;
function cnxWithState(on, fn) {
  const prev = _cnxState; _cnxState = !!on;
  try { return fn(); } finally { _cnxState = prev; }
}
function cnxShowState() { return !!_cnxState; }
function connectAbils(id, awk) {
  const d = connectDef(id); if (!d) return [];
  const a = awk != null ? awk : ((DB.chars[id] && DB.chars[id].awk) | 0);
  const inP = connectInParty(id);
  const cond = inP && connectOnId(id);
  /* クロスの書で発動しているぶんは、理由の代わりにそのことを出す */
  const byBook = cond && crossBookOn(id) && !d.cond(connectPartyIds(), id);
  return d.skills.map((s) => {
    const need = s.k === "legend" && a < MAX_AWK;
    const on = cond && !need;
    return { k: s.k, nm: s.nm, desc: cnxSkillDesc(id, s), on: on, book: on && byBook,
      why: on ? "" : need ? "完凸が必要" : !inP ? "編成外" : "条件外" };
  });
}
/* クロススキルの「マーク付きチップ」。cls は置く場所のクラス名（bdab / abchip / t）。
   ★ 編成画面・バトル中だけ、発動していないものに .off を付けて理由を小さく出す。
     それ以外の画面（図鑑・ガチャ・XEVARION）では状態を出さない＝ふつうのチップと同じ見た目。 */
function connectChip(k, cls) {
  const st = cnxShowState();
  const dim = st && !k.on;                       // 薄くするのは状態を出す場面だけ
  const tip = !st ? "クロススキル：" : k.on ? (k.book ? "クロススキル発動中（クロスの書）：" : "クロススキル発動中：")
    : "クロススキル（未発動・" + k.why + "）：";
  return '<span class="' + cls + ' cnx' + (dim ? " off" : " on") + '" title="' + tip + k.nm + '">'
    + '<i class="cnxmk" aria-hidden="true">'
    + '<svg viewBox="0 0 24 24"><path d="M9.6 14.4 14.4 9.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
    + '<path d="M13 6.4l1.6-1.6a3.4 3.4 0 014.8 4.8L17.8 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
    + '<path d="M11 17.6l-1.6 1.6a3.4 3.4 0 01-4.8-4.8L6.2 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></i>'
    + k.nm + (dim ? '<em class="cnxoff">未発動</em>' : "") + "</span>";
}
/* ══ ★ 2026-08-16 一覧カードに出す「クロス持ち」の印 ══
   クロススキルを持っているかどうかは、これまで<b>詳細を開かないと分からなかった</b>。
   編成は「誰と誰を並べればクロスが点くか」から考えるので、
   一覧の時点で持ち主が見えていないと、1体ずつ開いて確かめることになる。
   ・出すのは「持っているかどうか」だけ。発動しているかどうかは出さない
     （図鑑やガチャでは編成が決まっていないので、発動を出しても意味がない）。
   ・cls は置き場所ごとのクラス名（.rc 用と .ccch 用で大きさが違う）。 */
function crossCardMark(id, cls) {
  const d = connectDef(id); if (!d) return "";
  /* ★ 2026-08-16b クロスの書で発動しているぶんは色を変える。
     編成の条件を満たして点いているのか、書で無理やり点けているのかが
     一覧のまま分かるようにする（書は数に限りがあるので、どこに使ったか追いたい）。 */
  const byBook = (typeof crossBookOn === "function") && crossBookOn(id);
  const tip = byBook ? "クロススキル持ち（クロスの書）：" : "クロススキル持ち：";
  return '<i class="' + (cls || "rccx") + (byBook ? " book" : "") + '" title="' + tip + d.nm + '" aria-label="クロススキル持ち">'
    + '<svg viewBox="0 0 24 24" aria-hidden="true">'
    + '<path d="M9.6 14.4 14.4 9.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
    + '<path d="M13 6.4l1.6-1.6a3.4 3.4 0 014.8 4.8L17.8 11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
    + '<path d="M11 17.6l-1.6 1.6a3.4 3.4 0 01-4.8-4.8L6.2 13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
    + "</svg></i>";
}

/* ══ ★ 2026-08-11 編成スロットに出す「クロスのマーク」 ══
   編成中のキャラがクロススキルを持っているとき、そのスロットに小さな鎖のマークを出す。
   ・発動中           … 光ったマーク（.on）
   ・クロスの書で発動 … 本のマーク付き（.book）
   ・未発動           … 薄いマーク（.off）
   持っていないキャラには何も出さない。 */
function connectSlotMark(id) {
  const d = connectDef(id); if (!d) return "";
  const inP = connectInParty(id);
  const on = inP && connectOnId(id);
  const book = on && crossBookOn(id) && !d.cond(connectPartyIds(), id);
  const tip = on ? (book ? "クロススキル発動中（クロスの書）：" : "クロススキル発動中：") + d.nm
    : "クロススキル未発動（" + (inP ? "条件外" : "編成外") + "）：" + d.nm;
  return '<i class="cnxslot' + (on ? " on" : " off") + (book ? " book" : "") + '" title="' + tip + '" aria-label="' + tip + '">'
    + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 14.4 14.4 9.6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
    + '<path d="M13 6.4l1.6-1.6a3.4 3.4 0 014.8 4.8L17.8 11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
    + '<path d="M11 17.6l-1.6 1.6a3.4 3.4 0 01-4.8-4.8L6.2 13" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>'
    + (book ? '<b class="cnxbk" aria-hidden="true">書</b>' : "") + "</i>";
}

/* ══════════ キャラクター定義 ══════════ */
const CHARS = {
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-10 XEVAガチャからの移行SR 19体（ガチャ統合）
     ・XEVARION の XEVAガチャにいた SR を、そのまま MagiBurst のSRにした。
     ・<b>アンチは2種まで／アビリティは最大5つ／等級は無印中心</b>にそろえてある。
       ＝「アンチ2種までのガチャSSRより少し弱い」帯。SSRの置きかえにはならないが、
       手持ちが少ないうちは十分に戦力になる。
     ・技はすべて<b>すでにあるもの</b>を使い回している（新しい技は作っていない）。
     ・ピックアップは無い（SRはガチャのSR枠から等確率で出る）。
     ★ 属性は絵の雰囲気から決めた（火3／水3／木3／光5／闇5）。
     ══════════════════════════════════════════════════════════════ */
  hina: {
    id: "hina", nm: "ヒナ", img: "Hina.webp", th: "t_Hina.webp",
    el: "wood", shot: "bounce", type: "バランス型", nexus: "vigor",
    hp: [820, 5180], atk: [404, 2560], spd: [262, 386],
    abil: [{ t: "adw" }, { t: "ms" }, { t: "regen" }, { t: "aura" }], subfs: "accel",
    ssName: "花咲ノ舞・ペタルワルツ", ssTurns: 16, ssKind: "celine",
    ssPow: "自強化（攻撃×1.5・スピード×1.2）＋ ふれた敵の攻撃力ダウン",
    ssDesc: "<b>桜の花びらをまとって自強化</b>し、ふれた敵の<b>攻撃力を下げる</b>。クセがなく、どのクエストでも扱いやすいSRの基本形",
    fsName: "リバウンドサークル", fsKind: "ring", fsPow: "リング1ヒット 攻撃力×0.24（5基・壁で反射）",
    fsDesc: "壁で跳ね返るリングを5基放ち、まわりの敵を削り続ける",
  },
  runa: {
    id: "runa", nm: "ルナ", img: "Runa.webp", th: "t_Runa.webp",
    el: "light", shot: "pierce", type: "砲撃型", nexus: "bond",
    hp: [790, 5020], atk: [418, 2650], spd: [272, 400],
    abil: [{ t: "aw" }, { t: "aslow" }, { t: "fsboost" }, { t: "weakkiller" }], subfs: "phoming",
    ssName: "銀月ノ調べ・ルナソナタ", ssTurns: 18, ssKind: "bernica",
    ssPow: "自強化（攻撃×1.5）＋ ふれた味方のパワーアップ",
    ssDesc: "<b>銀の月光をまとって自強化</b>し、<b>ふれた味方の攻撃力も引き上げる</b>。リンクブーストを持つので、自分のリンクスキルもよく伸びる",
    fsName: "ルミナスレイ", fsKind: "luminous", fsPow: "砲台1基のレーザー 攻撃力×0.95（貫通・最大4基）",
    fsDesc: "光の砲台を設置し、貫通レーザーで敵をまとめて撃ち抜く",
  },
  noa: {
    id: "noa", nm: "ノア", img: "Noa.webp", th: "t_Noa.webp",
    el: "light", shot: "bounce", type: "守護型", nexus: "aegis",
    hp: [880, 5460], atk: [382, 2420], spd: [248, 368],
    abil: [{ t: "ablock" }, { t: "aslow" }, { t: "barrier" }, { t: "regen" }, { t: "allres" }], subfs: "boundheal",
    ssName: "聖盾ノ誓い・オーロラガード", ssTurns: 16, ssKind: "ayame",
    ssPow: "体当たり 攻撃力×1.9 ＋ チームHP15%回復・被ダメ半減3回",
    ssDesc: "<b>聖なる盾を掲げてチームHPを15%回復</b>し、<b>敵の攻撃を3回半減</b>するガードを張る。事故が怖いクエストの保険役",
    fsName: "ヒーリングボム", fsKind: "heal", fsPow: "チームHP12%回復（ダメージなし）",
    fsDesc: "癒やしの爆発でチームHPを12%回復する",
  },
  haruka: {
    id: "haruka", nm: "ハルカ", img: "Haruka.webp", th: "t_Haruka.webp",
    el: "wood", shot: "pierce", type: "技巧型", nexus: "scout",
    hp: [810, 5100], atk: [406, 2570], spd: [268, 394],
    abil: [{ t: "ms" }, { t: "agrav" }, { t: "pimmune" }, { t: "poisonkiller" }], subfs: "poison",
    ssName: "翠風ノ矢・グリーンゲイル", ssTurns: 18, ssKind: "celine",
    ssPow: "自強化（攻撃×1.5・スピード×1.2）＋ ふれた敵の攻撃力ダウン",
    ssDesc: "<b>翠の風をまとって自強化</b>し、ふれた敵の<b>攻撃力を下げる</b>。毒無効＋毒キラーで、毒まみれの部屋でこそ強い",
    fsName: "全敵ポイズンレイン", fsKind: "spread", fsPow: "拡散弾16発 各 攻撃力×0.14",
    fsDesc: "全方位へ16発の拡散弾をばらまき、散らばった敵をまとめて削る",
  },
  shiona: {
    id: "shiona", nm: "シオナ", img: "Shiona.webp", th: "t_Shiona.webp",
    el: "water", shot: "bounce", type: "バランス型", nexus: "gale",
    hp: [830, 5210], atk: [400, 2530], spd: [266, 390],
    abil: [{ t: "adw" }, { t: "aslow" }, { t: "dash" }, { t: "vital" }], subfs: "accel",
    ssName: "蒼晶ノ煌めき・クリスタルノート", ssTurns: 16, ssKind: "rinne",
    ssPow: "自強化（攻撃×1.6・スピード×1.3）",
    ssDesc: "<b>蒼い結晶をまとって自強化</b>し、盤面を長く駆けまわる。ダッシュとの相性がよく、リンクをたくさん起こせる",
    fsName: "ソニックブレードウェーブ", fsKind: "wave", fsPow: "攻撃力×0.95（左右の衝撃波）",
    fsDesc: "左右に走る斬撃の衝撃波で敵をなぎ払う",
  },
  ede: {
    id: "ede", nm: "エデ", img: "Ede.webp", th: "t_Ede.webp",
    el: "wood", shot: "bounce", type: "技巧型", nexus: "wisdom",
    hp: [840, 5280], atk: [392, 2480], spd: [256, 378],
    abil: [{ t: "ms" }, { t: "ablock" }, { t: "ssboost" }, { t: "sokojikara" }], subfs: "boundcharge",
    ssName: "刻ノ書庫・アーカイブベル", ssTurns: 18, ssKind: "mashiro",
    ssPow: "自強化（攻撃×1.5）＋ ふれた味方のフルバーストターンを短縮",
    ssDesc: "<b>古の書のページを繰りながら自強化</b>し、<b>ふれた味方のフルバーストを縮める</b>。チームの回転を上げる縁の下の力持ち",
    fsName: "FB短縮弾6発", fsKind: "ssbullet", fsPow: "6発 × 攻撃力×0.30（ふれた味方のFBターン-1）",
    fsDesc: "FB短縮弾を6発ばらまき、拾った味方のフルバーストターンを縮める",
  },
  yuina: {
    id: "yuina", nm: "ユイナ", img: "Yuina.webp", th: "t_Yuina.webp",
    el: "dark", shot: "pierce", type: "アタッカー型", nexus: "force",
    hp: [800, 5060], atk: [420, 2660], spd: [270, 398],
    abil: [{ t: "aw" }, { t: "agrav" }, { t: "killer", el: "light" }, { t: "firstkiller" }], subfs: "hitouchray",
    ssName: "蝕月ノ牙・エクリプスファング", ssTurns: 18, ssKind: "leila",
    ssPow: "自強化（攻撃×1.6・スピード×1.6）＋ 最初にふれた敵で<b>停止</b>して 高速乱打16連（各 攻撃力×0.6）",
    ssDesc: "<b>自強化して闇夜を駆け抜け</b>、<b>最初にふれた敵の上で止まって</b><b>高速乱打16連</b>をたたき込む。ファーストキラーと噛み合う手数型",
    fsName: "クロスレイEL", fsKind: "laser", fsPow: "攻撃力×1.15（十字にヒットした敵すべて）",
    fsDesc: "触れた地点から十字方向に闇の貫通レーザーを放つ",
  },
  ririka: {
    id: "ririka", nm: "リリカ", img: "Ririka.webp", th: "t_Ririka.webp",
    el: "fire", shot: "bounce", type: "支援型", nexus: "mercy",
    hp: [850, 5320], atk: [386, 2440], spd: [258, 382],
    abil: [{ t: "ms" }, { t: "aslow" }, { t: "regen" }, { t: "barrier" }], subfs: "boundheal",
    ssName: "ふわふわ・キャンディベル", ssTurns: 14, ssKind: "ayame",
    ssPow: "体当たり 攻撃力×1.9 ＋ チームHP15%回復・被ダメ半減3回",
    ssDesc: "<b>あまいキャンディの香りでチームHPを15%回復</b>し、<b>敵の攻撃を3回半減</b>する。14ターンと回転が速い回復役",
    fsName: "ヒーリングボム", fsKind: "heal", fsPow: "チームHP12%回復（ダメージなし）",
    fsDesc: "癒やしの爆発でチームHPを12%回復する",
  },
  serina: {
    id: "serina", nm: "セリナ", img: "Serina.webp", th: "t_Serina.webp",
    el: "water", shot: "pierce", type: "砲撃型", nexus: "bond",
    hp: [810, 5090], atk: [412, 2610], spd: [266, 392],
    abil: [{ t: "adw" }, { t: "antilock" }, { t: "fsboost" }, { t: "allres" }], subfs: "plasma",
    ssName: "氷華ノ祈り・フロストプレリュード", ssTurns: 18, ssKind: "bernica",
    ssPow: "自強化（攻撃×1.5）＋ ふれた味方のパワーアップ",
    ssDesc: "<b>氷の華をまとって自強化</b>し、<b>ふれた味方の攻撃力も上げる</b>。アンチロックゾーン持ちなので、リンクを封じられる部屋でも仕事ができる",
    fsName: "連気弾7発", fsKind: "kiblast", fsPow: "7発 × 攻撃力×0.55",
    fsDesc: "気を込めた弾を7発つづけて撃ちこむ",
  },
  akane: {
    id: "akane", nm: "アカネ", img: "Akane.webp", th: "t_Akane.webp",
    el: "fire", shot: "pierce", type: "アタッカー型", nexus: "slayer",
    hp: [795, 5030], atk: [424, 2680], spd: [274, 404],
    abil: [{ t: "adw" }, { t: "ablock" }, { t: "killer", el: "wood" }, { t: "sokojikara" }], subfs: "pspread5",
    ssName: "紅刃ノ一閃・スカーレットエッジ", ssTurns: 18, ssKind: "leila",
    ssPow: "自強化（攻撃×1.6・スピード×1.6）＋ 最初にふれた敵で<b>停止</b>して 高速乱打16連（各 攻撃力×0.6）",
    ssDesc: "<b>紅の刃で自強化して駆け抜け</b>、<b>最初にふれた敵の上で止まって</b><b>高速乱打16連</b>を叩き込む。SRのなかでは攻撃力がいちばん高い",
    fsName: "3方向貫通弾", fsKind: "tri3", fsPow: "3発 × 攻撃力×0.60（貫通）",
    fsDesc: "3方向へ強力な貫通弾を放ち、並んだ敵をまとめて撃ち抜く",
  },
  airi: {
    id: "airi", nm: "アイリ", img: "Airi.webp", th: "t_Airi.webp",
    el: "water", shot: "bounce", type: "守護型", nexus: "guard",
    hp: [886, 5500], atk: [380, 2400], spd: [246, 364],
    abil: [{ t: "adw" }, { t: "ms" }, { t: "barrier" }, { t: "allres" }, { t: "regen" }], subfs: "boundheal",
    ssName: "氷精ノ帳・シルフィードヴェール", ssTurns: 16, ssKind: "ayame",
    ssPow: "体当たり 攻撃力×1.9 ＋ チームHP15%回復・被ダメ半減3回",
    ssDesc: "<b>氷の精霊の帳でチームHPを15%回復</b>し、<b>敵の攻撃を3回半減</b>する。SRでいちばんHPが高い、いわゆる「壁役」",
    fsName: "リバウンドサークル", fsKind: "ring", fsPow: "リング1ヒット 攻撃力×0.24（5基・壁で反射）",
    fsDesc: "壁で跳ね返るリングを5基放ち、まわりの敵を削り続ける",
  },
  eruna: {
    id: "eruna", nm: "エルナ", img: "Eruna.webp", th: "t_Eruna.webp",
    el: "light", shot: "pierce", type: "バランス型", nexus: "resonance",
    hp: [825, 5170], atk: [408, 2580], spd: [268, 396],
    abil: [{ t: "aw" }, { t: "ms" }, { t: "aura" }, { t: "drain" }], subfs: "divinepillar",
    ssName: "黄金ノ祝祭・ゴールデンリース", ssTurns: 16, ssKind: "rinne",
    ssPow: "自強化（攻撃×1.6・スピード×1.3）",
    ssDesc: "<b>黄金の光をまとって自強化</b>する、シンプルで強い自強化型。ドレインでHPを取り戻しながら殴り続けられる",
    fsName: "ディバインピラー", fsKind: "javelin", fsPow: "光の槍 攻撃力×0.85（最も近い敵へ）",
    fsDesc: "最も近い敵へ光の槍を投げつける",
  },
  kotoha: {
    id: "kotoha", nm: "コトハ", img: "Kotoha.webp", th: "t_Kotoha.webp",
    el: "dark", shot: "bounce", type: "技巧型", nexus: "demolish",
    hp: [835, 5230], atk: [398, 2520], spd: [260, 384],
    abil: [{ t: "ablock" }, { t: "agrav" }, { t: "destroyboost" }, { t: "mobkiller" }], subfs: "blast",
    ssName: "宵闇ノ聖歌・ヴェスパーヒム", ssTurns: 18, ssKind: "celine",
    ssPow: "自強化（攻撃×1.5・スピード×1.2）＋ ふれた敵の攻撃力ダウン",
    ssDesc: "<b>宵闇の聖歌で自強化</b>し、ふれた敵の<b>攻撃力を下げる</b>。デストロイブースト＋アンチブロックで、ブロックだらけの部屋が得意",
    fsName: "リバウンドサークル", fsKind: "ring", fsPow: "リング1ヒット 攻撃力×0.24（5基・壁で反射）",
    fsDesc: "壁で跳ね返るリングを5基放ち、まわりの敵を削り続ける",
  },
  mika: {
    id: "mika", nm: "ミカ", img: "Mika.webp", th: "t_Mika.webp",
    el: "fire", shot: "pierce", type: "アタッカー型", nexus: "ignition",
    hp: [805, 5070], atk: [422, 2670], spd: [272, 400],
    abil: [{ t: "ms" }, { t: "aslow" }, { t: "killer", el: "wood" }, { t: "aura" }], subfs: "blast",
    ssName: "焔冠ノ舞・インフェルノクラウン", ssTurns: 18, ssKind: "koharu",
    ssPow: "自強化（攻撃×1.6）＋ ふれた敵の弱点倍率アップ",
    ssDesc: "<b>焔の冠をまとって自強化</b>し、<b>ふれた敵の弱点倍率を上げる</b>。弱点持ちのボスに刺さる、火力の起点になれるSR",
    fsName: "連気弾7発", fsKind: "kiblast", fsPow: "7発 × 攻撃力×0.55",
    fsDesc: "炎の気弾を7発つづけて撃ちこむ",
  },
  mirea: {
    id: "mirea", nm: "ミレア", img: "Mirea.webp", th: "t_Mirea.webp",
    el: "dark", shot: "bounce", type: "バランス型", nexus: "vigor",
    hp: [845, 5290], atk: [396, 2500], spd: [258, 380],
    abil: [{ t: "adw" }, { t: "aw" }, { t: "soul" }, { t: "vital" }], subfs: "field",
    ssName: "黒金ノ円環・オーラムサークル", ssTurns: 16, ssKind: "rinne",
    ssPow: "自強化（攻撃×1.6・スピード×1.3）",
    ssDesc: "<b>黒金の円環をまとって自強化</b>する。ソウルスティールで敵を倒すたびにHPが戻るので、長い6WAVEを走り切れる",
    fsName: "リバウンドサークル", fsKind: "ring", fsPow: "リング1ヒット 攻撃力×0.24（5基・壁で反射）",
    fsDesc: "壁で跳ね返るリングを5基放ち、まわりの敵を削り続ける",
  },
  miyu: {
    id: "miyu", nm: "ミユ", img: "Miyu.webp", th: "t_Miyu.webp",
    el: "dark", shot: "pierce", type: "砲撃型", nexus: "pierce",
    hp: [800, 5040], atk: [414, 2620], spd: [270, 398],
    abil: [{ t: "aw" }, { t: "ablock" }, { t: "fsboost" }, { t: "weakkiller" }], subfs: "weaklock",
    ssName: "月影ノ弦・ムーンリットコード", ssTurns: 18, ssKind: "bernica",
    ssPow: "自強化（攻撃×1.5）＋ ふれた味方のパワーアップ",
    ssDesc: "<b>月影の弦を弾いて自強化</b>し、<b>ふれた味方の攻撃力も上げる</b>。弱点キラー＋弱点ロックオンで、弱点のある敵を集中的に削れる",
    fsName: "クロスレイEL", fsKind: "laser", fsPow: "攻撃力×1.15（十字にヒットした敵すべて）",
    fsDesc: "触れた地点から十字方向に闇の貫通レーザーを放つ",
  },
  nene: {
    id: "nene", nm: "ネネ", img: "Nene.webp", th: "t_Nene.webp",
    el: "dark", shot: "bounce", type: "支援型", nexus: "tempo",
    hp: [855, 5340], atk: [384, 2430], spd: [256, 378],
    abil: [{ t: "ms" }, { t: "antilock" }, { t: "ssboost" }, { t: "regen" }], subfs: "boundcharge",
    ssName: "紫苑ノ子守唄・アメジストララバイ", ssTurns: 16, ssKind: "mashiro",
    ssPow: "自強化（攻撃×1.5）＋ ふれた味方のフルバーストターンを短縮",
    ssDesc: "<b>紫苑の子守唄で自強化</b>し、<b>ふれた味方のフルバーストを縮める</b>。FBブースト持ちなので自分の回転も速い",
    fsName: "FB短縮弾6発", fsKind: "ssbullet", fsPow: "6発 × 攻撃力×0.30（ふれた味方のFBターン-1）",
    fsDesc: "FB短縮弾を6発ばらまき、拾った味方のフルバーストターンを縮める",
  },
  rei: {
    id: "rei", nm: "レイ", img: "Rei.webp", th: "t_Rei.webp",
    el: "light", shot: "pierce", type: "スピード型", nexus: "gale",
    hp: [785, 4990], atk: [416, 2640], spd: [286, 420],
    abil: [{ t: "aw" }, { t: "aslow" }, { t: "dash" }, { t: "firstkiller" }], subfs: "accel",
    ssName: "白銀ノ疾走・シルバーラッシュ", ssTurns: 16, ssKind: "leila",
    ssPow: "自強化（攻撃×1.6・スピード×1.6）＋ 最初にふれた敵で<b>停止</b>して 高速乱打16連（各 攻撃力×0.6）",
    ssDesc: "<b>白銀の残像を引いて駆け抜け</b>、<b>最初にふれた敵の上で止まって</b><b>高速乱打16連</b>を叩き込む。SRでいちばんスピードが速い",
    fsName: "ソニックブレードウェーブ", fsKind: "wave", fsPow: "攻撃力×0.95（左右の衝撃波）",
    fsDesc: "左右に走る斬撃の衝撃波で敵をなぎ払う",
  },
  rusia: {
    id: "rusia", nm: "ルシア", img: "Rusia.webp", th: "t_Rusia.webp",
    el: "light", shot: "bounce", type: "支援型", nexus: "mercy",
    hp: [860, 5370], atk: [388, 2450], spd: [254, 376],
    abil: [{ t: "adw" }, { t: "ms" }, { t: "pray" }, { t: "regen" }], subfs: "boundheal",
    ssName: "陽だまりノ聖域・サンクチュアリ", ssTurns: 20, ssKind: "buff",
    ssPow: "チーム全体の攻撃力×1.35・スピード×1.25（8アクション）",
    ssDesc: "<b>陽だまりの聖域を広げ、チーム全員の攻撃力とスピードを上げる</b>バフ型フルバースト。治癒の祈りも持つので、ボス戦の立ち上がりを支えられる",
    fsName: "ヒーリングボム", fsKind: "heal", fsPow: "チームHP12%回復（ダメージなし）",
    fsDesc: "癒やしの爆発でチームHPを12%回復する",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-10 XEVAガチャからの移行SSR 6体（コトミ／リコ／カホ／ナナ／レア／リノン）
     ・XEVARION の XEVAガチャにいた SSR を、そのまま MagiBurst のSSRにした。
       ガチャが1本にまとまったので、所持・限界突破も MagiBurst 側で一本化される。
     ・全員が<b>クロススキル</b>を持つ（CONNECT の kotomi〜rinonx）。
     ★ リノンは<b>既存の No.69 リノン（光／貫通）と同名だった</b>ので、
       既存のほうを「ルクシア」に改名し、id は据え置き（rinon）。
       こちらの移行キャラは id を <b>rinonx</b> にしてある（所持データを壊さないため）。
     ══════════════════════════════════════════════════════════════ */
  kotomi: {
    id: "kotomi", nm: "コトミ", img: "Kotomi.webp", th: "t_Kotomi.webp",
    el: "dark", shot: "pierce", type: "支援砲撃型", gacha: true, lux: true, nexus: "resonance",
    connect: "kotomi",
    hp: [892, 5880], atk: [492, 3140], spd: [296, 436],
    abil: [{ t: "superadw" }, { t: "sgrav" }, { t: "award" }, { t: "netherkillerEL" },
           { t: "mobkillerM" }, { t: "fsdouble" }, { t: "drainM" }],
    subfs: "roundcharge",
    ssName: "ノクス・ルミナリエ", ssTurns: 22, ssKind: "kotomi",
    ssPow: "自強化（攻撃×1.8・スピード×1.25）＋ <b>ふれた味方のステータスを×2.0</b>（その味方が2回行動するまで）",
    ssDesc: "<b>夜の光をまとって自強化</b>（攻撃×1.8・スピード×1.25）し、"
      + "<b>このショットでふれた味方すべてのステータス（攻撃力・スピード）を×2.0</b>に引き上げる。"
      + "強化は<b>その味方が2回行動し終えるまで</b>続くので、味方の大技に合わせて撃ちこめば一気に決着がつく。"
      + "<b>リンク×2</b>と<b>ラウンドチャージ</b>を併せ持つので、なぞるだけでチームのフルバーストも回り出す。",
    fsName: "オートエイムビット", fsKind: "autoaimbit", fsPow: AIMBIT_POW,
    fsDesc: "ふれた味方に<b>4つのビット</b>が追従し、<b>その味方が止まるまで近くの敵を自動で撃ち続ける</b>",
  },
  riko: {
    id: "riko", nm: "リコ", img: "Riko.webp", th: "t_Riko.webp",
    el: "light", shot: "pierce", type: "支援砲撃型", gacha: true, lux: true, nexus: "bond",
    connect: "riko",
    hp: [884, 5830], atk: [486, 3100], spd: [294, 432],
    abil: [{ t: "superaw" }, { t: "aslow" }, { t: "eternalphoton" }, { t: "weakkillerL" },
           { t: "regenL" }, { t: "sscharge" }],
    subfs: "linkspeedup",
    ssName: "オード・シャンテレル", ssTurns: 18, ssKind: "sheril",
    ssPow: "自強化（攻撃×1.8・スピード×1.25）＋ <b>撃った瞬間に味方全員で総攻撃</b>（全員が動く・突撃中の直殴り×" + RALLY_MUL + "）＋ ふれた敵の<b>弱点倍率を大アップ</b>",
    ssDesc: "<b>自強化して駆け出すと同時に、味方全員へ号令をかける</b>（シェリルと同じフルバースト）。"
      + "<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃し、"
      + "ふれた敵の<b>弱点倍率が大きく上がる</b>。<b>弱点キラーL</b>を自前で持っているので、"
      + "総攻撃のあいだじゅう弱点がとろけるように削れていく。",
    fsName: "スパイラルリバウンド", fsKind: "spiral", fsPow: "螺旋1ヒット 攻撃力×0.30（サークル6基・味方が止まるまで持続）",
    fsDesc: "ふれた瞬間に<b>六方向へサークルを発射</b>。それぞれ<b>最初にふれた敵の位置</b>から、<b>ふれた味方を中心にした螺旋の軌道</b>へ乗り移り、<b>その味方が止まるまで</b>回りながら敵を削り続ける",
  },
  kaho: {
    id: "kaho", nm: "カホ", img: "Kaho.webp", th: "t_Kaho.webp",
    el: "water", shot: "bounce", type: "技巧型", gacha: true, lux: true, nexus: "demolish",
    connect: "kaho",
    hp: [896, 5900], atk: [484, 3090], spd: [286, 420],
    abil: [{ t: "ablock" }, { t: "antilock" }, { t: "eclipsekillerEL" }, { t: "upkillerM" }],
    subfs: "wallcircuit",
    ssName: "碧洋ノ浮環・アクアリング", ssTurns: 16, ssKind: "kaho",
    ssPow: "その場に停止し、<b>狙った方向の視野角180°にいる敵すべて</b>に浮き輪を装着（毎ターンのスリップダメージ＋防御ダウン）",
    ssDesc: "<b>その場から動かず</b>、狙った向きの<b>視野角180°にいる敵すべて</b>に碧い浮き輪を装着する"
      + "（カリナと同じ形のフルバースト。<b>演出はさらに豪華</b>な水柱と二重の波紋つき）。"
      + "浮き輪を着けられた敵は<b>毎ターン削られ続け、防御力も落ちる</b>ので、後続の味方の一撃がそのまま通る。"
      + "引っぱる向きだけで効き目が決まるので、<b>敵が固まっている側へ半円を向ける</b>のがコツ。",
    fsName: "超強鋭角三方向追従型貫通弾", fsKind: "supertri3followsharp",
    fsPow: "1発ごとに 攻撃力×" + SUPTRI_SHARP_PER + "（鋭角3方向・高速連射・貫通／味方が止まるまで撃ち続ける）",
    fsDesc: "<b>鋭角三方向追従型貫通弾の強化版</b>。3発が<b>ほとんど同じ点にまとまって</b>飛ぶ形はそのままに、"
      + "<b>連射が速く・弾が太く・威力も上</b>。狭い角度に集まるので<b>単体のボスへまとめて突き刺さる</b>",
  },
  nana: {
    id: "nana", nm: "ナナ", img: "Nana.webp", th: "t_Nana.webp",
    el: "fire", shot: "pierce", type: "アタッカー型", gacha: true, lux: true, nexus: "force",
    connect: "nana",
    hp: [900, 5930], atk: [496, 3160], spd: [292, 428],
    abil: [{ t: "supermsM" }, { t: "ablock" }, { t: "award" }, { t: "auraM" }, { t: "allresM" }],
    subfs: "lock8",
    ssName: "ブレイズ・オーバーラン", ssTurns: 22, ssKind: "yaju",
    ssPow: "自強化（攻撃×2.0・スピード×1.3）＋ <b>壁にふれるたびパワーUP（最大×10.0）</b> ＋ <b>撃った瞬間に味方全員で総攻撃</b> ＋ <b>分身4体</b>",
    ssDesc: "<b>自強化して走り出し</b>（攻撃×2.0・スピード×1.3）、<b>壁にふれるたびに攻撃力がどんどん上がる（最大×10.0）</b>。"
      + "さらに<b>撃ったその瞬間に味方全員が総攻撃</b>をかけ、<b>自分の分身4体</b>も壁を跳ねながら敵に突っ込み続ける"
      + "（<b>野獣先輩と同じフルバースト</b>を<b>22ターン</b>で撃てる）。"
      + "<b>超マインスイーパーM・アンチブロック・アンチ断絶界</b>と、盤面を選ばないアンチもそろっている。",
    fsName: "超強クロス分身弾", fsKind: "supercrossclone",
    fsPow: "分身" + SCC_CLONES + "体 1ヒット 攻撃力×" + SCC_PER + "（壁で反射・貫通・止まるまで）",
    fsDesc: "クロス分身弾の<b>強化版</b>。<b>分身の数・1ヒットの威力・走る速さ・動きまわる時間</b>のすべてが上で、"
      + "分身ひとつひとつが大きいので<b>盤面まるごとを削り取る</b>",
  },
  rea: {
    id: "rea", nm: "レア", img: "Rea.webp", th: "t_Rea.webp",
    el: "dark", shot: "pierce", type: "スピード型", gacha: true, lux: true, nexus: "slayer",
    connect: "rea",
    hp: [880, 5810], atk: [494, 3150], spd: [300, 442],
    abil: [{ t: "supermsEL" }, { t: "superaw" }, { t: "weakkillerM" }, { t: "bubblemode" }],
    subfs: "defdownblast",
    ssName: "アビサル・ヴェイパー", ssTurns: 18, ssKind: "abyss",
    ssPow: "自強化（攻撃×1.9・スピード×1.3）＋ <b>ダメージウォール・重力バリア無効</b> ＋ <b>壁すり抜け</b> ＋ 敵にふれるたび落雷",
    ssDesc: "<b>自強化して深淵の霧をまとい</b>（攻撃×1.9・スピード×1.3）、"
      + "<b>ダメージウォールと重力バリアを無効化</b>したうえ<b>壁をすり抜けて</b>走り抜ける"
      + "（<b>アビスと同じフルバースト</b>）。ふれた敵には<b>落雷の追撃</b>が落ちる。"
      + "<b>超マインスイーパーEL・超アンチワープ</b>と<b>バブリーモード</b>で、"
      + "地雷とワープだらけの盤面を止まらずに駆け回れる。",
    fsName: "コピー", fsKind: "copy",
    fsPow: "ふれた味方のリンクスキルを<b>レアの闇属性・レアのキラー</b>で発動（威力そのまま）",
    fsDesc: "<b>ふれた味方のリンクスキルを写し取って</b>放つ。属性は<b>レアの闇属性</b>、"
      + "<b>キラーもレアのもの（弱点キラーM／クロス中は冥花種キラーM）</b>が乗る。"
      + "組み合わせる相手しだいで役割が変わる、闇の万能札",
  },
  rinonx: {
    id: "rinonx", nm: "リノン", img: "RinonX.webp", th: "t_RinonX.webp",
    el: "fire", shot: "bounce", type: "壁撃型", gacha: true, lux: true, nexus: "ignition",
    connect: "rinonx",
    hp: [898, 5920], atk: [488, 3110], spd: [284, 418],
    abil: [{ t: "superaslow" }, { t: "ablock" }, { t: "combokillerEL" }, { t: "allresM" }, { t: "barrierEL" }],
    subfs: "blast",
    ssName: "フロストブルーム・サマー", ssTurns: 16, ssKind: "rinonx",
    ssPow: "自強化（攻撃×1.6・スピード×1.25）＋ <b>減速壁にふれるたびパワーUP（最大×10.0）</b>",
    ssDesc: "<b>自強化して跳ねまわり</b>（攻撃×1.6・スピード×1.25）、"
      + "<b>減速壁にふれるたびに攻撃力がどんどん上がっていく（最大×10.0）</b>。"
      + "本人は<b>超アンチ減速壁</b>なので、減速壁にふれても遅くならず<b>むしろ加速する</b>——"
      + "つまり<b>凍った壁をわざと叩きにいくほど強くなる</b>、減速壁クエスト専用の決戦兵器。"
      + "減速壁の無い部屋でも<b>連撃キラーEL</b>と<b>バリアEL</b>で腐らない。",
    fsName: "コピー", fsKind: "copy",
    fsPow: "ふれた味方のリンクスキルを<b>リノンの火属性・リノンのキラー</b>で発動（威力そのまま）",
    fsDesc: "<b>ふれた味方のリンクスキルを写し取って</b>放つ。属性は<b>リノンの火属性</b>、"
      + "<b>キラーもリノンのもの（連撃キラーEL）</b>が乗る。反射なので味方のあいだを何度も往復しやすい",
  },

  ema: {
    id: "ema", nm: "エマ", img: "Ema.webp", th: "t_Ema.webp", el: "fire", shot: "pierce", type: "支援砲撃型", gacha: true, lux: true, nexus: "mercy",
    hp: [850, 5460], atk: [450, 2870], spd: [282, 412],
    abil: [{ t: "superaw" }, { t: "aslow" }, { t: "ssboost" }, { t: "regenM" }, { t: "killerM", el: "wood" }], subfs: "accel",
    ssName: "プリマ・フレイムコール", ssTurns: 16, ssKind: "ema",
    ssPow: "体当たり 攻撃力×1.6 ＋ 炎ホーミング16発（各 攻撃力×0.30）＋ チームHP35%回復",
    ssDesc: "炎のホーミング16連（各×0.30）を放ちながら攻撃（×1.6）、ショット終了時にチームHPを35%回復する",
    fsName: "フレイムシーカー12", fsKind: "homing", fsPow: "12発 × 攻撃力×" + PSEEKER_PER + "（敵を追尾しながら貫通・1体につき1ヒット）",
    fsDesc: "敵を追尾しながら<b>貫通していく火炎弾を12発</b>発射する",
  },
  sakura: {
    id: "sakura", nm: "サクラ", img: "Sakura.webp", th: "t_Sakura.webp", el: "water", shot: "bounce", type: "反射再走型", gacha: true, lux: true, nexus: "vanguard",
    hp: [830, 5450], atk: [445, 2860], spd: [285, 420],
    abil: [{ t: "superms" }, { t: "superaw" }, { t: "allkiller" }, { t: "sokojikara" }], subfs: "hitouchray",
    ssName: "蒼閃烈破・サッカーストライカー", ssTurns: 18, ssKind: "sakuraX",
    ssPow: "自強化（攻撃×1.7・スピード×1.5）＋ 停止後にさらに強化して再走 ＋ 再走時に大量のサッカーボールを射出",
    ssDesc: "<b>自強化して駆けまわり</b>（攻撃×1.7・スピード×1.5）、<b>止まるとさらに強化してもう一度自動で走り出す（再走）</b>。再走のときは<b>大量のサッカーボールを一気に射出</b>し、壁で跳ねながら敵をなぎ倒す超火力フルバースト！",
    fsName: "アブソリュートレイ10", fsKind: "absoluteray", fsPow: "レイ10本 × 攻撃力×" + ABSRAY_MUL + "（貫通・レイ1本につき1ヒット／長さはランダム " + ABSRAY_MIN + "〜" + ABSRAY_MAX + "）",
    fsDesc: "自分を中心に、<b>長さのちがう10本の極大レイ</b>が伸び、<b>1回転ぶん薙ぎ払う</b>。レイは<b>貫通</b>なので通り道の敵をまとめて斬り裂く（<b>近くの敵ほど多くのレイが届く</b>）",
  },
  arisa: {
    id: "arisa", nm: "アリサ", img: "Arisa.webp", th: "t_Arisa.webp", el: "fire", shot: "pierce", type: "貫通乱打型", gacha: true, lux: true, nexus: "slayer",
    /* ★ 2026-08-10 上方修正（クロスガチャ廃止 → プレミアムへ移行）。
       アンチは<b>オムニ＋アンチ減速壁の2種</b>まで（オムニは<b>もともと持っていたもの</b>で、新規付与ではない）。 */
    hp: [900, 5780], atk: [492, 3130], spd: [292, 430],
    abil: [{ t: "omni" }, { t: "aslow" }, { t: "destroyboost" }, { t: "pray" }, { t: "fatalkillerM" }], subfs: "pspread5",
    ssName: "緋滅連牙・メテオラプソディ", ssTurns: 16, ssKind: "arisaX",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ 最初にふれた敵で<b>停止</b>して 強力な乱打40連（各 攻撃力×0.65＝合計×26.0）",
    ssDesc: "<b>自強化して貫き進み</b>（攻撃×1.7・スピード×1.2）、<b>最初にふれた敵の上で止まって緋炎の乱打40連（各×0.65）</b>をたたき込む超乱打フルバースト（当たるのは最初の1体だけ）。全弾ヒットで合計 攻撃力×26.0 の大ダメージ！",
    fsName: "鋭角三方向追従型貫通弾", fsKind: "tri3followsharp", fsPow: "1発ごとに 攻撃力×0.30（味方が止まるまで撃ち続ける）",
    fsDesc: "<b>自分の位置から、ふれた味方へ向けて</b><b>鋭角にまとまった3方向の貫通弾</b>を発射。その味方が動いているあいだ、<b>いまいる場所へ狙いを付け直しながら撃ち続ける</b>",
  },
  kaguya: {
    id: "kaguya", nm: "カグヤ", img: "Kaguya.webp", th: "t_Kaguya.webp", el: "light", shot: "pierce", type: "超バランス型", gacha: true, lux: true, nexus: "resonance",
    hp: [800, 5200], atk: [430, 2750], spd: [280, 410],
    abil: [{ t: "omni" }, { t: "aura" }, { t: "vital" }, { t: "eternalphoton" }, { t: "resonance" }], subfs: "hiplasma",
    ssName: "月虹重力・ルナグラビトン", ssTurns: 14, ssKind: "kaguya",
    ssPow: "体当たり 攻撃力×2.3 ＋ 着地ダメージ 攻撃力×2.0以上（吹っ飛び量に比例）",
    ssDesc: "大きく攻撃力アップ（×2.3）＋ふれた敵を月の重力で強烈に吹っ飛ばし、<b>吹っ飛んだ勢いの分だけ着地時に大ダメージ（×2.0〜）</b>を与える",
    fsName: "オービタルエッジ", fsKind: "spinring", fsPow: "リング1ヒット 攻撃力×0.30（巨大リング7基・壁で反射）",
    fsDesc: "クリスタルの<b>巨大なリバウンドサークル7基</b>が回転・反射しながら広がり、周囲の敵を連続で切り裂く",
  },
  cheryl: {
    id: "cheryl", nm: "シェリー", img: "Cheryl.webp", th: "t_Cheryl.webp", el: "dark", shot: "pierce", type: "超乱打型", gacha: true, lux: true, nexus: "force",
    hp: [820, 5400], atk: [450, 2900], spd: [290, 425],
    abil: [{ t: "vital" }, { t: "omni" }, { t: "allkiller" }, { t: "drain" }], subfs: "accel",
    ssName: "紫焔絶影・ヴァイオレットラプソディ", ssTurns: 20, ssKind: "cheryl",
    ssPow: "最初にふれた敵で<b>停止</b>して 乱打30連（各 攻撃力×0.7＝合計×21.0）＋ 体当たり 攻撃力×1.8",
    ssDesc: "攻撃力アップ（×1.8）、<b>そのショットで最初にふれた敵の上で止まり、紫焔の乱打30連（各×0.7）</b>をたたき込む超乱打フルバースト（当たるのは最初の1体だけ）。全弾ヒットで合計 攻撃力×21.0 の大ダメージ！",
    fsName: "三方向追従型貫通弾", fsKind: "tri3follow", fsPow: "1発ごとに 攻撃力×0.28（味方が止まるまで撃ち続ける）",
    fsDesc: "<b>自分の位置から、ふれた味方へ向けて</b>3方向の貫通弾を発射。その味方が動いているあいだ、<b>いまいる場所へ狙いを付け直しながら止まるまで撃ち続ける</b>",
  },
  aira: {
    /* ★ 2026-08-05: 降臨クエストを幽冥の庭園 第8〜12ノ園（＝最奥）へ移したのに合わせて、
       性能を<b>ガチャSSRと同格</b>まで引き上げた。
       ステータスは v16 プレミアムSSRと同じ帯（HP 5,800台／攻撃 3,000台／速さ 420台）、
       アビリティも等級つき7種にそろえてある。
       フルバーストは「号令＋回復」の総攻撃型（ssKind: tsubaki）に変更し、
       支援キャラのままチームの主軸を張れるようにした。 */
    id: "aira", nm: "アイラ", img: "Aira.webp", th: "t_Aira.webp", el: "wood", shot: "bounce", type: "支援総攻撃型", raid: "raidAira", lux: true, nexus: "mercy", star5: true,
    hp: [898, 5880], atk: [480, 3060], spd: [286, 422],
    abil: [{ t: "superaw" }, { t: "superaslow" }, { t: "barrierL" }, { t: "healM" },
           { t: "fsboostL" }, { t: "ssboost" }, { t: "killerM", el: "water" }], subfs: "blast",
    ssName: "ラブリィ・ハートフェスタ", ssTurns: 16, ssKind: "tsubaki",
    ssPow: "自強化（攻撃×1.8）＋ <b>味方全員で総攻撃（突撃中の直殴り×1.5）</b>",
    ssDesc: "<b>自強化して飛び出し（攻撃×1.8）</b>、撃ったその瞬間に<b>「みんな、いっしょに！」の号令</b>で"
      + "<b>味方全員が実際に動き出し</b>、いちばん近い敵へいっせいに突撃する（突撃中の直殴りは<b>×1.5</b>／"
      + "壁で跳ねて何度も殴れて、味方どうしがふれれば<b>リンクスキルも連鎖</b>する）。"
      + "<b>バリアL・回復M・リンクブーストL</b>を積んだ、支えながら殴り切る総攻撃フルバースト",
    fsName: "FB短縮弾", fsKind: "ssbullet", fsPow: "6発 × 攻撃力×0.30 ＋ FBターン-1",
    fsDesc: "光の弾を6発放って攻撃しつつ、触れた仲間と自分のFBターンを1ずつ短縮する",
  },
  shion: {
    id: "shion", nm: "シオン", img: "Shion.webp", th: "t_Shion.webp", el: "water", shot: "pierce", type: "貫撃型", raid: "raidShion", nexus: "gale",
    hp: [845, 5460], atk: [462, 2900], spd: [280, 410],
    abil: [{ t: "superadw" }, { t: "aslow" }, { t: "msM" }, { t: "ssboost" }, { t: "firstkillerM" }], subfs: "accel",
    ssName: "月夜氷刃・シオンクレスト", ssTurns: 12, ssKind: "sakura",
    ssPow: "体当たり 攻撃力×1.7 ＋ 最初にふれた敵で<b>停止</b>して 氷の乱打12連（各 攻撃力×0.65）",
    ssDesc: "弾速アップ＆攻撃力アップ（×1.7）、<b>最初にふれた敵の上で止まって</b>氷の乱打12連（各×0.65）をたたき込む（当たるのは最初の1体だけ）",
    fsName: "三方向追撃貫通弾", fsKind: "tri3", fsPow: "3発 × 攻撃力×0.6（貫通）",
    fsDesc: "最も近い敵へ向けて3方向に貫通弾を放ち、並んだ敵をまとめて撃ち抜く",
  },
  viola: {
    id: "viola", nm: "ヴィオラ", img: "Viola.webp", th: "t_Viola.webp", el: "dark", shot: "bounce", type: "トリック型", raid: "raidViola", nexus: "fortune",
    hp: [850, 5480], atk: [458, 2880], spd: [278, 408],
    abil: [{ t: "superadw" }, { t: "aslow" }, { t: "killerM", el: "light" }, { t: "regenM" }, { t: "sgrav" }], subfs: "blast",
    ssName: "カジノ・ロワイヤルシャワー", ssTurns: 14, ssKind: "arisa",
    ssPow: "体当たり 攻撃力×1.6 ＋ 流星9発（各 攻撃力×1.0）",
    ssDesc: "攻撃力アップ（×1.6）、ショットが止まるとラッキーチップの流星9発（各×1.0）が敵全体に降りそそぐ",
    fsName: "サイクロンエッジλ", fsKind: "spin", fsPow: "刃1ヒットごとに 攻撃力×0.42",
    fsDesc: "闇のバニーブレイドが回転しながら広がり、周囲の敵を連続で切り裂く",
  },
  mion: {
    id: "mion", nm: "ミオン", img: "Mion.webp", th: "t_Mion.webp", el: "light", shot: "pierce", type: "超砲撃型", gacha: true, lux: true, nexus: "pierce",
    /* ★ 2026-08-10 クロスガチャ廃止にともなう上方修正（プレミアムへ移行）。
       アンチは<b>3種まで</b>のまま（超ADW／アンチ減速壁／超AW）。オムニは付けない。 */
    hp: [906, 5820], atk: [492, 3120], spd: [298, 438],
    abil: [{ t: "superadw" }, { t: "aslow" }, { t: "superaw" }, { t: "fsboostL" }, { t: "allresM" }], subfs: "phoming",
    ssName: "終焔連撃・ダブルオーヴァードライヴ", ssTurns: 20, ssKind: "mion",
    ssPow: "1st 体当たり 攻撃力×1.9 ／ 停止後の 2nd 体当たり 攻撃力×2.8（再加速）",
    ssDesc: "自強化状態でフィールドを駆けまわり（×1.9）、<b>止まったあとさらに強化された状態でもう一度自動で走り出す（×2.8）</b>2段構えの超火力フルバースト",
    fsName: "ルミナスレイ", fsKind: "luminous", fsPow: "砲台1基のレーザー 攻撃力×0.95（貫通・最大4基）",
    fsDesc: "ふれた味方が<b>最初にぶつかった壁4か所に光の砲台を設置</b>し、その味方が止まると<b>砲台からまっすぐ貫通レーザー</b>が走って敵を撃ち抜く",
  },
  kokona: {
    id: "kokona", nm: "ココナ", img: "Kokona.webp", th: "t_Kokona.webp", el: "water", shot: "bounce", type: "削り特化型", gacha: true, lux: true, nexus: "mercy",
    /* ★ 2026-08-10 上方修正（プレミアムへ移行）。アンチは3種まで（減速壁／超AW／ブロック）。 */
    hp: [918, 5900], atk: [478, 3040], spd: [284, 418],
    abil: [{ t: "pray" }, { t: "aslow" }, { t: "superaw" }, { t: "ablock" }, { t: "soulEL" }], subfs: "field",
    ssName: "ハートフルレクイエム", ssTurns: 18, ssKind: "kokona",
    ssPow: "体当たり 攻撃力×1.8 ＋ 停止後 全体ハート爆撃（各敵の残りHPの25%）",
    ssDesc: "自強化して暴れまわり（×1.8）、<b>止まると大量のハートが降りそそぎ、画面上のすべての敵にそれぞれの残りHPの25%ぶんのダメージ</b>を与える",
    fsName: "クロス分身弾", fsKind: "cross", fsPow: "分身" + CC_CLONES + "体 1ヒット 攻撃力×" + CC_PER + "（壁で反射・貫通・止まるまで）",
    fsDesc: "ふれた瞬間に<b>" + CC_CLONES + "体の分身</b>を放出。分身は<b>壁で反射しながらフィールドを動きまわり、敵を貫通して削り続ける</b>（止まるまで）",
  },
  mao: {
    id: "mao", nm: "マオ", img: "Mao.webp", th: "t_Mao.webp", el: "dark", shot: "bounce", type: "壁撃型", gacha: true, lux: true, nexus: "sweep",
    /* ★ 2026-08-10 上方修正（プレミアムへ移行）。アンチは<b>2種</b>（減速壁＋ブロック）に増やし、
       キラーは弱点L・毒EL・バイタルLへ引き上げる。オムニは付けない。 */
    hp: [910, 5840], atk: [490, 3110], spd: [290, 426],
    abil: [{ t: "weakkillerL" }, { t: "aslow" }, { t: "ablock" }, { t: "poisonkillerEL" }, { t: "firstkillerM" }, { t: "vitalL" }], subfs: "poison",
    ssName: "壊劫反響・カルマインリコシェ", ssTurns: 22, ssKind: "mao",
    ssPow: "体当たり 攻撃力×1.8（壁に当たるたびに +0.4／最大 ×4.2）",
    ssDesc: "自強化して飛び出し（×1.8）、<b>壁にぶつかるたびに紅蓮の力が増していく（1反射ごとに +0.4・最大×4.2）</b>。壁を使うほど加速度的に火力が伸びる",
    fsName: "リバウンドサークル", fsKind: "ring", fsPow: "リング1ヒット 攻撃力×0.24（5基・壁で反射）",
    fsDesc: "ふれた味方を<b>追従しながら壁で反射し続けるリング5基</b>を展開。その味方が<b>止まるまで</b>敵を削り続ける",
  },
  bernica: {
    id: "bernica", nm: "ベルニカ", img: "Bernica.webp", th: "t_Bernica.webp", el: "light", shot: "pierce", type: "支援砲撃型", gacha: true, lux: true, nexus: "pierce",
    hp: [810, 5350], atk: [455, 2900], spd: [280, 410],
    abil: [{ t: "fsboost" }, { t: "adw" }, { t: "aw" }, { t: "bubblemode" }], subfs: "boundheal",
    ssName: "グロリアス・レゾナンス", ssTurns: 22, ssKind: "bernica",
    ssPow: "自強化（攻撃×1.7）＋ 敵の弱点効果アップ ＋ 触れた味方のパワー上昇",
    ssDesc: "<b>自強化して突撃（攻撃×1.7）</b>し、<b>敵の弱点ダメージを増幅</b>。さらに<b>ふれた味方のパワーを一定期間上昇</b>させる支援型フルバースト",
    fsName: "ハイエナジーサークル", fsKind: "energycircle", fsPow: "攻撃力×1.25（画面上のすべての敵）",
    fsDesc: "巨大なエネルギーの輪が広がり、<b>画面上のすべての敵</b>を攻撃する",
  },
  tsubaki: {
    id: "tsubaki", nm: "ツバキ", img: "Tsubaki.webp", th: "t_Tsubaki.webp", el: "fire", shot: "bounce", type: "総攻撃型", gacha: true, lux: true, nexus: "slayer",
    hp: [830, 5500], atk: [445, 2860], spd: [265, 395],
    abil: [{ t: "pimmune" }, { t: "agrav" }, { t: "aw" }, { t: "fatalkiller" }], subfs: "weaklock",
    ssName: "紅蓮総攻・カレンオーダー", ssTurns: 22, ssKind: "tsubaki",
    ssPow: "自強化（攻撃×1.8）＋ <b>味方全員で敵へ総攻撃（全員が動く・突撃中の直殴り×1.5）</b>",
    ssDesc: "<b>自強化して突撃（攻撃×1.8）</b>し、<b>撃ったその瞬間に号令</b>がかかって <b>味方全員が実際に動き出し</b>、最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×1.5</b>／壁で跳ねて何度も殴れて、味方どうしがふれれば<b>リンクスキルも連鎖</b>する） 総攻撃フルバースト",
    fsName: "クイックチャージショット", fsKind: "chargeshot", fsPow: "チャージ弾 攻撃力×2.4（最寄りの敵）",
    fsDesc: "パワーをためて、<b>ふれた味方が止まると近くの敵へ強力なチャージショット</b>を撃ち込む",
  },
  alicia: {
    id: "alicia", nm: "アリシア", img: "Alicia.webp", th: "t_Alicia.webp", el: "dark", shot: "pierce", type: "超短縮型", gacha: true, lux: true, nexus: "ignition",
    hp: [845, 5490], atk: [455, 2910], spd: [300, 438],
    abil: [{ t: "destroyboost" }, { t: "aslow" }, { t: "darkmatch" }, { t: "regenM" }, { t: "barrierM" }, { t: "auraM" }], subfs: "accel",
    ssName: "オールクリア・アビス", ssTurns: 12, ssKind: "alicia",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ 全ギミック無効化（DW・重力バリア・ワープ・地雷・ブロック）＋ <b>自分を反射化</b> を <b>次の自分のターンを終えるまで</b> 継続",
    ssDesc: "<b>自強化して突撃（攻撃×1.7・スピード×1.2）</b>し、<b>ダメージウォール・重力バリア・ワープ・地雷・ブロックをすべて無効化</b>。さらに<b>自分が反射化</b>して敵や壁で跳ね返るようになり、同じ敵に何度も当てて削り倒せる。これらは<b>次の自分のターンを終えるまで持続</b>する！",
    fsName: "ハイプラズマ", fsKind: "hiplasma", fsPow: "プラズマ 1ヒット 攻撃力×0.5（画面端まで伸びる）",
    fsDesc: "自分と触れた味方の間に<b>画面端まで伸びる巨大なプラズマ</b>を走らせて攻撃する",
  },
  mizuki: {
    /* MagiLex の報酬キャラ（ガチャ排出なし）。
       ★★ 2026-08-26 ご指定により<b>大幅に上方修正</b>し、KP交換キャラ5体の1体になった。
       ------------------------------------------------------------
       直した中身:
         ・ステータスを最新のSSR帯へ（HP 5,510 → 6,410 ／ 攻撃 2,900 → 3,500）
         ・アンチは<b>2種ちょうど</b>に整理（超ADW＋超アンチ減速壁）
           ＝ 蓬莱の九重・<b>第二重（水 {dw,slowwall}）の必要アンチとぴったり一致</b>する。
           4種ばらばらに持っていたころは、どのクエストの答えにもなっていなかった。
         ・キラーを 属性キラーM → <b>水属性キラーEL＋蓬莱族キラーL</b>（2枚）に
         ・サブリンクを ディバインピラー → 共通の<b>ノウレッジ・レゾナンス</b>へ
         ・リンクスキルを ルミナスレイ → <b>超強ルミナスレイ</b>へ（砲台4基→" + SLUMI_N + "基・威力も大幅増）
         ・ネクサスを ウィズダム → <b>アカデミー・フォース</b>（味方全員の攻撃力 +11%）へ
       ★ 入手は MagiLex の<b>KP交換所（80KP）</b>。完全習得のマイルストーンでの配布は
         2026-08-26 に終わり、KP交換にひとまとめにした。
       ★ 所持・限界突破は xeva_gacha_v1 で全アプリ共有（XEVARIONアイコン・MagiBattle でも使用可）。 */
    id: "mizuki", nm: "ミズキ", img: "Mizuki.webp", th: "t_Mizuki.webp",
    el: "wood", shot: "pierce", type: "翠光審判型", lux: true, reward: true, lexchar: true, nexus: "lexforce", star5: true,
    hp: [968, 6410], atk: [552, 3500], spd: [305, 452],
    abil: [{ t: "superadw" }, { t: "superaslow" },
           { t: "killerEL", el: "water" }, { t: "houraikillerL" }, { t: "barrierEL" }, { t: "regenL" }],
    subfs: "knowledgeresonance",
    ssName: "翠光審判・セイクリッドヴァーディクト", ssTurns: 14, ssKind: "mizuki",
    ssPow: "自強化（攻撃×1.6・スピード×1.2）＋ ふれた敵の<b>攻撃ターンを+2遅延（即死ターンも+2）</b> ＋ ふれた敵の<b>攻撃力・防御力ダウン（4ターン）</b>",
    ssDesc: "<b>翠の光をまとって自強化（攻撃×1.6・スピード×1.2）</b>。"
      + "このショット中に<b>ふれた敵すべての攻撃ターンを+2遅らせ（即死攻撃のカウントも+2）、"
      + "攻撃力と防御力を4ターンの間大きくダウン</b>させる。妨害しながら削れる知略型フルバースト。"
      + "<br><b>超アンチダメージウォール・超アンチ減速壁</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第二重（水）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>。"
      + "そこへ<b>水属性キラーEL（×" + KILLER_EL_MUL + "）</b>と<b>蓬莱族キラーL</b>が重なる、第二重の最適解。"
      + "<br><b>バリアEL</b>と<b>リジェネL</b>で前にも出られる。"
      + "<br>★ ネクサスは<b>アカデミー・フォース</b>——味方全員の攻撃力が<b>11%</b>アップする"
      + "（ふつうのフォース・ネクサスの約2倍）。編成のいちばん左に置くだけでチーム全体が伸びる。",
    fsName: "超強ルミナスレイ", fsKind: "superluminous",
    fsPow: "砲台1基のレーザー 攻撃力×" + SLUMI_MUL + "（貫通・最大" + SLUMI_N + "基・レーザーがさらに極太）",
    fsDesc: "ルミナスレイの上位。設置できる砲台が<b>4基 → " + SLUMI_N + "基</b>に増え、"
      + "レーザーは<b>威力も当たり判定の太さも大幅に強化</b>（×0.95 → <b>×" + SLUMI_MUL + "</b>）。"
      + "ふれた味方がぶつかった壁に砲台が並び、その味方が止まった瞬間に<b>盤面をまるごと貫く光の網</b>が走る",
  },
  natsuki: {
    id: "natsuki", nm: "ナツキ", img: "Natsuki.webp", th: "t_Natsuki.webp", el: "fire", shot: "bounce", type: "毒華強襲型", gacha: true, lux: true, nexus: "sweep",
    hp: [815, 5400], atk: [450, 2880], spd: [275, 405],
    abil: [{ t: "omni" }, { t: "poisonkillerM" }, { t: "firstkillerM" }, { t: "killer", el: "wood" }, { t: "drain" }], subfs: "boundcharge",
    ssName: "焔華繚乱・スカーレットヴェノム", ssTurns: 18, ssKind: "natsuki",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ ふれた敵を<b>毒状態（4ターン）</b> ＋ <b>弱点ヒットでさらに大ダメージ（×1.6）</b>",
    ssDesc: "<b>紅蓮の華をまとって自強化（攻撃×1.8・スピード×1.2）</b>。このショット中に<b>ふれた敵すべてを毒状態（4ターン）</b>にし、<b>弱点に当てるとさらに×1.6の大ダメージ</b>。毒キラーMとの相性は最凶！",
    fsName: "ハイクロススティンガー", fsKind: "hicross",
    fsPow: "貫通弾" + HICROSS_N + "本 × 攻撃力×" + HICROSS_PER + "（左右へ展開 → 近くの敵へ折り返す）",
    fsDesc: "<b>左右へ十字の大槍をいっせいに展開</b>し、一定距離まで伸びたところで<b>近くの敵へ弧を描いて折り返し</b>、貫通しながら撃ち抜く。"
      + "<br>折り返す地点で<b>大きな十字の閃光</b>が出るので、どこで曲がるかがひと目で分かる",
  },
  /* ══ v8 新キャラ4体（アヤカは XEVARION CDK／制覇ミッション入手・共有／他3体はガチャSSR） ══ */
  ayaka: {
    id: "ayaka", nm: "アヤカ", img: "Ayaka.webp", th: "t_Ayaka.webp", el: "wood", shot: "bounce", type: "支援型", lux: true, cdk: true, nexus: "tempo",
    hp: [820, 5400], atk: [450, 2870], spd: [285, 415],
    abil: [{ t: "sgrav" }, { t: "msM" }, { t: "elemres", el: "water" }, { t: "dashM" }], subfs: "phoming",
    ssName: "ブルーミング・オーヴァル", ssTurns: 12, ssKind: "ayaka",
    ssPow: "自強化（攻撃×1.6・スピード×1.4）＋ このショット中に触れた味方をバブリー状態に（その味方の次の行動まで）",
    ssDesc: "<b>自強化して駆けまわり（攻撃×1.6・スピード×1.4）</b>、<b>ふれた味方を減速しにくいバブリー状態</b>にする。バブリーは<b>その味方が次に行動するまで</b>続くので、味方を長く走らせて手数を稼げる！",
    fsName: "オービタルエッジ", fsKind: "spinring", fsPow: "リング1ヒット 攻撃力×0.30（巨大リング7基・壁で反射）",
    fsDesc: "クリスタルの<b>巨大なリバウンドサークル7基</b>が回転・反射しながら広がり、周囲の敵を連続で切り裂く",
  },
  iroha: {
    id: "iroha", nm: "イロハ", img: "Iroha.webp", th: "t_Iroha.webp", el: "light", shot: "pierce", type: "支援砲撃型", gacha: true, lux: true, nexus: "bond",
    hp: [815, 5380], atk: [455, 2900], spd: [275, 405],
    abil: [{ t: "superadw" }, { t: "ablock" }, { t: "weakkiller" }, { t: "regenM" }, { t: "fsboostM" }], subfs: "accel",
    ssName: "ラディアント・レガリア", ssTurns: 14, ssKind: "iroha",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ <b>味方全員で敵へ総攻撃（全員が動く・突撃中の直殴り×1.5）</b>",
    ssDesc: "<b>自強化して突撃（攻撃×1.7・スピード×1.2）</b>し、<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×1.5</b>／壁で跳ねて何度も殴れて、味方どうしがふれれば<b>リンクスキルも連鎖</b>する） 号令型フルバースト。リンクブーストMで<b>リンクスキルの威力が2倍</b>！",
    fsName: "ハイエナジーサークル", fsKind: "energycircle", fsPow: "攻撃力×1.25（画面上のすべての敵）",
    fsDesc: "巨大なエネルギーの輪が広がり、<b>画面上のすべての敵</b>を攻撃する",
  },
  shirayuki: {
    id: "shirayuki", nm: "シラユキ", img: "Shirayuki.webp", th: "t_Shirayuki.webp", el: "fire", shot: "bounce", type: "総攻撃型", gacha: true, lux: true, nexus: "advantage",
    hp: [800, 5300], atk: [460, 2920], spd: [285, 415],
    abil: [{ t: "sgrav" }, { t: "supermsM" }, { t: "elemres", el: "wood" }, { t: "killer", el: "wood" }], subfs: "blast",
    ssName: "クリムゾン・ブリザード", ssTurns: 10, ssKind: "shirayuki",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ 貫通タイプになる（壁に触れると反射タイプに戻る）",
    ssDesc: "<b>自強化して突撃（攻撃×1.7・スピード×1.2）</b>し、<b>貫通タイプに変化</b>して敵をすり抜けながら削る。<b>壁に触れると反射タイプに戻る</b>ので、貫通と反射を使い分けて暴れられる短ターン型フルバースト！",
    fsName: "スパークバレット", fsKind: "sparkbullet", fsPow: "30発 × 攻撃力×0.22（拡散する反射弾で近くの敵を攻撃）",
    fsDesc: "<b>30発の強力な貫通する反射弾</b>を放ち、近くの敵をまとめて攻撃する",
  },
  mashiro: {
    id: "mashiro", nm: "マシロ", img: "Mashiro.webp", th: "t_Mashiro.webp", el: "wood", shot: "pierce", type: "技巧型", gacha: true, lux: true, nexus: "guard",
    hp: [860, 5650], atk: [440, 2820], spd: [270, 400],
    abil: [{ t: "superaw" }, { t: "antilock" }, { t: "superadw" }, { t: "protection" }, { t: "vitalL" }, { t: "drain" }], subfs: "roundcharge",
    ssName: "ピュアホワイト・ガードルーン", ssTurns: 14, ssKind: "mashiro",
    ssPow: "自強化（攻撃×1.7・スピード×1.15）＋ 防御力アップ（被ダメ半減）を自分の次の行動まで継続",
    ssDesc: "<b>自強化して突撃（攻撃×1.7・スピード×1.15）</b>し、同時に<b>防御力を大きくアップ（チームの被ダメージを半減）</b>。この防御アップは<b>自分の次の行動まで持続</b>する堅守型フルバースト！",
    fsName: "クロス分身弾", fsKind: "cross", fsPow: "分身" + CC_CLONES + "体 1ヒット 攻撃力×" + CC_PER + "（壁で反射・貫通・止まるまで）",
    fsDesc: "ふれた瞬間に<b>" + CC_CLONES + "体の分身</b>を放出。分身は<b>壁で反射しながらフィールドを動きまわり、敵を貫通して削り続ける</b>（止まるまで）",
  },
  /* ══ v9 プレミアムガチャSSR 4体（コハル・ユリ・ホタル・リンネ） ══ */
  hotaru: {
    id: "hotaru", nm: "ホタル", img: "Hotaru.webp", th: "t_Hotaru.webp", el: "wood", shot: "pierce", type: "支援砲撃型", gacha: true, lux: true, nexus: "pierce",
    hp: [820, 5400], atk: [455, 2900], spd: [275, 405],
    abil: [{ t: "ms" }, { t: "adw" }, { t: "allkiller" }, { t: "weakkillerM" }], subfs: "boundcharge",
    ssName: "ルシオル・ブレイズ", ssTurns: 16, ssKind: "hotaru",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ このショット中に触れた敵の弱点を一定期間すべて出現させる",
    ssDesc: "<b>自強化して駆けまわり（攻撃×1.7・スピード×1.2）</b>、<b>ふれた敵に弱点コアを出現させる</b>。弱点の無い敵にも弱点を作り出し、弱点キラーMで一気に大ダメージを狙える砲撃型フルバースト！",
    fsName: "ピアスシーカー12", fsKind: "homing", fsPow: "12発 × 攻撃力×" + PSEEKER_PER + "（敵を追尾しながら貫通・1体につき1ヒット）",
    fsDesc: "敵を追尾しながら<b>貫通していく光弾を12発</b>放つ",
  },
  koharu: {
    id: "koharu", nm: "コハル", img: "Koharu.webp", th: "t_Koharu.webp", el: "light", shot: "bounce", type: "アタッカー型", gacha: true, lux: true, nexus: "vanguard",
    hp: [830, 5480], atk: [460, 2920], spd: [280, 410],
    abil: [{ t: "sgrav" }, { t: "superadw" }, { t: "vitalM" }, { t: "sscharge" }], subfs: "boundcharge",
    ssName: "オーロラ・エッジ", ssTurns: 14, ssKind: "koharu",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ このショット中に触れた敵の弱点倍率を一定期間大アップ",
    ssDesc: "<b>自強化して突撃（攻撃×1.7・スピード×1.2）</b>し、<b>ふれた敵の弱点ダメージを大きく増幅</b>する。弱点に当てるほど火力が跳ね上がるアタッカー型フルバースト！",
    fsName: "パワードライブ", fsKind: "laser", fsGlyph: "powerdrive", fsPow: "貫通衝撃波 攻撃力×1.15（十字方向の敵を撃ち抜く）",
    fsDesc: "壁を沿うように走る<b>強力な貫通衝撃波</b>で、十字方向に並んだ敵をまとめて撃ち抜く",
  },
  yuri: {
    id: "yuri", nm: "ユリ", img: "Yuri.webp", th: "t_Yuri.webp", el: "light", shot: "pierce", type: "総攻撃型", gacha: true, lux: true, nexus: "resonance",
    hp: [815, 5380], atk: [455, 2900], spd: [275, 405],
    abil: [{ t: "supermsL" }, { t: "superaw" }, { t: "killerM", el: "dark" }, { t: "soulM" }], subfs: "splitpierce",
    ssName: "ソレイユ・レガシー", ssTurns: 14, ssKind: "yuri",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ <b>味方全員で総攻撃（全員が動く・突撃中の直殴り×1.5）</b> ＋ 敵を倒すほど味方全員のパワーが一定期間アップ",
    ssDesc: "<b>自強化して突撃（攻撃×1.7・スピード×1.2）</b>し、<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×1.5</b>／壁で跳ねて何度も殴れて、味方どうしがふれれば<b>リンクスキルも連鎖</b>する）。さらに<b>敵を倒すたびに味方全員のパワーが上がっていく（最大×2.0）</b>連鎖型フルバースト！",
    fsName: "エナジースパーク", fsKind: "energycircle", fsGlyph: "energyspark", fsPow: "攻撃力×1.25（画面上のすべての敵）",
    fsDesc: "触れた味方に円状のエナジースパークが広がり、<b>画面上のすべての敵</b>を攻撃する",
  },
  rinne: {
    id: "rinne", nm: "リンネ", img: "Rinne.webp", th: "t_Rinne.webp", el: "water", shot: "bounce", type: "バランス型", gacha: true, lux: true, nexus: "vigor",
    hp: [840, 5550], atk: [465, 2960], spd: [285, 415],
    abil: [{ t: "sgrav" }, { t: "superaw" }, { t: "laserstop" }, { t: "wallboostL" }, { t: "overheat" }], subfs: "blast",
    ssName: "サーキュラー・アビス", ssTurns: 10, ssKind: "rinne",
    ssPow: "大幅に自強化（攻撃×2.2・スピード×1.4）",
    ssDesc: "<b>大幅に自強化（攻撃×2.2・スピード×1.4）</b>して暴れまわる、短ターン・高火力のバランス型フルバースト！ウォールブーストLで壁を使うほどさらに火力が伸びる。",
    fsName: "オービタルエッジ", fsKind: "spinring", fsPow: "リング1ヒット 攻撃力×0.30（巨大リング7基・壁で反射）",
    fsDesc: "<b>巨大なリバウンドサークル7基</b>が回転・反射しながら広がり、周囲の敵を連続で切り裂く",
  },
  /* ══ v10: 幽冥の庭園 降臨キャラ「ヘカーティア」 ══
     降臨キャラらしく、強すぎず弱すぎず。ギミック対応（ADW/AW）と安定した回復を持つ実用型。 */
  hecatia: {
    id: "hecatia", nm: "ヘカーティア", img: "Hecatia.webp", th: "t_Hecatia.webp", el: "dark", shot: "bounce", type: "バランス型", garden: true, lux: true, nexus: "vigor", star5: true,
    hp: [858, 5490], atk: [452, 2890], spd: [276, 404],
    abil: [{ t: "superadw" }, { t: "aslow" }, { t: "superaw" }, { t: "killerM", el: "light" }, { t: "regenM" }], subfs: "divinepillar",
    ssName: "幽冥招来・ヘカーティアノヴァ", ssTurns: 18, ssKind: "hecatia",
    ssPow: "自強化（攻撃×1.6・スピード×1.2）＋ 停止時に幽冥の大爆発（攻撃力×1.1・画面上のすべての敵）",
    ssDesc: "<b>幽冥の光をまとって自強化（攻撃×1.6・スピード×1.2）</b>し、<b>止まると庭園全体に大爆発</b>を起こして画面上のすべての敵を巻き込む。突出した尖り性能はないが、<b>ADW・AW・回復</b>をまとめて持つ扱いやすい降臨キャラ。",
    fsName: "ファントムサークル", fsKind: "energycircle", fsPow: "攻撃力×1.0（画面上のすべての敵）",
    fsDesc: "幽冥の輪が広がり、<b>画面上のすべての敵</b>をまとめて攻撃する",
  },
  /* ══ v10: プレミアムガチャSSR「レゼリア」 ══ */
  rezelia: {
    id: "rezelia", nm: "レゼリア", img: "Rezelia.webp", th: "t_Rezelia.webp", el: "wood", shot: "bounce", type: "アタッカー型", gacha: true, lux: true, nexus: "force",
    hp: [850, 5600], atk: [470, 3000], spd: [288, 420],
    abil: [{ t: "superadw" }, { t: "superaw" }, { t: "upkillerM" }, { t: "pray" }, { t: "drainM" }], subfs: "roundcharge",
    ssName: "ヴェルダント・アセンション", ssTurns: 16, ssKind: "rezelia",
    ssPow: "自強化（攻撃×1.5）＋ <b>敵にふれるたびにさらに×1.25（最大×10.0）</b>",
    ssDesc: "<b>自強化して突撃（攻撃×1.5・スピード×1.25）</b>し、<b>敵にふれるたびに攻撃力がどんどん上がっていく（最大×10.0）</b>。当てれば当てるほど爆発的に伸びる、超火力の成長型フルバースト！",
    fsName: "プラズマネット", fsKind: "plasmanet", fsPow: "網1本 1ヒット 攻撃力×0.30（味方4体を結ぶ・味方が止まるまで持続）",
    fsDesc: "このキャラにふれると、<b>4体の味方どうしをプラズマでつないで網を張り</b>、網にかかった敵を連続で攻撃し続ける",
  },
  /* ══ v11.3: プレミアムガチャSSR「エルシア」 ══ */
  elsia: {
    id: "elsia", nm: "エルシア", img: "Elsia.webp", th: "t_Elsia.webp", el: "light", shot: "pierce", type: "アタッカー型", gacha: true, lux: true, nexus: "aegis",
    hp: [860, 5680], atk: [465, 2960], spd: [280, 410],
    abil: [{ t: "superadw" }, { t: "ablock" }, { t: "allres" }, { t: "fsdouble" }, { t: "counterkiller" }], subfs: "accel",
    ssName: "セイクリッド・サクリファイス", ssTurns: 18, ssKind: "elsia",
    ssPow: "自強化（攻撃×1.6・スピード×1.2）＋ <b>チームHPを" + 0 + "…</b>",
    ssDesc: "",
    fsName: "ルミナスレイ", fsKind: "luminous", fsPow: "砲台1基のレーザー 攻撃力×0.95（貫通・最大4基）",
    fsDesc: "ふれた味方が<b>最初にぶつかった壁4か所に光の砲台を設置</b>し、その味方が止まると<b>砲台からまっすぐ貫通レーザー</b>が走って敵を撃ち抜く",
  },
  /* ══ v12: プレミアムガチャSSR「カリナ」「ネフィア」 ══ */
  karina: {
    id: "karina", nm: "カリナ", img: "Karina.webp", th: "t_Karina.webp", el: "dark", shot: "bounce", type: "技巧型", gacha: true, lux: true, nexus: "demolish",
    hp: [855, 5640], atk: [462, 2940], spd: [278, 408],
    abil: [{ t: "msM" }, { t: "sgrav" }, { t: "barrierM" }, { t: "wallboostM" }], subfs: "defdownblast",
    ssName: "叡智ノ浮環・ソフィアリング", ssTurns: 24, ssKind: "karina",
    ssPow: "その場に停止し、<b>狙った方向を中心に視野角180°</b>の敵すべてへ 叡智の浮き輪（毎ターン 最大HPの10%・4ターン継続 ＋ 防御力ダウン）",
    ssDesc: "<b>カリナはその場から動かず</b>、引っぱった<b>方向を中心とした視野角180°</b>の内側にいる敵すべてに<b>叡智の浮き輪</b>を装着。浮き輪をつけられた敵は<b>4ターンのあいだ毎ターン最大HPの10%を削られ</b>、さらに<b>防御力がダウン</b>する。長期戦をまるごとひっくり返す超遅延・超火力の妨害フルバースト！",
    fsName: "鋭角三方向追従型貫通弾", fsKind: "tri3followsharp", fsPow: "1発ごとに 攻撃力×0.30（味方が止まるまで撃ち続ける）",
    fsDesc: "<b>自分の位置から、ふれた味方へ向けて</b><b>鋭角にまとまった3方向の貫通弾</b>を発射。その味方が動いているあいだ、<b>いまいる場所へ狙いを付け直しながら撃ち続ける</b>",
  },
  /* ══ v13: プレミアムガチャSSR 5体（セツナ・セレネ・ナズナ・リリア・レヴィア） ══ */
  setsuna: {
    id: "setsuna", nm: "セツナ", img: "Setsuna.webp", th: "t_Setsuna.webp", el: "light", shot: "bounce", type: "支援型", gacha: true, lux: true, nexus: "mercy",
    hp: [860, 5680], atk: [455, 2900], spd: [292, 428],
    abil: [{ t: "superaw" }, { t: "ablock" }, { t: "fsboostL" }, { t: "dashL" }], subfs: "blast",
    ssName: "セイクリッド・ミラージュ", ssTurns: 12, ssKind: "setsuna",
    ssPow: "自強化（攻撃×1.8・スピード×1.3）＋ ふれた味方1体につき <b>チームHPを12%回復</b>",
    ssDesc: "<b>閃光をまとって自強化（攻撃×1.8・スピード×1.3）</b>し、<b>ふれた味方1体ごとにチームHPを12%回復</b>する。<b>ダッシュL（スピード×2.5）</b>で味方を次々になぞれるので、1ショットで大回復も狙える短ターン支援フルバースト！",
    fsName: "ハイプラズマ", fsKind: "hiplasma", fsPow: "プラズマ 1ヒット 攻撃力×0.5（画面端まで伸びる）",
    fsDesc: "自分と触れた味方の間に<b>画面端まで伸びる巨大なプラズマ</b>を走らせて攻撃する（リンクブーストLで威力2.5倍）",
  },
  selene: {
    id: "selene", nm: "セレネ", img: "Selene.webp", th: "t_Selene.webp", el: "water", shot: "bounce", type: "アタッカー型", gacha: true, lux: true, nexus: "advantage",
    hp: [850, 5600], atk: [468, 2980], spd: [285, 418],
    abil: [{ t: "adw" }, { t: "antilock" }, { t: "ablock" }, { t: "killer", el: "fire" }, { t: "sscharge" }], subfs: "accel",
    ssName: "ルナティック・ピアース", ssTurns: 18, ssKind: "selene",
    ssPow: "自強化（攻撃×1.9・スピード×1.25）＋ <b>貫通タイプ</b>になって敵を激しく貫く ＋ 停止後に<b>最も近い敵へ再走</b>（攻撃×2.6）",
    ssDesc: "<b>自強化して貫通タイプに変化</b>（攻撃×1.9・スピード×1.25）し、敵をまとめて貫く。<b>止まると最も近い敵へ向かってもう一度走り出し（再走：攻撃×2.6）</b>、さらに深く抉る2段構えの超火力フルバースト！",
    fsName: "コピー", fsKind: "copy", fsPow: "ふれた味方のリンクスキルを<b>セレネの水属性・セレネのキラー</b>で発動（威力そのまま）",
    fsDesc: "<b>ふれた味方が持っているリンクスキルをそのままコピー</b>して発動する。"
      + "撃つのは相手のリンクでも、<b>属性はセレネの水属性</b>・<b>キラーもセレネのもの</b>が乗るので、"
      + "<b>水が有利な相手に、火属性キラーを乗せた強力なリンクを撃ちこめる</b>",
  },
  nazuna: {
    id: "nazuna", nm: "ナズナ", img: "Nazuna.webp", th: "t_Nazuna.webp", el: "fire", shot: "pierce", type: "壁撃型", gacha: true, lux: true, nexus: "charge",
    hp: [870, 5740], atk: [462, 2940], spd: [278, 408],
    abil: [{ t: "ablock" }, { t: "sgrav" }, { t: "barrierM" }, { t: "fbshort" }, { t: "darkmatch" }], subfs: "discharge",
    ssName: "インフェルノ・ランページ", ssTurns: 20, ssKind: "nazuna",
    ssPow: "自強化（攻撃×1.6）＋ <b>壁にふれるたびパワーUP（最大×10.0）</b> ＋ <b>撃った瞬間に味方全員で総攻撃（全員が動く・突撃中の直殴り×1.5）</b>",
    ssDesc: "<b>自強化して飛び出し（攻撃×1.6）</b>、<b>壁にぶつかるたびに紅蓮の力がふくらんでいく（最大×10.0）</b>。<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×1.5</b>／壁で跳ねて何度も殴れて、味方どうしがふれれば<b>リンクスキルも連鎖</b>する）——自分は壁で力を溜めながら、味方は同じショットの中で殴り込む最大火力の総攻撃フルバースト！",
    fsName: "オートジャベリンバースト", fsKind: "javelin", fsPow: "貫通爆破弾8発（各 攻撃力×0.42・着弾で爆発）",
    fsDesc: "ふれた味方に<b>8本の自動追尾ジャベリン</b>を装填。<b>近くの敵を貫通しながら突き刺さり、着弾のたびに爆発</b>する",
  },
  lilia: {
    id: "lilia", nm: "リリア", img: "Lilia.webp", th: "t_Lilia.webp", el: "wood", shot: "pierce", type: "技巧型", gacha: true, lux: true, nexus: "scout",
    hp: [845, 5580], atk: [470, 3000], spd: [288, 422],
    abil: [{ t: "msM" }, { t: "antilock" }, { t: "ablock" }, { t: "fbtouch" }, { t: "dash" }, { t: "combokillerM" }], subfs: "pspread5",
    ssName: "ヴェルダント・カスケード", ssTurns: 16, ssKind: "lilia",
    ssPow: "自強化（攻撃×1.7・スピード×1.3）＋ 停止後に<b>ふれた敵の数だけ威力が増すメテオ</b>で追い打ち（1体につき 攻撃力×0.9・最大12発）",
    ssDesc: "<b>自強化して貫き進み（攻撃×1.7・スピード×1.3）</b>、<b>止まると「そのショットでふれた敵の数」に応じた翠のメテオ</b>が降りそそぐ。<b>連撃キラーM</b>と噛み合わせて同じ敵を擦り続ければ、追い打ちも本体も跳ね上がる！",
    fsName: "リレーションカッター", fsKind: "relaycut", fsPow: "カッター1ヒット 攻撃力×0.34（味方の位置を順にめぐる・味方が止まるまで）",
    fsDesc: "<b>味方の位置を順番に渡り歩くカッター</b>を放つ。<b>ふれた味方が止まるまで</b>みんなの間を巡回し続けて敵を切り刻む",
  },
  revia: {
    id: "revia", nm: "レヴィア", img: "Revia.webp", th: "t_Revia.webp", el: "dark", shot: "pierce", type: "アタッカー型", gacha: true, lux: true, nexus: "slayer",
    hp: [865, 5700], atk: [475, 3030], spd: [282, 414],
    abil: [{ t: "superadw" }, { t: "supermsL" }, { t: "judgment" }, { t: "infinitybreakM" }, { t: "fewfoeM" }], subfs: "nebula",
    ssName: "アビス・レクイエム", ssTurns: 20, ssKind: "revia",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>撃った瞬間に味方全員で総攻撃（全員が動く・突撃中の直殴り×1.5）</b> ＋ ふれた敵の<b>弱点倍率を大アップ</b>",
    ssDesc: "<b>深淵の力で自強化（攻撃×1.8・スピード×1.2）</b>し、<b>このショットでふれた敵の弱点ダメージを大きく増幅</b>。<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×1.5</b>／壁で跳ねて何度も殴れて、味方どうしがふれれば<b>リンクスキルも連鎖</b>する） ので、増幅した弱点へ総攻撃を叩き込める決定力の塊！",
    fsName: "ブレイドオービット", fsKind: "bladeorbit", fsPow: "剣1ヒット 攻撃力×0.30（6本・味方が止まるまで高速回転）",
    fsDesc: "ふれた味方の<b>まわりを6本の剣が高速で回転</b>し、<b>その味方が止まるまで</b>触れた敵を斬り続ける",
  },
  nephia: {
    id: "nephia", nm: "ネフィア", img: "Nephia.webp", th: "t_Nephia.webp", el: "light", shot: "pierce", type: "支援砲撃型", gacha: true, lux: true, nexus: "tempo",
    hp: [845, 5570], atk: [468, 2980], spd: [284, 414],
    abil: [{ t: "superaw" }, { t: "sgrav" }, { t: "fsdouble" }, { t: "fbaccel" }, { t: "mobkiller" }], subfs: "roundcharge",
    ssName: "ルミエル・アセンション", ssTurns: 20, ssKind: "nephia",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ <b>ふれた味方のパワーを×2.0</b>（その味方が2回行動するまで）",
    ssDesc: "<b>聖光をまとって自強化（攻撃×1.7・スピード×1.2）</b>し、<b>このショット中にふれた味方すべてのパワーを×2.0</b>に引き上げる。強化は<b>その味方が2回行動し終えるまで</b>続くので、味方の大技に合わせて撃ちこめば一気に決着がつく最上級の支援フルバースト！",
    fsName: "スパイラルリバウンド", fsKind: "spiral", fsPow: "螺旋1ヒット 攻撃力×0.30（サークル6基・味方が止まるまで持続）",
    fsDesc: "ふれた瞬間に<b>六方向へサークルを発射</b>。それぞれ<b>最初にふれた敵の位置</b>から、<b>ふれた味方を中心にした螺旋の軌道</b>へ乗り移り、<b>その味方が止まるまで</b>回りながら敵を削り続ける",
  },
  /* ══════════════════════════════════════════════════════════════
     v14: Nocturne Bloom Fest 限定SSR（フィオナ・ミルフィ・メイベル・アビス・アーク）
     ・フェスガチャでのみ排出（プレミアムには出ない）
     ・サブリンクは全員「アブソリュートレイ10」で統一（v14で大幅強化）
     ══════════════════════════════════════════════════════════════ */
  fiona: {
    id: "fiona", nm: "フィオナ", img: "Fiona.webp", th: "t_Fiona.webp", el: "water", shot: "pierce", type: "集結砲撃型", fes: true, lux: true, nexus: "gale",
    hp: [880, 5800], atk: [488, 3110], spd: [292, 428],
    abil: [{ t: "msEL" }, { t: "sgrav" }, { t: "killerM", el: "fire" }, { t: "dashL" }, { t: "lightning" }], subfs: "absoluteray",
    /* ★ 2026-08-07: フルバーストを<b>フィアと同じもの</b>に変更した（ssKind: "fiona" → "fia"）。
       旧「アクアリウム・ラプチャー」は<b>ショットが終わってから</b>味方を集める形だったが、
       集まった直後は自分の手番が終わっているので、そのターンのうちにリンクを起こせなかった。
       フィア型は<b>撃つ前に集める</b>ので、集めた味方の間をそのまま走り抜けてリンクを一気に繋げる。
       ★ 技名はフィオナのまま（見た目・演出も従来どおり）。中身だけをフィアと同じにしてある。 */
    ssName: "アクアリウム・ラプチャー", ssTurns: 14, ssKind: "fia",
    ssPow: "自強化（攻撃×1.6・スピード×1.3）＋ <b>撃つ前に味方全員を自分のまわりへ集める</b>",
    ssDesc: "<b>撃ち出す前に、味方全員を自分のまわりへ呼び寄せる</b>のがこのフルバーストの核心（<b>フィアと同じフルバースト</b>）。"
      + "集まった味方の間を<b>自強化した貫通（攻撃×1.6・スピード×1.3）</b>で走り抜ければ、リンクスキルを一度にまとめて起こせる。"
      + "<b>ダッシュL（スピード×" + DASHL_MUL + "）</b>を自前で持っているので、集めたあとに走れる距離が長く、"
      + "1ショットで拾える味方の数がフィアよりさらに多いのが持ち味。",
    fsName: "チャームプラズマ", fsKind: "charmplasma", fsPow: "プラズマ弾7本 1ヒット 攻撃力×0.34（味方が止まるまで画面全体へ拡散）",
    fsDesc: "<b>7本のプラズマ弾が分裂</b>して画面全体へ拡散し、<b>ふれた味方が止まるまで</b>跳ね回りながら敵を撃ち続ける",
  },
  milfy: {
    id: "milfy", nm: "ミルフィ", img: "Milfy.webp", th: "t_Milfy.webp", el: "fire", shot: "bounce", type: "無敵支援型", fes: true, lux: true, nexus: "aegis",
    hp: [905, 5960], atk: [478, 3050], spd: [280, 412],
    abil: [{ t: "superadw" }, { t: "antilock" }, { t: "ablock" }, { t: "atkturnkillerM" }, { t: "regenM" }, { t: "mirage" }], subfs: "absoluteray",
    ssName: "フランベ・レガリア", ssTurns: 18, ssKind: "milfy",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ ふれた味方を<b>ステータス×1.8</b>＋<b>無敵</b>（どちらも<b>各自1行動目まで</b>）",
    ssDesc: "<b>紅蓮の加護をまとって自強化（攻撃×1.8・スピード×1.2）</b>し、<b>このショット中にふれた味方すべてのステータスを×1.8</b>に引き上げる。この強化は<b>その味方がそれぞれ1回行動し終えるまで</b>続く。さらに<b>ふれた味方は同じあいだ無敵</b>になり、<b>あらゆるダメージを無効化</b>する。ボスの即死攻撃すら真正面から受け切れる、最強クラスの守りのフルバースト！",
    fsName: "フェニックスフレア", fsKind: "phoenixflare", fsPow: "炎の鳥4羽 1ヒット 攻撃力×0.40（味方が止まるまで画面上を飛び回る）",
    fsDesc: "<b>4羽の不死鳥</b>が画面上をランダムに飛び回り、<b>ふれた味方が止まるまで</b>触れた敵を焼き続ける",
  },
  mabel: {
    id: "mabel", nm: "メイベル", img: "Mabel.webp", th: "t_Mabel.webp", el: "wood", shot: "bounce", type: "壁撃技巧型", fes: true, lux: true, nexus: "resonance",
    hp: [890, 5870], atk: [492, 3140], spd: [286, 420],
    abil: [{ t: "sgrav" }, { t: "ablock" }, { t: "fsdouble" }, { t: "sscharge" }, { t: "linkcharge" }], subfs: "absoluteray",
    ssName: "ヴェルダン・インフィニート", ssTurns: 22, ssKind: "mabel",
    ssPow: "自強化（攻撃×1.7）＋ <b>壁にふれるたびステータスUP（最大×10.0）</b>＋ ふれた味方を各自1行動目までバブリー ＋ ふれた敵の攻撃ターン+2（<b>即死ターンも+2</b>）",
    ssDesc: "<b>翡翠の力で自強化（攻撃×1.7）</b>し、<b>壁にふれるたびにステータスがどんどん上がっていく（最大×10.0）</b>。さらに<b>自分とふれた味方を各自1行動目までバブリー状態</b>にして走り続けられるようにし、<b>ふれた敵の攻撃ターンを2ターン遅らせる（即死攻撃のカウントも2ターン遅れる）</b>。壁を使い込むほど強くなる、攻防一体の最上級フルバースト！",
    fsName: "インフィニティレーザー", fsKind: "infinitylaser", fsPow: "本体 攻撃力×1.6 ＋ 着弾から八方分裂レーザー 各 攻撃力×0.55",
    fsDesc: "<b>最も近い敵へ超極太レーザー</b>を放ち、<b>着弾した地点から八方向へ分裂レーザー</b>を撃ち出して周囲をまとめて薙ぎ払う",
  },
  abyss: {
    id: "abyss", nm: "アビス", img: "Abyss.webp", th: "t_Abyss.webp", el: "dark", shot: "pierce", type: "雷撃強襲型", fes: true, lux: true, nexus: "slayer",
    hp: [875, 5770], atk: [500, 3190], spd: [290, 426],
    abil: [{ t: "superaw" }, { t: "msEL" }, { t: "weakkillerL" }, { t: "auraM" }, { t: "bubblemode" }, { t: "cumulonimbus" }], subfs: "absoluteray",
    ssName: "ヴォイド・サンダーレイド", ssTurns: 16, ssKind: "abyss",
    ssPow: "自強化（攻撃×1.9・スピード×1.3）＋ <b>ダメージウォール・重力バリアを無効化</b>＋ <b>壁をすり抜けて反対側から出現</b>＋ 敵にふれるたび落雷（攻撃力×1.1）",
    ssDesc: "<b>虚無の雷をまとって自強化（攻撃×1.9・スピード×1.3）</b>。このショット中は<b>ダメージウォールと重力バリアを完全に無効化</b>し、さらに<b>画面の端をすり抜けて反対側の壁から出現</b>する（＝止まらずに走り続けられる）。<b>敵にふれるたびに落雷で追い打ち</b>を加える、圧倒的な機動力の強襲フルバースト！",
    fsName: "ウォールサーキットリング", fsKind: "wallcircuit", fsPow: "リング7基 1ヒット 攻撃力×0.36（味方が止まるまで壁沿いを旋回）",
    fsDesc: "<b>7つのリングが画面の壁沿いをぐるりと旋回</b>し、<b>ふれた味方が止まるまで</b>周回しながら触れた敵を削り続ける",
  },
  arche: {
    id: "arche", nm: "アーク", img: "Arche.webp", th: "t_Arche.webp", el: "light", shot: "bounce", type: "爆撃殲滅型", fes: true, lux: true, nexus: "force",
    hp: [895, 5900], atk: [496, 3165], spd: [284, 418],
    abil: [{ t: "superadw" }, { t: "ablock" }, { t: "fbshort" }, { t: "vitalEL" }, { t: "phantomdrive" }], subfs: "absoluteray",
    ssName: "ルクス・カタストロフ", ssTurns: 20, ssKind: "arche",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>最初にふれた敵で超大爆発（攻撃力×14.0・周囲の敵を巻き込む）</b>",
    ssDesc: "<b>聖光をまとって自強化（攻撃×1.8・スピード×1.2）</b>し、<b>そのショットで最初にふれた敵の位置で超強力な大爆発</b>を起こす。爆発は<b>周囲の敵すべてを巻き込んで大ダメージ（攻撃力×14.0／距離で減衰）</b>。雑魚をまとめて吹き飛ばしつつボスにも刺さる、殲滅特化のフルバースト！",
    fsName: "オートエイムビット", fsKind: "autoaimbit", fsPow: AIMBIT_POW,
    fsDesc: "ふれた味方の<b>まわりに追従する小型ビットを4個</b>付与。ビットは<b>移動中ずっと近くの敵へ自動で属性弾を連射</b>し、<b>その味方が止まるまで</b>攻撃し続ける",
  },
  /* ══════════════════════════════════════════════════════════════
     v14.5: プレミアムセレクトガチャ 新SSR「クロエ」
     ・貫通／水属性。アンチ・キラーを大量に積んだ万能アタッカー
     ・フルバースト「ホロックス・オーシャン」は
       ① 自分が2回行動し終えるまで ステータスアップ
       ② 同じあいだ すべてのアンチギミックを無効化
       ③ 停止後、画面いっぱいに海を展開してシャチを召喚 → 巨大なシャチに乗って再攻撃
     ══════════════════════════════════════════════════════════════ */
  chloe: {
    id: "chloe", nm: "クロエ", img: "Chloe.webp", th: "t_Chloe.webp", el: "water", shot: "pierce", type: "深海制圧型", gacha: true, lux: true, nexus: "sweep",
    hp: [890, 5860], atk: [494, 3150], spd: [288, 424],
    abil: [{ t: "supermsEL" }, { t: "agrav" }, { t: "ablock" }, { t: "fatalkillerM" }, { t: "poisonkillerM" }, { t: "allkiller" }, { t: "bubblemode" }], subfs: "poisoncurrent",
    ssName: "ホロックス・オーシャン", ssTurns: 24, ssKind: "chloe",
    ssPow: "自分が<b>2回行動し終えるまで</b> ステータスアップ（攻撃×1.9・スピード×1.35）＋ <b>すべてのアンチギミックを無効化</b>　／　停止後に<b>海を展開してシャチを召喚</b>（1体 攻撃力×" + CHLOE_SEA_HITS + "）し、<b>巨大なシャチに乗って再攻撃</b>（体当たり×" + CHLOE_SEA_MUL + "）",
    ssDesc: "<b>蒼の潮をまとって自強化（攻撃×1.9・スピード×1.35）</b>し、同時に<b>ダメージウォール・ワープ・地雷・ブロック・重力バリア・ロックゾーンのすべてを無効化</b>する。"
      + "この2つは<b>どちらも「自分が2回行動し終えるまで」続く</b>ので、ギミックを完全に無視して2ターン走り回れる。"
      + "さらに<b>止まると画面いっぱいに海が広がり、シャチの群れが敵を食い破る</b>。"
      + "最後は<b>巨大なシャチに乗って自動でもう一度突撃</b>し（体当たり<b>×" + CHLOE_SEA_MUL + "</b>）、1回のフルバーストで2度殴り込む制圧型の切り札！",
    fsName: "ホロックスストリーム", fsKind: "holoxstream", fsPow: "ホログラムのシャチ" + CHLOE_ORCAS + "体 1ヒット 攻撃力×" + CHLOE_ORCA_PER + "（壁で反射・だんだん加速・味方が止まるまで）",
    fsDesc: "<b>青いホログラムのシャチ" + CHLOE_ORCAS + "体</b>が高速で泳ぎ出し、<b>壁に当たるたびに反射しながらどんどん加速</b>していく。<b>ふれた味方が止まるまで</b>バトル画面を泳ぎ回り、通りがかった敵を食らい続ける",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ v16: プレミアムセレクトガチャ 新SSR 6体
       シェリル（水/反射）・フィア（水/貫通）・リセラ（火/反射）
       ソレリア（火/貫通）・ベルティア（木/反射）・アステラ（木/貫通）
     ・6体とも新アビリティ「超アンチ減速壁」まわりを軸にしている
       （減速壁は 2026-08-03 に足したばかりで、対策キャラが足りていなかった）
     ・リンクスキルは「既存の強化版3種（超強ハイプラズマ／超強ハイクロス／連気弾）」＋
       「新規3種（クロス分身弾／ツインインボリュートスフィア／コピー流用）」
     ══════════════════════════════════════════════════════════════ */
  sheril: {
    id: "sheril", nm: "シェリル", img: "Sheril.webp", th: "t_Sheril.webp",
    el: "water", shot: "bounce", type: "碧渚制圧型", gacha: true, lux: true, nexus: "bond",
    hp: [880, 5810], atk: [488, 3120], spd: [286, 420],
    abil: [{ t: "sgrav" }, { t: "aslow" }, { t: "upkillerM" }, { t: "gravkiller" }, { t: "fbshort" }], subfs: "alllock3",
    ssName: "セイレーン・タイドコール", ssTurns: 20, ssKind: "sheril",
    ssPow: "自強化（攻撃×1.8・スピード×1.25）＋ <b>味方全員で総攻撃</b>＋ <b>ふれた敵の弱点倍率アップ</b>（6ターン）",
    ssDesc: "<b>碧い潮をまとって自強化（攻撃×1.8・スピード×1.25）</b>し、撃ったその瞬間に<b>味方全員がいっせいに突っ込む総攻撃</b>を号令する。"
      + "さらに<b>このショット中にふれた敵は弱点倍率が大アップ</b>（6ターン）——総攻撃で開いた弱点を、そのまま全員で叩ける。"
      + "<b>重力バリアキラー</b>と<b>超アンチ重力バリア</b>を併せ持つので、重力バリアだらけの部屋ほど強い。",
    fsName: "超強ハイプラズマ", fsKind: "superhiplasma", fsPow: "プラズマ 1ヒット 攻撃力×0.85（味方が止まるまで持続・当たり幅が広い）",
    fsDesc: "自分と触れた味方の間に<b>ハイプラズマをさらに極太にした閃光</b>を走らせる。<b>当たり判定の幅が広い</b>ので、多少ズレていても巻き込める",
  },
  fia: {
    id: "fia", nm: "フィア", img: "Fia.webp", th: "t_Fia.webp",
    el: "water", shot: "pierce", type: "氷結支援型", gacha: true, lux: true, nexus: "ignition",
    hp: [872, 5760], atk: [480, 3070], spd: [292, 428],
    abil: [{ t: "agrav" }, { t: "superaslow" }, { t: "killerM", el: "fire" }, { t: "dashM" }, { t: "healM" }], subfs: "fbburst4",
    ssName: "フロストベル・ラリー", ssTurns: 10, ssKind: "fia",
    ssPow: "自強化（攻撃×1.6・スピード×1.3）＋ <b>撃つ前に味方全員を自分のまわりへ集める</b>",
    ssDesc: "<b>撃ち出す前に、味方全員を自分のまわりへ呼び寄せる</b>のがこのフルバーストの核心。"
      + "集まった味方の間を<b>自強化した貫通（攻撃×1.6・スピード×1.3）</b>で走り抜ければ、リンクスキルを一度にまとめて起こせる。"
      + "<b>10ターン</b>と回転が速く、<b>超アンチ減速壁</b>で減速壁の部屋でも足が止まらない。",
    fsName: "コピー", fsKind: "copy", fsPow: "ふれた味方のリンクスキルを<b>フィアの水属性・フィアのキラー</b>で発動（威力そのまま）",
    fsDesc: "<b>ふれた味方のリンクスキルを写し取って</b>放つ。"
      + "属性は<b>フィアの水属性</b>、<b>キラーもフィアのもの（火属性キラーM）</b>が乗る。"
      + "組み合わせる相手しだいで役割が変わる、支援の万能札",
  },
  lysera: {
    id: "lysera", nm: "リセラ", img: "Lysera.webp", th: "t_Lysera.webp",
    el: "fire", shot: "bounce", type: "灼熱連撃型", gacha: true, lux: true, nexus: "force",
    hp: [886, 5850], atk: [492, 3140], spd: [284, 418],
    abil: [{ t: "ablock" }, { t: "superaslow" }, { t: "killerM", el: "wood" }, { t: "regenM" }, { t: "wallfbshort" }], subfs: "alllock3",
    ssName: "ソラーレ・ブレイズラン", ssTurns: 20, ssKind: "lysera",
    ssPow: "自強化（攻撃×1.7・スピード×1.25）＋ <b>敵にふれるたびさらに ×1.25</b>（最大 <b>×10.0</b>）",
    ssDesc: "<b>灼熱をまとって自強化（攻撃×1.7・スピード×1.25）</b>し、そこから<b>敵にふれるたびに威力が ×1.25 ずつ積み上がる</b>（最大 <b>×10.0</b>）。"
      + "敵が固まっているところへ角度を作って撃ち込み、<b>1ショットでどれだけ擦れるか</b>がそのまま火力になる。"
      + "<b>壁FBターン短縮</b>を持つので、壁を使う立ち回りがそのまま次のフルバーストを早める。",
    /* ★ 2026-08-16 fsKind を "crossclone" → "cross" にそろえた。
       効果はすでに同じ処理（spawnCrossClones）へ合流させてあったが、キーだけが別のままだったので、
       絞り込みの「クロス分身弾」ボタンが2つに割れて、押した側のキャラしか出てこなかった。
       ★ "crossclone" は<b>サブリンク</b>のキーとしては今も使う（リノン）ので、実装側の case は残してある。 */
    fsName: "クロス分身弾", fsKind: "cross", fsPow: "分身" + CC_CLONES + "体 1ヒット 攻撃力×" + CC_PER + "（壁で反射・貫通・止まるまで）",
    fsDesc: "ふれた瞬間に<b>" + CC_CLONES + "体の分身</b>を放出。分身は<b>壁で反射しながらフィールドを動きまわり、敵を貫通して削り続ける</b>（止まるまで）",
  },
  soleria: {
    id: "soleria", nm: "ソレリア", img: "Soleria.webp", th: "t_Soleria.webp",
    el: "fire", shot: "pierce", type: "陽炎貫通型", gacha: true, lux: true, nexus: "pierce",
    hp: [878, 5790], atk: [498, 3180], spd: [288, 424],
    abil: [{ t: "ablock" }, { t: "aslow" }, { t: "firstkillerM" }, { t: "soulM" }, { t: "impulseboost" }], subfs: "nebula",
    ssName: "ソレイユ・ヴェノムピアス", ssTurns: 14, ssKind: "soleria",
    ssPow: "自強化（攻撃×1.75・スピード×1.3）＋ <b>ふれた敵を毒状態</b>（4ターン）＋ <b>弱点ヒット時に大ダメージ</b>（攻撃力×6.0）",
    ssDesc: "<b>陽炎をまとって自強化（攻撃×1.75・スピード×1.3）</b>。このショット中に<b>ふれた敵は毒状態</b>になり（4ターン）、"
      + "さらに<b>弱点に当てるたびに追加の大ダメージ（攻撃力×6.0）</b>が入る。"
      + "<b>毒 → 弱点撃ち抜き</b>の順に組み立てると、貫通のまま一気に押し切れる。",
    fsName: "超強ハイクロススティンガー", fsKind: "superhicross",
    fsPow: "貫通弾" + SHICROSS_N + "本 × 攻撃力×" + SHICROSS_PER + "（左右＋斜めへ展開し、近くの敵へ折り返す）",
    fsDesc: "ハイクロススティンガーの上位。<b>2本だった貫通弾が" + SHICROSS_N + "本</b>になり、"
      + "左右と斜め上下へ十字に展開したあと<b>近くの敵へ個別に追って折り返す</b>。"
      + "★ 2026-08-20c <b>1発の威力を ×1.70 → ×" + SHICROSS_PER + " に引き上げ</b>、"
      + "弾も<b>大きく尾を引く十字の光槍</b>になった。折り返しの瞬間には十字の閃光が走るので、"
      + "どこで曲がってどの敵を狙ったのかが目で追える",
  },
  beltia: {
    id: "beltia", nm: "ベルティア", img: "Beltia.webp", th: "t_Beltia.webp",
    el: "wood", shot: "bounce", type: "翠獄要塞型", gacha: true, lux: true, nexus: "aegis",
    hp: [902, 5950], atk: [484, 3090], spd: [280, 412],
    abil: [{ t: "antilock" }, { t: "superaslow" }, { t: "superaw" }, { t: "barrierL" }, { t: "fewfoeM" }, { t: "dashL" }, { t: "killerM", el: "water" }], subfs: "poison",
    ssName: "ヴェルデ・タイラント", ssTurns: 18, ssKind: "beltia",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>味方全員で総攻撃</b>＋ <b>ふれた敵の攻撃ターンを2増加</b>",
    ssDesc: "<b>翠の茨をまとって自強化（攻撃×1.8・スピード×1.2）</b>し、撃った瞬間に<b>味方全員で総攻撃</b>を仕掛ける。"
      + "さらに<b>ふれた敵は攻撃ターンが2増える</b>——総攻撃で殴りながら、そのまま相手の手番を遅らせられる。"
      + "<b>バリアL・ダッシュL・敵少底力M</b>を積んだ、押し切りにも粘りにも効く要塞型。",
    fsName: "ツインインボリュートスフィア", fsKind: "twininvolute", fsPow: "スフィア1ヒット 攻撃力×0.34（全画面・2回転しながら広がり画面外へ抜ける）",
    fsDesc: "<b>連なったスフィアが2本のらせんを描き、味方を中心に2回転しながら半径を大きくしていく</b>。"
      + "らせんは<b>画面のいちばん遠いスミまで届く全画面攻撃</b>で、<b>180°反対の2方向から挟みこむ</b>。"
      + "近くの敵から順に、最後は<b>画面上のどこにいる敵にも</b>当たり、そのまま<b>画面の外へ抜けていく</b>",
  },
  astera: {
    id: "astera", nm: "アステラ", img: "Astera.webp", th: "t_Astera.webp",
    el: "wood", shot: "pierce", type: "宵星狙撃型", gacha: true, lux: true, nexus: "slayer",
    hp: [868, 5740], atk: [486, 3100], spd: [290, 426],
    abil: [{ t: "antilock" }, { t: "aslow" }, { t: "poisonkillerM" }, { t: "vitalM" }], subfs: "lock8",
    ssName: "ステラ・ナイトフェスタ", ssTurns: 14, ssKind: "astera",
    ssPow: "自強化（攻撃×1.65・スピード×1.25）＋ <b>ふれた敵の攻撃ターンを2増加</b>",
    ssDesc: "<b>宵の星をまとって自強化（攻撃×1.65・スピード×1.25）</b>し、<b>ふれた敵の攻撃ターンを2ずつ遅らせて</b>いく。"
      + "貫通で敵の列を抜けながら順に手番を潰していけるので、<b>敵の攻撃を1巡まるごと飛ばす</b>ような使い方ができる。"
      + "<b>毒キラーM</b>を持つので、毒を撒く味方と組ませると火力も伸びる。",
    /* ★ 2026-08-08b 「連気弾」はセリーヌ（kiblast）と名前がかぶっていたのに中身が別物だったので、
       強化版であることが分かる名前にそろえた（＝超強◯◯ の命名ルールに合わせる）。 */
    fsName: "超強連気弾", fsKind: "kiblastex", fsPow: "気弾7発 × 攻撃力×0.85（残りHPの少ない敵を優先）",
    fsDesc: "<b>連気弾の強化版</b>。<b>7発の気弾</b>を続けざまに撃ち出す。1発の威力は<b>×0.55 → ×0.85</b>。"
      + "<b>残りHPの少ない敵から優先して</b>狙うので、削り残しをまとめて片付けられる",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-05 プレミアムセレクトガチャ 新SSR「ネム」
     ・フルバーストはアリシアとまったく同じ（ssKind: "alicia"）。
       全ギミック無効＋自分を反射化して、次の自分のターンを終えるまで暴れ回る。
     ・リンクスキルは<b>コピー</b>。ネムの<b>光属性</b>と<b>ネムのキラー</b>を乗せたまま、
       ふれた味方のリンクスキルを撃つ（＝編成しだいで役割が変わる万能札）。
     ・サブリンクは新しい<b>リンスピアップ</b>。ふれた味方のリンク威力とスピードを同時に上げる。
       コピーと組み合わせると「強いリンクを、強化した状態でネムの属性で撃つ」ができる。
     ══════════════════════════════════════════════════════════════ */
  nemu: {
    id: "nemu", nm: "ネム", img: "Nemu.webp", th: "t_Nemu.webp",
    el: "light", shot: "pierce", type: "写身支援型", gacha: true, lux: true, nexus: "bond",
    hp: [880, 5820], atk: [482, 3070], spd: [292, 430],
    abil: [{ t: "superaw" }, { t: "antilock" }, { t: "fbshort" }, { t: "vitalM" }, { t: "drain" }], subfs: "linkspeedup",
    ssName: "ゴールデン・ミラージュナイト", ssTurns: 12, ssKind: "alicia",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ 全ギミック無効化（DW・重力バリア・ワープ・地雷・ブロック）＋ <b>自分を反射化</b> を <b>次の自分のターンを終えるまで</b> 継続",
    ssDesc: "<b>金の残光をまとって自強化（攻撃×1.7・スピード×1.2）</b>し、"
      + "<b>ダメージウォール・重力バリア・ワープ・地雷・ブロックをすべて無効化</b>。"
      + "さらに<b>自分が反射化</b>して敵や壁で跳ね返るようになり、同じ敵に何度も当てて削り倒せる。"
      + "これらは<b>次の自分のターンを終えるまで持続</b>する！（アリシアと同じフルバースト）",
    fsName: "コピー", fsKind: "copy", fsPow: "ふれた味方のリンクスキルを<b>ネムの光属性・ネムのキラー</b>で発動（威力そのまま）",
    fsDesc: "<b>ふれた味方が持っているリンクスキルをそのままコピー</b>して発動する。"
      + "撃つのは相手のリンクでも、<b>属性はネムの光属性</b>・<b>キラーもネムのもの（バイタルキラーM）</b>が乗る。"
      + "<b>サブリンクのリンスピアップ</b>と合わせれば、味方の強力なリンクを<b>強化したまま光属性で撃ちこめる</b>",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-05 プレミアムセレクトガチャ 新SSR「ロゼリア」「シズカ」
     ロゼリア（木／貫通）
       ・フルバースト「ロサ・ヴィンディクタ」（18ターン）は
         <b>撃ったターンを含めて自分が2回行動し終えるまで</b>（own:1）
         ① 自強化　② カウンターキラー＋水属性キラーを臨時付与（ssKiller）
         ③ バブリー状態　④ ふれた敵の攻撃ターンが20%の確率で+2
       ・アビリティは殴りを通すためのアンチと、弱点／バイタルのキラーで固めている
     シズカ（闇／反射）
       ・フルバーストは<b>ネフィアとまったく同じ</b>（ssKind: "nephia"）。
         自強化しつつ、ふれた味方のパワーを×2.0（その味方が2回行動するまで）
       ・アビリティはアンチ4種＋パワーオーラM＋ソウルスティールMの支援寄り
     ══════════════════════════════════════════════════════════════ */
  roselia: {
    id: "roselia", nm: "ロゼリア", img: "Roselia.webp", th: "t_Roselia.webp",
    el: "wood", shot: "pierce", type: "薔薇報復型", gacha: true, lux: true, nexus: "slayer",
    hp: [884, 5840], atk: [496, 3160], spd: [288, 424],
    abil: [{ t: "ablock" }, { t: "sgrav" }, { t: "msM" }, { t: "weakkillerM" }, { t: "vital" }], subfs: "linkspeedup",
    ssName: "ロサ・ヴィンディクタ", ssTurns: 18, ssKind: "roselia",
    ssPow: "<b>撃ったターンを含めて自分が2回行動し終えるまで</b>：自強化（攻撃×1.8・スピード×1.3）＋ <b>カウンターキラー（×"
      + COUNTER_KILLER_MUL + "）と水属性キラー（×2.0）を獲得</b>＋ <b>バブリー状態</b>　／　ふれた敵の攻撃ターンが <b>20%の確率で+2</b>",
    ssDesc: "<b>黒薔薇の棘をまとって自強化（攻撃×1.8・スピード×1.3）</b>。同時に<b>カウンターキラー（最後に攻撃してきた敵へ×"
      + COUNTER_KILLER_MUL + "）</b>と<b>水属性キラー（×2.0）</b>を手に入れ、<b>バブリー状態</b>になって減速を振り切りながら走り続ける。"
      + "この3つは<b>どれも「撃ったターンを含めて自分が2回行動し終えるまで」続く</b>ので、"
      + "<b>殴られた次のターンに撃ち返す</b>形が一番強い。"
      + "さらに<b>ふれた敵は20%の確率で攻撃ターンが2ターン遅れる（即死カウントも遅れる）</b>——擦れば擦るほど相手の手番が崩れていく報復型の切り札！",
    fsName: "超強ルミナスレイ", fsKind: "superluminous",
    fsPow: "砲台1基のレーザー 攻撃力×" + SLUMI_MUL + "（貫通・最大" + SLUMI_N + "基・レーザーがさらに極太）",
    fsDesc: "ルミナスレイの上位。設置できる砲台が<b>4基 → " + SLUMI_N + "基</b>に増え、"
      + "レーザーは<b>威力も当たり判定の太さも大幅に強化</b>（×0.95 → <b>×" + SLUMI_MUL + "</b>）。"
      + "ふれた味方がぶつかった壁に砲台が並び、その味方が止まった瞬間に<b>盤面をまるごと貫く光の網</b>が走る",
  },
  shizuka: {
    id: "shizuka", nm: "シズカ", img: "Shizuka.webp", th: "t_Shizuka.webp",
    el: "dark", shot: "bounce", type: "宵闇支援型", gacha: true, lux: true, nexus: "tempo",
    hp: [898, 5930], atk: [478, 3050], spd: [282, 414],
    abil: [{ t: "superadw" }, { t: "sgrav" }, { t: "antilock" }, { t: "eternalphoton" }, { t: "auraM" }, { t: "soulM" }],
    subfs: "roundcharge",
    ssName: "ノクス・アセンション", ssTurns: 20, ssKind: "nephia",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ <b>ふれた味方のパワーを×2.0</b>（その味方が2回行動するまで）",
    ssDesc: "<b>宵闇をまとって自強化（攻撃×1.7・スピード×1.2）</b>し、<b>このショット中にふれた味方すべてのパワーを×2.0</b>に引き上げる。"
      + "強化は<b>その味方が2回行動し終えるまで</b>続くので、味方の大技に合わせて撃ちこめば一気に決着がつく。"
      + "<b>ネフィアと同じフルバースト</b>を、闇属性・反射・アンチ4種持ちの体で使えるのが強み。",
    fsName: "超強ハイエナジーサークル", fsKind: "superenergycircle",
    fsPow: "攻撃力×" + SENERGY_MUL + "（画面上のすべての敵・時間差で" + SENERGY_WAVES + "連発）",
    fsDesc: "ハイエナジーサークルの上位。<b>威力が ×1.25 → ×" + SENERGY_MUL + "</b>に跳ね上がり、"
      + "さらに<b>大きな輪が時間差で" + SENERGY_WAVES + "回</b>広がる。位置取りを問わず<b>画面上の敵すべて</b>に届くので、"
      + "散らばった敵をまとめて削り切れる",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-06 プレミアムセレクトガチャ 新SSR 3体
       ユリア（闇/反射）・アルティア（火/貫通）・リアナ（光/反射）
     ・3体そろって新アビリティ「冥花種キラー」を持つ。
       幽冥の庭園のボス（🌸冥花種）に刺さる初めての<b>種族キラー</b>で、
       属性キラーとは別枠なので重ねて効く＝庭園の攻略パーティーの軸になる。
     ・フルバーストは既存のもの（アヤカ／ナズナ）をそのまま使う。
       ssKind を分けず同じ挙動にしているので、演出・処理は1か所のまま。
     ══════════════════════════════════════════════════════════════ */
  yuria: {
    id: "yuria", nm: "ユリア", img: "Yuria.webp", th: "t_Yuria.webp",
    el: "dark", shot: "bounce", type: "冥花狩り型", gacha: true, lux: true, nexus: "sweep",
    hp: [892, 5900], atk: [496, 3160], spd: [286, 420],
    abil: [{ t: "superaw" }, { t: "msEL" }, { t: "netherkillerEL" }, { t: "sokojikaraM" }, { t: "soulM" }],
    subfs: "defdownblast",
    ssName: "ノクターナル・オーヴァル", ssTurns: 12, ssKind: "ayaka",
    ssPow: "自強化（攻撃×1.6・スピード×1.4）＋ このショット中に触れた味方をバブリー状態に（その味方の次の行動まで）",
    ssDesc: "<b>自強化して駆けまわり（攻撃×1.6・スピード×1.4）</b>、<b>ふれた味方を減速しにくいバブリー状態</b>にする。"
      + "バブリーは<b>その味方が次に行動するまで</b>続くので、味方を長く走らせて手数を稼げる（<b>アヤカと同じフルバースト</b>）。"
      + "<b>冥花種キラーEL（×" + NETHERKILLER_EL_MUL + "）</b>と<b>底力M</b>を併せ持つので、追いつめられた庭園ほど手がつけられなくなる。",
    fsName: "鋭角三方向追従型貫通弾", fsKind: "tri3followsharp", fsPow: "1発ごとに 攻撃力×0.30（味方が止まるまで撃ち続ける）",
    fsDesc: "<b>自分の位置から、ふれた味方へ向けて</b><b>鋭角にまとまった3方向の貫通弾</b>を撃ち続ける。角度がせまいぶん<b>3発とも同じ敵に入りやすい</b>",
  },
  altia: {
    id: "altia", nm: "アルティア", img: "Altia.webp", th: "t_Altia.webp",
    el: "fire", shot: "pierce", type: "灼花突撃型", gacha: true, lux: true, nexus: "ignition",
    hp: [886, 5860], atk: [490, 3120], spd: [294, 432],
    abil: [{ t: "superadw" }, { t: "antilock" }, { t: "netherkillerEL" }, { t: "killerM", el: "wood" },
           { t: "barrierM" }, { t: "dashM" }],
    subfs: "lock8",
    ssName: "フランベル・オーヴァル", ssTurns: 12, ssKind: "ayaka",
    ssPow: "自強化（攻撃×1.6・スピード×1.4）＋ このショット中に触れた味方をバブリー状態に（その味方の次の行動まで）",
    ssDesc: "<b>自強化して駆けまわり（攻撃×1.6・スピード×1.4）</b>、<b>ふれた味方を減速しにくいバブリー状態</b>にする"
      + "（<b>アヤカと同じフルバースト</b>）。<b>貫通</b>なので味方のあいだを一直線に走り抜けやすく、"
      + "1ショットで多くの味方にバブリーを配れるのが持ち味。"
      + "<b>冥花種キラーEL（×" + NETHERKILLER_EL_MUL + "）＋木属性キラーM</b>で、木属性の冥花種には桁ちがいのダメージが入る。",
    fsName: "ツインインボリュートスフィア", fsKind: "twininvolute",
    fsPow: "スフィア1ヒット 攻撃力×0.34（全画面・2回転しながら広がり画面外へ抜ける）",
    fsDesc: "<b>連なったスフィアが2本のらせんを描き、味方を中心に2回転しながら半径を大きくしていく</b>。らせんは<b>画面のいちばん遠いスミまで届く全画面攻撃</b>で、<b>180°反対の2方向から挟みこむ</b>。近くの敵から順に、最後は<b>画面上のどこにいる敵にも</b>当たり、そのまま<b>画面の外へ抜けていく</b>",
  },
  liana: {
    id: "liana", nm: "リアナ", img: "Liana.webp", th: "t_Liana.webp",
    el: "light", shot: "bounce", type: "聖光壁撃型", gacha: true, lux: true, nexus: "guard",
    hp: [904, 5980], atk: [486, 3100], spd: [280, 412],
    abil: [{ t: "superaw" }, { t: "antilock" }, { t: "netherkillerM" }, { t: "allkillerM" },
           { t: "allres" }, { t: "regenM" }, { t: "wallfbshort" }],
    subfs: "blast",
    ssName: "セイントフレア・ランページ", ssTurns: 20, ssKind: "nazuna",
    ssPow: "自強化（攻撃×1.6）＋ <b>壁にふれるたびパワーUP（最大×10.0）</b> ＋ <b>撃った瞬間に味方全員で総攻撃（全員が動く・突撃中の直殴り×" + RALLY_MUL + "）</b>",
    ssDesc: "<b>自強化して飛び出し（攻撃×1.6）</b>、<b>壁にぶつかるたびに聖光の力がふくらんでいく（最大×10.0）</b>。"
      + "<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×" + RALLY_MUL + "</b>）——"
      + "<b>ナズナと同じフルバースト</b>を、<b>反射</b>の体で使えるのが強み。壁で跳ね返るたびに勝手に倍率が積み上がっていく。"
      + "<b>壁FBターン短縮</b>とも噛み合い、壁を叩くほど次のフルバーストも近づく。",
    fsName: "超強三方向追従型貫通弾", fsKind: "supertri3follow",
    fsPow: "1発ごとに 攻撃力×" + SUPTRI_PER + "（味方が止まるまで高速で撃ち続ける・貫通）",
    fsDesc: "三方向追従型貫通弾の<b>強化版</b>。<b>自分の位置から、ふれた味方へ向けて</b>3方向へ撃ち続けるのは同じだが、"
      + "<b>1発の威力・弾の大きさ・弾速・連射の速さがすべて上</b>。当たり判定が広いので、"
      + "味方が走っているあいだじゅう、その通り道の敵を削り続ける",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-06 プレミアムセレクトガチャ 新SSR「ソレア」
     ・水／貫通。<b>減速壁・重力バリア・地雷</b>の3つを完全に踏み倒す踏破型。
     ・フルバーストは<b>レゼリアとまったく同じ</b>（ssKind: "rezelia"）。
       自強化して突撃し、敵にふれるたびに攻撃力が積み上がっていく（最大×10.0）。
     ・リンクスキルは新しい<b>全敵ロックオンレーザー</b>。
       画面上のすべての敵を1体ずつロックオンして特大レーザーを撃ちこむ。
     ・サブリンクは<b>爆発</b>。
     ══════════════════════════════════════════════════════════════ */
  solea: {
    id: "solea", nm: "ソレア", img: "Solea.webp", th: "t_Solea.webp",
    el: "water", shot: "pierce", type: "蒼波掃射型", gacha: true, lux: true, nexus: "force",
    hp: [884, 5840], atk: [494, 3150], spd: [292, 430],
    abil: [{ t: "superaslow" }, { t: "sgrav" }, { t: "msM" }, { t: "wallboostM" },
           { t: "gravkillerM" }, { t: "regenM" }],
    subfs: "blast",
    ssName: "アズュール・アセンション", ssTurns: 16, ssKind: "rezelia",
    ssPow: "自強化（攻撃×1.5・スピード×1.25）＋ <b>敵にふれるたびにさらに×1.25（最大×10.0）</b>",
    ssDesc: "<b>蒼波をまとって自強化し突撃（攻撃×1.5・スピード×1.25）</b>し、<b>敵にふれるたびに攻撃力がどんどん上がっていく（最大×10.0）</b>。"
      + "当てれば当てるほど爆発的に伸びる成長型（<b>レゼリアと同じフルバースト</b>）を、"
      + "<b>貫通</b>の体で使えるのが強み——敵の列を一直線に擦り抜けるだけで倍率が積み上がる。"
      + "<b>超アンチ減速壁・超アンチ重力バリア・マインスイーパーM</b>で足を止められにくく、"
      + "<b>ウォールブーストM</b>で壁を使った長い一筆書きがそのまま火力になる。",
    fsName: "全敵ロックオンレーザー", fsKind: "alllocklaser",
    fsPow: "レーザー1本 攻撃力×" + ALLLASER_MUL + "（画面上の<b>すべての敵</b>を1体ずつロックオン・貫通）",
    fsDesc: "<b>画面上のすべての敵を1体ずつロックオン</b>し、そのまま<b>特大レーザー</b>を順に撃ちこむ。"
      + "レーザーは<b>貫通</b>なので、射線に重なった敵にはそのぶん重ねて当たる。散らばった敵も、固まった敵もまとめて焼き払う掃射型のリンクスキル",
  },
  /* ══════════════════════════════════════════════════════════════
     v15: Luminous Summer Fest 限定SSR（カグヤα・ミオンα）
     ・Luminous Summer Fest でのみ排出（プレミアム／Nocturne Bloom Fest には出ない）
     ・フルバーストは「ノーマル版と同じ挙動のまま、倍率だけを引き上げた」もの
       （ssKind を kaguyaA / mionA に分け、ssMulOf と着地倍率だけ差し替えている）
     ══════════════════════════════════════════════════════════════ */
  kaguyaalpha: {
    id: "kaguyaalpha", nm: "カグヤα", img: "KaguyaAlpha.webp", th: "t_KaguyaAlpha.webp",
    el: "fire", shot: "pierce", type: "超重力砲型", fes: true, fesKey: "luminous", lux: true, nexus: "force",
    hp: [885, 5840], atk: [492, 3130], spd: [290, 425],
    abil: [{ t: "superadw" }, { t: "antilock" }, { t: "ablock" }, { t: "auraEL" }, { t: "killer", el: "wood" }, { t: "eternalphoton" }],
    subfs: "plasmanet",
    ssName: "灼夏重力・ルナグラビトンα", ssTurns: 14, ssKind: "kaguyaA",
    ssPow: "体当たり 攻撃力×3.2 ＋ 着地ダメージ 攻撃力×3.0以上（吹っ飛び量に比例）",
    ssDesc: "ノーマル版を大きく上まわる攻撃力アップ（<b>×3.2</b>）＋ふれた敵を灼夏の重力で強烈に吹っ飛ばし、<b>吹っ飛んだ勢いの分だけ着地時に大ダメージ（×3.0〜）</b>を与える。吹っ飛ばしと着地の両方が強化された、ルナグラビトンの完成形",
    fsName: "オービタルエッジ", fsKind: "spinring", fsPow: "リング1ヒット 攻撃力×0.30（巨大リング7基・壁で反射）",
    fsDesc: "クリスタルの<b>巨大なリバウンドサークル7基</b>が回転・反射しながら広がり、周囲の敵を連続で切り裂く",
  },
  mionalpha: {
    id: "mionalpha", nm: "ミオンα", img: "MionAlpha.webp", th: "t_MionAlpha.webp",
    el: "dark", shot: "bounce", type: "超連撃型", fes: true, fesKey: "luminous", lux: true, nexus: "pierce",
    hp: [878, 5790], atk: [498, 3170], spd: [292, 430],
    abil: [{ t: "superadw" }, { t: "sgrav" }, { t: "fsboostEL" }, { t: "combokillerEL" }, { t: "soulM" }],
    subfs: "nebula",
    ssName: "終焔連撃・ダブルオーヴァードライヴα", ssTurns: 20, ssKind: "mionA",
    ssPow: "1st 体当たり 攻撃力×2.7 ／ 停止後の 2nd 体当たり 攻撃力×4.0（再加速）",
    ssDesc: "自強化状態でフィールドを駆けまわり（<b>×2.7</b>）、<b>止まったあとさらに強化された状態でもう一度自動で走り出す（×4.0）</b>2段構えの超火力フルバースト。反射になったことで同じ敵を何度も擦れるようになり、<b>連撃キラーEL</b>と噛み合って2ndランの火力が跳ね上がる",
    fsName: "インフィニティレーザー", fsKind: "infinitylaser", fsPow: "本体 攻撃力×1.6 ＋ 着弾から八方分裂レーザー 各 攻撃力×0.55",
    fsDesc: "<b>最も近い敵へ超極太レーザー</b>を放ち、<b>着弾した地点から八方向へ分裂レーザー</b>を撃ち出して周囲をまとめて薙ぎ払う",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-11 Luminous Summer Fest 限定SSR を2体追加（合計4体に）
     ・シェリーα … 貫通／水。シェリーの乱打フルバーストの強化版＋<b>次の自分の番まで無敵</b>
     ・ココナα   … 貫通／火。ココナのハート爆撃の強化版＋<b>ふれた味方の数だけ回復</b>
     どちらもクロススキル持ち。α2体と同じく ssKind を分けて倍率だけ差し替えてある。
     ══════════════════════════════════════════════════════════════ */
  cherylalpha: {
    id: "cherylalpha", nm: "シェリーα", img: "CherylAlpha.webp", th: "t_CherylAlpha.webp",
    el: "water", shot: "pierce", type: "超乱打型", fes: true, fesKey: "luminous", lux: true, nexus: "force",
    connect: "cherylalpha",
    hp: [888, 5860], atk: [498, 3170], spd: [292, 428],
    abil: [{ t: "ablock" }, { t: "antilock" }, { t: "award" }, { t: "killerL", el: "fire" }, { t: "drainM" }],
    subfs: "linkspeedup",
    ssName: "蒼焔絶影・アズュールラプソディα", ssTurns: 20, ssKind: "cherylA",
    ssPow: "最初にふれた敵で<b>停止</b>して 乱打" + CHERYLA_BARRAGE_N + "連（各 攻撃力×" + CHERYLA_BARRAGE_PER
      + "＝合計×" + (CHERYLA_BARRAGE_N * CHERYLA_BARRAGE_PER).toFixed(1) + "）＋ 体当たり 攻撃力×2.2 ＋ <b>自分の次のターンまで無敵</b>",
    ssDesc: "攻撃力アップ（<b>×2.2</b>）して飛び出し、<b>そのショットで最初にふれた敵の上で止まり、蒼焔の乱打"
      + CHERYLA_BARRAGE_N + "連（各×" + CHERYLA_BARRAGE_PER + "）</b>をたたき込む"
      + "（<b>シェリーの乱打フルバーストの強化版</b>。連数が30→" + CHERYLA_BARRAGE_N
      + "、1発の威力も×0.7→×" + CHERYLA_BARRAGE_PER + "。全弾ヒットで合計 攻撃力×"
      + (CHERYLA_BARRAGE_N * CHERYLA_BARRAGE_PER).toFixed(1) + "）。"
      + "<br>さらに撃った瞬間から<b>自分の次のターンが終わるまで無敵</b>になるので、"
      + "<b>敵の攻撃をこわがらずに乱打の一発目を差し込みにいける</b>。"
      + "<b>アンチブロック・アンチロックゾーン・アンチ断絶界</b>と<b>火属性キラーL</b>を併せ持つ、夏の制圧型。",
    fsName: "超強三方向追従型貫通弾", fsKind: "supertri3follow",
    fsPow: "1発ごとに 攻撃力×" + SUPTRI_PER + "（味方が止まるまで高速で撃ち続ける・貫通）",
    fsDesc: "<b>三方向追従型貫通弾の強化版</b>。<b>自分の位置から、ふれた味方へ向けて</b>3方向の貫通弾を発射し、"
      + "その味方が動いているあいだ<b>いまいる場所へ狙いを付け直しながら止まるまで撃ち続ける</b>。"
      + "無印より<b>連射が速く・弾が太く・威力も上</b>",
  },
  kokonaalpha: {
    id: "kokonaalpha", nm: "ココナα", img: "KokonaAlpha.webp", th: "t_KokonaAlpha.webp",
    el: "fire", shot: "pierce", type: "削り特化型", fes: true, fesKey: "luminous", lux: true, nexus: "mercy",
    connect: "kokonaalpha",
    hp: [896, 5910], atk: [492, 3140], spd: [288, 424],
    abil: [{ t: "omni" }, { t: "antilock" }, { t: "award" }, { t: "allkillerEL" }, { t: "pray" }],
    subfs: "wallcircuit",
    ssName: "ハートフルレクイエムα", ssTurns: 18, ssKind: "kokonaA",
    ssPow: "体当たり 攻撃力×2.6 ＋ ふれた味方1体につき <b>チームHPを" + Math.round(KOKONAA_HEAL * 100)
      + "%回復</b> ＋ 停止後 全体ハート爆撃（各敵の残りHPの" + Math.round(KOKONAA_HEART * 100) + "%）",
    ssDesc: "自強化して暴れまわり（<b>×2.6</b>）、<b>止まると大量のハートが降りそそぎ、画面上のすべての敵にそれぞれの残りHPの"
      + Math.round(KOKONAA_HEART * 100) + "%ぶんのダメージ</b>を与える"
      + "（<b>ココナのハート爆撃の強化版</b>。削る割合が25%→" + Math.round(KOKONAA_HEART * 100) + "%）。"
      + "<br>さらに<b>走っているあいだにふれた味方1体ごとにチームHPが" + Math.round(KOKONAA_HEAL * 100) + "%回復</b>するので、"
      + "<b>味方をなぞってから敵に突っ込む</b>ほど、削りと立て直しを一度にこなせる。"
      + "<b>オムニアンチ</b>で盤面を選ばず、<b>全属性キラーEL（×" + ALLKILLER_EL_MUL + "）</b>で相手も選ばない。",
    fsName: "超強クロス分身弾", fsKind: "supercrossclone",
    fsPow: "分身" + SCC_CLONES + "体 1ヒット 攻撃力×" + SCC_PER + "（壁で反射・貫通・止まるまで）",
    fsDesc: "<b>クロス分身弾の強化版</b>。ふれた瞬間に放つ分身が<b>" + CC_CLONES + "体 → " + SCC_CLONES + "体</b>に増え、"
      + "1体ぶんの威力も上がる。分身は<b>壁で反射しながらフィールドを動きまわり、敵を貫通して削り続ける</b>（止まるまで）",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-07 Phantom Legend Fest 限定SSR「野獣先輩」
     ・反射／闇属性のアタッカー型。<b>クロススキル</b>を持つ最初のキャラ。
     ・フルバーストは 45ターンと最長級だが、そのぶん壁を使うほど伸びる（最大×10）。
       「やりますねぇ!」で味方が敵を倒すたびに3ターンずつ短縮されるので、
       雑魚が多いWAVEを丁寧に処理するほど早く撃てる設計にしてある。
     ・攻めに寄せた性能なので、HPが減るほど強くなる（野獣の本気）かわりに
       HPが高いあいだしか状態異常を防げない（状態異常レジスト）。
     ══════════════════════════════════════════════════════════════ */
  yaju: {
    id: "yaju", nm: "野獣先輩", img: "Yaju.webp", th: "t_Yaju.webp",
    el: "dark", shot: "bounce", type: "アタッカー型", fes: true, fesKey: "phantom", lux: true, nexus: "force",
    connect: "yaju",
    hp: [905, 5960], atk: [512, 3260], spd: [286, 422],
    abil: [{ t: "supermsEL" }, { t: "superaslow" }, { t: "superaw" },
      { t: "allykillfb" }, { t: "beastrage" }, { t: "ailmentresist" }],
    subfs: "beastimpact",
    ssName: "野獣の総攻撃・インザダーク", ssTurns: 45, ssKind: "yaju",
    ssPow: "自強化（攻撃×2.0・スピード×1.3）＋ <b>壁にふれるたび攻撃力UP（最大×10.0）</b>＋ <b>味方全員と分身4体で総攻撃</b>",
    ssDesc: "闇の闘気をまとって自強化（<b>攻撃×2.0・スピード×1.3</b>）し、<b>壁にふれるたびに攻撃力がどんどん上がっていく（最大×10.0）</b>。"
      + "さらに<b>味方全員</b>と<b>自分の分身4体</b>がいっせいに敵へ突っ込む<b>総攻撃</b>を巻き起こす。"
      + "ためるターンは長いが、壁を使い込むほど、そして味方が敵を倒すほど（やりますねぇ!）帰ってくるのが早い、フェス最上位のフルバースト！",
    fsName: "野獣突撃", fsKind: "beastcharge",
    fsPow: "突進弾" + BEASTCHARGE_N + "発 1ヒット 攻撃力×" + BEASTCHARGE_PER + "（敵を追尾・味方が止まるまで持続）",
    fsDesc: "<b>敵を追いかけ続ける強力な突進弾</b>を放つ。突進弾は壁で跳ね返りながら近くの敵へ向き直り、<b>ふれた味方が止まるまで</b>何度でも突っ込み続ける",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-07 プレミアムセレクトガチャ 新SSR 4体
       イオリ（闇/貫通）… ダメージウォールを「踏むほど強くなる燃料」に変える極端型
       ノエル（闇/反射）… 2行動ぶん無敵になれる、幽冥の庭園むけの耐久アタッカー
       ユキノ（水/反射）… 7ターンで撃てる最速級。撃つたび貫通化＋4ギミック無効
       レイカ（光/反射）… オムニアンチ＋蝕冥滅殺Mの庭園特化。FBはソレリアと同型
     ══════════════════════════════════════════════════════════════ */
  iori: {
    id: "iori", nm: "イオリ", img: "Iori.webp", th: "t_Iori.webp",
    el: "dark", shot: "pierce", gacha: true, lux: true, nexus: "force",
    hp: [886, 5840], atk: [516, 3290], spd: [292, 430],
    abil: [{ t: "superadw" }, { t: "sgrav" }, { t: "netherkillerM" }, { t: "weakkillerM" },
           { t: "killerM", el: "light" }, { t: "eternalphoton" }, { t: "drain" }],
    subfs: "alllock3",
    ssName: "夜刀・カラミティエッジ", ssTurns: 14, ssKind: "iori",
    ssPow: "自強化（攻撃×1.8・スピード×1.3）＋ <b>ダメージウォールにふれるたび攻撃力UP（最大×10.0）</b>",
    ssDesc: "<b>宵闇の刃をまとって自強化（攻撃×1.8・スピード×1.3）</b>し、"
      + "そこから<b>ダメージウォールにふれるたびに攻撃力がどんどん上がっていく（最大×10.0）</b>。"
      + "<b>超アンチダメージウォール</b>を持っているのでDWでダメージは受けず、"
      + "ふつうなら避けて通る灼けた壁が、そのまま<b>火力をためる燃料</b>に変わるのがこのフルバーストの核心。"
      + "<b>DWのあるクエストでは最大級の一撃</b>を、逆にDWの無いクエストでは自強化ぶんだけを撃つ、はっきり尖った切り札。",
    fsName: "超強三方向追従型貫通弾", fsKind: "supertri3follow",
    fsPow: "1発ごとに 攻撃力×" + SUPTRI_PER + "（味方が止まるまで高速で撃ち続ける・貫通）",
    fsDesc: "三方向追従型貫通弾の<b>強化版</b>。<b>自分の位置から、ふれた味方へ向けて</b>3方向へ撃ち続けるのは同じだが、"
      + "<b>1発の威力・弾の大きさ・弾速・連射の速さがすべて上</b>。当たり判定が広いので、"
      + "味方が走っているあいだじゅう、その通り道の敵を削り続ける",
  },
  noelle: {
    id: "noelle", nm: "ノエル", img: "Noelle.webp", th: "t_Noelle.webp",
    el: "dark", shot: "bounce", gacha: true, lux: true, nexus: "aegis",
    hp: [928, 6120], atk: [492, 3140], spd: [278, 410],
    abil: [{ t: "adw" }, { t: "agrav" }, { t: "award" }, { t: "netherkillerL" },
           { t: "combokillerL" }, { t: "elemres", el: "light" }],
    subfs: "nebula",
    ssName: "ノクターン・インヴィオラブル", ssTurns: 12, ssKind: "noelle",
    ssPow: "<b>自分の行動2ターンぶん</b>の自強化（攻撃×1.9・スピード×1.25）＋ <b>自分の行動2ターンぶん無敵</b>",
    ssDesc: "<b>不可侵の夜をまとって自強化（攻撃×1.9・スピード×1.25）</b>し、同時に<b>無敵</b>になる。"
      + "どちらも<b>「自分が2回行動し終えるまで」</b>続くので、<b>撃ったターンだけでなく次の自分のターンまで</b>無傷で暴れられる。"
      + "<b>アンチ断絶界</b>で閉じこめられても1回で抜け出せるうえ、"
      + "<b>連撃キラーL</b>を持つので<b>同じ敵を無敵のまま擦り続ける</b>のがいちばん強い使いかた。"
      + "即死攻撃やクラッシュ攻撃のカウントが迫っている場面で、被弾を気にせず押し込める幽冥の庭園むけの切り札。",
    fsName: "コピー", fsKind: "copy",
    fsPow: "ふれた味方のリンクスキルを<b>ノエルの闇属性・ノエルのキラー</b>で発動（威力そのまま）",
    fsDesc: "<b>ふれた味方のリンクスキルを写し取って</b>放つ。"
      + "属性は<b>ノエルの闇属性</b>、<b>キラーもノエルのもの（冥花種キラーL・連撃キラーL）</b>が乗る。"
      + "光属性の敵が並ぶ幽冥の庭園では、味方の技をそのまま「有利属性の闇」に塗り替えて撃てる",
  },
  yukino: {
    id: "yukino", nm: "ユキノ", img: "Yukino.webp", th: "t_Yukino.webp",
    el: "water", shot: "bounce", gacha: true, lux: true, nexus: "ignition",
    hp: [872, 5750], atk: [478, 3050], spd: [300, 440],
    /* ★ 2026-08-08 調整: リンクブーストEL（×3.0）→ <b>M</b>（×2.0）に落とし、
       パワーオーラMを外して<b>ドレインM</b>（敵ヒット1回ごとにチームHPを回復）を持たせた。
       自分の火力を伸ばす方向をやめ、「走りまわって味方をなぞり、そのあいだチームを立て直す」
       支援キャラとして役割をはっきりさせるための入れ替え。 */
    abil: [{ t: "agrav" }, { t: "aslow" }, { t: "fsboostM" }, { t: "netherkillerEL" },
           { t: "drainM" }, { t: "barrierEL" }],
    subfs: "blast",
    ssName: "シルフィード・ブレイクスルー", ssTurns: 7, ssKind: "yukino",
    ssPow: "<b>貫通タイプに変化</b>＋<b>ダメージウォール・重力バリア・ワープ・地雷をすべて無効化</b>＋<b>バブリー状態</b>（すべてこのショット中）",
    ssDesc: "氷雪の風をまとい、<b>貫通タイプに変化</b>して盤面をまっすぐ走り抜ける。"
      + "このショットのあいだは<b>ダメージウォール・重力バリア・ワープ・地雷の4つをまとめて無効化</b>し、"
      + "さらに<b>バブリー状態</b>になって減速しにくくなるので、<b>止まらずに味方をなぞり続けられる</b>。"
      + "<b>わずか7ターン</b>で撃てる最速級のフルバーストなので、"
      + "<b>リンクブーストM（×2.0）</b>と合わせて<b>毎ターンのようにリンクを撒き散らす</b>のがこのキャラの本体。"
      + "さらに<b>ドレインM</b>を持つので、走って敵にふれ続けるほど<b>チームHPが戻っていく</b>。"
      + "自分では大ダメージを出さないかわりに、<b>編成全体の手数を底上げしながら立て直す</b>支援の最上位。",
    /* ★ 2026-08-08: オービタルエッジ → <b>超強オービタルエッジ</b>（既存の強化版）へ変更 */
    fsName: "超強オービタルエッジ", fsKind: "superspinring",
    fsPow: "リング1ヒット 攻撃力×" + SSPIN_MUL + "（超巨大リング" + SSPIN_N + "基・壁で反射・当たり直しも速い）",
    fsDesc: "オービタルエッジの<b>強化版</b>。氷のリバウンドサークルが<b>7基 → " + SSPIN_N + "基</b>に増え、"
      + "<b>1基の大きさ（当たり判定）も威力も速さも、すべて上</b>（威力 ×0.30 → <b>×" + SSPIN_MUL + "</b>）。"
      + "外周に回る氷刃をまとった特大リングが盤面じゅうを跳ねまわり、"
      + "<b>同じ敵にも短い間隔で何度も入る</b>ので、味方が長く走るほど削り切れる",
  },
  reika: {
    id: "reika", nm: "レイカ", img: "Reika.webp", th: "t_Reika.webp",
    el: "light", shot: "bounce", gacha: true, lux: true, nexus: "pierce",
    hp: [898, 5920], atk: [504, 3210], spd: [284, 418],
    abil: [{ t: "omni" }, { t: "aslow" }, { t: "eclipseslayerM" }, { t: "poisonkillerM" },
           { t: "elemresM", el: "dark" }, { t: "drainM" }],
    subfs: "fbburst4",
    ssName: "ルミナ・ヴェノムピアス", ssTurns: 14, ssKind: "soleria",
    ssPow: "自強化（攻撃×1.75・スピード×1.3）＋ <b>ふれた敵を毒状態</b>（4ターン）＋ <b>弱点ヒット時に大ダメージ</b>（攻撃力×" + SOLERIA_WEAK_MUL + "）",
    ssDesc: "<b>聖光をまとって自強化（攻撃×1.75・スピード×1.3）</b>。このショット中に<b>ふれた敵は毒状態</b>になり（4ターン）、"
      + "さらに<b>弱点に当てるたびに追加の大ダメージ（攻撃力×" + SOLERIA_WEAK_MUL + "）</b>が入る（<b>ソレリアと同じフルバースト</b>）。"
      + "<b>毒キラーM</b>を自前で持っているので、<b>毒 → 弱点撃ち抜き</b>の流れがそのまま自分の火力になるのが強み。"
      + "<b>オムニアンチ＋アンチ減速壁</b>で盤面をほぼ無視でき、<b>蝕冥滅殺M</b>で幽冥の庭園の2種族をまとめて狩れる庭園特化の一枚。",
    fsName: "ツインインボリュートスフィア", fsKind: "twininvolute",
    fsPow: "スフィア1ヒット 攻撃力×0.34（全画面・2回転しながら広がり画面外へ抜ける）",
    fsDesc: "<b>連なったスフィアが2本のらせんを描き、味方を中心に2回転しながら半径を大きくしていく</b>。らせんは<b>画面のいちばん遠いスミまで届く全画面攻撃</b>で、<b>180°反対の2方向から挟みこむ</b>。近くの敵から順に、最後は<b>画面上のどこにいる敵にも</b>当たり、そのまま<b>画面の外へ抜けていく</b>",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-08 プレミアムセレクトガチャ 新SSR 2体
       ナナミ（火／反射）… 盤面を無視して走り、壁を叩くほど加速していく踏破型
         ・FBは16ターンと軽い。自強化のうえ、壁にふれるたび<b>20%で</b>
           スピードとパワーが1段ずつ上がる（＝運まかせではなく「壁を多く叩く」立ち回りで伸ばす）
         ・リンクは既存の<b>超強三方向追従型貫通弾</b>、サブリンクは<b>爆発</b>
       チトセ（水／貫通）… 右半分を制圧する砲台型
         ・FBは<b>ロゼリアとまったく同じ</b>形（ssKind: "chitose"）。
           ちがいは臨時キラーが<b>水属性キラー → 火属性キラー</b>になっている点だけ
         ・リンクは新しい<b>超強クイックチャージショット</b>（3体同時ロックオン＋衝撃波）
         ・サブリンクは新しい<b>貫通拡散弾3</b>（16方向×3発の乱れ撃ち）
     ══════════════════════════════════════════════════════════════ */
  nanami: {
    id: "nanami", nm: "ナナミ", img: "Nanami.webp", th: "t_Nanami.webp",
    el: "fire", shot: "bounce", type: "紅蓮踏破型", gacha: true, lux: true, nexus: "ignition",
    hp: [896, 5910], atk: [502, 3200], spd: [296, 436],
    abil: [{ t: "supermsM" }, { t: "aslow" }, { t: "ablock" }, { t: "allkillerM" },
           { t: "mobkillerM" }, { t: "eclipsekillerM" }, { t: "dashM" }],
    subfs: "blast",
    ssName: "紅蓮疾走・ブレイズランナー", ssTurns: 16, ssKind: "nanami",
    ssPow: "自強化（攻撃×1.7・スピード×1.25）＋ <b>壁にふれるたび" + Math.round(NANAMI_WALL_P * 100)
      + "%の確率でスピードとパワーがアップ</b>（1段ごと 攻撃+" + Math.round((NANAMI_WALL_ATK - 1) * 100)
      + "%・スピード+" + Math.round((NANAMI_WALL_SPD - 1) * 100) + "%・最大" + NANAMI_WALL_MAX + "段）",
    ssDesc: "<b>紅蓮の炎をまとって自強化（攻撃×1.7・スピード×1.25）</b>し、"
      + "<b>壁にぶつかるたびに" + Math.round(NANAMI_WALL_P * 100) + "%の確率で「もう一段」加速する</b>。"
      + "上がるのは<b>スピードとパワーの両方</b>で、最大" + NANAMI_WALL_MAX + "段（攻撃 最大×"
      + Math.pow(NANAMI_WALL_ATK, NANAMI_WALL_MAX).toFixed(1) + "）まで積み上がる。"
      + "<br>確率で伸びるが、<b>壁を多く叩く角度で撃てば伸びる回数そのものが増える</b>ので、"
      + "「どこで跳ね返らせるか」を組み立てるほど強くなる。<b>16ターン</b>と軽いので、何度も撃って積み直せるのが持ち味。",
    fsName: "超強三方向追従型貫通弾", fsKind: "supertri3follow",
    fsPow: "1発ごとに 攻撃力×" + SUPTRI_PER + "（味方が止まるまで高速で撃ち続ける・貫通）",
    fsDesc: "三方向追従型貫通弾の<b>強化版</b>。<b>自分の位置から、ふれた味方へ向けて</b>3方向へ撃ち続けるのは同じだが、"
      + "<b>1発の威力・弾の大きさ・弾速・連射の速さがすべて上</b>。当たり判定が広いので、"
      + "味方が走っているあいだじゅう、その通り道の敵を削り続ける",
  },
  chitose: {
    id: "chitose", nm: "チトセ", img: "Chitose.webp", th: "t_Chitose.webp",
    el: "water", shot: "pierce", type: "蒼雷砲撃型", gacha: true, lux: true, nexus: "force",
    hp: [902, 5950], atk: [500, 3190], spd: [288, 424],
    abil: [{ t: "superadw" }, { t: "ablock" }, { t: "antilock" },
           { t: "rightkillerL" }, { t: "vitalL" }, { t: "protection" }],
    subfs: "pspread3",
    ssName: "セルリアン・ヴィンディクタ", ssTurns: 18, ssKind: "chitose",
    ssPow: "<b>撃ったターンを含めて自分が2回行動し終えるまで</b>：自強化（攻撃×1.8・スピード×1.3）＋ <b>カウンターキラー（×"
      + COUNTER_KILLER_MUL + "）と火属性キラー（×2.0）を獲得</b>＋ <b>バブリー状態</b>　／　ふれた敵の攻撃ターンが <b>20%の確率で+2</b>",
    ssDesc: "<b>蒼雷をまとって自強化（攻撃×1.8・スピード×1.3）</b>。同時に<b>カウンターキラー（最後に攻撃してきた敵へ×"
      + COUNTER_KILLER_MUL + "）</b>と<b>火属性キラー（×2.0）</b>を手に入れ、<b>バブリー状態</b>になって減速を振り切りながら走り続ける。"
      + "この3つは<b>どれも「撃ったターンを含めて自分が2回行動し終えるまで」続く</b>ので、"
      + "<b>殴られた次のターンに撃ち返す</b>形が一番強い。"
      + "さらに<b>ふれた敵は20%の確率で攻撃ターンが2ターン遅れる（即死カウントも遅れる）</b>——"
      + "<b>ロゼリアと同じフルバースト</b>を、<b>火属性キラー</b>に持ちかえた水属性版。",
    fsName: "超強クイックチャージショット", fsKind: "superchargeshot",
    fsPow: "チャージ弾 攻撃力×" + SCHG_MUL + " ×" + SCHG_N + "体（同時ロックオン）＋ 着弾ごとに衝撃波 攻撃力×" + SCHG_BOOM_MUL,
    fsDesc: "クイックチャージショットの<b>大幅な強化版</b>。ふれた味方が走っているあいだ蒼雷を溜め続け、"
      + "<b>その味方が止まった瞬間に、近い敵" + SCHG_N + "体を同時にロックオン</b>して極太のチャージ弾を撃ちこむ。"
      + "1発の威力は<b>×2.4 → ×" + SCHG_MUL + "</b>まで跳ね上がり、さらに<b>着弾した場所から衝撃波</b>が広がって"
      + "まわりの敵もまとめて焼く。溜めるほど派手になる、盤面を一掃する砲撃型のリンクスキル",
  },
  /* ══════════ ★ 2026-08-08 プレミアム新SSR 4体 ══════════ */
  kaede: {
    id: "kaede", nm: "カエデ", img: "Kaede.webp", th: "t_Kaede.webp",
    el: "fire", shot: "pierce", type: "壁抜け強襲型", gacha: true, lux: true, nexus: "slayer",
    hp: [886, 5840], atk: [504, 3210], spd: [292, 430],
    abil: [{ t: "supermsL" }, { t: "ablock" }, { t: "wallboostM" }, { t: "regenL" }, { t: "elemres", el: "wood" }],
    subfs: "atkspdup",
    ssName: "クリムゾン・ファントムラッシュ", ssTurns: 24, ssKind: "kaede",
    ssPow: "自強化（攻撃×1.6・スピード×1.25）＋ <b>壁をすり抜けて反対側から出現</b>"
      + " ＋ <b>敵にふれるたびにパワーアップ（最大 ×10.0）</b>"
      + " ＋ <b>ふれた敵の数に応じて、その敵の攻撃ターンが増える</b>",
    ssDesc: "紅蓮をまとって自強化し、<b>壁をすり抜けて反対側の壁から出現</b>する。"
      + "跳ね返らないので<b>止まるまで一直線に走りぬけ</b>、<b>ふれた敵1体ごとにパワーが積み上がる（最大 ×10.0）</b>。"
      + "さらに<b>ふれた敵は、そのときまでにふれた敵の数だけ攻撃ターンが遅れる</b>——"
      + "<b>敵が多いWAVEほど、削りながら相手の手番をまとめて後ろへ押しやれる</b>。"
      + "24ターンと長いぶん、決まったときの押し込みはトップクラス。",
    fsName: "リフレクションリング", fsKind: "reflectring",
    fsPow: "リング1発 攻撃力×" + REFRING_PER + "（最大" + REFRING_MAX + "発・壁で1回だけ反射）",
    fsDesc: "ふれた味方の位置から<b>リング状の属性弾</b>を次々に放つ。弾は<b>壁で1回だけ反射</b>してから飛び続けるので、"
      + "まっすぐでは届かない<b>壁の裏や画面のすみの敵まで回り込んで</b>当たる。"
      + "撃つ向きは1発ごとに少しずつ回るため、走らせるほど<b>まわり中に弾がばらまかれる</b>",
  },
  rinon: {
    /* ★ 2026-08-10 改名: XEVAガチャから移行してきた「リノン」（火／反射・id: rinonx）と
       名前がぶつかるため、こちらを<b>ルクシア</b>に改める。
       id は据え置き（rinon）＝所持データ・限界突破・ルーンはそのまま引き継がれる。 */
    id: "rinon", nm: "ルクシア", img: "Rinon.webp", th: "t_Rinon.webp",
    el: "light", shot: "pierce", type: "模倣支援型", gacha: true, lux: true, nexus: "resonance",
    hp: [874, 5760], atk: [488, 3110], spd: [296, 436],
    abil: [{ t: "superaw" }, { t: "aslow" }, { t: "eclipsekillerM" }, { t: "mobkillerM" },
           { t: "ailmentresist" }, { t: "fbturnboost" }],
    subfs: "crossclone",
    ssName: "ルクス・ミラージュエコー", ssTurns: 16, ssKind: "rinon",
    ssPow: "自強化（攻撃×1.85・スピード×1.3）＋ <b>このショット中は、ふれた味方のリンクスキルが2回発動</b>"
      + " ＋ <b>敵を倒すたびに味方全員のフルバーストが1ターン短縮</b>",
    ssDesc: "光の残像をまとって自強化し、<b>ふれた味方のリンクスキルを2回ずつ発動</b>させながら走る"
      + "（「リンク×2」を持っていない味方にも効く）。"
      + "さらに<b>倒した敵1体につき、味方全員のフルバーストが1ターン縮む</b>——"
      + "<b>ザコキラーM</b>と<b>FBターンブースト</b>を合わせて雑魚をまとめて刈れば、"
      + "<b>次のターンにはチームぜんぶがフルバースト圏内</b>に入っている。"
      + "自分で殴り切るのではなく、<b>味方の一番強いリンクを何度も引き出す</b>のがこのキャラの本体。",
    fsName: "コピー", fsKind: "copy",
    fsPow: "ふれた味方のリンクスキルを<b>ルクシアの光属性・ルクシアのキラー</b>で発動（威力そのまま）",
    fsDesc: "ふれた味方のリンクスキルを<b>そのまま写し取って撃つ</b>。"
      + "ただし<b>属性もキラーもリノン本人のもの</b>が乗るので、"
      + "<b>光属性が有利な相手に、味方の強いリンクを光属性で撃ち込む</b>という使い方ができる",
  },
  kokoro: {
    id: "kokoro", nm: "ココロ", img: "Kokoro.webp", th: "t_Kokoro.webp",
    el: "wood", shot: "bounce", type: "聖域守護型", gacha: true, lux: true, nexus: "aegis",
    hp: [908, 5970], atk: [482, 3070], spd: [278, 410],
    abil: [{ t: "adw" }, { t: "aw" }, { t: "bosskillerM" }, { t: "allresM" },
           { t: "leftkillerM" }, { t: "eternalphoton" }, { t: "fsdouble" }],
    subfs: "roundcharge",
    ssName: "ヴェルダン・ヴェノムピアス", ssTurns: 14, ssKind: "soleria",
    ssPow: "自強化（攻撃×1.75・スピード×1.3）＋ <b>ふれた敵を毒状態</b>（4ターン）＋ <b>弱点ヒット時に大ダメージ</b>（攻撃力×6.0）",
    ssDesc: "翠の霧をまとって<b>自強化（攻撃×1.75・スピード×1.3）</b>。このショット中に<b>ふれた敵は毒状態</b>になり（4ターン）、"
      + "さらに<b>弱点に当てるたびに追加の大ダメージ（攻撃力×6.0）</b>が入る。"
      + "<b>ソレリアと同じフルバースト</b>を、反射で扱う木属性版として持っている——"
      + "反射なので<b>敵と壁のあいだに挟んで、毒と弱点をまとめて重ねられる</b>のが強み。",
    fsName: "ツインインボリュートスフィア", fsKind: "twininvolute",
    fsPow: "スフィア1ヒット 攻撃力×0.34（全画面・2回転しながら広がり画面外へ抜ける）",
    /* ★ 2026-08-18 同名のリンクスキルは<b>説明も同じ</b>にそろえた（技の中身は前から同じ）。
       ココロだけの事情（リンク×2）は、本文のあとに<b>追記</b>として付ける。 */
    fsDesc: "<b>連なったスフィアが2本のらせんを描き、味方を中心に2回転しながら半径を大きくしていく</b>。"
      + "らせんは<b>画面のいちばん遠いスミまで届く全画面攻撃</b>で、<b>180°反対の2方向から挟みこむ</b>。"
      + "近くの敵から順に、最後は<b>画面上のどこにいる敵にも</b>当たり、そのまま<b>画面の外へ抜けていく</b>"
      + "<br>★ ココロは<b>リンク×2</b>を持つので、ふれた味方はこれを<b>1回のショットで2度</b>撃たせられる",
  },
  ange: {
    id: "ange", nm: "アンジェ", img: "Ange.webp", th: "t_Ange.webp",
    el: "dark", shot: "bounce", type: "癒し殲滅型", gacha: true, lux: true, nexus: "mercy",
    hp: [896, 5900], atk: [492, 3140], spd: [284, 418],
    abil: [{ t: "msEL" }, { t: "aslow" }, { t: "award" }, { t: "laserstopM" },
           { t: "ailsokojikaraM" }, { t: "killer", el: "light" }],
    subfs: "supercrossclone",
    ssName: "ノワール・レクイエム", ssTurns: 14, ssKind: "ange",
    ssPow: "自強化（攻撃×1.75・スピード×1.25）＋ <b>味方にふれるたびにチームHPを"
      + Math.round(ANGE_HEAL * 100) + "%回復</b> ＋ <b>ボス以外（ザコ）に大ダメージ</b>（攻撃力×" + ANGE_MOB_MUL + " の追撃）",
    ssDesc: "宵闇の鎮魂歌をまとって自強化し、<b>味方にふれるたびにチームHPを"
      + Math.round(ANGE_HEAL * 100) + "%ずつ回復</b>しながら走る。"
      + "さらに<b>ボス以外の敵にふれるたびに大ダメージの追撃</b>（攻撃力×" + ANGE_MOB_MUL + "）が入るので、"
      + "<b>味方をなぞって回復 → そのままザコを一掃</b>という動きが1ショットで完結する。"
      + "<b>状態異常底力M</b>を持つので、<b>毒を受けているあいだはむしろ火力が2倍</b>になる——"
      + "回復役でありながら、追いつめられるほど強くなる。",
    fsName: "超強クロス分身弾", fsKind: "supercrossclone",
    fsPow: "分身" + SCC_CLONES + "体 1ヒット 攻撃力×" + SCC_PER + "（壁で反射・貫通・止まるまで）",
    fsDesc: "<b>クロス分身弾の強化版</b>。ふれた瞬間に放つ分身が<b>" + CC_CLONES + "体 → " + SCC_CLONES + "体</b>に増え、"
      + "<b>1ヒットの威力（×" + CC_PER + " → ×" + SCC_PER + "）も、走る速さも、動きまわる時間も上</b>。"
      + "分身ひとつひとつが大きく、当たり直しの間隔も短いので、"
      + "<b>壁で反射しながら盤面まるごとを削り取る</b>",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-08c プレミアムセレクトガチャ 新SSR 3体
       コトネ（火／反射）・ラン（光／反射）・セリス（木／貫通）
     ・フルバーストは<b>すでにある3人ぶんをそのまま持つ</b>（ssKind を共有）。
       コトネ＝レヴィア ／ ラン＝アーク ／ セリス＝ミルフィ と同じ。
       ★ ssKind を共有しているので、applyNewSS・ssMulOf・演出はすべて元のキャラと同じ道を通る。
         技名だけを本人のものにしてある（フィオナ＝フィアと同じやりかた）。
     ・リンク／サブリンクも<b>すでにある技</b>から選んである（同じ名前＝同じ効果）。
     ══════════════════════════════════════════════════════════════ */
  kotone: {
    id: "kotone", nm: "コトネ", img: "Kotone.webp", th: "t_Kotone.webp",
    el: "fire", shot: "bounce", type: "壁撃殲滅型", gacha: true, lux: true, nexus: "force",
    hp: [890, 5860], atk: [502, 3200], spd: [288, 424],
    /* ウォールブーストEL（新・最大×3.0）が主役。反射で壁を稼ぎながら雑魚を薙ぐ組み立て */
    abil: [{ t: "msL" }, { t: "ablock" }, { t: "wallboostEL" }, { t: "mobkillerM" },
           { t: "fbshort" }, { t: "elemres", el: "wood" }],
    subfs: "nebula",
    ssName: "イグニス・レクイエム", ssTurns: 20, ssKind: "revia",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>撃った瞬間に味方全員で総攻撃（全員が動く・突撃中の直殴り×" + RALLY_MUL + "）</b> ＋ ふれた敵の<b>弱点倍率を大アップ</b>",
    ssDesc: "<b>紅蓮の焔で自強化（攻撃×1.8・スピード×1.2）</b>し、<b>このショットでふれた敵の弱点ダメージを大きく増幅</b>する。"
      + "<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×" + RALLY_MUL + "</b>／壁で跳ねて何度も殴れて、味方どうしがふれれば<b>リンクスキルも連鎖</b>する）。"
      + "<b>レヴィアと同じフルバースト</b>を、反射で扱う火属性版として持っている——"
      + "反射なので<b>自分も総攻撃のなかで壁を稼ぎ続けられる</b>のが強み。"
      + "<b>ウォールブーストEL（最大×" + WALLBOOSTEL_MAX + "）</b>と噛み合って、総攻撃の最後がいちばん重い一撃になる。",
    fsName: "超強オービタルエッジ", fsKind: "superspinring",
    fsPow: "リング1ヒット 攻撃力×" + SSPIN_MUL + "（超巨大リング" + SSPIN_N + "基・壁で反射・当たり直しも速い）",
    fsDesc: "オービタルエッジの<b>強化版</b>。炎のリバウンドサークルが<b>7基 → " + SSPIN_N + "基</b>に増え、"
      + "<b>1基の大きさ（当たり判定）も威力も速さも、すべて上</b>（威力 ×0.30 → <b>×" + SSPIN_MUL + "</b>）。"
      + "特大リングが盤面じゅうを跳ねまわり、<b>同じ敵にも短い間隔で何度も入る</b>ので、味方が長く走るほど削り切れる",
  },
  ran: {
    id: "ran", nm: "ラン", img: "Ran.webp", th: "t_Ran.webp",
    el: "light", shot: "bounce", type: "祈祷支援型", gacha: true, lux: true, nexus: "mercy",
    hp: [906, 5970], atk: [480, 3060], spd: [286, 420],
    /* アンチ3種＋治癒の祈り＋ソウルスティールEL（新）＝「落ちない編成」を作るキャラ */
    abil: [{ t: "superaw" }, { t: "aslow" }, { t: "antilock" }, { t: "pray" },
           { t: "vitalL" }, { t: "fatalkiller" }, { t: "soulEL" }],
    subfs: "absoluteray",
    ssName: "オーロラ・カタストロフ", ssTurns: 20, ssKind: "arche",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>最初にふれた敵で超大爆発（攻撃力×14.0・周囲の敵を巻き込む）</b>",
    ssDesc: "<b>暁光をまとって自強化（攻撃×1.8・スピード×1.2）</b>し、<b>そのショットで最初にふれた敵の位置で超強力な大爆発</b>を起こす。"
      + "爆発は<b>周囲の敵すべてを巻き込んで大ダメージ（攻撃力×14.0／距離で減衰）</b>——<b>アークと同じフルバースト</b>。"
      + "<b>バイタルキラーL（×2.5）</b>で削り出しに、<b>フェイタルキラー</b>で削り切りに強く、"
      + "<b>ソウルスティールEL</b>で倒すたびにチームHPが" + Math.round(SOULEL_RATE * 100) + "%ずつ戻ってくる。"
      + "さらに<b>治癒の祈り</b>があるので、ボス戦の入り口で全回復して仕切り直せることもある。",
    fsName: "リフレクションリング", fsKind: "reflectring",
    fsPow: "リング1発 攻撃力×" + REFRING_PER + "（最大" + REFRING_MAX + "発・壁で1回だけ反射）",
    fsDesc: "ふれた味方の位置から<b>リング状の属性弾</b>を次々に放つ。弾は<b>壁で1回だけ反射</b>してから飛び続けるので、"
      + "まっすぐでは届かない<b>壁の裏や画面のすみの敵まで回り込んで</b>当たる。"
      + "撃つ向きは1発ごとに少しずつ回るため、走らせるほど<b>まわり中に弾がばらまかれる</b>",
  },
  ceris: {
    id: "ceris", nm: "セリス", img: "Ceris.webp", th: "t_Ceris.webp",
    el: "wood", shot: "pierce", type: "翠壁堅守型", gacha: true, lux: true, nexus: "tempo",
    hp: [912, 6000], atk: [492, 3140], spd: [284, 418],
    /* 超アンチ2種＋バリアM で耐えつつ、壁FBターン短縮＋乱FB短縮弾で編成のFBを回す */
    abil: [{ t: "superadw" }, { t: "superaw" }, { t: "barrierM" }, { t: "manyfoeM" },
           { t: "eclipsekillerM" }, { t: "wallfbshort" }],
    subfs: "fbburst4",
    ssName: "シルヴァ・レガリア", ssTurns: 18, ssKind: "milfy",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ ふれた味方を<b>ステータス×1.8</b>＋<b>無敵</b>（どちらも<b>各自1行動目まで</b>）",
    ssDesc: "<b>翠樹の加護をまとって自強化（攻撃×1.8・スピード×1.2）</b>し、<b>このショット中にふれた味方すべてのステータスを×1.8</b>に引き上げる。"
      + "この強化は<b>その味方がそれぞれ1回行動し終えるまで</b>続く。さらに<b>ふれた味方は同じあいだ無敵</b>になり、<b>あらゆるダメージを無効化</b>する"
      + "（<b>ミルフィと同じフルバースト</b>）。"
      + "ミルフィが反射なのに対してこちらは<b>貫通</b>なので、<b>敵をすり抜けて味方だけを一直線になぞれる</b>のが持ち味。"
      + "<b>敵多底力M</b>を持つので、敵が" + FEWFOE_N + "体より多い場面（＝守りたい場面）ほど自分の火力も上がる。",
    fsName: "超強クイックチャージショット", fsKind: "superchargeshot",
    fsPow: "チャージ弾 攻撃力×" + SCHG_MUL + " ×" + SCHG_N + "体（同時ロックオン）＋ 着弾ごとに衝撃波 攻撃力×" + SCHG_BOOM_MUL,
    fsDesc: "クイックチャージショットの<b>大幅な強化版</b>。ふれた味方が走っているあいだ翠雷を溜め続け、"
      + "<b>その味方が止まった瞬間に、近い敵" + SCHG_N + "体を同時にロックオン</b>して極太のチャージ弾を撃ちこむ。"
      + "1発の威力は<b>×2.4 → ×" + SCHG_MUL + "</b>まで跳ね上がり、さらに<b>着弾した場所から衝撃波</b>が広がって"
      + "まわりの敵もまとめて薙ぐ。溜めるほど派手になる、盤面を一掃する砲撃型のリンクスキル",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-07 幽冥の庭園 降臨キャラ「ドミニア」（蝕魔族）
     ・第11〜15ノ園のボス本人。<b>幽冥の庭園 85WAVE 踏破</b>で仲間になる。
     ・ヘカーティア（20WAVE）は「扱いやすい実用型」だったが、こちらは
       庭園の最奥を踏破した証なので<b>ガチャ限定SSRと同格</b>の性能にしてある。
     ══════════════════════════════════════════════════════════════ */
  dominia: {
    id: "dominia", nm: "ドミニア", img: "Dominia.webp", th: "t_Dominia.webp",
    el: "dark", shot: "pierce", garden: true, lux: true, nexus: "slayer", star5: true,
    hp: [942, 6210], atk: [520, 3320], spd: [290, 428],
    /* ★ 2026-08-07 作り直し: 種族キラー（冥花種キラーL・蝕冥滅殺M）は<b>持たせない</b>。
       庭園のボス本人が庭園特化キラーまで持つと、降臨キャラ1体で庭園が終わってしまい、
       種族キラーを積むために引くプレミアムSSRの役目がなくなるため。
       かわりに<b>ザコキラーL</b>（ボス以外の敵に×2.5）で「道中の掃除役」に寄せ、
       オムニアンチも外して<b>マインスイーパーL</b>（拾って×2.5）に置きかえてある。 */
    abil: [{ t: "msL" }, { t: "superaslow" }, { t: "award" },
           { t: "mobkillerL" }, { t: "weakkillerL" },
           { t: "soulM" }, { t: "barrierL" }],
    /* ★ サブリンクはリンクスキル（アブソリュートレイ10）と役割が重ならないものにする。
       放電は「敵から敵へ伝うたびに威力が上がる」連鎖型なので、
       雑魚が多い庭園のWAVEで、薙ぎ払いのレイと綺麗に住み分けられる。 */
    subfs: "discharge",
    ssName: "蝕冥終焉・ドミニアエクリプス", ssTurns: 16, ssKind: "dominia",
    ssPow: "自強化（攻撃×2.0・スピード×1.3）＋ <b>ふれた敵を防御ダウン</b>（4ターン）＋ <b>停止時に画面上のすべての敵へ蝕の大爆発</b>（攻撃力×3.2）",
    ssDesc: "<b>蝕の闇をまとって自強化（攻撃×2.0・スピード×1.3）</b>し、"
      + "このショット中に<b>ふれた敵すべての防御力を4ターンのあいだ大きくダウン</b>させる。"
      + "そして<b>止まった瞬間、庭園そのものを喰らう大爆発</b>が画面上の<b>すべての敵</b>を飲みこむ（攻撃力×3.2）。"
      + "<b>先に防御を削ってから全体に爆発を落とす</b>ので、1回のフルバーストで盤面をまとめて崩しきれる。"
      + "<b>マインスイーパーL・超アンチ減速壁・アンチ断絶界</b>に<b>ザコキラーL（ボス以外へ×" + MOBKILLER_L_MUL + "）</b>を重ね、"
      + "自分が生まれた幽冥の庭園を、そのまま丸ごと踏み荒らすために作られた降臨キャラ。",
    fsName: "アブソリュートレイ10", fsKind: "absoluteray",
    fsPow: "レイ10本 × 攻撃力×" + ABSRAY_MUL + "（貫通・レイ1本につき1ヒット／長さはランダム " + ABSRAY_MIN + "〜" + ABSRAY_MAX + "）",
    fsDesc: "自分を中心に、<b>長さのちがう10本の極大レイ</b>が伸び、<b>1回転ぶん薙ぎ払う</b>。レイは<b>貫通</b>なので通り道の敵をまとめて斬り裂く（<b>近くの敵ほど多くのレイが届く</b>）",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-11 プレミアムセレクトガチャ 新SSR 3体（シズク・ユウナギ・イズミ）
     ・3体とも<b>オムニアンチは持たず、アンチはちょうど2種</b>にそろえてある。
     ・そのかわり、<b>そのアンチ2種がそのまま噛み合う幽冥の庭園</b>が必ず1つあり、
       しかも<b>その園に対して属性有利</b>になるよう組んである（＝属性有利の適正を最低1つ持つ）。
         シズク  （水）… 超マインスイーパーM＋超アンチ重力バリア → 第5ノ園（火・地雷＋重力バリア）
         ユウナギ（光）… 超アンチワープ＋アンチブロック          → 第18ノ園（闇・ワープ＋ブロック）
         イズミ  （木）… 超アンチ重力バリア＋アンチブロック      → 第3ノ園（水・重力バリア＋ブロック）
     ・フルバーストは既存の ssKind を共有する（リアナ＝ナズナ、シズカ＝ネフィアと同じ作法）。
       名前と説明だけ本人のものにしてあり、挙動・演出・倍率は元のキャラと同じ道を通る。
     ══════════════════════════════════════════════════════════════ */
  shizuku: {
    id: "shizuku", nm: "シズク", img: "Shizuku.webp", th: "t_Shizuku.webp",
    el: "water", shot: "bounce", type: "碧滴支援型", gacha: true, lux: true, nexus: "mercy",
    hp: [902, 5950], atk: [478, 3050], spd: [284, 418],
    abil: [{ t: "supermsM" }, { t: "sgrav" }, { t: "killerM", el: "fire" }, { t: "weakkillerM" }, { t: "regenM" }],
    subfs: "boundheal",
    ssName: "アクアティア・ルミナスドロップ", ssTurns: 12, ssKind: "setsuna",
    ssPow: "自強化（攻撃×1.8・スピード×1.3）＋ ふれた味方1体につき <b>チームHPを12%回復</b>",
    ssDesc: "<b>青い雫の光をまとって自強化（攻撃×1.8・スピード×1.3）</b>し、<b>ふれた味方1体ごとにチームHPを12%回復</b>する"
      + "（<b>セツナと同じフルバースト</b>を、反射の体で使えるのが強み。壁で跳ね返りながら味方のあいだを往復できる）。"
      + "<br><b>超マインスイーパーM</b>と<b>超アンチ重力バリア</b>を併せ持つので、"
      + "<b>地雷と重力バリアが重なる部屋</b>——たとえば<b>幽冥の庭園 第5ノ園（火属性）</b>では、"
      + "属性有利もあわせて真価を発揮する。<b>火属性キラーM</b>と<b>弱点キラーM</b>で削りも十分。",
    fsName: "ツインインボリュートスフィア", fsKind: "twininvolute",
    fsPow: "スフィア1ヒット 攻撃力×0.34（全画面・2回転しながら広がり画面外へ抜ける）",
    fsDesc: "<b>連なったスフィアが2本のらせんを描き、味方を中心に2回転しながら半径を大きくしていく</b>。らせんは<b>画面のいちばん遠いスミまで届く全画面攻撃</b>で、<b>180°反対の2方向から挟みこむ</b>。近くの敵から順に、最後は<b>画面上のどこにいる敵にも</b>当たり、そのまま<b>画面の外へ抜けていく</b>",
  },
  yuunagi: {
    id: "yuunagi", nm: "ユウナギ", img: "Yuunagi.webp", th: "t_Yuunagi.webp",
    el: "light", shot: "pierce", type: "宵凪壁撃型", gacha: true, lux: true, nexus: "charge",
    hp: [886, 5840], atk: [496, 3160], spd: [282, 414],
    abil: [{ t: "superaw" }, { t: "ablock" }, { t: "eclipsekillerM" }, { t: "vitalL" }, { t: "wallfbshort" }],
    subfs: "atkspdup",
    ssName: "ヨイナギ・ゴールドフィナーレ", ssTurns: 20, ssKind: "nazuna",
    ssPow: "自強化（攻撃×1.6）＋ <b>壁にふれるたびパワーUP（最大×10.0）</b> ＋ <b>撃った瞬間に味方全員で総攻撃（全員が動く・突撃中の直殴り×" + RALLY_MUL + "）</b>",
    ssDesc: "<b>自強化して飛び出し（攻撃×1.6）</b>、<b>壁にぶつかるたびに宵の光がふくらんでいく（最大×10.0）</b>。"
      + "<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×" + RALLY_MUL + "</b>）"
      + "——<b>ナズナと同じフルバースト</b>を、<b>光属性・貫通</b>の体で使える。"
      + "<br><b>壁FBターン短縮</b>を持つので、壁を叩く立ち回りがそのまま次のフルバーストを早める。"
      + "<b>超アンチワープ</b>と<b>アンチブロック</b>がそろうので、"
      + "<b>幽冥の庭園 第18ノ園（闇属性・ワープ＋ブロック）</b>には属性有利のまま踏み込める。"
      + "そこのボスに刺さる<b>蝕魔族キラーM</b>と<b>バイタルキラーL</b>も積んである。",
    /* ★ 2026-08-12 リンクスキルを「コピー」に変更した。
       ユウナギは壁で積み上げて総攻撃するタイプなので、味方のあいだを長く走る。
       走りながら<b>ふれた味方の強いリンクを、光属性＋本人のキラーで撃ち直せる</b>ほうが
       立ち回りと噛み合う。 */
    fsName: "コピー", fsKind: "copy",
    fsPow: "ふれた味方のリンクスキルを<b>ユウナギの光属性・ユウナギのキラー</b>で発動（威力そのまま）",
    fsDesc: "<b>ふれた味方が持っているリンクスキルをそのままコピー</b>して発動する。"
      + "撃つのは相手のリンクでも、<b>属性はユウナギの光属性</b>・<b>キラーもユウナギのもの</b>が乗るので、"
      + "<b>闇が有利な相手に、蝕魔族キラーM・バイタルキラーLを乗せた強力なリンクを撃ちこめる</b>",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定SSR 6体
     ・水着の夏フェス。<b>蒼夏祭でのみ排出</b>（プレミアム・ほかのフェスからは出ない）。
     ・6体それぞれに<b>ちがう役割</b>を持たせてある:
         フウカ   … 反射／水。ネフィアと同じ支援FBで味方のパワーを底上げする
         ツムギ   … 貫通／木。8ターンで撃てる最速級。HPを削って一撃に変える
         スズカ   … 貫通／光。ミオンαと同じ2段構えのFBを16ターンで撃つ
         カレム   … 反射／火。シェリーαと同じ乱打FB＋クロス「渾身」で攻撃×3
         マユ     … 反射／木。カリナと同じ範囲デバフFB＋治癒の祈り
         チヅル   … 貫通／闇。新FB＋新リンク「サーキュレーション」＋新サブリンク
     ・カレム・マユ・チヅルは<b>クロススキル</b>を持つ。
     ══════════════════════════════════════════════════════════════ */
  fuka: {
    id: "fuka", nm: "フウカ", img: "Fuka.webp", th: "t_Fuka.webp",
    el: "water", shot: "bounce", type: "蒼波支援型", fes: true, fesKey: "aoka", lux: true, nexus: "tempo",
    hp: [892, 5880], atk: [488, 3100], spd: [286, 420],
    abil: [{ t: "ablock" }, { t: "award" }, { t: "killer", el: "fire" }, { t: "vitalM" }, { t: "soulM" }, { t: "fbshort" }],
    subfs: "boundcharge",
    ssName: "アズュール・ブレッシング", ssTurns: 20, ssKind: "nephia",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ <b>ふれた味方のパワーを×2.0</b>（その味方が2回行動するまで）",
    ssDesc: "<b>蒼い波をまとって自強化（攻撃×1.7・スピード×1.2）</b>し、<b>そのショット中にふれた味方すべてのパワーを×2.0</b>に引き上げる"
      + "（<b>ネフィアと同じフルバースト</b>を、<b>反射</b>の体で使える。壁で跳ね返りながら味方のあいだを往復できるので、"
      + "1ショットで配れる人数が多い）。強化は<b>その味方が2回行動し終えるまで</b>続くので、"
      + "<b>味方の大技に合わせて配ってから撃たせる</b>のが基本。"
      + "<br><b>FBターン短縮</b>を持つので次のフルバーストも早い。<b>アンチブロック・アンチ断絶界</b>に"
      + "<b>火属性キラー</b>と<b>バイタルキラーM</b>を重ねてあり、自分でも十分に削れる。",
    fsName: "ツインインボリュートスフィア", fsKind: "twininvolute",
    fsPow: "スフィア1ヒット 攻撃力×0.34（全画面・2回転しながら広がり画面外へ抜ける）",
    fsDesc: "<b>連なったスフィアが2本のらせんを描き、味方を中心に2回転しながら半径を大きくしていく</b>。らせんは<b>画面のいちばん遠いスミまで届く全画面攻撃</b>で、<b>180°反対の2方向から挟みこむ</b>。近くの敵から順に、最後は<b>画面上のどこにいる敵にも</b>当たり、そのまま<b>画面の外へ抜けていく</b>",
  },
  tsumugi: {
    id: "tsumugi", nm: "ツムギ", img: "Tsumugi.webp", th: "t_Tsumugi.webp",
    el: "wood", shot: "pierce", type: "翠夏疾走型", fes: true, fesKey: "aoka", lux: true, nexus: "charge",
    hp: [880, 5810], atk: [502, 3200], spd: [294, 432],
    abil: [{ t: "supermsM" }, { t: "antilock" }, { t: "sokojikaraEL" }, { t: "laserstopM" },
           { t: "elemresM", el: "water" }, { t: "fbaccel" }],
    subfs: "nebula",
    ssName: "ヴェルデ・ブレイクスルー", ssTurns: 8, ssKind: "tsumugi",
    ssPow: "このターン中 自強化（攻撃×" + TSUMUGI_ATK + "・スピード×" + TSUMUGI_SPD + "）＋ <b>チームHPの"
      + Math.round(TSUMUGI_HP_COST * 100) + "%を消費してさらにパワーUP（最大 攻撃×" + (TSUMUGI_ATK * TSUMUGI_BURN_MAX).toFixed(1)
      + "）</b> ＋ <b>ダメージウォール・重力バリア・ワープ・地雷をすべて無効化</b>",
    ssDesc: "<b>わずか" + 8 + "ターン</b>で撃てる、蒼夏祭でいちばん軽いフルバースト。"
      + "<b>そのターンのあいだだけ</b>自強化（攻撃×" + TSUMUGI_ATK + "・スピード×" + TSUMUGI_SPD + "）し、"
      + "さらに<b>チームHPの" + Math.round(TSUMUGI_HP_COST * 100) + "%を燃やして攻撃力に変える</b>"
      + "（残りHPが多いほど大きく燃え、<b>最大で攻撃×" + (TSUMUGI_ATK * TSUMUGI_BURN_MAX).toFixed(1) + "</b>まで伸びる）。"
      + "<br>撃っているあいだは<b>ダメージウォール・重力バリア・ワープ・地雷がすべて無効</b>になるので、"
      + "<b>ギミックだらけの盤面をまっすぐ突き抜けられる</b>。"
      + "<b>底力EL</b>と噛み合っており、HPを削って撃つほど倍率が乗る攻めのフルバースト。"
      + "<br><small>※ HPが1未満になることはありません</small>",
    fsName: "オートエイムビット", fsKind: "autoaimbit", fsPow: AIMBIT_POW,
    fsDesc: "<b>4つのビット</b>がふれた味方に付き従い、<b>近くの敵へ自動で狙いを付けて撃ち続ける</b>。味方が止まるまで途切れないので、長く走る味方ほど手数が伸びる",
  },
  suzuka: {
    id: "suzuka", nm: "スズカ", img: "Suzuka.webp", th: "t_Suzuka.webp",
    el: "light", shot: "pierce", type: "超連撃型", fes: true, fesKey: "aoka", lux: true, nexus: "pierce",
    hp: [884, 5830], atk: [506, 3220], spd: [292, 430],
    abil: [{ t: "superaw" }, { t: "ablock" }, { t: "outkillerL" }, { t: "fatalkillerL" },
           { t: "allresM" }, { t: "ailmentresist" }],
    subfs: "wallcircuit",
    ssName: "白閃連撃・サマーオーヴァードライヴ", ssTurns: 16, ssKind: "mionA",
    ssPow: "1st 体当たり 攻撃力×2.7 ／ 停止後の 2nd 体当たり 攻撃力×4.0（再加速）",
    ssDesc: "自強化状態でフィールドを駆けまわり（<b>×2.7</b>）、<b>止まったあとさらに強化された状態でもう一度自動で走り出す（×4.0）</b>2段構えの超火力フルバースト"
      + "（<b>ミオンαと同じフルバースト</b>を、<b>16ターン</b>という短さで撃てるのが最大の強み）。"
      + "<br><b>アウトポジションキラーL</b>で<b>壁ぎわに追いつめた敵</b>に" + OUTKILLER_L_MUL + "倍、"
      + "<b>フェイタルキラーL</b>で<b>削りきる場面</b>に" + FATALKILLER_L_MUL + "倍が乗るので、"
      + "外周へ押しこんでから2ndランを叩きこむのが必勝の形。"
      + "<b>全属性耐性M</b>と<b>状態異常レジスト</b>で場持ちもよい。",
    fsName: "超強連気弾", fsKind: "kiblastex", fsPow: "気弾7発 × 攻撃力×0.85（残りHPの少ない敵を優先）",
    /* ★ 2026-08-18 同名のリンクスキルは<b>説明も同じ</b>にそろえた（アステラと同じ本文） */
    fsDesc: "<b>連気弾の強化版</b>。<b>7発の気弾</b>を続けざまに撃ち出す。1発の威力は<b>×0.55 → ×0.85</b>。"
      + "<b>残りHPの少ない敵から優先して</b>狙うので、削り残しをまとめて片付けられる",
  },
  karem: {
    id: "karem", nm: "カレム", img: "Karem.webp", th: "t_Karem.webp",
    el: "fire", shot: "bounce", type: "超乱打型", fes: true, fesKey: "aoka", lux: true, nexus: "force",
    connect: "karem",
    hp: [900, 5940], atk: [504, 3210], spd: [288, 424],
    abil: [{ t: "superadw" }, { t: "antilock" }, { t: "award" }, { t: "fsboostM" },
           { t: "laserstopM" }, { t: "mobkillerM" }],
    subfs: "poison",
    ssName: "灼夏絶影・クリムゾンラプソディ", ssTurns: 20, ssKind: "cherylA",
    ssPow: "最初にふれた敵で<b>停止</b>して 乱打" + CHERYLA_BARRAGE_N + "連（各 攻撃力×" + CHERYLA_BARRAGE_PER
      + "＝合計×" + (CHERYLA_BARRAGE_N * CHERYLA_BARRAGE_PER).toFixed(1) + "）＋ 体当たり 攻撃力×2.2 ＋ <b>自分の次のターンまで無敵</b>",
    ssDesc: "攻撃力アップ（<b>×2.2</b>）して飛び出し、<b>そのショットで最初にふれた敵の上で止まり、灼夏の乱打"
      + CHERYLA_BARRAGE_N + "連（各×" + CHERYLA_BARRAGE_PER + "）</b>をたたき込む"
      + "（<b>シェリーαと同じフルバースト</b>を、<b>反射</b>の体で使える。壁で跳ね返って"
      + "<b>狙った敵に一発目を当てにいきやすい</b>のが反射版の強み）。"
      + "さらに撃った瞬間から<b>自分の次のターンが終わるまで無敵</b>になる。"
      + "<br>クロススキル<b>渾身</b>が開くと<b>攻撃力×" + KONSHIN_ATK + "</b>——"
      + "そのかわり<b>スピードが×" + KONSHIN_SPD + "</b>になって走る距離が短くなるので、"
      + "<b>敵のそばまで運んでから撃つ</b>立ち回りに変わる。",
    fsName: "インフィニティレーザー", fsKind: "infinitylaser", fsPow: "本体 攻撃力×1.6 ＋ 着弾から八方分裂レーザー 各 攻撃力×0.55",
    fsDesc: "<b>最も近い敵へ超極太レーザー</b>を放ち、<b>着弾した地点から八方向へ分裂レーザー</b>を撃ち出して周囲をまとめて薙ぎ払う",
  },
  mayu: {
    id: "mayu", nm: "マユ", img: "Mayu.webp", th: "t_Mayu.webp",
    el: "wood", shot: "bounce", type: "技巧型", fes: true, fesKey: "aoka", lux: true, nexus: "mercy",
    connect: "mayu",
    hp: [906, 5970], atk: [486, 3090], spd: [282, 416],
    abil: [{ t: "supermsEL" }, { t: "antilock" }, { t: "outkillerM" }, { t: "pray" }],
    subfs: "absoluteray",
    ssName: "翠夏ノ理・サマーソフィアリング", ssTurns: 24, ssKind: "karina",
    ssPow: "その場に停止し、<b>狙った方向を中心に視野角180°</b>の敵すべてを 翠夏の輪へ（毎ターン 最大HPの10%・4ターン継続 ＋ 防御力ダウン）",
    ssDesc: "<b>マユはその場から動かず</b>、引っぱった向きを中心に<b>視野角180°</b>の範囲にいる敵すべてに<b>翠夏の輪</b>を装着する"
      + "（<b>カリナと同じフルバースト</b>）。輪をかけられた敵は<b>4ターンのあいだ毎ターン最大HPの10%を失い</b>、"
      + "そのあいだ<b>防御力もダウン</b>する。<b>広く巻きこむほど強い</b>妨害・削り特化型。"
      + "<br><b>超マインスイーパーEL</b>と<b>アンチロックゾーン</b>を持ち、<b>治癒の祈り</b>でボス戦の立ち上がりも安定する。"
      + "<b>アウトポジションキラーM</b>があるので、外周に押しこまれた敵ほどよく削れる。"
      + "<br>クロススキルが開くと<b>FBターンアクセル</b>で24ターンをぐっと縮められ、"
      + "<b>蝕魔族キラーEL</b>が幽冥の庭園のボスに刺さる。",
    fsName: "超強鋭角三方向追従型貫通弾", fsKind: "supertri3followsharp",
    fsPow: "1発ごとに 攻撃力×" + SUPTRI_SHARP_PER + "（鋭角3方向・高速連射・貫通／味方が止まるまで撃ち続ける）",
    fsDesc: "<b>鋭角三方向追従型貫通弾の強化版</b>。3発が<b>ほとんど同じ点にまとまって</b>飛ぶ形はそのままに、"
      + "<b>連射が速く・弾が太く・威力も上</b>。まとまって当たるので、1体を集中して溶かすのが得意",
  },
  chizuru: {
    id: "chizuru", nm: "チヅル", img: "Chizuru.webp", th: "t_Chizuru.webp",
    el: "dark", shot: "pierce", type: "深宵殲滅型", fes: true, fesKey: "aoka", lux: true, nexus: "force",
    connect: "chizuru",
    hp: [910, 6000], atk: [510, 3250], spd: [290, 426],
    abil: [{ t: "sgrav" }, { t: "superaw" }, { t: "msEL" }, { t: "eclipseslayerEL" },
           { t: "ailmentresist" }, { t: "pray" }],
    subfs: "positionlimit",
    ssName: "宵闇廻遊・ミッドナイトチェイス", ssTurns: 24, ssKind: "chizuru",
    ssPow: "<b>自分の次の行動ターンまで</b>自強化（攻撃×" + CHIZURU_ATK + "・スピード×" + CHIZURU_SPD
      + "）＋ <b>ダメージウォール・重力バリア・ワープ・地雷を無効化</b>　／　停止後に<b>鮫" + CHIZURU_SHARKS
      + "体と共に再度走り出す</b>（体当たり×" + CHIZURU_RUN2_MUL + "）　／　ふれた敵は<b>攻撃ターン+2＆一定期間 防御力ダウン</b>",
    ssDesc: "宵闇の海をまとって<b>自強化（攻撃×" + CHIZURU_ATK + "・スピード×" + CHIZURU_SPD + "）</b>し、"
      + "<b>ダメージウォール・重力バリア・ワープ・地雷を無効化</b>して走り出す"
      + "（この2つは<b>自分の次の行動ターンが終わるまで</b>続くので、<b>次の1手も同じ状態で動ける</b>）。"
      + "<br><b>止まると" + CHIZURU_SHARKS + "体の鮫を引き連れてもう一度走り出し</b>（体当たり<b>×" + CHIZURU_RUN2_MUL + "</b>）、"
      + "鮫も同時に敵を食い破る。"
      + "<br>さらに<b>ふれた敵は攻撃ターンが2増え、一定期間 防御力がダウン</b>するので、"
      + "<b>削りながら敵の手番を後ろへ押しやる</b>——攻めと妨害を一度にこなす殲滅型のフルバースト。"
      + "<br><b>蝕冥滅殺EL</b>で幽冥の庭園のボス（冥花種・蝕魔族）に×" + ECLIPSE_SLAYER_EL_MUL + "、"
      + "<b>超アンチ重力バリア・超アンチワープ</b>で盤面も選ばない。"
      + "<br>クロススキルは<b>自分が完凸</b>で開き、<b>全属性キラーM</b>と<b>バブリーモード</b>が付く。",
    fsName: "サーキュレーション", fsKind: "circulation",
    fsPow: "刃1ヒット 攻撃力×" + CIRC_PER + "（輪の上の" + CIRC_N + "点）＋ <b>まとったプラズマ</b>1ヒット 攻撃力×" + CIRC_PLZ_PER
      + "（輪の線ぜんぶ・刃より短い間かくで再ヒット）／回転しながらだんだん拡大・多段ヒット",
    fsDesc: "<b>円形の刃</b>が発生し、<b>回転しながらだんだん大きく広がっていく</b>。"
      + "輪の上ならどこにふれてもヒットし、<b>同じ敵にも間をおいて何度でも入る</b>多段型。"
      + "<br>さらに輪は<b>プラズマをまとって</b>いて、刃の点と点のあいだ——<b>輪の線ならどこでも</b>——"
      + "<b>刃より短い間かくで</b>電撃が入る。刃のヒットにプラズマのヒットが重なるので、"
      + "<b>1回の発動で入るヒット数が大きく増える</b>。"
      + "はじめは近くの敵を刻み、広がりきるころには<b>まわり中の敵をまとめて巻きこむ</b>",
  },
  /* ══ ★ 2026-08-12 蒼夏祭 7人目・セイラ（闇／反射）══
     蒼夏祭の<b>大トリ</b>。フルバーストは MagiBurst 史上最高火力で、
     「壁をすり抜けて、最初にふれた敵に全部たたき込む」1点特化型。
     ★ アビリティは<b>アンチギミック3種がすべて「超」</b>なので、
       ダメージウォール・重力バリア・ワープのどれが来ても通れるうえ、
       超アンチワープは画面上のワープ1つにつきステータスが上がる＝ワープ地帯ほど強い。 */
  seira: {
    id: "seira", nm: "セイラ", img: "Seira.webp", th: "t_Seira.webp",
    el: "dark", shot: "bounce", type: "深宵絶影型", fes: true, fesKey: "aoka", lux: true, nexus: "force",
    connect: "seira",
    hp: [915, 6030], atk: [514, 3270], spd: [286, 422],
    abil: [{ t: "superadw" }, { t: "sgrav" }, { t: "superaw" },
           { t: "elemresM", el: "light" }, { t: "combokillerL" }],
    subfs: "phoming20",
    ssName: "宵闇絶影・アビスラプソディ", ssTurns: 20, ssKind: "seira",
    ssPow: "自強化（攻撃×" + SEIRA_ATK + "・スピード×" + SEIRA_SPD + "）＋ <b>壁をすり抜けて</b>進み、"
      + "<b>最初にふれた敵で停止</b>して 乱打" + SEIRA_BARRAGE_N + "連（各 攻撃力×" + SEIRA_BARRAGE_PER
      + "＝合計×" + (SEIRA_BARRAGE_N * SEIRA_BARRAGE_PER).toFixed(1) + "）＋ <b>ふっとばし</b>",
    ssDesc: "宵闇をまとって<b>自強化（攻撃×" + SEIRA_ATK + "・スピード×" + SEIRA_SPD + "）</b>し、"
      + "<b>壁で跳ね返らずにすり抜けて反対側から出てくる</b>ようになる。"
      + "<br>そして<b>そのショットで最初にふれた敵の上で止まり</b>、"
      + "<b>宵闇の乱打" + SEIRA_BARRAGE_N + "連（各×" + SEIRA_BARRAGE_PER + "）</b>をたたき込んで最後に<b>ふっとばす</b>。"
      + "<br>全弾ヒットで合計<b>攻撃力×" + (SEIRA_BARRAGE_N * SEIRA_BARRAGE_PER).toFixed(1) + "</b>——"
      + "<b>MagiBurst 史上最高火力</b>のフルバーストで、ふっとばした敵は着地でさらにダメージを受ける。"
      + "<br>そのかわり<b>当たるのは最初の1体だけ</b>。壁をすり抜けられるので、"
      + "<b>どの敵に一発目を当てるかを狙って撃つ</b>のがすべてになる。"
      + "<br><b>超アンチダメージウォール・超アンチ重力バリア・超アンチワープ</b>の3種持ちで盤面を選ばず、"
      + "<b>光属性耐性M</b>で闇の弱点をおぎない、<b>連撃キラーL</b>が同じ敵を擦り続ける立ち回りと噛み合う。",
    fsName: "ブレイドオービット", fsKind: "bladeorbit", fsPow: "剣1ヒット 攻撃力×0.30（6本・味方が止まるまで高速回転）",
    fsDesc: "ふれた味方の<b>まわりを6本の剣が高速で回転</b>し、<b>その味方が止まるまで</b>触れた敵を斬り続ける",
  },
  izumi: {
    id: "izumi", nm: "イズミ", img: "Izumi.webp", th: "t_Izumi.webp",
    el: "wood", shot: "bounce", type: "翠庭技巧型", gacha: true, lux: true, nexus: "bond",
    hp: [894, 5890], atk: [484, 3080], spd: [288, 424],
    abil: [{ t: "sgrav" }, { t: "ablock" }, { t: "netherkillerM" }, { t: "killerM", el: "water" }, { t: "regenL" }],
    subfs: "roundcharge",
    ssName: "ヴェルデ・スプリングノート", ssTurns: 14, ssKind: "astera",
    ssPow: "自強化（攻撃×1.65・スピード×1.25）＋ <b>ふれた敵の攻撃ターンを2増加</b>",
    ssDesc: "<b>若葉の泉をまとって自強化（攻撃×1.65・スピード×1.25）</b>し、<b>ふれた敵の攻撃ターンを2ずつ遅らせて</b>いく"
      + "（<b>アステラと同じフルバースト</b>を、<b>反射</b>の体で使える。壁で跳ね返りながら同じ敵を何度も擦れるので、"
      + "<b>1体の手番を大きく後ろへ押しやる</b>使いかたが得意）。"
      + "<br><b>超アンチ重力バリア</b>と<b>アンチブロック</b>がそろうので、"
      + "<b>幽冥の庭園 第3ノ園（水属性・重力バリア＋ブロック）</b>には属性有利のまま入れる。"
      + "そこのボスに効く<b>冥花種キラーM</b>と<b>水属性キラーM</b>も重なるので、通しで見ると倍率が大きく伸びる。",
    fsName: "超強ハイエナジーサークル", fsKind: "superenergycircle",
    fsPow: "攻撃力×" + SENERGY_MUL + "（画面上のすべての敵・時間差で" + SENERGY_WAVES + "連発）",
    fsDesc: "ハイエナジーサークルの上位。<b>威力が ×1.25 → ×" + SENERGY_MUL + "</b>に跳ね上がり、"
      + "さらに<b>大きな輪が時間差で" + SENERGY_WAVES + "回</b>広がる。位置取りを問わず<b>画面上の敵すべて</b>に届くので、"
      + "散らばった敵をまとめて削り切れる",
  },
  /* ══ ★ 2026-08-16 プレミアムSSR 2体（アンナ・ツキノ）══
     ・アンナ … 光／反射。フルバーストは<b>シェリーα（cherylA）と同じ乱打</b>だが、
                <b>無敵をやめて、そのかわり最後にふっとばす</b>形にしてある（ssKind "annaA"）。
                アンチギミックは<b>ダメージウォールとワープが「超」</b>＋アンチブロック。
     ・ツキノ … 火／貫通。フルバーストは<b>フウカ（nephia）と同じ</b>ので ssKind をそのまま共有する。
                クロススキル持ち（撃種が同じ味方が2体以上）。
     ★ 同じ名前のアビリティ・リンクスキルは、どのキャラでも効果がまったく同じになるよう
       既存のキー（superadw / superaw / superspinring …）をそのまま使うこと。
       ここで独自の名前・独自の数値を作らないこと。 */
  anna: {
    id: "anna", nm: "アンナ", img: "Anna.webp", th: "t_Anna.webp",
    el: "light", shot: "bounce", type: "煌貴絶影型", gacha: true, lux: true, nexus: "force",
    hp: [906, 5970], atk: [506, 3220], spd: [288, 424],
    abil: [{ t: "superadw" }, { t: "superaw" }, { t: "ablock" },
           { t: "eclipsekillerM" }, { t: "sokojikaraL" }, { t: "bubblemode" }],
    subfs: "positionlimit",
    ssName: "煌貴絶影・オーロララプソディ", ssTurns: 20, ssKind: "annaA",
    ssPow: "最初にふれた敵で<b>停止</b>して 乱打" + CHERYLA_BARRAGE_N + "連（各 攻撃力×" + CHERYLA_BARRAGE_PER
      + "＝合計×" + (CHERYLA_BARRAGE_N * CHERYLA_BARRAGE_PER).toFixed(1) + "）＋ 体当たり 攻撃力×2.2 ＋ <b>ふっとばし</b>",
    ssDesc: "攻撃力アップ（<b>×2.2</b>）して飛び出し、<b>そのショットで最初にふれた敵の上で止まり、黄金の乱打"
      + CHERYLA_BARRAGE_N + "連（各×" + CHERYLA_BARRAGE_PER + "）</b>をたたき込む"
      + "（<b>シェリーαと同じ乱打フルバースト</b>。全弾ヒットで合計 攻撃力×"
      + (CHERYLA_BARRAGE_N * CHERYLA_BARRAGE_PER).toFixed(1) + "）。"
      + "<br>ちがうのは締めかたで、<b>無敵にはならないかわりに、最後にその敵を大きくふっとばす</b>。"
      + "ふっとばされた敵は<b>着地でさらにダメージを受け</b>、位置も大きく崩れるので、"
      + "<b>次のターンの並びごと作り替えられる</b>。"
      + "<br><b>超アンチダメージウォール・超アンチワープ・アンチブロック</b>で盤面を選ばず、"
      + "<b>底力L</b>が効きはじめる後半ほど乱打の総火力が伸びる。"
      + "<b>バブリーモード</b>で減速を振り切れるので、乱打の一発目を遠くの敵にも当てにいける。",
    /* ★ 同じ名前のリンクスキルは効果も文言もそろえること（ユキノ・ケリスと同じ本文） */
    fsName: "超強オービタルエッジ", fsKind: "superspinring",
    fsPow: "リング1ヒット 攻撃力×" + SSPIN_MUL + "（超巨大リング" + SSPIN_N + "基・壁で反射・当たり直しも速い）",
    fsDesc: "オービタルエッジの<b>強化版</b>。光のリバウンドサークルが<b>7基 → " + SSPIN_N + "基</b>に増え、"
      + "<b>1基の大きさ（当たり判定）も威力も速さも、すべて上</b>（威力 ×0.30 → <b>×" + SSPIN_MUL + "</b>）。"
      + "特大リングが盤面じゅうを跳ねまわり、<b>同じ敵にも短い間隔で何度も入る</b>ので、味方が長く走るほど削り切れる",
  },
  tsukino: {
    id: "tsukino", nm: "ツキノ", img: "Tsukino.webp", th: "t_Tsukino.webp",
    el: "fire", shot: "pierce", type: "紅月支援型", gacha: true, lux: true, nexus: "tempo",
    connect: "tsukino",
    hp: [898, 5930], atk: [496, 3160], spd: [290, 426],
    abil: [{ t: "superadw" }, { t: "antilock" }, { t: "award" },
           { t: "mobkillerM" }, { t: "elemres", el: "wood" }, { t: "regenM" }],
    subfs: "boundheal",
    ssName: "クリムゾン・アセンション", ssTurns: 20, ssKind: "nephia",
    ssPow: "自強化（攻撃×1.7・スピード×1.2）＋ <b>ふれた味方のパワーを×2.0</b>（その味方が2回行動するまで）",
    ssDesc: "<b>紅い月の光をまとって自強化（攻撃×1.7・スピード×1.2）</b>し、<b>そのショット中にふれた味方すべてのパワーを×2.0</b>に引き上げる"
      + "（<b>フウカと同じフルバースト</b>を、<b>貫通</b>の体で使える。味方をすり抜けて一直線に走れるので、"
      + "<b>並んだ味方に一度で配れる</b>のが強み）。強化は<b>その味方が2回行動し終えるまで</b>続くので、"
      + "<b>味方の大技に合わせて配ってから撃たせる</b>のが基本。"
      + "<br><b>超アンチダメージウォール・アンチロックゾーン・アンチ断絶界</b>の3種持ちで、"
      + "<b>ザコキラーM</b>が取り巻きの掃除を、<b>リジェネM</b>が長期戦を支える。"
      + "<b>木属性耐性</b>があるので、木属性の敵が並ぶ面でも前に出られる。",
    fsName: "超強ルミナスレイ", fsKind: "superluminous",
    fsPow: "砲台1基のレーザー 攻撃力×" + SLUMI_MUL + "（貫通・最大" + SLUMI_N + "基・レーザーがさらに極太）",
    fsDesc: "ルミナスレイの上位。設置できる砲台が<b>4基 → " + SLUMI_N + "基</b>に増え、"
      + "レーザーは<b>威力も当たり判定の太さも大幅に強化</b>（×0.95 → <b>×" + SLUMI_MUL + "</b>）。"
      + "ふれた味方がぶつかった壁に砲台が並び、その味方が止まった瞬間に<b>盤面をまるごと貫く光の網</b>が走る",
  },

  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-16b プレミアム新SSR 6体（No.110〜115）
     ══════════════════════════════════════════════════════════════
     同じ名前のフルバースト・リンクスキル・アビリティは<b>効果も文言もそろえる</b>こと。
     ここでは既存の ssKind / fsKind / subfs を借りているものが多いので、
     借り元の本文をそのまま持ってきている（食いちがうと「同じ名前で違う効果」になる）。 */
  /* ══ ★ 2026-08-17k 蓬莱の九重の配布キャラ2体 ══
     ・アンチは<b>2つまで</b>・<b>オムニアンチは持たせない</b>（ご指定）。
     ・高難易度クエストで「有利属性で適正」になるように属性とアンチを選んである。
       瑶華＆玉蘭＝<b>光</b>（幽冥の庭園の闇ボス・蓬莱天宮の闇に有利）
       瑶妃＝<b>火</b>（禁忌の迷宮の木ボス・蓬莱の木の階層に有利）
     ・瑶華＆玉蘭は<b>ガチャSSRと同じくらい</b>、瑶妃は<b>少し上</b>。 */
  youka: {
    id: "youka", nm: "瑶華＆玉蘭", img: "Youka.webp", th: "t_Youka.webp",
    el: "light", shot: "bounce", type: "双撃連舞型", star5: true, quest: true, nexus: "tempo",
    connect: "youka",
    hp: [905, 5980], atk: [516, 3270], spd: [290, 428],
    /* アンチは2つだけ。断絶界と減速壁＝蓬莱・庭園の後半でいちばん止められる2つ */
    /* ★ 2026-08-17L キラーを1つ減らし、等級も L → M に下げた。
       クエスト配布なので、ガチャ限定SSRより強くならないようにする。 */
    abil: [{ t: "award" }, { t: "superaslow" }, { t: "killerM", el: "dark" }, { t: "fbshort" }],
    subfs: "reflectring",
    ssName: "双舞・瑶玉繚乱", ssTurns: 20, ssKind: "youka",
    ssPow: "自強化（攻撃×1.70・スピード×1.18）＋ <b>止まったあと もう一度動き出す</b>",
    ssDesc: "瑶華と玉蘭が背中あわせに舞い、<b>自強化（攻撃×1.70・スピード×1.18）</b>する。"
      + "<br><b>止まったあと もう一度ひとりでに動き出す</b>ので、"
      + "強化がかかった1ターンのうちに<b>2回ぶん走れる</b>。"
      + "<br><b>アンチ断絶界・超アンチ減速壁</b>の2種持ちで、"
      + "足を止めにくる高難易度クエストでも手数が落ちない。"
      + "<b>闇属性キラーM</b>は幽冥の庭園と蓬莱天宮の闇ボスにそのまま刺さる。",
    fsName: "ピアスシーカー12", fsKind: "homing",
    fsPow: "12発 × 攻撃力×" + PSEEKER_PER + "（敵を追尾しながら貫通・1体につき1ヒット）",
    fsDesc: "敵を追尾しながら貫通していく光弾を12発放つ。狙いをつけなくても当たるので、"
      + "盤面が荒れているクエストほど安定して数字が出る",
  },
  youhi: {
    id: "youhi", nm: "瑶妃", img: "Youhi.webp", th: "t_Youhi.webp",
    el: "fire", shot: "pierce", type: "天宮撃滅型", star5: true, quest: true, nexus: "slayer",
    connect: "youhi",
    hp: [948, 6280], atk: [534, 3380], spd: [296, 442],
    /* ★ 2026-08-17L キラーを3つ → 2つに、等級も EL → L / L → M に下げた。
       「ガチャより少し強い」を守りつつ、キラーの重ねがけで壊れないようにする。 */
    abil: [{ t: "sgrav" }, { t: "superaw" }, { t: "killerL", el: "wood" }, { t: "weakkillerM" }, { t: "fbshort" }],
    subfs: "phoming20",
    ssName: "天宮・九天繚乱", ssTurns: 19, ssKind: "youhi",
    ssPow: "自強化（攻撃×1.85・スピード×1.22）＋ <b>撃った瞬間に味方全員で総攻撃</b>",
    ssDesc: "九天の風をまとって<b>自強化（攻撃×1.85・スピード×1.22）</b>し、"
      + "<b>撃った瞬間に味方全員が突撃</b>する。味方の数がそのまま火力になるタイプ。"
      + "<br><b>超アンチ重力バリア・超アンチワープ</b>の2種持ちで足を止められず、"
      + "<b>木属性キラーL</b>と<b>弱点キラーM</b>が重なると、木の高難易度ボスを大きく削れる。",
    fsName: "超強インフィニティレーザー", fsKind: "superinfinitylaser",
    fsPow: "極太レーザー 攻撃力×" + SINFL_PER + "（貫通）＋ 着弾から" + SINFL_SPLIT_N + "方向へ分裂 各×" + SINFL_SPLIT_PER,
    fsDesc: "<b>インフィニティレーザーの強化版</b>。もっとも近い敵へ<b>さらに極太のレーザー</b>を撃ちこみ、"
      + "着弾点から<b>" + SINFL_SPLIT_N + "方向</b>へレーザーが分裂して広がる。"
      + "どれも貫通するので、射線と着弾点に敵が重なっているほど伸びる",
  },
  grace: {
    /* ══ ★ 2026-08-17b グレース（No.116 / 光・反射）══
       ・FB18ターン: 自強化＋<b>自分の行動2回ぶん 弱点キラー＆全属性キラー</b>＋<b>止まったあと もう一度動く</b>
       ・攻撃力チャージ: 1ショットで味方3体にふれると、3体目の攻撃力が1巡×1.5
       ・クロス（同属性2体以上）で ファントムドライブEL・ライトニングEL
       ・リンク 超強インフィニティレーザー／サブリンク ピアスシーカー20 */
    id: "grace", nm: "グレース", img: "Grace.webp", th: "t_Grace.webp",
    el: "light", shot: "bounce", type: "聖光撃滅型", gacha: true, lux: true, nexus: "slayer", star5: true,
    connect: "grace",
    hp: [935, 6150], atk: [528, 3320], spd: [292, 436],
    abil: [{ t: "superaw" }, { t: "superaslow" }, { t: "ablock" },
           { t: "eternalphotonM" }, { t: "firstkillerEL" }, { t: "atkcharge" }],
    subfs: "phoming20",
    ssName: "セイクリッド・ジャッジメント", ssTurns: 18, ssKind: "grace",
    ssPow: "自強化（攻撃×" + GRACE_ATK + "・スピード×" + GRACE_SPD + "）＋ <b>自分の行動" + GRACE_KILL_TURNS
      + "回ぶん 弱点キラー＆全属性キラー</b>／<b>止まったあと もう一度動き出す</b>",
    ssDesc: "聖なる光をまとって<b>自強化（攻撃×" + GRACE_ATK + "・スピード×" + GRACE_SPD + "）</b>し、"
      + "<b>自分の行動" + GRACE_KILL_TURNS + "回ぶんのあいだ 弱点キラーと全属性キラーの両方</b>になる。"
      + "<br>弱点にも属性にも倍率が乗るので、<b>弱点を通したときの伸びがとても大きい</b>。"
      + "さらに<b>止まったあと もう一度ひとりでに動き出す</b>ので、"
      + "強化がかかった1ターンのうちに<b>2回ぶん走れる</b>。"
      + "<br><b>攻撃力チャージ</b>は、1回のショットで<b>味方" + ATKCHARGE_N + "体にふれる</b>と"
      + "<b>" + ATKCHARGE_N + "体目にふれた味方</b>の攻撃力が<b>1巡のあいだ×" + ATKCHARGE_MUL + "</b>になる。"
      + "誰を最後にふれるかを選べるので、次に撃つ味方を狙って強化できる。"
      + "<br><b>超アンチワープ・超アンチ減速壁・アンチブロック</b>の3種持ちで足を止められない。",
    fsName: "超強インフィニティレーザー", fsKind: "superinfinitylaser",
    fsPow: "極太レーザー 攻撃力×" + SINFL_PER + "（貫通）＋ 着弾から" + SINFL_SPLIT_N + "方向へ分裂 各×" + SINFL_SPLIT_PER,
    fsDesc: "<b>インフィニティレーザーの強化版</b>。もっとも近い敵へ<b>さらに極太のレーザー</b>を撃ちこみ、"
      + "着弾点から<b>" + SINFL_SPLIT_N + "方向</b>へレーザーが分裂して広がる。"
      + "<br>本体の威力は<b>×1.60 → ×" + SINFL_PER + "</b>、分裂1本は<b>×0.55 → ×" + SINFL_SPLIT_PER + "</b>、"
      + "分裂の数も<b>8方向 → " + SINFL_SPLIT_N + "方向</b>に増えている。"
      + "どれも貫通するので、射線と着弾点に敵が重なっているほど伸びる。",
  },
  moeka: {
    id: "moeka", nm: "モエカ", img: "Moeka.webp", th: "t_Moeka.webp",
    el: "water", shot: "bounce", type: "蒼滴撹乱型", gacha: true, lux: true, nexus: "gale",
    hp: [884, 5830], atk: [488, 3110], spd: [296, 436],
    abil: [{ t: "antilock" }, { t: "award" }, { t: "eclipsekillerM" },
           { t: "elemresM", el: "fire" }, { t: "sokojikaraL" }, { t: "barrierL" }, { t: "fsdouble" }],
    subfs: "phoming20",
    /* ★ ユキノと同じフルバーストだが、無効化するのは<b>ブロックだけ</b>（moeka 分岐で処理） */
    ssName: "アクア・ブレイクスルー", ssTurns: 7, ssKind: "moeka",
    ssPow: "<b>貫通タイプに変化</b>＋<b>ブロックを無効化</b>＋<b>バブリー状態</b>（すべてこのショット中）",
    ssDesc: "蒼い雫の膜をまとい、<b>貫通タイプに変化</b>して盤面をまっすぐ走り抜ける。"
      + "このショットのあいだは<b>ブロックをすり抜けられる</b>ようになり、"
      + "さらに<b>バブリー状態</b>で減速しにくくなるので、<b>止まらずに味方をなぞり続けられる</b>。"
      + "<br>ユキノと同じ<b>わずか7ターン</b>で撃てる最速級のフルバーストだが、"
      + "無効化するのが<b>ブロックだけ</b>に絞られているぶん、"
      + "<b>ブロックで通り道が塞がれた面</b>で真価を発揮する——"
      + "本来は回り道するしかない導線を、<b>まっすぐ突っ切って味方を全員なぞる</b>。"
      + "<br><b>リンク×2</b>持ちなので、なぞった数だけリフレクションリングが増える。"
      + "<b>アンチロックゾーン・アンチ断絶界</b>で足を止められず、"
      + "<b>底力L</b>が効きはじめる後半ほど手数が火力に変わる。<b>バリアL</b>と<b>火属性耐性M</b>で前にも出られる。",
    fsName: "リフレクションリング", fsKind: "reflectring",
    fsPow: "リング1発 攻撃力×" + REFRING_PER + "（最大" + REFRING_MAX + "発・壁で1回だけ反射）",
    fsDesc: "ふれた味方から<b>属性のリング弾</b>を放ち、<b>1回だけ壁で反射</b>して広範囲の敵を攻撃する",
  },
  suzuha: {
    id: "suzuha", nm: "スズハ", img: "Suzuha.webp", th: "t_Suzuha.webp",
    el: "dark", shot: "pierce", type: "深宵絶影型", gacha: true, lux: true, nexus: "force",
    connect: "suzuha",
    hp: [920, 6060], atk: [518, 3290], spd: [288, 424],
    abil: [{ t: "supermsEL" }, { t: "sgrav" }, { t: "superaw" },
           { t: "weakkillerEL" }, { t: "speedmode" }, { t: "auraM" }],
    subfs: "roundheal",
    /* ★ セイラと同じフルバースト（ssKind を共有＝実装も文言も自動でそろう） */
    ssName: "宵闇絶影・アビスラプソディ", ssTurns: 20, ssKind: "seira",
    ssPow: "自強化（攻撃×" + SEIRA_ATK + "・スピード×" + SEIRA_SPD + "）＋ <b>壁をすり抜けて</b>進み、"
      + "<b>最初にふれた敵で停止</b>して 乱打" + SEIRA_BARRAGE_N + "連（各 攻撃力×" + SEIRA_BARRAGE_PER
      + "＝合計×" + (SEIRA_BARRAGE_N * SEIRA_BARRAGE_PER).toFixed(1) + "）＋ <b>ふっとばし</b>",
    ssDesc: "宵闇をまとって<b>自強化（攻撃×" + SEIRA_ATK + "・スピード×" + SEIRA_SPD + "）</b>し、"
      + "<b>壁で跳ね返らずにすり抜けて反対側から出てくる</b>ようになる。"
      + "<br>そして<b>そのショットで最初にふれた敵の上で止まり</b>、"
      + "<b>宵闇の乱打" + SEIRA_BARRAGE_N + "連（各×" + SEIRA_BARRAGE_PER + "）</b>をたたき込んで最後に<b>ふっとばす</b>。"
      + "<br>全弾ヒットで合計<b>攻撃力×" + (SEIRA_BARRAGE_N * SEIRA_BARRAGE_PER).toFixed(1) + "</b>——"
      + "<b>セイラと同じ最高火力</b>のフルバーストで、ふっとばした敵は着地でさらにダメージを受ける。"
      + "<br>そのかわり<b>当たるのは最初の1体だけ</b>。壁をすり抜けられるので、"
      + "<b>どの敵に一発目を当てるかを狙って撃つ</b>のがすべてになる。"
      + "<br><b>超マインスイーパーEL・超アンチ重力バリア・超アンチワープ</b>の3種持ち。"
      + "<b>スピードモード</b>で<b>各WAVEの出だしが速い</b>ので、一発目を通したい敵まで届かせやすい。"
      + "<b>弱点キラーEL</b>が弱点直撃をさらに伸ばし、<b>パワーオーラM</b>が常時の火力を底上げする。",
    fsName: "サーキュレーション", fsKind: "circulation",
    fsPow: "刃1ヒット 攻撃力×" + CIRC_PER + "（輪の上の" + CIRC_N + "点）＋ <b>まとったプラズマ</b>1ヒット 攻撃力×" + CIRC_PLZ_PER
      + "（輪の線ぜんぶ・刃より短い間かくで再ヒット）／回転しながらだんだん拡大・多段ヒット",
    fsDesc: "<b>円形の刃</b>が発生し、<b>回転しながらだんだん大きく広がっていく</b>。"
      + "輪の上ならどこにふれてもヒットし、<b>同じ敵にも間をおいて何度でも入る</b>多段型。"
      + "<br>さらに輪は<b>プラズマをまとって</b>いて、刃の点と点のあいだ——<b>輪の線ならどこでも</b>——"
      + "<b>刃より短い間かくで</b>電撃が入る。刃のヒットにプラズマのヒットが重なるので、"
      + "<b>1回の発動で入るヒット数が大きく増える</b>。"
      + "はじめは近くの敵を刻み、広がりきるころには<b>まわり中の敵をまとめて巻きこむ</b>",
  },
  violet: {
    id: "violet", nm: "ヴィオレット", img: "Violet.webp", th: "t_Violet.webp",
    el: "wood", shot: "bounce", type: "翠壁撃型", gacha: true, lux: true, nexus: "charge",
    hp: [896, 5910], atk: [500, 3180], spd: [292, 430],
    abil: [{ t: "supermsM" }, { t: "antilock" }, { t: "killerM", el: "water" },
           { t: "wallboostM" }, { t: "wallfbshort" }],
    subfs: "atkspdup",
    /* ★ ユウナギと同じフルバースト（ssKind "nazuna" を共有） */
    /* ★ 同じ ssKind（nazuna）＝ユウナギ・ナズナと同じフルバースト。
       数字も文言もそろえること（前回ここだけ別の説明を書いてしまい、
       「ユウナギと同じ」と言いながら中身が食いちがっていた）。 */
    ssName: "ヴェルデ・ゴールドフィナーレ", ssTurns: 20, ssKind: "nazuna",
    ssPow: "自強化（攻撃×1.6）＋ <b>壁にふれるたびパワーUP（最大×10.0）</b> ＋ <b>撃った瞬間に味方全員で総攻撃（全員が動く・突撃中の直殴り×" + RALLY_MUL + "）</b>",
    ssDesc: "<b>自強化して飛び出し（攻撃×1.6）</b>、<b>壁にぶつかるたびに翠の光がふくらんでいく（最大×10.0）</b>。"
      + "<b>撃ったその瞬間に味方全員が動き出して</b>最も近い敵へいっせいに突撃する（突撃中の直殴りは <b>×" + RALLY_MUL + "</b>）"
      + "——<b>ユウナギ・ナズナと同じフルバースト</b>を、<b>木属性・反射</b>の体で使える。"
      + "<br><b>ウォールブーストM</b>と<b>壁FBターン短縮</b>を併せ持つので、"
      + "<b>壁に当てれば当てるほど</b>火力が伸び、次のフルバーストも早く回ってくる。"
      + "反射タイプの体で、狭い面をわざと壁づたいに走らせるのが基本の使いかた。"
      + "<br><b>超マインスイーパーM・アンチロックゾーン</b>で足場を選ばず、<b>水属性キラーM</b>が刺さる面では主砲になる。",
    /* ★ 同じ名前のリンクスキルは効果も文言もそろえること（ベルティアと同じ本文） */
    fsName: "超強ハイプラズマ", fsKind: "superhiplasma",
    fsPow: "プラズマ 1ヒット 攻撃力×0.85（味方が止まるまで持続・当たり幅が広い）",
    fsDesc: "自分と触れた味方の間に<b>ハイプラズマをさらに極太にした閃光</b>を走らせる。<b>当たり判定の幅が広い</b>ので、多少ズレていても巻き込める",
  },
  kanata: {
    id: "kanata", nm: "カナタ", img: "Kanata.webp", th: "t_Kanata.webp",
    el: "fire", shot: "pierce", type: "アタッカー型", gacha: true, lux: true, nexus: "force",
    connect: "kanata",
    hp: [872, 5750], atk: [530, 3370], spd: [294, 432],
    abil: [{ t: "supermsL" }, { t: "ablock" }, { t: "fatalkillerM" },
           { t: "speedmode" }, { t: "barrierL" }],
    subfs: "poison",
    /* ★ レヴィアと同じフルバースト（ssKind "revia" を共有） */
    ssName: "イグニス・レクイエム", ssTurns: 20, ssKind: "revia",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>撃った瞬間に味方全員で総攻撃（全員が動く・突撃中の直殴り×1.5）</b> ＋ ふれた敵の<b>弱点倍率を大アップ</b>",
    ssDesc: "紅蓮をまとって<b>自強化（攻撃×1.8・スピード×1.2）</b>し、"
      + "<b>撃った瞬間に味方全員が突撃</b>する（レヴィアと同じフルバースト）。"
      + "さらに<b>このショットでふれた敵の弱点倍率が大きく上がる</b>ので、"
      + "<b>総攻撃の全員ぶんが弱点に乗る</b>のがこの技のねらいどころ。"
      + "<br><b>アタッカー型</b>なので、<b>戦型が同じ味方が1体でもいればクロススキル</b>が点く。"
      + "<b>フェイタルキラーM</b>が削れた敵にとどめを刺し、<b>スピードモード</b>が各WAVEの出だしを速める。"
      + "<b>超マインスイーパーL・アンチブロック</b>で盤面を選ばず、<b>バリアL</b>で前にも出られる。",
    fsName: "リフレクションリング", fsKind: "reflectring",
    fsPow: "リング1発 攻撃力×" + REFRING_PER + "（最大" + REFRING_MAX + "発・壁で1回だけ反射）",
    fsDesc: "ふれた味方から<b>属性のリング弾</b>を放ち、<b>1回だけ壁で反射</b>して広範囲の敵を攻撃する",
  },
  touka: {
    id: "touka", nm: "トウカ", img: "Touka.webp", th: "t_Touka.webp",
    el: "light", shot: "pierce", type: "超連撃型", gacha: true, lux: true, nexus: "pierce",
    hp: [902, 5950], atk: [504, 3200], spd: [290, 428],
    abil: [{ t: "superaw" }, { t: "aslow" }, { t: "outkillerM" },
           { t: "counterkiller" }, { t: "allresM" }, { t: "ailmentresist" }],
    subfs: "poison",
    /* ★ スズカと同じフルバースト（ssKind "mionA" を共有） */
    ssName: "白閃連撃・トウカオーヴァードライヴ", ssTurns: 16, ssKind: "mionA",
    /* ★ 同じ ssKind（mionA）＝スズカと同じフルバースト。数字も文言もそろえること */
    ssPow: "1st 体当たり 攻撃力×2.7 ／ 停止後の 2nd 体当たり 攻撃力×4.0（再加速）",
    ssDesc: "自強化状態でフィールドを駆けまわり（<b>×2.7</b>）、<b>止まったあとさらに強化された状態でもう一度自動で走り出す（×4.0）</b>2段構えの超火力フルバースト"
      + "（スズカと同じフルバーストを、<b>光属性</b>の体で使える）。"
      + "<br><b>アウトポジションキラーM</b>が<b>壁ぎわの敵</b>に、<b>カウンターキラー</b>が反撃してくる敵に効く。"
      + "<b>全属性耐性M</b>と<b>状態異常レジスト</b>で場持ちがよく、"
      + "<b>超アンチワープ・アンチ減速壁</b>で足を止められない。",
    fsName: "超強クロス分身弾", fsKind: "supercrossclone",
    fsPow: "分身" + SCC_CLONES + "体 1ヒット 攻撃力×" + SCC_PER + "（壁で反射・貫通・止まるまで）",
    fsDesc: "クロス分身弾の<b>強化版</b>。分身が<b>6体 → " + SCC_CLONES + "体</b>に増え、"
      + "<b>1ヒットの威力も動く時間も上</b>。分身が壁で反射しながら敵を貫き、削り続ける",
  },
  elena: {
    id: "elena", nm: "エレナ", img: "Elena.webp", th: "t_Elena.webp",
    el: "water", shot: "pierce", type: "蒼波連撃型", gacha: true, lux: true, nexus: "tempo",
    connect: "elena",
    hp: [910, 6000], atk: [512, 3250], spd: [286, 422],
    abil: [{ t: "sgrav" }, { t: "superaslow" }, { t: "antilock" },
           { t: "eternalphotonM" }, { t: "fewfoeEL" }, { t: "fbshort" }],
    subfs: "reflectring",
    ssName: "アクア・ダブルレクイエム", ssTurns: 18, ssKind: "elena",
    ssPow: "自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）＋ <b>撃った瞬間に味方全員で総攻撃</b>／"
      + "<b>止まったあと もう一度動き出し、そのときも味方全員で総攻撃</b>",
    ssDesc: "蒼波をまとって<b>自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）</b>し、"
      + "<b>撃った瞬間に味方全員が突撃</b>する。"
      + "<br>そして<b>自分が止まったあと、もう一度ひとりでに動き出し</b>、"
      + "<b>その2回目にも味方全員がもう一度突撃</b>する——"
      + "<b>1回のフルバーストで総攻撃が2回</b>入る、味方の数がそのまま火力になるタイプ。"
      + "<br><b>エターナルエーテルM</b>で<b>各WAVEをエーテル" + ETERNAL_PHOTON_M_N + "個</b>から始められるので、"
      + "運搬クエストでは初手から仕事ができる。"
      + "<b>敵少底力EL</b>は残りが少なくなった場面で刺さり、<b>FBターン短縮</b>で2回目以降も回りやすい。"
      + "<br><b>超アンチ重力バリア・超アンチ減速壁・アンチロックゾーン</b>の3種持ちで、足を止められない。",
    fsName: "サーキュレーション", fsKind: "circulation",
    fsPow: "刃1ヒット 攻撃力×" + CIRC_PER + "（輪の上の" + CIRC_N + "点）＋ <b>まとったプラズマ</b>1ヒット 攻撃力×" + CIRC_PLZ_PER
      + "（輪の線ぜんぶ・刃より短い間かくで再ヒット）／回転しながらだんだん拡大・多段ヒット",
    fsDesc: "<b>円形の刃</b>が発生し、<b>回転しながらだんだん大きく広がっていく</b>。"
      + "輪の上ならどこにふれてもヒットし、<b>同じ敵にも間をおいて何度でも入る</b>多段型。"
      + "<br>さらに輪は<b>プラズマをまとって</b>いて、刃の点と点のあいだ——<b>輪の線ならどこでも</b>——"
      + "<b>刃より短い間かくで</b>電撃が入る。刃のヒットにプラズマのヒットが重なるので、"
      + "<b>1回の発動で入るヒット数が大きく増える</b>。"
      + "はじめは近くの敵を刻み、広がりきるころには<b>まわり中の敵をまとめて巻きこむ</b>",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-18 プレミアム新SSR 8体（No.119〜126）
     ------------------------------------------------------------
     ★★ 2026-08-18b ご指定を取りちがえていたので作り直した。
       正しくは「<b>8体それぞれが、自分が有利属性になる蓬莱の九重のクエストの
       完全対応（＝必要アンチをすべて消せる）になる</b>」。
     ご指定の共通ルール:
       ・<b>オムニアンチは持たせない</b>
       ・<b>アンチは1体につきちょうど2種類</b>
       ・その2種が<b>担当クエストの必要アンチとぴったり一致</b>する

     蓬莱の必要アンチ（HOURAI_ANTI）と、そこで有利になる属性:
       第一重 火 {dw,grav}              ← 水が有利
       第二重 水 {dw,slowwall}          ← 木が有利   … アスハ
       第三重 木 {dw,ward}              ← 火が有利   … サツキ
       第四重 光 {grav,ward}            ← 闇が有利   … リリス／メルティ
       第五重 闇 {ward,warp}            ← 光が有利   … アルテミア／サヨ
       第六重 火 {mine,slowwall}        ← 水が有利   … ブレア
       第七重 水 {mine,ward}            ← 木が有利
       第八重 木 {dw,mine,grav}         ← 火が有利   ※3種なのでアンチ2つでは届かない
       第九重 光 {slowwall,ward}        ← 闇が有利   … リラ
       蓬莱天宮 闇 {grav,warp,slowwall} ← 光が有利   ※3種なのでアンチ2つでは届かない

     ★ <b>2種で完全対応できるのは上の8クエスト</b>（第八重と蓬莱天宮は3種なので除く）。
       いまの属性の内わけは 光2・闇3・木1・水1・火1 なので、
       <b>光の2体は第五重、闇の3体は第四重／第九重</b>を分けあう形になる。
       重なる組は<b>アンチの等級</b>（超アンチ重力バリア／アンチ重力バリアなど）で差をつけてある。
     ★ 断絶界（ward）は<b>アンチ断絶界（award）でしか消せず等級も1つ</b>。
       上の表のとおり8クエスト中5つが ward を要求するので、5体が award 持ちになる。
     ★ 新キャラを足すときは、この表と照らして<b>アンチの組み合わせを決める</b>こと。
       検算は charAntiKeys(id) と counterKeysOf(stage) の一致で機械的に取れる。
     ══════════════════════════════════════════════════════════════ */
  artemia: {
    /* 光・貫通。廃都に立つ白銀の狩人。
       ★ 担当は<b>第五重（闇 {ward,warp}）</b>＝ アンチ断絶界＋超アンチワープで完全対応。 */
    id: "artemia", nm: "アルテミア", img: "Artemia.webp", th: "t_Artemia.webp",
    el: "light", shot: "pierce", type: "聖裁狙撃型", gacha: true, lux: true, nexus: "slayer", star5: true,
    hp: [900, 5960], atk: [520, 3300], spd: [298, 440],
    abil: [{ t: "award" }, { t: "superaw" }, { t: "weakkillerL" }, { t: "firstkillerM" }, { t: "barrierL" }],
    subfs: "lock8",
    ssName: "セラフィカル・ジャッジレイ", ssTurns: 18, ssKind: "selene",
    ssPow: "自強化（攻撃×1.9・スピード×1.25）＋ <b>貫通タイプになって敵を激しく貫く</b> ＋ <b>停止後に最も近い敵へ再走（攻撃×2.6）</b>",
    ssDesc: "白銀の光をまとって<b>自強化（攻撃×1.9・スピード×1.25）</b>し、<b>貫通タイプ</b>になって敵の列をまとめて撃ち抜く。"
      + "止まったあとは<b>いちばん近い敵へひとりでに走り直す（×2.6）</b>ので、1ターンで<b>2回ぶん</b>刺さる"
      + "（セレネと同じフルバースト）。"
      + "<br><b>弱点キラーL</b>と<b>ファーストキラーM</b>が重なるので、<b>そのショットで最初にふれた敵の弱点</b>を"
      + "撃ち抜いたときの伸びがいちばん大きい。"
      + "<br><b>アンチ断絶界・超アンチワープ</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第五重（闇）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第五重の最適解。"
      + "<b>バリアL</b>で前にも出られる。",
    fsName: "アブソリュートレイ10", fsKind: "absoluteray",
    fsPow: "レイ10本 × 攻撃力×" + ABSRAY_MUL + "（貫通・レイ1本につき1ヒット／長さはランダム " + ABSRAY_MIN + "〜" + ABSRAY_MAX + "）",
    fsDesc: "自分を中心に、<b>長さのちがう10本の極大レイ</b>が伸び、<b>1回転ぶん薙ぎ払う</b>。レイは<b>貫通</b>なので通り道の敵をまとめて斬り裂く（<b>近くの敵ほど多くのレイが届く</b>）",
  },
  asuha: {
    /* 木・反射。春の教室。
       ★ 担当は<b>第二重（水 {dw,slowwall}）</b>＝ 超アンチダメージウォール＋アンチ減速壁で完全対応。 */
    id: "asuha", nm: "アスハ", img: "Asuha.webp", th: "t_Asuha.webp",
    el: "wood", shot: "bounce", type: "春陽鼓舞型", gacha: true, lux: true, nexus: "wisdom", star5: true,
    hp: [930, 6120], atk: [486, 3090], spd: [292, 432],
    abil: [{ t: "superadw" }, { t: "aslow" }, { t: "healM" }, { t: "fbtouch" }, { t: "vitalM" }],
    subfs: "boundheal",
    ssName: "サクラメント・ハートビート", ssTurns: 14, ssKind: "setsuna",
    ssPow: "自強化（攻撃×1.8・スピード×1.3）＋ <b>ふれた味方1体につき チームHPを12%回復</b>",
    ssDesc: "花びらをまといながら<b>自強化（攻撃×1.8・スピード×1.3）</b>し、"
      + "<b>なぞった味方1体につきチームHPを12%回復</b>する。全員をなぞれば一度に大きく戻せる立て直し役"
      + "（セツナと同じフルバースト）。"
      + "<br><b>回復M</b>もふれた味方の数で伸びるので、<b>「たくさんなぞる」ことがそのまま回復量になる</b>。"
      + "<b>FBターンタッチ</b>でチーム全体のフルバーストも早く回る。"
      + "<br><b>超アンチダメージウォール・アンチ減速壁</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第二重（水）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第二重の最適解。",
    fsName: "スパイラルリバウンド", fsKind: "spiral",
    fsPow: "螺旋1ヒット 攻撃力×0.30（サークル6基・味方が止まるまで持続）",
    fsDesc: "ふれた瞬間に<b>六方向へサークルを発射</b>。それぞれ<b>最初にふれた敵の位置</b>から、<b>ふれた味方を中心にした螺旋の軌道</b>へ乗り移り、<b>その味方が止まるまで</b>回りながら敵を削り続ける",
  },
  blair: {
    /* 水・貫通。雨の縁側。
       ★ 担当は<b>第六重（火 {mine,slowwall}）</b>＝ 超マインスイーパーM＋超アンチ減速壁で完全対応。 */
    id: "blair", nm: "ブレア", img: "Blair.webp", th: "t_Blair.webp",
    el: "water", shot: "pierce", type: "驟雨強襲型", gacha: true, lux: true, nexus: "force", star5: true,
    hp: [890, 5870], atk: [516, 3280], spd: [300, 444],
    abil: [{ t: "supermsM" }, { t: "superaslow" }, { t: "sokojikaraL" }, { t: "counterkiller" }, { t: "dashM" }],
    subfs: "pspread5",
    ssName: "レイニー・ラッシュブレイズ", ssTurns: 16, ssKind: "leila",
    ssPow: "自強化（攻撃×1.6・スピード×1.6）＋ <b>最初にふれた敵で停止して 高速乱打16連（各 攻撃力×0.6）</b>",
    ssDesc: "驟雨をまとって<b>自強化（攻撃×1.6・スピード×1.6）</b>し、"
      + "<b>そのショットで最初にふれた敵の上で止まって高速の乱打16連</b>を浴びせる。"
      + "<b>スピードが1.6倍</b>と伸びが大きいので、遠くの敵まで一気に詰めて殴りにいける。"
      + "<br><b>底力L</b>と<b>カウンターキラー</b>はどちらも<b>殴られたあと</b>に強くなるアビリティなので、"
      + "<b>HPが減っている終盤ほど乱打の1発が重くなる</b>。"
      + "<br><b>超マインスイーパーM・超アンチ減速壁</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第六重（火）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第六重の最適解。"
      + "地雷は踏むどころか<b>2.5倍の一撃に変えて</b>持ち歩ける。<b>ダッシュM</b>で素の足も速い。",
    fsName: "スパークバレット", fsKind: "sparkbullet",
    fsPow: "30発 × 攻撃力×0.22（拡散する反射弾で近くの敵を攻撃）",
    fsDesc: "<b>30発の強力な貫通する反射弾</b>を放ち、近くの敵をまとめて攻撃する",
  },
  lilith: {
    /* 闇・反射。血染めの婚礼。
       ★ 担当は<b>第四重（光 {grav,ward}）</b>＝ 超アンチ重力バリア＋アンチ断絶界で完全対応。
         同じ第四重を担当するメルティとは<b>重力バリアの等級</b>で差をつけてある（こちらが超）。 */
    id: "lilith", nm: "リリス", img: "Lilith.webp", th: "t_Lilith.webp",
    el: "dark", shot: "bounce", type: "血宴支配型", gacha: true, lux: true, nexus: "ignition", star5: true,
    hp: [912, 6010], atk: [510, 3250], spd: [288, 426],
    abil: [{ t: "sgrav" }, { t: "award" }, { t: "darkmatch" }, { t: "poisonkillerM" }, { t: "drainM" }],
    subfs: "poison",
    ssName: "ブラッディ・ノワールピアス", ssTurns: 14, ssKind: "soleria",
    ssPow: "自強化（攻撃×1.75・スピード×1.3）＋ <b>ふれた敵を毒状態（4ターン）</b>＋ <b>弱点ヒット時に大ダメージ（攻撃力×" + SOLERIA_WEAK_MUL + "）</b>",
    ssDesc: "紅いリボンをほどいて<b>自強化（攻撃×1.75・スピード×1.3）</b>し、"
      + "<b>ふれた敵すべてを4ターンの毒状態</b>にする。さらに<b>弱点に当てるたび 攻撃力×" + SOLERIA_WEAK_MUL + " の追撃</b>が入る"
      + "（ソレリアと同じフルバースト）。"
      + "<br><b>ダークマッチ</b>で<b>ふだんの直殴りでも敵を毒にできる</b>ので、"
      + "<b>毒キラーM</b>がほぼ常時のっている状態になる——毒にする役と、毒を刈る役を1体で兼ねる。"
      + "<b>ドレインM</b>で削りながらチームHPも戻る。"
      + "<br><b>超アンチ重力バリア・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第四重（光）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第四重の最適解。",
    fsName: "チャームプラズマ", fsKind: "charmplasma",
    fsPow: "プラズマ弾7本 1ヒット 攻撃力×0.34（味方が止まるまで画面全体へ拡散）",
    fsDesc: "<b>7本のプラズマ弾が分裂</b>して画面全体へ拡散し、<b>ふれた味方が止まるまで</b>跳ね回りながら敵を撃ち続ける",
  },
  lyra: {
    /* ★★ 2026-08-18b ご指定により<b>光 → 闇</b>へ変更。
       ★ 担当は<b>第九重（光 {slowwall,ward}）</b>＝ 超アンチ減速壁＋アンチ断絶界で完全対応。 */
    id: "lyra", nm: "リラ", img: "Lyra.webp", th: "t_Lyra.webp",
    el: "dark", shot: "bounce", type: "氷華祝祭型", gacha: true, lux: true, nexus: "aegis", star5: true,
    hp: [944, 6210], atk: [492, 3130], spd: [290, 428],
    abil: [{ t: "superaslow" }, { t: "award" }, { t: "barrierEL" }, { t: "regenM" }, { t: "allresM" }],
    subfs: "roundheal",
    ssName: "クリスタリア・ルミナスベル", ssTurns: 18, ssKind: "milfy",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>ふれた味方をステータス×1.8＋無敵</b>（どちらも各自1行動目まで）",
    ssDesc: "宵闇に氷の鈴を鳴らして<b>自強化（攻撃×1.8・スピード×1.2）</b>し、"
      + "<b>なぞった味方を ステータス×1.8 かつ無敵</b>にする（それぞれ<b>その味方が1回動き終えるまで</b>）"
      + "（ミルフィと同じフルバースト）。"
      + "<br>無敵は<b>その味方に向いた攻撃だけ</b>を無効化するので、"
      + "<b>次に殴られる味方をなぞっておく</b>と1ターンぶんまるごと受け流せる。"
      + "<br><b>バリアEL・リジェネM・全属性耐性M</b>の3枚重ねで、味方いちばんの場持ち。"
      + "<b>サブリンクのラウンドヒール</b>は<b>2026-08-18 に円が大きくなった</b>ので、"
      + "長く走らせるほど<b>編成の大半を円に入れて</b>まとめて回復できる。"
      + "<br><b>超アンチ減速壁・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第九重（光）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第九重の最適解。",
    fsName: "ツインインボリュートスフィア", fsKind: "twininvolute",
    fsPow: "スフィア1ヒット 攻撃力×0.34（全画面・2回転しながら広がり画面外へ抜ける）",
    fsDesc: "<b>連なったスフィアが2本のらせんを描き、味方を中心に2回転しながら半径を大きくしていく</b>。らせんは<b>画面のいちばん遠いスミまで届く全画面攻撃</b>で、<b>180°反対の2方向から挟みこむ</b>。近くの敵から順に、最後は<b>画面上のどこにいる敵にも</b>当たり、そのまま<b>画面の外へ抜けていく</b>",
  },
  satsuki: {
    /* 火・貫通。ネオンの夜。
       ★ 担当は<b>第三重（木 {dw,ward}）</b>＝ 超アンチダメージウォール＋アンチ断絶界で完全対応。
       ★ 以前もっていた超マインスイーパーLは<b>地雷アンチとして数えられる</b>ため外した
         （持たせるとアンチ3種になり、ご指定の「ちょうど2種」を満たさない）。 */
    id: "satsuki", nm: "サツキ", img: "Satsuki.webp", th: "t_Satsuki.webp",
    el: "fire", shot: "pierce", type: "紅焔連撃型", gacha: true, lux: true, nexus: "force", star5: true,
    hp: [886, 5840], atk: [524, 3340], spd: [296, 438],
    abil: [{ t: "superadw" }, { t: "award" }, { t: "combokillerM" }, { t: "sokojikaraM" }, { t: "dashL" }],
    subfs: "discharge",
    ssName: "スカーレット・ネオンラッシュ", ssTurns: 16, ssKind: "nanami",
    ssPow: "自強化（攻撃×1.7・スピード×1.25）＋ <b>壁にふれるたび20%の確率でスピードとパワーがアップ</b>（1段ごと 攻撃+22%・スピード+10%・最大8段）",
    ssDesc: "紅いネオンをまとって<b>自強化（攻撃×1.7・スピード×1.25）</b>し、"
      + "<b>壁にぶつかるたびに20%の確率で さらに加速＆強化</b>される（最大8段）"
      + "（ナナミと同じフルバースト）。跳ね返るほど伸びるので、<b>狭い盤面ほど強い</b>。"
      + "<br><b>連撃キラーM</b>は<b>同じ敵に連続でふれる</b>ほど攻撃力が上がるアビリティなので、"
      + "壁とボスのあいだで往復する当て方と噛み合う。<b>底力M</b>が終盤の削り合いを支える。"
      + "<br><b>超アンチダメージウォール・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第三重（木）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第三重の最適解。"
      + "<b>ダッシュL</b>で素の足も最速級。",
    fsName: "超強連気弾", fsKind: "kiblastex",
    fsPow: "気弾7発 × 攻撃力×0.85（残りHPの少ない敵を優先）",
    fsDesc: "<b>連気弾の強化版</b>。<b>7発の気弾</b>を続けざまに撃ち出す。1発の威力は<b>×0.55 → ×0.85</b>。<b>残りHPの少ない敵から優先して</b>狙うので、削り残しをまとめて片付けられる",
  },
  sayo: {
    /* ★★ 2026-08-18b ご指定により<b>闇 → 光</b>へ変更。
       ★ 担当は<b>第五重（闇 {ward,warp}）</b>＝ アンチ断絶界＋超アンチワープで完全対応。
         同じ第五重を担当するアルテミアとはアンチが同じなので、
         キラーの中身（あちらは弱点・ファースト／こちらはフェイタル・ボス）で役割を分けてある。 */
    id: "sayo", nm: "サヨ", img: "Sayo.webp", th: "t_Sayo.webp",
    el: "light", shot: "pierce", type: "黒薔薇絞殺型", gacha: true, lux: true, nexus: "tempo", star5: true,
    hp: [906, 5970], atk: [522, 3320], spd: [294, 434],
    abil: [{ t: "award" }, { t: "superaw" }, { t: "fatalkillerL" }, { t: "bosskillerM" }, { t: "ailmentresist" }],
    subfs: "positionlimit",
    ssName: "ローズ・ガロット", ssTurns: 20, ssKind: "beltia",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>味方全員で総攻撃</b>＋ <b>ふれた敵の攻撃ターンを2増加</b>",
    ssDesc: "金の光をまとった黒薔薇の茨を引き絞って<b>自強化（攻撃×1.8・スピード×1.2）</b>し、"
      + "<b>撃った瞬間に味方全員が動き出して総攻撃</b>。さらに<b>ふれた敵の攻撃ターンを2遅らせる</b>"
      + "（ベルティアと同じフルバースト）。火力と時間かせぎを同時にやる詰めの一手。"
      + "<br><b>フェイタルキラーL</b>は<b>HPが半分以下の敵</b>に、<b>ボスキラーM</b>はボスに効くので、"
      + "<b>削りきる最後のひと押し</b>がいちばん伸びる。<b>状態異常レジスト</b>で妨害にも強い。"
      + "<br><b>アンチ断絶界・超アンチワープ</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第五重（闇）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第五重の最適解。",
    fsName: "リレーションカッター", fsKind: "relaycut",
    fsPow: "カッター1ヒット 攻撃力×0.34（味方の位置を順にめぐる・味方が止まるまで）",
    fsDesc: "<b>味方の位置を順番に渡り歩くカッター</b>を放つ。<b>ふれた味方が止まるまで</b>みんなの間を巡回し続けて敵を切り刻む",
  },
  melty: {
    /* 闇・反射。甘い夜の病室。
       ★ 担当は<b>第四重（光 {grav,ward}）</b>＝ アンチ重力バリア＋アンチ断絶界で完全対応。
         同じ第四重を担当するリリスとは<b>重力バリアの等級</b>で差をつけてある（こちらが無印）。
       ★★ 2026-08-18b ご指定により<b>治癒の祈り → ソウルスティールEL</b>へ変更。
         治癒の祈りは「ボスマップの開始時に確率で全回復」という<b>運まかせの一発</b>だったが、
         こちらは<b>敵を倒すたびに確実に回復</b>する。毒で削って倒す立ち回りとそのままつながる。 */
    id: "melty", nm: "メルティ", img: "Melty.webp", th: "t_Melty.webp",
    el: "dark", shot: "bounce", type: "甘毒看護型", gacha: true, lux: true, nexus: "aegis", star5: true,
    hp: [938, 6180], atk: [496, 3160], spd: [286, 420],
    abil: [{ t: "agrav" }, { t: "award" }, { t: "soulEL" }, { t: "poisonkillerEL" }, { t: "healM" }],
    subfs: "hitouchray",
    ssName: "ラブシック・オーバードーズ", ssTurns: 16, ssKind: "natsuki",
    ssPow: "自強化（攻撃×1.8・スピード×1.2）＋ <b>ふれた敵を毒状態（4ターン）</b> ＋ <b>弱点ヒットでさらに大ダメージ（×1.6）</b>",
    ssDesc: "甘い薬をふりまきながら<b>自強化（攻撃×1.8・スピード×1.2）</b>し、"
      + "<b>ふれた敵を4ターンの毒状態</b>にする。<b>弱点に当てればさらに×1.6</b>"
      + "（ナツキと同じフルバースト）。"
      + "<br><b>毒キラーEL</b>を持っているので、<b>自分でばらまいた毒を自分で刈る</b>のがこの子の形。"
      + "刈った先も<b>ソウルスティールEL</b>で<b>倒すたびにチームHPが戻る</b>ので、"
      + "<b>削る・倒す・立て直す</b>がひと続きになる。<b>回復M</b>はなぞった味方の数だけ効く。"
      + "<br><b>アンチ重力バリア・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第四重（光）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第四重の最適解。",
    fsName: "ブレイドオービット", fsKind: "bladeorbit",
    fsPow: "剣1ヒット 攻撃力×0.30（6本・味方が止まるまで高速回転）",
    fsDesc: "ふれた味方の<b>まわりを6本の剣が高速で回転</b>し、<b>その味方が止まるまで</b>触れた敵を斬り続ける",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-18 ロキシー（No.127・最終番号）水・反射
     ------------------------------------------------------------
     ご指定どおりの構成。<b>演出はゲーム内でいちばん豪華</b>にしてある。
       FB 20ターン … チームHPの15%を捧げて「豪雷積層雲」
         ・自強化 ×2.5
         ・画面全体を暗転させ、巨大な黒雲がステージを覆い、画面いっぱいに雨を降らせ、
           最強の雷がボスへ落ちる
         ・落雷時: 敵全体の<b>最大HPの35%</b>を削る／全ての敵を<b>防御ダウン＋毒状態</b>／<b>2ターン遅延</b>
       アビリティ … 超アンチ重力バリア／超マインスイーパーL／超アンチ減速壁／
                    ザコキラーL／キュムロニンバスEL／ライトニングEL
       クロス     … 同属性が1体以上 かつ 同撃種が1体以上 で 蓬莱族キラーL・重力バリアキラーL
       リンク     … サーキュレーション ／ サブリンク … ラウンドヒール
     ══════════════════════════════════════════════════════════════ */
  roxy: {
    id: "roxy", nm: "ロキシー", img: "Roxy.webp", th: "t_Roxy.webp",
    el: "water", shot: "bounce", type: "豪雷積層型", gacha: true, lux: true, nexus: "force", star5: true,
    connect: "roxy",
    hp: [952, 6300], atk: [536, 3400], spd: [300, 446],
    abil: [{ t: "sgrav" }, { t: "supermsL" }, { t: "superaslow" },
           { t: "mobkillerL" }, { t: "cumulonimbusEL" }, { t: "lightningEL" }],
    subfs: "roundheal",
    ssName: "豪雷積層雲", ssTurns: ROXY_TURNS, ssKind: "roxy",
    ssPow: "<b>残りチームHPの" + Math.round(ROXY_HP_COST * 100) + "%</b>を消費して自強化（攻撃×" + ROXY_ATK + "）＋ "
      + "<b>敵全体の最大HPの" + Math.round(ROXY_MAXHP_CUT * 100) + "%</b>を削る落雷 ＋ 敵全体を<b>防御ダウン・毒状態</b>＋<b>"
      + ROXY_DELAY + "ターン遅延</b>",
    ssDesc: "<b>残りチームHPの" + Math.round(ROXY_HP_COST * 100) + "%</b>（HPが1未満になることはない）を雷雲へ捧げ、<b>自強化（攻撃×" + ROXY_ATK + "）</b>して撃ち出す。"
      + "<br>撃った瞬間<b>画面全体が暗転</b>し、<b>巨大な黒雲がステージまるごとを覆って</b>豪雨が降りそそぐ。"
      + "そして<b>最強の雷がボスへ落ちる</b>——"
      + "<br>落雷の瞬間、<b>画面上のすべての敵</b>に次のすべてが同時に入る。"
      + "<br>① <b>満タンHPの" + Math.round(ROXY_MAXHP_CUT * 100) + "%</b>を削る（残りHPではなく<b>最大HPに対する割合</b>なので、"
      + "HPがどれだけ高い相手でも同じ割合だけ削れる）"
      + "<br>② <b>防御ダウン</b>（" + ROXY_DEBUFF_TURNS + "ターン）と<b>毒状態</b>（" + ROXY_DEBUFF_TURNS + "ターン）"
      + "<br>③ <b>攻撃ターンを" + ROXY_DELAY + "遅延</b>（<b>即死のカウントも" + ROXY_DELAY + "</b>）"
      + "<br><b>キュムロニンバスEL</b>と<b>ライトニングEL</b>を両方持つ、ただ一人の雷使い。"
      + "ふだんの直殴りでも<b>" + Math.round(LIGHTNING_EL_P * 100) + "%で攻撃力×" + LIGHTNING_EL_MUL + "の落雷</b>が飛び、"
      + "<b>そのショットで最初にふれた敵</b>には<b>次のターンの終了時に 攻撃力×" + CUMULO_EL_MUL + "の落雷</b>が落ちる"
      + "（走った距離に応じて、次のショットのステータスが最大×" + CUMULO_EL_MAX + "）。"
      + "<br><b>超アンチ重力バリア・超マインスイーパーL・超アンチ減速壁</b>の3種持ちで足を止められない。"
      + "<b>ザコキラーL</b>で護衛の処理も速い。",
    fsName: "サーキュレーション", fsKind: "circulation",
    fsPow: "刃1ヒット 攻撃力×" + CIRC_PER + "（輪の上の" + CIRC_N + "点）＋ <b>まとったプラズマ</b>1ヒット 攻撃力×" + CIRC_PLZ_PER
      + "（輪の線ぜんぶ・刃より短い間かくで再ヒット）／回転しながらだんだん拡大・多段ヒット",
    fsDesc: "<b>円形の刃</b>が発生し、<b>回転しながらだんだん大きく広がっていく</b>。"
      + "輪の上ならどこにふれてもヒットし、<b>同じ敵にも間をおいて何度でも入る</b>多段型。"
      + "<br>さらに輪は<b>プラズマをまとって</b>いて、刃の点と点のあいだ——<b>輪の線ならどこでも</b>——"
      + "<b>刃より短い間かくで</b>電撃が入る。刃のヒットにプラズマのヒットが重なるので、"
      + "<b>1回の発動で入るヒット数が大きく増える</b>。"
      + "はじめは近くの敵を刻み、広がりきるころには<b>まわり中の敵をまとめて巻きこむ</b>",
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-20 GRAND DEBUT GACHA 新SSR 5体（No.128〜132）
     ------------------------------------------------------------
     ご指定の共通ルール:
       ・<b>オムニアンチと治癒の祈りは持たせない</b>
       ・それぞれが<b>自分が有利属性になる蓬莱の九重のクエストの最適解</b>になる
         （＝そのクエストの必要アンチをすべて消せる）
       ・ミレーユ／スカーレット／コユキ … <b>アンチ3種＋クロススキル</b>（上澄みの性能）
       ・アメリア／ミオ                 … <b>アンチ2種ちょうど・クロスなし</b>（標準の性能）

     担当の割りふり（HOURAI_ANTI と照らして決めた）:
       ミレーユ    火 {dw,mine,grav}      → <b>第八重</b>（木）… 3種ぴったり
       スカーレット 水 {dw,grav,slowwall} → <b>第一重</b>（火）… {dw,grav} を含む
       コユキ      闇 {grav,ward,slowwall}→ <b>第四重・第九重</b>（光）… 2クエストとも完全対応
       アメリア    木 {mine,ward}         → <b>第七重</b>（水）… 2種ぴったり
       ミオ        光 {ward,warp}         → <b>第五重</b>（闇）… 2種ぴったり
     ★ 検算は charAntiKeys(id) と counterKeysOf(stage) の一致で機械的に取れる。
     ══════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-22 Starlight Academy Fest 限定SSR 5体（No.133〜137）
     ------------------------------------------------------------
     オトハ（火）／サヤカ（水）／サユリ（闇）／アカリ（木）／ヒナタ（光）。
     <b>フェスガチャ</b>なので GRAND DEBUT GACHA とは関係がない（DEBUT_CHARS には入れない）。

     ★ 設計のきまり（ご指定）
       ・オムニアンチ・治癒の祈りは<b>持たせない</b>
       ・アンチは<b>ちょうど2種</b>。その2種が「自分が有利属性になる蓬莱のクエスト」の
         必要アンチと<b>ぴったり一致</b>する＝そのクエストの最適解になる
       ・全員<b>クロススキル</b>を持つ（発動条件は1体ずつ別）
       ・リンクスキルは<b>超強（上位）</b>から選ぶ
       ・サブリンクは5体そろって<b>スターライト・ヴェール</b>（フェスの目印）
       ・全員<b>蓬莱族キラーL</b>持ち＝「蓬莱の九重 攻略のフェス」という顔

     ★ 担当わけ（属性有利 × 必要アンチ2種の一致）
       オトハ  火 {dw,ward}        → <b>第三重</b>（木）
       サヤカ  水 {mine,slowwall}  → <b>第六重</b>（火）
       サユリ  闇 {slowwall,ward}  → <b>第九重</b>（光）
       アカリ  木 {dw,slowwall}    → <b>第二重</b>（水）
       ヒナタ  光 {ward,warp}      → <b>第五重</b>（闇）
     ★ 検算は charAntiKeys(id) と counterKeysOf(HOURAI_STAGES[i]) の一致で機械的に取れる。
     ══════════════════════════════════════════════════════════════ */
  otoha: {
    /* 火・貫通。星の学園の音楽科。焔をまとった旋律で薙ぎ払う。
       ★ 担当は<b>第三重（木 {dw,ward}）</b>＝ 超ADW＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "otoha", nm: "オトハ", img: "Otoha.webp", th: "t_Otoha.webp",
    el: "fire", shot: "pierce", type: "焔奏貫穿型", fes: true, fesKey: "starlight", lux: true, nexus: "advantage",
    connect: "otoha",
    hp: [962, 6360], atk: [548, 3470], spd: [304, 452],
    abil: [{ t: "superadw" }, { t: "award" },
           { t: "sokojikaraEL" }, { t: "houraikillerL" }, { t: "laserstopM" }, { t: "barrierL" }],
    subfs: "starveil",
    ssName: "フランメ・カンタービレ", ssTurns: STARLIGHT_TURNS, ssKind: "otoha",
    ssPow: "自強化（攻撃×" + OTOHA_ATK + "・スピード×" + OTOHA_SPD + "）＋ <b>敵全体の弱点コアを開放（"
      + OTOHA_WEAK_TURNS + "ターン・味方全員の弱点ヒットが伸びる）</b>",
    ssDesc: "焔の旋律が盤面を渡り、<b>自強化（攻撃×" + OTOHA_ATK + "・スピード×" + OTOHA_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の弱点コアが" + OTOHA_WEAK_TURNS + "ターンのあいだ開き</b>、"
      + "<b>味方全員</b>の弱点ヒットの倍率が上がる（ベルニカの弱点UPと同じしくみ）。"
      + "開いた弱点は<b>味方全員</b>のものなので、殴る順番をそろえるほど効く。"
      + "<br><b>超アンチダメージウォール・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第三重（木）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第三重の最適解。"
      + "<b>底力EL</b>と<b>蓬莱族キラーL</b>が重なり、<b>バリアL</b>で前にも出られる。"
      + "<b>超レーザーストップM</b>を持つので、レーザーを受け止めてチームHPを"
      + Math.round(LASERSTOPM_HEAL * 100) + "%戻しながら前に立てる。",
    fsName: "超強インフィニティレーザー", fsKind: "superinfinitylaser",
    fsPow: "極太レーザー 攻撃力×" + SINFL_PER + "（貫通）＋ 着弾から" + SINFL_SPLIT_N + "方向へ分裂 各×" + SINFL_SPLIT_PER,
    fsDesc: "<b>インフィニティレーザーの強化版</b>。もっとも近い敵へ<b>さらに極太のレーザー</b>を撃ちこみ、"
      + "着弾点から<b>" + SINFL_SPLIT_N + "方向</b>へレーザーが分裂して広がる。"
      + "<br>本体の威力は<b>×1.60 → ×" + SINFL_PER + "</b>、分裂1本は<b>×0.55 → ×" + SINFL_SPLIT_PER + "</b>、"
      + "分裂の数も<b>8方向 → " + SINFL_SPLIT_N + "方向</b>に増えている。"
      + "どれも貫通するので、射線と着弾点に敵が重なっているほど伸びる。",
  },
  sayaka: {
    /* 水・反射。星の学園の水泳部。流れを読んで味方ごと運ぶ。
       ★ 担当は<b>第六重（火 {mine,slowwall}）</b>＝ 超マインスイーパーEL＋超アンチ減速壁の<b>2種ちょうど</b>。 */
    id: "sayaka", nm: "サヤカ", img: "Sayaka.webp", th: "t_Sayaka.webp",
    el: "water", shot: "bounce", type: "蒼流奔騰型", fes: true, fesKey: "starlight", lux: true, nexus: "aegis",
    connect: "sayaka",
    hp: [970, 6420], atk: [536, 3400], spd: [300, 444],
    abil: [{ t: "supermsEL" }, { t: "superaslow" },
           { t: "upkillerM" }, { t: "houraikillerL" }, { t: "atkchargeM" }, { t: "soulEL" }],
    subfs: "starveil",
    ssName: "アクア・ノクターン・ドライブ", ssTurns: STARLIGHT_TURNS, ssKind: "sayaka",
    ssPow: "自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）＋ <b>味方全員が貫通になって総攻撃</b>"
      + "（貫通は それぞれ" + SAYAKA_PIERCE_ACTS + "回行動し終えるまで／突撃中の直殴り×" + RALLY_MUL + "）",
    ssDesc: "蒼い流れが盤面を洗い、<b>自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）</b>して走り出す。"
      + "<br>同時に<b>味方全員が貫通タイプに変わり、そのまま全員で総攻撃</b>をかける"
      + "（貫通はそれぞれが" + SAYAKA_PIERCE_ACTS + "回行動し終えるまで／突撃中の直殴りは<b>×" + RALLY_MUL + "</b>）。"
      + "反射の味方まで<b>貫通のまま敵の列へ突っこむ</b>ので、"
      + "<b>チーム全体の手数がそのターンだけ別ものになる</b>。"
      + "走った味方どうしがふれれば<b>リンクスキルも連鎖</b>する。"
      + "<br><b>超マインスイーパーEL・超アンチ減速壁</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第六重（火）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第六重の最適解。"
      + "<b>攻撃力チャージM</b>で、1ショットのあいだに<b>味方" + ATKCHARGE_N + "体にふれる</b>と"
      + "<b>" + ATKCHARGE_N + "体目にふれた味方</b>の攻撃力が1巡のあいだ<b>×" + ATKCHARGE_M_MUL + "</b>になる"
      + "（なぞる順番がそのまま火力になる）。"
      + "<b>アップポジションキラーM</b>と<b>ソウルEL</b>で、削りながらHPも戻す。",
    fsName: "サーキュレーション", fsKind: "circulation",
    fsPow: "刃1ヒット 攻撃力×" + CIRC_PER + "（輪の上の" + CIRC_N + "点）＋ <b>まとったプラズマ</b>1ヒット 攻撃力×" + CIRC_PLZ_PER
      + "（輪の線ぜんぶ・刃より短い間かくで再ヒット）／回転しながらだんだん拡大・多段ヒット",
    fsDesc: "<b>円形の刃</b>が発生し、<b>回転しながらだんだん大きく広がっていく</b>。"
      + "輪の上ならどこにふれてもヒットし、<b>同じ敵にも間をおいて何度でも入る</b>多段型。"
      + "<br>さらに輪は<b>プラズマをまとって</b>いて、刃の点と点のあいだ——<b>輪の線ならどこでも</b>——"
      + "<b>刃より短い間かくで</b>電撃が入る。"
      + "<br>フルバーストで味方全員が貫通になったあとは、敵の列を貫きながらこの輪を置いていけるので、"
      + "<b>盤面を洗いつづける</b>形にはまる",
  },
  sayuri: {
    /* 闇・貫通。星の学園の書道部。墨の一閃で敵の牙を折る。
       ★ 担当は<b>第九重（光 {slowwall,ward}）</b>＝ 超アンチ減速壁＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "sayuri", nm: "サユリ", img: "Sayuri.webp", th: "t_Sayuri.webp",
    el: "dark", shot: "pierce", type: "玄墨一閃型", fes: true, fesKey: "starlight", lux: true, nexus: "demolish",
    connect: "sayuri",
    hp: [950, 6300], atk: [552, 3490], spd: [306, 458],
    abil: [{ t: "superaslow" }, { t: "award" },
           { t: "killerL", el: "light" }, { t: "houraikillerL" }, { t: "combokillerEL" }, { t: "elemresM", el: "light" }],
    subfs: "starveil",
    ssName: "ノクス・カリグラフィ", ssTurns: STARLIGHT_TURNS, ssKind: "sayuri",
    ssPow: "自強化（攻撃×" + SAYURI_ATK + "・スピード×" + SAYURI_SPD + "）＋ <b>敵全体の攻撃力を"
      + Math.round((1 - SAYURI_ATKDOWN_MUL) * 100) + "%ダウン（" + SAYURI_ATKDOWN_TURNS + "ターン）</b>",
    ssDesc: "墨の一閃が盤面を横切り、<b>自強化（攻撃×" + SAYURI_ATK + "・スピード×" + SAYURI_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の攻撃力が" + SAYURI_ATKDOWN_TURNS + "ターンのあいだ"
      + Math.round((1 - SAYURI_ATKDOWN_MUL) * 100) + "%落ちる</b>。"
      + "削りきれずに1ターン足りない場面を、<b>受けるダメージそのものを減らして</b>耐えきるフルバースト。"
      + "回復とちがって<b>先に撃っておくほど効く</b>ので、ボスの大技が来る前に合わせたい。"
      + "<br><b>超アンチ減速壁・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第九重（光）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第九重の最適解。"
      + "<b>光属性キラーL・連撃キラーEL</b>で削りきりながら、"
      + "<b>光属性耐性M</b>で光の敵からのダメージを" + Math.round(ELEMRES_M_CUT * 100) + "%カットする。"
      + "第九重の光ボスに対して<b>殴り勝ちながら耐える</b>形になる。",
    fsName: "超強クイックチャージショット", fsKind: "superchargeshot",
    fsPow: "チャージ弾 攻撃力×" + SCHG_MUL + " ×" + SCHG_N + "体（同時ロックオン）＋ 着弾ごとに衝撃波 攻撃力×" + SCHG_BOOM_MUL,
    fsDesc: "クイックチャージショットの上位。<b>" + SCHG_N + "体を同時にロックオン</b>して"
      + "特大のチャージ弾を撃ちこみ、<b>着弾ごとにさらに衝撃波</b>が広がる。"
      + "狙いが外れないので、<b>ボスに確実に通したい</b>ときの一撃",
  },
  akari: {
    /* 木・反射。星の学園の園芸部。陽だまりで味方の支度をととのえる。
       ★ 担当は<b>第二重（水 {dw,slowwall}）</b>＝ 超ADW＋超アンチ減速壁の<b>2種ちょうど</b>。 */
    id: "akari", nm: "アカリ", img: "Akari.webp", th: "t_Akari.webp",
    el: "wood", shot: "bounce", type: "翠陽律動型", fes: true, fesKey: "starlight", lux: true, nexus: "charge",
    connect: "akari",
    hp: [978, 6470], atk: [528, 3350], spd: [298, 440],
    abil: [{ t: "superadw" }, { t: "superaslow" },
           { t: "outkillerL" }, { t: "houraikillerL" }, { t: "fsboostEL" }, { t: "healM" }],
    subfs: "starveil",
    ssName: "ヴィリディス・ソレイユ", ssTurns: STARLIGHT_TURNS, ssKind: "akari",
    ssPow: "自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）＋ <b>味方全員のフルバーストターンを"
      + AKARI_FB_CUT + "進める</b>",
    ssDesc: "陽だまりが盤面いっぱいに広がり、<b>自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）</b>して走り出す。"
      + "<br>同時に<b>味方全員のフルバーストが" + AKARI_FB_CUT + "ターンぶん一気に進む</b>。"
      + "自分のフルバーストで<b>ほかの3人のフルバーストを呼び寄せる</b>ので、"
      + "強いフルバーストを持つ味方と組むほど、そのまま火力になる。"
      + "<br><b>超アンチダメージウォール・超アンチ減速壁</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第二重（水）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第二重の最適解。"
      + "<b>リンクブーストEL</b>で味方に撃たせるリンクが伸び、<b>回復M</b>でチームのHPも戻す。",
    fsName: "超強オービタルエッジ", fsKind: "superspinring",
    fsPow: "リング1ヒット 攻撃力×" + SSPIN_MUL + "（超巨大リング" + SSPIN_N + "基・壁で反射・当たり直しも速い）",
    fsDesc: "オービタルエッジの上位。<b>超巨大なリングが" + SSPIN_N + "基</b>、壁で跳ね返りながら盤面を回り続ける。"
      + "<b>当たり直しの間隔が短い</b>ので、狭い場所に敵が固まっているほど削り取る",
  },
  hinata: {
    /* 光・貫通。星の学園の陸上部。朝いちばんの光をまっすぐ通す。
       ★ 担当は<b>第五重（闇 {ward,warp}）</b>＝ アンチ断絶界＋超アンチワープの<b>2種ちょうど</b>。 */
    id: "hinata", nm: "ヒナタ", img: "Hinata.webp", th: "t_Hinata.webp",
    el: "light", shot: "pierce", type: "曙光疾走型", fes: true, fesKey: "starlight", lux: true, nexus: "pierce",
    connect: "hinata",
    hp: [956, 6330], atk: [545, 3455], spd: [308, 462],
    abil: [{ t: "award" }, { t: "superaw" },
           { t: "rightkillerL" }, { t: "houraikillerL" }, { t: "firstkillerM" }, { t: "linkcharge" }],
    subfs: "starveil",
    ssName: "ステラ・オーロラ・レイ", ssTurns: STARLIGHT_TURNS, ssKind: "hinata",
    ssPow: "自強化（攻撃×" + HINATA_ATK + "・スピード×" + HINATA_SPD + "）＋ <b>画面上のすべての敵へ光の柱（1本 攻撃力×"
      + HINATA_PILLAR_MUL + "・光属性）</b>",
    ssDesc: "曙のオーロラが立ちのぼり、<b>自強化（攻撃×" + HINATA_ATK + "・スピード×" + HINATA_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の真上から光の柱</b>が落ちる"
      + "（1本あたり攻撃力×" + HINATA_PILLAR_MUL + "・光属性）。"
      + "狙いを付けずに<b>取りこぼしなく全体へ</b>入るので、散らばった敵にも、隠れている敵にも同じだけ通る。"
      + "<br><b>アンチ断絶界・超アンチワープ</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第五重（闇）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第五重の最適解。"
      + "超アンチワープは<b>画面上のワープ1つにつき攻撃・スピードが上がる</b>ので、"
      + "ワープの多い第五重ではそのまま火力になる。"
      + "<b>ファーストキラーM</b>と<b>リンクチャージ</b>で、1手目を当てながらフルバーストも回る。",
    fsName: "超強ルミナスレイ", fsKind: "superluminous",
    fsPow: "砲台1基のレーザー 攻撃力×" + SLUMI_MUL + "（貫通・最大" + SLUMI_N + "基・レーザーがさらに極太）",
    fsDesc: "ルミナスレイの上位。設置できる砲台が<b>4基 → " + SLUMI_N + "基</b>に増え、"
      + "レーザーは<b>威力も当たり判定の太さも大幅に強化</b>（×0.95 → <b>×" + SLUMI_MUL + "</b>）。"
      + "ふれた味方が止まった瞬間に、<b>盤面をまるごと貫く光の網</b>が走る",
  },
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 新SSR 5体（No.138〜142）
     ------------------------------------------------------------
     グレン（火）／ユウナ（水）／モモ（闇）／チハヤ（木）／ユイ（光）。

     ★ 設計のきまり（ご指定）
       ・オムニアンチ・治癒の祈りは<b>持たせない</b>
       ・アンチは<b>3種まで</b>。その3種が「自分が有利属性になる蓬莱のクエスト」の
         必要アンチを覆う＝そのクエストの最適解になる
       ・アビリティは<b>クロススキルもふくめて8つ</b>
         （素6つ＝アンチ3＋キラー2＋非キラー1／クロス2つ＝キラー1＋非キラー1）
       ・キラーは<b>クロスもふくめて3つまで</b>。等級はいまの最上位（属性キラーは EL）
       ・キラー以外の強いアビリティを<b>2つ以上</b>
       ・★★ 2026-08-25 追記: <b>パワーオーラ系・底力系はキラーとして使ってよい</b>（ご指定）。
         キラーの上限3つの<b>中に数える</b>ので、使うときは属性キラー・種族キラーなどの
         どれかと入れ替える。増やすのではない。
       ・全員<b>クロススキル</b>を持つ（発動条件は1体ずつ別）
       ・リンクスキルは5体とも<b>新設</b>（超強級）
       ・フルバーストは<b>実績のあるものを割りあて</b>（名前と数字は新しく、
         しくみは既存＝効果の取りこぼしが起きない）

     ★ 担当わけ（属性有利 × 必要アンチの一致）
       グレン  火 {dw,mine,grav}       → <b>第八重</b>（木）… 3種ぴったり
       ユウナ  水 {mine,slowwall,dw}   → <b>第六重</b>（火）… 2種ぴったり＋第一重の壁も踏める
       モモ    闇 {grav,ward,slowwall} → <b>第四重・第九重</b>（光）… 2クエストとも完全対応
       チハヤ  木 {mine,ward,slowwall} → <b>第七重</b>（水）… 2種ぴったり＋第二重の減速壁
       ユイ    光 {grav,warp,slowwall} → <b>蓬莱天宮</b>（闇）… 3種ぴったり
     ★★ ユイは<b>蓬莱天宮を属性有利のまま完全対応できる最初のキャラ</b>。
       蓬莱天宮は必要アンチが3種あり、これまでどのキャラも全部は消せなかった。
     ★ 検算は charAntiKeys(id) と counterKeysOf(HOURAI_STAGES[i]) の一致で機械的に取れる。
     ══════════════════════════════════════════════════════════════ */
  guren: {
    /* 火・貫通。紅蓮の炎をまとう剣士。
       ★ 担当は<b>第八重（木 {dw,mine,grav}）</b>＝ 超ADW＋超マインスイーパーEL＋超アンチ重力バリア。 */
    id: "guren", nm: "グレン", img: "Guren.webp", th: "t_Guren.webp",
    el: "fire", shot: "pierce", type: "業火穿貫型", gacha: true, debut: true, lux: true, nexus: "force", star5: true,
    connect: "guren",
    hp: [968, 6390], atk: [556, 3520], spd: [307, 458],
    abil: [{ t: "superadw" }, { t: "supermsEL" }, { t: "sgrav" },
           { t: "killerEL", el: "wood" }, { t: "houraikillerL" }, { t: "barrierEL" }],
    subfs: "pspread3",
    ssName: "グレンフレア・カタストロフ", ssTurns: MIRELLE_TURNS, ssKind: "mirelle",
    ssPow: "自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）＋ <b>敵全体を防御ダウン（"
      + MIRELLE_DEF_TURNS + "ターン）</b> ＋ <b>紅蓮メテオ" + MIRELLE_METEOR_N + "発（攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）</b>",
    ssDesc: "全身の炎がふくれ上がり、<b>自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の防御力が" + MIRELLE_DEF_TURNS + "ターンのあいだダウン</b>し、"
      + "そこへ<b>紅蓮のメテオが" + MIRELLE_METEOR_N + "発</b>（1発あたり攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）降りそそぐ"
      + "（ミレーユの<b>フランベルジュ・インフェルノ</b>と同じしくみ）。"
      + "<br><b>超アンチダメージウォール・超マインスイーパーEL・超アンチ重力バリア</b>の3種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第八重（木）の必要アンチとぴったり一致</b>する。"
      + "<b>木属性キラーEL</b>で属性有利と重なり、<b>蓬莱族キラーL</b>が蓬莱のボスすべてに乗る。"
      + "<br>クロススキル<b>業火のクロス</b>（同じ撃種の味方が2体以上）で<b>重力バリアキラーEL</b>が付くので、"
      + "重力バリアを張ってくる第八重の敵には<b>属性キラーと重ねて</b>刺さる。"
      + "<b>バリアEL</b>と<b>ダッシュL</b>で、前に出ても削られにくく、長く走れる。",
    fsName: "クロスフレイムノヴァ", fsKind: "crossflamenova",
    fsPow: "十字の極太レーザー 攻撃力×" + GUREN_CROSS_PER + "（縦・横で別に当たる）＋ <b>中心の大爆発</b> 攻撃力×" + GUREN_NOVA_PER,
    fsDesc: "持ち主を中心に<b>縦と横へ極太の炎の帯</b>が走る。縦と横は<b>別々に当たる</b>ので、"
      + "交点にいる敵には2回入る。<br>そのすこしあとに<b>中心で大爆発</b>が起き、"
      + "半径 " + GUREN_NOVA_R + " のなかにいる敵をまとめて焼く（攻撃力×" + GUREN_NOVA_PER + "）。"
      + "<b>近いほど強い</b>ので、敵の集まっているところで撃たせるのがいちばん伸びる",
  },
  yuuna: {
    /* 水・反射。碧い波をあやつる巫女。
       ★ 担当は<b>第六重（火 {mine,slowwall}）</b>＝ 超マインスイーパーEL＋超アンチ減速壁。
         3つ目の<b>超アンチダメージウォール</b>で、第一重の壁も踏み抜ける。 */
    id: "yuuna", nm: "ユウナ", img: "Yuuna.webp", th: "t_Yuuna.webp",
    el: "water", shot: "bounce", type: "碧漣奔流型", gacha: true, debut: true, lux: true, nexus: "mercy", star5: true,
    connect: "yuuna",
    hp: [976, 6430], atk: [548, 3492], spd: [305, 454],
    abil: [{ t: "supermsEL" }, { t: "superaslow" }, { t: "superadw" },
           { t: "mobkillerL" }, { t: "houraikillerL" }, { t: "regenL" }],
    subfs: "boundheal",
    ssName: "アクア・タイダル・レクイエム", ssTurns: STARLIGHT_TURNS, ssKind: "sayaka",
    ssPow: "自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）＋ <b>味方全員が貫通になって総攻撃</b>"
      + "（その味方が" + SAYAKA_PIERCE_ACTS + "回行動し終えるまで貫通のまま）",
    ssDesc: "碧い波が盤面いっぱいに立ちあがり、<b>自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）</b>して走り出す。"
      + "<br>撃った瞬間、<b>味方全員がいちばん近い敵へ突っこみ（総攻撃）</b>、"
      + "そのあいだ<b>味方全員が貫通タイプ</b>になる（その味方が" + SAYAKA_PIERCE_ACTS + "回行動し終えるまで）"
      + "（サヤカの<b>アクア・ノクターン・ドライブ</b>と同じしくみ）。"
      + "反射の味方も敵の列をまとめて抜けられるので、<b>内部弱点のある面</b>で効きめが大きい。"
      + "<br><b>超マインスイーパーEL・超アンチ減速壁</b>は<b>第六重（火）の必要アンチとぴったり一致</b>し、"
      + "<b>ザコキラーL</b>と属性有利が重なる第六重の最適解。"
      + "3つ目の<b>超アンチダメージウォール</b>があるので、壁の張られた第一重でも足を止められない。"
      + "<br><b>リジェネL</b>と<b>バウンドヒール</b>でチームのHPを戻し続け、"
      + "クロススキル<b>碧漣のクロス</b>（自分より攻撃力が低い味方が2体以上）で"
      + "<b>パワーオーラEL</b>と<b>ドレインM</b>が付く——長い削り合いほど強い。"
      + "<br>リジェネL・ドレインM・バウンドヒールで<b>HPを高いまま保てる</b>ので、"
      + "<b>チームHP50%以上のあいだ攻撃・スピードが" + AURAEL_MUL + "倍</b>のパワーオーラELが"
      + "ほぼ常時のっている状態にできる。",
    fsName: "タイダルサージ", fsKind: "tidalsurge",
    fsPow: "大波 " + YUUNA_WAVES + "波 × 攻撃力×" + YUUNA_PER + "（貫通・波ごとに当たり直す）",
    fsDesc: "持ち主を起点に<b>大波が" + YUUNA_WAVES + "回、時間差で押し寄せる</b>。"
      + "波は敵を貫通して画面のはしまで広がり、<b>1波ごとに当たり直す</b>ので、"
      + "そこに居るだけで" + YUUNA_WAVES + "回ぶん入る。"
      + "<br>1波の威力は衝撃波（×0.95）を上回る<b>×" + YUUNA_PER + "</b>。"
      + "広がりかたが同じなので<b>どこに当たるか読みやすく</b>、敵が散っている面でも取りこぼしが少ない",
  },
  momo: {
    /* 闇・反射。宵闇に咲く桃の花。
       ★ 担当は<b>第四重（光 {grav,ward}）と第九重（光 {slowwall,ward}）</b>。
         アンチ3種（超アンチ重力バリア／アンチ断絶界／超アンチ減速壁）で<b>2クエストとも完全対応</b>。 */
    id: "momo", nm: "モモ", img: "Momo.webp", th: "t_Momo.webp",
    el: "dark", shot: "bounce", type: "宵桃反射型", gacha: true, debut: true, lux: true, nexus: "slayer", star5: true,
    connect: "momo",
    hp: [966, 6382], atk: [552, 3505], spd: [308, 460],
    abil: [{ t: "sgrav" }, { t: "award" }, { t: "superaslow" },
           { t: "poisonkillerEL" }, { t: "houraikillerL" }, { t: "fbaccel" }],
    subfs: "poison",
    ssName: "ノワール・ペタル・ラプソディ", ssTurns: KOYUKI_TURNS, ssKind: "koyuki",
    ssPow: "自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）＋ <b>味方全員で総攻撃</b> ＋ <b>敵全体を毒状態（"
      + KOYUKI_POISON_TURNS + "ターン）</b>",
    ssDesc: "宵闇の桃の花びらが舞い、<b>自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）</b>。"
      + "<br>撃った瞬間に<b>画面上のすべての敵が" + KOYUKI_POISON_TURNS + "ターンの毒状態</b>になり、"
      + "そのまま<b>味方全員が号令に合わせていちばん近い敵へ突っこむ（総攻撃）</b>"
      + "（コユキの<b>ノワール・クロウ・ラプソディ</b>と同じしくみ）。"
      + "<br><b>超アンチ重力バリア・アンチ断絶界・超アンチ減速壁</b>の3種持ち。"
      + "この3つは<b>第四重（光 {重力バリア・断絶界}）と第九重（光 {減速壁・断絶界}）の必要アンチを両方とも覆う</b>ので、"
      + "<b>2つのクエストのどちらでも属性有利のまま全ギミックを無視して走れる</b>。"
      + "<br>コユキが<b>貫通</b>なのに対してモモは<b>反射</b>。同じ2クエストでも"
      + "<b>壁を使って弱点の裏へ回りこむ</b>立ちまわりができる。"
      + "<b>毒キラーEL</b>（自分の毒サブリンクとかみ合う）にクロススキル<b>宵桃のクロス</b>（同じ属性の味方が1体以上）の"
      + "<b>重力バリアキラーEL</b>が重なり、重力バリアを張る第四重の光ボスに刺さる。"
      + "<b>FBターンアクセル</b>と<b>全属性耐性M</b>で、続けて撃ちながら耐える",
    fsName: "ノワールスパイラル", fsKind: "noirspiral",
    fsPow: "闇の貫通弾 " + MOMO_N + "発 × 攻撃力×" + MOMO_PER + "（貫通・1体につき1ヒット）",
    fsDesc: "闇の弾を<b>角度を少しずつずらしながら" + MOMO_N + "発</b>撃ち出す。"
      + "弾は<b>螺旋を描いて外へ広がっていく</b>ので、近くの敵も遠くの敵も順になぞっていく。"
      + "<br>弾は<b>貫通</b>して奥まで届き、<b>1体につき1回</b>当たる。"
      + "追尾しないぶん<b>撃った瞬間に広がりかたが決まる</b>ので、"
      + "敵の並びに合わせて撃たせる位置を選ぶと本数がそろって入る",
  },
  chihaya: {
    /* 木・貫通。翠の風を呼ぶ弓の使い手。
       ★ 担当は<b>第七重（水 {mine,ward}）</b>＝ 超マインスイーパーEL＋アンチ断絶界。
         3つ目の<b>超アンチ減速壁</b>で、第二重の減速壁も踏み抜ける。 */
    id: "chihaya", nm: "チハヤ", img: "Chihaya.webp", th: "t_Chihaya.webp",
    el: "wood", shot: "pierce", type: "翠風穿風型", gacha: true, debut: true, lux: true, nexus: "bond", star5: true,
    connect: "chihaya",
    hp: [970, 6400], atk: [550, 3498], spd: [306, 456],
    abil: [{ t: "supermsEL" }, { t: "award" }, { t: "superaslow" },
           { t: "auraEL" }, { t: "houraikillerL" }, { t: "laserstopM" }],
    subfs: "phoming20",
    ssName: "ヴェルデ・ゲイル・オード", ssTurns: STARLIGHT_TURNS, ssKind: "akari",
    ssPow: "自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）＋ <b>味方全員のフルバーストターンを"
      + AKARI_FB_CUT + "進める</b>",
    ssDesc: "翠の風が味方の背中を押し、<b>自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）</b>して走り出す。"
      + "<br>撃った瞬間、<b>味方全員のフルバーストターンが" + AKARI_FB_CUT + "進む</b>"
      + "（アカリの<b>ヴィリディス・ソレイユ</b>と同じしくみ）。"
      + "強力なフルバーストを持つ味方をそろえるほど、チーム全体の回転が上がる。"
      + "<br><b>超マインスイーパーEL・アンチ断絶界</b>は<b>第七重（水）の必要アンチとぴったり一致</b>し、"
      + "<b>パワーオーラEL</b>と属性有利が重なる第七重の最適解。"
      + "3つ目の<b>超アンチ減速壁</b>があるので、減速壁の張られた第二重でも足を止められない。"
      + "<br><b>超レーザーストップM</b>でレーザーを受け止めてチームHPを"
      + Math.round(LASERSTOPM_HEAL * 100) + "%戻しながら前に立てる。"
      + "クロススキル<b>翠風のクロス</b>（自分より速い味方が2体以上）で"
      + "<b>弱点キラーEL</b>と<b>ダッシュL</b>が付き、弱点を撃ち抜く一撃がさらに伸びる",
    fsName: "ヴェルデサイクロン", fsKind: "verdecyclone",
    fsPow: "竜巻 " + CHIHAYA_N + "基 1ヒット 攻撃力×" + CHIHAYA_PER + "（味方が止まるまで壁沿いを旋回）",
    fsDesc: "<b>ウォールサーキットリングの上位</b>。翠の竜巻が" + CHIHAYA_N + "基あらわれ、"
      + "<b>ふれた味方が止まるまで</b>触れた敵を削り続ける。"
      + "<br>いちばんのちがいは<b>動きかた</b>。もとの技が壁沿いを回るだけなのに対して、"
      + "こちらは<b>まわりながら少しずつ中心へ寄っていき、いちばん内側まで来たらまた壁ぎわへ戻る</b>——"
      + "つまり<b>盤面ぜんぶを何度もなでる</b>ので、真ん中にいる敵にも当たる。"
      + "<br>数は 7基 → <b>" + CHIHAYA_N + "基</b>に減ったかわりに、1基が<b>大きく（半径 34 → " + CHIHAYA_R + "）・"
      + "速く（13 → " + CHIHAYA_SPD + "）・強く（×0.36 → ×" + CHIHAYA_PER + "）</b>なっている。"
      + "<b>長く走れる味方</b>になぞらせるほど当たり続ける",
  },
  yui: {
    /* 光・反射。聖なる環をまとう祈り手。
       ★ 担当は<b>蓬莱天宮（闇 {grav,warp,slowwall}）</b>。
         ★★ 蓬莱天宮を<b>属性有利のまま完全対応できる最初のキャラ</b>。 */
    id: "yui", nm: "ユイ", img: "Yui.webp", th: "t_Yui.webp",
    el: "light", shot: "bounce", type: "聖環天穿型", gacha: true, debut: true, lux: true, nexus: "vanguard", star5: true,
    connect: "yui",
    hp: [974, 6420], atk: [554, 3512], spd: [307, 457],
    abil: [{ t: "sgrav" }, { t: "superaw" }, { t: "superaslow" },
           { t: "allkillerEL" }, { t: "houraikillerL" }, { t: "barrierEL" }],
    subfs: "divinepillar",
    ssName: "サンクチュアリ・ダブルレクイエム", ssTurns: 18, ssKind: "elena",
    ssPow: "自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）＋ <b>撃った瞬間に味方全員で総攻撃</b>／"
      + "<b>止まったあと もう一度動き出し、そこでもう一度 総攻撃</b>",
    ssDesc: "聖なる環がひらき、<b>自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間に<b>味方全員がいちばん近い敵へ突撃</b>し、"
      + "<b>自分が止まったあと もう一度ひとりでに動き出して、その2回目にも味方全員がもう一度突撃</b>する——"
      + "<b>1回のフルバーストで総攻撃が2回</b>入る（エレナの<b>アクア・ダブルレクイエム</b>と同じしくみ）。"
      + "<br><b>超アンチ重力バリア・超アンチワープ・超アンチ減速壁</b>の3種持ち。"
      + "この3つは<b>蓬莱天宮（闇 {重力バリア・ワープ・減速壁}）の必要アンチとぴったり一致</b>する——"
      + "★ 蓬莱天宮は必要アンチが3種あるため<b>これまでどのキャラも全部は消せなかった</b>クエストで、"
      + "そこへ<b>全属性キラーEL</b>と<b>属性有利</b>まで重なる、<b>蓬莱天宮の最適解</b>。"
      + "<br><b>超アンチワープ</b>は<b>画面上のワープ1つにつき攻撃・スピードが上がる</b>ので、"
      + "ワープの多い天宮ではそのまま火力になる。"
      + "<b>蓬莱族キラーL</b>が瑶妃に乗り、クロススキル<b>聖環のクロス</b>（戦型がちがう味方が2体以上）の"
      + "<b>底力EL</b>が重なる——<b>チームHPが50%以下になると与ダメージが" + SOKOJIKARA_EL_MUL + "倍</b>。"
      + "削り合いが長引くほど強くなるので、押されてからの逆転がそのまま勝ち筋になる。"
      + "<b>バリアEL</b>で前に出られ、<b>FBターンブースト</b>で倒すたびに次のフルバーストが近づく",
    fsName: "セイクリッドヘイロー", fsKind: "sacredhalo",
    fsPow: "光の輪 内・外の2重 1ヒット 攻撃力×" + YUI_RING_PER + "（広がりながら多段ヒット）＋ "
      + "広がりきった瞬間 <b>画面上のすべての敵へ光の柱</b> 攻撃力×" + YUI_PILLAR_PER,
    fsDesc: "<b>光の輪が2重にひらき、回りながらだんだん大きく広がっていく</b>。"
      + "内側の輪と外側の輪は<b>逆向きに回る</b>ので、輪と輪のあいだにいる敵には交互に当たり続ける。"
      + "<br>輪の上ならどこにふれてもヒットし、<b>同じ敵にも間をおいて何度でも</b>入る多段型。"
      + "<br>そして輪が画面のはしまで広がりきった瞬間、<b>画面上のすべての敵の頭上へ光の柱</b>が落ちる"
      + "（攻撃力×" + YUI_PILLAR_PER + "）。逃げた敵にも必ず1発届くので、"
      + "<b>散っている敵をまとめて片づける</b>のが得意",
  },
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-25 Starlight Academy Fest 2 限定SSR 5体（No.143〜147）
     ------------------------------------------------------------
     スズネ（火）／ミナモ（水）／カレン（闇）／トモエ（木）／ヒマリ（光）。
     Starlight Academy Fest の2期生。ガチャの中身（キャラ以外）は1期とまったく同じ。

     ★ 設計のきまり（ご指定）
       ・オムニアンチ・治癒の祈りは<b>持たせない</b>
       ・アンチは<b>2つまで</b>。その2種が「自分が有利属性になる蓬莱のクエスト」の
         必要アンチと<b>ぴったり一致</b>する＝そのクエストの最適解になる
       ・アビリティは<b>クロススキルもふくめて8つ</b>
         （素6つ＝アンチ2＋キラー2＋非キラー2／クロス2つ＝キラー1＋非キラー1）
       ・キラーは<b>クロスもふくめて3つまで</b>。等級はいまの最上位（属性キラーは EL）
       ・キラー以外の強いアビリティは<b>3つ</b>（下限の2つより1つ多い）
       ・パワーオーラ系・底力系は<b>キラーの3枠の中に数える</b>
       ・全員<b>クロススキル</b>を持つ（発動条件は1体ずつ別）
       ・リンクスキルは5体とも<b>新設</b>で、どれも<b>これまでに無い挙動</b>
       ・フルバーストは<b>実績のあるものを割りあて</b>（名前は新しく、しくみは既存＝
         「FBの効果だけ入っていない」型の抜けが原理的に起きない）

     ★★ 担当わけは<b>「適性キャラが少ない蓬莱のクエスト」を優先</b>して決めた（ご指定）。
       決めた時点の「完全対応かつ有利属性」のキャラ数は次のとおり:
         第一重 1体 ／ 第七重 2体 ／ 第二重 3体 ／ 第五重 4体 ／ 第三重 5体 ／
         第四重 6体 ／ 第六重 6体 ／ 第九重 6体
       ・<b>ミナモ（水）→ 第一重</b>… 有利属性でいちばん手薄（スカーレット1体だけだった）
       ・<b>トモエ（木）→ 第七重</b>… 2番目に手薄
       ・<b>カレン（闇）→ 第九重</b>… 第四重と同数（6体）なので、<b>ボスHPが重い層</b>のほうを取った
         （第一重〜第五重は 2,588万／第六重〜第九重は 5,796万）
       ・スズネ（火）は<b>第三重</b>、ヒマリ（光）は<b>第五重</b>しか選べない
         （第八重・蓬莱天宮は必要アンチが3種あり、アンチ2つでは届かないため）

     ★ 検算は charAntiKeys(id) と counterKeysOf(HOURAI_STAGES[i]) の一致で機械的に取れる。
     ══════════════════════════════════════════════════════════════ */
  suzune: {
    /* 火・貫通。星の学園の吹奏楽部。鈴の音が敵から敵へ渡っていく。
       ★ 担当は<b>第三重（木 {dw,ward}）</b>＝ 超ADW＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "suzune", nm: "スズネ", img: "Suzune.webp", th: "t_Suzune.webp",
    el: "fire", shot: "pierce", type: "烈焔連鎖型", fes: true, fesKey: "starlight2", lux: true, nexus: "pierce",
    connect: "suzune",
    hp: [952, 6280], atk: [566, 3585], spd: [305, 452],
    abil: [{ t: "superadw" }, { t: "award" },
           { t: "bosskillerM" }, { t: "houraikillerL" }, { t: "fsboostEL" }, { t: "barrierEL" }],
    subfs: "auroracurtain",
    ssName: "クリムゾン・ベルカント", ssTurns: MIRELLE_TURNS, ssKind: "mirelle",
    ssPow: "自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）＋ <b>敵全体を防御ダウン（"
      + MIRELLE_DEF_TURNS + "ターン）</b> ＋ <b>紅蓮メテオ" + MIRELLE_METEOR_N + "発（攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）</b>",
    ssDesc: "鈴の音が high C まで駆けあがり、<b>自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の防御力が" + MIRELLE_DEF_TURNS + "ターンのあいだダウン</b>し、"
      + "そこへ<b>紅蓮のメテオが" + MIRELLE_METEOR_N + "発</b>（1発あたり攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）降りそそぐ"
      + "（ミレーユの<b>フランベルジュ・インフェルノ</b>と同じしくみ）。"
      + "防御ダウンが先に入るので、<b>メテオも、そのあとの直殴りも、味方の一撃もまとめて伸びる</b>。"
      + "<br><b>超アンチダメージウォール・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第三重（木）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>。"
      + "そこへ<b>ボスキラーM（×" + BOSSKILLER_M_MUL + "）</b>と<b>蓬莱族キラーL</b>が重なる、第三重の最適解。"
      + "<br><b>リンクブーストEL</b>で自分のリンク・サブリンクが<b>×" + FSBOOSTEL_MUL + "</b>になるので、"
      + "連鎖するほど強くなるフレイムチェインと噛み合う。<b>バリアEL</b>で前にも出られる。"
      + "<br>クロススキル<b>鈴音のクロス</b>（自分よりHPが低い味方が2体以上）で"
      + "<b>弱点キラーEL</b>と<b>FBターンブースト</b>が付く——弱点を撃ち抜きながら、次のFBも近づく。",
    fsName: "フレイムチェイン", fsKind: "flamechain",
    fsPow: "着火 攻撃力×" + SUZUNE_PER + " → <b>連鎖するたびに +" + Math.round(SUZUNE_STEP * 100) + "%</b>（最大"
      + SUZUNE_N + "連鎖／合計 攻撃力×"
      + (SUZUNE_N * SUZUNE_PER + SUZUNE_STEP * (SUZUNE_N * (SUZUNE_N - 1) / 2)).toFixed(2) + "）",
    fsDesc: "もっとも近い敵に焔が着火し、そこから<b>次に近い敵へ飛び火</b>していく。"
      + "<br>いちばんのちがいは<b>連鎖するほど強くなる</b>こと。1つ目が攻撃力×" + SUZUNE_PER + "、"
      + "そこから<b>1回飛ぶごとに +" + Math.round(SUZUNE_STEP * 100) + "%</b>ずつ重くなり、"
      + "最後の" + SUZUNE_N + "つ目は<b>攻撃力×"
      + (SUZUNE_PER + SUZUNE_STEP * (SUZUNE_N - 1)).toFixed(2) + "</b>まで育つ。"
      + "<br>敵をひとまわりしたら<b>また同じ敵へ戻ってくる</b>ので、"
      + "ボスと護衛しかいない盤面でも連鎖は止まらない——<b>いちばん重い一撃はいつも最後</b>",
  },
  minamo: {
    /* 水・反射。星の学園の水泳部。放った輪刃が必ず戻ってくる。
       ★ 担当は<b>第一重（火 {dw,grav}）</b>＝ 超ADW＋超アンチ重力バリアの<b>2種ちょうど</b>。 */
    id: "minamo", nm: "ミナモ", img: "Minamo.webp", th: "t_Minamo.webp",
    el: "water", shot: "bounce", type: "碧水回帰型", fes: true, fesKey: "starlight2", lux: true, nexus: "vigor",
    connect: "minamo",
    hp: [992, 6540], atk: [540, 3425], spd: [300, 446],
    abil: [{ t: "superadw" }, { t: "sgrav" },
           { t: "manyfoeEL" }, { t: "houraikillerL" }, { t: "soulEL" }, { t: "regenL" }],
    subfs: "auroracurtain",
    ssName: "アクア・リフレイン", ssTurns: STARLIGHT_TURNS, ssKind: "akari",
    ssPow: "自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）＋ <b>味方全員のフルバーストターンを"
      + AKARI_FB_CUT + "進める</b>",
    ssDesc: "水面が大きくうねり、<b>自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）</b>して走り出す。"
      + "<br>同時に<b>味方全員のフルバーストが" + AKARI_FB_CUT + "ターンぶん一気に進む</b>"
      + "（アカリの<b>ヴィリディス・ソレイユ</b>と同じしくみ）。強いフルバーストを持つ味方と組むほど、そのまま火力になる。"
      + "<br><b>超アンチダメージウォール・超アンチ重力バリア</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第一重（火）の必要アンチとぴったり一致</b>する——"
      + "★ 第一重は<b>有利属性で完全対応できるキャラがスカーレット1体しかいなかった</b>クエストで、"
      + "そこへ<b>敵多底力EL（×" + MANYFOE_EL_MUL + "・画面上の敵が多いほど活きる）</b>と<b>属性有利</b>まで重なる、第一重の最適解。"
      + "<br><b>ソウルEL</b>（敵を倒すたびチームHPを" + Math.round(SOULEL_RATE * 100) + "%回復）と"
      + "<b>リジェネL</b>（毎ターン" + Math.round(REGENL_RATE * 100) + "%回復）で削り合いを支え、"
      + "クロススキル<b>碧環のクロス</b>（自分と同じ属性の味方が1体以上）で"
      + "<b>重力バリアキラーEL</b>と<b>ドレインM</b>が付く——重力バリアを張る第一重の敵に刺さる。",
    fsName: "アクアブーメラン", fsKind: "aquaboomerang",
    fsPow: "水の輪刃 攻撃力×" + MINAMO_PER + " ×<b>往復2回</b>（貫通・行きと帰りで別に当たる）",
    fsDesc: "水の輪刃が<b>もっとも近い敵の方向へ飛び</b>、敵を貫通しながら壁まで進む。"
      + "<br>いちばんのちがいは<b>そこで折り返して、放った本人のところまで帰ってくる</b>こと。"
      + "<b>行きと帰りは別々に当たる</b>ので、飛んでいく線の上にいる敵には<b>2回</b>入る。"
      + "<br>本人が動いていれば<b>帰り道は行きとちがう線</b>になるので、"
      + "<b>撃ったあとに自分がどこにいるか</b>で当たる敵が変わる——狙って線を2本引ける技",
  },
  karen: {
    /* 闇・貫通。星の学園の演劇部。舞台の暗転が敵を引き寄せる。
       ★ 担当は<b>第九重（光 {slowwall,ward}）</b>＝ 超アンチ減速壁＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "karen", nm: "カレン", img: "Karen.webp", th: "t_Karen.webp",
    el: "dark", shot: "pierce", type: "黒淵吸引型", fes: true, fesKey: "starlight2", lux: true, nexus: "slayer",
    connect: "karen",
    hp: [968, 6395], atk: [562, 3560], spd: [309, 462],
    abil: [{ t: "superaslow" }, { t: "award" },
           { t: "vitalEL" }, { t: "houraikillerL" }, { t: "fbaccel" }, { t: "barrierEL" }],
    subfs: "auroracurtain",
    ssName: "ノワール・カーテンコール", ssTurns: STARLIGHT_TURNS, ssKind: "sayuri",
    ssPow: "自強化（攻撃×" + SAYURI_ATK + "・スピード×" + SAYURI_SPD + "）＋ <b>敵全体の攻撃力を"
      + Math.round((1 - SAYURI_ATKDOWN_MUL) * 100) + "%ダウン（" + SAYURI_ATKDOWN_TURNS + "ターン）</b>",
    ssDesc: "舞台が暗転し、<b>自強化（攻撃×" + SAYURI_ATK + "・スピード×" + SAYURI_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の攻撃力が" + SAYURI_ATKDOWN_TURNS + "ターンのあいだ"
      + Math.round((1 - SAYURI_ATKDOWN_MUL) * 100) + "%落ちる</b>"
      + "（サユリの<b>ノクス・カリグラフィ</b>と同じしくみ）。"
      + "回復とちがって<b>先に撃っておくほど効く</b>ので、ボスの大技が来る前に合わせたい。"
      + "<br><b>超アンチ減速壁・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第九重（光）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>。"
      + "そこへ<b>バイタルキラーEL（×" + VITALEL_MUL + "・HPの残っている敵ほど重い）</b>と<b>蓬莱族キラーL</b>が重なる、第九重の最適解。"
      + "<br><b>FBターンアクセル</b>（チームHPが" + Math.round(FBACCEL_HP * 100) + "%を切ると毎ターン"
      + FBACCEL_TURNS + "ターン短縮）と、クロススキル<b>黒華のクロス</b>（自分と同じ撃種の味方が1体以上）の"
      + "<b>底力EL</b>（チームHP50%以下で与ダメージ×" + SOKOJIKARA_EL_MUL + "）は<b>同じ場面で同時に立ちあがる</b>——"
      + "押されてからが本番のキャラ。<b>バリアEL</b>と<b>全属性耐性M</b>で、その半分を長く保てる。",
    fsName: "ノワールシンギュラリティ", fsKind: "darksingularity",
    fsPow: "暗黒の重力球（半径 " + KAREN_R + "）が <b>敵を引き寄せながら</b> 攻撃力×" + KAREN_TICK_PER
      + " × " + KAREN_PULSES + "回 ＋ <b>崩壊の大爆発</b> 攻撃力×" + KAREN_BOOM_PER,
    fsDesc: "敵の集まっているところへ<b>暗黒の重力球</b>を置く。"
      + "<br>いちばんのちがいは<b>敵そのものを動かす</b>こと——MagiBurst で"
      + "<b>敵の位置を変えるリンクスキルはこれがはじめて</b>。"
      + "球のまわり（半径 " + KAREN_R + "）にいる敵は<b>中心へじりじり引き寄せられ</b>ながら、"
      + KAREN_PULSES + "回にわたって削られる（1回あたり攻撃力×" + KAREN_TICK_PER + "）。"
      + "<br>そして最後に球が<b>崩壊して大爆発</b>（攻撃力×" + KAREN_BOOM_PER + "）。"
      + "このころには敵が中心へ寄せ集められているので、<b>散っていた敵ほどまとめて巻きこめる</b>。"
      + "<br><small>※ ボスは重すぎて動きません（引き寄せられるのはボス以外の敵だけ）。ダメージは両方に入ります</small>",
  },
  tomoe: {
    /* 木・反射。星の学園の園芸部。撒いた種が順に芽吹く。
       ★ 担当は<b>第七重（水 {mine,ward}）</b>＝ 超マインスイーパーEL＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "tomoe", nm: "トモエ", img: "Tomoe.webp", th: "t_Tomoe.webp",
    el: "wood", shot: "bounce", type: "翠芽播種型", fes: true, fesKey: "starlight2", lux: true, nexus: "demolish",
    connect: "tomoe",
    hp: [974, 6425], atk: [551, 3500], spd: [311, 468],
    abil: [{ t: "supermsEL" }, { t: "award" },
           { t: "fatalkillerL" }, { t: "houraikillerL" }, { t: "laserstopM" }, { t: "healM" }],
    subfs: "auroracurtain",
    ssName: "ヴェルデ・スプラウト・オード", ssTurns: STARLIGHT_TURNS, ssKind: "sayaka",
    ssPow: "自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）＋ <b>味方全員が貫通になって総攻撃</b>"
      + "（貫通は それぞれ" + SAYAKA_PIERCE_ACTS + "回行動し終えるまで／突撃中の直殴り×" + RALLY_MUL + "）",
    ssDesc: "翠の芽が盤面いっぱいに伸び、<b>自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）</b>して走り出す。"
      + "<br>同時に<b>味方全員が貫通タイプに変わり、そのまま全員で総攻撃</b>をかける"
      + "（貫通はそれぞれが" + SAYAKA_PIERCE_ACTS + "回行動し終えるまで／突撃中の直殴りは<b>×" + RALLY_MUL + "</b>）"
      + "（サヤカの<b>アクア・ノクターン・ドライブ</b>と同じしくみ）。"
      + "<br><b>超マインスイーパーEL・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第七重（水）の必要アンチとぴったり一致</b>する——"
      + "★ 第七重は<b>有利属性で完全対応できるキャラが2体しかいなかった</b>クエストで、"
      + "そこへ<b>フェイタルキラーL（×" + FATALKILLER_L_MUL + "・弱った敵にとどめを刺す）</b>と<b>属性有利</b>まで重なる、第七重の最適解。"
      + "地雷は<b>回収して" + MSEL_MUL + "倍の一撃</b>になるので、地雷の多い第七重ではそのまま火力になる。"
      + "<br><b>超レーザーストップM</b>でレーザーを受け止めてチームHPを"
      + Math.round(LASERSTOPM_HEAL * 100) + "%戻し、<b>回復M</b>でなぞった味方の数だけさらに戻す。"
      + "クロススキル<b>翠芽のクロス</b>（自分よりHPが高い味方が1体以上）で"
      + "<b>連撃キラーEL</b>（同じ敵に連続でふれるほど最大×" + COMBOKILLEREL_MAX + "）と<b>ダッシュL</b>が付く——"
      + "速さを活かして<b>同じ敵をなぞり続ける</b>のがこの子の勝ち筋。",
    fsName: "ヴェルデシード", fsKind: "verdeseed",
    fsPow: "翠の種 " + TOMOE_N + "つ × 芽吹き 攻撃力×" + TOMOE_PER + "（半径 " + TOMOE_R + "・置いた順に時間差で芽吹く）",
    fsDesc: "盤面に<b>翠の種を" + TOMOE_N + "つ撒く</b>。種は<b>敵のいるところから優先して</b>落ちる。"
      + "<br>いちばんのちがいは<b>置いてから時間差で芽吹く</b>こと。"
      + "撒いた順に" + TOMOE_GAP + "フレームおきに1つずつ<b>芽吹いて範囲爆発</b>していくので、"
      + "画面のあちこちで<b>次々に</b>爆発が起きる。"
      + "<br>芽吹きの範囲（半径 " + TOMOE_R + "）は重なるので、<b>敵が固まっているところに種が2つ3つ落ちれば</b>"
      + "その敵にはそのぶんだけ入る。撃った瞬間に全部決まる技とちがって、"
      + "<b>芽吹くまでのあいだに敵が動いても種は消えない</b>",
  },
  himari: {
    /* 光・貫通。星の学園の天文部。敵を星座に見立てて結ぶ。
       ★ 担当は<b>第五重（闇 {ward,warp}）</b>＝ アンチ断絶界＋超アンチワープの<b>2種ちょうど</b>。 */
    id: "himari", nm: "ヒマリ", img: "Himari.webp", th: "t_Himari.webp",
    el: "light", shot: "pierce", type: "星辰連星型", fes: true, fesKey: "starlight2", lux: true, nexus: "tempo",
    connect: "himari",
    hp: [958, 6320], atk: [556, 3530], spd: [314, 478],
    abil: [{ t: "award" }, { t: "superaw" },
           { t: "firstkillerEL" }, { t: "houraikillerL" }, { t: "mirage" }, { t: "dashL" }],
    subfs: "auroracurtain",
    ssName: "ステラ・ドーン・レイ", ssTurns: STARLIGHT_TURNS, ssKind: "hinata",
    ssPow: "自強化（攻撃×" + HINATA_ATK + "・スピード×" + HINATA_SPD + "）＋ <b>画面上のすべての敵へ光の柱（1本 攻撃力×"
      + HINATA_PILLAR_MUL + "・光属性）</b>",
    ssDesc: "夜明けの星がひとつずつ灯り、<b>自強化（攻撃×" + HINATA_ATK + "・スピード×" + HINATA_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の真上から光の柱</b>が落ちる"
      + "（1本あたり攻撃力×" + HINATA_PILLAR_MUL + "・光属性）"
      + "（ヒナタの<b>ステラ・オーロラ・レイ</b>と同じしくみ）。"
      + "狙いを付けずに<b>取りこぼしなく全体へ</b>入るので、散らばった敵にも、隠れている敵にも同じだけ通る。"
      + "<br><b>アンチ断絶界・超アンチワープ</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第五重（闇）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>。"
      + "超アンチワープは<b>画面上のワープ1つにつき攻撃・スピードが上がる</b>ので、"
      + "ワープの多い第五重ではそのまま火力になる。"
      + "<b>ファーストキラーEL（×" + FIRSTKILLER_EL_MUL + "・そのショットで最初にふれた敵）</b>と<b>蓬莱族キラーL</b>も重なる、第五重の最適解。"
      + "<br><b>ダッシュL（スピード×" + DASHL_MUL + "）</b>で最大スピードは<b>全キャラ最速</b>。"
      + "<b>ミラージュ</b>で敵の攻撃を" + Math.round(MIRAGE_P * 100) + "%の確率でまるごと回避し、"
      + "クロススキル<b>星辰のクロス</b>（自分と同じ属性の味方が2体以上）で"
      + "<b>パワーオーラEL</b>（チームHP50%以上で攻撃・スピード×" + AURAEL_MUL + "）と"
      + "<b>FBターンアクセル</b>が付く——光でそろえるほど速く、強くなる。",
    fsName: "ステラコンステレーション", fsKind: "constellation",
    fsPow: "星座の線 1本 攻撃力×" + HIMARI_PER + " × <b>" + HIMARI_PULSES + "回の明滅</b>"
      + "（1回の明滅で同じ敵に入るのは最大" + HIMARI_CAP + "本まで）",
    fsDesc: "画面上の<b>敵を「星」に見立てて、星と星を光の線で結ぶ</b>。"
      + "<br>いちばんのちがいは<b>技の形が敵の並びで決まる</b>こと。"
      + "できあがった星座は" + HIMARI_PULSES + "回<b>明滅</b>し、そのたびに"
      + "<b>線にふれているすべての敵</b>へダメージが入る（1本あたり攻撃力×" + HIMARI_PER + "）。"
      + "<br><b>敵が多いほど線が増える</b>ので、1体が受ける本数もそのまま増える"
      + "（1回の明滅で同じ敵に入るのは最大" + HIMARI_CAP + "本まで）。"
      + "<br>敵が1体しかいないときは<b>本人とその敵を結ぶ線</b>が引かれるので、"
      + "<b>ボスと差し向かいでも必ず" + HIMARI_PULSES + "回入る</b>",
  },
  mirelle: {
    /* 火・貫通。桜色の焔をまとう舞姫。
       ★ 担当は<b>第八重（木 {dw,mine,grav}）</b>＝ 超ADW＋超マインスイーパーEL＋超アンチ重力バリアで完全対応。 */
    id: "mirelle", nm: "ミレーユ", img: "Mirelle.webp", th: "t_Mirelle.webp",
    el: "fire", shot: "pierce", type: "焔纏貫穿型", gacha: true, debut: true, lux: true, nexus: "force", star5: true,
    connect: "mirelle",
    hp: [958, 6340], atk: [542, 3440], spd: [302, 450],
    abil: [{ t: "superadw" }, { t: "supermsEL" }, { t: "sgrav" },
           { t: "killerM", el: "wood" }, { t: "weakkillerEL" }, { t: "barrierL" }],
    subfs: "supercrossclone",
    ssName: "フランベルジュ・インフェルノ", ssTurns: MIRELLE_TURNS, ssKind: "mirelle",
    ssPow: "自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）＋ <b>敵全体を防御ダウン（"
      + MIRELLE_DEF_TURNS + "ターン）</b> ＋ <b>紅蓮メテオ" + MIRELLE_METEOR_N + "発（攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）</b>",
    ssDesc: "桜色の焔が波打ち、<b>自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）</b>して撃ち出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の防御力が" + MIRELLE_DEF_TURNS + "ターンのあいだダウン</b>し、"
      + "そこへ<b>紅蓮のメテオが" + MIRELLE_METEOR_N + "発</b>（1発あたり攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）降りそそぐ。"
      + "防御ダウンが先に入るので、<b>メテオも、そのあとの直殴りも、味方の一撃もまとめて伸びる</b>。"
      + "<br><b>超アンチダメージウォール・超マインスイーパーEL・超アンチ重力バリア</b>の3種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第八重（木）の必要アンチとぴったり一致</b>する——"
      + "第八重は必要アンチが3種あるため<b>これまで完全対応できるキャラがいなかった</b>クエストで、"
      + "そこへ<b>木属性キラーM</b>と<b>属性有利</b>まで重なる、第八重の最適解。"
      + "<b>弱点キラーEL</b>と<b>バリアL</b>で、ボスの弱点を撃ち抜きながら前にも出られる。",
    fsName: "超強インフィニティレーザー", fsKind: "superinfinitylaser",
    fsPow: "極太レーザー 攻撃力×" + SINFL_PER + "（貫通）＋ 着弾から" + SINFL_SPLIT_N + "方向へ分裂 各×" + SINFL_SPLIT_PER,
    fsDesc: "<b>インフィニティレーザーの強化版</b>。もっとも近い敵へ<b>さらに極太のレーザー</b>を撃ちこみ、"
      + "着弾点から<b>" + SINFL_SPLIT_N + "方向</b>へレーザーが分裂して広がる。"
      + "<br>本体の威力は<b>×1.60 → ×" + SINFL_PER + "</b>、分裂1本は<b>×0.55 → ×" + SINFL_SPLIT_PER + "</b>、"
      + "分裂の数も<b>8方向 → " + SINFL_SPLIT_N + "方向</b>に増えている。"
      + "どれも貫通するので、射線と着弾点に敵が重なっているほど伸びる。",
  },
  scarlet: {
    /* 水・反射。蒼い月光をまとう眠り姫。
       ★ 担当は<b>第一重（火 {dw,grav}）</b>＝ 超ADW＋超アンチ重力バリアで完全対応。
         3つ目の<b>超アンチ減速壁</b>で、第六重の減速壁も踏み抜ける。 */
    id: "scarlet", nm: "スカーレット", img: "Scarlet.webp", th: "t_Scarlet.webp",
    el: "water", shot: "bounce", type: "蒼月反射型", gacha: true, debut: true, lux: true, nexus: "mercy", star5: true,
    connect: "scarlet",
    hp: [966, 6390], atk: [538, 3420], spd: [300, 446],
    abil: [{ t: "superadw" }, { t: "sgrav" }, { t: "superaslow" },
           { t: "killerEL", el: "fire" }, { t: "bosskillerM" }, { t: "regenL" }],
    subfs: "pspread3",
    ssName: "アビス・ティアーズ・ソナタ", ssTurns: SCARLET_TURNS, ssKind: "scarlet",
    ssPow: "自強化（攻撃×" + SCARLET_ATK + "・スピード×" + SCARLET_SPD + "）＋ <b>チームHPを"
      + Math.round(SCARLET_HEAL * 100) + "%回復</b> ＋ <b>敵全体の攻撃ターンを" + SCARLET_DELAY + "遅延（即死のカウントも）</b>",
    ssDesc: "蒼い涙が盤面いっぱいに降り、<b>自強化（攻撃×" + SCARLET_ATK + "・スピード×" + SCARLET_SPD + "）</b>して走り出す。"
      + "<br>同時に<b>チームHPを最大HPの" + Math.round(SCARLET_HEAL * 100) + "%回復</b>し、"
      + "<b>画面上のすべての敵の攻撃ターンを" + SCARLET_DELAY + "遅らせる</b>"
      + "（<b>即死のカウントも同じだけ後ろへ</b>ずれる）。"
      + "削りきれずに1ターン足りない——という場面を、<b>回復と遅延の両方から</b>引き延ばす立て直しのフルバースト。"
      + "<br><b>超アンチダメージウォール・超アンチ重力バリア</b>は<b>第一重（火）の必要アンチとぴったり一致</b>し、"
      + "<b>火属性キラーEL</b>と属性有利が重なる第一重の最適解。"
      + "3つ目の<b>超アンチ減速壁</b>があるので、減速壁の張られた第六重でも足を止められない。"
      + "<b>ボスキラーM</b>と<b>リジェネL</b>で、長い削り合いほど強くなる。",
    fsName: "超強ハイクロススティンガー", fsKind: "superhicross",
    fsPow: "貫通弾" + SHICROSS_N + "本 × 攻撃力×" + SHICROSS_PER + "（左右＋斜めへ展開し、近くの敵へ折り返す）",
    fsDesc: "ハイクロススティンガーの上位。<b>2本だった貫通弾が" + SHICROSS_N + "本</b>になり、"
      + "左右と斜め上下へ十字に展開したあと<b>近くの敵へ個別に追って折り返す</b>。"
      + "★ 2026-08-20c <b>1発の威力を ×1.70 → ×" + SHICROSS_PER + " に引き上げ</b>、"
      + "弾も<b>大きく尾を引く十字の光槍</b>になった。折り返しの瞬間には十字の閃光が走るので、"
      + "どこで曲がってどの敵を狙ったのかが目で追える",
  },
  koyuki: {
    /* 闇・貫通。魔猫を従える宵の姫。
       ★ 担当は<b>第四重（光 {grav,ward}）と第九重（光 {slowwall,ward}）</b>。
         アンチ3種（超アンチ重力バリア／アンチ断絶界／超アンチ減速壁）で<b>2クエストとも完全対応</b>する。 */
    id: "koyuki", nm: "コユキ", img: "Koyuki.webp", th: "t_Koyuki.webp",
    el: "dark", shot: "pierce", type: "宵闇魔猫型", gacha: true, debut: true, lux: true, nexus: "slayer", star5: true,
    connect: "koyuki",
    hp: [954, 6320], atk: [546, 3460], spd: [304, 454],
    abil: [{ t: "sgrav" }, { t: "award" }, { t: "superaslow" },
           { t: "killerEL", el: "light" }, { t: "poisonkillerEL" }, { t: "gravkillerL" }],
    subfs: "positionlimit",
    ssName: "ノワール・クロウ・ラプソディ", ssTurns: KOYUKI_TURNS, ssKind: "koyuki",
    ssPow: "自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）＋ <b>味方全員で総攻撃</b> ＋ <b>敵全体を毒状態（"
      + KOYUKI_POISON_TURNS + "ターン）</b>",
    ssDesc: "宵闇の魔猫が一斉に飛び出し、<b>自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）</b>。"
      + "<br>撃った瞬間に<b>画面上のすべての敵が" + KOYUKI_POISON_TURNS + "ターンの毒状態</b>になり、"
      + "そのまま<b>味方全員が号令に合わせていちばん近い敵へ突っこむ（総攻撃）</b>。"
      + "毒を撒いてから全員で殴るので、<b>毒キラーEL</b>を持つ本人の一撃が<b>そのターンのうちに</b>跳ね上がる。"
      + "<br><b>超アンチ重力バリア・アンチ断絶界・超アンチ減速壁</b>の3種持ち。"
      + "この3つは<b>第四重（光 {重力バリア・断絶界}）と第九重（光 {減速壁・断絶界}）の必要アンチを両方とも覆う</b>ので、"
      + "<b>2つのクエストのどちらでも属性有利のまま全ギミックを無視して走れる</b>——闇属性の決定版。"
      + "<b>光属性キラーEL</b>と<b>重力バリアキラーL</b>を併せ持つので、"
      + "重力バリアを張ってくる第四重の光ボスには<b>属性キラーと重ねて</b>刺さる。",
    fsName: "超強鋭角三方向追従型貫通弾", fsKind: "supertri3followsharp",
    fsPow: "1発ごとに 攻撃力×" + SUPTRI_SHARP_PER + "（鋭角3方向・高速連射・貫通／味方が止まるまで撃ち続ける）",
    fsDesc: "<b>鋭角三方向追従型貫通弾の強化版</b>。3発が<b>ほとんど同じ点にまとまって</b>飛ぶ形はそのままに、"
      + "<b>連射が速く・弾が太く・威力も上</b>。まとまって当たるので、1体を集中して溶かすのが得意",
  },
  amelia: {
    /* 木・反射。木もれ日の下でほほえむ少女。
       ★ 担当は<b>第七重（水 {mine,ward}）</b>＝ 超マインスイーパーL＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "amelia", nm: "アメリア", img: "Amelia.webp", th: "t_Amelia.webp",
    el: "wood", shot: "bounce", type: "翠陽支援型", gacha: true, debut: true, lux: true, nexus: "bond", star5: true,
    hp: [905, 5990], atk: [508, 3230], spd: [292, 430],
    abil: [{ t: "supermsL" }, { t: "award" },
           { t: "killerL", el: "water" }, { t: "fsboostL" }, { t: "soulM" }],
    subfs: "boundheal",
    ssName: "ヴェルデ・ブレッシング", ssTurns: 20, ssKind: "kotomi",
    ssPow: "自強化（攻撃×1.8・スピード×1.25）＋ <b>ふれた味方のステータスを×2.0</b>（その味方が2回行動するまで）",
    ssDesc: "木もれ日をあつめて<b>自強化</b>（攻撃×1.8・スピード×1.25）し、"
      + "<b>このショットでふれた味方すべてのステータス（攻撃力・スピード）を×2.0</b>に引き上げる"
      + "（コトミの<b>ノクス・ルミナリエ</b>とまったく同じしくみのフルバースト）。"
      + "強化は<b>その味方が2回行動し終えるまで</b>続くので、"
      + "大技を持つ味方をなぞってから走らせるのが基本になる。"
      + "<br><b>超マインスイーパーL・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第七重（水）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第七重の最適解。"
      + "<b>リンクブーストL</b>と<b>バウンドヒール</b>を併せ持つので、なぞるだけでチームのHPも戻る。",
    fsName: "ウォールサーキットリング", fsKind: "wallcircuit", fsPow: "リング7基 1ヒット 攻撃力×0.36（味方が止まるまで壁沿いを旋回）",
    fsDesc: "<b>7つのリングが画面の壁沿いをぐるりと旋回</b>し、<b>ふれた味方が止まるまで</b>周回しながら触れた敵を削り続ける",
  },
  mio: {
    /* 光・貫通。朝の光をまとう少女。
       ★ 担当は<b>第五重（闇 {ward,warp}）</b>＝ アンチ断絶界＋超アンチワープの<b>2種ちょうど</b>。 */
    id: "mio", nm: "ミオ", img: "Mio.webp", th: "t_Mio.webp",
    el: "light", shot: "pierce", type: "曙光貫通型", gacha: true, debut: true, lux: true, nexus: "vanguard", star5: true,
    hp: [896, 5920], atk: [512, 3250], spd: [296, 436],
    abil: [{ t: "award" }, { t: "superaw" },
           { t: "killerL", el: "dark" }, { t: "weakkillerL" }, { t: "linkcharge" }],
    subfs: "lock8",
    ssName: "ソレイユ・ピアース", ssTurns: 20, ssKind: "selene",
    ssPow: "自強化（攻撃×1.9・スピード×1.25）＋ <b>貫通タイプになって敵を激しく貫く</b> ＋ <b>停止後に最も近い敵へ再走（攻撃×2.6）</b>",
    ssDesc: "朝の光をまとって<b>自強化（攻撃×1.9・スピード×1.25）</b>し、<b>貫通タイプ</b>になって敵の列をまとめて撃ち抜く。"
      + "止まったあとは<b>いちばん近い敵へひとりでに走り直す（×2.6）</b>ので、1ターンで<b>2回ぶん</b>刺さる"
      + "（セレネ・アルテミアと同じフルバースト）。"
      + "<br><b>アンチ断絶界・超アンチワープ</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第五重（闇）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>——第五重の最適解。"
      + "超アンチワープは<b>画面上のワープ1つにつき攻撃・スピードが上がる</b>ので、"
      + "ワープの多い第五重ではそのまま火力になる。"
      + "<b>闇属性キラーL</b>・<b>弱点キラーL</b>・<b>リンクチャージ</b>で、削りながらフルバーストも回る。"
      + "<br>リンクスキルは<b>超強ルミナスレイ</b>。壁ぎわに砲台が" + SLUMI_N + "基ならび、"
      + "ふれた味方が止まった瞬間に<b>盤面をまるごと貫く光の網</b>が走る。",
    fsName: "超強ルミナスレイ", fsKind: "superluminous",
    fsPow: "砲台1基のレーザー 攻撃力×" + SLUMI_MUL + "（貫通・最大" + SLUMI_N + "基・レーザーがさらに極太）",
    fsDesc: "ルミナスレイの上位。設置できる砲台が<b>4基 → " + SLUMI_N + "基</b>に増え、"
      + "レーザーは<b>威力も当たり判定の太さも大幅に強化</b>（×0.95 → <b>×" + SLUMI_MUL + "</b>）。"
      + "ふれた味方がぶつかった壁に砲台が並び、その味方が止まった瞬間に<b>盤面をまるごと貫く光の網</b>が走る",
  },
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-26 GRAND DEBUT GACHA Ver.3.0 限定SSR 5体（No.148〜152）
     ------------------------------------------------------------
     ご指定:
       ・フウカ(闇)/ミヤビ(木)/スミレ(光) … オムニアンチ・治癒の祈りなし（フウカだけ治癒の祈り持ち）、
         アンチ3つまで、クロススキルあり、キラー3つ、蓬莱の九重の有利属性で最適解
       ・カレン(火)/ミレイ(水) … アンチ2つまで、クロスなし、キラー2つ・アビリティ6つ
       ・キラーにはパワーオーラ系・底力系もふくむ。クロスもアビリティに数える
     ★★ 名前の衝突をさけて改名（ご指定）:
       カレン → <b>カリン</b>（No.145 に「カレン」が居る）
       フウカ → <b>ユウカ</b>（No.79 に「フウカ」が居る）
       画像のファイル名も別（Karin.webp / Yuuka.webp）。
     ★ 5体とも共通サブリンク<b>アフターグロウ・トレイル</b>を持つ（この版の目印）。
     ══════════════════════════════════════════════════════════════ */
  karin: {
    /* 火・貫通。紅い薔薇の館の主。
       ★ 担当は<b>第三重（木 {dw,ward}）</b>＝ 超ADW＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "karin", nm: "カリン", img: "Karin.webp", th: "t_Karin.webp",
    el: "fire", shot: "pierce", type: "紅薔薇閉環型", gacha: true, debut: true, lux: true, nexus: "slayer", star5: true,
    hp: [963, 6370], atk: [566, 3585], spd: [305, 452],
    abil: [{ t: "superadw" }, { t: "award" },
           { t: "weakkillerEL" }, { t: "houraikillerL" }, { t: "barrierEL" }, { t: "fbaccel" }],
    subfs: "afterglowtrail",
    ssName: "クリムゾンローズ・ヴァルス", ssTurns: 16, ssKind: "mirelle",
    ssPow: "自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）＋ <b>敵全体を防御ダウン（"
      + MIRELLE_DEF_TURNS + "ターン）</b> ＋ <b>紅薔薇メテオ" + MIRELLE_METEOR_N + "発（攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）</b>",
    ssDesc: "館じゅうの薔薇が舞い上がり、<b>自強化（攻撃×" + MIRELLE_ATK + "・スピード×" + MIRELLE_SPD + "）</b>して踊り出す。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の防御力が" + MIRELLE_DEF_TURNS + "ターンのあいだダウン</b>し、"
      + "そこへ<b>紅い薔薇のメテオが" + MIRELLE_METEOR_N + "発</b>（1発あたり攻撃力×" + MIRELLE_METEOR_MUL + "・火属性）降りそそぐ"
      + "（ミレーユの<b>フランベルジュ・インフェルノ</b>と同じしくみ）。"
      + "<br><b>超アンチダメージウォール・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第三重（木）の必要アンチとぴったり一致</b>するので、"
      + "<b>属性有利のまま全ギミックを無視して走れる</b>。"
      + "<br>キラーは<b>弱点キラーEL（×" + WEAKKILLER_EL_MUL + "）</b>と<b>蓬莱族キラーL</b>の2枚。"
      + "貫通なので弱点を線でつなげて抜けやすく、防御ダウンとあわせると1ショットの伸びが大きい。"
      + "<b>バリアEL</b>で前に出られ、<b>FBターンアクセル</b>で次の踊りも早い",
    fsName: "ローズケージ", fsKind: "rosecage",
    fsPow: "茨の輪 " + KARIN_TICKS + "段（1段 攻撃力×" + KARIN_PER + "）＋ 閉じきったときの大爆発 攻撃力×" + KARIN_BOOM_PER,
    fsDesc: "ふれた味方を中心に<b>大きな茨の輪</b>が生まれ、"
      + "<b>だんだん小さくなりながら中心へ閉じていく</b>（半径 " + KARIN_R0 + " → " + KARIN_R1 + "）。"
      + "<br>いちばんのちがいは<b>広がるのではなく縮む</b>こと。"
      + "外にいる敵から順に輪が通りすぎていき、逃げるほど中心へ追いこまれる。"
      + "<br>輪は" + KARIN_TICKS + "段にわたって縮み、そのたびに輪にふれている敵を削る。"
      + "そして閉じきった瞬間、<b>中心で大爆発</b>（攻撃力×" + KARIN_BOOM_PER + "・半径 " + KARIN_BOOM_R + "）——"
      + "<b>散らばった敵を集めてから一撃で落とす</b>のがこの技の勝ち筋",
  },
  mirei: {
    /* 水・反射。蒼い月の湖にすむ鏡の巫女。
       ★ 担当は<b>第一重（火 {dw,grav}）</b>＝ 超ADW＋超アンチ重力バリアの<b>2種ちょうど</b>。 */
    id: "mirei", nm: "ミレイ", img: "Mirei.webp", th: "t_Mirei.webp",
    el: "water", shot: "bounce", type: "蒼月鏡像型", gacha: true, debut: true, lux: true, nexus: "aegis", star5: true,
    hp: [986, 6505], atk: [551, 3492], spd: [309, 461],
    abil: [{ t: "superadw" }, { t: "sgrav" },
           { t: "combokillerEL" }, { t: "houraikillerL" }, { t: "regenL" }, { t: "barrierEL" }],
    subfs: "afterglowtrail",
    ssName: "ルナ・ダブルミラージュ", ssTurns: 17, ssKind: "elena",
    ssPow: "自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）＋ <b>撃った瞬間に味方全員で総攻撃</b>／"
      + "<b>止まったあと もう一度動き出し、そこでもう一度 総攻撃</b>",
    ssDesc: "湖面に月がふたつ映り、<b>自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）</b>して滑り出す。"
      + "<br>撃った瞬間に<b>味方全員がいちばん近い敵へ突撃</b>し、"
      + "<b>自分が止まったあと もう一度ひとりでに動き出して、その2回目にも味方全員がもう一度突撃</b>する——"
      + "<b>1回のフルバーストで総攻撃が2回</b>入る（エレナの<b>アクア・ダブルレクイエム</b>と同じしくみ）。"
      + "<br><b>超アンチダメージウォール・超アンチ重力バリア</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第一重（火）の必要アンチとぴったり一致</b>する。"
      + "<br>キラーは<b>連撃キラーEL</b>と<b>蓬莱族キラーL</b>の2枚。反射なので同じ敵に何度もふれやすく、"
      + "ふれるほど倍率が積み上がる（上限×" + COMBOKILLEREL_MAX + "）——総攻撃2回とかみ合って、ボス1体をひたすら削る形になる。"
      + "<b>リジェネL</b>と<b>バリアEL</b>で、削り合いの長い第一重でも落ちにくい",
    fsName: "ミラーブルーム", fsKind: "mirrorbloom",
    fsPow: "青い波紋 " + MIREI_WAVES + "回 × <b>2か所（本人＋点対称の位置）</b> 1ヒット 攻撃力×" + MIREI_PER,
    fsDesc: "ふれた味方の位置と、<b>盤面の中心をはさんだ真うらの位置</b>——"
      + "その<b>2か所から同時に</b>青い波紋が広がる。"
      + "<br>いちばんのちがいは<b>本人がいない場所からも撃てる</b>こと。"
      + "盤面のどこに立つかを決めると、<b>反対側の当たりかたも同時に決まる</b>。"
      + "<br>波は" + MIREI_WAVES + "回くり返し、<b>2つの波が重なる場所にいる敵には両方から入る</b>"
      + "（＝1回につき2ヒット）。中央付近は2つの波が近いので、<b>盤面のまんなかに集まった敵にいちばん重い</b>",
  },
  yuuka: {
    /* 闇・貫通。黒十字を背負う祈りの少女。
       ★ 担当は<b>第四重（光 {grav,ward}）と第九重（光 {slowwall,ward}）の両方</b>
         ＝ 超アンチ重力バリア＋アンチ断絶界＋超アンチ減速壁の3種で、2クエストを同時に満たす。 */
    id: "yuuka", nm: "ユウカ", img: "Yuuka.webp", th: "t_Yuuka.webp",
    el: "dark", shot: "pierce", type: "黒十字刻印型", gacha: true, debut: true, lux: true, nexus: "pierce", star5: true,
    connect: "yuuka",
    hp: [978, 6450], atk: [560, 3548], spd: [306, 455],
    abil: [{ t: "sgrav" }, { t: "award" }, { t: "superaslow" },
           { t: "sokojikaraEL" }, { t: "houraikillerL" }, { t: "pray" }],
    subfs: "afterglowtrail",
    ssName: "ノワールクルス・レクイエム", ssTurns: 15, ssKind: "sayuri",
    ssPow: "自強化（攻撃×" + SAYURI_ATK + "・スピード×" + SAYURI_SPD + "）＋ <b>画面上のすべての敵の攻撃力を×"
      + SAYURI_ATKDOWN_MUL + "（" + SAYURI_ATKDOWN_TURNS + "ターン）</b>",
    ssDesc: "黒い十字が背中でひらき、<b>自強化（攻撃×" + SAYURI_ATK + "・スピード×" + SAYURI_SPD + "）</b>して駆け抜ける。"
      + "<br>撃った瞬間、<b>画面上のすべての敵の攻撃力が×" + SAYURI_ATKDOWN_MUL + "まで落ちる</b>"
      + "（" + SAYURI_ATKDOWN_TURNS + "ターン。サユリの<b>墨染めの一閃</b>と同じしくみ）——"
      + "牙を折ってから斬りにいくので、押されている盤面ほど効く。"
      + "<br><b>超アンチ重力バリア・アンチ断絶界・超アンチ減速壁</b>の3種持ち。"
      + "★ この3つは<b>第四重（光 {重力バリア・断絶界}）と第九重（光 {減速壁・断絶界}）の"
      + "どちらも満たす</b>——<b>1体で2クエストの最適解</b>になる、この版でいちばん尖った形。"
      + "<br>さらに<b>治癒の祈り</b>（ボス戦のマップ開始時に" + Math.round(PRAY_CHANCE * 100) + "%でHP全回復）を持つのは"
      + "この版でユウカだけ。<b>底力EL</b>（チームHPが50%以下で与ダメージ×" + SOKOJIKARA_EL_MUL + "）とかみ合い、"
      + "<b>追いつめられてから、全回復して殴り返す</b>という戦いかたができる。"
      + "<br>クロススキル<b>黒十字のクロス</b>（自分と同じ撃種の味方が1体もいない）で"
      + "<b>弱点キラーEL</b>と<b>バリアEL</b>が付く——貫通を自分ひとりにする編成が、そのままごほうびになる。",
    fsName: "クロスグレイヴ", fsKind: "crossgrave",
    fsPow: "黒十字の刃（貫通・壁で" + YUUKA_BOUNCE + "回反射・刻印 攻撃力×" + YUUKA_MARK_PER + "）＋ 走りきると<b>刻印がいっせいに起爆</b> 1つ 攻撃力×"
      + YUUKA_BOOM_PER + "（刻印1つ増えるごとに全部へ +" + YUUKA_STEP + "／最大" + YUUKA_CAP + "つぶんまで）",
    fsDesc: "黒い十字の刃がまっすぐ走り、<b>敵を貫通しながら通り道の敵すべてに十字の刻印</b>を刻む。"
      + "刃は<b>壁で" + YUUKA_BOUNCE + "回まで折り返す</b>ので、1本の線では届かない敵にも回りこむ。"
      + "<br>そして刃が走りきった瞬間、<b>刻んだ十字がいっせいに起爆</b>する。"
      + "<br>いちばんのちがいは<b>刻印の数が多いほど、1つあたりの威力も上がる</b>こと"
      + "（1つ増えるごとに全部へ +" + YUUKA_STEP + "・" + YUUKA_CAP + "つぶんまで）。"
      + "" + YUUKA_CAP + "体を1本の線に通せたときは、1つあたり<b>攻撃力×"
      + (YUUKA_BOOM_PER + YUUKA_STEP * (YUUKA_CAP - 1)).toFixed(2) + "</b>まで育つ——"
      + "<b>敵の並びを一直線に見つける</b>のが、そのまま火力になる技",
  },
  miyabi: {
    /* 木・貫通。孔雀の羽をまとう剣士。
       ★ 担当は<b>第七重（水 {mine,ward}）</b>＝ 超マインスイーパーEL＋アンチ断絶界。
         3つめの超アンチ減速壁で<b>第二重の減速壁</b>にも備える。 */
    id: "miyabi", nm: "ミヤビ", img: "Miyabi.webp", th: "t_Miyabi.webp",
    el: "wood", shot: "pierce", type: "翠孔雀分刃型", gacha: true, debut: true, lux: true, nexus: "tempo", star5: true,
    connect: "miyabi",
    hp: [971, 6410], atk: [558, 3536], spd: [308, 459],
    abil: [{ t: "supermsEL" }, { t: "award" }, { t: "superaslow" },
           { t: "defkillerM" }, { t: "houraikillerL" }, { t: "fbturnboost" }],
    subfs: "afterglowtrail",
    ssName: "ペイルペイオウ・センスウ", ssTurns: 17, ssKind: "sayaka",
    ssPow: "自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）＋ <b>味方全員を"
      + SAYAKA_PIERCE_ACTS + "回行動ぶん貫通化</b>",
    ssDesc: "孔雀の羽がひらき、<b>自強化（攻撃×" + SAYAKA_ATK + "・スピード×" + SAYAKA_SPD + "）</b>して斬りこむ。"
      + "<br>同時に<b>味方全員が" + SAYAKA_PIERCE_ACTS + "回行動ぶん貫通になる</b>"
      + "（サヤカの<b>ブルーストリーム</b>と同じしくみ）。反射の味方が壁とギミックをすり抜けられるので、"
      + "地雷と断絶界だらけの第七重で<b>盤面の通りかたそのものが変わる</b>。"
      + "<br><b>超マインスイーパーEL・アンチ断絶界・超アンチ減速壁</b>の3種持ち。"
      + "<b>超マインスイーパーEL＋アンチ断絶界</b>が<b>第七重（水）の必要アンチとぴったり一致</b>し、"
      + "余る<b>超アンチ減速壁</b>は第二重にもそのまま効く。"
      + "<br>キラーは<b>防御ダウンキラーM</b>（防御ダウン中の敵に×" + DEFKILLER_M_MUL + "）と<b>蓬莱族キラーL</b>。"
      + "防御ダウンを撒く味方（カリン・ミレーユ）と組むと、そこがそのまま追い打ちの枠になる。"
      + "<b>FBターンブースト</b>で倒すたび次のフルバーストが近づく。"
      + "<br>クロススキル<b>翠孔雀のクロス</b>（編成の4人が全員ちがう属性）で"
      + "<b>連撃キラーEL</b>と<b>ダッシュL</b>が付く——属性をばらけさせる編成のごほうび。",
    fsName: "ピーコックファン", fsKind: "peacockfan",
    fsPow: "羽根の刃 " + MIYABI_N0 + "枚 → 壁で分裂して最大" + (MIYABI_N0 * (2 ** MIYABI_SPLITS)) + "枚（1ヒット 攻撃力×"
      + MIYABI_PER + "・分裂ごとに×" + MIYABI_DECAY + "）",
    fsDesc: "ふれた味方から<b>扇のかたちに羽根の刃が" + MIYABI_N0 + "枚</b>広がる。"
      + "<br>いちばんのちがいは<b>壁に当たるたびに、羽根が2枚へ分かれて増える</b>こと"
      + "（" + MIYABI_N0 + "枚 → " + (MIYABI_N0 * 2) + "枚 → " + (MIYABI_N0 * 4) + "枚）。"
      + "分かれるたびに1枚あたりは×" + MIYABI_DECAY + "と軽くなるが、<b>枚数は倍</b>なので総量は増えていく。"
      + "<br>つまり<b>壁の多い盤面・せまい盤面ほど強い</b>——"
      + "四方を壁で囲まれた蓬莱の九重では、羽根が最後まで分裂しきる",
  },
  sumire: {
    /* 光・反射。陽だまりの聖域をひらく癒やし手。
       ★ 担当は<b>蓬莱天宮（闇 {grav,warp,slowwall}）</b>。
         ★★ 蓬莱天宮を属性有利のまま完全対応できるのは、ユイに続いて<b>2体目</b>。 */
    id: "sumire", nm: "スミレ", img: "Sumire.webp", th: "t_Sumire.webp",
    el: "light", shot: "bounce", type: "陽環聖域型", gacha: true, debut: true, lux: true, nexus: "mercy", star5: true,
    connect: "sumire",
    hp: [992, 6540], atk: [548, 3475], spd: [304, 450],
    abil: [{ t: "sgrav" }, { t: "superaw" }, { t: "superaslow" },
           { t: "firstkillerEL" }, { t: "houraikillerL" }, { t: "healM" }],
    subfs: "afterglowtrail",
    ssName: "ソレイユ・アウェイクン", ssTurns: 19, ssKind: "otoha",
    ssPow: "自強化（攻撃×" + OTOHA_ATK + "・スピード×" + OTOHA_SPD + "）＋ <b>画面上のすべての敵の弱点コアを"
      + OTOHA_WEAK_TURNS + "ターンひらく</b>",
    ssDesc: "陽だまりがひろがり、<b>自強化（攻撃×" + OTOHA_ATK + "・スピード×" + OTOHA_SPD + "）</b>して跳ね出す。"
      + "<br>同時に<b>画面上のすべての敵の弱点コアが" + OTOHA_WEAK_TURNS + "ターンひらく</b>"
      + "（オトハの<b>フランメ・ソナタ</b>と同じしくみ）。"
      + "弱点は<b>味方全員のダメージ</b>に効くので、チームまるごとの火力が上がる。"
      + "<br><b>超アンチ重力バリア・超アンチワープ・超アンチ減速壁</b>の3種持ち。"
      + "この3つは<b>蓬莱天宮（闇 {重力バリア・ワープ・減速壁}）の必要アンチとぴったり一致</b>する——"
      + "★ 天宮を<b>有利属性のまま完全対応</b>できるのは、ユイに続いて2体目。"
      + "<br><b>超アンチワープ</b>は画面上のワープ1つにつき攻撃・スピードが上がるので、"
      + "ワープの多い天宮ではそのまま火力になる。"
      + "キラーは<b>ファーストキラーEL</b>（そのショットで最初にふれた敵に×" + FIRSTKILLER_EL_MUL + "）と"
      + "<b>蓬莱族キラーL</b>——ひらいた弱点へ最初の一発を当てる撃ちかたと噛み合う。"
      + "<b>回復M</b>で削り合いを支える。"
      + "<br>クロススキル<b>菫花のクロス</b>（自分と同じ属性の味方が1体もいない）で"
      + "<b>パワーオーラEL</b>と<b>FBターンブースト</b>が付く——光を自分ひとりにする編成のごほうび。",
    fsName: "ソレイユサンクタム", fsKind: "sunsanctum",
    fsPow: "光の矢 " + SUMIRE_TICKS + "回（半径 " + SUMIRE_R + "・1本 攻撃力×" + SUMIRE_PER
      + "、その敵が<b>失っているHPの割合ぶん最大2倍</b>まで伸びる）",
    fsDesc: "ふれた味方のいる場所に<b>陽だまりの聖域</b>がひらき、"
      + "中にいる敵へ光の矢が" + SUMIRE_TICKS + "回にわけて降りそそぐ。"
      + "<br>いちばんのちがいは<b>1本ごとの威力が、その敵の「削れぐあい」で変わる</b>こと。"
      + "満タンの敵には攻撃力×" + SUMIRE_PER + "だが、<b>HPを失っているほど重くなり、瀕死の敵には最大2倍</b>まで伸びる。"
      + "<br>つまり<b>あとに降る矢ほど強い</b>——同じ敵を撃ち続けるほど加速していくので、"
      + "HPの大きいボスほど後半の伸びが大きい",
  },
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-26 MagiLex の KP交換キャラ 4体（No.153〜156）
     ------------------------------------------------------------
     ご指定:
       ・オムニアンチ・治癒の祈りは持たない／アンチは2つまで／クロススキルなし
       ・アビリティは6つまで／キラーは2つまで（蓬莱族キラーもキラーに数える）
       ・それぞれ蓬莱の九重の<b>有利属性のクエストで最適解</b>になるように
       ・ネクサススキルは<b>通常のキャラより強いもの</b>（アカデミー・◯◯）
     ★ 5体（ミズキをふくむ）は<b>ガチャからは出ない</b>。MagiLex の KP交換所でだけ手に入る。
       ＝ PREMIUM_CHARS にも DEBUT_VERSIONS にも FESTS にも入れないこと。
     ★ 5体とも共通サブリンク<b>ノウレッジ・レゾナンス</b>を持つ。
     ══════════════════════════════════════════════════════════════ */
  kanade: {
    /* 光・反射。学びの鐘を鳴らす少女。
       ★ 担当は<b>第五重（闇 {ward,warp}）</b>＝ アンチ断絶界＋超アンチワープの<b>2種ちょうど</b>。 */
    id: "kanade", nm: "カナデ", img: "Kanade.webp", th: "t_Kanade.webp",
    el: "light", shot: "bounce", type: "鐘光共鳴型", lux: true, reward: true, lexchar: true, nexus: "lexbond", star5: true,
    hp: [984, 6490], atk: [552, 3500], spd: [306, 454],
    abil: [{ t: "award" }, { t: "superaw" },
           { t: "weakkillerEL" }, { t: "houraikillerL" }, { t: "healM" }, { t: "fbturnboost" }],
    subfs: "knowledgeresonance",
    ssName: "カリヨン・オブ・ソフィア", ssTurns: 16, ssKind: "akari",
    ssPow: "自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）＋ <b>味方全員のフルバーストターンを"
      + AKARI_FB_CUT + "進める</b>",
    ssDesc: "学びの鐘が鳴りわたり、<b>自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）</b>して跳ね出す。"
      + "<br>同時に<b>味方全員のフルバーストが" + AKARI_FB_CUT + "ターンぶん一気に進む</b>"
      + "（アカリの<b>ヴィリディス・ソレイユ</b>と同じしくみ）。強いフルバーストを持つ味方と組むほど火力になる。"
      + "<br><b>アンチ断絶界・超アンチワープ</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第五重（闇）の必要アンチとぴったり一致</b>する。"
      + "<b>超アンチワープ</b>は画面上のワープ1つにつき攻撃・スピードが上がるので、"
      + "ワープの多い第五重ではそのまま火力になる。"
      + "<br>キラーは<b>弱点キラーEL（×" + WEAKKILLER_EL_MUL + "）</b>と<b>蓬莱族キラーL</b>。"
      + "<b>回復M</b>と<b>FBターンブースト</b>で、チームを回しながら支える。"
      + "<br>★ ネクサスは<b>アカデミー・ボンド</b>——リンクスキル・サブリンクのダメージが<b>13%</b>アップする。"
      + "ふつうのボンド・ネクサス（6%）の約2倍で、リンクを撃たせる編成のかなめになる。",
    fsName: "セイクリッドヘイロー", fsKind: "sacredhalo",
    fsPow: "光の輪 内・外の2重 1ヒット 攻撃力×" + YUI_RING_PER + "（広がりながら多段ヒット）＋ "
      + "広がりきった瞬間 <b>画面上のすべての敵へ光の柱</b> 攻撃力×" + YUI_PILLAR_PER,
    fsDesc: "<b>光の輪が2重にひらき、回りながらだんだん大きく広がっていく</b>。"
      + "内側の輪と外側の輪は<b>逆向きに回る</b>ので、輪と輪のあいだにいる敵には交互に当たり続ける。"
      + "<br>輪の上ならどこにふれてもヒットし、<b>同じ敵にも間をおいて何度でも</b>入る多段型。"
      + "<br>そして輪が画面のはしまで広がりきった瞬間、<b>画面上のすべての敵の頭上へ光の柱</b>が落ちる"
      + "（攻撃力×" + YUI_PILLAR_PER + "）。逃げた敵にも必ず1発届く",
  },
  homura: {
    /* 火・貫通。真夏の砂浜を歩く紅蓮の少女（水着）。
       ★ 担当は<b>第三重（木 {dw,ward}）</b>＝ 超ADW＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "homura", nm: "ホムラ", img: "Homura.webp", th: "t_Homura.webp",
    el: "fire", shot: "pierce", type: "灼夏雷撃型", lux: true, reward: true, lexchar: true, swim: true, nexus: "lexignition", star5: true,
    hp: [966, 6385], atk: [564, 3572], spd: [307, 457],
    abil: [{ t: "superadw" }, { t: "award" },
           { t: "sokojikaraEL" }, { t: "houraikillerL" }, { t: "fbaccel" }, { t: "barrierEL" }],
    subfs: "knowledgeresonance",
    ssName: "サマーインフェルノ・ボルト", ssTurns: 18, ssKind: "roxy",
    ssPow: "<b>自分のHPを" + Math.round(ROXY_HP_COST * 100) + "%支払い</b>、自強化（攻撃×" + ROXY_ATK
      + "・スピード×" + ROXY_SPD + "）＋ <b>画面上のすべての敵へ落雷（最大HPの"
      + Math.round(ROXY_MAXHP_CUT * 100) + "%）＋防御ダウン・毒・遅延（" + ROXY_DEBUFF_TURNS + "ターン）</b>",
    ssDesc: "夏空が急に暗くなり、<b>自分のHPを" + Math.round(ROXY_HP_COST * 100) + "%支払って</b>雷雲を呼ぶ。"
      + "<br><b>自強化（攻撃×" + ROXY_ATK + "・スピード×" + ROXY_SPD + "）</b>して走り出したあと、"
      + "<b>画面上のすべての敵へ落雷</b>が落ちる（ロキシーの<b>サンダーレイン</b>と同じしくみ）。"
      + "落雷は<b>その敵の最大HPの" + Math.round(ROXY_MAXHP_CUT * 100) + "%</b>を削り、"
      + "あわせて<b>防御ダウン・毒・攻撃ターン遅延</b>が" + ROXY_DEBUFF_TURNS + "ターン入る。"
      + "<br>HPを払うのは危ないようでいて、<b>底力EL</b>（チームHPが50%以下で与ダメージ×"
      + SOKOJIKARA_EL_MUL + "）を<b>自分から発動させる</b>ためのもの——<b>払った直後がいちばん強い</b>。"
      + "<br><b>超アンチダメージウォール・アンチ断絶界</b>の2種持ちで、"
      + "この組み合わせは<b>蓬莱の九重・第三重（木）の必要アンチとぴったり一致</b>する。"
      + "<b>バリアEL</b>があるので、HPを払っても持ちこたえられる。"
      + "<br>★ ネクサスは<b>アカデミー・イグニッション</b>——バトル開始時に味方全員のフルバーストターンを"
      + "<b>2</b>短縮する（ふつうのイグニッションの2倍）。開幕からフルバーストが早い。",
    fsName: "クロスフレイムノヴァ", fsKind: "crossflamenova",
    fsPow: "十字の極太レーザー 攻撃力×" + GUREN_CROSS_PER + "（縦・横で別に当たる）＋ <b>中心の大爆発</b> 攻撃力×" + GUREN_NOVA_PER,
    fsDesc: "持ち主を中心に<b>縦と横へ極太の炎の帯</b>が走る。縦と横は<b>別々に当たる</b>ので、"
      + "交点にいる敵には2回入る。<br>そのすこしあとに<b>中心で大爆発</b>が起き、"
      + "半径 " + GUREN_NOVA_R + " のなかにいる敵をまとめて焼く（攻撃力×" + GUREN_NOVA_PER + "）。"
      + "<b>近いほど強い</b>ので、敵の集まっているところで撃たせるのがいちばん伸びる",
  },
  yoizuki: {
    /* 水・反射。夜明けのプールにたたずむ氷雪の少女（水着）。
       ★ 担当は<b>第六重（火 {mine,slowwall}）</b>＝ 超マインスイーパーEL＋超アンチ減速壁の<b>2種ちょうど</b>。 */
    id: "yoizuki", nm: "ヨイヅキ", img: "Yoizuki.webp", th: "t_Yoizuki.webp",
    el: "water", shot: "bounce", type: "氷夜掃滅型", lux: true, reward: true, lexchar: true, swim: true, nexus: "lexaegis", star5: true,
    hp: [989, 6520], atk: [549, 3480], spd: [310, 463],
    abil: [{ t: "supermsEL" }, { t: "superaslow" },
           { t: "manyfoeEL" }, { t: "houraikillerL" }, { t: "soulEL" }, { t: "dashL" }],
    subfs: "knowledgeresonance",
    ssName: "アイスヴェール・ミッドナイト", ssTurns: 15, ssKind: "koyuki",
    ssPow: "自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）＋ <b>ふれた敵を毒（"
      + KOYUKI_POISON_TURNS + "ターン）</b>",
    ssDesc: "凍りついた夜の帳がおり、<b>自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）</b>して跳ね出す。"
      + "<br>このショットで<b>ふれた敵はすべて毒</b>になり、" + KOYUKI_POISON_TURNS + "ターンのあいだ削られ続ける"
      + "（コユキの<b>ナイトキャット・ヴェノム</b>と同じしくみ）。反射なので何度も跳ねて、<b>広くばら撒ける</b>。"
      + "<br><b>超マインスイーパーEL・超アンチ減速壁</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第六重（火）の必要アンチとぴったり一致</b>する。"
      + "<br>キラーは<b>敵多底力EL</b>（画面上の敵が" + FEWFOE_N + "体より多いとき与ダメージ×"
      + MANYFOE_EL_MUL + "）と<b>蓬莱族キラーL</b>——雑魚の多い第六重ではほぼ常に乗りつづける。"
      + "<b>ソウルスティールEL</b>で倒すたびに回復し、<b>ダッシュL</b>で1ショットの距離が伸びる。"
      + "<br>★ ネクサスは<b>アカデミー・イージス</b>——バトル開始時に味方全員へ<b>900</b>のバリアを張る"
      + "（ふつうのイージス・ネクサスの約2倍）。開幕の事故がそのまま減る。",
    fsName: "タイダルサージ", fsKind: "tidalsurge",
    fsPow: "碧い大波 " + YUUNA_WAVES + "回（1回 攻撃力×" + YUUNA_PER + "・盤面を横切る）",
    fsDesc: "ふれた味方の位置から<b>碧い大波が盤面を横切って走る</b>。波は" + YUUNA_WAVES + "回くり返し押し寄せ、"
      + "そのたびに<b>波にふれている敵すべて</b>に入る。"
      + "<br>波は敵を貫通し、<b>1回ごとに当たり判定を作り直す</b>ので、同じ敵にも" + YUUNA_WAVES + "回まで入る",
  },
  sumika: {
    /* 闇・貫通。紫の宵に咲く花のような少女（水着）。
       ★ 担当は<b>第九重（光 {slowwall,ward}）</b>＝ 超アンチ減速壁＋アンチ断絶界の<b>2種ちょうど</b>。 */
    id: "sumika", nm: "スミカ", img: "Sumika.webp", th: "t_Sumika.webp",
    el: "dark", shot: "pierce", type: "紫宵穿命型", lux: true, reward: true, lexchar: true, swim: true, nexus: "lexvigor", star5: true,
    hp: [975, 6435], atk: [561, 3552], spd: [305, 452],
    abil: [{ t: "superaslow" }, { t: "award" },
           { t: "vitalEL" }, { t: "houraikillerL" }, { t: "laserstopM" }, { t: "drainM" }],
    subfs: "knowledgeresonance",
    ssName: "ヴィオラナイト・オルタンシア", ssTurns: 17, ssKind: "scarlet",
    ssPow: "自強化（攻撃×" + SCARLET_ATK + "・スピード×" + SCARLET_SPD + "）＋ <b>チームHPを"
      + Math.round(SCARLET_HEAL * 100) + "%回復</b> ＋ <b>ふれた敵の攻撃ターンを+" + SCARLET_DELAY + "遅延</b>",
    ssDesc: "紫の宵が咲きひらき、<b>自強化（攻撃×" + SCARLET_ATK + "・スピード×" + SCARLET_SPD + "）</b>して駆け抜ける。"
      + "<br>撃った瞬間に<b>チームHPが" + Math.round(SCARLET_HEAL * 100) + "%回復</b>し、"
      + "このショットで<b>ふれた敵の攻撃ターンが+" + SCARLET_DELAY + "遅れる</b>"
      + "（スカーレットの<b>アズールティア・レクイエム</b>と同じしくみ）。"
      + "<b>立て直しと時間かせぎを1回でこなす</b>フルバースト。"
      + "<br><b>超アンチ減速壁・アンチ断絶界</b>の2種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第九重（光）の必要アンチとぴったり一致</b>する。"
      + "<br>キラーは<b>バイタルキラーEL</b>（残りHPが50%以上の敵に×" + VITALEL_MUL + "）と<b>蓬莱族キラーL</b>——"
      + "第九重はボスのHPがとくに重い層なので、<b>入りぎわのいちばん長い時間</b>ずっと乗り続ける。"
      + "<b>超レーザーストップM</b>でレーザーを止め、<b>ドレインM</b>で削りながら戻す。"
      + "<br>★ ネクサスは<b>アカデミー・ヴィガー</b>——チームの最大HPが<b>11%</b>アップする"
      + "（ふつうのヴィガー・ネクサスの約2倍）。第九重・天宮のような重い層でそのまま生存に効く。",
    fsName: "ノワールスパイラル", fsKind: "noirspiral",
    fsPow: "闇の螺旋 1ヒット 攻撃力×" + MOMO_PER + "（貫通・広がりながら回る）",
    fsDesc: "ふれた味方から<b>闇の螺旋</b>が生まれ、回りながらだんだん外へ広がっていく。"
      + "<br>螺旋の腕は敵を貫通し、<b>回るたびに同じ敵にも当たり直す</b>。"
      + "近くの敵には早く・何度も、遠くの敵にはあとから当たる",
  },
  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-26b GRAND DEBUT GACHA Ver.4.0 限定SSR 5体（No.157〜161）
     ------------------------------------------------------------
     ご指定:
       ・5体ともオムニアンチ・治癒の祈りなし／アンチ<b>3つまで</b>／
         クロススキルあり／キラー<b>3つ</b>（蓬莱族キラー・底力・パワーオーラも数える）
       ・それぞれ蓬莱の九重の<b>有利属性で最適解</b>になるように
       ・ガチャキャラの中でも<b>上澄みの尖った性能</b>
     ★ 担当は「有利属性で完全対応できるキャラが少ない階層」から埋めた（実測ずみ）:
       第一重 3体／第二重 3体／蓬莱天宮 3体 が最も手薄で、第八重 5体がそれに次ぐ。
       → シヅキ=第一重／サラ=第二重／サクヤ=蓬莱天宮／セイナ=第八重／サユキ=第四重。
     ★ 5体とも共通サブリンク<b>ブルーミング・エコー</b>を持つ（この版の目印）。
     ★★ 新しいリンクスキルには<b>「超強」を付けない</b>（ご指定）。
     ══════════════════════════════════════════════════════════════ */
  seina: {
    /* 火・貫通。紅い薔薇に囲まれた会長室の主。
       ★ 担当は<b>第八重（木 {dw,mine,grav}）</b>＝ 超ADW＋超マインスイーパーEL＋超アンチ重力バリアの<b>3種ちょうど</b>。 */
    id: "seina", nm: "セイナ", img: "Seina.webp", th: "t_Seina.webp",
    el: "fire", shot: "pierce", type: "紅薔薇円舞型", gacha: true, debut: true, lux: true, nexus: "force", star5: true,
    connect: "seina",
    hp: [970, 6400], atk: [570, 3610], spd: [306, 454],
    abil: [{ t: "superadw" }, { t: "supermsEL" }, { t: "sgrav" },
           { t: "gravkillerEL" }, { t: "houraikillerL" }, { t: "barrierEL" }],
    subfs: "bloomingecho",
    ssName: "クリムゾン・ブロッサムレイン", ssTurns: 16, ssKind: "hinata",
    ssPow: "自強化（攻撃×" + HINATA_ATK + "・スピード×" + HINATA_SPD + "）＋ <b>画面上のすべての敵へ紅の花柱（1本 攻撃力×"
      + HINATA_PILLAR_MUL + "・火属性）</b>",
    ssDesc: "部屋じゅうの紅薔薇が舞い上がり、<b>自強化（攻撃×" + HINATA_ATK + "・スピード×" + HINATA_SPD + "）</b>して撃ち出す。"
      + "<br>同時に<b>画面上のすべての敵の頭上へ紅の花柱</b>が落ちる"
      + "（1本あたり攻撃力×" + HINATA_PILLAR_MUL + "・火属性。ヒナタの<b>オーロラ・ドーン</b>と同じしくみ）。"
      + "壁のむこうへ隠れた敵にも必ず1本届くので、<b>散らばった敵をまとめて削れる</b>。"
      + "<br><b>超アンチダメージウォール・超マインスイーパーEL・超アンチ重力バリア</b>の3種持ち。"
      + "この組み合わせは<b>蓬莱の九重・第八重（木）の必要アンチとぴったり一致</b>する——"
      + "第八重は必要アンチが3種あるため、有利属性で完全対応できるキャラがまだ少ない層。"
      + "<br>キラーは<b>重力バリアキラーEL（×" + GRAVKILLER_EL_MUL + "）</b>と<b>蓬莱族キラーL</b>。"
      + "第八重は<b>敵が重力バリアを張ってくる</b>ので、消したうえに特攻が乗る形になる。"
      + "<b>バリアEL</b>で前にも出られる。"
      + "<br>クロススキル<b>紅薔薇のクロス</b>（自分がチームでいちばん攻撃力が高い）で"
      + "<b>底力EL</b>と<b>ダッシュL</b>が付く——押されるほど重くなり、走る距離も伸びる。",
    fsName: "クリムゾンワルツ", fsKind: "crimsonwaltz",
    fsPow: "紅の旋風 " + CRIMSON_TICKS + "段（1段 攻撃力×" + CRIMSON_PER + "・半径 " + CRIMSON_R
      + "）＋ <b>次のターンの初めに、同じ場所でもう一度</b>",
    fsDesc: "ふれた味方を中心に<b>紅い旋風</b>が立ちのぼり、" + CRIMSON_TICKS + "段にわたって輪を広げながら削る。"
      + "<br>いちばんのちがいは<b>次のターンが始まったとき、同じ場所でもう一度おなじ旋風が起こる</b>こと。"
      + "<b>ターンをまたいで効くリンクスキルはこれがはじめて</b>。"
      + "<br>だから<b>撃ったあとに敵が寄ってきても、2回目でちゃんと当たる</b>。"
      + "敵が動いてくる盤面ほど、置いておく価値が出る技",
  },
  shiduki: {
    /* 水・反射。窓辺の蒼い薔薇。
       ★ 担当は<b>第一重（火 {dw,grav}）</b>＝ 超ADW＋超アンチ重力バリア。3つめのアンチ断絶界で第三重にも備える。 */
    id: "shiduki", nm: "シヅキ", img: "Shiduki.webp", th: "t_Shiduki.webp",
    el: "water", shot: "bounce", type: "蒼薔薇降雨型", gacha: true, debut: true, lux: true, nexus: "guard", star5: true,
    connect: "shiduki",
    hp: [990, 6530], atk: [553, 3505], spd: [310, 463],
    abil: [{ t: "superadw" }, { t: "sgrav" }, { t: "award" },
           { t: "fewfoeEL" }, { t: "houraikillerL" }, { t: "regenL" }],
    subfs: "bloomingecho",
    ssName: "アズールローズ・レクイエム", ssTurns: 18, ssKind: "scarlet",
    ssPow: "自強化（攻撃×" + SCARLET_ATK + "・スピード×" + SCARLET_SPD + "）＋ <b>チームHPを"
      + Math.round(SCARLET_HEAL * 100) + "%回復</b> ＋ <b>ふれた敵の攻撃ターンを+" + SCARLET_DELAY + "遅延</b>",
    ssDesc: "窓辺の蒼い薔薇がひらき、<b>自強化（攻撃×" + SCARLET_ATK + "・スピード×" + SCARLET_SPD + "）</b>して滑り出す。"
      + "<br>撃った瞬間に<b>チームHPが" + Math.round(SCARLET_HEAL * 100) + "%回復</b>し、"
      + "このショットで<b>ふれた敵の攻撃ターンが+" + SCARLET_DELAY + "遅れる</b>"
      + "（スカーレットの<b>アズールティア・レクイエム</b>と同じしくみ）。立て直しと時間かせぎを1回でこなす。"
      + "<br><b>超アンチダメージウォール・超アンチ重力バリア</b>が"
      + "<b>第一重（火）の必要アンチとぴったり一致</b>する。"
      + "★ 第一重は<b>有利属性で完全対応できるキャラがまだ3体しかいない</b>層。"
      + "3つめの<b>アンチ断絶界</b>は第三重・第七重でもそのまま効く。"
      + "<br>キラーは<b>敵少底力EL</b>（画面上の敵が" + FEWFOE_N + "体以下のとき与ダメージ×"
      + FEWFOE_EL_MUL + "）と<b>蓬莱族キラーL</b>——<b>ボスと護衛だけになる終盤</b>で一気に伸びる。"
      + "<b>リジェネL</b>で削り合いも支える。"
      + "<br>クロススキル<b>蒼薔薇のクロス</b>（自分より速い味方が2体以上）で"
      + "<b>弱点キラーEL</b>と<b>ドレインM</b>が付く——速い味方を前に置く編成のごほうび。",
    fsName: "ブルーローズ・レイン", fsKind: "bluerain",
    fsPow: "蒼い雨 " + BLUERAIN_N + "粒（1粒 攻撃力×" + BLUERAIN_PER
      + "）／<b>HPの高い敵ほど多くの粒が落ちる</b>",
    fsDesc: "ふれた味方の頭上から<b>蒼い薔薇の雨</b>が" + BLUERAIN_N + "粒ふりそそぐ。"
      + "<br>いちばんのちがいは<b>粒の行き先が「敵のHPの比」で決まる</b>こと。"
      + "HPの高い敵ほど多く落ち、<b>ボス1体だけなら" + BLUERAIN_N + "粒すべてがボスへ</b>集まる。"
      + "<br>ねらいを手で合わせなくても<b>いちばん重い敵に自動で寄る</b>ので、"
      + "護衛が残っていてもボスを押しきれる——雑魚に散らないのがこの技の強み",
  },
  sayuki: {
    /* 闇・貫通。紫の光に囲まれた夜のゲーム部屋。
       ★ 担当は<b>第四重（光 {grav,ward}）</b>＝ 超アンチ重力バリア＋アンチ断絶界。3つめの超アンチワープで第五重にも。 */
    id: "sayuki", nm: "サユキ", img: "Sayuki.webp", th: "t_Sayuki.webp",
    el: "dark", shot: "pierce", type: "夜想連刃型", gacha: true, debut: true, lux: true, nexus: "vanguard", star5: true,
    connect: "sayuki",
    hp: [974, 6425], atk: [566, 3588], spd: [309, 461],
    abil: [{ t: "sgrav" }, { t: "award" }, { t: "superaw" },
           { t: "killerEL", el: "light" }, { t: "houraikillerL" }, { t: "fbaccel" }],
    subfs: "bloomingecho",
    ssName: "ミッドナイト・ヴェノムプレイ", ssTurns: 14, ssKind: "koyuki",
    ssPow: "自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）＋ <b>ふれた敵を毒（"
      + KOYUKI_POISON_TURNS + "ターン）</b>",
    ssDesc: "紫の光が部屋いっぱいに散り、<b>自強化（攻撃×" + KOYUKI_ATK + "・スピード×" + KOYUKI_SPD + "）</b>して駆け抜ける。"
      + "<br>このショットで<b>ふれた敵はすべて毒</b>になり、" + KOYUKI_POISON_TURNS + "ターン削られ続ける"
      + "（コユキの<b>ナイトキャット・ヴェノム</b>と同じしくみ）。貫通なので<b>一直線に並んだ敵をまとめて毒にできる</b>。"
      + "<br><b>超アンチ重力バリア・アンチ断絶界</b>が<b>第四重（光）の必要アンチとぴったり一致</b>し、"
      + "3つめの<b>超アンチワープ</b>は第五重でもそのまま効く。"
      + "超アンチワープは<b>画面上のワープ1つにつき攻撃・スピードが上がる</b>ので、そのまま火力にもなる。"
      + "<br>キラーは<b>光属性キラーEL（×" + KILLER_EL_MUL + "）</b>と<b>蓬莱族キラーL</b>——"
      + "第四重の敵は光属性なので、属性有利と重ねて刺さる。<b>FBターンアクセル</b>で次の一手も早い。"
      + "<br>クロススキル<b>夜想のクロス</b>（編成の撃種がちょうど半々）で"
      + "<b>連撃キラーEL</b>と<b>FBターンブースト</b>が付く——貫通2・反射2の編成が、そのままごほうびになる。",
    fsName: "ヴォイド・コンボ", fsKind: "voidcombo",
    fsPow: "闇の刃 " + VOID_N0 + "本（1本 攻撃力×" + VOID_PER + "・貫通・壁で" + VOID_BOUNCE
      + "回反射）／<b>この技が出るたびに刃が1本増える</b>（最大" + (VOID_N0 + VOID_MAX_STEP) + "本）",
    fsDesc: "ふれた味方から<b>闇の刃</b>が扇状に走る。刃は敵を貫通し、壁で" + VOID_BOUNCE + "回まで折り返す。"
      + "<br>いちばんのちがいは<b>このバトルでこの技が出るたびに「段」が1つ上がり、刃が1本増える</b>こと"
      + "（" + VOID_N0 + "本 → 最大" + (VOID_N0 + VOID_MAX_STEP) + "本）。"
      + "<b>バトルを通して育っていくリンクスキルはこれがはじめて</b>。"
      + "<br>段は<b>WAVEをまたいでも保たれる</b>ので、長いクエストほど強くなる。"
      + "最初の1発は軽いが、<b>あとになるほど手がつけられなくなる</b>——積み上げる技",
  },
  sara: {
    /* 木・反射。四つ葉のクローバーを飾った明るい部屋。
       ★ 担当は<b>第二重（水 {dw,slowwall}）</b>＝ 超ADW＋超アンチ減速壁。3つめのアンチ断絶界で第七重にも備える。 */
    id: "sara", nm: "サラ", img: "Sara.webp", th: "t_Sara.webp",
    el: "wood", shot: "bounce", type: "翠葉幸運型", gacha: true, debut: true, lux: true, nexus: "scout", star5: true,
    connect: "sara",
    hp: [984, 6490], atk: [556, 3524], spd: [308, 458],
    abil: [{ t: "superadw" }, { t: "superaslow" }, { t: "award" },
           { t: "allkillerEL" }, { t: "houraikillerL" }, { t: "healM" }],
    subfs: "bloomingecho",
    ssName: "フォーリーフ・ミラクル", ssTurns: 17, ssKind: "akari",
    ssPow: "自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）＋ <b>味方全員のフルバーストターンを"
      + AKARI_FB_CUT + "進める</b>",
    ssDesc: "四つ葉のクローバーが光り、<b>自強化（攻撃×" + AKARI_ATK + "・スピード×" + AKARI_SPD + "）</b>して跳ね出す。"
      + "<br>同時に<b>味方全員のフルバーストが" + AKARI_FB_CUT + "ターンぶん一気に進む</b>"
      + "（アカリの<b>ヴィリディス・ソレイユ</b>と同じしくみ）。強いフルバーストを持つ味方と組むほど、そのまま火力になる。"
      + "<br><b>超アンチダメージウォール・超アンチ減速壁</b>が"
      + "<b>第二重（水）の必要アンチとぴったり一致</b>する。"
      + "★ 第二重も<b>有利属性で完全対応できるキャラがまだ3体しかいない</b>層。"
      + "3つめの<b>アンチ断絶界</b>は第七重でもそのまま効く。"
      + "<br>キラーは<b>全属性キラーEL（×" + ALLKILLER_EL_MUL + "）</b>と<b>蓬莱族キラーL</b>——"
      + "<b>相手の属性を選ばない</b>ので、どのクエストへ連れて行っても数字が落ちない。"
      + "<b>回復M</b>でチームも支える。"
      + "<br>★ ネクサスは<b>スカウト・ネクサス</b>——ハート・剣・砂時計などの<b>アイテムが出やすく</b>なる。"
      + "四つ葉のクローバーらしい、運を引き寄せるリーダー効果。"
      + "<br>クロススキル<b>四つ葉のクロス</b>（編成の4人の戦型がすべてちがう）で"
      + "<b>パワーオーラEL</b>と<b>全属性耐性M</b>が付く——役割をばらけさせた編成のごほうび。",
    fsName: "クローバー・フォーチュン", fsKind: "cloverfortune",
    fsPow: "翠の葉 " + CLOVER_N0 + "枚（1枚 攻撃力×" + CLOVER_PER + "・貫通）／<b>1周で当たった数だけ次の周の葉が増える</b>"
      + "（最大" + CLOVER_MAX + "枚・" + CLOVER_ROUNDS + "周まで）",
    fsDesc: "ふれた味方から<b>四つ葉のかたちに翠の葉</b>が" + CLOVER_N0 + "枚のびる。"
      + "<br>いちばんのちがいは<b>その周で敵に当たった数だけ、次の周の葉が増える</b>こと。"
      + "当たれば当たるほど葉が増えて次の周が来る——<b>1枚も当たらなければ、そこで終わり</b>。"
      + "<br>つまり<b>ねらいが良いほど長く続く</b>。運まかせではなく、"
      + "敵の集まっているところで撃たせられたかどうかがそのまま結果になる技",
  },
  sakuya: {
    /* 光・反射。桜色の広間で笑う少女。
       ★ 担当は<b>蓬莱天宮（闇 {grav,warp,slowwall}）</b>。有利属性で完全対応できる3体目。 */
    id: "sakuya", nm: "サクヤ", img: "Sakuya.webp", th: "t_Sakuya.webp",
    el: "light", shot: "bounce", type: "桜暦残響型", gacha: true, debut: true, lux: true, nexus: "advantage", star5: true,
    connect: "sakuya",
    hp: [996, 6560], atk: [551, 3494], spd: [305, 452],
    abil: [{ t: "sgrav" }, { t: "superaw" }, { t: "superaslow" },
           { t: "weakkillerEL" }, { t: "houraikillerL" }, { t: "soulEL" }],
    subfs: "bloomingecho",
    ssName: "サクラ・ダブルスマイル", ssTurns: 19, ssKind: "elena",
    ssPow: "自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）＋ <b>撃った瞬間に味方全員で総攻撃</b>／"
      + "<b>止まったあと もう一度動き出し、そこでもう一度 総攻撃</b>",
    ssDesc: "広間いっぱいに桜が舞い、<b>自強化（攻撃×" + ELENA_ATK + "・スピード×" + ELENA_SPD + "）</b>して跳ね出す。"
      + "<br>撃った瞬間に<b>味方全員がいちばん近い敵へ突撃</b>し、"
      + "<b>自分が止まったあと もう一度ひとりでに動き出して、その2回目にも味方全員がもう一度突撃</b>する——"
      + "<b>1回のフルバーストで総攻撃が2回</b>入る（エレナの<b>アクア・ダブルレクイエム</b>と同じしくみ）。"
      + "<br><b>超アンチ重力バリア・超アンチワープ・超アンチ減速壁</b>の3種持ち。"
      + "この3つは<b>蓬莱天宮（闇 {重力バリア・ワープ・減速壁}）の必要アンチとぴったり一致</b>する——"
      + "★ 天宮を<b>有利属性のまま完全対応</b>できる3体目。"
      + "<b>超アンチワープ</b>は画面上のワープ1つにつき攻撃・スピードが上がるので、"
      + "ワープの多い天宮ではそのまま火力になる。"
      + "<br>キラーは<b>弱点キラーEL（×" + WEAKKILLER_EL_MUL + "）</b>と<b>蓬莱族キラーL</b>。"
      + "総攻撃2回で弱点を何度も踏めるので、噛み合いがとても良い。"
      + "<b>ソウルスティールEL</b>で倒すたびに回復する。"
      + "<br>★ ネクサスは<b>アドバンテージ・ネクサス</b>——<b>属性有利の倍率が 1.25 → 1.32</b> になる。"
      + "有利属性で殴りに行く蓬莱の九重では、チーム全体の数字がそのまま底上げされる。"
      + "<br>クロススキル<b>陽笑のクロス</b>（自分がチームでいちばんHPが高い）で"
      + "<b>バイタルキラーEL</b>と<b>超レーザーストップM</b>が付く——"
      + "HPのいちばん高い自分が前に出て、レーザーを受け止めながら殴る形になる。",
    fsName: "ペタル・エコー", fsKind: "petalecho",
    fsPow: "桜の花びら " + PETAL_TICKS + "回（1回 攻撃力×" + PETAL_PER + "・半径 " + PETAL_R + "）＋ "
      + "<b>そのあと" + Math.round(PETAL_WATCH / 60 * 10) / 10 + "秒のあいだに敵が受けたダメージの "
      + Math.round(PETAL_RATE * 100) + "% を、もう一度まとめて</b>",
    fsDesc: "ふれた味方を中心に<b>桜の花びらが" + PETAL_TICKS + "回にわけて舞い、まわりの敵を削る</b>。"
      + "<br>いちばんのちがいは<b>そのあと" + Math.round(PETAL_WATCH / 60 * 10) / 10 + "秒のあいだに敵が受けたダメージを覚えていて、"
      + "その" + Math.round(PETAL_RATE * 100) + "% を最後にもう一度まとめて返す</b>こと。"
      + "<b>与えたダメージそのものを写して返すリンクスキルはこれがはじめて</b>。"
      + "<br>だから<b>このリンクのあとに、いい一撃を入れられたショットほど跳ね上がる</b>。"
      + "フルバーストや強いリンクの直前に置くと、そのぶんがまるごと上乗せになる——"
      + "<b>順番を組み立てる楽しさ</b>がそのまま火力になる技",
  },
};
/* エルシアのフルバースト説明は定数を使うのでここで組み立てる */
CHARS.elsia.ssPow = "自強化（攻撃×1.6・スピード×1.2）＋ <b>残りチームHPの" + Math.round(ELSIA_HP_COST * 100) + "%を消費</b>し、"
  + "<b>最初にふれた敵へ「消費したHP × " + ELSIA_DMG_RATE + "」の大ダメージ</b>";
CHARS.elsia.ssDesc = "<b>聖光をまとって自強化（攻撃×1.6・スピード×1.2）</b>し、<b>残りチームHPの" + Math.round(ELSIA_HP_COST * 100) + "%を捧げて</b>、"
  + "<b>そのショットで最初にふれた敵に「捧げたHP×" + ELSIA_DMG_RATE + "」のダメージ</b>を叩き込む。"
  + "<b>HPが多いほど威力が上がる</b>諸刃のフルバースト（HPが1未満になることはない）。";
/* ══════════ キャラクター番号（No.）と並び順 ══════════
   ★ v14: 「初期キャラ → 登場順（ガチャ・降臨・報酬すべて含む）」で通し番号を振り、
     図鑑・編成・育成・マルチの既定の並び（＝図鑑順）をこの番号順にそろえた。
     この配列の並び＝そのまま No.1 から始まるキャラクター番号になる。
     新キャラを足すときは「いちばん最後に追記する」こと（既存の番号がずれないように）。 */
const CHAR_IDS = [
  /* ★ No.1〜19 2026-08-10 XEVAガチャ移行SR 19体（ガチャ統合）。
     ご指定どおり<b>番号を1番から</b>にしたので、以降の番号はそのぶん後ろへずれる。
     No. は表示と並び順だけに使う値なので、所持データやセーブには影響しない。 */
  "hina", "runa", "noa", "haruka", "shiona", "ede", "yuina", "ririka", "serina", "akane", "airi", "eruna", "kotoha", "mika", "mirea", "miyu", "nene", "rei", "rusia",
  /* ★ 2026-08-10 初期メンバー4体（ゼラ・アヤメ・レイラ・セリーヌ）は廃止しました。
     以降の番号は4つぶん前へ詰まります。 */
  /* No.5〜9  初期ガチャSSR */
  "ema", "sakura", "arisa", "kaguya", "cheryl",
  /* No.10〜12 EX降臨 */
  "aira", "shion", "viola",
  /* No.13〜15 XEVAガチャ連携SSR（★ 2026-08-16 A／Bシリーズの区分は廃止） */
  "mion", "kokona", "mao",
  /* No.16〜18 v7 プレミアムSSR */
  "bernica", "tsubaki", "alicia",
  /* No.19〜21 v8（ナツキ＝ガチャ／ミズキ＝MagiLex報酬／アヤカ＝CDK限定） */
  "natsuki", "mizuki", "ayaka",
  /* No.22〜24 v8 プレミアムSSR */
  "iroha", "shirayuki", "mashiro",
  /* No.25〜28 v9 プレミアムSSR */
  "hotaru", "koharu", "yuri", "rinne",
  /* No.29 幽冥の庭園 降臨 ／ No.30〜31 v10・v11 プレミアムSSR */
  "hecatia", "rezelia", "elsia",
  /* No.32〜33 v12 プレミアムSSR */
  "karina", "nephia",
  /* No.34〜38 v13 プレミアムSSR */
  "setsuna", "selene", "nazuna", "lilia", "revia",
  /* No.39〜43 v14 Nocturne Bloom Fest 限定SSR */
  "fiona", "milfy", "mabel", "abyss", "arche",
  /* No.44 v14.5 プレミアムSSR */
  "chloe",
  /* No.45〜46 v15 Luminous Summer Fest 限定SSR */
  "kaguyaalpha", "mionalpha",
  /* No.47〜52 v16 プレミアムSSR */
  "sheril", "fia", "lysera", "soleria", "beltia", "astera",
  /* No.53〜55 2026-08-05 プレミアムSSR */
  "nemu", "roselia", "shizuka",
  /* No.56〜58 2026-08-06 プレミアムSSR（冥花種キラー持ち） */
  "yuria", "altia", "liana",
  /* No.59 2026-08-06 プレミアムSSR（全敵ロックオンレーザー） */
  "solea",
  /* No.60 2026-08-07 Phantom Legend Fest 限定SSR（クロススキル持ち） */
  "yaju",
  /* No.61〜64 2026-08-07 プレミアムSSR 4体 */
  "iori", "noelle", "yukino", "reika",
  /* No.65 2026-08-07 幽冥の庭園 降臨（85WAVE踏破・蝕魔族のボス本人） */
  "dominia",
  /* No.66〜67 2026-08-08 プレミアムSSR 2体 */
  "nanami", "chitose",
  /* No.68〜71 2026-08-08 プレミアムSSR 4体 */
  "kaede", "rinon", "kokoro", "ange",
  /* No.72〜74 2026-08-08c プレミアムSSR 3体 */
  "kotone", "ran", "ceris",
  /* ★ No.75〜80 2026-08-10 XEVAガチャ移行SSR 6体（ガチャ統合） */
  "kotomi", "riko", "kaho", "nana", "rea", "rinonx",
  /* ★ No.96〜98 2026-08-11 プレミアムSSR 3体 */
  "shizuku", "yuunagi", "izumi",
  /* ★ No.99 2026-08-11 Luminous Summer Fest 限定SSR（シェリーα）。
     ★ 2026-08-12 ご指定により <b>No.99</b> へ移した（以前は No.96）。
       No. は表示と並び順だけに使う値なので、所持データやセーブには影響しない。 */
  "cherylalpha",
  /* ★ No.100 2026-08-11 Luminous Summer Fest 限定SSR（ココナα）。
     100体目の節目のキャラなので、番号がちょうど 100 になるようにここへ置いてある。
     ★ この下に新キャラを足すときは、これまでどおり<b>いちばん最後に追記</b>すること。 */
  "kokonaalpha",
  /* ★ No.101〜106 2026-08-12 蒼夏祭（Aoka Summer Fest）限定SSR 6体 */
  "fuka", "tsumugi", "suzuka", "karem", "mayu", "chizuru",
  /* ★ No.107 2026-08-12 蒼夏祭 限定SSR（セイラ）。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "seira",
  /* ★ No.108〜109 2026-08-16 プレミアムSSR 2体（アンナ・ツキノ） */
  "anna", "tsukino",
  /* ★ No.110〜115 2026-08-16b プレミアムSSR 6体
     （モエカ・スズハ・ヴィオレット・カナタ・トウカ・エレナ）。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "moeka", "suzuha", "violet", "kanata", "touka", "elena", "grace",
  /* ★ 2026-08-17k 蓬莱の九重の配布キャラ（ガチャからは出ないので PREMIUM_CHARS には入れない） */
  "youka", "youhi",
  /* ★ No.119〜126 2026-08-18 プレミアムSSR 8体
     （アルテミア・アスハ・ブレア・リリス・リラ・サツキ・サヨ・メルティ）。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "artemia", "asuha", "blair", "lilith", "lyra", "satsuki", "sayo", "melty",
  /* ★ No.127 2026-08-18 ロキシー。ご指定により<b>最終番号</b>。
     この下に足すときは、ロキシーより後ろへ（No.127 は動かさない）。 */
  "roxy",
  /* ★ No.128〜132 2026-08-20 GRAND DEBUT GACHA 新SSR 5体
     （ミレーユ・スカーレット・コユキ・アメリア・ミオ）。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "mirelle", "scarlet", "koyuki", "amelia", "mio",
  /* ★ No.133〜137 2026-08-22 Starlight Academy Fest 限定SSR 5体
     （オトハ・サヤカ・サユリ・アカリ・ヒナタ）。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "otoha", "sayaka", "sayuri", "akari", "hinata",
  /* ★ No.138〜142 2026-08-24 GRAND DEBUT GACHA Ver.2.0 新SSR 5体
     （グレン・ユウナ・モモ・チハヤ・ユイ）。
     ★★ 2026-08-25 <b>ここに足しわすれていた</b>。CHAR_IDS に無いと
       charNo() が 999 を返し、図鑑・詳細・ガチャ結果の「No.」が出ないうえ、
       図鑑の並び（＝No.順）にも現れない＝「引いたのにどこにも居ない」ように見える。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "guren", "yuuna", "momo", "chihaya", "yui",
  /* ★ No.143〜147 2026-08-25 Starlight Academy Fest 2 限定SSR 5体
     （スズネ・ミナモ・カレン・トモエ・ヒマリ）。
     ★★ ここに無いと charNo() が 999 を返し、No. が出ないうえ
       <b>図鑑の並び（＝No.順）にも現れない</b>＝「引いたのにどこにも居ない」ように見える。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "suzune", "minamo", "karen", "tomoe", "himari",
  /* ★ No.148〜152 2026-08-26 GRAND DEBUT GACHA Ver.3.0 限定SSR 5体
     （カリン・ミレイ・ユウカ・ミヤビ・スミレ）。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "karin", "mirei", "yuuka", "miyabi", "sumire",
  /* ★ No.153〜156 2026-08-26 MagiLex の KP交換キャラ 4体
     （カナデ・ホムラ・ヨイヅキ・スミカ）。ミズキは No.35 のまま（上方修正のみ）。
     ★ ガチャからは出ないが「持てるキャラ」なので、図鑑の番号は付ける。 */
  "kanade", "homura", "yoizuki", "sumika",
  /* ★ No.157〜161 2026-08-26b GRAND DEBUT GACHA Ver.4.0 限定SSR 5体
     （セイナ・シヅキ・サユキ・サラ・サクヤ）。
     ★ 新キャラは必ず<b>いちばん最後に追記</b>すること（既存の No. がずれないように）。
     ★ xeva.js の MB_CHAR_MASTER も同じ並びにそろえること（並び＝No.）。 */
  "seina", "shiduki", "sayuki", "sara", "sakuya",
];
/* id → キャラクター番号（1始まり）。図鑑・詳細・ガチャ結果に「No.XX」として出す */
const CHAR_NO = {};
CHAR_IDS.forEach((id, i) => { CHAR_NO[id] = i + 1; });
function charNo(id) { return CHAR_NO[id] || 999; }
/* No. の表示用（No.07 のようにゼロ詰め2桁） */
function charNoText(id) { const n = charNo(id); return "No." + (n < 10 ? "0" + n : n); }
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-07 登場前のキャラを「完全に伏せる」しくみ
   ・フェスの openAt（＝ガチャの開催日時）が来るまでは、そのフェス限定キャラを
     <b>名前も画像もどこにも出さない</b>。バナー・図鑑・提供割合・対応キャラさがし・
     新キャラ告知のすべてが、この charSecret() ひとつを見て切り替わる。
   ・伏せかたは「画像はシルエット（.silh）＋名前は ??? 」でそろえる。
   ・解禁の判定は<b>ローカル時刻で秒まで</b>（beforeOpen）。時刻が来れば、
     なにもしなくても次の描画から名前と画像が出る。
   ★ すでに持っているキャラは伏せない（CDKなどで先に配ることがあるため）。
   ══════════════════════════════════════════════════════════════ */
function charOpenAt(id) {
  const c = CHARS[id]; if (!c) return "";
  if (c.openAt) return c.openAt;                 // キャラ個別に指定があればそれが優先
  const k = fesKeyOf(id);                        // フェス限定なら、そのフェスの開催日時
  const f = k && FESTS[k];
  return (f && f.openAt) || "";
}
function charSecret(id) { return !DB.chars[id] && beforeOpen(charOpenAt(id)); }
/* 伏せているあいだの表示（名前・No.）。伏せていなければそのまま返す */
function charNmOf(id) { return charSecret(id) ? "???" : ((CHARS[id] && CHARS[id].nm) || ""); }
function charNoOf(id) { return charSecret(id) ? "No.??" : charNoText(id); }
/* <img> に付けるクラス（伏せているあいだはシルエット） */
function charSilh(id) { return charSecret(id) ? " silh" : ""; }
/* SSRかどうか（ガチャ／EX降臨／報酬／限定／庭園降臨／フェスはSSR。初期メンバーだけがSR） */
/* SSRかどうか。
   ★ 2026-08-04: <b>ガチャで引けるキャラだけ</b>をSSRにした。
     以前は降臨（EXのアイラ・シオン・ヴィオラ）・庭園のヘカーティア・報酬のミズキ・
     CDKのアヤカまでSSR扱いだったので、SSRが46体中42体になってしまい、
     「SSR」がレア度を表さなくなっていた。
     クエストを周回すれば必ず手に入るキャラはSR、引き当てるキャラがSSR、という線引きにする。
     ＝ EXキャラなどガチャ以外のキャラはSSRではない。
   ★ 2026-08-07: ただし<b>ガチャSSRと同格まで性能を引き上げたキャラ</b>だけは例外にする。
     EX降臨の<b>アイラ</b>（降臨★15）・幽冥の庭園の<b>ヘカーティア</b>（20WAVE）・
     <b>ドミニア</b>（80WAVE）の3体は、ステータスもアビリティもガチャSSRと同じ帯なので、
     キャラ側に <b>star5: true</b> を書いてSSRとして扱う（ここを見る場所はこの関数だけ）。 */
function isStar5(id) {
  const c = CHARS[id]; if (!c) return false;
  return !!(c.gacha || c.fes || c.star5);
}
/* 限界突破MAXの金演出クラス。SRは「金の縁取りだけ」で発光させない（v14） */
/* ★ 2026-08-12 限界突破MAXの見た目は<b>SSRだけ</b>にした。
   SRは金の縁取りだけ残していたが、それも演出のうちなので付けない
   （＝SR完凸はふつうのカードと同じ見た目。凸の数はバッジと詳細で分かる）。 */
function mxClass(id, awk) { return ((awk || 0) >= MAX_AWK && isStar5(id)) ? "maxawk" : ""; }
/* 画像は img/ フォルダにまとめている。データ内のファイル名に img/ を付与 */
/* ★ 2026-08-10 キャラ画像は XEVARION 直下の img/ に集約した（形式は WebP に統一）。
   MagiBurst は1階層下なので "../img/" を見る。ここ1か所でぜんぶ切り替わる。 */
const IMGD = (typeof window !== "undefined" && window.MB_IMGD) ? window.MB_IMGD : "../img/";
/* ══ ★ 2026-08-12 画像フォルダを2つに分けた ══
   ・IMGD  … <b>キャラクターの絵だけ</b>を置くフォルダ（XEVARION/img/）。
     ポータルの図鑑・ガチャ・アカウントアイコンからも読むので、XEVARION 直下に置く。
   ・GIMGD … <b>MagiBurst のゲームで使う絵</b>（バナー・戦闘背景・敵・FBの絵）を置くフォルダ
     （XEVARION/MagiBurst/img/）。MagiBurst でしか使わないものをキャラの絵と混ぜない。
   MagiBurst からは "img/"、ポータルからは "MagiBurst/img/" になる（mb-boot.js が渡す）。
   ★ ゲーム用の絵を足すときは GIMGD 側（または mbImgPath を通す "../img/…" 表記）を使うこと。 */
const GIMGD = (typeof window !== "undefined" && window.MB_GIMGD) ? window.MB_GIMGD : "img/";
/* ガチャSSRのピックアップバナー */
CHARS.kaguya.aa = "KaguyaAA.webp"; CHARS.ema.aa = "EmaAA.webp"; CHARS.cheryl.aa = "CherylAA.webp";
CHARS.mion.aa = "MionAA.webp"; CHARS.kokona.aa = "KokonaAA.webp"; CHARS.mao.aa = "MaoAA.webp";
/* 新4体はバナー画像を作っていないので、上部バナーは共通プレミアムバナーを使う（aa未設定でOK） */
Object.values(CHARS).forEach((c) => { ["img", "th", "aa"].forEach((k) => { if (c[k] && !c[k].startsWith(IMGD)) c[k] = IMGD + c[k]; }); });
/* v6.6: 全キャラのHPを一律で少し底上げ（長く戦えるように） */
const HP_MUL = 1.15;
Object.values(CHARS).forEach((c) => { c.hp = [Math.round(c.hp[0] * HP_MUL), Math.round(c.hp[1] * HP_MUL)]; });
/* ★ 2026-08-04: SSRはSRより素のステータスを少しだけ高くする。
   SSRの線引きを「ガチャで引けるキャラだけ」に絞った結果、降臨・報酬の強いキャラが
   SR側に移り、レア度と強さの並びが逆転していた。
   ★ 上げ幅は控えめ（HP/攻撃 +6%・スピード +3%）にとどめる。
     大きく開けるとアビリティやリンクスキルの相性で選ぶ意味が薄れ、
     「SSRを並べるだけ」のゲームになってしまうため。
   ★ CHAR_IDS より前・isStar5 の定義より後で回すこと（isStar5 は関数宣言なので巻き上げされる）。 */
/* ★ 2026-08-10 XEVAガチャの SR をSRとして大量に足したので、SRとSSRの差を広げる。
   ・SSR … HP/攻撃 +6% → <b>+11%</b>、スピード +3% → <b>+6%</b>
   ・SR … HP/攻撃 <b>−7%</b>、スピード <b>−4%</b>（初期メンバー4体もここに入る）
   ★ 差を広げすぎるとアビリティや相性で選ぶ意味が薄れるので、合わせて2割弱にとどめる。 */
const STAR5_HP_MUL = 1.11, STAR5_ATK_MUL = 1.11, STAR5_SPD_MUL = 1.06;
const STAR4_HP_MUL = 0.93, STAR4_ATK_MUL = 0.93, STAR4_SPD_MUL = 0.96;
Object.keys(CHARS).forEach((id) => {
  const c = CHARS[id];
  const s5 = isStar5(id);
  const hm = s5 ? STAR5_HP_MUL : STAR4_HP_MUL;
  const am = s5 ? STAR5_ATK_MUL : STAR4_ATK_MUL;
  const sm = s5 ? STAR5_SPD_MUL : STAR4_SPD_MUL;
  c.hp  = [Math.round(c.hp[0]  * hm), Math.round(c.hp[1]  * hm)];
  c.atk = [Math.round(c.atk[0] * am), Math.round(c.atk[1] * am)];
  c.spd = [Math.round(c.spd[0] * sm), Math.round(c.spd[1] * sm)];
});
/* ── 戦型を5種類に統一（バランス／砲撃／アタッカー／支援／技巧） ── */
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-07 戦型を6分類に作り直した
   ------------------------------------------------------------
   これまでは5分類で、しかも「砲撃型＝全体攻撃」「アタッカー型＝体当たり」と
   <b>フルバーストの形</b>で分けていたため、キャラの<b>ステータスやアビリティ</b>を
   見て選びたいときに何の役にも立っていなかった。
   いまは <b>何が強みなのか</b> で分ける。

     バランス型   … ステータスのバランスが良い（尖りはないが、どこでも使える）
     アタッカー型 … キラーなどで攻撃力が強い
     スピード型   … スピードが速い（ダッシュ系・素のスピードが高い）
     砲撃型       … リンクスキルが強い（リンクブースト・強力なリンクを持つ）
     技巧型       … 器用（アンチギミック対応や特殊な立ち回りが得意）
     支援型       … サポート要素多め（回復・バリア・味方バフ・FB短縮）

   ★ キーは既存のまま（balance / striker / speed / cannon / trick / support）。
     speed だけが新設。CHAR_TYPE・FILTERS の両方に足すこと。
   ══════════════════════════════════════════════════════════════ */
const BATTLE_TYPES = {
  balance: { nm: "バランス型",   c: "#8affc4", desc: "攻撃・耐久・スピードがバランスよくまとまった万能タイプ。どのクエストでも扱いやすい" },
  striker: { nm: "アタッカー型", c: "#ff6b8f", desc: "キラーを重ねて<b>攻撃力</b>を伸ばすタイプ。条件が噛み合ったときの火力がいちばん高い" },
  speed:   { nm: "スピード型",   c: "#38a6ff", desc: "<b>スピード</b>が速いタイプ。1ショットで長く走れるので、味方をなぞる回数・壁を使う回数がそのまま増える" },
  cannon:  { nm: "砲撃型",       c: "#ffb84d", desc: "<b>リンクスキル</b>が強いタイプ。味方にふれさせて撃たせる、チームの主砲" },
  trick:   { nm: "技巧型",       c: "#7cc4ff", desc: "<b>器用</b>なタイプ。アンチギミック対応や妨害・状態異常で、盤面そのものを有利にする" },
  support: { nm: "支援型",       c: "#7dffb0", desc: "<b>サポート要素が多め</b>のタイプ。回復・バリア・味方の強化・フルバースト短縮で味方を支える" },
};
/* ★ 2026-08-07: 6分類に合わせて<b>全キャラを割りふり直した</b>。
   割りふりの決めかた（迷ったらこの順で判定する）:
     1. キラー系アビリティが2つ以上 or 攻撃力が最上位 …… アタッカー型
     2. リンクブースト系を持つ or 上位リンク（超◯◯・アブレイ級）…… 砲撃型
     3. スピードが最上位（≒438以上）or ダッシュ系を持つ …… スピード型
     4. 回復・バリア・味方バフ・FB短縮が2つ以上 …… 支援型
     5. アンチギミックを3つ以上 or 妨害・状態異常が主役 …… 技巧型
     6. どれにも寄っていない …… バランス型
   ★ 新キャラを足したら、必ずここにも1行足すこと（抜けると自動で balance になる）。 */
const CHAR_TYPE = {
  /* ── ★★ 2026-08-26b GRAND DEBUT GACHA Ver.4.0 限定SSR 5体（No.157〜161） ── */
  seina: "striker",   /* 重力バリアキラーEL＋底力EL＝第八重を一点突破 */
  shiduki: "support", /* 回復＋遅延＋リジェネL＝立て直しの要。敵少底力ELで終盤に伸びる */
  sayuki: "cannon",   /* ヴォイド・コンボが撃つほど育つ＝バトルが長いほど主砲になる */
  sara: "trick",      /* アンチ3種＋スカウト・ネクサス＝盤面と引きを有利にする */
  sakuya: "striker",  /* 蓬莱天宮の完全対応＋総攻撃2回＋弱点キラーEL */
  /* ── ★★ 2026-08-26 GRAND DEBUT GACHA Ver.3.0 限定SSR 5体（No.148〜152） ── */
  karin: "striker",   /* 弱点キラーEL＋蓬莱族L＋全体防御ダウン＝弱点を一点突破 */
  mirei: "cannon",    /* 総攻撃2回＋ミラーブルーム＝2か所から撃つ主砲 */
  yuuka: "striker",   /* 底力EL＋治癒の祈り＝追いつめられてからの一撃 */
  miyabi: "trick",    /* アンチ3種で第七重＋第二重に対応・味方全員を貫通化 */
  sumire: "support",  /* 敵全体の弱点開放＋回復M＋パワーオーラEL＝チームまるごとの火力を上げる */
  /* ── ★★ 2026-08-26 MagiLex の KP交換キャラ（ミズキは下の行にある） ── */
  kanade: "support",  /* 味方全員のFBを進める＋回復M＋アカデミー・ボンド */
  homura: "striker",  /* HPを払って底力ELを自分で点ける＝払った直後がいちばん強い */
  yoizuki: "trick",   /* 毒をばら撒く＋超マインスイーパーEL＋敵多底力EL */
  sumika: "striker",  /* バイタルキラーEL＝HPの重いボスの入りぎわに刺さる */
  /* ── ★★ 2026-08-25 Starlight Academy Fest 2 限定SSR 5体（No.143〜147） ── */
  suzune: "cannon",   /* リンクブーストEL×フレイムチェイン＝連鎖するほど伸びる主砲 */
  minamo: "support",  /* ソウルEL＋リジェネL＋ドレインM＝第一重の削り合いを支える */
  karen: "striker",   /* 底力EL（クロス）＋バイタルキラーEL＝入りぎわに重い一点突破 */
  tomoe: "trick",     /* 超マインスイーパーEL＋アンチ断絶界＋レーザーストップM＝盤面を有利にする */
  himari: "speed",    /* ダッシュL込みで全キャラ最速。ミラージュで走り続ける */
  /* ── ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 新SSR 5体（No.138〜142） ── */
  guren: "striker",    /* 木属性キラーEL＋蓬莱族L＋重力バリアEL＝第八重を一点突破（属性キラーを残した1体） */
  yuuna: "support",    /* リジェネL＋ドレインM＋バウンドヒール＝削り合いを支える */
  momo: "trick",       /* アンチ3種で2クエスト対応＋毒とFB加速＝盤面を有利にする */
  chihaya: "cannon",   /* ヴェルデサイクロン＋ピアスシーカー20＝なぞらせて撃つ主砲 */
  yui: "striker",      /* 蓬莱天宮の完全対応＋総攻撃2回＝ボスをまとめて削る */
  /* ── ★★ 2026-08-22 Starlight Academy Fest 限定SSR 5体（No.133〜137） ── */
  otoha: "cannon",    /* 敵全体の弱点開放＋超強インフィニティレーザー＝味方ごと火力を引き上げる主砲 */
  sayaka: "trick",    /* 味方全員を貫通化＝盤面の通りかたそのものを変える技巧 */
  sayuri: "striker",  /* 敵の攻撃力を折ってから連撃キラーELで刈る＝一点突破 */
  akari: "support",   /* 味方全員のFBを進める＋リンクブーストEL＝チームを回す支援 */
  hinata: "speed",    /* 最速級のスピードで走り、全敵へ光柱＋ファーストキラーEL */
  /* ── ★ 2026-08-20 GRAND DEBUT GACHA 新SSR 5体（No.128〜132） ── */
  mirelle: "cannon",   /* 全体防御ダウン＋紅蓮メテオ＝盤面ごと落とす主砲 */
  scarlet: "support",  /* 回復＋遅延＋リジェネL＝立て直しの要 */
  koyuki: "striker",   /* 毒をまいて毒キラーELで刈る＝一点突破 */
  amelia: "support",   /* 味方のステータス×2.0＋バウンドヒール＝なぞって支える */
  mio: "striker",      /* 貫通化＋再走＋弱点キラーL＝2回ぶん刺す */
  /* ── ★ 2026-08-18 プレミアム新SSR 8体＋ロキシー（No.119〜127） ── */
  artemia: "striker",  /* 弱点キラーL＋ファーストキラーM＝条件がそろったときの一撃 */
  asuha: "support",    /* 回復M＋FBターンタッチ＋FBが回復＝なぞって支える */
  blair: "speed",      /* 素のスピード最上位＋ダッシュM＋FBのスピード×1.6 */
  lilith: "trick",     /* 毒をまいて毒で刈る＝状態異常が主役 */
  lyra: "support",     /* バリアEL＋リジェネM＋全属性耐性M＋ラウンドヒール */
  satsuki: "striker",  /* 連撃キラーM＋底力M＋超マインスイーパーL＝火力を積む */
  sayo: "striker",     /* フェイタルキラーL＋ボスキラーM＝詰めのキラー2枚 */
  melty: "trick",      /* アンチロックゾーン＋毒＝盤面と状態で有利を作る */
  roxy: "cannon",      /* サーキュレーション＋雷2種＝画面ぜんぶを叩く主砲 */
  /* ── ★ 2026-08-16b プレミアム新SSR 6体（No.110〜115） ── */
  moeka: "support",   /* リンク×2＋7ターンFBで、なぞって配るのが仕事 */
  suzuha: "striker",  /* セイラと同じ最高火力の乱打 */
  violet: "striker",  /* 壁に当てるほど伸びるウォールブースト型 */
  kanata: "striker",  /* 総攻撃＋弱点倍率UPのアタッカー */
  touka: "striker",   /* 2段構えの体当たり */
  elena: "support",   /* 総攻撃2回＋エーテル運搬 */
  grace: "striker",   /* ★ 2026-08-17b 弱点＋全属性キラー化＋超極太レーザー */
  youka: "speed",     /* ★ 2026-08-17k 2回走れる＝手数で押す */
  youhi: "striker",   /* ★ 2026-08-17k 木属性キラーEL＋弱点キラーLの一点突破 */
  /* ── バランス型（尖りはないが、どこでも使える） ── */
  zera: "balance", kaguya: "balance", rinne: "balance", hecatia: "balance",
  kaguyaalpha: "balance", beltia: "balance", noelle: "balance",
  /* ── アタッカー型（キラーなどで攻撃力が強い） ── */
  sakura: "striker", arisa: "striker", cheryl: "striker", mao: "striker", tsubaki: "striker",
  natsuki: "striker", hotaru: "striker", koharu: "striker", rezelia: "striker",
  selene: "striker", nazuna: "striker", revia: "striker", arche: "striker", chloe: "striker",
  mionalpha: "striker", sheril: "striker", lysera: "striker", yuria: "striker",
  roselia: "striker", yaju: "striker", iori: "striker",
  /* ★ 2026-08-08 ナナミ（全属性キラーM＋ザコキラーM＋蝕魔族キラーM の3キラー） */
  nanami: "striker",
  /* ★ 2026-08-10 XEVAガチャ移行SSR */
  nana: "striker",
  /* ── スピード型（スピードが速い／ダッシュ系を持つ） ── */
  leila: "speed", alicia: "speed", fiona: "speed", abyss: "speed",
  fia: "speed", altia: "speed", yukino: "speed", solea: "speed",
  /* ── 砲撃型（リンクスキルが強い） ── */
  mion: "cannon", kokona: "cannon", bernica: "cannon", iroha: "cannon", elsia: "cannon",
  setsuna: "cannon", soleria: "cannon", liana: "cannon", dominia: "cannon",
  /* ★ 2026-08-08 チトセ（超強クイックチャージショット＝上位リンクが主役なので砲撃型） */
  chitose: "cannon",
  /* ── 技巧型（器用。ギミック対応・妨害・状態異常） ── */
  celine: "trick", viola: "trick", mizuki: "trick", shirayuki: "trick", karina: "trick",
  lilia: "trick", mabel: "trick", astera: "trick", reika: "trick",
  /* ── 支援型（回復・バリア・味方バフ・FB短縮） ── */
  ayame: "support", ema: "support", aira: "support", shion: "support", ayaka: "support",
  mashiro: "support", yuri: "support", milfy: "support", nephia: "support",
  nemu: "support", shizuka: "support",
  /* ★ 2026-08-08c 登録もれの修正。この4体は CHAR_TYPE に無く、
     すべて既定の「バランス型」として表示・絞り込みされていた。 */
  kaede: "striker",     // 超マインスイーパーL＋ウォールブーストM＋壁抜けFB＝火力を積むタイプ
  rinon: "support",     // ふれた味方のリンクを2回撃たせる＋FBターン短縮＝支援
  kokoro: "trick",      // アンチ2種＋エターナルエーテル＋リンク×2＝盤面づくり
  ange: "striker",      // キラー中心
  /* ★ 2026-08-08c プレミアム新SSR 3体 */
  kotone: "striker",    // ウォールブーストEL＋ザコキラーM＝壁を使って火力を出す
  ran: "support",       // 治癒の祈り＋ソウルスティールEL＝回復役
  ceris: "trick",       // 超アンチ2種＋バリアM＋壁FBターン短縮＝耐えて回す
  /* ★ 2026-08-10 XEVAガチャ移行SR 19体 */
  hina: "balance",
  runa: "cannon",
  noa: "support",
  haruka: "trick",
  shiona: "balance",
  ede: "trick",
  yuina: "striker",
  ririka: "support",
  serina: "cannon",
  akane: "striker",
  airi: "support",
  eruna: "balance",
  kotoha: "trick",
  mika: "striker",
  mirea: "balance",
  miyu: "cannon",
  nene: "support",
  rei: "speed",
  rusia: "support",
  /* ★ 2026-08-10 XEVAガチャ移行SSR 6体（ナナは上の striker 欄に書いてある） */
  kotomi: "support",    // ふれた味方のステータス×2＋ラウンドチャージ＝支援
  riko: "support",      // 号令FB＋リンスピアップ＝味方を強くして走らせる
  kaho: "trick",        // 浮き輪で防御ダウン＋アンチ2種＝盤面づくり
  rea: "speed",         // 壁すり抜け＋バブリーモード＝走りぬける
  rinonx: "striker",    // 減速壁を叩くほど攻撃力が伸びる
  /* ★ 2026-08-11 Luminous Summer Fest 追加2体 ＋ プレミアムSSR 3体 */
  cherylalpha: "striker",  // 乱打40連＝一点集中の火力
  kokonaalpha: "cannon",   // 全体ハート爆撃＋超強クロス分身弾＝リンクと全体攻撃が主役
  shizuku: "support",      // ふれた味方ごとに回復＋リジェネM
  yuunagi: "striker",      // 壁で積み上げて総攻撃
  izumi: "trick",          // 敵の攻撃ターンを遅らせる＋アンチ2種
  /* ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定SSR 6体。
     ここに書き忘れると、その子だけ「バランス型」と表示・絞り込みされてしまう。 */
  fuka: "support",         // ふれた味方のパワー×2.0＋バウンドチャージ＝味方を強くして走らせる
  tsumugi: "striker",      // HPを燃やして火力に変える＝一発の重さで押す
  suzuka: "striker",       // 2段構えの体当たり＋位置キラー2種＝殴りきる
  karem: "striker",        // 乱打＋渾身（攻撃×3）＝一点集中の火力
  mayu: "trick",           // 視野角180°の妨害＋治癒の祈り＝盤面づくり
  chizuru: "cannon",       // サーキュレーション／ポジションリミットの2枚看板＝リンクが主役
  seira: "striker",        // 史上最高火力の乱打FB＋連撃キラーL＝1体を溶かしきる
  /* ★ 2026-08-16 プレミアムSSR 2体 */
  anna: "striker",         // 乱打40連＋底力L＋蝕魔族キラーM＝一点集中の火力
  tsukino: "support",      // ふれた味方のパワー×2.0＋バウンドヒール＋リジェネM＝味方を支える
};
Object.keys(CHARS).forEach((id) => {
  const t = BATTLE_TYPES[CHAR_TYPE[id] || "balance"];
  CHARS[id].typeKey = CHAR_TYPE[id] || "balance";
  CHARS[id].type = t.nm;
});
const MAX_LV = 50;
/* ★ v12: 「超越の書」を使ったキャラだけ、レベル上限が 60 まで解放される。
   黄昏の王城／禁忌の迷宮 を全部屋クリアするともらえる特別アイテム（1体につき1回だけ使える）。 */
const TRANS_LV = 60;
/* ★ 2026-08-17k 九天の玉簡（蓬莱の九重 60WAVE）で、さらに Lv.70 まで解放する。
   ★ 段は「50 → 60 → 70」の3段。玉簡は<b>超越の書を使ってあるキャラにだけ</b>使える
     （いきなり70にはできない）。 */
const JADE_LV = 70;
/* ★★ 2026-08-12 「Lv.60 なのに 最大レベルの表記が 50 のまま」への対策。
   レベル上限の解放は DB.trans（charId → 1）だけで持っていたが、
   クラウド同期の合流では <b>DB.chars の lv は大きいほうが残る</b>のに対し、
   DB.trans は勝ったほうのセーブがそのまま採られていた。
   ＝ Lv.60 は残ったのに解放フラグだけ落ちて、上限が 50 に戻って見える。
   レベルが 50 を超えているキャラは<b>超越の書を使ったキャラしかいない</b>ので、
   ここで拾い直す（フラグそのものの復元は index.html の起動処理でやる）。 */
function lvCapOf(id) {
  if (typeof DB === "undefined" || !DB) return MAX_LV;
  /* ★ 2026-08-17k 上限は 50 → 60（📕超越の書）→ 70（🪭九天の玉簡）の3段。
     玉簡は超越ずみのキャラにしか使えないので、jade を先に見ればよい。 */
  if (DB.jade && DB.jade[id]) return JADE_LV;
  if (DB.trans && DB.trans[id]) return TRANS_LV;
  const st = DB.chars && DB.chars[id];
  /* 保険: セーブのフラグが落ちていても、実レベルが上なら上限を戻す
     （フラグだけ消えて「Lv.65 なのに上限60」になる型の不具合を防ぐ） */
  if (st && ((st.lv | 0) > TRANS_LV)) return JADE_LV;
  if (st && ((st.lv | 0) > MAX_LV)) return TRANS_LV;
  return MAX_LV;
}
const MAX_AWK = 4;    // 限界突破（覚醒）は4まで。4限界突破＝限界突破MAXで金オーラ
const AWK_ATK = 0.10; // 覚醒1回につき攻撃力+10%
const AWK_HP = 0.07;  // 覚醒1回につきHP+7%（覚醒はステータスアップのみ。FBターンは短縮しない）

/* ══════════ ルーン — キャラに1つずつ装備。効果は「装備した本人だけ」に効く ══════════ */
const FRUIT_COST = 5000;   // ショップ価格（1個あたり 5,000 coin）
const FRUITS = {
  haste: { id: "haste", nm: "時短のルーン", c: "#7cc4ff", short: "FB-4", desc: "バトル開始時、装備した本人のFBターンを4短縮する" },
  power: { id: "power", nm: "剛力のルーン", c: "#ff5d47", short: "攻+15%", desc: "装備した本人の攻撃力を15%アップする" },
  swift: { id: "swift", nm: "疾風のルーン", c: "#38a6ff", short: "速+15%", desc: "装備した本人のスピードを15%アップする" },
  bane:  { id: "bane",  nm: "破魔のルーン", c: "#f0b429", short: "BOSS-5%", desc: "各WAVE開始時、装備者がいればボスの最大HPの5%を削る" },
  sweep: { id: "sweep", nm: "掃討のルーン", c: "#2fbf71", short: "雑魚-5%", desc: "各WAVE開始時、装備者がいればボス以外の敵の最大HPの5%を削る" },
  bond:  { id: "bond",  nm: "絆のルーン", c: "#ff8ab5", short: "リンク×1.25", desc: "装備した本人のリンクスキルのダメージを1.25倍にする" },
  /* ★ 2026-08-03 追加。剛力（攻撃）・疾風（速さ）に対する「たいりょく」の枠。
     チームHPは4人ぶんの合計なので、装備した本人のHPが増えたぶんだけ総HPが増える。 */
  vigor: { id: "vigor", nm: "堅牢のルーン", c: "#2fbf71", short: "HP+15%", desc: "装備した本人のHPを15%アップする（チームの総HPがそのぶん増える）" },
  /* ★ 2026-08-17m 守りのルーン2つ。
     ★ どちらも<b>チーム全体</b>に効く（装備した本人だけではない）。
       毒もふつうの攻撃もチームHPをまとめて削るしくみなので、
       「本人だけ」にすると効果がまったく出ないため。
       ほかのルーンと性質がちがうので、説明文にもそう書いてある。 */
  antidote: { id: "antidote", nm: "毒我慢のルーン", c: "#8affc4", short: "毒-99%",
    desc: "毒によるダメージを<b>99%カット</b>する（チーム全体に効く）" },
  guard:    { id: "guard",    nm: "ケガ減りのルーン", c: "#7cc4ff", short: "被ダメ-20%",
    desc: "敵から受けるダメージを<b>20%カット</b>する（チーム全体に効く）" },
};
const FRUIT_VIGOR = 1.15;   // 堅牢のルーンのHP倍率
const FRUIT_ANTIDOTE = 0.01;  // 毒我慢: 毒ダメージの残る割合（＝99%カット）
const FRUIT_GUARD = 0.80;     // ケガ減り: 被ダメージの残る割合（＝20%カット）
const FRUIT_IDS = ["haste", "power", "swift", "bane", "sweep", "bond", "vigor", "antidote", "guard"];
/* ★ チーム全体に効くルーンは「誰か1人でも着けていれば効く」。
   4人ぶん重ねがけにはしない（重ねると 20%カットが実質ゼロダメージになるため）。 */
function teamHasFruit(id) {
  if (typeof B === "undefined" || !B || !B.balls) return false;
  return B.balls.some((b) => b && ballFruit(b, id));
}

/* ══════════ 特別アイテム（WAVE踏破報酬でしか手に入らない） ══════════
   ・叡智の果実 … 使うと必ず1レベル上がる（EXP不要）
   ・英傑の証   … そのキャラの「ルーン」の枠を 2 → 3 に解放する（1キャラにつき1回）
   ※ 英傑の証は「黄昏の王城 100WAVE 踏破」でしか配布しない（他の入手経路を作らないこと）。 */
/* 叡智の果実1個で上がるレベル数。★ 2026-08-13 まとめて使えるようにしたので、
   「何個で何レベル」を説明文・確認ダイアログ・実際の処理の3か所で共有する。 */
const WISDOM_LV = 3;
const ITEMS = {
  /* ★ 2026-08-12 上限は「そのキャラの上限」＝超越の書を使ってあれば Lv.60 まで上がる。
     ここに Lv.50 と書いてあると、解放済みのキャラでも 50 で止まるように読めてしまう。 */
  wisdom: { id: "wisdom", nm: "叡智の果実", c: "#7ce8ff", icon: "🍐", desc: "使ったキャラのレベルが必ず" + WISDOM_LV + "つ上がる（そのキャラのレベル上限まで／📕超越の書を使ってあれば Lv." + TRANS_LV + " まで）。<b>まとめて使えます</b>" },
  hero:   { id: "hero",   nm: "英傑の証",   c: "#f0c040", icon: "🎖️", desc: "使ったキャラの「ルーン」の装備枠を 2 → 3 に解放する（1キャラにつき1回だけ）" },
  /* ★ v12: 黄昏の王城／禁忌の迷宮 を全部屋クリアするともらえる。1体のレベル上限を60まで解放する */
  trans:  { id: "trans",  nm: "超越の書",   c: "#a86bff", icon: "📕", desc: "使ったキャラのレベル上限を 50 → 60 に解放する（1キャラにつき1回だけ）。さらに上の <b>Lv." + JADE_LV + "</b> は 🪭九天の玉簡 で解放できる" },
  /* ★ 2026-08-11 クロスの書。★ 2026-08-12「1冊＝1体ぶん」に変更。
     使ったキャラは、以後ずっと<b>クロススキルの発動条件を無視して発動</b>するようになる。
     入手は「幽冥の庭園・今回の10クエストを全部クリアする」ことだけ（1スパンにつき1冊）。 */
  crossbook: { id: "crossbook", nm: "クロスの書", c: "#37e0c8", icon: "📘",
    desc: "使ったキャラの<b>クロススキルが、編成条件を無視して常に発動</b>するようになる（1体につき1冊・1回だけ）" },
  /* ★ 2026-08-17k 九天の玉簡。蓬莱の九重 60WAVE でのみ手に入る。
     超越の書（Lv.60）を使ってあるキャラにだけ使え、上限を Lv.70 まで押し上げる。 */
  jade: { id: "jade", nm: "九天の玉簡", c: "#ff9ec4", icon: "🪭",
    desc: "<b>📕超越の書を使ってあるキャラ</b>のレベル上限を " + TRANS_LV + " → <b>" + JADE_LV + "</b> に解放する（1キャラにつき1回だけ）" },
};
/* 特別アイテムの新デザインアイコン（自作SVG）。
   叡智の果実＝きらめく智慧の宝石果実／英傑の証＝リボンつきの星章クレスト。 */
function itemIcon(id, px) {
  const s = px || 26, w = "width:" + s + "px;height:" + s + "px;display:block";
  if (id === "wisdom") return `<svg viewBox="0 0 40 40" style="${w}" aria-hidden="true">
    <path d="M21 7c3-3 7.2-3 9.2-1.8-1.2 3.4-4.6 5.4-7.8 4.8" fill="#4ade80"/>
    <path d="M20 8.5v4" stroke="#2fbf71" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M20 11 L30 22 Q30.6 34 20 37 Q9.4 34 10 22 Z" fill="#1aa3c8"/>
    <path d="M20 11 L27 21 Q27 31.6 20 34 Q13 31.6 13 21 Z" fill="#7ce8ff"/>
    <path d="M20 13 L23.6 20.5 Q23.6 27.4 20 29.4 Q16.4 27.4 16.4 20.5 Z" fill="#d8f8ff" opacity=".9"/>
    <path d="M20 11 L20 37 M11 22 L29 22" stroke="#eafaff" stroke-width=".8" opacity=".55"/>
    <path d="M27.6 12 l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#fff"/>
  </svg>`;
  /* ★ 2026-08-17k 九天の玉簡。
     「簡」＝竹簡（細い札を綴じた巻物）なので、<b>縦の札を9枚</b>並べて綴じ紐を渡す。
     9枚＝九重・九天。玉の質感を出すため、札は淡い翡翠から桃色へのグラデにして、
     中央に天宮を表す小さな楼閣の屋根、上に九天のしるしの星を置く。
     ★ 超越の書（📕）が「本」なのに対して、こちらは「巻物」。
       同じ育成アイテムでも、ひと目で別物と分かる形にしてある。 */
  if (id === "jade") return `<svg viewBox="0 0 40 40" style="${w}" aria-hidden="true">
    <defs><linearGradient id="jd${s}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bff3e2"/><stop offset=".55" stop-color="#8fe3d0"/><stop offset="1" stop-color="#ff9ec4"/>
    </linearGradient></defs>
    <g>
      ${Array.from({ length: 9 }, (_, i) => {
        const x = 4.2 + i * 3.5;
        return `<rect x="${x}" y="7.5" width="2.7" height="25" rx="1.2" fill="url(#jd${s})" stroke="#2f9c86" stroke-width=".45"/>`;
      }).join("")}
      <path d="M3.4 12.6h33.2M3.4 27.4h33.2" stroke="#c9772f" stroke-width="1.5" stroke-linecap="round" opacity=".92"/>
      <path d="M3.4 12.6h33.2M3.4 27.4h33.2" stroke="#ffd98a" stroke-width=".5" stroke-linecap="round"/>
    </g>
    <path d="M20 17.4 l5.6 3.2h-11.2z" fill="#ff9ec4" stroke="#c2567f" stroke-width=".5" stroke-linejoin="round"/>
    <rect x="16.6" y="20.6" width="6.8" height="3.4" rx=".7" fill="#fff0f6" stroke="#c2567f" stroke-width=".5"/>
    <path d="M20 1.8 l1.4 3.1 3.1 1.4-3.1 1.4L20 10.8l-1.4-3.1-3.1-1.4 3.1-1.4z" fill="#ffe9a8"/>
    <circle cx="9.6" cy="35.4" r="1.5" fill="#ff9ec4" opacity=".9"/>
    <circle cx="30.4" cy="35.4" r="1.5" fill="#8fe3d0" opacity=".9"/>
  </svg>`;
  if (id === "trans") return `<svg viewBox="0 0 40 40" style="${w}" aria-hidden="true">
    <path d="M6 8 Q13 4.6 19.4 8 L19.4 33 Q13 29.6 6 33 Z" fill="#6a3fb0"/>
    <path d="M34 8 Q27 4.6 20.6 8 L20.6 33 Q27 29.6 34 33 Z" fill="#8e4fe0"/>
    <path d="M8.6 10.4 Q13.6 8.2 18 10.4 L18 30.6 Q13.6 28.4 8.6 30.6 Z" fill="#e9d8ff" opacity=".92"/>
    <path d="M31.4 10.4 Q26.4 8.2 22 10.4 L22 30.6 Q26.4 28.4 31.4 30.6 Z" fill="#f6efff" opacity=".92"/>
    <rect x="19.1" y="6.4" width="1.8" height="28" rx=".9" fill="#4b2a80"/>
    <path d="M20 2.2 l1.5 3.4 3.4 1.5-3.4 1.5L20 12l-1.5-3.4L15.1 7.1l3.4-1.5z" fill="#ffe9a8"/>
    <path d="M10.6 14.4h6M10.6 18h6M10.6 21.6h4.4M23.6 14.4h6M23.6 18h6M25.2 21.6h4.4" stroke="#a86bff" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
  </svg>`;
  /* ★ 2026-08-11 クロスの書。
     超越の書（紫の「開いた本」）とはっきり見分けられるよう、こちらは<b>閉じたまま立つ蒼緑の書物</b>にした。
     表紙には金の鎖が交差した紋章（＝クロススキルのマークと同じモチーフ）が浮かび、
     背表紙の側から光が差している。「開かなくても効いている＝持っているだけで発動する」ことを絵で表している。 */
  if (id === "crossbook") return `<svg viewBox="0 0 40 40" style="${w}" aria-hidden="true">
    <defs>
      <linearGradient id="cbc" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0f5f6e"/><stop offset=".55" stop-color="#149a94"/><stop offset="1" stop-color="#0c4655"/>
      </linearGradient>
      <linearGradient id="cbg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#e0a83c"/>
      </linearGradient>
      <radialGradient id="cbl" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#b9fff4" stop-opacity=".95"/><stop offset="1" stop-color="#b9fff4" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${/* 背後からもれる光 */""}
    <circle cx="21" cy="20" r="15" fill="url(#cbl)"/>
    ${/* 小口（重なった紙） */""}
    <path d="M30.4 7.6v24.8l-2.2 2.2V9.8z" fill="#f3fbff"/>
    <path d="M28.2 9.8v24.8l-16.8 0V9.8z" fill="#e6f6fb"/>
    <path d="M12.6 12h13.4M12.6 15h13.4M12.6 18h13.4M12.6 21h13.4M12.6 24h13.4M12.6 27h13.4M12.6 30h13.4"
      stroke="#b9d8e2" stroke-width=".5" opacity=".8"/>
    ${/* 表紙＋背表紙 */""}
    <path d="M8.4 5.6h20.4a1.8 1.8 0 011.8 1.8v25.2a1.8 1.8 0 01-1.8 1.8H8.4z" fill="url(#cbc)"/>
    <path d="M8.4 5.6h4.2v29H8.4z" fill="#0a3b48"/>
    <path d="M14.4 8.2h13.6v23.8H14.4z" fill="none" stroke="url(#cbg)" stroke-width=".9" opacity=".75"/>
    ${/* 表紙の紋章＝交差した2つの鎖（クロスマークと同じモチーフ） */""}
    <g transform="translate(21.2 20)" stroke="url(#cbg)" stroke-width="2" stroke-linecap="round" fill="none">
      <path d="M-4.4 4.4 4.4-4.4"/>
      <path d="M1.2-6 2.8-7.6a3.2 3.2 0 014.6 4.6L5.8-1.4"/>
      <path d="M-1.2 6-2.8 7.6a3.2 3.2 0 01-4.6-4.6L-5.8 1.4"/>
    </g>
    ${/* 差しこむ光の粒 */""}
    <path d="M26.6 10.6l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" fill="#d8fff8"/>
    <path d="M16.4 28.4l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" fill="#d8fff8" opacity=".85"/>
  </svg>`;
  return `<svg viewBox="0 0 40 40" style="${w}" aria-hidden="true">
    <path d="M13 3 L20 15.5 L14.5 15.5 Z" fill="#ff5d6c"/>
    <path d="M27 3 L20 15.5 L25.5 15.5 Z" fill="#2e8bff"/>
    <circle cx="20" cy="24" r="12.5" fill="#c8960c"/>
    <circle cx="20" cy="24" r="10.6" fill="#f0c040"/>
    <circle cx="20" cy="24" r="10.6" fill="none" stroke="#fff4c8" stroke-width="1.2"/>
    <path d="M20 16.4 l2.4 4.9 5.4.8-3.9 3.8 .9 5.4-4.8-2.5-4.8 2.5 .9-5.4-3.9-3.8 5.4-.8z" fill="#fff8e0" stroke="#9a6a00" stroke-width=".55"/>
  </svg>`;
}
/* キャラのルーン枠数。★ 標準で2枠、英傑の証を使うと3枠になる */
function fruitSlots(id) { return (DB.hero && DB.hero[id]) ? 3 : 2; }
/* 枠番号 → 保管場所（1=DB.equip / 2=DB.equip2 / 3=DB.equip3） */
function fruitStore(slot) { return slot === 3 ? DB.equip3 : slot === 2 ? DB.equip2 : DB.equip; }
/* キャラが装備しているルーンの一覧（空きは含めない） */
function equippedFruits(id) {
  const a = [], n = fruitSlots(id);
  for (let s = 1; s <= n; s++) {
    const f = fruitStore(s)[id];
    if (f && FRUITS[f] && a.indexOf(f) < 0) a.push(f);
  }
  return a;
}
/* 実のイラスト（角丸のフルーツ＋葉＋効果アイコン。SVG自作） */
function fruitGlyph(id, cc) {
  const g = {
    haste: `<path d="M8 5h8M8 19h8M9 5c0 4 6 4 6 7s-6 3-6 7" fill="none" stroke="${cc}" stroke-width="1.6" stroke-linecap="round"/>`,
    power: `<path d="M12 3c1 3 4 4.5 4 8a4 4 0 01-8 0c0-2 1-3.2 2.1-4.4C10.4 8 11 8.3 12 8c.8-.3.9-2.2 0-5Z" fill="${cc}"/>`,
    swift: `<path d="M4 9h11a2.4 2.4 0 10-2.4-2.4M4 13h14a2.6 2.6 0 11-2.6 2.6M4 11h8" fill="none" stroke="${cc}" stroke-width="1.6" stroke-linecap="round"/>`,
    bane:  `<path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6Z" fill="${cc}"/><circle cx="12" cy="10" r="1.4" fill="#fff"/>`,
    sweep: `<path d="M12 5v10M7 7l10 6M17 7L7 13" fill="none" stroke="${cc}" stroke-width="1.6" stroke-linecap="round"/>`,
    bond:  `<path d="M12 17c-5-3.2-7-5.6-7-8a3.2 3.2 0 016-1.4A3.2 3.2 0 0119 9c0 2.4-2 4.8-7 8Z" fill="${cc}"/>`,
    /* 堅牢のルーン: 盾＋十字（たいりょくアップ） */
    vigor: `<path d="M12 3.4l7 2.6v5.4c0 4.2-2.9 7.4-7 8.6-4.1-1.2-7-4.4-7-8.6V6Z" fill="${cc}"/><path d="M12 8v6M9 11h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
    /* ★ 2026-08-17m 毒我慢: 毒のしずくに「止め」の斜線 */
    antidote: `<path d="M12 3.6c3.4 4.2 5.2 6.6 5.2 9a5.2 5.2 0 11-10.4 0c0-2.4 1.8-4.8 5.2-9Z" fill="${cc}"/><path d="M6.4 18.6L17.8 7.2" stroke="#fff" stroke-width="2.1" stroke-linecap="round"/>`,
    /* ★ 2026-08-17m ケガ減り: 盾の中に下向きの矢（受けるダメージが減る） */
    guard: `<path d="M12 3.4l7 2.6v5.4c0 4.2-2.9 7.4-7 8.6-4.1-1.2-7-4.4-7-8.6V6Z" fill="${cc}"/><path d="M12 7.6v6.2M9.3 11.4L12 14.2l2.7-2.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  };
  return g[id] || "";
}
function fruitSVG(id, px) {
  const f = FRUITS[id]; if (!f) return "";
  const s = px || 30;
  /* ルーンストーン: 六角形の石版に効果グリフを刻んだ自作SVG（端末差の出ない統一デザイン） */
  return `<svg viewBox="0 0 40 44" style="width:${s}px;height:${s * 1.1}px">
    <path d="M20 2l16 9.2v21.6L20 42 4 32.8V11.2Z" fill="${f.c}"/>
    <path d="M20 2l16 9.2v21.6L20 42 4 32.8V11.2Z" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.6"/>
    <path d="M20 6.5l11 6.3" stroke="rgba(255,255,255,.4)" stroke-width="2" stroke-linecap="round" fill="none"/>
    <g transform="translate(8,10)">${fruitGlyph(id, "rgba(10,8,22,.92)")}</g>
  </svg>`;
}
/* リンク／サブリンクのデザイン（バトル中のボールに出るのと同じ自作グリフ）を画像化して
   キャラ詳細やガチャの説明にも表示する。描画関数はバトル側と共通（drawFsGlyph / drawSubGlyph）。 */
/* ★ v11.3: ルーンを2つ装備しているときは、横に並べず「1つずつ交互に」表示する。
   （小さなアイコンを2個並べると潰れて読めないため。CSSアニメだけで切り替えるので描画コストはゼロ） */
const RUNE_CYCLE_MS = 3200;      // 2つのとき1周にかかる時間（1つあたり1600ms）
/* ★ 2026-08-08: delay は必ず<b>マイナス</b>にする（＝すでに途中まで再生した状態で始める）。
   プラスの delay ＋ fill:both だと、描き直した直後はどれも「0%＝不透明」で重なってしまい、
   いちばん後ろの1つしか見えない＝入れ替わらないように見えていた。
   枚数ぶんのクラス（n2 / n3）でひとコマの長さを切り替える。 */
function fruitCycleHTML(ids, px) {
  if (!ids || !ids.length) return "";
  if (ids.length === 1) return fruitSVG(ids[0], px);
  const n = Math.min(3, ids.length);
  const list = ids.slice(0, n);
  const dur = n === 3 ? RUNE_CYCLE_MS * 1.5 : RUNE_CYCLE_MS;   // 1コマ＝1600ms でそろえる
  return `<span class="frcyc n${n}" style="width:${px}px;height:${px}px">`
    + list.map((id, i) => `<i style="animation-delay:-${Math.round(i * dur / n)}ms">${fruitSVG(id, px)}</i>`).join("")
    + "</span>";
}
const _fsIconCache = {};
function fsIcon(kind, sub, color, px) {
  const key = (sub ? "s:" : "f:") + kind + ":" + color;
  if (!_fsIconCache[key]) {
    const c = document.createElement("canvas");
    c.width = c.height = 48;
    const g = c.getContext("2d");
    g.translate(24, 24); g.scale(1.7, 1.7);
    if (sub) drawSubGlyph(kind, color, g); else drawFsGlyph(kind, color, g);
    _fsIconCache[key] = c.toDataURL();
  }
  const s = px || 34;
  return `<img class="fsic" src="${_fsIconCache[key]}" alt="" style="width:${s}px;height:${s}px">`;
}
function statAt(range, lv) { return Math.round(range[0] + (range[1] - range[0]) * ((lv - 1) / (MAX_LV - 1))); }
/* ══ ★ 2026-08-12d アーク強化の「倍率そのもの」はここ（＝性能の側）に置く ══
   もとは MagiBurst の index.html にあったが、XEVARION の図鑑・ガチャの詳細でも
   <b>アークを乗せた同じ数字</b>を出したいので、規則をこちらへ移した。
   （ポイントをいくつ持っていて、どこに振るか——という<b>画面の話</b>は index.html のまま）
     ・段数の上限と1段の伸びは<b>関数</b>で返す。statsOf はこのファイルの前のほうから
       呼ばれることがあるので、const のテーブルを参照すると読み込み順で TDZ に落ちる。 */
function arcMaxStep() { return 20; }
function arcStepSize(k) { return k === "hp" ? 0.010 : k === "atk" ? 0.008 : k === "spd" ? 0.006 : 0; }
function arcStep(el, k) { return clamp(((typeof DB !== "undefined" && DB.arc && DB.arc[el] && DB.arc[el][k]) | 0), 0, arcMaxStep()); }
/* そのキャラに乗るアークの倍率（1.0 = 効果なし）。手元のプレイヤーぶん */
function arcMul(el, k) { return 1 + arcStep(el, k) * arcStepSize(k); }
/* ══ ★ 2026-08-11 「だれのアークか」を明示して倍率を出す ══
   アークは<b>そのアカウントが持っているキャラにだけ</b>効く強化なので、
   だれのボールなのかによって使う表を変える必要がある。
     undefined … 手元のプレイヤー（DB.arc）＝自分の持ちキャラ
     null      … アークを乗せない（持ち主のアークが分からない相手）
     オブジェクト … その表を使う（マルチで持ちよった相手／助っ人の貸主）
   statsOf がこの関数を呼ぶ。 */
function arcMulOf(arcTable, el, k) {
  const t = arcTable === undefined ? (typeof DB !== "undefined" ? DB.arc : null) : arcTable;
  if (!t) return 1;
  const step = clamp(((t[el] && t[el][k]) | 0), 0, arcMaxStep());
  return 1 + step * arcStepSize(k);
}
/* レベル・限界突破を明示してステータスを計算（オンラインでは他プレイヤーの値をそのまま使う） */
function statsOf(id, lv, awk, arc) {
  const c = CHARS[id];
  /* ★ 超越の書でLv.60まで伸ばせるので、上限は TRANS_LV。Lv.51以降は同じ伸び幅で外挿する */
  lv = clamp(lv || 1, 1, TRANS_LV); awk = clamp(awk || 0, 0, MAX_AWK);
  /* ★ 2026-08-05 アーク強化（属性ごとに振ったポイント）をここで合流させる。
     ここ1か所に入れておけば、図鑑・編成・バトル・助っ人のどこから見ても同じ数字になる。
     ★ 2026-08-11 作り直し: アークは<b>そのアカウントが持っているキャラにだけ</b>効く。
       第4引数 arc に「そのキャラの持ち主のアーク表」を渡す。
         省略（undefined） … 手元のプレイヤー（DB.arc）＝自分の持ちキャラ
         null              … アークを乗せない（＝持ち主のアークが分からない相手）
         オブジェクト       … その表を使う（マルチで持ちよった相手のアーク／助っ人の貸主のアーク）
       以前はどのキャラにも<b>手元の DB.arc</b>が乗っていたので、
       マルチでは<b>相手のキャラにも自分のアークが乗り</b>、端末ごとにダメージが食いちがっていた
       （紋章で同じ問題を直したのと同じ話）。助っ人も同様に貸主のぶんを使う。 */
  const A = (typeof arcMulOf === "function") ? (el, k) => arcMulOf(arc, el, k) : () => 1;
  /* ★ 2026-08-12d <b>アークで増えたぶん</b>を、そのまま画面に「＋◯◯」で出せるように返す。
     アークなし（＝倍率1.0）の値を同じ式で丸めてから引くので、
     画面に出ている数字と ぴったり合う（丸めの誤差でズレない）。 */
  /* 覚醒はステータスアップのみ（フルバーストの必要ターンは短縮しない） */
  const hp0 = Math.round(statAt(c.hp, lv) * (1 + AWK_HP * awk));
  const atk0 = Math.round(statAt(c.atk, lv) * (1 + AWK_ATK * awk));
  const spd0 = statAt(c.spd, lv);
  const hp = Math.round(statAt(c.hp, lv) * (1 + AWK_HP * awk) * A(c.el, "hp"));
  const atk = Math.round(statAt(c.atk, lv) * (1 + AWK_ATK * awk) * A(c.el, "atk"));
  const spd = Math.round(statAt(c.spd, lv) * A(c.el, "spd"));
  return {
    lv, awk, hp, atk, spd,
    ssTurns: c.ssTurns,
    /* そのステータスに含まれているアークぶん（0 なら振っていない） */
    arc: { hp: hp - hp0, atk: atk - atk0, spd: spd - spd0 },
  };
}
function charStats(id) {
  const st = DB.chars[id] || { lv: 1, awk: 0, exp: 0 };
  return Object.assign(statsOf(id, st.lv, st.awk || 0), { exp: st.exp || 0 });
}
/* ══ ★ 2026-08-12d ステータスに含まれる「アークで増えたぶん」を ＋◯◯ の札にする ══
   statsOf が st.arc に「アークなしとの差」を入れて返すので、
   キャラのステータスを出しているところで<b>そのまま添える</b>だけでよい。
     ・振っていない属性・項目では 0 になり、札そのものを出さない。
     ・マルチの相手や助っ人は<b>その持ち主のアーク</b>で計算されているので、
       ここに出るのもその人のぶん（手元のアークが混ざることはない）。
   ★ 見た目（.arcup）は MagiBurst の index.html と、XEVARION の mb-char-detail.css の
     両方にそろえてある。ここは<b>MagiBurst と図鑑・ガチャで共通</b>に使う。 */
/* ★ 2026-08-17 スピードだけは km/h に直したぶんを出す。
   ここを素の数値のままにすると、本体が「241 km/h」なのに
   増えたぶんだけ「+40」という、単位のちがう数字が並んでしまう。 */
function arcDelta(st, k) {
  const v = st && st.arc ? (st.arc[k] | 0) : 0;
  return k === "spd" ? spdKmhDelta(v) : v;
}
function arcPlus(st, k) {
  const v = arcDelta(st, k);
  if (v <= 0) return "";
  return '<i class="arcup" title="アーク強化で増えたぶん">+' + fmt(v) + "</i>";
}
/* ══ ★ 2026-08-15 「＋◯◯」を<b>専用の列</b>に分ける ══
   ------------------------------------------------------------
   これまで arcPlus() の札は数値のうしろに<b>くっつけて</b>いた。
   そのため
     ・アークを振った項目だけ行が右に伸びて、3行の数字の右端がそろわない
     ・数字（Orbitron）と札が地続きなので「8500+420」が一続きの数に見える
   という2つの読みにくさがあった。
   → 「素の値」と「アークぶん」を別の列にして、<b>アークを振っていない項目でも
     列の幅は空けたまま</b>にする（＝3行の桁がいつもそろう）。
   ★ arcPlus() は図鑑・ガチャ（mb-char-detail.css）でも使っているので残す。
     こちらは列を作れる画面（キャラ詳細）だけで使う。 */
function arcHas(st) {
  return !!(st && st.arc && ((st.arc.hp | 0) > 0 || (st.arc.atk | 0) > 0 || (st.arc.spd | 0) > 0));
}
function arcCol(st, k) {
  const v = arcDelta(st, k);
  /* 値が0でも空の列を返す（幅を確保して桁をそろえるため） */
  return v > 0
    ? '<span class="arccol" title="アーク強化で増えたぶん"><i class="arcup">+' + fmt(v) + "</i></span>"
    : '<span class="arccol none"></span>';
}
/* ── キャラの強さを0〜100で5項目に評価（ガチャ画面のアニメーションバー用） ──
   全キャラ最大Lv・最大限界突破のステータスを基準に相対評価する。フルバーストの速さ・アビリティ数も加味。 */
let _statMinMax = null;
function statMinMax() {
  if (_statMinMax) return _statMinMax;
  const ids = Object.keys(CHARS);
  const maxOf = (id) => statsOf(id, MAX_LV, MAX_AWK);
  const hp = ids.map((id) => maxOf(id).hp), atk = ids.map((id) => maxOf(id).atk), spd = ids.map((id) => maxOf(id).spd);
  const ss = ids.map((id) => CHARS[id].ssTurns);
  _statMinMax = {
    hp: [Math.min(...hp), Math.max(...hp)], atk: [Math.min(...atk), Math.max(...atk)],
    spd: [Math.min(...spd), Math.max(...spd)], ss: [Math.min(...ss), Math.max(...ss)],
  };
  return _statMinMax;
}
/* ══ ★ 2026-08-16c キラーの「数と等級」を点数にする ══
   これまで skill は<b>アビリティの数</b>だけを見ていたので、
   弱いアビリティを6つ持つ子が、刺さるキラーELを持つ子より高く出ていた。
   キラーは等級（無印 → M → L → EL）で効き目がはっきり違うので、そのぶん重みを付ける。 */
const KILLER_GRADE_W = { "": 1, M: 1.6, L: 2.1, EL: 2.8 };
function killerScore(c) {
  let n = 0, sum = 0;
  const add = (t) => {
    const nm = abilName({ t: t, el: "fire" });     // 属性キラーは名前を作るために el を仮置き
    if (!/キラー|滅殺/.test(nm)) return;
    const g = /EL$/.test(t) ? "EL" : /L$/.test(t) ? "L" : /M$/.test(t) ? "M" : "";
    n++; sum += KILLER_GRADE_W[g] || 1;
  };
  (c.abil || []).forEach((a) => add(a.t));
  /* クロススキルで配られるキラーも数える（条件つきなので少し軽く見る） */
  const d = (typeof CONNECT !== "undefined") ? CONNECT[c.connect] : null;
  if (d) (d.skills || []).forEach((k) => { if (k.abil) { const before = sum; add(k.abil); if (sum > before) sum -= (sum - before) * 0.35; } });
  return { n: n, score: sum };
}
/* ══ ★ 2026-08-17 クエストの「むずかしさ」で重みを付ける ══
   ------------------------------------------------------------
   ただ数を数えていたころは、ギミックが1つしか出ない序盤の部屋と、
   アンチを3種4種そろえないと入れない幽冥の庭園が、どちらも「1つ」だった。
   そのため、序盤に刺さるアンチを1つ持っているだけの子と、
   庭園を通せる子の評価がほとんど変わらなかった。

   重みの決めかた（構造のフラグを見る。diff の文字列は当てにしない）
     幽冥の庭園 (st.garden)  … 6.0   最高難易度・アンチ要求が多い
     高難易度   (st.hi)      … 3.5   王城EX／迷宮の深層・霊層
     降臨       (st.raid)    … 2.5
     禁忌の迷宮 (st.lab)     … 1.8
     そのほか                … 1.0
   これに
     ・奥の部屋ほど ゆるく重く（最大 +50%）
     ・必要なアンチが多い面ほど重く（1種ふえるごとに +35%）
   を掛ける。 */
/* ★★ 2026-08-22b <b>幽冥の庭園と蓬莱の九重は別格</b>に重くする（ご指定）。
   ------------------------------------------------------------
   蓬莱の九重は st.hi しか立てていなかったので、王城EX や迷宮の深層と同じ 3.5 だった。
   ところが蓬莱はアンチを2〜3種そろえないと入れず、しかも殴りが主役＝
   「その1体が入れるかどうか」で攻略できるかが決まる、いちばん重いクエスト群。
   庭園も同じ理由で、ほかの対応力より<b>はっきり高く</b>出るところまで上げる。
     幽冥の庭園 (st.garden) … 6.0 → <b>18.0</b>
     蓬莱の九重 (st.hourai) … 3.5 → <b>22.0</b>（アンチ3種の面もあり、最奥）
     高難易度   (st.hi)     … 3.5（王城EX・迷宮の深層／霊層）
   ★ st.hourai は st.hi も立てているので、<b>hourai を先に見る</b>こと。
   ★★ 実測で決めた数字。12／14 では
     「蓬莱を1つ通せるサユリ（0.0260）」が
     「王城の序盤を8つ通せるヒナ（0.0284）」に負けていた。
     ＝ 難所を1つ抜ける子より、やさしい面をたくさん拾う子のほうが高く出ていた。
     18／22 まで上げると逆転する。<b>ここは必ず実測で確かめること</b>——
     クエストが増えると分母（全クエストの重みの合計）が動くため。 */
function stageWeight(st, needN) {
  let w = st.hourai ? 22 : st.garden ? 18 : st.hi ? 3.5 : st.raid ? 2.5 : st.lab ? 1.8 : 1;
  w *= 1 + Math.min(1, (st.room || 1) / 25) * 0.5;
  w *= 1 + Math.max(0, (needN || 1) - 1) * 0.35;
  return w;
}
/* このキャラが「アンチが足りている」クエストの内訳。
   ------------------------------------------------------------
   ★ 2026-08-17 見ていたのが STAGES（黄昏の王城 30面）だけで、
     <b>禁忌の迷宮も幽冥の庭園も一度も数えていなかった</b>。
     いちばんむずかしいクエストが評価に入っていなかったので、
     charFitQuests と同じ STAGES + LAB_STAGES + GARDEN_STAGES に直す。
   ★ 必要アンチの取り出しは counterKeysOf()、持っているアンチは charAntiKeys()
     を使う（どちらも既にあるもの。地形ぶんのギミックやオムニの肩代わりも
     そちらが面倒を見てくれるので、ここで独自ルールを作らない）。
   rate は「むずかしさで重み付けした割合」で、評価バーはこれを使う。 */
function questCoverStat(c) {
  const all = (typeof STAGES === "undefined") ? [] : STAGES.concat(
    typeof LAB_STAGES !== "undefined" ? LAB_STAGES : [],
    typeof GARDEN_STAGES !== "undefined" ? GARDEN_STAGES : [],
    typeof HOURAI_STAGES !== "undefined" ? HOURAI_STAGES : []);
  const mine = charAntiKeys(c.id);
  let n = 0, total = 0, hardN = 0, hardTotal = 0, got = 0, sum = 0;
  /* ★ 2026-08-22b 幽冥の庭園・蓬莱の九重だけの内わけ（評価でいちばん重く見ている2系統） */
  let topN = 0, topTotal = 0;
  const list = [];
  all.forEach((st) => {
    const keys = counterKeysOf(st);
    if (!keys.length) return;                       // ギミックが無い面は数えない
    const w = stageWeight(st, keys.length);
    /* ★ 2026-08-22b 蓬莱も「高難易度」に数える（st.hi は立っているが、意図を残す） */
    const hard = !!(st.garden || st.hourai || st.hi);
    const top = !!(st.garden || st.hourai);
    total++; sum += w; if (hard) hardTotal++; if (top) topTotal++;
    if (keys.every((k) => mine.indexOf(k) >= 0)) {
      n++; got += w; if (hard) hardN++; if (top) topN++; list.push(st.nm || st.id);
    }
  });
  return { n: n, total: total, hardN: hardN, hardTotal: hardTotal,
           topN: topN, topTotal: topTotal, rate: sum ? got / sum : 0, list: list };
}
/* 名前の一覧だけ欲しいとき（既存の呼び出しをそのまま生かす） */
function questCoverList(c) { return questCoverStat(c).list; }
/* ★ 2026-08-17 バーは「全キャラの中でどのへんか」で出す。
   ぜんぶのクエストを1人で通せる子はほとんどいないので、
   割合をそのまま 0〜100 にすると全員のバーが短くなって見分けがつかない。
   こうげき・たいりょく・スピードが statMinMax() で相対評価しているのと同じそろえ方。 */
/* ★★ 2026-08-22b 割合をそのまま伸ばすと、バーが<b>ほぼ全員 20 付近</b>につぶれる。
   ------------------------------------------------------------
   実測（137体）: 最大 0.54（オムニアンチ持ち）に対して<b>中央値は 0.05</b>。
   分布がここまで片寄っていると、線形に 20〜100 へ写しても
   上位のごく数体だけが伸びて、残りは全部いちばん下に固まってしまう。
   ★ 平方根を通してから写す。低いところが広がるので、
     「1つも通せない子」「1つ通せる子」「庭園まで通せる子」の差が読めるようになる。
   ★ 順番は変わらない（単調な変換なので、強い子ほど高いのはそのまま）。 */
function coverCurve(r) { return Math.sqrt(Math.max(0, r || 0)); }
let _coverMinMax = null;
function coverMinMax() {
  if (_coverMinMax) return _coverMinMax;
  const rs = Object.keys(CHARS).map((id) => coverCurve(questCoverStat(CHARS[id]).rate));
  _coverMinMax = [Math.min(...rs), Math.max(...rs)];
  return _coverMinMax;
}
/* ★★ 2026-08-22b 点数は<b>小数第一位まで</b>出す（ご指定）。
   整数に丸めていたころは、キャラが増えるほど同じ点の子が並んで
   「どっちが上か」が読めなくなっていた（対応力はとくに差が小さい）。
   ★ 表示だけでなく<b>計算そのもの</b>を小数で持つこと。
     丸めてから平均すると、総合力の小数がまた嘘になる。 */
function r1(v) { return Math.round(v * 10) / 10; }
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-24 キャラ評価に <b>MagiTier の評価</b>も加える（ご指定）
   ------------------------------------------------------------
   MagiTier で公開されているキャラTier表（magitier/mbtier）を、
   端末に控えてあるぶん（magiburst_chartier_v1）から<b>同期で</b>読む。
   ・上の段ほど高い点（いちばん上 100 ／ いちばん下 20）。
   ・表が無い／このキャラが表に載っていないときは <b>null</b> を返し、
     評価の項目そのものを出さない（0点にすると「表が無いだけで弱い子」になる）。
   ★ 取りに行くのは mb-char-detail.js（ガチャ・図鑑）と MagiTier 側。
     ここは<b>控えを読むだけ</b>にして、mb-core が通信を持たないようにしている。
   ══════════════════════════════════════════════════════════════ */
const MT_POWER_KEY = "magiburst_chartier_v1";
function mtTable() {
  try {
    const d = JSON.parse(localStorage.getItem(MT_POWER_KEY) || "null");
    return (d && Array.isArray(d.tiers) && d.tiers.length) ? d : null;
  } catch (e) { return null; }
}
function mtRankIdx(d, id) {
  const t = (d && d.tiers) || [];
  for (let i = 0; i < t.length; i++) if ((t[i].ids || []).indexOf(id) >= 0) return { i: i, n: t.length, label: t[i].label || "" };
  return null;
}
/* 20〜100。表が無い／未掲載なら null */
function mtPower(id) {
  const d = mtTable(); if (!d) return null;
  const r = mtRankIdx(d, id); if (!r) return null;
  if (r.n <= 1) return 100;
  return r1(clamp(100 - (r.i / (r.n - 1)) * 80, 20, 100));
}
function charPower(id) {
  const c = CHARS[id], mm = statMinMax(), s = statsOf(id, MAX_LV, MAX_AWK);
  /* ★ 2026-08-17 分母のガードを Math.max(1,…) から「0でなければそのまま」に。
     対応力は 0〜1 の小数なので、1 で割られると差がぜんぶ潰れてしまう。 */
  const scale = (v, r) => r1(clamp((v - r[0]) / ((r[1] - r[0]) || 1) * 78 + 20, 20, 100));
  const abilN = (c.abil || []).length;
  const ks = killerScore(c);
  const qs = questCoverStat(c);
  const out = {
    atk: scale(s.atk, mm.atk),
    hp: scale(s.hp, mm.hp),
    spd: scale(s.spd, mm.spd),
    /* フルバーストは「必要ターンが少ないほど強い」ので反転 */
    ss: r1(clamp((mm.ss[1] - c.ssTurns) / Math.max(1, mm.ss[1] - mm.ss[0]) * 78 + 20, 20, 100)),
    /* スキル＝アビリティの数（半分）＋キラーの数と等級（半分） */
    skill: r1(clamp(abilN / 6 * 40 + ks.score / 5 * 40 + 20, 20, 100)),
    /* 対応力＝アンチが足りているクエストの割合。
       ★ 数ではなく「むずかしさで重み付けした割合」なので、
         庭園を1つ通せるほうが、序盤を5つ通せるより高く出る。 */
    cover: scale(coverCurve(qs.rate), coverMinMax()),
  };
  /* ★ 2026-08-24 MagiTier の評価。<b>あるときだけ</b>項目として足す（ご指定）。
     無いときにキーを作らないのが大事で、そうしておけば
     powerScore も strengthBarsHTML も「あるぶんだけ」で計算・表示できる。 */
  const mt = mtPower(id);
  if (mt != null) out.tier = mt;
  return out;
}
const POWER_LABELS = { atk: "こうげき", hp: "たいりょく", spd: "スピード", ss: "FB発動の速さ", skill: "スキル・キラー", cover: "クエスト対応力",
  /* ★ 2026-08-24 みんなが作った Tier 表の位置。表が公開されていないときは出ない */
  tier: "MagiTier 評価" };
const POWER_COLORS = { atk: "#ff5d47", hp: "#2fbf71", spd: "#38a6ff", ss: "#f0b429", skill: "#c46bff", cover: "#20c9c9", tier: "#ff9d2e" };
/* ★★ 2026-08-22b 総合力も<b>小数第一位まで</b>。
   powerScore() … 6項目の平均を 0〜5 に直したもの（1.0〜5.0）。表示はこれ。
   powerStars() … 光らせる星の数（切り上げないと 4.9 で4つしか光らない）。 */
/* ★ 2026-08-24 <b>ある項目だけ</b>で平均する。
   MagiTier の評価は表が公開されていないと存在しないので、
   キーの数で割ると「表が無いだけで総合力が下がる」ことになってしまう。 */
function powerKeys(p) { return Object.keys(POWER_LABELS).filter((k) => typeof p[k] === "number"); }
function powerScore(p) {
  const ks = powerKeys(p);
  if (!ks.length) return 1;
  const avg = ks.reduce((a, k) => a + p[k], 0) / ks.length;
  return Math.round(clamp(avg / 20, 1, 5) * 10) / 10;
}
function powerStars(p) { return clamp(Math.round(powerScore(p)), 1, 5); }
/* 強さアニメーションのHTML（ゲージが伸びる＋星が光る）。uniqはID衝突回避用 */
function strengthBarsHTML(id, uniq) {
  const p = charPower(id), stars = powerStars(p), score = powerScore(p);
  const keys = powerKeys(p);
  const rows = keys.map((k, i) => {
    const c = POWER_COLORS[k];
    return `<div class="pw-row ${i === keys.length - 1 ? "wide" : ""}">
      <div class="pw-top"><span class="pw-lbl">${POWER_LABELS[k]}</span><span class="pw-num" style="color:${c}">${(p[k]).toFixed(1)}</span></div>
      <div class="pw-track"><i class="pw-fill" style="--pw:${p[k]}%;background:linear-gradient(90deg,${c}aa,${c});animation-delay:${i * 80}ms"></i></div>
    </div>`;
  }).join("");
  const starHTML = Array.from({ length: 5 }, (_, i) =>
    `<span class="pw-star ${i < stars ? "on" : ""}" style="animation-delay:${i * 110}ms">★</span>`).join("");
  /* ★ 2026-08-16c 数字そのものも添える（バーだけだと「何個持っているか」が読めない） */
  const ks = killerScore(CHARS[id]);
  const qs = questCoverStat(CHARS[id]);
  return `<div class="pw-wrap" data-uniq="${uniq || ""}">
    <div class="pw-stars">${starHTML}<span class="pw-rank">総合力 ${score.toFixed(1)}</span></div>
    <div class="pw-facts">キラー <b>${ks.n}</b> 種 ・ アンチが足りているクエスト <b>${qs.n}</b> / ${qs.total}<span class="pwh"> （高難易度 <b>${qs.hardN}</b> / ${qs.hardTotal}${
      /* ★★ 2026-08-22b 幽冥の庭園・蓬莱の九重は評価でいちばん重く見ているので、
         その内わけをここに出す。数字が高い理由が読めるようにするため。 */
      (qs.topN ? " ／ 庭園・蓬莱 <b>" + qs.topN + "</b> / " + qs.topTotal : "")}）</span></div>
    <div class="pw-grid">${rows}</div>
  </div>`;
}
/* バーのアニメを頭から流し直す（ピックアップ切替時に再生） */
function replayStrengthAnim(root) {
  (root || document).querySelectorAll(".pw-fill,.pw-star").forEach((el) => {
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  });
}
/* ── EXP制レベル（レベルが上がるほど必要EXPのボーダーが上がる） ── */
function expNeed(lv) { return 30 + Math.round(Math.pow(lv, 1.35) * 10); }
function gainExp(id, amount) {
  const st = DB.chars[id]; if (!st) return null;
  if (st.exp == null) st.exp = 0;
  const from = st.lv;
  const cap = lvCapOf(id);
  st.exp += Math.round(amount);
  while (st.lv < cap && st.exp >= expNeed(st.lv)) { st.exp -= expNeed(st.lv); st.lv++; }
  if (st.lv >= cap) st.exp = Math.min(st.exp, expNeed(cap));
  return { from, to: st.lv };
}
const TRAIN_COST = 750, TRAIN_EXP = 200;   // とっくん: ゴールド→EXP変換（バトル中は不可。v6.6: コスト引き下げ）

/* ══════════ D: リンク／サブリンクのアイコン描画 ══════════ */
function drawFsGlyph(kind, c, g) {
  const ctx = g || CV_CTX;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2;
  switch (kind) {
    /* ══ v14 フェス5体の新リンクスキル アイコン ══ */
    case "charmplasma":    /* チャームプラズマ（分裂して拡散するプラズマ弾） */
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 7; k++) {
        const a = (Math.PI * 2 / 7) * k - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a) * 7.2 + Math.cos(a + 1.1) * 1.6, Math.sin(a) * 7.2 + Math.sin(a + 1.1) * 1.6);
        ctx.lineTo(Math.cos(a) * 10.2, Math.sin(a) * 10.2);
        ctx.lineWidth = 1.7; ctx.stroke();
        ctx.beginPath(); ctx.arc(Math.cos(a) * 10.2, Math.sin(a) * 10.2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 2; break;
    case "phoenixflare":   /* フェニックスフレア（羽を広げた炎の鳥） */
      ctx.beginPath();
      ctx.moveTo(0, -1.6);
      ctx.quadraticCurveTo(-6, -7.6, -10.4, -2.4);
      ctx.quadraticCurveTo(-5.4, -2.4, -2.4, 1.4);
      ctx.closePath(); ctx.globalAlpha = .35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -1.6);
      ctx.quadraticCurveTo(6, -7.6, 10.4, -2.4);
      ctx.quadraticCurveTo(5.4, -2.4, 2.4, 1.4);
      ctx.closePath(); ctx.globalAlpha = .35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -4.4); ctx.lineTo(2.2, 1.6); ctx.lineTo(0, 8.6); ctx.lineTo(-2.2, 1.6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2.4, 7.4); ctx.lineTo(0, 10.4); ctx.lineTo(2.4, 7.4); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.lineWidth = 2; break;
    case "infinitylaser":  /* インフィニティレーザー（極太ビーム＋八方分裂） */
      ctx.lineWidth = 4.4;
      ctx.beginPath(); ctx.moveTo(-10, 4.4); ctx.lineTo(0.4, -1.4); ctx.stroke();
      ctx.lineWidth = 1.7;
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI / 4) * k + 0.2;
        ctx.beginPath();
        ctx.moveTo(2 + Math.cos(a) * 2.6, -2.4 + Math.sin(a) * 2.6);
        ctx.lineTo(2 + Math.cos(a) * 8.4, -2.4 + Math.sin(a) * 8.4);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(2, -2.4, 2.4, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    case "alllocklaser":   /* ★ 2026-08-06 全敵ロックオンレーザー（1点から3体の照準へビーム） */
      /* 左下の発射点から、3つのロックオン照準（○＋十字）へ極太のビームが伸びる形 */
      [[6.6, -6.4], [8.4, 0.6], [3.4, 6.8]].forEach((q) => {
        ctx.lineWidth = 2.6; ctx.globalAlpha = .85;
        ctx.beginPath(); ctx.moveTo(-8.6, 6.6); ctx.lineTo(q[0], q[1]); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(q[0], q[1], 2.6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(q[0] - 3.8, q[1]); ctx.lineTo(q[0] + 3.8, q[1]);
        ctx.moveTo(q[0], q[1] - 3.8); ctx.lineTo(q[0], q[1] + 3.8); ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(-8.6, 6.6, 2.2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    /* ★ v14.5 ウォールサーキットリングを作り直した。
       旧: ±9.6 の巨大な四角に7個の丸 ＝ 他のリンクアイコンより大幅に大きく、小さいチップでは潰れて読めなかった。
       新: ±6.4 の角丸トラック（＝画面の壁）＋その上をめぐる3つのリング＋進行方向の矢じり。
           他のアイコンと同じ大きさに収まり、「壁沿いをぐるぐる回る」ことがひと目で伝わる。 */
    case "wallcircuit": {
      ctx.setLineDash([]);
      const R = 6.4, rr = 2.0;   /* トラックの半径と角の丸み */
      const track = () => {
        ctx.beginPath();
        ctx.moveTo(-R + rr, -R);
        ctx.lineTo(R - rr, -R); ctx.quadraticCurveTo(R, -R, R, -R + rr);
        ctx.lineTo(R, R - rr);  ctx.quadraticCurveTo(R, R, R - rr, R);
        ctx.lineTo(-R + rr, R); ctx.quadraticCurveTo(-R, R, -R, R - rr);
        ctx.lineTo(-R, -R + rr); ctx.quadraticCurveTo(-R, -R, -R + rr, -R);
        ctx.closePath();
      };
      track(); ctx.lineWidth = 1.4; ctx.globalAlpha = .38; ctx.stroke(); ctx.globalAlpha = 1;
      /* トラック上をめぐる3つのリング（塗り＋白抜きの芯で「輪」に見せる） */
      [[0, -R], [R, R * 0.15], [-R * 0.45, R]].forEach((q) => {
        ctx.beginPath(); ctx.arc(q[0], q[1], 2.5, 0, Math.PI * 2); ctx.lineWidth = 1.9; ctx.stroke();
      });
      /* 進行方向（時計回り）を示す矢じりを右上の角に置く */
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(R - 2.6, -R - 1.9); ctx.lineTo(R + 1.6, -R + 0.4); ctx.lineTo(R - 2.6, -R + 2.7); ctx.stroke();
      ctx.lineWidth = 2; break;
    }
    case "holoxstream":    /* ★ v14.5 ホロックスストリーム（周回するホログラムのシャチ） */
      /* 波（下の2本）＋ シャチのシルエット（上）の2段構成。小さくても「泳ぐ」ことが伝わる形にする */
      ctx.lineWidth = 1.5; ctx.globalAlpha = .5;
      ctx.beginPath();
      ctx.moveTo(-9.5, 6.4); ctx.quadraticCurveTo(-5, 3.8, -1, 6.4); ctx.quadraticCurveTo(3, 9, 7, 6.4); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-9.5, 9.4); ctx.quadraticCurveTo(-5, 6.8, -1, 9.4); ctx.quadraticCurveTo(3, 12, 7, 9.4); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      /* シャチの体（右向き）＋背びれ＋尾びれ */
      ctx.beginPath();
      ctx.moveTo(-8.6, -1.4);
      ctx.quadraticCurveTo(-2.6, -6.2, 6.4, -2.6);
      ctx.quadraticCurveTo(-1.6, 2.4, -8.6, -1.4);
      ctx.closePath(); ctx.globalAlpha = .32; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1.6, -4.6); ctx.lineTo(0.6, -9.2); ctx.lineTo(2.4, -4.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8.6, -1.4); ctx.lineTo(-11.4, -4.6); ctx.lineTo(-10.6, 1.4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(4.6, -3.2, 1, 0, Math.PI * 2); ctx.fillStyle = "#0b1a2a"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    case "autoaimbit":     /* オートエイムビット（味方に追従する4つのビット） */
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (Math.PI / 2) * k + Math.PI / 4;
        const px = Math.cos(a) * 8, py = Math.sin(a) * 8;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const b2 = (Math.PI / 3) * j;
          const qx = px + Math.cos(b2) * 2.5, qy = py + Math.sin(b2) * 2.5;
          if (j === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
        }
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 4.4, py + Math.sin(a) * 4.4);
        ctx.lineWidth = 1.3; ctx.stroke();
      }
      ctx.lineWidth = 2; break;
    case "laser":
      ctx.beginPath(); ctx.moveTo(-6.5, 0); ctx.lineTo(6.5, 0); ctx.moveTo(0, -6.5); ctx.lineTo(0, 6.5); ctx.stroke(); break;
    case "homing":
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill(); break;
    case "spread":
      for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; ctx.beginPath(); ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 1.7, 0, Math.PI * 2); ctx.fill(); } break;
    case "wave":
      ctx.beginPath(); ctx.moveTo(-6.5, 2); ctx.quadraticCurveTo(-3, -5, 0, 0); ctx.quadraticCurveTo(3, 5, 6.5, -2); ctx.stroke(); break;
    case "heal":
      ctx.beginPath(); ctx.moveTo(0, 5.5);
      ctx.bezierCurveTo(-8, -1.5, -4, -7.5, 0, -3);
      ctx.bezierCurveTo(4, -7.5, 8, -1.5, 0, 5.5); ctx.fill(); break;
    case "tri3":
      [-0.55, 0, 0.55].forEach((a) => {
        ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-5 + Math.cos(a - 0.9) * 11, 5 + Math.sin(a - 0.9) * 11); ctx.stroke();
      }); break;
    case "spin":
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0.3, 2.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5.5, Math.PI + 0.3, Math.PI + 2.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill(); break;
    case "ssbullet":
      ctx.beginPath(); ctx.arc(-2, 0, 4.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -2.5); ctx.lineTo(-2, 0); ctx.lineTo(0, 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(7, -2); ctx.moveTo(4, 2); ctx.lineTo(7, 5); ctx.stroke(); break;
    case "tri3follow":
      [-0.5, 0, 0.5].forEach((a) => {
        ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-6 + Math.cos(a - 0.9) * 12, 4 + Math.sin(a - 0.9) * 12); ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(-6, 4, 2, 0, Math.PI * 2); ctx.fill(); break;
    case "luminous":   /* ルミナスレイ: 壁の砲台＋レーザー */
      ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(-7, 7); ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillRect(-6.5, -3, 5, 6);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(7.5, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4.5, -3); ctx.lineTo(8, 0); ctx.lineTo(4.5, 3); ctx.stroke(); break;
    /* ★ 2026-08-08b クロス分身弾はココナのものに統一したので、
       "cross"（ココナ）と "crossclone"（リセラ）は<b>同じ絵</b>にする。
       超強クロス分身弾は分身が増えるので、その数ぶんの点＋外周のリングで描き分ける。 */
    case "cross":
    case "crossclone":       /* クロス分身弾（6体の分身） */
    case "supercrossclone": {  /* 超強クロス分身弾（分身が増えた強化版） */
      const cn = kind === "supercrossclone" ? 10 : 6;
      for (let k = 0; k < cn; k++) {
        const a = (Math.PI * 2 / cn) * k - Math.PI / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        ctx.beginPath(); ctx.arc(dx * 6.6, dy * 6.6, cn > 6 ? 1.8 : 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(dx * 2.4, dy * 2.4); ctx.lineTo(dx * 4.6, dy * 4.6); ctx.lineWidth = 1.6; ctx.stroke();
      }
      if (cn > 6) {   /* 強化版だけ外周のリングを足す */
        ctx.lineWidth = 1.2; ctx.globalAlpha = .7;
        ctx.beginPath(); ctx.arc(0, 0, 9.6, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 2; break;
    }
    case "ring":       /* リバウンドサークル */
      ctx.beginPath(); ctx.arc(-3.5, -2, 4.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(3.5, 2.5, 4.2, 0, Math.PI * 2); ctx.stroke(); break;
    case "kiblast":    /* 連気弾 */
      for (let k = 0; k < 5; k++) { const a = (Math.PI * 2 / 5) * k - 1.2; ctx.beginPath(); ctx.arc(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 1.8, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill(); break;
    case "energycircle":  /* ハイエナジーサークル */
      ctx.beginPath(); ctx.arc(0, 0, 6.8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, Math.PI * 2); ctx.fill(); break;
    case "chargeshot":    /* クイックチャージショット */
      ctx.beginPath(); ctx.arc(-4, 0, 3.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.5, 0); ctx.lineTo(7, 0); ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(4, -3.4); ctx.lineTo(8, 0); ctx.lineTo(4, 3.4); ctx.stroke(); break;
    case "superhiplasma":  /* 超強ハイプラズマ（稲妻を二重に） */
      ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-1, 0); ctx.lineTo(-4, 1); ctx.lineTo(3, 7); ctx.moveTo(1, 0); ctx.lineTo(9, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, 3); ctx.lineTo(-3, 5); ctx.moveTo(3, -5); ctx.lineTo(9, -3); ctx.stroke(); break;
    case "superhicross":   /* 超強ハイクロススティンガー（4方向の折り返し） */
      for (let k = 0; k < 4; k++) {
        const a = [Math.PI, 0, -Math.PI * 0.76, -Math.PI * 0.24][k];
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2.4, Math.sin(a) * 2.4);
        ctx.lineTo(Math.cos(a) * 8.4, Math.sin(a) * 8.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(Math.cos(a) * 8.4, Math.sin(a) * 8.4, 1.6, 0, Math.PI * 2); ctx.fill();
      } break;
    case "superinfinitylaser":  /* ★ 2026-08-17b 超強インフィニティレーザー（極太ビーム＋十二方分裂） */
      ctx.lineWidth = 5.2;
      ctx.beginPath(); ctx.moveTo(-10.5, 4.8); ctx.lineTo(0.6, -1.6); ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let k = 0; k < SINFL_SPLIT_N; k++) {
        const a = (Math.PI * 2 / SINFL_SPLIT_N) * k + 0.16;
        ctx.beginPath();
        ctx.moveTo(2.2 + Math.cos(a) * 2.8, -2.6 + Math.sin(a) * 2.8);
        ctx.lineTo(2.2 + Math.cos(a) * 9.2, -2.6 + Math.sin(a) * 9.2);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(2.2, -2.6, 3.0, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    /* ★ 2026-08-05 ロゼリア／シズカ（どちらも既存の技の強化版なので、元の絵に「+」を足した形にする） */
    case "superluminous":  /* 超強ルミナスレイ（砲台を2基＋極太レーザー） */
      ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-8, 8); ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillRect(-7.5, -6.5, 5, 5); ctx.fillRect(-7.5, 1.5, 5, 5);
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(8, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(8, 4); ctx.stroke();
      ctx.lineWidth = 2; break;
    case "superenergycircle":  /* 超強ハイエナジーサークル（輪を3重に） */
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, 8.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; break;
    case "twininvolute":   /* ツインインボリュートスフィア（2本の螺旋） */
      for (let a2 = 0; a2 < 2; a2++) {
        ctx.beginPath();
        for (let k = 0; k <= 14; k++) {
          const th = k * 0.42, rad = 1.4 + th * 1.5;
          const x = Math.cos(th + Math.PI * a2) * rad, y = Math.sin(th + Math.PI * a2) * rad;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } break;
    case "kiblastex":      /* 超強連気弾（気弾が連なる） */
      for (let k = 0; k < 4; k++) {
        ctx.beginPath(); ctx.arc(-7 + k * 4.6, 5 - k * 3.4, 2.3 - k * 0.25, 0, Math.PI * 2);
        if (k % 2) ctx.stroke(); else ctx.fill();
      } break;
    case "hiplasma":      /* ハイプラズマ */
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 1); ctx.lineTo(3, 6); ctx.moveTo(1, 0); ctx.lineTo(8, -5); ctx.stroke(); break;
    case "plasmanet":     /* プラズマネット（味方4体を結ぶ網） */
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(7, 0); ctx.lineTo(0, 7); ctx.lineTo(-7, 0); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
      [[0, -7], [7, 0], [0, 7], [-7, 0]].forEach((q) => { ctx.beginPath(); ctx.arc(q[0], q[1], 1.7, 0, Math.PI * 2); ctx.fill(); }); break;
    case "absoluteray":   /* ★ v14.1 アブソリュートレイ10（長さちがいの10本が1回転して薙ぎ払う） */
      ctx.beginPath(); ctx.arc(0, 0, 9.6, -2.5, 1.6);
      ctx.lineWidth = 1.4; ctx.globalAlpha = .5; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.lineWidth = 1.9;
      for (let k = 0; k < 10; k++) {
        const a = (Math.PI * 2 / 10) * k - Math.PI / 2;
        const L = [10.4, 5.6, 8.2, 4.4, 9.4, 6.4, 11, 5, 7.6, 8.8][k];
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2.2, Math.sin(a) * 2.2); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(7.4, -6.6); ctx.lineTo(10.2, -6.2); ctx.lineTo(8.6, -3.8); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    case "tri3followsharp":   /* 鋭角三方向追従型貫通弾 */
      [-0.18, 0, 0.18].forEach((a) => { ctx.beginPath(); ctx.moveTo(-6, 3); ctx.lineTo(-6 + Math.cos(a - 0.6) * 13, 3 + Math.sin(a - 0.6) * 13); ctx.stroke(); });
      ctx.beginPath(); ctx.arc(-6, 3, 2, 0, Math.PI * 2); ctx.fill(); break;
    case "supertri3followsharp":   /* ★ 2026-08-10 超強鋭角三方向追従型貫通弾（鋭角版と同じ絵） */
    case "supertri3follow":   /* ★ 2026-08-06 超強三方向追従型貫通弾（太い3本＋二重の光跡） */
      ctx.lineWidth = 2.6;
      [-0.34, 0, 0.34].forEach((a) => { ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(-6 + Math.cos(a - 0.75) * 14, 4 + Math.sin(a - 0.75) * 14); ctx.stroke(); });
      ctx.lineWidth = 1.3; ctx.globalAlpha = .55;
      [-0.34, 0, 0.34].forEach((a) => { ctx.beginPath(); ctx.moveTo(-6 + Math.cos(a - 0.75) * 6, 4 + Math.sin(a - 0.75) * 6); ctx.lineTo(-6 + Math.cos(a - 0.75) * 17, 4 + Math.sin(a - 0.75) * 17); ctx.stroke(); });
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-6, 4, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, 4, 1.2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c; break;
    case "copy":          /* コピー（2枚のカードが重なる＝写し取る） */
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-8, -8, 10, 12, 2) : ctx.rect(-8, -8, 10, 12); ctx.stroke();
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-2, -4, 10, 12, 2) : ctx.rect(-2, -4, 10, 12); ctx.fillStyle = c; ctx.globalAlpha = .35; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(5, 2); ctx.moveTo(1, 5); ctx.lineTo(5, 5); ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = 2; break;
    case "javelin":       /* オートジャベリンバースト（放射する槍） */
      for (let k = 0; k < 6; k++) {
        const a2 = (Math.PI / 3) * k;
        const cx = Math.cos(a2), sy = Math.sin(a2);
        ctx.beginPath(); ctx.moveTo(cx * 2.4, sy * 2.4); ctx.lineTo(cx * 6.4, sy * 6.4); ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx * 9, sy * 9);
        ctx.lineTo(cx * 6 - sy * 2.2, sy * 6 + cx * 2.2);
        ctx.lineTo(cx * 6 + sy * 2.2, sy * 6 - cx * 2.2); ctx.closePath(); ctx.fill();
      }
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 1.7, 0, Math.PI * 2); ctx.fill(); break;
    case "relaycut":      /* リレーションカッター（4点を巡回する刃） */
      ctx.beginPath();
      ctx.moveTo(-7, -5); ctx.lineTo(6, -7); ctx.lineTo(-6, 6); ctx.lineTo(7, 5);
      ctx.lineWidth = 1.6; ctx.stroke(); ctx.lineWidth = 2;
      [[-7, -5], [6, -7], [-6, 6], [7, 5]].forEach((q) => { ctx.beginPath(); ctx.arc(q[0], q[1], 1.8, 0, Math.PI * 2); ctx.fill(); });
      ctx.beginPath(); ctx.moveTo(2, -1); ctx.lineTo(9, -3.4); ctx.lineTo(10.4, 0); ctx.lineTo(9, 3.4); ctx.closePath(); ctx.fill(); break;
    case "bladeorbit":    /* ブレイドオービット（周回する6本の剣） */
      ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, Math.PI * 2); ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 2;
      for (let k = 0; k < 6; k++) {
        const a2 = (Math.PI / 3) * k - Math.PI / 2;
        const cx = Math.cos(a2) * 7.6, sy = Math.sin(a2) * 7.6;
        ctx.save(); ctx.translate(cx, sy); ctx.rotate(a2 + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, -3.4); ctx.lineTo(1.5, 1.4); ctx.lineTo(0, 2.6); ctx.lineTo(-1.5, 1.4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill(); break;
    case "spiral":        /* スパイラルリバウンド（螺旋を描くサークル6基） */
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) { const a = k * 0.35, rr = 0.9 + k * 0.19; const px = Math.cos(a) * rr, py = Math.sin(a) * rr; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill(); break;
    case "spinring":      /* オービタルエッジ（巨大リング7基） */
      ctx.beginPath(); ctx.arc(-2.5, -1.5, 5.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(3, 2.5, 4.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill(); break;
    case "superspinring": /* ★ 2026-08-08 超強オービタルエッジ（刃をまとった特大リング） */
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, 6.2, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.arc(0, 0, 8.6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1.8;
      for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k + 0.25;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * 9.4, Math.sin(a) * 9.4); ctx.stroke(); }
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill(); break;
    case "superchargeshot": /* ★ 2026-08-08 超強クイックチャージショット（3方向へ走る極太の雷） */
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-1, 4); ctx.lineTo(-3, -1); ctx.lineTo(4, -1);
      ctx.lineTo(0, -8); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.globalAlpha = .6;
      ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(6, 8); ctx.moveTo(3, 5); ctx.lineTo(9, 5); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(6.5, -6.5, 2.1, 0, Math.PI * 2); ctx.fill(); break;
    case "hicross":       /* ハイクロススティンガー（左右へ展開する十字の大槍） */
      /* ★ 2026-08-10 「十字の槍が左右へ伸びる」形に描き直した（横棒を足して十字にする）。
         以前はただの両向き矢印で、盤面のエフェクトとも技名とも結びついていなかった。 */
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();                 // 軸
      ctx.beginPath(); ctx.moveTo(-4.5, -4); ctx.lineTo(-4.5, 4); ctx.stroke();           // 左の十字
      ctx.beginPath(); ctx.moveTo(4.5, -4); ctx.lineTo(4.5, 4); ctx.stroke();             // 右の十字
      ctx.beginPath(); ctx.moveTo(-6, -2.6); ctx.lineTo(-9.5, 0); ctx.lineTo(-6, 2.6); ctx.stroke();   // 左の穂先
      ctx.beginPath(); ctx.moveTo(6, -2.6); ctx.lineTo(9.5, 0); ctx.lineTo(6, 2.6); ctx.stroke();      // 右の穂先
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill(); break;
    case "sparkbullet":   /* スパークバレット（30発の拡散する反射弾） */
      for (let k = 0; k < 8; k++) { const a = (Math.PI / 4) * k; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); ctx.lineTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); ctx.stroke(); ctx.beginPath(); ctx.arc(Math.cos(a) * 7.6, Math.sin(a) * 7.6, 1.3, 0, Math.PI * 2); ctx.fill(); }
      break;
    case "powerdrive":   /* パワードライブ（壁沿いに走る強力な貫通衝撃波＝二段矢の突進） */
      ctx.lineWidth = 1.5;   /* 後方のスピードライン */
      ctx.beginPath(); ctx.moveTo(-8.5, -4); ctx.lineTo(-3.5, -4); ctx.moveTo(-8.5, 4); ctx.lineTo(-3.5, 4); ctx.stroke();
      ctx.lineWidth = 3.2;   /* 太い突進バー */
      ctx.beginPath(); ctx.moveTo(-6.5, 0); ctx.lineTo(3.5, 0); ctx.stroke();
      ctx.lineWidth = 2.2;   /* 二段の矢じり（貫通の勢い） */
      ctx.beginPath(); ctx.moveTo(0.5, -4.4); ctx.lineTo(5, 0); ctx.lineTo(0.5, 4.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -4.4); ctx.lineTo(8.5, 0); ctx.lineTo(4, 4.4); ctx.stroke();
      ctx.lineWidth = 2; break;
    case "energyspark":  /* エナジースパーク（円状に広がる火花＝きらめき＋拡散リング） */
      ctx.setLineDash([2.3, 2.6]);   /* 広がるリング */
      ctx.beginPath(); ctx.arc(0, 0, 7.4, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();               /* 中心の4方向スパークル */
      [[0, -6.2], [1.5, -1.5], [6.2, 0], [1.5, 1.5], [0, 6.2], [-1.5, 1.5], [-6.2, 0], [-1.5, -1.5]]
        .forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.closePath(); ctx.fill(); break;
    /* ★ 2026-08-08b 絵が無かったリンクスキルを追加した。
       drawFsGlyph に case が無い fsKind は<b>アイコンが真っ黒（何も描かれない四角）</b>になる。
       リンクスキルを足したら、必ずここにも1つ足すこと。 */
    case "beastcharge": { /* 野獣突撃（敵を追う こぶし型の突進弾3発） */
      ctx.lineWidth = 1.7;
      for (let k = 0; k < 3; k++) {
        const oy = (k - 1) * 5.2, ox = Math.abs(k - 1) * -2.2;
        /* こぶし（角の丸い四角）＋うしろへ引く速度線 */
        ctx.beginPath();
        ctx.moveTo(ox + 0.6, oy - 2.6); ctx.lineTo(ox + 5.2, oy - 2.6);
        ctx.lineTo(ox + 5.2, oy + 2.6); ctx.lineTo(ox + 0.6, oy + 2.6);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(ox - 6.4, oy); ctx.lineTo(ox - 0.8, oy); ctx.stroke();
      }
      /* 先頭のねらいマーク */
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(8.4, 0, 2.6, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2; break;
    }
    case "reflectring":  /* リフレクションリング（壁で1回反射するリング弾） */
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(-3.4, 2.2, 4.4, 0, Math.PI * 2); ctx.stroke();   /* 飛んでいるリング */
      ctx.beginPath(); ctx.arc(-3.4, 2.2, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-10, -8.6); ctx.lineTo(9.4, -8.6); ctx.stroke();   /* 上の壁 */
      /* 壁で跳ね返る軌跡（行き＝実線／帰り＝破線） */
      ctx.beginPath(); ctx.moveTo(-1.2, 4.2); ctx.lineTo(4.6, -7); ctx.stroke();
      ctx.setLineDash([2.4, 2.4]);
      ctx.beginPath(); ctx.moveTo(4.6, -7); ctx.lineTo(9.6, 4.4); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(4.6, -7, 1.3, 0, Math.PI * 2); ctx.fill();   /* 反射する点 */
      ctx.lineWidth = 2; break;
    case "spirallaser":  /* スパイラルレーザー（渦を描いて進むレーザー） */
      ctx.lineWidth = 2.2;
      { const pts = [];
        for (let t = 0; t <= 7.6; t += 0.2) { const rr = 0.7 + t * 0.78; pts.push([Math.cos(t) * rr, Math.sin(t) * rr]); }
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
        const p1 = pts[pts.length - 2], p2 = pts[pts.length - 1];
        const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);   /* 先端の矢じり */
        ctx.beginPath();
        ctx.moveTo(p2[0] - Math.cos(ang - 0.5) * 4, p2[1] - Math.sin(ang - 0.5) * 4);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p2[0] - Math.cos(ang + 0.5) * 4, p2[1] - Math.sin(ang + 0.5) * 4);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 2; break;
    /* ★ 2026-08-12 サーキュレーション（チヅル）: 回りながら広がっていく円。
       内側の小さい輪 → 外側の大きい輪 の二重で「育つ」ことを、
       輪の上の点で「当たり判定が輪そのもの」であることを見せる。 */
    /* ══ ★★ 2026-08-24 GRAND DEBUT Ver.2.0 の5体の新リンクスキル ══
       ★ ここに case が無いと、キャラ詳細・編成・バトルの<b>アイコンが真っ白</b>になる。
         リンクスキルを足したら必ず1つずつ書くこと。 */
    case "crossflamenova":   /* クロスフレイムノヴァ（十字の帯＋中心の大爆発） */
      /* 十字の極太レーザー */
      ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 11); ctx.stroke();
      /* 中心の大爆発（内側のまるい塊＋外へ散る炎） */
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .6;
      ctx.beginPath(); ctx.arc(0, 0, 6.6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (Math.PI / 2) * k;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 5.2, Math.sin(a) * 5.2);
        ctx.lineTo(Math.cos(a) * 9.4, Math.sin(a) * 9.4);
        ctx.lineWidth = 1.9; ctx.stroke();
      }
      ctx.lineWidth = 2; break;
    case "tidalsurge": {     /* タイダルサージ（3つの大波） */
      ctx.lineWidth = 2.2;
      for (let k = 0; k < 3; k++) {
        const y = -6 + k * 6;
        ctx.beginPath();
        ctx.moveTo(-11, y + 2.2);
        ctx.quadraticCurveTo(-5.5, y - 3.4, 0, y + 2.2);
        ctx.quadraticCurveTo(5.5, y + 7.8, 11, y + 2.2);
        ctx.globalAlpha = 1 - k * 0.22;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "noirspiral": {     /* ノワールスパイラル（螺旋にひろがる貫通弾） */
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 3.4;
        const r = 1.6 + (i / 64) * 9.2;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      /* 螺旋の先に飛んでいく弾 */
      for (let k = 0; k < 3; k++) {
        const a = Math.PI * 3.4 - k * 0.9;
        const r = 10.8 - k * 2.6;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 2; break;
    }
    case "verdecyclone": {   /* ヴェルデサイクロン（壁沿いを回る竜巻） */
      /* 外わく（＝壁）と、その上を回る竜巻 */
      ctx.lineWidth = 1.6; ctx.globalAlpha = .5;
      ctx.beginPath(); ctx.rect(-10.4, -10.4, 20.8, 20.8); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.1;
      /* 竜巻（うずまき）を3つ、辺の上に置く */
      const put = (cx, cy) => {
        ctx.beginPath();
        ctx.moveTo(cx - 3.2, cy - 2.6);
        ctx.lineTo(cx + 3.2, cy - 2.6);
        ctx.moveTo(cx - 2.2, cy);
        ctx.lineTo(cx + 2.2, cy);
        ctx.moveTo(cx - 1.1, cy + 2.6);
        ctx.lineTo(cx + 1.1, cy + 2.6);
        ctx.stroke();
      };
      put(0, -10.4); put(10.4, 2); put(-7.4, 9.4);
      ctx.lineWidth = 2; break;
    }
    case "sacredhalo": {     /* セイクリッドヘイロー（2重の輪＋落ちる光の柱） */
      ctx.lineWidth = 1.7; ctx.globalAlpha = .6;
      ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, 9.2, 0, Math.PI * 2); ctx.stroke();
      /* 輪の上の当たり判定 */
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI / 4) * k + 0.2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 9.2, Math.sin(a) * 9.2, 1.3, 0, Math.PI * 2); ctx.fill();
      }
      /* 上から落ちる光の柱 */
      ctx.lineWidth = 3.4; ctx.globalAlpha = .85;
      ctx.beginPath(); ctx.moveTo(0, -11.4); ctx.lineTo(0, -5.2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "circulation": {
      ctx.lineWidth = 1.6; ctx.globalAlpha = .55;
      ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.1;
      ctx.beginPath(); ctx.arc(0, 0, 8.4, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k + 0.26;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 8.4, Math.sin(a) * 8.4, 1.5, 0, Math.PI * 2); ctx.fill();
      }
      /* 回っていることを示す矢じり（外の輪の右上） */
      ctx.lineWidth = 1.9;
      ctx.beginPath(); ctx.moveTo(4.6, -8.6); ctx.lineTo(8.6, -7.1); ctx.lineTo(7.2, -3.2); ctx.stroke();
      ctx.lineWidth = 2; break;
    }
    /* ══ ★★ 2026-08-25 Starlight Academy Fest 2 の5体の新リンクスキル ══
       ★ ここに case が無いと、キャラ詳細・編成・バトルの<b>アイコンが真っ白</b>になる。 */
    case "flamechain": {     /* フレイムチェイン（敵から敵へ飛び火） */
      /* じぐざぐの連鎖線を一筆書きで */
      const ch = [[-10.4, 5.6], [-4.6, -1.2], [0.6, 4.4], [6.2, -3.4], [10.8, 1.8]];
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ch.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.stroke();
      /* 着火点（先へ行くほど大きく＝強くなる） */
      ch.forEach((q, i) => {
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.2 + i * 0.34, 0, Math.PI * 2); ctx.fill();
      });
      ctx.lineWidth = 2; break;
    }
    case "crimsonwaltz": {   /* ★ 2026-08-26b クリムゾンワルツ（旋風＋次のターンにもう一度） */
      /* 渦（うずまき） */
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3.2; a += 0.2) {
        const r = 1.6 + a * 1.55;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      /* 「もう一度」を表す矢印つきの弧（右上） */
      ctx.lineWidth = 1.6; ctx.globalAlpha = .75;
      ctx.beginPath(); ctx.arc(6.6, -7.0, 4.4, -0.4, Math.PI * 1.25); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(9.0, -9.4); ctx.lineTo(10.9, -6.4); ctx.lineTo(7.6, -6.0);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "bluerain": {       /* ★ 2026-08-26b ブルーローズ・レイン（HPの高い敵へ多く降る雨） */
      /* 雨粒（左は少なく、右は多い＝配分がちがうことを見せる） */
      ctx.lineWidth = 1.6;
      const cols = [[-8.0, 1], [-1.0, 2], [6.6, 4]];
      cols.forEach((c0) => {
        for (let k = 0; k < c0[1]; k++) {
          const x = c0[0] + (k - (c0[1] - 1) / 2) * 2.6;
          ctx.beginPath(); ctx.moveTo(x, -11.0); ctx.lineTo(x, -1.6); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, 0.4, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      });
      /* 下に「受ける敵」の大きさのちがい */
      ctx.lineWidth = 1.7; ctx.globalAlpha = .8;
      [[-8.0, 2.0], [-1.0, 3.0], [6.6, 4.4]].forEach((q) => {
        ctx.beginPath(); ctx.arc(q[0], 7.6, q[1], 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "voidcombo": {      /* ★ 2026-08-26b ヴォイド・コンボ（撃つほど刃が増える） */
      /* 扇状の刃。右へ行くほど本数が増える見せかたにする */
      ctx.lineWidth = 1.9;
      [-0.85, -0.5, -0.15, 0.2, 0.55].forEach((a0, i) => {
        ctx.globalAlpha = 0.45 + i * 0.13;
        const a = -Math.PI / 2 + a0;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 3.2, 8.0 + Math.sin(a) * 3.2);
        ctx.lineTo(Math.cos(a) * 12.4, 8.0 + Math.sin(a) * 12.4);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      /* 段を表す小さな階段 */
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-11.0, 9.6); ctx.lineTo(-7.4, 9.6); ctx.lineTo(-7.4, 6.8);
      ctx.lineTo(-4.0, 6.8); ctx.lineTo(-4.0, 4.0);
      ctx.stroke();
      /* 要 */
      ctx.beginPath(); ctx.arc(0, 8.0, 2.0, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    }
    case "cloverfortune": {  /* ★ 2026-08-26b クローバー・フォーチュン（四つ葉が増えていく） */
      /* 四つ葉（ハート4枚をおおまかに） */
      ctx.lineWidth = 1.8;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (Math.PI / 2) * k;
        const cx = Math.cos(a) * 5.0, cy = Math.sin(a) * 5.0;
        ctx.beginPath(); ctx.arc(cx, cy, 3.8, 0, Math.PI * 2); ctx.stroke();
      }
      /* 増えたぶんの薄い葉（外側） */
      ctx.globalAlpha = .5; ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const a = (Math.PI / 2) * k;
        const cx = Math.cos(a) * 9.6, cy = Math.sin(a) * 9.6;
        ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* 中心 */
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    }
    case "petalecho": {      /* ★ 2026-08-26b ペタル・エコー（与えたダメージを写して返す） */
      /* 花びら3枚 */
      ctx.lineWidth = 1.8;
      [[-6.4, -4.6], [1.2, -7.2], [7.4, -2.6]].forEach((p) => {
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.4, 2.0, 0.7, 0, Math.PI * 2); ctx.stroke();
      });
      /* 反響（同じ形が薄く2重に返ってくる） */
      ctx.globalAlpha = .55; ctx.lineWidth = 1.5;
      [[-5.0, 3.4], [2.6, 1.0], [8.6, 5.2]].forEach((p) => {
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 3.0, 1.8, 0.7, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = .32;
      [[-3.4, 9.6], [4.2, 7.6]].forEach((p) => {
        ctx.beginPath(); ctx.ellipse(p[0], p[1], 2.6, 1.6, 0.7, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "rosecage": {       /* ★ 2026-08-26 ローズケージ（外から内へ閉じていく茨の輪） */
      /* 大きい輪 → 小さい輪（3重）。内へ向かう矢で「縮む」ことを見せる */
      [10.6, 7.2, 4.0].forEach((r, i) => {
        ctx.globalAlpha = 0.95 - i * 0.24;
        ctx.lineWidth = 2.2 - i * 0.4;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (Math.PI / 2) * k;
        const x0 = Math.cos(a) * 10.0, y0 = Math.sin(a) * 10.0;
        const x1 = Math.cos(a) * 5.4, y1 = Math.sin(a) * 5.4;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1 - Math.cos(a - 0.6) * 2.6, y1 - Math.sin(a - 0.6) * 2.6);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 - Math.cos(a + 0.6) * 2.6, y1 - Math.sin(a + 0.6) * 2.6);
        ctx.stroke();
      }
      /* 中心の爆ぜる芯 */
      ctx.beginPath(); ctx.arc(0, 0, 2.1, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    }
    case "mirrorbloom": {    /* ★ 2026-08-26 ミラーブルーム（2か所から広がる波紋） */
      /* 左上と右下の2か所に、それぞれ2重の波紋 */
      [[-5.6, -5.0], [5.6, 5.0]].forEach((p, i) => {
        [3.0, 6.2].forEach((r, k) => {
          ctx.globalAlpha = 0.95 - k * 0.32;
          ctx.lineWidth = 2.0 - k * 0.5;
          ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(p[0], p[1], 1.7, 0, Math.PI * 2);
        ctx.fillStyle = i ? c : "#fff"; ctx.fill(); ctx.fillStyle = c;
      });
      /* 点対称であることを示す中心の小さな点と、それを結ぶ線 */
      ctx.globalAlpha = .55; ctx.lineWidth = 1.2;
      ctx.setLineDash([2.2, 2.2]);
      ctx.beginPath(); ctx.moveTo(-5.6, -5.0); ctx.lineTo(5.6, 5.0); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "crossgrave": {     /* ★ 2026-08-26 クロスグレイヴ（貫通した線上に十字の刻印） */
      /* 走った線 */
      ctx.lineWidth = 2.0; ctx.globalAlpha = .6;
      ctx.beginPath(); ctx.moveTo(-11.4, 6.4); ctx.lineTo(11.4, -6.4); ctx.stroke();
      ctx.globalAlpha = 1;
      /* 線の上に並ぶ十字の刻印（先へ行くほど大きい＝数が増えるほど重い） */
      const marks = [[-7.6, 4.3, 2.4], [-1.0, 0.6, 3.2], [6.0, -3.4, 4.2]];
      ctx.lineWidth = 1.9;
      marks.forEach((m) => {
        ctx.beginPath(); ctx.moveTo(m[0] - m[2], m[1]); ctx.lineTo(m[0] + m[2], m[1]); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(m[0], m[1] - m[2]); ctx.lineTo(m[0], m[1] + m[2]); ctx.stroke();
      });
      ctx.lineWidth = 2; break;
    }
    case "peacockfan": {     /* ★ 2026-08-26 ピーコックファン（扇の羽根が壁で分裂して増える） */
      /* 扇の要（下） → 羽根が広がり、外側で枝分かれする */
      ctx.lineWidth = 1.9;
      const base = [-0.5, 0.6, 1.7];   /* 3枚の向き（ラジアン相当の傾き） */
      base.forEach((a0) => {
        const a = -Math.PI / 2 + a0 * 0.42;
        const mx = Math.cos(a) * 6.4, my = 9.0 + Math.sin(a) * 6.4;
        ctx.beginPath(); ctx.moveTo(0, 9.0); ctx.lineTo(mx, my); ctx.stroke();
        /* 分裂した2本 */
        [-0.34, 0.34].forEach((d) => {
          ctx.globalAlpha = .8;
          const bx = mx + Math.cos(a + d) * 7.4, by = my + Math.sin(a + d) * 7.4;
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(bx, by); ctx.stroke();
          ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        });
      });
      /* 要 */
      ctx.beginPath(); ctx.arc(0, 9.0, 2.0, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    }
    case "sunsanctum": {     /* ★ 2026-08-26 ソレイユサンクタム（聖域に降る光の矢） */
      /* 聖域の円 */
      ctx.lineWidth = 1.7; ctx.globalAlpha = .75;
      ctx.beginPath(); ctx.arc(0, 1.4, 10.4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      /* 降る矢（右へ行くほど太い＝あとの矢ほど強い） */
      ctx.lineWidth = 1.6;
      [[-6.2, 1.4], [-1.4, 2.0], [3.6, 2.6], [7.6, 2.4]].forEach((p, i) => {
        ctx.lineWidth = 1.3 + i * 0.45;
        ctx.beginPath(); ctx.moveTo(p[0], -9.6); ctx.lineTo(p[0], p[1]); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p[0] - 1.9, p[1] - 2.1); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + 1.9, p[1] - 2.1);
        ctx.stroke();
      });
      ctx.lineWidth = 2; break;
    }
    case "aquaboomerang": {  /* アクアブーメラン（行って帰ってくる輪刃） */
      /* 輪刃（开いた円） */
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(4.4, -2.2, 5.4, 0.5, 0.5 + Math.PI * 1.55); ctx.stroke();
      /* 行きの矢印 */
      ctx.lineWidth = 1.9;
      ctx.beginPath(); ctx.moveTo(-10.6, 4.6); ctx.lineTo(-1.4, 4.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3.4, 2.7); ctx.lineTo(-1.0, 4.6); ctx.lineTo(-3.4, 6.5); ctx.stroke();
      /* 戻りの矢印（逆向き・薄く） */
      ctx.globalAlpha = .6;
      ctx.beginPath(); ctx.moveTo(10.6, 8.6); ctx.lineTo(1.4, 8.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3.4, 6.7); ctx.lineTo(1.0, 8.6); ctx.lineTo(3.4, 10.5); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "darksingularity": {  /* ノワールシンギュラリティ（引き寄せる重力球） */
      /* 中心の黒い球 */
      ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.fill();
      /* 周回する薄い輪 */
      ctx.lineWidth = 1.4; ctx.globalAlpha = .55;
      ctx.beginPath(); ctx.ellipse(0, 0, 9.6, 4.2, 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      /* 内へ向かう矢印と4つの敵 */
      ctx.lineWidth = 1.8;
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (Math.PI / 2) * k;
        const x0 = Math.cos(a) * 11.2, y0 = Math.sin(a) * 11.2;
        const x1 = Math.cos(a) * 6.0, y1 = Math.sin(a) * 6.0;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1 - Math.cos(a - 0.55) * 3.0, y1 - Math.sin(a - 0.55) * 3.0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 - Math.cos(a + 0.55) * 3.0, y1 - Math.sin(a + 0.55) * 3.0);
        ctx.stroke();
      }
      ctx.lineWidth = 2; break;
    }
    case "verdeseed": {      /* ヴェルデシード（撒いた種が順に芽吹く） */
      /* 芽吹いたもの（左）→ これからの種（右） */
      const seeds = [[-9.2, 5.4, 4.8], [-1.4, -1.2, 3.2], [5.2, 4.2, 2.0], [10.0, -4.6, 1.4]];
      seeds.forEach((q, i) => {
        ctx.globalAlpha = 1 - i * 0.18;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      /* 芽（一番左の種から伸びる葉） */
      ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(-9.2, 5.4); ctx.quadraticCurveTo(-9.6, 0.4, -6.6, -1.8); ctx.stroke();
      ctx.lineWidth = 2; break;
    }
    case "constellation": {  /* ステラコンステレーション（敵どうしを結ぶ星座） */
      const st = [[-9.4, -5.2], [-2.0, 2.6], [5.8, -6.4], [8.8, 4.4], [-4.6, 8.6]];
      /* 線（星どうしを結ぶ） */
      ctx.lineWidth = 1.4; ctx.globalAlpha = .7;
      const link = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [1, 3]];
      link.forEach((L) => {
        ctx.beginPath();
        ctx.moveTo(st[L[0]][0], st[L[0]][1]);
        ctx.lineTo(st[L[1]][0], st[L[1]][1]);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      /* 星（敵） */
      st.forEach((q, i) => {
        ctx.beginPath(); ctx.arc(q[0], q[1], i === 1 ? 2.4 : 1.7, 0, Math.PI * 2); ctx.fill();
      });
      ctx.lineWidth = 2; break;
    }
  }
}
/* サブリンクとして持たれることがあり、<b>リンク版とまったく同じ技</b>なので絵を流用してよいもの。
   ★ サブリンクを新しく足したときは、drawSubGlyph に case を書くか、ここに名前を足すこと。
   ★ drawSubGlyph より<b>前</b>で宣言すること（const は巻き上がらないため）。 */
const SUB_GLYPH_FALLBACK = new Set([
  "wallcircuit",     /* ウォールサーキットリング（カホのサブリンク。これが無くて絵が真っ白だった） */
  "spinring", "superspinring", "twininvolute", "reflectring", "holoxstream",
  "kiblast", "kiblastex", "javelin", "copy", "autoaimbit", "beastcharge",
  "supertri3follow", "supertri3followsharp", "tri3follow", "tri3followsharp",
  "superhiplasma", "superhicross", "superluminous", "superenergycircle",
  "infinitylaser", "superinfinitylaser", "alllocklaser", "superchargeshot", "chargeshot",
]);
/* サブリンクスキルの種類アイコン（ボール左上のチップに交互表示。g を渡せば任意のcanvasへ） */
function drawSubGlyph(kind, c, g) {
  const ctx = g || CV_CTX;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2;
  switch (kind) {
    case "poisoncurrent":  /* ★ v14.5 ポイズンカレント（毒の海流＋渦潮） */
      /* 渦（中心のうずまき）＋ 毒の海流（下の波）＋ 毒のあぶく */
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      for (let k = 0; k <= 34; k++) {
        const a = k / 34 * Math.PI * 3.1;
        const rr = 1.2 + a * 1.05;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.72 - 1.6;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.lineWidth = 1.5; ctx.globalAlpha = .6;
      ctx.beginPath();
      ctx.moveTo(-10, 7.6); ctx.quadraticCurveTo(-5.4, 5, -1.2, 7.6); ctx.quadraticCurveTo(3, 10.2, 7.4, 7.6); ctx.stroke();
      ctx.globalAlpha = 1;
      [[-6.6, 4], [6.2, 3.2], [0.4, 9.6]].forEach((q, i) => {
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.5 - i * 0.25, 0, Math.PI * 2); ctx.fill();
      });
      ctx.lineWidth = 2; break;
    case "starveil": {   /* ★★ 2026-08-22 スターライト・ヴェール（五芒星の帯＋5本のレイが2回転） */
      /* 五芒星（頂点を2つ飛ばしに結ぶ一筆書き） */
      ctx.lineWidth = 1.7; ctx.globalAlpha = .55;
      ctx.beginPath();
      for (let k = 0; k <= 5; k++) {
        const ang = (Math.PI * 2 / 5) * ((k * 2) % 5) - Math.PI / 2;
        const x = Math.cos(ang) * 8.6, y = Math.sin(ang) * 8.6;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
      /* 5本のレイ（星の頂点から外へ） */
      ctx.lineWidth = 2.1;
      for (let k = 0; k < 5; k++) {
        const ang = (Math.PI * 2 / 5) * k - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 3.0, Math.sin(ang) * 3.0);
        ctx.lineTo(Math.cos(ang) * 11.4, Math.sin(ang) * 11.4);
        ctx.stroke();
      }
      /* 2回転を示す二重の弧＋矢じり */
      ctx.lineWidth = 1.3; ctx.globalAlpha = .5;
      ctx.beginPath(); ctx.arc(0, 0, 6.2, -2.6, 1.4); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 4.4, -2.2, 1.8); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(4.2, -4.9); ctx.lineTo(6.9, -4.4); ctx.lineTo(5.4, -2.2); ctx.stroke();
      /* 中心の星芯 */
      ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    }
    case "auroracurtain": {   /* ★★ 2026-08-25 オーロラ・カーテン（上下へ広がる極光の帯） */
      /* 帯（波打つ横線）を上下に3本ずつ。外側の帯ほど薄くして「広がっていく」ことを見せる */
      for (let s = -1; s <= 1; s += 2) {
        for (let k = 0; k < 3; k++) {
          const y = s * (3.0 + k * 3.6);
          ctx.globalAlpha = 0.95 - k * 0.26;
          ctx.lineWidth = 2.4 - k * 0.5;
          ctx.beginPath();
          ctx.moveTo(-11, y);
          ctx.quadraticCurveTo(-5.5, y - s * 1.6, 0, y);
          ctx.quadraticCurveTo(5.5, y + s * 1.6, 11, y);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      /* 往復を示す上下の矢じるし */
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-2.2, -8.6); ctx.lineTo(0, -11.2); ctx.lineTo(2.2, -8.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2.2, 8.6); ctx.lineTo(0, 11.2); ctx.lineTo(2.2, 8.6); ctx.stroke();
      /* 中心（放った本人） */
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    }
    case "bloomingecho": {   /* ★★ 2026-08-26b ブルーミング・エコー（跳ねるたびに花が咲く） */
      /* 跳ね返る道すじ（ジグザグ） */
      const path = [[-11.4, 8.2], [-4.6, -2.0], [2.4, 7.0], [9.6, -3.4]];
      ctx.lineWidth = 1.5; ctx.globalAlpha = .55;
      ctx.beginPath();
      path.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
      ctx.stroke();
      ctx.globalAlpha = 1;
      /* 折り返した点に咲く花（あとの花ほど大きい＝強くなる） */
      ctx.lineWidth = 1.7;
      [[-4.6, -2.0, 2.6], [2.4, 7.0, 3.4], [9.6, -3.4, 4.2]].forEach((q) => {
        for (let k = 0; k < 5; k++) {
          const a = (Math.PI * 2 / 5) * k - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(q[0] + Math.cos(a) * q[2] * 0.62, q[1] + Math.sin(a) * q[2] * 0.62,
            q[2] * 0.48, q[2] * 0.30, a, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      /* 始まり（ふれた味方） */
      ctx.beginPath(); ctx.arc(-11.4, 8.2, 2.0, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    }
    case "afterglowtrail": {  /* ★★ 2026-08-26 アフターグロウ・トレイル（通った道すじが残る） */
      /* 道すじ（うねる線）。うしろほど薄く＝消えていくことを見せる */
      const pts = [[-11.4, 6.8], [-6.6, 2.2], [-1.4, 5.6], [3.6, -0.6], [8.4, -5.8]];
      ctx.lineCap = "round";
      for (let i = 0; i < pts.length - 1; i++) {
        ctx.globalAlpha = 0.30 + i * 0.18;
        ctx.lineWidth = 2.0 + i * 0.6;
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      /* いまの位置（先頭） */
      ctx.beginPath(); ctx.arc(8.4, -5.8, 2.6, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      /* 帯にふれている敵 */
      ctx.lineWidth = 1.5; ctx.globalAlpha = .8;
      ctx.beginPath(); ctx.arc(-1.4, 5.6, 3.4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2; break;
    }
    case "knowledgeresonance": {  /* ★★ 2026-08-26 ノウレッジ・レゾナンス（外ほど強い3重の環） */
      /* 3重の環。外側ほど太く＝外ほど強い */
      [4.0, 7.6, 11.0].forEach((r, i) => {
        ctx.globalAlpha = 0.55 + i * 0.22;
        ctx.lineWidth = 1.3 + i * 0.7;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      /* 中心（ふれた味方） */
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      /* 外へ向かう矢（広がっていく） */
      ctx.lineWidth = 1.5;
      [-Math.PI / 4, Math.PI * 0.75].forEach((a) => {
        const x1 = Math.cos(a) * 12.4, y1 = Math.sin(a) * 12.4;
        ctx.beginPath();
        ctx.moveTo(x1 - Math.cos(a - 0.55) * 3.0, y1 - Math.sin(a - 0.55) * 3.0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 - Math.cos(a + 0.55) * 3.0, y1 - Math.sin(a + 0.55) * 3.0);
        ctx.stroke();
      });
      ctx.lineWidth = 2; break;
    }
    case "absoluteray":   /* ★ v14.1 アブソリュートレイ10（中心から伸びる長さちがいのレイが1回転） */
      /* 回転を表す弧 */
      ctx.beginPath(); ctx.arc(0, 0, 9.6, -2.5, 1.6);
      ctx.lineWidth = 1.4; ctx.globalAlpha = .5; ctx.stroke(); ctx.globalAlpha = 1;
      /* 長さのちがう10本のレイ */
      ctx.lineWidth = 1.9;
      for (let k = 0; k < 10; k++) {
        const ang = (Math.PI * 2 / 10) * k - Math.PI / 2;
        const L = [10.4, 5.6, 8.2, 4.4, 9.4, 6.4, 11, 5, 7.6, 8.8][k];
        ctx.beginPath(); ctx.moveTo(Math.cos(ang) * 2.2, Math.sin(ang) * 2.2);
        ctx.lineTo(Math.cos(ang) * L, Math.sin(ang) * L); ctx.stroke();
      }
      /* 回転の向きを示す矢じり */
      ctx.beginPath(); ctx.moveTo(7.4, -6.6); ctx.lineTo(10.2, -6.2); ctx.lineTo(8.6, -3.8);
      ctx.lineWidth = 1.6; ctx.stroke();
      /* 中心の核 */
      ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.lineWidth = 2; break;
    case "defdownblast":  /* 防御ダウンブラスト（割れた盾＋爆風） */
      ctx.beginPath(); ctx.moveTo(0, -8.4); ctx.lineTo(6.6, -5.4); ctx.lineTo(6.6, 1.6); ctx.lineTo(0, 8.4); ctx.lineTo(-6.6, 1.6); ctx.lineTo(-6.6, -5.4); ctx.closePath();
      ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1.6, -7.4); ctx.lineTo(1.6, -2.4); ctx.lineTo(-1.8, 0.6); ctx.lineTo(1.8, 7.6);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.8; ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const a2 = (Math.PI / 2) * k + Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a2) * 8.6, Math.sin(a2) * 8.6); ctx.lineTo(Math.cos(a2) * 11.4, Math.sin(a2) * 11.4); ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.lineWidth = 2; break;
    case "discharge":     /* 放電（敵から敵へ伝う稲妻） */
      ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-3.5, -2.5); ctx.lineTo(-5.5, 0.5); ctx.lineTo(1, 3.5);
      ctx.lineWidth = 2.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, 3.5); ctx.lineTo(4.5, -1); ctx.lineTo(2.5, -1); ctx.lineTo(9, -6.5);
      ctx.lineWidth = 2.2; ctx.stroke(); ctx.lineWidth = 2;
      [[-9, -6], [1, 3.5], [9, -6.5]].forEach((q, i) => { ctx.beginPath(); ctx.arc(q[0], q[1], 1.6 + i * 0.5, 0, Math.PI * 2); ctx.fill(); });
      break;
    case "nebula":        /* ネビュラスフィア（分裂する渦の球） */
      ctx.beginPath(); ctx.arc(-1.5, 0, 5.6, 0, Math.PI * 2); ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(-1.5, 0, 2.4, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(6.5, -5, 2.8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(7, 5.2, 2.2, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3.4, -2.4); ctx.lineTo(5.2, -4); ctx.moveTo(3.6, 2.4); ctx.lineTo(5.4, 3.8);
      ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = 2; break;
    case "plasma":
      ctx.beginPath(); ctx.moveTo(2.5, -7); ctx.lineTo(-3.5, 0.5); ctx.lineTo(0.5, 0.5); ctx.lineTo(-2, 7); ctx.lineTo(4, -0.8); ctx.lineTo(0, -0.8); ctx.closePath(); ctx.fill(); break;
    case "accel":
      ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(1, -4); ctx.moveTo(-7, 0); ctx.lineTo(4, 0); ctx.moveTo(-7, 4); ctx.lineTo(1, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(7, 0); ctx.lineTo(3, 4); ctx.stroke(); break;
    /* ★ 2026-08-05 リンスピアップ（加速の矢印＋威力アップの上向き矢印）
       ★ SUBFS に足しただけでは絵が出ない。ここと fireSubFriend の両方に足すこと。 */
    /* ★ 2026-08-08 攻スピアップ（こぶし＋速度の線）／クロス分身弾（十字の弾）。
       ★ SUBFS に足しただけでは絵が出ない。ここと fireSubFriend の両方に足すこと。 */
    case "atkspdup":
      ctx.beginPath(); ctx.moveTo(-9, -4); ctx.lineTo(-3, -4); ctx.moveTo(-9, 0); ctx.lineTo(-5, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, -8); ctx.lineTo(6, -8); ctx.lineTo(6, 1); ctx.lineTo(-1, 1); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, 7); ctx.lineTo(1, 3); ctx.lineTo(5, 7); ctx.closePath(); ctx.fill(); break;
    /* ★ 2026-08-08b リンク側（drawFsGlyph）と同じ絵にする。
       同じ技なのに「リンクで見たとき」と「サブリンクで見たとき」で絵がちがうと、
       別の技だと思われてしまう。 */
    case "crossclone":
    case "supercrossclone": {
      const cn = kind === "supercrossclone" ? 10 : 6;
      for (let k = 0; k < cn; k++) {
        const a = (Math.PI * 2 / cn) * k - Math.PI / 2;
        const dx = Math.cos(a), dy = Math.sin(a);
        ctx.beginPath(); ctx.arc(dx * 6.6, dy * 6.6, cn > 6 ? 1.8 : 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(dx * 2.4, dy * 2.4); ctx.lineTo(dx * 4.6, dy * 4.6); ctx.lineWidth = 1.6; ctx.stroke();
      }
      if (cn > 6) {
        ctx.lineWidth = 1.2; ctx.globalAlpha = .7;
        ctx.beginPath(); ctx.arc(0, 0, 9.6, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.lineWidth = 2; break;
    }
    case "linkspeedup":
      ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-1, 2); ctx.moveTo(-8, 6); ctx.lineTo(2, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1, 2); ctx.lineTo(5, 6); ctx.lineTo(1, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(-4, -7); ctx.moveTo(2, -1); ctx.lineTo(2, -7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-4, -9); ctx.lineTo(-1, -5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-1, -5); ctx.lineTo(2, -9); ctx.lineTo(5, -5); ctx.closePath(); ctx.fill(); break;
    /* ★ 2026-08-07 野獣インパクト（こぶし＋加速の線）。
       ★ SUBFS に足しただけでは絵が出ない。ここと fireSubFriend の両方に足すこと。 */
    case "beastimpact":
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-3, -5); ctx.moveTo(-8, 0); ctx.lineTo(-4, 0); ctx.moveTo(-8, 5); ctx.lineTo(-3, 5); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-1, -6); ctx.lineTo(5.5, -6); ctx.lineTo(7.5, -3.5); ctx.lineTo(7.5, 3.5); ctx.lineTo(5.5, 6); ctx.lineTo(-1, 6);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(1.5, -2.6); ctx.lineTo(6.5, -2.6); ctx.moveTo(1.5, 0); ctx.lineTo(6.5, 0); ctx.moveTo(1.5, 2.6); ctx.lineTo(6.5, 2.6);
      ctx.stroke(); break;
    case "blast":
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI / 4) * k, rr = k % 2 ? 3.2 : 7.2;
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill(); break;
    case "phoming":
      ctx.beginPath(); ctx.arc(0, 0, 5.6, 0.5, 5.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(7.5, 0); ctx.lineTo(4, 3); ctx.stroke(); break;
    case "phoming20":  /* ★ 2026-08-12 ピアスシーカー20。12発版に矢じりをもう1枚足した形 */
      ctx.beginPath(); ctx.arc(0, 0, 5.6, 0.5, 5.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7.5, 0); ctx.lineTo(7, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -3); ctx.lineTo(7.5, 0); ctx.lineTo(4, 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.6, -3); ctx.lineTo(4.1, 0); ctx.lineTo(0.6, 3); ctx.stroke(); break;
    case "field":
      ctx.beginPath(); ctx.arc(0, 0, 6.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 4; k++) { const a = Math.PI / 2 * k + 0.4; ctx.beginPath(); ctx.arc(Math.cos(a) * 6.6, Math.sin(a) * 6.6, 1.5, 0, Math.PI * 2); ctx.fill(); } break;
    case "poison":
      ctx.beginPath(); ctx.arc(0, 1.5, 5.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(-1.8, 0.6, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(1.8, 0.6, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2.4, 4); ctx.lineTo(2.4, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7.5); ctx.lineTo(0, -4); ctx.stroke(); break;
    case "bubbly":     /* バブリーギフト */
      ctx.beginPath(); ctx.arc(-2.5, 1, 3.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(3, -1.5, 2.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(2.5, 4, 1.6, 0, Math.PI * 2); ctx.stroke(); break;
    case "boundheal":  /* バウンドヒール */
      ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.lineWidth = 2.4; ctx.stroke(); ctx.lineWidth = 2; break;
    case "weaklock":   /* 弱点ロックオン衝撃波 */
      ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 4; k++) { const a = Math.PI / 2 * k; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5.6, Math.sin(a) * 5.6); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke(); } break;
    case "hitouchray":   /* ハイアタッチレイ（一撃の閃光レイ） */
      ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(6, -6); ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(7, -7); ctx.lineTo(6, -2); ctx.stroke(); break;
    case "pspread5":   /* 貫通拡散弾5 */
      for (let k = 0; k < 5; k++) { const a = (Math.PI * 2 / 5) * k - Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2.5, Math.sin(a) * 2.5); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke(); ctx.beginPath(); ctx.arc(Math.cos(a) * 8, Math.sin(a) * 8, 1.5, 0, Math.PI * 2); ctx.fill(); } break;
    case "pspread3":   /* ★ 2026-08-08 貫通拡散弾3（16方向へ太い弾＋3の刻み） */
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI / 4) * k;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); ctx.lineTo(Math.cos(a) * 7.2, Math.sin(a) * 7.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(Math.cos(a) * 8.4, Math.sin(a) * 8.4, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.lineWidth = 1; ctx.globalAlpha = .6;
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI / 4) * k + Math.PI / 8;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); ctx.lineTo(Math.cos(a) * 6.2, Math.sin(a) * 6.2); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill(); break;
    case "alllock3":   /* 全敵貫通ロックオン衝撃波3（照準を3重に） */
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, 3 + k * 2.4, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-6.5, 0); ctx.moveTo(9, 0); ctx.lineTo(6.5, 0); ctx.stroke(); break;
    case "lock8":      /* 貫通ロックオン衝撃波8（八方の照準） */
      ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 8; k++) { const a = (Math.PI / 4) * k; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5.6, Math.sin(a) * 5.6); ctx.lineTo(Math.cos(a) * 8.4, Math.sin(a) * 8.4); ctx.stroke(); } break;
    case "fbburst4":   /* 乱FB短縮弾（四方へ散る稲妻） */
      for (let k = 0; k < 4; k++) {
        const a = (Math.PI / 2) * k + Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 2.6); ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(1.4, -4); ctx.lineTo(-1.8, 0.4); ctx.lineTo(0.4, 0.4); ctx.lineTo(-1.2, 4); ctx.lineTo(2.2, -0.4); ctx.lineTo(-0.2, -0.4); ctx.closePath(); ctx.fill(); break;
    case "hiplasma":   /* ハイプラズマ */
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 1); ctx.lineTo(3, 6); ctx.moveTo(1, 0); ctx.lineTo(8, -5); ctx.stroke(); break;
    case "divinepillar":   /* ディバインピラー（光の柱） */
      ctx.beginPath(); ctx.moveTo(-3, -7.5); ctx.lineTo(-3, 4); ctx.moveTo(3, -7.5); ctx.lineTo(3, 4); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 5.5, 6.5, 2.2, 0, 0, Math.PI * 2); ctx.stroke(); break;
    case "boundcharge":    /* バウンドチャージ（FB短縮のバウンド弾） */
      ctx.beginPath(); ctx.arc(0, 0, 5.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1.6, -4.5); ctx.lineTo(-2.2, 0.5); ctx.lineTo(0.4, 0.5); ctx.lineTo(-1.4, 4.5); ctx.lineTo(2.4, -0.5); ctx.lineTo(-0.2, -0.5); ctx.closePath(); ctx.fill(); break;
    case "roundcharge":    /* ラウンドチャージ（広がる円） */
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, 6.6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, Math.PI * 2); ctx.fill(); break;
    /* ★ 2026-08-16b ラウンドヒール（ラウンドチャージの回復版）。
       広がる円はチャージ版と同じにして、中身を十字（回復）に変える＝
       一目で「同じ形の技の回復版」と分かるようにする。 */
    case "roundheal":
      ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, 6.6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(0, -2.1); ctx.lineTo(0, 2.1); ctx.moveTo(-2.1, 0); ctx.lineTo(2.1, 0); ctx.stroke();
      ctx.lineWidth = 2; break;
    case "splitpierce":    /* 全敵貫通分裂弾（分裂する貫通矢） */
      ctx.beginPath(); ctx.moveTo(-7.5, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, -4.2); ctx.moveTo(0, 0); ctx.lineTo(7, 4.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -5.4); ctx.lineTo(7.8, -4); ctx.lineTo(5.6, -1.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 5.4); ctx.lineTo(7.8, 4); ctx.lineTo(5.6, 1.3); ctx.stroke(); break;
    case "plasmanova":     /* プラズマノヴァ（自分中心の連続爆発＝ノヴァ） */
      for (let k = 0; k < 8; k++) { const a = (Math.PI / 4) * k; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); ctx.lineTo(Math.cos(a) * 7.6, Math.sin(a) * 7.6); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill(); break;
    /* ★ v15 プラズマネット（カグヤα）: レゼリアのリンクスキルと同じ網。
       drawFsGlyph 側と同じ絵にして、リンクで見ても サブリンクで見ても同じアイコンになるようにする。
       ここに case が無いと canvas に何も描かれず、真っ黒な四角だけが出る。 */
    case "plasmanet":
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(7, 0); ctx.lineTo(0, 7); ctx.lineTo(-7, 0); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
      [[0, -7], [7, 0], [0, 7], [-7, 0]].forEach((q) => { ctx.beginPath(); ctx.arc(q[0], q[1], 1.7, 0, Math.PI * 2); ctx.fill(); }); break;
    /* ══ ★ 2026-08-11 ここに case が無いサブリンクは「絵が真っ白」になっていた ══
       サブリンクの絵は drawSubGlyph、リンクスキルの絵は drawFsGlyph と別々の関数で、
       <b>同じ技でも両方に case を書かないと片方が空っぽ</b>になる。
       カホの<b>ウォールサーキットリング</b>がまさにこれで、リンク版（drawFsGlyph）には
       絵があるのに、サブリンクとして持っているカホのアイコンだけ何も描かれていなかった。
       ・まず同名のリンク版の絵を流用する（＝同じ技なら同じ絵でよい）。
       ・それも無ければ「？」ではなく<b>目印になる小さな菱形</b>を描く。
         真っ白のままだと「壊れている」のか「そういう絵」なのか分からないため。 */
    /* ★ 2026-08-12 ポジションリミット（チヅル）: いちばん近い敵1体をロックオンして撃ちぬく。
       「近いほど強い」を、距離をはかる目盛りと収束する矢で見せる。 */
    case "positionlimit":
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(5.4, 0, 4.6, 0, Math.PI * 2); ctx.stroke();        /* ねらわれている敵 */
      ctx.beginPath(); ctx.arc(5.4, 0, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-7.4, 0, 2.2, 0, Math.PI * 2); ctx.fill();          /* 自分 */
      ctx.beginPath(); ctx.moveTo(-4.8, 0); ctx.lineTo(0.2, 0); ctx.stroke();      /* 距離 */
      ctx.beginPath(); ctx.moveTo(-1.6, -2.4); ctx.lineTo(0.8, 0); ctx.lineTo(-1.6, 2.4); ctx.stroke();
      ctx.lineWidth = 1.3; ctx.globalAlpha = .7;                                    /* 目盛り */
      [-3.4, -1.4, 0.6].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, -3.2); ctx.lineTo(x, 3.2); ctx.stroke(); });
      ctx.globalAlpha = 1; ctx.lineWidth = 2; break;
    default: {
      if (SUB_GLYPH_FALLBACK.has(kind)) { drawFsGlyph(kind, c, ctx); break; }
      ctx.beginPath();
      ctx.moveTo(0, -6.4); ctx.lineTo(6.4, 0); ctx.lineTo(0, 6.4); ctx.lineTo(-6.4, 0); ctx.closePath();
      ctx.lineWidth = 1.9; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
}


/* ══════════ Q: クエスト（ステージ）データと「対応ギミック」の判定 ══════════
   ★ ここを共有しているのは、ガチャのキャラ評価に出る<b>適性クエスト</b>を
     MagiBurst とまったく同じ内容にするため（charFitQuests が STAGES を見ている）。
     バトルの進行そのものは MagiBurst 側にある。 */
/* ══════════ ステージ：黄昏の王城（第1〜20の間） ══════════
   火→水→木→光→闇 の順。全6WAVE構成＝WAVE1〜3が雑魚戦、WAVE4〜6がボス戦。
   20部屋 × 6WAVE ＝ 全120WAVE（WAVE踏破報酬の分母）。
   gim: { dw:{sides:[...],dmg}, mine:{n,dmg}, warp:n } */
const CASTLE_ELS = ["fire", "water", "wood", "light", "dark"];
const CASTLE_NM = { fire: "緋炎", water: "蒼流", wood: "翠嵐", light: "黄金", dark: "常闇" };
/* エーテル登場クエストで即死カウントに上乗せするターン数（エーテル運搬の手数ぶんの猶予）
   v7.5: 猶予が長すぎて緊張感が無かったため 3 → 1 に短縮＝即死が少し早く来る */
const PHOTON_DOOM_BONUS = 1;
function castleGim(i, dmg) {
  if (i === 1) return {};
  if (i === 2) return { warp: 2 };
  /* 第16〜20の間（超高難易度）: 全ギミック＋「エーテル」。ワープも多め。
     エーテル必要数は4で頭打ち（第19・20は撃種限定ブロックが重なるため、これ以上増やすと運搬が破綻する） */
  if (i >= 16) {
    const pn = Math.min(4, i - 14);
    const g = { dw: { sides: ["left", "right", "top"], dmg: Math.round(dmg * 1.2) }, warp: 4, photon: { n: pn, need: pn } };
    if (i >= 17) g.mine = { n: 4, dmg: Math.round(dmg * 1.1) };
    return g;
  }
  const g = {}, m = (i - 1) % 5;
  if (m === 0) g.dw = { sides: i > 8 ? ["left", "right", "top"] : ["left", "right"], dmg };
  if (m === 1) g.warp = i >= 11 ? 3 : 2;
  if (m === 2) g.mine = { n: Math.min(5, 2 + Math.floor(i / 4)), dmg };
  if (m === 3) { g.dw = { sides: ["top"], dmg }; g.warp = i >= 11 ? 3 : 2; }
  if (m === 4) { g.mine = { n: 3, dmg }; g.dw = { sides: ["left", "right"], dmg }; }
  if (i >= 11 && !g.warp) g.warp = 3;   // 終盤はワープも重ねがけ（多め）
  return g;
}
/* ブロック・透明パネル（第3の間から登場、部屋ごとにパターンが変わる） */
function castleTerrain(i) {
  if (i <= 2) return { blocks: [], ghost: [] };
  /* ★ 第19・20の間: 撃種限定ブロック（pass）。
     pass:"bounce" = 反射だけが通れる（青・◇） ／ pass:"pierce" = 貫通だけが通れる（金・→）
     合致しない撃種は普通のブロックとして跳ね返る。アリシアフルバーストの「反射化」で味方全員を
     反射に変えれば青を通せる＝貫通編成でも突破口ができる。
     y は既存パターンと同じ .42 の帯を使い、敵の配置（y=.22〜.56）と噛み合わないようにしている。 */
  if (i >= 19) {
    const blocks = [
      { x: .06, y: .42, w: .36, h: .05, pass: "bounce" },
      { x: .58, y: .42, w: .36, h: .05, pass: "pierce" },
    ];
    if (i >= 20) {
      /* 第20の間はもう1段：上下で通せる撃種が逆になり、反射化のタイミングが問われる */
      blocks.push({ x: .06, y: .66, w: .36, h: .05, pass: "pierce" });
      blocks.push({ x: .58, y: .66, w: .36, h: .05, pass: "bounce" });
      blocks.push({ x: .47, y: .14, w: .06, h: .20 });   // 中央の通常ブロック
    }
    return { blocks, ghost: [{ x: .34, y: .56, w: .32, h: .045, phase: i % 2 }] };
  }
  const v = (i - 1) % 5;
  const patterns = [
    { blocks: [{ x: .06, y: .42, w: .34, h: .05 }, { x: .60, y: .42, w: .34, h: .05 }], ghost: [] },
    { blocks: [], ghost: [{ x: .10, y: .30, w: .34, h: .05, phase: 0 }, { x: .56, y: .30, w: .34, h: .05, phase: 1 }] },
    { blocks: [{ x: .30, y: .14, w: .05, h: .36 }], ghost: [{ x: .60, y: .50, w: .30, h: .05, phase: 0 }] },
    { blocks: [{ x: .65, y: .40, w: .05, h: .30 }], ghost: [{ x: .08, y: .28, w: .30, h: .05, phase: 1 }, { x: .38, y: .58, w: .26, h: .05, phase: 0 }] },
    { blocks: [{ x: .06, y: .44, w: .30, h: .05 }, { x: .64, y: .44, w: .30, h: .05 }, { x: .47, y: .16, w: .06, h: .20 }], ghost: [{ x: .33, y: .60, w: .34, h: .05, phase: 0 }] },
  ];
  const t = patterns[v];
  /* 3周目（第11〜15の間）は透明パネルを1枚追加してさらに複雑に */
  if (i >= 11) return { blocks: t.blocks, ghost: t.ghost.concat([{ x: .36, y: .12, w: .28, h: .045, phase: (i % 2) }]) };
  return t;
}
function castleStage(i) {
  const el = CASTLE_ELS[(i - 1) % 5];
  const hi = i >= 16;                                            // 第16〜18＝超高難易度（HP非常に高い）
  const hpB = Math.round(2300 * Math.pow(1.265, i - 1) * (hi ? 2.3 : 1));   // 16〜18はHP大幅アップ
  const atkB = Math.round(155 * Math.pow(1.145, i - 1) * (hi ? 1.15 : 1));
  const sp = i <= 5 ? "ultra" : i <= 10 ? "omega" : "zenos";     // 部屋が進むほど オメガ→ゼノス
  const sp2 = i <= 5 ? "ultra" : i <= 10 ? "ultra" : "omega";    // 混成用
  const mk = (mult, x, y, o) => Object.assign(
    { el, sp, hp: Math.round(hpB * mult), atk: Math.round(atkB * (o && o.boss ? 1.45 : 1)), cd: 2 + (x > .5 ? 1 : 0), r: 48, x, y }, o || {});
  /* ★ 全クエスト共通の構成: 全6WAVE ＝ WAVE1〜3が雑魚戦、WAVE4〜6がボス戦 */
  let waves;
  if (hi) {
    /* 第16〜18: エーテルシールド持ちの高HP軍団＋重力バリア＋毒攻撃＋雑魚の危険攻撃 */
    waves = [
      /* ── 雑魚戦 ── */
      [mk(1.3, .3, .3, { grav: 120 }), mk(1.3, .7, .24, { poisonAtk: 1 }), mk(1.2, .5, .5, { r: 44, grav: 100 })],
      [mk(1.5, .25, .26, { poisonAtk: 1 }), mk(1.5, .75, .26, { grav: 120, pattern: "laser" }), mk(1.4, .5, .48, { weak: 1 })],
      [mk(1.7, .3, .34, { grav: 130, pattern: "homing" }), mk(1.7, .7, .22, { doomMob: 7, r: 52 }), mk(1.6, .5, .55, { weak: 1, poisonAtk: 1 })],
      /* ── ボス戦 ── */
      [mk(2.9, .5, .27, { boss: 1, weak: 1, r: 74, pattern: "all", doomMax: 8, grav: 140 }), mk(1.5, .16, .52, { r: 46, poisonAtk: 1 }), mk(1.5, .84, .52, { r: 46, grav: 110 })],
      [mk(4.2, .5, .27, { boss: 1, weak: 1, r: 82, pattern: "laser", doomMax: 7, grav: 150 }), mk(1.6, .16, .54, { r: 46, pattern: "homing" }), mk(1.6, .84, .54, { r: 46, doomMob: 7 })],
      [mk(5.6, .5, .28, { boss: 1, weak: 1, r: 90, pattern: "burst", doomMax: 6, doomPow: 0.95, grav: 160 }), mk(1.7, .16, .56, { r: 46, doomMob: 6, pattern: "laser" }), mk(1.7, .84, .56, { r: 46, poisonAtk: 1, pattern: "homing" })],
    ];
  } else {
    waves = [
      /* ── 雑魚戦 ── */
      [mk(1, .3, .3, { sp: sp2 }), mk(1, .7, .24, { sp: sp2 }), ...(i >= 8 ? [mk(0.9, .5, .5, { sp: sp2, r: 44 })] : [])],
      [mk(1.15, .25, .26, { sp: sp2 }), mk(1.15, .75, .26), mk(1.05, .5, .48, { sp: sp2 })],
      [mk(1.35, .3, .34), mk(1.35, .7, .22), mk(1.25, .5, .55, { sp: sp2, weak: i >= 6 ? 1 : 0 })],
      /* ── ボス戦 ── */
      [mk(2.2, .5, .27, { boss: 1, weak: 1, r: 70, pattern: "all", doomMax: 9 }), mk(1.15, .16, .52, { sp: sp2, r: 44 }), ...(i >= 10 ? [mk(1.1, .84, .52, { sp: sp2, r: 44 })] : [])],
      [mk(3.2, .5, .27, { boss: 1, weak: 1, r: 78, pattern: i >= 9 ? "laser" : "all", doomMax: 8 }), mk(1.2, .18, .55, { sp: sp2, r: 44 }), mk(1.2, .82, .55, { sp: sp2, r: 44 })],
      [mk(4.4, .5, .28, { boss: 1, weak: 1, r: 84, pattern: "burst", doomMax: i >= 11 ? 6 : 7 }), mk(1.25, .16, .56, { sp: sp2, r: 44 }), mk(1.25, .84, .56, { sp: sp2, r: 44 })],
    ];
  }
  const t = castleTerrain(i);
  return {
    id: "tk" + i, nm: "黄昏の王城・第" + i + "の間", room: i, diff: hi ? "★EX" + (i - 15) : "★" + Math.min(10, Math.ceil(i * 0.68)),
    /* ★ 2026-08-08b 初クリアのジェムを全体的に下げた（EX 8→5 ／ 5の倍数 5→3 ／ ほか 3→2）。
       先月クリアの引き継ぎを第25の間まで広げたので、同じジェム量のままだと配りすぎになる。 */
    gold: hi ? 5000 + (i - 15) * 1500 : 600 + i * 200, orb: hi ? 5 : (i % 5 === 0 ? 3 : 2), exp: hi ? 1400 + (i - 15) * 300 : 80 + i * 45, bg: (i % 2) ? 1 : 2,
    gim: castleGim(i, Math.round(300 + i * 48)),
    blocks: t.blocks, ghost: t.ghost,
    hi: hi,
    desc: i >= 19
      ? "最難関。" + CASTLE_NM[el] + "の王が守る最奥。<b>反射だけが通れる青ブロック（◇）</b>と<b>貫通だけが通れる金ブロック（→）</b>が道を塞ぐ。<b>反射と貫通の両方を編成に入れて</b>、通せる側で道を開こう。<b>エーテル</b>でシールドを割りつつ、全ギミックを捌け！"
      : hi
      ? "超高難易度。HPが非常に高い" + CASTLE_NM[el] + "の精鋭軍団。<b>エーテル</b>で防御シールドを割りながら、重力バリア・毒攻撃・危険攻撃を突破せよ！"
      : CASTLE_NM[el] + "の軍勢が待ち受ける第" + i + "の間。全6WAVE・WAVE1〜3が雑魚戦、WAVE4〜6がボス戦。",
    waves,
  };
}
/* ── 中間関門（第16〜20の間）: 第15と旧第16の間の難易度差を埋める橋渡しの5部屋。
   ここで新ギミック「ロックゾーン」「内部弱点」を段階的に導入する。ギミックは各部屋2〜3種で偏らせない。 */
function castleMidStage(i) {
  const el = CASTLE_ELS[(i - 1) % 5];
  const hpB = Math.round(2300 * Math.pow(1.265, i - 1) * 1.5);   // 第15〜旧第16の橋渡し
  const atkB = Math.round(155 * Math.pow(1.145, i - 1) * 1.05);
  const sp = "zenos", sp2 = "omega";
  const mk = (mult, x, y, o) => Object.assign(
    { el, sp, hp: Math.round(hpB * mult), atk: Math.round(atkB * (o && o.boss ? 1.45 : 1)), cd: 2 + (x > .5 ? 1 : 0), r: 48, x, y }, o || {});
  const k = i - 15;   // 1..5
  const waves = [
    [mk(1.15, .3, .3, { grav: 110 }), mk(1.15, .7, .24, { sp: sp2 }), mk(1.05, .5, .5, { sp: sp2, r: 44 })],
    [mk(1.35, .25, .26, { sp: sp2 }), mk(1.35, .75, .26, { pattern: k >= 3 ? "laser" : "single" }), mk(1.25, .5, .48, { weak: 1 })],
    [mk(1.55, .3, .34, { grav: 120 }), mk(1.55, .7, .22, { pattern: k >= 4 ? "homing" : "single" }), mk(1.45, .5, .55, { weak: 1 })],
    [mk(2.5, .5, .27, { boss: 1, weak: 1, r: 72, pattern: "all", doomMax: 10, innerWeak: k >= 2 ? 1 : 0 }), mk(1.3, .16, .52, { sp: sp2, r: 46 }), mk(1.3, .84, .52, { sp: sp2, r: 46 })],
    [mk(3.5, .5, .27, { boss: 1, weak: 1, r: 78, pattern: "laser", doomMax: 9, innerWeak: k >= 2 ? 1 : 0 }), mk(1.35, .18, .55, { r: 46, pattern: "homing" }), mk(1.35, .82, .55, { sp: sp2, r: 46 })],
    [mk(4.6, .5, .28, { boss: 1, weak: 1, r: 84, pattern: "burst", doomMax: 8, innerWeak: 1 }), mk(1.4, .16, .56, { sp: sp2, r: 46 }), mk(1.4, .84, .56, { sp: sp2, r: 46 })],
  ];
  /* ギミックは偏らせず各部屋2〜3種。5部屋で dw/warp/mine と新ギミック（lockzone/innerweak）を均等に散らす */
  const gim = {}, dmg = Math.round(300 + i * 46);
  if (k === 1) { gim.dw = { sides: ["left", "right"], dmg }; gim.lockzone = { n: 1 }; }
  if (k === 2) { gim.warp = 3; }
  if (k === 3) { gim.mine = { n: 3, dmg }; gim.lockzone = { n: 2 }; }
  if (k === 4) { gim.dw = { sides: ["top"], dmg }; gim.warp = 2; }
  if (k === 5) { gim.lockzone = { n: 2 }; gim.warp = 3; }
  const terrain = castleTerrain(10 + k);   // 中間は3周目（第11〜15相当）のブロック・透明パネル配置
  return {
    id: "tkm" + i, nm: "黄昏の王城・第" + i + "の間", room: i, diff: "★中" + k,
    gold: 3200 + k * 900, orb: 4, exp: 900 + k * 220, bg: (i % 2) ? 1 : 2,
    gim, blocks: terrain.blocks, ghost: terrain.ghost, hi: false,
    desc: CASTLE_NM[el] + "の精鋭が守る第" + i + "の間（中間関門）。第15と最奥の難易度差を埋める橋渡し。<b>ロックゾーン</b>や<b>内部弱点</b>など新ギミックが登場する。全6WAVE。",
    waves,
  };
}
/* 旧第16〜20の間（超高難易度）を第21〜25の間へ後ろ倒し。難易度・報酬・地形はそのまま、表示だけ繰り下げる */
/* 第21の間以降の「アンチ系ギミック」を、6種（DW・ワープ・地雷・ロックゾーン・エーテル・重力/ブロックは地形＆敵側）
   から部屋ごとに違う組み合わせで振り分ける。同じ組み合わせが連続しないようにする。
   （重力バリア・撃種限定ブロックは敵/地形側で登場するので、gim側では DW/ワープ/地雷/ロックゾーン/エーテルを回す） */
function endgameGimRotation(newRoom) {
  const dmg = Math.round(300 + newRoom * 48);
  /* ★ v10 修正: 第24・25の間は「撃種限定ブロック（地形・無効化不可）」が重なる部屋なので、
     そこへロックゾーンやエーテル4個＋DW3面まで重ねると運搬もリンクも成立せず“詰み”になっていた。
     この2部屋はギミックを2種に絞り、ブロック地形と両立できる組み合わせだけを使う。 */
  const combos = [
    { dw: { sides: ["left", "right"], dmg }, warp: 3, lockzone: { n: 1 } },                                  // 21
    { mine: { n: 4, dmg }, photon: { n: 3, need: 3 }, warp: 3 },                                              // 22
    { dw: { sides: ["top"], dmg: Math.round(dmg * 1.1) }, lockzone: { n: 2 }, photon: { n: 3, need: 3 } },    // 23
    { dw: { sides: ["left", "right"], dmg }, mine: { n: 3, dmg } },                                           // 24（撃種限定ブロックと両立する2種）
    { photon: { n: 3, need: 3 }, warp: 3 },                                                                   // 25（エーテル運搬に集中させる2種）
  ];
  return combos[(newRoom - 21) % combos.length];
}
function relabelCastle(stage, newRoom) {
  return Object.assign({}, stage, { id: "tk" + newRoom, nm: "黄昏の王城・第" + newRoom + "の間", room: newRoom, gim: endgameGimRotation(newRoom) });
}
/* 第1〜25の間のボスに、部屋ごとの固有ボスを割り当てる。
   ★ relabel（第16〜20 → 第21〜25 の作り直し）が終わったあとに走らせること。
     stage.room が最終的な部屋番号になっていないと、同じボスが2部屋に付く。
   ★ 第26〜30の間はミソラ（特別ボス）なので触らない。 */
function assignBosses(list, series) {
  list.forEach((st) => {
    const room = st.room || 0;
    if (room < 1 || room > 25) return;
    const sp = bossForRoom(series, room);
    st.bossSp = sp;                                   // クエスト詳細・カードで参照する
    (st.waves || []).forEach((w) => (w || []).forEach((d) => { if (d && d.boss) d.sp = sp; }));
  });
}

const STAGES = [].concat(
  Array.from({ length: 15 }, (_, k) => castleStage(k + 1)),
  Array.from({ length: 5 }, (_, k) => castleMidStage(16 + k)),
  Array.from({ length: 5 }, (_, k) => relabelCastle(castleStage(16 + k), 21 + k))
);

/* ══════════ アンチギミックの割り当て（v11） ══════════
   「アンチ系アビリティで無効化できるギミック」は次の6種だけ。
     dw（ADW）／warp（AW）／mine（マインスイーパー）／lockzone（アンチロックゾーン）
     block（アンチブロック）／grav（アンチ重力バリア）
   ★ 超特急をのぞく全クエストで、この6種のうち **ちょうど2種まで** に制限し、
     さらに「同じ組み合わせのクエストが並ばない」ようにシリーズごとに配り直す。
   （撃種限定ブロック・透明パネル・撃種変化パネル・エーテル・弱点・即死などは
     アンチ系では消せない＝アンチギミックではないので、この制限の対象外。詳細は🧩ギミック詳細で見る）

   ※ 6種から作れる組み合わせは「なし1＋1種6＋2種15＝22通り」。王城・迷宮は各25部屋あるため、
     22通りを配りきったあとの最後の3部屋だけは、最初に使った組み合わせから最も離れたものを再利用する。 */
/* ★ 2026-08-03: 新アンチギミック「減速壁（slowwall）」を追加。
   アンチ減速壁（aslow）でだけ無効化でき、オムニアンチでは消せない。 */
/* ★ 2026-08-07: 並びは ANTI_ORDER（オムニ → DW → 重力 → ワープ → 地雷 → 減速壁
   → ブロック → ロックゾーン → 断絶界）に統一。ward（断絶界）を新たに加えた。 */
const ANTI_ALL = ANTI_ORDER.slice();
/* 通常ブロックを足す場所を、敵・既存の地形・味方のスタート地点を避けて自動で決める */
function fitPlainBlocks(stage) {
  const CW = 720, CH = 920, TH = 0.05;
  const waves = stage.waves || [];
  const defs = waves.flat ? waves.flat() : [].concat.apply([], waves);
  const occ = defs.filter(Boolean).map((d) => {
    const r = (d.r || 48) * 1.22 + 18;
    return { x0: d.x - r / CW, x1: d.x + r / CW, y0: d.y - r / CH, y1: d.y + r / CH };
  });
  const pad = (b) => ({ x0: b.x - 0.03, x1: b.x + b.w + 0.03, y0: b.y - 0.05, y1: b.y + b.h + 0.05 });
  (stage.blocks || []).forEach((b) => occ.push(pad(b)));
  (stage.ghost || []).forEach((b) => occ.push(pad(b)));
  (stage.swap || []).forEach((s) => occ.push({ x0: s.x - s.r * 2, x1: s.x + s.r * 2, y0: s.y - s.r * 2, y1: s.y + s.r * 2 }));
  for (let i = 0; i < 4; i++) occ.push({ x0: (0.2 + 0.2 * i) - 0.1, x1: (0.2 + 0.2 * i) + 0.1, y0: 0.74, y1: 1 });
  const free = (x, w, y) => !occ.some((o) => x < o.x1 && x + w > o.x0 && y < o.y1 && y + TH > o.y0);
  const routes = [
    [[.06, .32], [.62, .32]],   // 左右2枚（中央に通路）
    [[.30, .40]],               // 中央1枚（左右から回り込む）
    [[.06, .26], [.68, .26]],   // 左右の短い壁
    [[.40, .20]],               // 中央の短い壁
  ];
  for (const route of routes) {
    for (let y = 0.12; y <= 0.68; y += 0.01) {
      if (route.every((seg) => free(seg[0], seg[1], y))) return route.map((seg) => ({ x: seg[0], y, w: seg[1], h: TH, auto: 1 }));
    }
  }
  return [{ x: .32, y: .68, w: .36, h: TH, auto: 1 }];   // どこも空いていなければ下段に1枚
}
/* そのクエストのアンチギミックを、指定の組み合わせ「ちょうどそれだけ」に揃える。
   足りないものは足し、要らないものは取り除く（数値のチューニングは既存の設定を優先して残す）。 */
function setAntiGims(stage, keys) {
  const want = {}; (keys || []).forEach((k) => { want[k] = 1; });
  stage.gim = stage.gim || {};
  const room = stage.room || 10;
  const waves = stage.waves || [];
  const flat = waves.flat ? waves.flat() : [].concat.apply([], waves);
  const dmg = (stage.gim.dw && stage.gim.dw.dmg) || (stage.gim.mine && stage.gim.mine.dmg) || Math.round(300 + room * 48);
  /* ダメージウォール */
  if (want.dw) { if (!stage.gim.dw) stage.gim.dw = { sides: room >= 9 ? ["left", "right", "top"] : ["left", "right"], dmg }; }
  else delete stage.gim.dw;
  /* ワープ */
  if (want.warp) { if (!stage.gim.warp) stage.gim.warp = room >= 11 ? 3 : 2; }
  else delete stage.gim.warp;
  /* 地雷 */
  if (want.mine) { if (!stage.gim.mine) stage.gim.mine = { n: Math.min(5, 2 + Math.floor(room / 4)), dmg }; }
  else delete stage.gim.mine;
  /* ロックゾーン */
  if (want.lockzone) { if (!stage.gim.lockzone) stage.gim.lockzone = { n: room >= 20 ? 2 : 1 }; }
  else delete stage.gim.lockzone;
  /* 減速壁（2026-08-03 新設）
     ★ ダメージウォールと同じ面に置くと、どちらの壁なのか分からなくなる。
       DW が使っていない面から選ぶ（DW が3面のときは残る1面＝bottom）。 */
  if (want.slowwall) {
    if (!stage.gim.slowwall) {
      const used = (stage.gim.dw && stage.gim.dw.sides) || [];
      const pool = ["left", "right", "top", "bottom"].filter((s) => used.indexOf(s) < 0);
      const n = room >= 9 ? 2 : 1;
      stage.gim.slowwall = { sides: (pool.length ? pool : ["bottom"]).slice(0, Math.max(1, Math.min(n, pool.length || 1))) };
    }
  } else delete stage.gim.slowwall;
  /* 通常ブロック（pass 付きの撃種限定ブロックはアンチで消せないので数に入れない＝そのまま残す） */
  if (want.block) {
    if (!(stage.blocks || []).some((b) => !b.pass)) stage.blocks = (stage.blocks || []).concat(fitPlainBlocks(stage));
  } else stage.blocks = (stage.blocks || []).filter((b) => b.pass);
  /* 重力バリア（敵側の特性）。
     ★ バナーに出したギミックは全WAVEで実際に出ていてほしいので、
       「重力バリアを持つ敵がいないWAVE」にだけ1体ぶん足す（すでにいるWAVEはそのまま）。 */
  if (want.grav) {
    const r = 100 + Math.min(70, room * 3);
    waves.forEach((w) => {
      if (w.some((d) => d && d.grav)) return;
      const t = w.find((d) => d && d.boss) || w[0];
      if (t) t.grav = r;
    });
  } else flat.forEach((d) => { if (d && d.grav) delete d.grav; });
  return stage;
}
/* そのクエストに実際に出るアンチギミックの一覧（表示・検証で使う） */
function antiKeysOf(stage) {
  if (stage && stage.gimByWave) {
    const set = new Set();
    stage.gimByWave.forEach((g, w) => {
      const t = (stage.terrainByWave && stage.terrainByWave[w]) || stage;
      antiKeysOf({ gim: g, blocks: t.blocks, waves: stage.waves }).forEach((k) => set.add(k));
    });
    return ANTI_ALL.filter((k) => set.has(k));
  }
  const g = (stage && stage.gim) || {}, keys = [];
  const waves = (stage && stage.waves) || [];
  const flat = waves.flat ? waves.flat() : [].concat.apply([], waves);
  if (g.dw) keys.push("dw");
  if (g.warp) keys.push("warp");
  if (g.mine) keys.push("mine");
  if (g.lockzone) keys.push("lockzone");
  if (g.slowwall) keys.push("slowwall");
  if (g.ward) keys.push("ward");        /* ★ 2026-08-07 断絶界（旧・結界）はアンチギミックになった */
  if ((stage && stage.blocks || []).some((b) => !b.pass)) keys.push("block");
  if (flat.some((d) => d && d.grav)) keys.push("grav");
  return orderAntiKeys(keys);           /* ★ 出す順番はいつも ANTI_ORDER にそろえる */
}
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-04 ボスキャラと「種族」
   ------------------------------------------------------------
   黄昏の王城・禁忌の迷宮の 第1〜25の間 は、これまでボスの見た目が
   雑魚（ウルトラ／オメガ／ゼノス／ヴァルガ）の色ちがいでしかなく、
   「どの部屋のボスだったか」が記憶に残らなかった。
   そこで<b>5体の固有ボス</b>を用意し、部屋ごとに1体を割り当てる。

   ★ 属性は部屋の属性に合わせる（CASTLE_ELS / LAB_ELS のまま）。
     ボスの絵は色を変えず（ヘカーティア・ミソラと同じ扱い）、
     属性は枠色・属性アイコン・弱点表示で見分ける。

   ★ 種族（race）は絵から4つに分けた。
     いまは「クエスト詳細に出す情報」としてだけ使うが、
     <b>種族キラーを実装する前提</b>で、判定に必要なキーはここに集約してある。
     ＝ 種族を増やすときは RACES と BOSSES の2か所だけ直せばよい。
   ══════════════════════════════════════════════════════════════ */
const RACES = {
  arcana:  { nm: "魔導種", ic: "✳", c: "#c9a6ff", desc: "魔法陣を操る術者。玉座から盤面そのものに干渉してくる。" },
  demonia: { nm: "魔族",   ic: "🜏", c: "#ff5d47", desc: "角と棘を持つ魔の王族。真正面からの破壊力がとにかく高い。" },
  wraith:  { nm: "怨霊種", ic: "🥀", c: "#ff5d8f", desc: "紫炎をまとう亡霊。触れたものを蝕み、絡めとる。" },
  nightlord:{ nm: "夜魔種", ic: "🌙", c: "#38a6ff", desc: "夜を統べる貴種。静かに間合いを詰め、一撃で仕留める。" },
  /* ★ 2026-08-05: 種族が決まっていないボスが残っていたので、全ボスぶんを追加した。
     以前は BOSSES に載っている5体だけに種族があり、
     ヘカーティア・ミソラ・ゼノス・ヴァルガ・オメガ・ウルトラは
     クエスト詳細で種族の欄そのものが出なかった。 */
  netherbloom:{ nm: "冥花種", ic: "🌸", c: "#c86bff", desc: "幽冥に咲く花の主。庭ごと相手を絡めとり、静かに枯らす。" },
  astral:   { nm: "星霊種", ic: "✧", c: "#ff8ab5", desc: "最深部にだけ現れる星のうつしみ。可憐な姿のまま、桁ちがいの力を振るう。" },
  abyssal:  { nm: "深淵種", ic: "👁", c: "#8e4fe0", desc: "無数の触手と単眼を持つ深淵の落とし子。盤面のあらゆる方向から迫る。" },
  bladefiend:{ nm: "刃鬼種", ic: "⚔", c: "#a86bff", desc: "茨と刃をまとった鬼神。近づくものをまとめて薙ぎ払う。" },
  dracon:   { nm: "竜鱗種", ic: "🐉", c: "#ff5d8f", desc: "紅蓮の甲殻をまとう古竜の眷属。硬い鱗の奥に核を隠している。" },
  beast:    { nm: "凶獣種", ic: "🦂", c: "#9d7bff", desc: "多脚と棘で武装した凶獣。数で押し、四方から食らいつく。" },
  /* ★ 2026-08-07 蝕魔族（Dominia）。幽冥の庭園 第11〜15ノ園のボスはこの種族。
     冥花種が「庭を枯らす主」なら、こちらは「庭そのものを喰らう者」。
     蝕冥滅殺（eclipseslayerM）は冥花種とこの蝕魔族の両方に効く。 */
  eclipsedemon:{ nm: "蝕魔族", ic: "🌑", c: "#8e4fe0", desc: "幽冥を内側から喰らう蝕の魔。触れたそばから盤面ごと欠けさせていく。" },
  /* ★ 2026-08-17i 蓬莱族。蓬莱の九重に住まう仙。
     二人一組で舞う瑶華＆玉蘭と、九重の頂に座す瑶妃。 */
  houraifolk:{ nm: "蓬莱族", ic: "🏯", c: "#ff9ec4", desc: "雲の上の九重に住まう仙。舞うように間合いを操り、こちらの立ち位置ごと崩してくる。" },
};
/* スプライトのキー → 種族。BOSSES に載っていない敵（庭園・最深部・EX降臨・雑魚兼ボス）ぶん。
   ★ 種族を増やすときに直すのは RACES と BOSSES と、この SP_RACE の3か所だけ。 */
const SP_RACE = {
  hecatia: "netherbloom", misora: "astral",
  zenos: "abyssal", valga: "bladefiend", omega: "dracon", ultra: "beast",
  dominia: "eclipsedemon",   /* ★ 2026-08-07 幽冥の庭園 第11〜15ノ園のボス */
  /* ★ 2026-08-17i 蓬莱の九重。youka は瑶華＆玉蘭の2体ぶんを1枚の絵で表す */
  youka: "houraifolk", youhi: "houraifolk",
};
/* スプライトのキー → 表示名（BOSSES に載っていない敵ぶん） */
const SP_NAME = {
  hecatia: "ヘカーティア", misora: "ミソラ",
  zenos: "ゼノス", valga: "ヴァルガ", omega: "オメガ", ultra: "ウルトラ",
  dominia: "ドミニア",
  youka: "瑶華＆玉蘭", youhi: "瑶妃",
};
const RACE_KEYS = Object.keys(RACES);
/* 5体のボス。sp はスプライトのキー（preload / spThumb / enemyImg が参照する） */
const BOSSES = {
  dominus:  { nm: "ドミナス",   race: "arcana",    img: "e_Dominus.webp",  th: "t_Dominus.webp",
              desc: "玉座に座したまま魔法陣を展開する支配者。" },
  eclipse:  { nm: "エクリプス", race: "demonia",   img: "e_Eclipse.webp",  th: "t_Eclipse.webp",
              desc: "角冠と棘の甲冑をまとう魔王。" },
  inferna:  { nm: "インフェルナ", race: "wraith",  img: "e_Inferna.webp",  th: "t_Inferna.webp",
              desc: "紫炎をまとって嗤う焔の亡霊。" },
  oblivion: { nm: "オブリヴィオン", race: "wraith", img: "e_Oblivion.webp", th: "t_Oblivion.webp",
              desc: "茨の冠をいただく忘却の姫。" },
  umbra:    { nm: "ウンブラ",   race: "nightlord", img: "e_Umbra.webp",    th: "t_Umbra.webp",
              desc: "大聖堂に潜む夜の貴族。" },
};
const BOSS_KEYS = Object.keys(BOSSES);
/* 部屋ごとのボス割り当て。
   ★ 「ランダム」だが、<b>部屋番号から決まる</b>（＝毎回同じ）。
     開くたびに変わると、対策を考えて挑む意味が無くなるため。
     シリーズ名を混ぜているので、王城と迷宮で同じ部屋番号でも別のボスになる。 */
function bossHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function bossForRoom(series, room) {
  return BOSS_KEYS[bossHash(series + ":" + room) % BOSS_KEYS.length];
}
function raceOfSp(sp) { return (BOSSES[sp] && BOSSES[sp].race) || SP_RACE[sp] || null; }
function bossInfo(sp) { return BOSSES[sp] || null; }
/* ボスの表示名（固有ボス5体 → BOSSES ／ それ以外 → SP_NAME）。どちらにも無ければ「ボス」 */
function bossNameOf(sp) { return (BOSSES[sp] && BOSSES[sp].nm) || SP_NAME[sp] || "ボス"; }

/* ── 黄昏の王城 第1〜25の間のアンチギミック（22通りを配りきり、最後の3部屋だけ再利用） ── */
const CASTLE_ANTI = [
  [],                        // 1  導入（アンチギミックなし）
  ["warp"],                  // 2
  ["dw"],                    // 3
  ["mine"],                  // 4
  ["dw", "warp"],            // 5
  ["block"],                 // 6
  ["warp", "mine"],          // 7
  ["dw", "block"],           // 8
  ["dw", "mine"],            // 9
  ["warp", "block"],         // 10
  ["grav"],                  // 11
  ["mine", "block"],         // 12
  ["dw", "grav"],            // 13
  ["block", "grav"],         // 14
  ["warp", "grav"],          // 15
  ["lockzone"],              // 16 中間関門でロックゾーン導入
  ["mine", "grav"],          // 17
  ["dw", "lockzone"],        // 18
  ["block", "lockzone"],     // 19
  ["warp", "lockzone"],      // 20
  ["mine", "lockzone"],      // 21
  ["grav", "lockzone"],      // 22
  ["dw", "warp"],            // 23（22通りを使い切ったので、第5の間から最も離れた組み合わせを再利用）
  ["dw", "mine"],            // 24
  ["warp", "grav"],          // 25
];
STAGES.forEach((s, i) => setAntiGims(s, CASTLE_ANTI[i] || []));

/* ══════════ ステージ：禁忌の迷宮（第1〜20の間） ══════════
   新敵「ヴァルガ」が巣くう迷宮。ギミックは全部盛りではなく部屋ごとに1〜2種をちりばめる。
   名物は「挟み撃ち地形」＝敵と敵の間のせまい隙間。もぐり込めば連続ヒットで大ダメージ！
   攻撃も 単発/全体/バースト/レーザー/ホーミング/毒/危険攻撃 と多彩。
   全6WAVE構成＝WAVE1〜3が雑魚戦、WAVE4〜6がボス戦。20部屋 × 6WAVE ＝ 全120WAVE。
   第16〜20の間は深淵級の超高難易度（撃種限定ブロック＋エーテル＋撃種変化パネルの複合）。 */
const LAB_ELS = ["dark", "fire", "water", "wood", "light"];
const LAB_NM = { dark: "冥暗", fire: "獄炎", water: "深淵", wood: "棘牢", light: "幻光" };
/* 部屋ごとのギミック（2〜3種ずつ組み合わせる。序盤は軽め・奥へ進むほど重ねがけ） */
function labGim(i, dmg) {
  switch (i) {
    case 1: return {};                                          // 導入（挟み撃ち地形に集中）
    case 2: return { warp: 2 };
    case 3: return { dw: { sides: ["top"], dmg }, warp: 2 };
    case 4: return { mine: { n: 3, dmg }, dw: { sides: ["left", "right"], dmg } };
    case 5: return { warp: 2, mine: { n: 2, dmg } };            // 中ボス（＋重力バリア・即死）
    case 6: return { warp: 2, dw: { sides: ["top"], dmg } };    // ＋透明パネル・毒
    case 7: return { warp: 3, mine: { n: 3, dmg } };
    case 8: return { dw: { sides: ["left", "right"], dmg }, warp: 2 };   // ＋反射限定ブロック
    case 9: return { mine: { n: 4, dmg: Math.round(dmg * 1.05) }, dw: { sides: ["top"], dmg }, warp: 2 };
    case 10: return { dw: { sides: ["left", "right", "top"], dmg }, mine: { n: 3, dmg } };   // 中ボス
    case 11: return { photon: { n: 2, need: 2 }, warp: 2, dw: { sides: ["left", "right"], dmg } };
    case 12: return { warp: 3, mine: { n: 3, dmg } };           // ＋レーザー/ホーミング
    case 13: return { warp: 3, dw: { sides: ["top"], dmg: Math.round(dmg * 1.05) } };   // ＋貫通限定ブロック・透明パネル・毒
    case 14: return { dw: { sides: ["left", "right", "top"], dmg: Math.round(dmg * 1.1) }, mine: { n: 3, dmg }, warp: 2 };
    case 15: return { photon: { n: 2, need: 2 }, dw: { sides: ["left", "right"], dmg: Math.round(dmg * 1.1) }, warp: 2 };   // 最深部ヴァルガ
  }
  /* ── 第16〜20の間（深淵級）──
     エーテル運搬を軸に、DW・ワープ・地雷を段階的に重ねる。
     エーテル必要数は4で頭打ち（撃種限定ブロックと重なるため、これ以上は運搬が破綻する）。 */
  if (i >= 16) {
    const pn = Math.min(4, i - 14);
    const g = {
      photon: { n: pn + 1, need: pn },
      dw: { sides: i >= 18 ? ["left", "right", "top"] : ["left", "right"], dmg: Math.round(dmg * 1.2) },
      warp: i >= 19 ? 4 : 3,
    };
    if (i >= 17) g.mine = { n: 4, dmg: Math.round(dmg * 1.15) };
    return g;
  }
  return {};
}
/* 部屋ごとの地形（ブロック・透明パネル・撃種限定ブロック・撃種変化パネル） */
function labTerrain(i) {
  if (i === 6) return { blocks: [], ghost: [{ x: .12, y: .34, w: .32, h: .05, phase: 0 }, { x: .56, y: .34, w: .32, h: .05, phase: 1 }] };
  if (i === 8) return { blocks: [{ x: .30, y: .46, w: .40, h: .05, pass: "bounce" }], ghost: [] };
  if (i === 13) return { blocks: [{ x: .30, y: .46, w: .40, h: .05, pass: "pierce" }], ghost: [{ x: .34, y: .18, w: .32, h: .045, phase: 0 }] };
  if (i === 14) return { blocks: [{ x: .06, y: .40, w: .28, h: .05 }, { x: .66, y: .40, w: .28, h: .05 }], ghost: [] };
  /* ── 第16〜20の間（深淵級）: 撃種を使い分けて突破する複合地形。
       ・撃種限定ブロック（青◇＝反射のみ／金→＝貫通のみ）で通路を左右に分断
       ・撃種変化パネル（swap）を踏んで撃種を入れ替え、反対側の通路をこじ開ける
       ・透明パネルが交互に点滅して安全地帯を潰す
     ＝「どの撃種で・どの順番で・どこを通るか」を組み立てさせる構成。 */
  if (i >= 16) {
    const blocks = [], ghost = [], swap = [];
    /* 第16: 左右分断の1段。まずは撃種変化パネルで反対側へ渡る基本を覚えさせる */
    blocks.push({ x: .04, y: .44, w: .40, h: .05, pass: "bounce" });
    blocks.push({ x: .56, y: .44, w: .40, h: .05, pass: "pierce" });
    swap.push({ x: .47, y: .60, r: .045 });
    if (i >= 17) {
      /* 第17: 2段目が逆の撃種＝1回の変化では両方は抜けられない（往復が必要） */
      blocks.push({ x: .04, y: .68, w: .40, h: .05, pass: "pierce" });
      blocks.push({ x: .56, y: .68, w: .40, h: .05, pass: "bounce" });
      swap.push({ x: .47, y: .30, r: .045 });
    }
    if (i >= 18) {
      /* 第18: 中央に通常ブロックの柱を追加＝左右の行き来を強制 */
      blocks.push({ x: .465, y: .12, w: .07, h: .16 });
      ghost.push({ x: .30, y: .56, w: .40, h: .045, phase: 0 });
    }
    if (i >= 19) {
      /* 第19: 透明パネルを交互点滅で2枚＝止まれる場所がターンごとに変わる */
      ghost.push({ x: .06, y: .26, w: .34, h: .045, phase: 1 });
      ghost.push({ x: .60, y: .26, w: .34, h: .045, phase: 0 });
      swap.push({ x: .12, y: .12, r: .04 });
      swap.push({ x: .88, y: .12, r: .04 });
    }
    if (i >= 20) {
      /* 第20: 最深部。3段目の限定ブロックでエーテル運搬路をさらに絞る */
      blocks.push({ x: .04, y: .20, w: .30, h: .05, pass: "bounce" });
      blocks.push({ x: .66, y: .20, w: .30, h: .05, pass: "pierce" });
      ghost.push({ x: .34, y: .78, w: .32, h: .045, phase: 1 });
    }
    return { blocks, ghost, swap };
  }
  return { blocks: [], ghost: [] };
}
function labStage(i) {
  const el = LAB_ELS[(i - 1) % 5];
  const deep = i >= 13 && i <= 15;                                       // 最深部（13〜15）
  const rei = i >= 16;                                                   // 深淵級（16〜20）
  const hpB = Math.round(2400 * Math.pow(1.245, i - 1) * (deep ? 1.3 : 1) * (rei ? 2.4 : 1));
  const atkB = Math.round(150 * Math.pow(1.135, i - 1) * (deep ? 1.1 : 1) * (rei ? 1.18 : 1));
  const sp = i <= 4 ? "ultra" : i <= 9 ? "omega" : "zenos";              // 支援役の種別
  const mk = (mult, x, y, o) => Object.assign(
    { el, sp: "valga", hp: Math.round(hpB * mult), atk: Math.round(atkB * (o && o.boss ? 1.45 : 1)), cd: 2 + (x > .5 ? 1 : 0), r: 48, x, y }, o || {});
  /* 挟み撃ちペア: x .35/.65・同じ高さ・r44。
     間の隙間 ≒ 108px ＝ ボール直径(90px)+18px → もぐり込めてカンカン跳ねる絶妙な幅。
     （旧 .38/.62 は隙間65pxでボールが物理的に入れなかった） */
  const pair = (mult, y, o) => [mk(mult, .35, y, Object.assign({ r: 44 }, o || {})), mk(mult, .65, y, Object.assign({ r: 44 }, o || {}))];
  const boss = i % 5 === 0 && i <= 10;
  /* ★ 全6WAVE構成 ＝ WAVE1〜3が雑魚戦、WAVE4〜6がボス戦 */
  let waves;
  if (rei) {
    /* ── 第16〜20の間（深淵級）──
       撃種の使い分けが鍵になる複合構成。
         雑魚戦   : 重力バリア＋毒＋レーザー/ホーミングを重ね、エーテル運搬を妨害してくる
         ボス戦   : エーテルシールド持ちの高HPボスが3連戦。側近が即死・毒・レーザーで削る
       撃種限定ブロックと撃種変化パネル（labTerrain）を組み合わせて道を作りながら戦う。 */
    const dm = 20 - i;   // 奥ほど即死カウントが短い
    waves = [
      /* ── 雑魚戦 ── */
      [...pair(1.2, .34, { grav: 110 }), mk(1.1, .5, .14, { sp, pattern: "laser", poisonAtk: 1 })],
      [mk(1.4, .25, .26, { pattern: "homing", grav: 120 }), mk(1.4, .75, .26, { pattern: "laser" }), mk(1.3, .5, .5, { weak: 1, poisonAtk: 1 })],
      [...pair(1.6, .3, { doomMob: 6 + dm, grav: 120 }), mk(1.5, .5, .56, { weak: 1, pattern: "homing", poisonAtk: 1 })],
      /* ── ボス戦（3連戦） ── */
      [mk(3.0, .5, .27, { boss: 1, weak: 1, r: 76, pattern: "all", doomMax: 8, grav: 140 }), ...pair(1.5, .56, { sp, poisonAtk: 1 })],
      [mk(4.4, .5, .27, { boss: 1, weak: 1, r: 84, pattern: "laser", doomMax: 7, grav: 150 }),
       mk(1.7, .14, .54, { r: 46, pattern: "homing" }), mk(1.7, .86, .54, { r: 46, doomMob: 6 })],
      [mk(6.4, .5, .28, { boss: 1, weak: 1, r: 96, pattern: "burst", doomMax: Math.max(5, 7 - (i - 16)), doomPow: 0.95, grav: 165 }),
       mk(1.9, .14, .56, { r: 46, pattern: "laser", poisonAtk: 1 }), mk(1.9, .86, .56, { r: 46, pattern: "homing", doomMob: 6 })],
    ];
  } else if (i === 15) {
    /* 最深部: ヴァルガの王。エーテルシールド＋即死＋レーザー/ホーミングの側近 */
    waves = [
      [...pair(1.5, .36), mk(1.4, .5, .16, { sp, pattern: "laser" })],
      [mk(1.7, .3, .3, { pattern: "homing" }), mk(1.7, .7, .3, { pattern: "laser" }), mk(1.6, .5, .55, { weak: 1, poisonAtk: 1 })],
      [...pair(1.9, .3, { doomMob: 8 }), mk(1.8, .5, .55, { weak: 1 })],
      [mk(3.0, .5, .27, { boss: 1, weak: 1, r: 76, pattern: "all", doomMax: 9 }), ...pair(1.6, .55, { sp })],
      [mk(4.4, .5, .27, { boss: 1, weak: 1, r: 84, pattern: "laser", doomMax: 8 }), mk(1.7, .16, .55, { r: 46, pattern: "homing" })],
      [mk(6.0, .5, .28, { boss: 1, weak: 1, r: 94, pattern: "burst", doomMax: 7, doomPow: 0.95 }), mk(1.8, .16, .56, { pattern: "laser", r: 46 }), mk(1.8, .84, .56, { pattern: "homing", r: 46 })],
    ];
  } else if (boss) {
    /* 中ボス（5・10の間）: 重力バリア＆即死持ち */
    waves = [
      [...pair(1.1, .34), mk(1.0, .5, .55, { sp, r: 44 })],
      [mk(1.25, .25, .26, { grav: 120 }), mk(1.25, .75, .26, { pattern: i >= 10 ? "homing" : "all" }), mk(1.15, .5, .5, { sp })],
      [...pair(1.4, .3, { poisonAtk: i >= 10 ? 1 : 0 }), mk(1.3, .5, .55, { weak: 1 })],
      [mk(2.2, .5, .27, { boss: 1, weak: 1, r: 72, pattern: "all", doomMax: 9, grav: 140 }), mk(1.2, .16, .52, { sp, r: 44 })],
      [mk(3.2, .5, .27, { boss: 1, weak: 1, r: 78, pattern: i >= 10 ? "homing" : "all", doomMax: 8 }), ...pair(1.25, .55, { sp })],
      [mk(4.2, .5, .28, { boss: 1, weak: 1, r: 86, pattern: "burst", doomMax: 8 }), ...pair(1.3, .56, { sp })],
    ];
  } else {
    /* 通常の間: 挟み撃ちペアを軸に、部屋テーマの攻撃（レーザー/ホーミング/毒）を散らす */
    const themed = i === 3 || i === 12 ? "laser" : i === 4 || i === 9 || i === 12 ? "homing" : null;
    const poisoned = i === 6 || i === 13 ? 1 : 0;
    waves = [
      [...pair(1, .34), ...(i >= 7 ? [mk(0.9, .5, .14, { sp, r: 44 })] : [])],
      [mk(1.15, .25, .26, { pattern: themed || "single", poisonAtk: poisoned }), mk(1.15, .75, .26, { sp }), mk(1.05, .5, .5, { weak: i >= 4 ? 1 : 0 })],
      [...pair(1.3, .3, { pattern: i === 12 ? "laser" : "single" }), mk(1.2, .5, .56, { sp, poisonAtk: poisoned })],
      [mk(2.0, .5, .27, { boss: 1, weak: 1, r: 68, pattern: "all", doomMax: 9 }), ...pair(1.15, .55, { sp })],
      [mk(2.9, .5, .27, { boss: 1, weak: 1, r: 76, pattern: themed || "all", doomMax: 9 }), mk(1.2, .16, .55, { sp, r: 44 })],
      [mk(3.8, .5, .28, { boss: 1, weak: 1, r: 82, pattern: "burst", doomMax: 8 }), mk(1.25, .16, .56, { sp, r: 44, pattern: themed || "single" }), mk(1.25, .84, .56, { sp, r: 44 })],
    ];
  }
  const t = labTerrain(i);
  return {
    id: "lb" + i, nm: "禁忌の迷宮・第" + i + "の間", room: i, lab: 1,
    diff: rei ? "★深" + (i - 15) : deep ? "★迷" + (i - 12) : "★" + Math.min(11, 3 + Math.ceil(i * 0.6)),
    gold: rei ? 6000 + (i - 15) * 1600 : 900 + i * 260,
    /* ★ 2026-08-08b 初クリアのジェムを全体的に下げた（深部 9→6 ／ ボス 6→4 ／ ほか 4→3） */
    orb: rei ? 6 : (boss || i === 15 ? 4 : 3),
    exp: rei ? 1600 + (i - 15) * 320 : 120 + i * 65,
    bgKey: "lab",
    bgm: "forbidden-labyrinth.mp3",
    gim: labGim(i, Math.round(320 + i * 50)),
    blocks: t.blocks, ghost: t.ghost, swap: t.swap || [],
    hi: deep || rei,
    desc: rei
      ? "<b>深淵級</b>。<b>反射だけが通れる青ブロック（◇）</b>と<b>貫通だけが通れる金ブロック（→）</b>が道を分断する。<b>撃種変化パネル（⇄）</b>を踏んで撃種を入れ替え、<b>エーテル</b>を運んでシールドを割れ。ボスは3連戦——重力バリア・毒・即死攻撃を捌き切れるか。"
      : i === 15
      ? "最深部。<b>ヴァルガの王</b>が待つ。エーテルシールド・即死攻撃・レーザーとホーミングの側近——<b>挟み撃ち地形にもぐり込んで</b>削り切れ！"
      : LAB_NM[el] + "のヴァルガがうごめく第" + i + "の間。<b>敵と敵の狭い隙間にもぐり込む</b>と連続ヒットの大チャンス！",
    waves,
  };
}
/* ── 禁忌の迷宮 中間関門（第16〜20の間）: 最深部と深淵級の間を埋める橋渡し。ロックゾーン・内部弱点を導入 ── */
function labMidStage(i) {
  const el = LAB_ELS[(i - 1) % 5];
  const hpB = Math.round(2400 * Math.pow(1.245, i - 1) * 1.55);
  const atkB = Math.round(150 * Math.pow(1.135, i - 1) * 1.07);
  const sp = "zenos";
  const mk = (mult, x, y, o) => Object.assign({ el, sp: "valga", hp: Math.round(hpB * mult), atk: Math.round(atkB * (o && o.boss ? 1.45 : 1)), cd: 2 + (x > .5 ? 1 : 0), r: 48, x, y }, o || {});
  const pair = (mult, y, o) => [mk(mult, .35, y, Object.assign({ r: 44 }, o || {})), mk(mult, .65, y, Object.assign({ r: 44 }, o || {}))];
  const k = i - 15;
  const waves = [
    [...pair(1.2, .34, { grav: 110 }), mk(1.05, .5, .14, { sp, pattern: "single" })],
    [mk(1.35, .25, .26, { pattern: k >= 3 ? "laser" : "single" }), mk(1.35, .75, .26, {}), mk(1.25, .5, .5, { weak: 1 })],
    [...pair(1.55, .3, { doomMob: 9 }), mk(1.45, .5, .56, { weak: 1, pattern: k >= 4 ? "homing" : "single" })],
    [mk(2.6, .5, .27, { boss: 1, weak: 1, r: 74, pattern: "all", doomMax: 10, innerWeak: k >= 2 ? 1 : 0 }), ...pair(1.35, .56)],
    [mk(3.7, .5, .27, { boss: 1, weak: 1, r: 82, pattern: "laser", doomMax: 9, innerWeak: k >= 2 ? 1 : 0 }), mk(1.4, .14, .54, { r: 46, pattern: "homing" }), mk(1.4, .86, .54, { r: 46 })],
    [mk(4.9, .5, .28, { boss: 1, weak: 1, r: 90, pattern: "burst", doomMax: 8, innerWeak: 1 }), ...pair(1.45, .56)],
  ];
  const gim = {}, dmg = Math.round(320 + i * 48);
  if (k === 1) { gim.warp = 2; gim.lockzone = { n: 1 }; }
  if (k === 2) { gim.dw = { sides: ["top"], dmg }; gim.warp = 2; }
  if (k === 3) { gim.mine = { n: 3, dmg }; gim.lockzone = { n: 2 }; }
  if (k === 4) { gim.warp = 3; }
  if (k === 5) { gim.dw = { sides: ["left", "right"], dmg }; gim.lockzone = { n: 2 }; }
  const terrain = labTerrain(14);   // 中間はブロック地形（第14相当）。深淵の撃種限定ブロックはまだ出さない
  return {
    id: "lbm" + i, nm: "禁忌の迷宮・第" + i + "の間", room: i, lab: 1, diff: "★迷" + (3 + k),
    gold: 4200 + k * 1000, orb: 4, exp: 1100 + k * 240, bgKey: "lab", bgm: "forbidden-labyrinth.mp3",
    gim, blocks: terrain.blocks, ghost: terrain.ghost, swap: terrain.swap || [], hi: false,
    desc: LAB_NM[el] + "のヴァルガが渦巻く第" + i + "の間（中間関門）。<b>挟み撃ち地形</b>に加え、<b>ロックゾーン</b>や<b>内部弱点</b>が登場する橋渡しの5部屋。全6WAVE。",
    waves,
  };
}
function relabelLab(stage, newRoom) {
  /* 迷宮は城とずらした順番で振り分ける（+2オフセット）＝城と迷宮で同じ並びにならないように。
     ★ ただし第24・25の間は撃種限定ブロック＋撃種変化パネルが重なる最深部なので、
       ずらさずに「2種だけの安全な組み合わせ」をそのまま使う（詰み防止）。 */
  const src = newRoom >= 24 ? newRoom : ((newRoom - 21 + 2) % 5) + 21;
  return Object.assign({}, stage, { id: "lb" + newRoom, nm: "禁忌の迷宮・第" + newRoom + "の間", room: newRoom, gim: endgameGimRotation(src) });
}
const LAB_STAGES = [].concat(
  Array.from({ length: 15 }, (_, k) => labStage(k + 1)),
  Array.from({ length: 5 }, (_, k) => labMidStage(16 + k)),
  Array.from({ length: 5 }, (_, k) => relabelLab(labStage(16 + k), 21 + k))
);
/* ══ ★ 2026-08-08d 永久引き継ぎに合わせて、第1〜25の間の初クリアジェムを少し下げる ══
   この範囲は<b>一度クリアすればその先ずっとクリア判定</b>になり、
   毎月の最初のログインで初クリア報酬を受け取り続けられる。
   1部屋あたりの配布量は下げても、受け取れる回数が毎月ある形なので取り分は十分にある。
   ★ ここ1か所でまとめて掛けているので、部屋ごとの計算式（castleStage / labStage）は触らなくてよい。 */
function applyCarryOrbCut() {
  [STAGES, LAB_STAGES].forEach((arr) => arr.forEach((st) => {
    if (!st.room || st.room > CARRY_MAX_ROOM) return;
    st.orb = Math.max(1, Math.round((st.orb || 0) * CARRY_ORB_CUT));
  }));
}
applyCarryOrbCut();
/* ── 禁忌の迷宮 第1〜25の間のアンチギミック ──
   ★ 王城とは別の並びにして、同じ部屋番号でも組み合わせがかぶらないようにする。 */
const LAB_ANTI = [
  [],                        // 1  導入（挟み撃ち地形に集中）
  ["dw"],                    // 2
  ["warp"],                  // 3
  ["dw", "warp"],            // 4
  ["mine"],                  // 5
  ["dw", "mine"],            // 6
  ["grav"],                  // 7
  ["warp", "grav"],          // 8
  ["mine", "grav"],          // 9
  ["dw", "grav"],            // 10
  ["block"],                 // 11
  ["warp", "mine"],          // 12
  ["dw", "block"],           // 13
  ["warp", "block"],         // 14
  ["mine", "block"],         // 15
  ["block", "grav"],         // 16
  ["lockzone"],              // 17 中間関門でロックゾーン導入（王城とは1部屋ずらす）
  ["warp", "lockzone"],      // 18
  ["dw", "lockzone"],        // 19
  ["mine", "lockzone"],      // 20
  ["grav", "lockzone"],      // 21
  ["block", "lockzone"],     // 22
  ["warp", "mine"],          // 23（22通りを使い切ったので再利用。最初に出た第12の間から十分離す）
  ["dw", "grav"],            // 24
  ["mine", "grav"],          // 25
];
LAB_STAGES.forEach((s, i) => setAntiGims(s, LAB_ANTI[i] || []));

/* ── EX降臨（v12: 出現条件を最深部クリアに変更。20%で出現） ──
   ・ヴィオラEX … 黄昏の王城 第25〜30の間クリアで 20%
   ・シオンEX  … 禁忌の迷宮 第25〜30の間クリアで 20%
   ・アイラEX  … 幽冥の庭園 第8〜12ノ園クリアで 20%
   ボスは降臨キャラ本人。クリアでそのキャラが仲間に（所持済みなら覚醒+1）。
   バナー画像(bn_*EX.jpg)は“EXが降臨したことを示す表示”であってキャラではない。 */
const RAIDS = {
  raidShion: { id: "raidShion", nm: "EX降臨クエスト「月下の氷牢」", dropChar: "shion", el: "water", series: "lab", rooms: [25, 30],
    banner: "bn_ShionEX.webp", bgKey: "exshion", bgm: "moonlit-fault.mp3", diff: "降臨★10",
    gold: 5000, exp: 900, sp: "omega", hpB: 15000, atkB: 560, doomMax: 6,
    anti: ["dw", "warp"],
    /* ★ v12.1: 降臨ごとに導線・追加ギミックを別物にする（design は makeWaveVarying へ渡す） */
    design: { routes: "sideGate", pass: "alt", swaps: "sides", phase: 0,
      note: "<b>左右どちらか一方だけが開く氷の回廊</b>（WAVEごとに開く側が入れ替わる）" },
    desc: "月光の断層に降臨した氷の超越体。凍てつく盤面をかいくぐれ！クリアで「シオン」がドロップ。" },
  raidViola: { id: "raidViola", nm: "EX降臨クエスト「深夜のルーレット」", dropChar: "viola", el: "dark", series: "castle", rooms: [25, 30],
    banner: "bn_ViolaEX.webp", bgKey: "exviola", bgm: "midnight-roulette.mp3", diff: "降臨★11",
    gold: 5800, exp: 1000, sp: "zenos", hpB: 26000, atkB: 720, doomMax: 6,
    anti: ["mine", "block"],
    design: { routes: "zigzag", wallchange: true, innerweak: true, phase: 1,
      note: "<b>互い違いのゲートをジグザグに抜けるルーレット盤</b>" },
    desc: "真夜中のカジノに降臨した闇の超越体。ジグザグの盤面を制せ！クリアで「ヴィオラ」がドロップ。" },
  /* ★ 2026-08-05: 出現する園を 第6・7ノ園 → <b>第8〜12ノ園</b> へ移した。
     第8ノ園から先は「減速壁＋α」と FB遅延攻撃 が揃う奥の区画で、
     ここを踏破できる人にだけアイラEXへの挑戦権が出るようにする。 */
  /* ★ 2026-08-05: 出現条件を第8〜12ノ園に移したのに合わせて、<b>中身も庭園の最深部に見合う難度</b>へ引き上げた。
     3つの降臨のなかで最後に挑むクエストなので、ここだけは「アンチ2種を積めば通る」では終わらせない。
       ・結界 … WAVE2から出て、後半は2つ。閉じこめられた側で戦う判断を要求する
       ・ウォールチェンジ … 壁の色で殴り／リンクの威力が変わる。結界の中でも壁は使える
       ・内部弱点 … ボスの弱点は貫通でしか殴れない＝反射だけの編成を通さない
       ・エーテル … 最初のWAVEから必要。運搬しながら結界も割る二重作業になる
     そのぶん <b>ヴィオラEX の 26,000 → 58,000</b> と敵HPも上げ、即死カウントも1短くしている。 */
  /* ★ 2026-08-07: 出現する園を 第8〜12ノ園 → <b>第11〜15ノ園</b> へ移した。
     第11ノ園から先は<b>ボスがドミニア（蝕魔族）に変わる最奥の区画</b>で、
     そこを踏破できる人にだけアイラEXへの挑戦権が出るようにする。
     ★ あわせて難度も引き上げた（降臨★13 → ★15）。3つの降臨のなかで最後に挑むクエストなので、
       「アンチ2種を積めば通る」では終わらせない。
         ・断絶界 … WAVE1から出て、後半は3つ。しかも耐久+1（アンチ断絶界があれば1回で割れる）
         ・透明スイッチ … ★ 新ギミック。踏まないと殴れない敵がいる
         ・ウォールチェンジ … 壁の色で殴り／リンクの威力が変わる
         ・内部弱点 … ボスの弱点は貫通でしか殴れない＝反射だけの編成を通さない
         ・エーテル … 最初のWAVEから必要数が多い
       HPは 58,000 → 96,000、攻撃力も 1,020 → 1,350 に。即死カウントも1短くしてある。 */
  /* ★ 2026-08-10: 第16〜18ノ園を追加したので、出現する園を <b>第11〜18ノ園</b> に広げた
     （ボスがドミニアに変わる最奥の区画ぜんぶ、という条件はそのまま）。 */
  raidAira: { id: "raidAira", nm: "EX降臨クエスト「狂騒の大楽団」", dropChar: "aira", el: "wood", series: "garden", rooms: [11, 18],
    banner: "bn_AiraEX.webp", bgKey: "exaira", bgm: "panic-in-brass.mp3", diff: "降臨★15",
    gold: 11800, exp: 2000, sp: "zenos", hpB: 96000, atkB: 1350, doomMax: 3,
    anti: ["grav", "lockzone"],
    design: { routes: "triSlit", swaps: "ladder", photon: [3, 3, 3, 4, 4, 5], rows: 2, phase: 0,
      ward: [1, 1, 2, 2, 3, 3], wardHard: true, wallchange: true, innerweak: true,
      ghostswitch: [3, 3, 3, 4, 4, 4],   /* ★ 2026-08-08c 反応は1ターン1回・踏むと消えるので最低3個 */
      note: "<b>3枚の細いすき間を狙って通す舞台</b>" },
    desc: "楽団の狂騒とともに降臨した森の超越体。荒れ狂う盤面を突破せよ！クリアで「アイラ」がドロップ。" },
};
Object.values(RAIDS).forEach((r) => { if (r.banner && !r.banner.startsWith(GIMGD)) r.banner = GIMGD + r.banner; });
const RAID_CHANCE = 0.20;
/* そのクエストをクリアしたときに湧く可能性のあるEX降臨（シリーズ＋部屋番号で決まる） */
function raidForStage(s) {
  if (!s || !s.room) return null;
  const ser = s.garden ? "garden" : s.lab ? "lab" : "castle";
  for (const k in RAIDS) { const r = RAIDS[k]; if (r.series === ser && s.room >= r.rooms[0] && s.room <= r.rooms[1]) return r; }
  return null;
}
function raidStage(rid) {
  const R = RAIDS[rid]; if (!R) return null;
  const mk = (mult, x, y, o) => Object.assign(
    { el: R.el, sp: R.sp, hp: Math.round(R.hpB * mult), atk: Math.round(R.atkB * (o && o.boss ? 1.4 : 1)), cd: 2 + (x > .5 ? 1 : 0), r: 48, x, y }, o || {});
  /* ★ v12.1: EX降臨も「WAVEごとに敵の並び・ギミック・導線がすべて変わる」構成に作り直した。
     WAVEごとに敵の陣形を変える（横一列 → 縦の壁 → 三角 → ボス＋左右 → ボス＋上下 → ボス＋四方）ので、
     同じ通り道が2回続かない。アンチギミックはこれまでどおり降臨ごとに別の2種。 */
  const waves = [
    /* W1: 横一列（まずは素直に上へ抜ける） */
    [mk(1, .20, .26), mk(1, .50, .22, { r: 44 }), mk(1, .80, .26)],
    /* W2: 縦に並ぶ壁（左右どちらから回り込むかを選ぶ） */
    [mk(1.15, .30, .18, { pattern: "laser" }), mk(1.15, .30, .46, { weak: 1 }), mk(1.05, .70, .32, { r: 44, poisonAtk: 1 })],
    /* W3: 三角配置＋挟み撃ち（真ん中に潜り込ませる） */
    [mk(1.35, .38, .24, { r: 44 }), mk(1.35, .62, .24, { r: 44 }), mk(1.3, .50, .52, { weak: 1, pattern: "homing" }), mk(1.1, .12, .14, { r: 40, doomMob: 8 })],
    /* W4: ボス＋左右の護衛 */
    [mk(2.1, .5, .26, { boss: 1, weak: 1, r: 72, pattern: "all", doomMax: R.doomMax + 2 }),
     mk(1.1, .14, .54, { r: 44, pattern: "laser" }), mk(1.1, .86, .54, { r: 44, poisonAtk: 1 })],
    /* W5: ボス＋上下の護衛（縦の導線を潰してくる） */
    [mk(3.0, .5, .24, { boss: 1, weak: 1, r: 82, pattern: "laser", doomMax: R.doomMax + 1 }),
     mk(1.15, .5, .58, { r: 44, pattern: "homing" }), mk(1.15, .16, .16, { r: 42, doomMob: 7 }), mk(1.15, .84, .16, { r: 42, weak: 1 })],
    /* W6: ボス＋四方の護衛（最終WAVE） */
    [mk(4.0, .5, .28, { boss: 1, weak: 1, r: 96, pattern: "burst", doomMax: R.doomMax }),
     mk(1.2, .13, .56, { r: 44, pattern: "laser", poisonAtk: 1 }), mk(1.2, .87, .56, { r: 44, pattern: "homing" }),
     mk(1.2, .32, .70, { r: 42, weak: 1 }), mk(1.2, .68, .70, { r: 42, doomMob: 6 })],
  ];
  const stage = setAntiGims({
    id: R.id, nm: R.nm, diff: R.diff, gold: R.gold, orb: 2, exp: R.exp, room: R.rooms[1],
    bgKey: R.bgKey, bgm: R.bgm,
    gim: {}, blocks: [], ghost: [], swap: [],
    raid: true, dropChar: R.dropChar, banner: R.banner,
    waves,
  }, R.anti);
  makeWaveVarying(stage, R.anti, R.design || {});
  /* 降臨のあらすじは残しつつ、WAVEごとに変わることを付け足す */
  stage.desc = R.desc + "<br>" + stage.desc;
  return stage;
}
/* ══════════ 導線（通り道）のパターン集 ══════════
   [x, 幅] の帯を並べたもの＝その段でふさがれる場所。すき間が「通り道」になる。
   部屋ごとに別のパターン集を使うので、第26〜28の間で盤面が同じになることはない。 */
const ROUTE_LIB = {
  /* ★ 2026-08-11 第19ノ園: 葉脈。太い葉の筋が中央から左右へ交互にずれていく。
     段ごとに開く側が入れ替わるので、断絶界を割りに行く側と風船を拾いに行く側が毎ターン変わる。 */
  leafVein: [
    [[.00, .34], [.52, .30]], [[.18, .32], [.66, .34]], [[.00, .30], [.44, .38]],
    [[.24, .34], [.70, .30]], [[.06, .36], [.56, .32]], [[.14, .30], [.62, .36]],
  ],
  /* ★ 2026-08-11 第20ノ園: 燠火の門。中央に大きな門がひとつ開き、その位置が毎WAVE動く。
     エーテルを運ぶ道すじが1本しかないので、消える足場をどう渡るかがそのまま組み立てになる。 */
  emberGate: [
    [[.00, .32], [.62, .38]], [[.00, .40], [.68, .32]], [[.00, .26], [.54, .46]],
    [[.00, .44], [.72, .28]], [[.00, .36], [.60, .40]], [[.00, .30], [.50, .50]],
  ],
  /* ★ 2026-08-10 第16ノ園: 段ごとに片側だけが三日月状に開く（開く側が毎WAVE入れ替わる）。
     透明スイッチを踏みに行くルートと、回復できる壁へ向かうルートが毎ターン入れ替わる。 */
  crescent: [
    [[.00, .54]], [[.40, .56]], [[.06, .50]], [[.34, .60]], [[.00, .58]], [[.30, .54]],
  ],
  /* ★ 2026-08-10 第17ノ園: 細い柱が2本だけ（どのすき間を抜けても壁まで届く）。
     ウォールチェンジの園なので段は1段だけ・透明パネルも最小限にしてある
     （柱を増やすと、色を読んで打ったルートが点滅で作り変わってしまう）。 */
  beadRow: [
    [[.20, .14], [.62, .14]], [[.14, .14], [.56, .14]], [[.26, .12], [.66, .14]],
    [[.10, .16], [.58, .12]], [[.22, .14], [.68, .12]], [[.16, .12], [.52, .16]],
  ],
  /* ★ 2026-08-10 第18ノ園: 中央がすぼまる砂時計（上段は外側、下段は内側が開く）。
     消えていく足場を渡りながら、細くなる中央を通す最果ての導線。 */
  hourglass: [
    [[.26, .48]], [[.00, .22], [.78, .22]], [[.30, .40]],
    [[.00, .26], [.74, .26]], [[.28, .44]], [[.00, .20], [.80, .20]],
  ],
  /* ★ 2026-08-07 第13ノ園: 段ごとに「左右の壁ぎわ」だけが開く（真ん中を通れない）。
     透明スイッチが左右に置かれるので、どちらの端を走らせるかを毎ターン選ぶことになる。 */
  edgeRun: [
    [[.16, .68]], [[.18, .64]], [[.14, .72]], [[.20, .60]], [[.16, .66]], [[.12, .70]],
  ],
  /* ★ 2026-08-07 第14ノ園: 中央に「窓」がひとつだけ開く。左右は完全にふさがれる。
     地雷を避けながら、その1か所を通すしかない狭い導線。 */
  windowGate: [
    [[.00, .40], [.56, .44]], [[.00, .44], [.60, .40]], [[.00, .36], [.52, .48]],
    [[.00, .46], [.62, .38]], [[.00, .38], [.54, .46]], [[.00, .42], [.58, .42]],
  ],
  /* ★ 2026-08-07 第15ノ園: 4本の細い柱が段ごとにずれていく（最果ての檻）。
     どの列を抜けるかで次の段の入口が変わる、いちばん密な導線。 */
  latticeCage: [
    [[.10, .16], [.40, .16], [.70, .16]], [[.00, .16], [.28, .16], [.56, .16], [.84, .16]],
    [[.16, .14], [.44, .14], [.72, .16]], [[.04, .16], [.32, .14], [.60, .16], [.88, .12]],
    [[.12, .18], [.46, .14], [.76, .14]], [[.00, .14], [.24, .16], [.52, .14], [.80, .16]],
  ],
  /* ★ 2026-08-04 第11ノ園: 中央で交差する2つのゲート（左右どちらから入っても中央で合流する） */
  crossGate: [
    [[.00, .30], [.44, .22], [.78, .22]], [[.06, .22], [.36, .28], [.72, .28]],
    [[.00, .26], [.40, .24], [.76, .24]], [[.08, .26], [.42, .20], [.74, .26]],
    [[.02, .24], [.38, .26], [.70, .30]], [[.04, .28], [.44, .24], [.78, .20]],
  ],
  /* ★ 2026-08-04 第12ノ園: 段ごとに開く側がずれていく渦（外周をぐるりと回して奥へ通す） */
  spiral: [
    [[.00, .52]], [[.30, .56]], [[.14, .60]], [[.40, .52]], [[.00, .58]], [[.26, .62]],
  ],
  /* 中央に1本の縦通路が通る（左右の壁を抜けて真ん中を上げる） */
  centerLane: [
    [[.04, .38], [.58, .38]], [[.06, .34], [.60, .34]], [[.02, .40], [.62, .36]],
    [[.08, .32], [.60, .32]], [[.04, .36], [.56, .40]], [[.06, .38], [.58, .36]],
  ],
  /* 左右どちらか一方だけが開く（毎WAVE開く側が入れ替わる） */
  sideGate: [
    [[.00, .62]], [[.38, .62]], [[.00, .58]], [[.42, .58]], [[.00, .66]], [[.34, .66]],
  ],
  /* 3枚の細いすき間（狙いを定めて通す） */
  triSlit: [
    [[.00, .24], [.32, .24], [.66, .30]], [[.02, .28], [.38, .22], [.70, .28]],
    [[.00, .30], [.36, .26], [.72, .26]], [[.04, .24], [.32, .28], [.68, .28]],
    [[.00, .26], [.34, .30], [.70, .24]], [[.02, .22], [.30, .26], [.64, .32]],
  ],
  /* 互い違いのゲート（左→右→左とジグザグに抜ける） */
  zigzag: [
    [[.10, .34], [.56, .32]], [[.00, .30], [.46, .36]], [[.14, .30], [.60, .30]],
    [[.02, .34], [.50, .32]], [[.12, .36], [.58, .28]], [[.06, .28], [.48, .38]],
  ],
  /* 中央だけをふさぐ（左右から回り込む） */
  centerPlug: [
    [[.30, .40]], [[.26, .46]], [[.34, .34]], [[.24, .48]], [[.32, .38]], [[.28, .42]],
  ],
  /* 階段状（斜めに落ちていく壁）＝反射で角度を作らないと奥へ行けない */
  stair: [
    [[.00, .34]], [[.30, .34]], [[.60, .34]], [[.16, .34]], [[.46, .34]], [[.08, .30]],
  ],
  /* 両サイドが狭い＝中央の広間を大きく使う */
  wideHall: [
    [[.00, .18], [.80, .20]], [[.00, .22], [.78, .22]], [[.00, .16], [.82, .18]],
    [[.00, .24], [.76, .24]], [[.00, .20], [.80, .20]], [[.00, .14], [.84, .16]],
  ],
  /* 2本の柱の間を縫う（左・中央・右の3ルートを選ぶ） */
  twinPillar: [
    [[.22, .14], [.64, .14]], [[.26, .16], [.58, .16]], [[.18, .12], [.68, .14]],
    [[.30, .14], [.56, .18]], [[.20, .16], [.62, .12]], [[.24, .12], [.66, .16]],
  ],
  /* だんだん狭くなる漏斗（奥へ行くほど通り道が細い） */
  funnel: [
    [[.00, .14], [.86, .14]], [[.00, .24], [.76, .24]], [[.00, .34], [.66, .34]],
    [[.00, .30], [.70, .30]], [[.00, .20], [.80, .20]], [[.00, .38], [.62, .38]],
  ],
};
/* ══════════════════════════════════════════════════════════════
   v14 新ギミックの数値（幽冥の庭園 第2〜第5・第7ノ園で使う）
   ・ステージ定義（gardenGim）より先に読む必要があるのでここに置く
   ══════════════════════════════════════════════════════════════ */
const CB_PER_WALL = 2;         // カウントブーストウォール: 1つの壁が反応できる回数
const CB_MAX = 8;              // 反応の合計上限（4壁 × 2回）
/* ★ v14.5: 1回ごとの上昇量を 0.22 → 0.40 に。全8回そろえたときの最終倍率が ×2.76 → ×4.20 になり、
   「壁を全部反応させてから殴る」立ち回りの見返りをはっきり大きくした（敵HPもあわせて増量） */
const CB_STEP = 0.40;          // 1回ごとの殴り火力アップ
const HB_MAX = 4;              // ヒーリングバルーン: 同時に持てる数
const HB_HEAL = 0.09;          // バルーン1つで回復するチームHPの割合（味方にふれたとき）
/* ★ v14.5: 敵にふれてしまったときの「敵の」回復量。
   3%だとリスクとして軽すぎたので少し増やした（3% → 5%）。 */
const HB_FOE_HEAL = 0.05;
const WARD_HITS = 5;           // 断絶界: 壊すのに必要なヒット数
/* 断絶界: 1回のショットで削れる回数の上限。
   ★ もとは実装（hitWard）のすぐそばに置いていたが、GIM_INFO の説明文がこの値を読むので
     GIM_INFO より前へ移した（後ろに置くと TDZ でファイル全体が動かなくなる）。
   こうしないと「壁ぎわで跳ね回るだけで1ショット破壊」できてしまい、ギミックとして成立しない。 */
const WARD_PER_SHOT = 2;
/* ★ 2026-08-03 追加ギミックの定数。
   ★ ここ（GIM_INFO より前）に置くこと。GIM_INFO は説明文の中でこれらを読むので、
     実装の近くに const で置くと参照が TDZ に落ちて、ファイル全体が動かなくなる。 */
const HEALWALL_PCT = 0.030;      // ヒーリングウォール: 1回ごとの回復量（最大HP比）
/* ★ 2026-08-05: 1ショットあたりの回復回数の上限は廃止（HEALWALL_PER_SHOT は使わない） */
/* ★ 2026-08-05 新ギミック「FB遅延攻撃」: 1回の攻撃で巻きもどるフルバーストのターン数。
   ★ GIM_INFO より前に置くこと（GIM_INFO の説明文の中でこの値を読むため／TDZ） */
const FBDELAY_N = 3;
const CRUSH_LEFT = 0.20;         // クラッシュ攻撃: HPをここまで削る（最大HP比）
/* ══ ★ 2026-08-07 新ギミック「透明スイッチ」 ══
   ・盤面に置かれた紫のスイッチ。<b>1回踏むごとに敵の「出現⇄透明」が入れ替わる</b>。
   ・敵は d.gs（0 か 1）で「どちらの側に出ている敵なのか」を持つ。
       gs 未指定 … いつでも出ている（スイッチの影響を受けない）
       gs: 0     … 最初から出ている敵
       gs: 1     … 最初は透明な敵
     踏むたびに B.gsTick が1増え、(B.gsTick % 2) === e.gs の敵だけが実体化する。
   ・透明な敵は<b>殴れない</b>（当たり判定が無く、リンクもFBも当たらない）。
     ★ 2026-08-08c <b>攻撃はしてくる</b>ようになった（攻撃・即死・クラッシュのカウントは進む）。
       以前は攻撃カウントごと止まっていたので「透明にして時間を止める」だけで守り切れてしまっていた。
     ただし「まだ倒していない敵」としては残るので、WAVEは終わらない
     ＝ <b>両方の側を出しては倒す</b>のがこのギミックの遊びかた。
   ★ 2026-08-08c スイッチが反応するのは<b>そのターン1回まで</b>。
     反応したスイッチは<b>消えて、次のターンで復活</b>する（各WAVEに最低 GSWITCH_MIN 個）。
   ★ GIM_INFO より前に置くこと（説明文の中でこの値を読むため／TDZ）。 */
const GSWITCH_R = 0.052;         // スイッチの半径（画面幅に対する割合）
/* ★ 2026-08-08c 各WAVEに必ず置くスイッチの数。
   「反応は毎ターン1回まで／踏んだスイッチは消えて次のターンに復活」に変えたので、
   1〜2個だと踏みに行ける場所が足りなくなる。最低3個を保証する。 */
const GSWITCH_MIN = 3;
/* 撃種変化パネルの置き場所（部屋ごとに変える） */
const SWAP_LIB = {
  center: [[.5, .60], [.5, .22]],
  sides: [[.12, .30], [.88, .30], [.5, .66]],
  corners: [[.10, .12], [.90, .12], [.10, .68], [.90, .68]],
  ladder: [[.5, .18], [.22, .46], [.78, .46], [.5, .70]],
  /* ★ 2026-08-11 幽冥の庭園むけの広い候補。
     庭園はWAVEごとに敵の並びも導線も総取りかえになるので、候補が4つだと
     「その盤面では全部ふさがっていて1枚も置けない」WAVEが出てしまう
     （varyTerrain は敵とも壁とも重ならない候補だけを採用する＝置けないと0枚になる）。
     候補を盤面じゅうに散らしておけば、どのWAVEでも必ず何枚かは残る。
     ★ 2つの並びを用意して、園ごとに別の見た目になるようにしてある。 */
  gardenA: [[.06, .16], [.94, .16], [.06, .46], [.94, .46], [.5, .34], [.5, .64], [.28, .64], [.72, .64]],
  gardenB: [[.5, .70], [.10, .62], [.90, .62], [.06, .24], [.94, .24], [.42, .46], [.58, .46], [.5, .06]],
};

/* ══════════════════════════════════════════════════════════════════
   ステージ：幽冥の庭園（第1〜7ノ園）— 超絶高難易度
   ・ボスは降臨キャラ「ヘカーティア」。第1ノ園から順に、全WAVEクリアで次の園が開く。
   ・アンチギミックは各園ちょうど2種類（園ごとに別の組み合わせ）。ギミックは重ねない。
   ・WAVEごとにギミックの配置・地形（導線）が変化する。
     ブロックや透明パネルで“通り道”を作って、そこを縫うように動かす設計。
   ・敵の数は各WAVE 4〜5体（通常クエストより多い）。マルチプレイにも対応。
   ・★ v11.2: 第6・7ノ園を追加。新ギミック「ウォールチェンジ」が登場する最奥の2園。
   ══════════════════════════════════════════════════════════════════ */
const GARDEN_N = 20;                                    // 第1〜20ノ園（★ 2026-08-11 に第19・20ノ園を追加）
/* ★ 2026-08-06: 幽冥の庭園の<b>初クリアのジェムは全園おなじ</b>（園ごとにバラバラだったのを統一）。
   お知らせ・イベント・クエスト一覧のどこから見ても同じ数になるよう、必ずこの定数を使うこと。 */
const GARDEN_ORB = 15;
const GARDEN_ELS = ["dark", "light", "water", "wood", "fire", "dark", "light", "water", "wood", "fire", "light", "dark",
  /* ★ 2026-08-07 第13〜15ノ園（★ 2026-08-08: 第15ノ園を 光 → 火 に変更） */
  "water", "wood", "fire",
  /* ★ 2026-08-10 第16〜18ノ園（輪廻＝光／星海＝水／涅槃＝闇） */
  "light", "water", "dark",
  /* ★ 2026-08-11 第19・20ノ園（翠嵐＝木／業火＝火） */
  "wood", "fire"];
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-08 幽冥の庭園のHPを作り直した
   ------------------------------------------------------------
   これまでは「基準 76万 × 1.25^(k-1)」の等比に、園ごとの主役ギミックぶんの倍率
   （カウントブースト×2.0・最果て×2.05 など）を重ねていた。
   その結果いちばん奥（第15ノ園）は基準HPが <b>3,500万</b> を超え、
   第1ノ園（76万）の 46倍 という、腕前ではどうにもならない壁になっていた。

   いまは <b>園ごとの「ボスのHP」をこの表で直接持つ</b>。
     ・第1ノ園  … 279万
     ・第15ノ園 … 1,171万
   ★ 2026-08-10: 全体的に<b>+8%</b>引き上げた（歯ごたえの底上げ）。
     ・第1〜5ノ園／第6〜10ノ園／第11〜15ノ園 の3段で、
       <b>同じ段のなかはほぼ同じHP</b>・段が上がるところでぐっと増える
   ★ なぜ「ボスのHP」を基準にするか
     園ごとの敵の並び（GARDEN_FORM）はボスの倍率まで別々に持っていて、
     たとえば第15ノ園のボスは基準HPの ×6.2、第8ノ園は ×3.4 と2倍ちかい開きがある。
     基準HPをそろえても<b>実際に殴るHPはそろわない</b>ので、
     ボスのHPを目標にして、<b>そのWAVEの敵ぜんぶを同じ比率で伸縮</b>させる。
   ★ 主役ギミックぶんの上乗せ（カウントブーストの園はHP高め…）は、
     この表の数字そのものに織り込んである。倍率を別に掛けないこと。
   ══════════════════════════════════════════════════════════════ */
const GARDEN_BOSS_HP = [
  /* ★ 2026-08-10: 全体を +8%（第1ノ園 258万→279万 … 第15ノ園 1,084万→1,171万） */
  /* 第1〜5ノ園 */   2790000,  2938000,  3084000,  3231000,  3378000,
  /* 第6〜10ノ園 */  5724000,  6026000,  6329000,  6631000,  6934000,
  /* 第11〜15ノ園 */ 9936000, 10379000, 10822000, 11264000, 11707000,
  /* ★ 2026-08-10 第16〜18ノ園。これまでどおり「同じ段のなかはほぼ同じ・段が上がるところでぐっと増える」形。
     第11〜15の段からおよそ +30% で、第1ノ園のちょうど 5倍あたりに収まる。 */
  /* 第16〜18ノ園 */ 14880000, 15540000, 16200000,
  /* ★ 2026-08-11 第19・20ノ園。第16〜18の段からおよそ +25%（第1ノ園のちょうど7倍あたり）。
     どちらも断絶界が入って手数を持っていかれるので、上げ幅は段のなかで小さめにしてある。 */
  /* 第19・20ノ園 */ 19440000, 20250000,
];
/* 園ごとの二つ名（属性を使い回す園も別の名前にする） */
const GARDEN_NM = ["宵闇", "白露", "水鏡", "翡翠", "彼岸", "常夜", "黎明", "氷華", "常盤", "終焔", "白夜", "虚渦",
  /* ★ 2026-08-07 第13〜15ノ園 */
  "幻影", "残響", "創生",
  /* ★ 2026-08-10 第16〜18ノ園 */
  "輪廻", "星海", "涅槃",
  /* ★ 2026-08-11 第19・20ノ園。
     「翠嵐」は黄昏の王城の木属性の部屋（CASTLE_NM.wood）で使っているので、庭園では使わない。 */
  "萌芽", "業火"];
/* 園ごとのアンチギミック2種（★ すべて別の組み合わせ。第8〜10ノ園は新ギミック「減速壁」を軸に、
   これまでどのクエストにも無かった組み合わせだけを使う） */
const GARDEN_ANTI = [
  ["dw", "block"],          // 第1ノ園: ダメージウォール ＋ ブロック
  ["warp", "mine"],         // 第2ノ園: ワープ ＋ 地雷
  ["grav", "block"],        // 第3ノ園: 重力バリア ＋ ブロック
  ["dw", "lockzone"],       // 第4ノ園: ダメージウォール ＋ ロックゾーン
  ["mine", "grav"],         // 第5ノ園: 地雷 ＋ 重力バリア
  ["warp", "lockzone"],     // 第6ノ園: ワープ ＋ ロックゾーン（＋ウォールチェンジ）
  ["dw", "grav"],           // 第7ノ園: ダメージウォール ＋ 重力バリア（＋ウォールチェンジ）
  ["slowwall", "lockzone"], // 第8ノ園: 減速壁 ＋ ロックゾーン（新）
  ["slowwall", "block"],    // 第9ノ園: 減速壁 ＋ ブロック（新／ヴァニッシュボックスの土台になる）
  ["slowwall", "grav"],     // 第10ノ園: 減速壁 ＋ 重力バリア（新）
  /* ★ 2026-08-04 第11・12ノ園。
     ここまでで王城25部屋・迷宮25部屋・庭園10園を合わせると、
     減速壁がらみを除く2種の組み合わせは全部つかい切っている。
     残っていたのは slowwall×{dw, warp, mine} の3通りだけなので、そこから2つ選ぶ
     （slowwall＋dw は「壁の面」がどちらの意味か紛らわしいので取っておく）。 */
  ["slowwall", "mine"],     // 第11ノ園: 減速壁 ＋ 地雷（新）
  ["slowwall", "warp"],     // 第12ノ園: 減速壁 ＋ ワープ（新）
  /* ★ 2026-08-07 第13〜15ノ園。
     ここまでで庭園に出ていない2種の組み合わせから選ぶ。
     残っていたのは dw×warp／dw×mine／dw×slowwall／warp×block／warp×grav／
     mine×block／mine×lockzone／lockzone×block／lockzone×grav の9通りで、そこから3つ。
     ★ この3園には<b>断絶界を置かない</b>（置くとアンチが3種になり、
       「アンチギミックは2種だけ」という庭園の約束が崩れるため）。
       かわりに新ギミック「透明スイッチ」を主役にしてある。 */
  ["dw", "warp"],           // 第13ノ園: ダメージウォール ＋ ワープ（新）
  ["mine", "block"],        // 第14ノ園: 地雷 ＋ ブロック（新）
  ["lockzone", "block"],    // 第15ノ園: ロックゾーン ＋ ブロック（新）
  /* ★ 2026-08-10 第16〜18ノ園。
     7種のアンチ（dw／grav／warp／mine／slowwall／block／lockzone）から2種を選ぶ組み合わせは全21通りで、
     第1〜15ノ園でそのうち15通りを使っている。残っていたのは
       dw×mine ／ dw×slowwall ／ warp×block ／ warp×grav ／ mine×lockzone ／ lockzone×grav
     の6通り。ここから3つ選ぶ（dw×slowwall は「壁の面」がダメージなのか減速なのか
     紛らわしいので、ここでも取っておく）。
     ★ 第18ノ園は<b>ブロックをアンチに入れる</b>こと。この園はヴァニッシュボックスを置くため
       盤面に<b>実体のブロック</b>が並ぶ。ブロックをアンチに入れないと、
       クエストカードのアンチ表示が【アンチ2種 ＋ 対策できないブロック】の3種に見えてしまう
       （第4ノ園で実際にそうなっている）。
     ★ この3園にも<b>断絶界を置かない</b>（置くとアンチが3種になり、
       「アンチギミックは2種だけ」という庭園の約束が崩れるため）。 */
  ["warp", "grav"],         // 第16ノ園: ワープ ＋ 重力バリア（新）
  ["mine", "lockzone"],     // 第17ノ園: 地雷 ＋ ロックゾーン（新）
  ["warp", "block"],        // 第18ノ園: ワープ ＋ ブロック（新）
  /* ★ 2026-08-11 第19・20ノ園。
     ここだけは<b>断絶界をアンチの片方に据える</b>（第7・第11ノ園と同じ扱い）。
     断絶界は gardenGim 側で g.ward を立てると自動的にアンチ一覧へ入る（gardenStage の hasWard）ので、
     この表には<b>もう片方だけ</b>を書く。2つ書くとアンチが3種になってしまう。
       第19ノ園 … ロックゾーン ＋ 断絶界
       第20ノ園 … ブロック     ＋ 断絶界 */
  ["lockzone"],             // 第19ノ園: ロックゾーン ＋ 断絶界
  ["block"],                // 第20ノ園: ブロック ＋ 断絶界
];
/* ウォールチェンジが登場する園（アンチ系では消せない新ギミック）
   ★ 2026-08-03 第10ノ園から外した。第10ノ園は eclipse＝カウントブーストウォールが主役で、
     ウォールチェンジと重なると<b>壁の色が2つの意味を持って</b>しまい、
     「いま何色だから殴りが強い／弱い」が読めなくなっていた。
     壁に反応するギミック（WALL_FX_GIMS）は1クエストに1種類だけ、というのが以後の決めごと。 */
const GARDEN_WALLCHG = [false, false, false, false, false, true, true, true, false, false, false, true,
  /* ★ 2026-08-07 第13〜15ノ園。第13は透明スイッチだけに集中させたいので壁は動かさない。
     第14はカウントブーストが主役なので false（壁系は1クエスト1種類）。第15は最果てなので true。 */
  false, false, true,
  /* ★ 2026-08-10 第16〜18ノ園。第16・第18はヒーリングウォールが主役なので壁は動かさない
     （壁に反応するギミックは1クエストに1種類＝WALL_FX_GIMS）。第17だけがウォールチェンジの園。 */
  false, true, false,
  /* ★ 2026-08-11 第19・20ノ園。
     第19はカウントブーストウォールが主役なので壁は動かさない（壁系は1クエスト1種類）。
     第20はエーテル＋ヴァニッシュ＋断絶界で手数がすでに厳しいので、ウォールチェンジは重ねない。 */
  false, false];

/* ══ 壁に反応するギミックは1クエストに1種類だけ ══
   ウォールチェンジ（色が変わる）・カウントブーストウォール（叩くほど強くなる）・
   ヒーリングウォール（ふれると回復）は、どれも「壁を見て判断する」ギミック。
   2つ以上あると壁の色・印がどちらの意味なのか分からなくなる。
   ★ 新しい壁系ギミックを足すときは、必ずこの配列にも足すこと。
   優先度は配列の順（前にあるものを残す）。 */
const WALL_FX_GIMS = ["wallchange", "countboost", "healwall"];
function dedupeWallFx(g) {
  let kept = null;
  WALL_FX_GIMS.forEach((k) => {
    if (!g[k]) return;
    if (kept) delete g[k]; else kept = k;
  });
  return g;
}
/* ══════════════════════════════════════════════════════════════════
   ★ v14: 第1〜第7ノ園を「全部ちがうクエスト」に作り直した。
     アンチギミック（GARDEN_ANTI）は変更していない。変えたのは
     「アンチでは消せない“もう一つの主役ギミック”」と、地形・敵構成・HP。
       第1ノ園 … これまでどおり（純粋な導線パズルの入門）
       第2ノ園 … カウントブーストウォール（壁を叩くほど殴りが強くなる。毎ターンリセット→HP高め）
       第3ノ園 … ヒーリングバルーン（拾って運んで回復。敵に当てると敵が回復するので運搬に気をつかう）
       第4ノ園 … エーテル ＋ ヴァニッシュボックス（最後にふれた箱が次のターンに消える）
       第5ノ園 … ★ 2026-08-07 に「結界（断絶界）」から<b>ヒーリングウォール</b>へ変更
       第6ノ園 … これまでどおり（ウォールチェンジ）
       第7ノ園 … 超絶高難易度。ウォールチェンジ＋断絶界＋エーテル＋内部弱点＋ヴァニッシュを全部盛り
   ══════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════
   ★ 2026-08-07 断絶界（ward）は<b>第7ノ園と第11ノ園だけ</b>のギミックにした
   ------------------------------------------------------------------
   断絶界は「閉じ込められた仲間を助け出す」ための手数を丸ごと持っていくギミックで、
   第5・7・9・10・11・12ノ園と<b>6つの園に出ていた</b>ため、
   幽冥の庭園がどこも「まず断絶界を割る」から始まる同じ形になっていた。
   ・第7ノ園（常夜・全部盛り）と 第11ノ園（白夜・ヒーリングウォールで粘る園）にだけ残す
   ・第9（mirror）・第10（eclipse）・第12（abyss）からは外す（他のギミックは据え置き）
   ・第5ノ園は断絶界そのものが主役だったので、主役を<b>ヒーリングウォール</b>に差し替えた
     （第11ノ園は「ヒーリングウォール＋断絶界＋クラッシュ攻撃」の上位版という並びになる）
   ══════════════════════════════════════════════════════════════════ */
/* 園ごとの「主役ギミック」キー（アンチ系では消せないもの） */
/* ★ 2026-08-16 雑魚に内部弱点が出はじめる園（gardenStage が読む）。
   ここより前の園は導線を読む練習なので、要素を足さない。 */
const GARDEN_INNERWEAK_FROM = 3;
const GARDEN_SPECIAL = ["", "countboost", "balloon", "vanish", "healwall", "wallchange", "chaos",
  /* ★ 2026-08-03 追加。第8〜10ノ園も「同じ組み合わせが1つもない」ように主役ギミックを変える。
     glacier … 減速壁でスピードが出ない園。ヒーリングバルーンで支えつつウォールチェンジで火力を作る
     mirror  … 結界＋ヴァニッシュボックス＋エーテル。盤面を作り替えながらシールドを割る
     eclipse … 最果て。カウントブースト＋結界＋エーテル＋ヒーリングバルーン＋内部弱点
               （★ ウォールチェンジは外した。壁系ギミックは1クエスト1種類まで＝WALL_FX_GIMS） */
  "glacier", "mirror", "eclipse",
  /* ★ 2026-08-04 第11・12ノ園
     aurora … 新ギミック「ヒーリングウォール」の初出。壁で回復しながら結界を割る園。
              ボスは新ギミック「クラッシュ攻撃」を持つ＝HPを20%まで削られたあと、
              壁を使ってどこまで戻せるかの勝負になる（この2つは対で設計している）。
     abyss  … 幽冥の最果て。ウォールチェンジ＋結界＋エーテル＋ヴァニッシュ＋内部弱点に
              即死攻撃とクラッシュ攻撃が重なる。 */
  "aurora", "abyss",
  /* ★ 2026-08-07 第13〜15ノ園
     phantom … 新ギミック「透明スイッチ」の初出。踏むたびに敵の出現／透明が入れ替わる
     requiem … 透明スイッチ ＋ カウントブーストウォール ＋ エーテル。
               「壁を稼ぐ」「エーテルを運ぶ」「敵を出す」の3つを1ターンでやりくりする園
     genesis … 幽冥の創生。透明スイッチ ＋ ウォールチェンジ ＋ エーテル ＋
               ヴァニッシュ ＋ ヒーリングバルーン ＋ 内部弱点の全部盛り */
  "phantom", "requiem", "genesis",
  /* ★ 2026-08-10 第16〜18ノ園
     samsara … 輪廻。ヒーリングウォール ＋ 透明スイッチ。
               「回復できる面」も「踏めるスイッチ」もWAVEごとに変わるので、
               <b>1ショットで回復を取るか、入れ替えを取るか</b>を毎ターン選ぶことになる。
     stellar … 星海。ウォールチェンジ ＋ エーテル ＋ ヒーリングバルーン。
               透明スイッチもヴァニッシュも出さない＝<b>盤面そのものは動かない</b>ぶん、
               1ターンの配分だけで勝負が決まる園。
     nirvana … 涅槃。幽冥の庭園のいちばん奥。透明スイッチ ＋ ヒーリングウォール ＋
               エーテル ＋ ヴァニッシュ ＋ 内部弱点。第15ノ園（創生）とは
               「ウォールチェンジ＋風船」か「回復壁」かで対になる。 */
  "samsara", "stellar", "nirvana",
  /* ★ 2026-08-11 第19・20ノ園。どちらも<b>断絶界</b>が主役の片翼で、
     もう片方に「庭園の初期の園のギミック」＋<b>撃種変化パネル</b>を組み合わせてある。
     verdant … 翠嵐。断絶界 ＋ ヒーリングバルーン ＋ カウントブーストウォール ＋ 撃種変化パネル。
               エーテルもウォールチェンジも出さない＝<b>盤面の読みは素直</b>なぶん、
               「閉じこめを割る」「風船を運ぶ」「壁を稼ぐ」を1ターンに詰める配分の園。
     pyre    … 業火。断絶界 ＋ エーテル ＋ ヴァニッシュボックス ＋ 撃種変化パネル ＋ 内部弱点。
               エーテルを使う園なので、地形（透明パネル・消える箱）は
               gardenLowTerrain 側で<b>最小限</b>に絞られる（イレギュラーバウンド対策）。 */
  "verdant", "pyre"];
/* WAVEごとのギミック（種類は園で固定・数と強さと配置だけがWAVEで変わる） */
function gardenGim(k, w) {
  const anti = GARDEN_ANTI[k - 1];
  const dmg = Math.round(900 + k * 260 + w * 90);
  const g = {};
  if (anti.includes("dw")) {
    /* WAVEごとに焼ける壁の面が変わる＝安全な壁が毎WAVE変わる */
    const sides = [["left", "right"], ["top"], ["left", "right", "top"], ["right", "top"], ["left", "top"], ["left", "right"]][w];
    g.dw = { sides, dmg };
  }
  if (anti.includes("warp")) g.warp = 2 + (w % 3);                     // 2〜4個（WAVEで増減）
  if (anti.includes("mine")) g.mine = { n: 3 + (w % 3), dmg };         // 3〜5個
  if (anti.includes("lockzone")) g.lockzone = { n: 1 + (w % 2) };      // 1〜2個
  /* ★ 2026-08-03 減速壁: WAVEごとに「凍っている面」が変わる。
     ダメージウォールと同じ面には置かない（見分けがつかなくなるため）。 */
  if (anti.includes("slowwall")) {
    const used = (g.dw && g.dw.sides) || [];
    const pool = ["left", "right", "top", "bottom"].filter((sd) => used.indexOf(sd) < 0);
    const pat = [[0], [1], [0, 1], [1, 2], [0, 2], [0, 1, 2]][w] || [0];
    const sides = pat.map((i2) => pool[i2 % pool.length]).filter((v, i2, a2) => v && a2.indexOf(v) === i2);
    g.slowwall = { sides: sides.length ? sides : ["bottom"] };
  }
  if (GARDEN_WALLCHG[k - 1]) g.wallchange = 1;                         // ウォールチェンジのある園
  /* ── v14: 園ごとの主役ギミック ── */
  const sp = GARDEN_SPECIAL[k - 1];
  if (sp === "countboost") g.countboost = 1;
  if (sp === "balloon") g.balloon = { n: 4 + (w % 2) };                 // 4〜5個の風船を設置
  if (sp === "vanish") { g.vanish = 1; g.photon = { n: 3, need: 2 + (w >= 3 ? 1 : 0) }; }
  /* ★ 2026-08-07 第5ノ園（彼岸）: 断絶界 → ヒーリングウォール。
     光る面にふれるたびにチームHPが回復する。回復できる面はWAVEごとに変わる。
     減速壁・ダメージウォールの面とは重ねない（同じ面が2つの意味を持つと読めなくなるため）。 */
  if (sp === "healwall") {
    const used = ((g.dw && g.dw.sides) || []).concat((g.slowwall && g.slowwall.sides) || []);
    const pool = ["left", "right", "top", "bottom"].filter((sd) => used.indexOf(sd) < 0);
    const pat = [[0], [1], [0, 1], [1, 2], [0, 2], [1, 3]][w] || [0];
    const sides = pat.map((i2) => pool[i2 % pool.length]).filter((v, i2, a2) => v && a2.indexOf(v) === i2);
    g.healwall = { sides: sides.length ? sides : [pool[0] || "bottom"] };
  }
  if (sp === "chaos") {
    /* 第7ノ園（超絶高難易度）: 全部盛り。WAVEが進むほどギミックが重なっていく */
    g.ward = { n: w >= 2 ? 2 : 1, hits: WARD_HITS + 1 };
    g.photon = { n: 3, need: 2 + Math.floor(w / 2) };
    g.countboost = 1;
    if (w >= 2) g.vanish = 1;
    g.innerweak = 1;                                                   // ボスは貫通でしか弱点を殴れない
  }
  /* ★ 2026-08-03 第8〜10ノ園 */
  if (sp === "glacier") {
    /* 減速壁で足が止まるぶん、ヒーリングバルーンで支える。WAVEが進むと風船が減る */
    g.balloon = { n: 5 - Math.floor(w / 2) };
    if (w >= 3) g.countboost = 1;                                      // 後半は壁を稼いで火力を作る
  }
  if (sp === "mirror") {
    /* ★ 2026-08-07 断絶界を外した（第7・第11ノ園だけのギミックにしたため）。
       ヴァニッシュボックスで足場を消しながらエーテルを運ぶ、盤面づくりの園として残す。 */
    g.vanish = 1;
    g.photon = { n: 3, need: 2 + (w >= 4 ? 1 : 0) };
  }
  if (sp === "eclipse") {
    /* 最果て。WAVEごとに「重なるギミックの中身」が入れ替わっていく
       ★ 2026-08-07 断絶界を外した（カウントブースト＋エーテル＋バルーン＋内部弱点は据え置き） */
    g.countboost = 1;
    g.photon = { n: 3, need: 2 + Math.floor(w / 2) };
    if (w >= 2) g.balloon = { n: 3 };
    g.innerweak = 1;
  }
  /* ★ 2026-08-04 第11ノ園（白夜）: ヒーリングウォール ＋ 結界。
     WAVEごとに「回復できる面」が変わるので、毎ターン壁を見てから撃つ形になる。
     減速壁の面とは重ねない（同じ面が回復と減速の両方だと意味が読めなくなる）。 */
  if (sp === "aurora") {
    const slow = (g.slowwall && g.slowwall.sides) || [];
    /* WALL_SIDES は戦闘側（ずっと後方）で const 宣言されるので、ここでは使えない（TDZ）。
       ステージ定義はファイル読み込み時に組み立てられる点に注意。 */
    const pool = ["left", "right", "top", "bottom"].filter((sd) => slow.indexOf(sd) < 0);
    /* ★ 2026-08-05: 回復できる面は<b>最大2面まで</b>。
       3面以上を光らせると盤面のほとんどが回復壁になってしまい、
       「どの壁を使うか選ぶ」というギミックの読み合いが無くなるため。 */
    const pat = [[0], [1], [0, 1], [1, 2], [0, 2], [1, 3]][w] || [0];
    const sides = pat.map((i2) => pool[i2 % pool.length]).filter((v, i2, a2) => v && a2.indexOf(v) === i2);
    g.healwall = { sides: sides.length ? sides : [pool[0] || "bottom"] };
    g.ward = { n: 1 + (w >= 3 ? 1 : 0), hits: WARD_HITS };
    if (w >= 4) g.photon = { n: 3, need: 2 };      // 終盤だけエーテルが乗る
  }
  /* ★ 2026-08-04 第12ノ園（虚渦）: 幽冥の最果て。WAVEが進むほど重なりが増える */
  if (sp === "abyss") {
    /* ★ 2026-08-07 断絶界を外した（ウォールチェンジ＋エーテル＋ヴァニッシュ＋内部弱点は据え置き） */
    g.photon = { n: 3, need: 2 + Math.floor(w / 2) };
    if (w >= 1) g.vanish = 1;
    g.innerweak = 1;
  }
  /* ★ 2026-08-07 第13ノ園（幻影）: 新ギミック「透明スイッチ」の初出。
     ほかのギミックをあえて重ねず、<b>「踏む／踏まない」の選択だけ</b>に集中させる。
     WAVEが進むとスイッチが増えて、どちらを踏むかで盤面の作りかたが変わる。 */
  if (sp === "phantom") {
    g.ghostswitch = { n: w >= 3 ? 4 : 3 };   /* ★ 2026-08-08c 最低3個（GSWITCH_MIN） */
    if (w >= 4) g.photon = { n: 3, need: 2 };   // 終盤だけエーテルが乗る
  }
  /* ★ 2026-08-07 第14ノ園（残響）: 透明スイッチ ＋ カウントブーストウォール ＋ エーテル。
     「壁を稼ぐ」「エーテルを運ぶ」「敵を出す」の3つを1ターンでやりくりさせる。 */
  if (sp === "requiem") {
    g.ghostswitch = { n: 3 };   /* ★ 2026-08-08c 最低3個（GSWITCH_MIN） */
    g.countboost = 1;
    g.photon = { n: 3, need: 2 + (w >= 3 ? 1 : 0) };
    if (w >= 4) g.balloon = { n: 3 };
  }
  /* ★ 2026-08-07 第15ノ園（創生）: 幽冥の創生。WAVEが進むほど重なりが増える最果て。 */
  if (sp === "genesis") {
    g.ghostswitch = { n: w >= 3 ? 4 : 3 };   /* ★ 2026-08-08c 最低3個（GSWITCH_MIN） */
    g.photon = { n: 3, need: 2 + Math.floor(w / 2) };
    if (w >= 1) g.vanish = 1;
    if (w >= 2) g.balloon = { n: 3 };
    g.innerweak = 1;
  }
  /* ★ 2026-08-10 第16ノ園（輪廻／samsara）: ヒーリングウォール ＋ 透明スイッチ。
     WAVEごとに<b>回復できる面</b>と<b>スイッチの数</b>の両方が変わる。
     後半は壁まで走れないターンの保険としてヒーリングバルーンも漂う。 */
  if (sp === "samsara") {
    g.ghostswitch = { n: w >= 3 ? 4 : 3 };   /* ★ 最低3個（GSWITCH_MIN） */
    /* この園に減速壁・ダメージウォールは無いので4面すべてが候補（回復できるのは最大2面まで） */
    const pool = ["left", "right", "top", "bottom"];
    const pat = [[0], [1], [0, 1], [1, 2], [0, 2], [1, 3]][w] || [0];
    const sides = pat.map((i2) => pool[i2 % pool.length]).filter((v, i2, a2) => v && a2.indexOf(v) === i2);
    g.healwall = { sides: sides.length ? sides : ["bottom"] };
    if (w >= 3) g.balloon = { n: 3 };
  }
  /* ★ 2026-08-10 第17ノ園（星海／stellar）: ウォールチェンジ ＋ エーテル ＋ ヒーリングバルーン。
     ヴァニッシュも透明スイッチも出さない＝盤面が作り変わらないので、
     「壁の色を赤まで回す」「エーテルを運ぶ」「風船を拾う」を1ターンにどう詰めるかだけの園。 */
  if (sp === "stellar") {
    g.photon = { n: 3, need: 2 + (w >= 3 ? 1 : 0) };
    g.balloon = { n: w >= 4 ? 4 : 3 };
    if (w >= 4) g.innerweak = 1;                                       // 終盤だけボスが内部弱点になる
  }
  /* ★ 2026-08-10 第18ノ園（涅槃／nirvana）: 幽冥の庭園のいちばん奥。
     透明スイッチで敵を入れ替えながら、ヒーリングウォールで命をつなぎ、
     エーテルを運び、消えていく足場を渡る。WAVEが進むほど必要なエーテルが増える。 */
  if (sp === "nirvana") {
    g.ghostswitch = { n: w >= 3 ? 4 : 3 };
    g.photon = { n: 3, need: 2 + Math.floor(w / 2) };
    const pool = ["left", "right", "top", "bottom"];
    /* 回復できる面は第16ノ園とわざと別の並びにして、同じ読み合いが続かないようにする */
    const pat = [[1], [0, 1], [2], [0, 2], [1, 3], [0, 3]][w] || [0];
    const sides = pat.map((i2) => pool[i2 % pool.length]).filter((v, i2, a2) => v && a2.indexOf(v) === i2);
    g.healwall = { sides: sides.length ? sides : ["bottom"] };
    g.vanish = 1;
    g.innerweak = 1;
  }
  /* ★ 2026-08-11 第19ノ園（翠嵐／verdant）: 断絶界 ＋ ヒーリングバルーン ＋ カウントブーストウォール。
     WAVEごとに「何が重なるか」を入れ替えて、6WAVEすべてを別の形にしてある。
       W1 … 断絶界1つだけ（まずは割りかたを覚える）
       W2 … 断絶界1つ ＋ 風船（運びながら割る）
       W3 … 断絶界2つ ＋ カウントブースト（壁を稼いでから割る）
       W4 … 断絶界2つ ＋ 風船 ＋ カウントブースト
       W5 … 断絶界2つ（耐久+1）＋ カウントブースト
       W6 … 断絶界3つ（耐久+1）＋ 風船 ＋ カウントブースト ＋ 内部弱点 */
  if (sp === "verdant") {
    const wardN = w <= 1 ? 1 : w >= 5 ? 3 : 2;
    g.ward = { n: wardN, hits: WARD_HITS + (w >= 4 ? 1 : 0) };
    if (w === 1 || w === 3 || w >= 5) g.balloon = { n: w >= 5 ? 4 : 3 };
    if (w >= 2) g.countboost = 1;
    if (w >= 5) g.innerweak = 1;                                       // 最後のWAVEだけボスが内部弱点
  }
  /* ★ 2026-08-11 第20ノ園（業火／pyre）: 断絶界 ＋ エーテル ＋ ヴァニッシュボックス ＋ 内部弱点。
     こちらもWAVEごとに重なりを変える。エーテルの必要数はWAVEが進むほど増える。
       W1 … 断絶界1つ ＋ エーテル（まだ箱は消えない）
       W2 … 断絶界1つ ＋ エーテル ＋ ヴァニッシュ
       W3 … 断絶界2つ ＋ エーテル ＋ ヴァニッシュ
       W4 … 断絶界2つ ＋ エーテル ＋ ヴァニッシュ ＋ 内部弱点
       W5 … 断絶界2つ（耐久+1）＋ エーテル ＋ ヴァニッシュ ＋ 内部弱点 ＋ 風船（立て直しの保険）
       W6 … 断絶界3つ（耐久+1）＋ エーテル ＋ ヴァニッシュ ＋ 内部弱点 */
  if (sp === "pyre") {
    g.ward = { n: w <= 1 ? 1 : w >= 5 ? 3 : 2, hits: WARD_HITS + (w >= 4 ? 1 : 0) };
    g.photon = { n: 3, need: 2 + Math.floor(w / 2) };
    if (w >= 1) g.vanish = 1;
    if (w >= 3) g.innerweak = 1;
    if (w === 4) g.balloon = { n: 3 };
  }
  /* 壁系ギミックが重ならないよう最後に必ず1種類へ絞る（上のどの分岐から来ても効く） */
  return dedupeWallFx(g);
}
/* WAVEごとの地形＝導線（通り道）。
   ★ モンストの「黎絶」「破界の星墓」のように、壁で通路を仕切って“どこを通すか”を考えさせる。
     敵の配置はWAVEごとに変わるので、地形も敵にぶつからない「空き帯」を見つけて自動で敷く。
     こうすると敵とブロックが重なって挟まる（＝詰む）ことが構造的に起きない。
   ブロックが対策ギミックに入っていない園では、代わりに透明パネル（地形）で導線を作る。 */
const GARDEN_ROUTES = [
  [[.05, .34], [.61, .34]],              // 中央に1本の通路
  [[.28, .44]],                          // 中央をふさぐ＝左右から回り込む
  [[.02, .26], [.37, .26], [.72, .26]],  // 2か所の細いすき間
  [[.05, .55]],                          // 右側だけが通れる
  [[.40, .55]],                          // 左側だけが通れる
  [[.12, .30], [.55, .33]],              // 互い違いのゲート
];
/* ★ v14: 園ごとに導線パターンを変えて「同じ盤面が2つない」ようにする */
const GARDEN_ROUTE_KEY = ["", "centerLane", "twinPillar", "stair", "centerPlug", "zigzag", "funnel",
  /* ★ 2026-08-03: 第8〜10ノ園。既に使った導線と重ならないものを割り当てる */
  "sideGate", "triSlit", "wideHall",
  /* ★ 2026-08-04: 第11・12ノ園ぶんの導線を新しく足す（既存9種は全部つかい切っている） */
  "crossGate", "spiral",
  /* ★ 2026-08-07: 第13〜15ノ園ぶん（ROUTE_LIB に3種を新設した） */
  "edgeRun", "windowGate", "latticeCage",
  /* ★ 2026-08-10: 第16〜18ノ園ぶん（ROUTE_LIB に3種を新設した） */
  "crescent", "beadRow", "hourglass",
  /* ★ 2026-08-11: 第19・20ノ園ぶん（ROUTE_LIB に2種を新設した） */
  "leafVein", "emberGate"];
/* ★ 2026-08-11 撃種変化パネルを置く園（SWAP_LIB のキー）。
   置かない園は書かない。パネルは「敵とも壁とも重ならない候補だけ」採用される（varyTerrain）ので、
   ここに書いても盤面が詰まることはない。 */
const GARDEN_SWAP_KEY = { 19: "gardenA", 20: "gardenB" };
/* ウォールチェンジの園で「消えるボックス」にしてよい上限（★ 2026-08-08）。
   ★ gardenTerrain より前で宣言すること（ステージ定義は読み込み時に組み立てられる＝TDZ対策）。 */
const WCHG_VANISH_MAX = 1;
/* ══ ★ 2026-08-08c 「読みにくいバウンド」を減らす園の見わけ ══
   透明パネル（点滅して実体化⇄透過が入れ替わる）とヴァニッシュボックス（ふれた箱が次のターンに消える）は、
   <b>撃つ前に読んだルートを、あとから作り変えてしまう</b>地形。
   これが次の3つのギミックと重なると、イレギュラーなバウンドが起きてルートが読み切れなくなる。
     ・ウォールチェンジ … 壁のどこに当てるかを先まで読むギミック
     ・エーテル       … 拾って運んでぶつける＝1ターンの道すじを立てるギミック
     ・透明スイッチ   … 1ターン1回きりの入れ替えを、どこで踏むか組み立てるギミック
   そこで、この3つのどれかが出る園では地形を最小限にする。
     ・段数（rows）   … ウォールチェンジの園は1段、それ以外は2段まで
     ・厚み（th）     … 0.042 → LOW_TERRAIN_TH（当たり判定の角が減る＝妙な跳ね返りが減る）
     ・ヴァニッシュ印 … ヴァニッシュが主役の園でも2個まで、それ以外は1個まで
   ★ gardenTerrain より前で宣言すること（TDZ対策）。 */
const LOW_TERRAIN_TH = 0.030;
const LOW_TERRAIN_VANISH_MAX = 2;   // ヴァニッシュが主役の園で「消える箱」にしてよい上限
/* その園にエーテルが出るか（gardenGim の photon 分岐と必ずそろえること） */
const GARDEN_PHOTON_SP = ["vanish", "chaos", "mirror", "eclipse", "aurora", "abyss", "phantom", "requiem", "genesis",
  /* ★ 2026-08-10 第17・18ノ園 */ "stellar", "nirvana",
  /* ★ 2026-08-11 第20ノ園（第19ノ園はエーテルを出さない） */ "pyre"];
/* その園に透明スイッチが出るか（gardenGim の ghostswitch 分岐と必ずそろえること） */
const GARDEN_GSWITCH_SP = ["phantom", "requiem", "genesis",
  /* ★ 2026-08-10 第16・18ノ園 */ "samsara", "nirvana"];
function gardenLowTerrain(k) {
  const sp = GARDEN_SPECIAL[k - 1];
  return !!GARDEN_WALLCHG[k - 1] || GARDEN_PHOTON_SP.indexOf(sp) >= 0 || GARDEN_GSWITCH_SP.indexOf(sp) >= 0;
}
function gardenTerrain(k, w, defs) {
  const opt = {};
  const rk = GARDEN_ROUTE_KEY[k - 1];
  if (rk && ROUTE_LIB[rk]) opt.routes = ROUTE_LIB[rk];
  opt.phase = k % 2;
  if (k === 4) opt.rows = 4;      // 第4ノ園: ボックスを多めに置いてヴァニッシュを活かす
  if (k === 7) opt.rows = 2;      // 第7ノ園: 結界とエーテルが主役なので地形は控えめ
  if (k === 8) opt.rows = 2;      // 第8ノ園: 減速壁で足が止まるので、地形はゆるめにして詰みを避ける
  if (k === 9) opt.rows = 4;      // 第9ノ園: ヴァニッシュで道を作りながら進む＝箱を多めに
  if (k === 10) opt.rows = 3;     // 第10ノ園: 全部盛りなので中庸
  /* ★ 2026-08-07 第13〜15ノ園 */
  if (k === 13) opt.rows = 2;     // 第13ノ園: 透明スイッチが主役。地形はゆるめにして「踏みに行ける」余地を残す
  if (k === 14) opt.rows = 3;     // 第14ノ園: 壁を稼ぐ立ち回りが要るので中庸
  if (k === 15) opt.rows = 4;     // 第15ノ園: 最果て。ヴァニッシュで自分から道を作らせる
  /* ★ 2026-08-10 第16〜18ノ園（下の low / wchg でさらに段数は絞られる） */
  if (k === 16) opt.rows = 2;     // 第16ノ園: 透明スイッチを踏みに行ける余地を残す
  if (k === 17) opt.rows = 1;     // 第17ノ園: ウォールチェンジの園なので1段だけ
  if (k === 18) opt.rows = 4;     // 第18ノ園: 最果て。ヴァニッシュで自分から道を作らせる
  /* ★ 2026-08-11 第19・20ノ園 */
  if (k === 19) opt.rows = 3;     // 第19ノ園: 断絶界を割りに行く余地を残しつつ、導線は効かせる
  if (k === 20) opt.rows = 3;     // 第20ノ園: エーテルの園なので下の low 側で 2段まで絞られる
  /* ★ 2026-08-11 撃種変化パネル。敵とも壁とも重ならない候補だけが採用される（varyTerrain） */
  const swk = GARDEN_SWAP_KEY[k];
  if (swk && SWAP_LIB[swk]) opt.swaps = SWAP_LIB[swk];
  /* ══ ★ 2026-08-08 ウォールチェンジの園は「消える／現れる壁」を最小限にする ══
     ウォールチェンジ（壁にふれるたび青→黄→赤と色が回る）は、
     <b>壁のどこに当てるかを1ショットぶん先まで読む</b>のが遊びかたのギミック。
     ところが同じ盤面に
       ・透明パネル（点滅して実体化⇄透過が入れ替わる）
       ・ヴァニッシュボックス（最後にふれた1つが次のターンに消える）
     が何段も並んでいると、<b>読んだはずのルートが跳ね返る場所ごと変わって</b>しまい、
     「イレギュラーバウンドでルートが読めない」状態になっていた。
     ・導線は<b>1段だけ</b>に減らす（rows = 1）
     ・ヴァニッシュ印を付けるのも<b>WCHG_VANISH_MAX 個まで</b>。残りはふつうの壁のまま
     こうすると「壁の色を回す」ことに集中でき、跳ね返りも読み切れる。 */
  const wchg = !!GARDEN_WALLCHG[k - 1];
  /* ★ 2026-08-08c ウォールチェンジ・エーテル・透明スイッチが出る園は地形を最小限にする
     （イレギュラーなバウンドでルートが読めなくなるため）。段数を減らし、壁も薄くする。 */
  const low = gardenLowTerrain(k);
  if (wchg) opt.rows = 1;
  else if (low) opt.rows = Math.min(opt.rows || 3, 2);
  if (low) opt.th = LOW_TERRAIN_TH;
  const t = varyTerrain(GARDEN_ANTI[k - 1].includes("block"), w, defs, opt);
  /* ★ v14 ヴァニッシュボックス: 第4ノ園（と第7ノ園の後半）はブロックに vanish 印をつける。
     最後にふれたボックスが次のターンに消えるので、通り道が毎ターン作り変わる。 */
  const sp = GARDEN_SPECIAL[k - 1];
  if (sp === "vanish" || sp === "chaos" || sp === "mirror" || sp === "genesis" || sp === "nirvana" || sp === "pyre") {
    /* 透明パネルも「消える箱」として実体化させる（第4ノ園はボックスの数が要るため）。
       ★ 2026-08-11 第20ノ園（pyre）もここに入れる。エーテルを運ぶ園なので、
         点滅する透明パネルを残すとルートが読み切れなくなる（実体の箱にそろえる）。 */
    if (sp === "vanish" || sp === "mirror" || sp === "genesis" || sp === "nirvana" || sp === "pyre") { t.blocks = t.blocks.concat(t.ghost || []); t.ghost = []; }
    /* 消える箱の数の上限。
       ウォールチェンジの園は1個まで、それ以外の「最小限にする園」は2個まで（ギミック自体は残す）。 */
    const cap = wchg ? WCHG_VANISH_MAX : low ? LOW_TERRAIN_VANISH_MAX : t.blocks.length;
    t.blocks.forEach((b, i) => { if (i < cap) { b.vanish = 1; b.vid = "vb" + w + "_" + i; } });
  }
  return t;
}
/* WAVEごとに変わる導線（通り道）を組み立てる汎用版。
   幽冥の庭園だけでなく、黄昏の王城・禁忌の迷宮の最深部（第25〜28の間）やEX降臨でも使う。
   opt:
     routes … 導線パターンの配列（各要素は [x, 幅] の帯のリスト）。省略時は GARDEN_ROUTES
     rows   … 何段まで敷くか（既定3）
     th     … 壁の厚み（既定 0.042）
     pass   … "alt"（段ごとに反射／貫通の限定ブロックを交互に）／null
     swaps  … 撃種変化パネルを置く候補（[x,y] の配列）。敵と重ならないものだけ採用
     phase  … 透明パネルの点滅位相のオフセット（部屋ごとに変えて別物に見せる） */
function varyTerrain(useBlock, w, defs, opt) {
  opt = opt || {};
  const routes = opt.routes || GARDEN_ROUTES;
  const rows = opt.rows || 3;
  const CW = 720, CH = 920, TH = opt.th || 0.042;   // TH = 壁の厚み（画面高さに対する割合）
  /* 敵が占める矩形（半径は makeEnemy の 1.22 倍＋余白ぶんを見込む） */
  const occ = (defs || []).map((d) => {
    const r = (d.r || 48) * 1.22 + 18;
    return { x0: d.x - r / CW, x1: d.x + r / CW, y0: d.y - r / CH, y1: d.y + r / CH };
  });
  /* 味方4体のスタート地点（画面下部）も避ける */
  for (let i = 0; i < 4; i++) occ.push({ x0: (0.2 + 0.2 * i) - 0.1, x1: (0.2 + 0.2 * i) + 0.1, y0: 0.74, y1: 1 });
  const free = (x, wd, y) => !occ.some((o) => x < o.x1 && x + wd > o.x0 && y < o.y1 && y + TH > o.y0);
  const blocks = [], ghost = [], swap = [];
  const usedY = [];
  /* 上から順に「その壁を置ける高さ」を探し、間隔をあけて最大 rows 段ぶん敷く */
  for (let y = 0.07; y <= 0.70 && usedY.length < rows; y += 0.01) {
    if (usedY.some((u) => Math.abs(u - y) < 0.10)) continue;
    const route = routes[(w + usedY.length * 2) % routes.length];
    const segs = route.filter((seg) => free(seg[0], seg[1], y));
    if (segs.length < route.length) continue;   // その段はきれいに敷けない → 次の高さへ
    usedY.push(y);
    const bi = usedY.length - 1;
    segs.forEach((seg, si) => {
      const rc = { x: seg[0], y, w: seg[1], h: TH };
      /* 撃種限定ブロック（青＝反射のみ／金＝貫通のみ）。段ごと・帯ごとに通せる撃種が入れ替わる。
         アンチ系では消せないので「撃種変化パネルで抜ける」導線の骨になる。 */
      if (opt.pass === "alt" && bi < 2) {
        blocks.push(Object.assign(rc, { pass: ((bi + si + w) % 2 === 0) ? "bounce" : "pierce" }));
        return;
      }
      /* 1段目だけをブロック、それ以外は透明パネル（実体化⇄透過が入れ替わるゲート）にする。
         ブロックが対策ギミックに入っていない部屋では、すべて透明パネルにする。 */
      if (useBlock && bi === 0) blocks.push(rc);
      else ghost.push(Object.assign(rc, { phase: (bi + si + (opt.phase || 0)) % 2 }));
    });
  }
  /* 撃種変化パネル: 敵・敷いた壁と重ならない候補だけ採用する */
  (opt.swaps || []).forEach((p, i) => {
    const x = p[0], y = p[1], r = p[2] || .045;
    const hitEnemy = occ.some((o) => x + r > o.x0 && x - r < o.x1 && y + r > o.y0 && y - r < o.y1);
    const hitWall = blocks.concat(ghost).some((b) => x + r > b.x && x - r < b.x + b.w && y + r > b.y - .02 && y - r < b.y + b.h + .02);
    if (!hitEnemy && !hitWall) swap.push({ x, y, r });
  });
  return { blocks, ghost, swap };
}
/* ★「ギミックが重ならない」ことをコード側で保証する。
   そのWAVEの敵の当たり判定・味方のスタート位置と重なるブロック／透明パネルは取り除く。
   （敵とブロックが重なると、はさまって抜けられない“詰み”の原因になる） */
function gardenCleanTerrain(t, defs) {
  /* この関数はステージ定義の組み立て時（バトルエンジンの W/H 定数より前）に走るので、盤面サイズは直値で持つ */
  const CW = 720, CH = 920;
  const boxes = (defs || []).map((d) => {
    const r = (d.r || 48) * 1.22 + 16;   // makeEnemy が半径を1.22倍にするぶんも見込む
    return { x0: d.x * CW - r, x1: d.x * CW + r, y0: d.y * CH - r, y1: d.y * CH + r };
  });
  /* 味方4体のスタート地点（画面下部）も空けておく */
  for (let i = 0; i < 4; i++) boxes.push({ x0: CW * (0.2 + 0.2 * i) - 70, x1: CW * (0.2 + 0.2 * i) + 70, y0: CH * 0.74, y1: CH });
  const keep = (rc) => {
    const a = { x0: rc.x * CW, x1: (rc.x + rc.w) * CW, y0: rc.y * CH, y1: (rc.y + rc.h) * CH };
    return !boxes.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0);
  };
  return { blocks: (t.blocks || []).filter(keep), ghost: (t.ghost || []).filter(keep), swap: (t.swap || []).slice() };
}
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-15 第11〜20ノ園の敵の攻撃力をすこし下げる
   ------------------------------------------------------------
   攻撃力は 2900 × 1.11^(k−1) の等比のままだったので、
   第20ノ園は第1ノ園の <b>7.3倍</b>（およそ21,000）になっていた。
   奥の園ほど減速壁・断絶界・透明スイッチで手数を持っていかれるため、
   被弾そのものを減らしにくく、「1発もらうと立て直せない」形になっていた。

   ★ HP（GARDEN_BOSS_HP）は<b>触らない</b>。
     殴りごたえは残したままで、事故の重さだけを軽くしたいので、
     ここでは攻撃力だけに係数を掛ける。

   係数は 第11ノ園 0.95 → 第20ノ園 0.85 へなだらかに。
   第10ノ園（1.00）との段差が出ないように、下げ幅は 5% から始める。
   ══════════════════════════════════════════════════════════════ */
/* ★ 2026-08-17b 係数を大きく見直した。
   0.95 → 0.85 では<b>まったく足りていなかった</b>。実測すると、
   Lv60のSSR 4体（HP合計 47,038）に対して 1WAVE ぶんの雑魚の攻撃力合計は

     第11ノ園  42,635（HPの 91%）
     第15ノ園  61,694（HPの131%）
     第20ノ園  97,577（HPの<b>207%</b>）

   で、最奥では<b>1巡ぶんの攻撃を受けきると2回全滅する</b>量だった。
   もとの攻撃力が園ごとに約9.5%ずつ増えるのに対し、係数は10%しか下げていないため、
   奥へ行くほど差が開くいっぽうだったのが原因。

   そこで<b>係数の下げ幅そのものを奥ほど大きく</b>し、
   「HPの90〜100%前後」＝<b>受けきると落ちるが、倒しながら進めば勝てる</b>量にそろえた。
   ★ HP（GARDEN_BOSS_HP）は変えていない。殴りごたえは元のまま。 */
const GARDEN_ATK_EASE_FROM = 11;   // ここから軽くする園
const GARDEN_ATK_EASE_HEAD = 0.92; // 第11ノ園の係数
const GARDEN_ATK_EASE_TAIL = 0.40; // 第20ノ園（＝最奥）の係数
function gardenAtkEase(k) {
  if (k < GARDEN_ATK_EASE_FROM) return 1;
  const span = Math.max(1, GARDEN_N - GARDEN_ATK_EASE_FROM);   // 11→20 なら 9
  const t = Math.min(1, (k - GARDEN_ATK_EASE_FROM) / span);
  return GARDEN_ATK_EASE_HEAD + (GARDEN_ATK_EASE_TAIL - GARDEN_ATK_EASE_HEAD) * t;
}
function gardenStage(k) {
  const el = GARDEN_ELS[k - 1];
  const anti = GARDEN_ANTI[k - 1];
  const useGrav = anti.includes("grav");
  /* HP・攻撃力は「黄昏の王城 第25の間」を少し上回るところから始めて、園ごとに伸ばす。
     （第25の間: HP基準 ≒ 46万・攻撃 ≒ 2,300／幽冥の庭園 第1ノ園: HP基準 52万・攻撃 2,900） */
  /* ★ 2026-08-08: HPは <b>GARDEN_BOSS_HP の表がすべて</b>（等比計算＋園ごとの倍率は廃止）。
     ここではいったん仮の基準で組み立てておき、waves を作ったあとで
     「最後のWAVEのボスが表の値ちょうどになる」ように全体を伸縮させる（下の rescale）。
     攻撃力はこれまでどおり園ごとに等比で伸ばす（HPを下げても手ごたえは残るように）。 */
  const hpB = GARDEN_BOSS_HP[k - 1] || GARDEN_BOSS_HP[GARDEN_BOSS_HP.length - 1];
  let atkB = Math.round(2900 * Math.pow(1.11, k - 1) * gardenAtkEase(k));
  const sp = GARDEN_SPECIAL[k - 1];
  /* ★ v14.3: ヒーリングバルーンの園は「回復しながら戦える」ぶん被弾を軽く見られがちなので、
     敵の攻撃力を少し高め（×1.10）にして、拾って運ぶ判断に緊張感を持たせる。
     ※ 上げすぎると先の園（第4・5ノ園）より痛くなって難易度の順番が崩れるので、
       あくまで「少しだけ」に留めている（第4ノ園の攻撃力を超えない範囲）。 */
  if (sp === "balloon") atkB = Math.round(atkB * 1.10);
  /* ★ 2026-08-03: glacier（第8ノ園）は減速壁で手数が落ちるぶん、敵の攻撃力を少し上げて緊張感を残す
     （HPの上下げは GARDEN_HP の表へ移した） */
  if (sp === "glacier") atkB = Math.round(atkB * 1.08);
  const mob = k <= 2 ? "zenos" : "valga";
  const mk = (mult, x, y, o) => Object.assign(
    { el, sp: mob, hp: Math.round(hpB * mult), atk: Math.round(atkB * (o && o.boss ? 1.45 : 1)), cd: 2 + (x > .5 ? 1 : 0), r: 46, x, y }, o || {});
  /* ボスは専用スプライト。★ v14: 属性はクエスト側（GARDEN_ELS）に合わせる。
     ★ 2026-08-07: <b>第11〜15ノ園のボスはドミニア（蝕魔族）</b>に交代した。
       第1〜10ノ園はこれまでどおりヘカーティア（冥花種）。
       種族が変わるので、冥花種キラーだけを積んだ編成では奥の5園に通らなくなる
       ——そこを埋めるのが新アビリティ「蝕冥滅殺M」（冥花種＋蝕魔族の両方に効く）。 */
  const bossSp = k >= 11 ? "dominia" : "hecatia";
  const bs = (mult, o) => mk(mult, .5, .26, Object.assign({ sp: bossSp, boss: 1, weak: 1, r: 84 }, o || {}));
  const gv = (n) => (useGrav ? { grav: n } : {});   // 重力バリアは「対策できる園」だけに出す
  /* ★ v14: 園ごとに「敵の陣形」を変えて、同じクエストが2つないようにする。
     GARDEN_FORM[k-1] が WAVE1〜3（雑魚戦）の並び方を決める。WAVE4〜6はボス戦。 */
  const FORM = GARDEN_FORM[k - 1];
  const waves = [
    FORM.w1(mk, gv), FORM.w2(mk, gv), FORM.w3(mk, gv),
    FORM.w4(mk, bs, gv, k), FORM.w5(mk, bs, gv, k), FORM.w6(mk, bs, gv, k),
  ];
  /* ★ 2026-08-08 HPをそろえる（rescale）。
     GARDEN_FORM はボスの倍率まで園ごとに別々（×3.4〜×6.2）なので、基準HPをそろえても
     実際に殴るHPはそろわない。<b>最後のWAVEのボスが表の値ちょうど</b>になる比率を出して、
     その比率を6つのWAVEの敵ぜんぶに掛ける（雑魚とボスの力関係は園ごとの設計のまま残る）。 */
  (() => {
    const last = waves[waves.length - 1] || [];
    const boss = last.find((d) => d && d.boss) || last[0];
    if (!boss || !boss.hp) return;
    const scale = (GARDEN_BOSS_HP[k - 1] || boss.hp) / boss.hp;
    if (!isFinite(scale) || scale <= 0 || Math.abs(scale - 1) < 1e-6) return;
    waves.forEach((wv) => wv.forEach((d) => { if (d && d.hp) d.hp = Math.max(1, Math.round(d.hp * scale)); }));
  })();
  /* ★ 2026-08-16b 弱点を「内部」と「外部」で混ぜる。
     ------------------------------------------------------------
     これまで内部弱点はボス専用で、雑魚戦は「早く溶かして次へ」だけの作業だった。
     かといって全部の雑魚に弱点を置くと、どこを狙っても同じになってしまう。
     そこで<b>1つのWAVEの中に、外部弱点・内部弱点・弱点なしが混ざる</b>ようにする。
       ・外部弱点（weak）      … 弱点コアに直接当てる
       ・内部弱点（innerWeak） … 貫通で中を通す
       ・弱点なし              … ふつうに削る
     どれを狙うかで撃ちかたが変わるので、盤面を見る意味が生まれる。

     ・どの敵がどれになるかは <b>園番号・WAVE番号・並び順</b>だけで決める。
       ここで乱数を使うと、オンラインで端末ごとに違う敵が弱点持ちになり、
       同じ盤面を見ているはずなのにダメージが食い違う。
     ・雑魚は3体に1体くらいが「弱点なし」で残る（＝弱点を持たない雑魚もいる）。
     ・ボスはもともと外部弱点を持っているので、園ごとに内部へ振り替える。
     ・対象は第3ノ園から。序盤の園は導線を読む練習なので、要素を足さない。 */
  if (k >= GARDEN_INNERWEAK_FROM) {
    waves.forEach((wv, w) => {
      let mi = 0;
      wv.forEach((d) => {
        if (!d) return;
        if (d.boss) {
          /* ボス: 園とWAVEで内部／外部を入れ替える（どちらか一方だけを持たせる） */
          if ((k + w) % 2 === 0) { d.innerWeak = 1; d.weak = 0; }
          else { d.weak = 1; d.innerWeak = 0; }
          return;
        }
        /* 雑魚: 0=外部 / 1=内部 / 2=なし の3種を順に配る */
        const slot = (k + w + mi) % 3;
        mi++;
        if (slot === 0) { d.weak = 1; d.innerWeak = 0; }
        else if (slot === 1) { d.innerWeak = 1; d.weak = 0; }
        else { d.weak = 0; d.innerWeak = 0; }
      });
    });
  }
  const gimByWave = waves.map((_, w) => gardenGim(k, w));
  const terrainByWave = waves.map((_, w) => gardenCleanTerrain(gardenTerrain(k, w, waves[w]), waves[w]));
  /* ★ 2026-08-07: 断絶界（旧・結界）がアンチギミックになったので、
     「アンチギミックは2種だけ」と書いていた説明文を実際の中身から組み立て直す。
     ★ 2026-08-07 その2: 断絶界が出るのは<b>第7ノ園と第11ノ園だけ</b>になったので、
       3種になるのはその2園だけ。並びは ANTI_ORDER にそろえる。 */
  const antiNm = { dw: "ダメージウォール", grav: "重力バリア", warp: "ワープ", mine: "地雷", slowwall: "減速壁", block: "ブロック", lockzone: "ロックゾーン", ward: "断絶界" };
  const hasWard = gimByWave.some((g) => g && g.ward);
  const antiList = orderAntiKeys(anti.concat(hasWard ? ["ward"] : []));
  return {
    id: "gd" + k, nm: "幽冥の庭園・第" + k + "ノ園", room: k, garden: 1,
    /* ★ 2026-08-04 第8〜12ノ園は有利属性の倍率を 1.25 → 1.50 に。
       減速壁で手数が落ちる後半の園ほど「属性をそろえて挑む」意味を大きくする。
       elemUpMul() がこの値を読む（アドバンテージ・ネクサスのぶんは、さらに上に乗る）。 */
    elemUp: k >= 8 ? 1.50 : 0,
    /* 難度の呼び名。番号のままだと最深部が「★幽12」で味気ないので、
       節目の園にはそれぞれの二つ名をあてる（★ 2026-08-04 に白夜・虚渦を追加）。 */
    diff: sp === "eclipse" ? "★幽果" : sp === "chaos" ? "★幽極"
        : sp === "aurora" ? "★幽白" : sp === "abyss" ? "★幽虚"
        : sp === "phantom" ? "★幽幻" : sp === "requiem" ? "★幽響" : sp === "genesis" ? "★幽創"
        : sp === "samsara" ? "★幽輪" : sp === "stellar" ? "★幽星" : sp === "nirvana" ? "★幽涅"
        : sp === "verdant" ? "★幽翠" : sp === "pyre" ? "★幽業" : "★幽" + k,
    gold: 9000 + k * 2600 + (sp === "chaos" ? 12000 : 0) + (sp === "eclipse" ? 20000 : 0) + (sp === "genesis" ? 26000 : 0)
      + (sp === "nirvana" ? 30000 : 0) + (sp === "verdant" ? 30000 : 0) + (sp === "pyre" ? 34000 : 0),
    /* ★ 2026-08-06: 初クリアのジェムを<b>全園 15個で統一</b>した。
       これまでは 10／15／20（第7ノ園）とバラバラで、「どの園を先にやると得なのか」が
       表を見ないと分からず、開放順どおりに進めると損をすることまであった。
       幽冥の庭園はどの園も超絶高難易度なので、初クリアの価値もそろえる。 */
    orb: GARDEN_ORB, exp: 2000 + k * 420,
    bgKey: "garden", bgm: "forbidden-labyrinth.mp3",
    gim: gimByWave[0], blocks: terrainByWave[0].blocks, ghost: terrainByWave[0].ghost, swap: [],
    gimByWave, terrainByWave, hi: true,
    desc: (sp === "eclipse" ? "<b style='color:#ff3a6b'>幽冥のさらに奥、終わりの園</b>。"
      : sp === "chaos" ? "<b style='color:#ff3a6b'>超絶高難易度の最果て</b>。" : "<b>超絶高難易度</b>。")
      + GARDEN_NM[k - 1] + "の" + (bossSp === "dominia" ? "ドミニア" : "ヘカーティア") + "が待つ第" + k + "ノ園。アンチギミックは<b>"
      + antiList.map((a) => antiNm[a]).join("と") + "の" + antiList.length + "種だけ</b>だが、<b>WAVEごとに配置と導線がすべて変わる</b>。敵は各WAVE<b>4〜5体</b>。"
      + GARDEN_DESC[k - 1],
    waves,
  };
}
/* ★ v14: 園ごとの追加説明（主役ギミックの遊び方） */
const GARDEN_DESC = [
  "まずは<b>導線を読み切る</b>ことに集中せよ！ブロックのすき間をどう抜けるかがすべて。",
  "<b style='color:#ffb84d'>カウントブーストウォール</b>が発動。<b>各壁2回・合計8回まで</b>壁にふれた回数だけ<b>直殴りの威力がアップ</b>（1回ごと+"
    + Math.round(CB_STEP * 100) + "%・最大×" + (1 + CB_STEP * CB_MAX).toFixed(2) + "）。<b>効果は毎ターンリセット</b>されるので、"
    + "そのターンのうちに壁を稼いでから殴りこめ！",
  "<b style='color:#2fbf71'>ヒーリングバルーン</b>が漂う園。<b>風船にふれると1つ獲得（最大" + HB_MAX + "つ）</b>し、"
    + "<b>味方にふれるたびに1つ消費してチームHPを回復</b>（1つにつき" + Math.round(HB_HEAL * 100) + "%）。"
    + "<b style='color:#e0405e'>ただし敵にふれると、1つ消費して『その敵』が" + Math.round(HB_FOE_HEAL * 100) + "%回復してしまう</b>ので、持っている間は敵に当てないこと。"
    + "この園は<b>敵の攻撃力が高め</b>なので、回復をあてにしすぎず被弾を減らす立ち回りも大事。"
    + "<b>所持数はターンをまたいでも消えない</b>ので、集めてから一気に使うのもアリ。",
  "<b style='color:#7ce8ff'>エーテル</b>と<b style='color:#c9a6ff'>ヴァニッシュボックス</b>の園。"
    + "盤面のボックスは<b>最後にふれた1つが次のターンに消える</b>。<b>通り道を自分で作りながら</b>、エーテルを運んでシールドを割れ！",
  /* ★ 2026-08-07: 断絶界の園 → ヒーリングウォールの園に変更（断絶界は第7・第11ノ園だけに） */
  "<b style='color:#2fbf71'>ヒーリングウォール</b>の園。<b>光っている面にふれるたびにチームHPが回復</b>する"
    + "（1回 " + (Math.round(HEALWALL_PCT * 1000) / 10) + "%・<b>回数制限なし</b>）。"
    + "回復できる面は<b>WAVEごとに変わる</b>ので、毎ターン壁を見てから撃つこと。"
    + "<b>削られてから壁で戻す</b>——攻めと回復をどう1ショットに同居させるかがこの園の遊びかた。",
  "さらに<b style='color:#ff5d47'>ウォールチェンジ</b>が発動し、壁にふれるたびに色が<b>青→黄→赤→青と一周</b>する。<b>赤のうちに大ダメージ</b>を叩き込め！",
  "<b style='color:#ff3a6b'>最終試練</b>。<b>ウォールチェンジ・断絶界・エーテル・カウントブーストウォール・ヴァニッシュボックス</b>が"
    + "<b>すべて同時に</b>襲いかかる。さらにボスは<b>内部弱点</b>持ちで、<b>貫通の直殴りとリンクスキルでしか弱点を撃ち抜けない</b>。"
    + "全ギミックを捌ききった者だけが黎明にたどり着く。",
  /* ★ 2026-08-03 追加 */
  "<b style='color:#2fd8ff'>減速壁</b>がはじめて登場する園。<b>凍った面にふれると、その攻撃ターンのあいだスピードが大幅に落ちる</b>（×"
    + SLOWWALL_MUL + "）。どの面が凍っているかは<b>WAVEごとに変わる</b>ので、毎ターン壁を見てから撃つこと。"
    + "足が止まりやすいぶん<b style='color:#2fbf71'>ヒーリングバルーン</b>が漂い、後半のWAVEでは<b style='color:#ffb84d'>カウントブーストウォール</b>も加わって"
    + "「凍っていない壁で火力を稼ぐ」立ち回りが要になる。さらに<b style='color:#c86bff'>ロックゾーン</b>がリンクスキルを封じてくる。"
    + "<b>アンチ減速壁</b>を持つ味方がいると一気に楽になる。",
  /* ★ 2026-08-07: 断絶界を外した（第9ノ園） */
  "<b style='color:#2fd8ff'>減速壁</b>と<b style='color:#1d78d8'>ブロック</b>が組み合う園。減速したまま壁に囲まれると立て直しがきかない。"
    + "<b style='color:#c9a6ff'>ヴァニッシュボックス</b>で足場が消え、"
    + "<b style='color:#7ce8ff'>エーテル</b>を運ばなければシールドも割れない。<b>盤面を自分で作り替えながら</b>進む、読みの園。",
  /* ★ 2026-08-07: 断絶界を外した（第10ノ園） */
  "<b style='color:#ff3a6b'>終焔</b>——幽冥の庭園のいちばん奥。<b>減速壁・重力バリア</b>で足を止められながら、"
    + "<b>カウントブーストウォール・ウォールチェンジ・エーテル・ヒーリングバルーン</b>が"
    + "<b>WAVEごとに組み合わせを変えて</b>襲いかかる。ボスは<b>内部弱点</b>持ち。"
    + "<b>アンチ減速壁とアンチ重力バリアの両方</b>を用意し、壁を赤にしてから撃ち抜け。",
  /* ★ 2026-08-04 追加（★ 2026-08-07: 断絶界が出るのは第7ノ園とこの第11ノ園だけになった） */
  "<b style='color:#2fbf71'>ヒーリングウォール</b>と<b style='color:#38a6ff'>断絶界</b>が重なる園。<b>光る面にふれるたびにチームHPが回復</b>する"
    + "（1回 " + (Math.round(HEALWALL_PCT * 1000) / 10) + "%・<b>回数制限なし</b>）。回復できる面は<b>WAVEごとに変わる</b>。"
    + "<br>そしてボスは<b style='color:#ffb84d'>クラッシュ攻撃</b>——カウントが0になると<b>HPを" + Math.round(CRUSH_LEFT * 100) + "%まで削られる</b>。"
    + "バリアでも耐性でも軽くできないので、<b>削られてから壁で戻す</b>のがこの園の戦い方。"
    + "<b style='color:#38a6ff'>断絶界</b>に閉じ込められると壁にも届かなくなるので、閉じ込められる前に割ること"
    + "（<b>アンチ断絶界</b>があれば1回で壊せる）。"
    + "<b style='color:#2fd8ff'>減速壁</b>と<b style='color:#ff5d47'>地雷</b>のアンチもいる。",
  /* ★ 2026-08-07: 断絶界を外した（第12ノ園） */
  "<b style='color:#ff3a6b'>虚渦</b>——幽冥の庭園の、そのまた奥。"
    + "<b style='color:#ff5d47'>ウォールチェンジ</b>で壁の色を回しながら、"
    + "<b style='color:#7ce8ff'>エーテル</b>を運び、<b style='color:#c9a6ff'>ヴァニッシュボックス</b>で消えていく足場を渡る。"
    + "ボスは<b>内部弱点</b>持ちで、<b>即死攻撃</b>と<b style='color:#ffb84d'>クラッシュ攻撃</b>を<b>両方</b>持つ。"
    + "<br><b>減速壁とワープ</b>のアンチをそろえ、<b>赤の壁で一気に決めきる</b>——それしか道はない。",
  /* ★ 2026-08-07 第13〜15ノ園 */
  "<b style='color:#c86bff'>透明スイッチ</b>がはじめて現れる園。<b>スイッチを1回踏むごとに、敵の「出現」と「透明」が入れ替わる</b>。"
    + "開始時点で<b>出ている敵</b>と<b>透明な敵</b>の両方が置かれていて、<b>透明な敵は殴れない</b>（当たり判定が無い）。"
    + "<b style='color:#ff8f8f'>ただし透明な敵も、ふつうに攻撃してくる</b>（攻撃・即死・クラッシュのカウントは止まらない）。"
    + "<br><b style='color:#ff8f8f'>⚠ 透明な敵も倒すまでWAVEは終わらない</b>ので、<b>踏んで入れ替えながら両方を削りきる</b>のがこの園の遊びかた。"
    + "<br><b>スイッチが反応するのは1ターンに1回だけ</b>。踏んだスイッチはその場から消え、<b>次のターンで復活</b>する。"
    + "「このターンはどのスイッチを踏むか」がそのまま組み立てになる、読み合いの園。"
    + "<br><b>ここから先のボスは<span style='color:#c9a6ff'>ドミニア（蝕魔族）</span></b>に変わる。"
    + "冥花種キラーは効かないので、<b>蝕冥滅殺</b>を持つ味方をそろえよう。"
    + "アンチは<b style='color:#d97800'>ダメージウォール</b>と<b style='color:#8e4fe0'>ワープ</b>の2種。",
  "<b style='color:#c86bff'>透明スイッチ</b>に<b style='color:#ffb84d'>カウントブーストウォール</b>と<b style='color:#7ce8ff'>エーテル</b>が重なる園。"
    + "<b>壁を稼いで火力を作り</b>、<b>エーテルを運んでシールドを割り</b>、<b>スイッチを踏んで敵を出す</b>——"
    + "この3つを<b>1ターンのなかでやりくり</b>しなければならない。"
    + "<br>カウントブーストは<b>毎ターンリセット</b>されるので、<b>踏む順番をまちがえると壁の稼ぎが丸ごと無駄になる</b>。"
    + "<b style='color:#e0405e'>地雷</b>と<b style='color:#1d78d8'>ブロック</b>のアンチをそろえて、動ける道を確保すること。",
  "<b style='color:#ff3a6b'>創生</b>——幽冥の庭園の、そのさらに奥。"
    + "<b style='color:#c86bff'>透明スイッチ</b>で敵を入れ替えながら、<b style='color:#ff5d47'>ウォールチェンジ</b>で壁の色を回し、"
    + "<b style='color:#7ce8ff'>エーテル</b>を運び、<b style='color:#c9a6ff'>ヴァニッシュボックス</b>で消えていく足場を渡り、"
    + "<b style='color:#2fbf71'>ヒーリングバルーン</b>で命をつなぐ。"
    + "<br>ボス<b style='color:#c9a6ff'>ドミニア</b>は<b>内部弱点</b>持ちで、<b>即死攻撃</b>と<b style='color:#ffb84d'>クラッシュ攻撃</b>を<b>両方</b>持つ。"
    + "<br><b style='color:#c86bff'>ロックゾーン</b>と<b style='color:#1d78d8'>ブロック</b>のアンチをそろえ、"
    + "<b>赤の壁で、出ているうちに決めきる</b>。それが創生の園の越えかた。",
  /* ★ 2026-08-10 第16〜18ノ園 */
  "<b style='color:#2fbf71'>ヒーリングウォール</b>と<b style='color:#c86bff'>透明スイッチ</b>が組み合う園。"
    + "<b>光っている面にふれるたびにチームHPが回復</b>する（1回 " + (Math.round(HEALWALL_PCT * 1000) / 10) + "%・<b>回数制限なし</b>）。"
    + "回復できる面は<b>WAVEごとに変わる</b>。"
    + "<br>同時に、<b>スイッチを1回踏むごとに敵の「出現」と「透明」が入れ替わる</b>（反応は<b>1ターンに1回だけ</b>）。"
    + "<b style='color:#ff8f8f'>透明な敵も攻撃してくるし、倒すまでWAVEは終わらない</b>。"
    + "<br><b>壁で回復するか、スイッチを踏んで敵を入れ替えるか</b>——その1ショットをどちらに使うかを"
    + "毎ターン選びつづける、輪廻の園。WAVE4からは<b style='color:#2fbf71'>ヒーリングバルーン</b>も漂う。"
    + "アンチは<b style='color:#8e4fe0'>ワープ</b>と<b style='color:#38a6ff'>重力バリア</b>の2種。",
  "<b style='color:#ff5d47'>ウォールチェンジ</b>・<b style='color:#7ce8ff'>エーテル</b>・"
    + "<b style='color:#2fbf71'>ヒーリングバルーン</b>の3つだけで組んだ園。"
    + "<b>盤面そのものは動かない</b>（ヴァニッシュボックスも透明スイッチも出ない）ぶん、<b>1ターンの配分</b>がすべて。"
    + "壁にふれるたび色が<b>青→黄→赤</b>と一周するので<b>赤のうちに叩き込む</b>——"
    + "ただし同じショットでエーテルを運び、風船も拾わなければ手が足りなくなる。"
    + "<br>WAVE5からはボスが<b>内部弱点</b>持ちになり、<b>貫通の直殴りとリンクスキルでしか弱点を撃ち抜けない</b>。"
    + "<b style='color:#e0405e'>地雷</b>と<b style='color:#c86bff'>ロックゾーン</b>のアンチをそろえること。",
  "<b style='color:#ff3a6b'>涅槃</b>——幽冥の庭園の、いちばん奥。"
    + "<b style='color:#c86bff'>透明スイッチ</b>で敵を入れ替えながら、"
    + "<b style='color:#2fbf71'>ヒーリングウォール</b>で命をつなぎ、<b style='color:#7ce8ff'>エーテル</b>を運び、"
    + "<b style='color:#c9a6ff'>ヴァニッシュボックス</b>で消えていく足場を渡る。"
    + "<br>第15ノ園（創生）が<b>ウォールチェンジと風船</b>の園なら、こちらは<b>回復壁で耐えぬく</b>園。"
    + "ボス<b style='color:#c9a6ff'>ドミニア</b>は<b>内部弱点</b>持ちで、<b>即死攻撃</b>と"
    + "<b style='color:#ffb84d'>クラッシュ攻撃</b>を<b>両方</b>持つ。"
    + "<br><b style='color:#8e4fe0'>ワープ</b>と<b style='color:#1d78d8'>ブロック</b>のアンチをそろえ、"
    + "<b>壁で戻した体力を、敵が出ているうちに全部ぶつける</b>。それが幽冥の庭園の終わりかた。",
  /* ★ 2026-08-11 第19・20ノ園 */
  "<b style='color:#38a6ff'>断絶界</b>と<b style='color:#2fbf71'>ヒーリングバルーン</b>、"
    + "そして<b style='color:#ffb84d'>カウントブーストウォール</b>が組み合う園。"
    + "<b>閉じこめられた仲間を割り出し</b>（<b>アンチ断絶界</b>があれば1回で壊せる）、"
    + "<b>風船を拾って運び</b>、<b>壁を稼いで火力を作る</b>——この3つを1ターンにどう詰めるかがすべて。"
    + "<br><b>WAVEごとに重なるギミックが入れ替わる</b>（W1は断絶界だけ、W6は断絶界3つ＋風船＋壁＋内部弱点）ので、"
    + "毎ターン盤面を見てから撃つこと。カウントブーストは<b>毎ターンリセット</b>されるので、"
    + "<b>割る前に稼ぐか、稼ぐ前に割るか</b>の順番を毎回組み立て直すことになる。"
    + "<br>この園には<b style='color:#7ce8ff'>撃種変化パネル</b>が四隅に置かれている。"
    + "<b>踏むと自分の撃種が入れ替わる</b>ので、貫通で断絶界の中へ入るか、反射で壁を稼ぐかを選べる。"
    + "<br>アンチは<b style='color:#c86bff'>ロックゾーン</b>と<b style='color:#38a6ff'>断絶界</b>の2種。",
  "<b style='color:#ff3a6b'>業火</b>——幽冥の庭園の、いちばん奥の炎。"
    + "<b style='color:#38a6ff'>断絶界</b>で閉じこめられながら、<b style='color:#7ce8ff'>エーテル</b>を運び、"
    + "<b style='color:#c9a6ff'>ヴァニッシュボックス</b>で消えていく足場を渡る。"
    + "<br><b>断絶界を割るための手数</b>と<b>エーテルを運ぶための手数</b>を同じ1ターンから出さなければならず、"
    + "しかも<b>必要なエーテルの数はWAVEが進むほど増える</b>。"
    + "WAVE4からはボスが<b>内部弱点</b>持ちになり、<b>貫通の直殴りとリンクスキルでしか弱点を撃ち抜けない</b>。"
    + "<br>ここにも<b style='color:#7ce8ff'>撃種変化パネル</b>がある。"
    + "<b>反射で盤面を回してから、パネルで貫通に変えて弱点を抜く</b>——それがこの園の答え。"
    + "<br>アンチは<b style='color:#1d78d8'>ブロック</b>と<b style='color:#38a6ff'>断絶界</b>の2種。",
];
/* ★ v14: 園ごとの敵の陣形（WAVE1〜6）。第1・第6ノ園はこれまでの構成をそのまま維持する */
const GARDEN_FORM_BASE = {
  w1: (mk, gv) => [mk(0.55, .18, .20, gv(105)), mk(0.55, .82, .20), mk(0.50, .40, .40, { r: 42 }), mk(0.50, .60, .40, { r: 42, pattern: "single" })],
  w2: (mk, gv) => [mk(0.62, .14, .26, { pattern: "laser" }), mk(0.62, .86, .26, gv(115)), mk(0.58, .35, .46, { r: 42, weak: 1 }), mk(0.58, .65, .46, { r: 42, weak: 1 }), mk(0.52, .5, .14, { r: 40, poisonAtk: 1 })],
  w3: (mk, gv) => [mk(0.72, .16, .22, { pattern: "homing" }), mk(0.72, .84, .22, { doomMob: 8 }), mk(0.66, .34, .44, Object.assign({ r: 42, weak: 1 }, gv(110))), mk(0.66, .66, .44, { r: 42, weak: 1 }), mk(0.60, .5, .60, { r: 40, poisonAtk: 1 })],
  w4: (mk, bs, gv) => [bs(2.0, Object.assign({ pattern: "all", doomMax: 8 }, gv(140))), mk(0.70, .12, .52, { r: 44, pattern: "laser" }), mk(0.70, .88, .52, { r: 44, poisonAtk: 1 }), mk(0.64, .5, .66, { r: 42, doomMob: 8 })],
  w5: (mk, bs, gv) => [bs(2.6, Object.assign({ pattern: "laser", doomMax: 7, r: 90 }, gv(150))), mk(0.78, .12, .54, { r: 44, pattern: "homing" }), mk(0.78, .88, .54, { r: 44, doomMob: 7 }), mk(0.72, .30, .68, { r: 42, weak: 1 }), mk(0.72, .70, .68, { r: 42, poisonAtk: 1 })],
  w6: (mk, bs, gv, k) => [bs(3.4, Object.assign({ pattern: "burst", doomMax: Math.max(5, 8 - k), doomPow: 0.95, r: 98 }, gv(165))), mk(0.86, .12, .56, { r: 44, pattern: "laser", poisonAtk: 1 }), mk(0.86, .88, .56, { r: 44, pattern: "homing", doomMob: 6 }), mk(0.80, .30, .70, { r: 42, weak: 1 }), mk(0.80, .70, .70, { r: 42, weak: 1 })],
};
const GARDEN_FORM = [
  /* 第1ノ園 … これまでどおり */
  GARDEN_FORM_BASE,
  /* 第2ノ園（カウントブースト）… 壁ぎわを大きく空けた「中央かたまり」陣形。壁を稼ぎやすいがHPは高い */
  {
    w1: (mk, gv) => [mk(0.72, .38, .30, { r: 44 }), mk(0.72, .62, .30, { r: 44 }), mk(0.66, .5, .48, gv(105)), mk(0.62, .5, .16, { r: 42, pattern: "single" })],
    w2: (mk, gv) => [mk(0.80, .5, .22, { r: 48, weak: 1, pattern: "laser" }), mk(0.74, .34, .42, { r: 42 }), mk(0.74, .66, .42, { r: 42 }), mk(0.70, .5, .58, { r: 42, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(0.88, .5, .18, { r: 46, pattern: "homing", weak: 1 }), mk(0.84, .30, .36, { r: 44, doomMob: 8 }), mk(0.84, .70, .36, { r: 44, weak: 1 }), mk(0.78, .40, .58, { r: 42 }), mk(0.78, .60, .58, { r: 42, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(2.4, { pattern: "all", doomMax: 8 }), mk(0.86, .22, .52, { r: 44, pattern: "laser" }), mk(0.86, .78, .52, { r: 44, poisonAtk: 1 }), mk(0.80, .5, .66, { r: 42, doomMob: 8 })],
    w5: (mk, bs, gv) => [bs(3.0, { pattern: "laser", doomMax: 7, r: 90 }), mk(0.92, .22, .54, { r: 44, pattern: "homing", weak: 1 }), mk(0.92, .78, .54, { r: 44, doomMob: 7 }), mk(0.86, .5, .68, { r: 42, weak: 1 })],
    w6: (mk, bs, gv, k) => [bs(4.0, { pattern: "burst", doomMax: 6, doomPow: 0.95, r: 98 }), mk(1.0, .20, .56, { r: 44, pattern: "laser", poisonAtk: 1 }), mk(1.0, .80, .56, { r: 44, pattern: "homing", doomMob: 6 }), mk(0.94, .38, .70, { r: 42, weak: 1 }), mk(0.94, .62, .70, { r: 42, weak: 1 })],
  },
  /* 第3ノ園（ヒーリングバルーン）… 敵を四隅に散らし、風船を拾いに走る余白を作る */
  {
    w1: (mk, gv) => [mk(0.55, .14, .16, gv(105)), mk(0.55, .86, .16), mk(0.52, .14, .46, { r: 42 }), mk(0.52, .86, .46, { r: 42, pattern: "single" })],
    w2: (mk, gv) => [mk(0.64, .12, .20, { pattern: "laser" }), mk(0.64, .88, .20, gv(115)), mk(0.60, .12, .52, { r: 42, weak: 1 }), mk(0.60, .88, .52, { r: 42, weak: 1 }), mk(0.56, .5, .34, { r: 44, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(0.74, .12, .16, { pattern: "homing" }), mk(0.74, .88, .16, { doomMob: 8 }), mk(0.70, .12, .54, Object.assign({ r: 42, weak: 1 }, gv(110))), mk(0.70, .88, .54, { r: 42, weak: 1 }), mk(0.66, .5, .36, { r: 44, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(2.1, Object.assign({ pattern: "all", doomMax: 7 }, gv(140))), mk(0.72, .10, .58, { r: 44, pattern: "laser" }), mk(0.72, .90, .58, { r: 44, poisonAtk: 1 }), mk(0.66, .5, .70, { r: 42, doomMob: 7 })],
    w5: (mk, bs, gv) => [bs(2.7, Object.assign({ pattern: "laser", doomMax: 6, r: 90 }, gv(150))), mk(0.80, .10, .58, { r: 44, pattern: "homing" }), mk(0.80, .90, .58, { r: 44, doomMob: 6 }), mk(0.74, .26, .72, { r: 42, weak: 1 }), mk(0.74, .74, .72, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(3.5, Object.assign({ pattern: "burst", doomMax: 5, doomPow: 0.95, r: 98 }, gv(165))), mk(0.88, .10, .58, { r: 44, pattern: "laser", poisonAtk: 1 }), mk(0.88, .90, .58, { r: 44, pattern: "homing", doomMob: 5 }), mk(0.82, .26, .72, { r: 42, weak: 1 }), mk(0.82, .74, .72, { r: 42, weak: 1 })],
  },
  /* 第4ノ園（エーテル＋ヴァニッシュボックス）… 縦に重なる陣形。箱を消しながら奥へ道を作る */
  {
    w1: (mk, gv) => [mk(0.56, .5, .12, { r: 44 }), mk(0.54, .30, .32, gv(105)), mk(0.54, .70, .32), mk(0.50, .5, .52, { r: 42, pattern: "single" })],
    w2: (mk, gv) => [mk(0.64, .5, .12, { r: 46, pattern: "laser" }), mk(0.62, .24, .34, { weak: 1 }), mk(0.62, .76, .34, gv(115)), mk(0.58, .38, .56, { r: 42, weak: 1 }), mk(0.58, .62, .56, { r: 42, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(0.74, .5, .12, { r: 46, pattern: "homing", weak: 1 }), mk(0.72, .22, .32, { doomMob: 8 }), mk(0.72, .78, .32, Object.assign({ weak: 1 }, gv(110))), mk(0.66, .34, .56, { r: 42 }), mk(0.66, .66, .56, { r: 42, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(2.0, Object.assign({ pattern: "all", doomMax: 8 }, gv(140))), mk(0.70, .18, .50, { r: 44, pattern: "laser" }), mk(0.70, .82, .50, { r: 44, poisonAtk: 1 }), mk(0.64, .5, .68, { r: 42, doomMob: 8 })],
    w5: (mk, bs, gv) => [bs(2.6, Object.assign({ pattern: "laser", doomMax: 7, r: 90 }, gv(150))), mk(0.78, .5, .54, { r: 46, pattern: "homing", weak: 1 }), mk(0.78, .16, .66, { r: 44, doomMob: 7 }), mk(0.72, .84, .66, { r: 44, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(3.4, Object.assign({ pattern: "burst", doomMax: 6, doomPow: 0.95, r: 98 }, gv(165))), mk(0.86, .5, .54, { r: 46, pattern: "laser", weak: 1 }), mk(0.86, .16, .68, { r: 44, pattern: "homing", doomMob: 6 }), mk(0.80, .84, .68, { r: 44, poisonAtk: 1 }), mk(0.80, .5, .74, { r: 42, weak: 1 })],
  },
  /* 第5ノ園（結界）… 左右に大きく割れた陣形。結界に閉じ込められると片側しか殴れない */
  {
    w1: (mk, gv) => [mk(0.58, .16, .28, gv(105)), mk(0.58, .84, .28), mk(0.54, .16, .52, { r: 42 }), mk(0.54, .84, .52, { r: 42, pattern: "single" })],
    w2: (mk, gv) => [mk(0.66, .18, .18, { pattern: "laser" }), mk(0.66, .82, .18, gv(115)), mk(0.62, .18, .48, { r: 42, weak: 1 }), mk(0.62, .82, .48, { r: 42, weak: 1 }), mk(0.58, .5, .66, { r: 42, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(0.76, .18, .16, { pattern: "homing", weak: 1 }), mk(0.76, .82, .16, { doomMob: 8 }), mk(0.70, .18, .48, Object.assign({ r: 42 }, gv(110))), mk(0.70, .82, .48, { r: 42, weak: 1 }), mk(0.64, .5, .66, { r: 42, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(2.1, Object.assign({ pattern: "all", doomMax: 7 }, gv(140))), mk(0.72, .14, .48, { r: 44, pattern: "laser" }), mk(0.72, .86, .48, { r: 44, poisonAtk: 1 }), mk(0.66, .5, .70, { r: 42, doomMob: 7 })],
    w5: (mk, bs, gv) => [bs(2.7, Object.assign({ pattern: "laser", doomMax: 6, r: 90 }, gv(150))), mk(0.80, .14, .46, { r: 44, pattern: "homing", weak: 1 }), mk(0.80, .86, .46, { r: 44, doomMob: 6 }), mk(0.74, .28, .70, { r: 42 }), mk(0.74, .72, .70, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(3.5, Object.assign({ pattern: "burst", doomMax: 5, doomPow: 0.95, r: 98 }, gv(165))), mk(0.88, .12, .46, { r: 44, pattern: "laser", poisonAtk: 1 }), mk(0.88, .88, .46, { r: 44, pattern: "homing", doomMob: 5 }), mk(0.82, .28, .70, { r: 42, weak: 1 }), mk(0.82, .72, .70, { r: 42, weak: 1 })],
  },
  /* 第6ノ園（ウォールチェンジ）… 壁ぎわに敵を寄せた「外周」陣形。
     ★ 2026-08-03: 以前は第1ノ園と同じ GARDEN_FORM_BASE を使い回していて、
       WAVEの構成が完全に同じクエストが2つ存在していた。ここで別物にする。 */
  {
    w1: (mk, gv) => [mk(0.60, .10, .30, gv(105)), mk(0.60, .90, .30), mk(0.54, .5, .12, { r: 44 }), mk(0.54, .5, .50, { r: 42, pattern: "single" })],
    w2: (mk, gv) => [mk(0.68, .08, .18, { pattern: "laser" }), mk(0.68, .92, .18, gv(115)), mk(0.62, .08, .52, { r: 42, weak: 1 }), mk(0.62, .92, .52, { r: 42, weak: 1 }), mk(0.58, .5, .34, { r: 46, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(0.78, .08, .16, { pattern: "homing", weak: 1 }), mk(0.78, .92, .16, { doomMob: 8 }), mk(0.72, .5, .34, Object.assign({ r: 46 }, gv(110))), mk(0.68, .08, .56, { r: 42, weak: 1 }), mk(0.68, .92, .56, { r: 42, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(2.2, Object.assign({ pattern: "all", doomMax: 7 }, gv(140))), mk(0.74, .08, .46, { r: 44, pattern: "laser" }), mk(0.74, .92, .46, { r: 44, poisonAtk: 1 }), mk(0.68, .5, .68, { r: 42, doomMob: 7 })],
    w5: (mk, bs, gv) => [bs(2.8, Object.assign({ pattern: "laser", doomMax: 6, r: 90 }, gv(150))), mk(0.82, .08, .44, { r: 44, pattern: "homing", weak: 1 }), mk(0.82, .92, .44, { r: 44, doomMob: 6 }), mk(0.76, .22, .70, { r: 42 }), mk(0.76, .78, .70, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(3.6, Object.assign({ pattern: "burst", doomMax: 5, doomPow: 0.95, r: 98 }, gv(165))), mk(0.90, .08, .42, { r: 46, pattern: "laser", poisonAtk: 1 }), mk(0.90, .92, .42, { r: 46, pattern: "homing", doomMob: 5 }), mk(0.84, .24, .72, { r: 42, weak: 1 }), mk(0.84, .76, .72, { r: 42, weak: 1 })],
  },
  /* 第7ノ園（超絶高難易度）… 敵5体＋ボスの護衛が厚い最終構成 */
  {
    w1: (mk, gv) => [mk(0.82, .16, .18, gv(120)), mk(0.82, .84, .18, { pattern: "laser" }), mk(0.78, .38, .40, { r: 44, weak: 1 }), mk(0.78, .62, .40, { r: 44, weak: 1 }), mk(0.72, .5, .60, { r: 42, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(0.92, .5, .14, { r: 48, pattern: "homing", weak: 1 }), mk(0.88, .16, .34, gv(125)), mk(0.88, .84, .34, { doomMob: 7 }), mk(0.82, .34, .58, { r: 42, weak: 1 }), mk(0.82, .66, .58, { r: 42, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(1.02, .5, .14, { r: 48, pattern: "laser", weak: 1 }), mk(0.96, .14, .32, Object.assign({ doomMob: 6 }, gv(130))), mk(0.96, .86, .32, { pattern: "homing" }), mk(0.90, .30, .56, { r: 42, weak: 1 }), mk(0.90, .70, .56, { r: 42, weak: 1, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(2.9, Object.assign({ pattern: "all", doomMax: 7, r: 90 }, gv(150))), mk(0.96, .12, .50, { r: 44, pattern: "laser", weak: 1 }), mk(0.96, .88, .50, { r: 44, poisonAtk: 1 }), mk(0.90, .30, .68, { r: 42, doomMob: 7 }), mk(0.90, .70, .68, { r: 42, pattern: "homing" })],
    w5: (mk, bs, gv) => [bs(3.7, Object.assign({ pattern: "laser", doomMax: 6, r: 96 }, gv(160))), mk(1.04, .12, .50, { r: 44, pattern: "homing", weak: 1 }), mk(1.04, .88, .50, { r: 44, doomMob: 6 }), mk(0.98, .30, .68, { r: 42, weak: 1 }), mk(0.98, .70, .68, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(4.8, Object.assign({ pattern: "burst", doomMax: 5, doomPow: 1.0, r: 104 }, gv(175))), mk(1.16, .10, .50, { r: 46, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.16, .90, .50, { r: 46, pattern: "homing", doomMob: 5 }), mk(1.08, .28, .70, { r: 44, weak: 1 }), mk(1.08, .72, .70, { r: 44, weak: 1, poisonAtk: 1 })],
  },
  /* ★ 2026-08-03 追加 ────────────────────────────────────────────
     第8ノ園（減速壁＋ブロック／glacier）… 画面の「上半分」に敵をまとめた高所陣形。
     減速壁で足が止まるので、遠くまで走らずに済む配置にして詰みを避ける。 */
  {
    w1: (mk, gv) => [mk(0.58, .26, .14, { r: 44 }), mk(0.58, .74, .14, { r: 44 }), mk(0.54, .5, .30, gv(105)), mk(0.50, .5, .46, { r: 42, pattern: "single" })],
    w2: (mk, gv) => [mk(0.66, .16, .12, { pattern: "laser" }), mk(0.66, .84, .12, { weak: 1 }), mk(0.62, .34, .30, { r: 42, weak: 1 }), mk(0.62, .66, .30, { r: 42, poisonAtk: 1 }), mk(0.58, .5, .48, { r: 44 })],
    w3: (mk, gv) => [mk(0.76, .5, .10, { r: 48, pattern: "homing", weak: 1 }), mk(0.72, .18, .28, { doomMob: 8 }), mk(0.72, .82, .28, { weak: 1 }), mk(0.66, .34, .46, { r: 42, poisonAtk: 1 }), mk(0.66, .66, .46, { r: 42 })],
    w4: (mk, bs, gv) => [bs(2.0, { pattern: "all", doomMax: 8 }), mk(0.72, .16, .46, { r: 44, pattern: "laser" }), mk(0.72, .84, .46, { r: 44, poisonAtk: 1 }), mk(0.66, .5, .58, { r: 42, doomMob: 8 })],
    w5: (mk, bs, gv) => [bs(2.6, { pattern: "laser", doomMax: 7, r: 90 }), mk(0.80, .16, .46, { r: 44, pattern: "homing", weak: 1 }), mk(0.80, .84, .46, { r: 44, doomMob: 7 }), mk(0.74, .34, .62, { r: 42, weak: 1 }), mk(0.74, .66, .62, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(3.4, { pattern: "burst", doomMax: 6, doomPow: 0.95, r: 98 }), mk(0.88, .14, .44, { r: 46, pattern: "laser", poisonAtk: 1 }), mk(0.88, .86, .44, { r: 46, pattern: "homing", doomMob: 6 }), mk(0.82, .34, .62, { r: 42, weak: 1 }), mk(0.82, .66, .62, { r: 42, weak: 1 })],
  },
  /* 第9ノ園（減速壁＋ワープ／mirror）… 斜めにずらした「たすき掛け」陣形。
     ワープで飛ばされた先がどちら側でも殴れるよう、左右対称にはしない。 */
  {
    w1: (mk, gv) => [mk(0.60, .16, .16, { r: 44 }), mk(0.60, .70, .30, { r: 44 }), mk(0.56, .34, .46, { pattern: "single" }), mk(0.52, .84, .58, { r: 42 })],
    w2: (mk, gv) => [mk(0.70, .14, .14, { pattern: "laser" }), mk(0.68, .62, .26, { weak: 1 }), mk(0.64, .30, .42, { r: 42, poisonAtk: 1 }), mk(0.64, .86, .48, { r: 42, weak: 1 }), mk(0.58, .5, .62, { r: 42 })],
    w3: (mk, gv) => [mk(0.80, .12, .14, { pattern: "homing", weak: 1 }), mk(0.76, .58, .24, { doomMob: 8 }), mk(0.72, .28, .42, { r: 42, weak: 1 }), mk(0.72, .88, .44, { r: 42, poisonAtk: 1 }), mk(0.66, .5, .64, { r: 42, weak: 1 })],
    w4: (mk, bs, gv) => [bs(2.1, { pattern: "all", doomMax: 7 }), mk(0.76, .12, .48, { r: 44, pattern: "laser" }), mk(0.76, .70, .56, { r: 44, poisonAtk: 1 }), mk(0.70, .38, .68, { r: 42, doomMob: 7 })],
    w5: (mk, bs, gv) => [bs(2.7, { pattern: "laser", doomMax: 6, r: 90 }), mk(0.84, .12, .46, { r: 44, pattern: "homing", weak: 1 }), mk(0.84, .74, .52, { r: 44, doomMob: 6 }), mk(0.78, .34, .66, { r: 42, weak: 1 }), mk(0.78, .90, .68, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(3.6, { pattern: "burst", doomMax: 5, doomPow: 0.95, r: 98 }), mk(0.92, .10, .44, { r: 46, pattern: "laser", poisonAtk: 1 }), mk(0.92, .78, .50, { r: 46, pattern: "homing", doomMob: 5 }), mk(0.86, .32, .66, { r: 42, weak: 1 }), mk(0.86, .90, .70, { r: 42, weak: 1 })],
  },
  /* 第10ノ園（減速壁＋重力バリア／eclipse）… ボスを中心に護衛が二重に囲む最終陣形。
     重力バリアの輪が重なるので、減速壁とあわせて「どこで止まるか」を読み切る必要がある。 */
  {
    w1: (mk, gv) => [mk(0.86, .5, .14, Object.assign({ r: 48, weak: 1 }, gv(120))), mk(0.82, .22, .32, { r: 44 }), mk(0.82, .78, .32, { r: 44, pattern: "laser" }), mk(0.76, .38, .54, { r: 42 }), mk(0.76, .62, .54, { r: 42, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(0.96, .5, .12, { r: 48, pattern: "homing", weak: 1 }), mk(0.92, .18, .30, Object.assign({ doomMob: 7 }, gv(125))), mk(0.92, .82, .30, { weak: 1 }), mk(0.86, .32, .52, { r: 42, poisonAtk: 1 }), mk(0.86, .68, .52, { r: 42, weak: 1 })],
    w3: (mk, gv) => [mk(1.06, .5, .12, { r: 50, pattern: "laser", weak: 1 }), mk(1.00, .14, .30, Object.assign({ pattern: "homing" }, gv(130))), mk(1.00, .86, .30, { doomMob: 6 }), mk(0.94, .30, .52, { r: 42, weak: 1 }), mk(0.94, .70, .52, { r: 42, weak: 1, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(3.1, Object.assign({ pattern: "all", doomMax: 7, r: 92 }, gv(155))), mk(1.00, .12, .48, { r: 46, pattern: "laser", weak: 1 }), mk(1.00, .88, .48, { r: 46, poisonAtk: 1 }), mk(0.94, .30, .66, { r: 42, doomMob: 7 }), mk(0.94, .70, .66, { r: 42, pattern: "homing" })],
    w5: (mk, bs, gv) => [bs(4.0, Object.assign({ pattern: "laser", doomMax: 6, r: 98 }, gv(168))), mk(1.10, .12, .46, { r: 46, pattern: "homing", weak: 1 }), mk(1.10, .88, .46, { r: 46, doomMob: 6 }), mk(1.02, .30, .66, { r: 44, weak: 1 }), mk(1.02, .70, .66, { r: 44, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(5.2, Object.assign({ pattern: "burst", doomMax: 5, doomPow: 1.0, r: 106 }, gv(180))), mk(1.24, .10, .46, { r: 48, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.24, .90, .46, { r: 48, pattern: "homing", doomMob: 5 }), mk(1.14, .28, .68, { r: 44, weak: 1 }), mk(1.14, .72, .68, { r: 44, weak: 1, poisonAtk: 1 })],
  },
  /* ★ 2026-08-04 第11ノ園（白夜／aurora）… 壁ぎわを大きく空けた「中央寄せ」陣形。
     ヒーリングウォールで回復するには壁まで走る必要があるので、外周に敵を置かない。
     ボスは crush（クラッシュ攻撃）持ち。WAVEが進むほどカウントが短くなる。 */
  {
    w1: (mk, gv) => [mk(0.78, .5, .16, { r: 48, weak: 1 }), mk(0.72, .36, .36, { r: 44 }), mk(0.72, .64, .36, { r: 44, pattern: "single" }), mk(0.68, .5, .54, { r: 42, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(0.88, .5, .14, { r: 48, pattern: "laser", weak: 1 }), mk(0.82, .34, .34, { r: 44, doomMob: 8 }), mk(0.82, .66, .34, { r: 44, weak: 1 }), mk(0.76, .42, .54, { r: 42 }), mk(0.76, .58, .54, { r: 42, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(0.98, .5, .14, { r: 50, pattern: "homing", weak: 1 }), mk(0.92, .32, .34, { r: 44, weak: 1 }), mk(0.92, .68, .34, { r: 44, doomMob: 7 }), mk(0.86, .40, .54, { r: 42, poisonAtk: 1 }), mk(0.86, .60, .54, { r: 42, weak: 1 })],
    w4: (mk, bs, gv) => [bs(2.9, { pattern: "all", crush: 8, r: 90 }), mk(0.94, .28, .48, { r: 46, pattern: "laser" }), mk(0.94, .72, .48, { r: 46, poisonAtk: 1 }), mk(0.88, .5, .64, { r: 42, doomMob: 8 })],
    w5: (mk, bs, gv) => [bs(3.7, { pattern: "laser", doomMax: 8, crush: 6, r: 96 }), mk(1.02, .28, .48, { r: 46, pattern: "homing", weak: 1 }), mk(1.02, .72, .48, { r: 46, doomMob: 7 }), mk(0.96, .40, .64, { r: 42, weak: 1 }), mk(0.96, .60, .64, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(4.8, { pattern: "burst", doomMax: 7, doomPow: 0.95, crush: 5, r: 104 }), mk(1.16, .26, .48, { r: 48, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.16, .74, .48, { r: 48, pattern: "homing", doomMob: 6 }), mk(1.06, .40, .66, { r: 44, weak: 1 }), mk(1.06, .60, .66, { r: 44, weak: 1 })],
  },
  /* ★ 2026-08-04 第12ノ園（虚渦／abyss）… 幽冥の最果て。
     敵を上下2段の「渦」に並べ、ヴァニッシュで足場が消えるなかを縫って進ませる。
     ボスは即死攻撃とクラッシュ攻撃を両方持つ（負けはしないが、確実に削られる）。 */
  {
    w1: (mk, gv) => [mk(0.92, .18, .16, { r: 46, weak: 1 }), mk(0.92, .82, .16, { r: 46, pattern: "laser" }), mk(0.86, .5, .34, { r: 46, doomMob: 8 }), mk(0.80, .30, .54, { r: 42 }), mk(0.80, .70, .54, { r: 42, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(1.02, .5, .12, { r: 50, pattern: "homing", weak: 1 }), mk(0.96, .16, .32, { r: 44, weak: 1 }), mk(0.96, .84, .32, { r: 44, doomMob: 7 }), mk(0.90, .34, .54, { r: 42, poisonAtk: 1 }), mk(0.90, .66, .54, { r: 42, pattern: "laser" })],
    w3: (mk, gv) => [mk(1.12, .18, .14, { r: 48, pattern: "laser", weak: 1 }), mk(1.12, .82, .14, { r: 48, pattern: "homing" }), mk(1.04, .5, .34, { r: 48, weak: 1, doomMob: 6 }), mk(0.98, .30, .56, { r: 42, weak: 1 }), mk(0.98, .70, .56, { r: 42, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(3.4, { pattern: "all", doomMax: 8, crush: 7, r: 94 }), mk(1.06, .14, .46, { r: 46, pattern: "laser", weak: 1 }), mk(1.06, .86, .46, { r: 46, poisonAtk: 1 }), mk(1.00, .32, .66, { r: 42, doomMob: 7 }), mk(1.00, .68, .66, { r: 42, pattern: "homing" })],
    w5: (mk, bs, gv) => [bs(4.4, { pattern: "laser", doomMax: 7, crush: 6, r: 100 }), mk(1.18, .14, .44, { r: 48, pattern: "homing", weak: 1 }), mk(1.18, .86, .44, { r: 48, doomMob: 6 }), mk(1.08, .30, .66, { r: 44, weak: 1 }), mk(1.08, .70, .66, { r: 44, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(5.8, { pattern: "burst", doomMax: 6, doomPow: 1.0, crush: 4, r: 110 }), mk(1.34, .10, .44, { r: 48, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.34, .90, .44, { r: 48, pattern: "homing", doomMob: 5 }), mk(1.22, .28, .68, { r: 44, weak: 1 }), mk(1.22, .72, .68, { r: 44, weak: 1, poisonAtk: 1 })],
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-07 第13ノ園（幻影／phantom）… 新ギミック「透明スイッチ」の初出。
     gs: 0 の敵は<b>最初から出ている</b>、gs: 1 の敵は<b>最初は透明</b>。
     スイッチを踏むたびに入れ替わるので、<b>6つのWAVEすべてで「出ている側／透明な側」の
     組み立てを変えて</b>、同じ読み合いが2回続かないようにしてある。
       W1 … 左右で分かれる（左が出ている／右が透明）＝いちばん素直な入門
       W2 … 縦で分かれる（手前が出ている／奥が透明）＝奥へ行くには踏むしかない
       W3 … 出ている1体に対して透明が3体（踏んだ瞬間に一気に囲まれる）
       W4 … ボスは常に出ている。護衛だけが入れ替わる
       W5 … <b>ボス自身が透明側</b>。踏まないとボスに触れられない
       W6 … ボスは出ている側だが、即死カウントを持つ護衛が両側に分かれる
     ══════════════════════════════════════════════════════════════ */
  {
    w1: (mk, gv) => [mk(0.62, .16, .22, { r: 44, gs: 0 }), mk(0.62, .34, .42, { r: 44, gs: 0 }),
                     mk(0.62, .84, .22, { r: 44, gs: 1 }), mk(0.62, .66, .42, { r: 44, gs: 1, pattern: "single" })],
    w2: (mk, gv) => [mk(0.70, .30, .52, { r: 44, gs: 0, weak: 1 }), mk(0.70, .70, .52, { r: 44, gs: 0, poisonAtk: 1 }),
                     mk(0.74, .5, .16, { r: 48, gs: 1, pattern: "laser", weak: 1 }), mk(0.70, .22, .30, { r: 42, gs: 1 }), mk(0.70, .78, .30, { r: 42, gs: 1 })],
    w3: (mk, gv) => [mk(0.86, .5, .34, { r: 50, gs: 0, pattern: "homing", weak: 1 }),
                     mk(0.78, .12, .18, { r: 42, gs: 1, doomMob: 8 }), mk(0.78, .88, .18, { r: 42, gs: 1, weak: 1 }),
                     mk(0.78, .26, .60, { r: 42, gs: 1, poisonAtk: 1 }), mk(0.78, .74, .60, { r: 42, gs: 1 })],
    w4: (mk, bs, gv) => [bs(2.2, { pattern: "all", doomMax: 8 }),
                         mk(0.82, .16, .52, { r: 44, gs: 0, pattern: "laser" }), mk(0.82, .84, .52, { r: 44, gs: 0, poisonAtk: 1 }),
                         mk(0.82, .5, .68, { r: 44, gs: 1, doomMob: 8 }), mk(0.82, .5, .44, { r: 42, gs: 1, weak: 1 })],
    w5: (mk, bs, gv) => [bs(2.9, { pattern: "laser", doomMax: 7, r: 92, gs: 1 }),
                         mk(0.92, .18, .30, { r: 44, gs: 0, pattern: "homing", weak: 1 }), mk(0.92, .82, .30, { r: 44, gs: 0, doomMob: 7 }),
                         mk(0.88, .34, .64, { r: 42, gs: 1, weak: 1 }), mk(0.88, .66, .64, { r: 42, gs: 1, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(3.8, { pattern: "burst", doomMax: 6, doomPow: 0.95, r: 100 }),
                            mk(1.04, .12, .48, { r: 46, gs: 0, pattern: "laser", poisonAtk: 1 }), mk(1.04, .34, .68, { r: 44, gs: 0, weak: 1 }),
                            mk(1.04, .88, .48, { r: 46, gs: 1, pattern: "homing", doomMob: 6 }), mk(1.04, .66, .68, { r: 44, gs: 1, weak: 1 })],
  },
  /* ★ 2026-08-07 第14ノ園（残響／requiem）… 透明スイッチ＋カウントブースト＋エーテル。
     壁を稼ぐために外周を走る必要があるので、<b>敵は中央にまとめて</b>置く。
     透明の割りふりは第13ノ園とはっきり変えて、<b>WAVEごとに「出ている数」自体を増減</b>させる。 */
  {
    w1: (mk, gv) => [mk(0.74, .5, .20, { r: 48, gs: 0, weak: 1 }), mk(0.70, .36, .40, { r: 44, gs: 1 }),
                     mk(0.70, .64, .40, { r: 44, gs: 1 }), mk(0.66, .5, .56, { r: 42, gs: 1, pattern: "single" })],
    w2: (mk, gv) => [mk(0.84, .38, .24, { r: 46, gs: 0, pattern: "laser" }), mk(0.84, .62, .24, { r: 46, gs: 0, weak: 1 }),
                     mk(0.80, .5, .44, { r: 46, gs: 1, poisonAtk: 1 }), mk(0.80, .30, .60, { r: 42, gs: 1 }), mk(0.80, .70, .60, { r: 42, gs: 1, weak: 1 })],
    w3: (mk, gv) => [mk(0.96, .5, .18, { r: 50, gs: 0, pattern: "homing", weak: 1 }), mk(0.92, .32, .38, { r: 44, gs: 0, doomMob: 8 }),
                     mk(0.92, .68, .38, { r: 44, gs: 0, weak: 1 }), mk(0.88, .5, .58, { r: 44, gs: 1, poisonAtk: 1 }), mk(0.88, .5, .70, { r: 40, gs: 1 })],
    w4: (mk, bs, gv) => [bs(2.6, { pattern: "all", doomMax: 8, r: 90 }),
                         mk(0.94, .26, .50, { r: 46, gs: 0, pattern: "laser" }), mk(0.94, .74, .50, { r: 46, gs: 1, poisonAtk: 1 }),
                         mk(0.90, .5, .66, { r: 42, gs: 1, doomMob: 8 })],
    w5: (mk, bs, gv) => [bs(3.4, { pattern: "laser", doomMax: 7, crush: 7, r: 96 }),
                         mk(1.04, .26, .46, { r: 46, gs: 0, pattern: "homing", weak: 1 }), mk(1.04, .74, .46, { r: 46, gs: 0, doomMob: 7 }),
                         mk(0.98, .40, .66, { r: 42, gs: 1, weak: 1 }), mk(0.98, .60, .66, { r: 42, gs: 1, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(4.4, { pattern: "burst", doomMax: 6, doomPow: 0.95, crush: 5, r: 104 }),
                            mk(1.20, .24, .46, { r: 48, gs: 0, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.20, .76, .46, { r: 48, gs: 1, pattern: "homing", doomMob: 6 }),
                            mk(1.10, .40, .68, { r: 44, gs: 0, weak: 1 }), mk(1.10, .60, .68, { r: 44, gs: 1, weak: 1 })],
  },
  /* ★ 2026-08-07 第15ノ園（創生／genesis）… 幽冥の最果て。
     敵を<b>四隅と中央</b>に散らし、ヴァニッシュで消える足場を渡らせる。
     透明の割りふりは<b>WAVEごとに「どこが空くか」が変わる</b>ように組んである。 */
  {
    w1: (mk, gv) => [mk(1.00, .14, .16, { r: 46, gs: 0, weak: 1 }), mk(1.00, .86, .16, { r: 46, gs: 1, pattern: "laser" }),
                     mk(0.94, .5, .36, { r: 48, gs: 0, doomMob: 8 }), mk(0.88, .22, .58, { r: 42, gs: 1 }), mk(0.88, .78, .58, { r: 42, gs: 1, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(1.10, .5, .12, { r: 50, gs: 0, pattern: "homing", weak: 1 }), mk(1.04, .14, .34, { r: 44, gs: 1, weak: 1 }),
                     mk(1.04, .86, .34, { r: 44, gs: 1, doomMob: 7 }), mk(0.98, .32, .58, { r: 42, gs: 0, poisonAtk: 1 }), mk(0.98, .68, .58, { r: 42, gs: 1, pattern: "laser" })],
    w3: (mk, gv) => [mk(1.20, .16, .14, { r: 48, gs: 1, pattern: "laser", weak: 1 }), mk(1.20, .84, .14, { r: 48, gs: 0, pattern: "homing" }),
                     mk(1.12, .5, .32, { r: 48, gs: 1, weak: 1, doomMob: 6 }), mk(1.04, .28, .56, { r: 42, gs: 0, weak: 1 }), mk(1.04, .72, .56, { r: 42, gs: 1, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(3.8, { pattern: "all", doomMax: 8, crush: 7, r: 96 }),
                         mk(1.14, .12, .46, { r: 46, gs: 0, pattern: "laser", weak: 1 }), mk(1.14, .88, .46, { r: 46, gs: 1, poisonAtk: 1 }),
                         mk(1.06, .32, .68, { r: 42, gs: 1, doomMob: 7 }), mk(1.06, .68, .68, { r: 42, gs: 0, pattern: "homing" })],
    w5: (mk, bs, gv) => [bs(4.8, { pattern: "laser", doomMax: 7, crush: 6, r: 102, gs: 1 }),
                         mk(1.26, .14, .42, { r: 48, gs: 0, pattern: "homing", weak: 1 }), mk(1.26, .86, .42, { r: 48, gs: 0, doomMob: 6 }),
                         mk(1.16, .30, .66, { r: 44, gs: 1, weak: 1 }), mk(1.16, .70, .66, { r: 44, gs: 1, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(6.2, { pattern: "burst", doomMax: 6, doomPow: 1.0, crush: 4, r: 112 }),
                            mk(1.44, .10, .42, { r: 48, gs: 0, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.44, .90, .42, { r: 48, gs: 1, pattern: "homing", doomMob: 5 }),
                            mk(1.30, .26, .68, { r: 44, gs: 1, weak: 1 }), mk(1.30, .74, .68, { r: 44, gs: 0, weak: 1 })],
  },
  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-10 第16ノ園（輪廻／samsara）… 敵を中央のまわりに「輪」に並べた陣形。
     ヒーリングウォールまで走れるよう<b>壁ぎわは大きく空ける</b>。
     透明の割りふりは第13〜15ノ園と重ならないように組んである。
       W1 … 上半分が出ている／下半分が透明（いちばん素直な入門）
       W2 … 出ている2体が横に並び、透明3体が輪の内と下に散る
       W3 … 出ているのは中央の1体と下の1体だけ
       W4 … ボスは常に出ている。護衛が左右で分かれる
       W5 … <b>ボス自身が透明側</b>。踏まないとボスに触れられない
       W6 … 出ている護衛と透明な護衛が交互に並ぶ
     ══════════════════════════════════════════════════════════════ */
  {
    w1: (mk, gv) => [mk(0.66, .5, .16, Object.assign({ r: 46, gs: 0, weak: 1 }, gv(105))), mk(0.62, .28, .36, { r: 44, gs: 0 }),
                     mk(0.62, .72, .36, { r: 44, gs: 1, pattern: "single" }), mk(0.58, .5, .56, { r: 42, gs: 1 })],
    w2: (mk, gv) => [mk(0.76, .34, .18, { r: 46, gs: 0, pattern: "laser" }), mk(0.76, .66, .18, Object.assign({ r: 46, gs: 0, weak: 1 }, gv(115))),
                     mk(0.70, .5, .38, { r: 46, gs: 1, poisonAtk: 1 }), mk(0.70, .30, .58, { r: 42, gs: 1 }), mk(0.70, .70, .58, { r: 42, gs: 1, weak: 1 })],
    w3: (mk, gv) => [mk(0.88, .5, .16, { r: 50, gs: 0, pattern: "homing", weak: 1 }), mk(0.82, .26, .38, Object.assign({ r: 44, gs: 1, doomMob: 8 }, gv(110))),
                     mk(0.82, .74, .38, { r: 44, gs: 1, weak: 1 }), mk(0.78, .38, .60, { r: 42, gs: 0, poisonAtk: 1 }), mk(0.78, .62, .60, { r: 42, gs: 1 })],
    w4: (mk, bs, gv) => [bs(2.4, Object.assign({ pattern: "all", doomMax: 8, r: 90 }, gv(145))),
                         mk(0.90, .22, .50, { r: 46, gs: 0, pattern: "laser" }), mk(0.90, .78, .50, { r: 46, gs: 1, poisonAtk: 1 }),
                         mk(0.84, .5, .66, { r: 42, gs: 1, doomMob: 8 })],
    w5: (mk, bs, gv) => [bs(3.2, Object.assign({ pattern: "laser", doomMax: 7, r: 96, gs: 1 }, gv(155))),
                         mk(1.00, .24, .46, { r: 46, gs: 0, pattern: "homing", weak: 1 }), mk(1.00, .76, .46, { r: 46, gs: 0, doomMob: 7 }),
                         mk(0.94, .38, .66, { r: 42, gs: 1, weak: 1 }), mk(0.94, .62, .66, { r: 42, gs: 1, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(4.2, Object.assign({ pattern: "burst", doomMax: 6, doomPow: 0.95, crush: 6, r: 104 }, gv(170))),
                            mk(1.16, .22, .46, { r: 48, gs: 0, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.16, .78, .46, { r: 48, gs: 1, pattern: "homing", doomMob: 6 }),
                            mk(1.06, .38, .68, { r: 44, gs: 1, weak: 1 }), mk(1.06, .62, .68, { r: 44, gs: 0, weak: 1 })],
  },
  /* ★ 2026-08-10 第17ノ園（星海／stellar）… 敵を<b>横一列の帯</b>に並べた陣形。
     ウォールチェンジの壁を使うために上下を大きく空けてあり、
     WAVEが進むごとに帯の高さと本数が変わる（1本→2本→ボス＋帯）。
     透明スイッチは出ないので gs は付けない。 */
  {
    w1: (mk, gv) => [mk(0.70, .16, .24, { r: 44 }), mk(0.70, .38, .24, { r: 44 }),
                     mk(0.70, .62, .24, { r: 44, pattern: "single" }), mk(0.70, .84, .24, { r: 44 })],
    w2: (mk, gv) => [mk(0.80, .12, .18, { r: 44, pattern: "laser" }), mk(0.80, .36, .18, { r: 44, weak: 1 }),
                     mk(0.80, .64, .18, { r: 44, weak: 1 }), mk(0.80, .88, .18, { r: 44, poisonAtk: 1 }), mk(0.74, .5, .44, { r: 46 })],
    w3: (mk, gv) => [mk(0.92, .5, .18, { r: 50, pattern: "homing", weak: 1 }), mk(0.86, .14, .40, { r: 44, doomMob: 8 }),
                     mk(0.86, .38, .40, { r: 44, weak: 1 }), mk(0.86, .62, .40, { r: 44, poisonAtk: 1 }), mk(0.86, .86, .40, { r: 44 })],
    w4: (mk, bs, gv) => [bs(2.6, { pattern: "all", doomMax: 8, r: 92 }),
                         mk(0.96, .14, .52, { r: 46, pattern: "laser" }), mk(0.96, .40, .52, { r: 44, poisonAtk: 1 }),
                         mk(0.96, .60, .52, { r: 44, weak: 1 }), mk(0.96, .86, .52, { r: 46, doomMob: 8 })],
    w5: (mk, bs, gv) => [bs(3.5, { pattern: "laser", doomMax: 7, crush: 7, r: 98 }),
                         mk(1.06, .12, .48, { r: 46, pattern: "homing", weak: 1 }), mk(1.06, .88, .48, { r: 46, doomMob: 7 }),
                         mk(1.00, .34, .66, { r: 42, weak: 1 }), mk(1.00, .66, .66, { r: 42, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(4.6, { pattern: "burst", doomMax: 6, doomPow: 1.0, crush: 5, r: 106 }),
                            mk(1.24, .10, .46, { r: 48, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.24, .90, .46, { r: 48, pattern: "homing", doomMob: 5 }),
                            mk(1.12, .30, .68, { r: 44, weak: 1 }), mk(1.12, .70, .68, { r: 44, weak: 1 })],
  },
  /* ★ 2026-08-10 第18ノ園（涅槃／nirvana）… 幽冥の庭園のいちばん奥。
     敵を<b>上下の二極</b>（いちばん奥と、味方のすぐ手前）に置き、
     消えていく足場を渡って上下を往復させる。透明の割りふりは
     <b>WAVEごとに「奥が透明か、手前が透明か」が入れかわる</b>ように組んである。 */
  {
    w1: (mk, gv) => [mk(1.04, .5, .12, Object.assign({ r: 50, gs: 0, weak: 1 }, gv(120))), mk(0.96, .18, .34, { r: 44, gs: 1, pattern: "laser" }),
                     mk(0.96, .82, .34, { r: 44, gs: 0, doomMob: 8 }), mk(0.90, .34, .58, { r: 42, gs: 1 }), mk(0.90, .66, .58, { r: 42, gs: 1, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(1.14, .16, .14, { r: 48, gs: 0, pattern: "homing", weak: 1 }), mk(1.14, .84, .14, Object.assign({ r: 48, gs: 1, weak: 1 }, gv(125))),
                     mk(1.06, .5, .36, { r: 48, gs: 1, doomMob: 7 }), mk(1.00, .30, .60, { r: 42, gs: 0, poisonAtk: 1 }), mk(1.00, .70, .60, { r: 42, gs: 1, pattern: "laser" })],
    w3: (mk, gv) => [mk(1.24, .5, .12, { r: 50, gs: 1, pattern: "laser", weak: 1 }), mk(1.16, .16, .32, Object.assign({ r: 46, gs: 0, pattern: "homing" }, gv(130))),
                     mk(1.16, .84, .32, { r: 46, gs: 1, doomMob: 6 }), mk(1.08, .30, .56, { r: 42, gs: 0, weak: 1 }), mk(1.08, .70, .56, { r: 42, gs: 1, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(4.0, Object.assign({ pattern: "all", doomMax: 8, crush: 7, r: 98 }, gv(155))),
                         mk(1.18, .12, .46, { r: 46, gs: 0, pattern: "laser", weak: 1 }), mk(1.18, .88, .46, { r: 46, gs: 1, poisonAtk: 1 }),
                         mk(1.10, .32, .68, { r: 42, gs: 1, doomMob: 7 }), mk(1.10, .68, .68, { r: 42, gs: 0, pattern: "homing" })],
    w5: (mk, bs, gv) => [bs(5.1, Object.assign({ pattern: "laser", doomMax: 7, crush: 6, r: 104, gs: 1 }, gv(168))),
                         mk(1.30, .14, .42, { r: 48, gs: 0, pattern: "homing", weak: 1 }), mk(1.30, .86, .42, { r: 48, gs: 0, doomMob: 6 }),
                         mk(1.20, .30, .66, { r: 44, gs: 1, weak: 1 }), mk(1.20, .70, .66, { r: 44, gs: 1, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(6.6, Object.assign({ pattern: "burst", doomMax: 6, doomPow: 1.0, crush: 4, r: 112 }, gv(182))),
                            mk(1.48, .10, .42, { r: 48, gs: 0, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.48, .90, .42, { r: 48, gs: 1, pattern: "homing", doomMob: 5 }),
                            mk(1.34, .26, .68, { r: 44, gs: 1, weak: 1 }), mk(1.34, .74, .68, { r: 44, gs: 0, weak: 1 })],
  },
  /* ★ 2026-08-11 第19ノ園（翠嵐／verdant）… 断絶界の園。
     断絶界は<b>敵のまわりに輪を張る</b>ギミックなので、敵どうしを離して置く。
     くっつけて置くと輪が重なって、どこを割れば誰が出てくるのか読めなくなるため。
     ・敵は<b>左右の縁と中央上</b>に散らし、盤面のまん中は大きく空ける
       （空けたところにヒーリングバルーンと撃種変化パネルが入る＝ギミックと敵が重ならない）。
     ・WAVEが進むと「中央上」の1体が奥へ下がり、断絶界の輪が味方の走路にかぶってくる。 */
  {
    w1: (mk, gv) => [mk(1.06, .12, .18, { r: 46 }), mk(1.06, .88, .18, { r: 46, pattern: "single" }),
                     mk(0.98, .12, .50, { r: 42 }), mk(0.98, .88, .50, { r: 42, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(1.16, .10, .16, { r: 46, pattern: "laser" }), mk(1.16, .90, .16, { r: 46, weak: 1 }),
                     mk(1.08, .5, .12, { r: 44, weak: 1 }), mk(1.02, .10, .52, { r: 42 }), mk(1.02, .90, .52, { r: 42, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(1.26, .5, .12, { r: 48, pattern: "homing", weak: 1 }), mk(1.18, .10, .30, { r: 46, doomMob: 8 }),
                     mk(1.18, .90, .30, { r: 46, weak: 1 }), mk(1.10, .10, .60, { r: 42 }), mk(1.10, .90, .60, { r: 42, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(4.2, { pattern: "all", doomMax: 8, crush: 7, r: 98 }),
                         mk(1.20, .08, .46, { r: 46, pattern: "laser", weak: 1 }), mk(1.20, .92, .46, { r: 46, poisonAtk: 1 }),
                         mk(1.12, .5, .72, { r: 42, doomMob: 7 })],
    w5: (mk, bs, gv) => [bs(5.3, { pattern: "laser", doomMax: 7, crush: 6, r: 104 }),
                         mk(1.32, .08, .44, { r: 48, pattern: "homing", weak: 1 }), mk(1.32, .92, .44, { r: 48, doomMob: 6 }),
                         mk(1.22, .24, .72, { r: 44 }), mk(1.22, .76, .72, { r: 44, poisonAtk: 1 })],
    w6: (mk, bs, gv, k) => [bs(6.8, { pattern: "burst", doomMax: 6, doomPow: 1.0, crush: 4, r: 112 }),
                            mk(1.50, .08, .42, { r: 48, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.50, .92, .42, { r: 48, pattern: "homing", doomMob: 5 }),
                            mk(1.36, .22, .72, { r: 44, weak: 1 }), mk(1.36, .78, .72, { r: 44, weak: 1 })],
  },
  /* ★ 2026-08-11 第20ノ園（業火／pyre）… 幽冥の庭園のいちばん奥の炎。
     エーテルを<b>運ぶ</b>園なので、敵を<b>縦にずらして</b>置き、上下をつなぐ道すじを1本だけ残す。
     ・上段（奥）＝ボスと護衛、下段（手前）＝拾いに行く相手、という役割分担にしてある。
     ・左右の縁は空けておく（そこに撃種変化パネルとエーテルが入る＝敵と重ならない）。 */
  {
    w1: (mk, gv) => [mk(1.10, .5, .12, { r: 48, weak: 1 }), mk(1.02, .28, .34, { r: 44 }),
                     mk(1.02, .72, .34, { r: 44, pattern: "single" }), mk(0.96, .5, .56, { r: 42, poisonAtk: 1 })],
    w2: (mk, gv) => [mk(1.20, .5, .12, { r: 48, pattern: "laser", weak: 1 }), mk(1.12, .26, .32, { r: 44, weak: 1 }),
                     mk(1.12, .74, .32, { r: 44, doomMob: 8 }), mk(1.04, .38, .56, { r: 42 }), mk(1.04, .62, .56, { r: 42, poisonAtk: 1 })],
    w3: (mk, gv) => [mk(1.30, .5, .12, { r: 50, pattern: "homing", weak: 1 }), mk(1.22, .24, .32, { r: 46, doomMob: 7 }),
                     mk(1.22, .76, .32, { r: 46, weak: 1 }), mk(1.12, .36, .58, { r: 42, pattern: "laser" }), mk(1.12, .64, .58, { r: 42, poisonAtk: 1 })],
    w4: (mk, bs, gv) => [bs(4.4, { pattern: "all", doomMax: 8, crush: 7, r: 100 }),
                         mk(1.26, .26, .48, { r: 46, pattern: "laser", weak: 1 }), mk(1.26, .74, .48, { r: 46, poisonAtk: 1 }),
                         mk(1.16, .5, .70, { r: 42, doomMob: 7 })],
    w5: (mk, bs, gv) => [bs(5.6, { pattern: "laser", doomMax: 7, crush: 6, r: 106 }),
                         mk(1.38, .24, .46, { r: 48, pattern: "homing", weak: 1 }), mk(1.38, .76, .46, { r: 48, doomMob: 6 }),
                         mk(1.26, .5, .68, { r: 44, weak: 1 })],
    w6: (mk, bs, gv, k) => [bs(7.2, { pattern: "burst", doomMax: 5, doomPow: 1.0, crush: 4, r: 114 }),
                            mk(1.56, .22, .44, { r: 48, pattern: "laser", poisonAtk: 1, weak: 1 }), mk(1.56, .78, .44, { r: 48, pattern: "homing", doomMob: 5 }),
                            mk(1.40, .36, .70, { r: 44, weak: 1 }), mk(1.40, .64, .70, { r: 44, weak: 1 })],
  },
];
const GARDEN_STAGES = Array.from({ length: GARDEN_N }, (_, k) => gardenStage(k + 1));
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-17i 爆絶高難易度クエスト「蓬莱の九重」
   ══════════════════════════════════════════════════════════════
   第一重〜第九重（9階層）＋ 九重を全て越えると開く「蓬莱天宮」の 計10クエスト。

   ■ アンチギミックの組み合わせ
     幽冥の庭園・黄昏の王城EX・禁忌の迷宮 第25〜30の間で<b>使われていない</b>
     組み合わせだけを使う（機械で照合ずみ。当時あいていたのは8通り）。
     10クエストあるので、第八重と蓬莱天宮の2つは<b>3種のアンチ</b>にして
     10クエストすべてを別の構成にしてある。
   ■ 属性は 火→水→木→光→闇 のくり返し。最後の蓬莱天宮は闇。
   ■ ボスは第一重〜第九重が瑶華＆玉蘭（2体で1組）、蓬莱天宮が瑶妃。どちらも蓬莱族。
   ■ 雑魚のHPは低め・ボスのHPは高め（モンストのような「ボスを削りきる」構成）。
   ────────────────────────────────────────────────────────────── */
/* ══ ★ 2026-08-17L 幽冥の庭園 第16〜20ノ園の<b>雑魚だけ</b>を軽くする ══
   実測すると、1WAVEぶんの攻撃力合計のうち<b>9割以上が雑魚</b>で、
   ボスは1割ほどしかなかった。全体の係数（gardenAtkEase）だけを下げると
   ボスの手ごたえまで一緒に落ちてしまうので、ここは雑魚に絞って下げる。
     第16〜20ノ園の雑魚 … ×0.70（対チームHP 92% → 約65%）
   ★ ボスの攻撃力は触らない。詰めの緊張感はそのまま残す。 */
const GARDEN_MOB_EASE_FROM = 16;
const GARDEN_MOB_EASE = 0.70;
GARDEN_STAGES.forEach((st, i) => {
  const k = i + 1;
  if (k < GARDEN_MOB_EASE_FROM) return;
  (st.waves || []).forEach((wv) => (wv || []).forEach((d) => {
    if (d && !d.boss && d.atk) d.atk = Math.max(1, Math.round(d.atk * GARDEN_MOB_EASE));
  }));
});
/* ★★ 2026-08-22b 蓬莱の九重は<b>殴りが主役</b>のクエスト（黄昏の王城 第29・30の間と同じ）。
   リンクスキルを半分にするかわりに直殴りを2倍にする＝
   「リンクをつなげる位置」ではなく「弱点をどう殴るか」を読む場所にする。 */
const HOURAI_FS_MUL = 0.5;
const HOURAI_MELEE_MUL = 2.0;
const HOURAI_N = 10;                       // 第一重〜第九重＋蓬莱天宮
const HOURAI_ORB = 20;                     // 初クリアのジェム
const HOURAI_KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
/* 属性: 火→水→木→光→闇 のくり返し。10番目（蓬莱天宮）は闇。 */
const HOURAI_ELS = ["fire", "water", "wood", "light", "dark",
                    "fire", "water", "wood", "light", "dark"];
/* アンチギミックの組み合わせ。★ 既存3系統に無いものだけ。
   8通りしかないので、第八重と蓬莱天宮は3種にして重複を避けている。 */
const HOURAI_ANTI = [
  ["dw", "grav"],                 // 第一重
  ["dw", "slowwall"],             // 第二重
  ["dw", "ward"],                 // 第三重
  ["grav", "ward"],               // 第四重
  ["ward", "warp"],               // 第五重
  ["mine", "slowwall"],           // 第六重
  ["mine", "ward"],               // 第七重
  ["dw", "mine", "grav"],         // 第八重（3種）
  ["slowwall", "ward"],           // 第九重
  ["grav", "warp", "slowwall"],   // 蓬莱天宮（3種）
];
/* 階層ごとの二つ名（難度表示に使う） */
const HOURAI_NM = ["紅蓮", "碧水", "翠風", "白光", "玄冥", "焔舞", "蒼渦", "金剛", "月華"];
/* ボスHP。★ 雑魚を下げるぶん、ボスは幽冥の庭園より高くする */
/* ★ 2026-08-17j さらにボスへ寄せた。
   雑魚は「1〜2手で片づく」、ボスは「編成と手順が噛み合わないと削りきれない」を狙う。
   幽冥の庭園の最奥（3,690万）に対し、蓬莱天宮は<b>1億4,000万</b>。 */
/* ★ 2026-08-17r ボスHPは<b>2つの段</b>にまとめた。
   階層ごとに少しずつ変えると「どこまで削れる編成なのか」が読みにくいので、
   ・第一重〜第五重 … 第五重の値でそろえる（2,588万）
   ・第六重〜第九重 … 第九重の値でそろえる（5,796万）
   ・蓬莱天宮      … 別格（1億1,077万）
   の3段にして、段が上がるところで「編成を組み直す」区切りが分かるようにする。
   ★ 有利属性は全10クエストで 1.5倍。属性をそろえれば実質 2/3 の削り量になる。 */
const HOURAI_BOSS_HP = [
  25880000, 25880000, 25880000, 25880000, 25880000,
  57960000, 57960000, 57960000, 57960000, 110770000,
];
/* WAVEごとの特殊。★ 1クエストにつき1つだけ効かせる（重ねると何が起きたか読めない）
   descend … 雑魚を全滅させるとボスが降臨する（モンスト方式）
   edgedoom … 画面の端に長めに現れてから即死を撃つ
   knockback … 下部まで吹き飛ばす（蓬莱天宮の瑶妃）*/
const HOURAI_SPECIAL = ["", "descend", "edgedoom", "descend", "edgedoom",
                        "descend", "edgedoom", "descend", "edgedoom", "knockback"];
/* ★ 2026-08-17m 盤面そのものを変える特殊ギミックを階層ごとに1つずつ。
   これを入れていなかったため、10クエストが「アンチの組み合わせが違うだけ」の
   ほとんど同じ盤面になっていた。庭園で使っている仕掛けを、蓬莱では別の順番で並べ直す。
   ★ 壁系（wallchange / healwall）は1クエストに1種類まで。重ねると盤面が読めない。 */
const HOURAI_GIMSP = [
  "countboost",   /* 第一重 … 敵の攻撃カウントが早く進む */
  "balloon",      /* 第二重 … ヒーリングバルーン（降臨まで耐える） */
  "wallchange",   /* 第三重 … 壁の色＝通せる撃種が入れ替わる */
  "photon",       /* 第四重 … エーテルを運んでシールドを割る */
  "vanish",       /* 第五重 … ふれた箱が次のターンに消える */
  "healwall",     /* 第六重 … 回復壁 */
  "innerweak",    /* 第七重 … 内部弱点（貫通でしか弱点を殴れない） */
  "countboost",   /* 第八重 … 3種アンチ＋カウント加速 */
  "photon",       /* 第九重 … エーテル＋端の即死 */
  "vanish",       /* 蓬莱天宮 … 消える箱＋吹き飛ばし */
];

/* ★ 2026-08-17o 奥の階層の攻撃力をならす。
   味方のHPは階層が上がっても増えないので、素の伸びだけだと最奥が理不尽になる。
   幽冥の庭園と同じ考えかたで、奥ほど係数を下げて
   「1WAVEぶんの攻撃 ≒ チームHPの85〜95%」に収める。 */
function houraiAtkEase(k) {
  const t = Math.min(1, Math.max(0, (k - 1) / (HOURAI_N - 1)));
  return 1.00 + (0.62 - 1.00) * t;     /* 第一重 1.00 → 蓬莱天宮 0.62 */
}
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-25 蓬莱の九重 ボスの置き場所（ご指定）
   ------------------------------------------------------------
   これまでボスは<b>全10クエストとも「上のまんなか」（x .50 / y .24）</b>だったので、
   どの階層に入っても同じ絵・同じ攻めかたになっていた。
   ・<b>クエストごとに壁を変える</b>（上／左／右）。同じ壁でも位置をずらす＝10面すべて別。
   ・<b>ボスと壁のあいだにキャラが挟まる</b>すきま（HOURAI_BOSS_GAP）を必ず空ける。
     ★ 味方の球は直径 <b>90px</b>（BALL_R 45）。すきまが 90 未満だと入れず、
       広すぎると素通りする。104px＝「入るけれど窮屈」＝<b>挟まって連続で殴れる</b>幅。
   ・盤面は W=720 / H=920（index.html の const W,H）。mb-core.js からは
     その定数を読めない（inline script のほうが後に走る）ので、ここに同じ値を置く。
     ★ 盤面の大きさを変えるときは<b>両方</b>直すこと。
   ・ボスの当たり半径は makeEnemy で <b>r × 1.22</b> になる。すきまの計算はその値で行う。
   ══════════════════════════════════════════════════════════════ */
const HOURAI_BW = 720, HOURAI_BH = 920;   /* index.html の W / H と同じ値 */
const HOURAI_BOSS_GAP = 104;              /* ボスと壁のすきま（px・球の直径90＋少し） */
/* wall … 寄せる壁　t … その壁にそった位置（0〜1）。10面すべて別の組み合わせにしてある。 */
const HOURAI_BOSS_SPOT = [
  { wall: "top",   t: .38 },   /* 第一重　上・すこし左 */
  { wall: "left",  t: .30 },   /* 第二重　左・上より */
  { wall: "right", t: .30 },   /* 第三重　右・上より */
  { wall: "top",   t: .62 },   /* 第四重　上・すこし右 */
  { wall: "left",  t: .48 },   /* 第五重　左・まんなか */
  { wall: "right", t: .48 },   /* 第六重　右・まんなか */
  { wall: "top",   t: .33 },   /* 第七重　上・左より */
  { wall: "left",  t: .64 },   /* 第八重　左・下より */
  { wall: "right", t: .64 },   /* 第九重　右・下より */
  { wall: "top",   t: .50 },   /* 蓬莱天宮 上・まんなか（最奥だけ従来の構え） */
];
/* i は 0 始まりの階層、r はボスの<b>実際の当たり半径</b>（＝定義の r × 1.22） */
function houraiBossPos(i, r) {
  const s = HOURAI_BOSS_SPOT[i] || { wall: "top", t: .5 };
  const gx = (HOURAI_BOSS_GAP + r) / HOURAI_BW;
  const gy = (HOURAI_BOSS_GAP + r) / HOURAI_BH;
  /* 壁にそった位置は<b>反対の壁とのすきまも入れる幅にする</b>。
     ★ 中途はんぱに寄せると「60px しか空いていない＝球が入らないだけの死に角」ができる。
       入れるなら 104px、入れないならぴったり壁ぎわ——のどちらかにそろえる。 */
  const cx = (v) => Math.min(1 - gx, Math.max(gx, v));
  const cy = (v) => Math.min(1 - gy, Math.max(gy, v));
  if (s.wall === "left")  return { x: gx, y: cy(s.t), wall: "left" };
  if (s.wall === "right") return { x: 1 - gx, y: cy(s.t), wall: "right" };
  return { x: cx(s.t), y: gy, wall: "top" };
}
/* 1クエストぶんを組み立てる */
function houraiStage(k) {
  const i = k - 1;
  const el = HOURAI_ELS[i];
  const anti = HOURAI_ANTI[i];
  const sp = HOURAI_SPECIAL[i];
  const last = (k === HOURAI_N);                       // 蓬莱天宮
  const bossSp = last ? "youhi" : "youka";
  const hpB = HOURAI_BOSS_HP[i];
  /* ★ 2026-08-17o 「ギリギリのHPで削り合う」重さにする。
     もとの 3400×1.10^i だと1WAVEぶんの攻撃がチームHPの2割ほどしかなく、
     ほぼ無傷で押し切れてしまっていた。
     ★ 階層ごとの伸びは<b>ゆるく</b>する（1.10^i だと最奥が10倍近くなり、
       味方のHPは増えないので最後だけ理不尽になる）。
       伸びぶんは houraiAtkEase() で最終調整している。 */
  const atkB = Math.round(11800 * Math.pow(1.035, i) * houraiAtkEase(k));
  /* ★ 雑魚は「倒しやすく・でも痛い」。HPはボスの数%まで落とす。 */
  /* ★ 2026-08-17k 雑魚は「<b>4手ほどで1体倒せる</b>」重さにそろえる。
     0.5% だと1〜2手で溶けて、雑魚をさばく判断そのものが無くなっていた。
     ボスHPが階層ごとに伸びるので、割合で決めると雑魚まで際限なく重くなる。
     そこで<b>味方の実火力から逆算</b>する。
       ・最大LvのSSRの直殴りは 1手あたりおよそ MOB_HIT_DMG（弱点や倍率は乗せない素の値）
       ・階層が上がるほど味方も育っている前提で、ゆるやかに増やす
     ★ ボスHPとは切り離すこと。ここを hpB 連動に戻すと、また1手で溶けるか鉄壁になる。
     ★ この値は<b>実際の手ごたえから逆算</b>してある。
       前の版の雑魚（第二重で16万）が「1〜2手で溶ける」という報告だったので、
       1手ぶんの実火力を約16万とみて、その4倍を1体ぶんの基準にした。
       （直殴りの素の値ではなく、キラー・属性有利・リンクまで含めた実効値） */
  const MOB_HIT_DMG = 160000;                     // 1手ぶんの実効ダメージのめやす
  const MOB_HITS = 5;                             /* ★ 2026-08-17o 4手 → 5手（少し固く） */
  /* ★ 2026-08-17r 雑魚戦（WAVE1〜3）の雑魚だけ、さらに少し固くする。
     ボス戦の護衛は「ボスを削る手をどれだけ取られるか」なので上げすぎない。 */
  const MOB_W13 = 1.35;
  const mobHp = (m) => Math.round(MOB_HIT_DMG * MOB_HITS * m * (1 + i * 0.16));
  const mk = (mult, x, y, o) => Object.assign(
    { el, sp: k <= 4 ? "zenos" : "valga", hp: mobHp(mult), atk: atkB, cd: 2 + (x > .5 ? 1 : 0), r: 44, x, y }, o || {});
  /* ボス。瑶華＆玉蘭は2体で1組なので twin を立てる（攻撃を別カウントで回す目印）
     ★★ 2026-08-25 置き場所はクエストごとに変える（HOURAI_BOSS_SPOT）。
       壁とのあいだには、味方が<b>挟まれる</b>すきまを必ず空けてある。 */
  const bossR = last ? 112 : 104;
  const bpos = houraiBossPos(i, Math.round(bossR * 1.22));
  const bs = (mult, o) => Object.assign(
    { el, sp: bossSp, boss: 1, weak: 1, r: bossR,
      hp: Math.round(hpB * mult), atk: Math.round(atkB * 1.5), cd: 3, x: bpos.x, y: bpos.y,
      hourai: 1 }, last ? { knockback: 1 } : { twin: 1 }, o || {});
  /* アンチギミックを WAVE ごとに散らす。
     ★ 同じクエストの中でも WAVE ごとに数と置きかたを変える（全WAVEで別構成にするため）。 */
  const gimOf = (w) => {
    const g = {};
    anti.forEach((a, ai) => {
      /* ★ 2026-08-17p アンチは<b>全WAVEで必ず全部そろえる</b>。
         以前は WAVE によって片方を消していたので、
         「第七重の2〜3WAVE目だけ地雷が無い」のように<b>途中でギミックが消える</b>面ができていた。
         クエストの顔＝アンチの組み合わせなので、ここは絶対に欠けさせない。
         WAVEごとの変化は<b>数と置きかた</b>で出す（下の w を使った増減）。 */
      {
        /* ★ 2026-08-17n ギミックの値は<b>形が決まっている</b>。
           数を入れるだけのもの（warp / wallchange / vanish …）と、
           オブジェクトで渡すもの（dw / mine / ward / slowwall / healwall / balloon / lockzone / photon）がある。
           ★ 形をまちがえると描画側が undefined を forEach して<b>render ごと落ちる</b>
             ＝敵も味方も1体も描かれない（実際そうなっていた）。
             新しいクエストを作るときは、必ず既存クエストの gim を見て形をそろえること。 */
        const side4 = ["left", "right", "top", "bottom"];
        if (a === "dw") g.dw = { sides: (w % 2) ? ["left", "right"] : ["top", "bottom"], dmg: Math.round(atkB * 0.42) };
        else if (a === "warp") g.warp = 2 + (w % 2);
        else if (a === "mine") g.mine = { n: 3 + w, dmg: Math.round(atkB * 0.55) };
        else if (a === "slowwall") g.slowwall = { sides: (w % 2) ? ["top", "bottom"] : ["left", "right"] };
        else if (a === "block") g.block = 1;
        else if (a === "lockzone") g.lockzone = { n: 1 + (w >= 3 ? 1 : 0) };
        else if (a === "ward") g.ward = { n: 1 + (w >= 4 ? 1 : 0), hits: 2 + (w >= 3 ? 1 : 0) };
      }
    });
    /* ★ 2026-08-17m 盤面を変える特殊ギミックを1つ足す。
       WAVEによって出したり出さなかったりして、同じ面が2つできないようにする。 */
    /* ★ 2026-08-17p 特殊ギミックも<b>全WAVEで必ず出す</b>。
       以前は「このWAVEだけ出さない」を入れていたため、
       特殊ギミックが1つも無いWAVEができてしまっていた。
       WAVEごとの変化は<b>数・強さ</b>で付ける。 */
    const gs = HOURAI_GIMSP[i];
    if (gs === "countboost") g.countboost = 1;
    if (gs === "balloon") g.balloon = { n: 2 + (w % 3) };
    if (gs === "wallchange") g.wallchange = 1;
    if (gs === "photon") g.photon = { n: 2 + (w >= 3 ? 1 : 0), need: 2 + (w >= 4 ? 1 : 0) };
    if (gs === "vanish") g.vanish = 1;
    if (gs === "healwall") g.healwall = { sides: (w % 2) ? ["left"] : ["right"] };
    /* ★ 内部弱点は<b>ボスWAVEだけ</b>（雑魚には弱点そのものが無いので付けても意味がない）。
       そのぶん雑魚WAVEが空になってしまうので、<b>そちらには別の特殊を置く</b>。
       これを入れないと第七重の1〜3WAVE目だけ特殊ギミックが1つも無い面になる。 */
    if (gs === "innerweak") {
      if (w >= 3) g.innerweak = 1;
      else g.balloon = { n: 2 + (w % 2) };
    }
    return g;
  };
  /* 敵の並び。WAVE ごとに形を変える（横一列・くさび・四隅・囲みの4型を階層でずらす） */
  const FORMS = [
    [[.20, .30], [.50, .22], [.80, .30]],
    [[.50, .18], [.28, .38], [.72, .38], [.50, .56]],
    [[.16, .24], [.84, .24], [.16, .54], [.84, .54]],
    [[.50, .16], [.22, .32], [.78, .32], [.30, .58], [.70, .58]],
  ];
  /* ★ 重力バリアは<b>敵が持つ</b>もの（counterKeysOf も敵の grav を見る）。
     ステージの gim に書いても効かないし、対策クエストにも数えられない。 */
  const useGrav = anti.indexOf("grav") >= 0;
  const gv = (n) => (useGrav ? { grav: n } : {});
  const waves = [];
  for (let w = 0; w < 6; w++) {
    const form = FORMS[(i + w) % FORMS.length];
    if (w < 3) {
      /* 雑魚WAVE。HPは低め・数は多め */
      waves.push(form.map((p, n) => mk((1 + w * .28 + n * .06) * MOB_W13, p[0], p[1],
        Object.assign(n === 0 ? { weak: 1 } : (n % 2 ? { pattern: "laser" } : {}),
                      (n % 2 === 0) ? gv(1 + (w % 2)) : {}))));
    } else {
      /* ボスWAVE
         ★★ 2026-08-25 ボスが上以外の壁に寄ったぶん、護衛は<b>ボスの反対がわ</b>へ置く。
           陣形（FORMS）はそのまま使い、左右の壁ぎわのときだけ<b>90度まわして</b>当てはめる。
           こうしないと護衛がボスに重なり、壁とのすきまも護衛でふさがってしまう。 */
      /* ボスに重ならない最小の距離（ボスの半径＋雑魚の半径＋すこし）。
         ★ 半径は makeEnemy で 1.22 倍されるので、その値で数えること。 */
      const _bR = Math.round(bossR * 1.22), _gR = Math.round(44 * 1.22), _pad = 14;
      const clrY = (bpos.y * HOURAI_BH + _bR + _gR + _pad) / HOURAI_BH;
      const clrXL = (bpos.x * HOURAI_BW + _bR + _gR + _pad) / HOURAI_BW;
      const clrXR = (bpos.x * HOURAI_BW - _bR - _gR - _pad) / HOURAI_BW;
      const gpos = (p) => {
        if (bpos.wall === "left")  return [Math.max(clrXL, p[1] + .18), p[0]];
        if (bpos.wall === "right") return [Math.min(clrXR, .82 - p[1]), p[0]];
        return [p[0], Math.max(clrY, p[1] + .18)];
      };
      const guards = form.slice(1).map((p, n) => {
        const q = gpos(p);
        return mk(1.2 + w * .22, q[0], q[1],
          Object.assign(n % 2 ? { pattern: "homing" } : { weak: 1 }, (n % 2 === 0) ? gv(2) : {}));
      });
      const b = bs(1 + (w - 3) * .55, {
        pattern: w === 5 ? "burst" : w === 4 ? "laser" : "all",
        doomMax: 8 - (w - 3), crush: 7 - (w - 3),
      });
      /* ★ descend の階層は、ボスWAVEを「雑魚を全滅させるとボスが降りてくる」形にする */
      /* ★ 降臨は<b>ボスWAVEすべて</b>で。雑魚を片づけてからボスに向きあう形にそろえる。 */
      if (sp === "descend") b.descend = 1;
      /* ★ 端の即死は、猶予のあるうしろのWAVEだけ（序盤から出すと読む間がない） */
      if (sp === "edgedoom" && w >= 4) { b.edgeDoom = 1; b.edgeWarn = 3; }
      /* 瑶華＆玉蘭は2本目のカウントを1本目より少し長くする（同時に殴らせない） */
      if (!last) b.cd2 = b.cd + 2;
      waves.push([b].concat(guards));
    }
  }
  const gimByWave = waves.map((_, w) => gimOf(w));
  return {
    id: "hr" + k, nm: last ? "蓬莱天宮" : "蓬莱の九重・第" + HOURAI_KANJI[i] + "重",
    room: k, hourai: 1, hi: true,
    el, elemUp: 1.50,
    diff: last ? "★蓬天" : "★蓬" + HOURAI_NM[i],
    gold: 26000 + k * 5200 + (last ? 40000 : 0),
    orb: HOURAI_ORB, exp: 4200 + k * 780,
    bgKey: last ? "tenkyu" : "hourai", bgm: "garden-of-the-nether.mp3",
    banner: "bn_hourai_s.webp",
    gim: gimByWave[0], blocks: [], ghost: [], swap: [],
    gimByWave, waves,
    special: sp,
    /* ★★ 2026-08-22b 黄昏の王城 第29・30の間と同じ「殴りが主役」のクエストにする（ご指定）。
       リンクスキルのダメージが×0.5 になるかわりに、直殴り（体当たり）が×2.0。
       ★ 効かせているのは questFsMul() / questMeleeMul()（index.html）で、
         どちらも B.stage の値をそのまま読む＝ここに書くだけで全10クエストに効く。
       ★ クエスト一覧のバッジ（⚔ 殴り×2 ／ リンク×0.5）も s.fsMul を見て自動で出る。 */
    fsMul: HOURAI_FS_MUL, meleeMul: HOURAI_MELEE_MUL,
  };
}
const HOURAI_STAGES = Array.from({ length: HOURAI_N }, (_, k) => houraiStage(k + 1));
/* ══ ★ 2026-08-17o 1WAVEぶんの攻撃力を「チームHPの◯%」にそろえる ══
   ------------------------------------------------------------
   敵の数はWAVEごとの陣形で3〜5体と変わるので、1体あたりを同じにすると
   WAVE合計が 65%〜134% とばらついていた（＝ある面は無傷、ある面は一撃全滅）。
   ここで<b>WAVEの合計</b>を見て、目標の割合になるように全員をならす。
     雑魚戦（WAVE1〜3） … 105% → 122%（奥の階層ほど重く）
     ボス戦（WAVE4〜6） … 128% → 148%
   ★ <b>あえて100%を超えている</b>。
     回復アビリティ（回復M・リジェネM・治癒の祈り・バウンドヒールなど）や
     WAVEクリアの回復でHPが戻るので、100%以下だと素通りできてしまう。
     「敵を先に減らす」「回復を挟む」の<b>どちらもやらないと落ちる</b>重さにしてある。
   ★ 上げすぎると回復編成しか通らなくなる。ボス戦は<b>1.5倍まで</b>を目安にすること。
   ★ HOURAI_REF_HP は最大LvのSSRを4体そろえたときのチームHPのめやす。
     キャラを増やしてHPの上限が上がったら、この数字も見直すこと。 */
const HOURAI_REF_HP = 47000;
HOURAI_STAGES.forEach((st, i) => {
  const t = HOURAI_N > 1 ? i / (HOURAI_N - 1) : 0;
  (st.waves || []).forEach((wv, w) => {
    const bossWave = (wv || []).some((d) => d && d.boss);
    const want = HOURAI_REF_HP * ((bossWave ? 1.28 : 1.05) + (bossWave ? 0.20 : 0.17) * t);
    const now = (wv || []).reduce((a, d) => a + ((d && d.atk) || 0), 0);
    if (!now) return;
    const k = want / now;
    wv.forEach((d) => { if (d && d.atk) d.atk = Math.max(1, Math.round(d.atk * k)); });
  });
});
/* ★ 2026-08-17L 蓬莱天宮（10番目）は<b>第九重をクリアするまで開かない</b>。
   ほかのクエストは1つ前をクリアすれば次が開くので、同じ決まりにそろえてある。 */
HOURAI_STAGES.forEach((st, i) => {
  /* ★ 2026-08-17m 蓬莱天宮は<b>第一重〜第九重をすべてクリア</b>して初めて開く。
     「1つ前だけ」だと第九重を抜けた時点で入れてしまうので、9つ全部を条件にする。 */
  if (i === HOURAI_N - 1) st.needAllClear = HOURAI_STAGES.slice(0, HOURAI_N - 1).map((x) => x.id);
});
function houraiTenkyuOpen() {
  if (typeof DB === "undefined" || !DB || !DB.clears) return false;
  return HOURAI_STAGES.slice(0, HOURAI_N - 1).every((x) => DB.clears[x.id]);
}
/* ★ 2026-08-05 新ギミック「FB遅延攻撃」は 第8〜12ノ園 で採用する。
   ・各WAVEに<b>1体だけ</b>置く。2体以上だと毎ターン巻きもどされてフルバーストが永久に撃てず、
     「対策する」ではなく「何もできない」になってしまう。
   ・ボスには持たせない（ボスは即死・クラッシュを持っていて役割が重なるため）。
   ・奥の園ほど巻きもどし量を増やす（第8＝3 → 第12＝5）。 */
GARDEN_STAGES.forEach((s, i) => {
  const k = i + 1;
  if (k < 8) return;
  /* 8,9→3 / 10,11→4 / 12以降→5（★ 2026-08-07: 第13〜15ノ園でも5で頭打ちにする。
     ここから上げるとフルバーストが実質いちど も撃てなくなり、対策ではなく詰みになる） */
  const n = Math.min(5, FBDELAY_N + Math.floor((k - 8) / 2));
  (s.waves || []).forEach((wv) => {
    const cand = (wv || []).filter((d) => d && !d.boss);
    if (!cand.length) return;
    cand[cand.length - 1].fbDelay = n;             // いちばん後ろ＝ふつうは奥・端にいる1体
  });
});

/* ══ ★ 2026-08-06 幽冥の庭園に「十字レーザー」を配る ══
   十字レーザーは 90度ずつ4方向へ同時にビームを撃つ攻撃（crossLaserAttack）。
   1本のレーザーは線から外れれば避けられるが、十字は画面を4つに切るので、
   味方をただ散らすだけでは防げない＝庭園（超絶高難易度）向きの圧力になる。
   ★ 園ごとの表（GARDEN_FORM）に直接書き足すと 12園 × 6WAVE ぶんを触ることになり、
     陣形の作り分けが読みづらくなるので、組み上がったあとにここでまとめて差し替える。
   ★ 置きかえるのは「もともとレーザーを撃つ敵」だけ。攻撃してくる敵の数は変えない
     （新しく攻撃を足すと、庭園の総ダメージ量が設計から外れてしまうため）。
   ・ボス … 終盤の WAVE5・6 で十字になる（最後の詰めがいちばん重い）。
   ・雑魚 … 各WAVEで1体まで。奥の園（第4ノ園から）ほど早いWAVEから出る。 */
GARDEN_STAGES.forEach((s) => {
  const deep = (s.room || 1) >= 4;
  const fromWave = deep ? 1 : 3;     // 雑魚が十字を撃ちはじめるWAVE（0始まり）
  (s.waves || []).forEach((wv, wi) => {
    let mobDone = 0;
    (wv || []).forEach((d) => {
      if (!d || d.pattern !== "laser") return;
      if (d.boss) { if (wi >= 4) d.pattern = "crosslaser"; return; }
      if (wi >= fromWave && mobDone < 1) { d.pattern = "crosslaser"; mobDone++; }
    });
  });
});

/* ══════════════════════════════════════════════════════════════════
   v12: 黄昏の王城・禁忌の迷宮の最深部（第25〜28の間）
   ・第25の間 … 全WAVEでギミック構成が変わるように作り直し、<b>ウォールチェンジ</b>を採用
     （アンチギミックの2種と属性はこれまでどおり）
   ・第26〜28の間 … 新規追加。全WAVEでギミック構成が変わり、アンチギミックは
     「2種ずつ・部屋どうしで組み合わせが重ならない」ように配る
   ══════════════════════════════════════════════════════════════════ */
/* ★ 2026-08-07: 並びは ANTI_ORDER のとおり。断絶界（ward）も加えた */
const ANTI_NM = { dw: "ダメージウォール", grav: "重力バリア", warp: "ワープ", mine: "地雷", slowwall: "減速壁", block: "ブロック", lockzone: "ロックゾーン", ward: "断絶界" };
/* WAVEごとのギミック（種類はクエストで固定・数と強さと配置だけがWAVEで変わる）
   opt: { wallchange, photon:[WAVEごとの必要数], innerweak } */
function varyGimByWave(antiKeys, room, w, opt) {
  opt = opt || {};
  const dmg = Math.round(320 + room * 46 + w * 80);
  const g = {};
  if (antiKeys.indexOf("dw") >= 0) {
    const sides = [["left", "right"], ["top"], ["left", "right", "top"], ["right", "top"], ["left", "top"], ["left", "right"]][w];
    g.dw = { sides, dmg };
  }
  if (antiKeys.indexOf("warp") >= 0) g.warp = 2 + (w % 3);
  if (antiKeys.indexOf("mine") >= 0) g.mine = { n: 3 + (w % 3), dmg };
  if (antiKeys.indexOf("lockzone") >= 0) g.lockzone = { n: 1 + (w % 2) };
  /* ★ 減速壁：DW が使っていない面から選ぶ（同じ面に重なると見分けられない）。
     WAVE ごとに面の組み合わせが変わるので、毎回盤面を読み直すことになる。 */
  if (antiKeys.indexOf("slowwall") >= 0) {
    const used = (g.dw && g.dw.sides) || [];
    const pool = ["left", "right", "top", "bottom"].filter((s2) => used.indexOf(s2) < 0);
    const pat = [[0], [1], [0, 1], [1, 2], [0, 2], [2]][w] || [0];
    const sides = pat.map((i2) => pool[i2 % pool.length]).filter((v, i2, a2) => v && a2.indexOf(v) === i2);
    g.slowwall = { sides: sides.length ? sides : ["bottom"] };
  }
  if (opt.wallchange) g.wallchange = 1;
  /* エーテル（アンチでは消せないギミック）: WAVEごとに必要数が変わる */
  if (opt.photon && opt.photon[w]) g.photon = { n: opt.photon[w] + 1, need: opt.photon[w] };
  if (opt.innerweak) g.innerweak = 1;   // 内部弱点（ボスは貫通でしか弱点を殴れない）
  /* ★ 2026-08-05: 庭園でしか使えなかった「結界」「ヴァニッシュボックス」「カウントブーストウォール」を
     EX降臨・最深部でも使えるようにした。どれも WAVEごとの数を配列で渡す（0なら出さない）。
     ・ward     … 結界（閉じ込められたらその中でしか動けない）
     ・vanish   … ヴァニッシュボックス（最後にふれた箱が次のターンに消える）
     ・countboost … 壁を叩くほど直殴りが強くなる（壁系ギミックは最後に1種へ絞られる） */
  if (opt.ward && opt.ward[w]) g.ward = { n: opt.ward[w], hits: WARD_HITS + (opt.wardHard ? 1 : 0) };
  if (opt.vanish && opt.vanish[w]) g.vanish = 1;
  if (opt.countboost) g.countboost = 1;
  /* ★ 2026-08-07 透明スイッチ（踏むたびに敵の出現⇄透明が入れ替わる）。WAVEごとの数を配列で渡す */
  if (opt.ghostswitch && opt.ghostswitch[w]) g.ghostswitch = { n: opt.ghostswitch[w] };
  return dedupeWallFx(g);
}
/* ★ 2026-08-07: 透明スイッチのあるクエストでは、敵を「出ている側／透明な側」に振り分ける。
   ・各WAVEで<b>必ず1体以上が出ている</b>ようにする（全員透明だと手も足も出ない）。
   ・ボスは<b>出ている側に固定</b>する（ボスが透明のまま護衛だけ湧くと、何をすればいいのか読めない）。
   ・振り分けは並び順の偶数／奇数。WAVEごとに位相をずらすので、同じ配りかたが2回続かない。 */
function assignGhostSwitchSides(stage) {
  (stage.waves || []).forEach((wv, w) => {
    if (!(stage.gimByWave && stage.gimByWave[w] && stage.gimByWave[w].ghostswitch)) return;
    const mobs = (wv || []).filter((d) => d && !d.boss);
    (wv || []).forEach((d) => { if (d && d.boss) d.gs = 0; });
    mobs.forEach((d, i) => { d.gs = (i + w) % 2; });
    /* 1体も出ていないWAVEになったら、先頭を出ている側へ戻す */
    if (!(wv || []).some((d) => d && d.gs === 0)) { if (wv[0]) wv[0].gs = 0; }
  });
}
/* そのステージを「WAVEごとにギミック・地形が変わる」構成へ作り直す。
   opt: { wallchange, routes, swaps, pass, rows, photon, innerweak, phase, note } */
function makeWaveVarying(stage, antiKeys, opt) {
  opt = opt || {};
  const useBlock = antiKeys.indexOf("block") >= 0;
  const waves = stage.waves || [];
  stage.gimByWave = waves.map((_, w) => varyGimByWave(antiKeys, stage.room || 25, w, opt));
  stage.terrainByWave = waves.map((_, w) => gardenCleanTerrain(
    varyTerrain(useBlock, w, waves[w], {
      routes: ROUTE_LIB[opt.routes] || null,
      swaps: opt.swaps ? SWAP_LIB[opt.swaps] : null,
      pass: opt.pass || null, rows: opt.rows, phase: opt.phase,
    }), waves[w]));
  /* 重力バリア（敵側の特性）は「対策できるクエスト」だけに、全WAVEへ確実に1体ぶん置く */
  const flat = waves.flat ? waves.flat() : [].concat.apply([], waves);
  if (antiKeys.indexOf("grav") >= 0) {
    const r = 100 + Math.min(70, (stage.room || 25) * 3);
    waves.forEach((wv) => {
      if (wv.some((d) => d && d.grav)) return;
      const t = wv.find((d) => d && d.boss) || wv[0];
      if (t) t.grav = r;
    });
  } else flat.forEach((d) => { if (d && d.grav) delete d.grav; });
  /* ★ v12.4: エーテルが出るクエストは「すべての敵」にエーテルバリアを付ける。
     どの敵を倒すにもエーテルを運ぶ必要があり、運搬そのものが攻略の軸になる。 */
  if (opt.photon) flat.forEach((d) => { if (d) delete d.noPhoton; });
  /* ★ 2026-08-07: 透明スイッチのあるWAVEは、敵を出ている側／透明な側へ振り分ける */
  if (opt.ghostswitch) assignGhostSwitchSides(stage);
  stage.gim = stage.gimByWave[0];
  stage.blocks = stage.terrainByWave[0].blocks;
  stage.ghost = stage.terrainByWave[0].ghost;
  stage.swap = stage.terrainByWave[0].swap;
  stage.wallchange = !!opt.wallchange;
  const extra = [];
  if (opt.pass) extra.push("<b>撃種限定ブロック（青◇＝反射のみ／金→＝貫通のみ）</b>");
  if (opt.swaps) extra.push("<b>撃種変化パネル（⇄）</b>");
  if (opt.photon) extra.push("<b>エーテル</b>（ボスのシールドを割る）");
  if (opt.innerweak) extra.push("<b>内部弱点</b>（ボスの弱点は貫通でしか殴れない）");
  if (opt.wallchange) extra.push("<b style='color:#ff5d47'>ウォールチェンジ</b>（壁にふれるたび 青→黄→赤 と一周）");
  if (opt.ward) extra.push("<b style='color:#7cc4ff'>断絶界</b>（閉じこめられたら中でしか動けない・アンチ断絶界なら1回で破壊）");
  if (opt.vanish) extra.push("<b style='color:#5fe0e0'>ヴァニッシュボックス</b>（最後にふれた箱が次のターンに消える）");
  if (opt.countboost) extra.push("<b style='color:#ffb84d'>カウントブーストウォール</b>（壁を叩くほど直殴りが強くなる）");
  if (opt.ghostswitch) extra.push("<b style='color:#c86bff'>透明スイッチ</b>（踏むと敵の出現⇄透明が入れ替わる／<b>1ターン1回</b>・踏んだスイッチは消えて次のターンに復活・<b>透明な敵も攻撃してくる</b>）");
  /* ★ v12.2: リンクスキルの威力を落として「直殴りで戦う」クエストにする
     ★ v12.4: そのぶん直殴りの火力を上げる（既定 ×1.5） */
  if (opt.fsMul) { stage.fsMul = opt.fsMul; stage.meleeMul = opt.meleeMul || 2.0; }
  /* ★ 2026-08-07: 断絶界がアンチギミックになったので、説明の「◯種だけ」は
     実際に出るアンチの数から組み立てる（決め打ちの「2種だけ」をやめた）。 */
  const antiShown = orderAntiKeys(antiKeys.concat(stage.gimByWave.some((g2) => g2 && g2.ward) ? ["ward"] : []));
  stage.desc = (stage.raid ? "<b>EX降臨</b>。" : stage.lab ? "<b>深淵級</b>。" : "<b>最難関</b>。") + stage.nm
    + "。アンチギミックは<b>" + antiShown.map((a) => ANTI_NM[a]).join("と") + "の" + antiShown.length + "種だけ</b>だが、"
    + "<b>WAVEごとにギミックの数・強さ・配置・導線（通り道）がすべて変わる</b>。"
    + (opt.note ? "導線は" + opt.note + "。" : "")
    + (extra.length ? "さらに " + extra.join(" ／ ") + " が登場する。" : "")
    + (opt.fsMul ? "<br><b style='color:#e0405e'>このクエストではリンクスキルのダメージが×" + opt.fsMul + "</b>になり、"
      + "かわりに<b style='color:#d97800'>直殴り（体当たり）のダメージが×" + (opt.meleeMul || 2.0) + "</b>になる。<b>殴りが主役</b>のクエストだ！" : "")
    + "毎WAVE盤面を読み直して攻略せよ！";
  return stage;
}
/* 第26〜28の間（新規追加）。難易度は第21〜23の間の系列をそのまま伸ばして使う */
function deepCastleStage(newRoom) {
  const s = Object.assign({}, castleStage(newRoom - 5), {
    id: "tk" + newRoom, nm: "黄昏の王城・第" + newRoom + "の間", room: newRoom,
    diff: "★EX" + (newRoom - 20),
    gold: 5000 + (newRoom - 20) * 1500, orb: 6, exp: 1400 + (newRoom - 20) * 300,
  });
  s.waves = s.waves.map((wv) => wv.map((d) => Object.assign({}, d)));
  s.blocks = []; s.ghost = []; s.swap = [];   // 地形は makeWaveVarying でWAVEごとに作り直す
  return s;
}
function deepLabStage(newRoom) {
  const s = Object.assign({}, labStage(newRoom - 5), {
    id: "lb" + newRoom, nm: "禁忌の迷宮・第" + newRoom + "の間", room: newRoom, lab: 1,
    diff: "★深" + (newRoom - 20),
    gold: 6000 + (newRoom - 20) * 1600, orb: 7, exp: 1600 + (newRoom - 20) * 320,
  });
  s.waves = s.waves.map((wv) => wv.map((d) => Object.assign({}, d)));
  s.blocks = []; s.ghost = []; s.swap = [];
  return s;
}
/* ── 第26〜28の間の設計（アンチ2種＋導線＋その他ギミックを部屋ごとに変える） ──
   ★ 6部屋すべてで「アンチの組み合わせ」「導線パターン」「追加ギミック」が別物になるようにしている。 */
const DEEP_DESIGN = {
  castle: {
    26: { anti: ["dw", "block"], routes: "centerLane", phase: 0, photon: [0, 0, 2, 2, 3, 3],
      note: "<b>左右をふさいで中央に1本の縦通路</b>を通す形" },
    27: { anti: ["mine", "lockzone"], routes: "zigzag", pass: "alt", swaps: "center", phase: 1,
      note: "<b>互い違いのゲートをジグザグに抜ける</b>形" },
    28: { anti: ["grav", "block"], routes: "triSlit", wallchange: true, innerweak: true, rows: 2, phase: 0,
      note: "<b>3枚の細いすき間</b>を狙って通す形" },
    /* ★ v12.2 第29・30の間: ブロック系はなし。エーテル運搬＋ウォールチェンジを軸にした「殴り」クエスト */
    29: { anti: ["dw", "warp"], routes: "twinPillar", wallchange: true, photon: [2, 2, 3, 3, 4, 4], fsMul: 0.5, rows: 1, phase: 0,
      note: "<b>2本の柱のあいだを縫う（左・中央・右の3ルート）</b>形" },
    30: { anti: ["mine", "grav"], routes: "funnel", wallchange: true, photon: [2, 3, 3, 4, 4, 4], innerweak: true, fsMul: 0.5, rows: 1, phase: 1,
      note: "<b>奥へ行くほど細くなる漏斗</b>の形" },
  },
  lab: {
    26: { anti: ["warp", "block"], routes: "sideGate", swaps: "sides", phase: 1,
      note: "<b>左右どちらか一方だけが開き、WAVEごとに開く側が入れ替わる</b>形" },
    27: { anti: ["dw", "lockzone"], routes: "centerPlug", photon: [0, 2, 2, 3, 3, 4], rows: 2, phase: 0,
      note: "<b>中央をふさいで左右から回り込む</b>形" },
    28: { anti: ["mine", "warp"], routes: "stair", pass: "alt", swaps: "ladder", wallchange: true, phase: 1,
      note: "<b>斜めに落ちていく階段状の壁</b>を反射で縫う形" },
    /* ★ v12.2 第29・30の間: 王城とは別の導線・別のアンチ2種で構成する */
    29: { anti: ["warp", "lockzone"], routes: "wideHall", wallchange: true, photon: [2, 2, 3, 3, 4, 4], swaps: "center", fsMul: 0.5, rows: 1, phase: 1,
      note: "<b>両サイドを狭めて中央の広間を大きく使う</b>形" },
    30: { anti: ["dw", "mine"], routes: "zigzag", wallchange: true, photon: [3, 3, 4, 4, 4, 4], innerweak: true, fsMul: 0.5, rows: 1, phase: 0,
      note: "<b>互い違いのゲートをジグザグに抜ける</b>形" },
  },
};
const DEEP_ROOMS = [26, 27, 28, 29, 30];
const CASTLE_DEEP_ANTI = {}; DEEP_ROOMS.forEach((n) => { CASTLE_DEEP_ANTI[n] = DEEP_DESIGN.castle[n].anti; });
const LAB_DEEP_ANTI = {}; DEEP_ROOMS.forEach((n) => { LAB_DEEP_ANTI[n] = DEEP_DESIGN.lab[n].anti; });
DEEP_ROOMS.forEach((n) => {
  const dc = DEEP_DESIGN.castle[n], dl = DEEP_DESIGN.lab[n];
  STAGES.push(makeWaveVarying(setAntiGims(deepCastleStage(n), dc.anti), dc.anti, dc));
  LAB_STAGES.push(makeWaveVarying(setAntiGims(deepLabStage(n), dl.anti), dl.anti, dl));
});
/* 第25の間は「全WAVEでギミック構成が変わる＋ウォールチェンジ」に作り直す（アンチ2種・属性は変えない） */
makeWaveVarying(STAGES.find((s) => s.id === "tk25"), CASTLE_ANTI[24],
  { wallchange: true, routes: "wideHall", phase: 0, note: "<b>両サイドを狭めて中央の広間を大きく使う</b>形" });
makeWaveVarying(LAB_STAGES.find((s) => s.id === "lb25"), LAB_ANTI[24],
  { wallchange: true, routes: "centerLane", phase: 1, note: "<b>中央に1本の縦通路</b>を通す形" });
/* ★ v12: 黄昏の王城・禁忌の迷宮の敵は「幽冥の庭園のボス（ヘカーティア）を除く敵キャラ」＝
   ゼノス／ヴァルガ をランダムに配置する。部屋・WAVE・並び順から決まる固定ランダムなので、
   マルチプレイでも全端末で同じ見た目になる。 */
const RAND_SPS = ["zenos", "valga"];
function scatterEnemySprites(stages) {
  stages.forEach((s) => {
    (s.waves || []).forEach((wv, wi) => wv.forEach((d, di) => {
      if (!d) return;
      let h = Math.imul(((s.room | 0) + 1) * 733 + wi * 97 + di * 31 + 17, 0x9E3779B1) | 0;
      h = Math.imul(h ^ (h >>> 15), 0x85EBCA6B) | 0;
      d.sp = RAND_SPS[((h >>> 3) & 0x7fffffff) % RAND_SPS.length];
    }));
  });
}
scatterEnemySprites(STAGES);
scatterEnemySprites(LAB_STAGES);
/* ★ v12.1: 第26〜28の間のボスは「ミソラ」。入手はできない、最深部だけに現れる特別なボス。
   （敵スプライトのランダム配置のあとに上書きするので、必ずミソラになる） */
[STAGES, LAB_STAGES].forEach((list) => list.forEach((s) => {
  if ((s.room | 0) < 26) return;
  (s.waves || []).forEach((wv) => wv.forEach((d) => { if (d && d.boss) d.sp = "misora"; }));
}));
/* ★ 2026-08-04: 第1〜25の間のボスに固有ボス5体を割り当てる。
   ★ 必ず scatterEnemySprites のあとに走らせること。
     先に走らせると、ランダム配置（ゼノス／ヴァルガ）にボスごと上書きされて消える。 */
assignBosses(STAGES, "castle");
assignBosses(LAB_STAGES, "lab");

/* 幽冥の庭園は第1ノ園から順番に。前の園を全WAVEクリア（＝クエストクリア）すると次が開く */
/* ★ v14: 開放条件を変更（前の園クリア → 合計クリアWAVE数 ／ 第7ノ園は第1〜6全クリア） */
/* ★ 2026-08-03: 幽冥の庭園はすべて常に開放。
   これまでは「合計クリアWAVE数」で1園ずつ開いていたが、
   踏破数は毎月リセットされるため、月が変わるたびに開けていた園が閉じてしまい、
   遊べるクエストが勝手に減る状態になっていた。開放条件そのものをやめる。 */
function gardenUnlocked(k) { return true; }
/* ★ 2026-08-17m 蓬莱天宮は「第一重〜第九重をすべてクリア」で開く。
   ここに足さないと、カギの絵は出ても<b>そのまま出撃できてしまう</b>
   （表示と実際の開閉は別なので、必ず両方そろえること）。 */
function stageLocked(s) {
  if (s && s.needAllClear) {
    const cl = (typeof DB !== "undefined" && DB && DB.clears) || {};
    if (!s.needAllClear.every((id) => cl[id])) return true;
  }
  return !!(s && s.garden && !gardenUnlocked(s.room));
}
function findStage(id) { return STAGES.find((s) => s.id === id) || LAB_STAGES.find((s) => s.id === id) || GARDEN_STAGES.find((s) => s.id === id) || HOURAI_STAGES.find((s) => s.id === id) || (RAIDS[id] ? raidStage(id) : null); }

/* ★ 2026-08-07: 定義の並びも ANTI_ORDER にそろえた（counterKeysOf が orderAntiKeys を
   通すので実際の表示順はそちらで決まるが、読むときに迷わないよう同じ順にしておく）。 */
const COUNTER_ABIL = {
  dw:       { nm: "ダメージウォール", need: ["adw", "superadw"], label: "ADW" },
  grav:     { nm: "重力バリア",       need: ["agrav", "sgrav"], label: "アンチ重力バリア" },
  warp:     { nm: "ワープ",           need: ["aw", "superaw"], label: "AW" },
  mine:     { nm: "地雷",             need: ["ms", "superms", "msM", "supermsM", "msL", "supermsL", "msEL", "supermsEL"], label: "マインスイーパー" },
  block:    { nm: "ブロック",         need: ["ablock"], label: "アンチブロック" },
  lockzone: { nm: "ロックゾーン",     need: ["antilock"], label: "アンチロックゾーン" },
  /* ★ 2026-08-07 新アンチギミック「断絶界」。1回ふれるだけで壊せるようになる */
  ward:     { nm: "断絶界",           need: ["award"], label: "アンチ断絶界" },
  /* ★ 2026-08-05: 超アンチ減速壁は「アンチ減速壁の上位」なので、対応キャラの判定にも入れる。
     ここに書き忘れていたため、超アンチ減速壁だけを持つキャラ（シェリル・フィア・リセラ）が
     減速壁クエストの対応キャラ一覧・自動編成・適性クエストのどこにも出てこなかった。 */
  slowwall: { nm: "減速壁",           need: ["aslow", "superaslow"], label: "アンチ減速壁" },
};
/* オムニアンチで代用できるギミック */
const OMNI_GIMS = new Set(["dw", "warp", "mine", "grav"]);
/* そのクエストに出る「対策できるギミック」のキー一覧（WAVEごとに変わるクエストにも対応） */
function counterKeysOf(stage) {
  const keys = new Set();
  const gims = stage.gimByWave ? stage.gimByWave : [stage.gim || {}];
  const ters = stage.terrainByWave ? stage.terrainByWave : [stage];
  gims.forEach((g) => {
    if (g.dw) keys.add("dw");
    if (g.mine) keys.add("mine");
    if (g.warp) keys.add("warp");
    if (g.lockzone) keys.add("lockzone");
    if (g.slowwall) keys.add("slowwall");
    if (g.ward) keys.add("ward");         /* ★ 2026-08-07 断絶界 */
  });
  ters.forEach((t) => { if ((t.blocks || []).some((b) => !b.pass)) keys.add("block"); });
  const flat = stage.waves.flat ? stage.waves.flat() : [].concat.apply([], stage.waves);
  if (flat.some((d) => d && d.grav)) keys.add("grav");
  return orderAntiKeys([...keys]);        /* ★ 表示順は ANTI_ORDER にそろえる */
}

/* ══════════ C: ガチャ（プール・排出率・抽選・キャラ評価） ══════════ */
/* ══════════ ガチャ（セレクトピックアップ式）══════════
   選んだSSR＝5% ／ 他のSSR＝各2.5% ／ 初期キャラ4体＝各10% ／ 残り50%＝ゴールド */
/* ── ガチャは2本立て ──
   ・クロスガチャ（Bシリーズ4体）: XEVAで回す。XEVAガチャのBシリーズと所持・限界突破(最大4)・ポイントを共有
   ・プレミアムセレクトガチャ: 従来どおりジェムで回す（Bシリーズ4体は排出しない） */
/* ★ 2026-08-10 クロスガチャ（Bシリーズ）は廃止。
   4体は<b>上方修正のうえプレミアムセレクトガチャへ移行</b>した（PREMIUM_CHARS に入れてある）。
   ★ この配列は<b>空にせず残す</b>こと。SHARED_CHARS（XEVARION と所持を共有するキャラ）と
     図鑑の絞り込みタグがここを見ているので、消すと共有のしくみごと壊れる。 */
const CROSS_CHARS = ["mion", "kokona", "mao", "arisa"];
const CROSS_GACHA_OFF = true;   // クロスガチャのタブ・ピックアップを出さない
const CROSS_SEASON = { mion: 1, kokona: 2, mao: 3, arisa: 4 };   // XEVAガチャ側のポイントキー b1〜b4 に対応
const PREMIUM_CHARS = ["kaguya", "ema", "cheryl", "sakura", "bernica", "tsubaki", "alicia", "natsuki", "iroha", "shirayuki", "mashiro", "hotaru", "koharu", "yuri", "rinne", "rezelia", "elsia", "karina", "nephia", "setsuna", "selene", "nazuna", "lilia", "revia", "chloe",
  /* ★ v16 新SSR 6体 */
  "sheril", "fia", "lysera", "soleria", "beltia", "astera",
  /* ★ 2026-08-05 新SSR */
  "nemu", "roselia", "shizuka",
  /* ★ 2026-08-06 新SSR（冥花種キラー持ちの3体） */
  "yuria", "altia", "liana",
  /* ★ 2026-08-06 新SSR（全敵ロックオンレーザーのソレア） */
  "solea",
  /* ★ 2026-08-07 新SSR 4体（イオリ・ノエル・ユキノ・レイカ） */
  "iori", "noelle", "yukino", "reika",
  /* ★ 2026-08-08 新SSR 2体（ナナミ・チトセ） */
  "nanami", "chitose",
  /* ★ 2026-08-08 新SSR 4体（カエデ・リノン・ココロ・アンジェ） */
  "kaede", "rinon", "kokoro", "ange",
  /* ★ 2026-08-08c 新SSR 3体（コトネ・ラン・セリス） */
  "kotone", "ran", "ceris",
  /* ★ 2026-08-10 XEVAガチャ移行SSR 6体（ガチャ統合でプレミアムへ合流） */
  "kotomi", "riko", "kaho", "nana", "rea", "rinonx",
  /* ★ 2026-08-10 クロスガチャ廃止にともないBシリーズ4体もプレミアムへ移行（上方修正済み） */
  "mion", "kokona", "mao", "arisa",
  /* ★ 2026-08-11 新SSR 3体（シズク・ユウナギ・イズミ）。
     3体ともオムニアンチ無し・アンチちょうど2種で、属性有利の庭園適正を1つずつ持つ。 */
  "shizuku", "yuunagi", "izumi",
  /* ★ 2026-08-16b No.108 以降のキャラは全員プレミアムセレクトガチャから出る。
     アンナ・ツキノは追加時にここへ入れ忘れていて、実装ずみなのに引けなかった。 */
  "anna", "tsukino",
  "moeka", "suzuha", "violet", "kanata", "touka", "elena", "grace",
  /* ★ 2026-08-18 プレミアム新SSR 8体＋ロキシー（No.119〜127）。
     ★ ここへの追加を忘れると<b>実装ずみなのに引けないキャラ</b>になる（追加時の定番の抜け）。 */
  "artemia", "asuha", "blair", "lilith", "lyra", "satsuki", "sayo", "melty", "roxy",
  /* ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 にともなう<b>入れ替え</b>。
     Ver.1.0（2026-08-20）の5体は、決まりどおりここへ移した
     ＝ ピックアップ・すり抜け・10連の確定枠・フェスのすり抜けに、そのまま乗る。
     （DEBUT_MIGRATE_HOWTO の①） */
  "mirelle", "scarlet", "koyuki", "amelia", "mio",
];
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-26 ★プレミアムセレクト券でえらべる顔ぶれ（ご指定・凍結）
   ------------------------------------------------------------
   ご指定:「券が登場する前までにプレミアムセレクトガチャに実装されていた
           キャラのみ選択でき、中身は更新されません」
   ＝ 券が出た日（2026-08-24）の PREMIUM_CHARS を<b>そのまま書き写した</b>もの。
   ★★ この配列には<b>もう何も足さない</b>こと。
     PREMIUM_CHARS を参照して作ってしまうと、キャラを足すたびに券の中身も
     増えてしまい「更新されません」という約束が破れる。
     手で書いてあるのは<b>わざと</b>です。
   ★ 券の対象から外れた（＝あとから増えた）キャラは、ふつうにガチャで引く形になる。
   ══════════════════════════════════════════════════════════════ */
const SELTICKET_CHARS = [
  "kaguya", "ema", "cheryl", "sakura", "bernica", "tsubaki", "alicia", "natsuki", "iroha", "shirayuki",
  "mashiro", "hotaru", "koharu", "yuri", "rinne", "rezelia", "elsia", "karina", "nephia", "setsuna",
  "selene", "nazuna", "lilia", "revia", "chloe",
  "sheril", "fia", "lysera", "soleria", "beltia", "astera",
  "nemu", "roselia", "shizuka",
  "yuria", "altia", "liana",
  "solea",
  "iori", "noelle", "yukino", "reika",
  "nanami", "chitose",
  "kaede", "rinon", "kokoro", "ange",
  "kotone", "ran", "ceris",
  "kotomi", "riko", "kaho", "nana", "rea", "rinonx",
  "mion", "kokona", "mao", "arisa",
  "shizuku", "yuunagi", "izumi",
  "anna", "tsukino",
  "moeka", "suzuha", "violet", "kanata", "touka", "elena", "grace",
  "artemia", "asuha", "blair", "lilith", "lyra", "satsuki", "sayo", "melty", "roxy",
  "mirelle", "scarlet", "koyuki", "amelia", "mio",
];
/* まだ限界突破MAXでない子だけ（＝券を使う意味がある子だけ）を返す */
function selTicketPool() { return SELTICKET_CHARS.filter((id) => CHARS[id] && !isMaxAwk(id)); }
/* ══ ★ 2026-08-10 ガチャのSR枠 ══
   XEVAガチャから移行したSR 19体を、<b>すべてのガチャ</b>（プレミアム・両フェス）の
   SR枠に加える。ピックアップは無く、SR枠のなかは<b>全員おなじ確率</b>。
   ★ 2026-08-10 初期メンバー4体を廃止したので、SR枠は<b>この19体だけ</b>。 */
const STAR4_MIGRATED = ["hina", "runa", "noa", "haruka", "shiona", "ede", "yuina", "ririka", "serina", "akane",
  "airi", "eruna", "kotoha", "mika", "mirea", "miyu", "nene", "rei", "rusia"];
const STAR4_POOL = STAR4_MIGRATED.slice();
/* ★ 2026-08-10 はじめて遊ぶときに配る4体。廃止した初期SRのかわりに、
   移行SRの先頭4体（ヒナ・ルナ・ノア・ハルカ）を配る。 */
const STARTER_IDS = ["hina", "runa", "noa", "haruka"];
/* ══ ★ 2026-08-10 ガチャの中身を刷新（MagiBurst専用コイン＝ゴールドの廃止） ══
   これまでは残り約50%が<b>ゴールド</b>だった。ところがゴールドは
   MagiBurst の中だけで使う通貨なので、
     ・ガチャを回した手ごたえが「お金が増えただけ」で終わる
     ・XEVA でいつでも買えるようにすれば、そもそもガチャで配る必要がない
   の2点から、ガチャからは外した（<b>ゴールドは Shop で XEVA から安く買える</b>）。
   かわりに<b>育成で本当に欲しくなるもの</b>を入れる。
     ・SR枠を 40% → 55% に拡大（SRが23体に増えたので、集める楽しみが出る）
     ・叡智の果実（レベルが3つ上がる）
     ・超越の書（レベル上限を60へ）／英傑の証（ルーン枠を3つへ）＝どちらもレアな当たり
     ・🎫 フェスチケット
   SSRの合計10%は<b>変えていない</b>。 */
const G_ITEM_TABLE = [
  { p: 0.20, item: "wisdom", n: 1, nm: "叡智の果実" },
  { p: 0.08, item: "wisdom", n: 3, nm: "叡智の果実" },
  { p: 0.04, ticket: 1, nm: "フェスチケット" },   /* フェスガチャ専用（従来どおり） */
  { p: 0.02, item: "trans", n: 1, nm: "超越の書" },
  { p: 0.01, item: "hero", n: 1, nm: "英傑の証" },
];
/* 中身（キャラ以外）を1つ引く。合計が items の p の総和に満たないぶんは呼び出し側で調整する
   ★ 2026-08-20 table を渡すとその表で引く（GRAND DEBUT は中身がちがうので D_ITEM_TABLE を渡す）。
     渡さなければ従来どおり G_ITEM_TABLE。 */
function rollGachaItem(r, table) {
  for (const it of (table || G_ITEM_TABLE)) {
    if (r < it.p) {
      if (it.ticket) { DB.fesTicket = fesTickets() + it.ticket; return { type: "ticket", n: it.ticket }; }
      /* ★ 2026-08-20 🎫ガチャチケット（どのガチャでも使える券）。フェス券とは別の残高。 */
      if (it.gticket) { DB.gTicket = gachaTickets() + it.gticket; return { type: "gticket", n: it.gticket }; }
      DB.items[it.item] = (DB.items[it.item] || 0) + it.n;
      return { type: "item", item: it.item, n: it.n };
    }
    r -= it.p;
  }
  /* 端数は叡智の果実に寄せる（何も出ない枠を作らない） */
  DB.items.wisdom = (DB.items.wisdom || 0) + 1;
  return { type: "item", item: "wisdom", n: 1 };
}
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-20 GRAND DEBUT GACHA（新キャラ専用ガチャ）
   ------------------------------------------------------------
   ご指定のしくみ:
     ・<b>新キャラはこのガチャにだけ入り、このガチャでしか引けない</b>。
       フェスやプレミアムの<b>すり抜け・10連の確定枠にも出ない</b>。
       ＝ DEBUT_CHARS を PREMIUM_CHARS にも FESTS[].chars にも入れないこと。
       fesRollOnce / fesSurePool / rollGuaranteedS5 はどれも gachaPool()（＝PREMIUM_CHARS）
       しか見ないので、ここに入れないだけで自動的に混ざらない。
     ・<b>次の更新で新しいキャラが GRAND DEBUT に入ったら</b>、それまでの
       GRAND DEBUT のキャラは <b>PREMIUM_CHARS へ移す</b>（＝現行キャラと同じ扱いになる）。
       → 移すときの手順は下の DEBUT_MIGRATE_HOWTO を見ること。
     ・<b>フェスチケットは使えない</b>（payGacha を fes=false で呼ぶ＝フェス券に手を付けない）。
       🎫ガチャチケットは使える（「どのガチャでも使える」券なので）。
     ・SSR 10% と SR は<b>フェスと同じしくみ</b>。中身（アイテム枠）だけ GRAND DEBUT 専用。

   ★★ バージョン表記
     キャラの入れ替えが分かるように、更新のたびに <b>GACHA_VER</b> を上げる。
     1.0 → 2.0 → 3.0 …（キャラを入れ替えた回数＝版）。日付は GACHA_VER_DATE。
     画面（バナーの帯・ガチャえらび・提供割合）はすべてこの2つだけを見る。
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-26 GRAND DEBUT は「版ごとに10日間」（ご指定）
   ------------------------------------------------------------
   これまで:「次の版が出たら、前の版のキャラは即プレミアムへ移す」
   これから:
     ・ある版は<b>公開日から10日間</b>だけ GRAND DEBUT として並ぶ。
     ・10日たったら、その版のキャラは<b>自動でプレミアムセレクトガチャへ移る</b>
       （手で PREMIUM_CHARS に書き足さなくてよい＝移し忘れが起きない）。
     ・前の版の10日以内に新しい版を出したら、
       <b>GRAND DEBUT が2本（版ちがい）同時に並ぶ</b>。
     ・掲載中の版が1つも無いあいだは、GRAND DEBUT は<b>スタンバイ</b>
       （一覧には出るが引けない）。次の版が出たらまた開く。

   ★★ 版を足すときの手順（DEBUT_MIGRATE_HOWTO の新版）
     ① この配列の<b>先頭</b>に { ver, date, chars } を1行足すだけ。
        PREMIUM_CHARS はいっさい触らない（10日たてば自動で移る）。
     ② mb-newchars.js に告知を足す（mode は "debut" のままでよい）。
     ③ xeva.js の MB_CHAR_MASTER / MB_STAR5、CHAR_IDS、sw.js の画像も忘れずに。

   ★ movedAt … その日にもう手でプレミアムへ移してある版に付ける印。
     Ver.1.0 は 2026-08-24 の更新で（当時の決まりに従って）すでに移し、
     お知らせにもそう書いてある。10日ルールをさかのぼって当てると
     「移ったはずのキャラがまた GRAND DEBUT に戻る」ので、ここで止める。
   ══════════════════════════════════════════════════════════════ */
const DEBUT_DAYS = 10;                   // 1つの版が GRAND DEBUT に並ぶ日数
const DEBUT_VERSIONS = [
  /* ★★ 2026-08-26b Ver.4.0。Ver.2.0（08-24）・Ver.3.0（08-26）の10日以内なので、
     しばらく<b>3本</b>並ぶ（無料の単発は版ごとに1回ずつ＝1日3回ぶん） */
  { ver: "4.0", date: "2026-08-26", chars: ["seina", "shiduki", "sayuki", "sara", "sakuya"] },
  /* ★★ 2026-08-26 Ver.3.0。Ver.2.0（08-24）の10日以内なので、しばらく<b>2本</b>並ぶ */
  { ver: "3.0", date: "2026-08-26", chars: ["karin", "mirei", "yuuka", "miyabi", "sumire"] },
  { ver: "2.0", date: "2026-08-24", chars: ["guren", "yuuna", "momo", "chihaya", "yui"] },
  { ver: "1.0", date: "2026-08-20", chars: ["mirelle", "scarlet", "koyuki", "amelia", "mio"],
    movedAt: "2026-08-24" },
];
/* きょう（ローカル日付。toISOString は UTC なので日本は9時間おくれる） */
function debutToday() { return new Date().toLocaleDateString("sv-SE"); }
/* 日付文字列に n 日足す */
function debutAddDays(ymd, n) {
  const d = new Date(String(ymd) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
}
/* その版の掲載が終わる日（この日からプレミアム扱い） */
function debutEndOf(v) { return v.movedAt || debutAddDays(v.date, DEBUT_DAYS); }
/* いま掲載中か（公開日以上・終了日より前） */
function debutLive(v) { const t = debutToday(); return t >= v.date && t < debutEndOf(v); }
/* もう終わった版か（＝プレミアムへ移った） */
function debutRetired(v) { return debutToday() >= debutEndOf(v); }
/* 掲載中の版（新しい順） */
function debutLiveVers() { return DEBUT_VERSIONS.filter(debutLive); }
/* 掲載終了まであと何日か（0なら今日で終わり） */
function debutDaysLeft(v) {
  const a = new Date(debutToday() + "T00:00:00"), b = new Date(debutEndOf(v) + "T00:00:00");
  return Math.max(0, Math.round((b - a) / 86400000));
}
/* 全ての版のキャラ（図鑑・互換用） */
const DEBUT_ALL_CHARS = DEBUT_VERSIONS.reduce((a, v) => a.concat(v.chars), []);
/* ★ いちばん新しい版。バナーの帯・お知らせ・既定の表示はこれを見る */
function debutNewestVer() { return debutLiveVers()[0] || DEBUT_VERSIONS[0]; }
const GACHA_VER = DEBUT_VERSIONS[0].ver;          // ★ 互換: いちばん新しい版
const GACHA_VER_DATE = DEBUT_VERSIONS[0].date;    // ★ 互換: その版の公開日
function gachaVerText(v) { return "Ver." + ((v && v.ver) || GACHA_VER); }
const DEBUT_NM = "GRAND DEBUT GACHA";
/* ★ 2026-08-20c ご指定により、ガチャの画面では<b>プレミアムも英語表記</b>にそろえる
   （GRAND DEBUT GACHA と並べたときに、片方だけ日本語だとちぐはぐに見えるため）。
   ★ 画面に出す名前はここ1か所。過去のお知らせ・メールの本文は当時の記録なので変えない。 */
const PREMIUM_NM = "PREMIUM SELECT GACHA";
const DEBUT_C = "#d4a017";
const DEBUT_BANNER = "../img/bn_debut_s.webp";
/* ★★ 2026-08-26 いま GRAND DEBUT で引ける顔ぶれ（＝掲載中の版ぜんぶの合算）。
   ★ 中身は debutRefresh() が入れる。<b>配列そのものは作り直さない</b>
     （ほかの場所が同じ配列を参照しているので、入れ替えると食いちがう）。 */
const DEBUT_CHARS = [];
/* 掲載中／終了ぶんを DEBUT_CHARS と PREMIUM_CHARS に反映する。
   ★ 日付が変わっただけで顔ぶれが動くので、ガチャを描くたびに呼ぶ（initGachaMode / paintGacha）。 */
function debutRefresh() {
  const ids = [];
  /* ★ CHARS に居ないidは入れない（版だけ先に書いてキャラをまだ足していない、という取りちがえで
     画面ごと落ちるのを防ぐ）。 */
  debutLiveVers().forEach((v) => v.chars.forEach((id) => {
    if (CHARS[id] && ids.indexOf(id) < 0) ids.push(id);
  }));
  DEBUT_CHARS.length = 0;
  Array.prototype.push.apply(DEBUT_CHARS, ids);
  DEBUT_VERSIONS.forEach((v) => {
    v.chars.forEach((id) => {
      if (!CHARS[id]) return;
      const at = PREMIUM_CHARS.indexOf(id);
      if (debutRetired(v)) {
        /* 掲載が終わった版 → プレミアムへ（重複させない） */
        if (at < 0) PREMIUM_CHARS.push(id);
      } else {
        /* まだ掲載中／これから公開の版 → プレミアムには居させない
           （フェス・プレミアムのすり抜けや10連の確定枠に混ざってしまうため） */
        if (at >= 0) PREMIUM_CHARS.splice(at, 1);
      }
    });
  });
}
debutRefresh();
/* ══ 版ごとのガチャ（mode）══
   ・"debut"        … いちばん新しい掲載中の版（古いリンク・#debut はこれに当たる）
   ・"debut:2.0" …  版を名ざしで開く（2本並んでいるときに使う） */
function isDebutMode(m) { m = String(m || ""); return m === "debut" || m.indexOf("debut:") === 0; }
function debutModeKey(v) { return "debut:" + v.ver; }
function debutVerOfMode(m) {
  if (!isDebutMode(m)) return null;
  const s = String(m);
  if (s === "debut") return debutLiveVers()[0] || null;
  const key = s.slice(6);
  const hit = DEBUT_VERSIONS.find((v) => v.ver === key);
  if (hit && debutLive(hit)) return hit;
  return debutLiveVers()[0] || null;      /* 掲載が終わった版を開こうとしたら、いまの版へ */
}
/* スタンバイ（掲載中の版が1つも無い）か */
function debutStandby() { return debutLiveVers().length === 0; }
function debutCharsOfMode(m) { const v = debutVerOfMode(m); return v ? v.chars.filter((id) => CHARS[id]) : []; }
function debutPoolOf(m) { return debutCharsOfMode(m).filter((id) => CHARS[id] && !isMaxAwk(id)); }
function debutEachRateOf(m) { const n = debutPoolOf(m).length; return n ? DEBUT_S5_TOTAL / n : 0; }
/* ══ ★★ 2026-08-25 GRAND DEBUT の排出率（ご指定）══
   限定SSR（この版の新キャラ）の合計排出率を <b>10% → 15%</b> に引き上げた。
   ★ 増やした 5% は<b>育成アイテムの枠</b>から取る。SR 50% と
     PREMIUM のSSR 5%（すり抜け）は<b>そのまま</b>。
       限定SSR 15% ＋ プレミアムSSR 5% ＋ SR 50% ＋ 育成アイテム 30% ＝ 100%
   ★ フェスの S5_TOTAL（10%）とは<b>別の値</b>になったので、
     GRAND DEBUT の計算では必ずこの定数を使うこと（S5_TOTAL と書くと 10% に戻る）。 */
const DEBUT_S5_TOTAL = 0.15;
const DEBUT_ITEM_P = 0.30;      // 育成アイテム枠（DEBUT_ITEM_TABLE の合計とそろえる）
/* ══ ★★ 2026-08-25 1日1回だけ<b>単発を無料</b>で引ける（ご指定）══
   ・無料になるのは<b>1回まわす</b>のときだけ。5連・10連はこれまでどおり有料。
   ・🎫チケットも💎ジェムも<b>いっさい減らない</b>（payGacha を通さない）。
   ・使ったかどうかは DB.debutFree（"YYYY-MM-DD"）ひとつで覚える。
     magiburst_v1 の中なので、そのまま MagiBurst 専用 Firebase で同期される。
   ★ 日付は<b>ローカル日付</b>で見る（toISOString は UTC なので日本は9時間おくれる）。
   ★ freshDB には入れていない。書かれていなければ「まだ使っていない」＝無料が使える。 */
/* ★★ 2026-08-26 GRAND DEBUT が2本並ぶことがあるので、無料の単発は<b>版ごと</b>に持つ。
   DB.debutFree は { "2.0":"2026-08-26", "3.0":"" } の形。
   ★ 古いセーブは "2026-08-25" のような<b>文字列1本</b>なので、
     いちばん新しい掲載中の版のぶんとして引きつぐ（引き継がないと今日ぶんが復活してしまう）。 */
function debutFreeMap() {
  if (!DB.debutFree || typeof DB.debutFree !== "object") {
    const old = typeof DB.debutFree === "string" ? DB.debutFree : "";
    DB.debutFree = {};
    const v = debutLiveVers()[0];
    if (old && v) DB.debutFree[v.ver] = old;
  }
  return DB.debutFree;
}
function debutFreeLeft(m) {
  const v = debutVerOfMode(m || "debut");
  if (!v) return 0;
  return debutFreeMap()[v.ver] === debutToday() ? 0 : 1;
}
function debutFreeUse(m) {
  const v = debutVerOfMode(m || "debut");
  if (!v) return;
  debutFreeMap()[v.ver] = debutToday(); save();
}
/* ══ ★★ 2026-08-26b 版ごとに<b>初回の10連だけ無料</b>（ご指定）══
   ・無料になるのは<b>10連</b>のときだけ。単発・5連はこれまでどおり。
   ・🎫チケットも💎ジェムも<b>いっさい減らない</b>（payGacha を通さない）。
   ・<b>10連なので最後の1枠は SSR 確定</b>のまま。
   ★ 1日に1回戻る単発（debutFree）とは<b>別の台帳</b>。
     こちらは日付ではなく<b>使ったかどうか</b>だけを覚える（一度使ったらその版ではもう戻らない）。
     DB.debutFree10 は { "4.0": true, "3.0": true } の形。
   ★ freshDB には入れていない。書かれていなければ「まだ使っていない」＝無料が使える。
   ★ ポータル（xevarion-home.js の xhDebutFree10Left）に<b>同じ判定の写し</b>がある。
     ここを直したら向こうも直すこと。 */
function debutFree10Map() {
  if (!DB.debutFree10 || typeof DB.debutFree10 !== "object") DB.debutFree10 = {};
  return DB.debutFree10;
}
function debutFree10Left(m) {
  const v = debutVerOfMode(m || "debut");
  if (!v) return 0;
  return debutFree10Map()[v.ver] ? 0 : 1;
}
function debutFree10Use(m) {
  const v = debutVerOfMode(m || "debut");
  if (!v) return;
  debutFree10Map()[v.ver] = true; save();
}
/* ★ ポータル（下バーの「無料」の印）が使う: どれか1本でも無料が残っているか
   （単発・10連の<b>どちらか</b>が残っていれば印を出す） */
function debutAnyFree() {
  return debutLiveVers().some((v) =>
    debutFreeMap()[v.ver] !== debutToday() || !debutFree10Map()[v.ver]);
}
/* 次に無料がもどるまで（切りかわりは<b>あすの0時</b>） */
function debutFreeNextText() {
  const d = new Date(); d.setHours(24, 0, 0, 0);
  const m = Math.max(0, Math.round((d - Date.now()) / 60000));
  return m >= 60 ? Math.floor(m / 60) + "時間" + (m % 60 ? (m % 60) + "分" : "") : m + "分";
}
/* 排出対象（限界突破MAXは除外し、そのぶんを残りで分け合う＝フェスと同じ考えかた） */
function debutPool() { return DEBUT_CHARS.filter((id) => !isMaxAwk(id)); }
function debutEachRate() { const n = debutPool().length; return n ? DEBUT_S5_TOTAL / n : 0; }
function debutBannerOf() { return mbImgPath(DEBUT_BANNER); }
/* ══ GRAND DEBUT の「キャラ以外の中身」（ご指定で差し替え）══
   ・使えない🎫フェスチケットは入れず、<b>🎫ガチャチケット</b>に置き換える
   ・育成の当たり（📕超越の書・🎖️英傑の証）を厚くし、叡智の果実は<b>3個・5個束</b>を主体にする
   ・🪭九天の玉簡・📘クロスの書を<b>極低確率</b>で入れる（ご指定）
   ★ 合計は G_ITEM_TABLE と同じ <b>0.35</b> ぴったりにすること（SSR 10%＋SR 55%＋35%＝100%）。 */
const D_ITEM_TABLE = [
  { p: 0.155, item: "wisdom", n: 3, nm: "叡智の果実" },
  { p: 0.070, item: "wisdom", n: 5, nm: "叡智の果実" },
  { p: 0.055, gticket: 1, nm: "ガチャチケット" },
  { p: 0.040, item: "trans", n: 1, nm: "超越の書" },
  { p: 0.023, item: "hero", n: 1, nm: "英傑の証" },
  { p: 0.004, item: "jade", n: 1, nm: "九天の玉簡" },
  { p: 0.003, item: "crossbook", n: 1, nm: "クロスの書" },
];
/* ══ ★★ 2026-08-25 GRAND DEBUT 専用の育成アイテム表（合計 <b>0.30</b>）══
   限定SSR を 10% → 15% に上げたぶん、アイテム枠が 35% → 30% になった。
   ★ 減らすのは<b>いちばん軽い「叡智の果実3個」だけ</b>（0.155 → 0.105）。
     🎫ガチャチケット・📕超越の書・🎖️英傑の証・🪭九天の玉簡・📘クロスの書は
     <b>1つも減らしていない</b>＝当たりの厚さはそのまま。
   ★ D_ITEM_TABLE（合計 0.35）は<b>フェス fes5 が使い続ける</b>ので、そちらは触らないこと。
     こちらを 0.30 にしてしまうと fes5 の合計が 95% になって端数が出る。 */
const DEBUT_ITEM_TABLE = [
  { p: 0.105, item: "wisdom", n: 3, nm: "叡智の果実" },
  { p: 0.070, item: "wisdom", n: 5, nm: "叡智の果実" },
  { p: 0.055, gticket: 1, nm: "ガチャチケット" },
  { p: 0.040, item: "trans", n: 1, nm: "超越の書" },
  { p: 0.023, item: "hero", n: 1, nm: "英傑の証" },
  { p: 0.004, item: "jade", n: 1, nm: "九天の玉簡" },
  { p: 0.003, item: "crossbook", n: 1, nm: "クロスの書" },
];
/* ══════════════════════════════════════════════════════════════
   ★ フェスガチャ（v14 Nocturne Bloom Fest／v15 Luminous Summer Fest）
   ・プレミアムと同じ仕組み（ジェムで回す・10連でSSR確定）だが、キャラは完全に別枠
   ・排出は「そのフェスの限定SSR」＋「初期キャラ4体」だけ
   ・ピックアップなし＝SSRは全員おなじ確率（SSR合計10%をそのフェスの限定SSRで等分）
   ・SR（初期キャラ4体）は各10%＝合計40%、残り50%はゴールド（プレミアムと同じ配分）
   ★ v15: フェスが2本立てになったので、ここから下は「フェスの種類（key）」で共通化してある。
     フェスを増やすときは FESTS に1行足して、DOM 側にタブ＋セクションを1つ足すだけでよい。
     🎫フェスチケットは<b>どのフェスでも共通</b>で使える（配布・所持数は1本化）。
     2026-08-13 に新設した🎫<b>ガチャチケット</b>は別枠で、プレミアムでも使える。
   ══════════════════════════════════════════════════════════════ */
const FESTS = {
  /* key ＝ gachaMode の値。id は DOM の接尾辞（#gFes / #gFes2 …） */
  fes: {
    key: "fes", sfx: "", nm: "Nocturne Bloom Fest", tab: "Nocturne<br>Bloom Fest",
    banner: "../img/bn_fes_s.webp", c: "#8e4fe0",
    chars: ["fiona", "milfy", "mabel", "abyss", "arche"],
    lead: "フェス限定SSR <b>5体</b>（合計10%・ピックアップなし）に加えて、<b>" + PREMIUM_NM + "のSSRも合計5%で排出</b>",
    sub: "フェス限定SSR <b>5体</b>（合計10%・ピックアップなし）＋ <b>プレミアムSSRも合計5%で排出</b>。初期キャラも出ます",
    note: "全員が<b>サブリンク「アブソリュートレイ10」</b>を持つ、フェス限定の最上位キャラクターです。",
  },
  fes2: {
    key: "fes2", sfx: "2", nm: "Luminous Summer Fest", tab: "Luminous<br>Summer Fest",
    banner: "../img/bn_fes2_s.webp", c: "#1d8fd8", leadCls: "sum",
    /* ★ 2026-08-11 シェリーα・ココナαを追加して4体に（バナーも新しい4人の絵に差し替え済み） */
    chars: ["kaguyaalpha", "mionalpha", "cherylalpha", "kokonaalpha"],
    lead: "夏の限定SSR <b>4体</b>（各2.5%・ピックアップなし）に加えて、<b>" + PREMIUM_NM + "のSSRも合計5%で排出</b>",
    sub: "夏の限定SSR <b>4体</b>（各2.5%・ピックアップなし）＋ <b>プレミアムSSRも合計5%で排出</b>。初期キャラも出ます",
    note: "<b>カグヤ・ミオン・シェリー・ココナ</b>のフルバーストを、そのままの手ざわりで<b>倍率だけ大幅に引き上げた</b>夏の限定SSRです。"
      + "<b>シェリーαとココナαはクロススキル</b>も持ちます。",
  },
  /* ★ 2026-08-07 Phantom Legend Fest（開催は 2026-08-10 0:00 から）。
     openAt を書いておくと、その日時までは「開催前」＝キャラは ? で伏せ、回すこともできない。 */
  fes3: {
    key: "fes3", sfx: "3", nm: "Phantom Legend Fest", tab: "Phantom<br>Legend Fest",
    banner: FES3_BANNER, bannerSoon: FES3_BANNER_SOON, c: "#8e4fe0", leadCls: "phantom", btnCls: "gf3",
    openAt: FES3_OPEN,
    chars: ["yaju"],
    lead: "伝説の限定SSR <b>1体</b>（10%・ピックアップなし）に加えて、<b>" + PREMIUM_NM + "のSSRも合計5%で排出</b>",
    sub: "伝説の限定SSR <b>1体</b>（10%・ピックアップなし）＋ <b>プレミアムSSRも合計5%で排出</b>。初期キャラも出ます",
    note: "MagiBurst で初めて<b>クロススキル</b>を持つSSRです。編成条件を満たすとアビリティが増えます。",
  },
};
/* ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）。
   ・水着の夏フェス。限定SSR 6体（合計10%・ピックアップなし）。
   ・仕組みはほかのフェスとまったく同じなので、足すのはこの1エントリだけでよい
     （タブ・セクション・提供割合・10連の確定枠は FESTS から自動で作られる）。 */
FESTS.fes4 = {
  key: "fes4", sfx: "4", nm: "蒼夏祭", tab: "蒼夏祭",
  banner: "../img/bn_fes4_s.webp", c: "#1567c8", leadCls: "sum",
  /* ★ 2026-08-12 セイラを追加して7体に */
  chars: ["fuka", "tsumugi", "suzuka", "karem", "mayu", "chizuru", "seira"],
  lead: "蒼夏祭の限定SSR <b>7体</b>（合計10%・ピックアップなし）に加えて、<b>" + PREMIUM_NM + "のSSRも合計5%で排出</b>",
  sub: "蒼夏祭の限定SSR <b>7体</b>（合計10%・ピックアップなし）＋ <b>プレミアムSSRも合計5%で排出</b>。初期キャラも出ます",
  note: "<b>フウカ・ツムギ・スズカ・カレム・マユ・チヅル・セイラ</b>の7体が登場。"
    + "<b>カレム・マユ・チヅル・セイラはクロススキル</b>を持ち、"
    + "<b>セイラ</b>は<b>MagiBurst 史上最高火力</b>のフルバースト（壁すり抜け＋乱打"
    + SEIRA_BARRAGE_N + "連＝合計×" + (SEIRA_BARRAGE_N * SEIRA_BARRAGE_PER).toFixed(1)
    + "）と新サブリンク<b>ピアスシーカー" + PSEEKER20_N + "</b>を持つ蒼夏祭の大トリです。",
};
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-22 Starlight Academy Fest（星の学園フェス）
   ------------------------------------------------------------
   ・限定SSR 5体（オトハ・サヤカ・サユリ・アカリ・ヒナタ）。
   ・<b>キャラの排出はノクターンブルームフェスなどと同じ</b>
     （限定SSR 合計10%を等分・ピックアップなし／プレミアムSSRも合計5%／SR 50%）。
   ・<b>アイテム枠の中身と確率だけ GRAND DEBUT GACHA と同じ</b>にする（ご指定）＝ D_ITEM_TABLE。
     ふつうのフェスは G_ITEM_TABLE（🎫フェス券・叡智の果実1個 が主体）だが、
     こちらは 叡智の果実3個/5個束・📕超越の書・🎖️英傑の証 が厚く、
     🪭九天の玉簡・📘クロスの書 が極低確率で出る。
   ★ itemTable を書いたフェスだけ、その表で引く（fesRollOnce が見る）。
     書かなければ従来どおり G_ITEM_TABLE なので、既存のフェスは1つも変わらない。
   ★ 🎫<b>フェスチケットは使える</b>（これはフェスガチャなので）。
     GRAND DEBUT はフェス券が使えなかったが、それは「フェスではないから」であって
     アイテム枠の話とは別もの。
   ══════════════════════════════════════════════════════════════ */
FESTS.fes5 = {
  key: "fes5", sfx: "5", nm: "Starlight Academy Fest", tab: "Starlight<br>Academy Fest",
  banner: "../img/bn_fes5_s.webp", c: "#f0b429", leadCls: "star",
  chars: ["otoha", "sayaka", "sayuri", "akari", "hinata"],
  itemTable: D_ITEM_TABLE,
  lead: "星の学園の限定SSR <b>5体</b>（合計10%・ピックアップなし）に加えて、<b>" + PREMIUM_NM + "のSSRも合計5%で排出</b>",
  sub: "星の学園の限定SSR <b>5体</b>（合計10%・ピックアップなし）＋ <b>プレミアムSSRも合計5%で排出</b>。"
    + "キャラ以外の中身は <b>GRAND DEBUT GACHA と同じ</b>（叡智の果実3個・5個束／📕超越の書／🎖️英傑の証 が厚め）",
  note: "<b>オトハ・サヤカ・サユリ・アカリ・ヒナタ</b>の5体が登場。"
    + "全員が<b>アンチギミックをちょうど2種</b>持ち、その2種が"
    + "<b>自分が有利属性になる🏯蓬莱の九重のクエストの必要アンチとぴったり一致</b>します"
    + "（第三重／第六重／第九重／第二重／第五重）。"
    + "さらに全員が<b>蓬莱族キラーL</b>と<b>クロススキル</b>、"
    + "そして共通サブリンク<b>スターライト・ヴェール</b>を持つ、蓬莱攻略のためのフェスです。",
};
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-25 Starlight Academy Fest 2（星の学園フェス 2期生）
   ------------------------------------------------------------
   ・限定SSR 5体（スズネ・ミナモ・カレン・トモエ・ヒマリ）。
   ・<b>新キャラ以外の排出は Starlight Academy Fest（fes5）とまったく同じ</b>（ご指定）＝
     限定SSR 合計10%を等分・ピックアップなし／プレミアムSSRも合計5%／SR 50%／
     アイテム枠は <b>D_ITEM_TABLE</b>（GRAND DEBUT GACHA と同じ中身・合計0.35）。
   ★ itemTable を書いたフェスだけ、その表で引く（fesRollOnce と gacha-ui の rateItemRows の
     <b>両方</b>に渡ること）。片方だけだと「引いて出るもの」と「提供割合の表」が食いちがう。
   ★ 🎫フェスチケットは使える（これはフェスガチャなので）。
   ══════════════════════════════════════════════════════════════ */
FESTS.fes6 = {
  key: "fes6", sfx: "6", nm: "Starlight Academy Fest 2", tab: "Starlight<br>Academy Fest 2",
  banner: "../img/bn_fes6_s.webp", c: "#7cc4ff", leadCls: "star",
  chars: ["suzune", "minamo", "karen", "tomoe", "himari"],
  itemTable: D_ITEM_TABLE,
  lead: "星の学園 2期生の限定SSR <b>5体</b>（合計10%・ピックアップなし）に加えて、<b>" + PREMIUM_NM + "のSSRも合計5%で排出</b>",
  sub: "星の学園 2期生の限定SSR <b>5体</b>（合計10%・ピックアップなし）＋ <b>プレミアムSSRも合計5%で排出</b>。"
    + "キャラ以外の中身は <b>Starlight Academy Fest と同じ</b>（叡智の果実3個・5個束／📕超越の書／🎖️英傑の証 が厚め）",
  note: "<b>スズネ・ミナモ・カレン・トモエ・ヒマリ</b>の5体が登場。"
    + "全員が<b>アンチギミックをちょうど2種</b>持ち、その2種が"
    + "<b>自分が有利属性になる🏯蓬莱の九重のクエストの必要アンチとぴったり一致</b>します。"
    + "担当は<b>これまで適性キャラが少なかったクエストを優先</b>して決めてあり、"
    + "<b>ミナモ＝第一重</b>（適性1体だけだったクエスト）／<b>トモエ＝第七重</b>（2体）／"
    + "<b>カレン＝第九重</b>／<b>スズネ＝第三重</b>／<b>ヒマリ＝第五重</b> です。"
    + "さらに全員が<b>蓬莱族キラーL</b>と<b>属性キラーEL</b>、<b>クロススキル</b>、"
    + "そして共通サブリンク<b>オーロラ・カーテン</b>を持ちます。"
    + "リンクスキルは5体とも<b>新設</b>で、<b>連鎖する炎</b>／<b>行って帰る輪刃</b>／"
    + "<b>敵を引き寄せる重力球</b>／<b>時間差で芽吹く種</b>／<b>敵どうしを結ぶ星座</b>——"
    + "どれもこれまでに無い挙動です。",
};
const FES_KEYS = Object.keys(FESTS);
function fesDef(key) { return FESTS[key] || FESTS.fes; }
function isFesMode(m) { return !!FESTS[m]; }
/* ══════════ 開催前のフェス（★ 2026-08-07） ══════════
   FESTS に openAt: "2026-08-10T00:00" を書いておくと、その日時までは
   ・ガチャ一覧に「開催前」と出る
   ・バナーは見えるが、キャラは ? でぼかす／回すボタンは押せない
   という状態になる。日付をまたいだ瞬間から、なにもしなくても解禁される。
   ★ 日付の比較はローカル時刻で行う（toISOString は UTC なので日本は9時間ずれる）。 */
function fesLocked(key) { return beforeOpen(fesDef(key).openAt); }
function fesOpenText(f) { return openTimeText(f && f.openAt); }
/* ★ 2026-08-07: 開催前は bannerSoon（人物をシルエットに落とした差し替え版）を使う。
   通常のバナーには顔が大きく写っているので、そのまま出すと伏せている意味がなくなる。 */
/* ★ 2026-08-10 バナーのパスはページごとに変わる（MagiBurst は "../img/"、ポータルは "img/"）。
   定義には "../img/…" と書いてあるので、ここで IMGD に置き換えてから返す。 */
function mbImgPath(p) { return String(p || "").replace(/^\.\.\/img\//, GIMGD); }
function fesBannerOf(key) { const f = fesDef(key); return mbImgPath((fesLocked(key) && f.bannerSoon) || f.banner); }
/* そのキャラが属するフェス（fesKey 未指定のキャラは v14 の Nocturne Bloom Fest 扱い） */
const FESKEY_MAP = { luminous: "fes2", phantom: "fes3", aoka: "fes4", starlight: "fes5", starlight2: "fes6" };
function fesKeyOf(id) { const c = CHARS[id]; return c && c.fes ? (FESKEY_MAP[c.fesKey] || "fes") : null; }
function fesNameOf(id) { const k = fesKeyOf(id); return k ? fesDef(k).nm : ""; }
const FES_ALL_CHARS = FES_KEYS.reduce((a, k) => a.concat(FESTS[k].chars), []);
/* ★ 2026-08-10 Bシリーズはプレミアムに合流したので、二重に足さない */
/* ★ 2026-08-26 GRAND DEBUT は<b>全ての版</b>を入れる（掲載が終わった版のキャラも図鑑には要る）。
   PREMIUM_CHARS 側にも入っているので、重複はここで取りのぞく。 */
const GACHA_CHARS = (function () {
  const seen = new Set(), out = [];
  PREMIUM_CHARS.concat(FES_ALL_CHARS, DEBUT_ALL_CHARS).forEach((id) => {
    if (seen.has(id) || !CHARS[id]) return; seen.add(id); out.push(id);
  });
  return out;
})();
/* フェスガチャの排出対象（限界突破MAXは除外して、そのぶん他のSSRに配分する） */
function fesPool(key) { return fesDef(key).chars.filter((id) => !isMaxAwk(id)); }
function fesEachRate(key) { const n = fesPool(key).length; return n ? S5_TOTAL / n : 0; }
/* ══════════ 🎫チケット（2種類） ══════════
   ★ <b>フェスチケット</b>（DB.fesTicket / xeva_fticket_v1）
       従来からあるもの。<b>フェスガチャ専用</b>（どのフェスでも使える）。
   ★ <b>ガチャチケット</b>（DB.gTicket / xeva_gticket_v1）… 2026-08-13 新設
       <b>プレミアムでも各フェスでも</b>使える。券面は色ちがい（青金）。
   どちらも 1枚＝1回ぶん（ジェム5個ぶん）。

   ★ 消費の順番は <b>フェスチケット → ガチャチケット → 💎ジェム</b>。
     専用のほう（フェス）から先に使わないと、フェスでしか使えないチケットが
     手元に残り続けてしまう。プレミアムではフェスチケットは使えないので
     「ガチャチケット → ジェム」の2段。

   ★ 残高の置き場所はどちらも XEVARION 共通ウォレット。
     DB.fesTicket / DB.gTicket はそこへの橋渡し（アクセサ）なので、
     読み書きの書き方はこれまでどおりでよい。 */
const FES_TICKET_COST = 1;   // 1回につき1枚
const GACHA_TICKET_COST = 1;
const GACHA_GEM_COST = 5;    // 1回ぶんのジェム
function fesTickets() { return Math.max(0, DB.fesTicket | 0); }
function gachaTickets() { return Math.max(0, DB.gTicket | 0); }
/* フェスガチャのチケット券面（自作SVG）。夜に咲く花＝Nocturne Bloom をモチーフにした夜色のチケット */
function fesTicketSVG(px) {
  const s = px || 30, w = "width:" + (s * 1.55) + "px;height:" + s + "px;display:block";
  return `<svg viewBox="0 0 62 40" style="${w}" aria-hidden="true">
    <defs>
      <linearGradient id="ftg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2b1b4d"/><stop offset=".5" stop-color="#5b2a8c"/><stop offset="1" stop-color="#1a1030"/>
      </linearGradient>
      <linearGradient id="ftp" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff8ab5"/><stop offset="1" stop-color="#c86bff"/>
      </linearGradient>
    </defs>
    <path d="M3 6h56v9a5 5 0 000 10v9H3v-9a5 5 0 000-10z" fill="url(#ftg)" stroke="#ffd257" stroke-width="1.6"/>
    <path d="M22 4v32" stroke="#ffd257" stroke-width="1.2" stroke-dasharray="3 3" opacity=".85"/>
    <g transform="translate(12.5 20)">
      <circle r="7.6" fill="none" stroke="#ffd257" stroke-width="1.1" opacity=".7"/>
      <g fill="url(#ftp)">
        <ellipse cx="0" cy="-4.6" rx="2.5" ry="4.1"/>
        <ellipse cx="4.4" cy="-1.4" rx="2.5" ry="4.1" transform="rotate(72 4.4 -1.4)"/>
        <ellipse cx="2.7" cy="3.7" rx="2.5" ry="4.1" transform="rotate(144 2.7 3.7)"/>
        <ellipse cx="-2.7" cy="3.7" rx="2.5" ry="4.1" transform="rotate(216 -2.7 3.7)"/>
        <ellipse cx="-4.4" cy="-1.4" rx="2.5" ry="4.1" transform="rotate(288 -4.4 -1.4)"/>
      </g>
      <circle r="2.2" fill="#fff6d8"/>
    </g>
    <text x="41.5" y="17" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="7.4" font-weight="900" fill="#ffd257">FES</text>
    <text x="41.5" y="27.5" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="6" font-weight="900" fill="#ffd0e2">TICKET</text>
    <path d="M31 32.5h21" stroke="#ffd257" stroke-width=".9" opacity=".6"/>
  </svg>`;
}
/* ══ ガチャチケットの券面（★ 2026-08-13 新設）══
   フェスチケットと<b>同じ形・ちがう色</b>にしてある。
   ・フェス券 … 夜色（紫）＋夜に咲く花
   ・ガチャ券 … 青金＋八角の星（＝どのガチャでも使える「万能」の意）
   ★ グラデーションの id は必ず別名にすること。同じ id にすると、
     2枚を同じ画面に並べたときに<b>あとから読まれたほうの色に全部そろってしまう</b>
     （SVG の defs は文書全体で1つの名前空間）。 */
function gachaTicketSVG(px) {
  const s = px || 30, w = "width:" + (s * 1.55) + "px;height:" + s + "px;display:block";
  return `<svg viewBox="0 0 62 40" style="${w}" aria-hidden="true">
    <defs>
      <linearGradient id="gtg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0d2a52"/><stop offset=".5" stop-color="#1a63b8"/><stop offset="1" stop-color="#08182f"/>
      </linearGradient>
      <linearGradient id="gtp" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#bfe9ff"/><stop offset="1" stop-color="#5ab6ff"/>
      </linearGradient>
    </defs>
    <path d="M3 6h56v9a5 5 0 000 10v9H3v-9a5 5 0 000-10z" fill="url(#gtg)" stroke="#ffd257" stroke-width="1.6"/>
    <path d="M22 4v32" stroke="#ffd257" stroke-width="1.2" stroke-dasharray="3 3" opacity=".85"/>
    <g transform="translate(12.5 20)">
      <circle r="7.6" fill="none" stroke="#ffd257" stroke-width="1.1" opacity=".7"/>
      ${/* 八角の星（4本のとがった光条＋斜めの短い光条） */""}
      <g fill="url(#gtp)">
        <path d="M0-7.4 1.7-1.7 7.4 0 1.7 1.7 0 7.4-1.7 1.7-7.4 0-1.7-1.7Z"/>
        <path d="M0-4.6 1.1-1.1 4.6 0 1.1 1.1 0 4.6-1.1 1.1-4.6 0-1.1-1.1Z" transform="rotate(45)"/>
      </g>
      <circle r="1.9" fill="#fff"/>
    </g>
    <text x="41.5" y="17" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="7.4" font-weight="900" fill="#ffd257">GACHA</text>
    <text x="41.5" y="27.5" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="6" font-weight="900" fill="#bfe9ff">TICKET</text>
    <path d="M31 32.5h21" stroke="#ffd257" stroke-width=".9" opacity=".6"/>
  </svg>`;
}
/* XEVAガチャ／XEVARIONと共有するキャラ（クロス4体＋MagiLex報酬ミズキ＋CDK/制覇報酬アヤカ）。限界突破はxeva_gacha_v1が正 */
/* ★★ 2026-08-26 MagiLex の KP交換キャラ4体を追加。
   ここに無いと、MagiLex の交換所で受け取っても<b>MagiBurst に出てこない</b>
   （xeva_gacha_v1 → magiburst_v1 の橋渡しがこの配列だけなので）。 */
const SHARED_CHARS = CROSS_CHARS.concat(["mizuki", "ayaka", "kanade", "homura", "yoizuki", "sumika"]);

/* ── XEVAガチャの共有コレクション（xeva_gacha_v1）読み書き ── */
const XG_KEY = "xeva_gacha_v1";
function xgLoad() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(XG_KEY) || "null"); } catch (e) {}
  if (!g || typeof g !== "object") g = {};
  if (!g.owned) g.owned = {}; if (!g.dupes) g.dupes = {}; if (!g.points) g.points = {};
  return g;
}
function xgSave(g) { try { localStorage.setItem(XG_KEY, JSON.stringify(g)); } catch (e) {} }

/* ── 共有キャラの双方向同期 ──
   ・XEVAガチャ/MagiLexで入手・限界突破したキャラを MagiBurst の所持(DB.chars)へ反映
   ・逆に、連携前に MagiBurst 側だけで持っていた限界突破は共有側へ引き継ぐ（大きい方を採用）
   限界突破(awk)は以後 xeva_gacha_v1.dupes を正とする。Lv/EXPはMagiBurst固有のまま。 */
function syncCrossChars() {
  const g = xgLoad();
  let xgChanged = false, dbChanged = false;
  SHARED_CHARS.forEach((id) => {
    if (!CHARS[id]) return;
    const inXg = !!g.owned[id];
    const inDb = !!DB.chars[id];
    if (!inXg && !inDb) return;
    const merged = Math.max(0, Math.min(MAX_AWK, Math.max(g.dupes[id] || 0, inDb ? (DB.chars[id].awk || 0) : 0)));
    if (!inXg) { g.owned[id] = true; xgChanged = true; }
    if ((g.dupes[id] || 0) !== merged) { g.dupes[id] = merged; xgChanged = true; }
    if (!inDb) { DB.chars[id] = { lv: 1, awk: merged, exp: 0 }; dbChanged = true; }
    else if ((DB.chars[id].awk || 0) !== merged) { DB.chars[id].awk = merged; dbChanged = true; }
  });
  if (xgChanged) xgSave(g);
  if (dbChanged) save();
  return dbChanged || xgChanged;
}

/* SSRの合計排出は常に10%。ピックアップ5% ＋ 残りのSSRで5%を等分する（キャラが増えても総排出率は変わらない） */
const PICK_RATE = 0.05;
/* 限界突破MAX（覚醒MAX）のキャラはガチャの排出対象から除外する */
function isMaxAwk(id) { return DB.chars[id] && (DB.chars[id].awk || 0) >= MAX_AWK; }
function gachaPool() { return PREMIUM_CHARS.filter((id) => !isMaxAwk(id)); }   // プレミアム＝Bシリーズ4体を除いた従来枠＋ナツキ
const S5_TOTAL = 0.10;       // SSRの合計排出率（ピックアップ＋その他）は常に10%
/* ★ v10.1 修正: 「1体を残して全員が限界突破MAX」のとき、
   その最後の1体をピックアップに選ぶと5%、選ばないと10%になってしまっていた
   （ピックアップに選んだほうが損をする逆転現象）。
   排出対象が1体しかいない場合は、その1体がSSR合計の10%をまるごと受け取るようにする。 */
function pickupRate() {
  const pool = gachaPool();
  if (!pool.includes(curPickup())) return 0;
  return pool.length <= 1 ? S5_TOTAL : PICK_RATE;
}
function otherRate() {
  const pool = gachaPool();
  if (!pool.length) return 0;
  const others = pool.length - (pool.includes(curPickup()) ? 1 : 0);
  if (others <= 0) return 0;
  return (S5_TOTAL - pickupRate()) / others;   // SSR合計10%を、排出対象のキャラで分け合う
}
/* 排出対象のキャラを新たにピックアップに選んだ場合の排出率（対象が1体だけなら10%） */
function wouldPickRate() { return gachaPool().length <= 1 ? S5_TOTAL : PICK_RATE; }
function ratePct(v) { return (v * 100).toFixed(v * 100 < 1 ? 2 : 1).replace(/\.0$/, "") + "%"; }
function curPickup() { return PREMIUM_CHARS.includes(DB.pickup) ? DB.pickup : PREMIUM_CHARS[0]; }
function setPickup(id) {
  if (!PREMIUM_CHARS.includes(id)) return;
  DB.pickup = id; save(); SFX.pick(); paintGacha();
}
window.setPickup = setPickup;
/* クロスガチャのピックアップ（既定は最新のアリサ） */
function curPickupX() { return CROSS_CHARS.includes(DB.pickupX) ? DB.pickupX : "arisa"; }
function setPickupX(id) {
  if (!CROSS_CHARS.includes(id)) return;
  DB.pickupX = id; save(); SFX.pick(); paintGacha();
}
window.setPickupX = setPickupX;
/* ══════════ ガチャ評価: そのキャラの「強み」と「適性クエスト」（v12） ══════════ */
/* そのキャラが無効化できるギミックのキー一覧（オムニアンチは全部） */
function charAntiKeys(id) {
  const c = CHARS[id];
  /* ★ 2026-08-05: オムニアンチが肩代わりできるのは OMNI_GIMS の4つ
     （ダメージウォール・重力バリア・ワープ・地雷）だけ。
     以前はここで ANTI_ALL をまるごと返していたため、ブロック・ロックゾーン・減速壁しか
     出ないクエストでも「アンチ全対応」と表示されてしまっていた。
     オムニ持ちが専用アンチも併せ持っている場合はその分だけ足す。 */
  const own = ANTI_ALL.filter((k) => COUNTER_ABIL[k] && COUNTER_ABIL[k].need.some((a) => hasAbil(c, a)));
  if (!hasAbil(c, "omni")) return own;
  return ANTI_ALL.filter((k) => OMNI_GIMS.has(k) || own.indexOf(k) >= 0);
}
/* 適性クエスト: そのキャラのアンチ系アビリティが「そのクエストのアンチギミックをどれだけ消せるか」＋属性有利で選ぶ */
function charFitQuests(id) {
  const c = CHARS[id], mine = charAntiKeys(id);
  const all = STAGES.concat(LAB_STAGES, GARDEN_STAGES, HOURAI_STAGES);
  const scored = all.map((s) => {
    const keys = counterKeysOf(s);
    const cover = keys.filter((k) => mine.indexOf(k) >= 0).length;
    const boss = s.waves[s.waves.length - 1][0] || {};
    const adv = elemMult(c.el, boss.el) > 1;
    /* 全ギミックを消せることを最優先、次に属性有利、最後に難易度（＝奥のクエストほど価値が高い） */
    const full = keys.length > 0 && cover === keys.length;
    /* 難しいクエストほど「適性が活きる」ので、部屋番号の重みを大きくとる
       ★★ 2026-08-22b 幽冥の庭園・蓬莱の九重は<b>別格</b>として上に出す（ご指定）。
         部屋番号だけで並べると、蓬莱は room が 1〜10 しかないので
         王城の第30の間（room 30）より下に沈んでしまっていた。 */
    const top = s.hourai ? 900 : s.garden ? 700 : 0;
    return { s, keys, cover, adv, full, score: (full ? 2000 : cover * 300) + (adv ? 150 : 0) + top + (s.room || 0) * 20 };
  }).filter((x) => x.cover > 0 || x.adv);
  scored.sort((a, b) => b.score - a.score);
  /* ★ v12.2: シリーズごとに最大2件・合計6件まで見せる（適性が分かりやすいように件数を増やした） */
  const out = [], per = {};
  for (const x of scored) {
    /* ★ 2026-08-17L 蓬莱の九重を4つ目の系統として足す。
       ほかと同じく<b>2つまで</b>。ここを足し忘れると、蓬莱に刺さるキャラなのに
       適性クエストに1件も出てこない（庭園までしか見ていなかった）。 */
    const ser = x.s.hourai ? "hourai" : x.s.garden ? "garden" : x.s.lab ? "lab" : "castle";
    if ((per[ser] || 0) >= 2) continue;
    per[ser] = (per[ser] || 0) + 1;
    out.push(x);
    if (out.length >= 8) break;   /* ★ 4系統×2枠 */
  }
  /* シリーズごとにまとめて並べる（王城→迷宮→庭園） */
  const order = { castle: 0, lab: 1, garden: 2, hourai: 3 };
  out.sort((a, b) => {
    const sa = a.s.hourai ? "hourai" : a.s.garden ? "garden" : a.s.lab ? "lab" : "castle";
    const sb = b.s.hourai ? "hourai" : b.s.garden ? "garden" : b.s.lab ? "lab" : "castle";
    return (order[sa] - order[sb]) || (b.score - a.score);
  });
  return out;
}
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-22b みんなのクリア編成に「そのキャラ」が入っているクエスト
   ------------------------------------------------------------
   適性クエストは「アンチが足りているか」だけで選んでいるので、
   <b>実際にそのクエストを抜けた人がその子を使っているか</b>は出てこなかった。
   clearparty（全ユーザー共有）を1回だけ丸ごと読んで
     { キャラid: { クエストid: 人数 } }
   の索引を作り、適性クエストの行に印を付ける。

   ★ 読むのは<b>1回だけ</b>（5分キャッシュ）。詳細を開くたびに取りに行かない。
   ★ 通信できないときは<b>何も出さない</b>（印が付かないだけで、表示は壊れない）。
   ★ MagiBurst と XEVARION（ガチャ・図鑑）は同じ mb-core.js を読むので、ここに置けば両方で効く。
   ══════════════════════════════════════════════════════════════ */
const MB_SHARE_FB = "https://magiburst-default-rtdb.asia-southeast1.firebasedatabase.app";
let _shareIdx = null, _shareIdxAt = 0, _shareIdxRun = null;
function shareCharIndex() {
  if (_shareIdx && Date.now() - _shareIdxAt < 300000) return Promise.resolve(_shareIdx);
  if (_shareIdxRun) return _shareIdxRun;
  _shareIdxRun = fetch(MB_SHARE_FB + "/clearparty.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const idx = {};
      if (d && typeof d === "object") {
        Object.keys(d).forEach((sid) => {
          const per = d[sid];
          if (!per || typeof per !== "object") return;
          Object.keys(per).forEach((uid) => {
            const rec = per[uid];
            if (!rec || !Array.isArray(rec.ids)) return;
            rec.ids.forEach((cid) => {
              if (!cid) return;
              (idx[cid] || (idx[cid] = {}))[sid] = ((idx[cid] || {})[sid] || 0) + 1;
            });
          });
        });
      }
      _shareIdx = idx; _shareIdxAt = Date.now(); _shareIdxRun = null;
      return idx;
    })
    .catch(() => { _shareIdxRun = null; return _shareIdx || {}; });
  return _shareIdxRun;
}
window.shareCharIndex = shareCharIndex;
/* 適性クエストの行に印を付ける（描いたあとから、非同期で足す） */
function paintFitShareMarks(id) {
  shareCharIndex().then((idx) => {
    const per = idx && idx[id];
    if (!per) return;
    document.querySelectorAll('.evalwrap[data-cid="' + id + '"] .evqr[data-sid]').forEach((el) => {
      const n = per[el.getAttribute("data-sid")];
      if (!n) return;
      const b = el.querySelector(".evqu");
      if (b) { b.style.display = ""; b.title = "この子を入れてこのクエストを抜けた人が " + n + " 人います"; }
    });
  }).catch(() => {});
}
/* ★ v12.3: 評価は「適性クエスト（理由つき・最大6件）」だけ。強みタグは廃止 */
function evalHTML(id) {
  const list = charFitQuests(id);
  const mine = charAntiKeys(id);
  const why = (x) => {
    const t = [];
    if (x.full) t.push("アンチ全対応");
    else if (x.cover) t.push(x.keys.filter((k) => mine.indexOf(k) >= 0).map((k) => COUNTER_ABIL[k].nm).join("・"));
    if (x.adv) t.push("属性有利×1.25");
    return t.join(" / ");
  };
  /* ★★ 2026-08-22b 「みんなのクリア編成」に入っている行に印を付ける。
     印そのものは非同期（paintFitShareMarks）で出すので、まず display:none で置いておく。
     見た目は<b>直書き</b>にしてある——MagiBurst と XEVARION で CSS ファイルが別なので、
     どちらかに書くと片方だけ印が出ない。 */
  const MARK = '<i class="evqu" style="display:none;font-style:normal;font-size:9.5px;font-weight:900;'
    + 'margin-left:6px;padding:1px 6px;border-radius:99px;white-space:nowrap;'
    + 'background:rgba(45,190,150,.18);color:#12a07a;border:1px solid rgba(45,190,150,.45)">🌍 みんなの編成</i>';
  return `<div class="evalwrap" data-cid="${id}">
    <div class="evrow col"><span class="evh">🎯 適性クエスト</span>
      ${list.length ? `<div class="evql">${list.map((x) => `<div class="evqr ${x.full ? "full" : ""}" data-sid="${x.s.id}">
        <span class="evqn">${x.s.nm}<i>${x.s.diff}</i>${MARK}</span><span class="evqw">${why(x)}</span></div>`).join("")}</div>`
        : '<div class="evql"><div class="evqr"><span class="evqn">属性有利をとれるクエスト</span><span class="evqw">火力で押すタイプ</span></div></div>'}
    </div>
  </div>`;
}
/* 適性クエストを描いたら、そのあとで「みんなの編成」の印を足す。
   ★ evalHTML は文字列を返すだけなので、DOM に入るのを待ってから呼ぶ。 */
function evalHTMLWithMarks(id) {
  const h = evalHTML(id);
  setTimeout(() => { try { paintFitShareMarks(id); } catch (e) {} }, 60);
  return h;
}
window.evalHTMLWithMarks = evalHTMLWithMarks;
function charStrengths(id, isCross) {
  const c = CHARS[id], isPick = isCross ? curPickupX() === id : curPickup() === id;
  const rate = isMaxAwk(id) ? "限界突破MAXのため排出対象外👑"
    : isCross ? (isPick ? ratePct(PICK_RATE) + "（ピックアップのみ排出）" : "排出対象外（ピックアップを切り替え）")
    : (isPick && pickupRate() > 0 ? ratePct(PICK_RATE) + "（ピックアップ中！）" : ratePct(otherRate()));
  return `<b>SSR「${c.nm}」の強み</b>（${ELEM[c.el].nm}属性・${c.shot === "pierce" ? "貫通" : "反射"}・${c.type}）
    ${strengthBarsHTML(id, (isCross ? "x_" : "p_") + id)}
    ${evalHTMLWithMarks(id)}
    ・アビリティ: ${sortedAbil(c).map(abilName).join("／")}<br>
    ・フルバースト「${c.ssName}」（${c.ssTurns}ターン）: <b style="color:#d97800">${c.ssPow}</b><br>
    ・リンク「${c.fsName}」: <b style="color:#1d78d8">${c.fsPow}</b>／サブリンク「${SUBFS[c.subfs].nm}」<br>
    <span style="color:${isMaxAwk(id) ? "#c98a10" : isPick ? "#e0405e" : "#8b87a8"}">排出率 ${rate}</span>
    ${DB.chars[id] ? `<span style="color:#0e8a5c">所持済み（覚醒+${DB.chars[id].awk || 0}${(DB.chars[id].awk || 0) >= MAX_AWK ? "・限界突破MAX👑" : "・重複で覚醒+1）"}</span>` : '<span style="color:#d97800">未所持</span>'}`;
}
/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-07 ガチャえらびをハンバーガー1つにまとめた

   ・以前はガチャの本数ぶんだけ切替ボタンを並べていたので、フェスが増えるたびに
     画面が下へ伸び、バナーや「回す」ボタンがどんどん遠くなっていた。
   ・いまは「いま見ているガチャ」を1行（.gpickbtn）だけ出し、押すと一覧のシートが開く。
     ガチャが何本になっても、この行の高さは変わらない。
   ・フェスの <section> も FESTS から自動で作る（buildFesSections）。
     フェスを1本足すときに書き足すのは FESTS のエントリだけ。
   ══════════════════════════════════════════════════════════════ */
/* ══ ★ 2026-08-11 最初に開くガチャ＝「いちばん新しいキャラが引けるガチャ」 ══
   新キャラを足したのに、開いたときに出るのがずっとプレミアム固定だと、
   その子がどこで引けるのかを自分で探しにいくことになる。
   キャラクター番号（＝追加した順）がいちばん大きいキャラを探して、
   そのキャラが排出されるガチャを既定にする。
   ・<b>開催前のフェスは選ばない</b>（回せないので、開いても何もできない）。
   ・見つからなければこれまでどおりプレミアム。
   ★ FESTS / PREMIUM_CHARS / charNo / fesLocked より<b>後ろ</b>に置くこと（読み込み時に走るため）。 */
function newestGachaMode() {
  let best = "premium", bestNo = -1;
  const consider = (id, mode) => {
    if (!CHARS[id]) return;
    try { if (charSecret(id)) return; } catch (e) {}   // 登場前のキャラは告知しない
    const n = charNo(id);
    if (n > bestNo) { bestNo = n; best = mode; }
  };
  try {
    FES_KEYS.forEach((k) => { if (!fesLocked(k)) fesDef(k).chars.forEach((id) => consider(id, k)); });
    PREMIUM_CHARS.forEach((id) => consider(id, "premium"));
    /* ★ 2026-08-26 GRAND DEBUT は版ごとに mode がちがうので、版べつに見る */
    debutLiveVers().forEach((v) => v.chars.forEach((id) => consider(id, debutModeKey(v))));
  } catch (e) { return "premium"; }
  return best;
}
/* ★ 読み込み時点では決めない。
   MagiBurst では DB（セーブ）が<b>この mb-core.js のあとに</b>作られるので、
   ここで newestGachaMode() を呼ぶと charSecret が DB を触って落ちる
   （＝mb-core 以降の初期化が丸ごと止まる）。
   ガチャ画面を最初に描くときに initGachaMode() で1回だけ決める。 */
let gachaMode = "premium";
let _gachaModeInit = false;
function initGachaMode() {
  /* ★ 2026-08-26 日付が変わると掲載中の版が入れ替わるので、毎回そろえ直す（軽い処理） */
  try { debutRefresh(); } catch (e) {}
  if (_gachaModeInit) return;
  _gachaModeInit = true;
  try { gachaMode = newestGachaMode(); } catch (e) {}
}
/* ガチャ一覧の並び。開始前（soon）のフェスもここに出す（引けないことを明示する） */
function gachaMenuList() {
  /* ★★ 2026-08-26 GRAND DEBUT は<b>掲載中の版のぶんだけ</b>並ぶ（0本＝スタンバイ／2本＝版ちがいが2つ）。 */
  const live = debutLiveVers();
  const list = [];
  if (live.length) {
    live.forEach((v) => list.push({
      k: debutModeKey(v), nm: DEBUT_NM, c: DEBUT_C, ver: v.ver,
      sub: gachaVerText(v) + "・新キャラ" + v.chars.length + "体はここだけ／あと" + debutDaysLeft(v) + "日"
        + (debutFree10Left(debutModeKey(v)) > 0 ? "／🎁 初回10連無料" : "")
        + (debutFreeLeft(debutModeKey(v)) > 0 ? "／🎁 1日1回無料" : ""),
    }));
  } else {
    list.push({ k: "debut", nm: DEBUT_NM, c: DEBUT_C, soon: true,
      sub: "スタンバイ中（次のバージョンの準備中です）" });
  }
  /* ★ 2026-08-20 ご指定により <b>GRAND DEBUT GACHA はプレミアムの上</b>に置く */
  list.push({ k: "premium", nm: PREMIUM_NM, sub: "ピックアップを1体えらべる常設ガチャ", c: "#ff9d2e" });
  /* ★ 2026-08-10 クロスガチャ（Bシリーズ）は廃止。4体は上方修正のうえプレミアムへ移した。
     一覧から消すだけでよい（gachaMode の "cross" 分岐は、古いセーブから復帰したときの保険で残す）。 */
  if (!CROSS_GACHA_OFF) list.push({ k: "cross", nm: "Bシリーズ クロスガチャ", sub: "XEVAガチャと所持・限界突破・ポイントを共有", c: "#38a6ff" });
  FES_KEYS.forEach((k) => {
    const f = fesDef(k);
    list.push({ k, nm: f.nm, sub: fesLocked(k) ? fesOpenText(f) : "フェス限定SSR・🎫チケット優先", c: f.c, soon: fesLocked(k) });
  });
  return list;
}
function gachaModeDef(m) {
  return gachaMenuList().find((x) => x.k === m) || gachaMenuList()[0];
}
function setGachaMode(m) {
  if (m === "cross" && CROSS_GACHA_OFF) m = "premium";   // ★ 2026-08-10 廃止したので読み替える
  gachaMode = (m === "cross" || isFesMode(m) || isDebutMode(m)) ? m : "premium";
  /* ★ 2026-08-10 クロスガチャの <section> は廃止済み、プレミアムも XEVARION へ移った。
     どちらも無いことがあるので、あれば切り替える形にしてある。 */
  const gc = $("#gCross"); if (gc) gc.style.display = gachaMode === "cross" ? "block" : "none";
  const gpm = $("#gPremium"); if (gpm) gpm.style.display = gachaMode === "premium" ? "block" : "none";
  FES_KEYS.forEach((k) => {
    const s = $("#gFes" + fesDef(k).sfx); if (s) s.style.display = gachaMode === k ? "block" : "none";
  });
  paintGachaPicker();
  paintGacha(); SFX.pick();
}
window.setGachaMode = setGachaMode;
/* 1行の「いま見ているガチャ」を塗り直す */
function paintGachaPicker() {
  const d = gachaModeDef(gachaMode);
  const nm = $("#gPickBtnNm"), btn = $("#gPickBtn"), n = $("#gPickBtnN");
  if (nm) nm.textContent = d.nm;
  if (btn) btn.style.setProperty("--gpb-c", "linear-gradient(135deg," + d.c + "," + d.c + "cc)");
  if (n) n.textContent = gachaMenuList().length + "本";
}
function openGachaMenu() {
  if (!$("#gmCard")) return;   /* ★ 2026-08-10 MagiBurst 側のガチャ画面は廃止済み */
  const rows = gachaMenuList().map((d) => `
    <button class="gmrow ${d.k === gachaMode ? "on" : ""}" style="--gmc:${d.c}" onclick="pickGachaMode('${d.k}')">
      <span class="gmc"></span>
      <span class="gmt"><b>${d.nm}</b><small>${d.sub}</small></span>
      ${d.k === gachaMode ? '<span class="gmg now">表示中</span>' : d.soon ? '<span class="gmg soon">開催前</span>' : ""}
    </button>`).join("");
  $("#gmCard").innerHTML = `
    <button class="ovx" onclick="closeGachaMenu()" aria-label="とじる" title="とじる">✕</button>
    <h3>🎰 ガチャをえらぶ</h3>
    <div class="gimsub">開催中のガチャ ${gachaMenuList().length} 本</div>
    <div class="gmlist">${rows}</div>`;
  $("#gmOv").classList.add("on");
  SFX.pick();
}
function closeGachaMenu() { const o = $("#gmOv"); if (o) o.classList.remove("on"); }
function pickGachaMode(k) { closeGachaMenu(); setGachaMode(k); window.scrollTo(0, 0); }
window.openGachaMenu = openGachaMenu; window.closeGachaMenu = closeGachaMenu; window.pickGachaMode = pickGachaMode;
/* フェスの <section> を FESTS から作る（ページ読み込み時に1回だけ） */
function buildFesSections() {
  const wrap = $("#gFesWrap"); if (!wrap) return;
  wrap.innerHTML = FES_KEYS.map((k) => {
    const f = fesDef(k);
    return `<section id="gFes${f.sfx}" style="display:none">
      ${/* ★ 2026-08-07: 開催前は「シルエット版」のバナーを出す（src は paintGacha でも毎回入れ直す） */""}
      ${/* ★ 2026-08-07: バナーの id は必ず gFesBanner + sfx にすること。
             以前は gBanner + sfx だったので、sfx が空文字の Nocturne Bloom Fest だけ
             プレミアムセレクトガチャのバナー（#gBanner）と id がぶつかり、
             paintGacha の $("#gBanner") が先に見つかるプレミアム側の img をつかんで、
             そこへフェスのバナーを流し込んでいた（＝プレミアムがフェスの絵になる不具合）。 */""}
      <img class="gbanner" id="gFesBanner${f.sfx}" src="${fesBannerOf(k)}" alt="${f.nm}">
      <div class="gfeslead ${f.leadCls || ""}">✦ <b>${f.nm}</b> ✦<br><small>${f.sub || f.lead}</small></div>
      <div class="gfesnote" id="gFesLock${f.sfx}"></div>
      <div class="gticket" id="gTicket${f.sfx}"></div>
      <div class="gfesgrid" id="gFesGrid${f.sfx}"></div>
      <div class="gpick" id="gfespick${f.sfx}"></div>
      <div class="gnote">🎫 <b>チケットは自動で優先して使われます</b>（フェス券 → ガチャ券 → <i class='icc ic-gem'></i>ジェムの順）。フェス券は<b>どのフェスでも</b>、ガチャ券は<b>どのガチャでも</b>使えます。<br>
        🎯 <b>10連の最後の1枠（SSR確定）は、このフェスの限定SSRとプレミアムセレクトガチャのSSRをまとめた中から全員おなじ確率</b>で出ます。</div>
      <button class="grates" onclick="openRates('${f.key}')">提供割合を見る</button>
    </section>`;
  }).join("");
}

/* クロスガチャ: ピックアップの共有ポイント（XEVAガチャの b1〜b4 と同じキー） */
function crossPtKey(id) { return "b" + (CROSS_SEASON[id] || 1); }
function crossPts(id) { const g = xgLoad(); return g.points[crossPtKey(id)] || 0; }

function paintGacha() {
  initGachaMode();    /* ★ 2026-08-11 最初の1回だけ「いちばん新しいキャラがいるガチャ」を選ぶ */
  syncCrossChars();   // XEVAガチャ/MagiLexでの入手・限界突破を反映してから描画
  /* ★★ 2026-08-22b えらばずに閉じた BLACK SELECT があれば、ここで出しなおす。
     「引いたのに何ももらえなかった」を作らないための保険。 */
  try { if (DB.luxSel && !document.getElementById("luxSelOv")) setTimeout(luxResume, 300); } catch (e) {}
  /* ★ 2026-08-10 ガチャ画面は XEVARION（gacha.html）へ一本化した。
     MagiBurst 側にはもうバナーも回すボタンも無いので、<b>描くものが無ければ何もせず帰る</b>。
     ★ ここを素通りさせていたのが「ジェムだけ減ってキャラが出ない」不具合の正体だった。
       すでに消えていた #gxpick を null チェックなしで触っていたため paintGacha が例外で落ち、
       それを頭で呼んでいる revealGacha（結果の表示）が最後まで走らなかった。
     ★ XEVARION 側は gacha-ui.js が同名の関数で丸ごと上書きするので、ここは通らない。 */
  if (!$("#gPremium")) { paintGachaStick(); return; }
  /* ═══ プレミアムガチャ ═══
     ★ キャラが増えたので一覧グリッドはやめ、「いまのピックアップ＋セレクトボタン」に集約した */
  const pick = curPickup(), pc = CHARS[pick], maxed = isMaxAwk(pick);
  const gp = $("#gPickup");
  if (gp) gp.innerHTML = `
    <img src="${pc.th}" alt="${pc.nm}">
    <div class="gpi">
      <div class="gpt">✦ PICKUP</div>
      <div class="gpn">${elIcon(pc.el, 18)} ${pc.nm}</div>
      <div class="gpr">${maxed ? "👑 限界突破MAX・排出対象外" : "SSR 排出 " + ratePct(pickupRate()) + "（他のSSRは各 " + ratePct(otherRate()) + "）"}</div>
    </div>
    <button class="gpinfo" onclick="openDet('${pick}','chars')" title="${pc.nm} の性能を見る">i</button>
    <button class="gpsel" onclick="openPickSel('premium')">セレクト<br>する</button>`;
  const gpk = $("#gpick"); if (gpk) gpk.innerHTML = charStrengths(pick);
  /* ═══ フェスガチャ（FESTS のぶんだけ）═══ */
  FES_KEYS.forEach((k) => {
    const f = fesDef(k);
    /* ★ 2026-08-07: 開催前のフェスは「シルエットのバナー＋中身は ? 」。
       バナーは描き直すたびに入れ直すので、開催時刻をまたいだら自動で本物に切り替わる。 */
    const locked = fesLocked(k);
    const bn = $("#gFesBanner" + f.sfx);
    if (bn) { const src = fesBannerOf(k); if (!bn.getAttribute("src").endsWith(src)) bn.src = src; }
    const lk = $("#gFesLock" + f.sfx);
    if (lk) {
      lk.style.display = locked ? "block" : "none";
      lk.innerHTML = locked
        ? `⏳ <b>${fesOpenText(f)}</b><br><small>開催までキャラクターは伏せられています。開催と同時に、なにもしなくても引けるようになります。</small>`
        : "";
    }
    const gt = $("#gTicket" + f.sfx);
    if (gt) gt.innerHTML = `${fesTicketSVG(34)}
      <div><div class="gtn">${fmt(fesTickets())} <span style="font-size:11px">枚</span></div>
        <div class="gtl"><b>フェスチケット</b>を所持中<br>回すときは<b>フェス券 → ガチャ券 → ジェム</b>の順に使われます</div></div>`;
    const fg = $("#gFesGrid" + f.sfx);
    if (fg) fg.innerHTML = f.chars.map((id) => {
      if (locked) {
        return `<div class="gfescard veil" aria-label="開催前">
          <span class="fno">No.???</span>
          <span class="fr">?%</span>
          <span class="fq">?</span>
          <span class="fown no">開催前</span>
          <span class="fn">???</span>
        </div>`;
      }
      const c = CHARS[id], own = !!DB.chars[id], awk = own ? (DB.chars[id].awk || 0) : 0, maxed = isMaxAwk(id);
      return `<button class="gfescard" onclick="openDet('${id}','chars')" title="${c.nm} の性能を見る">
        <span class="fno">${charNoText(id)}</span>
        <span class="fr">${maxed ? "対象外" : ratePct(fesEachRate(k))}</span>
        <img src="${c.th}" alt="${c.nm}">
        <span class="fown ${own ? "ok" : "no"}">${own ? (maxed ? "👑MAX" : "所持+" + awk) : "未所持"}</span>
        <span class="fn">${elIcon(c.el, 13)} ${c.nm}</span>
      </button>`;
    }).join("");
    const fp = $("#gfespick" + f.sfx);
    if (fp) fp.innerHTML = locked
      ? `<b>${f.nm}</b><br><span style="color:#8b87a8">${fesOpenText(f)}。登場するキャラクターは開催までのお楽しみです。</span>`
      : `<b>${f.nm} 限定SSR（${f.chars.length}体）</b><br>
      ${f.chars.map((id) => `${elIcon(CHARS[id].el, 14)} <b style="color:${f.c}">${CHARS[id].nm}</b>（${CHARS[id].shot === "pierce" ? "貫通" : "反射"}・${CHARS[id].type}）`).join("／")}<br>
      <span style="color:#8b87a8">${f.note}</span>`;
  });
  paintGachaStick();
  /* 強さバーを頭から流し直す（切替のたびに伸びるアニメを見せてガチャ意欲を高める） */
  requestAnimationFrame(() => { replayStrengthAnim($("#gpick")); });
}
/* ══════════════════════════════════════════
   XEVA→ジェムの交換所は廃止しました（2026-07-30）
   ・交換所は XEVARION ホームの「💎ジェム変換所」に一本化。
     ジェムは XEVARION 共通のプレミアム通貨なので、入口も1か所にまとめたほうが
     「どこで交換したか分からない」状態にならない。
   ・ここでは案内だけ出して、ホームへ送り出す。
   ══════════════════════════════════════════ */
function paintOrbShop() {
  const card = $("#orbCard"); if (!card || !$("#orbShop").classList.contains("on")) return;
  const bal = window.XEVA ? XEVA.getBalance() : 0;
  card.innerHTML = `
    <h3>🏪 ジェム変換所は引っ越しました</h3>
    <div class="osub"><i class='icc ic-gem'></i>ジェムの交換は <b>XEVARION ホーム</b>にまとまりました。
      ホームの<b>「💎ジェム変換所」</b>から、いつでも XEVA を交換できます（<b>お得な初回限定パック</b>もあります）。</div>
    <div class="obal">所持 XEVA <b>${fmt(bal)}</b>　／　<i class='icc ic-gem'></i>ジェム <b>${fmt(DB.orbs)}</b></div>
    <button class="shopbtn wide" style="margin-top:10px" onclick="goPortalExchange()">🏠 XEVARION ホームへ</button>
    <button class="oclose" onclick="closeOrbShop()">とじる</button>`;
}
function openOrbShop() { $("#orbShop").classList.add("on"); paintOrbShop(); SFX.pick(); }
function closeOrbShop() { $("#orbShop").classList.remove("on"); }
/* ホームの変換所を開いた状態で XEVARION に戻る */
function goPortalExchange() { location.href = "../index.html#exchange"; }
window.openOrbShop = openOrbShop; window.closeOrbShop = closeOrbShop; window.goPortalExchange = goPortalExchange;
/* ★ 2026-08-10 提供割合の「育成アイテム」の行を組む。total は アイテム枠ぜんぶの確率。 */
function itemRateRows(total, table) {
  const tb = table || G_ITEM_TABLE;
  const sum = tb.reduce((a, b) => a + b.p, 0) || 1;
  return tb.map((it) =>
    `<tr><td>${(it.ticket || it.gticket) ? "🎫" : (ITEMS[it.item] || {}).icon || "◆"} ${it.nm}${it.n > 1 ? " ×" + it.n : ""}</td>`
    + `<td>${ratePct(total * (it.p / sum))}</td></tr>`).join("");
}
function rollOnce() {
  const pool = gachaPool();                                 // 限界突破MAXキャラは除外
  const pick = curPickup();
  const pickIn = pool.includes(pick);
  const others = pool.filter((x) => x !== pick);
  let r = Math.random();
  const pr = pickupRate();
  if (pickIn) { if (r < pr) return grantChar(pick); r -= pr; }                  // ピックアップ
  const each = otherRate();
  for (const o of others) { if (r < each) return grantChar(o); r -= each; }     // 他のSSR（残りを等分）
  /* SR枠（合計55%・23体で等分） */
  const s4 = STAR4_POOL.length ? 0.55 / STAR4_POOL.length : 0;
  for (const s of STAR4_POOL) { if (r < s4) return grantChar(s); r -= s4; }
  /* 残り35%＝育成アイテム（★ 2026-08-10 ゴールドは廃止した） */
  return rollGachaItem(Math.random() * 0.35);
}
/* ★ フェスガチャの1回抽選（ピックアップなし・SSRは全員おなじ確率）
   ★ 2026-08-03: <b>道中（確定枠でない普通の1回）でもプレミアムSSRが出る</b>ようにした。
     これまでフェスガチャは限定SSRしか出ず、10連の確定枠を引くまでプレミアムSSRには
     まったく手が届かなかった。フェス限定の確率（合計10%）はそのままに、
     初期キャラ・ゴールドに回っていたぶんから FES_PREMIUM_TOTAL を切り出して
     プレミアムSSRに配る。 */
function fesRollOnce(key) {
  const pool = fesPool(key);
  let r = Math.random();
  const each = fesEachRate(key);
  for (const o of pool) { if (r < each) return grantChar(o); r -= each; }        // フェス限定SSR（等分・合計10%）
  /* プレミアムセレクトガチャのSSR（等分・合計5%） */
  const prem = gachaPool().filter((id) => pool.indexOf(id) < 0);
  const pEach = prem.length ? FES_PREMIUM_TOTAL / prem.length : 0;
  for (const o of prem) { if (r < pEach) return grantChar(o); r -= pEach; }
  /* SR枠（合計50%・23体で等分） */
  const s4 = STAR4_POOL.length ? 0.50 / STAR4_POOL.length : 0;
  for (const s of STAR4_POOL) { if (r < s4) return grantChar(s); r -= s4; }
  /* 残り35%＝育成アイテム（★ 2026-08-10 ゴールドは廃止した）
     ★★ 2026-08-22 フェスに itemTable が書いてあれば、その表で引く。
       Starlight Academy Fest だけ GRAND DEBUT と同じ中身にする、というご指定のため。
       書いていないフェスは undefined が渡り、rollGachaItem が G_ITEM_TABLE に落とす
       ＝ <b>既存のフェスの中身は1つも変わらない</b>。 */
  return rollGachaItem(Math.random() * 0.35, fesDef(key).itemTable);
}
/* ★ v15 フェスガチャ 10連のSSR確定枠の排出対象。
   通常抽選（fesRollOnce）は「そのフェスの限定SSR」しか出さないが、
   確定枠だけは <b>そのフェスの限定SSR ＋ プレミアムセレクトガチャのSSR</b> をまとめた母集団から
   全員おなじ確率で出す。限定SSRを狙って回しても、確定枠でプレミアムSSRの穴が埋まる。
   限界突破MAXのキャラは両方とも除外される（fesPool / gachaPool が除いている）。 */
/* ══ ★ 2026-08-11 ガチャの一覧・提供割合の並び ══
   ・<b>ピックアップのキャラはいちばん上</b>（探さなくても目に入るように）。
   ・そのほかは<b>キャラクター番号の新しい順</b>（＝あとから出たキャラほど上）。
     PREMIUM_CHARS の並びは「実装した順」ではなく手で足してきた順なので、
     そのまま出すと新しいキャラが表のまん中に紛れていた。
   ★ 提供割合・ピックアップ選択・フェスの一覧のすべてでこの関数を通すこと。 */
function byCharNoDesc(ids) { return ids.slice().sort((a, b) => charNo(b) - charNo(a)); }
function rateOrder(ids, pick) {
  const rest = byCharNoDesc(ids.filter((id) => id !== pick));
  return (pick && ids.indexOf(pick) >= 0 ? [pick] : []).concat(rest);
}
function fesSurePool(key) {
  const seen = new Set(), out = [];
  fesPool(key).concat(gachaPool()).forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id); out.push(id);
  });
  return out;
}
function fesGuaranteedS5(key) {
  const pool = fesSurePool(key);
  if (!pool.length) return fesRollOnce(key);
  return grantChar(pool[Math.floor(Math.random() * pool.length)]);
}
/* ══════════ ガチャの支払い ══════════
   ★ 消費の順番は <b>フェスチケット → ガチャチケット → 💎ジェム</b>。
     フェスチケットはフェスガチャでしか使えないので、<b>専用のほうから先に</b>減らす。
     プレミアムでは fes=false で呼ぶ（フェスチケットは手を付けない）。
   ・払えないときは null を返す（呼び出し側は何もしない）。
   ★ 見積もりだけしたいとき（ボタンの値段表示）は gachaCost(n, fes) を使う。
     ここ1本で計算して、実際に払う payGacha と必ず同じ内訳になるようにしてある。 */
function gachaCost(n, fes) {
  let rest = n;
  const useF = fes ? Math.min(fesTickets(), rest * FES_TICKET_COST) : 0;
  rest -= Math.floor(useF / FES_TICKET_COST);
  const useG = Math.min(gachaTickets(), rest * GACHA_TICKET_COST);
  rest -= Math.floor(useG / GACHA_TICKET_COST);
  return { fes: useF, tickets: useG, gems: rest * GACHA_GEM_COST };
}
function payGacha(n, fes) {
  const c = gachaCost(n, fes);
  if (DB.orbs < c.gems) return null;
  /* 残高の確認をここで済ませてから減らす（どれかだけ減って回らない、を作らない） */
  if (c.fes > 0) DB.fesTicket = fesTickets() - c.fes;
  if (c.tickets > 0) DB.gTicket = gachaTickets() - c.tickets;
  if (c.gems > 0) DB.orbs -= c.gems;
  return c;
}
/* 支払いの内訳を「（フェス券3枚 ＋ ガチャ券2枚 ＋ ジェム25）」の形にする
   （結果画面の見出しに添える。何で払ったかが結果と一緒に残るようにする） */
function gachaPayText(pay) {
  if (!pay) return "";
  const t = [];
  if (pay.fes > 0) t.push("フェス券" + pay.fes + "枚");
  if (pay.tickets > 0) t.push("ガチャ券" + pay.tickets + "枚");
  if (pay.gems > 0) t.push("ジェム" + pay.gems);
  return t.length > 1 || (t.length === 1 && (pay.fes || pay.tickets)) ? "（🎫" + t.join(" ＋ ") + "）" : "";
}
/* 旧名（フェス専用だった頃の入口）。フェス扱いで呼ぶ。 */
function payFesGacha(n) { return payGacha(n, true); }
function doFesGacha(n, key) {
  key = isFesMode(key) ? key : "fes";
  /* ★ 2026-08-07: 開催前のフェスは回せない（ボタンも押せないが、念のため入口でも止める） */
  if (fesLocked(key)) { uiAlert(fesOpenText(fesDef(key)) + "です。", { icon: "⏳", title: fesDef(key).nm }); return; }
  n = n === 10 ? 10 : n === 5 ? 5 : 1;
  const pay = payGacha(n, true);      /* フェス券 → ガチャ券 → ジェム の順 */
  if (!pay) return;
  DB.pulls = (DB.pulls || 0) + n; missionTick("pull", n);   /* ★ 2026-08-05 ミッション（ガチャを引く） */
  const payTx0 = gachaPayText(pay);
  const nm0 = fesDef(key).nm;
  /* ★★ 2026-08-22b 特別演出（10連のみ・超低確率） */
  const lux = luxRoll(n);
  if (lux === "allssr") { revealGacha(luxAllSSR(fesSurePool(key)), nm0 + " 10連結果！" + payTx0); return; }
  const results = [];
  const normal = n === 10 ? 9 : n;
  const blk = lux === "black" ? luxSelectSlot(fesSurePool(key)) : null;
  const blkIdx = blk ? Math.floor(Math.random() * normal) : -1;
  if (blk) luxSaveSel(blk.pool, nm0);
  for (let i = 0; i < normal; i++) results.push(i === blkIdx ? blk : fesRollOnce(key));
  if (n === 10) { const g = fesGuaranteedS5(key); g.sure = true; results.push(g); }
  const payTx = payTx0;
  const nm = nm0;
  revealGacha(results, nm + (n === 10 ? " 10連結果！" : n === 5 ? " 5連結果！" : " 結果！") + payTx);
}
window.doFesGacha = doFesGacha;
function grantChar(id) {
  const result = { type: "char", id };
  if (!DB.chars[id]) DB.chars[id] = { lv: 1, awk: 0, exp: 0 };
  else if ((DB.chars[id].awk || 0) < MAX_AWK) {
    DB.chars[id].awk = (DB.chars[id].awk || 0) + 1;
    result.awk = DB.chars[id].awk;
    if (result.awk >= MAX_AWK) result.fullAwk = true;   // 限界突破MAX！
  }
  else { result.max = true; DB.gold += 8000; }
  /* ★ 共有キャラ（Bシリーズ4体・ミズキ）は XEVAガチャ側のコレクションにも即時反映
     （所持・限界突破を両アプリで一致させる。クラウド同期は xeva_gacha_v1 ごと行われる） */
  if (SHARED_CHARS.includes(id)) {
    const g = xgLoad();
    g.owned[id] = true;
    g.dupes[id] = Math.max(g.dupes[id] || 0, DB.chars[id].awk || 0);
    xgSave(g);
  }
  return result;
}
/* ── リザルト表示（1回も5連も同じグリッド形式。画面外に出ない） ── */
/* ══════════ ガチャ結果のセル ══════════
   ★ v14.2: セルの上に「レア度プレート（.gcov）」をかぶせて出す。
     ① まず全部プレートで <b>SR</b> だけを見せる（中身はまだ見えない）
     ② SSRだったセルはプレートが <b>SR → SSR に昇格</b>する派手な演出
     ③ 最後にプレートが割れて中身（キャラ）が出る
   revealGacha がこの3段を順番に進める。i はセル番号（演出の順番付けに使う）。 */
function gachaCellHTML(r, i, willRankUp) {
  /* ★ 2026-08-05: プレート自体を押すと、その枠だけを開けられる（1枚ずつ結果を見る） */
  const cov = (stars, kind) => `<span class="gcov ${kind}" data-i="${i}" onclick="gachaOpenOne(${i},event)">
      <i class="gcst">${stars}</i><i class="gcup">RANK UP!!</i></span>`;
  if (r.type === "char") {
    const c = CHARS[r.id];
    const full = (DB.chars[r.id] && (DB.chars[r.id].awk || 0) >= MAX_AWK);
    /* ★ 10連の確定枠（最後の1枠）は、金枠＋「確定」バッジで特別扱いにする */
    /* ★ v14: SR（初期キャラ）の限界突破MAXは金の縁取りだけ（発光なし＝s4mx） */
    const s5 = isStar5(r.id);
    return `<div class="gm chr veiled ${s5 ? "s5" : ""} ${full && s5 ? "mx" : ""} ${r.sure ? "sure" : ""}">
      ${cov(s5 && !willRankUp ? "SSR" : "SR", s5 && !willRankUp ? "s5" : "s4")}
      ${r.sure ? '<span class="gsure">SSR 確定</span>' : ""}
      <img src="${c.th}" alt="${c.nm}"><div class="gn"><b class="gnm">${charNoText(r.id)} ${s5 ? "SSR" : "SR"} ${c.nm}</b><i class="gst">${r.max ? "→G8,000" : r.fullAwk ? "👑限界突破MAX!!" : r.awk ? "覚醒+" + r.awk : "NEW!"}</i></div></div>`;
  }
  /* ★★ 2026-08-22b BLACK SELECT（豪華な黒のプレート）。
     開けると「そのガチャで出るSSR全員」から好きな1体をえらべる。 */
  if (r.type === "select") {
    luxEnsureCSS();
    return `<div class="gm chr veiled s5 luxblk">
      ${cov("SSR", "blk")}
      <div class="gg">✦</div>
      <div class="gn"><b class="gnm">SSR セレクト</b><i class="gst">好きな1体をえらぶ</i></div></div>`;
  }
  /* ★ 2026-08-10 ガチャの中身を刷新（ゴールド廃止 → 育成アイテム） */
  if (r.type === "item") {
    const it = ITEMS[r.item] || { nm: r.item, icon: "◆", c: "#8affc4" };
    return `<div class="gm veiled">${cov("◆", "item")}<div class="gg" style="background:radial-gradient(circle at 35% 30%,#ffffff,${it.c} 60%);color:#1a1430;font-size:26px">${it.icon}</div><div class="gn"><b class="gnm">${it.nm} ×${r.n}</b><i class="gst"></i></div></div>`;
  }
  if (r.type === "ticket") {
    return `<div class="gm veiled">${cov("◆", "item")}<div class="gg" style="background:radial-gradient(circle at 35% 30%,#fff6d8,#ffb020 60%);color:#4a2d00;font-size:26px">🎫</div><div class="gn"><b class="gnm">フェスチケット ×${r.n}</b><i class="gst"></i></div></div>`;
  }
  /* ★ 2026-08-20 🎫ガチャチケット（GRAND DEBUT の中身）。フェス券と<b>券面の色を変える</b> */
  if (r.type === "gticket") {
    return `<div class="gm veiled">${cov("◆", "item")}<div class="gg" style="background:radial-gradient(circle at 35% 30%,#dff4ff,#1a63b8 60%);color:#dff4ff;font-size:26px">🎫</div><div class="gn"><b class="gnm">ガチャチケット ×${r.n}</b><i class="gst"></i></div></div>`;
  }
  if (r.type === "orb") return `<div class="gm veiled">${cov("◆", "item")}<div class="gg" style="background:radial-gradient(circle at 35% 30%,#e8f6ff,#7cc4ff 45%,#1d78d8);color:#0b3a6e"><i class='icc ic-gem'></i></div><div class="gn"><b class="gnm">ジェム ×${r.n}</b><i class="gst"></i></div></div>`;
  return `<div class="gm veiled">${cov("◆", "item")}<div class="gg">G</div><div class="gn"><b class="gnm">ゴールド ×${fmt(r.n)}</b><i class="gst"></i></div></div>`;
}
/* ══════════════════════════════════════════════════════════════
   ガチャ結果の演出（v14.2 で作り直し）
   すぐ中身を出さず、次の3段でじっくり見せる。
     ① レア度公開 … 全セルを「プレート」で覆い、まず <b>SR</b> だけを1枚ずつ出す
     ② 昇格演出   … 本当はSSRだったセルを <b>SR → SSR</b> に昇格させる（虹の閃光＋RANK UP!!）
     ③ 中身公開   … プレートが割れてキャラが出る。10連のSSR確定枠はいちばん最後に見せる
   画面のどこかをタップすれば途中でスキップして結果だけ見られる。
   ══════════════════════════════════════════════════════════════ */
let _revTimers = [];
function _revClear() { _revTimers.forEach(clearTimeout); _revTimers = []; }
/* ══ ★★ 2026-08-26 プレートを<b>いますぐ全部見える状態</b>にする ══
   星のプレートは 95ms おきに1枚ずつ .hide を外して現れる。
   その途中でタップされると _revClear() が保留中のタイマーを消してしまい、
   <b>まだ .hide が外れていないプレートが透明のまま残る</b>。
   そのまま昇格演出が走ると、虹の閃光もリングも RANK UP!! も
   「透明なプレートの上」で起きるので<b>何も見えない</b>（＝報告された不具合）。
   ★ 星の段を飛ばすところでは必ずこれを通すこと。 */
function _revShowCovers(list) {
  const covs = list && list.length ? list
    : [...(($("#gcard") || document).querySelectorAll(".gcov"))];
  covs.forEach((el) => {
    if (!el || el._opened) return;
    el.classList.remove("hide");
    el.classList.add("in");
  });
}
function _revAt(ms, fn) { _revTimers.push(setTimeout(fn, ms)); }
/* ガチャ演出の進行状態
   phase: "stars"   … 星（レア度）のプレートを見せている。TAP! 待ち
          "reveal"  … 昇格演出のアニメ中（もう一度タップで最後まで飛ばす）
          "one"     … ★ 2026-08-05 追加。1枚ずつ開けていく段階。
                       プレートを押せばその枠、それ以外を押せば「次の1枠」が開く。
          "done"    … 演出おわり
   order/opened … "one" のときに使う。開ける順番（確定枠はいちばん最後）と、開け終わった枠。 */
let _rev = { phase: "done", go: null, startOne: null, order: [], opened: null, covs: [], cells: [], sureIdx: -1,
             /* ★ 2026-08-22b up＝開けたときに昇格する枠 ／ results＝結果そのもの（SSRセレクトで使う） */
             up: null, results: [],
             /* ★★ 2026-08-24 ranking＝いま昇格演出を見せている枠の番号（演出中は null 以外）。
                これが無いと、演出の1秒のあいだに次のタップが入った瞬間、
                同じ枠が「昇格ぶんを飛ばして」開いてしまう＝
                <b>演出が出ないまま結果だけSSRになる</b>（実際そうなっていた）。 */
             ranking: null };
/* 画面タップ: 星の表示中なら結果公開へ進み、公開アニメ中なら最後まで飛ばす */
/* プレートを開ける＝「星が結果に変わる」演出。
   ★ v14.4 ここが以前の不具合の元だった:
     ・.gcov.up は `animation: gRankUp ... both` なので、昇格した星は
       アニメの最終キーフレームが residual に残り続ける。CSSの優先順位では
       アニメーション > 通常宣言 なので、あとから .open（opacity:0）を付けても
       <b>星のプレートが消えず、キャラやゴールドの上に乗ったまま</b>になっていた。
     → 開けるときは必ず up を外す。さらに演出が終わったら
       <b>プレートを DOM から取り除く</b>ので、星が残ることが原理的に起きない。
   同時に親セルの veiled を外して、枠色・確定バッジをここで初めて出す。 */
function _revOpen(el, opt) {
  if (!el || el._opened) return;
  el._opened = 1;
  el.classList.remove("up");                 // ★ 残留アニメを断つ（これが無いと星が消えない）
  el.classList.add("open");
  const cell = el.closest(".gm");
  if (cell) {
    cell.classList.remove("veiled");
    /* 星が裏返って中身が出る「1枚のカードがめくれた」感じにする（確定枠は専用の pop 演出にまかせる） */
    if (!(opt && opt.noFlip)) cell.classList.add("reveal");
  }
  /* 演出が終わったら星のプレートごと取り除く＝最後に星が残らない */
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 420);
}
function gachaRevealTap() {
  /* ★ 2026-08-24 昇格演出の最中は受けつけない（演出を飛ばさない） */
  if (_rev.ranking != null) return;
  if (_rev.phase === "stars" && _rev.go) { const f = _rev.go; _rev.go = null; f(); return; }
  if (_rev.phase === "one") { _revOpenNext(); return; }
  /* ★ 2026-08-05: 昇格演出（RANK UP）の最中にタップされたら、
     結果を全部めくるのではなく<b>「1枚ずつ開ける段階」まで早送り</b>する。
     ここで skipGachaReveal を呼ぶと、せっかくの1体ずつが飛んでしまう。 */
  if (_rev.phase === "reveal" && _rev.startOne) { _revClear(); const f = _rev.startOne; _rev.startOne = null; f(); }
}
window.gachaRevealTap = gachaRevealTap;
/* ══ 1枚ずつ開ける（2026-08-05）══
   ・プレートを直接押す → その枠を開ける
   ・それ以外の場所を押す → 順番どおり「次の1枠」を開ける
   ・10連のSSR確定枠だけは、ほかを全部開け終わるまで開かない（最後のお楽しみを守る） */
function _revRemaining() {
  return _rev.order.filter((i) => _rev.opened && !_rev.opened.has(i));
}
function _revPaintProgress() {
  const lead = $("#gRevLead"), rest = _revRemaining();
  /* 次に開く枠だけ、ふわっと上下させて「ここを押す」と分かるようにする */
  _rev.covs.forEach((el) => { if (el) el.classList.remove("wait"); });
  if (rest.length) {
    const el = _rev.covs[rest[0]];
    if (el) el.classList.add("wait");
    if (lead) { lead.classList.remove("up"); lead.textContent = "タップで1体ずつ見る（のこり " + rest.length + "）"; }
  }
}
/* 実際に1枠あける。確定枠は専用の光の演出つき */
function _revOpenIdx(i) {
  if (!_rev.opened || _rev.opened.has(i)) return;
  const el = _rev.covs[i]; if (!el) return;
  /* ══ ★★ 2026-08-22b 昇格は<b>この枠を開けたその瞬間</b>に起こす ══
     SRのプレートが割れる寸前で虹に染まり、リングが3重に走り、
     「RANK UP!!」が浮き上がってから中身が出る。
     ★ ここで return せずに<b>いったん処理を止め</b>、昇格が終わってから
       通常の開封に入る（opened に入れるのも昇格が終わってから）。
       先に opened へ入れると、演出の途中でタップしたときに枠が飛ばされる。 */
  if (_rev.up && _rev.up.has(i) && !el._ranked) {
    el._ranked = 1;
    _rev.up.delete(i);
    /* ★★ 2026-08-26 念のため、この枠のプレートは必ず見える状態にしてから昇格させる。
       （プレートを直接押して開けた場合など、goReveal を通らない経路への保険） */
    el.classList.remove("hide");
    el.classList.add("in");
    /* ★★ 2026-08-24 演出のあいだは「次の1枠」を開けない（_rev.ranking）。
       10連を続けてタップしていると、昇格が始まった直後の指がそのまま
       _revOpenNext() を呼び、up から消えたこの枠を<b>その場で開けて</b>いた。
       ＝ 虹の閃光もリングも RANK UP!! も見えないまま、結果だけSSRになる。 */
    _rev.ranking = i;
    luxEnsureCSS();
    /* 「ここを押す」の揺れ（wait）は止める＝演出中に押させない */
    el.classList.remove("wait");
    const leadUp = $("#gRevLead");
    if (leadUp) { leadUp.classList.add("up"); leadUp.textContent = "✦ RANK UP!! ✦"; }
    const tapUp = $("#gTap"); if (tapUp) tapUp.classList.remove("on");
    /* ★★ 2026-08-26 <b>up</b> も付ける。プレートの中の小さな「RANK UP!!」（.gcup）は
       .gcov.up でしか opacity が上がらないので、いままで<b>一度も出ていなかった</b>。
       見た目の主役は lux-up（虹＋回転）のままで、up は .gcup の文字を出すために足す。
       ★ _revOpen() が開けるときに up を外すので、残留アニメの心配はない。 */
    el.classList.add("lux-up", "up", "s5");
    const st = el.querySelector(".gcst"); if (st) st.textContent = "SSR";
    const cell = _rev.cells[i];
    if (cell) {
      cell.classList.add("lux-upcell");
      for (let k = 0; k < 3; k++) {
        const ring = document.createElement("i");
        ring.className = "lux-ring";
        ring.style.animationDelay = (k * 130) + "ms";
        cell.appendChild(ring);
        setTimeout(() => { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 1200 + k * 130);
      }
      const tx = document.createElement("i");
      tx.className = "lux-uptx"; tx.textContent = "RANK UP!!";
      cell.appendChild(tx);
      setTimeout(() => { if (tx.parentNode) tx.parentNode.removeChild(tx); }, 1250);
    }
    /* ★★ 2026-08-26b ここで画面いっぱいの舞台も立ちあげる。
       マスの中の演出だけだと小さすぎて気づかれなかったため（ご報告）。
       ★ 舞台のほうで閃光を出すので、ここでの luxFlash は舞台にまかせる。 */
    const _rname = (() => {
      const r0 = (_rev.results || [])[i];
      return (r0 && r0.type === "char" && CHARS[r0.id]) ? CHARS[r0.id].nm : "";
    })();
    try { luxRankStage(_rname); } catch (e) { luxFlash("rank"); }
    SFX.crit(); _revAt(220, () => SFX.ss());
    _revAt(620, () => SFX.win());
    /* 昇格を見せきってから中身を開ける（ここで初めてタップを受けつけ直す）
       ★ 待ち時間は舞台の長さ（LUX_STAGE_MS）とそろえる。片方だけ変えないこと。 */
    _revAt(LUX_STAGE_MS, () => {
      _rev.ranking = null;
      el.classList.remove("lux-up", "up");
      const tp = $("#gTap"); if (tp) tp.classList.add("on");
      _revOpenIdx(i);
    });
    return;
  }
  _rev.opened.add(i);
  if (i === _rev.sureIdx) {
    el.classList.add("burst");
    _revOpen(el, { noFlip: true });
    const cell = _rev.cells[i];
    if (cell) { cell.classList.remove("pend"); cell.classList.add("pop"); }
    const bar = $("#gSureBar"); if (bar) bar.classList.add("on");
    SFX.crit(); _revAt(200, () => SFX.ss());
  } else {
    _revOpen(el);
    SFX.hit();
  }
  /* ★★ 2026-08-22b BLACK SELECT の枠を開けたら、そのままえらぶシートを出す */
  const _r = (_rev.results || [])[i];
  if (_r && _r.type === "select" && !_r.picked) {
    luxFlash("black");
    const cellB = _rev.cells[i];
    _revAt(320, () => luxOpenSelect(_r.pool, (id, got) => {
      _r.picked = id || 1;
      if (id && cellB) {
        const c = CHARS[id];
        cellB.className = "gm chr s5 reveal";
        cellB.innerHTML = `<img src="${c.th}" alt="${c.nm}"><div class="gn"><b class="gnm">${charNoText(id)} SSR ${c.nm}</b>`
          + `<i class="gst">${got && got.max ? "→G8,000" : got && got.fullAwk ? "👑限界突破MAX!!" : got && got.awk ? "覚醒+" + got.awk : "NEW!"}</i></div>`;
      }
      try { renderChars(); } catch (e) {}
    }));
  }
  if (_revRemaining().length) { _revPaintProgress(); return; }
  /* 全部あけ終わった */
  _rev.phase = "done";
  /* ★ もう飛ばすものが無いので「まとめて見る」は引っこめる（場所は空けたままにしてOKをズラさない） */
  const sk = $("#gSkipBtn"); if (sk) sk.classList.remove("on");
  const lead = $("#gRevLead");
  if (lead) {
    lead.classList.remove("up");
    lead.textContent = $("#gcard") && $("#gcard")._leadEnd || "結果";
    lead.classList.toggle("s5", !!($("#gcard") && $("#gcard")._leadS5));
  }
  const bar = $("#gSureBar"); if (bar) bar.classList.add("on");
  const ok = $("#gOkBtn"); if (ok) ok.classList.add("on");
  if ($("#gcard") && $("#gcard")._leadAnyChar) SFX.win();
}
function _revOpenNext() {
  if (_rev.ranking != null) return;          /* ★ 2026-08-24 昇格演出の最中は進めない */
  const rest = _revRemaining();
  if (rest.length) _revOpenIdx(rest[0]);
}
/* プレートを直接押したとき（確定枠は最後まで開かない） */
function gachaOpenOne(i, ev) {
  if (ev) ev.stopPropagation();
  if (_rev.ranking != null) return;          /* ★ 2026-08-24 昇格演出の最中は受けつけない */
  if (_rev.phase !== "one") { gachaRevealTap(); return; }
  const rest = _revRemaining();
  if (i === _rev.sureIdx && rest.length > 1) { _revOpenNext(); return; }
  _revOpenIdx(i);
}
window.gachaOpenOne = gachaOpenOne;
/* 演出を最後まで飛ばす */
function skipGachaReveal() {
  const card = $("#gcard");
  if (!card) return;
  _revClear();
  /* ★★ 2026-08-26b 昇格の舞台が出ているところで飛ばされたら、舞台も一緒に片づける */
  try { luxRankStageClear(); } catch (e) {}
  _revShowCovers();   /* ★ 2026-08-26 取り残された .hide を先に外す（下で消すので保険） */
  _rev.phase = "done"; _rev.go = null; _rev.startOne = null; _rev.ranking = null;
  /* ★ スキップ時はアニメを待たず、星のプレートをその場で取り除いて結果だけを出す */
  card.querySelectorAll(".gcov").forEach((el) => {
    const cell = el.closest(".gm");
    if (cell) cell.classList.remove("veiled");
    if (el.parentNode) el.parentNode.removeChild(el);
  });
  card.querySelectorAll(".gmulti .gm").forEach((el) => { el.classList.remove("pend", "reveal"); });
  _rev.opened = null; _rev.order = []; _rev.covs = []; _rev.cells = [];
  const tp = $("#gTap"); if (tp) tp.classList.remove("on");
  const sk = $("#gSkipBtn"); if (sk) sk.classList.remove("on");
  const lead = $("#gRevLead"); if (lead) { lead.classList.remove("up"); lead.textContent = card._leadEnd || "結果"; lead.classList.toggle("s5", !!card._leadS5); }
  const bar = $("#gSureBar"); if (bar) bar.classList.add("on");
  const ok = $("#gOkBtn"); if (ok) ok.classList.add("on");
  /* ★★ 2026-08-22b BLACK SELECT はスキップしても取りこぼさない。
     ここを入れないと「まとめて見る」を押した人だけ、えらぶ機会が消えてしまう。 */
  try {
    const bi = (_rev.results || []).findIndex((r) => r && r.type === "select" && !r.picked);
    if (bi >= 0) {
      const r0 = _rev.results[bi];
      setTimeout(() => luxOpenSelect(r0.pool, (id) => { r0.picked = id || 1; try { paintGacha(); renderChars(); } catch (e) {} }), 420);
    }
  } catch (e) {}
}
window.skipGachaReveal = skipGachaReveal;
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-22b 特別演出（10連のみ・超低確率）
   ------------------------------------------------------------
   ① BLACK SELECT（黒のカード）
      10枠のうち1枠が<b>豪華な黒のプレート</b>になる。
      開けると「そのガチャで出るSSR全員」から<b>好きな1体をえらんで入手</b>できる。
   ② ASTRAL BURST（全枠SSR）
      引いた瞬間にいちど画面が真っ黒になり、そこから特大の演出が立ちあがって、
      <b>10体ぜんぶがSSR</b>（そのガチャのSSRから等確率）で出る。

   決めごと
   ★ どちらも<b>10連のときだけ</b>抽選する（1回・5連では起こらない）。
   ★ ②を先に抽選し、外れたときだけ①を抽選する（同時には起きない）。
   ★ ①は「えらぶ」まで入手が確定しないので、えらばずに閉じても消えないよう
     DB.luxSel に控える。次にガチャ画面を開いたときに出しなおす。
   ★ 見た目（CSS）は luxEnsureCSS() が1回だけ差しこむ。
     MagiBurst と XEVARION のガチャで<b>同じ mb-core.js を読む</b>ので、
     どちらかの CSS ファイルに書くと片方でしか出ない。
   ══════════════════════════════════════════════════════════════ */
const LUX_ALLSSR_CHANCE = 0.0006;   /* ASTRAL BURST（10連ぜんぶSSR） */
const LUX_BLACK_CHANCE  = 0.0035;   /* BLACK SELECT（SSRを1体えらべる黒のカード） */

/* 10連のときだけ抽選する。"" ／ "allssr" ／ "black" */
function luxRoll(n) {
  if (n !== 10) return "";
  if (Math.random() < LUX_ALLSSR_CHANCE) return "allssr";
  if (Math.random() < LUX_BLACK_CHANCE) return "black";
  return "";
}
/* そのガチャで出るSSR全員（登場前・限界突破MAXは外す）。空なら null。 */
function luxPool(pool) {
  const seen = new Set(), out = [];
  (pool || []).forEach((id) => {
    if (!CHARS[id] || seen.has(id)) return;
    try { if (charSecret(id)) return; } catch (e) {}
    if (!isStar5(id)) return;
    seen.add(id); out.push(id);
  });
  return out.length ? out : null;
}
/* ASTRAL BURST: 10体ぜんぶ、そのガチャのSSRから等確率で配る */
function luxAllSSR(pool) {
  const p = luxPool(pool);
  const out = [];
  for (let i = 0; i < 10; i++) {
    const r = p ? grantChar(p[Math.floor(Math.random() * p.length)]) : rollOnce();
    r.lux = "allssr";
    out.push(r);
  }
  /* 最後の1枠は確定枠のまま（見出しの「SSR確定」を消さない） */
  out[out.length - 1].sure = true;
  return out;
}
/* BLACK SELECT の1枠。ここではまだ何も配らない（えらんだときに配る） */
function luxSelectSlot(pool) {
  const p = luxPool(pool);
  if (!p) return null;
  return { type: "select", pool: p, lux: "black" };
}

/* ══ 見た目（1回だけ差しこむ） ══ */
function luxEnsureCSS() {
  if (document.getElementById("luxFxCSS")) return;
  const st = document.createElement("style");
  st.id = "luxFxCSS";
  st.textContent = `
  /* ── 昇格（開けた瞬間） ── */
  .gmulti .gm .gcov.lux-up{background:linear-gradient(150deg,#ff5d8f,#ffd257 28%,#8affc4 52%,#38a6ff 76%,#8e6bff)!important;
    animation:luxUp .95s cubic-bezier(.2,1.25,.35,1) both!important;
    box-shadow:0 0 0 2px rgba(255,255,255,.85),0 0 34px rgba(255,210,87,.95),0 0 78px rgba(255,93,143,.7)!important}
  .gmulti .gm .gcov.lux-up .gcst{color:#fff!important;text-shadow:0 1px 5px rgba(0,0,0,.6),0 0 14px rgba(255,255,255,.95)!important}
  /* ★★ 2026-08-26 プレートの中の小さな「RANK UP!!」（.gcup）。
     もとの .gcov.up .gcup{animation:gRankTx} は、親（.gcov.lux-up）の
     luxUp アニメと重なると<b>opacity が 0 のまま</b>になっていた（実測ずみ）。
     ここで<b>不透明を !important で確定</b>させ、フェードだけをアニメで付ける。 */
  .gmulti .gm .gcov.lux-up .gcup{opacity:1!important;animation:luxUpPlate .95s ease both!important}
  @keyframes luxUpPlate{0%{opacity:0;transform:translateY(7px) scale(.6)}
    26%{opacity:1;transform:translateY(0) scale(1.2)}
    100%{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes luxUp{0%{transform:scale(1) rotateY(0);filter:brightness(1)}
    22%{transform:scale(1.24) rotateY(180deg);filter:brightness(2.6) saturate(1.8)}
    45%{transform:scale(1.1) rotateY(360deg);filter:brightness(1.5)}
    70%{transform:scale(1.17) rotateY(360deg);filter:brightness(2.1)}
    100%{transform:scale(1) rotateY(360deg);filter:brightness(1)}}
  .gmulti .gm.lux-upcell{overflow:visible;z-index:9}
  .gmulti .gm .lux-ring{position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;
    border-radius:50%;border:2.5px solid #ffd257;pointer-events:none;z-index:20;
    animation:luxRing .95s cubic-bezier(.15,.8,.3,1) both}
  @keyframes luxRing{0%{transform:scale(1);opacity:1;border-color:#fff}
    60%{border-color:#ff5d8f}100%{transform:scale(16);opacity:0;border-color:#8e6bff}}
  .gmulti .gm .lux-uptx{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:22;
    font-family:'Orbitron',sans-serif;font-size:13px;font-weight:900;letter-spacing:.06em;white-space:nowrap;
    color:#fff;text-shadow:0 0 10px #ffd257,0 0 26px #ff5d8f,0 2px 5px rgba(0,0,0,.7);pointer-events:none;
    animation:luxUpTx 1.2s ease both}
  @keyframes luxUpTx{0%{opacity:0;transform:translate(-50%,-20%) scale(.5)}
    22%{opacity:1;transform:translate(-50%,-50%) scale(1.25)}
    62%{opacity:1;transform:translate(-50%,-50%) scale(1)}
    100%{opacity:0;transform:translate(-50%,-95%) scale(.95)}}

  /* ══ ★★ 2026-08-26b 昇格の舞台（画面いっぱい） ══
     ★ 結果の画面（#gres）は z-index:600。舞台はその上・閃光（1200）より下に置く。
     ★ pointer-events:none ＝ 押しても消えない／下のタップを邪魔しない。 */
  .lux-stage{position:fixed;inset:0;z-index:1100;pointer-events:none;
    display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 46%,rgba(28,10,44,.62),rgba(4,3,8,.90) 62%);
    animation:luxStgIn .22s ease both}
  @keyframes luxStgIn{from{opacity:0}to{opacity:1}}
  .lux-stage.out{animation:luxStgOut .3s ease both}
  @keyframes luxStgOut{from{opacity:1}to{opacity:0}}
  /* 後ろでまわる光の筋。go が付く（＝SSRになる）と一気に明るくなる */
  .lux-stgrays{position:absolute;left:50%;top:46%;width:150vmax;height:150vmax;
    margin:-75vmax 0 0 -75vmax;opacity:.28;
    background:conic-gradient(from 0deg,transparent 0deg,rgba(255,210,87,.85) 6deg,transparent 12deg,
      transparent 30deg,rgba(255,93,143,.75) 36deg,transparent 42deg,
      transparent 60deg,rgba(56,166,255,.75) 66deg,transparent 72deg,
      transparent 90deg,rgba(138,255,196,.75) 96deg,transparent 102deg,
      transparent 120deg,rgba(255,210,87,.85) 126deg,transparent 132deg,
      transparent 150deg,rgba(255,93,143,.75) 156deg,transparent 162deg,
      transparent 180deg,rgba(56,166,255,.75) 186deg,transparent 192deg,
      transparent 210deg,rgba(138,255,196,.75) 216deg,transparent 222deg,
      transparent 240deg,rgba(255,210,87,.85) 246deg,transparent 252deg,
      transparent 270deg,rgba(255,93,143,.75) 276deg,transparent 282deg,
      transparent 300deg,rgba(56,166,255,.75) 306deg,transparent 312deg,
      transparent 330deg,rgba(138,255,196,.75) 336deg,transparent 342deg,transparent 360deg);
    animation:luxStgSpin 9s linear infinite;transition:opacity .4s ease}
  .lux-stage.go .lux-stgrays{opacity:.72}
  @keyframes luxStgSpin{to{transform:rotate(360deg)}}
  .lux-stgbox{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:10px;
    padding:0 18px;text-align:center}
  .lux-stgtop{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:900;letter-spacing:.34em;
    color:#c9c4e8;text-indent:.34em;opacity:0;animation:luxStgTop 1.5s ease both}
  @keyframes luxStgTop{0%{opacity:0;transform:translateY(6px)}14%{opacity:.9;transform:none}
    76%{opacity:.9}100%{opacity:0}}
  /* まん中の大きなプレート。SR（灰）から回って SSR（虹）になる */
  .lux-stgcard{width:min(184px,46vw);aspect-ratio:3/4;border-radius:20px;
    display:flex;align-items:center;justify-content:center;
    background:linear-gradient(150deg,#3b3a52,#6a6880 45%,#2a2938);
    box-shadow:inset 0 0 0 3px rgba(255,255,255,.30),inset 0 -18px 34px rgba(0,0,0,.4),0 18px 46px rgba(0,0,0,.6);
    animation:luxStgFlip 1.45s cubic-bezier(.2,1.15,.35,1) both}
  .lux-stgcard.s5{background:linear-gradient(150deg,#ff5d8f,#ffd257 28%,#8affc4 52%,#38a6ff 76%,#8e6bff);
    box-shadow:inset 0 0 0 3px rgba(255,255,255,.85),0 0 46px rgba(255,210,87,.95),0 0 120px rgba(255,93,143,.75)}
  @keyframes luxStgFlip{
    0%{opacity:0;transform:perspective(900px) rotateY(0) scale(.62)}
    10%{opacity:1;transform:perspective(900px) rotateY(0) scale(1)}
    22%{transform:perspective(900px) rotateY(0) scale(1.04)}
    36%{transform:perspective(900px) rotateY(180deg) scale(1.1);filter:brightness(2.6)}
    52%{transform:perspective(900px) rotateY(360deg) scale(1.16);filter:brightness(1.6)}
    68%{transform:perspective(900px) rotateY(360deg) scale(1.05);filter:brightness(1.9)}
    100%{transform:perspective(900px) rotateY(360deg) scale(1);filter:brightness(1)}}
  .lux-stgrar{font-family:'Orbitron',sans-serif;font-weight:900;font-size:38px;letter-spacing:.03em;
    color:#e6e4f2;text-shadow:0 2px 8px rgba(0,0,0,.7)}
  .lux-stgcard.s5 .lux-stgrar{color:#fff;
    text-shadow:0 2px 8px rgba(0,0,0,.55),0 0 26px rgba(255,255,255,.95)}
  /* 大きな RANK UP!! ＝ ここが「演出が出た」と分かる決め手 */
  .lux-stgtx{font-family:'Orbitron',sans-serif;font-weight:900;letter-spacing:.06em;white-space:nowrap;
    font-size:clamp(26px,8.5vw,44px);color:#fff;opacity:0;
    text-shadow:0 0 16px #ffd257,0 0 44px #ff5d8f,0 3px 10px rgba(0,0,0,.75);
    animation:luxStgTx 1.45s cubic-bezier(.2,1.3,.4,1) both}
  @keyframes luxStgTx{0%,32%{opacity:0;transform:translateY(16px) scale(.6)}
    46%{opacity:1;transform:translateY(0) scale(1.22)}
    58%{transform:translateY(0) scale(1)}
    88%{opacity:1;transform:translateY(0) scale(1)}
    100%{opacity:0;transform:translateY(-10px) scale(.98)}}
  .lux-stgnm{font-size:13px;font-weight:900;color:#ffd257;opacity:0;
    text-shadow:0 2px 8px rgba(0,0,0,.8);animation:luxStgNm 1.45s ease both}
  @keyframes luxStgNm{0%,40%{opacity:0}54%{opacity:1}88%{opacity:1}100%{opacity:0}}

  /* ── 画面ぜんたいの閃光 ── */
  .lux-flash{position:fixed;inset:0;z-index:1200;pointer-events:none;mix-blend-mode:screen}
  .lux-flash.rank{background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.95),rgba(255,210,87,.45) 34%,transparent 66%);
    animation:luxFl .62s ease-out both}
  .lux-flash.black{background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.9),rgba(200,160,255,.4) 30%,transparent 64%);
    animation:luxFl .8s ease-out both}
  @keyframes luxFl{0%{opacity:0}12%{opacity:1}100%{opacity:0}}

  /* ── BLACK SELECT のプレート ── */
  .gmulti .gm .gcov.blk{background:
      radial-gradient(circle at 30% 22%,rgba(255,255,255,.30),transparent 42%),
      linear-gradient(150deg,#000 0%,#141018 38%,#2a1c34 55%,#0a0a0f 78%,#000 100%)!important;
    box-shadow:inset 0 0 0 1.5px rgba(226,196,110,.9),0 0 22px rgba(0,0,0,.9),0 0 40px rgba(190,150,255,.45)!important;
    animation:luxBlkIdle 2.4s ease-in-out infinite}
  .gmulti .gm .gcov.blk .gcst{color:#e8d49a!important;
    text-shadow:0 0 10px rgba(232,212,154,.9),0 1px 3px #000!important}
  .gmulti .gm .gcov.blk::after{content:"";position:absolute;inset:0;border-radius:11px;pointer-events:none;
    background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.55) 48%,transparent 58%);
    background-size:260% 100%;animation:luxShine 2.4s linear infinite}
  @keyframes luxShine{0%{background-position:180% 0}100%{background-position:-80% 0}}
  @keyframes luxBlkIdle{0%,100%{filter:brightness(1)}50%{filter:brightness(1.28)}}
  .gmulti .gm.luxblk .gg{background:
      radial-gradient(circle at 35% 28%,rgba(255,255,255,.22),transparent 46%),
      linear-gradient(150deg,#0a0a0f,#241a30 55%,#000)!important;
    color:#e8d49a!important;font-size:26px;box-shadow:inset 0 0 0 1.5px rgba(226,196,110,.8)}

  /* ── SSRセレクトのシート ── */
  .luxsel{position:fixed;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center;
    padding:16px;background:rgba(4,3,8,.92);backdrop-filter:blur(8px);opacity:0;transition:opacity .35s ease}
  .luxsel.on{opacity:1}
  .luxsel-card{position:relative;width:100%;max-width:520px;max-height:100%;overflow-y:auto;border-radius:20px;
    padding:20px 16px 18px;text-align:center;
    background:radial-gradient(circle at 50% 0%,#241a30,#0b0910 62%,#000);
    box-shadow:inset 0 0 0 1.5px rgba(226,196,110,.75),0 24px 70px rgba(0,0,0,.9);
    transform:translateY(14px) scale(.97);transition:transform .38s cubic-bezier(.2,.9,.3,1)}
  .luxsel.on .luxsel-card{transform:none}
  .luxsel-cap{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:900;letter-spacing:.24em;color:#e8d49a}
  .luxsel-ttl{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;letter-spacing:.05em;margin-top:4px;
    background:linear-gradient(100deg,#fff,#e8d49a 40%,#fff 60%,#c9a6ff);
    -webkit-background-clip:text;background-clip:text;color:transparent;
    background-size:220% 100%;animation:luxShine 3.2s linear infinite}
  .luxsel-sub{font-size:11.5px;font-weight:800;color:#bfb6e6;margin-top:6px;line-height:1.7}
  .luxsel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;margin:14px 0 6px}
  .luxsel-c{position:relative;border:none;padding:0;cursor:pointer;border-radius:12px;overflow:hidden;
    background:linear-gradient(160deg,#1b1524,#0a0810);box-shadow:inset 0 0 0 1.5px rgba(226,196,110,.5)}
  .luxsel-c img{display:block;width:100%;aspect-ratio:1;object-fit:cover}
  .luxsel-c b{display:block;font-size:9.5px;font-weight:900;color:#f2e6c4;padding:4px 2px 5px;line-height:1.2}
  .luxsel-c i{position:absolute;right:3px;top:3px;font-style:normal;font-size:8.5px;font-weight:900;
    padding:2px 5px;border-radius:99px;background:rgba(0,0,0,.72);color:#8affc4}
  .luxsel-c.sel{box-shadow:inset 0 0 0 2.5px #ffd257,0 0 22px rgba(255,210,87,.7)}
  .luxsel-c:active{transform:scale(.97)}
  .luxsel-go{width:100%;margin-top:10px;border:none;border-radius:14px;padding:14px;cursor:pointer;
    font-size:15px;font-weight:900;letter-spacing:.04em;color:#1a1206;
    background:linear-gradient(135deg,#e8d49a,#ffd257 55%,#e2a94a);box-shadow:0 10px 26px rgba(226,196,110,.35)}
  .luxsel-go[disabled]{background:rgba(255,255,255,.12);color:rgba(255,255,255,.4);cursor:default;box-shadow:none}
  /* ★ 2026-08-26「まだ使用しない」。えらぶボタンと取りちがえないよう、うすい枠だけにする */
  .luxsel-cancel{width:100%;margin-top:8px;border:1.5px solid rgba(255,255,255,.28);border-radius:14px;
    padding:12px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:800;
    color:rgba(255,255,255,.82);background:rgba(255,255,255,.06)}
  .luxsel-cancel:active{transform:translateY(1px)}
  .luxsel-note{font-size:10px;font-weight:700;color:#8e88ad;margin-top:9px;line-height:1.75}

  /* ── ASTRAL BURST（幕・背景） ── */
  .luxcur{position:fixed;inset:0;z-index:1300;background:#000;pointer-events:none;
    display:flex;align-items:center;justify-content:center;overflow:hidden}
  .luxcur .bg{position:absolute;left:50%;top:50%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;
    background:conic-gradient(from 0deg,rgba(255,93,143,.30) 0 5deg,transparent 5deg 18deg,
      rgba(255,210,87,.28) 18deg 23deg,transparent 23deg 36deg,rgba(56,166,255,.26) 36deg 41deg,transparent 41deg 54deg);
    animation:luxSpin 9s linear infinite;opacity:0}
  .luxcur.go .bg{opacity:1;transition:opacity .8s ease}
  @keyframes luxSpin{to{transform:rotate(360deg)}}
  .luxcur .rays{position:absolute;inset:0;opacity:0;
    background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.9),rgba(255,210,87,.25) 22%,transparent 52%)}
  .luxcur.go .rays{animation:luxRays 2.6s ease-in-out both}
  @keyframes luxRays{0%{opacity:0;transform:scale(.2)}35%{opacity:1;transform:scale(1)}
    70%{opacity:.55;transform:scale(1.1)}100%{opacity:0;transform:scale(1.5)}}
  .luxcur .tx{position:relative;z-index:2;text-align:center;opacity:0}
  .luxcur.go .tx{animation:luxTx 2.6s cubic-bezier(.2,1,.3,1) both}
  @keyframes luxTx{0%{opacity:0;transform:scale(2.4);filter:blur(14px)}
    26%{opacity:1;transform:scale(1);filter:blur(0)}
    76%{opacity:1;transform:scale(1.04)}100%{opacity:0;transform:scale(1.1)}}
  .luxcur .tx b{display:block;font-family:'Orbitron',sans-serif;font-size:min(11vw,52px);font-weight:900;
    letter-spacing:.1em;background:linear-gradient(100deg,#fff,#ffd257 30%,#ff5d8f 50%,#8affc4 70%,#38a6ff);
    -webkit-background-clip:text;background-clip:text;color:transparent;
    background-size:240% 100%;animation:luxShine 2.2s linear infinite;
    filter:drop-shadow(0 0 26px rgba(255,210,87,.85))}
  .luxcur .tx span{display:block;margin-top:10px;font-size:min(4.2vw,17px);font-weight:900;letter-spacing:.3em;color:#e8d49a}
  .luxcur .rings i{position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;
    border:3px solid rgba(255,210,87,.85)}
  .luxcur.go .rings i{animation:luxRing 2.2s cubic-bezier(.15,.8,.3,1) infinite}

  /* 結果カードそのものを「超豪華」にする */
  .gcard.luxall{background:
      radial-gradient(circle at 50% -10%,rgba(255,210,87,.30),transparent 55%),
      radial-gradient(circle at 50% 110%,rgba(142,107,255,.32),transparent 58%),
      linear-gradient(165deg,#150f22,#0a0714 60%,#000)!important;
    box-shadow:inset 0 0 0 2px rgba(255,210,87,.7),0 0 70px rgba(255,93,143,.35)!important}
  .gcard.luxall::before{content:"";position:absolute;left:50%;top:-40%;width:180%;aspect-ratio:1;
    transform:translateX(-50%);pointer-events:none;z-index:0;
    background:conic-gradient(from 0deg,rgba(255,210,87,.16) 0 5deg,transparent 5deg 20deg);
    animation:luxSpin 26s linear infinite}
  .gcard.luxall > *{position:relative;z-index:1}
  .gcard.luxall .gt{color:#ffe6a8}
  .luxbadge{display:block;margin:2px auto 0;font-family:'Orbitron',sans-serif;font-size:11px;font-weight:900;
    letter-spacing:.22em;color:#ffd257;text-shadow:0 0 14px rgba(255,210,87,.9)}
  `;
  document.head.appendChild(st);
}
/* 画面ぜんたいの閃光を1枚だけ走らせる */
function luxFlash(kind) {
  luxEnsureCSS();
  const el = document.createElement("div");
  el.className = "lux-flash " + (kind || "rank");
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
}
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-26b 昇格（RANK UP）は<b>画面いっぱいの舞台</b>で見せる（ご指定）
   ------------------------------------------------------------
   これまでの昇格演出は、結果の<b>マスの中だけ</b>で起きていた。
   虹に染まる・リングが走る・RANK UP!! が浮く——中身はちゃんと動いているのだが、
   10連のマスは 80px 角しかなく、しかも1秒で終わる。
   ＝ 気づかないうちに終わり、<b>結果だけが SSR になって見える</b>
     （「ランクアップはしているのに演出が出ない」というご報告の正体）。

   → マスの演出（lux-up・リング・RANK UP!!）は<b>そのまま残し</b>、
     その上に<b>画面ぜんたいの舞台</b>を重ねる。
       ① 画面が暗く沈み、後ろで光の筋がまわる
       ② まん中の大きなプレートが <b>SR</b> を見せる
       ③ プレートが回って割れ、<b>虹の SSR</b> になる（ここで閃光）
       ④ 「RANK UP!!」が大きく出て、すっと引く

   決めごと
   ★ <b>押しても消えない</b>（pointer-events:none）。指が当たって飛ばされないようにする。
   ★ #gres（結果の画面 z-index:600）より<b>上</b>に出す。
   ★ 舞台が終わってから中身を開ける。所要は LUX_STAGE_MS（この1か所で決める）。
   ══════════════════════════════════════════════════════════════ */
const LUX_STAGE_MS = 1750;          /* 舞台の長さ。_revOpenIdx の待ち時間もこれに合わせる */
function luxRankStage(nm) {
  luxEnsureCSS();
  const st = document.createElement("div");
  st.className = "lux-stage";
  st.innerHTML = '<i class="lux-stgrays"></i>'
    + '<div class="lux-stgbox">'
    +   '<div class="lux-stgtop">RARITY UP</div>'
    +   '<div class="lux-stgcard"><b class="lux-stgrar">SR</b></div>'
    +   '<div class="lux-stgtx">RANK UP!!</div>'
    +   '<div class="lux-stgnm">' + (nm ? nm : "") + '</div>'
    + '</div>';
  document.body.appendChild(st);
  const card = st.querySelector(".lux-stgcard");
  const rar = st.querySelector(".lux-stgrar");
  /* プレートが裏を向いた瞬間に SR → SSR へ差し替える（＝返ったときには SSR になっている） */
  const t1 = setTimeout(() => {
    if (card) card.classList.add("s5");
    if (rar) rar.textContent = "SSR";
    st.classList.add("go");
    try { luxFlash("rank"); } catch (e) {}
  }, 520);
  const t2 = setTimeout(() => { st.classList.add("out"); }, LUX_STAGE_MS - 300);
  const t3 = setTimeout(() => { if (st.parentNode) st.parentNode.removeChild(st); }, LUX_STAGE_MS + 60);
  /* 途中で結果画面を閉じられたら、舞台も道連れにする（画面に置き去りにしない） */
  st._kill = () => {
    clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    if (st.parentNode) st.parentNode.removeChild(st);
  };
  return st;
}
/* 出しっぱなしの舞台を片づける（closeGres・スキップから呼ぶ） */
function luxRankStageClear() {
  document.querySelectorAll(".lux-stage").forEach((el) => {
    if (el._kill) el._kill(); else if (el.parentNode) el.parentNode.removeChild(el);
  });
}

/* ══ BLACK SELECT: 好きなSSRを1体えらぶ ══
   ★ えらぶまで入手が確定しないので、DB.luxSel に控えて<b>閉じても消えない</b>ようにする。
     ページを読み込み直しても、ガチャ画面を開いたときに出しなおす（paintGacha の末尾）。 */
function luxSaveSel(pool, from) {
  DB.luxSel = { pool: pool.slice(), from: from || "", at: Date.now() };
  save();
}
/* ★★ 2026-08-26 第3引数 opt を足した（ご指定: 券をえらんでから「まだ使用しない」を選べるように）。
     opt.cancel … このラベルのボタンを下に出す。押すと onPick(null) で<b>何も使わずに</b>閉じる。
     opt.cap / opt.ttl / opt.sub … 見出し・説明の差し替え（券のときは BLACK SELECT ではない）。
   ★ BLACK SELECT（DB.luxSel）は opt を渡さない＝これまでどおり<b>えらぶまで閉じられない</b>。
     あちらは「引いた結果」なので、閉じられると受け取り損ねてしまう。 */
function luxOpenSelect(pool, onPick, opt) {
  luxEnsureCSS();
  opt = opt || {};
  const list = (pool || []).filter((id) => CHARS[id]);
  if (!list.length) { if (onPick) onPick(null); return; }
  const old = document.getElementById("luxSelOv"); if (old) old.remove();
  let sel = null;
  const ov = document.createElement("div");
  ov.id = "luxSelOv"; ov.className = "luxsel";
  const cells = list.map((id) => {
    const c = CHARS[id];
    const awk = (DB.chars[id] && (DB.chars[id].awk || 0)) | 0;
    const own = !!DB.chars[id];
    return `<button class="luxsel-c" data-id="${id}">
      <img src="${c.th}" alt="${c.nm}" loading="lazy">
      <i>${own ? (awk >= MAX_AWK ? "MAX" : "+" + awk) : "NEW"}</i>
      <b>${c.nm}</b></button>`;
  }).join("");
  ov.innerHTML = `<div class="luxsel-card">
    <div class="luxsel-cap">${opt.cap || "BLACK SELECT"}</div>
    <div class="luxsel-ttl">${opt.ttl || "SSR セレクト"}</div>
    <div class="luxsel-sub">${opt.sub || ("このガチャで出る <b>SSR " + list.length + "体</b>から、<b>好きな1体</b>をえらんで手に入れられます。<br>"
      + "すでに持っているキャラをえらぶと<b>限界突破</b>が進みます。")}</div>
    <div class="luxsel-grid">${cells}</div>
    <button class="luxsel-go" id="luxSelGo" disabled>キャラをえらんでください</button>
    ${opt.cancel ? `<button class="luxsel-cancel" id="luxSelNo">${opt.cancel}</button>` : ""}
    <div class="luxsel-note">${opt.note || "※ えらぶまで確定しません。閉じてしまっても、次にガチャ画面を開いたときにここへ戻ります。"}</div>
  </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add("on"));
  const go = ov.querySelector("#luxSelGo");
  /* ★ 2026-08-26「まだ使用しない」。<b>券を減らさずに</b>閉じる（onPick(null)）。 */
  const no = ov.querySelector("#luxSelNo");
  if (no) {
    no.onclick = () => {
      ov.classList.remove("on");
      setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 360);
      if (onPick) onPick(null);
    };
  }
  ov.querySelectorAll(".luxsel-c").forEach((b) => {
    b.onclick = () => {
      ov.querySelectorAll(".luxsel-c").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
      sel = b.getAttribute("data-id");
      go.disabled = false;
      go.textContent = "「" + CHARS[sel].nm + "」を手に入れる";
      try { SFX.pick(); } catch (e) {}
    };
  });
  go.onclick = () => {
    if (!sel) return;
    const got = grantChar(sel);
    delete DB.luxSel;
    saveNow(); try { paintWallet(); } catch (e) {}
    luxFlash("black");
    try { SFX.win(); } catch (e) {}
    ov.classList.remove("on");
    setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 360);
    if (onPick) onPick(sel, got);
  };
}
/* 未受け取りの BLACK SELECT があれば出しなおす（ガチャ画面を開いたとき） */
function luxResume() {
  const s = DB.luxSel;
  if (!s || !Array.isArray(s.pool) || !s.pool.length) return;
  const pool = luxPool(s.pool);
  if (!pool) { delete DB.luxSel; save(); return; }
  luxOpenSelect(pool, () => { try { paintGacha(); renderChars(); } catch (e) {} });
}
window.luxResume = luxResume;

/* ══ ASTRAL BURST: 引いた瞬間の「画面が真っ黒 → 特大の演出」 ══
   done() を呼ぶと結果表示へ進む。 */
function luxAstralIntro(done) {
  luxEnsureCSS();
  const old = document.getElementById("luxCurtain"); if (old) old.remove();
  const cur = document.createElement("div");
  cur.id = "luxCurtain"; cur.className = "luxcur";
  cur.innerHTML = `<div class="bg"></div><div class="rays"></div>
    <div class="rings"><i style="animation-delay:0ms"></i><i style="animation-delay:420ms"></i><i style="animation-delay:840ms"></i></div>
    <div class="tx"><b>ASTRAL BURST</b><span>ALL SSR</span></div>`;
  document.body.appendChild(cur);
  try { SFX.crit(); } catch (e) {}
  /* まず「真っ黒」だけを見せる（ここが効く。いきなり光ると黒が伝わらない） */
  setTimeout(() => {
    cur.classList.add("go");
    try { SFX.ss(); } catch (e) {}
    setTimeout(() => { try { SFX.crit(); } catch (e) {} }, 700);
    setTimeout(() => { try { SFX.win(); } catch (e) {} }, 1500);
  }, 620);
  setTimeout(() => {
    cur.style.transition = "opacity .5s ease";
    cur.style.opacity = "0";
    setTimeout(() => { if (cur.parentNode) cur.parentNode.removeChild(cur); }, 520);
    if (done) done();
  }, 3300);
}
function revealGacha(results, title) {
  _revClear();
  _rev = { phase: "done", go: null, startOne: null, order: [], opened: null, covs: [], cells: [], sureIdx: -1,
           /* ★★ 2026-08-26 ranking を書き忘れていた。
              ここで作り直す _rev には ranking が無く undefined になっていたので、
              startOne が null を入れるまでのあいだ「昇格演出中」の判定が効かなかった。 */
           up: null, results: results || [], ranking: null };
  saveNow(); paintWallet(); paintGacha(); SFX.gacha();   // ガチャ結果は即クラウドへ
  const ov = $("#gres"), ball = $("#gball"), card = $("#gcard");
  const cf = $("#gcf"), cfring = $("#gcfring");
  ov.classList.add("on"); ov.classList.remove("cfon");
  ball.style.display = "block"; card.style.display = "none"; card.className = "gcard";
  ball.className = "gball"; cf.className = "gcf"; cf.textContent = ""; cfring.className = "gcfring";

  /* ── 確定演出（ボールの色）──
     排出はすでに確定しているので、その内容に応じてボールの色を変える＝色が出た時点で保証される。
     虹: SSR確定 ／ 金: キャラ確定 ／ 無色: アイテムのみ。 */
  const hasS5 = results.some((r) => r.type === "char" && isStar5(r.id));
  const hasAnyChar = results.some((r) => r.type === "char");
  /* ★★ 2026-08-22b ASTRAL BURST（10枠ぜんぶSSR）。
     ボールの確定演出はやらず、<b>いちど画面を真っ黒</b>にしてから特大の演出を立ちあげる。
     結果カードそのものも .luxall で背景ごと豪華にする。 */
  const luxAll = results.length >= 10 && results.every((r) => r.lux === "allssr");
  if (luxAll) { luxEnsureCSS(); ball.style.display = "none"; card.className = "gcard luxall"; }
  let openDelay = 1150;
  if (!luxAll && (hasS5 || hasAnyChar)) {
    const tier = hasS5 ? "rainbow" : "gold";
    openDelay = hasS5 ? 2300 : 1750;
    _revAt(700, () => {
      ov.classList.add("cfon");
      ball.classList.add("cf-" + tier);
      cf.classList.add("on", tier);
      cf.textContent = hasS5 ? "SSR 確定!!" : "キャラ 確定!";
      cfring.className = "gcfring on";
      cfring.style.borderColor = hasS5 ? "#ff5d8f" : "#ffd257";
      SFX.crit();
      if (hasS5) _revAt(260, () => SFX.ss());
    });
  }

  const sureIdx = results.findIndex((r) => r.sure);
  /* ★ どのSSRを「昇格演出」で見せるかを先に抽選する（RANK UP は稀な演出）。
     昇格しないSSRは、最初からSSRのプレートで出す。 */
  const upSet = new Set();
  results.forEach((r, i) => {
    if (r.type !== "char" || !isStar5(r.id)) return;
    /* ★ v14.4 確定枠は「SSRが保証された枠」なので昇格演出はしない（最初からSSRの星で出す）。 */
    if (r.sure) return;
    /* ★ ASTRAL BURST は全部SSRなので昇格そのものが起きない */
    if (r.lux === "allssr") return;
    if (Math.random() < RANKUP_CHANCE) upSet.add(i);
  });
  const _showCard = () => {
    ball.style.display = "none"; card.style.display = "flex";
    ov.classList.remove("cfon"); cf.className = "gcf"; cfring.className = "gcfring";
    const leadEnd = luxAll ? "✦✦ ALL SSR ✦✦" : hasS5 ? "✦ SSR 獲得！ ✦" : hasAnyChar ? "キャラ獲得！" : "結果";
    card._leadEnd = leadEnd; card._leadS5 = hasS5; card._leadAnyChar = hasAnyChar;
    /* 1回でも５連でも同じグリッド表示（1回は1セルが中央に出るだけ）＝見た目の差をつけない */
    card.innerHTML = `<div class="gt">${title}</div>
      ${luxAll ? '<span class="luxbadge">ASTRAL BURST</span>' : ""}
      <div class="grevlead" id="gRevLead">レア度を確認中…</div>
      <div class="gmulti n${results.length}">${results.map((r, i) => gachaCellHTML(r, i, upSet.has(i))).join("")}</div>
      <div class="gtap" id="gTap">TAP<span>!</span></div>
      ${sureIdx >= 0 ? '<div class="gsurebar" id="gSureBar">✦ 最後の1枠は <b>SSR 確定</b> ✦</div>' : ""}
      ${results.length > 1 ? '<button class="gskip" id="gSkipBtn" onclick="event.stopPropagation();skipGachaReveal()">▶▶ まとめて見る</button>' : ""}
      <button class="gok" id="gOkBtn" onclick="closeGres()">OK</button>`;
    const covs = [...card.querySelectorAll(".gcov")];
    const cells = [...card.querySelectorAll(".gmulti .gm")];
    const lead = $("#gRevLead"), tap = $("#gTap");
    /* ── ① 星（レア度）の公開: プレートを1枚ずつ出す ── */
    _rev.phase = "stars";
    let t = 0;
    covs.forEach((el) => {
      el.classList.add("hide");
      _revAt(t, () => { el.classList.remove("hide"); el.classList.add("in"); SFX.pick(); });
      t += 95;
    });
    /* ── ② TAP! を出して待つ（ここでいったん手をとめて星を見せる）── */
    _revAt(t + 280, () => {
      if (lead) lead.textContent = "タップで結果を見る";
      if (tap) tap.classList.add("on");
      SFX.pick();
    });
    /* タップされたら③へ。放置されても 8 秒で自動で進む（止まったままにならないように） */
    const goReveal = () => {
      _revClear();
      /* ★★ 2026-08-26 _revClear() で「.hide を外す」タイマーごと消えるので、
         ここで<b>取り残されたプレートを全部出しきる</b>。
         これが無いと、早くタップした人には昇格演出がまったく見えない。 */
      _revShowCovers(covs);
      _rev.phase = "reveal"; _rev.go = null;
      if (tap) tap.classList.remove("on");
      let u = 0;
      /* ══ ★★ 2026-08-22b 昇格演出をつくり直した（ご指定）══
         ------------------------------------------------------------
         前は、中身を開ける<b>前</b>に「✦ 昇格演出 ✦」と上に出して、
         昇格する枠を<b>まとめて先に光らせて</b>いた。
         ・どれがSSRなのかが開ける前に分かってしまう＝1枚ずつ開ける楽しみが消える
         ・見出しが「昇格演出」という<b>裏方の名前</b>のまま画面に出ていた
         → この段はまるごと廃止し、<b>その枠を開けたその瞬間</b>に昇格するようにした
           （実際の昇格は _revOpenIdx の中。演出はそちらでうんと豪華にしてある）。
         ★ upSet は「開けたときに昇格する枠」の印として、そのまま生かす。 */
      /* ── ③-b 中身公開: ★ 2026-08-05 から「1枚ずつ、押すたびに1枠」開ける ──
         以前は 80ms 間隔で勝手に全部めくれていたので、
         せっかくの1体1体を見るひまがなかった。 */
      const startOne = () => {
        _rev.phase = "one";
        _rev.startOne = null;
        _rev.opened = new Set();
        _rev.covs = covs;
        _rev.cells = cells;
        _rev.sureIdx = sureIdx;
        _rev.up = new Set(upSet);      /* ★ 2026-08-22b 開けたときに昇格する枠 */
        _rev.ranking = null;           /* ★ 2026-08-24 前の回の演出中フラグを引きずらない */
        /* 開ける順番＝並び順。ただしSSR確定枠だけはいちばん最後 */
        _rev.order = covs.map((el, i) => i).filter((i) => i !== sureIdx);
        if (sureIdx >= 0) _rev.order.push(sureIdx);
        _revPaintProgress();
        if (tap) tap.classList.add("on");
        /* 10連を10回タップするのがつらい人のために「まとめて見る」も残す */
        const sk = $("#gSkipBtn"); if (sk && _rev.order.length > 1) sk.classList.add("on");
      };
      _rev.startOne = startOne;   // 昇格演出をタップで早送りしたときの行き先
      _revAt(u, startOne);
    };
    _rev.go = goReveal;
    _revAt(t + 280 + 8000, () => { if (_rev.phase === "stars" && _rev.go) { _rev.go = null; goReveal(); } });
  };
  /* ASTRAL BURST は「真っ黒 → 特大の演出」が終わってから結果カードを出す */
  if (luxAll) luxAstralIntro(_showCard); else _revAt(openDelay, _showCard);
}
/* SSR を1体確定で引く。
   ★ 確定枠は「排出対象のSSRすべてが同じ確率」。ピックアップ優遇はしない
     （ピックアップ優遇は通常抽選の9回ぶんで効いているため、確定枠は公平に配る）。 */
function rollGuaranteedS5() {
  const pool = gachaPool();
  if (!pool.length) return rollOnce();          // 全員が限界突破MAX＝確定枠は通常抽選に戻す
  return grantChar(pool[Math.floor(Math.random() * pool.length)]);
}
/* ══════════ ★ 2026-08-20 GRAND DEBUT GACHA の抽選 ══════════
   ★★ 2026-08-20c ご指定により<b>キャラの排出と確定枠はフェスとまったく同じしくみ</b>にした
     （アイテム枠の中身だけは GRAND DEBUT 専用のまま）。
   ・SSR 合計15%   … <b>GRAND DEBUT のキャラ</b>で等分（ピックアップなし）
     ★★ 2026-08-25 ご指定で 10% → <b>15%</b>（DEBUT_S5_TOTAL）。
   ・SSR 合計5%    … <b>プレミアムのSSR</b>も「すり抜け」で出る（FES_PREMIUM_TOTAL）
   ・SR  合計50%   … STAR4_POOL で等分（フェスと同じ50%。プレミアムは55%）
   ・残り30%       … DEBUT_ITEM_TABLE（GRAND DEBUT 専用の中身）
   ★ <b>逆向きの約束は変わらない</b>——GRAND DEBUT のキャラは DEBUT_CHARS にしか居ないので、
     フェスやプレミアムの抽選（gachaPool＝PREMIUM_CHARS を見る）には今までどおり出ない。 */
function debutRollOnce(mode) {
  /* ★★ 2026-08-26 版ごとの抽選。合計15%は<b>その版のキャラだけ</b>で等分する
     （2本並んでいるとき、片方の版を回して別の版のキャラが出てはいけない）。 */
  const pool = debutPoolOf(mode || "debut");
  let r = Math.random();
  const each = debutEachRateOf(mode || "debut");
  for (const o of pool) { if (r < each) return grantChar(o); r -= each; }        // 新キャラSSR（等分・合計15%）
  /* プレミアムのSSR（等分・合計5%）＝フェスと同じすり抜け */
  const prem = gachaPool().filter((id) => pool.indexOf(id) < 0);
  const pEach = prem.length ? FES_PREMIUM_TOTAL / prem.length : 0;
  for (const o of prem) { if (r < pEach) return grantChar(o); r -= pEach; }
  const s4 = STAR4_POOL.length ? 0.50 / STAR4_POOL.length : 0;                  // SR枠（フェスと同じ50%）
  for (const s of STAR4_POOL) { if (r < s4) return grantChar(s); r -= s4; }
  return rollGachaItem(Math.random() * DEBUT_ITEM_P, DEBUT_ITEM_TABLE);         // 残り30%＝GRAND DEBUT の中身
}
/* 10連の確定枠の母集団。フェス（fesSurePool）と同じで、
   <b>GRAND DEBUT のキャラ ＋ プレミアムのSSR</b> をまとめて全員おなじ確率にする。 */
function debutSurePool(mode) {
  const seen = new Set(), out = [];
  debutPoolOf(mode || "debut").concat(gachaPool()).forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id); out.push(id);
  });
  return out;
}
function debutGuaranteedS5(mode) {
  const pool = debutSurePool(mode);
  if (!pool.length) return debutRollOnce(mode);  // 全員が限界突破MAX＝確定枠も通常抽選に戻す
  return grantChar(pool[Math.floor(Math.random() * pool.length)]);
}
function doDebutGacha(n, mode) {
  n = n === 10 ? 10 : n === 5 ? 5 : 1;
  mode = mode || "debut";
  const dver = debutVerOfMode(mode);
  if (!dver) return;                      /* スタンバイ中は引けない */
  /* ★ フェスチケットは使えない（ご指定）＝ payGacha を fes=false で呼ぶ。
     消費の順は 🎫ガチャチケット → <i>ジェム</i>。 */
  /* ★★ 2026-08-25 1日1回の<b>無料単発</b>。単発（1回）のときだけ。
     無料のときは payGacha を<b>通さない</b>＝券もジェムも一切減らない。 */
  /* ★★ 2026-08-26b 版ごとに<b>初回の10連が無料</b>。
     単発の無料（1日1回）とは台帳が別なので、両方を同じ日に使える。 */
  const free10 = (n === 10 && debutFree10Left(mode) > 0);
  const free = free10 || (n === 1 && debutFreeLeft(mode) > 0);
  const pay = free ? { fes: 0, tickets: 0, gems: 0, free: true, free10: free10 } : payGacha(n, false);
  if (!pay) return;
  if (free10) debutFree10Use(mode);
  else if (free) debutFreeUse(mode);
  DB.pulls = (DB.pulls || 0) + n; missionTick("pull", n);
  const payTx = pay.free10 ? "（🎁 初回10連無料）"
    : pay.free ? "（🎁 1日1回の無料単発）" : gachaPayText(pay);
  /* ★★ 2026-08-22b 特別演出（10連のみ・超低確率） */
  const lux = luxRoll(n);
  if (lux === "allssr") {
    revealGacha(luxAllSSR(debutSurePool(mode)), DEBUT_NM + " " + gachaVerText(dver) + " 10連結果！" + payTx);
    return;
  }
  const results = [];
  const normal = n === 10 ? 9 : n;
  const blk = lux === "black" ? luxSelectSlot(debutSurePool(mode)) : null;
  const blkIdx = blk ? Math.floor(Math.random() * normal) : -1;
  if (blk) luxSaveSel(blk.pool, DEBUT_NM);
  for (let i = 0; i < normal; i++) results.push(i === blkIdx ? blk : debutRollOnce(mode));
  if (n === 10) { const g = debutGuaranteedS5(mode); g.sure = true; results.push(g); }
  revealGacha(results, DEBUT_NM + " " + gachaVerText(dver)
    + (n === 10 ? " 10連結果！" : n === 5 ? " 5連結果！" : " 結果！") + payTx);
}
window.doDebutGacha = doDebutGacha;
function doGacha(n) {
  n = n === 10 ? 10 : n === 5 ? 5 : 1;
  /* ★ v11: 10連の割引は廃止（1回5ジェムの等倍。10連はSSR確定のみが特典）
     ★ 2026-08-13: 新しい🎫ガチャチケットはプレミアムでも使える（フェス券は使えない）。 */
  const pay = payGacha(n, false);
  if (!pay) return;
  DB.pulls = (DB.pulls || 0) + n; missionTick("pull", n);   /* ★ 2026-08-05 ミッション（ガチャを引く） */
  /* ★★ 2026-08-22b 特別演出（10連のみ・超低確率）。抽選そのものは luxRoll() 1本。 */
  const lux = luxRoll(n);
  if (lux === "allssr") {
    revealGacha(luxAllSSR(gachaPool()), PREMIUM_NM + " 10連結果！" + gachaPayText(pay));
    return;
  }
  const results = [];
  /* ★ 10連は「最後の1枠」がSSR確定。前半9回は通常抽選＝そこでもSSRは出る */
  const normal = n === 10 ? 9 : n;
  const blk = lux === "black" ? luxSelectSlot(gachaPool()) : null;
  const blkIdx = blk ? Math.floor(Math.random() * normal) : -1;
  if (blk) luxSaveSel(blk.pool, PREMIUM_NM);
  for (let i = 0; i < normal; i++) results.push(i === blkIdx ? blk : rollOnce());
  if (n === 10) {
    const g = rollGuaranteedS5();
    g.sure = true;                              // 確定枠マーク（演出・表示で使う）
    results.push(g);
  }
  revealGacha(results, PREMIUM_NM + (n === 10 ? " 10連結果！" : n === 5 ? " 5連結果！" : " 結果！")
    + gachaPayText(pay));
}
window.doGacha = doGacha;

/* ══════════ ピックアップ セレクト（キャラ一覧から1体えらぶ） ══════════ */
let pickSelMode = "premium";
function openPickSel(mode) {
  /* ★ 2026-08-10 MagiBurst 側のガチャ画面を消したので #gselCard が無いことがある。
     XEVARION のガチャは自前の選び方（gacha-ui.js の openPick）を使うので、ここは通らない。 */
  if (!$("#gselCard")) return;
  pickSelMode = mode === "cross" ? "cross" : "premium";
  /* ★ v12: 新しいキャラほど上に表示する（定義は古い順なので反転して並べる） */
  /* ★ 2026-08-11 並びを<b>キャラクター番号の新しい順</b>にそろえた。
     以前は配列を reverse していただけで、PREMIUM_CHARS の並びは実装順ではないため
     「新しいキャラが一覧のまん中に出てくる」状態になっていた。 */
  const list = byCharNoDesc(pickSelMode === "cross" ? CROSS_CHARS : PREMIUM_CHARS);
  const cur = pickSelMode === "cross" ? curPickupX() : curPickup();
  $("#gselCard").innerHTML = `
    <h3>✦ ピックアップをえらぶ</h3>
    <div class="gimsub">${pickSelMode === "cross" ? "選んだキャラだけがSSRとして排出されます（5%）" : "選んだキャラが" + ratePct(pickupRate()) + "・他のSSRは各 " + ratePct(otherRate()) + "（SSR合計 10%）"}</div>
    <div class="gsellist">${list.map((id) => {
      const c = CHARS[id], on = cur === id, maxed = isMaxAwk(id);
      const own = !!DB.chars[id], awk = own ? (DB.chars[id].awk || 0) : 0;
      /* ★ 所持しているか・何凸かがひと目で分かるようにする（凸はドットで表示） */
      const dots = own ? Array.from({ length: MAX_AWK }, (_, i) => `<i class="${i < awk ? "on" : ""}"></i>`).join("") : "";
      const rate = pickSelMode === "cross"
        ? (maxed ? "排出対象外" : on ? "SSR " + ratePct(PICK_RATE) : "選ぶと 5%")
        : (maxed ? "排出対象外" : on ? "SSR " + ratePct(pickupRate()) : "いま " + ratePct(otherRate()) + " → 選ぶと " + ratePct(wouldPickRate()));
      /* ★ 2026-08-06: フェスガチャと同じように、ここからも<b>1体ずつ性能を確認</b>できるようにした。
         カードの本体＝ピックアップに選ぶ／右上の「i」＝キャラ詳細（#detOv=960 は #gselOv=640 より手前に出る）。
         ※ ボタンの中にボタンは置けないので、外側は div にしてある。 */
      return `<div class="gselbtn ${on ? "on" : ""} ${maxed ? "maxed" : ""} ${own ? "own" : "noown"}"
        role="button" tabindex="0" onclick="choosePickup('${id}')">
        <button class="gsi" onclick="event.stopPropagation();openDet('${id}','chars')" title="${c.nm} の性能を見る">i</button>
        <img src="${c.th}" alt="${c.nm}">
        <span class="gsown ${own ? (maxed ? "mx" : "ok") : "no"}">${own ? (maxed ? "👑 限界突破MAX" : "所持 +" + awk) : "未所持"}</span>
        ${dots ? '<span class="gsdots">' + dots + "</span>" : ""}
        <span class="gsn">${c.nm}</span>
        <span class="gsel2">${ELEM[c.el].nm}・${c.shot === "pierce" ? "貫通" : "反射"}</span>
        <span class="gsr">${rate}</span>
        ${on ? '<span class="gschk">✓ PICKUP</span>' : ""}
      </div>`;
    }).join("")}</div>
    <div class="gselnote">カードをタップで<b>ピックアップに設定</b>、右上の<b>i</b>で<b>そのキャラの詳細</b>（ステータス・アビリティ・リンク・フルバースト）を確認できます。<br>
      所持キャラを選ぶと<b>重複で限界突破（凸）</b>が進みます。<b>限界突破MAX（👑）のキャラは排出対象外</b>になり、その分は他のSSRに配分されます。</div>
    <button class="gimclose" onclick="closePickSel()">とじる</button>`;
  $("#gselOv").classList.add("on");
  SFX.pick();
}
function closePickSel() { const o = $("#gselOv"); if (o) o.classList.remove("on"); }
function choosePickup(id) {
  if (pickSelMode === "cross") setPickupX(id); else setPickup(id);
  closePickSel();
}
window.openPickSel = openPickSel; window.closePickSel = closePickSel; window.choosePickup = choosePickup;

/* ── 回すボタン（画面下に固定）── */
function paintGachaStick() {
  const el = $("#gStick"); if (!el) return;
  /* ★ 2026-08-05: Shop タブは「ガチャ」と「購入」に分かれたので、
     回すボタンはガチャ側を見ているときだけ出す。 */
  /* ★ 2026-08-10 ガチャは XEVARION へ移したので、MagiBurst 側では<b>絶対に出さない</b>。
     ここに回すボタンが残っていると、案内だけの画面から本当に引けてしまう。 */
  if (!$("#gPremium")) { el.classList.remove("on"); el.innerHTML = ""; return; }
  const onGacha = curView === "vgacha" && shopSeg === "gacha";
  el.classList.toggle("on", !!onGacha);
  if (!onGacha) return;
  if (gachaMode === "cross") {
    const bal = window.XEVA ? XEVA.getBalance() : 0;
    /* クロスガチャは確定枠・割引なし（XEVAガチャと同条件） */
    el.innerHTML = `<div class="gbal">所持 XEVA <b>${fmt(bal)}</b></div>
      <div class="gsrow n2">
        <button class="gbtn gx" ${bal < 1500 ? "disabled" : ""} onclick="doCrossGacha(1)"><span>1回</span><small>1,500 XEVA</small></button>
        <button class="gbtn gx g5" ${bal < 7500 ? "disabled" : ""} onclick="doCrossGacha(5)"><span>5連</span><small>7,500 XEVA</small></button>
      </div>`;
  } else if (isFesMode(gachaMode)) {
    /* ★ v14 フェスガチャ: チケットを優先して使い、足りない分だけジェムを払う */
    const fk = gachaMode;
    /* ★ 2026-08-07: 開催前のフェスは回せない。いつから引けるかだけを出す。 */
    if (fesLocked(fk)) {
      el.innerHTML = `<div class="gbal">⏳ <b>${fesOpenText(fesDef(fk))}</b></div>
        <div class="gsrow n2">
          <button class="gbtn gf" disabled><span>1回</span><small>開催前</small></button>
          <button class="gbtn gf g5" disabled><span>10連 SSR確定</span><small>開催前</small></button>
        </div>`;
      return;
    }
    const tk = fesTickets();
    const canN = (n) => { const useT = Math.min(tk, n); return DB.orbs >= (n - useT) * 5; };
    const costTx = (n) => {
      const useT = Math.min(tk, n), gem = (n - useT) * 5;
      if (useT && gem) return "🎫" + useT + " ＋ <i class='icc ic-gem'></i>" + gem;
      if (useT) return "🎫" + useT;
      return "<i class='icc ic-gem'></i>" + gem;
    };
    /* フェスごとのボタン色は FESTS の btnCls で決める（増やすときはそこに1行足すだけ） */
    const gfc = "gf" + (fesDef(fk).btnCls ? " " + fesDef(fk).btnCls : "");
    el.innerHTML = `<div class="gbal">所持 🎫<b>${fmt(tk)}</b>　／　<i class='icc ic-gem'></i><b>${fmt(DB.orbs)}</b></div>
      <div class="gsrow">
        <button class="gbtn ${gfc}" ${canN(1) ? "" : "disabled"} onclick="doFesGacha(1,'${fk}')"><span>1回</span><small>${costTx(1)}</small></button>
        <button class="gbtn ${gfc} g5" ${canN(5) ? "" : "disabled"} onclick="doFesGacha(5,'${fk}')"><span>5連</span><small>${costTx(5)}</small></button>
        <button class="gbtn ${gfc} g10" ${canN(10) ? "" : "disabled"} onclick="doFesGacha(10,'${fk}')"><span>10連 SSR確定</span><small>${costTx(10)}</small></button>
      </div>`;
  } else {
    el.innerHTML = `<div class="gbal">所持 <i class='icc ic-gem'></i><b>${fmt(DB.orbs)}</b></div>
      <div class="gsrow">
        <button class="gbtn" ${DB.orbs < 5 ? "disabled" : ""} onclick="doGacha(1)"><span>1回</span><small><i class='icc ic-gem'></i>5</small></button>
        <button class="gbtn g5" ${DB.orbs < 25 ? "disabled" : ""} onclick="doGacha(5)"><span>5連</span><small><i class='icc ic-gem'></i>25</small></button>
        <button class="gbtn g10" ${DB.orbs < 50 ? "disabled" : ""} onclick="doGacha(10)"><span>10連 SSR確定</span><small><i class='icc ic-gem'></i>50</small></button>
      </div>`;
  }
}
window.paintGachaStick = paintGachaStick;

/* ══════════ クロスガチャ（Bシリーズ・XEVAガチャ連携） ══════════
   ・1回 1,500 XEVA（XEVAガチャと同額）。選んだピックアップのみ SSR排出 5%
   ・ポイント（+25/回）・所持・限界突破は xeva_gacha_v1 で XEVAガチャと共有
   ・ハズレ枠はMagiBurst流にジェム／ゴールド */
const CROSS_COST = 1500;
function crossRoll(pick) {
  if (!isMaxAwk(pick) && Math.random() < PICK_RATE) return grantChar(pick);
  const g = Math.random();
  if (g < 0.10) { DB.orbs += 2; return { type: "orb", n: 2 }; }
  if (g < 0.30) { DB.orbs += 1; return { type: "orb", n: 1 }; }
  if (g < 0.60) { DB.gold += 2500; return { type: "gold", n: 2500 }; }
  if (g < 0.88) { DB.gold += 6000; return { type: "gold", n: 6000 }; }
  DB.gold += 12000; return { type: "gold", n: 12000 };
}
/* ★ クロスガチャは XEVAガチャと条件をそろえるため、確定枠・割引は設けない（1回ぶんの等倍のみ） */
function doCrossGacha(n) {
  n = n === 5 ? 5 : 1;
  const cost = CROSS_COST * n;
  /* XEVA残高・共有ポイントはクラウド同期対象＝オフライン中の消費は巻き戻りのもとなのでブロック */
  if (isOffline()) { uiAlert("オフライン中は<b>クロスガチャ</b>を回せません（XEVAと連携情報の同期が必要です）。<br><br>プレミアムガチャは<b>ジェム</b>でいつでも回せます。", { icon: "📴", title: "オフライン中" }); return; }
  if (!window.XEVA || XEVA.getBalance() < cost) { uiAlert(`XEVAが足りません（必要 <b>${fmt(cost)}</b>）`, { icon: "💠", title: "XEVAが足りません" }); return; }
  if (!XEVA.spend(cost)) return;
  const pick = curPickupX();
  const g0 = xgLoad();
  g0.points[crossPtKey(pick)] = (g0.points[crossPtKey(pick)] || 0) + 25 * n;   // XEVAガチャと共有のポイント
  xgSave(g0);
  DB.pulls = (DB.pulls || 0) + n; missionTick("pull", n);   /* ★ 2026-08-05 ミッション（ガチャを引く） */
  const results = [];
  for (let i = 0; i < n; i++) results.push(crossRoll(pick));
  revealGacha(results, n === 5 ? "クロスガチャ 5連結果！" : "クロスガチャ 結果！");
}
window.doCrossGacha = doCrossGacha;

/* 250pt でピックアップと交換（XEVAガチャの交換所と同じルール・同じポイント） */
async function crossExchange() {
  const pick = curPickupX();
  if (isOffline()) { uiAlert("オフライン中は交換できません（連携情報の同期が必要です）", { icon: "📴", title: "オフライン中" }); return; }
  if (isMaxAwk(pick)) return;
  let g = xgLoad(); const key = crossPtKey(pick);
  if ((g.points[key] || 0) < 250) return;
  if (!await uiConfirm(`ガチャポイント <b>250pt</b> を使って <b>${CHARS[pick].nm}</b> と交換します。<br><br><small>※ ポイントはXEVAガチャと共有です</small>`,
    { icon: "🎫", title: "ポイント交換", ok: "交換する" })) return;
  g = xgLoad();
  if ((g.points[key] || 0) < 250) return;
  g.points[key] -= 250; xgSave(g);
  const r = grantChar(pick);
  revealGacha([r], "ポイント交換！");
}
window.crossExchange = crossExchange;
function closeGres() {
  /* ★★ 2026-08-26b 昇格の舞台が出ているうちに閉じられても、画面に置き去りにしない */
  try { luxRankStageClear(); } catch (e) {}
  $("#gres").classList.remove("on"); renderTeam(); renderChars();
}
window.closeGres = closeGres;
function openRates(which) {
  const rows = [];
  if (which === "cross") {
    const px = curPickupX();
    rows.push(`<tr><td colspan="2" style="font-weight:900;color:#1d78d8">🔗 Bシリーズ クロスガチャ（1回 1,500 XEVA ／ 5連 7,500 XEVA・確定枠や割引はありません）</td></tr>`);
    rows.push(`<tr><td>✨ SSR ${CHARS[px].nm}（ピックアップのみ排出）</td><td>${isMaxAwk(px) ? "限界突破MAX/対象外" : ratePct(PICK_RATE)}</td></tr>`);
    rows.push(`<tr><td><i class='icc ic-gem'></i> ジェム ×2</td><td>9.5%</td></tr>`);
    rows.push(`<tr><td><i class='icc ic-gem'></i> ジェム ×1</td><td>19%</td></tr>`);
    rows.push(`<tr><td><i class='icc ic-gold'></i> ゴールド ×2,500</td><td>28.5%</td></tr>`);
    rows.push(`<tr><td><i class='icc ic-gold'></i> ゴールド ×6,000</td><td>26.6%</td></tr>`);
    rows.push(`<tr><td><i class='icc ic-gold'></i> ゴールド ×12,000</td><td>11.4%</td></tr>`);
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ SSR以外の割合はピックアップ排出後の残り95%を配分した実効値です。1回ごとに共有ガチャポイント+25pt（250ptで交換）。所持・限界突破・ポイントは XEVAガチャBシリーズと共有されます。</td></tr>`);
  } else if (isFesMode(which)) {
    /* ★ フェスガチャ（ピックアップなし・SSRは全員おなじ確率） */
    const f = fesDef(which);
    rows.push(`<tr><td colspan="2" style="font-weight:900;color:${f.c}">✦ ${f.nm}（1回 🎫1枚 または <i class='icc ic-gem'></i>5 ／ 5連 ／ <b>10連・SSR確定</b>）</td></tr>`);
    rows.push(`<tr><td>✨ SSR 排出（合計）</td><td>10%</td></tr>`);
    byCharNoDesc(f.chars).forEach((id) => {
      const maxed = isMaxAwk(id);
      /* ★ 2026-08-07: 登場前のキャラは提供割合でも名前を伏せる（???） */
      rows.push(`<tr><td>　└ ${charNmOf(id)}（フェス限定SSR${maxed ? "・<b style='color:#c98a10'>限界突破MAX/対象外</b>" : charSecret(id) ? "・<b style='color:#c9a6ff'>登場前</b>" : ""}）</td><td>${maxed ? "—" : ratePct(fesEachRate(which))}</td></tr>`);
    });
    /* ★ 2026-08-03: 道中でもプレミアムSSRが出るようになった */
    const fprem = byCharNoDesc(gachaPool().filter((id) => fesPool(which).indexOf(id) < 0));
    const fpEach = fprem.length ? FES_PREMIUM_TOTAL / fprem.length : 0;
    rows.push(`<tr><td>✨ SSR プレミアムセレクトガチャのキャラ（合計）</td><td>${ratePct(FES_PREMIUM_TOTAL)}</td></tr>`);
    fprem.forEach((id) => rows.push(`<tr><td>　└ ${CHARS[id].nm}（プレミアムSSR）</td><td>${ratePct(fpEach)}</td></tr>`));
    rows.push(`<tr><td>⭐ SR（合計・${STAR4_POOL.length}体で等分）</td><td>50%</td></tr>`);
    STAR4_POOL.forEach((id) => rows.push(`<tr><td>　└ ${CHARS[id].nm}</td><td>${ratePct(0.50 / STAR4_POOL.length)}</td></tr>`));
    rows.push(itemRateRows(0.35));
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ <b>ピックアップはありません</b>。フェス限定SSRの合計10%を排出対象で等分します（現在 ${fesPool(which).length}体・各 ${ratePct(fesEachRate(which))}）。</td></tr>`);
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ <b>2026-08-03 から、通常抽選（道中）でも<b>プレミアムセレクトガチャのSSR</b>が合計 ${ratePct(FES_PREMIUM_TOTAL)} で排出されます</b>（フェス限定SSRの確率はそのまま）。Bシリーズ4体ともう一方のフェスのキャラは出ません。</td></tr>`);
    /* ★ v15: 10連の確定枠だけは「そのフェスの限定SSR ＋ プレミアムSSR」から等確率で出す */
    const sure = fesSurePool(which);
    rows.push(`<tr><td colspan="2" style="font-weight:900;color:${f.c}">🎯 10連のSSR確定枠（最後の1枠・${sure.length}体から等確率）</td></tr>`);
    sure.forEach((id) => rows.push(`<tr><td>　└ ${charNmOf(id)}（${CHARS[id].fes ? "フェス限定SSR" : "プレミアムSSR"}）</td><td>${ratePct(sure.length ? 1 / sure.length : 0)}</td></tr>`));
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ <b>確定枠だけは「${f.nm} の限定SSR」と「プレミアムセレクトガチャのSSR」をまとめた ${sure.length}体から、全員おなじ確率</b>で出ます（限界突破MAXのキャラは除外）。</td></tr>`);
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ 🎫チケットは<b>フェス券 → ガチャ券 → <i class='icc ic-gem'></i>ジェム</b>の順に消費します。フェス券はフェス専用、ガチャ券はどのガチャでも使えます。</td></tr>`);
  } else {
    const pick = curPickup();
    rows.push(`<tr><td colspan="2" style="font-weight:900;color:#d97800"><i class='icc ic-gem'></i> プレミアムセレクトガチャ（1回 <i class='icc ic-gem'></i>5 ／ 5連 <i class='icc ic-gem'></i>25 ／ <b>10連 <i class='icc ic-gem'></i>50・SSR確定</b>）</td></tr>`);
    rows.push(`<tr><td>✨ SSR 排出（合計）</td><td>10%</td></tr>`);
    /* ★ 2026-08-11 ピックアップをいちばん上に、そのほかは番号の新しい順に並べる */
    rateOrder(PREMIUM_CHARS, pick).forEach((id) => {
      const on = id === pick, maxed = isMaxAwk(id);
      rows.push(`<tr><td>　└ ${CHARS[id].nm}（SSR ガチャ限定${maxed ? "・<b style='color:#c98a10'>限界突破MAX/対象外</b>" : on ? "・<b style='color:#e0405e'>PICKUP</b>" : ""}）</td><td>${maxed ? "—" : on ? ratePct(pickupRate()) : ratePct(otherRate())}</td></tr>`);
    });
    /* ★ 2026-08-11 フェスガチャと同じように、<b>10連の確定枠の中身も一覧で</b>出す。
       これまでは注意書きに「排出対象のSSRが全員おなじ確率」と書いてあるだけで、
       誰が何%なのかはフェスガチャでしか見られなかった。 */
    const psure = byCharNoDesc(gachaPool());
    const pEachSure = psure.length ? 1 / psure.length : 0;
    rows.push(`<tr><td colspan="2" style="font-weight:900;color:#d97800">🎯 10連のSSR確定枠（最後の1枠・${psure.length}体から等確率）</td></tr>`);
    psure.forEach((id) => rows.push(`<tr><td>　└ ${CHARS[id].nm}（SSR ガチャ限定${id === pick ? "・<b style='color:#e0405e'>PICKUP</b>" : ""}）</td><td>${ratePct(pEachSure)}</td></tr>`));
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ <b>10連は「最後の1枠」がSSR確定</b>です（前半9回は通常抽選なので、そこでもSSRは出ます）。<b>確定枠は排出対象のSSRがすべて同じ確率</b>で、<b>ピックアップの優遇はありません</b>（限界突破MAXのキャラは除外）。</td></tr>`);
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ 限界突破MAXのキャラは排出対象から外れ、その分は残りのSSRに配分されます（SSR合計は常に10%）。<b>排出対象が1体だけになった場合、そのキャラをピックアップに選ぶと10%になります。</b></td></tr>`);
    rows.push(`<tr><td>⭐ SR（合計・${STAR4_POOL.length}体で等分）</td><td>55%</td></tr>`);
    STAR4_POOL.forEach((id) => rows.push(`<tr><td>　└ ${CHARS[id].nm}</td><td>${ratePct(0.55 / STAR4_POOL.length)}</td></tr>`));
    rows.push(itemRateRows(0.35));
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ <b>2026-08-10 からゴールドは排出されません</b>（ゴールドは <b>Shop で XEVA から安く買えます</b>）。かわりに育成アイテムが出ます。</td></tr>`);
    rows.push(`<tr><td colspan="2" style="font-size:10px;color:#8b87a8">※ <b>Bシリーズ（クロスガチャ）は廃止</b>しました。ミオン・ココナ・マオ・アリサは<b>上方修正のうえプレミアムから排出</b>されます。</td></tr>`);
  }
  $("#rateTbl").innerHTML = "<table>" + rows.join("") + "</table>";
  $("#rateOv").classList.add("on");
}
window.openRates = openRates;

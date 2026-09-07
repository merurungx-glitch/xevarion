/* ══════════════════════════════════════════════════════════════
   xeva-i18n-n2.js — 2026-09-07 に足したもの<b>ぜんぶ</b>の英語辞書
   ------------------------------------------------------------
   ・MagiBurst（戦姫祭 第2弾 ナオ・ハルカ／新リンク2本／新FB2本／
     新ショットスキル2本／新クロス2本／装備の検索・絞り込み・並び替え）
   ★ 新しいものを足したら、<b>ここにも1行</b>足すこと。
     置き場所を分けているのは「どの回で足したか」を追えるようにするため。
     前の回のぶんは xeva-i18n-n1.js。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  XevaI18n.add({
    /* ── キャラクターの名前（No.211〜212）──
       ★ 既存の「ノア」「ハルカ」とは別人だが、英語では同じ綴りでよい
         （MagiBurst の中でも同名は起きうる設計）。 */
    "ナオ": "Nao",

    /* ── リンクスキル・フルバースト・ショットスキル・クロス ── */
    "タイダル・オーバーフロー": "Tidal Overflow",
    "クリスタル・レゾナンス": "Crystal Resonance",
    "ミッドサマー・タイダルウェイブ": "Midsummer Tidal Wave",
    "クリスタル・パピヨン": "Crystal Papillon",
    "タイダル・シュート": "Tidal Shot",
    "クリスタル・シュート": "Crystal Shot",
    "真夏のクロス": "Midsummer Cross",
    "蒼晶のクロス": "Azure Crystal Cross",

    /* ── 戦型 ── */
    "真夏水泡型": "Midsummer Bubble",
    "蒼晶蝶舞型": "Azure Crystal Butterfly",

    /* ── 短縮形（絞り込みに出る） ── */
    "タイオーバー": "TidalOvf",
    "クリレゾ": "CrysReso",

    /* ── 装備の検索・絞り込み・並び替え ── */
    "並び替え": "Sort",
    "空き枠あり": "Has empty slot",
    "満タン 4/4": "Full 4/4",
    "未装備 0/4": "None 0/4",
    "★ 上位3割もち": "Has a top-30% roll",
    "図鑑順": "By No.",
    "装備の多い順": "Most gear first",
    "装備の攻撃力順": "By gear attack",
    "編成を上に": "Party first",
    "部位ごと": "By slot",
    "強い順": "Strongest first",
    "効果ごと": "By effect",
    "新しい順": "Newest first",
    "装備中を上に": "Equipped first",
    "装備をさがす（部位・効果・数値・キャラの名前）":
      "Search gear (slot, effect, value, character name)",
    "装備中": "Equipped",
    "空き": "Free",
    "※ 上から <b>いま付けているもの → 空き → ほかのキャラが付けているもの</b> の順で、\n      それぞれ<b>効果の強い順</b>に並んでいます。":
      "※ Ordered: <b>equipped by this character → free → equipped by someone else</b>, each group sorted by strength.",

    /* ── バトル中の札 ── */
    "共鳴": "Resonance",
    "潮の段": "Tide step",
  });

  XevaI18n.addPatterns([
    /* 「この条件に合う装備：64個」 */
    [/^この条件に合う装備：(\d+)個$/, "Gear matching: $1"],
    /* 「2/4 か所」は n1 側のパターンが拾う */
    /* 「被ダメ ×1.22」 */
    [/^被ダメ ×([0-9.]+)$/, "DMG taken ×$1"],
    /* 「共鳴 +26.0」 */
    [/^共鳴 \+([0-9.]+)$/, "Resonance +$1"],
    /* 「TIDAL OVERFLOW!!（5段）」 */
    [/^TIDAL OVERFLOW!!（(\d+)段）$/, "TIDAL OVERFLOW!! ($1 steps)"],
    /* 「CRYSTAL PAPILLON!!（40連）」 */
    [/^CRYSTAL PAPILLON!!（(\d+)連）$/, "CRYSTAL PAPILLON!! ($1 hits)"],
    /* 「蝶 3／6」 */
    [/^蝶 (\d+)／(\d+)$/, "Butterfly $1/$2"],
    /* 「WAVE 2（×70.0）」 */
    [/^WAVE (\d+)（×([0-9.]+)）$/, "WAVE $1 (×$2)"],
    /* 「結晶 ×1.22」 */
    [/^結晶 ×([0-9.]+)$/, "Crystal ×$1"],
  ]);
})();

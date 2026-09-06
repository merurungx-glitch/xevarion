/* ══════════════════════════════════════════════════════════════
   xeva-i18n-mb7.js — MagiBurst の英語辞書 ⑦（2026-09-06d の総ざらい）
     マルチ・クエストの報酬・対応キャラ・ミッション・絞り込み・クロス名の残り
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  /* mb6 の CROSS に無かったぶん。★ クロスを足したらここにも1行。 */
  var CROSS2 = {
    "万華": "Myriad Bloom", "九天": "Ninth Heaven", "極彩鼓動": "Prism Pulse",
    "灯明": "Votive Light", "灯火": "Lantern Flame", "焔輪": "Flame Ring",
    "碧鎖": "Azure Chain", "祭灯": "Festival Lantern", "翠玉": "Emerald",
    "翠蔓": "Verdant Vine",
  };
  var m = {};
  for (var k in CROSS2) if (Object.prototype.hasOwnProperty.call(CROSS2, k)) {
    m[k + "のクロス"] = CROSS2[k] + " Cross";
    /* 先に mb6 の型が "Cross Skill: ◯◯ Cross" まで作ってから残った形も拾う */
    m["Cross Skill: " + k + " Cross"] = "Cross Skill: " + CROSS2[k] + " Cross";
    m["Cross Skill (Cross Tome): " + k + " Cross"] = "Cross Skill (Cross Tome): " + CROSS2[k] + " Cross";
  }
  XevaI18n.add(m);

  XevaI18n.addPatterns([
    [/^この条件で見る（該当 (\d+) 体）$/, "Show these ($1 characters)"],
    [/^(.+)対応$/, function (s, g) { return "Counters " + XevaI18n.t(g); }],
  ]);

  XevaI18n.add({
    /* ── 入手・レアリティ ── */
    "SSR ガチャ限定": "SSR — gacha only",
    "SSR フェス限定": "SSR — fest only",
    "SSR クエスト限定（ガチャからは出ません）": "SSR — quest only (never from the gacha)",
    "ガチャキャラ": "Gacha characters",
    "⭐ お気に入り": "⭐ Favourites",
    "所持のみ": "Owned only",
    "編成中": "In your party",
    "編成外": "Not in your party",

    /* ── 戦型・撃種・相性 ── */
    "アタッカー": "Attacker", "バランス": "Balanced", "技巧": "Technique",
    "支援": "Support", "砲撃": "Blaster",
    "貫通タイプ": "Piercing type", "反射タイプ": "Bouncing type",
    "属性有利": "Element advantage", "属性不利": "Element disadvantage",

    /* ── 対応キャラ ── */
    "対応キャラをさがす": "Find characters who can counter this",
    "ギミックに対応できる味方を見る": "See which allies can counter the gimmicks",
    "ギミック・報酬などの詳細を見る": "See the gimmicks, rewards and other details",
    "このクエストのクリア編成（自分の記録と、みんなの編成）を見る":
      "See clear parties for this quest — your own record and everyone else's",
    "✅ 所持している対応キャラ": "✅ Counters you own",
    "🔒 未所持（入手すると対応できる）": "🔒 Not owned (they would counter it)",
    "まだいません（下の未所持キャラを狙おう）": "None yet — aim for the ones below",
    "オムニアンチ": "Omni Anti",
    "オムニアンチで対応（専用のアンチではない）": "Covered by Omni Anti (not a dedicated anti)",
    "クロススキルで持つアンチ（クロスが発動していないと効きません）":
      "An anti that comes from a Cross Skill (it does nothing unless the Cross is active)",
    "ダメージウォール対応": "Counters Damage Wall",
    "重力バリア対応": "Counters Gravity Barrier",
    "ワープ対応": "Counters Warp",
    "地雷対応": "Counters Mines",
    "減速壁対応": "Counters Slow Wall",
    "ブロック対応": "Counters Blocks",
    "ロックゾーン対応": "Counters Lock Zone",
    "断絶界対応": "Counters Severance Field",

    /* ── 絞り込み ── */
    "条件をえらんでいません（すべて表示）": "No filters selected (showing everything)",
    "条件をすべて解除": "Clear every filter",
    "部屋名・ギミック・属性でさがす": "Search by room name, gimmick or element",

    /* ── ミッション・WAVE ── */
    "このカテゴリのミッションは、すべて制覇しました！": "You have cleared every mission in this category!",
    "WAVE踏破": "Waves cleared",
    "今月このクエストで突破したWAVE（青＝雑魚WAVE／橙＝ボスWAVE）":
      "Waves you cleared in this quest this month (blue = minion waves, orange = boss waves)",
  });
})();

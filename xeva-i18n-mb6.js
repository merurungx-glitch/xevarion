/* ══════════════════════════════════════════════════════════════
   xeva-i18n-mb6.js — MagiBurst の英語辞書 ⑥（総ざらいの残り）
     ・クロススキルの名前（「◯◯のクロス」）
     ・読み上げ用の説明（aria-label / title）「◯◯ の詳細を見る」など
     ・魂の紋章の効果、そのほか拾いきれていなかった短文
   ──────────────────────────────────────────────────────────────
   ★ 「◯◯ の詳細を見る」はキャラの数だけあるので<b>型（関数）</b>で拾う。
     中の名前は XevaI18n.t() でもう一度引く＝キャラを足しても自動で英語になる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  /* クロススキルの「◯◯」の部分。★ 新しいクロスを足したらここに1行。 */
  var CROSS = {
    "収穫": "Harvest", "四つ葉": "Four-Leaf", "夜想": "Nocturne", "宝石": "Jewel",
    "宵桃": "Evening Peach", "宵猫": "Evening Cat", "宵闇": "Twilight", "宵夏": "Evening Summer",
    "常夏": "Endless Summer", "恋灯": "Love Lantern", "教室": "Classroom", "星冠": "Star Crown",
    "星譜": "Star Score", "星辰": "Constellation", "暁光": "Dawnlight", "曙光": "First Light",
    "業火": "Hellfire", "氷華": "Ice Blossom", "深淵": "Abyss", "湯けむり": "Steam",
    "湯浴み": "Hot Spring", "潮鳴": "Tideroar", "灼夏": "Scorching Summer", "灼華": "Blazing Bloom",
    "灯夏": "Lantern Summer", "煌焔": "Radiant Flame", "玄墨": "Sumi Ink", "碧漣": "Azure Ripple",
    "碧玉": "Jade", "碧環": "Azure Ring", "祝祭": "Festival", "紅月": "Crimson Moon",
    "紅玉": "Ruby", "紅蓮": "Crimson Lotus", "紅薔薇": "Red Rose", "給仕": "Service",
    "翠夏": "Verdant Summer", "翠孔雀": "Verdant Peacock", "翠芽": "Verdant Bud", "翠風": "Verdant Wind",
    "聖光": "Holy Light", "聖杯": "Grail", "聖環": "Holy Ring", "菫花": "Violet Bloom",
    "蒼夏": "Azure Summer", "蒼波": "Azure Wave", "蒼涙": "Azure Tears", "蒼薔薇": "Blue Rose",
    "豪雷": "Thunderclap", "鈴音": "Bell Chime", "陽だまり": "Sunlit Patch", "陽笑": "Sunny Smile",
    "黒十字": "Black Cross", "黒華": "Black Bloom", "黒薔薇": "Black Rose", "野獣": "Beast",
  };
  var m = {};
  for (var k in CROSS) if (Object.prototype.hasOwnProperty.call(CROSS, k)) {
    m[k + "のクロス"] = CROSS[k] + " Cross";
  }
  XevaI18n.add(m);

  XevaI18n.addPatterns([
    /* 読み上げ用の説明（キャラの数だけある）。中の名前ももう一度訳す。 */
    [/^(.+) の詳細を見る$/, function (s, nm) { return "View " + XevaI18n.t(nm) + " in detail"; }],
    [/^(.+) の性能を見る$/, function (s, nm) { return "See what " + XevaI18n.t(nm) + " can do"; }],
    [/^Cross Skill: (.+)のクロス$/, function (s, nm) { return "Cross Skill: " + (CROSS[nm] || nm) + " Cross"; }],
    [/^Cross Skill \(Cross Tome\): (.+)のクロス$/, function (s, nm) {
      return "Cross Skill (Cross Tome): " + (CROSS[nm] || nm) + " Cross";
    }],
    /* スタミナの行 */
    [/^スタミナ (\d+) \/ (\d+)（1プレイ (\d+)）・次の1回復まで あと (\d+)分$/,
      "Stamina $1 / $2 ($3 per play) · next point in $4 min"],
    [/^スタミナ (\d+) \/ (\d+)（1プレイ (\d+)）・(.+)$/, "Stamina $1 / $2 ($3 per play)"],
    /* 属性ダメージの但し書き（属性の数だけある） */
    [/^(.+)属性のダメージになります（属性相性が乗ります）$/, "Deals $1 damage (element advantage applies)"],
  ]);

  XevaI18n.add({
    "お気に入り": "Favourite",
    "お気に入りに入れる／外す": "Add to or remove from favourites",
    "適性クエスト": "Best quests",
    "このキャラが刺さるクエストを見る": "See the quests this character is made for",
    "属性に関係なく効果が出ます": "Works regardless of element",
    "クエストBGM": "Quest BGM",
    "クエストを中断する": "Quit the quest",
    "味方の状態・倍率をまとめて見る": "See every buff and multiplier at once",
    "いちばん下へ": "Jump to the bottom",
    "前のイベント": "Previous event",
    "次のイベント": "Next event",
    "各WAVE開始時、装備者がいればボスの最大HPの5%を削る":
      "At the start of every wave, chips 5% of the boss's max HP if the wearer is in the party",
    "各WAVE開始時、装備者がいればボス以外の敵の最大HPの5%を削る":
      "At the start of every wave, chips 5% of the max HP of every non-boss enemy if the wearer is in the party",
    "装備した本人のHPを15%アップする（チームの総HPがそのぶん増える）":
      "Raises the wearer's own HP by 15% (the team's total HP goes up by that much)",
    "装備した本人のリンクスキルのダメージを1.25倍にする":
      "Multiplies the wearer's own Link Skill damage by 1.25",
  });
})();

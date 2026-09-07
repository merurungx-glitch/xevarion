/* ══════════════════════════════════════════════════════════════
   xeva-i18n-n1.js — 2026-09-06 に足したもの<b>ぜんぶ</b>の英語辞書
   ------------------------------------------------------------
   ・XEVARION（同期の画面・配布メール・イベント）
   ・MagiBurst（新キャラ14体・装備・クリティカル・天律族キラー・新リンク／サブリンク
     ・新フルバースト・ショットスキル・お知らせのページ送り・所持アイテム一覧）
   ・MagiDiamond（スタメン・投手交代・代打・成績）
   ★ 新しいものを足したら、<b>ここにも1行</b>足すこと。
     置き場所を分けているのは「どの回で足したか」を追えるようにするため。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  /* ── キャラクターの名前（No.197〜210） ── */
  var NAMES = {
    "アストレア": "Astraea",
    "レイ": "Rei", "リカ": "Rika", "アンナ＆ラン": "Anna & Ran",
    "ヨイヅキ": "Yoiduki", "カヨ": "Kayo", "シノ": "Shino", "マアヤ": "Maaya", "アスカ": "Asuka",
    "レナ": "Rena", "カオル": "Kaoru", "スバル": "Subaru", "カスミ": "Kasumi", "ツキノ": "Tsukino",
  };

  /* ── 新しいリンクスキル・サブリンク・フルバースト・ショットスキル ── */
  var SKILLS = {
    "フラクタル・ミッドナイト": "Fractal Midnight",
    "ヴェルダンテ・ドラグーン": "Verdante Dragoon",
    "ツインローズ・カタストロフ": "Twin Rose Catastrophe",
    "プリズム・タイド": "Prism Tide",
    "メイプル・スパイラル": "Maple Spiral",
    "パルフェ・カスケード": "Parfait Cascade",
    "ジャッジメント・スケール": "Judgement Scale",
    "スターバースト・ウェイブ": "Starburst Wave",
    "デビュー・コード": "Debut Chord",
    "ミッドナイト・クロージング": "Midnight Closing",
    "ヴェルダンテ・アウェイクン": "Verdante Awaken",
    "ツインローズ・レクイエム": "Twin Rose Requiem",
    "ヨイヅキ・フロストレクイエム": "Yoiduki Frost Requiem",
    "サザンウィンド・ラプソディ": "Southern Wind Rhapsody",
    "ゴールドナイト・ヴァース": "Gold Night Verse",
    "ヴィオレット・コマンド": "Violet Command",
    "オータム・エンブレイス": "Autumn Embrace",
    "ストロベリー・セレナーデ": "Strawberry Serenade",
    "クラウド・ロンド": "Cloud Rondo",
    "ミッドナイト・オーダー": "Midnight Order",
    "フレッシュ・ブルーム": "Fresh Bloom",
    "ハナヅキ・ヴェスパー": "Hanazuki Vesper",
    "ラスト・ジャッジメント": "Last Judgement",
    "ミッドナイト・シュート": "Midnight Shot",
    "ドラグーン・シュート": "Dragoon Shot",
    "ローズ・シュート": "Rose Shot",
    "ノワール・ロザリオ（昴）": "Noir Rosario (Subaru)",
    "ヴェルデ・クロスノート（霞）": "Verde Cross Note (Kasumi)",
    "グレイル・オーバーフロー（月）": "Grail Overflow (Moon)",
    "深夜のクロス": "Midnight Cross", "竜姫のクロス": "Dragon Princess Cross",
    "双薔薇のクロス": "Twin Rose Cross", "パルフェのクロス": "Parfait Cross",
    "ひだまりのクロス": "Sunspot Cross", "夜想のクロス（昴）": "Nocturne Cross (Subaru)",
    "若葉のクロス": "Young Leaf Cross", "月華のクロス": "Moonflower Cross",
  };

  /* ── 戦型（新キャラぶん） ── */
  var TYPES = {
    "深夜静寂型": "Midnight Hush", "翠竜庭園型": "Verdant Dragon Garden",
    "双薔薇灼熱型": "Twin Rose Blaze", "宵月霜華型": "Evening Moon Frost",
    "南風花咲型": "South Wind Bloom", "金灯夜景型": "Gold Lamp Nightscape",
    "紫闇静謐型": "Violet Stillness", "紅葉焔舞型": "Maple Flame Dance",
    "苺甘露型": "Strawberry Nectar", "碧空微睡型": "Azure Doze",
    "紫夜静観型": "Violet Night Watch", "翠風学園型": "Verdant Campus",
    "花月香衣型": "Flower Moon Robe", "天律断罪型": "Lawbringer Verdict",
  };

  var m = {};
  [NAMES, SKILLS, TYPES].forEach(function (o) {
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) m[k] = o[k];
  });

  Object.assign(m, {
    /* ══ XEVARION ══ */
    "データをお預かりしています": "Keeping your data safe…",
    "SYNCING XEVA DATA": "SYNCING XEVA DATA",
    "ジェフ千葉 17年ぶりJ1勝利記念 配布（17,000 XEVA）":
      "JEF Chiba — first J1 win in 17 years (17,000 XEVA)",
    "戦姫祭 に 新3体": "Senki Fest — 3 new characters",
    "RISING STAR FEST 第3弾": "RISING STAR FEST — wave 3",
    "GRAND DEBUT GACHA Ver.7.0": "GRAND DEBUT GACHA Ver.7.0",
    "天界の審判に「装備」が登場": "Gear has arrived in Judgement of Heaven",

    /* ══ MagiBurst：装備 ══ */
    "装備": "Gear", "🛡 装備": "🛡 Gear",
    "装備の装着": "Equip gear",
    "所持アイテム一覧": "Your items",
    "🎒 所持アイテム一覧": "🎒 Your items",
    "装備・ルーン・アイテム": "Gear, runes and items",
    "頭": "Head", "腕": "Arms", "胸": "Chest", "足": "Legs",
    "ヘッドギア": "Headgear", "アームガード": "Arm Guard",
    "ブレストプレート": "Breastplate", "レッグアーマー": "Leg Armour",
    "未装備": "Empty",
    "すべての部位": "All slots", "すべての効果": "All effects",
    "★ 上位3割だけ": "★ Top 30% only",
    "空き（誰も着けていない）だけ": "Unequipped only",
    "🛡 装備（頭・腕・胸・足）": "🛡 Gear (head / arms / chest / legs)",
    "🔮 ルーン": "🔮 Runes", "🎁 特別アイテム": "🎁 Special items",
    "有利コードダメージ増加": "Advantage-code damage up",
    "命中率増加": "Accuracy up",
    "最大装弾数増加": "Max ammo up",
    "攻撃力増加": "Attack up",
    "チャージダメージ増加": "Charge damage up",
    "チャージ速度増加": "Charge speed up",
    "クリティカル確率増加": "Critical rate up",
    "クリティカルダメージ増加": "Critical damage up",
    "防御力増加": "Defence up",
    "属性有利DMG": "Adv. DMG", "弱点判定": "Weak hitbox", "移動距離": "Travel",
    "攻撃力": "Attack", "FB威力": "FB power", "FB短縮": "FB cut",
    "クリ率": "Crit rate", "クリDMG": "Crit DMG", "被ダメ減": "Damage cut",

    /* ══ MagiBurst：クリティカル・天律族 ══ */
    "天律族キラーL": "Lawbringer Killer L", "天律族キラーEL": "Lawbringer Killer EL",
    "天律族キラー": "Lawbringer Killer",
    "たいあたり": "Body slam",
    "即死": "Instant kill", "クラッシュ": "Crush", "降下": "Descend",
    "はしで即死": "Edge instant kill", "ふっとばし": "Knockback",
    "FB遅延": "FB delay", "毒": "Poison",

    /* ══ MagiBurst：入手区分 ══ */
    "SSR 極限定": "SSR — Kiwami fest only", "SSR EX降臨": "SSR — EX Raid drop",
    "極限定": "Kiwami only", "フェス限定": "Fest only",
    "ガチャ限定": "Gacha only", "EX": "EX", "配布": "Gift", "報酬": "Reward",

    /* ══ MagiBurst：お知らせ ══ */
    "← 前": "← Prev", "次 →": "Next →",

    /* ══ MagiDiamond ══ */
    "スタメン": "Line-up", "📋 スタメン": "📋 Line-up",
    "✕ 中断": "✕ Quit",
    "じぶん": "You", "あいて": "Opponent",
    "🥎 投手": "🥎 Pitcher", "🏏 打順": "🏏 Batting order", "🪑 ベンチ": "🪑 Bench",
    "🔁 投手を交代する": "🔁 Change pitcher",
    "🔁 代打・守備交代": "🔁 Pinch hitter / defensive change",
    "🔁 投手交代": "🔁 Pitcher change",
    "🔁 代打・守備交代": "🔁 Pinch hitter / defensive change",
    "だれと代えますか？": "Who comes in?",
    "いま出ている選手": "Currently in the game",
    "← もどる": "← Back",
    "自分のチーム": "Your team", "相手のチーム": "Opponent's team",
    "交代しました": "Substitution made",
    "いまは交代できません": "You cannot substitute right now",
    "投手交代は、自分が守っているとき（投球の前）だけです":
      "You can only change pitchers while you are fielding (before the pitch)",
    "代打は、自分の打席のまえだけです": "You can only send a pinch hitter before your own at-bat",
    "控えの選手がいません。<b>TEAM</b> タブでベンチに入れておくと、試合中に交代できます。":
      "No bench players. Add players to the bench on the <b>TEAM</b> tab so you can substitute during a game.",
    "交代できる選手がいません。<b>TEAM</b> タブでベンチに入れておいてください。":
      "No one available. Add players to the bench on the <b>TEAM</b> tab.",
    "投げました！": "Pitch away!",

    /* ══ ★★ 2026-09-07（2回目のご依頼ぶん）══ */
    "装備がついていません。<b>育成タブ</b>の「装備の装着」から付けられます（頭・腕・胸・足の4か所）。装備は<b>天界の審判</b>を5WAVEすすむごとに手に入ります。":
      "No gear equipped. Equip it from “Equip gear” on the <b>Training</b> tab (head / arms / chest / legs). Gear drops every 5 WAVE of <b>Judgement of Heaven</b>.",
    "※ 投手を交代できるのは<b>自分が守っているとき</b>（投球の前）だけです。":
      "※ You can only change pitchers while <b>you are fielding</b> (before the pitch).",
    "※ 代打を出せるのは<b>自分の打席のまえ</b>だけです。":
      "※ You can only send a pinch hitter <b>before your own at-bat</b>.",
  });

  XevaI18n.add(m);

  XevaI18n.addPatterns([
    /* 「◯◯ の ヘッドギア」など */
    [/^(.+) の (ヘッドギア|アームガード|ブレストプレート|レッグアーマー)$/,
      function (s, a, b) { return XevaI18n.t(a) + " — " + XevaI18n.t(b); }],
    /* 「打率 .343」「防御率 2.08」 */
    [/^打率 (.+)$/, "AVG $1"],
    [/^防御率 (.+)$/, "ERA $1"],
    [/^球速 (\d+)km\/h$/, "Velocity $1 km/h"],
    [/^スタミナ (\d+) \/ 100$/, "Stamina $1 / 100"],
    [/^(\d+)打数(\d+)安打$/, "$1 AB, $2 H"],
    /* 装備の効果（「攻撃力増加 +12.34%」） */
    [/^(.+増加) \+([0-9.]+)%$/, function (s, a, b) { return XevaI18n.t(a) + " +" + b + "%"; }],
    /* 「投手交代：◯◯ → ◯◯」 */
    [/^投手交代：(.+) → (.+)$/, function (s, a, b) { return "Pitching change: " + XevaI18n.t(a) + " → " + XevaI18n.t(b); }],
    [/^代打：(.+) → (.+)$/, function (s, a, b) { return "Pinch hitter: " + XevaI18n.t(a) + " → " + XevaI18n.t(b); }],
    /* MagiBurst のお知らせのページ番号 */
    [/^(\d+) \/ (\d+)$/, "$1 / $2"],
    /* 「2/4 か所」 */
    [/^(\d+)\/(\d+) か所$/, "$1/$2 slots"],
    /* 部位ごとの数 */
    [/^部位ごとの数：/, "By slot: "],
  ]);
})();

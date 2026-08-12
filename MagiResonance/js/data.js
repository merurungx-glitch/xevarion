/* ============================================================
   MagiResonance — データ定義（王道RPG型リビルド）
   世界観: アステルナ王国をおびやかす魔王ヴォイド。
   勇者(あなた)は なかま(XEVARIONガチャのキャラ)と旅立ち、
   20の地方に散らばる「ひかりのオーブ」を取りもどす。
   ============================================================ */
"use strict";

/* ── 職業（キャラIDのハッシュで決定） ── */
const JOBS_ORDER = ["warrior", "monk", "mage", "priest", "sage"];
const JOBS = {
  warrior: { nm: "せんし",       ic: "🗡️", d: "ちからとまもりに優れた前線の壁",       hp: 1.35, mp: 0.5,  atk: 1.28, def: 1.22, agi: 0.85, wis: 0.6,  crit: 0.05 },
  monk:    { nm: "ぶとうか",     ic: "🥋", d: "すばやく、かいしんの一撃が出やすい",   hp: 1.08, mp: 0.55, atk: 1.18, def: 0.95, agi: 1.32, wis: 0.7,  crit: 0.12 },
  mage:    { nm: "まほうつかい", ic: "🔮", d: "強力な攻撃じゅもんの使い手",           hp: 0.78, mp: 1.45, atk: 0.68, def: 0.8,  agi: 1.0,  wis: 1.4,  crit: 0.03 },
  priest:  { nm: "そうりょ",     ic: "✝️", d: "回復と守りのじゅもんで仲間を支える",   hp: 0.95, mp: 1.3,  atk: 0.85, def: 1.0,  agi: 0.95, wis: 1.15, crit: 0.03 },
  sage:    { nm: "けんじゃ",     ic: "📖", d: "攻めも回復もこなす万能の賢者",         hp: 0.95, mp: 1.35, atk: 0.9,  def: 0.95, agi: 1.05, wis: 1.3,  crit: 0.04 },
};

/* ── じゅもん ── */
const SPELLS = {
  fila:     { nm: "フィラ",       mp: 2,  kind: "atk",    tgt: "one",      pow: [14, 22],   fx: "🔥", d: "敵1体を小さな火球で焼く" },
  filada:   { nm: "フィラーダ",   mp: 5,  kind: "atk",    tgt: "one",      pow: [44, 62],   fx: "🔥", d: "敵1体を火柱で焼きつくす" },
  filazon:  { nm: "フィラゾーン", mp: 11, kind: "atk",    tgt: "one",      pow: [98, 132],  fx: "🌋", d: "敵1体に業火の審判" },
  tsurara:  { nm: "ツララ",       mp: 4,  kind: "atk",    tgt: "egroup",   pow: [13, 21],   fx: "❄️", d: "氷のつぶてで敵全体を打つ" },
  tsurada:  { nm: "ツラーダ",     mp: 9,  kind: "atk",    tgt: "egroup",   pow: [38, 54],   fx: "🧊", d: "吹雪で敵全体を凍てつかせる" },
  birimu:   { nm: "ビリム",       mp: 6,  kind: "atk",    tgt: "egroup",   pow: [24, 36],   fx: "⚡", d: "いなずまが敵全体をつらぬく" },
  birimuda: { nm: "ビリムーダ",   mp: 13, kind: "atk",    tgt: "egroup",   pow: [56, 78],   fx: "🌩️", d: "らくらいが敵全体にふりそそぐ" },
  naoru:    { nm: "ナオール",     mp: 3,  kind: "heal",   tgt: "ally",     pow: [30, 44],   fx: "✨", d: "味方1人のHPを回復" },
  naoruda:  { nm: "ナオルーダ",   mp: 6,  kind: "heal",   tgt: "ally",     pow: [82, 112],  fx: "💫", d: "味方1人のHPを大きく回復" },
  naozon:   { nm: "ナオゾーン",   mp: 12, kind: "heal",   tgt: "allally",  pow: [46, 66],   fx: "🌟", d: "味方全員のHPを回復" },
  okiron:   { nm: "オキロン",     mp: 8,  kind: "revive", tgt: "deadally", pow: [0.5],      fx: "🕊️", d: "気絶した味方を半分のHPで生きかえらせる" },
  kachikon: { nm: "カチコン",     mp: 3,  kind: "defup",  tgt: "allally",  turns: 4,        fx: "🛡️", d: "味方全員のしゅび力を上げる" },
  mukimun:  { nm: "ムキムン",     mp: 3,  kind: "atkup",  tgt: "ally",     turns: 4,        fx: "💪", d: "味方1人のこうげき力を上げる" },
  yowamin:  { nm: "ヨワミン",     mp: 3,  kind: "defdown",tgt: "one",      turns: 4,        fx: "🌀", d: "敵1体のしゅび力を下げる" },
  suyarin:  { nm: "スヤリン",     mp: 4,  kind: "sleep",  tgt: "egroup",   fx: "💤", d: "敵全体をねむらせる（ときどき失敗）" },
};

/* ── とくぎ（MP不要または少量） ── */
const ARTS = {
  kabuto:  { nm: "かぶとわり",     mp: 0, kind: "atk_defdown", tgt: "one",    mult: 1.0,  fx: "🪓", d: "攻撃しつつ敵のしゅび力を下げる" },
  nidan:   { nm: "にだんぎり",     mp: 2, kind: "multi",       tgt: "one",    hits: 2, mult: 0.8, fx: "⚔️", d: "敵1体を2回続けて斬る" },
  sutemi:  { nm: "すてみぎり",     mp: 0, kind: "atk",         tgt: "one",    mult: 1.9,  selfdown: true, fx: "💢", d: "大ダメージだが自分のしゅびが下がる" },
  mawashi: { nm: "まわしげり",     mp: 0, kind: "atk",         tgt: "egroup", mult: 0.7,  fx: "🦵", d: "敵全体をなぎはらう" },
  tameru:  { nm: "ためる",         mp: 0, kind: "charge",      tgt: "self",   fx: "🔥", d: "気合をため、次の攻撃が2.2倍になる" },
  kyusho:  { nm: "きゅうしょづき", mp: 1, kind: "atk",         tgt: "one",    mult: 1.0,  critUp: 0.35, fx: "🎯", d: "かいしんの一撃が出やすい突き" },
};

/* ── 職業ごとの習得表（Lv到達で覚える） ── */
const LEARN = {
  warrior: [ { lv: 1, a: "kabuto" }, { lv: 8, a: "nidan" }, { lv: 16, a: "sutemi" } ],
  monk:    [ { lv: 1, a: "mawashi" }, { lv: 6, a: "tameru" }, { lv: 13, a: "kyusho" } ],
  mage:    [ { lv: 1, s: "fila" }, { lv: 5, s: "tsurara" }, { lv: 10, s: "birimu" }, { lv: 15, s: "filada" }, { lv: 21, s: "tsurada" }, { lv: 28, s: "birimuda" }, { lv: 36, s: "filazon" } ],
  priest:  [ { lv: 1, s: "naoru" }, { lv: 6, s: "kachikon" }, { lv: 12, s: "okiron" }, { lv: 18, s: "naoruda" }, { lv: 26, s: "naozon" } ],
  sage:    [ { lv: 1, s: "fila" }, { lv: 4, s: "naoru" }, { lv: 8, s: "yowamin" }, { lv: 12, s: "suyarin" }, { lv: 16, s: "mukimun" }, { lv: 22, s: "birimu" }, { lv: 30, s: "naoruda" } ],
};

/* ── そうび（武器・よろい・たて。ゴールドで購入） ── */
const WEAPONS = [
  { id: "w1", nm: "ひのきのぼう",     atk: 2,  price: 30 },
  { id: "w2", nm: "どうのつるぎ",     atk: 8,  price: 150 },
  { id: "w3", nm: "てつのやり",       atk: 15, price: 480 },
  { id: "w4", nm: "はがねのつるぎ",   atk: 24, price: 1300 },
  { id: "w5", nm: "まどうのけん",     atk: 35, price: 3600 },
  { id: "w6", nm: "りゅうきしのやり", atk: 48, price: 8800 },
  { id: "w7", nm: "でんせつのつるぎ", atk: 65, price: 21000 },
];
const ARMORS = [
  { id: "a1", nm: "ぬののふく",       def: 3,  price: 20 },
  { id: "a2", nm: "かわのよろい",     def: 8,  price: 140 },
  { id: "a3", nm: "くさりかたびら",   def: 15, price: 450 },
  { id: "a4", nm: "はがねのよろい",   def: 24, price: 1250 },
  { id: "a5", nm: "まほうのよろい",   def: 34, price: 3400 },
  { id: "a6", nm: "ひかりのよろい",   def: 48, price: 9200 },
];
const SHIELDS = [
  { id: "s1", nm: "かわのたて",     def: 2,  price: 60 },
  { id: "s2", nm: "どうのたて",     def: 6,  price: 250 },
  { id: "s3", nm: "はがねのたて",   def: 12, price: 900 },
  { id: "s4", nm: "まほうのたて",   def: 20, price: 2600 },
  { id: "s5", nm: "ゆうしゃのたて", def: 30, price: 7500 },
];
function weaponById(id) { return WEAPONS.find((w) => w.id === id) || null; }
function armorById(id) { return ARMORS.find((a) => a.id === id) || null; }
function shieldById(id) { return SHIELDS.find((s) => s.id === id) || null; }

/* ── どうぐ ── */
const ITEMS = {
  yakusou:  { nm: "やくそう",         ic: "🌿", price: 25,  kind: "heal", pow: [32, 42],  d: "HPを少し回復する" },
  iiyaku:   { nm: "いいやくそう",     ic: "🌱", price: 90,  kind: "heal", pow: [80, 100], d: "HPをかなり回復する" },
  seisui:   { nm: "まほうのせいすい", ic: "🧴", price: 160, kind: "mp",   pow: [30, 40],  d: "MPを回復する" },
  ha:       { nm: "せかいじゅのは",   ic: "🍃", price: 800, kind: "revive", pow: [1],     d: "気絶した仲間を生きかえらせる" },
};

/* ── モンスター図鑑（tier=出現章の目安 1〜5） ── */
const MONSTERS = [
  { key: "pururin",  nm: "ぷるりん",         ic: "🫧", tier: 1, ai: "atk" },
  { key: "basakki",  nm: "ばさっきー",       ic: "🦇", tier: 1, ai: "atk" },
  { key: "gyororin", nm: "ぎょろりん",       ic: "👁️", tier: 1, ai: "atk" },
  { key: "togebou",  nm: "とげぼう",         ic: "🦔", tier: 1, ai: "atk" },
  { key: "morigoke", nm: "もりごけおばけ",   ic: "🍄", tier: 2, ai: "sleep" },
  { key: "sasorin",  nm: "さそりん",         ic: "🦂", tier: 2, ai: "atk" },
  { key: "honekaji", nm: "ほねかじり",       ic: "💀", tier: 2, ai: "atk" },
  { key: "mahoneko", nm: "まほうねこ",       ic: "🐈‍⬛", tier: 2, ai: "fila" },
  { key: "kooridama",nm: "こおりだま",       ic: "❄️", tier: 3, ai: "tsurara" },
  { key: "gaikotsu", nm: "がいこつけんし",   ic: "☠️", tier: 3, ai: "atk" },
  { key: "iwaotoko", nm: "いわおとこ",       ic: "🗿", tier: 3, ai: "atk" },
  { key: "kaminari", nm: "かみなりどり",     ic: "🐦", tier: 3, ai: "birimu" },
  { key: "yamishibi",nm: "やみしびと",       ic: "🌑", tier: 4, ai: "fila" },
  { key: "umihebi",  nm: "おおうみへび",     ic: "🐍", tier: 4, ai: "atk" },
  { key: "dorapapi", nm: "ドラゴンぱぴぃ",   ic: "🐲", tier: 4, ai: "atk" },
  { key: "yamiokami",nm: "じごくのもばん",   ic: "🐺", tier: 4, ai: "atk" },
  { key: "hagane",   nm: "はがねのめがみ",   ic: "⚙️", tier: 5, ai: "atk" },
  { key: "hoshikuzu",nm: "ほしくずまじん",   ic: "🌌", tier: 5, ai: "birimu" },
  { key: "akumaboss",nm: "デビルナイト",     ic: "😈", tier: 5, ai: "atk" },
  { key: "meifu",    nm: "めいふのつかい",   ic: "🪦", tier: 5, ai: "tsurara" },
];
function monsterByKey(k) { return MONSTERS.find((m) => m.key === k) || MONSTERS[0]; }

/* ── 章ボス（魔王軍幹部20体。最後は魔王ヴォイド） ── */
const BOSSES = [
  { ic: "🐲", nm: "じゃりゅう ヴォラクス" },   { ic: "🕸️", nm: "おりての アラクネ" },
  { ic: "❄️", nm: "こおりの けんおう" },       { ic: "🌩️", nm: "にせらいてい ファルサ" },
  { ic: "🔥", nm: "こくえんこう ニグレド" },   { ic: "🎭", nm: "かおなしの おう" },
  { ic: "⚙️", nm: "ぎゃくてんきかん コントラ" },{ ic: "☄️", nm: "ほしくらい ステラヴォア" },
  { ic: "🕊️", nm: "にせせいじょ ルーメン" },   { ic: "🚪", nm: "もんばん イグノトゥス" },
  { ic: "🌊", nm: "ぎゃくしおの リヴァイア" }, { ic: "🌺", nm: "どくひめ ウィステリア" },
  { ic: "👑", nm: "さんだつしゃ テンペスト" }, { ic: "⚔️", nm: "ぼうれいしょうぐん シネリス" },
  { ic: "🌙", nm: "つきはみの ルナエ" },       { ic: "📕", nm: "かいざんしゃ レダクト" },
  { ic: "🏰", nm: "ようさいかく オブシダン" }, { ic: "⛲", nm: "おせんげん プロファヌ" },
  { ic: "🪐", nm: "しゅうまつの いじ フィニス" }, { ic: "🕳️", nm: "まおう ヴォイド" },
];

/* ── メインストーリー 全20章（王国とオーブの物語・DQ調） ── */
const CHAPTERS = [
  { nm: "第1章 たびだちのとき",     area: "アステルナ王国",
    intro: ["「おお ゆうしゃよ！ よくぞ まいられた！」", "「まおう ヴォイドの ぐんぜいが\n　20の ちほうから『ひかりのオーブ』を うばいさった…」", "「オーブが すべて きえたとき\n　この せかいは やみに のまれるであろう」", "「そなたに たくす！ なかまとともに\n　オーブを とりもどしてくれ！」", "こうして あなたの ぼうけんが はじまった——"],
    outro: ["さいしょの『ひかりのオーブ』を とりもどした！", "オーブは あたたかく ひかっている。\nのこりは 19こ……たびは はじまったばかりだ。"] },
  { nm: "第2章 しずかなもり",       area: "ヴェルデのもり",
    intro: ["とりの こえが きえた もり。\nこかげが ふしぜんに こい……。", "「もりの おくで まものの けはいが するぞ」"],
    outro: ["もりに ひかりが もどった！\n2つめの オーブを てにいれた！"] },
  { nm: "第3章 こおりのみずうみ",   area: "グラキエスのこおりみずうみ",
    intro: ["みずうみごと こおりついた みなとまち。\nこおりの なかに ひとかげが……！", "「まものが まちごと こおらせたのか…ゆるせん！」"],
    outro: ["こおりが とけ みずおとが もどった。\n3つめの オーブを てにいれた！"] },
  { nm: "第4章 かみなりのけいこく", area: "トニトルスけいこく",
    intro: ["けいこくに ひびく かみなりは\nまものの ほうこうでも あった。", "「おちる かみなりが ぜんぶ くろい……いそごう！」"],
    outro: ["けいこくの かみなりが しろがねいろに もどった。\n4つめの オーブを てにいれた！"] },
  { nm: "第5章 もえるおうと",       area: "きゅうおうと イグニカ",
    intro: ["ふるい おうとは みっかみばん\nくろい ほのおに つつまれていた。", "「しろの ちかに おおきな『あな』があるようだ」", "——この しょうの ボスは てごわいぞ。そうびを ととのえよ！"],
    outro: ["くろい ほのおが はれ かねのねが なりひびく。\n5つめの オーブ……だが まおうの『こえ』を きいたきがした。"] },
  { nm: "第6章 かめんのれいびょう", area: "ちかれいびょう ペルソナ",
    intro: ["ししゃの ねむる れいびょうで\nかめんたちが ささやきあう……。", "「ここの まものは きおくを くうらしい。きをつけよ」"],
    outro: ["れいびょうに しじまが もどった。\n6つめの オーブを てにいれた！"] },
  { nm: "第7章 はぐるまのきょとう", area: "きこうとう メカニクス",
    intro: ["とまったはずの こだいきかんが\nぎゃくかいてんを はじめた！", "「とうが『せかいの まきもどし』を はじめておる…とめるのじゃ！」"],
    outro: ["はぐるまが ただしい むきに まわりだした。\n7つめの オーブを てにいれた！"] },
  { nm: "第8章 ほしふりのさばく",   area: "ステラさばく",
    intro: ["よごと さばくに ほしが おちる。\nそれは まものに うちおとされた ほしぼしだった。", "「この さばくは ほしの はかば……かなしいところじゃ」"],
    outro: ["りゅうせいが おちずに よぞらを わたっていく。\n8つめの オーブを てにいれた！"] },
  { nm: "第9章 しろのだいせいどう", area: "せいと ルーメン",
    intro: ["いのりの まちは むきずに みえた。\n——それが さいだいの いじょうだった。", "「この まちだけ おそわれていない…？ そんなはずは ない」"],
    outro: ["いつわりの へいわに ひそむ まものを うちはらった！\n9つめの オーブを てにいれた！"] },
  { nm: "第10章 しんえんのとびら",  area: "きょうかいいき リミナル",
    intro: ["せかいの さけめ。ここからさきは まおうの りょういき。", "「10こめの オーブは……とびらの むこうがわだ」", "——ちゅうかんけっせん！ そうびと どうぐを ととのえよ！"],
    outro: ["とびらの むこうで みたのは\n『ほろびた もうひとつの せかい』の ざんがいだった。", "まおうヴォイドとは——ほろびた せかいの なれのはて。", "10こめの オーブを てにいれた。たびは こうはんへ！"] },
  { nm: "第11章 さかさのうみ",      area: "てんかい イルヴァース",
    intro: ["そらに うみが うかぶ ふしぎな ちほう。\nじゅうりょくさえ ゆがんでいる。", "「あしもとに きをつけよ。……うえに おちるぞ」"],
    outro: ["うみが そらから だいちへ かえっていく。\n11こめの オーブを てにいれた！"] },
  { nm: "第12章 ふじいろのどくばやし", area: "げんわくりん ウィステリア",
    intro: ["うつくしい ふじの はなぞの。\nだが かふんの ひとつぶまで もうどくだ。", "「きれいなものほど うたがって かかるのじゃ」"],
    outro: ["どくが きよめられ ほんものの はなの かおりが もどった。\n12こめの オーブを てにいれた！"] },
  { nm: "第13章 らいていのぎょくざ", area: "らんていきゅう テンペスト",
    intro: ["あらしを すべた こだいおうの きゅうでんに\nまものが『にせの おう』として くんりんする。", "「ぎょくざから ひきずりおろしてやるわ！」"],
    outro: ["にせおうは くだけ きゅうでんに しずかな かぜが ふく。\n13こめの オーブを てにいれた！"] },
  { nm: "第14章 かいじんのせんじょう", area: "こせんじょう シネリス",
    intro: ["ひゃくねんまえの せんじょうあと。\nたおれた ものたちの みれんを まものが あやつる。", "「……ねむらせてあげよう。こんどこそ ちゃんと」"],
    outro: ["はいの せんしたちは やすらかに ひかりへ かえった。\n14こめの オーブを てにいれた！"] },
  { nm: "第15章 がらすのつき",      area: "げっかいでん ルナリア",
    intro: ["つきへ いたる がらすの かいだん。\nまものは つきの うらがわに『す』を きずいていた。", "「つきが かけてみえたのは……おかされていたから なのだ」"],
    outro: ["つきが みちる。ほんとうの まんげつを\nせかいは ひさしぶりに みた。15こめの オーブ！"] },
  { nm: "第16章 むおんのとしょかん", area: "えいちのふ アーカイブ",
    intro: ["せかいの きろくを おさめた だいとしょかん。\nまものが『れきしの かいざん』を はじめている！", "「ほんの なかみが かきかわっていく…いそげ！」"],
    outro: ["れきしは まもられた。16こめの オーブ。\nのこりは あと 4つ！"] },
  { nm: "第17章 こくようのようさい", area: "ぜんせんようさい オブシダン",
    intro: ["まおうぐんが きずいた ぜんせんきち。\nここを おとせば ほんじんが みえてくる。", "「そうこうげきだ！ ぜんいん、いくぞ！」"],
    outro: ["ようさいは かんらくした！ 17こめの オーブ。\n……まおうじょうの ざひょうを つかんだ！"] },
  { nm: "第18章 げんしょのいずみ",  area: "せいれいのみなもと サンクタ",
    intro: ["すべての まりょくが うまれる ばしょ。\nまおうの ねらいは さいしょから ここだった。", "「みなもとを まもりぬくのだ！ ここが おちれば\n　せかいじゅうの まほうが とまってしまう！」"],
    outro: ["みなもとは まもられ せかいの まりょくが いきをふきかえす。\n18こめの オーブを てにいれた！"] },
  { nm: "第19章 ほしのぼひょう",    area: "ほろびたせかい フィニス",
    intro: ["まおうの こきょう——かつて まりょくを うしない\nほろびた もうひとつの せかい。", "「かれらは……すくわれたかった だけなのかもしれん」", "それでも。この せかいを わたすわけには いかない。"],
    outro: ["ほろびた せかいの ちゅうしんで\n19こめの オーブが なくように ひかった。"] },
  { nm: "さいしゅうしょう けっせん", area: "まおうじょう『む』",
    intro: ["19の オーブが きょうめいし\nまおうじょうへの みちが ひらいた。", "「いこう。——さいごの たたかいだ」", "20この オーブ、すべての なかま、そして あなたの たびじが\nここで ひとつに なる。"],
    outro: ["……ひかりが せかいを あらいながしていく。", "まおうヴォイドは ほろびではなく『さいせい』をえらんだ。\nまりょくの ながれに いだかれて。", "「ありがとう ゆうしゃよ。——また どこかの ものがたりで」", "— MagiResonance だいいちぶ かん —"] },
];
const STAGES_PER_CH = 10;
const STAGE_WORDS = ["まもののむれ", "みちなきみち", "くらいほらあな", "こわれたはし", "みはりのとう", "きりのおか", "すてられたむら", "ふるいさんどう", "まようばしょ"];

/* ── 格闘場ランク ── */
const PVP_RANKS = [
  { nm: "ブロンズ",   ic: "🥉", min: 0,    c: "#c8845a" },
  { nm: "シルバー",   ic: "🥈", min: 1100, c: "#b8c4d8" },
  { nm: "ゴールド",   ic: "🥇", min: 1250, c: "#ffd257" },
  { nm: "プラチナ",   ic: "💠", min: 1400, c: "#7fe8d8" },
  { nm: "ダイヤ",     ic: "💎", min: 1550, c: "#7f9dff" },
  { nm: "マスター",   ic: "🔱", min: 1700, c: "#c07fff" },
  { nm: "レジェンド", ic: "🌟", min: 1850, c: "#ff6fd8" },
];
function pvpRankOf(rating) {
  let r = PVP_RANKS[0];
  for (const rk of PVP_RANKS) if (rating >= rk.min) r = rk;
  return r;
}

/* ── 実績・称号 ── */
const ACHIEVEMENTS = [
  { id: "story1",  nm: "たびだちのゆうしゃ",   d: "第1章をクリア",             title: "かけだしゆうしゃ",   check: (s) => chClearCount(s) >= 1 },
  { id: "story5",  nm: "おうとのかいほうしゃ", d: "第5章をクリア",             title: "おうとのえいゆう",   check: (s) => chClearCount(s) >= 5 },
  { id: "story10", nm: "しんえんをのぞくもの", d: "第10章をクリア",            title: "きょうかいのゆうしゃ", check: (s) => chClearCount(s) >= 10 },
  { id: "story20", nm: "せかいをすくったひ",   d: "全20章をクリア",            title: "★でんせつのゆうしゃ★", check: (s) => chClearCount(s) >= 20 },
  { id: "tower10", nm: "とうのぼりびと",       d: "しれんのとう10階到達",      title: "とうのぼりびと",     check: (s) => (s.tower || 0) >= 10 },
  { id: "tower30", nm: "てんをめざすもの",     d: "しれんのとう30階到達",      title: "うんじょうびと",     check: (s) => (s.tower || 0) >= 30 },
  { id: "lv20",    nm: "いっぱしのぼうけんか", d: "だれかがLv20到達",          title: "ぼうけんか",         check: (s) => Object.keys(s.xp || {}).some((id) => lvFromXp(s.xp[id]) >= 20) },
  { id: "lv50",    nm: "はぐれメタルなみ",     d: "だれかがLv50到達",          title: "れんきんのたつじん", check: (s) => Object.keys(s.xp || {}).some((id) => lvFromXp(s.xp[id]) >= 50) },
  { id: "pvp10",   nm: "かくとうじょうのかお", d: "かくとうじょうで通算10勝",  title: "とうぎのかぜ",       check: (s) => (s.arena && s.arena.wins || 0) >= 10 },
  { id: "pvpGold", nm: "おうごんのうでまえ",   d: "かくとうじょうでゴールド到達", title: "おうごんのとうし", check: (s) => (s.arena && s.arena.best || 1000) >= 1250 },
  { id: "mdex10",  nm: "まものはかせ",         d: "モンスター図鑑10種類",      title: "まものはかせ",       check: (s) => Object.keys(s.mdex || {}).length >= 10 },
  { id: "mdexAll", nm: "だいまものはかせ",     d: "モンスター図鑑コンプ",      title: "★だいまものはかせ★", check: (s) => Object.keys(s.mdex || {}).length >= MONSTERS.length },
  { id: "rich",    nm: "おおがねもち",         d: "所持金10,000G",             title: "ゴールデンおうじゃ", check: (s) => (s.gold || 0) >= 10000 },
  { id: "explore5",nm: "そうげんのあしあと",   d: "たんけんを5回完了",         title: "そうげんのたびびと", check: (s) => (s.expDone || 0) >= 5 },
];

/* ── ユーティリティ ── */
function hashN(s, salt) { let h = salt >>> 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function seededRng(seedStr) {
  let s = hashN(seedStr, 2166136261) || 1;
  return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const MAX_LV = 99;
function lvFromXp(xp) { return Math.min(MAX_LV, 1 + Math.floor(Math.sqrt((xp || 0) / 22))); }
function xpForLv(lv) { return (lv - 1) * (lv - 1) * 22; }
function chClearCount(s) {
  let n = 0;
  for (let c = 1; c <= 20; c++) { if (s.story && s.story[c + "-" + STAGES_PER_CH]) n++; }
  return n;
}

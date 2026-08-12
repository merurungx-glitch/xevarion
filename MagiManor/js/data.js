/* ============================================================
   MagiManor — DATA
   マップ / イベント / アイテム / エンディング定義
   タイル凡例:
     # 壁   w 窓壁   . 床   , 絨毯/道   : 舞台   ! 奈落
     % ひび割れ床(落下死)  v 振り子の刃  x 崩壊タイル(見た目)
     B 本棚  P 鉢植え  S 石像  M 鏡  K 大時計  O ピアノ  = 机
     * 燭台(光源)  h 生垣  F 花  f 食虫花  ~ 水面  + 扉
   ============================================================ */
window.MANOR = (function () {

/* ── アイテム ── */
const ITEMS = {
  key_rust:  { n: "錆びた鍵",   ic: "🗝️", d: "赤茶けた錆に覆われた古い鍵。図書室の扉に合いそうだ。" },
  key_silver:{ n: "銀の鍵",     ic: "🗝️", d: "鏡のように磨かれた銀の鍵。裏面に植物の紋様。" },
  key_red:   { n: "赤い鍵",     ic: "🗝️", d: "花の蜜のような匂いがする、赤い鍵。" },
  key_gold:  { n: "金の鍵",     ic: "🗝️", d: "時計仕掛けの装飾がついた金の鍵。微かに時を刻む音がする。" },
  book1: { n: "赤い本『はじまりノ夜』", ic: "📕", d: "ページはすべて白紙だ。最後の頁にだけ「夜」と書かれている。" },
  book2: { n: "赤い本『真夜中ノ客』",   ic: "📕", d: "誰かの来訪の記録……名前の欄は黒く塗り潰されている。" },
  book3: { n: "赤い本『オワリノ朝』",   ic: "📕", d: "「朝は来なかった」とだけ、繰り返し書かれている。" },
  grimoire:{ n: "魔導書",      ic: "📖", d: "『記憶ノ欠片、五ツ集メシ者ノミ、館ノ真実ヲ知ル』" },
  seed:  { n: "花の種",       ic: "🌱", d: "土の中で微かに脈打っている……温かい。" },
  photo: { n: "古い写真",     ic: "🖼️", d: "花壇の前で笑う庭師と、若い頃の祖母が写っている。" },
  score: { n: "楽譜",         ic: "🎼", d: "『三度、同ジ音ヲ』……譜面は途中から血で滲んで読めない。" },
  orgel: { n: "オルゴール",   ic: "🎵", d: "蓋を開けると、静かで哀しい旋律が流れる。" },
  eye:   { n: "人形の左目",   ic: "👁️", d: "ガラスの瞳。じっと見ていると、向こうも見返してくる。" },
  watch: { n: "懐中時計",     ic: "⌚", d: "執事の懐中時計。針は4時44分で止まっている。" },
  shard: { n: "記憶のかけら", ic: "✨", d: "館が奪った記憶の結晶。手の中でほのかに温かい。", count: true },
};

/* ── 死因 ── */
const DEATHS = {
  chandelier: { t: "シャンデリアの下敷きになった", s: "鎖の軋む音は、警告だった。" },
  shelf:      { t: "本棚に潰された",               s: "物語の順番を、館は覚えていた。" },
  paint:      { t: "絵の中へ引きずり込まれた",     s: "額縁の中から、あなたが微笑んでいる。" },
  pit:        { t: "床が崩れ落ちた",               s: "底からは、誰の声も返ってこない。" },
  flower:     { t: "花に喰われた",                 s: "甘い香りは、消化液の匂いだった。" },
  scissors:   { t: "巨大な鋏に挟まれた",           s: "庭師は、伸びすぎた枝を剪定しただけだ。" },
  blade:      { t: "振り子の刃に裂かれた",         s: "時は、誰のためにも止まらない。" },
  clockboom:  { t: "大時計が爆発した",             s: "誤った時刻を、時計は許さなかった。" },
  statue:     { t: "石像に抱きしめられた",         s: "止まった時の中で、石はゆっくり動く。" },
  gear:       { t: "歯車に巻き込まれた",           s: "館の仕掛けの、部品のひとつになった。" },
  wire:       { t: "ピアノ線が首に絡んだ",         s: "誤った旋律の対価は、高くつく。" },
  light:      { t: "落ちてきた照明に潰された",     s: "舞台の主役には、照明が当たるものだ。" },
  doll:       { t: "人形に連れて行かれた",         s: "「ずっと、いっしょ」",},
  shadow:     { t: "影に呑まれた",                 s: "灯りを手放した者から、闇は連れてゆく。" },
  fakedoor:   { t: "扉に喰われた",                 s: "猫は言った。「開いてるよ」と。",},
  mirror:     { t: "鏡の中に閉じ込められた",       s: "ガラスの向こうで、あなたが叩いている。" },
};

/* ── エンディング ── */
const ENDINGS = {
  BAD: { rank: "ENDING 01 — BAD", name: "新しい住人", xeva: 100,
    txt: "あなたは、扉に背を向けた。\n\n白い女性は静かに微笑み、\nあなたの名前を——新しい名前を呼んだ。\n\n翌朝、館の食堂にはひとつ、席が増えていた。\n\n祖母の手紙は、暖炉で灰になった。\nもう、届く相手はいないのだから。" },
  NORMAL: { rank: "ENDING 02 — NORMAL", name: "灰色の朝", xeva: 200,
    txt: "MagiCoreは砕け、館は悲鳴を上げて崩れていった。\n\n気がつくと、あなたは森の入口に立っていた。\nなぜここにいるのか、思い出せない。\n\nポケットには、宛先のない手紙が一通。\n\n「もし私が帰らなかったら——」\n\n誰の字だったのか、それすらも。" },
  TRUE: { rank: "ENDING 03 — TRUE", name: "館の真実", xeva: 400,
    txt: "記憶のかけらが、すべてを繋いだ。\n\n館は、孤独から生まれた。\n祖母は館を滅ぼすためではなく、\n「看取る」ために、ここへ来たのだ。\n\nあなたはコアの前で、祖母の声を聞いた。\n「ありがとう。もう、眠れるわ」\n\n朝焼けの中、館は静かに溶けていった。\nあなたは、すべてを覚えたまま家路につく。" },
  PERFECT: { rank: "ENDING 04 — PERFECT", name: "すべての住人へ", xeva: 600,
    txt: "人形は瞳を取り戻し、\n執事は時を取り戻し、\n庭師は思い出を取り戻した。\n\n住人たちに見送られ、あなたはコアに触れる。\n\n「——おかえり。そして、いってらっしゃい」\n\n館が消えた丘には、一面の花畑が残された。\n毎年その花は、誰も植えていないのに咲くという。" },
  SECRET: { rank: "ENDING 05 — SECRET", name: "共犯者たち", xeva: 500,
    txt: "「壊さないの?」と黒猫が聞いた。\n\nあなたは首を振った。\n恐怖はもう、そこにはなかった。\n\n館は変わらず丘の上に建っている。\nただ、迷い込んだ者は皆こう証言する。\n\n「黒猫と、妙に優しい案内人がいた」と。\n\n——それが誰なのかは、言うまでもない。" },
  UNKNOWN: { rank: "ENDING ??? ", name: "最初からずっと", xeva: 1000,
    txt: "六つ目のかけらが、最後の記憶を返した。\n\n——思い出した。\nこの廊下を走った日のこと。\nこのピアノを弾いた夜のこと。\n\nあなたは迷い込んだのではない。\n帰ってきたのだ。\n\n館は、すべてを覚えている。\nあなたが忘れても。\n\n「おかえりなさい」\n\nその声に、あなたは初めて、笑って答えた。" },
};

/* ============================================================
   マップ定義
   ============================================================ */
const MAPS = {};

/* ── 第一章: Entrance Hall ── */
MAPS.hall = {
  name: "第一章 — 玄関ホール", theme: "hall", dark: 0.30, chapter: 1,
  grid: [
    "##########+##########",
    "#.......*...*.......#",
    "#...................#",
    "#..S.....,,,.....S..#",
    "#........,,,........#",
    "#..B.....,,,.....B..#",
    "#........,,,........#",
    "#..=.....,,,.....=..#",
    "#...................#",
    "#..*.....,,,.....*..#",
    "#.........,.........#",
    "#...................#",
    "#####################",
  ],
  spawn: { x: 10, y: 10, dir: "up" },
  enter: "hall_intro",
  doors: { "10,0": { flag: "hall_open", need: "key_rust", name: "図書室の扉", locked: "鍵穴は赤錆で覆われている。錆びた鍵が合いそうだ。" } },
  exit: { "10,0": { map: "library", x: 1, y: 7, dir: "right" } },
  obj: [
    { x: 14, y: 10, spr: "cat",   ev: "hall_cat",   solid: 1 },
    { x: 6,  y: 10, spr: "type",  ev: "typewriter", solid: 1 },
    { x: 4,  y: 2,  spr: "cand",  ev: "hall_candL", solid: 1, tag: "L" },
    { x: 16, y: 2,  spr: "cand",  ev: "hall_candR", solid: 1, tag: "R" },
    { x: 10, y: 5,  spr: "cand",  ev: "hall_candC", solid: 1, tag: "C" },
    { x: 6,  y: 0,  spr: "paint", ev: "hall_paint", wall: 1 },
    { x: 14, y: 0,  spr: "plaque",ev: "hall_plaque", wall: 1 },
    { x: 10, y: 12, spr: "bigdoor", ev: "hall_front", wall: 1 },
    { x: 2,  y: 11, spr: "shard", ev: "hall_shard", solid: 1, hideFlag: "hall_shard_got" },
    { x: 10, y: 8,  spr: "key",   ev: "hall_key", solid: 1, showFlag: "hall_cand_done", hideFlag: "hall_key_got", tint: "#b0654a" },
  ],
  trg: {
    "10,4": { ev: "hall_chandelier" }, "10,3": { ev: "hall_chandelier" },
  },
  tileEv: { "B": "ev_shelf_generic", "S": "hall_statue", "=": "hall_table" },
};

/* ── 第二章: Mirror Library ── */
MAPS.library = {
  name: "第二章 — 鏡の図書室", theme: "library", dark: 0.45, chapter: 2,
  grid: [
    "#########################",
    "#BBBB.BBBB...BBBB.BBBB..#",
    "#.......................#",
    "#..*..................*.#",
    "#BB.BB..BB.BB..BB.BB....#",
    "#.......................#",
    "#...........,,.........M#",
    "+...........,,..........+",
    "#...........,,.........M#",
    "#.......................#",
    "#BB.BB..BB.BB..BB.BB....#",
    "#............*..........#",
    "#..BBBB...BBBB...BBBB...#",
    "#.......................#",
    "#########################",
  ],
  spawn: { x: 1, y: 7, dir: "right" },
  enter: "lib_intro",
  doors: {
    "0,7": { flag: "hall_open", name: "玄関ホールへの扉" },
    "24,7": { flag: "lib_gard_open", need: "key_silver", name: "温室の扉", locked: "銀細工の扉。植物の紋様が刻まれている。\n銀の鍵が合いそうだ。" },
  },
  exit: { "0,7": { map: "hall", x: 10, y: 1, dir: "down" }, "24,7": { map: "garden", x: 1, y: 12, dir: "right" } },
  obj: [
    { x: 20, y: 13, spr: "cat",  ev: "lib_cat", solid: 1 },
    { x: 22, y: 13, spr: "type", ev: "typewriter", solid: 1 },
    { x: 2,  y: 1,  spr: "redbook", ev: "lib_book1", wall: 1, hideFlag: "lib_book1_got" },
    { x: 12, y: 4,  spr: "redbook", ev: "lib_book2", wall: 1, hideFlag: "lib_book2_got" },
    { x: 19, y: 12, spr: "redbook", ev: "lib_book3", wall: 1, hideFlag: "lib_book3_got" },
    { x: 5,  y: 12, spr: "gapshelf", ev: "lib_gap", wall: 1 },
    { x: 22, y: 9,  spr: "desk", ev: "lib_desk", solid: 1 },
    { x: 12, y: 0,  spr: "paint", ev: "lib_paint", wall: 1 },
    { x: 17, y: 1,  spr: "grim", ev: "lib_grimoire", wall: 1, hideFlag: "lib_grim_got" },
  ],
  trg: {},
  tileEv: { "B": "ev_shelf_generic", "M": "lib_mirror" },
};

/* ── 鏡の世界 ── */
MAPS.mirrorlib = {
  name: "——鏡ノ世界——", theme: "mirror", dark: 0.55, chapter: 2,
  grid: [
    "###############",
    "#....M....#...#",
    "#...........S.#",
    "#..BB.BB..#...#",
    "#.........##+##",
    "#....,....#...#",
    "#..BB.BB..#...#",
    "#.........#...#",
    "#....S....#...#",
    "#.........#...#",
    "###############",
  ],
  spawn: { x: 5, y: 2, dir: "down" },
  enter: "mir_intro",
  doors: { "12,4": { flag: "mir_door", name: "硝子の扉", locked: "扉は固く閉ざされている。石像が、こちらを見ている気がする。" } },
  exit: {},
  obj: [
    { x: 12, y: 6, spr: "key",  ev: "mir_key",   solid: 1, hideFlag: "mir_key_got", tint: "#cfd6e0" },
    { x: 12, y: 8, spr: "shard",ev: "mir_shard", solid: 1, hideFlag: "mir_shard_got" },
  ],
  trg: {},
  tileEv: { "M": "mir_back", "S": "mir_statue", "B": "mir_shelf" },
};

/* ── 第三章: Living Garden ── */
MAPS.garden = {
  name: "第三章 — 生きている温室", theme: "garden", dark: 0.22, chapter: 3,
  grid: [
    "#########################",
    "#hhhhhhhh...+...hhhhhhhh#",
    "#h......................#",
    "#h..FF...,,,,,,,...FF...#",
    "#h..FF...,........FF....#",
    "#....%%..,..~~~.........#",
    "#........,..~~~....f....#",
    "#...f....,..~~~.........#",
    "#........,.........FF...#",
    "#..FF....,....%%...FF...#",
    "#..FF....,,,,,,,,,......#",
    "#...............,.......#",
    "+...........,,,,,.......#",
    "#....f..................#",
    "#########################",
  ],
  spawn: { x: 1, y: 12, dir: "right" },
  enter: "gar_intro",
  doors: {
    "0,12": { flag: "gar_back", name: "図書室への扉" },
    "12,1": { flag: "gar_open", need: "key_red", name: "時計屋敷の扉", locked: "蔦が絡みついた扉。赤い鍵の形をした鍵穴がある。" },
  },
  exit: { "0,12": { map: "library", x: 23, y: 6, dir: "left" }, "12,1": { map: "clock", x: 11, y: 12, dir: "up" } },
  obj: [
    { x: 18, y: 3,  spr: "gardener", ev: "gar_gardener", solid: 1, hideFlag: "gar_chase_on" },
    { x: 2,  y: 11, spr: "cat",  ev: "gar_cat", solid: 1 },
    { x: 3,  y: 13, spr: "type", ev: "typewriter", solid: 1 },
    { x: 3,  y: 9,  spr: "dirt", ev: "gar_dirt", solid: 0, hideFlag: "gar_seed_got" },
    { x: 2,  y: 2,  spr: "shard", ev: "gar_shard", solid: 1, hideFlag: "gar_shard_got" },
  ],
  trg: { "13,7": { ev: "gar_pond" }, "12,7": { ev: "gar_pond" }, "14,7": { ev: "gar_pond" } },
  tileEv: { "F": "gar_flowerbed", "~": "gar_pond", "h": "gar_hedge" },
};

/* ── 第四章: Clock Mansion ── */
MAPS.clock = {
  name: "第四章 — 時計屋敷", theme: "clock", dark: 0.40, chapter: 4,
  grid: [
    "#######################",
    "#K..g......+......g..K#",
    "#.....................#",
    "#..=..vvvvvvvvvvv..=..#",
    "#.....................#",
    "#..K...............K..#",
    "#..........,..........#",
    "#..S.......,......S...#",
    "#..........,..........#",
    "#..K.......,.......K..#",
    "#..........,..........#",
    "#.....................#",
    "+..........,..........#",
    "#....g..........g.....#",
    "#######################",
  ],
  spawn: { x: 11, y: 12, dir: "up" },
  enter: "clk_intro",
  doors: {
    "0,12": { flag: "clk_back", name: "温室への扉" },
    "11,1": { flag: "clk_open", need: "key_gold", name: "劇場の扉", locked: "扉には歯車仕掛けの錠前。金の鍵が要るようだ。" },
  },
  exit: { "0,12": { map: "garden", x: 12, y: 2, dir: "down" }, "11,1": { map: "theater", x: 11, y: 12, dir: "up" } },
  obj: [
    { x: 14, y: 11, spr: "butler", ev: "clk_butler", solid: 1 },
    { x: 4,  y: 11, spr: "cat",  ev: "clk_cat", solid: 1 },
    { x: 2,  y: 13, spr: "type", ev: "typewriter", solid: 1 },
    { x: 3,  y: 5,  spr: "bigclock", ev: "clk_puzzle", solid: 1, wallless: 1 },
    { x: 18, y: 3,  spr: "chest", ev: "clk_chest", solid: 1 },
    { x: 21, y: 1,  spr: "glint", ev: "clk_shard", wall: 1, hideFlag: "clk_shard_got" },
    { x: 4,  y: 1,  spr: "note", ev: "clk_note", wall: 1 },
    { x: 16, y: 13, spr: "gearpile", ev: "clk_gear_trap", solid: 1 },
  ],
  trg: {},
  tileEv: { "K": "clk_kclock", "S": "clk_statue", "g": "clk_gears", "=": "clk_table" },
};

/* ── 第五章: Puppet Theater ── */
MAPS.theater = {
  name: "第五章 — 人形劇場", theme: "theater", dark: 0.55, chapter: 5,
  grid: [
    "#######################",
    "#..........+..........#",
    "#.....................#",
    "#..::::::::::::::::...#",
    "#..:......O.......:...#",
    "#..:..............:...#",
    "#..::::::::::::::::...#",
    "#.....................#",
    "#..,,,..,,,..,,,..,,..#",
    "#..,,,..,,,..,,,..,,..#",
    "#.....................#",
    "#..,,,..,,,..,,,..,,..#",
    "#.....................#",
    "+.....................#",
    "#######################",
  ],
  spawn: { x: 11, y: 12, dir: "up" },
  enter: "th_intro",
  doors: {
    "0,13": { flag: "th_back", name: "時計屋敷への扉" },
    "11,1": { flag: "th_open", need: "orgel", name: "忘レラレタ階ヘ", locked: "扉は音楽を求めている。鍵穴の代わりに、小さなゼンマイの穴がある。" },
  },
  exit: { "0,13": { map: "clock", x: 11, y: 2, dir: "down" }, "11,1": { map: "lost", x: 9, y: 10, dir: "up" } },
  obj: [
    { x: 11, y: 9,  spr: "doll", ev: "th_doll", solid: 1, hideFlag: "th_chase_on" },
    { x: 2,  y: 12, spr: "type", ev: "typewriter", solid: 1 },
    { x: 4,  y: 12, spr: "cat",  ev: "th_cat", solid: 1 },
    { x: 6,  y: 4,  spr: "puppet", ev: "th_puppet", solid: 1 },
    { x: 4,  y: 5,  spr: "plate", ev: "th_plate", solid: 0, step: 1 },
    { x: 16, y: 5,  spr: "plate2", ev: null, solid: 0 },
    { x: 18, y: 11, spr: "glint", ev: "th_eye", solid: 0, hideFlag: "th_eye_got" },
    { x: 16, y: 4,  spr: "paper", ev: "th_score", solid: 0, hideFlag: "th_score_got" },
    { x: 20, y: 2,  spr: "shard", ev: "th_shard", solid: 1, hideFlag: "th_shard_got" },
  ],
  trg: { "11,10": { ev: "th_spotlight" }, "9,8": { ev: "th_seatdoll", once: "th_seatdoll_done" } },
  tileEv: { "O": "th_piano", ":": null, ",": null },
};

/* ── 第六章: Forgotten Floor ── */
MAPS.lost = {
  name: "第六章 — 忘レラレタ階", theme: "lost", dark: 0.78, chapter: 6,
  grid: [
    "#####################",
    "#x..x....+....x...x.#",
    "#...................#",
    "#..x..######..x.....#",
    "#.....#....#........#",
    "#..*..#.x..#....*...#",
    "#.....#....#........#",
    "#.....##+###........#",
    "#..x.........x......#",
    "#.........*.........#",
    "#...x...........x...#",
    "#...................#",
    "#####################",
  ],
  spawn: { x: 9, y: 10, dir: "up" },
  enter: "lo_intro",
  doors: {
    "9,1": { flag: "lo_open", name: "———", ev: "lo_dooropen" },
    "8,7": { flag: "lo_inner", name: "闇の扉", ev: "lo_innerdoor" },
  },
  exit: { "9,1": { map: "heart", x: 8, y: 11, dir: "up" }, "9,11": { map: "theater", x: 11, y: 2, dir: "down" } },
  obj: [
    { x: 9, y: 5,  spr: "watchitem", ev: "lo_watch", solid: 0, hideFlag: "lo_watch_got" },
    { x: 15, y: 8, spr: "butler", ev: "lo_butler", solid: 1, showFlag: "lo_watch_got" },
    { x: 14, y: 3, spr: "scratch", ev: "lo_scratch", solid: 0 },
    { x: 18, y: 10, spr: "shard", ev: "lo_shard", solid: 1, hideFlag: "lo_shard_got" },
    { x: 2, y: 10, spr: "type", ev: "typewriter", solid: 1 },
  ],
  trg: { "9,2": { ev: "lo_doorapproach", once: "lo_app_done" } },
  tileEv: { "x": "lo_glitch" },
};

/* ── 最終章: Heart Room ── */
MAPS.heart = {
  name: "最終章 — 心臓の間", theme: "heart", dark: 0.35, chapter: 7,
  grid: [
    "#################",
    "#...............#",
    "#......***......#",
    "#...............#",
    "#.....,,,,,.....#",
    "#....,,,,,,,....#",
    "#....,,,,,,,....#",
    "#....,,,,,,,....#",
    "#.....,,,,,.....#",
    "#...............#",
    "#...............#",
    "#...............#",
    "#################",
  ],
  spawn: { x: 8, y: 11, dir: "up" },
  enter: "he_intro",
  doors: {}, exit: {},
  obj: [
    { x: 8, y: 6, spr: "core",  ev: "he_core", solid: 1 },
    { x: 8, y: 3, spr: "woman", ev: "he_woman", solid: 1 },
  ],
  trg: {},
  tileEv: {},
};

/* ============================================================
   イベント定義
   ============================================================ */
const EV = {

/* ═══ 第一章 ═══ */
hall_intro: [
  { once: "hall_intro_done" },
  { fx: "red" }, { wait: 400 },
  "……振り返ると、入ってきたはずの扉は\nただの壁になっていた。",
  { snd: "sting2" },
  "外の音が、しない。\n雨も、風も、何もかも。",
  { n: "???", m: "「いらっしゃい」" },
  { fn: (a) => a.faceLeft() },
  "足元を、黒い猫が横切った。",
  { fear: 8 },
],
hall_cat: [
  { if: "hall_cand_done", then: [
      { n: "黒猫", m: "「上の扉、開いたみたいだね。\n　……行くの? 行くんだろうね」" },
      { n: "黒猫", m: "「タイプライターで記録を残すといい。\n　この館では、覚えていることだけが武器だから」" },
      { catpet: 1 },
    ], else: [
      { n: "黒猫", m: "「はじめまして、でいいのかな。\n　ボクはこの館の……案内係、みたいなもの」" },
      { n: "黒猫", m: "「そこのタイプライターは特別製。\n　打った記録は、死んでも残る」" },
      { n: "黒猫", m: "「灯りはみっつ。順番は、そうだな……\n　入口の銘板でも読んでみたら?」" },
      { catpet: 1 },
    ]},
],
hall_plaque: [
  "真鍮の銘板にはこう刻まれている。\n\n『目覚メヨ 左ノ焔、右ノ焔、\n　而シテ 中央ノ焔』",
],
hall_paint: [
  "巨大な肖像画。白いドレスの女性が描かれている。",
  "……絵の中の彼女は、\nさっきまで正面を向いていなかったか?",
  { fear: 6 }, { snd: "whisper" },
],
hall_table: [ "埃をかぶった机。来客名簿が開かれている。\n最後の頁に、書きかけの——あなたの名前。", { fear: 4 } ],
hall_statue: [ "天使の石像。目隠しをされている。\n台座に引っ掻き傷で『ミルナ』とある。" ],
hall_front: [
  "あなたが入ってきたはずの正面扉。\n今はただ、冷たい壁があるだけだ。",
  { n: "", m: "——出ロハ 中カラ 探セ——" }, { fear: 3 },
],
hall_candL: [ { candle: "L" } ],
hall_candR: [ { candle: "R" } ],
hall_candC: [ { candle: "C" } ],
hall_key: [
  { give: "key_rust" }, { set: "hall_key_got" }, { snd: "key" },
  "錆びた鍵を手に入れた。",
  { snd: "creak" },
  "……頭上で、鎖の軋む音がした。",
],
hall_chandelier: [
  { needFlag: "hall_key_got", else: [] },
  { if: "hall_chan_done", then: [], else: [
    { set: "hall_chan_done" },
    { fx: "shake" }, { snd: "crash" },
    { death: "chandelier" },
  ]},
],
hall_shard: [
  { set: "hall_shard_got" }, { give: "shard" }, { snd: "shard" },
  "階段の影に、淡く光るものが落ちていた。\n\n【記憶のかけら】を手に入れた。（1/6）",
  { n: "", m: "『——おばあちゃん、この館ってね——』\n\n知らない子どもの声が、頭の中で響いた。" },
],

/* ═══ 第二章 ═══ */
lib_intro: [
  { once: "lib_intro_done" },
  "本の匂い。だが、どの本にも題名がない。",
  "奥の壁に、大きな鏡が二枚。\n本棚の並びが、鏡の中と現実で……違う。",
  { fear: 4 },
],
lib_cat: [
  { if: "lib_secret", then: [
    { n: "黒猫", m: "「鏡、開いたんだ。……気をつけて。\n　向こうのキミが、こっちに来たがってるから」" },
    { catpet: 1 },
  ], else: [
    { n: "黒猫", m: "「この図書室の本はぜんぶ白紙。\n　館が読み終わっちゃったんだ」" },
    { n: "黒猫", m: "「赤い背表紙の本が三冊だけ、まだ生きてる。\n　空いた棚に、正しい順で還してあげて」" },
    { n: "黒猫", m: "「あと……絵には近づかないほうがいい。\n　たぶんね」" },
    { catpet: 1 },
  ]},
],
lib_desk: [ "閲覧机に開かれたままのノート。\n\n『物語ハ 夜ニ始マリ、客ヲ迎エ、\n　朝ニ終ワル』" ],
lib_book1: [ { set: "lib_book1_got" }, { give: "book1" }, { snd: "key" }, "赤い本『はじまりノ夜』を抜き取った。" ],
lib_book2: [ { set: "lib_book2_got" }, { give: "book2" }, { snd: "key" }, "赤い本『真夜中ノ客』を抜き取った。" ],
lib_book3: [ { set: "lib_book3_got" }, { give: "book3" }, { snd: "key" }, "赤い本『オワリノ朝』を抜き取った。" ],
lib_grimoire: [
  { set: "lib_grim_got" }, { give: "grimoire" }, { snd: "key" },
  "他の本と違い、題のある黒い本を見つけた。\n\n【魔導書】を手に入れた。",
  "『記憶ノ欠片、五ツ集メシ者ノミ、\n　館ノ真実ヲ知ル。\n　六ツ目ハ——汝自身ノ記憶也』",
],
lib_gap: [
  { if: "lib_secret", then: [ "本は静かに収まっている。\n鏡の奥から、風が流れてくる。" ], else: [
    { fn: (a) => a.libGap() },
  ]},
],
lib_paint: [
  "何も描かれていない、大きな額縁。",
  { fx: "shake" }, { snd: "sting2" },
  "額縁から、青白い手が伸びた——!",
  { death: "paint" },
],
lib_mirror: [
  { if: "lib_secret", then: [
    "鏡の表面が、水のように揺れている。",
    { q: "鏡に足を踏み入れる?", ch: [
      { t: "踏み入れる", ev: [ { snd: "mirror" }, { fx: "flash" }, { tp: { map: "mirrorlib", x: 5, y: 2, dir: "down" } }, { fear: 10 } ] },
      { t: "やめておく", ev: [ "あなたは一歩、退いた。" ] },
    ]},
  ], else: [
    "大きな鏡。映っている図書室は——\n本棚の位置が、こちらと違う。",
    "鏡の中のあなたが、一拍遅れて瞬きをした。",
    { fear: 6 },
  ]},
],
mir_intro: [
  { once: "mir_intro_done" },
  "音が、消えた。",
  "ここは鏡の中。すべてが反転した図書室。\n呼吸の音だけが、やけに大きく聞こえる。",
  { fear: 8 },
],
mir_back: [
  { q: "鏡から現実へ戻る?", ch: [
    { t: "戻る", ev: [ { snd: "mirror" }, { fx: "flash" }, { tp: { map: "library", x: 23, y: 6, dir: "left" } } ] },
    { t: "まだ残る", ev: [ "背中に、誰かの視線を感じる。", { fear: 4 } ] },
  ]},
],
mir_statue: [
  { if: "mir_door", then: [ "石像は背を向けている。" ], else: [
    "目隠しの石像——だが此処では目隠しが外れ、\nその瞳がゆっくりと、扉のほうを向いた。",
    { snd: "stone" }, { fx: "shake" },
    "硝子の扉の錠が落ちる音がした。",
    { set: "mir_door" }, { fear: 10 },
  ]},
],
mir_shelf: [ "鏡の中の本棚。本の背表紙の文字が、\nすべて裏返しに——いや、これは……名前だ。\n誰かの名前が、無数に並んでいる。", { fear: 5 } ],
mir_key: [
  { set: "mir_key_got" }, { give: "key_silver" }, { snd: "key" },
  "台座の上に、銀の鍵。\n\n【銀の鍵】を手に入れた。",
  "これで図書室の先——温室へ進めるはずだ。",
  { set: "gar_back" }, { set: "lib_exit_open" },
],
mir_shard: [
  { set: "mir_shard_got" }, { give: "shard" }, { snd: "shard" },
  "【記憶のかけら】を手に入れた。（2/6）",
  { n: "", m: "『鏡はぜんぶ覚えてるのよ。\n　映したものを、ぜんぶ』\n\n——祖母の声だ。" },
],

/* ═══ 第三章 ═══ */
gar_intro: [
  { once: "gar_intro_done" },
  { fn: (a) => a.setFlag("gar_back") },
  "ガラス張りの大温室。外は見えない。\nガラスの向こうは、ただ白い霧。",
  "花々が、一斉にこちらを向いた。",
  { fear: 6 },
],
gar_cat: [
  { if: "gar_chase_on", then: [ { n: "黒猫", m: "「走って!!　彼はもう、庭師じゃない!」" } ],
    else: [
      { n: "黒猫", m: "「庭師のおじいさん、悪い人じゃないよ。\n　……まだ、今のところは」" },
      { n: "黒猫", m: "「池の中、なにか光ってなかった?\n　……ボク、水は嫌いだから拾わないけど」" },
      { catpet: 1 },
    ]},
],
gar_gardener: [
  { if: "gar_saved", then: [
    { n: "庭師", m: "「写真を、ありがとう。\n　わしはもう大丈夫じゃ。……この鍵をお使い。\n　どうか、婆様によろしく」" },
    { if: "gar_key_given", then: [], else: [ { set: "gar_key_given" }, { give: "key_red" }, { snd: "key" }, "【赤い鍵】を手に入れた。" ] },
  ], else: [
    { gardener: 1 },
  ]},
],
gar_dirt: [
  "花壇の土が、不自然に盛り上がっている。",
  { q: "掘り返す?", ch: [
    { t: "掘る", ev: [ { set: "gar_seed_got" }, { give: "seed" }, { snd: "key" }, "土の中から【花の種】が出てきた。\n……微かに、脈打っている。", { fear: 4 } ] },
    { t: "やめる", ev: [ "触れないでおいた。" ] },
  ]},
],
gar_pond: [
  { if: "gar_photo_got", then: [ "静かな水面。もう、何も映っていない。" ], else: [
    "濁った池。水面に何かが浮いている。",
    { q: "手を伸ばす?", ch: [
      { t: "拾い上げる", ev: [
        { set: "gar_photo_got" }, { give: "photo" }, { snd: "key" },
        "【古い写真】を手に入れた。\n花壇の前で笑う庭師と——若い頃の、祖母。",
        { snd: "whisper" },
        "水面の下で、無数の白い手が\nゆっくりと沈んでいった。", { fear: 10 },
      ]},
      { t: "やめる", ev: [ "水面が、少しだけ波立った。" ] },
    ]},
  ]},
],
gar_flowerbed: [ "見たこともない花。\n花弁の中心に、歯のようなものが見える。", { fear: 3 } ],
gar_hedge: [ "生垣は硬く、鋏の入った跡が生々しい。" ],
gar_shard: [
  { set: "gar_shard_got" }, { give: "shard" }, { snd: "shard" },
  "生垣の影に光るもの。\n\n【記憶のかけら】を手に入れた。（3/6）",
  { n: "", m: "『この温室の花はね、ぜんぶ\n　「誰か」だったものなの』" },
],

/* ═══ 第四章 ═══ */
clk_intro: [
  { once: "clk_intro_done" },
  { fn: (a) => a.setFlag("clk_back") },
  "無数の時計の音。だが、よく聴くと\nどの時計も違う時刻を刻んでいる。",
  "振り子の音だけが、正確に——\nあなたの心拍と、同じ速さで鳴っている。",
  { fear: 6 },
],
clk_butler: [
  { if: "clk_stop", then: [
    { n: "執事", m: "「時が止まりましたな。……お急ぎを。\n　止まった時の中では、石像どもが動きます」" },
    { n: "執事", m: "「私の懐中時計を、この上の階で失くしました。\n　もし見つけたら……いえ、なんでもございません」" },
  ], else: [
    { n: "執事", m: "「ようこそ、お客様。……いえ、\n　もう『お客様』ではないのかもしれませんが」" },
    { n: "執事", m: "「この屋敷の主たる大時計は、\n　正しい時刻を待っております。\n　『四時四十四分』——死の時刻を」" },
    { n: "執事", m: "「くれぐれも、お間違えなきよう。\n　三度目の過ちに、時計は容赦しませぬ」" },
  ]},
],
clk_note: [ "壁の貼り紙。震える字で——\n\n『針ハ 四時四十四分ヲ 望ンデイル。\n 間違エルナ。アト ―正― 回』\n\n「正」の字は途中で途切れている。" ],
clk_table: [ "机の上に、分解された時計の部品。\nどの部品にも、小さく歯形がついている。", { fear: 3 } ],
clk_kclock: [ "大きな柱時計。針は動いているのに、\n時刻はずっと変わっていない。" ],
clk_gears: [ "床に積まれた歯車の山。まだ油が新しい。" ],
clk_gear_trap: [
  "ひときわ大きな歯車の山だ。",
  { q: "調べる?", ch: [
    { t: "隙間に手を入れる", ev: [ { fx: "shake" }, { snd: "gear" }, "歯車が、突然回り出した——!", { death: "gear" } ] },
    { t: "やめておく", ev: [ "……歯車が一度だけ、カチリと鳴った。", { fear: 3 } ] },
  ]},
],
clk_puzzle: [
  { if: "clk_stop", then: [ "大時計の針は 4:44 を指して止まっている。\n屋敷のすべての振り子が、静止していた。" ], else: [
    "屋敷の主たる大時計。針を合わせられそうだ。",
    { q: "短針を何時に合わせる?", ch: [
      { t: "4時",  ev: [ { clockmin: 1 } ] },
      { t: "6時",  ev: [ { clockfail: 1 } ] },
      { t: "12時", ev: [ { clockfail: 1 } ] },
    ]},
  ]},
],
clk_statue: [
  { if: "clk_stop", then: [ "石像が——今、動かなかったか?", { fear: 6 } ], else: [ "燕尾服の石像。深々と礼をしている。" ]},
],
clk_chest: [
  { if: "clk_chest_open", then: [ "空の宝箱。" ], else: [
    { set: "clk_chest_open" }, { snd: "key" }, { give: "key_gold" },
    "振り子の間の奥、古い宝箱の中に——\n\n【金の鍵】を手に入れた。",
  ]},
],
clk_shard: [
  { set: "clk_shard_got" }, { give: "shard" }, { snd: "shard" },
  "柱時計の文字盤の裏に、光るもの。\n\n【記憶のかけら】を手に入れた。（4/6）",
  { n: "", m: "『時間はね、館の中では\n　「飼われている」のよ』" },
],
clk_cat: [
  { n: "黒猫", m: "「振り子の刃、見た? 悪趣味だよね」" },
  { n: "黒猫", m: "「大時計を正しい時刻にすれば止まるよ。\n　でも……止まった時間の中で動けるのは、\n　キミだけじゃない」" },
  { catpet: 1 },
],

/* ═══ 第五章 ═══ */
th_intro: [
  { once: "th_intro_done" },
  { fn: (a) => a.setFlag("th_back") },
  "緞帳の下りた小さな劇場。\n観客席には、人形たちが行儀よく座っている。",
  "——全員、こちらを向いて。",
  { fear: 10 },
],
th_cat: [
  { if: "th_chase_on", then: [ { n: "黒猫", m: "「オルゴールを鳴らしながら走って!\n　あの子は音楽が止まると怒るんだ!」" } ],
    else: [
      { n: "黒猫", m: "「舞台の人形、キミの真似っこが得意なんだ。\n　鏡みたいにね。……利用できると思わない?」" },
      { n: "黒猫", m: "「客席の女の子には優しくしてあげて。\n　あの子、左目を落としちゃったんだって」" },
      { catpet: 1 },
    ]},
],
th_doll: [
  { if: "doll_friend", then: [
    { n: "人形少女", m: "「みえる。ぜんぶ、みえるの。\n　……おにいちゃん、おねえちゃん、\n　うえにいくんでしょう? きをつけて」" },
  ], else: [
    { dollmeet: 1 },
  ]},
],
th_eye: [
  { set: "th_eye_got" }, { give: "eye" }, { snd: "key" },
  "座席の下に、ガラスの瞳が転がっていた。\n\n【人形の左目】を手に入れた。",
],
th_puppet: [
  "等身大の操り人形。糸は天井の闇へ消えている。",
  "あなたが右手を上げると——\n人形も、左手を上げた。",
  { if: "th_plate_done", then: [], else: [ "……舞台の左右に、床のスイッチがある。\nこの「真似」を使えば、両方同時に押せるかもしれない。" ] },
],
th_plate: [
  { if: "th_plate_done", then: [ "スイッチは沈んだままだ。" ], else: [
    { set: "th_plate_done" }, { snd: "gear" }, { fx: "shake" },
    "あなたがスイッチを踏むと同時に、\n人形が反対側のスイッチを踏んだ。",
    "舞台袖で、何かが落ちる音がした。\n（舞台の右側に楽譜が現れた）",
    { fn: (a) => a.toast("🎼 舞台の右側に何かが落ちている") },
  ]},
],
th_score: [
  { needFlag: "th_plate_done", else: [ "舞台の床に、細い糸の跡がある。" ] },
  { set: "th_score_got" }, { give: "score" }, { snd: "key" },
  "【楽譜】を手に入れた。\n\n『三度、同ジ音ヲ』",
],
th_piano: [
  { if: "th_orgel_got", then: [ "ピアノは静かに閉じている。" ], else: [
    { need: "score", else: [ "古いグランドピアノ。\n楽譜がなければ、何を弾けばいいか分からない。" ] },
    { q: "どう弾く?", ch: [
      { t: "低い音から高い音へ", ev: [ { pianofail: 1 } ] },
      { t: "同じ音を三度", ev: [
        { snd: "piano3" }, { wait: 700 },
        "三つの同じ音が、劇場に響いた。",
        { fx: "flash" }, { snd: "gear" },
        "ピアノの蓋の中に、隠し棚が開いた。",
        { set: "th_orgel_got" }, { give: "orgel" }, { snd: "key" },
        "【オルゴール】を手に入れた。",
        { snd: "creak" },
        "……客席で、衣擦れの音がした。",
        { fn: (a) => a.startDollChase() },
      ]},
      { t: "高い音から低い音へ", ev: [ { pianofail: 1 } ] },
    ]},
  ]},
],
th_spotlight: [
  { if: "th_spot_done", then: [], else: [
    { set: "th_spot_done" },
    { snd: "creak" }, { fx: "shake" },
    "頭上でスポットライトが軋んだ——!",
    { death: "light" },
  ]},
],
th_seatdoll: [
  "最前列の人形と、目が合った。\n口の端が、ゆっくり吊り上がる。",
  { fear: 8 }, { snd: "whisper" },
],
th_shard: [
  { set: "th_shard_got" }, { give: "shard" }, { snd: "shard" },
  "舞台袖の暗がりに光るもの。\n\n【記憶のかけら】を手に入れた。（5/6）",
  { n: "", m: "『いつかあの子が来たら、\n　この劇場で誕生日会をしましょうね』\n\n——それは、あなたの誕生日の日付だった。" },
],

/* ═══ 第六章 ═══ */
lo_intro: [
  { once: "lo_intro_done" },
  "ここは——どこだ。",
  "壁も床も、ところどころ「欠けて」いる。\n欠けた場所の向こうには、何もない。\n黒でも白でもない、「無」がある。",
  "この階は、館の設計図に存在しない。",
  { fear: 15 },
],
lo_glitch: [ "床が壊れている。いや——\n「はじめから作られていない」。", { fear: 3 } ],
lo_scratch: [
  "壁一面の引っ掻き傷。何度も、何度も。\n\n『ネコヲ 信ジルナ』\n『ネコヲ 信ジルナ』\n『ネコヲ 信ジル——』",
  { fear: 8 },
],
lo_watch: [
  { set: "lo_watch_got" }, { give: "watch" }, { snd: "key" },
  "闇の部屋の中心に、懐中時計が落ちていた。\n\n【懐中時計】を手に入れた。\n針は4時44分で止まっている。",
  "……振り返ると、部屋の外に\n見覚えのある背中があった。",
],
lo_butler: [
  { if: "butler_saved", then: [ { n: "執事", m: "「参りましょう。……最後まで、お供いたします」" } ], else: [
    { n: "執事", m: "「……ここは、お客様が来てよい場所では」" },
    { need: "watch", else: [ { n: "執事", m: "「私は、何かを探していたはずなのですが……\n　思い出せないのです。ずっと、ずっと」" } ] },
    { q: "懐中時計を渡す?", ch: [
      { t: "渡す", ev: [
        { take: "watch" }, { set: "butler_saved" }, { snd: "chime" },
        { n: "執事", m: "「これは……私の……」" },
        "執事の姿が、一瞬だけ——\n燕尾服の青年の姿に、戻った気がした。",
        { n: "執事", m: "「思い出しました。私はこの館の執事。\n　そして、貴方様の祖母君の……古い友人です」" },
        { n: "執事", m: "「上の階へ。彼女が、待っております」" },
      ]},
      { t: "まだ渡さない", ev: [ { n: "執事", m: "「……そうですか」" } ] },
    ]},
  ]},
],
lo_doorapproach: [
  "上へ続く扉の前に、黒猫が座っている。",
  { n: "黒猫", m: "「やあ。……ここまで来ちゃったんだ」" },
  { n: "黒猫", m: "「その扉なら開いてるよ。\n　そのまま、真っ直ぐ入って」" },
  "扉が、ほんの少しだけ開いている。\n隙間の奥は——暗い。",
],
lo_dooropen: [
  { q: "扉の隙間は暗い。どうする?", ch: [
    { t: "そのまま入る", ev: [
      { fx: "shake" }, { snd: "sting2" },
      "扉が、大きく口を開けた——!",
      { death: "fakedoor" },
    ]},
    { t: "一歩さがる", ev: [
      "あなたは一歩、退いた。",
      "「扉」がしぼんでいく。牙のような蝶番が\n壁の中へ引っ込み——本物の扉が現れた。",
      { n: "黒猫", m: "「……へえ。ボクを疑うんだ」" },
      { n: "黒猫", m: "「——正解。えらいえらい」" },
      { set: "lo_open" }, { snd: "door" }, { fear: 6 },
      "扉が開いた。",
    ]},
  ]},
],
lo_innerdoor: [
  { if: "lo_inner", then: [], else: [
    "扉には鍵穴がない。代わりに、こう書かれている。\n\n『光ヲ捨テタ者ニノミ 開カレル』",
    { fn: (a) => a.tryDarkDoor() },
  ]},
],
lo_shard: [
  { set: "lo_shard_got" }, { give: "shard" }, { snd: "shard" },
  "「無」の縁に、最後のかけらが光っている。\n\n【記憶のかけら】を手に入れた。（6/6）",
  { n: "", m: "『——ね、おばあちゃん。\n　ぼく/わたし、おおきくなったら\n　このおうちに すんでもいい?』\n\nそれは、あなた自身の声だった。" },
  { fear: 12 },
],

/* ═══ 最終章 ═══ */
he_intro: [
  { once: "he_intro_done" },
  "心臓の音がする。",
  "部屋の中心に、巨大な魔力結晶——MagiCore。\n鼓動のたび、館全体が微かに脈打つ。",
  "その前に、白い女性が立っている。",
],
he_core: [
  "MagiCore。館のすべての源。\n表面に、無数の顔が浮かんでは消える。",
  "……その中に、祖母の顔があった。",
],
he_woman: [ { finale: 1 } ],

/* ═══ 共通 ═══ */
typewriter: [
  "古いタイプライター。\nインクリボンは真新しい。",
  { savemenu: 1 },
],
ev_shelf_generic: [ "背表紙のない本がぎっしりと並んでいる。\nどれも、開くと白紙だ。" ],

};

return { ITEMS, DEATHS, ENDINGS, MAPS, EV };
})();

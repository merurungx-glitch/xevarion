/* ══════════════════════════════════════════════════════════════
   ★★ 2026-10-26 完凸ロビー（ご指定「ヒサコとアリスは完凸すると、ロビー（パートナーの所）に動く立ち絵を出せる」）
   ------------------------------------------------------------
   ・表情は動かさず、軽く動かす（呼吸・頭の小さな傾き・髪とスカートのゆれ・体の重心）。
   ・★★ 2026-11-03 ご指定「完凸キャラが喋ったり、胸が揺れたりするように（表情は動かさなくてよい）」
     → セリフ（吹き出し＝パートナーと同じ見た目・LINES）：選んだとき・ホームに来たとき（時間帯のあいさつ）・タップ・ときどきのひとりごと。
       話しはじめに小さくはずみ、話しているあいだは小さくうなずく（顔はそのまま）。
     → 胸のばね（DEFS の bust：左右の中心・半径 R・外す箱 cut）。体のはずみ（タップ・話しはじめ）と呼吸に少し遅れてゆれる。
       ★ 胸のばねは<b>制服姿ではないキャラだけ</b>（ハル・チカ・ユナ・アイナ・ヨシノ・チフル）。制服姿の子（ヒサコ・アリス・コハク・ミント・プリカ）には付けない。
   ・選ぶのはパートナーの画面の「ロビー」タブ（パートナーとは別のタブ）。表示（標準・アップ・全身）はパートナーと同じ。
   ・開放＝そのキャラの完凸（MagiBurst の magiburst_v1.chars[id].awk か、ポータルの xeva_gacha_v1.dupes[id] が 4）。
   ・選んだロビーは xeva_mate_v1.lobby（同期する）。パートナーを選ぶと外れる（home-mate.js）。
   ・素材は home-mate/lobby/（立ち絵は背景が透明・元は Documents/Claude/_fes_src/1024/*_lobby_full.webp）。
     髪・スカートの見分けは読みこんだときに色で決める（DEFS の hair／cloth）。画素の座標は元の絵のまま。
     ★★ 2026-10-31 hair／cloth の boxes（この中だけ）・cut（この中は外す）・色相の [340, 20] のような 0 をまたぐ範囲も使える。
     fes＝そのキャラが出るガチャ（パートナーの画面の「ロビー」タブの説明に出す）。
   ・ほかの所からは home-mate.js と同じ呼ばれ方（mount／layout／greet／destroy／shouldRun／kick）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const VER = 1;
  const DIR = "home-mate/lobby/";
  const DEFS = {
    /* ★★ 2026-11-03 超極彩祭の追加3体（チフル・ミント・プリカ）。立ち絵は Documents/Claude/_fes_src/fes21b/2・6・10.webp（背景が透明の全身）。
       髪と黒い上着は色が同じなので、髪は boxes で場所を決めた（重ね絵で確認：髪だけ・布だけがゆれる） */
    chifuru: {
      name: "チフル", ruby: "Chifuru", color: "#4f6dff", el: "fire", img: "chifuru.webp", bg: "park.webp", fes: "超極彩祭（毎月1〜10日）",
      intro: "展望テラスで、青いハートの飴をのせたスプーンを手にするチフル。",
      rig: { size: [941, 1672], headTop: [400, 10], face: [410, 200], neck: [445, 320], shoulderY: 360, waistY: 590, hemY: 800, kneeY: 1170, pivot: [433, 1650], centerX: 440 },
      /* 髪＝こげ茶〜黒（場所の箱だけ・ハイネックの襟は外す）／ゆれる布＝肩から落とした黒いジャケット（左右） */
      hair: { sat: [0, 0.5], val: [0, 0.5], boxes: [[230, 0, 680, 285], [150, 280, 245, 720], [590, 300, 690, 600]], cut: [[330, 240, 560, 340]], noFace: [410, 200, 80, 100] },
      cloth: { sat: [0.08, 0.45], val: [0.05, 0.48], y0: 470, y1: 1010, boxes: [[235, 470, 425, 1010], [640, 470, 875, 960]] }, hairBlur: 14,
      bust: { l: [385, 466], r: [532, 466], R: 70, cut: [[290, 370, 352, 560]], amt: 1 },
    },
    mint: {
      name: "ミント", ruby: "Mint", color: "#2fbf8a", el: "wood", img: "mint.webp", bg: "park.webp", fes: "超極彩祭（毎月1〜10日）",
      intro: "展望テラスで、こちらへ手をのばすミント。",
      rig: { size: [941, 1672], headTop: [575, 8], face: [567, 215], neck: [535, 345], shoulderY: 392, waistY: 667, hemY: 900, kneeY: 1083, pivot: [408, 1650], centerX: 500 },
      /* 髪＝黒（頭と右の長い髪の箱だけ）／スカート＝灰色のプリーツ（白い線も・太ももの影は外す） */
      hair: { sat: [0, 0.22], val: [0, 0.5], boxes: [[430, 0, 760, 340], [660, 250, 830, 1160]], noFace: [567, 215, 80, 100] },
      cloth: { sat: [0, 0.09], val: [0.27, 1], y0: 630, y1: 910, boxes: [[190, 625, 705, 910]], cut: [[355, 850, 410, 925]] }, hairBlur: 16,
    },
    purika: {
      name: "プリカ", ruby: "Purika", color: "#e0a92a", el: "light", img: "purika.webp", bg: "park.webp", fes: "超極彩祭（毎月1〜10日）",
      intro: "展望テラスで、ピースとウインクをくれるプリカ。",
      rig: { size: [941, 1672], headTop: [408, 8], face: [410, 250], neck: [437, 342], shoulderY: 367, waistY: 683, hemY: 892, kneeY: 1200, pivot: [458, 1650], centerX: 450 },
      /* 髪＝黒（おだんご・左の長い髪・右肩のうしろ。ピースの手と紺のブレザーの袖は外す）／スカート＝チェックのミニスカート */
      hair: { sat: [0, 0.25], val: [0, 0.5], boxes: [[330, 0, 490, 110], [270, 60, 570, 330], [262, 300, 345, 440], [250, 440, 298, 780], [500, 280, 550, 470]], cut: [[290, 360, 420, 500]], noFace: [410, 250, 72, 92] },
      cloth: { sat: [0, 0.2], val: [0.08, 0.93], y0: 765, y1: 900, boxes: [[300, 740, 765, 905]] },
    },
    /* ★★ 2026-10-30 超極彩祭のハル・チカ（ご指定「この2キャラは完凸をすることでロビーにセットできます」）。
       立ち絵は Documents/Claude/_fes_src/fes21/3.webp（ハル）・7.webp（チカ）＝背景が透明の全身。背景は展望テラス（ヒサコ・アリスと同じ） */
    haru: {
      name: "ハル", ruby: "Haru", color: "#3a8ee8", el: "water", img: "haru.webp", bg: "park.webp", fes: "超極彩祭（毎月1〜10日）",
      intro: "展望テラスで、青い髪をかきあげるハル。",
      rig: { size: [940, 1672], headTop: [425, 15], face: [440, 205], neck: [455, 300], shoulderY: 330, waistY: 575, hemY: 880, kneeY: 1090, pivot: [470, 1640], centerX: 450 },
      /* 髪＝青（顔と胸の青いキャミソールは y と顔の楕円で外す）／ゆれる布＝白い上着のすそ（青みの白・肌は色相で外す） */
      hair: { hue: [200, 240], sat: [0.3, 1], val: [0.18, 0.95], y1: 322, noFace: [440, 205, 74, 90] },
      cloth: { hue: [190, 260], sat: [0.02, 0.2], val: [0.7, 1], y0: 560, y1: 900 },
      bust: { l: [393, 452], r: [497, 452], R: 54, amt: 0.85 },
    },
    chika: {
      name: "チカ", ruby: "Chika", color: "#8a5ce0", el: "dark", img: "chika.webp", bg: "park.webp", fes: "超極彩祭（毎月1〜10日）",
      intro: "展望テラスで、白いドレスのすそをつまむチカ。",
      rig: { size: [941, 1672], headTop: [510, 22], face: [530, 208], neck: [533, 295], shoulderY: 330, waistY: 580, hemY: 1450, kneeY: 1080, pivot: [520, 1630], centerX: 520 },
      /* 髪＝黒〜紺（白いドレスは明るさで外す・長い髪の範囲だけ）／スカート＝白〜うす紫のドレス（肌は色相で外す） */
      hair: { sat: [0, 0.8], val: [0, 0.62], boxes: [[110, 0, 480, 880], [380, 0, 680, 300], [600, 280, 790, 840]], noFace: [530, 208, 72, 90] },
      cloth: { hue: [200, 290], sat: [0.03, 0.4], val: [0.62, 1], y0: 600, y1: 1500 },
      bust: { l: [476, 476], r: [576, 474], R: 52, amt: 0.85 },
    },
    hisako: {
      name: "ヒサコ", ruby: "Hisako", color: "#38a6ff", el: "water", img: "hisako.webp", bg: "park.webp", fes: "超極煌祭（毎月21日〜末日）",
      intro: "放課後の展望テラスで、ピースをくれるヒサコ。",
      rig: { size: [940, 1672], headTop: [470, 20], face: [452, 282], neck: [452, 385], shoulderY: 440, waistY: 695, hemY: 950, kneeY: 1190, pivot: [560, 1645], centerX: 500 },
      /* 髪＝茶色（目と顔の中は除く・靴は y で除く）／スカート＝濃い緑（スカーフの先も少しゆれる） */
      hair: { hue: [8, 42], sat: [0.26, 1], val: [0.18, 0.84], y1: 1010, noFace: [450, 284, 96, 114] },
      cloth: { hue: [110, 205], sat: [0.1, 1], val: [0, 0.56], y0: 690, y1: 1000 },
    },
    alice: {
      name: "アリス", ruby: "Alice", color: "#7a5cff", el: "dark", img: "alice.webp", bg: "park.webp", fes: "超極煌祭（毎月21日〜末日）",
      intro: "木もれ日の展望テラスで、はにかむアリス。",
      rig: { size: [941, 1672], headTop: [370, 20], face: [412, 235], neck: [468, 320], shoulderY: 335, waistY: 605, hemY: 850, kneeY: 1130, pivot: [572, 1650], centerX: 470 },
      /* 髪＝黒〜灰色（紺の制服は彩度で外す・白いシャツは明るさで外す・左の長い髪と、右肩のうしろの髪の範囲だけ） */
      hair: { sat: [0, 0.27], val: [0, 0.86], boxes: [[212, 0, 462, 745], [450, 30, 585, 350]], noFace: [412, 236, 74, 92] },
      cloth: { hue: [195, 255], sat: [0.16, 1], val: [0, 0.64], y0: 595, y1: 905 },
    },
    /* ★★ 2026-10-31 超極煌祭のコハク・超極華祭のユナ・アイナ・ヨシノ（ご指定「完凸ロビー対応キャラに追加」）。
       立ち絵は Documents/Claude/_fes_src/1024/<id>_lobby_full.webp＝背景が透明の全身。背景は展望テラス（ほかの子と同じ）。
       骨組みと髪・布の範囲は、alpha の外形と色の重ね絵で決めた（髪だけ・布だけがゆれて、顔・脚・刀は動かない） */
    kohaku: {
      name: "コハク", ruby: "Kohaku", color: "#e0484a", el: "fire", img: "kohaku.webp", bg: "park.webp", fes: "超極煌祭（毎月21日〜末日）",
      intro: "展望テラスで、髪を耳にかけるコハク。",
      rig: { size: [940, 1672], headTop: [450, 20], face: [470, 205], neck: [490, 300], shoulderY: 340, waistY: 580, hemY: 890, kneeY: 1100, pivot: [430, 1650], centerX: 470 },
      /* 髪＝黒〜明るい灰色（白いシャツは明るさ・赤いリボンは彩度で外す・長い髪の範囲だけ）／スカート＝濃い灰色のチェック（太ももの上は外す） */
      hair: { sat: [0, 0.3], val: [0, 0.8], boxes: [[300, 0, 650, 330], [150, 280, 300, 640], [150, 640, 235, 920], [640, 110, 860, 600], [760, 600, 860, 770]], noFace: [470, 205, 72, 88] },
      cloth: { sat: [0, 0.4], val: [0, 0.62], y0: 590, y1: 900, boxes: [[225, 590, 800, 900]], cut: [[370, 860, 570, 900]] },
    },
    yuna: {
      name: "ユナ", ruby: "Yuna", color: "#8a5cd8", el: "dark", img: "yuna.webp", bg: "park.webp", fes: "超極華祭（毎月11〜20日）",
      intro: "展望テラスで、ほおに手をそえるユナ。",
      rig: { size: [940, 1672], headTop: [548, 18], face: [560, 222], neck: [545, 300], shoulderY: 340, waistY: 600, hemY: 1000, kneeY: 1180, pivot: [400, 1645], centerX: 490 },
      /* 髪＝黒（紫のメッシュも）・長い髪の範囲だけ／ゆれる布＝黒いスカートと白いフリル（脚は外す） */
      hair: { sat: [0, 0.45], val: [0, 0.55], boxes: [[370, 0, 720, 330], [115, 200, 420, 640], [110, 640, 215, 1010], [690, 300, 860, 1010]], noFace: [560, 222, 70, 88] },
      cloth: { sat: [0, 0.5], y0: 610, y1: 1130, boxes: [[200, 610, 760, 1130]], cut: [[380, 840, 590, 1130]] },
      bust: { l: [514, 434], r: [620, 430], R: 50, amt: 0.85 },
    },
    aina: {
      name: "アイナ", ruby: "Aina", color: "#a07cff", el: "light", img: "aina.webp", bg: "park.webp", fes: "超極華祭（毎月11〜20日）",
      intro: "展望テラスで、ドレスのすそをつまむアイナ。",
      rig: { size: [941, 1672], headTop: [500, 20], face: [495, 195], neck: [490, 282], shoulderY: 320, waistY: 560, hemY: 1150, kneeY: 1170, pivot: [455, 1650], centerX: 450 },
      /* 髪＝ラベンダー（すけた袖は範囲で外す）／スカート＝黒いドレスのすそ（脚は外す） */
      hair: { hue: [235, 300], sat: [0.1, 1], val: [0.3, 1], boxes: [[120, 0, 700, 330], [115, 250, 300, 760], [690, 300, 790, 760]], noFace: [495, 195, 68, 84] },
      cloth: { sat: [0, 0.5], val: [0, 0.38], y0: 640, y1: 1240, boxes: [[115, 640, 790, 1240]], cut: [[395, 860, 600, 1250]] },
      bust: { l: [512, 434], r: [590, 430], R: 46, amt: 0.8 },
    },
    chie: {
      name: "ヨシノ", ruby: "Yoshino", color: "#e03a4a", el: "fire", img: "chie.webp", bg: "park.webp", fes: "超極華祭（毎月11〜20日）",
      intro: "展望テラスで、刀を手に空を見上げるヨシノ。",
      rig: { size: [941, 1672], headTop: [400, 30], face: [360, 185], neck: [410, 275], shoulderY: 310, waistY: 600, hemY: 1500, kneeY: 1150, pivot: [420, 1655], centerX: 460 },
      /* 髪＝黒いポニーテール（刀は範囲の外）／ゆれる布＝赤い袴と房（色相は 0 をまたぐ） */
      hair: { sat: [0, 0.55], val: [0, 0.5], boxes: [[240, 20, 570, 300], [480, 20, 940, 760]], noFace: [355, 190, 62, 80] },
      cloth: { hue: [335, 18], sat: [0.45, 1], val: [0.35, 1], y0: 620, y1: 1570 },
      bust: { l: [420, 402], r: [507, 396], R: 50, amt: 0.7 },
    },
  };

  /* ══ ★★ 2026-11-03 セリフ（ご指定「完凸キャラが喋ったり」・表情は動かさない＝吹き出しだけ）══
     morning（5〜10時）／day（10〜17時）／evening（17〜22時）／night（それ以外）＝ホームに来たときのあいさつ。
     pick＝ロビーに選んだとき・tap＝押したとき・idle＝ときどきのひとりごと（30〜50秒ごと）。 */
  const LINES = {
    chifuru: {
      pick: "えらんでくれたの？ ……ごほうびに、ひとくちあげる。",
      morning: ["おはよ〜。朝ごはん、パフェでもいい？", "ん〜、まだ眠い……。甘いもの食べたら起きる。"],
      day: ["お昼のデザート、なににしよっかな〜。", "ねえ、新しいカフェ見つけたの。いっしょに行こ？"],
      evening: ["おつかれさま。がんばったごほうび、なにがいい？", "夕方のスイーツって、なんでこんなにおいしいんだろ。"],
      night: ["夜のアイスは、ないしょだよ？", "まだ起きてる？ ……じゃあ、ちょっとだけ付き合って。"],
      tap: ["ん〜？ ひとくち、ほしいの？", "あげないよ〜？ ……うそ、半分こしよ。", "ふふ、びっくりした？", "なぁに？ 甘えたいの？"],
      idle: ["あーんして？ ……ふふ、今のひとくちは、わたしのぶん。", "甘いものはね、がんばったごほうびなの。", "青いハートの飴、きれいでしょ？", "パフェのいちばん上、いちばんおいしいところなんだよ。"],
    },
    mint: {
      pick: "わたしでいいの？ やったぁ！ よろしくね！",
      morning: ["おはよっ！ 今日もいっしょにがんばろうね！", "ふぁ〜……おはよ。窓をあけたら、いい風！"],
      day: ["お昼だよ！ ちゃんと食べた？", "いい天気！ どこかに出かけたくなっちゃうね。"],
      evening: ["おつかれさま！ 今日もよくがんばったね。", "夕方の光って、なんだかほっとするね。"],
      night: ["もう夜だよ？ ちゃんと寝なきゃだめだよ〜。", "眠れないの？ じゃあ、少しだけおしゃべりしよ。"],
      tap: ["わっ！ ……えへへ、なあに？", "呼んだ？ はーい、ミントだよ！", "おいでおいで〜！", "ふふっ、元気出た？"],
      idle: ["大丈夫、わたしがついてるから！", "白いお花、窓べにかざったんだ。", "ねえねえ、今日はなにして遊ぶ？", "こもれびって、いい言葉だよね。"],
    },
    purika: {
      pick: "わたしを選ぶなんて、見る目あるじゃん。",
      morning: ["おはよ。……寝ぐせ、ついてるよ？ うそ。", "朝からわたしに会えるなんて、ラッキーだね。"],
      day: ["お昼、いっしょにどう？ いい場所知ってるんだ。", "作戦会議のじかん。……なんてね。"],
      evening: ["夕焼けの色、きみに似合うと思うな。", "おつかれさま。今日のごほうびは……ウインクひとつ。"],
      night: ["夜ふかしさんだね。……わたしも、だけど。", "星がきれい。……ないしょの話、しちゃう？"],
      tap: ["ん？ ……ふふ、見とれてた？", "はい、ピース。", "ないしょだよ？", "呼んだ？ ……わかってたけどね。"],
      idle: ["ないしょの作戦、ちゃんと見ててね？", "このウインクは、きみにだけ。", "星の紋章、かっこいいでしょ？", "わたしの勝ち。……なんの勝負かは、ないしょ。"],
    },
    haru: {
      pick: "わたしでいいの？ ……うん、うれしい。",
      morning: ["おはよ。……朝の海、きらきらしてた。", "ん、起きた？ 今日もいい天気になりそう。"],
      day: ["お昼は、海の見えるところで食べよ？", "あじさいの色、少しずつ変わってくの。見てて飽きないよ。"],
      evening: ["夕焼け、きれい……。いっしょに見られてよかった。", "おつかれさま。波の音で、ひと休みしよ。"],
      night: ["夜の海は、ちょっとだけ静か。……となり、いい？", "もうこんな時間。無理しないで、ね。"],
      tap: ["わっ……。ふふ、どうしたの？", "呼んだ？ ちゃんと聞いてるよ。", "そんなにつつかないで……ふふ。", "ん？ 雨のにおい、するね。"],
      idle: ["雨あがりの空みたいに、ぜんぶ晴らしてあげる。", "このテラス、風がやさしくて好き。", "ねえ、次はどこに行こっか。", "あじさいの花言葉、知ってる？ ……ないしょ。"],
    },
    chika: {
      pick: "……わたしを、選んだの？ ……ありがとう。",
      morning: ["……おはよう。まだ、ちょっと眠い。", "朝の光、まぶしい……。でも、きらいじゃない。"],
      day: ["……お昼。ちゃんと食べた？", "空、高いね。……月はまだ見えない。"],
      evening: ["……もうすぐ、月が出る時間。", "夕方の風、すこし冷たい。……こっち、来て。"],
      night: ["月がきれい。……今夜は、少しだけ素直になれそう。", "……夜は、わたしの時間。いっしょにいて。"],
      tap: ["……なに？", "……っ。びっくりした。", "……ふふ。なんでもない。", "呼んだ……？ うん、いるよ。"],
      idle: ["……いちばん弱いところは、もう見えてる。", "白い花、すき。……月の光に似てるから。", "……静かなの、落ちつく。", "……あなたといると、時間がゆっくり。"],
    },
    hisako: {
      pick: "えっ、わたし？ えへへ……まかせて！",
      morning: ["おはよー！ 今日もはりきっていこっ！", "ふぁ……おはよ。寝ぐせ、ついてない？"],
      day: ["お昼、なに食べる？ わたしはね……メロンパン！", "ノート、ちゃんと取ってる？ ……なんてね。"],
      evening: ["夕方になると、ちょっとさみしくなるよね。", "おつかれさま！ ねえ、帰りにどこか寄ってく？"],
      night: ["夜ふかしは、ほどほどにね？", "まだ起きてるの？ ……じゃあ、もうちょっとだけ話そ。"],
      tap: ["わっ！ もー、おどかさないでよ〜。", "なになに？ 呼んだ？", "えへへ、ピース！", "待ってられないもん、ってね！"],
      idle: ["放課後まで、待ってられないもん。", "桜の色って、ずっと見てられるよね。", "ねえねえ、次のガチャ、なに引くの？", "このテラス、お気に入りなんだ。"],
    },
    alice: {
      pick: "わたしを選んでくれるのね。……うれしいわ。",
      morning: ["おはようございます。よく眠れましたか？", "朝の光は、白百合がいちばんきれいに見える時間なの。"],
      day: ["お昼のお茶、ご一緒にいかが？", "木もれ日が心地いいわね。"],
      evening: ["夕暮れの色、すてきね。", "今日もおつかれさま。ゆっくり休んで。"],
      night: ["白銀の百合は、夜にこそ咲くのよ。", "夜風が冷たいわ。……もう少し、そばにいて。"],
      tap: ["あら……どうかした？", "ふふ、急にどうしたの？", "はい、なんでしょう。", "……そんなに見つめられると、照れるわ。"],
      idle: ["白い花が咲くまで、そばにいて。", "静かな時間も、悪くないでしょう？", "百合の香り、わかる？", "……あなたの話、もっと聞かせて。"],
    },
    kohaku: {
      pick: "わたくしを選ぶとは、お目が高いですわ。",
      morning: ["ごきげんよう。朝の紅茶はもう召し上がって？", "おはようございます。今日も優雅にまいりましょう。"],
      day: ["お昼のティータイムですわ。ご一緒にどうぞ。", "紅い薔薇は、陽ざしの下でいっそう映えますのよ。"],
      evening: ["夕日まで紅く染まって……すてきですわね。", "本日もおつかれさまでした。"],
      night: ["夜ふかしは、淑女のたしなみではありませんわ。", "月夜のテラスも、悪くありませんわね。"],
      tap: ["まあ。なにかご用？", "ふふっ、驚かせないでくださいまし。", "わたくしに見とれてしまいましたの？", "……もう、仕方のない方ですわね。"],
      idle: ["優雅に、そして確実に。それが令嬢のたしなみですわ。", "あなたの隣は、わたくしの席ですのよ。", "紅茶の淹れ方なら、お教えしますわ。", "薔薇の手入れは、毎朝欠かしませんの。"],
    },
    yuna: {
      pick: "……そう、わたしを選んだのね。もう離さない。",
      morning: ["……おはよう。あなたの朝いちばんは、わたしのもの。", "朝はにがて。……でも、あなたの声で目が覚めた。"],
      day: ["お昼は、わたしとだけ。……いい？", "日ざしが強いわね。……影に入りましょう。"],
      evening: ["宵闇が近づいてきた。わたしの好きな時間。", "今日も、ほかの子ばかり見てなかった？"],
      night: ["宵闇のうちに、終わらせてあげる。", "夜はながいの。……まだ帰さない。"],
      tap: ["……なあに？ わたしを呼んだの？", "ふふ、ちゃんと見てくれてる。", "……もっとこっちを見て。", "……呼んだなら、最後まで聞いて。"],
      idle: ["黒薔薇は、ひとりのためにだけ咲くの。", "……あなたは、わたしだけを見ていればいい。", "宵闇の色、きれいでしょう？", "……ずっと、ここにいて。"],
    },
    aina: {
      pick: "わたしを選んでくださるのですね。……お守りいたします。",
      morning: ["おはようございます。今日もお守りいたします。", "朝のお祈りはすませました。よい一日になりますように。"],
      day: ["少し休憩なさいませんか？ お茶をお持ちします。", "日ざしがやわらかいですね。"],
      evening: ["夕暮れどきは、月を待つ時間です。", "おつかれさまでした。今日もよくがんばりましたね。"],
      night: ["月下の薔薇は、静かに咲くのです。", "夜はわたしが見張っています。安心してお休みください。"],
      tap: ["はい、なんでしょう？", "まあ……。ふふ、どうかなさいましたか？", "ご用でしたら、なんなりと。", "そばにおりますよ。"],
      idle: ["薔薇の棘は、守るためにあるのです。", "月の光は、だれにでも等しく降りそそぐもの。", "あなたの笑顔を守るのが、わたしの務めです。", "静かな夜には、薔薇の香りが強くなるのですよ。"],
    },
    chie: {
      pick: "わたしでよろしいのですか？ ……では、お供いたします。",
      morning: ["おはようございます。朝稽古は、もうすませました。", "清らかな朝ですね。空気が澄んでいます。"],
      day: ["日が高いうちに、鍛錬を重ねねば。", "お昼ですか。……では、少しだけ休みましょう。"],
      evening: ["夕焼けの空は、桜火の色に似ていますね。", "本日もおつかれさまでした。"],
      night: ["夜の見回りは、わたしにおまかせを。", "月が出ましたね。……刀の手入れの時間です。"],
      tap: ["……っ！ 背後をとられるとは、不覚。", "なにか御用でしょうか。", "ふふ……驚かせないでください。", "はい、ここにおりますよ。"],
      idle: ["桜火よ、舞え――！", "心を静めれば、刃もまた静かになるのです。", "空を見ていると、心が落ちつきます。", "千本鳥居の向こうに、なにがあるのでしょう。"],
    },
  };
  const pick = (a) => (Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a) || "";

  const src = (f) => DIR + f + "?v=" + VER;
  const RM = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("xos-nomotion"); } catch (e) { return false; } };
  function store() { try { return JSON.parse(localStorage.getItem("xeva_mate_v1") || "{}") || {}; } catch (e) { return {}; } }

  /* ══ 開放（完凸） ══ */
  function awkOf(id) {
    let mb = {}, xg = {};
    try { mb = (JSON.parse(localStorage.getItem("magiburst_v1") || "null") || {}).chars || {}; } catch (e) {}
    try { xg = JSON.parse(localStorage.getItem("xeva_gacha_v1") || "null") || {}; } catch (e) {}
    const m = mb[id], xo = !!((xg.owned || {})[id]), xd = ((xg.dupes || {})[id]) | 0;
    return { own: !!m || xo, awk: Math.min(4, Math.max(m ? (m.awk | 0) : 0, xo ? xd : 0)) };
  }
  function unlocked(id) { return !!DEFS[id] && awkOf(id).awk >= 4; }

  function smooth(e0, e1, x) { let t = (x - e0) / (e1 - e0); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function hsv(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d > 0) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx / 255];
  }
  /* ★★ 2026-10-31 [340, 20] のように前が大きいときは 0 をまたぐ範囲（赤い色相） */
  const inR = (v, r) => !r || (r[0] <= r[1] ? v >= r[0] && v <= r[1] : v >= r[0] || v <= r[1]);
  /* ★★ 2026-11-03 胸の重み（左右の円・まん中ほど 1・外す箱は 0） */
  function bustW(x, y, b) {
    if (!b) return 0;
    if (b.cut && b.cut.some((c) => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3])) return 0;
    let w = 0;
    [b.l, b.r].forEach((c) => { const d = Math.hypot((x - c[0]) / b.R, (y - c[1]) / (b.R * (b.ry || 1))); w = Math.max(w, 1 - smooth(0.3, 1, d)); });
    return w;
  }

  function Lobby(stage, id) {
    this.stage = stage; this.id = id; this.def = DEFS[id]; this.rig = this.def.rig; this.lobby = true;
    this.t = Math.random() * 10; this.seed = Math.random() * 100;
    this.view = store().view || "normal"; this.frame = null; this.running = false;
    this.hop = { y: 0, v: 0 }; this.jolt = { x: 0, v: 0 };
    this.bustS = { x: 0, y: 0, vx: 0, vy: 0 }; this.prevHopV = 0;
    this.talkUntil = 0; this.tapAt = 0; this.idleAt = performance.now() + 30000 + Math.random() * 15000;
  }

  Lobby.prototype.load = async function () {
    const img = (u) => new Promise((ok, ng) => { const i = new Image(); i.decoding = "async"; i.onload = () => ok(i); i.onerror = ng; i.src = u; });
    const base = await img(src(this.def.img));
    const W = base.naturalWidth, H = base.naturalHeight;
    this.W = W; this.H = H;
    const bc = document.createElement("canvas"); bc.width = W; bc.height = H;
    const bx = bc.getContext("2d", { willReadFrequently: true }); bx.drawImage(base, 0, 0);
    this.baseCv = bc; this.px = bx.getImageData(0, 0, W, H).data;
    this.buildMesh();
    this.px = null;     /* 重みを決めたら画素はもう使わない（タップの当たりは alpha だけ残す） */
  };

  /* 色で髪・スカートを見分ける（4×4 の点の割合） */
  Lobby.prototype.labelAt = function (x, y) {
    const D = this.px, W = this.W, H = this.H, hr = this.def.hair, cr = this.def.cloth;
    let hairN = 0, clothN = 0, n = 0;
    for (let j = -3; j <= 3; j += 2) for (let i = -3; i <= 3; i += 2) {
      const xx = Math.max(0, Math.min(W - 1, Math.round(x + i))), yy = Math.max(0, Math.min(H - 1, Math.round(y + j)));
      const k = (yy * W + xx) * 4; if (D[k + 3] < 40) continue;
      n++;
      const [h, s, v] = hsv(D[k], D[k + 1], D[k + 2]);
      const inBox = (b) => xx >= b[0] && xx <= b[2] && yy >= b[1] && yy <= b[3];
      let isHair = inR(s, hr.sat) && inR(v, hr.val) && (!hr.hue || inR(h, hr.hue)) && (hr.y1 == null || yy < hr.y1);
      if (isHair && hr.boxes) isHair = hr.boxes.some(inBox);
      if (isHair && hr.cut) isHair = !hr.cut.some(inBox);
      if (isHair && hr.noFace) { const f = hr.noFace, q = ((xx - f[0]) / f[2]) ** 2 + ((yy - f[1]) / f[3]) ** 2; if (q < 1) isHair = false; }
      if (isHair) hairN++;
      let isCloth = inR(h, cr.hue) && inR(s, cr.sat) && inR(v, cr.val) && yy >= cr.y0 && yy <= cr.y1;
      if (isCloth && cr.boxes) isCloth = cr.boxes.some(inBox);
      if (isCloth && cr.cut) isCloth = !cr.cut.some(inBox);
      if (isCloth) clothN++;
    }
    return n ? [hairN / n, clothN / n] : [0, 0];
  };

  Lobby.prototype.buildMesh = function () {
    const W = this.W, H = this.H, S = 8, A = this.px, r = this.rig;
    const cols = Math.ceil(W / S), rows = Math.ceil(H / S);
    const idx = new Int32Array((cols + 1) * (rows + 1)).fill(-1);
    const rest = [], tris = [];
    const V = (i, j) => { const k = j * (cols + 1) + i; if (idx[k] < 0) { idx[k] = rest.length / 2; rest.push(Math.min(i * S, W), Math.min(j * S, H)); } return idx[k]; };
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      let any = false;
      for (let y = cy * S - 1; y <= cy * S + S && !any; y += 2) for (let x = cx * S - 1; x <= cx * S + S; x += 2) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue; if (A[(y * W + x) * 4 + 3] > 4) { any = true; break; }
      }
      if (!any) continue;
      const a = V(cx, cy), b = V(cx + 1, cy), c = V(cx + 1, cy + 1), d = V(cx, cy + 1);
      tris.push(a, b, c, a, c, d);
    }
    const n = rest.length / 2;
    this.rest = new Float32Array(rest); this.pos = new Float32Array(rest.length);
    this.uv = new Float32Array(rest.length); this.tris = n > 65535 ? new Uint32Array(tris) : new Uint16Array(tris);
    const hair = new Float32Array(n), cloth = new Float32Array(n), bust = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = rest[i * 2], y = rest[i * 2 + 1];
      this.uv[i * 2] = x / W; this.uv[i * 2 + 1] = y / H;
      const [h, c] = this.labelAt(x, y); hair[i] = h; cloth[i] = c;
      bust[i] = bustW(x, y, this.def.bust);
    }
    /* となりと平均を何回か取って、境目をなだらかに（髪・スカートだけが動いて三角形がのびるのを防ぐ） */
    const nb = new Array(n);
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const k = idx[j * (cols + 1) + i]; if (k < 0) continue;
      const list = [];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii > cols || jj > rows) continue;
        const kk = idx[jj * (cols + 1) + ii]; if (kk >= 0) list.push(kk);
      }
      nb[k] = list;
    }
    const relax = (arr, passes) => {
      let cur = arr, nxt = new Float32Array(n);
      for (let p = 0; p < passes; p++) {
        for (let i = 0; i < n; i++) {
          const L = nb[i]; if (!L || !L.length) { nxt[i] = cur[i]; continue; }
          let sum = 0; for (let q = 0; q < L.length; q++) sum += cur[L[q]];
          nxt[i] = cur[i] * 0.5 + (sum / L.length) * 0.5;
        }
        const t = cur; cur = nxt; nxt = t;
      }
      return cur;
    };
    /* ★★ 2026-11-03 hairBlur＝髪の重みをならす回数（範囲の箱のふちで重みが急に変わる子は多め＝伸びを防ぐ） */
    const hairS = relax(hair, this.def.hairBlur || 7), clothS = relax(cloth, 8), bustS = this.def.bust ? relax(bust, 4) : bust;
    this.w = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = rest[i * 2], y = rest[i * 2 + 1];
      const fall = smooth(r.neck[1] - 80, r.neck[1] + 300, y);
      this.w[i] = {
        head: smooth(r.neck[1] + 40, r.neck[1] - 34, y),
        torso: smooth(r.waistY, r.shoulderY, y),
        hip: smooth(r.pivot[1], r.waistY, y),
        hair: Math.min(1, hairS[i] * 1.25) * (0.25 + 0.75 * fall),
        cloth: Math.min(1, clothS[i] * 1.3) * smooth(r.waistY - 20, r.hemY + 10, y),
        bust: bustS[i],
      };
    }
    /* タップの当たり（16px ごとの alpha） */
    const gw = Math.ceil(W / 16), gh = Math.ceil(H / 16), hitMap = new Uint8Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const x = Math.min(W - 1, i * 16 + 8), y = Math.min(H - 1, j * 16 + 8); hitMap[j * gw + i] = A[(y * W + x) * 4 + 3] > 40 ? 1 : 0; }
    this.hitMap = hitMap; this.hitW = gw; this.hitH = gh;
    this.vcount = n;
  };

  /* 1点の変形（画素の座標・上が0） */
  Lobby.prototype.deform = function (x, y, w, o) {
    const r = this.rig;
    let qx = x, qy = y;
    qy -= o.breath * w.torso;
    qy += this.hop.y * w.hip;
    if (w.bust) { qx += o.bustX * w.bust; qy += o.bustY * w.bust; }   /* ★★ 2026-11-03 胸のばね */
    if (w.head > 0) {
      const ang = (o.tilt + this.jolt.x) * w.head * Math.PI / 180;
      const nx = r.neck[0], ny = r.neck[1] - o.breath + this.hop.y;
      const dx = qx - nx, dy = qy - ny, cs = Math.cos(ang), sn = Math.sin(ang);
      qx = nx + dx * cs - dy * sn; qy = ny + dx * sn + dy * cs;
    }
    qx += o.hairX * w.hair; qy += Math.abs(o.hairX) * 0.15 * w.hair;
    qx += o.clothX * w.cloth; qy += Math.abs(o.clothX) * 0.1 * w.cloth;
    qx += o.hipX * w.hip;
    if (o.lean) {
      const la = o.lean * Math.PI / 180, dx = qx - r.pivot[0], dy = qy - r.pivot[1], cs = Math.cos(la), sn = Math.sin(la);
      qx = r.pivot[0] + dx * cs - dy * sn; qy = r.pivot[1] + dx * sn + dy * cs;
    }
    return [qx, qy];
  };

  Lobby.prototype.update = function (dt) {
    const t = (this.t += dt), amp = RM() ? 0.45 : 1, sd = this.seed;
    const breath = (1 - Math.cos(t * 2 * Math.PI / 4.4)) * 0.5;
    /* タップ：小さくはずむ（ばね） */
    this.hop.v += (-this.hop.y * 60 - this.hop.v * 7) * dt; this.hop.y += this.hop.v * dt;
    this.jolt.v += (-this.jolt.x * 50 - this.jolt.v * 6.5) * dt; this.jolt.x += this.jolt.v * dt;
    /* ★★ 2026-11-03 話しているあいだは小さくうなずく（顔はそのまま） */
    const talk = performance.now() < this.talkUntil ? 1 : 0;
    const o = {
      breath: breath * 3.6 * amp,
      tilt: (0.8 * Math.sin(t * 0.52 + sd) + 0.3 * Math.sin(t * 1.21) + talk * 0.7 * Math.sin(t * 7.3)) * amp,
      hairX: (7 * Math.sin(t * 0.74 + sd) + 2.8 * Math.sin(t * 1.73 + 1)) * amp,
      clothX: (3 * Math.sin(t * 0.9 + 2) + 1.2 * Math.sin(t * 2.1)) * amp,
      hipX: (2.2 * Math.sin(t * 0.33 + sd)) * amp,
      lean: (0.25 * Math.sin(t * 0.41 + sd)) * amp,
      bustX: 0, bustY: 0,
    };
    /* ★★ 2026-11-03 胸のばね：体のはずみ（hop の速さの変化）に遅れて動き、呼吸で少し持ち上がる。上限つき（ゆがみ防止） */
    const bd = this.def.bust;
    if (bd) {
      const B = this.bustS, k = bd.amt == null ? 1 : bd.amt;
      const dv = this.hop.v - this.prevHopV; this.prevHopV = this.hop.v;
      B.vy -= dv * 1.4; B.vx += this.jolt.v * 0.03;
      const anchorY = -o.breath * 0.4;
      B.vx += (-B.x * 70 - B.vx * 5.2) * dt; B.vy += (-(B.y - anchorY) * 58 - B.vy * 4.3) * dt;
      B.x += B.vx * dt; B.y += B.vy * dt;
      B.x = Math.max(-5, Math.min(5, B.x)); B.y = Math.max(-10, Math.min(10, B.y));
      o.bustX = B.x * k * amp; o.bustY = B.y * k * amp;
    }
    this.o = o;
    const R = this.rest, Q = this.pos;
    for (let i = 0; i < this.vcount; i++) {
      const q = this.deform(R[i * 2], R[i * 2 + 1], this.w[i], o);
      Q[i * 2] = q[0]; Q[i * 2 + 1] = q[1];
    }
  };

  Lobby.prototype.initGL = function (canvas) {
    const opt = { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: false };
    let gl = canvas.getContext("webgl2", opt), v2 = !!gl;
    if (!gl) gl = canvas.getContext("webgl", opt) || canvas.getContext("experimental-webgl", opt);
    if (!gl) return false;
    this.gl = gl; this.gl2 = v2;
    const vs = "attribute vec2 p;attribute vec2 u;uniform vec2 s;uniform vec2 o;varying vec2 vu;void main(){vu=u;gl_Position=vec4(p*s+o,0.,1.);}";
    const fs = "precision mediump float;varying vec2 vu;uniform sampler2D t;void main(){gl_FragColor=texture2D(t,vu);}";
    const sh = (type, s) => { const x = gl.createShader(type); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    this.loc = { p: gl.getAttribLocation(pr, "p"), u: gl.getAttribLocation(pr, "u"), s: gl.getUniformLocation(pr, "s"), o: gl.getUniformLocation(pr, "o") };
    if (this.tris instanceof Uint32Array && !v2 && !gl.getExtension("OES_element_index_uint")) return false;
    this.bPos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferData(gl.ARRAY_BUFFER, this.rest, gl.DYNAMIC_DRAW);
    this.bUv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv); gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW);
    this.bIdx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.tris, gl.STATIC_DRAW);
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.baseCv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (v2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  };

  /* どこからどこまでを、舞台のどこに映すか（パートナーと同じ決め方：頭〜膝（標準）／腰（アップ）／足もと（全身）） */
  Lobby.prototype.layout = function () {
    if (!this.rig || this.dead || !this.W) return;
    const st = this.stage.getBoundingClientRect();
    if (!st.width || !st.height) return;
    const top = document.querySelector(".xh-top"), bar = document.querySelector(".xh-bar");
    const prof = document.querySelector("#xhLobby .xh-prof");
    const padT = prof && prof.offsetParent ? Math.max(0, prof.getBoundingClientRect().bottom - st.top) + 4
                                           : (top ? Math.max(0, top.getBoundingClientRect().bottom - st.top) : 60) + 8;
    const padB = bar ? Math.max(0, st.bottom - bar.getBoundingClientRect().top) : 70;
    const r = this.rig, v = this.view;
    const y0 = r.headTop[1] - 20;
    const y1 = v === "up" ? r.hemY + 30 : v === "full" ? r.pivot[1] + 14 : r.kneeY + 60;
    const avail = Math.max(160, st.height - padT - (v === "full" ? padB + 8 : padB * 0.5));
    const s = avail / (y1 - y0);
    const cx = r.centerX != null ? r.centerX : r.pivot[0];
    this.frameTo = { s, ox: st.width / 2 - cx * s, oy: padT - y0 * s, w: st.width, h: st.height };
    if (!this.frame) this.frame = Object.assign({}, this.frameTo);
  };

  Lobby.prototype.draw = function (dt) {
    const gl = this.gl, cv = this.canvas;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    const cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    if (!cw || !ch) return;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; this.layout(); }
    const F = this.frame, T = this.frameTo, k = 1 - Math.exp(-dt * 6);
    F.s += (T.s - F.s) * k; F.ox += (T.ox - F.ox) * k; F.oy += (T.oy - F.oy) * k;
    gl.viewport(0, 0, cw, ch);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.loc.s, (2 * F.s) / W, (-2 * F.s) / H);
    gl.uniform2f(this.loc.o, (2 * F.ox) / W - 1, 1 - (2 * F.oy) / H);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos);
    gl.enableVertexAttribArray(this.loc.p); gl.vertexAttribPointer(this.loc.p, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUv);
    gl.enableVertexAttribArray(this.loc.u); gl.vertexAttribPointer(this.loc.u, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.drawElements(gl.TRIANGLES, this.tris.length, this.tris instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
    this.frames = (this.frames || 0) + 1;
  };

  Lobby.prototype.hitAt = function (clientX, clientY) {
    const b = this.stage.getBoundingClientRect(), F = this.frame;
    if (!F || !this.hitMap) return false;
    const px = (clientX - b.left - F.ox) / F.s, py = (clientY - b.top - F.oy) / F.s;
    const i = Math.floor(px / 16), j = Math.floor(py / 16);
    if (i < 0 || j < 0 || i >= this.hitW || j >= this.hitH) return false;
    return !!this.hitMap[j * this.hitW + i];
  };

  /* ══ ★★ 2026-11-03 吹き出し（パートナーと同じ .hm-bubble・#hmOver に置く）══ */
  Lobby.prototype.toScreen = function (x, y) { const F = this.frame; return F ? [x * F.s + F.ox, y * F.s + F.oy] : [0, 0]; };
  Lobby.prototype.placeBubble = function () {
    const b = this.bubble; if (!b || !b.classList.contains("on") || !this.frame || !this.rig) return;
    const r = this.rig, F = this.frame;
    const [cx, cy] = this.toScreen((r.centerX != null ? r.centerX : r.pivot[0]) + (this.o ? this.o.hipX : 0), r.waistY - 30);
    const bw = b.offsetWidth, bh = b.offsetHeight, W = F.w;
    const x = Math.max(8, Math.min(W - bw - 8, cx - bw / 2));
    let y = cy;
    const apps = document.getElementById("xlApps"), st = this.stage.getBoundingClientRect();
    if (apps && apps.offsetParent) y = Math.min(y, apps.getBoundingClientRect().top - st.top - bh - 12);
    b.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    b.style.setProperty("--tail-x", Math.max(22, Math.min(bw - 22, cx - x)) + "px");
  };
  Lobby.prototype.say = function (text, quick) {
    const b = this.bubble; if (!text || !b || this.dead) return;
    const span = b.querySelector(".hm-txt");
    clearInterval(this.typing); clearTimeout(this.hideT);
    b.classList.remove("on"); b.style.minHeight = ""; b.style.width = "";
    b.style.maxWidth = Math.min(300, Math.max(180, (this.frame ? this.frame.w : 360) * 0.8)) + "px";
    span.textContent = text;                                           /* 大きさを先に決めてから、1文字ずつ出す */
    const h = b.offsetHeight, wd = b.offsetWidth; b.style.minHeight = h + "px"; b.style.width = wd + "px";
    span.textContent = "";
    void b.offsetWidth;
    b.classList.add("on");
    this.placeBubble();
    let i = 0;
    this.talkUntil = performance.now() + text.length * 38 + 400;
    this.hop.v -= 38; this.jolt.v += (Math.random() < 0.5 ? -1 : 1) * 4;   /* 話しはじめに小さくはずむ */
    this.typing = setInterval(() => { i++; span.textContent = text.slice(0, i); if (i >= text.length) clearInterval(this.typing); }, 38);
    this.hideT = setTimeout(() => b.classList.remove("on"), quick ? 2200 + text.length * 45 : 4200 + text.length * 60);
    this.idleAt = performance.now() + 30000 + Math.random() * 20000;
  };
  Lobby.prototype.lines = function () { return LINES[this.id] || {}; };

  Lobby.prototype.mount = async function (picked) {
    const st = this.stage, m = this.def;
    st.dataset.mate = "lb-" + this.id;
    const layer = document.createElement("div");
    layer.className = "hm-layer hm-lobby"; layer.dataset.mate = "lb-" + this.id;
    layer.innerHTML = '<div class="hm-bg" style="background-image:url(' + src(m.bg) + ')"></div><canvas class="hm-cv" aria-label="' + m.name + '"></canvas>';
    st.appendChild(layer);
    this.layer = layer;
    this.canvas = layer.querySelector(".hm-cv");
    /* ★★ 2026-11-03 吹き出し（ロビーのボタンより手前の #hmOver に置く＝パートナーと同じ） */
    let over = document.getElementById("hmOver");
    if (!over) { over = document.createElement("div"); over.id = "hmOver"; over.className = "hm-over"; (st.parentNode || document.body).appendChild(over); }
    const bub = document.createElement("div");
    bub.className = "hm-bubble hm-lb-bub"; bub.dataset.mate = "lb-" + this.id; bub.setAttribute("aria-live", "polite");
    bub.innerHTML = '<span class="hm-who" style="background:' + m.color + '">' + m.name + '</span><span class="hm-txt"></span>';
    over.appendChild(bub);
    this.bubble = bub;
    for (let i = 0; ; i++) {
      try { await this.load(); break; } catch (e) {
        console.warn("[home-lobby] load", e);
        if (this.dead) return false;
        if (i >= 3) { layer.classList.add("in"); this.still(); return false; }
        await new Promise((ok) => setTimeout(ok, 1200 * (i + 1)));
      }
    }
    if (this.dead) return false;
    if (!this.initGL(this.canvas)) { layer.classList.add("in"); this.still(); return false; }
    this.canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.running = false; this.lost = true; try { window.HomeMate && HomeMate.revive && HomeMate.revive(this); } catch (e2) {} });
    this.onTap = (e) => {
      if (e.target.closest && e.target.closest("button,a,input,.xh-prof,.xh-offline")) return;
      if (!this.hitAt(e.clientX, e.clientY)) return;
      this.hop.v -= 70; this.jolt.v += (Math.random() < 0.5 ? -1 : 1) * 9;
      if (this.def.bust) { this.bustS.vy += 55; this.bustS.vx += (Math.random() - 0.5) * 30; }   /* ★★ 2026-11-03 胸のばね（制服姿でない子だけ） */
      /* ★★ 2026-11-03 押したらひとこと（続けて押したときは 1.2 秒あける） */
      const now = performance.now();
      if (now - this.tapAt > 1200) { this.tapAt = now; this.say(pick(this.lines().tap), true); }
    };
    this.tapEl = document.getElementById("xhLobby") || this.canvas;
    this.tapEl.addEventListener("click", this.onTap);
    this.onResize = () => this.layout();
    window.addEventListener("resize", this.onResize);
    this.layout();
    if (this.frameTo) this.frame = Object.assign({}, this.frameTo);
    requestAnimationFrame(() => layer.classList.add("in"));
    setTimeout(() => { if (!this.dead) layer.classList.add("in"); }, 700);
    this.kick();
    if (picked && picked !== "quiet") setTimeout(() => this.entrance(), 160);
    if (picked !== "quiet") setTimeout(() => { if (!this.dead) this.greet(picked); }, picked ? 700 : 1100);
    this.ready = true;
    return true;
  };
  /* 選んだときに小さくはずむ（パートナーの登場の代わり） */
  Lobby.prototype.entrance = function () { this.hop.v -= 110; if (this.canvas) { this.canvas.classList.remove("hm-in-wave"); void this.canvas.offsetWidth; this.canvas.classList.add("hm-in-wave"); } };
  /* ★★ 2026-11-03 あいさつ（選んだとき＝pick・ふだんは時間帯） */
  Lobby.prototype.greet = function (picked) {
    if (this.dead || !this.bubble) return;
    const L = this.lines();
    if (picked === true || picked === "pickLobby") { this.say(L.pick || pick(L.day)); return; }
    const h = new Date().getHours();
    const k = h >= 5 && h < 10 ? "morning" : h >= 10 && h < 17 ? "day" : h >= 17 && h < 22 ? "evening" : "night";
    this.say(pick(L[k]));
  };
  Lobby.prototype.still = function () {
    if (!this.canvas || !this.canvas.parentNode) return;
    const im = document.createElement("img"); im.className = "hm-still"; im.src = src(this.def.img); im.alt = this.def.name;
    this.canvas.replaceWith(im);
  };
  Lobby.prototype.destroy = function () {
    this.dead = true; this.running = false;
    window.removeEventListener("resize", this.onResize);
    if (this.tapEl && this.onTap) this.tapEl.removeEventListener("click", this.onTap);
    clearInterval(this.typing); clearTimeout(this.hideT);
    if (this.bubble) { const b = this.bubble; b.classList.remove("on"); setTimeout(() => b.remove(), 300); }
    try { const ext = this.gl && this.gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (e) {}
    const L = this.layer; if (L) { L.classList.remove("in"); L.classList.add("out"); setTimeout(() => L.remove(), 450); }
  };
  Lobby.prototype.shouldRun = function () {
    if (document.hidden || !this.gl || this.dead) return false;
    const home = document.getElementById("xhome");
    if (home && !home.classList.contains("on")) return false;
    const gate = document.getElementById("xevaHome");
    if (gate && gate.classList.contains("open") && gate.getClientRects().length) return false;
    if (document.body.classList.contains("xl-drawer-open")) return false;
    return true;
  };
  Lobby.prototype.kick = function () {
    if (this.running || this.dead) return;
    this.running = true; this.last = performance.now();
    const loop = (now) => {
      if (this.dead) { this.running = false; return; }
      if (!this.shouldRun()) {
        this.last = now;
        if (this.bubble && this.bubble.classList.contains("on")) this.bubble.classList.remove("on");   /* 見えないあいだは吹き出しも閉じる */
        setTimeout(() => requestAnimationFrame(loop), 400); return;
      }
      const dt = Math.min(1 / 30, Math.max(0.001, (now - this.last) / 1000)); this.last = now;
      if (!this.frameTo) this.layout();
      if (!this.frameTo) { requestAnimationFrame(loop); return; }
      try {
        this.update(dt); this.draw(dt); this.errs = 0;
        if (this.bubble && this.bubble.classList.contains("on")) this.placeBubble();
        /* ★★ 2026-11-03 ときどきのひとりごと（吹き出しが出ていないときだけ） */
        else if (now > this.idleAt) this.say(pick(this.lines().idle));
      } catch (e) {
        this.errs = (this.errs || 0) + 1;
        if (this.errs === 1) console.warn("[home-lobby]", e);
        if (this.errs > 30) { this.running = false; try { window.HomeMate && HomeMate.revive && HomeMate.revive(this); } catch (e2) {} return; }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };

  window.HMLobby = {
    DEFS, LINES, unlocked, awkOf, src,
    create: (stage, id) => new Lobby(stage, id),
    ids: () => Object.keys(DEFS),
  };
})();

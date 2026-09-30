/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 入れる建物の中（★★ 2026-09-29 ご指定「それぞれのエリアや建物でそれぞれの機能を持たせ、入れるように内部も作成」）
   ------------------------------------------------------------------
   ・建物の1階を「中まである」形にする：外壁（外がわ）＋内装（内がわ）の2枚の壁・床・天井の照明・ガラスの窓・入口。
     当たり判定は壁ごと（入口から入れる）。中に入ると明るさが屋内になり、カメラは壁の外へ出ない。
   ・中身は種類ごと：食堂／カフェ／お店／ゲームセンター／ガチャ／博物館・美術館／劇場・映画館／ロビー／教室／図書館／
     研究室／カラオケ／体育館／スパ／お化け屋敷／脱出ゲーム／撮影スタジオ／ショールーム／客室／プラネタリウム／クイズドーム
   ・それぞれに機能（注文する・買う・遊ぶ・展示を見る・上映を見る・学ぶ・歌う・休む・撮る…）。機能の画面は park_ui.js。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;

  /* ══════════════ メニュー・品物・展示（すべてオリジナル） ══════════════ */
  const MENU = {
    takoyaki: [["たこ焼き（8個）", 500, "外はカリッ、中はとろ〜り"], ["チーズたこ焼き", 600, "のび〜るチーズ入り"], ["ねぎだこ", 650, "青ねぎたっぷり・ポン酢で"], ["ラムネ", 200, "しゅわっと冷たい"]],
    ramen: [["XEVA しょうゆラーメン", 850, "すっきり澄んだスープ"], ["みそバターラーメン", 950, "こくのある白みそ"], ["星のとんこつ", 980, "まろやかな白いスープ"], ["ぎょうざ（6個）", 400, "パリッと羽根つき"]],
    dango: [["三色だんご", 300, "さくら・白・よもぎ"], ["みたらしだんご", 280, "あまからのたれ"], ["抹茶パフェ", 780, "白玉とあんこ入り"], ["ほうじ茶", 250, "こうばしい香り"]],
    icecream: [["バニラ", 350, "北の牧場のミルク"], ["いちご", 380, "つぶつぶ果肉入り"], ["抹茶", 380, "ほろにがい大人の味"], ["ダブル（2つ選べる）", 580, "欲ばりなあなたに"]],
    donut: [["星のドーナツ", 280, "ピンクのアイシング"], ["チョコリング", 260, "ビターなチョコがけ"], ["もちもちリング", 240, "もちっと食感"], ["ミルクティー", 380, "ドーナツにぴったり"]],
    taiyaki: [["つぶあんたい焼き", 220, "しっぽまであんこ"], ["カスタードたい焼き", 240, "とろ〜りクリーム"], ["チョコたい焼き", 240, "チョコがとろける"], ["冷たい麦茶", 150, "ほっとひと息"]],
    pudding: [["とろけるプリン", 380, "卵のやさしい味"], ["カラメルかため", 400, "昔ながらのかためプリン"], ["プリンアラモード", 720, "くだものたっぷり"], ["コーヒー", 350, "深いり"]],
    sushi: [["おまかせ握り（8貫）", 1800, "その日のおすすめ"], ["サーモン三昧", 1200, "とろサーモン入り"], ["まぐろ鉄火丼", 1300, "赤身がぎっしり"], ["あら汁", 300, "心があたたまる"]],
    coffee: [["星のラテ", 480, "ラテアートは星"], ["月あかりブレンド", 420, "すっきり中深いり"], ["キャラメルマキアート", 520, "あまい香り"], ["チーズケーキ", 480, "しっとり濃厚"]],
    crepe: [["いちごカスタード", 580, "定番の人気 No.1"], ["チョコバナナ", 560, "あまいチョコソース"], ["抹茶あずき", 600, "和風のクレープ"], ["ツナチーズ", 620, "おかずクレープ"]],
    cake: [["いちごショート", 520, "ふわふわのスポンジ"], ["星のモンブラン", 580, "栗のクリームたっぷり"], ["チョコレートケーキ", 560, "濃厚なガナッシュ"], ["紅茶", 450, "ケーキと一緒に"]],
    onigiri: [["鮭おにぎり", 200, "ほぐし鮭がたっぷり"], ["梅おにぎり", 180, "すっぱくてさっぱり"], ["ツナマヨ", 200, "こどもに人気"], ["豚汁", 300, "具だくさん"]],
    bar: [["ノンアルコール カクテル「夜空」", 700, "青いグラデーション"], ["ベリーソーダ", 600, "甘ずっぱい"], ["フライドポテト", 500, "ほくほく"], ["ミックスナッツ", 400, "おつまみに"]],
    diner: [["大提灯オムライス", 1100, "ふわとろ卵"], ["特製カレー", 950, "スパイス香る"], ["唐揚げ定食", 1000, "外はカリッと"], ["お子さまランチ", 800, "旗つき"]],
    space: [["宇宙食アイス", 500, "フリーズドライ"], ["ロケットパン", 350, "ロケットの形"], ["星くずソーダ", 400, "はじける星"], ["惑星マカロン", 450, "8つの惑星の色"]],
    cafe: [["フラワーラテ", 520, "花のラテアート"], ["フルーツタルト", 580, "季節のくだもの"], ["サンドイッチ", 650, "ハムとたまご"], ["レモネード", 450, "さわやか"]],
    cinema: [["キャラメルポップコーン", 600, "あまい香り"], ["しお味ポップコーン", 500, "定番"], ["ホットドッグ", 550, "パリッとソーセージ"], ["メロンソーダ", 350, "映画のおともに"]],
    default: [["本日の定食", 980, "日替わり"], ["特製どんぶり", 900, "がっつり"], ["季節のデザート", 450, "あまいもの"], ["お茶", 200, "おかわり自由"]]
  };
  const GOODS = {
    store: [["XEVARION ぬいぐるみ", 2800, "ふわふわのマスコット"], ["ロゴ入りパーカー", 5800, "パークの限定色"], ["光るペンライト", 2500, "ライブの必需品"], ["クリスタル キーホルダー", 900, "エンブレムの形"]],
    toy: [["ロボットのプラモデル", 3200, "XR-01 のモデル"], ["ヨーヨー", 500, "光るヨーヨー"], ["ミニカー", 800, "レースカーのセット"], ["パズルキューブ", 1200, "6面そろうかな"]],
    book: [["パークのガイドブック", 1200, "24エリアぜんぶ"], ["星空の図鑑", 1800, "星座がわかる"], ["マンガ「XEVA 冒険記」", 600, "オリジナル作品"], ["世界地図の絵本", 1500, "こども向け"]],
    photo: [["記念写真（台紙つき）", 1500, "スタジオで撮影"], ["インスタントカメラ", 4800, "その場でプリント"], ["フォトフレーム", 1200, "エンブレムの飾り"], ["ポストカードセット", 700, "パークの風景 8枚"]],
    flower: [["さくらのブーケ", 2200, "春の花束"], ["ミニサボテン", 800, "育てやすい"], ["バラ一輪", 500, "特別な日に"], ["押し花のしおり", 400, "手作り"]],
    watch: [["星の腕時計", 12000, "文字盤に星空"], ["クリスタル ネックレス", 8800, "きらきら"], ["ペアリング", 9800, "ふたりの記念に"], ["懐中時計", 15000, "レトロなデザイン"]],
    sports: [["サッカーボール", 3800, "スタジアムの公式球"], ["ボッチャボールセット", 6800, "赤と青と白"], ["ランニングシューズ", 9800, "軽くて速い"], ["タオル", 1500, "応援用"]],
    music: [["パークのサウンドトラック", 2800, "メインテーマ入り"], ["オルゴール", 3500, "メインテーマのメロディ"], ["ヘッドホン", 7800, "重低音"], ["ギターピック", 300, "ロゴ入り"]],
    zakka: [["マグカップ", 1400, "パークの絵柄"], ["エコバッグ", 1200, "たっぷり入る"], ["ステッカーセット", 500, "24エリアのマーク"], ["アロマキャンドル", 1800, "さくらの香り"]],
    fashion: [["カチューシャ（星）", 2400, "パークの定番"], ["Tシャツ", 3200, "パークのロゴ"], ["キャップ", 2800, "つばに刺しゅう"], ["マフラータオル", 2000, "推し色を選べる"]],
    souvenir: [["おまんじゅう（12個）", 1500, "エンブレムの焼き印"], ["クッキー缶", 2000, "かわいい缶入り"], ["せんべい", 900, "しょうゆ味"], ["チョコレート", 1200, "くちどけなめらか"]],
    space: [["宇宙飛行士のぬいぐるみ", 2600, "ヘルメットつき"], ["ロケットの模型", 4200, "XEVARION-7"], ["星図のポスター", 1000, "光る星座"], ["宇宙食セット", 1800, "3種類"]],
    default: [["オリジナルグッズ", 1500, "パーク限定"], ["キーホルダー", 800, "ロゴ入り"], ["ポストカード", 300, "風景"], ["ぬいぐるみ", 2500, "ふわふわ"]]
  };
  const EXHIBIT = {
    history: [["はじまりの島", "この島は昔、小さな漁港だった——という設定のパークの歴史の展示。港の模型と灯台の絵。"], ["大門の設計図", "XEVARION 大門の設計図。2段の瓦屋根と朱の柱、未来の光の輪を組み合わせた。"], ["24のエリア", "パークの24エリアが生まれた順番。最初は中央の噴水から。"], ["未来の年表", "これから100年のパークの年表（空想）。空飛ぶモノレールも。"]],
    pixel: [["はじめてのドット絵", "8×8 のマスで描かれたロボット。ゲームの原点。"], ["コントローラーの進化", "ボタン2つから、体で遊ぶ時代へ。"], ["名作ゲームの部屋", "オリジナルのレトロゲームの画面を再現した展示。"], ["未来のゲーム", "脳波で遊ぶ？ 空想のゲーム機の模型。"]],
    science: [["光のプリズム", "白い光が虹の7色に分かれるしくみ。"], ["磁石の力", "N極とS極。見えない力を砂鉄で見る。"], ["DNA のらせん", "生きものの設計図は、2本のらせん。"], ["宇宙の大きさ", "太陽を1cmにすると、地球は1mm・1m 先。"]],
    robot: [["XR-01", "パークの案内ロボット。身長 25m（像）。"], ["お手伝いロボット", "お店でお茶を運ぶ小さなロボット。"], ["歩くしくみ", "人の歩き方をまねた脚の関節。"], ["AI の頭脳", "会話ができるロボットの頭の中。"]],
    ev: [["未来の EV", "充電5分で 1000km 走る（空想）。"], ["空飛ぶクルマ", "4つのプロペラで浮く。"], ["自動運転", "センサーとカメラで道を見る。"], ["レースカー", "サーキットを走るマシンの実物大の模型。"]],
    art: [["光の絵画", "LED で描かれた、動く絵。"], ["さくらの屏風", "金の屏風に、満開の桜。"], ["ガラスの彫刻", "水の流れを表したガラスのかたまり。"], ["みんなの落書きの壁", "来場者が描いた絵（空想）。"]],
    space: [["月の石（レプリカ）", "月の表面の石の模型。"], ["火星の地図", "赤い大地と、大きな火山。"], ["ロケットのエンジン", "XEVARION-7 のエンジンの模型。"], ["宇宙ステーション", "地球を回る家の模型。"]]
  };
  const INNER = { food: "creamW", cafe: "creamW", shop: "white2", arcade: "pNavy", gacha: "paleP", gallery: "white2", theater: "pBlack", lobby: "creamW", classroom: "creamW", library: "woodLight", lab: "white2", karaoke: "pPurple", gym: "white2", spa: "paleB", haunted: "castleDark", escape: "brickWall", studio: "pBlack", showroom: "white2", room: "creamW" };
  const FLOOR = { food: "wood", cafe: "woodLight", shop: "woodLight", arcade: "carpetPlum", gacha: "carpetTeal", gallery: "marble", theater: "carpetRed", lobby: "marble", classroom: "woodLight", library: "wood", lab: "expoFloor", karaoke: "carpetNavy", gym: "woodLight", spa: "stoneW", haunted: "carpetGray", escape: "woodDark", studio: "stageTop", showroom: "expoFloor", room: "carpetTeal" };
  const CEIL = { theater: "pBlack", karaoke: "pNavy", arcade: "pNavy", gacha: "pNavy", haunted: "castleDark", escape: "woodDark", studio: "pBlack" };
  const DOWN = { theater: 1, karaoke: 1, arcade: 1, gacha: 1, haunted: 1, escape: 1, studio: 1 };
  const LIGHT = { food: "shop", cafe: "shop", shop: "shop", arcade: "neon", gacha: "neon", gallery: "shop", theater: "cinema", lobby: "shop", classroom: "shop", library: "shop", lab: "shop", karaoke: "neon", gym: "shop", spa: "shop", haunted: "dark", escape: "dark", studio: "shop", showroom: "shop", room: "shop" };
  function goodsOf(name) {
    const n = String(name || "");
    if (/おもちゃ|TOY/i.test(n)) return GOODS.toy; if (/本|BOOK|地図/i.test(n)) return GOODS.book; if (/写真|PHOTO/i.test(n)) return GOODS.photo; if (/花|FLOWER/i.test(n)) return GOODS.flower;
    if (/時計|宝石|WATCH/i.test(n)) return GOODS.watch; if (/スポーツ|SPORT|FAN/i.test(n)) return GOODS.sports; if (/音楽|MUSIC/i.test(n)) return GOODS.music; if (/雑貨/.test(n)) return GOODS.zakka;
    if (/洋服|NOVA|FASHION/i.test(n)) return GOODS.fashion; if (/みやげ|GIFT|SOUVENIR/i.test(n)) return GOODS.souvenir; if (/SPACE|宇宙/i.test(n)) return GOODS.space; if (/XEVARION|STORE/i.test(n)) return GOODS.store;
    return GOODS.default;
  }
  function menuOf(o) { return MENU[o.menu] || MENU[o.prop] || MENU.default; }
  P.PARK_DATA = { MENU, GOODS, EXHIBIT };

  /* ══════════════ 形の小道具 ══════════════ */
  function lb(w, h, d, uvS) {
    const g = new T.BoxGeometry(w, h, d);
    if (uvS) { const uv = g.attributes.uv, n = g.attributes.normal; for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)); const sx = nx > 0.5 ? d : w, sy = ny > 0.5 ? d : h; uv.setXY(i, uv.getX(i) * sx / uvS, uv.getY(i) * sy / uvS); } }
    return g;
  }
  /* 内がわから見える円柱（面の向きを反対に） */
  function innerCyl(r, h, seg, a0, al) { const g = new T.CylinderGeometry(r, r, h, seg || 32, 1, true, a0 || 0, al || TAU); const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); return g; }

  /* ══════════════ 入れる建物（四角い建物の1階） ══════════════
     x,z 中心・w 幅・d 奥行き・hi 天井の高さ・ry 向き（正面＝ローカル +z に入口）
     o = { type, name, key 外壁, inner 内装, floor 床, door 入口の幅, doorX 入口の位置, glass ガラス窓, prop/menu 食べ物, items, list, video 動画の場所の名前, light } */
  P.enterable = function (x, z, w, d, hi, ry, o) {
    o = o || {};
    const W = this, c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    const type = o.type || "shop", ext = o.key || "offWhite", inn = o.inner || INNER[type] || "creamW", flo = o.floor || FLOOR[type] || "woodLight";
    const t = 0.34, iw = w - 2 * t, id = d - 2 * t, dw = Math.min(o.door || (w > 18 ? 4 : 2.6), w * 0.5), dh = Math.min(o.doorH || 3.2, hi - 0.4), dx = o.doorX || 0;
    const B = (key, lw, lh, ld, cx, cy, cz, det, uvS) => W.geo(key, lb(lw, lh, ld, uvS).translate(cx, cy, cz), x, 0, z, ry, det);
    const glass = o.glass !== false;
    { const g = new T.PlaneGeometry(iw, id); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); W.geo(flo, g.translate(0, 0.028, 0), x, 0, z, ry); }
    B(ext, w, hi, 0.14, 0, hi / 2, -d / 2 + 0.07, false, 10.5); B(inn, iw, hi, 0.2, 0, hi / 2, -d / 2 + 0.24, true, 4);
    [-1, 1].forEach((k) => { B(ext, 0.14, hi, d, k * (w / 2 - 0.07), hi / 2, 0, false, 10.5); B(inn, 0.2, hi, id, k * (w / 2 - 0.24), hi / 2, 0, true, 4); });
    const a0 = -w / 2, a1 = dx - dw / 2, b0 = dx + dw / 2, b1 = w / 2, zf = d / 2 - 0.07;
    [[a0, a1], [b0, b1]].forEach(([p0, p1]) => {
      const lw = p1 - p0, cx = (p0 + p1) / 2; if (lw < 0.05) return;
      if (glass && hi > 3.2) { B(ext, lw, 0.8, 0.14, cx, 0.4, zf, false, 10.5); B("glassClear", lw - 0.1, hi - 1.8, 0.05, cx, 0.8 + (hi - 1.8) / 2, zf, false); B(ext, lw, 1.0, 0.14, cx, hi - 0.5, zf, false, 10.5); B("woodDark2", 0.1, hi - 1.8, 0.18, p0 + 0.05, 0.8 + (hi - 1.8) / 2, zf, false); B("woodDark2", 0.1, hi - 1.8, 0.18, p1 - 0.05, 0.8 + (hi - 1.8) / 2, zf, false); B(inn, lw, 0.8, 0.2, cx, 0.4, d / 2 - 0.24, true, 4); }
      else { B(ext, lw, hi, 0.14, cx, hi / 2, zf, false, 10.5); B(inn, lw, hi, 0.2, cx, hi / 2, d / 2 - 0.24, true, 4); }
    });
    B(ext, dw, hi - dh, 0.14, dx, dh + (hi - dh) / 2, zf, false, 10.5); B(inn, dw, hi - dh, 0.2, dx, dh + (hi - dh) / 2, d / 2 - 0.24, true, 4);
    B("goldOrn", 0.12, dh, 0.24, dx - dw / 2, dh / 2, zf + 0.02, true); B("goldOrn", 0.12, dh, 0.24, dx + dw / 2, dh / 2, zf + 0.02, true); B("goldOrn", dw + 0.24, 0.14, 0.24, dx, dh, zf + 0.02, true);
    B(o.ceil || CEIL[type] || "white2", iw, 0.24, id, 0, hi - 0.12, 0, true);
    if (DOWN[type]) { const nx = Math.max(1, Math.round(iw / 3)), nz = Math.max(1, Math.round(id / 3)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) B(type === "arcade" || type === "gacha" || type === "karaoke" ? ["neonPink", "neonCyan", "neonPurple"][(i + j) % 3] : "lampGlow", 0.28, 0.04, 0.28, -iw / 2 + (i + 0.5) * iw / nx, hi - 0.25, -id / 2 + (j + 0.5) * id / nz, true); }
    else { const nx = Math.max(1, Math.round(iw / 4)), nz = Math.max(1, Math.round(id / 4)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) B("lightPanel", 1.1, 0.05, 1.1, -iw / 2 + (i + 0.5) * iw / nx, hi - 0.27, -id / 2 + (j + 0.5) * id / nz, true); }
    const wall = (a, b, lw, ld) => { const [px, pz] = L(a, b); W.colObb(px, pz, lw, ld, ry); };
    wall(0, -d / 2 + t / 2, w, t); wall(-w / 2 + t / 2, 0, t, d); wall(w / 2 - t / 2, 0, t, d);
    if (a1 - a0 > 0.05) wall((a0 + a1) / 2, d / 2 - t / 2, a1 - a0, t); if (b1 - b0 > 0.05) wall((b0 + b1) / 2, d / 2 - t / 2, b1 - b0, t);
    const ax = Math.abs(c) * iw / 2 + Math.abs(s) * id / 2, az = Math.abs(s) * iw / 2 + Math.abs(c) * id / 2;
    const name = o.name || "店内";
    W.zone(name, x - ax, z - az, x + ax, z + az, o.light || LIGHT[type] || "shop");
    (W.interiors = W.interiors || []).push({ x, z, c, s, hw: iw / 2, hd: id / 2, hi, name, type, round: false });
    (W.doors = W.doors || []).push(L(dx, d / 2 + 1.6));          /* ★ 2026-09-30 入口の前まで道をつなぐ（park_roads.js） */
    (W.noGrass = W.noGrass || []).push([x - ax - 1, z - az - 1, x + ax + 1, z + az + 1]);
    const ctx = { W, x, z, c, s, ry, L, B, iw, id, hi, o, type, dx, dw, name,
      col: (a, b, lw, ld) => wall(a, b, lw, ld),
      seat: (a, b, yl, h) => { const [px, pz] = L(a, b); W.seats.push({ x: px, z: pz, yaw: ry + yl, h }); },
      act: (a, b, r, label, fn, icon) => { const [px, pz] = L(a, b); return W.interact(px, pz, r, label, fn, icon); },
      G: (key, g, det) => W.geo(key, g, x, 0, z, ry, det !== false),
      sign: (text, so, sw, sh, a, y, b) => { const [px, pz] = L(a, b); W.sign(text, so, sw, sh, px, y, pz, ry); },
      screen: (a, y, b, sw, sh, title, sub, cols) => { const [px, pz] = L(a, b); return W.bigScreen(px, y, pz, ry, sw, sh, title, sub, cols); } };
    W.detail(() => { (FURN[type] || FURN.shop)(ctx); if (DECOR[type]) decor(ctx); });
    return ctx;
  };

  /* ══════════════ 飾り（観葉植物・壁の絵） ══════════════ */
  const DECOR = { food: 1, cafe: 1, shop: 1, lobby: 1, room: 1, library: 1, classroom: 1, gallery: 1, lab: 1, showroom: 1, spa: 0 };
  function decor(C) {
    const { B, G, iw, id, hi, type } = C, bz = -id / 2;
    [-1, 1].forEach((k) => { const a = k * (iw / 2 - 0.65), b = id / 2 - 0.75; if (Math.abs(a - C.dx) < C.dw / 2 + 0.8) return; G("stoneW", new T.CylinderGeometry(0.3, 0.24, 0.5, 10).translate(a, 0.25, b)); G("leafDark", new T.IcosahedronGeometry(0.55, 1).translate(a, 1.0, b)); G("leafLight", new T.IcosahedronGeometry(0.34, 1).translate(a + 0.1, 1.45, b - 0.05)); C.col(a, b, 0.6, 0.6); });
    if (id > 6 && hi > 3.4 && type !== "shop" && type !== "library") [-1, 1].forEach((k) => { for (let j = 0; j < Math.min(3, Math.floor(id / 5)); j++) { const b = -id / 2 + (j + 1) * id / (Math.min(3, Math.floor(id / 5)) + 1), a = k * (iw / 2 - 0.26);
      G("goldOrn", new T.BoxGeometry(0.05, 0.9, 1.3).translate(a, 2.0, b)); G(["irisA", "propPink", "propMint", "irisC", "propYellow", "propSalmon"][(j * 2 + (k > 0 ? 1 : 0)) % 6], new T.BoxGeometry(0.06, 0.74, 1.14).translate(a - k * 0.01, 2.0, b)); } });
  }

  /* ══════════════ 中身（種類ごと） ══════════════ */
  const table2 = (C, a, b, key, chairs) => { const { G } = C; G("white2", new T.CylinderGeometry(0.5, 0.5, 0.05, 14).translate(a, 0.74, b)); G("darkMetal", new T.CylinderGeometry(0.05, 0.08, 0.74, 6).translate(a, 0.37, b)); C.col(a, b, 0.9, 0.9);
    (chairs || [[0.85, 0], [-0.85, 0]]).forEach(([da, db]) => { G(key || "seatsRed", new T.BoxGeometry(0.44, 0.06, 0.44).translate(a + da, 0.46, b + db)); const bk = new T.BoxGeometry(0.44, 0.46, 0.06); const ang = Math.atan2(da, db); bk.translate(0, 0.72, 0.22).rotateY(ang); G(key || "seatsRed", bk.translate(a + da, 0, b + db)); C.seat(a + da, b + db, Math.atan2(-da, -db), 0.47); }); };
  const FURN = {
    food(C) {
      const { B, G, W, iw, id, hi, o, name } = C, bz = -id / 2, cl = Math.max(2, iw - 2.4);
      B("woodDark", cl, 1.0, 0.75, 0, 0.5, bz + 1.5); B("pBlack", cl + 0.1, 0.06, 0.9, 0, 1.03, bz + 1.5); C.col(0, bz + 1.5, cl, 0.8);
      B("chromeB", cl, 0.9, 0.5, 0, 0.45, bz + 0.5); B("woodDark", cl, 0.08, 0.4, 0, 1.55, bz + 0.45); B("woodDark", cl, 0.08, 0.4, 0, 2.05, bz + 0.45);
      for (let a = -cl / 2 + 0.3; a < cl / 2 - 0.2; a += 0.34) G(["propRed", "propYellow", "propWhite", "propGreen", "propBrown"][Math.floor((a + 20) * 3) % 5], new T.CylinderGeometry(0.1, 0.1, 0.26, 8).translate(a, 1.72 + (Math.floor((a + 20) * 7) % 2) * 0.5, bz + 0.45));
      const items = o.items || menuOf(o);
      C.sign("お品書き  " + name + "\n" + items.slice(0, 3).map((q) => q[0] + " " + q[1]).join("  /  "), { bg: "#1e1a14", color: "#fff3d6", border: "#c8a060", px: 1024 }, Math.min(iw - 1, 6), 1.2, 0, 2.75, bz + 0.2);
      for (let a = -cl / 2 + 0.6; a <= cl / 2 - 0.6; a += 0.95) { G("seatsRed", new T.CylinderGeometry(0.21, 0.21, 0.08, 10).translate(a, 0.72, bz + 2.3)); G("darkMetal", new T.CylinderGeometry(0.04, 0.05, 0.7, 5).translate(a, 0.35, bz + 2.3)); C.seat(a, bz + 2.25, Math.PI, 0.74); }
      for (let zz = bz + 4.1; zz < id / 2 - 1.3; zz += 2.7) for (let xx = -iw / 2 + 1.5; xx < iw / 2 - 1.3; xx += 2.9) { if (Math.abs(xx - C.dx) < 1.7 && zz > id / 2 - 3.2) continue; table2(C, xx, zz, "seatsRed"); }
      for (let a = -cl / 2 + 1; a < cl / 2; a += 2.4) { const [px, pz] = C.L(a, bz + 2.2); W.lantern(px, hi - 1.25, pz, 0.45, "lanR", C.ry); }
      C.act(0, bz + 2.9, 2.4, "注文する（" + name + "）", () => ({ shop: { kind: "food", name, items } }), "🍽️");
    },
    cafe(C) { C.o.menu = C.o.menu || "cafe"; FURN.food(C); const { G, iw, id } = C; for (let i = 0; i < 2; i++) { const a = (i ? 1 : -1) * (iw / 2 - 0.9); G("seatsBlue2", new T.BoxGeometry(1.0, 0.45, 2.4).translate(a, 0.22, id / 2 - 2.4)); C.seat(a, id / 2 - 2.4, (i ? -1 : 1) * Math.PI / 2, 0.47); } },
    shop(C) {
      const { B, G, W, iw, id, hi, o, name } = C, bz = -id / 2, items = o.items || goodsOf(name);
      const COLS = ["propPink", "irisA", "propYellow", "propMint", "propRed", "irisC", "propWhite"];
      const shelf = (a, b, len, rot, face) => {
        const D = 0.5, H = 2.1;
        G("woodLight", new T.BoxGeometry(rot ? 0.06 : len, H, rot ? len : 0.06).translate(rot ? a - face * (D / 2 - 0.03) : a, H / 2, rot ? b : b - face * (D / 2 - 0.03)));
        [-1, 1].forEach((k) => G("woodLight", new T.BoxGeometry(rot ? D : 0.06, H, rot ? 0.06 : D).translate(rot ? a : a + k * (len / 2 - 0.03), H / 2, rot ? b + k * (len / 2 - 0.03) : b)));
        for (let lv = 0; lv < 4; lv++) { const y = 0.1 + lv * 0.62; G("woodDark", new T.BoxGeometry(rot ? D : len, 0.05, rot ? len : D).translate(a, y, b));
          if (lv < 3) for (let k = 0; k < Math.floor((len - 0.2) / 0.3); k++) { const off = -len / 2 + 0.25 + k * 0.3, h = 0.26 - (k % 3) * 0.05, px = rot ? a + face * 0.04 : a + off, pz = rot ? b + off : b + face * 0.04; G(COLS[(k * 3 + lv * 5) % 7], new T.BoxGeometry(0.2, h, 0.2).translate(px, y + 0.025 + h / 2, pz)); } }
        C.col(a, b, rot ? D : len, rot ? len : D);
      };
      shelf(0, bz + 0.3, iw - 1.2, false, 1);
      [-1, 1].forEach((k) => { if (id > 5) shelf(k * (iw / 2 - 0.3), -0.6, Math.max(1.5, id - 4.2), true, -k); });
      if (iw > 6 && id > 6) { B("woodLight", 2.2, 0.8, 1.2, 0, 0.4, -0.4); C.col(0, -0.4, 2.2, 1.2); for (let k = 0; k < 6; k++) G(["propPink", "propYellow", "irisA", "propMint"][k % 4], new T.SphereGeometry(0.16, 10, 8).translate(-0.8 + (k % 3) * 0.8, 0.95, -0.7 + Math.floor(k / 3) * 0.6)); }
      const ca = C.dx > 0 ? -iw / 2 + 1.3 : iw / 2 - 1.3; B("woodDark", 1.8, 1.0, 0.7, ca, 0.5, id / 2 - 1.6); B("pBlack", 0.4, 0.3, 0.3, ca, 1.15, id / 2 - 1.6); C.col(ca, id / 2 - 1.6, 1.8, 0.7);
      C.act(ca, id / 2 - 2.6, 2.4, "買い物をする（" + name + "）", () => ({ shop: { kind: "goods", name, items } }), "🛍️");
    },
    arcade(C) {
      const { B, G, W, iw, id, hi, name } = C, bz = -id / 2, neon = ["neonPink", "neonCyan", "neonYellow", "neonPurple", "neonGreen"];
      let k = 0;
      const body = ["pRed", "pBlue", "pPurple", "pYellow", "pPink"];
      for (let zz = bz + 1.4; zz < id / 2 - 2.8; zz += 3.0) for (let xx = -iw / 2 + 1.0; xx < iw / 2 - 0.8; xx += 1.2) { if (Math.abs(xx - C.dx) < 1.6 && zz > id / 2 - 4.2) continue;
        B(body[k % 5], 0.9, 1.75, 1.0, xx, 0.875, zz); [-1, 1].forEach((f) => { B("pBlack", 0.8, 0.62, 0.03, xx, 1.36, zz + f * 0.51); B(neon[(k + (f > 0 ? 0 : 3)) % 5], 0.7, 0.5, 0.03, xx, 1.36, zz + f * 0.52); B("pBlack", 0.84, 0.08, 0.3, xx, 0.98, zz + f * 0.62); B("propRed", 0.08, 0.08, 0.08, xx - 0.2, 1.05, zz + f * 0.66); B("propYellow", 0.07, 0.05, 0.07, xx + 0.1, 1.04, zz + f * 0.66); });
        B(neon[(k + 2) % 5], 0.92, 0.14, 1.02, xx, 1.82, zz); C.col(xx, zz, 0.9, 1.0); k++; }
      for (let zz = bz + 2.9; zz < id / 2 - 2.8; zz += 3.0) B(neon[(Math.round(zz) % 5 + 5) % 5], iw - 1.6, 0.02, 0.06, 0, 0.04, zz);
      for (let i = 0; i < 3; i++) { const a = -iw / 2 + 1.2 + i * 1.6; if (a > iw / 2 - 1) break; if (Math.abs(a - C.dx) < C.dw / 2 + 1.0) continue; B("glassClear", 1.2, 1.3, 1.2, a, 1.35, id / 2 - 1.2); B("pRed", 1.3, 0.7, 1.3, a, 0.35, id / 2 - 1.2); for (let q = 0; q < 5; q++) G(["propPink", "propYellow", "irisA", "propMint", "propWhite"][q], new T.SphereGeometry(0.16, 8, 6).translate(a - 0.3 + (q % 3) * 0.3, 0.85 + Math.floor(q / 3) * 0.2, id / 2 - 1.2 + (q % 2) * 0.2 - 0.1)); C.col(a, id / 2 - 1.2, 1.3, 1.3); }
      C.sign(name, { bg: "#10081e", color: "#fff", glow: "#ff4fb0", border: "#4ff0ff", px: 1024 }, Math.min(iw - 1, 7), 1.0, 0, hi - 1.2, bz + 0.26);
      C.act(C.dx, id / 2 - 2.2, 2.4, "ゲームであそぶ（" + name + "）", () => ({ arcade: { name } }), "🕹️");
    },
    gacha(C) {
      const { W, iw, id, hi, name } = C, bz = -id / 2;
      for (let zz = bz + 1.4; zz < id / 2 - 2.4; zz += 2.2) for (let xx = -iw / 2 + 1.1; xx < iw / 2 - 0.9; xx += 1.5) { if (Math.abs(xx - C.dx) < 1.6 && zz > id / 2 - 4) continue; const [px, pz] = C.L(xx, zz); W.gachaMachine(px, pz, 0.8, ["pRed", "pBlue", "pYellow", "pPink", "pGreen"][Math.floor((xx + zz + 40) * 3) % 5]); }
      C.sign("CAPSULE TOYS  カプセルトイ", { bg: "#10081e", color: "#fff", glow: "#ffd84a", px: 1024 }, Math.min(iw - 1, 7), 1.0, 0, hi - 1.2, bz + 0.26);
      C.act(C.dx, id / 2 - 2.2, 2.4, "カプセルトイを回す（" + name + "）", () => ({ capsule: { name } }), "🎰");
    },
    gallery(C) {
      const { B, G, W, iw, id, hi, o, name } = C, bz = -id / 2, list = o.list || EXHIBIT.art;
      const nP = Math.max(2, Math.min(6, Math.floor(iw / 4)));
      for (let i = 0; i < nP; i++) { const a = -iw / 2 + (i + 0.5) * iw / nP; B("goldOrn", 2.3, 1.6, 0.06, a, 2.2, bz + 0.24); B(["irisA", "propPink", "propMint", "irisC", "propYellow", "propSalmon"][i % 6], 2.1, 1.4, 0.07, a, 2.2, bz + 0.27); C.sign((list[i % list.length] || ["展示"])[0], { bg: "#f6f0e2", color: "#2a2018", px: 512 }, 1.6, 0.3, a, 1.15, bz + 0.3); }
      for (let i = 0; i < Math.min(4, Math.floor(iw / 5)); i++) { const a = -iw / 2 + 2.5 + i * (iw - 5) / Math.max(1, Math.min(4, Math.floor(iw / 5)) - 1 || 1); B("stoneW", 1.0, 1.0, 1.0, a, 0.5, -0.2); G(["goldOrn", "glassDome", "chromeB", "irisA"][i % 4], new T.IcosahedronGeometry(0.4, 0).translate(a, 1.45, -0.2)); C.col(a, -0.2, 1.0, 1.0); }
      if (id > 7) { B("woodLight", 2.4, 0.45, 0.6, 0, 0.23, id / 2 - 2.6); C.seat(-0.5, id / 2 - 2.6, Math.PI, 0.47); C.seat(0.5, id / 2 - 2.6, Math.PI, 0.47); }
      C.act(0, bz + 2.2, 2.6, "展示を見る（" + name + "）", () => ({ gallery: { name, list } }), "🖼️");
    },
    showroom(C) {
      const { B, G, W, iw, id, name, o } = C, bz = -id / 2, list = o.list || EXHIBIT.ev;
      const n = Math.max(1, Math.min(3, Math.floor(iw / 7)));
      for (let i = 0; i < n; i++) { const a = -iw / 2 + (i + 0.5) * iw / n, [px, pz] = C.L(a, bz + id * 0.38); G("chromeB", new T.CylinderGeometry(2.6, 2.6, 0.25, 32).translate(a, 0.12, bz + id * 0.38)); C.col(a, bz + id * 0.38, 4.6, 4.6);
        if (o.robot) { W.robotStatue(px, pz, 0.28); } else { const car = W.raceCar(px, pz, C.ry + 0.6 + i, [0xe84a4a, 0x3a78e8, 0xffd24a][i % 3]); car.position.y = 0.26; } }
      FURN.gallery(Object.assign({}, C, { o: Object.assign({}, o, { list }) }));
    },
    theater(C) {
      /* ★ 客席は段々（前は平らな床の上に座席が宙に浮いていた）。前から：舞台 → 通路 → 客席（1列ごとに上がる）→ うしろの通路 → 出口への階段 → 入口 */
      const { B, G, W, iw, id, hi, o, name } = C, bz = -id / 2, sd = Math.min(5, id * 0.18), sw = Math.min(iw - 2, (hi - 2) * 16 / 9 * 0.95), sh = sw * 9 / 16;
      B("stageTop", iw, 1.0, sd, 0, 0.5, bz + sd / 2); C.col(0, bz + sd / 2, iw, sd);
      B("goldOrn", iw, 0.12, 0.14, 0, 1.0, bz + sd + 0.05);
      const scrY = Math.max(1.3 + sh / 2, Math.min(hi - 0.5 - sh / 2, hi * 0.55 + 0.4));
      const scr = C.screen(0, scrY, bz + 0.3, sw, sh, o.screenTitle || name, o.screenSub || ["まもなく上映", "E で動画を映せます（YouTube）"], ["#0a0a1a", "#2a0a3a"]);
      [-1, 1].forEach((k) => { B("carpetRed", 1.2, hi - 1.2, 0.3, k * Math.min(sw / 2 + 0.8, iw / 2 - 0.7), (hi - 1.2) / 2 + 1.0, bz + 0.5); });
      const top = Math.min(1.8, hi * 0.14), nD = Math.max(1, Math.ceil(top / 0.18)), dD = 0.32, b0 = bz + sd + 2.6;
      const avail = id / 2 - 1.8 - nD * dD - 1.3 - b0, rows = Math.max(2, Math.min(24, Math.floor(avail / 1.25))), rise = top / Math.max(1, rows - 1);
      const bA = b0 + rows * 1.25, bS = bA + 1.3;
      for (let r = 1; r < rows; r++) B("carpetRed", iw, r * rise, 1.25, 0, r * rise / 2, b0 + (r + 0.5) * 1.25, true);
      B("carpetRed", iw, top, 1.3, 0, top / 2, bA + 0.65, true);
      for (let i = 0; i < nD; i++) { const h2 = top - (i + 1) * top / nD; if (h2 > 0.01) B("carpetRed", iw, h2, dD, 0, h2 / 2, bS + (i + 0.5) * dD, true); }
      for (let r = 0; r < rows; r++) { const zz = b0 + (r + 0.5) * 1.25; B("lampGlow", 0.08, 0.04, 0.08, -1.62, r * rise + 0.05, zz - 0.5, true); B("lampGlow", 0.08, 0.04, 0.08, 1.62, r * rise + 0.05, zz - 0.5, true); }
      (W.heightExtra = W.heightExtra || []).push({ tstep: 1, cx: C.x, cz: C.z, ang: C.ry, hw: iw / 2, b0, bA, bS, rise, top, nD, dD });
      const seatG = XWorld.mergeGeos([new T.BoxGeometry(0.56, 0.1, 0.5).translate(0, 0.45, 0), new T.BoxGeometry(0.56, 0.62, 0.08).translate(0, 0.78, 0.25), new T.BoxGeometry(0.06, 0.25, 0.5).translate(0.3, 0.6, 0), new T.BoxGeometry(0.06, 0.25, 0.5).translate(-0.3, 0.6, 0)]);
      const pos = []; for (let r = 0; r < rows; r++) { const zz = b0 + (r + 0.5) * 1.25, yy = r * rise; for (let a = -iw / 2 + 1.0; a <= iw / 2 - 1.0; a += 0.66) { if (Math.abs(a) < 1.7) continue; pos.push([a, yy, zz]); } }
      const q = new T.Quaternion().setFromEuler(new T.Euler(0, C.ry + Math.PI, 0)), inst = new T.InstancedMesh(seatG, W.m.seatsRed || W.m.seat, pos.length), m4 = new T.Matrix4();
      pos.forEach(([a, yy, zz], i) => { const [px, pz] = C.L(a, zz); m4.compose(new T.Vector3(px - C.x, yy, pz - C.z), q, new T.Vector3(1, 1, 1)); inst.setMatrixAt(i, m4); if (i % 3 === 0 || Math.abs(a) < 2.5) C.seat(a, zz, Math.PI, 0.5 + yy); });
      inst.position.set(C.x, 0, C.z); inst.receiveShadow = true; inst.computeBoundingSphere(); W.scene.add(inst); W.loose(inst, Math.max(120, iw * 3));
      for (let r = 0; r < rows; r++) { const zz = b0 + (r + 0.5) * 1.25, half = iw / 2 - 1.9; C.col(-(1.9 + half / 2), zz, half, 0.55); C.col(1.9 + half / 2, zz, half, 0.55); }
      const key = o.video || ("vid_" + Math.round(C.x) + "_" + Math.round(C.z));
      const rc = Math.floor(rows * 0.55), bc = b0 + (rc + 0.5) * 1.25, [ex, ez] = C.L(0, bc), [lx, lz] = C.L(0, bz + 0.3);
      W.videoSpots = W.videoSpots || {}; W.videoSpots[key] = { scr, cam: [ex, rc * rise + 1.5, ez], look: [lx, scrY, lz], hall: name };
      C.act(0, bc, 3.2, "スクリーンで上映を見る（" + name + "・YouTube）", () => ({ video: key }), "🎬");
      C.act(0, bz + sd + 1.3, 2.2, "舞台のあいさつを聞く（" + name + "）", () => ({ lobby: { name, text: (o.stageText || "本日はご来場ありがとうございます。上映中はおしゃべりをひかえて、XEVARION の大きなスクリーンをお楽しみください。") } }), "🎭");
    },
    lobby(C) {
      const { B, G, W, iw, id, hi, o, name } = C, bz = -id / 2, dl = Math.min(iw - 2, 8);
      B("marble", dl, 1.1, 0.9, 0, 0.55, bz + 1.6); B("goldOrn", dl + 0.1, 0.06, 1.0, 0, 1.12, bz + 1.6); C.col(0, bz + 1.6, dl, 0.9);
      C.sign(o.deskSign || ("RECEPTION  " + name), { bg: "#1a2a4a", color: "#fff", border: "#f2c04a", px: 1024 }, Math.min(iw - 2, 6), 0.9, 0, 2.6, bz + 0.26);
      for (let i = 0; i < Math.min(3, Math.floor(iw / 5)); i++) { const a = -iw / 2 + 2.5 + i * 4, b = 0.5; if (Math.abs(a - C.dx) < 2 && b > id / 2 - 4) continue; G("seatsBlue2", new T.BoxGeometry(2.2, 0.45, 0.9).translate(a, 0.23, b)); G("seatsBlue2", new T.BoxGeometry(2.2, 0.55, 0.2).translate(a, 0.7, b - 0.35)); C.col(a, b, 2.2, 0.9); C.seat(a - 0.5, b + 0.05, 0, 0.47); C.seat(a + 0.5, b + 0.05, 0, 0.47); }
      [-1, 1].forEach((k) => { G("stoneW", new T.CylinderGeometry(0.35, 0.3, 0.6, 10).translate(k * (iw / 2 - 1), 0.3, bz + 1)); G("leafDark", new T.IcosahedronGeometry(0.7, 1).translate(k * (iw / 2 - 1), 1.2, bz + 1)); });
      if (hi > 5) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; G("lampGlow", new T.SphereGeometry(0.12, 8, 6).translate(Math.cos(a) * 1.2, hi - 1.6 + Math.sin(k * 2) * 0.2, Math.sin(a) * 1.2 - 0.5)); }
      C.act(0, bz + 2.6, 2.6, (o.actLabel || "フロントで休む・案内を聞く") + "（" + name + "）", () => ({ lobby: { name, text: o.text, fortune: !!o.fortune } }), o.fortune ? "🔮" : "🛎️");
    },
    classroom(C) {
      const { B, G, W, iw, id, hi, o, name } = C, bz = -id / 2;
      B("pGreen", Math.min(iw - 2, 7), 1.6, 0.06, 0, 1.9, bz + 0.25); B("woodLight", Math.min(iw - 2, 7) + 0.2, 0.08, 0.2, 0, 1.08, bz + 0.3);
      C.sign(o.board || "きょうの授業：星と宇宙", { bg: "#2a5a3a", color: "#ffffff", px: 1024 }, Math.min(iw - 2.5, 6), 0.5, 0, 2.4, bz + 0.31);
      B("woodDark", 1.6, 0.9, 0.7, iw / 2 - 2, 0.45, bz + 1.6); C.col(iw / 2 - 2, bz + 1.6, 1.6, 0.7);
      for (let zz = bz + 3.2; zz < id / 2 - 1.8; zz += 1.7) for (let a = -iw / 2 + 1.2; a < iw / 2 - 1; a += 1.5) { if (Math.abs(a - C.dx) < 1.4 && zz > id / 2 - 3) continue; B("woodLight", 1.1, 0.06, 0.6, a, 0.74, zz); B("darkMetal", 0.06, 0.74, 0.06, a, 0.37, zz); B("seatsBlue2", 0.42, 0.05, 0.42, a, 0.45, zz + 0.55); C.col(a, zz, 1.1, 0.6); C.seat(a, zz + 0.55, Math.PI, 0.47); if (o.pc) B("pBlack", 0.5, 0.35, 0.04, a, 0.95, zz - 0.15); }
      C.act(0, bz + 2.4, 2.4, (o.actLabel || "授業を受ける（学ぶ）") + "（" + name + "）", () => ({ learn: { name, app: o.app || "MagiLex", quiz: !!o.quiz } }), "📚");
    },
    library(C) {
      const { G, W, iw, id, name, o } = C, bz = -id / 2;
      for (let zz = bz + 1; zz < id / 2 - 3; zz += 2.4) for (let side = -1; side <= 1; side += 2) { const a = side * (iw / 4 + 0.5), len = iw / 2 - 2.4; if (len < 1.5) continue; G("woodDark", new T.BoxGeometry(len, 2.4, 0.45).translate(a, 1.2, zz)); C.col(a, zz, len, 0.5);
        for (let lv = 0; lv < 4; lv++) for (let k = 0; k < Math.floor(len / 0.12); k += 2) G(["propRed", "irisA", "propGreen", "propYellow", "propBrown", "irisC"][(k + lv * 3) % 6], new T.BoxGeometry(0.1, 0.36 + (k % 3) * 0.04, 0.3).translate(a - len / 2 + 0.1 + k * 0.12, 0.3 + lv * 0.56, zz + 0.2)); }
      table2(C, 0, id / 2 - 2.4, "seatsBlue2", [[0.85, 0], [-0.85, 0], [0, 0.85]]);
      C.act(0, id / 2 - 3.6, 2.6, "本を読む（MagiLex で学ぶ）（" + name + "）", () => ({ learn: { name, app: "MagiLex" } }), "📖");
    },
    lab(C) {
      const { B, G, W, iw, id, name } = C, bz = -id / 2;
      for (let zz = bz + 1.6; zz < id / 2 - 2; zz += 2.8) { B("white2", iw - 3, 0.95, 0.9, 0, 0.47, zz); B("pBlack", iw - 2.9, 0.05, 1.0, 0, 0.97, zz); C.col(0, zz, iw - 3, 0.9);
        for (let a = -iw / 2 + 2.2; a < iw / 2 - 2; a += 1.1) { G(["neonCyan", "neonGreen", "neonPink"][Math.floor((a + 30) * 2) % 3], new T.CylinderGeometry(0.08, 0.14, 0.34, 8).translate(a, 1.18, zz)); G("glassClear", new T.SphereGeometry(0.12, 8, 6).translate(a + 0.4, 1.12, zz + 0.15)); } }
      G("holoBlue", new T.IcosahedronGeometry(0.9, 1).translate(0, 2.2, id / 2 - 2.8)); G("white2", new T.CylinderGeometry(0.7, 0.9, 1.1, 16).translate(0, 0.55, id / 2 - 2.8)); C.col(0, id / 2 - 2.8, 1.8, 1.8);
      C.act(1.8, id / 2 - 2.8, 2.6, "実験を見る（" + name + "）", () => ({ lab: { name } }), "🧪");
    },
    karaoke(C) {
      const { B, G, W, iw, id, hi, name } = C, bz = -id / 2;
      B("stageTop", iw - 2, 0.5, 2.4, 0, 0.25, bz + 1.4); C.col(0, bz + 1.4, iw - 2, 2.4);
      const scr = C.screen(0, 3.2, bz + 0.3, Math.min(iw - 3, 6), Math.min(iw - 3, 6) * 9 / 16, "KARAOKE", ["♪ 歌ってみよう", "マイクの前で E"], ["#2a0a4a", "#0a2a5a"]);
      G("chromeB", new T.CylinderGeometry(0.02, 0.02, 1.5, 5).translate(0, 1.25, bz + 1.6)); G("pBlack", new T.SphereGeometry(0.06, 8, 6).translate(0, 2.0, bz + 1.6));
      for (let i = 0; i < 3; i++) { const b = bz + 4 + i * 2.2; if (b > id / 2 - 1.5) break; [-1, 1].forEach((k) => { G("seatsRed", new T.BoxGeometry(2.2, 0.45, 0.9).translate(k * (iw / 2 - 1.8), 0.23, b)); C.col(k * (iw / 2 - 1.8), b, 2.2, 0.9); C.seat(k * (iw / 2 - 1.8), b, Math.PI, 0.47); }); }
      for (let k = 0; k < 6; k++) G(["neonPink", "neonCyan", "neonPurple"][k % 3], new T.SphereGeometry(0.18, 8, 6).translate(-iw / 2 + 1 + k * (iw - 2) / 5, hi - 0.8, 0));
      C.act(0, bz + 2.9, 2.4, "マイクの前で歌う（" + name + "）", () => ({ karaoke: { name } }), "🎤");
    },
    gym(C) {
      const { B, G, W, iw, id, hi, name } = C, bz = -id / 2;
      const line = (a, b, lw, ld) => B("lineW", lw, 0.012, ld, a, 0.04, b, true);
      const cw = Math.min(iw - 4, 28), cd = Math.min(id - 6.5, 15), ox = 0, oz = 0.8;
      B("woodLight", cw + 2, 0.02, cd + 2, ox, 0.035, oz, true);
      line(ox, oz - cd / 2, cw, 0.08); line(ox, oz + cd / 2, cw, 0.08); line(ox - cw / 2, oz, 0.08, cd); line(ox + cw / 2, oz, 0.08, cd); line(ox, oz, 0.08, cd);
      G("lineW", new T.RingGeometry(1.75, 1.83, 32).rotateX(-Math.PI / 2).translate(ox, 0.045, oz));
      [-1, 1].forEach((k) => { G("lineW", new T.RingGeometry(5.2, 5.28, 32, 1, k > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(ox + k * cw / 2, 0.045, oz));
        const px = ox + k * (cw / 2 + 0.6); B("darkMetal", 0.22, 3.2, 0.22, px, 1.6, oz); B("white2", 0.08, 1.1, 1.8, px - k * 0.25, 3.35, oz); B("railRed", 0.05, 0.5, 0.6, px - k * 0.2, 3.1, oz);
        G("railRed", new T.TorusGeometry(0.23, 0.025, 4, 14).rotateX(Math.PI / 2).translate(px - k * 0.6, 3.05, oz)); C.col(px, oz, 0.5, 0.5); });
      /* 観客席（奥の壁の前・3段） */
      for (let r = 0; r < 3; r++) { B(["seatsBlue2", "seatsRed", "seatsBlue2"][r], Math.min(iw - 3, cw + 2), 0.42 + r * 0.42, 0.9, 0, (0.42 + r * 0.42) / 2, bz + 0.6 + (2 - r) * 0.9, true); }
      C.col(0, bz + 1.95, Math.min(iw - 3, cw + 2), 2.7);
      for (let i = 0; i < 8; i++) C.seat(-cw / 2 + (i + 0.5) * cw / 8, bz + 2.95, 0, 0.47);
      C.sign("HOME 42 — 38 GUEST", { bg: "#101010", color: "#ffd84a", border: "#e84a4a", px: 1024 }, 5, 1.1, 0, Math.min(hi - 1, 5.2), bz + 0.28);
      for (let k = 0; k < 5; k++) G(["propRed", "propYellow", "irisA", "propMint", "propWhite"][k], new T.SphereGeometry(0.12, 10, 8).translate(iw / 2 - 1.2 - (k % 3) * 0.28, 0.12, id / 2 - 2 - Math.floor(k / 3) * 0.28));
      C.act(ox + cw / 2 - 4.5, oz, 3, "フリースローに挑戦（" + name + "）", () => ({ game: "shoot" }), "🏀");
    },
    spa(C) {
      const { B, G, W, iw, id, hi, name } = C, bz = -id / 2, pw = Math.max(3, iw - 5), pd = Math.max(2.4, id * 0.42), pz = bz + 1.2 + pd / 2;
      B("paleB", pw, 0.06, pd, 0, 0.03, pz, true);
      [[0, pz - pd / 2 - 0.25, pw + 1, 0.5], [0, pz + pd / 2 + 0.25, pw + 1, 0.5], [-pw / 2 - 0.25, pz, 0.5, pd], [pw / 2 + 0.25, pz, 0.5, pd]].forEach(([a, b, lw, ld]) => { B("stoneW", lw, 0.5, ld, a, 0.25, b, true); C.col(a, b, lw, ld); });
      C.col(0, pz, pw, pd);
      { const wm = new T.PlaneGeometry(pw, pd); wm.rotateX(-Math.PI / 2); const [wx, wz] = C.L(0, pz); W.water(wm.rotateY(C.ry), wx, 0.36, wz, "pool"); }
      for (let k = 0; k < 6; k++) { const [sx, sz] = C.L(-pw / 2 + 0.6 + k * (pw - 1.2) / 5, pz); W.detail(() => W.geo("white2", new T.SphereGeometry(0.18, 8, 6), sx, 0.42, sz)); }
      B("stoneW", 1.2, 1.4, 0.6, 0, 0.7, bz + 0.5, true); G("paleB", new T.CylinderGeometry(0.08, 0.08, 0.9, 8).rotateX(Math.PI / 2).translate(0, 1.2, bz + 1.0));
      for (let i = 0; i < Math.floor(iw / 2.3); i++) { const a = -iw / 2 + 1.3 + i * 2.3; if (Math.abs(a - C.dx) < 1.6 || a > iw / 2 - 1) continue; B("white2", 0.72, 0.32, 1.9, a, 0.3, id / 2 - 2.1, true); B("white2", 0.72, 0.1, 0.7, a, 0.62, id / 2 - 1.45, true); C.seat(a, id / 2 - 2.2, 0, 0.42); }
      [-1, 1].forEach((k) => { G("stoneW", new T.CylinderGeometry(0.34, 0.28, 0.55, 10).translate(k * (iw / 2 - 0.8), 0.28, bz + 0.8)); G("leafDark", new T.IcosahedronGeometry(0.62, 1).translate(k * (iw / 2 - 0.8), 1.15, bz + 0.8)); const [lx, lz] = C.L(k * (pw / 2 - 0.6), pz - pd / 2 - 0.4); W.lantern(lx, hi - 1.2, lz, 0.45, "lanW", C.ry); });
      C.sign("♨️ OCEAN SPA  ゆ", { bg: "#1a4a5a", color: "#fff", border: "#8ad8e8", px: 1024 }, Math.min(iw - 2, 5), 0.8, 0, Math.min(hi - 0.8, 3.4), bz + 0.26);
      C.act(0, pz + pd / 2 + 1.4, 2.6, "お湯につかって休む（" + name + "）", () => ({ rest: { name, spa: true } }), "♨️");
    },
    haunted(C) {
      const { B, G, W, iw, id, hi, name } = C, bz = -id / 2;
      for (let i = 0; i < 3; i++) { const zz = bz + (i + 1) * id / 4, gapLeft = i % 2 === 0; const len = iw - 3.2, a = gapLeft ? 1.6 : -1.6; B("castleDark", len, hi - 0.4, 0.25, a, (hi - 0.4) / 2, zz); C.col(a, zz, len, 0.3); }
      for (let k = 0; k < 10; k++) { const a = -iw / 2 + 0.6 + (k * 1.7) % (iw - 1.2), b = bz + 0.8 + (k * 2.3) % (id - 1.6); G("eyeHi", new T.CircleGeometry(0.06, 8).rotateY(k % 2 ? Math.PI / 2 : 0).translate(a, 1.6 + (k % 3) * 0.3, b)); G("eyeHi", new T.CircleGeometry(0.06, 8).rotateY(k % 2 ? Math.PI / 2 : 0).translate(a + (k % 2 ? 0 : 0.18), 1.6 + (k % 3) * 0.3, b + (k % 2 ? 0.18 : 0))); }
      const ghosts = []; for (let k = 0; k < 4; k++) { const gh = new T.Group(); const body = new T.Mesh(new T.SphereGeometry(0.45, 12, 10, 0, TAU, 0, Math.PI * 0.6).scale(1, 1.4, 1), new T.MeshBasicMaterial({ color: 0xeaf4ff, transparent: true, opacity: 0.7, toneMapped: false })); gh.add(body); [-1, 1].forEach((e) => { const ey = new T.Mesh(new T.CircleGeometry(0.07, 8), W.m.pBlack); ey.position.set(e * 0.14, 0.2, 0.44); gh.add(ey); }); const [px, pz] = C.L(-iw / 2 + 1.5 + k * (iw - 3) / 3, bz + (k + 0.5) * id / 4); gh.position.set(px, 1.6, pz); gh.rotation.y = C.ry; W.scene.add(gh); W.loose(gh, 120); ghosts.push([gh, px, pz, k]); }
      W.anim.push((dt, t) => ghosts.forEach(([gh, px, pz, k]) => { gh.position.set(px + Math.sin(t * 0.7 + k) * 0.8, 1.4 + Math.sin(t * 1.3 + k * 2) * 0.35, pz + Math.cos(t * 0.6 + k) * 0.6); }));
      for (let i = 0; i < 3; i++) { const zz = bz + (i + 1) * id / 4; for (let a = -iw / 2 + 1.2; a < iw / 2 - 1; a += 3.2) { G("propWhite", new T.CylinderGeometry(0.04, 0.04, 0.22, 6).translate(a, 1.7, zz + 0.2)); G("lanGlow", new T.SphereGeometry(0.05, 6, 5).translate(a, 1.85, zz + 0.2)); } }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([ka, kb]) => { for (let r = 0; r < 3; r++) G("white2", new T.TorusGeometry(0.25 + r * 0.25, 0.008, 3, 12, Math.PI / 2).rotateZ(ka > 0 ? Math.PI / 2 : Math.PI).translate(ka * (iw / 2 - 0.3), hi - 0.35, kb * (id / 2 - 0.3))); });
      C.act(C.dx, bz + 1.4, 2.2, "お化け屋敷のゴール！（" + name + "）", () => ({ haunted: { name } }), "👻");
    },
    escape(C) {
      const { B, G, W, iw, id, name } = C, bz = -id / 2;
      B("woodDark", 1.4, 0.8, 0.8, -iw / 2 + 1.4, 0.4, bz + 1.2); G("goldOrn", new T.BoxGeometry(0.5, 0.35, 0.35).translate(-iw / 2 + 1.4, 1.0, bz + 1.2)); C.col(-iw / 2 + 1.4, bz + 1.2, 1.4, 0.8);
      B("woodLight", 1.8, 2.0, 0.4, iw / 2 - 1.4, 1.0, bz + 0.5); for (let k = 0; k < 6; k++) G(["propRed", "irisA", "propYellow"][k % 3], new T.BoxGeometry(0.25, 0.3, 0.2).translate(iw / 2 - 2 + (k % 3) * 0.55, 0.55 + Math.floor(k / 3) * 0.7, bz + 0.5));
      table2(C, 0, 0.2, "woodDark", [[0.85, 0], [-0.85, 0]]); G("propWhite", new T.BoxGeometry(0.4, 0.02, 0.3).translate(0, 0.78, 0.2));
      C.sign("謎を解いて脱出せよ！", { bg: "#1a0a0a", color: "#ffd86a", border: "#8a6a2a", px: 1024 }, Math.min(iw - 2, 4), 0.6, 0, 2.4, bz + 0.26);
      C.act(0, bz + 2.6, 2.6, "脱出ゲームに挑戦（" + name + "）", () => ({ game: "escape" }), "🗝️");
    },
    studio(C) {
      const { B, G, W, iw, id, hi, name, o } = C, bz = -id / 2;
      B(o.green ? "pGreen" : "pWhite", iw - 1, hi - 1, 0.1, 0, (hi - 1) / 2, bz + 0.3);
      for (let k = 0; k < 3; k++) { const a = -iw / 3 + k * iw / 3, b = bz + id * 0.55; G("darkMetal", new T.CylinderGeometry(0.03, 0.03, 1.5, 5).translate(a, 0.75, b)); G("pBlack", new T.BoxGeometry(0.5, 0.4, 0.7).translate(a, 1.65, b)); G("pBlack", new T.CylinderGeometry(0.12, 0.12, 0.3, 10).rotateX(Math.PI / 2).translate(a, 1.65, b - 0.5)); C.col(a, b, 0.6, 0.6); }
      [-1, 1].forEach((k) => { const a = k * (iw / 2 - 1.2), b = bz + 2.2; G("darkMetal", new T.CylinderGeometry(0.03, 0.03, 2.6, 5).translate(a, 1.3, b)); G("lampGlowB", new T.BoxGeometry(0.9, 0.6, 0.1).rotateY(-k * 0.7).translate(a, 2.6, b)); C.col(a, b, 0.5, 0.5); });
      G("seatsRed", new T.BoxGeometry(2.2, 0.45, 0.9).translate(0, 0.23, bz + 1.6)); C.seat(-0.5, bz + 1.6, 0, 0.47); C.seat(0.5, bz + 1.6, 0, 0.47);
      C.act(0, bz + id * 0.42, 2.8, "記念写真を撮る（" + name + "）", () => ({ photo: { name, studio: true } }), "📸");
    },
    room(C) {
      const { B, G, W, iw, id, hi, name } = C, bz = -id / 2;
      B("carpetRed", Math.min(iw - 3, 5), 0.02, Math.min(id - 3, 3.6), 0.4, 0.04, 0.2, true);
      [-1, 0].forEach((k) => { const a = -iw / 2 + 1.5 + (k + 1) * 2.5; if (a > iw / 2 - 1.5) return; B("woodDark", 1.6, 0.45, 2.2, a, 0.225, bz + 1.35, true); B("white2", 1.5, 0.18, 2.0, a, 0.54, bz + 1.4, true); B("propPink", 1.52, 0.06, 1.2, a, 0.64, bz + 1.85, true); B("white2", 0.55, 0.14, 0.35, a - 0.35, 0.7, bz + 0.6, true); B("white2", 0.55, 0.14, 0.35, a + 0.35, 0.7, bz + 0.6, true); B("woodDark", 1.7, 1.1, 0.1, a, 0.55, bz + 0.29, true); C.col(a, bz + 1.35, 1.6, 2.2); });
      B("woodDark", 0.5, 0.55, 0.45, -iw / 2 + 0.5, 0.275, bz + 0.5, true); G("lampGlow", new T.CylinderGeometry(0.12, 0.18, 0.28, 10).translate(-iw / 2 + 0.5, 0.75, bz + 0.5));
      if (iw > 7) { B("glassClear", 2.4, 1.5, 0.05, iw / 2 - 2.2, 1.7, bz + 0.25, true); B("fabricB", 0.5, 2.0, 0.08, iw / 2 - 3.65, 1.5, bz + 0.32, true); B("fabricB", 0.5, 2.0, 0.08, iw / 2 - 0.75, 1.5, bz + 0.32, true); }
      G("seatsBlue2", new T.BoxGeometry(0.8, 0.42, 2.0).translate(iw / 2 - 0.8, 0.21, 0.4)); G("seatsBlue2", new T.BoxGeometry(0.2, 0.5, 2.0).translate(iw / 2 - 0.3, 0.65, 0.4)); C.col(iw / 2 - 0.7, 0.4, 1.0, 2.0); C.seat(iw / 2 - 0.85, 0.4, -Math.PI / 2, 0.45);
      G("woodLight", new T.CylinderGeometry(0.45, 0.45, 0.05, 16).translate(iw / 2 - 2.0, 0.5, 0.4)); G("darkMetal", new T.CylinderGeometry(0.05, 0.05, 0.5, 6).translate(iw / 2 - 2.0, 0.25, 0.4)); G("propRed", new T.CylinderGeometry(0.06, 0.05, 0.12, 8).translate(iw / 2 - 2.0, 0.58, 0.4));
      B("pBlack", 1.4, 0.8, 0.06, -iw / 2 + 0.26, 1.6, 0.4, true); B("woodDark", 0.4, 0.5, 1.6, -iw / 2 + 0.4, 0.25, 0.4, true);
      G("stoneW", new T.CylinderGeometry(0.3, 0.24, 0.5, 10).translate(-iw / 2 + 0.6, 0.25, id / 2 - 0.9)); G("leafDark", new T.IcosahedronGeometry(0.5, 1).translate(-iw / 2 + 0.6, 1.0, id / 2 - 0.9));
      C.act(-iw / 2 + 2.3, bz + 3.1, 2.4, "ベッドで休む（" + name + "）", () => ({ rest: { name } }), "🛏️");
    }
  };
  P.PARK_FURN = FURN;
  P.innerCylGeo = innerCyl;
  /* 面の向きを反対にする（内がわから見える） */
  function flipGeo(g) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); return g; }

  P.INT_FURN = FURN;          /* ★ 2026-09-30 park_rooms.js が部屋の種類を足す */
  /* ══════════════ いまいる部屋・カメラを部屋の中にとどめる ══════════════ */
  P.interiorAt = function (x, z, y) {
    for (const q of this.interiors || []) {
      if (y != null && (y > (q.yMax != null ? q.yMax : (q.y0 || 0) + (q.dome ? Math.max(q.hi, q.R || 0) : q.hi) + 3) || y < (q.y0 || 0) - 3)) continue;          /* ★ 2026-09-30b 地下の部屋にいるとき、上の建物の部屋をまちがえて使っていた（カメラが外に出て箱だけに見えた） */          /* ★ 2026-09-30 上の展望フロア・ホームにいるときは下の部屋ではない */
      if (q.round) { if (Math.hypot(x - q.x, z - q.z) < q.r) return q; continue; }
      const dx = x - q.x, dz = z - q.z, a = dx * q.c - dz * q.s, b = dx * q.s + dz * q.c;
      if (Math.abs(a) < q.hw && Math.abs(b) < q.hd) return q;
    }
    return null;
  };
  /* T0（注視点）から C0（カメラ）への線が、壁・天井の手前で止まる割合（0..1） */
  P.camInside = function (q, T0, C0) {
    const dx = C0.x - T0.x, dy = C0.y - T0.y, dz = C0.z - T0.z, m = 0.22; let t = 1;
    const quad = (A, B2, Cc) => { if (A < 1e-8 || Cc > 0) return 1; return (-B2 + Math.sqrt(Math.max(0, B2 * B2 - 4 * A * Cc))) / (2 * A); };
    if (q.round) {
      const ox = T0.x - q.x, oz = T0.z - q.z;
      const ty = T0.y - (q.y0 || 0);
      if (q.dome) { const R = q.R - 0.7; t = Math.min(t, quad(dx * dx + dy * dy + dz * dz, 2 * (ox * dx + ty * dy + oz * dz), ox * ox + ty * ty + oz * oz - R * R)); }
      else { const R = q.r - m; t = Math.min(t, quad(dx * dx + dz * dz, 2 * (ox * dx + oz * dz), ox * ox + oz * oz - R * R)); if (dy > 1e-6) t = Math.min(t, (q.hi - m - ty) / dy); }
    } else {
      const ox = T0.x - q.x, oz = T0.z - q.z, ta = ox * q.c - oz * q.s, tb = ox * q.s + oz * q.c, da = dx * q.c - dz * q.s, db = dx * q.s + dz * q.c, ha = q.hw - m, hb = q.hd - m;
      if (da > 1e-6) t = Math.min(t, (ha - ta) / da); else if (da < -1e-6) t = Math.min(t, (-ha - ta) / da);
      if (db > 1e-6) t = Math.min(t, (hb - tb) / db); else if (db < -1e-6) t = Math.min(t, (-hb - tb) / db);
      if (dy > 1e-6) t = Math.min(t, (q.hi + (q.y0 || 0) - m - T0.y) / dy);
    }
    return Math.max(0, Math.min(1, t));
  };
  /* ドームの形：上の丸屋根（cap）と、入口をあけた下の帯（band）。SphereGeometry は atan2(z,x) = π − φ */
  function domeGeos(r, doorA, doorW, doorH, seg) {
    const gap = Math.asin(Math.min(0.9, doorW / 2 / r)), thd = Math.acos(Math.min(0.98, doorH / r)), ph0 = Math.PI - doorA + gap;
    const cap = new T.SphereGeometry(r, seg, Math.max(6, Math.round(seg / 2 * thd / (Math.PI / 2))), 0, TAU, 0, thd);
    const band = new T.SphereGeometry(r, seg, 3, ph0, TAU - gap * 2, thd, Math.PI / 2 - thd);
    return { cap, band, gap };
  }
  P.domeGeos = domeGeos;


  /* ══════════════ 入口のあるドーム（プラネタリウム・クイズドーム）：ドームの形は同じで、入口の所だけ開ける ══════════════ */
  P.domeHall = function (x, z, r, key, doorA, o) {
    const W = this, hi = o.hi || 4, dW = 5.2, D = domeGeos(r, doorA, dW, hi, 40), gap = D.gap;
    W.geo(key, D.cap, x, 0, z); W.geo(key, D.band, x, 0, z);
    /* 骨組み（入口の所は下を切る）・中ほどの輪 */
    { const off = (((10 * (Math.PI - doorA - Math.PI / 20) / Math.PI) % 1) + 1) % 1;     /* 骨の足が入口にかからない（入口は2本の骨のあいだ） */
      for (let i = 0; i < 10; i++) { const t = new T.TorusGeometry(r * 1.004, Math.max(0.1, r * 0.01), 4, 36, Math.PI); t.rotateY((i + off) / 10 * Math.PI); W.geo("white2", t, x, 0, z); } }
    const ring = new T.TorusGeometry(r * 0.7, Math.max(0.1, r * 0.01), 4, 48); ring.rotateX(Math.PI / 2); W.geo("white2", ring, x, r * 0.71, z);
    /* 入口：柱2本・まぐさ・ひさし（外へ 2.4m） */
    const ux = Math.cos(doorA), uz = Math.sin(doorA), vx = -uz, vz = ux, hw = dW / 2 + 0.3, ex = x + ux * (r * Math.cos(gap) + 0.2), ez = z + uz * (r * Math.cos(gap) + 0.2);
    [-1, 1].forEach((k) => { const px = ex + vx * k * hw, pz = ez + vz * k * hw; W.geo("white2", new T.BoxGeometry(0.5, hi + 0.3, 0.5).rotateY(Math.PI / 2 - doorA), px, (hi + 0.3) / 2, pz); W.colCircle(px, pz, 0.35); const qx = px + ux * 2.4, qz = pz + uz * 2.4; W.geo("white2", new T.CylinderGeometry(0.16, 0.16, hi + 0.3, 10), qx, (hi + 0.3) / 2, qz); W.colCircle(qx, qz, 0.2); });
    W.geo("white2", new T.BoxGeometry(dW + 1.6, 0.35, 3.4).rotateY(Math.PI / 2 - doorA), ex + ux * 1.2, hi + 0.45, ez + uz * 1.2);
    W.geo("neonCyan", new T.BoxGeometry(dW + 1.2, 0.08, 0.06).rotateY(Math.PI / 2 - doorA), ex + ux * 2.9, hi + 0.32, ez + uz * 2.9);
    W.casterCircle(x, z, r * 0.9, r * 0.8);
    W.roundInterior(x, z, r, hi, doorA, Object.assign({ dome: true, R: r, gap: gap * 0.92, doorH: hi, glassDome: key === "glassDomeP" || key === "glassDome", light: o.type === "planet" ? "planet" : "shop", floor: o.type === "planet" ? "carpetNavy" : "marble", inner: o.type === "planet" ? "pNavy" : "creamW" }, o));
  };

  /* ══════════════ 丸い建物の中（大提灯の食堂・プラネタリウム・クイズドーム） ══════════════
     x,z 中心・r 半径・hi 天井・doorA 入口の向き（ラジアン：atan2(z, x)）・o.type "diner"|"planet"|"quiz" */
  P.roundInterior = function (x, z, r, hi, doorA, o) {
    o = o || {};
    const W = this, gap = o.gap || 0.34, inn = o.inner || "creamW", name = o.name || "館内";
    { const g = new T.CircleGeometry(r - 0.3, 48); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4); W.geo(o.floor || "wood", g, x, 0.03, z); }
    /* 内がわの壁（入口はあける）：CylinderGeometry の角度は +z から時計まわり（x = sin θ） → atan2(z, x) の角 a に対する θ = π/2 − a */
    const th0 = Math.PI / 2 - doorA + gap, thl = TAU - gap * 2;
    if (o.dome) {
      /* ドームの内がわ：下の帯（入口あり）は壁の色、上の丸天井は壁の色（ガラスのドームは外が見える） */
      if (!o.glassDome) { const D = domeGeos(r - 0.3, doorA, 5.2, o.doorH || 4, 40); W.detail(() => { W.geo(inn, flipGeo(D.band), x, 0, z); W.geo(o.ceil || inn, flipGeo(D.cap), x, 0, z); }); }
    } else {
      W.detail(() => W.geo(inn, innerCyl(r - 0.35, hi, 48, th0, thl).translate(0, hi / 2, 0), x, 0, z));
      const ceil = new T.CircleGeometry(r - 0.3, 48); ceil.rotateX(Math.PI / 2); W.detail(() => W.geo(o.ceil || "white2", ceil, x, hi, z));
    }
    W.colRing(x, z, r - 0.5, r + 0.3, [[doorA - gap * 0.85, doorA + gap * 0.85]]);
    const zr = o.dome ? r * 0.92 : r * 0.72; W.zone(name, x - zr, z - zr, x + zr, z + zr, o.light || "shop");
    (W.interiors = W.interiors || []).push({ x, z, r: r - 0.5, hi, name, round: true, dome: !!o.dome, R: o.R || r, type: o.type || null });
    (W.doors = W.doors || []).push([x + Math.cos(doorA) * (r + 1.6), z + Math.sin(doorA) * (r + 1.6)]);
    (W.noGrass = W.noGrass || []).push([x - r - 1, z - r - 1, x + r + 1, z + r + 1]);
    const L = (a, d) => [x + Math.cos(a) * d, z + Math.sin(a) * d], back = doorA + Math.PI;
    if (o.type === "diner") {
      W.detail(() => {
        W.geo("woodDark", new T.CylinderGeometry(2.2, 2.2, 1.0, 24).translate(0, 0.5, 0), x, 0, z); W.geo("pBlack", new T.CylinderGeometry(2.3, 2.3, 0.06, 24).translate(0, 1.03, 0), x, 0, z); W.colCircle(x, z, 2.3);
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const [px, pz] = L(a, 3.0); W.geo("seatsRed", new T.CylinderGeometry(0.21, 0.21, 0.08, 10), px, 0.72, pz); W.seats.push({ x: px, z: pz, yaw: Math.atan2(x - px, z - pz), h: 0.74 }); }
        for (let k = 0; k < 6; k++) { const a = back + (k - 2.5) * 0.5; if (Math.abs(Math.atan2(Math.sin(a - doorA), Math.cos(a - doorA))) < 0.6) continue; const [px, pz] = L(a, r - 2.2); W.geo("white2", new T.CylinderGeometry(0.5, 0.5, 0.05, 14), px, 0.74, pz); W.geo("darkMetal", new T.CylinderGeometry(0.05, 0.08, 0.74, 6), px, 0.37, pz); W.colCircle(px, pz, 0.5); W.seats.push({ x: px + Math.cos(a + 1.57) * 0.85, z: pz + Math.sin(a + 1.57) * 0.85, yaw: Math.atan2(-Math.cos(a + 1.57), -Math.sin(a + 1.57)), h: 0.47 }); }
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, [px, pz] = L(a, r * 0.55); W.lantern(px, hi - 1.5, pz, 0.55, ["lanR", "lanY", "lanW"][k % 3]); }
      });
      const items = MENU.diner; W.interact(...L(doorA, 3.4), 2.4, "注文する（" + name + "）", () => ({ shop: { kind: "food", name, items } }), "🍽️");
    } else if (o.type === "planet") {
      const c = X.cv(1024, 512), g = c.getContext("2d"), rr = X.rnd(9); g.fillStyle = "#02030a"; g.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 2400; i++) { const v = rr(); g.fillStyle = "rgba(" + (200 + rr() * 55 | 0) + "," + (210 + rr() * 45 | 0) + ",255," + (0.4 + v * 0.6) + ")"; const s2 = v > 0.985 ? 2.4 : v > 0.9 ? 1.4 : 0.8; g.fillRect(rr() * 1024, rr() * 512, s2, s2); }
      g.strokeStyle = "rgba(120,180,255,.5)"; g.lineWidth = 1.5; for (let k = 0; k < 6; k++) { g.beginPath(); let px = 100 + k * 150, py = 100 + (k % 3) * 90; g.moveTo(px, py); for (let q = 0; q < 5; q++) { px += 20 + rr() * 30; py += (rr() - 0.5) * 60; g.lineTo(px, py); } g.stroke(); }
      const skyG = o.dome ? domeGeos(r - 0.55, doorA, 5.2, (o.doorH || 4) - 0.05, 48).cap : new T.SphereGeometry(r - 0.8, 48, 24, 0, TAU, 0, Math.PI / 2);
      { const uv = skyG.attributes.uv, pp = skyG.attributes.position; for (let i = 0; i < uv.count; i++) { const px = pp.getX(i), py = pp.getY(i), pz = pp.getZ(i); uv.setXY(i, (Math.atan2(pz, px) + Math.PI) / TAU, 1 - Math.acos(Math.max(-1, Math.min(1, py / (r - 0.55)))) / (Math.PI / 2)); } }
      const sky = new T.Mesh(skyG, new T.MeshBasicMaterial({ map: X.tex(c), side: T.BackSide, toneMapped: false, fog: false }));
      sky.position.set(x, o.dome ? 0 : 1.2, z); W.scene.add(sky); W.loose(sky, 120); W.planetSky = W.planetSky || []; W.planetSky.push(sky);
      W.anim.push((dt) => { sky.rotation.y += dt * (W.planetBoost ? 0.25 : 0.01); });
      W.detail(() => { for (let ring = 0; ring < 3; ring++) for (let k = 0; k < 10 + ring * 4; k++) { const a = k / (10 + ring * 4) * TAU; if (Math.abs(Math.atan2(Math.sin(a - doorA), Math.cos(a - doorA))) < 0.45) continue; const d = 4 + ring * 3.2, [px, pz] = L(a, d), yaw = Math.atan2(x - px, z - pz);
          W.geo("seatsBlue2", XWorld.mergeGeos([new T.BoxGeometry(0.62, 0.12, 0.56).translate(0, 0.46, 0), new T.BoxGeometry(0.62, 0.86, 0.1).translate(0, 0.43, 0).rotateX(-0.62).translate(0, 0.5, -0.27)]).rotateY(yaw), px, 0, pz); W.geo("darkMetal", new T.CylinderGeometry(0.09, 0.16, 0.42, 8), px, 0.21, pz); W.seats.push({ x: px, z: pz, yaw, h: 0.52 }); } W.geo("pBlack", new T.CylinderGeometry(0.5, 0.8, 1.6, 12).translate(0, 0.8, 0), x, 0, z); W.geo("chromeB", new T.SphereGeometry(0.55, 12, 10).translate(0, 1.9, 0), x, 0, z); W.colCircle(x, z, 0.9); });
      W.interact(...L(doorA, r - 3.5), 3, "星空の上映を見る（" + name + "）", () => ({ planet: { name } }), "🌌");
    } else if (o.type === "quiz") {
      W.detail(() => { for (let k = 0; k < 5; k++) { const a = back + (k - 2) * 0.35, [px, pz] = L(a, r * 0.45); W.geo("pNavy", new T.BoxGeometry(1.0, 1.0, 0.8).rotateY(Math.PI / 2 - a), px, 0.5, pz); W.geo(["neonRed", "neonBlue", "neonYellow", "neonGreen", "neonPink"][k], new T.CylinderGeometry(0.2, 0.2, 0.1, 12), px, 1.05, pz); W.colCircle(px, pz, 0.7); } });
      const [sx, sz] = L(back, r - 1.2); W.bigScreen(sx, 4.2, sz, Math.atan2(x - sx, z - sz), Math.min(r, 10), Math.min(r, 10) * 0.5, "QUIZ DOME", ["E でクイズに挑戦", "5問・全問正解でスタンプ"], ["#2a1a6a", "#6a2a8a"]);
      W.interact(...L(doorA, r - 3.2), 3, "クイズに挑戦（" + name + "）", () => ({ game: "quiz" }), "❓");
    }
  };
})();

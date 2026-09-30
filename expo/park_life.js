/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 街の「生きている」感じ（★★ 2026-09-30 ご指定）
   ・動く目：建物・屋台・乗り物・街灯の大きな目が、見ている人（カメラ）の方を向き、ときどきまばたき（「該当や建物の目なども動くように」）
   ・会話：エリアごとに来場者どうしが吹き出しで話す（「エリアごとにそれぞれ人が吹き出しで会話するように」）… main.js が使う台本
   ・掲示板：パレード・ショーの時間とエリアの見どころ・島の地図（「パレードやイベントや場所ごとの開催内容を見たり地図が書かれている掲示板」）
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2, XP = XPark;

  /* ══════════════ 動く目 ══════════════ */
  const _eyes = P.eyes;
  P.eyes = function (x, z, y, ry, r, gap, iris, look) {
    if (this._capturing || !(this.building || this._eyesLate)) return _eyes.apply(this, arguments);
    const W = this, c = Math.cos(ry), s = Math.sin(ry);
    [-1, 1].forEach((k) => {
      const ex = x + c * k * gap / 2, ez = z - s * k * gap / 2;
      W.geo("eyeW", new T.SphereGeometry(r, 18, 12, 0, TAU, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1.12, 0.45), ex, y, ez, ry);
      (W.eyeList = W.eyeList || []).push({ x: ex, y, z: ez, ry, r, iris: iris || "irisA", ph: ((ex * 7.13 + ez * 3.71) % 10 + 10) % 10, k });
    });
  };
  P.buildEyes = function () {
    const w = this, L = w.eyeList || []; if (!L.length) return;
    const n = L.length, gI = new T.CircleGeometry(1, 20), gP = new T.CircleGeometry(1, 14), gH = new T.CircleGeometry(1, 10);
    const mI = new T.MeshLambertMaterial({ color: 0xffffff }), mP = new T.MeshBasicMaterial({ color: 0x0a0a12 }), mH = new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    [mI, mP, mH].forEach((m, i) => { m.polygonOffset = true; m.polygonOffsetFactor = -1 - i; m.polygonOffsetUnits = -2 - i * 2; });
    const I = new T.InstancedMesh(gI, mI, n), Pp = new T.InstancedMesh(gP, mP, n), H = new T.InstancedMesh(gH, mH, n), col = new T.Color();
    L.forEach((e, i) => { const m = w.m[e.iris]; col.copy(m && m.color ? m.color : new T.Color(0x3a8aff)); I.setColorAt(i, col); });
    [I, Pp, H].forEach((m) => { m.frustumCulled = false; w.scene.add(m); });
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), sc = new T.Vector3(), off = new T.Vector3();
    const place = (mesh, i, E, lx, ly, zf, s, sy) => { e.set(0, E.ry, 0); q.setFromEuler(e); off.set(lx, ly, zf).applyQuaternion(q); v.set(E.x + off.x, E.y + off.y, E.z + off.z); sc.set(s, s * sy, 1); m4.compose(v, q, sc); mesh.setMatrixAt(i, m4); };
    const upd = (i, E, cx, cy, cz, t) => {
      const dx = cx - E.x, dy = cy - E.y, dz = cz - E.z, cs = Math.cos(-E.ry), sn = Math.sin(-E.ry), lxw = dx * cs + dz * sn, lzw = -dx * sn + dz * cs, dist = Math.hypot(dx, dy, dz) || 1;
      const k = lzw > 0 ? 1 : 0.25, r = E.r, lx = Math.max(-0.26, Math.min(0.26, lxw / dist * 0.42)) * r * k, ly = Math.max(-0.22, Math.min(0.2, dy / dist * 0.42)) * r * k - 0.06 * r;
      const bt = (t + E.ph) % 4.6, blink = bt < 0.14 ? 0.1 : 1, zf = r * 0.45;
      place(I, i, E, lx, ly, zf + 0.012, r * 0.56, blink); place(Pp, i, E, lx * 1.15, ly * 1.05, zf + 0.024, r * 0.27, blink); place(H, i, E, lx - r * 0.16, ly + r * 0.19, zf + 0.036, r * 0.1, blink);
    };
    L.forEach((E, i) => upd(i, E, E.x + Math.sin(E.ry) * 20, E.y, E.z + Math.cos(E.ry) * 20, 0));
    [I, Pp, H].forEach((m) => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    /* 近くの目だけ毎フレーム動かす（見ている人の方を向く・まばたき） */
    const G = new Map(), GS = 60; L.forEach((E, i) => { const key = Math.floor(E.x / GS) * 4096 + Math.floor(E.z / GS); let a = G.get(key); if (!a) G.set(key, a = []); a.push(i); });
    w.anim.push((dt, t) => {
      const cam = w._cam; if (!cam) return; const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z; let ch = false;
      const gx = Math.floor(cx / GS), gz = Math.floor(cz / GS);
      for (let ix = gx - 2; ix <= gx + 2; ix++) for (let iz = gz - 2; iz <= gz + 2; iz++) { const a = G.get(ix * 4096 + iz); if (!a) continue; for (const i of a) { upd(i, L[i], cx, cy, cz, t); ch = true; } }
      if (ch) { I.instanceMatrix.needsUpdate = true; Pp.instanceMatrix.needsUpdate = true; H.instanceMatrix.needsUpdate = true; }
    });
    w._eyeCount = n;
  };
  /* 街灯の顔（ちょうちんおばけ風の小さな目つき提灯）：道の方を向く */
  P.lampFace = function (x, z, fry) {
    const w = this, sx = Math.sin(fry), sz = Math.cos(fry), lx = x + sx * 0.46, lz = z + sz * 0.46;
    w.detail(() => { w.box("tealMetal" in w.m ? "tealMetal" : "darkMetal", x + sx * 0.23, 4.3, z + sz * 0.23, 0.05, 0.05, 0.5, { ry: fry }); w.box("tealMetal" in w.m ? "tealMetal" : "darkMetal", lx, 4.1, lz, 0.03, 0.22, 0.03); w.lantern(lx, 3.5, lz, 0.62, "lanR", fry); });
    w.eyes(lx + sx * 0.25, lz + sz * 0.25, 3.84, fry, 0.07, 0.19, "irisC");
  };

  /* ══════════════ 会話の台本（エリアごと・オリジナル） ══════════════ */
  const CHAT = {
    _: [["次どこ行く？", "マップ見てみよう！"], ["パレードって何時から？", "掲示板に書いてあったよ"], ["おなかすいたね", "屋台の通りに行こう！"], ["今日はいい天気！", "空から見てみたいな"], ["あの建物、目がこっち見てない？", "え、ほんとだ…動いてる！"]],
    gate: [["チケット、無料なんだって！", "じゃあ全部のエリアまわろう"], ["大門の上のマーク、光ってるね", "夜はもっときれいだって"], ["ゲートの曲、ワクワクする", "はやく中に入ろう！"]],
    marketW: [["たこ焼きおいしい〜", "次はたい焼きね！"], ["このお店、目があるよ", "妖怪のお店なんだって"]], marketE: [["おみやげ何にしよう", "光るペンライトかな"], ["路面電車が来たよ", "乗ってみようか"]],
    green: [["芝生でひと休み", "パレードもここを通るよ"]], fountain: [["噴水ショーは夜なんだって", "じゃあ夜まで遊ぼう"], ["パレードスタジオから山車が出てくるらしい", "見に行こう！"]],
    metro: [["ビルが高すぎて首が痛い", "タワーの展望台に行こう"], ["ピープルムーバー速いね", "ビルの間を飛んでるみたい"]],
    tower: [["125m の展望台、こわくない？", "ガラスのエレベーターが楽しいよ"]],
    lab: [["ロボットの像、動きそう", "研究室で実験できるよ"]], space: [["ロケット、本当に飛ぶのかな", "コズミックコースター乗った？"]],
    adv: [["マウンテンコースター最高！", "もう一回乗ろう"], ["ジャングルフリューム、ぬれた〜", "すぐかわくよ"]],
    ent: [["劇場で何やってるかな", "ポスター見に行こう"]], game: [["ゲームセンター行こう！", "ガチャもやりたい"]],
    learn: [["図書館、静かでいいね", "クイズドームも行ってみよう"]], sports: [["聖火台かっこいい！", "トラックを一周走りたい"], ["スポーツホールでバスケしよう", "負けないよ！"]],
    boccia: [["ボッチャって楽しい？", "作戦が大事なんだよ"]], soccer: [["3対3のサッカーやろう", "キーパーは私ね"]],
    motor: [["カートレース出た？", "アイテムで逆転したよ！"], ["サーキットの坂、すごいね", "ジャンプ台もあるよ"]],
    harbor: [["湖の船、乗ってみたい", "夜は水上パレードだって"]], dome: [["ドームのライブ、すごい音！", "ペンライト振ろう"]],
    kabuki: [["看板のネコ、目が光ってる", "夜の歌舞伎町、きれい"]], yukaku: [["夜桜がきれい", "茶屋でお団子食べよう"], ["大きなお城のホテル、何があるの？", "作品を探せるギャラリーだって"]],
    ngx: [["NGX タワー、390m もあるんだって", "展望フロアに行ってみたい"], ["本社の中、見学できるらしい", "エレベーターで各階に行けるよ"]],
    ngxcity: [["モールで新しいゲーム買う？", "ガチャの森にも行こう"], ["ガラスの屋根、明るいね", "雨でも遊べるね"]],
    apps: [["アプリの建物、全部ちがうね", "入るとアプリが開くよ"]], yokai: [["駄菓子屋さん、なつかしい", "ラムネ買おう"], ["銭湯があるよ", "あとで入ろう"]],
    heights: [["ねこ耳のビル、かわいい", "目のビルもあるよ"]], shrine: [["おみくじ大吉だった！", "いいなー、私も引く"], ["千本鳥居、きれい", "写真とろう"]],
    ballpark: [["ホームラン打てるかな", "MagiDiamond で試合しよう"]], resort: [["プールサイド、気持ちいい", "スパも行こう"]],
    night: [["お化け屋敷、こわかった…", "もう一回行く？"]], puzzle: [["迷路、出られない〜", "こっちだよ！"]], media: [["撮影スタジオでアイドル気分", "写真とって！"]],
    aqua: [["流れるプール楽しい", "スライダーも行こう"]], beach: [["海、きれい！", "砂のお城つくろう"]],
    wonder: [["メリーゴーラウンドの生きもの、目が動いた", "え、こわ…でもかわいい"], ["妖怪船、めっちゃゆれる！", "もう一回乗ろう！"], ["ドラゴンコースター、家族で乗れるね", "頭がドラゴンだよ"]],
    onsen: [["足湯あったかい〜", "大浴場にも行こう"], ["湯けむりがいいね", "旅館に泊まりたいな"]], sky: [["空中庭園、64m だって", "ガラスのエレベーターで行こう"]]
  };
  function chatPick(areaId, seed) { const a = (CHAT[areaId] || []).concat(CHAT._); return a[Math.abs(seed | 0) % a.length]; }

  /* ══════════════ 掲示板（パレード・ショーの時間・エリアの見どころ・地図） ══════════════ */
  let boardTex = null;
  function drawBoard(w) {
    const c = X.cv(1024, 768), g = c.getContext("2d");
    g.fillStyle = "#f7f0dc"; g.fillRect(0, 0, 1024, 768); g.fillStyle = "#1a1030"; g.fillRect(0, 0, 1024, 86);
    g.fillStyle = "#ffd86a"; g.font = "900 46px 'M PLUS Rounded 1c',sans-serif"; g.textAlign = "left"; g.fillText("XEVARION PARK 掲示板", 28, 60);
    g.fillStyle = "#fff"; g.font = "800 24px sans-serif"; g.textAlign = "right"; g.fillText("今日のイベント・島の地図", 996, 58); g.textAlign = "left";
    /* 地図（左） */
    const mx = 24, my = 108, mw = 500, mh = 630, x0 = -900, z0 = -700, S = Math.min(mw / 1800, mh / 1760);
    g.fillStyle = "#9ad0f0"; g.fillRect(mx, my, mw, mh);
    g.fillStyle = "#8ac070"; g.beginPath(); for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU, [px, pz] = XP.islandPt(a, 1); const X2 = mx + (px - x0) * S, Y2 = my + (pz - z0) * S; if (i) g.lineTo(X2, Y2); else g.moveTo(X2, Y2); } g.fill();
    g.strokeStyle = "rgba(240,200,120,.95)"; g.lineCap = "round"; (w.walkPaths || []).forEach((p) => { if (p.w < 6) return; g.lineWidth = Math.max(1.2, p.w * S); g.beginPath(); p.pts.forEach(([x, z], i) => { const X2 = mx + (x - x0) * S, Y2 = my + (z - z0) * S; if (i) g.lineTo(X2, Y2); else g.moveTo(X2, Y2); }); g.stroke(); });
    XP.AREAS.forEach((a) => { if (a.id === "marketE") return; const X2 = mx + (a.x0 - x0) * S, Y2 = my + (a.z0 - z0) * S, W2 = (a.x1 - a.x0) * S, H2 = (a.z1 - a.z0) * S; g.fillStyle = a.c + "66"; g.fillRect(X2, Y2, W2, H2); g.strokeStyle = a.c; g.lineWidth = 1.5; g.strokeRect(X2, Y2, W2, H2); g.fillStyle = "#1a1030"; g.font = "900 13px sans-serif"; g.textAlign = "center"; g.fillText(String(a.n), X2 + W2 / 2, Y2 + H2 / 2 + 4); });
    g.textAlign = "left"; g.fillStyle = "#1a1030"; g.font = "800 16px sans-serif"; g.fillText("数字＝エリアの番号（地図は M キー）", mx + 8, my + mh - 10);
    /* 予定（右） */
    const EV = [["🎉", "デイタイムパレード", "昼（約10分ごと）", "パレードスタジオ → 大通り → ゲート前で折り返し → 中央噴水公園（約1.6km）"],
      ["✨", "XEVARION NIGHT", "夜（くりかえし）", "中央噴水公園：水と光と花火のショー"],
      ["🚢", "CHASE THE LIGHT", "夜（約10分ごと）", "XEVARION HARBOR の湖：光の船の水上パレード"],
      ["🎤", "ドームのライブ", "いつでも（デモ）", "XEVARION DOME：大画面と光の演出"],
      ["🌟", "新キャラクター発表", "いつでも", "XEVARION HALL 基調講演ホール"],
      ["🎠", "妖怪ワンダーランド", "いつでも", "メリーゴーラウンド・カップ・スイング・妖怪船・コースター"],
      ["🏁", "カートレース", "いつでも", "モーターシティ：アイテム・ドリフト・ジャンプ台"],
      ["🌆", "展望フロア", "いつでも", "NGX タワー 310m・XEVARION TOWER 125m・SKY GARDEN 64m"]];
    let y = 128; g.fillStyle = "#1a1030"; g.font = "900 30px sans-serif"; g.fillText("今日のイベント", 548, y); y += 18;
    EV.forEach(([ic, nm, when, where]) => { y += 14; g.fillStyle = "#fff"; g.fillRect(546, y, 454, 64); g.strokeStyle = "#d8c8a0"; g.strokeRect(546, y, 454, 64); g.font = "30px sans-serif"; g.fillText(ic, 556, y + 42); g.fillStyle = "#1a1030"; g.font = "900 22px sans-serif"; g.fillText(nm, 600, y + 27); g.fillStyle = "#c8402a"; g.font = "800 17px sans-serif"; g.fillText(when, 600 + g.measureText(nm).width * 0 + 250, y + 27); g.fillStyle = "#4a4a5a"; g.font = "700 15px sans-serif"; g.fillText(where.slice(0, 34), 600, y + 52); y += 64; });
    const tex = X.tex(c); tex.anisotropy = 4; return tex;
  }
  P.buildBoards = function () {
    const w = this; if (!boardTex) boardTex = drawBoard(w);
    if (!w.m.boardFace) { w.m.boardFace = new T.MeshLambertMaterial({ map: boardTex }); w.nightMats.push({ m: w.m.boardFace, base: new T.Color(1, 1, 1), day: 1, night: 1.4 }); }
    const I = w.spotIndex(), spots = [];
    (w.gates || []).forEach((g) => {
      const a = XP.AREAS.find((q) => q.id === g.id); if (!a) return;
      const cx = (a.x0 + a.x1) / 2, cz = (a.z0 + a.z1) / 2, nx = Math.sin(g.ry), nz = Math.cos(g.ry), inw = (cx - g.x) * nx + (cz - g.z) * nz > 0 ? 1 : -1;
      for (const side of [1, -1]) for (const dd of [10, 14, 7]) {
        const tx = g.x + nx * inw * dd + Math.cos(g.ry) * side * (g.span / 2 + 3.5), tz = g.z + nz * inw * dd - Math.sin(g.ry) * side * (g.span / 2 + 3.5);
        if (I.bld(tx, tz, 1.5) || I.col(tx, tz, 1.4) || I.water(tx, tz) || I.road(tx, tz, 0.4)) continue;
        spots.push([tx, tz, Math.atan2(-nx * inw, -nz * inw) + Math.PI, a]); return;
      }
    });
    [[26, 420, 0], [-26, 850, Math.PI], [96, 300, -Math.PI / 2], [-58, 176, Math.PI]].forEach(([x, z, ry]) => { const a = XP.AREAS.find((q) => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1); if (!I.bld(x, z, 1.5) && !I.col(x, z, 1.2)) spots.push([x, z, ry, a || XP.AREAS[0]]); });
    spots.forEach(([x, z, ry, a]) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      w.detail(() => {
        [-1, 1].forEach((k) => w.box("woodRed", x + c * k * 1.55, 0, z - s * k * 1.55, 0.2, 3.1, 0.2, { ry }));
        w.box("woodDark2", x, 0.95, z, 3.3, 2.15, 0.12, { ry }); w.box("gold", x, 3.08, z, 3.5, 0.08, 0.3, { ry });
        w.geo("kwB" in w.m ? "kwB" : "woodDark2", new T.ConeGeometry(2.3, 0.7, 4).rotateY(Math.PI / 4).scale(1, 1, 0.3), x, 3.45, z, ry);
      });
      const face = new T.Mesh(new T.PlaneGeometry(3.1, 2.0), w.m.boardFace); face.position.set(x + s * 0.07, 2.02, z + c * 0.07); face.rotation.y = ry; w.scene.add(face); w.loose(face, 160);
      w.sign((a ? a.n + "  " + a.name : "XEVARION PARK"), { bg: a && a.c ? a.c : "#1a3a8a", color: "#fff", px: 512 }, 3.2, 0.36, x + s * 0.08, 3.3 - 0.33, z + c * 0.08, ry, { detail: true });
      w.colObb(x, z, 3.4, 0.4, ry);
      w.interact(x + s * 1.6, z + c * 1.6, 2.4, "掲示板を見る（パレード・ショーの時間・地図）", () => ({ board: a ? a.id : "_" }), "📋");
    });
    w._boards = spots.length;
  };
  function boardUI(areaId) {
    const a = XP.AREAS.find((q) => q.id === areaId), U = window.XParkUI; if (!U) return;
    const b = U.panel("📋", "掲示板" + (a ? " — " + a.n + " " + a.name : ""), "board");
    const nowDay = window.XFX && XFX.mode === "day";
    const PS = window.XShows ? XShows : {}, par = PS.PARADE, ns = PS.NIGHT, hb = window.XHarbor;
    const st = (sh, dayOnly) => !sh ? "" : sh.on ? "<b style='color:#e0402a'>● いま開催中！</b>" : dayOnly != null && (dayOnly ? !nowDay : nowDay) ? "（" + (dayOnly ? "昼" : "夜") + "に開催）" : sh.next != null ? "あと約 " + Math.max(1, Math.round(sh.next / 60)) + " 分" : sh.cool != null ? "あと約 " + Math.max(1, Math.round(sh.cool / 60)) + " 分" : "";
    b.innerHTML = '<p class="pnote">今日のイベントと、このエリアの見どころ。地図は下のボタン（M キー）で開けます。</p>' +
      '<div class="pupd rel"><em>今日のイベント</em>' +
      "<b>🎉 デイタイムパレード</b><small>" + st(par, true) + "　パレードスタジオ（噴水公園の西）から出発 → 大通り → ゲート前で折り返し → 中央噴水公園。最後の山車は「提供 NGX」。</small>" +
      "<b>✨ XEVARION NIGHT</b><small>" + st(ns, false) + "　中央噴水公園：水・光・花火のショー。</small>" +
      "<b>🚢 CHASE THE LIGHT</b><small>" + st(hb, false) + "　XEVARION HARBOR の湖：光の船の水上パレード（最後の船は「提供 NGX」）。</small>" +
      "<b>🎤 ドームのライブ・🌟 新キャラ発表</b><small>XEVARION DOME の大画面／XEVARION HALL の基調講演ホール。</small>" +
      "<b>🎠 乗り物</b><small>妖怪ワンダーランド・アドベンチャー・スペースポートのコースター、観覧車、フリーフォールほか。</small></div>" +
      (a ? '<div class="pupd"><em>このエリア</em><b>' + a.n + " " + a.name + "</b><small>" + ((U.AHI && U.AHI[a.id === "marketE" ? "marketW" : a.id]) || "") + "</small></div>" : "");
    U.btns(b, [["🗺️ 地図を開く", () => { U.close(); setTimeout(() => U.map && U.map(), 50); }], ["閉じる", () => U.close()]]);
  }

  window.XLife = { CHAT, chatPick, boardUI };
})();

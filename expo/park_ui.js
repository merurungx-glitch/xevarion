/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 建物の中でできること（画面）・思い出バッグとスタンプラリー・見やすい地図・上空の場所の札
   （★★ 2026-09-29 ご指定「それぞれのエリアや建物でそれぞれの機能を持たせ、入れるように内部も作成」「上空から場所にとべる地図が見づらい」）
   ------------------------------------------------------------------
   ・park_interiors.js の「できること」（E ボタン）が返す結果を受けて画面を開く。
       shop 注文・買い物 / arcade ミニゲーム4種 / capsule カプセルトイ / gallery 展示 / lobby 案内・占い /
       learn MagiLex・XEVYNAR・ミニクイズ / lab 実験ショー / karaoke 曲に合わせて歌う / rest 休む（時間を変える）/
       haunted お化け屋敷のゴール / photo 記念写真 / planet 星空の上映 / game: quiz・escape・shoot
   ・買ったもの・スタンプ・記録は xeva_park_v1（この端末）。XEVA・ジェムは使わない（思い出として記録するだけ）。
   ・地図：番号つきの丸と大きな文字。押して「ここへワープ」。上空から見ているときは、画面の上に場所の札が出て、押すとそこへ。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
  const KEY = "xeva_park_v1";
  let C = null;                                   /* main.js から受け取る道具 */
  const SV = (() => { let v = null; try { v = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {} v = v && typeof v === "object" ? v : {}; if (!Array.isArray(v.bag)) v.bag = []; ["st", "ar", "hi", "cap"].forEach((k) => { if (!v[k] || typeof v[k] !== "object") v[k] = {}; }); return v; })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch (e) {} }
  const toast = (t) => C && C.toast(t);

  /* ══════════════ スタンプ・バッグ ══════════════ */
  const STAMPS = [["food", "🍜", "食堂"], ["cafe", "☕", "カフェ"], ["shop", "🛍️", "お店"], ["arcade", "🕹️", "ゲームセンター"], ["gacha", "🎰", "カプセルトイ"], ["gallery", "🖼️", "博物館・美術館"],
    ["showroom", "🚗", "ショールーム"], ["theater", "🎬", "劇場・映画館"], ["lobby", "🛎️", "ロビー・案内"], ["classroom", "📚", "教室"], ["library", "📖", "図書館"], ["lab", "🧪", "実験室"],
    ["karaoke", "🎤", "カラオケ"], ["gym", "🏀", "体育館"], ["spa", "♨️", "スパ"], ["haunted", "👻", "お化け屋敷"], ["escape", "🗝️", "脱出ゲーム"], ["studio", "📸", "撮影スタジオ"],
    ["room", "🛏️", "ホテルの部屋"], ["planet", "🌌", "プラネタリウム"], ["quiz", "❓", "クイズドーム"], ["fortune", "🔮", "占いの館"]];
  const ST_ALIAS = { diner: "food" };
  function stamp(type) {
    type = ST_ALIAS[type] || type;
    const s = STAMPS.find((q) => q[0] === type); if (!s || SV.st[type]) return;
    SV.st[type] = Date.now(); save();
    const n = Object.keys(SV.st).filter((k) => STAMPS.some((q) => q[0] === k)).length;
    pop(s[1], s[2] + " のスタンプ GET！", n + " / " + STAMPS.length + (n === STAMPS.length ? "　🎉 コンプリート！" : "　🎒 で見られます"));
  }
  function addBag(it) { SV.bag.unshift(Object.assign({ t: Date.now() }, it)); if (SV.bag.length > 400) SV.bag.length = 400; save(); }
  function hiscore(k, v, lower) { const o = SV.hi[k]; if (o == null || (lower ? v < o : v > o)) { SV.hi[k] = v; save(); return true; } return false; }
  let popT = 0;
  function pop(icon, title, sub) {
    const el = $("pstamp"); el.innerHTML = '<i>' + icon + '</i><div><b>' + esc(title) + '</b><small>' + esc(sub || "") + "</small></div>";
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); clearTimeout(popT); popT = setTimeout(() => el.classList.remove("on"), 3400);
  }
  /* 受け取ったものを画面のまん中で見せる */
  function got(emo, name, msg) {
    const b = $("pui").querySelector(".pcard"); let g = b.querySelector(".pgot"); if (g) g.remove();
    g = document.createElement("div"); g.className = "pgot"; g.innerHTML = '<span>' + emo + '</span><b>' + esc(name) + '</b><small>' + esc(msg || "") + "</small>"; b.appendChild(g);
    setTimeout(() => g.classList.add("out"), 1500); setTimeout(() => g.remove(), 2000);
  }

  /* 品物の絵（絵文字） */
  const EMO = [[/ラーメン|とんこつ/, "🍜"], [/ぎょうざ/, "🥟"], [/たこ/, "🐙"], [/だんご/, "🍡"], [/パフェ/, "🍨"], [/アイス|バニラ|いちご$|ダブル|宇宙食アイス/, "🍦"], [/ドーナツ|リング$/, "🍩"], [/たい焼き/, "🐟"],
    [/プリン/, "🍮"], [/握り|サーモン|鉄火|寿司/, "🍣"], [/ラテ|ブレンド|マキアート|コーヒー/, "☕"], [/クレープ/, "🥞"], [/ケーキ|ショート|モンブラン|タルト/, "🍰"], [/おにぎり|ツナマヨ/, "🍙"],
    [/汁/, "🍲"], [/ラムネ|ソーダ|レモネード|カクテル/, "🥤"], [/ポテト/, "🍟"], [/ナッツ/, "🥜"], [/カレー/, "🍛"], [/オムライス/, "🍳"], [/唐揚げ/, "🍗"], [/ランチ|定食|どんぶり/, "🍱"],
    [/パン/, "🥐"], [/マカロン/, "🍬"], [/ポップコーン/, "🍿"], [/ホットドッグ/, "🌭"], [/茶|紅茶|麦茶/, "🍵"], [/サンドイッチ/, "🥪"], [/ミルクティー/, "🧋"], [/ぬいぐるみ|宇宙飛行士/, "🧸"],
    [/パーカー|Tシャツ/, "👕"], [/ペンライト/, "🔦"], [/キーホルダー/, "🔑"], [/プラモデル|ロボ/, "🤖"], [/ヨーヨー/, "🪀"], [/ミニカー/, "🚗"], [/パズル|キューブ|知恵の輪/, "🧩"],
    [/ガイドブック|図鑑|マンガ|絵本|なぞなぞ/, "📚"], [/写真|カメラ/, "📷"], [/フレーム/, "🖼️"], [/ポストカード/, "💌"], [/ブーケ|花束|バラ/, "💐"], [/サボテン/, "🌵"], [/しおり/, "🔖"],
    [/時計/, "⌚"], [/ネックレス/, "💎"], [/リング/, "💍"], [/ボール/, "⚽"], [/シューズ/, "👟"], [/タオル|マフラー/, "🧣"], [/サウンドトラック/, "💿"], [/オルゴール/, "🎵"], [/ヘッドホン/, "🎧"],
    [/ピック/, "🎸"], [/マグ/, "☕"], [/バッグ/, "👜"], [/ステッカー/, "⭐"], [/キャンドル/, "🕯"], [/カチューシャ/, "👑"], [/キャップ/, "🧢"], [/まんじゅう/, "🍡"], [/せんべい/, "🍘"], [/チョコ/, "🍫"], [/クッキー/, "🍪"],
    [/ロケット/, "🚀"], [/ポスター|星図/, "🗺️"]];
  function emojiOf(n, kind) { for (const [re, e] of EMO) if (re.test(n)) return e; return kind === "food" ? "🍽️" : "🎁"; }

  /* ══════════════ 画面（重ね画面ひとつを使い回す） ══════════════ */
  let closeFn = null, keyFn = null, rafId = 0;
  function stopAll() { cancelAnimationFrame(rafId); rafId = 0; keyFn = null; if (closeFn) { const f = closeFn; closeFn = null; try { f(); } catch (e) { console.warn(e); } } party(false); }
  function panel(icon, title, cls) {
    stopAll();
    const ov = $("pui"); ov.className = "ov pui on " + (cls || ""); ov.querySelector(".pic").textContent = icon; ov.querySelector(".pti").textContent = title;
    const b = ov.querySelector(".pbody"); b.innerHTML = ""; b.scrollTop = 0; return b;
  }
  function close() { stopAll(); $("pui").classList.remove("on"); }
  const busy = () => $("pui").classList.contains("on") || document.body.classList.contains("photo");
  function loop(f) { let last = performance.now(); const tick = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (f(dt, now / 1000) !== false) rafId = requestAnimationFrame(tick); }; rafId = requestAnimationFrame(tick); }
  function mkCanvas(parent, w, h) {
    const c = document.createElement("canvas"), k = Math.min(2, devicePixelRatio || 1); c.width = Math.round(w * k); c.height = Math.round(h * k); c.className = "pcv"; c.style.aspectRatio = w + " / " + h; c.style.maxWidth = w + "px";
    parent.appendChild(c); const g = c.getContext("2d"); g.setTransform(k, 0, 0, k, 0, 0); return { c, g, w, h };
  }
  function cvPos(cv, e) { const r = cv.c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.w, (e.clientY - r.top) / r.height * cv.h]; }
  function btns(parent, list) { const d = document.createElement("div"); d.className = "pbtns"; list.forEach(([t, f, cls]) => { const b = document.createElement("button"); b.textContent = t; if (cls) b.className = cls; b.onclick = f; d.appendChild(b); }); parent.appendChild(d); return d; }
  /* 画面のふちの光（リズム・カラオケ） */
  function party(on, hue, k) { const el = $("pparty"); if (!el) return; if (!on) { el.style.opacity = 0; return; } el.style.opacity = Math.min(1, k); el.style.setProperty("--h", hue); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function star(g, x, y, r, n) { g.beginPath(); for (let i = 0; i < (n || 5) * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / (n || 5), q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); }
  function sparkle(g, x, y, r) { g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }

  /* ══════════════ 注文・買い物 ══════════════ */
  function shopUI(sh, type) {
    const food = sh.kind === "food", b = panel(food ? "🍽️" : "🛍️", sh.name, "shop");
    b.innerHTML = '<p class="pnote">' + (food ? "食べたいものを選んでね。" : "気になる品物を選んでね。") + '</p><div class="pgrid">' +
      sh.items.map((it, i) => '<button class="pitem" data-i="' + i + '"><span class="pemo">' + emojiOf(it[0], sh.kind) + "</span><b>" + esc(it[0]) + "</b><small>" + esc(it[2] || "") + "</small><em>" + Number(it[1]).toLocaleString() + " 円</em><i>" + (food ? "注文する" : "買う") + "</i></button>").join("") +
      '</div><p class="pfoot">※ パークでのお買い物は「思い出バッグ」🎒 に記録されます（XEVA・ジェムは減りません）。</p>';
    b.querySelectorAll(".pitem").forEach((el) => el.onclick = () => {
      const it = sh.items[+el.dataset.i], e = emojiOf(it[0], sh.kind);
      addBag({ n: it[0], p: it[1], s: sh.name, k: food ? "food" : "goods", e });
      got(e, it[0], food ? pick(["いただきます！ おいしい〜♪", "できたてです！", "ごちそうさまでした！"]) : "思い出バッグに入れました");
      if (food && C.avatar()) C.avatar().setFace("happy", 2500);
      stamp(type && type !== "lobby" ? type : food ? "food" : "shop");
    });
  }

  /* ══════════════ ゲームセンター ══════════════ */
  const GAMES = [["rhythm", "🎵", "スターリズム", "パークの曲に合わせて、線に来た星をタップ"], ["target", "🎯", "ターゲットシュート", "30秒間、出てくる的をねらい撃ち"], ["whack", "🏮", "ちょうちんたたき", "顔を出したおばけ提灯をタップ"], ["reflex", "⚡", "はんのうテスト", "光ったらすぐタップ（5回の平均）"]];
  function arcadeUI(name) {
    const b = panel("🕹️", name, "arcade");
    b.innerHTML = '<p class="pnote">遊びたいゲームを選んでね。</p><div class="pgrid g2">' + GAMES.map((g) => '<button class="pitem game" data-k="' + g[0] + '"><span class="pemo">' + g[1] + "</span><b>" + g[2] + "</b><small>" + g[3] + "</small><em>ハイスコア " + (SV.hi[g[0]] != null ? SV.hi[g[0]] + (g[0] === "reflex" ? " ms" : "") : "—") + "</em><i>あそぶ</i></button>").join("") + "</div>";
    b.querySelectorAll(".pitem").forEach((el) => el.onclick = () => { stamp("arcade"); ({ rhythm: () => rhythmGame(name, "main", false), target: () => targetGame(name), whack: () => whackGame(name), reflex: () => reflexGame(name) })[el.dataset.k](); });
  }
  function result(b, big, lines, again, rec) {
    const d = document.createElement("div"); d.className = "pres"; d.innerHTML = '<b class="big">' + esc(big) + "</b>" + (rec ? '<em class="rec">🏆 ハイスコア！</em>' : "") + lines.map((l) => "<p>" + esc(l) + "</p>").join("");
    b.appendChild(d); btns(d, [["もう一度", again, "go"], ["閉じる", close]]);
  }

  /* ── リズム（ゲームセンター・カラオケ）：曲の拍の解析（XPARK_MUSIC）から星をつくる。音があるときは曲の再生位置に合わせる ── */
  function rhythmGame(title, key, karaoke) {
    const b = panel(karaoke ? "🎤" : "🎵", title + (karaoke ? "　カラオケ" : "　スターリズム"), "game");
    const cv = mkCanvas(b, 420, 540), g = cv.g, W = cv.w, H = cv.h, LN = 4, LY = H - 78, SPD = 1.5, LEN = karaoke ? 70 : 48;
    b.insertAdjacentHTML("beforeend", '<p class="pnote c">' + (C.MOBILE ? "下の4つの枠をタップ" : "D・F・J・K キー（または枠をタップ）") + "。星が光る線に重なったときに押す。</p>");
    const TRK = XShows.TR[key], AU = XShows.AU, useAudio = AU.on && AU.unlocked;
    const notes = []; let lane = 0;
    for (let i = 0; i < TRK.beats.length; i++) {
      const t = TRK.beats[i]; if (t < 2.4) continue; if (t > LEN + 2.4) break;
      const o = TRK.at(t, {}); if (i % 4 === 3 && o.loud < 0.55) continue;
      lane = (lane + 1 + ((i * 7 + (o.high > 0.55 ? 1 : 0)) % 3)) % LN; notes.push({ t, lane, hit: 0 });
      if (o.loud > 0.72 && i % 2 === 0 && i + 1 < TRK.beats.length) notes.push({ t: (t + TRK.beats[i + 1]) / 2, lane: (lane + 2) % LN, hit: 0 });
    }
    notes.sort((a, b2) => a.t - b2.t);
    if (useAudio) { AU.override = { key, vol: 1 }; AU.vol[key] = 1; AU.restart(key); }
    let clk = 0, score = 0, combo = 0, maxC = 0, nP = 0, nG = 0, nOK = 0, nMiss = 0, done = false, jd = null;
    const flash = [0, 0, 0, 0], sparks = [], LX = (l) => W / 2 + (l - 1.5) * 84;
    const COL = karaoke ? ["#ff4fb0", "#ffd84a", "#4ff0ff", "#a86aff"] : ["#4fd8ff", "#7a8cff", "#c86aff", "#ff6ad0"];
    const LYR = ["ラ", "ラ", "ル", "ラ", "♪", "ラ", "ル", "ラ", "ラ", "ン", "ラ", "♪"];
    function hitLane(l) {
      if (done) return; flash[l] = 1;
      let best = null, bd = 0.16; for (const n of notes) { if (n.hit || n.lane !== l) continue; const d = Math.abs(n.t - clk); if (d < bd) { bd = d; best = n; } if (n.t > clk + 0.3) break; }
      if (!best) return;
      best.hit = 1; combo++; maxC = Math.max(maxC, combo);
      const q = bd < 0.055 ? "PERFECT" : bd < 0.1 ? "GREAT" : "GOOD"; if (q === "PERFECT") nP++; else if (q === "GREAT") nG++; else nOK++;
      score += Math.round((q === "PERFECT" ? 100 : q === "GREAT" ? 70 : 40) * (1 + Math.min(combo, 50) / 50)); jd = { q, t: 0.6 };
      for (let k = 0; k < 10; k++) sparks.push({ x: LX(l), y: LY, vx: rnd(-160, 160), vy: rnd(-260, -60), t: 0.6, c: COL[l] });
    }
    keyFn = (e) => { const l = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 }[e.code]; if (l != null && !e.repeat) hitLane(l); };
    cv.c.addEventListener("pointerdown", (e) => { const [x] = cvPos(cv, e); hitLane(Math.max(0, Math.min(3, Math.floor((x - (W / 2 - 168)) / 84)))); });
    closeFn = () => { if (useAudio) { AU.override = null; } };
    loop((dt) => {
      if (useAudio && AU.playing(key) && AU.time(key) > 0.05 && AU.time(key) < TRK.dur - 0.2) clk = AU.time(key); else clk += dt;
      const o = TRK.at(clk, {});
      party(true, karaoke ? (clk * 40) % 360 : 200 + o.bass * 80, 0.25 + o.pulse * 0.6);
      for (const n of notes) if (!n.hit && n.t < clk - 0.16) { n.hit = -1; nMiss++; combo = 0; jd = { q: "MISS", t: 0.5 }; }
      g.fillStyle = "#070a1e"; g.fillRect(0, 0, W, H);
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(40,60,160,.35)"); gr.addColorStop(1, "rgba(160,60,220,.25)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let l = 0; l < LN; l++) { const x = LX(l); g.fillStyle = "rgba(255,255,255," + (0.04 + flash[l] * 0.18) + ")"; g.fillRect(x - 40, 0, 80, H); flash[l] = Math.max(0, flash[l] - dt * 5); }
      g.strokeStyle = "rgba(255,255,255," + (0.5 + o.pulse * 0.5) + ")"; g.lineWidth = 3; g.beginPath(); g.moveTo(W / 2 - 170, LY); g.lineTo(W / 2 + 170, LY); g.stroke();
      for (let l = 0; l < LN; l++) { g.strokeStyle = COL[l]; g.lineWidth = 2.5; g.beginPath(); g.arc(LX(l), LY, 26, 0, 7); g.stroke(); g.fillStyle = "rgba(255,255,255,.75)"; g.font = "800 13px sans-serif"; g.textAlign = "center"; g.fillText(C.MOBILE ? "TAP" : "DFJK"[l], LX(l), LY + 48); }
      for (const n of notes) { if (n.hit) continue; const y = LY - (n.t - clk) / SPD * LY; if (y < -30) break; if (y > H + 30) continue; g.fillStyle = COL[n.lane]; g.shadowColor = COL[n.lane]; g.shadowBlur = 14; star(g, LX(n.lane), y, 20); g.fill(); g.shadowBlur = 0; g.fillStyle = "#fff"; star(g, LX(n.lane), y, 8); g.fill(); }
      if (karaoke) { g.font = "900 22px sans-serif"; g.textAlign = "center"; const bi = Math.max(0, o.beat); for (let k = -2; k <= 3; k++) { const s = LYR[((bi + k) % LYR.length + LYR.length) % LYR.length], x = W / 2 + (k - o.beatPh) * 64; g.fillStyle = k === 0 ? "#ffe04a" : "rgba(255,255,255,.55)"; g.fillText(s, x, 60); } g.fillStyle = "#ffe04a"; g.beginPath(); g.arc(W / 2 - o.beatPh * 64 + 0, 30 - Math.sin(o.beatPh * Math.PI) * 14, 6, 0, 7); g.fill(); }
      for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; if (p.t <= 0) { sparks.splice(i, 1); continue; } g.fillStyle = p.c; g.globalAlpha = p.t / 0.6; sparkle(g, p.x, p.y, 5); g.globalAlpha = 1; }
      g.textAlign = "left"; g.fillStyle = "#fff"; g.font = "900 20px sans-serif"; g.fillText(score.toLocaleString(), 14, 30); g.font = "800 13px sans-serif"; g.fillStyle = "#9fd8ff"; g.fillText(combo > 1 ? combo + " COMBO" : "", 14, 50);
      g.textAlign = "right"; g.fillStyle = "rgba(255,255,255,.6)"; g.fillText(Math.max(0, Math.ceil(LEN + 2.4 - clk)) + " 秒", W - 14, 30);
      if (jd) { jd.t -= dt; g.textAlign = "center"; g.font = "900 30px sans-serif"; g.fillStyle = { PERFECT: "#ffe04a", GREAT: "#4ff0ff", GOOD: "#9fff9a", MISS: "#ff7a8a" }[jd.q]; g.globalAlpha = Math.max(0, jd.t / 0.6); g.fillText(jd.q, W / 2, LY - 110); g.globalAlpha = 1; if (jd.t <= 0) jd = null; }
      if (clk < 2.2) { g.textAlign = "center"; g.font = "900 64px sans-serif"; g.fillStyle = "#fff"; g.fillText(clk < 0.8 ? "3" : clk < 1.5 ? "2" : "1", W / 2, H / 2); }
      if (clk > LEN + 3.2 && !done) {
        done = true; party(false); if (useAudio) AU.override = null;
        const tot = notes.length || 1, acc = Math.round((nP + nG * 0.7 + nOK * 0.4) / tot * 100), rank = acc >= 92 ? "S" : acc >= 80 ? "A" : acc >= 62 ? "B" : "C";
        const k2 = karaoke ? "karaoke" : "rhythm", rec = hiscore(k2, score);
        if (karaoke) stamp("karaoke");
        result(b, (karaoke ? "ノリノリ度 " : "ランク ") + rank, ["スコア " + score.toLocaleString() + "　最大コンボ " + maxC, "PERFECT " + nP + " / GREAT " + nG + " / GOOD " + nOK + " / MISS " + nMiss, "正確さ " + acc + "%"], () => rhythmGame(title, key, karaoke), rec);
        return false;
      }
    });
  }

  /* ── ターゲットシュート ── */
  function targetGame(title) {
    const b = panel("🎯", title + "　ターゲットシュート", "game"), cv = mkCanvas(b, 420, 420), g = cv.g, W = cv.w, H = cv.h;
    let t = 0, score = 0, hits = 0, shots = 0, done = false, spawn = 0, mx = W / 2, my = H / 2; const T = [], fx = [];
    const shoot = (x, y) => { if (done || t < 1.5) return; shots++; let hit = false; for (let i = T.length - 1; i >= 0; i--) { const q = T[i]; if (Math.hypot(x - q.x, y - q.y) < q.r) { hit = true; hits++; const pts = Math.round(100 + (1 - q.age / q.life) * 100) * (q.gold ? 3 : 1); score += pts; fx.push({ x: q.x, y: q.y, t: 0.5, s: "+" + pts }); T.splice(i, 1); break; } } if (!hit) fx.push({ x, y, t: 0.3, s: "" }); };
    cv.c.addEventListener("pointerdown", (e) => { const [x, y] = cvPos(cv, e); shoot(x, y); });
    cv.c.addEventListener("pointermove", (e) => { [mx, my] = cvPos(cv, e); });
    loop((dt) => {
      t += dt; if (t > 1.5 && t < 31.5) { spawn -= dt; if (spawn <= 0) { spawn = rnd(0.35, 0.75) * (1 - (t - 1.5) / 60); T.push({ x: rnd(40, W - 40), y: rnd(60, H - 40), r: rnd(18, 30), age: 0, life: rnd(0.9, 1.5), gold: Math.random() < 0.08 }); } }
      g.fillStyle = "#0b1030"; g.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255," + (0.2 + (i % 5) * 0.1) + ")"; g.fillRect((i * 97) % W, (i * 53) % H, 2, 2); }
      for (let i = T.length - 1; i >= 0; i--) { const q = T[i]; q.age += dt; if (q.age > q.life) { T.splice(i, 1); continue; } const s = Math.min(1, q.age * 6, (q.life - q.age) * 6);
        const cs = q.gold ? ["#ffe04a", "#fff6c0", "#e8a020"] : ["#ff4f6a", "#ffffff", "#3a78e8"]; [1, 0.66, 0.33].forEach((k, j) => { g.fillStyle = cs[j]; g.beginPath(); g.arc(q.x, q.y, q.r * k * s, 0, 7); g.fill(); }); }
      for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t -= dt; if (f.t <= 0) { fx.splice(i, 1); continue; } g.globalAlpha = f.t * 2; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, 30 * (1 - f.t), 0, 7); g.stroke(); if (f.s) { g.fillStyle = "#ffe04a"; g.font = "900 18px sans-serif"; g.textAlign = "center"; g.fillText(f.s, f.x, f.y - 30 * (1 - f.t) - 10); } g.globalAlpha = 1; }
      g.strokeStyle = "#4ff0ff"; g.lineWidth = 2; g.beginPath(); g.arc(mx, my, 14, 0, 7); g.moveTo(mx - 22, my); g.lineTo(mx + 22, my); g.moveTo(mx, my - 22); g.lineTo(mx, my + 22); g.stroke();
      g.fillStyle = "#fff"; g.font = "900 20px sans-serif"; g.textAlign = "left"; g.fillText(score.toLocaleString(), 14, 30); g.textAlign = "right"; g.font = "800 14px sans-serif"; g.fillText(Math.max(0, Math.ceil(31.5 - t)) + " 秒", W - 14, 30);
      if (t < 1.5) { g.textAlign = "center"; g.font = "900 40px sans-serif"; g.fillText("よーい…", W / 2, H / 2); }
      if (t > 32 && !done) { done = true; const rec = hiscore("target", score); result(b, score.toLocaleString() + " 点", ["当てた数 " + hits + "　命中率 " + (shots ? Math.round(hits / shots * 100) : 0) + "%"], () => targetGame(title), rec); return false; }
    });
  }

  /* ── ちょうちんたたき ── */
  function whackGame(title) {
    const b = panel("🏮", title + "　ちょうちんたたき", "game"), cv = mkCanvas(b, 420, 420), g = cv.g, W = cv.w, H = cv.h;
    const holes = []; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) holes.push({ x: 80 + i * 130, y: 110 + j * 120, up: 0, t: 0, life: 0, gold: false, bonk: 0 });
    let t = 0, score = 0, hits = 0, done = false, spawn = 0;
    cv.c.addEventListener("pointerdown", (e) => { if (done) return; const [x, y] = cvPos(cv, e); for (const h of holes) if (h.life > 0 && h.up > 0.4 && Math.abs(x - h.x) < 48 && y < h.y + 30 && y > h.y - 90) { score += h.gold ? 300 : 100; hits++; h.life = 0; h.bonk = 0.4; } });
    loop((dt) => {
      t += dt; if (t > 1.2 && t < 31.2) { spawn -= dt; if (spawn <= 0) { spawn = rnd(0.3, 0.7); const free = holes.filter((h) => h.life <= 0 && h.up < 0.05); if (free.length) { const h = pick(free); h.life = rnd(0.6, 1.1) * (1 - (t - 1.2) / 70); h.gold = Math.random() < 0.1; } } }
      g.fillStyle = "#1a0e24"; g.fillRect(0, 0, W, H); g.fillStyle = "#2a1838"; for (let i = 0; i < 12; i++) g.fillRect(i * 36, 0, 18, H);
      for (const h of holes) {
        if (h.life > 0) { h.life -= dt; h.up = Math.min(1, h.up + dt * 7); } else h.up = Math.max(0, h.up - dt * 6); h.bonk = Math.max(0, h.bonk - dt);
        g.fillStyle = "#050308"; g.beginPath(); g.ellipse(h.x, h.y + 22, 50, 16, 0, 0, 7); g.fill();
        if (h.up > 0) {
          g.save(); g.beginPath(); g.rect(h.x - 60, h.y - 120, 120, 142); g.clip(); const y = h.y + 30 - h.up * 78;
          g.fillStyle = h.gold ? "#ffcf3a" : "#e33a2c"; g.beginPath(); g.ellipse(h.x, y, 34, 40, 0, 0, 7); g.fill(); g.fillStyle = "#1a0a0a"; g.fillRect(h.x - 22, y - 44, 44, 8); g.fillRect(h.x - 22, y + 36, 44, 8);
          g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(h.x, y, 34, 40 - Math.abs(k) * 4, 0, 0, 7); g.stroke(); }
          const bonk = h.bonk > 0; g.fillStyle = "#fff"; g.beginPath(); g.arc(h.x - 12, y - 6, 9, 0, 7); g.arc(h.x + 12, y - 6, 9, 0, 7); g.fill(); g.fillStyle = "#111"; if (bonk) { g.font = "900 14px sans-serif"; g.textAlign = "center"; g.fillText("× ×", h.x, y - 1); } else { g.beginPath(); g.arc(h.x - 11, y - 5, 4, 0, 7); g.arc(h.x + 13, y - 5, 4, 0, 7); g.fill(); }
          g.fillStyle = "#6a0a0a"; g.beginPath(); g.arc(h.x, y + 14, 7, 0, Math.PI); g.fill(); g.restore();
        }
        g.fillStyle = "#3a2a4a"; g.beginPath(); g.ellipse(h.x, h.y + 26, 54, 12, 0, 0, Math.PI); g.fill();
      }
      g.fillStyle = "#fff"; g.font = "900 20px sans-serif"; g.textAlign = "left"; g.fillText(score.toLocaleString(), 14, 30); g.textAlign = "right"; g.font = "800 14px sans-serif"; g.fillText(Math.max(0, Math.ceil(31.2 - t)) + " 秒", W - 14, 30);
      if (t > 32 && !done) { done = true; const rec = hiscore("whack", score); result(b, score.toLocaleString() + " 点", ["たたいた数 " + hits], () => whackGame(title), rec); return false; }
    });
  }

  /* ── はんのうテスト ── */
  function reflexGame(title) {
    const b = panel("⚡", title + "　はんのうテスト", "game"), cv = mkCanvas(b, 420, 320), g = cv.g, W = cv.w, H = cv.h;
    let st = "wait", tw = rnd(1.2, 3.2), t = 0, n = 0, sum = 0, last = null, msg = "";
    const tap = () => { if (st === "wait") { msg = "フライング！ もう一度"; tw = rnd(1.2, 3.2); t = 0; } else if (st === "go") { last = Math.round(t * 1000); sum += last; n++; msg = last + " ms"; st = n >= 5 ? "end" : "wait"; tw = rnd(1.2, 3.2); t = 0; } };
    cv.c.addEventListener("pointerdown", tap); keyFn = (e) => { if (e.code === "Space" || e.code === "KeyE" || e.code === "Enter") tap(); };
    loop((dt) => {
      t += dt; if (st === "wait" && t > tw) { st = "go"; t = 0; }
      g.fillStyle = st === "go" ? "#1ad8ff" : "#10183a"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "900 34px sans-serif"; g.fillText(st === "go" ? "いま！" : st === "end" ? "おしまい" : "…まだ…", W / 2, H / 2 - 10);
      g.font = "800 16px sans-serif"; g.fillText(msg, W / 2, H / 2 + 30); g.fillText((Math.min(n + 1, 5)) + " / 5 回目", W / 2, 34);
      if (st === "end") { const avg = Math.round(sum / 5), rec = hiscore("reflex", avg, true); result(b, "平均 " + avg + " ms", [avg < 250 ? "すばらしい反射神経！" : avg < 330 ? "なかなかの速さ！" : "つぎはもっと速く！"], () => reflexGame(title), rec); return false; }
    });
  }

  /* ══════════════ カプセルトイ ══════════════ */
  const CAPS = [["ミニちょうちん", "N", "🏮"], ["ほしのバッジ", "N", "⭐"], ["くものストラップ", "N", "☁️"], ["ロボのミニフィギュア", "N", "🤖"], ["さくらのピン", "N", "🌸"], ["ドット絵ステッカー", "N", "👾"], ["ねこのキーホルダー", "N", "🐱"],
    ["ロケットのマグネット", "N", "🚀"], ["たこ焼きのストラップ", "N", "🐙"], ["ソフトクリームのピン", "N", "🍦"], ["光るエンブレム", "R", "💠"], ["XR-01 フィギュア", "R", "🦾"], ["観覧車のスノードーム", "R", "🎡"], ["パレードのフロート模型", "R", "🎠"],
    ["金の提灯", "R", "🪔"], ["ネオンの月のライト", "R", "🌙"], ["クリスタルの X エンブレム", "SR", "💎"], ["花火のジオラマ", "SR", "🎆"], ["夜のショーのオルゴール", "SR", "🎶"], ["XEVARION PARK 金のパスポート", "SSR", "🎫"]];
  const RCOL = { N: "#9fb4d8", R: "#4fb0ff", SR: "#c86aff", SSR: "#ffcf3a" };
  function capsuleUI(name) {
    const b = panel("🎰", name, "capsule"), cv = mkCanvas(b, 360, 360), g = cv.g, W = cv.w, H = cv.h;
    const have = () => CAPS.filter((q) => SV.cap[q[0]]).length;
    const info = document.createElement("p"); info.className = "pnote c"; b.appendChild(info);
    const setInfo = () => { info.textContent = "コレクション " + have() + " / " + CAPS.length + "　（1回ごとに1つ・何回でも回せます）"; }; setInfo();
    let st = "idle", t = 0, prize = null, hue = Math.random() * 360;
    const turn = () => { if (st !== "idle" && st !== "show") return; st = "turn"; t = 0; const r = Math.random(); const rar = r < 0.01 ? "SSR" : r < 0.1 ? "SR" : r < 0.4 ? "R" : "N"; prize = pick(CAPS.filter((q) => q[1] === rar)); hue = Math.random() * 360; };
    btns(b, [["🎰 ハンドルを回す", turn, "go"]]);
    cv.c.addEventListener("pointerdown", turn);
    loop((dt) => {
      t += dt; g.clearRect(0, 0, W, H);
      g.fillStyle = "#e84a5a"; rr(g, 90, 190, 180, 150, 18); g.fill(); g.fillStyle = "#c8303e"; g.fillRect(90, 300, 180, 40);
      g.fillStyle = "rgba(220,240,255,.55)"; g.beginPath(); g.arc(180, 130, 92, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 4; g.stroke();
      for (let i = 0; i < 16; i++) { const a = i * 2.4 + (st === "turn" ? t * 8 : 0) * (i % 2 ? 1 : -1) * 0.2, r = 30 + (i * 17) % 55; g.fillStyle = "hsl(" + ((i * 47) % 360) + ",80%,62%)"; g.beginPath(); g.arc(180 + Math.cos(a) * r, 150 + Math.sin(a) * r * 0.6, 15, 0, 7); g.fill(); }
      const ha = st === "turn" ? Math.min(1, t / 0.9) * Math.PI * 2 : 0; g.save(); g.translate(180, 250); g.rotate(ha); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 26, 0, 7); g.fill(); g.fillStyle = "#c8303e"; g.fillRect(-22, -5, 44, 10); g.restore();
      g.fillStyle = "#1a0a14"; rr(g, 150, 296, 60, 34, 8); g.fill();
      if (st === "turn" && t > 1.0) { st = "drop"; t = 0; }
      if (st === "drop" || st === "open") { const y = st === "drop" ? Math.min(313, 250 + t * 260) : 313; g.fillStyle = "hsl(" + hue + ",80%,62%)"; g.beginPath(); g.arc(180, y, 17, Math.PI, 0); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(180, y, 17, 0, Math.PI); g.fill(); if (st === "drop" && t > 0.5) { st = "open"; t = 0; } }
      if (st === "open" && t > 0.6) {
        st = "show"; t = 0; SV.cap[prize[0]] = (SV.cap[prize[0]] || 0) + 1; addBag({ n: prize[0], s: name, k: "capsule", e: prize[2], r: prize[1] }); save(); setInfo(); stamp("gacha");
        got(prize[2], "【" + prize[1] + "】" + prize[0], SV.cap[prize[0]] > 1 ? "（" + SV.cap[prize[0]] + "こ目）" : "はじめて出た！");
      }
      if (st === "show") { g.fillStyle = RCOL[prize[1]]; g.globalAlpha = Math.min(1, t * 3) * 0.35; g.beginPath(); g.arc(180, 140, 120, 0, 7); g.fill(); g.globalAlpha = 1; }
    });
  }

  /* ══════════════ 展示（博物館・美術館・ショールーム） ══════════════ */
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function artOf(g, W, H, title) {
    let h = hashStr(title); const r = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
    const hu = r() * 360, gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, "hsl(" + hu + ",60%,30%)"); gr.addColorStop(1, "hsl(" + ((hu + 60 + r() * 80) % 360) + ",70%,55%)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { g.globalAlpha = 0.18 + r() * 0.3; g.fillStyle = "hsl(" + ((hu + r() * 180) % 360) + ",80%," + (50 + r() * 30) + "%)"; const k = r(); if (k < 0.4) { g.beginPath(); g.arc(r() * W, r() * H, 10 + r() * 60, 0, 7); g.fill(); } else if (k < 0.7) { g.fillRect(r() * W, r() * H, 20 + r() * 90, 6 + r() * 40); } else { g.beginPath(); g.moveTo(r() * W, r() * H); g.lineTo(r() * W, r() * H); g.lineTo(r() * W, r() * H); g.fill(); } }
    g.globalAlpha = 1; g.font = "72px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(emojiOf(title, "goods") === "🎁" ? pick(["🏛️", "✨", "🔭", "🗿", "🎨"]) : emojiOf(title, "goods"), W / 2, H / 2); g.textBaseline = "alphabetic";
  }
  const EXI = [[/港|灯台|島/, "⚓"], [/設計図|大門/, "📐"], [/エリア|24/, "🗺️"], [/年表|未来/, "🕰️"], [/ドット|ロボット$|XR/, "🤖"], [/コントローラー|ゲーム/, "🎮"], [/プリズム|光/, "🌈"], [/磁石/, "🧲"], [/DNA/, "🧬"], [/宇宙|月|火星|ステーション/, "🪐"],
    [/EV|クルマ|レース|自動運転/, "🚗"], [/屏風|さくら/, "🌸"], [/ガラス/, "💧"], [/落書き|絵/, "🎨"], [/エンジン/, "🚀"], [/歩く|手伝い|AI/, "🦾"]];
  function galleryUI(name, list, type) {
    const b = panel("🖼️", name, "gallery"); list = list && list.length ? list : [["展示", "すてきな作品"]]; let i = 0;
    const cv = mkCanvas(b, 480, 300), cap = document.createElement("div"); cap.className = "pcap"; b.appendChild(cap);
    const show = () => { const [t, d] = list[i]; const g = cv.g; artOf(g, 480, 300, t); const e = (EXI.find(([re]) => re.test(t)) || [])[1]; if (e) { g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(240, 150, 70, 0, 7); g.fill(); g.font = "80px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(e, 240, 152); g.textBaseline = "alphabetic"; }
      g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, 262, 480, 38); g.fillStyle = "#fff"; g.font = "800 15px sans-serif"; g.textAlign = "left"; g.fillText("No." + (i + 1) + "　" + t, 14, 287);
      cap.innerHTML = "<b>" + esc(t) + "</b><p>" + esc(d) + "</p><small>" + (i + 1) + " / " + list.length + "</small>"; };
    btns(b, [["◀ まえ", () => { i = (i + list.length - 1) % list.length; show(); }], ["つぎ ▶", () => { i = (i + 1) % list.length; show(); if (i === list.length - 1) stamp(type === "showroom" ? "showroom" : "gallery"); }, "go"]]);
    show(); if (list.length === 1) stamp(type === "showroom" ? "showroom" : "gallery");
  }

  /* ══════════════ ロビー・案内・占い ══════════════ */
  const FORT = [["大吉", "今日はなにをしてもうまくいく日。気になっていたアトラクションに乗ってみよう！"], ["中吉", "友だちと話すと、いいアイデアがうかぶ日。"], ["小吉", "小さなしあわせが見つかる日。おやつを食べるとさらに運気アップ。"], ["吉", "のんびり歩くと、すてきな景色に出会える日。"], ["末吉", "夕方からぐんぐん運気が上がる日。夜のショーを見にいこう。"]];
  const LUCKY = ["たこ焼き", "星のラテ", "ペンライト", "観覧車", "青いもの", "ピンクのもの", "さくら", "提灯", "ソフトクリーム", "モノレール"];
  function lobbyUI(o, type) {
    const fortune = o.fortune || /占い/.test(o.name || ""), b = panel(fortune ? "🔮" : "🛎️", o.name || "案内", "lobby");
    if (fortune) {
      b.innerHTML = '<div class="pfort"><div class="orb">🔮</div><p class="pnote c">水晶玉に手をかざして……</p></div>';
      btns(b, [["🔮 占ってもらう", () => {
        const f = pick(FORT), a = pick(XPark.AREAS.filter((q) => q.id !== "marketE"));
        b.querySelector(".pfort").innerHTML = '<div class="orb on">🔮</div><b class="big">' + f[0] + "</b><p>" + esc(f[1]) + "</p><p>ラッキーアイテム：<b>" + esc(pick(LUCKY)) + "</b>　ラッキーエリア：<b>" + a.n + " " + esc(a.name.replace(/^XEVARION /, "")) + "</b></p>";
        stamp("fortune"); if (!b.querySelector(".pwarp")) { const d = btns(b, [["✨ ラッキーエリアへ行く", () => { warpArea(a); close(); }, "go pwarp"]]); d.classList.add("pwarp"); }
      }, "go"]]);
      return;
    }
    const mode = C.getTime(), tips = { day: "いまは昼。デイタイムパレード（中央の大通り）が見られます。", dusk: "いまは夕方。ビーチの桟橋から夕日がきれいです。", night: "いまは夜。XEVARION NIGHT（噴水と光のショー）が見られます。" }[mode] || "";
    const sug = XPark.AREAS.filter((q) => q.id !== "marketE").sort(() => Math.random() - 0.5).slice(0, 3);
    b.innerHTML = '<div class="plobby"><p>' + esc(o.text || "ようこそ！ パークの案内をどうぞ。") + '</p><p class="pnote">' + esc(tips) + '</p><b class="sub">きょうのおすすめ</b><div class="pgrid g3">' +
      sug.map((a, i) => '<button class="pitem area" data-i="' + i + '" style="--c:' + a.c + '"><span class="pemo">' + (AICON[a.id] || "📍") + "</span><b>" + a.n + " " + esc(AJP[a.id] || a.name) + "</b><small>" + esc(AHI[a.id] || "") + "</small><i>ワープ</i></button>").join("") + "</div></div>";
    b.querySelectorAll(".pitem.area").forEach((el) => el.onclick = () => { warpArea(sug[+el.dataset.i]); close(); });
    stamp("lobby");
  }

  /* ══════════════ 学ぶ（教室・図書館） ══════════════ */
  const FACTS = ["タコの心臓は3つある。", "ハチミツは何千年たってもくさりにくい。", "金星では1日（自転）が1年（公転）より長い。", "カタツムリの歯は1万本以上ある。", "雷の温度は太陽の表面より高い（約3万℃）。", "エベレストは毎年少しずつ高くなっている。", "人の骨は大人で約206本。", "光は1秒で地球を約7周半する。"];
  function learnUI(o, type) {
    const b = panel(type === "library" ? "📖" : "📚", o.name || "学ぶ", "learn");
    b.innerHTML = '<p class="pnote">なにを学ぶ？</p><div class="pgrid g3">' +
      '<button class="pitem" data-k="lex"><span class="pemo">📘</span><b>MagiLex で学ぶ</b><small>単語・理科・数学のドリル（アプリへ移動）</small><i>ひらく</i></button>' +
      '<button class="pitem" data-k="xev"><span class="pemo">🤖</span><b>XEVYNAR に聞く</b><small>学習AI に質問・解説（アプリへ移動）</small><i>ひらく</i></button>' +
      '<button class="pitem" data-k="quiz"><span class="pemo">❓</span><b>ミニクイズ 5問</b><small>ここで挑戦・全問正解でメダル</small><i>はじめる</i></button></div>' +
      '<div class="pfact"><b>きょうの豆知識</b><p>' + esc(pick(FACTS)) + "</p></div>";
    b.querySelectorAll(".pitem").forEach((el) => el.onclick = () => { const k = el.dataset.k; stamp(type || "classroom"); if (k === "quiz") return quizUI(o.name); close(); if (k === "lex") C.openApp("MagiLex/MagiLex.html", { name: "MagiLex" }); else C.openApp("XEVYNAR/index.html", { name: "XEVYNAR" }); });
  }

  /* ══════════════ クイズ（クイズドーム・教室） ══════════════ */
  const QZ = [["水の化学式は？", ["H₂O", "CO₂", "O₂", "NaCl"], "水は水素原子2つと酸素原子1つ。"], ["地球から月までのおよその距離は？", ["約38万km", "約3.8万km", "約380万km", "約3800km"], "光でも約1.3秒かかる。"], ["1から10までの整数をすべて足すと？", ["55", "45", "50", "60"], "(1+10)×10÷2 = 55。"],
    ["光の速さはおよそ秒速何km？", ["30万km", "3万km", "300万km", "3000km"], "1秒で地球を約7周半。"], ["日本でいちばん高い山は？", ["富士山", "北岳", "槍ヶ岳", "御嶽山"], "高さ3776m。"], ["太陽系でいちばん大きい惑星は？", ["木星", "土星", "地球", "海王星"], "地球の直径の約11倍。"],
    ["「ありがとう」を英語で言うと？", ["Thank you", "Sorry", "Hello", "Goodbye"], "Thanks とも言う。"], ["三角形の3つの角を足すと？", ["180°", "90°", "360°", "270°"], "どんな三角形でも180°。"], ["植物が光で養分をつくるはたらきは？", ["光合成", "呼吸", "蒸散", "発酵"], "二酸化炭素と水から、でんぷんと酸素。"],
    ["1時間は何秒？", ["3600秒", "360秒", "6000秒", "1200秒"], "60秒×60分。"], ["空気にいちばん多く含まれる気体は？", ["窒素", "酸素", "二酸化炭素", "アルゴン"], "約78%が窒素。"], ["「apple」の意味は？", ["りんご", "みかん", "ぶどう", "もも"], "an apple のように an をつける。"],
    ["円周率 π のはじめの3けたは？", ["3.14", "3.41", "3.12", "3.16"], "3.14159… と続く。"], ["水が凍る温度は（1気圧）？", ["0℃", "4℃", "−10℃", "100℃"], "100℃で沸とうする。"], ["いちばん広い海は？", ["太平洋", "大西洋", "インド洋", "北極海"], "地球の表面の約3分の1。"],
    ["12 × 12 = ?", ["144", "124", "132", "154"], "12の2乗。"], ["心臓から全身へ血液を送る血管は？", ["動脈", "静脈", "毛細血管", "リンパ管"], "心臓へもどるのが静脈。"], ["音が空気中を伝わる速さは秒速およそ？", ["約340m", "約34m", "約3400m", "約3.4m"], "雷の光と音のずれで距離がわかる。"],
    ["一年でいちばん昼が長い日は？", ["夏至", "冬至", "春分", "秋分"], "6月21日ごろ。"], ["2の10乗は？", ["1024", "512", "2048", "1000"], "コンピュータでよく出てくる数。"], ["世界でいちばん面積が大きい国は？", ["ロシア", "カナダ", "中国", "アメリカ"], "日本の約45倍。"],
    ["「library」の意味は？", ["図書館", "研究所", "病院", "公園"], "book（本）がたくさんある所。"], ["1辺5cmの正方形の面積は？", ["25cm²", "20cm²", "10cm²", "15cm²"], "5×5 = 25。"], ["酸性の水よう液で、青いリトマス紙は何色になる？", ["赤", "青のまま", "黄", "緑"], "アルカリ性では赤いリトマス紙が青に。"],
    ["江戸幕府を開いたのは？", ["徳川家康", "織田信長", "豊臣秀吉", "源頼朝"], "1603年。"], ["地球が太陽のまわりを1周するのは約？", ["365日", "30日", "100日", "24時間"], "それで1年。"], ["1/4 を小数にすると？", ["0.25", "0.4", "0.14", "0.5"], "1÷4 = 0.25。"],
    ["おなかの中でいちばん大きい臓器は？", ["肝臓", "心臓", "胃", "腎臓"], "重さは約1.2〜1.5kg。"], ["「sun」の意味は？", ["太陽", "月", "星", "雲"], "月は moon、星は star。"], ["1km は何m？", ["1000m", "100m", "10000m", "10m"], "k（キロ）は1000倍。"]];
  function quizUI(name) {
    const b = panel("❓", (name || "クイズドーム") + "　ミニクイズ", "quiz"), qs = QZ.slice().sort(() => Math.random() - 0.5).slice(0, 5);
    let i = 0, ok = 0;
    const draw = () => {
      if (i >= qs.length) {
        const rec = hiscore("quiz", ok); if (ok === 5) { stamp("quiz"); addBag({ n: "クイズ王のメダル", s: name || "クイズドーム", k: "prize", e: "🏅" }); }
        b.innerHTML = ""; result(b, ok + " / 5 問 正解", [ok === 5 ? "全問正解！ クイズ王のメダルをもらいました 🏅" : ok >= 3 ? "よくできました！" : "つぎはもっと取れるはず！"], () => quizUI(name), rec && ok === 5); return;
      }
      const q = qs[i], opts = q[1].map((t, k) => [t, k === 0]).sort(() => Math.random() - 0.5);
      b.innerHTML = '<div class="pquiz"><small>第 ' + (i + 1) + " 問 / 5</small><b>" + esc(q[0]) + '</b><div class="popts">' + opts.map((o2, k) => '<button data-k="' + k + '">' + esc(o2[0]) + "</button>").join("") + '</div><p class="pexp"></p></div>';
      b.querySelectorAll(".popts button").forEach((el) => el.onclick = () => {
        if (b.querySelector(".popts.done")) return; const right = opts[+el.dataset.k][1]; if (right) ok++;
        b.querySelector(".popts").classList.add("done"); b.querySelectorAll(".popts button").forEach((x, k) => { if (opts[k][1]) x.classList.add("ok"); else if (x === el) x.classList.add("ng"); });
        b.querySelector(".pexp").innerHTML = (right ? "⭕ 正解！ " : "❌ ざんねん… 正解は「" + esc(q[1][0]) + "」。") + esc(q[2]);
        btns(b.querySelector(".pquiz"), [[i < 4 ? "つぎの問題 ▶" : "結果を見る", () => { i++; draw(); }, "go"]]);
      });
    };
    draw();
  }

  /* ══════════════ 実験ショー ══════════════ */
  const FLAME = [["Li", "リチウム", "#ff3a4a", "赤"], ["Na", "ナトリウム", "#ffd23a", "黄"], ["K", "カリウム", "#b86aff", "赤紫"], ["Ca", "カルシウム", "#ff8a3a", "橙"], ["Sr", "ストロンチウム", "#ff2a5a", "紅"], ["Cu", "銅", "#3affc0", "青緑"], ["Ba", "バリウム", "#b8ff3a", "黄緑"]];
  const PHC = [[1, "#e8204a", "強い酸性（胃液など）"], [3, "#e85a9a", "酸性（お酢・レモン汁）"], [5, "#b04ac8", "弱い酸性"], [7, "#6a5ad8", "中性（水）"], [8.5, "#3a7ae8", "弱いアルカリ性（重そう水）"], [10.5, "#2ab87a", "アルカリ性（石けん水）"], [13, "#e8d83a", "強いアルカリ性"]];
  function labUI(name) {
    const b = panel("🧪", name + "　実験ショー", "lab"); stamp("lab");
    const tabs = document.createElement("div"); tabs.className = "ptabs"; b.appendChild(tabs);
    const cv = mkCanvas(b, 460, 300), g = cv.g, W = cv.w, H = cv.h, cap = document.createElement("div"); cap.className = "pcap"; b.appendChild(cap);
    const ctl = document.createElement("div"); ctl.className = "pctl"; b.appendChild(ctl);
    let mode = "flame", el = FLAME[1], ph = 7, t = 0, gas = 0;
    const set = (m) => {
      mode = m; t = 0; gas = 0; tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.m === m)); ctl.innerHTML = "";
      if (m === "flame") { cap.innerHTML = "<b>炎色反応</b><p>金属の成分を炎に入れると、金属ごとに決まった色で光る。花火の色もこのしくみ。</p>"; FLAME.forEach((f) => { const x = document.createElement("button"); x.textContent = f[0] + " " + f[1]; x.style.setProperty("--c", f[2]); x.onclick = () => { el = f; t = 0; }; ctl.appendChild(x); }); }
      else if (m === "ph") { cap.innerHTML = "<b>ムラサキキャベツ液の色変わり</b><p>ムラサキキャベツの汁は、酸性・アルカリ性で色が変わる（指示薬）。つまみを動かしてみよう。</p>"; ctl.innerHTML = '<label>pH <input type="range" min="1" max="14" step="0.5" value="7"><b>7</b></label>'; const r = ctl.querySelector("input"); r.oninput = () => { ph = +r.value; ctl.querySelector("b").textContent = r.value; }; }
      else { cap.innerHTML = "<b>水の電気分解</b><p>水に電気を流すと、−極から水素、＋極から酸素が出る。体積はおよそ 水素：酸素 ＝ 2：1。</p>"; const x = document.createElement("button"); x.textContent = "⚡ もう一度"; x.onclick = () => { gas = 0; }; ctl.appendChild(x); }
    };
    [["flame", "🔥 炎色反応"], ["ph", "🥬 色変わり"], ["elec", "⚡ 電気分解"]].forEach(([m, tx]) => { const x = document.createElement("button"); x.textContent = tx; x.dataset.m = m; x.onclick = () => set(m); tabs.appendChild(x); });
    set("flame");
    loop((dt) => {
      t += dt; g.fillStyle = "#0c1224"; g.fillRect(0, 0, W, H);
      if (mode === "flame") {
        g.fillStyle = "#555c6a"; g.fillRect(W / 2 - 18, 210, 36, 70); g.fillStyle = "#3a404c"; g.fillRect(W / 2 - 40, 270, 80, 14);
        for (let i = 0; i < 26; i++) { const k = (t * 1.6 + i / 26) % 1, x = W / 2 + Math.sin(i * 3.1 + t * 6) * 16 * (1 - k), y = 205 - k * 150, r = 26 * (1 - k) + 4; g.globalAlpha = (1 - k) * 0.55; g.fillStyle = k < 0.25 ? "#bfe4ff" : el[2]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
        g.globalAlpha = 1; g.fillStyle = "#fff"; g.font = "900 22px sans-serif"; g.textAlign = "left"; g.fillText(el[0] + "（" + el[1] + "）→ " + el[3], 16, 32);
      } else if (mode === "ph") {
        let c0 = PHC[0], c1 = PHC[PHC.length - 1]; for (let i = 0; i < PHC.length - 1; i++) if (ph >= PHC[i][0] && ph <= PHC[i + 1][0]) { c0 = PHC[i]; c1 = PHC[i + 1]; }
        const k = c1[0] === c0[0] ? 0 : (ph - c0[0]) / (c1[0] - c0[0]), mix = (a, bb) => { const p = (s) => [1, 3, 5].map((q) => parseInt(s.substr(q, 2), 16)); const A = p(a), Bq = p(bb); return "rgb(" + A.map((v, j) => Math.round(v + (Bq[j] - v) * k)).join(",") + ")"; };
        const col = mix(c0[1], c1[1]); g.strokeStyle = "#cfe8ff"; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2 - 60, 60); g.lineTo(W / 2 - 60, 250); g.quadraticCurveTo(W / 2 - 60, 270, W / 2 - 40, 270); g.lineTo(W / 2 + 40, 270); g.quadraticCurveTo(W / 2 + 60, 270, W / 2 + 60, 250); g.lineTo(W / 2 + 60, 60); g.stroke();
        g.fillStyle = col; g.fillRect(W / 2 - 57, 120 + Math.sin(t * 2) * 2, 114, 147); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(W / 2 - 50, 126, 10, 136);
        for (let i = 0; i < 14; i++) { g.fillStyle = PHC.reduce((a, q) => q[0] <= i + 1 ? q : a, PHC[0])[1]; g.fillRect(20 + i * 30, H - 22, 28, 12); } g.fillStyle = "#fff"; g.beginPath(); g.moveTo(20 + (ph - 1) * 30 + 14, H - 26); g.lineTo(20 + (ph - 1) * 30 + 8, H - 34); g.lineTo(20 + (ph - 1) * 30 + 20, H - 34); g.fill();
        g.font = "800 15px sans-serif"; g.textAlign = "left"; g.fillText("pH " + ph + "：" + (PHC.reduce((a, q) => q[0] <= ph + 0.01 ? q : a, PHC[0]))[2], 16, 30);
      } else {
        gas = Math.min(1, gas + dt * 0.08); g.fillStyle = "#1a4a7a"; g.fillRect(90, 150, 280, 120); g.strokeStyle = "#cfe8ff"; g.lineWidth = 3; g.strokeRect(90, 150, 280, 120);
        [[160, "−", "水素", 2, "#9fd8ff"], [300, "+", "酸素", 1, "#ffd8a0"]].forEach(([x, sg, nm, k, cl]) => {
          g.strokeStyle = "#cfe8ff"; g.strokeRect(x - 22, 40, 44, 200); const h2 = gas * k * 80; g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(x - 20, 42, 40, h2); g.fillStyle = "#1a4a7a"; g.fillRect(x - 20, 42 + h2, 40, 196 - h2);
          for (let i = 0; i < 6 * k; i++) { const yy = 230 - ((t * 60 * k + i * 37) % (180 - h2)); g.fillStyle = cl; g.beginPath(); g.arc(x - 10 + (i * 7) % 20, yy, 3, 0, 7); g.fill(); }
          g.fillStyle = "#888"; g.fillRect(x - 4, 236, 8, 30); g.fillStyle = "#fff"; g.font = "900 18px sans-serif"; g.textAlign = "center"; g.fillText(sg + " " + nm, x, 32);
        });
        g.strokeStyle = "#ffd84a"; g.lineWidth = 2; g.beginPath(); g.moveTo(160, 266); g.lineTo(160, 290); g.lineTo(300, 290); g.lineTo(300, 266); g.stroke(); g.fillStyle = "#ffd84a"; g.fillRect(215, 280, 30, 20);
      }
    });
  }

  /* ══════════════ カラオケ ══════════════ */
  function karaokeUI(name) {
    const b = panel("🎤", name, "karaoke");
    b.innerHTML = '<p class="pnote">歌う曲を選んでね（パークの曲のカラオケ。拍に合わせて押すと「ノリノリ度」が上がる）。</p><div class="pgrid g3">' +
      [["main", "XEVARION PARK メインテーマ", "🎡"], ["main2", "メインテーマ2", "🎠"], ["parade", "デイタイム・パレード", "🎉"], ["night", "XEVARION NIGHT", "🌙"], ["chase", "Chase the Light", "🚢"]].map(([k, t, e]) => '<button class="pitem" data-k="' + k + '"><span class="pemo">' + e + "</span><b>" + t + "</b><small>" + Math.round((XShows.TR[k].bpm || 120)) + " BPM</small><i>歌う</i></button>").join("") + "</div>" +
      (XShows.AU.on ? "" : '<p class="pfoot">※ パークの音楽がオフです（右上の ♪ でオンにすると曲が流れます）。</p>');
    b.querySelectorAll(".pitem").forEach((el) => el.onclick = () => rhythmGame(name, el.dataset.k, true));
  }

  /* ══════════════ 休む ══════════════ */
  function restUI(o) {
    const b = panel(o.spa ? "♨️" : "🛏️", o.name || "休む", "rest");
    b.innerHTML = '<p class="pnote">' + (o.spa ? "あたたかいお湯で、ほっとひと息。" : "ふかふかのベッドでひと休み。") + "</p>";
    btns(b, [["😌 ゆっくり休む", () => {
      const f = $("fade"); $("fadeT").textContent = o.spa ? "♨️ ぽかぽか……" : "💤 すやすや……"; f.classList.add("on");
      setTimeout(() => { f.classList.remove("on"); if (C.avatar()) C.avatar().setFace("relaxed", 4000); b.innerHTML = '<p class="pnote">元気になりました！ 起きる時間を選べます。</p>';
        btns(b, [["☀️ 昼", () => { C.setTime("day"); close(); }], ["🌇 夕方", () => { C.setTime("dusk"); close(); }], ["🌙 夜", () => { C.setTime("night"); close(); }], ["このまま", close]]); }, 1800);
      stamp(o.spa ? "spa" : "room");
    }, "go"]]);
  }

  /* ══════════════ お化け屋敷のゴール ══════════════ */
  function hauntedUI(name) {
    const fl = $("pflash"); fl.className = "on scare"; setTimeout(() => { fl.className = ""; }, 700);
    setTimeout(() => {
      const b = panel("👻", name, "haunted"); const first = !SV.st.haunted;
      b.innerHTML = '<div class="pres"><b class="big">ゴール！</b><p>こわかった……でも最後まで進めました。</p>' + (first ? "<p>「勇気のバッジ」をもらいました 🎖️</p>" : "") + "</div>";
      if (first) addBag({ n: "勇気のバッジ", s: name, k: "prize", e: "🎖️" }); stamp("haunted"); btns(b, [["閉じる", close]]);
    }, 650);
  }

  /* ══════════════ 記念写真 ══════════════ */
  let wordmark = null;
  function photoUI(o) {
    const b = panel("📸", o.name || "記念写真", "photo");
    b.innerHTML = '<p class="pnote">ポーズを選んでね。3・2・1 で撮ります（カメラが前にまわります）。</p>';
    if (!wordmark) { wordmark = new Image(); wordmark.src = "img/park_wordmark.webp"; }
    const go = (pose) => {
      $("pui").classList.remove("on"); document.body.classList.add("photo");
      const cd = $("pcount"); let n = 3; cd.textContent = n; cd.className = "on";
      C.photo(true, pose);
      const tick = setInterval(() => { n--; if (n > 0) { cd.textContent = n; cd.className = ""; void cd.offsetWidth; cd.className = "on"; return; } clearInterval(tick); cd.className = "";
        C.snap((url) => { const fl = $("pflash"); fl.className = "on"; setTimeout(() => { fl.className = ""; }, 300); C.photo(false); document.body.classList.remove("photo"); frameShot(url, o); });
      }, 800);
    };
    btns(b, [["👋 手をふる", () => go("wave"), "go"], ["😊 にっこり", () => go("smile"), "go"], ["🙂 ふつう", () => go("plain")]]);
  }
  function frameShot(url, o) {
    const img = new Image(); img.onload = () => {
      const W = 1280, H = Math.round(W * img.height / img.width), c = document.createElement("canvas"); c.width = W + 48; c.height = H + 120; const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, c.width, c.height); gr.addColorStop(0, "#1a3aa8"); gr.addColorStop(0.5, "#2aa8e8"); gr.addColorStop(1, "#8a4ae8"); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 24, 24, W, H); g.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 18; i++) sparkle(g, (i * 211) % c.width, H + 30 + (i * 37) % 80, 4 + (i % 3) * 3);
      if (wordmark && wordmark.complete && wordmark.naturalWidth) { const ww = 300, hh = ww * wordmark.naturalHeight / wordmark.naturalWidth; g.drawImage(wordmark, 30, H + 24 + (96 - hh) / 2, ww, hh); }
      const d = new Date(); g.fillStyle = "#fff"; g.textAlign = "right"; g.font = "900 30px sans-serif"; g.fillText(o.name || "XEVARION PARK", c.width - 34, H + 70); g.font = "700 22px sans-serif"; g.fillText(d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate(), c.width - 34, H + 102);
      const out = c.toDataURL("image/jpeg", 0.9), b = panel("📸", "撮れました！", "photo");
      const name = "XEVARION_PARK_" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "_" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0") + ".jpg";
      b.innerHTML = '<img class="pshot" alt="記念写真" src="' + out + '"><div class="pbtns"><a class="go" download="' + name + '" href="' + out + '">💾 写真を保存する</a></div>';
      btns(b, [["もう一枚", () => photoUI(o)], ["閉じる", close]]);
      addBag({ n: "記念写真（" + (o.name || "パーク") + "）", s: o.name || "", k: "photo", e: "📸" }); stamp("studio");
    }; img.src = url;
  }

  /* ══════════════ プラネタリウム ══════════════ */
  const PLN = ["ようこそ XEVARION プラネタリウムへ。いすに座って、上を見上げてください。", "夏の大三角：こと座のベガ・わし座のアルタイル・はくちょう座のデネブ。七夕の織姫星と彦星は、ベガとアルタイルです。",
    "北極星の見つけかた：北斗七星のひしゃくの先の2つの星の間を、5倍のばした所にあります。", "オリオン座：冬を代表する星座。赤いベテルギウスと青白いリゲル。星の色は、表面の温度のちがいです。",
    "天の川：わたしたちの天の川銀河を、内がわから見た姿。数千億の星が集まっています。", "すばる（プレアデス星団）：おうし座にある若い星の集まり。目で見ても6〜7個の星が見えます。", "上映はおしまいです。夜の XEVARION PARK でも、空を見上げてみてください。"];
  function planetUI(name) {
    const b = panel("🌌", name + "　星空の上映", "planet dock"); let i = 0, t = 0;
    const w = C.world; w.planetBoost = true;
    b.innerHTML = '<p class="pnar"></p><div class="pdots"></div>'; const nar = b.querySelector(".pnar"), dots = b.querySelector(".pdots");
    dots.innerHTML = PLN.map(() => "<i></i>").join("");
    const show = () => { nar.textContent = PLN[i]; dots.querySelectorAll("i").forEach((d, k) => d.classList.toggle("on", k === i)); }; show();
    btns(b, [["◀", () => { i = Math.max(0, i - 1); t = 0; show(); }], ["▶", () => { i = Math.min(PLN.length - 1, i + 1); t = 0; show(); if (i === PLN.length - 1) stamp("planet"); }, "go"], ["おわる", close]]);
    closeFn = () => { w.planetBoost = false; };
    loop((dt) => { t += dt; if (t > 9 && i < PLN.length - 1) { i++; t = 0; show(); if (i === PLN.length - 1) stamp("planet"); } });
  }

  /* ══════════════ 脱出ゲーム ══════════════ */
  function escapeUI() {
    const b = panel("🗝️", "脱出ゲーム", "escape"), stars = 3 + Math.floor(Math.random() * 6), hour = 1 + Math.floor(Math.random() * 9), code = [2, stars, hour, (stars + hour) % 10];
    const dial = [0, 0, 0, 0], t0 = performance.now();
    b.innerHTML = '<p class="pnote">部屋の3つの手がかりを調べて、4けたの暗号でとびらを開けよう。</p><div class="pclues"><button data-c="note">📜 古い手紙</button><button data-c="pic">🖼️ 星の絵</button><button data-c="clock">🕰️ 止まった時計</button></div><div class="pclue"></div><div class="plock"></div>';
    const clue = b.querySelector(".pclue");
    const drawClue = (c) => {
      clue.innerHTML = ""; const cv = mkCanvas(clue, 360, 200), g = cv.g; g.fillStyle = "#1e1812"; g.fillRect(0, 0, 360, 200);
      if (c === "note") { g.fillStyle = "#e8dcc0"; g.fillRect(40, 20, 280, 160); g.fillStyle = "#3a2a1a"; g.font = "700 16px serif"; g.textAlign = "left"; ["暗号の1つめの数は「2」。", "2つめは、絵の中の星の数。", "3つめは、時計の短い針。", "4つめは、2つめと3つめの和の", "いちばん下のけた。"].forEach((l, i) => g.fillText(l, 58, 52 + i * 26)); }
      else if (c === "pic") { g.fillStyle = "#c8a060"; g.fillRect(30, 15, 300, 170); g.fillStyle = "#0a1030"; g.fillRect(42, 27, 276, 146); let h = stars * 7919; const r = () => { h = (h * 16807) % 2147483647; return h / 2147483647; }; for (let i = 0; i < stars; i++) { g.fillStyle = "#ffe04a"; star(g, 70 + r() * 220, 50 + r() * 100, 11); g.fill(); } }
      else { g.fillStyle = "#f6f0e2"; g.beginPath(); g.arc(180, 100, 80, 0, 7); g.fill(); g.strokeStyle = "#3a2a1a"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#3a2a1a"; g.font = "700 14px serif"; g.textAlign = "center"; for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2 - Math.PI / 2; g.fillText(k, 180 + Math.cos(a) * 64, 105 + Math.sin(a) * 64); }
        const ah = (hour / 12) * Math.PI * 2 - Math.PI / 2, am = -Math.PI / 2; g.lineWidth = 6; g.beginPath(); g.moveTo(180, 100); g.lineTo(180 + Math.cos(ah) * 40, 100 + Math.sin(ah) * 40); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(180, 100); g.lineTo(180 + Math.cos(am) * 62, 100 + Math.sin(am) * 62); g.stroke(); }
    };
    b.querySelectorAll(".pclues button").forEach((el) => el.onclick = () => drawClue(el.dataset.c));
    const lock = b.querySelector(".plock");
    const drawLock = () => { lock.innerHTML = dial.map((d, i) => '<div class="dial"><button data-i="' + i + '" data-d="1">▲</button><b>' + d + '</b><button data-i="' + i + '" data-d="-1">▼</button></div>').join("") + '<button class="go open">🔓 あける</button>';
      lock.querySelectorAll(".dial button").forEach((el) => el.onclick = () => { const i = +el.dataset.i; dial[i] = (dial[i] + (+el.dataset.d) + 10) % 10; drawLock(); });
      lock.querySelector(".open").onclick = () => {
        if (dial.join("") === code.join("")) { const sec = Math.round((performance.now() - t0) / 1000), rec = hiscore("escape", sec, true); if (!SV.st.escape) addBag({ n: "脱出の鍵", s: "脱出ゲーム", k: "prize", e: "🗝️" }); stamp("escape"); b.innerHTML = ""; result(b, "脱出成功！", ["かかった時間 " + sec + " 秒"], escapeUI, rec); }
        else { lock.classList.remove("ng"); void lock.offsetWidth; lock.classList.add("ng"); toast("ガチャッ……開かない。手がかりをもう一度見てみよう"); }
      }; };
    drawLock(); drawClue("note");
  }

  /* ══════════════ フリースロー ══════════════ */
  function shootUI() {
    const b = panel("🏀", "フリースロー", "game"), cv = mkCanvas(b, 460, 300), g = cv.g, W = cv.w, H = cv.h;
    let shots = 0, made = 0, st = "aim", t = 0, pw = 0, dir = 1, ball = null, msg = "";
    const shoot = () => { if (st !== "aim") return; st = "fly"; t = 0; const good = Math.abs(pw - 0.68) < 0.06, rim = !good && Math.abs(pw - 0.68) < 0.12 && Math.random() < 0.5; ball = { p: pw, good, in: good || rim }; };
    b.insertAdjacentHTML("beforeend", '<p class="pnote c">ゲージが緑のところで押す（' + (C.MOBILE ? "画面をタップ" : "スペース・E・クリック") + "）。5本勝負。</p>");
    cv.c.addEventListener("pointerdown", shoot); keyFn = (e) => { if (e.code === "Space" || e.code === "KeyE" || e.code === "Enter") shoot(); };
    loop((dt) => {
      t += dt; g.fillStyle = "#d8b27a"; g.fillRect(0, 0, W, H); g.fillStyle = "#c89a5a"; for (let i = 0; i < 12; i++) g.fillRect(i * 40, 0, 2, H); g.fillStyle = "#e8e4dc"; g.fillRect(0, 0, W, 150);
      g.fillStyle = "#fff"; g.fillRect(372, 40, 8, 110); g.fillRect(380, 30, 70, 50); g.strokeStyle = "#e84a3a"; g.lineWidth = 3; g.strokeRect(395, 42, 34, 26); g.fillStyle = "#555"; g.fillRect(370, 150, 12, 150);
      g.strokeStyle = "#e8603a"; g.lineWidth = 4; g.beginPath(); g.moveTo(340, 84); g.lineTo(378, 84); g.stroke(); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(342 + i * 8, 86); g.lineTo(348 + i * 6, 110); g.stroke(); }
      g.fillStyle = "#3a5ad8"; g.beginPath(); g.arc(60, 190, 16, 0, 7); g.fill(); g.fillRect(48, 206, 24, 50);
      if (st === "aim") { pw += dir * dt * 0.9; if (pw > 1) { pw = 1; dir = -1; } if (pw < 0) { pw = 0; dir = 1; } }
      g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(20, 272, 220, 16); const gr = g.createLinearGradient(20, 0, 240, 0); gr.addColorStop(0, "#4a8aff"); gr.addColorStop(0.62, "#4aff8a"); gr.addColorStop(0.74, "#4aff8a"); gr.addColorStop(1, "#ff5a3a"); g.fillStyle = gr; g.fillRect(20, 272, 220 * pw, 16); g.strokeStyle = "#fff"; g.strokeRect(20 + 220 * 0.62, 270, 220 * 0.12, 20);
      let bx = 76, by = 180;
      if (st === "fly") { const k = Math.min(1, t / 0.9), ex = ball.in ? 359 : 330 + (ball.p - 0.68) * 200, ey = 84; bx = 76 + (ex - 76) * k; by = 180 + (ey - 180) * k - Math.sin(k * Math.PI) * (90 + ball.p * 60);
        if (k >= 1) { st = "res"; t = 0; shots++; if (ball.in) made++; msg = ball.good ? "スウィッシュ！" : ball.in ? "リングに当たって…入った！" : "おしい！"; } }
      if (st === "res") { bx = ball.in ? 359 : 330 + (ball.p - 0.68) * 200; by = ball.in ? 84 + t * 200 : 84 + t * 260; g.fillStyle = "#1a2a4a"; g.font = "900 22px sans-serif"; g.textAlign = "center"; g.fillText(msg, W / 2, 130); if (t > 1.2) { if (shots >= 5) { const rec = hiscore("shoot", made); stamp("gym"); result(b, made + " / 5 本", [made === 5 ? "パーフェクト！" : made >= 3 ? "ナイスシュート！" : "つぎはきっと入る！"], shootUI, rec); return false; } st = "aim"; } }
      if (by < H + 20) { g.fillStyle = "#e8742a"; g.beginPath(); g.arc(bx, by, 11, 0, 7); g.fill(); g.strokeStyle = "#5a2a0a"; g.lineWidth = 1.5; g.beginPath(); g.arc(bx, by, 11, 0, 7); g.moveTo(bx - 11, by); g.lineTo(bx + 11, by); g.stroke(); }
      g.fillStyle = "#1a2a4a"; g.font = "800 15px sans-serif"; g.textAlign = "left"; g.fillText("シュート " + shots + " / 5　入った " + made, 14, 24);
    });
  }

  /* ══════════════ 思い出バッグ・スタンプラリー（🎒） ══════════════ */
  const HIN = { rhythm: "スターリズム", karaoke: "カラオケ", target: "ターゲットシュート", whack: "ちょうちんたたき", reflex: "はんのうテスト（ms）", quiz: "ミニクイズ（正解数）", escape: "脱出ゲーム（秒）", shoot: "フリースロー（本）" };
  function bagUI(tab) {
    const b = panel("🎒", "思い出バッグ・スタンプラリー", "bag"); tab = tab || "st";
    const nSt = STAMPS.filter((s) => SV.st[s[0]]).length, areas = XPark.AREAS.filter((a) => a.id !== "marketE"), nAr = areas.filter((a) => SV.ar[a.id]).length;
    b.innerHTML = '<div class="ptabs"><button data-t="st">🏅 スタンプ ' + nSt + "/" + STAMPS.length + '</button><button data-t="ar">🗺️ エリア ' + nAr + "/" + areas.length + '</button><button data-t="bag">🎒 バッグ ' + SV.bag.length + '</button><button data-t="hi">🏆 記録</button></div><div class="ptab"></div>';
    b.querySelectorAll(".ptabs button").forEach((x) => { x.classList.toggle("on", x.dataset.t === tab); x.onclick = () => bagUI(x.dataset.t); });
    const P = b.querySelector(".ptab");
    if (tab === "st") P.innerHTML = '<p class="pnote">建物の中の「できること」を使うとスタンプがもらえます。</p><div class="pstamps">' + STAMPS.map((s) => '<div class="' + (SV.st[s[0]] ? "on" : "") + '"><i>' + (SV.st[s[0]] ? s[1] : "？") + "</i><small>" + s[2] + "</small></div>").join("") + "</div>";
    else if (tab === "ar") { P.innerHTML = '<p class="pnote">行ったことのあるエリア。押すとワープします。</p><div class="pstamps area">' + areas.map((a, i) => '<button data-i="' + i + '" class="' + (SV.ar[a.id] ? "on" : "") + '" style="--c:' + a.c + '"><i>' + (SV.ar[a.id] ? (AICON[a.id] || "📍") : a.n) + "</i><small>" + a.n + " " + esc(AJP[a.id] || a.name) + "</small></button>").join("") + "</div>";
      P.querySelectorAll("button").forEach((x) => x.onclick = () => { warpArea(areas[+x.dataset.i]); close(); }); }
    else if (tab === "bag") { if (!SV.bag.length) P.innerHTML = '<p class="pnote">まだ何も入っていません。お店やカプセルトイで集めよう。</p>';
      else { const grp = {}; SV.bag.forEach((q) => { const k = q.n; grp[k] = grp[k] || { q, n: 0 }; grp[k].n++; }); P.innerHTML = '<div class="pbag">' + Object.values(grp).map(({ q, n }) => '<div><span>' + (q.e || "🎁") + "</span><b>" + esc(q.n) + (q.r ? ' <em class="r' + q.r + '">' + q.r + "</em>" : "") + "</b><small>" + esc(q.s || "") + (n > 1 ? "　×" + n : "") + "</small></div>").join("") + "</div>"; } }
    else P.innerHTML = '<div class="phi">' + Object.keys(HIN).map((k) => "<div><b>" + HIN[k] + "</b><span>" + (SV.hi[k] != null ? SV.hi[k] : "—") + "</span></div>").join("") + "</div>";
  }

  /* ══════════════ 地図（見やすく：番号の丸・大きな文字・押してワープ） ══════════════ */
  const AJP = { gate: "ゲート", metro: "メトロポリス", tower: "タワー", marketW: "マーケット", lab: "ラボ", space: "宇宙港", adv: "アドベンチャー", game: "ゲームワールド", learn: "学びの街", ent: "エンタメ地区", fountain: "中央噴水公園",
    sports: "スポーツワールド", boccia: "ボッチャアリーナ", soccer: "サッカースタジアム", motor: "モーターシティ", aqua: "アクア", beach: "ビーチ", green: "グリーンウォーク", resort: "リゾート", night: "ナイトゾーン", puzzle: "パズルシティ", media: "メディアシティ", harbor: "ハーバー（湖の港町）", dome: "XEVARION ドーム", kabuki: "妖魔歌舞伎町", yukaku: "夜桜遊郭", ngx: "NGX 本社", apps: "アプリの通り", yokai: "妖怪商店街", heights: "フューチャーハイツ", shrine: "妖怪神社の森", ballpark: "XEVARION ボールパーク", ngxcity: "NGX シティ", wonder: "妖怪ワンダーランド", onsen: "妖魔温泉街", sky: "スカイガーデン" };
  const AICON = { gate: "🎫", metro: "🏙️", tower: "🗼", marketW: "🏮", lab: "🧪", space: "🚀", adv: "🎢", game: "🕹️", learn: "📚", ent: "🎭", fountain: "⛲", sports: "🏅", boccia: "🎯", soccer: "⚽", motor: "🏎️", aqua: "🌊", beach: "🏖️", green: "🌳", resort: "🏨", night: "🌙", puzzle: "🧩", media: "🎬", harbor: "🛳️", dome: "🏟️", kabuki: "🏮", yukaku: "🌸", ngx: "🏢", apps: "📱", yokai: "🏮", heights: "🌆", shrine: "⛩️", ballpark: "⚾", ngxcity: "🏙️", wonder: "🎠", onsen: "♨️", sky: "🌿" };
  const AHI = { gate: "チケット・おみやげ・大門", metro: "展望タワー・ショッピング", tower: "地上125mの展望台", marketW: "妖魔横丁の食べ歩き・お店", lab: "研究センター・ロボット工場", space: "宇宙港ターミナル・ロケット", adv: "コースター・急流すべり・フリーフォール",
    game: "ゲームアリーナ・ガチャランド", learn: "アカデミー・図書館・プラネタリウム", ent: "劇場・ライブ・シネマ", fountain: "噴水のショー・パレード", sports: "スポーツホール・体育館", boccia: "ボッチャの試合", soccer: "サッカーの試合",
    motor: "カートレース・EV ショールーム", aqua: "プール・スライダー・カフェ", beach: "桟橋の夕日・海の家", green: "花の小道", resort: "ホテル・スパ・ヴィラ", night: "ネオン街・お化け屋敷・カラオケ", puzzle: "迷路・なぞときの家", media: "IMAX シアター・撮影スタジオ", harbor: "大きな湖・蒸気船・夜の水上パレード", dome: "巨大ライブ会場（東京ドームくらい）", kabuki: "看板のビル街・化け猫のタワー・横丁", yukaku: "茶屋・芝居小屋・夜桜・五重の大楼", ngx: "250m の本社タワー・展望フロア・会議棟", apps: "アプリごとの建物・入るとアプリへ", yokai: "アーケードの商店街・駄菓子・銭湯", heights: "90〜150m の高層ビル街", shrine: "千本鳥居・五重塔・おみくじ", ballpark: "野球場（MagiDiamond）", ngxcity: "ガラス屋根の大モール・超高層ビル 6 本", wonder: "メリーゴーラウンド・カップ・スイング・妖怪船・コースター", onsen: "旅館・大浴場・足湯・湯けむり", sky: "ねじれた塔と高さ 64m の空中庭園" };
  function placeOf(a) { const pl = (C.world.places || []).find((p) => String(p[0]).trim().startsWith(a.n + " ")); return pl || [a.name, a.cx, a.cz, 0]; }
  function warpArea(a) { const p = placeOf(a); C.warp(p[1], p[2], p[3], a.n + " " + (AJP[a.id] || a.name)); }
  const MAP = { sel: null, cx: 0, cz: 190, s: 0, drag: null };
  function mapUI() {
    MAP.fitted = false;
    const b = panel("🗺️", "XEVARION PARK マップ", "map");
    b.innerHTML = '<div class="pmap"><div class="pmapv"><canvas></canvas><div class="pmz"><button data-z="1">＋</button><button data-z="-1">−</button><button data-z="0" title="いまいる所">⌖</button><button data-z="2" title="全体を見る">⛶</button></div><div class="pmsel"></div></div><div class="pmlist"></div></div>';
    const cvs = b.querySelector("canvas"), view = b.querySelector(".pmapv"), selEl = b.querySelector(".pmsel"), areas = XPark.AREAS.filter((a) => a.id !== "marketE");
    const hall = { id: "hall", n: 11, name: "XEVARION HALL", cx: 0, cz: -20, c: "#6a7ae8" };
    const all = areas.concat([hall]).sort((p, q) => p.n - q.n); AJP.hall = "ホール（会議・展示）"; AICON.hall = "🏛️"; AHI.hall = "基調講演・展示ホール・カフェ";
    /* ★★ 2026-09-30b ご指定「レースやジェットコースターなどの乗り場にそれぞれワープ」：エリアの一覧と、乗り場の一覧（タブで切りかえ） */
    const rides = (C.world.inter || []).filter((it) => /乗る|すべる|のる|レース|グランプリ/.test(it.label || "")).filter((it) => { let r = null; try { r = it.act(); } catch (e) {} return !!(r && (r.rideId || r.game === "kart")); })
      .map((it) => { const ar = C.world.areaName ? C.world.areaName(it.x, it.z) : null; return { it, ar, nm: String(it.label).replace(/（.*$/, "").replace(/に乗る$|をすべる$|に出る$/, "") }; })
      .sort((p, q) => (/グランプリ|レース/.test(q.it.label) ? 1 : 0) - (/グランプリ|レース/.test(p.it.label) ? 1 : 0) || (/コースター/.test(q.it.label) ? 1 : 0) - (/コースター/.test(p.it.label) ? 1 : 0) || ((p.ar && p.ar.n) || 99) - ((q.ar && q.ar.n) || 99));
    const listAreas = () => '<div class="pmtabs"><i data-t="a" class="on">🗺️ エリア</i><i data-t="r">🎢 乗り場（' + rides.length + '）</i></div>' + all.map((a, i) => '<button data-i="' + i + '" style="--c:' + a.c + '"><em>' + a.n + "</em><span>" + (AICON[a.id] || "📍") + "</span><b>" + esc(AJP[a.id] || a.name) + "</b><small>" + esc(AHI[a.id] || "") + "</small></button>").join("");
    const listRides = () => '<div class="pmtabs"><i data-t="a">🗺️ エリア</i><i data-t="r" class="on">🎢 乗り場（' + rides.length + '）</i></div>' + rides.map((r, i) => '<button class="ride" data-r="' + i + '"><span>' + esc(r.it.icon || "🎢") + "</span><b>" + esc(r.nm) + "</b><small>" + esc(r.ar ? r.ar.n + " " + (AJP[r.ar.id] || r.ar.name) : "") + "　▶ 乗り場へワープ</small></button>").join("");
    const setList = (t) => { const L = b.querySelector(".pmlist"); L.innerHTML = t === "r" ? listRides() : listAreas(); L.scrollTop = 0;
      L.querySelectorAll(".pmtabs i").forEach((x) => x.onclick = () => setList(x.dataset.t));
      L.querySelectorAll("button[data-i]").forEach((x) => x.onclick = () => select(all[+x.dataset.i], true));
      L.querySelectorAll("button[data-r]").forEach((x) => x.onclick = () => { const r = rides[+x.dataset.r], it = r.it, wp = it.warp || [it.x, it.z, 0]; C.warp(wp[0], wp[1], wp[2], (it.icon || "🎢") + " " + r.nm + " の乗り場"); close(); }); };
    b.querySelector(".pmlist").innerHTML = "";
    let W = 0, H = 0, k = 1;
    const fit = () => { const r = view.getBoundingClientRect(); W = Math.max(200, r.width); H = Math.max(200, r.height); k = Math.min(2, devicePixelRatio || 1); cvs.width = W * k; cvs.height = H * k; cvs.style.width = W + "px"; cvs.style.height = H + "px"; if (!MAP.fitted) { MAP.fitted = true; whole(); } };
    const whole = () => { MAP.s = Math.min(W / 1860, (H - 70) / 1790); MAP.cx = 0; MAP.cz = 190 + 35 / MAP.s; };
    const P = (x, z) => [(x - MAP.cx) * MAP.s + W / 2, (z - MAP.cz) * MAP.s + H / 2];
    const Q = (px, py) => [(px - W / 2) / MAP.s + MAP.cx, (py - H / 2) / MAP.s + MAP.cz];
    const select = (a, center) => { MAP.sel = a; if (center) { MAP.cx = a.cx; MAP.cz = a.cz; MAP.s = Math.max(MAP.s, Math.min(W, H) / 700); }
      selEl.innerHTML = a ? '<div style="--c:' + a.c + '"><em>' + a.n + "</em><span>" + (AICON[a.id] || "📍") + "</span><div><b>" + esc(AJP[a.id] || a.name) + "</b><small>" + esc(a.name) + "　" + esc(AHI[a.id] || "") + '</small></div><button class="go">ここへワープ</button></div>' : "";
      const wb = selEl.querySelector("button"); if (wb) wb.onclick = () => { if (a.id === "hall") { const p = (C.world.places || []).find((q) => /^11 /.test(q[0])); if (p) C.warp(p[1], p[2], p[3], "11 ホール"); } else warpArea(a); close(); };
      b.querySelectorAll(".pmlist button").forEach((x) => x.classList.toggle("on", all[+x.dataset.i] === a)); draw(); };
    function draw() {
      const g = cvs.getContext("2d"); g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, W, H);
      const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, "#0e4a8a"); sea.addColorStop(1, "#1a78b8"); g.fillStyle = sea; g.fillRect(0, 0, W, H);
      const bm = C.baseMap(), MB = C.mapBounds, [x0, y0] = P(MB.x0, MB.z0), [x1] = P(MB.x1, MB.z0); g.imageSmoothingEnabled = true; g.drawImage(bm, x0, y0, x1 - x0, x1 - x0);
      areas.forEach((a) => { const [p0, q0] = P(a.x0, a.z0), [p1, q1] = P(a.x1, a.z1); g.strokeStyle = a.c; g.lineWidth = a === MAP.sel ? 4 : 2; g.globalAlpha = a === MAP.sel ? 1 : 0.8; g.setLineDash(a === MAP.sel ? [] : [6, 4]); rr(g, p0, q0, p1 - p0, q1 - q0, 8); g.stroke(); if (a === MAP.sel) { g.fillStyle = a.c; g.globalAlpha = 0.22; g.fill(); } g.globalAlpha = 1; g.setLineDash([]); });
      const big = MAP.s * 1840 > 900;
      all.forEach((a) => { const [px, py] = P(a.cx, a.cz), sel = a === MAP.sel, r = sel ? 17 : 14;
        g.fillStyle = "rgba(0,0,0,.35)"; g.beginPath(); g.arc(px + 1.5, py + 2, r, 0, 7); g.fill(); g.fillStyle = a.c; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = sel ? 3.5 : 2.5; g.stroke();
        g.fillStyle = "#fff"; g.font = "900 " + (sel ? 15 : 13) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(a.n, px, py + 0.5); g.textBaseline = "alphabetic";
        const lab = AJP[a.id] || a.name; g.font = "900 " + (big ? 14 : 12) + "px sans-serif"; g.lineWidth = 4; g.strokeStyle = "rgba(6,16,48,.85)"; g.strokeText(lab, px, py + r + 15); g.fillText(lab, px, py + r + 15); });
      /* ★★ 2026-09-29c モノレール・路面電車の駅の名前（近づいたとき） */
      if (MAP.s > 0.9 && window.XTransit) XTransit.lines.forEach((Ln) => Ln.stops.forEach((st) => { const i = Math.round(st.sC / Ln.A.ds), [px, py] = P(Ln.A.P[i * 3], Ln.A.P[i * 3 + 2]); g.font = "900 11px sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.lineWidth = 3.5; g.strokeStyle = "rgba(255,255,255,.95)"; const t = Ln.icon + " " + st.name; g.strokeText(t, px + 9, py); g.fillStyle = Ln.color; g.fillText(t, px + 9, py); }));
      const pl = C.player, [qx, qy] = P(pl.x, pl.z); g.save(); g.translate(qx, qy); g.rotate(-pl.yaw + Math.PI); g.fillStyle = "#ff4f8f"; g.strokeStyle = "#fff"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
      g.font = "900 12px sans-serif"; g.textAlign = "center"; g.lineWidth = 4; g.strokeStyle = "#fff"; g.strokeText("いまここ", qx, qy - 18); g.fillStyle = "#e8286a"; g.fillText("いまここ", qx, qy - 18);
    }
    const zoom = (f, px, py) => { const [wx, wz] = Q(px == null ? W / 2 : px, py == null ? H / 2 : py); MAP.s = Math.max(Math.min(W / 1840, H / 1780) * 0.8, Math.min(3, MAP.s * f)); const [nx, nz] = Q(px == null ? W / 2 : px, py == null ? H / 2 : py); MAP.cx += wx - nx; MAP.cz += wz - nz; draw(); };
    b.querySelectorAll(".pmz button").forEach((x) => x.onclick = () => { const z = +x.dataset.z; if (z === 0) { MAP.cx = C.player.x; MAP.cz = C.player.z; MAP.s = Math.max(MAP.s, Math.min(W, H) / 600); draw(); } else if (z === 2) { whole(); draw(); } else zoom(z > 0 ? 1.4 : 1 / 1.4); });
    setList("a");
    const ptr = {}; let pinch = 0, moved = 0;
    cvs.addEventListener("pointerdown", (e) => { cvs.setPointerCapture(e.pointerId); ptr[e.pointerId] = [e.clientX, e.clientY]; moved = 0; });
    cvs.addEventListener("pointermove", (e) => { if (!ptr[e.pointerId]) return; const ids = Object.keys(ptr);
      if (ids.length >= 2) { const a = ptr[ids[0]], c2 = ptr[ids[1]]; ptr[e.pointerId] = [e.clientX, e.clientY]; const d = Math.hypot(a[0] - c2[0], a[1] - c2[1]); if (pinch) zoom(d / pinch); pinch = d; moved = 99; return; }
      const [ox, oy] = ptr[e.pointerId], dx = e.clientX - ox, dy = e.clientY - oy; ptr[e.pointerId] = [e.clientX, e.clientY]; moved += Math.abs(dx) + Math.abs(dy); MAP.cx -= dx / MAP.s; MAP.cz -= dy / MAP.s; draw(); });
    const up = (e) => { if (!ptr[e.pointerId]) return; delete ptr[e.pointerId]; pinch = 0;
      if (moved < 8) { const r = cvs.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; let best = null, bd = 30; all.forEach((a) => { const [ax, ay] = P(a.cx, a.cz), d = Math.hypot(ax - px, ay - py); if (d < bd) { bd = d; best = a; } });
        if (!best) { const [wx, wz] = Q(px, py); best = areas.find((a) => wx > a.x0 && wx < a.x1 && wz > a.z0 && wz < a.z1) || null; } select(best, false); } };
    cvs.addEventListener("pointerup", up); cvs.addEventListener("pointercancel", up);
    cvs.addEventListener("wheel", (e) => { e.preventDefault(); const r = cvs.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    const ro = new ResizeObserver(() => { fit(); draw(); }); ro.observe(view); closeFn = () => ro.disconnect();
    requestAnimationFrame(() => { fit(); const cur = C.world.areaName ? C.world.areaName(C.player.x, C.player.z) : null; select(cur && cur.id !== "marketE" ? cur : cur && cur.id === "marketE" ? areas.find((a) => a.id === "marketW") : null, false); });
  }

  /* ══════════════ 上空から見ているときの「場所の札」（押すとそこへ） ══════════════ */
  let tags = null; const v3 = new THREE.Vector3();
  function skyTags(on, camera) {
    const box = $("skyTags"); if (!box) return;
    if (!on) { if (tags) box.style.display = "none"; return; }
    if (!tags) {
      const all = XPark.AREAS.filter((a) => a.id !== "marketE").concat([{ id: "hall", n: 11, name: "HALL", cx: 0, cz: -20, c: "#6a7ae8" }]); AJP.hall = AJP.hall || "ホール"; AICON.hall = AICON.hall || "🏛️";
      box.innerHTML = all.map((a, i) => '<button data-i="' + i + '" style="--c:' + a.c + '"><em>' + a.n + "</em>" + (AICON[a.id] || "") + " " + esc(AJP[a.id] || a.name) + "</button>").join("");
      tags = all.map((a, i) => ({ a, el: box.children[i] }));
      tags.forEach((q) => q.el.onclick = () => { C.skyExit(); if (q.a.id === "hall") { const p = (C.world.places || []).find((x) => /^11 /.test(x[0])); if (p) C.warp(p[1], p[2], p[3], "11 ホール"); } else warpArea(q.a); });
    }
    box.style.display = "";
    for (const q of tags) { v3.set(q.a.cx, 12, q.a.cz).project(camera); const vis = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05; q.el.style.display = vis ? "" : "none"; if (vis) q.el.style.transform = "translate(" + ((v3.x * 0.5 + 0.5) * innerWidth).toFixed(1) + "px," + ((-v3.y * 0.5 + 0.5) * innerHeight).toFixed(1) + "px) translate(-50%,-50%)"; }
  }

  /* ══════════════ 設定（キーの割り当て・音・視点・画質） ══════════════ */
  function settingsUI(S) {
    const b = panel("⚙️", "設定", "settings pset");
    let wait = null;
    const draw = () => {
      const q = S.quality();
      b.innerHTML = '<h3>⌨️ キーの割り当て（右のボタン）</h3><p class="pnote">変えたい所を押してから、使いたいキーを押してください（Esc でやめる）。WASD・E・スペース・Shift は移動と決定に使うので割り当てられません。</p><div class="pkeys">' +
        S.list.map(([a, lab]) => '<b>' + esc(lab) + '</b><button data-a="' + a + '"' + (wait === a ? ' class="wait"' : "") + ">" + (wait === a ? "キーを押す…" : esc(S.name(S.get(a)))) + "</button>").join("") +
        '</div><div class="pbtns"><button class="reset">はじめの割り当てにもどす</button></div>' +
        '<h3>🎵 音楽</h3><label class="row"><input type="checkbox" class="mus"' + (S.music() ? " checked" : "") + '> パークの音楽を鳴らす</label><label class="row">音量 <input type="range" class="vol" min="0" max="1" step="0.05" value="' + S.vol() + '"></label>' +
        '<h3>🎥 視点</h3><label class="row"><input type="checkbox" class="fp"' + (S.fp() ? " checked" : "") + '> 一人称視点（目の高さから見る）</label><label class="row">見回す速さ <input type="range" class="sens" min="0.4" max="2.2" step="0.1" value="' + S.sens() + '"></label>' +
        '<h3>✨ 画質</h3><label class="row">画質 <select class="ql">' + q.levels.map((l) => '<option value="' + l + '"' + (l === q.level ? " selected" : "") + ">" + ({ ultra: "最高", high: "高", medium: "中", low: "低" }[l] || l) + "</option>").join("") + '</select></label><label class="row"><input type="checkbox" class="qa"' + (q.auto ? " checked" : "") + "> 重いときは自動で下げる</label>";
      b.querySelectorAll(".pkeys button").forEach((x) => x.onclick = () => { wait = wait === x.dataset.a ? null : x.dataset.a; draw(); });
      b.querySelector(".reset").onclick = () => { S.reset(); wait = null; draw(); toast("キーの割り当てをはじめにもどしました"); };
      b.querySelector(".mus").onchange = (e) => S.setMusicOn(e.target.checked);
      b.querySelector(".vol").oninput = (e) => S.setVol(+e.target.value);
      b.querySelector(".fp").onchange = (e) => S.setFP(e.target.checked);
      b.querySelector(".sens").oninput = (e) => S.setSens(+e.target.value);
      b.querySelector(".ql").onchange = (e) => S.setQuality(e.target.value, b.querySelector(".qa").checked);
      b.querySelector(".qa").onchange = (e) => S.setQuality(b.querySelector(".ql").value, e.target.checked);
    };
    keyFn = (e) => {
      if (!wait) return;
      if (e.code === "Escape") { wait = null; draw(); return; }
      if (S.reserved.indexOf(e.code) >= 0) { toast("そのキーは移動・決定に使うので割り当てられません"); return; }
      e.preventDefault(); S.set(wait, e.code); toast(esc(S.list.find((q) => q[0] === wait)[1]) + " を「" + S.name(e.code) + "」にしました"); wait = null; draw();
    };
    draw();
  }

  /* ══════════════ main.js から ══════════════ */
  /* ★ 2026-09-29d ロビー左の「アップデート情報」ブース：ぜんぶの一覧（アプリを開ける） */
  function updatesUI() {
    const D = window.EXPO_DATA || {}, ups = (D.updates || []).slice(0, 24), rel = D.release || {};
    const b = panel("🆕", "アップデート情報（最新 " + ups.length + " 件）", "updates");
    let html = "";
    if (rel.title) html += '<div class="pupd rel"><em>最新バージョン ' + esc(rel.version || "") + "　" + esc(rel.date || "") + "</em><b>" + esc(rel.title) + "</b>" + (rel.notes || []).slice(0, 8).map((n) => "<small>・" + esc(n) + "</small>").join("") + "</div>";
    html += ups.map((u, i) => '<div class="pupd"><em>' + esc(u.at || "") + '</em><div class="pu2">' + (u.img ? '<img src="../' + esc(u.img) + '" alt="" loading="lazy">' : "") + "<div><b>" + esc(u.t1 || "") + "</b>" + String(u.t2 || "").split("／").filter(Boolean).slice(0, 8).map((p) => "<small>・" + esc(p) + "</small>").join("") + (u.href ? '<button data-i="' + i + '">このアプリを開く</button>' : "") + "</div></div></div>").join("");
    b.innerHTML = html || '<p class="pnote c">まだありません</p>';
    b.querySelectorAll("button[data-i]").forEach((x) => x.onclick = () => { const u = ups[+x.dataset.i]; if (u && u.href && C.openApp) { close(); C.openApp(u.href, u); } });
  }
  function handle(r, q) {
    if (!r) return false;
    const type = q && q.type ? q.type : null;
    if (r.updates) { updatesUI(); return true; }
    if (r.shop) { shopUI(r.shop, type); return true; }
    if (r.arcade) { arcadeUI(r.arcade.name); return true; }
    if (r.capsule) { capsuleUI(r.capsule.name); return true; }
    if (r.gallery) { galleryUI(r.gallery.name, r.gallery.list, type); return true; }
    if (r.lobby) { lobbyUI(r.lobby, type); return true; }
    if (r.learn) { learnUI(r.learn, type); return true; }
    if (r.lab) { labUI(r.lab.name); return true; }
    if (r.karaoke) { karaokeUI(r.karaoke.name); return true; }
    if (r.rest) { restUI(r.rest); return true; }
    if (r.haunted) { hauntedUI(r.haunted.name); return true; }
    if (r.photo) { photoUI(r.photo); return true; }
    if (r.planet) { planetUI(r.planet.name); return true; }
    if (r.game === "quiz") { quizUI("クイズドーム"); return true; }
    if (r.game === "escape") { escapeUI(); return true; }
    if (r.game === "shoot") { shootUI(); return true; }
    if (r.video && type === "theater") stamp("theater");
    return false;
  }
  function init(ctx) {
    C = ctx;
    const d = document.createElement("div");
    d.innerHTML = '<div id="pui" class="ov pui"><div class="pcard"><div class="phd"><i class="pic"></i><b class="pti"></b><button class="x" aria-label="閉じる">✕</button></div><div class="pbody"></div></div></div>' +
      '<div id="pstamp"></div><div id="pparty"></div><div id="pflash"></div><div id="pcount"></div><div id="skyTags"></div>';
    while (d.firstChild) document.body.appendChild(d.firstChild);
    $("pui").querySelector(".x").onclick = close;
    $("pui").addEventListener("pointerdown", (e) => { if (e.target.id === "pui" && !$("pui").classList.contains("dock")) close(); });
  }
  let lastArea = null;
  function area(a) { if (!a) return; const id = a.id === "marketE" ? "marketW" : a.id; if (id === lastArea) return; lastArea = id; if (!SV.ar[id]) { SV.ar[id] = Date.now(); save(); const n = XPark.AREAS.filter((q) => q.id !== "marketE" && SV.ar[q.id]).length; if (n > 1) pop(AICON[id] || "📍", (AJP[id] || a.name) + " にはじめて来ました", "エリア " + n + " / " + (XPark.AREAS.length - 1)); } }
  window.XParkUI = { init, handle, close, busy, key: (e) => { if (keyFn) keyFn(e); }, map: mapUI, bag: bagUI, settings: settingsUI, skyTags, area, stamp, SV, panel, btns, mkCanvas, AJP, AICON, AHI };
})();

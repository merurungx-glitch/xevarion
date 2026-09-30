/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 夜桜キャッスルホテル 6F「大人のギャラリー」（18歳以上）
   （★★ 2026-09-30b ご指定「遊郭では大人向けの作品の紹介やサンプル掲示をホールのように沢山表示してください」）
   ------------------------------------------------------------------
   ・6F に上がる前に年齢の確認（18歳以上）。MagiScope で確認ずみなら、そのまま入れる。「いいえ」なら入らない。
   ・部屋の壁いっぱいに、MagiScope のランキング（FANZA 同人・DLsite・同人アニメ）の作品の表紙。下に順位・題名・サークル。
     表紙はお店のサーバーの画像（WebGL の絵にできない）→ 壁の額の中を「窓」（色も透明度も 0 を書く）にして、
     キャンバスのうしろに <img> を重ねる（ライブの動画と同じしくみ）。人やキャラが額の前に来れば、ちゃんと前に見える。
   ・額の前で E：その列の作品の紹介（表紙・サンプル画像・サークル・ジャンル・お店のページ）。奥の案内で E：一覧（さがせる）。
   ・★ 未成年を思わせる題名・ジャンル・サークル名（学生・制服・学園・妹・ロリ・ショタ・小柄…）の作品と、
     無理やり・暴力などの作品は、ゆるめにではなく広めにのぞく。ジャンルの情報がない商業作品は使わない。
   ・建物の外・ロビーには成人向けの画像は出さない（文字の案内だけ）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE;
  const AGE_KEY = "xeva_park_age18";
  const BASE = () => String(window.MS_DATA || "https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/").replace(/\/?$/, "/");
  const SRC = [["fanza", "lists/fanza_overall.json", "FANZA同人"], ["dlsite", "lists/dlsite_overall.json", "DLsite"], ["danime", "lists/danime_overall.json", "同人アニメ"]];
  /* 未成年を思わせる言葉（題名・サークル・作者・ジャンル・テーマ・シリーズ）＝広めにのぞく */
  const MINOR = /ロリ|ろり|ょうじょ|幼|少女|少年|ショタ|しょた|子供|子ども|こども|園児|保育|小学|中学|高校|女子校|女子高|女子中|男子校|JK|JC|JS|ＪＫ|ＪＣ|ＪＳ|学生|学園|学校|制服|セーラー|ブレザー|体操着|ブルマ|スク水|ランドセル|つるぺた|ぺったん|ちっぱい|貧乳|微乳|ミニ系|低身長|ちび|小柄|小さな|ちいさな|幼なじみ|幼馴染|同級生|後輩|先輩|部活|教室|担任|生徒|教師|魔法少女|妹|弟|姪|甥|娘|歳の差|年の差|体格差|年下|メスガキ|わからせ|ペド|児童|未成年|おさな|赤ちゃん|キッズ|ジュニア|ロリータ|息子|近親|loli|shota|teen|school|student|little|young|kid|child|petite|tiny|daughter|sister|brother|niece|nephew|junior/i;
  /* 無理やり・暴力など */
  const HARSH = /睡眠姦|昏睡|洗脳|監禁|強制|無理矢理|無理やり|レイプ|強姦|凌辱|陵辱|催眠|常識改変|モブ姦|輪姦|鬼畜|拷問|リョナ|獣姦|スカトロ|異種姦|機械姦|触手|痴漢|盗撮|脅迫|調教|奴隷|肉便器|人格排泄|屈辱|暴力|苗床|出産|ゴブリン|オーク|rape|forced|hypno|slave|captive|tentacle|goblin|orc|breed|abuse|torture|monster/i;
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  const A = { data: null, loading: null, frames: [], imgs: null, wall: null, tCv: null, tTex: null };

  /* ══════════════ 年齢の確認 ══════════════ */
  function ok() { try { if (localStorage.getItem(AGE_KEY) === "1") return true; const m = JSON.parse(localStorage.getItem("magiscope_v1") || "null"); return !!(m && m.age); } catch (e) { return false; } }
  function ask(then) {
    const U = window.XParkUI; if (!U) return;
    const b = U.panel("🔞", "年齢の確認（18歳以上）", "age");
    b.innerHTML = '<p class="pnote" style="font-size:14px;line-height:1.85">この先の <b>6F「大人のギャラリー」</b>には、成人向けの作品（表紙・サンプル画像）が表示されます。<br>あなたは <b>18歳以上</b> ですか？</p><p class="pnote" style="font-size:12px;color:#8a8aa8">MagiScope のランキングのデータです。未成年を思わせる作品・無理やりの作品はのぞいています。</p>';
    U.btns(b, [["いいえ（入らない）", () => U.close()], ["はい（18歳以上）", () => { try { localStorage.setItem(AGE_KEY, "1"); } catch (e) {} U.close(); if (then) then(); }, "go"]]);
  }

  /* ══════════════ データ（MagiScope のランキング） ══════════════ */
  const textOf = (o) => [o.title, o.circle, o.author, (o.genres || []).join(" "), o.theme, o.series, o.kind].filter(Boolean).join(" ");
  const safe = (o) => o && o.title && /^https:\/\//.test(o.image || "") && Array.isArray(o.genres) && o.genres.length > 0 && !MINOR.test(textOf(o)) && !HARSH.test(textOf(o));
  function load() {
    if (A.data) return Promise.resolve(A.data);
    if (A.loading) return A.loading;
    A.loading = Promise.all(SRC.map(([id, f, nm]) => fetch(BASE() + f, { cache: "force-cache" }).then((r) => (r.ok ? r.json() : null)).then((j) => ((j && j.entries) || []).map((o) => Object.assign({}, o, { src: id, srcName: nm }))).catch(() => [])))
      .then((lists) => {
        const clean = lists.map((L) => L.filter(safe).sort((p, q) => (p.rank || 999) - (q.rank || 999)));
        const out = [], seen = new Set();
        for (let i = 0; i < 400; i++) { let any = false; clean.forEach((L) => { const o = L[i]; if (!o) return; any = true; const k = String(o.title).replace(/\s+/g, ""); if (seen.has(k)) return; seen.add(k); o.samples = (o.samples || []).filter((u) => /^https:\/\//.test(u)).slice(0, 8); out.push(o); }); if (!any) break; }
        A.data = out; return out;
      });
    A.loading.catch(() => { A.loading = null; });
    return A.loading;
  }

  /* ══════════════ 部屋（park_rooms.js の type "adult" から呼ばれる） ══════════════ */
  const HOLE = new T.MeshBasicMaterial({ color: 0x000000, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.ZeroFactor, blendDst: T.ZeroFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.ZeroFactor, toneMapped: false, fog: false });
  const WAIT = new T.MeshBasicMaterial({ color: 0x1a0a26, toneMapped: false, fog: false });
  const FW = 1.45, FH = 2.0, EW = 360, EH = 496, COLS = 8, CW = 256, CH = 102;
  function room(C) {
    const { G, W, iw, id, hi, L } = C;
    A.frames = []; A.imgs = null; if (A.wall) A.wall.innerHTML = "";
    const rows = [1.95, Math.min(4.55, hi - 0.55)], spots = [];
    { const a0 = -iw / 2 + 1.9, a1 = iw / 2 - 4.6, n = Math.max(3, Math.floor((a1 - a0) / 2.75) + 1); for (let i = 0; i < n; i++) spots.push({ a: a0 + (a1 - a0) * i / (n - 1), b: -id / 2 + 0.16, ry: 0 }); }
    [-1, 1].forEach((sd) => { const b0 = -id / 2 + 2.3, b1 = id / 2 - 3.6, n = Math.max(3, Math.floor((b1 - b0) / 2.75) + 1); for (let i = 0; i < n; i++) spots.push({ a: sd * (iw / 2 - 0.16), b: b0 + (b1 - b0) * i / (n - 1), ry: -sd * Math.PI / 2 }); });
    const cv = A.tCv || (A.tCv = document.createElement("canvas")); cv.width = 2048; cv.height = 1024;
    const tTex = new T.CanvasTexture(cv); tTex.colorSpace = T.SRGBColorSpace; A.tTex = tTex;
    const tMat = new T.MeshBasicMaterial({ map: tTex, toneMapped: false, fog: false });
    let k = 0;
    spots.forEach((sp) => {
      const nx = Math.sin(sp.ry), nz = Math.cos(sp.ry), col = [];
      rows.forEach((y) => {
        const [px, pz] = L(sp.a, sp.b);
        G("goldOrn", new T.BoxGeometry(FW + 0.26, FH + 0.26, 0.08).rotateY(sp.ry).translate(sp.a + nx * 0.02, y, sp.b + nz * 0.02));
        G("pBlack", new T.BoxGeometry(FW + 0.06, FH + 0.06, 0.1).rotateY(sp.ry).translate(sp.a + nx * 0.04, y, sp.b + nz * 0.04));
        const m = new T.Mesh(new T.PlaneGeometry(FW, FH), WAIT); m.position.set(px + nx * 0.1, y, pz + nz * 0.1); m.rotation.y = sp.ry; W.scene.add(m);
        const ci = k % COLS, ri = Math.floor(k / COLS), g2 = new T.PlaneGeometry(FW + 0.2, 0.58), uv = g2.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (ci + uv.getX(i)) * CW / 2048, 1 - (ri + 1 - uv.getY(i)) * CH / 1024);
        const tm = new T.Mesh(g2, tMat); tm.position.set(px + nx * 0.09, y - FH / 2 - 0.35, pz + nz * 0.09); tm.rotation.y = sp.ry; W.scene.add(tm);
        A.frames.push({ m, k }); col.push(k); k++;
      });
      const it = C.act(sp.a + nx * 1.7, sp.b + nz * 1.7, 1.6, "作品の紹介を見る（18歳以上）", () => ({ adultWork: col }), "🔞"); A.frames[col[0]].it = it;
    });
    /* まん中：見る人のベンチ・ネオンの柱 */
    [-1, 1].forEach((s) => { const a = s * Math.min(5, iw / 5); G("fabricB", new T.BoxGeometry(3.4, 0.44, 1.0).translate(a, 0.22, 1.2)); C.seat(a - 0.8, 1.2, 0, 0.45); C.seat(a + 0.8, 1.2, 0, 0.45); C.seat(a - 0.8, 1.2, Math.PI, 0.45); C.seat(a + 0.8, 1.2, Math.PI, 0.45); C.col(a, 1.2, 3.5, 1.1); });
    G("neonPink", new T.CylinderGeometry(0.12, 0.12, hi - 0.4, 8).translate(0, (hi - 0.4) / 2, 1.2)); G("goldOrn", new T.CylinderGeometry(0.5, 0.6, 0.3, 16).translate(0, 0.15, 1.2)); C.col(0, 1.2, 1.2, 1.2);
    C.sign("ADULT GALLERY  18+", { bg: "#2a0a2a", color: "#ffd0f0", glow: "#ff4fb0", border: "#ffd86a", px: 1024, both: true }, 4.2, 0.62, 0, hi - 1.3, 0.62);
    load().then(fill).catch(() => { drawTitles(true); });
  }
  function wallEl() {
    if (A.wall) return A.wall;
    const d = document.createElement("div"); d.id = "xadWall";
    d.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;display:none";
    const cv = document.getElementById("cv"); document.body.insertBefore(d, cv || document.body.firstChild); A.wall = d; return d;
  }
  function drawTitles(fail) {
    const cv = A.tCv; if (!cv) return; const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    A.frames.forEach((f) => {
      const x = (f.k % COLS) * CW, y = Math.floor(f.k / COLS) * CH, o = f.o;
      g.fillStyle = "#12061c"; g.fillRect(x + 2, y + 2, CW - 4, CH - 4); g.strokeStyle = "#d8a84a"; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, CW - 6, CH - 6);
      g.textBaseline = "top"; g.fillStyle = "#fff";
      if (!o) { g.font = "700 20px sans-serif"; g.fillText(fail ? "読みこめませんでした" : "読みこみ中…", x + 12, y + 38); return; }
      g.fillStyle = o.src === "dlsite" ? "#2a8ad8" : o.src === "danime" ? "#a84ae8" : "#e8386a"; g.fillRect(x + 8, y + 8, 92, 22); g.fillStyle = "#fff"; g.font = "800 15px sans-serif"; g.fillText(o.srcName + (o.rank ? " " + o.rank + "位" : ""), x + 12, y + 11);
      g.font = "800 19px sans-serif"; const t = String(o.title); let line = "", lines = [];
      for (const ch of t) { if (g.measureText(line + ch).width > CW - 20) { lines.push(line); line = ch; if (lines.length >= 2) break; } else line += ch; } if (lines.length < 2 && line) lines.push(line);
      if (lines.length === 2 && t.length > lines.join("").length) lines[1] = lines[1].slice(0, -1) + "…";
      lines.forEach((ln, i) => g.fillText(ln, x + 10, y + 36 + i * 22));
      g.font = "600 14px sans-serif"; g.fillStyle = "#e8c8ff"; g.fillText(String(o.circle || "").slice(0, 16), x + 106, y + 12);
    });
    if (A.tTex) A.tTex.needsUpdate = true;
  }
  function fill(D) {
    if (!D || !D.length || !A.frames.length) { drawTitles(true); return; }
    const wall = wallEl(); wall.innerHTML = "";
    A.imgs = A.frames.map((f, i) => {
      const o = D[i % D.length]; f.o = o; f.di = i % D.length;
      const im = document.createElement("img"); im.referrerPolicy = "no-referrer"; im.decoding = "async"; im.alt = ""; im.src = o.image;
      im.style.cssText = "position:absolute;left:0;top:0;width:" + EW + "px;height:" + EH + "px;object-fit:cover;transform-origin:0 0;visibility:hidden;background:#12061c";
      wall.appendChild(im); f.m.material = HOLE; return im;
    });
    A.frames.forEach((f) => { if (f.it && f.o) f.it.label = "作品の紹介：" + String(f.o.title).slice(0, 22) + (String(f.o.title).length > 22 ? "…" : "") + "（ほか1作品）"; });
    drawTitles(false);
  }
  /* 3D の額の4すみ → <img> を射影変換（CSS の matrix3d）で重ねる */
  function quadCSS(w, h, q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    let a, b, c, d, e, f, g = 0, hh = 0;
    if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) { a = x1 - x0; b = x3 - x0; c = x0; d = y1 - y0; e = y3 - y0; f = y0; }
    else { const den = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den; a = x1 - x0 + g * x1; b = x3 - x0 + hh * x3; c = x0; d = y1 - y0 + g * y1; e = y3 - y0 + hh * y3; f = y0; }
    return "matrix3d(" + [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, c, f, 0, 1].map((v) => +v.toFixed(8)).join(",") + ")";
  }
  const _v = new T.Vector3(), _w = new T.Vector3(), _c = new T.Vector3(), CORN = [[-FW / 2, FH / 2], [FW / 2, FH / 2], [FW / 2, -FH / 2], [-FW / 2, -FH / 2]];
  function update(camera) {
    if (!A.imgs || !A.frames.length || !A.wall) return;
    const root = A.frames[0].m.parent, on = !!(root && root.parent);
    if (!on) { if (A.wall.style.display !== "none") A.wall.style.display = "none"; return; }
    if (A.wall.style.display !== "block") A.wall.style.display = "block";
    const Wd = innerWidth, Hd = innerHeight;
    A.frames.forEach((f, i) => {
      const im = A.imgs[i]; if (!im) return; const m = f.m;
      m.updateWorldMatrix(true, false); _c.setFromMatrixPosition(m.matrixWorld);
      const dist = _c.distanceTo(camera.position); if (dist > 42) { im.style.visibility = "hidden"; return; }
      const q = []; let behind = false;
      for (const [a, b] of CORN) { _v.set(a, b, 0).applyMatrix4(m.matrixWorld); _w.copy(_v).applyMatrix4(camera.matrixWorldInverse); if (_w.z > -0.15) { behind = true; break; } _v.project(camera); q.push([(_v.x * 0.5 + 0.5) * Wd, (-_v.y * 0.5 + 0.5) * Hd]); }
      if (behind) { im.style.visibility = "hidden"; return; }
      im.style.visibility = "visible"; im.style.transform = quadCSS(EW, EH, q); im.style.zIndex = String(100000 - Math.round(dist * 100));
    });
  }

  /* ══════════════ 一覧・紹介（画面） ══════════════ */
  function css() {
    if (document.getElementById("xadCss")) return;
    const st = document.createElement("style"); st.id = "xadCss";
    st.textContent = ".xad-tabs{display:flex;gap:6px;margin:0 0 8px;flex-wrap:wrap}.xad-tabs button{flex:1;min-width:90px;padding:8px;border-radius:12px;border:0;background:#f3e8f4;font-weight:800;cursor:pointer;color:#4a1a4a}.xad-tabs button.on{background:linear-gradient(90deg,#e8386a,#a84ae8);color:#fff}" +
      ".xad-q{width:100%;box-sizing:border-box;padding:9px 12px;border-radius:12px;border:1px solid #e0cfe8;margin-bottom:6px;font-size:14px}.xad-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:8px}" +
      ".xad-c{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(60,10,40,.14);display:flex;flex-direction:column;cursor:pointer;border:0;padding:0;text-align:left;color:#2a1030}.xad-c img{width:100%;aspect-ratio:3/4;object-fit:cover;background:#2a1030}.xad-c b{font-size:12px;padding:6px 7px 2px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.xad-c small{font-size:10.5px;color:#7a5a80;padding:0 7px 7px;line-height:1.3}" +
      ".xad-d{background:#fff;border-radius:16px;padding:12px;margin-bottom:12px;box-shadow:0 2px 10px rgba(60,10,40,.14);color:#2a1030}.xad-top{display:flex;gap:12px;align-items:flex-start}.xad-top img{width:min(42%,230px);border-radius:10px;background:#2a1030}.xad-top h4{margin:0 0 6px;font-size:15px;line-height:1.4}.xad-top p{margin:2px 0;font-size:12px;color:#6a4a70}" +
      ".xad-gen{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.xad-gen i{font-style:normal;font-size:10.5px;padding:2px 7px;border-radius:99px;background:#f3e8f4;color:#6a2a6a}.xad-sm{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-top:8px}.xad-sm img{width:100%;border-radius:8px;background:#2a1030;cursor:zoom-in}" +
      ".xad-a{display:inline-block;margin-top:6px;padding:7px 12px;border-radius:10px;background:linear-gradient(90deg,#e8386a,#a84ae8);color:#fff;text-decoration:none;font-weight:800;font-size:12px}.xad-zoom{position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.86);display:flex;align-items:center;justify-content:center;cursor:zoom-out}.xad-zoom img{max-width:94vw;max-height:92vh;border-radius:8px}";
    document.head.appendChild(st);
  }
  const NOTE = "18歳以上の方だけ。MagiScope のランキング（FANZA 同人・DLsite・同人アニメ）から。未成年を思わせる作品・無理やりの作品はのぞいています。";
  function metaOf(o) { return [o.circle, o.priceN ? "¥" + Number(o.priceN).toLocaleString() : o.price, o.rating ? "★" + (+o.rating).toFixed(2) : "", o.releaseDate ? String(o.releaseDate).slice(0, 10).replace(/-/g, "/") : ""].filter(Boolean).join("　"); }
  function list(tab) {
    if (!ok()) { ask(() => list(tab)); return; }
    const U = window.XParkUI; if (!U) return; css();
    const b = U.panel("🔞", "大人のギャラリー（18歳以上）", "adult");
    const TABS = [["all", "すべて"]].concat(SRC.map(([id, , nm]) => [id, nm]));
    let cur = tab || "all", D = [];
    b.innerHTML = '<div class="xad-tabs">' + TABS.map(([k, t]) => '<button data-k="' + k + '"' + (k === cur ? ' class="on"' : "") + ">" + esc(t) + "</button>").join("") + '</div><input class="xad-q" type="search" placeholder="題名・サークル・ジャンルでさがす"><p class="pnote xad-note">読みこんでいます…</p><div class="xad-grid"></div>';
    const grid = b.querySelector(".xad-grid"), note = b.querySelector(".xad-note"), q = b.querySelector(".xad-q");
    const render = () => {
      const k = q.value.trim().toLowerCase(), L = D.map((o, i) => [o, i]).filter(([o]) => (cur === "all" || o.src === cur) && (!k || textOf(o).toLowerCase().indexOf(k) >= 0)).slice(0, 120);
      note.textContent = (k ? "「" + q.value + "」で " : "") + L.length + " 作品　" + NOTE;
      grid.innerHTML = L.map(([o, i]) => '<button class="xad-c" data-i="' + i + '"><img loading="lazy" referrerpolicy="no-referrer" src="' + esc(o.image) + '" alt=""><b>' + esc(o.title) + "</b><small>" + esc(o.srcName + (o.rank ? " " + o.rank + "位" : "") + "　" + (o.circle || "")) + "</small></button>").join("");
      grid.querySelectorAll(".xad-c").forEach((el) => el.onclick = () => detail([+el.dataset.i], true));
    };
    b.querySelectorAll(".xad-tabs button").forEach((x) => x.onclick = () => { cur = x.dataset.k; b.querySelectorAll(".xad-tabs button").forEach((y) => y.classList.toggle("on", y === x)); render(); });
    q.oninput = render;
    load().then((d) => { D = d; render(); }).catch(() => { note.textContent = "作品のデータを読みこめませんでした（通信を確かめてください）"; });
    U.btns(b, [["閉じる", () => U.close()]]);
  }
  /* idx：データの番号（一覧から）か、額の番号（壁から） */
  function detail(idx, isData) {
    if (!ok()) { ask(() => detail(idx, isData)); return; }
    const U = window.XParkUI; if (!U) return; css();
    load().then((D) => {
      const ids = (Array.isArray(idx) ? idx : [idx]).map((i) => (isData ? i : (A.frames[i] && A.frames[i].di != null ? A.frames[i].di : i)) % D.length);
      const b = U.panel("🔞", "作品の紹介（18歳以上）", "adult");
      b.innerHTML = ids.map((i) => { const o = D[i]; return '<div class="xad-d"><div class="xad-top"><img referrerpolicy="no-referrer" src="' + esc(o.image) + '" alt=""><div><h4>' + esc(o.title) + "</h4><p>" + esc(o.srcName + (o.rank ? "　" + o.rank + "位" : "")) + "</p><p>" + esc(metaOf(o)) + '</p><div class="xad-gen">' + (o.genres || []).slice(0, 12).map((g) => "<i>" + esc(g) + "</i>").join("") + "</div>" + (o.url ? '<a class="xad-a" href="' + esc(o.url) + '" target="_blank" rel="noopener noreferrer">お店のページで見る</a>' : "") + "</div></div>" + (o.samples && o.samples.length ? '<div class="xad-sm">' + o.samples.map((u) => '<img loading="lazy" referrerpolicy="no-referrer" src="' + esc(u) + '" alt="">').join("") + "</div>" : '<p class="pnote">サンプル画像はありません</p>') + "</div>"; }).join("") + '<p class="pnote">' + NOTE + "</p>";
      b.querySelectorAll(".xad-sm img").forEach((im) => im.onclick = () => { const z = document.createElement("div"); z.className = "xad-zoom"; z.innerHTML = '<img referrerpolicy="no-referrer" src="' + esc(im.src) + '" alt="">'; z.onclick = () => z.remove(); document.body.appendChild(z); });
      U.btns(b, [["📚 一覧を見る", () => list()], ["閉じる", () => U.close()]]);
    }).catch(() => { if (U.toast) U.toast("作品のデータを読みこめませんでした"); });
  }

  window.XAdult = { ok, ask, load, room, update, list, detail };
})();

/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 夜桜キャッスルホテル（MagiScope ギャラリー）（★★ 2026-09-30 ご指定
   「遊郭エリアにはラブホテルのようなものも新たに大々的に設置し、MagiScopeをもとにさまざまなサンプルや作品を見て探せるエリアに」）
   ------------------------------------------------------------------
   ・日本のネオンのお城のホテル風の建物（ピンクの壁・4つの塔・まん中の高い塔・ネオンの看板・大きな入口）。
   ・中は MagiScope ギャラリー：アニメ・映画・カラオケの作品を、MagiScope のデータ（公開ランキング）から見て探せる。
     1〜5階はお色気・R15+／R18+ の作品は出さない（家族向け）。
   ・1階はロビー（入れる）。2〜4階はテーマの部屋（アニメ／映画／カラオケ）＝エレベーターで。
   ・★★ 2026-09-30b 6階は「大人のギャラリー」（18歳以上・入る前に確認・park_adult.js）。外とロビーには成人向けの画像は出さない。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const T = THREE, X = XTex, P = XWorld.World.prototype, TAU = Math.PI * 2;

  /* ══════════════ お城のホテル ══════════════ */
  P.buildCastleHotel = function () {
    const w = this, x = 716, z = 722, BW = 30, BD = 24, BH = 22, ry = -Math.PI / 2;          /* 正面は西（遊郭の塀の方） */
    const c = Math.cos(ry), s = Math.sin(ry), L = (a, b) => [x + a * c + b * s, z - a * s + b * c];
    const lm = w._landmark; w._landmark = true;
    /* 本体（1階は入れるロビー） */
    w.bld(x, z, BW, BD, BH, { ry, key: "yPink" in w.m ? "yPink" : "pPink", shop: "shopD", roof: "flat", parapetKey: "white2", crown: "neonPink", noDoor: true,
      inside: { type: "lobby", name: "夜桜キャッスルホテル ロビー", h: 6, door: 5, deskSign: "FRONT  フロント・ギャラリー案内", actLabel: "フロントで案内を聞く", text: "ようこそ 夜桜キャッスルホテルへ。1階の大きな画面と、2〜4階のテーマの部屋で、アニメ・映画・カラオケの作品を探せます（MagiScope のデータ）。6階は18歳以上の方だけの「大人のギャラリー」です（エレベーターで・入る前に年齢の確認があります）。" } });
    /* 屋上の胸壁（お城のぎざぎざ） */
    for (let i = 0; i <= 10; i++) { const a = -BW / 2 + i * BW / 10; [BD / 2, -BD / 2].forEach((b) => { const [px, pz] = L(a, b); w.box("white2", px, BH + 1, pz, 1.4, 1.2, 0.7, { ry }); }); }
    for (let i = 0; i <= 8; i++) { const b = -BD / 2 + i * BD / 8; [BW / 2, -BW / 2].forEach((a) => { const [px, pz] = L(a, b); w.box("white2", px, BH + 1, pz, 0.7, 1.2, 1.4, { ry }); }); }
    /* 4つの塔・まん中の高い塔（とんがり屋根・ネオンの輪） */
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([ka, kb], i) => { const [px, pz] = L(ka * BW / 2, kb * BD / 2); w.turret(px, pz, 3.4, BH + 8, "white2", ["rPurple" in w.m ? "rPurple" : "kwB", "rBlue" in w.m ? "rBlue" : "kwB"][i % 2], true); w.geo(["neonPink", "neonCyan"][i % 2], new T.TorusGeometry(3.5, 0.12, 6, 32).rotateX(Math.PI / 2), px, BH + 6, pz); });
    { const [px, pz] = L(0, -2); w.geo("yPink" in w.m ? "yPink" : "pPink", new T.CylinderGeometry(6, 6.6, 20, 24), px, BH + 10, pz); w.geo("rPurple" in w.m ? "rPurple" : "kwB", new T.ConeGeometry(7.4, 12, 24), px, BH + 26, pz); w.geo("goldOrn", new T.SphereGeometry(0.8, 12, 8), px, BH + 32.6, pz);
      [BH + 6, BH + 13, BH + 19].forEach((y, k) => w.geo(["neonPink", "neonCyan", "neonYellow"][k], new T.TorusGeometry(6.4 - k * 0.1, 0.14, 6, 48).rotateX(Math.PI / 2), px, y, pz));
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; w.geo("glassClear", new T.BoxGeometry(1.2, 2.2, 0.1).rotateY(-a + Math.PI / 2), px + Math.cos(a) * 6.3, BH + 14, pz + Math.sin(a) * 6.3); }
      w.casterCircle(px, pz, 6.6, BH + 32); }
    /* ネオンの看板（名前・星・月・ハート）・入口の大きなひさし（電球） */
    const [fx, fz] = L(0, BD / 2 + 0.1);
    w.sign("HOTEL YOZAKURA CASTLE", { grad: ["#ff4fb0", "#a86aff"], color: "#fff", glow: "#ffd0f0", border: "#ffd86a", px: 1024 }, 24, 2.6, fx - s * 0.05, BH - 3, fz - c * 0.05, ry);
    w.sign("夜桜キャッスルホテル  ～ MagiScope ギャラリー ～", { bg: "#1a0a2a", color: "#ffe7ff", glow: "#ff9ad8", px: 1024 }, 20, 1.3, fx - s * 0.05, BH - 5.6, fz - c * 0.05, ry);
    [["star", -10, "neonYellow"], ["moon", 10, "neonCyan"], ["heart", -5, "neonPink"], ["crystal", 5, "neonPurple"]].forEach(([k, a, key]) => { const [px, pz] = L(a, BD / 2 + 0.2); w.neonIcon(k, px, BH - 9.5, pz, 1.6, ry, key); });
    { const [px, pz] = L(0, BD / 2 + 3.4); w.box("white2", px, 6.2, pz, 12, 0.5, 7, { ry }); for (let k = 0; k < 14; k++) { const a = -5.6 + k * 0.86; [-3.4, 3.4].forEach((b) => { const [qx, qz] = L(a, BD / 2 + 3.4 + b); w.geo(k % 2 ? "lampY" : "neonPink", new T.SphereGeometry(0.12, 8, 6), qx, 6.1, qz); }); } [-5.6, 5.6].forEach((a) => { const [qx, qz] = L(a, BD / 2 + 6.6); w.box("gold", qx, 0, qz, 0.3, 6.2, 0.3, { ry }); }); }
    w.eyes(...L(0, BD / 2 + 0.15), BH - 12.4, ry, 1.4, 4.4, "irisE");
    /* まわり：夜桜・提灯・入口の石だたみ */
    { const [px, pz] = L(0, BD / 2 + 12); w.disk(px, pz, 12, "walkCream", 0.018); w.disk(px, pz, 12.5, "gold", 0.016, 12); }
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; if (Math.sin(a) > 0.45) continue; const [px, pz] = L(Math.cos(a) * 22, Math.sin(a) * 18); w.plant("sakura", px, pz, 1.25); }
    w._landmark = lm;
    /* 1階のロビーの大画面・作品を探す（MagiScope ギャラリー） */
    { const [px, pz] = L(0, -BD / 2 + 1.2); w.bigScreen(px, 3.2, pz, ry + Math.PI, 12, 4.4, "MagiScope GALLERY", ["アニメ・映画・カラオケの作品を探そう", "E で作品を見る", "2〜4階はテーマの部屋"], ["#3a0a4a", "#0a1a5a"]); }
    { const [px, pz] = L(-7, -2); w.interact(px, pz, 3, "作品を探す（MagiScope ギャラリー）", () => ({ scope: "anime" }), "📚"); }
    /* エレベーター（2〜4階：テーマの部屋） */
    const def = { name: "夜桜キャッスルホテル", x, z, fx: L(0, BD / 2 + 7)[0], fz: L(0, BD / 2 + 7)[1], fyaw: ry, lobby: { x: L(6, -3)[0], z: L(6, -3)[1], yaw: ry + Math.PI },
      floors: [{ label: "1F", name: "ロビー・ギャラリー", here: true },
        { label: "2F", name: "アニメの部屋", type: "theater", act: ["アニメの作品を探す（MagiScope）", { scope: "anime" }, "📺"], screen: ["ANIME ROOM", "今季のアニメ・人気の作品"] },
        { label: "3F", name: "映画の部屋", type: "theater", act: ["映画の作品を探す（MagiScope）", { scope: "movie" }, "🎬"], screen: ["MOVIE ROOM", "映画館のランキング・話題作"] },
        { label: "4F", name: "カラオケの部屋", type: "karaoke", act: ["カラオケの人気曲を探す（MagiScope）", { scope: "karaoke" }, "🎤"], screen: ["KARAOKE ROOM", "カラオケで人気の曲"] },
        { label: "5F", name: "スイートルーム", type: "hotelroom" },
        { label: "6F", name: "大人のギャラリー（18歳以上）", type: "adult", adult: true, act: ["作品の一覧を見る（表紙・サンプル画像）", { adultList: true }, "🔞"] }] };
    { const [px, pz] = L(6, -5); w.box("chromeB", px, 0, pz, 2.4, 3, 0.2, { ry }); w.interact(px - s * 1.6, pz - c * 1.6, 2.4, "エレベーター（テーマの部屋 2〜5階・6階は18歳以上）", () => ({ roomFloors: def }), "🛗"); }
    /* 入口の横の案内（文字だけ） */
    { const [px, pz] = L(-9.5, BD / 2 + 0.2); w.sign("6F  大人のギャラリー（18歳以上）", { bg: "#2a0a2a", color: "#ffd0f0", glow: "#ff4fb0", border: "#ffd86a", px: 1024 }, 6.4, 0.9, px - s * 0.05, 4.2, pz - c * 0.05, ry); }
    w.plazaCrowd(...L(0, BD / 2 + 12), 10, 1.2);
    w.doors = w.doors || []; w.doors.push(L(0, BD / 2 + 8));
    w.forestOpen.push([x, z, 50]);
  };

  /* ══════════════ MagiScope ギャラリー（画面） ══════════════ */
  const BASE = () => String(window.MS_DATA || "https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/").replace(/\/?$/, "/");
  const CACHE = {};
  const TABS = [["anime", "📺 アニメ"], ["movie", "🎬 映画"], ["karaoke", "🎤 カラオケ"]];
  const NG = /R-?1[58]|18禁|成人|アダルト|ご褒美版|解放版|湯けむり版|無修正/;
  async function load(cat) {
    if (CACHE[cat]) return CACHE[cat];
    const r = await fetch(BASE() + "index/" + cat + ".json", { cache: "force-cache" }); if (!r.ok) throw new Error("HTTP " + r.status);
    let a = await r.json(); if (!Array.isArray(a)) a = [];
    if (cat === "anime") a = a.filter((o) => o.title && o.image && !(o.genres || []).some((g) => /お色気|Ecchi|Hentai/i.test(g)) && !NG.test(o.title)).sort((p, q) => (q.watchers || 0) - (p.watchers || 0));
    if (cat === "movie") a = a.filter((o) => o.title && o.image && !/R15|R18/.test(o.certif || "") && !NG.test(o.title)).sort((p, q) => (p.market === "jp" ? 0 : 1) - (q.market === "jp" ? 0 : 1) || (p.rank || 99) - (q.rank || 99));
    if (cat === "karaoke") a = a.filter((o) => o.title && o.image && !NG.test(o.title)).sort((p, q) => (parseInt(q.ac, 10) || 0) - (parseInt(p.ac, 10) || 0));
    const seen = new Set(); a = a.filter((o) => { const k = String(o.title).replace(/\s+/g, "") + "|" + (cat === "karaoke" ? o.artist : ""); if (seen.has(k)) return false; seen.add(k); return true; });          /* 同じ作品が2回出ないように */
    CACHE[cat] = a.slice(0, 240); return CACHE[cat];
  }
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]);
  function metaOf(cat, o) {
    if (cat === "anime") return [o.seasonText, (o.genres || []).slice(0, 3).join("・"), o.studio].filter(Boolean).join("　");
    if (cat === "movie") return [o.releaseDate ? String(o.releaseDate).slice(0, 10).replace(/-/g, "/") : "", o.country, o.length, (o.genres || []).slice(0, 2).join("・")].filter(Boolean).join("　");
    return [o.artist, o.genre, o.releaseDate ? String(o.releaseDate).slice(0, 4) : ""].filter(Boolean).join("　");
  }
  function linkOf(cat, o) { return cat === "anime" ? (o.official || o.annictUrl || o.fmUrl) : cat === "movie" ? o.url : o.appleUrl; }
  function open(cat) {
    const U = window.XParkUI; if (!U) return;
    cat = TABS.some((t) => t[0] === cat) ? cat : "anime";
    const b = U.panel("🏰", "夜桜キャッスル — MagiScope ギャラリー", "scope");
    b.innerHTML = '<div class="xsc-tabs">' + TABS.map(([k, t]) => '<button data-k="' + k + '"' + (k === cat ? ' class="on"' : "") + ">" + t + "</button>").join("") + '</div><input class="xsc-q" type="search" placeholder="題名・アーティスト・ジャンルでさがす"><p class="pnote xsc-note">読みこんでいます…</p><div class="xsc-grid"></div>';
    if (!document.getElementById("xscCss")) { const st = document.createElement("style"); st.id = "xscCss"; st.textContent = ".xsc-tabs{display:flex;gap:6px;margin:0 0 8px}.xsc-tabs button{flex:1;padding:8px;border-radius:12px;border:0;background:#eef0fb;font-weight:800;cursor:pointer}.xsc-tabs button.on{background:linear-gradient(90deg,#ff4fb0,#a86aff);color:#fff}.xsc-q{width:100%;box-sizing:border-box;padding:9px 12px;border-radius:12px;border:1px solid #d8dcf0;margin-bottom:6px;font-size:14px}.xsc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px}.xsc-c{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(20,20,60,.12);display:flex;flex-direction:column}.xsc-c img{width:100%;aspect-ratio:3/4;object-fit:cover;background:#e8e8f4}.xsc-c.sq img{aspect-ratio:1/1}.xsc-c b{font-size:12px;padding:6px 7px 2px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.xsc-c small{font-size:10.5px;color:#667;padding:0 7px 6px;line-height:1.3}.xsc-c a{margin:auto 7px 7px;font-size:11px;text-align:center;padding:5px;border-radius:8px;background:#f4ecff;color:#6a3ad8;text-decoration:none;font-weight:800}"; document.head.appendChild(st); }
    const grid = b.querySelector(".xsc-grid"), note = b.querySelector(".xsc-note"), q = b.querySelector(".xsc-q");
    let list = [], cur = cat;
    const render = () => {
      const k = q.value.trim().toLowerCase(), L2 = (k ? list.filter((o) => [o.title, o.artist, (o.genres || []).join(" "), o.genre, o.studio, o.director].join(" ").toLowerCase().indexOf(k) >= 0) : list).slice(0, 80);
      note.textContent = (k ? "「" + q.value + "」で " : "") + L2.length + " 件（MagiScope のデータ・お色気／R15+・R18+ の作品はのぞいています）";
      grid.innerHTML = L2.map((o) => { const u = linkOf(cur, o); return '<div class="xsc-c' + (cur === "karaoke" ? " sq" : "") + '"><img loading="lazy" referrerpolicy="no-referrer" src="' + esc(o.image) + '" alt=""><b>' + esc(o.title) + "</b><small>" + esc(metaOf(cur, o)) + "</small>" + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + (cur === "karaoke" ? "試聴・くわしく" : "公式・くわしく") + "</a>" : "") + "</div>"; }).join("");
    };
    const show = (c2) => { cur = c2; b.querySelectorAll(".xsc-tabs button").forEach((x) => x.classList.toggle("on", x.dataset.k === c2)); note.textContent = "読みこんでいます…"; grid.innerHTML = ""; load(c2).then((a) => { if (cur !== c2) return; list = a; render(); }).catch(() => { note.textContent = "作品のデータを読みこめませんでした（通信を確かめてください）"; }); };
    b.querySelectorAll(".xsc-tabs button").forEach((x) => x.onclick = () => show(x.dataset.k));
    q.oninput = render;
    const ms = ((window.EXPO_DATA && EXPO_DATA.apps) || []).find((a) => /magiscope/i.test(a.id || a.href || ""));
    U.btns(b, [["🔭 MagiScope アプリで見る", () => { if (ms && window.EXPO && EXPO.openApp) EXPO.openApp(ms.href, ms); else if (ms) location.href = "../" + ms.href; else location.href = "../MagiScope/index.html"; }], ["閉じる", () => U.close()]]);
    show(cat);
  }
  window.XScope = { open, load };
})();

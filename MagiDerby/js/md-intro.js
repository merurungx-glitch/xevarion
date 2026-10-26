/* ============================================================
   MagiDerby — GⅠ のレース名の演出（★★ 2026-10-27 新規）
   ------------------------------------------------------------
   ご指定「G1 レースのそれぞれを押したとき、実際のレース開始時のように、レース名が豪華なアニメーションで表示」
   → 中継のタイトルのように、
       夜の芝 → 金の光が左右へ走る → 「GⅠ」の紋章 → 第◯回 → レース名が1文字ずつ落ちてきて光が走る
       → 英語の名前・競馬場・コース・発走 → 金の粉 → レースの画面へ。
   ・どこを押しても飛ばせる（押したらすぐ消える）。端末が「視差効果を減らす」ならフェードだけの短い版。
   ・レースの画面（md-ui の openRace）はうしろで先に開いておく＝演出が終わればすぐ見られる。
   ・MD_INTRO.play(r, race) … r＝index のレース（nm・date・post・place・surf・dist）、race＝race/<id>.json（あれば dir）
   ★ 第◯回は 2026 年の回数（ED）から年の差で数える（天皇賞は春・秋で年2回）。表に無いレースは回数を出さない。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MD_DATA;

  /* 2026 年の回数（天皇賞は春・秋で1年に2回進む） */
  const ED = {
    "フェブラリーステークス": 43, "高松宮記念": 56, "大阪杯": 70, "桜花賞": 86, "皐月賞": 86, "天皇賞（春）": 173, "NHKマイルカップ": 31,
    "ヴィクトリアマイル": 21, "優駿牝馬": 87, "東京優駿": 93, "安田記念": 76, "宝塚記念": 67, "スプリンターズステークス": 60, "秋華賞": 31,
    "菊花賞": 87, "天皇賞（秋）": 174, "エリザベス女王杯": 51, "マイルチャンピオンシップ": 43, "ジャパンカップ": 46, "チャンピオンズカップ": 27,
    "阪神ジュベナイルフィリーズ": 78, "朝日杯フューチュリティステークス": 78, "ホープフルステークス": 43, "有馬記念": 71,
  };
  /* 英語の正式名（JRA の表記） */
  const EN = {
    "フェブラリーステークス": "FEBRUARY STAKES", "高松宮記念": "TAKAMATSUNOMIYA KINEN", "大阪杯": "OSAKA HAI", "桜花賞": "OKA SHO", "皐月賞": "SATSUKI SHO",
    "天皇賞（春）": "TENNO SHO (SPRING)", "NHKマイルカップ": "NHK MILE CUP", "ヴィクトリアマイル": "VICTORIA MILE", "優駿牝馬": "YUSHUN HIMBA (JAPANESE OAKS)",
    "東京優駿": "TOKYO YUSHUN (JAPANESE DERBY)", "安田記念": "YASUDA KINEN", "宝塚記念": "TAKARAZUKA KINEN", "スプリンターズステークス": "SPRINTERS STAKES",
    "秋華賞": "SHUKA SHO", "菊花賞": "KIKUKA SHO (JAPANESE ST. LEGER)", "天皇賞（秋）": "TENNO SHO (AUTUMN)", "エリザベス女王杯": "QUEEN ELIZABETH II CUP",
    "マイルチャンピオンシップ": "MILE CHAMPIONSHIP", "ジャパンカップ": "JAPAN CUP", "チャンピオンズカップ": "CHAMPIONS CUP",
    "阪神ジュベナイルフィリーズ": "HANSHIN JUVENILE FILLIES", "朝日杯フューチュリティステークス": "ASAHI HAI FUTURITY STAKES",
    "ホープフルステークス": "HOPEFUL STAKES", "有馬記念": "ARIMA KINEN (THE GRAND PRIX)",
  };
  /* レースごとの色（地の色・光の色）。無いレースは MagiDerby の緑と金 */
  const TH = {
    "天皇賞（春）": ["#2a1145", "#c9a2ff"], "天皇賞（秋）": ["#2a1145", "#c9a2ff"], "東京優駿": ["#062e18", "#8fe3a8"], "有馬記念": ["#3d0711", "#ff9fb0"],
    "ジャパンカップ": ["#07173a", "#9cc0ff"], "桜花賞": ["#3d0b25", "#ffb6d4"], "優駿牝馬": ["#0b3326", "#a9efcf"], "菊花賞": ["#3a2302", "#ffd27a"],
    "皐月賞": ["#163a0c", "#c5f59f"], "宝塚記念": ["#38200a", "#ffc58a"], "エリザベス女王杯": ["#2e0b2e", "#f7b5f0"], "秋華賞": ["#3a1406", "#ffb98f"],
    "ホープフルステークス": ["#0b2a3a", "#9fe0ff"], "阪神ジュベナイルフィリーズ": ["#3d0b25", "#ffc2dd"],
  };
  function edition(nm, date) {
    const base = ED[nm]; if (!base) return 0;
    const y = Number(String(date || "").slice(0, 4)); if (!y) return 0;
    const step = /^天皇賞/.test(nm) ? 2 : 1;
    const n = base + (y - 2026) * step;
    return n > 0 ? n : 0;
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const WD = ["日", "月", "火", "水", "木", "金", "土"];
  function dateJa(date) {
    const p = String(date || "").split("-").map(Number); if (p.length < 3) return "";
    return p[0] + "年" + p[1] + "月" + p[2] + "日（" + WD[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] + "）";
  }

  let cur = null;
  function close(now) {
    const el = cur; if (!el) return;
    cur = null;
    clearTimeout(el._t1); clearTimeout(el._t2);
    el.classList.add("out");
    setTimeout(() => { el.remove(); if (el._done) el._done(); }, now ? 260 : 420);
  }

  function play(r, race) {
    if (!r || !r.nm) return Promise.resolve();
    if (cur) close(true);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nm = r.nm, inf = D.info(nm);
    const ed = edition(nm, r.date), th = TH[nm] || ["#04281a", "#ffd65c"];
    const chars = Array.from(nm);
    const dir = race && race.dir ? String(race.dir).replace(/\s*[A-D]$/, "") : (D.COURSES[r.place] || {}).dir || "";
    const meta = esc(r.place || "") + "　" + esc((r.surf || "") + (r.dist || "")) + "m" + (dir ? "（" + esc(dir) + "）" : "");
    const el = document.createElement("div");
    el.className = "g1i" + (reduce ? " rm" : "");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", nm);
    el.style.setProperty("--bg", th[0]);
    el.style.setProperty("--ac", th[1]);
    /* 長い名前ほど小さく（1行に入るように） */
    el.style.setProperty("--fs", "min(" + (86 / Math.max(4, chars.length)).toFixed(2) + "vw, " + (Math.min(78, 560 / Math.max(4, chars.length))).toFixed(1) + "px, 13dvh)");
    let spark = "";
    for (let i = 0; i < 34; i++) {
      const x = (Math.random() * 100).toFixed(1), d = (0.6 + Math.random() * 1.6).toFixed(2), s = (3 + Math.random() * 6).toFixed(1), dl = (0.55 + Math.random() * 1.5).toFixed(2), dx = ((Math.random() - 0.5) * 60).toFixed(0);
      spark += '<i style="left:' + x + "%;--d:" + d + "s;--s:" + s + "px;--dl:" + dl + "s;--dx:" + dx + 'px"></i>';
    }
    el.innerHTML =
      '<div class="g1i-bg"></div><div class="g1i-rays"></div><div class="g1i-turf"></div>' +
      '<div class="g1i-bars"><i></i><i></i></div>' +
      '<div class="g1i-box">' +
        '<div class="g1i-emb" aria-hidden="true"><svg viewBox="0 0 120 120"><defs>' +
          '<linearGradient id="g1iG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".35" stop-color="#ffd25e"/><stop offset=".55" stop-color="#b8860b"/><stop offset=".8" stop-color="#ffe7a1"/><stop offset="1" stop-color="#9c6f00"/></linearGradient>' +
          '<radialGradient id="g1iC" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#3b3b44"/><stop offset="1" stop-color="#0b0b10"/></radialGradient></defs>' +
          '<g class="g1i-ring"><circle cx="60" cy="60" r="56" fill="none" stroke="url(#g1iG)" stroke-width="2.4" stroke-dasharray="2.2 4.6"/></g>' +
          '<circle cx="60" cy="60" r="49" fill="url(#g1iG)"/><circle cx="60" cy="60" r="43" fill="url(#g1iC)"/>' +
          '<path d="M60 22 L64 31 L74 31 L66 37 L69 47 L60 41 L51 47 L54 37 L46 31 L56 31Z" fill="url(#g1iG)" opacity=".92" transform="translate(0,-3) scale(1)"/>' +
          '<text x="60" y="84" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="38" fill="url(#g1iG)" letter-spacing="1">GⅠ</text>' +
        "</svg></div>" +
        (ed ? '<div class="g1i-ed">第<b>' + ed + "</b>回</div>" : '<div class="g1i-ed">' + esc(String(r.date || "").slice(0, 4)) + "</div>") +
        '<h1 class="g1i-nm">' + chars.map((c, i) => '<span style="--i:' + i + '">' + esc(c) + "</span>").join("") + "</h1>" +
        (inf.alias && inf.alias !== nm ? '<div class="g1i-al">' + esc(inf.alias) + "</div>" : "") +
        '<div class="g1i-line"></div>' +
        (EN[nm] ? '<div class="g1i-en">' + esc(EN[nm]) + "</div>" : "") +
        '<div class="g1i-meta"><b>' + meta + "</b><span>" + esc(dateJa(r.date)) + (r.post ? "　" + esc(r.post) + " 発走" : "") + "</span></div>" +
      "</div>" +
      '<div class="g1i-spark">' + spark + "</div>" +
      '<div class="g1i-skip">タップでスキップ</div>';
    document.body.appendChild(el);
    cur = el;
    el.addEventListener("click", () => close(true));
    return new Promise((res) => {
      el._done = res;
      el._t1 = setTimeout(() => { if (cur === el) close(false); }, reduce ? 1300 : 3300);
    });
  }

  document.addEventListener("keydown", (e) => { if (cur && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); close(true); } }, true);
  window.MD_INTRO = { play: play, close: () => close(true), edition: edition };
})();

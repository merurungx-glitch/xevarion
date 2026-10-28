/* ============================================================
   MagiDerby — GⅠ のレース名の演出（★★ 2026-10-27 新規）
   ------------------------------------------------------------
   ご指定「G1 レースのそれぞれを押したとき、実際のレース開始時のように、レース名が豪華なアニメーションで表示」
   → 中継のタイトルのように、
       夜の芝 → 金の光が左右へ走る → 「GⅠ」の紋章 → 第◯回 → レース名が1文字ずつ落ちてきて光が走る
       → 英語の名前・競馬場・コース・発走 → 金の粉 → レースの画面へ。
   ・どこを押しても飛ばせる（押したらすぐ消える）。端末が「視差効果を減らす」ならフェードだけの短い版。
   ・レースの画面（md-ui の openRace）はうしろで先に開いておく＝演出が終わればすぐ見られる。
   ・MD_INTRO.play(r, race, opt) … r＝index のレース（nm・date・post・place・surf・dist）、race＝race/<id>.json（あれば dir）
   ★ 第◯回は 2026 年の回数（ED）から年の差で数える（天皇賞は春・秋で年2回）。表に無いレースは回数を出さない。

   ★★ 2026-10-28
   ・ご報告「GⅠ のアニメーションで GⅠ の部分が中心に揃っていません」
     真因：紋章の「GⅠ」を Barlow Condensed で書いていたが、この字体に「Ⅰ」（ローマ数字）が無く、
           日本語の字体の<b>全角の Ⅰ</b>（右に大きな空き）に置きかわっていた → 見える字が左に寄る。
     → 字は<b>明朝の「G」「I」</b>（I はセリフつき＝Ⅰ と同じ形）にし、さらに<b>見えている字の形の幅</b>（canvas の measureText の
       actualBoundingBox）で真ん中に寄せる（字体の読みこみが終わったらもう一度）。
     ・字間（letter-spacing）を空けた行（第◯回・英語の名前・コース）は、最後の字のうしろの空きのぶん左に寄るので、左にも同じだけ空ける。
   ・ご指定「MagiDerby で新たに GⅠ レースの購入が可能になった初回に、豪華なアニメーションで開催することを表示」
     → opt.sale＝{ close（締切の時刻 ms） } で<b>発売開始の告知</b>（上に「馬券 発売開始」の帯・締切・「馬券を買う」「とじる」）。
       ホーム（home-mate.js の derbyAnn）から呼ぶ。告知のときは自動で閉じない（1回目のタップ＝演出を最後まで飛ばす・2回目で閉じる）。
       opt.onGo …「馬券を買う」を押したとき。戻り値の Promise は "go" か "close" で終わる。
   ・CSS はこのファイルの中（ホームは md.css を読まないため）。字体の変数 --min / --num が無いページでは明朝・Barlow に落とす。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MD_DATA || {};

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
  const COURSE_DIR = { "東京": "左", "中山": "右", "京都": "右", "阪神": "右", "中京": "左", "新潟": "左", "札幌": "右", "函館": "右", "福島": "右", "小倉": "右" };
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
  /* 締切の時刻（ms）→「11月1日（日）15:38」（日本の時刻） */
  function closeJa(ms) {
    const d = new Date(ms + 9 * 3600000);
    const p2 = (n) => String(n).padStart(2, "0");
    return (d.getUTCMonth() + 1) + "月" + d.getUTCDate() + "日（" + WD[d.getUTCDay()] + "）" + p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes());
  }

  /* ══ CSS（★★ 2026-10-28 md.css から移した：ホームでも同じ演出を出すため）══ */
  const MIN = "var(--min,'Shippori Mincho B1','Noto Serif JP','Yu Mincho','Hiragino Mincho ProN',serif)";
  const NUM = "var(--num,'Barlow Condensed','Noto Sans JP',system-ui,sans-serif)";
  const CSS = `
.g1i{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;color:#fff;
  --bg:#04281a;--ac:#ffd65c;animation:g1iIn .25s ease-out both;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;font-family:'Noto Sans JP',system-ui,sans-serif}
.g1i.md{z-index:140}
.g1i.out{animation:g1iOut .42s ease-in forwards}
.g1i-bg{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 46%,color-mix(in srgb,var(--bg) 55%,#3a3a3a) 0%,var(--bg) 46%,#020403 100%)}
.g1i-rays{position:absolute;left:50%;top:46%;width:240vmax;height:240vmax;margin:-120vmax 0 0 -120vmax;opacity:0;
  background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--ac) 15%,transparent) 0deg 4deg,transparent 4deg 15deg);
  -webkit-mask:radial-gradient(closest-side,#000 8%,transparent 70%);mask:radial-gradient(closest-side,#000 8%,transparent 70%);
  animation:g1iRayIn .9s .15s ease-out forwards,g1iSpin 22s linear infinite}
.g1i-turf{position:absolute;left:-10%;right:-10%;bottom:-6%;height:34%;opacity:.55;
  background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 40px,rgba(0,0,0,.05) 40px 80px),linear-gradient(180deg,transparent,rgba(0,0,0,.6));
  transform:perspective(500px) rotateX(58deg);transform-origin:50% 100%}
.g1i-bars{position:absolute;left:0;right:0;top:46%;height:0}
.g1i-bars i{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--ac) 20%,#fff 50%,var(--ac) 80%,transparent);
  box-shadow:0 0 18px var(--ac),0 0 4px #fff;transform:scaleX(0);animation:g1iBar 1.1s .05s cubic-bezier(.2,.8,.2,1) forwards}
.g1i-bars i:first-child{top:-31vh;top:-31dvh}
.g1i-bars i:last-child{top:30vh;top:30dvh;animation-delay:.16s}
.g1i-box{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 4vw;max-width:100%}
.g1i-emb{width:min(26vw,118px);aspect-ratio:1;filter:drop-shadow(0 0 18px color-mix(in srgb,var(--ac) 70%,transparent));opacity:0;
  animation:g1iEmb .7s .22s cubic-bezier(.2,1.4,.35,1) forwards}
.g1i-emb svg{width:100%;height:100%;display:block;overflow:visible}
.g1i-ring{transform-origin:60px 60px;animation:g1iSpin 9s linear infinite}
.g1i-ed{margin-top:1.4vh;font-family:${MIN};font-weight:800;font-size:clamp(15px,4.6vw,26px);letter-spacing:.32em;padding-left:.32em;color:#f6e7b4;opacity:0;
  text-shadow:0 2px 0 rgba(0,0,0,.6);animation:g1iEd .55s .55s ease-out forwards}
.g1i-ed b{font-family:${NUM};font-size:1.35em;margin:0 .12em;letter-spacing:.02em;color:#ffe08a}
.g1i-nm{margin:.6vh 0 0;font-family:${MIN};font-weight:800;font-size:var(--fs);line-height:1.12;letter-spacing:.03em;padding-left:.03em;white-space:nowrap;
  filter:drop-shadow(0 3px 0 rgba(0,0,0,.55)) drop-shadow(0 0 14px color-mix(in srgb,var(--ac) 55%,transparent))}
.g1i-nm span{display:inline-block;opacity:0;
  background:linear-gradient(105deg,#b07a06 0%,#ffd75e 22%,#fff8d8 30%,#ffd75e 38%,#c8961a 52%,#ffe9a6 66%,#fffbe8 72%,#ffe9a6 78%,#b8860b 100%);
  background-size:320% 100%;background-position:100% 0;-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:g1iCh .5s calc(.72s + var(--i) * .055s) cubic-bezier(.2,1.5,.4,1) forwards,g1iShine 1.1s calc(1.45s + var(--i) * .03s) ease-in-out forwards}
.g1i-al{margin-top:.4vh;font-family:${MIN};font-weight:800;font-size:clamp(13px,4vw,22px);letter-spacing:.2em;padding-left:.2em;color:#fff2c8;opacity:0;animation:g1iUp .5s 1.35s ease-out forwards}
.g1i-line{width:min(78vw,560px);height:3px;margin:1.6vh 0 1.2vh;background:linear-gradient(90deg,transparent,var(--ac) 18%,#fff 50%,var(--ac) 82%,transparent);
  box-shadow:0 0 12px var(--ac);transform:scaleX(0);animation:g1iLine .6s 1.3s cubic-bezier(.2,.8,.2,1) forwards}
.g1i-en{font-family:${NUM};font-weight:700;font-size:clamp(12px,3.6vw,20px);letter-spacing:.42em;padding-left:.42em;color:color-mix(in srgb,var(--ac) 60%,#fff);opacity:0;
  animation:g1iEn .7s 1.45s ease-out forwards;white-space:nowrap}
.g1i-meta{margin-top:1.6vh;display:flex;flex-direction:column;align-items:center;gap:.5vh;opacity:0;animation:g1iUp .5s 1.65s ease-out forwards}
.g1i-meta b{font-weight:900;font-size:clamp(14px,4.2vw,22px);letter-spacing:.12em;padding:.3em 1.1em .3em 1.22em;border-radius:99px;
  background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.04));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ac) 55%,transparent)}
.g1i-meta span{font-size:clamp(11px,3.2vw,15px);font-weight:700;letter-spacing:.08em;padding-left:.08em;color:#e8e2cf}
.g1i-spark{position:absolute;inset:0;pointer-events:none;z-index:3}
.g1i-spark i{position:absolute;bottom:-12px;width:var(--s);height:var(--s);transform:rotate(45deg);opacity:0;
  background:radial-gradient(circle,#fff 0 20%,var(--ac) 45%,transparent 72%);
  animation:g1iSp var(--d) var(--dl) ease-out forwards}
.g1i-skip{position:absolute;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:4;font-size:11px;font-weight:800;letter-spacing:.1em;
  color:rgba(255,255,255,.7);padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.08);opacity:0;animation:g1iUp .4s .9s ease-out forwards}
/* ★★ 2026-10-28 発売開始の告知：上の帯・締切・ボタン */
.g1i-sale{display:flex;align-items:center;gap:10px;margin-bottom:1.6vh;opacity:0;animation:g1iSale .7s .05s cubic-bezier(.2,1.3,.4,1) forwards}
.g1i-sale i{width:min(14vw,70px);height:2px;background:linear-gradient(90deg,transparent,var(--ac));box-shadow:0 0 8px var(--ac)}
.g1i-sale i:last-child{transform:scaleX(-1)}
.g1i-sale b{position:relative;overflow:hidden;font-weight:900;font-size:clamp(13px,3.8vw,19px);letter-spacing:.3em;padding:.42em 1.1em .42em 1.4em;border-radius:99px;
  color:#3a2600;background:linear-gradient(180deg,#fff3b8,#ffd25e 55%,#e0a21c);box-shadow:0 0 0 1.5px #fff6d0 inset,0 6px 22px color-mix(in srgb,var(--ac) 55%,transparent)}
.g1i-sale b::after{content:"";position:absolute;top:0;bottom:0;width:40%;left:-60%;transform:skewX(-20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);animation:g1iGl 2.4s 1.2s ease-in-out infinite}
.g1i-cl{margin-top:1.4vh;font-weight:900;font-size:clamp(13px,3.8vw,18px);letter-spacing:.06em;padding-left:.06em;color:#fff;opacity:0;animation:g1iUp .5s 1.85s ease-out forwards}
.g1i-cl em{font-style:normal;color:var(--ac);margin-right:.4em}
.g1i-act{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:2.2vh;opacity:0;animation:g1iUp .5s 2.05s ease-out forwards}
.g1i-act button{font:inherit;cursor:pointer;border:none;border-radius:99px;font-weight:900;letter-spacing:.06em;padding:.85em 1.6em;font-size:clamp(13px,3.8vw,16px)}
.g1i-go{color:#3a2600;background:linear-gradient(180deg,#fff3b8,#ffd25e 55%,#e0a21c);box-shadow:0 0 0 1.5px #fff6d0 inset,0 8px 24px color-mix(in srgb,var(--ac) 55%,transparent);animation:g1iPulse 1.8s 2.6s ease-in-out infinite}
.g1i-no{color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.g1i.sale{cursor:default}
.g1i.fast *{animation-duration:.01s!important;animation-delay:0s!important}
.g1i.fast .g1i-go{animation:none!important}
.g1i.rm *{animation-duration:.01s!important;animation-delay:0s!important}
.g1i.rm .g1i-nm span,.g1i.rm .g1i-ed,.g1i.rm .g1i-en,.g1i.rm .g1i-meta,.g1i.rm .g1i-emb,.g1i.rm .g1i-al,.g1i.rm .g1i-sale,.g1i.rm .g1i-cl,.g1i.rm .g1i-act{opacity:1}
.g1i.rm .g1i-spark,.g1i.rm .g1i-rays{display:none}
@keyframes g1iIn{from{opacity:0}}
@keyframes g1iOut{to{opacity:0;transform:scale(1.06);filter:blur(4px)}}
@keyframes g1iSpin{to{transform:rotate(360deg)}}
@keyframes g1iRayIn{to{opacity:1}}
@keyframes g1iBar{0%{transform:scaleX(0);opacity:1}55%{transform:scaleX(1);opacity:1}100%{transform:scaleX(1);opacity:.25}}
@keyframes g1iEmb{0%{opacity:0;transform:scale(2.6) rotateY(180deg)}60%{opacity:1}100%{opacity:1;transform:scale(1) rotateY(0)}}
@keyframes g1iEd{0%{opacity:0;letter-spacing:1.1em;padding-left:1.1em}100%{opacity:1;letter-spacing:.32em;padding-left:.32em}}
@keyframes g1iCh{0%{opacity:0;transform:translateY(-55%) scale(1.9);filter:blur(6px)}70%{opacity:1;filter:blur(0)}100%{opacity:1;transform:none;filter:none}}
@keyframes g1iShine{0%{background-position:100% 0}100%{background-position:0 0}}
@keyframes g1iLine{to{transform:scaleX(1)}}
@keyframes g1iEn{0%{opacity:0;letter-spacing:1em;padding-left:1em}100%{opacity:1;letter-spacing:.42em;padding-left:.42em}}
@keyframes g1iUp{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:none}}
@keyframes g1iSp{0%{opacity:0;transform:translate(0,0) rotate(45deg) scale(.4)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),-78vh) rotate(225deg) scale(1)}}
@keyframes g1iSale{0%{opacity:0;transform:translateY(-14px) scale(.8)}100%{opacity:1;transform:none}}
@keyframes g1iGl{0%{left:-60%}55%,100%{left:130%}}
@keyframes g1iPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
`;
  function css() {
    if (document.getElementById("mdIntroCss")) return;
    const st = document.createElement("style"); st.id = "mdIntroCss"; st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ══ ★★ 2026-10-28 紋章の「GI」を、見えている字の形の幅で真ん中へ ══ */
  const EMB_FONT = "800 40px 'Shippori Mincho B1','Noto Serif JP','Yu Mincho','Hiragino Mincho ProN',serif";
  let _cv = null;
  function centerInk(t) {
    try {
      if (!t || !t.isConnected) return;
      _cv = _cv || document.createElement("canvas");
      const g = _cv.getContext("2d"); g.font = EMB_FONT; g.textAlign = "center";
      const m = g.measureText("GI");
      if (!m || !isFinite(m.actualBoundingBoxRight) || !isFinite(m.actualBoundingBoxLeft)) return;
      /* textAlign center の基準点から見た、見えている字のまん中のずれ（右が＋） */
      const off = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
      if (Math.abs(off) < 12) t.setAttribute("transform", "translate(" + (-off).toFixed(2) + ",0)");
    } catch (e) {}
  }

  let cur = null;
  function close(now, how) {
    const el = cur; if (!el) return;
    cur = null;
    clearTimeout(el._t1); clearTimeout(el._t2);
    el.classList.add("out");
    setTimeout(() => { el.remove(); if (el._done) el._done(how || "close"); }, now ? 260 : 420);
  }

  function play(r, race, opt) {
    if (!r || !r.nm) return Promise.resolve("close");
    css();
    opt = opt || {};
    const sale = opt.sale || null;
    if (cur) close(true);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nm = r.nm, inf = D.info ? D.info(nm) : {};
    const ed = edition(nm, r.date), th = TH[nm] || ["#04281a", "#ffd65c"];
    const chars = Array.from(nm);
    const dir = race && race.dir ? String(race.dir).replace(/\s*[A-D]$/, "") : ((D.COURSES && D.COURSES[r.place]) || {}).dir || COURSE_DIR[r.place] || "";
    const meta = esc(r.place || "") + "　" + esc((r.surf || "") + (r.dist || "")) + "m" + (dir ? "（" + esc(dir) + "）" : "");
    const el = document.createElement("div");
    el.className = "g1i" + (reduce ? " rm" : "") + (sale ? " sale" : "") + (opt.md ? " md" : "");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", nm + (sale ? " 馬券発売開始" : ""));
    el.style.setProperty("--bg", th[0]);
    el.style.setProperty("--ac", th[1]);
    /* 長い名前ほど小さく（1行に入るように） */
    el.style.setProperty("--fs", "min(" + (86 / Math.max(4, chars.length)).toFixed(2) + "vw, " + (Math.min(78, 560 / Math.max(4, chars.length))).toFixed(1) + "px, 13dvh)");
    let spark = "";
    for (let i = 0; i < (sale ? 46 : 34); i++) {
      const x = (Math.random() * 100).toFixed(1), d = (0.6 + Math.random() * 1.6).toFixed(2), s = (3 + Math.random() * 6).toFixed(1), dl = (0.55 + Math.random() * (sale ? 2.4 : 1.5)).toFixed(2), dx = ((Math.random() - 0.5) * 60).toFixed(0);
      spark += '<i style="left:' + x + "%;--d:" + d + "s;--s:" + s + "px;--dl:" + dl + "s;--dx:" + dx + 'px"></i>';
    }
    el.innerHTML =
      '<div class="g1i-bg"></div><div class="g1i-rays"></div><div class="g1i-turf"></div>' +
      '<div class="g1i-bars"><i></i><i></i></div>' +
      '<div class="g1i-box">' +
        (sale ? '<div class="g1i-sale"><i></i><b>馬券 発売開始</b><i></i></div>' : "") +
        '<div class="g1i-emb" aria-hidden="true"><svg viewBox="0 0 120 120"><defs>' +
          '<linearGradient id="g1iG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".35" stop-color="#ffd25e"/><stop offset=".55" stop-color="#b8860b"/><stop offset=".8" stop-color="#ffe7a1"/><stop offset="1" stop-color="#9c6f00"/></linearGradient>' +
          '<radialGradient id="g1iC" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#3b3b44"/><stop offset="1" stop-color="#0b0b10"/></radialGradient></defs>' +
          '<g class="g1i-ring"><circle cx="60" cy="60" r="56" fill="none" stroke="url(#g1iG)" stroke-width="2.4" stroke-dasharray="2.2 4.6"/></g>' +
          '<circle cx="60" cy="60" r="49" fill="url(#g1iG)"/><circle cx="60" cy="60" r="43" fill="url(#g1iC)"/>' +
          '<path d="M60 22 L64 31 L74 31 L66 37 L69 47 L60 41 L51 47 L54 37 L46 31 L56 31Z" fill="url(#g1iG)" opacity=".92" transform="translate(0,-3)"/>' +
          /* ★★ 2026-10-28 「GⅠ」は明朝の G と I（I はセリフつき）。下の centerInk で見えている字の真ん中を 60 に */
          '<text class="g1i-gt" x="60" y="86" text-anchor="middle" font-family="\'Shippori Mincho B1\',\'Noto Serif JP\',\'Yu Mincho\',\'Hiragino Mincho ProN\',serif" font-weight="800" font-size="40" fill="url(#g1iG)">GI</text>' +
        "</svg></div>" +
        (ed ? '<div class="g1i-ed">第<b>' + ed + "</b>回</div>" : '<div class="g1i-ed">' + esc(String(r.date || "").slice(0, 4)) + "</div>") +
        '<h1 class="g1i-nm">' + chars.map((c, i) => '<span style="--i:' + i + '">' + esc(c) + "</span>").join("") + "</h1>" +
        (inf && inf.alias && inf.alias !== nm ? '<div class="g1i-al">' + esc(inf.alias) + "</div>" : "") +
        '<div class="g1i-line"></div>' +
        (EN[nm] ? '<div class="g1i-en">' + esc(EN[nm]) + "</div>" : "") +
        '<div class="g1i-meta"><b>' + meta + "</b><span>" + esc(dateJa(r.date)) + (r.post ? "　" + esc(r.post) + " 発走" : "") + "</span></div>" +
        (sale ? (sale.close ? '<div class="g1i-cl"><em>締切</em>' + esc(closeJa(sale.close)) + "（発走の2分前）</div>" : "") +
          '<div class="g1i-act"><button type="button" class="g1i-go">🎫 MagiDerby で馬券を買う</button><button type="button" class="g1i-no">とじる</button></div>' : "") +
      "</div>" +
      '<div class="g1i-spark">' + spark + "</div>" +
      (sale ? "" : '<div class="g1i-skip">タップでスキップ</div>');
    document.body.appendChild(el);
    cur = el;
    /* ★★ 2026-10-28 低い画面（スマホの横向きなど）でも上下が切れないよう、中身を画面に合わせて縮める */
    const fit = () => {
      const bx = el.querySelector(".g1i-box"); if (!bx || !bx.isConnected) return;
      bx.style.transform = "";
      const k = Math.min(1, (innerHeight - 28) / Math.max(1, bx.offsetHeight), (innerWidth - 16) / Math.max(1, bx.offsetWidth));
      if (k < 1) bx.style.transform = "scale(" + k.toFixed(3) + ")";
    };
    fit();
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit); } catch (e) {}
    const onRs = () => { if (cur === el) fit(); else removeEventListener("resize", onRs); };
    addEventListener("resize", onRs);
    const gt = el.querySelector(".g1i-gt");
    centerInk(gt);
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => centerInk(gt)); } catch (e) {}
    return new Promise((res) => {
      el._done = res;
      if (sale) {
        /* 告知：1回目のタップ＝演出を最後まで飛ばす・2回目（ボタンの外）で閉じる。自動では閉じない */
        const t0 = performance.now();
        el.addEventListener("click", (e) => {
          if (e.target.closest(".g1i-go")) { e.stopPropagation(); close(true, "go"); try { if (opt.onGo) opt.onGo(); } catch (x) {} return; }
          if (e.target.closest(".g1i-no")) { e.stopPropagation(); close(true, "close"); return; }
          if (!el.classList.contains("fast") && performance.now() - t0 < 2400) { el.classList.add("fast"); return; }
          close(true, "close");
        });
      } else {
        el.addEventListener("click", () => close(true));
        el._t1 = setTimeout(() => { if (cur === el) close(false); }, reduce ? 1300 : 3300);
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!cur) return;
    if (cur.classList.contains("sale")) {
      if (e.key === "Escape") { e.preventDefault(); close(true, "close"); }
      else if (e.key === "Enter") { e.preventDefault(); const b = cur.querySelector(".g1i-go"); if (b) b.click(); }
      return;
    }
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); close(true); }
  }, true);
  window.MD_INTRO = { play: play, close: () => close(true), edition: edition, isOpen: () => !!cur };
})();

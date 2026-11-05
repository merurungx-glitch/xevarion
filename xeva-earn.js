/* ============================================================
   XEVA・ジェムの入手まとめ（アニメ）— xeva-earn.js
   ★★ 2026-11-03 ご指定「各アプリなどからのジェム・XEVA 入手のまとめをアニメーションで見られるようにして、設定などや入手方法のところからアクセスできるように」
   ・再生画面は XEVARION ガイド（xeva-tour.js）と同じもの（XevaTour.pack("earn")）。章ごとにスマホの見本の中で、
     アプリの札から XEVA のコイン・ジェムが上の財布へ飛んでいき、数字が増えていく。
   ・最後の章「あなたの入手まとめ」は、この端末の財布の記録（XEVA は直近100件・ジェムは直近60件）を、どこから入ったかで分けて棒グラフに。
     記録は開くたびに読み直す（XevaEarn.open() のたびに章を作り直す）。
   ・入口：設定の「XEVARION について」／ジェムの入手方法・XEVA の入手方法のシートのいちばん上のボタン／index.html#earn。
   ・数字はそれぞれのアプリのコードの値（2026-11-03 時点）。変えたらここも直すこと。
   ============================================================ */
(function () {
  "use strict";
  if (window.XevaEarn) return;
  const BASE = (function () {
    try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/xeva-earn\.js.*$/, ""); } catch (e) {}
    return "";
  })();
  const A = (p) => BASE + p;
  const fmt = (n) => Math.round(n).toLocaleString("ja-JP");
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const at = (x, y, w, h) => "left:" + x + "%;top:" + y + "%" + (w != null ? ";width:" + w + "%" : "") + (h != null ? ";height:" + h + "%" : "");
  const XI = () => '<img src="' + A("XEVA.png") + '" alt="XEVA">';
  const GI = () => '<img src="' + A("gem.png") + '" alt="ジェム">';

  /* ── 見本の画面の部品（pack の css） ── */
  const CSS = `
.ea-top{left:0;right:0;top:0;height:calc(var(--u)*17);display:flex;align-items:flex-end;justify-content:flex-end;gap:calc(var(--u)*1.6);padding:0 calc(var(--u)*4) calc(var(--u)*2.2);background:linear-gradient(180deg,#fff,rgba(255,255,255,.75));z-index:20}
.ea-top .ea-w{display:flex;align-items:center;gap:calc(var(--u)*1);height:calc(var(--u)*6.6);padding:0 calc(var(--u)*2.4) 0 calc(var(--u)*1);border-radius:99px;background:#fff7e0;font-weight:900;font-size:.8em;color:#7a5200;font-variant-numeric:tabular-nums;box-shadow:inset 0 0 0 calc(var(--u)*.4) #ffd36b}
.ea-top .ea-w.g{background:#ecfbff;color:#11627e;box-shadow:inset 0 0 0 calc(var(--u)*.4) #8fe3ff}
.ea-top .ea-w img{width:calc(var(--u)*5);height:calc(var(--u)*5);object-fit:contain}
.ea-top .ea-w.bump{animation:eaBump .35s ease}
@keyframes eaBump{40%{transform:scale(1.14)}}
.ea-bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 30%,#fff 0,#f3f0ff 45%,#eef6ff)}
.ea-app{display:flex;align-items:center;gap:calc(var(--u)*2.4);padding:calc(var(--u)*2.2) calc(var(--u)*2.6);border-radius:calc(var(--u)*3.6);background:#fff;box-shadow:0 calc(var(--u)*.8) calc(var(--u)*3) rgba(40,60,140,.12)}
.ea-app>img{width:calc(var(--u)*11);height:calc(var(--u)*11);border-radius:calc(var(--u)*2.8);object-fit:cover;flex:none}
.ea-app .ea-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
.ea-app .ea-t b{font-size:.78em;font-weight:900;color:#1d2340}
.ea-app .ea-t small{font-size:.6em;font-weight:800;color:#6f7aa3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ea-app .ea-v{flex:none;display:flex;align-items:center;gap:calc(var(--u)*.8);font-weight:900;font-size:.72em;color:#c27a00;font-variant-numeric:tabular-nums}
.ea-app .ea-v.g{color:#0d8fb8}
.ea-app .ea-v img{width:calc(var(--u)*4.6);height:calc(var(--u)*4.6);object-fit:contain}
.ea-coin{position:absolute;width:calc(var(--u)*7);height:calc(var(--u)*7);z-index:25;pointer-events:none}
.ea-coin img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 calc(var(--u)*.6) calc(var(--u)*1.2) rgba(160,110,0,.35))}
.ea-coin.on{animation:eaFly .95s cubic-bezier(.55,0,.75,.35) both}
@keyframes eaFly{0%{opacity:0;transform:translate(0,0) scale(.6)}15%{opacity:1;transform:translate(0,calc(var(--u)*-3)) scale(1.1)}85%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.55)}}
.ea-plus{position:absolute;z-index:26;font-weight:900;font-size:.8em;color:#c27a00;text-shadow:0 1px 0 #fff;pointer-events:none}
.ea-plus.g{color:#0d8fb8}
.ea-plus.on{animation:eaUp 1.1s ease-out both}
@keyframes eaUp{0%{opacity:0;transform:translateY(calc(var(--u)*2))}20%{opacity:1}100%{opacity:0;transform:translateY(calc(var(--u)*-8))}}
.ea-hero{display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*2);text-align:center}
.ea-hero .ea-big{display:flex;align-items:center;gap:calc(var(--u)*2);font-weight:900;font-size:1.3em;color:#1d2340}
.ea-hero .ea-big img{width:calc(var(--u)*12);height:calc(var(--u)*12);object-fit:contain}
.ea-hero small{font-size:.66em;font-weight:800;color:#6f7aa3}
.ea-eq{display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*2);padding:calc(var(--u)*2.2) calc(var(--u)*3);border-radius:calc(var(--u)*3);background:#fff;font-weight:900;font-size:.72em;color:#1d2340;box-shadow:0 calc(var(--u)*.8) calc(var(--u)*3) rgba(40,60,140,.12)}
.ea-eq img{width:calc(var(--u)*5);height:calc(var(--u)*5);object-fit:contain}
.ea-ring{position:absolute;border-radius:50%;border:calc(var(--u)*.6) dashed rgba(123,92,240,.35);animation:eaSpin 14s linear infinite}
@keyframes eaSpin{to{transform:rotate(360deg)}}
.ea-orb{position:absolute;width:calc(var(--u)*13);height:calc(var(--u)*13);border-radius:calc(var(--u)*3.4);overflow:hidden;box-shadow:0 calc(var(--u)*.8) calc(var(--u)*2.6) rgba(30,40,100,.25)}
.ea-orb img{width:100%;height:100%;object-fit:cover;display:block}
/* あなたの入手まとめ（棒グラフ） */
.ea-sum{display:flex;flex-direction:column;gap:calc(var(--u)*1.6);padding:calc(var(--u)*3);border-radius:calc(var(--u)*4);background:#fff;box-shadow:0 calc(var(--u)*.8) calc(var(--u)*3) rgba(40,60,140,.12)}
.ea-sum h4{margin:0;display:flex;align-items:center;gap:calc(var(--u)*1.4);font-size:.74em;font-weight:900;color:#1d2340}
.ea-sum h4 img{width:calc(var(--u)*5);height:calc(var(--u)*5);object-fit:contain}
.ea-sum h4 em{margin-left:auto;font-style:normal;font-variant-numeric:tabular-nums}
.ea-row{display:grid;grid-template-columns:calc(var(--u)*24) 1fr auto;align-items:center;gap:calc(var(--u)*1.6);font-size:.6em;font-weight:800;color:#3a4270}
.ea-row span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ea-row i{display:block;height:calc(var(--u)*2.6);border-radius:99px;background:#eef1fb;overflow:hidden}
.ea-row i b{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#ffb020,#ffd36b);transition:width .9s cubic-bezier(.2,.8,.2,1)}
.ea-sum.g .ea-row i b{background:linear-gradient(90deg,#2fb6ff,#8fe3ff)}
.ea-row em{font-style:normal;font-weight:900;font-variant-numeric:tabular-nums;color:#1d2340}
.ea-none{font-size:.62em;font-weight:800;color:#8a93b8;text-align:center;padding:calc(var(--u)*2) 0}
`;

  /* ── 章を作る道具 ──
     apps: [ [アイコン(thumbs/…), 名前, 説明, 量, "x"|"g"], … ] を上から順に出し、それぞれからコインが財布へ飛ぶ。 */
  const TOPX = 8, TOPY = 3;           /* 財布の位置（%）：XEVA は右から2つめ・ジェムはいちばん右 */
  function topBar(x, g) {
    return '<div class="m on ea-top"><span class="ea-w x" id="eaWx">' + XI() + '<b class="ea-xn">' + fmt(x) + '</b></span><span class="ea-w g" id="eaWg">' + GI() + '<b class="ea-gn">' + fmt(g) + "</b></span></div>";
  }
  function flowScene(o) {
    const x0 = o.x0 == null ? 12000 : o.x0, g0 = o.g0 == null ? 40 : o.g0;
    let html = '<div class="m on ea-bg"></div>' + topBar(x0, g0);
    const tl = [];
    let x = x0, g = g0;
    const T0 = 500, STEP = o.step || 1150;
    o.apps.forEach((a, i) => {
      const y = 20 + i * (o.gap || 13.2);
      const cls = "ea" + o.id + i;
      const kind = a[4] === "g" ? "g" : "x";
      const src = a[0].charAt(0) === "@" ? A(a[0].slice(1)) : A("thumbs/" + a[0]);   /* "@…" はルートからの場所（アプリ以外の絵） */
      html += '<div class="m ea-app ' + cls + '" data-a="left" style="' + at(5, y, 90) + '"><img src="' + src + '" alt=""><span class="ea-t"><b>' + esc(a[1]) + "</b><small>" + esc(a[2]) + '</small></span><span class="ea-v ' + kind + '">' + (kind === "g" ? GI() : XI()) + esc(a[3]) + "</span></div>";
      /* コイン3枚（少しずつずらして）→ 財布へ */
      const ex = kind === "g" ? 84 : 58, ey = TOPY + 4;
      for (let k = 0; k < 3; k++) {
        const sx = 78 - k * 4, sy = y + 2;
        /* --u は画面の幅の 1%。画面の高さ 1% ≒ 2.25u（スマホの見本の縦横比） */
        html += '<span class="m ea-coin ' + cls + "c" + k + '" style="' + at(sx, sy) + ";--dx:calc(var(--u)*" + (ex - sx).toFixed(1) + ");--dy:calc(var(--u)*" + ((ey - sy) * 2.25).toFixed(1) + ')">' + (kind === "g" ? GI() : XI()) + "</span>";
      }
      const add = a[5] != null ? a[5] : (parseInt(String(a[3]).replace(/[^\d]/g, ""), 10) || 0);
      html += '<span class="m ea-plus ' + kind + " " + cls + 'p" style="' + at(kind === "g" ? 76 : 50, 9.5) + '">+' + fmt(add) + "</span>";
      const t = T0 + i * STEP;
      tl.push([t, "show", "." + cls]);
      for (let k = 0; k < 3; k++) tl.push([t + 350 + k * 90, "show", "." + cls + "c" + k]);
      tl.push([t + 1000, "show", "." + cls + "p"], [t + 1000, "add", kind === "g" ? "#eaWg" : "#eaWx", "bump"], [t + 1350, "rm", kind === "g" ? "#eaWg" : "#eaWx", "bump"]);
      if (kind === "g") { tl.push([t + 950, "count", ".ea-gn", g, g + add, 500]); g += add; }
      else { tl.push([t + 950, "count", ".ea-xn", x, x + add, 500]); x += add; }
      if (o.ptAt && o.ptAt[i] != null) tl.push([t + 200, "pt", o.ptAt[i]]);
    });
    (o.pts || []).forEach((p, k) => { if (!o.ptAt || o.ptAt.indexOf(k) < 0) tl.push([T0 + k * 1400, "pt", k]); });
    return { id: o.id, g: o.g, t: o.t, lead: o.lead, pts: o.pts || [], where: o.where || [], dur: Math.max(o.dur || 0, T0 + o.apps.length * STEP + 1400), html, tl };
  }

  /* ══ 章（数字は 2026-11-03 時点のコード） ══ */
  function scenes() {
    const S = [];
    /* 01 はじめに：2つの通貨 */
    S.push({
      id: "intro", g: "はじめに", t: "<span>XEVA</span> と <span>ジェム</span>",
      lead: "XEVARION には2つの共通通貨があります。どのアプリでためても、同じ財布に入ります（アカウントに紐づいて全端末で同期）。",
      pts: ["<b>XEVA</b>：ふだん使いの通貨（XEVA 1 ＝ 1円）。ログイン・学習・ゲームの報酬などで入ります", "<b>ジェム 💎</b>：プレミアム通貨（💎1 ＝ 1米ドル）。クエストの初クリアやパック、変換所で", "このまとめでは、<b>どのアプリで・何をすると・どれだけ</b>入るかを順番に紹介します"],
      where: ["ホーム", "上のバー（XEVA・ジェム）"], dur: 7800,
      html: '<div class="m on ea-bg"></div>' + topBar(12000, 40) +
        '<div class="m ea-ring" data-a="pop" id="ea-r1" style="' + at(14, 30, 72) + ';aspect-ratio:1"></div>' +
        '<div class="m ea-hero" data-a="pop" id="ea-h1" style="' + at(20, 41, 60) + '"><span class="ea-big">' + XI() + "<span>＋</span>" + GI() + "</span><small>どのアプリでも同じ財布</small></div>" +
        ["MagiLex.jpg", "MagiChemLex.jpg?v=2", "MagiBurst.jpg", "MagiAbyss.jpg?v=2", "MagiBattle.jpg?v=4", "MagiDerby.jpg", "MagiJackpot.jpg", "MagiLotto.jpg"].map((f, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2, cx = 50 + Math.cos(a) * 38 - 6.5, cy = 50 + Math.sin(a) * 17.5 - 3;
          return '<span class="m ea-orb eao' + i + '" data-a="pop" style="' + at(cx.toFixed(1), cy.toFixed(1)) + '"><img src="' + A("thumbs/" + f) + '" alt=""></span>';
        }).join("") +
        '<div class="m ea-eq" data-a="up" id="ea-q1" style="' + at(8, 80, 84) + '">' + XI() + "1 ＝ 1円　・　" + GI() + "1 ＝ 1米ドル</div>",
      tl: [[0, "show", "#ea-r1"], [300, "show", "#ea-h1"], [300, "pt", 0]].concat([...Array(8)].map((_, i) => [700 + i * 120, "show", ".eao" + i]))
        .concat([[2200, "pt", 1], [2600, "show", "#ea-q1"], [3000, "count", ".ea-xn", 12000, 12450, 900], [3600, "count", ".ea-gn", 40, 52, 700], [4300, "pt", 2]]),
    });
    return S.concat(earnScenes().map(flowScene), [mineScene()]);
  }

  /* ══ 各アプリの章（flowScene の材料）══
     apps の1行 ＝ [アイコン（thumbs/… か "@ルートからの場所"）, 名前, 何をすると, 表示する量, "x"＝XEVA|"g"＝ジェム, 見本で財布に足す数]
     ★ 数字は 2026-11-03 時点の各アプリのコード（xeva.js・xevarion.js・各アプリの REWARD など）。変えたらここも直す。 */
  function earnScenes() {
    let rate = 155; try { if (window.XevaFX && XevaFX.gemRate) rate = XevaFX.gemRate(); } catch (e) {}
    const XV = "@icons/xev-192.png";
    return [
      { id: "daily", g: "毎日", t: "毎日の<span>ログイン</span>とミッション", x0: 12000, g0: 40,
        lead: "XEVARION を開くだけで、毎日 XEVA が入ります。ミッション・毎月のビンゴも、ホームの🎯ミッションから受け取れます。",
        pts: ["<b>ログインボーナス</b>：1〜5日目 50・6日目 100・7日目 150（1週で <b>500</b>）。通算10日ごとに 100・100日ごとに 500", "<b>スターターミッション</b>：各アプリを1回あそぶと 100〜300（20件・合計 3,400）", "<b>毎月のビンゴ</b>：1列 1,000・ななめ 1,500＋💎2・全部ひらくと 10,000＋💎8"],
        where: ["ホーム", "🎯ミッション"],
        apps: [[XV, "ログインボーナス", "1〜5日目 50・6日目 100・7日目 150", "+50〜150", "x", 150], [XV, "ログイン日数の節目", "通算10日ごと 100・100日ごと 500", "+100", "x", 100],
          [XV, "スターターミッション", "各アプリを1回あそぶ（20件）", "+100〜300", "x", 200], [XV, "毎月のビンゴ（1列）", "XEVARION のアプリで遊ぶとマスがひらく", "+1,000", "x", 1000],
          [XV, "毎月のビンゴ（ななめ）", "ななめ 1,500＋💎2・全部 💎8", "+💎2", "g", 2], [XV, "限定ミッション", "はじめてのガチャ 300・はじめての SSR 1,000 など", "+300〜1,000", "x", 1000]] },
      { id: "learn", g: "学ぶ", t: "<span>学ぶ</span>アプリ", x0: 15000, g0: 44,
        lead: "MagiLex・MagiChemLex は、覚えるほど XEVA が入ります（<b>11/30 までは Midnight Pumpkin で学習の XEVA が2倍</b>）。MagiFocus は集中した時間で。",
        pts: ["<b>MagiLex</b>：内容の完全習得 600（50問以上 ×2・100問以上 ×3）・確認テスト全問正解 800・連続ログインの節目に💎1〜10", "<b>MagiChemLex</b>：はじめての正解 45・トピック習得 900・確認テスト 1,500・今日の目標 300・ビンゴ（1列 1,200・ななめ 2,000＋💎2）", "<b>MagiFocus</b>：30分ごとに 10（1日 60 まで）"],
        where: ["MagiLex", "MagiChemLex", "MagiFocus"],
        apps: [["MagiLex.jpg", "MagiLex", "内容の完全習得（50問以上 ×2・100問以上 ×3）", "+600〜", "x", 600], ["MagiLex.jpg", "MagiLex", "連続ログインの節目（3・7・14・30日…）", "+💎1〜10", "g", 2],
          ["MagiChemLex.jpg?v=2", "MagiChemLex", "トピック習得 900・確認テスト 1,500", "+900〜", "x", 900], ["MagiChemLex.jpg?v=2", "MagiChemLex", "はじめての正解 45・今日の目標 300", "+45〜300", "x", 300],
          ["MagiChemLex.jpg?v=2", "MagiChemLex ビンゴ", "1列 1,200・ななめ 2,000＋💎2・全部 💎8", "+💎2", "g", 2], ["MagiFocus.jpg", "MagiFocus", "30分ごとに 10（1日 60 まで）", "+10", "x", 10]] },
      { id: "play", g: "あそぶ", t: "ゲームで<span>ジェム</span>", x0: 20000, g0: 50,
        lead: "ジェムは主に<b>ゲームの初クリア</b>で入ります。MagiBurst のクエストの初クリアは<b>毎月1日にリセット</b>されるので、また受け取れます。",
        pts: ["<b>MagiBurst</b>：クエストの初クリア 💎1〜13・2回目からは1日1回 💎1・WAVE 踏破・ミッション・実績も", "<b>MagiAbyss</b>：迷宮の初クリア 💎10〜50（ハード 15〜75）・クリアタイムのミッション 💎3〜50", "<b>MagiBattle</b>：キャンペーンの初クリア 💎2〜12（ハード2倍）・タワー10階ごと 💎10・アリーナのシーズン 💎10〜120"],
        where: ["MagiBurst", "MagiAbyss", "MagiBattle", "MagiBocciaRush"],
        apps: [["MagiBurst.jpg", "MagiBurst", "クエストの初クリア（毎月リセット）", "+💎1〜13", "g", 8], ["MagiBurst.jpg", "MagiBurst", "WAVE 踏破・ミッション・実績", "+💎3〜30", "g", 5],
          ["MagiAbyss.jpg?v=2", "MagiAbyss", "迷宮の初クリア（ハードは 💎15〜75）", "+💎10〜50", "g", 22], ["MagiBattle.jpg?v=4", "MagiBattle", "キャンペーンの初クリア（ハード2倍）", "+💎2〜12", "g", 12],
          ["MagiBattle.jpg?v=4", "MagiBattle", "タワー10階ごと 💎10・迎撃戦の勝利 💎3", "+💎3〜10", "g", 10], ["MagiBocciaRush.jpg", "MagiBocciaRush", "ボスステージの初クリア", "+💎5〜15", "g", 15]] },
      { id: "party", g: "みんなで", t: "みんなで遊んで<span>賞金</span>", x0: 25000, g0: 60,
        lead: "1台を囲むパーティゲームは、<b>順位に応じた賞金</b>が XEVA で入ります。ほかの人の分は、その人が XEVARION を開いたときに届きます。",
        pts: ["順位の賞金は <b>1位 250・2位 200・3位 150・4位 100・5位 50</b>（MagiChainParty のオンラインは 1位 300）", "賞金はホームを開いたときに<b>「ゲーム賞金 XEVA」</b>としてまとめて入ります", "<b>MagiManor</b>：章に着くと 40・エンディング 100〜1,000"],
        where: ["MagiChainParty", "MagiQuiz", "MagiShift", "MagiBocciaRush", "MagiManor"],
        apps: [["MagiChainParty.jpg?v=2", "MagiChainParty", "順位の賞金（オンラインは 1位 300）", "+50〜250", "x", 250], ["MagiQuiz.jpg?v=2", "MagiQuiz", "順位の賞金（チーム戦は全員にチームの順位・この端末の本人はオフラインでも）", "+50〜250", "x", 250],
          ["MagiShift.jpg", "MagiShift", "順位の賞金（同じ順位は同じ額）", "+50〜250", "x", 200], ["MagiBocciaRush.jpg", "MagiBocciaRush", "パーティの順位", "+50〜250", "x", 150],
          ["MagiManor.jpg", "MagiManor", "章に着くと 40・エンディング 100〜1,000", "+40〜1,000", "x", 400]] },
      { id: "luck", g: "増やす", t: "XEVA を<span>増やす</span>", x0: 30000, g0: 64,
        lead: "ベットや宝くじ・競馬で XEVA を増やすアプリ。ミッションの報酬や毎日の無料の回転でも入ります（使いすぎには気をつけて）。",
        pts: ["<b>MagiJackpot</b>：デイリーミッション 300〜500・ウィークリー 2,000〜3,000＋💎3〜5", "<b>Magi Lotto</b>：毎日無料の FREE MAGI（100〜1,000 XEVA か 💎1〜50）・当せん金", "<b>MagiDerby</b>：実際の JRA の払戻金どおり（11/30 までは ×1.1）"],
        where: ["MagiJackpot", "Magi Lotto", "MagiDerby"],
        apps: [["MagiJackpot.jpg", "MagiJackpot", "デイリーミッション（毎日）", "+300〜500", "x", 400], ["MagiJackpot.jpg", "MagiJackpot", "ウィークリーミッション", "+💎3〜5", "g", 4],
          ["MagiLotto.jpg", "Magi Lotto", "FREE MAGI（毎日1回・無料）", "+100〜1,000", "x", 300], ["MagiLotto.jpg", "Magi Lotto", "FREE MAGI のジェム（まれに 💎50）", "+💎1〜50", "g", 3],
          ["MagiDerby.jpg", "MagiDerby", "当たった馬券の払い戻し（実際の払戻金）", "+払戻金", "x", 10500]] },
      { id: "collect", g: "集める", t: "ガチャ・図鑑・<span>凸</span>", x0: 40000, g0: 70,
        lead: "ガチャのアイテムの枠、図鑑のコンプリート、キャラの凸（限界突破）でも XEVA とジェムが入ります。",
        pts: ["<b>ガチャのアイテム</b>：500・1,000・3,000 XEVA／💎1・3（アイテムの枠から）", "<b>図鑑コンプリート</b>：SSR を No. の順に5体ずつそろえるごとに 1,000", "<b>凸ミッション</b>：UR は 1凸 3,000〜完凸 15,000＋💎10（3体完凸 30,000＋💎20）・SSR は 1凸 1,000〜5体完凸 15,000＋💎8"],
        where: ["ガチャ", "図鑑", "🎯ミッション（コレクション）"],
        apps: [["@img/seal.webp", "ガチャのアイテム", "アイテムの枠から XEVA・ジェム", "+500〜3,000", "x", 1000], ["@img/seal.webp", "ガチャのアイテム", "アイテムの枠から", "+💎1・3", "g", 3],
          ["@img/t_Haru.webp", "図鑑コンプリート", "SSR 5体（No. 順）をそろえるごと", "+1,000", "x", 1000], ["@img/t_Chika.webp", "凸ミッション（UR）", "1凸 3,000・2凸 5,000・3凸 8,000・完凸 15,000", "+3,000〜", "x", 15000],
          ["@img/t_Chika.webp", "凸ミッション（UR 完凸）", "完凸 💎10・3体完凸 💎20", "+💎10〜20", "g", 10], ["@img/t_Hisako.webp", "凸ミッション（SSR）", "1凸 1,000〜完凸 6,000＋💎3", "+1,000〜", "x", 6000]] },
      { id: "mail", g: "受け取る", t: "メール・ランキング・<span>記念日</span>", x0: 60000, g0: 90,
        lead: "アップデート記念やお詫びの配布は📧メールで。月間の XEVA ランキングの賞金、誕生日、フレンドでも入ります。",
        pts: ["<b>📧メール</b>：記念・お詫びの配布（受け取りは60日まで）。シリアルコード（CDK）もメールに届きます", "<b>MagiRanking</b>：月間 XEVA ランキング 1位 1,000・2位 500・3位 200・4位から 100（翌月にゲーム賞金として）", "<b>誕生日</b>にログインすると 700・<b>フレンド</b>になると 50（1人1回）"],
        where: ["ホーム", "📧メール", "MagiRanking"],
        apps: [[XV, "📧 メールの配布", "記念・お詫び（60日まで受け取れます）", "+30,000 など", "x", 30000], ["MagiRanking.jpg", "MagiRanking", "月間 XEVA ランキングの賞金", "+100〜1,000", "x", 1000],
          [XV, "誕生日", "誕生日にログイン（メールで届く）", "+700", "x", 700], ["MagiLink.jpg", "フレンド", "フレンドになると（1人1回）", "+50", "x", 50],
          [XV, "シリアルコード", "コード（CDK）を入れてメールで受け取る", "+コード", "x", 1500]] },
      { id: "gem", g: "ジェム", t: "ジェムを<span>手に入れる</span>", x0: 50000, g0: 100,
        lead: "ジェムは XEVA から交換したり、パックで手に入れたりもできます（💎1 ＝ 1米ドル。いまは <b>" + fmt(rate) + " XEVA ＝ 💎1</b>・ドル円連動）。",
        pts: ["<b>ジェム変換所</b>：XEVA → 💎（いつでも・1回 9,999 まで）", "<b>パックストア</b>：週1回のパック（💎8〜430）と期間限定のパック", "<b>XEVA 両替所</b>：両替チケット＋💎10 で XEVA に戻すこともできます"],
        where: ["ホーム", "ショップ"],
        apps: [[XV, "ジェム変換所", fmt(rate) + " XEVA ＝ 💎1（ドル円連動）", "+💎10", "g", 10], [XV, "パックストア（週1回）", "ビギナー 💎8・バリュー 38・プレミアム 160・レジェンド 430", "+💎8〜430", "g", 38],
          ["@thumbs/MidnightPumpkin.jpg", "Midnight Pumpkin パック", "11/30 まで（期間中2回）💎6〜160＋🎫", "+💎6〜160", "g", 55], ["MagiLex.jpg", "MagiLex 連続ログイン", "節目（3・7・14・30・50・100日）", "+💎1〜10", "g", 5],
          [XV, "XEVA ビンゴ（全部ひらく）", "10,000 XEVA＋💎8＋🎫5", "+💎8", "g", 8]] },
    ];
  }

  /* ══ あなたの入手まとめ（この端末の財布の記録から）══ */
  /* 上から順に調べる（「凸ミッション」を先・「MagiLex 連続ログイン」は MagiLex・「ミッション達成：MagiChemLex …」はミッション） */
  const CATS = [
    ["凸・図鑑", /凸ミッション|図鑑コンプリート|コレクション/], ["ミッション・ビンゴ", /^ミッション|ミッション達成|限定ミッション|XEVA ?ビンゴ/],
    ["ログインボーナス", /^\d+日目ログイン|ログイン\d+日達成/], ["メール・配布", /メール|CDK|シリアル|誕生日/], ["ガチャのアイテム", /^ガチャ/],
    ["ゲーム賞金", /ゲーム賞金/], ["パック・変換所", /パック|変換所|両替/], ["フレンド", /フレンド/],
    ["MagiChemLex", /ChemLex/i], ["MagiLex", /MagiLex/i], ["MagiQuiz", /MagiQuiz/i], ["MagiBurst", /MagiBurst|クエスト|降臨/], ["MagiAbyss", /MagiAbyss/i], ["MagiBattle", /MagiBattle/i],
    ["MagiDerby", /MagiDerby/i], ["MagiJackpot", /Jackpot/i], ["Magi Lotto", /Lotto|ロト|スクラッチ|ナンバーズ|Free Magi/i], ["MagiChainParty", /ChainParty/i],
    ["MagiRanking", /Ranking|ランキング/i], ["MagiShift", /MagiShift/i], ["Boccia", /Boccia/i], ["MagiFocus", /MagiFocus/i], ["MagiManor", /MagiManor/i], ["XEVYNAR", /XEVYNAR/i],
  ];
  function catOf(reason) { const r = String(reason || ""); for (let i = 0; i < CATS.length; i++) if (CATS[i][1].test(r)) return CATS[i][0]; return "その他"; }
  function summarize(hist) {
    const by = {}; let total = 0, from = Infinity, to = 0;
    (hist || []).forEach((h) => { const n = +h.amount || 0; if (n <= 0) return; const k = catOf(h.reason); by[k] = (by[k] || 0) + n; total += n; if (h.t) { from = Math.min(from, h.t); to = Math.max(to, h.t); } });
    const rows = Object.keys(by).map((k) => [k, by[k]]).sort((a, b) => b[1] - a[1]);
    return { rows, total, from: isFinite(from) ? from : 0, to };
  }
  function md(t) { if (!t) return ""; const d = new Date(t); return (d.getMonth() + 1) + "/" + d.getDate(); }
  function mineScene() {
    let xh = [], gh = [];
    try { xh = (window.XEVA && XEVA.getHistory) ? XEVA.getHistory() : []; } catch (e) {}
    try { gh = (window.XEVA && XEVA.gem && XEVA.gem.getHistory) ? XEVA.gem.getHistory() : []; } catch (e) {}
    const X = summarize(xh), G = summarize(gh);
    const bal = (() => { try { return { x: XEVA.getBalance(), g: XEVA.gem.get() }; } catch (e) { return { x: 0, g: 0 }; } })();
    const panel = (S, kind, top, n) => {
      const max = S.rows.length ? S.rows[0][1] : 1, list = S.rows.slice(0, n);
      return '<div class="m ea-sum ' + kind + '" data-a="up" id="ea-m' + kind + '" style="' + at(4, top, 92) + '"><h4>' + (kind === "g" ? GI() : XI()) + (kind === "g" ? "ジェム" : "XEVA") +
        '<small style="font-size:.8em;color:#8a93b8;font-weight:800">' + (S.from ? md(S.from) + "〜" + md(S.to) : "") + '</small><em>+<b class="ea-tot' + kind + '">0</b></em></h4>' +
        (list.length ? list.map((r, i) => '<div class="ea-row"><span>' + esc(r[0]) + '</span><i><b class="ea-bar' + kind + '" data-w="' + Math.max(4, Math.round(r[1] / max * 100)) + '"></b></i><em>+' + fmt(r[1]) + "</em></div>").join("")
          : '<div class="ea-none">まだ記録がありません</div>') + "</div>";
    };
    const topX = X.rows[0], topG = G.rows[0];
    return {
      id: "mine", g: "あなたの記録", t: "あなたの<span>入手まとめ</span>",
      lead: "この端末の財布の記録（XEVA は直近" + xh.length + "件・ジェムは直近" + gh.length + "件）を、どこから入ったかで分けました。" +
        "いまの残高は XEVA <b>" + fmt(bal.x) + "</b>・ジェム <b>" + fmt(bal.g) + "</b> です。",
      pts: [
        topX ? "XEVA はいちばん多いのが <b>" + esc(topX[0]) + "</b>（+" + fmt(topX[1]) + "）・合計 <b>+" + fmt(X.total) + "</b>" : "XEVA の入手の記録はまだありません",
        topG ? "ジェムはいちばん多いのが <b>" + esc(topG[0]) + "</b>（+" + fmt(topG[1]) + "）・合計 <b>+" + fmt(G.total) + "</b>" : "ジェムの入手の記録はまだありません",
        "使ったぶん（ガチャ・ベットなど）は入れていません。くわしい履歴は財布（上のバーの XEVA・ジェム）から",
      ],
      where: ["ホーム", "設定", "XEVA・ジェムの入手まとめ"], dur: 7600, mine: true,
      html: '<div class="m on ea-bg"></div>' + topBar(bal.x, bal.g) + panel(X, "x", 18, 6) + panel(G, "g", 59, 4),
      tl: [[0, "show", "#ea-mx"], [200, "pt", 0], [400, "count", ".ea-totx", 0, X.total, 1300], [1800, "show", "#ea-mg"], [2000, "pt", 1], [2200, "count", ".ea-totg", 0, G.total, 1100], [4200, "pt", 2]],
    };
  }

  /* 棒グラフは「表示されたら伸ばす」（XevaTour の命令に無いので、見本の中を見張って幅を入れる） */
  let mo = null;
  function watchBars() {
    if (mo) mo.disconnect();
    const scr = document.getElementById("xtScr"); if (!scr) return;
    mo = new MutationObserver(() => {
      scr.querySelectorAll(".ea-sum.on b[data-w]").forEach((b, i) => { if (!b.style.width) setTimeout(() => { b.style.width = b.dataset.w + "%"; }, 120 + i * 110); });
    });
    mo.observe(scr, { subtree: true, attributes: true, attributeFilter: ["class"], childList: true });
  }

  function open(start) {
    if (!window.XevaTour || !XevaTour.pack) return false;
    XevaTour.pack("earn", { name: "XEVA・ジェム", sub: "入手まとめ", logo: A("XEVA.png"), title: "XEVA・ジェムの入手まとめ", scenes: scenes(), css: CSS });
    XevaTour.open(start || null, { pack: "earn" });
    setTimeout(watchBars, 60);
    return true;
  }
  window.XevaEarn = { open, summarize, catOf, scenes: earnScenes };
  /* index.html#earn で開く */
  function byHash() {
    if ((location.hash || "").toLowerCase() !== "#earn") return;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    const go = () => { if (!open()) setTimeout(go, 300); };
    setTimeout(go, 400);
  }
  window.addEventListener("hashchange", byHash);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", byHash); else byHash();
})();

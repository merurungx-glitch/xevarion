/* ============================================================
   MagiChemLex — mcl-guide.js（XEVA のもらい方を動きで見せるガイド）
   ★★ 2026-10-31 ご指定「XEVA の入手方法とそれぞれについてアニメーションで分かりやすく」
   ・XEVARION ガイドと同じプレイヤー（../xeva-tour.js の XevaTour.pack）で、スマホの見本の中を動かして1つずつ説明する。
   ・金額はいまの値（MCL.REWARD × イベントの倍率 MCL.mult()）で、開くたびに作り直す（イベント中は倍の数字が出る）。
   ・入口：ホームの「XEVA のもらい方」の「▶ 動きで見る」・ビンゴの「？ 使い方」・設定の「このアプリについて」。
     data-a="xevaGuide"（data-v＝最初に見せる章の id）。
   ============================================================ */
(function () {
  "use strict";
  const M = window.MCL, U = window.MCLUI;
  if (!M || !U) return;

  const CSS = `
.xt-scr .cg-bg{position:absolute;inset:0;background:linear-gradient(180deg,#eef4ff,#f8fbff 60%,#fff)}
.xt-scr .cg-top{left:0;right:0;top:0;height:calc(var(--u)*17);display:flex;align-items:flex-end;gap:calc(var(--u)*1.6);padding:0 calc(var(--u)*4) calc(var(--u)*2.2);background:#fff;box-shadow:0 calc(var(--u)*.6) calc(var(--u)*2.4) rgba(40,80,160,.1);z-index:20}
.xt-scr .cg-logo{font-weight:900;font-size:.82em;color:#2c74d6;letter-spacing:.02em}
.xt-scr .cg-plus{z-index:30;display:flex;align-items:center;gap:calc(var(--u)*1);padding:calc(var(--u)*1.2) calc(var(--u)*2.6) calc(var(--u)*1.2) calc(var(--u)*1.2);border-radius:99px;background:linear-gradient(100deg,#ffe46b,#ffb347);color:#5a3200;font-weight:900;font-size:.95em;box-shadow:0 calc(var(--u)*1) calc(var(--u)*3) rgba(255,150,40,.45);white-space:nowrap}
.xt-scr .cg-plus img{width:calc(var(--u)*5.4);height:calc(var(--u)*5.4)}
.xt-scr .cg-plus.big{font-size:1.25em}
.xt-scr .cg-q{background:#fff;border-radius:calc(var(--u)*3.6);box-shadow:0 calc(var(--u)*1) calc(var(--u)*3.4) rgba(40,80,160,.12);padding:calc(var(--u)*3)}
.xt-scr .cg-q b{display:block;font-size:.78em;line-height:1.45;color:#1d2a52}
.xt-scr .cg-q small{font-size:.58em;font-weight:800;color:#2c74d6}
.xt-scr .cg-op{display:flex;align-items:center;gap:calc(var(--u)*2);padding:calc(var(--u)*1.8) calc(var(--u)*2.6);border-radius:calc(var(--u)*2.6);background:#fff;border:calc(var(--u)*.5) solid #dfe7f8;font-size:.7em;font-weight:800;color:#33406a;transition:background .3s,border-color .3s}
.xt-scr .cg-op i{width:calc(var(--u)*4.6);height:calc(var(--u)*4.6);border-radius:50%;display:grid;place-items:center;background:#eef3ff;color:#2c74d6;font-style:normal;font-size:.9em;font-weight:900}
.xt-scr .cg-op.ok{background:#e4fbf1;border-color:#16c79a}
.xt-scr .cg-op.ok i{background:#16c79a;color:#fff}
.xt-scr .cg-ok{z-index:25;width:calc(var(--u)*30);height:calc(var(--u)*30);border-radius:50%;display:grid;place-items:center;background:rgba(22,199,154,.14);border:calc(var(--u)*1.4) solid #16c79a;color:#16c79a;font-size:2.4em;font-weight:900}
.xt-scr .cg-card{background:#fff;border-radius:calc(var(--u)*3.6);box-shadow:0 calc(var(--u)*1) calc(var(--u)*3.4) rgba(40,80,160,.12);padding:calc(var(--u)*3)}
.xt-scr .cg-h{font-size:.72em;font-weight:900;color:#1d2a52}
.xt-scr .cg-s{font-size:.56em;font-weight:800;color:#7486ad}
.xt-scr .cg-bar{position:relative;height:calc(var(--u)*3);border-radius:99px;background:#e6ecf8;overflow:hidden;margin-top:calc(var(--u)*1.6)}
.xt-scr .cg-bar b{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99px;background:linear-gradient(90deg,#2f8cff,#16c7a0);transition:width 1.1s cubic-bezier(.3,.7,.2,1)}
.xt-scr .cg-bar.or b{background:linear-gradient(90deg,#ffb347,#ff7a3c)}
.xt-scr .cg-stamp{z-index:26;padding:calc(var(--u)*1.4) calc(var(--u)*3.4);border-radius:calc(var(--u)*2);border:calc(var(--u)*.8) solid #ff4d6d;color:#ff4d6d;font-weight:900;font-size:.9em;background:rgba(255,255,255,.9);transform:rotate(-8deg)}
.xt-scr .cg-days{display:grid;grid-template-columns:repeat(7,1fr);gap:calc(var(--u)*1.2)}
.xt-scr .cg-days span{aspect-ratio:1;border-radius:calc(var(--u)*2);background:#eef2fb;display:grid;place-items:center;font-size:.58em;font-weight:900;color:#9aa6c8;transition:background .3s,color .3s,transform .3s}
.xt-scr .cg-days span.on{background:linear-gradient(160deg,#ffb347,#ff5d5d);color:#fff;transform:scale(1.06)}
.xt-scr .cg-ring{width:calc(var(--u)*36);height:calc(var(--u)*36);border-radius:50%;display:grid;place-items:center;background:conic-gradient(#16c7a0 calc(var(--p,0)*1%),#e6ecf8 0);transition:--p 1s}
.xt-scr .cg-ring::after{content:attr(data-t);width:78%;height:78%;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:.8em;font-weight:900;color:#1d2a52}
.xt-scr .cg-lv{display:flex;gap:calc(var(--u)*1.6);align-items:center;justify-content:center}
.xt-scr .cg-lv span{padding:calc(var(--u)*1) calc(var(--u)*2.4);border-radius:99px;background:#eef2fb;font-size:.56em;font-weight:900;color:#7486ad;transition:background .3s,color .3s}
.xt-scr .cg-lv span.on{background:#16c7a0;color:#fff}
.xt-scr .cg-medal{z-index:26;width:calc(var(--u)*26);height:calc(var(--u)*26);border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#fff6c2,#ffd24a 45%,#e8a10e);box-shadow:0 0 0 calc(var(--u)*1.2) #fff,0 calc(var(--u)*1.4) calc(var(--u)*4) rgba(232,161,14,.55);font-size:1.5em;font-weight:900;color:#7a4b00}
.xt-scr .cg-meter{position:relative;height:calc(var(--u)*6);border-radius:99px;background:#e6ecf8;overflow:hidden}
.xt-scr .cg-meter b{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#2f8cff,#8a5cff,#ff4d8d);border-radius:99px;transition:width 1.2s cubic-bezier(.3,.7,.2,1)}
.xt-scr .cg-meter i{position:absolute;top:0;bottom:0;width:calc(var(--u)*.5);background:#fff}
.xt-scr .cg-mk{position:absolute;font-size:.52em;font-weight:900;color:#7486ad;transform:translateX(-50%)}
.xt-scr .cg-dots{display:grid;grid-template-columns:repeat(5,1fr);gap:calc(var(--u)*1.6)}
.xt-scr .cg-dots span{aspect-ratio:1;border-radius:50%;background:#e6ecf8;transition:background .25s,transform .25s}
.xt-scr .cg-dots span.on{background:#16c7a0;transform:scale(1.1)}
.xt-scr .cg-bgo{display:grid;grid-template-columns:repeat(5,1fr);gap:calc(var(--u)*1.1);padding:calc(var(--u)*2.2);border-radius:calc(var(--u)*3.4);background:linear-gradient(160deg,#20306a,#3a2a7a)}
.xt-scr .cg-bgo span{position:relative;aspect-ratio:1;border-radius:calc(var(--u)*1.6);background:#f3f6ff;display:grid;place-items:center;font-size:.6em;font-weight:900;color:#3a4a7a}
.xt-scr .cg-bgo span.au{background:linear-gradient(160deg,#fff1b8,#ffd24a);color:#7a4b00}
.xt-scr .cg-bgo span .bs{position:absolute;inset:6%;border-radius:50%;border:calc(var(--u)*.8) solid #ff4d6d;opacity:0}
.xt-scr .cg-bingo{z-index:28;text-align:center;font-weight:900;font-size:2em;color:#ff4d6d;letter-spacing:.06em;text-shadow:0 calc(var(--u)*.6) 0 #fff,0 0 calc(var(--u)*4) #ffd36b}
.xt-scr .cg-chip{display:inline-flex;align-items:center;gap:calc(var(--u)*.8);padding:calc(var(--u)*.8) calc(var(--u)*2.2);border-radius:99px;background:#eef3ff;color:#2c74d6;font-size:.56em;font-weight:900;margin:calc(var(--u)*.6)}
.xt-scr .cg-ev{z-index:22;padding:calc(var(--u)*2.4) calc(var(--u)*3);border-radius:calc(var(--u)*3.4);background:linear-gradient(110deg,#8a5cff,#ff5fa2);color:#fff;font-weight:900;font-size:.8em;text-align:center;box-shadow:0 calc(var(--u)*1.2) calc(var(--u)*4) rgba(138,92,255,.4)}
.xt-scr .cg-res{background:#fff;border-radius:calc(var(--u)*4);box-shadow:0 calc(var(--u)*1) calc(var(--u)*4) rgba(40,80,160,.14);padding:calc(var(--u)*3.6);text-align:center}
.xt-scr .cg-res .cg-big{font-size:1.9em;font-weight:900;color:#2c74d6;line-height:1.1}
.xt-scr .cg-row{display:flex;align-items:center;gap:calc(var(--u)*2);padding:calc(var(--u)*1.6) 0;border-bottom:calc(var(--u)*.3) dashed #e2e8f5;font-size:.6em;font-weight:800;color:#33406a}
.xt-scr .cg-row em{margin-left:auto;font-style:normal;font-weight:900;color:#e08a00}
.xt-scr .cg-fly{z-index:31;width:calc(var(--u)*7);height:calc(var(--u)*7)}
.xt-scr .cg-fly.go{animation:cgFly .9s cubic-bezier(.5,0,.3,1) forwards}
@keyframes cgFly{0%{transform:none;opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.5);opacity:0}}
.xt-scr .cg-glow{animation:cgGlow 1.2s ease-in-out infinite}
@keyframes cgGlow{0%,100%{box-shadow:0 0 0 0 rgba(22,199,154,0)}50%{box-shadow:0 0 0 calc(var(--u)*1.6) rgba(22,199,154,.35)}}
`;

  function build() {
    const K = window.XevaTour.kit, A = K.A, at = K.at, fmt = K.fmt;
    const R = M.REWARD, mul = Math.max(1, M.mult ? M.mult() : 1);
    const v = (n) => Math.round(n * mul);
    const XV = A("XEVA.png"), GEM = A("gem.png");
    let X0 = 12480;
    try { X0 = Math.max(1000, Math.round((window.XEVA && XEVA.get ? XEVA.get() : 12480))); } catch (e) {}
    const top = (x) => '<div class="m on cg-bg"></div><div class="m on cg-top"><b class="cg-logo">MagiChemLex</b><span style="flex:1"></span><span class="m-pill x"><img src="' + XV + '" alt=""><b class="m-x xn">' + fmt(x) + "</b></span></div>";
    const plus = (id, n, x, y, big) => '<div class="m cg-plus' + (big ? " big" : "") + '" data-a="pop" id="' + id + '" style="' + at(x, y) + '"><img src="' + XV + '" alt="">+' + fmt(n) + "</div>";
    /* XEVA のコインが上の XEVA の数へ飛ぶ（--dx/--dy は見本の画面の中の %） */
    const fly = (cls, x, y) => '<img class="m cg-fly ' + cls + '" data-a="pop" src="' + XV + '" alt="" style="' + at(x, y) + ";--dx:calc(var(--u)*" + ((72 - x) * 0.92).toFixed(1) + ");--dy:calc(var(--u)*" + ((7 - y) * 2).toFixed(1) + ')">';
    const evNote = mul > 1 ? "（いまはイベントで <b>XEVA ×" + mul + "</b> の数字）" : "";
    const scenes = [
      {
        id: "x-intro", g: "はじめに", t: "<span>XEVA</span> ってなに？",
        lead: "MagiChemLex で学ぶと、XEVARION の共通通貨 <b>XEVA</b> がたまります。ガチャ・ショップ・両替など、XEVARION のどこでも使えます。" + evNote,
        pts: ["<b>解く・覚える・続ける</b>の3つで XEVA がもらえる", "もらった XEVA は<b>上の XEVA の数</b>と<b>結果の画面</b>で確かめられる", "このガイドでは、もらい方を<b>1つずつ</b>動きで紹介します"],
        where: ["MagiChemLex", "ホーム", "XEVA のもらい方"], dur: 6800,
        html: top(X0) +
          '<div class="m" data-a="pop" id="xi-c" style="' + at(18, 26, 64) + ';aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff7c9,#ffe07a 40%,rgba(255,200,80,0) 70%)"></div>' +
          '<img class="m m-float" data-a="pop" id="xi-x" src="' + XV + '" alt="" style="' + at(30, 33, 40) + '">' +
          '<div class="m cg-card" data-a="up" id="xi-k" style="' + at(8, 72, 84) + ';text-align:center"><div class="cg-h">解く ・ 覚える ・ 続ける</div><div class="cg-s">MagiChemLex で学ぶほど XEVA がたまる</div></div>' +
          [0, 1, 2, 3, 4].map((i) => fly("xf xf" + i, 20 + i * 14, 60)).join(""),
        tl: [[0, "show", "#xi-c"], [300, "show", "#xi-x"], [600, "pt", 0], [1300, "show", "#xi-k"],
          [2000, "show", ".xf"], [2400, "add", ".xf0", "go"], [2550, "add", ".xf1", "go"], [2700, "add", ".xf2", "go"], [2850, "add", ".xf3", "go"], [3000, "add", ".xf4", "go"],
          [2600, "count", ".xn", X0, X0 + 500, 1400], [3200, "pt", 1], [4600, "pt", 2]],
      },
      {
        id: "x-first", g: "解く", t: "はじめての学習・<span>はじめての正解</span>",
        lead: "はじめて問題を解くと <b>+" + fmt(v(R.reg)) + "</b>（1回だけ）。問題にはじめて正解するたびに <b>+" + fmt(v(R.first)) + "</b>（1問ごと・1,569問ぶん）。",
        pts: ["<b>どの問題でも</b>、はじめて正解したら1問ごとに XEVA", "まちがえても大丈夫。<b>あとで正解すれば</b>そのときにもらえる", "ヒントを使っても<b>正解なら</b>もらえる"],
        where: ["ホーム", "おすすめ10問・問題セット"], dur: 7600,
        html: top(X0) +
          '<div class="m cg-q" data-a="up" id="xq-q" style="' + at(5, 20, 90) + '"><small>酸と塩基・中和</small><b>0.10 mol/L の塩酸 20 mL を中和するのに必要な NaOH の物質量は？</b></div>' +
          ["1.0×10⁻³ mol", "2.0×10⁻³ mol", "4.0×10⁻³ mol", "2.0×10⁻² mol"].map((t, i) => '<div class="m cg-op xo' + i + '" data-a="left" style="' + at(5, 39 + i * 9, 90) + '"><i>' + "ABCD"[i] + "</i>" + t + "</div>").join("") +
          '<div class="m cg-ok" data-a="pop" id="xq-ok" style="' + at(34, 44) + '">✓</div>' +
          plus("xq-p1", v(R.first), 30, 86) + plus("xq-p0", v(R.reg), 24, 77),
        tl: [[0, "show", "#xq-q"], [300, "show", ".xo0"], [400, "show", ".xo1"], [500, "show", ".xo2"], [600, "show", ".xo3"], [700, "pt", 0],
          [1600, "tap", 50, 51], [2100, "add", ".xo1", "ok"], [2300, "show", "#xq-ok"], [2300, "add", "#xq-ok", "m-pulse"], [2700, "show", "#xq-p0"], [3000, "show", "#xq-p1"],
          [3000, "count", ".xn", X0, X0 + v(R.reg) + v(R.first), 1200], [3600, "pt", 1], [4400, "hide", "#xq-ok"], [5400, "pt", 2]],
      },
      {
        id: "x-daily", g: "続ける", t: "今日の目標と<span>連続の学習</span>",
        lead: "その日に決めた問題数（ふつうは10問）を解くと <b>+" + fmt(v(R.daily)) + "</b>（毎日）。7日続けて学ぶと、7日ごとに <b>+" + fmt(v(R.streak7)) + "</b>。",
        pts: ["今日の目標の数は<b>設定</b>で変えられる", "<b>1日1問</b>でも続けば「連続」に数える", "7日・14日・21日…と<b>7日ごと</b>に何度でも"],
        where: ["ホーム", "今日の目標・連続記録"], dur: 7800,
        html: top(X0) +
          '<div class="m cg-card" data-a="up" id="xd-g" style="' + at(5, 20, 90) + '"><div class="cg-h">🎯 今日の目標</div><div class="cg-s"><b class="xdn">0</b> / 10 問</div><div class="cg-bar"><b id="xd-b"></b></div></div>' +
          '<div class="m cg-stamp" data-a="pop" id="xd-st" style="' + at(52, 22) + '">達成！</div>' + plus("xd-p", v(R.daily), 30, 37) +
          '<div class="m cg-card" data-a="up" id="xd-w" style="' + at(5, 50, 90) + '"><div class="cg-h">🔥 連続の学習</div><div class="cg-days" style="margin-top:calc(var(--u)*2)">' +
          ["月", "火", "水", "木", "金", "土", "日"].map((d, i) => '<span class="xw' + i + '">' + d + "</span>").join("") + "</div></div>" +
          plus("xd-p7", v(R.streak7), 26, 76, 1),
        tl: [[0, "show", "#xd-g"], [300, "pt", 0], [600, "count", ".xdn", 0, 10, 1500], [600, "bar", "#xd-b", 100], [2200, "show", "#xd-st"], [2400, "show", "#xd-p"],
          [2400, "count", ".xn", X0, X0 + v(R.daily), 900], [3300, "show", "#xd-w"], [3300, "pt", 1]]
          .concat([0, 1, 2, 3, 4, 5, 6].map((i) => [3700 + i * 260, "add", ".xw" + i, "on"]))
          .concat([[5700, "show", "#xd-p7"], [5700, "count", ".xn", X0 + v(R.daily), X0 + v(R.daily) + v(R.streak7), 1000], [6000, "pt", 2]]),
      },
      {
        id: "x-master", g: "覚える", t: "<span>習得</span>と単元マスター",
        lead: "日をあけて2回正解した問題が<b>習得</b>。ひとつの単元の問題をぜんぶ習得すると<b>単元マスター +" + fmt(v(R.topic)) + "</b>。",
        pts: ["まちがえた問題は<b>10分後</b>から、正解した問題は<b>1・3・7…日後</b>に復習", "<b>復習</b>で正解すると習得に近づく（ホームの「今日の復習」）", "単元ごとの<b>輪</b>がうまると単元マスター"],
        where: ["ホーム", "大問・単元マップ"], dur: 7600,
        html: top(X0) +
          '<div class="m cg-card" data-a="up" id="xm-l" style="' + at(5, 20, 90) + ';text-align:center"><div class="cg-h">1問の育ち方</div><div class="cg-lv" style="margin-top:calc(var(--u)*2)"><span class="xl0">はじめて</span>›<span class="xl1">正解</span>›<span class="xl2">日をあけて正解</span></div><div class="cg-s" style="margin-top:calc(var(--u)*1.6)">2回目の正解で <b style="color:#16c7a0">習得</b></div></div>' +
          '<div class="m" data-a="pop" id="xm-r" style="' + at(32, 47) + '"><div class="cg-ring" id="xm-rr" data-t="酸と塩基" style="--p:0"></div></div>' +
          '<div class="m cg-stamp" data-a="pop" id="xm-st" style="' + at(18, 52) + ';border-color:#16c7a0;color:#16c7a0">MASTER</div>' + plus("xm-p", v(R.topic), 26, 82, 1),
        tl: [[0, "show", "#xm-l"], [300, "pt", 0], [800, "add", ".xl0", "on"], [1500, "add", ".xl1", "on"], [2200, "add", ".xl2", "on"], [2800, "pt", 1], [3000, "show", "#xm-r"],
          [3300, "css", "#xm-rr", "--p:30"], [3700, "css", "#xm-rr", "--p:60"], [4100, "css", "#xm-rr", "--p:85"], [4500, "css", "#xm-rr", "--p:100"], [4600, "add", "#xm-r", "m-pulse"], [4700, "pt", 2],
          [5000, "show", "#xm-st"], [5300, "show", "#xm-p"], [5300, "count", ".xn", X0, X0 + v(R.topic), 1100]],
      },
      {
        id: "x-set", g: "覚える", t: "問題セットの<span>完全習得</span>と確認テスト",
        lead: "問題セットの問題をぜんぶ習得すると<b>完全習得 +" + fmt(v(R.gmaster)) + "</b>。そのあとの<b>確認テスト</b>（ヒントなし）で全問正解すると <b>+" + fmt(v(R.confirm)) + "</b>。20問以上のセットは<b>2倍</b>。",
        pts: ["セットの色：<b>灰</b>＝まだ・<b>橙</b>＝習得中・<b>緑</b>＝完全習得", "完全習得すると<b>確認テスト</b>が受けられる（何度でも）", "WP（Wisdom Point）も：完全習得 <b>+5</b>・確認テスト <b>+10</b>"],
        where: ["ホーム", "大問・問題セット"], dur: 8200,
        html: top(X0) +
          '<div class="m cg-card" data-a="up" id="xs-c" style="' + at(5, 20, 90) + '"><div class="cg-h">標準セット 2 ・ 第3問</div><div class="cg-s"><b class="xsn">8</b> / 12 習得</div><div class="cg-bar or" id="xs-bw"><b id="xs-b" style="width:66%"></b></div></div>' +
          '<div class="m cg-stamp" data-a="pop" id="xs-st" style="' + at(46, 23) + ';border-color:#16c7a0;color:#16c7a0">完全習得</div>' + plus("xs-p", v(R.gmaster), 30, 39) +
          '<div class="m cg-card" data-a="up" id="xs-t" style="' + at(5, 52, 90) + ';text-align:center"><div class="cg-h">確認テスト（ヒントなし）</div><div class="cg-s">12 / 12 正解</div></div>' +
          '<div class="m cg-medal" data-a="pop" id="xs-m" style="' + at(37, 63) + '">合格</div>' + plus("xs-p2", v(R.confirm), 26, 86, 1),
        tl: [[0, "show", "#xs-c"], [300, "pt", 0], [900, "count", ".xsn", 8, 12, 1200], [900, "bar", "#xs-b", 100], [2100, "rm", "#xs-bw", "or"], [2200, "show", "#xs-st"],
          [2400, "show", "#xs-p"], [2400, "count", ".xn", X0, X0 + v(R.gmaster), 900], [3300, "pt", 1], [3500, "show", "#xs-t"], [4300, "tap", 50, 57], [4800, "show", "#xs-m"], [4900, "add", "#xs-m", "m-glow"],
          [5200, "show", "#xs-p2"], [5200, "count", ".xn", X0 + v(R.gmaster), X0 + v(R.gmaster) + v(R.confirm), 1100], [6000, "pt", 2]],
      },
      {
        id: "x-book", g: "解く", t: "<span>模試の冊子</span>",
        lead: "時間を計って本番のように解く模試。組ごとに、はじめて <b>60%・80%・100%</b> をこえると <b>+" + fmt(v(R.set60)) + "・+" + fmt(v(R.set80)) + "・+" + fmt(v(R.set100)) + "</b>。",
        pts: ["60% をこえれば、<b>あとから 80%・100%</b> もそれぞれもらえる", "冊子をめくって解き、<b>最後にまとめて採点</b>", "途中でやめても、<b>続きから</b>解ける"],
        where: ["ホーム", "大問", "模試"], dur: 7600,
        html: top(X0) +
          '<div class="m cg-card" data-a="up" id="xb-c" style="' + at(5, 22, 90) + '"><div class="cg-h">📝 模試の冊子 ・ 難関セット 1</div><div class="cg-s" style="margin-bottom:calc(var(--u)*5)">正答率 <b class="xbn">0</b>%</div>' +
          '<div class="cg-meter"><b id="xb-m"></b><i style="left:60%"></i><i style="left:80%"></i></div><div style="position:relative;height:calc(var(--u)*5)"><span class="cg-mk" style="left:60%">60</span><span class="cg-mk" style="left:80%">80</span><span class="cg-mk" style="left:96%">100</span></div></div>' +
          plus("xb-p1", v(R.set60), 8, 52) + plus("xb-p2", v(R.set80), 36, 60) + plus("xb-p3", v(R.set100), 22, 72, 1),
        tl: [[0, "show", "#xb-c"], [300, "pt", 0], [900, "bar", "#xb-m", 62], [900, "count", ".xbn", 0, 62, 1100], [2000, "show", "#xb-p1"], [2000, "count", ".xn", X0, X0 + v(R.set60), 700],
          [2800, "pt", 1], [3000, "bar", "#xb-m", 84], [3000, "count", ".xbn", 62, 84, 900], [3900, "show", "#xb-p2"], [3900, "count", ".xn", X0 + v(R.set60), X0 + v(R.set60) + v(R.set80), 700],
          [4700, "bar", "#xb-m", 100], [4700, "count", ".xbn", 84, 100, 800], [5500, "show", "#xb-p3"], [5500, "count", ".xn", X0 + v(R.set60) + v(R.set80), X0 + v(R.set60) + v(R.set80) + v(R.set100), 900], [5800, "pt", 2]],
      },
      {
        id: "x-mix", g: "解く", t: "<span>ランダム10問</span>",
        lead: "いろいろな単元から10問。<b>90%以上で +" + fmt(v(R.mix90)) + "</b>、<b>全問正解で +" + fmt(v(R.mix100)) + "</b>。こちらは<b>何度でも</b>もらえます。",
        pts: ["ホームの<b>ランダム10問</b>から何度でも", "9問以上の正解でごほうび（<b>全問正解は3倍</b>）", "ビンゴの「ランダム10問で 90%以上」のマスもひらく"],
        where: ["ホーム", "ランダム10問"], dur: 6800,
        html: top(X0) +
          '<div class="m cg-card" data-a="up" id="xx-c" style="' + at(8, 22, 84) + ';text-align:center"><div class="cg-h">🎲 ランダム10問</div><div class="cg-dots" style="margin:calc(var(--u)*3) calc(var(--u)*4) calc(var(--u)*1)">' +
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => '<span class="xd' + i + '"></span>').join("") + '</div><div class="cg-s"><b class="xxn">0</b> / 10 正解</div></div>' +
          '<div class="m cg-stamp" data-a="pop" id="xx-st" style="' + at(30, 54) + '">全問正解！</div>' + plus("xx-p", v(R.mix100), 26, 68, 1),
        tl: [[0, "show", "#xx-c"], [300, "pt", 0]].concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => [800 + i * 220, "add", ".xd" + i, "on"]))
          .concat([[800, "count", ".xxn", 0, 10, 2200], [2400, "pt", 1], [3200, "show", "#xx-st"], [3500, "show", "#xx-p"], [3500, "count", ".xn", X0, X0 + v(R.mix100), 900], [4400, "pt", 2]]),
      },
      {
        id: "x-bingo", g: "毎月", t: "毎月の<span>ビンゴカード</span>",
        lead: "毎月1日に新しい 5×5 のカード。学ぶとマスが自動でひらき、そろったラインでごほうび。たて・よこ <b>" + fmt(v(1200)) + " XEVA＋🎫1</b>、ななめ <b>" + fmt(v(2000)) + "＋💎2</b>。",
        pts: ["<b>3ライン</b>で 💱両替チケット×2・<b>6ライン</b>でガチャ10連半額券", "25マス <b>コンプリート</b>で " + fmt(v(12000)) + " XEVA＋💎8＋🎫5＋半額券", "マスをタップすると<b>そのマスのやり方</b>と進みが出る"],
        where: ["ホーム", "ビンゴカード"], dur: 8200,
        html: top(X0) +
          '<div class="m" data-a="up" id="xg-c" style="' + at(8, 20, 84) + '"><div class="cg-bgo">' +
          ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Au", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Sc", "Ti", "V", "Cr"].map((s, i) => '<span class="xg' + i + (i === 12 ? " au" : "") + '">' + s + '<i class="bs"></i></span>').join("") + "</div></div>" +
          '<div class="m cg-bingo" data-a="pop" id="xg-b" style="' + at(10, 44, 80) + '">BINGO!</div>' +
          '<div class="m cg-card" data-a="up" id="xg-r" style="' + at(5, 70, 90) + ';text-align:center"><span class="cg-chip"><img src="' + XV + '" alt="" style="width:calc(var(--u)*3.6)">' + fmt(v(1200)) + '</span><span class="cg-chip">🎫 ×1</span><span class="cg-chip"><img src="' + GEM + '" alt="" style="width:calc(var(--u)*3.6)">ななめは💎2</span></div>',
        tl: [[0, "show", "#xg-c"], [300, "pt", 0]].concat([10, 11, 13, 14].map((k, i) => [900 + i * 330, "stampc", ".xg" + k]))
          .concat([[2400, "show", "#xg-b"], [2400, "add", "#xg-b", "m-pulse"], [2900, "show", "#xg-r"], [2900, "count", ".xn", X0, X0 + v(1200), 900], [3600, "pt", 1], [4000, "hide", "#xg-b"]])
          .concat([0, 6, 18, 24].map((k, i) => [4300 + i * 330, "stampc", ".xg" + k])).concat([[5800, "show", "#xg-b"], [6000, "pt", 2]]),
      },
      {
        id: "x-event", g: "イベント", t: "イベントの<span>倍率</span>と WP",
        lead: "XEVARION のイベント中は、MagiChemLex でもらえる XEVA が<b>2倍</b>などになります（ホームの上に 💜 の札）。完全習得・確認テストでたまる <b>WP</b> は、チケットやキャラと交換できます。",
        pts: ["倍率は<b>すべての XEVA</b>（はじめての正解・目標・ビンゴ…）にかかる", "WP 交換所：5WP 両替チケット・10WP フェスチケット・100WP 選べるSSR", "今の倍率は<b>ホームの「XEVA のもらい方」</b>にも出る"],
        where: ["ホーム", "イベントの札・WP 交換所"], dur: 7200,
        html: top(X0) +
          '<div class="m cg-ev" data-a="down" id="xe-e" style="' + at(8, 21, 84) + '">💜 イベント開催中　XEVA ×2</div>' +
          '<div class="m cg-card" data-a="up" id="xe-q" style="' + at(8, 36, 84) + ';text-align:center"><div class="cg-h">はじめての正解</div><div class="cg-big" style="font-size:1.6em;font-weight:900;color:#2c74d6">+<b class="xen">' + fmt(R.first) + "</b></div></div>" +
          '<div class="m cg-card" data-a="up" id="xe-w" style="' + at(8, 60, 84) + '"><div class="cg-h">💡 WP 交換所</div><div class="cg-row">💱 両替チケット<em>5 WP</em></div><div class="cg-row">🎫 フェスガチャチケット<em>10 WP</em></div><div class="cg-row" style="border:0">🎟 選べるSSR キャラ確定<em>100 WP</em></div></div>',
        tl: [[0, "show", "#xe-e"], [200, "add", "#xe-e", "m-shine"], [400, "pt", 0], [900, "show", "#xe-q"], [1700, "count", ".xen", R.first, R.first * 2, 900], [1700, "add", "#xe-q", "m-pulse"],
          [3000, "pt", 1], [3200, "show", "#xe-w"], [4600, "pt", 2]],
      },
      {
        id: "x-check", g: "まとめ", t: "どこで<span>確かめる</span>？",
        lead: "解き終わると、結果の画面にもらった XEVA の合計が出ます。もらい方の一覧はホームの「<b>XEVA のもらい方</b>」に。",
        pts: ["結果の画面の <b>+XEVA</b>（イベントの倍率も表示）", "ホームの<b>「XEVA のもらい方」</b>を開くと金額の一覧", "XEVA は XEVARION の<b>ガチャ・ショップ・両替</b>で使える"],
        where: ["結果の画面", "ホーム"], dur: 6800,
        html: top(X0) +
          '<div class="m cg-res" data-a="up" id="xc-r" style="' + at(8, 22, 84) + '"><div class="cg-s">おすすめ10問 の結果</div><div class="cg-big"><b class="xcn">0</b> / 10</div>' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*1.4);margin-top:calc(var(--u)*2);font-weight:900;color:#e08a00"><img src="' + XV + '" alt="" style="width:calc(var(--u)*6)">+<b class="xcx">0</b> XEVA</div></div>' +
          '<div class="m cg-card" data-a="up" id="xc-l" style="' + at(8, 56, 84) + '"><div class="cg-h">🎁 XEVA のもらい方</div>' +
          [["✅ はじめての正解", v(R.first)], ["🎯 今日の目標", v(R.daily)], ["🏅 単元マスター", v(R.topic)], ["🎓 確認テスト", v(R.confirm)]].map((r) => '<div class="cg-row">' + r[0] + "<em>+" + fmt(r[1]) + "</em></div>").join("") + "</div>",
        tl: [[0, "show", "#xc-r"], [300, "pt", 0], [600, "count", ".xcn", 0, 9, 900], [900, "count", ".xcx", 0, v(R.first) * 6 + v(R.daily), 1300], [900, "count", ".xn", X0, X0 + v(R.first) * 6 + v(R.daily), 1300],
          [2600, "pt", 1], [2800, "show", "#xc-l"], [4400, "pt", 2]],
      },
    ];
    return scenes;
  }

  function open(start) {
    if (!window.XevaTour || !XevaTour.pack) { U.toast("ガイドを読みこめませんでした（通信をたしかめてください）"); return; }
    XevaTour.pack("chemxeva", { name: "MagiChemLex", sub: "XEVA GUIDE", logo: "../thumbs/MagiChemLex.jpg?v=2", title: "XEVA のもらい方", scenes: build(), css: CSS });
    XevaTour.open(start || null, { pack: "chemxeva" });
  }
  U.act.xevaGuide = (el) => open(el && el.dataset ? el.dataset.v : null);
  window.MCLGuide = { open };
})();

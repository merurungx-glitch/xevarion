/* ============================================================
   MagiBattle 3.0 — mb3-guide.js（使い方をアニメで）
   ★★ 2026-10-31 ご指定「使い方をアニメーションで見られるように」
   ・XEVARION ガイドと同じプレイヤー（../xeva-tour.js の XevaTour.pack）。スマホの見本の中で、照準・射撃・バースト・敵の予兆などを動かして見せる。
   ・入口：ロビーの「使い方」・設定の「使い方をアニメで見る」・キーボードの G。はじめてロビーに来たときだけ、ボタンに小さな吹き出し（1回きり）。
   ============================================================ */
(function () {
  "use strict";
  const MB3 = window.MB3, UI = MB3.UI;
  const CSS = `
.xt-scr .mg-sky{position:absolute;left:0;right:0;top:0;height:46%;background:linear-gradient(180deg,#3a4fa8,#7aa0f0 70%,#c8dcff)}
.xt-scr .mg-gnd{position:absolute;left:0;right:0;top:46%;bottom:0;background:linear-gradient(180deg,#5a6280,#2e3350)}
.xt-scr .mg-city{position:absolute;left:0;right:0;top:30%;height:16%;background:repeating-linear-gradient(90deg,#2a3560 0 9%,#33407a 9% 15%,#26305a 15% 22%);clip-path:polygon(0 40%,8% 40%,8% 10%,16% 10%,16% 55%,26% 55%,26% 0,34% 0,34% 45%,46% 45%,46% 20%,58% 20%,58% 60%,70% 60%,70% 5%,80% 5%,80% 50%,92% 50%,92% 25%,100% 25%,100% 100%,0 100%)}
.xt-scr .mg-top{left:0;right:0;top:0;height:calc(var(--u)*15);display:flex;align-items:flex-end;justify-content:space-between;padding:0 calc(var(--u)*4) calc(var(--u)*1.6);z-index:20;color:#fff;font-weight:900;font-size:.62em;text-shadow:0 1px 2px #000}
.xt-scr .mg-en{z-index:4;width:calc(var(--u)*12);height:calc(var(--u)*12);border-radius:30%;background:linear-gradient(160deg,#9aa3bd,#5b6378);box-shadow:inset 0 calc(var(--u)*-1.4) 0 rgba(0,0,0,.25);display:grid;place-items:center}
.xt-scr .mg-en::after{content:"";width:34%;height:34%;border-radius:50%;background:#ff2f4f;box-shadow:0 0 calc(var(--u)*2.4) #ff2f4f}
.xt-scr .mg-en.big{width:calc(var(--u)*30);height:calc(var(--u)*24);border-radius:24%}
.xt-scr .mg-en.hit{animation:mgHit .14s ease 3}
@keyframes mgHit{50%{filter:brightness(2.4)}}
.xt-scr .mg-cov{z-index:6;height:calc(var(--u)*7);border-radius:calc(var(--u)*1.2) calc(var(--u)*1.2) 0 0;background:linear-gradient(180deg,#b8c0d4,#8790a8)}
.xt-scr .mg-sq{z-index:7;width:calc(var(--u)*12);height:calc(var(--u)*14);border-radius:calc(var(--u)*3) calc(var(--u)*3) calc(var(--u)*1) calc(var(--u)*1);background:#2a2440;transition:transform .25s}
.xt-scr .mg-sq.up{transform:translateY(calc(var(--u)*-4))}
.xt-scr .mg-cards{left:3%;right:3%;bottom:2.5%;display:grid;grid-template-columns:repeat(5,1fr);gap:calc(var(--u)*1.2);z-index:15}
.xt-scr .mg-cards span{position:relative;aspect-ratio:3/4;border-radius:calc(var(--u)*2);overflow:hidden;background:#fff;box-shadow:0 0 0 calc(var(--u)*.6) #fff}
.xt-scr .mg-cards img{width:100%;height:100%;object-fit:cover;object-position:center 12%}
.xt-scr .mg-cards span i{position:absolute;left:4%;top:4%;padding:0 calc(var(--u)*1);border-radius:calc(var(--u)*1);font-style:normal;font-weight:900;font-size:.5em;color:#fff}
.xt-scr .mg-cards span.ctl{box-shadow:0 0 0 calc(var(--u)*.9) #12b5ff,0 0 calc(var(--u)*3) #12b5ff}
.xt-scr .mg-cards span.rdy{box-shadow:0 0 0 calc(var(--u)*.9) var(--bc),0 0 calc(var(--u)*4) var(--bc);animation:xtPulse .6s ease-in-out infinite}
.xt-scr .mg-gauge{left:4%;right:4%;bottom:22%;height:calc(var(--u)*3.4);border-radius:99px;background:rgba(255,255,255,.85);overflow:hidden;z-index:15;box-shadow:0 0 0 calc(var(--u)*.5) #fff}
.xt-scr .mg-gauge b{position:absolute;left:0;top:0;bottom:0;width:0;background:linear-gradient(90deg,#12b5ff,#7b5cff);transition:width .9s ease}
.xt-scr .mg-gauge b.fb{background:linear-gradient(90deg,#ff4fa3,#ffb800,#12b5ff)}
.xt-scr .mg-cross{z-index:18;width:calc(var(--u)*14);height:calc(var(--u)*14);margin:calc(var(--u)*-7) 0 0 calc(var(--u)*-7);border-radius:50%;border:calc(var(--u)*.7) solid #5ef2ff;box-shadow:0 0 calc(var(--u)*2) #5ef2ff;transition:left .5s cubic-bezier(.4,.1,.2,1),top .5s cubic-bezier(.4,.1,.2,1)}
.xt-scr .mg-cross::before,.xt-scr .mg-cross::after{content:"";position:absolute;background:#5ef2ff;left:50%;top:-30%;width:calc(var(--u)*.6);height:160%;transform:translateX(-50%)}
.xt-scr .mg-cross::after{top:50%;left:-30%;height:calc(var(--u)*.6);width:160%;transform:translateY(-50%)}
.xt-scr .mg-shot{z-index:12;height:calc(var(--u)*.8);background:linear-gradient(90deg,rgba(255,240,170,0),#fff3b0);transform-origin:left center;border-radius:99px;box-shadow:0 0 calc(var(--u)*2) #ffd36b}
.xt-scr .mg-num{z-index:19;font-weight:900;font-size:1em;color:#fff;-webkit-text-stroke:calc(var(--u)*.4) #1a1030;text-shadow:0 calc(var(--u)*.6) 0 #1a1030}
.xt-scr .mg-num.cr{color:#ffd36b;font-size:1.3em}
.xt-scr .mg-num.co{color:#ff5a7a;font-size:1.35em}
.xt-scr .mg-msg{z-index:22;left:0;right:0;text-align:center;font-weight:900;font-size:1.5em;letter-spacing:.06em;color:#fff;-webkit-text-stroke:calc(var(--u)*.4) #1a1030}
.xt-scr .mg-msg small{display:block;font-size:.4em;letter-spacing:.3em;color:#9ff8ff}
.xt-scr .mg-msg.fb{background:linear-gradient(90deg,#ff4fa3,#ffd36b,#5ef2ff);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:0;filter:drop-shadow(0 0 calc(var(--u)*2) #ff4fa3)}
.xt-scr .mg-msg.warn{color:#ff5a7a}
.xt-scr .mg-cut{z-index:21;left:-10%;right:-10%;top:30%;height:26%;transform:skewY(-6deg);background:linear-gradient(100deg,#1a1440,var(--bc) 60%,#1a1440);display:flex;align-items:center;overflow:hidden;border-top:calc(var(--u)*.6) solid #fff;border-bottom:calc(var(--u)*.6) solid #fff}
.xt-scr .mg-cut img{height:160%;margin-left:16%;transform:skewY(6deg)}
.xt-scr .mg-cut b{margin-left:4%;transform:skewY(6deg);font-weight:900;color:#fff;font-size:.9em;text-shadow:0 calc(var(--u)*.5) 0 #000}
.xt-scr .mg-ring{z-index:5;border-radius:50%;border:calc(var(--u)*.8) solid #ff3b5a;background:rgba(255,59,90,.22);animation:xtPulse .5s ease-in-out infinite}
.xt-scr .mg-line{z-index:11;height:calc(var(--u)*.6);background:repeating-linear-gradient(90deg,#ff3b5a 0 calc(var(--u)*2),transparent calc(var(--u)*2) calc(var(--u)*3.4));transform-origin:left center}
.xt-scr .mg-boom{z-index:13;width:calc(var(--u)*20);height:calc(var(--u)*20);margin:calc(var(--u)*-10) 0 0 calc(var(--u)*-10);border-radius:50%;background:radial-gradient(circle,#fff,#ffd36b 30%,#ff7a3c 55%,rgba(255,80,40,0) 70%)}
.xt-scr .mg-boom.on{animation:mgBoom .5s ease-out both}
@keyframes mgBoom{0%{transform:scale(.2);opacity:1}100%{transform:scale(1.8);opacity:0}}
.xt-scr .mg-panel{z-index:16;background:#fff;border-radius:calc(var(--u)*4);box-shadow:0 calc(var(--u)*1) calc(var(--u)*4) rgba(30,40,100,.18);padding:calc(var(--u)*3)}
.xt-scr .mg-h{font-weight:900;font-size:.72em;color:#1e2547}
.xt-scr .mg-s{font-weight:800;font-size:.55em;color:#6b75a0}
.xt-scr .mg-bar{position:relative;height:calc(var(--u)*2.6);border-radius:99px;background:#e6ecf8;overflow:hidden;margin-top:calc(var(--u)*1.4)}
.xt-scr .mg-bar b{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99px;background:linear-gradient(90deg,#12b5ff,#7b5cff);transition:width 1s ease}
.xt-scr .mg-btn{z-index:17;display:flex;align-items:center;justify-content:center;border-radius:calc(var(--u)*3);font-weight:900;color:#fff;font-size:.7em;background:linear-gradient(135deg,#21b8ff,#7b5cff);box-shadow:0 calc(var(--u)*1) 0 #4a3aa8}
.xt-scr .mg-tile{z-index:16;border-radius:calc(var(--u)*3);color:#fff;font-weight:900;font-size:.62em;padding:calc(var(--u)*2.4);box-shadow:0 calc(var(--u)*.8) 0 rgba(0,0,0,.15)}
.xt-scr .mg-bu{display:inline-grid;place-items:center;min-width:calc(var(--u)*5);height:calc(var(--u)*5);border-radius:calc(var(--u)*1.2);font-weight:900;color:#fff;font-size:.6em;margin:0 calc(var(--u)*.4)}
.xt-scr .mg-lit{animation:xtGlow 1.2s ease-in-out infinite}
.xt-scr .mg-gold{box-shadow:0 0 0 calc(var(--u)*.7) #ffd36b,0 0 calc(var(--u)*3) #ffd36b !important}
`;
  function build() {
    const K = window.XevaTour.kit, A = K.A, at = K.at;
    const TH = (f) => A("img/t_" + f + ".webp");
    const SS = (f) => A("MagiBurst/img/ss/" + f + "SS.webp");
    const BC = { 1: "#18c48c", 2: "#3a7bff", 3: "#ff4d6d" };
    const squad = [["Ichika", 1], ["Shouko", 2], ["Chika", 3], ["Haru", 3], ["Hisako", 3]];
    const field = (extra) => '<div class="m on mg-sky"></div><div class="m on mg-city"></div><div class="m on mg-gnd"></div>' + (extra || "");
    const cards = (cls) => '<div class="m on mg-cards ' + (cls || "") + '">' + squad.map((s, i) => '<span class="mc mc' + i + '" style="--bc:' + BC[s[1]] + '"><img src="' + TH(s[0]) + '" alt=""><i style="background:' + BC[s[1]] + '">' + ["", "Ⅰ", "Ⅱ", "Ⅲ"][s[1]] + "</i></span>").join("") + "</div>";
    const covers = () => [0, 1, 2, 3, 4].map((i) => '<div class="m on mg-cov" style="' + at(4 + i * 19, 69, 16) + '"></div><div class="m on mg-sq sq' + i + '" style="' + at(6 + i * 19, 62) + '"></div>').join("");
    const gauge = () => '<div class="m on mg-gauge"><b id="mgG"></b></div>';
    const num = (id, x, y, t, cls) => '<div class="m mg-num ' + (cls || "") + '" data-a="pop" id="' + id + '" style="' + at(x, y) + '">' + t + "</div>";
    return [
      {
        id: "mb-intro", g: "はじめに", t: "うしろから撃つ<span>部隊シューティング</span>",
        lead: "5人の部隊で、遮蔽物のうしろから奥の敵を撃ちます。使えるのは超極祭系の UR 12体のうち、持っているキャラ。ロビーの「出撃」からキャンペーンへ。",
        pts: ["敵は奥から迫ってくる機械の侵略者〈ホロウ〉", "<b>1人を操作</b>、ほかの4人は自動で戦う", "ロビー：<b>出撃</b>・アリーナ・迎撃戦・タワー・前哨基地"],
        where: ["ロビー", "出撃"], dur: 7200,
        html: field('<div class="m mg-en" data-a="down" id="e1" style="' + at(20, 34) + '"></div><div class="m mg-en" data-a="down" id="e2" style="' + at(46, 30) + '"></div><div class="m mg-en" data-a="down" id="e3" style="' + at(70, 36) + '"></div>') + covers() + cards() +
          '<div class="m mg-msg" data-a="pop" id="mgM" style="top:12%"><small>VANGUARD</small>MISSION START</div>',
        tl: [[0, "show", "#mgM"], [300, "pt", 0], [900, "show", "#e1"], [1100, "show", "#e2"], [1300, "show", "#e3"], [2200, "hide", "#mgM"], [2400, "pt", 1], [2800, "add", ".mc2", "ctl"], [4400, "pt", 2]],
      },
      {
        id: "mb-aim", g: "操作", t: "照準を合わせて、<span>押して撃つ</span>",
        lead: "画面を押しているあいだ、操作中のキャラが照準に向かって撃ちます。指をはなすと遮蔽物に隠れて、弾が少なければリロード。",
        pts: ["指を置いたまま動かすと<b>照準が動く</b>（マウスはカーソルの位置）", "はなすと<b>隠れる</b>（隠れているあいだは遮蔽物がダメージを受ける）", "下の<b>カード</b>を押すと、操作するキャラが変わる"],
        where: ["バトル"], dur: 8000,
        html: field('<div class="m on mg-en" id="ae1" style="' + at(24, 32) + '"></div><div class="m on mg-en" id="ae2" style="' + at(62, 30) + '"></div>') + covers() + cards() +
          '<div class="m mg-cross" data-a="pop" id="ax" style="left:50%;top:50%"></div>' +
          '<div class="m mg-shot" id="as1" style="' + at(44, 60, 22) + ';transform:rotate(-125deg)"></div>' + num("an1", 24, 22, "1,284") + num("an2", 28, 18, "2,960", "cr"),
        tl: [[0, "show", "#ax"], [300, "pt", 0], [900, "css", "#ax", "left:30%;top:38%"], [1300, "tap", 30, 38], [1500, "add", ".sq2", "up"], [1600, "show", "#as1"], [1700, "add", "#ae1", "hit"], [1750, "show", "#an1"], [2100, "show", "#an2"], [2500, "hide", "#as1"],
          [3000, "pt", 1], [3100, "rm", ".sq2", "up"], [3200, "hide", "#an1,#an2"], [4600, "pt", 2], [4800, "tap", 70, 92], [5100, "rm", ".mc2", "ctl"], [5100, "add", ".mc3", "ctl"], [5600, "css", "#ax", "left:68%;top:36%"]],
      },
      {
        id: "mb-burst", g: "バースト", t: "Ⅰ→Ⅱ→Ⅲ で<span>FULL BURST</span>",
        lead: "敵に当てるとバーストゲージがたまります。満タンになったら、光ったカードを Ⅰ → Ⅱ → Ⅲ の順に押すとバーストスキル。Ⅲ のあと 10秒の FULL BURST（与ダメージ ×1.5）。",
        pts: ["カードの左上の <b>Ⅰ・Ⅱ・Ⅲ</b> がバーストの番", "Ⅰ・Ⅱ のあとは <b>10秒以内</b>に次をつなぐ", "編成には <b>Ⅰ・Ⅱ・Ⅲ をそろえる</b>のが大事"],
        where: ["バトル", "下のカード"], dur: 9000,
        html: field('<div class="m on mg-en" style="' + at(40, 30) + '"></div>') + covers() + gauge() + cards() +
          '<div class="m mg-cut" data-a="left" id="bc" style="--bc:#ff4d6d"><img src="' + SS("Chika") + '" alt=""><b>ルナ・ホワイトリリィ</b></div>' +
          '<div class="m mg-msg fb" data-a="pop" id="bfb" style="top:20%"><small>ALL SQUAD</small>FULL BURST</div>',
        tl: [[0, "pt", 0], [300, "bar", "#mgG", 100], [1300, "add", ".mc0", "rdy"], [1700, "tap", 12, 92], [2000, "rm", ".mc0", "rdy"], [2100, "add", ".mc1", "rdy"], [2500, "tap", 31, 92], [2800, "rm", ".mc1", "rdy"], [2900, "add", ".mc2", "rdy"], [3200, "pt", 1],
          [3600, "tap", 50, 92], [3900, "rm", ".mc2", "rdy"], [3900, "show", "#bc"], [5000, "hide", "#bc"], [5100, "show", "#bfb"], [5100, "add", "#mgG", "fb"], [5200, "add", "#bfb", "m-pulse"], [6000, "pt", 2]],
      },
      {
        id: "mb-core", g: "ねらい", t: "<span>コア</span>と得意な距離",
        lead: "敵の赤く光るコアに当てるとダメージが大きくなり、数字も赤く大きく出ます。武器には得意な距離があり（SG・SMG は手前、SR・RL は奥）、得意な距離の敵には +30%。",
        pts: ["<b>コア</b>＝弱点（WEAK POINT）", "盾を持つ敵は、上の<b>コア</b>を狙えば盾を無視できる", "<b>SR・RL</b> はためて撃つ（照準の円がいっぱいで発射）"],
        where: ["バトル"], dur: 7000,
        html: field('<div class="m on mg-en big" id="ce" style="' + at(34, 22) + '"></div>') + covers() + cards() +
          '<div class="m mg-cross" data-a="pop" id="cx" style="left:30%;top:30%"></div>' + num("cn1", 54, 18, "18,620", "co") + '<div class="m mg-boom" id="cb" style="left:49%;top:33%"></div>',
        tl: [[0, "show", "#cx"], [300, "pt", 0], [900, "css", "#cx", "left:49%;top:33%"], [1500, "tap", 49, 33], [1700, "add", "#cb", "on"], [1700, "show", "#cb"], [1750, "add", "#ce", "hit"], [1800, "show", "#cn1"], [2800, "pt", 1], [4400, "pt", 2]],
      },
      {
        id: "mb-enemy", g: "敵の攻撃", t: "予兆を見て<span>隠れる</span>",
        lead: "敵は攻撃の前に合図を出します。赤い線（狙撃）・赤い円（曲射・ミサイルの雨）・赤く光る突進・青い輪（EMP）。合図が出たら、そのキャラを隠れさせましょう（指をはなす）。",
        pts: ["<b>赤い円</b>：その下のキャラと、となりにも当たる", "<b>突進</b>：光ったら来る。先に倒すのがいちばん", "<b>EMP</b>：バーストゲージが減る。<b>回復ドローン</b>は先に倒す"],
        where: ["バトル"], dur: 8200,
        html: field('<div class="m on mg-en" id="ee1" style="' + at(18, 30) + '"></div><div class="m on mg-en" id="ee2" style="' + at(66, 28) + '"></div>') + covers() + cards() +
          '<div class="m mg-line" id="el" style="' + at(24, 36, 40) + ';transform:rotate(58deg)"></div>' +
          '<div class="m mg-ring" data-a="pop" id="er" style="' + at(40, 63, 22, 7) + '"></div>' +
          '<div class="m mg-boom" id="eb" style="left:51%;top:64%"></div>' +
          '<div class="m mg-msg warn" data-a="pop" id="ew" style="top:14%"><small>CAUTION</small>隠れて！</div>',
        tl: [[0, "pt", 0], [400, "show", "#el"], [700, "add", "#ee1", "m-glow"], [1500, "add", ".sq1", "up"], [1800, "rm", ".sq1", "up"], [2300, "hide", "#el"], [2600, "show", "#er"], [2700, "show", "#ew"], [3300, "pt", 1], [4300, "show", "#eb"], [4300, "add", "#eb", "on"], [4400, "hide", "#er"], [4600, "hide", "#ew"], [5400, "pt", 2]],
      },
      {
        id: "mb-boss", g: "ボス", t: "ボスの<span>部位・BREAK・盾</span>",
        lead: "腕や砲などの部位は壊せます（その攻撃が弱まる）。チャージ中は BREAK のゲージを削りきると止められます。盾を張ったらコアか部位を撃つ。HP が半分を切ると激昂して攻撃が速くなります。",
        pts: ["<b>BREAK</b>：成功すると気絶して撃ち放題", "<b>レーザー</b>は左から右へ、<b>地ひびき</b>は身を出しているキャラに", "ボスの WAVE の前に <b>WARNING</b>"],
        where: ["バトル", "ボス"], dur: 8200,
        html: field('<div class="m on mg-en big" id="bb" style="' + at(35, 20) + ';width:calc(var(--u)*30);height:calc(var(--u)*26)"></div>') + covers() + cards() +
          '<div class="m mg-panel" data-a="down" id="bh" style="' + at(8, 13, 84) + ';padding:calc(var(--u)*1.6) calc(var(--u)*2.4)"><div class="mg-h">フォートレス・タイタン</div><div class="mg-bar"><b id="bhp" style="width:100%;background:linear-gradient(90deg,#ff4d6d,#ff9a3c)"></b></div></div>' +
          '<div class="m mg-msg" data-a="pop" id="bbr" style="top:46%;color:#ffd36b">BREAK!</div>' + '<div class="m mg-msg warn" data-a="pop" id="ben" style="top:46%">激昂</div>',
        tl: [[0, "show", "#bh"], [300, "pt", 0], [800, "bar", "#bhp", 78], [1600, "add", "#bb", "hit"], [2200, "show", "#bbr"], [2300, "add", "#bbr", "m-pulse"], [3000, "hide", "#bbr"], [3300, "pt", 1], [3500, "bar", "#bhp", 46], [4400, "show", "#ben"], [4400, "add", "#bb", "m-shake"], [5200, "hide", "#ben"], [5400, "pt", 2]],
      },
      {
        id: "mb-grow", g: "育成", t: "育てる・<span>まとめて強化</span>",
        lead: "部隊の画面からキャラを選ぶと、レベル・スキル・装備・キューブ・好感度を育てられます。素材は「できるだけ」「まとめて」使えます。完凸（凸4）のキャラは金色に光ります。",
        pts: ["<b>並び替え・絞り込み</b>はボタンを押して下から選ぶ", "レベルの上限は<b>凸</b>で 80→120→160→200（ガチャと共通）", "<b>アイテム</b>の画面：ギフトをまとめてわたす・おまかせ強化"],
        where: ["部隊", "キャラ", "アイテム"], dur: 8200,
        html: '<div class="m on fill" style="background:linear-gradient(180deg,#eef4ff,#fdf0ff)"></div>' +
          '<div class="m mg-panel" data-a="up" id="gp" style="' + at(6, 16, 88) + ';display:flex;gap:calc(var(--u)*2)">' + [["Kohaku", 1], ["Haru", 0], ["Yuna", 0]].map((c, i) => '<span class="' + (c[1] ? "mg-gold" : "") + '" style="flex:1;aspect-ratio:3/4;border-radius:calc(var(--u)*2.4);overflow:hidden;box-shadow:0 0 0 calc(var(--u)*.5) #e3e9f7"><img src="' + TH(c[0]) + '" alt="" style="width:100%;height:100%;object-fit:cover"></span>').join("") + "</div>" +
          '<div class="m mg-panel" data-a="up" id="gl" style="' + at(6, 48, 88) + '"><div class="mg-h">Lv.<b class="glv">118</b> / 160</div><div class="mg-bar"><b id="glb" style="width:40%"></b></div><div class="mg-s" style="margin-top:calc(var(--u)*1.4)">スキル Lv.<b class="gsk">4</b> ・ 装備 +<b class="gge">2</b></div></div>' +
          '<div class="m mg-btn" data-a="up" id="gb" style="' + at(12, 74, 76, 7) + '">できるだけ上げる</div>',
        tl: [[0, "show", "#gp"], [300, "pt", 0], [900, "show", "#gl"], [1400, "show", "#gb"], [1900, "pt", 1], [2400, "tap", 50, 77], [2700, "count", ".glv", 118, 142, 1200], [2700, "bar", "#glb", 85], [3600, "count", ".gsk", 4, 7, 700], [4100, "count", ".gge", 2, 5, 600], [4700, "pt", 2]],
      },
      {
        id: "mb-form", g: "編成", t: "<span>編成</span>は Ⅰ・Ⅱ・Ⅲ をそろえる",
        lead: "下のナビの「編成」で、出撃に使う5人を3つまで作っておけます。バーストの Ⅰ・Ⅱ・Ⅲ がそろっていると FULL BURST までつながります。迷ったら「おまかせ」。",
        pts: ["<b>バーストのつながり</b>に ✓ が3つ", "<b>部隊の戦力</b>と推奨戦力を見くらべる", "持っているキャラだけで組む（体験キャラはなし）"],
        where: ["下のナビ", "編成"], dur: 7400,
        html: '<div class="m on fill" style="background:linear-gradient(180deg,#eef4ff,#f2fff9)"></div>' +
          '<div class="m mg-panel" data-a="up" id="fp" style="' + at(5, 18, 90) + ';display:grid;grid-template-columns:repeat(5,1fr);gap:calc(var(--u)*1.2)">' + squad.map((s, i) => '<span class="fs fs' + i + '" style="aspect-ratio:3/4.2;border-radius:calc(var(--u)*2);overflow:hidden;opacity:0;transition:opacity .3s;box-shadow:0 0 0 calc(var(--u)*.5) ' + BC[s[1]] + '"><img src="' + SS(s[0]) + '" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center 10%"></span>').join("") + "</div>" +
          '<div class="m mg-panel" data-a="up" id="fc" style="' + at(5, 50, 90) + ';text-align:center"><span class="mg-bu" style="background:#18c48c">Ⅰ</span>✓ → <span class="mg-bu" style="background:#3a7bff">Ⅱ</span>✓ → <span class="mg-bu" style="background:#ff4d6d">Ⅲ</span>✓</div>' +
          '<div class="m mg-btn" data-a="up" id="fo" style="' + at(10, 70, 36, 7) + ';background:#fff;color:#4a5590;box-shadow:0 0 0 calc(var(--u)*.5) #d8e0f2">おまかせ</div><div class="m mg-btn" data-a="up" id="fg" style="' + at(50, 70, 40, 7) + '">出撃</div>',
        tl: [[0, "show", "#fp"], [300, "pt", 0], [600, "show", "#fo"], [600, "show", "#fg"], [1100, "tap", 28, 73]].concat([0, 1, 2, 3, 4].map((i) => [1400 + i * 160, "css", ".fs" + i, "opacity:1"])).concat([[2400, "show", "#fc"], [2600, "pt", 1], [4200, "pt", 2], [4600, "tap", 70, 73]]),
      },
      {
        id: "mb-arena", g: "アリーナ", t: "<span>アリーナ</span>は自動戦",
        lead: "ほかの指揮官の防衛編成と5対5。撃つのもバーストも両方とも自動なので、育成と編成で勝負が決まります。勝つとポイント、毎月の段位でジェムとコイン。",
        pts: ["相手のバーストは上に<b>ENEMY BURST</b>と出る", "<b>防衛編成</b>を登録すると、ほかの指揮官があなたに挑む", "1日 5回・90秒で決着しないときは残り HP の多いほうが勝ち"],
        where: ["下のナビ", "アリーナ"], dur: 7600,
        html: field(["Yuna", "Aina", "Suzu", "Chie", "Alice"].map((f, i) => '<img class="m on" src="' + TH(f) + '" alt="" style="' + at(6 + i * 18.5, 34, 13) + ';border-radius:50%;box-shadow:0 0 0 calc(var(--u)*.5) #ff4d6d">').join("")) + covers() + gauge() + cards() +
          '<div class="m mg-panel" data-a="down" id="aeg" style="' + at(20, 16, 60) + ';padding:calc(var(--u)*1.2) calc(var(--u)*2);background:#3a1030;color:#fff"><div class="mg-s" style="color:#ffb0c8">ENEMY BURST Ⅱ</div></div>',
        tl: [[0, "pt", 0], [400, "bar", "#mgG", 100], [1300, "add", ".mc0", "rdy"], [2100, "rm", ".mc0", "rdy"], [2600, "show", "#aeg"], [2700, "pt", 1], [4400, "pt", 2]],
      },
      {
        id: "mb-modes", g: "ほかのモード", t: "迎撃戦・タワー・<span>前哨基地</span>",
        lead: "迎撃戦は毎日かわるボスに与えたダメージを競い（1日3回）、タワーは100階までの腕だめし、前哨基地は時間とともに素材がたまります。",
        pts: ["<b>迎撃戦</b>：弱点の属性で +25%・段位でごほうび・月間ランキング", "<b>タワー</b>：10階ごとに守護者・はじめての階でごほうび", "<b>前哨基地</b>：最大24時間ぶん・殲滅で2時間ぶんをすぐ"],
        where: ["ロビー"], dur: 7000,
        html: '<div class="m on fill" style="background:linear-gradient(180deg,#eaf3ff,#fff2fa)"></div>' +
          [["迎撃戦", "#ff8a2a"], ["タワー", "#8a5cff"], ["前哨基地", "#18c48c"], ["アリーナ", "#ff4fa3"]].map((t, i) => '<div class="m mg-tile mt' + i + '" data-a="pop" style="' + at(6 + (i % 2) * 46, 26 + Math.floor(i / 2) * 22, 42, 18) + ';background:' + t[1] + '">' + t[0] + "</div>").join(""),
        tl: [[0, "show", ".mt0"], [200, "show", ".mt1"], [400, "show", ".mt2"], [600, "show", ".mt3"], [700, "pt", 0], [1500, "tap", 27, 35], [2600, "pt", 1], [3200, "tap", 73, 35], [4200, "pt", 2], [4600, "tap", 27, 57]],
      },
      {
        id: "mb-ctrl", g: "便利な操作", t: "AUTO・速さ・<span>キーボード</span>",
        lead: "AUTO にすると全員が自動で戦い、オン・オフは次のバトルにも引きつぎます。×2 で速く。ロビーやキャラ詳細では「隠す」（PC は Space・H）で文字を消して絵だけを見られます。",
        pts: ["<b>T</b>＝AUTO・<b>X</b>＝速さ・<b>1〜5</b>＝キャラ／バースト・<b>Space</b>＝撃つ", "BGM と効果音の ON／OFF・音量は<b>設定</b>で", "見たストーリーは<b>ストーリー</b>の画面から見返せる"],
        where: ["バトル", "設定"], dur: 7000,
        html: field() + covers() + gauge() + cards() +
          '<div class="m mg-btn" data-a="pop" id="ca" style="' + at(60, 70.5, 18, 5) + ';background:#fff;color:#4a5590">AUTO</div><div class="m mg-btn" data-a="pop" id="cs" style="' + at(80, 70.5, 14, 5) + ';background:#fff;color:#4a5590">×1</div>',
        tl: [[0, "show", "#ca"], [0, "show", "#cs"], [300, "pt", 0], [1000, "tap", 69, 73], [1300, "css", "#ca", "background:linear-gradient(135deg,#21b8ff,#7b5cff);color:#fff"], [2000, "tap", 87, 73], [2300, "text", "#cs", "×2"], [2800, "pt", 1], [4400, "pt", 2]],
      },
    ];
  }
  UI.guide = function (start) {
    if (!window.XevaTour || !XevaTour.pack) { UI.toast("使い方を読みこめませんでした（通信をたしかめてください）"); return; }
    XevaTour.pack("magibattle", { name: "MagiBattle", sub: "GUIDE", logo: "../thumbs/MagiBattle.jpg?v=4", title: "MagiBattle の遊び方", scenes: build(), css: CSS });
    XevaTour.open(start || null, { pack: "magibattle" });
  };
  /* はじめてロビーに来たとき、ロビーの「使い方」に小さな吹き出し（1回きり） */
  UI.guideHint = function () {
    try {
      if (localStorage.getItem("mb3_guide_hint_v1")) return;
      const b = document.querySelector('.lb-sq[data-go="guide"]'); if (!b) return;
      localStorage.setItem("mb3_guide_hint_v1", "1");
      const tp = document.createElement("span"); tp.className = "lb-tip"; tp.textContent = "遊び方はここから動きで見られます";
      b.appendChild(tp); setTimeout(() => { try { tp.remove(); } catch (e) {} }, 4500);
    } catch (e) {}
  };
})();

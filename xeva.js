/* ============================================================
   XEVA — XEVARION 統合ゲーム内通貨ウォレット + アカウント管理
   ============================================================ */
(function () {
  "use strict";

  var KEY = "xeva_wallet_v1";
  var ACC_KEY = "xeva_account_v1";
  var GEM_KEY = "xeva_gem_v1";
  var LOGIN_BONUS = 50; // kept for compatibility
  var DAILY_REWARDS = [50, 50, 50, 50, 50, 100, 150]; // day 1-7

  // 全キャラクターマスタ（ガチャ・アカウントアイコン共通）
  var CHAR_MASTER = [
    {id:"hina",  name:"ヒナ",  file:"../img/Hina.webp",   rarity:"SR", season:0},
    {id:"kotomi",name:"コトミ",file:"../img/Kotomi.webp",  rarity:"SSR",season:1},
    {id:"runa",  name:"ルナ",  file:"../img/Runa.webp",   rarity:"SR", season:1},
    {id:"noa",   name:"ノア",  file:"../img/Noa.webp",    rarity:"SR", season:1},
    {id:"haruka",name:"ハルカ",file:"../img/Haruka.webp",  rarity:"SR", season:1},
    {id:"shion", name:"シオン",file:"../img/Shiona.webp",   rarity:"SR", season:1},
    {id:"ede",   name:"エデ",  file:"../img/Ede.webp",    rarity:"SR", season:1},
    {id:"yuina", name:"ユイナ",file:"../img/Yuina.webp",   rarity:"SR", season:1},
    {id:"ririka",name:"リリカ",file:"../img/Ririka.webp",  rarity:"SR", season:1},
    {id:"serina",name:"セリナ",file:"../img/Serina.webp",  rarity:"SR", season:1},
    {id:"akane", name:"アカネ",file:"../img/Akane.webp",   rarity:"SR", season:1},
    {id:"riko",  name:"リコ",  file:"../img/Riko.webp",   rarity:"SSR",season:2},
    {id:"airi",  name:"アイリ",file:"../img/Airi.webp",   rarity:"SR", season:2},
    {id:"eruna", name:"エルナ",file:"../img/Eruna.webp",   rarity:"SR", season:2},
    {id:"kotoha",name:"コトハ",file:"../img/Kotoha.webp",  rarity:"SR", season:2},
    {id:"mika",  name:"ミカ",  file:"../img/Mika.webp",   rarity:"SR", season:2},
    {id:"mirea", name:"ミレア",file:"../img/Mirea.webp",   rarity:"SR", season:2},
    {id:"miyu",  name:"ミユ",  file:"../img/Miyu.webp",   rarity:"SR", season:2},
    {id:"nene",  name:"ネネ",  file:"../img/Nene.webp",   rarity:"SR", season:2},
    {id:"rei",   name:"レイ",  file:"../img/Rei.webp",    rarity:"SR", season:2},
    {id:"rusia", name:"ルシア",file:"../img/Rusia.webp",   rarity:"SR", season:2},
    {id:"kaho",  name:"カホ",  file:"../img/Kaho.webp",   rarity:"SSR",season:3},
    {id:"nana",  name:"ナナ",  file:"../img/Nana.webp",   rarity:"SSR",season:3},
    {id:"rea",   name:"レア",  file:"../img/Rea.webp",    rarity:"SSR",season:4},
    {id:"rinon", name:"リノン",file:"../img/RinonX.webp",  rarity:"SSR",season:4},
    // Bシリーズ（series:"B"。Aシリーズはシーズン1〜4＝series未指定）
    // ※ MagiBurst と連携する4人（クロスガチャ）。所持状況・凸(最大4)は MagiBurst と共有。
    //   アリサは旧A-S5から移籍（IDは据え置き＝所持状況・MagiBattle性能はそのまま）
    {id:"mion",  name:"ミオン",file:"../img/Mion.webp",   rarity:"SSR",season:1,series:"B"},
    {id:"kokona",name:"ココナ",file:"../img/Kokona.webp", rarity:"SSR",season:2,series:"B"},
    {id:"mao",   name:"マオ",  file:"../img/Mao.webp",    rarity:"SSR",season:3,series:"B"},
    {id:"arisa", name:"アリサ",file:"../img/Arisa.webp",  rarity:"SSR",season:4,series:"B"},
    {id:"ayaka", name:"アヤカ",file:"../img/Ayaka.webp", rarity:"SSR",season:0,cdk:true},
    // 報酬キャラ（ガチャ排出なし・season:0）。MagiLex 30コンテンツ完全習得で解放、35/40/45/50でさらに凸。
    // MagiBurst・MagiBattle・アイコンなど全コンテンツで使用可。
    {id:"mizuki",name:"ミズキ",file:"../img/Mizuki.webp",rarity:"SSR",season:0,reward:true}
  ];

  /* スターターミッション（アプリを1回さわってみる系）。
     達成は各アプリの XEVA.completeMission(id) から。report は表示用のメタ（xevarion.js の MISSION_META）。 */
  var MISSIONS = {
    magilex_play:        { reward: 200, title: "MagiLex で問題にチャレンジしよう",        app: "MagiLex" },
    magiburst_play:      { reward: 200, title: "MagiBurst でクエストをクリアしよう",      app: "MagiBurst" },
    magibattle_win:      { reward: 200, title: "MagiBattle でバトルに勝利しよう",         app: "MagiBattle" },
    magichainparty_play: { reward: 150, title: "MagiChainParty で対戦してみよう",         app: "MagiChainParty" },
    magiempire_play:     { reward: 150, title: "MagiEmpire で国盗り対戦をしよう",         app: "MagiEmpire" },
    magidiamond_play:    { reward: 150, title: "MagiDiamond で読み合い野球盤を遊ぼう",    app: "MagiDiamond" },
    magimanor_play:      { reward: 150, title: "MagiManor で洋館を探索しよう",            app: "MagiManor" },
    magifocus_study:     { reward: 200, title: "MagiFocus で集中セッションを完了しよう",  app: "MagiFocus" },
    magilink_register:   { reward: 150, title: "MagiLink に登録して友達とつながろう",     app: "MagiLink" },
    magiportfolio_add:   { reward: 150, title: "MagiPortfolio に銘柄を追加しよう",        app: "MagiPortfolio" },
    magijackpot_play:    { reward: 200, title: "MagiJackpot でゲームを1回プレイしよう",   app: "MagiJackpot" },
    xevynar_ask:         { reward: 150, title: "XEVYNAR に質問してみよう",                app: "XEVYNAR" }
    /* ※ magisharecore_play / magimuse_play は 2026-07-29 のサービス終了にともない削除 */
  };

  /* ── ウォレット ── */
  function freshState() {
    return { balance: 0, lastLoginDate: null, missions: {}, history: [] };
  }
  function load() {
    try { var r = localStorage.getItem(KEY); if (r) { var s = JSON.parse(r); if (s && typeof s === "object") return s; } } catch (e) {}
    return freshState();
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  var state = load();

  /* 累計獲得XEVA（＝ホームのEXP。消費しても減らない）。
     旧データには存在しないので、初回だけ現在残高で埋める。 */
  function totalEarned(s) {
    if (typeof s.totalEarned !== "number" || s.totalEarned < 0) s.totalEarned = Math.max(0, s.balance || 0);
    return s.totalEarned;
  }

  /* opts.noRank = true を渡すと、月間XEVAランキングの集計に載せない。
     ★ メール（運営からの配布）・ランキングの順位賞金がこれ。
       配布は「遊んで稼いだ量」ではないので、順位に混ぜると
       受け取った人と受け取っていない人でスタートラインが変わってしまう。 */
  function add(amount, reason, opts) {
    amount = Math.round(amount || 0);
    if (!amount) return load().balance || 0;
    /* ★ 必ず localStorage から読み直してから足す（2026-08-03 の同期修正）。
       クラウド同期（xeva-cloud.js の pullNow）は、画面に戻ってきたタイミングで
       localStorage の残高を静かに差し替える。ページを開いたときに読んだ state を
       そのまま使って足すと、その差し替えを丸ごと巻き戻して保存してしまい、
       「別の端末で増やしたはずのXEVAが元に戻る」＝同期していないように見えていた。 */
    state = load();
    state.balance = (state.balance || 0) + amount;
    state.totalEarned = totalEarned(state) + Math.max(0, amount);   // 獲得だけ積む
    state.history = state.history || [];
    state.history.unshift({ amount: amount, reason: reason || "", t: Date.now() });
    if (state.history.length > 100) state.history.length = 100;
    save(state);
    /* 月間XEVA獲得ランキング（MagiRanking）用: 全コンテンツの獲得をローカルに積み、
       xeva-cloud.js がオンライン時にクラウド(monthly)へ送信する。
       MagiRanking の順位賞金は二重加算を避けるため集計対象外。 */
    if (amount > 0 && !(opts && opts.noRank) && !/MagiRanking.*賞金/.test(reason || "")) {
      try {
        var pend = Number(localStorage.getItem("xeva_earn_pending_v1") || 0) + amount;
        localStorage.setItem("xeva_earn_pending_v1", String(pend));
        window.dispatchEvent(new CustomEvent("xeva:earned", { detail: { amount: amount } }));
      } catch (e) {}
    }
    emit();
    return state.balance;
  }

  function emit() {
    try { window.dispatchEvent(new CustomEvent("xeva:change", { detail: { balance: state.balance || 0 } })); } catch (e) {}
  }

  /* ════════════ 💎ジェム — XEVARION 共通のプレミアム通貨 ════════════
     もともと MagiBurst のガチャ専用（magiburst_v1.orbs）だったものを、
     ポータル共通の通貨に格上げした。

     ★ iPhone で「増えない・減らない」が起きていた理由と対策
       旧構成では、ジェムの残高が MagiBurst 専用 Firebase(magiburst) の
       magiburst_v1 の中にあり、XEVA はアカウント Firebase(xevarion-account) にあった。
       別々のプロジェクト・別々のタイムスタンプで同期されるため、
       「XEVA は減ったのにジェムは増えていない」のような食い違いが起きる。
       iOS はホームに戻った瞬間にページを凍結するので、
       遅い方の同期が届かず、その状態が固定されやすかった。
       → 残高を xeva_gem_v1 という *アカウント側の同期キー* 1本に集約し、
         xeva-cloud.js の URGENT_KEYS（＝即時 push ＋ 離脱時 keepalive 送信）に
         登録することで、XEVA とまったく同じ経路・同じ時刻基準で同期する。

     形: { balance, spent, history:[{amount,reason,t}], mig:{ magiburst:1 }, at }
     mig は移行済みフラグ。アカウント単位で同期されるので、
     別端末から古いセーブが降ってきても二重に加算されない。 */
  function freshGem() { return { balance: 0, spent: 0, history: [], mig: {}, at: 0 }; }
  function loadGem() {
    try {
      var r = localStorage.getItem(GEM_KEY);
      if (r) {
        var s = JSON.parse(r);
        if (s && typeof s === "object") {
          if (typeof s.balance !== "number" || !isFinite(s.balance) || s.balance < 0) s.balance = 0;
          if (!Array.isArray(s.history)) s.history = [];
          if (!s.mig || typeof s.mig !== "object") s.mig = {};
          return s;
        }
      }
    } catch (e) {}
    return freshGem();
  }
  function saveGem(s) {
    s.at = Date.now();
    if (s.history.length > 60) s.history.length = 60;
    try { localStorage.setItem(GEM_KEY, JSON.stringify(s)); } catch (e) {}
    emitGem(s.balance);
  }
  function emitGem(bal) {
    try { window.dispatchEvent(new CustomEvent("xeva:gem", { detail: { balance: bal | 0 } })); } catch (e) {}
  }

  var gem = {
    KEY: GEM_KEY,
    /* 常に localStorage から読み直す。
       別タブ・クラウド同期が書き換えた直後でも必ず最新を返すため、
       モジュール内にキャッシュを持たない。 */
    get: function () { return loadGem().balance | 0; },
    getBalance: function () { return loadGem().balance | 0; },
    add: function (n, reason) {
      n = Math.round(n || 0);
      if (!n) return loadGem().balance | 0;
      var s = loadGem();
      s.balance = Math.max(0, (s.balance || 0) + n);
      s.history.unshift({ amount: n, reason: reason || "", t: Date.now() });
      saveGem(s);
      return s.balance;
    },
    /* 足りなければ false を返して何もしない（呼び出し側で残高チェックを二重にしなくてよい） */
    spend: function (n, reason) {
      n = Math.round(n || 0);
      if (n <= 0) return true;
      var s = loadGem();
      if ((s.balance || 0) < n) return false;
      s.balance -= n;
      s.spent = (s.spent || 0) + n;
      s.history.unshift({ amount: -n, reason: reason || "", t: Date.now() });
      saveGem(s);
      return true;
    },
    canAfford: function (n) { return (loadGem().balance | 0) >= Math.round(n || 0); },
    /* 残高をそのまま置き換える（移行・管理画面用） */
    set: function (n, reason) {
      var s = loadGem();
      s.balance = Math.max(0, Math.round(n || 0));
      s.history.unshift({ amount: 0, reason: reason || "残高を設定", t: Date.now() });
      saveGem(s);
      return s.balance;
    },
    getHistory: function () { return loadGem().history || []; },
    /* 旧データからの一度きりの移行。
       同じ tag では二度と走らないので、古いセーブが同期で降ってきても増えない。 */
    migrateOnce: function (tag, amount, reason) {
      var s = loadGem();
      if (s.mig[tag]) return false;
      s.mig[tag] = Date.now();
      amount = Math.max(0, Math.round(amount || 0));
      if (amount) {
        s.balance = (s.balance || 0) + amount;
        s.history.unshift({ amount: amount, reason: reason || ("移行：" + tag), t: Date.now() });
      }
      saveGem(s);
      return true;
    },
    isMigrated: function (tag) { return !!loadGem().mig[tag]; },
    /* 💎アイコンの HTML（ポータル直下からの相対パス base を渡す） */
    icon: function (base) {
      return '<img class="xv-gemico" src="' + (base == null ? "" : base) + 'gem.png" alt="ジェム">';
    }
  };

  /* 他タブ・クラウド同期が書き換えたら残高表示を更新する。
     ★ クラウドから取り込んだ直後（xeva:synced）も、メモリ上の state を必ず捨てて
       読み直す。ここを怠ると、古い state のまま次の add/spend が走って
       取り込んだ残高を上書きしてしまう。 */
  try {
    window.addEventListener("storage", function (e) {
      if (e.key === GEM_KEY) emitGem(loadGem().balance);
      if (e.key === KEY) { state = load(); emit(); }
    });
    window.addEventListener("xeva:synced", function () {
      state = load();
      emitGem(loadGem().balance);
    });
  } catch (e) {}

  /* ── 旧 MagiBurst セーブからの自動移行 ──
     移行は MagiBurst 本体でも行うが、それだと「MagiBurst を開くまでホームのジェムが 0」に見える。
     ポータルや他アプリでも、手元に magiburst_v1 があればここで拾っておく。
     migrateOnce はタグ単位で一度きりなので、どちらが先に走っても結果は同じ。 */
  (function autoMigrateBurstGems() {
    try {
      if (gem.isMigrated("magiburst_orbs")) return;
      var raw = localStorage.getItem("magiburst_v1");
      if (!raw) return;                       // このアカウントに MagiBurst のセーブがまだ無い
      var db = JSON.parse(raw);
      if (!db || typeof db !== "object" || typeof db.orbs !== "number") return;
      gem.migrateOnce("magiburst_orbs", db.orbs, "MagiBurst のジェムを XEVARION 共通ウォレットへ移行");
    } catch (e) {}
  })();

  /* ── アカウント ── */
  function loadAcc() {
    try { var r = localStorage.getItem(ACC_KEY); if (r) { var a = JSON.parse(r); if (a) return a; } } catch (e) {}
    return null;
  }
  function saveAcc(a) { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); } catch (e) {} }

  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-05 MagiBurst のキャラをアカウントアイコンに使う
     ──────────────────────────────────────────────
     ・画像は <b>MagiBurst/img/ をそのまま参照</b>する。chars/ へコピーしない
       （同じ絵を2か所に置くと、片方だけ差し替わって食い違うため）。
     ・そのために file には "../img/t_Xxx.webp" のように <b>1つ上へ戻るパス</b>を持たせる。
       表示側は "chars/" または "chars_s/" を前に付けるので、
         chars_s/../img/t_Hina.webp → img/t_Hina.webp
       と、どちらの経路でも同じ場所に解決される（chars も chars_s も1階層なので成り立つ）。
     ★ 2026-08-10 <b>アプリに関係なく全キャラを選べる</b>ようにした。
       ・以前は magiburst_v1 の所持キャラだけを出していたので、
         MagiBurst を遊んでいない人はほぼ選べなかった。アイコンは見た目だけのものなので、
         所持で絞る意味がない。
       ・この一覧は <b>MagiBurst/js/mb-core.js の CHARS / CHAR_IDS から作った写し</b>（No. 順）。
         手で書き足していたころは No.53 で止まっており、新キャラがずっと出てこなかった。
         <b>キャラを足したらここにも1行足すこと</b>（mb-core.js は 600KB あるので
         ポータルの全ページで読むわけにはいかず、名前と絵だけをここへ写している）。
     ══════════════════════════════════════════════════════════════ */
  var MB_CHAR_MASTER = [
    { id: "mb:hina", mbId: "hina", name:"ヒナ", file: "../img/t_Hina.webp" },
    { id: "mb:runa", mbId: "runa", name:"ルナ", file: "../img/t_Runa.webp" },
    { id: "mb:noa", mbId: "noa", name:"ノア", file: "../img/t_Noa.webp" },
    { id: "mb:haruka", mbId: "haruka", name:"ハルカ", file: "../img/t_Haruka.webp" },
    { id: "mb:shiona", mbId: "shiona", name:"シオナ", file: "../img/t_Shiona.webp" },
    { id: "mb:ede", mbId: "ede", name:"エデ", file: "../img/t_Ede.webp" },
    { id: "mb:yuina", mbId: "yuina", name:"ユイナ", file: "../img/t_Yuina.webp" },
    { id: "mb:ririka", mbId: "ririka", name:"リリカ", file: "../img/t_Ririka.webp" },
    { id: "mb:serina", mbId: "serina", name:"セリナ", file: "../img/t_Serina.webp" },
    { id: "mb:akane", mbId: "akane", name:"アカネ", file: "../img/t_Akane.webp" },
    { id: "mb:airi", mbId: "airi", name:"アイリ", file: "../img/t_Airi.webp" },
    { id: "mb:eruna", mbId: "eruna", name:"エルナ", file: "../img/t_Eruna.webp" },
    { id: "mb:kotoha", mbId: "kotoha", name:"コトハ", file: "../img/t_Kotoha.webp" },
    { id: "mb:mika", mbId: "mika", name:"ミカ", file: "../img/t_Mika.webp" },
    { id: "mb:mirea", mbId: "mirea", name:"ミレア", file: "../img/t_Mirea.webp" },
    { id: "mb:miyu", mbId: "miyu", name:"ミユ", file: "../img/t_Miyu.webp" },
    { id: "mb:nene", mbId: "nene", name:"ネネ", file: "../img/t_Nene.webp" },
    { id: "mb:rei", mbId: "rei", name:"レイ", file: "../img/t_Rei.webp" },
    { id: "mb:rusia", mbId: "rusia", name:"ルシア", file: "../img/t_Rusia.webp" },
    { id: "mb:ema", mbId: "ema", name:"エマ", file: "../img/t_Ema.webp" },
    { id: "mb:sakura", mbId: "sakura", name:"サクラ", file: "../img/t_Sakura.webp" },
    { id: "mb:arisa", mbId: "arisa", name:"アリサ", file: "../img/t_Arisa.webp" },
    { id: "mb:kaguya", mbId: "kaguya", name:"カグヤ", file: "../img/t_Kaguya.webp" },
    { id: "mb:cheryl", mbId: "cheryl", name:"シェリー", file: "../img/t_Cheryl.webp" },
    { id: "mb:aira", mbId: "aira", name:"アイラ", file: "../img/t_Aira.webp" },
    { id: "mb:shion", mbId: "shion", name:"シオン", file: "../img/t_Shion.webp" },
    { id: "mb:viola", mbId: "viola", name:"ヴィオラ", file: "../img/t_Viola.webp" },
    { id: "mb:mion", mbId: "mion", name:"ミオン", file: "../img/t_Mion.webp" },
    { id: "mb:kokona", mbId: "kokona", name:"ココナ", file: "../img/t_Kokona.webp" },
    { id: "mb:mao", mbId: "mao", name:"マオ", file: "../img/t_Mao.webp" },
    { id: "mb:bernica", mbId: "bernica", name:"ベルニカ", file: "../img/t_Bernica.webp" },
    { id: "mb:tsubaki", mbId: "tsubaki", name:"ツバキ", file: "../img/t_Tsubaki.webp" },
    { id: "mb:alicia", mbId: "alicia", name:"アリシア", file: "../img/t_Alicia.webp" },
    { id: "mb:natsuki", mbId: "natsuki", name:"ナツキ", file: "../img/t_Natsuki.webp" },
    { id: "mb:mizuki", mbId: "mizuki", name:"ミズキ", file: "../img/t_Mizuki.webp" },
    { id: "mb:ayaka", mbId: "ayaka", name:"アヤカ", file: "../img/t_Ayaka.webp" },
    { id: "mb:iroha", mbId: "iroha", name:"イロハ", file: "../img/t_Iroha.webp" },
    { id: "mb:shirayuki", mbId: "shirayuki", name:"シラユキ", file: "../img/t_Shirayuki.webp" },
    { id: "mb:mashiro", mbId: "mashiro", name:"マシロ", file: "../img/t_Mashiro.webp" },
    { id: "mb:hotaru", mbId: "hotaru", name:"ホタル", file: "../img/t_Hotaru.webp" },
    { id: "mb:koharu", mbId: "koharu", name:"コハル", file: "../img/t_Koharu.webp" },
    { id: "mb:yuri", mbId: "yuri", name:"ユリ", file: "../img/t_Yuri.webp" },
    { id: "mb:rinne", mbId: "rinne", name:"リンネ", file: "../img/t_Rinne.webp" },
    { id: "mb:hecatia", mbId: "hecatia", name:"ヘカーティア", file: "../img/t_Hecatia.webp" },
    { id: "mb:rezelia", mbId: "rezelia", name:"レゼリア", file: "../img/t_Rezelia.webp" },
    { id: "mb:elsia", mbId: "elsia", name:"エルシア", file: "../img/t_Elsia.webp" },
    { id: "mb:karina", mbId: "karina", name:"カリナ", file: "../img/t_Karina.webp" },
    { id: "mb:nephia", mbId: "nephia", name:"ネフィア", file: "../img/t_Nephia.webp" },
    { id: "mb:setsuna", mbId: "setsuna", name:"セツナ", file: "../img/t_Setsuna.webp" },
    { id: "mb:selene", mbId: "selene", name:"セレネ", file: "../img/t_Selene.webp" },
    { id: "mb:nazuna", mbId: "nazuna", name:"ナズナ", file: "../img/t_Nazuna.webp" },
    { id: "mb:lilia", mbId: "lilia", name:"リリア", file: "../img/t_Lilia.webp" },
    { id: "mb:revia", mbId: "revia", name:"レヴィア", file: "../img/t_Revia.webp" },
    { id: "mb:fiona", mbId: "fiona", name:"フィオナ", file: "../img/t_Fiona.webp" },
    { id: "mb:milfy", mbId: "milfy", name:"ミルフィ", file: "../img/t_Milfy.webp" },
    { id: "mb:mabel", mbId: "mabel", name:"メイベル", file: "../img/t_Mabel.webp" },
    { id: "mb:abyss", mbId: "abyss", name:"アビス", file: "../img/t_Abyss.webp" },
    { id: "mb:arche", mbId: "arche", name:"アーク", file: "../img/t_Arche.webp" },
    { id: "mb:chloe", mbId: "chloe", name:"クロエ", file: "../img/t_Chloe.webp", since:"2026-07-27" },
    { id: "mb:kaguyaalpha", mbId: "kaguyaalpha", name:"カグヤα", file: "../img/t_KaguyaAlpha.webp", since:"2026-07-31" },
    { id: "mb:mionalpha", mbId: "mionalpha", name:"ミオンα", file: "../img/t_MionAlpha.webp", since:"2026-07-31" },
    { id: "mb:sheril", mbId: "sheril", name:"シェリル", file: "../img/t_Sheril.webp", since:"2026-08-04" },
    { id: "mb:fia", mbId: "fia", name:"フィア", file: "../img/t_Fia.webp", since:"2026-08-04" },
    { id: "mb:lysera", mbId: "lysera", name:"リセラ", file: "../img/t_Lysera.webp", since:"2026-08-04" },
    { id: "mb:soleria", mbId: "soleria", name:"ソレリア", file: "../img/t_Soleria.webp", since:"2026-08-04" },
    { id: "mb:beltia", mbId: "beltia", name:"ベルティア", file: "../img/t_Beltia.webp", since:"2026-08-04" },
    { id: "mb:astera", mbId: "astera", name:"アステラ", file: "../img/t_Astera.webp", since:"2026-08-04" },
    { id: "mb:nemu", mbId: "nemu", name:"ネム", file: "../img/t_Nemu.webp", since:"2026-08-05" },
    { id: "mb:roselia", mbId: "roselia", name:"ロゼリア", file: "../img/t_Roselia.webp", since:"2026-08-05" },
    { id: "mb:shizuka", mbId: "shizuka", name:"シズカ", file: "../img/t_Shizuka.webp", since:"2026-08-05" },
    { id: "mb:yuria", mbId: "yuria", name:"ユリア", file: "../img/t_Yuria.webp", since:"2026-08-06" },
    { id: "mb:altia", mbId: "altia", name:"アルティア", file: "../img/t_Altia.webp", since:"2026-08-06" },
    { id: "mb:liana", mbId: "liana", name:"リアナ", file: "../img/t_Liana.webp", since:"2026-08-06" },
    { id: "mb:solea", mbId: "solea", name:"ソレア", file: "../img/t_Solea.webp", since:"2026-08-06" },
    { id: "mb:yaju", mbId: "yaju", name:"野獣先輩", file: "../img/t_Yaju.webp" },
    { id: "mb:iori", mbId: "iori", name:"イオリ", file: "../img/t_Iori.webp", since:"2026-08-07" },
    { id: "mb:noelle", mbId: "noelle", name:"ノエル", file: "../img/t_Noelle.webp", since:"2026-08-07" },
    { id: "mb:yukino", mbId: "yukino", name:"ユキノ", file: "../img/t_Yukino.webp", since:"2026-08-07" },
    { id: "mb:reika", mbId: "reika", name:"レイカ", file: "../img/t_Reika.webp", since:"2026-08-07" },
    { id: "mb:dominia", mbId: "dominia", name:"ドミニア", file: "../img/t_Dominia.webp", since:"2026-08-07" },
    { id: "mb:nanami", mbId: "nanami", name:"ナナミ", file: "../img/t_Nanami.webp", since:"2026-08-08" },
    { id: "mb:chitose", mbId: "chitose", name:"チトセ", file: "../img/t_Chitose.webp", since:"2026-08-08" },
    { id: "mb:kaede", mbId: "kaede", name:"カエデ", file: "../img/t_Kaede.webp", since:"2026-08-08" },
    { id: "mb:rinon", mbId: "rinon", name:"ルクシア", file: "../img/t_Rinon.webp", since:"2026-08-08" },
    { id: "mb:kokoro", mbId: "kokoro", name:"ココロ", file: "../img/t_Kokoro.webp", since:"2026-08-08" },
    { id: "mb:ange", mbId: "ange", name:"アンジェ", file: "../img/t_Ange.webp", since:"2026-08-08" },
    { id: "mb:kotone", mbId: "kotone", name:"コトネ", file: "../img/t_Kotone.webp", since:"2026-08-08" },
    { id: "mb:ran", mbId: "ran", name:"ラン", file: "../img/t_Ran.webp", since:"2026-08-08" },
    { id: "mb:ceris", mbId: "ceris", name:"セリス", file: "../img/t_Ceris.webp", since:"2026-08-08" },
    { id: "mb:kotomi", mbId: "kotomi", name:"コトミ", file: "../img/t_Kotomi.webp", since:"2026-08-10" },
    { id: "mb:riko", mbId: "riko", name:"リコ", file: "../img/t_Riko.webp", since:"2026-08-10" },
    { id: "mb:kaho", mbId: "kaho", name:"カホ", file: "../img/t_Kaho.webp", since:"2026-08-10" },
    { id: "mb:nana", mbId: "nana", name:"ナナ", file: "../img/t_Nana.webp", since:"2026-08-10" },
    { id: "mb:rea", mbId: "rea", name:"レア", file: "../img/t_Rea.webp", since:"2026-08-10" },
    { id: "mb:rinonx", mbId: "rinonx", name:"リノン", file: "../img/t_RinonX.webp", since:"2026-08-10" },
    /* ★ 2026-08-11 プレミアム★5 3体 ＋ Luminous Summer Fest 追加2体
       ★ 2026-08-12 シェリーαの番号を 99 にしたので、並びもそれに合わせて動かしてある
         （この配列の並び＝MagiBurst の CHAR_IDS の並び＝No. の順）。 */
    { id: "mb:shizuku", mbId: "shizuku", name:"シズク", file: "../img/t_Shizuku.webp", since:"2026-08-11" },
    { id: "mb:yuunagi", mbId: "yuunagi", name:"ユウナギ", file: "../img/t_Yuunagi.webp", since:"2026-08-11" },
    { id: "mb:izumi", mbId: "izumi", name:"イズミ", file: "../img/t_Izumi.webp", since:"2026-08-11" },
    { id: "mb:cherylalpha", mbId: "cherylalpha", name:"シェリーα", file: "../img/t_CherylAlpha.webp", since:"2026-08-11" },
    { id: "mb:kokonaalpha", mbId: "kokonaalpha", name:"ココナα", file: "../img/t_KokonaAlpha.webp", since:"2026-08-11" },
    /* ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定★5 6体 */
    { id: "mb:fuka", mbId: "fuka", name:"フウカ", file: "../img/t_Fuka.webp", since:"2026-08-12" },
    { id: "mb:tsumugi", mbId: "tsumugi", name:"ツムギ", file: "../img/t_Tsumugi.webp", since:"2026-08-12" },
    { id: "mb:suzuka", mbId: "suzuka", name:"スズカ", file: "../img/t_Suzuka.webp", since:"2026-08-12" },
    { id: "mb:karem", mbId: "karem", name:"カレム", file: "../img/t_Karem.webp", since:"2026-08-12" },
    { id: "mb:mayu", mbId: "mayu", name:"マユ", file: "../img/t_Mayu.webp", since:"2026-08-12" },
    { id: "mb:chizuru", mbId: "chizuru", name:"チヅル", file: "../img/t_Chizuru.webp", since:"2026-08-12" },
  ];
  /* ★ 2026-08-10 初期★4 4体（ゼラ・アヤメ・レイラ・セリーヌ）は廃止しました。
     いまは<b>全キャラがアイコンに選べる</b>ので、starter という区別そのものが要らない。 */
  var MB_STARTERS = [];
  MB_CHAR_MASTER.forEach(function (c) { c.mb = true; c.starter = MB_STARTERS.indexOf(c.mbId) >= 0; });
  /* id は "mb:zera" のように接頭辞つき。XEVAガチャにも同じ名前のキャラ（シオンなど）が
     いるので、接頭辞を付けないと canonCharFile が別人の絵を返してしまう。 */
  var MB_BY_ID = (function () {
    var m = {};
    for (var i = 0; i < MB_CHAR_MASTER.length; i++) m[MB_CHAR_MASTER[i].id] = MB_CHAR_MASTER[i];
    return m;
  })();
  /* MagiBurst のセーブ（magiburst_v1）から「持っているキャラ」を読む。
     ★ 2026-08-10 アイコンの出し分けには使わなくなった（全キャラ選べる）。
        所持しているかどうかの印を付けたくなったときのために残してある。 */
  function mbOwnedIds() {
    var owned = {};
    try {
      var raw = localStorage.getItem("magiburst_v1");
      var db = raw ? JSON.parse(raw) : null;
      if (db && db.chars) Object.keys(db.chars).forEach(function (k) { owned[k] = true; });
    } catch (e) {}
    MB_STARTERS.forEach(function (k) { owned[k] = true; });
    return owned;
  }
  /* アイコンに選べる MagiBurst キャラの一覧（No. 順）
     ★ 2026-08-10 「そのアプリで持っているキャラだけ」という絞りをやめた。
       アイコンは見た目だけのものなので、アプリを遊んでいるかどうかに関係なく
       <b>全キャラから選べる</b>ようにする。 */
  function mbIconChars() { return MB_CHAR_MASTER.slice(); }

  /* ══════════════════════════════════════════════════════════════
     ★ 2026-08-10 新キャラのお知らせ（前回ログインから増えたぶん）

     ・MB_CHAR_MASTER の since（追加された日）と、
       xeva_newchar_v1 に控えた「もう見せたキャラ」を突き合わせて、
       <b>まだ見せていない・すでに追加日を迎えているキャラ</b>だけを返す。
     ・はじめて開いた人にいきなり36体ぶん出しても意味がないので、
       台帳が空のときは<b>その時点のキャラを全部「見た」ことにして何も出さない</b>
       （次に足されたキャラから告知が始まる）。
     ・日付はローカル日付で見る（toISOString は UTC なので日本は9時間おくれる）。
     ══════════════════════════════════════════════════════════════ */
  var NEWCHAR_KEY = "xeva_newchar_v1";
  function ncLoad() {
    try { var r = localStorage.getItem(NEWCHAR_KEY); if (r) { var p = JSON.parse(r); if (p && Array.isArray(p.seen)) return p; } } catch (e) {}
    return null;
  }
  function ncSave(p) { try { localStorage.setItem(NEWCHAR_KEY, JSON.stringify(p)); } catch (e) {} }
  function ncToday() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  /* 追加日を迎えているキャラ（新しい順） */
  function ncLive() {
    var t = ncToday();
    return MB_CHAR_MASTER.filter(function (c) { return c.since && c.since <= t; })
      .sort(function (a, b) { return String(b.since).localeCompare(String(a.since)); });
  }
  /* まだ見せていない新キャラ。無ければ空配列 */
  function newCharsUnseen() {
    var p = ncLoad();
    if (!p) {                                   // はじめての人＝いまある顔ぶれは「既知」にする
      ncSave({ seen: ncLive().map(function (c) { return c.mbId; }), at: Date.now() });
      return [];
    }
    return ncLive().filter(function (c) { return p.seen.indexOf(c.mbId) < 0; });
  }
  /* 見せ終わったら控える（次からは出ない） */
  function markNewCharsSeen() {
    var p = ncLoad() || { seen: [] };
    ncLive().forEach(function (c) { if (p.seen.indexOf(c.mbId) < 0) p.seen.push(c.mbId); });
    p.at = Date.now();
    ncSave(p);
  }
  /* ★ 2026-08-10 キャラ画像は XEVARION 直下の img/ に集約した（形式は WebP に統一）。
     file は "../img/Xxx.webp" のように<b>1つ上へ戻るパス</b>で持つ。表示側は
     "chars/" か "../chars/" を前に付けるので、どちらの経路でも img/ に解決される。
     （chars/ と chars_s/ はもう存在しないが、この打ち消しの形は各アプリを
       1つも触らずに移せるので、そのまま使っている） */
  function isFlatImg(f) { return /^\.\.\/(img|MagiBurst\/img)\//.test(String(f || "")); }
  /* 旧名: MagiBurst のキャラかどうか。いまは「打ち消しパスかどうか」と同じ意味 */
  function isMbCharFile(f) { return isFlatImg(f); }
  /* サムネイル（小さい表示用）のパス。"../img/Xxx.webp" → "../img/t_Xxx.webp" */
  function thumbFile(f) {
    var v = String(f || "");
    if (!v) return "";
    if (/\/t_[^/]*$/.test(v)) return v;                       // すでにサムネ
    return v.replace(/\/([^/]+)$/, "/t_$1");
  }

  /* ════════════ キャラ画像パスの正規化（アイコンが出ないアカウントの救済） ════════════
     accounts/{uid}/charFile には、キャラをフォルダ移動する前の古いパスが
     そのまま残っているアカウントがある（例: ミオン "s5/Mion.png" → 現在 "bs1/Mion.png"、
     ココナ "s7/Kokona.png" → 現在 "bs2/Kokona.png"）。
     そのまま <img src> に入れると 404 になり「一部のアカウントだけアイコンが出ない」状態になる。
     ここで CHAR_MASTER を正として解決し直す。 */

  /* ファイル名 → 現行パス（同名が複数フォルダにある分は CHAR_MASTER にある方を正とする） */
  /* ★ 2026-08-10 キー は<b>拡張子を落とした</b>ファイル名にする。
     画像を img/ へ集約して WebP にそろえたので、保存されている古い charFile
     （"s0/Hina.png" など）とは拡張子まで食いちがう。名前だけで引き当てる。
     ★ 移行で名前が衝突した2体は、旧 charFile → 新ファイルの対応を手で入れる。 */
  var FILE_BY_BASE = (function () {
    var m = {};
    for (var i = 0; i < CHAR_MASTER.length; i++) {
      var f = CHAR_MASTER[i].file;
      var b = f.split("/").pop().replace(/\.[a-z0-9]+$/i, "").toLowerCase();
      m[b] = f;
    }
    /* 旧 "s4/Rinon.png"（XEVAガチャのリノン）は MagiBurst の別人リノンと名前がぶつかるので
       RinonX.webp に、旧 "sr/Shion.png" は Shiona.webp に移してある。 */
    m["rinon"] = "../img/RinonX.webp";
    m["shion"] = "../img/Shiona.webp";
    return m;
  })();
  /* 旧パス（フォルダつき・拡張子つき）から名前だけを取り出す */
  function baseKey(p) { return String(p || "").split("/").pop().replace(/\.[a-z0-9]+$/i, "").toLowerCase(); }

  /* charId（あれば最優先）と charFile から、いま実在するパスを返す。
     解決できなければ元の値をそのまま返す（勝手に別人の絵にしない）。 */
  function canonCharFile(charFile, charId) {
    var i;
    /* ★ 2026-08-05 MagiBurst のキャラは chars/ に無いので、先に MagiBurst 側を見る。
       ここを通さないと、下の「ファイル名で探す」で見つからず raw のまま返るのは同じだが、
       charId だけ保存されていた場合に解決できなくなる。 */
    if (charId && MB_BY_ID[charId] && isMbCharFile(charFile)) return MB_BY_ID[charId].file;
    if (isMbCharFile(charFile)) return String(charFile).trim();
    if (charId) {
      for (i = 0; i < CHAR_MASTER.length; i++) { if (CHAR_MASTER[i].id === charId) return CHAR_MASTER[i].file; }
      /* XEVAガチャに無い id で、MagiBurst には居る＝MagiBurst のキャラをアイコンにしている */
      if (MB_BY_ID[charId]) return MB_BY_ID[charId].file;
    }
    var raw = String(charFile == null ? "" : charFile).trim();
    if (!raw) return "";
    for (i = 0; i < CHAR_MASTER.length; i++) { if (CHAR_MASTER[i].file === raw) return raw; }   // 既に正しい
    var hit = FILE_BY_BASE[baseKey(raw)];
    return hit || raw;
  }

  /* <img src> に入れる完全なURL。base は chars/ の場所（省略時はページからの相対）。
     size:"s" を渡すと軽量版 chars_s/ を使う。 */
  function charSrc(charFile, charId, base, size) {
    var f = canonCharFile(charFile, charId);
    if (!f) return "";
    if (/^(https?:)?\/\//.test(f) || f.indexOf("data:") === 0) return f;   // 既に絶対URL
    /* ★ 2026-08-10: 小さい表示は t_ 付き（300px）を使う */
    if (size === "s" && isFlatImg(f)) f = thumbFile(f);
    var dir = (size === "s" ? "chars_s/" : "chars/");
    return (base == null ? dir : String(base).replace(/\/?$/, "/") + dir) + f;
  }

  /* ── 公開API ── */
  var XEVA = {
    KEY: KEY,
    ACC_KEY: ACC_KEY,
    GEM_KEY: GEM_KEY,
    /* 💎ジェム（XEVARION 共通のプレミアム通貨） */
    gem: gem,
    LOGIN_BONUS: LOGIN_BONUS,
    MISSIONS: MISSIONS,
    CHARS: CHAR_MASTER,
    charThumbFile: thumbFile,
    /* ★ 2026-08-05 MagiBurst のキャラ（アカウントアイコン用。画像は MagiBurst/img を直接参照） */
    MB_CHARS: MB_CHAR_MASTER,
    MB_STARTERS: MB_STARTERS,
    mbIconChars: mbIconChars,
    /* ★ 2026-08-10 新キャラのお知らせ（前回ログインから増えたぶん） */
    newCharsUnseen: newCharsUnseen,
    markNewCharsSeen: markNewCharsSeen,
    isMbCharFile: isMbCharFile,
    /* キャラ画像パスの正規化（古いフォルダのまま保存されたアカウントの救済） */
    canonCharFile: canonCharFile,
    charSrc: charSrc,

    reload: function () { state = load(); return state; },
    getBalance: function () { state = load(); return state.balance || 0; },
    /* これまでに獲得したXEVAの累計（XEVARION ホームの EXP に使う） */
    getTotalEarned: function () {
      state = load();
      var t = totalEarned(state);
      if (state.totalEarned !== t) save(state);
      return t;
    },
    add: add,

    spend: function (amount) {
      state = load();
      amount = Math.round(amount || 0);
      if ((state.balance || 0) < amount) return false;
      state.balance -= amount; save(state); emit();
      return true;
    },

    /* 週間ログインボーナス（7日スタンプ制） */
    grantLoginBonus: function () {
      state = load();
      var today = new Date().toISOString().slice(0, 10);
      if (state.lastLoginDate === today) {
        return { amount: 0, day: state.loginStreak || 1, alreadyClaimed: true };
      }
      var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      var streak = state.loginStreak || 0;
      if (state.lastLoginDate === yesterday && streak >= 1 && streak < 7) {
        streak = streak + 1;
      } else if (state.lastLoginDate === yesterday && streak === 7) {
        streak = 1; // 新しい週スタート
      } else {
        streak = 1; // 途切れたのでリセット
      }
      var amount = DAILY_REWARDS[streak - 1];
      state.lastLoginDate = today;
      state.loginStreak = streak;
      state.totalLoginDays = (state.totalLoginDays || 0) + 1;
      save(state);
      add(amount, streak + "日目ログインボーナス");
      return { amount: amount, day: streak, totalDays: state.totalLoginDays };
    },
    hasLoginBonus: function () {
      state = load();
      return state.lastLoginDate === new Date().toISOString().slice(0, 10);
    },
    getLoginStreak: function () {
      state = load();
      return state.loginStreak || 0;
    },

    /* ミッション
       達成（completeMission）では報酬を付与せず「達成・未受取」にマークするだけ。
       報酬はポータルのミッション画面で「受け取る」（claimMission）を押したときに付与する。 */
    isMissionDone: function (id) { state = load(); return !!(state.missions && state.missions[id]); },
    isMissionClaimed: function (id) { state = load(); return !!(state.missionClaims && state.missionClaims[id]); },
    completeMission: function (id) {
      var m = MISSIONS[id]; if (!m) return 0;
      state = load();
      state.missions = state.missions || {};
      if (state.missions[id]) return 0;
      state.missions[id] = Date.now(); save(state);
      // 報酬は付与しない（受け取り式）。呼び出し側の「+X XEVA獲得」トーストは出さないため 0 を返す。
      emit();
      return 0;
    },
    claimMission: function (id) {
      var m = MISSIONS[id]; if (!m) return 0;
      state = load();
      state.missions = state.missions || {};
      state.missionClaims = state.missionClaims || {};
      if (!state.missions[id]) return 0;       // 未達成
      if (state.missionClaims[id]) return 0;   // 受取済み
      state.missionClaims[id] = Date.now(); save(state);
      return add(m.reward, "ミッション達成：" + m.title);
    },
    getMissions: function () {
      state = load();
      return Object.keys(MISSIONS).map(function (id) {
        return { id: id, title: MISSIONS[id].title, reward: MISSIONS[id].reward,
          app: MISSIONS[id].app,
          done: !!(state.missions && state.missions[id]),
          claimed: !!(state.missionClaims && state.missionClaims[id]) };
      });
    },
    getHistory: function () { state = load(); return state.history || []; },

    getTotalLoginDays: function () { state = load(); return state.totalLoginDays || 0; },

    /* ログインマイルストーン */
    getLoginMilestones: function () {
      state = load();
      var totalDays = state.totalLoginDays || 0;
      var claimed = state.loginMilestones || {};
      var milestones = [];
      var shown = Math.max(Math.ceil((totalDays + 1) / 10) * 10 + 10, 30);
      for (var d = 10; d <= shown; d += 10) {
        var reward = (d % 100 === 0) ? 500 : 100;
        milestones.push({ days: d, reward: reward, reached: totalDays >= d, claimed: !!claimed[d] });
      }
      return { totalDays: totalDays, milestones: milestones };
    },
    claimLoginMilestone: function (days) {
      state = load();
      var totalDays = state.totalLoginDays || 0;
      if (totalDays < days) return 0;
      state.loginMilestones = state.loginMilestones || {};
      if (state.loginMilestones[days]) return 0;
      state.loginMilestones[days] = Date.now();
      save(state);
      var reward = (days % 100 === 0) ? 500 : 100;
      return add(reward, "ログイン" + days + "日達成ボーナス");
    },

    /* 友達追加ボーナス (+50 XEVA、1人につき1回) */
    claimFriendBonus: function (friendUid) {
      state = load();
      var key = "friend_" + friendUid;
      state.missions = state.missions || {};
      if (state.missions[key]) return 0;
      state.missions[key] = Date.now();
      save(state);
      return add(50, "友達追加ボーナス");
    },

    /* アカウント管理 */
    account: {
      get: loadAcc,
      save: saveAcc,
      setupDone: function () { var a = loadAcc(); return !!(a && a.setupDone); },
      delete: function () { try { localStorage.removeItem(ACC_KEY); } catch (e) {} },
      getChar: function () {
        var a = loadAcc();
        if (!a || !a.charId) return CHAR_MASTER[0];
        for (var i = 0; i < CHAR_MASTER.length; i++) { if (CHAR_MASTER[i].id === a.charId) return CHAR_MASTER[i]; }
        return CHAR_MASTER[0];
      }
    }
  };

  window.XEVA = XEVA;

  try {
    window.addEventListener("storage", function (e) {
      if (e.key === KEY) { state = load(); emit(); }
    });
  } catch (e) {}
})();

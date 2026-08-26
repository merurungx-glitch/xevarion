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
    // ★ 2026-08-16 A／Bシリーズという区分はもう無いので series を廃止し、
    //   旧Bシリーズのシーズン1〜4を、通しのシーズン5〜8に付け替えた。
    //   （IDは据え置き＝所持状況・凸・MagiBattle性能はそのまま）
    // ※ MagiBurst と連携する4人。所持状況・凸(最大4)は MagiBurst と共有。
    {id:"mion",  name:"ミオン",file:"../img/Mion.webp",   rarity:"SSR",season:5},
    {id:"kokona",name:"ココナ",file:"../img/Kokona.webp", rarity:"SSR",season:6},
    {id:"mao",   name:"マオ",  file:"../img/Mao.webp",    rarity:"SSR",season:7},
    {id:"arisa", name:"アリサ",file:"../img/Arisa.webp",  rarity:"SSR",season:8},
    {id:"ayaka", name:"アヤカ",file:"../img/Ayaka.webp", rarity:"SSR",season:0,cdk:true},
    // 報酬キャラ（ガチャ排出なし・season:0）。MagiLex 30コンテンツ完全習得で解放、35/40/45/50でさらに凸。
    // MagiBurst・MagiBattle・アイコンなど全コンテンツで使用可。
    {id:"mizuki",name:"ミズキ",file:"../img/Mizuki.webp",rarity:"SSR",season:0,reward:true}
  ];

  /* スターターミッション（アプリを1回さわってみる系）。
     達成は各アプリの XEVA.completeMission(id) から。report は表示用のメタ（xevarion.js の MISSION_META）。

     ★ ミッションを足すときの決まり（2026-08-15 に総点検した）
       ① ここに1行足す
       ② xevarion.js の MISSION_META にも同じ id で1行足す（無いとアイコンが 🎯 になる）
       ③ そのアプリの中で XEVA.completeMission("id") を呼ぶ
       ③を忘れると「永久に達成できないミッション」が一覧に並ぶ。
       実際 magijackpot_play と xevynar_ask がその状態だったので、
       2026-08-15 に全アプリぶんを配線しなおした。
       ★ 呼び出し側が xeva.js を読んでいない場合は <script src="../xeva.js"> も必要。 */
  var MISSIONS = {
    /* ── 遊ぶ ── */
    magiburst_play:      { reward: 200, title: "MagiBurst でクエストをクリアしよう",      app: "MagiBurst" },
    magibattle_win:      { reward: 200, title: "MagiBattle でバトルに勝利しよう",         app: "MagiBattle" },
    magichainparty_play: { reward: 150, title: "MagiChainParty で対戦してみよう",         app: "MagiChainParty" },
    magiempire_play:     { reward: 150, title: "MagiEmpire で国盗り対戦をしよう",         app: "MagiEmpire" },
    magiarena_play:      { reward: 150, title: "MagiArena で1台対戦をあそぼう",           app: "MagiArena" },
    magidiamond_play:    { reward: 150, title: "MagiDiamond で読み合い野球盤を遊ぼう",    app: "MagiDiamond" },
    magimanor_play:      { reward: 150, title: "MagiManor で洋館を探索しよう",            app: "MagiManor" },
    magicraft_play:      { reward: 150, title: "MagiCraft でブロックを掘ってみよう",      app: "MagiCraft" },
    magijackpot_play:    { reward: 200, title: "MagiJackpot でゲームを1回プレイしよう",   app: "MagiJackpot" },
    magilotto_buy:       { reward: 200, title: "Magi Lotto でくじを1枚買ってみよう",      app: "MagiLotto" },
    /* ── 学ぶ ── */
    magilex_play:        { reward: 200, title: "MagiLex で問題にチャレンジしよう",        app: "MagiLex" },
    magifocus_study:     { reward: 200, title: "MagiFocus で集中セッションを完了しよう",  app: "MagiFocus" },
    xevynar_ask:         { reward: 150, title: "XEVYNAR に質問してみよう",                app: "XEVYNAR" },
    /* ── つながる・情報 ── */
    magilink_register:   { reward: 150, title: "MagiLink に登録して友達とつながろう",     app: "MagiLink" },
    magiranking_check:   { reward: 100, title: "MagiRanking で今月の順位を見てみよう",    app: "MagiRanking" },
    magiportfolio_add:   { reward: 150, title: "MagiPortfolio に銘柄を追加しよう",        app: "MagiPortfolio" },
    magitier_make:       { reward: 150, title: "MagiTier で Tier表をつくってみよう",      app: "MagiTier" },
    magimusic_play:      { reward: 100, title: "MagiMusic で1曲さいせいしてみよう",       app: "MagiMusic" }
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

  /* ════════════ 🎫チケット — XEVARION 共通（2026-08-13） ════════════
     ★ なぜ XEVARION 側に移したか
       もともと置き場所は MagiBurst のセーブ（magiburst_v1.fesTicket）の中だけだった。
       そのため 📧メールやジェムショップで配っても直接は足せず、いったん
       「引換券（xeva_mbgift_v1）」に積んでおいて<b>次に MagiBurst を開いたとき</b>に
       精算する、という遠回りをしていた。ガチャそのものが XEVARION へ移った以上、
       この遠回りは説明もできないし、「受け取ったのに増えていない」の元でしかない。
       → 残高をアカウント側の同期キーへ移し、XEVA・💎ジェムと同じ経路で同期する。
         これで <b>XEVARION のメールで受け取った瞬間に使えるようになる</b>。

     ★ チケットは<b>2種類ある</b>（ここを混ぜないこと）
         ① フェスチケット（xeva_fticket_v1 / XEVA.fesTicket）
            … 従来からあるもの。<b>フェスガチャ専用</b>（どのフェスでも使える）。
         ② ガチャチケット（xeva_gticket_v1 / XEVA.ticket）
            … 2026-08-13 に新設。<b>プレミアムでも各フェスでも</b>使える。
       フェスガチャでの消費順は <b>フェス → ガチャ → ジェム</b>。
       専用のほうから先に使わないと、フェスでしか使えないチケットが余ってしまう。

     形: { balance, used, history:[{amount,reason,t}], mig:{ タグ:1 }, at } */
  var TKT_KEY = "xeva_gticket_v1";     // ガチャチケット（全ガチャ共通）
  var FTK_KEY = "xeva_fticket_v1";     // フェスチケット（フェス専用）
  /* 2種類とも中身はまったく同じ作りなので、キーを渡して作る */
  function makeTicketWallet(KEY, evName) {
    function fresh() { return { balance: 0, used: 0, history: [], mig: {}, at: 0 }; }
    function load() {
      try {
        var r = localStorage.getItem(KEY);
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
      return fresh();
    }
    function emitT(bal) {
      try { window.dispatchEvent(new CustomEvent(evName, { detail: { balance: bal | 0 } })); } catch (e) {}
    }
    function save(s) {
      s.at = Date.now();
      if (s.history.length > 60) s.history.length = 60;
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
      emitT(s.balance);
    }
    return {
      KEY: KEY,
      _load: load, _save: save, _emit: emitT,
      /* 💎ジェムと同じく、毎回 localStorage から読み直す（キャッシュを持たない） */
      get: function () { return load().balance | 0; },
      getBalance: function () { return load().balance | 0; },
      add: function (n, reason) {
        n = Math.round(n || 0);
        if (!n) return load().balance | 0;
        var s = load();
        s.balance = Math.max(0, (s.balance || 0) + n);
        s.history.unshift({ amount: n, reason: reason || "", t: Date.now() });
        save(s);
        return s.balance;
      },
      /* 足りなければ false を返して何もしない */
      spend: function (n, reason) {
        n = Math.round(n || 0);
        if (n <= 0) return true;
        var s = load();
        if ((s.balance || 0) < n) return false;
        s.balance -= n;
        s.used = (s.used || 0) + n;
        s.history.unshift({ amount: -n, reason: reason || "", t: Date.now() });
        save(s);
        return true;
      },
      canAfford: function (n) { return (load().balance | 0) >= Math.round(n || 0); },
      set: function (n, reason) {
        var s = load();
        s.balance = Math.max(0, Math.round(n || 0));
        s.history.unshift({ amount: 0, reason: reason || "残高を設定", t: Date.now() });
        save(s);
        return s.balance;
      },
      getHistory: function () { return load().history || []; },
      /* 旧データからの一度きりの移行。
         ★ amount が 0 のときは<b>印を付けない</b>。
           MagiBurst のセーブがまだ届いていない端末で先に走ってしまうと、
           0枚のまま「移行済み」になって本物のチケットが消えてしまうため。 */
      migrateOnce: function (tag, amount, reason) {
        var s = load();
        if (s.mig[tag]) return false;
        amount = Math.max(0, Math.round(amount || 0));
        if (!amount) return false;
        s.mig[tag] = Date.now();
        s.balance = (s.balance || 0) + amount;
        s.history.unshift({ amount: amount, reason: reason || ("移行：" + tag), t: Date.now() });
        save(s);
        return true;
      },
      isMigrated: function (tag) { return !!load().mig[tag]; },
      markMigrated: function (tag) { var s = load(); if (s.mig[tag]) return false; s.mig[tag] = Date.now(); save(s); return true; },
    };
  }
  var ticket = makeTicketWallet(TKT_KEY, "xeva:ticket");        // ガチャチケット
  var fesTicket = makeTicketWallet(FTK_KEY, "xeva:festicket");  // フェスチケット
  /* ══ ★★ 2026-08-24 プレミアムセレクト券（夏限定パックの中身）══
     1枚につき、<b>PREMIUM SELECT GACHA から出るSSR</b>の中から
     好きな1体を<b>確定で</b>受け取れる。使う場所はガチャ画面
     （キャラの一覧＝プールを知っているのがあちらだけなので）。
     ★ 中身はチケットとまったく同じ作りなので、同じ makeTicketWallet で作る。 */
  var SEL_KEY = "xeva_selticket_v1";
  var selectTicket = makeTicketWallet(SEL_KEY, "xeva:selticket");
  function loadTkt() { return ticket._load(); }
  function emitTkt(b) { ticket._emit(b); }

  /* 他タブ・クラウド同期が書き換えたら残高表示を更新する。
     ★ クラウドから取り込んだ直後（xeva:synced）も、メモリ上の state を必ず捨てて
       読み直す。ここを怠ると、古い state のまま次の add/spend が走って
       取り込んだ残高を上書きしてしまう。 */
  try {
    window.addEventListener("storage", function (e) {
      if (e.key === GEM_KEY) emitGem(loadGem().balance);
      if (e.key === TKT_KEY) ticket._emit(ticket.get());
      if (e.key === FTK_KEY) fesTicket._emit(fesTicket.get());
      if (e.key === SEL_KEY) selectTicket._emit(selectTicket.get());
      if (e.key === KEY) { state = load(); emit(); }
    });
    window.addEventListener("xeva:synced", function () {
      state = load();
      emitGem(loadGem().balance);
      ticket._emit(ticket.get());
      fesTicket._emit(fesTicket.get());
      selectTicket._emit(selectTicket.get());
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

  /* ══════════════════════════════════════════════════════════════
     🎫ガチャチケット：旧仕組みからの引っ越し（2026-08-13）
     ──────────────────────────────────────────────
     旧仕組みは2段構えだった。
       ① 残高      … magiburst_v1.fesTicket（MagiBurst のセーブの中）
       ② 配布の途中 … xeva_mbgift_v1 の「引換券」キュー
                      （XEVARION で受け取っても、MagiBurst を開くまで届かない）
     どちらも XEVARION 共通ウォレット（xeva_gticket_v1）へ移し、②は廃止する。

     ★ 移行のタイミングに気をつけること
       クラウドから magiburst_v1 が降りてくる<b>前</b>に走ると、
       「まだ 0枚のセーブ」を見て移行済みにしてしまい、本物のチケットが消える。
       そこで
         ・0枚のときは印を付けない（ticket.migrateOnce の仕様）
         ・同期のあと（xeva:synced / appcloud:*）にも必ずやり直す
         ・移した直後に magiburst_v1.fesTicket を 0 に書き戻す
       の3段で守っている。
     ══════════════════════════════════════════════════════════════ */
  var TKT_MIG_TAG = "magiburst_fesTicket";
  /* magiburst_v1.fesTicket にあったぶんは<b>フェスチケット</b>。
     ★ 新設した「ガチャチケット」とは別物なので、必ず fesTicket 側へ入れる。 */
  function migrateBurstTickets() {
    try {
      if (fesTicket.isMigrated(TKT_MIG_TAG)) return;
      var raw = localStorage.getItem("magiburst_v1");
      if (!raw) return;                        // このアカウントに MagiBurst のセーブがまだ無い
      var db = JSON.parse(raw);
      if (!db || typeof db !== "object") return;
      var n = Math.max(0, Math.round(Number(db.fesTicket) || 0));
      if (!n) return;                          // 0枚なら印も付けずに、次の機会にやり直す
      if (!fesTicket.migrateOnce(TKT_MIG_TAG, n, "🎫フェスチケットを XEVARION 共通ウォレットへ移行")) return;
      db.fesTicket = 0;                        // 二重に拾わないよう、元の置き場所は空にする
      try { localStorage.setItem("magiburst_v1", JSON.stringify(db)); } catch (e2) {}
    } catch (e) {}
  }
  /* ★ 取りちがえの手当て（2026-08-13 中の作り直しぶん）
     この日いちど、フェスチケットを「ガチャチケット」側へ移してしまった版があった。
     その端末では ガチャチケット側に magiburst_fesTicket の印が残っているので、
     移した枚数ぶんを<b>フェスチケットへ返す</b>（合計は変わらない）。 */
  function repairMisplacedFesTickets() {
    try {
      var g = ticket._load();
      if (!g.mig || !g.mig[TKT_MIG_TAG]) return;
      /* 移した枚数は履歴に残っている（同じ理由の行を合計する） */
      var moved = 0;
      (g.history || []).forEach(function (h) {
        if (h && h.amount > 0 && /XEVARION 共通ウォレットへ移行/.test(String(h.reason || ""))) moved += h.amount;
      });
      delete g.mig[TKT_MIG_TAG];
      if (moved > 0) {
        var take = Math.min(moved, g.balance || 0);
        g.balance = Math.max(0, (g.balance || 0) - take);
        g.history.unshift({ amount: -take, reason: "フェスチケットへ戻す（種類の分離）", t: Date.now() });
        ticket._save(g);
        fesTicket.markMigrated(TKT_MIG_TAG);
        fesTicket.add(take, "🎫フェスチケット（ガチャチケットから戻したぶん）");
      } else {
        ticket._save(g);
      }
    } catch (e) {}
  }
  /* 旧「引換券」キュー（xeva_mbgift_v1）に残っている🎫を、その場で受け取る。
     ★ done に印を付けるので、MagiBurst 側の drainMbGifts と二重にはならない。
     ★ 引換券の ticket は<b>フェスチケット</b>、gticket は<b>ガチャチケット</b>。 */
  function drainLegacyTicketGifts() {
    try {
      var raw = localStorage.getItem("xeva_mbgift_v1");
      if (!raw) return 0;
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.q) || !d.q.length) return 0;
      if (!d.done || typeof d.done !== "object") d.done = {};
      var fes = 0, gac = 0, rest = [];
      d.q.forEach(function (x) {
        if (!x) return;
        if (x.ticket > 0 || x.gticket > 0) {
          fes += Math.round(x.ticket || 0);
          gac += Math.round(x.gticket || 0);
          d.done[x.id] = Date.now();
          return;
        }
        /* 🎫以外（ゴールド・アイテム）は MagiBurst のセーブにしか置けないので、そのまま残す */
        rest.push(x);
      });
      if (!fes && !gac) return 0;
      d.q = rest;
      try { localStorage.setItem("xeva_mbgift_v1", JSON.stringify(d)); } catch (e2) {}
      if (fes) fesTicket.add(fes, "🎫フェスチケット 引換券の精算（旧仕組み）");
      if (gac) ticket.add(gac, "🎫ガチャチケット 引換券の精算（旧仕組み）");
      return fes + gac;
    } catch (e) { return 0; }
  }
  function tktHousekeeping() { repairMisplacedFesTickets(); migrateBurstTickets(); drainLegacyTicketGifts(); }
  try {
    window.addEventListener("xeva:synced", tktHousekeeping);
    window.addEventListener("appcloud:ready", tktHousekeeping);
    window.addEventListener("appcloud:restored", tktHousekeeping);
    /* アカウントを作っていない端末（クラウド同期が走らない）は、その場で片づける */
    setTimeout(function () {
      var a = null; try { a = loadAcc(); } catch (e) {}
      if (!a || !a.xvUid) tktHousekeeping();
      else drainLegacyTicketGifts();   // 引換券キューは同期キーなので、いつ拾っても安全
    }, 0);
  } catch (e) {}

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
    /* ★ 2026-08-11 プレミアムSSR 3体 ＋ Luminous Summer Fest 追加2体
       ★ 2026-08-12 シェリーαの番号を 99 にしたので、並びもそれに合わせて動かしてある
         （この配列の並び＝MagiBurst の CHAR_IDS の並び＝No. の順）。 */
    { id: "mb:shizuku", mbId: "shizuku", name:"シズク", file: "../img/t_Shizuku.webp", since:"2026-08-11" },
    { id: "mb:yuunagi", mbId: "yuunagi", name:"ユウナギ", file: "../img/t_Yuunagi.webp", since:"2026-08-11" },
    { id: "mb:izumi", mbId: "izumi", name:"イズミ", file: "../img/t_Izumi.webp", since:"2026-08-11" },
    { id: "mb:cherylalpha", mbId: "cherylalpha", name:"シェリーα", file: "../img/t_CherylAlpha.webp", since:"2026-08-11" },
    { id: "mb:kokonaalpha", mbId: "kokonaalpha", name:"ココナα", file: "../img/t_KokonaAlpha.webp", since:"2026-08-11" },
    /* ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定SSR 7体
       ★ 並び＝No. なので、mb-core.js の CHAR_IDS とまったく同じ順にそろえること。 */
    { id: "mb:fuka", mbId: "fuka", name:"フウカ", file: "../img/t_Fuka.webp", since:"2026-08-12" },
    { id: "mb:tsumugi", mbId: "tsumugi", name:"ツムギ", file: "../img/t_Tsumugi.webp", since:"2026-08-12" },
    { id: "mb:suzuka", mbId: "suzuka", name:"スズカ", file: "../img/t_Suzuka.webp", since:"2026-08-12" },
    { id: "mb:karem", mbId: "karem", name:"カレム", file: "../img/t_Karem.webp", since:"2026-08-12" },
    { id: "mb:mayu", mbId: "mayu", name:"マユ", file: "../img/t_Mayu.webp", since:"2026-08-12" },
    { id: "mb:chizuru", mbId: "chizuru", name:"チヅル", file: "../img/t_Chizuru.webp", since:"2026-08-12" },
    { id: "mb:seira", mbId: "seira", name:"セイラ", file: "../img/t_Seira.webp", since:"2026-08-12" },
    /* ★ 2026-08-16 プレミアムSSR 2体 */
    { id: "mb:anna", mbId: "anna", name:"アンナ", file: "../img/t_Anna.webp", since:"2026-08-16" },
    { id: "mb:tsukino", mbId: "tsukino", name:"ツキノ", file: "../img/t_Tsukino.webp", since:"2026-08-16" },
    /* ★ 2026-08-16b プレミアムSSR 6体（No.110〜115）。並びは CHAR_IDS＝No. にそろえること */
    { id: "mb:moeka", mbId: "moeka", name:"モエカ", file: "../img/t_Moeka.webp", since:"2026-08-16" },
    { id: "mb:suzuha", mbId: "suzuha", name:"スズハ", file: "../img/t_Suzuha.webp", since:"2026-08-16" },
    { id: "mb:violet", mbId: "violet", name:"ヴィオレット", file: "../img/t_Violet.webp", since:"2026-08-16" },
    { id: "mb:kanata", mbId: "kanata", name:"カナタ", file: "../img/t_Kanata.webp", since:"2026-08-16" },
    { id: "mb:touka", mbId: "touka", name:"トウカ", file: "../img/t_Touka.webp", since:"2026-08-16" },
    { id: "mb:elena", mbId: "elena", name:"エレナ", file: "../img/t_Elena.webp", since:"2026-08-16" },
    { id: "mb:grace", mbId: "grace", name:"グレース", file: "../img/t_Grace.webp", since:"2026-08-17" },
    /* ★★ 2026-08-18 登録もれの修正: 蓬莱の九重の配布キャラ（瑶華・瑶妃）が
       この表に無く、<b>ポータルのアイコンに選べなかった</b>。
       ガチャから出ないだけで「持てるキャラ」なので、ここには入れる。 */
    { id: "mb:youka", mbId: "youka", name:"瑶華", file: "../img/t_Youka.webp", since:"2026-08-17" },
    { id: "mb:youhi", mbId: "youhi", name:"瑶妃", file: "../img/t_Youhi.webp", since:"2026-08-17" },
    /* ★ 2026-08-18 プレミアムSSR 8体（No.119〜126）＋ ロキシー（No.127・最終番号）。
       並びは CHAR_IDS＝No. にそろえること */
    { id: "mb:artemia", mbId: "artemia", name:"アルテミア", file: "../img/t_Artemia.webp", since:"2026-08-18" },
    { id: "mb:asuha", mbId: "asuha", name:"アスハ", file: "../img/t_Asuha.webp", since:"2026-08-18" },
    { id: "mb:blair", mbId: "blair", name:"ブレア", file: "../img/t_Blair.webp", since:"2026-08-18" },
    { id: "mb:lilith", mbId: "lilith", name:"リリス", file: "../img/t_Lilith.webp", since:"2026-08-18" },
    { id: "mb:lyra", mbId: "lyra", name:"リラ", file: "../img/t_Lyra.webp", since:"2026-08-18" },
    { id: "mb:satsuki", mbId: "satsuki", name:"サツキ", file: "../img/t_Satsuki.webp", since:"2026-08-18" },
    { id: "mb:sayo", mbId: "sayo", name:"サヨ", file: "../img/t_Sayo.webp", since:"2026-08-18" },
    { id: "mb:melty", mbId: "melty", name:"メルティ", file: "../img/t_Melty.webp", since:"2026-08-18" },
    { id: "mb:roxy", mbId: "roxy", name:"ロキシー", file: "../img/t_Roxy.webp", since:"2026-08-18" },
    /* ★ No.128〜132 2026-08-20 GRAND DEBUT GACHA 新SSR 5体 */
    { id: "mb:mirelle", mbId: "mirelle", name:"ミレーユ", file: "../img/t_Mirelle.webp", since:"2026-08-20" },
    { id: "mb:scarlet", mbId: "scarlet", name:"スカーレット", file: "../img/t_Scarlet.webp", since:"2026-08-20" },
    { id: "mb:koyuki", mbId: "koyuki", name:"コユキ", file: "../img/t_Koyuki.webp", since:"2026-08-20" },
    { id: "mb:amelia", mbId: "amelia", name:"アメリア", file: "../img/t_Amelia.webp", since:"2026-08-20" },
    { id: "mb:mio", mbId: "mio", name:"ミオ", file: "../img/t_Mio.webp", since:"2026-08-20" },
    /* ★★ 2026-08-22 Starlight Academy Fest 限定SSR 5体（No.133〜137）。
       ★ mb-core.js の CHAR_IDS と<b>同じ並び</b>にすること（並び＝No.）。
         ここに無いと、ポータル側でアイコンにも新キャラ告知の絵にも出てこない。
       ★ since を書いておくと、その日から「新キャラ」として扱われる。 */
    { id: "mb:otoha", mbId: "otoha", name:"オトハ", file: "../img/t_Otoha.webp", since:"2026-08-22" },
    { id: "mb:sayaka", mbId: "sayaka", name:"サヤカ", file: "../img/t_Sayaka.webp", since:"2026-08-22" },
    { id: "mb:sayuri", mbId: "sayuri", name:"サユリ", file: "../img/t_Sayuri.webp", since:"2026-08-22" },
    { id: "mb:akari", mbId: "akari", name:"アカリ", file: "../img/t_Akari.webp", since:"2026-08-22" },
    { id: "mb:hinata", mbId: "hinata", name:"ヒナタ", file: "../img/t_Hinata.webp", since:"2026-08-22" },
    /* ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 新SSR 5体（No.138〜142） */
    { id: "mb:guren", mbId: "guren", name:"グレン", file: "../img/t_Guren.webp", since:"2026-08-24" },
    { id: "mb:yuuna", mbId: "yuuna", name:"ユウナ", file: "../img/t_Yuuna.webp", since:"2026-08-24" },
    { id: "mb:momo", mbId: "momo", name:"モモ", file: "../img/t_Momo.webp", since:"2026-08-24" },
    { id: "mb:chihaya", mbId: "chihaya", name:"チハヤ", file: "../img/t_Chihaya.webp", since:"2026-08-24" },
    { id: "mb:yui", mbId: "yui", name:"ユイ", file: "../img/t_Yui.webp", since:"2026-08-24" },
    /* ★★ 2026-08-25 Starlight Academy Fest 2 限定SSR 5体（No.143〜147）。
       ★ mb-core.js の CHAR_IDS と<b>同じ並び</b>にすること（並び＝No.）。
       ★★ ナナミ・ナツキという名前の候補は<b>すでに別人がいる</b>（No.66 ナナミ／No.19 ナツキ）ので、
         ご指定どおり<b>まったく別の名前</b>（ミナモ／ヒマリ）にしてある。画像のファイル名も別。 */
    { id: "mb:suzune", mbId: "suzune", name:"スズネ", file: "../img/t_Suzune.webp", since:"2026-08-25" },
    { id: "mb:minamo", mbId: "minamo", name:"ミナモ", file: "../img/t_Minamo.webp", since:"2026-08-25" },
    { id: "mb:karen", mbId: "karen", name:"カレン", file: "../img/t_Karen.webp", since:"2026-08-25" },
    { id: "mb:tomoe", mbId: "tomoe", name:"トモエ", file: "../img/t_Tomoe.webp", since:"2026-08-25" },
    { id: "mb:himari", mbId: "himari", name:"ヒマリ", file: "../img/t_Himari.webp", since:"2026-08-25" },
    /* ★★ 2026-08-26 GRAND DEBUT GACHA Ver.3.0 限定SSR 5体（No.148〜152）。
       ★ mb-core.js の CHAR_IDS と<b>同じ並び</b>にすること（並び＝No.）。
       ★★ ご指定の名前 カレン／フウカ は<b>すでに別人がいる</b>（No.145 カレン／No.79 フウカ）ので、
         ご指定どおり別の名前（<b>カリン／ユウカ</b>）にしてある。画像のファイル名も別。 */
    { id: "mb:karin", mbId: "karin", name:"カリン", file: "../img/t_Karin.webp", since:"2026-08-26" },
    { id: "mb:mirei", mbId: "mirei", name:"ミレイ", file: "../img/t_Mirei.webp", since:"2026-08-26" },
    { id: "mb:yuuka", mbId: "yuuka", name:"ユウカ", file: "../img/t_Yuuka.webp", since:"2026-08-26" },
    { id: "mb:miyabi", mbId: "miyabi", name:"ミヤビ", file: "../img/t_Miyabi.webp", since:"2026-08-26" },
    { id: "mb:sumire", mbId: "sumire", name:"スミレ", file: "../img/t_Sumire.webp", since:"2026-08-26" },
    /* ★★ 2026-08-26 MagiLex の KP交換キャラ 4体（No.153〜156）。
       ガチャからは出ないが「持てるキャラ」なので、ここには入れる（アイコンにも選べる）。 */
    { id: "mb:kanade", mbId: "kanade", name:"カナデ", file: "../img/t_Kanade.webp", since:"2026-08-26" },
    { id: "mb:homura", mbId: "homura", name:"ホムラ", file: "../img/t_Homura.webp", since:"2026-08-26" },
    { id: "mb:yoizuki", mbId: "yoizuki", name:"ヨイヅキ", file: "../img/t_Yoizuki.webp", since:"2026-08-26" },
    { id: "mb:sumika", mbId: "sumika", name:"スミカ", file: "../img/t_Sumika.webp", since:"2026-08-26" },
    /* ★★ 2026-08-26b GRAND DEBUT GACHA Ver.4.0 限定SSR 5体（No.157〜161）。
       ★ mb-core.js の CHAR_IDS と<b>同じ並び</b>にすること（並び＝No.）。 */
    { id: "mb:seina", mbId: "seina", name:"セイナ", file: "../img/t_Seina.webp", since:"2026-08-26" },
    { id: "mb:shiduki", mbId: "shiduki", name:"シヅキ", file: "../img/t_Shiduki.webp", since:"2026-08-26" },
    { id: "mb:sayuki", mbId: "sayuki", name:"サユキ", file: "../img/t_Sayuki.webp", since:"2026-08-26" },
    { id: "mb:sara", mbId: "sara", name:"サラ", file: "../img/t_Sara.webp", since:"2026-08-26" },
    { id: "mb:sakuya", mbId: "sakuya", name:"サクヤ", file: "../img/t_Sakuya.webp", since:"2026-08-26" },
  ];
  /* ★ 2026-08-10 初期SR 4体（ゼラ・アヤメ・レイラ・セリーヌ）は廃止しました。
     いまは<b>全キャラがアイコンに選べる</b>ので、starter という区別そのものが要らない。 */
  var MB_STARTERS = [];
  /* ★ 2026-08-16b SSRキャラの id 一覧（No. 順）。
     ポータル（index.html）は MagiBurst の mb-core.js を読まないので、
     「このキャラはSSRか」をここで持っておく必要がある。
     ★ キャラを追加したら、MB_CHAR_MASTER と一緒にここにも足すこと。 */
  var MB_STAR5 = [
    "ema", "sakura", "arisa", "kaguya", "cheryl", "aira", "mion", "kokona", "mao", "bernica", "tsubaki",
    "alicia", "natsuki", "iroha", "shirayuki", "mashiro", "hotaru", "koharu", "yuri", "rinne", "hecatia",
    "rezelia", "elsia", "karina", "nephia", "setsuna", "selene", "nazuna", "lilia", "revia", "fiona",
    "milfy", "mabel", "abyss", "arche", "chloe", "kaguyaalpha", "mionalpha", "sheril", "fia", "lysera",
    "soleria", "beltia", "astera", "nemu", "roselia", "shizuka", "yuria", "altia", "liana", "solea",
    "yaju", "iori", "noelle", "yukino", "reika", "dominia", "nanami", "chitose", "kaede", "rinon",
    "kokoro", "ange", "kotone", "ran", "ceris", "kotomi", "riko", "kaho", "nana", "rea", "rinonx",
    "shizuku", "yuunagi", "izumi", "cherylalpha", "kokonaalpha", "fuka", "tsumugi", "suzuka", "karem",
    "mayu", "chizuru", "seira", "anna", "tsukino", "moeka", "suzuha", "violet", "kanata", "touka", "elena"
  , "grace"
  /* ★ 2026-08-18 瑶華・瑶妃（配布SSR）＋ プレミアムSSR 8体＋ロキシー */
  , "youka", "youhi"
  , "artemia", "asuha", "blair", "lilith", "lyra", "satsuki", "sayo", "melty", "roxy"
  /* ★ 2026-08-20 GRAND DEBUT GACHA 新SSR 5体 */
  , "mirelle", "scarlet", "koyuki", "amelia", "mio"
  /* ★★ 2026-08-25 <b>足しわすれの修正</b>: 2026-08-22 Starlight Academy Fest の5体が
     ここに無かった。MB_STAR5 は「このキャラはSSRか」の台帳なので、抜けていると
     <b>XEVAミッションの図鑑コレクション（seasonSSRGroups）にそのキャラが出てこない</b>
     ＝「新キャラがミッションに追加されない」という形で表に出る。
     ★ MB_CHAR_MASTER に足したら<b>必ずこちらにも足す</b>こと。 */
  , "otoha", "sayaka", "sayuri", "akari", "hinata"
  /* ★★ 2026-08-24 GRAND DEBUT GACHA Ver.2.0 新SSR 5体 */
  , "guren", "yuuna", "momo", "chihaya", "yui"
  /* ★★ 2026-08-25 Starlight Academy Fest 2 限定SSR 5体。
     ここに無いと <b>XEVAミッションの図鑑コレクション（seasonSSRGroups）に出てこない</b>。 */
  , "suzune", "minamo", "karen", "tomoe", "himari"
  /* ★★ 2026-08-26 GRAND DEBUT Ver.3.0 の5体 ＋ MagiLex の KP交換キャラ4体。
     ここに無いと <b>XEVAミッションの図鑑コレクション（seasonSSRGroups）に出てこない</b>。 */
  , "karin", "mirei", "yuuka", "miyabi", "sumire"
  /* ★★ 2026-08-26 ミズキは上方修正で <b>star5</b> になったので、ここにも足す。
     抜けていると XEVAミッションの図鑑コレクション（seasonSSRGroups）に出てこない。 */
  , "mizuki"
  , "kanade", "homura", "yoizuki", "sumika"
  /* ★★ 2026-08-26b GRAND DEBUT Ver.4.0 の5体。
     ここに無いと <b>XEVAミッションの図鑑コレクションに出てこない</b>。 */
  , "seina", "shiduki", "sayuki", "sara", "sakuya"];
  MB_CHAR_MASTER.forEach(function (c) { c.mb = true; c.starter = MB_STARTERS.indexOf(c.mbId) >= 0; });
  MB_CHAR_MASTER.forEach(function (c) { c.star5 = MB_STAR5.indexOf(c.mbId) >= 0; });
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

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-24 XEVARION 共通ステータス（レベル・EXP・スタミナ）
     ------------------------------------------------------------
     ご指定:
       ・MagiBurst の「自分のレベル」を <b>XEVARION 全体のステータス</b>にする。
         レベルはこれまでどおり MagiBurst のクエストクリアで上がり、
         あわせて <b>MagiLex</b> でも上がる（セットの完全習得／確認テスト合格）。
       ・<b>スタミナ</b>を新設する。
           上限   … 自分のレベルで決まる（Lv1 で 100、1レベルごとに +2）
           消費   … MagiBurst の <b>1プレイにつき 10</b>
                    （勝っても負けても、中断しても、始めからやり直しても かかる）
           回復   … ① 2分ごとに +1
                    ② ＋ボタンから 💎ジェム2つごとに +50
                    ③ MagiLex の確認テストを1つクリアするごとに +50
           ★ ①② は<b>上限まで</b>。③ の MagiLex ぶんは<b>上限を超えても増える</b>（ご指定）。
           ★ 4ケタになったら「999+」と表示する（stamText）。

     ★ なぜ xeva.js の中に入れたか
       新しいファイルにすると、読みこむ HTML（ポータル・ガチャ・図鑑・MagiBurst・MagiLex …）と
       各 sw.js の CORE に足しわすれた瞬間に「その画面だけ動かない」が起きる。
       xeva.js は<b>すべての画面がすでに読んでいる</b>ので、ここに置けば足しもれが原理的に無い。

     ★ 置き場所は xeva_status_v1（アカウント同期キー）。
       xeva-keys.js の PORTAL_SYNC_KEYS と xeva-cloud.js の URGENT_KEYS に入れてある。
       ＝ 端末をまたいでレベルもスタミナも同じになる。
     ══════════════════════════════════════════════════════════════ */
  var ST_KEY = "xeva_status_v1";
  /* ── レベル（もとは MagiBurst/index.html の plvNeed / playerLv）── */
  var PLV_MAX = 200;
  function plvNeed(lv) { return 120 + (lv - 1) * 60; }     // そのレベルから次へ上がるのに要るEXP
  function lvOfExp(exp) {
    var left = Math.max(0, Math.round(exp || 0)), lv = 1;
    while (lv < PLV_MAX && left >= plvNeed(lv)) { left -= plvNeed(lv); lv++; }
    return { lv: lv, cur: left, need: lv >= PLV_MAX ? 0 : plvNeed(lv) };
  }
  /* ── スタミナ ── */
  var STAM_BASE = 100;          // Lv1 の上限（ご指定の「最小100」）
  var STAM_PER_LV = 2;          // レベルが1上がるごとに増える上限（Lv200 で 498）
  var STAM_TICK_MS = 120000;    // 2分で1回復
  var STAM_PLAY = 10;           // MagiBurst 1プレイぶん
  var STAM_GEM_COST = 2;        // 💎2つで
  var STAM_GEM_GAIN = 50;       // +50
  var STAM_LEX_GAIN = 50;       // MagiLex の確認テスト1つで +50（上限を超えて増える）
  function stamMaxOf(lv) { return STAM_BASE + (Math.max(1, lv | 0) - 1) * STAM_PER_LV; }

  function stFresh() { return { exp: 0, stam: null, at: 0, mig: {}, hist: [] }; }
  function stLoad() {
    try {
      var r = localStorage.getItem(ST_KEY);
      if (r) {
        var s = JSON.parse(r);
        if (s && typeof s === "object") {
          if (typeof s.exp !== "number" || !isFinite(s.exp) || s.exp < 0) s.exp = 0;
          if (!s.mig || typeof s.mig !== "object") s.mig = {};
          if (!Array.isArray(s.hist)) s.hist = [];
          return s;
        }
      }
    } catch (e) {}
    return stFresh();
  }
  function stEmit(s) {
    try { window.dispatchEvent(new CustomEvent("xeva:status", { detail: stView(s) })); } catch (e) {}
  }
  function stSave(s) {
    if (s.hist.length > 40) s.hist.length = 40;
    try { localStorage.setItem(ST_KEY, JSON.stringify(s)); } catch (e) {}
    stEmit(s);
  }
  /* 時間による回復をここでまとめて精算する（読むたびに呼ぶ）。
     ★ 上限<b>以上</b>のときは時間では増やさない。余った時間も持ち越さない。
     ★ 端末の時計が戻ったとき（el < 0）は、ためこまずに now でそろえる。 */
  function stSettle(s) {
    var now = Date.now();
    var mx = stamMaxOf(lvOfExp(s.exp).lv);
    if (typeof s.stam !== "number" || !isFinite(s.stam) || s.stam < 0) { s.stam = mx; s.at = now; return s; }
    if (!s.at || s.at > now) { s.at = now; return s; }
    if (s.stam >= mx) { s.at = now; return s; }
    var n = Math.floor((now - s.at) / STAM_TICK_MS);
    if (n <= 0) return s;
    var room = mx - s.stam;
    if (n >= room) { s.stam = mx; s.at = now; }
    else { s.stam += n; s.at += n * STAM_TICK_MS; }
    return s;
  }
  /* 画面に渡す形 */
  function stView(s) {
    var L = lvOfExp(s.exp);
    var mx = stamMaxOf(L.lv);
    var full = s.stam >= mx;
    return {
      exp: Math.round(s.exp || 0), lv: L.lv, cur: L.cur, need: L.need, lvMax: PLV_MAX,
      stam: Math.round(s.stam || 0), max: mx, full: full,
      /* 次の1回復までの残りミリ秒（満タンなら 0） */
      nextMs: full ? 0 : Math.max(0, STAM_TICK_MS - (Date.now() - (s.at || Date.now()))),
      /* 満タンになるまでの残りミリ秒（満タンなら 0） */
      fullMs: full ? 0 : Math.max(0, (mx - s.stam) * STAM_TICK_MS - (Date.now() - (s.at || Date.now()))),
      play: STAM_PLAY, gemCost: STAM_GEM_COST, gemGain: STAM_GEM_GAIN, lexGain: STAM_LEX_GAIN,
      tickMs: STAM_TICK_MS,
    };
  }
  /* 読み書きのたびに精算して保存する（保存しないと、次に読んだとき同じぶんをもう一度足してしまう） */
  function stGet() {
    var s = stSettle(stLoad());
    try { localStorage.setItem(ST_KEY, JSON.stringify(s)); } catch (e) {}
    return stView(s);
  }
  /* 「999+」表示（4ケタになったら丸める。ご指定） */
  function stamText(v) { v = Math.round(v || 0); return v >= 1000 ? "999+" : String(v); }
  /* 残り時間の日本語（「あと 12分」） */
  function stamWhen(ms) {
    ms = Math.max(0, Math.round(ms || 0));
    var m = Math.ceil(ms / 60000);
    if (m < 60) return m + "分";
    var h = Math.floor(m / 60);
    return h + "時間" + (m % 60 ? (m % 60) + "分" : "");
  }

  var status = {
    KEY: ST_KEY,
    PLV_MAX: PLV_MAX,
    plvNeed: plvNeed,
    lvOfExp: lvOfExp,
    stamMaxOf: stamMaxOf,
    STAM_PLAY: STAM_PLAY,
    STAM_GEM_COST: STAM_GEM_COST,
    STAM_GEM_GAIN: STAM_GEM_GAIN,
    STAM_LEX_GAIN: STAM_LEX_GAIN,
    STAM_TICK_MS: STAM_TICK_MS,
    get: stGet,
    text: stamText,
    when: stamWhen,
    getLv: function () { return stGet().lv; },
    getExp: function () { return stGet().exp; },
    /* EXP を足す。レベルが上がったら { from, to } を返す（上がらなければ null）。
       ★ スタミナの上限もレベルで決まるので、上がったぶんは<b>その場で満たす</b>
         （上限だけ増えて空っぽ、にしない＝レベルアップのごほうび）。 */
    addExp: function (n, why) {
      n = Math.round(n || 0);
      if (!(n > 0)) return null;
      var s = stSettle(stLoad());
      var before = lvOfExp(s.exp).lv;
      s.exp = Math.max(0, Math.round(s.exp || 0) + n);
      var after = lvOfExp(s.exp).lv;
      if (after > before) s.stam = Math.max(s.stam, stamMaxOf(after));
      s.hist.unshift({ exp: n, reason: why || "", t: Date.now() });
      stSave(s);
      return after > before ? { from: before, to: after } : null;
    },
    /* 累計EXPをそのまま入れ直す（MagiBurst の古いセーブからの引き継ぎ用） */
    setExpAtLeast: function (n, why) {
      n = Math.round(n || 0);
      var s = stSettle(stLoad());
      if (!(n > s.exp)) return false;
      var before = lvOfExp(s.exp).lv;
      s.exp = n;
      var after = lvOfExp(s.exp).lv;
      if (after > before) s.stam = Math.max(s.stam, stamMaxOf(after));
      s.hist.unshift({ exp: n - 0, reason: why || "引き継ぎ", t: Date.now() });
      stSave(s);
      return true;
    },
    /* 一度きりの引き継ぎ（タグで管理）。値が 0 のときは印を付けない
       （＝セーブがまだ届いていない端末で「移行済み」にしてしまわない）。 */
    migrateExpOnce: function (tag, exp, why) {
      var s = stLoad();
      if (s.mig[tag]) return false;
      exp = Math.max(0, Math.round(exp || 0));
      if (!exp) return false;
      s = stSettle(s);
      s.mig[tag] = Date.now();
      if (exp > s.exp) s.exp = exp;
      s.stam = Math.max(s.stam == null ? 0 : s.stam, stamMaxOf(lvOfExp(s.exp).lv));
      stSave(s);
      return true;
    },
    isMigrated: function (tag) { return !!stLoad().mig[tag]; },

    /* ── スタミナ ── */
    getStamina: function () { return stGet().stam; },
    getMax: function () { return stGet().max; },
    canPlay: function (n) { return stGet().stam >= Math.round(n == null ? STAM_PLAY : n); },
    /* 足りなければ false（何も減らさない） */
    spend: function (n, why) {
      n = Math.round(n == null ? STAM_PLAY : n);
      if (n <= 0) return true;
      var s = stSettle(stLoad());
      if ((s.stam || 0) < n) { stSave(s); return false; }
      /* 満タンから減ったその瞬間から「2分で1」を数えはじめる */
      var mx = stamMaxOf(lvOfExp(s.exp).lv);
      if (s.stam >= mx) s.at = Date.now();
      s.stam -= n;
      s.hist.unshift({ stam: -n, reason: why || "", t: Date.now() });
      stSave(s);
      return true;
    },
    /* over:true なら<b>上限を超えて</b>足す（MagiLex の確認テストぶん）。
       既定は上限まで（時間・ジェムぶん）。 */
    add: function (n, why, over) {
      n = Math.round(n || 0);
      if (!(n > 0)) return stGet().stam;
      var s = stSettle(stLoad());
      var mx = stamMaxOf(lvOfExp(s.exp).lv);
      s.stam = over ? (s.stam || 0) + n : Math.min(Math.max(mx, s.stam || 0), (s.stam || 0) + n);
      s.hist.unshift({ stam: n, reason: why || "", t: Date.now() });
      stSave(s);
      return stView(s).stam;
    },
    /* MagiLex の確認テスト1つぶん（上限を超えて回復する） */
    addFromLex: function (why) { return status.add(STAM_LEX_GAIN, why || "MagiLex 確認テスト", true); },
    getHistory: function () { return stLoad().hist || []; },
    /* 他タブ・同期のあとに読み直させる（表示の更新用） */
    refresh: function () { var s = stSettle(stLoad()); stSave(s); return stView(s); },
  };
  /* 他タブ・クラウド同期で書きかわったら画面に知らせる */
  window.addEventListener("storage", function (e) { if (e && e.key === ST_KEY) stEmit(stSettle(stLoad())); });
  window.addEventListener("xeva:synced", function () { try { stEmit(stSettle(stLoad())); } catch (err) {} });
  /* 時間で回復するので、開いているあいだは定期的に知らせる（表示だけの用事） */
  setInterval(function () { try { stEmit(stSettle(stLoad())); } catch (e) {} }, 20000);

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-24 キャラ画像を出さない設定（XEVARION 全アプリ共通）
     ------------------------------------------------------------
     ご指定:
       ・街中などで開いても困らないように、<b>キャラの絵を出さず、
         その場所に<b>キャラ名</b>を出す</b>ようにできる。
       ・<b>すべてのアプリ</b>で効く。
       ・<b>既定はオン（絵を出す）</b>。

     ★ どうやって全アプリに効かせているか
       設定そのものは Xevion OS（xevion_os_v1 の charImg）に置いてあるが、
       xevion-os.js を読んでいるのは<b>ポータルだけ</b>なので、
       ここでは<b>キーを直接読む</b>（既定はオン）。
       xeva.js は MagiBurst・MagiLex をふくむ<b>すべての画面が読んでいる</b>ので、
       ここに置けば「あのアプリだけ効かない」が起きない。

     ★ 絵の差し替えかた
       <img> を消したり作り替えたりすると、あとからその <img> を触るアプリ側の
       コード（src を入れ替える・onerror を見る…）が壊れる。
       そこで <b>src だけ「名前を描いた SVG」に差し替える</b>。
       元の src は data-xvsrc に控えてあるので、設定を戻せばその場で元に戻る。
       大きさ・角丸・object-fit などはその <img> のスタイルのままなので、
       レイアウトはいっさい動かない。

     ★ どの <img> がキャラなのかの見分けかた
       ファイル名を <b>キャラ台帳（CHAR_MASTER / MB_CHAR_MASTER）</b> と突き合わせる。
       「それっぽいパス」で判定すると、背景やバナーまで名札になってしまう。
       ★ キャラを増やしたら台帳に足すので、ここは自動でついてくる。
     ══════════════════════════════════════════════════════════════ */
  var OS_KEY = "xevion_os_v1";
  /* ファイル名（拡張子・t_ を落としたもの）→ キャラ名 */
  var NAME_BY_BASE = (function () {
    var m = {}, i, b;
    function put(file, name) {
      if (!file || !name) return;
      b = String(file).split("/").pop().replace(/\?.*$/, "").replace(/\.[a-z0-9]+$/i, "").toLowerCase();
      if (b.indexOf("t_") === 0) b = b.slice(2);
      if (!m[b]) m[b] = name;
    }
    for (i = 0; i < CHAR_MASTER.length; i++) put(CHAR_MASTER[i].file, CHAR_MASTER[i].name);
    for (i = 0; i < MB_CHAR_MASTER.length; i++) put(MB_CHAR_MASTER[i].file, MB_CHAR_MASTER[i].name);
    return m;
  })();
  function charNameOfSrc(src) {
    if (!src) return null;
    var b = String(src).split("/").pop().split("?")[0].split("#")[0].replace(/\.[a-z0-9]+$/i, "").toLowerCase();
    if (b.indexOf("t_") === 0) b = b.slice(2);
    return NAME_BY_BASE[b] || null;
  }
  /* ══ 名札（data URI の SVG）══
     ★★ 2026-08-25 ご指定により、絵の代わりに出すのは<b>名前だけ</b>にした。
       以前は飾り枠や「画像を隠しています」の但し書きを入れていたが、
       無地の板に<b>名前を1つ</b>置くだけにする。
     ★ 横幅の見積もりは「全角＝1.0 ・ 半角＝0.55」で数える。
       文字数だけで決めると、英字の長い名前（PREMIUM SELECT GACHA）が枠からはみ出す。 */
  function plEsc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plW(s) {                       /* 文字列の横幅（em 単位の見積もり） */
    var w = 0, i;
    for (i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2e80 ? 1 : 0.55;
    return w;
  }
  /* 名前を最大3行に折り返す。空白のある名前（英字）は語の切れ目で、
     空白のない名前（日本語）は横幅で区切る。 */
  function plWrap(s, max) {
    s = String(s == null ? "?" : s).trim() || "?";
    var lines = [], i, cur, t;
    if (s.indexOf(" ") >= 0) {
      var words = s.split(/\s+/);
      cur = "";
      for (i = 0; i < words.length; i++) {
        t = cur ? cur + " " + words[i] : words[i];
        if (plW(t) > max && cur) { lines.push(cur); cur = words[i]; } else cur = t;
      }
      if (cur) lines.push(cur);
    } else {
      cur = "";
      for (i = 0; i < s.length; i++) {
        t = cur + s.charAt(i);
        if (plW(t) > max && cur) { lines.push(cur); cur = s.charAt(i); } else cur = t;
      }
      if (cur) lines.push(cur);
    }
    if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] = lines[2].slice(0, Math.max(1, lines[2].length - 1)) + "…"; }
    return lines;
  }
  /* w × h の無地の板に名前だけを中央揃えで書く。
     ratio … 板の高さに対する文字の大きさの上限。
       キャラの名札は小さく出ることが多いので大きめ（0.26）、
       ガチャバナーは大きく引きのばされるので控えめ（0.17）にする。 */
  function plateSvg(name, w, h, max, ratio) {
    var lines = plWrap(name, max), longest = 0;
    lines.forEach(function (t) { var v = plW(t); if (v > longest) longest = v; });
    var size = Math.min(h * (ratio || 0.26), (w * 0.86) / Math.max(0.5, longest));
    var lh = size * 1.3;
    var y0 = h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.35;
    var txt = lines.map(function (t, k) {
      return '<text x="' + (w / 2) + '" y="' + (y0 + k * lh).toFixed(1) + '" text-anchor="middle" ' +
        'font-family="Noto Sans JP,system-ui,sans-serif" font-size="' + size.toFixed(1) + '" font-weight="700" ' +
        'fill="#ffffff">' + plEsc(t) + "</text>";
    }).join("");
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h +
      '" preserveAspectRatio="xMidYMid slice">' +
      '<rect width="' + w + '" height="' + h + '" fill="#3d4166"/>' + txt + "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  var _plateCache = {};
  function plateOf(name) {                /* キャラの絵の代わり（正方形） */
    var k = "c/" + name;
    if (!_plateCache[k]) _plateCache[k] = plateSvg(name, 100, 100, 5);
    return _plateCache[k];
  }
  function bannerPlateOf(name) {          /* ガチャバナーの代わり（横長） */
    var k = "b/" + name;
    if (!_plateCache[k]) _plateCache[k] = plateSvg(name, 160, 90, 9, 0.17);
    return _plateCache[k];
  }
  /* ══ どの絵を隠すか ══
     ★★ 2026-08-25 ご指定により、隠すのは<b>キャラ画像とガチャバナーだけ</b>にしました。
       以前はファイル名のあたま（bn_ ／ back）でまとめて隠していたため、
       <b>クエストの背景（back*）やクエストのバナー（蓬莱の九重・幽冥の庭園…）</b>まで
       消えていた。これらは景色の絵なので、いまはそのまま出す。
     ・ GACHA_BN … ガチャのバナー。名札には<b>そのガチャの名前</b>を書く。
       ★ フェスを増やしたらここに1行足す（バナーのファイル名 → 表示する名前）。
     ・ EX_BN  … 降臨のバナーは「そのキャラ1体の大きな絵」なのでキャラ画像として扱う。 */
  var GACHA_BN = {
    bn_premium_s: "PREMIUM SELECT GACHA",
    bn_debut_s: "GRAND DEBUT GACHA",
    bn_fes_s: "Nocturne Bloom Fest",
    bn_fes2_s: "Luminous Summer Fest",
    bn_fes3_s: "Phantom Legend Fest",
    bn_fes3_soon: "Phantom Legend Fest",
    bn_fes4_s: "蒼夏祭",
    bn_fes5_s: "Starlight Academy Fest",
    bn_fes6_s: "Starlight Academy Fest 2"
  };
  var EX_BN = { bn_airaex: "アイラ", bn_shionex: "シオン", bn_violaex: "ヴィオラ" };
  function artBase(src) {
    return String(src).split("/").pop().split("?")[0].split("#")[0].replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  }
  /* 設定を読む（既定はオン＝絵を出す） */
  function charImgOn() {
    try {
      var o = JSON.parse(localStorage.getItem(OS_KEY) || "null");
      if (o && typeof o === "object" && o.charImg !== undefined) return !!o.charImg;
    } catch (e) {}
    return true;
  }
  var _veilOn = false, _veilTimer = null, _veilObs = null;
  function veilImg(img) {
    var src = img.getAttribute("src");
    if (!src || src.indexOf("data:image/svg") === 0) return;
    var base = artBase(src);
    var nm = charNameOfSrc(src) || EX_BN[base] || null;     /* キャラの絵（降臨バナーをふくむ） */
    var wide = false;
    if (!nm && GACHA_BN[base]) { nm = GACHA_BN[base]; wide = true; }   /* ガチャのバナー */
    if (!nm) return;                                        /* それ以外の絵はそのまま出す */
    img.setAttribute("data-xvsrc", src);
    img.setAttribute("data-xvnm", nm);
    /* alt が空のままだと読み上げでも名前が分からないので、ここで入れておく */
    if (!img.getAttribute("alt")) img.setAttribute("alt", nm);
    img.setAttribute("src", wide ? bannerPlateOf(nm) : plateOf(nm));
  }
  function unveilImg(img) {
    var src = img.getAttribute("data-xvsrc");
    img.removeAttribute("data-xvsrc");
    img.removeAttribute("data-xvnm");
    if (src) img.setAttribute("src", src);
  }
  function scanVeil() {
    var list, i;
    if (_veilOn) {
      list = document.querySelectorAll("img:not([data-xvsrc])");
      for (i = 0; i < list.length; i++) veilImg(list[i]);
    } else {
      list = document.querySelectorAll("img[data-xvsrc]");
      for (i = 0; i < list.length; i++) unveilImg(list[i]);
    }
  }
  function scheduleVeil() {
    if (_veilTimer) return;
    _veilTimer = setTimeout(function () { _veilTimer = null; try { scanVeil(); } catch (e) {} }, 40);
  }
  function applyCharImg() {
    var on = charImgOn();
    var want = !on;                      // 設定がオフ ＝ 名札にする
    if (want === _veilOn) { if (want) scheduleVeil(); return; }
    _veilOn = want;
    try { document.body && document.body.classList.toggle("xv-nochar", want); } catch (e) {}
    scanVeil();
    if (want && !_veilObs && window.MutationObserver) {
      /* 画面は innerHTML でまるごと作り直されることが多いので、
         「増えた <img>」を見張って、そのつど名札にする。 */
      _veilObs = new MutationObserver(scheduleVeil);
      try { _veilObs.observe(document.documentElement, { childList: true, subtree: true, attributeFilter: ["src"] }); } catch (e) {}
    }
    if (!want && _veilObs) { try { _veilObs.disconnect(); } catch (e) {} _veilObs = null; }
    try { window.dispatchEvent(new CustomEvent("xeva:charimg", { detail: { on: on } })); } catch (e) {}
  }
  /* ほかのタブ・設定画面で変わったらついていく */
  window.addEventListener("storage", function (e) { if (e && e.key === OS_KEY) applyCharImg(); });
  window.addEventListener("xos:change", function (e) {
    if (!e || !e.detail || e.detail.key === "charImg") applyCharImg();
  });
  if (document.body) applyCharImg();
  else document.addEventListener("DOMContentLoaded", applyCharImg);

  /* ── 公開API ── */
  var XEVA = {
    KEY: KEY,
    ACC_KEY: ACC_KEY,
    GEM_KEY: GEM_KEY,
    TKT_KEY: TKT_KEY,
    FTK_KEY: FTK_KEY,
    /* 💎ジェム（XEVARION 共通のプレミアム通貨） */
    gem: gem,
    /* 🎫ガチャチケット（すべてのガチャで 1枚＝1回ぶん） */
    ticket: ticket,
    /* 🎫フェスチケット（フェスガチャ専用。どのフェスでも使える） */
    fesTicket: fesTicket,
    /* ★ 2026-08-24 プレミアムセレクト券（1枚＝プレミアムのSSRから好きな1体） */
    SEL_KEY: SEL_KEY,
    selectTicket: selectTicket,
    /* ★ 2026-08-24 XEVARION 共通ステータス（レベル・EXP・スタミナ） */
    STATUS_KEY: ST_KEY,
    status: status,
    /* ★ 2026-08-24 キャラ画像を出すか（設定は Xevion OS の charImg・既定はオン） */
    charImgOn: charImgOn,
    applyCharImg: applyCharImg,
    charNameOfSrc: charNameOfSrc,
    charNamePlate: plateOf,
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


  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-26 画像の長押しを「まったく反応しない」ようにする（ご指定）
     ──────────────────────────────────────────────
     iPhone/Android は画像を長押しすると
       ・拡大プレビュー（iOS 16 以降のポップアップ）
       ・「写真に保存」「コピー」のメニュー
     が出てしまう。ロゴやキャラの絵はゲームの部品なので、これは要らない。
     ★ MagiBurst だけは以前から自前で止めていたが、XEVARION 本体・MagiLex には
       入っていなかった。<b>xeva.js は全アプリが読む</b>ので、ここに1本だけ置く
       （2026-08-24 の決めごと: 全アプリに効かせるものは xeva.js）。

     やること（3つそろえて初めて止まる）
       ① CSS  … -webkit-touch-callout:none ＋ 選択・ドラッグの禁止
                  iOS Safari の長押しプレビューはこれで止まる。
       ② contextmenu … Android Chrome・PC の右クリック／長押しメニューを打ち消す。
       ③ dragstart   … PC で絵をつまんで持ち出せてしまうのを止める。
     ★ <b>画像とキャンバスの上だけ</b>で止める。入力欄まで止めると
       コピー＆ペーストが奪われる（MagiLex の検索欄・アカウント名など）。
     ★ pointer-events は<b>切らない</b>。図鑑やガチャは <img> 自体に onclick が
       付いている場所があるので、切るとタップできなくなる。
     ★ 二重に入れない（MagiBurst は自前の同じ処理を持っている）よう印を付ける。
     ══════════════════════════════════════════════════════════════ */
  (function () {
    if (window.__xevaNoLongPress) return;
    window.__xevaNoLongPress = true;
    var CSS = "img,canvas,svg,picture,video{-webkit-touch-callout:none;-webkit-user-drag:none;"
            + "-khtml-user-drag:none;user-select:none;-webkit-user-select:none;-ms-user-select:none}";
    function addCss() {
      try {
        if (document.getElementById("xevaNoLongPressCss")) return;
        var st = document.createElement("style");
        st.id = "xevaNoLongPressCss";
        st.textContent = CSS;
        (document.head || document.documentElement).appendChild(st);
      } catch (e) {}
    }
    addCss();
    if (!document.head) {
      try { document.addEventListener("DOMContentLoaded", addCss, { once: true }); } catch (e) {}
    }
    function isArt(t) {
      if (!t || !t.tagName) return false;
      var n = t.tagName;
      /* 背景画像で絵を出している所（ガチャの演出カードなど）も、印を付けておけば止める */
      if (t.classList && t.classList.contains("noPress")) return true;
      return n === "IMG" || n === "CANVAS" || n === "PICTURE" || n === "VIDEO";
    }
    try {
      document.addEventListener("contextmenu", function (e) {
        if (isArt(e.target)) e.preventDefault();
      }, { passive: false, capture: true });
      document.addEventListener("dragstart", function (e) {
        if (isArt(e.target)) e.preventDefault();
      }, { passive: false, capture: true });
    } catch (e) {}
  })();

  window.XEVA = XEVA;
  /* ★ 2026-08-24 レベル・スタミナはどの画面からも使うので、短い名前でも出しておく */
  window.XStatus = status;

  try {
    window.addEventListener("storage", function (e) {
      if (e.key === KEY) { state = load(); emit(); }
    });
  } catch (e) {}
})();

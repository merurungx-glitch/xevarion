/* ============================================================
   MagiJackpot — コア（通貨・乱数・セーブ・演出・実績・ミッション）
   ------------------------------------------------------------
   ★ 還元率の考え方（ここが本作の背骨）
     「最終的な配布量と賭け量が同じくらい」になるよう、次のように分けている。

        ベット 100%
          ├─ 各ゲームの配当  … 98%（BASE_RTP）
          └─ プログレッシブ  …  2%（JP_RATE）→ ジャックポットとして必ず全額出ていく

     プログレッシブは「入ったぶんが、当たった人に丸ごと出る」ので、
     長い目で見れば 98% + 2% = 100% に収束する。
     ★ 初期プールの 30,000 だけは運営からのご祝儀（初回のみ）。
       2回目以降のリセットは 0 からなので、当たりが出るたびに増えていくことはない。

     ★ そのうえで<b>毎日 10,000 XEVA（JP_DAILY）をハウスがプールへ足す</b>。
       ベットから来ていないお金なので、これは丸ごと還元率の上乗せになる
       ——つまり全体では <b>100% を超える</b>。
       ・1日ぶんの総ベットが少ない日ほど、上乗せの効きは大きい。
       ・入るのは 1日ちょうど1回（クラウドの日付の印で取り合う）。
         端末ごとに足すと「開いた人数ぶん」増えてしまうため、そこは必ず共有側で決める。

   ★ そして 98% は<b>毎日すこし動く</b>（dayRtp）。
     日付だけから決まる値なので、全員が同じ条件で、遊ぶ前に確認できる。
     くわしくは下の「本日の還元率」の節に書いてある。

   ★ ジェム → XEVA の両替は用意しない。
     XEVARION 側に「ドル円レートで XEVA → 💎1」があるため、逆向きを作ると
     往復でレート差を突かれて無限に増やせてしまう。
     ジェムは「勝ち取るもの」「スキン・保険に使うもの」に限定する。

   window.MJ として公開。
   ============================================================ */
(function () {
  "use strict";

  const KEY = "magijackpot_v1";
  const now = () => Date.now();

  /* ══════════════════════════════════════════
     還元率のパラメータ（全ゲーム共通）
     ══════════════════════════════════════════ */
  const BASE_RTP = 0.98;      // 各ゲームの配当だけで見た還元率（長い目で見た平均）
  const JP_RATE  = 0.02;      // ベットのうちジャックポットへ積む割合
  const JP_SEED  = 30000;     // 初回だけの種銭（2回目以降のリセットは 0）

  /* ══════════════════════════════════════════
     本日の還元率（毎日すこし動く「その日のコンディション」）
     ------------------------------------------
     ★ なぜ日替わりにするか
       ずっと 98% 固定だと「今日はどうか」という手ざわりがない。
       実機のホールが日によって設定を変えるのと同じで、
       <b>その日は全員が同じ条件</b>——という形にすると、
       「今日は甘いから回そう」「今日は様子見」という遊び方が生まれる。

     ★ 守っていること
       ① その日の値は<b>日付だけ</b>から決まる（乱数を持たない・保存もしない）。
          → だれが見ても同じ値。遊ぶ前に確認できて、あとから動かせない。
       ② 平均はぴったり BASE_RTP。±RTP_BAND を RTP_STEP 刻みで動き、
          真ん中がいちばん出やすい（両端はまれ）三角の分布にしてある。
          → 長い目で見た還元率は 98% ＋ ジャックポット 2% ＝ 100% のまま変わらない。
       ③ 掛かる倍率は<b>全ゲーム共通</b>（dayMul）。1台だけ甘い日を作ると
          「今日はこの台が正解」が生まれて、台えらびがリスク選択でなくなる。
          ＝ 本作の背骨（選択は期待値を動かさない）を崩さないための決めごと。

     ★ 日付は端末のもの。時計を進めれば甘い日を先に取れてしまうが、
       動くのは最大 ±2% で、しかもその日は待てば必ず来るので旨みがない。
       （逆に、通信できない場所でも今日の値が出せるという利点は大きい）
     ══════════════════════════════════════════ */
  const RTP_BAND = 0.02;     // 振れ幅（±2%）
  const RTP_STEP = 0.005;    // 刻み（0.5%）
  const RTP_HALF = Math.round(RTP_BAND / RTP_STEP);   // 片側の段数（＝4）
  /* その日の「調子」の見せかた。dl は BASE_RTP との差 */
  const RTP_TONES = [
    { min:  0.015, ic: "🔥", nm: "大盤振る舞い", ds: "今日はハウスが気前のいい日。思いきって回すなら今日です。" },
    { min:  0.005, ic: "🌟", nm: "甘め",         ds: "ふだんより少し多めに返ってきます。" },
    { min: -0.004, ic: "⚖",  nm: "標準",         ds: "いつもどおりのコンディションです。" },
    { min: -0.014, ic: "🌫", nm: "ひきしめ",     ds: "少しかたい日。ベットは控えめでも楽しめます。" },
    { min: -1,     ic: "🧊", nm: "渋め",         ds: "かたい日です。今日は軽く遊ぶ日かもしれません。" },
  ];
  /* 文字列 → 32bit の数（FNV-1a）。日付から「毎日ちがうが、その日は必ず同じ」値を作るため。 */
  function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  /* 段（0 … RTP_HALF×2）。サイコロ2個の和なので真ん中が出やすい＝平均は中央のまま。 */
  function dayStep(d) {
    const h = hash32("mjrtp:" + (d || today()));
    const a = h % (RTP_HALF + 1);
    const b = Math.floor(h / 977) % (RTP_HALF + 1);
    return a + b;
  }
  /* ★ テスト用の固定（MJ.setDayRtp(0.98) で「平均の日」に固定して検算できる）。
     null に戻すと日付から決まる本来の値。 */
  let _dayFix = null;
  function dayRtp(d) {
    if (_dayFix != null && !d) return _dayFix;
    const v = BASE_RTP - RTP_BAND + dayStep(d) * RTP_STEP;
    return Math.round(v * 10000) / 10000;
  }
  /* 各ゲームが自分の配当に掛ける倍率。BASE_RTP のときに 1.00。 */
  function dayMul(d) { return dayRtp(d) / BASE_RTP; }
  function setDayRtp(v) { _dayFix = (v == null ? null : Number(v)); }
  /* 表示用のひとまとめ */
  function dayRtpInfo(d) {
    const rtp = dayRtp(d), dl = rtp - BASE_RTP;
    const t = RTP_TONES.find((x) => dl >= x.min) || RTP_TONES[RTP_TONES.length - 1];
    const nx = new Date(); nx.setHours(24, 0, 0, 0);
    return {
      rtp: rtp, mul: dayMul(d), dl: dl,
      pct: Math.round(rtp * 1000) / 10,                    // 配当ぶんだけ（%）
      total: Math.round((rtp + JP_RATE) * 1000) / 10,      // ジャックポットぶんも足した合計（%）
      sign: (dl > 0 ? "+" : dl < 0 ? "−" : "±") + (Math.round(Math.abs(dl) * 1000) / 10) + "%",
      ic: t.ic, nm: t.nm, ds: t.ds,
      leftMs: nx - Date.now(),
    };
  }
  /* 「あと 3時間20分」のような残り時間 */
  function dayLeftText() {
    const ms = dayRtpInfo().leftMs;
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? h + "時間" + m + "分" : m + "分";
  }
  /* 卓の中に1行で出す用（配当表・メッセージ欄など） */
  function rtpLine() {
    const d = dayRtpInfo();
    return "本日の還元率 " + d.pct + "%（" + d.ic + " " + d.nm + "・平均比 " + d.sign + "）";
  }
  /* どこからでも開ける説明。ロビーも卓の中もこれ1つを使う。 */
  function rtpSheet() {
    const d = dayRtpInfo();
    const band = Math.round(RTP_BAND * 1000) / 10;
    sheet({
      icon: d.ic, title: "本日の還元率", ok: "とじる",
      html:
        '<div class="sh-kv"><span>今日の配当（全ゲーム共通）</span><span><b>' + d.pct + "%</b></span></div>" +
        '<div class="sh-kv"><span>ジャックポットへの積立</span><span>' + Math.round(JP_RATE * 1000) / 10 + "%</span></div>" +
        '<div class="sh-kv"><span>合計</span><span><b>' + d.total + "%</b></span></div>" +
        '<div class="sh-kv"><span>毎日の上乗せ（ハウス負担）</span><span><b>+' + JP_DAILY.toLocaleString() + " XEVA</b></span></div>" +
        '<div class="sh-kv"><span>ふだん（平均）との差</span><span>' + d.sign + "</span></div>" +
        '<div class="sh-kv"><span>次に変わるまで</span><span>あと ' + dayLeftText() + "</span></div>" +
        '<div class="mj-note" style="margin-top:10px"><b>' + d.ic + " " + esc(d.nm) + "</b>——" + esc(d.ds) + "<br><br>" +
        "還元率は<b>毎日 0:00 に変わります</b>（±" + band + "% の範囲、0.5% 刻み）。<br>" +
        "その日の値は<b>日付だけ</b>から決まるので、<b>全員がまったく同じ条件</b>で、" +
        "遊ぶ前にこの画面で確認できます。あとから運営が動かすことはできません。<br>" +
        "真ん中（" + Math.round(BASE_RTP * 100) + "%）がいちばん出やすく、端の日はまれ。" +
        "<b>長い目で見た平均は " + Math.round(BASE_RTP * 100) + "% ＋ ジャックポット " +
        Math.round(JP_RATE * 100) + "% ＝ 100%</b> のまま変わりません。<br><br>" +
        "★ さらに<b>毎日 " + JP_DAILY.toLocaleString() + " XEVA</b> を、ハウスがジャックポットへ足しています。" +
        "ベットから来ていないお金なので、これは<b>まるごと上乗せ</b>——" +
        "全体の還元率は <b>100% を超えます</b>。入るのは 1日 1回で、" +
        "その日いちばん最初に遊んだ人の起動時に積まれます（早い者勝ちではなく、プールは全員で共有）。<br><br>" +
        "★ その日の倍率は<b>すべてのゲームに同じように掛かります</b>。" +
        "「今日はこの台だけ甘い」は作りません——台えらびが損得の問題になってしまうからです。" +
        "変わるのは<b>その日のコンディション</b>だけで、どの卓を選ぶかは今日もリスクの好みで決められます。</div>",
    });
  }

  /* ══════════════════════════════════════════
     セーブ
     ══════════════════════════════════════════ */
  function fresh() {
    return {
      v: 2,
      /* 統計 */
      stats: { rounds: 0, wins: 0, wagered: 0, won: 0, biggest: 0, streak: 0, bestStreak: 0, jackpots: 0 },
      byGame: {},                  // gameId -> { plays, wagered, won, best, wins }
      /* プログレッシブ */
      jp: JP_SEED, jpSeeded: 1,
      /* ミッション・実績・称号 */
      daily: { d: "", p: {}, got: {} },
      weekly: { w: "", p: {}, got: {} },
      ach: {},                     // achId -> ts
      title: "",                   // 装備中の称号
      /* スキン */
      skins: { owned: {}, eq: { card: "classic", chip: "classic", felt: "emerald", bg: "aurora", fx: "gold" } },
      /* 期間限定イベント： evId -> { ep, got:{tierIndex:ts} } ／ 限定称号 */
      ev: {}, evTitles: {},
      /* ベットの端数（EP を「10,000 ごと」に換算するための繰り越し） */
      evWagerRest: 0,
      /* Magi Fortune の FORTUNE GAUGE（預かり額と充填数）と、見た演出の記録 */
      slotPool: 0, slotCharge: 0, slotFx: {},
      /* Jackpot Rush の BOOST ゲージと、見た演出の記録 */
      pachiBoost: 0, pachiPool: 0, pachiFx: {},
      /* LUXURIA（自分で止める台）の持ち越しフラグ・アシスト設定・見た演出 */
      lux: { flag: "", dia: 0, assist: 1, games: 0, fx: {} },
      /* リプレイ（直近30件） */
      replays: [],
      /* 設定 */
      set: { sound: true, fast: false, shake: true, tutorialDone: {} },
      updatedAt: 0,
    };
  }
  let S = fresh();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === "object") S = deepFill(p, fresh());
      }
    } catch (e) { S = fresh(); }
    /* 種銭は一度きり。古いセーブが降ってきても増えない */
    if (!S.jpSeeded) { S.jp = Math.max(S.jp || 0, JP_SEED); S.jpSeeded = 1; }
    return S;
  }
  /* 欠けているキーだけ既定値で埋める（新項目を足してもセーブが壊れない） */
  function deepFill(o, def) {
    if (o == null || typeof o !== "object" || Array.isArray(o)) return o == null ? def : o;
    const out = Array.isArray(def) ? o : Object.assign({}, def, o);
    Object.keys(def).forEach((k) => {
      if (def[k] && typeof def[k] === "object" && !Array.isArray(def[k])) out[k] = deepFill(o[k], def[k]);
    });
    return out;
  }
  function save() {
    S.updatedAt = now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }
  /* 取り返しのつかない変化（大当たり・実績・購入）の直後はクラウドへ押し出す */
  function saveNow() {
    save();
    try { if (window.XevaCloud && window.XevaCloud.flushPush) window.XevaCloud.flushPush(); } catch (e) {}
  }
  load();

  /* ══════════════════════════════════════════
     通貨
     ══════════════════════════════════════════ */
  function xeva() { try { return window.XEVA ? window.XEVA.getBalance() : 0; } catch (e) { return 0; } }
  function gems() { try { return (window.XEVA && window.XEVA.gem) ? window.XEVA.gem.get() : 0; } catch (e) { return 0; } }

  /* ベットを引く。足りなければ false を返して何もしない。
     ★ 呼び出し側で残高チェックを重ねなくてよい＝「引けていないのに配当だけ出る」を防ぐ。 */
  /* jpRate を渡すと、そのゲームだけ積立率を変えられる（省略時は JP_RATE）。
     ★ ブラックジャックのように「素の還元率がもともと高い」卓は 0 を渡す。
       そこから 2% 抜くと、他のゲームより明らかに損な卓になってしまうため。 */
  function bet(n, gameId, jpRate) {
    n = Math.round(n || 0);
    if (n <= 0) return true;
    let ok = false;
    try { ok = window.XEVA.spend(n, "MagiJackpot：ベット"); } catch (e) { ok = false; }
    if (!ok) return false;
    S.stats.wagered += n;
    jpAccrue(n * (jpRate == null ? JP_RATE : jpRate)); // プログレッシブへ積む（共有プール）
    if (gameId) g(gameId).wagered += n;
    bumpMission("wager", n);
    /* XEVARION のスターターミッション「ゲームを1回プレイしよう」。
       ベットが通った時点＝実際に1回まわした時点で達成にする（2回目以降は 0 が返るだけ）。 */
    try { if (window.XEVA && window.XEVA.completeMission) window.XEVA.completeMission("magijackpot_play"); } catch (e) {}
    /* イベント：ベット 10,000 ごとに +1 EP（端数は次に繰り越す） */
    S.evWagerRest = (S.evWagerRest || 0) + n;
    if (S.evWagerRest >= 10000) {
      const step = Math.floor(S.evWagerRest / 10000);
      S.evWagerRest -= step * 10000;
      addEp(step, "ベット");
    }
    emit();
    return true;
  }
  function payout(n, gameId, reason) {
    n = Math.round(n || 0);
    if (n <= 0) return 0;
    try { window.XEVA.add(n, "MagiJackpot：" + (reason || "配当")); } catch (e) {}
    S.stats.won += n;
    if (n > S.stats.biggest) S.stats.biggest = n;
    if (gameId) { const b = g(gameId); b.won += n; if (n > b.best) b.best = n; }
    emit();
    return n;
  }
  function gemWin(n, reason) {
    n = Math.round(n || 0);
    if (n <= 0) return 0;
    try { if (window.XEVA && window.XEVA.gem) window.XEVA.gem.add(n, "MagiJackpot：" + (reason || "報酬")); } catch (e) {}
    emit();
    return n;
  }
  function gemSpend(n, reason) {
    n = Math.round(n || 0);
    if (n <= 0) return true;
    let ok = false;
    try { ok = window.XEVA.gem.spend(n, "MagiJackpot：" + (reason || "")); } catch (e) { ok = false; }
    if (ok) emit();
    return ok;
  }
  function emit() { try { window.dispatchEvent(new CustomEvent("mj:wallet")); } catch (e) {} }
  function g(id) {
    if (!S.byGame[id]) S.byGame[id] = { plays: 0, wagered: 0, won: 0, best: 0, wins: 0 };
    return S.byGame[id];
  }

  /* ══════════════════════════════════════════
     乱数
     ・検証（RTPのモンテカルロ）で差し替えられるよう、必ず rng() を通す。
     ══════════════════════════════════════════ */
  const CRYPTO = (typeof crypto !== "undefined" && crypto.getRandomValues) ? crypto : null;
  let _rngOverride = null;
  function rng() {
    if (_rngOverride) return _rngOverride();
    if (CRYPTO) { const a = new Uint32Array(1); CRYPTO.getRandomValues(a); return a[0] / 4294967296; }
    return Math.random();
  }
  function ri(n) { return Math.floor(rng() * n); }
  function pick(a) { return a[ri(a.length)]; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* 重み付き抽選。list = [{w: 重み, ...}] */
  function weighted(list) {
    let tot = 0; for (const x of list) tot += x.w;
    let r = rng() * tot;
    for (const x of list) { r -= x.w; if (r < 0) return x; }
    return list[list.length - 1];
  }
  function chance(p) { return rng() < p; }

  /* ══════════════════════════════════════════
     プログレッシブ・ジャックポット（★ 全員で共有する1本のプール）
     ------------------------------------------
     ★ クラウド共有にした理由
       端末ごとに積むと「自分が回したぶんしか増えない」ので、
       ひとりで遊んでいる間ずっと数字が動かない。プログレッシブの気持ちよさは
       「知らない誰かのベットでも増えていく」ことなので、プールは1本にした。
       オフラインのときは端末内のプール（S.jp）で遊べる。

     ★ 積立倍率（JP_BOOST）
       人数が少ないうちは 2% ずつ積んでも育たない。
       「見ていて増えるのがわかる」ほうが大事なので、積立に倍率をかけている。
       ここは <b>意図的に収支を無視した部分</b>。ジャックポットは
       ハウスからの上乗せぶんも込みで出ていく＝還元率は 100% を上回る。
       （各ゲームの配当そのものは 98% のまま変えていない）

     ・当選確率はベット額に比例させる（たくさん賭けた人ほど当たりやすい＝公平）。
     ══════════════════════════════════════════ */
  const JP_PER   = 1 / 900000;   // ベット1あたりの当選確率
  const JP_BOOST = 12;           // ★ 積立の倍率（多いほど早く育つ）
  const JP_MIN   = 1000;         // これ未満のときは当たり扱いにしない

  let _jpCloud = null;           // クラウドの現在額（null＝まだ届いていない）
  let _jpWatch = null;
  let _jpPoll = null;
  let _jpErr = false;            // ★ 2026-08-12 購読が失敗した（権限エラーなど）
  function fb() { try { return window.XEVARIONFB || null; } catch (e) { return null; } }
  function jpSet(v) {
    _jpCloud = v;
    try { window.dispatchEvent(new CustomEvent("mj:jackpot", { detail: { amount: v } })); } catch (e) {}
  }
  /* ══ ジャックポットが「OFFLINE」のままになる不具合の対策（2026-08-03）══
     xevarion-fb.js は type="module"（CDN から Firebase を import する）ため、
     読み込みの完了は状況によって前後する。旧実装は
       ・window.XEVARIONFB がまだ無ければ xevarionfb:ready を once で待つ
     だけだったので、
       ・こちらが登録するより先に ready が飛んでいた
       ・回線が遅くて import が失敗し、あとから復帰した
     といった場合に二度と繋ぎにいかず、ずっと OFFLINE 表示のままだった。
     ここでは「届くまで一定間隔で見にいく」「オンライン復帰でやり直す」
     「見張りが値をくれない時は1回だけ直接読む」の3段構えにする。 */
  function jpConnect() {
    if (_jpWatch) return;
    const F = fb();
    if (!F || !F.jackpotWatch) {
      window.addEventListener("xevarionfb:ready", jpConnect, { once: true });
      if (!_jpPoll) {
        let tries = 0;
        _jpPoll = setInterval(() => {
          if (_jpWatch) { clearInterval(_jpPoll); _jpPoll = null; return; }
          if (++tries > 40) { clearInterval(_jpPoll); _jpPoll = null; return; }   // 20秒であきらめる
          jpConnect();
        }, 500);
      }
      return;
    }
    if (_jpPoll) { clearInterval(_jpPoll); _jpPoll = null; }
    /* ★ 2026-08-12 購読が失敗したら（権限エラーなど）張り直す。
       黙って捨てていたので、Realtime DB のルールに magijackpot が無かったあいだ
       <b>永久に OFFLINE のまま</b>になっていた。 */
    _jpWatch = F.jackpotWatch(jpSet, () => {
      _jpErr = true;
      if (_jpWatch) { try { _jpWatch(); } catch (e) {} }
      _jpWatch = null;
      setTimeout(jpConnect, 8000);       // しばらく置いてから張り直す
    });
    /* 見張りが 4 秒たっても何も返さない（購読が張れていない）ときは、直接読んで数字を出す。
       ★ 1回だけだと、そのときたまたま通信が詰まっていると二度と出なくなるので、
         届くまで 6 秒おきに最大5回ためす（届いた時点で止まる）。 */
    let tries = 0;
    const pull = async () => {
      if (_jpCloud != null || !F.jackpotGet) return;
      try { const v = await F.jackpotGet(); if (typeof v === "number") { jpSet(v); _jpErr = false; return; } } catch (e) {}
      if (++tries < 5) setTimeout(pull, 6000);
    };
    setTimeout(pull, 4000);
  }
  jpConnect();
  /* オンラインに戻ったら張り直す（オフラインで開いた回も拾えるように） */
  window.addEventListener("online", () => {
    if (!_jpWatch) jpConnect();
    else if (_jpCloud == null) jpConnect();
  });

  /* 表示用。クラウドが取れていればそれ、取れていなければ端末のプール。 */
  function jackpot() { return Math.floor(_jpCloud == null ? S.jp : _jpCloud); }
  function jackpotShared() { return _jpCloud != null; }
  /* ★ 2026-08-12 いまの同期の状態。画面の札（SHARED / OFFLINE）に理由を添えるのに使う。
       "shared"  … クラウドと同期できている
       "denied"  … つながったが読めない（Realtime DB のルールに magijackpot が無い）
       "waiting" … まだ届いていない（回線が遅い・起動直後） */
  function jackpotState() { return _jpCloud != null ? "shared" : _jpErr ? "denied" : "waiting"; }

  /* ══ 毎日の上乗せ（運営からの積み増し） ══
     ベットからの積立（JP_RATE）とは別に、毎日 JP_DAILY をプールへ入れる。
     出どころはハウスなので、そのぶんは丸ごと還元率の上乗せになる。
     ★ プールは全員の共有。1日1回だけ入るように、実際に積むかどうかの判定は
       クラウド側の日付の印（jackpotDailySeed）にまかせる。
       オフラインでは積まない——端末ごとに積むと人数ぶん増えてしまうため。 */
  const JP_DAILY = 10000;
  let _jpSeedTried = "";
  async function jpDailySeed() {
    const d = today();
    if (_jpSeedTried === d) return;      // この起動でもう試した
    _jpSeedTried = d;
    const F = fb();
    if (!F || !F.jackpotDailySeed || offline()) { _jpSeedTried = ""; return; }
    try {
      const r = await F.jackpotDailySeed(JP_DAILY, d);
      if (r && r.seeded) {
        // 印を取れた＝自分が入れた。見えている数字も即座に伸ばす。
        if (_jpCloud != null) _jpCloud += JP_DAILY;
      } else if (r && r.error) {
        _jpSeedTried = "";               // 通信失敗。次の機会に試し直す
      }
    } catch (e) { _jpSeedTried = ""; }
  }
  jpDailySeed();
  window.addEventListener("online", jpDailySeed);
  // 日付をまたいだまま開きっぱなしのときも拾う
  setInterval(jpDailySeed, 5 * 60 * 1000);

  /* 積立。bet() から呼ぶ。開催中のイベントがあれば、その倍率もここで乗る。 */
  function jpAccrue(amount) {
    const add = amount * JP_BOOST * evJpMul();
    S.jp += add;                                   // 端末側にも積む（オフラインの受け皿）
    if (_jpCloud != null) _jpCloud += add;         // 見た目を即座に伸ばす（正はクラウド）
    const F = fb();
    if (F && F.jackpotAdd) { try { F.jackpotAdd(add); } catch (e) {} }
  }

  /* 当選判定。★ クラウドと話すので Promise を返す（呼び出し側は await する）。
     クラウド側は runTransaction で「読んで 0 にする」を1回で行うので、
     同時に2人が当てても払い出しは1回だけ。 */
  async function jackpotRoll(betAmt) {
    if (jackpot() < JP_MIN) return 0;
    const p = Math.min(0.02, betAmt * JP_PER);
    if (!chance(p)) return 0;
    const F = fb();
    if (F && F.jackpotClaim && !offline()) {
      let uid = "", nm = "";
      try { const a = window.XEVA.account.get() || {}; uid = a.xvUid || a.uid || ""; nm = a.name || ""; } catch (e) {}
      let won = 0;
      try { won = await F.jackpotClaim(uid, nm, JP_MIN); } catch (e) { won = 0; }
      if (won > 0) {
        _jpCloud = 0;
        S.jp = 0;                                  // 端末側の受け皿もそろえる
        S.stats.jackpots++;
        addEp(300, "ジャックポット");
        saveNow();
        return won;
      }
      /* 先に誰かが持っていった＝今回は当たりにしない（二重払いを作らない） */
      return 0;
    }
    /* オフライン：端末内のプールから払う */
    const amt = Math.floor(S.jp);
    if (amt < JP_MIN) return 0;
    S.jp = 0;
    S.stats.jackpots++;
    saveNow();
    return amt;
  }
  /* デバッグ／演出確認用（コンソールから呼べる） */
  async function jackpotForce() {
    const F = fb();
    if (F && F.jackpotClaim && !offline()) {
      let uid = "", nm = "";
      try { const a = window.XEVA.account.get() || {}; uid = a.xvUid || a.uid || ""; nm = a.name || ""; } catch (e) {}
      const w = await F.jackpotClaim(uid, nm, 0);
      if (w > 0) { _jpCloud = 0; S.stats.jackpots++; saveNow(); return w; }
    }
    const a = Math.max(Math.floor(S.jp), JP_MIN); S.jp = 0; S.stats.jackpots++; saveNow(); return a;
  }
  function jackpotWinners(n) {
    const F = fb();
    return (F && F.jackpotWinners) ? F.jackpotWinners(n) : Promise.resolve([]);
  }

  /* ══════════════════════════════════════════
     ラウンドの記録（統計・ミッション・実績・リプレイ）
     ══════════════════════════════════════════ */
  function round(o) {
    /* o = { game, bet, win, detail, replay } */
    const id = o.game;
    S.stats.rounds++;
    g(id).plays++;
    if (o.win > o.bet) {
      S.stats.wins++; g(id).wins++;
      S.stats.streak++;
      if (S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak;
    } else if (o.win <= 0) {
      S.stats.streak = 0;
    }
    bumpMission("play", 1);
    bumpMission("play_" + id, 1);
    if (o.win > 0) bumpMission("win", 1);
    if (o.win >= o.bet * 10 && o.bet > 0) bumpMission("big", 1);
    /* イベント：1ラウンド +1 EP、ベットの20倍以上でさらに +5 EP */
    addEp(1, "プレイ");
    if (o.bet > 0 && o.win >= o.bet * 20) addEp(5, "大当たり");
    if (o.replay) pushReplay(Object.assign({ game: id, bet: o.bet, win: o.win, t: now() }, o.replay));
    checkAch();
    save();
  }
  function pushReplay(r) {
    S.replays.unshift(r);
    if (S.replays.length > 30) S.replays.length = 30;
  }
  function replays() { return S.replays; }

  /* ══════════════════════════════════════════
     ミッション（デイリー／ウィークリー）
     ══════════════════════════════════════════ */
  const DAILY = [
    { id: "d_play",  nm: "どれでも 10 ラウンド遊ぶ", k: "play",        goal: 10,    xeva: 300, gem: 0 },
    { id: "d_slot",  nm: "Magi Fortune を 15 回まわす", k: "play_slot", goal: 15,   xeva: 400, gem: 0 },
    { id: "d_bj",    nm: "Royal Blackjack を 8 ハンド", k: "play_bj",  goal: 8,     xeva: 400, gem: 0 },
    { id: "d_lux",   nm: "LUXURIA を 15 ゲームまわす", k: "play_lux",  goal: 15,   xeva: 400, gem: 0 },
    { id: "d_win",   nm: "5 回勝つ",                 k: "win",         goal: 5,     xeva: 350, gem: 0 },
    { id: "d_wager", nm: "合計 5,000 XEVA ベットする", k: "wager",      goal: 5000,  xeva: 500, gem: 1 },
  ];
  const WEEKLY = [
    { id: "w_play",  nm: "1週間で 120 ラウンド遊ぶ",     k: "play",  goal: 120,   xeva: 2000, gem: 3 },
    { id: "w_big",   nm: "ベットの 10倍以上を 5 回出す", k: "big",    goal: 5,     xeva: 2500, gem: 4 },
    { id: "w_wager", nm: "合計 60,000 XEVA ベットする",  k: "wager", goal: 60000, xeva: 3000, gem: 5 },
    { id: "w_pachi", nm: "Jackpot Rush を 60 回まわす",  k: "play_pachi", goal: 60, xeva: 2200, gem: 3 },
  ];
  function today() { return new Date().toLocaleDateString("sv-SE"); }
  function weekId() {
    const d = new Date(); const j = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + "W" + Math.ceil(((d - j) / 86400000 + j.getDay() + 1) / 7);
  }
  function rollPeriods() {
    const t = today(), w = weekId();
    if (S.daily.d !== t) { S.daily = { d: t, p: {}, got: {} }; save(); }
    if (S.weekly.w !== w) { S.weekly = { w: w, p: {}, got: {} }; save(); }
  }
  function bumpMission(k, n) {
    rollPeriods();
    S.daily.p[k] = (S.daily.p[k] || 0) + n;
    S.weekly.p[k] = (S.weekly.p[k] || 0) + n;
  }
  function missions(kind) {
    rollPeriods();
    const src = kind === "weekly" ? WEEKLY : DAILY;
    const st = kind === "weekly" ? S.weekly : S.daily;
    return src.map((m) => {
      const p = Math.min(m.goal, st.p[m.k] || 0);
      return Object.assign({}, m, { kind: kind || "daily", p: p, done: p >= m.goal, claimed: !!st.got[m.id] });
    });
  }
  function claimMission(kind, id) {
    const list = missions(kind);
    const m = list.find((x) => x.id === id);
    if (!m || !m.done || m.claimed) return null;
    const st = kind === "weekly" ? S.weekly : S.daily;
    st.got[id] = now();
    payout(m.xeva, null, "ミッション：" + m.nm);
    if (m.gem) gemWin(m.gem, "ミッション：" + m.nm);
    saveNow();
    return m;
  }

  /* ══════════════════════════════════════════
     期間限定イベント
     ------------------------------------------
     ★ 作りの考えかた
       イベントは「別のゲーム」を足すのではなく、
       <b>いつも遊んでいる卓のまま、目標と報酬だけが増える</b>形にする。
       そのほうが「せっかくだから今日も回そう」につながるし、
       期間が終わっても本体のバランスが動かない。

       ・EP（イベントポイント）はふだんのプレイでたまる
       ・マイルストーンを越えるたびに XEVA・ジェム・限定スキン・限定称号
       ・期間中はジャックポットの積立にさらに倍率がかかる（jpMul）

     ★ 期間の判定は端末の日付。多少ずれても困らない作りにしてある
       （EP は期間が終わっても消さない＝受け取り忘れで泣かない）。
     ══════════════════════════════════════════ */
  const EVENTS = [
    {
      id: "goldrush2608",
      nm: "ゴールドラッシュ",
      en: "GOLD RUSH",
      ic: "🌟",
      from: "2026-07-30", to: "2026-08-24",
      lead: "夏の 26 日間、ハウスが金脈を掘りあてました。",
      ds: "期間中は<b>ジャックポットの積立がさらに ×2</b>。" +
          "遊ぶだけで<b>EP（イベントポイント）</b>がたまり、" +
          "節目ごとに XEVA・ジェム・<b>期間限定スキン</b>・<b>限定称号</b>を受け取れます。",
      jpMul: 2,
      /* EP の入りかた（ここを見れば「何をすれば伸びるか」がわかる） */
      how: [
        ["🎲", "1 ラウンド遊ぶ", "+1 EP"],
        ["💰", "ベット 10,000 ごと", "+1 EP"],
        ["💥", "ベットの 20 倍以上を獲得", "+5 EP"],
        ["🎰", "ジャックポットを引き当てる", "+300 EP"],
      ],
      tiers: [
        { ep: 30,   xeva: 1500,  gem: 0, nm: "採掘開始" },
        { ep: 100,  xeva: 4000,  gem: 2, nm: "金の粒" },
        { ep: 250,  xeva: 10000, gem: 4, nm: "金脈発見" },
        { ep: 500,  xeva: 25000, gem: 6, nm: "黄金の卓", skin: "felt:goldrush" },
        { ep: 900,  xeva: 50000, gem: 10, nm: "золото", title: "ゴールドラッシャー" },
      ],
    },
  ];
  function evToday() { return new Date().toLocaleDateString("sv-SE"); }
  function events() { return EVENTS.map((e) => Object.assign({}, e)); }
  /* いま開催中のイベント（無ければ null） */
  function activeEvent() {
    const t = evToday();
    return EVENTS.find((e) => e.from <= t && t <= e.to) || null;
  }
  function evState(id) {
    if (!S.ev) S.ev = {};
    if (!S.ev[id]) S.ev[id] = { ep: 0, got: {} };
    return S.ev[id];
  }
  /* イベントの倍率。開催していなければ 1（＝ふだんどおり） */
  function evJpMul() { const e = activeEvent(); return e && e.jpMul ? e.jpMul : 1; }
  function addEp(n, why) {
    const e = activeEvent(); if (!e || n <= 0) return 0;
    const st = evState(e.id);
    st.ep += Math.round(n);
    save();
    try { window.dispatchEvent(new CustomEvent("mj:event", { detail: { ep: st.ep, add: n, why: why || "" } })); } catch (er) {}
    return st.ep;
  }
  /* 進捗つきのマイルストーン一覧（UI 用） */
  function evTiers(id) {
    const e = EVENTS.find((x) => x.id === id) || activeEvent();
    if (!e) return [];
    const st = evState(e.id);
    return e.tiers.map((t, i) =>
      Object.assign({}, t, { i: i, done: st.ep >= t.ep, claimed: !!st.got[i] }));
  }
  function evEp(id) {
    const e = EVENTS.find((x) => x.id === id) || activeEvent();
    return e ? evState(e.id).ep : 0;
  }
  function claimEvTier(id, i) {
    const e = EVENTS.find((x) => x.id === id) || activeEvent();
    if (!e) return null;
    const st = evState(e.id), t = e.tiers[i];
    if (!t || st.ep < t.ep || st.got[i]) return null;
    st.got[i] = now();
    if (t.xeva) payout(t.xeva, null, e.nm + "：" + t.nm);
    if (t.gem) gemWin(t.gem, e.nm + "：" + t.nm);
    if (t.skin) { const p = t.skin.split(":"); S.skins.owned[t.skin] = now(); S.skins.eq[p[0]] = p[1]; applySkins(); }
    if (t.title) { S.evTitles = S.evTitles || {}; S.evTitles[t.title] = now(); }
    saveNow();
    return t;
  }
  /* イベント限定の称号を持っているか（称号一覧に混ぜる） */
  function evTitles() {
    return Object.keys(S.evTitles || {}).map((nm) => ({ id: "ev:" + nm, nm: nm, got: true, from: "期間限定イベント" }));
  }

  /* ══════════════════════════════════════════
     実績と称号
     ・称号は実績の中から選んで装備する（ロビーとパーティーの名前の頭に付く）。
     ══════════════════════════════════════════ */
  const ACH = [
    { id: "a_first",   ic: "🎲", nm: "はじめの一勝",       ds: "初めて配当を受け取る",             title: "ビギナー",       f: () => S.stats.wins >= 1 },
    { id: "a_100",     ic: "🔁", nm: "常連",               ds: "100 ラウンド遊ぶ",                 title: "常連",           f: () => S.stats.rounds >= 100 },
    { id: "a_1000",    ic: "🏛", nm: "ハウスの主",          ds: "1,000 ラウンド遊ぶ",               title: "ハウスの主",     f: () => S.stats.rounds >= 1000 },
    { id: "a_streak5", ic: "🔥", nm: "5連勝",              ds: "5連勝する",                        title: "連勝師",         f: () => S.stats.bestStreak >= 5 },
    { id: "a_streak10",ic: "☄️", nm: "10連勝",             ds: "10連勝する",                       title: "不敗",           f: () => S.stats.bestStreak >= 10 },
    { id: "a_big10k",  ic: "💰", nm: "一撃 10,000",        ds: "1回で 10,000 XEVA 以上を獲得",     title: "一撃必中",       f: () => S.stats.biggest >= 10000 },
    { id: "a_big100k", ic: "👑", nm: "一撃 100,000",       ds: "1回で 100,000 XEVA 以上を獲得",    title: "大富豪",         f: () => S.stats.biggest >= 100000 },
    { id: "a_jp",      ic: "🎰", nm: "ジャックポット",     ds: "プログレッシブを引き当てる",       title: "ジャックポッター", f: () => S.stats.jackpots >= 1 },
    { id: "a_jp3",     ic: "🌟", nm: "三度の奇跡",         ds: "ジャックポットを3回引き当てる",     title: "奇跡の人",       f: () => S.stats.jackpots >= 3 },
    { id: "a_bj",      ic: "♠",  nm: "ブラックジャック卓の常連", ds: "Royal Blackjack を 200 ハンド", title: "カードシャーク", f: () => (S.byGame.bj || {}).plays >= 200 },
    { id: "a_slot",    ic: "🎡", nm: "スピナー",           ds: "Magi Fortune を 500 回まわす",     title: "スピナー",       f: () => (S.byGame.slot || {}).plays >= 500 },
    { id: "a_pachi",   ic: "🔔", nm: "確変マスター",       ds: "Jackpot Rush を 500 回まわす",     title: "確変マスター",   f: () => (S.byGame.pachi || {}).plays >= 500 },
    { id: "a_lux",     ic: "🌹", nm: "薔薇の目",           ds: "LUXURIA を 300 ゲームまわす",       title: "目押し職人",     f: () => (S.byGame.lux || {}).plays >= 300 },
    { id: "a_party",   ic: "🎉", nm: "パーティーの主催者", ds: "パーティーモードを 10 回ひらく",   title: "宴の主",         f: () => ((S.byGame.arena || {}).plays || 0) + ((S.byGame.groul || {}).plays || 0) >= 10 },
    { id: "a_wager1m", ic: "🏆", nm: "百万の卓",           ds: "累計 1,000,000 XEVA ベットする",   title: "ハイローラー",   f: () => S.stats.wagered >= 1000000 },
  ];
  function achList() {
    return ACH.map((a) => Object.assign({}, a, { got: !!S.ach[a.id] }));
  }
  /* 実績の達成判定。新しく取れたものを配列で返す（呼び出し側で演出を出す） */
  function checkAch() {
    const got = [];
    ACH.forEach((a) => {
      if (S.ach[a.id]) return;
      let ok = false;
      try { ok = a.f(); } catch (e) { ok = false; }
      if (!ok) return;
      S.ach[a.id] = now();
      got.push(a);
    });
    if (got.length) {
      saveNow();
      got.forEach((a, i) => setTimeout(() => toast("🏅 実績解除　<b>" + a.nm + "</b><br>称号「" + a.title + "」を獲得！", 3200), i * 900));
    }
    return got;
  }
  function titles() {
    return ACH.map((a) => ({ id: a.id, nm: a.title, got: !!S.ach[a.id], from: a.nm }));
  }
  /* 称号は実績由来（id = 実績ID）と、期間限定イベント由来（id = "ev:称号名"）の2種類 */
  function setTitle(id) {
    if (String(id || "").indexOf("ev:") === 0) {
      const nm = id.slice(3);
      S.title = (S.evTitles && S.evTitles[nm]) ? id : "";
    } else {
      S.title = S.ach[id] ? id : "";
    }
    saveNow();
  }
  function titleName() {
    const t = String(S.title || "");
    if (t.indexOf("ev:") === 0) { const nm = t.slice(3); return (S.evTitles && S.evTitles[nm]) ? nm : ""; }
    const a = ACH.find((x) => x.id === t);
    return a && S.ach[a.id] ? a.title : "";
  }

  /* ══════════════════════════════════════════
     スキン（カード・チップ・テーブル・背景・演出）
     ══════════════════════════════════════════ */
  const SKINS = [
    { k: "card", id: "classic", nm: "クラシック",   ds: "紫と金の定番デザイン", cost: 0,  pv: "🂠", css: "" },
    { k: "card", id: "gold",    nm: "ゴールドリーフ", ds: "総金箔の裏面",       cost: 12, pv: "🂠", css: "skin-card-gold" },
    { k: "card", id: "neon",    nm: "ネオンブルー", ds: "電飾のような光沢",     cost: 12, pv: "🂠", css: "skin-card-neon" },
    { k: "card", id: "sakura",  nm: "サクラ",       ds: "淡い桜色の裏面",       cost: 18, pv: "🂠", css: "skin-card-sakura" },
    { k: "felt", id: "emerald", nm: "エメラルド",   ds: "王道のグリーンフェルト", cost: 0, pv: "🟩", css: "" },
    { k: "felt", id: "royal",   nm: "ロイヤルパープル", ds: "紫のベルベット",   cost: 15, pv: "🟪", css: "skin-felt-royal" },
    { k: "felt", id: "noir",    nm: "ノワール",     ds: "黒鉄のテーブル",       cost: 15, pv: "⬛", css: "skin-felt-noir" },
    { k: "felt", id: "crimson", nm: "クリムゾン",   ds: "深紅のフェルト",       cost: 22, pv: "🟥", css: "skin-felt-crimson" },
    /* ★ 期間限定イベントの報酬。ショップには出さない（cost:null＝買えない） */
    { k: "felt", id: "goldrush", nm: "ゴールドラッシュ", ds: "イベント限定・黄金の卓", cost: null, pv: "🟨", css: "skin-felt-goldrush", ev: 1 },
    { k: "chip", id: "classic", nm: "スタンダード", ds: "見慣れたカジノチップ", cost: 0,  pv: "🔵", css: "" },
    { k: "chip", id: "crystal", nm: "クリスタル",   ds: "透きとおるチップ",     cost: 14, pv: "💠", css: "skin-chip-crystal" },
    { k: "chip", id: "obsidian",nm: "オブシディアン", ds: "黒曜石のチップ",     cost: 14, pv: "⚫", css: "skin-chip-obsidian" },
    { k: "bg",   id: "aurora",  nm: "オーロラ",     ds: "明るい光のロビー",     cost: 0,  pv: "🌈", css: "" },
    { k: "bg",   id: "midnight",nm: "ミッドナイト", ds: "夜のロビー（暗転）",   cost: 20, pv: "🌙", css: "dark" },
    { k: "fx",   id: "gold",    nm: "ゴールドコイン", ds: "金貨が舞う",         cost: 0,  pv: "🪙", css: "" },
    { k: "fx",   id: "gem",     nm: "ジェムシャワー", ds: "宝石が降りそそぐ",   cost: 16, pv: "💎", css: "" },
    { k: "fx",   id: "sakura",  nm: "花吹雪",       ds: "桜が舞い散る",         cost: 16, pv: "🌸", css: "" },
    { k: "fx",   id: "star",    nm: "スターダスト", ds: "星屑がきらめく",       cost: 24, pv: "✨", css: "" },
  ];
  function skins(kind) { return SKINS.filter((s) => !kind || s.k === kind).map((s) => Object.assign({}, s, { owned: s.cost === 0 || !!S.skins.owned[s.k + ":" + s.id], eq: S.skins.eq[s.k] === s.id })); }
  /* ショップに並べるぶん（イベント限定は、手に入れるまで出さない） */
  function shopSkins(kind) { return skins(kind).filter((s) => !s.ev || s.owned); }
  function buySkin(k, id) {
    const s = SKINS.find((x) => x.k === k && x.id === id);
    if (!s) return { ok: false, msg: "見つかりません" };
    const key = k + ":" + id;
    /* ★ cost が数字でないもの（＝イベント限定）はジェムでは買えない。
       ここを通すと 0 ジェムで手に入ってしまう。 */
    if (typeof s.cost !== "number") return { ok: false, msg: "これは期間限定イベントの報酬です" };
    if (s.cost === 0 || S.skins.owned[key]) return { ok: false, msg: "すでに持っています" };
    if (gems() < s.cost) return { ok: false, msg: "ジェムが足りません（必要 💎" + s.cost + "）" };
    if (!gemSpend(s.cost, "スキン：" + s.nm)) return { ok: false, msg: "購入に失敗しました" };
    S.skins.owned[key] = now();
    S.skins.eq[k] = id;
    applySkins(); saveNow();
    return { ok: true, msg: s.nm + " を手に入れました！" };
  }
  function equipSkin(k, id) {
    const s = SKINS.find((x) => x.k === k && x.id === id);
    if (!s) return false;
    if (s.cost > 0 && !S.skins.owned[k + ":" + id]) return false;
    S.skins.eq[k] = id;
    applySkins(); saveNow();
    return true;
  }
  /* 装備中のスキンを <body> のクラスとして反映する */
  function applySkins() {
    const b = document.body;
    SKINS.forEach((s) => { if (s.css) b.classList.remove(s.css); });
    Object.keys(S.skins.eq).forEach((k) => {
      const s = SKINS.find((x) => x.k === k && x.id === S.skins.eq[k]);
      if (s && s.css) b.classList.add(s.css);
    });
  }
  /* 演出スキンに応じた粒の見た目 */
  function fxParticle() {
    const id = S.skins.eq.fx;
    if (id === "gem")    return { colors: ["#8ee6ff", "#c08bff", "#ff8ad0", "#8effc0"], shape: "gem" };
    if (id === "sakura") return { colors: ["#ffc0d8", "#ffd9e8", "#ff9dc0", "#fff0f5"], shape: "petal" };
    if (id === "star")   return { colors: ["#fff6c0", "#ffd257", "#9be0ff", "#ffffff"], shape: "star" };
    return { colors: ["#ffd257", "#f5c542", "#e8b52c", "#fff0bd"], shape: "coin" };
  }

  /* ══════════════════════════════════════════
     効果音（WebAudio で合成。音声ファイルを持たない＝オフラインでも鳴る）
     ══════════════════════════════════════════ */
  let AC = null;
  function ac() {
    if (!S.set.sound) return null;
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      return AC;
    } catch (e) { return null; }
  }
  function tone(freq, dur, type, vol, slideTo) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), gn = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), c.currentTime + dur);
    gn.gain.setValueAtTime(0.0001, c.currentTime);
    gn.gain.exponentialRampToValueAtTime(vol == null ? 0.14 : vol, c.currentTime + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(gn); gn.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function noise(dur, vol, hp) {
    const c = ac(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 900;
    const gn = c.createGain(); gn.gain.value = vol == null ? 0.1 : vol;
    src.connect(f); f.connect(gn); gn.connect(c.destination); src.start();
  }
  const SFX = {
    click:  () => tone(680, 0.045, "square", 0.05),
    chip:   () => { tone(1250, 0.05, "triangle", 0.08); noise(0.05, 0.05, 2600); },
    deal:   () => noise(0.07, 0.07, 1800),
    reel:   () => tone(340, 0.035, "square", 0.035),
    stop:   () => { tone(200, 0.08, "square", 0.09, 120); noise(0.05, 0.05, 700); },
    win:    () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.11), i * 78)); },
    bigwin: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.22, "sawtooth", 0.1), i * 84)); },
    lose:   () => { tone(300, 0.2, "sawtooth", 0.07, 130); },
    hot:    () => { tone(880, 0.1, "square", 0.08); setTimeout(() => tone(1180, 0.12, "square", 0.08), 110); },
    jp:     () => {
      const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093];
      seq.forEach((f, i) => setTimeout(() => { tone(f, 0.3, "sawtooth", 0.12); tone(f / 2, 0.3, "sine", 0.08); }, i * 130));
      setTimeout(() => noise(0.8, 0.1, 400), 200);
    },
    tick:   () => tone(1500, 0.02, "square", 0.03),
  };

  /* ══════════════════════════════════════════
     演出（トースト・ダイアログ・粒子・揺れ・スロー・結果バナー）
     ══════════════════════════════════════════ */
  let toastT = null;
  function toast(html, ms) {
    const el = document.getElementById("mjToast"); if (!el) return;
    el.innerHTML = html; el.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove("on"), ms || 2400);
  }
  /* confirm / alert の置き換え（アプリ内ダイアログ） */
  function dlg(o) {
    return new Promise((res) => {
      const ov = document.getElementById("mjDlg"); if (!ov) return res(false);
      const okTx = o.ok || "OK", ngTx = o.cancel;
      ov.innerHTML = '<div class="card">' +
        '<h3>' + (o.icon || "🎴") + " " + esc(o.title || "") + "</h3>" +
        '<div class="bd">' + (o.html || "") + "</div>" +
        '<div class="btns">' +
        (ngTx ? '<button class="mj-btn ghost" data-v="0">' + esc(ngTx) + "</button>" : "") +
        '<button class="mj-btn" data-v="1">' + esc(okTx) + "</button>" +
        "</div></div>";
      ov.classList.add("on");
      ov.querySelectorAll("[data-v]").forEach((b) => {
        b.onclick = () => { ov.classList.remove("on"); SFX.click(); res(b.dataset.v === "1"); };
      });
    });
  }
  const alertBox = (html, title, icon) => dlg({ html, title: title || "おしらせ", icon: icon || "💬", ok: "とじる" });
  const confirmBox = (html, title, icon, ok) => dlg({ html, title: title || "確認", icon: icon || "❓", ok: ok || "はい", cancel: "やめる" });

  /* ── ボトムシート ──
     ★ 卓（ゲーム画面）を「1画面で完結」させるための入れ物。
       設定・配当表・あそびかたのような“ときどき見るもの”を縦に並べると、
       そのぶん盤面が押し出されてスクロールが必要になり、演出が台無しになる。
       ここに逃がして、必要なときだけ下から出す。
     ★ 戻り値は overlay 要素（同期）。中のボタンは呼び出し側で配線してよい。 */
  function sheet(o) {
    const ov = document.getElementById("mjSheet"); if (!ov) return null;
    ov.innerHTML =
      '<div class="sh-back"></div>' +
      '<div class="sh-card' + (o.wide ? " wide" : "") + '">' +
        '<div class="sh-hd"><b>' + (o.icon || "") + " " + esc(o.title || "") + "</b>" +
          '<button class="sh-x" aria-label="とじる">✕</button></div>' +
        '<div class="sh-bd">' + (o.html || "") + "</div>" +
        (o.ok === false ? "" : '<div class="sh-ft"><button class="mj-btn wide sh-ok">' + esc(o.ok || "とじる") + "</button></div>") +
      "</div>";
    ov.classList.add("on");
    const close = () => { ov.classList.remove("on"); SFX.click(); if (o.onClose) o.onClose(); };
    ov.querySelector(".sh-back").onclick = close;
    ov.querySelector(".sh-x").onclick = close;
    const ok = ov.querySelector(".sh-ok"); if (ok) ok.onclick = close;
    ov.__close = close;
    return ov;
  }
  function sheetClose() {
    const ov = document.getElementById("mjSheet"); if (!ov) return;
    if (ov.__close) ov.__close(); else ov.classList.remove("on");
  }

  /* ── キャラクターのカットイン（全ゲーム共通） ──
     ★ ここに1本化した理由：ゲームごとに書いていたころ、画像の指定が
       height だけ（max-width:none）だったので、縦長の絵を入れると
       横がはみ出して画面外に切れていた。1か所で
       「高さと幅の両方で必ず画面に収める」を保証する。 */
  const CUT = {
    lv1: "img/cut_lv1.webp",   // 通常
    lv2: "img/cut_lv2.webp",   // 高期待度
    lv3: "img/cut_lv3.webp",   // 激熱プレミアム
  };
  function cutIn(o) {
    o = o || {};
    return new Promise((res) => {
      const el = document.getElementById("mjCut"); if (!el) return res();
      const lv = Math.max(1, Math.min(3, o.level || 1));
      const img = o.img || CUT["lv" + lv];
      el.className = "mj-cut on lv" + lv + (o.side === "left" ? " left" : "");
      el.innerHTML = '<i class="sweep"></i>' +
        (img ? '<img src="' + img + '" alt="">' : "") +
        (o.word ? '<span class="wd">' + esc(o.word) + "</span>" : "");
      SFX.hot(); if (lv >= 2) shake(lv >= 3);
      const ms = o.ms || (lv >= 3 ? 1350 : lv >= 2 ? 1050 : 880);
      setTimeout(() => { el.className = "mj-cut"; el.innerHTML = ""; res(); }, S.set.fast ? Math.round(ms * 0.55) : ms);
    });
  }

  /* ── 粒子（チップ・紙吹雪） ── */
  let fxCv = null, fxCtx = null, fxParts = [], fxRaf = 0;
  function fxInit() {
    if (fxCv) return;
    const host = document.getElementById("mjFx"); if (!host) return;
    fxCv = document.createElement("canvas"); host.appendChild(fxCv);
    fxCtx = fxCv.getContext("2d");
    const fit = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      fxCv.width = Math.max(1, innerWidth * dpr); fxCv.height = Math.max(1, innerHeight * dpr);
      fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit(); addEventListener("resize", fit);
  }
  /* n 個の粒をまき散らす。power を上げるほど遠くまで飛ぶ。 */
  function burst(n, power, originY) {
    if (S.set.fast) n = Math.round(n * 0.55);
    fxInit(); if (!fxCtx) return;
    const p = fxParticle();
    const W = innerWidth, H = innerHeight;
    const oy = originY == null ? H * 0.45 : originY;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (Math.random() * 0.7 + 0.5) * (power || 9);
      fxParts.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.5, y: oy + (Math.random() - 0.5) * 60,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - Math.random() * 5 - 2,
        r: Math.random() * 7 + 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        c: p.colors[(Math.random() * p.colors.length) | 0], sh: p.shape, life: 1,
      });
    }
    if (fxParts.length > 900) fxParts.splice(0, fxParts.length - 900);
    if (!fxRaf) fxRaf = requestAnimationFrame(fxStep);
  }
  /* 上から降りそそぐ（大当たり用） */
  function rain(n, ms) {
    if (S.set.fast) { n = Math.round(n * 0.5); ms = Math.round(ms * 0.6); }
    fxInit(); if (!fxCtx) return;
    const p = fxParticle(), W = innerWidth;
    const per = Math.max(1, Math.round(n / (ms / 60)));
    let t0 = now();
    const push = () => {
      for (let i = 0; i < per; i++) {
        fxParts.push({
          x: Math.random() * W, y: -20 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 2.4, vy: Math.random() * 3 + 2.6,
          r: Math.random() * 8 + 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.28,
          c: p.colors[(Math.random() * p.colors.length) | 0], sh: p.shape, life: 1, grav: 0.08,
        });
      }
      if (!fxRaf) fxRaf = requestAnimationFrame(fxStep);
      if (now() - t0 < ms) requestAnimationFrame(push);
    };
    push();
  }
  function drawShape(c, p) {
    c.fillStyle = p.c;
    if (p.sh === "coin") {
      c.beginPath(); c.ellipse(0, 0, p.r, p.r * Math.abs(Math.cos(p.rot)), 0, 0, 6.283); c.fill();
      c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 1.4; c.stroke();
    } else if (p.sh === "gem") {
      c.beginPath(); c.moveTo(0, -p.r); c.lineTo(p.r * .8, 0); c.lineTo(0, p.r); c.lineTo(-p.r * .8, 0); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.45)"; c.beginPath(); c.moveTo(0, -p.r); c.lineTo(p.r * .8, 0); c.lineTo(0, 0); c.closePath(); c.fill();
    } else if (p.sh === "petal") {
      c.beginPath(); c.ellipse(0, 0, p.r * .85, p.r * .5, 0.5, 0, 6.283); c.fill();
    } else {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        c[i ? "lineTo" : "moveTo"](Math.cos(a1) * p.r, Math.sin(a1) * p.r);
      }
      c.closePath(); c.fill();
    }
  }
  function fxStep() {
    fxRaf = 0;
    if (!fxCtx) return;
    fxCtx.clearRect(0, 0, innerWidth, innerHeight);
    const H = innerHeight;
    for (let i = fxParts.length - 1; i >= 0; i--) {
      const p = fxParts[i];
      p.vy += p.grav == null ? 0.42 : p.grav;
      p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > H + 60) { fxParts.splice(i, 1); continue; }
      fxCtx.save(); fxCtx.translate(p.x, p.y); fxCtx.rotate(p.rot);
      fxCtx.globalAlpha = Math.min(1, p.life);
      drawShape(fxCtx, p);
      fxCtx.restore();
    }
    if (fxParts.length) fxRaf = requestAnimationFrame(fxStep);
    else fxCtx.clearRect(0, 0, innerWidth, innerHeight);
  }

  /* ── カメラの揺れ ── */
  function shake(big) {
    if (!S.set.shake) return;
    const el = document.getElementById("mjApp"); if (!el) return;
    el.classList.remove("mj-shake", "big"); void el.offsetWidth;
    el.classList.add("mj-shake"); if (big) el.classList.add("big");
    setTimeout(() => el.classList.remove("mj-shake", "big"), big ? 1950 : 560);
  }
  /* ── スローモーション（画面のまわりを暗く落として1点に集中させる） ── */
  function slow(on) {
    const el = document.getElementById("mjSlow"); if (!el) return;
    el.classList.toggle("on", !!on);
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, S.set.fast ? Math.round(ms * 0.45) : ms));

  /* ── ジャックポットの全画面演出 ── */
  function jackpotShow(amount) {
    return new Promise((res) => {
      const el = document.getElementById("mjJpFx"); if (!el) return res();
      el.innerHTML = '<div class="rays"></div><div class="in">' +
        '<div class="k">PROGRESSIVE JACKPOT</div>' +
        '<div class="t">JACKPOT!!</div>' +
        '<div class="amt">+' + fmt(amount) + " XEVA</div>" +
        '<div class="sub">おめでとうございます！<br>積み上がっていたプールを、まるごと獲得しました。</div>' +
        '<button class="mj-btn" id="mjJpOk">受け取る</button></div>';
      el.classList.add("on");
      SFX.jp(); shake(true); rain(320, 3200);
      document.getElementById("mjJpOk").onclick = () => { el.classList.remove("on"); SFX.click(); res(); };
      setTimeout(() => { const b = document.getElementById("mjJpOk"); if (b) b.focus(); }, 300);
    });
  }

  /* ── 勝ち／負けの結果バナー ── */
  function result(o) {
    /* o = { win:bool, head, amount, desc, again:fn, close:fn } */
    return new Promise((res) => {
      const el = document.getElementById("mjRes"); if (!el) return res();
      el.innerHTML = '<div class="card ' + (o.win ? "win" : "lose") + '">' +
        '<div class="em">' + (o.emoji || (o.win ? "🎉" : "💧")) + "</div>" +
        '<div class="h">' + esc(o.head || (o.win ? "WIN" : "LOSE")) + "</div>" +
        (o.amount != null ? '<div class="amt">' + (o.win ? "+" : "") + fmt(o.amount) + "</div>" : "") +
        (o.desc ? '<div class="ds">' + o.desc + "</div>" : "") +
        '<div class="btns">' +
        '<button class="mj-btn ghost" data-v="close">やめる</button>' +
        '<button class="mj-btn" data-v="again">もう一度</button>' +
        "</div></div>";
      el.classList.add("on");
      if (o.win) { SFX.bigwin(); burst(o.amount > 5000 ? 150 : 70, 11); } else SFX.lose();
      el.querySelectorAll("[data-v]").forEach((b) => {
        b.onclick = () => { el.classList.remove("on"); SFX.click(); res(b.dataset.v); };
      });
    });
  }

  /* ══════════════════════════════════════════
     こまごま
     ══════════════════════════════════════════ */
  function fmt(n) { return Math.round(n || 0).toLocaleString("ja-JP"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function offline() { return navigator.onLine === false; }
  /* チュートリアルは1ゲームにつき1回だけ自動で出す */
  function tutorialSeen(id) { return !!S.set.tutorialDone[id]; }
  function tutorialMark(id) { S.set.tutorialDone[id] = now(); save(); }

  /* ベット額の選択肢（難易度＝リスクの大きさ） */
  const BETS = [100, 500, 2000, 10000, 50000];
  const RISK = [
    { id: "safe",  nm: "堅実",   ds: "配当の波は小さめ。長く遊べる", vol: 0.72 },
    { id: "std",   nm: "標準",   ds: "バランス型", vol: 1 },
    { id: "wild",  nm: "一発勝負", ds: "波が大きい。大当たりも大負けも", vol: 1.55 },
  ];

  /* ══════════════════════════════════════════
     公開
     ══════════════════════════════════════════ */
  window.MJ = {
    /* 定数 */
    BASE_RTP, JP_RATE, BETS, RISK, RTP_BAND, RTP_STEP,
    /* 本日の還元率（全ゲーム共通。dayMul() を自分の配当に掛ける） */
    dayRtp, dayMul, dayRtpInfo, dayLeftText, setDayRtp, rtpSheet, rtpLine,
    /* セーブ */
    get S() { return S; }, save, saveNow, load,
    /* 通貨 */
    xeva, gems, bet, payout, gemWin, gemSpend,
    /* 乱数 */
    rng, ri, pick, shuffle, weighted, chance,
    setRng: (f) => { _rngOverride = f; },
    /* ジャックポット（★ jackpotRoll は Promise を返す。必ず await すること） */
    JP_BOOST, jackpot, jackpotShared, jackpotState, jackpotRoll, jackpotForce, jackpotShow, jackpotWinners,
    /* 記録 */
    round, replays, g,
    /* ミッション・実績・称号 */
    rollPeriods, missions, claimMission, achList, checkAch, titles, setTitle, titleName,
    /* スキン */
    skins, shopSkins, buySkin, equipSkin, applySkins, fxParticle,
    /* 期間限定イベント */
    events, activeEvent, evTiers, evEp, claimEvTier, evTitles, evJpMul,
    /* 演出 */
    SFX, toast, dlg, alertBox, confirmBox, burst, rain, shake, slow, sleep, result,
    sheet, sheetClose, cutIn, CUT,
    /* こまごま */
    fmt, esc, offline, tutorialSeen, tutorialMark,
  };

  applySkins();
})();

/* ══════════════════════════════════════════════════════════════
   xeva-i18n-p4.js — XEVARION ポータルの英語辞書 ④（2026-09-06d の総ざらい）
     コミュニティ・キャラクター図鑑・キャラ詳細・ガチャの残り
   ★ キャラ詳細に出る「威力」まじりの一文は、MagiBurst の mb4 と<b>同じ考えかた</b>で
     かけら単位に置きかえる（characters.html も mb4 を読んでいる）。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  XevaI18n.addPatterns([
    [/^\+(\d+)限界突破$/, "+$1 limit break"],
    [/^🎴 (.+) さんのコレクション$/, function (s, n) { return "🎴 " + n + "'s collection"; }],
    [/^⚡ スキル (\d+)種（発動時ランダム）$/, "⚡ $1 skills (one at random when it triggers)"],
    [/^(\d+) 体（SSR (\d+)）— タップして見る$/, "$1 characters (SSR $2) — tap to view"],
    [/^(\d+) 体$/, "$1 characters"],
  ]);

  XevaI18n.add({
    /* ── コミュニティ ── */
    "プレイヤー一覧": "Player list",
    "まだプレイヤーがいません": "No players yet",
    "🔒 プレイヤー一覧は非公開です": "🔒 The player list is private",
    "🔓 一覧を表示する": "🔓 Show the list",
    "かくす": "Hide",
    "🔄 一覧を更新する": "🔄 Refresh the list",
    "🔍 検索する": "🔍 Search",
    "名前でしぼりこむ": "Filter by name",
    "アカウント名でフレンドを探す": "Find friends by account name",
    "例：Magi Master": "e.g. Magi Master",
    "フレンド申請": "Send a friend request",
    "MagiLink でメッセージ": "Message on MagiLink",
    "フレンドとチャット・グループ・コレクション共有": "Chat, groups and shared collections with friends",
    "🏆 ランキング": "🏆 Rankings",
    "今月の XEVA 獲得ランキング": "This month's XEVA earnings ranking",
    "MagiRanking を開く": "Open MagiRanking",
    "表彰台・MagiChainParty・MagiBattle スコアタの全ランキング":
      "Every ranking — the podium, MagiChainParty and MagiBattle time attack",
    "ホームへ戻る": "Back to home",
    "読み込めませんでした": "Could not load",
    "📴 オフライン中です。コミュニティは通信が必要なため利用できません。":
      "📴 You are offline. The community needs a connection, so it is unavailable.",

    /* ── キャラクター図鑑・詳細 ── */
    "キャラ名で検索（例：スズハ）": "Search by name (e.g. Suzuha)",
    "新しい順（No.の大きい順）": "Newest first (highest No.)",
    "所持しているキャラを先に": "Show characters you own first",
    "★限界突破MAX": "★ Limit break MAX",
    "アイコンに設定": "Use as your icon",
    "✓ アイコン設定中": "✓ Currently your icon",
    "✓ 設定中": "✓ In use",
    "評価（MagiBurst）": "Rating (MagiBurst)",
    "評価（MagiTier）": "Rating (MagiTier)",
    "⚔️ MagiBattle 性能": "⚔️ MagiBattle stats",
    "⚾ MagiDiamond 性能": "⚾ MagiDiamond stats",
    "✦ 必殺技": "✦ Special move",
    "サブリンク": "Sub-Link",

    /* ── よく出るアビリティ・スキルの一文 ── */
    "ダメージウォールを無効化する": "Nullifies Damage Walls",
    "地雷を回収し、敵ヒット時に1個消費して1.5倍攻撃":
      "Picks up mines; spends one on hitting an enemy for a ×1.5 attack",
    "チームHP50%以上のとき攻撃・スピード1.5倍":
      "×1.5 attack and speed while the team is above 50% HP",
    "自分のターン終了時、チームHPを5%回復": "Restores 5% of the team's HP at the end of your turn",

    /* ── 2026-09-06d のお知らせ・アップデート情報 ── */
    "新UIを黄・赤・黒・白に": "The new UI turns yellow, red, black and white",
    "構想案どおりの4色に。角は斜めに切った板、押すと沈んで黄色く光ります。タップの演出も中心から開く形に":
      "The four colours from your concept art. Corners are cut on the diagonal, panels sink and glow yellow when pressed, and the tap effect now opens out from the point you touched.",
    "MagiDiamond 大改修": "A major MagiDiamond overhaul",
    "バット型の照準と左右の相性／守備はステータスと守備配置で計算／球速を1球ごとに計測／作戦コマンド／検索と並び替え":
      "A bat-shaped cursor with platoon matchups, fielding worked out from ratings and your defensive alignment, velocity measured on every pitch, tactic commands, plus search and sorting",
    "重力バリアが見えない不具合を修正": "Fixed the invisible Gravity Barrier",
    "天界の審判と蓬莱だけ、バリアの半径に 1〜2px を渡していました（ほかは 105〜165px）。敵の絵に埋もれて見えなくなっていました":
      "Only the Celestial Judgment and Horai were passing a barrier radius of 1–2 px (everywhere else uses 105–165 px), so it was buried inside the enemy sprite and never visible.",
    "壁系ギミックは1クエストに1つ": "One wall gimmick per quest",
    "色や印で読ませる壁ギミックが重ならないようにしました。イベントのバナーも新しいものが必ず左に来ます":
      "Wall gimmicks that you read by colour or marking no longer overlap, and the newest event banner always sits leftmost.",
    "🎨 MagiBurst の新UIを構想案どおりの4色（白い紙・黒・黄・赤）に。押すと板が沈んで光ります":
      "🎨 MagiBurst's new UI now uses the four colours from your concept art (white paper, black, yellow, red). Panels sink and glow when pressed.",
    "✨ タップの演出を作り直し（前は右へ流れて画面のはしでは見えませんでした）":
      "✨ The tap effect has been rebuilt (it used to stream off to the right and vanish at the screen edge).",
    "⚾ MagiDiamond 大改修：バット型の照準と左右の相性／守備はステータスと守備配置で計算／球速を1球ごとに計測":
      "⚾ A major MagiDiamond overhaul: a bat-shaped cursor with platoon matchups, fielding worked out from ratings and alignment, and velocity measured on every pitch",
    "⚾ MagiDiamond：作戦コマンド（盗塁・エンドラン・スクイズ・待球）を移植し旧版を廃止／限界突破で能力も上昇":
      "⚾ MagiDiamond: the tactic commands (steal, hit and run, squeeze, take) have been ported over and the old version retired; limit breaks now raise ratings too",
    "⚾ MagiDiamond：キャラ一覧に検索・並び替え・絞り込み（はじめは番号の新しい順）／アイコンも新設":
      "⚾ MagiDiamond: search, sorting and filters on the character list (newest number first by default), plus a brand-new icon",
    "🔧 天界の審判で重力バリアが見えない不具合を修正（半径に 1〜2px を渡していました）":
      "🔧 Fixed the invisible Gravity Barrier in the Celestial Judgment (it was being given a radius of 1–2 px)",
    "🔧 敵のデバフの札を読みやすく。重力バリアや毒など見れば分かるものは出しません":
      "🔧 Enemy debuff tags are easier to read, and anything you can already see on the board (Gravity Barrier, poison) is no longer listed",
    "🔧 壁系ギミックが1クエストで重ならないように／イベントのバナーは新しいものが必ず左へ":
      "🔧 Wall gimmicks no longer overlap within a quest, and the newest event banner always sits leftmost",
    "🌐 英語版の訳し漏れを画面から機械的に集めて 1,000 件以上つぶしました":
      "🌐 Over 1,000 missing translations were gathered from the screens themselves and filled in",

    /* ── 古いお知らせの本文（残っていたもの） ── */
    "2026年5月28日時点で、TAKAGAMEにてゲームの進行に関するエラーの発生を確認しています。現在調査・改善中です。":
      "As of 28 May 2026 we have confirmed a progression bug in TAKAGAME. We are investigating and working on a fix.",
    "MagiOneシリーズのクイズ・学習アプリ「MagiLex」が正式リリース。あらゆるジャンルの問題を出題・学習できます。":
      "“MagiLex”, the MagiOne series' quiz and study app, is officially released. It can set and teach questions across every subject.",
    "MeruHubシリーズがいよいよ一般公開。学習・ゲームを融合した次世代ユーティリティエコシステムがここからスタート。":
      "The MeruHub series is now open to everyone — the start of a next-generation utility ecosystem that fuses study and games.",
    "NGX 公式サイトをリニューアルしました。製品ラインアップや提携情報をよりわかりやすくご覧いただけます。":
      "The NGX official site has been renewed, making the product line-up and partnership information easier to follow.",
    "TimeXを大幅リニューアル・改名した学習管理アプリ「StudyGuard」が正式リリース。":
      "“StudyGuard”, a major renewal and rename of TimeX, is officially released as a study management app.",
    "単語帳アプリ「WordbookX」が正式リリース。スマートな反復学習で言語習得を加速します。":
      "“WordbookX”, a flashcard app, is officially released — smart spaced repetition to speed up language learning.",
  });
})();

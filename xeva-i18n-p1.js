/* ══════════════════════════════════════════════════════════════
   xeva-i18n-p1.js — XEVARION ポータルの英語辞書 ①
     ミッション・設定・スケジュール・アカウント・ショップ・オフライン
   ──────────────────────────────────────────────────────────────
   ★ 集めかたは xeva-i18n-mb1.js の頭に書いたやりかたと同じ
     （<b>ひとまとまりの言葉</b>だけを DOM から拾う）。
   ★ 数の入る言いまわしは型（正規表現）で。ミッションの
     「No.103〜107 のSSR をすべて集める」はキャラが増えるたびに増えるので、
     1つずつ並べては<b>いけない</b>。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  var MON = ["January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"];
  var WD = { "日": "Sun", "月": "Mon", "火": "Tue", "水": "Wed", "木": "Thu", "金": "Fri", "土": "Sat" };

  XevaI18n.addPatterns([
    [/^No\.(\d+)〜(\d+) のSSR をすべて集める$/, "Collect every SSR from No.$1 to No.$2"],
    [/^(\d+) \/ 5 選択中$/, "$1 / 5 selected"],
    [/^(\d+)年 ?(\d+)月$/, function (m, y, mo) { return MON[+mo - 1] + " " + y; }],
    [/^(\d+)月にある予定（(\d+)件）$/, function (m, mo, n) { return "Scheduled in " + MON[+mo - 1] + " (" + n + ")"; }],
    [/^(\d+)月(\d+)日（(.)） ・ (.*)の予定$/, function (m, mo, d, w, tag) {
      return MON[+mo - 1] + " " + d + " (" + (WD[w] || w) + ") · " + (tag ? XevaI18n.t(tag.trim()) + " " : "") + "schedule";
    }],
    [/^(\d+)\/(\d+)\/(\d+) 実装$/, "Added $1-$2-$3"],
    [/^＋(\d+) ジェム$/, "+$1 gems"],
    [/^💎 (\d+) ジェムに交換する$/, "Exchange for 💎$1"],
    [/^上限いっぱい（💎(\d+)）にする$/, "Fill to the cap (💎$1)"],
    [/^(\d+) 件の更新をまとめて適用します$/, "$1 updates will be applied together"],
    [/^🚀 (\d+) 件のアップデート$/, "🚀 $1 updates"],
  ]);

  XevaI18n.add({
    /* ── ミッション ── */
    "XEVA ミッション": "XEVA missions",
    "XEVA 獲得！": "XEVA earned!",
    "XEVAの入手方法": "How to get XEVA",
    "✨ XEVA入手方法ガイド": "✨ Guide: how to get XEVA",
    "🎯 ミッションを見る": "🎯 See the missions",
    "スターター": "Starter",
    "限定": "Limited",
    "はじめてのガチャ": "Your first pull",
    "はじめてのSSR": "Your first SSR",
    "コレクター：10体そろえる": "Collector: gather 10 characters",
    "通算30日ログイン": "Log in on 30 days in total",
    "MagiLex：10コンテンツ完全習得": "MagiLex: fully master 10 courses",
    "MagiBurst：WAVE 50 到達": "MagiBurst: reach Wave 50",
    "アヤカを迎える：カホ・ナナ・レア・リノンを集める": "Welcome Ayaka: collect Kaho, Nana, Rea and Rinon",
    "アヤカ完凸：スターターミッション全達成": "Ayaka to max: clear every starter mission",
    "アヤカ覚醒①：ミオン・ココナ・マオ・アリサを集める": "Ayaka awakening ①: collect Mion, Kokona, Mao and Arisa",
    "アヤカ覚醒②：通算50日ログイン": "Ayaka awakening ②: log in on 50 days in total",
    "アヤカ覚醒③：MagiLex 20コンテンツ完全習得": "Ayaka awakening ③: fully master 20 MagiLex courses",
    "限定SSR「アヤカ」を完凸させよう": "Take the limited SSR “Ayaka” to max awakening",
    "ガチャを1回以上引いてみよう。": "Pull the gacha at least once.",
    "SSRキャラを1体 入手しよう。": "Get one SSR character.",
    "キャラクターを10体 集めよう（レアリティは問わない）。": "Collect 10 characters (any rarity).",
    "XEVARION に通算30日ログインしよう。": "Log in to XEVARION on 30 days in total.",
    "XEVARION に通算50日ログインしよう。今の日数はログインタブで確認できる。":
      "Log in to XEVARION on 50 days in total. You can check your current count on the Login tab.",
    "MagiLex でコンテンツを10個 完全習得しよう。30個そろえると限定SSR「ミズキ」が仲間になる。":
      "Fully master 10 MagiLex courses. Reach 30 and the limited SSR “Mizuki” joins you.",
    "MagiLex でコンテンツを20個 完全習得しよう（クイズ・単語帳のどちらも数えられる）。":
      "Fully master 20 MagiLex courses (both quizzes and flashcards count).",
    "MagiBurst のクエストで WAVE 50 まで到達しよう。": "Reach Wave 50 in a MagiBurst quest.",
    "SSR「カホ」「ナナ」「レア」「リノン」の4人をすべて集めると、ガチャには出ない限定SSR「アヤカ」が仲間になる。":
      "Collect all four SSRs — Kaho, Nana, Rea and Rinon — and the limited SSR “Ayaka”, who never appears in the gacha, joins you.",
    "SSR「ミオン」「ココナ」「マオ」「アリサ」の4人をすべて集めよう。MagiBurst と所持状況を共有しているので、どちらで引いても数えられる。":
      "Collect all four SSRs — Mion, Kokona, Mao and Arisa. Ownership is shared with MagiBurst, so pulls from either side count.",
    "スタータータブのミッションをすべて達成しよう。これで「アヤカ」が👑完凸になる。":
      "Clear every mission on the Starter tab to take “Ayaka” to 👑 max awakening.",
    "🎉 全部達成しました（アヤカ完凸の条件のひとつ）": "🎉 All cleared (one of the conditions for maxing Ayaka)",
    "👑 完凸ずみ！ 5つすべて達成しました。": "👑 Maxed out! All five are cleared.",
    "7日連続でボーナスアップ！週が明けると再スタート": "The bonus grows over 7 days in a row and resets when the week turns over",
    "受け取る": "Claim", "受け取る ✨": "Claim ✨", "✓ 受取済": "✓ Claimed", "✓ 受取済み": "✓ Claimed",
    "ログインボーナスを獲得しました": "You collected your login bonus",
    "所持 XEVA": "XEVA held", "いまの所持XEVA": "XEVA you hold now",
    "MagiLex で問題にチャレンジしよう": "Try a MagiLex question",
    "MagiBurst でクエストをクリアしよう": "Clear a MagiBurst quest",
    "MagiBattle でバトルに勝利しよう": "Win a battle in MagiBattle",
    "MagiTier で Tier表をつくってみよう": "Make a tier list in MagiTier",
    "MagiLink に登録して友達とつながろう": "Sign up for MagiLink and connect with friends",
    "MagiMusic で1曲さいせいしてみよう": "Play a track in MagiMusic",
    "MagiCraft でブロックを掘ってみよう": "Dig a block in MagiCraft",
    "MagiManor で洋館を探索しよう": "Explore the manor in MagiManor",
    "MagiEmpire で国盗り対戦をしよう": "Play a conquest match in MagiEmpire",
    "MagiChainParty で対戦してみよう": "Play a match in MagiChainParty",
    "MagiDiamond で読み合い野球盤を遊ぼう": "Play a round of mind-games baseball in MagiDiamond",
    "MagiArena で1台対戦をあそぼう": "Play a same-device match in MagiArena",
    "MagiJackpot でゲームを1回プレイしよう": "Play one game in MagiJackpot",
    "MagiFocus で集中セッションを完了しよう": "Finish a focus session in MagiFocus",
    "MagiPortfolio に銘柄を追加しよう": "Add a stock in MagiPortfolio",
    "MagiRanking で今月の順位を見てみよう": "Check this month's ranking in MagiRanking",
    "Magi Lotto でくじを1枚買ってみよう": "Buy one ticket in Magi Lotto",
    "XEVYNAR に質問してみよう": "Ask XEVYNAR a question",

    /* ── 設定 ── */
    "⚙️ 設定": "⚙️ Settings",
    "システム": "System", "システム情報": "System info", "データの版": "Data version",
    "表示": "Display", "表示のしかた": "How things are shown", "テーマ": "Theme",
    "☀️ ライト": "☀️ Light", "🌙 ダーク": "🌙 Dark", "⚙️ 端末にあわせる": "⚙️ Match the device",
    "文字の大きさ": "Text size", "小": "Small", "標準": "Normal", "大": "Large",
    "通信の設定": "Network settings", "通信・保存領域": "Network and storage",
    "通知・お知らせ": "Notifications", "保存領域": "Storage", "同期": "Sync",
    "いまの回線": "Current connection", "📶 Wi-Fi のとき": "📶 On Wi-Fi", "📱 モバイルデータのとき": "📱 On mobile data",
    "モバイル": "Mobile", "ブラウザ": "Browser", "アプリの数": "Number of apps",
    "📴 オフライン・通信設定": "📴 Offline and network settings",
    "オフラインで遊べるアプリ": "Apps you can use offline",
    "オフライン用にダウンロード": "Download for offline use",
    "⬇ もう一度ダウンロードし直す": "⬇ Download again",
    "インストールする": "Install", "📲 アプリとして使えます": "📲 You can install this as an app",
    "Wi-Fi での更新をおすすめします。更新するとオフラインでも最新版で遊べます。":
      "We recommend updating over Wi-Fi. Once updated, you can play the latest version offline.",
    "「あとで」を押したらどうなる？": "What happens if I tap “Later”?",
    "「約 ○○ MB」と出るのに、実際はもっと少ないのはなぜ？": "Why is the real download smaller than the “about ○○ MB” it shows?",
    "ギガ（通信量）が心配。モバイル回線でも大丈夫？": "I'm worried about data. Is mobile data all right?",
    "セーブデータが消えたりしない？": "Could my save data be lost?",
    "ダウンロードしたのに、機内モードで開けない": "I downloaded it, but it won't open in airplane mode",
    "更新を何回か見送ったら、そのぶん重くなる？": "If I skip a few updates, does the next one get bigger?",
    "あとで": "Later", "あとで（設定からいつでも追加できます）": "Later (you can add it from Settings any time)",
    "今後は表示しない（設定から戻せます）": "Don't show this again (you can undo it in Settings)",
    "次の更新まで自動表示しない": "Don't show automatically until the next update",
    "わかりました": "Got it", "確認中… 0%": "Checking… 0%", "エラー": "Error",
    "Xevion OS の設定を初期状態に戻す": "Reset Xevion OS settings to their defaults",
    "🪐 Xevion OS": "🪐 Xevion OS",
    "初期の並びに戻す": "Restore the original order",
    "↕️ アプリの並び替え": "↕️ Reorder the apps",
    "新しい順": "Newest first",
    "🧩 すべてのアプリ": "🧩 All apps", "🧩 アプリ一覧": "🧩 App list",
    "その他のアプリ": "Other apps",
    "🎮 ゲーム": "🎮 Games", "📚 学習": "📚 Study", "📊 情報・ツール": "📊 Info and tools",
    "💬 つながる": "💬 Connect", "🏪 店舗・公式": "🏪 Stores and official sites",
    "🛡 管理画面": "🛡 Admin", "管理画面へ進む": "Go to the admin screen",
    "🗓 スケジュール": "🗓 Schedule", "📬 メールボックス": "📬 Mailbox",
    "🔑 CDKコード交換": "🔑 Redeem a CDK code",
    "特典コードを入力すると、限定キャラクターを受け取れます。": "Enter a bonus code to receive a limited character.",
    "メールボックスに送信しました！": "Sent to your mailbox!",
    "以前の更新": "Earlier updates", "お知らせ & 更新情報": "News and update notes",
    "NEW — 前回から更新": "NEW — updated since last time",
    "リリース": "Release", "更新": "Update", "終了": "Ended", "プレ版": "Preview",
    "XEVARION について": "About XEVARION", "XEVARIONへ →": "To XEVARION →",
    "← 戻る": "← Back", "次へ →": "Next →", "保存する": "Save", "変更する": "Change",
    "設定する": "Set", "交換する": "Exchange", "この順番で保存": "Save this order",
    "ロックを解除": "Unlock", "🔄 終わるときは「🏠ホームへ戻る」": "🔄 When you're done, tap “🏠 Back to home”",

    /* ── アカウント ── */
    "アカウント登録": "Create an account",
    "ようこそ！": "Welcome!",
    "表示名を入力": "Enter a display name",
    "XEVARION 全体で使われる名前です（最大20文字）": "This name is used everywhere in XEVARION (up to 20 characters)",
    "後から変更できます。同じ名前は全端末で1つだけ使えます。": "You can change it later. Each name can only be used by one account.",
    "パスワードを設定": "Set a password",
    "パスワードを入力してください": "Please enter your password",
    "4桁の番号": "4-digit number", "4桁の番号を設定": "Set a 4-digit number",
    "1台のiPadで遊ぶときの本人確認": "Identity check when several people share one iPad",
    "ゲーム中に1台のiPadでアカウントを紐づけるときの本人確認に使います":
      "Used to confirm who you are when linking your account on a shared iPad during play",
    "この番号でゲーム中にアカウントを紐づけ、順位に応じた XEVA 賞金を受け取れます。":
      "Use this number to link your account during play and collect XEVA prizes based on your rank.",
    "順位に応じた XEVA 賞金の受け取り": "Collect XEVA prizes based on your rank",
    "生年月日を設定": "Set your date of birth",
    "誕生日おめでとうメッセージなどに使います": "Used for birthday messages and the like",
    "入力は任意です。そのまま「次へ」でスキップできます。": "This is optional — tap “Next” to skip it.",
    "入力は任意です。空欄のまま「次へ」でスキップできます。": "This is optional — leave it blank and tap “Next” to skip it.",
    "アイコンを選ぶ": "Choose an icon", "アイコンを変更": "Change icon",
    "XEVARION 全体であなたを表すキャラクターです": "This character represents you across XEVARION",
    "所持しているキャラから選べます": "You can choose from the characters you own",
    "アイコンにできるのは所持しているキャラだけです。ガチャで増えたら、あとから設定でいつでも変更できます":
      "Only characters you own can be used as your icon. Once you pull more, you can change it in Settings at any time.",
    "🌟 お気に入りキャラ": "🌟 Favourite characters",
    "ショーケースを選ぶ": "Choose your showcase",
    "所持キャラから最大5体": "Up to 5 from the characters you own",
    "この5体に設定": "Use these five",
    "ホームに表示中": "Shown on your home screen",
    "MagiLink の「コレクション」・コミュニティのプロフィールにも同じ内容が出ます":
      "The same set appears in your MagiLink “Collection” and on your community profile",
    "設定するとポータルを開くたびにロック確認が入ります": "Once set, the portal asks you to unlock it each time you open it",
    "この端末からログアウトします。次回は表示名＋4桁PINで再ログインできます（データはクラウドに保存されています）":
      "This signs you out on this device. Next time you can sign back in with your display name and 4-digit PIN — your data stays in the cloud.",
    "削除するとXEVAウォレット・ガチャデータを除くすべての設定が消去されます":
      "Deleting your account erases every setting except your XEVA wallet and gacha data",
    "✓ 登録する": "✓ Register",

    /* ── ショップ・ジェム・スタミナ ── */
    "🏪 ジェム変換所をひらく": "🏪 Open the gem exchange",
    "🛒 パックストアを見る": "🛒 Browse the pack store",
    "🛒 パックストアでジェムを増やす": "🛒 Get more gems in the pack store",
    "ジェムが XEVARION 共通の通貨になりました": "Gems are now a currency shared across XEVARION",
    "スタミナ": "Stamina",
    "2 で +50 回復する": "Restore +50 for 2",
    "アプリを閉じているあいだも回復します（上限まで）。": "Stamina keeps recovering while the app is closed (up to the cap).",

    /* ── イベント・配布 ── */
    "✨ 新キャラクター登場！": "✨ New characters have arrived!",
    "MagiBurst 実装記念 配布": "MagiBurst launch gift",
    "アップデート記念 配布（12,000 XEVA）": "Update gift (12,000 XEVA)",
    "アップデート記念 配布（6,000 XEVA ＋ 🎫20枚）": "Update gift (6,000 XEVA + 🎫20)",
    "サマーキャンペーン 配布（6,000 XEVA）": "Summer campaign gift (6,000 XEVA)",
    "夏キャンペーン 配布（🎫ガチャチケット30枚）": "Summer campaign gift (30 🎫 gacha tickets)",
    "夏期間応援プレゼント（MagiBurst）": "Summer support gift (MagiBurst)",
    "大型アップデート記念 配布（🎫フェスチケット70枚）": "Major update gift (70 🎫 fest tickets)",
    "新チケット「ガチャチケット」配布（🎫20枚）": "New “gacha ticket” gift (🎫20)",
    "ホーム画面リニューアル記念 配布": "Home screen renewal gift",
    "幽冥の庭園 実装記念プレゼント（MagiBurst）": "Garden of the Nether launch gift (MagiBurst)",
    "EX降臨キャラ 所持リセットのお詫び（MagiBurst）": "Apology for the EX descent ownership reset (MagiBurst)",
    "🛠️ 緊急メンテナンスのお詫びとして 6,000 XEVA を配布": "6,000 XEVA sent as an apology for the emergency maintenance",
    "MagiLex 英単語コンプリート特典「アリサ」配布終了": "The MagiLex vocabulary completion reward “Arisa” is no longer given out",
    "MagiLex の獲得XEVA ×2！（10/31まで延長）": "Double XEVA from MagiLex! (extended to 31 October)",
    "常時開催": "Always running",
    "常時開催。限定SSR 7体——アビリティ10個・アンナ(祭) は MagiBurst 史上最強":
      "Always running. Seven limited SSRs — ten abilities each, and Anna (Fest) is the strongest character in MagiBurst's history.",
    "常時開催（毎月1〜10日）。限定SSR「ヒナノ」＋新登場「ハノン」——バスケの乱打110連で史上最大の火力":
      "Always running (1st–10th each month). Limited SSR “Hinano” plus newcomer “Hanon” — a 110-hit basketball barrage for the biggest damage yet.",
    "常時開催（毎月11〜20日）。限定SSR「コトリ」——バスケの乱打48連＋スラムダンクで史上最大の火力":
      "Always running (11th–20th each month). Limited SSR “Kotori” — a 48-hit basketball barrage plus a slam dunk for the biggest damage yet.",
    "常時開催（毎月21日〜末日）。限定SSR「ムツミ」＋新登場「レイナ」——史上最大火力のフルバースト":
      "Always running (21st–end of month). Limited SSR “Mutsumi” plus newcomer “Reina” — the strongest Full Burst yet.",
    "終わったフェスの限定SSRを引き直せる常設ガチャ。属性ごとに1体ずつピックアップ":
      "A permanent gacha where you can pull limited SSRs from past fests — one featured character per element.",
    "星の学園の限定SSR 5体が排出中！ 蓬莱の九重向けのアンチ2種持ち":
      "Five limited SSRs from the Star Academy are available, each with two anti abilities for the Nine Layers of Horai.",
    "星の学園 2期生の限定SSR 5体が参戦！ 蓬莱の手薄い階層を埋める面々":
      "Five limited SSRs from the Star Academy's second year join — the pieces that fill Horai's thinnest floors.",
    "限定SSR が 8体 に！ 第2弾（シズル・ユウリ・ヒスイ・ライカ）は第1弾と同じクエストを担当し、撃種が逆":
      "Now eight limited SSRs! The second wave (Shizuru, Yuuri, Hisui, Raika) covers the same quests as the first, with the opposite shot type.",
    "第一〜第十の審判。ボスは天律族アストレア。蓬莱の最奥より難しく、第六からは弱点がまんなか（貫通でしか殴れない）":
      "The First through Tenth Judgment. The boss is Astraea of the Lawbringers. Harder than the deepest floor of Horai, and from the Sixth on the weak point sits in the centre — only piercing shots can reach it.",
    "第一〜第十をはじめから。ギミックはWAVEごとに出しわけ、ザコとボスのHPも上げました":
      "All ten Judgments are open from the start. Gimmicks are dealt out wave by wave, and both minion and boss HP have been raised.",
    "LOCAL PLAY（近くの人と）": "LOCAL PLAY (with people nearby)",
    "サーバーもWi-Fiルーターも使わず、コードかQRで最大4人。Room Code・参加者・Player 01〜04 の専用画面にしました":
      "Up to four players with a code or a QR — no game server and no Wi-Fi router required. It now has its own screen with the Room Code, the player count and Player 01–04.",
    "MagiBurst の新UI": "MagiBurst's new look",
    "深い紫紺と斜めに切った板の、スタイリッシュな見た目に。メニューの「UI デザイン」で旧UIにも戻せます":
      "A sharper look built from deep indigo and angled panels. You can switch back to the old design from “UI design” in the menu.",
    "属性の呼び名が変わりました": "The elements have new names",
    "火→IGNIS ／ 水→AQUA ／ 木→VERDE ／ 光→LUMEN ／ 闇→UMBRA":
      "Fire → IGNIS / Water → AQUA / Wood → VERDE / Light → LUMEN / Dark → UMBRA",
    "天界の審判をぜんぶ開放": "Every Celestial Judgment is open",
    "英語版をひろげました": "The English version now covers more",
    "初回起動時と設定からいつでも。開始画面・ホーム・ガチャ・MagiBurst が English になります":
      "On first launch and from Settings at any time. The start screen, home, gacha and MagiBurst all switch to English.",
    "開始画面・ログイン・ホーム・ガチャ・MagiBurst のクエストやショップまで。MagiBurst のメニューからも切りかえられます":
      "The start screen, sign-in, home, gacha and MagiBurst's quests and shop are all covered. You can also switch from MagiBurst's own menu.",
    "ホームとガチャの整理": "Home and gacha tidy-up",
    "ガチャの通貨表示を1列に／AI を廃止／下のショップ欄を廃止（上のバーへ）／MagiDiamond をホームへ":
      "The gacha currency row is now a single line, the AI assistant is gone, the shop panel at the bottom has moved to the top bar, and MagiDiamond has moved onto the home screen.",
    "スケジュールとメールのあいだに新設。ジェム変換所・パックストア・結晶交換所の3つの売り場をここから":
      "A new button between Schedule and Mail, leading to all three counters: the gem exchange, the pack store and the crystal exchange.",
    "XEVAガチャと MagiBurst の<b>両方</b>を数えるようにしました。アカウント設定・MagiLink・コミュニティで同じ内容が見られます":
      "Both the XEVA gacha and MagiBurst now count towards it. The same collection appears in your account settings, MagiLink and the community.",
    "XEVARION のホーム・ガチャ・MagiBurst に反映されます": "This applies to the XEVARION home, the gacha and MagiBurst",
    "🎯 弱点を上下左右＋まんなかに置けるように（まんなかは貫通でしか殴れない内部弱点）":
      "🎯 Weak points can now sit on any side or in the centre (a centre weak point is an inner one, reachable only by piercing shots)",
    "引っぱり・ショット・敵にふれた瞬間を、斜めの帯と集中線でそろえました。敵のデバフも盤面に出ます":
      "Pulling back, firing and the moment you hit an enemy now share the same angled bands and speed lines. Enemy debuffs are shown on the board too.",
  });
})();

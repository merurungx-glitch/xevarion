/* ══════════════════════════════════════════════════════════════
   xeva-i18n-md1.js — MagiDiamond の英語辞書
   ──────────────────────────────────────────────────────────────
   ★★ 2026-09-06 ご指定「MagiDiamond も全ての画面で英語対応」。
   ★ 野球の言葉は<b>英語の野球で使う言いかた</b>にそろえる
     （ミート＝Contact、パワー＝Power、弾道＝Trajectory、球威＝Stuff …）。
   ★ 数字が入るものは型（正規表現）で。選手が増えても効くようにする。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  XevaI18n.addPatterns([
    [/^Lv\.(\d+)$/, "Lv.$1"],
    [/^Lv\.(\d+) (右打|左打|両打|右投|左投)$/, function (s, lv, h) { return "Lv." + lv + " " + XevaI18n.t(h); }],
    [/^(\d+) 人$/, "$1 players"],
    [/^(\d+)回(表|裏)$/, function (s, n, t) { return (t === "表" ? "Top " : "Bottom ") + n; }],
    [/^スタミナ (\d+) \/ (\d+)$/, "Stamina $1 / $2"],
    [/^部屋 (.+)$/, "Room $1"],
    [/^守備配置：(.+)$/, function (s, n) { return "Defence: " + XevaI18n.t(n); }],
    [/^弾道 (★+)$/, "Trajectory $1"],
    [/^走者：(.+)$/, function (s, n) { return "Runners: " + XevaI18n.t(n); }],
    [/^(\d+) 人 ／ (.+)$/, function (s, n, o) { return n + " players / " + XevaI18n.t(o); }],
    [/^所持 (\d+)$/, "Owned $1"],
    [/^チーム総合力 ([\d,]+)$/, "Team rating $1"],
    [/^TP を (\d+) もらえます$/, "You get $1 TP"],
    [/^TP を (\d+) もらえます（まとめてお得）$/, "You get $1 TP (better value in bulk)"],
    [/^コインを (\d+) もらえます$/, "You get $1 coins"],
    [/^次の (\w+) まであと ([\d,]+) pt[\s\S]*?／ (\d+)勝 (\d+)敗$/,
      "$2 pt to $1 · $3 W $4 L"],
  ]);

  XevaI18n.add({
    /* ── 画面の名前・下のタブ ── */
    "対戦": "Match", "キャラクター": "Characters", "チーム編成": "Team", "ショップ": "Shop",
    "ミッション": "Missions", "ランク": "Ranked",
    "版をえらぶ": "Choose a version",
    "集めたキャラクターで、野球を極めろ。": "Master baseball with the characters you have collected.",
    "XEVARION へもどる": "Back to XEVARION",
    "↩ XEVARION へもどる": "↩ Back to XEVARION",
    "← XEVARION へもどる": "← Back to XEVARION",

    /* ── ホーム ── */
    "CPU戦をすぐ始める": "Start a CPU game now",
    "ランク戦": "Ranked", "クイックマッチ": "Quick match", "フレンドマッチ": "Friend match",
    "イベント": "Events", "キャラ一覧": "Character list",
    "近くの人と": "Nearby players",
    "📶 LOCAL PLAY をひらく": "📶 Open LOCAL PLAY",
    "📶 LOCAL PLAY（近くの人と）": "📶 LOCAL PLAY (with people nearby)",
    "CPU戦": "vs CPU", "クイック": "Quick", "フレンド": "Friend",
    "🤖 CPU戦": "🤖 vs CPU", "🌐 オンライン": "🌐 Online", "🎪 イベント": "🎪 Events",

    /* ── 試合の設定 ── */
    "⚙ 試合の設定": "⚙ Match settings",
    "イニング数": "Innings", "球場": "Stadium", "相手の強さ": "Opponent strength",
    "3回制・約5分": "3 innings, about 5 min",
    "5回制・約8分": "5 innings, about 8 min",
    "9回制・本格": "9 innings, the full thing",
    "やさしい": "Easy", "ふつう": "Normal", "つよい": "Hard",
    "はじめて向け": "For your first games", "腕だめし": "A fair test", "本気の相手": "A serious opponent",
    "標準": "Standard", "外野が広い": "Deep outfield", "外野がせまい": "Short outfield",
    "フェンスが高い": "High fences", "内野が速い": "Fast infield",
    "▶ 試合開始": "▶ Start the game",
    "部屋を作る": "Create a room", "部屋に入る": "Join a room", "CPUと練習": "Practise vs CPU",
    "退出する": "Leave",
    "📊 これまでの成績": "📊 Your record",
    "試合": "Games", "勝": "W", "敗": "L", "分": "D", "安打": "H", "本塁打": "HR", "奪三振": "K",
    "⚠ チームが未完成です": "⚠ Your team is not ready",
    "⚡ おまかせ編成": "⚡ Auto-build", "編成画面へ": "Go to the team screen",

    /* ── 試合中 ── */
    "じぶん": "You", "あいて": "Opponent",
    "やめる": "Quit", "つづける": "Keep playing", "中断する": "Quit the game",
    "試合を中断しますか？": "Quit this game?",
    "試合を中断しました": "You quit the game",
    "投球開始": "Pitch", "構える": "Get set", "見送る": "Take",
    "ミート重視": "Contact", "強振": "Power swing", "バント": "Bunt",
    "焦点が広い": "A wider sweet spot", "焦点は狭いが飛ぶ": "Smaller sweet spot, more carry", "送る": "Move the runner up",
    "球種": "Pitch type", "コース": "Location",
    "作戦": "Tactic", "守備": "Defence",
    "盗塁": "Steal", "エンドラン": "Hit and run", "スクイズ": "Squeeze", "待球": "Take the pitch",
    "定位置": "Standard", "前進守備": "Infield in", "深めの守備": "Outfield back",
    "左へ寄せる": "Shift left", "右へ寄せる": "Shift right",
    "ゲッツーシフト": "Double-play shift", "バント警戒": "Bunt defence",
    "ふつうの守り": "The standard set-up",
    "送球先をえらんでください": "Choose where to throw",
    "一塁": "1st", "二塁": "2nd", "三塁": "3rd", "本塁": "Home",
    "打者走者をアウトに": "Get the batter out",
    "封殺（ダブルプレーねらい）": "Force out (going for two)",
    "先の走者を止める": "Stop the lead runner",
    "得点を防ぐ": "Keep the run off the board",
    "守備力": "Fielding", "走った距離": "Distance covered", "打球": "Batted ball", "成功率": "Success rate",
    "強烈": "Scorched", "速い": "Hard", "弱い": "Soft",
    "つかう": "Use",
    "追いついた！": "got there!",
    "なし": "none",

    /* ── 選手データ ── */
    "選手データ": "Player data", "えらぶ": "Choose",
    "打撃・走塁・守備": "Batting, running and fielding",
    "ミート": "Contact", "パワー": "Power", "走力": "Speed", "肩力": "Arm", "捕球": "Glove",
    "球速": "Velocity", "球威": "Stuff", "制球": "Control", "スタミナ": "Stamina",
    "変化量": "Break", "精神力": "Composure",
    "右打": "Bats R", "左打": "Bats L", "両打": "Switch", "右投": "Throws R", "左投": "Throws L",
    "投手": "Pitcher", "捕手": "Catcher", "一塁手": "1B", "二塁手": "2B", "三塁手": "3B",
    "遊撃手": "SS", "左翼手": "LF", "中堅手": "CF", "右翼手": "RF",
    "野手": "Fielder",
    "パワーヒッター": "Power hitter", "アベレージヒッター": "Contact hitter",
    "リードオフ": "Leadoff", "剛速球": "Flamethrower", "技巧派": "Crafty", "変化球": "Breaking ball",
    "オールラウンド": "All-rounder",
    "まとめてレベルアップ": "Level up in bulk",
    "限界突破": "Limit break", "覚醒": "Awakening",
    "🔍 名前・ポジション・左右でさがす": "🔍 Search by name, position or handedness",
    "名前・ポジション・左右でさがす": "Search by name, position or handedness",
    "↕ 並び替え": "↕ Sort",
    "番号の新しい順": "Newest number first", "番号の古い順": "Oldest number first",
    "総合力の高い順": "Highest overall", "レベルの高い順": "Highest level",
    "ミートの高い順": "Highest contact", "パワーの高い順": "Highest power",
    "走力の高い順": "Fastest", "球速の速い順": "Hardest thrower", "名前順": "By name",
    "所持": "Owned", "すべて": "All", "絞り込み解除": "Clear filters",
    "捕": "C", "一塁": "1B", "二塁": "2B", "三塁": "3B", "遊撃": "SS",
    "左翼": "LF", "中堅": "CF", "右翼": "RF",
    "見つかりませんでした。": "Nothing matched.",

    /* ── ミッション・ショップ ── */
    "デイリー": "Daily", "ウィークリー": "Weekly", "達成": "Cleared",
    "受け取る": "Claim", "受取済み": "Claimed",
    "プレイヤー": "Player",

    /* ── 2026-09-06 総ざらいで残っていたもの ── */
    "打順": "Batting order", "選手": "Players", "走者": "Runners", "投": "P",
    "🪑 ベンチ": "🪑 Bench", "＋ 投手を足す": "+ Add a pitcher",
    "走力・ミート順に並べ替え": "Sort by speed and contact",
    "リセット": "Reset", "足りません": "Not enough", "未達成": "Not cleared",
    "試合へ ›": "To the match ›",
    "必要ポイント": "Points needed",
    "👑 いまのランク": "👑 Your rank",
    "🏅 ランクのしくみ": "🏅 How ranking works",
    "🎁 シーズン報酬": "🎁 Season reward",
    "📘 このゲームについて": "📘 About this game",
    "🛒 ショップ": "🛒 Shop",
    "試合をすると自動で進みます。受け取ると Gold と TP がもらえます。":
      "These fill in as you play. Claim them for Gold and TP.",
    "くせのない標準の球場。ドームなので風の影響もない":
      "A plain, standard park. It is domed, so there is no wind.",
    "ホームランのときの花火が豪華になります（見た目だけ）":
      "Makes the home-run fireworks grander (looks only).",
    "打った瞬間の光が派手になります（見た目だけ）":
      "Makes the flash at contact flashier (looks only).",
    "投げた球に軌跡が出ます（見た目だけ）":
      "Gives the pitch a visible trail (looks only).",

    /* ── 選手データの中身 ── */
    "能力": "Ratings", "使いかた": "How to use", "投球": "Pitching",
    "ポジション適性": "Position ratings", "固有スキル": "Special skills",
    "この選手の使いどころ": "Where this player shines",
    "投げても打てる二刀流タイプです。": "A two-way player who can both pitch and hit.",
    "チームに入れる": "Add to your team",
    "スタメンに入れる": "Put in the starting nine",
    "ベンチに入れる": "Put on the bench",
    "投手陣に入れる": "Add to the pitching staff",
    "上げられるだけ": "As far as it will go",
    "限界突破する": "Limit break", "覚醒する": "Awaken",
    "レベル上限": "Level cap", "全能力への上乗せ": "Bonus to every rating", "弾道": "Trajectory",
    "👑 限界突破MAX です。": "👑 Limit break is maxed out.",
    "この選手の限界突破は XEVARION（MagiBurst）のものをそのまま使います。":
      "This player's limit break is taken straight from XEVARION (MagiBurst).",
    "MagiDiamond の中で上げることはできません。": "It cannot be raised inside MagiDiamond.",
    "限界突破は XEVARION（MagiBurst）のものをそのまま使います":
      "Limit breaks come straight from XEVARION (MagiBurst)",
    "レベルアップ": "Level up", "能力を伸ばす": "Raise a rating", "総合力": "Overall",
    "全能力が +3 され、カードの見た目が変わります。":
      "Every rating goes up by 3, and the card changes its look.",
    "覚醒！ 全能力が上がりました": "Awakened! Every rating went up",
    "編成画面の「おまかせ編成」でも自動で選ばれますが、ここから直接この選手のポジションを決めることもできます。":
      "Auto-build on the team screen picks players for you, but you can also set this player's position from here.",
    "トレーニングポイント（TP）で、好きな能力を1つずつ伸ばせます（1ポイント = 15 TP・1つの能力につき +20 まで）。":
      "Spend training points (TP) to raise any single rating (1 point = 15 TP, up to +20 per rating).",
  });

  XevaI18n.addPatterns([
    /* ★ 「／」の前後に空白が入る形（No.1 ／ バランス型 ／ 二刀流向き）。
       ここは<b>空白を許す</b>ように書くこと。前は詰まった形しか拾えず、そのまま日本語で残っていた。 */
    [/^No\.(\d+)\s*／\s*(.+?)型\s*／\s*(.+?)向き$/, function (s, no, a, b) {
      return "No." + no + " / " + XevaI18n.t(a + "型") + " / suited to " + XevaI18n.t(b);
    }],
    [/^Gold を使ってレベルを上げます（1レベル ([\d,]+) Gold）。[\s\S]*$/,
      "Spend Gold to raise the level ($1 Gold per level). Every rating grows a little with each level."],
    [/^([\d,]+) Gold と、XEVARION の限界突破 (\d+) 以上が必要です。$/,
      "Needs $1 Gold and a XEVARION limit break of $2 or more."],
    [/^チーム総合力 ([\d,]+)$/, "Team rating $1"],
  ]);
  XevaI18n.add({
    "バランス型": "Balanced", "パワー型": "Power", "技巧型": "Technique", "走塁型": "Speed",
    "二刀流": "two-way play", "野手": "position play", "投手": "pitching",
  });
})();

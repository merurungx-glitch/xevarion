/* ══════════════════════════════════════════════════════════════
   xeva-i18n-mb1.js — MagiBurst の英語辞書 ①
     画面の言葉・ボタン・ギミック名・クエスト名・遊びかた
   ──────────────────────────────────────────────────────────────
   ★★ 2026-09-06 訳し漏れの探しかた（これが要点）
     ブラウザで、いま画面にある日本語のうち<b>ひとまとまりの言葉</b>だけを集める。
       ・テキストノードをたどる
       ・いちばん近い「かたまり（block）」の中身が<b>その文字だけ</b>のものを拾う
         （<b>…</b> で割れた文の断片は、単語単位では訳せないので捨てる）
       ・XevaI18n.t(k) === k のもの＝まだ辞書に無いもの
     こうすると 4,499 個 → <b>793 個</b>に絞れて、全部つぶせる。
     ★ XevaI18n.missing() をそのまま使うと、<b>文の断片</b>（「は、」「なら」）まで
       拾ってしまって収拾がつかない。かならず上の絞り込みを通すこと。

   ★ 数字が入る言葉（クエスト名・威力）は<b>型（正規表現）</b>で拾う。
     1つずつ並べると、クエストやキャラが増えるたびに増えてしまうため。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  /* ── 型で拾うもの（先に DICT を見て、無ければこちら） ── */
  XevaI18n.addPatterns([
    /* 黄昏の王城／迷宮／深層 */
    [/^第(\d+)の間（★(\d+)）$/, "Chamber $1 (★$2)"],
    [/^第(\d+)の間（★EX(\d+)）$/, "Chamber $1 (★EX$2)"],
    [/^第(\d+)の間（★深(\d+)）$/, "Chamber $1 (★Deep $2)"],
    [/^第(\d+)の間（★迷(\d+)）$/, "Chamber $1 (★Maze $2)"],
    [/^第(\d+)の間（★中(\d+)）$/, "Chamber $1 (★Mid $2)"],
    /* 幽冥の庭園 */
    [/^第(\d+)ノ園（★幽(\d+)）$/, "Garden $1 (★Nether $2)"],
    /* 図鑑の「（未加入）」。★ 中の<b>名前も訳す</b>ので、置きかえ先は関数にする
       （文字列の "$1" だと日本語の名前がそのまま残ってしまう）。 */
    [/^(.+)（未加入）$/, function (m, nm) { return XevaI18n.t(nm) + " (not owned)"; }],
    [/^└ (.+)$/, function (m, nm) { return "└ " + XevaI18n.t(nm); }],
    [/^(.+)（SSR ガチャ限定）$/, function (m, nm) { return XevaI18n.t(nm) + " (SSR, gacha only)"; }],
    /* レベル表示 */
    [/^Lv\.(\d+) \/ (\d+) 超越$/, "Lv.$1 / $2 Transcend"],
    /* フェス・ガチャの「に登場中」 */
    [/^(.+) に登場中$/, "Now in $1"],
  ]);

  XevaI18n.add({
    /* ── 上下のバー・タブ・大きなボタン ── */
    "中断": "Quit",
    "状態": "Status",
    "コピー": "Copy",
    "編集": "Edit",
    "未達成": "Not cleared",
    "達成": "Cleared",
    "デイリー": "Daily",
    "ウィークリー": "Weekly",
    "部屋をつくる": "Create room",
    "部屋に入る": "Join room",
    "スタミナを回復する": "Restore stamina",
    "💎2 で回復する": "Restore for 💎2",
    "この端末からログアウトする": "Sign out on this device",
    "別のアカウントでログインする": "Sign in with another account",
    "クラウドに保存中": "Saving to the cloud",
    "つぎへ（キャラをえらぶ）": "Next (choose characters)",
    "MagiTier で詳細を見る": "See details in MagiTier",
    "MagiBurst キャラTier表": "MagiBurst character tier list",
    "MagiBurst のセーブデータはこのアカウントに紐づいています": "Your MagiBurst save is linked to this account",
    "MagiBurst に出てくる全ギミック（28種）": "Every gimmick in MagiBurst (28 kinds)",
    "ガチャで仲間にしよう！": "Recruit them from the gacha!",
    "MagiLex で30コンテンツを完全習得すると仲間になる報酬キャラ！（ガチャ排出なし）":
      "A reward character who joins you when you fully master 30 MagiLex courses (never from the gacha).",
    "フレンドがいません。XEVARION ホームの「フレンド」から追加できます。":
      "You have no friends yet. Add them from “Friends” on the XEVARION home screen.",
    "開催中のイベントとガチャの内容を、横にスライドしてめくれます。キャラをタップすると性能を確認できます。":
      "Swipe sideways to flip through the running events and gacha. Tap a character to see what they can do.",

    /* ── 絵文字つきのボタン ── */
    "🌐 マルチプレイ": "🌐 Multiplayer",
    "🌸 庭園へ行く": "🌸 Go to the Garden",
    "🍐 叡智の果実": "🍐 Fruit of Wisdom",
    "🎪 イベント": "🎪 Events",
    "🎫 フェスチケット": "🎫 Fest ticket",
    "🎰 ガチャへ行く": "🎰 Go to the gacha",
    "🏠 XEVARION ホームへ": "🏠 To the XEVARION home",
    "🏪 ジェム変換所は引っ越しました": "🏪 The gem exchange has moved",
    "🏯 蓬莱の九重へ行く": "🏯 Go to the Nine Layers of Horai",
    "👤 アカウント": "👤 Account",
    "👥 フレンド": "👥 Friends",
    "📖 あそびかた": "📖 How to play",
    "📖 性能をくわしく見る": "📖 See full details",
    "📢 お知らせ": "📢 News",
    "🔄 いま届いているか確認する": "🔄 Check for new mail now",
    "🔗 クロススキル": "🔗 Cross skill",
    "🔧 このキャラを育成する（レベル上げ・ルーン）": "🔧 Train this character (levels and runes)",
    "🗒 ミッション": "🗒 Missions",
    "🛠 編成ツール": "🛠 Party tools",
    "🧩 ギミック図鑑": "🧩 Gimmick guide",
    "⚔ クエストへ行く": "⚔ Go to quests",
    "⚖ 天界の審判へ行く": "⚖ Go to the Celestial Judgment",
    "⚡ まとめて振る": "⚡ Roll them all",
    "✉ メール": "✉ Mail",
    "✦ 新キャラクター参戦！": "✦ New characters have joined!",
    "✨ SSR 排出（合計）": "✨ SSR rate (total)",
    "⭐ SR（合計・19体で等分）": "⭐ SR (total, split evenly over 19 characters)",
    "❖ 魂の紋章": "❖ Soul emblem",
    "🎯 10連のSSR確定枠（最後の1枠・4体から等確率）":
      "🎯 Guaranteed SSR slot in a 10-pull (the last slot, equal chance among 4 characters)",
    "アップデート情報・運営からのお知らせ": "Update notes and announcements",

    /* ── あそびかた ── */
    "① 引っぱって離すと発射 → 壁で跳ねて敵にヒット！":
      "① Pull back and let go to launch — bounce off the walls and slam into the enemy!",
    "② 味方に触れるとリンクスキル＋サブリンクが発動！":
      "② Touch an ally to set off their Link Skill and Sub-Link!",
    "③ ギミック: 灼壁(DW)・地雷・ワープ・ブロック・透明パネル":
      "③ Gimmicks: damage walls, mines, warps, blocks and phantom panels",
    "⑤ 属性の有利・不利（有利なら1.25倍・不利なら0.75倍）":
      "⑤ Element advantage (×1.25 when strong, ×0.75 when weak)",

    /* ── ギミックの名前 ── */
    "ダメージウォール（DW）": "Damage Wall (DW)",
    "ウォールチェンジ（新）": "Wall Change (new)",
    "カウントブーストウォール（新）": "Count Boost Wall (new)",
    "ヒーリングウォール（新）": "Healing Wall (new)",
    "ヒーリングバルーン（新）": "Healing Balloon (new)",
    "ヴァニッシュボックス（新）": "Vanish Box (new)",
    "エーテル（新）": "Aether (new)",
    "レーザー（新）": "Laser (new)",
    "十字レーザー（新）": "Cross Laser (new)",
    "ホーミング（新）": "Homing (new)",
    "毒攻撃（新）": "Poison attack (new)",
    "裁きの攻撃（新）": "Judgment attack (new)",
    "クラッシュ攻撃（新）": "Crush attack (new)",
    "内部弱点（新）": "Inner weak point (new)",
    "減速壁（新）": "Slow Wall (new)",
    "ロックゾーン（新）": "Lock Zone (new)",
    "重力バリア（新）": "Gravity Barrier (new)",
    "透明スイッチ（新）": "Phantom Switch (new)",
    "撃種変化パネル（新）": "Shot-type Change Panel (new)",
    "撃種限定ブロック": "Shot-type Block",
    "断絶界（新アンチギミック）": "Severance Field (new anti gimmick)",
    "危険攻撃 / 即死攻撃": "Danger attack / instant-death attack",
    "弱点コア": "Weak core",
    "弱点通過": "Weak-point pass",
    "全ギミック対応": "Covers every gimmick",

    /* ── クエスト名（型で拾えないもの） ── */
    "第7ノ園（★幽極）": "Garden 7 (★Nether Apex)",
    "第10ノ園（★幽果）": "Garden 10 (★Nether Edge)",
    "第11ノ園（★幽白）": "Garden 11 (★Nether White)",
    "第12ノ園（★幽虚）": "Garden 12 (★Nether Void)",
    "第13ノ園（★幽幻）": "Garden 13 (★Nether Phantom)",
    "第14ノ園（★幽響）": "Garden 14 (★Nether Echo)",
    "第15ノ園（★幽創）": "Garden 15 (★Nether Genesis)",
    "第16ノ園（★幽輪）": "Garden 16 (★Nether Samsara)",
    "第17ノ園（★幽星）": "Garden 17 (★Nether Stellar)",
    "第18ノ園（★幽涅）": "Garden 18 (★Nether Nirvana)",
    "第19ノ園（★幽翠）": "Garden 19 (★Nether Verdant)",
    "第20ノ園（★幽業）": "Garden 20 (★Nether Pyre)",
    "蓬莱の九重・第一重（★蓬紅蓮）": "Nine Layers of Horai — Layer 1 (★Horai Crimson)",
    "蓬莱の九重・第二重（★蓬碧水）": "Nine Layers of Horai — Layer 2 (★Horai Azure)",
    "蓬莱の九重・第三重（★蓬翠風）": "Nine Layers of Horai — Layer 3 (★Horai Verdant Gale)",
    "蓬莱の九重・第四重（★蓬白光）": "Nine Layers of Horai — Layer 4 (★Horai Pale Light)",
    "蓬莱の九重・第五重（★蓬玄冥）": "Nine Layers of Horai — Layer 5 (★Horai Abyss)",
    "蓬莱の九重・第六重（★蓬焔舞）": "Nine Layers of Horai — Layer 6 (★Horai Flame Dance)",
    "蓬莱の九重・第七重（★蓬蒼渦）": "Nine Layers of Horai — Layer 7 (★Horai Blue Maelstrom)",
    "蓬莱の九重・第八重（★蓬金剛）": "Nine Layers of Horai — Layer 8 (★Horai Adamant)",
    "蓬莱の九重・第九重（★蓬月華）": "Nine Layers of Horai — Layer 9 (★Horai Moonbloom)",
    "天界の審判・第一の審判（★審火）": "Celestial Judgment — First Judgment (★Trial of Flame)",
    "天界の審判・第二の審判（★審水）": "Celestial Judgment — Second Judgment (★Trial of Water)",
    "天界の審判・第三の審判（★審翠）": "Celestial Judgment — Third Judgment (★Trial of Verdure)",
    "天界の審判・第四の審判（★審光）": "Celestial Judgment — Fourth Judgment (★Trial of Light)",
    "天界の審判・第五の審判（★審闇）": "Celestial Judgment — Fifth Judgment (★Trial of Dark)",
    "天界の審判・第六の審判（★断罪火）": "Celestial Judgment — Sixth Judgment (★Condemnation of Flame)",
    "天界の審判・第七の審判（★断罪水）": "Celestial Judgment — Seventh Judgment (★Condemnation of Water)",
    "天界の審判・第八の審判（★断罪翠）": "Celestial Judgment — Eighth Judgment (★Condemnation of Verdure)",
    "天界の審判・第九の審判（★断罪光）": "Celestial Judgment — Ninth Judgment (★Condemnation of Light)",
    "天界の審判・第十の審判（★断罪闇）": "Celestial Judgment — Tenth Judgment (★Condemnation of Dark)",
    "第一〜第十の審判・裁定級": "First through Tenth Judgment — Verdict class",
    "蓬莱天宮": "Horai Celestial Palace",
    "万灯祭天": "Myriad Lantern Heaven",

    /* ── イベント・フェス ── */
    "極彩祭（毎月1〜10日） に登場中": "Now in the Prism Fest (1st–10th of each month)",
    "極煌祭（毎月21日〜末日） に登場中": "Now in the Radiance Fest (21st–end of each month)",
    "常時開催": "Always running",
    "結晶": "Crystal",
    "助っ人": "Helper",
    "加速": "Speed Up",
    "放電": "Discharge",
    "爆発": "Blast",
    "プラズマ": "Plasma",
    "必中": "Always hits",
    "無敵": "Invincible",
    "回復": "Heal",
    "毒無効": "Poison immunity",
    "リジェネ": "Regen",
    "バリア": "Barrier",
    "ルーン": "Rune",
    "砲撃型": "Blaster type",
    "支援型": "Support type",
    "技巧型": "Technique type",
    "攻スピアップ": "ATK & Speed Up",
    "リンスピアップ": "Link & Speed Up",
    "警告": "Warning",
    "新設": "New",
  });
})();

/* ══════════════════════════════════════════════════════════════
   xeva-i18n-p3.js — XEVARION ポータルの英語辞書 ③（総ざらいの残り）
     ・「No.196 ライカ」のような<b>番号＋名前</b>
     ・検索・入力欄の案内文（placeholder）、並べ替えの矢印など
   ★ 番号＋名前は<b>型（関数）</b>で拾い、中の名前をもう一度 t() で引く。
     こうしておけばキャラが増えても自動で英語になる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  if (!window.XevaI18n) return;

  XevaI18n.addPatterns([
    [/^No\.(\d+) (.+)$/, function (s, no, nm) { return "No." + no + " " + XevaI18n.t(nm); }],
    [/^(\d+)月(\d+)日$/, "$1/$2"],
  ]);

  XevaI18n.add({
    "きょう": "today",
    "あした": "tomorrow",
    "XEVARION アップデート": "XEVARION update",
    "XEVAミッション": "XEVA missions",
    "新キャラクターのお知らせ": "New character announcement",
    "メールボックス": "Mailbox",
    "アクセスコード": "Access code",
    "コードを入力": "Enter a code",
    "登録した ID を入力": "Enter your registered ID",
    "パスワード（任意）": "Password (optional)",
    "キャラ名・No. で検索": "Search by name or No.",
    "🔍 アプリ名・キーワードで探す": "🔍 Search by app name or keyword",
    "例：1時間30分はかって／3人で遊べるゲーム": "e.g. “time 1 h 30 min” or “a game for three players”",
    "例：ポータルユーザー": "e.g. Portal User",
    "ドラッグして並べ替え": "Drag to reorder",
    "上へ": "Up", "下へ": "Down",
    "前の月": "Previous month", "次の月": "Next month",
    "送信": "Send",
    "音声で話す": "Speak",
    "音楽 ON/OFF": "Music on/off",
    "🚀 アップデートがあります": "🚀 An update is available",
    "📋 説明つきの一覧で見る": "📋 View the annotated list",
    "確認リストが正常に表示されないエラーを修正しました。": "Fixed a bug where the review list would not appear.",
    "5 limited SSRs join! 蓬莱天宮の続き5クエストをまるごと担当します":
      "5 limited SSRs join! Between them they cover all five quests beyond the Horai Celestial Palace",
    "5 new SSRs join! 蓬莱天宮の続き5クエストの最適解":
      "5 new SSRs join! The best answer to the five quests beyond the Horai Celestial Palace",
    "5 new SSRs join! 蓬莱天宮の続き5クエストの最適解——Cozy Haven を超える性能":
      "5 new SSRs join! The best answer to the five quests beyond the Horai Celestial Palace — stronger than Cozy Haven",
  });
})();

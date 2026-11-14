/* ══════════════════════════════════════════════════════════════
   ★★ 2026-10-24 デベロッパーノート（ご指定「アップデートしたら NIKKE のようなデベロッパーノートを表示。
      アップデート内容や、キャラ追加の場合は画像を表示」「それに伴い、キャラ追加時のポップアップは削除」）

   ・ホームに入ったとき（ログインボーナス・誕生日のあと）に、まだ見ていない版のノートを1回だけ出す。
     前の「新キャラクターのお知らせ」（xevarion.js の showNewChars）の代わり。
   ・新キャラは、その版の chars と「まだ見せていない新キャラ」（XEVA.newCharsUnseen）を合わせて大きな絵で出す。
     ノートを読んだあとに追加日（since）を迎えたキャラは、キャラの節だけのノートで出す。
   ・見たら XEVA.markNewCharsSeen() も呼ぶ（同じキャラは二度出ない）。
   ・★★ 2026-10-24 ご指定「設定でデベロッパーノートの履歴をそれぞれ押して見られるように」
     → XevDevNotes.history()（設定の「デベロッパーノート」）＝版の一覧。押すとその版のノート・「一覧にもどる」で戻る。

   ★ 版を足すときは NOTES の<b>先頭</b>に1つ足すだけ（id はその版だけの文字・見た印に使う）。
   ★★ 2026-11-08 ご指定「上の『いつも XEVARION を…ありがとうございます。』が抜けることがある」
       → lead があいさつで始まっていなければ、描くときに GREETING を先頭に足す（leadOf）。書き忘れても必ず出る。
       chars … [{ id（MagiBurst の id）, el（属性）, rar, img（横長の絵）}]
       secs  … [{ h（見出し）, img（小さな絵）, href（開くアプリ）, items（箇条書き・<b> 可）}]
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const KEY = "xev_devnotes_seen_v1";
  const EL = { fire: ["火", "#ff5d47"], water: ["水", "#38a6ff"], wood: ["木", "#2fbf71"], light: ["光", "#f0b429"], dark: ["闇", "#8a55f0"] };
  /* ★★ 2026-11-08 あいさつの行（lead に無ければ描くときに足す） */
  const GREETING = "いつも XEVARION を遊んでいただき、ありがとうございます。";
  function leadOf(N) {
    const L = String(N.lead || "");
    const plain = L.replace(/<[^>]*>/g, "").replace(/\s+/g, "");
    if (/^いつもXEVARION/.test(plain)) return L;
    return GREETING + (L ? "<br>" + L : "");
  }

  const NOTES = [
    /* ★★ 2026-11-13 MagiChemLex ケミカル・ルート（反応経路スコアアタック）・ホームの計算なしモードの切りかえを外す・MagiQuiz 結果詳細・SW の版と一覧を sw-list フォルダへ */
    {
      id: "2026-11-13", date: "2026.11.13", title: "MagiChemLex に新ミニゲーム「ケミカル・ルート」／MagiQuiz に結果詳細",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>MagiChemLex に、レトロゲーム風のミニゲーム<b>「ケミカル・ルート（反応経路スコアアタック）」</b>が入りました。MagiQuiz では、試合の終わりに<b>結果詳細</b>を見られるようになりました。",
      chars: [],
      secs: [
        { h: "MagiChemLex", img: "thumbs/MagiChemLex.jpg?v=2", href: "MagiChemLex/index.html", items: [
          "ホーム（ビンゴのすぐ下）に、ミニゲーム<b>「ケミカル・ルート（反応経路スコアアタック）」</b>。ベンゼンから出発する反応経路図を、8つのステージで完成させます",
          "問題は、矢印の<b>加えるもの・条件 27本</b>と、<b>化合物 23個</b>の<b>全50問</b>。答えるたびに地図の「？」が構造式と試薬に変わります",
          "各ステージは2ラウンド：<b>ROUND 1</b>＝矢印の試薬・条件を見て、できる<b>化合物</b>を答える／<b>ROUND 2</b>＝化合物がそろったら矢印の文字をかくして、<b>加えるもの・条件</b>を答える",
          "<b>NORMAL</b>（名前つき・1問20秒・まちがえた問題はステージの終わりにもう一度）と、<b>HARD</b>（構造式だけ・1問12秒・ライフ3・得点1.5倍）",
          "得点：正解 100 ＋ 速さ（最大100）＋ コンボ（最大 +200）。ステージをノーミスで +500・全問ノーミスで +2,000。ランクは S〜D",
          "<b>ステージれんしゅう</b>（1ステージだけ）と、<b>こたえの経路図</b>（完成した地図・箱や矢印をタップで説明）つき",
          "ホームにあった<b>「計算なしモード」</b>の切りかえは、設定にまとめました（設定 → 計算なしモード）",
        ] },
        { h: "MagiQuiz", img: "thumbs/MagiQuiz.jpg?v=2", href: "MagiQuiz/index.html", items: [
          "試合の終わりに<b>「結果詳細」</b>ボタン（2台で対戦の結果にも）",
          "人（チーム）ごとの成績・<b>点の内訳</b>・分野ごとの正解数と、<b>1問ごとの記録</b>（だれが・単元・むずかしさ・◯✕・かかった時間・点）",
          "スコアアタックの<b>点のしくみ</b>もここで確認できます：正解の点（むずかしさ ★1〜3＝100・150・200点・計算は +50）＋速さ（最大 +100）＋連続正解（最大 +100）",
        ] },
        { h: "そのほか", img: "", href: "", items: [
          "オフライン用のデータの持ち方を整理しました（遊び方・セーブデータは変わりません）",
        ] },
      ],
    },
    /* ★★ 2026-11-12 超極華祭にエナ・ミミ・ROYAL DEBUT GACHA・Sapphire Breeze 終了・動作モード・賞金履歴・不要ファイルの削除・MagiAbyss 全員ちがう性能・MagiBattle ロイヤル隊 */
    {
      id: "2026-11-12", date: "2026.11.12", title: "超極華祭にエナ・ミミ／ROYAL DEBUT GACHA／動作モード／MagiAbyss は全員ちがう性能に",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br><b>超極華祭</b>に新しい2人、新しいガチャ <b>ROYAL DEBUT GACHA</b> に3人が加わりました。あわせて、<b>動作モード</b>・<b>ゲーム賞金の受け取り履歴</b>・<b>要らないファイルの自動削除</b>を追加し、MagiAbyss を<b>全員ちがう性能</b>に作り直しました。",
      chars: [
        { id: "ena", el: "wood", rar: "UR", img: "img/Ena_w.webp" },
        { id: "mimi", el: "dark", rar: "UR", img: "img/Mimi_w.webp" },
        { id: "mako", el: "fire", rar: "UR", img: "img/Mako_w.webp" },
        { id: "ako", el: "water", rar: "UR", img: "img/Ako_w.webp" },
        { id: "mina", el: "light", rar: "UR", img: "img/Mina_w.webp" },
      ],
      secs: [
        { h: "ガチャ", img: "MagiBurst/img/bn_royal_s.webp", href: "gacha.html", items: [
          "<b>超極華祭</b>（毎月11〜20日）に UR の<b>エナ</b>（木）・<b>ミミ</b>（闇）",
          "<b>ROYAL DEBUT GACHA</b>（20日間）：UR の<b>マコ</b>（火）・<b>アコ</b>（水）・<b>ミナ</b>（光）が各 2%。1日1回の単発無料・初回10連無料。終わったら PREMIUM SELECT GACHA へ",
          "新しい5体は <b>MagiAbyss と MagiBattle</b> で使えます。完凸でホームのロビーにも",
          "<b>Sapphire Breeze は終了</b>。タキナ・ヒバナ・フキは <b>PREMIUM SELECT GACHA</b> でいつでも引けます（UR のピックアップは 5%）。UR は結晶の交換所で <b>250個</b>",
        ] },
        { h: "設定・ダウンロード", img: "", href: "", items: [
          "<b>動作モード</b>（軽量・標準・高解像度）：軽量モードは古い端末・電池が少ないとき・<b>オフラインで重いとき</b>に。オフラインのときに重くなる原因も直しました",
          "<b>ゲーム賞金の受け取り履歴</b>（設定の「アカウント」）",
          "ダウンロードのたびに<b>要らなくなったファイル</b>（古い版・終わったアプリのデータ）を自動で削除します（セーブデータ・キャラの絵・曲は消しません）",
          "起動時の企業ロゴを、タイトル画面に合うシンプルな表示に。ISHIDA Production・Magical Future のロゴが新しくなりました",
        ] },
        { h: "MagiAbyss", img: "thumbs/MagiAbyss.jpg", href: "MagiAbyss/index.html", items: [
          "同じ性能だったキャラ（コハク・アリス・ヒサコ・ハル・チカ・チフル・ミント・プリカ・スズ・ショウコ・ミキ）を<b>全員ちがう組み合わせ</b>に作り直しました（通常攻撃・固有技・必殺技・パッシブ・特性・スキル・秘技）",
          "<b>技（E）</b>も全員それぞれ<b>その子だけの技</b>に（名前と追加効果がちがいます）",
          "強さの帯はこれまでどおり（エナ・ミミはハル・チカと同じ、ROYAL の3人はヒサコより少し下）",
        ] },
        { h: "MagiBattle・MagiQuiz・MagiChemLex", img: "", href: "", items: [
          "MagiBattle：新しい<b>ロイヤル隊</b>（マコ＝火力 SMG・アコ＝支援 RL・ミナ＝防御 AR）と、ブルーム隊にエナ（防御 MG）・ミミ（火力 SG）",
          "MagiQuiz：早押しでまちがえた選択肢が消えるように・答える時間を少し長く・アイコンを UR のキャラから選べるように・司会のカットインはなくしました",
          "MagiChemLex：設定「選択肢はタップしてから表示」",
          "完凸ロビーのアイナ・ユナが新しい立ち絵に（チフル・ユナの胸の位置も直しました）。ジェフ千葉のデザインでは、ホームのボタンもジェフ仕様に",
        ] },
      ],
    },
    /* ★★ 2026-11-08 MagiMarket（新作）・ジェフ千葉のホームデザイン・ジェフ勝利の配布・MagiQuiz（早押し・2台で対戦・司会キャラ・賞金）
       ★ 11-05 の3回目（早押しバトル）は配信の前に止まっていたので、このノートにまとめた（id 2026-11-05c は消した） */
    {
      id: "2026-11-08", date: "2026.11.08", title: "新アプリ MagiMarket／ジェフ千葉のホームデザイン／MagiQuiz に早押し・2台で対戦・司会キャラ",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>ジェフユナイテッド市原・千葉が水戸ホーリーホックに <b>1-0 で勝利</b>しました！ 記念に全員へ <b>10,000 XEVA</b> をメールでお贈りします。あわせて、XEVA を運用する新しいアプリ <b>MagiMarket</b> と、<b>ジェフ千葉のホームデザイン</b>が加わりました。",
      chars: [],
      secs: [
        { h: "MagiMarket（新作・β版）", img: "thumbs/MagiMarket.jpg?v=2", href: "MagiMarket/index.html", items: [
          "<b>キオクシアの株</b>を1株から売り買いできます（1 XEVA ＝ 1円・手数料なし）。注文は成行で、注文のあとの最初の値段（取引時間外は次の取引日の最初の値段）で約定します",
          "<b>ジェフ千葉の試合</b>の勝敗・合計ゴール・千葉の得点・スコアに XEVA で賭けられます。倍率は J1 の順位表から計算し、買ったときの倍率で確定。締切はキックオフです",
          "株価・試合の日程と結果は自動で取得します。記録はアカウントで同期されます",
        ] },
        { h: "ジェフ千葉のホームデザイン", img: "jef/stadium.svg?v=1", href: "", items: [
          "設定の<b>「ホームのデザイン」</b>で、標準とジェフ千葉を選べます",
          "夜のスタジアム・黄と緑の応援旗・紙ふぶき・<b>次の試合と前節の結果の札</b>（押すと MagiMarket で勝敗を予想できます）",
          "BGM はオリジナルの応援曲「Yellow &amp; Green Anthem」。お手持ちの応援歌（PRIDE など）の音源を<b>自分の端末に追加して流す</b>こともできます",
        ] },
        { h: "MagiQuiz", img: "thumbs/MagiQuiz.jpg?v=2", href: "MagiQuiz/index.html", items: [
          "<b>早押しバトル</b>：問題文が1文字ずつ出て、わかった人が自分のブザーを押す早い者勝ち。お手つきはライフ −1（2〜8人・チーム戦も）",
          "<b>2台で対戦</b>：それぞれの端末で、同じ問題に同時に答えるスピード勝負（2〜4台・4桁の部屋の番号で集合）",
          "<b>司会キャラ</b>：ホームのパートナーや完凸ロビーのキャラが、試合を実況・カットイン（設定でオン／オフ）",
          "<b>賞金を引き上げ</b>：1位 1,000・2位 700・3位 500 XEVA…（ひとりプレイは正解×40・最大 400）",
        ] },
        { h: "そのほか", img: "", href: "", items: [
          "完凸ロビーのキャラの揺れを少し大きくし、ヨシノの胸の位置のずれを直しました",
          "デベロッパーノートのはじめのあいさつが抜けないようにしました",
        ] },
      ],
    },
    /* ★★ 2026-11-05（2回目）MagiQuiz の調整 */
    {
      id: "2026-11-05b", date: "2026.11.05", title: "MagiQuiz を遊びやすく調整",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>遊んでいただいた声をもとに、<b>MagiQuiz</b> を調整しました。",
      chars: [],
      secs: [
        { h: "MagiQuiz", img: "thumbs/MagiQuiz.jpg?v=2", href: "MagiQuiz/index.html", items: [
          "順番は試合のはじめに<b>くじ引き</b>で決めて、その順に並びます",
          "順番が変わるときは<b>スタートを押さなくても自動で進みます</b>（画面を押すとすぐ進みます）",
          "見えない爆弾：爆弾の時間を少しのばしました。ミスが上限に達すると<b>ライフ −1</b>（アウトではなく）で、爆弾は次の人へ",
          "クイズタワー：ミスの回数をライフ（♥）の表示に",
          "上のプレイヤーの札を全員同じ大きさに。「この端末の本人」のチェックで席が大きくなるのと、遊び方のカードの大きさがそろわないのを修正",
        ] },
      ],
    },
    /* ★★ 2026-11-05 MagiQuiz の全面作り直し・好み診断・ChemLex のタブ */
    {
      id: "2026-11-05", date: "2026.11.05", title: "MagiQuiz を全面リニューアル／お気に入りカードに好み診断／MagiChemLex のタブを5つに",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br><b>MagiQuiz</b> を新しいアイコンとデザインで1から作り直しました。あわせて、お気に入りカードの<b>好み診断</b>と、MagiChemLex の使いやすさの改善です。",
      chars: [],
      secs: [
        { h: "MagiQuiz", img: "thumbs/MagiQuiz.jpg?v=2", href: "MagiQuiz/index.html", items: [
          "遊び方は3つ、どれも<b>1問ごとに交互</b>：<b>見えない爆弾</b>（姿の見えない爆弾を回す・正解で次の人へ）／<b>クイズタワー</b>（10階を登る・やめどきも作戦）／<b>スコアアタック</b>（速さで競う・ひとり練習にも）",
          "問題は MagiChemLex の<b>基礎セット1〜4 の改題 196問すべて</b>。図のある問題は図も出ます。計算問題なしにもできます",
          "1回の解答時間つき（計算問題は長め）。爆弾の時間は大きくのばして、<b>姿は見えません</b>（画面のふちの光・鼓動・チクタクが激しくなります）。まちがえすぎると<b>アウト</b>",
          "<b>答えたあとは時間が止まり</b>、解説をゆっくり確認できます。問題中は<b>メモ・電卓・公式</b>が使えます",
          "席の<b>「この端末の本人」にチェック</b>すると<b>オフラインでも XEVA</b> が入ります。アカウント連携の画面も新しくしました（オフラインで終わった試合のほかの人の賞金は、オンラインになったら送ります）",
          "途中で閉じても<b>「つづきから」</b>で再開／称号／人ごとの記録と苦手な単元／文字の大きさの設定／BGM",
        ] },
        { h: "お気に入りカード", img: "img/seal.webp", href: "characters.html?fav=1", items: [
          "<b>好み診断</b>：お気に入りが<b>15人以上</b>で解放。髪の色・髪型・雰囲気・世界観・属性・レア度の傾向を、全体の割合とくらべて判別します",
          "好みのタイプ・こだわり度・好みど真ん中の3人・好きな組み合わせ・まだ登録していない候補がわかります",
        ] },
        { h: "MagiChemLex", img: "thumbs/MagiChemLex.jpg?v=2", href: "MagiChemLex/index.html", items: [
          "下のタブを<b>5つ</b>（ホーム・問題・復習・記録・ツール）にして、絵と文字を大きくしました。セット・大問・問題一覧は「問題」タブの中で切りかえます",
          "セットを開いて戻ると、<b>開く前の位置に戻る</b>ようにしました",
        ] },
        { h: "ホーム", img: "brand-xevarion-orb.png", href: "index.html", items: [
          "MagiBattle と MagiQuiz の位置を入れかえました",
          "メニューで並べかえた人のロビーで、開くたびに左右が入れかわることがあったのを修正",
        ] },
      ],
    },
    /* ★★ 2026-11-03 超極彩祭に3体・ガチャの演出・お気に入りカード・入手まとめ・起動の企業ロゴ・MagiBattle のロビー */
    {
      id: "2026-11-03", date: "2026.11.03", title: "超極彩祭にチフル・ミント・プリカ／お気に入りカード／XEVA・ジェムの入手まとめ／MagiBattle のロビーを一新",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>超極彩祭に UR の<b>チフル・ミント・プリカ</b>が登場しました。あわせて<b>お気に入りカード</b>・<b>XEVA・ジェムの入手まとめ</b>（アニメ）・起動の企業ロゴの演出・<b>MagiBattle のロビー</b>を新しくしました。",
      chars: [
        { id: "chifuru", el: "fire", rar: "UR", img: "img/Chifuru_w.webp" },
        { id: "mint", el: "wood", rar: "UR", img: "img/Mint_w.webp" },
        { id: "purika", el: "light", rar: "UR", img: "img/Purika_w.webp" },
      ],
      secs: [
        { h: "超極彩祭", img: "img/t_Chifuru.webp", href: "gacha.html", items: [
          "<b>チフル（火）・ミント（木）・プリカ（光）</b>の UR 3体が新登場。ハル・チカとあわせて <b>UR 5体</b>（各1.5%）・<b>毎月1〜10日</b>（🎫ガチャ券が使えます）",
          "3体とも <b>MagiAbyss と MagiBattle</b> のキャラクター。MagiAbyss では<b>ヒサコと同じ強さ</b>、MagiBattle では <b>チフル＝支援型 SMG（バーストⅠ）・ミント＝支援型 AR（Ⅱ）・プリカ＝火力型 SR（Ⅱ）</b>",
          "<b>完凸（4凸）でホームのロビー</b>に設定できます（動く立ち絵）",
        ] },
        { h: "ガチャ", img: "img/seal.webp", href: "gacha.html", items: [
          "演出を強化：<b>スロット</b>・<b>天使の降臨</b>・パチンコのような<b>豪華な効果音と BGM</b>",
          "UR のカットインで丸の中が真っ黒になったり上が切れたりしていたのを修正。昇格する前の色を先に見せてしまう（ネタバレ）のを修正",
          "アイテムの枠は <b>XEVARION 共通</b>のものに。MagiBurst 専用の道具（叡智の果実など）はガチャからは出なくなりました",
          "★星煌印：<b>超極華祭・超極煌祭・超極彩祭のキャラは開催期間の外でも交換</b>できます。交換所でガチャの札を押すと札の列が先頭に戻ってしまうのを修正",
          "ガチャ一覧に <b>MagiBattle で使えるキャラ</b>の印",
        ] },
        { h: "XEVARION", img: "brand-xevarion-orb.png", href: "index.html", items: [
          "<b>お気に入りカード</b>：図鑑・キャラ詳細の <b>☆</b> で全キャラをお気に入りに。トレーディングカードのバインダーで、名前・レア度・属性で探せます（コミュニティからほかの人のお気に入りも）",
          "拡大したカードは<b>ドラッグで回転</b>（裏は XEVARION のロゴ）。<b>UR は SS の絵の全面イラスト</b>。「性能を見る」はカードの上に詳細が開き、閉じるとカードに戻ります",
          "<b>XEVA・ジェムの入手まとめ</b>（アニメ）：どのアプリで何をすると入るかと、あなたの入手の記録。設定と入手方法のシートから",
          "起動の企業ロゴを<b>映画のロゴのような演出</b>に（6社を同じ大きさ・同じタイミングで・約3秒・タップで飛ばせます）",
          "<b>凸ミッション</b>（コレクションの先頭）：UR・SSR の凸・完凸で XEVA とジェム。完凸ロビーのキャラに<b>セリフ</b>",
        ] },
        { h: "MagiBattle", img: "thumbs/MagiBattle.jpg?v=4", href: "MagiBattle/index.html", items: [
          "<b>ロビーを一新</b>：画面いっぱいの副官と景色・指揮官・イベントの帯・キャンペーン・前哨基地（NIKKE のホーム画面のような形）",
          "キャラ詳細の上の絵を <b>UR の絵</b>に（SS 絵・立ち絵にも切りかえ）。<b>「ステータス」と「強化」を別のタブ</b>に",
          "ステータスの下を<b>武器・スキル・バーストの札</b>にして見やすく。強化タブでは上げたあとの能力も表示",
          "チフル・ミント・プリカが参戦（プリズム隊が5人そろいます）",
        ] },
        { h: "MagiAbyss", img: "thumbs/MagiAbyss.jpg?v=2", href: "MagiAbyss/index.html", items: [
          "チフル・ミント・プリカが参戦（ヒサコと同じ強さ）",
          "町の魔導具店の「ミント」は、新しいキャラと名前が同じため「<b>ミルテ</b>」に改名しました",
        ] },
      ],
    },
    /* ★★ 2026-11-02 ジェフ千葉の勝利記念・企業ロゴ6社・NGX の新ロゴ・ガチャ・MagiBattle・MagiDerby */
    {
      id: "2026-11-02", date: "2026.11.02", title: "ジェフ千葉 勝利記念／Kawagani・STUDIO DOGA が運営協力に／MagiBattle・MagiDerby の改善",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>ジェフユナイテッド市原・千葉がアビスパ福岡に <b>3-0 で勝利</b>しました！ 記念に全ユーザーへ <b>30,000 XEVA</b> を📧メールでお届けしています。<br>あわせて <b>Kawagani</b> と <b>STUDIO DOGA</b> が運営協力に参入し、MagiBattle と MagiDerby を改善しました。",
      chars: [],
      secs: [
        { h: "XEVARION", img: "brand/Kawagani_s.webp", href: "index.html", items: [
          "<b>Kawagani</b> と <b>STUDIO DOGA</b> が運営協力に参入。起動の画面の企業ロゴは <b>6社を縦3×横2</b> で表示します",
          "<b>NGX のロゴ</b>が新しくなりました",
          "ガチャの上の<b>チケットなどの数</b>が画面の外に出ることがあったのを修正（入りきらないときは次の行へ）",
          "「？ 使い方」のボタンの位置がずれたり、まん中に出たりすることがあったのを修正",
          "配布：ジェフ千葉の勝利記念に <b>30,000 XEVA</b>（📧メールから）",
        ] },
        { h: "MagiBattle", img: "thumbs/MagiBattle.jpg?v=4", href: "MagiBattle/index.html", items: [
          "バトル中に <b>Space（押したまま）で全員が遮蔽物に隠れる</b>（隠れるとリロード）。撃つのは <b>J</b> かマウス",
          "キャラのカードに<b>スキルの効果のマーク</b>（攻＝攻撃力・守＝被ダメージ軽減・会＝会心・癒＝回復・溜＝チャージ・速＝連射・盾・挑発・FB）",
          "<b>バトルログ</b>：一時停止のメニューと、結果の画面から見られます",
          "レベルは<b>上げる数をえらんで</b>（−10・−・＋・＋10・最大）まとめて上げられるように",
          "ショップが光りすぎて見づらかったのを修正。キャラ詳細で「隠す」を押しても下の板が残っていたのを修正",
        ] },
        { h: "MagiDerby", img: "thumbs/MagiDerby.jpg", href: "MagiDerby/index.html", items: [
          "スマホで馬券の下が切れて表示されないことがあったのを修正",
          "<b>GⅠ ごとの合計</b>（馬券の枚数・買った額・払い戻し・収支）：マイページの「GⅠ ごと」・馬券タブのレースの絞り込み・レースの結果・GⅠ の一覧",
          "<b>過去の年の GⅠ</b> をさかのぼって見られるように（GⅠ の一覧の上で年を切りかえ・データは自動取得が少しずつ集めます）",
        ] },
      ],
    },
    /* ★★ 2026-10-31（2回目）ガチャの完凸ルール・MagiBattle の手直し・使い方ガイド・MagiChemLex */
    {
      id: "2026-10-31-2", date: "2026.10.31", title: "完凸してもピックアップが出るように／MagiBattle の手直し／使い方ガイド",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>ガチャの<b>完凸のきまり</b>を変えました。あわせて MagiBattle を大きく手直しし、各画面から<b>使い方のアニメ</b>を見られるようにしました。",
      chars: [],
      secs: [
        { h: "ガチャ", img: "thumbs/MagiBurst.jpg", href: "gacha.html", items: [
          "<b>1〜9連目（単発・5連も）</b>は、👑完凸したキャラも<b>ピックアップのまま出続けます</b>（フェス・GRAND DEBUT・Festival Archive も）",
          "<b>10連目（最後の1枠）</b>は、<b>まだ完凸していないキャラだけ</b>が出ます",
          "完凸後に出たときの 💠結晶は <b>UR 10個</b>・SSR 5個・SR 1個に",
          "提供割合を<b>「1〜9連目」と「10連目」に分けて</b>のせました",
        ] },
        { h: "MagiBattle", img: "thumbs/MagiBattle.jpg?v=4", href: "MagiBattle/index.html", items: [
          "攻撃の演出を大きく強化（ヒット・撃破・バースト・FULL BURST）。敵の攻撃パターンとウェーブを増やしました",
          "曲ごとに<b>オリジナル BGM</b>・<b>使い方のアニメ</b>・ストーリーの記録（読み返し）と LD 絵",
          "画面を明るくカラフルに。部隊の並べ替え・絞り込みはボタンで。アイテムのまとめて使用",
          "下のナビは 部隊・編成・<b>ロビー（まん中）</b>・アリーナ・ショップ。Space（スマホは「隠す」）で画面の表示を全部隠せます",
          "<b>アリーナは全部自動</b>（バーストもおたがい自動）。相手を横に広く並べました",
          "まだ調整中のため<b>β版</b>の印を付けました（ホームのアイコン・タイトル画面）",
          "出撃の帯がナビから浮いていたのを直しました。体験キャラは廃止。ショウコたちの後ろ姿を直しました",
        ] },
        { h: "XEVARION", img: "img/t_Kohaku.webp", href: "index.html", items: [
          "ホーム・ガチャ・図鑑・コミュなどの画面に、<b>使い方のアニメ</b>を開くボタン（はじめての画面で1回だけお知らせ）",
          "設定の入力欄が画面の外に出ないように。起動画面の背景をアプリごとの色に",
          "MagiChemLex：<b>XEVA のもらい方</b>をアニメで説明・ビンゴの「メモを使う」が達成できなかったのを修正",
        ] },
      ],
    },
    /* ★★ 2026-10-31 MagiBattle の作り直し・5つのフェスの終了・完凸ロビーに4人・応援配布・ガイド */
    {
      id: "2026-10-31", date: "2026.10.31", title: "MagiBattle を作り直しました／5つのフェスが終了／完凸ロビーに4人",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br><b>MagiBattle</b> をゲームもアプリも<b>1から作り直しました</b>。超極祭系の UR 12体で遊ぶ、後ろから撃つ部隊シューティングです。あわせて5つのフェスの開催を終了し、キャラクターは <b>Festival Archive GACHA</b> で引けるようになりました。応援配布として <b>🎫ガチャチケット70枚</b>をメールでお届けしています。",
      chars: [],
      secs: [
        { h: "MagiBattle（作り直し）", img: "thumbs/MagiBattle.jpg?v=4", href: "MagiBattle/index.html", items: [
          "<b>超極祭系（超極彩祭・超極煌祭・超極華祭）の UR 12体</b>で部隊を組み、<b>遮蔽物のうしろから撃つ</b>部隊シューティング（戦闘はドット絵・バーストのカットインはキャラの絵）",
          "バースト<b>Ⅰ→Ⅱ→Ⅲ</b>でつなぐと10秒の<b>FULL BURST</b>。武器は AR・SMG・SG・SR・RL・MG の6種類、キャラごとにスキル2つとバーストスキル",
          "<b>キャンペーン</b>（ストーリーつき）・<b>アリーナ</b>（ほかの指揮官の防衛編成と5対5・毎月のシーズン）・<b>迎撃戦</b>（日がわりのボス・月間ランキング）・<b>タワー</b>・<b>前哨基地</b>・研究・任務・ショップ",
          "育成はレベル（シンクロ装置）・スキル・装備（オーバーロード）・キューブ・好感度。凸は XEVARION のガチャと共通。持っていないキャラはストーリーと迎撃戦だけ<b>体験キャラ</b>で",
          "<b>キーボード</b>でも遊べます（1〜5・Space・矢印・B など。設定に一覧）。ごほうびは<b>ジェム</b>（XEVARION 共通）",
        ] },
        { h: "ガチャ", img: "thumbs/MagiBurst.jpg", href: "gacha.html", items: [
          "<b>戦姫祭・BUNNY GIRL FEST・極煌祭・極彩祭・極華祭</b>の開催を終了。キャラクターは <b>Festival Archive GACHA</b> で引けます",
          "RISING STAR FEST など<b>終わったガチャのバナー</b>は一覧から外しました。持っているセレクト券は<b>一覧のいちばん上</b>で使えます",
          "注目キャラに<b>「完凸でロビー」の王冠</b>（絵の左下・MagiAbyss の印は右下）",
        ] },
        { h: "ホーム・ロビー", img: "img/t_Kohaku.webp", href: "index.html", items: [
          "完凸ロビーに<b>コハク・ユナ・アイナ・ヨシノ</b>を追加して8人に（動く立ち絵）",
          "<b>応援配布</b>：全ユーザーに 🎫ガチャチケット70枚（📧メールから）",
          "ロビーの MagiBattle に <b>NEW</b> の印・新しいアイコン",
        ] },
        { h: "XEVARION ガイド・サイト・MagiDerby", img: "thumbs/Xevarion.png", href: "index.html#guide", items: [
          "<b>XEVARION ガイド</b>：すべての機能を動きとアニメーションで紹介（設定から見られます）",
          "<b>NGX</b>・<b>ISHIDA Production</b> のサイトをオフラインでも開けるように。ISHIDA の開発アプリ一覧（28本）・制作過程を最新に、左上のロゴのつぶれを修正",
          "<b>MagiDerby</b>：枠順の発表のあと、予想オッズが別の馬に付いて人気とずれることがあったのを修正",
        ] },
      ],
    },
    {
      id: "2026-10-30", date: "2026.10.30", title: "新しいガチャ「超極彩祭」／毎月のビンゴ／★星煌印を全ガチャ共通に",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>新しいガチャ<b>「超極彩祭」</b>で UR の<b>ハル・チカ</b>が登場します（毎月1〜10日・初回は 11月1日）。XEVA ミッションには<b>毎月のビンゴ</b>、ガチャの天井<b>★星煌印</b>は<b>全ガチャ共通</b>になりました。",
      chars: [
        { id: "haru", el: "water", rar: "UR", img: "img/Haru_w.webp" },
        { id: "chika", el: "dark", rar: "UR", img: "img/Chika_w.webp" },
      ],
      secs: [
        { h: "超極彩祭", img: "img/t_Haru.webp", href: "gacha.html", items: [
          "<b>ハル（水）・チカ（闇）</b>の UR 2体（各1.5%）。開催は極彩祭と同じ<b>毎月1〜10日</b>（初回は <b>11月1日</b>）・🎫ガチャ券が使えます（フェス券は使えません）",
          "2体とも <b>MagiAbyss 専用</b>のキャラクター。MagiAbyss では<b>ヒサコより少し強い</b> UR の最上位です（MagiChemLex のナビゲーターや XEVARION のアイコンにも使えます）",
          "<b>完凸（4凸）でホームのロビー</b>に設定できます（動く立ち絵）",
          "開催中はガチャ一覧のいちばん上に出ます（いまは開催の予告として、いちばん上にあります）",
        ] },
        { h: "XEVA ミッション・ガチャ", img: "img/seal.webp", href: "index.html", items: [
          "<b>毎月のビンゴ</b>：毎月1日に新しい 5×5 のカード。XEVARION のアプリで遊ぶとマスが自動でひらき、ライン・3ライン・6ライン・コンプリートでごほうび（XEVA・ジェム・ガチャチケット・★星煌印・10連半額券）",
          "<b>★星煌印（天井）は全ガチャ共通</b>に。どのガチャで引いても同じ印がたまり、<b>100個で好きなガチャの好きなキャラ1体</b>と交換できます。これまでガチャごとにためていた印は、ぜんぶ合わせた数になっています",
          "交換は<b>ショップの「★星煌印 交換所」</b>で。ガチャの上のバーに<b>ショップ</b>へのボタン、一覧のいちばん上に星煌印の帯",
          "<b>超極煌祭</b>のバナーを新しい絵に",
        ] },
        { h: "XEVARION", img: "thumbs/xevarion-home_s.jpg?v=13", href: "index.html", items: [
          "新しい<b>タイトル画面</b>",
          "ロビーの2行目を <b>MagiBattle・MagiAbyss・MagiDerby・MagiShift・ChainParty</b> に（MagiQuiz はメニューのゲームの先頭へ）",
          "MagiAbyss に NEW の印・MagiBattle の新しいロゴ",
          "ショップの説明の文字が1行ずつ改行されていたのを修正",
          "<b>NGX</b> と <b>ISHIDA Production</b> の公式サイトを作り直しました",
        ] },
        { h: "MagiChemLex", img: "thumbs/MagiChemLex.jpg?v=2", href: "MagiChemLex/index.html", items: [
          "難関セット（小問の範囲ごと）の完全習得・確認テストの XEVA を<b>標準・基礎と同じ</b>に（前の式で受け取った人には差額をお渡しします）",
          "ビンゴカードを開いて閉じると<b>画面が反応しなくなる</b>のを修正",
        ] },
      ],
    },
    {
      id: "2026-10-28", date: "2026.10.28", title: "MagiAbyss の画面と地図を作り直し／ChemLex にビンゴカード／ガチャ10連半額券",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>今回は <b>MagiAbyss の画面と冒険の地図</b>を作り直し、MagiChemLex に<b>ビンゴカード</b>を追加しました。新しいアイテム<b>「ガチャ10連半額券」</b>も登場です（📧メールで配布中）。",
      chars: [],
      secs: [
        { h: "XEVARION", img: "brand/YRA_s.webp", href: "index.html", items: [
          "運営協力に <b>YRA</b> が参入しました。起動の画面は<b>企業ロゴ4社を縦2×横2</b>で表示します（XEVARION のロゴの表示はなくしました）",
          "図鑑・ガチャの<b>属性の表記</b>を <b>火・水・木・光・闇</b> に戻しました（「火属性キラー」のように）",
          "<b>ヒサコ・アリス</b>は、完凸するとホームのロビーに設定できることを、ガチャの顔ぶれとキャラ詳細に<b>小さく</b>表記しました",
          "<b>花宴祭</b>と <b>RISING STAR FEST</b> の開催を終了しました。キャラは、ほかのフェスと同じく <b>Festival Archive GACHA</b> で引けます",
          "新しいアイテム<b>「ガチャ10連半額券」</b>：<b>どのガチャでも10連を1枚で 💎25</b>（ふつうは 💎50）。ガチャの下の「半額券で10連」から使えます",
          "配布：MagiChemLex の修正に伴い <b>10連半額券5枚・両替チケット10枚・5,000 XEVA</b>／MagiLex のビンゴカード廃止の補填に <b>5,000 XEVA・ガチャチケット20枚</b>（どちらも📧メールから）",
          "MagiDerby で<b>新しい GⅠ が買えるようになったら</b>、はじめての1回だけホームで<b>豪華なアニメーション</b>でお知らせします（追加データのダウンロードやこのノートのあと）",
          "パートナーを表示しているときに<b>「表示」ボタンを押すと非表示になる</b>ことがあったのを修正（標準・アップ・全身だけを切りかえます。表示しないは「ロビー」の画面から）",
        ] },
        { h: "MagiAbyss", img: "thumbs/MagiAbyss.jpg?v=2", href: "MagiAbyss/index.html", items: [
          "<b>UI・デザインを作り直し</b>：紺のガラスの板に金のふちと四隅の飾り、見出しは明朝、ボタンは角の丸い金・紺に。タイトル・町・枠・HUD・操作ボタン・結果まで",
          "<b>スマホの横画面</b>に合わせて調整：上のバー・枠・地図の詳細・HUD・操作ボタンを詰めて、画面の中に収まるように",
          "<b>冒険の地図を作り直し</b>：迷宮どうしの間かくをあけて置き直し、<b>名札が重ならない</b>ように。外伝の島はそれぞれ形と色をかえ、道はなめらかな曲線に。迷宮は番号のメダル（クリア・NEW・HARD の印）",
        ] },
        { h: "MagiChemLex", img: "thumbs/MagiChemLex.jpg?v=2", href: "MagiChemLex/index.html", items: [
          "<b>ビンゴカード</b>：毎月の 5×5（まん中は FREE）。マスは<b>元素カード</b>の形で、条件を満たすと金色のはんこ。そろうと <b>BINGO!</b> の演出とごほうび（ライン・3ライン・6ライン・コンプリート）",
          "XEVA のごほうびの<b>素の量を3倍</b>にしました（イベントの倍率はその上にかかります）",
        ] },
        { h: "MagiDerby", img: "thumbs/MagiDerby.jpg", href: "MagiDerby/index.html", items: [
          "<b>オフラインでも馬券を購入</b>できるようになりました（つながったときに同期・時刻を確かめ直します）",
          "金額の<b>初期値は 0</b>（金額のボタンで足していきます）",
          "<b>購入するボタン</b>が下の縁から浮いて見えていたのを修正（シートの下のふちに固定）",
          "GⅠ の演出で <b>「GⅠ」の文字が中央にそろっていなかった</b>のを修正",
        ] },
        { h: "MagiLex", img: "thumbs/MagiLex.jpg", href: "MagiLex/index.html", items: [
          "<b>ミッションビンゴ（ビンゴカード）を廃止</b>しました。補填は📧メールでお送りしています。ビンゴカードは MagiChemLex に新しく作りました",
        ] },
      ],
    },
    {
      id: "2026-10-27", date: "2026.10.27", title: "明るくポップな配色に／MagiAbyss 外伝クエスト6つ・ストーリー増量／ChemLex 模試の冊子",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>今回は<b>ホームの配色を明るくポップに</b>見直し、MagiAbyss に<b>外伝クエスト6つ（新しい敵とボス）とストーリー</b>を追加しました。MagiChemLex には、組をまるごと解く<b>模試の冊子</b>ができました。",
      chars: [],
      secs: [
        { h: "XEVARION", img: "thumbs/MagiBurst.jpg", href: "index.html", items: [
          "ホームの<b>配色を明るくポップ</b>に：ボタン・札は<b>白い板＋明るい灰色のふち</b>、文字は白いふち取り、<b>下のタブは色つきのアイコン</b>で、選んだタブは<b>水色の札</b>が盛り上がります（ガチャ・図鑑・コミュニティの下バーも同じ）",
          "XEVA・ジェムの札の右はしは<b>緑の「＋」</b>（押すと今までどおり入手方法）・イベントの期限の帯はピンク",
          "<b>ドット絵のキャラの横顔</b>をかわいく：横の髪が顔にかぶさって目が半分しか見えなかったのを直し、<b>大きな瞳とハイライト・ほほの赤み</b>がはっきり見えるように（MagiAbyss・ホームのドット絵）",
        ] },
        { h: "MagiAbyss", img: "thumbs/MagiAbyss.jpg?v=2", href: "MagiAbyss/index.html", items: [
          "<b>外伝クエスト6つ</b>（海に浮かぶ異界の島・第10〜第15迷宮）：<b>敵はすべて新しい魔物</b>（茸の島・凍てつく潮の島・焔の祭壇島・白亜の天文台・千年桜の霊域・深海の沈没都市）。どの属性にも<b>有利なクエストが3つずつ</b>になるように作りました",
          "<b>ストーリーを増量</b>：本編の章に町の人たちの会話を足し、第7〜第9迷宮の章（本編の終章まで）と<b>外伝6章</b>（旅の星読みセツナ）を追加。話す人の<b>立ち姿・文字送り・自動送り・章のはじまりの演出</b>つき",
          "<b>中ボス戦は部屋を封鎖</b>：中ボスの部屋の中に入ると出入口が閉じて中ボス戦（倒すまで出られない・外の敵も入らない）。前は部屋を通っただけで中ボスが出て、離れた所で倒れて<b>いつの間にか鍵が手に入る</b>ことがありました",
          "<b>豪華な演出</b>：クエスト開始のタイトル・中ボス戦の警告と鉄格子・鍵の入手・ボスの扉が開く・クリアの光と紙ふぶき",
          "<b>マップの閉じるボタンをいつも表示</b>（右上の ✕ と下の「閉じる」が画面の外に出ないように）",
          "<b>出撃前にキャラを変えても反映されないことがある</b>のを修正（変えたらすぐ保存・下に残っている準備の画面も描き直す・同期で前のキャラに戻らないように）",
        ] },
        { h: "MagiChemLex", img: "thumbs/MagiChemLex.jpg?v=2", href: "MagiChemLex/index.html", items: [
          "各セットの<b>模試モードはなくしました</b>。かわりに<b>「模試の冊子」</b>：基礎セット1 のような<b>組をまるごと</b>、本物の冊子のように表紙（注意事項）から全問を上から順に解けます（「大問」タブの各組のいちばん上）",
          "解答欄はマークシート風・数値はキーで入力・途中の答えは保存されて<b>続きから</b>再開できます",
          "提出すると採点して<b>解答・解説</b>（あなたの答え・正解・解説）。解かずに<b>解答・解説だけを見る</b>こともできます",
        ] },
        { h: "MagiDerby", img: "thumbs/MagiDerby.jpg", href: "MagiDerby/index.html", items: [
          "馬券は<b>水曜日の 0:00 から</b>買えます（日曜のレースは4日前・土曜は3日前）",
          "GⅠ を押すと、実際のレースのはじまりのように<b>レース名が豪華なアニメーション</b>で出ます（第◯回・英語の名前・コース・発走）",
          "<b>単勝・複勝以外のオッズも表示</b>：JRA の発売が始まる前は<b>単勝オッズからの試算（予想オッズ）</b>を出し、発売が始まると本物のオッズに切りかわります",
          "スマホで<b>馬券の上下が切れる</b>ことがあったのを修正（長い買い目は自動で小さくして、券の中に収める）",
        ] },
        { h: "MagiShift", img: "thumbs/MagiShift.jpg", href: "MagiShift/index.html", items: [
          "CPU の守り：あと1つでそろう人が何人かいるときは、<b>自分の番から近い人</b>を先に止めるように",
        ] },
      ],
    },
    {
      id: "2026-10-26b", date: "2026.10.26",   /* ★ 同じ日の2回目で中身を足したので id を変えた（見た人にももう一度出す） */ title: "完凸ロビーとバナーのドット絵／MagiDerby をもっと使いやすく",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>今回は<b>完凸で選べるロビー</b>（ヒサコ・アリス）と、<b>ホームのバナーの上を動くドット絵のキャラ</b>を追加しました。MagiDerby は、買い方・結果の受け取り・説明を大きく見直しています。",
      chars: [],
      secs: [
        { h: "ホーム・ロビー", img: "img/t_Hisako.webp", href: "index.html", items: [
          "超極煌祭の<b>ヒサコ・アリス</b>を<b>完凸（4凸）</b>すると、ホームの<b>ロビー</b>（パートナーの所）に<b>動く立ち絵</b>を出せます（表情は変わらず、呼吸や髪のゆれで軽く動きます）。♥パートナー →「ロビー」タブから",
          "<b>開催中のイベントのバナーの上</b>を、持っているキャラが<b>ドット絵</b>で歩いたり跳ねたり、すわったりします。キャラを押すと「✎ かえる」、♥パートナー →「ドット絵」タブでも選べます（おまかせ・表示しない もあります）",
          "パートナーを表示しないときのガチャ・イベントのバナーを少しだけ小さく・<b>ロビー</b>のボタンはイベントのバナーの上（ふだんと同じ場所）に。判定シートの段が無くなったぶん、すべてのアプリを広く",
          "ホームの「パートナー」ボタンは<b>「ロビー」</b>に。中は「ロビー｜ドット絵」のタブ、ロビーの中で「パートナー｜完凸ロビー」を切りかえ（その上に「表示しない」）",
          "パートナーの<b>ランダム表示は廃止</b>しました",
          "<b>これって浮気？判定シート</b>は、コミュニティの XEVARION PARK の下へ移しました",
          "下バーのガチャのアイコンは前の絵のまま少し大きく・「無料」の印は出さないように",
          "ガチャ一覧の「SSR以上1.5倍」と「注目ガチャ」の表示を消しました（確率は変わりません）",
          "iPad の上の端の対策を、前の形に戻しました",
          "このデベロッパーノートは、<b>追加データのダウンロードが終わってから</b>出るようにしました",
          "XEVA の受け取りやログインのあとに、画面がだんだん下がっていくことがあったのを修正（iPhone・iPad のアプリ表示）",
        ] },
        { h: "MagiDerby", img: "thumbs/MagiDerby.jpg", href: "MagiDerby/index.html", items: [
          "発売は<b>レースの日の3日前の 0:00</b> から（締切は発走の2分前）",
          "<b>結果と払い戻しは、結果のデータが届きしだい</b>（次の日の 0:00 を待ちません）。データは自動で集めているので、<b>反映の時刻は前後することがあります</b>",
          "GⅠ の結果が出たら、<b>いちばん上に「結果を見る」</b>（レースの日から3日目まで）",
          "金額のボタンは<b>押すたびに足される</b>形に・<b>リセット</b>も。押しても画面が上にもどらないように",
          "馬券タブで<b>レースごとに絞りこみ</b>",
          "上の <b>LIVE</b> から JRA 公式の<b>無料ライブ配信</b>へ（レースの日はレースの画面にも）",
          "<b>使い方（アニメ）</b>と<b>馬券の種類</b>の説明（上の「？」・買う画面の「？ 馬券の種類」）",
          "券面の緑の帯を実物どおり左に（文字に重なる）・券種と馬番を近く",
          "結果の「netkeiba の映像」は「<b>このレースの特集ページ</b>」に・再現アニメは外しました",
          "券をスマホで大きく表示したときに ✕ が隠れる・下に線が出るのを修正（画面いっぱいの表示に）",
          "結果の券で馬の名前が出ない・詰めて表示されないことがあったのを修正",
          "結果は5着まで表示・<b>「6着以下も見る」</b>で全頭",
          "馬券一覧に<b>絞り込み</b>（状態・レース・券種）と<b>並び替え</b>（買った順・レースの日・払戻・金額）",
          "券面の単勝などの四角を少し左へ",
        ] },
        { h: "MagiShift", img: "thumbs/MagiShift.jpg", href: "MagiShift/index.html", items: [
          "この端末のアカウントと紐づけた席は、アイコンのキャラが<b>完凸</b>ならホームと同じように光ります",
          "守りの数に<b>盾のアイコン</b>（席の色）",
        ] },
      ],
    },
    {
      id: "2026-10-24", date: "2026.10.24", title: "レベル・スタミナの廃止と、学びの入口の統合",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>今回は<b>レベルとスタミナの廃止</b>、<b>同期のしくみの作り直し</b>、<b>MagiLex と MagiChemLex の統合</b>など、大きめの変更をおこないました。主な内容をお知らせします。",
      chars: [
        { id: "hisako", el: "water", rar: "UR", img: "img/Hisako_w.webp" },
        { id: "alice", el: "dark", rar: "UR", img: "img/Alice_w.webp" },
        { id: "miki", el: "wood", rar: "UR", img: "img/Miki_w.webp" },
      ],
      secs: [
        { h: "XEVARION 全体", img: "thumbs/Xevarion.png", items: [
          "<b>レベルとスタミナを廃止</b>しました。ホームの上は XEVA（上）とジェム（下）の縦1列に",
          "<b>同期の改善</b>：ほかの端末で XEVA が増えない・ジェムなどが増えつづけることがあったのを修正（端末ごとの増減を足し合わせる方式に）",
          "両替チケットは<b>1枚＝💎10</b>に（これまでは💎5）",
          "パートナーを表示しないときのホームを、バナーとアプリが見やすい並びに",
          "ガチャ演出の <b>SKIP ボタン</b>を新しいデザインに・ガチャ一覧の「MagiAbyss で使える」印を控えめに",
          "ガチャタブの「無料」の印が消えないことがあったのを修正",
          "MagiDerby のアイコンに「締切間近」「払戻」の印",
          "このデベロッパーノートは、設定の「デベロッパーノート」から<b>これまでの回</b>も見られます",
        ] },
        { h: "MagiLex × MagiChemLex", img: "thumbs/MagiLex.jpg", href: "MagiLex/index.html", items: [
          "MagiLex を開くと <b>MagiChemLex</b> と <b>旧MagiLex</b> を選べるように（ホームの MagiChemLex の場所には MagiQuiz）",
          "旧MagiLex は化学・英単語・古文だけに（問題の追加は終了します）",
          "KP 交換所のキャラの性能・画像が正しく出ないことがあったのを修正",
          "MagiChemLex の WP 交換所に <b>ミキ</b>（UR・120 WP・1体）",
        ] },
        { h: "MagiDerby", img: "thumbs/MagiDerby.jpg", href: "MagiDerby/index.html", items: [
          "買った馬券を<b>実際の馬券のような券面</b>で一覧に。券を押すと大きく表示・結果が出た券は押して確認（そのとき払い戻し）",
          "結果待ちの券に<b>勝敗の確定日</b>・上の<b>マイページ</b>から成績",
          "発売は<b>木曜 0:00</b> から。<b>枠順の発表前は馬名で</b>買え、発表されしだい券に馬番が入ります（出走しなくなった馬を含む組は返還）",
          "アプリを開いていなくても出馬表やオッズを取りに行くように",
          "馬券を買う画面がスクロールできないことがあったのを修正・スマホで上の表示が重ならないように",
        ] },
        { h: "MagiShift", img: "thumbs/MagiShift.jpg", href: "MagiShift/index.html", items: [
          "2位からの順位は<b>守り7割・長さ3割</b>の点で（ほかの人の「あと1つでそろう」マスを防ぐと守り +1）。名前の横に 🛡 守りの数",
          "試合のあとに<b>最後の盤面</b>を見たり、1手ずつ見返したりできるように",
          "準備画面の「もどる」ボタンの位置を修正",
        ] },
        { h: "MagiQuiz（β版）", img: "thumbs/MagiQuiz.jpg", href: "MagiQuiz/index.html", items: [
          "問題は MagiChemLex の<b>基礎の改題</b>だけに",
          "チーム戦は名前を入れたあと<b>くじ引き</b>でチーム分け",
          "ばくだんは小さく・危なくなると<b>画面のふちが光る</b>",
        ] },
        { h: "MagiAbyss", img: "thumbs/MagiAbyss.jpg?v=2", href: "MagiAbyss/index.html", items: [
          "町の人も、操作するキャラと同じ細かさのドット絵に",
          "超極煌祭に <b>ヒサコ</b>（水）・<b>アリス</b>（闇）・WP 交換所に <b>ミキ</b>（木）。どれも MagiAbyss 専用の UR",
        ] },
      ],
    },
  ];

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function seen() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function markSeen(id) { try { localStorage.setItem(KEY, id); } catch (e) {} }
  function master(id) { try { return (window.XEVA && XEVA.MB_CHARS || []).find((c) => c.mbId === id) || null; } catch (e) { return null; } }
  function info(id) { return (window.MB_NEW_CHARS || []).find((n) => n && n.id === id) || {}; }

  /* ── 見た目（このファイルだけで完結） ── */
  const CSS = `
#xdnOv{position:fixed;inset:0;z-index:1006;display:none;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top,0px)) 10px max(12px,env(safe-area-inset-bottom,0px));
  background:radial-gradient(120% 80% at 50% 0%,rgba(40,70,140,.55),rgba(6,10,26,.82));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:'Noto Sans JP',sans-serif}
#xdnOv.open{display:flex;animation:xdnIn .28s ease-out}
@keyframes xdnIn{from{opacity:0}}
#xdnOv .xdn{position:relative;width:min(640px,100%);max-height:100%;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:#f4f6fb;color:#1b2440;
  box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.12);animation:xdnUp .38s cubic-bezier(.2,1.2,.3,1)}
@keyframes xdnUp{from{transform:translateY(24px) scale(.97);opacity:0}}
#xdnOv .xdn-hd{position:relative;flex:none;padding:16px 52px 14px 18px;color:#fff;overflow:hidden;
  background:linear-gradient(115deg,#141c3c 0%,#24346e 55%,#3b2a6e 100%)}
#xdnOv .xdn-hd::before{content:"";position:absolute;right:-30px;top:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(255,210,90,.35),transparent 70%)}
#xdnOv .xdn-hd::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#ffd257,#ff6f91,#7aa8ff)}
#xdnOv .xdn-k{font:900 11px/1 'Orbitron',sans-serif;letter-spacing:.32em;color:#ffd257}
#xdnOv .xdn-t{position:relative;margin-top:7px;font-size:18px;font-weight:900;line-height:1.35}
#xdnOv .xdn-d{position:relative;margin-top:5px;font:700 11px/1 'Orbitron',sans-serif;letter-spacing:.12em;color:rgba(255,255,255,.7)}
#xdnOv .xdn-x{position:absolute;right:12px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:16px;font-weight:900;cursor:pointer;z-index:2}
#xdnOv .xdn-b{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:14px 14px 4px}
#xdnOv .xdn-lead{margin:0 2px 14px;font-size:13px;line-height:1.75;color:#2a3558}
#xdnOv .xdn-lead b{color:#3b2a8e}
#xdnOv .xdn-sh{display:flex;align-items:center;gap:8px;margin:16px 2px 9px;font-size:14.5px;font-weight:900;color:#1b2440}
#xdnOv .xdn-sh i{flex:none;font:900 11px/1 'Orbitron',sans-serif;font-style:normal;color:#fff;background:#24346e;padding:5px 7px;border-radius:6px;letter-spacing:.06em}
#xdnOv .xdn-sh::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,rgba(36,52,110,.3),transparent);order:1}
#xdnOv .xdn-sh a{order:2;flex:none;font-size:11.5px;font-weight:900;color:#3b5bd0;text-decoration:none}
/* 新キャラ（横長の大きな絵） */
#xdnOv .xdn-chars{display:flex;flex-direction:column;gap:10px}
#xdnOv .xdn-ch{position:relative;border-radius:14px;overflow:hidden;background:#0d1024;aspect-ratio:16/9;box-shadow:0 6px 18px rgba(16,24,60,.22)}
#xdnOv .xdn-ch img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%}
#xdnOv .xdn-ch .g{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,28,.88) 0%,rgba(8,10,28,.55) 38%,transparent 66%)}
#xdnOv .xdn-ch .tx{position:absolute;left:0;top:0;bottom:0;width:62%;padding:12px 14px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff}
#xdnOv .xdn-ch .tg{align-self:flex-start;font:900 9px/1 'Orbitron',sans-serif;letter-spacing:.14em;padding:4px 7px;border-radius:5px;background:var(--c,#ffb84d);color:#111}
#xdnOv .xdn-ch .nm{margin-top:6px;font-size:22px;font-weight:900;line-height:1.1;text-shadow:0 2px 10px rgba(0,0,0,.6)}
#xdnOv .xdn-ch .nm small{margin-left:6px;font:900 11px 'Orbitron',sans-serif;color:var(--c,#ffb84d)}
#xdnOv .xdn-ch .el{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-left:6px;border-radius:50%;font-size:11px;font-weight:900;vertical-align:3px;color:#fff}
#xdnOv .xdn-ch .ct{margin-top:5px;font-size:11.5px;font-weight:800;line-height:1.5;color:rgba(255,255,255,.88)}
#xdnOv .xdn-ch .wh{margin-top:5px;font-size:10.5px;font-weight:800;line-height:1.45;color:var(--c,#ffb84d)}
#xdnOv .xdn-ch .ac{display:flex;gap:6px;margin-top:8px}
#xdnOv .xdn-ch .ac a{flex:none;font-size:11px;font-weight:900;text-decoration:none;color:#fff;padding:6px 10px;border-radius:99px;background:rgba(255,255,255,.16)}
#xdnOv .xdn-ch .ac a.go{background:var(--c,#ffb84d);color:#111}
/* 節（アプリごと） */
#xdnOv .xdn-sec{display:flex;gap:11px;padding:12px;border-radius:14px;background:#fff;box-shadow:0 1px 0 rgba(16,24,60,.06),0 4px 14px rgba(16,24,60,.06);margin-bottom:9px}
#xdnOv .xdn-sec>img{flex:none;width:52px;height:52px;border-radius:12px;object-fit:cover;background:#e8ecf6}
#xdnOv .xdn-sec .bd{flex:1;min-width:0}
#xdnOv .xdn-sec ul{margin:0;padding:0 0 0 15px;font-size:12.5px;line-height:1.65;color:#2a3558}
#xdnOv .xdn-sec li{margin:2px 0}
#xdnOv .xdn-sec li::marker{color:#7a8bd0}
#xdnOv .xdn-sec b{color:#1b2440}
#xdnOv .xdn-sign{margin:14px 4px 10px;text-align:right;font-size:12px;font-weight:800;color:#5a6890;line-height:1.6}
#xdnOv .xdn-ft{flex:none;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px) * 0);background:#fff;border-top:1px solid #e3e8f3}
#xdnOv .xdn-ok{width:100%;height:46px;border:0;border-radius:13px;font-size:15px;font-weight:900;color:#fff;cursor:pointer;
  background:linear-gradient(115deg,#24346e,#3b2a8e);box-shadow:0 6px 16px rgba(36,52,110,.3)}
/* 履歴（版の一覧） */
#xdnOv .xdn-hl{display:flex;flex-direction:column;gap:9px}
#xdnOv .xdn-hi{display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;border:0;border-radius:14px;background:#fff;text-align:left;cursor:pointer;font-family:inherit;color:#1b2440;
  box-shadow:0 1px 0 rgba(16,24,60,.06),0 4px 14px rgba(16,24,60,.06);transition:transform .12s}
#xdnOv .xdn-hi:active{transform:scale(.98)}
#xdnOv .xdn-hi .dt{flex:none;width:54px;text-align:center;font:900 11px/1.25 'Orbitron',sans-serif;color:#fff;background:linear-gradient(160deg,#24346e,#3b2a8e);border-radius:10px;padding:7px 4px}
#xdnOv .xdn-hi .dt b{display:block;font-size:15px}
#xdnOv .xdn-hi .tt{flex:1;min-width:0}
#xdnOv .xdn-hi .tt b{display:block;font-size:13.5px;font-weight:900;line-height:1.4}
#xdnOv .xdn-hi .tt small{display:block;margin-top:3px;font-size:11px;font-weight:700;color:#5a6890;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#xdnOv .xdn-hi .fc{flex:none;display:flex}
#xdnOv .xdn-hi .fc img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:50% 20%;border:2px solid #fff;margin-left:-9px;background:#e8ecf6}
#xdnOv .xdn-hi .ar{flex:none;font-size:18px;font-weight:900;color:#7a8bd0}
#xdnOv .xdn-hi .nw{display:inline-block;margin-left:6px;font:900 9px/1 'Orbitron',sans-serif;color:#fff;background:#ff5a7a;padding:3px 5px;border-radius:5px;vertical-align:2px}
#xdnOv .xdn-ft.two{display:flex;gap:8px}
#xdnOv .xdn-back{flex:none;height:46px;padding:0 16px;border:0;border-radius:13px;font-size:14px;font-weight:900;color:#24346e;background:#eef1f8;cursor:pointer;font-family:inherit}
@media (max-width:420px){#xdnOv .xdn-hi .fc{display:none}}
@media (max-width:420px){#xdnOv .xdn-sec{gap:9px;padding:11px 10px}#xdnOv .xdn-sec>img{width:38px;height:38px;border-radius:10px}/* スマホ：絵を上に大きく・文字は絵の下（絵に文字をかぶせない） */
  #xdnOv .xdn-ch{aspect-ratio:auto}#xdnOv .xdn-ch img{position:relative;display:block;height:auto;aspect-ratio:16/9}
  #xdnOv .xdn-ch .g{background:linear-gradient(180deg,transparent 40%,rgba(8,10,28,.0) 50%);display:none}
  #xdnOv .xdn-ch .tx{position:relative;width:100%;padding:10px 12px 12px;background:linear-gradient(180deg,#141a3a,#0d1024)}
  #xdnOv .xdn-ch .tg{position:absolute;left:10px;top:-24px}}
@media (min-width:560px){#xdnOv .xdn-ch{aspect-ratio:2/1}#xdnOv .xdn-t{font-size:20px}}
@media (prefers-reduced-motion:reduce){#xdnOv.open,#xdnOv .xdn{animation:none}}`;

  function charCard(c) {
    const m = master(c.id); if (!m) return "";
    const n = info(c.id), col = n.color || "#ffb84d", el = EL[c.el];
    const th = String(m.file || "").replace(/^\.\.\//, ""), full = th.replace(/(^|\/)t_/, "$1");
    const src = c.img || full;
    const go = n.mode ? '<a class="go" href="gacha.html#' + esc(n.mode) + '">ガチャへ</a>' : "";
    return '<div class="xdn-ch" style="--c:' + esc(col) + '"><img src="' + esc(src) + '" alt="' + esc(m.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + esc(full) + '\'"><div class="g"></div>' +
      '<div class="tx"><span class="tg">NEW CHARACTER</span>' +
      '<div class="nm">' + esc(m.name) + (el ? '<span class="el" style="background:' + el[1] + '">' + el[0] + "</span>" : "") + "<small>" + esc(c.rar || m.rarLabel || "SSR") + "</small></div>" +
      (n.catch ? '<div class="ct">' + esc(n.catch) + "</div>" : "") +
      (n.where ? '<div class="wh">' + esc(n.where) + "</div>" : "") +
      '<div class="ac"><a href="characters.html?c=' + encodeURIComponent(c.id) + '">性能を見る</a>' + go + "</div></div></div>";
  }

  function build(N, extra, onlyChars, fromList) {
    const list = (onlyChars ? [] : (N.chars || []).slice());
    (extra || []).forEach((c) => { if (!list.some((x) => x.id === c.mbId)) list.push({ id: c.mbId }); });
    let k = 0;
    const num = () => String(++k).padStart(2, "0");
    let body = "";
    if (!onlyChars) body += '<p class="xdn-lead">' + leadOf(N) + "</p>";
    const cards = list.map(charCard).filter(Boolean);
    if (cards.length) body += '<div class="xdn-sh"><i>' + num() + "</i>新キャラクター</div><div class=\"xdn-chars\">" + cards.join("") + "</div>";
    if (!onlyChars) (N.secs || []).forEach((s) => {
      body += '<div class="xdn-sh"><i>' + num() + "</i>" + esc(s.h) + (s.href ? '<a href="' + esc(s.href) + '">開く ›</a>' : "") + "</div>" +
        '<div class="xdn-sec">' + (s.img ? '<img src="' + esc(s.img) + '" alt="" loading="lazy">' : "") + '<div class="bd"><ul>' +
        s.items.map((x) => "<li>" + x + "</li>").join("") + "</ul></div></div>";
    });
    if (!onlyChars) body += '<div class="xdn-sign">これからも XEVARION をよろしくお願いします。<br>XEVARION 開発チーム</div>';
    return '<div class="xdn" role="dialog" aria-modal="true" aria-label="デベロッパーノート">' +
      '<div class="xdn-hd"><div class="xdn-k">' + (onlyChars ? "NEW CHARACTER" : "DEVELOPER NOTES") + '</div><div class="xdn-t">' + (onlyChars ? "新しい仲間が加わりました" : esc(N.title)) + '</div><div class="xdn-d">' + esc(N.date) + '</div><button class="xdn-x" type="button" aria-label="閉じる">✕</button></div>' +
      '<div class="xdn-b">' + body + "</div>" +
      (fromList ? '<div class="xdn-ft two"><button class="xdn-back" type="button">‹ 一覧にもどる</button><button class="xdn-ok" type="button">閉じる</button></div></div>'
        : '<div class="xdn-ft"><button class="xdn-ok" type="button">確認しました</button></div></div>');
  }
  /* 履歴：版の一覧（新しい順）。押すとその版のノート */
  function buildList() {
    const items = NOTES.map((N, i) => {
      const dd = String(N.date || "").split(".");
      const faces = (N.chars || []).slice(0, 3).map((c) => { const m = master(c.id); return m ? '<img src="' + esc(String(m.file || "").replace(/^\.\.\//, "")) + '" alt="">' : ""; }).join("");
      const sub = (N.secs || []).map((s) => s.h).join("・");
      return '<button class="xdn-hi" type="button" data-i="' + i + '"><span class="dt">' + esc(dd[0] || "") + "<b>" + esc((dd[1] || "") + "." + (dd[2] || "")) + "</b></span>" +
        '<span class="tt"><b>' + esc(N.title) + (i === 0 ? '<i class="nw">NEW</i>' : "") + "</b><small>" + esc(sub) + "</small></span>" +
        (faces ? '<span class="fc">' + faces + "</span>" : "") + '<span class="ar">›</span></button>';
    }).join("");
    return '<div class="xdn" role="dialog" aria-modal="true" aria-label="デベロッパーノートの履歴">' +
      '<div class="xdn-hd"><div class="xdn-k">DEVELOPER NOTES</div><div class="xdn-t">これまでのデベロッパーノート</div><div class="xdn-d">' + NOTES.length + ' NOTES</div><button class="xdn-x" type="button" aria-label="閉じる">✕</button></div>' +
      '<div class="xdn-b"><p class="xdn-lead">アップデートごとのお知らせです。見たい回を押してください。</p><div class="xdn-hl">' + items + "</div></div>" +
      '<div class="xdn-ft"><button class="xdn-ok" type="button">閉じる</button></div></div>';
  }

  function shell() {
    if (!document.getElementById("xdnCss")) { const st = document.createElement("style"); st.id = "xdnCss"; st.textContent = CSS; document.head.appendChild(st); }
    let ov = document.getElementById("xdnOv");
    if (!ov) { ov = document.createElement("div"); ov.id = "xdnOv"; document.body.appendChild(ov); }
    return ov;
  }
  function wire(ov) {
    const close = () => { ov.classList.remove("open"); ov.innerHTML = ""; };
    ov.querySelector(".xdn-x").onclick = close;
    ov.querySelector(".xdn-ok").onclick = close;
    ov.onclick = (e) => { if (e.target === ov) close(); };
    ov.classList.add("open");
  }
  function open(N, extra, onlyChars, fromList) {
    const ov = shell();
    ov.innerHTML = build(N, extra, onlyChars, fromList);
    wire(ov);
    const bk = ov.querySelector(".xdn-back"); if (bk) bk.onclick = history;
  }
  function history() {
    const ov = shell();
    ov.innerHTML = buildList();
    wire(ov);
    ov.querySelectorAll(".xdn-hi").forEach((b) => { b.onclick = () => open(NOTES[Number(b.dataset.i)], [], false, true); });
  }

  /* ★★ 2026-10-25 更新（追加データのダウンロード）の画面が出ているあいだは出さない（ご報告「ダウンロードの前に裏で出て見られない」）。
     ホームの xhUpdBusy()：起動時の更新の確認がまだ＝"wait"（15秒まで待つ）・更新の画面／ダウンロード中＝true（終われば読み込み直すので、そのあと出る）。 */
  let waitT = 0;
  /* ★★ 2026-10-28 ほかのお知らせ（ホームの MagiDerby の GⅠ 発売の告知など）が、このノートのあとに出られるように：
     maybeShow が終わった（出した・出すものが無かった）か。出したノートが開いているあいだは false */
  let settledF = false;
  function settled() { const ov = document.getElementById("xdnOv"); return settledF && !(ov && ov.classList.contains("open")); }
  function updBusy() {
    try { return window.xhUpdBusy ? window.xhUpdBusy() : false; } catch (e) { return false; }
  }
  /* ホームに入ったときに呼ぶ。出したら true（更新を待つときは false を返して、あとで自分で出す） */
  function maybeShow() {
    const N = NOTES[0]; if (!N) return false;
    const busy = updBusy();
    if (busy === true || (busy === "wait" && waitT < 15000)) {
      waitT += 800;
      setTimeout(maybeShow, 800);
      return false;
    }
    let unseen = [];
    try { unseen = (window.XEVA && XEVA.newCharsUnseen && XEVA.newCharsUnseen()) || []; } catch (e) {}
    const fresh = seen() !== N.id;
    settledF = true;
    if (!fresh && !unseen.length) return false;
    open(N, unseen, !fresh);
    markSeen(N.id);
    try { window.XEVA && XEVA.markNewCharsSeen && XEVA.markNewCharsSeen(); } catch (e) {}
    return true;
  }

  window.XevDevNotes = { maybeShow: maybeShow, open: () => open(NOTES[0], [], false), history: history, NOTES: NOTES, settled: settled };
})();

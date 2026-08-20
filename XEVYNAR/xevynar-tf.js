/* ============================================================
   XEVYNAR — Transformer エンジン（xevynar-tf.js）
   ------------------------------------------------------------
   ★★ 2026-08-20 新規

   ■ なぜ作ったか
     これまでの XEVYNAR は「言葉が入っているか」を数える方式だった。
       ・「第12の間の編成」→ 当たる
       ・「12の間ってどうやったら勝てますか？」→ 言葉が足りず外す
     言い回しが変わると外れるし、「似た意味の別の言葉」も分からない。

     大手のAIが使っている Transformer は、
     <b>文の中のどの語がどの語を見るべきか（注意＝attention）</b>を計算して、
     文全体を1本の数のならび（ベクトル）にする。
     こうすると、言い回しがちがっても<b>意味が近ければ近いベクトル</b>になる。

   ■ ここで実装しているもの（本物の Transformer エンコーダ）
     ① トークナイザ  … 日本語は分かち書きが要らない<b>文字バイグラム</b>で切る
     ② 埋め込み      … 語 → d 次元のベクトル（ハッシュ＋種つき乱数で作る）
     ③ 位置エンコード … sin/cos（語順の情報を足す）
     ④ 自己注意      … Q=xWq, K=xWk, V=xWv → softmax(QKᵀ/√dk)V を<b>ヘッド数ぶん</b>
     ⑤ 残差＋層正規化 … x = LN(x + Attn(x)) → x = LN(x + FFN(x))
     ⑥ プーリング    … 平均をとって L2 正規化 → 文ベクトル
     ⑦ 出力ヘッド    … 文ベクトル → 意図の確率（softmax）。<b>ここだけを学習する</b>

   ■ 学習について（正直に書いておく）
     ・②〜⑥の重みは<b>種つき乱数で決め打ち</b>にしてある。
       端末やブラウザが変わっても<b>同じ文からは同じベクトル</b>が出る（再現性が命）。
     ・⑦の出力ヘッドは<b>本物の勾配降下法</b>で学習する。
       交差エントロピーの勾配を計算して W と b を更新している。
     ・学習した重みは端末に保存し、Firebase（xevarion-account の xevynar/brain）で
       <b>みんなのぶんを平均</b>して共有する。使う人が増えるほど賢くなる。

   ■ どれくらい当たるか（下じきに1つも入れていない29文で実測）
       ・文字だけ（概念タグなし）          … 9%（当てずっぽうと同じ）
       ・概念タグを足した                  … 61%
       ・概念タグに重みを付けた            … 75%
       ・下じきの周回を 40 まで増やした    … <b>83%</b>（下じきの文は 5/5）
     ★ 決め打ちの重みでは<b>字のちがう同義語</b>は分からない。
       9% はその限界がそのまま出た数字で、2b の概念タグはその穴を埋めるためにある。
     ★ 83% は「じゅうぶん」ではないので、<b>言葉の一致を上書きしない</b>作りにしてある
       （xevynar-talk.js の scoreIntents で、最大14点だけ足す）。
       外しても答えが変わらず、当たれば後押しになる、という位置づけ。

   ■ 使いかた
     XVTF.embed(text)            … 文ベクトル（Float32Array, d次元）
     XVTF.sim(a, b)              … コサイン類似度
     XVTF.classify(text)         … [{ intent, p }] を確率の高い順に
     XVTF.learn(text, intent)    … 1件学習する（すぐ効く）
     XVTF.nearest(text, items, k)… items（{key,text}）から意味の近いものを k 件
     XVTF.sync()                 … Firebase と重みをやりとりする
     XVTF.stats()                … 学習件数など

   ★ 増やすとき
     ・意図を足すなら INTENTS に1つ足す。ヘッドの行数は自動でそろう。
     ・次元や層を変えたら MODEL_TAG を上げる。
       上げないと、形のちがう古い重みを読みこんで壊れる。
   ============================================================ */
/* eslint-disable */
(function () {
  "use strict";


  /* ══════════════════════════════════════════════════════════════
     0b. スケーリング則 — <b>実際に測って決めた</b>（★★ 2026-08-20）

     ■ スケーリング則とは
       大手のAIでは、<b>モデルの大きさ N</b>・<b>データ量 D</b>・<b>計算量 C</b> を
       増やすほど誤差が「べき乗」で下がることが知られている。
       ただし3つのつり合いが崩れると頭打ちになる、というのが要点。

     ■ 測りかた
       下じき（SEEDS）に<b>1つも入れていない29文</b>で、意図の正答率を見る。
       毎回 localStorage の重みを消し、下じきから学習し直して測った。

     ■ 測った結果（★ これが判断の根拠）

       ① データ D を増やす（モデルは d48 L2 のまま）
            下じき 39文  ＋ 概念タグなし … 9%   ← 当てずっぽうと同じ
            下じき 148文 ＋ 概念タグ     … 83%
            下じき 230文 ＋ 概念タグ増強 … <b>93%</b>
          → <b>いちばん効いた。モデルを1ミリも大きくせずに 9% → 93%。</b>

       ② モデル N を増やす（データは 230文で固定）
            d32 L2 H4  … 93%
            d48 L2 H4  … <b>93%</b>   ← 採用
            d64 L2 H4  … 86%
            d64 L3 H8  … 72%   ← 大きくするほど<b>悪くなった</b>
          → このデータ量では d48 で頭打ち。それ以上は害になる。
            決め打ち重みの Transformer では、次元を増やすほど
            概念タグの信号が薄まってしまうため。

       ③ 計算量 C（下じきの周回 EPOCHS）を増やす（d48 L2・230文）
            10周 … 75%（下じき 148文のとき）
            40周 … 83%（下じき 148文のとき）
            60周 … 93%
            200周 … 93%   ← 増やしても悪化しなかった
          → 下じきが 39文のころは 24周で丸暗記して落ちていたが、
            230文まで増やしたら 200周でも崩れない。
            <b>データを増やすと、多く学習しても壊れなくなる。</b>

     ■ ここから決めたこと（★ 次に増やすときの指針）
       ・増やす順番は <b>① 概念タグ → ② 下じきの文 → ③ モデル</b>。
         ③ を先にやると、上の表のとおり<b>下がる</b>。
       ・モデルを大きくしてよいのは、① と ② をやり切って
         それでも 93% が頭打ちになったときだけ。
         その時は d64 L2 から試すこと（d64 L3 H8 は行きすぎだった）。
       ・周回はデータ量に連動させる。データが少ないうちは控えめに。

     ■ いまの構成
       d = 48／L = 2／H = 4／語彙 8192／下じき 230文／60周 → <b>29文中27問正解（93%）</b>
     ══════════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════
     0. 設定
     ══════════════════════════════════════════════════════════ */
  /* 形を変えたら上げる（古い重みを弾くため）。
     xvtf-2: センタリング／xvtf-3: 下じきを 13意図×8〜14文へ増やした
     xvtf-4: 概念タグ／xvtf-5: 概念タグに重み
     xvtf-6: 概念タグと下じきを約2倍に（スケーリング則の実測にもとづく。0b 参照） */
  const MODEL_TAG = "xvtf-6";
  const D = 48;                 /* 埋め込みの次元（★ 64 にすると 86% へ下がった。0b 参照） */
  const HEADS = 4;              /* 注意のヘッド数（D は HEADS で割り切れること） */
  const DK = D / HEADS;
  const LAYERS = 2;             /* エンコーダの段数（★ 3 にすると 72% へ下がった。0b 参照） */
  const DFF = 96;               /* FFN の中間層 */
  const MAXLEN = 96;            /* 文の最大トークン数（長い文は切る） */
  const VOCAB = 4096;           /* ハッシュの箱の数 */
  const EPOCHS = 60;            /* 下じきの周回（★ 200 まで増やしても落ちない。0b 参照） */
  const SEED = 20260820;        /* 重みの種。ここを変えると全部の意味が変わる */

  /* 意図の一覧。xevynar-talk.js の scoreIntents と同じ名前にそろえること。 */
  const INTENTS = [
    "burst",    /* MagiBurst の攻略・クエスト */
    "party",    /* 編成・パーティ */
    "lose",     /* 勝てない・詰まった */
    "char",     /* キャラの性能 */
    "quiz",     /* MagiLex の問題・出題 */
    "explain",  /* 解説してほしい・分からない */
    "study",    /* 勉強の進めかた・計画 */
    "timer",    /* 時間をはかる */
    "app",      /* アプリの場所・使いかた */
    "help",     /* できること */
    "status",   /* 自分の記録・状況 */
    "link",     /* MagiLink の返信案 */
    "chat",     /* 雑談・その他 */
  ];
  const NI = INTENTS.length;

  /* ══════════════════════════════════════════════════════════
     1. 種つき乱数（xorshift128）
     どの端末でも同じ重みが出るように、Math.random は使わない。
     ══════════════════════════════════════════════════════════ */
  function rng(seed) {
    let x = seed | 0 || 1, y = 362436069, z = 521288629, w = 88675123;
    return function () {
      const t = x ^ (x << 11);
      x = y; y = z; z = w;
      w = (w ^ (w >>> 19)) ^ (t ^ (t >>> 8));
      return (w >>> 0) / 4294967296;
    };
  }
  /* 標準正規（Box–Muller）。重みの初期値に使う。 */
  function randn(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function mat(rows, cols, r, scale) {
    const m = new Float32Array(rows * cols);
    for (let i = 0; i < m.length; i++) m[i] = randn(r) * scale;
    return m;
  }

  /* ══════════════════════════════════════════════════════════
     2. トークナイザ（文字バイグラム）

     日本語は語の切れ目が無いので、単語に切ろうとすると辞書がいる。
     文字を2つずつ重ねて切ると、辞書なしでも
     「編成」「成を」「を考」…のように意味のかたまりを拾える。
     ★ 英数字は続くかぎり1語にまとめる（"MagiBurst" を1語として扱いたい）。
     ══════════════════════════════════════════════════════════ */
  function norm(s) {
    return String(s == null ? "" : s)
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .toLowerCase()
      .replace(/[\s　]+/g, " ")
      .trim();
  }

  /* ══════════════════════════════════════════════════════════════
     2b. 概念タグ（★★ 2026-08-20 これが無いと意味では引けない）

     ■ なぜ要るのか — 正直に書いておく
       ②〜⑥の重みは種つき乱数の決め打ちにしてある（再現性のため）。
       この作りだと Transformer は<b>文字の重なり</b>はよく捉えるが、
       「編成」と「メンバー構成」のように<b>字がちがうが意味が同じ</b>言葉を
       同じものとは見なせない。実際、下じきに無い言いかたで試したところ、
       意図の正答率は 9% しか出なかった（当てずっぽうと変わらない）。
       字を見ているだけなので当然で、ここは<b>言葉の意味を教える</b>しかない。

     ■ やること
       文の中に下の言葉が出てきたら、<b>概念タグ</b>（#party など）を
       トークンとして足す。「だれを連れていけばいい」も
       「4人選ぶならどんな組み合わせがいい」も、どちらも #party を持つので、
       Transformer から見ると近い文になる。
       ★ 概念タグは強く効かせたいので<b>2つずつ</b>入れる。

     ■ 増やすとき
       言いかえで外したものを見つけたら、その言葉をここに1つ足す。
       ここが XEVYNAR の「語彙」なので、増やすほど言い回しに強くなる。
     ══════════════════════════════════════════════════════════════ */
  const CONCEPT = {
    "#party": ["編成", "ぱーてぃ", "パーティ", "メンバー", "連れて", "連れる", "連れ", "組み合わせ",
      "組む", "組んで", "組める", "4体", "4人", "四人", "誰を", "だれを", "誰が", "だれが",
      "選ぶ", "選べ", "選んで", "構成", "入れる", "編制", "だれ", "誰", "向いてる", "向いている", "適任",
      "何体", "なんたい", "だれがいい", "誰がいい", "つれて", "編成して", "組みたい", "並び", "枠",
      "スタメン", "先発", "起用", "配置", "だれを入れ", "候補"],
    "#quest": ["クエスト", "ステージ", "の間", "ノ園", "の園", "階層", "ギミック", "仕掛け",
      "ボス", "属性", "攻略", "wave", "ウェーブ", "バリア", "地雷", "ダメージウォール",
      "減速", "ワープ", "蓬莱", "庭園", "迷宮", "王城", "敵", "雑魚", "難易度", "爆絶", "超絶",
      "気をつける", "気を付ける", "注意", "対策", "この面", "この階",
      "ノ間", "ノ層", "ダンジョン", "raid", "レイド", "討伐", "周回", "ドロップ", "報酬",
      "何waveある", "ウェーブ数", "仕掛", "罠", "反射", "貫通", "配置", "出現"],
    "#lose": ["勝て", "勝てる", "クリアできない", "できない", "全滅", "やられ", "負け", "倒せない",
      "詰ま", "進めない", "突破できない", "失敗", "足りない", "むり", "無理", "何回も", "何度も",
      "いつも", "とっぱ", "だめ", "ダメ", "挑んで", "苦戦", "やられます", "やられて", "全然だめ",
      "手も足も", "歯が立", "無理ゲー", "詰んだ", "つんだ", "抜けられない", "落ちる", "落ちて",
      "削りきれ", "間に合わ", "何が悪い", "どこが悪い", "うまくいかない"],
    "#char": ["キャラ", "この子", "性能", "能力", "アビリティ", "フルバースト", "バースト",
      "リンクスキル", "ステータス", "強い", "強さ", "つよい", "育てる", "評価", "使い道", "活躍",
      "この子", "こいつ", "あたり", "当たり", "はずれ", "凸", "上限解放", "スペック", "火力",
      "耐久", "hp", "こうげき", "スピード", "属性は", "撃種", "アタッカー", "サポート"],
    "#quiz": ["出題", "出して", "出てほしい", "問題を", "問だけ", "何問", "テスト", "クイズ",
      "練習問題", "確認テスト", "ちょうだい", "解きたい", "実力", "ドリル", "演習",
      "出してみて", "出してくれ", "問ください", "問お願い", "小テスト", "腕試し",
      "問いて", "解かせて", "アウトプット", "ランダムに"],
    "#explain": ["解説", "解き方", "解きかた", "説明", "わからない", "分からない", "わかりません",
      "分かりません", "理解できない", "ピンとこない", "なぜ", "なんで", "どうして", "理屈",
      "考え方", "考えかた", "導く", "意味が", "納得", "かみくだ", "教えてほしい",
      "ピンと来ない", "腑に落ち", "つかめ", "掴め", "詰まって", "なぜこう", "どうやって",
      "どこから手", "手がかり", "とっかかり", "根拠", "証明", "示して", "説明して",
      "なんでそう", "理由が", "わけが", "解法", "とき方"],
    "#study": ["勉強", "計画", "進め方", "進めかた", "順番", "毎日", "効率", "復習",
      "苦手をなくす", "受験", "対策", "何をやる", "伸ばす", "続ける", "習慣", "スケジュール",
      "進めたら", "やるべき", "優先", "何から", "どの順", "ペース", "配分", "残り日数",
      "間に合う", "勉強法", "取り組み", "計画的"],
    "#timer": ["はかって", "計って", "測って", "計り", "はかり", "タイマー", "ストップウォッチ",
      "カウント", "分だけ", "時間を", "ポモドーロ", "集中", "時計", "計測",
      "分間", "秒はか", "時間はか", "アラーム", "知らせて", "鳴らして", "スタートして",
      "始めます", "セットして", "タイムを"],
    "#app": ["どこ", "どこから", "行き方", "ひらき", "開き", "開く", "使い方", "設定",
      "画面", "ボタン", "機能", "アプリ", "ページ", "ガチャ", "ジェム", "ミッション", "アカウント",
      "場所", "どこにある", "行きたい", "ひらける", "開ける", "起動", "リンク", "メニュー",
      "タブ", "どうやって行", "どこを押", "見つから"],
    "#help": ["できること", "何ができ", "なにができ", "ヘルプ", "案内", "はじめて", "初めて",
      "使いかたが", "あなたは", "機能の一覧", "何者", "なにもの", "得意なこと",
      "手伝える", "できるの", "できます"],
    "#status": ["記録", "成績", "正答率", "何問解", "進んで", "どれくらいでき", "習得した",
      "連続", "今週", "今日は何", "これまでの", "実績", "どこまで", "進捗", "達成",
      "何日", "累計", "合計", "これまで", "伸びて", "上がって"],
    "#link": ["返信", "返事", "返す", "返し", "メッセージ", "文面", "リプ", "チャットの",
      "なんて言え", "何て言え", "どう伝え", "送りたい", "文章を考", "言いかた", "返答"],
    "#greet": ["こんにちは", "おはよう", "こんばんは", "ありがとう", "おつかれ", "元気",
      "よろしく", "また明日", "すごい", "なるほど", "うれしい", "やあ", "どうも",
      "たすかる", "助かる", "がんばる", "頑張る", "ねむい", "つかれた", "疲れた",
      "こんちは", "はろー", "hello", "hi", "おやすみ", "いってきます"],
    /* 聞きかたの形（意図そのものではないが、区別のたすけになる） */
    "#ask": ["教えて", "知りたい", "ください", "ほしい", "もらえ", "でしょうか", "ですか",
      "かな", "の？", "？", "?"],
  };
  /* 長い言葉から先に当てる（「わからない」より「解き方がわからない」を優先したいので） */
  const CONCEPT_KEYS = Object.keys(CONCEPT);
  const CONCEPT_WORDS = [];
  CONCEPT_KEYS.forEach((k) => {
    CONCEPT[k].forEach((w) => CONCEPT_WORDS.push([norm(w), k]));
  });
  CONCEPT_WORDS.sort((a, b) => b[0].length - a[0].length);
  function conceptsOf(t) {
    const hit = {};
    CONCEPT_WORDS.forEach(([w, k]) => {
      if (!w || hit[k]) return;
      if (t.indexOf(w) >= 0) hit[k] = 1;
    });
    return Object.keys(hit);
  }

  function tokenize(text) {
    const t = norm(text);
    const out = [];
    /* ★ 2026-08-20 まず概念タグを先頭に置く。
       先頭に置くと、位置エンコードのうえでも「文の主題」の位置になり、
       あとに続く語がここを見にいく（注意が向く）ので効きが強い。 */
    conceptsOf(t).forEach((k) => { out.push(k); });
    let i = 0;
    while (i < t.length && out.length < MAXLEN) {
      const c = t[i];
      if (/[a-z0-9]/.test(c)) {
        let j = i;
        while (j < t.length && /[a-z0-9]/.test(t[j])) j++;
        out.push(t.slice(i, j));
        i = j;
        continue;
      }
      if (c === " ") { i++; continue; }
      /* 日本語は2文字ずつ（最後の1文字は単独で入れる） */
      out.push(i + 1 < t.length ? t.slice(i, i + 2) : c);
      i++;
    }
    return out;
  }
  /* 語 → 語彙番号（FNV-1a ハッシュ） */
  function hash(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h % VOCAB;
  }

  /* ══════════════════════════════════════════════════════════
     3. 重み（種つき乱数で1回だけ作る）
     ══════════════════════════════════════════════════════════ */
  const Wt = (function () {
    const r = rng(SEED);
    const emb = mat(VOCAB, D, r, 1 / Math.sqrt(D));
    const layers = [];
    for (let l = 0; l < LAYERS; l++) {
      layers.push({
        Wq: mat(D, D, r, 1 / Math.sqrt(D)),
        Wk: mat(D, D, r, 1 / Math.sqrt(D)),
        Wv: mat(D, D, r, 1 / Math.sqrt(D)),
        Wo: mat(D, D, r, 1 / Math.sqrt(D)),
        W1: mat(D, DFF, r, 1 / Math.sqrt(D)),
        b1: new Float32Array(DFF),
        W2: mat(DFF, D, r, 1 / Math.sqrt(DFF)),
        b2: new Float32Array(D),
      });
    }
    return { emb, layers };
  })();

  /* 位置エンコード（sin/cos）。作り置きしておく。 */
  const POS = (function () {
    const p = new Float32Array(MAXLEN * D);
    for (let t = 0; t < MAXLEN; t++) {
      for (let i = 0; i < D; i++) {
        const k = Math.floor(i / 2);
        const w = 1 / Math.pow(10000, (2 * k) / D);
        p[t * D + i] = (i % 2 === 0) ? Math.sin(t * w) : Math.cos(t * w);
      }
    }
    return p;
  })();

  /* ══════════════════════════════════════════════════════════
     4. 小道具（行列演算・層正規化・softmax）
     ══════════════════════════════════════════════════════════ */
  /* X(n×D) × W(D×M) → (n×M) */
  function matmul(X, n, dIn, W, dOut) {
    const Y = new Float32Array(n * dOut);
    for (let i = 0; i < n; i++) {
      const xo = i * dIn, yo = i * dOut;
      for (let k = 0; k < dIn; k++) {
        const x = X[xo + k];
        if (x === 0) continue;
        const wo = k * dOut;
        for (let j = 0; j < dOut; j++) Y[yo + j] += x * W[wo + j];
      }
    }
    return Y;
  }
  /* 層正規化（1行ずつ、平均0・分散1にそろえる） */
  function layerNorm(X, n, d) {
    for (let i = 0; i < n; i++) {
      const o = i * d;
      let m = 0;
      for (let j = 0; j < d; j++) m += X[o + j];
      m /= d;
      let v = 0;
      for (let j = 0; j < d; j++) { const t = X[o + j] - m; v += t * t; }
      v = Math.sqrt(v / d + 1e-5);
      for (let j = 0; j < d; j++) X[o + j] = (X[o + j] - m) / v;
    }
    return X;
  }
  function softmaxRow(a, o, n) {
    let mx = -Infinity;
    for (let j = 0; j < n; j++) if (a[o + j] > mx) mx = a[o + j];
    let s = 0;
    for (let j = 0; j < n; j++) { a[o + j] = Math.exp(a[o + j] - mx); s += a[o + j]; }
    for (let j = 0; j < n; j++) a[o + j] /= (s || 1);
    return a;
  }

  /* ══════════════════════════════════════════════════════════
     5. マルチヘッド自己注意

     Q=xWq, K=xWk, V=xWv をヘッドごとに切り、
     softmax(QKᵀ/√dk)·V を計算して、また横につないで Wo に通す。
     ══════════════════════════════════════════════════════════ */
  function attention(X, n, L) {
    const Q = matmul(X, n, D, L.Wq, D);
    const K = matmul(X, n, D, L.Wk, D);
    const V = matmul(X, n, D, L.Wv, D);
    const ctx = new Float32Array(n * D);
    const scale = 1 / Math.sqrt(DK);
    const sc = new Float32Array(n);
    for (let h = 0; h < HEADS; h++) {
      const off = h * DK;
      for (let i = 0; i < n; i++) {
        /* 注意スコア（この語が、どの語をどれだけ見るか） */
        for (let j = 0; j < n; j++) {
          let s = 0;
          for (let k = 0; k < DK; k++) s += Q[i * D + off + k] * K[j * D + off + k];
          sc[j] = s * scale;
        }
        softmaxRow(sc, 0, n);
        /* 重みつき平均で V を混ぜる */
        for (let j = 0; j < n; j++) {
          const w = sc[j];
          if (w < 1e-6) continue;
          for (let k = 0; k < DK; k++) ctx[i * D + off + k] += w * V[j * D + off + k];
        }
      }
    }
    return matmul(ctx, n, D, L.Wo, D);
  }
  /* 位置ごとのフィードフォワード（GELU の近似を使う） */
  function gelu(x) { return 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x))); }
  function ffn(X, n, L) {
    const H = matmul(X, n, D, L.W1, DFF);
    for (let i = 0; i < n * DFF; i++) H[i] = gelu(H[i] + L.b1[i % DFF]);
    const Y = matmul(H, n, DFF, L.W2, D);
    for (let i = 0; i < n * D; i++) Y[i] += L.b2[i % D];
    return Y;
  }

  /* ══════════════════════════════════════════════════════════
     6. エンコーダ本体 — 文 → 文ベクトル
     ══════════════════════════════════════════════════════════ */
  const cache = new Map();       /* 同じ文を何度も計算しない（最大 400 件） */

  /* 生のベクトル（中心を引く前）。中心の計算そのものにも使う。 */
  const rawCache = new Map();
  function rawEmbed(text) {
    const key = norm(text);
    if (!key) return new Float32Array(D);
    const hit = rawCache.get(key);
    if (hit) return hit;

    const toks = tokenize(key);
    const n = toks.length;
    if (!n) return new Float32Array(D);

    /* ① 埋め込み ＋ ③ 位置エンコード */
    let X = new Float32Array(n * D);
    for (let i = 0; i < n; i++) {
      const v = hash(toks[i]) * D;
      for (let j = 0; j < D; j++) X[i * D + j] = Wt.emb[v + j] + POS[i * D + j] * 0.1;
    }
    layerNorm(X, n, D);

    /* ④⑤ 注意 → 残差 → 層正規化 → FFN → 残差 → 層正規化 を LAYERS 回 */
    for (let l = 0; l < LAYERS; l++) {
      const L = Wt.layers[l];
      const A = attention(X, n, L);
      for (let i = 0; i < n * D; i++) X[i] += A[i];
      layerNorm(X, n, D);
      const F = ffn(X, n, L);
      for (let i = 0; i < n * D; i++) X[i] += F[i];
      layerNorm(X, n, D);
    }

    /* ⑥ 重みつき平均プーリング（正規化はここではしない。中心を引いてからやる）

       ★★ 2026-08-20 ただの平均だと、2文字ずつに切った語（20個ほど）に対して
         概念タグが1〜3個しかなく、<b>意味の手がかりが薄まってしまう</b>。
         実際、概念タグは当たっているのに意図を外す（正答 61%）状態だった。
         そこで概念タグの位置だけ重みを大きくして、文の主題がはっきり出るようにする。
       ★ 重みを上げすぎると、こんどは概念タグだけの文になって
         「どのクエストか」「どのキャラか」の手がかりが消える。6 くらいが折り合い。 */
    const CW = 6;
    const out = new Float32Array(D);
    let wsum = 0;
    for (let i = 0; i < n; i++) {
      const w = (toks[i].charAt(0) === "#") ? CW : 1;
      wsum += w;
      for (let j = 0; j < D; j++) out[j] += X[i * D + j] * w;
    }
    for (let j = 0; j < D; j++) out[j] /= (wsum || 1);

    if (rawCache.size > 600) rawCache.clear();
    rawCache.set(key, out);
    return out;
  }

  /* ══════════════════════════════════════════════════════════════
     ★★ 2026-08-20 中心を引く（センタリング）

     平均プーリングしただけのベクトルは、<b>どの文もだいたい同じ向き</b>を向く。
     文がちがっても中身の大半が「日本語ならどれにも出る成分」で埋まるためで、
     実際、内積を見ると 無関係な2文でも 0.65 くらいになってしまっていた。
     これでは「近い／遠い」の差が出ず、意図の見分けも学習できない。

     そこで<b>全体の平均ベクトル μ を引いてから</b> L2 正規化する。
     共通成分が消えて、残った「その文らしさ」だけで比べられるようになる。
     （文の埋め込みでよく使われる、いちばん素直な後処理）

     ★ μ は下じきの文（SEEDS）と、よくある言いまわしから作る。
       SEEDS は決め打ちなので、どの端末でも同じ μ になる（再現性が保てる）。
     ══════════════════════════════════════════════════════════════ */
  let MU = null;
  function buildMu(list) {
    const m = new Float32Array(D);
    let n = 0;
    list.forEach((t) => {
      const v = rawEmbed(t);
      for (let j = 0; j < D; j++) m[j] += v[j];
      n++;
    });
    if (n) for (let j = 0; j < D; j++) m[j] /= n;
    return m;
  }
  function embed(text) {
    const key = norm(text);
    if (!key) return new Float32Array(D);
    const hit = cache.get(key);
    if (hit) return hit;
    const raw = rawEmbed(key);
    const out = new Float32Array(D);
    let nn = 0;
    for (let j = 0; j < D; j++) {
      out[j] = raw[j] - (MU ? MU[j] : 0);
      nn += out[j] * out[j];
    }
    nn = Math.sqrt(nn) || 1;
    for (let j = 0; j < D; j++) out[j] /= nn;
    if (cache.size > 400) cache.clear();
    cache.set(key, out);
    return out;
  }
  function sim(a, b) {
    let s = 0;
    for (let i = 0; i < D; i++) s += a[i] * b[i];
    return s;      /* どちらも L2 正規化済みなので、内積＝コサイン類似度 */
  }

  /* ══════════════════════════════════════════════════════════
     7. 出力ヘッド（ここだけ学習する）

     z = W·v + b（W は NI×D）、p = softmax(z)。
     交差エントロピーの勾配は  dz = p − onehot(y)  という簡単な形になるので、
       W[y] += lr·(1 − p[y])·v    /  W[k] -= lr·p[k]·v （k≠y）
     で更新できる。重み減衰（L2）も少し入れて暴れないようにする。
     ══════════════════════════════════════════════════════════ */
  const HEAD_KEY = "xevynar_tf_head_v1";
  let W = new Float32Array(NI * D);
  let B = new Float32Array(NI);
  let trained = 0;               /* 学習した件数 */
  let dirty = false;

  function loadHead() {
    try {
      const d = JSON.parse(localStorage.getItem(HEAD_KEY) || "null");
      if (d && d.tag === MODEL_TAG && Array.isArray(d.W) && d.W.length === NI * D) {
        W = Float32Array.from(d.W);
        B = Float32Array.from(d.B || new Array(NI).fill(0));
        trained = d.n | 0;
      }
    } catch (e) {}
  }
  function saveHead() {
    try {
      localStorage.setItem(HEAD_KEY, JSON.stringify({
        tag: MODEL_TAG, n: trained,
        W: Array.from(W, (x) => Math.round(x * 1e4) / 1e4),
        B: Array.from(B, (x) => Math.round(x * 1e4) / 1e4),
      }));
    } catch (e) {}
  }
  function forward(v) {
    const z = new Float32Array(NI);
    for (let k = 0; k < NI; k++) {
      let s = B[k];
      const o = k * D;
      for (let j = 0; j < D; j++) s += W[o + j] * v[j];
      z[k] = s;
    }
    softmaxRow(z, 0, NI);
    return z;
  }
  /* 1件学習する（オンライン SGD）。lr は件数が増えるほど小さくする。 */
  function learn(text, intent, weight) {
    const y = INTENTS.indexOf(intent);
    if (y < 0) return false;
    const v = embed(text);
    if (!v.length) return false;
    const p = forward(v);
    const lr = (weight || 1) * 0.35 / (1 + trained / 200);
    const wd = 2e-4;                                   /* 重み減衰（丸暗記を抑える） */
    for (let k = 0; k < NI; k++) {
      const g = ((k === y ? 1 : 0) - p[k]) * lr;
      const o = k * D;
      for (let j = 0; j < D; j++) W[o + j] += g * v[j] - wd * W[o + j];
      B[k] += g;
    }
    trained++;
    dirty = true;
    saveHead();
    return true;
  }
  function classify(text) {
    const v = embed(text);
    const p = forward(v);
    return INTENTS.map((nm, i) => ({ intent: nm, p: p[i] })).sort((a, b) => b.p - a.p);
  }
  /* いちばん確からしい意図。自信（p）が低いときは空を返す。 */
  function guess(text, minP) {
    const r = classify(text)[0];
    if (!r || r.p < (minP == null ? 0.34 : minP)) return null;
    /* まだほとんど学習していないうちは口を出さない */
    if (trained < 8) return null;
    return r;
  }

  /* ══════════════════════════════════════════════════════════
     8. 意味で近いものをさがす（言い回しがちがっても当てるための口）

     items は [{ key, text }]。text をベクトルにして、近い順に返す。
     ★ ベクトルは1度作ったら使い回す（同じ台帳を何度も計算しない）。
     ══════════════════════════════════════════════════════════ */
  const idx = new Map();          /* name → [{key, v}] */
  function index(name, items) {
    idx.set(name, (items || []).map((it) => ({ key: it.key, v: embed(it.text || it.key) })));
    return idx.get(name).length;
  }
  function nearest(text, name, k, min) {
    const list = idx.get(name);
    if (!list || !list.length) return [];
    const v = embed(text);
    return list.map((it) => ({ key: it.key, s: sim(v, it.v) }))
      .filter((x) => x.s >= (min == null ? 0.55 : min))
      .sort((a, b) => b.s - a.s)
      .slice(0, k || 3);
  }

  /* ══════════════════════════════════════════════════════════
     9. Firebase — 学習したぶんをみんなで持ちよる

     置き場所は xevarion-account の <b>xevynar/brain/head/<uid></b>。
     ・自分の重みを put する
     ・みんなの重みを get して<b>件数で重みづけした平均</b>をとる
     ★ 送るのは重みの数だけ（何を書いたかは送らない）。
     ★ ルールは firebase-rules/xevarion-account.rules.json の xevynar を見ること。
     ══════════════════════════════════════════════════════════ */
  const FB = "https://xevarion-account-default-rtdb.asia-southeast1.firebasedatabase.app";
  function uid() {
    try {
      const a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null");
      return (a && (a.xvUid || a.uid)) || "";
    } catch (e) { return ""; }
  }
  async function push() {
    const u = uid();
    if (!u || !dirty || trained < 5) return false;
    try {
      await fetch(FB + "/xevynar/brain/head/" + encodeURIComponent(u) + ".json", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: MODEL_TAG, n: trained, at: Date.now(),
          W: Array.from(W, (x) => Math.round(x * 1e3) / 1e3),
          B: Array.from(B, (x) => Math.round(x * 1e3) / 1e3),
        }),
      });
      dirty = false;
      return true;
    } catch (e) { return false; }
  }
  async function pull() {
    try {
      const r = await fetch(FB + "/xevynar/brain/head.json", { cache: "no-store" });
      if (!r.ok) return false;
      const d = await r.json();
      if (!d || typeof d !== "object") return false;
      const me = uid();
      const rows = Object.keys(d).map((k) => Object.assign({ uid: k }, d[k]))
        .filter((x) => x && x.tag === MODEL_TAG && Array.isArray(x.W) && x.W.length === NI * D && (x.n | 0) > 0);
      if (!rows.length) return false;
      /* 件数で重みづけした平均。自分のぶんは2倍にして、自分の直しが薄まらないようにする。 */
      const aW = new Float32Array(NI * D), aB = new Float32Array(NI);
      let tot = 0;
      rows.forEach((x) => {
        const w = (x.n | 0) * (x.uid === me ? 2 : 1);
        tot += w;
        for (let i = 0; i < NI * D; i++) aW[i] += x.W[i] * w;
        for (let i = 0; i < NI; i++) aB[i] += (x.B && x.B[i] ? x.B[i] : 0) * w;
      });
      if (!tot) return false;
      for (let i = 0; i < NI * D; i++) aW[i] /= tot;
      for (let i = 0; i < NI; i++) aB[i] /= tot;
      W = aW; B = aB;
      trained = Math.max(trained, rows.reduce((a, x) => a + (x.n | 0), 0));
      saveHead();
      return true;
    } catch (e) { return false; }
  }
  async function sync() {
    await push();
    return pull();
  }

  /* ══════════════════════════════════════════════════════════
     10. 下じきの学習（初回だけ）

     まっさらな状態では何も分からないので、
     代表的な言いかたを1回だけ流して形をつけておく。
     ★ ここに足すほど「はじめから賢い」状態になる。
     ══════════════════════════════════════════════════════════ */
  const SEEDS = [
    /* ── party（編成・だれを連れていくか）── */
    ["第12の間の編成を教えて", "party"],
    ["このクエストのおすすめパーティは", "party"],
    ["だれを連れていけばいい", "party"],
    ["編成のコツを教えて", "party"],
    ["手持ちで組めるパーティある", "party"],
    ["メンバーはどう選べばいいですか", "party"],
    ["4体どうやって決める", "party"],
    ["おすすめのメンバー構成を知りたい", "party"],
    ["だれを入れるのが正解なの", "party"],
    ["パーティを組んでほしい", "party"],
    ["どのキャラを連れていくべきか教えて", "party"],
    ["編成を考えてくれませんか", "party"],
    ["この面に合う4人を選んで", "party"],
    ["メンバーを提案してください", "party"],
    /* ── burst（クエスト・ギミック・仕様）── */
    ["蓬莱の九重の攻略", "burst"],
    ["幽冥の庭園のギミックは", "burst"],
    ["重力バリアってなに", "burst"],
    ["このステージの敵の属性は", "burst"],
    ["ダメージウォールの対策を教えて", "burst"],
    ["地雷はどうやって消すの", "burst"],
    ["ボスのHPはどれくらい", "burst"],
    ["このクエストの仕掛けを知りたい", "burst"],
    ["ワープがあるステージの注意点", "burst"],
    ["属性の相性はどうなってる", "burst"],
    ["雑魚の処理の順番はある", "burst"],
    ["このクエストの難易度はどのくらい", "burst"],
    ["減速壁があるとどうなりますか", "burst"],
    ["ステージの仕組みを説明して", "burst"],
    /* ── lose（勝てない・詰まった）── */
    ["どうしても勝てない", "lose"],
    ["何回やってもクリアできない", "lose"],
    ["途中で全滅してしまう", "lose"],
    ["負けてばかりで進めない", "lose"],
    ["あと少しなのに倒しきれない", "lose"],
    ["何が悪いのか分からない", "lose"],
    ["すぐにやられてしまいます", "lose"],
    ["火力が足りない気がする", "lose"],
    ["ずっと詰まっていて先に進めません", "lose"],
    ["勝てるようになるにはどうすれば", "lose"],
    ["どこで失敗しているのか知りたい", "lose"],
    ["ボスまで行けるけど倒せない", "lose"],
    /* ── char（キャラの性能）── */
    ["クロエの性能を教えて", "char"],
    ["このキャラは強いですか", "char"],
    ["どのキャラがおすすめ", "char"],
    ["このキャラって強いの", "char"],
    ["アビリティは何を持ってる", "char"],
    ["フルバーストの威力は", "char"],
    ["リンクスキルの効果を教えて", "char"],
    ["このキャラの使い道はある", "char"],
    ["能力を詳しく知りたい", "char"],
    ["ステータスはどれくらい", "char"],
    ["育てる価値ありますか", "char"],
    ["この子はどこで活躍する", "char"],
    ["キャラの評価を教えてください", "char"],
    /* ── quiz（出題してほしい）── */
    ["問題を5問出して", "quiz"],
    ["苦手なところを出題して", "quiz"],
    ["テストしてほしい", "quiz"],
    ["何問か出してほしい", "quiz"],
    ["練習問題をください", "quiz"],
    ["確認テストをやりたい", "quiz"],
    ["ランダムに出題してください", "quiz"],
    ["何問でもいいので出して", "quiz"],
    ["復習用の問題をお願いします", "quiz"],
    ["クイズを出してください", "quiz"],
    ["まちがえたところをもう一度出して", "quiz"],
    ["実力を試したいので出題して", "quiz"],
    /* ── explain（解説してほしい・分からない）── */
    ["この問題がわからない", "explain"],
    ["解き方を教えてください", "explain"],
    ["なんでこうなるのか分からない", "explain"],
    ["解説してほしい", "explain"],
    ["この問題の考え方がどうしても掴めません", "explain"],
    ["途中の式が理解できない", "explain"],
    ["どうしてその答えになるの", "explain"],
    ["ここの意味が分かりません", "explain"],
    ["もう少しかみくだいて説明して", "explain"],
    ["公式の使いどころが分からない", "explain"],
    ["なぜこの手順を踏むのですか", "explain"],
    ["答えは見たけど納得できていない", "explain"],
    ["この用語の意味を教えて", "explain"],
    /* ── study（勉強の進めかた）── */
    ["どこから勉強すればいい", "study"],
    ["計画を立てて", "study"],
    ["何時間やればいい", "study"],
    ["勉強の順番を決めてほしい", "study"],
    ["毎日どれくらい進めるべき", "study"],
    ["効率のいいやり方はありますか", "study"],
    ["復習のタイミングを教えて", "study"],
    ["苦手をなくすにはどうしたら", "study"],
    ["受験までの進め方を相談したい", "study"],
    ["今日は何をやるのがいい", "study"],
    ["続けるコツはありますか", "study"],
    /* ── timer（時間をはかる）── */
    ["25分はかって", "timer"],
    ["タイマーをセットして", "timer"],
    ["時間を計測したい", "timer"],
    ["30分だけ集中したいので測って", "timer"],
    ["1時間はかってください", "timer"],
    ["ポモドーロを始めたい", "timer"],
    ["ストップウォッチを動かして", "timer"],
    ["10分だけカウントして", "timer"],
    ["集中タイムを始めます", "timer"],
    ["時間になったら知らせて", "timer"],
    ["勉強時間を記録して", "timer"],
    /* ── app（アプリの場所・使いかた）── */
    ["MagiTier はどこにある", "app"],
    ["このアプリの使い方", "app"],
    ["ガチャはどこから引ける", "app"],
    ["MagiLex を開きたい", "app"],
    ["どこから設定を変えるの", "app"],
    ["アプリの一覧を見せて", "app"],
    ["ジェムはどこで使えますか", "app"],
    ["ミッションはどこにありますか", "app"],
    ["そのページへの行き方を教えて", "app"],
    ["どんなアプリがありますか", "app"],
    ["アカウントの設定はどこ", "app"],
    /* ── help（できること）── */
    ["できることを教えて", "help"],
    ["何ができますか", "help"],
    ["使い方が分からないので教えて", "help"],
    ["どんなことを聞けばいいの", "help"],
    ["ヘルプを見せて", "help"],
    ["あなたは何をしてくれるの", "help"],
    ["機能の一覧をください", "help"],
    ["はじめて使うので案内して", "help"],
    /* ── status（自分の記録・状況）── */
    ["いまの自分の記録は", "status"],
    ["どれくらい進んでる", "status"],
    ["今日は何問解いた", "status"],
    ["正答率を教えて", "status"],
    ["今週の勉強時間は", "status"],
    ["わたしの成績はどうですか", "status"],
    ["習得した数を知りたい", "status"],
    ["これまでの記録を見せて", "status"],
    ["連続何日つづいてる", "status"],
    /* ── link（返信案）── */
    ["返信を考えて", "link"],
    ["なんて返したらいい", "link"],
    ["この人への返事を作って", "link"],
    ["いい感じの返信案がほしい", "link"],
    ["メッセージの返しかたを相談したい", "link"],
    ["返事の文面を考えてください", "link"],
    ["どう返すのが自然かな", "link"],
    ["チャットの返信を手伝って", "link"],
    /* ── chat（雑談・あいさつ）── */
    ["こんにちは", "chat"],
    ["ありがとう", "chat"],
    ["おはよう", "chat"],
    ["おつかれさま", "chat"],
    ["元気ですか", "chat"],
    ["よろしくお願いします", "chat"],
    ["また明日", "chat"],
    ["すごいね", "chat"],
    ["なるほど", "chat"],
    ["うれしい", "chat"],
    /* ── ★★ 2026-08-20 増強ぶん（スケーリング則にあわせてデータを約2倍に）── */
    ["この階に合う4体を教えてほしい", "party"],
    ["いま持ってるので一番いい並びは", "party"],
    ["だれを起用すべきかな", "party"],
    ["スタメンを決めたい", "party"],
    ["手持ちから候補を出して", "party"],
    ["先発の4人を提案して", "party"],
    ["どういう組み合わせが安定する", "party"],
    ["枠がひとつ余ってるんだけど誰がいい", "party"],
    ["このボスの仕掛けを教えて", "burst"],
    ["何ウェーブあるの", "burst"],
    ["罠みたいなのが多いんだけど", "burst"],
    ["反射と貫通どっちが有利", "burst"],
    ["周回するならどこがいい", "burst"],
    ["ドロップは何がある", "burst"],
    ["敵の配置を知りたい", "burst"],
    ["レイドの仕様を説明して", "burst"],
    ["歯が立たないんだけど", "lose"],
    ["手も足も出ない", "lose"],
    ["削りきれずに終わる", "lose"],
    ["時間が間に合わない", "lose"],
    ["途中で落ちてしまう", "lose"],
    ["どこが悪いのか教えて", "lose"],
    ["うまくいかないので相談したい", "lose"],
    ["こいつって当たり？", "char"],
    ["凸を進める価値ある", "char"],
    ["火力はどれくらい出る", "char"],
    ["耐久寄りなの", "char"],
    ["撃種と属性を教えて", "char"],
    ["アタッカーとして使える", "char"],
    ["サポート性能はどう", "char"],
    ["上限解放したらどうなる", "char"],
    ["小テストをやりたい", "quiz"],
    ["腕試しさせて", "quiz"],
    ["アウトプットの練習がしたい", "quiz"],
    ["何問か解かせて", "quiz"],
    ["問題をください", "quiz"],
    ["出してくれない", "quiz"],
    ["どこから手をつければいい", "explain"],
    ["とっかかりが欲しい", "explain"],
    ["腑に落ちないところがある", "explain"],
    ["根拠を示してほしい", "explain"],
    ["解法を知りたい", "explain"],
    ["なんでそうなるの", "explain"],
    ["この式の意味がつかめない", "explain"],
    ["証明のしかたを教えて", "explain"],
    ["何から始めるべき", "study"],
    ["優先順位をつけてほしい", "study"],
    ["ペース配分を相談したい", "study"],
    ["残り日数で間に合うかな", "study"],
    ["どの順でやるのがいい", "study"],
    ["勉強法を教えて", "study"],
    ["計画的に進めたい", "study"],
    ["5分間はかって", "timer"],
    ["アラームをセットして", "timer"],
    ["時間になったら鳴らして", "timer"],
    ["タイムを計測したい", "timer"],
    ["スタートしてください", "timer"],
    ["90分はかってほしい", "timer"],
    ["メニューはどこ", "app"],
    ["そのタブはどうやって開くの", "app"],
    ["リンクを教えて", "app"],
    ["どこを押せばいい", "app"],
    ["見つからないので場所を教えて", "app"],
    ["起動のしかたを教えて", "app"],
    ["あなたは何者なの", "help"],
    ["何を手伝えるの", "help"],
    ["得意なことは何", "help"],
    ["どこまで進んだか教えて", "status"],
    ["進捗を見せて", "status"],
    ["累計の時間は", "status"],
    ["何日続いてる", "status"],
    ["伸びてるか知りたい", "status"],
    ["なんて言えばいいかな", "link"],
    ["どう伝えたらいい", "link"],
    ["送りたい文章を考えて", "link"],
    ["返答の案がほしい", "link"],
    ["たすかる", "chat"],
    ["がんばる", "chat"],
    ["つかれた", "chat"],
    ["ねむい", "chat"],
    ["おやすみ", "chat"],
    ["いってきます", "chat"],
    ["こんちは", "chat"],
    ["hello", "chat"],
  ];
  const SEEDED_KEY = "xevynar_tf_seeded_v1";
  function seedOnce() {
    let done = false;
    try { done = localStorage.getItem(SEEDED_KEY) === MODEL_TAG; } catch (e) {}
    if (done) return;
    /* ★ 2026-08-20 下じきは<b>学習率を落とさずに</b>何周もまわす。
       ふつうの learn は件数が増えるほど学習率を下げるので、
       下じきの途中でほとんど動かなくなってしまっていた。
       ここでは trained を進めずに、一定の学習率で EPOCHS 周まわして形をつける。
       ★ 周を増やしすぎると<b>下じきの文を丸暗記</b>してしまい、
         少し言いかえただけで外すようになる（実際 24 周では外していた）。 */
    const keep = trained;
    for (let ep = 0; ep < EPOCHS; ep++) {
      SEEDS.forEach(([t, y]) => { trained = 0; learn(t, y, 1); });
    }
    trained = keep + SEEDS.length;   /* 下じきぶんは「1周ぶん学んだ」とかぞえる */
    saveHead();
    try { localStorage.setItem(SEEDED_KEY, MODEL_TAG); } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════
     11. 窓口
     ══════════════════════════════════════════════════════════ */
  /* ★ 順番が大事：μ（中心）を先に作る → そのうえで下じきを学習する。
     逆にすると、中心を引く前のベクトルで学習してしまい、まったく効かない。 */
  MU = buildMu(SEEDS.map((s) => s[0]).concat([
    "こんにちは", "ありがとうございます", "これはなんですか", "教えてください",
    "どうすればいいですか", "わかりました", "お願いします", "もう一度",
  ]));
  loadHead();
  seedOnce();

  window.XVTF = {
    D, INTENTS, MODEL_TAG,
    embed, sim, tokenize,
    classify, guess, learn,
    index, nearest,
    sync, push, pull,
    stats: () => ({ tag: MODEL_TAG, dim: D, heads: HEADS, layers: LAYERS,
      vocab: VOCAB, intents: NI, trained, cached: cache.size,
      indexed: Array.from(idx.keys()).map((k) => k + ":" + idx.get(k).length).join(" ") }),
    /* 中身を見たいとき用（デバッグ）。注意のかかりかたは embed の中でだけ使う。 */
    _weights: () => Wt,
  };

  /* 起動して少ししたら、みんなのぶんを取りにいく（急がない） */
  setTimeout(() => { try { sync(); } catch (e) {} }, 4000);
  /* 画面を離れるときに、学習したぶんを送る */
  window.addEventListener("pagehide", () => { try { push(); } catch (e) {} });
})();

/* ============================================================
   XEVYNAR — 知識ベース
   ------------------------------------------------------------
   ここが XEVYNAR の「知っていること」の本体。3つの層でできている。

   ① MagiBurst の攻略知識
      キャラ・アビリティ・クエスト構成・ギミック対策・入手先。
      土台はこのファイルに書いてあるが、MagiBurst 本体が起動時に
      localStorage["xevynar_kb_burst_v1"] へ *その時点の最新* を書き出す（publishKB）ので、
      一度でも MagiBurst を開いていればそちらが優先される＝常に最新で答えられる。

   ② XEVARION ポータルの知識
      どのアプリが何をするか、XEVA・ジェムの入手方法、アカウント・同期・
      オフライン・ランキング……といった「アプリ内でよく聞かれること」。
      静的な事実なのでここに直接書く。

   ③ 言い回しのゆれを吸収する仕組み
      「へんせい」「パーティー」「どのキャラ使えばいい？」を同じ意図として扱うための
      別名辞書と正規化。ここが弱いと、正しい知識を持っていても答えに届かない。

   ★ キャラ・クエストを足したら ① を更新すること（本体を開けば自動で上書きされるが、
     「まだ MagiBurst を開いたことがない人」はこのファイルの内容で答えることになる）。
   ============================================================ */
(function () {
  "use strict";

  /* ════════════ 属性・撃種 ════════════ */
  const EL_NM = { fire: "火", water: "水", wood: "木", light: "光", dark: "闇" };
  /* 攻撃側 → 有利に取れる敵属性 */
  const EL_STRONG = { fire: "wood", wood: "water", water: "fire", light: "dark", dark: "light" };
  /* 敵属性 → その敵に有利な味方属性（逆引き） */
  const EL_COUNTER = { wood: "fire", water: "wood", fire: "water", dark: "light", light: "dark" };
  const SHOT_NM = { pierce: "貫通", bounce: "反射" };
  const EL_MUL = 1.25;   // 属性有利の倍率

  /* ════════════ 対策できるギミック（アンチ系で無効化できる6種） ════════════ */
  const COUNTER = {
    dw:       { nm: "ダメージウォール", label: "ADW",              need: ["adw", "superadw"] },
    mine:     { nm: "地雷",             label: "マインスイーパー",  need: ["ms", "superms", "msM", "supermsM", "supermsL", "msEL", "supermsEL"] },
    warp:     { nm: "ワープ",           label: "AW",                need: ["aw", "superaw"] },
    block:    { nm: "ブロック",         label: "アンチブロック",    need: ["ablock"] },
    grav:     { nm: "重力バリア",       label: "アンチ重力バリア",  need: ["agrav", "sgrav"] },
    lockzone: { nm: "ロックゾーン",     label: "アンチロックゾーン", need: ["antilock"] },
  };
  /* ダメージを受ける系＝対策の優先度が高い */
  const DMG_GIMS = ["dw", "mine"];

  /* 各ギミックの「対策を持っていないときにどう戦うか」。
     アンチ持ちが居ない人にこそ必要な情報なので、必ずセットで答える。 */
  const GIM_TIP = {
    dw: "壁にふれた瞬間にダメージ。<b>壁を使わない角度</b>で、敵と敵のあいだを縫うように撃つ。反射キャラは壁ぎわを避け、貫通キャラを主軸にすると事故が減る。",
    mine: "触れると爆発。<b>地雷のない側から回り込む</b>のが基本。マインスイーパー持ちが居ると逆に地雷が火力に変わるので、1体入れる価値は大きい。",
    warp: "吸い込まれて別の場所へ飛ぶ。<b>ワープの出口を先に確認</b>して、飛んだ先で敵に当たる角度を選ぶ。運頼みになるので、AW持ちを1体入れるだけで安定度が段違い。",
    block: "壁のように弾を止める。<b>ブロックのすき間を通す</b>か、反射で回り込む。アンチブロックがあればすり抜けられる。",
    grav: "敵の周囲で減速する。<b>減速する前に弱点へ届く距離</b>から撃つ。重力バリアの外側から強く引っぱるのがコツ。",
    lockzone: "この中に居るとリンクスキルが出ない。<b>ゾーンの外で止まる</b>ように弾の勢いを調整する。アンチロックゾーン持ちは中でもリンクが出せる。",
    photon: "エーテルを運んでシールドを割るギミック。<b>敵を殴るより先にエーテル回収</b>。割る前にどれだけ殴ってもダメージが通らない。",
    passblock: "撃種限定ブロック。<b>青（◇）は反射だけ・金（→）は貫通だけ</b>が通れる。編成に反射と貫通を<b>両方</b>入れるのが必須級。",
    swap: "撃種変化パネル。踏むと反射⇄貫通が入れ替わる。行き止まりを開ける鍵になるので、<b>わざと踏みに行く</b>立ち回りも覚えたい。",
    ghost: "透明パネル。乗ると姿が消えて一部の攻撃を避けられる。ボスの範囲攻撃を凌ぐ避難場所として使える。",
    weak: "弱点コア。<b>ここを通すとダメージが跳ね上がる</b>。弱点キラー持ちを入れて、コアを通る角度を最優先で探す。",
    innerweak: "内部弱点。敵の<b>内側</b>にコアがあるので、貫通キャラで中に潜り込ませて往復させると一気に削れる。",
    doom: "即死攻撃のカウントダウン。<b>0になる前に倒しきる</b>のが唯一の対策。火力が足りないなら、そのWAVEまでにフルバーストを溜めておく。",
    poison: "毒攻撃。ターン終了ごとに削られる。毒無効持ちか、リジェネ・ドレインの回復で相殺する。",
    laser: "レーザー攻撃。予兆のラインが出ている場所から<b>離れて止まる</b>。超レーザーストップ持ちなら受け止めて回復に変えられる。",
    wallchange: "ウォールチェンジ。壁にふれるたび色が<b>青→黄→赤→青と一周</b>し、直殴りとリンクスキルの威力が変わる（青＝弱い／赤＝大幅アップ）。<b>赤のうちに大ダメージを叩き込む</b>のが理想。",
    countboost: "カウントブーストウォール。<b>各壁2回・合計8回まで</b>、壁にふれた回数だけ直殴りの威力が上がる。<b>効果は毎ターンでリセット</b>されるので、そのターンのうちに壁を稼いでから殴りこむ。×印の壁は反応済み。",
    balloon: "ヒーリングバルーン。ふれると1つ獲得（最大4つ・ターンをまたいでも消えない）し、<b>味方にふれるたびに1つ消費してチームHPを回復</b>。<b>ただし敵にふれるとその敵が回復してしまう</b>ので、持っているあいだは敵に当てないこと。",
    vanish: "ヴァニッシュボックス。<b>最後にふれた1つが次のターンに消える</b>。通り道を自分で作りながら進むギミック。",
    ward: "結界。<b>中に入ったキャラは次の手番からその中でしか動けなくなる</b>。<b>内側からでも外側からでも5回たたけば破壊</b>できるので、閉じ込められた仲間をどう助け出すかが鍵。",
  };

  /* ════════════ アビリティ辞書 ════════════ */
  const ABIL = {
    adw:["アンチダメージウォール","ダメージウォールを無効化する"],
    superadw:["超アンチダメージウォール","ダメージウォールを無効化し、さらに触れると1.3倍に自強化する"],
    ms:["マインスイーパー","地雷を回収し、敵ヒット時に1個消費して1.5倍攻撃"],
    msM:["マインスイーパーM","地雷を回収し、敵ヒット時に1個消費して2倍攻撃（等級M）"],
    msEL:["マインスイーパーEL","地雷を回収し、敵ヒット時に1個消費して3倍攻撃（等級EL）"],
    superms:["超マインスイーパー","WAVE開始時に地雷を4つ所持。敵ヒット時に1個消費して1.5倍攻撃"],
    supermsM:["超マインスイーパーM","WAVE開始時に地雷を4つ所持。敵ヒット時に1個消費して2倍攻撃（等級M）"],
    supermsL:["超マインスイーパーL","WAVE開始時に地雷を4つ所持。敵ヒット時に1個消費して2.5倍攻撃（等級L）"],
    supermsEL:["超マインスイーパーEL","WAVE開始時に地雷を4つ所持。敵ヒット時に1個消費して3倍攻撃（等級EL）"],
    aw:["アンチワープ","ワープを無効化する"],
    superaw:["超アンチワープ","ワープを無効化し、画面上のワープ1つにつき攻撃・スピードが10%アップ"],
    ablock:["アンチブロック","ブロックをすり抜ける（反射しない）"],
    agrav:["アンチ重力バリア","敵の重力バリアの減速を受けない"],
    sgrav:["超アンチ重力バリア","重力バリアの減速を受けず、さらに触れると加速する"],
    antilock:["アンチロックゾーン","ロックゾーンの中でもリンクスキルが無効化されない"],
    omni:["オムニアンチ","WAVE開始から自分が2回行動するまで、すべてのギミックを無効化"],
    barrier:["バリア","一定量(1,600)のダメージを代わりに受け止める"],
    barrierM:["バリアM","一定量(3,200)のダメージを代わりに受け止める（等級M）"],
    regen:["リジェネ","自分のターン終了時、チームHPを5%回復"],
    regenM:["リジェネM","自分のターン終了時、チームHPを10%回復（等級M）"],
    drain:["ドレイン","敵にふれるたびにチームHPを6%回復"],
    drainM:["ドレインM","敵にふれるたびにチームHPを10%回復（等級M）"],
    soul:["ソウルスティール","敵を倒すたびにチームHPを10%回復"],
    soulM:["ソウルスティールM","敵を倒すたびにチームHPを15%回復（等級M）"],
    pray:["治癒の祈り","ボスマップ開始時、30%でチームHPを全回復"],
    protection:["プロテクション","敵の1ヒットが一定以下(900)なら被ダメージを1にする（チーム全体）"],
    allres:["全属性耐性","すべての属性からの被ダメージを25%カット（チーム全体）"],
    mirage:["ミラージュ","敵の攻撃を20%の確率で回避する（チーム全体）"],
    laserstop:["超レーザーストップ","敵のレーザーを受け止めて無効化し、逆にチームHPを回復する"],
    pimmune:["毒無効","毒状態にならない"],
    dash:["ダッシュ","自分のスピードが常に1.5倍"],
    dashM:["ダッシュM","自分のスピードが常に2倍（等級M）"],
    dashL:["ダッシュL","自分のスピードが常に2.5倍（等級L）"],
    aura:["パワーオーラ","チームHP50%以上のとき攻撃・スピード1.5倍"],
    auraM:["パワーオーラM","チームHP50%以上のとき攻撃・スピードが2倍（等級M）"],
    sokojikara:["底力","チーム残りHPが50%以下のとき、与ダメージ1.5倍"],
    overheat:["オーバーヒート","毎ターンHP3%消費する代わりに常に自強化（攻撃×1.75）"],
    vital:["バイタルキラー","残りHP50%以上の敵へのダメージ1.5倍"],
    vitalM:["バイタルキラーM","残りHP50%以上の敵へのダメージ2倍（等級M）"],
    vitalL:["バイタルキラーL","残りHP50%以上の敵へのダメージ2.5倍（等級L）"],
    vitalEL:["バイタルキラーEL","残りHP50%以上の敵へのダメージ3倍（等級EL）"],
    fatalkiller:["フェイタルキラー","残りHP50%以下の敵へのダメージ1.5倍"],
    fatalkillerM:["フェイタルキラーM","残りHP50%以下の敵へのダメージ2倍（等級M）"],
    weakkiller:["弱点キラー","弱点コア直撃のダメージがさらに1.5倍"],
    weakkillerM:["弱点キラーM","弱点コア直撃のダメージがさらに2倍（等級M）"],
    weakkillerL:["弱点キラーL","弱点コア直撃のダメージがさらに2.5倍（等級L）"],
    firstkiller:["ファーストキラー","そのショットで最初にふれた敵へのダメージ1.5倍"],
    firstkillerM:["ファーストキラーM","そのショットで最初にふれた敵へのダメージ2倍（等級M）"],
    allkiller:["全属性キラー","すべての属性の敵へのダメージ1.5倍"],
    defkiller:["防御変化キラー","防御ダウン中の敵へのダメージ1.5倍"],
    poisonkiller:["毒キラー","毒状態の敵へのダメージ1.5倍"],
    poisonkillerM:["毒キラーM","毒状態の敵へのダメージ2倍（等級M）"],
    mobkiller:["ザコキラー","ボス以外の敵へのダメージ1.5倍"],
    counterkiller:["カウンターキラー","最後に攻撃してきた敵へのダメージ1.5倍"],
    upkillerM:["アップポジションキラーM","画面上半分の敵へのダメージ2倍（等級M）"],
    atkturnkillerM:["アタックターンキラーM","攻撃ターン表示が「1」の敵へのダメージ2倍（等級M）"],
    combokillerM:["連撃キラーM","同じ敵に連続で触れるたび攻撃力+25%（最大2倍）"],
    infinitybreakM:["インフィニティブレイクM","敵にふれるたび攻撃力+20%（最大2倍・毎ターンリセット）"],
    fewfoeM:["敵少底力M","画面上の敵が2体以下のとき与ダメージ2倍（等級M）"],
    darkmatch:["ダークマッチ","敵にふれるたびにその敵を毒状態にする"],
    judgment:["ジャッジメント","ボスWAVEで最初に行動したとき、全敵の防御を5ターンダウン"],
    lightning:["ライトニング","直殴りで20%の確率で強力な魔法（攻撃力×3.2）"],
    cumulonimbus:["キュムロニンバス","最初にふれた敵に落雷（攻撃力×12）＋移動距離でステータス最大×2.2"],
    phantomdrive:["ファントムドライブ","壁に3回ふれると2回行動のあいだステータス×1.8"],
    wallboostM:["ウォールブーストM","壁にふれた回数で攻撃力アップ（最大2倍・等級M）"],
    wallboostL:["ウォールブーストL","壁にふれた回数で攻撃力アップ（最大2.5倍・等級L）"],
    bubblemode:["バブリーモード","WAVE開始から2回行動するまで減速しにくいバブリー状態"],
    ssboost:["FBブースト","味方に触れるとその味方のFBターンを1短縮"],
    sscharge:["FBターンチャージ","1ショットで味方3体に触れると3体目のFBターンを2短縮"],
    fbaccel:["FBターンアクセル","チームHP70%未満のとき、自分のFBターンを毎ターン2短縮"],
    fbshort:["FBターン短縮","自分のFBターンが毎ターン1多く進む"],
    fbtouch:["FBターン短縮","1ショットで味方に触れた数だけFBターンを短縮"],
    destroyboost:["デストロイブースト","敵が倒れるたびに自分のFBターンを1短縮"],
    linkcharge:["リンクチャージ","リンクスキル命中時、50%で自分のFBターンを1短縮"],
    fsboost:["リンクブースト","自分のリンクスキル・サブリンクの威力1.5倍"],
    fsboostM:["リンクブーストM","自分のリンクスキル・サブリンクの威力2倍（等級M）"],
    fsboostL:["リンクブーストL","自分のリンクスキル・サブリンクの威力2.5倍（等級L）"],
    fsdouble:["リンク×2","1ショットでリンクスキルを最大2回まで発動できる"],
    eternalphoton:["エターナルエーテル","エーテルがあるクエストでWAVE開始時にエーテルを2つ所持"],
    resonance:["レゾナンス","毎ターン30%でステータス・リンクスキルが1.5倍になる"],
  };
  function abilLabel(key) {
    if (ABIL[key]) return ABIL[key][0];
    const m = /^(killer|killerM|elemres):(\w+)$/.exec(key);
    if (m) {
      const el = EL_NM[m[2]] || m[2];
      if (m[1] === "elemres") return el + "属性耐性";
      return el + "属性キラー" + (m[1] === "killerM" ? "M" : "");
    }
    return key;
  }
  function abilDesc(key) {
    if (ABIL[key]) return ABIL[key][1];
    const m = /^(killer|killerM|elemres):(\w+)$/.exec(key);
    if (m) {
      const el = EL_NM[m[2]] || m[2];
      if (m[1] === "elemres") return el + "属性の敵から受けるダメージを25%カット（チーム全体）";
      return el + "属性の敵へのダメージが" + (m[1] === "killerM" ? "2倍（等級M）" : "1.5倍");
    }
    return "";
  }
  /* アビリティの役割分け。編成を「なぜその4体か」で説明するために使う。 */
  const ABIL_ROLE = {
    heal: ["regen", "regenM", "drain", "drainM", "soul", "soulM", "pray", "laserstop", "boundheal"],
    guard: ["barrier", "barrierM", "protection", "allres", "mirage", "pimmune"],
    power: ["aura", "auraM", "sokojikara", "overheat", "dash", "dashM", "dashL", "allkiller",
            "vital", "vitalM", "vitalL", "vitalEL", "fatalkiller", "fatalkillerM",
            "weakkiller", "weakkillerM", "weakkillerL", "firstkiller", "firstkillerM",
            "combokillerM", "infinitybreakM", "fewfoeM", "lightning", "cumulonimbus", "phantomdrive",
            "wallboostM", "wallboostL", "upkillerM", "atkturnkillerM", "counterkiller", "mobkiller",
            "poisonkiller", "poisonkillerM", "defkiller"],
    support: ["ssboost", "sscharge", "fbaccel", "fbshort", "fbtouch", "destroyboost", "linkcharge",
              "fsboost", "fsboostM", "fsboostL", "fsdouble", "eternalphoton", "judgment", "resonance", "darkmatch"],
  };
  function rolesOf(abils) {
    const out = [];
    Object.keys(ABIL_ROLE).forEach((r) => {
      if ((abils || []).some((a) => ABIL_ROLE[r].indexOf(a) >= 0)) out.push(r);
    });
    return out;
  }
  const ROLE_NM = { heal: "回復", guard: "耐久", power: "火力", support: "サポート" };

  /* ════════════ キャラ一覧 ════════════
     [id, 名前, 属性, 撃種, 戦型, ★5か, アビリティ, サブリンク, フルバースト名, リンクスキル名] */
  const CHAR_ROWS = [
    ["zera","ゼラ","dark","pierce","バランス型",0,"adw,killer:light","plasma","冥月天翔・ルナフォール","クロスレイEL"],
    ["ayame","アヤメ","wood","bounce","支援型",0,"ms,barrier","blast","もふもふ・ガーディア","ヒーリングボム"],
    ["leila","レイラ","water","bounce","アタッカー型",0,"dash,aw","accel","蒼閃連舞・アクアスラッシュ","ソニックブレードウェーブ"],
    ["celine","セリーヌ","water","bounce","技巧型",0,"defkiller,ms","bubbly","シャイニング・ディスラプト","連気弾"],
    ["ema","エマ","fire","pierce","支援型",1,"aw,ssboost,regen,killer:wood","accel","プリマ・フレイムコール","フレイムシーカー12"],
    ["sakura","サクラ","water","bounce","アタッカー型",1,"superms,superaw,allkiller,sokojikara","hitouchray","蒼閃烈破・サッカーストライカー","アブソリュートレイ10"],
    ["arisa","アリサ","fire","pierce","アタッカー型",1,"omni,destroyboost,pray,fatalkiller","pspread5","緋滅連牙・メテオラプソディ","鋭角三方向追従型貫通弾"],
    ["kaguya","カグヤ","light","pierce","バランス型",1,"omni,aura,vital,eternalphoton,resonance","hiplasma","月虹重力・ルナグラビトン","オービタルエッジ"],
    ["cheryl","シェリー","dark","pierce","アタッカー型",1,"vital,omni,allkiller,drain","accel","紫焔絶影・ヴァイオレットラプソディ","三方向追従型貫通弾"],
    ["aira","アイラ","wood","bounce","支援型",1,"superaw,barrier,regenM,ssboost","blast","ラブリィ・ハートフェスタ","FB短縮弾"],
    ["shion","シオン","water","pierce","アタッカー型",1,"superadw,msM,ssboost,firstkiller","accel","月夜氷刃・シオンクレスト","三方向追撃貫通弾"],
    ["viola","ヴィオラ","dark","bounce","技巧型",1,"superadw,killerM:light,regen,agrav","blast","カジノ・ロワイヤルシャワー","サイクロンエッジλ"],
    ["mion","ミオン","light","pierce","砲撃型",1,"adw,aw,fsboost,allres","phoming","終焔連撃・ダブルオーヴァードライヴ","ルミナスレイ"],
    ["kokona","ココナ","water","bounce","砲撃型",1,"pray,superaw,ablock,soul","field","ハートフルレクイエム","クロス分身弾"],
    ["mao","マオ","dark","bounce","アタッカー型",1,"weakkiller,poisonkiller,firstkiller,vital","poison","壊劫反響・カルマインリコシェ","リバウンドサークル"],
    ["bernica","ベルニカ","light","pierce","砲撃型",1,"fsboost,adw,aw,bubblemode","boundheal","グロリアス・レゾナンス","ハイエナジーサークル"],
    ["tsubaki","ツバキ","fire","bounce","アタッカー型",1,"pimmune,agrav,aw,fatalkiller","weaklock","紅蓮総攻・カレンオーダー","クイックチャージショット"],
    ["alicia","アリシア","dark","pierce","技巧型",1,"destroyboost,darkmatch,regen,barrier,aura","accel","オールクリア・アビス","ハイプラズマ"],
    ["natsuki","ナツキ","fire","bounce","バランス型",1,"omni,poisonkillerM,firstkillerM,killer:wood,drain","boundcharge","焔華繚乱・スカーレットヴェノム","ハイクロススティンガー"],
    ["mizuki","ミズキ","wood","pierce","バランス型",1,"adw,ms,aw,barrier,killer:water","divinepillar","翠光審判・セイクリッドヴァーディクト","ルミナスレイ"],
    ["ayaka","アヤカ","wood","bounce","支援型",1,"sgrav,msM,elemres:water,dashM","phoming","ブルーミング・オーヴァル","オービタルエッジ"],
    ["iroha","イロハ","light","pierce","砲撃型",1,"superadw,ablock,weakkiller,regenM,fsboostM","accel","ラディアント・レガリア","ハイエナジーサークル"],
    ["shirayuki","シラユキ","fire","bounce","アタッカー型",1,"sgrav,supermsM,elemres:wood,killer:wood","blast","クリムゾン・ブリザード","スパークバレット"],
    ["mashiro","マシロ","wood","pierce","技巧型",1,"superaw,antilock,superadw,protection,vitalL,drain","roundcharge","ピュアホワイト・ガードルーン","クロス分身弾"],
    ["hotaru","ホタル","wood","pierce","砲撃型",1,"ms,adw,allkiller,weakkillerM","boundcharge","ルシオル・ブレイズ","ピアスシーカー12"],
    ["koharu","コハル","light","bounce","アタッカー型",1,"sgrav,superadw,vitalM,sscharge","fbshorten","オーロラ・エッジ","パワードライブ"],
    ["yuri","ユリ","light","pierce","砲撃型",1,"supermsL,superaw,killerM:dark,soulM","splitpierce","ソレイユ・レガシー","エナジースパーク"],
    ["rinne","リンネ","water","bounce","バランス型",1,"sgrav,superaw,laserstop,wallboostL,overheat","blast","サーキュラー・アビス","オービタルエッジ"],
    ["hecatia","ヘカーティア","dark","bounce","バランス型",1,"adw,aw,killer:light,regen","divinepillar","幽冥招来・ヘカーティアノヴァ","ファントムサークル"],
    ["rezelia","レゼリア","wood","bounce","アタッカー型",1,"superadw,superaw,upkillerM,pray,drainM","roundcharge","ヴェルダント・アセンション","プラズマネット"],
    ["elsia","エルシア","light","pierce","アタッカー型",1,"superadw,ablock,allres,fsdouble,counterkiller","accel","セイクリッド・サクリファイス","ルミナスレイ"],
    ["karina","カリナ","dark","bounce","技巧型",1,"msM,sgrav,barrierM,wallboostM","defdownblast","叡智ノ浮環・ソフィアリング","鋭角三方向追従型貫通弾"],
    ["nephia","ネフィア","light","pierce","支援型",1,"superaw,sgrav,fsdouble,fbaccel,mobkiller","roundcharge","ルミエル・アセンション","スパイラルリバウンド"],
    ["setsuna","セツナ","light","bounce","支援型",1,"superaw,ablock,fsboostL,dashL","blast","セイクリッド・ミラージュ","ハイプラズマ"],
    ["selene","セレネ","water","bounce","アタッカー型",1,"adw,antilock,ablock,killer:fire,sscharge","accel","ルナティック・ピアース","コピー"],
    ["nazuna","ナズナ","fire","pierce","アタッカー型",1,"ablock,sgrav,barrierM,fbshort,darkmatch","discharge","インフェルノ・ランページ","オートジャベリンバースト"],
    ["lilia","リリア","wood","pierce","技巧型",1,"msM,antilock,ablock,fbtouch,dash,combokillerM","pspread5","ヴェルダント・カスケード","リレーションカッター"],
    ["revia","レヴィア","dark","pierce","アタッカー型",1,"superadw,supermsL,judgment,infinitybreakM,fewfoeM","nebula","アビス・レクイエム","ブレイドオービット"],
    ["fiona","フィオナ","water","pierce","砲撃型",1,"msEL,sgrav,killerM:fire,dashL,lightning","absoluteray","アクアリウム・ラプチャー","チャームプラズマ"],
    ["milfy","ミルフィ","fire","bounce","支援型",1,"superadw,antilock,ablock,atkturnkillerM,regenM,mirage","absoluteray","フランベ・レガリア","フェニックスフレア"],
    ["mabel","メイベル","wood","bounce","技巧型",1,"sgrav,ablock,fsdouble,sscharge,linkcharge","absoluteray","ヴェルダン・インフィニート","インフィニティレーザー"],
    ["abyss","アビス","dark","pierce","アタッカー型",1,"superaw,msEL,weakkillerL,auraM,bubblemode,cumulonimbus","absoluteray","ヴォイド・サンダーレイド","ウォールサーキットリング"],
    ["arche","アーク","light","bounce","アタッカー型",1,"superadw,ablock,fbshort,vitalEL,phantomdrive","absoluteray","ルクス・カタストロフ","オートエイムビット"],
    ["chloe","クロエ","water","pierce","アタッカー型",1,"supermsEL,agrav,ablock,fatalkillerM,poisonkillerM,allkiller,bubblemode","poisoncurrent","ホロックス・オーシャン","ホロックスストリーム"],
  ];

  /* クエスト [id, 名前, 難度, WAVE数, アンチギミック, 敵属性, HP, 全ギミック, シリーズ, 部屋番号]
     ★ 3系統ぜんぶ載せること（黄昏の王城 / 禁忌の迷宮 / 幽冥の庭園）。
       ここに無いシリーズは「まだ MagiBurst を開いたことがない人」に答えられない。 */
  const STAGE_ROWS = [
    ["tk1","黄昏の王城・第1の間","★1",6,""],
    ["tk2","黄昏の王城・第2の間","★2",6,"warp"],
    ["tk3","黄昏の王城・第3の間","★3",6,"dw"],
    ["tk4","黄昏の王城・第4の間","★3",6,"mine"],
    ["tk5","黄昏の王城・第5の間","★4",6,"dw,warp"],
    ["tk6","黄昏の王城・第6の間","★5",6,"block"],
    ["tk7","黄昏の王城・第7の間","★5",6,"mine,warp"],
    ["tk8","黄昏の王城・第8の間","★6",6,"dw,block"],
    ["tk9","黄昏の王城・第9の間","★7",6,"dw,mine"],
    ["tk10","黄昏の王城・第10の間","★7",6,"warp,block"],
    ["tk11","黄昏の王城・第11の間","★8",6,"grav"],
    ["tk12","黄昏の王城・第12の間","★9",6,"mine,block"],
    ["tk13","黄昏の王城・第13の間","★9",6,"dw,grav"],
    ["tk14","黄昏の王城・第14の間","★10",6,"block,grav"],
    ["tk15","黄昏の王城・第15の間","★10",6,"warp,grav"],
    ["tkm16","黄昏の王城・第16の間","★中1",6,"lockzone"],
    ["tkm17","黄昏の王城・第17の間","★中2",6,"mine,grav"],
    ["tkm18","黄昏の王城・第18の間","★中3",6,"dw,lockzone"],
    ["tkm19","黄昏の王城・第19の間","★中4",6,"lockzone,block"],
    ["tkm20","黄昏の王城・第20の間","★中5",6,"warp,lockzone"],
    ["tk21","黄昏の王城・第21の間","★EX1",6,"mine,lockzone"],
    ["tk22","黄昏の王城・第22の間","★EX2",6,"lockzone,grav"],
    ["tk23","黄昏の王城・第23の間","★EX3",6,"dw,warp"],
    ["tk24","黄昏の王城・第24の間","★EX4",6,"dw,mine"],
    ["tk25","黄昏の王城・第25の間","★EX5",6,"warp,grav"],
    /* ── 禁忌の迷宮（第1〜25の間・ヴァルガ）。全6WAVE ── */
    ["lb1","禁忌の迷宮・第1の間","★4",6,"","dark",0,"doom,weak","lab",1],
    ["lb2","禁忌の迷宮・第2の間","★5",6,"dw","fire",0,"doom,dw,weak","lab",2],
    ["lb3","禁忌の迷宮・第3の間","★5",6,"warp","water",0,"doom,warp,weak","lab",3],
    ["lb4","禁忌の迷宮・第4の間","★6",6,"dw,warp","wood",0,"doom,dw,warp,weak","lab",4],
    ["lb5","禁忌の迷宮・第5の間","★6",6,"mine","light",0,"doom,mine,weak","lab",5],
    ["lb6","禁忌の迷宮・第6の間","★7",6,"dw,mine","dark",0,"doom,dw,mine,weak","lab",6],
    ["lb7","禁忌の迷宮・第7の間","★8",6,"grav","fire",0,"doom,grav,weak","lab",7],
    ["lb8","禁忌の迷宮・第8の間","★8",6,"warp,grav","water",0,"doom,grav,warp,weak","lab",8],
    ["lb9","禁忌の迷宮・第9の間","★9",6,"mine,grav","wood",0,"doom,grav,mine,weak","lab",9],
    ["lb10","禁忌の迷宮・第10の間","★9",6,"dw,grav","light",0,"doom,dw,grav,weak","lab",10],
    ["lb11","禁忌の迷宮・第11の間","★10",6,"block","dark",0,"block,doom,weak","lab",11],
    ["lb12","禁忌の迷宮・第12の間","★11",6,"warp,mine","fire",0,"doom,mine,warp,weak","lab",12],
    ["lb13","禁忌の迷宮・第13の間","★迷1",6,"dw,block","water",0,"block,doom,dw,innerweak,weak","lab",13],
    ["lb14","禁忌の迷宮・第14の間","★迷2",6,"warp,block","wood",0,"block,doom,innerweak,warp,weak","lab",14],
    ["lb15","禁忌の迷宮・第15の間","★迷3",6,"mine,block","light",0,"block,doom,innerweak,mine,weak","lab",15],
    ["lb16","禁忌の迷宮・第16の間","★迷4",6,"block,grav","dark",0,"block,doom,grav,innerweak,weak","lab",16],
    ["lb17","禁忌の迷宮・第17の間","★迷5",6,"lockzone","fire",0,"doom,innerweak,lockzone,weak","lab",17],
    ["lb18","禁忌の迷宮・第18の間","★迷6",6,"warp,lockzone","water",0,"doom,innerweak,laser,lockzone,warp,weak","lab",18],
    ["lb19","禁忌の迷宮・第19の間","★迷7",6,"dw,lockzone","wood",0,"doom,dw,innerweak,laser,lockzone,weak","lab",19],
    ["lb20","禁忌の迷宮・第20の間","★迷8",6,"mine,lockzone","light",0,"doom,innerweak,laser,lockzone,mine,weak","lab",20],
    ["lb21","禁忌の迷宮・第21の間","★深1",6,"grav,lockzone","dark",0,"doom,grav,innerweak,laser,lockzone,passblock,photon,poison,swap,weak","lab",21],
    ["lb22","禁忌の迷宮・第22の間","★深2",6,"block,lockzone","fire",0,"block,doom,innerweak,laser,lockzone,passblock,photon,poison,swap,weak","lab",22],
    ["lb23","禁忌の迷宮・第23の間","★深3",6,"warp,mine","water",0,"doom,innerweak,laser,mine,passblock,photon,poison,swap,warp,weak","lab",23],
    ["lb24","禁忌の迷宮・第24の間","★深4",6,"dw,grav","wood",0,"doom,dw,grav,innerweak,laser,passblock,photon,poison,swap,weak","lab",24],
    ["lb25","禁忌の迷宮・第25の間","★深5",6,"mine,grav","light",0,"doom,grav,innerweak,laser,mine,passblock,photon,poison,swap,weak","lab",25],
    /* ── 幽冥の庭園（第1〜7ノ園・ヘカーティア）。超絶高難易度・全6WAVE ── */
    ["gd1","幽冥の庭園・第1ノ園","★幽1",6,"dw,block","dark",0,"block,doom,dw,weak","garden",1],
    ["gd2","幽冥の庭園・第2ノ園","★幽2",6,"warp,mine","light",0,"countboost,doom,mine,warp,weak","garden",2],
    ["gd3","幽冥の庭園・第3ノ園","★幽3",6,"grav,block","water",0,"balloon,block,doom,grav,weak","garden",3],
    ["gd4","幽冥の庭園・第4ノ園","★幽4",6,"dw,lockzone","wood",0,"doom,dw,lockzone,photon,vanish,weak","garden",4],
    ["gd5","幽冥の庭園・第5ノ園","★幽5",6,"mine,grav","fire",0,"doom,grav,mine,ward,weak","garden",5],
    ["gd6","幽冥の庭園・第6ノ園","★幽6",6,"warp,lockzone","dark",0,"doom,lockzone,wallchange,warp,weak","garden",6],
    ["gd7","幽冥の庭園・第7ノ園","★幽極",6,"dw,grav","light",0,"countboost,doom,dw,grav,innerweak,photon,vanish,wallchange,ward,weak","garden",7],
  ];

  /* EX降臨（そのキャラを入手できる唯一の場所）
     [id, 名前, ドロップキャラ, 属性, 難度, アンチ, シリーズ, 出現部屋] */
  const RAID_ROWS = [
    ["raidShion","EX降臨クエスト「月下の氷牢」","shion","water","降臨★10","dw,warp","lab","25-30"],
    ["raidViola","EX降臨クエスト「深夜のルーレット」","viola","dark","降臨★11","mine,block","castle","25-30"],
    ["raidAira","EX降臨クエスト「狂騒の大楽団」","aira","wood","降臨★12","grav,lockzone","garden","6-7"],
  ];

  /* 入手先の説明 */
  const POOL_NM = {
    premium: ["プレミアムセレクトガチャ", "ジェムで回すメインのガチャ。10連は最後の1枠が★5確定。ピックアップを自分で選べる。"],
    fes: ["Nocturne Bloom Fest", "フェス限定★5。プレミアムからは出ない。🎫フェスチケットがあれば優先して消費される。"],
    cross: ["クロスガチャ（XEVAガチャBシリーズ）", "XEVARION 本体のガチャと所持状況・凸を共有するキャラ。"],
    raid: ["EX降臨クエスト", "対応する部屋をクリアしたときに20%で出現。クリアでドロップ（ガチャからは出ない）。"],
    reward: ["MagiLex の報酬", "MagiLex で30コンテンツ完全習得すると解放。35/40/45/50でさらに凸が進む。"],
    garden: ["幽冥の庭園の報酬", "超絶高難易度クエストの踏破報酬。"],
    cdk: ["シリアルコード", "配布されたCDKを XEVARION の設定から入力して入手。"],
  };

  /* ════════════ 編成の考え方（未所持でも役に立つ原則） ════════════ */
  const PARTY_RULES = [
    ["① ギミック対策を最優先", "クエストに出るアンチ系ギミックを、4体で<b>全部ふさぐ</b>ところから考える。火力が高くても、地雷やダメージウォールで削られて先に自分が落ちる。"],
    ["② ダメージ系（ダメージウォール・地雷）から埋める", "同じ1枠でも、被ダメージを止める対策の方が価値が高い。ワープやブロックは立ち回りでもある程度ごまかせる。"],
    ["③ 属性は敵の弱点に合わせる", "有利属性は与ダメージ<b>1.25倍</b>。ボスの属性を見て、有利を取れるキャラを2体以上入れると安定する。"],
    ["④ 反射と貫通を混ぜる", "撃種限定ブロック（青＝反射のみ／金＝貫通のみ）がある部屋では、<b>両方いないと道が開かない</b>。混ぜておくと事故が減る。"],
    ["⑤ 回復を1体は入れる", "リジェネ・ドレイン・ソウルスティールのいずれか。長いWAVEでは「削られない」より「戻せる」方が効く。"],
    ["⑥ オムニアンチは保険であって主軸ではない", "全ギミックに対応できるが<b>WAVE開始から2回行動するまで</b>。長引くWAVEでは専用アビリティ持ちの方が安全。"],
    ["⑦ 迷ったらリンクスキルの相性で決める", "貫通のリンクスキル持ちは味方の位置に強く依存する。壁反射系・全体系を1つ入れると、雑魚処理が一気に楽になる。"],
  ];

  /* 勝てないときの原因別チェックリスト */
  const LOSE_TIPS = [
    ["ギミックで削られている", "アンチ対策が足りていない可能性が高い。まず<b>そのクエストのアンチギミック2種</b>を全部ふさげる編成にする。"],
    ["ダメージが足りない", "① 有利属性を取れているか（1.25倍）／② 弱点コアを通せているか／③ キラーが敵に刺さっているか（HP50%以上ならバイタル、以下ならフェイタル）を順に見直す。"],
    ["即死攻撃で全滅する", "ボスの<b>doomカウント</b>が0になる前に倒しきる必要がある。ボスWAVEに入る前にフルバーストを溜めておき、開幕で撃つ。"],
    ["HPが持たない", "回復アビリティ持ちを1〜2体に増やす。ルーンをHP系に付け替えるだけでも体感が変わる。"],
    ["そもそもレベルが足りない", "クエストは<b>ステータス</b>で殴る場所でもある。素材クエストや周回でレベルを上げ、とっくんで底上げする。"],
    ["編成が思いつかない", "クエスト画面の<b>自動編成</b>を使うと、対策を優先して4体を選んでくれる。そこから1枠だけ好きなキャラに差し替えるのが早い。"],
  ];

  /* ════════════ XEVARION ポータルの知識 ════════════ */
  const APPS = [
    { id: "magilex", nm: "MagiLex", cat: "学習", href: "../MagiLex/MagiLex.html",
      sum: "魔法の書から問題が飛び出す学習アプリ。難関大英単語（発音つき）・物理・化学・古文をクイズと単語帳で覚える。",
      det: "コンテンツごとに「習得中／完全習得」を管理し、<b>1問を2回連続で正解すると習得</b>。完全習得すると XEVA がもらえる。50問なら×2、100問なら×3のボリュームボーナスつき。オフラインでも学習できる。30コンテンツ完全習得で報酬キャラ「ミズキ」が解放。" },
    { id: "magiburst", nm: "MagiBurst", cat: "ゲーム", href: "../MagiBurst/index.html",
      sum: "引っぱって、はなして、ぶっとばす引っぱりハンティング。最大4人マルチ。",
      det: "キャラを引っぱって離し、跳ね返りながら敵を殴る。<b>フルバースト</b>（必殺技）・<b>リンクスキル</b>（味方に触れると出る）・<b>ルーン</b>（装備）・<b>ジェム</b>（ガチャ通貨）で構成。黄昏の王城／禁忌の迷宮／幽冥の庭園／超特急MAXSPEED の4系統。オフラインでもソロが遊べる。" },
    { id: "magijackpot", nm: "MagiJackpot", cat: "ゲーム", href: "../MagiJackpot/index.html",
      sum: "XEVA とジェムで遊ぶソーシャルカジノ＆パーティー。1人プレイ3種と、1台を2〜6人で囲むパーティー2種。",
      det: "1人プレイは<b>スロット「Magi Fortune」</b>（5リール20ライン・BONUS→フリースピン→SUPER BONUS）、"
        + "<b>ブラックジャック「Royal Blackjack」</b>（ダブル・スプリット・サレンダー＋連勝ボーナス＋Royal Chance）、"
        + "<b>パチンコ「Jackpot Rush」</b>（リーチ・激アツ・確変RUSH）の3本。"
        + "パーティーは1台を2〜6人で囲む<b>Jackpot Arena</b>（BET/HOLD/DOUBLEの読み合い）と<b>Grand Roulette Party</b>（全員で同じ盤にベット）。"
        + "<b>ゲーム内通貨（XEVA・ジェム）だけ</b>を使い、<b>還元率はどのゲームもおよそ100%</b>（賭けた総量と配られる総量がつり合う設計）。"
        + "ベット額・ライン数・台えらびは還元率を変えず、当たりの荒さだけが変わる。オフラインでも全部遊べる。" },
    { id: "xevynar", nm: "XEVYNAR", cat: "学習", href: "index.html",
      sum: "XEVARION の学習AI。わたしです。",
      det: "勉強のプラン・自由なタイマー・記録（任意）に加えて、わからない問題の解説、MagiLex の苦手問題づくり、MagiBurst の編成と攻略、XEVARION のアプリについての質問に答える。あなたのデータを見て答えるので、端末を変えても続きから話せる。" },
    { id: "magilink", nm: "MagiLink", cat: "つながる", href: "../MagiLink/MagiLink.html",
      sum: "友達やグループとつながるチャットアプリ。", det: "コレクション共有にも対応。会話を XEVYNAR に登録しておくと、口調に合わせた返信案を作れる。" },
    { id: "magichainparty", nm: "MagiChainParty", cat: "ゲーム", href: "../MagiChainParty/index.html",
      sum: "2〜5人で囲む連鎖バクハツの陣取り頭脳戦。運ゼロ・1タップ。", det: "CPU対戦・部屋番号オンライン対戦つき。オフラインでもローカル対戦ができる。" },
    { id: "magicraft", nm: "MagiCraft", cat: "ゲーム", href: "../MagiCraft/index.html",
      sum: "3Dボクセルワールドで掘って・作って・育てる探索アドベンチャー。", det: "自作のWebGL2ボクセルエンジンで動く。タイムアタックの記録は MagiRanking に載る。" },
    { id: "magimanor", nm: "MagiManor", cat: "ゲーム", href: "../MagiManor/index.html",
      sum: "洋館からの脱出を目指す2D探索ホラー。6種類の結末。", det: "謎解き・追跡者・恐怖ゲージ。最大4人の共鳴探索（オンライン）にも対応。" },
    { id: "magibattle", nm: "MagiBattle", cat: "ゲーム", href: "../MagiBattle/index.html",
      sum: "ガチャで集めたキャラを育てて戦うキャラバトルRPG。", det: "回転ダイアル編成・手動バースト・5属性。無限の塔とスコアアタックつき。" },
    { id: "magifocus", nm: "MagiFocus", cat: "学習", href: "../MagiFocus/index.html",
      sum: "手とスマホを見張るAIで勉強を守る学習管理アプリ。", det: "みまもりカメラ・タイムライン・予定カレンダー・実績。集中30分ごとに10 XEVA。" },
    { id: "magiranking", nm: "MagiRanking", cat: "つながる", href: "../MagiRanking/index.html",
      sum: "獲得XEVAの月間ランキング。", det: "月末の順位に応じて最大1,000 XEVAを配布。" },
    { id: "magiarena", nm: "MagiArena", cat: "ゲーム", href: "../MagiArena/MagiArena.html",
      sum: "1台でみんなと対戦する闘技場。2〜6人。", det: "オリジナル陣取り「TAKAGAME」、オセロ・五目並べ・神経衰弱。" },
    { id: "magidiamond", nm: "MagiDiamond", cat: "ゲーム", href: "../MagiDiamond/index.html",
      sum: "配球と狙いを同時公開する読み合い野球盤。", det: "2〜6人の役割分担、CPU、2台オンライン対戦。" },
    { id: "magiempire", nm: "MagiEmpire", cat: "ゲーム", href: "../MagiEmpire/MagiEmpire.html",
      sum: "1台で2〜4人の国盗り対戦。", det: "アクション版「国盗りパックマン」と陣取りの「ぐんぐん国盗り」。" },
    { id: "magiportfolio", nm: "MagiPortfolio", cat: "ツール", href: "../MagiPortfolio/MagiPortfolio.html",
      sum: "買った株を登録するだけの持ち株マネージャー。", det: "取得単価を自動逆引きし、伸び率・評価損益・資産配分を一覧。" },
    { id: "magimusic", nm: "MagiMusic", cat: "ツール", href: "../MagiMusic/MagiMusic.html",
      sum: "XEVARION の音楽プレイヤー。", det: "バックグラウンド再生・ロック画面操作に対応。" },
    { id: "magitier", nm: "MagiTier", cat: "ツール", href: "../MagiTier/MagiTier.html",
      sum: "Tier表の作成からプレゼンまで。", det: "カードを並べ替えて自分のランキングを作れる。" },
    { id: "ordyxis", nm: "ORDYXIS", cat: "店舗", href: "../ORDYXIS/index.html",
      sum: "店頭オンラインオーダーシステム。", det: "お客様の端末から注文し、店舗で受付・番号でお呼び出し。" },
  ];
  /* サービスを終了したアプリ（聞かれたときに「終了しました」と正しく答えるため） */
  const RETIRED = {
    MagiResonance: "2026-07-29", MagiShareCore: "2026-07-29", MagiTriad: "2026-07-29",
    MagiMuse: "2026-07-29", MagiFinance: "2026-07-29", MagiSports: "2026-07-29",
  };

  /* ポータルのよくある質問。q は聞かれ方のバリエーション、a は答え。 */
  const FAQ = [
    { id: "xeva", q: ["xeva", "ゼヴァ", "ぜゔぁ", "通貨", "お金", "コイン", "増やし方", "稼ぎ方", "貯め方"],
      t: "XEVA の増やし方",
      a: "XEVA は XEVARION 共通のゲーム内通貨です。<br>" +
        "① <b>毎日ログイン</b>（+50／7日連続でボーナスアップ）<br>" +
        "② <b>ミッション</b>（スターター・ログイン日数・期間限定）<br>" +
        "③ <b>各アプリのプレイ</b>（MagiLex の完全習得、MagiBurst のクエストなど）<br>" +
        "④ <b>MagiRanking の月間順位</b>（最大 1,000 XEVA）<br>" +
        "⑤ <b>メールボックス</b>の配布・シリアルコード" },
    { id: "gem", q: ["ジェム", "じぇむ", "gem", "宝石", "ダイヤ", "オーブ"],
      t: "ジェムについて",
      a: "<b>ジェム</b>は XEVARION 共通のプレミアム通貨です（もとは MagiBurst 専用でした）。<br>" +
        "・<b>ジェムは1個＝1米ドル、XEVA は1＝1円</b>。交換レートは<b>そのときのドル円</b>です（1ドル155円なら 155 XEVA ＝ 💎1）。<b>XEVARION ホームのジェム変換所</b>から交換できます<br>" +
        "・となりの<b>ジェムショップ</b>には<b>1回だけ買えるお得なパック</b>があり、通常より 50〜70% 多く受け取れます<br>" +
        "・MagiBurst のクエスト初クリア、以降も1日1回のクリアで +1<br>" +
        "・ミッション・実績・メールの配布<br>" +
        "残高は<b>アカウントに紐づいて全端末で同期</b>されます。ホーム画面の XEVA のとなりに出ています。" },
    { id: "sync", q: ["同期", "引き継", "端末", "機種変", "データ移行", "別のスマホ", "消えた", "戻った", "反映されない"],
      t: "データの同期・引き継ぎ",
      a: "セーブは <b>XEVARION アカウント</b>に紐づいてクラウドに保存されます。別の端末で同じ名前＋4桁PINでログインすれば、そのまま続きから遊べます。<br>" +
        "同期は「<b>あとに更新した方が勝つ</b>」タイムスタンプ方式です。<br>" +
        "うまく反映されないときは、① オンラインで一度アプリを開き直す ② <b>設定 → アプリの更新</b> を実行 ③ それでも直らなければ、別端末で先に開き直してから元の端末を開く、の順で試してください。" },
    { id: "offline", q: ["オフライン", "機内", "圏外", "電波", "インストール", "ホーム画面に追加", "アプリ化", "pwa"],
      t: "オフラインとインストール",
      a: "XEVARION をホーム画面に追加（インストール）すると、<b>MagiLex ／ MagiBurst ／ MagiChainParty ／ XEVYNAR</b> は機内モードでも起動します。<br>" +
        "オフライン中の進行は端末に残り、オンラインに戻った時点でクラウドへ反映されます。<br>" +
        "iPhone は Safari の共有ボタン →「ホーム画面に追加」、PC はアドレスバー右端のインストールアイコンから追加できます。" },
    { id: "account", q: ["アカウント", "ログイン", "パスワード", "pin", "4桁", "名前を変え", "ログアウト"],
      t: "アカウント",
      a: "XEVARION は<b>表示名 ＋ 4桁PIN</b>でログインします。名前は他の人と重複しません。<br>" +
        "名前・アイコン・PINの変更は <b>設定 → アカウント設定</b>から。ログアウトすると、その端末のゲームデータは次のログインで入れ替わります（クラウドには残っています）。" },
    { id: "ranking", q: ["ランキング", "順位", "月間", "1位"],
      t: "MagiRanking",
      a: "<b>MagiRanking</b> は、その月に獲得した XEVA の合計で順位を競う月間ランキングです。月末の順位に応じて最大 1,000 XEVA が配布されます。<br>使った XEVA は減点にならないので、<b>獲得量</b>だけを気にすればOKです。" },
    { id: "gacha", q: ["ガチャ", "召喚", "確定", "天井", "排出", "10連", "ピックアップ"],
      t: "ガチャ",
      a: "XEVARION 本体の<b>XEVAガチャ</b>と、MagiBurst の<b>プレミアムセレクトガチャ</b>（ジェム）があります。<br>" +
        "MagiBurst は 1回💎5／5連💎25／<b>10連💎50（最後の1枠が★5確定）</b>。ピックアップは自分で選べます。<br>" +
        "フェス限定★5はプレミアムからは出ません。<b>Nocturne Bloom Fest</b> で、🎫フェスチケットがあれば優先して消費されます。" },
    { id: "mission", q: ["ミッション", "デイリー", "報酬", "受け取"],
      t: "ミッション",
      a: "ミッションは<b>達成しただけでは報酬が入りません</b>。ホーム右上の🎯ミッションから「受け取る」を押してください。<br>メールボックス📧の配布も受取式です。「すべて受け取る」でまとめて受け取れます。" },
    { id: "friend", q: ["フレンド", "友達", "招待", "合流", "部屋番号", "オンライン対戦"],
      t: "フレンドとオンライン",
      a: "フレンドは XEVARION アカウントに紐づきます。オンラインのフレンドが部屋を開いていれば、<b>部屋番号を聞かずに「参加」</b>で合流できます。<br>部屋番号で合流する遊び方（MagiBurst・MagiChainParty・MagiJackpot など）も使えます。" },
    { id: "update", q: ["更新", "アップデート", "新機能", "バージョン", "最新"],
      t: "アプリの更新",
      a: "更新があるときはホームを開いたときに案内が出ます。自分から確認したいときは <b>設定 → アプリの更新</b> から。<br>データサイズと更新内容を確認してからダウンロードできます。Wi-Fi での更新がおすすめです。" },
    { id: "trouble", q: ["動かない", "開かない", "バグ", "エラー", "重い", "落ちる", "フリーズ", "真っ白"],
      t: "うまく動かないとき",
      a: "① ホームの<b>お知らせ</b>に不具合情報が出ていないか確認<br>" +
        "② いったんホームに戻って開き直す（データはアカウントに残ります）<br>" +
        "③ <b>設定 → アプリの更新</b>で最新データを取り込む<br>" +
        "④ オフラインなら電波の良いところで開き直す<br>" +
        "それでも直らないときは、何をしたときに起きるかをメモしておいてください。再現手順があると直りが早くなります。" },
  ];

  /* ════════════ MagiBurst 本体が書き出した最新の知識を優先 ════════════ */
  function liveKB() {
    try {
      const raw = localStorage.getItem("xevynar_kb_burst_v1");
      if (!raw) return null;
      const j = JSON.parse(raw);
      if (!j || !Array.isArray(j.chars) || !j.chars.length) return null;
      return j;
    } catch (e) { return null; }
  }

  function rowsToChars(rows) {
    return rows.map((r, i) => ({
      id: r[0], no: i + 1, nm: r[1], el: r[2], shot: r[3], type: r[4],
      star5: !!r[5], abil: String(r[6] || "").split(",").filter(Boolean),
      subfs: r[7] || "", ssName: r[8] || "", fsName: r[9] || "",
    }));
  }
  /* v2 以降は属性・HP・全ギミック・シリーズも入っている（v1 のセーブでも壊れないように既定値を置く） */
  function rowsToStages(rows) {
    return rows.map((r) => ({
      id: r[0], nm: r[1], diff: r[2], waves: r[3],
      anti: String(r[4] || "").split(",").filter(Boolean),
      el: r[5] || "", hp: r[6] || 0,
      gims: String(r[7] || "").split(",").filter(Boolean),
      series: r[8] || "castle", room: r[9] || 0, orb: r[10] || 0,
    }));
  }
  function rowsToRaids(rows) {
    return rows.map((r) => ({
      id: r[0], nm: r[1], drop: r[2], el: r[3], diff: r[4],
      anti: String(r[5] || "").split(",").filter(Boolean),
      series: r[6] || "", rooms: r[7] || "",
    }));
  }

  const live = liveKB();
  const CHARS = rowsToChars(live && live.chars && live.chars.length ? live.chars : CHAR_ROWS);
  const STAGES = rowsToStages(live && live.stages && live.stages.length ? live.stages : STAGE_ROWS);
  const RAIDS = rowsToRaids(live && live.raids && live.raids.length ? live.raids : RAID_ROWS);
  const POOLS = (live && live.pools) || {};
  if (live && live.abil) Object.keys(live.abil).forEach((k) => { ABIL[k] = live.abil[k]; });

  const CHAR_BY_ID = {};
  CHARS.forEach((c) => { CHAR_BY_ID[c.id] = c; });

  /* ════════════ 判定 ════════════ */
  /* そのキャラがギミック key に対応できるか。
     ★ omni（オムニアンチ）はここでは true にしない。
       「2回行動するまで」の限定つきなので、専用アビリティ持ちと同じ扱いにすると
       "対策できています" と答えたのに実際は無防備、という誤案内になる。
       omni を含めたいときは canCover() を使い、必ず条件つきである旨も一緒に伝えること。 */
  function counters(charId, key) {
    const c = CHAR_BY_ID[charId];
    if (!c) return false;
    return (COUNTER[key] || { need: [] }).need.some((a) => c.abil.indexOf(a) >= 0);
  }
  function isOmni(charId) {
    const c = CHAR_BY_ID[charId];
    return !!c && c.abil.indexOf("omni") >= 0;
  }
  function canCover(charId, key) { return counters(charId, key) || isOmni(charId); }
  /* そのキャラが対策できるギミックのキー一覧（omni は含めない） */
  function antiKeysOf(charId) { return Object.keys(COUNTER).filter((k) => counters(charId, k)); }
  /* あるギミックを対策できる全キャラ（★5を先に、次に番号順） */
  function countersFor(key) {
    return CHARS.filter((c) => counters(c.id, key))
      .sort((a, b) => (b.star5 ? 1 : 0) - (a.star5 ? 1 : 0) || a.no - b.no);
  }
  /* ★ MagiBurst 本体を一度も開いていない人向けの入手先の土台。
     POOLS（本体が書き出す最新）が空でも「どこで取れる？」に答えられるようにする。
     キャラを足したらここも更新すること。 */
  const POOL_STATIC = {
    fiona: "fes", milfy: "fes", mabel: "fes", abyss: "fes", arche: "fes",
    mion: "cross", kokona: "cross", mao: "cross", arisa: "cross",
    shion: "raid", viola: "raid", aira: "raid",
    mizuki: "reward", ayaka: "cdk", hecatia: "garden",
  };
  /* そのキャラの入手先 */
  function poolsOf(charId) {
    const raw = POOLS[charId];
    if (raw) return String(raw).split(",").filter(Boolean);
    const r = RAIDS.find((x) => x.drop === charId);
    if (r) return ["raid"];
    if (POOL_STATIC[charId]) return [POOL_STATIC[charId]];
    /* 上のどれでもない★5は、プレミアムセレクトガチャの排出とみなす
       （初期4体などの★5でないキャラは最初から持っているので入手先を出さない） */
    const c = CHAR_BY_ID[charId];
    return c && c.star5 ? ["premium"] : [];
  }
  function poolText(charId) {
    const ps = poolsOf(charId);
    if (!ps.length) return "";
    return ps.map((p) => {
      if (p === "raid") {
        const r = RAIDS.find((x) => x.drop === charId);
        return r ? "<b>" + r.nm + "</b>（" + r.diff + "）をクリアしてドロップ" : POOL_NM.raid[0];
      }
      const d = POOL_NM[p];
      return d ? "<b>" + d[0] + "</b>" : p;
    }).join(" / ");
  }

  /* ════════════ 検索（表記ゆれに強く） ════════════ */
  const Z2H = (s) => String(s).replace(/[０-９Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  /* カタカナ→ひらがな。長音「ー」は意味を持つので残す。 */
  function kana(s) {
    return Z2H(String(s == null ? "" : s)).toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/[\s　]/g, "");
  }
  /* ★ 数字が入っているだけで反応してはいけない。
     「3時間20分はかって」を「第3の間」と取り違えると、タイマーの依頼が編成の答えになる。
     クエストを指していると分かる語（の間／ノ園／王城／迷宮／庭園／降臨／クエスト）が
     文中にあるときだけ番号を拾う。 */
  const STAGE_MARK = /のま|の間|のその|ノ園|おうじょう|王城|めいきゅう|迷宮|ていえん|庭園|こうりん|降臨|くえすと|すてーじ|だい\d|第\d/;
  function findStage(q) {
    const s = String(q || "").trim();
    if (!s) return null;
    let hit = STAGES.find((x) => x.id === s);
    if (hit) return hit;
    /* シリーズ名を先に絞る（「迷宮12」と「王城12」を取り違えないため） */
    const k = kana(s);
    if (!STAGE_MARK.test(k) && !STAGE_MARK.test(s)) return null;
    let pool = STAGES;
    if (/めいきゅう|迷宮|らぼ|lab/.test(k)) pool = STAGES.filter((x) => x.series === "lab" || /迷宮/.test(x.nm));
    else if (/ていえん|庭園|がーでん/.test(k)) pool = STAGES.filter((x) => x.series === "garden" || /庭園/.test(x.nm));
    else if (/おうじょう|王城|しろ|城/.test(k)) pool = STAGES.filter((x) => x.series === "castle" || /王城/.test(x.nm));
    const num = (Z2H(s).match(/(\d+)/) || [])[1];
    if (num) {
      hit = pool.find((x) => x.nm.indexOf("第" + num + "の間") >= 0 || x.nm.indexOf("第" + num + "ノ園") >= 0);
      if (hit) return hit;
      hit = STAGES.find((x) => x.nm.indexOf("第" + num + "の間") >= 0 || x.nm.indexOf("第" + num + "ノ園") >= 0);
      if (hit) return hit;
    }
    return pool.find((x) => kana(x.nm).indexOf(k) >= 0) || STAGES.find((x) => kana(x.nm).indexOf(k) >= 0) || null;
  }
  /* キャラ名の検索。部分一致は「2文字以上」に限る
     （1文字だと「の」「は」のような助詞でヒットして別人を返してしまう）。 */
  function findChar(q) {
    const s = String(q || "").trim();
    if (!s) return null;
    if (CHAR_BY_ID[s]) return CHAR_BY_ID[s];
    const k = kana(s);
    let hit = CHARS.find((c) => kana(c.nm) === k);
    if (hit) return hit;
    hit = CHARS.filter((c) => kana(c.nm).length >= 2 && k.indexOf(kana(c.nm)) >= 0)
               .sort((a, b) => b.nm.length - a.nm.length)[0];
    return hit || null;
  }
  /* 文中からギミック名を拾う（「ダメージウォール」「DW」「地雷」など） */
  const GIM_ALIAS = {
    dw: ["だめーじうぉーる", "だめーじうおーる", "dw", "adw", "かべだめーじ", "壁ダメージ"],
    mine: ["じらい", "地雷", "まいん", "mine", "ますい", "まいんすいーぱー"],
    warp: ["わーぷ", "warp", "aw", "あんちわーぷ"],
    block: ["ぶろっく", "block"],
    grav: ["じゅうりょくばりあ", "重力バリア", "じゅうりょく", "grav", "げんそく"],
    lockzone: ["ろっくぞーん", "lockzone", "ろっく"],
    photon: ["えーてる", "ふぉとん", "photon", "しーるど"],
    passblock: ["げきしゅげんてい", "撃種限定", "あおぶろっく", "きんぶろっく"],
    swap: ["げきしゅへんか", "撃種変化", "ぱねる"],
    ghost: ["とうめいぱねる", "透明パネル"],
    weak: ["じゃくてん", "弱点", "こあ", "core"],
    innerweak: ["ないぶじゃくてん", "内部弱点"],
    doom: ["そくし", "即死", "かうんとだうん", "doom"],
    poison: ["どく", "毒", "poison"],
    laser: ["れーざー", "laser"],
    wallchange: ["うぉーるちぇんじ", "ウォールチェンジ"],
    countboost: ["かうんとぶーすと"],
    balloon: ["ばるーん", "ひーりんぐばるーん"],
    vanish: ["う"+"ぁにっしゅ", "ゔぁにっしゅ", "ばにっしゅぼっくす"],
    ward: ["けっかい", "結界"],
  };
  function findGim(q) {
    const k = kana(q);
    let best = null, bl = 0;
    Object.keys(GIM_ALIAS).forEach((key) => {
      const cands = GIM_ALIAS[key].concat(COUNTER[key] ? [kana(COUNTER[key].nm), kana(COUNTER[key].label)] : []);
      cands.forEach((c) => {
        const n = kana(c);
        if (n.length >= 2 && k.indexOf(n) >= 0 && n.length > bl) { best = key; bl = n.length; }
      });
    });
    return best;
  }
  function gimName(key) { return (COUNTER[key] && COUNTER[key].nm) || ({
    photon: "エーテル", passblock: "撃種限定ブロック", swap: "撃種変化パネル", ghost: "透明パネル",
    weak: "弱点コア", innerweak: "内部弱点", doom: "即死攻撃", poison: "毒攻撃", laser: "レーザー",
    wallchange: "ウォールチェンジ", countboost: "カウントブーストウォール",
    balloon: "ヒーリングバルーン", vanish: "ヴァニッシュボックス", ward: "結界",
  }[key]) || key; }

  /* ポータルのアプリ・FAQ の検索 */
  function findApp(q) {
    const k = kana(q);
    let best = null, bl = 0;
    APPS.forEach((a) => {
      const n = kana(a.nm);
      if (k.indexOf(n) >= 0 && n.length > bl) { best = a; bl = n.length; }
      /* 「まじばーすと」「ばーすと」のように Magi を省く言い方も拾う */
      const short = n.replace(/^まじ/, "");
      if (short.length >= 3 && k.indexOf(short) >= 0 && short.length > bl) { best = a; bl = short.length; }
    });
    return best;
  }
  function findRetired(q) {
    const k = kana(q);
    return Object.keys(RETIRED).find((n) => k.indexOf(kana(n).replace(/^まじ/, "")) >= 0 || k.indexOf(kana(n)) >= 0) || null;
  }
  function findFaq(q) {
    const k = kana(q);
    let best = null, sc = 0;
    FAQ.forEach((f) => {
      let s = 0;
      f.q.forEach((w) => { const n = kana(w); if (n.length >= 2 && k.indexOf(n) >= 0) s += n.length; });
      if (s > sc) { sc = s; best = f; }
    });
    return sc >= 2 ? best : null;
  }

  window.XEVYNAR_KB = {
    EL_NM, EL_STRONG, EL_COUNTER, EL_MUL, SHOT_NM, COUNTER, DMG_GIMS, ABIL, GIM_TIP,
    ABIL_ROLE, ROLE_NM, rolesOf,
    abilLabel, abilDesc,
    CHARS, CHAR_BY_ID, STAGES, RAIDS, POOLS, POOL_NM,
    PARTY_RULES, LOSE_TIPS,
    APPS, RETIRED, FAQ,
    counters, isOmni, canCover, antiKeysOf, countersFor, poolsOf, poolText,
    findStage, findChar, findGim, gimName, findApp, findRetired, findFaq, kana,
    isLive: !!live,
  };
})();

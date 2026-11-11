/* ============================================================
   MagiQuiz — quiz-host.js（司会キャラ）
   ★★ 2026-11-08 ご指定「以前の提案の 6 の司会キャラ（オンオフ可能）を追加」
   ------------------------------------------------------------
   ・試合の進行に合わせて、司会のキャラが吹き出しで実況する（始まり・手番・正解・まちがい・爆発・転落・優勝 …）。
     ★★ 2026-11-11 ご指定でカットイン（画面を横切る帯＋大きな絵）は出さない＝どの場面も吹き出しだけ。
   ・えらべるのは<b>持っている子だけ</b>：ホームのパートナー（xeva_mate_v1.own・笙古は最初から）と、
     完凸ロビーのキャラ（完凸＝magiburst_v1.chars[id].awk か xeva_gacha_v1.dupes[id] が 4）。
     「おまかせ」＝ホームでいま選んでいるパートナー（無ければロビーのキャラ → 笙古）。
   ・設定（MQ.FX.opt）：host（オン／オフ・既定はオン）・hostId（"" ＝おまかせ）。設定の画面の「司会キャラ」から。
   ・話し方は性格ごとに4つ（genki 明るい／teinei ていねい／otona 大人の余裕／shy ひかえめ）。{p}＝プレイヤー・{nm}＝司会の名前・{n}・{f}。
   ・絵はホームと同じ立ち絵（home-mate/）を顔の位置で丸く切り取って使う（新しい絵は作っていない）。読めないときは名前の頭文字。
   ============================================================ */
(function () {
  "use strict";
  const MQ = (window.MQ = window.MQ || {});
  const FX = MQ.FX;

  /* ── キャラの台帳（顔の位置は home-mate/<id>/<id>.json・home-lobby.js の DEFS の rig.face と同じ数字）── */
  const P = (id, name, color, size, face, r, tone) => ({ id, name, color, src: "../home-mate/" + id + "/" + id + ".webp?v=17", size, face, r, tone, kind: "mate" });
  const L = (id, name, color, face, r, tone, img, v) => ({ id, name, color, src: "../home-mate/lobby/" + (img || id) + ".webp?v=" + (v || 1), size: [941, 1672], face, r, tone, kind: "lobby" });   /* ★★ 2026-11-10 v＝絵の版（アイナ・ユナは 2） */
  const CHARS = [
    P("shoko", "笙古", "#8fb4e6", [426, 1665], [198, 202], 70, "shy"),
    P("hitomi", "瞳", "#6f86d6", [833, 1786], [368, 225], 72, "genki"),
    P("hana", "花菜", "#c8364f", [782, 1772], [392, 180], 70, "otona"),
    P("lisa", "莉沙", "#b8425a", [518, 1765], [227, 186], 72, "teinei"),
    P("anna", "杏奈", "#2f78b8", [654, 1536], [336, 195], 70, "otona"),
    P("sana", "沙夏", "#e0b43a", [497, 1934], [214, 212], 72, "shy"),
    P("maika", "舞香", "#7cc4ff", [947, 1536], [447, 205], 66, "teinei"),
    P("iori", "衣織", "#ff8fb1", [971, 1536], [479, 215], 70, "genki"),
    P("kiara", "樹愛羅", "#ffa64d", [513, 1635], [229, 195], 72, "genki"),
    P("emiri", "映美里", "#9aa8ff", [648, 1674], [252, 208], 66, "otona"),
    /* ★★ 2026-11-10 ROYAL DEBUT のマコ・アコ・ミナ・超極華祭のエナ・ミミ（完凸ロビー＝home-lobby.js の rig.face） */
    L("mako", "マコ", "#ff7a8a", [405, 205], 70, "otona"),
    L("ako", "アコ", "#7a8cff", [530, 180], 68, "shy"),
    L("mina", "ミナ", "#4f8cff", [480, 210], 70, "genki"),
    L("ena", "エナ", "#3fae6e", [400, 235], 74, "shy"),
    L("mimi", "ミミ", "#8a5cff", [560, 230], 70, "genki"),
    L("chifuru", "チフル", "#4f6dff", [410, 200], 80, "genki"),
    L("mint", "ミント", "#2fbf8a", [567, 215], 80, "shy"),
    L("purika", "プリカ", "#e0a92a", [410, 250], 72, "genki"),
    L("haru", "ハル", "#3a8ee8", [440, 205], 74, "genki"),
    L("chika", "チカ", "#8a5ce0", [530, 208], 72, "teinei"),
    L("hisako", "ヒサコ", "#38a6ff", [452, 282], 96, "genki"),
    L("alice", "アリス", "#7a5cff", [412, 235], 74, "shy"),
    L("kohaku", "コハク", "#e0484a", [470, 205], 72, "shy"),
    L("yuna", "ユナ", "#8a5cd8", [480, 215], 70, "otona", null, 2),     /* ★★ 2026-11-10 新しい立ち絵 */
    L("aina", "アイナ", "#a07cff", [490, 235], 68, "teinei", null, 2),
    L("chie", "ヨシノ", "#e03a4a", [360, 185], 62, "teinei", "chie"),
  ];
  const BY = {}; CHARS.forEach((c) => { BY[c.id] = c; });

  /* ── 持っている子（ホームと同じ決まり）── */
  const jget = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  function mateState() { return jget("xeva_mate_v1") || {}; }
  function ownedMates() {
    const st = mateState();
    let own = Array.isArray(st.own) ? st.own.slice() : st.partner && BY[st.partner] ? [st.partner] : [];
    if (own.indexOf("shoko") < 0) own.unshift("shoko");
    return own.filter((id, i) => BY[id] && BY[id].kind === "mate" && own.indexOf(id) === i);
  }
  function awkOf(id) {
    const mb = (jget("magiburst_v1") || {}).chars || {}, xg = jget("xeva_gacha_v1") || {};
    const m = mb[id], xo = !!((xg.owned || {})[id]), xd = ((xg.dupes || {})[id]) | 0;
    return Math.min(4, Math.max(m ? (m.awk | 0) : 0, xo ? xd : 0));
  }
  function available() {
    const out = ownedMates().map((id) => BY[id]);
    CHARS.forEach((c) => { if (c.kind === "lobby" && awkOf(c.id) >= 4) out.push(c); });
    return out;
  }
  /* おまかせ：ホームのパートナー → 完凸ロビー → 笙古 */
  function autoPick() {
    const st = mateState(), av = available(), has = (id) => av.some((c) => c.id === id);
    if (st.lobby && has(st.lobby)) return BY[st.lobby];
    if (st.partner && has(st.partner)) return BY[st.partner];
    return BY.shoko;
  }
  function current() {
    const id = FX.opt.hostId;
    if (id && available().some((c) => c.id === id)) return BY[id];
    return autoPick();
  }
  const on = () => FX.opt.host !== false && FX.opt.host !== 0;

  /* ── 顔の切り取り（丸）。D＝丸の直径(px)・k＝顔の半径の何倍を丸に入れるか ── */
  function faceCSS(c, D, k, cy) {
    const s = D / (c.r * (k || 2.6));
    const W = c.size[0] * s;
    const x = c.face[0] * s - D / 2, y = c.face[1] * s - D * (cy == null ? 0.5 : cy);
    return "background-image:url('" + c.src + "');background-size:" + W.toFixed(1) + "px auto;background-position:" + (-x).toFixed(1) + "px " + (-y).toFixed(1) + "px";
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  function faceHTML(c, D, cls) {
    return '<span class="mh-f' + (cls ? " " + cls : "") + '" style="--c:' + c.color + ";width:" + D + "px;height:" + D + "px;" + faceCSS(c, D) + '"><i>' + esc(c.name.slice(0, 1)) + "</i></span>";
  }

  /* ══ セリフ ══ */
  const LINES = {
    genki: {
      start: ["MagiQuiz、スタート！ 司会は{nm}だよ。みんな、がんばろー！", "{nm}が実況するよ！ 準備はいい？ いっくよー！"],
      order: ["順番が決まったよ！ トップバッターは{p}！"],
      turn: ["次は{p}の番！ ファイト！", "{p}、いってみよー！", "さあ{p}、見せちゃって！"],
      ok: ["正解！ さすが{p}！", "ナイス！ ばっちり！", "おみごと〜！"],
      combo: ["{n}問連続正解！ 止まらないね！", "{p}、{n}連続！ ノッてるー！"],
      ng: ["あ〜、おしい！", "ドンマイ！ 次こそ！", "ざんねん！ でも切りかえていこ！"],
      time: ["時間切れ〜！ あせらずいこ！", "タイムアップ！ むずかしかったね！"],
      pass: ["爆弾は{p}へパス！ ドキドキ…！", "{p}にバトンタッチ！ …爆弾だけど！"],
      heart: ["ミスが重なってライフ −1！ 気をつけて！"],
      boom: ["ドカーン！！ {p}、ライフ −1！", "爆発〜！ {p}、だいじょうぶ！？"],
      out: ["{p}、ここでアウト…！ おつかれさま！"],
      climb: ["{f}階へ！ どんどん登ってこー！", "{p}、{f}階到達！"],
      safe: ["チェックポイント通過！ ここより下には落ちないよ！"],
      top: ["てっぺん到達！！ {p}すごすぎ！"],
      fall: ["うわっ、転落〜！ まだまだこれから！"],
      drop: ["ここで降りる！ かしこい選択！"],
      buzz: ["{p}、はやい！", "押したのは{p}！"],
      otetsuki: ["お手つき！ ライフ −1！"],
      none: ["だれも答えられなかった〜！ 解説を見てみよ！"],
      rushwin: ["{p}、先取達成！！ おめでとう！"],
      final: ["優勝は{p}！ おめでとー！！", "{p}の優勝！ みんなおつかれさま！"],
      solo: ["おつかれさま！ いい勝負だったよ！"],
      wait: ["相手が来るのを待ってるよ…！"],
      online: ["オンライン対戦、スタート！ 相手に負けないで！"],
      first: ["{p}がいちばん乗り！"],
    },
    teinei: {
      start: ["MagiQuiz、はじまります。司会は{nm}がつとめますね。", "本日の司会の{nm}です。どうぞよろしくお願いします。"],
      order: ["順番が決まりました。最初は{p}さんです。"],
      turn: ["{p}さんの番です。落ちついて、どうぞ。", "次は{p}さん。がんばってくださいね。"],
      ok: ["正解です。おみごとです。", "{p}さん、正解です。すてきです。"],
      combo: ["{n}問連続で正解です。すばらしいですね。"],
      ng: ["おしいです…。次はきっと大丈夫ですよ。", "ざんねんです。解説をいっしょに見ましょう。"],
      time: ["時間切れです。むずかしい問題でしたね。"],
      pass: ["爆弾は{p}さんへ。……どきどきしますね。"],
      heart: ["ミスが続いて、ライフがひとつ減りました。"],
      boom: ["爆発しました…！ {p}さん、ライフ −1 です。"],
      out: ["{p}さんは、ここでアウトです。おつかれさまでした。"],
      climb: ["{f}階に到着です。その調子です。"],
      safe: ["チェックポイント通過です。ここより下には落ちません。"],
      top: ["てっぺん到達です…！ {p}さん、本当にすごいです。"],
      fall: ["転落してしまいました。まだ取りもどせますよ。"],
      drop: ["ここで降りるのですね。堅実な判断です。"],
      buzz: ["{p}さんが押しました。"],
      otetsuki: ["お手つきです。ライフがひとつ減ります。"],
      none: ["どなたも答えられませんでした。解説を見てみましょう。"],
      rushwin: ["{p}さん、先取達成です。おめでとうございます。"],
      final: ["優勝は{p}さんです。おめでとうございます。", "{p}さんの優勝です。みなさん、おつかれさまでした。"],
      solo: ["おつかれさまでした。よくがんばりましたね。"],
      wait: ["お相手が来るのを、いっしょに待ちましょう。"],
      online: ["オンライン対戦、はじめます。ご健闘をお祈りします。"],
      first: ["いちばん早かったのは{p}さんです。"],
    },
    otona: {
      start: ["ふふ、MagiQuiz の時間よ。司会は{nm}。楽しませてね？", "{nm}が見ててあげる。……かっこいいところ、見せて？"],
      order: ["順番が決まったわ。最初は{p}。期待してるわよ。"],
      turn: ["{p}の番ね。さあ、どうする？", "次は{p}。……緊張してる？ ふふ。"],
      ok: ["正解。やるじゃない。", "ふふ、お見事。{p}、さすがね。"],
      combo: ["{n}問連続……今日は冴えてるわね。"],
      ng: ["あら、ざんねん。次は見せてくれるわよね？", "惜しかったわね。解説、ちゃんと見ておいて。"],
      time: ["時間切れ。考えすぎたかしら？"],
      pass: ["爆弾は{p}へ。……ふふ、手が汗ばんでない？"],
      heart: ["ミスが重なってライフ −1。気をつけて。"],
      boom: ["ドカン。……{p}、ライフ −1 よ。", "あらあら、爆発。{p}、だいじょうぶ？"],
      out: ["{p}はここでおしまい。よくがんばったわ。"],
      climb: ["{f}階。いい眺めでしょう？", "{p}、{f}階まで来たわね。"],
      safe: ["チェックポイント。これで少しは安心ね。"],
      top: ["てっぺん……！ {p}、見直したわ。"],
      fall: ["あら、落ちちゃった。まだ終わりじゃないわよ。"],
      drop: ["ここで降りるの？ 賢いのね。"],
      buzz: ["{p}、早いわね。"],
      otetsuki: ["お手つき。あせっちゃだめよ？"],
      none: ["だれも答えられなかったわね。解説を見ましょう。"],
      rushwin: ["{p}が先取。……ふふ、かっこよかったわ。"],
      final: ["優勝は{p}。おめでとう、よくやったわね。", "勝ったのは{p}。……ふふ、見てて楽しかった。"],
      solo: ["おつかれさま。いい顔してたわよ。"],
      wait: ["相手を待ちましょう。焦らないの。"],
      online: ["オンライン対戦のはじまりよ。負けないでね？"],
      first: ["いちばん早かったのは{p}。やるわね。"],
    },
    shy: {
      start: ["……MagiQuiz、はじまるよ。司会は……{nm}。よろしくね。", "えっと……司会の{nm}です。がんばって、ね。"],
      order: ["……順番、決まったよ。最初は{p}。"],
      turn: ["{p}の番……がんばって。", "次は{p}。……応援してる。"],
      ok: ["……正解。すごい。", "{p}、正解……！ やった。"],
      combo: ["{n}問連続……ほんとに、すごい。"],
      ng: ["……おしかったね。次は、きっと。", "ざんねん……でも、だいじょうぶ。"],
      time: ["時間切れ……むずかしかったね。"],
      pass: ["爆弾、{p}に……どきどきする。"],
      heart: ["ミスが続いて……ライフ −1。"],
      boom: ["きゃっ……！ {p}、ライフ −1……。"],
      out: ["{p}、ここでアウト……おつかれさま。"],
      climb: ["{f}階……いい感じ。"],
      safe: ["チェックポイント……これで、ひと安心。"],
      top: ["てっぺん……！ {p}、すごい……！"],
      fall: ["……落ちちゃった。でも、まだいけるよ。"],
      drop: ["ここで降りるんだね……うん、いいと思う。"],
      buzz: ["{p}、はやい……！"],
      otetsuki: ["お手つき……ライフ −1。"],
      none: ["だれも……答えられなかったね。解説、見よ。"],
      rushwin: ["{p}、先取……！ おめでとう。"],
      final: ["優勝は……{p}。おめでとう。", "{p}の優勝……すごかった。"],
      solo: ["おつかれさま……がんばってたね。"],
      wait: ["……相手、まだかな。"],
      online: ["オンライン対戦……はじまるよ。"],
      first: ["いちばんは……{p}。"],
    },
  };
  /* カットインにする場面 */
  /* ★★ 2026-11-10 ご指定「最後の司会のカットインは要りません」→ ★★ 2026-11-11 ご指定「司会のカットインを消して」＝<b>カットインは出さない</b>（どの場面も吹き出しだけ）。
     cut() は残してある（もどすときは CUT に場面を入れるだけ）。 */
  const CUT = {};
  const lastPick = {};
  function lineFor(ev, c) {
    const T = LINES[c.tone] || LINES.genki, arr = T[ev] || LINES.genki[ev];
    if (!arr || !arr.length) return "";
    let i = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && lastPick[ev] === i) i = (i + 1) % arr.length;
    lastPick[ev] = i;
    return arr[i];
  }
  function fill(s, v, c) {
    v = v || {};
    return String(s).replace(/\{(\w+)\}/g, (m, k) => (k === "nm" ? c.name : v[k] != null ? v[k] : ""));
  }

  /* ══ 画面の部品 ══ */
  let box = null, hideT = 0, cutT = 0;
  function ensure() {
    if (box && document.body.contains(box)) return box;
    box = document.createElement("div");
    box.id = "mqHost"; box.className = "mh"; box.setAttribute("aria-live", "polite");
    box.innerHTML = '<span class="mh-fw"></span><div class="mh-b"><b class="mh-n"></b><span class="mh-t"></span></div>';
    box.addEventListener("click", () => hide());
    document.body.appendChild(box);
    return box;
  }
  function hide() { if (!box) return; box.classList.remove("on"); clearTimeout(hideT); }
  /* 吹き出しを出す。ev＝場面のキー・v＝{p,n,f}。o.ms＝出しておく時間・o.force＝オフでも出す（設定の見本） */
  function say(ev, v, o) {
    o = o || {};
    if (!on() && !o.force) return;
    const c = o.char || current(); if (!c) return;
    const raw = o.text || lineFor(ev, c); if (!raw) return;
    const tx = fill(raw, v, c);
    if (CUT[ev] && !o.noCut && !(FX.RM && FX.RM())) { cut(c, tx); return; }   /* ★★ 2026-11-11 o.cut（5問連続）もカットインにしない */
    const b = ensure();
    b.style.setProperty("--c", c.color);
    b.querySelector(".mh-fw").innerHTML = faceHTML(c, 52);
    b.querySelector(".mh-n").textContent = c.name;
    b.querySelector(".mh-t").textContent = tx;
    b.classList.remove("on"); void b.offsetWidth; b.classList.add("on");
    clearTimeout(hideT);
    hideT = setTimeout(hide, o.ms || Math.min(5200, 1900 + tx.length * 55));
  }
  /* カットイン：画面を横切る帯＋大きな絵（タップで閉じる） */
  function cut(c, tx) {
    hide();
    const fx = document.getElementById("fxt") || document.body;
    const old = document.querySelector(".mh-cut"); if (old) old.remove();
    const d = document.createElement("div");
    d.className = "mh-cut"; d.style.setProperty("--c", c.color);
    const D = Math.min(240, Math.round(window.innerHeight * 0.3), Math.round(window.innerWidth * 0.36));   /* スマホの縦でも文字が切れないように */
    d.innerHTML = '<i class="mh-cut-band"></i><span class="mh-cut-f" style="width:' + D + "px;height:" + D + "px;" + faceCSS(c, D, 3.4, 0.42) + '"></span>' +
      '<div class="mh-cut-t"><small>' + esc(c.name) + "</small><b>" + esc(tx) + "</b></div>";
    fx.appendChild(d);
    clearTimeout(cutT);
    cutT = setTimeout(() => { d.classList.add("out"); setTimeout(() => d.remove(), 420); }, 2300);
  }

  /* ══ 設定：司会キャラを選ぶ（quiz-ui.js の設定から開く）══ */
  function pickerHTML() {
    const av = available(), cur = FX.opt.hostId || "";
    const auto = autoPick();
    const row = (id, c, label, sub) => '<button class="mh-pk' + (cur === id ? " on" : "") + '" data-a="hostPick" data-v="' + id + '" style="--c:' + c.color + '">' + faceHTML(c, 46) + "<span><b>" + esc(label) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</span></button>";
    return '<div class="mh-pks">' + row("", auto, "おまかせ", "いまは " + auto.name) + av.map((c) => row(c.id, c, c.name, c.kind === "lobby" ? "完凸ロビー" : "パートナー")).join("") + "</div>" +
      '<p class="mh-note">ホームのパートナー（開放した子）と、完凸したロビーのキャラから選べます。</p>';
  }
  MQ.Host = { say, cut: (ev, v) => say(ev, v), hide, current, available, on, pickerHTML, faceHTML, CHARS, BY };
})();

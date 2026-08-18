/* ============================================================
   Magi Lotto — 画面の骨組み（ホーム／履歴／ガイド／設定）
   ------------------------------------------------------------
   ★ ホームに置くのは<b>5本柱と、いま知りたい数字だけ</b>。
     ・💎ジェムと XEVA の残高
     ・いまのレート（💎1 = ◯ XEVA）
     ・次の MAGI GRAND DRAW の日付・残り時間・いまの賞金
     ・FREE MAGI が引けるかどうか
     これ以外は足さない。増やすほど「今日なにをするか」が分からなくなる。
   ★ 5本柱への入口は、この画面の中だけに置く（迷子を作らない）。
   ============================================================ */
(function () {
  "use strict";
  const ML = window.ML;
  const $ = ML.$, fmt = ML.fmt, esc = ML.esc;

  /* 5本柱の見た目（色とアイコンはここだけで決める）
     ★ ic は絵文字（見出しなど文字の中に混ぜる用）、img は専用アイコン（カードに大きく出す用）。 */
  const GAMES = {
    scratch: { en: "SCRATCH", ja: "スクラッチ", ds: "演出を楽しむ",       c: "#3ddc8b", ic: "🎟", img: "img/ic_scratch.webp" },
    numbers: { en: "NUMBERS", ja: "ナンバーズ", ds: "自分で数字を考える", c: "#56b6ff", ic: "🔢", img: "img/ic_numbers.webp" },
    lotto:   { en: "LOTTO",   ja: "ロト",       ds: "大当たりを狙う",     c: "#ff6b7d", ic: "🎱", img: "img/ic_lotto.webp" },
    grand:   { en: "MAGI GRAND DRAW", ja: "マギグランドドロー", ds: "半月に一度のお祭り", c: "#b98bff", ic: "👑", img: "img/ic_grand.webp" },
    free:    { en: "FREE MAGI", ja: "フリーマギ", ds: "毎日ログインする理由", c: "#ffd257", ic: "🎁", img: "img/ic_free.webp" },
  };
  ML.GAMES = GAMES;

  /* ══════════════════════════════════════════════════════════
     タブの切り替え
     ══════════════════════════════════════════════════════════ */
  let view = "home";
  function go(v) {
    view = v;
    document.querySelectorAll(".ml-page").forEach((p) => p.classList.toggle("on", p.id === "mlPage_" + v));
    document.querySelectorAll(".ml-tab").forEach((t) => t.classList.toggle("on", t.dataset.v === v));
    /* ★ ゲームの画面では「買うバー」を出し、下のタブは隠す。
       買うボタンとタブが重なると、買うつもりでタブを押してしまうため。
       ゲーム画面には必ず左上に「‹」（ホームへもどる）を置いてある。 */
    const isGame = (v === "scratch" || v === "numbers" || v === "lotto" || v === "grand");
    const buy = $("#mlBuy");
    if (buy) buy.style.display = isGame ? "" : "none";
    const tabs = $("#mlTabs");
    /* ★ FREE MAGI は下のタブから直接来られるので、タブは出したままにする
       （買うバーが無いので重ならない）。買う画面だけタブを隠す。 */
    if (tabs) tabs.style.display = isGame ? "none" : "";
    if (v === "home") paintHome();
    if (v === "log") paintLog();
    if (v === "guide") paintGuide();
    if (v === "set") paintSet();
    if (v === "scratch" && ML.scratch) ML.scratch.open();
    if (v === "numbers" && ML.numbers) ML.numbers.open();
    if (v === "lotto" && ML.lotto) ML.lotto.open();
    if (v === "grand" && ML.grand) ML.grand.open();
    if (v === "free" && ML.free) ML.free.open();
    window.scrollTo(0, 0);
  }
  ML.go = go;
  window.mlGo = go;

  /* ══════════════════════════════════════════════════════════
     ウォレット・レート
     ══════════════════════════════════════════════════════════ */
  let _lastGem = null, _lastXeva = null;
  function paintWal() {
    const g = ML.gems(), x = ML.xeva();
    const eg = $("#mlGem"), ex = $("#mlXeva");
    if (eg) { eg.textContent = fmt(g); bump(eg, _lastGem, g); }
    if (ex) { ex.textContent = fmt(x); bump(ex, _lastXeva, x); }
    _lastGem = g; _lastXeva = x;
    const r = $("#mlRateN"); if (r) r.textContent = fmt(ML.gemRate());
  }
  function bump(el, prev, now) {
    if (prev == null || prev === now) return;
    const w = el.closest(".ml-w"); if (!w) return;
    w.classList.remove("bump"); void w.offsetWidth; w.classList.add("bump");
  }
  ML.paintWal = paintWal;

  /* ══════════════════════════════════════════════════════════
     ホーム
     ══════════════════════════════════════════════════════════ */
  function grandCardHTML() {
    const gi = ML.grandInfo();
    const p = ML.pool();
    const S = ML.state();
    const mine = (S.entries[gi.nextId] || []).length;
    const live = gi.isDrawDay;
    return `
      ${live ? '<span class="live">RESULT DAY</span>' : ""}
      ${/* ★ 看板の絵にもう抽選機が大きく写っているので、machine.webp はここには重ねない
             （二重に置くと画面がうるさくなるだけ）。抽選機は結果発表の演出で主役にする。 */""}
      <img class="bn" src="img/banner_home.webp" alt="MAGI GRAND DRAW">
      <span class="ov"></span>
      <div class="in">
        <div class="ttl">MAGI GRAND DRAW</div>
        <div class="sub">半月に一度の大抽選 — 毎月 1日 と 16日</div>
        <div class="box">
          <div class="lb">次回 結果発表</div>
          <div class="day">${esc(gi.nextText)}</div>
          <div class="ml-cd">
            <div><b>${gi.d}</b><i>日</i></div>
            <div><b>${gi.h}</b><i>時間</i></div>
            <div><b>${gi.m}</b><i>分</i></div>
          </div>
          <div class="ml-pool">
            <div class="lb2">現在の賞金総額</div>
            <div class="amt" id="mlPoolAmt">${fmt(p)}</div>
            <div class="cur">XEVA</div>
          </div>
        </div>
        <div class="cta">${mine ? "参加中 " + mine + "口 ・ 詳細を見る" : "詳細を見る"}</div>
      </div>`;
  }

  function menuHTML() {
    return ["scratch", "numbers", "lotto"].map((k) => {
      const g = GAMES[k];
      const price = k === "scratch" ? ML.cfg().scratch.price : k === "numbers" ? ML.cfg().numbers.price : ML.cfg().lotto.price;
      return `<button class="ml-mi" style="--c:${g.c}" onclick="mlGo('${k}')">
        <img class="ic" src="${g.img}" alt="">
        <span class="en">${g.en}</span>
        <span class="ja">${g.ja}</span>
        <span class="ds">${g.ds}</span>
        <span class="pr">${ML.priceText(price)}</span>
      </button>`;
    }).join("");
  }

  function freeHTML() {
    const ready = ML.draw.freeReady();
    const S = ML.state();
    return `<button class="ml-free ${ready ? "" : "done"}" onclick="mlGo('free')">
      <img class="ic" src="${GAMES.free.img}" alt="">
      <span class="bd">
        <span class="en">FREE MAGI</span>
        <span class="ja">フリーマギ — ${GAMES.free.ds}</span>
        <span class="ds">${ready
          ? "今日の1回がまだ残っています。無料で回せます"
          : "今日はもう引きました（あと " + ML.draw.freeLeftText() + " で復活）"}${S.freeStreak > 1 ? " ・ " + S.freeStreak + "日連続" : ""}</span>
      </span>
      <span class="go">${ready ? "引く" : "済"}</span>
    </button>`;
  }

  function paintHome() {
    const el = $("#mlHome"); if (!el) return;
    el.innerHTML =
      `<button class="ml-grand" onclick="mlGo('grand')">${grandCardHTML()}</button>` +
      `<div class="ml-h">遊びかたは5つ <small>それぞれ楽しみ方がちがいます</small></div>` +
      `<div class="ml-menu">${menuHTML()}</div>` +
      freeHTML() +
      todayHTML();
    paintWal();
  }
  ML.paintHome = paintHome;

  /* きょうの成績（自分ぶんだけ。他人とは比べない） */
  function todayHTML() {
    const S = ML.state(), st = S.stats;
    if (!st.plays) {
      return `<div class="ml-card"><div class="ml-note">
        ようこそ。<b>Magi Lotto</b> は、少しだけ遊んで<b>次の抽選を楽しみに待つ</b>ためのデジタル宝くじです。<br>
        まずは無料の <b>FREE MAGI</b> から。慣れてきたら <b>SCRATCH</b>、
        自分で数字を考えたくなったら <b>NUMBERS</b>、大きく狙うなら <b>LOTTO</b>。<br>
        そして毎月 <b>1日</b> と <b>16日</b> の <b>MAGI GRAND DRAW</b> が本番です。
      </div><button class="ml-sbtn" style="margin-top:10px" onclick="mlGo('guide')">あそびかたを見る</button></div>`;
    }
    const r = ML.myRtp();
    return `<div class="ml-card">
      <div class="ml-h" style="margin:0 0 6px">あなたの記録 <small>この端末に残っているぶん</small></div>
      <div class="ml-kv"><span>遊んだ回数</span><span>${fmt(st.plays)} 回</span></div>
      <div class="ml-kv"><span>使った額（XEVA換算）</span><span>${fmt(st.wagered)}</span></div>
      <div class="ml-kv"><span>当たった額</span><span style="color:var(--gold)">${fmt(st.won)}</span></div>
      <div class="ml-kv"><span>いちばん大きい当たり</span><span style="color:var(--gold)">${fmt(st.biggest)}</span></div>
      <div class="ml-kv"><span>いまの戻り</span><span>${st.wagered ? ML.pct(r, 1) : "—"}</span></div>
      <div class="ml-note" style="margin-top:8px">※ 回数が少ないうちは大きくぶれます。
        設計上の平均は <b>約 ${ML.pct(ML.rtpAll(ML.poolRaw()).rtp, 1)}</b> です（<a href="javascript:mlGo('guide')" style="color:var(--gold)">確率と配当</a>）。</div>
    </div>`;
  }

  /* 秒ごとにカウントダウンと賞金を更新（ホームを見ているときだけ） */
  setInterval(() => {
    if (view !== "home") return;
    const gi = ML.grandInfo();
    const cd = document.querySelectorAll("#mlHome .ml-cd b");
    if (cd.length === 3) { cd[0].textContent = gi.d; cd[1].textContent = gi.h; cd[2].textContent = gi.m; }
  }, 30000);
  window.addEventListener("ml:pool", () => {
    const el = $("#mlPoolAmt"); if (el) el.textContent = fmt(ML.pool());
    if (ML.grand && ML.grand.repaintPool) ML.grand.repaintPool();
  });
  window.addEventListener("xeva:change", paintWal);
  window.addEventListener("xeva:gem", paintWal);

  /* ══════════════════════════════════════════════════════════
     履歴
     ══════════════════════════════════════════════════════════ */
  function paintLog() {
    const el = $("#mlLog"); if (!el) return;
    const rows = ML.log(120);
    const S = ML.state(), st = S.stats;
    const head = `<div class="ml-card">
      <div class="ml-h" style="margin:0 0 6px">合計 <small>購入と当選のすべて</small></div>
      <div class="ml-kv"><span>購入（XEVA換算）</span><span>${fmt(st.wagered)}</span></div>
      <div class="ml-kv"><span>当選</span><span style="color:var(--gold)">${fmt(st.won)}</span></div>
      <div class="ml-kv"><span>差引</span><span style="color:${st.won - st.wagered >= 0 ? "var(--green)" : "var(--red)"}">${st.won - st.wagered >= 0 ? "+" : ""}${fmt(st.won - st.wagered)}</span></div>
      <div class="ml-kv"><span>当たった回数</span><span>${fmt(st.wins)} / ${fmt(st.plays)}</span></div>
    </div>`;
    if (!rows.length) {
      el.innerHTML = head + '<div class="ml-card"><div class="ml-note">まだ記録がありません。</div></div>';
      return;
    }
    el.innerHTML = head + '<div class="ml-h">明細 <small>新しい順・最大200件</small></div><div class="ml-log">' +
      rows.map((r) => {
        const g = GAMES[r.game] || { ic: "•", c: "#888", en: r.game };
        const big = (r.win || 0) >= (r.betXeva || 0) * 20 && r.win > 0;
        const when = new Date(r.at);
        const w = when.getMonth() + 1 + "/" + when.getDate() + " " +
          String(when.getHours()).padStart(2, "0") + ":" + String(when.getMinutes()).padStart(2, "0");
        const cost = r.betGem ? "−" + (r.pay === "xeva" ? fmt(r.betXeva) + " XEVA" : "💎" + fmt(r.betGem)) : "無料";
        const gain = r.winGem ? "💎+" + fmt(r.winGem) : r.win > 0 ? "+" + fmt(r.win) : "—";
        return `<div class="ml-lr ${big ? "big" : ""}">
          <span class="g" style="background:${g.c}22;color:${g.c}">${g.ic}</span>
          <span class="t"><span class="n">${esc(g.en)} <b style="color:${r.win > 0 ? "var(--gold)" : "var(--sub)"}">${esc(r.tierNm || "")}</b></span>
            <span class="s">${w}　${cost}${r.server === false ? "　<i style='color:#ff9ad0'>ローカル抽選</i>" : ""}</span></span>
          <span class="v ${r.win > 0 || r.winGem ? "win" : "miss"}">${gain}</span>
        </div>`;
      }).join("") + "</div>";
  }

  /* ══════════════════════════════════════════════════════════
     ガイド（あそびかた・確率と配当）
     ★ 確率と倍率は ML.rtp*() から出す＝表示と実際の抽選が食いちがわない。
     ══════════════════════════════════════════════════════════ */
  function payTable(rows, opt) {
    const o = opt || {};
    return '<div class="ml-pay"><span class="h">当選ランク</span><span class="h m">配当</span><span class="h p">確率</span>' +
      rows.map((r) => '<span>' + r.nm + "</span>" +
        '<span class="m">' + (r.jackpot ? "賞金プール全額" : "×" + fmt(Math.round(r.mul * 100) / 100)) + "</span>" +
        '<span class="p">' + (o.odds ? ML.odds(r.prob) : ML.pct(r.prob, r.prob < 0.001 ? 4 : 2)) + "</span>").join("") +
      "</div>";
  }
  function rtpLine(r) {
    return '<div class="ml-note" style="margin-top:8px">期待還元率 <b>' + ML.pct(r.rtp, 1) +
      "</b>　／　当たる確率 <b>" + ML.pct(r.hit, 1) + "</b></div>";
  }
  function paintGuide() {
    const el = $("#mlGuide"); if (!el) return;
    const sc = ML.rtpScratch(), nu = ML.rtpNumbers("distinct"), lo = ML.rtpLotto(), gr = ML.rtpGrand(ML.poolRaw());
    const all = ML.rtpAll(ML.poolRaw());
    const c = ML.cfg();
    el.innerHTML = `
      <div class="ml-card">
        <div class="ml-h" style="margin:0 0 6px">Magi Lotto の遊びかた</div>
        <div class="ml-note">
          1回のプレイは<b>数秒〜十数秒</b>で終わります。たくさん遊ぶゲームではありません。<br><br>
          ① 毎日 <b>FREE MAGI</b> を引く（無料）<br>
          ② <b>SCRATCH</b> を削って楽しむ<br>
          ③ <b>NUMBERS</b> で自分の数字を考える<br>
          ④ <b>LOTTO</b> で大当たりを狙う<br>
          ⑤ <b>MAGI GRAND DRAW</b> の口を買って、<b>1日</b>・<b>16日</b>の発表を待つ<br><br>
          この5つだけです。増やしません。
        </div>
      </div>

      <div class="ml-card">
        <div class="ml-h" style="margin:0 0 6px">お金のしくみ</div>
        <div class="ml-note">
          ・購入も当選金も <b>すべて XEVA</b> です。<b>💎ジェムでは買えません</b>。<br>
          ・値段は<b>固定額</b>（SCRATCH ${ML.priceText(c.scratch.price)}／NUMBERS ${ML.priceText(c.numbers.price)}／
            LOTTO ${ML.priceText(c.lotto.price)}／GRAND DRAW ${ML.priceText(c.grand.price)}）。
            為替で値段が上下することはありません。<br>
          ・💎ジェムは <b>FREE MAGI のごほうび</b>として当たります。当たった💎は XEVARION 全体で使えます
            （いまのレートは <b>💎1 ＝ ${fmt(ML.gemRate())} XEVA</b> ぶん）。
        </div>
      </div>

      <div class="ml-card c" style="--c:${GAMES.scratch.c}">
        <div class="ml-h" style="margin:0 0 6px;color:${GAMES.scratch.c}">SCRATCH <small>1枚 ${ML.priceText(c.scratch.price)}</small></div>
        <div class="ml-note" style="margin-bottom:8px">9マスを削って、<b>同じ絵柄が3つそろえば当たり</b>。
          そろわなかった絵柄が2つ出ているときは「あと1つ」——最後の1マスがいちばん楽しいところです。</div>
        ${payTable(sc.rows)}
        ${rtpLine(sc)}
      </div>

      <div class="ml-card c" style="--c:${GAMES.numbers.c}">
        <div class="ml-h" style="margin:0 0 6px;color:${GAMES.numbers.c}">NUMBERS <small>1口 ${ML.priceText(c.numbers.price)}</small></div>
        <div class="ml-note" style="margin-bottom:8px">0〜9 を3つえらびます。抽選の3桁とどれだけ合ったかで当選ランクが決まります。
          <b>MAGI PICK</b>（おまかせ）を使っても、<b>当選確率も配当もまったく同じ</b>です。</div>
        ${payTable(nu.rows)}
        ${rtpLine(nu)}
        <div class="ml-note" style="margin-top:8px">※ 上の表は「3つとも違う数字」を選んだときのもの。
          <b>ぞろ目</b>や<b>2つ同じ</b>を選ぶとボックスの当たりやすさが変わるので、
          <b>そのぶん配当のほうを調整</b>して、どの数字を選んでも還元率が同じ（約 ${ML.pct(nu.rtp, 1)}）になるようにしています。</div>
      </div>

      <div class="ml-card c" style="--c:${GAMES.lotto.c}">
        <div class="ml-h" style="margin:0 0 6px;color:${GAMES.lotto.c}">LOTTO <small>1口 ${ML.priceText(c.lotto.price)}</small></div>
        <div class="ml-note" style="margin-bottom:8px">1〜${c.range || c.lotto.range} から <b>${c.lotto.pick}個</b>。
          <b>5個一致 ×${fmt(c.lotto.mul[5])} → 6個一致 ×${fmt(c.lotto.mul[6])}</b> と、上に届いた瞬間に跳ね上がります。</div>
        ${payTable(lo.rows, { odds: true })}
        ${rtpLine(lo)}
      </div>

      <div class="ml-card c" style="--c:${GAMES.grand.c}">
        <div class="ml-h" style="margin:0 0 6px;color:${GAMES.grand.c}">MAGI GRAND DRAW <small>1口 ${ML.priceText(c.grand.price)}</small></div>
        <div class="ml-note" style="margin-bottom:8px">1〜${c.grand.range} から <b>${c.grand.pick}個</b>。結果発表は<b>毎月1日と16日</b>だけ。
          1等は<b>賞金プール全額</b>（最低でも <b>${fmt(c.grand.minGuarantee)} XEVA</b> は必ずお渡しします）。</div>
        ${payTable(gr.rows, { odds: true })}
        ${rtpLine(gr)}
        <div class="ml-note" style="margin-top:8px">※ 1等の原資は<b>運営が用意しています</b>。
          参加人数で賞金が変わることはなく、<b>ひとりしか居なくても抽選は成立します</b>。
          他の人と賞金を取り合うこともありません。</div>
      </div>

      <div class="ml-card c" style="--c:${GAMES.free.c}">
        <div class="ml-h" style="margin:0 0 6px;color:${GAMES.free.c}">FREE MAGI <small>無料・1日1回</small></div>
        <div class="ml-note" style="margin-bottom:8px">毎日 0:00 に復活します。無料ですが、まれに大きいものも当たります。</div>
        <div class="ml-pay"><span class="h">当たるもの</span><span class="h m"></span><span class="h p">確率</span>
          ${(function () {
            const w = c.free.wheel; let tot = 0; w.forEach((x) => { tot += x.w; });
            return w.map((x) => '<span>' + esc(x.nm) + "</span><span class='m'></span><span class='p'>" + ML.pct(x.w / tot, 2) + "</span>").join("");
          })()}
        </div>
      </div>

      <div class="ml-card">
        <div class="ml-h" style="margin:0 0 6px">全体の還元率</div>
        ${all.items.map((it) => '<div class="ml-kv"><span>' + esc(it.nm) + "</span><span>" + ML.pct(it.r.rtp, 1) + "</span></div>").join("")}
        <div class="ml-kv"><span><b>平均（購入額で重みづけ）</b></span><span style="color:var(--gold)">${ML.pct(all.rtp, 1)}</span></div>
        <div class="ml-note" style="margin-top:8px">
          ★ 上の数字は<b>この画面に出ている確率と配当から、そのまま計算したもの</b>です（別に持っている値ではありません）。<br>
          ★ MAGI GRAND DRAW の 1等ぶんは、<b>賞金プールが育つほど大きくなります</b>（いま ${fmt(ML.pool())} XEVA）。<br>
          ★ FREE MAGI は無料なので、この平均には入れていません（まるごと上乗せです）。
        </div>
      </div>

      <div class="ml-card">
        <div class="ml-h" style="margin:0 0 6px">抽選のしくみ</div>
        <div class="ml-note">
          抽選は<b>サーバー側で決まります</b>。買った時点でサーバーに「購入」が1回だけ書きこまれ、
          そのとき<b>サーバーの時計</b>が押されます。出目はその値から決まるので、
          <b>買う前にも、買ったあとにも、結果を選ぶことはできません</b>。
          書きこんだ購入は<b>上書きも削除もできない</b>ので、引き直しもできません。<br><br>
          結果は<b>先にサーバーへ記録してから</b>報酬をお渡しします。
          通信が切れてもアプリを閉じても、次に開いたときに必ず精算されます。<br><br>
          通信できない場所では、その場の安全な乱数で抽選します（履歴に「ローカル抽選」と印が付きます）。
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     設定
     ══════════════════════════════════════════════════════════ */
  let _mute = false;
  function paintSet() {
    const el = $("#mlSet"); if (!el) return;
    const S = ML.state();
    el.innerHTML = `
      <div class="ml-card">
        <div class="ml-h" style="margin:0 0 6px">設定</div>
        <div class="ml-kv"><span>効果音</span><span><button class="ml-sbtn" style="padding:6px 12px;font-size:12px" onclick="mlToggleMute()">${_mute ? "OFF" : "ON"}</button></span></div>
        <div class="ml-kv"><span>支払いにつかう通貨</span><span>XEVA のみ</span></div>
        <div class="ml-kv"><span>アカウント</span><span>${esc(ML.myName())}</span></div>
        <div class="ml-kv"><span>賞金プールの同期</span><span>${ML.poolState() === "shared" ? "同期中" : ML.poolState() === "denied" ? "権限エラー" : "接続中…"}</span></div>
      </div>
      <div class="ml-card">
        <div class="ml-h" style="margin:0 0 6px">お金のしくみ</div>
        <div class="ml-note">Magi Lotto の購入は<b>すべて XEVA</b>です（💎ジェムでは買えません）。<br>
          💎は <b>FREE MAGI のごほうび</b>として当たります。手に入れた💎は XEVARION 全体
          （ガチャ・各アプリ）で使えます。</div>
        <a class="ml-sbtn go" style="display:block;text-align:center;margin-top:9px;text-decoration:none" href="../index.html">XEVARION ホームへ</a>
      </div>
      ${ML.isAdmin() ? `<div class="ml-card"><div class="ml-h" style="margin:0 0 6px">運営メニュー</div>
        <div class="ml-note">販売価格・当選確率・報酬・最低保証を変更できます。設定はサーバーに保存され、全端末に反映されます。</div>
        <button class="ml-sbtn warn" style="margin-top:9px" onclick="mlAdmin()">管理画面をひらく</button></div>` : ""}
      <div class="ml-card">
        <div class="ml-note" style="font-size:10.5px">
          Magi Lotto は <b>XEVARION</b> のゲーム内コンテンツです。ゲーム内通貨（💎ジェム・XEVA）だけで遊べ、
          <b>現金との交換はできません</b>。当選金は月間XEVAランキングには反映されません。
        </div>
      </div>`;
  }
  window.mlToggleMute = function () { _mute = !_mute; ML.SFX.mute(_mute); paintSet(); };
  window.mlAdmin = function () { if (ML.admin) ML.admin.open(); };

  /* ══════════════════════════════════════════════════════════
     起動
     ══════════════════════════════════════════════════════════ */
  let _booted = false;
  async function boot() {
    if (_booted) return;          /* DOMContentLoaded と readyState 判定の二重起動よけ */
    _booted = true;
    paintWal();
    paintHome();
    go("home");
    await ML.boot();
    paintHome();
    /* ★ 未精算の後始末（買ったのに結果が出ないまま閉じた回） */
    try {
      const done = await ML.draw.resumePending();
      if (done.length) {
        const w = done.reduce((a, b) => a + (b.win || 0), 0);
        ML.toast("前回の未精算ぶんを精算しました（" + done.length + "件" + (w ? "・+" + fmt(w) + " XEVA" : "") + "）", 3600);
        paintWal();
      }
    } catch (e) {}
    /* ★ 発表日を過ぎた MAGI GRAND DRAW の精算（結果発表の演出へ） */
    try {
      const res = await ML.draw.settleGrand();
      if (res.length && ML.grand) ML.grand.showResults(res);
    } catch (e) {}
    paintHome();
  }

  window.addEventListener("ml:cfg", () => { if (view === "home") paintHome(); if (view === "guide") paintGuide(); });
  window.addEventListener("ml:log", () => { if (view === "log") paintLog(); });

  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();
})();

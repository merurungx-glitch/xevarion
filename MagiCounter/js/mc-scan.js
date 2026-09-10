/* ══════════════════════════════════════════════════════════════
   MagiCounter — カメラで相手の6体を読み取る（★★ 2026-09-10 ご指定）
   ──────────────────────────────────────────────────────────────
   ★ なにをするものか
     相手の選出画面をカメラで撮る（または写真をえらぶ）と、
     6つのマスに切って<b>1体ずつ候補を出し</b>、押して確定すると
     そのまま「相手の編成」に入ります。6体を手で探す手間が無くなります。

   ★ どうやって当てているか（正直に）
     文字を読むのではなく<b>色のかたち</b>で当てています。
       ① PokeAPI の小さいドット絵（96×96）を全員ぶん読んで、
          「色相12段 × 明るさ2段 ＋ 白・黒・灰」の<b>27個の数字</b>にする（＝指紋）。
       ② 撮った写真を6つに切り、同じやりかたで指紋を作る。
       ③ いちばん近いものから<b>5体を候補として出す</b>。
     ですから<b>1位が必ず正解とはかぎりません</b>。
     だからこの画面は「読み取って終わり」ではなく、
     <b>候補を押して確かめる</b>作りにしてあります。

   ★ 気をつけたところ
     ・指紋は <b>localStorage に控える</b>ので、2回目からは通信なしで一瞬。
     ・絵は <b>crossOrigin="anonymous"</b> で読む。付けないと canvas が汚れて
       getImageData が使えない（＝指紋が作れない）。
       ★ 図鑑の絵（official-artwork）とは<b>別のURL</b>（小さいドット絵）を使う。
         同じURLだと、先に crossOrigin なしで控えられた「中身の読めない返事」に
         当たってしまい、やはり canvas が汚れる。
     ・写真の中の UI（灰色の枠や文字）に引っぱられないよう、
       <b>あざやかな色ほど重く</b>数える（灰色はほとんど数えない）。
     ・カメラが使えない端末・許可しなかったときは
       <b>写真をえらぶ</b>だけで最後まで進める。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const D = window.MC_DATA, C = window.MC;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const L = (o) => (window.MC ? MC.L(o) : o.ja);
  const en = () => C.lang() === "en";

  /* 小さいドット絵（96×96・数KB）。図鑑の絵とは別のURLにしてある。 */
  const SPR = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
  const SIG_KEY = "magicounter_sig_v2";   /* ★ 指紋の形を変えたので v2（v1 は読まない） */
  /* ══ 指紋の形（★★ 2026-09-10 作り直し）══
     ・全体 …… 色相12 × 明るさ2 ＋ 白・黒・灰 ＝ 27
     ・四分割 … 上下左右の4つそれぞれで 色相12 ＋ 白・黒・灰 ＝ 15 × 4 ＝ 60
     合わせて 87 個の数字。
     ★ 四分割を足したのが精度の肝。全体の色だけだと
       「赤と青が半分ずつ」の子がみんな同じ指紋になってしまう。 */
  const BINS_G = 27;
  const BINS_Q = 15;
  const QN = 4;
  const BINS = BINS_G + BINS_Q * QN;    /* = 87 */
  /* ★★ 2026-09-10 <b>やってみて外したもの</b>（同じ回り道をしないための覚え書き）
     「絵を 8×8 のマス目に落として<b>すがた（シルエット）</b>も指紋に足す」を
     試しました。結果は<b>まったく変わらず</b>（1位の的中 43%・候補内 67% のまま）。
     理由は、ポケモンの絵はどれも「切り出した四角をだいたい埋めた形」なので、
     64個の数字がどの子もよく似てしまい、差がつかないこと。
     平均を引いて（センタリングして）も同じでした。
     ＝ 形で見分けたいなら、マス目のうまり具合ではなく
       <b>輪郭の向き</b>のような別の見かたが要ります。控えも倍になるので外しました。 */

  /* ══════════ 指紋（色のかたち） ══════════ */
  /* RGB → 色相(0-1)・彩度(0-1)・明るさ(0-1) */
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (d > 0.0001) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, s, l];
  }
  /* 画素の並び → 87個の数字。
     w,h ……… 画素の並びの幅と高さ（四分割するのに要る）
     opaqueOnly … 透明なところを数えない（ドット絵はこちら）
     satGain … 彩度を見本にそろえる倍率
     ★ あざやかな色ほど重く数える。写真の灰色い UI に引っぱられないため。 */
  function sigFrom(data, w, h, opaqueOnly, satGain) {
    const g = new Float64Array(BINS_G);
    const q = [new Float64Array(BINS_Q), new Float64Array(BINS_Q),
               new Float64Array(BINS_Q), new Float64Array(BINS_Q)];
    const qt = [0, 0, 0, 0];
    const K = satGain || 1;
    const hx = w / 2, hy = h / 2;
    let tot = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = data[i + 3];
        if (opaqueOnly && a < 160) continue;
        if (a < 24) continue;
        const c = hsl(data[i], data[i + 1], data[i + 2]), hh = c[0], l = c[2];
        /* ★ 写真は色があせているので、彩度を見本と同じくらいまで伸ばしてから数える */
        const sat = Math.min(1, c[1] * K);
        let wt, gi, qi2;
        const hb = Math.min(11, Math.floor(hh * 12));
        if (sat < 0.16) {
          /* 色みが無い＝白・灰・黒。写真の UI はここに落ちるので<b>軽く</b>数える。 */
          wt = 0.22;
          gi = l > 0.72 ? 24 : (l < 0.28 ? 25 : 26);
          qi2 = l > 0.72 ? 12 : (l < 0.28 ? 13 : 14);
        } else {
          wt = 0.35 + sat * 1.4;            /* あざやかなほど重い */
          gi = hb * 2 + (l >= 0.5 ? 1 : 0);
          qi2 = hb;
        }
        g[gi] += wt; tot += wt;
        const qn = (y < hy ? 0 : 2) + (x < hx ? 0 : 1);
        q[qn][qi2] += wt; qt[qn] += wt;
      }
    }
    if (tot <= 0) return null;
    const v = new Float64Array(BINS);
    for (let i = 0; i < BINS_G; i++) v[i] = g[i] / tot;
    /* ★ 四分割は<b>そのマスの中で</b>ならす。こうすると
       「絵の面積」ではなく「その場所の色づかい」を比べられる。
       さらに 0.7 倍して、全体の色より軽く効かせる（形の差で暴れないように）。 */
    for (let n = 0; n < QN; n++) {
      const base = BINS_G + n * BINS_Q;
      if (qt[n] <= 0) continue;
      for (let i = 0; i < BINS_Q; i++) v[base + i] = (q[n][i] / qt[n]) * 0.7;
    }
    return Array.prototype.slice.call(v);
  }
  /* 近さ（コサイン）。1に近いほど似ている。 */
  function sim(a, b) {
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < BINS; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    if (na <= 0 || nb <= 0) return 0;
    return d / Math.sqrt(na * nb);
  }

  /* ══════════ 見本（全ポケモンの指紋） ══════════ */
  let REF = null;               /* { id: [27] } */
  function loadRefCache() {
    try {
      const o = JSON.parse(localStorage.getItem(SIG_KEY) || "null");
      if (o && o.v === 2 && o.sig) return o.sig;
    } catch (e) {}
    return null;
  }
  function saveRefCache(sig) {
    try { localStorage.setItem(SIG_KEY, JSON.stringify({ v: 2, at: Date.now(), sig: sig })); } catch (e) {}
  }
  function spriteUrl(p) {
    /* フォルム専用の番号があればそちら。無ければ図鑑番号。 */
    return SPR + (p.form ? p.form : p.dex) + ".png";
  }
  /* ══ 見本（ドット絵）の指紋 ══
     ★★ 2026-09-10 <b>絵のある四角だけを切ってから</b>写す。
       ドット絵は 96×96 の中で絵が小さく、まわりが透明。
       そのまま写すと「まわりの余白」のぶんだけ写真とズレる。
       写真のほうも同じように切るので、両方の形がそろう。 */
  function sigOfImage(img, size) {
    const n = size || 48;
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    if (!w0 || !h0) return null;
    const src = document.createElement("canvas");
    src.width = w0; src.height = h0;
    const sc = src.getContext("2d", { willReadFrequently: true });
    sc.clearRect(0, 0, w0, h0);
    sc.drawImage(img, 0, 0);
    let d;
    try { d = sc.getImageData(0, 0, w0, h0).data; }
    catch (e) { return null; }        /* canvas が汚れている（CORS） */
    /* 透明でないところの四角をさがす */
    const bb = bboxAlpha(d, w0, h0, 160);
    const cv = document.createElement("canvas");
    cv.width = n; cv.height = n;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, n, n);
    if (bb) ctx.drawImage(img, bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1], 0, 0, n, n);
    else ctx.drawImage(img, 0, 0, n, n);
    try {
      return sigFrom(ctx.getImageData(0, 0, n, n).data, n, n, true, 1);
    } catch (e) { return null; }
  }
  /* 透明でない画素をかこむ四角 [x0,y0,x1,y1]（見つからなければ null） */
  function bboxAlpha(d, w, h, th) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] < th) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return null;
    return [x0, y0, x1 + 1, y1 + 1];
  }
  function loadImg(url) {
    return new Promise((res) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = url;
    });
  }
  /* 全員ぶんの指紋を用意する。onProg(done,total) で進み具合を返す。 */
  async function ensureRef(onProg) {
    if (REF) return REF;
    const cached = loadRefCache();
    const pool = D.DEX.filter((p) => p.dex && !p.custom);
    if (cached) {
      /* 足りない子だけ取りに行く（キャラが増えたとき用） */
      const missing = pool.filter((p) => !cached[p.id]);
      if (!missing.length) { REF = cached; return REF; }
      REF = cached;
      await fill(missing, onProg, pool.length - missing.length, pool.length);
      saveRefCache(REF);
      return REF;
    }
    REF = {};
    await fill(pool, onProg, 0, pool.length);
    saveRefCache(REF);
    return REF;
  }
  async function fill(list, onProg, base, total) {
    /* 同時に4本まで。全部いっぺんに投げると非力な端末で取りこぼす。 */
    let i = 0, done = base;
    const worker = async () => {
      while (i < list.length) {
        const p = list[i++];
        const im = await loadImg(spriteUrl(p));
        if (im) {
          const sg = sigOfImage(im, 48);
          if (sg) REF[p.id] = sg.map((x) => Math.round(x * 10000) / 10000);
        }
        done++;
        if (onProg) onProg(done, total);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  /* ══════════ 画面 ══════════ */
  let cb = null;                 /* 読み取り終わりに呼ぶ */
  let step = 1;
  let shot = null;               /* 撮った写真（Image / Canvas） */
  let stream = null;
  /* ★★ 2026-09-10 ご指定「スキャンする画面は基本たて一列」。
     初期値を<b>たて1列</b>にした（前は 2段×3列 で、毎回選び直しになっていた）。 */
  let layout = "6x1";            /* 6x1 / 2x3 / 3x2 / 1x6 */
  let autoFit = true;            /* マスの位置を自動でさがすか */
  let autoBands = null;          /* 自動で見つけた帯 [[y0,y1],...]（割合） */
  let trim = { t: 0, b: 0, l: 0, r: 0 };   /* 端を落とす割合（%） */
  let cells = [];                /* [{canvas, cands:[{p,score}], pick:id}] */
  let progress = null;

  const LAYOUTS = {
    "2x3": { rows: 2, cols: 3, ja: "2段×3列", en: "2 × 3" },
    "3x2": { rows: 3, cols: 2, ja: "3段×2列", en: "3 × 2" },
    "1x6": { rows: 1, cols: 6, ja: "よこ1列", en: "1 × 6" },
    "6x1": { rows: 6, cols: 1, ja: "たて1列", en: "6 × 1" },
  };

  function open(done) {
    cb = done; step = 1; shot = null; cells = []; progress = null;
    trim = { t: 0, b: 0, l: 0, r: 0 };
    draw();
    startCam();
  }
  function close() {
    stopCam();
    MCUI._closeModal();
  }
  function stopCam() {
    if (stream) { try { stream.getTracks().forEach((t) => t.stop()); } catch (e) {} stream = null; }
  }
  async function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false,
      });
    } catch (e) { stream = null; return; }
    const v = $("#scVid");
    if (!v) { stopCam(); return; }
    v.srcObject = stream;
    v.play().catch(() => {});
    const box = $("#scCamBox"); if (box) box.classList.add("on");
  }

  function draw() {
    if (step === 1) drawShoot();
    else if (step === 2) drawFrame();
    else drawConfirm();
  }

  /* ── ① 撮る ── */
  function drawShoot() {
    MCUI._openModal(
      '<div class="h" style="margin-top:4px">' + hic() + (en() ? "Scan the opponent" : "カメラで読み取る") + "</div>"
      + '<div class="card"><div class="note">'
      + (en()
        ? "Point the camera at their team preview, or choose a screenshot. Then line up the 6 cells and confirm each Pokémon."
        : "相手の選出画面を写すか、スクリーンショットをえらんでください。"
          + "そのあと<b>6つのマスを合わせて</b>、1体ずつ確かめます。")
      + "</div></div>"
      + '<div class="card scam" id="scCamBox">'
      + '<video id="scVid" playsinline muted autoplay></video>'
      + '<button class="btn pri" style="margin-top:9px" onclick="MCScan.shoot()">'
      + (en() ? "Take the photo" : "この画面を撮る") + "</button></div>"
      + '<label class="btn" style="margin-top:9px">'
      + (en() ? "Choose a photo" : "写真をえらぶ")
      + '<input type="file" accept="image/*" style="display:none" onchange="MCScan.file(this)"></label>'
      + '<div class="note" style="margin-top:10px">'
      + (en() ? "The camera preview appears only if this device allows it. The photo never leaves your device."
              : "カメラの映像は、端末が許可したときだけ出ます。写真が外へ送られることはありません。")
      + "</div>");
  }
  function shoot() {
    const v = $("#scVid");
    if (!v || !v.videoWidth) return MCUI._toast(en() ? "The camera is not ready." : "カメラの準備ができていません。");
    const cv = document.createElement("canvas");
    cv.width = v.videoWidth; cv.height = v.videoHeight;
    cv.getContext("2d").drawImage(v, 0, 0);
    stopCam();
    shot = cv; step = 2; refit(); draw();
  }
  function file(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      const cv = document.createElement("canvas");
      /* 大きすぎる写真は縮めてから使う（切り出しも指紋も速くなる） */
      const mx = 1400, k = Math.min(1, mx / Math.max(im.width, im.height));
      cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      stopCam();
      shot = cv; step = 2; refit(); draw();
    };
    im.onerror = () => { URL.revokeObjectURL(url); MCUI._toast(en() ? "Could not read the photo." : "写真を読めませんでした。"); };
    im.src = url;
  }

  /* ══ 自動でマスの位置をさがし直す ══
     ★ たて1列のときだけ。ほかの並びは等分のまま（自動でやると当てにならない）。 */
  function refit() {
    autoBands = null;
    if (!autoFit) return;
    if (LAYOUTS[layout] && LAYOUTS[layout].cols === 1) {
      try { autoBands = findBands(LAYOUTS[layout].rows); } catch (e) { autoBands = null; }
    }
  }

  /* ── ② 枠を合わせる ── */
  function drawFrame() {
    const lay = LAYOUTS[layout];
    const sl = (k, lab) => '<label class="sctrim"><i>' + lab + "</i>"
      + '<input type="range" min="0" max="35" value="' + trim[k] + '" oninput="MCScan.trim(\'' + k + '\',this.value)">'
      + '<b id="scT' + k + '">' + trim[k] + "%</b></label>";
    MCUI._openModal(
      '<div class="h" style="margin-top:4px">' + hic() + (en() ? "Line up the 6 cells" : "6つのマスを合わせる") + "</div>"
      + '<div class="card"><div class="note">'
      + (en() ? "Choose the layout and trim the edges until each cell holds one Pokémon."
              : "並びをえらび、<b>1マスに1体</b>ずつ入るように端をけずってください。")
      + "</div></div>"
      + '<div class="scstage" id="scStage"></div>'
      + '<div class="chips" style="margin:10px 0">'
      + Object.keys(LAYOUTS).map((k) =>
          '<button class="chip' + (layout === k ? " on" : "") + '" onclick="MCScan.layout(\'' + k + '\')">'
          + esc(L(LAYOUTS[k])) + "</button>").join("") + "</div>"
      /* ★★ 2026-09-10 たて1列のときは、行の位置を自動でさがせる。
         見つかったときだけ「自動で合いました」と出す（黙って動かさない）。 */
      + (LAYOUTS[layout].cols === 1
          ? '<div class="card tight"><label style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:12px">'
            + '<input type="checkbox" ' + (autoFit ? "checked" : "") + ' onchange="MCScan.auto(this.checked)">'
            + esc(en() ? "Find the rows automatically" : "行の位置を自動でさがす") + "</label>"
            + '<div class="note" style="margin-top:5px">'
            + esc(autoFit
                ? (autoBands
                    ? (en() ? "Found 6 rows. Check them below, and turn this off to adjust by hand."
                            : "6つの行が見つかりました。下で確かめて、ずれていればチェックを外して手で合わせてください。")
                    : (en() ? "Could not find the rows — using an even split. Trim the edges by hand."
                            : "行を見つけられませんでした（等分にしています）。端をけずって手で合わせてください。"))
                : (en() ? "Adjusting by hand." : "手で合わせています。"))
            + "</div></div>"
          : "")
      + '<div class="card">'
      + sl("t", en() ? "Top" : "上") + sl("b", en() ? "Bottom" : "下")
      + sl("l", en() ? "Left" : "左") + sl("r", en() ? "Right" : "右") + "</div>"
      + '<button class="btn pri" style="margin-top:10px" onclick="MCScan.run()">'
      + (en() ? "Read these 6 cells" : "この6マスを読み取る") + "</button>"
      + '<button class="btn ghost" style="margin-top:8px" onclick="MCScan.back()">'
      + (en() ? "Take another photo" : "撮りなおす") + "</button>");
    paintStage();
  }
  function paintStage() {
    const box = $("#scStage"); if (!box || !shot) return;
    const lay = LAYOUTS[layout];
    box.innerHTML = "";
    const im = document.createElement("img");
    im.src = shot.toDataURL ? shot.toDataURL("image/jpeg", 0.9) : shot.src;
    box.appendChild(im);
    const grid = document.createElement("div");
    grid.className = "scgrid";
    grid.style.left = trim.l + "%";
    grid.style.right = trim.r + "%";
    grid.style.top = trim.t + "%";
    grid.style.bottom = trim.b + "%";
    grid.style.gridTemplateColumns = "repeat(" + lay.cols + ",1fr)";
    /* ★ 自動で見つけた帯があるときは、その高さのとおりに線を引く
       （等分ではないので grid-template-rows を実寸で組み立てる）。 */
    if (lay.cols === 1 && autoFit && autoBands && autoBands.length === lay.rows) {
      const parts = [];
      let prev = 0;
      autoBands.forEach((b) => {
        if (b[0] > prev) parts.push(((b[0] - prev) * 100).toFixed(2) + "%");
        parts.push(((b[1] - b[0]) * 100).toFixed(2) + "%");
        prev = b[1];
      });
      if (prev < 1) parts.push(((1 - prev) * 100).toFixed(2) + "%");
      grid.style.gridTemplateRows = parts.join(" ");
      grid.dataset.auto = "1";
    } else {
      grid.style.gridTemplateRows = "repeat(" + lay.rows + ",1fr)";
    }
    const auto = grid.dataset.auto === "1";
    if (auto) {
      /* 帯とすきまが交互に並ぶ。帯だけ番号を振り、すきまは薄くする。 */
      const parts = grid.style.gridTemplateRows.split(" ").length;
      const isBand = {};
      let k2 = 0, prev = 0, no = 0;
      autoBands.forEach((b) => {
        if (b[0] > prev) k2++;
        isBand[k2] = ++no; k2++; prev = b[1];
      });
      for (let i = 0; i < parts; i++) {
        const c = document.createElement("i");
        if (isBand[i]) c.textContent = String(isBand[i]);
        else c.className = "gap";
        grid.appendChild(c);
      }
    } else {
      for (let i = 0; i < lay.rows * lay.cols; i++) {
        const c = document.createElement("i");
        c.textContent = String(i + 1);
        grid.appendChild(c);
      }
    }
    box.appendChild(grid);
  }
  /* ══ マスの切り出し ══
     ★★ 2026-09-10 作り直し（ご報告「読み取りの精度が悪い」）。

     ── これまでの作り ──
       枠を6等分して、<b>マスまるごと</b>を 64×64 に押しつぶしていた。
     ── なぜ精度が出なかったか ──
       たて一列の写真では、1つの行は<b>横に長い帯</b>で、
       絵はその左の一部にしかない（右は名前や数字）。
       帯まるごとを正方形に押しつぶすと絵がぺしゃんこになり、
       どの子もよく似た指紋になってしまう。
     ── いまの作り ──
       ① マスを切る（ここまでは同じ）
       ② そのマスの<b>地の色</b>を、いちばん外の帯から出す
       ③ 地の色でない画素をかこむ<b>四角</b>をさがす ＝ 絵のあるところ
       ④ その四角<b>だけ</b>を 64×64 に写しなおす
       これで、見本のドット絵（透明でない範囲で切ってある）と
       同じ形にそろう。 */
  const CELL = 64;
  /* 1マスぶんの元の位置を返す（自動でさがした帯があればそれを使う） */
  function cellBoxes() {
    const lay = LAYOUTS[layout];
    const W = shot.width, H = shot.height;
    const x0 = W * trim.l / 100, x1 = W * (1 - trim.r / 100);
    const y0 = H * trim.t / 100, y1 = H * (1 - trim.b / 100);
    const out = [];
    if (lay.cols === 1 && autoFit && autoBands && autoBands.length === lay.rows) {
      /* たて1列＋自動 … 見つけた帯をそのまま使う */
      autoBands.forEach((b) => out.push([x0, y0 + (y1 - y0) * b[0], x1 - x0, (y1 - y0) * (b[1] - b[0])]));
      return out;
    }
    const cw = (x1 - x0) / lay.cols, ch = (y1 - y0) / lay.rows;
    for (let r = 0; r < lay.rows; r++)
      for (let c2 = 0; c2 < lay.cols; c2++)
        out.push([x0 + cw * c2, y0 + ch * r, cw, ch]);
    return out;
  }
  function cutCells() {
    return cellBoxes().slice(0, 6).map((b) => {
      /* まず元の大きさのまま、そこそこの解像度で取り出す */
      const w = Math.max(16, Math.min(220, Math.round(b[2])));
      const h = Math.max(16, Math.min(220, Math.round(b[3])));
      const tmp = document.createElement("canvas");
      tmp.width = w; tmp.height = h;
      tmp.getContext("2d").drawImage(shot, b[0], b[1], b[2], b[3], 0, 0, w, h);
      /* 絵のある四角をさがして、そこだけを 64×64 に写す */
      const cv = document.createElement("canvas");
      cv.width = CELL; cv.height = CELL;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      let box = null;
      try {
        const d = tmp.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
        box = subjectBox(d, w, h);
      } catch (e) {}
      if (box) ctx.drawImage(tmp, box[0], box[1], box[2] - box[0], box[3] - box[1], 0, 0, CELL, CELL);
      else ctx.drawImage(tmp, 0, 0, w, h, 0, 0, CELL, CELL);
      return cv;
    });
  }
  /* ══ 「絵のあるところ」の四角をさがす ══
     地の色（＝いちばん外の帯の中央値）から離れた画素を数えて、
     上下左右から「そこそこ中身がある」ところまで詰める。
     ★ 1粒のノイズで四角が広がらないよう、行・列ごとの<b>割合</b>で見る。 */
  function subjectBox(d, w, h) {
    const band = Math.max(1, Math.round(Math.min(w, h) * 0.06));
    const bg = bgOfRect(d, w, h, band);
    if (!bg) return null;
    const TH = 58 * 58;
    const colN = new Float64Array(w), rowN = new Float64Array(h);
    let total = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 24) continue;
        const dr = d[i] - bg[0], dg = d[i + 1] - bg[1], db = d[i + 2] - bg[2];
        if (dr * dr + dg * dg + db * db < TH) continue;
        colN[x]++; rowN[y]++; total++;
      }
    }
    if (total < w * h * 0.02) return null;         /* ほとんど地＝あきらめる */
    const cut = (arr, len, other) => {
      const th = other * 0.10;                     /* その行・列の1割以上が中身なら「あり」 */
      let a = 0, b = len - 1;
      while (a < b && arr[a] < th) a++;
      while (b > a && arr[b] < th) b--;
      return [a, b + 1];
    };
    let cx = cut(colN, w, h), cy = cut(rowN, h, w);
    if (cx[1] - cx[0] < 6 || cy[1] - cy[0] < 6) return null;

    /* ══ 横に長いときは「絵のところ」だけを取り直す ══
       ★★ 2026-09-10 ここが精度のいちばんの分かれ目。
         たて1列の行は横長で、右がわは<b>名前やレベルの文字</b>。
         絵と文字をまとめて四角にすると、それを 64×64 に押しつぶすことになり、
         絵が横につぶれて<b>別人の指紋</b>になってしまう。
       ★ ポケモンの絵はだいたい正方形なので、
         帯の高さと同じ辺の<b>正方形の窓</b>をすべらせて、
         中身がいちばん濃いところを絵とみなす。 */
    const bw = cx[1] - cx[0], bh = cy[1] - cy[0];
    if (bw > bh * 1.45) {
      const side = bh;
      let bx = cx[0], bs = -1;
      for (let x = cx[0]; x + side <= cx[1]; x++) {
        let sum = 0;
        for (let k = 0; k < side; k++) sum += colN[x + k];
        if (sum > bs) { bs = sum; bx = x; }
      }
      cx = [bx, bx + side];
    } else if (bh > bw * 1.45) {
      /* たてに長いとき（名前が下にある形）も同じ考えかたで上下を詰める */
      const side = bw;
      let by = cy[0], bs = -1;
      for (let y = cy[0]; y + side <= cy[1]; y++) {
        let sum = 0;
        for (let k = 0; k < side; k++) sum += rowN[y + k];
        if (sum > bs) { bs = sum; by = y; }
      }
      cy = [by, by + side];
    }

    /* 少しだけ余白を戻す（切りすぎると輪郭の色が落ちる） */
    const pad = Math.round(Math.min(w, h) * 0.04);
    return [Math.max(0, cx[0] - pad), Math.max(0, cy[0] - pad),
            Math.min(w, cx[1] + pad), Math.min(h, cy[1] + pad)];
  }
  /* 四角のいちばん外の帯から「地の色」を出す（中央値） */
  function bgOfRect(d, w, h, band) {
    const rs = [], gs = [], bs = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x >= band && x < w - band && y >= band && y < h - band) continue;
        const i = (y * w + x) * 4;
        if (d[i + 3] < 24) continue;
        rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]);
      }
    }
    if (!rs.length) return null;
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    return [med(rs), med(gs), med(bs)];
  }

  /* ══ たて1列のとき、行の位置を自動でさがす ══
     ★★ 2026-09-10 作り直し（実測で「行を割ってしまう」ことが分かったため）。

     ── 前のやりかた（うまくいかなかった）──
       行ごとに中身の量を測り、「中身のあるかたまり」を上から6つひろっていた。
       ところが1行の中には<b>絵</b>と<b>名前の文字</b>があり、そのあいだが少し空く。
       そこで切れてしまい、1行が2つのかたまりに割れる。
       結果、6つひろっても「1行目の絵・1行目の名前・2行目の絵…」のように
       行とずれた帯になっていた。

     ── いまのやりかた ──
       選出の一覧は<b>同じ高さの行が等間隔にならぶ</b>。この決まりを使う。
         ・1行の高さ（pitch）と、1行目の始まり（offset）を、しらみつぶしに試す
         ・「帯の中の中身の濃さ」から「帯の境目の濃さ」を引いた点を出す
         ・いちばん点の高い置きかたを採る
       ＝ かたまりの切れ目に引きずられず、行そのものに合う。
     ★ 合計（prefix sum）を先に作ってあるので、何万通り試しても速い。 */
  function findBands(n) {
    if (!shot) return null;
    const W = 120, H = 420;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    const sx = shot.width * trim.l / 100, sx2 = shot.width * (1 - trim.r / 100);
    const sy = shot.height * trim.t / 100, sy2 = shot.height * (1 - trim.b / 100);
    ctx.drawImage(shot, sx, sy, sx2 - sx, sy2 - sy, 0, 0, W, H);
    let d;
    try { d = ctx.getImageData(0, 0, W, H).data; } catch (e) { return null; }
    const bg = bgOfRect(d, W, H, Math.round(W * 0.05));
    if (!bg) return null;

    /* 行ごとの「地の色から離れた画素の割合」 */
    const TH = 52 * 52;
    const prof = new Float64Array(H);
    for (let y = 0; y < H; y++) {
      let c = 0;
      for (let x = 0; x < W; x++) {
        const i2 = (y * W + x) * 4;
        const dr = d[i2] - bg[0], dg = d[i2 + 1] - bg[1], db = d[i2 + 2] - bg[2];
        if (dr * dr + dg * dg + db * db >= TH) c++;
      }
      prof[y] = c / W;
    }
    let mx = 0;
    for (let y = 0; y < H; y++) if (prof[y] > mx) mx = prof[y];
    if (mx <= 0.02) return null;

    /* 合計（prefix sum）。ps[y] = prof[0..y-1] の合計 */
    const ps = new Float64Array(H + 1);
    for (let y = 0; y < H; y++) ps[y + 1] = ps[y] + prof[y];
    const mean = (a, b) => {
      a = Math.max(0, Math.min(H, Math.round(a)));
      b = Math.max(0, Math.min(H, Math.round(b)));
      return b > a ? (ps[b] - ps[a]) / (b - a) : 0;
    };

    /* 1行の高さと始まりをしらみつぶしに試す */
    const pMin = Math.max(8, Math.floor(H / (n * 3)));   /* 行が画像の1/3以下ということはない */
    const pMax = Math.floor(H / n);
    let best = null;
    for (let p = pMin; p <= pMax; p++) {
      const edge = Math.max(1, Math.round(p * 0.12));    /* 境目とみなす幅 */
      const maxOff = H - p * n;
      for (let o = 0; o <= maxOff; o++) {
        let inSum = 0, edSum = 0;
        for (let k = 0; k < n; k++) {
          const a = o + p * k, b = a + p;
          /* 帯の内がわ（上下 12% を境目にゆずる） */
          inSum += mean(a + edge, b - edge);
          /* 境目（帯と帯のあいだ）。いちばん上と下は見ない */
          if (k > 0) edSum += mean(a - edge, a + edge);
        }
        const score = inSum / n - 1.35 * (n > 1 ? edSum / (n - 1) : 0);
        if (!best || score > best.score) best = { score: score, o: o, p: p };
      }
    }
    /* 中身が薄すぎる（＝そもそも写っていない）ときはあきらめる */
    if (!best || best.score < mx * 0.08) return null;
    const out = [];
    for (let k = 0; k < n; k++) out.push([(best.o + best.p * k) / H, (best.o + best.p * (k + 1)) / H]);
    return out;
  }

  /* ══ 写真のマスから指紋を作る ══
     ★★ ここが<b>いちばんの勘どころ</b>。
       ドット絵は地が透明なので「絵の色」だけが数えられている。
       写真のマスは地が塗ってあるので、そのまま数えると
       <b>地の色が答えを決めてしまう</b>（実際6マスとも同じ答えになった）。
     ★ そこで
       ① マスの<b>いちばん外の帯</b>（ふち）の色を集めて、真ん中の値を「地の色」とする
       ② 地の色に近い画素を<b>数えない</b>
       ③ 残りが少なすぎたら（＝絵が画面いっぱい等）、引かずにやり直す
       の3段構えにしてある。 */
  /* ★ 旧 bgOf（マス専用の地の色さがし）は bgOfRect に一本化して削除しました。 */

  /* ══ 写真のマスから指紋を作る ══
     ★ cutCells() の時点で「絵のある四角」に切ってあるので、
       ここでは<b>地の色を消す</b>ことに専念する。
       （切る前は帯まるごとだったので、まん中だけを見る細工が要った） */
  function sigOfCell(cv) {
    const n = CELL;
    let data;
    try { data = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, n, n).data; }
    catch (e) { return null; }
    const bg = bgOfRect(data, n, n, Math.max(1, Math.round(n * 0.08)));
    if (bg) {
      const TH = 60 * 60;                 /* 地の色からの近さ（2乗で見る） */
      const cut = new Uint8ClampedArray(data);
      let left = 0;
      for (let i = 0; i < cut.length; i += 4) {
        const dr = cut[i] - bg[0], dg = cut[i + 1] - bg[1], db = cut[i + 2] - bg[2];
        if (dr * dr + dg * dg + db * db < TH) cut[i + 3] = 0;   /* 地とみなして数えない */
        else left++;
      }
      /* 1割も残らないなら、地を引くのをやめる（引きすぎ） */
      if (left > (n * n) * 0.10) return sigFrom(cut, n, n, true, satGain(cut, true));
    }
    return sigFrom(data, n, n, false, satGain(data, false));
  }
  /* 彩度を見本にそろえるための倍率。
     ★ 見本（ドット絵）の彩度はだいたい 0.45 前後。写真はそれより低いので、
       マスごとに測って足りないぶんだけ伸ばす。伸ばしすぎないよう 0.7〜2.4 に収める。 */
  function satGain(data, opaqueOnly) {
    let sum = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (opaqueOnly && data[i + 3] < 160) continue;
      if (data[i + 3] < 24) continue;
      sum += hsl(data[i], data[i + 1], data[i + 2])[1]; n++;
    }
    if (!n || sum <= 0) return 1;
    return Math.max(0.7, Math.min(2.4, 0.45 / (sum / n)));
  }

  /* ── ③ 読み取って確かめる ── */
  async function run() {
    const cvs = cutCells();
    step = 3; cells = cvs.map((cv) => ({ cv: cv, cands: [], pick: "" }));
    progress = { done: 0, total: 1 };
    draw();
    await ensureRef((d, tt) => {
      progress = { done: d, total: tt };
      const b = $("#scProg"); if (b) b.textContent = d + " / " + tt;
      const i2 = $("#scProgBar i"); if (i2) i2.style.width = Math.round(d / tt * 100) + "%";
    });
    progress = null;
    const pool = D.DEX.filter((p) => REF[p.id]);
    cells.forEach((cell) => {
      const sg = sigOfCell(cell.cv);
      if (!sg) return;
      /* ★ 使用率を<b>ほんの少しだけ</b>足す（最大 +0.03）。
         同じくらい似ているときに「よく見る子」を上にするためだけの重み。
         これを大きくすると、めずらしい子が永久に出てこなくなる。 */
      cell.cands = pool.map((p) => ({
        p: p, score: sim(sg, REF[p.id]), bump: Math.min(0.03, (p.usage || 0) * 0.0014),
      })).sort((a, b) => (b.score + b.bump) - (a.score + a.bump)).slice(0, 6);
      cell.pick = cell.cands[0] ? cell.cands[0].p.id : "";
    });
    draw();
  }
  function drawConfirm() {
    if (progress) {
      MCUI._openModal(
        '<div class="h" style="margin-top:4px">' + hic() + (en() ? "Preparing" : "見本をそろえています") + "</div>"
        + '<div class="card"><div class="note">'
        + (en() ? "Downloading the reference sprites once. Next time this step is instant and works offline."
                : "見本の絵を<b>1回だけ</b>取りに行っています。2回目からは通信なしで一瞬です。")
        + '</div><div class="bar" id="scProgBar" style="margin-top:9px"><i style="width:0%"></i></div>'
        + '<div class="note" style="text-align:right;margin-top:4px" id="scProg">'
        + progress.done + " / " + progress.total + "</div></div>");
      return;
    }
    const rows = cells.map((cell, i) => {
      const p = cell.pick ? D.BY_ID[cell.pick] : null;
      return '<div class="sccell">'
        + '<img class="scthumb" src="' + cell.cv.toDataURL("image/png") + '" alt="">'
        + '<div class="scpick">'
        + '<div class="scno">' + (i + 1) + "</div>"
        + '<div class="scnm">' + (p ? esc(C.pname(p)) : (en() ? "not read" : "読めませんでした")) + "</div>"
        + '<div class="chips">' + cell.cands.map((c2) =>
            '<button class="chip' + (cell.pick === c2.p.id ? " on" : "") + '" onclick="MCScan.pick(' + i + ",'" + c2.p.id + '\')">'
            + esc(C.pname(c2.p)) + '<em>' + Math.round(c2.score * 100) + "</em></button>").join("")
          + '<button class="chip" onclick="MCScan.manual(' + i + ')">'
          + (en() ? "Choose…" : "手で選ぶ…") + "</button>"
          + (cell.pick ? '<button class="chip" onclick="MCScan.pick(' + i + ",''" + ')">'
              + (en() ? "Skip" : "入れない") + "</button>" : "")
        + "</div></div></div>";
    }).join("");
    const n = cells.filter((c2) => c2.pick).length;
    MCUI._openModal(
      '<div class="h" style="margin-top:4px">' + hic() + (en() ? "Check each one" : "1体ずつ確かめる") + "</div>"
      + '<div class="card"><div class="note">'
      + (en()
        ? "Matching is done by colour, so the first guess can be wrong. Tap the right one — the number is how close it looked."
        : "当てているのは<b>色のかたち</b>なので、1番目がちがうことがあります。"
          + "正しいものを押してください（数字は<b>どれくらい似ていたか</b>です）。")
      + "</div></div>"
      + '<div class="card">' + rows + "</div>"
      + '<button class="btn pri" style="margin-top:10px" onclick="MCScan.done()">'
      + (en() ? "Use these " + n : "この" + n + "体を相手の編成に入れる") + "</button>"
      + '<button class="btn ghost" style="margin-top:8px" onclick="MCScan.back2()">'
      + (en() ? "Adjust the cells" : "マスを合わせなおす") + "</button>");
  }

  /* 見出しの丸いアイコン（mc-ui のものを借りる） */
  function hic() { return (window.MCUI && MCUI._hIc) ? MCUI._hIc("search") : ""; }

  /* ══════════ 公開 ══════════ */
  window.MCScan = {
    open: open,
    shoot: shoot,
    file: file,
    layout(k) { layout = k; refit(); drawFrame(); },
    auto(v) { autoFit = !!v; refit(); drawFrame(); },
    trim(k, v) {
      trim[k] = Math.max(0, Math.min(35, parseInt(v, 10) || 0));
      /* ★ 数字だけ書きかえる。画面ごと描き直すと<b>指を離した扱い</b>になって
         スライダーが動かせなくなる。 */
      const b = $("#scT" + k);
      if (b) b.textContent = trim[k] + "%";
      paintStage();
    },
    run: run,
    back() { step = 1; draw(); startCam(); },
    back2() { step = 2; draw(); },
    pick(i, id) { if (cells[i]) { cells[i].pick = id; drawConfirm(); } },
    manual(i) {
      /* 候補にいないときは、ふつうの検索から選ぶ。
         ★ その画面からは<b>ランク外のポケモンの登録</b>にも行けるので、
           表に載っていない子でもここで入れられる。 */
      MCUI._pickInto((id) => { if (cells[i]) cells[i].pick = id; drawConfirm(); });
    },
    done() {
      const ids = cells.map((c2) => c2.pick).filter(Boolean);
      const uniq = [];
      ids.forEach((x) => { if (uniq.indexOf(x) < 0) uniq.push(x); });
      close();
      if (cb) cb(uniq);
    },
    close: close,
  };
})();

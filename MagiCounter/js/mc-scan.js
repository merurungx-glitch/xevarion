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
  const SIG_KEY = "magicounter_sig_v1";
  const BINS = 27;            /* 色相12 × 明るさ2 ＋ 白・黒・灰 */

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
  /* 画素の並び → 27個の数字。
     opaqueOnly … 透明なところを数えない（ドット絵はこちら）
     ★ あざやかな色ほど重く数える。写真の灰色い UI に引っぱられないため。 */
  function sigFrom(data, opaqueOnly, satGain) {
    const v = new Float64Array(BINS);
    const K = satGain || 1;
    let tot = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (opaqueOnly && a < 160) continue;
      if (a < 24) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const c = hsl(r, g, b), h = c[0], l = c[2];
      /* ★ 写真は色があせているので、彩度を見本と同じくらいまで伸ばしてから数える */
      const s = Math.min(1, c[1] * K);
      let w, idx;
      if (s < 0.16) {
        /* 色みが無い＝白・灰・黒。写真の UI はここに落ちるので<b>軽く</b>数える。 */
        w = 0.22;
        idx = l > 0.72 ? 24 : (l < 0.28 ? 25 : 26);
      } else {
        w = 0.35 + s * 1.4;               /* あざやかなほど重い */
        const hb = Math.min(11, Math.floor(h * 12));
        idx = hb * 2 + (l >= 0.5 ? 1 : 0);
      }
      v[idx] += w; tot += w;
    }
    if (tot <= 0) return null;
    for (let i = 0; i < BINS; i++) v[i] /= tot;
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
      if (o && o.v === 1 && o.sig) return o.sig;
    } catch (e) {}
    return null;
  }
  function saveRefCache(sig) {
    try { localStorage.setItem(SIG_KEY, JSON.stringify({ v: 1, at: Date.now(), sig: sig })); } catch (e) {}
  }
  function spriteUrl(p) {
    /* フォルム専用の番号があればそちら。無ければ図鑑番号。 */
    return SPR + (p.form ? p.form : p.dex) + ".png";
  }
  function sigOfImage(img, size) {
    const n = size || 40;
    const cv = document.createElement("canvas");
    cv.width = n; cv.height = n;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, n, n);
    ctx.drawImage(img, 0, 0, n, n);
    try {
      return sigFrom(ctx.getImageData(0, 0, n, n).data, true);
    } catch (e) { return null; }     /* canvas が汚れている（CORS） */
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
          const sg = sigOfImage(im, 40);
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
  let layout = "2x3";            /* 2x3 / 3x2 / 1x6 / 6x1 */
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
    shot = cv; step = 2; draw();
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
      shot = cv; step = 2; draw();
    };
    im.onerror = () => { URL.revokeObjectURL(url); MCUI._toast(en() ? "Could not read the photo." : "写真を読めませんでした。"); };
    im.src = url;
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
    grid.style.gridTemplateRows = "repeat(" + lay.rows + ",1fr)";
    for (let i = 0; i < lay.rows * lay.cols; i++) {
      const c = document.createElement("i");
      c.textContent = String(i + 1);
      grid.appendChild(c);
    }
    box.appendChild(grid);
  }
  /* 枠のとおりに6つ切り出す。★ <b>マスまるごと</b>を 64×64 に写す
     （ふちの色を「地の色」として使いたいので、まん中だけを切らない）。 */
  const CELL = 64;
  function cutCells() {
    const lay = LAYOUTS[layout];
    const W = shot.width, H = shot.height;
    const x0 = W * trim.l / 100, x1 = W * (1 - trim.r / 100);
    const y0 = H * trim.t / 100, y1 = H * (1 - trim.b / 100);
    const cw = (x1 - x0) / lay.cols, ch = (y1 - y0) / lay.rows;
    const out = [];
    for (let r = 0; r < lay.rows; r++) {
      for (let c2 = 0; c2 < lay.cols; c2++) {
        const cv = document.createElement("canvas");
        cv.width = CELL; cv.height = CELL;
        cv.getContext("2d").drawImage(shot, x0 + cw * c2, y0 + ch * r, cw, ch, 0, 0, CELL, CELL);
        out.push(cv);
      }
    }
    return out.slice(0, 6);
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
  function bgOf(data, n, band) {
    const rs = [], gs = [], bs = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (x >= band && x < n - band && y >= band && y < n - band) continue;
        const i = (y * n + x) * 4;
        rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
      }
    }
    if (!rs.length) return null;
    const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
    return [med(rs), med(gs), med(bs)];
  }
  function sigOfCell(cv) {
    const n = CELL, band = Math.round(n * 0.14), inset = Math.round(n * 0.10);
    let data;
    try { data = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, n, n).data; }
    catch (e) { return null; }
    const bg = bgOf(data, n, band);
    /* まん中だけを見る（ふちの枠線・名前の帯を入れない） */
    const keep = [];
    for (let y = inset; y < n - inset; y++) {
      for (let x = inset; x < n - inset; x++) {
        const i = (y * n + x) * 4;
        keep.push(data[i], data[i + 1], data[i + 2], data[i + 3]);
      }
    }
    const inner = new Uint8ClampedArray(keep);
    if (bg) {
      const TH = 62 * 62;                 /* 地の色からの近さ（2乗で見る） */
      const cut = new Uint8ClampedArray(inner);
      let left = 0;
      for (let i = 0; i < cut.length; i += 4) {
        const dr = cut[i] - bg[0], dg = cut[i + 1] - bg[1], db = cut[i + 2] - bg[2];
        if (dr * dr + dg * dg + db * db < TH) cut[i + 3] = 0;   /* 地とみなして数えない */
        else left++;
      }
      /* 1割も残らないなら、地を引くのをやめる（引きすぎ） */
      if (left > (cut.length / 4) * 0.10) return sigFrom(cut, true, satGain(cut, true));
    }
    return sigFrom(inner, false, satGain(inner, false));
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
    layout(k) { layout = k; drawFrame(); },
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

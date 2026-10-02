/* ══════════════════════════════════════════════════════════════════
   XEVARION PARK — 推奨環境のチェック（★★ 2026-09-30d ご指定「推奨PCスペックを調べ、PARK起動時に警告してください」）
   ------------------------------------------------------------------
   ・推奨環境は、ブラウザで動く 3D の仮想空間（メタバース）の推奨環境（例：cluster は Core i5-7500 / Ryzen 5 1600・メモリ 8GB・
     GTX 1060 / RX 580 以上、快適にはメモリ 16GB・RTX 20 / RX 6000 以上）を目安に、このパーク（WebGL2・影・大きな島・
     たくさんの建物と乗り物）に合わせて決めた。
   ・起動したとき：ブラウザが教えてくれる情報（グラフィックの名前・CPU のスレッド数・メモリのおおよその量）で判定し、
     起動するたびに毎回「推奨環境（パソコン・スマホ）・このパソコンの判定・注意」を出す（★★ 2026-10-01 ご指定で毎回に変更）。GPU を使っていない（ハードウェアアクセラレーション OFF）ときは強く注意。
   ・遊びはじめてから 12 秒の平均の fps が低いときも、画質を下げる案内を出す（名前ではわからない場合のため）。
   ・設定の画面にも「推奨環境とこのパソコン」を出す（XSpec.html）。
   ══════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const REC = [["OS", "Windows 10 / 11（64bit）・macOS 13 以降"], ["CPU", "Intel Core i5（第8世代以降）/ AMD Ryzen 5 3600 以上（4コア8スレッド以上）"], ["メモリ", "16GB（8GB でも動きます）"], ["グラフィック", "NVIDIA GeForce GTX 1660 / RTX 2060 以上・AMD Radeon RX 5600 以上（ビデオメモリ 4GB 以上）・Apple M1 以降"], ["ブラウザ", "最新の Google Chrome / Microsoft Edge（ハードウェアアクセラレーション ON）"], ["画面", "1920×1080（フル HD）"]];
  const MIN = [["CPU", "4 スレッド以上"], ["メモリ", "8GB"], ["グラフィック", "Intel Iris Xe / AMD Radeon Graphics（CPU 内蔵）・WebGL2 対応 → 画質「低」〜「中」で"]];
  /* ★★ 2026-10-01 スマホ・タブレットの推奨（ご指定「推奨スペックでスマホについても表示」） */
  const PHONE = [["iPhone", "iPhone 13 以降（A15 Bionic 以上）・iOS 17 以降の Safari"], ["Android", "Snapdragon 8 Gen 1 / Dimensity 9000 以上・メモリ 8GB 以上・最新の Chrome"], ["タブレット", "iPad（A14 以上）・iPad Air / Pro（M1 以降）"], ["そのほか", "充電しながら・明るさを少し下げる・ほかのアプリを閉じる"]];
  const PHONE_MIN = [["iPhone", "iPhone 11 / SE（第2世代）以降（A13 以上）"], ["Android", "Snapdragon 7 シリーズ以上・メモリ 6GB 以上"]];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let INFO = null;

  /* このパソコンの情報（ブラウザが教えてくれる範囲） */
  function detect(renderer) {
    if (INFO) return INFO;
    let gpu = "", vendor = "", webgl2 = false, maxTex = 0;
    try {
      const gl = renderer && renderer.getContext ? renderer.getContext() : document.createElement("canvas").getContext("webgl2");
      webgl2 = !!(gl && typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext);
      if (gl) { maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0; const ext = gl.getExtension("WEBGL_debug_renderer_info"); gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR); }
    } catch (e) {}
    const mem = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 0;
    const mobile = matchMedia("(pointer:coarse)").matches || /iPhone|iPad|Android/.test(navigator.userAgent);
    INFO = { gpu: String(gpu || "不明"), vendor: String(vendor || ""), webgl2, maxTex, mem, cores, mobile, scr: Math.round(screen.width * (devicePixelRatio || 1)) + "×" + Math.round(screen.height * (devicePixelRatio || 1)) };
    INFO.gpuShort = INFO.gpu.replace(/^ANGLE \(/, "").replace(/\)$/, "").replace(/Direct3D.*$|OpenGL.*$|vs_\d.*$/i, "").replace(/\s+/g, " ").trim().replace(/,\s*$/, "");
    return INFO;
  }
  /* 判定：soft（GPU を使っていない）/ low（内蔵 GPU・スマホ）/ mid（内蔵の新しめ・入門の GPU）/ ok / unknown */
  function classify(I) {
    const g = I.gpu.toLowerCase(), why = [];
    let gpu = "unknown";
    if (/swiftshader|llvmpipe|basic render|microsoft basic|software/.test(g)) gpu = "soft";
    else if (/adreno.*\b7\d\d\b|immortalis|mali-g7[1-9]\d|mali-g(7[7-8]|71[0-9]|72\d)/.test(g)) gpu = "ok";          /* スマホの新しい GPU */
    else if (/adreno.*\b6[5-9]\d\b|mali-g(7[1-6]|6[8-9])/.test(g)) gpu = "mid";
    else if (/adreno|mali|powervr/.test(g)) gpu = "low";
    else if (/rtx|titan|gtx\s?(16[6-9]\d|10[7-8]0)|rx\s?(5[6-9]\d\d|6\d\d\d|7\d\d\d|9\d\d\d)|radeon pro|apple m\d|apple gpu|arc\s?a[5-9]\d\d|arc\(tm\) a[5-9]/.test(g)) gpu = "ok";
    else if (/gtx\s?(1650|1060|1050|9[5-9]0)|rx\s?(5[0-5]\d\d|4[7-9]0|5[7-9]0|vega\s?(56|64))|iris\(r\) xe|iris xe|arc/.test(g)) gpu = "mid";
    else if (/intel|uhd|hd graphics|iris|radeon\(tm\) graphics|radeon graphics|vega \d|mali|adreno|powervr|videocore/.test(g)) gpu = "low";
    if (gpu === "soft") why.push("グラフィックの処理に GPU を使っていません（ブラウザのハードウェアアクセラレーションが OFF のようです）");
    else if (gpu === "low") why.push("グラフィックが CPU 内蔵の GPU です（" + I.gpuShort + "）");
    else if (gpu === "mid") why.push("グラフィックが推奨より少し低めです（" + I.gpuShort + "）");
    if (I.mem && I.mem < 8) why.push("メモリが少なめです（約 " + I.mem + "GB・推奨 16GB）");
    if (I.cores && I.cores < 4) why.push("CPU のスレッド数が少なめです（" + I.cores + "・推奨 8 以上）");
    if (!I.webgl2) why.push("ブラウザが WebGL2 に対応していません（最新の Chrome / Edge をお使いください）");
    if (I.mobile) why.push("スマホ・タブレットでは、画質を自動で下げて動かします（パソコンでの利用がおすすめです）");
    const level = gpu === "soft" || !I.webgl2 ? "soft" : (gpu === "low" || (I.mem && I.mem < 6) || (I.cores && I.cores < 4)) ? "low" : gpu === "mid" || I.mobile ? "mid" : gpu === "ok" ? "ok" : "unknown";
    return { level, gpu, why };
  }
  function table(rows) { return '<table class="pspec">' + rows.map(([k, v]) => "<tr><th>" + esc(k) + "</th><td>" + esc(v) + "</td></tr>").join("") + "</table>"; }
  function mineRows(I) { return [["グラフィック", I.gpuShort || I.gpu], ["CPU", I.cores ? I.cores + " スレッド" : "不明"], ["メモリ", I.mem ? "約 " + I.mem + "GB（ブラウザが知らせるおおよその値）" : "不明（このブラウザは知らせません）"], ["WebGL2", I.webgl2 ? "対応" : "非対応"], ["画面", I.scr]]; }
  const HEAD = { ok: "✅ 推奨環境を満たしています。", mid: "🟡 だいたい大丈夫です。重いときは画質を「中」にしてください。", low: "⚠️ 推奨より低めです。画質「低」がおすすめです。", soft: "⛔ GPU が使われていません。ハードウェアアクセラレーションを ON にしてください。", unknown: "ℹ️ グラフィックの名前がわかりませんでした（遊びながら重さを見て、自動で画質を下げます）。" };
  function specTables(I) {
    const pc = "<b class=\"sub\">💻 パソコンの推奨環境（快適に遊べる）</b>" + table(REC) + "<b class=\"sub\">💻 パソコンの最低環境（画質「低」で動く）</b>" + table(MIN);
    const ph = "<b class=\"sub\">📱 スマホ・タブレットの推奨環境</b>" + table(PHONE) + "<b class=\"sub\">📱 スマホの最低環境（画質「低」）</b>" + table(PHONE_MIN);
    return I.mobile ? ph + pc : pc + ph;
  }
  function html(renderer) {
    const I = detect(renderer), C = classify(I);
    return '<p class="pnote">' + HEAD[C.level] + "</p><b class=\"sub\">" + (I.mobile ? "📱 このスマホ" : "💻 このパソコン") + "</b>" + table(mineRows(I)) + specTables(I);
  }
  /* ★★ 2026-10-01 起動したときは毎回、推奨環境と注意を出す（ご指定「推奨スペックの表示や注意は常に警告」）。重いときは fps でももう一度 */
  function warn(ctx) {
    const I = detect(ctx.renderer), C = classify(I);
    show(ctx, I, C, false);
    fpsWatch(ctx, C);
  }
  function show(ctx, I, C, byFps) {
    const ui = window.XParkUI; if (!ui) return;
    const title = byFps ? "動きが重いようです" : (C.level === "ok" || C.level === "mid" || C.level === "unknown") ? "推奨環境と注意（XEVARION PARK）" : (I.mobile ? "このスマホでは PARK が重くなるかもしれません" : "このパソコンでは PARK が重くなるかもしれません");
    const b = ui.panel(C.level === "soft" ? "⛔" : C.level === "ok" && !byFps ? "💻" : "⚠️", title, "spec");
    const fixes = I.mobile ? ["画質を「低」にする（下のボタン・あとで 設定 → 画質 で変えられます）", "充電しながら遊ぶ・低電力モードを OFF にする", "ほかのアプリやタブを閉じる", "長く遊ぶと本体が熱くなります。ときどき休みましょう"]
      : ["画質を「低」にする（下のボタン・あとで 設定 → 画質 で変えられます）", "ブラウザの設定 → システム →「グラフィック アクセラレーションが使用可能な場合は使用する」を ON にして、ブラウザを開きなおす", "ほかのタブやアプリを閉じる・ノートパソコンは電源につなぐ", "ウィンドウを少し小さくする（描く画素が減ります）"];
    b.innerHTML = '<div class="plobby"><p class="pnote">' + (byFps ? "最初の 12 秒の平均が <b>約 " + Math.round(C.fps) + " fps</b> でした（30 fps 以上が目安）。" : HEAD[C.level]) + "</p>" +
      "<p class=\"pnote\">⚠️ XEVARION PARK は大きな 3D の世界です。推奨環境より低いと、動きが重くなったり、本体が熱くなったりします。</p>" +
      (C.why.length ? "<ul class=\"pwhy\">" + C.why.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" : "") +
      "<b class=\"sub\">" + (I.mobile ? "📱 このスマホ" : "💻 このパソコン") + "</b>" + table(mineRows(I)) + specTables(I) +
      "<b class=\"sub\">軽くする方法</b><ol class=\"pwhy\">" + fixes.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ol></div>";
    ui.btns(b, (C.level === "ok" && !byFps ? [] : [["⚡ 画質を「低」にして遊ぶ", () => { if (ctx.setQuality) ctx.setQuality("low"); ui.close(); ctx.toast("画質を「低」にしました（設定からもどせます）"); }, "go"]]).concat([["▶ PARK で遊ぶ", () => ui.close(), C.level === "ok" ? "go" : ""]]));
  }
  /* 遊びはじめてから 12 秒の平均の fps（名前でわからないときのため） */
  /* ★★ 2026-10-02 読みこみ直後の重さで「動きが重い」と出てしまっていた（最初の 12 秒は読みこみ・材質の準備で 1 fps ほどになる）→
       読みこみの画面が消えて 4 秒たってから、1 秒ごとの fps を 10 回はかり、その<b>まん中の値</b>が 22 fps 未満のときだけ知らせる。
       画面を裏にしている間ははからない。 */
  function fpsWatch(ctx, C) {
    const ready = () => { const ld = document.getElementById("loading"); return !ld || ld.classList.contains("done") || ld.hidden || getComputedStyle(ld).display === "none"; };
    let st = 0, last = 0, cnt = 0; const secs = [];
    const loop = (t) => {
      if (document.visibilityState !== "visible" || !ready()) { st = 0; last = 0; secs.length = 0; requestAnimationFrame(loop); return; }
      if (!st) st = t;
      if (t - st < 4000) { requestAnimationFrame(loop); return; }
      if (!last) { last = t; cnt = 0; requestAnimationFrame(loop); return; }
      cnt++;
      if (t - last >= 1000) { secs.push(cnt * 1000 / (t - last)); last = t; cnt = 0; }
      if (secs.length < 10) { requestAnimationFrame(loop); return; }
      const s2 = secs.slice().sort((a, b) => a - b), fps = s2[Math.floor(s2.length / 2)];
      if (fps < 22 && !(window.XParkUI && XParkUI.busy())) { const I = detect(ctx.renderer); show(ctx, I, Object.assign({}, C, { fps, why: C.why.concat(["画面の動きが重いようです（平均 約 " + Math.round(fps) + " fps）"]) }), true); }
    };
    setTimeout(() => requestAnimationFrame(loop), 1500);
  }
  /* ★★ 2026-10-01 PARK を開く前（ホームの「XEVARION PARK」ボタン）に出す（ご指定「推奨スペックの表示は PARK を開く前に」）。
     ホーム（xevarion-home.js）がこのファイルを読みこんで、中身（html）と判定（level）を使う。PARK の中では、重いとき（fps）だけ知らせる。 */
  function pre() {
    const I = detect(null), C = classify(I);
    const fixes = I.mobile ? ["画質を「低」にする（下のボタン・あとで 設定 → 画質 で変えられます）", "充電しながら遊ぶ・低電力モードを OFF にする", "ほかのアプリやタブを閉じる", "長く遊ぶと本体が熱くなります。ときどき休みましょう"]
      : ["画質を「低」にする（下のボタン・あとで 設定 → 画質 で変えられます）", "ブラウザの設定 → システム →「グラフィック アクセラレーションが使用可能な場合は使用する」を ON", "ほかのタブやアプリを閉じる・ノートパソコンは電源につなぐ", "ウィンドウを少し小さくする（描く画素が減ります）"];
    const h = '<p class="pnote"><b>' + HEAD[C.level] + "</b></p>" +
      '<p class="pnote">⚠️ XEVARION PARK は大きな 3D の世界です。推奨環境より低いと、動きが重くなったり、本体が熱くなったりします。</p>' +
      (C.why.length ? '<ul class="pwhy">' + C.why.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" : "") +
      '<b class="sub">' + (I.mobile ? "📱 このスマホ" : "💻 このパソコン") + "</b>" + table(mineRows(I)) + specTables(I) +
      '<b class="sub">軽くする方法</b><ol class="pwhy">' + fixes.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ol>";
    return { html: h, level: C.level, mobile: I.mobile };
  }
  /* PARK の中：重いときだけ（ホームで推奨環境を見てから入ったとき） */
  function watch(ctx) { const I = detect(ctx.renderer), C = classify(I); fpsWatch(ctx, C); }
  window.XSpec = { detect, classify, html, warn, watch, pre, REC, MIN, PHONE, PHONE_MIN };
})();

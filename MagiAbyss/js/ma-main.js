/* ============================================================
   MagiAbyss — ma-main.js
   起動：セーブを読む → 入力・ボタンをつなぐ → タイトル
   ・XEVARION の同期（xeva-cloud）でセーブが書きかわったら読み直す（探索中は終わってから）。
   ★★ 2026-10-05（ご指定）
     ・スマホは横画面で遊ぶ。縦のときは「横にしてください」の演出を出し、探索は一時停止する。
       （Android のアプリ表示などでは screen.orientation.lock で横に固定もためす）
     ・iPhone のアプリ表示で下に帯が残る（箱が画面より短い）→ html.xv-full のあいだは
       本当の画面の高さ（--xv-fullh）を使う。MA.vp() がその大きさを返す。
   ============================================================ */
(function () {
  "use strict";
  const MA = (window.MA = window.MA || {});

  /* ══ 画面の大きさ（iPhone のアプリ表示では本当の高さ）══ */
  MA.vp = function () {
    const w = window.innerWidth;
    let h = window.innerHeight;
    const r = document.documentElement;
    if (r.classList.contains("xv-full")) {
      const v = parseFloat(getComputedStyle(r).getPropertyValue("--xv-fullh"));
      if (v > h && v - h < 200) h = v;
    }
    return { w, h };
  };
  /* スマホ（指で操作する小さい画面）か。タブレット・タッチ付きPCは「スマホ」にしない */
  function isPhone() {
    const coarse = window.matchMedia ? matchMedia("(pointer: coarse)").matches : ("ontouchstart" in window);
    const short = Math.min(screen.width || 9999, screen.height || 9999);
    return coarse && short < 600;
  }
  function isTouch() {
    if (window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches) return true;
    return isPhone();
  }
  MA.isPhone = isPhone; MA.isTouch = isTouch;

  /* ══ 横画面のおねがい ══ */
  let portWasRunning = false;
  function rotateEl() {
    let el = document.getElementById("rotate");
    if (el) return el;
    el = document.createElement("div");
    el.id = "rotate";
    el.innerHTML = '<div class="rt-in"><div class="rt-phone"><i></i><b></b></div><div class="rt-arrow">↻</div>' +
      '<b class="rt-t">横画面にしてください</b><p>MagiAbyss はスマホを<b>横向き</b>にして遊ぶゲームです。</p>' +
      '<small>回らないときは、画面の回転ロック（iPhone はコントロールセンター）を外してください</small></div>';
    document.body.appendChild(el);
    return el;
  }
  function checkOrient() {
    const port = isPhone() && window.innerHeight > window.innerWidth * 1.05;
    const r = document.documentElement;
    const was = r.classList.contains("ma-port");
    if (port === was) return;
    r.classList.toggle("ma-port", port);
    rotateEl().classList.toggle("on", port);
    if (port) {
      /* 探索中なら止める（もどったら「つづける」を押す前の状態のまま） */
      if (MA.G && MA.G.running && !MA.G.paused && MA.E) { portWasRunning = true; MA.E.pause("menu"); MA.UI && MA.UI.showPause(); }
      if (MA.Input) MA.Input.clearAll();
    } else {
      portWasRunning = false;
      setTimeout(() => { MA.Render && MA.Render.resize && MA.Render.resize(); MA.Guild && MA.Guild.resizeHub && MA.Guild.resizeHub(); }, 60);
    }
  }
  function tryLock() {
    try { if (isPhone() && screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
  }
  window.addEventListener("resize", checkOrient);
  window.addEventListener("orientationchange", () => setTimeout(checkOrient, 120));
  document.addEventListener("pointerdown", tryLock, { once: true });

  function pickDefaultChar() {
    const S = MA.Save.S;
    if (MA.Save.owned(S.sel)) return;
    const own = MA.D.CHAR_ORDER.find((id) => MA.Save.owned(id));
    if (own) S.sel = own;
  }
  MA.pickDefaultChar = pickDefaultChar;
  function applyDeviceClasses() {
    const b = document.body;
    b.classList.toggle("touchdev", isTouch());
    b.classList.toggle("phone", isPhone());
    b.classList.toggle("stick-right", MA.Save.S.set.stickSide === "right");
    const t = MA.Save.S.set.touch || {};
    b.style.setProperty("--tbs", String(t.size || 1));
    b.style.setProperty("--tba", String(t.alpha == null ? 0.9 : t.alpha));
  }
  MA.applyDeviceClasses = applyDeviceClasses;
  function boot() {
    try {
      MA.Save.load();
      MA.Save.rollMissions();
      pickDefaultChar();
      MA.Input.rebuildKeys();
      MA.Audio.setVol(MA.Save.S.set.bgm, MA.Save.S.set.se);
      MA.UI.bind();
      MA.Input.bindGame(document.getElementById("gc"));
      applyDeviceClasses();
      checkOrient();
      MA.Guild.title();
    } catch (e) {
      console.error(e);
      document.getElementById("title").innerHTML = '<div style="padding:24px;color:#fff;font-family:monospace">起動できませんでした：' + String(e && e.message || e) + "<br>ページを読み直してください。</div>";
    }
  }
  /* 同期で magiabyss_v1 や所持キャラが変わったとき */
  let pending = false;
  function onSynced() {
    MA.Save.dropShared();
    if (MA.G && MA.G.running) { pending = true; return; }
    MA.Save.load();
    pickDefaultChar();
    MA.Input.rebuildKeys();
    if (document.body.dataset.scr === "guild" && MA.Guild) MA.Guild.renderTop();
  }
  window.addEventListener("xeva:synced", onSynced);
  window.addEventListener("storage", (e) => { if (e.key === "magiburst_v1" || e.key === "xeva_gacha_v1" || e.key === MA.Save.KEY) onSynced(); });
  /* 探索が終わったら、たまっていた読み直しを行う */
  setInterval(() => { if (pending && !(MA.G && MA.G.running)) { pending = false; onSynced(); } }, 2000);
  /* スクロール・拡大の抑止（ゲーム画面） */
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("touchmove", (e) => { const s = document.body.dataset.scr; if (s === "run" || s === "guild" || s === "stages") { if (!e.target.closest(".mdl-in, .scroll-y")) e.preventDefault(); } }, { passive: false });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

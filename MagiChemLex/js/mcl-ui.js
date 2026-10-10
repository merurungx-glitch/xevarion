/* ============================================================
   MagiChemLex — mcl-ui.js（画面）
   ・タブ：ホーム／問題／復習／記録／ツール（スマホは下のバー・PC は左の列）
   ・演習（#play）：上（#plTop）・問題（#plBody）・メモ（#pad）・下のボタン（#plBot）の4段。
     ★★ 2026-10-06b ご指定「ボタンが多くてわかりづらい → シンプルに」：下のボタンは ヒント・メモ・決定 の3つだけ。
       電卓・定数・公式はメモ（#pad）のタブに入れた。ブックマークは問題の右上の印。
     ★★ ご指定「MagiLex のように問題中のメモを」：手書き（3色・消しゴム・戻す・全部消す）・文字・「次の問題で消す」。
       記録は magichemlex_pad_v1（同期）。
   ・アイコンは2色の重ね（.b 面・.f 線・.a 塗り）でデザインしたもの（ic()）。単元は周期表のマス風の記号（sym）。
   ・操作はすべて data-a（クリックの委任）。confirm() は使わない（出ない環境がある）。
   ============================================================ */
(function () {
  "use strict";
  const D = window.MCL_DATA, M = window.MCL, F = window.MCLFig;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = M.esc, fmt = M.fmt;
  let isTouch = false;
  try { isTouch = matchMedia("(hover: none), (pointer: coarse)").matches; } catch (e) {}

  /* ── アイコン（2色の重ね：b＝うすい面・f＝線・a＝塗り）── */
  const DI = {
    home: '<path class="b" d="M4.5 11.4 12 5.3l7.5 6.1V20h-15z"/><path class="f" d="M3 11.2 12 4l9 7.2"/><path class="f" d="M5.2 10v10h13.6V10"/><path class="f" d="M10 20v-5.2h4V20"/>',
    lib: '<path class="b" d="M5.2 4.6A1.6 1.6 0 0 1 6.8 3H19v14H7a1.8 1.8 0 0 0-1.8 1.8z"/><path class="f" d="M5 19.2V5a2 2 0 0 1 2-2h12v14H7a2 2 0 0 0-2 2.2z"/><path class="f" d="M7 21h12v-4"/><path class="f" d="M9 7.5h6.5M9 11h4.5"/>',
    review: '<circle class="b" cx="12" cy="12" r="7.6"/><path class="f" d="M19.4 13.3A7.6 7.6 0 0 1 6 17.4"/><path class="f" d="M4.6 10.7A7.6 7.6 0 0 1 18 6.6"/><path class="f" d="M18.4 3v3.9h-3.9M5.6 21v-3.9h3.9"/>',
    stats: '<rect class="b" x="4.5" y="11" width="4" height="9" rx="1.2"/><rect class="b" x="10" y="5" width="4" height="15" rx="1.2"/><rect class="b" x="15.5" y="13" width="4" height="7" rx="1.2"/><path class="f" d="M3 21h18"/><rect class="f" x="4.5" y="11" width="4" height="9" rx="1.2"/><rect class="f" x="10" y="5" width="4" height="15" rx="1.2"/><rect class="f" x="15.5" y="13" width="4" height="7" rx="1.2"/>',
    tools: '<path class="b" d="M6.2 20.6h11.6a1.5 1.5 0 0 0 1.3-2.3L15.4 12H8.6l-3.7 6.3a1.5 1.5 0 0 0 1.3 2.3z"/><path class="f" d="M9 3h6M10 3v6.6l-5.4 9A2 2 0 0 0 6.3 21.6h11.4a2 2 0 0 0 1.7-3l-5.4-9V3"/><circle class="a" cx="10.6" cy="16.4" r="1.1"/><circle class="a" cx="13.9" cy="18.2" r=".8"/>',
    gear: '<circle class="b" cx="12" cy="12" r="7"/><circle class="f" cx="12" cy="12" r="3"/><path class="f" d="M12 2.8v2.6M12 18.6v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M2.8 12h2.6M18.6 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9"/>',
    x: '<path class="f" d="M6 6l12 12M18 6 6 18"/>',
    bm: '<path class="b" d="M6.5 3.6h11v16.8L12 16.6l-5.5 3.8z"/><path class="f" d="M6 3h12v18l-6-4.2L6 21z"/>',
    hint: '<circle class="b" cx="12" cy="10" r="6.6"/><path class="f" d="M9.2 18h5.6M10.2 21h3.6"/><path class="f" d="M12 3.6a5.6 5.6 0 0 0-3.4 10c.6.5.9 1.3.9 2.2v.2h5v-.2c0-.9.3-1.7.9-2.2A5.6 5.6 0 0 0 12 3.6z"/><path class="f" d="M12 .9v.8M3.6 4l.7.7M20.4 4l-.7.7"/>',
    memo: '<rect class="b" x="3.4" y="4" width="13" height="16.5" rx="2.2"/><path class="f" d="M14.4 4H5.6a2.2 2.2 0 0 0-2.2 2.2v12.1a2.2 2.2 0 0 0 2.2 2.2h8.8a2.2 2.2 0 0 0 2.2-2.2v-2.8"/><path class="f" d="M6.8 9h5.4M6.8 12.5h3.4"/><path class="f" d="M20.6 6.3 13.2 13.7l-3.1.8.8-3.1 7.4-7.4a1.6 1.6 0 0 1 2.3 2.3z"/>',
    calc: '<rect class="b" x="5" y="2.5" width="14" height="19" rx="2.5"/><rect class="f" x="5" y="2.5" width="14" height="19" rx="2.5"/><rect class="f" x="8" y="5.5" width="8" height="3.5" rx="1"/><circle class="a" cx="8.8" cy="13" r="1"/><circle class="a" cx="12" cy="13" r="1"/><circle class="a" cx="15.2" cy="13" r="1"/><circle class="a" cx="8.8" cy="17" r="1"/><circle class="a" cx="12" cy="17" r="1"/><circle class="a" cx="15.2" cy="17" r="1"/>',
    table: '<rect class="b" x="3" y="4" width="18" height="16" rx="2.5"/><rect class="f" x="3" y="4" width="18" height="16" rx="2.5"/><path class="f" d="M3 9.5h18M9 4v16"/>',
    card: '<rect class="b" x="3" y="5" width="18" height="14" rx="2.5"/><rect class="f" x="3" y="5" width="18" height="14" rx="2.5"/><path class="f" d="M7 10h6M7 14h10"/>',
    clock: '<circle class="b" cx="12" cy="12" r="9"/><circle class="f" cx="12" cy="12" r="9"/><path class="f" d="M12 7v5l3.2 2"/>',
    flame: '<path class="b" d="M12 21.5a6.6 6.6 0 0 0 6.6-6.6c0-3.7-2.8-5.6-3.8-9.4-1 1.9-1.9 2.8-3.3 3.3-.9-1.8-1.9-3.7-1.4-5.6C7.3 5.5 5.4 9.3 5.4 12.8v2.1a6.6 6.6 0 0 0 6.6 6.6z"/><path class="f" d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-1 2-2 3-3.5 3.5C10.5 6.5 9.5 4.5 10 2.5c-3 2.5-5 6.5-5 10.2V15a7 7 0 0 0 7 7z"/>',
    search: '<circle class="b" cx="11" cy="11" r="6.5"/><circle class="f" cx="11" cy="11" r="7"/><path class="f" d="M21 21l-4.6-4.6"/>',
    play: '<path class="a" d="M8 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L9.5 3.94A1 1 0 0 0 8 4.8z"/>',
    flag: '<path class="b" d="M5.5 4.5h10.5l-2 3.8 2 3.8H5.5z"/><path class="f" d="M5 21V3.5"/><path class="f" d="M5 4h11l-2 4 2 4H5"/>',
    check: '<circle class="b" cx="12" cy="12" r="9"/><path class="f" d="M7.5 12.4l3 3 6-6.6"/>',
    target: '<circle class="b" cx="12" cy="12" r="9"/><circle class="f" cx="12" cy="12" r="9"/><circle class="f" cx="12" cy="12" r="5"/><circle class="a" cx="12" cy="12" r="1.6"/>',
    shuffle: '<path class="f" d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    trophy: '<path class="b" d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z"/><path class="f" d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path class="f" d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    list: '<path class="f" d="M9 6h12M9 12h12M9 18h12"/><circle class="a" cx="4.5" cy="6" r="1.4"/><circle class="a" cx="4.5" cy="12" r="1.4"/><circle class="a" cx="4.5" cy="18" r="1.4"/>',
    spark: '<path class="b" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path class="f" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    help: '<circle class="b" cx="12" cy="12" r="9"/><circle class="f" cx="12" cy="12" r="9"/><path class="f" d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 1-1 1.7v.4"/><circle class="a" cx="12" cy="16.8" r="1.1"/>',
    chevR: '<path class="f" d="M9 18l6-6-6-6"/>',
    chevL: '<path class="f" d="M15 18l-6-6 6-6"/>',
    next: '<path class="f" d="M4.5 12h14M13 6l6 6-6 6"/>',
    prev: '<path class="f" d="M19.5 12h-14M11 6l-6 6 6 6"/>',
    grid: '<rect class="b" x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect class="b" x="13.5" y="13.5" width="7" height="7" rx="1.6"/><rect class="f" x="3" y="3" width="8" height="8" rx="2"/><rect class="f" x="13" y="3" width="8" height="8" rx="2"/><rect class="f" x="3" y="13" width="8" height="8" rx="2"/><rect class="f" x="13" y="13" width="8" height="8" rx="2"/>',
    atom: '<circle class="a" cx="12" cy="12" r="1.8"/><ellipse class="f" cx="12" cy="12" rx="10" ry="4"/><ellipse class="f" cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse class="f" cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
    gift: '<rect class="b" x="4" y="12" width="16" height="9" rx="1.5"/><rect class="f" x="3" y="8" width="18" height="5" rx="1.2"/><path class="f" d="M5 13v8h14v-8M12 8v13M12 8s-1.5-5-4.5-5a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    filter: '<path class="b" d="M4 5h16l-6.2 7.4V19l-3.6 1.8v-8.4z"/><path class="f" d="M3.5 4.5h17l-6.4 7.6v6.6L10 20.8v-8.7z"/>',
    pen: '<path class="b" d="M4.5 19.5h3.2L18 9.2 14.8 6 4.5 16.3z"/><path class="f" d="M4 20h4L19 9l-4-4L4 16z"/><path class="f" d="M13.5 6.5l4 4"/>',
    eraser: '<path class="b" d="M8.6 20 3.8 15.2a1.6 1.6 0 0 1 0-2.3l8.5-8.5a1.6 1.6 0 0 1 2.3 0l5.2 5.2a1.6 1.6 0 0 1 0 2.3L12.4 20z"/><path class="f" d="M8.6 20 3.8 15.2a1.6 1.6 0 0 1 0-2.3l8.5-8.5a1.6 1.6 0 0 1 2.3 0l5.2 5.2a1.6 1.6 0 0 1 0 2.3L12.4 20zM8 11l5.6 5.6M8.6 20H20"/>',
    undo: '<path class="f" d="M9 14 4 9l5-5"/><path class="f" d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    trash: '<path class="b" d="M6.5 7h11l-1 13.2a1.6 1.6 0 0 1-1.6 1.3H9.1a1.6 1.6 0 0 1-1.6-1.3z"/><path class="f" d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13.4A1.6 1.6 0 0 0 9.1 22h5.8a1.6 1.6 0 0 0 1.6-1.6l1-13.4M10 11v6M14 11v6"/>',
    expand: '<path class="f" d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    shrink: '<path class="f" d="M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7"/>',
    keyboard: '<rect class="b" x="2.5" y="6" width="19" height="12" rx="2"/><rect class="f" x="2.5" y="6" width="19" height="12" rx="2"/><path class="f" d="M7.5 14h9"/><circle class="a" cx="6.5" cy="10" r=".9"/><circle class="a" cx="10" cy="10" r=".9"/><circle class="a" cx="13.5" cy="10" r=".9"/><circle class="a" cx="17" cy="10" r=".9"/>',
    cal: '<rect class="b" x="3" y="5" width="18" height="16" rx="2.5"/><rect class="f" x="3" y="5" width="18" height="16" rx="2.5"/><path class="f" d="M3 10h18M8 3v4M16 3v4"/>',
    /* ★★ 2026-10-06c 問題セット・確認テスト・メモの移動／拡大 */
    sets: '<rect class="b" x="6" y="3.5" width="14" height="13" rx="2.2"/><path class="f" d="M8 3h10.5A2.5 2.5 0 0 1 21 5.5V14"/><rect class="f" x="3" y="6.5" width="15" height="14" rx="2.4"/><path class="f" d="M6.5 11h8M6.5 14.5h5.5"/>',
    exam: '<rect class="b" x="5" y="3" width="14" height="18" rx="2.2"/><rect class="f" x="5" y="3" width="14" height="18" rx="2.2"/><path class="f" d="M8.5 8.5l1.3 1.3 2.4-2.6M8.5 14.5l1.3 1.3 2.4-2.6M14 8.6h2.5M14 14.6h2.5"/>',
    medal: '<circle class="b" cx="12" cy="15" r="5.5"/><path class="f" d="M8 3h8l-2.5 6h-3z"/><circle class="f" cx="12" cy="15" r="6"/><path class="f" d="M12 12.4l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z"/>',
    hand: '<path class="b" d="M7.5 12V7.3a1.5 1.5 0 0 1 3 0V5.5a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0V10a1.5 1.5 0 0 1 3 0v4.5a7 7 0 0 1-7 7h-.6a6.2 6.2 0 0 1-5-2.6L4.2 15.6a1.5 1.5 0 0 1 2.3-1.9l1 1z"/><path class="f" d="M7.5 14.7V7.3a1.5 1.5 0 0 1 3 0V11M10.5 11V5.5a1.5 1.5 0 0 1 3 0V11M13.5 11V6.5a1.5 1.5 0 0 1 3 0V12M16.5 12v-2a1.5 1.5 0 0 1 3 0v4.5a7 7 0 0 1-7 7h-.6a6.2 6.2 0 0 1-5-2.6L4.2 15.6a1.5 1.5 0 0 1 2.3-1.9l1 1"/>',
    zin: '<circle class="b" cx="11" cy="11" r="6.5"/><circle class="f" cx="11" cy="11" r="7"/><path class="f" d="M21 21l-4.6-4.6M8 11h6M11 8v6"/>',
    zout: '<circle class="b" cx="11" cy="11" r="6.5"/><circle class="f" cx="11" cy="11" r="7"/><path class="f" d="M21 21l-4.6-4.6M8 11h6"/>',
    fit: '<rect class="b" x="5" y="5" width="14" height="14" rx="2"/><path class="f" d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>',
  };
  const ic = (n, cls) => '<svg class="di' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (DI[n] || "") + "</svg>";

  /* ── 小物 ── */
  const PL = {};
  function plainOf(id) {
    if (PL[id] != null) return PL[id];
    return (PL[id] = M.plain(D.BY[id].q.replace(/<table[\s\S]*<\/table>/, "")));
  }
  function short(id, n) { const t = plainOf(id); return t.length > n ? t.slice(0, n) + "…" : t; }
  function mmss(ms) { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function nf(n) { return Math.round(n || 0).toLocaleString(); }
  function pctTxt(v) { return v == null ? "—" : Math.round(v * 100) + "%"; }
  function ring(p, size, stroke) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, p || 0)));
    return '<svg class="ring" viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="rg-bg" stroke-width="' + stroke + '"/><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="rg-fg" stroke-width="' + stroke + '" stroke-dasharray="' + c.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"/></svg>';
  }
  const ringW = (p, size, stroke, inner, cls) => '<div class="ringw ' + (cls || "") + '" style="width:' + size + "px;height:" + size + 'px">' + ring(p, size, stroke) + '<div class="ring-in">' + (inner || "") + "</div></div>";
  /* 単元のタイル（周期表のマス風） */
  function sym(t, cls) { const T = D.T[t], s = T.sym || T.ic || "?"; return '<span class="sym' + (s.length >= 4 ? " sm" : s.length === 3 ? " md" : "") + (cls ? " " + cls : "") + '" style="--c:' + D.F[T.f].c + '">' + esc(s) + "</span>"; }
  const setTitle = (k) => { const S = D.SETS[k]; return S ? (D.GRP ? D.GRP[S.grp] + "・" : "") + S.nm : k; };
  const ST_LB = { new: "未解答", ng: "まちがえた", ok: "正解（復習中）", mas: "習得" };
  const UI = { recIds: null, libIds: [], lastWrong: [], grp: 1, gkind: "o", gid: "" };
  try { UI.grp = Number(sessionStorage.getItem("mcl_grp")) || 1; UI.gkind = sessionStorage.getItem("mcl_gkind") === "r" ? "r" : "o"; UI.gid = sessionStorage.getItem("mcl_gid") || ""; } catch (e) {}

  /* ── 設定の見た目 ── */
  function applySettings() {
    const s = M.get().set, root = document.documentElement;
    let dark = s.theme === "dark";
    if (s.theme === "auto") { try { dark = matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {} }
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.fs = s.fs === "l" ? "l" : "m";
    const mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = dark ? "#0e1226" : "#f2f5ff";
    if (PAD.open) padDraw();
  }
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySettings); } catch (e) {}

  /* ── 効果音・振動 ── */
  let AC = null;
  function tone(seq) {
    if (!M.get().set.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      let t = AC.currentTime + 0.01;
      seq.forEach((n) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = n[2] || "sine"; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(n[3] || 0.11, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + n[1]);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + n[1] + 0.03); t += n[1] * 0.8;
      });
    } catch (e) {}
  }
  const SFX = {
    ok: () => tone([[880, 0.09, "triangle"], [1318, 0.18, "triangle"]]),
    ng: () => tone([[233, 0.16, "sawtooth", 0.05], [185, 0.24, "sawtooth", 0.045]]),
    tap: () => tone([[700, 0.035, "sine", 0.04]]),
    done: () => tone([[784, 0.1, "triangle"], [988, 0.1, "triangle"], [1175, 0.1, "triangle"], [1568, 0.28, "triangle", 0.13]]),
    combo: () => tone([[1046, 0.07, "square", 0.04], [1568, 0.13, "square", 0.045]]),
  };
  function vib(p) { try { if (M.get().set.vib && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ── お知らせ・紙ふぶき ── */
  function toast(html, kind) {
    const box = $("#toasts"); if (!box) return;
    const t = document.createElement("div"); t.className = "toast " + (kind || ""); t.innerHTML = html;
    box.appendChild(t); requestAnimationFrame(() => t.classList.add("on"));
    setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 2600);
  }
  function confetti(n, x, y) {
    const fx = $("#fx"); if (!fx) return;
    const cols = ["#3b5bff", "#7b5cff", "#ff8a1f", "#ff4f6d", "#12b886", "#ffb020", "#5fd0ff"];
    const cx = x != null ? x : innerWidth / 2, cy = y != null ? y : innerHeight * 0.35;
    for (let i = 0; i < (n || 26); i++) {
      const p = document.createElement("i");
      const a = Math.random() * Math.PI * 2, r = 70 + Math.random() * 150;
      p.style.cssText = "left:" + cx + "px;top:" + cy + "px;background:" + cols[i % cols.length] + ";--dx:" + (Math.cos(a) * r).toFixed(0) + "px;--dy:" + (Math.sin(a) * r - 70).toFixed(0) + "px;--rot:" + (Math.random() * 720 - 360).toFixed(0) + "deg;animation-delay:" + (Math.random() * 0.08).toFixed(2) + "s";
      fx.appendChild(p); setTimeout(() => p.remove(), 1400);
    }
  }

  /* ── 下から出るシート ── */
  let sheetOnClose = null;
  function sheet(html, opt) {
    const sh = $("#sheet");
    if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; try { f(); } catch (e) {} }
    sh.innerHTML = '<div class="sh-bg" data-a="shclose"></div><div class="sh-card ' + ((opt && opt.cls) || "") + '" role="dialog" aria-modal="true"><div class="sh-grab"></div><button class="sh-x" data-a="shclose" aria-label="閉じる">' + ic("x") + "</button>" + html + "</div>";
    requestAnimationFrame(() => sh.classList.add("on"));
    sheetOnClose = (opt && opt.onClose) || null;
    return sh.querySelector(".sh-card");
  }
  function closeSheet() {
    const sh = $("#sheet"); if (!sh.classList.contains("on")) return;
    sh.classList.remove("on");
    const f = sheetOnClose; sheetOnClose = null;
    setTimeout(() => { if (!sh.classList.contains("on")) sh.innerHTML = ""; }, 320);
    if (f) { try { f(); } catch (e) {} }
  }
  const sheetOpen = () => $("#sheet").classList.contains("on");

  /* ── 上のバー ── */
  function paintHeader() {
    const v = $("#hdXevaV"); if (v) v.textContent = nf(Math.floor(M.balance()));
    const ev = $("#hdEv"), m = M.mult();
    if (ev) { ev.hidden = !(m > 1); ev.innerHTML = "💜 XEVA ×" + m; }
    const xv = document.querySelector(".hd-xeva"); if (xv) xv.dataset.x = m > 1 ? "×" + m : "";
  }
  window.addEventListener("xeva:change", paintHeader);

  /* ══════════════ ページ ══════════════ */
  let TAB = "home";
  const after = {};
  function go(t, keepScroll) {
    if (!PAGES[t]) t = "home";
    TAB = t;
    try { sessionStorage.setItem("mcl_tab", t); } catch (e) {}
    const main = $("#main");
    const y = main.scrollTop;
    main.innerHTML = '<div class="pg pg-' + t + '">' + PAGES[t]() + "</div>";
    const tabOf = { gset: "sets" }[t] || t;
    $$("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tabOf));
    main.scrollTop = keepScroll ? y : 0;
    if (after[t]) after[t]();
    paintHeader();
  }

  /* ── ホーム ── */
  function greet() { const h = new Date().getHours(); return h < 4 ? "夜ふかし中だね" : h < 11 ? "おはよう" : h < 17 ? "こんにちは" : "こんばんは"; }
  function eventCard() {
    let E = null; try { E = window.XEVA && XEVA.event && XEVA.event.cur(); } catch (e) {}
    if (!E) return "";
    let a = null, b = null; try { a = XEVA.event.prog(E.id, "chemOk"); b = XEVA.event.prog(E.id, "chemSet"); } catch (e) {}
    const pr = (p, t) => p ? '<span class="evm-i' + (p.done ? " ok" : "") + '">' + t + " <b>" + p.v + "/" + p.n + "</b>" + (p.done ? (p.claimed ? " ✓" : " 🎁") : "") + "</span>" : "";
    return '<a class="evc" href="../index.html#event">' +
      '<img class="evc-im" src="../' + esc(E.banner) + '" alt="' + esc(E.nm) + '">' +
      '<div class="evc-b"><div class="evc-h"><b>💜 ' + esc(E.nm) + '</b><span>〜' + E.to.slice(5).replace("-", "/") + "</span></div>" +
      "<p>MagiChemLex の獲得 XEVA が <b>" + M.mult() + "倍</b>！イベントミッションで🎫ガチャチケット</p>" +
      '<div class="evm">' + pr(a, "⚗️ 20問正解") + pr(b, "📝 本番セット") + '</div><span class="evc-go">イベントのページへ ' + ic("chevR") + "</span></div></a>";
  }
  function topicTile(t) {
    const T = D.T[t], st = M.topicStat(t), col = D.F[T.f].c;
    return '<button class="tt" data-a="topic" data-t="' + t + '" style="--c:' + col + '">' + ringW(st.total ? st.mas / st.total : 0, 52, 4, sym(t)) +
      '<span class="tt-b"><b>' + T.nm + "</b><small>" + st.mas + "/" + st.total + " 習得" + (st.acc != null ? "・正答 " + pctTxt(st.acc) : "") + "</small></span></button>";
  }
  function rwCard() {
    const R = M.REWARD, m = M.mult();
    const row = (e, t, v) => "<li><span>" + e + "</span><b>" + t + "</b><em>+" + v + "</em></li>";
    return '<details class="rwc"><summary>' + ic("gift") + " XEVA のもらい方" + (m > 1 ? '<span class="x2">💜 いまは' + m + "倍</span>" : "") + "</summary><ul>" +
      row("🌱", "はじめての学習", R.reg * m) + row("✅", "問題にはじめて正解（1問ごと）", R.first * m) + row("🎯", "今日の目標を達成（毎日）", R.daily * m) +
      row("🏅", "単元マスター（単元の全問を習得）", R.topic * m) + row("🗂️", "問題セットを完全習得（20問以上は2倍）", R.gmaster * m) + row("🎓", "確認テストで全問正解（20問以上は2倍）", R.confirm * m) +
      row("📝", "本番セットで 60%・80%・100%（はじめて）", R.set60 * m + "・" + R.set80 * m + "・" + R.set100 * m) +
      row("🎲", "ランダム10問で 90%以上・全問正解（何度でも）", R.mix90 * m + "・" + R.mix100 * m) +
      row("🔥", "7日連続の学習（7日ごと）", R.streak7 * m) + "</ul><p>習得＝日をあけて2回正解した問題。XEVA は XEVARION の共通通貨です。</p></details>";
  }
  function setCards(grp) {
    return Object.keys(D.SETS).filter((k) => D.SETS[k].grp === grp).map((k) => {
      const S = D.SETS[k], b = M.bestRun(k);
      return '<button class="setc' + (S.full ? " full" : "") + ' g' + grp + '" data-a="exam" data-set="' + k + '"><span class="setc-n">' + esc(S.nm) + '</span><span class="setc-s">' + esc(S.sub) + '</span><span class="setc-f"><span>' + ic("clock") + S.min + "分</span><b>" + (b ? "ベスト " + Math.round(b.score / b.total * 100) + "%" : "未挑戦") + "</b></span></button>";
    }).join("");
  }
  function pgHome() {
    const s = M.get(), lv = M.level(), tc = M.todayCount(), goal = Number(s.set.goal) || 10, stc = M.streak(), due = M.dueList(), tt = M.totals();
    const rec = M.build("rec", { n: 10 }); UI.recIds = rec;
    const nDue = rec.filter((id) => due.indexOf(id) >= 0).length;
    let msg, mood = "smile";
    if (!tt.n) { msg = "はじめまして、" + esc(F.navName()) + "だよ！<br>まずは <b>おすすめ10問</b> からいってみよう！"; mood = "wow"; }
    else if (due.length) { msg = "今日の復習が <b>" + due.length + "問</b> あるよ。<br>忘れる前にサクッと！"; mood = "think"; }
    else if (tc >= goal) { msg = "今日の目標クリア！<br>えらすぎる…！🎉"; mood = "happy"; }
    else { msg = "今日はあと <b>" + (goal - tc) + "問</b> で目標達成！"; }
    const fields = Object.keys(D.F).map((f) => {
      const ts = Object.keys(D.T).filter((t) => D.T[t].f === f);
      return '<div class="tm-f"><h3 style="--c:' + D.F[f].c + '"><i></i>' + D.F[f].nm + "<small>" + ts.length + "単元</small></h3><div class=\"tm-g\">" + ts.map(topicTile).join("") + "</div></div>";
    }).join("");
    const grps = Object.keys(D.GRP || { 1: "" }).map(Number);
    if (grps.indexOf(UI.grp) < 0) UI.grp = grps[0];
    return '<section class="hero">' +
      '<div class="hero-t"><p class="hello">' + greet() + "！</p><h1>難関化学を、<br>毎日すこしずつ。</h1>" +
      '<div class="lvl"><span class="lv-b">Lv.' + lv.lv + "</span><b>" + lv.title + '</b></div><div class="xpbar"><i style="width:' + (lv.cur / lv.need * 100).toFixed(1) + '%"></i></div><small class="xp-t">次のレベルまで ' + (lv.need - lv.cur) + " XP</small></div>" +
      /* ★★ 2026-10-09 ナビ（マスコット）をタップ → ナビえらび。下に小さく「ナビをかえる」 */
      '<div class="hero-m"><button class="hero-nv" data-a="navPick" aria-label="ナビゲーターをかえる">' + F.mascot(mood) + '</button><div class="bubble">' + msg + '</div><button class="nv-chg" data-a="navPick">' + ic("spark") + "ナビをかえる</button></div></section>" +
      '<section class="today">' +
      '<div class="td">' + ringW(Math.min(1, tc / goal), 58, 7, "<b>" + tc + "</b><small>/" + goal + "</small>", "goal") + "<span>今日の目標</span></div>" +
      '<div class="td"><div class="td-big fl' + (stc ? " on" : "") + '">' + ic("flame") + "<b>" + stc + "</b></div><span>連続日数</span></div>" +
      '<button class="td" data-a="tab" data-tab="review"><div class="td-big rv">' + ic("review") + "<b>" + due.length + "</b></div><span>今日の復習</span></button></section>" +
      '<button class="cta" data-a="start" data-mode="rec"><span class="cta-i">' + ic("play") + '</span><span class="cta-t"><b>今日のおすすめ ' + rec.length + "問</b><small>" + (nDue ? "復習 " + nDue + "問 ＋ " : "") + (rec.length - nDue) + "問（まだ解いていない問題・苦手から）</small></span>" + ic("chevR") + "</button>" +
      '<div class="cta2"><button class="pill" data-a="start" data-mode="random">' + ic("shuffle") + "ランダム10問</button><button class=\"pill\" data-a=\"start\" data-mode=\"weak\">" + ic("target") + "弱点克服</button></div>" +
      eventCard() +
      '<h2 class="sec">本番セット<small>入試の大問をまるごと（改題）</small></h2>' +
      (grps.length > 1 ? '<div class="seg grp">' + grps.map((g) => '<button class="' + (g === UI.grp ? "on" : "") + '" data-a="grp" data-v="' + g + '">' + esc(D.GRP[g]) + "</button>").join("") + "</div>" : "") +
      '<div class="sets">' + setCards(UI.grp) + "</div>" +
      '<h2 class="sec" id="tmap">単元マップ<small>' + tt.mas + " / " + tt.total + " 習得</small></h2>" + fields + rwCard() +
      '<p class="foot">問題は、難関大の入試問題をもとに作り直した<b>改題</b>と、数値や条件を変えた<b>関連問題</b>です（原文の転載ではありません）。</p>';
  }

  /* ══ ★★ 2026-10-06c 問題セット（ご指定「問題や関連問題の括りで、MagiLex のように一覧で見て、そこから解けるように」）══
     改題＝本番セットの大問ごと／関連問題＝単元ごと。開くと問題の一覧と「全問（シャッフル）」「未習得だけ」「確認テスト」。 */
  function gColor(g) { return g.kind === "r" ? D.F[g.f].c : (g.grp === 2 ? "#0aa2c0" : "#3b5bff"); }
  function gIcon(g) { return g.kind === "r" ? sym(g.t, "s") : '<span class="gs-ic">' + ic("exam") + "</span>"; }
  function gCard(g) {
    const st = M.groupStat(g), p = st.total ? st.mas / st.total : 0;
    const badge = st.cfPass ? '<span class="gbd pass">' + ic("medal") + "確認テスト合格</span>" : st.done ? '<span class="gbd ok">' + ic("trophy") + "完全習得・確認テストへ</span>" : "";
    /* ★★ 2026-10-07 分けたセット（part）は大問の小見出しの下に並ぶので、名前は範囲だけ＋中身の単元 */
    return '<button class="gcard' + (st.done ? " done" : "") + (g.part ? " part" : "") + '" data-a="gopen" data-g="' + g.id + '" style="--c:' + gColor(g) + '">' + gIcon(g) +
      '<span class="gc-b"><b>' + esc(g.part ? g.lb : g.nm) + "</b>" + (g.part && g.sub ? '<small class="gc-sub">' + esc(g.sub) + "</small>" : "") + "<small>" + st.total + "問・" + st.mas + " 習得" + (st.acc != null ? "・正答 " + pctTxt(st.acc) : "") + "</small>" +
      '<span class="gc-bar"><i style="width:' + (p * 100).toFixed(1) + '%"></i></span>' + badge + "</span>" + ic("chevR") + "</button>";
  }
  function pgSets() {
    const kind = UI.gkind === "r" ? "r" : "o", all = M.groups();
    const gs = all.filter((g) => g.kind === kind), cnt = (l) => l.reduce((a, g) => a + g.ids.length, 0);
    let body = "";
    if (kind === "o") {
      const grps = Object.keys(D.GRP || { 1: "" }).map(Number);
      /* ★★ 2026-10-07 大問ごとに小見出し（第1問 マーク …）を立て、その下に分けたセットを並べる */
      body = grps.map((gp) => {
        const l = gs.filter((g) => g.grp === gp); if (!l.length) return "";
        const sets = []; l.forEach((g) => { if (sets.indexOf(g.set) < 0) sets.push(g.set); });
        return '<h2 class="sec">' + esc(D.GRP ? D.GRP[gp] : "本番セット") + "<small>" + cnt(l) + "問</small></h2>" +
          sets.map((k) => { const ll = l.filter((g) => g.set === k);
            return (ll[0].part ? '<h3 class="gs-dai">' + esc(ll[0].dai) + "<small>" + cnt(ll) + "問・" + ll.length + "セット</small></h3>" : "") + '<div class="gcards">' + ll.map(gCard).join("") + "</div>"; }).join("");
      }).join("");
    } else {
      body = Object.keys(D.F).map((f) => { const l = gs.filter((g) => g.f === f); return l.length ? '<h2 class="sec"><span class="fdot" style="--c:' + D.F[f].c + '"></span>' + D.F[f].nm + "<small>" + cnt(l) + '問</small></h2><div class="gcards">' + l.map(gCard).join("") + "</div>" : ""; }).join("");
    }
    /* ★★ 2026-10-07 ごほうびはセットの問題数で変わる（分けたセットは大問ぶんを問題数で分けた額）→ 幅で出す */
    const m = M.mult(), rws = gs.map((g) => M.groupReward(g));
    const rg = (k) => { if (!rws.length) return "+0"; const a = Math.min.apply(null, rws.map((r) => r[k])) * m, b = Math.max.apply(null, rws.map((r) => r[k])) * m; return "+" + nf(a) + (a === b ? "" : "〜" + nf(b)); };
    return '<h1 class="pt">問題セット</h1><p class="pst">入試の大問（<b>改題</b>）を小問ごとに分けたセットと、単元ごとの<b>関連問題</b>のまとまりです。開くと問題の一覧から解けます。ぜんぶ習得したら<b>確認テスト</b>に挑戦しよう。</p>' +
      '<div class="seg gk"><button class="' + (kind === "o" ? "on" : "") + '" data-a="gkind" data-v="o">' + ic("exam") + "改題（" + cnt(all.filter((g) => g.kind === "o")) + '問）</button><button class="' + (kind === "r" ? "on" : "") + '" data-a="gkind" data-v="r">' + ic("atom") + "関連問題（" + cnt(all.filter((g) => g.kind === "r")) + "問）</button></div>" +
      '<p class="gs-rw">' + ic("gift") + "<span>完全習得 <b>" + rg("gm") + "</b>・確認テスト（全問正解）<b>" + rg("cf") + "</b> XEVA" + (m > 1 ? "（いまは" + m + "倍）" : "") + "<small>問題数の多いセットほど多くもらえます</small></span></p>" + body;
  }
  function pgGSet() {
    const g = M.groupById(UI.gid);
    if (!g) return pgSets();
    const st = M.groupStat(g), rw = M.groupReward(g), m = M.mult(), un = st.total - st.mas;
    const head = g.kind === "o" ? esc(D.GRP ? D.GRP[g.grp] : "本番セット") + "・改題" : esc(D.F[g.f].nm) + "・関連問題";
    const rows = g.ids.map((id, i) => { const x = D.BY[id], stt = M.status(id); return '<button class="qrow st-' + stt + '" data-a="detail" data-id="' + id + '"><span class="qn">' + (i + 1) + '</span><span class="qdot" title="' + ST_LB[stt] + '"></span><span class="qtx">' + esc(short(id, 70)) + '</span><span class="qmeta"><span class="qd">' + "★".repeat(x.d) + "</span></span></button>"; }).join("");
    return '<button class="back" data-a="tab" data-tab="sets">' + ic("chevL") + "問題セット</button>" +
      '<section class="gh" style="--c:' + gColor(g) + '">' + ringW(st.total ? st.mas / st.total : 0, 86, 8, "<b>" + st.mas + "</b><small>/" + st.total + "</small>") +
      '<div class="gh-t"><small>' + head + "</small><h1>" + (g.part ? esc(g.dai) + ' <span class="gh-lb">' + esc(g.lb) + "</span>" : esc(g.nm)) + "</h1>" + (g.part && g.sub ? '<p class="gh-sub">' + esc(g.sub) + "</p>" : "") + "<p>" + (st.cfPass ? "🏅 確認テスト合格ずみ" : st.done ? "🏆 完全習得！確認テストを受けられます" : "あと <b>" + un + "問</b> で完全習得") + (st.acc != null ? "・正答 " + pctTxt(st.acc) : "") + "</p></div></section>" +
      '<div class="gacts">' +
      '<button class="cta" data-a="gplay" data-g="' + g.id + '"><span class="cta-i">' + ic("shuffle") + '</span><span class="cta-t"><b>全問を解く（' + st.total + "問）</b><small>順番はシャッフル・1問ずつ答え合わせ</small></span>" + ic("chevR") + "</button>" +
      '<button class="mode-b" data-a="gplayUn" data-g="' + g.id + '"' + (un ? "" : " disabled") + '><span class="mi p">' + ic("target") + "</span><span><b>まだ習得していない問題だけ（" + un + "問）</b><small>" + (un ? "習得ずみの問題はとばします（シャッフル）" : "すべて習得ずみ！") + "</small></span>" + ic("chevR") + "</button>" +
      '<button class="mode-b conf' + (st.done ? " rdy" : "") + '" data-a="gconf" data-g="' + g.id + '"' + (st.done ? "" : " disabled") + '><span class="mi c">' + ic("medal") + "</span><span><b>確認テスト（全" + st.total + "問）</b><small>" +
      (st.done ? (st.cfPass ? "合格ずみ（もう一度受けられます。ごほうびは1回だけ）" : "ヒントなし・全問正解で合格 <b>+" + rw.cf * m + " XEVA</b>") : "ぜんぶ習得すると受けられます（全問正解で +" + rw.cf * m + " XEVA）") + "</small></span>" + ic("chevR") + "</button>" +
      (g.kind === "o" && D.SETS[g.set] ? '<button class="mode-b" data-a="examGo" data-set="' + g.set + '"><span class="mi">' + ic("clock") + "</span><span><b>本番モード（" + (g.part ? esc(String(g.dai).split(" ")[0]) + "まるごと・" : "") + "目安 " + D.SETS[g.set].min + "分）</b><small>時間を計って、最後にまとめて採点（順番は本番どおり）</small></span>" + ic("chevR") + "</button>" : "") +
      "</div>" +
      '<p class="gs-rw">' + ic("gift") + "<span>完全習得 <b>+" + rw.gm * m + "</b>" + (st.gm ? " ✓" : "") + "・確認テスト <b>+" + rw.cf * m + "</b>" + (st.cfPass ? " ✓" : "") + " XEVA" + (rw.v > 1 ? "<small>20問以上なので2倍</small>" : "") + "</span></p>" +
      '<h2 class="sec">問題の一覧<small>押すと問題と解説</small></h2><div class="lib-cnt"><span>' + st.total + '問</span><span class="lg-lg"><i class="st-new"></i>未解答<i class="st-ng"></i>まちがえた<i class="st-ok"></i>復習中<i class="st-mas"></i>習得</span></div><section class="lg glist">' + rows + "</section>";
  }

  /* ── 問題一覧 ── */
  const LIB = { f: "all", g: "all", st: "all", d: 0, q: "", t: "" };
  const LIB_LB = { g: { all: "", o: "入試の改題", r: "関連問題" }, st: { all: "", new: "未解答", ng: "まちがえた", ok: "復習中", mas: "習得", bm: "ブックマーク" }, d: { 0: "", 1: "★", 2: "★★", 3: "★★★" } };
  function libFilter() {
    const s = M.get(), words = LIB.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return D.Q.filter((x) => {
      if (LIB.t && x.t !== LIB.t) return false;
      if (LIB.f !== "all" && x.f !== LIB.f) return false;
      if (LIB.g !== "all" && x.g !== LIB.g) return false;
      if (LIB.d && x.d !== LIB.d) return false;
      if (LIB.st !== "all") {
        if (LIB.st === "bm") { if (!s.bm[x.id]) return false; }
        else if (M.status(x.id) !== LIB.st) return false;
      }
      if (words.length) {
        const hay = (plainOf(x.id) + " " + (x.o || []).join(" ") + " " + D.T[x.t].nm + " " + (x.k || "") + " " + x.src).toLowerCase();
        if (words.some((w) => hay.indexOf(w) < 0)) return false;
      }
      return true;
    }).map((x) => x.id);
  }
  function qRow(id) {
    const x = D.BY[id], stt = M.status(id), bm = !!M.get().bm[id];
    return '<button class="qrow st-' + stt + '" data-a="one" data-id="' + id + '"><span class="qdot" title="' + ST_LB[stt] + '"></span><span class="qtx"><em class="' + x.g + '">' + (x.g === "o" ? "改題" : "関連") + "</em>" + esc(short(id, 72)) + '</span><span class="qmeta"><span class="qd">' + "★".repeat(x.d) + "</span>" + (bm ? ic("bm", "bmk") : "") + "</span></button>";
  }
  function libListHTML(ids) {
    if (!ids.length) return '<div class="empty">' + F.mascot("think") + "<p>条件に合う問題がありません。<br>しぼりこみを変えてみてね。</p></div>";
    const by = {}; ids.forEach((id) => { const t = D.BY[id].t; (by[t] = by[t] || []).push(id); });
    return Object.keys(D.T).filter((t) => by[t]).map((t) => {
      const T = D.T[t], st = M.topicStat(t);
      return '<section class="lg"><button class="lg-h" data-a="topic" data-t="' + t + '" style="--c:' + D.F[T.f].c + '">' + sym(t, "s") + "<b>" + T.nm + '</b><span class="lg-m">' + st.mas + "/" + st.total + " 習得</span>" + ic("chevR") + "</button>" + by[t].map(qRow).join("") + "</section>";
    }).join("");
  }
  function libActive() {
    const out = [];
    if (LIB.t) out.push(["t", sym(LIB.t, "xs") + " " + D.T[LIB.t].nm]);
    ["g", "st", "d"].forEach((k) => { const l = LIB_LB[k][LIB[k]]; if (l) out.push([k, l]); });
    return out;
  }
  function pgLib() {
    const ids = libFilter(); UI.libIds = ids;
    const act = libActive();
    return '<h1 class="pt">問題一覧</h1>' +
      '<label class="search">' + ic("search") + '<input id="libQ" type="search" placeholder="キーワード（例：緩衝液・半減期・浸透圧）" value="' + esc(LIB.q) + '" autocomplete="off"></label>' +
      '<div class="lib-bar"><div class="chips">' + [["all", "すべて"]].concat(Object.keys(D.F).map((f) => [f, D.F[f].nm])).map((p) => '<button class="cf' + (LIB.f === p[0] ? " on" : "") + '" data-a="lf" data-k="f" data-v="' + p[0] + '">' + p[1] + "</button>").join("") + "</div>" +
      '<button class="fbtn' + (act.length ? " on" : "") + '" data-a="libFilter">' + ic("filter") + "<span>しぼりこみ</span>" + (act.length ? "<b>" + act.length + "</b>" : "") + "</button></div>" +
      (act.length ? '<div class="chips act">' + act.map((a) => '<button class="cf on" data-a="lclr" data-k="' + a[0] + '">' + a[1] + " ✕</button>").join("") + "</div>" : "") +
      '<div class="lib-cnt"><span id="libCnt">' + ids.length + '問</span><span class="lg-lg"><i class="st-new"></i>未解答<i class="st-ng"></i>まちがえた<i class="st-ok"></i>復習中<i class="st-mas"></i>習得</span></div>' +
      '<div id="libList">' + libListHTML(ids) + "</div>" +
      '<div class="lib-go"><button class="cta sm" id="libGo" data-a="start" data-mode="list"' + (ids.length ? "" : " disabled") + ">" + ic("play") + "<span>この条件で解く（" + ids.length + "問）</span></button></div>";
  }
  after.lib = () => {
    const inp = $("#libQ"); if (!inp) return;
    inp.addEventListener("input", () => { LIB.q = inp.value; paintLibList(); });
  };
  function paintLibList() {
    const ids = libFilter(); UI.libIds = ids;
    $("#libList").innerHTML = libListHTML(ids);
    $("#libCnt").textContent = ids.length + "問";
    const b = $("#libGo"); if (b) { b.disabled = !ids.length; b.querySelector("span").textContent = "この条件で解く（" + ids.length + "問）"; }
  }
  function openLibFilter() {
    const seg = (k, list) => '<div class="seg wrap">' + list.map((p) => '<button class="' + (String(LIB[k]) === String(p[0]) ? "on" : "") + '" data-a="lfs" data-k="' + k + '" data-v="' + p[0] + '">' + p[1] + "</button>").join("") + "</div>";
    sheet('<h2 class="sh-t">' + ic("filter") + " しぼりこみ</h2>" +
      '<div class="st-r"><b>種類</b>' + seg("g", [["all", "すべて"], ["o", "入試の改題"], ["r", "関連問題"]]) + "</div>" +
      '<div class="st-r"><b>状態</b>' + seg("st", [["all", "すべて"], ["new", "未解答"], ["ng", "まちがえた"], ["ok", "復習中"], ["mas", "習得"], ["bm", "ブックマーク"]]) + "</div>" +
      '<div class="st-r"><b>難易度</b>' + seg("d", [[0, "すべて"], [1, "★"], [2, "★★"], [3, "★★★"]]) + "</div>" +
      '<div class="sh-btns row"><button class="btn" data-a="lfReset">リセット</button><button class="btn main" data-a="shclose">' + ic("check") + " この条件で見る</button></div>", { onClose: () => go("lib", true) });
  }

  /* ── 復習 ── */
  function dRow(id) {
    const x = D.BY[id], stt = M.status(id);
    return '<button class="qrow st-' + stt + '" data-a="detail" data-id="' + id + '"><span class="qdot"></span><span class="qtx"><em class="' + x.g + '">' + D.T[x.t].nm + "</em>" + esc(short(id, 60)) + "</span>" + ic("chevR") + "</button>";
  }
  function pgReview() {
    const due = M.dueList(), wr = M.wrongList(), un = M.unsureList(), bm = M.bmList(), fc = M.dueForecast(), s = M.get();
    const weak = Object.keys(D.T).map((t) => ({ t, st: M.topicStat(t) })).filter((o) => o.st.acc != null && o.st.n >= 2).sort((a, b) => a.st.acc - b.st.acc).slice(0, 3);
    let nextTxt = "まだ復習の予定はありません。問題を解くと、忘れかけたころに出てきます。";
    if (!due.length) {
      let mn = Infinity; Object.keys(s.q).forEach((id) => { const r = s.q[id]; if (r && r.n && r.due > Date.now()) mn = Math.min(mn, r.due); });
      if (mn < Infinity) { const d = new Date(mn); nextTxt = "次の復習は <b>" + (d.getMonth() + 1) + "月" + d.getDate() + "日</b> から。"; }
    }
    const mx = Math.max(1, ...fc);
    const days = ["今日", "明日", "2日後", "3日後", "4日後", "5日後", "6日後"];
    return '<h1 class="pt">復習</h1><p class="pst">忘れかけたころにもう一度出す「間隔反復」で、覚えたことを長持ちさせます。日をあけて2回正解すると<b>習得</b>。</p>' +
      '<section class="rv-main">' + F.mascot(due.length ? "think" : "happy") + '<div class="rv-t"><b>' + (due.length ? "今日の復習 " + due.length + "問" : "今日の復習は完了！") + "</b><p>" + (due.length ? "まちがえた問題・期限の来た問題です。" : nextTxt) +
      (fc[0] > due.length ? "<br><small>このあと <b>" + (fc[0] - due.length) + "問</b> が今日の復習に入ります（まちがえた問題は10分後から）。</small>" : "") + "</p>" +
      '<button class="cta sm" data-a="start" data-mode="due"' + (due.length ? "" : " disabled") + ">" + ic("review") + "<span>復習をはじめる</span></button></div></section>" +
      '<div class="rv-cards">' +
      '<button class="rvc" data-a="start" data-mode="wrong" style="--c:#ff8a1f">' + ic("x") + "<b>" + wr.length + "</b><span>まちがえた問題</span></button>" +
      '<button class="rvc" data-a="start" data-mode="unsure" style="--c:#0aa2c0">' + ic("help") + "<b>" + un.length + "</b><span>あやしい問題</span></button>" +
      '<button class="rvc" data-a="start" data-mode="bm" style="--c:#a35cff">' + ic("bm") + "<b>" + bm.length + "</b><span>ブックマーク</span></button>" +
      '<button class="rvc" data-a="start" data-mode="weak" style="--c:#ff4f6d">' + ic("target") + "<b>" + (weak.length ? pctTxt(weak[0].st.acc) : "—") + "</b><span>弱点克服</span></button></div>" +
      '<h2 class="sec">これから7日の復習</h2><div class="fc">' + fc.map((n, i) => '<div class="fc-c"><span class="fc-n">' + n + '</span><i style="height:' + Math.round(n / mx * 100) + '%"></i><span class="fc-d">' + days[i] + "</span></div>").join("") + "</div>" +
      '<h2 class="sec">苦手な単元</h2>' + (weak.length ? '<div class="weak">' + weak.map((o) => '<button class="wk" data-a="topic" data-t="' + o.t + '" style="--c:' + D.F[D.T[o.t].f].c + '">' + sym(o.t, "s") + "<b>" + D.T[o.t].nm + '</b><em>正答 ' + pctTxt(o.st.acc) + "</em>" + ic("chevR") + "</button>").join("") + "</div>" : '<p class="muted">問題を解くと、正答率の低い単元がここに出ます。</p>') +
      '<h2 class="sec">今日の復習の問題</h2><div class="rv-list">' + (due.slice(0, 30).map(dRow).join("") || '<p class="muted">ありません 🎉</p>') + "</div>";
  }

  /* ── 記録 ── */
  function heatHTML() {
    const s = M.get(), base = M.dayStart(), dow = new Date(base).getDay(), start = base - (7 * 15 + dow) * M.DAY;
    let cells = "";
    for (let t = start; t <= base + 1000; t += M.DAY) {
      const k = M.today(t), n = s.days[k] || 0, lv = n === 0 ? 0 : n < 5 ? 1 : n < 10 ? 2 : n < 20 ? 3 : 4;
      cells += '<i class="h' + lv + (k === M.today() ? " now" : "") + '" title="' + k + "：" + n + '問"></i>';
    }
    return '<div class="heatw"><div class="heat">' + cells + '</div><div class="heat-lg">少ない<i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i>多い</div></div>';
  }
  function pgStats() {
    const tt = M.totals(), stc = M.streak(), bst = M.bestStreak(), s = M.get(), lv = M.level();
    const fb = Object.keys(D.F).map((f) => { const st = M.fieldStat(f); return '<div class="fb2"><div class="fb2-h"><b style="--c:' + D.F[f].c + '"><i></i>' + D.F[f].nm + "</b><span>" + st.mas + "/" + st.total + " 習得・正答 " + pctTxt(st.acc) + '</span></div><div class="bar2"><i class="s" style="width:' + (st.seen / st.total * 100).toFixed(1) + '%;--c:' + D.F[f].c + '"></i><i class="m" style="width:' + (st.mas / st.total * 100).toFixed(1) + '%;--c:' + D.F[f].c + '"></i></div></div>'; }).join("");
    const trs = Object.keys(D.T).map((t) => { const st = M.topicStat(t); return '<tr data-a="topic" data-t="' + t + '"><td>' + sym(t, "xs") + " " + D.T[t].nm + '</td><td><div class="mini"><i style="width:' + (st.mas / st.total * 100).toFixed(0) + '%;--c:' + D.F[D.T[t].f].c + '"></i></div>' + st.mas + "/" + st.total + "</td><td>" + pctTxt(st.acc) + "</td></tr>"; }).join("");
    const runs = (s.runs || []).slice(0, 12).map((r) => { const d = new Date(r.at); return '<div class="run"><b>' + esc(setTitle(r.set)) + "</b><span>" + (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + '</span><em class="' + (r.score / r.total >= 0.8 ? "hi" : r.score / r.total >= 0.6 ? "md" : "lo") + '">' + Math.round(r.score / r.total * 100) + "%</em><small>" + r.score + "/" + r.total + "・" + mmss(r.ms) + "</small></div>"; }).join("");
    const bd = M.badges();
    return '<h1 class="pt">学習の記録</h1>' +
      '<div class="kpi">' +
      '<div><b>' + tt.seen + "<small>/" + tt.total + '</small></b><span>解いた問題</span></div>' +
      "<div><b>" + pctTxt(tt.acc) + "</b><span>正答率（" + tt.n + "回）</span></div>" +
      "<div><b>" + Math.round(tt.ms / 60000) + "<small>分</small></b><span>学習時間</span></div>" +
      "<div><b>" + stc + "<small>日</small></b><span>連続（最高 " + bst + "日）</span></div></div>" +
      '<section class="card lvc"><div class="lv-b big">Lv.' + lv.lv + "</div><div><b>" + lv.title + '</b><div class="xpbar"><i style="width:' + (lv.cur / lv.need * 100).toFixed(1) + '%"></i></div><small>' + nf(lv.xp) + " XP・次のレベルまで " + (lv.need - lv.cur) + " XP</small></div></section>" +
      '<h2 class="sec">学習カレンダー<small>16週間</small></h2><section class="card">' + heatHTML() + "</section>" +
      '<h2 class="sec">分野ごと</h2><section class="card">' + fb + '<p class="lgd"><i class="s"></i>解いた<i class="m"></i>習得</p></section>' +
      '<h2 class="sec">単元ごと</h2><section class="card tbl"><table class="tt2"><thead><tr><th>単元</th><th>習得</th><th>正答率</th></tr></thead><tbody>' + trs + "</tbody></table></section>" +
      '<h2 class="sec" id="runs">本番セットの記録</h2><section class="card">' + (runs || '<p class="muted">まだありません。ホームの「本番セット」から挑戦できます。</p>') + "</section>" +
      '<h2 class="sec">バッジ<small>' + bd.filter((b) => b.ok).length + " / " + bd.length + '</small></h2><div class="badges">' + bd.map((b) => '<div class="bdg' + (b.ok ? " ok" : "") + '"><span>' + b.ic + "</span><b>" + b.nm + "</b><small>" + b.sub + "</small></div>").join("") + "</div>";
  }

  /* ── ツール ── */
  function constHTML() {
    return '<div class="cgrid">' + D.CONST.mass.map((p) => '<div class="ce"><b>' + p[0] + "</b><span>" + p[1] + "</span></div>").join("") + '</div><table class="ctab">' + D.CONST.other.map((p) => "<tr><th>" + p[0] + "</th><td>" + p[1] + "</td></tr>").join("") + "</table>";
  }
  function formHTML(open, only) {
    return Object.keys(D.FORM).filter((t) => !only || t === only).map((t) => '<details class="fcard"' + (open === t ? " open" : "") + "><summary>" + sym(t, "xs") + D.T[t].nm + "</summary><ul>" + D.FORM[t].map((x) => "<li>" + x + "</li>").join("") + "</ul></details>").join("");
  }
  function pgTools() {
    return '<h1 class="pt">ツール</h1>' +
      '<div class="tools-g"><section class="card"><h2 class="sec0">' + ic("calc") + ' 関数電卓</h2><div id="calcHere"></div></section>' +
      '<section class="card"><h2 class="sec0">' + ic("table") + " 定数・原子量</h2>" + constHTML() + "</section></div>" +
      '<section class="card"><h2 class="sec0">' + ic("card") + " 公式カード</h2>" + formHTML() + "</section>" +
      '<section class="card about"><h2 class="sec0">' + ic("help") + ' このアプリについて</h2><p>MagiChemLex は XEVARION の学習アプリ MagiLex から生まれた、<b>難関大の化学</b>に特化した問題集です。</p><ul><li>問題は、<b>難関大の入試問題</b>の全小問を同じ数値・同じ考え方で作り直した改題（' + D.Q.filter((x) => x.g === "o").length + "問・本番セット" + Object.keys(D.GRP || {}).length + "組）と、数値や条件を変えた関連問題（" + D.Q.filter((x) => x.g === "r").length + "問）です。</li><li>記録とメモは XEVARION のアカウントで同期されます。</li></ul></section>";
  }
  after.tools = () => { mountCalc($("#calcHere")); };

  /* ── 関数電卓 ── */
  const CALC = { tk: [], ans: 0, out: "0" };
  const CK = [["7", "8", "9", "÷", "AC"], ["4", "5", "6", "×", "⌫"], ["1", "2", "3", "−", "("], ["0", ".", "EXP", "+", ")"], ["log", "ln", "√", "^", "="], ["10ˣ", "ANS", "R", "F", "Nₐ"]];
  const CV = { "÷": "/", "×": "*", "−": "-", "+": "+", "(": "(", ")": ")", "^": "^", ".": ".", EXP: "E", log: "log(", ln: "ln(", "√": "sqrt(", "10ˣ": "10^(", R: "(8.31E3)", F: "(9.65E4)", "Nₐ": "(6.02E23)" };
  const CD = { EXP: "ᴇ", log: "log(", ln: "ln(", "√": "√(", "10ˣ": "10^(", "Nₐ": "Nₐ" };
  function calcEval(str) {
    const tk = str.match(/\d+\.?\d*(?:E[+\-]?\d+)?|\.\d+(?:E[+\-]?\d+)?|log|ln|sqrt|[()+\-*/^]/g) || [];
    if (tk.join("") !== str.replace(/\s/g, "")) throw new Error("bad");
    let i = 0;
    const peek = () => tk[i], take = () => tk[i++];
    const isStart = (p) => p != null && (p === "(" || /^[\d.]/.test(p) || p === "log" || p === "ln" || p === "sqrt");
    function expr() { let v = term(); while (peek() === "+" || peek() === "-") { const o = take(), r = term(); v = o === "+" ? v + r : v - r; } return v; }
    function term() { let v = unary(); for (;;) { const p = peek(); if (p === "*" || p === "/") { take(); const r = unary(); v = p === "*" ? v * r : v / r; } else if (isStart(p)) v = v * unary(); else break; } return v; }
    function unary() { if (peek() === "-") { take(); return -unary(); } if (peek() === "+") { take(); return unary(); } return pow(); }
    function pow() { let b = prim(); if (peek() === "^") { take(); b = Math.pow(b, unary()); } return b; }
    function prim() {
      const t = take(); if (t == null) throw new Error("end");
      if (t === "(") { const v = expr(); if (peek() === ")") take(); return v; }
      if (t === "log" || t === "ln" || t === "sqrt") { const v = prim(); return t === "log" ? Math.log10(v) : t === "ln" ? Math.log(v) : Math.sqrt(v); }
      const n = Number(t); if (isNaN(n)) throw new Error("nan"); return n;
    }
    const v = expr(); if (i < tk.length) throw new Error("rest"); return v;
  }
  function fmtNum(v) {
    if (!isFinite(v)) return "エラー";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e7 || a < 1e-4)) { const e = Math.floor(Math.log10(a)); const m = v / Math.pow(10, e); return String(+m.toPrecision(6)).replace("-", "−") + "×10<sup>" + String(e).replace("-", "−") + "</sup>"; }
    return String(+v.toPrecision(10)).replace("-", "−");
  }
  function mountCalc(el) {
    if (!el) return;
    el.innerHTML = '<div class="calc"><div class="cd"><div class="cd-ex"></div><div class="cd-v">' + CALC.out + '</div></div><div class="ck">' +
      CK.map((r) => r.map((k) => '<button class="ckk' + (/^\d$|^\.$/.test(k) ? "" : k === "=" ? " eq" : k === "AC" || k === "⌫" ? " ac" : " fn") + '" data-k="' + k + '">' + k + "</button>").join("")).join("") + "</div></div>";
    const exEl = el.querySelector(".cd-ex"), vEl = el.querySelector(".cd-v");
    const paint = () => { exEl.textContent = CALC.tk.map((t) => t.d).join("") || " "; vEl.innerHTML = CALC.out; };
    /* final … 「＝」で確定（ANS に入れる）。それ以外は途中の値をうすく見せるだけ */
    const calc = (final) => {
      let s = CALC.tk.map((t) => t.v).join("");
      if (!s) { CALC.out = "0"; return; }
      const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
      for (let i = 0; i < open; i++) s += ")";
      try {
        const v = calcEval(s);
        if (!isFinite(v)) throw new Error("inf");
        if (final) { CALC.ans = v; CALC.out = fmtNum(v); } else CALC.out = '<span class="pv">' + fmtNum(v) + "</span>";
      } catch (e) { CALC.out = final ? '<span class="er">式を確かめてね</span>' : ""; }
    };
    el.querySelector(".ck").addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]"); if (!b) return;
      const k = b.dataset.k;
      if (k === "AC") { CALC.tk = []; CALC.out = "0"; }
      else if (k === "=") calc(true);
      else {
        if (k === "⌫") CALC.tk.pop();
        else if (k === "ANS") CALC.tk.push({ d: "Ans", v: "(" + String(CALC.ans).replace("e", "E") + ")" });
        else CALC.tk.push({ d: CD[k] || k, v: CV[k] != null ? CV[k] : k });
        calc(false);
      }
      paint(); SFX.tap();
    });
    paint();
  }

  /* ══════════════ メモ（#pad）：手書き・文字・電卓・定数と公式 ══════════════
     ★★ 2026-10-06b ご指定「MagiLex にあるように問題中のメモを」。演習の画面の「メモ」で開く（問題の下に重なる段）。
     ・線は紙の幅を 1 とした座標で持つ（広げても形がくずれない）。消しゴムは別のキャンバスで destination-out。
     ・色は番号（0 墨・1 赤・2 青）で持つ＝ダークテーマでも見える色で描き直せる。 */
  const PAD_KEY = "magichemlex_pad_v1";
  const PAD = { open: false, tab: "draw", full: false, col: 0, er: false, cur: null, ptr: null, clrArm: 0, st: null, built: false, calcMounted: false,
    /* ★★ 2026-10-06c ご指定「メモの描く欄で画面の位置を PC などで移動できない」：紙を動かす・拡大縮小（MagiLex のメモと同じ）。
       view … s＝拡大率、ox/oy＝紙のどこを左上に見ているか（紙の幅＝1）。線は紙の座標のまま＝見え方だけを変える。
       動かし方：ホイール（Shift で横）・Ctrl/⌘＋ホイールで拡大・「移動」（手のひら）でドラッグ・マウスの中ボタン・スペースを押しながら・2本指（ピンチで拡大）。 */
    view: { s: 1, ox: 0, oy: 0 }, hand: false, space: false, pans: null, ptrs: {} };
  const PAD_PAGES = 6;   /* 紙の長さ（幅の6倍）。下へいくらでも書き足せる */
  function padLoad() {
    let s = null; try { s = JSON.parse(localStorage.getItem(PAD_KEY) || "null"); } catch (e) {}
    if (!s || typeof s !== "object" || Array.isArray(s)) s = {};
    if (!Array.isArray(s.strokes)) s.strokes = [];
    if (typeof s.text !== "string") s.text = "";
    s.auto = s.auto ? 1 : 0;
    return s;
  }
  function padSt() { return PAD.st || (PAD.st = padLoad()); }
  function padSave() { try { localStorage.setItem(PAD_KEY, JSON.stringify(padSt())); } catch (e) {} paintPadBtn(); }
  function padHas() { const s = padSt(); return s.strokes.length > 0 || s.text.trim().length > 0; }
  function paintPadBtn() { const b = $('[data-a="pad"]'); if (b) { b.classList.toggle("has", padHas()); b.classList.toggle("on", PAD.open); } }
  function padColors() { return document.documentElement.dataset.theme === "dark" ? ["#eef1ff", "#ff7b8a", "#7da2ff"] : ["#26304f", "#e5484d", "#2f6bff"]; }
  function padBuild() {
    const el = $("#pad"); if (!el || el.dataset.built) return;
    el.dataset.built = "1";
    const cols = padColors();
    el.innerHTML = '<div class="pad-grip" id="padGrip" title="上下にドラッグしてメモの高さを変える"><i></i></div><div class="pad-h"><div class="pad-tabs">' +
      [["draw", "pen", "手書き"], ["text", "keyboard", "文字"], ["calc", "calc", "電卓"], ["const", "table", "公式"]].map((t) => '<button data-a="padTab" data-v="' + t[0] + '"' + (PAD.tab === t[0] ? ' class="on"' : "") + ">" + ic(t[1]) + "<span>" + t[2] + "</span></button>").join("") +
      '</div><button class="pad-i" data-a="padFull" aria-label="広げる">' + ic(PAD.full ? "shrink" : "expand") + '</button><button class="pad-i" data-a="padClose" aria-label="メモを閉じる">' + ic("x") + "</button></div>" +
      '<div class="pad-tools"><span class="pad-cols">' + cols.map((c, i) => '<button class="pc' + (PAD.col === i && !PAD.er ? " on" : "") + '" data-a="padCol" data-v="' + i + '" style="--pc:' + c + '" aria-label="色"></button>').join("") + "</span>" +
      '<button class="pad-t' + (PAD.er ? " on" : "") + '" data-a="padEr">' + ic("eraser") + "<span>消しゴム</span></button>" +
      '<button class="pad-t" data-a="padUndo">' + ic("undo") + "<span>戻す</span></button>" +
      '<span class="pad-z"><button class="pad-t' + (PAD.hand ? " on hand" : "") + '" data-a="padHand" title="紙を動かす（ホイール・中ボタン・スペース＋ドラッグでも）">' + ic("hand") + "<span>移動</span></button>" +
      '<button class="pad-t sq" data-a="padZoom" data-v="-1" aria-label="縮小">' + ic("zout") + '</button><b id="padZv">100%</b><button class="pad-t sq" data-a="padZoom" data-v="1" aria-label="拡大">' + ic("zin") + "</button>" +
      '<button class="pad-t sq" data-a="padFit" aria-label="全体（最初の位置）" title="全体（最初の位置）">' + ic("fit") + "</button></span>" +
      '<button class="pad-t" data-a="padClear">' + ic("trash") + '<span id="padClrL">全部消す</span></button>' +
      '<label class="pad-auto"><input type="checkbox" id="padAuto"' + (padSt().auto ? " checked" : "") + "><span>次の問題で消す</span></label></div>" +
      '<div class="pad-b"><canvas class="pad-cv" id="padCv"></canvas><textarea class="pad-ta" id="padTa" placeholder="計算や考えたことを書けます。&#10;（アカウントで同期されます）"></textarea><div class="pad-calc" id="padCalc"></div><div class="pad-const" id="padConst"></div></div>';
    const ta = $("#padTa"); ta.value = padSt().text;
    const syncText = () => { padSt().text = ta.value; padSave(); };
    ["input", "change", "blur", "compositionend"].forEach((ev) => ta.addEventListener(ev, syncText));
    $("#padAuto").addEventListener("change", (e) => { padSt().auto = e.target.checked ? 1 : 0; padSave(); toast(e.target.checked ? "次の問題でメモを消します" : "メモを残します"); });
    padBindCanvas();
    padBindGrip();
    window.addEventListener("resize", () => { if (PAD.open) padFit(); });
  }
  /* ★★ 2026-10-06c メモの高さを変える取っ手（上の線を上下にドラッグ）。高さは端末に覚える */
  function padBindGrip() {
    const gr = $("#padGrip"), el = $("#pad"); if (!gr || !el) return;
    let y0 = 0, h0 = 0, on = false;
    try { const h = Number(localStorage.getItem("mcl_pad_h")); if (h > 120) el.style.setProperty("--padH", h + "px"); } catch (e) {}
    gr.addEventListener("pointerdown", (ev) => { on = true; y0 = ev.clientY; h0 = el.getBoundingClientRect().height; try { gr.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); });
    gr.addEventListener("pointermove", (ev) => {
      if (!on) return;
      const h = Math.max(150, Math.min(innerHeight * 0.82, h0 + (y0 - ev.clientY)));
      el.style.setProperty("--padH", Math.round(h) + "px"); padFit();
    });
    const end = () => { if (!on) return; on = false; try { localStorage.setItem("mcl_pad_h", String(Math.round(el.getBoundingClientRect().height))); } catch (e) {} };
    gr.addEventListener("pointerup", end); gr.addEventListener("pointercancel", end);
  }
  /* 紙の見え方（拡大・位置）を範囲に収める */
  function padClamp() {
    const v = PAD.view, cv = $("#padCv");
    v.s = Math.max(0.6, Math.min(3, v.s));
    const lo = Math.min(0, 1 - 1 / v.s), hi = Math.max(0, 1 - 1 / v.s);
    v.ox = Math.max(lo, Math.min(hi, v.ox));
    const ar = cv && cv.width ? cv.height / cv.width : 0.6;
    v.oy = Math.max(0, Math.min(PAD_PAGES - ar / v.s, v.oy));
    const zv = $("#padZv"); if (zv) zv.textContent = Math.round(v.s * 100) + "%";
  }
  /* 画面の点 (sx, sy：キャンバスの左上からの割合×幅) を中心に拡大率を f 倍 */
  function padZoomAt(f, fx, fy) {
    const v = PAD.view, ns = Math.max(0.6, Math.min(3, v.s * f));
    const px = fx / v.s + v.ox, py = fy / v.s + v.oy;
    v.s = ns; v.ox = px - fx / ns; v.oy = py - fy / ns;
    padClamp(); padDraw();
  }
  function padFit() {
    const cv = $("#padCv"); if (!cv) return;
    const r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    padDraw();
  }
  function padDraw() {
    const cv = $("#padCv"); if (!cv || !cv.width) return;
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    const off = PAD.off || (PAD.off = document.createElement("canvas"));
    if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
    const og = off.getContext("2d"); og.clearRect(0, 0, W, H);
    const cols = padColors(), V = PAD.view;
    padSt().strokes.concat(PAD.cur ? [PAD.cur] : []).forEach((s) => {
      const p = s.p; if (!p || !p.length) return;
      og.save(); og.setTransform(V.s, 0, 0, V.s, -V.ox * V.s * W, -V.oy * V.s * W); og.lineCap = "round"; og.lineJoin = "round";
      og.globalCompositeOperation = s.e ? "destination-out" : "source-over";
      og.strokeStyle = cols[s.c || 0] || cols[0];
      og.lineWidth = (s.e ? 0.05 : 0.0055) * W;
      og.beginPath(); og.moveTo(p[0][0] * W, p[0][1] * W);
      if (p.length === 1) og.lineTo(p[0][0] * W + 0.1, p[0][1] * W);
      for (let i = 1; i < p.length; i++) og.lineTo(p[i][0] * W, p[i][1] * W);
      og.stroke(); og.restore();
    });
    g.clearRect(0, 0, W, H);
    /* 方眼（紙の幅に24マス・正方形）。紙といっしょに動く */
    const step = W / 24 * V.s, gx0 = -((V.ox * W * V.s) % step), gy0 = -((V.oy * W * V.s) % step);
    g.save(); g.strokeStyle = document.documentElement.dataset.theme === "dark" ? "rgba(170,180,230,.12)" : "rgba(80,100,170,.12)"; g.lineWidth = 1;
    for (let x = gx0; x < W; x += step) { if (x <= 0) continue; const px = Math.round(x) + 0.5; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke(); }
    for (let y = gy0; y < H; y += step) { if (y <= 0) continue; const py = Math.round(y) + 0.5; g.beginPath(); g.moveTo(0, py); g.lineTo(W, py); g.stroke(); }
    /* 紙の端（拡大を小さくしたとき）と、いまの位置の目じるし（右のバー） */
    const ex0 = (0 - V.ox) * V.s * W, ex1 = (1 - V.ox) * V.s * W;
    if (ex0 > 0 || ex1 < W) { g.fillStyle = document.documentElement.dataset.theme === "dark" ? "rgba(0,0,0,.35)" : "rgba(60,70,120,.08)"; if (ex0 > 0) g.fillRect(0, 0, ex0, H); if (ex1 < W) g.fillRect(ex1, 0, W - ex1, H); }
    const visH = H / (W * V.s), barH = Math.max(18, H * visH / PAD_PAGES), barY = (H - barH) * (V.oy / Math.max(0.001, PAD_PAGES - visH));
    g.fillStyle = "rgba(99,102,241,.35)"; g.fillRect(W - Math.max(4, W / 160), Math.max(0, Math.min(H - barH, barY)), Math.max(3, W / 220), barH);
    g.restore();
    g.drawImage(off, 0, 0);
    if (PAD.er && PAD.ptr) {
      g.save(); g.beginPath(); g.arc((PAD.ptr[0] - V.ox) * V.s * W, (PAD.ptr[1] - V.oy) * V.s * W, 0.025 * W * V.s, 0, Math.PI * 2);
      g.fillStyle = "rgba(229,72,77,.12)"; g.fill(); g.setLineDash([5, 4]); g.strokeStyle = "rgba(229,72,77,.8)"; g.lineWidth = Math.max(1.4, W / 620); g.stroke(); g.restore();
    }
  }
  function padBindCanvas() {
    const cv = $("#padCv");
    /* 画面の点 → 紙の座標（見え方 PAD.view を逆にたどる） */
    const raw = (ev) => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.width]; };
    const pt = (ev) => { const a = raw(ev), V = PAD.view; return [a[0] / V.s + V.ox, a[1] / V.s + V.oy]; };
    const panning = () => !!PAD.pans;
    /* ホイール：上下（Shift で左右）に紙を動かす。Ctrl/⌘ を押しながらで拡大縮小 */
    cv.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const r = cv.getBoundingClientRect(), V = PAD.view;
      if (ev.ctrlKey || ev.metaKey) { const a = raw(ev); padZoomAt(Math.exp(-ev.deltaY * 0.0022), a[0], a[1]); return; }
      const dx = ev.shiftKey ? ev.deltaY : ev.deltaX, dy = ev.shiftKey ? 0 : ev.deltaY;
      V.ox += dx / (r.width * V.s); V.oy += dy / (r.width * V.s);
      padClamp(); padDraw();
    }, { passive: false });
    cv.addEventListener("contextmenu", (ev) => { if (PAD.hand || PAD.pans) ev.preventDefault(); });
    cv.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
      if (ev.pointerType === "mouse" || ev.isPrimary) { PAD.ptrs = {}; PAD.pans = null; }   /* 取りこぼした指の記録を残さない */
      PAD.ptrs[ev.pointerId] = raw(ev);
      const ids = Object.keys(PAD.ptrs);
      /* 2本指：書きかけの線は捨てて、動かす・ピンチで拡大 */
      if (ids.length >= 2) {
        PAD.cur = null;
        const a = PAD.ptrs[ids[0]], b = PAD.ptrs[ids[1]];
        PAD.pans = { two: true, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 0.01 };
        cv.classList.add("panning"); padDraw(); return;
      }
      if (PAD.hand || PAD.space || ev.button === 1) { PAD.pans = { two: false, x: PAD.ptrs[ev.pointerId][0], y: PAD.ptrs[ev.pointerId][1] }; cv.classList.add("panning"); return; }
      if (ev.button > 0) return;
      PAD.ptr = pt(ev);
      PAD.cur = { c: PAD.col, e: PAD.er ? 1 : 0, p: [PAD.ptr] };
      padDraw();
    });
    cv.addEventListener("pointermove", (ev) => {
      if (PAD.ptrs[ev.pointerId]) PAD.ptrs[ev.pointerId] = raw(ev);
      if (panning()) {
        ev.preventDefault();
        const V = PAD.view, P2 = PAD.pans, ids = Object.keys(PAD.ptrs);
        if (P2.two && ids.length >= 2) {
          const a = PAD.ptrs[ids[0]], b = PAD.ptrs[ids[1]], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 0.01;
          V.ox -= (mx - P2.mx) / V.s; V.oy -= (my - P2.my) / V.s;
          const f = d / P2.d; if (Math.abs(f - 1) > 0.002) padZoomAt(f, mx, my);
          P2.mx = mx; P2.my = my; P2.d = d;
        } else if (!P2.two) {
          const c = PAD.ptrs[ev.pointerId] || raw(ev);
          V.ox -= (c[0] - P2.x) / V.s; V.oy -= (c[1] - P2.y) / V.s; P2.x = c[0]; P2.y = c[1];
        }
        padClamp(); padDraw(); return;
      }
      PAD.ptr = pt(ev);
      if (!PAD.cur) { if (PAD.er) padDraw(); return; }
      ev.preventDefault();
      const q = PAD.ptr, last = PAD.cur.p[PAD.cur.p.length - 1];
      if (Math.abs(q[0] - last[0]) < 0.002 && Math.abs(q[1] - last[1]) < 0.002) return;
      PAD.cur.p.push([+q[0].toFixed(4), +q[1].toFixed(4)]);
      padDraw();
    });
    const end = (ev) => {
      if (ev && ev.pointerId != null) delete PAD.ptrs[ev.pointerId];
      if (PAD.pans) { if (!Object.keys(PAD.ptrs).length || !PAD.pans.two) { PAD.pans = null; cv.classList.remove("panning"); } return; }
      if (!PAD.cur) return;
      const s = padSt(); s.strokes.push(PAD.cur); PAD.cur = null;
      if (s.strokes.length > 600) s.strokes.splice(0, s.strokes.length - 600);
      padSave(); padDraw();
    };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
    cv.addEventListener("pointerleave", (ev) => { if (PAD.pans) return; end(ev); if (PAD.ptr) { PAD.ptr = null; if (PAD.er) padDraw(); } });
    /* スペースを押しているあいだはドラッグで紙を動かす（PC） */
    window.addEventListener("keydown", (ev) => {
      if (ev.code !== "Space" || !PAD.open || PAD.tab !== "draw") return;
      const tg = ev.target; if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA")) return;
      PAD.space = true; cv.classList.add("hand"); ev.preventDefault();
    });
    window.addEventListener("keyup", (ev) => { if (ev.code === "Space" && PAD.space) { PAD.space = false; if (!PAD.hand) cv.classList.remove("hand"); } });
  }
  function padShowTab() {
    const el = $("#pad"); if (!el) return;
    el.dataset.tab = PAD.tab;
    $$("#pad .pad-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === PAD.tab));
    if (PAD.tab === "draw") requestAnimationFrame(padFit);
    else if (PAD.tab === "calc") { if (!$("#padCalc .calc")) mountCalc($("#padCalc")); }
    else if (PAD.tab === "const") paintPadConst();
    else if (PAD.tab === "text" && !isTouch) setTimeout(() => { try { $("#padTa").focus(); } catch (e) {} }, 60);
  }
  function paintPadConst() {
    const box = $("#padConst"); if (!box) return;
    const t = P && P.ids ? (D.BY[P.ids[P.i]] || {}).t : null;
    box.innerHTML = (t ? '<h3 class="sh-h3">この単元の公式</h3>' + formHTML(t, t) : "") + '<h3 class="sh-h3">定数・原子量</h3>' + constHTML() + '<h3 class="sh-h3">ほかの単元</h3>' + formHTML(null);
  }
  function padOpen(tab) {
    padBuild();
    if (tab) PAD.tab = tab;
    PAD.open = true;
    $("#play").classList.add("pad-on");
    padShowTab(); paintPadBtn();
    requestAnimationFrame(padFit);
  }
  function padClose() {
    PAD.open = false;
    const pl = $("#play"); if (pl) pl.classList.remove("pad-on", "pad-full");
    PAD.full = false;
    const fb = $('#pad [data-a="padFull"]'); if (fb) fb.innerHTML = ic("expand");
    paintPadBtn();
  }
  /* 次の問題に進むとき：「次の問題で消す」がオンなら消す */
  function padNext() {
    const s = padSt();
    if (s.auto && padHas()) { s.strokes = []; s.text = ""; const ta = $("#padTa"); if (ta) ta.value = ""; padSave(); padDraw(); }
    if (PAD.open && PAD.tab === "const") paintPadConst();
  }
  window.addEventListener("storage", (e) => { if (e.key === PAD_KEY && !PAD.open) { PAD.st = null; paintPadBtn(); } });
  window.addEventListener("xeva:synced", () => { if (!PAD.open) { PAD.st = null; } });

  /* ── 単元・セット・問題のシート ── */
  function openTopic(t) {
    const T = D.T[t], st = M.topicStat(t), Fd = D.F[T.f];
    sheet('<div class="tsh-h" style="--c:' + Fd.c + '">' + sym(t, "lg") + "<div><small>" + Fd.nm + "</small><h2>" + T.nm + "</h2></div></div>" +
      '<div class="setinfo"><div><b>' + st.total + "</b><span>問</span></div><div><b>" + st.mas + "</b><span>習得</span></div><div><b>" + pctTxt(st.acc) + "</b><span>正答率</span></div></div>" +
      '<div class="form-c"><h3>' + ic("card") + " 公式・考え方</h3><ul>" + (D.FORM[t] || []).map((x) => "<li>" + x + "</li>").join("") + "</ul></div>" +
      '<div class="sh-btns"><button class="btn main" data-a="startTopic" data-t="' + t + '">' + ic("play") + " この単元を解く（" + st.total + "問）</button>" +
      '<button class="btn" data-a="startTopicUn" data-t="' + t + '"' + (st.total - st.mas ? "" : " disabled") + ">まだ習得していない問題だけ（" + (st.total - st.mas) + "問）</button>" +
      '<button class="btn ghost" data-a="libTopic" data-t="' + t + '">' + ic("list") + " 問題の一覧を見る</button></div>");
  }
  function openSet(k) {
    const S = D.SETS[k], b = M.bestRun(k), n = (M.get().runs || []).filter((r) => r.set === k).length, R = M.REWARD, m = M.mult();
    sheet('<p class="sh-pre">' + esc(D.GRP ? D.GRP[S.grp] : "本番セット") + '</p><h2 class="sh-t">' + esc(S.nm) + '</h2><p class="sh-sub">' + esc(S.sub) + "</p>" +
      '<div class="setinfo"><div><b>' + S.ids.length + "</b><span>問</span></div><div><b>" + S.min + "</b><span>分（目安）</span></div><div><b>" + (b ? Math.round(b.score / b.total * 100) + "%" : "—") + "</b><span>ベスト</span></div><div><b>" + n + "</b><span>挑戦</span></div></div>" +
      '<button class="mode-b" data-a="examGo" data-set="' + k + '"><span class="mi">' + ic("clock") + "</span><span><b>本番モード</b><small>時間を計って、最後にまとめて採点。解説は結果の画面で。</small></span>" + ic("chevR") + "</button>" +
      '<button class="mode-b" data-a="setPractice" data-set="' + k + '"><span class="mi p">' + ic("hint") + "</span><span><b>練習モード</b><small>1問ずつ答え合わせ（シャッフル）。ヒント・解説・関連問題つき。</small></span>" + ic("chevR") + "</button>" +
      /* ★★ 2026-10-06c ご指定「各問題セットで習得ずみでない問題だけを出すモード」 */
      (function () { const un = S.ids.filter((id) => M.status(id) !== "mas").length; return '<button class="mode-b" data-a="setUn" data-set="' + k + '"' + (un ? "" : " disabled") + '><span class="mi p">' + ic("target") + "</span><span><b>未習得だけ（" + un + "問）</b><small>" + (un ? "習得ずみの問題をとばして練習（シャッフル）" : "すべて習得ずみ！") + "</small></span>" + ic("chevR") + "</button>"; })() +
      '<p class="sh-note">' + ic("gift") + " はじめて 60%・80%・100% をこえると +" + R.set60 * m + "・+" + R.set80 * m + "・+" + R.set100 * m + " XEVA" + (m > 1 ? "（いまは" + m + "倍）" : "") + "</p>");
  }
  function solHTML(q) {
    return '<section class="sol"><h3>' + ic("hint") + "解説</h3><div class=\"sol-b\">" + fmt(q.s) + "</div>" +
      (q.sfig && F.make(q.sfig) ? '<div class="fig">' + F.make(q.sfig) + "</div>" : "") +
      (q.sx ? '<details class="sx"><summary>' + ic("table") + " 大問のまとめ</summary>" + q.sx + "</details>" : "") +
      (q.k ? '<div class="kpnt">' + ic("spark") + "<span>ポイント</span><b>" + fmt(q.k) + "</b></div>" : "") + "</section>";
  }
  function chipsHTML(q, tag, withBm) {
    const Fd = D.F[q.f], bm = !!M.get().bm[q.id];
    return '<div class="qhead"><div class="qchips"><span class="chip fld" style="--c:' + Fd.c + '">' + Fd.nm + '</span><span class="chip">' + sym(q.t, "xs") + D.T[q.t].nm + '</span><span class="chip dif">' + "★".repeat(q.d) + "<i>" + "★".repeat(3 - q.d) + "</i></span>" +
      (q.g === "o" ? '<span class="chip og">改題</span>' : '<span class="chip rg">関連問題</span>') + (tag === "rel" ? '<span class="chip ru">類題</span>' : "") + "</div>" +
      (withBm ? '<button class="qbm' + (bm ? " on" : "") + '" data-a="bm" data-id="' + q.id + '" aria-label="ブックマーク" title="ブックマーク">' + ic("bm") + "</button>" : "") + "</div>";
  }
  function openDetail(id) {
    const q = D.BY[id], r = M.rec(id), s = M.get(), bm = !!s.bm[id];
    sheet('<div class="dt">' + chipsHTML(q) + '<div class="qsrc">' + esc(q.src) + "</div>" +
      (q.ctx ? '<details class="ctx"><summary>' + ic("list") + " 設定（大問の条件）</summary><div>" + fmt(q.ctx) + "</div></details>" : "") +
      '<div class="qtext">' + fmt(q.q) + "</div>" + (q.fig ? '<div class="fig">' + F.make(q.fig) + "</div>" : "") +
      (q.type !== "n" ? '<ol class="dt-o">' + q.o.map((o, i) => '<li class="' + ((q.type === "m" ? q.a.indexOf(i) >= 0 : q.a === i) ? "cor" : "") + '">' + M.fmtOpt(q, o) + "</li>").join("") + "</ol>" : "") +
      '<div class="dt-a">' + ic("check") + "正解：<b>" + M.answerText(q) + "</b></div>" + solHTML(q) +
      '<p class="dt-rec">' + (r && r.n ? "解いた回数 " + r.n + "・正解 " + (r.ok || 0) + "・" + ST_LB[M.status(id)] : "まだ解いていません") + "</p>" +
      '<div class="sh-btns row"><button class="btn main" data-a="solveOne" data-id="' + id + '">' + ic("play") + " この問題を解く</button><button class=\"btn" + (bm ? " on" : "") + '" data-a="bm" data-id="' + id + '">' + ic("bm") + "<span>" + (bm ? "ブックマーク中" : "ブックマーク") + "</span></button></div></div>");
  }
  function openSettings() {
    const s = M.get().set;
    const seg = (k, list) => '<div class="seg">' + list.map((p) => '<button class="' + (String(s[k]) === String(p[0]) ? "on" : "") + '" data-a="set" data-k="' + k + '" data-v="' + p[0] + '">' + p[1] + "</button>").join("") + "</div>";
    const tg = (k, t, sub) => '<button class="tg' + (s[k] ? " on" : "") + '" data-a="set" data-k="' + k + '" data-v="' + (s[k] ? 0 : 1) + '"><span><b>' + t + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + '</span><i class="sw"></i></button>';
    sheet('<h2 class="sh-t">' + ic("gear") + " 設定</h2>" +
      '<div class="st-r"><b>1日の目標</b>' + seg("goal", [[5, "5問"], [10, "10問"], [20, "20問"], [30, "30問"]]) + "</div>" +
      '<div class="st-r"><b>表示テーマ</b>' + seg("theme", [["auto", "自動"], ["light", "ライト"], ["dark", "ダーク"]]) + "</div>" +
      '<div class="st-r"><b>文字の大きさ</b>' + seg("fs", [["m", "標準"], ["l", "大きめ"]]) + "</div>" +
      /* ★★ 2026-10-09 ナビゲーター（ケミィ ⇄ 持っている UR キャラ） */
      '<div class="st-r"><b>ナビゲーター</b><button class="nv-cur" data-a="navPick">' + F.mascot("smile") + "<span><b>" + esc(F.navName()) + "</b><small>" + (F.navCur() ? "UR キャラ" : "はじめからいる丸底フラスコ") + "</small></span>" + ic("chevR") + "</button>" +
      '<small class="muted">XEVARION で持っている UR キャラを、ホーム・復習・答え合わせ・結果のナビにできます。</small></div>' +
      tg("relAuto", "まちがえたら類題を出す", "同じ考え方の関連問題を、すぐあとに1問はさみます") +
      tg("timer", "1問ごとの時間を表示") +
      tg("sound", "効果音") +
      (navigator.vibrate ? tg("vib", "振動（まちがえたとき）") : "") +
      '<div class="st-r"><b>データ</b><button class="btn danger" data-a="reset">学習の記録をリセット</button><small class="muted">XEVA・受け取ったごほうびはそのまま。問題の記録・復習の予定・ブックマークが消えます。</small></div>' +
      '<p class="sh-note">MagiChemLex v2（2026-10-06）</p>');
  }
  /* ══ ★★ 2026-10-09 ナビゲーターをえらぶ（ケミィ＋XEVARION の UR キャラ。持っていないキャラは鍵つきで見せる）══ */
  const NV_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><rect x="5" y="11" width="14" height="10" rx="3" fill="currentColor"/></svg>';
  function openNavPicker() {
    const L = F.navList(), now = F.navCur(), nOwn = L.filter((c) => c.own).length;
    const cell = (c) => '<button class="nv-c' + (now && now.id === c.id ? " on" : "") + (c.own ? "" : " lock") + '" data-a="navSet" data-v="' + c.id + '"' + (c.own ? "" : ' data-lock="1"') + ">" +
      '<span class="nv-ph"><img src="' + c.img + '" alt="" loading="lazy" decoding="async">' + (c.own ? "" : '<i class="nv-lk">' + NV_LOCK + "</i>") + "</span><b>" + esc(c.nm) + "</b><small>" + (c.own ? "UR" : "未所持") + "</small></button>";
    sheet('<h2 class="sh-t">' + ic("spark") + " ナビゲーター</h2>" +
      '<p class="nv-lead">ホーム・復習・答え合わせ・結果で話しかけてくれるナビをえらべます。<br>XEVARION で持っている <b>UR キャラ</b>（' + nOwn + " / " + L.length + "人）から選べます。</p>" +
      '<div class="nv-grid"><button class="nv-c' + (now ? "" : " on") + '" data-a="navSet" data-v=""><span class="nv-ph chemy">' + F.mascot("smile", { chemy: 1 }) + "</span><b>ケミィ</b><small>はじめから</small></button>" +
      L.map(cell).join("") + "</div>" +
      (nOwn ? "" : '<p class="nv-note">UR キャラは XEVARION のガチャで手に入ります。手に入れると、ここで選べるようになります。</p>'));
  }
  function openWelcome() {
    const goal = Number(M.get().set.goal) || 10;
    sheet('<div class="wel">' + F.mascot("wow") + "<h2>MagiChemLex へようこそ！</h2><p>難関大の化学を、<b>入試問題の改題</b>と<b>関連問題</b>でじっくり鍛える学習アプリです。</p>" +
      '<ul class="wel-l"><li>' + ic("target") + "<span><b>おすすめ10問</b>：復習と新しい問題を自動でミックス</span></li><li>" + ic("review") + "<span><b>間隔反復</b>：忘れかけたころに復習が出てくる</span></li><li>" + ic("memo") + "<span><b>メモ</b>：手書きの計算・電卓・定数表を問題の下に</span></li><li>" + ic("gift") + "<span>がんばると <b>XEVA</b> がもらえる" + (M.mult() > 1 ? "（いまは" + M.mult() + "倍！）" : "") + "</span></li></ul>" +
      '<p class="wel-q">1日の目標は？</p><div class="seg">' + [5, 10, 20, 30].map((n) => '<button class="' + (goal === n ? "on" : "") + '" data-a="onbGoal" data-v="' + n + '">' + n + "問</button>").join("") + "</div>" +
      '<button class="btn main wide" data-a="onbStart">' + ic("play") + ' おすすめ10問ではじめる</button><button class="btn wide ghost" data-a="shclose">あとで</button></div>', { onClose: () => { M.setSetting("onb", 1); } });
  }

  /* ══════════════ 演習 ══════════════ */
  let P = null, tickId = 0;
  const OKM = ["正解！", "すばらしい！", "ナイス！", "その調子！", "さすが！", "完璧！"];
  function playShell() {
    const pl = $("#play");
    if (!$("#plTop", pl)) pl.innerHTML = '<div class="pl-top" id="plTop"></div><div class="pl-body" id="plBody"></div><div class="pad" id="pad" data-tab="draw"></div><div class="pl-bot" id="plBot"></div>';
    return pl;
  }
  function startSession(ids, opt) {
    opt = opt || {};
    ids = (ids || []).filter((id) => D.BY[id]);
    if (!ids.length) { toast(opt.empty || "出せる問題がありません"); return; }
    closeSheet();
    const at = Math.max(0, Math.min(ids.length - 1, opt.at || 0));
    P = { ids: ids.slice(at), tags: {}, i: 0, title: opt.title || "演習", exam: !!opt.exam, set: opt.set || null, confirm: opt.confirm || null, mix: !!opt.mix, queued: {},
      ans: {}, res: {}, flags: {}, tq: {}, hint: 0, done: false, sel: null, combo: 0, best: 0, inserted: 0,
      t0: Date.now(), start: Date.now(), deadline: opt.exam ? Date.now() + D.SETS[opt.set].min * 60000 : 0, earned: [], xp: 0, timeUp: false };
    M.takeEarned();
    const pl = playShell(); pl.hidden = false; pl.classList.toggle("exam", P.exam);
    document.body.classList.add("playing");
    renderQ(true);
    clearInterval(tickId); tickId = setInterval(tick, 1000);
  }
  function closePlay() {
    clearInterval(tickId); P = null;
    padClose();
    const pl = $("#play"); pl.hidden = true; pl.innerHTML = ""; pl.classList.remove("pad-on", "pad-full", "exam"); document.body.classList.remove("playing");
    go(TAB, true);
  }
  function curQ() { return D.BY[P.ids[P.i]]; }
  function timeText() {
    if (!P) return "";
    if (P.exam) { const left = P.deadline - Date.now(); return (left < 0 ? "+" : "") + mmss(Math.abs(left)); }
    if (!M.get().set.timer || P.done) return "";
    return mmss(Date.now() - P.t0);
  }
  function tick() {
    if (!P) return;
    const el = $("#plTime"); if (el) { el.textContent = timeText(); el.classList.toggle("over", P.exam && Date.now() > P.deadline); el.classList.toggle("warn", P.exam && P.deadline - Date.now() < 5 * 60000); }
    if (P.exam && !P.timeUp && Date.now() > P.deadline) { P.timeUp = true; SFX.combo(); openNav("⏰ 目安の時間になりました。このまま続けることもできます。"); }
  }
  function paintTop() {
    const n = P.ids.length;
    const pct = P.exam ? (Object.keys(P.ans).length / n) : ((P.i + (P.done ? 1 : 0)) / n);
    $("#plTop").innerHTML = '<button class="pl-x" data-a="quit" aria-label="やめる">' + ic("x") + "</button>" +
      '<div class="pl-prog"><div class="pl-tt">' + esc(P.title) + '</div><div class="pl-bar"><i style="width:' + (pct * 100).toFixed(1) + '%"></i></div></div>' +
      '<span class="pl-cnt">' + (P.i + 1) + "<small>/" + n + "</small></span>" +
      (P.exam ? '<button class="pl-nav" data-a="nav">' + ic("grid") + "<span>一覧</span></button>" : '<span class="pl-combo' + (P.combo >= 2 ? " on" : "") + '">' + ic("flame") + "<b>" + P.combo + "</b></span>") +
      '<span class="pl-time' + (P.exam ? " ex" : "") + '" id="plTime">' + timeText() + "</span>";
  }
  const KP = [["7"], ["8"], ["9"], ["bs", "⌫", "fn"], ["4"], ["5"], ["6"], ["-", "−", "fn"], ["1"], ["2"], ["3"], ["e", "×10ⁿ", "fn"], ["0", "0", "w2"], ["."], ["c", "C", "fn"]];
  function ansHTML(q) {
    if (q.type === "n") {
      return '<div class="numin"><label class="numbox"><input id="numIn" class="numreal"' + (isTouch ? " readonly" : "") + ' inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="数値を入力" value="' + esc(P.sel || "") + '"><span class="nu">' + (q.u ? fmt(q.u) : "") + "</span></label>" +
        '<div class="numprev" id="numPrev"></div><div class="kp">' + KP.map((k) => '<button class="kpk' + (k[2] ? " " + k[2] : "") + '" data-a="kp" data-k="' + k[0] + '">' + (k[1] || k[0]) + "</button>").join("") + "</div>" +
        '<p class="numnote">指数は「×10ⁿ」キー（例：2.68×10^3）。有効数字は問題文のとおりで OK。</p></div>';
    }
    /* 選択肢が短い記号（ア〜コ・①〜⑤・数字）だけのときは横に並べる */
    const grid = q.o.every((o) => String(o).replace(/<[^>]+>/g, "").length <= 3);
    /* ★★ 2026-10-07 ご指定「解答の選択はランダムな順番で」：並びだけ混ぜる。data-i は<b>もとの番号</b>のまま
       （判定・記録・本番モードの答え・正解の印はもとの番号で動く）。左の数字は見えている順。 */
    return '<div class="opts' + (q.type === "m" ? " multi" : "") + (grid ? " grid" : "") + '">' + optOrder(q).map((i, k) => '<button class="opt" data-a="pick" data-i="' + i + '"><span class="ol">' + (k + 1) + '</span><span class="ot">' + M.fmtOpt(q, q.o[i]) + '</span><span class="om"></span></button>').join("") + "</div>";
  }
  /* その問題（その回）の選択肢の並び。同じ回のあいだは同じ並び（本番モードで行き来しても変わらない）。
     同じ問題がもう一度出たとき（類題・まちがい直し）は、また混ぜなおす */
  function optOrder(q) {
    const n = (q.o || []).length, key = P ? P.i + ":" + q.id : q.id;
    if (!P) return q.o.map((_, i) => i);
    P.ord = P.ord || {};
    let o = P.ord[key];
    if (!o || o.length !== n) { o = M.shuffle(q.o.map((_, i) => i)); P.ord[key] = o; }
    return o;
  }
  function qHTML(q) {
    const tag = P.tags[q.id];
    return chipsHTML(q, tag, true) + '<div class="qsrc">' + esc(q.src) + "</div>" +
      (q.ctx ? '<details class="ctx" open><summary>' + ic("list") + " 設定（大問の条件）</summary><div>" + fmt(q.ctx) + "</div></details>" : "") +
      '<div class="qtext">' + fmt(q.q) + "</div>" + (q.fig ? '<div class="fig">' + F.make(q.fig) + "</div>" : "") +
      (q.type === "m" ? '<p class="qtype">' + ic("check") + "あてはまるものを<b>すべて</b>選んでください</p>" : q.type === "n" ? '<p class="qtype">' + ic("pen") + "数値で答えてください" + (q.u ? "（単位：" + fmt(q.u) + "）" : "") + "</p>" : "") +
      '<div class="hints" id="plHints"></div>' + ansHTML(q) +
      (P.exam ? "" : '<button class="giveup" data-a="giveup">' + ic("help") + "わからない（答えと解説を見る）</button>");
  }
  function botHTML() {
    const q = curQ();
    const memo = '<button class="bb tool memo' + (padHas() ? " has" : "") + (PAD.open ? " on" : "") + '" data-a="pad" aria-label="メモ・電卓">' + ic("memo") + "<span>メモ</span></button>";
    if (P.exam) {
      const last = P.i === P.ids.length - 1;
      return '<button class="bb sq" data-a="prev"' + (P.i === 0 ? " disabled" : "") + ' aria-label="前へ">' + ic("prev") + "</button>" +
        '<button class="bb tool flag' + (P.flags[P.i] ? " on" : "") + '" data-a="flag">' + ic("flag") + "<span>見直し</span></button>" + memo +
        '<button class="bb main" data-a="' + (last ? "nav" : "next") + '">' + (last ? "見直し・提出" : "次へ") + ic("next") + "</button>";
    }
    if (P.done) {
      const last = P.i >= P.ids.length - 1;
      return memo + '<button class="bb main go" data-a="next">' + (last ? "結果を見る" : "次の問題へ") + ic("next") + "</button>";
    }
    const nh = (q.h || []).length;
    if (P.confirm) return memo + '<button class="bb main" data-a="submit" id="btnSubmit" disabled>' + ic("check") + "決定</button>";   /* ★★ 2026-10-06c 確認テストはヒントなし */
    return '<button class="bb tool hint" data-a="hint"' + (P.hint >= nh ? " disabled" : "") + ' aria-label="ヒント">' + ic("hint") + "<span>ヒント<i>" + P.hint + "/" + nh + "</i></span></button>" + memo +
      '<button class="bb main" data-a="submit" id="btnSubmit" disabled>' + ic("check") + "決定</button>";
  }
  function renderQ(first) {
    const q = curQ();
    const stored = P.exam ? P.ans[P.i] : null;
    P.sel = stored != null ? (Array.isArray(stored) ? stored.slice() : stored) : (q.type === "m" ? [] : q.type === "n" ? "" : null);
    P.hint = 0; P.done = false; P.t0 = Date.now();
    if (!first) padNext();
    paintTop();
    $("#plBody").innerHTML = '<div class="pl-in" data-qid="' + q.id + '">' + qHTML(q) + '<div id="plFb"></div></div>';
    $("#plBody").scrollTop = 0;
    $("#plBot").innerHTML = botHTML();
    paintSel();
    const inp = $("#numIn");
    if (inp) {
      inp.addEventListener("input", () => { P.sel = inp.value; afterSel(); });
      if (!isTouch && !PAD.open) setTimeout(() => { try { inp.focus(); } catch (e) {} }, 60);
    }
  }
  function canSubmit() {
    const q = curQ(); if (!P || P.done) return false;
    if (q.type === "c") return P.sel != null;
    if (q.type === "m") return P.sel && P.sel.length > 0;
    return isFinite(M.parseNum(P.sel));
  }
  function paintSel() {
    const q = curQ();
    if (q.type === "n") {
      const pv = $("#numPrev"), v = P.sel || "";
      if (pv) { const n = M.parseNum(v); pv.innerHTML = v ? (isFinite(n) ? "＝ " + fmtNum(n) + (q.u ? " " + fmt(q.u) : "") : '<span class="bad">数値として読めません</span>') : ""; }
      const inp = $("#numIn"); if (inp && inp.value !== v) inp.value = v;
    } else {
      $$(".opt").forEach((b) => { const i = +b.dataset.i; b.classList.toggle("on", q.type === "m" ? P.sel.indexOf(i) >= 0 : P.sel === i); });
    }
    const sb = $("#btnSubmit"); if (sb) sb.disabled = !canSubmit();
  }
  function afterSel() {
    if (P.exam) {
      const q = curQ();
      const empty = P.sel == null || (q.type === "m" && !P.sel.length) || (q.type === "n" && !String(P.sel).trim());
      if (empty) delete P.ans[P.i]; else P.ans[P.i] = Array.isArray(P.sel) ? P.sel.slice() : P.sel;
      const bar = $(".pl-bar i"); if (bar) bar.style.width = (Object.keys(P.ans).length / P.ids.length * 100).toFixed(1) + "%";
    }
    paintSel();
  }
  function pick(i) {
    if (!P || P.done) return;
    const q = curQ(); if (q.type === "n" || i < 0 || i >= q.o.length) return;
    if (q.type === "m") { const k = P.sel.indexOf(i); if (k >= 0) P.sel.splice(k, 1); else P.sel.push(i); }
    else P.sel = P.exam && P.sel === i ? null : i;
    SFX.tap(); afterSel();
  }
  function keypad(k) {
    if (!P || P.done) return;
    let v = String(P.sel || "");
    if (/^\d$/.test(k)) v += k;
    else if (k === ".") { const part = v.split("×10^"); const cur = part[part.length - 1]; if (part.length === 1 && cur.indexOf(".") < 0) v += (cur === "" || cur === "-" ? "0." : "."); }
    else if (k === "-") { if (/×10\^$/.test(v)) v += "-"; else if (/×10\^-$/.test(v)) v = v.slice(0, -1); else if (v.indexOf("×10^") < 0) v = v[0] === "-" ? v.slice(1) : "-" + v; else { const p = v.split("×10^"); p[1] = p[1][0] === "-" ? p[1].slice(1) : "-" + p[1]; v = p.join("×10^"); } }
    else if (k === "e") { if (v.indexOf("×10^") < 0 && /\d/.test(v)) v += "×10^"; }
    else if (k === "bs") v = /×10\^$/.test(v) ? v.slice(0, -4) : v.slice(0, -1);
    else if (k === "c") v = "";
    P.sel = v; SFX.tap(); afterSel();
  }
  function hint() {
    if (!P || P.done || P.exam || P.confirm) return;
    const q = curQ(), hs = q.h || []; if (P.hint >= hs.length) return;
    const box = $("#plHints"), n = P.hint;
    const d = document.createElement("div"); d.className = "hint"; d.innerHTML = "<b>" + ic("hint") + "ヒント " + (n + 1) + "</b><div>" + fmt(hs[n]) + "</div>";
    box.appendChild(d); P.hint++;
    $("#plBot").innerHTML = botHTML(); paintSel();
    d.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function markOpts(q, ok) {
    if (q.type === "n") { const nb = $(".numbox"); if (nb) nb.classList.add(ok ? "ok" : "ng"); $$(".kpk").forEach((b) => { b.disabled = true; }); const inp = $("#numIn"); if (inp) inp.readOnly = true; return; }
    const cor = q.type === "m" ? q.a : [q.a];
    $$(".opt").forEach((b) => {
      const i = +b.dataset.i, picked = q.type === "m" ? P.sel.indexOf(i) >= 0 : P.sel === i;
      b.disabled = true;
      if (cor.indexOf(i) >= 0) b.classList.add("cor");
      else if (picked) b.classList.add("wr");
      if (q.type === "m" && cor.indexOf(i) >= 0 && !picked) b.classList.add("miss");
    });
  }
  function relChip(rid) {
    const x = D.BY[rid], stt = M.status(rid), q = P && P.ids[P.i + 1] === rid && P.tags[rid] === "rel";
    return '<button class="relc st-' + stt + (q ? " queued" : "") + '" data-a="pushrel" data-id="' + rid + '"><span class="rt"><em class="' + x.g + '">' + (x.g === "o" ? "改題" : "関連") + "</em>" + D.T[x.t].nm + '</span><span class="rq">' + esc(short(rid, 46)) + "</span></button>";
  }
  function submit(giveup) {
    if (!P || P.done || P.exam) return;
    if (!giveup && !canSubmit()) return;
    const q = curQ(), id = q.id;
    const ok = !giveup && M.judge(q, P.sel);
    const ms = Date.now() - P.t0;
    const r = M.answer(id, ok, { hint: P.hint, ms, giveup: !!giveup });
    P.res[P.i] = { id, ok, hint: P.hint, ms, giveup: !!giveup, sel: Array.isArray(P.sel) ? P.sel.slice() : P.sel };
    P.done = true; P.xp += r ? r.xp : 0;
    const earned = M.takeEarned(); P.earned = P.earned.concat(earned);
    if (ok) { P.combo++; P.best = Math.max(P.best, P.combo); SFX.ok(); if (P.combo >= 5 && P.combo % 5 === 0) setTimeout(SFX.combo, 220); }
    else { P.combo = 0; SFX.ng(); vib([25, 40, 25]); }
    let relAdded = null;
    if (!ok && M.get().set.relAuto && P.inserted < 5 && !P.confirm) {
      const rid = M.pickRelated(id, P.ids);
      if (rid) { P.ids.splice(P.i + 1, 0, rid); P.tags[rid] = "rel"; P.inserted++; relAdded = rid; }
    }
    markOpts(q, ok);
    const gu = $(".giveup"); if (gu) gu.remove();
    const gain = earned.reduce((a, e) => a + e.amt, 0);
    const yourNum = q.type === "n" && !ok && !giveup && String(P.sel || "").trim() ? '<small class="your">あなたの答え：' + esc(P.sel) + "</small>" : "";
    $("#plFb").innerHTML =
      '<div class="fb ' + (ok ? "ok" : "ng") + '">' + F.mascot(ok ? (P.combo >= 5 ? "wow" : "happy") : "sad") +
      '<div class="fb-t"><b>' + (ok ? OKM[Math.floor(Math.random() * OKM.length)] : giveup ? "答えを確認しよう" : "おしい！") + "</b><p>" +
      (ok ? (P.combo >= 2 ? P.combo + "問連続正解中 🔥" : r && r.first ? "この問題、はじめての正解！" : "よくできました") : "正解は <b>" + M.answerText(q) + "</b>" + yourNum) + "</p></div>" +
      '<div class="fb-g"><span>+' + (r ? r.xp : 0) + " XP</span>" + (gain ? '<span class="xv"><img src="../XEVA.png" alt="">+' + gain + "</span>" : "") + "</div></div>" +
      (r && r.mastered ? '<div class="fbn mas">' + ic("trophy") + "この問題を<b>習得</b>しました！</div>" : "") +
      (r && r.topicDone ? '<div class="fbn mas">' + ic("trophy") + "単元「" + D.T[q.t].nm + "」をマスター！</div>" : "") +
      (r && r.daily ? '<div class="fbn day">' + ic("target") + "今日の目標を達成しました！</div>" : "") +
      (relAdded ? '<div class="fbn rel">' + ic("atom") + '<span>同じ考え方の<b>類題</b>を、次に1問出します</span><button class="fbx" data-a="relCancel" data-id="' + relAdded + '">取り消す</button></div>' : "") +
      (r && r.groupDone && r.groupDone.length ? '<div class="fbn mas">' + ic("trophy") + "問題セット「" + esc(r.groupDone.join("」「")) + "」を<b>完全習得</b>！確認テストに挑戦できます</div>" : "") +
      solHTML(q) +
      (ok ? '<div class="fbact"><button class="chipb" data-a="uns" data-id="' + id + '">' + ic("help") + "<span>自信がない（明日もう一度）</span></button></div>" : "") +
      ((q.rel || []).length && !P.confirm ? '<section class="relw"><h3>' + ic("atom") + "関連問題<small>押すと次に出題・もう一度押すと取り消し</small></h3><div class=\"rels\">" + q.rel.slice(0, 4).map(relChip).join("") + "</div></section>" : "");
    $("#plBot").innerHTML = botHTML();
    paintTop();
    if (ok) { const fb = $(".fb"); if (fb) { const rc = fb.getBoundingClientRect(); confetti(P.combo >= 5 ? 34 : 18, rc.left + 44, rc.top + 30); } }
    setTimeout(() => { const fb = $(".fb"); if (fb) fb.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
    if (r && r.lvUp) setTimeout(() => toast("🎉 レベルアップ！ <b>Lv." + M.level().lv + " " + M.level().title + "</b>", "gold"), 500);
    paintHeader();
  }
  function next() {
    if (!P || P.report) return;
    if (P.exam) { saveTq(); if (P.i < P.ids.length - 1) { P.i++; renderQ(); } else openNav(); return; }
    if (!P.done) return;
    if (P.i >= P.ids.length - 1) { summary(); return; }
    P.i++; renderQ();
  }
  function prev() { if (!P || !P.exam || P.i === 0) return; saveTq(); P.i--; renderQ(); }
  function saveTq() { if (!P) return; P.tq[P.i] = (P.tq[P.i] || 0) + (Date.now() - P.t0); P.t0 = Date.now(); }
  function quit() {
    if (!P) return;
    if (P.exam) {
      sheet('<h2 class="sh-t">本番セットをやめますか？</h2><p class="sh-sub">ここまでの答えは記録されません。</p><div class="sh-btns"><button class="btn danger" data-a="quitExam">やめる</button><button class="btn main" data-a="shclose">つづける</button></div>');
      return;
    }
    if (Object.keys(P.res).length) summary(); else closePlay();
  }
  function openNav(msg) {
    if (!P || !P.exam) return;
    saveTq();
    const n = P.ids.length, answered = Object.keys(P.ans).length, fl = Object.keys(P.flags).filter((k) => P.flags[k]).length;
    sheet('<h2 class="sh-t">' + ic("grid") + " 問題一覧</h2>" + (msg ? '<p class="sh-warn">' + msg + "</p>" : "") +
      '<p class="sh-sub">解答ずみ <b>' + answered + "</b> / " + n + "　見直し <b>" + fl + "</b>　残り時間 " + timeText() + "</p>" +
      '<div class="navg">' + P.ids.map((id, i) => '<button class="navb' + (P.ans[i] != null ? " a" : "") + (P.flags[i] ? " f" : "") + (i === P.i ? " cur" : "") + '" data-a="jump" data-i="' + i + '">' + (i + 1) + "</button>").join("") + "</div>" +
      '<div class="navlg"><span class="a">解答ずみ</span><span class="f">見直し</span><span>未解答</span></div>' +
      '<button class="btn main wide" data-a="submitExam">' + ic("check") + (answered < n ? " 提出する（未解答 " + (n - answered) + "問）" : " 提出して採点する") + "</button>");
  }
  function submitExam() {
    if (!P || !P.exam) return;
    closeSheet(); saveTq();
    const rows = P.ids.map((id, i) => { const q = D.BY[id], a = P.ans[i]; return { id, i, ok: a != null && M.judge(q, a), a }; });
    rows.forEach((r) => { M.answer(r.id, r.ok, { ms: P.tq[r.i] || 0, exam: true }); });
    const score = rows.filter((r) => r.ok).length, total = rows.length, ms = Date.now() - P.start;
    const fin = M.finishSet(P.set, { score, total, ms, wrong: rows.filter((r) => !r.ok).map((r) => r.id) });
    P.earned = M.takeEarned();
    clearInterval(tickId);
    examReport(rows, score, total, ms, fin);
  }
  function earnHTML(list) {
    if (!list || !list.length) return "";
    const tot = list.reduce((a, e) => a + e.amt, 0), m = list.some((e) => e.m > 1) ? M.mult() : 1;
    /* 同じ理由はまとめる（「はじめての正解（改題）×9」など） */
    const g = [], at = {};
    list.forEach((e) => { if (at[e.msg] == null) { at[e.msg] = g.length; g.push({ msg: e.msg, amt: 0, n: 0 }); } const o = g[at[e.msg]]; o.amt += e.amt; o.n++; });
    return '<section class="earn"><img src="../XEVA.png" alt=""><div><b>+' + nf(tot) + " XEVA</b>" + (m > 1 ? '<span class="x2">💜 ' + esc(M.evName()) + " " + m + "倍</span>" : "") + "<ul>" + g.map((e) => "<li>" + esc(e.msg) + (e.n > 1 ? " ×" + e.n : "") + " <em>+" + nf(e.amt) + "</em></li>").join("") + "</ul></div></section>";
  }
  function resMsg(p) { return p >= 1 ? "パーフェクト！文句なし！" : p >= 0.8 ? "すごい！合格ラインだよ！" : p >= 0.6 ? "いい感じ！あと少し！" : p >= 0.4 ? "まちがえた問題は復習に入れたよ。" : "ここからが伸びしろ！解説を読んでみよう。"; }
  function reportShell(title, body, bot) {
    padClose();
    $("#plTop").innerHTML = '<button class="pl-x" data-a="close" aria-label="閉じる">' + ic("x") + '</button><div class="pl-prog"><div class="pl-tt">' + esc(title) + "</div></div>";
    $("#plBody").innerHTML = '<div class="pl-in">' + body + "</div>"; $("#plBody").scrollTop = 0;
    $("#plBot").innerHTML = bot;
  }
  function summary() {
    P.report = true;
    const rs = Object.keys(P.res).sort((a, b) => a - b).map((k) => P.res[k]);
    const n = rs.length, ok = rs.filter((r) => r.ok).length, pct = n ? ok / n : 0;
    M.setCombo(P.best);
    clearInterval(tickId);
    SFX.done(); if (pct >= 0.8 && n >= 3) setTimeout(() => confetti(46), 200);
    UI.lastWrong = rs.filter((r) => !r.ok).map((r) => r.id);
    const tms = rs.reduce((a, r) => a + r.ms, 0);
    /* ★★ 2026-10-06c 確認テスト（全問正解で合格）・ランダム10問（90%以上・全問正解で毎回） */
    let banner = "";
    if (P.confirm) {
      const g = M.groupById(P.confirm), fin = M.finishConfirm(P.confirm, ok, n);
      banner = fin.pass ? '<div class="fbn mas big">' + ic("medal") + "<span>確認テスト <b>合格</b>！" + (fin.got ? " ＋" + nf(fin.got) + " XEVA" : "（ごほうびは受け取りずみ）") + "</span></div>"
        : '<div class="fbn ngb">' + ic("help") + "<span>確認テストは<b>全問正解で合格</b>です（" + ok + " / " + (g ? g.ids.length : n) + "）。まちがえた問題を見直して、もう一度！</span></div>";
      if (fin.pass) setTimeout(() => confetti(60), 260);
    } else if (P.mix) {
      const got = M.finishMix(n, ok);
      if (got) banner = '<div class="fbn mas">' + ic("gift") + "<span>ランダム10問 " + (ok === n ? "全問正解" : "90%以上") + "！ ＋" + nf(got) + " XEVA</span></div>";
    }
    P.earned = P.earned.concat(M.takeEarned());
    reportShell(P.title,
      '<section class="res-hero">' + ringW(pct, 132, 12, "<b>" + Math.round(pct * 100) + "%</b><small>" + ok + " / " + n + " 正解</small>", "big") +
      '<div class="res-m">' + F.mascot(pct >= 0.8 ? "happy" : pct >= 0.5 ? "smile" : "think") + "<p>" + resMsg(pct) + "</p></div></section>" +
      '<div class="res-stats"><div><b>+' + P.xp + "</b><span>XP</span></div><div><b>" + P.best + "</b><span>最大連続正解</span></div><div><b>" + mmss(tms) + "</b><span>かかった時間</span></div></div>" +
      banner + earnHTML(P.earned) +
      '<h3 class="sec">ふりかえり<small>押すと解説</small></h3><div class="res-list">' + rs.map((r) => '<button class="rrow ' + (r.ok ? "ok" : "ng") + '" data-a="detail" data-id="' + r.id + '"><span class="rk">' + ic(r.ok ? "check" : "x") + '</span><span class="rt">' + esc(short(r.id, 54)) + '</span><span class="rc">' + D.T[D.BY[r.id].t].nm + "</span></button>").join("") + "</div>",
      (UI.lastWrong.length ? '<button class="bb ghost wide" data-a="redo">' + ic("review") + "まちがい直し（" + UI.lastWrong.length + "問）</button>" : '<button class="bb ghost wide" data-a="more">' + ic("play") + "もう10問</button>") + '<button class="bb main" data-a="close">ホームへ</button>');
    paintHeader();
  }
  function examReport(rows, score, total, ms, fin) {
    const pct = total ? score / total : 0, S = D.SETS[P.set];
    SFX.done(); if (pct >= 0.8) setTimeout(() => confetti(60), 200);
    UI.lastWrong = rows.filter((r) => !r.ok).map((r) => r.id);
    const byT = {}; rows.forEach((r) => { const t = D.BY[r.id].t; byT[t] = byT[t] || { ok: 0, n: 0 }; byT[t].n++; if (r.ok) byT[t].ok++; });
    const your = (q, a) => a == null ? "<i>未解答</i>" : q.type === "c" ? M.fmtOpt(q, q.o[a]) : q.type === "m" ? (a.length ? a.map((i) => M.fmtOpt(q, q.o[i])).join("・") : "<i>未解答</i>") : esc(a) + (q.u ? " " + fmt(q.u) : "");
    P.exam = false; P.done = true; P.report = true;
    $("#play").classList.remove("exam");
    reportShell(setTitle(P.set) + " の結果",
      '<section class="res-hero">' + ringW(pct, 140, 13, "<b>" + Math.round(pct * 100) + "%</b><small>" + score + " / " + total + "</small>", "big") +
      '<div class="res-m">' + F.mascot(pct >= 0.8 ? "happy" : pct >= 0.6 ? "smile" : "think") + "<p>" + resMsg(pct) + "</p><small>時間 " + mmss(ms) + "（目安 " + S.min + "分）</small></div></section>" +
      (fin.tiers.length ? '<div class="fbn mas">' + ic("trophy") + "はじめて " + fin.tiers.map((t) => t + "%").join("・") + " をこえました！</div>" : "") +
      earnHTML(P.earned) +
      '<h3 class="sec">単元ごとの正解</h3><section class="card">' + Object.keys(byT).map((t) => '<div class="tb"><span>' + sym(t, "xs") + " " + D.T[t].nm + '</span><div class="mini"><i style="width:' + (byT[t].ok / byT[t].n * 100).toFixed(0) + "%;--c:" + D.F[D.T[t].f].c + '"></i></div><b>' + byT[t].ok + "/" + byT[t].n + "</b></div>").join("") + "</section>" +
      '<h3 class="sec">答え合わせ<small>押すと解説</small></h3><div class="exl">' + rows.map((r) => { const q = D.BY[r.id]; return '<details class="exr ' + (r.ok ? "ok" : "ng") + '"><summary><span class="rk">' + ic(r.ok ? "check" : "x") + '</span><span class="n">' + (r.i + 1) + '</span><span class="rt">' + esc(short(r.id, 48)) + '</span></summary><div class="exr-b"><div class="qtext">' + fmt(q.q) + '</div><p class="ya">あなた：' + your(q, r.a) + '</p><p class="ca">正解：<b>' + M.answerText(q) + "</b></p>" + solHTML(q) + "</div></details>"; }).join("") + "</div>",
      (UI.lastWrong.length ? '<button class="bb ghost wide" data-a="redo">' + ic("review") + "まちがい直し（" + UI.lastWrong.length + "問）</button>" : "") + '<button class="bb main" data-a="close">ホームへ</button>');
    paintHeader();
  }

  /* ══════════════ 操作 ══════════════ */
  const EMPTY = { due: "今日の復習はありません 🎉", wrong: "まちがえた問題はありません", unsure: "あやしい問題はありません", bm: "ブックマークした問題はありません", weak: "まだデータがありません。まずは解いてみよう！", list: "問題がありません" };
  const TITLE = { rec: "今日のおすすめ", due: "今日の復習", wrong: "まちがえた問題", unsure: "あやしい問題", bm: "ブックマーク", weak: "弱点克服", random: "ランダム10問", list: "問題一覧から" };
  let resetArm = 0;
  const ACT = {
    tab: (el) => { closeSheet(); go(el.dataset.tab); },
    settings: () => openSettings(),
    /* ★★ 2026-10-09 ナビゲーター */
    navPick: () => openNavPicker(),
    navSet: (el) => {
      if (el.dataset.lock) { toast("まだ持っていないキャラです。XEVARION のガチャで手に入れると、ナビにできます"); return; }
      const v = el.dataset.v || "";
      M.setSetting("nav", v);
      closeSheet();
      toast(esc(F.navName()) + " がナビになりました");
      if (!P) go(TAB, true);
    },
    set: (el) => {
      const k = el.dataset.k, raw = el.dataset.v, v = /^-?\d+$/.test(raw) ? Number(raw) : raw;
      M.setSetting(k, v); applySettings(); openSettings(); if (!P) go(TAB, true);
    },
    grp: (el) => { UI.grp = Number(el.dataset.v) || 1; try { sessionStorage.setItem("mcl_grp", String(UI.grp)); } catch (e) {} go("home", true); },
    start: (el) => {
      const m = el.dataset.mode;
      let ids;
      if (m === "rec") ids = UI.recIds && UI.recIds.length ? UI.recIds : M.build("rec", { n: 10 });
      else if (m === "list") ids = M.shuffle(UI.libIds || []);   /* ★★ 2026-10-06c シャッフル */
      else ids = M.build(m, { n: 10 });
      startSession(ids, { title: TITLE[m] || "演習", empty: EMPTY[m], mix: m === "random" });
    },
    one: (el) => { const ids = UI.libIds && UI.libIds.length ? UI.libIds : [el.dataset.id]; startSession(ids, { at: Math.max(0, ids.indexOf(el.dataset.id)), title: "問題一覧から" }); },
    topic: (el) => openTopic(el.dataset.t),
    startTopic: (el) => startSession(M.build("topic", { t: el.dataset.t, shuffle: true }), { title: D.T[el.dataset.t].nm }),
    startTopicUn: (el) => startSession(M.build("topic", { t: el.dataset.t, only: "un", shuffle: true }), { title: D.T[el.dataset.t].nm + "（未習得）", empty: "この単元はすべて習得ずみ！" }),
    /* ★★ 2026-10-06c 問題セット */
    gkind: (el) => { UI.gkind = el.dataset.v === "r" ? "r" : "o"; try { sessionStorage.setItem("mcl_gkind", UI.gkind); } catch (e) {} go("sets", true); },
    gopen: (el) => { UI.gid = el.dataset.g; try { sessionStorage.setItem("mcl_gid", UI.gid); } catch (e) {} go("gset"); },
    gplay: (el) => { const g = M.groupById(el.dataset.g); if (g) startSession(M.build("group", { g: g.id }), { title: g.nm }); },
    gplayUn: (el) => { const g = M.groupById(el.dataset.g); if (g) startSession(M.build("group", { g: g.id, only: "un" }), { title: g.nm + "（未習得）", empty: "このセットはすべて習得ずみ！" }); },
    gconf: (el) => {
      const g = M.groupById(el.dataset.g); if (!g) return;
      if (!M.groupStat(g).done) { toast("ぜんぶ習得すると受けられます"); return; }
      startSession(M.build("group", { g: g.id }), { title: "確認テスト「" + g.nm + "」", confirm: g.id });
    },
    setUn: (el) => { const k = el.dataset.set; startSession(M.build("set", { set: k, only: "un", shuffle: true }), { title: setTitle(k) + "（未習得）", empty: "このセットはすべて習得ずみ！" }); },
    libTopic: (el) => { LIB.t = el.dataset.t; LIB.st = "all"; LIB.q = ""; closeSheet(); go("lib"); },
    lf: (el) => { const k = el.dataset.k; LIB[k] = k === "d" ? Number(el.dataset.v) : el.dataset.v; go("lib", true); },
    lfs: (el) => { const k = el.dataset.k; LIB[k] = k === "d" ? Number(el.dataset.v) : el.dataset.v; $$('#sheet [data-a="lfs"][data-k="' + k + '"]').forEach((b) => b.classList.toggle("on", b === el)); },
    lfReset: () => { LIB.g = "all"; LIB.st = "all"; LIB.d = 0; LIB.t = ""; $$('#sheet [data-a="lfs"]').forEach((b) => b.classList.toggle("on", b.dataset.v === "all" || b.dataset.v === "0")); },
    lclr: (el) => { const k = el.dataset.k; if (k === "t") LIB.t = ""; else LIB[k] = k === "d" ? 0 : "all"; go("lib", true); },
    libFilter: () => openLibFilter(),
    exam: (el) => openSet(el.dataset.set),
    examGo: (el) => { const k = el.dataset.set; startSession(M.build("set", { set: k }), { exam: true, set: k, title: setTitle(k) }); },
    setPractice: (el) => { const k = el.dataset.set; startSession(M.build("set", { set: k, shuffle: true }), { title: setTitle(k) + "（練習）" }); },
    pick: (el) => pick(+el.dataset.i),
    kp: (el) => keypad(el.dataset.k),
    submit: () => submit(false),
    giveup: () => submit(true),
    hint: () => hint(),
    next: () => next(),
    prev: () => prev(),
    flag: (el) => { if (!P) return; P.flags[P.i] = !P.flags[P.i]; el.classList.toggle("on", !!P.flags[P.i]); },
    nav: () => openNav(),
    jump: (el) => { if (!P) return; saveTq(); P.i = +el.dataset.i; closeSheet(); renderQ(); },
    submitExam: () => submitExam(),
    quit: () => quit(),
    quitExam: () => { closeSheet(); closePlay(); },
    close: () => closePlay(),
    redo: () => { const ids = UI.lastWrong.slice(); closePlay(); startSession(ids, { title: "まちがい直し" }); },
    more: () => { closePlay(); startSession(M.build("rec", { n: 10 }), { title: TITLE.rec }); },
    /* メモ */
    pad: () => { if (PAD.open) padClose(); else padOpen(); },
    padClose: () => padClose(),
    padTab: (el) => { PAD.tab = el.dataset.v; padShowTab(); },
    padFull: (el) => { PAD.full = !PAD.full; $("#play").classList.toggle("pad-full", PAD.full); el.innerHTML = ic(PAD.full ? "shrink" : "expand"); requestAnimationFrame(padFit); },
    padCol: (el) => { PAD.col = Number(el.dataset.v) || 0; PAD.er = false; $$("#pad .pc").forEach((b) => b.classList.toggle("on", b === el)); const e = $('#pad [data-a="padEr"]'); if (e) e.classList.remove("on"); },
    padEr: (el) => { PAD.er = !PAD.er; el.classList.toggle("on", PAD.er); $$("#pad .pc").forEach((b) => b.classList.toggle("on", !PAD.er && Number(b.dataset.v) === PAD.col)); padDraw(); },
    padUndo: () => { const s = padSt(); if (s.strokes.length) { s.strokes.pop(); padSave(); padDraw(); } },
    /* ★★ 2026-10-06c 紙を動かす・拡大縮小・全体 */
    padHand: (el) => { PAD.hand = !PAD.hand; el.classList.toggle("on", PAD.hand); el.classList.toggle("hand", PAD.hand); const cv = $("#padCv"); if (cv) cv.classList.toggle("hand", PAD.hand); toast(PAD.hand ? "ドラッグで紙を動かせます（もう一度押すと書く）" : "書くモードにもどしました"); },
    padZoom: (el) => { const cv = $("#padCv"); const ar = cv && cv.width ? cv.height / cv.width : 0.6; padZoomAt(Number(el.dataset.v) > 0 ? 1.25 : 0.8, 0.5, ar / 2); },
    padFit: () => { PAD.view = { s: 1, ox: 0, oy: 0 }; padClamp(); padDraw(); },
    padClear: () => {
      const l = $("#padClrL");
      if (Date.now() - PAD.clrArm > 3000) { PAD.clrArm = Date.now(); if (l) l.textContent = "もう一度で消す"; setTimeout(() => { if (l) l.textContent = "全部消す"; }, 3000); return; }
      PAD.clrArm = 0; const s = padSt(); s.strokes = []; s.text = ""; const ta = $("#padTa"); if (ta) ta.value = ""; padSave(); padDraw(); if (l) l.textContent = "全部消す";
    },
    calc: () => padOpen("calc"),
    consts: () => padOpen("const"),
    /* ★★ 2026-10-06c 「次に出題」はもう一度押すと取り消し（ご指定）。もともと後ろにあった問題は元の位置へ戻す */
    pushrel: (el) => {
      if (!P) return; const id = el.dataset.id;
      P.queued = P.queued || {};
      if (el.classList.contains("queued")) {
        const at = P.ids.indexOf(id, P.i + 1);
        if (at > P.i) P.ids.splice(at, 1);
        const back = P.queued[id];
        if (back != null && back > P.i && P.ids.indexOf(id, P.i + 1) < 0) P.ids.splice(Math.min(back, P.ids.length), 0, id);
        delete P.queued[id]; if (P.ids.indexOf(id, P.i + 1) < 0) delete P.tags[id];
        $$('[data-a="pushrel"][data-id="' + id + '"]').forEach((b) => b.classList.remove("queued"));
        const rc = $('[data-a="relCancel"][data-id="' + id + '"]'); if (rc) { rc.dataset.off = "1"; rc.textContent = "やっぱり出す"; rc.closest(".fbn").classList.add("off"); }
        toast("次の出題を取り消しました");
      } else {
        const at = P.ids.indexOf(id, P.i + 1);
        P.queued[id] = at > P.i ? at : null;
        if (at > P.i) P.ids.splice(at, 1);
        if (P.ids[P.i + 1] !== id) P.ids.splice(P.i + 1, 0, id);
        P.tags[id] = "rel";
        $$('[data-a="pushrel"][data-id="' + id + '"]').forEach((b) => b.classList.add("queued"));
        toast(ic("atom") + " 次にこの問題を出します（もう一度押すと取り消し）");
      }
      $("#plBot").innerHTML = botHTML(); paintTop();
    },
    /* まちがえたときに自動ではさんだ類題の取り消し（もう一度押すと戻す） */
    relCancel: (el) => {
      if (!P) return; const id = el.dataset.id, bx = el.closest(".fbn");
      if (el.dataset.off === "1") {
        if (P.ids[P.i + 1] !== id) P.ids.splice(P.i + 1, 0, id);
        P.tags[id] = "rel"; el.dataset.off = "0"; el.textContent = "取り消す"; if (bx) bx.classList.remove("off");
        $$('[data-a="pushrel"][data-id="' + id + '"]').forEach((b) => b.classList.add("queued"));
        toast("類題を次に出します");
      } else {
        const at = P.ids.indexOf(id, P.i + 1); if (at > P.i) P.ids.splice(at, 1);
        if (P.ids.indexOf(id, P.i + 1) < 0) delete P.tags[id];
        el.dataset.off = "1"; el.textContent = "やっぱり出す"; if (bx) bx.classList.add("off");
        $$('[data-a="pushrel"][data-id="' + id + '"]').forEach((b) => b.classList.remove("queued"));
        toast("類題の出題を取り消しました");
      }
      $("#plBot").innerHTML = botHTML(); paintTop();
    },
    bm: (el) => {
      const on = M.toggleBm(el.dataset.id);
      $$('[data-a="bm"][data-id="' + el.dataset.id + '"]').forEach((b) => { b.classList.toggle("on", on); const sp = b.querySelector("span"); if (sp) sp.textContent = on ? "ブックマーク中" : "ブックマーク"; });
      toast(on ? ic("bm") + " ブックマークしました" : "ブックマークを外しました");
    },
    uns: (el) => { const on = !el.classList.contains("on"); M.setUns(el.dataset.id, on); el.classList.toggle("on", on); toast(on ? "明日もう一度出します" : "「自信がない」を外しました"); },
    detail: (el) => openDetail(el.dataset.id),
    solveOne: (el) => { const id = el.dataset.id; closeSheet(); if (P) closePlay(); startSession([id], { title: "1問チャレンジ" }); },
    shclose: () => closeSheet(),
    reset: (el) => {
      if (Date.now() - resetArm > 4000) { resetArm = Date.now(); el.textContent = "もう一度押すとリセットします"; el.classList.add("armed"); return; }
      resetArm = 0; M.resetAll(); closeSheet(); go("home"); toast("学習の記録をリセットしました");
    },
    onbGoal: (el) => { M.setSetting("goal", Number(el.dataset.v)); $$('[data-a="onbGoal"]').forEach((b) => b.classList.toggle("on", b === el)); },
    onbStart: () => { M.setSetting("onb", 1); closeSheet(); startSession(M.build("rec", { n: 10 }), { title: TITLE.rec }); },
  };
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]"); if (!el || el.disabled) return;
    const f = ACT[el.dataset.a]; if (!f) return;
    e.preventDefault(); f(el, e);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (sheetOpen()) { closeSheet(); e.preventDefault(); } else if (PAD.open) { padClose(); e.preventDefault(); } return; }
    if (!P || P.report || sheetOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    const tg = e.target, typing = tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA");
    if (e.key === "Enter") {
      if (tg && tg.tagName === "TEXTAREA") return;
      e.preventDefault();
      if (P.exam || P.done) next(); else if (canSubmit()) submit(false);
      return;
    }
    if (typing) return;
    /* ★★ 2026-10-07 数字キーは<b>見えている順</b>（選択肢を混ぜたので、もとの番号に直してから選ぶ） */
    if (/^[1-9]$/.test(e.key)) { const q = curQ(); if (q && q.type !== "n") { const o = optOrder(q), k = +e.key - 1; if (k < o.length) pick(o[k]); } }
    else if (P.exam && e.key === "ArrowRight") next();
    else if (P.exam && e.key === "ArrowLeft") prev();
    else if (!P.exam && (e.key === "h" || e.key === "H")) hint();
    else if (e.key === "m" || e.key === "M") { if (PAD.open) padClose(); else padOpen(); }
  });
  window.addEventListener("xeva:synced", () => {
    paintHeader();
    const ae = document.activeElement;
    if (!P && !sheetOpen() && !(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA"))) go(TAB, true);
  });

  /* ══════════════ 起動 ══════════════ */
  const PAGES = { home: pgHome, sets: pgSets, gset: pgGSet, lib: pgLib, review: pgReview, stats: pgStats, tools: pgTools };
  function boot() {
    applySettings();
    let t = "home";
    try { t = sessionStorage.getItem("mcl_tab") || "home"; } catch (e) {}
    const h = (location.hash || "").slice(1); if (PAGES[h]) t = h;
    go(t);
    if (!M.get().set.onb) setTimeout(openWelcome, 500);
    /* ★★ 2026-10-06c 問題セットを入れる前に完全習得していたぶん（起動・同期のあと） */
    const catchUp = () => { try { const got = M.catchUpGroups(); if (got.length) { toast("🏆 完全習得ずみの問題セット " + got.length + "つぶんの XEVA を受け取りました"); paintHeader(); } } catch (e) {} };
    setTimeout(catchUp, 1800);
    window.addEventListener("xeva:synced", () => setTimeout(catchUp, 300));
    document.documentElement.classList.add("ready");
  }
  /* ★★ 2026-10-07 ご指定「特に iPhone で下バーの下に隙間が空かないように」
     中身はすべて内側（.main・.pl-body・シート）でスクロールする作り。<b>文書そのもの</b>が動くと
     （iPhone のアプリ表示で html.xv-full＝文書が箱より少し長いとき・キーボードを閉じたあとに戻らないとき）
     下バーごと上へずれて、下に背景の帯が見える → いつも 0 に留める。
     ★ 入力中（キーボードが出ている）は iOS が持ち上げているので触らない。閉じたら戻す。 */
  function pinDoc() {
    if (!window.scrollY && !window.scrollX) return;
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable) && !a.readOnly) return;
    window.scrollTo(0, 0);
  }
  window.addEventListener("scroll", pinDoc, { passive: true });
  document.addEventListener("focusout", () => { setTimeout(pinDoc, 60); setTimeout(pinDoc, 360); });
  if (window.visualViewport) visualViewport.addEventListener("resize", () => setTimeout(pinDoc, 60));

  window.MCLUI = { go, startSession, toast, openSettings, padOpen, padClose };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();

/* ══════════════════════════════════════════════════════════════
   MagiCounter — アイコン（すべて自前の SVG）
   ──────────────────────────────────────────────────────────────
   ★ なぜ絵文字をやめたか（2026-09-08 のご指定）
     絵文字は端末ごとに形も色もちがい、太さもそろわないので、
     画面の印象が端末まかせになってしまう。
     ここで<b>1本の線の太さ・角の丸み・大きさ</b>をそろえた SVG を持ち、
     アプリ中どこでも同じ形・同じ重さで出す。

   ★ 使いかた
       MC_ICON.ui("search")        … 画面の道具のアイコン（線画・currentColor）
       MC_ICON.type("fire", 22)    … 18タイプの記号（白抜き・タイプ色の丸の中）
       MC_ICON.typeBadge("fire")   … タイプ色の丸＋記号（一覧の札に使う）
   ★ すべて viewBox="0 0 24 24"。色は currentColor なので、置いた場所の色になる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── 画面の道具（線画・24×24・線の太さ 1.9） ── */
  const UI = {
    /* 下のナビ */
    home:    '<path d="M4 11.2 12 4.4l8 6.8V19a1.6 1.6 0 0 1-1.6 1.6h-3.2v-5.2h-6.4v5.2H5.6A1.6 1.6 0 0 1 4 19Z"/>',
    search:  '<circle cx="10.6" cy="10.6" r="5.6"/><path d="m15 15 4.6 4.6"/>',
    counter: '<path d="M12 3.2 19 6v6.1c0 4.2-2.8 7.3-7 8.7-4.2-1.4-7-4.5-7-8.7V6Z"/><path d="m9 12 2.2 2.2L15.2 10"/>',
    team:    '<circle cx="8" cy="8.6" r="2.9"/><circle cx="16.6" cy="9.4" r="2.4"/><path d="M3.4 19.4c.5-3 2.3-4.6 4.6-4.6s4.1 1.6 4.6 4.6"/><path d="M14.4 19.4c.3-2.3 1.6-3.6 3.3-3.6 1.6 0 2.6.9 3 2.6"/>',
    rank:    '<path d="M4.6 20V12.4h4V20Zm5.4 0V4.6h4V20Zm5.4 0V9.2h4V20Z"/>',
    /* 機能 */
    chart:   '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3"/><path d="M3.6 9.2h16.8M3.6 14.8h16.8M9.2 3.6v16.8M14.8 3.6v16.8"/>',
    sim:     '<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="12" r="3.1"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4"/>',
    duel:    '<path d="m4.6 4.6 8 8M19.4 4.6l-8 8"/><path d="m14.6 14.4 4.8 4.8M9.4 14.4l-4.8 4.8"/><circle cx="12" cy="13.4" r="1.6"/>',
    opp:     '<path d="M12 3.2 19 6v6.1c0 4.2-2.8 7.3-7 8.7-4.2-1.4-7-4.5-7-8.7V6Z"/><path d="M12 8.6v4.2M12 15.8v.2"/>',
    history: '<circle cx="12" cy="12" r="7.8"/><path d="M12 7.4V12l3.2 1.9"/>',
    star:    '<path d="m12 4 2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.8 9.6 9Z"/>',
    fire:    '<path d="M12 3.4c3 3 4.6 5.4 4.6 7.6 0 1.4-.7 2.5-1.8 3 .3-1.6-.3-3-1.7-4.3.2 2.6-1 3.9-2.4 5-1.6 1.2-2.5 2.3-2.5 3.6C6.6 17 5.8 15.3 5.8 13c0-3.6 3.1-5.1 3.1-8 .9.5 1.6 1.3 2 2.3.6-1.6 1-2.9 1.1-3.9Z"/>',
    up:      '<path d="M12 19V6M6.4 11.6 12 5.8l5.6 5.8"/>',
    down:    '<path d="M12 5v13M6.4 12.4 12 18.2l5.6-5.8"/>',
    bolt:    '<path d="M13.4 3.2 6.6 13.4h4.6l-1 7.4 7-10.4h-4.6Z"/>',
    close:   '<path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6"/>',
    plus:    '<path d="M12 5.4v13.2M5.4 12h13.2"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20.2 4.4v4.4h-4.4"/>',
    globe:   '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4c2.2 2.3 3.3 5 3.3 8s-1.1 5.7-3.3 8c-2.2-2.3-3.3-5-3.3-8s1.1-5.7 3.3-8Z"/>',
    info:    '<circle cx="12" cy="12" r="8.2"/><path d="M12 11v5.4M12 7.8v.2"/>',
    check:   '<path d="m5.6 12.6 4.2 4.2 8.6-9.6"/>',
    swap:    '<path d="M4.6 8.6h12.2M13.4 5.2l3.4 3.4-3.4 3.4"/><path d="M19.4 15.4H7.2M10.6 12l-3.4 3.4 3.4 3.4"/>',
    filter:  '<path d="M4 5.4h16l-6.2 7v6.2l-3.6-2v-4.2Z"/>',
    trash:   '<path d="M5.4 7h13.2M9.4 7V5.2h5.2V7M7 7l.9 12.2h8.2L17 7"/>',
    edit:    '<path d="M15.6 4.6 19.4 8.4 8.6 19.2 4.6 20l.8-4Z"/>',
    crown:   '<path d="M4 17.6h16M4.6 16 3.4 7.4l4.6 3.2L12 4.6l4 6 4.6-3.2L19.4 16Z"/>',
  };

  function ui(name, size, sw) {
    const d = UI[name];
    if (!d) return "";
    const s = size || 22;
    return '<svg class="mci" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" '
      + 'fill="none" stroke="currentColor" stroke-width="' + (sw || 1.9) + '" '
      + 'stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>";
  }
  /* 塗りつぶしで出したいもの（ナビの選択中など） */
  function uiFill(name, size) {
    const d = UI[name];
    if (!d) return "";
    const s = size || 22;
    return '<svg class="mci" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" '
      + 'fill="currentColor" stroke="currentColor" stroke-width="1.1" '
      + 'stroke-linejoin="round">' + d + "</svg>";
  }

  /* ══ 18タイプの記号 ══
     ★ 実物のゲームのアイコンは使えないので、<b>そのタイプらしい形</b>を自分で描いた。
       どれも 24×24 の中に収め、線と面の量をそろえて「並べたときにちらつかない」ようにしてある。 */
  const TYPE = {
    normal:   '<circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.2" fill="#fff" opacity=".55"/>',
    fire:     '<path d="M12 4.2c3 2.9 4.7 5.3 4.7 7.6 0 3.1-2.2 5.2-4.7 5.2S7.3 14.9 7.3 11.8c0-1.7.8-3 2-4.3-.1 1.7.5 2.7 1.4 3.2-.3-2.3.1-4.4 1.3-6.5Z"/>',
    water:    '<path d="M12 4.4c3 3.7 5 6.6 5 8.8a5 5 0 0 1-10 0c0-2.2 2-5.1 5-8.8Z"/>',
    electric: '<path d="M13.8 3.6 7.2 13.2h4.2l-1.2 7.2 7-10.2h-4.4Z"/>',
    grass:    '<path d="M18.6 5.6c0 6.4-3.2 9.8-7.4 9.8-2.3 0-3.8-1.2-3.8-3.2 0-4.2 4.6-6.6 11.2-6.6Z"/><path d="M6.4 19.4c1.4-3.4 3.6-5.8 6.6-7.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    ice:      '<path d="M12 3.6v16.8M4.7 7.8l14.6 8.4M19.3 7.8 4.7 16.2" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>',
    fighting: '<path d="M6.6 10.2c0-1.2 1-2.1 2.2-2.1h.6V7c0-1.1.9-2 2-2s2 .9 2 2v1.1h.5c1.2 0 2.2.9 2.2 2.1v3.6c0 2.8-2 4.8-4.8 4.8s-4.7-2-4.7-4.8Z"/>',
    poison:   '<path d="M12 4.6c3.4 0 5.8 2.4 5.8 5.6 0 2-1 3.5-2.5 4.4v1.6c0 1.6-1.4 2.8-3.3 2.8s-3.3-1.2-3.3-2.8v-1.6c-1.5-.9-2.5-2.4-2.5-4.4 0-3.2 2.4-5.6 5.8-5.6Z"/><circle cx="9.9" cy="10.4" r="1.1" fill="#fff" opacity=".7"/><circle cx="14.1" cy="10.4" r="1.1" fill="#fff" opacity=".7"/>',
    ground:   '<path d="M3.6 15.6h16.8v3.2H3.6Z"/><path d="M6.2 15.6 9.6 9.4l3 4.2 2.6-4 2.6 6Z"/>',
    flying:   '<path d="M3.4 12.6c3.6-.4 6-1.8 8.6-4.8 2.6 3 5 4.4 8.6 4.8-3.4 1-5.4 2.6-8.6 6-3.2-3.4-5.2-5-8.6-6Z"/>',
    psychic:  '<circle cx="12" cy="12" r="7"/><ellipse cx="12" cy="12" rx="7" ry="3" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2" fill="#fff" opacity=".65"/>',
    bug:      '<ellipse cx="12" cy="13.4" rx="3.4" ry="5"/><path d="M8.6 9.6 5 6.6M15.4 9.6 19 6.6M8.4 13.4H4.4M15.6 13.4h4M8.8 17.2 5.4 19.6M15.2 17.2l3.4 2.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    rock:     '<path d="M4.4 16.6 8 8.2h8l3.6 8.4Z"/><path d="M8 8.2 12 16.6 16 8.2" fill="none" stroke="#fff" stroke-width="1.3" opacity=".55"/>',
    ghost:    '<path d="M12 4.4c3.5 0 5.8 2.5 5.8 6v9.2l-1.9-1.6-1.9 1.6-2-1.6-2 1.6-1.9-1.6-2 1.6v-9.2c0-3.5 2.4-6 5.9-6Z"/><circle cx="10.1" cy="10.6" r="1.1" fill="#fff" opacity=".75"/><circle cx="13.9" cy="10.6" r="1.1" fill="#fff" opacity=".75"/>',
    dragon:   '<path d="M4.2 12.6c2-4.6 5-7 9-7 2.6 0 4.6 1 6.6 3-1.6.6-2.6 1.4-3 2.4 1.4.2 2.4.8 3 1.8-3 1-4.6 2.6-5.4 5-1.4-2-3.4-3-6-3-1.4 0-2.8.3-4.2.8Z"/>',
    dark:     '<path d="M15.4 4.2A8 8 0 1 0 19.8 13a6.4 6.4 0 0 1-4.4-8.8Z"/>',
    steel:    '<path d="M12 4 18.9 8v8L12 20l-6.9-4V8Z"/><path d="M12 8.6 15.6 10.7v4.2L12 17l-3.6-2.1v-4.2Z" fill="#fff" opacity=".45"/>',
    fairy:    '<path d="M12 3.8 14 9.4l5.8.4-4.4 3.8 1.4 5.6L12 16.2l-4.8 3 1.4-5.6L4.2 9.8 10 9.4Z"/>',
  };
  function typeGlyph(k) { return TYPE[k] || TYPE.normal; }

  /* タイプの丸い記号（色つき）。一覧・詳細・相性表のどこでも同じ形。 */
  function type(k, size, color) {
    const s = size || 20;
    const c = color || "#888";
    return '<span class="mct" style="width:' + s + 'px;height:' + s + 'px;background:' + c + '">'
      + '<svg viewBox="0 0 24 24" width="' + Math.round(s * 0.74) + '" height="' + Math.round(s * 0.74) + '" '
      + 'aria-hidden="true" fill="#fff">' + typeGlyph(k) + "</svg></span>";
  }

  window.MC_ICON = { ui, uiFill, type, typeGlyph, UI, TYPE };
})();

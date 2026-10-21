/* ============================================================
   xeva-community.js — コミュニティタブの追加分（★★ 2026-10-20 ご指定）
   ------------------------------------------------------------
   ① XEVARION PARK の入口（ホームのロビーから<b>ここへ移した</b>。ロビーのその場所は競馬 GⅠ の MagiDerby）
      ・オフラインでは入らずに知らせる／推奨環境の確認（expo/park_spec.js の XSpec.pre）はホームと同じ
   ② アニメTier（★★ 2026-10-20 2回目のご指定で<b>2つの表だけ</b>・3回目のご指定で<b>ボタンで切りかえて1つずつ</b>表示）
      ・ホストの表：MagiTier の固定の「アニメ Tier表」（ホストがアクセスコードで作って公開したもの・Firebase magitier/animetier）。
        <b>今季に限らないアニメ全般</b>の表（ご指定）
      ・人気Tier：今季の国内アニメを視聴者数の順に（MagiScope の自動取得 lists/anime_jp-season.json・Annict）
      ・えらんだ表は sessionStorage（xeva_cm_attab）に覚える
      ・アニメの絵は<b>縦長</b>（ポスターの形）。押すと作品のくわしい情報（制作・監督・出演・視聴者数・公式サイト）
   ★ 2回目のご指定で、いちばん上のショートカットと「みんな／わたし」の評価はやめた。
   ★ クラス名はすべて cm- で始める（community.html の .card / .lbl / .btn とはぶつけない。.card・.lbl は見た目をそろえるためにわざと使う）
   ============================================================ */
(function () {
  "use strict";
  if (window.XevaCommunity) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = (n) => Number(n || 0).toLocaleString();
  const $ = (id) => document.getElementById(id);
  const MS_DATA = "https://raw.githubusercontent.com/merurungx-glitch/xevarion/magiscope-data/";
  const FB_URL = "https://xevarion-account-default-rtdb.asia-southeast1.firebasedatabase.app";
  const LIST_KEY = "xeva_cm_anime_v1";        /* 人気Tier の作品一覧の写し（30分） */
  const HOST_KEY = "xeva_cm_animehost_v1";    /* ホストの表の写し（10分） */
  /* 人気Tier の段（視聴者数の順位で区切る） */
  const POP = [
    { k: "S", to: 5, c: "#ff5f7e", c2: "#ff9ab0" },
    { k: "A", to: 12, c: "#ff9f43", c2: "#ffc58f" },
    { k: "B", to: 20, c: "#f2c230", c2: "#ffe07a" },
    { k: "C", to: 30, c: "#3cc777", c2: "#8fe3b1" },
    { k: "D", to: 999, c: "#4aa8ff", c2: "#99ccff" },
  ];
  const S = { items: [], season: "", at: 0, host: null, loading: false, err: "", hostErr: "", popAll: false, tab: "host" };
  try { const t = sessionStorage.getItem("xeva_cm_attab"); if (t === "host" || t === "pop") S.tab = t; } catch (e) {}

  function css() {
    if ($("cmCss")) return;
    const st = document.createElement("style");
    st.id = "cmCss";
    st.textContent = `
/* ── ① PARK の入口 ── */
.cm-park{position:relative;display:flex;align-items:center;gap:12px;width:100%;margin:0 0 12px;padding:14px 16px;border:none;border-radius:22px;cursor:pointer;text-align:left;overflow:hidden;isolation:isolate;
  font-family:inherit;color:#fff;background:linear-gradient(118deg,#21125e 0%,#4b2fd6 46%,#2aa8ff 100%);
  box-shadow:0 0 0 3px #fff,0 0 0 5.5px #7e6bff,0 6px 0 5.5px rgba(60,40,170,.24),0 14px 30px rgba(70,60,200,.3);-webkit-tap-highlight-color:transparent}
.cm-park::before{content:"";position:absolute;inset:0;z-index:-1;background:
  radial-gradient(2px 2px at 12% 30%,#fff 50%,transparent 51%),radial-gradient(1.6px 1.6px at 30% 74%,#cfe8ff 50%,transparent 51%),
  radial-gradient(2.2px 2.2px at 64% 22%,#fff 50%,transparent 51%),radial-gradient(1.4px 1.4px at 82% 66%,#fff 50%,transparent 51%),
  radial-gradient(1.8px 1.8px at 47% 48%,#ffe9a8 50%,transparent 51%),radial-gradient(120% 90% at 100% 100%,rgba(255,120,200,.35),transparent 60%)}
.cm-park::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);transform:translateX(-120%);animation:cmShine 3.6s ease-in-out 1s infinite}
@keyframes cmShine{to{transform:translateX(120%)}}
.cm-park .orb{flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)}
.cm-park .orb img{width:50px;animation:cmOrb 8s linear infinite}
@keyframes cmOrb{to{transform:rotate(360deg)}}
.cm-park .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.cm-park .tx small{font-size:10px;font-weight:900;letter-spacing:.14em;color:#bfe3ff}
.cm-park .tx b{font-family:'Orbitron',sans-serif;font-size:clamp(13px,3.9vw,17px);font-weight:900;letter-spacing:.03em;white-space:nowrap;text-shadow:0 0 12px rgba(140,200,255,.8)}
.cm-park .tx span{font-size:11px;font-weight:800;opacity:.95}
.cm-park .go{flex:none;padding:7px 12px;border-radius:99px;font-size:12px;font-weight:900;color:#3a2aa8;background:#fff;box-shadow:0 3px 0 rgba(30,20,110,.35)}
.cm-park .beta{position:absolute;right:12px;top:9px;font-style:normal;font-size:9px;font-weight:900;padding:1px 7px;border-radius:99px;background:#ffb21e;color:#fff;border:1.5px solid rgba(255,255,255,.8)}
.cm-park.off{filter:grayscale(.85) brightness(.95);opacity:.7}
.cm-park:active{transform:translateY(2px)}
/* ── ② アニメTier（ボタンで ホストの表／人気Tier を切りかえ） ── */
.cm-at .cm-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin:2px 0 10px}
.cm-at .cm-hd b{display:block;font-size:17px;font-weight:900;color:#22345c;letter-spacing:.02em}
.cm-at .cm-hd small{display:block;font-size:10.5px;font-weight:700;color:#6f82ad;margin-top:2px;line-height:1.5}
.cm-at .cm-rl{flex:none;border:1.5px solid rgba(120,160,230,.35);background:#fff;color:#6f82ad;border-radius:99px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit}
.cm-seg{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;padding:4px;border-radius:14px;background:#f2f7ec;margin-bottom:10px}
.cm-seg button{display:flex;flex-direction:column;align-items:center;gap:1px;border:none;background:none;border-radius:11px;padding:7px 4px;font-family:inherit;cursor:pointer;color:#6d8160}
.cm-seg button b{font-size:12.5px;font-weight:900;white-space:nowrap}
.cm-seg button small{font-size:9.5px;font-weight:800;opacity:.85;white-space:nowrap}
.cm-seg button.on{background:#fff;color:#2f8a1a;box-shadow:0 2px 0 rgba(47,138,26,.25),0 0 0 1.5px #8fd46f}
.cm-ch{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 11px;border-radius:12px;color:#fff;margin-bottom:6px}
.cm-ch div{min-width:0;display:flex;flex-direction:column;gap:1px}
.cm-ch b{font-size:13.5px;font-weight:900;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm-ch small{font-size:10px;font-weight:800;opacity:.92;line-height:1.4}
.cm-ch a{flex:none;color:#fff;font-size:11px;font-weight:900;text-decoration:none;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,.22);white-space:nowrap}
.cm-ch.host{background:linear-gradient(120deg,#5a3ad8,#8a6cff 60%,#ff6fa4)}
.cm-ch.pop{background:linear-gradient(120deg,#ff7a45,#ffb21e)}
.cm-rows{display:flex;flex-direction:column;gap:6px}
.cm-tr{display:flex;align-items:stretch;border-radius:12px;overflow:hidden;background:#f7f9fd;box-shadow:inset 0 0 0 1.5px rgba(120,160,230,.18);min-height:84px}
.cm-tr.emp{min-height:42px}
.cm-tl{flex:none;width:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;background:linear-gradient(160deg,var(--c2,var(--c)),var(--c));padding:4px 2px;text-align:center}
.cm-tl b{font-family:'Orbitron',sans-serif;font-size:20px;font-weight:900;line-height:1;text-shadow:0 1px 0 rgba(0,0,0,.2)}
.cm-tl small{font-size:8.5px;font-weight:900;opacity:.95;line-height:1.25;word-break:break-all}
.cm-tc{flex:1;min-width:0;display:flex;flex-wrap:wrap;gap:5px;padding:5px}
.cm-tc .emp{align-self:center;font-size:11px;font-weight:700;color:#a3afc6;padding:0 6px}
.cm-tile{position:relative;flex:none;width:calc((100% - 20px) / 5);aspect-ratio:2/3;padding:0;border:none;border-radius:8px;overflow:hidden;cursor:pointer;background:#dfe7f3;
  box-shadow:0 2px 5px rgba(40,60,110,.2);-webkit-tap-highlight-color:transparent}
@media (min-width:520px){.cm-tile{width:calc((100% - 30px) / 7)}}
.cm-tile img{width:100%;height:100%;object-fit:cover;display:block}
.cm-tile i{position:absolute;left:2px;bottom:2px;font-style:normal;font-size:8px;font-weight:900;color:#fff;padding:0 3px;border-radius:4px;background:rgba(20,30,60,.72);line-height:1.5}
.cm-tile:active{transform:scale(.95)}
.cm-more{display:block;width:100%;border:1.5px dashed rgba(120,160,230,.4);background:#fff;color:#6f82ad;border-radius:10px;padding:7px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit}
.cm-note{margin-top:10px;font-size:10.5px;font-weight:700;line-height:1.7;color:#6f82ad}
.cm-note b{color:#2f8a1a}
.cm-load{padding:20px 6px;text-align:center;font-size:11.5px;font-weight:800;color:#6f82ad;line-height:1.7}
/* 詳しく（下から出る板） */
#cmSheet{position:fixed;inset:0;z-index:320;display:none;align-items:flex-end;justify-content:center;background:rgba(30,50,90,.42);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
#cmSheet.on{display:flex;animation:cmFade .18s ease}
@keyframes cmFade{from{opacity:0}}
#cmSheet .cm-sh{position:relative;width:100%;max-width:600px;max-height:88svh;overflow:auto;overscroll-behavior:contain;border-radius:24px 24px 0 0;background:linear-gradient(180deg,#fff,#f6faff);
  box-shadow:0 -12px 40px rgba(40,70,130,.3);padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 20px);animation:cmUp .26s cubic-bezier(.2,.9,.3,1)}
@keyframes cmUp{from{transform:translateY(40px);opacity:.4}}
#cmSheet .cm-x{position:sticky;top:0;float:right;width:34px;height:34px;border:none;border-radius:11px;background:rgba(120,160,230,.16);color:#6f82ad;font-size:16px;cursor:pointer;z-index:2}
.cm-top{display:flex;gap:14px;margin-bottom:12px}
.cm-top .cv{flex:none;width:104px;aspect-ratio:2/3;border-radius:12px;overflow:hidden;background:#dfe7f3;box-shadow:0 8px 20px rgba(40,60,110,.25)}
.cm-top .cv img{width:100%;height:100%;object-fit:cover;display:block}
.cm-top .mt{min-width:0;display:flex;flex-direction:column;gap:5px}
.cm-top .mt b{font-size:16px;font-weight:900;color:#22345c;line-height:1.35}
.cm-top .mt small{font-size:11px;font-weight:700;color:#6f82ad;line-height:1.5}
.cm-chips{display:flex;flex-wrap:wrap;gap:4px}
.cm-chips span{font-size:10px;font-weight:800;padding:2px 8px;border-radius:99px;background:#eef3ff;color:#4b6cc7}
.cm-chips span.tier{color:#fff;background:var(--c)}
.cm-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 0 12px}
.cm-stat div{border-radius:12px;background:#f2f7ff;padding:8px 6px;text-align:center}
.cm-stat small{display:block;font-size:9.5px;font-weight:800;color:#6f82ad}
.cm-stat b{display:block;font-family:'Orbitron',sans-serif;font-size:16px;font-weight:900;color:#22345c;margin-top:2px}
.cm-h{font-size:12px;font-weight:900;color:#22345c;margin:12px 0 7px;display:flex;align-items:center;gap:6px}
.cm-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.cm-links a{flex:1 1 30%;text-align:center;padding:9px 6px;border-radius:12px;font-size:11.5px;font-weight:900;text-decoration:none;color:#4b6cc7;background:#fff;border:1.5px solid rgba(120,160,230,.35)}
.cm-links a.pri{color:#fff;background:linear-gradient(135deg,#4b8bff,#9b7bff);border-color:transparent}
.cm-staff{font-size:11px;font-weight:700;color:#4a5a84;line-height:1.75}
.cm-staff b{color:#22345c}
@media (prefers-reduced-motion:reduce){.cm-park::after,.cm-park .orb img{animation:none}}
`;
    document.head.appendChild(st);
  }

  /* ══ ① PARK の入口（ホームの xhOpenPark と同じ流れ） ══ */
  function parkCard() {
    const box = $("cmPark"); if (!box) return;
    box.innerHTML = '<button type="button" class="cm-park" id="cmParkBtn" aria-label="XEVARION PARK（3Dパーク・β版）に入る">' +
      '<span class="orb"><img src="brand-xevarion-orb.png" alt=""></span>' +
      '<span class="tx"><small>3D PARK</small><b>XEVARION PARK</b><span>3Dのパークで遊ぶ・みんなと会える</span></span>' +
      '<span class="go">入る ›</span><i class="beta">β版</i></button>';
    $("cmParkBtn").onclick = openPark;
    paintParkOff();
  }
  function paintParkOff() { const b = $("cmParkBtn"); if (b) b.classList.toggle("off", navigator.onLine === false); }
  function specLoad() {
    return new Promise((res) => {
      if (window.XSpec && window.XSpec.pre) { res(window.XSpec); return; }
      const s = document.createElement("script"); s.src = "expo/park_spec.js?v=3";
      s.onload = () => res(window.XSpec || null); s.onerror = () => res(null);
      document.head.appendChild(s);
    });
  }
  async function openPark() {
    if (navigator.onLine === false) { toast("📴 XEVARION PARK はオンラインのときに入れます"); return; }
    const go = () => { try { sessionStorage.setItem("xeva_park_spec_ok", String(Date.now())); } catch (e) {} location.href = "expo/index.html"; };
    const SP = await specLoad();
    let P = null; try { P = SP && SP.pre ? SP.pre() : null; } catch (e) { P = null; }
    if (!P) { go(); return; }
    const low = P.level === "low" || P.level === "soft" || P.level === "mid" || P.mobile;
    sheet('<div class="cm-h" style="margin-top:0;font-size:14px">' + (P.level === "soft" ? "⛔" : P.level === "ok" ? "💻" : "⚠️") + " XEVARION PARK　推奨環境と注意</div>" +
      '<div class="cm-staff">' + P.html + "</div>" +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">' +
        '<button class="btn" data-pk="go" style="margin:0">▶ XEVARION PARK に入る</button>' +
        (low ? '<button class="btn ghost" data-pk="low" style="margin:0">⚡ 画質を「低」にして入る</button>' : "") +
        '<button class="btn ghost" data-pk="no" style="margin:0">やめる</button></div>');
    const sh = $("cmSheet");
    sh.querySelectorAll("[data-pk]").forEach((b) => { b.onclick = () => {
      const v = b.dataset.pk;
      if (v === "no") { closeSheet(); return; }
      if (v === "low") { try { localStorage.setItem("xeva_park_quality", "low"); localStorage.setItem("xeva_park_quality_auto", "1"); } catch (e) {} }
      closeSheet(); go();
    }; });
  }

  /* ══ ② アニメTier ══ */
  function cached(key, ttl) {
    try { const c = JSON.parse(localStorage.getItem(key) || "null"); if (c && c.j && Date.now() - (c.at || 0) < ttl) return c; } catch (e) {}
    return null;
  }
  function stash(key, j) { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), j })); } catch (e) {} }
  async function getJSON(url, key, ttl, force) {
    const c = cached(key, ttl);
    if (c && !force) return c.j;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      stash(key, j);
      return j;
    } catch (e) {
      let old = null; try { old = JSON.parse(localStorage.getItem(key) || "null"); } catch (er) {}
      if (old && old.j) return old.j;          /* 取れないときは前の写し */
      throw e;
    }
  }
  async function animeInit(force) {
    const box = $("cmAnime"); if (!box) return;
    if (S.loading) return;
    S.loading = true; S.err = ""; S.hostErr = "";
    if (!S.items.length && !S.host) paintAnime();
    const fbUrl = ((window.XEVARIONFB && window.XEVARIONFB.DB_URL) || FB_URL).replace(/\/$/, "");
    const [pop, host] = await Promise.all([
      getJSON(MS_DATA + "lists/anime_jp-season.json", LIST_KEY, 30 * 60e3, force).catch(() => null),
      getJSON(fbUrl + "/magitier/animetier.json", HOST_KEY, 10 * 60e3, force).catch(() => null),
    ]);
    if (pop && Array.isArray(pop.entries)) {
      S.items = pop.entries.map((x) => ({
        id: String(x.id), t: x.title || "", img: x.image || "", w: Number(x.watchers) || 0,
        studio: x.studio || "", director: x.director || "", genres: x.genres || [], official: x.official || "", annict: x.annictUrl || "",
        format: x.format || "", status: x.status || "", ep: x.episodes || null, cast: x.cast || [], season: x.seasonText || "",
      })).sort((a, b) => b.w - a.w);
      S.season = (pop.entries[0] && pop.entries[0].seasonText) || "今季";
      S.at = pop.at || 0;
    } else S.err = "人気Tier の一覧を読みこめませんでした";
    if (host && Array.isArray(host.tiers)) S.host = host;
    else { S.host = null; S.hostErr = host === null ? "ホストの表を読みこめませんでした" : "ホストの表はまだ公開されていません"; }
    S.loading = false;
    paintAnime();
  }
  const md = (t) => { const d = new Date(t); return (d.getMonth() + 1) + "/" + d.getDate(); };
  function tile(it, badge, src) {
    return '<button type="button" class="cm-tile" data-aid="' + esc(it.id) + '" data-src="' + src + '" title="' + esc(it.t) + '">' +
      (it.img ? '<img src="' + esc(it.img) + '" alt="' + esc(it.t) + '" loading="lazy">' : "") + (badge ? "<i>" + esc(badge) + "</i>" : "") + "</button>";
  }
  function row(label, sub, c, c2, tiles) {
    return '<div class="cm-tr' + (tiles ? "" : " emp") + '" style="--c:' + c + ";--c2:" + (c2 || c) + '"><div class="cm-tl"><b>' + esc(label) + "</b>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>" +
      '<div class="cm-tc">' + (tiles || '<span class="emp">—</span>') + "</div></div>";
  }
  /* ホストの表（MagiTier の固定の「アニメ Tier表」）：段の名前・色はホストが決めたもの。今季に限らないアニメ全般 */
  function hostView() {
    const H = S.host;
    const n = H ? H.tiers.reduce((a, tr) => a + (tr.items || []).filter((x) => x && x.src).length, 0) : 0;
    const head = '<div class="cm-ch host"><div><b>' + esc((H && H.nm) || "アニメ Tier表") + "</b><small>ホストが MagiTier で作った表（今季に限らないアニメ全般）" +
      (H ? "・" + n + "作品" + (H.at ? "・" + md(H.at) + " 更新" : "") : "") + '</small></div><a href="MagiTier/MagiTier.html#view=anime">MagiTier ›</a></div>';
    if (!H) return head + '<div class="cm-load">' + esc(S.loading ? "読みこんでいます…" : S.hostErr || "まだありません") + "</div>";
    return head + '<div class="cm-rows">' + H.tiers.map((tr) => {
      const items = (tr.items || []).filter((x) => x && x.src);
      const tiles = items.map((x) => tile({ id: String(x.id), t: x.nm || "", img: x.src }, "", "host")).join("");
      /* ★ 2026-10-20 ご指定：左はランク（SS・S・A…）だけ。「殿堂入り」などの段の名前は出さない */
      return row(tr.label || "", "", tr.bg || "#7b8399", tr.bg || "#9aa3b5", tiles);
    }).join("") + "</div>";
  }
  /* 人気Tier（今季の視聴者数の順位で S〜D・31位からはたたむ） */
  function popView() {
    const head = '<div class="cm-ch pop"><div><b>人気Tier・' + esc(S.season || "今季") + "</b><small>今季の国内アニメの視聴者数（Annict）の順" +
      (S.items.length ? "・" + S.items.length + "作品" : "") + (S.at ? "・" + md(S.at) + " 更新" : "") + '</small></div><a href="MagiScope/index.html">MagiScope ›</a></div>';
    if (!S.items.length) return head + '<div class="cm-load">' + esc(S.loading ? "読みこんでいます…" : S.err || "まだありません") + "</div>";
    let from = 0, html = "";
    POP.forEach((t) => {
      if (t.k === "D" && !S.popAll) return;
      const list = S.items.slice(from, Math.min(S.items.length, t.to));
      html += row(t.k, (from + 1) + "〜" + (t.to >= 999 ? "" : t.to) + "位", t.c, t.c2, list.map((it, k) => tile(it, "#" + (from + k + 1), "pop")).join(""));
      from = t.to;
    });
    if (S.items.length > 30) html += '<button type="button" class="cm-more" data-at="popAll">' + (S.popAll ? "31位からをたたむ" : "31位から（D）も見る") + "</button>";
    return head + '<div class="cm-rows">' + html + "</div>";
  }
  function paintAnime() {
    const box = $("cmAnime"); if (!box) return;
    box.innerHTML = '<div class="lbl">アニメTier</div>' +
      '<div class="cm-hd"><div><b>アニメTier</b><small>ボタンで「ホストの表」と「人気Tier」を切りかえ</small></div><button type="button" class="cm-rl" data-at="reload">↻ 更新</button></div>' +
      '<div class="cm-seg">' +
        '<button type="button" data-tab="host" class="' + (S.tab === "host" ? "on" : "") + '"><b>ホストの表</b><small>アニメ全般</small></button>' +
        '<button type="button" data-tab="pop" class="' + (S.tab === "pop" ? "on" : "") + '"><b>人気Tier</b><small>' + esc(S.season || "今季") + "</small></button></div>" +
      (S.tab === "pop" ? popView() : hostView()) +
      '<p class="cm-note">作品を押すと、制作・監督・出演・視聴者数などを見られます。' + (S.tab === "pop" ? "人気Tier は今季の視聴者数の順位で自動で決まります。" : "ホストの表は MagiTier の「アニメ Tier表」（<b>ホストだけが編集</b>できる固定の表）を、そのまま出しています。") + "</p>";
  }
  function onAnimeClick(e) {
    const a = e.target.closest("[data-at]");
    if (a && a.dataset.at === "reload") { animeInit(true); return; }
    if (a && a.dataset.at === "popAll") { S.popAll = !S.popAll; paintAnime(); return; }
    const tb = e.target.closest("[data-tab]");
    if (tb) { S.tab = tb.dataset.tab === "pop" ? "pop" : "host"; try { sessionStorage.setItem("xeva_cm_attab", S.tab); } catch (er) {} paintAnime(); return; }
    const t = e.target.closest("[data-aid]");
    if (t) openAnime(t.dataset.aid, t.dataset.src);
  }
  /* ホストの表にあるのに、今季の人気の一覧にない作品もある（前の季節など）→ そのときは題名と絵だけ */
  function hostTierOf(id) {
    const H = S.host; if (!H) return null;
    for (const tr of H.tiers) if ((tr.items || []).some((x) => String(x.id) === String(id))) return tr;
    return null;
  }
  function hostItem(id) {
    const H = S.host; if (!H) return null;
    for (const tr of H.tiers) { const x = (tr.items || []).find((y) => String(y.id) === String(id)); if (x) return x; }
    return null;
  }
  function openAnime(id, src) {
    const it = S.items.find((x) => x.id === String(id) || String(x.id).replace(/^an/, "") === String(id));
    const hx = hostItem(id);
    const title = it ? it.t : hx ? hx.nm : "";
    const img = it ? it.img : hx ? hx.src : "";
    const rank = it ? S.items.indexOf(it) + 1 : 0;
    const pt = rank ? POP.find((t) => rank <= t.to) : null;
    const ht = hostTierOf(id);
    const staff = it ? [it.studio ? "<b>制作</b> " + esc(it.studio) : "", it.director ? "<b>監督</b> " + esc(it.director) : "",
      (it.cast || []).length ? "<b>出演</b> " + it.cast.slice(0, 5).map((c) => esc(c.n) + (c.c ? "（" + esc(c.c) + "）" : "")).join("・") : ""].filter(Boolean).join("<br>") : "";
    const ms = it ? "MagiScope/index.html#/item/anime/" + encodeURIComponent(it.id) : "MagiScope/index.html#/search?cat=anime&q=" + encodeURIComponent(title);
    sheet('<div class="cm-top"><div class="cv">' + (img ? '<img src="' + esc(img) + '" alt="">' : "") + '</div><div class="mt">' +
        "<b>" + esc(title) + "</b><small>" + (it ? esc(it.season) + (it.format ? "・" + esc(it.format) : "") + (it.ep ? "・全" + it.ep + "話" : "") + (it.status === "NOT_YET_RELEASED" ? "・放送前" : it.status === "RELEASING" ? "・放送中" : "") : "ホストの表の作品（くわしい情報は MagiScope で）") + "</small>" +
        '<div class="cm-chips">' + (ht ? '<span class="tier" style="--c:' + esc(ht.bg || "#7b8399") + '">ホストの表：' + esc(ht.label) + "</span>" : "") +
          (pt ? '<span class="tier" style="--c:' + pt.c + '">人気Tier：' + pt.k + "</span>" : "") +
          (it ? (it.genres || []).slice(0, 4).map((g) => "<span>" + esc(g) + "</span>").join("") : "") + "</div></div></div>" +
      (it ? '<div class="cm-stat"><div><small>視聴者数</small><b>' + nf(it.w) + '</b></div><div><small>人気の順位</small><b>#' + rank + "</b></div><div><small>今季の作品</small><b>" + S.items.length + "</b></div></div>" : "") +
      (staff ? '<div class="cm-h">スタッフ・出演</div><div class="cm-staff">' + staff + "</div>" : "") +
      '<div class="cm-links"><a class="pri" href="' + ms + '">MagiScope で詳しく</a>' +
        (it && it.official ? '<a href="' + esc(it.official) + '" target="_blank" rel="noopener">公式サイト ↗</a>' : "") +
        (it && it.annict ? '<a href="' + esc(it.annict) + '" target="_blank" rel="noopener">Annict ↗</a>' : "") +
        (src === "host" ? '<a href="MagiTier/MagiTier.html#view=anime">MagiTier で見る</a>' : "") + "</div>");
  }

  /* ── 下から出る板・トースト ── */
  function sheet(html) {
    let sh = $("cmSheet");
    if (!sh) {
      sh = document.createElement("div"); sh.id = "cmSheet";
      sh.innerHTML = '<div class="cm-sh" role="dialog"></div>';
      document.body.appendChild(sh);
      sh.addEventListener("click", (e) => { if (e.target === sh || e.target.closest(".cm-x")) closeSheet(); });
    }
    const card = sh.querySelector(".cm-sh");
    card.innerHTML = '<button type="button" class="cm-x" aria-label="閉じる">✕</button>' + html;
    sh.classList.add("on");
    card.scrollTop = 0;
  }
  function closeSheet() { const sh = $("cmSheet"); if (sh) sh.classList.remove("on"); }
  function toast(t) {
    const d = document.createElement("div");
    d.style.cssText = "position:fixed;left:50%;bottom:calc(var(--xvtb-h,69px) + env(safe-area-inset-bottom,0px) + 18px);transform:translateX(-50%);z-index:400;padding:10px 16px;border-radius:14px;background:rgba(20,30,60,.88);color:#fff;font-size:12.5px;font-weight:800;max-width:88vw;text-align:center";
    d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
  }

  function boot() {
    css();
    parkCard();
    const an = $("cmAnime");
    if (an) { an.addEventListener("click", onAnimeClick); animeInit(false); }
    addEventListener("online", paintParkOff); addEventListener("offline", paintParkOff);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });
  }
  window.XevaCommunity = { openPark, reload: () => animeInit(true) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();

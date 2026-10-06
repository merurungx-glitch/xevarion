/* ============================================================
   xeva-event-ui.js — XEVARION 共通イベントのページ（ポータルのホーム）
   ★★ 2026-10-06 新設（ご指定：Violet Breeze 〜10/31）
   ★★ 2026-10-06b ご指定「イベントの画面をより充実させて期間限定イベント感を」：
     ・絵がゆっくり動くヒーロー＋舞う花びら・「期間限定」のリボン・終了までのカウントダウン（秒まで）
     ・チケットの進み（リング＋20枚までのごほうびの道）・ログインスタンプのカレンダー・受け取りのきらめき
   ・中身（期間・ミッション・受け取り・パートナー割引）は xeva.js の XEVA.event。ここは見せるだけ。
   ・開きかた：ロビー右下のイベントのバナー／左上の札／「イベント」一覧／index.html#event
   ★ クラス名はすべて xev- で始める（ポータルの .hero・.card などとぶつかる）
   ============================================================ */
(function () {
  "use strict";
  if (window.XEVAEventUI) return;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const nf = (n) => Number(n || 0).toLocaleString();
  const EV = () => (window.XEVA && XEVA.event) || null;
  let curId = null, cdTimer = 0;

  function css() {
    if (document.getElementById("xevEvCss")) return;
    const st = document.createElement("style");
    st.id = "xevEvCss";
    st.textContent = `
#xevEv{position:fixed;inset:0;z-index:9000;display:none;align-items:flex-end;justify-content:center;background:rgba(14,8,40,.6);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
#xevEv.on{display:flex;animation:xevIn .22s ease-out}
@keyframes xevIn{from{opacity:0}}
#xevEv .xev-card{position:relative;width:min(760px,100%);max-height:calc(100% - env(safe-area-inset-top,0px) - 14px);overflow:auto;overscroll-behavior:contain;margin:0;padding:0;
  border-radius:24px 24px 0 0;background:linear-gradient(180deg,#f1eaff,#fbf9ff 40%);box-shadow:0 -10px 50px rgba(60,20,160,.5);animation:xevUp .34s cubic-bezier(.2,.9,.3,1);
  padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px);font-family:'Noto Sans JP',system-ui,sans-serif;color:#1b1640;text-align:left}
@media (min-width:760px){#xevEv{align-items:center}#xevEv .xev-card{border-radius:24px;max-height:92vh}}
@keyframes xevUp{from{transform:translateY(40px);opacity:.4}}
#xevEv .xev-xw{position:sticky;top:0;height:0;z-index:6}
#xevEv .xev-x{position:absolute;right:10px;top:10px;width:38px;height:38px;border-radius:50%;border:1.5px solid rgba(255,255,255,.6);background:rgba(20,10,50,.55);color:#fff;font-size:16px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}
/* ヒーロー：ゆっくり動く絵・花びら・リボン・カウントダウン */
#xevEv .xev-hero{position:relative;display:block;margin:0;padding:0;min-height:0;overflow:hidden;aspect-ratio:1714/918;max-height:46vh;width:100%}
#xevEv .xev-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;margin:0;animation:xevKen 18s ease-in-out infinite alternate;transform-origin:60% 40%}
@keyframes xevKen{from{transform:scale(1.02) translate(0,0)}to{transform:scale(1.12) translate(-2%,1.5%)}}
#xevEv .xev-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(40,16,110,0) 45%,rgba(40,16,110,.75) 100%);pointer-events:none}
#xevEv .xev-petals{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden}
#xevEv .xev-petals i{position:absolute;top:-8%;width:12px;height:9px;border-radius:9px 0 9px 0;background:linear-gradient(135deg,#f3e9ff,#b79bff);opacity:.9;
  animation:xevFall linear infinite;box-shadow:0 0 6px rgba(200,170,255,.8)}
@keyframes xevFall{0%{transform:translate(0,0) rotate(0)}50%{transform:translate(28px,55vh) rotate(220deg)}100%{transform:translate(-14px,110vh) rotate(460deg)}}
#xevEv .xev-rib{position:absolute;left:12px;top:12px;z-index:3;padding:5px 14px 5px 12px;font-size:12px;font-weight:900;letter-spacing:.12em;color:#fff;
  background:linear-gradient(100deg,#ff5fa2,#8a6cff);border-radius:4px 99px 99px 4px;box-shadow:0 4px 14px rgba(255,95,162,.45);animation:xevRib 2.4s ease-in-out infinite}
@keyframes xevRib{50%{box-shadow:0 4px 22px rgba(255,95,162,.8)}}
#xevEv .xev-cd{position:absolute;left:12px;right:12px;bottom:10px;z-index:3;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;color:#fff}
#xevEv .xev-cd .xev-cdt{font-size:11px;font-weight:800;opacity:.92;text-shadow:0 1px 4px rgba(0,0,0,.5)}
#xevEv .xev-cd .xev-cdv{display:flex;align-items:baseline;gap:3px;font-weight:900;text-shadow:0 2px 10px rgba(40,10,120,.8)}
#xevEv .xev-cd .xev-cdv b{font-size:26px;line-height:1;font-variant-numeric:tabular-nums}
#xevEv .xev-cd .xev-cdv small{font-size:11px;margin-right:4px}
#xevEv .xev-cd .xev-per{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}
#xevEv .xev-cd .xev-per span{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:900;color:#fff;background:rgba(30,12,90,.7);box-shadow:0 0 0 1.5px rgba(255,255,255,.45) inset}
#xevEv .xev-body{position:relative;padding:14px 16px 4px}
#xevEv .xev-catch{margin:0 0 12px;font-size:13px;font-weight:700;color:#5a4a9a}
#xevEv h3.xev-h{display:flex;align-items:center;gap:8px;margin:18px 0 9px;font-size:15px;font-weight:900;color:#2a1a70}
#xevEv h3.xev-h::before{content:"";width:6px;height:18px;border-radius:3px;background:linear-gradient(#ff5fa2,#8a6cff,#5ab8ff)}
#xevEv h3.xev-h small{margin-left:auto;font-size:11px;font-weight:800;color:#7a70a8}
/* 進みのカード */
#xevEv .xev-prog{display:flex;align-items:center;gap:14px;padding:14px;border-radius:18px;color:#fff;background:linear-gradient(120deg,#3b1d96,#6d4bff 60%,#4fa3ff);box-shadow:0 10px 30px rgba(90,60,220,.35);position:relative;overflow:hidden}
#xevEv .xev-prog::before{content:"";position:absolute;right:-30px;top:-40px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.12)}
#xevEv .xev-ring{position:relative;flex:none;width:86px;height:86px}
#xevEv .xev-ring svg{position:absolute;inset:0;transform:rotate(-90deg)}
#xevEv .xev-ring .bg{fill:none;stroke:rgba(255,255,255,.22);stroke-width:9}
#xevEv .xev-ring .fg{fill:none;stroke:url(#xevGrad);stroke-width:9;stroke-linecap:round;transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.3,1)}
#xevEv .xev-ring .in{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05}
#xevEv .xev-ring .in b{font-size:24px;font-weight:900}
#xevEv .xev-ring .in small{font-size:10px;font-weight:800;opacity:.85}
#xevEv .xev-pt{flex:1;min-width:0;position:relative}
#xevEv .xev-pt p{margin:0 0 6px;font-size:12px;font-weight:700;opacity:.92;line-height:1.5}
#xevEv .xev-pt p b{color:#ffe27a}
#xevEv .xev-pt button{border:0;border-radius:99px;padding:9px 16px;font-weight:900;font-size:13px;cursor:pointer;color:#2a1606;background:linear-gradient(#ffe27a,#f2b21c);box-shadow:0 3px 0 #b07a10;font-family:inherit}
#xevEv .xev-pt button:disabled{opacity:.5;cursor:default;box-shadow:none}
#xevEv .xev-pt button:not(:disabled){animation:xevPulse 1.3s ease-in-out infinite}
/* ごほうびの道（0〜20枚） */
#xevEv .xev-road{position:relative;margin:12px 4px 2px;height:30px}
#xevEv .xev-road .ln{position:absolute;left:0;right:0;top:12px;height:6px;border-radius:99px;background:#e4dcfb}
#xevEv .xev-road .ln i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#ff5fa2,#8a6cff);transition:width .8s}
#xevEv .xev-road .nd{position:absolute;top:4px;width:22px;height:22px;margin-left:-11px;border-radius:50%;display:grid;place-items:center;font-size:11px;background:#fff;box-shadow:0 0 0 2px #d9ccff}
#xevEv .xev-road .nd.ok{background:linear-gradient(#ffe27a,#f2b21c);box-shadow:0 0 0 2px #fff,0 0 10px rgba(242,178,28,.7)}
#xevEv .xev-road .nd span{position:absolute;top:24px;font-size:9.5px;font-weight:900;color:#7a70a8;white-space:nowrap}
/* 特典 */
#xevEv .xev-perks{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
#xevEv .xev-pk{position:relative;display:flex;flex-direction:column;gap:3px;padding:11px 12px;border-radius:16px;border:0;text-align:left;cursor:pointer;color:#1b1640;font:inherit;overflow:hidden;
  background:linear-gradient(150deg,#ffffff,#efe9ff);box-shadow:0 0 0 1.5px #d9ccff inset,0 4px 14px rgba(110,80,230,.14);transition:transform .12s}
#xevEv .xev-pk::after{content:"";position:absolute;right:-18px;bottom:-18px;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle,rgba(138,108,255,.18),transparent 70%)}
#xevEv .xev-pk:active{transform:scale(.97)}
#xevEv .xev-pk .xev-i{font-size:24px}
#xevEv .xev-pk b{font-size:13.5px;font-weight:900;color:#3a1fb0}
#xevEv .xev-pk small{font-size:11px;font-weight:700;color:#5d5788;line-height:1.45}
#xevEv .xev-pk em{margin-top:auto;font-style:normal;font-size:11px;font-weight:900;color:#8a6cff}
#xevEv .xev-pk.xev-used{opacity:.6}
/* ログインスタンプ */
#xevEv .xev-stamps{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;padding:10px;border-radius:16px;background:#fff;box-shadow:0 0 0 1.5px #e6defc inset}
#xevEv .xev-st{position:relative;aspect-ratio:1;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#9a92c4;background:#f6f3ff}
#xevEv .xev-st b{font-size:13px;color:#5a4a9a}
#xevEv .xev-st.on{background:linear-gradient(140deg,#8a6cff,#ff5fa2);color:#fff}
#xevEv .xev-st.on b{color:#fff}
#xevEv .xev-st.on::after{content:"💜";position:absolute;right:2px;top:1px;font-size:10px}
#xevEv .xev-st.now{box-shadow:0 0 0 2px #8a6cff}
#xevEv .xev-st.off{opacity:.35}
/* ミッション */
#xevEv .xev-ms{display:flex;flex-direction:column;gap:7px}
#xevEv .xev-m{display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:14px;background:#fff;box-shadow:0 0 0 1.5px #e6defc inset,0 2px 8px rgba(60,40,140,.06)}
#xevEv .xev-m.xev-ok{box-shadow:0 0 0 2px #8a6cff inset,0 4px 14px rgba(138,108,255,.25);background:linear-gradient(100deg,#fff,#f4efff)}
#xevEv .xev-m.xev-got{opacity:.62}
#xevEv .xev-m .xev-i{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px;background:linear-gradient(150deg,#efe9ff,#dff0ff)}
#xevEv .xev-m .xev-b{flex:1;min-width:0}
#xevEv .xev-m .xev-b b{display:block;font-size:13px;font-weight:900;line-height:1.35}
#xevEv .xev-m .xev-bar{position:relative;height:8px;margin-top:5px;border-radius:99px;background:#ece7fb;overflow:hidden}
#xevEv .xev-m .xev-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#8a6cff,#5ab8ff)}
#xevEv .xev-m .xev-v{margin-top:3px;font-size:11px;font-weight:800;color:#6d6699}
#xevEv .xev-m .xev-rw{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
#xevEv .xev-m .xev-tk{font-size:12px;font-weight:900;color:#c08a10;white-space:nowrap}
#xevEv .xev-m button{border:0;border-radius:99px;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;text-decoration:none;white-space:nowrap;font-family:inherit}
#xevEv .xev-m .xev-go{background:#ece7fb;color:#3a1fb0}
#xevEv .xev-m .xev-claim{background:linear-gradient(#ffe27a,#f2b21c);color:#2a1606;box-shadow:0 2px 0 #b07a10;animation:xevPulse 1.2s ease-in-out infinite}
@keyframes xevPulse{50%{transform:scale(1.06)}}
#xevEv .xev-m .xev-done{font-size:11px;font-weight:900;color:#2fae7a}
#xevEv .xev-note{margin:12px 0 0;font-size:11px;color:#7a70a8;line-height:1.7}
#xevEv .xev-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);transform:translateX(-50%);z-index:9100;padding:10px 18px;border-radius:99px;
  background:#201650;color:#fff;font-weight:900;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.3);animation:xevT 2.4s ease both;white-space:nowrap}
@keyframes xevT{0%{opacity:0;transform:translate(-50%,10px)}12%{opacity:1;transform:translate(-50%,0)}85%{opacity:1}100%{opacity:0}}
#xevEv .xev-burst{position:fixed;z-index:9200;pointer-events:none;font-size:18px;animation:xevBurst 1s cubic-bezier(.2,.7,.3,1) forwards}
@keyframes xevBurst{0%{opacity:1;transform:translate(0,0) scale(.6)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.2) rotate(var(--r))}}
@media (prefers-reduced-motion: reduce){#xevEv .xev-hero img,#xevEv .xev-petals i,#xevEv .xev-rib{animation:none}}
`;
    document.head.appendChild(st);
  }
  function el() {
    let o = document.getElementById("xevEv");
    if (o) return o;
    css();
    o = document.createElement("div");
    o.id = "xevEv";
    o.innerHTML = '<div class="xev-card" role="dialog" aria-label="イベント"></div>';
    document.body.appendChild(o);
    o.addEventListener("click", (e) => {
      if (e.target === o || e.target.closest(".xev-x")) { close(); return; }
      const b = e.target.closest("[data-ev]"); if (!b) return;
      const a = b.dataset.ev, v = b.dataset.v;
      if (a === "claim") claim(v, b);
      else if (a === "claimAll") claimAll(b);
      else if (a === "go" && v) { location.href = v; }
      else if (a === "partner") { close(); try { if (window.HomeMate && HomeMate.openPicker) HomeMate.openPicker(); } catch (x) {} }
      else if (a === "shop") { close(); try { if (typeof xhOpenShop === "function") xhOpenShop(); } catch (x) {} }
    });
    window.addEventListener("xeva:event", () => { if (o.classList.contains("on")) paint(); });
    window.addEventListener("xeva:synced", () => { if (o.classList.contains("on")) paint(); });
    return o;
  }
  function dstr(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function loginDays(id) {
    try { const ev = EV(), s = JSON.parse(localStorage.getItem(ev.KEY) || "{}"); return (s[id] && s[id].d && s[id].d.login) || {}; } catch (e) { return {}; }
  }
  function cdParts(E) {
    const end = new Date(E.to + "T23:59:59"), ms = Math.max(0, end - new Date());
    const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
    return { d, h, m, s, over: ms <= 0 };
  }
  function cdHTML(E) {
    const c = cdParts(E), p2 = (n) => String(n).padStart(2, "0");
    return c.over ? "<b>終了</b>" : "<b>" + c.d + "</b><small>日</small><b>" + p2(c.h) + ":" + p2(c.m) + ":" + p2(c.s) + "</b>";
  }
  function paint() {
    const ev = EV(); if (!ev || !curId) return;
    const E = ev.def(curId); if (!E) return;
    const list = ev.list(curId);
    const pend = list.filter((p) => p.done && !p.claimed);
    const got = list.filter((p) => p.claimed).reduce((a, p) => a + p.m.tk, 0);
    const total = E.missions.reduce((a, m) => a + m.tk, 0);
    const doneN = list.filter((p) => p.done).length;
    const po = ev.partnerOff();
    const live = ev.active(curId);
    const card = el().querySelector(".xev-card");
    const y = card.scrollTop;
    /* ごほうびの道：受け取った🎫の数。4枚ごとに節目 */
    const nodes = []; for (let k = 4; k <= total; k += 4) nodes.push({ at: k, ok: got >= k });
    if (!nodes.length || nodes[nodes.length - 1].at !== total) nodes.push({ at: total, ok: got >= total });
    const R = 36, C = 2 * Math.PI * R;
    /* ログインスタンプ：期間の日を7列で */
    const days = loginDays(curId), today = dstr(new Date());
    const st = [], d0 = new Date(E.from + "T00:00:00"), d1 = new Date(E.to + "T00:00:00");
    for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) { const k = dstr(d); st.push('<div class="xev-st' + (days[k] ? " on" : "") + (k === today ? " now" : "") + (k > today ? " off" : "") + '"><b>' + d.getDate() + "</b>" + (d.getDate() === 1 || k === E.from ? (d.getMonth() + 1) + "月" : "") + "</div>"); }
    const petals = Array.from({ length: 14 }, (_, i) => '<i style="left:' + ((i * 37) % 100) + "%;animation-duration:" + (7 + (i % 5) * 1.6).toFixed(1) + "s;animation-delay:-" + ((i * 1.3) % 9).toFixed(1) + "s;transform:scale(" + (0.6 + (i % 4) * 0.2).toFixed(1) + ')"></i>').join("");
    card.innerHTML = '<div class="xev-xw"><button class="xev-x" aria-label="閉じる">✕</button></div>' +
      '<div class="xev-hero"><img src="' + esc(E.art) + '" alt="' + esc(E.nm) + '"><div class="xev-petals" aria-hidden="true">' + petals + "</div>" +
      '<span class="xev-rib">期間限定イベント</span>' +
      '<div class="xev-cd"><div><div class="xev-cdt">' + (live ? "終了まで" : "開催期間外") + '</div><div class="xev-cdv" id="xevCd">' + cdHTML(E) + "</div></div>" +
      '<div class="xev-per"><span>' + E.from.slice(5).replace("-", "/") + " 〜 " + E.to.slice(5).replace("-", "/") + "</span></div></div></div>" +
      '<div class="xev-body"><p class="xev-catch">' + esc(E.catch || "") + "</p>" +
      '<div class="xev-prog"><div class="xev-ring"><svg viewBox="0 0 86 86"><defs><linearGradient id="xevGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ff8fc7"/></linearGradient></defs><circle class="bg" cx="43" cy="43" r="' + R + '"/><circle class="fg" cx="43" cy="43" r="' + R + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - got / total)).toFixed(1) + '"/></svg><div class="in"><b>' + got + "</b><small>/ " + total + " 枚</small></div></div>" +
      '<div class="xev-pt"><p>🎫 受け取ったガチャチケット <b>' + got + " / " + total + "枚</b><br>達成したミッション <b>" + doneN + " / " + list.length + "</b></p>" +
      '<button data-ev="claimAll"' + (pend.length ? "" : " disabled") + ">" + (pend.length ? "まとめて受け取る（" + pend.length + "）" : "受け取れるものはありません") + "</button></div></div>" +
      '<div class="xev-road" aria-hidden="true"><div class="ln"><i style="width:' + (got / total * 100).toFixed(1) + '%"></i></div>' +
      nodes.map((n) => '<div class="xev-nd' + "" + ' nd' + (n.ok ? " ok" : "") + '" style="left:' + (n.at / total * 100).toFixed(1) + '%">🎫<span>' + n.at + "</span></div>").join("") + "</div>" +
      '<h3 class="xev-h">イベントの特典</h3><div class="xev-perks">' +
      '<button class="xev-pk" data-ev="go" data-v="MagiLex/MagiLex.html"><span class="xev-i">📚</span><b>MagiLex 系統 XEVA ×' + (E.lexMult || 2) + "</b><small>MagiLex・MagiChemLex で手に入る XEVA がすべて " + (E.lexMult || 2) + "倍</small><em>MagiLex へ →</em></button>" +
      '<button class="xev-pk" data-ev="go" data-v="MagiChemLex/index.html"><span class="xev-i">⚗️</span><b>MagiChemLex 登場</b><small>難関化学の新しい学習アプリ。イベントミッションの対象です</small><em>MagiChemLex へ →</em></button>' +
      '<button class="xev-pk' + (po ? "" : " xev-used") + '" data-ev="partner"><span class="xev-i">💞</span><b>パートナー 1人 ' + Math.round((E.partnerOff || 0.2) * 100) + "%OFF</b><small>" + (po ? "ホームのパートナーを1人、20%引きで開放できます（イベント中1回）" : "このイベントの割引は使いました") + "</small><em>パートナーをえらぶ →</em></button>" +
      '<button class="xev-pk" data-ev="shop"><span class="xev-i">🛍️</span><b>お得なパック</b><small>ショップに ' + esc(E.nm) + " 限定のパックが並びます（期間中のみ）</small><em>ショップへ →</em></button>" +
      "</div>" +
      '<h3 class="xev-h">ログインスタンプ<small>' + Object.keys(days).length + " 日</small></h3><div class=\"xev-stamps\">" + st.join("") + "</div>" +
      '<h3 class="xev-h">イベントミッション<small>🎫ガチャチケット 最大' + total + "枚</small></h3>" +
      '<div class="xev-ms">' + list.map((p) => {
        const m = p.m, pct = Math.round(p.v / p.n * 100);
        const right = p.claimed ? '<span class="xev-done">✓ 受取ずみ</span>'
          : p.done ? '<button class="xev-claim" data-ev="claim" data-v="' + m.id + '">受け取る</button>'
          : (m.href ? '<button class="xev-go" data-ev="go" data-v="' + esc(m.href) + '">行く →</button>' : "");
        return '<div class="xev-m' + (p.done && !p.claimed ? " xev-ok" : "") + (p.claimed ? " xev-got" : "") + '"><span class="xev-i">' + m.ic + '</span><div class="xev-b"><b>' + esc(m.title) + '</b><div class="xev-bar"><i style="width:' + pct + '%"></i></div><div class="xev-v">' + nf(p.v) + " / " + nf(p.n) + "</div></div>" +
          '<div class="xev-rw"><span class="xev-tk">🎫×' + m.tk + "</span>" + right + "</div></div>";
      }).join("") + "</div>" +
      '<p class="xev-note">・🎫ガチャチケットは PREMIUM SELECT・GRAND DEBUT・各フェスのどのガチャでも使えます（1枚＝1回）。<br>・受け取りは XEVARION のアカウントで1回だけです（ほかの端末で受け取ったぶんは受取ずみになります）。<br>・' + esc(E.nm) + " の開催中は、夏の学習キャンペーン（終了）にかわって MagiLex 系統の XEVA が2倍になります。</p>" +
      "</div>";
    card.scrollTop = y;
  }
  function tickCd() {
    const ev = EV(), o = document.getElementById("xevEv");
    if (!ev || !o || !o.classList.contains("on")) { clearInterval(cdTimer); return; }
    const E = ev.def(curId), b = document.getElementById("xevCd");
    if (E && b) b.innerHTML = cdHTML(E);
  }
  function toast(t) {
    const d = document.createElement("div"); d.className = "xev-toast"; d.textContent = t;
    (document.getElementById("xevEv") || document.body).appendChild(d);
    setTimeout(() => d.remove(), 2500);
  }
  /* 受け取ったとき、ボタンから🎫が飛びちる */
  function burst(btn, n) {
    if (!btn) return;
    const r = btn.getBoundingClientRect(), host = document.getElementById("xevEv") || document.body;
    for (let i = 0; i < Math.min(14, 4 + n * 2); i++) {
      const s = document.createElement("span"); s.className = "xev-burst"; s.textContent = i % 3 ? "🎫" : "✨";
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 80;
      s.style.cssText = "left:" + (r.left + r.width / 2) + "px;top:" + (r.top + r.height / 2) + "px;--dx:" + Math.cos(a) * d + "px;--dy:" + (Math.sin(a) * d - 40) + "px;--r:" + (Math.random() * 360 - 180) + "deg";
      host.appendChild(s); setTimeout(() => s.remove(), 1100);
    }
  }
  function claim(mid, btn) {
    const ev = EV(); if (!ev) return;
    const n = ev.claim(curId, mid);
    if (n > 0) burst(btn, n);
    toast(n > 0 ? "🎫ガチャチケット ×" + n + " を受け取りました" : "受取ずみです（ほかの端末で受け取ったぶん）");
    setTimeout(paint, n > 0 ? 350 : 0); try { if (window.HomeMate && HomeMate.refreshBanners) HomeMate.refreshBanners(); } catch (e) {}
  }
  function claimAll(btn) {
    const ev = EV(); if (!ev) return;
    let n = 0;
    ev.list(curId).forEach((p) => { if (p.done && !p.claimed) n += ev.claim(curId, p.m.id); });
    if (n > 0) burst(btn, n);
    toast(n > 0 ? "🎫ガチャチケット ×" + n + " を受け取りました" : "受け取れるものはありません");
    setTimeout(paint, n > 0 ? 350 : 0); try { if (window.HomeMate && HomeMate.refreshBanners) HomeMate.refreshBanners(); } catch (e) {}
  }
  function open(id) {
    const ev = EV(); if (!ev) return;
    curId = id || (ev.cur() && ev.cur().id) || Object.keys(ev.DEFS)[0];
    const o = el();
    paint();
    o.querySelector(".xev-card").scrollTop = 0;
    o.classList.add("on");
    clearInterval(cdTimer); cdTimer = setInterval(tickCd, 1000);
  }
  function close() { const o = document.getElementById("xevEv"); if (o) o.classList.remove("on"); clearInterval(cdTimer); if (location.hash === "#event") try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  function fromHash() { if (location.hash === "#event") setTimeout(() => open(), 400); }
  window.addEventListener("hashchange", fromHash);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fromHash); else fromHash();
  window.XEVAEventUI = { open, close, paint };
})();

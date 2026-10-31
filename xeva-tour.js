/* ============================================================
   XEVARION ガイド（機能紹介）— xeva-tour.js
   ★★ 2026-10-30 ご指定「XEVARION の全ての機能の紹介を動きとアニメーションで見られるように。設定などから見ることもできるように」
   ・全画面のプレイヤー。まん中のスマホの見本の中で、指のタップ・画面の切りかわり・数字の増え方などを動かして各機能を見せる。
   ・章（SCENES）ごとに「見本の画面（html）」と「時間割（tl）」を書くだけ。時間割の命令は下の run() を参照。
   ・自動で次の章へ（一時停止・前後・章の一覧・横スワイプ・キーボード ← → Space Esc）。
   ・入口：設定の「XEVARION について」→「XEVARION ガイド」／index.html#guide／デベロッパーノート。XevaTour.open(章の id) で開く。
   ・Xevion OS の「動きを減らす」（body.xos-nomotion）と OS の prefers-reduced-motion では、動きを短く・自動送りを長めに。
   ============================================================ */
(function () {
  "use strict";
  if (window.XevaTour) return;
  const BASE = (function () {
    try { const s = document.currentScript && document.currentScript.src; if (s) return s.replace(/xeva-tour\.js.*$/, ""); } catch (e) {}
    return "";
  })();
  const A = (p) => BASE + p;
  const fmt = (n) => Math.round(n).toLocaleString("ja-JP");
  const SEEN_KEY = "xeva_tour_seen_v1";

  /* ══════════ 見た目 ══════════ */
  const CSS = `
.xt{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;color:#eef2ff;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",system-ui,sans-serif;
  background:radial-gradient(1100px 700px at 18% 12%,rgba(84,112,255,.36),transparent 60%),radial-gradient(900px 640px at 88% 86%,rgba(178,84,255,.32),transparent 60%),linear-gradient(160deg,#0b1030,#140d33 55%,#0a0f26);
  opacity:0;transition:opacity .35s ease;-webkit-user-select:none;user-select:none;touch-action:pan-y;overscroll-behavior:contain}
.xt.on{opacity:1}
.xt *{box-sizing:border-box}
.xt::before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.55) 1px,transparent 1.4px);background-size:46px 46px;opacity:.08;mask-image:linear-gradient(180deg,#000,transparent 85%)}
.xt-top{position:relative;display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 6px}
.xt-brand{display:flex;align-items:center;gap:8px;font-weight:900;letter-spacing:.14em;font-size:12px;color:#b9c6ff}
.xt-brand img{width:22px;height:22px;border-radius:7px}
.xt-brand b{color:#fff;letter-spacing:.06em;font-size:13px}
.xt-sp{flex:1}
.xt-ib{width:38px;height:38px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;display:grid;place-items:center;cursor:pointer;font:inherit}
.xt-ib svg{width:18px;height:18px}
.xt-ib:active{transform:scale(.94)}
.xt-segs{display:flex;gap:4px;padding:4px 16px 0}
.xt-segs i{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden;cursor:pointer}
.xt-segs i b{display:block;height:100%;width:0;background:linear-gradient(90deg,#7aa2ff,#c48bff);border-radius:3px}
.xt-segs i.done b{width:100%}
.xt-main{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:auto minmax(0,460px);gap:clamp(18px,4vw,64px);align-items:center;justify-content:center;padding:10px 20px}
.xt-phone{--pw:min(33vh,300px);position:relative;width:var(--pw);aspect-ratio:9/19.5;border-radius:calc(var(--pw)*.14);padding:calc(var(--pw)*.035);
  background:linear-gradient(145deg,#2b3157,#151933);box-shadow:0 0 0 1.5px rgba(255,255,255,.14),0 30px 80px rgba(0,0,0,.55),0 0 60px rgba(120,120,255,.25)}
.xt-scr{--u:calc(var(--pw)*.0093);position:relative;width:100%;height:100%;border-radius:calc(var(--pw)*.11);overflow:hidden;background:linear-gradient(180deg,#f3f6ff,#fbfcff);color:#1d2340;font-size:calc(var(--u)*3.5);line-height:1.4}
.xt-scr::after{content:"";position:absolute;left:50%;top:calc(var(--u)*1.6);width:calc(var(--u)*26);height:calc(var(--u)*6.6);margin-left:calc(var(--u)*-13);border-radius:99px;background:#0d0f1c;z-index:50}
.xt-txt{max-width:460px}
.xt-no{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:900;letter-spacing:.18em;color:#9fb2ff;margin-bottom:10px}
.xt-no em{font-style:normal;padding:2px 9px;border-radius:99px;background:rgba(122,162,255,.18);color:#cfdaff;letter-spacing:.06em}
.xt-h{margin:0 0 10px;font-size:clamp(24px,3.4vw,38px);font-weight:900;line-height:1.2;letter-spacing:.01em}
.xt-h span{background:linear-gradient(100deg,#9cb7ff,#d7a6ff 60%,#ffd38a);-webkit-background-clip:text;background-clip:text;color:transparent}
.xt-lead{margin:0 0 14px;font-size:clamp(14px,1.5vw,16px);line-height:1.8;color:#cdd5f4}
.xt-pts{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:7px}
.xt-pts li{position:relative;padding:8px 12px 8px 34px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);font-size:13.5px;line-height:1.6;color:#e7ecff;opacity:0;transform:translateX(14px);transition:opacity .5s ease,transform .5s ease}
.xt-pts li.on{opacity:1;transform:none}
.xt-pts li::before{content:"";position:absolute;left:12px;top:13px;width:12px;height:12px;border-radius:4px;background:linear-gradient(135deg,#7aa2ff,#c48bff);box-shadow:0 0 10px rgba(160,140,255,.7)}
.xt-pts b,.xt-lead b{display:inline;color:#fff;font-weight:900}
.xt-where{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#aab6e6}
.xt-where span{padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#e6ebff;font-weight:700}
.xt-where i{font-style:normal;opacity:.6}
.xt-bot{position:relative;display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 16px calc(14px + env(safe-area-inset-bottom,0px))}
.xt-nav{height:44px;padding:0 18px;border-radius:99px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-weight:800;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.xt-nav.pri{background:linear-gradient(100deg,#5b7cff,#9a62ff);border-color:transparent;box-shadow:0 8px 24px rgba(110,90,255,.45)}
.xt-nav:disabled{opacity:.35;cursor:default}
.xt-nav svg{width:16px;height:16px}
.xt-cnt{min-width:64px;text-align:center;font-size:12px;font-weight:800;color:#aab6e6;font-variant-numeric:tabular-nums}
.xt-list{position:absolute;inset:0;z-index:5;background:rgba(9,12,32,.94);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);overflow:auto;padding:calc(18px + env(safe-area-inset-top,0px)) 18px 30px;opacity:0;pointer-events:none;transition:opacity .25s}
.xt-list.on{opacity:1;pointer-events:auto}
.xt-list h3{margin:0 0 4px;font-size:20px;font-weight:900}
.xt-list p{margin:0 0 14px;font-size:13px;color:#aab6e6}
.xt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;max-width:980px}
.xt-grid button{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font:inherit;text-align:left;cursor:pointer}
.xt-grid button.on{border-color:#9a8cff;box-shadow:0 0 0 2px rgba(154,140,255,.4)}
.xt-grid small{font-size:10.5px;font-weight:900;letter-spacing:.14em;color:#9fb2ff}
.xt-grid b{font-size:14px;font-weight:900;line-height:1.35}
.xt-grid span{font-size:11.5px;color:#aab6e6;line-height:1.5}
.xt-grid button.here{border-color:rgba(255,211,107,.55);background:rgba(255,211,107,.10)}
.xt-here{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:99px;background:#ffd36b;color:#3a2600;font-style:normal;font-size:9.5px;letter-spacing:.04em;vertical-align:1px}
.xt-here-k{color:#ffd36b}
.xt-hint{position:absolute;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);font-size:11px;color:#8d99c9;white-space:nowrap;pointer-events:none}
@media (max-width:820px),(max-aspect-ratio:1/1){
  .xt-main{grid-template-columns:1fr;grid-template-rows:auto auto;justify-items:center;align-content:start;align-content:safe center;gap:12px;padding:6px 16px;overflow:auto}
  .xt-phone{--pw:min(21vh,190px,50vw)}
  .xt-txt{text-align:left;max-width:520px;width:100%}
  .xt-h{font-size:clamp(20px,6vw,28px);margin-bottom:6px}
  .xt-lead{font-size:13px;margin-bottom:8px;line-height:1.6}
  .xt-where{display:none}
  .xt-pts{gap:5px;margin-bottom:8px}
  .xt-pts li{font-size:12.5px;padding:6px 10px 6px 30px}
  .xt-pts li::before{left:10px;top:11px;width:10px;height:10px}
  .xt-hint{display:none}
}
@media (max-height:780px) and (max-aspect-ratio:1/1){ .xt-pts li:nth-child(n+3){display:none} }
@media (max-height:640px) and (max-aspect-ratio:1/1){ .xt-where{display:none} .xt-phone{--pw:min(20vh,170px,46vw)} }
/* ── 見本の画面の部品（m-） ── */
.xt-scr .m{position:absolute;opacity:0;transition:opacity .5s cubic-bezier(.3,.7,.2,1),transform .55s cubic-bezier(.3,.7,.2,1)}
.xt-scr .m[data-a="up"]{transform:translateY(18%)} .xt-scr .m[data-a="down"]{transform:translateY(-18%)}
.xt-scr .m[data-a="left"]{transform:translateX(-30%)} .xt-scr .m[data-a="right"]{transform:translateX(30%)}
.xt-scr .m[data-a="pop"]{transform:scale(.6)} .xt-scr .m[data-a="zoom"]{transform:scale(1.25)}
.xt-scr .m[data-a="sheet"]{transform:translateY(105%);transition-duration:.45s,.55s}
.xt-scr .m[data-a="flip"]{transform:perspective(400px) rotateY(90deg)}
.xt-scr .m.on{opacity:1;transform:none}
.xt-scr .m.off{opacity:0 !important;transition-duration:.35s}
.xt-scr .fill{position:absolute;inset:0}
.m-top{left:0;right:0;top:0;height:calc(var(--u)*17);display:flex;align-items:flex-end;gap:calc(var(--u)*1.8);padding:0 calc(var(--u)*4) calc(var(--u)*2);background:linear-gradient(180deg,#fff,rgba(255,255,255,.7));z-index:20}
.m-av{width:calc(var(--u)*8);height:calc(var(--u)*8);border-radius:50%;overflow:hidden;box-shadow:0 0 0 calc(var(--u)*.6) #ffd25a}
.m-av img,.m-ic img,.m-c img{width:100%;height:100%;object-fit:cover;display:block}
.m-pill{display:flex;align-items:center;gap:calc(var(--u)*1);height:calc(var(--u)*6.4);padding:0 calc(var(--u)*2.4) 0 calc(var(--u)*1);border-radius:99px;background:#eef2ff;font-weight:900;font-size:.82em;color:#2a3366;font-variant-numeric:tabular-nums}
.m-pill img{width:calc(var(--u)*5);height:calc(var(--u)*5);object-fit:contain}
.m-pill.g{background:#ecfbff}
.m-tabs{left:0;right:0;bottom:0;height:calc(var(--u)*16);display:flex;justify-content:space-around;align-items:flex-start;padding-top:calc(var(--u)*2.2);background:#fff;box-shadow:0 calc(var(--u)*-1) calc(var(--u)*4) rgba(40,60,140,.08);z-index:20}
.m-tabs i{display:flex;flex-direction:column;align-items:center;gap:calc(var(--u)*.6);font-style:normal;color:#9aa5c8;width:20%}
.m-tabs i svg{width:calc(var(--u)*6.4);height:calc(var(--u)*6.4)}
.m-tabs i b{font-size:.62em;font-weight:800}
.m-tabs i.on{color:#4b63ff}
.m-tabs i.on svg{filter:drop-shadow(0 0 calc(var(--u)*1.2) rgba(75,99,255,.45))}
.m-card{background:#fff;border-radius:calc(var(--u)*4);box-shadow:0 calc(var(--u)*1) calc(var(--u)*4) rgba(40,60,140,.1)}
.m-ic{position:absolute;width:calc(var(--u)*15);height:calc(var(--u)*15);border-radius:calc(var(--u)*4);overflow:hidden;box-shadow:0 calc(var(--u)*.8) calc(var(--u)*2.6) rgba(30,40,100,.25)}
.m-ic.new::after{content:"NEW";position:absolute;right:0;top:0;padding:0 calc(var(--u)*1);font-size:.5em;font-weight:900;background:#ff3d6e;color:#fff;border-bottom-left-radius:calc(var(--u)*2)}
.m-lab{position:absolute;font-size:.56em;font-weight:800;color:#3a4270;text-align:center;width:calc(var(--u)*19);margin-left:calc(var(--u)*-2)}
.m-btn{display:flex;align-items:center;justify-content:center;border-radius:99px;font-weight:900;color:#fff;background:linear-gradient(100deg,#ff5a8a,#ff9a3c);box-shadow:0 calc(var(--u)*1) 0 #c4366a}
.m-btn.b{background:linear-gradient(100deg,#4b63ff,#8a5cff);box-shadow:0 calc(var(--u)*1) 0 #3341b8}
.m-btn.g{background:linear-gradient(100deg,#16c79a,#38a6ff);box-shadow:0 calc(var(--u)*1) 0 #0f8f6f}
.m-h{font-weight:900;font-size:1.05em;color:#1d2340}
.m-s{font-size:.7em;color:#6b75a0;font-weight:700}
.m-bar{position:relative;height:calc(var(--u)*2.2);border-radius:99px;background:#e6eaf7;overflow:hidden}
.m-bar b{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99px;background:linear-gradient(90deg,#4b63ff,#9a62ff);transition:width 1.2s cubic-bezier(.3,.7,.2,1)}
.m-bubble{padding:calc(var(--u)*2) calc(var(--u)*3);border-radius:calc(var(--u)*3.4);background:#fff;font-weight:800;font-size:.8em;color:#3a4270;box-shadow:0 calc(var(--u)*1) calc(var(--u)*3) rgba(40,60,140,.18)}
.m-toast{left:8%;right:8%;padding:calc(var(--u)*2.6);border-radius:calc(var(--u)*3);background:rgba(20,26,60,.92);color:#fff;font-weight:800;font-size:.78em;text-align:center;z-index:30}
.m-sheet{left:0;right:0;bottom:0;border-radius:calc(var(--u)*6) calc(var(--u)*6) 0 0;background:#fff;box-shadow:0 calc(var(--u)*-2) calc(var(--u)*8) rgba(20,30,80,.25);z-index:25;padding:calc(var(--u)*5) calc(var(--u)*5) calc(var(--u)*6)}
.m-dim{inset:0;background:rgba(10,14,40,.45);z-index:24}
.m-chip{display:inline-block;padding:calc(var(--u)*.6) calc(var(--u)*2.2);border-radius:99px;font-size:.6em;font-weight:900;background:#eef2ff;color:#4b63ff}
.m-ban{border-radius:calc(var(--u)*3.4);overflow:hidden;box-shadow:0 calc(var(--u)*1) calc(var(--u)*3) rgba(30,40,100,.2)}
.m-ban img{width:100%;display:block}
.m-c{position:absolute;width:calc(var(--u)*17);height:calc(var(--u)*17);border-radius:calc(var(--u)*3.4);overflow:hidden;background:#dfe5ff;box-shadow:0 calc(var(--u)*.6) calc(var(--u)*2) rgba(30,40,100,.2)}
.m-c.ur{box-shadow:0 0 0 calc(var(--u)*.7) #fff,0 0 0 calc(var(--u)*1.4) #ff6ad5,0 0 calc(var(--u)*4) #b06bff}
.m-c.ssr{box-shadow:0 0 0 calc(var(--u)*.7) #fff,0 0 0 calc(var(--u)*1.4) #ffc23a}
.m-x{font-weight:900;font-variant-numeric:tabular-nums}
.m-glow{animation:xtGlow 1.4s ease-in-out infinite}
@keyframes xtGlow{0%,100%{filter:drop-shadow(0 0 0 rgba(255,214,90,0))}50%{filter:drop-shadow(0 0 calc(var(--u)*3) rgba(255,214,90,.95))}}
.m-shine{position:relative;overflow:hidden}
.m-shine::after{content:"";position:absolute;top:-30%;bottom:-30%;width:35%;left:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:xtShine 2.2s ease-in-out infinite}
@keyframes xtShine{0%{transform:translateX(-160%) skewX(-18deg)}70%,100%{transform:translateX(420%) skewX(-18deg)}}
.m-spin{animation:xtSpin 6s linear infinite}
@keyframes xtSpin{to{transform:rotate(360deg)}}
.m-float{animation:xtFloat 3s ease-in-out infinite}
@keyframes xtFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--u)*-1.6))}}
.m-pulse{animation:xtPulse 1.1s ease-in-out infinite}
@keyframes xtPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.m-shake{animation:xtShake .45s ease}
@keyframes xtShake{0%,100%{transform:none}25%{transform:translateX(calc(var(--u)*-1.2))}75%{transform:translateX(calc(var(--u)*1.2))}}
.m-stamp{animation:xtStamp .45s cubic-bezier(.3,1.6,.4,1) both}
@keyframes xtStamp{0%{transform:scale(2.2) rotate(-14deg);opacity:0}100%{transform:scale(1) rotate(-8deg);opacity:1}}
.m-beam{position:absolute;left:30%;right:30%;top:-10%;bottom:-10%;background:linear-gradient(180deg,transparent,rgba(255,255,255,.95),transparent);filter:blur(calc(var(--u)*2));animation:xtBeam 1.4s ease-out both}
@keyframes xtBeam{0%{transform:scaleX(.1);opacity:0}30%{opacity:1}100%{transform:scaleX(2.6);opacity:0}}
.m-ring{position:absolute;border-radius:50%;border:calc(var(--u)*.8) solid rgba(255,220,120,.9);animation:xtRing 1.6s ease-out infinite}
@keyframes xtRing{0%{transform:scale(.3);opacity:1}100%{transform:scale(1.7);opacity:0}}
.xt-finger{position:absolute;z-index:60;width:calc(var(--u)*11);height:calc(var(--u)*11);margin:calc(var(--u)*-5.5) 0 0 calc(var(--u)*-5.5);border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.95) 0 34%,rgba(120,140,255,.55) 35% 60%,rgba(120,140,255,0) 62%);box-shadow:0 0 0 calc(var(--u)*.5) rgba(255,255,255,.9),0 calc(var(--u)*1) calc(var(--u)*3) rgba(20,30,90,.35);
  opacity:0;transition:left .45s cubic-bezier(.4,.1,.2,1),top .45s cubic-bezier(.4,.1,.2,1),opacity .3s,transform .15s;pointer-events:none}
.xt-finger.on{opacity:1}
.xt-finger.press{transform:scale(.78)}
.xt-finger.drag{transition:opacity .3s,transform .15s}
.xt-rip{position:absolute;z-index:59;width:calc(var(--u)*6);height:calc(var(--u)*6);margin:calc(var(--u)*-3) 0 0 calc(var(--u)*-3);border-radius:50%;border:calc(var(--u)*.7) solid rgba(90,110,255,.8);animation:xtRip .6s ease-out forwards;pointer-events:none}
@keyframes xtRip{0%{transform:scale(.4);opacity:1}100%{transform:scale(3.2);opacity:0}}
.xt.paused *,.xt.paused *::before,.xt.paused *::after{animation-play-state:paused !important}
/* ★★ 2026-10-31 ご報告「ガイドで（章の一覧から）すべてを見るを押すと、背景にスマホの画面が残っていて変」
   真因：見本の画面の中の部品（上のバー・下のタブ・指・ノッチ＝z-index 20〜60）が、一覧の板（z-index 5）より手前に描かれていた。
   → 見本の画面をひとつの重なりの中に閉じこめ（isolation）、一覧の板はいちばん手前に。開いているあいだは見本ごと隠す。 */
.xt-main,.xt-phone,.xt-scr{isolation:isolate}
.xt-list{z-index:300}
.xt.listing .xt-main,.xt.listing .xt-segs,.xt.listing .xt-bot,.xt.listing .xt-hint{visibility:hidden}
body.xos-nomotion .xt *{animation-duration:.01s !important;animation-iteration-count:1 !important}
`;

  /* ══════════ 小さな絵（アイコン） ══════════ */
  const SV = (d, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + ">" + d + "</svg>";
  const IC = {
    chars: SV('<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    gacha: SV('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>'),
    home: SV('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
    com: SV('<circle cx="8.5" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.4"/><path d="M3.5 19c.6-3 2.6-4.6 5-4.6s4.4 1.6 5 4.6M14 18.5c.4-2.2 1.6-3.4 3.2-3.4 1.7 0 2.9 1.2 3.3 3.4"/>'),
    set: SV('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7"/>'),
    play: SV('<path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none"/>'),
    pause: SV('<path d="M8 5v14M16 5v14"/>'),
    prev: SV('<path d="M15 5l-7 7 7 7"/>'),
    next: SV('<path d="M9 5l7 7-7 7"/>'),
    list: SV('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    close: SV('<path d="M6 6l12 12M18 6L6 18"/>'),
    replay: SV('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.4h4.4"/>'),
    wifi: SV('<path d="M4 8.4a12 12 0 0116 0"/><path d="M7 12a8 8 0 0110 0"/><path d="M10 15.4a3.6 3.6 0 014 0"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/>'),
    cloud: SV('<path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 18z"/>'),
    plane: SV('<path d="M10.5 21l1.5-6 7.5-3-7.5-3-1.5-6-2 6.5L2.5 12 8.5 14.5z"/>'),
    mail: SV('<rect x="3.5" y="5.5" width="17" height="13" rx="2.4"/><path d="M4 7l8 6 8-6"/>'),
    cal: SV('<rect x="3.5" y="5" width="17" height="15" rx="2.4"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
    shop: SV('<path d="M4 9h16l-1.2 10.5H5.2z"/><path d="M8.5 9V7a3.5 3.5 0 017 0v2"/>'),
    star: SV('<path d="M12 3l2.6 5.6 6 .7-4.5 4 1.3 6L12 16.4 6.6 19.3l1.3-6-4.5-4 6-.7z" fill="currentColor" stroke="none"/>'),
  };
  /* 見本の部品 */
  const top = (x, g) => '<div class="m on m-top"><span class="m-av"><img src="' + A("img/t_Haru.webp") + '" alt=""></span><span style="flex:1"></span>' +
    '<span class="m-pill x"><img src="' + A("XEVA.png") + '" alt=""><b class="m-x xn">' + fmt(x == null ? 1284500 : x) + "</b></span>" +
    '<span class="m-pill g"><img src="' + A("gem.png") + '" alt=""><b class="m-x gn">' + fmt(g == null ? 128 : g) + "</b></span></div>";
  const tabs = (on) => '<div class="m on m-tabs">' + [["chars", "図鑑"], ["gacha", "ガチャ"], ["home", "ホーム"], ["com", "コミュニティ"], ["set", "設定"]]
    .map(([k, n]) => '<i class="' + (k === on ? "on" : "") + '" data-k="' + k + '">' + IC[k] + "<b>" + n + "</b></i>").join("") + "</div>";
  const icon = (f, x, y, cls, a, extra) => '<span class="m m-ic ' + (cls || "") + '" data-a="' + (a || "pop") + '" style="left:' + x + "%;top:" + y + "%" + (extra || "") + '"><img src="' + A("thumbs/" + f) + '" alt=""></span>';
  const at = (x, y, w, h) => "left:" + x + "%;top:" + y + "%" + (w != null ? ";width:" + w + "%" : "") + (h != null ? ";height:" + h + "%" : "");

  /* ══════════ 章（SCENES） ══════════
     tl の命令： ["show", sel] ／ ["hide", sel] ／ ["add", sel, cls] ／ ["rm", sel, cls] ／ ["tap", x%, y%] ／ ["drag", x1, y1, x2, y2, ms]
                ["count", sel, from, to, ms] ／ ["type", sel, 文字, ms] ／ ["bar", sel, 幅%] ／ ["finger", false]（指を消す）／ ["pt", n]（説明の n 番目を出す）
     時間はミリ秒（章のはじまりから）。dur のあと少し待って次の章へ。 */
  const SCENES = [
    {
      id: "intro", g: "はじめに", t: "ようこそ、<span>XEVARION</span> へ",
      lead: "XEVARION は、ひとつのアカウントで 27本のアプリと共通のキャラ・ガチャ・XEVA がつながるポータルです。このガイドでは、すべての機能を動きで紹介します。",
      pts: ["<b>学ぶ・あそぶ・みんなで囲む・つながる</b>アプリがひとつのホームに", "キャラクター・ガチャ・<b>XEVA</b>・<b>ジェム</b>はどのアプリでも共通", "記録は<b>自動で同期</b>。オフラインでも多くのアプリが動きます"],
      where: ["ホーム"], dur: 7600,
      html: '<div class="m fill" data-a="zoom" id="i-bg" style="background:radial-gradient(circle at 50% 38%,#e8edff,#f6f3ff 55%,#fff)"></div>' +
        '<div class="m m-spin" data-a="pop" id="i-orb" style="' + at(18, 18, 64) + ';aspect-ratio:1;border-radius:50%;background:conic-gradient(from 0deg,#5b7cff,#9a62ff,#ff7ac3,#ffd36b,#5b7cff);filter:blur(calc(var(--u)*5));opacity:.5"></div>' +
        '<img class="m" data-a="pop" id="i-logo" src="' + A("brand-xevarion-orb.png") + '" alt="" style="' + at(30, 22, 40) + '">' +
        '<img class="m" data-a="up" id="i-word" src="' + A("brand-xevarion-wordmark-dark.png") + '" alt="" style="' + at(14, 47, 72) + '">' +
        ["MagiLex.jpg", "MagiBattle.jpg?v=4", "MagiBurst.jpg", "MagiAbyss.jpg?v=2", "MagiChemLex.jpg?v=2", "MagiDerby.jpg", "MagiShift.jpg", "MagiChainParty.jpg?v=2"]
          .map((f, i) => icon(f, 8 + (i % 4) * 22, 62 + Math.floor(i / 4) * 13, "ii ii" + i, "up")).join("") +
        '<div class="m" data-a="up" id="i-4" style="' + at(6, 90, 88) + ';display:flex;gap:2%;justify-content:center">' +
        ["NGX_s", "MagicalFuture_s", "ISHIDA_s", "YRA_s"].map((b) => '<img src="' + A("brand/" + b + ".webp") + '" alt="" style="width:23%;border-radius:calc(var(--u)*1.6);background:#fff">').join("") + "</div>",
      tl: [[0, "show", "#i-bg"], [200, "show", "#i-orb"], [500, "show", "#i-logo"], [900, "show", "#i-word"], [900, "pt", 0],
        [1500, "show", ".ii0"], [1600, "show", ".ii1"], [1700, "show", ".ii2"], [1800, "show", ".ii3"], [1900, "show", ".ii4"], [2000, "show", ".ii5"], [2100, "show", ".ii6"], [2200, "show", ".ii7"],
        [2600, "pt", 1], [3200, "show", "#i-4"], [4200, "pt", 2], [4400, "add", "#i-logo", "m-float"]],
    },
    {
      id: "home", g: "ホーム", t: "ホームと<span>ロビー</span>",
      lead: "ホームには、えらんだパートナーが立つロビー・よく使うアプリのボタン・開催中のガチャやイベントのバナーが並びます。上のバーにはいつでも XEVA とジェム。",
      pts: ["<b>パートナー</b>をタップすると話しかけてくれる（表情・全身・アップ）", "完凸したキャラは<b>ロビー</b>に立たせられる（動く立ち絵）", "左上のバナーは<b>開催中のガチャとイベント</b>を順番に表示"],
      where: ["ホーム", "ロビー", "パートナー"], dur: 8400,
      html: top() + '<div class="m fill" data-a="zoom" style="top:0;background:url(' + A("home-mate/lobby/park.webp") + ') center/cover"></div>' +
        '<img class="m m-float" data-a="up" id="h-mate" src="' + A("home-mate/lobby/haru.webp") + '" alt="" style="' + at(20, 26, 60) + ';filter:drop-shadow(0 calc(var(--u)*2) calc(var(--u)*3) rgba(0,0,0,.25))">' +
        '<div class="m m-ban" data-a="left" id="h-ban" style="' + at(4, 19, 44) + '"><img id="h-banimg" src="' + A("MagiBurst/img/bn_fes21_s.webp") + '" alt=""></div>' +
        '<div class="m m-bubble" data-a="pop" id="h-say" style="' + at(46, 32, 48) + '">おかえり！ きょうも いっしょに がんばろうね</div>' +
        '<div class="m m-card" data-a="up" id="h-lobby" style="' + at(4, 66, 92) + ';padding:calc(var(--u)*2.4);display:grid;grid-template-columns:repeat(5,1fr);gap:calc(var(--u)*1.6);z-index:15">' +
        ["MagiBattle.jpg?v=4", "MagiAbyss.jpg?v=2", "MagiDerby.jpg", "MagiShift.jpg", "MagiChainParty.jpg?v=2", "MagiLex.jpg", "MagiBurst.jpg", "MagiQuiz.jpg", "MagiScope.jpg", "MagiLink.jpg"]
          .map((f) => '<img src="' + A("thumbs/" + f) + '" alt="" style="width:100%;aspect-ratio:1;border-radius:calc(var(--u)*2.6);box-shadow:0 calc(var(--u)*.6) calc(var(--u)*1.6) rgba(30,40,100,.2)">').join("") + "</div>" + tabs("home"),
      tl: [[0, "show", ".fill"], [300, "show", "#h-mate"], [700, "show", "#h-ban"], [700, "pt", 0], [1500, "tap", 50, 45], [2000, "show", "#h-say"], [2800, "pt", 1],
        [3200, "show", "#h-lobby"], [4300, "pt", 2], [4400, "tap", 26, 25], [4900, "add", "#h-ban", "m-shake"], [5000, "src", "#h-banimg", "MagiBurst/img/bn_fes20_s.webp"],
        [6200, "src", "#h-banimg", "MagiBurst/img/bn_fes18_s.webp"], [6600, "tap", 14, 73]],
    },
    {
      id: "apps", g: "ホーム", t: "すべての<span>アプリ</span>",
      lead: "メニューを開くと、XEVARION のアプリが種類ごとに並びます。名前やひらがなで探せて、並べかえも自由。新しいアプリには NEW の印が付きます。",
      pts: ["<b>ゲーム・学習・つながる・情報・店舗</b>の札で絞りこみ", "「ばとる」のように<b>ひらがなで検索</b>できる", "電波が無いときは、<b>オフラインで使えるアプリ</b>だけ押せる"],
      where: ["ホーム", "メニュー（すべてのアプリ）"], dur: 8200,
      html: top() + '<div class="m fill on" style="top:0;background:#f4f6ff"></div>' +
        '<div class="m m-card" data-a="down" id="a-sr" style="' + at(5, 19, 90, 6.4) + ';display:flex;align-items:center;padding:0 calc(var(--u)*3);gap:calc(var(--u)*2);color:#8a93b8;font-weight:800;font-size:.8em"><span>🔍</span><span id="a-q" style="color:#1d2340"></span><span id="a-ph">アプリをさがす</span></div>' +
        '<div class="m" data-a="up" id="a-cats" style="' + at(5, 27.5, 90) + ';display:flex;gap:calc(var(--u)*1.4)">' + ["すべて", "ゲーム", "学習", "つながる", "情報"].map((n, i) => '<span class="m-chip" style="' + (i === 0 ? "background:#4b63ff;color:#fff" : "") + '">' + n + "</span>").join("") + "</div>" +
        ["MagiBattle.jpg?v=4", "MagiLex.jpg", "MagiChemLex.jpg?v=2", "MagiBurst.jpg", "MagiQuiz.jpg", "MagiLink.jpg", "MagiChainParty.jpg?v=2", "MagiDominionGrid.jpg", "MagiBocciaRush.jpg", "MagiRail.jpg", "MagiShift.jpg", "MagiAbyss.jpg?v=2", "MagiDerby.jpg", "MagiScope.jpg", "MagiRanking.jpg", "MagiCraft.jpg"]
          .map((f, i) => icon(f, 6 + (i % 4) * 23, 33 + Math.floor(i / 4) * 12.5, "ap ap" + i + (i === 0 || i === 11 ? " new" : ""), "pop")).join("") +
        '<div class="m m-toast" data-a="up" id="a-t" style="bottom:20%">MagiBattle が見つかりました</div>' + tabs("home"),
      tl: [[0, "show", "#a-sr"], [300, "show", "#a-cats"], [500, "pt", 0]].concat([...Array(16)].map((_, i) => [600 + i * 70, "show", ".ap" + i]))
        .concat([[2300, "pt", 1], [2500, "tap", 50, 22], [3000, "hide", "#a-ph"], [3000, "type", "#a-q", "ばとる", 900],
          [4100, "hide", ".ap1,.ap2,.ap3,.ap4,.ap5,.ap6,.ap7,.ap8,.ap9,.ap10,.ap11,.ap12,.ap13,.ap14,.ap15"], [4300, "add", ".ap0", "m-pulse"], [4500, "show", "#a-t"],
          [5600, "pt", 2], [5800, "tap", 17, 38]]),
    },
    {
      id: "gacha", g: "ガチャ", t: "<span>ガチャ</span>と召喚の演出",
      lead: "ガチャは XEVARION の全アプリ共通。フェスや UR のガチャから 1回・10連で引けて、光の柱と召喚陣から1体ずつ登場します。10連は最後の1枠が SSR 以上確定。",
      pts: ["開催中のガチャが<b>一覧</b>に並び、提供割合・詳細もすぐ見られる", "<b>10連も1体ずつめくる</b>演出・確定演出・UR は縦長の絵で登場", "引いたキャラは<b>どのアプリでも</b>使える（凸も共通）"],
      where: ["下バー", "ガチャ"], dur: 9000,
      html: top() + '<div class="m fill on" style="top:0;background:linear-gradient(180deg,#eef1ff,#fff)"></div>' +
        '<div class="m m-ban" data-a="up" id="g-b1" style="' + at(5, 19, 90) + '"><img src="' + A("MagiBurst/img/bn_fes21_s.webp") + '" alt=""></div>' +
        '<div class="m m-ban" data-a="up" id="g-b2" style="' + at(5, 45, 90) + '"><img src="' + A("MagiBurst/img/bn_fes20_s.webp") + '" alt=""></div>' +
        '<div class="m m-btn b" data-a="up" id="g-10" style="' + at(18, 71, 64, 7) + ';font-size:.95em">10連を引く</div>' +
        '<div class="m fill" data-a="fade" id="g-sky" style="z-index:30;background:radial-gradient(circle at 50% 55%,#4a2fa8,#160d3a 70%)"></div>' +
        '<div class="m" data-a="pop" id="g-circ" style="' + at(15, 44, 70) + ';aspect-ratio:1;z-index:31;border-radius:50%;border:calc(var(--u)*.8) solid rgba(255,214,120,.95);box-shadow:0 0 calc(var(--u)*6) rgba(255,214,120,.8),inset 0 0 calc(var(--u)*6) rgba(255,214,120,.6)"></div>' +
        '<div class="m" data-a="fade" id="g-beam" style="inset:0;z-index:32"><i class="m-beam"></i></div>' +
        ["Haru", "Takina", "Hisako", "Chika", "Kohaku", "Yuna", "Alice", "Aina", "Suzu", "Ichika"]
          .map((c, i) => '<span class="m m-c gc gc' + i + (i === 0 || i === 3 ? " ur" : i < 6 ? " ssr" : "") + '" data-a="flip" style="z-index:33;left:' + (7 + (i % 5) * 17.6) + "%;top:" + (32 + Math.floor(i / 5) * 19) + '%;width:calc(var(--u)*15);height:calc(var(--u)*15)"><img src="' + A("img/t_" + c + ".webp") + '" alt=""></span>').join("") +
        '<img class="m" data-a="zoom" id="g-ss" src="' + A("MagiBurst/img/ss/HaruSS.webp") + '" alt="" style="' + at(12, 12, 76) + ';z-index:34;border-radius:calc(var(--u)*3);box-shadow:0 0 calc(var(--u)*8) #ff7ad9">' +
        '<div class="m" data-a="pop" id="g-ur" style="' + at(20, 70, 60) + ';z-index:35;text-align:center;font-weight:900;font-size:1.6em;letter-spacing:.1em;color:#fff;text-shadow:0 0 calc(var(--u)*3) #ff5ad0">UR ハル</div>' + tabs("gacha"),
      tl: [[0, "show", "#g-b1"], [250, "show", "#g-b2"], [500, "pt", 0], [700, "show", "#g-10"], [1500, "tap", 50, 74.5], [2000, "show", "#g-sky"], [2100, "finger", false], [2200, "show", "#g-circ"], [2200, "add", "#g-circ", "m-spin"],
        [2500, "pt", 1], [2900, "show", "#g-beam"], [3500, "hide", "#g-circ,#g-beam"], [3600, "show", "#g-ss"], [3800, "show", "#g-ur"], [5300, "hide", "#g-ss,#g-ur"]]
        .concat([...Array(10)].map((_, i) => [5500 + i * 120, "show", ".gc" + i])).concat([[6500, "pt", 2], [6800, "add", ".gc0,.gc3", "m-glow"]]),
    },
    {
      id: "seal", g: "ガチャ", t: "<span>★星煌印</span>とチケット",
      lead: "ガチャを1回引くごとに ★星煌印（天井）が全ガチャ共通でたまり、100個で好きなガチャの好きなキャラ1体と交換できます。チケットや券でもお得に引けます。",
      pts: ["<b>★星煌印 100個</b>で好きなキャラ1体（ショップの「★星煌印 交換所」）", "<b>🎫ガチャチケット・フェスチケット</b>・<b>10連半額券</b>（💎25）", "<b>選べるSSRキャラ確定チケット</b>・セレクト券は一覧のいちばん上から"],
      where: ["ガチャ", "ショップ", "★星煌印 交換所"], dur: 8200,
      html: top() + '<div class="m fill on" style="top:0;background:linear-gradient(180deg,#fff8e6,#fff)"></div>' +
        '<div class="m m-card" data-a="up" id="s-seal" style="' + at(6, 20, 88) + ';padding:calc(var(--u)*4);display:flex;align-items:center;gap:calc(var(--u)*3)"><img src="' + A("img/seal_s.webp") + '" alt="" style="width:22%" class="m-glow"><div style="flex:1"><div class="m-s">★星煌印（全ガチャ共通）</div><div class="m-h"><b class="m-x" id="s-n">86</b> <small style="font-size:.6em;color:#8a93b8">/ 100</small></div><div class="m-bar" style="margin-top:calc(var(--u)*1.6)"><b id="s-bar" style="width:86%"></b></div></div></div>' +
        '<div class="m m-btn" data-a="up" id="s-go" style="' + at(14, 41, 72, 7) + '">交換所でキャラと交換</div>' +
        '<div class="m m-dim" data-a="fade" id="s-dim"></div>' +
        '<div class="m m-sheet" data-a="sheet" id="s-sheet"><div class="m-h" style="margin-bottom:calc(var(--u)*3)">★星煌印 交換所</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:calc(var(--u)*2)">' + ["Haru", "Chika", "Hisako", "Alice", "Kohaku", "Yuna", "Takina", "Aina"].map((c, i) => '<span class="sc sc' + i + '" style="position:relative;aspect-ratio:1;border-radius:calc(var(--u)*2.6);overflow:hidden;box-shadow:0 0 0 calc(var(--u)*.5) ' + (i === 1 ? "#ff6ad5" : "#e3e7f7") + '"><img src="' + A("img/t_" + c + ".webp") + '" alt="" style="width:100%;height:100%;object-fit:cover"></span>').join("") + "</div>" +
        '<div class="m-btn b" id="s-ok" style="margin-top:calc(var(--u)*4);height:calc(var(--u)*9)">★100 でチカと交換</div></div>' +
        '<div class="m" data-a="up" id="s-tk" style="' + at(6, 52, 88) + ';display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--u)*2.4)">' +
        '<div class="m-card" style="padding:calc(var(--u)*3);text-align:center"><div style="font-size:1.8em">🎫</div><div class="m-s">ガチャチケット</div><b class="m-x">×24</b></div>' +
        '<div class="m-card m-shine" style="padding:calc(var(--u)*3);text-align:center;background:linear-gradient(120deg,#ffe1e6,#ffd6b8)"><div style="font-size:1.8em">🧧</div><div class="m-s">10連半額券</div><b class="m-x">×3</b></div></div>' + tabs("gacha"),
      tl: [[0, "show", "#s-seal"], [400, "pt", 0], [900, "count", "#s-n", 86, 100, 1400], [900, "bar", "#s-bar", 100], [2400, "add", "#s-seal", "m-pulse"], [2600, "show", "#s-go"], [3300, "tap", 50, 44.5],
        [3800, "show", "#s-dim"], [3800, "show", "#s-sheet"], [4300, "tap", 39, 76], [4800, "tap", 50, 89], [5300, "hide", "#s-sheet,#s-dim"], [5300, "rm", "#s-seal", "m-pulse"], [5300, "count", "#s-n", 100, 0, 500], [5300, "bar", "#s-bar", 0],
        [5700, "pt", 1], [5900, "show", "#s-tk"], [7000, "pt", 2]],
    },
    {
      id: "chars", g: "図鑑", t: "<span>図鑑</span>とキャラクター詳細",
      lead: "図鑑には XEVARION のすべてのキャラクター。押すと、アプリごとの性能（MagiBurst・MagiAbyss・MagiBattle…）や SS 絵が見られ、好きなキャラをアイコンにできます。",
      pts: ["属性（<b>火・水・木・光・闇</b>）・入手先・持っているかで絞りこみ", "キャラ詳細は<b>アプリごとの性能</b>を切りかえて表示", "<b>アイコンに設定</b>・XEVA のコレクションにも記録"],
      where: ["下バー", "図鑑", "キャラ詳細"], dur: 8000,
      html: top() + '<div class="m fill on" style="top:0;background:#f4f6ff"></div>' +
        ["Haru", "Chika", "Hisako", "Alice", "Kohaku", "Suzu", "Shouko", "Yuna", "Aina", "Ichika", "Nonoka", "Chie", "Takina", "Haru", "Chika", "Hisako"]
          .map((c, i) => '<span class="m m-c cc cc' + i + (i < 12 ? " ur" : " ssr") + '" data-a="pop" style="left:' + (5 + (i % 4) * 23) + "%;top:" + (19 + Math.floor(i / 4) * 17) + '%;width:calc(var(--u)*20);height:calc(var(--u)*20)"><img src="' + A("img/t_" + c + ".webp") + '" alt=""></span>').join("") +
        '<div class="m fill" data-a="right" id="c-det" style="top:0;z-index:22;background:linear-gradient(180deg,#e9f3ff,#fff)">' +
        '<img src="' + A("img/Hisako.webp") + '" alt="" style="position:absolute;left:8%;top:12%;width:84%;border-radius:calc(var(--u)*4)">' +
        '<div style="position:absolute;left:6%;right:6%;top:58%"><div class="m-h" style="font-size:1.3em">ヒサコ <span class="m-chip" style="background:#e3f1ff;color:#2a7bd8">水</span> <span class="m-chip" style="background:#ffe6fb;color:#c43ab0">UR</span></div>' +
        '<div style="display:flex;gap:calc(var(--u)*1.4);margin:calc(var(--u)*2.4) 0"><span class="m-chip ct ct0" style="background:#4b63ff;color:#fff">MagiAbyss</span><span class="m-chip ct ct1">MagiBattle</span><span class="m-chip ct ct2">SS絵</span></div>' +
        '<div class="m-card" style="padding:calc(var(--u)*3)"><div class="m-s" id="c-k">攻撃・ドット絵・必殺技</div><div class="m-bar" style="margin:calc(var(--u)*1.6) 0"><b id="c-b1"></b></div><div class="m-bar"><b id="c-b2" style="background:linear-gradient(90deg,#16c79a,#38a6ff)"></b></div></div>' +
        '<div class="m-btn g" id="c-ic" style="margin-top:calc(var(--u)*3);height:calc(var(--u)*8.4)">アイコンに設定</div></div></div>' +
        '<div class="m m-toast" data-a="up" id="c-t" style="bottom:20%">アイコンをヒサコにしました</div>' + tabs("chars"),
      tl: [[0, "pt", 0]].concat([...Array(16)].map((_, i) => [200 + i * 60, "show", ".cc" + i]))
        .concat([[1800, "tap", 38, 27], [2300, "show", "#c-det"], [2500, "pt", 1], [2900, "bar", "#c-b1", 92], [2900, "bar", "#c-b2", 70], [3800, "tap", 46, 64.5], [4100, "rm", ".ct0", "on"], [4100, "css", ".ct0", "background:#eef2ff;color:#4b63ff"],
          [4100, "css", ".ct1", "background:#4b63ff;color:#fff"], [4100, "text", "#c-k", "武器・バースト・スキル（部隊シューティング）"], [4200, "bar", "#c-b1", 64], [4200, "bar", "#c-b2", 96],
          [5300, "pt", 2], [5600, "tap", 50, 82], [6100, "show", "#c-t"]]),
    },
    {
      id: "missions", g: "ミッション", t: "XEVA ミッションと<span>毎月のビンゴ</span>",
      lead: "毎日・毎週のミッションをこなすと XEVA。毎月1日に新しい 5×5 のビンゴカードが配られ、アプリで遊ぶとマスが自動でひらきます。",
      pts: ["<b>まとめて受け取る</b>で、達成したミッションのごほうびを一度に", "ビンゴは<b>ライン・3ライン・6ライン・コンプリート</b>でごほうび", "XEVA・ジェム・チケット・★星煌印・10連半額券がもらえる"],
      where: ["ホーム", "XEVA ミッション", "ビンゴ"], dur: 8600,
      html: top(1284500) + '<div class="m fill on" style="top:0;background:linear-gradient(180deg,#eefbf6,#fff)"></div>' +
        [["ログインする", 100], ["ガチャを1回引く", 100], ["MagiLex で10問とく", 70]].map(([n, p], i) =>
          '<div class="m m-card mi mi' + i + '" data-a="left" style="' + at(5, 19 + i * 10.5, 90, 8.6) + ';display:flex;align-items:center;gap:calc(var(--u)*2.4);padding:0 calc(var(--u)*3)"><div style="flex:1"><div style="font-weight:800;font-size:.8em">' + n + '</div><div class="m-bar"><b class="mb' + i + '"></b></div></div><span class="m-chip" style="background:' + (p === 100 ? "#16c79a;color:#fff" : "#eef2ff") + '">+' + (1000 + i * 500) + "</span></div>").join("") +
        '<div class="m m-btn g" data-a="up" id="m-all" style="' + at(20, 51, 60, 6.4) + ';font-size:.85em">まとめて受け取る</div>' +
        '<div class="m m-card" data-a="up" id="m-bg" style="' + at(8, 60, 84) + ';padding:calc(var(--u)*2.4);display:grid;grid-template-columns:repeat(5,1fr);gap:calc(var(--u)*1.2);z-index:5">' +
        [...Array(25)].map((_, i) => '<span class="bc bc' + i + '" style="position:relative;aspect-ratio:1;border-radius:calc(var(--u)*1.6);background:' + (i === 12 ? "#ffd36b" : "#eef1fb") + ';display:grid;place-items:center;font-size:.55em;font-weight:900;color:#8a93b8">' + (i === 12 ? "FREE" : "") + '<i class="bs" style="position:absolute;inset:8%;border-radius:50%;border:calc(var(--u)*.7) solid #ff4d6d;opacity:0"></i></span>').join("") + "</div>" +
        '<div class="m" data-a="pop" id="m-bingo" style="' + at(10, 68, 80) + ';z-index:8;text-align:center;font-weight:900;font-size:2.2em;color:#ff4d6d;text-shadow:0 calc(var(--u)*.6) 0 #fff,0 0 calc(var(--u)*4) #ffd36b;letter-spacing:.08em">BINGO!</div>' + tabs("home"),
      tl: [[0, "show", ".mi0"], [150, "show", ".mi1"], [300, "show", ".mi2"], [400, "pt", 0], [600, "bar", ".mb0", 100], [800, "bar", ".mb1", 100], [1000, "bar", ".mb2", 70], [1500, "show", "#m-all"], [2100, "tap", 50, 54],
        [2600, "count", ".xn", 1284500, 1287500, 1100], [2600, "add", ".mi0,.mi1", "off"], [3200, "pt", 1], [3300, "show", "#m-bg"]]
        .concat([10, 11, 13, 14, 2, 7, 17, 22].map((k, i) => [4000 + i * 260, "stampc", ".bc" + k]))
        .concat([[6200, "show", "#m-bingo"], [6200, "add", "#m-bingo", "m-pulse"], [6600, "pt", 2]]),
    },
    {
      id: "shop", g: "ショップ", t: "<span>ショップ</span>と交換所",
      lead: "ショップには、ジェムやチケットのパック、ジェムを XEVA に替える両替所、💠結晶や ★星煌印でキャラと交換できる交換所がまとまっています。",
      pts: ["<b>パックストア</b>：ジェム・チケットの詰め合わせ（回数限定のお得なパックも）", "<b>XEVA 両替所</b>：両替チケット1枚で💎をその時のレートで XEVA に", "<b>結晶交換所・★星煌印 交換所</b>：好きなキャラと交換"],
      where: ["ホーム", "ショップ"], dur: 8000,
      html: top() + '<div class="m fill on" style="top:0;background:linear-gradient(180deg,#f1f4ff,#fff)"></div>' +
        [["🛒", "パックストア", "ジェム・チケットの詰め合わせ", "#ff7a4d"], ["💱", "XEVA 両替所", "💎 → XEVA（いまのレート）", "#16c79a"], ["💠", "結晶交換所", "💠75 でキャラ1体", "#38a6ff"], ["★", "★星煌印 交換所", "★100 で好きなキャラ", "#ffb020"]]
          .map(([e, n, s, c], i) => '<div class="m m-card sh sh' + i + '" data-a="right" style="' + at(5, 19 + i * 13, 90, 11) + ';display:flex;align-items:center;gap:calc(var(--u)*3);padding:0 calc(var(--u)*3.4);border-left:calc(var(--u)*1.6) solid ' + c + '"><span style="font-size:1.7em;width:calc(var(--u)*10);text-align:center">' + e + '</span><span><div class="m-h" style="font-size:.95em">' + n + '</div><div class="m-s">' + s + "</div></span></div>").join("") +
        '<div class="m m-dim" data-a="fade" id="p-dim"></div>' +
        '<div class="m m-sheet" data-a="sheet" id="p-sheet"><div class="m-h">XEVA 両替所</div><div class="m-s" style="margin:calc(var(--u)*1.4) 0 calc(var(--u)*3)">両替チケット 1枚 ＝ 💎10 をいまのレートで</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;font-weight:900;font-size:1.1em"><span>💎 <b class="m-x">10</b></span><span style="color:#16c79a">→</span><span><img src="' + A("XEVA.png") + '" alt="" style="width:calc(var(--u)*6);vertical-align:middle"> <b class="m-x" id="p-x">0</b></span></div>' +
        '<div class="m-btn g" style="margin-top:calc(var(--u)*4);height:calc(var(--u)*9)">両替する</div></div>' + tabs("home"),
      tl: [[0, "show", ".sh0"], [150, "show", ".sh1"], [300, "show", ".sh2"], [450, "show", ".sh3"], [600, "pt", 0], [2200, "pt", 1], [2400, "tap", 50, 30], [2900, "show", "#p-dim"], [2900, "show", "#p-sheet"],
        [3500, "count", "#p-x", 0, 15420, 1200], [4900, "tap", 50, 90], [5300, "count", ".xn", 1284500, 1299920, 900], [5500, "hide", "#p-sheet,#p-dim"], [5800, "pt", 2], [6100, "add", ".sh3", "m-pulse"]],
    },
    {
      id: "events", g: "イベント", t: "<span>イベント</span>とスケジュール",
      lead: "期間限定のイベントでは、専用のミッションや報酬・XEVA の倍率アップが。スケジュールのカレンダーで、ガチャとイベントの期間がひと目でわかります。",
      pts: ["イベントのページで<b>期間・ごほうび・ミッション</b>を確認", "開催中は<b>獲得 XEVA の倍率</b>などのボーナス（例：🎃 Midnight Pumpkin）", "<b>スケジュール</b>に今月のガチャとイベントの期間"],
      where: ["ホーム", "イベントのバナー", "スケジュール"], dur: 7600,
      html: top() + '<div class="m fill on" style="top:0;background:#fff7ef"></div>' +
        '<div class="m m-ban" data-a="zoom" id="e-ban" style="' + at(5, 19, 90) + '"><img src="' + A("events/midnight_pumpkin_s.webp") + '" alt=""></div>' +
        '<div class="m m-card" data-a="up" id="e-boost" style="' + at(5, 44, 90) + ';padding:calc(var(--u)*3);display:flex;gap:calc(var(--u)*2);align-items:center"><span style="font-size:2em">🎃</span><div style="flex:1"><div class="m-h" style="font-size:.95em">イベントボーナス</div><div class="m-s">MagiDerby の払い戻し ×1.1・MagiAbyss のゴールド ×1.5</div></div></div>' +
        '<div class="m m-card" data-a="up" id="e-cal" style="' + at(5, 58, 90, 26) + ';padding:calc(var(--u)*2.4)"><div class="m-s" style="margin-bottom:calc(var(--u)*1.6)">📅 11月のスケジュール</div>' +
        '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:calc(var(--u)*.8)">' + [...Array(28)].map((_, i) => '<span style="aspect-ratio:1;border-radius:calc(var(--u)*1);font-size:.5em;font-weight:800;display:grid;place-items:center;background:' + (i < 10 ? "#ffe6f7" : i < 20 ? "#e6f3ff" : "#fff1dc") + ';color:#5a6290">' + (i + 1) + "</span>").join("") + "</div>" +
        '<div style="display:flex;gap:calc(var(--u)*1.4);margin-top:calc(var(--u)*1.6)"><span class="m-chip" style="background:#ffe6f7;color:#c43ab0">超極彩祭</span><span class="m-chip" style="background:#e6f3ff;color:#2a7bd8">超極華祭</span><span class="m-chip" style="background:#fff1dc;color:#c27a00">超極煌祭</span></div></div>' + tabs("home"),
      tl: [[0, "show", "#e-ban"], [300, "pt", 0], [1200, "tap", 50, 30], [1700, "show", "#e-boost"], [2200, "pt", 1], [2400, "add", "#e-boost", "m-pulse"], [4200, "rm", "#e-boost", "m-pulse"], [4300, "show", "#e-cal"], [4500, "pt", 2], [5400, "tap", 30, 72]],
    },
    {
      id: "mail", g: "お知らせ", t: "メール・お知らせ・<span>デベロッパーノート</span>",
      lead: "ごほうびやおわびはメールで届きます。アップデートのたびに、変更点と新キャラクターをまとめたデベロッパーノートが出て、設定からこれまでの回も読めます。",
      pts: ["メールの<b>受け取る</b>で XEVA・ジェム・チケットを受け取り", "<b>お知らせ</b>（Event・アップデート情報）で最新の内容を確認", "<b>デベロッパーノート</b>：版ごとの変更点（設定 ＞ その他）"],
      where: ["ホーム", "メール", "設定 ＞ デベロッパーノート"], dur: 7600,
      html: top() + '<div class="m fill on" style="top:0;background:#f5f7ff"></div>' +
        [["運営から", "いつもありがとうございます", "💎10・🎫5"], ["ビンゴのごほうび", "3ライン達成", "★10"], ["おわび", "メンテナンスのおわび", "XEVA 5,000"]].map(([a, b, c], i) =>
          '<div class="m m-card ml ml' + i + '" data-a="left" style="' + at(5, 19 + i * 11, 90, 9.4) + ';display:flex;align-items:center;gap:calc(var(--u)*2.4);padding:0 calc(var(--u)*3)"><span style="color:#4b63ff;width:calc(var(--u)*7)">' + IC.mail + '</span><span style="flex:1"><div style="font-weight:900;font-size:.8em">' + a + '</div><div class="m-s">' + b + '</div></span><span class="m-chip mlr' + i + '">' + c + "</span></div>").join("") +
        '<div class="m m-card" data-a="up" id="d-note" style="' + at(5, 55, 90, 28) + ';overflow:hidden"><img src="' + A("img/Haru_w.webp") + '" alt="" style="width:100%;height:46%;object-fit:cover"><div style="padding:calc(var(--u)*2.6)"><div class="m-s">DEVELOPER NOTE ・ 2026.10.30</div><div class="m-h" style="font-size:.9em">MagiBattle を1から作り直し／XEVARION ガイド</div></div></div>' + tabs("home"),
      tl: [[0, "show", ".ml0"], [150, "show", ".ml1"], [300, "show", ".ml2"], [500, "pt", 0], [1300, "tap", 84, 23.5], [1700, "css", ".mlr0", "background:#16c79a;color:#fff"], [1800, "count", ".gn", 128, 138, 600],
        [2600, "pt", 1], [3600, "show", "#d-note"], [3800, "pt", 2], [4600, "tap", 50, 70]],
    },
    {
      id: "community", g: "コミュニティ", t: "<span>コミュニティ</span>",
      lead: "コミュニティには、3D の会場 XEVARION PARK の入口・アニメの Tier 表・友達のつながりがあります。MagiLink の友達は XEVARION の友達と同じです。",
      pts: ["<b>アニメ Tier</b>：ホストの表と、視聴者数の人気 Tier をボタンで切りかえ", "<b>XEVARION PARK</b>：3D の会場（テーマパーク・サッカー・カート）", "友達の申請・承認は<b>アカウントでひとつ</b>（MagiLink とも共通）"],
      where: ["下バー", "コミュニティ"], dur: 7400,
      html: top() + '<div class="m fill on" style="top:0;background:#f5f4ff"></div>' +
        '<div class="m m-card m-shine" data-a="up" id="o-park" style="' + at(5, 19, 90, 13) + ';display:flex;align-items:center;gap:calc(var(--u)*3);padding:0 calc(var(--u)*3.4);background:linear-gradient(110deg,#5b7cff,#9a62ff);color:#fff"><span style="font-size:1.9em">🎡</span><span><div style="font-weight:900">XEVARION PARK</div><div style="font-size:.66em;opacity:.9">3D の会場へ入る</div></span></div>' +
        '<div class="m" data-a="up" id="o-seg" style="' + at(5, 35, 90) + ';display:flex;gap:calc(var(--u)*1.4)"><span class="m-chip os0" style="background:#4b63ff;color:#fff">ホストの表</span><span class="m-chip os1">人気Tier</span></div>' +
        ["S", "A", "B"].map((r, i) => '<div class="m m-card tr tr' + i + '" data-a="left" style="' + at(5, 41 + i * 12, 90, 10.6) + ';display:flex;align-items:center;gap:calc(var(--u)*1.6);padding:0 calc(var(--u)*2)"><b style="width:calc(var(--u)*8);height:calc(var(--u)*8);border-radius:calc(var(--u)*2);display:grid;place-items:center;color:#fff;background:' + ["#ff4d6d", "#ff9a3c", "#ffc23a"][i] + '">' + r + "</b>" +
          [...Array(5)].map((_, k) => '<span style="width:calc(var(--u)*11);height:calc(var(--u)*8.6);border-radius:calc(var(--u)*1.4);background:linear-gradient(135deg,hsl(' + (i * 70 + k * 30) + ',70%,78%),hsl(' + (i * 70 + k * 30 + 40) + ',70%,62%))"></span>').join("") + "</div>").join("") + tabs("com"),
      tl: [[0, "show", "#o-park"], [300, "pt", 0], [600, "show", "#o-seg"], [800, "show", ".tr0"], [950, "show", ".tr1"], [1100, "show", ".tr2"], [2300, "tap", 38, 37], [2700, "css", ".os0", "background:#eef2ff;color:#4b63ff"], [2700, "css", ".os1", "background:#4b63ff;color:#fff"],
        [2700, "add", ".tr0,.tr1,.tr2", "m-shake"], [3600, "pt", 1], [3900, "tap", 50, 25], [5000, "pt", 2]],
    },
    {
      id: "sync", g: "アカウント", t: "ひとつの<span>アカウント</span>で同期",
      lead: "XEVARION のアカウントひとつで、iPhone・iPad・PC のどれからでも同じキャラ・XEVA・学習の記録。オフラインで遊んだぶんも、つながったときに自動で合わさります。",
      pts: ["キャラ・XEVA・ジェム・学習・ゲームの記録を<b>自動で同期</b>", "オフラインのあいだの増減も、<b>つながったら合算</b>（消えない）", "設定の<b>「データを最新にする」</b>でいますぐ受け取りも"],
      where: ["設定", "アカウント"], dur: 8000,
      html: '<div class="m fill on" style="background:linear-gradient(180deg,#eef3ff,#f9f6ff)"></div>' +
        '<div class="m" data-a="pop" id="y-cloud" style="' + at(32, 10, 36) + ';color:#4b63ff;filter:drop-shadow(0 0 calc(var(--u)*3) rgba(75,99,255,.5))">' + IC.cloud + "</div>" +
        '<div class="m m-card" data-a="left" id="y-a" style="' + at(6, 40, 38, 34) + ';padding:calc(var(--u)*2.4);text-align:center"><div class="m-s">iPhone</div><img src="' + A("img/t_Haru.webp") + '" alt="" style="width:60%;border-radius:50%;margin:calc(var(--u)*2) auto;display:block"><b class="m-x ya" style="font-size:.9em">12,000</b><div class="m-s">XEVA</div></div>' +
        '<div class="m m-card" data-a="right" id="y-b" style="' + at(56, 40, 38, 34) + ';padding:calc(var(--u)*2.4);text-align:center"><div class="m-s">iPad</div><img src="' + A("img/t_Haru.webp") + '" alt="" style="width:60%;border-radius:50%;margin:calc(var(--u)*2) auto;display:block"><b class="m-x yb" style="font-size:.9em">12,000</b><div class="m-s">XEVA</div></div>' +
        '<div class="m" data-a="fade" id="y-ar1" style="' + at(20, 28, 20) + ';font-size:1.6em;color:#4b63ff;transform:rotate(-30deg)">⇡</div><div class="m" data-a="fade" id="y-ar2" style="' + at(66, 28, 20) + ';font-size:1.6em;color:#4b63ff;transform:rotate(30deg)">⇣</div>' +
        '<div class="m m-toast" data-a="up" id="y-off" style="top:80%">✈ オフラインで MagiLex を遊んだ ＋800</div>' +
        '<div class="m m-toast" data-a="up" id="y-on" style="top:80%;background:#16c79a">つながりました・同期しました</div>',
      tl: [[0, "show", "#y-cloud"], [300, "show", "#y-a"], [500, "show", "#y-b"], [600, "pt", 0], [1500, "show", "#y-ar1"], [1500, "count", ".ya", 12000, 13500, 700], [2300, "show", "#y-ar2"], [2300, "count", ".yb", 12000, 13500, 700],
        [3200, "pt", 1], [3300, "hide", "#y-ar1,#y-ar2"], [3300, "css", "#y-cloud", "opacity:.25"], [3400, "show", "#y-off"], [3600, "count", ".ya", 13500, 14300, 600], [4900, "hide", "#y-off"], [5000, "css", "#y-cloud", "opacity:1"], [5000, "show", "#y-on"], [5100, "show", "#y-ar2"], [5200, "count", ".yb", 13500, 14300, 600], [6000, "pt", 2]],
    },
    {
      id: "offline", g: "アップデート", t: "アップデートと<span>オフライン</span>",
      lead: "新しい版が出ると、更新の画面で必要なデータだけをまとめてダウンロード。ホーム画面に追加すればアプリのように起動し、電波の無いところでも多くのアプリが遊べます。",
      pts: ["更新の画面に<b>変わったファイルとダウンロード量</b>", "<b>ホーム画面に追加</b>（設定 ＞ XEVARION をインストール）", "オフラインで使えるアプリは<b>押せるまま</b>（MagiLex・MagiAbyss・MagiBattle など）"],
      where: ["設定", "アプリの更新", "インストール"], dur: 7800,
      html: '<div class="m fill on" style="background:linear-gradient(180deg,#141a46,#2a1d63)"></div>' +
        '<img class="m m-float" data-a="pop" id="u-logo" src="' + A("brand-xevarion-orb.png") + '" alt="" style="' + at(32, 16, 36) + '">' +
        '<div class="m" data-a="up" id="u-t" style="' + at(8, 40, 84) + ';text-align:center;color:#fff;font-weight:900">アップデート 2026-10-30</div>' +
        '<div class="m" data-a="up" id="u-bar" style="' + at(10, 47, 80) + '"><div class="m-bar" style="background:rgba(255,255,255,.18)"><b id="u-b" style="background:linear-gradient(90deg,#7aa2ff,#c48bff)"></b></div><div style="display:flex;justify-content:space-between;color:#cdd5f4;font-size:.62em;font-weight:800;margin-top:calc(var(--u)*1.4)"><span><b class="m-x" id="u-n">0</b> / 72 ファイル</span><span><b class="m-x" id="u-mb">0</b> MB</span></div></div>' +
        '<div class="m m-card" data-a="up" id="u-ok" style="' + at(10, 60, 80) + ';padding:calc(var(--u)*3);text-align:center;font-weight:900;color:#16a37f">✓ 最新になりました</div>' +
        '<div class="m" data-a="up" id="u-off" style="' + at(8, 74, 84) + ';display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*2);color:#fff;font-weight:800;font-size:.75em"><span style="width:calc(var(--u)*7);color:#ffd36b">' + IC.plane + "</span>機内モードでも遊べる</div>",
      tl: [[0, "show", "#u-logo"], [300, "show", "#u-t"], [500, "show", "#u-bar"], [500, "pt", 0], [800, "bar", "#u-b", 100], [800, "count", "#u-n", 0, 72, 1600], [800, "count", "#u-mb", 0, 9, 1600], [2700, "show", "#u-ok"], [3200, "pt", 1], [4800, "show", "#u-off"], [4900, "pt", 2]],
    },
    {
      id: "settings", g: "設定", t: "設定と <span>Xevion OS</span>",
      lead: "設定では、言語（日本語／English）・BGM・通信のしかた・見た目などを切りかえられます。Xevion OS がすべてのアプリの見た目と動きをそろえます。",
      pts: ["<b>日本語 ⇄ English</b> をいつでも切りかえ", "<b>オフライン・通信設定</b>：Wi-Fi／モバイルデータごとの動き", "<b>XEVARION ガイド</b>（このページ）もここから見られます"],
      where: ["下バー", "設定"], dur: 7600,
      html: top() + '<div class="m fill on" style="top:0;background:#f4f6ff"></div>' +
        [["言語", "日本語", "lang"], ["BGM", "", "sw"], ["オフライン・通信設定", "Wi-Fi のときだけ最新", ""], ["XEVARION ガイド", "すべての機能をアニメで", "guide"], ["デベロッパーノート", "これまでの回を見る", ""]].map(([n, s, k], i) =>
          '<div class="m m-card st st' + i + '" data-a="right" style="' + at(5, 19 + i * 11.2, 90, 9.6) + ';display:flex;align-items:center;padding:0 calc(var(--u)*3.4);gap:calc(var(--u)*2)' + (k === "guide" ? ";box-shadow:0 0 0 calc(var(--u)*.6) #9a62ff" : "") + '"><span style="flex:1"><div style="font-weight:900;font-size:.85em" class="stn' + i + '">' + n + '</div><div class="m-s sts' + i + '">' + s + "</div></span>" +
          (k === "sw" ? '<i class="ssw" style="width:calc(var(--u)*12);height:calc(var(--u)*6.6);border-radius:99px;background:#cfd6ee;position:relative;transition:background .3s"><i class="ssk" style="position:absolute;left:8%;top:12%;width:calc(var(--u)*5);height:calc(var(--u)*5);border-radius:50%;background:#fff;transition:left .3s"></i></i>' : '<span style="color:#9aa5c8">›</span>') + "</div>").join("") + tabs("set"),
      tl: [[0, "show", ".st0"], [120, "show", ".st1"], [240, "show", ".st2"], [360, "show", ".st3"], [480, "show", ".st4"], [600, "pt", 0], [1300, "tap", 50, 24], [1700, "text", ".sts0", "English"], [1700, "text", ".stn0", "Language"],
        [1700, "text", ".stn1", "Music"], [1700, "text", ".stn2", "Offline & Network"], [3000, "tap", 50, 24], [3400, "text", ".sts0", "日本語"], [3400, "text", ".stn0", "言語"], [3400, "text", ".stn1", "BGM"], [3400, "text", ".stn2", "オフライン・通信設定"],
        [3600, "tap", 84, 35.2], [4000, "css", ".ssw", "background:#4b63ff"], [4000, "css", ".ssk", "left:52%"], [4400, "pt", 1], [5400, "pt", 2], [5600, "add", ".st3", "m-pulse"]],
    },
    {
      id: "learn", g: "アプリ", t: "<span>学ぶ</span>アプリ",
      lead: "MagiLex は学びの入口。化学の問題集 MagiChemLex、英単語・古文の旧MagiLex、くわしい解説の XEVYNAR、学習管理の MagiFocus。学ぶほど XEVA がたまります。",
      pts: ["<b>MagiChemLex</b>：改題・基礎・単元別・模試の冊子・フラッシュカード・ビンゴ", "間隔反復の<b>復習</b>・学習カレンダー・<b>Wisdom Point</b> の交換所", "<b>オフラインで学習</b>でき、記録はあとで同期"],
      where: ["ホーム", "MagiLex"], dur: 7600,
      html: '<div class="m fill on" style="background:linear-gradient(180deg,#eef6ff,#fff)"></div>' +
        icon("MagiLex.jpg", 8, 9, "l0", "pop") + icon("MagiChemLex.jpg?v=2", 31, 9, "l1", "pop") + icon("XEVYNAR.jpg", 54, 9, "l2", "pop") + icon("MagiFocus.jpg", 77, 9, "l3", "pop") +
        '<div class="m m-card" data-a="up" id="l-q" style="' + at(6, 28, 88) + ';padding:calc(var(--u)*3.4)"><div class="m-s">問 12　化学基礎</div><div style="font-weight:900;font-size:.85em;margin:calc(var(--u)*1.6) 0 calc(var(--u)*2.4)">水 18 g に含まれる分子の数は？</div>' +
        ["3.0×10²³ 個", "6.0×10²³ 個", "1.2×10²⁴ 個"].map((o, i) => '<div class="lo lo' + i + '" style="padding:calc(var(--u)*2) calc(var(--u)*3);border-radius:calc(var(--u)*2.4);background:#f1f4ff;margin-top:calc(var(--u)*1.6);font-weight:800;font-size:.8em">' + o + "</div>").join("") + "</div>" +
        '<div class="m" data-a="pop" id="l-ok" style="' + at(60, 30, 34) + ';font-size:3.2em;color:#16c79a;font-weight:900;text-align:center">◎</div>' +
        '<div class="m m-card" data-a="up" id="l-wp" style="' + at(6, 70, 88) + ';padding:calc(var(--u)*3);display:flex;align-items:center;gap:calc(var(--u)*2.4)"><span style="font-size:1.6em">📘</span><div style="flex:1"><div style="font-weight:900;font-size:.85em">完全習得 +5 WP</div><div class="m-bar" style="margin-top:calc(var(--u)*1.2)"><b id="l-b"></b></div></div><b class="m-x" style="color:#4b63ff">+300 XEVA</b></div>',
      tl: [[0, "show", ".l0"], [120, "show", ".l1"], [240, "show", ".l2"], [360, "show", ".l3"], [500, "pt", 0], [800, "show", "#l-q"], [2000, "tap", 50, 49.5], [2400, "css", ".lo1", "background:#d6f7ea;color:#0f8f6f"], [2500, "show", "#l-ok"],
        [3300, "pt", 1], [3500, "show", "#l-wp"], [3700, "bar", "#l-b", 100], [5200, "pt", 2]],
    },
    {
      id: "play", g: "アプリ", t: "<span>あそぶ</span>アプリ",
      lead: "後ろから見たドット絵の5人で撃つ MagiBattle、引っぱりハンティングの MagiBurst、迷宮のドットアクション MagiAbyss、実際の GⅠ に賭ける MagiDerby など。",
      pts: ["<b>MagiBattle</b>：遮蔽物シューティング・バースト・アリーナ（2026.10 作り直し）", "<b>MagiAbyss・MagiBurst・MagiBocciaRush</b>：ガチャのキャラで遊ぶ", "<b>MagiDerby</b>：実際の JRA GⅠ・払い戻しは本物の払戻金どおり"],
      where: ["ホーム", "ロビー／メニュー"], dur: 8200,
      html: '<div class="m fill on" style="background:linear-gradient(180deg,#141a3a,#25184a)"></div>' +
        '<div class="m" data-a="zoom" id="p-scene" style="' + at(0, 8, 100, 52) + ';overflow:hidden">' +
        '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#2b3b7a 0%,#5a4a9a 45%,#3a2f55 46%,#221a33 100%)"></div>' +
        [...Array(5)].map((_, i) => '<span class="pe pe' + i + '" style="position:absolute;left:' + (12 + i * 17) + "%;top:" + (22 + (i % 2) * 8) + '%;width:calc(var(--u)*9);height:calc(var(--u)*9);border-radius:calc(var(--u)*2);background:linear-gradient(135deg,#ff5a6a,#8a1a3a);box-shadow:0 0 calc(var(--u)*2) #ff4d6d"></span>').join("") +
        [...Array(5)].map((_, i) => '<span style="position:absolute;left:' + (6 + i * 18.5) + '%;bottom:8%;width:calc(var(--u)*15);height:calc(var(--u)*7);border-radius:calc(var(--u)*1.4);background:linear-gradient(180deg,#7a86a8,#4a5470)"></span>').join("") +
        '<span id="p-cross" style="position:absolute;left:44%;top:26%;width:calc(var(--u)*12);height:calc(var(--u)*12);margin:calc(var(--u)*-6);border:calc(var(--u)*.6) solid #7dffef;border-radius:50%;box-shadow:0 0 calc(var(--u)*2) #7dffef;transition:left .5s,top .5s"></span>' +
        '<b id="p-fb" style="position:absolute;left:0;right:0;top:40%;text-align:center;font-size:1.7em;letter-spacing:.12em;color:#fff;text-shadow:0 0 calc(var(--u)*3) #ff7ad9;opacity:0;transition:opacity .3s">FULL BURST</b></div>' +
        icon("MagiBattle.jpg?v=4", 6, 64, "pl0", "up") + icon("MagiBurst.jpg", 29, 64, "pl1", "up") + icon("MagiAbyss.jpg?v=2", 52, 64, "pl2", "up") + icon("MagiDerby.jpg", 75, 64, "pl3", "up") +
        icon("MagiBocciaRush.jpg", 17.5, 80, "pl4", "up") + icon("MagiRail.jpg", 40.5, 80, "pl5", "up") + icon("MagiCraft.jpg", 63.5, 80, "pl6", "up"),
      tl: [[0, "show", "#p-scene"], [300, "pt", 0], [900, "css", "#p-cross", "left:29%;top:30%"], [1300, "css", ".pe1", "opacity:.2"], [1700, "css", "#p-cross", "left:63%;top:24%"], [2100, "css", ".pe3", "opacity:.2"],
        [2500, "css", "#p-fb", "opacity:1"], [2600, "css", ".pe0,.pe2,.pe4", "opacity:.15"], [3300, "pt", 1]].concat([...Array(7)].map((_, i) => [3400 + i * 110, "show", ".pl" + i])).concat([[5200, "pt", 2], [5400, "add", ".pl3", "m-pulse"]]),
    },
    {
      id: "party", g: "アプリ", t: "<span>みんなで囲む</span>アプリ",
      lead: "1台の iPad をみんなで囲んで遊ぶゲームもたくさん。運の要素ゼロの陣取りから、駒を動かせるボードゲーム、化学のクイズ対戦まで。",
      pts: ["<b>MagiChainParty</b>：連鎖バクハツの陣取り（2〜6人・CPU・オンライン）", "<b>MagiShift・Dominion Grid・MagiEmpire・MagiArena</b>", "<b>MagiQuiz</b>：ミリオネアとばくだんの化学クイズ（XEVA は順位どおり）"],
      where: ["ホーム", "メニュー ＞ ゲーム"], dur: 7400,
      html: '<div class="m fill on" style="background:linear-gradient(180deg,#fff8ec,#fff)"></div>' +
        '<div class="m m-card" data-a="pop" id="q-board" style="' + at(10, 10, 80) + ';aspect-ratio:1;padding:calc(var(--u)*2);display:grid;grid-template-columns:repeat(5,1fr);gap:calc(var(--u)*1)">' +
        [...Array(25)].map((_, i) => '<span class="qb qb' + i + '" style="border-radius:calc(var(--u)*1.4);background:#f1f3fb;transition:background .3s,transform .3s"></span>').join("") + "</div>" +
        icon("MagiChainParty.jpg?v=2", 6, 66, "q0", "up") + icon("MagiShift.jpg", 29, 66, "q1", "up") + icon("MagiDominionGrid.jpg", 52, 66, "q2", "up") + icon("MagiQuiz.jpg", 75, 66, "q3", "up") +
        icon("MagiEmpire.jpg", 29, 82, "q4", "up") + icon("MagiArena.jpg", 52, 82, "q5", "up"),
      tl: [[0, "show", "#q-board"], [300, "pt", 0]].concat([12, 7, 13, 11, 17, 6, 8, 16, 18, 2, 10, 14, 22].map((k, i) => [700 + i * 150, "css", ".qb" + k, "background:" + (i % 3 === 0 ? "#ff5a7a" : i % 3 === 1 ? "#4b8bff" : "#ffc23a") + ";transform:scale(.9)"]))
        .concat([[2900, "pt", 1]]).concat([...Array(6)].map((_, i) => [3000 + i * 110, "show", ".q" + i])).concat([[4800, "pt", 2], [5000, "add", ".q3", "m-pulse"]]),
    },
    {
      id: "info", g: "アプリ", t: "<span>つながる・情報</span>アプリ",
      lead: "友達とつながる MagiLink、XEVA の月間ランキング MagiRanking、アニメやカラオケの実際のランキング MagiScope、Tier 表の MagiTier など。",
      pts: ["<b>MagiLink</b>：友達・グループとチャット（XEVARION の友達と共通）", "<b>MagiRanking</b>：獲得 XEVA の月間ランキング（月末の順位で XEVA）", "<b>MagiScope・MagiTier・MagiMusic・MagiPortfolio・MagiCounter</b>"],
      where: ["ホーム", "メニュー ＞ つながる・情報"], dur: 7200,
      html: '<div class="m fill on" style="background:linear-gradient(180deg,#eef9ff,#fff)"></div>' +
        [["ハル", "きょうのビンゴ、あと1マス！", 0], ["あなた", "いまからガチャ引く！", 1], ["チカ", "UR 出たらおしえてね", 0]].map(([n, s, me], i) =>
          '<div class="m in in' + i + '" data-a="' + (me ? "right" : "left") + '" style="' + at(me ? 30 : 6, 10 + i * 10, 64) + ';display:flex;gap:calc(var(--u)*1.6);' + (me ? "flex-direction:row-reverse" : "") + '">' + (me ? "" : '<img src="' + A("img/t_" + (n === "ハル" ? "Haru" : "Chika") + ".webp") + '" alt="" style="width:calc(var(--u)*8);height:calc(var(--u)*8);border-radius:50%">') +
          '<div class="m-bubble" style="' + (me ? "background:#4b63ff;color:#fff" : "") + '">' + s + "</div></div>").join("") +
        '<div class="m m-card" data-a="up" id="n-rk" style="' + at(6, 44, 88) + ';padding:calc(var(--u)*2.6)"><div class="m-s" style="margin-bottom:calc(var(--u)*1.4)">🏆 10月の XEVA ランキング</div>' +
        [["1", "Haru", "2,480,000"], ["2", "Hisako", "1,920,500"], ["3", "Chika", "1,604,200"]].map(([r, c, x]) => '<div style="display:flex;align-items:center;gap:calc(var(--u)*2);padding:calc(var(--u)*1.2) 0;font-weight:800;font-size:.78em"><b style="width:calc(var(--u)*6);color:#ff9a3c">' + r + '</b><img src="' + A("img/t_" + c + ".webp") + '" alt="" style="width:calc(var(--u)*7);height:calc(var(--u)*7);border-radius:50%"><span style="flex:1">' + c + '</span><b class="m-x">' + x + "</b></div>").join("") + "</div>" +
        icon("MagiLink.jpg", 6, 78, "f0", "up") + icon("MagiRanking.jpg", 29, 78, "f1", "up") + icon("MagiScope.jpg", 52, 78, "f2", "up") + icon("MagiTier.jpg", 75, 78, "f3", "up"),
      tl: [[0, "show", ".in0"], [700, "show", ".in1"], [1400, "show", ".in2"], [300, "pt", 0], [2300, "pt", 1], [2400, "show", "#n-rk"], [3800, "pt", 2], [3900, "show", ".f0"], [4000, "show", ".f1"], [4100, "show", ".f2"], [4200, "show", ".f3"]],
    },
    {
      id: "outro", g: "おわりに", t: "さあ、<span>はじめよう</span>",
      lead: "このガイドは、設定の「XEVARION ガイド」からいつでも見返せます。気になる章だけを一覧から選んで見ることもできます。",
      pts: ["<b>設定 ＞ XEVARION について ＞ XEVARION ガイド</b>", "右上の<b>一覧</b>から好きな章へ", "わからないことは<b>メール・お知らせ</b>やデベロッパーノートでも"],
      where: ["設定", "XEVARION ガイド"], dur: 6000,
      html: '<div class="m fill on" style="background:radial-gradient(circle at 50% 40%,#e8edff,#f6f3ff 55%,#fff)"></div>' +
        '<img class="m m-float" data-a="pop" id="o-logo" src="' + A("brand-xevarion-orb.png") + '" alt="" style="' + at(28, 20, 44) + '">' +
        '<img class="m" data-a="up" id="o-word" src="' + A("brand-xevarion-wordmark-dark.png") + '" alt="" style="' + at(14, 50, 72) + '">' +
        '<img class="m" data-a="up" id="o-mate" src="' + A("img/Haru_w.webp") + '" alt="" style="' + at(6, 64, 88) + ';border-radius:calc(var(--u)*4);box-shadow:0 calc(var(--u)*2) calc(var(--u)*5) rgba(30,40,100,.25)">',
      tl: [[0, "show", "#o-logo"], [400, "show", "#o-word"], [400, "pt", 0], [900, "show", "#o-mate"], [1800, "pt", 1], [3000, "pt", 2]],
    },
  ];

  /* ══════════ プレイヤー ══════════ */
  let root = null, idx = 0, playing = true, t = 0, last = 0, raf = 0, ran = 0, tweens = [], holdUntil = 0, listOpen = false;
  /* ★★ 2026-10-31 SC＝いま再生している章の並び（全部／その画面の章だけ／アプリのガイド）。PK＝ガイドの名前・ロゴ（XEVARION か、アプリの pack） */
  const XPK = { key: "", name: "XEVARION", sub: "GUIDE", logo: "brand-xevarion-orb.png", title: "XEVARION ガイド", all: SCENES };
  const PACKS = {};
  let SC = SCENES, PK = XPK, SUB = false;
  let reduce = false;
  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }
  function injectCss() {
    if (document.getElementById("xtCss")) return;
    const st = document.createElement("style"); st.id = "xtCss"; st.textContent = CSS; document.head.appendChild(st);
  }
  function build() {
    root = document.createElement("div");
    root.className = "xt"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", PK.title);
    root.innerHTML =
      '<div class="xt-top"><span class="xt-brand"><img src="' + (PK.logoAbs || A(PK.logo)) + '" alt=""><span>' + PK.name + ' <b>' + PK.sub + '</b></span></span><span class="xt-sp"></span>' +
      '<button class="xt-ib" data-x="list" aria-label="章の一覧">' + IC.list + '</button><button class="xt-ib" data-x="close" aria-label="閉じる">' + IC.close + "</button></div>" +
      '<div class="xt-segs">' + SC.map((s, i) => '<i data-i="' + i + '" title="' + s.t.replace(/<[^>]+>/g, "") + '"><b></b></i>').join("") + "</div>" +
      '<div class="xt-main"><div class="xt-phone"><div class="xt-scr" id="xtScr"></div></div><div class="xt-txt" id="xtTxt"></div></div>' +
      '<div class="xt-hint">← → で章を移動 ・ Space で一時停止 ・ Esc で閉じる</div>' +
      '<div class="xt-bot"><button class="xt-nav" data-x="prev">' + IC.prev + '前へ</button><button class="xt-ib" data-x="play" aria-label="一時停止">' + IC.pause + '</button><span class="xt-cnt" id="xtCnt"></span><button class="xt-nav pri" data-x="next">次へ' + IC.next + "</button></div>" +
      /* ★★ 2026-10-31 ご報告「見たい章を選んでくださいで、一つしか表示されていない」→ 一覧は<b>いつも全部の章</b>。
         画面ごとに開いたときは、その画面の章を先に・「この画面」の印つき。 */
      '<div class="xt-list" id="xtList"><h3>' + PK.title + '</h3><p>見たい章を選んでください（全' + PK.all.length + "章" + (SUB ? "・<b class=\"xt-here-k\">この画面</b>の章が先頭" : "") + "）" +
        (SUB ? '　<button class="xt-all" data-x="all">はじめから全部を見る</button>' : "") + "</p><div class=\"xt-grid\">" +
      listOrder().map((s) => { const i = PK.all.indexOf(s), here = SUB && SC.indexOf(s) >= 0;
        return '<button data-go="' + i + '" data-id="' + s.id + '"' + (here ? ' class="here"' : "") + "><small>" + String(i + 1).padStart(2, "0") + " ・ " + s.g + (here ? '<em class="xt-here">この画面</em>' : "") + "</small><b>" + s.t.replace(/<[^>]+>/g, "") + "</b><span>" + s.where.join(" ＞ ") + "</span></button>"; }).join("") + "</div></div>";
    document.body.appendChild(root);
    root.addEventListener("click", onClick);
    let sx = null, sy = null;
    root.addEventListener("touchstart", (e) => { const p = e.touches[0]; sx = p.clientX; sy = p.clientY; }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (sx == null || listOpen) return;
      const p = e.changedTouches[0], dx = p.clientX - sx, dy = p.clientY - sy; sx = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) go(idx + (dx < 0 ? 1 : -1));
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
  }
  function onVis() { if (document.hidden && playing) setPlay(false); }
  function onKey(e) {
    if (!root) return;
    if (e.key === "Escape") { if (listOpen) toggleList(false); else close(); }
    else if (e.key === "ArrowRight") go(idx + 1);
    else if (e.key === "ArrowLeft") go(idx - 1);
    else if (e.key === " ") { e.preventDefault(); setPlay(!playing); }
  }
  function onClick(e) {
    const b = e.target.closest("[data-x],[data-go],.xt-segs i");
    if (!b) return;
    haptic();
    if (b.dataset.go != null) {
      toggleList(false);
      const id = b.dataset.id, j = SC.findIndex((s) => s.id === id);
      if (j >= 0) go(j); else switchAll(id);          /* その画面の外の章 → 全部の並びでその章から */
      return;
    }
    if (b.matches(".xt-segs i")) { go(+b.dataset.i); return; }
    const x = b.dataset.x;
    if (x === "close") close();
    else if (x === "next") { if (idx >= SC.length - 1) close(); else go(idx + 1); }
    else if (x === "prev") go(idx - 1);
    else if (x === "play") setPlay(!playing);
    else if (x === "list") toggleList(!listOpen);
    else if (x === "all") switchAll(null);   /* その画面の章だけ → はじめから全部 */
  }
  /* 一覧の並び：画面ごとのときは、その画面の章 → のこり（全部の並びの順） */
  function listOrder() { return SUB ? SC.concat(PK.all.filter((s) => SC.indexOf(s) < 0)) : PK.all; }
  /* 全部の並びに切りかえて、startId の章から（いまの板はすぐ片づける＝前の板が残って見えない） */
  function switchAll(startId) {
    const k = PK.key, r = root;
    cancelAnimationFrame(raf); document.removeEventListener("keydown", onKey); document.removeEventListener("visibilitychange", onVis);
    root = null; listOpen = false; try { r.remove(); } catch (e2) {}
    open(startId || null, { pack: k }); if (root) root.classList.add("on");
  }
  function haptic() { try { if (window.XOS && XOS.haptic) XOS.haptic(); } catch (e) {} }
  function toggleList(on) {
    listOpen = on; const L = $("#xtList"); if (!L) return;
    L.classList.toggle("on", on); root.classList.toggle("listing", on);
    const curId = SC[idx] && SC[idx].id;
    $$(".xt-grid button").forEach((b) => b.classList.toggle("on", b.dataset.id === curId));
    if (on) setPlay(false);
  }
  function setPlay(p) {
    playing = p; root.classList.toggle("paused", !p);
    const b = root.querySelector('[data-x="play"]'); if (b) { b.innerHTML = p ? IC.pause : IC.play; b.setAttribute("aria-label", p ? "一時停止" : "再生"); }
    last = performance.now();
  }
  function go(i) {
    if (!root) return;
    if (i < 0) i = 0;
    if (i >= SC.length) { close(); return; }
    idx = i; load();
  }
  function load() {
    const S = SC[idx];
    const scr = $("#xtScr");
    scr.innerHTML = S.html + '<span class="xt-finger" id="xtFg"></span>';
    $("#xtTxt").innerHTML = '<div class="xt-no">CHAPTER ' + String(idx + 1).padStart(2, "0") + "<em>" + S.g + "</em></div>" +
      '<h2 class="xt-h">' + S.t + '</h2><p class="xt-lead">' + S.lead + '</p><ul class="xt-pts">' + S.pts.map((p) => "<li>" + p + "</li>").join("") + "</ul>" +
      '<div class="xt-where">' + S.where.map((w, k) => (k ? "<i>›</i>" : "") + "<span>" + w + "</span>").join("") + "</div>";
    $("#xtCnt").textContent = (idx + 1) + " / " + SC.length;
    $$(".xt-segs i").forEach((s, k) => { s.classList.toggle("done", k < idx); const b = s.firstChild; if (b) b.style.width = k < idx ? "100%" : "0"; });
    const nx = root.querySelector('[data-x="next"]'); if (nx) nx.innerHTML = idx >= SC.length - 1 ? "閉じる" : "次へ" + IC.next;
    const pv = root.querySelector('[data-x="prev"]'); if (pv) pv.disabled = idx === 0;
    t = 0; ran = 0; tweens = []; holdUntil = 0; last = performance.now();
    if (reduce) { /* 動きを減らす：最初に全部出して説明だけ順番に */
      $$(".m", scr).forEach((m) => m.classList.add("on"));
    }
    if (!playing) setPlay(true);
  }
  /* 時間割の1命令 */
  function act(c) {
    const scr = $("#xtScr"), fg = $("#xtFg");
    const els = (s) => $$(s, scr);
    switch (c[1]) {
      case "show": els(c[2]).forEach((e) => { e.classList.remove("off"); e.classList.add("on"); }); break;
      case "hide": els(c[2]).forEach((e) => e.classList.add("off")); break;
      case "add": els(c[2]).forEach((e) => e.classList.add(c[3])); break;
      case "rm": els(c[2]).forEach((e) => e.classList.remove(c[3])); break;
      case "css": els(c[2]).forEach((e) => { e.style.cssText += ";" + c[3]; }); break;
      case "text": els(c[2]).forEach((e) => { e.textContent = c[3]; }); break;
      case "src": els(c[2]).forEach((e) => { e.src = A(c[3]); }); break;
      case "bar": els(c[2]).forEach((e) => { e.style.width = c[3] + "%"; }); break;
      case "pt": { const li = $$(".xt-pts li")[c[2]]; if (li) li.classList.add("on"); break; }
      case "stampc": els(c[2]).forEach((e) => { e.style.background = "#ffe1e6"; const s = e.querySelector(".bs"); if (s) { s.style.opacity = "1"; s.classList.add("m-stamp"); } }); break;
      case "count": tweens.push({ k: "count", sel: c[2], a: c[3], b: c[4], t0: t, d: c[5] || 800 }); break;
      case "type": tweens.push({ k: "type", sel: c[2], s: c[3], t0: t, d: c[4] || 800 }); break;
      case "finger": if (fg) fg.classList.remove("on"); break;
      case "tap": {
        if (!fg) break;
        fg.classList.remove("drag"); fg.classList.add("on"); fg.style.left = c[2] + "%"; fg.style.top = c[3] + "%";
        tweens.push({ k: "press", t0: t + 470, d: 240, x: c[2], y: c[3], done: false });
        break;
      }
      case "drag": if (fg) { fg.classList.add("on", "drag"); tweens.push({ k: "drag", t0: t, d: c[6] || 800, x1: c[2], y1: c[3], x2: c[4], y2: c[5] }); } break;
    }
  }
  function stepTweens() {
    const scr = $("#xtScr"), fg = $("#xtFg");
    tweens = tweens.filter((w) => {
      if (t < w.t0) return true;
      const p = Math.min(1, (t - w.t0) / Math.max(1, w.d));
      if (w.k === "count") { const v = w.a + (w.b - w.a) * (1 - Math.pow(1 - p, 3)); $$(w.sel, scr).forEach((e) => { e.textContent = fmt(v); }); }
      else if (w.k === "type") { const n = Math.round(w.s.length * p); $$(w.sel, scr).forEach((e) => { e.textContent = w.s.slice(0, n); }); }
      else if (w.k === "drag" && fg) { fg.style.left = (w.x1 + (w.x2 - w.x1) * p) + "%"; fg.style.top = (w.y1 + (w.y2 - w.y1) * p) + "%"; }
      else if (w.k === "press" && fg) {
        if (!w.done) {
          w.done = true; fg.classList.add("press");
          const r = document.createElement("span"); r.className = "xt-rip"; r.style.left = w.x + "%"; r.style.top = w.y + "%"; scr.appendChild(r);
          setTimeout(() => { try { r.remove(); } catch (e) {} }, 700);
        }
        if (p >= 1) fg.classList.remove("press");
      }
      return p < 1;
    });
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!root) return;
    const dt = Math.min(100, now - last); last = now;
    if (!playing) return;
    t += dt;
    const S = SC[idx];
    const tl = S.tl;
    while (ran < tl.length && tl[ran][0] <= t) { try { act(tl[ran]); } catch (e) {} ran++; }
    stepTweens();
    const seg = root.querySelectorAll(".xt-segs i")[idx];
    const dur = S.dur * (reduce ? 1.6 : 1);
    if (seg && seg.firstChild) seg.firstChild.style.width = Math.min(100, (t / dur) * 100) + "%";
    if (t >= dur) {
      if (!holdUntil) holdUntil = t + 900;
      else if (t >= holdUntil) { if (idx < SC.length - 1) go(idx + 1); else { setPlay(false); } }
    }
  }
  function sortTl() { SC.forEach((s) => { s.tl.sort((a, b) => a[0] - b[0]); }); }
  /* open(章の id, { pack: アプリのガイドの名前, ids: [この画面の章…] })。opt が文字なら pack */
  function open(start, opt) {
    if (typeof opt === "string") opt = { pack: opt };
    opt = opt || {};
    if (root) { if (start) go(Math.max(0, SC.findIndex((s) => s.id === start))); return; }
    PK = (opt.pack && PACKS[opt.pack]) || XPK;
    SC = PK.all;
    SUB = false;
    if (opt.ids && opt.ids.length) { const pick = SC.filter((s) => opt.ids.indexOf(s.id) >= 0); if (pick.length) { SC = pick; SUB = true; } }
    if (PK.css && !document.getElementById("xtCss_" + PK.key)) { const st = document.createElement("style"); st.id = "xtCss_" + PK.key; st.textContent = PK.css; document.head.appendChild(st); }
    injectCss(); sortTl();
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("xos-nomotion"); } catch (e) {}
    build();
    idx = Math.max(0, start ? SC.findIndex((s) => s.id === start) : 0);
    requestAnimationFrame(() => root && root.classList.add("on"));
    playing = true; load();
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
    try { localStorage.setItem(PK.key ? SEEN_KEY + ":" + PK.key : SEEN_KEY, "1"); } catch (e) {}
  }
  function close() {
    if (!root) return;
    cancelAnimationFrame(raf);
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVis);
    const r = root; root = null; listOpen = false;
    r.classList.remove("on");
    setTimeout(() => { try { r.remove(); } catch (e) {} }, 380);
  }
  /* ══════════ ★★ 2026-10-31 アプリのガイド（pack）══════════
     XevaTour.pack("magibattle", { name: "MagiBattle", sub: "GUIDE", logo: "../thumbs/MagiBattle.jpg"（このページから見た場所）, title: "MagiBattle の遊び方", scenes: [...], css: "..." })
     章の書き方は SCENES と同じ（html・tl・lead・pts・where・dur）。見本の部品は XevaTour.kit。 */
  function pack(key, def) {
    PACKS[key] = { key, name: def.name || key, sub: def.sub || "GUIDE", logo: "", logoAbs: def.logo || A("brand-xevarion-orb.png"), title: def.title || ((def.name || key) + " ガイド"), all: def.scenes || [], css: def.css || "" };
    return PACKS[key];
  }

  /* ══════════ ★★ 2026-10-31 画面ごとの入口（ご指定「使い方のアニメーションにアクセスをわかりやすく（それぞれの画面など）。ただし、しつこすぎない範囲で」）
     ・ホームのシート（ミッション・メール・お知らせ・ショップ・設定…）の見出しと、ガチャ・図鑑・コミュニティの上のバーに小さな「？ 使い方」。
       押すと、その画面の章だけを再生（一覧から「はじめから全部」も見られる）。
     ・その画面を<b>はじめて開いたときだけ</b>、ボタンの下に小さな吹き出し（4秒で消える・画面ごとに1回きり・押せばすぐ消える）。 */
  const SPOTS = [
    { sel: "#missionModal .mm-head", before: ".mm-close", ids: ["missions"], k: "missions" },
    { sel: "#mailModal .mail-head", before: ".mail-close", ids: ["mail"], k: "mail" },
    { sel: "#newsModal .nm-head", before: ".nm-close", ids: ["mail", "events"], k: "news" },
    { sel: "#xhSchedSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["events"], k: "sched" },
    { sel: "#xhAppsSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["apps", "learn", "play", "party", "info"], k: "apps" },
    { sel: "#xhGridSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["apps", "learn", "play", "party", "info"], k: "grid" },
    { sel: "#xhSetSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["settings", "sync", "offline"], k: "set" },
    { sel: "#xhXosSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["settings"], k: "xos" },
    { sel: "#xhShopHubSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["shop", "seal"], k: "shophub" },
    { sel: "#xhShopSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["shop"], k: "shop" },
    { sel: "#xhSealSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["seal"], k: "seal" },
    { sel: "#xhUpdSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["offline"], k: "upd", quiet: 1 },
    { sel: "#xhOffSheet .xh-sheet-head", before: ".xh-sheet-x", ids: ["offline"], k: "off" },
    { sel: "#accSettingsOv .accset-head", before: ".accset-x", ids: ["sync", "settings"], k: "acc" },
    { page: /gacha\.html/, sel: ".gh", after: "h1", ids: ["gacha", "seal"], k: "pg-gacha" },
    { page: /characters\.html/, sel: ".gh", after: "h1", ids: ["chars"], k: "pg-chars" },
    { page: /community\.html/, sel: ".top", after: ".ttl", ids: ["community"], k: "pg-com" },
  ];
  const HINT_KEY = "xeva_tour_hint_v1";
  const QB_CSS = ".xt-qb{display:inline-flex;align-items:center;gap:3px;flex:none;height:28px;padding:0 10px 0 6px;margin:0 6px;border-radius:99px;border:1.5px solid #cfdcff;background:#f2f6ff;color:#4b63ff;font:900 11.5px/1 'Noto Sans JP',system-ui,sans-serif;cursor:pointer;white-space:nowrap;vertical-align:middle;position:relative}" +
    ".xt-qb i{width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#4b63ff;color:#fff;font-style:normal;font-size:11px}" +
    ".xt-qb:active{transform:scale(.95)}" +
    ".xt-qb .xt-tip{position:absolute;right:-4px;top:calc(100% + 9px);z-index:50;width:max-content;max-width:200px;padding:7px 11px;border-radius:12px;background:#22345c;color:#fff;font-size:11.5px;font-weight:800;line-height:1.45;box-shadow:0 8px 22px rgba(20,30,80,.28);white-space:normal;text-align:left;animation:xtTip .35s cubic-bezier(.2,1.3,.4,1) both;pointer-events:none}" +
    ".xt-qb .xt-tip::before{content:'';position:absolute;right:22px;top:-6px;border:6px solid transparent;border-top:0;border-bottom-color:#22345c}" +
    ".xt-qb.lf .xt-tip{right:auto;left:-4px}.xt-qb.lf .xt-tip::before{right:auto;left:22px}" +
    "@keyframes xtTip{from{opacity:0;transform:translateY(-6px) scale(.9)}to{opacity:1;transform:none}}" +
    ".xt-all{margin-left:6px;height:28px;padding:0 12px;border-radius:99px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#fff;font:inherit;font-size:12px;font-weight:800;cursor:pointer}";
  function hintSeen(k) { try { return !!(JSON.parse(localStorage.getItem(HINT_KEY) || "{}") || {})[k]; } catch (e) { return true; } }
  function hintMark(k) { try { const o = JSON.parse(localStorage.getItem(HINT_KEY) || "{}") || {}; o[k] = 1; localStorage.setItem(HINT_KEY, JSON.stringify(o)); } catch (e) {} }
  /* ボタン1つ（ほかのアプリからも使える：XevaTour.button({ ids, pack, k, cls })） */
  function button(o) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "xt-qb" + (o.cls ? " " + o.cls : ""); b.setAttribute("aria-label", "使い方を見る");
    b.innerHTML = "<i>?</i>使い方";
    b.addEventListener("click", (ev) => { ev.stopPropagation(); ev.preventDefault(); const tp = b.querySelector(".xt-tip"); if (tp) tp.remove(); if (o.k) hintMark(o.k); haptic(); open(o.start || null, { pack: o.pack, ids: o.ids }); });
    return b;
  }
  /* その画面がはじめて見えたときだけ、吹き出しを4秒 */
  function hintOnce(b, k) {
    if (!k || hintSeen(k)) return;
    const show = () => {
      if (hintSeen(k) || !b.isConnected || !b.offsetParent) return false;
      hintMark(k);
      const tp = document.createElement("span"); tp.className = "xt-tip"; tp.textContent = "この画面の使い方は、ここから動画のように見られます";
      b.appendChild(tp); setTimeout(() => { try { tp.remove(); } catch (e) {} }, 4200);
      /* 画面の外にはみ出すなら、反対側にそろえる（スマホのせまい画面） */
      try { const r = tp.getBoundingClientRect(); if (r.right > innerWidth - 6) { tp.style.left = "auto"; tp.style.right = "-4px"; } if (tp.getBoundingClientRect().left < 6) { tp.style.right = "auto"; tp.style.left = "-4px"; } } catch (e) {}
      return true;
    };
    let n = 0; const iv = setInterval(() => { if (show() !== false || ++n > 400) clearInterval(iv); }, 700);
  }
  function attach() {
    if (!document.getElementById("xtQbCss")) { const st = document.createElement("style"); st.id = "xtQbCss"; st.textContent = QB_CSS; document.head.appendChild(st); }
    const path = location.pathname || "";
    SPOTS.forEach((s) => {
      if (s.page && !s.page.test(path)) return;
      const box = document.querySelector(s.sel); if (!box || box.querySelector(".xt-qb")) return;
      const b = button({ ids: s.ids, k: s.k, start: s.ids[0] });
      if (s.before) { const ref = box.querySelector(s.before); if (ref) ref.parentNode.insertBefore(b, ref); else box.appendChild(b); }
      else if (s.after) { const ref = box.querySelector(s.after); if (ref) ref.insertAdjacentElement("afterend", b); else box.appendChild(b); b.classList.add("lf"); }
      if (!s.quiet) hintOnce(b, s.k);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(attach, 50)); else setTimeout(attach, 50);

  window.XevaTour = { open, close, SCENES, pack, button, hintOnce, attach,
    kit: { A, IC, SV, at, fmt, top, tabs, icon },
    seen: (k) => { try { return !!localStorage.getItem(k ? SEEN_KEY + ":" + k : SEEN_KEY); } catch (e) { return false; } } };
  /* 同じページの中で #guide に変わったとき（デベロッパーノートのリンクなど）も開く */
  window.addEventListener("hashchange", () => {
    if ((location.hash || "").toLowerCase() !== "#guide") return;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    open();
  });
})();

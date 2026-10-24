/* ══════════════════════════════════════════════════════════════
   ★★ 2026-10-24 デベロッパーノート（ご指定「アップデートしたら NIKKE のようなデベロッパーノートを表示。
      アップデート内容や、キャラ追加の場合は画像を表示」「それに伴い、キャラ追加時のポップアップは削除」）

   ・ホームに入ったとき（ログインボーナス・誕生日のあと）に、まだ見ていない版のノートを1回だけ出す。
     前の「新キャラクターのお知らせ」（xevarion.js の showNewChars）の代わり。
   ・新キャラは、その版の chars と「まだ見せていない新キャラ」（XEVA.newCharsUnseen）を合わせて大きな絵で出す。
     ノートを読んだあとに追加日（since）を迎えたキャラは、キャラの節だけのノートで出す。
   ・見たら XEVA.markNewCharsSeen() も呼ぶ（同じキャラは二度出ない）。
   ・★★ 2026-10-24 ご指定「設定でデベロッパーノートの履歴をそれぞれ押して見られるように」
     → XevDevNotes.history()（設定の「デベロッパーノート」）＝版の一覧。押すとその版のノート・「一覧にもどる」で戻る。

   ★ 版を足すときは NOTES の<b>先頭</b>に1つ足すだけ（id はその版だけの文字・見た印に使う）。
       chars … [{ id（MagiBurst の id）, el（属性）, rar, img（横長の絵）}]
       secs  … [{ h（見出し）, img（小さな絵）, href（開くアプリ）, items（箇条書き・<b> 可）}]
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const KEY = "xev_devnotes_seen_v1";
  const EL = { fire: ["火", "#ff5d47"], water: ["水", "#38a6ff"], wood: ["木", "#2fbf71"], light: ["光", "#f0b429"], dark: ["闇", "#8a55f0"] };

  const NOTES = [
    {
      id: "2026-10-24", date: "2026.10.24", title: "レベル・スタミナの廃止と、学びの入口の統合",
      lead: "いつも XEVARION を遊んでいただき、ありがとうございます。<br>今回は<b>レベルとスタミナの廃止</b>、<b>同期のしくみの作り直し</b>、<b>MagiLex と MagiChemLex の統合</b>など、大きめの変更をおこないました。主な内容をお知らせします。",
      chars: [
        { id: "hisako", el: "water", rar: "UR", img: "img/Hisako_w.webp" },
        { id: "alice", el: "dark", rar: "UR", img: "img/Alice_w.webp" },
        { id: "miki", el: "wood", rar: "UR", img: "img/Miki_w.webp" },
      ],
      secs: [
        { h: "XEVARION 全体", img: "thumbs/Xevarion.png", items: [
          "<b>レベルとスタミナを廃止</b>しました。ホームの上は XEVA（上）とジェム（下）の縦1列に",
          "<b>同期の改善</b>：ほかの端末で XEVA が増えない・ジェムなどが増えつづけることがあったのを修正（端末ごとの増減を足し合わせる方式に）",
          "両替チケットは<b>1枚＝💎10</b>に（これまでは💎5）",
          "パートナーを表示しないときのホームを、バナーとアプリが見やすい並びに",
          "ガチャ演出の <b>SKIP ボタン</b>を新しいデザインに・ガチャ一覧の「MagiAbyss で使える」印を控えめに",
          "ガチャタブの「無料」の印が消えないことがあったのを修正",
          "MagiDerby のアイコンに「締切間近」「払戻」の印",
          "このデベロッパーノートは、設定の「デベロッパーノート」から<b>これまでの回</b>も見られます",
        ] },
        { h: "MagiLex × MagiChemLex", img: "thumbs/MagiLex.jpg", href: "MagiLex/index.html", items: [
          "MagiLex を開くと <b>MagiChemLex</b> と <b>旧MagiLex</b> を選べるように（ホームの MagiChemLex の場所には MagiQuiz）",
          "旧MagiLex は化学・英単語・古文だけに（問題の追加は終了します）",
          "KP 交換所のキャラの性能・画像が正しく出ないことがあったのを修正",
          "MagiChemLex の WP 交換所に <b>ミキ</b>（UR・120 WP・1体）",
        ] },
        { h: "MagiDerby", img: "thumbs/MagiDerby.jpg", href: "MagiDerby/index.html", items: [
          "買った馬券を<b>実際の馬券のような券面</b>で一覧に。券を押すと大きく表示・結果が出た券は押して確認（そのとき払い戻し）",
          "結果待ちの券に<b>勝敗の確定日</b>・上の<b>マイページ</b>から成績",
          "発売は<b>木曜 0:00</b> から。<b>枠順の発表前は馬名で</b>買え、発表されしだい券に馬番が入ります（出走しなくなった馬を含む組は返還）",
          "アプリを開いていなくても出馬表やオッズを取りに行くように",
          "馬券を買う画面がスクロールできないことがあったのを修正・スマホで上の表示が重ならないように",
        ] },
        { h: "MagiShift", img: "thumbs/MagiShift.jpg", href: "MagiShift/index.html", items: [
          "2位からの順位は<b>守り7割・長さ3割</b>の点で（ほかの人の「あと1つでそろう」マスを防ぐと守り +1）。名前の横に 🛡 守りの数",
          "試合のあとに<b>最後の盤面</b>を見たり、1手ずつ見返したりできるように",
          "準備画面の「もどる」ボタンの位置を修正",
        ] },
        { h: "MagiQuiz（β版）", img: "thumbs/MagiQuiz.jpg", href: "MagiQuiz/index.html", items: [
          "問題は MagiChemLex の<b>基礎の改題</b>だけに",
          "チーム戦は名前を入れたあと<b>くじ引き</b>でチーム分け",
          "ばくだんは小さく・危なくなると<b>画面のふちが光る</b>",
        ] },
        { h: "MagiAbyss", img: "thumbs/MagiAbyss.jpg?v=2", href: "MagiAbyss/index.html", items: [
          "町の人も、操作するキャラと同じ細かさのドット絵に",
          "超極煌祭に <b>ヒサコ</b>（水）・<b>アリス</b>（闇）・WP 交換所に <b>ミキ</b>（木）。どれも MagiAbyss 専用の UR",
        ] },
      ],
    },
  ];

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function seen() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } }
  function markSeen(id) { try { localStorage.setItem(KEY, id); } catch (e) {} }
  function master(id) { try { return (window.XEVA && XEVA.MB_CHARS || []).find((c) => c.mbId === id) || null; } catch (e) { return null; } }
  function info(id) { return (window.MB_NEW_CHARS || []).find((n) => n && n.id === id) || {}; }

  /* ── 見た目（このファイルだけで完結） ── */
  const CSS = `
#xdnOv{position:fixed;inset:0;z-index:1006;display:none;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top,0px)) 10px max(12px,env(safe-area-inset-bottom,0px));
  background:radial-gradient(120% 80% at 50% 0%,rgba(40,70,140,.55),rgba(6,10,26,.82));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:'Noto Sans JP',sans-serif}
#xdnOv.open{display:flex;animation:xdnIn .28s ease-out}
@keyframes xdnIn{from{opacity:0}}
#xdnOv .xdn{position:relative;width:min(640px,100%);max-height:100%;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:#f4f6fb;color:#1b2440;
  box-shadow:0 24px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.12);animation:xdnUp .38s cubic-bezier(.2,1.2,.3,1)}
@keyframes xdnUp{from{transform:translateY(24px) scale(.97);opacity:0}}
#xdnOv .xdn-hd{position:relative;flex:none;padding:16px 52px 14px 18px;color:#fff;overflow:hidden;
  background:linear-gradient(115deg,#141c3c 0%,#24346e 55%,#3b2a6e 100%)}
#xdnOv .xdn-hd::before{content:"";position:absolute;right:-30px;top:-40px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(255,210,90,.35),transparent 70%)}
#xdnOv .xdn-hd::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#ffd257,#ff6f91,#7aa8ff)}
#xdnOv .xdn-k{font:900 11px/1 'Orbitron',sans-serif;letter-spacing:.32em;color:#ffd257}
#xdnOv .xdn-t{position:relative;margin-top:7px;font-size:18px;font-weight:900;line-height:1.35}
#xdnOv .xdn-d{position:relative;margin-top:5px;font:700 11px/1 'Orbitron',sans-serif;letter-spacing:.12em;color:rgba(255,255,255,.7)}
#xdnOv .xdn-x{position:absolute;right:12px;top:12px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:16px;font-weight:900;cursor:pointer;z-index:2}
#xdnOv .xdn-b{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:14px 14px 4px}
#xdnOv .xdn-lead{margin:0 2px 14px;font-size:13px;line-height:1.75;color:#2a3558}
#xdnOv .xdn-lead b{color:#3b2a8e}
#xdnOv .xdn-sh{display:flex;align-items:center;gap:8px;margin:16px 2px 9px;font-size:14.5px;font-weight:900;color:#1b2440}
#xdnOv .xdn-sh i{flex:none;font:900 11px/1 'Orbitron',sans-serif;font-style:normal;color:#fff;background:#24346e;padding:5px 7px;border-radius:6px;letter-spacing:.06em}
#xdnOv .xdn-sh::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,rgba(36,52,110,.3),transparent);order:1}
#xdnOv .xdn-sh a{order:2;flex:none;font-size:11.5px;font-weight:900;color:#3b5bd0;text-decoration:none}
/* 新キャラ（横長の大きな絵） */
#xdnOv .xdn-chars{display:flex;flex-direction:column;gap:10px}
#xdnOv .xdn-ch{position:relative;border-radius:14px;overflow:hidden;background:#0d1024;aspect-ratio:16/9;box-shadow:0 6px 18px rgba(16,24,60,.22)}
#xdnOv .xdn-ch img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%}
#xdnOv .xdn-ch .g{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,10,28,.88) 0%,rgba(8,10,28,.55) 38%,transparent 66%)}
#xdnOv .xdn-ch .tx{position:absolute;left:0;top:0;bottom:0;width:62%;padding:12px 14px;display:flex;flex-direction:column;justify-content:flex-end;color:#fff}
#xdnOv .xdn-ch .tg{align-self:flex-start;font:900 9px/1 'Orbitron',sans-serif;letter-spacing:.14em;padding:4px 7px;border-radius:5px;background:var(--c,#ffb84d);color:#111}
#xdnOv .xdn-ch .nm{margin-top:6px;font-size:22px;font-weight:900;line-height:1.1;text-shadow:0 2px 10px rgba(0,0,0,.6)}
#xdnOv .xdn-ch .nm small{margin-left:6px;font:900 11px 'Orbitron',sans-serif;color:var(--c,#ffb84d)}
#xdnOv .xdn-ch .el{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-left:6px;border-radius:50%;font-size:11px;font-weight:900;vertical-align:3px;color:#fff}
#xdnOv .xdn-ch .ct{margin-top:5px;font-size:11.5px;font-weight:800;line-height:1.5;color:rgba(255,255,255,.88)}
#xdnOv .xdn-ch .wh{margin-top:5px;font-size:10.5px;font-weight:800;line-height:1.45;color:var(--c,#ffb84d)}
#xdnOv .xdn-ch .ac{display:flex;gap:6px;margin-top:8px}
#xdnOv .xdn-ch .ac a{flex:none;font-size:11px;font-weight:900;text-decoration:none;color:#fff;padding:6px 10px;border-radius:99px;background:rgba(255,255,255,.16)}
#xdnOv .xdn-ch .ac a.go{background:var(--c,#ffb84d);color:#111}
/* 節（アプリごと） */
#xdnOv .xdn-sec{display:flex;gap:11px;padding:12px;border-radius:14px;background:#fff;box-shadow:0 1px 0 rgba(16,24,60,.06),0 4px 14px rgba(16,24,60,.06);margin-bottom:9px}
#xdnOv .xdn-sec>img{flex:none;width:52px;height:52px;border-radius:12px;object-fit:cover;background:#e8ecf6}
#xdnOv .xdn-sec .bd{flex:1;min-width:0}
#xdnOv .xdn-sec ul{margin:0;padding:0 0 0 15px;font-size:12.5px;line-height:1.65;color:#2a3558}
#xdnOv .xdn-sec li{margin:2px 0}
#xdnOv .xdn-sec li::marker{color:#7a8bd0}
#xdnOv .xdn-sec b{color:#1b2440}
#xdnOv .xdn-sign{margin:14px 4px 10px;text-align:right;font-size:12px;font-weight:800;color:#5a6890;line-height:1.6}
#xdnOv .xdn-ft{flex:none;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px) * 0);background:#fff;border-top:1px solid #e3e8f3}
#xdnOv .xdn-ok{width:100%;height:46px;border:0;border-radius:13px;font-size:15px;font-weight:900;color:#fff;cursor:pointer;
  background:linear-gradient(115deg,#24346e,#3b2a8e);box-shadow:0 6px 16px rgba(36,52,110,.3)}
/* 履歴（版の一覧） */
#xdnOv .xdn-hl{display:flex;flex-direction:column;gap:9px}
#xdnOv .xdn-hi{display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;border:0;border-radius:14px;background:#fff;text-align:left;cursor:pointer;font-family:inherit;color:#1b2440;
  box-shadow:0 1px 0 rgba(16,24,60,.06),0 4px 14px rgba(16,24,60,.06);transition:transform .12s}
#xdnOv .xdn-hi:active{transform:scale(.98)}
#xdnOv .xdn-hi .dt{flex:none;width:54px;text-align:center;font:900 11px/1.25 'Orbitron',sans-serif;color:#fff;background:linear-gradient(160deg,#24346e,#3b2a8e);border-radius:10px;padding:7px 4px}
#xdnOv .xdn-hi .dt b{display:block;font-size:15px}
#xdnOv .xdn-hi .tt{flex:1;min-width:0}
#xdnOv .xdn-hi .tt b{display:block;font-size:13.5px;font-weight:900;line-height:1.4}
#xdnOv .xdn-hi .tt small{display:block;margin-top:3px;font-size:11px;font-weight:700;color:#5a6890;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#xdnOv .xdn-hi .fc{flex:none;display:flex}
#xdnOv .xdn-hi .fc img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:50% 20%;border:2px solid #fff;margin-left:-9px;background:#e8ecf6}
#xdnOv .xdn-hi .ar{flex:none;font-size:18px;font-weight:900;color:#7a8bd0}
#xdnOv .xdn-hi .nw{display:inline-block;margin-left:6px;font:900 9px/1 'Orbitron',sans-serif;color:#fff;background:#ff5a7a;padding:3px 5px;border-radius:5px;vertical-align:2px}
#xdnOv .xdn-ft.two{display:flex;gap:8px}
#xdnOv .xdn-back{flex:none;height:46px;padding:0 16px;border:0;border-radius:13px;font-size:14px;font-weight:900;color:#24346e;background:#eef1f8;cursor:pointer;font-family:inherit}
@media (max-width:420px){#xdnOv .xdn-hi .fc{display:none}}
@media (max-width:420px){#xdnOv .xdn-sec{gap:9px;padding:11px 10px}#xdnOv .xdn-sec>img{width:38px;height:38px;border-radius:10px}/* スマホ：絵を上に大きく・文字は絵の下（絵に文字をかぶせない） */
  #xdnOv .xdn-ch{aspect-ratio:auto}#xdnOv .xdn-ch img{position:relative;display:block;height:auto;aspect-ratio:16/9}
  #xdnOv .xdn-ch .g{background:linear-gradient(180deg,transparent 40%,rgba(8,10,28,.0) 50%);display:none}
  #xdnOv .xdn-ch .tx{position:relative;width:100%;padding:10px 12px 12px;background:linear-gradient(180deg,#141a3a,#0d1024)}
  #xdnOv .xdn-ch .tg{position:absolute;left:10px;top:-24px}}
@media (min-width:560px){#xdnOv .xdn-ch{aspect-ratio:2/1}#xdnOv .xdn-t{font-size:20px}}
@media (prefers-reduced-motion:reduce){#xdnOv.open,#xdnOv .xdn{animation:none}}`;

  function charCard(c) {
    const m = master(c.id); if (!m) return "";
    const n = info(c.id), col = n.color || "#ffb84d", el = EL[c.el];
    const th = String(m.file || "").replace(/^\.\.\//, ""), full = th.replace(/(^|\/)t_/, "$1");
    const src = c.img || full;
    const go = n.mode ? '<a class="go" href="gacha.html#' + esc(n.mode) + '">ガチャへ</a>' : "";
    return '<div class="xdn-ch" style="--c:' + esc(col) + '"><img src="' + esc(src) + '" alt="' + esc(m.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + esc(full) + '\'"><div class="g"></div>' +
      '<div class="tx"><span class="tg">NEW CHARACTER</span>' +
      '<div class="nm">' + esc(m.name) + (el ? '<span class="el" style="background:' + el[1] + '">' + el[0] + "</span>" : "") + "<small>" + esc(c.rar || m.rarLabel || "SSR") + "</small></div>" +
      (n.catch ? '<div class="ct">' + esc(n.catch) + "</div>" : "") +
      (n.where ? '<div class="wh">' + esc(n.where) + "</div>" : "") +
      '<div class="ac"><a href="characters.html?c=' + encodeURIComponent(c.id) + '">性能を見る</a>' + go + "</div></div></div>";
  }

  function build(N, extra, onlyChars, fromList) {
    const list = (onlyChars ? [] : (N.chars || []).slice());
    (extra || []).forEach((c) => { if (!list.some((x) => x.id === c.mbId)) list.push({ id: c.mbId }); });
    let k = 0;
    const num = () => String(++k).padStart(2, "0");
    let body = "";
    if (!onlyChars) body += '<p class="xdn-lead">' + N.lead + "</p>";
    const cards = list.map(charCard).filter(Boolean);
    if (cards.length) body += '<div class="xdn-sh"><i>' + num() + "</i>新キャラクター</div><div class=\"xdn-chars\">" + cards.join("") + "</div>";
    if (!onlyChars) (N.secs || []).forEach((s) => {
      body += '<div class="xdn-sh"><i>' + num() + "</i>" + esc(s.h) + (s.href ? '<a href="' + esc(s.href) + '">開く ›</a>' : "") + "</div>" +
        '<div class="xdn-sec">' + (s.img ? '<img src="' + esc(s.img) + '" alt="" loading="lazy">' : "") + '<div class="bd"><ul>' +
        s.items.map((x) => "<li>" + x + "</li>").join("") + "</ul></div></div>";
    });
    if (!onlyChars) body += '<div class="xdn-sign">これからも XEVARION をよろしくお願いします。<br>XEVARION 開発チーム</div>';
    return '<div class="xdn" role="dialog" aria-modal="true" aria-label="デベロッパーノート">' +
      '<div class="xdn-hd"><div class="xdn-k">' + (onlyChars ? "NEW CHARACTER" : "DEVELOPER NOTES") + '</div><div class="xdn-t">' + (onlyChars ? "新しい仲間が加わりました" : esc(N.title)) + '</div><div class="xdn-d">' + esc(N.date) + '</div><button class="xdn-x" type="button" aria-label="閉じる">✕</button></div>' +
      '<div class="xdn-b">' + body + "</div>" +
      (fromList ? '<div class="xdn-ft two"><button class="xdn-back" type="button">‹ 一覧にもどる</button><button class="xdn-ok" type="button">閉じる</button></div></div>'
        : '<div class="xdn-ft"><button class="xdn-ok" type="button">確認しました</button></div></div>');
  }
  /* 履歴：版の一覧（新しい順）。押すとその版のノート */
  function buildList() {
    const items = NOTES.map((N, i) => {
      const dd = String(N.date || "").split(".");
      const faces = (N.chars || []).slice(0, 3).map((c) => { const m = master(c.id); return m ? '<img src="' + esc(String(m.file || "").replace(/^\.\.\//, "")) + '" alt="">' : ""; }).join("");
      const sub = (N.secs || []).map((s) => s.h).join("・");
      return '<button class="xdn-hi" type="button" data-i="' + i + '"><span class="dt">' + esc(dd[0] || "") + "<b>" + esc((dd[1] || "") + "." + (dd[2] || "")) + "</b></span>" +
        '<span class="tt"><b>' + esc(N.title) + (i === 0 ? '<i class="nw">NEW</i>' : "") + "</b><small>" + esc(sub) + "</small></span>" +
        (faces ? '<span class="fc">' + faces + "</span>" : "") + '<span class="ar">›</span></button>';
    }).join("");
    return '<div class="xdn" role="dialog" aria-modal="true" aria-label="デベロッパーノートの履歴">' +
      '<div class="xdn-hd"><div class="xdn-k">DEVELOPER NOTES</div><div class="xdn-t">これまでのデベロッパーノート</div><div class="xdn-d">' + NOTES.length + ' NOTES</div><button class="xdn-x" type="button" aria-label="閉じる">✕</button></div>' +
      '<div class="xdn-b"><p class="xdn-lead">アップデートごとのお知らせです。見たい回を押してください。</p><div class="xdn-hl">' + items + "</div></div>" +
      '<div class="xdn-ft"><button class="xdn-ok" type="button">閉じる</button></div></div>';
  }

  function shell() {
    if (!document.getElementById("xdnCss")) { const st = document.createElement("style"); st.id = "xdnCss"; st.textContent = CSS; document.head.appendChild(st); }
    let ov = document.getElementById("xdnOv");
    if (!ov) { ov = document.createElement("div"); ov.id = "xdnOv"; document.body.appendChild(ov); }
    return ov;
  }
  function wire(ov) {
    const close = () => { ov.classList.remove("open"); ov.innerHTML = ""; };
    ov.querySelector(".xdn-x").onclick = close;
    ov.querySelector(".xdn-ok").onclick = close;
    ov.onclick = (e) => { if (e.target === ov) close(); };
    ov.classList.add("open");
  }
  function open(N, extra, onlyChars, fromList) {
    const ov = shell();
    ov.innerHTML = build(N, extra, onlyChars, fromList);
    wire(ov);
    const bk = ov.querySelector(".xdn-back"); if (bk) bk.onclick = history;
  }
  function history() {
    const ov = shell();
    ov.innerHTML = buildList();
    wire(ov);
    ov.querySelectorAll(".xdn-hi").forEach((b) => { b.onclick = () => open(NOTES[Number(b.dataset.i)], [], false, true); });
  }

  /* ホームに入ったときに呼ぶ。出したら true */
  function maybeShow() {
    const N = NOTES[0]; if (!N) return false;
    let unseen = [];
    try { unseen = (window.XEVA && XEVA.newCharsUnseen && XEVA.newCharsUnseen()) || []; } catch (e) {}
    const fresh = seen() !== N.id;
    if (!fresh && !unseen.length) return false;
    open(N, unseen, !fresh);
    markSeen(N.id);
    try { window.XEVA && XEVA.markNewCharsSeen && XEVA.markNewCharsSeen(); } catch (e) {}
    return true;
  }

  window.XevDevNotes = { maybeShow: maybeShow, open: () => open(NOTES[0], [], false), history: history, NOTES: NOTES };
})();

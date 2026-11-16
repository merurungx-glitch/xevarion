/* ============================================================
   MagiGura Plate — はじめの画面と準備（XEVARION 版）
   ★★ 2026-11-17 ご指定
     ・「MagiQuiz のようなアカウント紐づけと、名前やアイコンなどを設定する機能」
       → 席ごとに 名前（8文字まで）・アイコン（XEVARION の UR キャラ／名前の頭文字）・アカウント連携（表示名で検索 → 4桁 PIN）・
         「この端末の本人」（XEVA をこの端末へ直接＝オフラインでも入る）。
     ・「ゲームのプレイで席の場所を名前と位置で設定できるように」
       → iPad のまわりの席（10か所）から、だれがどこに座るかを決める。番は時計まわり（はじめの人は試合ごとにとなりへ）。
     ・「はじめからゲームへの画面は MagiQuiz のように全画面で同じに」
       → はじめの画面（ロゴ・あそぶ・前回と同じで始める・あそび方・記録）と、準備の3段（① メンバー ② 席 ③ ルール）を
         MagiQuiz と同じ全画面の作り（上に手順の札・白いカード・下に黄色いボタン）に。色は MagiGura Plate のロゴの青。
   ・保存は guraplate_setup_v1（この端末だけ・同期しない）。PIN は保存しない。
   ============================================================ */
(function (root) {
  'use strict';
  const GP = root.GP, A = GP.Account, AU = GP.Audio;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const COLORS = ['#ff5d5d', '#4da3ff', '#35d07f', '#ffd447', '#b98cff', '#ff9a3d', '#ff7fcb', '#2fe0d0'];
  /* 席（横長の画面で考えた名前。時計まわりの順）。L＝左の短い辺・T＝上の長い辺・R＝右の短い辺・B＝下の長い辺
     ★ 短い辺のまん中（Lc・Rc）は、同じ辺の2席（Ld・Lu／Ru・Rd）といっしょには使えない（札が重なる） */
  const RING = ['Ld', 'Lc', 'Lu', 'TL', 'TR', 'Ru', 'Rc', 'Rd', 'BR', 'BL'];
  const CLASH = { Lc: ['Ld', 'Lu'], Ld: ['Lc'], Lu: ['Lc'], Rc: ['Ru', 'Rd'], Ru: ['Rc'], Rd: ['Rc'] };
  /* 人数ごとのはじめの席（これまでの並びと同じ） */
  const DEF = {
    2: ['Lc', 'Rc'], 3: ['Lc', 'TR', 'BR'], 4: ['BL', 'TL', 'TR', 'BR'], 5: ['Lc', 'TL', 'TR', 'BR', 'BL'], 6: ['Lc', 'TL', 'TR', 'Rc', 'BR', 'BL'],
    7: ['Ld', 'Lu', 'TL', 'TR', 'Rc', 'BR', 'BL'], 8: ['Ld', 'Lu', 'TL', 'TR', 'Ru', 'Rd', 'BR', 'BL']
  };
  const SIZES = [['short', '少なめ'], ['normal', 'ふつう'], ['long', '多め']];
  const STOCK_N = { 2: 10, 3: 8, 4: 7, 5: 6, 6: 5, 7: 5, 8: 4 }, SIZE_MUL = { short: 0.7, normal: 1, long: 1.4 };
  const stockOf = (n, size) => Math.max(3, Math.round(STOCK_N[n] * SIZE_MUL[size]));
  const KEY = 'guraplate_setup_v1';

  const blank = (i) => ({ name: 'プレイヤー' + (i + 1), pic: '', link: null, owner: false, slot: '' });
  const S = { n: 4, size: 'normal', played: false, all: COLORS.map((c, i) => blank(i)) };
  const seats = () => S.all.slice(0, S.n);

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        n: S.n, size: S.size, played: S.played,
        players: S.all.map((p) => ({ name: p.name, pic: p.pic || '', owner: !!p.owner, slot: p.slot || '',
          link: p.link && p.link.uid ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || '', charId: p.link.charId || '' } : null }))
      }));
    } catch (e) { /* 保存できない環境でも遊べる */ }
  }
  function load() {
    try {
      let d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d) {
        /* 1台で遊ぶ版（XEVARION の外の MagiGura Plate）の人数・手持ちを引きつぐ（同じ場所に置いたときだけ） */
        const o = JSON.parse(localStorage.getItem('guraplate_v1') || 'null');
        if (o) d = { n: o.n, size: o.size };
      }
      if (!d) { fixSlots(); return; }
      if (d.n >= 2 && d.n <= 8) S.n = d.n;
      if (SIZES.some((s) => s[0] === d.size)) S.size = d.size;
      S.played = !!d.played;
      if (Array.isArray(d.players)) d.players.slice(0, 8).forEach((sp, i) => {
        const p = S.all[i]; if (!sp) return;
        if (sp.name) p.name = String(sp.name).slice(0, 8);
        p.pic = sp.pic ? String(sp.pic).slice(0, 24) : '';
        p.owner = !!sp.owner;
        p.slot = RING.indexOf(sp.slot) >= 0 ? sp.slot : '';
        if (sp.link && sp.link.uid) p.link = { uid: sp.link.uid, name: sp.link.name, charFile: sp.link.charFile || '', charId: sp.link.charId || '', confirmed: false };
      });
    } catch (e) { /* こわれていたら初めから */ }
    fixSlots();
  }

  /* ══ 席の割りあて ══ */
  function canUse(slot, taken) { return taken.indexOf(slot) < 0 && !(CLASH[slot] || []).some((c) => taken.indexOf(c) >= 0); }
  /* 席がかぶっている・空いている人に、空いている席をわりあてる（人数を変えたとき・はじめて） */
  function fixSlots() {
    const ps = seats(), taken = [];
    ps.forEach((p) => { if (p.slot && canUse(p.slot, taken)) taken.push(p.slot); else p.slot = ''; });
    ps.forEach((p) => {
      if (p.slot) return;
      const s = (DEF[S.n] || []).concat(RING).find((x) => canUse(x, taken));
      if (s) { p.slot = s; taken.push(s); }
    });
    /* それでも置けない（まん中の席がじゃまをしている）ときは、人数のはじめの並びにもどす */
    if (ps.some((p) => !p.slot)) ps.forEach((p, i) => { p.slot = DEF[S.n][i]; });
  }
  function resetSlots() { seats().forEach((p, i) => { p.slot = DEF[S.n][i]; }); }

  /* ゲームに渡すメンバー（時計まわりの順＝番の順。1人目の席から数える） */
  function players() {
    const me = A.me(), r0 = RING.indexOf(seats()[0].slot), ord = (s) => (RING.indexOf(s) - r0 + RING.length) % RING.length;
    return seats().map((p, i) => {
      const acc = p.owner ? me : p.link && p.link.uid ? p.link : null;
      return { m: i, name: (p.owner && me ? me.name : p.name) || 'プレイヤー' + (i + 1), color: COLORS[i], slot: p.slot,
        uid: !p.owner && p.link && p.link.uid && p.link.confirmed !== false ? p.link.uid : '', owner: !!(p.owner && me),
        img: acc ? A.thumb(acc) : A.picSrc(p.pic) };
    }).sort((a, b) => ord(a.slot) - ord(b.slot));
  }
  const nameOf = (p) => { const me = A.me(); return (p.owner && me ? String(me.name).slice(0, 8) : p.name) || '?'; };
  const imgOf = (p) => { const me = A.me(), acc = p.owner ? me : p.link && p.link.uid ? p.link : null; return acc ? A.thumb(acc) : A.picSrc(p.pic); };

  /* ══ 見た目の部品 ══ */
  function avatar(o, cls) {
    const ch = esc(String(o.name || '?').slice(0, 1));
    return '<span class="gav' + (cls ? ' ' + cls : '') + '" style="--c:' + (o.color || '#4da3ff') + '"><i>' + ch + '</i>' +
      (o.img ? '<img src="' + esc(o.img) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }
  const P = (d) => '<svg class="ic" viewBox="0 0 24 24">' + d + '</svg>';
  const IC = {
    back: P('<path d="M15 5l-7 7 7 7"/>'), next: P('<path d="M9 5l7 7-7 7"/>'), help: P('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 114 2.1c-.8.6-1.6 1-1.6 2"/><circle cx="12" cy="17" r=".6" class="fl"/>'),
    gear: P('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
    link: P('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
    check: P('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), x: P('<path d="M6 6l12 12M18 6L6 18"/>'), plus: P('<path d="M12 5v14M5 12h14"/>'),
    pen: P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), lock: P('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    seat: P('<rect x="3" y="5" width="18" height="12" rx="2.5"/><path d="M9 20h6"/>'), people: P('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.4a6.2 6.2 0 0 1 12.4 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 13.6a5.6 5.6 0 0 1 3.2 5"/>'),
    book: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>'),
    trophy: P('<path d="M7.4 4.2h9.2v4.4a4.6 4.6 0 0 1-9.2 0z"/><path d="M7.4 5.8H4.6a2.8 2.8 0 0 0 2.9 3.6M16.6 5.8h2.8a2.8 2.8 0 0 1-2.9 3.6"/><path d="M12 13.2v3.4M8.6 20h6.8"/>'),
    again: P('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'), gift: P('<rect x="3.5" y="8.5" width="17" height="12" rx="2"/><path d="M12 8.5v12M3.5 12.5h17"/><path d="M12 8.5c-2-3.6-6-3.6-6-1.2 0 1.2 2 1.2 6 1.2zM12 8.5c2-3.6 6-3.6 6-1.2 0 1.2-2 1.2-6 1.2z"/>'),
    sound: P('<path d="M4 9v6h3.6L13 19.4V4.6L7.6 9H4Z"/><path d="M15.5 8.6a4.8 4.8 0 010 6.8"/>'), clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    music: P('<path d="M9 18V5.4l10-2v12.2"/><circle cx="6.4" cy="18" r="2.6"/><circle cx="16.4" cy="15.6" r="2.6"/>'),
    stack: P('<ellipse cx="12" cy="17" rx="8" ry="3"/><path d="M4 17v-3c0 1.7 3.6 3 8 3s8-1.3 8-3v3"/><rect x="8" y="5" width="8" height="6" rx="1.5"/>')
  };
  function slotName(id) {
    const g = GP.Game && GP.Game.slotGeom ? GP.Game.slotGeom(seats().map((p) => p.slot)) : null;
    const s = g && g.slots[id]; if (!s) return id;
    const W = g.W, H = g.H, r = ((s.rot % 360) + 360) % 360;
    if (r === 90 || r === 270) {                       /* 左右のふち（札が縦） */
      const side = s.x < W / 2 ? '左' : '右', t = s.y / H;
      return side + (t < 0.4 ? '・上' : t > 0.6 ? '・下' : '・まん中');
    }
    const side = s.y < H / 2 ? '上' : '下', t = s.x / W;
    return side + (t < 0.4 ? '・左' : t > 0.6 ? '・右' : '・まん中');
  }

  /* ══════════════════════════════════════════════════════════════
     画面の出し分け（MagiQuiz の .scr と同じ：全画面の板を1枚だけ出す）
     ══════════════════════════════════════════════════════════════ */
  const UI = { step: 1, sel: -1 };
  function show(id) {
    $('front').classList.add('on');
    document.querySelectorAll('#front .scr').forEach((s) => s.classList.toggle('on', s.id === id));
    document.body.dataset.scr = id;
    const s = $(id); if (s) s.scrollTop = 0;
    if (GP.Bgm) GP.Bgm.scene('front');
  }
  function hide() { $('front').classList.remove('on'); document.body.dataset.scr = 'play'; closeSheet(); if (GP.Bgm) GP.Bgm.scene('play'); }
  const isFront = () => $('front').classList.contains('on');

  /* ── ① はじめの画面 ── */
  function showTitle() {
    show('titleScr');
    const k = stockOf(S.n, S.size), sz = (SIZES.find((s) => s[0] === S.size) || SIZES[1])[1];
    $('titleScr').innerHTML =
      '<a class="t-home" href="../index.html" aria-label="XEVARION へもどる">' + IC.back + '<span>XEVARION</span></a>' +
      '<button class="t-gear" data-a="opts" aria-label="設定">' + IC.gear + '</button>' +
      '<div class="t-main">' +
        '<button class="t-logo" data-a="start" aria-label="あそぶ"><img src="img/logo.png" alt="MagiGura Plate" width="400" height="400"></button>' +
        '<h1 class="t-name"><span>Magi</span><b>Gura</b> <em>Plate</em></h1>' +
        '<p class="t-tag">かたむく皿に、順番にコマを置いていこう！</p>' +
        '<div class="t-btns">' +
          '<button class="buzz lg" data-a="start"><span>あそぶ</span></button>' +
          (S.played ? '<button class="t-last" data-a="quick">' + IC.again + '<span>前回と同じで始める<small>' + S.n + '人・' + esc(sz) + '（1人 ' + k + ' こ）</small></span></button>' : '') +
          '<div class="t-sub"><button data-a="how">' + IC.book + '<span>あそび方</span></button><button data-a="records">' + IC.trophy + '<span>記録</span></button></div>' +
        '</div>' +
        '<p class="t-src">1台の iPad をまん中に置いて <b>2〜8人</b>・順位で XEVA・オフラインOK</p>' +
      '</div>';
  }

  /* ── ② 準備：① メンバー ② 席 ③ ルール ── */
  const STEP_NM = ['メンバー', '席', 'ルール'];
  function openSetup(step) {
    AU.unlock();
    UI.step = step || 1; UI.sel = -1;
    show('setupScr');
    renderSetup();
    refreshProfiles();
  }
  function renderSetup() {
    const s = UI.step;
    const head = '<div class="su-top"><button class="su-back" data-a="suBack" aria-label="もどる">' + IC.back + '</button>' +
      '<ol class="su-steps">' + STEP_NM.map((t, i) => '<li class="' + (i + 1 === s ? 'on' : i + 1 < s ? 'done' : '') + '"><button data-a="suGo" data-v="' + (i + 1) + '"><i>' + (i + 1 < s ? IC.check : i + 1) + '</i><span>' + t + '</span></button></li>').join('') + '</ol>' +
      '<button class="su-help" data-a="how" aria-label="あそび方">' + IC.help + '</button></div>';
    let body = '', foot = '';
    if (s === 1) { body = stepMembers(); foot = '<button class="buzz wide" data-a="suNext"><span>つぎへ（席）</span></button>'; }
    else if (s === 2) { body = stepSeats(); foot = '<button class="buzz wide" data-a="suNext"><span>つぎへ（ルール）</span></button>'; }
    else {
      body = stepRules();
      foot = '<p class="su-sum">' + S.n + '人・1人 <b>' + stockOf(S.n, S.size) + '</b> こ・番は時計まわり</p><button class="buzz wide" data-a="begin"><span>ゲームスタート</span></button>';
    }
    const y = ($('setupScr').querySelector('.su-body') || {}).scrollTop || 0;
    $('setupScr').innerHTML = head + '<div class="su-body">' + body + '</div><div class="su-foot">' + foot + '</div>';
    if (UI.keep) { const b = $('setupScr').querySelector('.su-body'); if (b) b.scrollTop = y; UI.keep = false; }
  }
  const repaint = () => { UI.keep = true; renderSetup(); };

  /* メンバー */
  function stepMembers() {
    const me = A.me();
    const rows = seats().map((p, i) => {
      const col = COLORS[i], linked = !p.owner && p.link && p.link.uid, ok = linked && p.link.confirmed !== false;
      const lk = p.owner ? '<span class="st-lk me">' + IC.check + '<span>XEVA 受取</span></span>'
        : !linked ? '<button class="st-lk" data-a="link" data-i="' + i + '">' + IC.link + '<span>連携</span></button>'
        : ok ? '<button class="st-lk on" data-a="link" data-i="' + i + '">' + IC.check + '<span>' + esc(p.link.name) + '</span></button>'
        : '<button class="st-lk wait" data-a="link" data-i="' + i + '">' + IC.lock + '<span>' + esc(p.link.name) + '（要確認）</span></button>';
      const av = avatar({ name: nameOf(p), color: col, img: imgOf(p) }, 'md');
      return '<div class="st" data-i="' + i + '" style="--c:' + col + '">' +
        (!p.owner && !linked ? '<button class="st-av" data-a="pic" data-i="' + i + '" aria-label="' + (i + 1) + '人目のアイコンをえらぶ">' + av + '<i class="st-ed">' + IC.pen + '</i></button>' : av) +
        '<div class="st-m"><input class="st-nm" maxlength="8" value="' + esc(nameOf(p)) + '" aria-label="' + (i + 1) + '人目の名前" enterkeyhint="done"' + (p.owner ? ' readonly' : '') + '>' +
          '<div class="st-row">' + lk +
            (me ? '<label class="st-own' + (p.owner ? ' on' : '') + '"><input type="checkbox" data-c="own" data-i="' + i + '"' + (p.owner ? ' checked' : '') + '><i>' + IC.check + '</i><span>この端末の本人</span></label>' : '') +
          '</div></div>' +
        (S.n > 2 ? '<button class="st-x" data-a="del" data-i="' + i + '" aria-label="この人を外す">' + IC.x + '</button>' : '') + '</div>';
    }).join('');
    return '<h2 class="su-h">だれが参加する？</h2>' +
      '<div class="st-list">' + rows + '</div>' +
      (S.n < 8 ? '<button class="st-add" data-a="add">' + IC.plus + 'プレイヤーを追加（' + S.n + '/8）</button>' : '') +
      '<div class="su-tip">' + IC.gift + '<div><b>順位で XEVA がもらえます</b>（1位 ' + A.PRIZES()[0] + '・2位 ' + A.PRIZES()[1] + '・3位 ' + A.PRIZES()[2] + '…）。「この端末の本人」にチェックすると<b>オフラインでも</b>この端末に入ります。ほかの人はアカウント連携すると本人の XEVORA アカウントに届きます（全員が ' + A.MIN_TURNS + ' 回以上置いた試合だけ）。</div></div>';
  }

  /* 席 */
  function stepSeats() {
    const ps = seats(), order = players();
    return '<h2 class="su-h">どこに座る？</h2>' +
      '<p class="su-note">名前をえらんでから、<b>座る場所</b>をタップ（ほかの人の席なら入れかわります）。iPad をテーブルのまん中に置いたときの、まわりの席です。</p>' +
      '<div class="smap-wrap">' + mapHTML() + '</div>' +
      '<div class="sq-list">' + ps.map((p, i) => '<button class="sq' + (UI.sel === i ? ' on' : '') + '" data-a="sel" data-i="' + i + '" style="--c:' + COLORS[i] + '">' +
        avatar({ name: nameOf(p), color: COLORS[i], img: imgOf(p) }, 'sm') + '<b>' + esc(nameOf(p)) + '</b><span>' + IC.seat + esc(slotName(p.slot)) + '</span></button>').join('') + '</div>' +
      '<div class="sq-order"><span>' + IC.clock + '番は<b>時計まわり</b>：</span>' + order.map((o) => '<em style="--c:' + o.color + '">' + esc(o.name) + '</em>').join('<i>›</i>') + '</div>' +
      '<button class="st-add sm" data-a="reset">' + IC.again + 'はじめの並びにもどす</button>';
  }
  function mapHTML() {
    if (!GP.Game || !GP.Game.slotGeom) return '';
    const ps = seats(), used = ps.map((p) => p.slot), g = GP.Game.slotGeom(used);
    const box = $('setupScr'), avail = Math.min(720, Math.max(260, ((box && box.clientWidth) || 400) - 28));
    const MW = Math.round(Math.min(avail, (((box && box.clientHeight) || 600) * 0.52) * g.W / g.H));
    const sc = MW / g.W, MH = Math.round(g.H * sc);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    let h = '<div class="smap" style="width:' + MW + 'px;height:' + MH + 'px">' +
      '<i class="splate" style="left:' + (g.cx * sc) + 'px;top:' + (g.cy * sc) + 'px;width:' + (g.R * 2 * sc) + 'px;height:' + (g.R * 2 * sc) + 'px"></i>';
    RING.forEach((id) => {
      const s = g.slots[id], k = ps.findIndex((p) => p.slot === id);
      /* 地図の中の印は、地図からはみ出さないように内側へ寄せる */
      const style = 'left:' + clamp(s.x * sc, 58, MW - 58).toFixed(1) + 'px;top:' + clamp(s.y * sc, 20, MH - 20).toFixed(1) + 'px';
      if (k >= 0) {
        const p = ps[k];
        h += '<button class="sl on' + (UI.sel === k ? ' sel' : '') + '" data-a="slot" data-s="' + id + '" style="' + style + ';--c:' + COLORS[k] + '">' + avatar({ name: nameOf(p), color: COLORS[k], img: imgOf(p) }, 'sm') + '<span>' + esc(nameOf(p)) + '</span></button>';
      } else {
        /* えらんでいる人の今の席は「空く」ものとして見る（その人が動けるか） */
        const free = canUse(id, used.filter((x, j) => j !== UI.sel));
        h += '<button class="sl' + (free ? '' : ' no') + '" data-a="slot" data-s="' + id + '" style="' + style + '"' + (free ? '' : ' disabled') + '><span>' + esc(slotName(id)) + '</span></button>';
      }
    });
    return h + '</div>';
  }
  /* 席をタップ：えらんでいる人をそこへ（だれかいれば入れかえ） */
  function tapSlot(id) {
    const ps = seats(), k = ps.findIndex((p) => p.slot === id);
    if (UI.sel < 0) { if (k >= 0) { UI.sel = k; AU.tap(); repaint(); } else toast('先に、座る人の名前をえらんでください'); return; }
    const me = ps[UI.sel];
    if (k === UI.sel) { UI.sel = -1; repaint(); return; }
    if (k >= 0) { const t = ps[k].slot; ps[k].slot = me.slot; me.slot = t; }
    else {
      const others = ps.filter((p, j) => j !== UI.sel).map((p) => p.slot);
      if (!canUse(id, others)) { AU.bad(); toast('その場所は、となりの席と重なるので使えません'); return; }
      me.slot = id;
    }
    AU.rotate(); UI.sel = -1; save(); repaint();
    if (GP.Game) GP.Game.applySetup();
  }

  /* ルール */
  function stepRules() {
    const seg = (list, cur, a) => '<div class="su-seg">' + list.map((o) => '<button class="' + (o[0] === cur ? 'on' : '') + '" data-a="' + a + '" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
    return '<h2 class="su-h">ルール</h2>' +
      '<section class="ru-c"><div class="ru"><div class="ru-l">' + IC.stack + '<b>手持ちのコマ</b></div>' + seg(SIZES, S.size, 'size') +
        '<p class="ru-n">1人 <b>' + stockOf(S.n, S.size) + '</b> こ（' + S.n + '人のとき）。手持ちを全部置いた人の勝ち。落としたコマは自分の手持ちにもどります。</p></div></section>' +
      '<section class="ru-c">' + bgmHTML() + '<div class="ru"><div class="ru-l">' + IC.sound + '<b>効果音</b></div>' + seg([['on', 'ON'], ['off', 'OFF']], AU.isOn() ? 'on' : 'off', 'sound') + '</div></section>' +
      '<section class="ru-c"><div class="ru"><div class="ru-l">' + IC.clock + '<b>番の順</b></div><p class="ru-n">席の<b>時計まわり</b>（はじめの人は試合ごとにとなりへ）。席は「② 席」で変えられます。</p></div></section>';
  }

  /* ══ ★★ 2026-11-17 BGM（オリジナル曲・自分の曲・オフ。bgm.js） ══ */
  const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  function bgmHTML() {
    const B = GP.Bgm ? GP.Bgm.info() : { mode: 'off', has: false };
    return '<div class="ru"><div class="ru-l">' + IC.music + '<b>BGM</b></div>' +
      '<div class="su-seg">' + [['orig', 'オリジナル曲'], ['mine', '自分の曲'], ['off', 'オフ']].map((o) => '<button class="' + (B.mode === o[0] ? 'on' : '') + '" data-a="bgm" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>' +
      '<div class="bgm-mine">' + (B.has
        ? '<span class="bgm-f">' + IC.music + '<b>' + esc(B.name) + '</b><small>' + mb(B.size) + '</small></span><button class="btn sm" data-a="bgmPick">かえる</button><button class="btn sm danger" data-a="bgmClear">消す</button>'
        : '<button class="btn sm" data-a="bgmPick">' + IC.plus + '自分の曲をえらぶ</button>') + '</div>' +
      '<p class="ru-n">「自分の曲」は、この端末の中の曲ファイル（m4a・mp3 など・' + (GP.Bgm ? GP.Bgm.MAX_MB : 40) + ' MB まで）を、<b>この端末にだけ</b>入れて流します（ほかの端末やクラウドには送りません）。</p></div>';
  }
  function bgmRepaint() { if (!$('sheetOv').classList.contains('hidden') && $('sheet').classList.contains('opt')) openOpts(); else if (document.body.dataset.scr === 'setupScr') repaint(); }

  /* ══ アイコン（UR キャラ・名前のまま） ══ */
  function openPic(i) {
    const p = S.all[i]; if (!p) return;
    const col = COLORS[i], list = A.urList();
    const cell = (v, inner, nm, on) => '<button class="pc' + (on ? ' on' : '') + '" data-a="picSet" data-i="' + i + '" data-v="' + esc(v) + '" style="--c:' + col + '">' + inner + '<small>' + esc(nm) + '</small></button>';
    sheet('<h3 class="sh-t">' + IC.people + esc(nameOf(p)) + ' のアイコン</h3><p class="sh-p">XEVARION に実装されている <b>UR キャラ</b>からえらべます（連携していない人・オフラインのとき用）。</p>' +
      '<div class="pgrid">' + cell('', avatar({ name: nameOf(p), color: col }, 'md'), '名前のまま', !p.pic) +
      list.map((c) => cell(c.mbId, '<span class="pim"><img src="' + esc(c.file) + '" alt="" loading="lazy"></span>', c.name, p.pic === c.mbId)).join('') + '</div>' +
      '<div class="sh-b"><button class="btn" data-a="shClose">とじる</button></div>', 'pick');
  }

  /* ══ アカウント連携（検索 → 4桁） ══ */
  const LK = { i: 0, step: 'search', rows: [], q: '', hit: null, pin: '', msg: '', busy: false, confirm: false };
  function openLink(i) {
    const p = S.all[i];
    if (navigator.onLine === false) { toast('オフライン中は連携できません。自分の端末なら「この端末の本人」にチェックするだけで XEVA が入ります'); return; }
    if (p.link && p.link.uid && p.link.confirmed !== false) {
      sheet('<h3 class="sh-t">' + IC.link + esc(p.link.name) + '</h3><p class="sh-p">連携を解除しますか？</p><div class="sh-b"><button class="btn danger" data-a="lkOff" data-i="' + i + '">解除する</button><button class="btn" data-a="shClose">そのまま</button></div>', 'lk');
      return;
    }
    Object.assign(LK, { i, step: 'search', rows: [], q: p.name && !/^プレイヤー\d$/.test(p.name) ? p.name : '', hit: null, pin: '', msg: '', busy: false, confirm: false });
    if (p.link && p.link.uid) { LK.step = 'pin'; LK.hit = p.link; LK.confirm = true; }
    paintLink();
  }
  function lkRow(r, k) { return '<button class="lk-r" data-a="lkPick" data-k="' + k + '">' + avatar({ name: r.name, img: A.thumb(r), color: '#4da3ff' }, 'sm') + '<b>' + esc(r.name) + '</b>' + IC.next + '</button>'; }
  function paintLink() {
    const recent = A.recent().filter((r) => !S.all.some((p) => p.link && p.link.uid === r.uid));
    let html;
    if (LK.step === 'search') {
      html = '<h3 class="sh-t">' + IC.link + 'アカウント連携</h3><p class="sh-p">順位の XEVA が、その人の XEVORA アカウントに届きます。</p>' +
        '<div class="lk-s"><input id="lkQ" type="search" placeholder="表示名で検索" value="' + esc(LK.q) + '" maxlength="20" autocomplete="off" enterkeyhint="search"><button class="btn pri" data-a="lkSearch"' + (LK.busy ? ' disabled' : '') + '>' + (LK.busy ? '検索中…' : '検索') + '</button></div>' +
        (LK.msg ? '<p class="lk-msg">' + esc(LK.msg) + '</p>' : '') +
        (LK.rows.length ? '<div class="lk-l">' + LK.rows.map((r, k) => lkRow(r, 'r' + k)).join('') + '</div>' : '') +
        (!LK.rows.length && recent.length ? '<p class="lk-h">この端末で連携したことのある人</p><div class="lk-l">' + recent.slice(0, 5).map((r, k) => lkRow(r, 'h' + k)).join('') + '</div>' : '') +
        '<div class="sh-b"><button class="btn" data-a="shClose">とじる</button></div>';
    } else {
      const dots = [0, 1, 2, 3].map((k) => '<i class="' + (k < LK.pin.length ? 'on' : '') + '"></i>').join('');
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'bs'];
      html = '<div class="lk-who">' + avatar({ name: LK.hit.name, img: A.thumb(LK.hit), color: '#4da3ff' }, 'md') + '<div><b>' + esc(LK.hit.name) + '</b><small>' + (LK.confirm ? '前回の連携を引きつぎます' : 'このアカウントに連携します') + '</small></div></div>' +
        '<p class="sh-p center">4桁の PIN を入力</p><div class="lk-dots' + (LK.msg ? ' bad' : '') + '">' + dots + '</div><p class="lk-msg center">' + esc(LK.msg || ' ') + '</p>' +
        '<div class="lk-pad">' + keys.map((k) => (k === '' ? '<span></span>' : '<button data-a="lkKey" data-v="' + k + '"' + (LK.busy ? ' disabled' : '') + '>' + (k === 'bs' ? IC.back : k) + '</button>')).join('') + '</div>' +
        '<div class="sh-b">' + (LK.confirm ? '<button class="btn danger" data-a="lkOff" data-i="' + LK.i + '">連携を解除</button>' : '<button class="btn" data-a="lkBack">検索にもどる</button>') + '<button class="btn" data-a="shClose">やめる</button></div>';
    }
    sheet(html, 'lk');
    const q = $('lkQ');
    if (q) {
      q.addEventListener('input', () => { LK.q = q.value; });
      q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lkSearch(); } });
    }
  }
  async function lkSearch() {
    const nm = String(LK.q || '').trim();
    if (!nm) { LK.msg = '表示名を入力してください'; paintLink(); return; }
    LK.busy = true; LK.msg = ''; paintLink();
    const r = await A.search(nm);
    LK.busy = false;
    if (r.error) LK.msg = '通信できませんでした';
    else { LK.rows = r.rows || []; if (!LK.rows.length) LK.msg = 'その名前のアカウントが見つかりません'; }
    paintLink();
  }
  function lkPick(k) {
    const list = k[0] === 'r' ? LK.rows : A.recent().filter((r) => !S.all.some((p) => p.link && p.link.uid === r.uid));
    const r = list[+k.slice(1)]; if (!r) return;
    if (('hasPw' in r || 'gamePwHash' in r) && !r.gamePwHash && !r.hasPw) { LK.msg = 'このアカウントは4桁 PIN が未設定です（XEVARION の設定で決められます）'; paintLink(); return; }
    const me = A.me();
    if (me && me.uid && r.uid === me.uid) { LK.msg = '自分のアカウントは「この端末の本人」にチェックしてください'; paintLink(); return; }
    if (S.all.some((p, j) => j !== LK.i && j < S.n && p.link && p.link.uid === r.uid)) { LK.msg = 'そのアカウントはほかの席で使われています'; paintLink(); return; }
    LK.hit = { uid: r.uid, name: r.name, charFile: r.charFile || '', charId: r.charId || '' }; LK.step = 'pin'; LK.pin = ''; LK.msg = ''; paintLink();
  }
  async function lkKey(v) {
    if (LK.busy) return;
    if (v === 'bs') LK.pin = LK.pin.slice(0, -1); else if (LK.pin.length < 4) LK.pin += v;
    LK.msg = ''; AU.tap();
    paintLink();
    if (LK.pin.length < 4) return;
    LK.busy = true; paintLink();
    const r = await A.verify(LK.hit.uid, LK.pin);
    LK.busy = false; LK.pin = '';
    if (r.error) { LK.msg = '通信できませんでした'; paintLink(); return; }
    if (!r.ok) { LK.msg = 'PIN が正しくありません'; AU.bad(); paintLink(); return; }
    const p = S.all[LK.i];
    p.link = Object.assign({}, LK.hit, { confirmed: true }); p.owner = false;
    if (/^プレイヤー\d$/.test(p.name) || !p.name) p.name = String(LK.hit.name).slice(0, 8);
    A.remember(p.link); save(); closeSheet(); repaint(); AU.safe();
    toast('🔗 ' + LK.hit.name + ' を連携しました');
    if (GP.Game) GP.Game.applySetup();
  }
  function setOwner(i, on) {
    const me = A.me(); if (!me) return;
    S.all.forEach((p, j) => { if (p.owner) { p.owner = false; if (p.name === String(me.name).slice(0, 8)) p.name = 'プレイヤー' + (j + 1); } });
    if (on) { const p = S.all[i]; p.owner = true; p.link = null; p.name = String(me.name).slice(0, 8); }
    AU.tap(); save(); repaint();
    if (GP.Game) GP.Game.applySetup();
  }
  /* 前に連携した人の名前・アイコンを新しくする（オンラインのときだけ・1回） */
  let profDone = false;
  function refreshProfiles() {
    if (profDone) return; profDone = true;
    const jobs = S.all.filter((p) => p.link && p.link.uid).map((p) => A.refresh(p.link).then((v) => {
      if (!v || !p.link) return false;
      const ch = (v.charFile || '') !== (p.link.charFile || '') || (v.name || '') !== (p.link.name || '');
      p.link.name = v.name || p.link.name; p.link.charFile = v.charFile || ''; p.link.charId = v.charId || '';
      return ch;
    }));
    if (jobs.length) Promise.all(jobs).then((rs) => { if (!rs.some(Boolean)) return; save(); if (document.body.dataset.scr === 'setupScr') repaint(); if (GP.Game) GP.Game.applySetup(); });
  }

  /* ══ 記録・設定 ══ */
  function openRecords() {
    const st = A.stats(), rows = Object.keys(st).map((k) => Object.assign({ id: k }, st[k])).sort((a, b) => (b.wins || 0) - (a.wins || 0) || (b.games || 0) - (a.games || 0));
    sheet('<h3 class="sh-t">' + IC.trophy + '記録</h3>' +
      (rows.length ? '<div class="rc-l">' + rows.slice(0, 30).map((r, i) => '<div class="rc"><i>' + (i + 1) + '</i><b>' + esc(r.name) + (r.id === 'me' ? '<small>この端末の本人</small>' : r.id.indexOf('local:') === 0 ? '' : '<small>連携</small>') + '</b><span>' + (r.wins || 0) + '勝 / ' + (r.games || 0) + '試合</span></div>').join('') + '</div>'
        : '<p class="sh-p center">まだ記録がありません。遊ぶと、勝った数と試合の数がここにたまります。</p>') +
      '<div class="sh-b"><button class="btn" data-a="shClose">とじる</button></div>', 'rec');
  }
  function openOpts() {
    sheet('<h3 class="sh-t">' + IC.gear + '設定</h3>' +
      bgmHTML() +
      '<div class="ru"><div class="ru-l">' + IC.sound + '<b>効果音</b></div><div class="su-seg"><button class="' + (AU.isOn() ? 'on' : '') + '" data-a="sound" data-v="on">ON</button><button class="' + (AU.isOn() ? '' : 'on') + '" data-a="sound" data-v="off">OFF</button></div></div>' +
      '<p class="sh-p">メンバー・アイコン・連携・席は「あそぶ」の準備（① メンバー ② 席）で変えられます。</p>' +
      '<div class="sh-b"><button class="btn" data-a="shClose">とじる</button></div>', 'opt');
  }

  /* ══ シート・トースト ══ */
  function sheet(html, cls) { const s = $('sheet'); s.className = 'sheet ' + (cls || ''); s.innerHTML = html; s.scrollTop = 0; $('sheetOv').classList.remove('hidden'); }
  function closeSheet() { $('sheetOv').classList.add('hidden'); }
  let toastT = 0;
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2800); }

  /* ══ 操作 ══ */
  function begin() {
    if (S.n < 2) return;
    S.played = true; save();
    AU.unlock(); AU.tap();
    hide();
    if (GP.Game) GP.Game.start();
  }
  function onClick(e) {
    const b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) return;
    const a = b.dataset.a, i = +b.dataset.i;
    if (a !== 'slot' && a !== 'lkKey') { try { AU.unlock(); } catch (err) { /* 音が使えない */ } }
    if (a === 'start') { AU.tap(); openSetup(1); }
    else if (a === 'quick') begin();
    else if (a === 'how') { AU.tap(); $('howto').classList.remove('hidden'); }
    else if (a === 'records') { AU.tap(); openRecords(); }
    else if (a === 'opts') { AU.tap(); openOpts(); }
    else if (a === 'suBack') { AU.tap(); if (UI.step > 1) { UI.step--; UI.sel = -1; renderSetup(); } else showTitle(); }
    else if (a === 'suGo') { AU.tap(); UI.step = +b.dataset.v || 1; UI.sel = -1; renderSetup(); }
    else if (a === 'suNext') { AU.tap(); UI.step = Math.min(3, UI.step + 1); UI.sel = -1; renderSetup(); }
    else if (a === 'begin') begin();
    else if (a === 'sel') { UI.sel = UI.sel === i ? -1 : i; AU.tap(); repaint(); }
    else if (a === 'slot') tapSlot(b.dataset.s);
    else if (a === 'add') {
      if (S.n >= 8) return;
      const p = S.all[S.n]; S.n++;
      if (!p.name) p.name = 'プレイヤー' + S.n;
      p.slot = ''; fixSlots(); AU.tap(); save(); repaint();
      if (GP.Game) GP.Game.applySetup();
    } else if (a === 'del') {
      if (S.n <= 2) return;
      /* 外した人は後ろへ（名前・連携は残す＝次に足したとき戻る） */
      const p = S.all.splice(i, 1)[0]; p.slot = ''; S.all.splice(S.n - 1, 0, p); S.n--;
      UI.sel = -1; fixSlots(); AU.tap(); save(); repaint();
      if (GP.Game) GP.Game.applySetup();
    } else if (a === 'reset') { resetSlots(); UI.sel = -1; AU.tap(); save(); repaint(); if (GP.Game) GP.Game.applySetup(); }
    else if (a === 'size') { S.size = b.dataset.v; save(); AU.tap(); repaint(); if (GP.Game) GP.Game.applySetup(); }
    else if (a === 'sound') { if (GP.Game) GP.Game.setSound(b.dataset.v === 'on'); AU.tap(); if ($('sheet').classList.contains('opt') && !$('sheetOv').classList.contains('hidden')) openOpts(); else repaint(); }
    else if (a === 'bgm') { const v = b.dataset.v; if (v === 'mine' && GP.Bgm && !GP.Bgm.info().has) { $('bgmFile').click(); return; } if (GP.Bgm) { GP.Bgm.kick(); GP.Bgm.setMode(v); } AU.tap(); bgmRepaint(); }
    else if (a === 'bgmPick') { $('bgmFile').click(); }
    else if (a === 'bgmClear') { if (GP.Bgm) GP.Bgm.clearMine().then(() => { toast('自分の曲を、この端末から消しました'); bgmRepaint(); }); }
    else if (a === 'pic') openPic(i);
    else if (a === 'picSet') { const p = S.all[i]; if (p) { p.pic = b.dataset.v || ''; save(); } closeSheet(); repaint(); AU.tap(); if (GP.Game) GP.Game.applySetup(); }
    else if (a === 'link') openLink(i);
    else if (a === 'lkSearch') lkSearch();
    else if (a === 'lkPick') lkPick(b.dataset.k);
    else if (a === 'lkKey') lkKey(b.dataset.v);
    else if (a === 'lkBack') { LK.step = 'search'; LK.msg = ''; paintLink(); }
    else if (a === 'lkOff') { const p = S.all[+b.dataset.i]; if (p) { p.link = null; save(); } closeSheet(); repaint(); toast('連携を解除しました'); if (GP.Game) GP.Game.applySetup(); }
    else if (a === 'shClose') { AU.tap(); closeSheet(); }
  }
  function init() {
    load();
    $('front').addEventListener('click', onClick);
    $('sheetOv').addEventListener('click', (e) => { if (e.target === $('sheetOv')) closeSheet(); else onClick(e); });
    $('front').addEventListener('input', (e) => {
      const t = e.target;
      if (t.matches && t.matches('.st-nm')) {
        const i = +t.closest('.st').dataset.i; S.all[i].name = t.value.slice(0, 8); save();
        const av = t.closest('.st').querySelector('.gav i'); if (av) av.textContent = t.value.slice(0, 1) || '?';
        if (GP.Game) GP.Game.applySetup();
      }
    });
    $('front').addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.c === 'own') setOwner(+t.dataset.i, t.checked); });
    /* ★★ 2026-11-17 自分の曲（端末のファイルをえらぶ → この端末の IndexedDB にだけ） */
    $('bgmFile').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f || !GP.Bgm) return;
      const r = await GP.Bgm.pickFile(f);
      if (r.ok) toast('🎵 「' + f.name + '」を BGM にしました（この端末だけ）');
      else toast(r.error === 'big' ? '曲のファイルが大きすぎます（' + GP.Bgm.MAX_MB + ' MB まで）' : r.error === 'type' ? '曲のファイル（m4a・mp3 など）をえらんでください' : '曲を入れられませんでした');
      bgmRepaint();
    });
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (document.body.dataset.scr === 'setupScr' && UI.step === 2) repaint(); }, 150); });
  }

  GP.Setup = { init, showTitle, openSetup, hide, isFront, players, avatar, esc, toast, get size() { return S.size; }, get n() { return S.n; }, RING, COLORS };
})(window);

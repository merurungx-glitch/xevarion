/* ============================================================
   MagiYacht — はじめの画面と準備（MagiQuiz と同じ全画面の作り）
   ★★ 2026-11-18 ご指定「MagiQuiz のようなデザインと、アカウント連携や名前登録やアイコン設定や途中保存機能」
   ------------------------------------------------------------
   ・はじめの画面：ロゴ・あそぶ・つづきから（保存した試合）・前回と同じで始める・あそび方・記録・設定
   ・準備の2段：① メンバー（名前8文字・アイコン＝UR キャラ／頭文字・アカウント連携・この端末の本人・CPU とその強さ）
                ② ルール（順番・CPU の速さ・BGM・効果音）
   ・1〜8人（CPU も数える）。ひとりならスコアアタック。
   ・保存は magiyacht_setup_v1（この端末だけ・同期しない）。PIN は保存しない。
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY, A = MY.Account, AU = MY.Audio;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const COLORS = ['#ff5d6c', '#3f9bff', '#2fcf7d', '#ffb21f', '#a77bff', '#ff7f3a', '#ff6fc0', '#25d3c6'];
  const CPU_LV = [[1, 'よわい'], [2, 'ふつう'], [3, 'つよい']];
  const KEY = 'magiyacht_setup_v1';
  const blank = (i) => ({ name: 'プレイヤー' + (i + 1), pic: '', link: null, owner: false, cpu: 0 });
  const S = { n: 2, played: false, order: 'draw', speed: 'normal', all: COLORS.map((c, i) => blank(i)) };
  const seats = () => S.all.slice(0, S.n);

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        n: S.n, played: S.played, order: S.order, speed: S.speed,
        players: S.all.map((p) => ({ name: p.name, pic: p.pic || '', owner: !!p.owner, cpu: p.cpu || 0,
          link: p.link && p.link.uid ? { uid: p.link.uid, name: p.link.name, charFile: p.link.charFile || '', charId: p.link.charId || '' } : null }))
      }));
    } catch (e) { /* 保存できない環境でも遊べる */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d) {
        /* はじめて：この端末の本人を1人目に、2人目は CPU（ふつう） */
        const me = A.me();
        if (me) { S.all[0].owner = true; S.all[0].name = String(me.name).slice(0, 8); }
        S.all[1].cpu = 2; S.all[1].name = 'CPU';
        return;
      }
      if (d.n >= 1 && d.n <= 8) S.n = d.n;
      S.played = !!d.played;
      if (d.order === 'fixed' || d.order === 'draw') S.order = d.order;
      if (d.speed === 'fast' || d.speed === 'normal') S.speed = d.speed;
      if (Array.isArray(d.players)) d.players.slice(0, 8).forEach((sp, i) => {
        const p = S.all[i]; if (!sp) return;
        if (sp.name) p.name = String(sp.name).slice(0, 8);
        p.pic = sp.pic ? String(sp.pic).slice(0, 24) : '';
        p.owner = !!sp.owner;
        p.cpu = [1, 2, 3].indexOf(sp.cpu) >= 0 ? sp.cpu : 0;
        if (sp.link && sp.link.uid && !p.cpu) p.link = { uid: sp.link.uid, name: sp.link.name, charFile: sp.link.charFile || '', charId: sp.link.charId || '', confirmed: false };
      });
    } catch (e) { /* こわれていたら初めから */ }
  }

  /* ゲームに渡すメンバー（並び＝この準備の順。くじ引きは game.js） */
  function players() {
    const me = A.me();
    return seats().map((p, i) => {
      const acc = p.cpu ? null : p.owner ? me : p.link && p.link.uid ? p.link : null;
      return {
        m: i, name: (p.owner && me ? String(me.name).slice(0, 8) : p.name) || 'プレイヤー' + (i + 1), color: COLORS[i],
        cpu: p.cpu || 0,
        uid: !p.cpu && !p.owner && p.link && p.link.uid && p.link.confirmed !== false ? p.link.uid : '',
        owner: !!(!p.cpu && p.owner && me),
        img: p.cpu ? '' : acc ? A.thumb(acc) : A.picSrc(p.pic)
      };
    });
  }
  const nameOf = (p) => { const me = A.me(); return (p.owner && me ? String(me.name).slice(0, 8) : p.name) || '?'; };
  const imgOf = (p) => { if (p.cpu) return ''; const me = A.me(), acc = p.owner ? me : p.link && p.link.uid ? p.link : null; return acc ? A.thumb(acc) : A.picSrc(p.pic); };

  /* ══ 見た目の部品 ══ */
  const ROBO = '<svg class="robo" viewBox="0 0 24 24"><rect x="5" y="8" width="14" height="11" rx="3.5"/><path d="M12 4.5V8M9.2 13.2h.01M14.8 13.2h.01M9.5 16.3h5"/><circle cx="12" cy="4" r="1.2"/></svg>';
  function avatar(o, cls) {
    const ch = esc(String(o.name || '?').slice(0, 1));
    return '<span class="gav' + (cls ? ' ' + cls : '') + (o.cpu ? ' cpu' : '') + '" style="--c:' + (o.color || '#3f9bff') + '">' +
      (o.cpu ? ROBO : '<i>' + ch + '</i>') +
      (o.img ? '<img src="' + esc(o.img) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }
  const P = (d) => '<svg class="ic" viewBox="0 0 24 24">' + d + '</svg>';
  const IC = {
    back: P('<path d="M15 5l-7 7 7 7"/>'), next: P('<path d="M9 5l7 7-7 7"/>'), help: P('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 114 2.1c-.8.6-1.6 1-1.6 2"/><circle cx="12" cy="17" r=".6" class="fl"/>'),
    gear: P('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
    link: P('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
    check: P('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), x: P('<path d="M6 6l12 12M18 6L6 18"/>'), plus: P('<path d="M12 5v14M5 12h14"/>'),
    pen: P('<path d="M4 20h4L19 9l-4-4L4 16z"/>'), lock: P('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    people: P('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.4a6.2 6.2 0 0 1 12.4 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 13.6a5.6 5.6 0 0 1 3.2 5"/>'),
    book: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>'),
    trophy: P('<path d="M7.4 4.2h9.2v4.4a4.6 4.6 0 0 1-9.2 0z"/><path d="M7.4 5.8H4.6a2.8 2.8 0 0 0 2.9 3.6M16.6 5.8h2.8a2.8 2.8 0 0 1-2.9 3.6"/><path d="M12 13.2v3.4M8.6 20h6.8"/>'),
    again: P('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'), gift: P('<rect x="3.5" y="8.5" width="17" height="12" rx="2"/><path d="M12 8.5v12M3.5 12.5h17"/><path d="M12 8.5c-2-3.6-6-3.6-6-1.2 0 1.2 2 1.2 6 1.2zM12 8.5c2-3.6 6-3.6 6-1.2 0 1.2-2 1.2-6 1.2z"/>'),
    sound: P('<path d="M4 9v6h3.6L13 19.4V4.6L7.6 9H4Z"/><path d="M15.5 8.6a4.8 4.8 0 010 6.8"/>'), clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    music: P('<path d="M9 18V5.4l10-2v12.2"/><circle cx="6.4" cy="18" r="2.6"/><circle cx="16.4" cy="15.6" r="2.6"/>'),
    robot: P('<rect x="5" y="8" width="14" height="11" rx="3.5"/><path d="M12 4.5V8M9.2 13.2h.01M14.8 13.2h.01M9.5 16.3h5"/>'),
    dice: P('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" class="fl"/><circle cx="15.5" cy="15.5" r="1.2" class="fl"/><circle cx="12" cy="12" r="1.2" class="fl"/>'),
    shuffle: P('<path d="M3 7h3.5c4 0 6 10 10 10H21M3 17h3.5c1.6 0 2.8-1.6 3.9-3.6M14 8.4c.8-.9 1.7-1.4 2.9-1.4H21"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>'),
    play: P('<path d="M8 5.5v13l10.5-6.5z"/>'), vib: P('<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8v8M19.5 8v8"/>'),
    save: P('<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>')
  };

  /* ══ 画面の出し分け（全画面の板を1枚だけ） ══ */
  const UI = { step: 1 };
  function show(id) {
    $('front').classList.add('on');
    document.querySelectorAll('#front .scr').forEach((s) => s.classList.toggle('on', s.id === id));
    document.body.dataset.scr = id;
    const s = $(id); if (s) s.scrollTop = 0;
    if (MY.Bgm) MY.Bgm.scene('front');
  }
  function hide() { $('front').classList.remove('on'); document.body.dataset.scr = 'play'; closeSheet(); if (MY.Bgm) MY.Bgm.scene('play'); }
  const isFront = () => $('front').classList.contains('on');

  /* ── はじめの画面 ── */
  function showTitle() {
    show('titleScr');
    const sv = MY.Game && MY.Game.savedInfo ? MY.Game.savedInfo() : null;
    const humans = seats().filter((p) => !p.cpu).length, cpus = S.n - humans;
    $('titleScr').innerHTML =
      '<a class="t-home" href="../index.html" aria-label="XEVARION へもどる">' + IC.back + '<span>XEVARION</span></a>' +
      '<button class="t-gear" data-a="opts" aria-label="設定">' + IC.gear + '</button>' +
      '<div class="t-main">' +
        '<button class="t-logo" data-a="' + (sv ? 'resume' : 'start') + '" aria-label="あそぶ"><img src="img/logo.webp" alt="MagiYacht" width="600" height="600"></button>' +
        '<p class="t-tag">5つのサイコロで、役をつくろう！</p>' +
        '<div class="t-btns">' +
          (sv ? '<button class="buzz lg" data-a="resume"><span>つづきから<small>ラウンド ' + sv.round + '/12・' + sv.n + '人' + (sv.cur ? '・' + esc(sv.cur) + ' の番' : '') + '</small></span></button>' +
                '<button class="t-last" data-a="start">' + IC.plus + '<span>新しく始める</span></button>'
             : '<button class="buzz lg" data-a="start"><span>あそぶ</span></button>' +
               (S.played ? '<button class="t-last" data-a="quick">' + IC.again + '<span>前回と同じで始める<small>' + S.n + '人' + (cpus ? '（CPU ' + cpus + '）' : '') + '</small></span></button>' : '')) +
          '<div class="t-sub"><button data-a="how">' + IC.book + '<span>あそび方</span></button><button data-a="records">' + IC.trophy + '<span>記録</span></button></div>' +
        '</div>' +
        '<p class="t-src">1台で <b>1〜8人</b>・CPU とも遊べる・順位で XEVA・とちゅうで保存・オフラインOK</p>' +
      '</div>';
  }

  /* ── 準備：① メンバー ② ルール ── */
  const STEP_NM = ['メンバー', 'ルール'];
  function openSetup(step) {
    AU.unlock();
    UI.step = step || 1;
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
    if (s === 1) { body = stepMembers(); foot = '<button class="buzz wide" data-a="suNext"><span>つぎへ（ルール）</span></button>'; }
    else {
      body = stepRules();
      const cpus = seats().filter((p) => p.cpu).length;
      foot = '<p class="su-sum">' + S.n + '人' + (cpus ? '（CPU ' + cpus + '）' : '') + '・全 <b>12</b> ラウンド・順番は' + (S.order === 'draw' ? '<b>くじ引き</b>' : 'この並び') + '</p><button class="buzz wide" data-a="begin"><span>ゲームスタート</span></button>';
    }
    const y = ($('setupScr').querySelector('.su-body') || {}).scrollTop || 0;
    $('setupScr').innerHTML = head + '<div class="su-body">' + body + '</div><div class="su-foot">' + foot + '</div>';
    if (UI.keep) { const b = $('setupScr').querySelector('.su-body'); if (b) b.scrollTop = y; UI.keep = false; }
  }
  const repaint = () => { UI.keep = true; renderSetup(); };

  /* メンバー */
  function stepMembers() {
    const me = A.me(), P0 = A.PRIZES();
    const rows = seats().map((p, i) => {
      const col = COLORS[i];
      if (p.cpu) {
        return '<div class="st cpu" data-i="' + i + '" style="--c:' + col + '">' + avatar({ name: p.name, color: col, cpu: 1 }, 'md') +
          '<div class="st-m"><input class="st-nm" maxlength="8" value="' + esc(p.name) + '" aria-label="' + (i + 1) + '人目（CPU）の名前" enterkeyhint="done">' +
          '<div class="st-lv">' + CPU_LV.map(([v, t]) => '<button class="' + (p.cpu === v ? 'on' : '') + '" data-a="lv" data-i="' + i + '" data-v="' + v + '">' + t + '</button>').join('') + '</div></div>' +
          (S.n > 1 ? '<button class="st-x" data-a="del" data-i="' + i + '" aria-label="この人を外す">' + IC.x + '</button>' : '') + '</div>';
      }
      const linked = !p.owner && p.link && p.link.uid, ok = linked && p.link.confirmed !== false;
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
        (S.n > 1 ? '<button class="st-x" data-a="del" data-i="' + i + '" aria-label="この人を外す">' + IC.x + '</button>' : '') + '</div>';
    }).join('');
    return '<h2 class="su-h">だれが参加する？</h2>' +
      '<div class="st-list">' + rows + '</div>' +
      (S.n < 8 ? '<div class="st-adds"><button class="st-add" data-a="add">' + IC.plus + 'プレイヤーを追加</button><button class="st-add" data-a="addCpu">' + IC.robot + 'CPU を追加</button></div>' : '') +
      '<p class="st-cnt">' + S.n + ' / 8 人</p>' +
      '<div class="su-tip">' + IC.gift + '<div><b>順位で XEVA がもらえます</b>（1位 ' + P0[0] + '・2位 ' + P0[1] + '・3位 ' + P0[2] + '…／ひとりなら点数で最大 ' + A.SOLO_MAX + '）。「この端末の本人」にチェックすると<b>オフラインでも</b>この端末に入ります。ほかの人はアカウント連携すると本人の XEVORA アカウントに届きます（12ラウンドを最後まで遊んだ試合だけ・CPU はもらえません）。</div></div>';
  }

  /* ルール */
  function stepRules() {
    const seg = (list, cur, a) => '<div class="su-seg">' + list.map((o) => '<button class="' + (o[0] === cur ? 'on' : '') + '" data-a="' + a + '" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';
    const cpus = seats().filter((p) => p.cpu).length;
    return '<h2 class="su-h">ルール</h2>' +
      '<section class="ru-c ru-sum"><div class="ru-dice" aria-hidden="true">' + [5, 5, 5, 3, 3].map((v) => MY.Howto ? MY.Howto.die(v) : '').join('') + '</div>' +
        '<p class="ru-n">5個のサイコロを<b>1回の番で3回まで</b>ふれて、12の欄に1つずつ点を書きます。全員が12の欄をうめたら<b>合計点</b>で勝負。上の段（エース〜シックス）の合計が <b>63点以上で +35</b>。</p>' +
        '<button class="btn sm" data-a="how">' + IC.book + 'あそび方をアニメで見る</button></section>' +
      '<section class="ru-c">' +
        '<div class="ru"><div class="ru-l">' + IC.shuffle + '<b>順番</b></div>' + seg([['draw', 'くじ引き'], ['fixed', 'この並び']], S.order, 'order') +
          '<p class="ru-n">' + (S.order === 'draw' ? 'ゲームのはじめに、くじで順番を決めます。' : '「① メンバー」の上から順に番がきます。') + '</p></div>' +
        (cpus ? '<div class="ru"><div class="ru-l">' + IC.robot + '<b>CPU の速さ</b></div>' + seg([['normal', 'ふつう'], ['fast', 'はやい']], S.speed, 'speed') + '</div>' : '') +
      '</section>' +
      '<section class="ru-c">' + bgmHTML() + '<div class="ru"><div class="ru-l">' + IC.sound + '<b>効果音</b></div>' + seg([['on', 'ON'], ['off', 'OFF']], AU.isOn() ? 'on' : 'off', 'sound') + '</div></section>';
  }

  /* ══ BGM（オリジナル曲・自分の曲・オフ） ══ */
  const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  function bgmHTML() {
    const B = MY.Bgm ? MY.Bgm.info() : { mode: 'off', has: false };
    return '<div class="ru"><div class="ru-l">' + IC.music + '<b>BGM</b></div>' +
      '<div class="su-seg">' + [['orig', 'オリジナル曲'], ['mine', '自分の曲'], ['off', 'オフ']].map((o) => '<button class="' + (B.mode === o[0] ? 'on' : '') + '" data-a="bgm" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>' +
      '<div class="bgm-mine">' + (B.has
        ? '<span class="bgm-f">' + IC.music + '<b>' + esc(B.name) + '</b><small>' + mb(B.size) + '</small></span><button class="btn sm" data-a="bgmPick">かえる</button><button class="btn sm danger" data-a="bgmClear">消す</button>'
        : '<button class="btn sm" data-a="bgmPick">' + IC.plus + '自分の曲をえらぶ</button>') + '</div>' +
      '<p class="ru-n">「自分の曲」は、この端末の中の曲ファイル（m4a・mp3 など・' + (MY.Bgm ? MY.Bgm.MAX_MB : 40) + ' MB まで）を、<b>この端末にだけ</b>入れて流します（ほかの端末やクラウドには送りません）。</p></div>';
  }
  function bgmRepaint() { if (!$('sheetOv').classList.contains('hidden') && $('sheet').classList.contains('opt')) openOpts(); else if (document.body.dataset.scr === 'setupScr') repaint(); }

  /* ══ アイコン（UR キャラ・名前のまま） ══ */
  function openPic(i) {
    const p = S.all[i]; if (!p) return;
    const col = COLORS[i], list = A.urList();
    const cell = (v, inner, nm, on2) => '<button class="pc' + (on2 ? ' on' : '') + '" data-a="picSet" data-i="' + i + '" data-v="' + esc(v) + '" style="--c:' + col + '">' + inner + '<small>' + esc(nm) + '</small></button>';
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
  function lkRow(r, k) { return '<button class="lk-r" data-a="lkPick" data-k="' + k + '">' + avatar({ name: r.name, img: A.thumb(r), color: '#3f9bff' }, 'sm') + '<b>' + esc(r.name) + '</b>' + IC.next + '</button>'; }
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
      html = '<div class="lk-who">' + avatar({ name: LK.hit.name, img: A.thumb(LK.hit), color: '#3f9bff' }, 'md') + '<div><b>' + esc(LK.hit.name) + '</b><small>' + (LK.confirm ? '前回の連携を引きつぎます' : 'このアカウントに連携します') + '</small></div></div>' +
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
    p.link = Object.assign({}, LK.hit, { confirmed: true }); p.owner = false; p.cpu = 0;
    if (/^プレイヤー\d$/.test(p.name) || !p.name) p.name = String(LK.hit.name).slice(0, 8);
    A.remember(p.link); save(); closeSheet(); repaint(); AU.bonus();
    toast('🔗 ' + LK.hit.name + ' を連携しました');
  }
  function setOwner(i, on2) {
    const me = A.me(); if (!me) return;
    S.all.forEach((p, j) => { if (p.owner) { p.owner = false; if (p.name === String(me.name).slice(0, 8)) p.name = 'プレイヤー' + (j + 1); } });
    if (on2) { const p = S.all[i]; p.owner = true; p.link = null; p.cpu = 0; p.name = String(me.name).slice(0, 8); }
    AU.tap(); save(); repaint();
  }
  let profDone = false;
  function refreshProfiles() {
    if (profDone) return; profDone = true;
    const jobs = S.all.filter((p) => p.link && p.link.uid).map((p) => A.refresh(p.link).then((v) => {
      if (!v || !p.link) return false;
      const ch = (v.charFile || '') !== (p.link.charFile || '') || (v.name || '') !== (p.link.name || '');
      p.link.name = v.name || p.link.name; p.link.charFile = v.charFile || ''; p.link.charId = v.charId || '';
      return ch;
    }));
    if (jobs.length) Promise.all(jobs).then((rs) => { if (!rs.some(Boolean)) return; save(); if (document.body.dataset.scr === 'setupScr') repaint(); });
  }

  /* ══ 記録・設定 ══ */
  function openRecords() {
    const st = A.stats(), rows = Object.keys(st).map((k) => Object.assign({ id: k }, st[k])).sort((a, b) => (b.best || 0) - (a.best || 0) || (b.wins || 0) - (a.wins || 0));
    sheet('<h3 class="sh-t">' + IC.trophy + '記録</h3>' +
      (rows.length ? '<div class="rc-l">' + rows.slice(0, 30).map((r, i) => '<div class="rc"><i>' + (i + 1) + '</i><b>' + esc(r.name) + (r.id === 'me' ? '<small>この端末の本人</small>' : r.id.indexOf('local:') === 0 ? '' : '<small>連携</small>') +
          '<em>' + (r.wins || 0) + '勝 / ' + (r.games || 0) + '試合' + (r.yachts ? '・ヨット ' + r.yachts + '回' : '') + '</em></b><span>最高 <strong>' + (r.best || 0) + '</strong><small>平均 ' + (r.fin ? Math.round(r.sum / r.fin) : 0) + '</small></span></div>').join('') + '</div>'
        : '<p class="sh-p center">まだ記録がありません。遊ぶと、最高点・平均・勝った数がここにたまります。</p>') +
      '<div class="sh-b"><button class="btn" data-a="shClose">とじる</button></div>', 'rec');
  }
  function openOpts() {
    const seg = (on2, a) => '<div class="su-seg"><button class="' + (on2 ? 'on' : '') + '" data-a="' + a + '" data-v="on">ON</button><button class="' + (on2 ? '' : 'on') + '" data-a="' + a + '" data-v="off">OFF</button></div>';
    sheet('<h3 class="sh-t">' + IC.gear + '設定</h3>' +
      bgmHTML() +
      '<div class="ru"><div class="ru-l">' + IC.sound + '<b>効果音</b></div>' + seg(AU.isOn(), 'sound') + '</div>' +
      (navigator.vibrate ? '<div class="ru"><div class="ru-l">' + IC.vib + '<b>ふるえる</b></div>' + seg(AU.vibOn(), 'vib') + '</div>' : '') +
      '<p class="sh-p">メンバー・アイコン・連携・CPU は「あそぶ」の準備（① メンバー）で変えられます。</p>' +
      '<div class="sh-b"><button class="btn" data-a="shClose">とじる</button></div>', 'opt');
  }

  /* ══ シート・トースト ══ */
  function sheet(html, cls) { const s = $('sheet'); s.className = 'sheet ' + (cls || ''); s.innerHTML = html; s.scrollTop = 0; $('sheetOv').classList.remove('hidden'); }
  function closeSheet() { $('sheetOv').classList.add('hidden'); }
  let toastT = 0;
  function toast(t, ms) { const el = $('toast'); el.innerHTML = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms || 2800); }

  /* ══ 操作 ══ */
  function begin() {
    if (S.n < 1) return;
    if (MY.Game && MY.Game.savedInfo && MY.Game.savedInfo()) {
      confirmSheet('保存している試合があります', '新しく始めると、保存している試合（つづき）は消えます。', '新しく始める', () => { MY.Game.dropSave(); begin(); });
      return;
    }
    S.played = true; save();
    AU.unlock(); AU.tap();
    hide();
    if (MY.Game) MY.Game.start(players(), { order: S.order, speed: S.speed });
  }
  function confirmSheet(title, text, okLabel, fn, danger) {
    UI.confirmFn = fn;
    /* ★ 2026-11-18 ご指摘「この試合をやめる・リタイアを押してもそうならない」→ 取り消しのボタンも「やめる」だったので、
         「この試合をやめる」の確認で同じ名前のボタンが2つ並んでいた。取り消しは「もどる」に・決めるほうを大きく */
    sheet('<h3 class="sh-t">' + esc(title) + '</h3><p class="sh-p center">' + text + '</p><div class="sh-b cf-b"><button class="btn cf-ok' + (danger === false ? ' pri' : ' danger') + '" data-a="cfOk">' + esc(okLabel) + '</button><button class="btn" data-a="shClose">もどる</button></div>', 'cf');
  }
  function onClick(e) {
    const b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) return;
    const a = b.dataset.a, i = +b.dataset.i;
    if (a !== 'lkKey') { try { AU.unlock(); } catch (err) { /* 音が使えない */ } }
    if (a === 'start') { AU.tap(); openSetup(1); }
    else if (a === 'resume') { AU.tap(); hide(); if (MY.Game) MY.Game.resume(); }
    else if (a === 'quick') begin();
    else if (a === 'how') { AU.tap(); if (MY.Howto) MY.Howto.open(); }
    else if (a === 'records') { AU.tap(); openRecords(); }
    else if (a === 'opts') { AU.tap(); openOpts(); }
    else if (a === 'suBack') { AU.tap(); if (UI.step > 1) { UI.step--; renderSetup(); } else showTitle(); }
    else if (a === 'suGo') { AU.tap(); UI.step = +b.dataset.v || 1; renderSetup(); }
    else if (a === 'suNext') { AU.tap(); UI.step = Math.min(2, UI.step + 1); renderSetup(); }
    else if (a === 'begin') begin();
    else if (a === 'add' || a === 'addCpu') {
      if (S.n >= 8) return;
      const p = S.all[S.n]; S.n++;
      if (a === 'addCpu') { p.cpu = p.cpu || 2; p.owner = false; p.link = null; if (!/^CPU/.test(p.name)) p.name = 'CPU' + (seats().filter((x) => x.cpu).length > 1 ? seats().filter((x) => x.cpu).length : ''); }
      else { if (p.cpu) { p.cpu = 0; p.name = 'プレイヤー' + S.n; } if (!p.name) p.name = 'プレイヤー' + S.n; }
      AU.tap(); save(); repaint();
    } else if (a === 'del') {
      if (S.n <= 1) return;
      const p = S.all.splice(i, 1)[0]; S.all.splice(S.n - 1, 0, p); S.n--;
      AU.tap(); save(); repaint();
    } else if (a === 'lv') { const p = S.all[i]; if (p) { p.cpu = +b.dataset.v || 2; save(); AU.tap(); repaint(); } }
    else if (a === 'order') { S.order = b.dataset.v === 'fixed' ? 'fixed' : 'draw'; save(); AU.tap(); repaint(); }
    else if (a === 'speed') { S.speed = b.dataset.v === 'fast' ? 'fast' : 'normal'; save(); AU.tap(); repaint(); }
    else if (a === 'sound') { AU.setOn(b.dataset.v === 'on'); AU.tap(); if ($('sheet').classList.contains('opt') && !$('sheetOv').classList.contains('hidden')) openOpts(); else repaint(); if (MY.Game) MY.Game.syncOpts(); }
    else if (a === 'vib') { AU.setVib(b.dataset.v === 'on'); AU.tap(); openOpts(); }
    else if (a === 'bgm') { const v = b.dataset.v; if (v === 'mine' && MY.Bgm && !MY.Bgm.info().has) { $('bgmFile').click(); return; } if (MY.Bgm) { MY.Bgm.kick(); MY.Bgm.setMode(v); } AU.tap(); bgmRepaint(); if (MY.Game) MY.Game.syncOpts(); }
    else if (a === 'bgmPick') { $('bgmFile').click(); }
    else if (a === 'bgmClear') { if (MY.Bgm) MY.Bgm.clearMine().then(() => { toast('自分の曲を、この端末から消しました'); bgmRepaint(); }); }
    else if (a === 'pic') openPic(i);
    else if (a === 'picSet') { const p = S.all[i]; if (p) { p.pic = b.dataset.v || ''; save(); } closeSheet(); repaint(); AU.tap(); }
    else if (a === 'link') openLink(i);
    else if (a === 'lkSearch') lkSearch();
    else if (a === 'lkPick') lkPick(b.dataset.k);
    else if (a === 'lkKey') lkKey(b.dataset.v);
    else if (a === 'lkBack') { LK.step = 'search'; LK.msg = ''; paintLink(); }
    else if (a === 'lkOff') { const p = S.all[+b.dataset.i]; if (p) { p.link = null; save(); } closeSheet(); repaint(); toast('連携を解除しました'); }
    else if (a === 'cfOk') { const f = UI.confirmFn; UI.confirmFn = null; closeSheet(); if (f) f(); }
    else if (a === 'shClose') { AU.tap(); closeSheet(); if (MY.Game && MY.Game.onSheetClose) MY.Game.onSheetClose(); }
    else if (MY.Game && MY.Game.act) MY.Game.act(a, b);
  }
  function init() {
    load();
    $('front').addEventListener('click', onClick);
    $('sheetOv').addEventListener('click', (e) => { if (e.target === $('sheetOv')) { closeSheet(); if (MY.Game && MY.Game.onSheetClose) MY.Game.onSheetClose(); } else onClick(e); });
    $('front').addEventListener('input', (e) => {
      const t = e.target;
      if (t.matches && t.matches('.st-nm')) {
        const i = +t.closest('.st').dataset.i; S.all[i].name = t.value.slice(0, 8); save();
        const av = t.closest('.st').querySelector('.gav i'); if (av) av.textContent = t.value.slice(0, 1) || '?';
      }
    });
    $('front').addEventListener('change', (e) => { const t = e.target; if (t.dataset && t.dataset.c === 'own') setOwner(+t.dataset.i, t.checked); });
    $('bgmFile').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f || !MY.Bgm) return;
      const r = await MY.Bgm.pickFile(f);
      if (r.ok) toast('🎵 「' + esc(f.name) + '」を BGM にしました（この端末だけ）');
      else toast(r.error === 'big' ? '曲のファイルが大きすぎます（' + MY.Bgm.MAX_MB + ' MB まで）' : r.error === 'type' ? '曲のファイル（m4a・mp3 など）をえらんでください' : '曲を入れられませんでした');
      bgmRepaint();
    });
  }

  MY.Setup = { init, showTitle, openSetup, hide, isFront, players, avatar, esc, toast, sheet, closeSheet, confirmSheet, onClick, IC, COLORS, get order() { return S.order; }, get speed() { return S.speed; } };
})(window);

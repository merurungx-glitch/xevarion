/* ============================================================
   MagiYacht — あそび方（かんたんなアニメで見せる）
   ★★ 2026-11-18 ご指定「ルールも分かりやすく簡単なアニメーションで見やすく」
   ------------------------------------------------------------
   ・1ページに1つのことだけ。上に動く絵（CSS のアニメ・くり返す）、下にみじかい文。
   ・ページ：① カップでふる ② キープしてふり直す（3回まで）③ 欄をえらんで書く ④ 上の段 ⑤ ボーナス
            ⑥ 下の段の役 ⑦ 0点で書く ⑧ 合計で勝負（保存・リタイア）
   ・つぎへ／もどる・点（ページの印）・左右にスワイプ・キーボードの ← →。
   ・MY.Howto.die(v) は 2D のサイコロ（準備の画面・スコア表でも使う）。
   ============================================================ */
(function (root) {
  'use strict';
  const MY = root.MY = root.MY || {};
  const $ = (id) => document.getElementById(id);
  const PIP = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  /* 2D のサイコロ（3×3 のます目に目を置く） */
  function die(v, cls, style) {
    return '<i class="hd f' + v + (cls ? ' ' + cls : '') + '"' + (style ? ' style="' + style + '"' : '') + '>' +
      PIP[v].map((k) => '<b style="grid-area:' + Math.ceil(k / 3) + '/' + (((k - 1) % 3) + 1) + '"></b>').join('') + '</i>';
  }
  const dice = (arr, cls) => arr.map((v, i) => die(v, cls, '--i:' + i)).join('');
  /* その目だけ光らせる（ほかはうすく） */
  const mark = (arr, f) => arr.map((v, i) => die(v, v === f ? 'g' : 'dim', '--i:' + i)).join('');
  const CUP = '<span class="ho-cup"><i class="ho-cup-r"></i><i class="ho-cup-s">★</i></span>';
  const HAND = '<span class="ho-hand" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 11V5.5a1.6 1.6 0 013.2 0V10l.2-1.1a1.6 1.6 0 013.1.4v1.6l.2-.6a1.5 1.5 0 012.9.5V15a6 6 0 01-6 6h-.7a6 6 0 01-4.5-2L4.6 15.6a1.6 1.6 0 012.3-2.2L9 15z"/></svg></span>';

  const PAGES = [
    {
      t: 'カップに入れて、ふる',
      stage: '<div class="ho-st ho-p1"><div class="ho-tray"></div>' + CUP + '<div class="ho-out">' + dice([3, 6, 1, 5, 2]) + '</div>' + HAND + '<span class="ho-shk">シャカ<br>シャカ</span></div>',
      body: '<b>カップを指で押さえて</b>、そのまま左右に動かすと<b>シャカシャカ</b>ふれます。<b>指をはなすと</b>カップがかたむいて、サイコロがトレイにこぼれます。<small>ふらずにはなすと、カップはそのまま置き直し。ふり直しは、右下の<b>カップのボタン</b>でカップを出して同じように（ボタンを押さえたまま指を動かせば、そのままカップを持てます）。</small>'
    },
    {
      t: 'キープして、ふり直す',
      stage: '<div class="ho-st ho-p2"><div class="ho-keep"><span>KEEP</span></div><div class="ho-row">' +
        die(5, 'k1') + die(5, 'k2') + '<span class="ho-rr">' + die(2, 'r1') + die(4, 'r2') + die(1, 'r3') + '</span></div>' +
        '<div class="ho-cnt"><i class="on">1</i><i>2</i><i>3</i></div>' + HAND + '</div>',
      body: '残したいサイコロを<b>タップ</b>すると、奥の棚に<b>キープ</b>されます（もう一度タップでもどる）。キープしていないサイコロだけを<b>ふり直せます</b>。<small>1回の番で<b>3回まで</b>ふれます（右下の ●●● がのこりの回数）。</small>'
    },
    {
      t: '欄をえらんで、点を書く',
      stage: '<div class="ho-st ho-p3"><div class="ho-dl">' + dice([6, 6, 6, 3, 3]) + '</div><div class="ho-sheet">' +
        ['チョイス', 'フォーダイス', 'フルハウス', 'S.ストレート'].map((n, i) => '<div class="ho-sr' + (i === 2 ? ' tg' : '') + '"><span>' + n + '</span><b>' + (i === 2 ? '<em>24</em>' : i === 0 ? '<u>24</u>' : '<u>0</u>') + '</b></div>').join('') +
        '</div>' + HAND + '</div>',
      body: 'ふったら（1回目でも）、スコア表の<b>欄を1つえらんで</b>点を書きます。<b>グレーの数字</b>は「ここに書いたら何点か」。もう一度タップするか「書く」ボタンで決まり。<small>1回の番で1つ。<b>12の欄</b>を全部うめたら終わり（12ラウンド）。</small>'
    },
    {
      t: '上の段：エース〜シックス',
      stage: '<div class="ho-st ho-p4"><div class="ho-up a"><span>' + mark([4, 4, 4, 2, 6], 4) + '</span><p><b>フォー</b>に書くと <em>4＋4＋4＝12点</em></p></div>' +
        '<div class="ho-up b"><span>' + mark([6, 6, 1, 6, 3], 6) + '</span><p><b>シックス</b>に書くと <em>6＋6＋6＝18点</em></p></div></div>',
      body: '<b>エース（1）・デュース（2）・トレイ（3）・フォー（4）・ファイブ（5）・シックス（6）</b>。その目のサイコロの<b>合計</b>が点になります。'
    },
    {
      t: 'ボーナス ＋35',
      stage: '<div class="ho-st ho-p5"><div class="ho-bar">' + [1, 2, 3, 4, 5, 6].map((v) => '<i style="--w:' + (v * 3 / 63 * 100).toFixed(2) + '%;--i:' + (v - 1) + '">' + (v * 3) + '</i>').join('') +
        '<span class="ho-63">63</span></div><div class="ho-bon">ボーナス <b>+35</b></div></div>',
      body: '上の段（エース〜シックス）の合計が <b>63点以上</b>なら、<b>ボーナス +35点</b>。<small>どの目も<b>3つずつ</b>そろえると、ちょうど 3＋6＋9＋12＋15＋18＝63点。</small>'
    },
    {
      t: '下の段の役',
      stage: '<div class="ho-st ho-p6">' + [
        ['チョイス', [6, 5, 5, 4, 6], '合計 26', 'いつでも'],
        ['フォーダイス', [5, 5, 5, 5, 2], '合計 22', '4つ同じ'],
        ['フルハウス', [6, 6, 6, 3, 3], '合計 24', '3つ＋2つ'],
        ['S.ストレート', [2, 3, 4, 5, 5], '15', '4つ並び'],
        ['B.ストレート', [2, 3, 4, 5, 6], '30', '5つ並び'],
        ['ヨット', [4, 4, 4, 4, 4], '50', '5つ同じ']
      ].map((r, i) => '<div class="ho-yk" style="--i:' + i + '"><b>' + r[0] + '<small>' + r[3] + '</small></b><span>' + dice(r[1]) + '</span><em>' + r[2] + '</em></div>').join('') + '</div>',
      body: '<b>フォーダイス・フルハウス・チョイス</b>は<b>5個の合計</b>。<b>S.ストレート 15点・B.ストレート 30点・ヨット 50点</b>。<small>フルハウスは5つ同じでもOK。</small>'
    },
    {
      t: '役ができないときは 0点',
      stage: '<div class="ho-st ho-p7"><div class="ho-dl">' + dice([1, 2, 2, 5, 6]) + '</div><div class="ho-sheet one"><div class="ho-sr tg z"><span>ヨット</span><b><em>0</em></b></div></div><p class="ho-cap">あとで役ができそうにない欄に 0点を書いて、<b>捨てる</b></p></div>',
      body: 'どの役にもならないときは、どこかの欄に<b>0点を書きます</b>（捨てる）。<small>どの欄を捨てるかも作戦のうち。ヨットやB.ストレートは、あとで出るかもしれません。</small>'
    },
    {
      t: '合計点で勝負！',
      stage: '<div class="ho-st ho-p8"><div class="ho-pod"><span class="p2"><i>2</i></span><span class="p1"><i>1</i><b>👑</b></span><span class="p3"><i>3</i></span></div></div>',
      body: '全員が12の欄をうめたら、<b>合計点がいちばん高い人の勝ち</b>。順位で <b>XEVA</b> がもらえます（ひとりなら点数で）。<small>ゲームは<b>いつも自動で保存</b>（メニュー →「あとでつづける」で、はじめの画面の「つづきから」）。メニューから<b>リタイア</b>もできます。</small>'
    }
  ];

  const S = { i: 0, open: false };
  function render() {
    const P = PAGES[S.i], n = PAGES.length;
    $('howto').innerHTML =
      '<div class="ho-card" role="dialog" aria-label="あそび方">' +
        '<div class="ho-top"><span class="ho-no">' + (S.i + 1) + ' / ' + n + '</span><h2>' + P.t + '</h2><button class="ho-x" data-h="close" aria-label="とじる"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
        '<div class="ho-stage play">' + P.stage + '</div>' +
        '<p class="ho-body">' + P.body + '</p>' +
        '<div class="ho-dots">' + PAGES.map((p, k) => '<button class="' + (k === S.i ? 'on' : '') + '" data-h="go" data-v="' + k + '" aria-label="' + (k + 1) + 'ページ目"></button>').join('') + '</div>' +
        '<div class="ho-nav"><button class="btn" data-h="prev"' + (S.i === 0 ? ' disabled' : '') + '>もどる</button>' +
          (S.i < n - 1 ? '<button class="buzz" data-h="next"><span>つぎへ</span></button>' : '<button class="buzz" data-h="close"><span>あそぶ！</span></button>') + '</div>' +
      '</div>';
  }
  function go(i) { S.i = Math.max(0, Math.min(PAGES.length - 1, i)); render(); if (MY.Audio) MY.Audio.tap(); }
  function open(i) { S.i = i || 0; S.open = true; $('howto').classList.remove('hidden'); render(); }
  function close() { S.open = false; $('howto').classList.add('hidden'); $('howto').innerHTML = ''; if (MY.Game && MY.Game.onHowtoClose) MY.Game.onHowtoClose(); }
  function init() {
    const el = $('howto');
    el.addEventListener('click', (e) => {
      if (e.target === el) { close(); return; }
      const b = e.target.closest('[data-h]'); if (!b) return;
      const a = b.dataset.h;
      if (a === 'close') close();
      else if (a === 'next') go(S.i + 1);
      else if (a === 'prev') go(S.i - 1);
      else if (a === 'go') go(+b.dataset.v);
    });
    let sx = null, sy = 0;
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('.ho-card')) { sx = e.clientX; sy = e.clientY; } });
    el.addEventListener('pointerup', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) go(S.i + (dx < 0 ? 1 : -1));
    });
    document.addEventListener('keydown', (e) => {
      if (!S.open) return;
      if (e.key === 'ArrowRight') go(S.i + 1); else if (e.key === 'ArrowLeft') go(S.i - 1); else if (e.key === 'Escape') close();
    });
  }
  MY.Howto = { init, open, close, die, dice, get isOpen() { return S.open; } };
})(window);

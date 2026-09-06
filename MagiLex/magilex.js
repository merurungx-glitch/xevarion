// ============================================================
// MagiLex v2 — 旧MagiLex(4択クイズ) × 旧WordbookX(単語帳) 融合
//   ・XEVARION アカウント連携（アイコン/名前は XEVA.account）
//   ・進捗は本体（localStorage）に保存
//   ・XEVA 報酬: 登録+50 / 完全習得+600 / ミックス90%+50・100%+150 ／ デイリーは 2026-08-17 に廃止
// ============================================================

// ---- 定数/データ ----
const SECTIONS = window.LEX_SECTIONS || [];
const SUBJECTS = window.WORD_SUBJECTS || {};
const LS_KEY = "magilex_v2";
const HOWTO_KEY = "magilex_howto_v1";
/* ★ 2026-08-17e daily は廃止（キーは残すが 0。過去のセーブとの互換のため） */
const REWARD = { reg:50, daily:0, master:600, mix90:50, mix100:150, confirm:800 };
// ── ボリュームボーナス：問題数が多いコンテンツほど完全習得の XEVA が増える ──
//    50問以上 = 2倍 ／ 100問以上 = 3倍（キャンペーン倍率とは別に掛かる）
const VOLUME_TIERS = [{ min:100, mult:3 }, { min:50, mult:2 }];
function volumeMult(total){
  const t = VOLUME_TIERS.find(v => (total|0) >= v.min);
  return t ? t.mult : 1;
}
function masterReward(c){ return REWARD.master * volumeMult(c ? c.total : 0); }
/* ── 確認テスト（完全習得したコンテンツの全問テスト）の報酬 ──
   全問正解で REWARD.confirm。問題数が多いコンテンツほど倍率が乗る。
   ★ 完全習得の報酬（masterReward）と同じ volumeMult を使う。
     別の刻みにすると「習得より確認テストのほうが割がいい」みたいな逆転が起きるため。 */
function confirmReward(c){ return REWARD.confirm * volumeMult(c ? c.total : 0); }
/* 確認テストを受けられるか（完全習得していること） */
function canConfirm(c){ return !!c && isMastered(c); }
/* この周回で確認テストの報酬を受け取り済みか。リセットすると受け直せる。 */
function confirmDone(c){ return !!(P.confirmDone && P.confirmDone[c.id]); }
function volumeBadge(total){
  const m = volumeMult(total);
  return m > 1 ? `<span class="vol-badge">${total>=100?"100問以上":"50問以上"} XEVA×${m}</span>` : "";
}
// ── 🌻 夏の学習キャンペーン：期間中は MagiLex で得られる XEVA がすべて2倍 ──
/* ★ 2026-08-20 ご指定により XEVA2倍を <b>10/31 まで延長</b>（8/31 → 10/31）。
   ★ ポータル側のお知らせ（xevarion-home.js の CAMPAIGN イベント）にも同じ日付が書いてあるので、<b>かならず両方</b>直すこと。片方だけだと 9/1 に案内だけ消える。 */
const CAMPAIGN = { name:"夏の学習キャンペーン", mult:2, from:"2026-07-01", to:"2026-10-31" };
function campaignActive(){ const t=new Date().toISOString().slice(0,10); return t>=CAMPAIGN.from && t<=CAMPAIGN.to; }
function rw(n){ return campaignActive() ? n*CAMPAIGN.mult : n; }   // 表示・付与共通の実効報酬
const N_OPTS = 5;   // クイズの選択肢数（答え＋最大4誤答＝4〜5択）＋「わからない」
// 正誤・解説表示後に自動で次へ進む設定（設定画面でオンオフ・秒数を変更可）
const AUTONEXT_KEY = "magilex_autonext_v1";
const AUTONEXT_MIN = 1, AUTONEXT_MAX = 15;   // 秒数の下限・上限
function loadAutoNext(){
  var def={ on:true, correct:3, wrong:5 };
  try{ var r=localStorage.getItem(AUTONEXT_KEY); if(r){ var o=JSON.parse(r); if(o&&typeof o==="object"){
    return { on:o.on!==false,
      correct:Math.min(AUTONEXT_MAX,Math.max(AUTONEXT_MIN, o.correct||def.correct)),
      wrong:Math.min(AUTONEXT_MAX,Math.max(AUTONEXT_MIN, o.wrong||def.wrong)) };
  } } }catch(e){}
  return def;
}
let autoNext = loadAutoNext();   // { on, correct(秒), wrong(秒) }
function saveAutoNext(){ try{ localStorage.setItem(AUTONEXT_KEY, JSON.stringify(autoNext)); }catch(e){} }
// フラッシュカード：覚えたカードを次から出さない設定
const FLASH_KEY = "magilex_flash_v1";
function loadFlashOpt(){ try{ var r=localStorage.getItem(FLASH_KEY); if(r){ var o=JSON.parse(r); if(o&&typeof o==="object") return { hideKnown:!!o.hideKnown }; } }catch(e){} return { hideKnown:false }; }
let flashOpt = loadFlashOpt();   // { hideKnown }
function saveFlashOpt(){ try{ localStorage.setItem(FLASH_KEY, JSON.stringify(flashOpt)); }catch(e){} }
const MODE_LABEL = {
  name_from_formula:"化学式 → 名称", group_from_formula:"構造 → 官能基",
  prop_from_formula:"分子式 → 性質", formula_from_name:"名称 → 化学式"
};
const CHARS_BASE = "../chars/";

// ---- ユーティリティ ----
const $ = (s, r=document) => r.querySelector(s);
const esc = (s) => (s==null?"":String(s)).replace(/[&<>"']/g,(c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const todayStr = () => new Date().toISOString().slice(0,10);
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ── 選択肢の「（補足）」ならし ───────────────────────────
   正解にだけ（…）の補足が付いていると、中身を知らなくても
   「補足が付いているほう」を選ぶだけで当たってしまう。
   そこで、補足の付き方がそろっていない選択肢の組では、
   全部の選択肢から（…）を外して見た目をそろえる。

   ・外すのは全角の（）だけ。半角の () は ω²r²/(2g) のように
     式の一部であることが多く、外すと意味が変わってしまう。
   ・外した結果、空になる／別の選択肢と同じ文言になってしまう組は
     区別が付かなくなるので、何もせずそのまま出す。
   外した補足は「正解：」の行で元の文のまま見せるので、情報は落ちない。 */
const SUPP_RE = /（[^（）]*）/;
function stripSupp(s){ return String(s==null?"":s).replace(/\s*（[^（）]*）/g, "").trim(); }
/* ── ★ 2026-08-16c 誤答は「長さの近いもの」から選ぶ ──────────
   正解がいちばん長い選択肢になっている問題が全体の38%（1344問中507問）あった。
   4〜5択なら偶然は20%ほどなので、<b>いちばん長いものを選ぶだけで当たりやすい</b>＝
   中身を知らなくても解けてしまう状態だった（magilex-data.js は64%）。

   問題データの多くは誤答を5〜6個持っていて、出題に使うのはそのうち3〜4個だけ。
   そこで「どれを見せるか」を選ぶときに、<b>正解と字数の近い誤答</b>を優先する。
   ・まず字数の差が小さい順に並べ、上位（必要数の2倍）を候補にする。
   ・そのなかからランダムに選ぶので、毎回同じ組み合わせにはならない。
   問題文そのものは変えずに、長さの手がかりだけを消せる。 */
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-24 「長い選択肢＝正解」をつぶす（ご指定）
   ------------------------------------------------------------
   2026-08-16c で①②を入れたが、それでも
     化学γ 39.9% ／ 物理β 38.2% ／ 化学δ 27.5% ／ 物理α 26.4%
   の問題で<b>正解がいちばん長い選択肢</b>のままだった（データを実測）。
   理由ははっきりしていて、①②は<b>その問題が持っている誤答の中でやりくり</b>する
   だけなので、<b>誤答が全部その問題の正解より短い</b>と手の打ちようがない。
   記述問題・式の問題は「正しく言い切る」ぶん正解が長くなりがちなので、
   ちょうどそこで効かなくなっていた。

   → ③として、<b>同じセット（単元）のほかの問題の誤答</b>から、
     長さの近いものを1つだけ借りてくる。
     ・借りるのは<b>誤答だけ</b>（ほかの問題の正解は絶対に借りない）。
       同じ単元の中で「正しい文」を混ぜると、正解が2つある問題になってしまう。
     ・その文字列が<b>そのセットのどこかで正解になっている</b>ものも外す。
     ・正解と重なる（一方が他方を含む）ものも外す＝紛らわしすぎるため。
   ★ 文章を新しく作らない。すでに「誤り」として書かれている文だけを使う。
   ══════════════════════════════════════════════════════════════ */
/* 誤答を借りるための「たね」を作る。
   ★ 借りてよいのは<b>誤答として書かれた文だけ</b>。
     ほかの問題の<b>正解</b>は絶対に混ぜない（正解が2つある問題になってしまう）。
     さらに、その範囲のどこかで正解になっている文字列も外す。 */
function wrongPoolFrom(list){
  const ans = new Set();
  list.forEach((s) => (s.questions || []).forEach((q) => {
    if(q && q.answer != null) ans.add(String(q.answer));
  }));
  const set = new Set();
  list.forEach((s) => (s.questions || []).forEach((q) => (q && q.wrong || []).forEach((x) => {
    const t = String(x == null ? "" : x);
    if(t && !ans.has(t)) set.add(t);
  })));
  return Array.from(set);
}
/* ① 同じセット（単元）の誤答 … いちばん自然。まずここから借りる */
const _secWrongPool = {};
function secWrongPool(sec){
  if(!sec || !sec.id) return [];
  if(!_secWrongPool[sec.id]) _secWrongPool[sec.id] = wrongPoolFrom([sec]);
  return _secWrongPool[sec.id];
}
/* ② 同じ科目（数学／化学γ／物理β…）の誤答
   ★ 単元だけだと、その単元でいちばん長い文が正解の問題はどうにもならない。
     実測でも 32.4% → 16.9% までしか下がらなかった。
     科目までひろげると <b>3.7%</b> まで落ちる（同じ科目なら文の調子もそろっている）。 */
const _subjWrongPool = {};
function subjWrongPool(sec){
  const sub = subjectOfSid(sec && sec.id);
  if(!sub) return [];
  if(!_subjWrongPool[sub]) {
    _subjWrongPool[sub] = wrongPoolFrom(SECTIONS.filter((s) => subjectOfSid(s.id) === sub));
  }
  return _subjWrongPool[sub];
}

function pickWrongs(answer, wrongs, n, sec){
  const w = (wrongs || []).filter(Boolean);
  const a = String(answer == null ? "" : answer);
  const la = a.length;
  const len = (x) => String(x).length;
  let pick;
  if(w.length <= n) {
    pick = w.slice();
  } else {
    /* ① まず字数の近いものを候補にする（候補は必要数の2倍まで＝毎回同じ顔ぶれにしない） */
    const sorted = w.slice().sort((x, y) => Math.abs(len(x) - la) - Math.abs(len(y) - la));
    const near = sorted.slice(0, Math.min(w.length, n * 2));
    pick = shuffle(near).slice(0, n);
    /* ② それでも「正解がひとりだけ飛び抜けて長い」ままなら、
       使わなかった誤答のなかに<b>正解と同じか、より長いもの</b>があれば1つ入れ替える。 */
    if(pick.every((x) => len(x) < la)){
      const rest = w.filter((x) => pick.indexOf(x) < 0 && len(x) >= la);
      if(rest.length){
        const swapIn = rest[Math.floor(Math.random() * rest.length)];
        let worst = 0;
        pick.forEach((x, i) => { if(len(x) < len(pick[worst])) worst = i; });
        pick[worst] = swapIn;
      }
    }
  }
  /* ③ それでも正解だけが長いなら、ほかの問題の誤答を1つ借りる（単元 → 科目の順） */
  if(sec && pick.every((x) => len(x) < la)) pick = borrowLonger(a, la, pick, secWrongPool(sec), w);
  if(sec && pick.every((x) => len(x) < la)) pick = borrowLonger(a, la, pick, subjWrongPool(sec), w);
  return shuffle(pick);
}
/* ほかの問題の誤答から「正解と同じか少し長いもの」を1つ借りて、
   いちばん短い誤答と入れ替える。借りられなければ元の配列をそのまま返す。 */
function borrowLonger(a, la, pick, pool, exclude){
  if(!pool || !pool.length || !pick.length) return pick;
  const len = (x) => String(x).length;
  const own = new Set(pick.concat(exclude || [], [a]));
  const cand = pool.filter((x) =>
    !own.has(x) && len(x) >= la &&
    x.indexOf(a) < 0 && a.indexOf(x) < 0);               // 正解と重なるものは紛らわしいので外す
  if(!cand.length) return pick;
  cand.sort((x, y) => Math.abs(len(x) - la) - Math.abs(len(y) - la));
  /* 近いもの上位5件からランダム＝毎回おなじ顔ぶれにしない */
  const swapIn = cand[Math.floor(Math.random() * Math.min(cand.length, 5))];
  const out = pick.slice();
  let worst = 0;
  out.forEach((x, i) => { if(len(x) < len(out[worst])) worst = i; });
  out[worst] = swapIn;
  return out;
}

/* 正解＋誤答から、出題に使う {answer, opts, full} を組み立てる。
   answer は opts と突き合わせる用（ならしたあとの文字列）、
   full は解説に出す元の文字列。 */
function balanceOpts(answer, wrongs){
  const raw = [answer, ...(wrongs||[])];
  const has = raw.map(o => SUPP_RE.test(String(o==null?"":o)));
  const plain = { answer, opts: shuffle(raw), full: answer };
  if(has.every(Boolean) || !has.some(Boolean)) return plain;   // そろっている＝手を加えない
  const st = raw.map(stripSupp);
  if(st.some(x => !x)) return plain;                            // 空になる選択肢がある
  if(new Set(st).size !== st.length) return plain;              // 区別が付かなくなる
  return { answer: st[0], opts: shuffle(st), full: answer };
}
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-27 知らせは<b>重ねずに積む</b>（ご報告への対応）
   ------------------------------------------------------------
   これまでの toast() は <b>textContent を上書き</b>していたので、
   立て続けに呼ばれると<b>あとの1つしか残らなかった</b>。
   完全習得のときは
       earn(...)  → 「＋600 XEVA｜「◯◯」完全習得！」
       kpAdd(...) → 「💠 ＋5 KP（完全習得）」      ← これが上書き
   の順に呼ばれるので、<b>KP しか見えず XEVA が出ていない</b>ように見えていた
   （XEVA はちゃんと入っている。見えていなかっただけ）。
   確認テストの合格でも、スタミナ・レベルの知らせが同じように後ろから上書きしていた。
   → 表示中にもう一度呼ばれたら<b>行として足す</b>。まとめて読めるようにする。
   ★ 同じ文は2回足さない／4行までにする（画面を覆わないように）。
   ★ 中身は HTML ではなく<b>文字として</b>入れる（問題名がそのまま出るので）。
   ══════════════════════════════════════════════════════════════ */
function toast(msg, gold){
  const t=$("#toast"); if(!t) return;
  const showing = t.classList.contains("show");
  if(showing && Array.isArray(t._lines) && t._lines.length < 4 && t._lines.indexOf(msg) < 0) t._lines.push(msg);
  else { t._lines=[msg]; t._gld=false; }
  t._gld = t._gld || !!gold;
  t.textContent="";
  t._lines.forEach(s=>{ const el=document.createElement("span"); el.textContent=s; t.appendChild(el); });
  t.className="toast show"+(t._gld?" gld":"");
  clearTimeout(t._t);
  t._t=setTimeout(()=>{ t.classList.remove("show"); t._lines=null; t._gld=false; }, 2400 + (t._lines.length-1)*700);
}
function getAcc(){ return window.XEVA ? (window.XEVA.account.get()||{}) : {}; }
function bal(){ return window.XEVA ? window.XEVA.getBalance() : 0; }
function earn(n, msg, gold){
  const amt = rw(n);   // 🌻 キャンペーン中は2倍で付与
  if(amt>0 && window.XEVA) window.XEVA.add(amt, "MagiLex "+(msg||"学習")+(campaignActive()&&n>0?"（夏キャン2倍）":""));
  renderTop();
  if(msg) toast((amt>0?"＋"+amt+" XEVA"+(campaignActive()&&n>0?" 2倍!":"")+"｜":"")+msg, gold);
}

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-24 XEVARION 共通ステータス（レベル・スタミナ）との連携
   ------------------------------------------------------------
   ご指定:
     ・レベルは MagiBurst だけでなく <b>MagiLex でも上がる</b>。
         セットを<b>完全習得</b>した   … ＋LEX_EXP_MASTER
         <b>確認テストに合格</b>した … ＋LEX_EXP_CONFIRM
       どちらも<b>そのセットではじめて達成したとき</b>だけ入る
       （何度も受け直してレベルを稼げないようにするため）。
       リセットして周回し直したときは、また「はじめて」に戻る＝もう一度入る。
     ・<b>確認テストを1つクリアするたび</b>にスタミナ +50。
       こちらは<b>毎回</b>入り、しかも<b>上限を超えて</b>たまる（ご指定）。
   ★ 実体は xeva.js の XEVA.status。読めないときは黙って何もしない。
   ══════════════════════════════════════════════════════════════ */
const LEX_EXP_MASTER = 400;    // セットの完全習得（はじめての1回）
const LEX_EXP_CONFIRM = 200;   // 確認テスト合格（はじめての1回）
function xstatus(){ return (window.XEVA && window.XEVA.status) || null; }
/* レベルが上がったらトーストで知らせる */
function lexGainExp(n, why){
  const S = xstatus(); if(!S) return;
  const up = S.addExp(n, why || "MagiLex");
  /* toast は textContent なので、素の文字だけで組む（タグを入れるとそのまま出る） */
  if(up) toast("🎉 レベルアップ！ Lv."+up.from+" → Lv."+up.to, true);
  try{ renderTop(); }catch(e){}
}
/* 確認テストのクリアぶん（上限を超えて回復する） */
function lexGainStamina(name){
  const S = xstatus(); if(!S) return;
  const n = S.addFromLex("MagiLex 確認テスト"+(name?"："+name:""));
  toast("⚡ スタミナ ＋"+S.STAM_LEX_GAIN+"（いま "+S.text(n)+"）", true);
  try{ renderTop(); }catch(e){}
}

// ============================================================
// 発音（Web Speech API）と 消音/発音 モード
// ============================================================
const AUDIO_KEY = "magilex_audio_v1";   // "on"=発音モード / "off"=消音モード
let audioMode = (typeof localStorage!=="undefined" && localStorage.getItem(AUDIO_KEY)) || null;
const ttsSupported = (typeof window!=="undefined") && ("speechSynthesis" in window) && ("SpeechSynthesisUtterance" in window);
let _enVoice = null;
// PC（Windows/Mac）では既定の音声が機械的になりやすいので、ニューラル系（Natural/Online）や
// Google／Apple の高品質音声を優先して選ぶ。スコアが高いものほど流暢。
function voiceScore(v){
  const nm = (v.name||"") + " " + (v.voiceURI||"");
  const lang = (v.lang||"").replace("_","-");
  if(!/^en/i.test(lang)) return -1;                       // 英語以外は使わない
  let s = 0;
  if(/^en-US/i.test(lang)) s += 60;                       // 米国英語を最優先
  else if(/^en-(GB|AU|CA|IE|NZ)/i.test(lang)) s += 25;
  if(/natural|neural/i.test(nm)) s += 120;                // Microsoft Ava/Aria (Natural) など
  if(/\bonline\b/i.test(nm)) s += 70;                     // Microsoft のオンライン（高品質）音声
  if(/google/i.test(nm)) s += 100;                        // Chrome の Google US English
  if(/samantha|ava|allison|siri|premium|enhanced/i.test(nm)) s += 80;   // macOS/iOS の高品質音声
  if(v.localService === false) s += 30;                   // ネットワーク音声は総じて自然
  if(/david|zira|mark|hazel|eloquence|compact|espeak/i.test(nm)) s -= 40; // 旧世代の機械的な音声
  return s;
}
function pickEnVoice(){
  try{
    const vs = speechSynthesis.getVoices() || [];
    let best = null, bestS = -1;
    vs.forEach(v=>{ const s = voiceScore(v); if(s > bestS){ bestS = s; best = v; } });
    if(best) _enVoice = best;
  }catch(e){}
}
if(ttsSupported){
  try{
    pickEnVoice();
    speechSynthesis.onvoiceschanged = pickEnVoice;
    // Chrome/Edge は音声一覧が遅れて届くことがあるので、数回だけ選び直す
    [300, 900, 2000].forEach(ms=>setTimeout(pickEnVoice, ms));
  }catch(e){}
}
function speakWord(text){
  if(!ttsSupported || !text) return;
  try{
    if(!_enVoice) pickEnVoice();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.lang = (_enVoice && _enVoice.lang) || "en-US";
    u.rate = 0.95; u.pitch = 1.02; u.volume = 1;   // 自然な速さ・高さ
    if(_enVoice) u.voice = _enVoice;
    speechSynthesis.speak(u);
  }catch(e){}
}
window.lexSpeak=(b)=>{ try{ const t=b&&b.getAttribute("data-w"); speakWord(t); }catch(e){} };
function spkBtn(word){ return ttsSupported ? `<button class="spk" data-w="${esc(word)}" onclick="event.stopPropagation();lexSpeak(this)" title="発音を聞く" aria-label="発音">${uiIconSVG('sound')}</button>` : ""; }
function autoSpeakIfOn(word){ if(audioMode==="on") setTimeout(()=>speakWord(word), 180); }

// 起動時の注意書き（AI作成のため答えに誤りが含まれる可能性・毎回表示）
function showLexDisclaimer(then){
  const ov=document.createElement("div"); ov.className="audio-ask"; ov.id="lexDisclaim";
  ov.innerHTML=`<div class="aa-card">
      <div class="aa-ic">⚠️</div>
      <h3>ご利用にあたって</h3>
      <p>念入りに確認をしていますが、AIによる作成により一部の答えが違う場合がありますがご了承ください。<br>違う場合がありましたら、管理者までご連絡ください。</p>
      <div class="aa-btns">
        <button class="aa-btn pri" onclick="lexCloseDisclaimer()"><b>確認しました</b></button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add("show"));
  window._disclaimThen=then||null;
}
window.lexCloseDisclaimer=()=>{
  const ov=$("#lexDisclaim"); if(ov){ ov.classList.remove("show"); setTimeout(()=>ov.remove(),300); }
  const then=window._disclaimThen; window._disclaimThen=null; if(then) setTimeout(then,360);
};

// 起動時の 消音/発音 モード選択（初回のみ）
function maybeAskAudioMode(then){
  if(audioMode==="on"||audioMode==="off"){ if(then) then(); return; }
  if(!ttsSupported){ audioMode="off"; try{localStorage.setItem(AUDIO_KEY,"off");}catch(e){} if(then) then(); return; }
  const ov=document.createElement("div"); ov.className="audio-ask"; ov.id="audioAsk";
  ov.innerHTML=`<div class="aa-card">
      <div class="aa-ic">${uiIconSVG('sound')}</div>
      <h3>音のモードを選んでください</h3>
      <p>英単語の学習中に、ネイティブ発音を自動で読み上げできます。<br>あとから設定でいつでも変更できます。</p>
      <div class="aa-btns">
        <button class="aa-btn pri" onclick="lexChooseAudio('on')"><b>${uiIconSVG('sound')} 発音モード</b><span>単語を表示すると自動で発音</span></button>
        <button class="aa-btn" onclick="lexChooseAudio('off')"><b>${uiIconSVG('mute')} 消音モード</b><span>音を出さずに静かに学習</span></button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add("show"));
  window._audioAskThen=then||null;
}
window.lexChooseAudio=(m)=>{
  audioMode=m; try{ localStorage.setItem(AUDIO_KEY,m); }catch(e){}
  const ov=$("#audioAsk"); if(ov){ ov.classList.remove("show"); setTimeout(()=>ov.remove(),300); }
  toast(m==="on"?"🔊 発音モードにしました":"🔇 消音モードにしました");
  const then=window._audioAskThen; window._audioAskThen=null; if(then) setTimeout(then,360);
};
window.lexSetAudio=(m)=>{ audioMode=m; try{ localStorage.setItem(AUDIO_KEY,m); }catch(e){} renderSettings(); toast(m==="on"?"🔊 発音モードにしました":"🔇 消音モードにしました"); if(m==="on") speakWord("pronunciation"); };

// 自動送りの設定（オンオフ・秒数）
window.lexSetAutoNext=(m)=>{ autoNext.on=(m==="on"); saveAutoNext(); renderSettings(); toast(autoNext.on?"自動で次の問題へ進みます":"手動で次の問題へ進みます"); };
window.lexAutoNextTime=(which, delta)=>{
  const cur = which==="correct" ? autoNext.correct : autoNext.wrong;
  const v = Math.min(AUTONEXT_MAX, Math.max(AUTONEXT_MIN, cur + delta));
  if(which==="correct") autoNext.correct=v; else autoNext.wrong=v;
  saveAutoNext(); renderSettings();
};

// フラッシュカードの「覚えたカードを出さない」設定・記録リセット
function fcKnownCount(){ let n=0; const f=P.fcKnown||{}; Object.keys(f).forEach(k=>{ n+=Object.keys(f[k]||{}).length; }); return n; }
window.lexSetFlashHide=(m)=>{ flashOpt.hideKnown=(m==="on"); saveFlashOpt(); renderSettings(); toast(flashOpt.hideKnown?"🃏 覚えたカードは出題しません":"🔁 すべてのカードを出題します"); };
window.lexResetFlashKnown=async ()=>{
  if(fcKnownCount()===0){ toast("戻すカードがありません"); return; }
  if(await askYesNo("覚えた印を戻します", "フラッシュカードで「覚えた」にしたカードをすべて「わからない」に戻します。\nもう一度出題されるようになります。", "戻す")){
    P.fcKnown={}; save(); renderSettings(); toast("フラッシュカードの記録を「わからない」に戻しました");
  }
};

// ============================================================
// アリサ解放（英単語をすべて完全習得で配布）
// ============================================================
const ARISA_KEY = "magilex_arisa_v1";
function englishContents(){ return wordContents().filter(c=>c.key.indexOf("eigo")===0); }
function grantArisa(){
  try{
    const gk="xeva_gacha_v1"; let g=null;
    try{ g=JSON.parse(localStorage.getItem(gk)||"null"); }catch(e){}
    if(!g||typeof g!=="object") g={owned:{},points:{}};
    if(!g.owned) g.owned={};
    g.owned["arisa"]=true;
    localStorage.setItem(gk, JSON.stringify(g));
  }catch(e){}
}
function checkArisaUnlock(){
  // 英単語完全習得での「アリサ」配布は終了（2026-07-02）。以降は付与しない。
  return;
}
// ============================================================
// ★★ 2026-08-26 Knowledge Point（KP）— MagiLex 専用のポイント
// ------------------------------------------------------------
//   ご指定:
//     ・コンテンツを<b>完全習得</b>すると <b>+5KP</b>
//     ・<b>確認テストに合格</b>すると <b>+10KP</b>
//     ・KP は MagiLex の中だけで使う（ほかのアプリには出さない）
//   使い道は KP交換所:
//     ・<b>80KP</b> … キャラ1体（未所持なら入手／所持なら+1凸。完凸は交換できない）
//     ・<b>10KP</b> … 🎫ガチャチケット1枚（XEVARION 共通のガチャ券）
//   ★ 残高は magilex_v2（P.kp）に持つ＝MagiLex のクラウド同期にそのまま乗る。
//     XEVA・ジェムのような共通ウォレットには<b>入れない</b>（他アプリに出す必要がないため）。
//   ★ 二重取りの防止は、これまでの XEVA と<b>まったく同じ印</b>を使う:
//     完全習得は P.qmastered / P.wmastered、確認テストは P.confirmDone。
//     どちらも「はじめての1回」でしか立たないので、KP もその中で足す。
// ============================================================
const KP_MASTER = 5;      // 完全習得 1件ぶん
const KP_CONFIRM = 10;    // 確認テスト 合格1回ぶん
const KP_CHAR_COST = 80;  // キャラ1体
const KP_TICKET_COST = 10;// ガチャチケット1枚
const KP_MAX_AWK = 4;     // 限界突破の上限（MagiBurst の MAX_AWK と同じ）
function kpBalance(){ return Math.max(0, (P.kp|0)); }
function kpAdd(n, reason){
  n = Math.round(n||0); if(!n) return kpBalance();
  P.kp = kpBalance() + n;
  P.kpTotal = (P.kpTotal|0) + Math.max(0, n);
  P.kpLog = P.kpLog || [];
  P.kpLog.unshift({ n, r: reason||"", t: Date.now() });
  if(P.kpLog.length > 60) P.kpLog.length = 60;
  save();
  return P.kp;
}
function kpSpend(n, reason){
  n = Math.round(n||0);
  if(kpBalance() < n) return false;
  P.kp = kpBalance() - n;
  P.kpLog = P.kpLog || [];
  P.kpLog.unshift({ n: -n, r: reason||"", t: Date.now() });
  if(P.kpLog.length > 60) P.kpLog.length = 60;
  save();
  return true;
}
/* ★ KP を入れる前からずっと遊んでいた人が 0KP から始めるのは筋がとおらないので、
   すでにある「完全習得の件数」と「確認テストの合格数」から<b>1回だけ</b>さかのぼって配る。
   印（P.kpBack）を立てるので、2回目からは走らない。 */
function kpBackfillOnce(){
  if(P.kpBack) return;
  P.kpBack = Date.now();
  const m = Object.keys(P.qmastered||{}).length + Object.keys(P.wmastered||{}).length;
  const c = Object.keys(P.confirmDone||{}).length;
  const n = m*KP_MASTER + c*KP_CONFIRM;
  if(n > 0){ kpAdd(n, "これまでの学習ぶん（完全習得 "+m+"件・確認テスト "+c+"件）"); }
  else save();
}
function masteredCount(){
  return Object.keys(P.qmastered||{}).length + Object.keys(P.wmastered||{}).length;
}
// ============================================================
// KP交換所のキャラ（★ 2026-08-26）
//   ★ 名前・絵はここに書くが、<b>性能は書かない</b>。
//     くわしい性能は MagiBurst の mb-core.js が持ち主なので、
//     「くわしく見る」を押したときだけ mb-core.js を読みこんで、
//     ガチャ・図鑑とまったく同じ詳細画面（openDetX）を開く。
//   ★ 所持・限界突破は共有コレクション xeva_gacha_v1。
//     MagiBurst 側の SHARED_CHARS にこの4体を足してあるので、
//     交換した瞬間から MagiBurst でも使える。
// ============================================================
const KP_CHARS = [
  { id:"mizuki",  nm:"ミズキ",   el:"木", img:"../img/Mizuki.webp",  th:"../img/t_Mizuki.webp",
    tag:"翠光審判型・貫通", note:"蓬莱の九重 第二重の最適解。ネクサスは<b>アカデミー・フォース</b>（味方全員の攻撃力 +11%）" },
  { id:"kanade",  nm:"カナデ",   el:"光", img:"../img/Kanade.webp",  th:"../img/t_Kanade.webp",
    tag:"鐘光共鳴型・反射", note:"蓬莱の九重 第五重の最適解。ネクサスは<b>アカデミー・ボンド</b>（リンク威力 +13%）" },
  { id:"homura",  nm:"ホムラ",   el:"火", img:"../img/Homura.webp",  th:"../img/t_Homura.webp",
    tag:"灼夏雷撃型・貫通", note:"蓬莱の九重 第三重の最適解。ネクサスは<b>アカデミー・イグニッション</b>（開幕FB -2ターン）" },
  { id:"yoizuki", nm:"ヨイヅキ", el:"水", img:"../img/Yoizuki.webp", th:"../img/t_Yoizuki.webp",
    tag:"氷夜掃滅型・反射", note:"蓬莱の九重 第六重の最適解。ネクサスは<b>アカデミー・イージス</b>（開幕バリア900）" },
  { id:"sumika",  nm:"スミカ",   el:"闇", img:"../img/Sumika.webp",  th:"../img/t_Sumika.webp",
    tag:"紫宵穿命型・貫通", note:"蓬莱の九重 第九重の最適解。ネクサスは<b>アカデミー・ヴィガー</b>（最大HP +11%）" },
];
const KP_EL_C = { "火":"#ff5d47", "水":"#38a6ff", "木":"#2fbf71", "光":"#f0b429", "闇":"#a86bff" };
/* 共有コレクション（xeva_gacha_v1）の読み書き。MagiBurst と同じ形。 */
function xgRead(){
  let g=null;
  try{ g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"null"); }catch(e){}
  if(!g||typeof g!=="object") g={};
  if(!g.owned) g.owned={}; if(!g.dupes) g.dupes={}; if(!g.points) g.points={};
  return g;
}
function xgWrite(g){ try{ localStorage.setItem("xeva_gacha_v1", JSON.stringify(g)); }catch(e){} }
function kpCharState(id){
  const g = xgRead();
  const own = !!g.owned[id];
  const awk = Math.max(0, Math.min(KP_MAX_AWK, g.dupes[id]|0));
  return { own, awk, maxed: own && awk >= KP_MAX_AWK };
}
/* キャラ1体を受け取る（未所持なら入手・所持なら+1凸）。完凸のときは false */
function kpGrantChar(id){
  const g = xgRead();
  const own = !!g.owned[id];
  const awk = Math.max(0, Math.min(KP_MAX_AWK, g.dupes[id]|0));
  if(own && awk >= KP_MAX_AWK) return false;
  if(!own){ g.owned[id]=true; if(g.dupes[id]==null) g.dupes[id]=0; }
  else g.dupes[id] = awk + 1;
  xgWrite(g);
  return true;
}

function showArisaModal(){
  let ov=$("#arisaOv");
  if(!ov){
    ov=document.createElement("div"); ov.id="arisaOv"; ov.className="arisa-ov";
    ov.innerHTML=`<div class="arisa-card">
        <div class="arisa-burst"></div>
        <div class="arisa-cap">英単語コンプリート報酬</div>
        <img class="arisa-img" src="../img/Arisa.webp" alt="アリサ" onerror="this.style.display='none'">
        <div class="arisa-name">アリサ <span>を獲得！</span></div>
        <div class="arisa-rar">★★★ SSR</div>
        <p>難関大英単語をすべて完全習得しました！<br>限定キャラクター「アリサ」をコレクションに加えました。</p>
        <button class="arisa-btn" onclick="document.getElementById('arisaOv').remove()">やったー！ ✨</button>
      </div>`;
    document.body.appendChild(ov);
  }
  requestAnimationFrame(()=>ov.classList.add("show"));
}

// ============================================================
// 進捗データ（本体=localStorage 保存）
// ============================================================
function freshProgress(){ return { registered:false, daily:"", streak:0, lastStudy:"", quiz:{}, qmastered:{}, words:{}, wmastered:{}, mixHist:[], totals:{answered:0,correct:0}, missionDone:false, activeQuiz:null, fcKnown:{}, resets:{},
  /* ★ v14: 確認テストの受取記録（コンテンツID → 受け取った日時）とミックス問題の出題範囲 */
  confirmDone:{}, mixSel:null,
  /* ★★ 2026-08-22 連続ログインボーナスとビンゴミッション。
     login … { last:ローカル日付, streak:連続日数, total:通算, best:最長 }
     bingo … { m:"YYYY-MM", cells:[25], open:{マス番号}, lines:{ラインkey}, all:受取日時 }
     bmc   … その月ぶんの小さな数え表（科目べつの解答数・全問正解の回数） */
  login:{ last:"", streak:0, total:0, best:0 }, bingo:null, bmc:{},
  /* ★★ 2026-08-26 Knowledge Point（KP）。MagiLex の中だけで使うポイント。
     kp … いまの残高 ／ kpTotal … これまでにためた合計 ／ kpLog … 出入りの記録
     kpBack … さかのぼり配布をすませた印 */
  kp:0, kpTotal:0, kpLog:[], kpBack:0,
  updatedAt:0 }; }
let P = freshProgress();
/* ★ 2026-08-16 セクションidの付け替えに合わせて、保存ずみの進捗キーも写す。
   これをやらないと、すでに解いた4セットが「未習得」に戻って見える。
   ・P.quiz / P.qmastered はセクションid（sid）がキー
   ・P.resets / P.confirmDone はコンテンツid（"q_"+sid）がキー
   写したあとは古いキーを消す。すでに新キーがあるときは触らない（上書きで巻き戻さない）。 */
const SID_RENAME = {
  math_shinzui_limit:   "math_c3_limitseq",
  math_shinzui_complex: "math_c3_cplxbasic",
  math_shinzui_conic:   "math_c3_conicbasic",
  math_shinzui_calc:    "math_c3_calcbasic"
};
function migrateRenamedSids(){
  let moved = false;
  Object.keys(SID_RENAME).forEach(old=>{
    const nw = SID_RENAME[old];
    [["quiz",""],["qmastered",""],["resets","q_"],["confirmDone","q_"]].forEach(([bag,pre])=>{
      const m = P[bag]; if(!m) return;
      const ok = pre+old, nk = pre+nw;
      if(m[ok]!==undefined){
        if(m[nk]===undefined) m[nk] = m[ok];
        delete m[ok]; moved = true;
      }
    });
  });
  if(moved) save();
}
function loadLocal(){ try{ const r=localStorage.getItem(LS_KEY); if(r){ P=Object.assign(freshProgress(), JSON.parse(r)); } }catch(e){} try{ migrateRenamedSids(); }catch(e){} }
function save(){ P.updatedAt=Date.now(); try{ localStorage.setItem(LS_KEY, JSON.stringify(P)); }catch(e){} }

// ============================================================
// コンテンツ抽象化（quiz=4択セクション / word=単語帳）
// ============================================================
function quizContents(){ return SECTIONS.map(s=>({ type:"quiz", id:"q_"+s.id, sid:s.id, sec:s, name:s.name, icon:s.icon||"📘", total:(s.questions||[]).length })); }
function wordContents(){ return Object.entries(SUBJECTS).map(([k,v])=>({ type:"word", id:"w_"+k, key:k, subj:v, name:v.label||k, icon:v.icon||"📗", total:Object.keys(v.data||{}).length })); }
function allContents(){ return quizContents().concat(wordContents()); }
function findContent(id){ return allContents().find(c=>c.id===id); }

// 習得状況: 完全習得 / 習得中（着手済み未習得）/ 未習得
function masteryCounts(c){
  let mastered=0, learning=0;
  if(c.type==="quiz"){ const m=P.quiz[c.sid]||{}; for(let i=0;i<c.total;i++){ const r=m[i]; if(r&&r.m) mastered++; else if(r) learning++; } }
  else { const m=P.words[c.key]||{}; Object.keys(c.subj.data||{}).forEach(w=>{ const r=m[w]; if(r&&r.m) mastered++; else if(r) learning++; }); }
  return { mastered, learning, untouched:Math.max(0,c.total-mastered-learning), total:c.total };
}
function isMastered(c){ const mc=masteryCounts(c); return mc.total>0 && mc.mastered>=mc.total; }
function statusOf(c){ const mc=masteryCounts(c); if(mc.total>0&&mc.mastered>=mc.total) return "done"; if(mc.mastered>0||mc.learning>0) return "learn"; return "none"; }
const STATUS_LABEL={done:"完全習得",learn:"習得中",none:"未習得"};

// ============================================================
// コンテンツのリセット（v13.1）
//   ・そのコンテンツの習得状況（習得中／完全習得）をまっさらに戻す
//   ・完全習得の受取記録も消えるので、もう一度 完全習得すれば XEVA を再度もらえる
//   ・リセットした回数は記録して「何周目か」を表示する
// ============================================================
function resetCountOf(c){ return (P.resets && P.resets[c.id]) || 0; }
window.lexResetContent = async function(id){
  const c = findContent(id); if(!c) return;
  const mc = masteryCounts(c);
  const again = (c.type==="quiz" ? !!P.qmastered[c.sid] : !!P.wmastered[c.key]);
  const lines = [
    "「" + c.name + "」の習得状況をリセットします。",
    "",
    "・完全習得 " + mc.mastered + " 件／習得中 " + mc.learning + " 件 → すべて未習得に戻ります",
    "・もう一度 完全習得すると " + rw(masterReward(c)).toLocaleString() + " XEVA を「再度」受け取れます",
  ];
  if(!again) lines.push("・このコンテンツはまだ完全習得していません");
  lines.push("", "リセットしますか？");
  const msg = lines.join("\n");
  if(!await askYesNo("習得状況をリセットします", msg, "リセットする")) return;
  if(c.type==="quiz"){ delete P.quiz[c.sid]; delete P.qmastered[c.sid]; }
  else { delete P.words[c.key]; delete P.wmastered[c.key]; }
  /* 習得をリセットしたら確認テストの受取記録も消す（もう一度 全問正解すればまたもらえる） */
  if(P.confirmDone) delete P.confirmDone[c.id];
  if(P.fcKnown) delete P.fcKnown[c.id];
  P.resets = P.resets || {};
  P.resets[c.id] = resetCountOf(c) + 1;
  if(P.activeQuiz && P.activeQuiz.cid === c.id) P.activeQuiz = null;
  save();
  toast("「"+c.name+"」をリセットしました（"+(P.resets[c.id]+1)+"周目）");
  renderDetail();
};
function checkMastery(c){
  if(!isMastered(c)) return;
  if(c.type==="quiz"){ if(P.qmastered[c.sid]) return; P.qmastered[c.sid]=Date.now(); }
  else { if(P.wmastered[c.key]) return; P.wmastered[c.key]=Date.now(); }
  try{ dayLog().s++; }catch(e){}   // その日に完全習得した数（カレンダー用）
  const vm = volumeMult(c.total);
  save();
  earn(masterReward(c), "「"+c.name+"」完全習得！" + (vm>1 ? `（${c.total}問・ボリューム${vm}倍！）` : ""), true);
  /* ★ 2026-08-24 XEVARION 全体のレベルも上がる（このセットではじめて完全習得したときだけ）。
     ここは P.qmastered / P.wmastered の印を付けた<b>直後</b>なので、2回目以降は通らない。 */
  lexGainExp(LEX_EXP_MASTER, "MagiLex 完全習得："+c.name);
  /* ★★ 2026-08-26 完全習得で +5KP。ここは qmastered の印を付けた<b>直後</b>なので、
     2回目以降は通らない（リセットして取り直せば、また1回ぶんもらえる）。 */
  kpAdd(KP_MASTER, "「"+c.name+"」完全習得");
  toast("💠 ＋"+KP_MASTER+" KP（完全習得）", true);
  checkArisaUnlock();
}

// ============================================================
// 画面遷移
// ============================================================
let nav=[];
/* ★ 2026-08-16b ヘッダーの高さを測って CSS に流す。
   問題ヘッダー（✕）をヘッダーのすぐ下に貼り付けるのに使う。
   iPhone はセーフエリアぶん高さが変わるので、決め打ちにはできない。 */
function syncTopbarH(){
  const tb = document.querySelector(".topbar"); if(!tb) return;
  const h = Math.round(tb.getBoundingClientRect().height);
  if(h > 0) document.documentElement.style.setProperty("--tbh", h + "px");
}
try{
  window.addEventListener("resize", syncTopbarH);
  if(window.visualViewport) window.visualViewport.addEventListener("resize", syncTopbarH);
}catch(e){}

function show(screen, push=true){
  if(push) nav.push(screen);
  syncTopbarH();
  // クイズ画面から離れるときは自動送りタイマーを止める（裏で勝手に進まないように）
  if(screen.name!=="quiz") clearAutoNext();
  /* ★ 2026-08-17c ミックスの固定バーは <body> 直下にあるので、
     画面を離れても自動では消えない。ここで片づける。 */
  if(screen.name!=="mixsetup") mixBarHide();
  // クイズ中は下部ナビ等を隠してコンパクト表示（iPhoneでスクロール不要に）
  document.body.classList.toggle("in-quiz", screen.name==="quiz");
  /* ★ 2026-08-16b 右下の「メモ」は問題画面のあいだだけ出す。
     画面を離れるときは閉じておく（ホームに戻ったのにシートが残っていると迷う）。 */
  try{
    memoFabShow(screen.name === "quiz");
    if(screen.name !== "quiz" && memo.open) lexMemoClose();
  }catch(e){}
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));
  const el=$("#scr-"+screen.name); if(el) el.classList.add("on");
  document.querySelectorAll(".nav .nv").forEach(b=>b.classList.toggle("on", b.dataset.tab===(screen.tab||screen.name)));
  window.scrollTo(0,0);
}
window.lexTab=(name)=>{ nav=[{name, tab:name}]; render(name); show({name, tab:name}, false); };
function render(name, arg){
  ({ home:renderHome, library:renderLibrary, detail:renderDetail, mixsetup:renderMixSetup, stats:renderStats, settings:renderSettings, kpshop:renderKpShop }[name]||(()=>{}))(arg);
}
/* ★★ 2026-08-24 XEVARION 共通ステータス（レベル・スタミナ）をホームに出す。
   ・レベルは MagiBurst と<b>同じもの</b>（MagiLex の完全習得・確認テスト合格でも上がる）。
   ・スタミナは MagiBurst のプレイで減り、<b>確認テストを1つクリアするたびに +50</b>。
     こちらは<b>上限を超えて</b>たまるので、4ケタになったら「999+」と出す。 */
function lexStatusHTML(){
  const S = xstatus(); if(!S) return "";
  const v = S.get();
  return `<div class="hero-st">
    <div class="hs-lv" title="XEVARION 全体のレベル（MagiBurst と共通）">
      <small>Lv.</small><b>${v.lv}</b>
      <i class="hs-bar"><i style="width:${v.need? Math.round(Math.min(1,v.cur/v.need)*100):100}%"></i></i>
    </div>
    <button class="hs-stam${v.stam<v.play?" low":""}" onclick="lexOpenStamina()" title="スタミナ（MagiBurst 1プレイ ${v.play}）">
      <img src="../stamina.png" alt="スタミナ"><b>${S.text(v.stam)}</b><small>/${v.max}</small><i>＋</i>
    </button>
  </div>`;
}
/* スタミナの案内。💎ジェムでの回復もここから */
async function lexOpenStamina(){
  const S = xstatus(); if(!S) return;
  const v = S.get();
  const gem = (window.XEVA && window.XEVA.gem) ? window.XEVA.gem.getBalance() : 0;
  const body = [
    "いまのスタミナ： " + S.text(v.stam) + " / " + v.max + (v.full ? "（満タン）" : ""),
    v.full ? "" : "次の1回復まで あと " + S.when(v.nextMs) + "／満タンまで あと " + S.when(v.fullMs),
    "",
    "・MagiBurst は 1プレイ " + v.play + " 使います",
    "・2分ごとに +1 回復します（上限まで）",
    "・💎" + v.gemCost + " で +" + v.gemGain + " 回復します（上限まで）",
    "・MagiLex の確認テストを1つクリアするたび +" + v.lexGain + "（上限を超えてたまります）",
    "",
    "スタミナの上限はレベルで上がります（いま Lv." + v.lv + " ＝ " + v.max + "）。",
    "所持ジェム： 💎" + gem.toLocaleString(),
  ].filter((x)=>x!==null).join("\n");
  if(v.stam >= v.max || gem < v.gemCost){
    await askYesNo("⚡ スタミナ", body + (gem < v.gemCost && v.stam < v.max ? "\n\n💎ジェムが足りません（必要 " + v.gemCost + "）。" : ""), "とじる");
    return;
  }
  if(!await askYesNo("⚡ スタミナを回復する", body + "\n\n💎" + v.gemCost + " を使って +" + v.gemGain + " 回復しますか？", "💎" + v.gemCost + " で回復する")) return;
  if(!window.XEVA.gem.spend(v.gemCost, "スタミナ回復")){ toast("💎ジェムが足りませんでした"); return; }
  S.add(v.gemGain, "💎ジェムで回復");
  toast("⚡ スタミナ ＋" + v.gemGain, true);
  renderHome();
}
window.lexOpenStamina = lexOpenStamina;
/* 他のアプリ・他のタブで増減したら、ホームを出しているあいだは描き直す */
window.addEventListener("xeva:status", () => {
  try{ if(document.querySelector("#scr-home.on")) renderHome(); }catch(e){}
});

function renderTop(){
  const acc=getAcc();
  document.querySelectorAll(".js-coin").forEach(e=>e.textContent=bal().toLocaleString());
  /* 保存された charFile は移籍前の古いパスのことがあるので正規化してから使う */
  const cf = (window.XEVA&&window.XEVA.canonCharFile) ? window.XEVA.canonCharFile(acc.charFile, acc.charId) : acc.charFile;
  document.querySelectorAll(".js-av").forEach(img=>{ img.src = cf ? CHARS_BASE+cf : "../img/Hina.webp"; });
}

// ============================================================
// ホーム
// ============================================================
function greet(){ const h=new Date().getHours(); return h<5?"こんばんは":h<11?"おはようございます":h<18?"こんにちは":"こんばんは"; }
function renderHome(){
  const acc=getAcc();
  const conts=allContents();
  const masteredSecs=conts.filter(isMastered).length;
  const aq = P.activeQuiz;
  const resumeHTML = (aq && aq.items && aq.idx < aq.items.length) ? `
    <button class="resume-card" onclick="lexResumeQuiz()">
      <div class="ic">${uiIconSVG('redo')}</div>
      <div class="tx"><b>中断したクイズを再開</b><p>${aq.src==="mix"?"ミックス問題":aq.src==="confirm"?"確認テスト":"クイズ"} ・ ${aq.idx+1} / ${aq.items.length} 問目から</p></div>
      <div class="go">→</div>
    </button>` : "";
  const campHTML = campaignActive() ? `
    <div class="camp-bn" onclick="showLexHowto(true)">
      <span class="cb-sun">${uiIconSVG('sun')}</span>
      <div class="cb-bd">
        <b>夏の学習キャンペーン開催中！</b>
        <p>期間中（〜${CAMPAIGN.to.slice(5).replace("-","/")}）は獲得XEVAが<span class="cb-x2">すべて×2</span>！</p>
      </div>
    </div>` : "";
  /* ★★ 2026-08-26 KP のバナー。押すと KP交換所へ。
     これまでは「30コンテンツ完全習得でミズキ」というマイルストーン式だったが、
     ご指定により<b>KPをためて交換する</b>形に変わった。 */
  const kpNext = KP_CHARS.filter(c => !kpCharState(c.id).maxed).length;
  const kpHTML = `
    <div class="mizuki-bn kp-bn" role="button" tabindex="0" onclick="lexKpShop()">
      <img src="kp.webp" alt="KP" onerror="this.style.display='none'">
      <div class="mz-bd">
        <b>${uiIconSVG('trophy')} Knowledge Point（KP）交換所</b>
        <p>いま <b class="kp-now">${kpBalance()}</b> KP　／　完全習得 <b>+${KP_MASTER}</b>・確認テスト合格 <b>+${KP_CONFIRM}</b><br>
          <b>${KP_CHAR_COST}KP</b> でキャラ1体（残り ${kpNext} 体）・<b>${KP_TICKET_COST}KP</b> で🎫ガチャチケット1枚</p>
        <p class="mz-note">⚔ 交換したキャラは <b>MagiBurst・MagiBattle・アイコン</b>など全コンテンツで使えます</p>
      </div>
      <span class="kp-go">→</span>
    </div>`;
  $("#scr-home").innerHTML=`
    ${campHTML}
    ${kpHTML}
    ${resumeHTML}
    <div class="hero">
      <div class="hero-top">
        <div class="hero-nm">
          <div class="greet">${greet()}、</div>
          <div class="nm">${esc(acc.name||"ユーザー")} さん</div>
        </div>
        ${lexStatusHTML()}
      </div>
      <!-- ★ 2026-08-24 ステータスは<b>1行におさめる</b>（ご指定）。
           4つを同じ幅で並べ、はみ出す端末では横スクロールにする（折り返さない）。 -->
      <div class="row">
        <div class="chip" title="学習ストリーク"><span>ストリーク</span><b>${P.streak||0} 日</b></div>
        <div class="chip" title="連続ログイン"><span>ログイン</span><b>${(P.login&&P.login.streak)||0} 日</b></div>
        <div class="chip" title="習得コンテンツ"><span>習得ずみ</span><b>${masteredSecs} / ${conts.length}</b></div>
        <div class="chip" title="正答率"><span>正答率</span><b>${P.totals.answered? Math.round(P.totals.correct/P.totals.answered*100):0}%</b></div>
      </div>
    </div>
    ${mlBingoCardHTML()}
    <div class="menu-grid">
      <button class="m-card accent wide" onclick="lexTab('library')">
        <div class="mi">${uiIconSVG('study')}</div><div><h3>学習する</h3><p>選択クイズ・単語帳フラッシュカードから選ぶ・未習得の問題を優先出題</p></div>
      </button>
      <button class="m-card" onclick="lexMixSetup()"><div class="mi">${uiIconSVG('mix')}</div><h3>ミックス問題</h3><p>${mixSelIds().length===allContents().length?"全範囲":"えらんだ範囲"}${mixOnlyUn()?"の<b>未習得だけ</b>":""}から${mixSelCount()}問<br>90%↑ +${rw(REWARD.mix90)} / 100% +${rw(REWARD.mix100)}${campaignActive()?'（2倍）':''}</p></button>
      <button class="m-card xv-card-lnk" onclick="lexToXevynar()"><div class="mi">${uiIconSVG('exam')}</div><h3>XEVYNARで学ぶ</h3><p>数学・物理・化学γの<b>難問の解きかた</b>を1手ずつ<br>詰まった手だけ公式と例題に戻れます</p></button>
      <button class="m-card" onclick="lexTab('stats')"><div class="mi">${uiIconSVG('stats')}</div><h3>学習データ</h3><p>進捗・正答率</p></button>
      <button class="m-card" onclick="showLexHowto(true)"><div class="mi">${uiIconSVG('spark')}</div><h3>XEVAの入手方法</h3><p>もう一度見る</p></button>
    </div>
    ${installCardHTML()}`;
  renderTop();
}


// ============================================================
// ★★ 2026-08-26 KP交換所
// ------------------------------------------------------------
//   ・80KP … キャラ1体（未所持なら入手／所持なら+1凸）。<b>完凸のキャラは交換できない</b>
//   ・10KP … 🎫ガチャチケット1枚（XEVARION 共通のガチャ券）
//   ★ キャラの<b>くわしい性能</b>は「くわしく見る」から。
//     性能の持ち主は MagiBurst の mb-core.js なので、ここには数字を写さず、
//     押されたときだけ mb-core.js を読みこんで<b>ガチャ・図鑑と同じ詳細画面</b>を開く。
//     （1.1MB あるので、ふだんの学習では読みこまない）
// ============================================================
window.lexKpShop = () => { nav.push({name:"kpshop", tab:"home"}); renderKpShop(); show({name:"kpshop", tab:"home"}, false); };
function renderKpShop(){
  const bal = kpBalance();
  const cards = KP_CHARS.map(c => {
    const st = kpCharState(c.id);
    const can = !st.maxed && bal >= KP_CHAR_COST;
    const label = st.maxed ? "完凸ずみ" : (!st.own ? "入手する" : "+1凸する");
    const state = st.maxed ? '<span class="kpc-max">👑 完凸</span>'
      : st.own ? '<span class="kpc-own">所持・+'+st.awk+'凸</span>'
      : '<span class="kpc-no">未所持</span>';
    return `<div class="kpc" style="--kpc:${KP_EL_C[c.el]||"#7b5cf0"}">
      <img class="kpc-img" src="${c.th}" alt="${c.nm}" loading="lazy" onerror="this.style.display='none'">
      <div class="kpc-bd">
        <div class="kpc-nm">${c.nm} <i>${c.el}属性</i> ${state}</div>
        <div class="kpc-tag">${c.tag}</div>
        <div class="kpc-note">${c.note}</div>
      </div>
      <div class="kpc-acts">
        <button class="kpc-det" onclick="lexKpDetail('${c.id}')">くわしく見る</button>
        <button class="kpc-buy" ${can?"":"disabled"} onclick="lexKpBuyChar('${c.id}')">
          ${label}<small>${st.maxed?"交換できません":KP_CHAR_COST+" KP"}</small></button>
      </div>
    </div>`;
  }).join("");
  const canT = bal >= KP_TICKET_COST;
  $("#scr-kpshop").innerHTML = `
    <div class="back-row"><button class="back-btn" onclick="lexBack()">←</button><h2>💠 KP交換所</h2></div>
    <div class="kp-bal">
      <img src="kp.webp" alt="KP" onerror="this.style.display='none'">
      <div><b>${bal}</b> KP<small>これまでの合計 ${P.kpTotal|0} KP</small></div>
    </div>
    <div class="kp-lead">
      KP は <b>コンテンツを完全習得すると +${KP_MASTER}</b>、<b>確認テストに合格すると +${KP_CONFIRM}</b> たまります。<br>
      <b>MagiLex の中だけで使うポイント</b>です（ほかのアプリには出てきません）。
    </div>
    <div class="h-sec">🎫 ガチャチケット</div>
    <div class="kpt">
      <div class="kpt-i">🎫</div>
      <div class="kpt-bd"><b>ガチャチケット 1枚</b>
        <p>XEVARION の<b>どのガチャでも</b>使える共通のチケット（1枚＝1回ぶん）。</p></div>
      <button class="kpc-buy" ${canT?"":"disabled"} onclick="lexKpBuyTicket()">交換する<small>${KP_TICKET_COST} KP</small></button>
    </div>
    <div class="h-sec">✨ キャラクター</div>
    <div class="kp-lead2">
      すでに持っているキャラをえらぶと<b>限界突破（+1凸）</b>が進みます。<b>完凸（+4凸）のキャラは交換できません</b>。<br>
      交換したキャラは <b>MagiBurst・MagiBattle・XEVARION のアイコン</b>など、すべてのコンテンツで使えます。
    </div>
    ${cards}
    <div id="kpDetOv" class="kpdet-ov" onclick="if(event.target===this)lexKpDetailClose()"><div id="kpDetCard" class="kpdet-card"></div></div>`;
  renderTop();
}
window.lexKpBuyTicket = async function(){
  if(kpBalance() < KP_TICKET_COST){ toast("KP が足りません"); return; }
  const ok = await askYesNo("🎫 ガチャチケットと交換します",
    KP_TICKET_COST + " KP を使って、🎫ガチャチケットを 1枚 受け取ります。\n\n" +
    "（いまの残高 " + kpBalance() + " KP → " + (kpBalance()-KP_TICKET_COST) + " KP）", "交換する");
  if(!ok) return;
  if(!kpSpend(KP_TICKET_COST, "🎫ガチャチケット 1枚と交換")){ toast("KP が足りません"); return; }
  try{ if(window.XEVA && XEVA.ticket) XEVA.ticket.add(1, "MagiLex KP交換所"); }catch(e){}
  toast("🎫 ガチャチケットを 1枚 受け取りました！", true);
  renderKpShop();
};
window.lexKpBuyChar = async function(id){
  const c = KP_CHARS.find(x => x.id === id); if(!c) return;
  const st = kpCharState(id);
  if(st.maxed){ toast("「"+c.nm+"」はすでに完凸です（交換できません）"); return; }
  if(kpBalance() < KP_CHAR_COST){ toast("KP が足りません（あと "+(KP_CHAR_COST-kpBalance())+" KP）"); return; }
  const what = st.own ? "限界突破が +"+st.awk+"凸 → +"+(st.awk+1)+"凸 に進みます" : "コレクションに加わります";
  const ok = await askYesNo("「"+c.nm+"」と交換します",
    KP_CHAR_COST + " KP を使って「" + c.nm + "」を受け取ります。\n" + what + "。\n\n" +
    "（いまの残高 " + kpBalance() + " KP → " + (kpBalance()-KP_CHAR_COST) + " KP）", "交換する");
  if(!ok) return;
  /* ★ キャラを受け取れてから KP を減らす。逆にすると、途中で失敗したときに
     「KPだけ消えてキャラが来ない」が起きる。 */
  if(!kpGrantChar(id)){ toast("交換できませんでした（完凸ずみ）"); renderKpShop(); return; }
  kpSpend(KP_CHAR_COST, "「"+c.nm+"」と交換");
  showKpGetModal(c, kpCharState(id));
  renderKpShop();
};
function showKpGetModal(c, st){
  const old=$("#kpGetOv"); if(old) old.remove();
  const ov=document.createElement("div"); ov.id="kpGetOv"; ov.className="arisa-ov";
  const full = st.awk >= KP_MAX_AWK;
  ov.innerHTML=`<div class="arisa-card">
      <div class="arisa-burst"></div>
      <div class="arisa-cap">KP交換所（${KP_CHAR_COST}KP）</div>
      <img class="arisa-img" src="${c.img}" alt="${c.nm}" onerror="this.style.display='none'">
      <div class="arisa-name">${c.nm} <span>${st.awk===0?"を獲得！":full?"が完凸！！":"が+"+st.awk+"凸！"}</span></div>
      <div class="arisa-rar">★★★ SSR${full?"・完凸":""}</div>
      <p>限定キャラクター「${c.nm}」${st.awk===0?"をコレクションに加えました。":"の限界突破が進みました。"}<br>
        <b>MagiBurst・MagiBattle・アイコン</b>など全コンテンツで使えます！</p>
      <button class="arisa-btn" onclick="document.getElementById('kpGetOv').remove()">やったー！ ✨</button>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add("show"));
}
/* ── キャラのくわしい性能 ──
   MagiBurst の mb-core.js（性能の持ち主）と mb-char-detail.js（ガチャ・図鑑と同じ詳細画面）を
   <b>押されたときだけ</b>読みこむ。1.1MB あるので、ふだんの学習では読まない。 */
let _kpDetLoading = false, _kpDetReady = false;
function _loadScript(src){
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = () => rej(new Error(src));
    document.head.appendChild(s);
  });
}
window.lexKpDetail = async function(id){
  if(_kpDetLoading) return;
  const c = KP_CHARS.find(x => x.id === id); if(!c) return;
  if(_kpDetReady && typeof window.openDetX === "function"){ _kpOpen(id); return; }
  _kpDetLoading = true;
  toast("性能を読みこんでいます…");
  try{
    if(!document.getElementById("mbDetCss")){
      const l = document.createElement("link");
      l.id = "mbDetCss"; l.rel = "stylesheet"; l.href = "../mb-char-detail.css?v=17";
      document.head.appendChild(l);
    }
    if(typeof window.DB === "undefined") await _loadScript("../mb-boot.js?v=12");
    if(typeof window.CHARS === "undefined") await _loadScript("../MagiBurst/js/mb-core.js?v=89");
    if(typeof window.openDetX !== "function") await _loadScript("../mb-char-detail.js?v=22");
    _kpDetReady = true;
    _kpOpen(id);
  }catch(e){
    toast("性能を読みこめませんでした（通信を確認してください）");
  }finally{ _kpDetLoading = false; }
};
function _kpOpen(id){
  /* mb-char-detail.js は #detOv / #detCard に書きこむので、無ければ作る */
  if(!document.getElementById("detOv")){
    const ov = document.createElement("div");
    ov.id = "detOv";
    ov.onclick = (e) => { if(e.target === ov && typeof closeDetX === "function") closeDetX(); };
    const card = document.createElement("div"); card.id = "detCard";
    ov.appendChild(card); document.body.appendChild(ov);
  }
  try{ window.openDetX(id); }catch(e){ toast("性能を開けませんでした"); }
}
window.lexKpDetailClose = () => { try{ closeDetX(); }catch(e){} };

// ============================================================
// アプリとしてインストール（PWA）— PC/Android は1タップ、iOS は手順案内
// オフラインでも学習でき、記録はオンライン復帰時にクラウドへ自動反映される
// ============================================================
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  const card = document.getElementById("lexInstallCard");
  if (card) card.style.display = "";
});
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function installCardHTML() {
  if (isStandalone()) return "";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return `
    <button class="m-card wide" id="lexInstallCard" onclick="lexInstall()" style="margin-top:10px;${deferredInstall || ios ? "" : "display:none"}">
      <div class="mi">${uiIconSVG('install')}</div>
      <div><h3>アプリとしてインストール</h3><p>PC・スマホにダウンロードして<b>オフラインでも学習</b>！記録はオンライン復帰時に自動でクラウドへ反映されます</p></div>
    </button>`;
}
window.lexInstall = async function () {
  if (deferredInstall) {
    deferredInstall.prompt();
    try {
      const r = await deferredInstall.userChoice;
      if (r && r.outcome === "accepted") { toast("インストールを開始しました！"); }
    } catch (e) {}
    deferredInstall = null;
    const card = document.getElementById("lexInstallCard");
    if (card) card.style.display = "none";
    return;
  }
  // iOS Safari などプロンプト非対応 → 手順を案内
  alert("このブラウザでは次の手順でインストールできます：\n\n【iPhone / iPad】\n① 画面下の「共有」ボタン（□↑）をタップ\n②「ホーム画面に追加」を選ぶ\n\n【PC（Chrome / Edge）】\nアドレスバー右端のインストールアイコン（⊕/モニター型）をクリック\n\nインストール後はオフラインでも学習でき、オンラインに戻ると記録が自動でクラウドに反映されます。");
};

// ============================================================
// ライブラリ（一覧 + フィルタ + 検索）
// ============================================================
let libFilter="all", libQuery="", libSubject="all", libGenre="all", libFilterOpen=false;
window.lexLibToggleFilter=()=>{ libFilterOpen=!libFilterOpen; renderLibrary(); };
/* ★ 2026-08-15 「未完全習得」を追加。
   未習得(none) と 習得中(learn) を合わせたもの＝まだ1問でも残っている範囲。
   仕上げのときに探すのはこれなのに、2つのチップを行き来しないと出せなかった。 */
const LIB_FILTERS=[["all","すべて"],["quiz","選択クイズ"],["word","単語帳"],["undone","未完全習得"],["none","未習得"],["learn","習得中"],["done","完全習得"]];
/* ★★ 2026-08-26 化学ε・物理γ を追加。標準演習なので、それぞれの科目のいちばん後ろに置く。
   ★★ 2026-08-30 <b>地理</b>を追加（ご指定）。理科・数学とは別の系統なので国語の前に置く。
     ★ subjectOfSid には以前から "geo_" の行があったが、この並びに無かったため
       <b>科目のふるいに一度も出てこなかった</b>。追加するときは必ず両方そろえること。 */
const SUBJECT_ORDER=["英語","数学","化学α","化学β","化学γ","化学δ","化学ε","物理α","物理β","物理γ","地理","国語"];
// 科目内ジャンル（例: 化学 → 理論・無機・有機・高分子）。表示順もここで決める
/* ★ 2026-08-26 物理γのジャンル「熱・原子」を足した（既存の「熱・原子」と同じ並びに入る） */
/* ★★ 2026-09-02 化学δ・物理β のこまかいジャンルがこの並びに無く、
   genresPresent() は GENRE_ORDER でふるいにかけているので<b>候補に一度も出てこなかった</b>。
   （化学：脂質・芳香族・フェノール・元素別各論 ／ 物理：抵抗・直流回路・磁場・電磁誘導・導体棒・コイル）
   ジャンルを増やしたら、genreOf() と<b>この並びの両方</b>に入れること。 */
const GENRE_ORDER=["数と式・二次関数","場合の数・確率","整数","図形","三角関数","指数・対数","式と証明","図形と方程式","数列","ベクトル","データ・統計","極限","複素数平面","二次曲線","微分・積分","理論","無機","有機","高分子","物質別","脂質","芳香族・フェノール","元素別各論","力学","波動・光","電磁気","抵抗","直流回路","磁場","電磁誘導","導体棒","コイル","熱・原子","工業","人口","人口問題","動詞","名詞","形容詞","副詞・接続","学術・社会","文法・敬語","古文単語"];
function genreOf(c){
  const id = c.type==="word" ? c.key : (c.sid||"");
  // 英語
  if(/^eigo_v/.test(id)) return "動詞";
  if(/^eigo_n/.test(id)) return "名詞";
  if(/^eigo_a[0-9]/.test(id)) return "形容詞";
  if(id==="eigo_adv") return "副詞・接続";
  if(id==="eigo_ac") return "学術・社会";
  // 数学III（極限・複素数平面・二次曲線・微積分）
  if(id==="math_c3_limitseq") return "極限";
  if(id==="math_c3_cplxbasic") return "複素数平面";
  if(id==="math_c3_conicbasic") return "二次曲線";
  if(id==="math_c3_calcbasic") return "微分・積分";
  /* 数学（★ 2026-08-16 全範囲に拡張）
     id の接頭辞でジャンルが決まる。増やすときはここに1行足す。 */
  /* 物理β（★ 2026-08-20 電磁気学）。id の2文字めでジャンルが決まる。 */
  if(/^physb_r_/.test(id)) return "抵抗";
  if(/^physb_d_/.test(id)) return "直流回路";
  if(/^physb_m_/.test(id)) return "磁場";
  if(/^physb_e_/.test(id)) return "電磁誘導";
  if(/^physb_b_/.test(id)) return "導体棒";
  if(/^physb_c_/.test(id)) return "コイル";
  /* 化学δ（★ 2026-08-20）。id の2文字めでジャンルが決まる。 */
  /* ★★ 2026-08-30 地理（工業／人口／人口問題） */
  if(/^geo_i_/.test(id)) return "工業";
  if(/^geo_p_/.test(id)) return "人口";
  if(/^geo_q_/.test(id)) return "人口問題";
  /* ★★ 2026-08-26 化学ε・物理γ */
  if(/^ceps_t_/.test(id)) return "理論";
  if(/^ceps_i_/.test(id)) return "無機";
  if(/^ceps_o_/.test(id)) return "有機";
  if(/^ceps_p_/.test(id)) return "高分子";
  if(/^physg_m_/.test(id)) return "力学";
  if(/^physg_h_/.test(id)) return "熱・原子";
  if(/^physg_w_/.test(id)) return "波動・光";
  if(/^physg_e_/.test(id)) return "電磁気";
  if(/^cdelta_l_/.test(id)) return "脂質";
  if(/^cdelta_a_/.test(id)) return "芳香族・フェノール";
  if(/^cdelta_i_/.test(id)) return "元素別各論";
  if(/^math_a_/.test(id)) return "数と式・二次関数";
  if(/^math_p_/.test(id)) return "場合の数・確率";
  if(/^math_n_/.test(id)) return "整数";
  if(/^math_g_/.test(id)) return "図形";
  if(/^math_t_/.test(id)) return "三角関数";
  if(/^math_e_/.test(id)) return "指数・対数";
  if(/^math_q_/.test(id)) return "式と証明";
  if(/^math_f_/.test(id)) return "図形と方程式";
  if(/^math_s_/.test(id)) return "数列";
  if(/^math_v_/.test(id)) return "ベクトル";
  if(/^math_d_/.test(id)) return "データ・統計";
  if(id==="math_c3_diff") return "微分・積分";
  if(id==="math_c3_integral") return "微分・積分";
  if(id==="math_c3_complexplane") return "複素数平面";
  // 国語
  if(id==="kobun") return "古文単語";
  if(/^kokugo_/.test(id)) return "文法・敬語";
  // 物理
  //   ★ 2026-08-15 追加ぶん（最難関レベル）は phys_adv_◯_ の◯でジャンルが決まる
  //     _m_ = 力学 ／ _w_ = 波動・光 ／ _e_ = 電磁気 ／ _t_ = 熱・原子
  /* ★ 2026-08-19 中堅の物理は phys_mid_◯_ の◯でジャンルが決まる */
  if(/^phys_intro_/.test(id)) return "力学";   /* ★ 2026-08-19 入門はまとめて力学の棚へ */
  if(/^phys_mid_m_/.test(id)) return "力学";
  if(/^phys_mid_w_/.test(id)) return "波動・光";
  if(/^phys_mid_e_/.test(id)) return "電磁気";
  if(/^phys_mid_t_/.test(id)) return "熱・原子";
  if(/^phys_adv_m_/.test(id)) return "力学";
  if(/^phys_adv_w_/.test(id)) return "波動・光";
  if(/^phys_adv_e_/.test(id)) return "電磁気";
  if(/^phys_adv_t_/.test(id)) return "熱・原子";
  if(/^(phys_kinematics|phys_momentum|phys_exam_mech)$/.test(id)) return "力学";
  if(id==="phys_waves") return "波動・光";
  if(/^(phys_em|phys_exam_em)$/.test(id)) return "電磁気";
  if(/^(phys_thermo_atom|phys_exam_wave_heat)$/.test(id)) return "熱・原子";
  /* 化学γ（最難関の有機・無機）
     ★ 2026-08-16 id の3文字目で決まる。cgamma_o_=有機／cgamma_i_=無機／cgamma_s_=物質別。
       物質別は「その物質だけを掘り下げる」セットで、有機・無機どちらの物質もここに入る。 */
  /* ★ 2026-08-19 中堅化学の理論 */
  if(/^cgamma_t_/.test(id)) return "理論";
  if(/^cgamma_o_/.test(id)) return "有機";
  if(/^cgamma_i_/.test(id)) return "無機";
  if(/^cgamma_s_/.test(id)) return "物質別";
  // 化学 — 高分子（糖・アミノ酸・樹脂）
  if(/^(cbeta_sugar|cbeta_amino_protein|cbeta_e_amino_nucleic|cbeta_e_polymer)$/.test(id)) return "高分子";
  // 化学 — 理論（mol・平衡・熱化学・電池・pH・気体法則・状態図）
  if(/^(chem_theory_|cbeta_solution_colloid|cbeta_e_thermo|cbeta_e_leadbattery|cbeta_e_ph_solubility|cbeta_e_kinetics_gas|cbeta_e_phase)/.test(id)) return "理論";
  // 化学 — 有機
  if(/^(fatty|carboxyl|functional|chem_b_|cbeta_organic_basics|cbeta_hydrocarbon|cbeta_alcohol_carbonyl|cbeta_carboxyl_ester|cbeta_aromatic|cbeta_aromatic_n|cbeta_oil_soap|cbeta_e_alcohol_ester|cbeta_e_aromatic2|cbeta_e_aniline_fat_sugar)/.test(id)) return "有機";
  // 化学 — 無機（気体・金属イオン・製錬・工業的製法など）
  if(/^(gas_|metal|chem_inorg_|cbeta_)/.test(id)) return "無機";
  return "その他";
}
/* ═══════════════════════════════════════════════════════════
   ★★ 2026-09-02 「化学」「物理」でまとめて見る絞り込み（ご指定）
   ────────────────────────────────────────────────────────────
   化学α～ε・物理α～γ は<b>そのまま残し</b>、その手前に
   「化学」「物理」を足す。選ぶとその系統を<b>全部</b>並べる。

   ★ まとめて見るときの「範囲」は大きな枠にそろえる。
     化学δの「脂質」「芳香族・フェノール」は有機、「元素別各論」は無機、
     物理βの「抵抗」「直流回路」…は電磁気。
     こうしないと「化学」を選んだときに範囲の候補が 10 個以上になってしまう。
     ★ 個別の科目（化学δ など）を選んだときは<b>こまかいジャンルのまま</b>。

   ★ ミックスの範囲えらび（contentsBySubject）は subjectsPresent() を使うので
     <b>ここには入れない</b>。入れると同じセットが二重に並ぶ。
   ════════════════════════════════════════════════════════════ */
const SUBJECT_GROUPS = {
  "化学": ["化学α","化学β","化学γ","化学δ","化学ε"],
  "物理": ["物理α","物理β","物理γ"],
};
function isSubjectGroup(s){ return !!SUBJECT_GROUPS[s]; }
/* このコンテンツは選ばれている科目（まとめ含む）に入るか */
function inSubject(c, sel){
  if(!sel || sel==="all") return true;
  const g = SUBJECT_GROUPS[sel];
  const s = subjectOf(c);
  return g ? g.indexOf(s) >= 0 : s === sel;
}
/* まとめて見るときだけ、こまかいジャンルを大きな枠へ寄せる */
const BROAD_GENRE = {
  "脂質":"有機", "芳香族・フェノール":"有機", "元素別各論":"無機",
  "抵抗":"電磁気", "直流回路":"電磁気", "磁場":"電磁気",
  "電磁誘導":"電磁気", "導体棒":"電磁気", "コイル":"電磁気",
};
function genreOfIn(c, sel){
  const g = genreOf(c);
  return isSubjectGroup(sel) ? (BROAD_GENRE[g] || g) : g;
}
/* ライブラリの科目チップ。実在する科目の並びに、
   その系統の<b>最初の1つの手前</b>へまとめのチップを差しこむ。 */
function libSubjectsPresent(){
  const out = [];
  subjectsPresent().forEach((s) => {
    Object.keys(SUBJECT_GROUPS).forEach((g) => {
      if(out.indexOf(g) < 0 && SUBJECT_GROUPS[g].indexOf(s) >= 0) out.push(g);
    });
    out.push(s);
  });
  return out;
}

function genresPresent(subject){
  const set={};
  allContents().forEach(c=>{ if(inSubject(c,subject)) set[genreOfIn(c,subject)]=1; });
  const known=GENRE_ORDER.filter(g=>set[g]);
  if(set["その他"]) known.push("その他");
  return known;
}
// 科目を id / 単語帳キーから判定
function subjectOf(c){
  if(c.type==="word"){ if(c.key.indexOf("eigo")===0) return "英語"; return c.key==="kobun" ? "国語" : "公共"; }
  return subjectOfSid(c.sid || "");
}
/* ★ 2026-08-24 セットの id だけから科目を決める版。
   選択肢の長さそろえ（subjWrongPool）でもここを使うので、判定は<b>この1か所</b>に置く。 */
function subjectOfSid(id){
  id = id || "";
  if(id.indexOf("geo_")===0) return "地理";
  if(id.indexOf("math_")===0) return "数学";   /* ★ 2026-08-04 数学IIIを追加・2026-08-16 全範囲に拡張 */
  /* ★★ 2026-08-20 これまでの物理は<b>物理α</b>に改名。
     新しい電磁気学のぶんが<b>物理β</b>（id は physb_）。
     ★ "physb_" は "phys_" で始まらないので、下の行とはぶつからない。
       ただし<b>物理βの判定を先に書く</b>こと（読む人が取りちがえないように）。 */
  if(id.indexOf("physg_")===0) return "物理γ"; /* ★★ 2026-08-26 全範囲の標準演習 */
  if(id.indexOf("physb_")===0) return "物理β";
  if(id.indexOf("phys_")===0) return "物理α";
  if(id.indexOf("kokugo_")===0) return "国語";
  if(id.indexOf("cbeta_")===0) return "化学β"; // 溶液・無機・有機・高分子の新規問題
  if(id.indexOf("cgamma_")===0) return "化学γ"; /* ★ 2026-08-16 最難関の有機・無機＋物質別 */
  if(id.indexOf("cdelta_")===0) return "化学δ";  /* ★ 2026-08-20 脂質・芳香族・元素別各論 */
  if(id.indexOf("ceps_")===0) return "化学ε";    /* ★★ 2026-08-26 全範囲の標準演習 */
  return "化学α"; // 既存の化学すべて（fatty/carboxyl/functional/gas_*/metal/chem_b_*/chem_*）
}
function subjectsPresent(){ const set={}; allContents().forEach(c=>set[subjectOf(c)]=1); return SUBJECT_ORDER.filter(s=>set[s]); }

/* ════════════════════════════════════════════════════════════════
   科目アイコン（★ 2026-08-15 全面デザイン）
   ════════════════════════════════════════════════════════════════
   これまでセクションごとに絵文字を1つずつ手で付けていた（🔥🧼🧬…）。
   ・端末ごとに絵柄も色も違う（同じ🧪でも iOS と Android で別物）
   ・意味が近い絵文字が無い範囲では関係のない絵になっていた（🍶🎩🍭など）
   ・100個ちかくを手で付けるので、似た範囲に違う絵が付いてしまう
   → <b>科目が同じなら同じアイコン</b>に統一し、自前のSVGで描き直した。

   決めごと（増やすときもここを守る）
     ・24×24 グリッド／線は 1.7 の丸端・丸角
     ・線は currentColor（＝タイルの色を1か所変えれば全部そろう）
     ・面で見せたい1か所だけ塗る（濃淡は opacity で付ける）
   ★ 科目分けそのものは subjectOf() をそのまま使う。ここで独自分けを作らない。 */
/* ══ ★ 2026-08-17c 画面のアイコンを絵文字から自前のSVGに置きかえる ══
   ------------------------------------------------------------
   絵文字は端末ごとに絵柄も色も大きさも変わるので、
   ・iPhone と PC で見た目がそろわない
   ・科目アイコン（SUBJ_ART）だけ自前のSVGで、ほかは絵文字＝ちぐはぐ
   という状態だった。科目アイコンと同じ「線画・currentColor」の作りにそろえる。
   ★ 新しいアイコンを足すときは、必ず 24×24 の線画で、色は currentColor のまま。
     塗りを使うときだけ fill="currentColor" stroke="none" を明示する。 */
const UI_ART = {
  /* 学習する — 開いた本 */
  study: '<path d="M12 6.6C10.3 5.2 8.2 4.5 5.4 4.5A1.4 1.4 0 0 0 4 5.9v10.4a1.4 1.4 0 0 0 1.4 1.4c2.8 0 4.9.7 6.6 2.1 1.7-1.4 3.8-2.1 6.6-2.1a1.4 1.4 0 0 0 1.4-1.4V5.9a1.4 1.4 0 0 0-1.4-1.4c-2.8 0-4.9.7-6.6 2.1Z"/><path d="M12 6.6v13.2"/>',
  /* ミックス問題 — 交わる2本の矢（混ぜる） */
  mix: '<path d="M4 7.4h3.6c1.5 0 2.4.8 3.3 2l2.2 3.2c.9 1.2 1.8 2 3.3 2H20"/><path d="M4 16.6h3.6c1.5 0 2.4-.8 3.3-2l2.2-3.2c.9-1.2 1.8-2 3.3-2H20"/><path d="m17.4 4.9 2.6 2.5-2.6 2.5"/><path d="m17.4 14.1 2.6 2.5-2.6 2.5"/>',
  /* 学習データ — 棒グラフ */
  stats: '<path d="M4 19.6h16"/><rect x="6" y="11" width="3.2" height="6.4" rx=".8"/><rect x="10.9" y="6.6" width="3.2" height="10.8" rx=".8"/><rect x="15.8" y="9" width="3.2" height="8.4" rx=".8"/>',
  /* XEVAの入手方法 — きらめき */
  spark: '<path d="M12 3.6l1.7 4.6 4.6 1.7-4.6 1.7L12 16.2l-1.7-4.6-4.6-1.7 4.6-1.7Z"/><path d="M18.4 15.2l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8Z" opacity=".7"/>',
  /* クイズを始める — 再生＋的 */
  quiz: '<circle cx="12" cy="12" r="8.2"/><path d="M10.3 8.7 15.5 12l-5.2 3.3Z" fill="currentColor" stroke="none"/>',
  /* フラッシュカード — 重なったカード */
  flash: '<rect x="3.6" y="7.4" width="12.6" height="9.2" rx="1.6" transform="rotate(-8 9.9 12)"/><rect x="8.4" y="6.6" width="12" height="10.8" rx="1.6"/><path d="M11.4 11.2h6M11.4 14h3.8" opacity=".7"/>',
  /* 未習得のみ — 的（ねらい） */
  target: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.6" opacity=".72"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  /* 一覧 — 箇条書き */
  list: '<path d="M9 6.6h10M9 12h10M9 17.4h10"/><circle cx="5.4" cy="6.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="5.4" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="5.4" cy="17.4" r="1.3" fill="currentColor" stroke="none"/>',
  /* 確認テスト — 卒業帽 */
  exam: '<path d="m12 4.4 8.6 4.1L12 12.6 3.4 8.5Z"/><path d="M6.8 10.6v4.2c0 1.6 2.3 2.9 5.2 2.9s5.2-1.3 5.2-2.9v-4.2"/><path d="M20.6 8.5v5" opacity=".7"/>',
  /* 発音モード — スピーカー＋音波 */
  sound: '<path d="M5 9.6h2.8L12 5.9v12.2L7.8 14.4H5Z"/><path d="M15.4 9.4a3.6 3.6 0 0 1 0 5.2"/><path d="M17.8 7a7 7 0 0 1 0 10" opacity=".65"/>',
  /* 消音モード — スピーカー＋× */
  mute: '<path d="M5 9.6h2.8L12 5.9v12.2L7.8 14.4H5Z"/><path d="m15.6 10.2 4.2 3.6M19.8 10.2l-4.2 3.6"/>',
  /* メモ — 鉛筆と紙 */
  memo: '<path d="M18.6 10.4v7.8a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8V6.4a1.8 1.8 0 0 1 1.8-1.8h6"/><path d="m16.2 3.8 3.6 3.6-6.3 6.3-4.1 1 1-4.1Z"/>',
  /* 手書き — ペン先 */
  pen: '<path d="m15.6 4.6 3.8 3.8"/><path d="M17.5 6.5 8.4 15.6a2 2 0 0 0-.5.9l-1 3.6 3.6-1a2 2 0 0 0 .9-.5l9.1-9.1"/><path d="M4.2 19.9h4" opacity=".6"/>',
  /* 文字入力 — キーボード */
  keyboard: '<rect x="3.2" y="6.8" width="17.6" height="10.4" rx="1.8"/><path d="M7 10.2h.01M10.2 10.2h.01M13.4 10.2h.01M16.6 10.2h.01M7 13.2h.01M16.6 13.2h.01" stroke-width="2.2"/><path d="M10 13.2h4.2"/>',
  /* 移動（手のひら） — つかむ */
  hand: '<path d="M9 11V5.9a1.4 1.4 0 0 1 2.8 0V11"/><path d="M11.8 10.6V4.8a1.4 1.4 0 0 1 2.8 0v5.8"/><path d="M14.6 11V6.6a1.4 1.4 0 0 1 2.8 0V13"/><path d="M9 11V9.2a1.4 1.4 0 0 0-2.8 0v4.4c0 3.4 2.4 6 5.8 6h1.4c3.1 0 4.9-2.1 4.9-5.1V13"/>',
  /* もう一度・やり直し — 循環の矢 */
  redo: '<path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2"/><path d="M19.6 4.2v4.2h-4.2"/>',
  /* 完全習得・トロフィー */
  trophy: '<path d="M8 4.6h8v4.2a4 4 0 0 1-8 0Z"/><path d="M8 6.2H5.6a2.4 2.4 0 0 0 2.4 4M16 6.2h2.4a2.4 2.4 0 0 1-2.4 4" opacity=".7"/><path d="M12 12.8v3.4M9 19.4h6M10.4 16.2h3.2v3.2h-3.2Z"/>',
  /* 100点・満点 */
  perfect: '<circle cx="12" cy="12" r="8.2"/><path d="M8.6 12.2l2.4 2.5 4.4-5" />',
  /* キャンペーン（ひまわり） */
  sun: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6M6.1 6.1l1.9 1.9M16 16l1.9 1.9M17.9 6.1 16 8M8 16l-1.9 1.9"/>',
  /* ダウンロード（インストール案内） */
  install: '<path d="M12 4v10.4"/><path d="m7.6 10.4 4.4 4.4 4.4-4.4"/><path d="M4.6 17.4v1.2a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-1.2"/>',

  /* ══ ★ 2026-08-22b ミッションビンゴのアイコン ══
     5×5 の小さなマスに絵文字（\U0001F6AA \U0001F4DD \U0001F4DA \u2B55 \U0001F3C5 …）を並べていたが、
     ・端末ごとに絵柄も色も大きさも変わる（iPhone と PC でまるで別のカードに見える）
     ・22px ほどのマスでは何の絵なのか読み取れない
     ・カードの中だけ極彩色で、ほかの画面（線画・currentColor）から浮く
     → ほかと同じ 24×24 の線画にそろえた。色はマスの状態（未達成＝薄い茶／達成＝金）で決まる。 */
  /* ログインする — 扉と、入っていく矢 */
  door: '<path d="M6.2 4.2h7.2a1.4 1.4 0 0 1 1.4 1.4v12.8a1.4 1.4 0 0 1-1.4 1.4H6.2Z"/><circle cx="12.2" cy="12" r="1.05" fill="currentColor" stroke="none"/><path d="M17.4 12h4.2" opacity=".8"/><path d="m19.6 9.8 2.2 2.2-2.2 2.2" opacity=".8"/>',
  /* 問題をとく — 紙と書きこみ */
  note: '<path d="M6 4.4h7.4l4.6 4.6v10a1.6 1.6 0 0 1-1.6 1.6H6a1.6 1.6 0 0 1-1.6-1.6V6a1.6 1.6 0 0 1 1.6-1.6Z"/><path d="M13.2 4.4v4.8H18" opacity=".7"/><path d="M7.8 13h8.4M7.8 16.4h5.4"/>',
  /* たくさんとく — 積んだ本 */
  books: '<path d="M4.6 5.6a1.4 1.4 0 0 1 1.4-1.4h2.8a1.4 1.4 0 0 1 1.4 1.4v14H4.6Z"/><path d="M10.2 6.8a1.4 1.4 0 0 1 1.4-1.4h2.6a1.4 1.4 0 0 1 1.4 1.4v12.8h-5.4Z" opacity=".78"/><path d="M15.6 8.6h2a1.4 1.4 0 0 1 1.4 1.4v9.6h-3.4Z" opacity=".55"/><path d="M3.8 19.6h16.4"/>',
  /* 正解 — 大きなマル（\u2B55 のかわり） */
  correct: '<circle cx="12" cy="12" r="7.9" stroke-width="2.4"/>',
  /* 完全習得 — メダル */
  medal: '<path d="M8.2 3.6 10.9 9M15.8 3.6 13.1 9" opacity=".72"/><circle cx="12" cy="14.6" r="5.5"/><path d="m12 11.7 1 2 2.2.3-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6 2.2-.3Z" fill="currentColor" stroke="none" opacity=".9"/>',
  /* 4択セット — 本と「？」 */
  bookQ: '<path d="M5 5.8A1.8 1.8 0 0 1 6.8 4H18a1.2 1.2 0 0 1 1.2 1.2v13.4A1.2 1.2 0 0 1 18 19.8H6.8A1.8 1.8 0 0 1 5 18Z"/><path d="M5 18a1.8 1.8 0 0 1 1.8-1.8h12.4" opacity=".6"/><path d="M10.2 8.5a1.9 1.9 0 1 1 2.6 1.8v1.1"/><circle cx="12.1" cy="13.7" r=".95" fill="currentColor" stroke="none"/>',
  /* 単語帳 — 本と「A」 */
  bookW: '<path d="M5 5.8A1.8 1.8 0 0 1 6.8 4H18a1.2 1.2 0 0 1 1.2 1.2v13.4A1.2 1.2 0 0 1 18 19.8H6.8A1.8 1.8 0 0 1 5 18Z"/><path d="M5 18a1.8 1.8 0 0 1 1.8-1.8h12.4" opacity=".6"/><path d="m9.4 13.2 2.7-5.6 2.7 5.6"/><path d="M10.4 11.3h3.4"/>',
  /* 確認テストに合格 — 四角の中のチェック */
  check: '<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.2"/><path d="m8.3 12.1 2.7 2.7 4.7-5.4"/>',
  /* ミックス問題 — サイコロ */
  dice: '<rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3.6"/><circle cx="8.8" cy="8.8" r="1.25" fill="currentColor" stroke="none"/><circle cx="15.2" cy="8.8" r="1.25" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="8.8" cy="15.2" r="1.25" fill="currentColor" stroke="none"/><circle cx="15.2" cy="15.2" r="1.25" fill="currentColor" stroke="none"/>',
  /* 連続ログイン — ほのお */
  fire: '<path d="M12.4 3.2c.5 2.7-.7 4.1-2.3 5.6-1.8 1.7-3.5 3.3-3.5 6.1a5.9 5.9 0 0 0 11.8 0c0-2.2-1-3.8-2.2-5.2-.3 1-.9 1.7-1.8 2 .5-3-.4-6.2-2-8.5Z"/><path d="M12 20.4a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.3-2.4 2.6-4.2 1.3 1.8 2.6 2.6 2.6 4.2a2.6 2.6 0 0 1-2.6 2.6Z" opacity=".6"/>',
  /* 学習した日数 — カレンダー */
  calendar: '<rect x="3.8" y="5.6" width="16.4" height="14.2" rx="2.4"/><path d="M3.8 10h16.4"/><path d="M8.2 3.8v3.4M15.8 3.8v3.4"/><circle cx="8.4" cy="13.6" r="1.15" fill="currentColor" stroke="none"/><circle cx="12" cy="13.6" r="1.15" fill="currentColor" stroke="none" opacity=".65"/><circle cx="8.4" cy="16.8" r="1.15" fill="currentColor" stroke="none" opacity=".65"/>',
  /* XEVA を貯める — コインの山 */
  coin: '<ellipse cx="12" cy="6.8" rx="7.4" ry="2.9"/><path d="M4.6 6.8v4.3c0 1.6 3.3 2.9 7.4 2.9s7.4-1.3 7.4-2.9V6.8"/><path d="M4.6 11.1v4.3c0 1.6 3.3 2.9 7.4 2.9s7.4-1.3 7.4-2.9v-4.3" opacity=".65"/>',
  /* ビンゴ（ホームの入口） — カードとそろった斜め */
  bingo: '<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="3.2"/><path d="M9.2 3.6v16.8M14.8 3.6v16.8M3.6 9.2h16.8M3.6 14.8h16.8" opacity=".5"/><circle cx="6.4" cy="6.4" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.6" cy="17.6" r="1.5" fill="currentColor" stroke="none"/>',
  /* そろったマス — 星（塗り） */
  star: '<path d="m12 3.5 2.68 5.43 5.99.87-4.33 4.23 1.02 5.97L12 17.15l-5.36 2.85 1.02-5.97L3.33 9.8l5.99-.87Z" fill="currentColor" stroke="none"/>',
  /* ごほうびを受け取る — プレゼント */
  gift: '<rect x="3.6" y="8.4" width="16.8" height="4.4" rx="1.3"/><path d="M5.2 12.8v6a1.6 1.6 0 0 0 1.6 1.6h10.4a1.6 1.6 0 0 0 1.6-1.6v-6"/><path d="M12 8.4v12"/><path d="M12 8.4S10.9 3.8 8.6 3.8a2.3 2.3 0 0 0 0 4.6ZM12 8.4s1.1-4.6 3.4-4.6a2.3 2.3 0 0 1 0 4.6Z"/>',
  /* チケット */
  ticket: '<path d="M4 8.4a1.6 1.6 0 0 1 1.6-1.6h12.8A1.6 1.6 0 0 1 20 8.4v1.8a2 2 0 0 0 0 3.6v1.8a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 15.6v-1.8a2 2 0 0 0 0-3.6Z"/><path d="M13.6 6.8v1.7M13.6 11.1v1.8M13.6 15.5v1.7" opacity=".7"/>',
  /* ジェム */
  gemx: '<path d="M7.6 4.4h8.8L21 9.7 12 20.2 3 9.7Z"/><path d="M3 9.7h18M7.6 4.4 9.8 9.7 12 20.2M16.4 4.4 14.2 9.7 12 20.2" opacity=".55"/>',
  /* チェックだけ（ログインのスタンプ） */
  tick: '<path d="m5.6 12.6 4.2 4.2 8.6-9.6"/>',
};
/* ★ 科目のミッション（数学を50問…）は科目アイコンをそのまま借りる。
   ライブラリ一覧と同じ絵にしておくと「どの科目のマスか」が一目で分かる。
   SUBJ_ART はこの下で定義されるので、代入は SUBJ_ART のあと（ファイル末尾側）で行う。 */
/* UI_ART の1つを <svg> にして返す */
function uiIconSVG(key){
  const d = UI_ART[key] || UI_ART.study;
  return '<svg class="uisvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
       + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}
/* タイル入り（科目アイコンの subjIcon と同じ使い勝手にそろえる） */
function uiIcon(key, cls){ return '<span class="uiic ' + (cls||"") + '">' + uiIconSVG(key) + '</span>'; }
const SUBJ_ART = {
  /* 英語 — 吹き出しの中の A（ことば＝話す・読む） */
  "英語": '<path d="M4.6 6.2a2 2 0 0 1 2-2h10.8a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H10l-4.2 3.4a.5.5 0 0 1-.8-.4v-3H6.6a2 2 0 0 1-2-2Z"/><path d="M9.6 12.4 12 6.9l2.4 5.5"/><path d="M10.5 10.7h3"/>',
  /* 国語 — 筆と、はらいの一画（縦書きの世界） */
  "国語": '<path d="M14.6 4.5 19 8.9"/><path d="M16.8 6.7 9.2 14.3a2 2 0 0 0-.5.9l-.9 3.3 3.3-.9a2 2 0 0 0 .9-.5l7.6-7.6"/><path d="M5.1 4.6c1.9 2.6 2.5 6.1 1.6 9.2" stroke-dasharray="0 0" opacity=".55"/><circle cx="5.6" cy="17.8" r="1.5" fill="currentColor" stroke="none" opacity=".85"/>',
  /* 数学 — コンパス（作図＝図形と解析） */
  "数学": '<path d="M12 3.4v2.2"/><circle cx="12" cy="4.4" r="1.1" fill="currentColor" stroke="none"/><path d="m12 5.6-4.3 12M12 5.6l4.3 12"/><path d="m6.9 17.6-1 2.4M17.1 17.6l1 2.4"/><path d="M8.6 13.1a7.6 7.6 0 0 0 6.8 0" opacity=".6"/>',
  /* 物理 — 軌道と核（力学・電磁気・原子をひとまとめに） */
  /* 物理β — 電磁気（コイルと磁力線）。物理αの原子模型と見分けが付くよう別の形にする。 */
  "物理β": '<path d="M3.2 12h2.6"/><path d="M18.2 12h2.6"/>'
    + '<path d="M5.8 12c0-2.3 1.4-4.1 3.1-4.1s3.1 1.8 3.1 4.1-1.4 4.1-3.1 4.1"/>'
    + '<path d="M12 12c0-2.3 1.4-4.1 3.1-4.1s3.1 1.8 3.1 4.1-1.4 4.1-3.1 4.1"/>'
    + '<path d="M8.9 16.1H12"/>',
  "物理α": '<ellipse cx="12" cy="12" rx="8.4" ry="3.7"/><ellipse cx="12" cy="12" rx="8.4" ry="3.7" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="8.4" ry="3.7" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="2.1" fill="currentColor" stroke="none"/>',
  /* 化学α — 三角フラスコ（理論・無機・有機の実験） */
  "化学α": '<path d="M9.7 3.9h4.6"/><path d="M10.6 3.9v5.3L5.5 17.6a1.7 1.7 0 0 0 1.5 2.5h10a1.7 1.7 0 0 0 1.5-2.5l-5.1-8.4V3.9"/><path d="M7.6 14.2h8.8" opacity=".55"/><circle cx="10.4" cy="16.8" r="1.05" fill="currentColor" stroke="none" opacity=".85"/><circle cx="13.7" cy="17.6" r=".8" fill="currentColor" stroke="none" opacity=".6"/>',
  /* 化学β — ベンゼン環（有機・高分子が中心の範囲） */
  "化学β": '<path d="M12 3.6 19.3 7.8v8.4L12 20.4 4.7 16.2V7.8Z"/><circle cx="12" cy="12" r="3.6" opacity=".7"/><circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" opacity=".85"/>',
  /* 化学γ — 分子模型（球と結合）。
     ★ 2026-08-16c 形から作り直した。前はフラスコ（化学α）の色ちがいにしか見えず、
       一覧に3つ並んだとき α・β・γ の見分けが付かなかった。
       α＝三角フラスコ（実験の器）／β＝ベンゼン環（六角形）／γ＝分子模型（球と棒）と、
       <b>輪郭そのもの</b>を変えてある。 */
  /* 化学δ — フラスコ（実験そのもの）。化学γの分子模型と見分けが付くよう別の形にする。 */
  "化学δ": '<path d="M10 3.4h4"/><path d="M11.3 3.4v5.1L5.9 17.3a2 2 0 0 0 1.7 3.05h8.8a2 2 0 0 0 1.7-3.05L12.7 8.5V3.4"/>'
    + '<path d="M8.1 13.9h7.8" stroke-dasharray="0.1 3.2"/>',
  "化学γ": '<circle cx="12" cy="6.2" r="2.5"/><circle cx="5.6" cy="15.4" r="2.5"/><circle cx="18.4" cy="15.4" r="2.5"/>'
    + '<circle cx="12" cy="13.4" r="1.9" fill="currentColor" stroke="none" opacity=".9"/>'
    + '<path d="M12 8.7v2.9M10.4 14.3 7.7 15M13.6 14.3l2.7.7"/>',
  /* 公共 — 列柱の建物（社会のしくみ） */
  "公共": '<path d="M3.7 9.2 12 4.3l8.3 4.9"/><path d="M4.9 9.2v9M19.1 9.2v9"/><path d="M8.5 11.4v5.4M12 11.4v5.4M15.5 11.4v5.4"/><path d="M3.4 19.7h17.2"/>',
  /* 地理 — 経緯線の入った地球 */
  "地理": '<circle cx="12" cy="12" r="8.4"/><ellipse cx="12" cy="12" rx="3.5" ry="8.4"/><path d="M3.9 9.3h16.2M3.9 14.7h16.2"/>'
};
/* 科目ごとの色（タイルの地と線）。--indigo などの雰囲気に合わせた落ち着いたトーン */
const SUBJ_COLOR = {
  "英語":  "#3f7fd0", "国語":  "#c06a8e", "数学":  "#6b5bd2",
  "物理α": "#2f8f96", "物理β": "#3a6fae",   /* ★ 2026-08-20 物理β */
  "化学α": "#c79a2e", "化学β": "#7a9a3a",
  "化学γ": "#b06a3c",
  "化学δ": "#8a5a9c",   /* ★ 2026-08-20 化学δ */
  "公共":  "#8a7fb5", "地理":  "#4d9a7c"
};
/* 1つのSVGを返す。size を渡すと大きさを変えられる（見出し用に少し大きく） */
/* ══ ★ 2026-08-17h 「はい／いいえ」を自前のダイアログで聞く ══
   ------------------------------------------------------------
   ★ confirm() を使ってはいけない。
     ホーム画面から起動したアプリ表示では<b>確認ダイアログが出ないことがある</b>。
     そのとき confirm() は false 相当を返すので、処理が<b>何も起きずに終わる</b>
     ＝「押しても無反応」になる。
     メモの「全部消す」・クイズの✕・MagiTier の削除、と3回同じ原因で壊れている。
   これ以降、取り消せない操作の確認は必ずこれを通すこと。 */
let _lexAsk = null;
function askYesNo(title, body, okLabel){
  return new Promise((resolve)=>{
    _lexAsk = resolve;
    let el = document.getElementById("lexAsk");
    if(!el){
      el = document.createElement("div");
      el.id = "lexAsk"; el.className = "lex-ask";
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="la-box">
      <div class="la-t">${esc(title)}</div>
      <div class="la-b">${esc(body)}</div>
      <div class="la-row">
        <button class="la-btn" onclick="lexAskAnswer(false)">やめる</button>
        <button class="la-btn dgr" onclick="lexAskAnswer(true)">${esc(okLabel||"実行する")}</button>
      </div></div>`;
    el.classList.add("show");
  });
}
window.lexAskAnswer = (v)=>{
  const el = document.getElementById("lexAsk"); if(el) el.classList.remove("show");
  const f = _lexAsk; _lexAsk = null; if(f) f(!!v);
};
/* ══ ★ 2026-08-17f 数式を「見た目のとおり」に組む ══
   ------------------------------------------------------------
   これまで問題文はただの文字だったので、
     ・n(n+1)/2      … どこまでが分母なのか読み取りにくい
     ・Σ[k=1..n] k³  … 記号の意味が伝わらない
     ・√(5−√5)/4     … 根号がどこまでかかるか分からない
   という読みづらさがあった。数式ライブラリは重いので入れず、
   <b>決まった書きかたのものだけ</b>を HTML に組み直す。

   ★ 変換するのは「はっきりそれと分かる形」だけにすること。
     欲ばって a/b を何でも分数にすると、日付や「1/2 の確率で」といった
     ふつうの文まで崩れてしまう。
   ★ 必ず esc() のあとに通す（先に通すと組んだタグまでエスケープされる）。 */
function mathFmt(t) {
  if (t == null) return "";
  let h = String(t);

  /* ★ 組み上がった HTML は「札」に預けて、あとの規則が触れないようにする。
     ------------------------------------------------------------
     これをやらないと、生成した </i> の <b>スラッシュが分数の線と誤解</b>され、
     「100Σk=1<100Σk=1<」のように式が二重になって壊れる（実際そうなった）。 */
  /* ★ 添え字や根号の中身で mathFmt を<b>呼び直してはいけない</b>。
     呼び直すと札の入れ物（bag）が別々にできて番号が食いちがい、
     「sin θ + cos θ = 1sin θ + cos θ = 1」のように前半が二重になる。
     添え字の中は n・k=1・x→a のような短い式なので、そのまま出す。 */
  const bag = [];
  /* 札の番号に数字を使わない。あとの規則が数字を式の一部と拾って札が壊れるため、
     文章に出てこない私用領域の1文字で番号を表す。 */
  const stash = (html) => { bag.push(html); return String.fromCharCode(0xE000 + bag.length - 1); };

  /* ① Σ[k=1..n] → 上下に添え字の付いたシグマ */
  h = h.replace(/Σ\[([^\]=]+)=([^\].]+)\.\.([^\]]+)\]/g,
    (m, v, lo, hi) => stash('<span class="mbig"><i class="up">' + hi + '</i>'
      + '<b>Σ</b><i class="lo">' + v + "=" + lo + '</i></span>'));
  /* ② ∫[a..b] → 上下に添え字の付いた積分 */
  h = h.replace(/∫\[([^\].]+)\.\.([^\]]+)\]/g,
    (m, lo, hi) => stash('<span class="mbig"><i class="up">' + hi + '</i>'
      + '<b>∫</b><i class="lo">' + lo + '</i></span>'));
  /* ③ lim[x→a] → lim の下に添え字 */
  h = h.replace(/lim\[([^\]]+)\]/g,
    (m, sub) => stash('<span class="mbig lim"><b>lim</b><i class="lo">' + sub + '</i></span>'));

  /* ④ √( … ) → 根号を上線でくくる（対応する閉じかっこまで） */
  h = radicalize(h, stash);

  /* ⑤ 分数。<b>丸かっこで囲まれた側があるものだけ</b>を組む。
        (a+b)/2 ・ 1/(n+1) ・ a_n/(1+a_n) は組む。
        「1/2 の確率」のような素の数どうしはそのまま（文の流れを壊さないため）。
     ★ 添え字（_）は名前の一部として扱う。分けると a_n/(1+a_n) が
       「n ぶんの 1+a_n」になり、あまった "a_" が取り残される。 */
  /* ★ かっこは<b>1段の入れ子まで</b>認める。
     [^()]* だけだと 1/(k(k+1)) の分母が拾えず、分数にならないまま残っていた。
     ★ new RegExp に文字列で渡すと \( の backslash が消えてグループ扱いになるので、
       ここは必ず正規表現リテラルで書くこと。 */
  h = h.replace(/(\((?:[^()]|\([^()]*\))*\)|[A-Za-z0-9_²³⁴ⁿ]+\((?:[^()]|\([^()]*\))*\))\/(\((?:[^()]|\([^()]*\))*\)|[A-Za-z0-9_²³⁴ⁿ]+)/g,
    (m, x, y) => stash(frac(x, y)));
  h = h.replace(/([A-Za-z0-9_²³⁴ⁿ]+)\/(\((?:[^()]|\([^()]*\))*\))/g, (m, x, y) => stash(frac(x, y)));

  /* ⑥ かっこを中身の高さに合わせて伸ばす。
        分数やΣが入った ( … ) は、素のかっこだと中身より小さくて
        「どこからどこまでが一かたまりか」が読み取れなかった。
        中に組み上げたもの（札）が入っているかっこだけを伸ばす。 */
  h = growParens(h, stash);

  /* ⑦ 上付き・下付き（分数を組んだあとに通す） */
  h = h.replace(/\^\{([^}]+)\}/g, (m, x) => stash("<sup>" + x + "</sup>"));
  h = h.replace(/_\{([^}]+)\}/g, (m, x) => stash("<sub>" + x + "</sub>"));
  h = h.replace(/\^(-?[0-9A-Za-z]+)/g, (m, x) => stash("<sup>" + x + "</sup>"));
  h = h.replace(/([A-Za-z0-9])_([0-9A-Za-z])(?![0-9A-Za-z])/g,
    (m, x, y) => x + stash("<sub>" + y + "</sub>"));

  /* 札をもどす（中にまた札があることもあるので、無くなるまでくり返す） */
  for (let i = 0; i < 8 && /[\uE000-\uF8FF]/.test(h); i++) {
    h = h.replace(/[\uE000-\uF8FF]/g, (m) => bag[m.charCodeAt(0) - 0xE000] || "");
  }
  return h;
}
/* ★ 2026-08-17g 中身の高さに合わせて伸びるかっこ。
   ------------------------------------------------------------
   ( と ) を文字のまま出すと、中に分数やΣがあるときだけ極端に小さく見える。
   CSS 側で「上下いっぱいに伸びる弧」として描くので、
   中身が1行でも2段でも、かっこの高さが必ず中身に合う。
   ★ 伸ばすのは<b>中に組み上げたものが入っているかっこだけ</b>。
     ふつうの文の（ ）まで弧にすると、かえって読みにくくなる。 */
function growParens(h, stash) {
  for (let guard = 0; guard < 8; guard++) {
    let done = true;
    /* いちばん内側の ( … ) から順に処理する（入れ子でも高さがそろう） */
    h = h.replace(/\(([^()]*)\)/g, (m, inner) => {
      if (!/[\uE000-\uF8FF]/.test(inner)) return m;   // 組み上げたものが無ければそのまま
      done = false;
      return stash('<span class="pgrp"><i class="pl"></i><span class="pin">'
        + inner + '</span><i class="pr"></i></span>');
    });
    if (done) break;
  }
  return h;
}
/* 分数1つぶん。外側の丸かっこは、分子・分母に分けた時点でもう要らないので外す */
function frac(a, b) {
  /* いちばん外のかっこだけ外す（中の入れ子は残す） */
  const strip = (x) => {
    if (!/^\(.*\)$/.test(x)) return x;
    let d = 0;
    for (let i = 0; i < x.length; i++) {
      if (x[i] === "(") d++;
      else if (x[i] === ")") { d--; if (d === 0 && i < x.length - 1) return x; }
    }
    return x.slice(1, -1);
  };
  /* ★ 分子・分母の中の添え字も組む。ここでやらないと、外の規則が通るころには
     もう札に預けたあとなので a_n が「a_n」のまま残る。 */
  const sub = (x) => String(x)
    .replace(/\^\{([^}]+)\}/g, (m, y) => '<sup>' + y + '</sup>')
    .replace(/_\{([^}]+)\}/g, (m, y) => '<sub>' + y + '</sub>')
    .replace(/([A-Za-z0-9])_([0-9A-Za-z])(?![0-9A-Za-z])/g, (m, c, y) => c + '<sub>' + y + '</sub>');
  return '<span class="frac"><i class="nu">' + sub(strip(a)) + '</i><i class="de">' + sub(strip(b)) + '</i></span>';
}
/* √( … ) を、対応する閉じかっこまで上線でくくる */
function radicalize(h, stash) {
  h = h.replace(/√\(/g, "\u0001");
  let out = "", i = 0;
  while (i < h.length) {
    const p = h.indexOf("\u0001", i);
    if (p < 0) { out += h.slice(i); break; }
    out += h.slice(i, p);
    let d = 1, j = p + 1;
    while (j < h.length && d > 0) {
      if (h[j] === "(") d++;
      else if (h[j] === ")") d--;
      if (d === 0) break;
      j++;
    }
    const inner = h.slice(p + 1, j);
    out += stash('<span class="rad">√<i>' + inner + "</i></span>");
    i = j + 1;
  }
  return out;
}
/* esc したうえで数式に組む（画面に出す文字はこれを通す） */
function escMath(t) { return mathFmt(esc(t)); }
/* ★ ビンゴの科目マスは科目アイコンを借りる（SUBJ_ART の定義後でないと undefined になる） */
/* ★★ 2026-09-02 まとめ科目（化学・物理）はα の絵・色をそのまま借りる */
SUBJ_ART["化学"] = SUBJ_ART["化学α"];
SUBJ_ART["物理"] = SUBJ_ART["物理α"];
SUBJ_COLOR["化学"] = SUBJ_COLOR["化学α"];
SUBJ_COLOR["物理"] = SUBJ_COLOR["物理α"];
UI_ART.sMath = SUBJ_ART["数学"];
UI_ART.sPhys = SUBJ_ART["物理α"];
UI_ART.sChem = SUBJ_ART["化学α"];
UI_ART.sEigo = SUBJ_ART["英語"];

function subjIconSVG(subject){
  const d = SUBJ_ART[subject] || SUBJ_ART["英語"];
  return '<svg class="sbjsvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '
       + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}
/* タイル入り（一覧・範囲えらび・見出しで共通に使う）。
   cls を足すと大きさなどを差し替えられる。 */
function subjIcon(c, cls){
  const s = typeof c === "string" ? c : subjectOf(c);
  const col = SUBJ_COLOR[s] || "#6b5bd2";
  return '<span class="sbjic ' + (cls||"") + '" style="--sc:' + col + '" title="' + esc(s) + '">'
       + subjIconSVG(s) + '</span>';
}
/* ══ ★ 2026-08-17c セットごとの難易度 ══
   ------------------------------------------------------------
   「数学」「化学γ」と科目名だけ出しても、その中に
   ・教科書レベルの基礎セット
   ・大学入試の最難関セット
   が混ざっていて、開くまでどちらか分からなかった。
   ★ 判定は<b>セットのid</b>（＝どのファイルで作ったか）を第一の手がかりにする。
     名前の文字（「難問」など）は後から変わることがあるので、補助にとどめる。
   ★ セットを増やしたら、その接頭辞をここに1行足すこと。 */
/* ★ 2026-08-17d 5段階にひろげた。3段階（最難関/難関/標準）だと
   「化学γの総合問題」と「物質1つの一問一答」が同じ最難関になってしまい、
   どれから手を付ければいいかが読み取れなかった。
   ★の数＝そのまま段階の数にそろえてある（★1〜★5）。 */
const LEX_DIFF = {
  5: { nm: "最難関", c: "#e0574c" },
  4: { nm: "難関",   c: "#e08a2c" },
  3: { nm: "応用",   c: "#c9a227" },
  2: { nm: "標準",   c: "#3f8fd8" },
  1: { nm: "基礎",   c: "#2fa36a" },
};
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-18 XEVYNAR 連携

   MagiLex は「解けたか」を見るところ、XEVYNAR は「解けるようにする」ところ。
   むずかしい問題ほど、答えを見ただけでは次に進めないので、
   <b>その場から XEVYNAR のステップ学習へ渡せる</b>ようにした。

     lexToXevynar()            … ホームから。解法の一覧を開く
     lexLearnThis(text)        … いま解いている問題を渡す（#learn=）
                                  XEVYNAR 側が問題文から合いそうな定石を並べる
   ★ 区切り文字（& ? #）が質問文に混ざらないよう encodeURIComponent を通す。
   ══════════════════════════════════════════════════════════════ */
const XEVYNAR_URL = "../XEVYNAR/index.html";

/* ★★ 2026-08-19 XEVYNAR へ移る前に、学習の記録を<b>その場で書き切る</b>。

   これまではページを離れるときの beacon 送信に任せていたが、
   端末やブラウザによっては送りきる前に遷移してしまい、
   「解説を見に行ったら、さっきの記録が消えていた」ということが起きていた。
   ・localStorage への保存（save）は同期なので必ず通る
   ・クラウドへの送信（flush）は待てるだけ待つ（最大1.2秒）。
     間に合わなくても、次にアプリを開いたときに送られるので記録は失われない。 */
async function lexGoXevynar(hash) {
  try { save(); } catch (e) {}
  try { if (typeof saveActiveQuiz === "function" && quiz) saveActiveQuiz(); } catch (e) {}
  try {
    const c = window.MagiLexCloud;
    if (c && c.flush) {
      await Promise.race([
        Promise.resolve(c.flush()).catch(() => {}),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
    }
  } catch (e) {}
  location.href = XEVYNAR_URL + (hash || "");
}
window.lexToXevynar = ()=>{ lexGoXevynar("#solve=all"); };
window.lexLearnThis = (text)=>{
  const t = String(text || "").replace(/<[^>]*>/g, "").trim().slice(0, 180);
  lexGoXevynar(t ? "#learn=" + encodeURIComponent(t) : "#solve=all");
};
/* ★★ 2026-08-18b その問題<b>そのもの</b>のくわしい解説へ。
   XEVYNAR 側は #q=<セットid>:<問題番号> を受けて、
   「何を聞かれているか → 方針 → 使う公式 → 手順（1行ずつ）→ 図 →
     確かめかた → 誤答の理由 → 分からない言葉のやさしい例題」まで出す。
   ★ 単語帳（type==="word"）には問題番号が無いので、こちらは使わない。 */
/* まちがえた問題をまとめて見る。
   ★ XEVYNAR には「この並びを順に見る」という入口が要るので、
     控えておいた一覧を渡して、1問目から開く。 */
/* ★ 2026-08-20 まとめて見るのも最難関だけ（それ以外は解説そのものが無い） */
window.lexDeepMissed = ()=>{
  const list = (P.lastMissed||[]).filter(x => x.kind==="quiz" && x.sid && x.qi!=null && isDeepTarget(x.sid));
  if(!list.length){ toast("まちがえた問題がありません"); return; }
  try{ localStorage.setItem("xevynar_missed_v1", JSON.stringify({ at: Date.now(),
        list: list.map(x => ({ sid:x.sid, qi:x.qi })) })); }catch(e){}
  lexGoXevynar("#miss=1");
};
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-19 問題ごとの図・グラフ

   ・図は XEVYNAR と同じエンジン（XVFigs＝../XEVYNAR/xevynar-figs.js）を使う。
     問題文・手がかり・解説から、合う図を自動でえらぶ。
   ・図があるときだけボタンを出す（無い問題に空のボタンを置かない）。
   ・押すと下からシートで開く。何枚かあるときは全部ならべる。
   ══════════════════════════════════════════════════════════════ */
/* ★★ 2026-08-19 図は<b>その問題の数値で</b>描く。
   これまでは形が決め打ちだったので、同じ分野の問題がぜんぶ同じ絵になっていた。
   XVFigs.forProblem が、問題文から拾った数（頂点・辺・抵抗値・質量…）を持った
   図の指定を返すので、それをボタンに持たせて開くときに渡す。 */
function figsFor(o){
  if(!window.XVFigs || !XVFigs.forProblem) return [];
  return XVFigs.forProblem(o, 2);
}
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-20 「くわしい解説」は<b>最難関（難易度5）だけ</b>に出す。

   これまでは全部の問題に出していたが、
   1問1問の解説をうすく広げるより、<b>いちばん重い問題を深く</b>のほうが効く。
   入門・中堅・難関には、答えの下の解説（extra）と解法タブがある。
   ★ 判定は diffOf() 1本に寄せる。ここを変えれば出す範囲がまとめて変わる。
   ══════════════════════════════════════════════════════════════ */
function isDeepTarget(sid){
  try{
    const id = String(sid||"");
    /* ★★ 2026-08-20b ここに<b>セット名も渡す</b>のが要点。
       diffOf は「名前に『最難関』『難問』と書いてあれば無条件で最上位」という規則を
       いちばん先に見ているが、id の文字列だけを渡すと name が空になり、その規則が働かない。
       そのため <b>math_n_integer2「整数の難問」など6セット</b>が、
       ・XEVYNAR 側（XVDeep.isDeep は名前を見る）＝<b>解説を持っている</b>
       ・MagiLex 側（ここ）＝<b>対象外</b>
       と食いちがい、結果画面の「まちがえた問題」に
       <b>解説へ行ける案内が出るのに、押しても何も起きない</b>状態になっていた。
       ★ 線引きは XEVYNAR の XVDeep.diffOf と必ずそろえること。 */
    const sec = (typeof SECTIONS !== "undefined" ? SECTIONS : []).find(x => x && x.id === id);
    return diffOf(sec ? { sid: id, name: sec.name } : id) === 5;
  }catch(e){ return false; }
}
function deepBtnHTML(sid, qi){
  if(!isDeepTarget(sid)) return "";
  return `<button class="qa-deep" onclick="lexDeepQ('${esc(String(sid))}',${qi})">${uiIconSVG('exam')} くわしい解説</button>`;
}
/* 図を見るボタン（図が無ければ空文字＝ボタンを出さない） */
function figBtnHTML(o, cls){
  const fs = figsFor(o);
  if(!fs.length) return "";
  const key = encodeURIComponent(JSON.stringify(fs.map(f=>({ id:f.id, p:f.p }))));
  return `<button class="fig-btn ${cls||""}" onclick="lexShowFigs('${key}')">
    ${uiIconSVG('spark')} 図で見る<small>${esc(fs.map(f=>f.nm).join("・"))}</small></button>`;
}
function figSheetEnsure(){
  if(document.getElementById("figSheet")) return;
  const el = document.createElement("div");
  el.id = "figSheet"; el.className = "fig-sheet";
  el.innerHTML = `<div class="fig-bar"><b id="figTitle">図で見る</b>
      <button class="fig-x" onclick="lexCloseFigs()" aria-label="とじる">✕</button></div>
    <div class="fig-body" id="figBody"></div>`;
  document.body.appendChild(el);
  el.addEventListener("click", (e)=>{ if(e.target===el) lexCloseFigs(); });
}
window.lexShowFigs = (key)=>{
  if(!window.XVFigs){ toast("図を読み込めませんでした"); return; }
  let list = [];
  try{ list = JSON.parse(decodeURIComponent(key)) || []; }catch(e){}
  if(!list.length){ toast("この問題に合う図がありません"); return; }
  figSheetEnsure();
  document.getElementById("figBody").innerHTML = list.map(it=>{
    const id = typeof it === "string" ? it : it.id;
    const f = XVFigs.info(id); if(!f) return "";
    return `<div class="fig-one"><div class="fig-t">${esc(f.nm)}</div>
      ${XVFigs.make(id, { p: (it && it.p) || {} })}
      <div class="fig-c">${esc(f.cap)}</div></div>`;
  }).join("");
  document.getElementById("figSheet").classList.add("on");
};
window.lexCloseFigs = ()=>{
  const el = document.getElementById("figSheet");
  if(el) el.classList.remove("on");
};

window.lexDeepQ = (sid, qi)=>{
  if(!sid){ lexToXevynar(); return; }
  lexGoXevynar("#q=" + encodeURIComponent(sid) + ":" + (qi|0));
};
/* いま解いている問題を XEVYNAR へ渡す。
   クイズなら「その1問の解説」、単語帳なら問題文から近い解きかたを探す形にする。 */
window.lexLearnCurrent = ()=>{
  const it = (quiz && quiz.items) ? quiz.items[quiz.idx] : null;
  if(!it){ lexToXevynar(); return; }
  if(it.kind === "quiz" && it.sid != null && it.qi != null){ lexDeepQ(it.sid, it.qi); return; }
  lexLearnThis([it.tag || "", it.stem || ""].filter(Boolean).join(" "));
};

function diffOf(c){
  /* ★ 一覧が渡してくる id は "q_◯◯"（quizContents が付ける接頭辞）なので、
     素のセットid は c.sid に入っている。ここを見まちがえると
     どの規則にも当たらず全部が既定値になる（実際そうなっていた）。 */
  const id = (typeof c === "string" ? c : (c && (c.sid || c.id)) || "");
  const nm = (typeof c === "string" ? "" : (c && c.name) || "");
  /* 単語帳は暗記もの。問題セットの難易度とは別ものなので出さない */
  if(typeof c === "object" && c && c.type === "word") return 0;
  /* 名前に「最難関」「難問」と書いてあるものは無条件で最上位 */
  if(/最難関|難問/.test(nm)) return 5;
  /* ★★ 2026-08-19 中堅（最難関のひとつ手前）。
     id が「◯◯_mid」で終わる／phys_mid_ で始まるものがこれ。
     ★ この行は math_ / phys_ / cgamma_ の判定より<b>前</b>に置くこと。
       あとに置くと、math_a_mid が先に「数学＝難関4」で拾われてしまう。 */
  if(/_mid$/.test(id) || /^phys_mid_/.test(id)) return 3;
  /* ★★ 2026-08-19 入門（いちばん最初の段）。中堅よりさらに前に置く。 */
  if(/_intro$/.test(id) || /^phys_intro_/.test(id)) return 2;

  /* ★★ 2026-08-20 物理β。"_adv" で終わるものだけが最難関。
     ★ ここは /^phys_/ の判定より<b>前</b>に置く必要はない（physb_ は phys_ に当たらない）が、
       化学δとそろえて上に置いておく。 */
  if(/^physb_/.test(id)) return /_adv$/.test(id) ? 5 : 4;

  /* ★★ 2026-08-20 化学δ。"_adv" で終わるものだけが最難関（＝くわしい解説の対象）。 */
  if(/^cdelta_/.test(id)) return /_adv$/.test(id) ? 5 : 4;

  /* ★★ 2026-08-26 化学ε・物理γ は<b>全範囲を確実に取りきる</b>ための標準演習なので、
     まるごと「応用（★3）」。最難関（★5）にはしないので、くわしい解説の対象にもならない。
     ★ この2行は /^phys_/ や /^chem_/ の判定より<b>前</b>に置くこと。
       physg_ は phys_ で始まらないので当たらないが、読む人が取りちがえないよう
       化学δと同じ場所にそろえてある。 */
  if(/^ceps_/.test(id)) return 3;
  if(/^physg_/.test(id)) return 3;
  /* ★★ 2026-08-30 地理も全範囲をむらなく取りきるための演習なので、まるごと「応用（★3）」。 */
  if(/^geo_/.test(id)) return 3;

  /* ── ★5 最難関: 総合・記述の重い問題 ── */
  if(/^cgamma_[oi]_/.test(id)) return 5;   // 化学γ 有機・無機の総合
  if(/^phys_adv_/.test(id)) return 5;      // 物理（書き下ろしの最難関）
  if(/^math_c3_/.test(id)) return 5;       // 数学III（極限・微積・複素数平面）

  /* ── ★4 難関: 入試の標準〜やや上 ── */
  if(/^cgamma_s_/.test(id)) return 4;      // 化学γ 物質別（1物質を掘り下げる一問一答）
  if(/^math_/.test(id)) return 4;          // 数学（全範囲）

  /* ── ★3 応用: 教科書のさきにある内容 ── */
  if(/^cbeta_/.test(id)) return 3;         // 化学β（理論・無機・高分子）
  if(/^phys_/.test(id)) return 3;          // 物理（既存のセット）

  /* ── ★2 標準: 教科書レベル ── */
  if(/^chem_/.test(id)) return 2;          // 化学α（理論・無機・有機の基本）
  if(/^(kobun|kokugo_)/.test(id)) return 2;
  if(/^eigo_/.test(id)) return 2;

  /* 単語帳は暗記もの。問題セットの難易度とは別ものなので出さない */
  if(/^w_/.test(id)) return 0;

  /* ★1 基礎: 接頭辞のない古いセット（fatty / carboxyl / gas_prop など）＝
     用語の一問一答。ここがいちばん入りやすい。 */
  return 1;
}
/* 難易度のバッジ（一覧・範囲えらび・見出しで共通に使う） */
function diffBadge(c, cls){
  const d = diffOf(c), t = LEX_DIFF[d];
  if(!t) return "";
  /* ★ 2026-08-17d ★の数＝段階の数。5段階ぶんの枠をいつも描き、
     満たない ぶんは薄い★にする（「★★」だけだと全体が何段階なのか分からない）。 */
  const stars = '★'.repeat(d) + '<em>' + '★'.repeat(5 - d) + '</em>';
  return '<span class="dfb ' + (cls||"") + '" style="--dc:' + t.c + '" title="難易度 ' + d + ' / 5: ' + t.nm + '">'
       + '<i>' + stars + '</i>' + t.nm + '</span>';
}
function libFilterSummary(){
  const parts=[];
  parts.push(libSubject==="all"?"全科目":(isSubjectGroup(libSubject)?libSubject+"すべて":libSubject));
  if(libSubject!=="all"&&libGenre!=="all") parts.push(libGenre);
  if(libFilter!=="all"){ const l=(LIB_FILTERS.find(f=>f[0]===libFilter)||[,""])[1]; if(l) parts.push(l); }
  return parts.join(" ・ ");
}
function renderLibrary(){
  const panel = libFilterOpen ? `
    <div class="lib-filter-panel">
      <div class="filter-label">📂 科目</div>
      <div class="filters">
        <button class="fchip ${libSubject==='all'?'on':''}" onclick="lexLibSubject('all')">全科目</button>
        ${libSubjectsPresent().map(s=>`<button class="fchip ${isSubjectGroup(s)?'grp ':''}${libSubject===s?'on':''}" onclick="lexLibSubject('${s}')">${isSubjectGroup(s)?s+'すべて':s}</button>`).join("")}
      </div>
      ${libSubject!=="all" && genresPresent(libSubject).length>1 ? `
      <div class="filter-label">🏷️ ジャンル</div>
      <div class="filters">
        <button class="fchip ${libGenre==='all'?'on':''}" onclick="lexLibGenre('all')">全ジャンル</button>
        ${genresPresent(libSubject).map(g=>`<button class="fchip ${libGenre===g?'on':''}" onclick="lexLibGenre('${g}')">${g}</button>`).join("")}
      </div>` : ""}
      <div class="filter-label">📋 種類・状態</div>
      <div class="filters">
        ${LIB_FILTERS.map(([k,l])=>`<button class="fchip ${libFilter===k?'on':''}" onclick="lexLibFilter('${k}')">${l}</button>`).join("")}
      </div>
    </div>` : "";
  $("#scr-library").innerHTML=`
    <div class="back-row"><h2>${uiIconSVG('study')} 学習ライブラリ</h2></div>
    <input class="search" id="libSearch" placeholder="名前・問題の中身で検索（例: コンデンサー）" value="${esc(libQuery)}" oninput="lexLibSearch(this.value)">
    <button class="lib-filter-toggle" onclick="lexLibToggleFilter()">絞り込み：<b>${esc(libFilterSummary())}</b><span class="lft-arrow">${libFilterOpen?"▲ 閉じる":"▼ 選ぶ"}</span></button>
    ${panel}
    <div class="list" id="libList"></div>`;
  renderLibList();
}
/* ════════════════════════════════════════════════════════════════
   検索インデックス（★ 2026-08-16 追加）
   ════════════════════════════════════════════════════════════════
   これまでライブラリの検索はコンテンツ名だけを見ていたので、
   「コンデンサー」「酸化還元」のように<b>問題の中身にある語</b>で探せなかった。
   1問ずつの本文（問題文・答え・解説・誤答／単語と意味）を小文字でならべた配列を
   コンテンツごとに1回だけ作ってキャッシュし、以後はそれを数えるだけにする。 */
const _lexIdx = {};
function itemTexts(c){
  if(_lexIdx[c.id]) return _lexIdx[c.id];
  let arr;
  if(c.type==="quiz"){
    arr=(c.sec.questions||[]).map(q=>[q.stem,q.reading||"",q.answer,q.extra||"",(q.wrong||[]).join(" ")].join(" ").toLowerCase());
  } else {
    arr=Object.entries(c.subj.data||{}).map(([w,m])=>(w+" "+m).toLowerCase());
  }
  return (_lexIdx[c.id]=arr);
}
/* 検索語を含む問題の数 */
function contentHits(c,q){ let n=0; itemTexts(c).forEach(t=>{ if(t.includes(q)) n++; }); return n; }
/* 名前・科目・ジャンルのどれかに当たるか（中身のヒットとは別に数えたい） */
function nameHit(c,q){
  return c.name.toLowerCase().includes(q) || subjectOf(c).toLowerCase().includes(q) || genreOf(c).toLowerCase().includes(q);
}
/* 検索語を含む問題を、全コンテンツから集める（学習ボタン用） */
function searchMatches(q){
  const out=[];
  allContents().forEach(c=>{
    const texts=itemTexts(c);
    if(c.type==="quiz"){
      (c.sec.questions||[]).forEach((qq,i)=>{ if(texts[i] && texts[i].includes(q)) out.push({kind:"quiz",c,q:qq,i}); });
    } else {
      Object.entries(c.subj.data||{}).forEach(([word,mean],i)=>{ if(texts[i] && texts[i].includes(q)) out.push({kind:"word",c,word,mean}); });
    }
  });
  return out;
}
const SEARCH_QUIZ_MAX = 20;   // 検索した語句での学習は最大20問
window.lexSearchQuiz = () => {
  const q=(lastSearchQ||"").trim().toLowerCase();
  if(!q) return;
  const hits=searchMatches(q);
  if(!hits.length){ toast("その語句を含む問題がありません"); return; }
  const picks=shuffle(hits).slice(0, SEARCH_QUIZ_MAX);
  quiz={ items:picks.map(pk=>{
    if(pk.kind==="quiz"){
      const qq=pk.q, wrongs=pickWrongs(qq.answer, qq.wrong, N_OPTS-1, pk.c.sec);
      const b=balanceOpts(qq.answer, wrongs);
      return { stem:qq.stem, reading:qq.reading||"", answer:b.answer, full:b.full, extra:qq.extra||"", tag:pk.c.name,
        opts:b.opts, kind:"quiz", sid:pk.c.sid, qi:pk.i };
    }
    const meanings=Object.values(pk.c.subj.data||{});
    const wrongs=pickWrongs(pk.mean, meanings.filter(m2=>m2!==pk.mean), N_OPTS-1);
    const b=balanceOpts(pk.mean, wrongs);
    return { stem:pk.word, reading:"", answer:b.answer, full:b.full, extra:"", tag:pk.c.name,
      opts:b.opts, kind:"word", key:pk.c.key, word:pk.word,
      english:(pk.c.key||"").indexOf("eigo")===0 };
  }), idx:0, ok:0, src:"search", miss:[], q:q };
  saveActiveQuiz(); renderQuiz(); show({name:"quiz",tab:"library"});
};
let lastSearchQ="";

function renderLibList(){
  const box=$("#libList"); if(!box) return;
  let list=allContents();
  if(libSubject!=="all") list=list.filter(c=>inSubject(c,libSubject));
  if(libSubject!=="all"&&libGenre!=="all") list=list.filter(c=>genreOfIn(c,libSubject)===libGenre);
  if(libFilter==="quiz"||libFilter==="word") list=list.filter(c=>c.type===libFilter);
  else if(libFilter==="undone") list=list.filter(c=>statusOf(c)!=="done");
  else if(libFilter==="none"||libFilter==="learn"||libFilter==="done") list=list.filter(c=>statusOf(c)===libFilter);
  /* ★ 2026-08-16 検索は名前だけでなく<b>問題の中身</b>も見る。
     中身に当たったコンテンツは「◯問ヒット」を出し、多い順に上へ並べる。 */
  const q=(libQuery||"").trim().toLowerCase();
  lastSearchQ=q;
  const hits={};
  let totalHits=0;
  if(q){
    list=list.filter(c=>{
      const h=contentHits(c,q);
      hits[c.id]=h; totalHits+=h;
      return h>0 || nameHit(c,q);
    });
    list.sort((a,b)=>(hits[b.id]||0)-(hits[a.id]||0));
  }
  /* 検索語を含む問題だけをまとめて解ける入口。「その分野を学ぶ」ための導線。 */
  const studyBar = q && totalHits
    ? `<button class="lib-study" onclick="lexSearchQuiz()">
         「${esc(libQuery.trim())}」を含む問題 <b>${totalHits.toLocaleString()}</b> 問
         <span>まとめて学習する（最大${SEARCH_QUIZ_MAX}問）→</span>
       </button>` : "";
  if(!list.length){ box.innerHTML='<div class="empty">該当するコンテンツがありません</div>'; return; }
  box.innerHTML=studyBar+list.map(c=>{
    const mc=masteryCounts(c), st=statusOf(c), h=hits[c.id]||0;
    return `<button class="item" onclick="lexOpen('${c.id}')">
      <div class="ic">${subjIcon(c)}</div>
      <div class="bd"><div class="t">${esc(c.name)}${diffBadge(c)}${volumeBadge(c.total)}${h?`<span class="hitn">${h}問ヒット</span>`:""}</div>
        <div class="s">${esc(subjectOf(c))}${genreOf(c)!=="その他"?"／"+esc(genreOf(c)):""} ・ ${c.type==="quiz"?"選択クイズ":"単語帳・"+esc(c.subj.frontLabel||"単語")} ・ ${c.total}問</div></div>
      <span class="st-badge st-${st}">${STATUS_LABEL[st]}</span>
      <div class="prog">${mc.mastered}/${c.total}</div>
    </button>`;
  }).join("");
}
window.lexLibFilter=(k)=>{ libFilter=k; renderLibrary(); };
window.lexLibSubject=(s)=>{ libSubject=s; libGenre="all"; renderLibrary(); };
window.lexLibGenre=(g)=>{ libGenre=g; renderLibrary(); };
window.lexLibSearch=(v)=>{ libQuery=v; renderLibList(); };

// ============================================================
// 詳細（モード選択 + 3段階メーター）
// ============================================================
/* quizOnlyUn … ★ 2026-08-16 「まだ完全習得していない問題だけ出す」スイッチ。
   これまで各セットの選択クイズは「未習得を優先、足りないぶんは習得ずみで埋める」だったので、
   仕上げの時期でも覚えきった問題が混ざっていた。ミックスと同じスイッチをここにも置く。 */
let curContent=null, quizCount=10, quizOnlyUn=false;
window.lexOpen=(id)=>{ curContent=findContent(id); if(!curContent) return; render("detail"); show({name:"detail", tab:"library"}); };
/* このセットに残っている「まだ完全習得していない」問題数 */
function restCount(c){ const mc=masteryCounts(c); return Math.max(0, mc.total-mc.mastered); }
function meterHTML(c){
  const mc=masteryCounts(c), t=mc.total||1;
  const dw=mc.mastered/t*100, lw=mc.learning/t*100;
  return `<div class="meter"><i class="seg-done" style="width:${dw}%"></i><i class="seg-learn" style="width:${lw}%"></i></div>
    <div class="meter-legend">
      <span><i class="dot d-done"></i>完全習得 <b>${mc.mastered}</b></span>
      <span><i class="dot d-learn"></i>習得中 <b>${mc.learning}</b></span>
      <span><i class="dot d-none"></i>未習得 <b>${mc.untouched}</b></span>
    </div>`;
}
function renderDetail(){
  const c=curContent; if(!c) return;
  /* 「未完全習得のみ」のときは、出せる問題の上限が“のこり”の数になる。
     10問・20問・全問 のボタンもその数に合わせて出し直す。 */
  const rest = restCount(c);
  const cap  = quizOnlyUn ? rest : c.total;
  const counts=[10,20,cap].filter((v,i,a)=>v>0&&a.indexOf(v)===i&&v<=cap);
  if(quizCount>cap) quizCount=cap;
  if(!counts.includes(quizCount) && counts.length) quizCount=counts[counts.length-1];
  const unlearnedNow=unlearnedCount(c);   // 「未習得のみ」フラッシュカードの残り枚数
  $("#scr-detail").innerHTML=`
    <div class="back-row"><button class="back-btn" onclick="lexBack()">←</button><h2>${subjIcon(c,"big")} ${esc(c.name)}</h2></div>
    <div class="set-card"><div style="font-weight:800;font-size:.86rem;margin-bottom:10px">習得メーター</div>${meterHTML(c)}
      <div class="vol-note">${uiIconSVG('trophy')} 完全習得で <b>＋${rw(masterReward(c)).toLocaleString()} XEVA</b>${volumeMult(c.total)>1?`（${c.total}問のボリュームボーナス <b>×${volumeMult(c.total)}</b>）`:""}${campaignActive()?"（夏キャン2倍込み）":""}</div>
      <div class="reset-row">
        <div class="reset-tx">${uiIconSVG('redo')} <b>リセットして もう一度</b>
          <p>習得状況をまっさらに戻します。もう一度 完全習得すれば <b>XEVAを再度もらえます</b>${resetCountOf(c)?`　<span class="reset-n">いま ${resetCountOf(c)+1} 周目</span>`:""}</p>
        </div>
        <button class="reset-btn" ${counts.length&&(masteryCounts(c).mastered+masteryCounts(c).learning)>0?"":"disabled"} onclick="lexResetContent('${c.id}')">リセット</button>
      </div>
    </div>
    <div class="h-sec">学習モードを選ぶ</div>
    <div class="mode-grid">
      <div class="set-card" style="margin:0">
        <div style="font-weight:800;font-size:.9rem;margin-bottom:8px">📝 選択クイズ — 問題数</div>
        <div class="count-row" id="countRow">
          ${counts.length
            ? counts.map(n=>`<button class="count-btn ${n===quizCount?'on':''}" onclick="lexSetCount(${n})">${n===cap?"全":""}${n}問</button>`).join("")
            : '<span class="count-none">出せる問題がありません</span>'}
        </div>
        <!-- ★ 2026-08-16 完全習得ずみの問題を出題からはずすスイッチ -->
        <button class="mix-unsw sm ${quizOnlyUn?"on":""}" onclick="lexToggleOnlyUn()">
          <span class="mu-ck">${quizOnlyUn?"✓":""}</span>
          <span class="mu-bd">
            <b>まだ完全習得していない問題だけ出す</b>
            <p>${rest
                ? `覚えきった問題を出題から外します。のこり <b>${rest.toLocaleString()}</b> 問。`
                : "このセットは<b>すべて完全習得ずみ</b>です。切ると全問から出題します。"}</p>
          </span>
        </button>
        <button class="mode-btn primary" ${counts.length?"":"disabled"} onclick="lexStartQuiz()"><div class="mi">${uiIconSVG('quiz')}</div><div class="bd"><b>クイズを始める</b><p>${quizOnlyUn?"未完全習得の問題だけ・":""}4〜5択＋「わからない」・自動で次の問題へ</p></div><div class="go">→</div></button>
      </div>
      <button class="mode-btn" onclick="lexStartFlash()"><div class="mi">${uiIconSVG('flash')}</div><div class="bd"><b>フラッシュカード</b><p>${c.type==="word"?"単語→意味をめくって暗記":"問題→答えをめくって確認"}</p></div><div class="go">→</div></button>
      <button class="mode-btn ${unlearnedNow===0?"is-done":""}" onclick="lexStartFlash(true)"><div class="mi">${uiIconSVG('target')}</div><div class="bd"><b>フラッシュカード（未習得のみ）</b><p>${unlearnedNow===0?"すべて習得済み！":"まだ習得していない "+unlearnedNow+" 件だけをめくる"}</p></div><div class="go">→</div></button>
      <button class="mode-btn" onclick="lexShowList()"><div class="mi">${uiIconSVG('list')}</div><div class="bd"><b>${c.type==="word"?"単語一覧":"問題と答えの一覧"}</b><p>${c.total}件をまとめて確認</p></div><div class="go">→</div></button>
    </div>
    ${confirmTestCardHTML(c)}`;
}
window.lexSetCount=(n)=>{ quizCount=n; renderDetail(); };
window.lexToggleOnlyUn=()=>{ quizOnlyUn=!quizOnlyUn; renderDetail(); };
window.lexBack=()=>{ nav.pop(); const prev=nav[nav.length-1]||{name:"home",tab:"home"}; if(["home","library","detail","mixsetup","stats","settings"].includes(prev.name)) render(prev.name); show(prev,false); };

// ============================================================
// クイズエンジン（多択 + わからない）
// ============================================================
let quiz=null;
/* 未習得（完全習得でない）問題を必ず先に採用し、枠が余ったら習得済みで埋める。
   → 完全習得になっていない問題は次の回で必ず出題される */
function pickPrioritized(unmastered, mastered, count){
  let picks=shuffle(unmastered).slice(0,count);
  if(picks.length<count) picks=picks.concat(shuffle(mastered).slice(0,count-picks.length));
  return shuffle(picks);   // 出題順はランダム
}
/* onlyUn=true … 完全習得ずみの問題をプールから丸ごと外す（★ 2026-08-16 追加）。
   ミックスの「まだ完全習得していない問題だけ出す」と同じ考えかたを、
   各セットの選択クイズにも用意した。
   ★ count に c.total を渡すと必ず「全問」になる（未習得+習得ずみ＝総数なので、
     pickPrioritized が un で足りないぶんを ma から埋めて、ちょうど総数になる）。
     確認テストはこの性質を使って全問出題している。 */
function buildQuizItems(c, count, onlyUn){
  if(c.type==="quiz"){
    const m=P.quiz[c.sid]||{};
    const all=c.sec.questions.map((q,i)=>({q,i}));
    const un=all.filter(x=>!(m[x.i]&&m[x.i].m)), ma=onlyUn?[]:all.filter(x=>m[x.i]&&m[x.i].m);
    const qs=pickPrioritized(un, ma, count);
    return qs.map(({q,i})=>{
      /* ★ 2026-08-24 同じセットのほかの問題の誤答も候補に渡す（長さの手がかりつぶし） */
      const wrongs=pickWrongs(q.answer, q.wrong, N_OPTS-1, c.sec);
      const b=balanceOpts(q.answer, wrongs);
      return { stem:q.stem, reading:q.reading||"", answer:b.answer, full:b.full, extra:q.extra||"", tag:MODE_LABEL[c.sec.mode]||c.sec.desc||"問題",
        opts:b.opts, kind:"quiz", sid:c.sid, qi:i };
    });
  } else {
    const m=P.words[c.key]||{};
    const entries=Object.entries(c.subj.data); const meanings=entries.map(e=>e[1]);
    const un=entries.filter(([w])=>!(m[w]&&m[w].m)), ma=onlyUn?[]:entries.filter(([w])=>m[w]&&m[w].m);
    const picks=pickPrioritized(un, ma, count);
    const eng=c.key.indexOf("eigo")===0;
    return picks.map(([word,mean])=>{
      const wrongs=pickWrongs(mean, meanings.filter(m2=>m2!==mean), N_OPTS-1);
      const b=balanceOpts(mean, wrongs);
      return { stem:word, reading:"", answer:b.answer, full:b.full, extra:"", tag:(c.subj.frontLabel||"単語")+" → 意味",
        opts:b.opts, kind:"word", key:c.key, word, english:eng };
    });
  }
}
window.lexStartQuiz=()=>{
  if(!curContent) return;
  const items=buildQuizItems(curContent,quizCount,quizOnlyUn);
  if(!items.length){ toast("出せる問題がありません。スイッチを切ってください"); return; }
  quiz={ items, idx:0, ok:0, src:"section", miss:[] };
  saveActiveQuiz(); renderQuiz(); show({name:"quiz",tab:"library"});
};

// ============================================================
// ミックス問題の出題範囲（★ 2026-08-04 追加）
//   これまでミックスは「全範囲から30問」の一択で、
//   「今日は化学だけ」「英単語の名詞だけ」といった絞り方ができなかった。
//   科目 → コンテンツ の2段で選べるようにして、選択は保存する（次回もそのまま）。
//   ★ 科目はデータに持たせず、コンテンツIDから判定する（既存データを触らずに済む）。
//     新しいコンテンツを足したときは SUBJECT_RULES に1行足せばよい。
// ============================================================
/* 科目ごとにコンテンツをまとめる（画面の並び順もここで決まる）。
   ★ アイコンは subjIcon() 1本（SUBJ_ART）に統一した。
     ここで独自の科目分け・独自のアイコンを作らないこと。ライブラリ画面の
     絞り込みとズレると「学習タブでは化学βなのにミックスでは化学」が起きる。 */
function contentsBySubject(){
  const order = subjectsPresent();
  return order.map(nm => ({
    key: nm, nm: nm, ic: subjIcon(nm),
    items: allContents().filter(c => subjectOf(c) === nm),
  })).filter(g => g.items.length);
}
/* いま選ばれている範囲（コンテンツIDの配列）。未設定なら全部。 */
function mixSelIds(){
  const all = allContents().map(c=>c.id);
  const sel = P.mixSel && Array.isArray(P.mixSel.ids) ? P.mixSel.ids.filter(id=>all.includes(id)) : null;
  return (sel && sel.length) ? sel : all;
}

/* ════════════════════════════════════════════════════════════════
   「まだ完全習得していない問題だけ」のセット（★ 2026-08-15 追加）
   ════════════════════════════════════════════════════════════════
   これまでミックスは、未習得を"優先"はしても、範囲に完全習得ずみの問題が
   残っていれば混ざって出ていた（20問に足りないときの埋め合わせに使う）。
   仕上げの時期には「もう覚えたものは見たくない」ので、
   <b>完全習得ずみの問題を出題プールから丸ごと外す</b>スイッチを足す。

   ★ 2つある。混ぜないこと。
     ① 範囲えらび　… まだ完全習得していないコンテンツだけにチェックを付け直す
                     （lexMixOnlyUnRange）。押した時点で選び直すだけの操作。
     ② 出題スイッチ… 選んだ範囲の中から、完全習得ずみの1問1問を外す
                     （P.mixSel.onlyUn）。こちらが「問題のみ」の本体。
   ①だけだと、8割習得したコンテンツの残り2割を狙って解けない。
   ②だけだと、完全習得ずみのコンテンツが範囲一覧に並んだままで選びにくい。 */
function mixOnlyUn(){ return !!(P.mixSel && P.mixSel.onlyUn); }
/* まだ完全習得になっていない問題が1問でも残っているコンテンツ */
function hasUnmastered(c){ const mc = masteryCounts(c); return mc.total > 0 && mc.mastered < mc.total; }
/* 選んだ範囲に残っている「未完全習得」の問題数 */
function mixUnmasteredTotal(ids){
  return allContents().filter(c=>ids.includes(c.id))
    .reduce((a,c)=>{ const mc=masteryCounts(c); return a + Math.max(0, mc.total - mc.mastered); }, 0);
}
/* ★ 2026-08-05: ミックス問題の問題数は 20問 に固定した。
   選べるようにしていたが、範囲えらびと問題数えらびの2段は決めることが多く、
   「とりあえず始める」までが遠かった。範囲だけ選べばすぐ始められる形にする。 */
const MIX_FIXED_N = 20;
function mixSelCount(){ return MIX_FIXED_N; }
function mixSaveSel(ids, onlyUn){
  P.mixSel = { ids:ids.slice(), count:MIX_FIXED_N, onlyUn: !!onlyUn };
  save();
}
/* 選んだ範囲に入っている問題の総数（「◯問から出題」の表示に使う） */
function mixPoolTotal(ids){
  return allContents().filter(c=>ids.includes(c.id)).reduce((a,c)=>a+c.total, 0);
}

let mixDraftIds = null, mixDraftOnlyUn = false;

window.lexMixSetup = () => {
  mixDraftIds = mixSelIds().slice();
  mixDraftOnlyUn = mixOnlyUn();
  renderMixSetup();
  show({ name:"mixsetup", tab:"home" });
};
function renderMixSetup(){
  const groups = contentsBySubject();
  const poolAll = mixPoolTotal(mixDraftIds);
  const poolUn  = mixUnmasteredTotal(mixDraftIds);
  const pool = mixDraftOnlyUn ? poolUn : poolAll;
  /* ★ 2026-08-16 ミックスは必ず20問。範囲の問題数が20に満たないときは始められない。
     （足りないまま始めると「ミックス問題」なのに5問だけ、のような回になっていた） */
  const enough = pool >= MIX_FIXED_N;
  const short = Math.max(0, MIX_FIXED_N - pool);
  const n = MIX_FIXED_N;
  $("#scr-mixsetup").innerHTML = `
    <div class="back-row"><button class="back-btn" onclick="lexBack()">←</button><h2>${uiIconSVG('mix')} ミックス問題</h2></div>
    <div class="set-card">
      <div style="font-weight:800;font-size:.86rem;margin-bottom:6px">出題する科目・範囲をえらぶ</div>
      <p class="mix-note">チェックを入れた範囲だけから<b>20問</b>出題します。<b>未習得の問題が優先</b>されるのはこれまでどおりです。</p>
      <div class="mix-sum ${enough?"":"ng"}" id="mixSum">選択中 <b>${mixDraftIds.length}</b> 範囲 ／ <b>${pool.toLocaleString()}</b> 問から出題${
        mixDraftOnlyUn ? '<small class="ms-un">（完全習得ずみを除く）</small>' : ""}${
        enough ? "" : `<small class="ms-ng">20問に <b>${short}</b> 問たりません。範囲を足してください</small>`}</div>
      <div class="mix-allrow">
        <button class="mix-abtn" onclick="lexMixAll(1)">すべて選ぶ</button>
        <button class="mix-abtn" onclick="lexMixAll(0)">すべて外す</button>
        <button class="mix-abtn un" onclick="lexMixOnlyUnRange()">未習得が残る範囲だけ</button>
      </div>
    </div>

    <!-- ★ 完全習得ずみを出題プールから外すスイッチ -->
    <button class="mix-unsw ${mixDraftOnlyUn?"on":""}" onclick="lexMixToggleOnlyUn()">
      <span class="mu-ck">${mixDraftOnlyUn?"✓":""}</span>
      <span class="mu-bd">
        <b>まだ完全習得していない問題だけ出す</b>
        <p>${poolUn
            ? `覚えきった問題を出題から外します。いまの範囲に <b>${poolUn.toLocaleString()}</b> 問 残っています。`
            : `いまの範囲は<b>すべて完全習得ずみ</b>です。範囲を足すか、このスイッチを切ってください。`}</p>
      </span>
    </button>

    <div class="h-sec">科目ごとの範囲</div>
    ${groups.map(g=>{
      const on = g.items.filter(c=>mixDraftIds.includes(c.id)).length;
      return `<div class="mix-grp">
        <button class="mix-ghead ${on===g.items.length?"all":on?"some":""}" onclick="lexMixSubj(this.dataset.k)" data-k="${esc(g.key)}">
          <span class="mg-ic">${g.ic}</span>
          <span class="mg-nm">${esc(g.nm)}<small>${on} / ${g.items.length} 範囲</small></span>
          <span class="mg-ck">${on===g.items.length?"✓":on?"–":""}</span>
        </button>
        <div class="mix-items">
          ${g.items.map(c=>{
            const sel = mixDraftIds.includes(c.id);
            const mc = masteryCounts(c);
            const rest = Math.max(0, mc.total - mc.mastered);
            /* スイッチが入っているとき、完全習得ずみの範囲は選んでも1問も出ない。
               選べなくはしない（外し忘れに気づけるように）が、薄く見せて理由を書く。 */
            const dead = mixDraftOnlyUn && rest === 0;
            return `<button class="mix-item ${sel?"on":""} ${dead?"dead":""}" onclick="lexMixToggle('${c.id}')">
              <span class="mi-ck">${sel?"✓":""}</span>
              <span class="mi-nm">${subjIcon(c,"sm")} ${esc(c.name)}${diffBadge(c,"xs")}</span>
              <span class="mi-n">${c.total}問<small>${dead?"完全習得ずみ":mixDraftOnlyUn?"のこり"+rest+"問":mc.mastered+"習得"}</small></span>
            </button>`;
          }).join("")}
        </div>
      </div>`;
    }).join("")}
    <!-- ★ 2026-08-17c 「この範囲で始める」は<b>画面の下に固定</b>する。
         科目・範囲の一覧が長いので、いちばん下まで送らないと押せなかった。
         いま何問えらべているかも同時に見えるようにする。 -->
    <div class="mix-startbar">
      <button class="mode-btn primary" ${enough?"":"disabled"} onclick="lexMixStart()">
        <div class="mi">${uiIconSVG('mix')}</div>
        <div class="bd"><b>この範囲で始める</b><p>${enough
          ? `${n}問 ・ 90%↑ +${rw(REWARD.mix90)} / 100% +${rw(REWARD.mix100)}`
          : !mixDraftIds.length ? "範囲を1つ以上えらんでください"
          : mixDraftOnlyUn ? `未完全習得の問題が ${pool} 問しかありません。範囲を足すかスイッチを切ってください`
          : `あと ${short} 問ぶん、範囲を足してください（20問必要）`}</p></div>
        <div class="go">→</div>
      </button>
    </div>`;
  mixBarToBody();
}
/* ★ 2026-08-17c 固定バーは <body> 直下へ移す。
   画面（.screen）には切り替えのアニメーションで transform がかかっていて、
   その中に position:fixed を置くと<b>画面ではなくその要素が基準</b>になってしまい、
   ずっと下（top が数千px）へ飛んでいた。fixed は transform の祖先の外に出す。 */
function mixBarToBody(){
  const old = document.getElementById("mixStartBar");
  if(old) old.remove();
  const bar = $("#scr-mixsetup").querySelector(".mix-startbar");
  if(!bar) return;
  bar.id = "mixStartBar";
  document.body.appendChild(bar);
}
/* ミックスの画面から出たら固定バーも片づける（他の画面に残らないように） */
function mixBarHide(){ const b = document.getElementById("mixStartBar"); if(b) b.remove(); }
window.lexMixToggle = (id) => {
  const i = mixDraftIds.indexOf(id);
  if(i>=0) mixDraftIds.splice(i,1); else mixDraftIds.push(id);
  renderMixSetup();
};
/* ①範囲えらび: まだ完全習得していない問題が残っているコンテンツだけにする */
window.lexMixOnlyUnRange = () => {
  const ids = allContents().filter(hasUnmastered).map(c=>c.id);
  if(!ids.length){ toast("すべてのコンテンツが完全習得ずみです！"); return; }
  mixDraftIds = ids;
  renderMixSetup();
};
/* ②出題スイッチ: 完全習得ずみの1問1問をプールから外す */
window.lexMixToggleOnlyUn = () => { mixDraftOnlyUn = !mixDraftOnlyUn; renderMixSetup(); };
window.lexMixSubj = (key) => {
  /* key は科目名そのもの（"化学α" など）。HTML 属性に入れるので引用符に注意 */
  const g = contentsBySubject().find(x=>x.key===key); if(!g) return;
  const all = g.items.every(c=>mixDraftIds.includes(c.id));
  g.items.forEach(c=>{
    const i = mixDraftIds.indexOf(c.id);
    if(all){ if(i>=0) mixDraftIds.splice(i,1); }
    else if(i<0) mixDraftIds.push(c.id);
  });
  renderMixSetup();
};
window.lexMixAll = (on) => { mixDraftIds = on ? allContents().map(c=>c.id) : []; renderMixSetup(); };
/* ★ 2026-08-05: 問題数は20問固定にしたので、えらぶボタン（lexMixCount）は廃止した */
window.lexMixStart = () => {
  if(!mixDraftIds.length) return;
  /* 20問そろわない範囲では始めない（画面のボタンも無効にしてあるが、二重に止める） */
  const pool = mixDraftOnlyUn ? mixUnmasteredTotal(mixDraftIds) : mixPoolTotal(mixDraftIds);
  if(pool < MIX_FIXED_N){ toast("20問に "+(MIX_FIXED_N-pool)+" 問たりません。範囲を足してください"); return; }
  mixSaveSel(mixDraftIds, mixDraftOnlyUn);
  lexMix();
};

window.lexMix=()=>{
  /* ★ 2026-08-04: 出題範囲（P.mixSel）に入っているコンテンツだけから作る。
     クイズのセクションと単語帳の両方が対象。未習得を優先するのは従来どおり。
     ★ 2026-08-15: onlyUn が立っているときは、完全習得ずみ（ma）を丸ごと捨てる。
       「優先」ではなく「出さない」なので、20問に満たなくても混ぜない。 */
  const ids = mixSelIds();
  const onlyUn = mixOnlyUn();
  const un=[], ma=[];
  allContents().forEach(c=>{
    if(!ids.includes(c.id)) return;
    if(c.type==="quiz"){
      (c.sec.questions||[]).forEach((q,i)=>{
        const r=(P.quiz[c.sid]||{})[i];
        (r&&r.m ? ma : un).push({ kind:"quiz", c, q, i });
      });
    } else {
      const data=c.subj.data||{}, m=P.words[c.key]||{};
      Object.entries(data).forEach(([word,mean])=>{
        const r=m[word];
        (r&&r.m ? ma : un).push({ kind:"word", c, word, mean });
      });
    }
  });
  const pool2 = onlyUn ? [] : ma;
  /* ★ 2026-08-16 ミックスは20問ちょうど。20問に足りない範囲では始めない
     （保存ずみの範囲から直接 lexMix() に来ることもあるので、ここでも止める）。 */
  const avail = un.length + pool2.length;
  if(avail < MIX_FIXED_N){
    toast(onlyUn ? "未完全習得の問題が "+avail+" 問しかありません。範囲を足すかスイッチを切ってください"
                 : "20問に "+(MIX_FIXED_N-avail)+" 問たりません。範囲をえらび直してください");
    lexMixSetup();
    return;
  }
  const count=MIX_FIXED_N;
  const picks=pickPrioritized(un, pool2, count);
  quiz={ items:picks.map(pk=>{
    if(pk.kind==="quiz"){
      const q=pk.q, wrongs=pickWrongs(q.answer, q.wrong, N_OPTS-1, pk.c.sec);
      const b=balanceOpts(q.answer, wrongs);
      return { stem:q.stem, reading:q.reading||"", answer:b.answer, full:b.full, extra:q.extra||"", tag:pk.c.name,
        opts:b.opts, kind:"quiz", sid:pk.c.sid, qi:pk.i };
    }
    const meanings=Object.values(pk.c.subj.data||{});
    const wrongs=pickWrongs(pk.mean, meanings.filter(m2=>m2!==pk.mean), N_OPTS-1);
    const b=balanceOpts(pk.mean, wrongs);
    return { stem:pk.word, reading:"", answer:b.answer, full:b.full, extra:"", tag:pk.c.name,
      opts:b.opts, kind:"word", key:pk.c.key, word:pk.word,
      english:(pk.c.key||"").indexOf("eigo")===0 };
  }), idx:0, ok:0, src:"mix", miss:[] };
  saveActiveQuiz(); renderQuiz(); show({name:"quiz",tab:"home"});
};
// ---- 途中経過の保存・再開（ホームなどに戻っても続きから） ----
/* ★★ 2026-08-28 確認テストの1問ずつの記録（log）も持ちこす。
   これが無いと、中断して再開したときに<b>最後の答え合わせが途中から</b>になる。 */
function saveActiveQuiz(){ if(!quiz) return; P.activeQuiz={ items:quiz.items, idx:quiz.idx, ok:quiz.ok, src:quiz.src, cid:quiz.cid||null, miss:quiz.miss||[], log:quiz.log||[], q:quiz.q||"", contentId:(curContent?curContent.id:null), savedAt:Date.now() }; save(); }
function clearActiveQuiz(){ if(P.activeQuiz){ P.activeQuiz=null; save(); } }
window.lexResumeQuiz=()=>{
  const a=P.activeQuiz; if(!a||!a.items||!a.items.length) return;
  curContent = a.contentId ? findContent(a.contentId) : null;
  quiz={ items:a.items, idx:Math.min(a.idx||0, a.items.length-1), ok:a.ok||0, src:a.src||"section", cid:a.cid||null, miss:Array.isArray(a.miss)?a.miss:[], log:Array.isArray(a.log)?a.log:[], q:a.q||"" };
  renderQuiz(); show({name:"quiz", tab:(a.src==="mix"||a.src==="search"?"home":"library")});
};
function renderQuiz(){
  clearAutoNext();
  const it=quiz.items[quiz.idx]; const n=quiz.items.length;
  const pct=Math.round(quiz.idx/n*100);
  // コンパクトヘッダ: ✕・タイトル・問題数・進捗バーを1行にまとめてスクロールを抑える
  $("#scr-quiz").innerHTML=`
    <div class="quiz-head compact">
      <button class="back-btn" onclick="lexQuit()">✕</button>
      <span class="qh-title">${quiz.src==="mix"?"🎯 ミックス":quiz.src==="confirm"?"🎓 確認テスト":quiz.src==="search"?"🔎 検索した分野":"📝 クイズ"}</span>
      <div class="qprog inline"><i style="width:${pct}%"></i></div>
      <span class="qx">${quiz.idx+1}/${n}</span>
    </div>
    <div class="q-card">
      <div class="q-tag">${esc(it.tag)}</div>
      <div class="q-stem">${escMath(it.stem)}${it.english?spkBtn(it.stem):""}</div>
      ${/* ★★ 2026-08-20 問題を解いている最中に図は出さない。
             解いている途中の図は「答えの形」を教えてしまううえ、
             手を止めさせてしまうので、解き終えたあとの解説だけに置く。 */""}
      <div class="opts" id="opts">${it.opts.map((o,i)=>`<button class="opt" onclick="lexAnswer(${i})">${esc(o)}</button>`).join("")}</div>
      ${/* ★★ 2026-08-28 <b>確認テストのあいだは正誤も正解も出さない</b>（ご指定）。
             ・えらんだ答えは「うすい枠」で残すだけ（緑＝正解／赤＝不正解は付けない）
             ・正解と解説は<b>最後の結果画面でまとめて</b>出す
           ★ ここを分けておかないと、答え合わせだけ後回しにしても
             「正解：◯◯」が出ているので意味がなくなる。 */""}
      <button class="dunno" id="dunnoBtn" onclick="lexDontKnow()">${quiz.src==="confirm"
        ? "？ わからない（答えずに次へ）" : "？ わからない（答えを見る）"}</button>
      <div class="reveal" id="reveal">${quiz.src==="confirm"
        ? `<div class="ans conf">✓ 回答しました<span>正解・不正解は<b>最後にまとめて</b>表示します</span></div>`
        : `<div class="ans">正解：${escMath(it.full||it.answer)}</div>${it.extra?`<div class="ex">${escMath(it.extra)}</div>`:""}`}
        ${/* ★★ 2026-08-19 ここにあった「XEVYNAR で見る」ボタンは<b>廃止</b>しました。
              解いている途中でアプリを離れると、そのセットを最後まで解き終わらないため
              <b>習得の判定とごほうびが走らず、記録が切れて見える</b>のが理由です。
              くわしい解説へは<b>最後まで解き終わった結果の画面</b>と、
              <b>「問題と答えの一覧」</b>から行けます。 */""}
      </div>
      <button class="next-btn" id="nextBtn" onclick="lexNext()">${quiz.idx<n-1?"次の問題 →":"結果を見る ✨"}</button>
      <div class="auto-cd" id="autoCd"></div>
    </div>`;
  if(it.english) autoSpeakIfOn(it.stem);
}
// 正誤・解説を表示したあと、設定した秒数で自動的に次の問題へ進む（オフなら自動送りしない）
function clearAutoNext(){ if(quiz){ if(quiz._timer){ clearTimeout(quiz._timer); quiz._timer=null; } if(quiz._cd){ clearInterval(quiz._cd); quiz._cd=null; } } }
function scheduleAutoNext(correct){
  clearAutoNext();
  if(!autoNext.on) return;   // 手動モード：自分で「次の問題」を押して進む
  const ms = (correct ? autoNext.correct : autoNext.wrong) * 1000;
  const last = quiz.idx>=quiz.items.length-1;
  quiz._deadline = Date.now()+ms;
  const cd=$("#autoCd");
  const tick=()=>{
    const el=$("#autoCd"); if(!el) return;
    const left=Math.max(0, Math.ceil((quiz._deadline-Date.now())/1000));
    el.textContent = left>0 ? (left+"秒後に"+(last?"結果へ…":"次の問題へ…")) : "";
  };
  if(cd) tick();
  quiz._cd=setInterval(tick, 250);
  quiz._timer=setTimeout(()=>{ clearAutoNext(); lexNext(); }, ms);
}
function recordAnswer(it, correct){
  P.totals.answered++; if(correct){ P.totals.correct++; quiz.ok++; }
  /* その日ぶんも数えておく（カレンダーで日ごとに見られるように） */
  try{ const d=dayLog(); d.a++; if(correct) d.c++; }catch(e){}
  /* ★★ 2026-08-22 ビンゴの「数学を50問とく」などのために、科目べつにも数える。
     ★ subjectOf はコンテンツの形（type / sid / key）を見るので、
       それに合わせた見た目のものを渡す。ここで科目名を作り直さないこと
       （作り直すと SECTIONS 側の分類とずれていく）。 */
  try{
    const sj = subjectOf(it.kind==="quiz" ? { type:"quiz", sid:it.sid } : { type:"word", key:it.key });
    const g = /^数学/.test(sj) ? "math" : /^物理/.test(sj) ? "phys"
            : /^化学/.test(sj) ? "chem" : /^英語/.test(sj) ? "eigo" : "";
    if(g) mlBump("s_" + g);
  }catch(e){}
  /* まちがえた問題を覚えておく（確認テストで不合格だったときに習得中へ戻すのに使う）。
     ★ 途中でホームへ戻っても続きから再開できるよう、activeQuiz にも一緒に保存する。 */
  if(!correct){ quiz.miss = quiz.miss || []; quiz.miss.push(it); }
  if(it.kind==="quiz"){ P.quiz[it.sid]=P.quiz[it.sid]||{}; const r=P.quiz[it.sid][it.qi]=P.quiz[it.sid][it.qi]||{c:0,m:false}; if(correct){ r.c=Math.min(r.c+1,2); if(r.c>=2) r.m=true; } else r.c=0; }
  else { P.words[it.key]=P.words[it.key]||{}; const r=P.words[it.key][it.word]=P.words[it.key][it.word]||{c:0,m:false}; if(correct){ r.c=Math.min(r.c+1,2); if(r.c>=2) r.m=true; } else r.c=0; }
  markStudied(); save(); saveActiveQuiz();
}
function revealQuiz(correct, keepDunno){
  /* ★ 2026-08-17g 「わからない」で答えたときは、そのボタンを<b>消さずに赤で残す</b>。
     えらんで間違えたときと同じ見え方（赤＝自分の答え／緑＝正解）にそろえる。 */
  const b=$("#dunnoBtn"); if(b && !keepDunno) b.style.display="none";
  $("#reveal").classList.add("show"); $("#nextBtn").classList.add("show"); scheduleAutoNext(!!correct);
}
/* ★ 2026-08-17g 「えらんだとき」と「わからない」で<b>まったく同じ道</b>を通す。
   ------------------------------------------------------------
   以前は2つの関数に同じような処理を書いていて、片方だけ直すと見た目がずれた
   （実際、当たりの探し方が === と indexOf に分かれていた）。
   pick に -1 を渡せば「わからない」。正解の出しかたは1か所だけになる。
   ★ 「わからない」も<b>不正解と同じ扱い</b>にする。緑の正解だけが出て
     赤がどこにも無いと、まちがえたのに合っていたように見えてしまう。 */
function finishQuestion(pick){
  if($("#reveal").classList.contains("show")) return;
  const it=quiz.items[quiz.idx];
  const correct = pick>=0 && it.opts[pick]===it.answer;
  recordAnswer(it, correct);
  /* ★★ 2026-08-28 確認テストは<b>1問ごとに正誤を出さない</b>（ご指定）。
     えらんだ答えだけ「うすい枠」で残し、正解・解説は結果画面でまとめて出す。
     ★ 答え合わせのために、1問ずつの記録（quiz.log）をここで取っておく。 */
  if(quiz.src==="confirm"){
    quiz.log = quiz.log || [];
    quiz.log.push({ stem: it.stem, ans: (it.full||it.answer||""),
      mine: pick>=0 ? it.opts[pick] : "", correct: correct,
      kind: it.kind, sid: it.sid, qi: it.qi });
    document.querySelectorAll("#opts .opt").forEach((b,bi)=>{
      b.disabled = true;
      b.classList.add(bi===pick ? "picked" : "dim");
    });
    const dc = $("#dunnoBtn");
    if(dc){ if(pick<0){ dc.classList.add("picked"); dc.disabled = true; } else dc.style.display = "none"; }
    $("#reveal").classList.add("show"); $("#nextBtn").classList.add("show");
    saveActiveQuiz();
    scheduleAutoNext(true);
    return;
  }
  document.querySelectorAll("#opts .opt").forEach((b,bi)=>{
    b.disabled=true;
    if(it.opts[bi]===it.answer) b.classList.add("correct");
    else if(bi===pick) b.classList.add("wrong");
    else b.classList.add("dim");
  });
  /* 「わからない」はボタン自身を<b>えらんだ不正解</b>として赤く残す */
  const d=$("#dunnoBtn");
  if(d){ if(pick<0){ d.classList.add("wrong"); d.disabled=true; } }
  revealQuiz(correct, pick<0);
}
window.lexAnswer=(i)=>finishQuestion(i);
window.lexDontKnow=()=>finishQuestion(-1);
window.lexNext=()=>{
  clearAutoNext();
  /* ★ 2026-08-16c 設定がオンなら、次の問題へ進むときにメモを白紙に戻す。
     1問ごとに計算をやり直す使いかたのとき、毎回「全部消す」を押さずにすむ。 */
  if(memoAutoClear){
    try{
      memo.strokes = []; memo.cur = null; memo.text = "";
      const ta = document.getElementById("memoText"); if(ta) ta.value = "";
      memo.view = { s:1, ox:0, oy:0 };
      memoSave(); memoRedraw(); memoPaintZoom();
      const b = document.getElementById("memoOpenBtn"); if(b) b.classList.remove("has");
    }catch(e){}
  }
  if(quiz.idx<quiz.items.length-1){ quiz.idx++; saveActiveQuiz(); renderQuiz(); } else finishQuiz();
};
/* ★ 2026-08-17h 左上の✕が効かなかった真因は confirm()。
   ホーム画面から起動したアプリ表示では確認ダイアログが出ないことがあり、
   false 相当で<b>何もせずに終わる</b>＝押しても無反応に見える。
   （メモの「全部消す」・MagiTier の削除とまったく同じ原因。3度目なので確実に潰す）
   ★ 中断は<b>取り返しがつく</b>操作（途中経過は保存され、ホームから再開できる）。
     わざわざ確認する必要がないので、確認そのものをやめて即座に中断する。 */
window.lexQuit=()=>{
  clearAutoNext(); saveActiveQuiz(); lexBack();
  toast("中断しました。ホームから再開できます");
};
/* いま解いたぶんに登場したコンテンツ（重複なし）。ミックス・検索の習得反映に使う */
function touchedContents(){
  const ids={};
  (quiz.items||[]).forEach(it=>{ ids[it.kind==="quiz" ? "q_"+it.sid : "w_"+it.key]=1; });
  return Object.keys(ids).map(findContent).filter(Boolean);
}
/* まちがえた問題を「習得中」に戻す（記録は残すので未習得ではなく習得中になる）。
   戻した件数を返す。 */
function demoteMissed(){
  let n=0;
  (quiz.miss||[]).forEach(it=>{
    const r = it.kind==="quiz" ? ((P.quiz[it.sid]||{})[it.qi]) : ((P.words[it.key]||{})[it.word]);
    if(r && r.m){ r.m=false; r.c=0; n++; }
  });
  if(n) save();
  return n;
}
function finishQuiz(){
  clearAutoNext(); clearActiveQuiz();
  const n=quiz.items.length, ok=quiz.ok, pct=Math.round(ok/n*100);
  let demoted=0;
  if(!P.missionDone){ P.missionDone=true; save(); if(window.XEVA){ const r=window.XEVA.completeMission("magilex_play");
    if(r>0){ let tot=r;
      if(campaignActive()){ window.XEVA.add(r, "MagiLex ミッション 夏キャン2倍ボーナス"); tot=r*2; }   // 🌻 ミッションも2倍
      toast("🎉 ミッション達成！＋"+tot+" XEVA"+(campaignActive()?" 2倍!":""),true); } } }
  let rwd=0, rmsg="";
  if(quiz.src==="mix"){ P.mixHist=P.mixHist||[]; P.mixHist.unshift({date:todayStr(),ok,tot:n,pct}); if(P.mixHist.length>30) P.mixHist.length=30; save();
    /* ★ 2026-08-16 ミックスで正解したぶんも、そのコンテンツの習得中／完全習得に反映する。
       1問1問の記録（P.quiz / P.words）は recordAnswer がすでに書いているが、
       「完全習得になった」の登録＝ごほうびの受け取りは checkMastery が担当なので、
       ここで出題されたコンテンツぶんだけ呼んでおく。
       これが無いと、ミックスで最後の1問を埋めても、そのセットを開くまで
       完全習得にならず XEVA ももらえなかった。 */
    touchedContents().forEach(checkMastery);
    if(pct===100){ rwd=REWARD.mix100; rmsg="パーフェクト！"; } else if(pct>=90){ rwd=REWARD.mix90; rmsg="90%以上達成！"; }
    if(rwd>0) earn(rwd, rmsg, true);
  } else if(quiz.src==="search"){
    /* 検索した語句を含む問題での学習。報酬はないが、習得の反映はミックスと同じ。 */
    touchedContents().forEach(checkMastery);
  } else if(quiz.src==="confirm"){
    /* ★ 確認テスト: 全問正解のときだけ報酬。受け取れるのは1周につき1回。 */
    const c = findContent(quiz.cid) || curContent;
    if(c){
      if(pct===100 && !confirmDone(c)){
        P.confirmDone = P.confirmDone || {};
        P.confirmDone[c.id] = Date.now();
        save();
        rwd = confirmReward(c);
        rmsg = "「"+c.name+"」確認テスト 全問正解！" + (volumeMult(c.total)>1 ? `（${c.total}問・ボリューム${volumeMult(c.total)}倍！）` : "");
        earn(rwd, rmsg, true);
        /* ★ 2026-08-24 レベルは「このセットではじめて合格したとき」だけ上がる */
        lexGainExp(LEX_EXP_CONFIRM, "MagiLex 確認テスト合格："+c.name);
        /* ★★ 2026-08-26 確認テストの合格で +10KP（この周につき1回） */
        kpAdd(KP_CONFIRM, "「"+c.name+"」確認テスト 合格");
      } else if(pct===100){
        rmsg = "全問正解！（この周の報酬は受取済み）";
      } else {
        /* ★ 2026-08-16 不合格（1問でも落とした）なら、まちがえた問題だけ
           完全習得 → 習得中 に戻す。覚え直してからもう一度受ける形にする。
           ・完全習得の受取記録（qmastered/wmastered）は消さないので、
             もう一度そろえても XEVA が二重にもらえることはない。 */
        demoted = demoteMissed();
      }
      /* ★ 2026-08-24 スタミナは<b>合格するたび毎回</b> ＋50（上限を超えてたまる・ご指定）。
         XEVA の受取済みとは別あつかいなので、この if の外に置くこと。 */
      if(pct===100) lexGainStamina(c.name);
      checkMastery(c);
    }
  } else if(curContent){ checkMastery(curContent); }
  /* ★★ 2026-08-22 ビンゴの「全問正解を◯回」用。ここが1セットの終わりなので、
     ミックス・確認テスト・ふつうのクイズのどれで終わっても同じように数えられる。 */
  try{ if(pct===100 && n>0){ mlBump("perfect"); save(); } }catch(e){}
  /* ★ 解き終わるたびにビンゴのマスを開け直す（あとから見に行かなくても進む） */
  try{ mlBingoSync(); }catch(e){}
  const grade = pct===100?"💯":pct>=80?"🌟":pct>=50?"👍":"📖";
  /* ★★ 2026-08-19 まちがえた問題を、その場で<b>くわしい解説</b>へ渡せるようにした。
     ここが「解けなかった」と分かる唯一の場所なので、
     結果を見て終わりにせず、そのまま解きかたへ行けるのがいちばん効く。
     ・クイズの問題（kind==="quiz"）は #q=<セットid>:<問題番号> で1問ぶんの解説へ
     ・単語帳は問題番号が無いので、言葉を渡して近い解きかたを探す形にする
     ・数学・物理・化学γ以外にも解説は出るので、科目でしぼらない */
  const missed = (quiz.miss||[]).filter((it, i, a) =>
    a.findIndex(x => (x.kind===it.kind && x.sid===it.sid && x.qi===it.qi && x.word===it.word)) === i);
  const missHTML = missed.length ? `
      <div class="res-miss">
        <div class="rm-h">${uiIconSVG('exam')} まちがえた ${missed.length} 問</div>
        ${/* ★ 2026-08-20b 「押すと解説が開きます」と言い切っていたが、くわしい解説があるのは
             <b>最難関</b>の問題だけ。それ以外の回では押せる行が1つも無いのに案内だけ出ていて、
             「行ける表示があるのに行けない」状態に見えていた。実際に押せる行があるときだけ出す。 */""}
        ${missed.some(it => it.kind==="quiz" && it.sid!=null && it.qi!=null && isDeepTarget(it.sid))
          ? `<p class="rm-p"><b>「くわしい解説 →」</b>が付いた問題を押すと、その問題の<b>くわしい解説</b>（何を聞かれているか → 方針 → 手順を1行ずつ → 図 → 誤答の理由）が開きます。</p>`
          : `<p class="rm-p">見直してから、もう一度挑戦してみましょう。<b>くわしい解説</b>は<b>最難関</b>の問題セットに用意しています。</p>`}
        ${missed.map(it => {
          /* ★ 2026-08-20 くわしい解説があるのは最難関だけ。
             それ以外は、押しても何も出ない空ぶりのボタンにしないで、
             見返すだけの行にする。 */
          const deep = it.kind==="quiz" && it.sid!=null && it.qi!=null && isDeepTarget(it.sid);
          const go = deep
            ? `lexDeepQ('${esc(String(it.sid))}',${it.qi})`
            : (it.kind!=="quiz" ? `lexLearnThis('${esc(String(it.tag||"")+" "+String(it.stem||""))}')` : "");
          return `<button class="rm-row${go?"":" plain"}"${go?` onclick="${go}"`:" disabled"}>
            <span class="rm-q">${esc(String(it.stem||"").slice(0,60))}${String(it.stem||"").length>60?"…":""}</span>
            <span class="rm-a">正解：${esc(it.full||it.answer||"")}</span>
            ${go?'<span class="rm-go">くわしい解説 →</span>':""}
          </button>`;
        }).join("")}
        ${missed.filter(it=>it.kind==="quiz" && isDeepTarget(it.sid)).length>1
          ? `<button class="rm-all" onclick="lexDeepMissed()">くわしい解説がある問題をまとめて見る</button>` : ""}
      </div>` : "";
  /* まとめて見るとき用に、まちがえた問題を控えておく */
  try{ P.lastMissed = missed.map(it => ({ kind:it.kind, sid:it.sid, qi:it.qi, stem:it.stem, tag:it.tag })); save(); }catch(e){}
  /* ★★ 2026-08-28 確認テストは<b>ここではじめて正誤を出す</b>（ご指定）。
     1問ずつ「⭕／❌・正解・自分の答え」を並べる。まちがえた問題だけの一覧（missHTML）は
     そのあとに続けて出すので、解説へもそのまま行ける。 */
  const confHTML = (quiz.src==="confirm" && (quiz.log||[]).length) ? `
      <div class="res-all">
        <div class="rm-h">${uiIconSVG('exam')} 答え合わせ（全${quiz.log.length}問）</div>
        <p class="rm-p">確認テストのあいだは正誤を出していません。ここでまとめて確認できます。</p>
        ${quiz.log.map((L,i)=>`<div class="ra-row ${L.correct?"ok":"ng"}">
          <span class="ra-n">${i+1}</span>
          <span class="ra-b">
            <span class="ra-q">${esc(String(L.stem||"").slice(0,64))}${String(L.stem||"").length>64?"…":""}</span>
            <span class="ra-a">正解：${esc(String(L.ans||""))}${L.correct?"":"　／　あなた："+esc(String(L.mine||"（わからない）"))}</span>
          </span>
          <span class="ra-m">${L.correct?"⭕":"❌"}</span>
        </div>`).join("")}
      </div>` : "";
  $("#scr-quiz").innerHTML=`
    <div class="result">
      <div class="big">${grade}</div>
      <div class="score">${ok} / ${n} 正解（${pct}%）</div>
      ${confHTML}
      ${rwd>0?`<div class="rwd"><img src="../XEVA.png" alt="">＋${rw(rwd)} XEVA${campaignActive()?' <span style="font-size:.7em;color:#e0157a;font-weight:800">🌻夏キャン2倍!</span>':''}</div>`:""}
      ${demoted?`<div class="demote">📖 不合格だったので、まちがえた <b>${demoted}</b> 問を<b>習得中</b>にもどしました。<br>覚え直して完全習得にすると、また確認テストを受けられます。</div>`:""}
      ${missHTML}
      <div class="acts">
        <button onclick="lexBack()">もどる</button>
        <!-- 確認テストで習得中に戻した直後は、もう一度は受けられない（覚え直しが先）。
             行き先が無いボタンを置かず、セットの画面へ戻す。 -->
        <button class="pri" onclick="${
          quiz.src==="mix" ? "lexMix()"
          : quiz.src==="search" ? "lexSearchQuiz()"
          : quiz.src==="confirm" ? (demoted ? "lexBack()" : `lexConfirmTest('${quiz.cid}')`)
          : "lexStartQuiz()"
        }">${quiz.src==="confirm"&&demoted?"覚え直しに行く":"もう一度"}</button>
      </div>
    </div>`;
  renderTop();
}


// ============================================================
// 確認テスト（★ 2026-08-04 追加）
//   完全習得したコンテンツの「全問」を1回のテストで出す。
//   全問正解すると REWARD.confirm（＋ボリューム倍率）の XEVA。
//   ★ 1問でも落とすと報酬なし。何度でも受け直せる（受け取れるのは1周につき1回）。
//     ここを「◯%以上でOK」にすると完全習得のごほうびと区別がつかなくなるので、
//     あえて全問正解だけにしている。
// ============================================================
function confirmTestCardHTML(c){
  if(!canConfirm(c)){
    return `<div class="h-sec">確認テスト</div>
      <div class="set-card ct-lock">
        <div class="ct-t">🎓 確認テスト <span class="ct-x">未開放</span></div>
        <p class="ct-p">このコンテンツを<b>完全習得</b>すると受けられます。<b>全${c.total}問</b>に挑戦し、<b>全問正解</b>で <b>＋${rw(confirmReward(c)).toLocaleString()} XEVA</b>。</p>
      </div>`;
  }
  const got = confirmDone(c);
  return `<div class="h-sec">確認テスト</div>
    <div class="set-card ct-card ${got?"ct-got":""}">
      <div class="ct-t">🎓 確認テスト ${got?'<span class="ct-ok">受取済み</span>':`<span class="ct-go">＋${rw(confirmReward(c)).toLocaleString()} XEVA</span>`}</div>
      <p class="ct-p">
        <b>全${c.total}問</b>をまとめて出題します。<b>全問正解</b>で <b>＋${rw(confirmReward(c)).toLocaleString()} XEVA</b>
        ${volumeMult(c.total)>1?`（${c.total}問のボリュームボーナス <b>×${volumeMult(c.total)}</b>）`:""}${campaignActive()?"（夏キャン2倍込み）":""}。
        ${got?"この周では受け取り済みです（リセットするともう一度もらえます）。":""}
        <b>1問でもまちがえると報酬はなく、まちがえた問題は「習得中」にもどります</b>（覚え直して完全習得にすると、また受けられます）。
      </p>
      <button class="mode-btn primary" style="margin:0" onclick="lexConfirmTest('${c.id}')">
        <div class="mi">${uiIconSVG('exam')}</div><div class="bd"><b>確認テストを受ける</b><p>全${c.total}問・${got?"報酬は受取済み":"全問正解で XEVA"}</p></div><div class="go">→</div>
      </button>
    </div>`;
}
window.lexConfirmTest = (id) => {
  const c = findContent(id); if(!c || !canConfirm(c)) return;
  curContent = c;
  /* 全問を出す。buildQuizItems は「未習得優先で count 問」なので、
     count に総数を渡せば結果的に全問が入る（未習得＋習得ずみ＝総数）。
     ★ 2026-08-16 念のため実際の数も確かめる。1問でも欠けていたら
       出題そのものを止めるより、欠けたまま「全問正解」を名乗るほうが危ないので
       ここで気づけるようにしておく。 */
  const items = buildQuizItems(c, c.total, false);
  if(items.length !== c.total) console.warn("[MagiLex] 確認テストの出題数がそろっていません", c.id, items.length, "/", c.total);
  quiz = { items, idx:0, ok:0, src:"confirm", cid:c.id, miss:[] };
  saveActiveQuiz(); renderQuiz(); show({ name:"quiz", tab:"library" });
};

// ============================================================
// フラッシュカード
// ============================================================
let flash=null;
/* そのカードが「習得済み」か。
   習得の定義はクイズ・単語ともに masteryCounts と同じ m:true（2連続正解）に揃える。
   ※「覚えた」(P.fcKnown) はフラッシュカード上の自己申告なので別物。こちらは学習記録に基づく。 */
function cardMastered(cd){
  if(cd.kind==="word"){ const r=(P.words[cd.key]||{})[cd.word]; return !!(r&&r.m); }
  const r=(P.quiz[cd.sid]||{})[cd.qi]; return !!(r&&r.m);
}
function buildFlashCards(c){
  if(c.type==="word"){
    const eng=c.key.indexOf("eigo")===0;
    return Object.entries(c.subj.data).map(([w,m])=>({front:w,sub:c.subj.frontLabel||"単語",back:m,key:c.key,word:w,kind:"word",english:eng,ck:"w:"+w}));
  }
  return c.sec.questions.map((q,qi)=>({front:q.stem,sub:q.reading||(MODE_LABEL[c.sec.mode]||"問題"),back:q.answer+(q.extra?"\n\n"+q.extra:""),kind:"quiz",sid:c.sid,qi,ck:"q:"+qi}));
}
/* この課題の未習得カード枚数（ボタンに出す） */
function unlearnedCount(c){
  try{ return buildFlashCards(c).filter(cd=>!cardMastered(cd)).length; }catch(e){ return 0; }
}
/* unlearnedOnly=true で「まだ習得していないカードだけ」を出題する */
window.lexStartFlash=(unlearnedOnly)=>{
  const c=curContent; if(!c) return;
  let cards=buildFlashCards(c);
  let note="";
  if(unlearnedOnly){
    // 未習得のみ：習得済み（m:true）を除く。全部習得済みなら出題せずに知らせる。
    let remain=cards.filter(cd=>!cardMastered(cd));
    if(!remain.length){ toast("🎉 この課題はすべて習得済みです！"); return; }
    note="未習得の "+remain.length+" 枚を出題";
    // 通常フラッシュカードと同じく「覚えたカードを出さない」設定をここでも適用
    //（未習得かつ「覚えた✓」済みを除外。除外して0枚になる場合は未習得全カードにフォールバック）
    if(flashOpt.hideKnown){
      const known=(P.fcKnown&&P.fcKnown[c.id])||{};
      const rest=remain.filter(cd=>!known[cd.ck]);
      const hidden=remain.length-rest.length;
      if(rest.length&&hidden>0){ remain=rest; note="未習得のうち覚えた "+hidden+" 枚を除いて "+remain.length+" 枚を出題"; }
    }
    cards=remain;
  } else if(flashOpt.hideKnown){
    // 「覚えたカードを出さない」設定：既知カードを除いて出題（全部既知なら全カードにフォールバック）
    const known=(P.fcKnown&&P.fcKnown[c.id])||{};
    const remain=cards.filter(cd=>!known[cd.ck]);
    const hidden=cards.length-remain.length;
    if(remain.length&&hidden>0){ cards=remain; note="覚えた "+hidden+" 枚を除いて "+cards.length+" 枚を出題"; }
  }
  cards=shuffle(cards);
  if(!cards.length){ toast("カードがありません"); return; }
  flash={cards, idx:0, cid:c.id, unlearned:!!unlearnedOnly};
  renderFlash(); show({name:"flash",tab:"library"});
  if(note) toast(note);
};
function renderFlash(){
  const c=flash.cards[flash.idx], n=flash.cards.length;
  $("#scr-flash").innerHTML=`
    <div class="quiz-head"><button class="back-btn" onclick="lexBack()">✕</button><span>🃏 フラッシュカード</span><span class="qx">${flash.idx+1} / ${n}</span></div>
    <div class="fc-wrap"><div class="fc" id="fc" onclick="lexFlip()">
      <div class="fc-face fc-front"><div class="fc-label">${esc(c.sub)}</div><div class="fc-word">${esc(c.front)}${c.english?spkBtn(c.front):""}</div><div class="fc-hint">タップで答えを表示</div></div>
      <div class="fc-face fc-back"><div class="fc-label">こたえ</div><div class="fc-mean">${esc(c.back).replace(/\n/g,"<br>")}</div></div>
    </div></div>
    <div class="fc-actions">
      <button class="fc-again" onclick="lexFlashNext(false)">もう一度</button>
      <button class="fc-known" onclick="lexFlashNext(true)">覚えた ✓</button>
    </div>`;
  if(c.english) autoSpeakIfOn(c.front);
}
window.lexFlip=()=>{ const fc=$("#fc"); if(fc) fc.classList.toggle("flip"); };
window.lexFlashNext=(known)=>{
  const c=flash.cards[flash.idx];
  if(known){
    // フラッシュカードの「覚えた」記録（次から出題対象外にできる。単語・クイズ両方）
    P.fcKnown=P.fcKnown||{}; (P.fcKnown[flash.cid]=P.fcKnown[flash.cid]||{})[c.ck]=1;
    if(c.kind==="word"){ P.words[c.key]=P.words[c.key]||{}; P.words[c.key][c.word]={c:2,m:true}; if(curContent) checkMastery(curContent); }
    save();
  }
  if(flash.idx<flash.cards.length-1){ flash.idx++; renderFlash(); }
  else { toast("フラッシュカード完了！",true); renderTop(); lexBack(); }
};

// ============================================================
// 一覧（単語一覧 / 問題と答えの一覧）
// ============================================================
window.lexShowList=()=>{
  const c=curContent; if(!c) return;
  let rows;
  if(c.type==="word"){ const m=P.words[c.key]||{};
    rows=Object.entries(c.subj.data).map(([w,mean])=>`<div class="word-row"><div class="w">${esc(w)}</div><div class="m">${esc(mean)}</div>${m[w]&&m[w].m?'<div class="star">✓</div>':''}</div>`).join("");
  } else { const m=P.quiz[c.sid]||{};
    /* ★★ 2026-08-18b 1問ずつ「くわしい解説」へ飛べるようにした。
       ここが「問題と答えの一覧」＝答えを見返す場所なので、
       「答えは分かったが解けない」と気づくのもここになる。 */
    rows=c.sec.questions.map((q,i)=>`<div class="qa-row"><div class="qa-q">${esc(q.stem)}${q.reading?` <span class="qa-r">${esc(q.reading)}</span>`:""} ${m[i]&&m[i].m?'<span class="star">✓</span>':''}</div><div class="qa-a">${esc(q.answer)}</div>${q.extra?`<div class="qa-ex">${esc(q.extra)}</div>`:""}<div class="qa-acts">${deepBtnHTML(c.sid, i)}</div></div>`).join("");
  }
  const deepHead = (c.type!=="word" && isDeepTarget(c.sid))
    ? `<div class="qa-note">${uiIconSVG('exam')} 各問題の「<b>くわしい解説</b>」では、
         <b>何を聞かれているか → 方針 → 使う公式 → 手順を1行ずつ → 図 → 確かめかた → ほかの選択肢がなぜ違うか</b>
         まで見られます。分からない言葉は、その場でやさしい例題までさかのぼれます。</div>`
    : "";
  $("#scr-wordlist").innerHTML=`
    <div class="back-row"><button class="back-btn" onclick="lexBack()">←</button><h2>${c.type==="word"?"📋":"📖"} ${esc(c.name)}</h2></div>
    ${deepHead}
    <div class="list">${rows}</div>`;
  show({name:"wordlist",tab:"library"});
};

// ============================================================
// 統計
// ============================================================
function renderStats(){
  const conts=allContents();
  const masteredSecs=conts.filter(isMastered).length;
  const totalQ=conts.reduce((s,c)=>s+c.total,0);
  const agg=conts.reduce((a,c)=>{ const mc=masteryCounts(c); a.m+=mc.mastered; a.l+=mc.learning; return a; },{m:0,l:0});
  const acc=P.totals.answered?Math.round(P.totals.correct/P.totals.answered*100):0;
  $("#scr-stats").innerHTML=`
    <div class="back-row"><h2>📊 学習データ</h2></div>
    <div class="stat-grid">
      <div class="stat"><div class="v">${masteredSecs}</div><div class="l">完全習得コンテンツ / ${conts.length}</div></div>
      <div class="stat"><div class="v">${agg.m}</div><div class="l">完全習得した問題 / ${totalQ}</div></div>
      <div class="stat"><div class="v">${agg.l}</div><div class="l">習得中の問題</div></div>
      <div class="stat"><div class="v">${acc}%</div><div class="l">通算 正答率</div></div>
      <div class="stat"><div class="v">${P.streak||0}</div><div class="l">連続学習日数</div></div>
      <div class="stat"><div class="v">${P.totals.answered}</div><div class="l">解答した問題数</div></div>
    </div>
    ${renderSubjectBreakdown(conts)}
    ${renderCalendar()}
    ${(P.mixHist&&P.mixHist.length)?`<div class="h-sec">最近のミックス結果</div>
      <div class="list">${P.mixHist.slice(0,8).map(h=>`<div class="word-row"><div class="w">${h.date}</div><div class="m">${h.ok}/${h.tot} 正解</div><div class="star">${h.pct}%</div></div>`).join("")}</div>`:""}`;
  renderTop();
}

/* ★ 2026-08-16b 科目ごとの内訳。
   「全体で何問おぼえたか」だけでは、どの科目が手つかずなのかが分からない。
   科目ごとに 完全習得／習得中／未習得 を帯で出して、次にやる範囲を選べるようにする。 */
function renderSubjectBreakdown(conts){
  const bySubj = {};
  conts.forEach(c=>{
    const s = subjectOf(c);
    const b = bySubj[s] = bySubj[s] || { m:0, l:0, n:0, t:0, sets:0, done:0 };
    const mc = masteryCounts(c);
    b.m += mc.mastered; b.l += mc.learning; b.n += mc.untouched; b.t += mc.total;
    b.sets++; if(mc.total>0 && mc.mastered>=mc.total) b.done++;
  });
  const order = SUBJECT_ORDER.filter(s=>bySubj[s]).concat(Object.keys(bySubj).filter(s=>SUBJECT_ORDER.indexOf(s)<0));
  if(!order.length) return "";
  return `<div class="h-sec">科目ごとの進みぐあい</div>
    <div class="list">${order.map(s=>{
      const b = bySubj[s], pct = b.t? Math.round(b.m/b.t*100) : 0;
      return `<div class="sbj-row">
        <div class="sbj-head">${subjIcon(s,"sm")}<b>${esc(s)}</b>
          <span class="sbj-pct">${pct}%</span></div>
        <div class="meter">
          <div class="seg-done" style="width:${b.t?b.m/b.t*100:0}%"></div>
          <div class="seg-learn" style="width:${b.t?b.l/b.t*100:0}%"></div>
        </div>
        <div class="sbj-sub">完全習得 <b>${b.m}</b> ／ 習得中 <b>${b.l}</b> ／ 未習得 <b>${b.n}</b>
          ・セット <b>${b.done}/${b.sets}</b> 制覇</div>
      </div>`;
    }).join("")}</div>`;
}

/* ★ 2026-08-16b 学習カレンダー。
   その月の全日を並べ、解いた数に応じて色の濃さを変える（濃いほどたくさん解いた日）。
   日を押すと、その日の内訳（解答数・正解数・正答率・完全習得）を下に出す。
   ★ 日ごとの記録は 2026-08-16 から貯め始めたので、それより前の日は空になる。 */
let calYM = null, calPick = null;
function calKey(y,m,d){ return y+"-"+String(m+1).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
function renderCalendar(){
  const days = P.days || {};
  const now = new Date();
  if(!calYM) calYM = { y: now.getFullYear(), m: now.getMonth() };
  const { y, m } = calYM;
  const first = new Date(y, m, 1), last = new Date(y, m+1, 0);
  const lead = first.getDay(), n = last.getDate();
  /* 色の濃さは「その月でいちばん解いた日」を基準にそろえる */
  let mx = 1;
  for(let d=1; d<=n; d++){ const r = days[calKey(y,m,d)]; if(r && r.a>mx) mx = r.a; }
  const today = todayStr();
  const cells = [];
  for(let i=0;i<lead;i++) cells.push('<div class="cal-c blank"></div>');
  for(let d=1; d<=n; d++){
    const k = calKey(y,m,d), r = days[k];
    const lv = !r || !r.a ? 0 : Math.min(4, Math.ceil(r.a / mx * 4));
    cells.push(`<button class="cal-c lv${lv}${k===today?" today":""}${k===calPick?" pick":""}"
      onclick="lexCalPick('${k}')" title="${k}${r?`：${r.a}問`:"：記録なし"}">${d}</button>`);
  }
  /* その月の合計 */
  let ma=0, mc=0, ms=0, mdays=0;
  for(let d=1; d<=n; d++){ const r=days[calKey(y,m,d)]; if(r&&r.a){ ma+=r.a; mc+=r.c; ms+=r.s||0; mdays++; } }
  const pick = calPick ? days[calPick] : null;
  return `<div class="h-sec">学習カレンダー</div>
    <div class="cal">
      <div class="cal-top">
        <button class="cal-nav" onclick="lexCalMove(-1)" aria-label="前の月">‹</button>
        <b>${y}年 ${m+1}月</b>
        <button class="cal-nav" onclick="lexCalMove(1)" aria-label="次の月">›</button>
      </div>
      <div class="cal-wd">${["日","月","火","水","木","金","土"].map(w=>`<span>${w}</span>`).join("")}</div>
      <div class="cal-grid">${cells.join("")}</div>
      <div class="cal-sum">この月：<b>${mdays}</b>日 学習 ・ <b>${ma}</b>問 ・ 正答率 <b>${ma?Math.round(mc/ma*100):0}%</b>${ms?` ・ 完全習得 <b>${ms}</b>`:""}</div>
      ${calPick ? `<div class="cal-day">
        <b>${calPick}</b>
        ${pick && pick.a ? `<div class="cal-kv"><span>解いた問題</span><b>${pick.a}</b></div>
          <div class="cal-kv"><span>正解</span><b>${pick.c}</b></div>
          <div class="cal-kv"><span>正答率</span><b>${Math.round(pick.c/pick.a*100)}%</b></div>
          ${pick.s?`<div class="cal-kv"><span>完全習得</span><b>${pick.s}</b></div>`:""}`
          : `<div class="cal-none">この日は学習の記録がありません</div>`}
      </div>` : `<div class="cal-hint">日づけを押すと、その日の内訳が出ます。<br>
        <small>※ 日ごとの記録は 2026-08-16 から貯め始めています。それより前は空になります。</small></div>`}
    </div>`;
}
window.lexCalMove = (d)=>{
  const t = new Date(calYM.y, calYM.m + d, 1);
  calYM = { y: t.getFullYear(), m: t.getMonth() };
  calPick = null;
  renderStats();
};
window.lexCalPick = (k)=>{ calPick = (calPick===k) ? null : k; renderStats(); };

// ============================================================
// 設定
// ============================================================
function renderSettings(){
  const acc=getAcc();
  $("#scr-settings").innerHTML=`
    <div class="back-row"><h2>⚙️ 設定</h2></div>
    <div class="set-card">
      <h4>👤 アカウント</h4>
      <div class="set-row"><img class="u-av js-av" src="" alt="" style="cursor:default"><div class="l"><b>${esc(acc.name||"ユーザー")}</b></div></div>
      <div class="set-row"><div class="l">所持 XEVA</div><div class="v js-coin" style="color:var(--gold-d)">${bal().toLocaleString()}</div></div>
      <div class="hint" style="font-size:.72rem;color:var(--ink2);line-height:1.6;margin-top:6px">名前・アイコンは XEVARION アカウントと同期しています。変更は XEVARION ポータルから。</div>
    </div>
    <div class="set-card">
      <h4>🔊 発音（英単語の読み上げ）</h4>
      <div class="hint" style="font-size:.72rem;color:var(--ink2);line-height:1.6;margin-bottom:8px">${ttsSupported?"英単語を表示したときに自動で発音します。各単語の🔊でも個別に聞けます。":"お使いの環境では音声読み上げに対応していません。"}</div>
      <div class="audio-seg">
        <button class="aseg ${audioMode==='on'?'on':''}" onclick="lexSetAudio('on')" ${ttsSupported?"":"disabled"}>🔊 発音モード</button>
        <button class="aseg ${audioMode==='off'||!ttsSupported?'on':''}" onclick="lexSetAudio('off')">🔇 消音モード</button>
      </div>
    </div>
    <div class="set-card">
      <h4>📝 メモ帳</h4>
      <div class="hint" style="font-size:.72rem;color:var(--ink2);line-height:1.6;margin-bottom:8px">問題画面の右下「メモ」で開きます。手書きと文字の両方が使えて、拡大・移動もできます。<br>次の問題に進んだときに、書いた内容を自動で消すかどうかを選べます。</div>
      <div class="audio-seg">
        <button class="aseg ${memoAutoClear?'on':''}" onclick="lexSetMemoAutoClear(true)">🧹 次の問題で消す</button>
        <button class="aseg ${!memoAutoClear?'on':''}" onclick="lexSetMemoAutoClear(false)">📌 メモを残す</button>
      </div>
    </div>
    <div class="set-card">
      <h4>⏱️ 自動で次の問題へ</h4>
      <div class="hint" style="font-size:.72rem;color:var(--ink2);line-height:1.6;margin-bottom:8px">正解・不正解と解説を表示したあと、自動で次の問題へ進みます。オフにすると「次の問題」ボタンを自分で押して進みます。</div>
      <div class="audio-seg">
        <button class="aseg ${autoNext.on?'on':''}" onclick="lexSetAutoNext('on')">▶ 自動で進む</button>
        <button class="aseg ${!autoNext.on?'on':''}" onclick="lexSetAutoNext('off')">✋ 手動で進む</button>
      </div>
      <div class="an-times" style="${autoNext.on?'':'display:none'}">
        <div class="an-row">
          <span class="an-lbl">⭕ 正解のとき</span>
          <div class="an-step">
            <button onclick="lexAutoNextTime('correct',-1)" ${autoNext.correct<=AUTONEXT_MIN?'disabled':''}>−</button>
            <b>${autoNext.correct} 秒</b>
            <button onclick="lexAutoNextTime('correct',1)" ${autoNext.correct>=AUTONEXT_MAX?'disabled':''}>＋</button>
          </div>
        </div>
        <div class="an-row">
          <span class="an-lbl">❌ 不正解のとき</span>
          <div class="an-step">
            <button onclick="lexAutoNextTime('wrong',-1)" ${autoNext.wrong<=AUTONEXT_MIN?'disabled':''}>−</button>
            <b>${autoNext.wrong} 秒</b>
            <button onclick="lexAutoNextTime('wrong',1)" ${autoNext.wrong>=AUTONEXT_MAX?'disabled':''}>＋</button>
          </div>
        </div>
      </div>
    </div>
    <div class="set-card">
      <h4>🃏 フラッシュカード</h4>
      <div class="hint" style="font-size:.72rem;color:var(--ink2);line-height:1.6;margin-bottom:8px">「覚えた ✓」にしたカードを、次からの出題で表示しないようにできます。通常のフラッシュカードにも「未習得のみ」にも効きます。繰り返し学習で、まだ覚えていないカードだけに集中できます。（そのコンテンツを全部覚えた場合は、全カードを出題します）</div>
      <div class="audio-seg">
        <button class="aseg ${flashOpt.hideKnown?'on':''}" onclick="lexSetFlashHide('on')">✅ 覚えたカードは出さない</button>
        <button class="aseg ${!flashOpt.hideKnown?'on':''}" onclick="lexSetFlashHide('off')">🔁 すべて出す</button>
      </div>
      <div style="margin-top:8px">
        <div style="font-size:.78rem;font-weight:700;color:var(--ink2);white-space:nowrap;margin-bottom:6px">現在覚えたカード：<b style="color:var(--indigo)">${fcKnownCount()}</b> 枚</div>
        <button class="setbtn" style="width:100%" onclick="lexResetFlashKnown()">わからないに戻す</button>
      </div>
    </div>
    <div class="set-card">
      <h4>✨ XEVAの入手方法</h4>
      <button class="setbtn" onclick="showLexHowto(true)">入手方法ガイドをもう一度見る</button>
    </div>
    <div class="set-card">
      <h4>💾 データ</h4>
      <div class="set-row"><div class="l">保存先</div><div class="v">この端末（本体）に保存</div></div>
      <div class="set-row"><div class="l danger">学習進捗をリセット</div><button class="setbtn danger-btn" onclick="lexReset()">リセット</button></div>
    </div>
    <div class="set-card">
      <a href="../index.html" style="text-decoration:none;color:var(--indigo);font-weight:700;font-size:.86rem">← XEVARION ポータルへ戻る</a>
    </div>`;
  renderTop();
}
window.lexReset=async ()=>{
  if(await askYesNo("学習進捗をリセットします", "これまでの学習の記録をすべて消します。\nもとに戻せません。（XEVA残高はそのまま残ります）", "リセットする")){
    P=freshProgress(); save(); toast("進捗をリセットしました"); render("settings");
  }
};

// ============================================================
// XEVA入手方法ガイド（最新版・アニメーション付きで刷新）
//   ・登録／デイリー／ミッション／完全習得／ミックスの最新報酬を掲載
//   ・🌻夏キャンペーン中は「×2後の金額」をアニメーションで表示
// ============================================================
function howtoSlides(){
  const camp=campaignActive();
  const rewHTML=(base)=> camp
    ? `<span class="lh-old">+${base}</span> <span class="lh-arrow">➜</span> <b class="lh-new">+${base*CAMPAIGN.mult} XEVA</b> <span class="lh-x2bdg">🌻×2</span>`
    : `+${base} XEVA`;
  const slides=[
    { ic:"📝", color:"#6b5bd2", title:"登録ボーナス",       sub:"MagiLex に初めて入ると",              rew:rewHTML(REWARD.reg) },
    { ic:"🎖️", color:"#2e8bff", title:"ミッション達成",     sub:"はじめてクイズに挑戦すると（1回だけ）", rew:rewHTML(150) },
    { ic:"🏆", color:"#c79a2e", title:"セクション完全習得", sub:"全問マスターで一気に",                rew:rewHTML(REWARD.master) },
    { ic:"🎓", color:"#2e8fc7", title:"確認テスト",           sub:"完全習得した全問テストに 全問正解で", rew:rewHTML(REWARD.confirm) },
    { ic:"📚", color:"#8a5bd2", title:"ボリュームボーナス", sub:`完全習得したとき 50問以上は ×2 ／ 100問以上は`, rew:'<b class="lh-new">×3 !</b>' },
    { ic:"💯", color:"#d96a93", title:"ミックス問題",       sub:`90%以上 ${camp?"+"+REWARD.mix90*CAMPAIGN.mult:"+"+REWARD.mix90} ／ 100%なら`, rew:rewHTML(REWARD.mix100) },
  ];
  /* ★★ 2026-08-26 Knowledge Point（KP）。XEVA とは別枠のポイントなので、
     ×2キャンペーンの前に置いて「これは XEVA ではない」ことを分かるようにする。 */
  slides.push({ ic:"💠", color:"#3c4bb0", title:"Knowledge Point（KP）",
    sub:`完全習得 +${KP_MASTER} ／ 確認テスト合格 +${KP_CONFIRM}。${KP_CHAR_COST}KPでキャラ・${KP_TICKET_COST}KPで🎫`,
    rew:'<b class="lh-new">KP交換所へ</b>' });
  if(camp) slides.push({ ic:"🌻", color:"#ff8a3d", title:"夏の学習キャンペーン", sub:`期間中（〜${CAMPAIGN.to.slice(5).replace("-","/")}）は上の報酬が`, rew:'<b class="lh-new">すべて ×2 !</b>' });
  slides.push({ ic:"🎰", color:"#6b5bd2", title:"貯めて使おう", sub:"集めた XEVA は XEVARION の", rew:"ガチャで！" });
  return slides;
}
let HOWTO_SLIDES=[];
let howtoIdx=0;
function buildHowto(){
  if($("#lexHowto")) return;
  const ov=document.createElement("div"); ov.id="lexHowto"; ov.className="lh-ov";
  ov.innerHTML=`<div class="lh-card">
    <div class="lh-badge">✨ XEVA の入手方法${campaignActive()?'<span class="lh-badge-x2">🌻2倍中</span>':""}</div>
    <div class="lh-stage" id="lhStage"></div>
    <div class="lh-dots" id="lhDots"></div>
    <div class="lh-foot"><button class="lh-skip" onclick="closeLexHowto()">スキップ</button><button class="lh-next" id="lhNext" onclick="lexHowtoNext()">次へ →</button></div>
  </div>`;
  document.body.appendChild(ov);
}
/* コインが舞い上がるアニメーション（スライド切り替えごと） */
function lhCoinBurst(stage){
  for(let i=0;i<6;i++){
    const c=document.createElement("img");
    c.src="../XEVA.png"; c.className="lh-coin"; c.alt="";
    c.style.left=(12+Math.random()*76)+"%";
    c.style.animationDelay=(i*0.09)+"s";
    c.style.width=(16+Math.random()*12)+"px";
    stage.appendChild(c);
    setTimeout(()=>c.remove(),1500);
  }
}
function renderHowtoSlide(){
  const s=HOWTO_SLIDES[howtoIdx];
  const stage=$("#lhStage");
  stage.innerHTML=`<div class="lh-slide" style="--c:${s.color}">
    <div class="lh-ic">${s.ic}</div>
    <div class="lh-title">${s.title}</div>
    <div class="lh-sub">${s.sub}</div>
    <div class="lh-rew"><img src="../XEVA.png" alt="">${s.rew}</div>
  </div>`;
  // 再アニメーション＋コイン演出
  const sl=stage.querySelector(".lh-slide"); void sl.offsetWidth; sl.classList.add("in");
  lhCoinBurst(stage);
  $("#lhDots").innerHTML=HOWTO_SLIDES.map((_,i)=>`<span class="lh-dot${i===howtoIdx?' on':''}" style="${i===howtoIdx?'background:'+s.color:''}"></span>`).join("");
  $("#lhNext").textContent = howtoIdx<HOWTO_SLIDES.length-1 ? "次へ →" : "はじめる ✨";
}
window.showLexHowto=(force)=>{ if(!force && localStorage.getItem(HOWTO_KEY)==="1") return; HOWTO_SLIDES=howtoSlides(); buildHowto(); howtoIdx=0; $("#lexHowto").classList.add("open"); renderHowtoSlide(); };
window.lexHowtoNext=()=>{ if(howtoIdx<HOWTO_SLIDES.length-1){ howtoIdx++; renderHowtoSlide(); } else closeLexHowto(); };
window.closeLexHowto=()=>{ localStorage.setItem(HOWTO_KEY,"1"); const ov=$("#lexHowto"); if(ov) ov.classList.remove("open"); };

// ============================================================
// デイリー/ストリーク/登録
// ============================================================
function markStudied(){
  const t=todayStr();
  if(P.lastStudy===t) return;
  const y=new Date(Date.now()-86400000).toISOString().slice(0,10);
  P.streak = (P.lastStudy===y)? (P.streak||0)+1 : 1;
  P.lastStudy=t;
}
/* ★ 2026-08-16b 1日ぶんの学習記録。
   これまでは「最後に解いた日」と「連続日数」しか持っていなかったので、
   カレンダーでさかのぼって見ることができなかった。
   ここから先の日ぶんが貯まっていく（過去にさかのぼって作ることはできない）。
     a … 解いた問題数 ／ c … 正解数 ／ s … 完全習得にした数 ／ x … 稼いだXEVA */
function dayLog(){ P.days = P.days || {}; const t = todayStr(); return (P.days[t] = P.days[t] || { a:0, c:0, s:0, x:0 }); }
/* ★ 2026-08-17e デイリーボーナスは一度廃止した。
   「ログインしただけで XEVA がもらえる」ぶんを無くし、
   学習そのもの（完全習得・ミックス・確認テスト）で受け取る形に一本化していた。
   ★★ 2026-08-22 <b>連続ログインボーナスとして戻した</b>（ご指定）。
     ただの日替わりではなく「続けるほど得をする」形にしてあり、
     本体は下の「連続ログインボーナス と ビンゴミッション」の節にある
     （grantDaily もそちらで定義しているので、ここには置かない）。
   ★ P.daily と P.streak の値は消さずに残す。
     ストリーク（連続学習日数）の表示には引き続き使っているため。 */
function firstRegister(){ if(P.registered) return; P.registered=true; save(); earn(REWARD.reg, "MagiLex 登録ボーナス！", true); }

// ============================================================
/* ════════════════════════════════════════════════════════════════
   メモ帳（★ 2026-08-16）
   ════════════════════════════════════════════════════════════════
   物理・数学・化学は途中の計算が長い。頭の中だけで解こうとすると、
   本当は分かっているのに計算の取り違えで落とすことになる。
   そこで、問題を見たまま書けるメモを用意した。

   決めごと
     ・下から出るシートにして、上に問題文が残るようにする（隠してしまわない）。
     ・手書きと文字の両方。式は手で書き、答えの整理は文字で、と使い分けられる。
     ・手書きは「線の並び」で持つ（画像で持たない）。
       画面を回しても、大きさが変わっても、同じ形で描き直せるため。
       座標は 0〜1 に正規化して入れる。
     ・内容は端末に保存する。問題を進めてもホームに戻っても消えない。
       消えると「さっきの計算」を見返せず、メモの意味がなくなる。
     ・クイズを終えても自動では消さない（消すのは本人の操作だけ）。 */
const MEMO_KEY = "magilex_memo_v1";
/* ★ 2026-08-18 メモを「広げた（全画面）」状態を覚えておくキー */
const MEMO_FULL_KEY = "magilex_memo_full_v1";
const MEMO_COLORS = ["#2b2a33", "#c0392b", "#2f6fd0"];
/* view … いま紙のどこを見ているか。s=拡大率、ox/oy=ずらし量（どれも0〜1の正規化座標）。
   線そのものは紙の座標で持ち、<b>見え方だけ</b>をこの view で変える。
   こうすると拡大しても線がぼやけず、書いた位置もずれない。 */
let memo = { open:false, mode:"draw", strokes:[], text:"", color:MEMO_COLORS[0], erasing:false, cur:null,
             view:{ s:1, ox:0, oy:0 }, pan:false };
const MEMO_AUTOCLEAR_KEY = "magilex_memo_autoclear_v1";
/* 次の問題に進んだらメモを消すか（初期はオフ＝残す） */
let memoAutoClear = (function(){ try{ return localStorage.getItem(MEMO_AUTOCLEAR_KEY) === "1"; }catch(e){ return false; } })();
window.lexSetMemoAutoClear = (on)=>{
  memoAutoClear = !!on;
  try{ localStorage.setItem(MEMO_AUTOCLEAR_KEY, memoAutoClear ? "1" : "0"); }catch(e){}
  renderSettings();
  toast(memoAutoClear ? "次の問題でメモを消します" : "メモを残します");
};

function memoLoad(){
  try{
    const r = JSON.parse(localStorage.getItem(MEMO_KEY) || "null");
    if(r && typeof r === "object"){
      memo.strokes = Array.isArray(r.strokes) ? r.strokes : [];
      memo.text = typeof r.text === "string" ? r.text : "";
    }
  }catch(e){}
}
function memoSave(){
  try{ localStorage.setItem(MEMO_KEY, JSON.stringify({ strokes:memo.strokes, text:memo.text })); }catch(e){}
}
/* メモに何か書いてあるか（ボタンに印を出すのに使う） */
function memoHasContent(){ return (memo.strokes && memo.strokes.length>0) || (memo.text||"").trim().length>0; }

/* シートの本体は1回だけ作って使い回す。
   毎回作り直すと、書いている途中に開き直したときキャンバスが白紙に戻る。 */
function memoEnsureDom(){
  if(document.getElementById("memoSheet")) return;
  memoLoad();
  const el = document.createElement("div");
  el.id = "memoSheet";
  el.className = "memo-sheet";
  el.innerHTML = `
    <div class="memo-grip" id="memoGrip"></div>
    <div class="memo-bar">
      <div class="memo-tabs">
        <button class="memo-tab on" id="memoTabDraw" onclick="lexMemoMode('draw')">${uiIconSVG('pen')} 手書き</button>
        <button class="memo-tab" id="memoTabText" onclick="lexMemoMode('text')">${uiIconSVG('keyboard')} 文字</button>
        <button class="memo-tab" id="memoTabCard" onclick="lexMemoMode('card')">${uiIconSVG('flash')} カード</button>
      </div>
      <!-- ★ 2026-08-18 iPhone では上の道具が場所を取って紙が小さいので、全画面にできるようにした -->
      <button class="memo-full" id="memoFullBtn" onclick="lexMemoFull()" aria-label="広げる／もどす" title="広げる／もどす">⤢</button>
      <button class="memo-x" onclick="lexMemoClose()" aria-label="メモを閉じる">✕</button>
    </div>
    <div class="memo-tools" id="memoTools">
      <span class="memo-draw-only">
        ${MEMO_COLORS.map((c,i)=>`<button class="memo-col${i===0?" on":""}" data-c="${c}" style="--mc:${c}" onclick="lexMemoColor('${c}')" aria-label="色"></button>`).join("")}
        <button class="memo-btn" id="memoEraser" onclick="lexMemoEraser()">消しゴム</button>
        <button class="memo-btn" onclick="lexMemoUndo()">一つ戻す</button>
        <span class="memo-zoom">
          <button class="memo-btn" onclick="lexMemoZoom(1/1.3)" aria-label="縮小">−</button>
          <b id="memoZoomV">100%</b>
          <button class="memo-btn" onclick="lexMemoZoom(1.3)" aria-label="拡大">＋</button>
          <button class="memo-btn" id="memoPan" onclick="lexMemoPan()">${uiIconSVG('hand')} 移動</button>
          <button class="memo-btn" onclick="lexMemoZoomReset()">全体</button>
        </span>
      </span>
      <button class="memo-btn danger memo-clear" onclick="lexMemoClear()">全部消す</button>
      <!-- カードモードのときだけ出る道具 -->
      <button class="memo-btn memo-card-only" onclick="lexCardNew()">＋ 新しいカード</button>
      <button class="memo-btn memo-card-only" onclick="lexCardFromQuiz()">いまの問題から</button>
      <button class="memo-btn memo-card-only" onclick="lexCardFromMemo()">このメモから</button>
      <button class="memo-btn memo-card-only" onclick="lexCardShuffle()">シャッフル</button>
      <button class="memo-btn memo-card-only" id="mcHideBtn" onclick="lexCardToggleHide()">覚えたを隠す</button>
    </div>
    <div class="memo-body">
      <canvas id="memoCanvas"></canvas>
      <textarea id="memoText" placeholder="ここに計算や考えたことを書けます。&#10;（内容はこの端末に保存され、次に開いたときも残ります）"></textarea>
      <div class="memo-cards" id="memoCards"></div>
    </div>`;
  document.body.appendChild(el);

  const ta = document.getElementById("memoText");
  ta.value = memo.text;
  /* ★ 2026-08-17 input だけだと、日本語入力の変換中は memo.text が古いままになる。
     変換の確定（compositionend）と、はなれたとき（blur・change）でも取りこむ。 */
  const syncText = ()=>{ memo.text = ta.value; memoSave(); };
  ["input", "change", "blur", "compositionend"].forEach(ev=>ta.addEventListener(ev, syncText));

  memoBindCanvas();
  /* ★ 2026-08-18 フラッシュカードを読みこむ／前に「広げる」を使っていたら戻す */
  cardsLoad();
  try{
    if(localStorage.getItem(MEMO_FULL_KEY) === "1"){
      el.classList.add("full");
      const fb = document.getElementById("memoFullBtn");
      if(fb){ fb.classList.add("on"); fb.textContent = "⤡"; }
    }
  }catch(e){}
  /* 画面の幅が変わったら描き直す（線は正規化した座標で持っているので形は崩れない） */
  window.addEventListener("resize", ()=>{ if(memo.open) memoFit(); });
}

/* キャンバスの実ピクセル数を、表示サイズ×画面の細かさに合わせる。
   これをやらないと線がぼやける。 */
function memoFit(){
  const cv = document.getElementById("memoCanvas"); if(!cv) return;
  const r = cv.getBoundingClientRect();
  if(r.width < 2 || r.height < 2) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  memoRedraw();
}
/* ★ 消しゴムは destination-out（下にあるものを実際に取り除く）で描く。
   これを方眼の上で直接やると方眼まで消えてしまうので、
   線は別のキャンバス（memo._off）にまとめて描き、
   本番のキャンバスには「方眼 → できあがった線」の順に重ねる。 */
function memoRedraw(){
  const cv = document.getElementById("memoCanvas"); if(!cv || !cv.width) return;
  const g = cv.getContext("2d");

  if(!memo._off) memo._off = document.createElement("canvas");
  const off = memo._off;
  if(off.width !== cv.width || off.height !== cv.height){ off.width = cv.width; off.height = cv.height; }
  const og = off.getContext("2d");
  og.clearRect(0,0,off.width,off.height);
  memo.strokes.forEach(s=>memoDrawStroke(og, off, s));
  if(memo.cur) memoDrawStroke(og, off, memo.cur);

  g.clearRect(0,0,cv.width,cv.height);
  /* ★ 2026-08-16c 方眼の間かくを<b>きっちり均等</b>にする。
     もとは step を整数に丸めてから足していたので、丸めた誤差が右へ下へ積もり、
     いちばん端のマスだけ細くなって「間かくがそろっていない」ように見えていた。
     いまは「横に何マス置くか」を先に決め、幅をその数で割った<b>小数のまま</b>使う。
     縦も同じ幅で刻むので、マスは正方形のままそろう。 */
  const v = memo.view;
  const cols = 26;
  const step = cv.width / cols * v.s;            // 拡大すればマスも大きくなる
  g.save(); g.strokeStyle = "rgba(120,116,144,.16)"; g.lineWidth = 1;
  if(step > 3){
    const x0 = v.ox * cv.width, y0 = v.oy * cv.height;
    for(let x = x0 % step; x < cv.width; x += step){ const px=Math.round(x)+.5; g.beginPath(); g.moveTo(px,0); g.lineTo(px,cv.height); g.stroke(); }
    for(let y = y0 % step; y < cv.height; y += step){ const py=Math.round(y)+.5; g.beginPath(); g.moveTo(0,py); g.lineTo(cv.width,py); g.stroke(); }
  }
  g.restore();
  g.drawImage(off, 0, 0);

  /* ★ 2026-08-16b 消しゴムのときは「どこまで消えるか」を丸で見せる。
     消しゴムの太さは線の太さの10倍ちかくあるので、
     見えないと思ったより広く消えてしまい、書き直しになる。
     指・ペンが触れている位置（memo.ptr）に、実際の消える半径そのままの丸を描く。 */
  if(memo.mode === "draw" && memo.erasing && memo.ptr){
    const r = eraserRadius(cv) * memo.view.s;
    const vx = (memo.ptr[0] * memo.view.s + memo.view.ox) * cv.width;
    const vy = (memo.ptr[1] * memo.view.s + memo.view.oy) * cv.height;
    g.save();
    g.beginPath(); g.arc(vx, vy, r, 0, Math.PI*2);
    g.fillStyle = "rgba(214,97,97,.13)"; g.fill();
    g.setLineDash([5, 4]);
    g.strokeStyle = "rgba(178,58,58,.85)"; g.lineWidth = Math.max(1.4, cv.width/620);
    g.stroke();
    g.restore();
  }
}
/* 消しゴムの半径（キャンバスの実ピクセル）。
   memoDrawStroke の lineWidth と<b>同じ式</b>から出すこと（別々に持つとズレる）。 */
function eraserRadius(cv){ return (26 * (cv.width/1000) * 2.2) / 2; }
function memoDrawStroke(g, cv, s){
  const p = s.p; if(!p || p.length===0) return;
  const v = memo.view;
  const X = (nx)=> (nx * v.s + v.ox) * cv.width;
  const Y = (ny)=> (ny * v.s + v.oy) * cv.height;
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = s.c || "#2b2a33";
  g.globalCompositeOperation = s.e ? "destination-out" : "source-over";
  /* 拡大したぶんだけ線も太くする（紙を近づけて見ている、という見え方にそろえる） */
  g.lineWidth = (s.e ? 26 : 2.6) * (cv.width/1000) * 2.2 * v.s;
  g.beginPath();
  g.moveTo(X(p[0][0]), Y(p[0][1]));
  if(p.length===1) g.lineTo(X(p[0][0])+0.1, Y(p[0][1]));
  else for(let i=1;i<p.length;i++) g.lineTo(X(p[i][0]), Y(p[i][1]));
  g.stroke();
  g.restore();
}
function memoBindCanvas(){
  const cv = document.getElementById("memoCanvas");
  /* 画面の位置 → 紙の座標。view の逆をたどる（拡大・ずらしを打ち消す） */
  const pt = (ev)=>{
    const r = cv.getBoundingClientRect(), v = memo.view;
    const sx = (ev.clientX - r.left)/r.width, sy = (ev.clientY - r.top)/r.height;
    return [ (sx - v.ox)/v.s, (sy - v.oy)/v.s ];
  };
  /* 画面上の生の位置（移動＝パンに使う） */
  const raw = (ev)=>{
    const r = cv.getBoundingClientRect();
    return [ (ev.clientX - r.left)/r.width, (ev.clientY - r.top)/r.height ];
  };
  let panFrom = null;
  cv.addEventListener("pointerdown", (ev)=>{
    if(memo.mode !== "draw" || !memo.pan) return;
    ev.preventDefault(); panFrom = raw(ev);
    try{ cv.setPointerCapture(ev.pointerId); }catch(e){}
  });
  cv.addEventListener("pointermove", (ev)=>{
    if(!panFrom) return;
    const q = raw(ev);
    memo.view.ox += q[0] - panFrom[0];
    memo.view.oy += q[1] - panFrom[1];
    panFrom = q; memoRedraw();
  });
  ["pointerup","pointercancel","pointerleave"].forEach((t)=>cv.addEventListener(t, ()=>{ panFrom = null; }));
  /* PC はホイールで拡大縮小 */
  cv.addEventListener("wheel", (ev)=>{
    if(memo.mode !== "draw") return;
    ev.preventDefault();
    memoZoomAt(raw(ev), ev.deltaY < 0 ? 1.12 : 1/1.12);
  }, { passive:false });
  cv.addEventListener("pointerdown", (ev)=>{
    if(memo.mode !== "draw" || memo.pan) return;
    ev.preventDefault();
    try{ cv.setPointerCapture(ev.pointerId); }catch(e){}
    memo.ptr = pt(ev);
    memo.cur = { c: memo.color, e: memo.erasing, p: [memo.ptr] };
    memoRedraw();
  });
  /* 消しゴムの丸を出すために、押していないときも位置を覚えておく */
  cv.addEventListener("pointermove", (ev)=>{
    if(memo.mode !== "draw") return;
    memo.ptr = pt(ev);
    if(!memo.cur && memo.erasing) memoRedraw();   // 押していなくても丸だけ動かす
  });
  cv.addEventListener("pointerleave", ()=>{ if(memo.ptr){ memo.ptr = null; if(memo.erasing) memoRedraw(); } });
  cv.addEventListener("pointermove", (ev)=>{
    if(!memo.cur) return;
    ev.preventDefault();
    const q = pt(ev), last = memo.cur.p[memo.cur.p.length-1];
    /* 近すぎる点は捨てる。点が増えすぎると保存も描き直しも重くなる */
    if(Math.abs(q[0]-last[0]) < .002 && Math.abs(q[1]-last[1]) < .002) return;
    memo.cur.p.push(q);
    memoRedraw();
  });
  const end = ()=>{
    if(!memo.cur) return;
    memo.strokes.push(memo.cur); memo.cur = null;
    memoSave(); memoRedraw();
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
  cv.addEventListener("pointerleave", end);
}

window.lexMemoOpen = ()=>{
  memoEnsureDom();
  memo.open = true;
  document.body.classList.add("memo-on");
  document.getElementById("memoSheet").classList.add("on");
  /* 開いてから測らないと大きさが0で、キャンバスがつぶれる */
  requestAnimationFrame(()=>{ memoFit(); });
};
window.lexMemoClose = ()=>{
  memo.open = false;
  document.body.classList.remove("memo-on");
  const el = document.getElementById("memoSheet");
  if(el) el.classList.remove("on");
  memoSave();
  /* 閉じたらボタンの「書いてある印」を更新する */
  const b = document.getElementById("memoOpenBtn");
  if(b) b.classList.toggle("has", memoHasContent());
};
window.lexMemoMode = (m)=>{
  memo.mode = m;
  const sheet = document.getElementById("memoSheet");
  sheet.classList.toggle("text-mode", m==="text");
  sheet.classList.toggle("card-mode", m==="card");
  document.getElementById("memoTabDraw").classList.toggle("on", m==="draw");
  document.getElementById("memoTabText").classList.toggle("on", m==="text");
  const tc = document.getElementById("memoTabCard"); if(tc) tc.classList.toggle("on", m==="card");
  if(m==="draw") requestAnimationFrame(memoFit);
  else if(m==="text") document.getElementById("memoText").focus();
  else cardRender();
};
/* ★ 2026-08-18 メモを画面いっぱいに広げる／もどす。
   iPhone では上のタブと道具が場所を取り、シートの高さのままだと紙がとても小さかった。
   広げるとキャンバスの大きさが変わるので、必ず測り直す。 */
window.lexMemoFull = ()=>{
  const sheet = document.getElementById("memoSheet"); if(!sheet) return;
  const on = sheet.classList.toggle("full");
  const b = document.getElementById("memoFullBtn");
  if(b){ b.classList.toggle("on", on); b.textContent = on ? "⤡" : "⤢"; }
  try{ localStorage.setItem(MEMO_FULL_KEY, on ? "1" : "0"); }catch(e){}
  requestAnimationFrame(()=>{ if(memo.mode==="draw") memoFit(); });
};

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-08-18 メモをフラッシュカードとしても使う

   ・メモの3つめのタブ。おもて（問い）／うら（答え）の2面を持つカードをめくる。
   ・カードの作りかたは3つ:
       ① ＋新しいカード … 手で書く
       ② いまの問題から … 解いている問題の問題文と正解・解説をそのまま入れる
       ③ このメモから   … 文字メモの1行目をおもて、残りをうらにする。
                          手書きが残っていれば、その絵をうらに貼る。
   ・「覚えた」を押すと箱が1つ進む（0〜3）。3で覚えたあつかい。
     「覚えたを隠す」で、3のカードを出さないようにできる。
   ・保存はこの端末の中（magilex_cards_v1）。
   ══════════════════════════════════════════════════════════════ */
const CARDS_KEY = "magilex_cards_v1";
const CARD_BOX_MAX = 3;
let cards = { list: [], hideKnown: false };
let cardIdx = 0, cardBack = false, cardEditing = null;
function cardsLoad(){
  try{
    const r = JSON.parse(localStorage.getItem(CARDS_KEY) || "null");
    if(r && typeof r === "object"){
      cards.list = Array.isArray(r.list) ? r.list : [];
      cards.hideKnown = !!r.hideKnown;
    }
  }catch(e){}
  cards.list.forEach(c=>{ c.box = Math.max(0, Math.min(CARD_BOX_MAX, c.box|0)); });
}
function cardsSave(){ try{ localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); }catch(e){} }
/* いま出す並び（「覚えたを隠す」を反映） */
function cardView(){
  return cards.hideKnown ? cards.list.filter(c=>c.box < CARD_BOX_MAX) : cards.list.slice();
}
function cardAdd(q, a, img){
  const c = { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
              q: String(q||"").trim(), a: String(a||"").trim(), img: img||"", box: 0, at: Date.now() };
  if(!c.q && !c.a && !c.img) return null;
  cards.list.push(c); cardsSave();
  cardIdx = cardView().findIndex(x=>x.id===c.id);
  if(cardIdx < 0) cardIdx = 0;
  cardBack = false;
  return c;
}
function cardRender(){
  const box = document.getElementById("memoCards"); if(!box) return;
  const hb = document.getElementById("mcHideBtn");
  if(hb) hb.classList.toggle("on", cards.hideKnown);
  /* 作る・直す画面 */
  if(cardEditing){
    box.innerHTML = `<div class="mc-form">
      <label>おもて（問い）</label>
      <textarea id="mcQ" placeholder="例）三角関数の合成の公式は？">${esc(cardEditing.q||"")}</textarea>
      <label>うら（答え）</label>
      <textarea id="mcA" placeholder="例）a sinθ + b cosθ = √(a²+b²) sin(θ+α)">${esc(cardEditing.a||"")}</textarea>
      <div class="mc-nav">
        <button class="memo-btn" onclick="lexCardCancel()">やめる</button>
        <button class="memo-btn on" onclick="lexCardSaveEdit()">保存する</button>
      </div>
    </div>`;
    setTimeout(()=>{ const e=document.getElementById("mcQ"); if(e) e.focus(); }, 40);
    return;
  }
  const view = cardView();
  if(!view.length){
    box.innerHTML = `<div class="mc-empty">
      <b>${cards.list.length ? "覚えたカードだけになりました" : "カードはまだありません"}</b>
      <div>${cards.list.length
        ? "「覚えたを隠す」をもう一度押すと、覚えたカードも出ます。"
        : "上の「＋ 新しいカード」で作れます。<br>解いている問題からそのまま作ることも、<br>いま書いたメモをカードにすることもできます。"}</div>
    </div>`;
    return;
  }
  if(cardIdx >= view.length) cardIdx = 0;
  if(cardIdx < 0) cardIdx = view.length - 1;
  const c = view[cardIdx];
  const known = c.box >= CARD_BOX_MAX;
  box.innerHTML = `
    <div class="mc-count">${cardIdx+1} / ${view.length} 枚${cards.hideKnown ? "（覚えたを隠しています）" : ""}</div>
    <div class="mc-card${cardBack ? " back" : ""}" onclick="lexCardFlip()">
      <span class="mc-box${known ? " done" : ""}">${known ? "覚えた" : "あと" + (CARD_BOX_MAX - c.box) + "回"}</span>
      <span class="mc-side">${cardBack ? "うら（答え）" : "おもて（問い）"}</span>
      <div class="mc-txt">${esc((cardBack ? c.a : c.q) || "（なにも書かれていません）")}</div>
      ${cardBack && c.img ? `<img class="mc-img" src="${esc(c.img)}" alt="">` : ""}
      <div class="mc-hint">タップで${cardBack ? "おもて" : "うら"}へ</div>
    </div>
    <div class="mc-nav">
      <button class="memo-btn" onclick="lexCardMove(-1)">◀ まえ</button>
      <button class="memo-btn" onclick="lexCardKnow(1)">覚えた</button>
      <button class="memo-btn" onclick="lexCardKnow(-1)">まだ</button>
      <button class="memo-btn" onclick="lexCardMove(1)">つぎ ▶</button>
    </div>
    <div class="mc-nav">
      <button class="memo-btn" onclick="lexCardEdit()">なおす</button>
      <button class="memo-btn danger" onclick="lexCardDel()">このカードを消す</button>
    </div>`;
}
window.lexCardFlip = ()=>{ cardBack = !cardBack; cardRender(); };
window.lexCardMove = (d)=>{ cardBack = false; cardIdx += d; cardRender(); };
window.lexCardKnow = (d)=>{
  const view = cardView(); const c = view[cardIdx]; if(!c) return;
  c.box = Math.max(0, Math.min(CARD_BOX_MAX, (c.box|0) + d));
  cardsSave();
  cardBack = false;
  /* 「覚えたを隠す」中に覚えたら、その1枚は列から消えるので番号は進めない */
  if(!(cards.hideKnown && c.box >= CARD_BOX_MAX)) cardIdx++;
  cardRender();
};
window.lexCardToggleHide = ()=>{
  cards.hideKnown = !cards.hideKnown; cardsSave(); cardIdx = 0; cardBack = false; cardRender();
  toast(cards.hideKnown ? "覚えたカードを隠しました" : "覚えたカードも出します");
};
window.lexCardShuffle = ()=>{
  for(let i=cards.list.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=cards.list[i]; cards.list[i]=cards.list[j]; cards.list[j]=t; }
  cardsSave(); cardIdx = 0; cardBack = false; cardRender(); toast("シャッフルしました");
};
window.lexCardNew = ()=>{ lexMemoMode("card"); cardEditing = { id:null, q:"", a:"" }; cardRender(); };
window.lexCardEdit = ()=>{
  const c = cardView()[cardIdx]; if(!c) return;
  cardEditing = { id: c.id, q: c.q, a: c.a }; cardRender();
};
window.lexCardCancel = ()=>{ cardEditing = null; cardRender(); };
window.lexCardSaveEdit = ()=>{
  const q = (document.getElementById("mcQ")||{}).value || "";
  const a = (document.getElementById("mcA")||{}).value || "";
  if(!q.trim() && !a.trim()){ toast("おもてかうらのどちらかは書いてください"); return; }
  if(cardEditing && cardEditing.id){
    const c = cards.list.find(x=>x.id===cardEditing.id);
    if(c){ c.q = q.trim(); c.a = a.trim(); }
    cardsSave();
  } else {
    cardAdd(q, a);
  }
  cardEditing = null; cardBack = false; cardRender(); toast("カードを保存しました");
};
window.lexCardDel = ()=>{
  const c = cardView()[cardIdx]; if(!c) return;
  const i = cards.list.findIndex(x=>x.id===c.id);
  if(i>=0) cards.list.splice(i,1);
  cardsSave(); cardBack = false; cardRender(); toast("カードを消しました");
};
/* 解いている問題を、そのままカードにする */
window.lexCardFromQuiz = ()=>{
  const it = (typeof quiz !== "undefined" && quiz && quiz.items) ? quiz.items[quiz.idx] : null;
  if(!it){ toast("いまは問題を開いていません"); return; }
  /* 項目名は renderQuiz と同じもの: stem＝問題文／full・answer＝正解／extra＝解説 */
  const q = it.stem || it.word || "";
  const a = [it.full || it.answer || "", it.extra || ""].filter(Boolean).join("\n\n");
  if(!cardAdd(q, a)){ toast("カードにできる中身がありませんでした"); return; }
  lexMemoMode("card"); toast("いまの問題をカードにしました");
};
/* いま書いてあるメモを、そのままカードにする（1行目＝おもて） */
window.lexCardFromMemo = ()=>{
  const ta = document.getElementById("memoText");
  const tx = ((ta && ta.value) || memo.text || "").replace(/\r/g, "");
  const lines = tx.split("\n");
  const q = (lines.shift() || "").trim();
  const a = lines.join("\n").trim();
  /* 手書きが残っていれば、その絵をうらに貼る（途中式をそのまま覚え直せる） */
  let img = "";
  try{
    const cv = document.getElementById("memoCanvas");
    if(cv && memo.strokes && memo.strokes.length) img = cv.toDataURL("image/jpeg", 0.8);
  }catch(e){}
  if(!q && !a && !img){ toast("メモに何も書かれていません"); return; }
  if(!cardAdd(q || "（メモ）", a, img)){ toast("カードにできませんでした"); return; }
  lexMemoMode("card"); toast("メモをカードにしました");
};
window.lexMemoColor = (c)=>{
  memo.color = c; memo.erasing = false;
  document.querySelectorAll("#memoTools .memo-col").forEach(b=>b.classList.toggle("on", b.dataset.c===c));
  /* ★ 2026-08-17b シートをまだ作っていないときは消しゴムのボタンが無い。
     ここで落とすと、呼び出しもと（全部消す）が途中で止まってしまう。 */
  const er = document.getElementById("memoEraser"); if(er) er.classList.remove("on");
};
window.lexMemoEraser = ()=>{
  memo.erasing = !memo.erasing;
  document.getElementById("memoEraser").classList.toggle("on", memo.erasing);
  if(memo.erasing) document.querySelectorAll("#memoTools .memo-col").forEach(b=>b.classList.remove("on"));
  else lexMemoColor(memo.color);
  memoRedraw();   // 消える範囲の丸を出す／消す
};
/* ★ 2026-08-17 「全部消す」の直後だけは、丸ごと元にもどす。
   確認ダイアログをやめたぶん、まちがえて押しても取り返しがつくようにしておく。 */
window.lexMemoUndo = ()=>{
  if(memoUndoSnap){
    memo.strokes = memoUndoSnap.strokes.slice();
    memo.text = memoUndoSnap.text;
    const ta = document.getElementById("memoText"); if(ta) ta.value = memo.text;
    memoUndoSnap = null;
    memoSave(); memoRedraw();
    const b = document.getElementById("memoOpenBtn"); if(b) b.classList.toggle("has", memoHasContent());
    toast("消したメモをもどしました");
    return;
  }
  if(!memo.strokes.length){ toast("もどせる線がありません"); return; }
  memo.strokes.pop(); memoSave(); memoRedraw();
  const b = document.getElementById("memoOpenBtn"); if(b) b.classList.toggle("has", memoHasContent());
};
/* 画面上の点 at（0〜1）を動かさないように拡大する＝つまんだところが中心になる */
function memoZoomAt(at, k){
  const v = memo.view, ns = Math.max(1, Math.min(6, v.s * k));
  if(ns === v.s) return;
  v.ox = at[0] - (at[0] - v.ox) * (ns / v.s);
  v.oy = at[1] - (at[1] - v.oy) * (ns / v.s);
  v.s = ns;
  memoClampView(); memoRedraw(); memoPaintZoom();
}
/* 紙の外まで行きすぎないように押さえる */
function memoClampView(){
  const v = memo.view;
  const min = 1 - v.s;              // 紙の右下が画面の右下より内側に来ないように
  v.ox = Math.min(0, Math.max(min, v.ox));
  v.oy = Math.min(0, Math.max(min, v.oy));
  if(v.s <= 1){ v.ox = 0; v.oy = 0; }
}
function memoPaintZoom(){
  const e = document.getElementById("memoZoomV");
  if(e) e.textContent = Math.round(memo.view.s * 100) + "%";
}
window.lexMemoZoom = (k)=>{ memoZoomAt([0.5, 0.5], k); };
window.lexMemoZoomReset = ()=>{ memo.view = { s:1, ox:0, oy:0 }; memoRedraw(); memoPaintZoom(); };
window.lexMemoPan = ()=>{
  memo.pan = !memo.pan;
  const b = document.getElementById("memoPan"); if(b) b.classList.toggle("on", memo.pan);
  if(memo.pan){ memo.erasing = false; const e=document.getElementById("memoEraser"); if(e) e.classList.remove("on"); }
  memoRedraw();
};
/* ★ 2026-08-16b 「全部消す」は手書きも文字も<b>まとめて</b>消す。
   以前は開いているモードのぶんだけ消していたので、
   手書きを消したつもりが文字が残る（逆も）＝「押しても消えない」ように見えていた。

   ★ 2026-08-17 それでも「全部消されない」ことがあったので作り直した。原因は3つ。
     1. <b>confirm() に頼っていた</b>。ホーム画面から起動したアプリ表示では
        この確認ダイアログが出ないことがあり、その場合 false 相当で
        <b>何も消えずに終わる</b>（押しても無反応に見える）。
        → 確認をやめて即座に消し、かわりに「一つ戻す」で丸ごと戻せるようにした。
     2. <b>memo.text を見ていた</b>。日本語入力の変換中など input が届いていないと
        memo.text が古いままで「文字は無い」と判断され、
        画面の文字が残ったまま「消すメモがありません」で終わっていた。
        → textarea の<b>いまの値</b>を直接読む。
     3. <b>拡大・移動・消しゴムの状態が残っていた</b>。紙は白紙なのに
        3倍に拡大した隅を見ている状態のままで、消えていないように見えた。
        → view と pan と erasing も初期に戻す。
   ★ 空に見えるときも黙って return しない。実際にはキャンバスに描き残しがある
     場合があるので、状態にかかわらず必ず消しきる。 */
let memoUndoSnap = null;                 // 「全部消す」の直前の状態（一つ戻す用）
window.lexMemoClear = ()=>{
  const ta = document.getElementById("memoText");
  const liveText = ta ? ta.value : (memo.text || "");     // ★ 画面のいまの値を読む
  const had = memo.strokes.length > 0 || liveText.trim().length > 0;

  /* 戻せるようにひかえを取ってから消す（確認ダイアログのかわり） */
  memoUndoSnap = { strokes: memo.strokes.slice(), text: liveText };

  memo.strokes = []; memo.cur = null; memo.text = "";
  memo.erasing = false; memo.pan = false;
  memo.view = { s:1, ox:0, oy:0 };
  if(ta) ta.value = "";
  /* 消しゴム・移動のボタンの見た目も戻す */
  const eb = document.getElementById("memoEraser"); if(eb) eb.classList.remove("on");
  const pb = document.getElementById("memoPan");    if(pb) pb.classList.remove("on");
  lexMemoColor(memo.color);
  /* ひかえのキャンバスも空にしてから描き直す（ここが残ると線が焼きついて見える） */
  if(memo._off){ const og = memo._off.getContext("2d"); og.clearRect(0,0,memo._off.width,memo._off.height); }
  const cv = document.getElementById("memoCanvas");
  if(cv && cv.width){ cv.getContext("2d").clearRect(0,0,cv.width,cv.height); }

  memoSave(); memoRedraw(); memoPaintZoom();
  const b = document.getElementById("memoOpenBtn"); if(b) b.classList.remove("has");
  toast(had ? "メモを全部消しました（一つ戻すでもどせます）" : "メモは白紙です");
};
/* ★ 2026-08-16b 「メモを開く」は画面の<b>右下に固定</b>して常に出す。
   もとは選択肢の下に置いていたので、
   ・選択肢を読んでいる途中に混ざって、答えの一部に見える
   ・問題文が長いとスクロールしないと押せない
   という2つの問題があった。固定ボタンなら、どこまで読んでいても同じ場所にある。
   ★ ボタンの中身は問題ごとに作り直さない（1回だけ作って使い回す）。
     毎回作り直すと、メモを開いている最中に押し直したときに状態が飛ぶ。 */
function memoFabEnsure(){
  let b = document.getElementById("memoOpenBtn");
  if(!b){
    b = document.createElement("button");
    b.id = "memoOpenBtn";
    b.className = "memo-open";
    b.type = "button";
    b.setAttribute("aria-label", "メモを開く");
    b.onclick = () => lexMemoOpen();
    b.innerHTML = '<span class="mi" aria-hidden="true">' + uiIconSVG("memo") + '</span><span class="mt">メモ</span>';
    document.body.appendChild(b);
  }
  memoLoad();
  b.classList.toggle("has", memoHasContent());
  return b;
}
/* 問題画面にいるあいだだけ出す（ホームや一覧では邪魔になる） */
function memoFabShow(on){
  const b = memoFabEnsure();
  b.classList.toggle("on", !!on);
}


// ============================================================
/* ════════════════════════════════════════════════════════════════
   ★★ 2026-08-22 連続ログインボーナス と ビンゴミッション（ご指定）

   ── なぜ入れたか ──
   2026-08-17e に「ログインしただけで XEVA がもらえる」ぶんを一度なくしたが、
   毎日ひらく理由そのものが無くなってしまった。
   今回は<b>連続ログイン</b>という形で戻す。ただの日替わりではなく、
   ・<b>その日はじめて開いたときにポップアップ</b>で連続日数を見せる
   ・<b>節目（3・7・14・30・50・100日…）でごほうびを増やす</b>
   という「続けるほど得をする」作りにしてある。

   ── 日付は必ず「その端末のローカル日付」で数える ──
   既存の todayStr() は toISOString（＝UTC）なので、日本では<b>朝9時に日付が変わる</b>。
   学習ストリークはそのまま（互換のため触らない）だが、
   ログインボーナスは「夜ふかししていたら日付が変わって2日ぶん取れた」と
   食いちがうと分かりにくいので、<b>ローカルの午前0時</b>で区切る。

   ── ビンゴ ──
   5×5＝25マス。まん中（13マス目）は<b>ログイン</b>で最初から開く。
   ・縦5・横5・斜め2 の<b>12ライン</b>。そろうたびに受け取れる。
   ・25マス全部そろえると<b>コンプリート報酬</b>。
   ・カードは<b>月がわり</b>。その月の文字列から作るので、
     同じ月ならいつ開いても同じカード（端末が変わっても同じ）。
   ★ ミッションの達成判定は「いま持っているデータを数え直す」形にしてある
     （達成した瞬間にフラグを立てる形にしない）。
     こうしておくと、あとからミッションを足しても過去のぶんがちゃんと数えられ、
     「フラグを立て忘れて永久に達成できないミッション」も生まれない。
   ════════════════════════════════════════════════════════════════ */

/* ── ローカル日付（YYYY-MM-DD）。UTC の todayStr() とは別ものなので名前を分ける ── */
function mlDay(d){
  const t = d ? new Date(d) : new Date();
  const p = (x) => String(x).padStart(2, "0");
  return t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
}
function mlMonth(){ return mlDay().slice(0, 7); }
function mlDayAgo(n){ return mlDay(Date.now() - n * 86400000); }

/* ══════════════ 連続ログインボーナス ══════════════ */
/* 節目。ここに書いた日数のときだけ、XEVAが増えてジェムも付く。
   ★ 100日を超えたあとは 50日ごとに同じごほうび（下の mlLoginReward が見る）。 */
const ML_MILESTONE = {
  3:   { mul: 2,   gem: 1,  nm: "3日つづけて！" },
  7:   { mul: 2,   gem: 2,  nm: "1週間つづけて！" },
  14:  { mul: 2.5, gem: 3,  nm: "2週間つづけて！" },
  30:  { mul: 3,   gem: 5,  nm: "1か月つづけて！" },
  50:  { mul: 3,   gem: 7,  nm: "50日つづけて！" },
  100: { mul: 4,   gem: 10, nm: "100日つづけて！" },
};
const ML_MILESTONE_STEP = 50;   // 100日より先は、この日数ごとに節目あつかい
/* その日のごほうびを決める。streak は「今日で何日目か」（1始まり） */
function mlLoginReward(streak){
  /* 基本のXEVA: 続けるほど少しずつ増えて、14日で頭打ち（50 → 120） */
  const base = 50 + Math.min(streak, 14) * 5;
  let ms = ML_MILESTONE[streak] || null;
  if(!ms && streak > 100 && streak % ML_MILESTONE_STEP === 0){
    ms = { mul: 3, gem: 5, nm: streak + "日つづけて！" };
  }
  const xeva = Math.round(base * (ms ? ms.mul : 1));
  return { xeva, gem: ms ? ms.gem : 0, ms: ms, base };
}
/* 次の節目までの日数（案内に出す） */
function mlNextMilestone(streak){
  const keys = Object.keys(ML_MILESTONE).map(Number).sort((a,b)=>a-b);
  const hit = keys.find(k => k > streak);
  if(hit) return hit;
  const n = Math.ceil((streak + 1) / ML_MILESTONE_STEP) * ML_MILESTONE_STEP;
  return n > 100 ? n : 150;
}
function mlLoginState(){
  P.login = P.login || { last:"", streak:0, total:0, best:0 };
  return P.login;
}
/* ★ 起動時に1回だけ呼ぶ。その日はじめてなら受け取ってポップアップを出す。 */
function grantDaily(){
  const L = mlLoginState();
  const t = mlDay();
  if(L.last === t) return;                       // きょうはもう受け取っている
  const cont = (L.last === mlDayAgo(1));         // 昨日も開いていれば連続
  L.streak = cont ? (L.streak || 0) + 1 : 1;
  L.last = t;
  L.total = (L.total || 0) + 1;
  L.best = Math.max(L.best || 0, L.streak);
  const r = mlLoginReward(L.streak);
  save();
  /* ★ XEVA は earn() を通さない。earn はキャンペーンの2倍とトーストを兼ねていて、
     ここではポップアップで見せるのでトーストが二重になる。 */
  try{ if(window.XEVA) window.XEVA.add(r.xeva, "MagiLex 連続ログイン " + L.streak + "日目"); }catch(e){}
  try{ if(r.gem > 0 && window.XEVA && window.XEVA.gem) window.XEVA.gem.add(r.gem, "MagiLex 連続ログイン " + L.streak + "日目の節目"); }catch(e){}
  renderTop();
  /* ビンゴの「ログイン」マスと、連続ログイン系のマスをここで開け直す */
  try{ mlBingoSync(); }catch(e){}
  /* 起動直後は注意書き・スプラッシュが重なるので、少し待ってから出す */
  /* ★ ここを黙ってつぶさない。出なかったときに原因が分からなくなる */
  setTimeout(() => { try{ mlShowLoginBonus(r, L); }catch(e){ console.error("[MagiLex] ログインボーナスを出せませんでした", e); } }, 1400);
}
/* 直近7日ぶんのスタンプ（きょうを右端に） */
function mlStampRow(L){
  const cells = [];
  for(let i = 6; i >= 0; i--){
    const d = mlDayAgo(i);
    /* 連続ぶんだけさかのぼって「押した」ことにする（1日ぶんの記録しか持たないため） */
    const on = i < (L.streak || 0);
    const wd = "日月火水木金土"[new Date(d).getDay()];
    cells.push(`<div class="mlb-st${on ? " on" : ""}${i === 0 ? " today" : ""}">
      <span class="w">${wd}</span><span class="m">${on ? uiIconSVG("tick") : "・"}</span></div>`);
  }
  return cells.join("");
}
function mlShowLoginBonus(r, L){
  const old = document.getElementById("mlLoginOv"); if(old) old.remove();
  const next = mlNextMilestone(L.streak);
  const ov = document.createElement("div");
  ov.id = "mlLoginOv"; ov.className = "mlb-ov";
  ov.innerHTML = `
    <div class="mlb-card${r.ms ? " ms" : ""}">
      <div class="mlb-burst"></div>
      <div class="mlb-cap">${r.ms ? "★ " + r.ms.nm + " ★" : "ログインボーナス"}</div>
      <div class="mlb-day"><b>${L.streak}</b><span>日目</span></div>
      <div class="mlb-sub">連続ログイン（通算 ${L.total} 日 ／ 最長 ${L.best} 日）</div>
      <div class="mlb-stamps">${mlStampRow(L)}</div>
      <div class="mlb-rw">
        <div class="mlb-r"><img src="../XEVA.png" alt="XEVA"><b>＋${r.xeva}</b><span>XEVA</span></div>
        ${r.gem > 0 ? `<div class="mlb-r gem"><img src="../gem.png" alt="ジェム"><b>＋${r.gem}</b><span>ジェム</span></div>` : ""}
      </div>
      ${r.ms ? `<p class="mlb-note">節目のボーナスで <b>XEVA ${r.ms.mul}倍</b>${r.gem ? "＋<b>" + uiIconSVG("gemx") + r.gem + "</b>" : ""}！</p>`
             : `<p class="mlb-note">つぎの節目は <b>${next}日目</b>（あと ${next - L.streak} 日）。<br>節目にはXEVAが増えて<b>${uiIconSVG("gemx")}ジェム</b>ももらえます。</p>`}
      <button class="mlb-btn" onclick="lexCloseLoginBonus()">受け取る</button>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add("show"));
}
window.lexCloseLoginBonus = () => {
  const ov = document.getElementById("mlLoginOv");
  if(!ov) return;
  ov.classList.remove("show");
  setTimeout(() => ov.remove(), 320);
};

/* ══════════════ ビンゴミッション ══════════════ */
/* ★ ミッションは「いまのデータを数える」だけ。達成フラグは持たない。
     prog() は { now, need } を返す。now >= need で開く。
   ★ ここに1行足せばそのままカードの候補に入る（ほかに直す場所は無い）。 */
function mlMonthDays(){
  /* その月ぶんの学習記録（P.days は UTC日付キーだが、月の集計には十分） */
  const m = mlMonth();
  const out = [];
  Object.keys(P.days || {}).forEach((d) => { if(d.slice(0,7) === m) out.push(P.days[d]); });
  return out;
}
function mlMonthSum(k){ return mlMonthDays().reduce((a, d) => a + (d[k] || 0), 0); }
function mlMonthMax(k){ return mlMonthDays().reduce((a, d) => Math.max(a, d[k] || 0), 0); }
function mlMonthStudyDays(){ return mlMonthDays().filter((d) => (d.a || 0) > 0).length; }
/* その月に完全習得したコンテンツの数（qmastered / wmastered は達成日時が入っている） */
function mlMasteredThisMonth(kind){
  const m = mlMonth();
  const inM = (ts) => ts && mlDay(ts).slice(0,7) === m;
  let n = 0;
  if(kind !== "word") Object.keys(P.qmastered || {}).forEach((k) => { if(inM(P.qmastered[k])) n++; });
  if(kind !== "quiz") Object.keys(P.wmastered || {}).forEach((k) => { if(inM(P.wmastered[k])) n++; });
  return n;
}
function mlConfirmThisMonth(){
  const m = mlMonth();
  return Object.keys(P.confirmDone || {}).filter((k) => mlDay(P.confirmDone[k]).slice(0,7) === m).length;
}
function mlMixThisMonth(){
  const m = mlMonth();
  return (P.mixHist || []).filter((h) => String(h.date || "").slice(0,7) === m).length;
}
/* ★ 上のどれでも数えられないもの（科目べつの解答数・全問正解の回数）だけ、
   月ごとの小さな数え表を持つ。増やすときは mlBump("キー") を呼ぶ場所を1つ足すだけ。 */
function mlCnt(){
  P.bmc = P.bmc || {};
  const m = mlMonth();
  /* 先月ぶんは捨てる（ためこまない） */
  Object.keys(P.bmc).forEach((k) => { if(k !== m) delete P.bmc[k]; });
  return (P.bmc[m] = P.bmc[m] || {});
}
function mlBump(key, n){
  try{
    const c = mlCnt();
    c[key] = (c[key] || 0) + (n || 1);
    /* 保存は呼び出し元の save() にまかせる（1問ごとに2回書かない） */
  }catch(e){}
}
function mlGot(key){ try{ return mlCnt()[key] || 0; }catch(e){ return 0; } }

const ML_MISSIONS = [
  /* まん中のマス。ログインした時点で開く（＝いつでも達成ずみ） */
  { id:"login", nm:"ログインする", ic:"door", prog:() => ({ now: (mlLoginState().last ? 1 : 0), need:1 }) },
  /* 解いた数 */
  { id:"a10d",  nm:"1日で10問とく",  ic:"note", prog:() => ({ now: mlMonthMax("a"), need:10 }) },
  { id:"a30d",  nm:"1日で30問とく",  ic:"note", prog:() => ({ now: mlMonthMax("a"), need:30 }) },
  { id:"a100",  nm:"今月100問とく",  ic:"books", prog:() => ({ now: mlMonthSum("a"), need:100 }) },
  { id:"a250",  nm:"今月250問とく",  ic:"books", prog:() => ({ now: mlMonthSum("a"), need:250 }) },
  { id:"a500",  nm:"今月500問とく",  ic:"books", prog:() => ({ now: mlMonthSum("a"), need:500 }) },
  /* 正解した数 */
  { id:"c80",   nm:"今月80問 正解",  ic:"correct", prog:() => ({ now: mlMonthSum("c"), need:80 }) },
  { id:"c200",  nm:"今月200問 正解", ic:"correct", prog:() => ({ now: mlMonthSum("c"), need:200 }) },
  /* 完全習得 */
  { id:"m1",    nm:"1つ完全習得",    ic:"medal", prog:() => ({ now: mlMasteredThisMonth(), need:1 }) },
  { id:"m3",    nm:"3つ完全習得",    ic:"medal", prog:() => ({ now: mlMasteredThisMonth(), need:3 }) },
  { id:"m5",    nm:"5つ完全習得",    ic:"medal", prog:() => ({ now: mlMasteredThisMonth(), need:5 }) },
  { id:"mq1",   nm:"4択セットを1つ習得", ic:"bookQ", prog:() => ({ now: mlMasteredThisMonth("quiz"), need:1 }) },
  { id:"mw1",   nm:"単語帳を1つ習得", ic:"bookW", prog:() => ({ now: mlMasteredThisMonth("word"), need:1 }) },
  /* 確認テスト・ミックス */
  { id:"cf1",   nm:"確認テストに合格", ic:"check", prog:() => ({ now: mlConfirmThisMonth(), need:1 }) },
  { id:"cf3",   nm:"確認テスト3回合格", ic:"check", prog:() => ({ now: mlConfirmThisMonth(), need:3 }) },
  { id:"mx1",   nm:"ミックス問題を1回", ic:"dice", prog:() => ({ now: mlMixThisMonth(), need:1 }) },
  { id:"mx5",   nm:"ミックス問題を5回", ic:"dice", prog:() => ({ now: mlMixThisMonth(), need:5 }) },
  /* ログイン・学習の継続 */
  { id:"l3",    nm:"3日つづけてログイン", ic:"fire", prog:() => ({ now: mlLoginState().streak || 0, need:3 }) },
  { id:"l7",    nm:"7日つづけてログイン", ic:"fire", prog:() => ({ now: mlLoginState().streak || 0, need:7 }) },
  { id:"l14",   nm:"14日つづけてログイン", ic:"fire", prog:() => ({ now: mlLoginState().streak || 0, need:14 }) },
  { id:"d5",    nm:"今月5日 学習する",  ic:"calendar", prog:() => ({ now: mlMonthStudyDays(), need:5 }) },
  { id:"d10",   nm:"今月10日 学習する", ic:"calendar", prog:() => ({ now: mlMonthStudyDays(), need:10 }) },
  /* かせいだXEVA */
  { id:"x800",  nm:"今月800 XEVA",  ic:"coin", prog:() => ({ now: mlMonthSum("x"), need:800 }) },
  { id:"x2500", nm:"今月2500 XEVA", ic:"coin", prog:() => ({ now: mlMonthSum("x"), need:2500 }) },
  /* 数え表を使うもの */
  { id:"pf3",   nm:"全問正解を3回",  ic:"perfect", prog:() => ({ now: mlGot("perfect"), need:3 }) },
  { id:"pf1",   nm:"全問正解を1回",  ic:"perfect", prog:() => ({ now: mlGot("perfect"), need:1 }) },
  { id:"sMath", nm:"数学を50問とく", ic:"sMath", prog:() => ({ now: mlGot("s_math"), need:50 }) },
  { id:"sPhys", nm:"物理を50問とく", ic:"sPhys", prog:() => ({ now: mlGot("s_phys"), need:50 }) },
  { id:"sChem", nm:"化学を50問とく", ic:"sChem", prog:() => ({ now: mlGot("s_chem"), need:50 }) },
  { id:"sEigo", nm:"英語を50問とく", ic:"sEigo", prog:() => ({ now: mlGot("s_eigo"), need:50 }) },
];
const ML_MISSION_BY_ID = {};
ML_MISSIONS.forEach((m) => { ML_MISSION_BY_ID[m.id] = m; });

/* ライン（縦5・横5・斜め2＝12本）。数字は0〜24のマス番号 */
const ML_LINES = (() => {
  const L = [];
  for(let r = 0; r < 5; r++) L.push({ k:"r"+r, nm:"よこ" + (r+1) + "列", cells:[0,1,2,3,4].map(c => r*5+c) });
  for(let c = 0; c < 5; c++) L.push({ k:"c"+c, nm:"たて" + (c+1) + "列", cells:[0,1,2,3,4].map(r => r*5+c) });
  L.push({ k:"d0", nm:"ななめ（左上→右下）", cells:[0,6,12,18,24] });
  L.push({ k:"d1", nm:"ななめ（右上→左下）", cells:[4,8,12,16,20] });
  return L;
})();
/* ごほうび。★ 斜めは1本しかそろわない代わりに少し多め、コンプリートは別格 */
const ML_LINE_RW  = { xeva: 300, ticket: 1 };
const ML_DIAG_RW  = { xeva: 450, gem: 2 };
const ML_ALL_RW   = { xeva: 3000, gem: 8, ticket: 5 };

/* 月の文字列から決まる並び（同じ月なら、いつ開いても・どの端末でも同じカード） */
function mlSeedShuffle(arr, seedStr){
  let h = 2166136261;
  for(let i = 0; i < seedStr.length; i++){ h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function mlBingo(){
  P.bingo = P.bingo || {};
  const m = mlMonth();
  if(P.bingo.m !== m || !Array.isArray(P.bingo.cells) || P.bingo.cells.length !== 25){
    /* 月がわり＝新しいカード。まん中は必ず「ログイン」 */
    const pool = ML_MISSIONS.filter((x) => x.id !== "login").map((x) => x.id);
    const pick = mlSeedShuffle(pool, "magilex-bingo-" + m).slice(0, 24);
    const cells = pick.slice(0, 12).concat(["login"], pick.slice(12, 24));
    P.bingo = { m, cells, open:{}, lines:{}, all:0 };
    save();
  }
  P.bingo.open = P.bingo.open || {};
  P.bingo.lines = P.bingo.lines || {};
  return P.bingo;
}
/* いまのデータで、開いているマスを数え直す。戻り値は「新しく開いたマスの数」 */
function mlBingoSync(){
  const B = mlBingo();
  let opened = 0;
  B.cells.forEach((id, i) => {
    const ms = ML_MISSION_BY_ID[id]; if(!ms) return;
    let p = { now:0, need:1 };
    try{ p = ms.prog() || p; }catch(e){}
    const ok = (p.now || 0) >= (p.need || 1);
    if(ok && !B.open[i]){ B.open[i] = Date.now(); opened++; }
  });
  if(opened) save();
  return opened;
}
/* そろっているのに受け取っていないライン・コンプリートの数 */
function mlBingoClaimable(){
  const B = mlBingo();
  let n = 0;
  ML_LINES.forEach((L) => { if(!B.lines[L.k] && L.cells.every((i) => B.open[i])) n++; });
  if(!B.all && B.cells.every((_, i) => B.open[i])) n++;
  return n;
}
/* 受け取る（そろっているぶんを一気に） */
window.lexBingoClaim = () => {
  const B = mlBingo();
  let xeva = 0, gem = 0, tkt = 0, got = [];
  ML_LINES.forEach((L) => {
    if(B.lines[L.k]) return;
    if(!L.cells.every((i) => B.open[i])) return;
    const rw = L.k[0] === "d" ? ML_DIAG_RW : ML_LINE_RW;
    B.lines[L.k] = Date.now();
    xeva += rw.xeva || 0; gem += rw.gem || 0; tkt += rw.ticket || 0;
    got.push(L.nm);
  });
  if(!B.all && B.cells.every((_, i) => B.open[i])){
    B.all = Date.now();
    xeva += ML_ALL_RW.xeva; gem += ML_ALL_RW.gem; tkt += ML_ALL_RW.ticket;
    got.push("コンプリート");
  }
  if(!got.length){ toast("そろっているラインがありません"); return; }
  save();
  try{ if(xeva && window.XEVA) window.XEVA.add(xeva, "MagiLex ビンゴ（" + got.join("・") + "）"); }catch(e){}
  try{ if(gem && window.XEVA && window.XEVA.gem) window.XEVA.gem.add(gem, "MagiLex ビンゴ（" + got.join("・") + "）"); }catch(e){}
  try{ if(tkt && window.XEVA && window.XEVA.ticket) window.XEVA.ticket.add(tkt, "MagiLex ビンゴ（" + got.join("・") + "）"); }catch(e){}
  renderTop();
  toast("🎉 " + got.join("・") + " 達成！ ＋" + xeva + " XEVA"
    + (gem ? " ／ 💎" + gem : "") + (tkt ? " ／ 🎫" + tkt : ""), true);
  lexBingoOpen();          // 画面を出し直す（受け取り済みの見た目に変わる）
  try{ renderHome(); }catch(e){}
};

/* ── 画面 ── */
window.lexBingoOpen = () => {
  mlBingoSync();
  const B = mlBingo();
  const old = document.getElementById("mlBingoOv"); if(old) old.remove();
  const doneLines = ML_LINES.filter((L) => L.cells.every((i) => B.open[i])).length;
  const openN = B.cells.filter((_, i) => B.open[i]).length;
  const claim = mlBingoClaimable();
  const cells = B.cells.map((id, i) => {
    const ms = ML_MISSION_BY_ID[id] || { nm:"—", ic:"note" };
    let p = { now:0, need:1 };
    try{ p = ms.prog() || p; }catch(e){}
    const on = !!B.open[i];
    const pct = Math.min(100, Math.round((p.now || 0) / (p.need || 1) * 100));
    return `<div class="mlg-c${on ? " on" : ""}${i === 12 ? " mid" : ""}">
      <span class="ic">${uiIconSVG(on ? "star" : ms.ic)}</span>
      <span class="nm">${esc(ms.nm)}</span>
      ${on ? "" : `<span class="pg"><i style="width:${pct}%"></i></span>
        <span class="pn">${Math.min(p.now || 0, p.need)} / ${p.need}</span>`}
    </div>`;
  }).join("");
  const ov = document.createElement("div");
  ov.id = "mlBingoOv"; ov.className = "mlg-ov";
  ov.innerHTML = `
    <div class="mlg-card">
      <div class="mlg-top">
        <div class="mlg-tr">
          <b>ミッション ビンゴ</b>
          <button class="mlg-x" onclick="lexBingoClose()" aria-label="とじる">✕</button>
        </div>
        <small>${B.m.replace("-", "年")}月のカード ・ ${openN} / 25 マス ・ ${doneLines} / 12 ライン</small>
      </div>
      <div class="mlg-grid">${cells}</div>
      <div class="mlg-rw">
        <div><b>よこ・たて 1列</b><span>＋300 XEVA ／ ${uiIconSVG("ticket")}1</span></div>
        <div><b>ななめ 1列</b><span>＋450 XEVA ／ ${uiIconSVG("gemx")}2</span></div>
        <div class="all"><b>25マス コンプリート</b><span>＋3000 XEVA ／ ${uiIconSVG("gemx")}8 ／ ${uiIconSVG("ticket")}5</span></div>
      </div>
      <button class="mlg-claim${claim ? " on" : ""}" onclick="lexBingoClaim()" ${claim ? "" : "disabled"}>
        ${claim ? uiIconSVG("gift") + " そろった " + claim + " 件を受け取る" : "そろったラインはまだありません"}
      </button>
      <p class="mlg-note">カードは<b>毎月1日に新しくなります</b>。マスは条件を満たすと自動でひらきます
        （このカードを開いたときに数え直します）。<br>
        まん中は<b>ログイン</b>なので、開いた時点で最初からひらいています。</p>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add("show"));
};
window.lexBingoClose = () => {
  const ov = document.getElementById("mlBingoOv");
  if(!ov) return;
  ov.classList.remove("show");
  setTimeout(() => ov.remove(), 320);
};

/* ★ ホームに置くミッションカード（入口）。そろっているぶんがあれば赤いバッジを出す。 */
function mlBingoCardHTML(){
  let openN = 0, claim = 0, lines = 0;
  try{
    mlBingoSync();
    const B = mlBingo();
    openN = B.cells.filter((_, i) => B.open[i]).length;
    lines = ML_LINES.filter((L) => L.cells.every((i) => B.open[i])).length;
    claim = mlBingoClaimable();
  }catch(e){}
  return `
    <button class="mlg-bn${claim ? " has" : ""}" onclick="lexBingoOpen()">
      <span class="mlg-bi">${uiIconSVG("bingo")}${claim ? `<i class="mlg-bg">${claim}</i>` : ""}</span>
      <span class="mlg-bt">
        <b>ミッション ビンゴ</b>
        <p>${openN} / 25 マス ・ ${lines} / 12 ライン${claim ? " ・ <em>受け取れるごほうびがあります！</em>" : ""}</p>
      </span>
      <span class="mlg-ba">→</span>
    </button>`;
}

// ============================================================
// 起動
// ============================================================
function boot(){
  loadLocal();
  firstRegister();
  grantDaily();
  lexTab("home");
  try{ window.addEventListener("xeva:change", renderTop); }catch(e){}
  // すでに英単語を全完全習得済みなら（更新前に達成していた場合の救済）アリサを付与
  try{ checkArisaUnlock(); }catch(e){}
  /* ★★ 2026-08-26 ミズキの配布は「完全習得のマイルストーン」から
     <b>KP交換所（80KP）</b>へ移した。KP を入れる前から遊んでいた人が
     0KP から始めることのないよう、これまでの学習ぶんを1回だけさかのぼって配る。 */
  try{ kpBackfillOnce(); }catch(e){}
  // 起動時の注意書き（AI作成の忠告）は「タップしてスタート」を押した後に表示する。
  // アクセス画面が出ないタブ（同セッション2回目以降）はスプラッシュ後に表示する。
  window._lexNotices = () => {
    showLexDisclaimer(()=>{
      maybeAskAudioMode(()=>{ setTimeout(()=>showLexHowto(false), 200); });
    });
  };
  let _accessed = false;
  try { _accessed = sessionStorage.getItem("ml_accessed_v1") === "1"; } catch(e){}
  if (_accessed) setTimeout(window._lexNotices, 3200);
}

// 起動（スプラッシュは MagiLex.html のインライン処理が担当。本体はその裏で初期化）
boot();

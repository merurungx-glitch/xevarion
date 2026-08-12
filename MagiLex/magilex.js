// ============================================================
// MagiLex v2 — 旧MagiLex(4択クイズ) × 旧WordbookX(単語帳) 融合
//   ・XEVARION アカウント連携（アイコン/名前は XEVA.account）
//   ・進捗は本体（localStorage）に保存
//   ・XEVA 報酬: 登録+50 / デイリー+50 / 完全習得+600 / ミックス90%+50・100%+150
// ============================================================

// ---- 定数/データ ----
const SECTIONS = window.LEX_SECTIONS || [];
const SUBJECTS = window.WORD_SUBJECTS || {};
const LS_KEY = "magilex_v2";
const HOWTO_KEY = "magilex_howto_v1";
const REWARD = { reg:50, daily:50, master:600, mix90:50, mix100:150, confirm:800 };
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
const CAMPAIGN = { name:"夏の学習キャンペーン", mult:2, from:"2026-07-01", to:"2026-08-31" };
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
function toast(msg, gold){ const t=$("#toast"); if(!t) return; t.textContent=msg; t.className="toast show"+(gold?" gld":""); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2400); }
function getAcc(){ return window.XEVA ? (window.XEVA.account.get()||{}) : {}; }
function bal(){ return window.XEVA ? window.XEVA.getBalance() : 0; }
function earn(n, msg, gold){
  const amt = rw(n);   // 🌻 キャンペーン中は2倍で付与
  if(amt>0 && window.XEVA) window.XEVA.add(amt, "MagiLex "+(msg||"学習")+(campaignActive()&&n>0?"（夏キャン2倍）":""));
  renderTop();
  if(msg) toast((amt>0?"＋"+amt+" XEVA"+(campaignActive()&&n>0?" 🌻2倍!":"")+"｜":"")+msg, gold);
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
function spkBtn(word){ return ttsSupported ? `<button class="spk" data-w="${esc(word)}" onclick="event.stopPropagation();lexSpeak(this)" title="発音を聞く" aria-label="発音">🔊</button>` : ""; }
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
      <div class="aa-ic">🔊</div>
      <h3>音のモードを選んでください</h3>
      <p>英単語の学習中に、ネイティブ発音を自動で読み上げできます。<br>あとから設定でいつでも変更できます。</p>
      <div class="aa-btns">
        <button class="aa-btn pri" onclick="lexChooseAudio('on')"><b>🔊 発音モード</b><span>単語を表示すると自動で発音</span></button>
        <button class="aa-btn" onclick="lexChooseAudio('off')"><b>🔇 消音モード</b><span>音を出さずに静かに学習</span></button>
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
window.lexSetAutoNext=(m)=>{ autoNext.on=(m==="on"); saveAutoNext(); renderSettings(); toast(autoNext.on?"▶ 自動で次の問題へ進みます":"✋ 手動で次の問題へ進みます"); };
window.lexAutoNextTime=(which, delta)=>{
  const cur = which==="correct" ? autoNext.correct : autoNext.wrong;
  const v = Math.min(AUTONEXT_MAX, Math.max(AUTONEXT_MIN, cur + delta));
  if(which==="correct") autoNext.correct=v; else autoNext.wrong=v;
  saveAutoNext(); renderSettings();
};

// フラッシュカードの「覚えたカードを出さない」設定・記録リセット
function fcKnownCount(){ let n=0; const f=P.fcKnown||{}; Object.keys(f).forEach(k=>{ n+=Object.keys(f[k]||{}).length; }); return n; }
window.lexSetFlashHide=(m)=>{ flashOpt.hideKnown=(m==="on"); saveFlashOpt(); renderSettings(); toast(flashOpt.hideKnown?"🃏 覚えたカードは出題しません":"🔁 すべてのカードを出題します"); };
window.lexResetFlashKnown=()=>{
  if(fcKnownCount()===0){ toast("戻すカードがありません"); return; }
  if(confirm("フラッシュカードで「覚えた」にしたカードをすべて「わからない」に戻しますか？（もう一度出題されるようになります）")){
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
// ミズキ解放（コンテンツ完全習得数のマイルストーン報酬）
//   30個 → ミズキ入手 ／ 35・40・45・50個 → さらに+1凸（最大4凸＝完凸）
//   付与先は共有コレクション xeva_gacha_v1 なので、
//   MagiBurst・MagiBattle・XEVARIONアイコンなど全コンテンツですぐ使える。
//   進捗(P.mizukiGrants)は magilex_v2 ごとクラウド同期される。
// ============================================================
const MIZUKI_MILESTONES = [30, 35, 40, 45, 50];
function masteredCount(){
  return Object.keys(P.qmastered||{}).length + Object.keys(P.wmastered||{}).length;
}
function grantMizuki(level){   // level: 0=入手, 1..4=凸
  try{
    const gk="xeva_gacha_v1"; let g=null;
    try{ g=JSON.parse(localStorage.getItem(gk)||"null"); }catch(e){}
    if(!g||typeof g!=="object") g={};
    if(!g.owned) g.owned={}; if(!g.dupes) g.dupes={}; if(!g.points) g.points={};
    g.owned["mizuki"]=true;
    if(level>0) g.dupes["mizuki"]=Math.max(g.dupes["mizuki"]||0, Math.min(4, level));
    localStorage.setItem(gk, JSON.stringify(g));
  }catch(e){}
}
function checkMizukiUnlock(){
  const n = masteredCount();
  P.mizukiGrants = P.mizukiGrants || {};
  let granted = null;
  MIZUKI_MILESTONES.forEach((m, idx)=>{
    if(n >= m && !P.mizukiGrants[m]){
      P.mizukiGrants[m] = Date.now();
      grantMizuki(idx);          // 30個=入手(0) / 35=1凸 / 40=2凸 / 45=3凸 / 50=4凸(完凸)
      granted = { m, idx };
    }
  });
  if(granted){ save(); showMizukiModal(granted.m, granted.idx); }
}
function showMizukiModal(milestone, level){
  const old=$("#mizukiOv"); if(old) old.remove();
  const ov=document.createElement("div"); ov.id="mizukiOv"; ov.className="arisa-ov";
  const full = level >= 4;
  ov.innerHTML=`<div class="arisa-card">
      <div class="arisa-burst"></div>
      <div class="arisa-cap">${milestone}コンテンツ 完全習得報酬</div>
      <img class="arisa-img" src="../img/Mizuki.webp" alt="ミズキ" onerror="this.style.display='none'">
      <div class="arisa-name">ミズキ <span>${level===0?"を獲得！":full?"が完凸！！":"が+"+level+"凸！"}</span></div>
      <div class="arisa-rar">★★★ SSR${full?"・👑完凸":""}</div>
      <p>${milestone}個のコンテンツを完全習得しました！<br>限定キャラクター「ミズキ」${level===0?"をコレクションに加えました。":"の凸が進みました。"}<br><b>MagiBurst・MagiBattle・アイコン</b>など全コンテンツで使えます！${level<4?"<br><small>次は "+(MIZUKI_MILESTONES.find(m=>m>milestone)||50)+" 個でさらに凸！</small>":""}</p>
      <button class="arisa-btn" onclick="document.getElementById('mizukiOv').remove()">やったー！ ✨</button>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add("show"));
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
  confirmDone:{}, mixSel:null, updatedAt:0 }; }
let P = freshProgress();
function loadLocal(){ try{ const r=localStorage.getItem(LS_KEY); if(r){ P=Object.assign(freshProgress(), JSON.parse(r)); } }catch(e){} }
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
  if(!confirm(msg)) return;
  if(c.type==="quiz"){ delete P.quiz[c.sid]; delete P.qmastered[c.sid]; }
  else { delete P.words[c.key]; delete P.wmastered[c.key]; }
  /* 習得をリセットしたら確認テストの受取記録も消す（もう一度 全問正解すればまたもらえる） */
  if(P.confirmDone) delete P.confirmDone[c.id];
  if(P.fcKnown) delete P.fcKnown[c.id];
  P.resets = P.resets || {};
  P.resets[c.id] = resetCountOf(c) + 1;
  if(P.activeQuiz && P.activeQuiz.cid === c.id) P.activeQuiz = null;
  save();
  toast("🔄 「"+c.name+"」をリセットしました（"+(P.resets[c.id]+1)+"周目）");
  renderDetail();
};
function checkMastery(c){
  if(!isMastered(c)) return;
  if(c.type==="quiz"){ if(P.qmastered[c.sid]) return; P.qmastered[c.sid]=Date.now(); }
  else { if(P.wmastered[c.key]) return; P.wmastered[c.key]=Date.now(); }
  const vm = volumeMult(c.total);
  save();
  earn(masterReward(c), "「"+c.name+"」完全習得！" + (vm>1 ? `（${c.total}問・ボリューム${vm}倍！）` : ""), true);
  checkArisaUnlock();
  checkMizukiUnlock();
}

// ============================================================
// 画面遷移
// ============================================================
let nav=[];
function show(screen, push=true){
  if(push) nav.push(screen);
  // クイズ画面から離れるときは自動送りタイマーを止める（裏で勝手に進まないように）
  if(screen.name!=="quiz") clearAutoNext();
  // クイズ中は下部ナビ等を隠してコンパクト表示（iPhoneでスクロール不要に）
  document.body.classList.toggle("in-quiz", screen.name==="quiz");
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));
  const el=$("#scr-"+screen.name); if(el) el.classList.add("on");
  document.querySelectorAll(".nav .nv").forEach(b=>b.classList.toggle("on", b.dataset.tab===(screen.tab||screen.name)));
  window.scrollTo(0,0);
}
window.lexTab=(name)=>{ nav=[{name, tab:name}]; render(name); show({name, tab:name}, false); };
function render(name, arg){
  ({ home:renderHome, library:renderLibrary, detail:renderDetail, mixsetup:renderMixSetup, stats:renderStats, settings:renderSettings }[name]||(()=>{}))(arg);
}
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
  const dailyDone = P.daily===todayStr();
  const aq = P.activeQuiz;
  const resumeHTML = (aq && aq.items && aq.idx < aq.items.length) ? `
    <button class="resume-card" onclick="lexResumeQuiz()">
      <div class="ic">🔄</div>
      <div class="tx"><b>中断したクイズを再開</b><p>${aq.src==="mix"?"ミックス問題":aq.src==="confirm"?"確認テスト":"クイズ"} ・ ${aq.idx+1} / ${aq.items.length} 問目から</p></div>
      <div class="go">▶</div>
    </button>` : "";
  const campHTML = campaignActive() ? `
    <div class="camp-bn" onclick="showLexHowto(true)">
      <span class="cb-sun">🌻</span>
      <div class="cb-bd">
        <b>夏の学習キャンペーン開催中！</b>
        <p>期間中（〜${CAMPAIGN.to.slice(5).replace("-","/")}）は獲得XEVAが<span class="cb-x2">すべて×2</span>！</p>
      </div>
    </div>` : "";
  /* ミズキ告知バナー: 30コンテンツ完全習得で入手（35/40/45/50でさらに凸・完凸まで）。
     MagiBurst・MagiBattle・アイコンなど全コンテンツで使えることを常に示す。 */
  const mzCount = masteredCount();
  const mzNext = MIZUKI_MILESTONES.find(m => !(P.mizukiGrants||{})[m]);
  const mizukiHTML = `
    <div class="mizuki-bn" onclick="void(0)">
      <img src="../img/Mizuki.webp" alt="ミズキ" onerror="this.style.display='none'">
      <div class="mz-bd">
        <b>🎓 限定SSR「ミズキ」${mzNext ? "を手に入れよう！" : "完凸済み！👑"}</b>
        ${mzNext
          ? `<p><b>${mzNext}コンテンツ完全習得</b>で${mzNext===30?"入手":"さらに+1凸"}！（いま <b>${mzCount}</b> / ${mzNext}）<br>35・40・45・50個で凸が進み、50個で<b>完凸</b>！</p>`
          : `<p>全マイルストーン達成！ミズキは完凸状態です。</p>`}
        <p class="mz-note">⚔ <b>MagiBurst・MagiBattle・アイコン</b>など全コンテンツで使用できます</p>
      </div>
    </div>`;
  $("#scr-home").innerHTML=`
    ${campHTML}
    ${mizukiHTML}
    ${resumeHTML}
    <div class="hero">
      <div class="greet">${greet()}、</div>
      <div class="nm">${esc(acc.name||"ユーザー")} さん</div>
      <div class="row">
        <div class="chip">学習ストリーク<b>${P.streak||0} 日</b></div>
        <div class="chip">習得コンテンツ<b>${masteredSecs} / ${conts.length}</b></div>
        <div class="chip">正答率<b>${P.totals.answered? Math.round(P.totals.correct/P.totals.answered*100):0}%</b></div>
      </div>
    </div>
    <div class="daily">
      <div class="ic">${dailyDone?"✅":"🎁"}</div>
      <div class="tx"><b>デイリーボーナス</b><p>${dailyDone?"本日は受取済み。また明日！":"今日の学習でXEVAをもらおう"}</p></div>
      ${dailyDone?'<span class="got">受取済</span>':'<span class="got">+'+rw(REWARD.daily)+(campaignActive()?'<small style="font-size:.6rem"> 🌻×2</small>':'')+'</span>'}
    </div>
    <div class="menu-grid">
      <button class="m-card accent wide" onclick="lexTab('library')">
        <div class="mi">📚</div><div><h3>学習する</h3><p>選択クイズ・単語帳フラッシュカードから選ぶ・未習得の問題を優先出題</p></div>
      </button>
      <button class="m-card" onclick="lexMixSetup()"><div class="mi">🎯</div><h3>ミックス問題</h3><p>${mixSelIds().length===allContents().length?"全範囲":"えらんだ範囲"}から${mixSelCount()}問<br>90%↑ +${rw(REWARD.mix90)} / 100% +${rw(REWARD.mix100)}${campaignActive()?' 🌻':''}</p></button>
      <button class="m-card" onclick="lexTab('stats')"><div class="mi">📊</div><h3>学習データ</h3><p>進捗・正答率</p></button>
      <button class="m-card" onclick="showLexHowto(true)"><div class="mi">✨</div><h3>XEVAの入手方法</h3><p>もう一度見る</p></button>
    </div>
    ${installCardHTML()}`;
  renderTop();
}

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
      <div class="mi">⬇️</div>
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
const LIB_FILTERS=[["all","すべて"],["quiz","選択クイズ"],["word","単語帳"],["none","未習得"],["learn","習得中"],["done","完全習得"]];
const SUBJECT_ORDER=["英語","数学","化学α","化学β","物理","国語"];
// 科目内ジャンル（例: 化学 → 理論・無機・有機・高分子）。表示順もここで決める
const GENRE_ORDER=["極限","複素数平面","二次曲線","微分・積分","理論","無機","有機","高分子","力学","波動・光","電磁気","熱・原子","動詞","名詞","形容詞","副詞・接続","学術・社会","文法・敬語","古文単語"];
function genreOf(c){
  const id = c.type==="word" ? c.key : (c.sid||"");
  // 英語
  if(/^eigo_v/.test(id)) return "動詞";
  if(/^eigo_n/.test(id)) return "名詞";
  if(/^eigo_a[0-9]/.test(id)) return "形容詞";
  if(id==="eigo_adv") return "副詞・接続";
  if(id==="eigo_ac") return "学術・社会";
  // 数学（真髄・数学III）
  if(id==="math_shinzui_limit") return "極限";
  if(id==="math_shinzui_complex") return "複素数平面";
  if(id==="math_shinzui_conic") return "二次曲線";
  if(id==="math_shinzui_calc") return "微分・積分";
  // 国語
  if(id==="kobun") return "古文単語";
  if(/^kokugo_/.test(id)) return "文法・敬語";
  // 物理
  if(/^(phys_kinematics|phys_momentum|phys_exam_mech)$/.test(id)) return "力学";
  if(id==="phys_waves") return "波動・光";
  if(/^(phys_em|phys_exam_em)$/.test(id)) return "電磁気";
  if(/^(phys_thermo_atom|phys_exam_wave_heat)$/.test(id)) return "熱・原子";
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
function genresPresent(subject){
  const set={};
  allContents().forEach(c=>{ if(subjectOf(c)===subject) set[genreOf(c)]=1; });
  const known=GENRE_ORDER.filter(g=>set[g]);
  if(set["その他"]) known.push("その他");
  return known;
}
// 科目を id / 単語帳キーから判定
function subjectOf(c){
  if(c.type==="word"){ if(c.key.indexOf("eigo")===0) return "英語"; return c.key==="kobun" ? "国語" : "公共"; }
  const id=c.sid||"";
  if(id.indexOf("geo_")===0) return "地理";
  if(id.indexOf("math_")===0) return "数学";   /* ★ 2026-08-04 真髄（数学III） */
  if(id.indexOf("phys_")===0) return "物理";
  if(id.indexOf("kokugo_")===0) return "国語";
  if(id.indexOf("cbeta_")===0) return "化学β"; // 溶液・無機・有機・高分子の新規問題
  return "化学α"; // 既存の化学すべて（fatty/carboxyl/functional/gas_*/metal/chem_b_*/chem_*）
}
function subjectsPresent(){ const set={}; allContents().forEach(c=>set[subjectOf(c)]=1); return SUBJECT_ORDER.filter(s=>set[s]); }
function libFilterSummary(){
  const parts=[];
  parts.push(libSubject==="all"?"全科目":libSubject);
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
        ${subjectsPresent().map(s=>`<button class="fchip ${libSubject===s?'on':''}" onclick="lexLibSubject('${s}')">${s}</button>`).join("")}
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
    <div class="back-row"><h2>📚 学習ライブラリ</h2></div>
    <input class="search" id="libSearch" placeholder="🔍 名前で検索…" value="${esc(libQuery)}" oninput="lexLibSearch(this.value)">
    <button class="lib-filter-toggle" onclick="lexLibToggleFilter()">🔍 絞り込み：<b>${esc(libFilterSummary())}</b><span class="lft-arrow">${libFilterOpen?"▲ 閉じる":"▼ 選ぶ"}</span></button>
    ${panel}
    <div class="list" id="libList"></div>`;
  renderLibList();
}
function renderLibList(){
  const box=$("#libList"); if(!box) return;
  let list=allContents();
  if(libSubject!=="all") list=list.filter(c=>subjectOf(c)===libSubject);
  if(libSubject!=="all"&&libGenre!=="all") list=list.filter(c=>genreOf(c)===libGenre);
  if(libFilter==="quiz"||libFilter==="word") list=list.filter(c=>c.type===libFilter);
  else if(libFilter==="none"||libFilter==="learn"||libFilter==="done") list=list.filter(c=>statusOf(c)===libFilter);
  if(libQuery){ const q=libQuery.toLowerCase(); list=list.filter(c=>c.name.toLowerCase().includes(q)); }
  if(!list.length){ box.innerHTML='<div class="empty">該当するコンテンツがありません</div>'; return; }
  box.innerHTML=list.map(c=>{
    const mc=masteryCounts(c), st=statusOf(c);
    return `<button class="item" onclick="lexOpen('${c.id}')">
      <div class="ic">${esc(c.icon)}</div>
      <div class="bd"><div class="t">${esc(c.name)}${volumeBadge(c.total)}</div>
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
let curContent=null, quizCount=10;
window.lexOpen=(id)=>{ curContent=findContent(id); if(!curContent) return; render("detail"); show({name:"detail", tab:"library"}); };
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
  const counts=[10,20,c.total].filter((v,i,a)=>v>0&&a.indexOf(v)===i&&v<=c.total);
  if(quizCount>c.total) quizCount=c.total;
  const unlearnedNow=unlearnedCount(c);   // 「未習得のみ」フラッシュカードの残り枚数
  $("#scr-detail").innerHTML=`
    <div class="back-row"><button class="back-btn" onclick="lexBack()">←</button><h2>${esc(c.icon)} ${esc(c.name)}</h2></div>
    <div class="set-card"><div style="font-weight:800;font-size:.86rem;margin-bottom:10px">習得メーター</div>${meterHTML(c)}
      <div class="vol-note">🏆 完全習得で <b>＋${rw(masterReward(c)).toLocaleString()} XEVA</b>${volumeMult(c.total)>1?`（${c.total}問のボリュームボーナス <b>×${volumeMult(c.total)}</b>）`:""}${campaignActive()?" 🌻夏キャン2倍込み":""}</div>
      <div class="reset-row">
        <div class="reset-tx">🔄 <b>リセットして もう一度</b>
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
          ${counts.map(n=>`<button class="count-btn ${n===quizCount?'on':''}" onclick="lexSetCount(${n})">${n===c.total?"全":""}${n}問</button>`).join("")}
        </div>
        <button class="mode-btn primary" onclick="lexStartQuiz()"><div class="mi">🚀</div><div class="bd"><b>クイズを始める</b><p>4〜5択＋「わからない」・自動で次の問題へ</p></div><div class="go">→</div></button>
      </div>
      <button class="mode-btn" onclick="lexStartFlash()"><div class="mi">🃏</div><div class="bd"><b>フラッシュカード</b><p>${c.type==="word"?"単語→意味をめくって暗記":"問題→答えをめくって確認"}</p></div><div class="go">→</div></button>
      <button class="mode-btn ${unlearnedNow===0?"is-done":""}" onclick="lexStartFlash(true)"><div class="mi">🎯</div><div class="bd"><b>フラッシュカード（未習得のみ）</b><p>${unlearnedNow===0?"すべて習得済み！🎉":"まだ習得していない "+unlearnedNow+" 件だけをめくる"}</p></div><div class="go">→</div></button>
      <button class="mode-btn" onclick="lexShowList()"><div class="mi">📋</div><div class="bd"><b>${c.type==="word"?"単語一覧":"問題と答えの一覧"}</b><p>${c.total}件をまとめて確認</p></div><div class="go">→</div></button>
    </div>
    ${confirmTestCardHTML(c)}`;
}
window.lexSetCount=(n)=>{ quizCount=n; renderDetail(); };
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
function buildQuizItems(c, count){
  if(c.type==="quiz"){
    const m=P.quiz[c.sid]||{};
    const all=c.sec.questions.map((q,i)=>({q,i}));
    const un=all.filter(x=>!(m[x.i]&&m[x.i].m)), ma=all.filter(x=>m[x.i]&&m[x.i].m);
    const qs=pickPrioritized(un, ma, count);
    return qs.map(({q,i})=>{
      const wrongs=shuffle(q.wrong||[]).slice(0,N_OPTS-1);
      return { stem:q.stem, reading:q.reading||"", answer:q.answer, extra:q.extra||"", tag:MODE_LABEL[c.sec.mode]||c.sec.desc||"問題",
        opts:shuffle([q.answer,...wrongs]), kind:"quiz", sid:c.sid, qi:i };
    });
  } else {
    const m=P.words[c.key]||{};
    const entries=Object.entries(c.subj.data); const meanings=entries.map(e=>e[1]);
    const un=entries.filter(([w])=>!(m[w]&&m[w].m)), ma=entries.filter(([w])=>m[w]&&m[w].m);
    const picks=pickPrioritized(un, ma, count);
    const eng=c.key.indexOf("eigo")===0;
    return picks.map(([word,mean])=>{
      const wrongs=shuffle(meanings.filter(m2=>m2!==mean)).slice(0,N_OPTS-1);
      return { stem:word, reading:"", answer:mean, extra:"", tag:(c.subj.frontLabel||"単語")+" → 意味",
        opts:shuffle([mean,...wrongs]), kind:"word", key:c.key, word, english:eng };
    });
  }
}
window.lexStartQuiz=()=>{ if(!curContent) return; quiz={ items:buildQuizItems(curContent,quizCount), idx:0, ok:0, src:"section" }; saveActiveQuiz(); renderQuiz(); show({name:"quiz",tab:"library"}); };

// ============================================================
// ミックス問題の出題範囲（★ 2026-08-04 追加）
//   これまでミックスは「全範囲から30問」の一択で、
//   「今日は化学だけ」「英単語の名詞だけ」といった絞り方ができなかった。
//   科目 → コンテンツ の2段で選べるようにして、選択は保存する（次回もそのまま）。
//   ★ 科目はデータに持たせず、コンテンツIDから判定する（既存データを触らずに済む）。
//     新しいコンテンツを足したときは SUBJECT_RULES に1行足せばよい。
// ============================================================
/* 科目のアイコン（並び順・分類そのものは既存の SUBJECT_ORDER / subjectOf を使う）。
   ★ ここで独自の科目分けを作らないこと。ライブラリ画面の絞り込みとズレると、
     「学習タブでは化学βなのにミックスでは化学」のような食い違いが出る。 */
const MIX_SUBJ_IC = { "英語":"🔤", "国語":"✒️", "公共":"🏛", "地理":"🗺", "物理":"⚙️", "化学α":"🧪", "化学β":"⚗️" };
/* 科目ごとにコンテンツをまとめる（画面の並び順もここで決まる） */
function contentsBySubject(){
  const order = subjectsPresent();
  return order.map(nm => ({
    key: nm, nm: nm, ic: MIX_SUBJ_IC[nm] || "📘",
    items: allContents().filter(c => subjectOf(c) === nm),
  })).filter(g => g.items.length);
}
/* いま選ばれている範囲（コンテンツIDの配列）。未設定なら全部。 */
function mixSelIds(){
  const all = allContents().map(c=>c.id);
  const sel = P.mixSel && Array.isArray(P.mixSel.ids) ? P.mixSel.ids.filter(id=>all.includes(id)) : null;
  return (sel && sel.length) ? sel : all;
}
/* ★ 2026-08-05: ミックス問題の問題数は 20問 に固定した。
   選べるようにしていたが、範囲えらびと問題数えらびの2段は決めることが多く、
   「とりあえず始める」までが遠かった。範囲だけ選べばすぐ始められる形にする。 */
const MIX_FIXED_N = 20;
function mixSelCount(){ return MIX_FIXED_N; }
function mixSaveSel(ids){
  P.mixSel = { ids:ids.slice(), count:MIX_FIXED_N };
  save();
}
/* 選んだ範囲に入っている問題の総数（「◯問から出題」の表示に使う） */
function mixPoolTotal(ids){
  return allContents().filter(c=>ids.includes(c.id)).reduce((a,c)=>a+c.total, 0);
}

let mixDraftIds = null;

window.lexMixSetup = () => {
  mixDraftIds = mixSelIds().slice();
  renderMixSetup();
  show({ name:"mixsetup", tab:"home" });
};
function renderMixSetup(){
  const groups = contentsBySubject();
  const pool = mixPoolTotal(mixDraftIds);
  const n = Math.min(MIX_FIXED_N, pool);   // 範囲の総数が20より少ないときはその数だけ
  $("#scr-mixsetup").innerHTML = `
    <div class="back-row"><button class="back-btn" onclick="lexBack()">←</button><h2>🎯 ミックス問題</h2></div>
    <div class="set-card">
      <div style="font-weight:800;font-size:.86rem;margin-bottom:6px">出題する科目・範囲をえらぶ</div>
      <p class="mix-note">チェックを入れた範囲だけから<b>20問</b>出題します。<b>未習得の問題が優先</b>されるのはこれまでどおりです。</p>
      <div class="mix-sum" id="mixSum">選択中 <b>${mixDraftIds.length}</b> 範囲 ／ <b>${pool.toLocaleString()}</b> 問から出題</div>
      <div class="mix-allrow">
        <button class="mix-abtn" onclick="lexMixAll(1)">すべて選ぶ</button>
        <button class="mix-abtn" onclick="lexMixAll(0)">すべて外す</button>
      </div>
    </div>
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
            return `<button class="mix-item ${sel?"on":""}" onclick="lexMixToggle('${c.id}')">
              <span class="mi-ck">${sel?"✓":""}</span>
              <span class="mi-nm">${esc(c.icon)} ${esc(c.name)}</span>
              <span class="mi-n">${c.total}問<small>${mc.mastered}習得</small></span>
            </button>`;
          }).join("")}
        </div>
      </div>`;
    }).join("")}
    <div class="set-card" style="margin-top:12px">
      <button class="mode-btn primary" ${pool?"":"disabled"} onclick="lexMixStart()">
        <div class="mi">🎯</div>
        <div class="bd"><b>この範囲で始める</b><p>${pool?`${n}問 ・ 90%↑ +${rw(REWARD.mix90)} / 100% +${rw(REWARD.mix100)}`:"範囲を1つ以上えらんでください"}</p></div>
        <div class="go">→</div>
      </button>
    </div>`;
}
window.lexMixToggle = (id) => {
  const i = mixDraftIds.indexOf(id);
  if(i>=0) mixDraftIds.splice(i,1); else mixDraftIds.push(id);
  renderMixSetup();
};
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
  mixSaveSel(mixDraftIds);
  lexMix();
};

window.lexMix=()=>{
  /* ★ 2026-08-04: 出題範囲（P.mixSel）に入っているコンテンツだけから作る。
     クイズのセクションと単語帳の両方が対象。未習得を優先するのは従来どおり。 */
  const ids = mixSelIds();
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
  const count=Math.min(mixSelCount(), un.length+ma.length);
  if(!count){ toast("出題できる問題がありません。範囲をえらび直してください"); return; }
  const picks=pickPrioritized(un, ma, count);
  quiz={ items:picks.map(pk=>{
    if(pk.kind==="quiz"){
      const q=pk.q, wrongs=shuffle(q.wrong||[]).slice(0,N_OPTS-1);
      return { stem:q.stem, reading:q.reading||"", answer:q.answer, extra:q.extra||"", tag:pk.c.name,
        opts:shuffle([q.answer,...wrongs]), kind:"quiz", sid:pk.c.sid, qi:pk.i };
    }
    const meanings=Object.values(pk.c.subj.data||{});
    const wrongs=shuffle(meanings.filter(m2=>m2!==pk.mean)).slice(0,N_OPTS-1);
    return { stem:pk.word, reading:"", answer:pk.mean, extra:"", tag:pk.c.name,
      opts:shuffle([pk.mean,...wrongs]), kind:"word", key:pk.c.key, word:pk.word,
      english:(pk.c.key||"").indexOf("eigo")===0 };
  }), idx:0, ok:0, src:"mix" };
  saveActiveQuiz(); renderQuiz(); show({name:"quiz",tab:"home"});
};
// ---- 途中経過の保存・再開（ホームなどに戻っても続きから） ----
function saveActiveQuiz(){ if(!quiz) return; P.activeQuiz={ items:quiz.items, idx:quiz.idx, ok:quiz.ok, src:quiz.src, cid:quiz.cid||null, contentId:(curContent?curContent.id:null), savedAt:Date.now() }; save(); }
function clearActiveQuiz(){ if(P.activeQuiz){ P.activeQuiz=null; save(); } }
window.lexResumeQuiz=()=>{
  const a=P.activeQuiz; if(!a||!a.items||!a.items.length) return;
  curContent = a.contentId ? findContent(a.contentId) : null;
  quiz={ items:a.items, idx:Math.min(a.idx||0, a.items.length-1), ok:a.ok||0, src:a.src||"section", cid:a.cid||null };
  renderQuiz(); show({name:"quiz", tab:(a.src==="mix"?"home":"library")});
};
function renderQuiz(){
  clearAutoNext();
  const it=quiz.items[quiz.idx]; const n=quiz.items.length;
  const pct=Math.round(quiz.idx/n*100);
  // コンパクトヘッダ: ✕・タイトル・問題数・進捗バーを1行にまとめてスクロールを抑える
  $("#scr-quiz").innerHTML=`
    <div class="quiz-head compact">
      <button class="back-btn" onclick="lexQuit()">✕</button>
      <span class="qh-title">${quiz.src==="mix"?"🎯 ミックス":quiz.src==="confirm"?"🎓 確認テスト":"📝 クイズ"}</span>
      <div class="qprog inline"><i style="width:${pct}%"></i></div>
      <span class="qx">${quiz.idx+1}/${n}</span>
    </div>
    <div class="q-card">
      <div class="q-tag">${esc(it.tag)}</div>
      <div class="q-stem">${esc(it.stem)}${it.english?spkBtn(it.stem):""}</div>
      <div class="opts" id="opts">${it.opts.map((o,i)=>`<button class="opt" onclick="lexAnswer(${i})">${esc(o)}</button>`).join("")}</div>
      <button class="dunno" id="dunnoBtn" onclick="lexDontKnow()">？ わからない（答えを見る）</button>
      <div class="reveal" id="reveal"><div class="ans">正解：${esc(it.answer)}</div>${it.extra?`<div class="ex">${esc(it.extra)}</div>`:""}</div>
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
  if(it.kind==="quiz"){ P.quiz[it.sid]=P.quiz[it.sid]||{}; const r=P.quiz[it.sid][it.qi]=P.quiz[it.sid][it.qi]||{c:0,m:false}; if(correct){ r.c=Math.min(r.c+1,2); if(r.c>=2) r.m=true; } else r.c=0; }
  else { P.words[it.key]=P.words[it.key]||{}; const r=P.words[it.key][it.word]=P.words[it.key][it.word]||{c:0,m:false}; if(correct){ r.c=Math.min(r.c+1,2); if(r.c>=2) r.m=true; } else r.c=0; }
  markStudied(); save(); saveActiveQuiz();
}
function revealQuiz(correct){ const b=$("#dunnoBtn"); if(b) b.style.display="none"; $("#reveal").classList.add("show"); $("#nextBtn").classList.add("show"); scheduleAutoNext(!!correct); }
window.lexAnswer=(i)=>{
  if($("#reveal").classList.contains("show")) return;
  const it=quiz.items[quiz.idx]; const correct = it.opts[i]===it.answer;
  recordAnswer(it, correct);
  document.querySelectorAll("#opts .opt").forEach((b,bi)=>{ b.disabled=true; if(it.opts[bi]===it.answer) b.classList.add("correct"); else if(bi===i) b.classList.add("wrong"); else b.classList.add("dim"); });
  revealQuiz(correct);
};
window.lexDontKnow=()=>{
  if($("#reveal").classList.contains("show")) return;
  const it=quiz.items[quiz.idx];
  recordAnswer(it, false);
  document.querySelectorAll("#opts .opt").forEach((b)=>{ b.disabled=true; if(b.textContent===it.answer) b.classList.add("correct"); else b.classList.add("dim"); });
  revealQuiz(false);
};
window.lexNext=()=>{ clearAutoNext(); if(quiz.idx<quiz.items.length-1){ quiz.idx++; saveActiveQuiz(); renderQuiz(); } else finishQuiz(); };
window.lexQuit=()=>{ if(confirm("クイズを中断しますか？（途中経過は保存され、ホームから再開できます）")){ clearAutoNext(); saveActiveQuiz(); lexBack(); } };
function finishQuiz(){
  clearAutoNext(); clearActiveQuiz();
  const n=quiz.items.length, ok=quiz.ok, pct=Math.round(ok/n*100);
  if(!P.missionDone){ P.missionDone=true; save(); if(window.XEVA){ const r=window.XEVA.completeMission("magilex_play");
    if(r>0){ let tot=r;
      if(campaignActive()){ window.XEVA.add(r, "MagiLex ミッション 夏キャン2倍ボーナス"); tot=r*2; }   // 🌻 ミッションも2倍
      toast("🎉 ミッション達成！＋"+tot+" XEVA"+(campaignActive()?" 🌻2倍!":""),true); } } }
  let rwd=0, rmsg="";
  if(quiz.src==="mix"){ P.mixHist=P.mixHist||[]; P.mixHist.unshift({date:todayStr(),ok,tot:n,pct}); if(P.mixHist.length>30) P.mixHist.length=30; save();
    if(pct===100){ rwd=REWARD.mix100; rmsg="パーフェクト！"; } else if(pct>=90){ rwd=REWARD.mix90; rmsg="90%以上達成！"; }
    if(rwd>0) earn(rwd, rmsg, true);
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
      } else if(pct===100){
        rmsg = "全問正解！（この周の報酬は受取済み）";
      }
      checkMastery(c);
    }
  } else if(curContent){ checkMastery(curContent); }
  const grade = pct===100?"💯":pct>=80?"🌟":pct>=50?"👍":"📖";
  $("#scr-quiz").innerHTML=`
    <div class="result">
      <div class="big">${grade}</div>
      <div class="score">${ok} / ${n} 正解（${pct}%）</div>
      ${rwd>0?`<div class="rwd"><img src="../XEVA.png" alt="">＋${rw(rwd)} XEVA${campaignActive()?' <span style="font-size:.7em;color:#e0157a;font-weight:800">🌻夏キャン2倍!</span>':''}</div>`:""}
      <div class="acts">
        <button onclick="lexBack()">もどる</button>
        <button class="pri" onclick="${quiz.src==="mix"?"lexMix()":quiz.src==="confirm"?`lexConfirmTest('${quiz.cid}')`:"lexStartQuiz()"}">もう一度</button>
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
        ${volumeMult(c.total)>1?`（${c.total}問のボリュームボーナス <b>×${volumeMult(c.total)}</b>）`:""}${campaignActive()?" 🌻夏キャン2倍込み":""}。
        ${got?"この周では受け取り済みです（リセットするともう一度もらえます）。何度でも挑戦できます。":"1問でもまちがえると報酬はありません。"}
      </p>
      <button class="mode-btn primary" style="margin:0" onclick="lexConfirmTest('${c.id}')">
        <div class="mi">🎓</div><div class="bd"><b>確認テストを受ける</b><p>全${c.total}問・${got?"報酬は受取済み":"全問正解で XEVA"}</p></div><div class="go">→</div>
      </button>
    </div>`;
}
window.lexConfirmTest = (id) => {
  const c = findContent(id); if(!c || !canConfirm(c)) return;
  curContent = c;
  /* 全問を出す。buildQuizItems は「未習得優先で count 問」なので、
     count に総数を渡せば結果的に全問が入る。 */
  quiz = { items: buildQuizItems(c, c.total), idx:0, ok:0, src:"confirm", cid:c.id };
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
    rows=c.sec.questions.map((q,i)=>`<div class="qa-row"><div class="qa-q">${esc(q.stem)}${q.reading?` <span class="qa-r">${esc(q.reading)}</span>`:""} ${m[i]&&m[i].m?'<span class="star">✓</span>':''}</div><div class="qa-a">${esc(q.answer)}</div>${q.extra?`<div class="qa-ex">${esc(q.extra)}</div>`:""}</div>`).join("");
  }
  $("#scr-wordlist").innerHTML=`
    <div class="back-row"><button class="back-btn" onclick="lexBack()">←</button><h2>${c.type==="word"?"📋":"📖"} ${esc(c.name)}</h2></div>
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
    ${(P.mixHist&&P.mixHist.length)?`<div class="h-sec">最近のミックス結果</div>
      <div class="list">${P.mixHist.slice(0,8).map(h=>`<div class="word-row"><div class="w">${h.date}</div><div class="m">${h.ok}/${h.tot} 正解</div><div class="star">${h.pct}%</div></div>`).join("")}</div>`:""}`;
  renderTop();
}

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
window.lexReset=()=>{ if(confirm("学習進捗をすべてリセットしますか？（XEVA残高は維持されます）")){ P=freshProgress(); save(); toast("進捗をリセットしました"); render("settings"); } };

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
    { ic:"📅", color:"#3aa6a0", title:"デイリー学習",       sub:"毎日プレイするたびに",                rew:rewHTML(REWARD.daily) },
    { ic:"🎖️", color:"#2e8bff", title:"ミッション達成",     sub:"はじめてクイズに挑戦すると（1回だけ）", rew:rewHTML(150) },
    { ic:"🏆", color:"#c79a2e", title:"セクション完全習得", sub:"全問マスターで一気に",                rew:rewHTML(REWARD.master) },
    { ic:"🎓", color:"#2e8fc7", title:"確認テスト",           sub:"完全習得した全問テストに 全問正解で", rew:rewHTML(REWARD.confirm) },
    { ic:"📚", color:"#8a5bd2", title:"ボリュームボーナス", sub:`完全習得したとき 50問以上は ×2 ／ 100問以上は`, rew:'<b class="lh-new">×3 !</b>' },
    { ic:"💯", color:"#d96a93", title:"ミックス問題",       sub:`90%以上 ${camp?"+"+REWARD.mix90*CAMPAIGN.mult:"+"+REWARD.mix90} ／ 100%なら`, rew:rewHTML(REWARD.mix100) },
  ];
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
function grantDaily(){ const t=todayStr(); if(P.daily===t) return; P.daily=t; save(); earn(REWARD.daily, "デイリーボーナス！", true); }
function firstRegister(){ if(P.registered) return; P.registered=true; save(); earn(REWARD.reg, "MagiLex 登録ボーナス！", true); }

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
  try{ checkMizukiUnlock(); }catch(e){}
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

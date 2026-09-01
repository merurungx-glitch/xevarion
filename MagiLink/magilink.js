// ============================================================
// MagiLink v3 — リアルタイムメッセンジャー (MagiOne Series)
//   Firebase Realtime Database 常時同期
//   機能: ロビー/DM/グループ/掲示板/友達申請・承認/プロフィール編集・閲覧/
//        誕生日お祝い/画像・ファイル・フォルダ・絵文字送信/リアクション/
//        プレゼンス/ホストモデレーション/アクセスコード/個別パスワード
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getDatabase, ref, push, set, update, remove, get, onValue,
  query, orderByChild, limitToLast, equalTo, onDisconnect, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const firebaseConfig = {
  /* ★★ 2026-08-20 magilink-63067 から <b>xevarion-online</b> へ移した。
     XEVARION が使う Firebase を firebase-rules/ の4つにそろえるため。
     ★ プロジェクト間でデータは移らない。
       古い magilink-63067 に入っていたメッセージ・友達・掲示板は
       <b>引き継がれず、まっさらから始まる</b>（移すなら手で書き出して入れ直す）。
     ★ 使うノード（board / friendRequests / friends / groups / messages /
       sentReq / users）は xevarion-online の rooms・scores・mcp とぶつからない。
       ルールは firebase-rules/xevarion-online.rules.json に足してある。 */
  apiKey: "AIzaSyAivkOwjWlmqJSNmnSjOs4-PUAcVFOfbiY",
  authDomain: "xevarion-online.firebaseapp.com",
  databaseURL: "https://xevarion-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "xevarion-online",
  storageBucket: "xevarion-online.firebasestorage.app",
  messagingSenderId: "513584168485",
  appId: "1:513584168485:web:d2a009325df677b746c9cc",
  measurementId: "G-28C5G2BFR5"
};
/* ★ 2026-08-20 名前を付ける。
   同じページで別の Firebase を使うものが増えたときに、
   名無し（[DEFAULT]）どうしがぶつかって落ちるのを防ぐため。 */
const app = initializeApp(firebaseConfig, "magilink");
const db = getDatabase(app);
import("https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js")
  .then((m) => { try { m.getAnalytics(app); } catch (e) {} }).catch(() => {});

// ---- 定数 ----
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-01 アクセスコードを<b>一時的に</b>不要にしました（ご指定）
   ------------------------------------------------------------
   ACCESS_OFF を <b>true</b> にしているあいだは、開いてすぐ中に入れます。
   ★ もどすときは <b>false に戻すだけ</b>（コードそのものは消していません）。
   ★ ホストの管理画面（hostAccess）のコードは<b>そのまま残して</b>あります——
     あちらは全員のデータを消せる画面なので、開けたままにはしない。
   ══════════════════════════════════════════════════════════════ */
const ACCESS_OFF = true;
const ACCESS_CODE = "ML613Connect26";
const DELETE_CODE = "ML613Delete26";
const APP_VERSION = "2026.06.14";
const LS_ACCESS = "magilink_access";
const LS_ACCOUNT = "magilink_account";
const LS_UNLOCK = "magilink_unlocked_uid";   // パスワードロックをこのセッションで解除済み

const AVATARS = ["🦊","🐧","🐼","🐯","🦄","🐙","🐸","🐵","🦉","🐳","🦔","🐰","😎","🤖","👾","🐲"];
const COLORS  = ["#5b8cff","#ff5b9e","#2de2e6","#b15bff","#ffba49","#34d399","#ff7a59","#7c9cff"];
const REACTIONS = ["👍","❤️","😂","🎉","😮","😢","🙏","🔥"];
const EMOJIS = ["😀","😁","😂","🤣","😊","😍","😘","😎","🤔","😴","😭","😡","👍","🙏","👏","🙌","🔥","✨","🎉","💯","❤️","💙","💜","💚","⭐","🌈","🍰","🎂","☕","🍺","⚽","🎮","📚","✅","❓","💡"];
const MAX_ATTACH = 700 * 1024; // 約700KB

// ---- 状態 ----
let me = null;
let allUsers = {}, myFriends = {}, myReqs = {}, mySent = {};
let pickedAvatar = AVATARS[0], pickedAvatarType = "emoji", pickedColor = COLORS[0];
let editAvatar = "", editAvatarType = "emoji", editColor = "";
let currentChat = null;          // {kind:'lobby'|'dm'|'group', id, path, title}
let offMessages = null;          // 現在のチャットの購読解除
let pendingAttach = null;        // {image}|{file}|{files}
let pendingBoardImg = null;
let reactTarget = null;          // {scope, msgId}
let loggingOut = false;

const $ = (id) => document.getElementById(id);
const esc = (s) => (s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const shake = (id) => { const el = $(id); if (!el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };
const show = (id) => $(id).classList.add("show");
const hide = (id) => $(id).classList.remove("show");
function timeStr(ts){ if(!ts) return ""; const d=new Date(ts); return d.toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}); }
function fmtSize(n){ if(n<1024) return n+"B"; if(n<1048576) return (n/1024).toFixed(0)+"KB"; return (n/1048576).toFixed(1)+"MB"; }
function hashStr(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0; return "h"+h.toString(36); }
function toggleEye(input, btn){ const s=input.type==="password"; input.type=s?"text":"password"; btn.textContent=s?"隠す":"表示"; input.focus(); }
function todayMMDD(){ const d=new Date(); return String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function bdayMMDD(b){ return b? b.slice(5) : ""; }

// アバター表示HTML
function avHTML(u){
  if(u && u.avatarType==="img" && u.avatar) return `<img src="${u.avatar}" alt="">`;
  return esc((u&&u.avatar)||"🙂");
}
function avBG(u){ return (u&&u.color? u.color:"#5b8cff")+"22"; }

// 画像リサイズ → dataURL
function resizeImage(file, maxDim=800, quality=0.72){
  return new Promise((res,rej)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{
      let {width:w,height:h}=img;
      if(w>h && w>maxDim){ h=h*maxDim/w; w=maxDim; } else if(h>maxDim){ w=w*maxDim/h; h=maxDim; }
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg",quality));
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error("画像の読み込みに失敗")); };
    img.src=url;
  });
}
function readFileB64(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res({name:file.name,mime:file.type||"application/octet-stream",size:file.size,data:r.result}); r.onerror=rej; r.readAsDataURL(file); });
}

// ============================================================
// 起動: スプラッシュ → アクセスゲート
// ============================================================
/* スプラッシュは ../xeva-splash.js（全アプリ共通）。閉じたらアクセスゲートへ */
if (window.XevaSplash) XevaSplash.done().then(initAccess);
else window.addEventListener("DOMContentLoaded", initAccess, { once: true });

// ============================================================
// アクセスゲート
// ============================================================
function initAccess(){
  /* ★★ 2026-09-01 一時的にアクセスコード不要（ACCESS_OFF）。ゲートを出さずにそのまま中へ */
  if(ACCESS_OFF){ try{ localStorage.setItem(LS_ACCESS,APP_VERSION); }catch(e){} hide("access"); initAccount(); return; }
  if(localStorage.getItem(LS_ACCESS)===APP_VERSION){ initAccount(); return; }
  show("access");
  $("accessGo").addEventListener("click", submitAccess);
  $("accessInput").addEventListener("keydown",(e)=>{ if(e.key==="Enter") submitAccess(); else $("accessMsg").textContent=""; });
  $("accessEye").addEventListener("click",()=>toggleEye($("accessInput"),$("accessEye")));
  setTimeout(()=>$("accessInput").focus(),100);
}
function submitAccess(){
  if($("accessInput").value===ACCESS_CODE){ localStorage.setItem(LS_ACCESS,APP_VERSION); hide("access"); initAccount(); }
  else { $("accessMsg").textContent="アクセスコードが正しくありません。"; shake("accessCard"); $("accessInput").select(); }
}

// ============================================================
// アカウント
// ============================================================


/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-01 ユーザーを<b>一度だけ全部リセット</b>する（ご指定）
   ------------------------------------------------------------
   ・users（と friends / friendRequests / sentReq）を<b>まるごと1回だけ</b>消し、
     そのあとは<b>アプリを開いた人から順に</b>作り直される
     （XEVARION アカウントから自動でつくられるので、開くだけで入る）。
   ・消すのは<b>いちばん最初に開いた1台だけ</b>。印（ml_reset_v3）はサーバー側にも置くので、
     2台目からは消さずに自分のぶんを作り直すだけになる。
   ★ 会話（messages / lobby / dm / groups）は<b>消さない</b>。
     「ユーザーを一度リセット」というご指定なので、名簿だけを作り直す。
   ★ この印を書き換えれば、また1回だけリセットできる。
   ══════════════════════════════════════════════════════════════ */
const ML_RESET_KEY = "ml_reset_v3";
async function resetAllUsersOnce(){
  if(localStorage.getItem(ML_RESET_KEY)) return;
  localStorage.setItem(ML_RESET_KEY,"1");
  try{
    /* サーバーにも印を置く。ほかの端末は「もう済んでいる」と分かるので消しに行かない */
    const mark=await get(ref(db,"meta/"+ML_RESET_KEY));
    if(mark.exists()) return;
    await set(ref(db,"meta/"+ML_RESET_KEY),{at:Date.now()});
    await Promise.all([
      set(ref(db,"users"),null),
      set(ref(db,"friends"),null),
      set(ref(db,"friendRequests"),null),
      set(ref(db,"sentReq"),null),
    ]);
  }catch(e){}
  /* 自分の端末の紐づけも外す（次の行で XEVARION アカウントから作り直される） */
  try{
    localStorage.removeItem(LS_ACCOUNT); localStorage.removeItem(LS_UNLOCK);
    const xaRaw=localStorage.getItem("xeva_account_v1");
    if(xaRaw){ const o=JSON.parse(xaRaw); delete o.mlUid; localStorage.setItem("xeva_account_v1",JSON.stringify(o)); }
  }catch(e){}
}

async function initAccount(){
  /* ★★ 2026-09-01 一度だけ全ユーザーをリセット（ご指定）。開いた人から順に入り直す */
  await resetAllUsersOnce();
  // ── 一度だけ旧アカウント（絵文字アバターのまま自動作成されたもの）を削除してリセット
  if(!localStorage.getItem("ml_avatar_synced_v2")){
    localStorage.setItem("ml_avatar_synced_v2","1");
    try{
      const xa=JSON.parse(localStorage.getItem("xeva_account_v1")||"null");
      if(xa&&xa.mlUid&&xa.charFile){
        await deleteAccount(xa.mlUid);
        const xaRaw=localStorage.getItem("xeva_account_v1");
        if(xaRaw){ const xaObj=JSON.parse(xaRaw); delete xaObj.mlUid; localStorage.setItem("xeva_account_v1",JSON.stringify(xaObj)); }
        localStorage.removeItem(LS_ACCOUNT); localStorage.removeItem(LS_UNLOCK);
      }
    }catch(e){}
  }
  const saved=JSON.parse(localStorage.getItem(LS_ACCOUNT)||"null");
  if(saved&&saved.uid){
    try{
      const snap=await get(ref(db,"users/"+saved.uid));
      if(snap.exists()){
        me=Object.assign({uid:saved.uid,secret:saved.secret},snap.val());
        if(me.pwHash && localStorage.getItem(LS_UNLOCK)!==me.uid){ showLock(); return; }
        enterApp(); return;
      }
    }catch(e){}
    localStorage.removeItem(LS_ACCOUNT);
  }
  // XEVARIONアカウントと連携
  try{
    var xa=JSON.parse(localStorage.getItem("xeva_account_v1")||"null");
    if(xa&&xa.mlUid){
      // mlUid保存済み → 自動ログイン
      const snap=await get(ref(db,"users/"+xa.mlUid));
      if(snap.exists()){
        me=Object.assign({uid:xa.mlUid,secret:""},snap.val());
        localStorage.setItem(LS_ACCOUNT,JSON.stringify({uid:xa.mlUid,secret:""}));
        localStorage.setItem(LS_UNLOCK,xa.mlUid);
        enterApp(); return;
      }
    }
    if(xa&&xa.setupDone&&xa.name){
      // XEVARIONアカウントはあるがmlUid未設定 → 自動作成
      await autoCreateFromXevarion(xa); return;
    }
  }catch(e){}
  showCreate();
}

async function isNameTaken(name){
  name=(name||"").trim();
  if(!name) return false;
  try{
    const snap=await get(query(ref(db,"users"),orderByChild("name"),equalTo(name)));
    return snap.exists();
  }catch(e){
    // クエリ失敗時は全ユーザーを読んで確実に照合（重複を見逃さない）
    try{
      const all=await get(ref(db,"users")); let taken=false;
      all.forEach((c)=>{ const u=c.val(); if(u&&(u.name||"").trim()===name) taken=true; });
      return taken;
    }catch(e2){ return false; }
  }
}

// 表示名から既存ユーザーの uid を1件取得（名前はグローバル一意なので自分自身のはず）
async function findUserByName(name){
  name=(name||"").trim(); if(!name) return null;
  try{
    const snap=await get(query(ref(db,"users"),orderByChild("name"),equalTo(name)));
    let uid=null; snap.forEach((c)=>{ if(!uid) uid=c.key; }); return uid;
  }catch(e){
    try{ const all=await get(ref(db,"users")); let uid=null;
      all.forEach((c)=>{ const u=c.val(); if(!uid&&u&&(u.name||"").trim()===name) uid=c.key; }); return uid;
    }catch(e2){ return null; }
  }
}

async function autoCreateFromXevarion(xa){
  // すでに同名ユーザーが Firebase 上に居れば、新規作成せずそれを採用（別人を増やさない）
  if(xa.name){
    const existingUid=await findUserByName(xa.name);
    if(existingUid){
      try{
        const snap=await get(ref(db,"users/"+existingUid));
        if(snap.exists()){
          me=Object.assign({uid:existingUid,secret:""},snap.val());
          localStorage.setItem(LS_ACCOUNT,JSON.stringify({uid:existingUid,secret:""}));
          localStorage.setItem(LS_UNLOCK,existingUid);
          const xaRaw=localStorage.getItem("xeva_account_v1");
          if(xaRaw){ const o=JSON.parse(xaRaw); o.mlUid=existingUid; localStorage.setItem("xeva_account_v1",JSON.stringify(o)); }
          enterApp(); return;
        }
      }catch(e){}
    }
  }
  const node=push(ref(db,"users")); const uid=node.key;
  // XEVARIONキャラ画像URLをアバターに設定
  let avatar=AVATARS[0], avatarType="emoji";
  if(xa.charFile){
    avatar=mlCharUrl(xa.charFile, xa.charId);
    avatarType="img";
  }
  const data={
    name:xa.name, avatar, avatarType, color:COLORS[0],
    bio:"", bday:xa.bday||"", pwHash:"",
    /* ★★ 2026-09-01 XEVARION の uid を持たせる。
       これがあると「MagiLink の友達＝XEVARION の友達」を突き合わせられる（ご指定）。 */
    xvUid: xa.xvUid || "",
    charFile: xa.charFile || "", charId: xa.charId || "",
    online:true, lastSeen:serverTimestamp(), createdAt:serverTimestamp(), source:"xevarion"
  };
  try{ await set(node,data); }catch(e){ showCreate(); return; }
  me=Object.assign({uid,secret:""},data);
  localStorage.setItem(LS_ACCOUNT,JSON.stringify({uid,secret:""}));
  localStorage.setItem(LS_UNLOCK,uid);
  // XEVARIONアカウントにmlUidを書き戻す
  try{
    const xaRaw=localStorage.getItem("xeva_account_v1");
    if(xaRaw){ const xaObj=JSON.parse(xaRaw); xaObj.mlUid=uid; localStorage.setItem("xeva_account_v1",JSON.stringify(xaObj)); }
  }catch(e){}
  // MagiLink登録ミッション達成 (+150 XEVA)
  try{
    const wk="xeva_wallet_v1"; const w=JSON.parse(localStorage.getItem(wk)||"{}");
    if(!w.missions) w.missions={};
    if(!w.missions["magilink_register"]){
      w.missions["magilink_register"]=Date.now();
      w.balance=(w.balance||0)+150;
      w.history=w.history||[];
      w.history.unshift({amount:150,reason:"ミッション達成：MagiLink に登録しよう",t:Date.now()});
      localStorage.setItem(wk,JSON.stringify(w));
    }
  }catch(e){}
  enterApp();
}

// ---- パスワードロック（再訪） ----
function showLock(){
  $("lockName").textContent=me.name+" さん、おかえりなさい";
  const av=$("lockAv"); av.innerHTML=avHTML(me); av.style.background=avBG(me);
  show("lock");
  $("lockGo").addEventListener("click",tryLock);
  $("lockInput").addEventListener("keydown",(e)=>{ if(e.key==="Enter") tryLock(); else $("lockMsg").textContent=""; });
  $("lockEye").addEventListener("click",()=>toggleEye($("lockInput"),$("lockEye")));
  setTimeout(()=>$("lockInput").focus(),100);
}
function tryLock(){
  if(hashStr($("lockInput").value)===me.pwHash){ localStorage.setItem(LS_UNLOCK,me.uid); hide("lock"); enterApp(); }
  else { $("lockMsg").textContent="パスワードが正しくありません。"; shake("lockCard"); $("lockInput").select(); }
}

// ---- 作成 ----
function buildPicker(container, type){
  const ap=$(container); ap.innerHTML="";
  AVATARS.forEach((a,i)=>{ const b=document.createElement("button"); b.type="button"; b.className="pick"+(i===0&&type==="create"?" sel":""); b.textContent=a;
    b.addEventListener("click",()=>{ if(type==="create"){pickedAvatar=a;pickedAvatarType="emoji";$("avPrev").innerHTML=a;$("avPrev").style.background="";} else {editAvatar=a;editAvatarType="emoji";$("eAvPrev").innerHTML=a;$("eAvPrev").style.background="";}
      ap.querySelectorAll(".pick").forEach(x=>x.classList.remove("sel")); b.classList.add("sel"); }); ap.appendChild(b); });
}
function buildColors(container,type){
  const cp=$(container); cp.innerHTML="";
  COLORS.forEach((c,i)=>{ const b=document.createElement("button"); b.type="button"; b.className="pick color"+(i===0&&type==="create"?" sel":""); b.innerHTML=`<span style="background:${c}"></span>`;
    b.addEventListener("click",()=>{ if(type==="create")pickedColor=c; else editColor=c; cp.querySelectorAll(".pick").forEach(x=>x.classList.remove("sel")); b.classList.add("sel"); }); cp.appendChild(b); });
}
function xaCharAvatar(){
  try{
    const xa=JSON.parse(localStorage.getItem("xeva_account_v1")||"null");
    if(xa&&xa.charFile) return { avatar:mlCharUrl(xa.charFile, xa.charId), avatarType:"img" };
  }catch(e){}
  return { avatar:AVATARS[0], avatarType:"emoji" };
}
function showCreate(){
  buildColors("colorPicker","create");
  const {avatar} = xaCharAvatar();
  const prev=$("avPrev");
  prev.innerHTML=`<img src="${avatar}" alt="">`;
  $("createGo").addEventListener("click",createAccount);
  $("nameInput").addEventListener("keydown",(e)=>{ if(e.key==="Enter") createAccount(); });
  try{
    const xa=JSON.parse(localStorage.getItem("xeva_account_v1")||"null");
    if(xa&&xa.name) $("nameInput").value=xa.name;
    if(xa&&xa.setupDone&&xa.name){ createAccount(); return; }
  }catch(e){}
  show("create"); setTimeout(()=>$("nameInput").focus(),100);
}
async function createAccount(){
  const name=$("nameInput").value.trim();
  if(!name){ $("createMsg").textContent="表示名を入力してください。"; shake("createCard"); return; }
  $("createMsg").textContent="確認中…"; $("createGo").disabled=true;
  if(await isNameTaken(name)){ $("createMsg").textContent="すでに登録済みの名前です。"; shake("createCard"); $("createGo").disabled=false; return; }
  $("createGo").disabled=false; $("createMsg").textContent="";
  const pw=$("pwInput").value;
  const {avatar,avatarType}=xaCharAvatar();
  const secret=Math.random().toString(36).slice(2)+Date.now().toString(36);
  const node=push(ref(db,"users")); const uid=node.key;
  const data={ name, avatar, avatarType, color:pickedColor,
    bio:$("bioInput").value.trim()||"", bday:$("bdayInput").value||"",
    pwHash: pw? hashStr(pw):"", online:true, lastSeen:serverTimestamp(), createdAt:serverTimestamp() };
  try{ await set(node,data); }catch(e){ $("createMsg").textContent="作成に失敗しました。通信環境をご確認ください。"; return; }
  me=Object.assign({uid,secret},data);
  localStorage.setItem(LS_ACCOUNT,JSON.stringify({uid,secret}));
  localStorage.setItem(LS_UNLOCK,uid);
  try{ if(window.XEVA){ const rw=window.XEVA.completeMission("magilink_register"); if(rw>0) alert("🎉 XEVARION ミッション達成！\n+"+rw+" XEVA を獲得しました。"); } }catch(e){}
  hide("create"); enterApp();
}

// ============================================================
// アプリ本体
// ============================================================
/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-01 友達を <b>XEVARION と1本</b>にする（ご指定）
   ------------------------------------------------------------
   これまで MagiLink の友達は MagiLink の DB（friends/…）だけにあり、
   XEVARION の🌐コミュニティの友達とは<b>別のもの</b>だった。
   → <b>正は XEVARION のアカウント（accounts/{uid}/friends）</b>にして、
     MagiLink の friends/… は<b>その写し</b>にする。
       ・アプリを開くたびに XEVARION の友達を読み、MagiLink 側をそろえる
       ・MagiLink で「申請・承認・解除」したら <b>XEVARION 側を書き換える</b>
         （そのあと写しを作り直す）
   ★ 突き合わせのカギは<b>ユーザーに持たせた xvUid</b>。
     2026-09-01 のリセットで、全員が XEVARION アカウントから作り直されるので必ず入る。
   ★ XEVARION につながらないとき（オフライン）は<b>何もしない</b>——
     写しをうっかり空にすると友達が消えたように見えるため。
   ══════════════════════════════════════════════════════════════ */
function xvUidOfMe(){
  try{ const a=JSON.parse(localStorage.getItem("xeva_account_v1")||"null"); return (a&&a.xvUid)||""; }catch(e){ return ""; }
}
function whenXFB(timeout){
  return new Promise((res)=>{
    if(window.XEVARIONFB) return res(window.XEVARIONFB);
    let done=false; const fin=()=>{ if(!done){ done=true; res(window.XEVARIONFB||null); } };
    window.addEventListener("xevarionfb:ready",fin,{once:true});
    setTimeout(fin,timeout||6000);
  });
}
/* XEVARION の uid → MagiLink の uid（allUsers から引く） */
function mlUidOfXv(xv){
  if(!xv) return null;
  const ids=Object.keys(allUsers||{});
  for(const id of ids){ const u=allUsers[id]; if(u&&u.xvUid===xv) return id; }
  return null;
}
let _friendSyncing=false;
async function syncFriendsFromXevarion(){
  if(_friendSyncing) return; _friendSyncing=true;
  try{
    const myXv=xvUidOfMe(); if(!myXv || !me) return;
    const FB=await whenXFB(); if(!FB||!FB.listFriends) return;
    const rows=await FB.listFriends(myXv);
    if(!Array.isArray(rows)) return;                       /* 読めなかった＝そろえない */
    /* XEVARION の友達を MagiLink の uid に置きかえる */
    const want={};
    rows.forEach((r)=>{ const ml=mlUidOfXv(r.uid); if(ml && ml!==me.uid) want[ml]=true; });
    const have=myFriends||{};
    const upd={};
    Object.keys(want).forEach((id)=>{ if(!have[id]){ upd["friends/"+me.uid+"/"+id]=true; upd["friends/"+id+"/"+me.uid]=true; } });
    Object.keys(have).forEach((id)=>{ if(!want[id]){ upd["friends/"+me.uid+"/"+id]=null; upd["friends/"+id+"/"+me.uid]=null; } });
    if(Object.keys(upd).length) await update(ref(db),upd);
    /* 申請も XEVARION 側が正。MagiLink 側の古い申請は消しておく */
    if(FB.listFriendReqs){
      const reqs=await FB.listFriendReqs(myXv);
      if(Array.isArray(reqs)){
        const rupd={};
        const wantReq={};
        reqs.forEach((r)=>{ const ml=mlUidOfXv(r.uid); if(ml) wantReq[ml]={name:(allUsers[ml]||{}).name||r.name||"?",at:Date.now()}; });
        Object.keys(myReqs||{}).forEach((id)=>{ if(!wantReq[id]) rupd["friendRequests/"+me.uid+"/"+id]=null; });
        Object.keys(wantReq).forEach((id)=>{ if(!(myReqs||{})[id]) rupd["friendRequests/"+me.uid+"/"+id]=wantReq[id]; });
        if(Object.keys(rupd).length) await update(ref(db),rupd);
      }
    }
  }catch(e){}finally{ _friendSyncing=false; }
}
/* MagiLink の uid → XEVARION の uid */
function xvUidOfMl(mlUid){ const u=allUsers[mlUid]; return (u&&u.xvUid)||""; }

function enterApp(){
  show("app");
  // XEVARION アカウントを唯一のプロフィール源として同期（名前・アイコン・誕生日）
  try{
    const xa=JSON.parse(localStorage.getItem("xeva_account_v1")||"null");
    if(xa){
      const {avatar,avatarType}=xaCharAvatar();
      const upd={};
      if(xa.name && xa.name!==me.name) upd.name=xa.name;
      if(avatarType==="img" && (me.avatar!==avatar || me.avatarType!=="img")){ upd.avatar=avatar; upd.avatarType=avatarType; }
      if((xa.bday||"")!==(me.bday||"")) upd.bday=xa.bday||"";
      /* ★★ 2026-09-01 XEVARION の uid をユーザーに持たせる（友達を1本にするカギ）。
         むかし作られたユーザーには入っていないので、開いたときに足しておく。 */
      if(xa.xvUid && me.xvUid!==xa.xvUid) upd.xvUid=xa.xvUid;
      if(xa.charFile && me.charFile!==xa.charFile) upd.charFile=xa.charFile;
      if(xa.charId && me.charId!==xa.charId) upd.charId=xa.charId;
      if(Object.keys(upd).length){ update(ref(db,"users/"+me.uid),upd); Object.assign(me,upd); }
    }
  }catch(e){}
  // 自分のコレクション（XEVARION ガチャ所持キャラ）を Firebase に同期
  syncMyCollection();
  setupPresence(); watchSelf(); watchUsers(); watchFriends(); watchRequests(); watchSent(); watchGroups(); watchBoard();
  wireNav(); wireChat(); wireComposerExtras(); wireFriends(); wireBoard(); wireProfile(); wireModals();
  const cs=$("collSearch"); if(cs) cs.addEventListener("input",renderCollections);
  // XEVARION 側でガチャを引いて戻ってきた時にも再同期
  window.addEventListener("focus",syncMyCollection);
  /* ★★ 2026-09-01 友達は XEVARION が正。開いたとき・戻ってきたときにそろえ直す */
  try{ syncFriendsFromXevarion(); }catch(e){}
  window.addEventListener("focus",()=>{ try{ syncFriendsFromXevarion(); }catch(e){} });
  window.addEventListener("storage",(e)=>{ if(e.key==="xeva_gacha_v1"||e.key==="xeva_account_v1") syncMyCollection(); });
  window.mlGoTo = (v)=>{ if(v==="lobby"){ openChat("lobby","","ロビー","みんなが集まる公開チャット"); } switchView(v); };
  renderMyProfile(); renderHub();
  switchView("hub");
}

function setupPresence(){
  const r=ref(db,"users/"+me.uid);
  update(r,{online:true,lastSeen:serverTimestamp()});
  onDisconnect(r).update({online:false,lastSeen:serverTimestamp()});
  window.addEventListener("beforeunload",()=>{ try{ update(r,{online:false,lastSeen:Date.now()}); }catch(e){} });
}
function watchSelf(){
  onValue(ref(db,"users/"+me.uid),(snap)=>{
    if(!snap.exists()&&me&&!loggingOut){ alert("このアカウントは削除されました。"); localStorage.removeItem(LS_ACCOUNT); location.reload(); return; }
    if(snap.exists()){ me=Object.assign(me,snap.val()); try{ renderHub(); renderMyProfile(); }catch(e){} }
  });
}
function watchUsers(){
  onValue(ref(db,"users"),(snap)=>{ allUsers=snap.val()||{};
    /* ★★ 2026-09-01 名簿がそろってから XEVARION の友達を写す
       （xvUid → MagiLink の uid の突き合わせに名簿が要るため） */
    try{ syncFriendsFromXevarion(); }catch(e){}
    renderAllUsers(); renderDMList(); renderCollections(); if($("usersModal").classList.contains("show")) renderUsersModal();
    if($("profileModal").classList.contains("show")&&pvUid){ const pc=$("pvCollection"); if(pc&&allUsers[pvUid]) pc.innerHTML=collectionHTML(allUsers[pvUid]); }
    if(currentChat&&currentChat.kind==="lobby") renderBirthday();
  });
}
function watchFriends(){
  onValue(ref(db,"friends/"+me.uid),(snap)=>{ myFriends=snap.val()||{}; renderFriends(); renderDMList(); renderGroupMembersPicker(); });
}
function watchRequests(){
  onValue(ref(db,"friendRequests/"+me.uid),(snap)=>{ myReqs=snap.val()||{}; renderRequests();
    const n=Object.keys(myReqs).length; const b=$("reqBadge"); if(n>0){b.textContent=n;b.classList.add("show");}else b.classList.remove("show"); });
}
function watchSent(){
  // 自分が送信した友達申請（申請中表示用）
  onValue(ref(db,"sentReq/"+me.uid),(snap)=>{ mySent=snap.val()||{}; renderAllUsers();
    if($("profileModal").classList.contains("show")) refreshProfileAction(); });
}
function watchGroups(){
  onValue(ref(db,"groups"),(snap)=>{ const g=snap.val()||{}; window._groups=g; renderGroupList(); });
}
function watchBoard(){
  onValue(ref(db,"board"),(snap)=>{
    const obj=snap.val()||{};
    const list=Object.entries(obj)
      .map(([id,v])=>Object.assign({id},v))
      .filter(v=>v&&typeof v==="object"&&(v.uid||v.text||v.image))
      .sort((a,b)=>(b.ts||0)-(a.ts||0))
      .slice(0,100);
    renderBoard(list);
  });
}

// ---- ナビ ----
function wireNav(){
  /* ★ [data-view] 付きだけ。もどるリンク（.xv-back）は data-view を持たないので、
     ここで拾うと switchView(undefined) が走って画面が真っ白になる。 */
  document.querySelectorAll(".nav-btn[data-view]").forEach(b=>b.addEventListener("click",()=>{
    const v=b.dataset.view;
    if(v==="lobby"){ openChat("lobby","","ロビー","みんなが集まる公開チャット"); }
    switchView(v);
  }));
  $("chatBack").addEventListener("click",()=>switchView("talks"));
  $("lobbyRow").addEventListener("click",()=>{ openChat("lobby","","ロビー","みんなが集まる公開チャット"); switchView("lobby"); });
}
function switchView(v){
  const map={hub:"view-hub",lobby:"view-chat",chat:"view-chat",talks:"view-talks",friends:"view-friends",board:"view-board",collection:"view-collection",profile:"view-profile"};
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("show"));
  $(map[v]||"view-hub").classList.add("show");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===v || (v==="chat"&&b.dataset.view==="talks") || (v==="lobby"&&b.dataset.view==="lobby")));
  if(v==="profile") renderMyProfile();
  if(v==="collection") renderCollections();
  if(v==="hub") renderHub();
}
function renderHub(){
  const av=$("hubAv"); if(!av||!me) return;
  av.innerHTML=avHTML(me); av.style.background=avBG(me);
  $("hubName").textContent=me.name||"—";
}

// ============================================================
// チャット（ロビー / DM / グループ 共通）
// ============================================================
function chatPath(kind,id){ if(kind==="lobby") return "messages"; if(kind==="dm") return "dms/"+id+"/messages"; return "groups/"+id+"/messages"; }
function dmThread(a,b){ return [a,b].sort().join("__"); }

function openChat(kind,id,title,sub){
  if(offMessages){ offMessages(); offMessages=null; }
  currentChat={kind,id,path:chatPath(kind,id),title,sub:sub||""};
  $("chatTitle").textContent=title; $("chatSub").textContent=sub||"";
  $("chatBack").style.display=(kind==="lobby")?"none":"";
  $("chatInfo").style.display=(kind==="group")?"":"none";
  $("chatInfo").textContent="グループ設定";
  clearAttach();
  /* トークを切り替えたら、返信・検索・返信案はいったん解除する（前のトークの状態を持ち越さない） */
  cancelReply();
  searchQuery=""; lastList=[];
  const sw=$("mlSearchWrap"); if(sw) sw.classList.remove("show");
  const si=$("mlSearchInput"); if(si) si.value="";
  const sinfo=$("mlSearchInfo"); if(sinfo) sinfo.textContent="";
  const db2=$("mlDraftBar"); if(db2) db2.classList.remove("show");
  offMessages=onValue(ref(db,currentChat.path),(snap)=>{
    const box=$("messages"); const wrap=box.parentElement;
    const near=wrap.scrollHeight-wrap.scrollTop-wrap.clientHeight<140;
    const obj=snap.val()||{};
    const list=Object.entries(obj)
      .map(([id,v])=>Object.assign({id},v))
      .filter(v=>v&&typeof v==="object"&&(v.uid||v.text||v.image||v.file||v.files))
      .sort((a,b)=>(a.ts||0)-(b.ts||0))
      .slice(-300);
    renderMessages(list);
    if(near) wrap.scrollTop=wrap.scrollHeight;
  });
}

function renderBirthday(){
  const box=$("messages");
  const old=box.querySelector(".bday"); if(old) old.remove();
  const today=todayMMDD(); const cel=[];
  if(me.bday&&bdayMMDD(me.bday)===today) cel.push("あなた");
  Object.entries(allUsers).forEach(([uid,u])=>{ if(uid!==me.uid&&u&&u.bday&&bdayMMDD(u.bday)===today&&myFriends[uid]) cel.push(u.name); });
  if(cel.length&&currentChat&&currentChat.kind==="lobby"){
    const d=document.createElement("div"); d.className="bday";
    d.innerHTML=`🎂 <b>${esc(cel.join("・"))}</b> さん、お誕生日おめでとうございます！🎉`;
    box.prepend(d);
  }
}

function renderMessages(list){
  lastList=list;                                   // 検索・引用ジャンプで使い回す
  const box=$("messages"); box.innerHTML="";
  if(currentChat.kind==="lobby"&&!searchQuery) renderBirthday();
  /* トーク内検索（v4）: 絞り込み中は該当メッセージだけを出す */
  let view=list;
  if(searchQuery){
    const q=searchQuery.toLowerCase();
    view=list.filter(m=>((m.text||"")+" "+(m.name||"")).toLowerCase().indexOf(q)>=0);
    const info=$("mlSearchInfo");
    if(info) info.textContent=view.length? view.length+" 件見つかりました" : "見つかりませんでした";
  }
  if(!view.length){ const e=document.createElement("div"); e.className="day-sep";
    e.textContent=searchQuery?"該当するメッセージはありません":"まだメッセージはありません ✨"; box.appendChild(e); return; }
  let lastDay="";
  view.forEach(m=>{
    const day=m.ts? new Date(m.ts).toLocaleDateString("ja-JP",{month:"long",day:"numeric"}):"";
    if(day&&day!==lastDay){ lastDay=day; const s=document.createElement("div"); s.className="day-sep"; s.textContent=day; box.appendChild(s); }
    box.appendChild(buildMessage(m));
  });
}

function attachHTML(m){
  let h="";
  if(m.image) h+=`<img class="att-img" src="${m.image}" alt="画像" data-full="${m.image}">`;
  const files=m.files||(m.file?[m.file]:[]);
  files.forEach(f=>{ h+=`<a class="att-file" href="${f.data}" download="${esc(f.name)}"><span class="fi">📎</span><span style="min-width:0;"><span class="fn">${esc(f.name)}</span><br><span class="fs">${fmtSize(f.size||0)}</span></span></a>`; });
  return h;
}

function buildMessage(m){
  const mine=me&&m.uid===me.uid;
  const el=document.createElement("div"); el.className="m"+(mine?" me":""); el.dataset.id=m.id;
  const reacts=m.reactions||{}; const counts={}; let myReact=null;
  Object.entries(reacts).forEach(([uid,emo])=>{ counts[emo]=(counts[emo]||0)+1; if(me&&uid===me.uid) myReact=emo; });
  const reactHtml=Object.entries(counts).map(([emo,n])=>`<span class="react${myReact===emo?" mine":""}" data-emo="${emo}">${emo} ${n}</span>`).join("");
  /* 引用（v4）: どの発言への返信かを吹き出しの上に出す。タップで元の発言へ飛ぶ。 */
  const rt=m.replyTo;
  const quoteHtml=rt&&rt.id
    ? `<span class="quote" data-jump="${esc(rt.id)}"><b>${esc(rt.name||"")}</b>${esc((rt.text||"（添付）").slice(0,60))}${(rt.text||"").length>60?"…":""}</span>`
    : "";
  el.innerHTML=`
    <div class="av" data-uid="${esc(m.uid)}" style="background:${esc(m.color||'#5b8cff')}22;">${avHTML(m)}</div>
    <div class="bw">
      <div class="meta"><span class="nm" data-uid="${esc(m.uid)}" style="color:${esc(m.color||'#3f6ddb')}">${esc(m.name)}</span><span class="tm">${timeStr(m.ts)}</span></div>
      <div class="bubble">${quoteHtml}${esc(m.text||"")}${attachHTML(m)}</div>
      <div class="reacts">${reactHtml}</div>
      <div class="tools"><button class="tbtn msg-reply">↩ 返信</button><button class="tbtn react-add">＋ リアクション</button>${mine?'<button class="tbtn msg-del">削除</button>':''}</div>
    </div>`;
  el.querySelectorAll(".react").forEach(r=>r.addEventListener("click",()=>toggleReaction(currentChat.path,m.id,r.dataset.emo)));
  el.querySelector(".react-add").addEventListener("click",(e)=>openReactPop(e.currentTarget,currentChat.path,m.id));
  el.querySelector(".msg-reply").addEventListener("click",()=>startReply(m));
  const qv=el.querySelector(".quote"); if(qv) qv.addEventListener("click",()=>jumpTo(qv.dataset.jump));
  const del=el.querySelector(".msg-del"); if(del) del.addEventListener("click",()=>{ if(confirm("このメッセージを削除しますか？")) remove(ref(db,currentChat.path+"/"+m.id)); });
  el.querySelectorAll("[data-uid]").forEach(x=>x.addEventListener("click",()=>{ if(x.dataset.uid&&x.dataset.uid!==me.uid) openProfileView(x.dataset.uid); }));
  const img=el.querySelector(".att-img"); if(img) img.addEventListener("click",()=>{ $("imgFull").src=img.dataset.full; show("imgModal"); });
  return el;
}

// ---- リアクション（汎用: scope=path）----
function openReactPop(anchor,scope,msgId){
  reactTarget={scope,msgId}; const pop=$("reactPop");
  pop.innerHTML=REACTIONS.map(e=>`<button type="button" data-emo="${e}">${e}</button>`).join("");
  pop.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ toggleReaction(scope,msgId,b.dataset.emo); pop.classList.remove("show"); }));
  positionPop(pop,anchor);
}
function toggleReaction(scope,msgId,emo){
  const r=ref(db,scope+"/"+msgId+"/reactions/"+me.uid);
  // 現在値を取得して同じならトグルオフ
  get(r).then(s=>{ if(s.val()===emo) remove(r); else set(r,emo); });
}
function positionPop(pop,anchor){
  pop.classList.add("show"); const r=anchor.getBoundingClientRect(); const pw=pop.offsetWidth,ph=pop.offsetHeight;
  let left=r.left, top=r.top-ph-8; if(top<8) top=r.bottom+8; if(left+pw>innerWidth-8) left=innerWidth-pw-8;
  pop.style.left=Math.max(8,left)+"px"; pop.style.top=top+"px";
}
document.addEventListener("click",(e)=>{
  ["reactPop","emojiPop","attachPop"].forEach(id=>{ const p=$(id); if(p&&p.classList.contains("show")&&!p.contains(e.target)&&!e.target.closest(".react-add")&&e.target.id!=="emojiBtn"&&!e.target.closest("#attachBtn")) p.classList.remove("show"); });
});

// ---- 送信 ----
function wireChat(){
  const input=$("msgInput"), btn=$("sendBtn");
  input.addEventListener("keydown",(e)=>{ if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); sendMessage(); } });
  btn.addEventListener("click",sendMessage);
  $("chatInfo").addEventListener("click",()=>{ if(currentChat&&currentChat.kind==="group") openGroupSettings(currentChat.id); });
  /* v4 追加ぶんの配線 */
  const rc=$("mlReplyCancel"); if(rc) rc.addEventListener("click",cancelReply);
  wireSearch();
  wireDrafts();
  wireViewportH();
}
function sendMessage(){
  const input=$("msgInput"); const text=input.value.trim();
  if(!text&&!pendingAttach) return; if(!currentChat) return;
  const msg={ uid:me.uid, name:me.name, avatar:me.avatar, avatarType:me.avatarType, color:me.color, text, ts:serverTimestamp() };
  if(pendingAttach){ if(pendingAttach.image) msg.image=pendingAttach.image; if(pendingAttach.file) msg.file=pendingAttach.file; if(pendingAttach.files) msg.files=pendingAttach.files; }
  /* 引用返信（v4）: 元の発言のID・送信者・冒頭だけを持たせる（本文まるごとは持たない） */
  if(replyTo) msg.replyTo={ id:replyTo.id, name:replyTo.name||"", text:(replyTo.text||"").slice(0,120) };
  push(ref(db,currentChat.path),msg);
  input.value=""; clearAttach(); cancelReply(); input.focus();
}

/* ════════════════════════════════════════════════════════════
   v4 追加: 返信（引用）／トーク内検索／XEVYNAR の返信案
   ════════════════════════════════════════════════════════════ */
let replyTo=null;        // いま返信しようとしている相手の発言
let searchQuery="";      // トーク内検索の語
let lastList=[];         // いま表示しているメッセージ一覧（検索・ジャンプ用）

function startReply(m){
  replyTo={ id:m.id, name:m.name, text:m.text||"" };
  const bar=$("mlReplyBar"); if(!bar) return;
  $("mlReplyText").innerHTML="↩ <b>"+esc(m.name||"")+"</b> に返信： "+esc((m.text||"（添付）").slice(0,50));
  bar.classList.add("show");
  $("msgInput").focus();
}
function cancelReply(){ replyTo=null; const b=$("mlReplyBar"); if(b) b.classList.remove("show"); }

/* 引用をタップしたとき、元の発言までスクロールして光らせる */
function jumpTo(id){
  const box=$("messages"); if(!box) return;
  const t=box.querySelector('.m[data-id="'+CSS.escape(id)+'"]');
  if(!t){ alert("元のメッセージは表示範囲内にありません。"); return; }
  t.scrollIntoView({behavior:"smooth",block:"center"});
  t.classList.remove("hilite"); void t.offsetWidth; t.classList.add("hilite");
  setTimeout(()=>t.classList.remove("hilite"),1800);
}

function wireSearch(){
  const btn=$("mlSearchBtn"), wrap=$("mlSearchWrap"), inp=$("mlSearchInput");
  if(!btn||!wrap||!inp) return;
  btn.addEventListener("click",()=>{
    const on=wrap.classList.toggle("show");
    if(on){ inp.focus(); }
    else { inp.value=""; searchQuery=""; $("mlSearchInfo").textContent=""; renderMessages(lastList); }
  });
  let t=null;
  inp.addEventListener("input",()=>{
    clearTimeout(t);
    /* 日本語入力の変換中に走らせると途中の文字で検索してしまうので、少し待つ */
    t=setTimeout(()=>{ searchQuery=inp.value.trim(); renderMessages(lastList); },220);
  });
}

/* ── XEVYNAR の返信案 ──
   相手の直近の発言の口調（ていねい／くだけた・絵文字の有無・質問かどうか）に寄せて3案作る。
   同時に XEVYNAR 側の会話メモリ（xevynar_v1.link）にも覚えさせるので、
   XEVYNAR アプリで「〇〇への返信を考えて」と聞いても続きから答えられる。 */
function lastIncoming(){
  for(let i=lastList.length-1;i>=0;i--){ const m=lastList[i]; if(m.uid!==me.uid&&(m.text||"").trim()) return m; }
  return null;
}
function makeDrafts(msg){
  const t=String(msg||"");
  const polite=/(です|ます|ください|でしょうか|ですか)/.test(t);
  const emoji=/[\u{1F300}-\u{1FAFF}]/u.test(t)||/[！!]/.test(t);
  const ask=/[?？]|かな|どう|いつ|どこ|なに|何/.test(t);
  const clean=(s)=>emoji?s:s.replace(/[😊🙌✨]/g,"").trim();
  let d;
  if(ask){
    d=polite?["ありがとうございます！確認して、あとで連絡しますね😊","すみません、少し考えてから返信します！","大丈夫です！詳しく教えてもらえますか？"]
            :["ありがとう！あとで確認して連絡するね😊","ちょっと考えてから返すね！","いいよ！もう少し詳しく教えて？"];
  }else{
    d=polite?["ありがとうございます！助かりました😊","了解しました！こちらでも進めておきますね","うれしいです！またよろしくお願いします✨"]
            :["ありがとう！助かった😊","了解！こっちでも進めておくね","うれしい！またよろしく✨"];
  }
  return d.map(clean);
}
/* XEVYNAR に会話を覚えさせる（同じアカウントに紐づく localStorage 経由） */
function rememberForXevynar(m){
  try{
    const KEY="xevynar_v1";
    const S=JSON.parse(localStorage.getItem(KEY)||"null")||{};
    if(!S.link||typeof S.link!=="object") S.link={};
    const who=m.name||"相手";
    const e=S.link[who]||{msgs:[]};
    if(!Array.isArray(e.msgs)) e.msgs=[];
    if(!e.msgs.some(x=>x.t===m.text)){ e.msgs.push({who,t:m.text||"",at:m.ts||Date.now()}); }
    if(e.msgs.length>40) e.msgs=e.msgs.slice(-40);
    S.link[who]=e; S.updatedAt=Date.now();
    localStorage.setItem(KEY,JSON.stringify(S));
  }catch(e){}
}
function wireDrafts(){
  const btn=$("mlDraftBtn"), bar=$("mlDraftBar"), list=$("mlDraftList"), close=$("mlDraftClose");
  if(!btn||!bar||!list) return;
  close.addEventListener("click",()=>bar.classList.remove("show"));
  btn.addEventListener("click",()=>{
    const m=lastIncoming();
    if(!m){
      list.innerHTML='<button class="dopt" disabled>相手のメッセージがまだありません。届いてから押してください。</button>';
      bar.classList.add("show"); return;
    }
    rememberForXevynar(m);
    list.innerHTML=makeDrafts(m.text).map(d=>`<button class="dopt" type="button">${esc(d)}</button>`).join("");
    list.querySelectorAll(".dopt").forEach(b=>b.addEventListener("click",()=>{
      $("msgInput").value=b.textContent;      // そのまま送らず、入力欄に入れて確認してもらう
      bar.classList.remove("show");
      $("msgInput").focus();
    }));
    bar.classList.add("show");
  });
}

/* 入力欄が iOS のキーボードで隠れないように、見えている高さを CSS へ流し込む */
function wireViewportH(){
  const vv=window.visualViewport; if(!vv) return;
  const sync=()=>document.documentElement.style.setProperty("--ml-vph",Math.max(240,Math.round(vv.height))+"px");
  vv.addEventListener("resize",sync); vv.addEventListener("scroll",sync); sync();
}

// ---- 添付（画像/ファイル/フォルダ/絵文字）----
function wireComposerExtras(){
  $("emojiBtn").addEventListener("click",(e)=>openEmoji(e.currentTarget));
  // 添付メニュー（画像・ファイル・フォルダを1つの「＋」に集約）
  $("attachBtn").addEventListener("click",(e)=>{ const pop=$("attachPop"); positionPop(pop,e.currentTarget); });
  $("attachPop").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{
    $("attachPop").classList.remove("show");
    const t=b.dataset.att;
    if(t==="img") $("imgFile").click(); else if(t==="file") $("genFile").click(); else $("folderFile").click();
  }));
  $("imgFile").addEventListener("change",async(e)=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
    try{ const d=await resizeImage(f,1000,0.72); setAttach({image:d},`画像: ${f.name}`,d); }catch(err){ alert("画像処理に失敗しました"); } });
  $("genFile").addEventListener("change",async(e)=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
    if(f.size>MAX_ATTACH){ alert("ファイルが大きすぎます（約700KBまで）"); return; }
    const fo=await readFileB64(f); setAttach({file:fo},`ファイル: ${f.name} (${fmtSize(f.size)})`); });
  $("folderFile").addEventListener("change",async(e)=>{ const fs=[...e.target.files]; e.target.value=""; if(!fs.length) return;
    let total=0; const out=[]; for(const f of fs){ total+=f.size; if(total>MAX_ATTACH){ alert("フォルダの合計が大きすぎます（約700KBまで）。一部のみ送信します。"); break; } out.push(await readFileB64(f)); }
    if(out.length) setAttach({files:out},`フォルダ: ${out.length}件 (${fmtSize(total)})`); });
}
function setAttach(obj,label,thumb){
  pendingAttach=obj; const p=$("attachPrev");
  p.innerHTML=(thumb?`<img src="${thumb}" alt="">`:"📎")+`<span>${esc(label)}</span><button class="x" id="attachX">✕</button>`;
  p.classList.add("show"); $("attachX").addEventListener("click",clearAttach);
}
function clearAttach(){ pendingAttach=null; const p=$("attachPrev"); p.classList.remove("show"); p.innerHTML=""; }
function openEmoji(anchor){
  const pop=$("emojiPop"); pop.innerHTML=EMOJIS.map(e=>`<button type="button">${e}</button>`).join("");
  pop.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ $("msgInput").value+=b.textContent; $("msgInput").focus(); }));
  positionPop(pop,anchor);
}

// ============================================================
// 友達 / ユーザー
// ============================================================
function wireFriends(){
  $("usersBtn")&&$("usersBtn").addEventListener("click",()=>{ renderUsersModal(); show("usersModal"); });
  const s=$("friendSearch"); if(s) s.addEventListener("input",()=>{ renderFriends(); renderAllUsers(); });
}
function friendQuery(){ const s=$("friendSearch"); return s?s.value.trim().toLowerCase():""; }
/* ★★ 2026-09-01 解除は<b>XEVARION 側</b>を消してから写しを作り直す（ご指定） */
async function unfriendXv(uid){
  const myXv=xvUidOfMe(), otherXv=xvUidOfMl(uid);
  if(!myXv||!otherXv) return false;
  const FB=await whenXFB(); if(!FB||!FB.removeFriend) return false;
  try{ await FB.removeFriend(myXv,otherXv); }catch(e){ return false; }
  await syncFriendsFromXevarion();
  return true;
}
function unfriend(uid,name){
  if(!confirm((name||"この友達")+" さんとの友達を解除しますか？")) return;
  /* ★★ 2026-09-01 XEVARION 側も外す（友達は XEVARION が正） */
  unfriendXv(uid);
  const updates={}; updates["friends/"+me.uid+"/"+uid]=null; updates["friends/"+uid+"/"+me.uid]=null;
  update(ref(db),updates).catch((e)=>alert("解除に失敗しました: "+(e&&e.message?e.message:e)));
}

function renderRequests(){
  const box=$("reqList"); const keys=Object.keys(myReqs);
  if(!keys.length){ box.innerHTML='<div class="empty">新しい申請はありません</div>'; return; }
  box.innerHTML="";
  keys.forEach(fromUid=>{ const r=myReqs[fromUid]; const u=allUsers[fromUid]||{name:r.name};
    const row=document.createElement("div"); row.className="lrow";
    row.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div><div class="info"><div class="nm">${esc(u.name||r.name)}</div><div class="st">友達申請が届いています</div></div>
      <div class="act"><button class="mini pri" data-a="ok">承認</button><button class="mini" data-a="no">拒否</button></div>`;
    row.querySelector('[data-a="ok"]').addEventListener("click",()=>acceptFriend(fromUid,u.name||r.name));
    row.querySelector('[data-a="no"]').addEventListener("click",()=>{ const u2={}; u2["friendRequests/"+me.uid+"/"+fromUid]=null; u2["sentReq/"+fromUid+"/"+me.uid]=null; update(ref(db),u2); });
    box.appendChild(row);
  });
}
/* ★★ 2026-09-01 承認も XEVARION 側でやる（ご指定） */
async function acceptFriendXv(fromUid){
  const myXv=xvUidOfMe(), otherXv=xvUidOfMl(fromUid);
  if(!myXv||!otherXv) return false;
  const FB=await whenXFB(); if(!FB||!FB.acceptFriendReq) return false;
  try{ await FB.acceptFriendReq(myXv,otherXv); }catch(e){ return false; }
  await syncFriendsFromXevarion();
  return true;
}
function acceptFriend(fromUid){
  acceptFriendXv(fromUid);
  const updates={};
  updates["friends/"+me.uid+"/"+fromUid]=true;
  updates["friends/"+fromUid+"/"+me.uid]=true;
  updates["friendRequests/"+me.uid+"/"+fromUid]=null;
  updates["friendRequests/"+fromUid+"/"+me.uid]=null;
  updates["sentReq/"+fromUid+"/"+me.uid]=null;
  updates["sentReq/"+me.uid+"/"+fromUid]=null;
  update(ref(db),updates).then(()=>{
    try{
      if(window.XEVA){ const rw=window.XEVA.claimFriendBonus(fromUid); if(rw>0) console.log("+"+rw+" XEVA 友達追加ボーナス"); }
      else{
        const wk="xeva_wallet_v1"; const w=JSON.parse(localStorage.getItem(wk)||"{}");
        const key="friend_"+fromUid; w.missions=w.missions||{};
        if(!w.missions[key]){ w.missions[key]=Date.now(); w.balance=(w.balance||0)+50; w.history=w.history||[]; w.history.unshift({amount:50,reason:"友達追加ボーナス",t:Date.now()}); localStorage.setItem(wk,JSON.stringify(w)); }
      }
    }catch(e){}
  }).catch((e)=>alert("承認に失敗しました: "+(e&&e.message?e.message:e)));
}
function sendRequest(toUid,toName){
  if(toUid===me.uid) return;
  if(myFriends[toUid]){ alert("すでに友達です"); return; }
  if(mySent[toUid]) return; // 既に申請中
  mySent[toUid]=true; // 即時に「申請中」反映
  /* ★★ 2026-09-01 申請も XEVARION 側に出す（友達は XEVARION が正・ご指定）。
     相手からすでに申請が来ていれば XEVARION 側がその場で相互フレンドにしてくれる。 */
  (async()=>{
    const myXv=xvUidOfMe(), otherXv=xvUidOfMl(toUid);
    if(!myXv||!otherXv) return;
    const FB=await whenXFB(); if(!FB||!FB.sendFriendReq) return;
    try{ await FB.sendFriendReq(myXv,otherXv); await syncFriendsFromXevarion(); }catch(e){}
  })();
  const updates={};
  updates["friendRequests/"+toUid+"/"+me.uid]={name:me.name,ts:serverTimestamp()};
  updates["sentReq/"+me.uid+"/"+toUid]=true;
  update(ref(db),updates)
    .catch((e)=>{ delete mySent[toUid]; renderAllUsers(); alert("友達申請に失敗しました: "+(e&&e.message?e.message:e)); });
}
function renderFriends(){
  const box=$("friendList"); const q=friendQuery();
  let ids=Object.keys(myFriends).filter(uid=>allUsers[uid]);
  if(q) ids=ids.filter(uid=>((allUsers[uid].name||"").toLowerCase().includes(q)));
  if(!ids.length){ box.innerHTML='<div class="empty">'+(q?"該当する友達がいません":"まだ友達がいません。下の一覧から申請しましょう")+'</div>'; return; }
  box.innerHTML="";
  ids.forEach(uid=>{ const u=allUsers[uid];
    const row=document.createElement("div"); row.className="lrow";
    row.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div><div class="info"><div class="nm"><span class="dot ${u.online?'on':'off'}"></span>${esc(u.name)}</div><div class="st">${u.online?'オンライン':'オフライン'}</div></div>
      <div class="act"><button class="mini pri" data-a="dm">メッセージ</button><button class="mini" data-a="pf">見る</button><button class="mini del" data-a="rm">解除</button></div>`;
    row.querySelector('[data-a="dm"]').addEventListener("click",()=>{ openDM(uid); });
    row.querySelector('[data-a="pf"]').addEventListener("click",()=>openProfileView(uid));
    row.querySelector('[data-a="rm"]').addEventListener("click",()=>unfriend(uid,u.name));
    box.appendChild(row);
  });
}
function renderAllUsers(){
  const box=$("allUsersList"); if(!box) return; const q=friendQuery();
  // 友達と自分は除外（友達申請ボタンは出さない）。検索語で絞り込み。
  let entries=Object.entries(allUsers).filter(([uid,u])=>uid!==me.uid && u && !myFriends[uid]);
  if(q) entries=entries.filter(([uid,u])=>((u.name||"").toLowerCase().includes(q)));
  if(!entries.length){ box.innerHTML='<div class="empty">'+(q?"該当するユーザーがいません":"他のユーザーがいません")+'</div>'; return; }
  box.innerHTML="";
  entries.forEach(([uid,u])=>{
    const sent=!!mySent[uid];
    const row=document.createElement("div"); row.className="lrow";
    const addBtn=sent
      ? `<button class="mini" data-a="add" disabled style="opacity:.55;cursor:default">申請中</button>`
      : `<button class="mini pri" data-a="add">友達申請</button>`;
    row.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div><div class="info"><div class="nm"><span class="dot ${u.online?'on':'off'}"></span>${esc(u.name)}</div><div class="st">${esc(u.bio||'')}</div></div>
      <div class="act">${addBtn}<button class="mini" data-a="pf">見る</button></div>`;
    if(!sent) row.querySelector('[data-a="add"]').addEventListener("click",()=>sendRequest(uid,u.name));
    row.querySelector('[data-a="pf"]').addEventListener("click",()=>openProfileView(uid));
    box.appendChild(row);
  });
}

// ---- DM ----
function openDM(otherUid){
  const u=allUsers[otherUid]; if(!u) return;
  openChat("dm",dmThread(me.uid,otherUid),u.name,"ダイレクトメッセージ");
  switchView("chat");
}
function renderDMList(){
  const box=$("dmList"); if(!box) return;
  const ids=Object.keys(myFriends);
  if(!ids.length){ box.innerHTML='<div class="empty">友達を追加するとDMできます</div>'; return; }
  box.innerHTML="";
  ids.forEach(uid=>{ const u=allUsers[uid]; if(!u) return;
    const row=document.createElement("div"); row.className="lrow";
    row.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div><div class="info"><div class="nm">${esc(u.name)}</div><div class="st">${u.online?'オンライン':'タップしてメッセージ'}</div></div>`;
    row.addEventListener("click",()=>openDM(uid)); box.appendChild(row);
  });
}

// ---- グループ ----
function wireModals(){
  $("newGroupBtn").addEventListener("click",()=>{ $("groupName").value=""; $("groupMsg").textContent=""; renderGroupMembersPicker(); show("groupModal"); });
  $("groupClose").addEventListener("click",()=>hide("groupModal"));
  $("groupCreate").addEventListener("click",createGroup);
  $("usersClose").addEventListener("click",()=>hide("usersModal"));
  $("hostCancel").addEventListener("click",()=>hide("hostModal"));
  $("hostConfirm").addEventListener("click",doHostDelete);
  $("profileClose").addEventListener("click",()=>hide("profileModal"));
  $("imgClose").addEventListener("click",()=>hide("imgModal"));
  $("imgModal").addEventListener("click",(e)=>{ if(e.target.id==="imgModal") hide("imgModal"); });
  // グループ設定
  $("gsClose").addEventListener("click",()=>hide("gsModal"));
  $("gsCancel").addEventListener("click",()=>hide("gsModal"));
  $("gsSave").addEventListener("click",saveGroupSettings);
  $("gsDelete").addEventListener("click",deleteGroup);
  $("gsLeave").addEventListener("click",leaveGroup);
  $("gsImgBtn").addEventListener("click",()=>$("gsImgFile").click());
  $("gsImgFile").addEventListener("change",async(e)=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return; try{ gsIcon=await resizeImage(f,256,0.8); gsIconChanged=true; $("gsAvPrev").innerHTML=`<img src="${gsIcon}">`; $("gsAvPrev").style.background=""; }catch(err){ alert("画像処理に失敗"); } });
  // 背景クリックで閉じる（押し始めも背景の時のみ。ボタンから開いた直後の合成クリックや、テキスト選択での誤クローズを防ぐ）
  const closable=["usersModal","groupModal","profileModal","editModal","gsModal"];
  document.querySelectorAll(".overlay").forEach(ov=>{
    let downOnOv=false;
    ov.addEventListener("mousedown",(e)=>{ downOnOv=(e.target===ov); });
    ov.addEventListener("click",(e)=>{ if(downOnOv&&e.target===ov&&closable.includes(ov.id)) hide(ov.id); downOnOv=false; });
  });
}
function saveGroupSettings(){
  const gr=(window._groups||{})[gsGid]; if(!gr||gr.owner!==me.uid) return;
  const name=$("gsName").value.trim(); if(!name){ $("gsMsg").textContent="グループ名を入力してください"; return; }
  const upd={name}; if(gsIconChanged) upd.icon=gsIcon||null;
  update(ref(db,"groups/"+gsGid),upd)
    .then(()=>{ hide("gsModal"); if(currentChat&&currentChat.kind==="group"&&currentChat.id===gsGid){ currentChat.title=name; $("chatTitle").textContent=name; } })
    .catch((e)=>{ $("gsMsg").textContent="保存に失敗: "+(e&&e.message?e.message:e); });
}
async function deleteGroup(){
  const gr=(window._groups||{})[gsGid]; if(!gr||gr.owner!==me.uid) return;
  if(!confirm("グループ「"+(gr.name||"")+"」を削除しますか？（メッセージも削除されます）")) return;
  try{ await remove(ref(db,"groups/"+gsGid)); hide("gsModal"); if(currentChat&&currentChat.kind==="group"&&currentChat.id===gsGid) switchView("talks"); }
  catch(e){ $("gsMsg").textContent="削除に失敗: "+(e&&e.message?e.message:e); }
}
async function leaveGroup(){
  const gr=(window._groups||{})[gsGid]; if(!gr) return;
  if(gr.owner===me.uid){ $("gsMsg").textContent="オーナーは退出できません。削除してください。"; return; }
  if(!confirm("このグループを退出しますか？")) return;
  try{ await remove(ref(db,"groups/"+gsGid+"/members/"+me.uid)); hide("gsModal"); if(currentChat&&currentChat.kind==="group"&&currentChat.id===gsGid) switchView("talks"); }
  catch(e){ $("gsMsg").textContent="退出に失敗: "+(e&&e.message?e.message:e); }
}
let groupPicked={};
function renderGroupMembersPicker(){
  const box=$("groupMembers"); if(!box) return; groupPicked={};
  const ids=Object.keys(myFriends);
  if(!ids.length){ box.innerHTML='<div class="empty">友達がいません。先に友達を追加してください</div>'; return; }
  box.innerHTML="";
  ids.forEach(uid=>{ const u=allUsers[uid]; if(!u) return;
    const row=document.createElement("div"); row.className="lrow"; row.style.cursor="pointer";
    row.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div><div class="info"><div class="nm">${esc(u.name)}</div></div><div class="act"><span class="mini" data-chk>選択</span></div>`;
    row.addEventListener("click",()=>{ groupPicked[uid]=!groupPicked[uid]; const c=row.querySelector("[data-chk]"); c.classList.toggle("pri",groupPicked[uid]); c.textContent=groupPicked[uid]?"選択中":"選択"; });
    box.appendChild(row);
  });
}
function createGroup(){
  const name=$("groupName").value.trim(); if(!name){ $("groupMsg").textContent="グループ名を入力してください"; return; }
  const members={}; members[me.uid]=true; Object.keys(groupPicked).forEach(u=>{ if(groupPicked[u]) members[u]=true; });
  const node=push(ref(db,"groups")); set(node,{name,owner:me.uid,members,createdAt:serverTimestamp()})
    .then(()=>{ hide("groupModal"); openChat("group",node.key,name,"グループ"); switchView("chat"); });
}
function renderGroupList(){
  const box=$("groupList"); if(!box) return; const g=window._groups||{};
  const mine=Object.entries(g).filter(([gid,gr])=>gr&&gr.members&&gr.members[me.uid]);
  if(!mine.length){ box.innerHTML='<div class="empty">グループはありません。「＋ グループ作成」から作れます</div>'; return; }
  box.innerHTML="";
  mine.forEach(([gid,gr])=>{ const cnt=Object.keys(gr.members||{}).length;
    const row=document.createElement("div"); row.className="lrow";
    row.innerHTML=`<div class="av">${groupAvHTML(gr)}</div><div class="info"><div class="nm">${esc(gr.name)}</div><div class="st">${cnt}人のメンバー</div></div>`;
    row.addEventListener("click",()=>{ openChat("group",gid,gr.name,cnt+"人のグループ"); switchView("chat"); });
    box.appendChild(row);
  });
}
function groupAvHTML(gr){ return (gr&&gr.icon)? `<img src="${gr.icon}" alt="">` : "👥"; }

// ---- グループ設定（名前変更・アイコン・削除・退出）----
let gsGid=null, gsIcon=null, gsIconChanged=false;
function openGroupSettings(gid){
  const gr=(window._groups||{})[gid]; if(!gr) return;
  gsGid=gid; gsIcon=gr.icon||null; gsIconChanged=false;
  const owner=gr.owner===me.uid;
  $("gsAvPrev").innerHTML=groupAvHTML(gr); $("gsAvPrev").style.background=gr.icon?"":"rgba(255,255,255,0.06)";
  $("gsName").value=gr.name||""; $("gsName").disabled=!owner;
  $("gsImgBtn").style.display=owner?"":"none";
  $("gsSave").style.display=owner?"":"none";
  $("gsDelete").style.display=owner?"":"none";
  $("gsHint").textContent=owner?"名前・アイコンを変更できます。":"設定の変更はオーナーのみ可能です。";
  $("gsMsg").textContent="";
  // members
  const mb=$("gsMembers"); mb.innerHTML="";
  Object.keys(gr.members||{}).forEach(uid=>{ const u=allUsers[uid]||{name:"(不明)"};
    const r=document.createElement("div"); r.className="lrow";
    r.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div><div class="info"><div class="nm">${esc(u.name)} ${uid===gr.owner?'<span class="you">OWNER</span>':''}${uid===me.uid?'<span class="you">YOU</span>':''}</div></div>`;
    mb.appendChild(r);
  });
  show("gsModal");
}

// ============================================================
// 掲示板
// ============================================================
function wireBoard(){
  $("boardImgBtn").addEventListener("click",()=>$("boardImgFile").click());
  $("boardImgFile").addEventListener("change",async(e)=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return; try{ pendingBoardImg=await resizeImage(f,1000,0.72); $("boardAttachName").textContent="画像を添付しました"; }catch(err){ alert("画像処理に失敗"); } });
  $("boardPost").addEventListener("click",postBoard);
}
function postBoard(){
  const text=$("boardInput").value.trim(); if(!text&&!pendingBoardImg) return;
  const post={ uid:me.uid, name:me.name, avatar:me.avatar, avatarType:me.avatarType, color:me.color, text, ts:serverTimestamp() };
  if(pendingBoardImg) post.image=pendingBoardImg;
  push(ref(db,"board"),post).then(()=>{ $("boardInput").value=""; pendingBoardImg=null; $("boardAttachName").textContent=""; });
}
function renderBoard(list){
  const box=$("boardList"); if(!list.length){ box.innerHTML='<div class="empty">まだ投稿がありません</div>'; return; }
  box.innerHTML="";
  list.forEach(p=>{
    const mine=p.uid===me.uid;
    const reacts=p.reactions||{}; const counts={}; let myR=null;
    Object.entries(reacts).forEach(([uid,emo])=>{ counts[emo]=(counts[emo]||0)+1; if(uid===me.uid) myR=emo; });
    const rH=Object.entries(counts).map(([emo,n])=>`<span class="react${myR===emo?' mine':''}" data-emo="${emo}">${emo} ${n}</span>`).join("");
    const el=document.createElement("div"); el.className="post";
    el.innerHTML=`<div class="ph"><div class="av" data-uid="${esc(p.uid)}" style="background:${esc(p.color||'#5b8cff')}22;">${avHTML(p)}</div>
        <div><div class="nm">${esc(p.name)}</div><div class="tm">${timeStr(p.ts)}</div></div></div>
      <div class="body">${esc(p.text||"")}</div>
      ${p.image?`<img class="att-img" src="${p.image}" data-full="${p.image}" alt="">`:""}
      <div class="pf"><div class="reacts" style="display:flex;gap:5px;flex:1;flex-wrap:wrap;">${rH}</div>
        <button class="tbtn react-add" style="font-size:.7rem;color:var(--faint);background:none;border:none;cursor:pointer;">＋ リアクション</button>
        ${mine?'<button class="mini del" data-del>削除</button>':''}</div>`;
    el.querySelectorAll(".react").forEach(r=>r.addEventListener("click",()=>toggleReaction("board",p.id,r.dataset.emo)));
    el.querySelector(".react-add").addEventListener("click",(e)=>openReactPop(e.currentTarget,"board",p.id));
    const del=el.querySelector("[data-del]"); if(del) del.addEventListener("click",()=>{ if(confirm("投稿を削除しますか？")) remove(ref(db,"board/"+p.id)); });
    const img=el.querySelector(".att-img"); if(img) img.addEventListener("click",()=>{ $("imgFull").src=img.dataset.full; show("imgModal"); });
    el.querySelectorAll("[data-uid]").forEach(x=>x.addEventListener("click",()=>{ if(x.dataset.uid!==me.uid) openProfileView(x.dataset.uid); }));
    box.appendChild(el);
  });
}

// ============================================================
// プロフィール
// ============================================================
function wireProfile(){
  // プロフィール編集は廃止。名前・アイコン・誕生日は XEVARION アカウントと同期。
  const ep=$("editProfBtn"); if(ep) ep.addEventListener("click",openEditProfile);
  const ec=$("editClose"); if(ec) ec.addEventListener("click",()=>hide("editModal"));
  const ecn=$("editCancel"); if(ecn) ecn.addEventListener("click",()=>hide("editModal"));
  const es=$("editSave"); if(es) es.addEventListener("click",saveProfile);
}
// ============================================================
// コレクション（XEVARION ガチャで集めたキャラ）
//   Firebase の users/{uid}.collection に char id の配列で保存。
//   id → キャラ情報は window.XEVA.CHARS (CHAR_MASTER) で解決。
// ============================================================
const CHARS_BASE = "https://merurungx-glitch.github.io/xevarion/chars/";
/* 保存された charFile は、キャラをフォルダ移動する前の古いパスのことがある
   （例: "s5/Mion.png" → 現在は "bs1/Mion.png"）。そのまま URL にすると 404 になり、
   「一部のアカウントだけアイコンが出ない」状態になるので、必ず現行パスへ直してから使う。
   ※ MagiLink はアバターを絶対URLで Firebase に保存する作りなので、ここは絶対URLのまま。 */
function mlCharUrl(charFile, charId){
  const cf = (window.XEVA && window.XEVA.canonCharFile) ? window.XEVA.canonCharFile(charFile, charId) : charFile;
  return cf ? (CHARS_BASE + cf) : "";
}
const RAR_ORDER = { SSR: 0, SR: 1, R: 2 };
function charList(){ return (window.XEVA && window.XEVA.CHARS) ? window.XEVA.CHARS : []; }
function charById(id){ return charList().find(c=>c.id===id) || null; }
// 同一オリジンの XEVARION ガチャ保存から自分の所持キャラ id を取得
function myCollectionIds(){
  const ids=new Set();
  try{ const g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"null");
    if(g&&g.owned) Object.keys(g.owned).forEach(id=>{ if(g.owned[id]) ids.add(id); }); }catch(e){}
  try{ const xa=JSON.parse(localStorage.getItem("xeva_account_v1")||"null");
    if(xa&&xa.charId) ids.add(xa.charId); }catch(e){}
  const valid=charList();
  return [...ids].filter(id=>valid.some(c=>c.id===id));
}
// 同一オリジンの XEVARION ガチャ保存から凸（重複）レベルを取得
function myCollectionDupes(){
  const out={};
  try{ const g=JSON.parse(localStorage.getItem("xeva_gacha_v1")||"null");
    if(g&&g.dupes) Object.keys(g.dupes).forEach(id=>{ const lv=Math.max(0,Math.min(4,g.dupes[id]||0)); if(lv>0) out[id]=lv; }); }catch(e){}
  return out;
}
// 自分のコレクションを Firebase に同期（他の人が見られるように）
function syncMyCollection(){
  if(!me) return;
  try{
    const col=myCollectionIds();
    const dupes=myCollectionDupes();
    const cur=Array.isArray(me.collection)?me.collection:[];
    const curDup=me.collectionDupes||{};
    const colChanged = col.length && (col.length!==cur.length || col.some(id=>!cur.includes(id)));
    const dupChanged = JSON.stringify(dupes)!==JSON.stringify(curDup);
    if(colChanged || dupChanged){
      update(ref(db,"users/"+me.uid),{collection:col, collectionDupes:dupes});
      me.collection=col; me.collectionDupes=dupes;
    }
  }catch(e){}
}
// コレクション表示HTML（owned = char id 配列）
//   ・その人が「集めた（コレクションした）キャラ」だけを表示する（全キャラ枠 / 母数 "/N" は出さない）。
//   ・凸（重複）レベルがあれば右上に「+N凸」バッジを表示。
function collectionHTML(u){
  const ids=(u&&Array.isArray(u.collection))?u.collection:[];
  const dupes=(u&&u.collectionDupes&&typeof u.collectionDupes==="object")?u.collectionDupes:{};
  const chars=ids.map(charById).filter(Boolean)
    .sort((a,b)=>(RAR_ORDER[a.rarity]??9)-(RAR_ORDER[b.rarity]??9) || (a.season||0)-(b.season||0));
  if(!chars.length) return `<div class="coll-head">🎴 コレクション</div><div class="col-empty">まだキャラを集めていません。<br>XEVARION のガチャで仲間を増やそう！</div>`;
  const cards=chars.map(c=>{
    const lv=Math.max(0,Math.min(4,dupes[c.id]||0));
    const dupeBadge=lv>0?`<span class="cc-dupe">+${lv}凸</span>`:"";
    return `<div class="col-card${c.rarity==="SSR"?" ssr":""}">
      <img src="${esc(CHARS_BASE+c.file)}" alt="${esc(c.name)}" loading="lazy">
      <span class="rar ${esc(c.rarity)}">${esc(c.rarity)}</span>
      ${dupeBadge}
      <span class="cc-name">${esc(c.name)}</span></div>`;
  }).join("");
  return `<div class="coll-head">🎴 コレクション <span class="coll-stat">${chars.length} 体</span></div>
    <div class="col-grid">${cards}</div>`;
}

// プレイヤー一覧（コレクション数つき）
function renderCollections(){
  const box=$("collectionList"); if(!box) return;
  const s=$("collSearch"); const q=s?s.value.trim().toLowerCase():"";
  let entries=Object.entries(allUsers).filter(([uid,u])=>u&&u.name);
  if(q) entries=entries.filter(([uid,u])=>(u.name||"").toLowerCase().includes(q));
  entries.sort((a,b)=>((b[1].collection||[]).length)-((a[1].collection||[]).length));
  if(!entries.length){ box.innerHTML='<div class="empty">'+(q?"該当するプレイヤーがいません":"プレイヤーがいません")+'</div>'; return; }
  box.innerHTML="";
  entries.forEach(([uid,u])=>{
    const n=Array.isArray(u.collection)?u.collection.length:0;
    const isMe=uid===me.uid;
    const row=document.createElement("div"); row.className="lrow"; row.style.cursor="pointer";
    row.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div>
      <div class="info"><div class="nm"><span class="dot ${u.online?'on':'off'}"></span>${esc(u.name)} ${isMe?'<span class="you">YOU</span>':''}</div>
        <div class="st">🎴 コレクション ${n} 体</div></div>
      <div class="act"><button class="mini pri" data-a="see">見る</button></div>`;
    row.addEventListener("click",()=>openProfileView(uid));
    box.appendChild(row);
  });
}

// キャラ・ショーケース（XEVARIONで選んだ推しキャラ画像URL配列）
function showcaseHTML(u){
  const sc=(u&&Array.isArray(u.showcase))?u.showcase.filter(Boolean):[];
  if(!sc.length) return "";
  return `<div style="margin-top:14px"><div style="font-size:.62rem;letter-spacing:.1em;color:var(--faint);margin-bottom:7px;text-align:center">★ お気に入りキャラ</div>
    <div style="display:flex;gap:9px;justify-content:center">${sc.slice(0,3).map(src=>`<img src="${esc(src)}" alt="" style="width:58px;height:58px;border-radius:14px;object-fit:cover;border:2px solid var(--blue);box-shadow:0 4px 12px rgba(91,140,255,.3)">`).join("")}</div></div>`;
}
function renderMyProfile(){
  const av=$("myAv"); av.innerHTML=avHTML(me); av.style.background=avBG(me);
  $("myName").textContent=me.name; $("myBio").textContent=me.bio||"";
  const scEl=$("myShowcase"); if(scEl) scEl.innerHTML=showcaseHTML(me);
  const mcEl=$("myCollection"); if(mcEl) mcEl.innerHTML=collectionHTML(me);
  const extra=[]; if(me.hobby) extra.push(`🎮 ${esc(me.hobby)}`); if(me.location) extra.push(`📍 ${esc(me.location)}`);
  $("myExtra").innerHTML=extra.map(s=>`<span>${s}</span>`).join("");
  const meta=[]; if(me.bday) meta.push(`🎂 ${me.bday}`); meta.push(`<b>${Object.keys(myFriends).length}</b> 友達`); if(me.pwHash) meta.push("🔒 パスワード設定済み");
  $("myMeta").innerHTML=meta.join(" ・ ");
}
function openEditProfile(){
  buildColors("eColorPicker","edit");
  const {avatar,avatarType}=xaCharAvatar();
  editAvatar=avatar; editAvatarType=avatarType; editColor=me.color;
  const ap=$("eAvPrev"); ap.innerHTML=`<img src="${avatar}" alt="">`; ap.style.background="";
  $("eName").value=me.name; $("eBday").value=me.bday||""; $("eBio").value=me.bio||""; $("ePw").value="";
  $("eHobby").value=me.hobby||""; $("eLocation").value=me.location||""; $("editMsg").textContent="";
  show("editModal");
}
function saveProfile(){
  const name=$("eName").value.trim(); if(!name){ $("editMsg").textContent="表示名を入力してください"; return; }
  const {avatar,avatarType}=xaCharAvatar();
  const upd={ name, avatar, avatarType, color:editColor, bio:$("eBio").value.trim()||"", bday:$("eBday").value||"", hobby:$("eHobby").value.trim()||"", location:$("eLocation").value.trim()||"" };
  const pw=$("ePw").value; if(pw) upd.pwHash=hashStr(pw);
  update(ref(db,"users/"+me.uid),upd).then(()=>{ me=Object.assign(me,upd); hide("editModal"); renderMyProfile(); });
}
let pvUid=null;
function openProfileView(uid){
  const u=allUsers[uid]; if(!u) return;
  pvUid=uid;
  const av=$("pvAv"); av.innerHTML=avHTML(u); av.style.background=avBG(u);
  $("pvName").textContent=u.name; $("pvBio").textContent=u.bio||"";
  const pvExtra=[]; if(u.hobby) pvExtra.push(`🎮 ${esc(u.hobby)}`); if(u.location) pvExtra.push(`📍 ${esc(u.location)}`);
  $("pvExtra").innerHTML=pvExtra.map(s=>`<span>${s}</span>`).join("");
  const meta=[]; if(u.bday) meta.push(`🎂 ${u.bday}`); meta.push(u.online?"🟢 オンライン":"⚪ オフライン");
  $("pvMeta").innerHTML=meta.join(" ・ ");
  const scEl=$("pvShowcase"); if(scEl) scEl.innerHTML=showcaseHTML(u);
  const pcEl=$("pvCollection"); if(pcEl) pcEl.innerHTML=collectionHTML(u);
  refreshProfileAction();
  show("profileModal");
}
// プロフィールモーダルのアクションボタン（友達=メッセージ / 申請中 / 友達申請）を再構築
function refreshProfileAction(){
  const uid=pvUid; if(!uid) return;
  const u=allUsers[uid]; if(!u) return;
  const act=$("pvActions"); if(!act) return; act.innerHTML="";
  if(uid===me.uid){ return; } // 自分のプロフィールには操作ボタンを出さない
  if(myFriends[uid]){
    const dm=document.createElement("button"); dm.className="mini pri"; dm.textContent="メッセージ";
    dm.onclick=()=>{ hide("profileModal"); openDM(uid); }; act.appendChild(dm);
  } else if(mySent[uid]){
    const p=document.createElement("button"); p.className="mini"; p.textContent="申請中";
    p.disabled=true; p.style.opacity=".55"; p.style.cursor="default"; act.appendChild(p);
  } else {
    const ad=document.createElement("button"); ad.className="mini pri"; ad.textContent="友達申請";
    ad.onclick=()=>{ sendRequest(uid,u.name); refreshProfileAction(); }; act.appendChild(ad);
  }
}

// ============================================================
// ユーザー一覧 / ホスト削除 / ログアウト
// ============================================================
function renderUsersModal(){
  const ul=$("ulist"); const entries=Object.entries(allUsers).sort((a,b)=>(b[1].online?1:0)-(a[1].online?1:0));
  if(!entries.length){ ul.innerHTML='<div class="empty">ユーザーがいません</div>'; return; }
  ul.innerHTML="";
  entries.forEach(([uid,u])=>{ if(!u) return; const isMe=uid===me.uid;
    const row=document.createElement("div"); row.className="lrow";
    row.innerHTML=`<div class="av" style="background:${avBG(u)}">${avHTML(u)}</div>
      <div class="info"><div class="nm"><span class="dot ${u.online?'on':'off'}"></span>${esc(u.name)} ${isMe?'<span class="you">YOU</span>':''}</div><div class="st">${u.online?'オンライン':'最終: '+(timeStr(u.lastSeen)||'—')}</div></div>
      ${isMe?'':`<div class="act"><button class="mini del" data-del>ホスト削除</button></div>`}`;
    const d=row.querySelector("[data-del]"); if(d) d.addEventListener("click",()=>openHostDelete(uid,u.name));
    ul.appendChild(row);
  });
}
let hostTargetUid=null;
function openHostDelete(uid,name){ hostTargetUid=uid; $("hostTarget").textContent=name; $("hostAccess").value=""; $("hostDelete").value=""; $("hostMsg").textContent=""; show("hostModal"); setTimeout(()=>$("hostAccess").focus(),80); }
async function doHostDelete(){
  if($("hostAccess").value!==ACCESS_CODE||$("hostDelete").value!==DELETE_CODE){ $("hostMsg").textContent="アクセスコードまたはデリートコードが正しくありません。"; shake("hostCard"); return; }
  $("hostMsg").style.color=""; $("hostMsg").textContent="削除中…";
  try{ await deleteAccount(hostTargetUid); hide("hostModal"); hide("usersModal"); }
  catch(e){ $("hostMsg").style.color="#ff8a8a"; $("hostMsg").textContent="削除に失敗: "+(e&&e.message?e.message:e); }
}
async function doLogout(){
  loggingOut=true;
  try{ await deleteAccount(me.uid); }
  catch(e){ loggingOut=false; alert("アカウント削除に失敗しました: "+(e&&e.message?e.message:e)); return; }
  localStorage.removeItem(LS_ACCOUNT); localStorage.removeItem(LS_UNLOCK); me=null; location.reload();
}

// アカウント＋関連データを削除。個別 remove を順に実行し、パス重複や一部失敗の影響を避ける。
// 失敗した場合は呼び出し側へ throw する（ユーザーに通知）。
async function deleteAccount(uid){
  const safe=async(p)=>{ try{ await remove(ref(db,p)); }catch(e){ console.warn("remove失敗:",p,e&&e.message); } };
  // 友達関係（双方向）
  try{ const fr=await get(ref(db,"friends/"+uid)); const ks=[]; fr.forEach(c=>ks.push(c.key)); for(const k of ks) await safe("friends/"+k+"/"+uid); }catch(e){}
  await safe("friends/"+uid);
  // 申請（自分宛て + 自分が送った分）
  await safe("friendRequests/"+uid);
  try{ const ar=await get(ref(db,"friendRequests")); const ks=[]; ar.forEach(t=>{ if(t.key!==uid && t.child(uid).exists()) ks.push(t.key); }); for(const k of ks) await safe("friendRequests/"+k+"/"+uid); }catch(e){}
  // 申請中フラグ（自分が送った分 + 自分宛ての分）
  await safe("sentReq/"+uid);
  try{ const sr=await get(ref(db,"sentReq")); const ks=[]; sr.forEach(t=>{ if(t.key!==uid && t.child(uid).exists()) ks.push(t.key); }); for(const k of ks) await safe("sentReq/"+k+"/"+uid); }catch(e){}
  // 自分の投稿（ロビー・掲示板）
  try{ const lm=await get(ref(db,"messages")); const ks=[]; lm.forEach(c=>{ if(c.val()&&c.val().uid===uid) ks.push(c.key); }); for(const k of ks) await safe("messages/"+k); }catch(e){}
  try{ const bd=await get(ref(db,"board")); const ks=[]; bd.forEach(c=>{ if(c.val()&&c.val().uid===uid) ks.push(c.key); }); for(const k of ks) await safe("board/"+k); }catch(e){}
  // グループのメンバーから除外
  try{ const gs=await get(ref(db,"groups")); const ks=[]; gs.forEach(g=>{ if(g.child("members/"+uid).exists()) ks.push(g.key); }); for(const k of ks) await safe("groups/"+k+"/members/"+uid); }catch(e){}
  // 最後に本体（これが消えると watchSelf が反応するため最後）
  await remove(ref(db,"users/"+uid));   // ここが失敗したら throw されて呼び出し側で通知
}

// 起動
initAccess; // (スプラッシュ完了後に initAccess が呼ばれる)

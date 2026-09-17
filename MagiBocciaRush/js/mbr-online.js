/* ══════════════════════════════════════════════════════════════
   MagiBocciaRush — オンライン（v4・2026-09-17 作り直し）
   ──────────────────────────────────────────────────────────────
   ★ しくみ（決定論ロックステップ＋相互検証）
     ボッチャは1投ずつ交代なので、盤面そのものは送らない。
       送るもの … 投げた<b>方向ベクトル・強さ・投球ボックス・スキルの選択</b>（shots/000n）
       各端末 …… 同じ seed・同じ編成・同じ物理で<b>自分で計算</b>する
       照合 ……… 1投ごとに<b>盤面の指紋</b>（verify/n/uid）を書き、相手の指紋と比べる。
                  ずれていたら shots の記録から<b>組み立て直す</b>。
       結果 ……… 両端末が result/uid に得点と指紋を書き、<b>一致したときだけ「確定」</b>。
     ★ 専用サーバー（Cloud Functions 等）を置いていないので「サーバーが物理を計算して確定」は
       できない。<b>代わりに、クライアント1台だけでは結果を確定しない</b>（相互検証）形にしている。

   ★ 部屋（brrooms/BR+6文字 ではなく brrooms/<6文字>）
       host, seed, ends, rules, started, at
       players/<uid>: { name, side, charId, online, seat, cpu }
       shots/<000n>: { uid, side, jack, dx, dy, power, slot, special, active, ult, at }
       verify/<n>/<uid>: "指紋"
       result/<uid>: { red, blue, hash }
   ★ クイックマッチ：brqueue/<uid> に並び、先に並んでいる人をトランザクションで取る。
   ★ ランキング：brrank/<uid> = { name, rp, fav, at }

   ★★ Firebase のルール（firebase-rules/magiburst.rules.json）に
     brrooms / brqueue / brrank を足した。<b>コンソールに貼って公開するまで書きこめない</b>
     （ルールに無いキーは既定で .write:false）。
   ══════════════════════════════════════════════════════════════ */
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getDatabase, ref, set, update, get, onValue, off, onDisconnect, remove,
  onChildAdded, runTransaction, query, orderByChild, limitToLast,
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAEobH5IHlUNR3ryHKxsYNgHlIFSzNTJ7M",
  authDomain: "magiburst.firebaseapp.com",
  databaseURL: "https://magiburst-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "magiburst",
  storageBucket: "magiburst.firebasestorage.app",
  messagingSenderId: "107493819618",
  appId: "1:107493819618:web:727adc2ff9fcf00713cabb",
};
let app = null, db = null;
function conn() {
  if (db) return db;
  try { app = initializeApp(firebaseConfig, "boccia-online"); }
  catch (e) { app = getApps().find((a) => a.name === "boccia-online") || null; }
  if (!app) return null;
  db = getDatabase(app);
  try {
    onValue(ref(db, ".info/connected"), (s) => { const ok = !!s.val(); try { window.MBRUI._net(ok); } catch (e) {} });
  } catch (e) {}
  return db;
}
const UI = () => window.MBRUI;
const B = () => window.MBR;
const en = () => { try { return localStorage.getItem("xeva_lang_v1") === "en"; } catch (e) { return false; } };
const J = (ja, e) => (en() ? e : ja);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function gen6() { let s = ""; for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
const P = (code) => "brrooms/" + code;
const pad = (n) => String(n).padStart(4, "0");
const MAX_PLAYERS = 6;

function me() {
  let a = null;
  try { a = JSON.parse(localStorage.getItem("xeva_account_v1") || "null"); } catch (e) {}
  let uid = (a && (a.xvUid || a.uid)) || "";
  if (!uid) {
    try { uid = localStorage.getItem("mbr_guest_uid") || ""; if (!uid) { uid = "g" + Math.floor(Math.random() * 1e12).toString(36); localStorage.setItem("mbr_guest_uid", uid); } } catch (e) { uid = "g" + Date.now(); }
  }
  return { uid: String(uid).replace(/[.#$\[\]\/]/g, "_"), name: String((a && a.name) || "PLAYER").slice(0, 12) };
}
function lineup() { try { return UI().myLineup(); } catch (e) { return []; } }

let cur = null;          /* { code, uid, host, side } */
let room = null;
let subs = [];
let applied = 0;         /* 反映済みの投球数 */
let queue = [];          /* 届いた投球（番号順に反映） */
let hashes = {};         /* 自分の指紋 n → h */
let resyncing = false;
function stop() { subs.forEach((f) => { try { f(); } catch (e) {} }); subs = []; }
function say(ja, e) { try { UI().toast(J(ja, e)); } catch (x) {} }
function fail(err) {
  const perm = err && /permission/i.test(String(err.message || err));
  say(perm ? "サーバーの設定（Firebase のルール）がまだ公開されていないため、オンラインを使えません。"
           : "オンラインに接続できませんでした。電波の良いところでもう一度お試しください。",
      perm ? "Online is unavailable until the server rules are published." : "Could not connect. Please try again.");
}
function remember(code) {
  try { const s = B().load(); s.lastRoom = code; B().save(); } catch (e) {}
}

/* ══════════ 接続の生存確認（★ 2026-09-17b MagiBurst と同じ作り・ご指定）══════════
   ・.info/connected を見て、<b>つながり直すたびに online:true</b> を書き戻す（一瞬の瞬断で「離脱」にしない）
   ・4秒ごとに alive（心拍）を更新。相手側は<b>心拍が止まったかどうか</b>で離脱中を判定する
   ・onDisconnect では left は立てない（left は「自分から退出した」ときだけ） */
const HEARTBEAT_MS = 4000;
const AWAY_MS = 15000;
let hbTimer = 0, conUnsub = null;
function afterEnter(code, uid) {
  const d = conn(); if (!d) return;
  const pPath = P(code) + "/players/" + uid;
  try {
    if (conUnsub) conUnsub();
    const conRef = ref(d, ".info/connected");
    const fn = onValue(conRef, (snap) => {
      const ok = !!snap.val();
      try { UI()._net(ok); } catch (e) {}
      if (!ok || !cur || cur.code !== code) return;
      try { onDisconnect(ref(d, pPath + "/online")).set(false); } catch (e) {}
      update(ref(d, pPath), { online: true, left: false, alive: Date.now() }).catch(() => {});
      /* つながり直したら、切れていたあいだの投球を記録から取りこむ */
      if (cur.started) setTimeout(catchUp, 600);
    });
    conUnsub = () => off(conRef, "value", fn);
  } catch (e) {}
  clearInterval(hbTimer);
  hbTimer = setInterval(() => {
    if (!cur) { clearInterval(hbTimer); hbTimer = 0; return; }
    update(ref(d, P(cur.code) + "/players/" + cur.uid), { alive: Date.now(), online: true }).catch(() => {});
  }, HEARTBEAT_MS);
}

/* ══════════ 部屋を作る／入る ══════════ */
async function create() {
  const d = conn(); if (!d) return fail();
  const u = me();
  const code = gen6();
  try {
    await set(ref(d, P(code)), {
      host: u.uid, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, ends: 4, rules: "ability",
      started: false, at: Date.now(),
      players: { [u.uid]: { name: u.name, side: "red", seat: 0, lineup: lineup(), online: true, at: Date.now() } },
    });
    onDisconnect(ref(d, P(code) + "/players/" + u.uid + "/online")).set(false);
    cur = { code, uid: u.uid, host: true, side: "red" };
    remember(code);
    afterEnter(code, u.uid);
    watch();
  } catch (e) { fail(e); }
}
async function join(code) {
  const d = conn(); if (!d) return fail();
  code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length < 4) return say("ルームコードを入れてください。", "Enter a room code.");
  const u = me();
  try {
    const snap = await get(ref(d, P(code)));
    if (!snap.exists()) return say("その部屋は見つかりませんでした。", "Room not found.");
    const r = snap.val();
    const ps = r.players || {};
    const mine = ps[u.uid];
    if (!mine && Object.keys(ps).length >= MAX_PLAYERS) return say("その部屋はいっぱいです。", "That room is full.");
    if (!mine && (r.started || r.phase === "draft")) return say("その部屋の試合はもう始まっています。", "That match has already started.");
    const reds = Object.values(ps).filter((p) => p.side === "red").length;
    const blues = Object.values(ps).filter((p) => p.side === "blue").length;
    const side = mine ? mine.side : (reds <= blues ? (reds === blues ? "blue" : "red") : "blue");
    await update(ref(d, P(code) + "/players/" + u.uid), { name: u.name, side, seat: mine ? mine.seat || 0 : Object.keys(ps).length, lineup: mine && mine.lineup ? mine.lineup : lineup(), online: true, at: Date.now() });
    onDisconnect(ref(d, P(code) + "/players/" + u.uid + "/online")).set(false);
    cur = { code, uid: u.uid, host: r.host === u.uid, side };
    remember(code);
    afterEnter(code, u.uid);
    watch();
  } catch (e) { fail(e); }
}
/* 起動時：前の部屋の試合が続いていれば入り直す（切断復帰） */
async function tryResume() {
  let code = "";
  try { code = B().load().lastRoom || ""; } catch (e) {}
  if (!code || !navigator.onLine) return;
  const d = conn(); if (!d) return;
  try {
    const snap = await get(ref(d, P(code)));
    if (!snap.exists()) return;
    const r = snap.val();
    const u = me();
    if (!r.started || r.finished || !(r.players || {})[u.uid]) return;
    if (Date.now() - (r.startAt || 0) > 3 * 3600 * 1000) return;
    const el = document.getElementById("recon");
    if (el) {
      el.hidden = false;
      el.innerHTML = '<div class="sp"></div><div class="t">RECONNECTING…</div><div class="s">' + J("前の試合に復帰しています。記録から盤面を組み立て直します。", "Returning to your match — rebuilding the board from the log.") + '</div><div class="bar"><i style="width:40%"></i></div>'
        + '<button class="btn sm gh" style="width:auto" onclick="document.getElementById(\'recon\').hidden=true">' + J("キャンセル", "Cancel") + "</button>";
    }
    await join(code);
  } catch (e) {}
}

/* ══════════ 部屋のようす ══════════ */
function watch() {
  const d = conn(); if (!d || !cur) return;
  stop();
  const r = ref(d, P(cur.code));
  const un = onValue(r, (snap) => {
    room = snap.val();
    if (!room) {
      if (cur && cur.started && UI().match) { try { UI()._abort(J("部屋が解散されました。", "The room was closed.")); } catch (e) {} }
      else say("部屋が閉じられました。", "The room was closed.");
      leave(true); return;
    }
    const mine = (room.players || {})[cur.uid];
    if (mine) cur.side = mine.side;
    cur.host = room.host === cur.uid;
    if (room.status === "aborted" && room.abortedBy !== cur.uid && UI().match) {
      try { UI()._abort(J("ホストが試合を中断しました。", "The host ended the match.")); } catch (e) {}
    }
    if (room.phase === "draft" && !room.started && !cur.drafting) {
      cur.drafting = true;
      try { UI().go("room"); } catch (e) {}
      startDraftTimer();
    }
    paintRoom();
    if (room.started && !cur.started) { cur.started = true; cur.drafting = false; startOnlineMatch(); }
    checkAbsent();
  }, (err) => fail(err));
  subs.push(() => off(r, "value", un));
}
function repaint() { paintRoom(); }
/* ══════════ マッチ後の編成（90秒）★ 2026-09-17b ご指定 ══════════
   ホストが START → phase:"draft"・draftEnd（90秒後）を書く。
   みんなは自分の6体を編成し直せる（players/<uid>/lineup）。READY は任意。
   ★ 時間切れ、または人間が全員 READY になったら、<b>ホストが</b> started を立てる。 */
const DRAFT_MS = 90000;
let draftTimer = 0;
function startDraftTimer() {
  clearInterval(draftTimer);
  draftTimer = setInterval(() => {
    if (!room || !cur || room.started || room.phase !== "draft") { clearInterval(draftTimer); draftTimer = 0; return; }
    const left = Math.max(0, (room.draftEnd || 0) - Date.now());
    const el = document.getElementById("draftT");
    if (el) el.textContent = Math.ceil(left / 1000);
    const humans = Object.values(room.players || {}).filter((p) => !p.cpu);
    const allReady = humans.length && humans.every((p) => p.ready);
    if (cur.host && (left <= 0 || allReady)) {
      clearInterval(draftTimer); draftTimer = 0;
      const d = conn(); if (d) update(ref(d, P(cur.code)), { started: true, startAt: Date.now() }).catch(fail);
    }
  }, 500);
}
function setLineup(lu) {
  const d = conn(); if (!d || !cur) return;
  update(ref(d, P(cur.code) + "/players/" + cur.uid), { lineup: lu.slice(0, 6), ready: false }).catch(fail);
}
function toggleReady() {
  const d = conn(); if (!d || !cur || !room) return;
  const me2 = (room.players || {})[cur.uid] || {};
  update(ref(d, P(cur.code) + "/players/" + cur.uid), { ready: !me2.ready }).catch(fail);
}
function draftSlot(i) {
  if (!room || !cur) return;
  const me2 = (room.players || {})[cur.uid] || {};
  const lu = UI().fillLineup(me2.lineup || lineup(), UI().roster);
  UI().pickDraft(lu, parseInt(i, 10) || 0, (nl) => setLineup(nl));
}
function paintDraft(box) {
  const me2 = (room.players || {})[cur.uid] || {};
  const lu = UI().fillLineup(me2.lineup || lineup(), UI().roster);
  const slot = (id, i) => {
    const c = B().charOf(id);
    return '<button class="lslot" data-a="net" data-v="draftSlot" data-x="' + i + '">'
      + (c ? '<img src="' + esc(window.MBRFX.imgPath(c)) + '" alt="">' : "") + '<span class="no">' + (i + 1) + "</span>"
      + '<span class="nm">' + esc(c ? c.nm : "") + "</span></button>";
  };
  const ps = Object.keys(room.players || {}).map((k) => Object.assign({ uid: k }, room.players[k]));
  box.innerHTML = '<div class="pn red"><div class="note" style="text-align:center">' + J("マッチしました！ 残り時間で編成を調整してください", "Matched! Adjust your lineup before time runs out") + "</div>"
    + '<div class="draft-t"><span id="draftT">' + Math.ceil(Math.max(0, (room.draftEnd || 0) - Date.now()) / 1000) + "</span><small style=\"font-size:16px\"> SEC</small></div></div>"
    + '<div class="hd">TEAM<small>' + J("タップで入れかえ（検索・絞り込み・詳細つき）", "Tap to change (search, filters, details)") + "</small></div>"
    + '<div class="lineup">' + lu.map(slot).join("") + "</div>"
    + '<button class="btn ' + (me2.ready ? "wh" : "pri") + '" style="margin-top:10px" data-a="net" data-v="toggleReady">' + (me2.ready ? J("READY ✔（取り消す）", "READY ✔ (undo)") : "READY") + "</button>"
    + '<div class="draft-ps">' + ps.map((p) => '<span class="tag ' + (p.cpu || p.ready ? "ok" : "") + '">' + (p.side === "red" ? "🔴 " : "🔵 ") + esc(p.name || "?") + (p.cpu ? " CPU" : p.ready ? " ✔" : " …") + "</span>").join("") + "</div>";
}
function paintRoom() {
  const box = document.getElementById("roomBox");
  if (!box || !room || !cur) return;
  if (room.phase === "draft" && !room.started) { paintDraft(box); return; }
  const ps = Object.keys(room.players || {}).map((k) => Object.assign({ uid: k }, room.players[k])).sort((a, b) => (a.seat || 0) - (b.seat || 0));
  const seat = (side) => ps.filter((p) => p.side === side).map((p) => {
    const c = p.lineup && p.lineup[0] ? B().charOf(p.lineup[0]) : null;
    return '<div class="sw" style="padding:6px 0">' + (c ? '<img src="' + esc(window.MBRFX.imgPath(c)) + '" style="width:30px;height:30px;object-fit:cover;object-position:50% 15%">' : "")
      + '<div class="k">' + esc(p.name || "?") + (p.cpu ? " 🤖" : "") + (p.uid === room.host ? " 👑" : "") + "<small>" + (p.cpu ? "CPU" : p.online ? "ONLINE" : "OFFLINE") + "</small></div>"
      + (cur.host && p.cpu ? '<button class="btn sm gh" data-a="net" data-v="kickCpu" data-x="' + esc(p.uid) + '">✕</button>' : "") + "</div>";
  }).join("") || '<div class="note">' + J("待っています…", "Waiting…") + "</div>";
  const nR = ps.filter((p) => p.side === "red").length, nB = ps.filter((p) => p.side === "blue").length;
  const can = nR >= 1 && nB >= 1;
  box.innerHTML = '<div class="pn red" style="text-align:center"><div class="note">ROOM CODE</div>'
    + '<div class="en" style="font-size:40px;letter-spacing:.2em">' + esc(cur.code) + "</div>"
    + '<button class="btn sm gh" style="margin:6px auto 0" data-a="net" data-v="copy">' + J("コードをコピー", "Copy code") + "</button></div>"
    + '<div style="display:flex;gap:6px"><div class="pn" style="flex:1;border-color:rgba(232,23,58,.6)"><div class="en" style="color:var(--r2)">RED ' + nR + "</div>" + seat("red") + "</div>"
    + '<div class="pn" style="flex:1;border-color:rgba(47,143,255,.6)"><div class="en" style="color:var(--b2)">BLUE ' + nB + "</div>" + seat("blue") + "</div></div>"
    + '<div class="brow"><button class="btn sm" data-a="net" data-v="swap">' + J("チームを変える", "Switch side") + "</button>"
    + '<button class="btn sm gh" data-a="net" data-v="leave">' + J("退出", "Leave") + "</button></div>"
    + (cur.host ? '<div class="brow"><button class="btn sm gh" data-a="net" data-v="autoTeams">' + J("チーム自動分け", "Auto teams") + "</button>"
      + '<button class="btn sm gh" data-a="net" data-v="addCpu"' + (ps.length >= MAX_PLAYERS ? " disabled" : "") + ">" + J("CPU補充", "Add CPU") + "</button>"
      + '<button class="btn sm gh" data-a="net" data-v="toggleRules">' + (room.rules === "rules" ? "RULES" : "ABILITY") + "</button></div>"
      + '<button class="btn pri" style="margin-top:10px" data-a="net" data-v="start"' + (can ? "" : " disabled") + ">START</button>"
      : '<div class="waiting">' + J("ホストが始めるのを待っています…", "Waiting for the host…") + "</div>");
}
async function swap() {
  const d = conn(); if (!d || !cur) return;
  await update(ref(d, P(cur.code) + "/players/" + cur.uid), { side: cur.side === "red" ? "blue" : "red" }).catch(fail);
}
async function autoTeams() {
  const d = conn(); if (!d || !cur || !cur.host || !room) return;
  const ps = Object.keys(room.players || {});
  const upd = {};
  ps.forEach((uid, i) => { upd["players/" + uid + "/side"] = i % 2 ? "blue" : "red"; });
  await update(ref(d, P(cur.code)), upd).catch(fail);
}
async function addCpu() {
  const d = conn(); if (!d || !cur || !cur.host || !room) return;
  const ps = room.players || {};
  if (Object.keys(ps).length >= MAX_PLAYERS) return;
  const reds = Object.values(ps).filter((p) => p.side === "red").length, blues = Object.values(ps).filter((p) => p.side === "blue").length;
  const id = "cpu" + Math.floor(Math.random() * 1e6).toString(36);
  const lu = B().rivalLineup((Math.random() * 1e9) >>> 0, 6);
  await set(ref(d, P(cur.code) + "/players/" + id), { name: "CPU", cpu: true, side: reds <= blues ? "red" : "blue", seat: Object.keys(ps).length, lineup: lu, online: true, at: Date.now() }).catch(fail);
}
async function kickCpu(uid) {
  const d = conn(); if (!d || !cur || !cur.host || !uid || !/^cpu/.test(uid)) return;
  await remove(ref(d, P(cur.code) + "/players/" + uid)).catch(fail);
}
async function toggleRules() {
  const d = conn(); if (!d || !cur || !cur.host || !room) return;
  await update(ref(d, P(cur.code)), { rules: room.rules === "rules" ? "ability" : "rules" }).catch(fail);
}
async function start() {
  const d = conn(); if (!d || !cur || !cur.host) return;
  const upd = { phase: "draft", draftEnd: Date.now() + DRAFT_MS };
  Object.keys((room && room.players) || {}).forEach((u) => { upd["players/" + u + "/ready"] = false; });
  await update(ref(d, P(cur.code)), upd).catch(fail);
}
async function leave(silent, fromMatch) {
  const d = conn();
  if (d && cur) {
    try {
      if (!cur.started && !cur.drafting) {
        await remove(ref(d, P(cur.code) + "/players/" + cur.uid));
        if (cur.host) await remove(ref(d, P(cur.code)));
      } else if (fromMatch && cur.host) {
        await update(ref(d, P(cur.code)), { status: "aborted", abortedBy: cur.uid, finished: true });
      } else {
        await update(ref(d, P(cur.code) + "/players/" + cur.uid), { online: false, left: true });
      }
    } catch (e) {}
  }
  clearInterval(hbTimer); hbTimer = 0; clearInterval(draftTimer); draftTimer = 0;
  if (conUnsub) { try { conUnsub(); } catch (e) {} conUnsub = null; }
  stop(); cur = null; room = null; applied = 0; queue = []; hashes = {};
  try { const s = B().load(); if (!silent) { s.lastRoom = ""; B().save(); } } catch (e) {}
  const box = document.getElementById("roomBox"); if (box) box.innerHTML = "";
}
function copy() {
  if (!cur) return;
  try { navigator.clipboard.writeText(cur.code); say("コピーしました。", "Copied."); } catch (e) {}
}

/* ══════════ 試合 ══════════ */
function orderedPlayers(side) {
  return Object.keys(room.players || {}).map((k) => Object.assign({ uid: k }, room.players[k]))
    .filter((p) => p.side === side).sort((a, b) => (a.seat || 0) - (b.seat || 0));
}
function startOnlineMatch() {
  if (!room || !cur) return;
  const reds = orderedPlayers("red"), blues = orderedPlayers("blue");
  /* 編成：1人ならその人の3人。複数なら各プレイヤーの1番手を順番に（足りなければ2番手…） */
  /* ★ 2026-09-17b 編成は6体。1人ならその人の6体、複数なら各プレイヤーの1番手から順に交互で6体 */
  const mk = (ps) => {
    if (ps.length === 1) return (ps[0].lineup || []).slice(0, 6);
    const out = [];
    for (let k = 0; k < 6 && out.length < 6; k++) ps.forEach((p) => { const id = (p.lineup || [])[k]; if (id && out.indexOf(id) < 0 && out.length < 6) out.push(id); });
    return out;
  };
  const players = {
    red: reds.map((p) => ({ uid: p.uid, name: p.name, cpu: !!p.cpu })),
    blue: blues.map((p) => ({ uid: p.uid, name: p.name, cpu: !!p.cpu })),
  };
  const cfg = {
    kind: "online", ends: room.ends || 4, rules: room.rules || "ability", growth: "unify",
    difficulty: "hard", seed: room.seed >>> 0, first: "red",
    lineupOverride: { red: mk(reds), blue: mk(blues) }, playersOverride: players,
  };
  applied = 0; queue = []; hashes = {};
  const el = document.getElementById("recon"); if (el) el.hidden = true;
  UI()._startOnline(cfg, { me: cur.uid, side: cur.side, host: cur.host, code: cur.code, ok: true });
  listenShots();
}
function listenShots() {
  const d = conn(); if (!d || !cur) return;
  const r = ref(d, P(cur.code) + "/shots");
  const un = onChildAdded(r, (snap) => {
    const s = snap.val(); if (!s) return;
    s.n = parseInt(snap.key, 10);
    queue.push(s);
    queue.sort((a, b) => a.n - b.n);
    pump();
  });
  subs.push(() => off(r, "child_added", un));
  const v = ref(d, P(cur.code) + "/verify");
  const unv = onChildAdded(v, (snap) => checkVerify(parseInt(snap.key, 10), snap.val()));
  const unv2 = onValue(v, () => {});
  subs.push(() => { off(v, "child_added", unv); off(v, "value", unv2); });
  const rr = ref(d, P(cur.code) + "/result");
  const unr = onValue(rr, (snap) => paintConfirm(snap.val()));
  subs.push(() => off(rr, "value", unr));
}
/* 届いた投球を番号順に反映する。★ 前の球が転がっている間は待つ */
let pumpT = 0;
function pump() {
  clearTimeout(pumpT);
  const M = UI().match;
  if (!M) return;
  while (queue.length && queue[0].n < applied) queue.shift();         /* 反映済み（自分の投球など） */
  if (!queue.length) return;
  const s = queue[0];
  if (s.n > applied) { pumpT = setTimeout(pump, 400); return; }       /* 抜けがある：届くのを待つ */
  /* 追いつき：盤面が遅れている（再接続）なら、記録から一気に組み立て直す */
  if (queue.length > 2 && !UI().busy) { catchUp(); return; }
  if (UI().busy) { pumpT = setTimeout(pump, 180); return; }
  const ok = UI()._remoteShot(s);
  if (ok) { applied = s.n + 1; queue.shift(); }
  if (queue.length) pumpT = setTimeout(pump, 180);
}
async function catchUp() {
  const d = conn(); if (!d || !cur || resyncing) return;
  resyncing = true;
  try {
    const snap = await get(ref(d, P(cur.code) + "/shots"));
    const all = [];
    snap.forEach((c) => { const v = c.val(); v.n = parseInt(c.key, 10); all.push(v); });
    all.sort((a, b) => a.n - b.n);
    UI()._resync(all, null);
    applied = all.length; queue = [];
  } catch (e) {}
  resyncing = false;
}
/* 自分の投球（UI から） */
function sendShot(o) {
  const d = conn(); if (!d || !cur) return;
  const n = o.n != null ? o.n : applied;
  applied = Math.max(applied, n + 1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  const payload = {
    uid: cur.uid, side: o.side, jack: !!o.jack,
    dx: clamp(o.dx, -1, 1), dy: clamp(o.dy, -1, 1), power: clamp(o.power, 0, 1),
    slot: Math.max(0, Math.min(5, o.slot | 0)),
    special: String(o.special || "").slice(0, 12), active: !!o.active, ult: !!o.ult,
    cpu: !!o.cpu, at: Date.now(),
  };
  set(ref(d, P(cur.code) + "/shots/" + pad(n)), payload).catch((e) => {
    /* ★ 同じ番号がもう書かれていた＝相手の投球と競合。記録から組み立て直す */
    say("通信の競合を検出したので、記録から盤面を合わせ直します。", "Conflict detected — resyncing from the log.");
    catchUp();
  });
}
function sendHash(n, h) {
  const d = conn(); if (!d || !cur) return;
  hashes[n] = h;
  set(ref(d, P(cur.code) + "/verify/" + n + "/" + cur.uid), h).catch(() => {});
}
function checkVerify(n, obj) {
  if (!obj || !cur) return;
  const mine = hashes[n];
  if (!mine) return;
  const other = Object.keys(obj).filter((u) => u !== cur.uid).map((u) => obj[u]);
  if (other.some((h) => h !== mine)) {
    say("盤面のずれを検出しました。記録から組み立て直します。", "Board mismatch — rebuilding from the log.");
    catchUp();
  }
}
function sendResult(score, hash) {
  const d = conn(); if (!d || !cur) return;
  set(ref(d, P(cur.code) + "/result/" + cur.uid), { red: score.red | 0, blue: score.blue | 0, hash: String(hash || ""), at: Date.now() }).catch(() => {});
  if (cur.host) update(ref(d, P(cur.code)), { finished: true }).catch(() => {});
  try { const s = B().load(); s.lastRoom = ""; B().save(); } catch (e) {}
}
function paintConfirm(res) {
  const el = document.getElementById("resConf");
  if (!el || !res) return;
  const rows = Object.values(res);
  if (rows.length < 2) { el.textContent = J("（相手の確認待ち）", " (waiting for opponent)"); return; }
  const same = rows.every((r) => r.red === rows[0].red && r.blue === rows[0].blue && r.hash === rows[0].hash);
  el.textContent = same ? J("　✔ 両端末で一致・確定", "  ✔ Confirmed on both devices") : J("　⚠ 端末間で結果が一致しません（記録は未確定）", "  ⚠ Devices disagree (unconfirmed)");
}
/* ══ 離脱中の判定（★ 2026-09-17b MagiBurst と同じ考えかた）══
   ・<b>回線が一瞬乱れただけでは試合を止めない</b>。心拍が15秒止まった人・自分から退出した人を「離脱中」にする
   ・離脱中の人の番は<b>ホストが代わりに投げられる</b>（mbr-ui.js の isMyControl）
   ・戻ってくれば、そのまま自分で投げられる */
function checkAbsent() {
  if (!room || !cur || !room.started) return;
  const now = Date.now();
  const map = {}, names = [];
  Object.keys(room.players || {}).forEach((u) => {
    const p = room.players[u];
    if (!p || p.cpu || u === cur.uid) return;
    const away = p.left === true || p.online === false || (p.alive && now - p.alive > AWAY_MS);
    if (away) { map[u] = true; names.push(p.name || "PLAYER"); }
  });
  try { UI()._absent(map, names); } catch (e) {}
}
setInterval(() => { try { checkAbsent(); } catch (e) {} }, 5000);

/* ══════════ クイックマッチ ══════════ */
let quickCancel = false;
async function quick(timeoutMs) {
  const d = conn(); if (!d) return false;
  quickCancel = false;
  const u = me();
  const qRef = ref(d, "brqueue");
  try {
    /* ① 先に並んでいる人がいれば取る */
    const snap = await get(qRef);
    const list = [];
    snap.forEach((c) => { const v = c.val(); if (c.key !== u.uid && v && !v.taken && Date.now() - (v.at || 0) < 30000) list.push(c.key); });
    for (const k of list) {
      let won = false;
      await runTransaction(ref(d, "brqueue/" + k), (v) => {
        if (!v || v.taken) return;
        v.taken = u.uid; won = true; return v;
      });
      if (won) {
        const code = (await get(ref(d, "brqueue/" + k + "/code"))).val();
        if (code) {
          await join(code);
          await update(ref(d, P(code)), { phase: "draft", draftEnd: Date.now() + DRAFT_MS });
          remove(ref(d, "brqueue/" + k)).catch(() => {});
          return true;
        }
      }
    }
    /* ② いなければ部屋を作って並ぶ */
    await create();
    if (!cur) return false;
    const code = cur.code;
    await set(ref(d, "brqueue/" + u.uid), { code, at: Date.now(), name: u.name });
    onDisconnect(ref(d, "brqueue/" + u.uid)).remove();
    const t0 = Date.now();
    while (Date.now() - t0 < (timeoutMs || 10000)) {
      if (quickCancel) break;
      await new Promise((r) => setTimeout(r, 700));
      const v = (await get(ref(d, "brqueue/" + u.uid))).val();
      if (v && v.taken) { return true; }
    }
    remove(ref(d, "brqueue/" + u.uid)).catch(() => {});
    await leave();
    return false;
  } catch (e) {
    try { await leave(); } catch (x) {}
    return false;
  }
}
function cancelQuick() { quickCancel = true; }

/* ══════════ ランキング ══════════ */
async function fetchRank() {
  const d = conn(); if (!d) return null;
  try {
    const snap = await get(query(ref(d, "brrank"), orderByChild("rp"), limitToLast(50)));
    const rows = [];
    snap.forEach((c) => { const v = c.val(); if (v) rows.push(Object.assign({ uid: c.key }, v)); });
    return rows.sort((a, b) => (b.rp || 0) - (a.rp || 0));
  } catch (e) { return null; }
}
function pushRank(rp, fav) {
  const d = conn(); if (!d) return;
  const u = me();
  set(ref(d, "brrank/" + u.uid), { name: u.name, rp: rp | 0, fav: String(fav || ""), at: Date.now() }).catch(() => {});
}

window.MBROnline = {
  create, join, swap, start, leave, copy, repaint, tryResume, setLineup, toggleReady, draftSlot,
  autoTeams, addCpu, kickCpu, toggleRules,
  sendShot, sendHash, sendResult, quick, cancelQuick, fetchRank, pushRank,
  myUid: () => me().uid,
  get room() { return cur; },
};

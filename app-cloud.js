/* ============================================================
   APP-CLOUD — アプリ専用 Firebase への進行データ同期（アカウント紐づけ）
   ・XEVARION アカウント（xevarion-account）の uid をキーにして、
     アプリごとの Firebase に「そのアプリのセーブ」を保存する。
     例）MagiLex → magilex-cb250 / MagiBurst → magiburst
   ・保存先: users/{uid}/store/{key} と users/{uid}/storeT/{key}（最終更新ms）
   ・同期の考え方は xeva-cloud.js と同じ「タイムスタンプが新しい側が勝つ」マージ。
     オフラインで進めた分は、オンラインに戻った時にクラウドへ上書き反映される。
   ・XEVA ウォレットやアカウント本体は扱わない（そちらは xeva-cloud.js の担当）。

   ── 保存されない不具合への対策（iPhone で顕著だったもの） ──
   1) サーバー時刻でタイムスタンプをそろえる
      端末時計がずれていると、時計が進んでいる端末の古いセーブが
      正しい新しいセーブに勝ってしまう（＝ジェム交換や習得が巻き戻る）。
      .info/serverTimeOffset で補正した時刻を使う。
   2) 離脱時は fetch(keepalive) で送り切る
      iOS はホームに戻った瞬間にページを凍結・破棄するため、
      SDK の書込（Promise）は捨てられる。keepalive ならページが消えた後も届く。
   3) 送信間隔を短くする（1.2秒 → 0.4秒。重要キーは即時）
   4) オフラインで開いた場合でも、オンラインに戻ったら初期化からやり直す
      旧実装は起動時にオフラインだと db を作らず、その後 online になっても
      「ready でない」ため二度と同期しなかった。

   使い方（アプリの <head> で type="module"）:
     import { initAppCloud } from "../app-cloud.js";
     initAppCloud({ name:"magilex", config:{...}, keys:["magilex_v2", ...] });
   ============================================================ */
import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const RAW_SET = localStorage.setItem.bind(localStorage);
const RAW_REMOVE = localStorage.removeItem.bind(localStorage);

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function jparse(s, d) { try { return s == null ? d : JSON.parse(s); } catch (e) { return d; } }

/* XEVARION アカウントの uid（xeva-cloud と同じ決め方） */
function currentUid() {
  const ls = jparse(lsGet("xeva_session_v1"), null);
  if (ls && ls.uid) return ls.uid;
  const a = jparse(lsGet("xeva_account_v1"), null);
  return (a && a.xvUid) || null;
}
function isLoggedIn() {
  const a = jparse(lsGet("xeva_account_v1"), null);
  if (!a || !a.setupDone) return false;
  const ls = jparse(lsGet("xeva_session_v1"), null);
  return !(ls && ls.active === false);
}

const PUSH_DEBOUNCE = 400;
const BEACON_MAX = 60 * 1024;      // fetch(keepalive) の本文上限（64KB）に対する安全側の値

export function initAppCloud(opts) {
  const NAME = opts.name;
  const KEYS = opts.keys || [];
  /* ★ 2026-08-12 「負けた側にしか無い記録」を救うフック（任意）。
     rescue(key, 勝ったほうの文字列, 負けたほうの文字列) → 直した文字列 / null
     タイムスタンプ勝負は「あとから書いたほうが正しい」を前提にしているが、
     <b>所持キャラ・限界突破のように増えるいっぽうの記録</b>にはこの前提が通らない。
     ある端末で引いたキャラが、別の端末の（そのキャラを知らない）新しいセーブに
     まるごと負けて消えてしまうため。勝った側を土台に、負けた側にしか無いぶんを足し戻す。 */
  const RESCUE = typeof opts.rescue === "function" ? opts.rescue : null;
  const KEYSET = new Set(KEYS);
  const DB_URL = (opts.config && opts.config.databaseURL) || "";
  const META_KEY = "appcloud_meta_" + NAME;     // { key: 最終ローカル書込ms }（端末固有）
  const OWNER_KEY = "appcloud_owner_" + NAME;   // このセーブが誰(uid)のものか

  let db = null, uid = null, ready = false;
  const dirty = new Map();
  let timer = null, pushing = false, suspend = false;
  let skew = 0;                                  // サーバー時刻との差（ms）

  /* 同期に使う時刻はすべてこれ。サーバー基準にそろえる。 */
  const now = () => Date.now() + skew;

  const getMeta = () => jparse(lsGet(META_KEY), {}) || {};
  const saveMeta = (m) => { try { RAW_SET(META_KEY, JSON.stringify(m)); } catch (e) {} };

  function emit(type, detail) {
    try { window.dispatchEvent(new CustomEvent("appcloud:" + type, { detail: Object.assign({ app: NAME }, detail || {}) })); } catch (e) {}
  }

  /* ── 別アカウントのデータが残っていたら消す（混入防止） ── */
  function guardOwner(u) {
    const owner = lsGet(OWNER_KEY);
    if (owner === u) return;
    if (owner && owner !== u) {
      suspend = true;
      try { KEYS.forEach((k) => RAW_REMOVE(k)); saveMeta({}); } finally { suspend = false; }
      dirty.clear();
    }
    try { RAW_SET(OWNER_KEY, u); } catch (e) {}
  }

  /* ── localStorage への書込を捕まえて push 予約 ── */
  let captured = false;
  function capture() {
    if (captured) return; captured = true;
    const set = localStorage.setItem.bind(localStorage);
    const rm = localStorage.removeItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      set(k, v);
      if (suspend || !KEYSET.has(k)) return;
      const t = now();
      dirty.set(k, { v: String(v), t });
      const m = getMeta(); m[k] = t; saveMeta(m);
      schedule();
    };
    localStorage.removeItem = function (k) {
      rm(k);
      if (suspend || !KEYSET.has(k)) return;
      const t = now();
      dirty.set(k, { v: null, t });
      const m = getMeta(); m[k] = t; saveMeta(m);
      schedule();
    };
    /* 別タブでの変更も拾う */
    window.addEventListener("storage", (e) => {
      if (!e.key || !KEYSET.has(e.key)) return;
      const t = now();
      dirty.set(e.key, { v: e.newValue == null ? null : e.newValue, t });
      const m = getMeta(); m[e.key] = t; saveMeta(m);
      schedule();
    });
  }

  function schedule() { if (!timer) timer = setTimeout(flush, PUSH_DEBOUNCE); }

  function payloadOf(kv) {
    const payload = {};
    Object.keys(kv).forEach((k) => {
      payload["store/" + k] = kv[k].v;      // null なら削除
      payload["storeT/" + k] = kv[k].t;
    });
    payload.updatedAt = now();
    return payload;
  }

  async function flush() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!db || !uid || !dirty.size) return;
    if (pushing) { schedule(); return; }               // 進行中なら次の機会に（取りこぼさない）
    pushing = true;
    const kv = {};
    dirty.forEach((e, k) => { kv[k] = e; });
    let ok = true;
    try { await update(ref(db, "users/" + uid), payloadOf(kv)); }
    catch (e) { ok = false; }
    pushing = false;
    if (!ok) { schedule(); return; }
    Object.keys(kv).forEach((k) => { const c = dirty.get(k); if (c && c.t === kv[k].t) dirty.delete(k); });
    emit("pushed", { keys: Object.keys(kv) });
  }

  /* ★ 離脱時（ホームに戻る／アプリ切替／タブを閉じる）専用の送信。
     この瞬間は非同期処理の完了を待ってもらえないので、
     ページ破棄後も送り切ってくれる fetch(keepalive) で REST に直接 PATCH する。 */
  function flushBeacon() {
    if (!uid || !dirty.size || !DB_URL) { try { flush(); } catch (e) {} return; }
    const kv = {};
    dirty.forEach((e, k) => { kv[k] = e; });
    let json;
    try { json = JSON.stringify(payloadOf(kv)); } catch (e) { json = null; }
    if (!json) { try { flush(); } catch (e) {} return; }
    const url = DB_URL + "/users/" + uid + ".json";
    if (json.length <= BEACON_MAX) {
      try {
        fetch(url, {
          method: "PATCH", body: json, keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      } catch (e) {}
    } else {
      /* keepalive の 64KB を超えるセーブ（遊び込んだ MagiBurst など）。
         ここで諦めると、そういう人ほど保存されない側に落ちてしまう。
         離脱の瞬間だけ同期XHRで送り切る（ページはどうせ閉じるので体感への影響はない）。 */
      try {
        const x = new XMLHttpRequest();
        x.open("PATCH", url, false);
        x.setRequestHeader("Content-Type", "application/json");
        x.send(json);
      } catch (e) {}
    }
    try { flush(); } catch (e) {}     // 生き残った場合はこちらでも確定させる
  }

  /* ── クラウド → ローカル（新しい側が勝つ） ── */
  function merge(remote, remoteT) {
    remote = remote || {}; remoteT = remoteT || {};
    const meta = getMeta();
    const push = {};
    let changed = false;
    suspend = true;
    try {
      KEYS.forEach((k) => {
        const rv = Object.prototype.hasOwnProperty.call(remote, k) && remote[k] != null ? String(remote[k]) : null;
        const rT = remoteT[k] || 0;
        const lv = lsGet(k);
        const lT = meta[k] || 0;
        if (rv != null) {
          if (rv === lv) { if (rT > lT) meta[k] = rT; return; }
          /* ★ 勝敗の決め方（旧: 同着なら「データ量が多い方」＝誤判定の元）
             ・タイムスタンプが違う → 新しい方が勝つ
             ・ローカルに書込記録が無い（この端末では未プレイ）→ クラウドを採用
             ・両方とも記録なし → 目の前のローカルを採用してクラウドへ上げる
             セーブは「ジェムを使う」「間違えた問題を消す」のように短くなる更新もあるため、
             データ量で新旧を推測すると必ず取り違える。 */
          let remoteWins;
          if (rT !== lT) remoteWins = rT > lT;
          else remoteWins = (lv == null);
          /* ★ 2026-08-12 勝った側を土台に、負けた側にしか無いぶんを足し戻す（rescue）。
             フックが無い／直すところが無ければ、これまでと同じ動きになる。 */
          let win = remoteWins ? rv : lv;
          const lose = remoteWins ? lv : rv;
          if (RESCUE && win != null && lose != null) {
            try { const fixed = RESCUE(k, win, lose); if (fixed != null) win = fixed; } catch (e) {}
          }
          if (remoteWins) {
            RAW_SET(k, win); changed = true; dirty.delete(k);
            if (win === rv) { meta[k] = rT || now(); }
            /* 救ったぶんはクラウドにも無いので、いまの時刻で書き戻す */
            else { meta[k] = now(); push[k] = { v: win, t: meta[k] }; }
          } else {
            if (win !== lv) { RAW_SET(k, win); changed = true; }
            if (!lT || win !== lv) meta[k] = now();
            push[k] = { v: win, t: meta[k] };
          }
        } else if (lv != null) {
          if (!lT) meta[k] = now();
          push[k] = { v: lv, t: meta[k] };     // クラウドに無い＝初回アップロード
        }
      });
      saveMeta(meta);
    } finally { suspend = false; }
    Object.keys(push).forEach((k) => dirty.set(k, push[k]));
    if (Object.keys(push).length) schedule();
    return changed;
  }

  async function syncDown() {
    if (!db || !uid) return false;
    try {
      const snap = await get(ref(db, "users/" + uid));
      const v = snap.exists() ? snap.val() : {};
      return merge(v.store, v.storeT);
    } catch (e) { return false; }
  }

  /* ── Firebase 接続の確立（オフラインで開いた場合は後から呼び直せる） ── */
  let connecting = false;
  async function connect() {
    if (ready || connecting) return ready;
    connecting = true;
    try {
      const app = initializeApp(opts.config, "appcloud-" + NAME);
      db = getDatabase(app);
    } catch (e) {
      /* すでに同名アプリが初期化済み（online で2回目を通ったなど）なら、それを使う */
      try { db = getDatabase(getApp("appcloud-" + NAME)); }
      catch (e2) { connecting = false; emit("ready", { synced: false, reason: "init" }); return false; }
    }
    /* サーバー時刻との差を測る（以降のタイムスタンプはこれで補正） */
    try {
      onValue(ref(db, ".info/serverTimeOffset"), (s) => {
        const v = s.val();
        if (typeof v === "number" && Math.abs(v) < 86400000 * 3) skew = v;
      });
    } catch (e) {}
    ready = true; connecting = false;
    return true;
  }

  /* ── 起動 ── */
  (async function boot() {
    if (!isLoggedIn()) { emit("ready", { synced: false, reason: "guest" }); return; }
    uid = currentUid();
    if (!uid) { emit("ready", { synced: false, reason: "nouid" }); return; }
    guardOwner(uid);
    capture();                                   // オフラインでも書込時刻は刻む
    if (navigator.onLine === false) { emit("ready", { synced: false, reason: "offline" }); return; }
    if (!(await connect())) return;
    const changed = await syncDown();
    emit("ready", { synced: true, changed });
    if (changed) emit("restored", {});           // 別端末の続きが入った
    await flush();
  })();

  /* オンライン復帰時：まだ接続していなければ確立してから、送る→取り込む。
     ★ 旧実装は ready でないと何もしなかったため、
        オフラインで開いた回はその後ずっと同期されなかった。 */
  window.addEventListener("online", async () => {
    if (!uid) { if (!isLoggedIn()) return; uid = currentUid(); if (!uid) return; guardOwner(uid); capture(); }
    if (!ready && !(await connect())) return;
    await flush();
    const changed = await syncDown();
    emit("ready", { synced: true, changed });
    if (changed) emit("restored", {});
    await flush();
  });

  /* こまめな同期: 離脱時は確実に送り、戻ってきたら送る→取り込む、
     開いている間も一定間隔で押し出す。 */
  window.addEventListener("pagehide", flushBeacon);
  window.addEventListener("beforeunload", flushBeacon);
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") { flushBeacon(); return; }
    if (!ready) return;
    await flush();
    if (await syncDown()) emit("restored", {});
  });
  setInterval(() => { if (document.visibilityState === "visible") { try { flush(); } catch (e) {} } }, 15000);

  return { flush, flushBeacon, syncDown: () => syncDown(), isReady: () => ready };
}

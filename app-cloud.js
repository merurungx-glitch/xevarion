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

  /* ══ ★★ 2026-10-16 「キャラの所持・凸が同期されないことがある」の直し ══
     送信は「この端末の値でクラウドを上書き」なので、開きっぱなしの端末（PC のタブなど）が
     <b>別の端末で引いたキャラを知らないまま</b>何かを保存すると、そのキャラがクラウドから消えていた
     （引いた端末が次に同期するまで戻らない）。
     → 送る前に storeT（書いた時刻だけ・小さい）を見て、<b>この端末が知らない書き込み</b>があれば
       先に取りこんで混ぜて（rescue）から送る。knownT＝この端末が取りこんだ／送ったクラウドの時刻。 */
  const knownT = {};
  /* ★★ 2026-10-22 いちばん新しく読んだ storeT と読んだ時刻（離脱の瞬間に送ってよいかの判定・xeva-cloud と同じ） */
  let rtSeen = null, rtAt = 0;
  async function remoteChanged(keys) {
    if (!db || !uid || !keys.length) return false;
    try {
      const snap = await get(ref(db, "users/" + uid + "/storeT"));
      const t = snap.exists() ? (snap.val() || {}) : {};
      rtSeen = t; rtAt = Date.now();
      return keys.some((k) => (Number(t[k]) || 0) > (knownT[k] || 0));
    } catch (e) { return false; }                 /* 読めないときは今までどおり送る */
  }

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
    /* ★★ 2026-10-16 混ぜる決まり（rescue）のあるキーは、知らない書き込みがあれば先に取りこむ */
    if (RESCUE && !syncing) {
      const mk = []; dirty.forEach((e, k) => { if (e.v != null) mk.push(k); });
      if (await remoteChanged(mk)) {
        pushing = false;
        if (await syncDown()) emit("restored", {});    /* merge が混ぜた結果を dirty に入れる */
        if (dirty.size) schedule();
        return;
      }
    }
    const kv = {};
    dirty.forEach((e, k) => { kv[k] = e; });
    let ok = true;
    try { await update(ref(db, "users/" + uid), payloadOf(kv)); }
    catch (e) { ok = false; }
    pushing = false;
    if (!ok) { schedule(); return; }
    Object.keys(kv).forEach((k) => { knownT[k] = Math.max(knownT[k] || 0, kv[k].t); const c = dirty.get(k); if (c && c.t === kv[k].t) dirty.delete(k); });
    emit("pushed", { keys: Object.keys(kv) });
  }

  /* ★ 離脱時（ホームに戻る／アプリ切替／タブを閉じる）専用の送信。
     この瞬間は非同期処理の完了を待ってもらえないので、
     ページ破棄後も送り切ってくれる fetch(keepalive) で REST に直接 PATCH する。 */
  function flushBeacon() {
    if (!uid || !dirty.size || !DB_URL) { try { flush(); } catch (e) {} return; }
    const kv = {};
    /* ★★ 2026-10-22 足し戻し（rescue）のあるキー（所持キャラ・凸）は、離脱の直前20秒以内に storeT を読んで
       「知らない書き込みが無い」と分かっているときだけここで送る（ほかの端末で引いたキャラをクラウドから消さない）。
       分からないときは送らない＝端末に残り、戻ってきたとき・次に開いたときに取りこんで混ぜてから送る。 */
    const age = Date.now() - rtAt;
    dirty.forEach((e, k) => {
      if (RESCUE && e && e.v != null && !(rtSeen && age < 20000 && (Number(rtSeen[k]) || 0) <= (knownT[k] || 0))) return;
      kv[k] = e;
    });
    if (!Object.keys(kv).length) { try { flush(); } catch (e) {} return; }
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
        if (rT) knownT[k] = Math.max(knownT[k] || 0, rT);   /* ★★ 2026-10-16 ここまでのクラウドの書き込みは取りこんだ */
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

  let syncing = false;
  /* ★★ 2026-10-20 ご報告「iPhone のアカウントを PC で開くとキャラの所持が同期されて出ないことがある」
     起動のときにクラウドを読めないと（まだつながっていない・回線が不安定）、そのまま次の1分ごとの確認まで古いまま
     （その確認も storeT が読めないと「変化なし」扱い）だった。→ 読めなかったら 4秒・10秒・20秒…後に読み直す。 */
  let pullFailed = false, retryT = 0, retryN = 0;
  async function syncDown() {
    if (!db || !uid || syncing) return false;
    syncing = true;
    try {
      /* ★★ 2026-10-16 users/{uid} まるごとではなく store と storeT だけ読む（ほかの枝まで落とさない） */
      const [s, st] = await Promise.all([get(ref(db, "users/" + uid + "/store")), get(ref(db, "users/" + uid + "/storeT"))]);
      pullFailed = false; retryN = 0;
      if (st.exists()) { rtSeen = st.val() || {}; rtAt = Date.now(); }
      return merge(s.exists() ? s.val() : {}, st.exists() ? st.val() : {});
    } catch (e) { pullFailed = true; return false; } finally { syncing = false; }
  }
  function retryLater() {
    if (!pullFailed || retryT) return;
    const ms = [4000, 10000, 20000, 40000][Math.min(retryN, 3)];
    retryN++;
    retryT = setTimeout(async () => {
      retryT = 0;
      if (!ready || !uid) return;
      const changed = await syncDown();
      if (!pullFailed) { emit("ready", { synced: true, changed }); if (changed) emit("restored", {}); await flush(); }
      else retryLater();
    }, ms);
  }
  /* ★★ 2026-10-16 開いたままの画面でも、ほかの端末の変化を1分ごとに確かめる（storeT だけ読む＝軽い）。
     前は「画面に戻ってきたとき」しか取りこまなかったので、PC で開きっぱなしのタブには
     スマホで引いたキャラがいつまでも出てこなかった。 */
  /* ★★ 2026-10-22 1分 → 20秒ごと（xeva-cloud とそろえる） */
  setInterval(async () => {
    if (document.visibilityState !== "visible" || !ready || !uid || syncing || pushing) return;
    if (await remoteChanged(KEYS)) { if (await syncDown()) emit("restored", {}); await flush(); }
  }, 20000);

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
    retryLater();                                /* ★★ 2026-10-20 読めなかったときは少しあとで読み直す */
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

  /* ★★ 2026-10-22 syncAll＝送り残し → 読む → 混ぜる → 送る（設定「データを最新にする」から） */
  async function syncAll() {
    if (!uid && isLoggedIn()) { uid = currentUid(); if (uid) { guardOwner(uid); capture(); } }
    if (!uid) return { ok: false, reason: "login" };
    if (!ready && !(await connect())) return { ok: false, reason: "net" };
    try { await flush(); } catch (e) {}
    const changed = await syncDown();
    if (pullFailed) return { ok: false, reason: "net" };
    if (changed) emit("restored", {});
    try { await flush(); } catch (e) {}
    return { ok: true, changed };
  }
  return { flush, flushBeacon, syncDown: () => syncDown(), isReady: () => ready, syncAll };
}

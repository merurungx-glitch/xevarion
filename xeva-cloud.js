// ============================================================
// XEVA-Cloud v3 — XEVARION アカウントのクラウド同期 ＋ 単一アクティブセッション
//   ・アカウント（コア＋全ゲームのセーブ）を Firebase(xevarion-account) に保存
//   ・複数端末から1アカウントにログイン（表示名＋4桁PIN）
//   ・同一アカウントが複数端末で開かれたら「最後に開いた端末」以外はホーム画面へ
//   ・localStorage をライブキャッシュとして扱い、変更を自動でクラウドへ push
//
//   v3: データ消失バグの根本修正
//   ・per-key タイムスタンプ（storeT）で「新しい側が勝つ」マージ同期
//     （旧: クラウド無条件優先 → 古い端末のデータが新しい進行を上書きしていた）
//   ・クラウドに無いキーはローカルからアップロード（旧: store全体が空の時しか移行されず、
//     一部キーだけ欠けたまま＝MagiBattle等のデータが紐づかない原因）
//   ・アカウント切替時は前アカウントのゲームデータを端末から除去（混入防止＝owner guard）
//   ・上書きで負けた側は accounts/{uid}/storeBak に退避（復旧用バックアップ）
//   ・削除はトゥームストーン（storeT残し）で復活を防止
//   ・毎ページ読込で同期（旧: タブにつき1回 → 古いタブが最新データを潰していた）
//
//   window.XevaCloud として公開。読み込み完了で "xevacloud:ready" を発火。
//   ※ Firebase 実体は xevarion-fb.js(window.XEVARIONFB) を利用（同一プロジェクト）。
// ============================================================

/* ── 同期対象の localStorage キー ──
   ★ 一覧は xeva-keys.js（唯一の台帳）に集約した。
     以前はここに直接書いてあり、MagiBurst / MagiLex の一覧は別ファイルにあったため、
     新機能を足すたびに「同期リストへの入れ忘れ」が起きていた
     （ジェムショップの購入履歴 xeva_shop_v1 が同期されていなかったのがその例）。 */
import { PORTAL_SYNC_KEYS, wipeAccountData, wipeAccountDataFull } from "./xeva-keys.js?v=12";

const SYNC_KEYS = PORTAL_SYNC_KEYS;
const SYNC_SET = new Set(SYNC_KEYS);
function isSynced(key) { return SYNC_SET.has(key); }

/* ── ローカルキー（同期しない／端末固有） ── */
const DEVICE_KEY = "xeva_device_id";
const SESSION_KEY = "xeva_session_v1";
const ACC_KEY = "xeva_account_v1";
const META_KEY = "xeva_keymeta_v1";     // { key: 最終ローカル書込ms }（端末固有・非同期対象）
const OWNER_KEY = "xeva_store_owner";   // この端末の同期キー群がどのアカウント(uid)のものか
const SKEW_KEY = "xeva_skew_v1";        // 前回測ったサーバー時刻との差（端末固有）

/* ── ポータル index.html の URL（このモジュールの隣。どのページからでも解決可） ── */
const PORTAL_URL = new URL("index.html", import.meta.url).href;
const IS_PORTAL = location.href.split("#")[0].split("?")[0] === PORTAL_URL.split("#")[0].split("?")[0];

/* ── アプリID（ポータル直下のフォルダ名。例: MagiBurst/index.html → "magiburst"） ──
   セッションはアプリごとに分ける。こうすると「iPhoneのMagiBurstとPCのポータル」のように
   別アプリを同時に開いても追い出されず、同一アプリを別端末で開いた時だけ追い出される。 */
const APP_ID = (function () {
  try {
    const base = PORTAL_URL.slice(0, PORTAL_URL.lastIndexOf("/") + 1);
    let rest = location.href.split("#")[0].split("?")[0];
    if (rest.indexOf(base) === 0) rest = rest.slice(base.length);
    const seg = rest.split("/")[0] || "";
    if (!seg || /\.html?$/i.test(seg)) return "portal";
    return seg.toLowerCase().replace(/[.$#\[\]\/\s]/g, "") || "portal";
  } catch (e) { return "portal"; }
})();

/* ── ストレージ永続化を要求（iOS/PWA でアカウントが自動退避されるのを防ぐ） ──
   失敗しても実害は無いので握りつぶす。 */
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then((p) => { if (!p) navigator.storage.persist(); }).catch(() => {}); } catch (e) {}

/* ── 素の localStorage.setItem/removeItem（モンキーパッチ前を保持） ── */
const _rawSet = localStorage.setItem.bind(localStorage);
const _rawRemove = localStorage.removeItem.bind(localStorage);

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function jparse(s, d) { try { return s == null ? d : JSON.parse(s); } catch (e) { return d; } }

/* ── per-key メタ（最終ローカル書込時刻） ── */
function getMeta() { return jparse(lsGet(META_KEY), {}) || {}; }
function saveMeta(m) { try { _rawSet(META_KEY, JSON.stringify(m)); } catch (e) {} }
function stampMeta(k, t) { const m = getMeta(); m[k] = t; saveMeta(m); }

/* ── 端末ID（永続・非同期対象） ── */
function deviceId() {
  let d = lsGet(DEVICE_KEY);
  if (!d) {
    d = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
    try { _rawSet(DEVICE_KEY, d); } catch (e) {}
  }
  return d;
}

/* ── ローカルのログイン状態 ── */
function getLocalSession() { return jparse(lsGet(SESSION_KEY), null); }
function setLocalSession(obj) { try { _rawSet(SESSION_KEY, JSON.stringify(obj)); } catch (e) {} }
function getAcc() { return jparse(lsGet(ACC_KEY), null); }
function saveAcc(a) { try { _rawSet(ACC_KEY, JSON.stringify(a)); } catch (e) {} }

/* ── 現在の uid（ローカルセッション優先、無ければアカウントの xvUid） ── */
function currentUid() {
  const ls = getLocalSession();
  if (ls && ls.uid) return ls.uid;
  const a = getAcc();
  return (a && a.xvUid) || null;
}
/* この端末はログイン中か（アカウントあり＆明示ログアウト/追い出しされていない）
   ※ xvUid 未登録（4桁PIN未設定）の既存ユーザーもローカルで遊べる＝ログイン扱い。
     クラウド同期・セッションは登録後（onAccountCreated）に有効化される。 */
function isLoggedIn() {
  const a = getAcc();
  if (!a || !a.setupDone) return false;
  const ls = getLocalSession();
  if (ls && ls.active === false) return false;     // 明示ログアウト／追い出し済み
  return true;
}

/* ── 同期タイムスタンプはサーバー基準にそろえる ──
   端末の時計が進んでいると、その端末の古いデータが他端末の新しいデータに勝ってしまう。
   XEVARIONFB が .info/serverTimeOffset で補正した時刻を提供するので、
   同期に関わる時刻は必ずこれを使う。

   ★ 2026-08-03: Firebase が読み込まれる前の書込にも同じ基準を使う。
     書込キャプチャはモジュール評価と同時に走る（オフラインでも時刻を刻むため）が、
     その時点では FB がまだ無く、以前は端末時計の生の値を刻んでいた。
     端末時計が数分ずれているだけで「あとから書いたほうが古い」と判定され、
     せっかくの変更がクラウド側に負けて消える。
     そこで、一度でも測れたサーバー差を localStorage に残しておき、
     FB が来るまではその値で補正する。 */
let _skewCache = null;
function savedSkew() {
  if (_skewCache != null) return _skewCache;
  const v = Number(lsGet(SKEW_KEY));
  _skewCache = (isFinite(v) && Math.abs(v) < 86400000 * 3) ? v : 0;
  return _skewCache;
}
function rememberSkew() {
  try {
    const f = FB || window.XEVARIONFB;
    if (!f || !f.serverSkew) return;
    const s = f.serverSkew();
    if (typeof s !== "number" || !isFinite(s) || Math.abs(s) >= 86400000 * 3) return;
    if (s === savedSkew()) return;
    _skewCache = s;
    _rawSet(SKEW_KEY, String(s));
  } catch (e) {}
}
function nowMs() {
  try { if (FB && FB.now) { rememberSkew(); return FB.now(); } } catch (e) {}
  try { if (window.XEVARIONFB && window.XEVARIONFB.now) { rememberSkew(); return window.XEVARIONFB.now(); } } catch (e) {}
  return Date.now() + savedSkew();
}

/* ── XEVARIONFB(Firebase) 待機 ── */
function waitFB() {
  return new Promise((res) => {
    if (window.XEVARIONFB) return res(window.XEVARIONFB);
    let done = false; const f = () => { if (!done) { done = true; res(window.XEVARIONFB || null); } };
    window.addEventListener("xevarionfb:ready", f, { once: true });
    setTimeout(f, 8000);
  });
}

/* ── ホームへ戻す（ポータルは #xevaHome 表示、ゲームページは replace） ── */
function goHome() {
  if (IS_PORTAL) {
    if (typeof window.showXevaHome === "function") window.showXevaHome();
    else location.replace(PORTAL_URL);
  } else {
    location.replace(PORTAL_URL);
  }
}

/* ════════════ ストア同期 ════════════ */
let FB = null;
let pushSuspended = false;         // pull適用中は push を止める（エコー防止）
const dirty = new Map();           // key -> { v: valueString|null, t: 書込ms }
let pushTimer = null;

/* ══════════════════════════════════════════════════════════
   アカウントのデータを端末から消す（2026-08-03 再構築）
   ------------------------------------------------------------
   ★ なぜ必要か
     「ログアウト → 新規登録」で前のアカウントのデータが引き継がれてしまう、
     という不具合の原因はここだった。ログアウトしても端末には
     XEVA・ジェム・各ゲームのセーブがまるごと残り、新しいアカウントを作った瞬間に
     pushAll() がそれをそのまま新アカウントのものとしてクラウドへ上げていた。
     結果、新規のはずのアカウントが前のアカウントの続きになり、
     さらに同名で登録すると前のアカウントのレコードごと消えていた。
   ★ 消すのは「アカウントに属するもの」だけ。端末ID・セッション・
     インストール済み更新の版といった端末固有の情報は残す（xeva-keys.js の台帳を参照）。
   ★ 消すときは必ず素の removeItem を使う。同期フック経由で消すと
     「他の端末でも削除された」というトゥームストーンがクラウドに立ち、
     ログアウトがアカウント削除になってしまう。
   ══════════════════════════════════════════════════════════ */
function wipeLocalAccount(keepAcc) {
  pushSuspended = true;
  try {
    const acc = keepAcc ? lsGet(ACC_KEY) : null;
    wipeAccountData(_rawRemove);
    if (acc != null) _rawSet(ACC_KEY, acc);      // ログイン処理が書き直す本体は残す
    saveMeta({}); clearBase();                   /* ★ 2026-09-01 財布の土台も別アカウントへ持ち越さない */
    try { _rawRemove(OWNER_KEY); } catch (e) {}
    try { _rawRemove("xeva_pullrld"); } catch (e) {}
  } finally { pushSuspended = false; }
  dirty.clear();
}
/* ★ 2026-08-05 アカウント削除専用の完全消去。
   ログアウト（wipeLocalAccount）は台帳に載っているキーだけを消すが、
   削除では「端末設定いがいは全部消す」。載せ忘れのキーが1つでも残ると、
   XEVA や各ゲームのセーブが次に作ったアカウントへ引き継がれてしまうため。
   ★ これも必ず素の removeItem（_rawRemove）で消す。同期フック経由で消すと
     クラウドにトゥームストーンが立ち、ほかの端末のデータまで巻き添えになる。 */
function purgeLocalAccount() {
  pushSuspended = true;
  try {
    wipeAccountDataFull(_rawRemove);
    saveMeta({}); clearBase();
    try { _rawRemove(OWNER_KEY); } catch (e) {}
    try { _rawRemove("xeva_pullrld"); } catch (e) {}
  } finally { pushSuspended = false; }
  dirty.clear();
}

/* ── owner guard: 端末に残っている同期データがどのアカウントのものかを管理。
      別アカウントでログイン／新規登録する時は前アカウントのデータを除去して混入を防ぐ。 ── */
function guardOwner(uid) {
  if (!uid) return;
  const owner = lsGet(OWNER_KEY);
  if (owner === uid) return;
  if (owner && owner !== uid) wipeLocalAccount(true);   // アカウント本体は login/登録が書き直す（土台も中で消える）
  try { _rawSet(OWNER_KEY, uid); } catch (e) {}
}

/* ══════════════════════════════════════════════════════════════
   ★★ 2026-09-01 オフラインとオンラインの<b>まぜ方</b>（ご報告への対応）
   ------------------------------------------------------------
   ご報告: 「キャラクターや XEVA が同期されないことがある」

   これまでの決まりは <b>キーまるごと、新しい方が勝つ</b>（last-write-wins）だった。
   これだと、こういうときに片方の進行が丸ごと消える:
     ・iPhone を<b>オフライン</b>にしたまま MagiBurst でガチャを引いた
     ・そのあいだに PC で XEVA を稼いだ
     → あとからオンラインにした側の「まるごと」が、もう片方を上書きする。
   退避（storeBak）は残るが、画面の上では<b>消えた</b>のと同じ。

   そこで、<b>中身の性質に合わせて混ぜる</b>ようにした。

   ① 財布（XEVA・💎ジェム・🎫各チケット・💠結晶）… <b>3方向マージ</b>
      「前にクラウドとそろっていた値（base）」を覚えておき、
        こちらの増減（L − base）と あちらの増減（R − base）の<b>両方</b>を足す。
      ＝ オフラインで稼いだぶんも、別端末で使ったぶんも、どちらも残る。
      ★ base は「クラウドに<b>確かにあると分かっている値</b>」だけを入れること。
        送信できたか分からない値を入れると、次のマージで二重に足したり
        巻き戻したりする。ここが唯一のこわいところ。
      ★ base が無い（初回・機種変直後）ときは<b>多い方</b>を採る。
        減る側に倒すと「使っていないのに減った」になるため。

   ② キャラ（xeva_gacha_v1 の owned/dupes ／ magiburst_v1 の chars）… <b>取り合わせ</b>
      キャラは<b>減らないもの</b>なので、
        持っている … どちらかにあれば持っている（和）
        限界突破・レベル・EXP … <b>大きい方</b>
      まず今までどおり新しい方を選び、そのあとで<b>負けた方のキャラだけを拾い直す</b>。
      ＝ ほかの項目（クリア状況・アイテムなど）の扱いは今までと変わらない。

   ★ 履歴（history）は t＋量＋理由で重複を見分けて取り合わせる。
   ══════════════════════════════════════════════════════════════ */
const BASE_KEY = "xeva_syncbase_v1";   // 端末固有・同期しない。{ key: {b,e,u,s} }
function getBase() { return jparse(lsGet(BASE_KEY), {}) || {}; }
function saveBase(b) { try { _rawSet(BASE_KEY, JSON.stringify(b)); } catch (e) {} }
function clearBase() { try { _rawRemove(BASE_KEY); } catch (e) {} }
/* 財布から「数だけ」を抜き出す（base に丸ごと入れると容量を食うため） */
function walletNums(s) {
  const o = jparse(s, null);
  if (!o || typeof o !== "object") return null;
  return { b: Number(o.balance) || 0, e: Number(o.totalEarned) || 0,
           u: Number(o.used) || 0, s: Number(o.spent) || 0 };
}
function setBaseFrom(k, valueString) {
  if (!WALLET_KEYS.has(k)) return;
  const n = walletNums(valueString);
  const b = getBase();
  if (n) b[k] = n; else delete b[k];
  saveBase(b);
}
function setBaseMany(kv) {
  const b = getBase(); let touched = false;
  Object.keys(kv || {}).forEach((k) => {
    if (!WALLET_KEYS.has(k)) return;
    const n = walletNums(kv[k] && kv[k].v);
    if (n) { b[k] = n; touched = true; } else if (b[k]) { delete b[k]; touched = true; }
  });
  if (touched) saveBase(b);
}

const WALLET_KEYS = new Set(["xeva_wallet_v1", "xeva_gem_v1", "xeva_gticket_v1",
  "xeva_fticket_v1", "xeva_selticket_v1", "xeva_cryst_v1"]);
const CHAR_KEYS = new Set(["xeva_gacha_v1", "magiburst_v1"]);
function hasMergeRule(k) { return WALLET_KEYS.has(k) || CHAR_KEYS.has(k); }

/* 履歴の取り合わせ（新しい順・上限100件） */
function mergeHistory(a, b) {
  const seen = Object.create(null), out = [];
  [].concat(Array.isArray(a) ? a : [], Array.isArray(b) ? b : []).forEach((h) => {
    if (!h || typeof h !== "object") return;
    const k = (h.t || 0) + "|" + (h.amount || 0) + "|" + (h.reason || "");
    if (seen[k]) return; seen[k] = 1; out.push(h);
  });
  out.sort((x, y) => (y.t || 0) - (x.t || 0));
  if (out.length > 100) out.length = 100;
  return out;
}
/* ① 財布の3方向マージ。混ぜられなければ null（＝今までどおりの勝ち負けに任せる） */
function mergeWallet(k, lv, rv) {
  const L = jparse(lv, null), R = jparse(rv, null);
  if (!L || !R || typeof L !== "object" || typeof R !== "object") return null;
  const base = getBase()[k] || null;
  const three = (field, bf) => {
    const ln = Number(L[field]) || 0, rn = Number(R[field]) || 0;
    if (!base) return Math.max(ln, rn);                 /* 土台なし＝多い方（減らさない） */
    const bn = Number(base[bf]) || 0;
    return Math.max(0, bn + (ln - bn) + (rn - bn));
  };
  const out = {};
  Object.keys(R).forEach((x) => { out[x] = R[x]; });
  Object.keys(L).forEach((x) => { out[x] = L[x]; });
  out.balance = three("balance", "b");
  if ("totalEarned" in L || "totalEarned" in R) out.totalEarned = Math.max(three("totalEarned", "e"), out.balance);
  if ("used" in L || "used" in R) out.used = three("used", "u");
  if ("spent" in L || "spent" in R) out.spent = three("spent", "s");
  out.mig = Object.assign({}, R.mig || {}, L.mig || {});   /* 移行ずみの印は消さない（二重付与よけ） */
  out.history = mergeHistory(L.history, R.history);
  out.at = Math.max(Number(L.at) || 0, Number(R.at) || 0);
  return JSON.stringify(out);
}
/* ② キャラの拾い直し。winner に loser のキャラを足して返す（変化がなければ null） */
function mergeCharsInto(k, winnerStr, loserStr) {
  const W = jparse(winnerStr, null), Lo = jparse(loserStr, null);
  if (!W || !Lo || typeof W !== "object" || typeof Lo !== "object") return null;
  let touched = false;
  const bigger = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);
  if (k === "xeva_gacha_v1") {
    W.owned = W.owned || {}; W.dupes = W.dupes || {};
    Object.keys(Lo.owned || {}).forEach((id) => {
      if (Lo.owned[id] && !W.owned[id]) { W.owned[id] = true; touched = true; }
    });
    Object.keys(Lo.dupes || {}).forEach((id) => {
      const v = bigger(W.dupes[id], Lo.dupes[id]);
      if (v !== (Number(W.dupes[id]) || 0)) { W.dupes[id] = v; touched = true; }
    });
  } else {                                   /* magiburst_v1 */
    W.chars = W.chars || {};
    Object.keys(Lo.chars || {}).forEach((id) => {
      const lc = Lo.chars[id]; if (!lc || typeof lc !== "object") return;
      const wc = W.chars[id];
      if (!wc) { W.chars[id] = lc; touched = true; return; }
      const lv2 = bigger(wc.lv, lc.lv), aw = bigger(wc.awk, lc.awk), ex = bigger(wc.exp, lc.exp);
      if (lv2 !== (Number(wc.lv) || 0) || aw !== (Number(wc.awk) || 0) || ex !== (Number(wc.exp) || 0)) {
        wc.lv = lv2 || wc.lv; wc.awk = aw; wc.exp = ex; touched = true;
      }
    });
  }
  return touched ? JSON.stringify(W) : null;
}

/* ── マージ同期の本体 ──
   remote  = { key: valueString }（クラウドの store）
   remoteT = { key: ms }（クラウドの storeT。削除済みキーはトゥームストーンとして残る）
   ・新しい側（タイムスタンプ大）が勝つ
   ・両方タイムスタンプ不明（旧データ同士）は「データ量が多い側」が勝つ（進行データは育つほど長い）
   ・ローカルが勝った／クラウドに無いキーはクラウドへアップロード（欠けたキーの救済）
   ・クラウドが勝つ時、消えるローカル値は storeBak へ退避
   戻り値: ローカルに変化があったか */
function mergeStore(uid, remote, remoteT) {
  remote = remote || {}; remoteT = remoteT || {};
  const meta = getMeta();
  const pushKv = {};      // key -> {v,t}
  const bak = {};         // key -> {v,t}（クラウドに負けて消えるローカル値）
  const newBase = {};     // ★ 2026-09-01 財布の土台（クラウドに確かにあると分かった値）
  let changed = false;
  pushSuspended = true;
  try {
    SYNC_KEYS.forEach((k) => {
      const rv = Object.prototype.hasOwnProperty.call(remote, k) && remote[k] != null ? String(remote[k]) : null;
      const rT = remoteT[k] || 0;
      const lv = lsGet(k);
      const lT = meta[k] || 0;
      if (rv != null) {
        if (rv === lv) {
          if (rT > lT) meta[k] = rT;
          if (WALLET_KEYS.has(k)) newBase[k] = rv;      /* そろっている＝これが土台 */
          return;
        }
        /* ★ 勝敗の決め方（旧: 同着なら「データ量が多い方」＝誤判定の元）
           ・タイムスタンプが違う → 新しい方が勝つ（本来の規約）
           ・ローカルに書込記録が無い（lT=0）＝この端末では一度も触っていない
             → クラウドを採用（別端末の続きを引き継ぐ）
           ・両方とも記録なし → 目の前で使っているローカルを採用してクラウドへ上げる
           「データ量が多い方が新しい」は、XEVAを消費したときのように
           値が短くなる更新で必ず外れるため使わない。 */
        let remoteWins;
        if (rT !== lT) remoteWins = rT > lT;
        else if (lv == null) remoteWins = true;
        else remoteWins = false;
        /* ══ ★★ 2026-09-01 混ぜられるキーは、勝ち負けを決める前に<b>混ぜる</b> ══
           財布 … 3方向マージ（両方の増減を足す）
           キャラ … 勝った側に、負けた側のキャラだけを拾い直す
           混ぜられなかったとき（形がちがう・拾うものが無い）は null が返るので、
           そのまま下の「新しい方が勝つ」に落ちる＝これまでどおりの動き。 */
        let merged = null;
        if (lv != null && hasMergeRule(k)) {
          merged = WALLET_KEYS.has(k)
            ? mergeWallet(k, lv, rv)
            : mergeCharsInto(k, remoteWins ? rv : lv, remoteWins ? lv : rv);
        }
        if (merged != null) {
          if (WALLET_KEYS.has(k)) newBase[k] = rv;      /* 土台は「クラウドに確かにある値」 */
          if (merged !== lv) { _rawSet(k, merged); changed = true; }
          if (remoteWins) bak[k] = { v: lv, t: lT };    /* 念のため負けた側も退避しておく */
          meta[k] = nowMs(); dirty.delete(k);
          pushKv[k] = { v: merged, t: meta[k] };
          return;
        }
        if (remoteWins) {
          if (lv != null) bak[k] = { v: lv, t: lT };
          _rawSet(k, rv); meta[k] = rT || nowMs(); changed = true;
          dirty.delete(k);                                              // 古いローカル値の push 予約を破棄
        } else {
          if (!lT) meta[k] = nowMs();
          pushKv[k] = { v: lv, t: meta[k] };
        }
      } else if (lv != null) {
        // ★ アカウント本体はトゥームストーンで消さない。消すとこの端末が即ログアウトされ、
        //    「アプリを開くたびログインを求められる」状態になる。ログアウトは明示操作のみ。
        if (rT > lT && k !== ACC_KEY) {                                 // トゥームストーン＝他端末で削除済み
          _rawRemove(k); meta[k] = rT; changed = true; dirty.delete(k);
        } else if (rT > lT) {
          meta[k] = rT;                                                 // 記録だけ進めて再アップロードは避ける
        } else {
          if (!lT) meta[k] = nowMs();
          pushKv[k] = { v: lv, t: meta[k] };                            // クラウドに無い → アップロード（未移行キーの救済）
        }
      }
    });
    saveMeta(meta);
    if (Object.keys(newBase).length) {
      const b = getBase();
      Object.keys(newBase).forEach((k) => { const n = walletNums(newBase[k]); if (n) b[k] = n; });
      saveBase(b);
    }
  } finally { pushSuspended = false; }
  if (FB) {
    if (Object.keys(bak).length) { try { FB.pushBackup && FB.pushBackup(uid, bak); } catch (e) {} }
    if (Object.keys(pushKv).length) {
      /* ★ 送信できたと分かってから土台を進める。分からないうちに進めると
         次のマージで二重に足したり巻き戻したりする（ここが唯一のこわいところ）。 */
      try {
        const pr = FB.pushStore(uid, pushKv);
        if (pr && pr.then) pr.then((r) => { if (r && r.ok) setBaseMany(pushKv); }).catch(() => {});
      } catch (e) {}
    }
  }
  return changed;
}

/* ローカルの同期対象キー全てをクラウドへ（新規作成直後の初回移行） */
async function pushAll(uid) {
  const meta = getMeta(); const t0 = nowMs();
  const kv = {};
  SYNC_KEYS.forEach((k) => {
    const v = lsGet(k);
    if (v != null) { if (!meta[k]) meta[k] = t0; kv[k] = { v, t: meta[k] }; }
  });
  saveMeta(meta);
  if (Object.keys(kv).length) {
    try { const r = await FB.pushStore(uid, kv); if (r && r.ok) setBaseMany(kv); } catch (e) {}
  }
}

/* ── 送信の間隔 ──
   旧実装は一律 1.2 秒待ってから送っていた。iPhone は「操作してすぐホームに戻る」
   使い方が多く、その 1.2 秒の間にページが凍結されて変更が消えていた。
   ウォレットのように取り違えが致命的なキーは即送信、それ以外は 400ms にする。 */
const PUSH_DEBOUNCE = 400;
/* ★ xeva_shop_v1（ジェムショップの購入履歴）も即送信。
   購入回数の上限をこのキーで数えているので、送信が遅れると
   「別の端末でもう1回買えてしまう」＝上限が意味をなさなくなる。 */
const URGENT_KEYS = new Set(["xeva_wallet_v1", "xeva_gem_v1", "xeva_gticket_v1", "xeva_fticket_v1", "xeva_account_v1", "xeva_gacha_v1",
  "xeva_collection_v1", "xeva_mail_v1", "xeva_mbgift_v1", "xeva_shop_v1", "magilotto_v1",
  /* ★ 2026-08-24 レベル・スタミナ。スタミナは「回復した直後に消費する」が普通に起きるので、
     送信が遅れると端末をまたいだときに<b>回復したはずのぶんが消える</b>。 */
  "xeva_status_v1",
  /* ★ 2026-08-24 プレミアムセレクト券。買ってすぐ使うので送信の遅れが致命的 */
  "xeva_selticket_v1",
  /* ★ 2026-08-30 💠結晶。ガチャで増えて、そのままショップの交換所で使うので同じ理由。 */
  "xeva_cryst_v1"]);

function schedulePush(urgent) {
  if (urgent) { if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; } flushPush(); return; }
  if (pushTimer) return;
  pushTimer = setTimeout(flushPush, PUSH_DEBOUNCE);
}
/* 送信中のキーを退避しておき、失敗したら dirty に戻して次の機会に再送する。
   ※ 旧実装は await の前に dirty.clear() し、かつ pushStore は throw せず {error} を返すため
      catch に入らず、送信に失敗した変更が黙って捨てられていた。 */
let pushInFlight = false;
async function flushPush() {
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  const uid = currentUid();
  if (!uid || !FB || !dirty.size) return;
  if (pushInFlight) { schedulePush(); return; }          // 進行中なら次の機会に（取りこぼさない）
  const kv = {};
  dirty.forEach((e, k) => { kv[k] = e; });
  pushInFlight = true;
  let ok = false;
  try { const r = await FB.pushStore(uid, kv); ok = !!(r && r.ok); } catch (e) { ok = false; }
  pushInFlight = false;
  if (!ok) { schedulePush(); return; }                 // dirty はそのまま＝次回まとめて再送
  setBaseMany(kv);                                     // ★ 2026-09-01 送れた値＝クラウドにある値＝土台
  // 送信できた分だけ dirty から取り除く（送信中に上書きされた新しい値は残す）
  Object.keys(kv).forEach((k) => { const cur = dirty.get(k); if (cur && cur.t === kv[k].t) dirty.delete(k); });
}

/* ★ 離脱時（ホームに戻る／アプリを切り替える／タブを閉じる）専用の送信。
   この瞬間のページは、非同期処理の完了を待ってもらえない。
   fetch(keepalive) はページ破棄後もブラウザが送り切ってくれるので、こちらで確実に届ける。
   通常の flushPush も同時に投げておく（先に届いた方が採用される。値もタイムスタンプも
   同じものを送るので、二重に届いても結果は変わらない）。 */
function flushPushBeacon() {
  const uid = currentUid();
  if (!uid || !dirty.size) return;
  const kv = {};
  dirty.forEach((e, k) => { kv[k] = e; });
  let sent = false;
  try { if (FB && FB.pushStoreBeacon) sent = FB.pushStoreBeacon(uid, kv); } catch (e) {}
  // beacon が使えない／大きすぎた場合は通常 push に賭ける
  if (!sent) { try { flushPush(); } catch (e) {} return; }
  try { flushPush(); } catch (e) {}
}

/* localStorage.setItem/removeItem をモンキーパッチして同期対象の変更を捕捉 */
let patched = false;
function startPushCapture() {
  if (patched) return; patched = true;
  const origSet = localStorage.setItem.bind(localStorage);
  const origRemove = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function (k, v) {
    const before = isSynced(k) ? lsGet(k) : null;
    origSet(k, v);
    if (!pushSuspended && isSynced(k) && String(v) !== before) {
      const t = nowMs();
      dirty.set(k, { v: String(v), t }); stampMeta(k, t); schedulePush(URGENT_KEYS.has(k));
    }
  };
  localStorage.removeItem = function (k) {
    const had = isSynced(k) ? lsGet(k) : null;
    origRemove(k);
    if (!pushSuspended && isSynced(k) && had != null) {
      const t = nowMs();
      dirty.set(k, { v: null, t }); stampMeta(k, t); schedulePush(URGENT_KEYS.has(k));
    }
  };
  // 別タブ（同一端末）の変更も取り込む
  window.addEventListener("storage", (e) => {
    if (!e.key || !isSynced(e.key) || pushSuspended) return;
    const t = nowMs();
    dirty.set(e.key, { v: e.newValue == null ? null : e.newValue, t }); stampMeta(e.key, t);
    schedulePush(URGENT_KEYS.has(e.key));
  });
  // 離脱時に取りこぼしを flush（keepalive でページ破棄後も送り切る）
  window.addEventListener("pagehide", flushPushBeacon);
  window.addEventListener("beforeunload", flushPushBeacon);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushPushBeacon(); });
  /* ★ こまめな同期: 画面が見えている間は定期的に送る。
     長時間開きっぱなしのタブで、送信に失敗したまま溜まった変更を確実に押し出す。 */
  setInterval(() => { if (document.visibilityState === "visible") flushPush(); }, 15000);
}

/* クラウド⇄ローカルのマージ（毎ページ読込で実行）。ローカルが変わったら1回だけ reload */
const RELOAD_FLAG = "xeva_pullrld";
async function syncDown(uid, forceReload) {
  let remote = {}, remoteT = {};
  try { const full = await FB.pullStoreFull(uid); remote = full.kv || {}; remoteT = full.t || {}; } catch (e) {}
  const changed = mergeStore(uid, remote, remoteT);
  /* ★ クラウドの内容をローカルへ取り込み終えた合図。
     XEVA を表示するページは、これを待ってから数字を出すことで
     「古い残高のまま変わらない」状態を防ぐ。 */
  try { window.dispatchEvent(new CustomEvent("xeva:synced", { detail: { changed: changed } })); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent("xeva:change", { detail: { balance: (window.XEVA && window.XEVA.getBalance()) || 0 } })); } catch (e) {}
  if (changed || forceReload) {
    // reload ループ保険（マージは冪等なので通常2回目は changed=false になる）
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
    if (Date.now() - last > 4000) {
      try { sessionStorage.setItem(RELOAD_FLAG, String(Date.now())); } catch (e) {}
      /* ★ 未送信の変更を送り切ってから reload する。
         旧実装は dirty を残したまま reload していたため、
         「XEVAを使った直後に別端末の更新が届いた」ようなタイミングで
         その消費が送られないまま破棄され、残高が元に戻っていた。 */
      try { await flushPush(); } catch (e) {}
      location.reload(); return true;
    }
  }
  return false;
}

/* ★ こまめな取り込み: 画面に戻ってきたらクラウドの最新を取り込む。
   別端末で進めた内容がすぐ反映され、逆にこちらの未送信分は先に押し出す。
   reload は伴わない（操作中に画面が飛ばないように、値だけ静かに差し替える）。 */
let _pullBusy = false;
async function pullNow() {
  const uid = currentUid();
  if (!uid || !FB || _pullBusy) return false;
  _pullBusy = true;
  try {
    /* ★★ 2026-09-01 <b>順番を入れ替えた</b>。
       これまでは「先に送る → 取りに行く」だったので、
       こちらの値でクラウドを上書きしてから読み直すことになり、
       別端末の増減が<b>混ざる前に消えて</b>いた。
       いまは「取りに行く → 混ぜる → 送る」。 */
    const full = await FB.pullStoreFull(uid);
    const changed = mergeStore(uid, full.kv, full.t);
    await flushPush();                                   // 混ざった結果と、未送信ぶんを送る
    try { window.dispatchEvent(new CustomEvent("xeva:synced", { detail: { changed } })); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("xeva:change", { detail: { balance: (window.XEVA && window.XEVA.getBalance()) || 0 } })); } catch (e) {}
    return changed;
  } catch (e) { return false; } finally { _pullBusy = false; }
}

/* ════════════ 別端末に持って行かれた時のアクセス画面（ゲームページ共通） ════════════
   ★ 旧実装はゲームページを問答無用で PORTAL_URL へ replace していた。そのため
     「別端末で同じアプリを開く → こちらの端末がXEVARIONに飛ばされる → スタートしても
      ポータルに居るのでアプリに入り直せない」状態になっていた。
   ここではページ遷移せず、アプリの上にアクセス画面を重ねるだけにする。タップすると
   reclaim() でこの端末を再びアクティブにし、最新データをマージしてそのままアプリに戻る。 */
const SUPERSEDE_OV_ID = "xevaSupersedeOv";
function showSupersedeGate() {
  if (document.getElementById(SUPERSEDE_OV_ID)) return;
  const ov = document.createElement("div");
  ov.id = SUPERSEDE_OV_ID;
  ov.setAttribute("role", "button");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:2147483600;display:flex;flex-direction:column;align-items:center;" +
    "justify-content:center;gap:18px;padding:24px;text-align:center;cursor:pointer;" +
    "background:rgba(8,8,20,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);" +
    "color:#fff;font-family:'Noto Sans JP',system-ui,sans-serif;-webkit-tap-highlight-color:transparent";
  ov.innerHTML =
    '<div style="font-size:42px">📱</div>' +
    '<div style="font-weight:800;font-size:1.05rem;line-height:1.6">ほかの端末でこのアプリが開かれました</div>' +
    '<div style="font-size:.8rem;color:#9aa0c0;line-height:1.7;max-width:22em">' +
    "データを守るため、いったんお休み中です。<br>タップするとこの端末で再開できます（最新のデータを読み込みます）。</div>" +
    '<div id="xevaSupersedeBtn" style="margin-top:6px;padding:13px 30px;border-radius:99px;font-weight:800;' +
    'background:linear-gradient(135deg,#ff9d2e,#ff5d8f,#8e6bff);box-shadow:0 10px 30px rgba(142,107,255,.4)">' +
    "タップして再開</div>" +
    '<div style="font-size:.7rem;color:#6a6a86;margin-top:10px;text-decoration:underline" id="xevaSupersedePortal">XEVARION ポータルへ戻る</div>';
  let busy = false;
  ov.addEventListener("click", async (e) => {
    if (e.target && e.target.id === "xevaSupersedePortal") { location.replace(PORTAL_URL); return; }
    if (busy) return;
    busy = true;
    const btn = ov.querySelector("#xevaSupersedeBtn");
    if (btn) btn.textContent = "再開しています…";
    try { await reclaim(); } catch (err) {}
    ov.remove();   // ★ ポータルへは飛ばさず、そのままアプリに戻る
  });
  document.body.appendChild(ov);
}

/* ════════════ セッション監視 ════════════ */
let watchStop = null;
function startWatch(uid, dev) {
  if (watchStop) { try { watchStop(); } catch (e) {} watchStop = null; }
  // ★ 監視対象はこのアプリ(APP_ID)のセッションだけ。別アプリを別端末で開かれても追い出さない。
  watchStop = FB.watchSession(uid, (session) => {
    if (!session || !session.deviceId) return;                 // まだ主張されていない
    if (session.deviceId !== dev) {                            // 同一アプリを他端末が最後に開いた
      // ★ ログインは保持したまま「アクセス画面」へ。次のスタートで最新をpull。
      flushPush();                                             // 追い出される前に未送信の変更を送る
      if (IS_PORTAL && typeof window.onXevaSuperseded === "function") {
        window.onXevaSuperseded();                             // ポータル：通知＋アクセス画面
      } else if (typeof window.onXevaSuperseded === "function") {
        window.onXevaSuperseded();                             // アプリ独自のアクセス画面があればそちら
      } else {
        showSupersedeGate();                                   // ゲームページ：その場でアクセス画面を重ねる
      }
    }
  }, APP_ID);
}

/* アクセス画面で「タップしてスタート」した時にセッションを取り戻す（この端末を再びアクティブに） */
async function reclaim() {
  FB = FB || (await waitFB());
  const uid = currentUid();
  if (!FB || !uid) return;
  const dev = deviceId();
  const ls = getLocalSession() || {}; ls.uid = uid; ls.deviceId = dev; ls.active = true; setLocalSession(ls);
  try { await FB.claimSession(uid, dev, APP_ID); } catch (e) {}
  startWatch(uid, dev);
  // 追い出されている間に別端末が変更している可能性 → 最新をマージ（reloadなし・新しい側が勝つ）
  try { const full = await FB.pullStoreFull(uid); mergeStore(uid, full.kv, full.t); } catch (e) {}
  try { window.dispatchEvent(new Event("xeva:change")); } catch (e) {}
}

/* ════════════ ログイン確立（起動時・ログイン中の端末） ════════════ */
async function establishSession() {
  FB = await waitFB();
  if (!FB) return;
  const uid = currentUid();
  if (!uid) return;
  /* ★ 2026-08-05: アカウントが「アカウント管理（admin）から削除されていた」場合、
     この端末には XEVA も各ゲームのセーブも残ったままになる。
     クラウドに本人のレコードが<b>確かに無い</b>と分かったときだけ、端末のデータも完全に消す
     （＝自分で削除しても管理から削除しても「端末に残らない」を保証する）。
     ★ ここは絶対に「通信できなかった」と混同してはいけない。
       FB.accountGone は true=消えている／false=ある／<b>null=確かめられなかった</b> を返す。
       null のときは何もしない（電波が悪いだけの端末のデータを消さないため）。 */
  if (FB.accountGone) {
    let gone = null;
    try { gone = await FB.accountGone(uid); } catch (e) { gone = null; }
    if (gone === true) {
      try { if (watchStop) watchStop(); } catch (e) {}
      purgeLocalAccount();
      setLocalSession({ uid: null, deviceId: deviceId(), active: false });
      try { location.replace(PORTAL_URL); } catch (e) {}
      return;
    }
  }
  guardOwner(uid);   // この端末のデータの持ち主を確定（通常は同一uidなので何もしない）
  const dev = deviceId();
  // この端末をアクティブに（最後に開いた端末が勝つ）
  try { await FB.claimSession(uid, dev, APP_ID); } catch (e) {}
  try { if (FB.touchLastLogin) FB.touchLastLogin(uid); } catch (e) {}
  const ls = getLocalSession() || {};
  ls.uid = uid; ls.deviceId = dev; ls.active = true; setLocalSession(ls);
  startWatch(uid, dev);
  startPushCapture();
  const reloaded = await syncDown(uid, false);
  if (reloaded) return;   // reload するのでここで終了
}

/* ════════════ ログイン（ホーム画面から） ════════════ */
async function login(name, pin) {
  FB = await waitFB();
  if (!FB) return { error: "net" };
  name = String(name || "").trim();
  if (!name) return { error: "noname" };
  if (!/^\d{4}$/.test(String(pin || ""))) return { error: "pin" };
  const hit = await FB.findByName(name);
  if (!hit || !hit.uid) return { error: "notfound" };
  const hash = await FB.hashPw(pin);
  const ok = await FB.verifyGamePw(hit.uid, hash);
  if (!ok) return { error: "pin" };
  const uid = hit.uid;
  // ★ 別アカウントの端末データが残っていたら除去（前アカウントへの混入・逆流を防ぐ）
  guardOwner(uid);
  // アカウントのコア情報をローカルへ反映（他ローカル項目は維持）
  const remoteAcc = (await FB.getAccount(uid)) || hit;
  const a = getAcc() || {};
  a.name = remoteAcc.name || name;
  a.charFile = remoteAcc.charFile || a.charFile || "s0/Hina.png";
  a.charId = remoteAcc.charId || a.charId || "hina";
  a.gamePwHash = remoteAcc.gamePwHash || hash;
  a.xvUid = uid;
  a.setupDone = true;
  saveAcc(a); stampMeta(ACC_KEY, Date.now());
  // セッション確立 → クラウドとマージ（1回 reload）
  const dev = deviceId();
  setLocalSession({ uid, deviceId: dev, active: true });
  try { await FB.claimSession(uid, dev, APP_ID); } catch (e) {}
  try { if (FB.touchLastLogin) FB.touchLastLogin(uid); } catch (e) {}
  startPushCapture();
  try { sessionStorage.removeItem(RELOAD_FLAG); } catch (e) {}
  await syncDown(uid, true);   // 必ず reload してログイン状態で起動
  return { ok: true, uid };
}

/* ════════════ ログアウト ════════════
   ★ 未送信の変更を送り切ってから、アカウントに属するデータを端末から消す。
     消さないと、次に新規登録した人がこのデータを引き継いでしまう（＝報告された不具合）。
     クラウドには送信済みなので、同じ名前と4桁PINでログインすれば全部戻ってくる。 */
async function logout() {
  const uid = currentUid();
  const dev = deviceId();
  FB = FB || (await waitFB());
  try { await flushPush(); } catch (e) {}
  try { if (FB) await FB.logoutSession(uid, dev, APP_ID); } catch (e) {}
  try { if (watchStop) watchStop(); } catch (e) {}
  wipeLocalAccount(false);                       // ★ アカウント本体も含めて全部消す
  setLocalSession({ uid: null, deviceId: dev, active: false });
  try { sessionStorage.removeItem(RELOAD_FLAG); } catch (e) {}
  goHome();
  /* 画面上にはログアウト前のデータがまだ描かれているので、必ず読み直す。 */
  setTimeout(() => { try { location.reload(); } catch (e) {} }, 120);
}

/* 新規アカウント作成直後（ウィザード）に呼ぶ：セッション主張＋初回移行
   ★ guardOwner を通すこと。前のアカウントのデータが端末に残っていた場合は
     ここで消える（直接 OWNER_KEY を書いていた旧実装は、この掃除を飛ばしていたため
     前のアカウントのセーブがそのまま新アカウントへ上がっていた）。 */
async function onAccountCreated() {
  FB = FB || (await waitFB());
  const uid = currentUid();
  if (!FB || !uid) return;
  const dev = deviceId();
  guardOwner(uid);
  try { sessionStorage.setItem(RELOAD_FLAG, String(Date.now())); } catch (e) {}   // 直後の reload を避ける
  setLocalSession({ uid, deviceId: dev, active: true });
  try { await FB.claimSession(uid, dev, APP_ID); } catch (e) {}
  startWatch(uid, dev);
  startPushCapture();
  /* ★ 先にクラウドを見る。すでに store があるアカウント（＝機種変・入れ直し）に
     いきなり pushAll すると、手元の空っぽの状態でクラウドを塗りつぶしてしまう。 */
  let hasRemote = false;
  try {
    const full = await FB.pullStoreFull(uid);
    hasRemote = !!(full && full.kv && Object.keys(full.kv).length);
    if (hasRemote) mergeStore(uid, full.kv, full.t);
  } catch (e) {}
  if (!hasRemote) await pushAll(uid);   // 作成直後のローカル（スターター）をクラウドへ
}

/* ════════════ 月間XEVA獲得の送信（MagiRankingランキング用） ════════════
   xeva.js の add() が xeva_earn_pending_v1 に獲得量を積む（オフラインでも貯まる）。
   ここでオンライン時にまとめてクラウド(monthly)へ送信する。 */
const EARN_KEY = "xeva_earn_pending_v1";
let earnFlushing = false;
async function flushEarn() {
  if (earnFlushing) return;
  const uid = currentUid();
  FB = FB || (await waitFB());
  if (!FB || !FB.addMonthlyEarn || !uid) return;
  const amt = Math.round(Number(lsGet(EARN_KEY) || 0));
  if (amt <= 0) return;
  earnFlushing = true;
  try {
    const r = await FB.addMonthlyEarn(uid, amt);
    if (r && r.ok) {
      const now = Math.round(Number(lsGet(EARN_KEY) || 0));
      const rest = Math.max(0, now - amt);          // 送信中に増えた分は残す
      try { rest > 0 ? _rawSet(EARN_KEY, String(rest)) : _rawRemove(EARN_KEY); } catch (e) {}
    }
  } catch (e) { /* オフライン等 → 次回に再送 */ }
  earnFlushing = false;
}
window.addEventListener("xeva:earned", () => { setTimeout(flushEarn, 800); });
window.addEventListener("online", () => { setTimeout(flushEarn, 1500); });

/* ════════════ オフライン → オンライン復帰時の反映 ════════════
   オフライン中の書込は startPushCapture が xeva_keymeta_v1 に「ローカル書込時刻」を刻むので、
   復帰後の push / merge ではローカル側が新しく判定され、クラウドを上書きする。
   ここではその push を復帰と同時に走らせる。
   ※ オフラインのままページを開いた場合は Firebase SDK（CDN の ESM import）自体が
     読み込めておらず FB が null。この場合だけは再読込しないと同期を確立できない。 */
let _onlineResyncing = false;
window.addEventListener("online", async () => {
  if (!isLoggedIn() || _onlineResyncing) return;
  _onlineResyncing = true;
  try {
    if (FB) {
      /* ★★ 2026-09-01 いきなり送らず、まず<b>取りに行って混ぜる</b>（pullNow が
         「取りに行く → 混ぜる → 送る」をやる）。オフライン中にこちらで増えたぶんと、
         そのあいだに別端末で増えたぶんの<b>両方</b>を残すため。 */
      await pullNow();
      await flushEarn();
    } else {
      // SDK 未読込 → 少し待って再読込（ユーザー操作中の巻き戻しを避けるため 3 秒後）
      setTimeout(() => { try { location.reload(); } catch (e) {} }, 3000);
    }
  } catch (e) {} finally { _onlineResyncing = false; }
});

/* ════════════ XEVA整合性の強化（iPhone対策） ════════════
   ・XEVAが変化したら即クラウドへ送信（デバウンスを待たない）。
     これで「消費してすぐ別ページへ移動 → 移動先が古いクラウド値を取得して消費分が復活」する
     時間差を最小化する。 */
window.addEventListener("xeva:change", () => { try { flushPush(); } catch (e) {} });

/* ★ こまめな同期（画面に戻ったとき）
   iPhone は他アプリへ切り替えるとページが凍結され、戻ってきたときに
   ・こちらの未送信分がまだ残っている
   ・その間に別端末が進めた内容が届いていない
   のどちらも起こりうる。復帰のたびに「送る → 取り込む」を1往復させる。 */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (!isLoggedIn()) return;
  setTimeout(() => { try { pullNow(); } catch (e) {} }, 150);
});
window.addEventListener("focus", () => {
  if (!isLoggedIn()) return;
  setTimeout(() => { try { flushPush(); } catch (e) {} }, 100);
});

/* ・戻る/進む（bfキャッシュ）で復元されたページは、メモリ上に古いXEVA/セーブを持っている。
     そのまま操作するとその古い値が保存されてクラウドへ逆流し、消費したXEVAが復活してしまう。
     bfキャッシュ復元時（pageshow.persisted）はページを再読み込みして、必ずクラウドと再同期した
     最新状態から始める。＝「XEVAがかかわる場面では常にクラウドから取得」する。 */
window.addEventListener("pageshow", (e) => {
  if (e && e.persisted && isLoggedIn()) {
    try { location.reload(); } catch (err) {}
  }
});

/* ════════════ 起動 ════════════ */

/* ★ 書込キャプチャは Firebase を待たずに、モジュール評価と同時にインストールする。
   旧実装は establishSession() の中＝ await waitFB() の後に呼んでいたため、
   オフラインや低速回線（waitFB が 8秒でタイムアウトして null を返す）では
   ページの寿命の間ずっと一度もインストールされなかった。
   すると localStorage への書込が xeva_keymeta_v1 に刻まれず、次回のマージで
   「ローカルは古い」と誤判定されてクラウド側が勝ち、その間の進行が丸ごと巻き戻る。
   （＝iPhone で XEVA が増減しない・キャラや学習が保存されない症状の原因） */
if (isLoggedIn()) startPushCapture();

function announceSynced() {
  try { window.dispatchEvent(new CustomEvent("xeva:synced", { detail: { changed: false } })); } catch (e) {}
}
(async function boot() {
  // 未ログイン: ポータルはホーム表示は xevarion.js が担当。ゲームページはホームへ。
  if (!isLoggedIn()) {
    if (!IS_PORTAL) { goHome(); }
    announceSynced();
    return;
  }
  try { await establishSession(); } catch (e) {}
  announceSynced();          // FBに繋がらなくても待たせ続けない
  flushEarn();   // オフライン中に貯まった獲得XEVAをランキングへ反映
})();

window.XevaCloud = {
  ready: true,
  login, logout, onAccountCreated, reclaim,
  isLoggedIn, currentUid, deviceId,
  SYNC_KEYS, PORTAL_URL, IS_PORTAL,
  flushPush, flushPushBeacon, pullNow,
  /* 登録まわりから呼べるように公開（前のアカウントの残りを掃除する） */
  wipeLocalAccount,
  /* ★ 2026-08-05 アカウント削除専用（端末設定いがいを全部消す） */
  purgeLocalAccount,
};
try { window.dispatchEvent(new Event("xevacloud:ready")); } catch (e) {}

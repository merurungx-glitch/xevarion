// ============================================================
// ORDYXIS 共通スクリプト
//  - スプラッシュ画面 (NGX / MagicalFuture / ORDYXIS ロゴ + ロードバー)
//  - データ層 (Firebase Realtime Database / デモ用 localStorage)
// ============================================================
"use strict";

// ---------------- メニュー定義 ----------------
const MENU = [
  { id: "churro_plain",      name: "チュロス プレーン",     category: "チュロス", price: 50, img: "img/Ordyxis_MC_Plain.png" },
  { id: "churro_cinnamon",   name: "チュロス シナモン",     category: "チュロス", price: 50, img: "img/Ordyxis_MC_Cinnamon.png" },
  { id: "churro_cocoa",      name: "チュロス ココア",       category: "チュロス", price: 50, img: "img/Ordyxis_MC_Cocoa.png" },
  { id: "churro_kinako",     name: "チュロス きな粉",       category: "チュロス", price: 50, img: "img/Ordyxis_MC_Kinako.png" },
  { id: "churro_maccha",     name: "チュロス 抹茶",         category: "チュロス", price: 50, img: "img/Ordyxis_MC_Maccha.png" },
  { id: "churro_strawberry", name: "チュロス ストロベリー", category: "チュロス", price: 50, img: "img/Ordyxis_MC_Strawberry.png" },
  { id: "churro_curry",      name: "チュロス カレー",       category: "チュロス", price: 50, img: "img/Ordyxis_MC_Curry.png" },
  { id: "sauce_caramel",     name: "キャラメルソース",      category: "ソース",   price: 0,  img: "img/Ordyxis_MS_Caramel.png" },
  { id: "sauce_chocolate",   name: "チョコレートソース",    category: "ソース",   price: 0,  img: "img/Ordyxis_MS_Chocolate.png" }
];

const yen = (n) => "¥" + Number(n).toLocaleString("ja-JP");
// 単価の表示用ラベル。0円は「無料」と表示する (ソース用)。合計金額には使わない。
const priceLabel = (n) => Number(n) === 0 ? "無料" : yen(n);
// 注文明細1件の表示名。チュロスに紐づくソースがあれば併記する。
function itemLabel(i) {
  if (!i) return "";
  return i.sauce && i.sauce.name ? i.name + " ＋ " + i.sauce.name : i.name;
}
const fmtNo = (n) => String(n).padStart(3, "0");
// 番号帯: 今すぐ注文 001〜 / 紙オーダー(店舗手入力) 401〜 / 時間指定予約 801〜。
// 紙オーダーかどうかは「時間指定でない(type!=='scheduled')」かつ「番号が401以上」で判定する。
// (予約は801〜なので番号だけでは紙オーダーと区別できない。type で予約を除外する。)
// 注文データに manual フラグは保存しない (DBルールが未知フィールドを拒否するため)ので、
// 保存済みの注文は番号帯と type で見分ける。
const PAPER_ORDER_BASE = 401;      // 紙オーダーの開始番号
const SCHED_ORDER_BASE = 801;      // 時間指定予約の開始番号
function isPaperOrder(o) {
  return !!o && o.type !== "scheduled" && Number(o.number) >= PAPER_ORDER_BASE;
}

// ---------------- チュロスの料金・数量ルール (customer / store 共通の単一ソース) ----------------
//   基本3個 = ¥150 (通常¥300の50%OFF / 確定・最低注文)、4個目以降は 1個 ¥50 で追加。
//   お客様(QR)注文は合計8個まで。紙オーダー(店舗手入力)は上限を緩め、8個以上も入力できる。
const MIN_CHURROS = 3;             // 最低注文数 (3個未満は注文不可)
const MAX_CHURROS = 8;             // お客様(QR)1注文の上限
const PAPER_MAX_CHURROS = 999;     // 紙オーダー(店舗手入力)の上限 (8個以上を入力可能にする)
const CHURRO_BASE_QTY = 3;         // 基本セットの個数
const CHURRO_BASE_PRICE = 150;     // 基本3個の料金 (50%OFF適用後の実価格)
const CHURRO_BASE_LIST_PRICE = 300;// 基本3個の通常価格 (50%OFF表記用の元値)
const CHURRO_ADD_PRICE = 50;       // 4個目以降の追加単価 (実際の請求額。変更なし)
const CHURRO_ADD_LIST_PRICE = 75;  // 4個目以降の通常価格 (33%OFF表記用の元値。請求はCHURRO_ADD_PRICE)
const CHURRO_ADD_OFF_PCT = 33;     // 4個目以降の割引率 (75円→50円 ≒ 33%OFF) ※表記用
// チュロス n 個の合計料金 (段階制: 基本3個 + 4個目以降の加算)。請求額は CHURRO_ADD_PRICE で不変。
function churroSetPrice(n) {
  if (n <= 0) return 0;
  return CHURRO_BASE_PRICE + Math.max(0, n - CHURRO_BASE_QTY) * CHURRO_ADD_PRICE;
}

// 画像が見つからない場合の代替表示 (グレーのプレースホルダー)
function imgFallback(imgEl, label) {
  imgEl.onerror = null;
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
    '<rect width="100%" height="100%" fill="#e8e8ee"/>' +
    '<text x="50%" y="50%" font-size="22" fill="#888" text-anchor="middle" dominant-baseline="middle">' +
    label + "</text></svg>";
  imgEl.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// ---------------- スプラッシュ画面 ----------------
// 起動ロゴ・ロード表示は XEVARION 全アプリ共通の ../xeva-splash.js に統一した。
// （各ページの <head> で読み込む。ここは「閉じたら onDone」を呼ぶだけの薄い受け口）
function showSplash(onDone) {
  if (window.XevaSplash) { window.XevaSplash.done().then(function () { if (onDone) onDone(); }); return; }
  if (onDone) onDone();
}

// ---------------- データ層 ----------------
// DB.mode                       : "firebase" | "local"
// DB.createOrder(items, total)  : Promise<{id, number}>
// DB.watchOrders(cb)            : 全注文を作成順の配列で通知 (リアルタイム)
// DB.watchOrder(id, cb)         : 単一注文の変更を通知
// DB.setStatus(id, status)      : "new" | "calling" | "done"
// DB.watchStock(cb)             : 商品ごとの注文可能数(上限)設定を通知 {productId: limit}
// DB.setStockLimit(id, limit)   : 商品の注文可能数を設定 (null/空で無制限)
const DB = (() => {
  const dayKey = () => {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  };

  // 在庫・予約枠の確保に失敗したとき (争奪戦で先客に取られたとき) に投げる例外。
  //   reason: "stock" | "slot"、detail: 商品ID または 受取時刻
  function soldOutError(reason, detail) {
    const e = new Error(reason === "slot" ? "受取時刻が満員になりました" : "売り切れになりました");
    e.code = "SOLD_OUT"; e.reason = reason; e.detail = detail;
    return e;
  }
  // 1注文に必要な商品ごとの個数を集計
  function neededCounts(items) {
    const need = {};
    (items || []).forEach((i) => { if (i && i.id) need[i.id] = (need[i.id] || 0) + (i.qty || 0); });
    return need;
  }

  const firebaseReady =
    typeof FIREBASE_CONFIG !== "undefined" &&
    FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey.indexOf("YOUR_") !== 0 &&
    typeof firebase !== "undefined";

  // ---------- Firebase 実装 ----------
  if (firebaseReady) {
    firebase.initializeApp(FIREBASE_CONFIG);
    const rtdb = firebase.database();

    // ---------- localStorage キャッシュ (DBアクセス削減・即時表示・オフライン耐性) ----------
    // 一度読み込んだデータを localStorage に保存し、次回は「まずキャッシュを表示 → 最新で更新」
    // (stale-while-revalidate)。再訪時の体感を速くし、通信できない時も直近のデータを表示できる。
    // プロジェクトIDごとにキーを分け、Firebase 差し替え時にデータが混ざらないようにする。
    const _cachePrefix = "ordyxis_cache_" + (FIREBASE_CONFIG.projectId || "default") + "_";
    function cacheGet(name) {
      try { const v = localStorage.getItem(_cachePrefix + name); return v == null ? undefined : JSON.parse(v); }
      catch (e) { return undefined; }
    }
    function cacheSet(name, data) {
      try { localStorage.setItem(_cachePrefix + name, JSON.stringify(data)); } catch (e) {}
    }

    // ---------- 同時接続カウント (Firebase 無料枠 100接続の保護) ----------
    // 各端末は接続中だけ presence ノードを持ち、切断(onDisconnect)で自動削除される。
    // その子要素数 ≒ 現在のおおよその同時接続数。
    let presenceRef = null;
    let presenceRole = null;
    let connectedHooked = false;

    return {
      mode: "firebase",
      // この端末を「接続中」として登録する。切断・goOffline で自動的に外れる。
      joinPresence(role) {
        presenceRole = role || presenceRole || "?";
        try {
          if (connectedHooked) return;
          connectedHooked = true;
          // 接続が確立(または再確立)するたびに presence ノードを作り直す。
          // 再接続時は切断で消えた自分のノードを必ず復活させる(入室済み端末の取りこぼし防止)。
          rtdb.ref(".info/connected").on("value", (s) => {
            if (s.val() !== true || !presenceRole) return;
            if (presenceRef === null) presenceRef = rtdb.ref("presence").push();
            presenceRef.onDisconnect().remove();
            presenceRef.set({ role: presenceRole, ts: firebase.database.ServerValue.TIMESTAMP });
          });
        } catch (e) {}
      },
      // この端末の presence を即時に外す (接続スロットを解放したい待機時に使用)
      leavePresence() {
        try { if (presenceRef) { presenceRef.remove(); presenceRef = null; } } catch (e) {}
      },
      // 現在のおおよその同時接続数を購読
      watchConnections(cb) {
        try { rtdb.ref("presence").on("value", (snap) => cb(snap.numChildren())); } catch (e) { cb(0); }
      },
      // データベース接続を一時切断 / 再接続 (待機中にスロットを空けるため)
      goOffline() { try { firebase.database().goOffline(); } catch (e) {} },
      goOnline() { try { firebase.database().goOnline(); } catch (e) {} },
      async createOrder(items, total, opts) {
        opts = opts || {};
        const day = dayKey();
        const scheduled = opts.type === "scheduled";
        // 紙オーダー(店舗手入力): 番号は発行せず、在庫上限でも弾かない(スタッフが実物を確保済み)。
        //   ただし使用数カウンターは加算して、QR注文の在庫集計が狂わないようにする。
        const manual = opts.manual === true;

        // ===== 在庫・予約枠の原子的な確保 (争奪戦の整合性: 先勝ち・後発は失敗) =====
        // トランザクションで枠カウンターを加算し、上限を超える場合は中断(=失敗)させる。
        // カウンターは初回書き込み時に「現在の注文から集計した使用数」でシードするため、
        // 途中導入でも既存注文を正しく織り込み、二重計上しない。
        const need = neededCounts(items);

        // 現在の注文から本日の使用数を集計 (カウンター未作成時のシード値)
        const ordersSnap = await rtdb.ref("orders").once("value");
        const usedStock = {}, usedSlot = {};
        ordersSnap.forEach((c) => {
          const o = c.val();
          if (!o || o.day !== day || o.status === "cancelled") return;
          (o.items || []).forEach((i) => { if (i && i.id) usedStock[i.id] = (usedStock[i.id] || 0) + (i.qty || 0); });
          if (o.type === "scheduled" && o.pickupTime) usedSlot[o.pickupTime] = (usedSlot[o.pickupTime] || 0) + 1;
        });

        const limitsSnap = await rtdb.ref("settings/stock").once("value");
        const limits = limitsSnap.val() || {};

        const committed = [];  // ロールバック用 [{ref, amount}]
        const reserve = async (ref, amount, max, seed) => {
          const r = await ref.transaction((n) => {
            const base = (n == null) ? (seed || 0) : n;
            if (max != null && base + amount > max) return;   // 上限超過 → 中断
            return base + amount;
          });
          if (!r.committed) return false;
          committed.push({ ref, amount });
          return true;
        };
        const rollback = async () => {
          for (const c of committed) {
            try { await c.ref.transaction((n) => Math.max(0, (n || 0) - c.amount)); } catch (e) {}
          }
        };

        // 枠カウンターは書き込み可能な counters ノード配下に複合キーで保存する
        //   (DBルールで最上位の新規ノードは作成不可のため。counters は clearAll で日次クリアされる)
        //   予約スロット : counters/{day}__slot__{HH:MM}
        //   在庫使用数   : counters/{day}__stock__{productId}
        // (1) 予約スロットの定員
        if (scheduled && opts.pickupTime) {
          const resvSnap = await rtdb.ref("settings/reservation").once("value");
          const cfg = resvSnap.val() || {};
          const capacity = (cfg.capacity != null && cfg.capacity !== "") ? Number(cfg.capacity) : 8;
          const ok = await reserve(rtdb.ref("counters/" + day + "__slot__" + opts.pickupTime), 1, capacity, usedSlot[opts.pickupTime] || 0);
          if (!ok) { await rollback(); throw soldOutError("slot", opts.pickupTime); }
        }
        // (2) 各商品の在庫上限 (上限未設定の商品はスキップ=無制限)
        for (const pid of Object.keys(need)) {
          const raw = limits[pid];
          const rawLim = (raw != null && raw !== "") ? Number(raw) : null;
          if (rawLim == null || isNaN(rawLim)) continue;
          // 紙オーダーは上限で弾かない(max=null)が、カウンターは加算して集計を維持する。
          const lim = manual ? null : rawLim;
          const ok = await reserve(rtdb.ref("counters/" + day + "__stock__" + pid), need[pid], lim, usedStock[pid] || 0);
          if (!ok) { await rollback(); throw soldOutError("stock", pid); }
        }

        // ===== 枠を確保できたので採番して注文を作成 =====
        //   今すぐ注文: 001,002... / 紙オーダー: 401,402... / 予約: 801,802...
        //   (採番カウンターと番号の開始値を分け、3系統が衝突しないようにする)
        //   紙オーダーで番号を明示指定した場合 (opts.number) は、その番号で作成する
        //   (番号の連携が取れていない注文を、指定番号で再現・催促するため)。
        let number;
        const fixedNum = (manual && opts.number != null && !isNaN(opts.number)) ? Math.floor(Number(opts.number)) : null;
        if (fixedNum != null && fixedNum > 0) {
          number = fixedNum;
        } else {
          let counterPath, numBase;
          if (manual)         { counterPath = "counters/" + day + "__paper"; numBase = PAPER_ORDER_BASE - 1; }
          else if (scheduled) { counterPath = "counters/" + day + "__sched"; numBase = SCHED_ORDER_BASE - 1; }
          else                { counterPath = "counters/" + day;             numBase = 0;   }
          const res = await rtdb.ref(counterPath).transaction((n) => (n || 0) + 1);
          number = numBase + res.snapshot.val();
        }
        const ref = rtdb.ref("orders").push();
        const data = {
          number, items, total, day,
          status: "new",
          type: scheduled ? "scheduled" : "now",
          createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        if (scheduled && opts.pickupTime) data.pickupTime = opts.pickupTime;
        try {
          await ref.set(data);
        } catch (e) {
          await rollback();   // 注文書き込みに失敗したら確保枠を戻す
          throw e;
        }
        return { id: ref.key, number };
      },
      // 注文をキャンセルし、確保していた在庫枠・予約スロットを解放する。
      // 状態をトランザクションで new→cancelled に切り替えた者だけが枠を戻す(二重解放防止)。
      async cancelOrder(id) {
        const snap = await rtdb.ref("orders/" + id).once("value");
        const o = snap.val();
        if (!o || o.status === "cancelled") return;
        const r = await rtdb.ref("orders/" + id + "/status").transaction((s) => {
          if (s === "cancelled") return;   // 既にキャンセル済み → 中断 (二重解放しない)
          return "cancelled";
        });
        if (!r.committed) return;
        const day = o.day;
        if (o.type === "scheduled" && o.pickupTime) {
          try { await rtdb.ref("counters/" + day + "__slot__" + o.pickupTime).transaction((n) => Math.max(0, (n || 0) - 1)); } catch (e) {}
        }
        const need = neededCounts(o.items);
        for (const pid of Object.keys(need)) {
          try { await rtdb.ref("counters/" + day + "__stock__" + pid).transaction((n) => Math.max(0, (n || 0) - need[pid])); } catch (e) {}
        }
      },
      setPickupTime(id, time) {
        return rtdb.ref("orders/" + id + "/pickupTime").set(time);
      },
      setArrived(id, val) {
        // 来店(受け取りエリア到着)の確認。到着時刻を記録、取消は null
        return rtdb.ref("orders/" + id + "/arrived").set(val ? firebase.database.ServerValue.TIMESTAMP : null);
      },
      watchReservation(cb) {
        const c = cacheGet("reservation"); if (c !== undefined) { try { cb(c); } catch (e) {} }
        rtdb.ref("settings/reservation").on("value", (snap) => {
          const v = snap.val() || null; cacheSet("reservation", v); cb(v);
        });
      },
      setReservation(cfg) {
        return rtdb.ref("settings/reservation").set(cfg);
      },
      watchOrders(cb) {
        const c = cacheGet("orders"); if (c !== undefined) { try { cb(c); } catch (e) {} }
        rtdb.ref("orders").orderByChild("createdAt").on("value", (snap) => {
          const list = [];
          snap.forEach((c2) => { list.push(Object.assign({ id: c2.key }, c2.val())); });
          cacheSet("orders", list);
          cb(list);
        });
      },
      watchOrder(id, cb) {
        const c = cacheGet("order_" + id); if (c !== undefined) { try { cb(c); } catch (e) {} }
        rtdb.ref("orders/" + id).on("value", (snap) => {
          const v = snap.val();
          const out = v ? Object.assign({ id }, v) : null;
          cacheSet("order_" + id, out);
          cb(out);
        });
      },
      setStatus(id, status) {
        return rtdb.ref("orders/" + id + "/status").set(status);
      },
      watchStock(cb) {
        const c = cacheGet("stock"); if (c !== undefined) { try { cb(c); } catch (e) {} }
        rtdb.ref("settings/stock").on("value", (snap) => {
          const v = snap.val() || {}; cacheSet("stock", v); cb(v);
        });
      },
      setStockLimit(id, limit) {
        if (limit === null || limit === "" || isNaN(limit)) return rtdb.ref("settings/stock/" + id).remove();
        return rtdb.ref("settings/stock/" + id).set(Number(limit));
      },
      clearAll() {
        // 全注文履歴と採番カウンターを削除 (番号は001からやり直し)。在庫上限設定・予約設定は保持。
        // 枠の使用数カウンター(counters/{day}__slot__* / __stock__*)も counters 配下なので同時にクリアされる。
        return Promise.all([
          rtdb.ref("orders").remove(),
          rtdb.ref("counters").remove()
        ]);
      }
    };
  }

  // ---------- デモモード (localStorage) ----------
  // Firebase 未設定時のフォールバック。同じブラウザの別タブ間でのみ共有されます。
  const KEY = "ordyxis-demo-db";
  const load = () => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY)) || {};
      return {
        counters: d.counters || {}, counters_sched: d.counters_sched || {},
        orders: d.orders || {}, stock: d.stock || {},
        reservation: d.reservation || null
      };
    }
    catch (e) { return { counters: {}, counters_sched: {}, orders: {}, stock: {}, reservation: null }; }
  };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const orderWatchers = [];
  const singleWatchers = {};
  const stockWatchers = [];
  const reservationWatchers = [];
  let lastSnapshot = null;

  function notify(force) {
    const raw = localStorage.getItem(KEY) || "";
    if (!force && raw === lastSnapshot) return; // 変更なしなら再描画しない
    lastSnapshot = raw;
    const d = load();
    const list = Object.keys(d.orders)
      .map((id) => Object.assign({ id }, d.orders[id]))
      .sort((a, b) => a.createdAt - b.createdAt);
    orderWatchers.forEach((cb) => cb(list));
    Object.keys(singleWatchers).forEach((id) => {
      const o = d.orders[id] ? Object.assign({ id }, d.orders[id]) : null;
      singleWatchers[id].forEach((cb) => cb(o));
    });
    stockWatchers.forEach((cb) => cb(d.stock || {}));
    reservationWatchers.forEach((cb) => cb(d.reservation || null));
  }
  window.addEventListener("storage", (e) => { if (e.key === KEY) notify(); });
  setInterval(() => notify(false), 1500); // file:// 等で storage イベントが届かない環境向けの保険

  return {
    mode: "local",
    // デモ(ローカル)モードは接続上限が無いので presence 系は no-op。接続数は常に 0。
    joinPresence() {},
    leavePresence() {},
    watchConnections(cb) { try { cb(0); } catch (e) {} },
    goOffline() {},
    goOnline() {},
    async createOrder(items, total, opts) {
      opts = opts || {};
      const d = load();
      const day = dayKey();
      const scheduled = opts.type === "scheduled";
      // 紙オーダー(店舗手入力): 番号は発行せず、在庫上限でも弾かない。
      const manual = opts.manual === true;

      // 在庫・予約枠の確保 (先勝ち・後発は失敗)。デモは同一ブラウザ内なので
      // 現在の注文から使用数を集計して上限と比較する。
      const active = Object.keys(d.orders).map((k) => d.orders[k])
        .filter((o) => o.day === day && o.status !== "cancelled");
      const need = neededCounts(items);
      const usedStock = {};
      active.forEach((o) => (o.items || []).forEach((i) => { if (i && i.id) usedStock[i.id] = (usedStock[i.id] || 0) + (i.qty || 0); }));
      if (!manual) {
        for (const pid of Object.keys(need)) {
          const raw = d.stock[pid];
          const lim = (raw != null && raw !== "") ? Number(raw) : null;
          if (lim == null || isNaN(lim)) continue;
          if ((usedStock[pid] || 0) + need[pid] > lim) throw soldOutError("stock", pid);
        }
      }
      if (scheduled && opts.pickupTime) {
        const cap = (d.reservation && d.reservation.capacity != null && d.reservation.capacity !== "") ? Number(d.reservation.capacity) : 8;
        const usedSlot = active.filter((o) => o.type === "scheduled" && o.pickupTime === opts.pickupTime).length;
        if (usedSlot + 1 > cap) throw soldOutError("slot", opts.pickupTime);
      }

      // 採番: 今すぐ 001,002... / 紙オーダー 401,402... / 予約 801,802...
      //   紙オーダーで番号指定 (opts.number) があればその番号で作成 (連携が取れていない番号の再現用)。
      let number;
      const fixedNum = (manual && opts.number != null && !isNaN(opts.number)) ? Math.floor(Number(opts.number)) : null;
      if (fixedNum != null && fixedNum > 0) {
        number = fixedNum;
      } else if (manual) {
        const k = day + "__paper";
        d.counters[k] = (d.counters[k] || 0) + 1;
        number = (PAPER_ORDER_BASE - 1) + d.counters[k];   // 紙オーダーは 401,402,...
      } else if (scheduled) {
        const k = day + "__sched";
        d.counters[k] = (d.counters[k] || 0) + 1;
        number = (SCHED_ORDER_BASE - 1) + d.counters[k];   // 予約は 801,802,...
      } else {
        d.counters[day] = (d.counters[day] || 0) + 1;
        number = d.counters[day];
      }
      const id = "L" + Date.now() + Math.random().toString(36).slice(2, 7);
      d.orders[id] = {
        number, items, total, day, status: "new",
        type: scheduled ? "scheduled" : "now", createdAt: Date.now()
      };
      if (scheduled && opts.pickupTime) d.orders[id].pickupTime = opts.pickupTime;
      save(d);
      notify();
      return { id, number };
    },
    async setPickupTime(id, time) {
      const d = load();
      if (d.orders[id]) { d.orders[id].pickupTime = time; save(d); notify(); }
    },
    async setArrived(id, val) {
      const d = load();
      if (d.orders[id]) { d.orders[id].arrived = val ? Date.now() : null; save(d); notify(); }
    },
    watchReservation(cb) { reservationWatchers.push(cb); cb(load().reservation || null); },
    async setReservation(cfg) {
      const d = load(); d.reservation = cfg; save(d); notify();
    },
    watchOrders(cb) { orderWatchers.push(cb); notify(true); },
    watchOrder(id, cb) {
      (singleWatchers[id] = singleWatchers[id] || []).push(cb);
      notify(true);
    },
    async setStatus(id, status) {
      const d = load();
      if (d.orders[id]) { d.orders[id].status = status; save(d); notify(); }
    },
    // 注文をキャンセル (デモは使用数を注文から都度集計するため、状態変更のみで枠が戻る)
    async cancelOrder(id) {
      const d = load();
      if (d.orders[id] && d.orders[id].status !== "cancelled") {
        d.orders[id].status = "cancelled"; save(d); notify();
      }
    },
    watchStock(cb) { stockWatchers.push(cb); cb(load().stock || {}); },
    async setStockLimit(id, limit) {
      const d = load();
      if (limit === null || limit === "" || isNaN(limit)) delete d.stock[id];
      else d.stock[id] = Number(limit);
      save(d); notify();
    },
    async clearAll() {
      // 注文履歴と採番のみ削除し、在庫上限設定・予約設定は保持する
      const d = load();
      save({ counters: {}, counters_sched: {}, orders: {}, stock: d.stock || {}, reservation: d.reservation || null });
      notify(true);
    }
  };
})();

// ============================================================
// セカンダリDB (DB2) — 注文・番号に関わらない共有データ用
// ------------------------------------------------------------
// 「調理完了」マークや「もう一度呼び出す」のシグナルなど、注文そのもの(番号・在庫・予約)
// には関わらない補助的な共有情報は、メインの ordyxis ではなく別プロジェクト ordyxis2 に
// 保存する。こうすることで、最重要データ(注文・番号)を扱う ordyxis の負荷・リスクを抑える。
//   FIREBASE_CONFIG_2 が設定されていれば ordyxis2 へ、無ければ localStorage(デモ)で動作。
//   data: cooked/{orderId} = true (調理完了) / recall/{orderId} = {number, ts} (再呼び出し)
// ============================================================
const DB2 = (() => {
  const firebaseReady2 =
    typeof FIREBASE_CONFIG_2 !== "undefined" &&
    FIREBASE_CONFIG_2 && FIREBASE_CONFIG_2.apiKey &&
    FIREBASE_CONFIG_2.apiKey.indexOf("YOUR_") !== 0 &&
    typeof firebase !== "undefined";

  // ---------- Firebase 実装 (セカンダリアプリ "secondary") ----------
  if (firebaseReady2) {
    let app2;
    try { app2 = firebase.app("secondary"); }
    catch (e) { app2 = firebase.initializeApp(FIREBASE_CONFIG_2, "secondary"); }
    const rtdb2 = app2.database();
    return {
      mode: "firebase",
      projectId: FIREBASE_CONFIG_2.projectId || "?",
      // 調理完了マークの監視 (全店舗端末で共有)。cb には { orderId: true } のマップを渡す。
      watchCooked(cb) {
        rtdb2.ref("cooked").on("value", (snap) => cb(snap.val() || {}));
      },
      setCooked(id, val) {
        if (val) return rtdb2.ref("cooked/" + id).set(true);
        return rtdb2.ref("cooked/" + id).remove();
      },
      // 再呼び出しシグナルの監視。cb には { orderId: {number, ts} } のマップを渡す。
      watchRecall(cb) {
        rtdb2.ref("recall").on("value", (snap) => cb(snap.val() || {}));
      },
      // 番号の再呼び出しを要求 (モニターが検知して音声で再アナウンスする)。
      recall(id, number) {
        return rtdb2.ref("recall/" + id).set({
          number: Number(number),
          ts: firebase.database.ServerValue.TIMESTAMP
        });
      },
      clearAll() {
        return Promise.all([
          rtdb2.ref("cooked").remove(),
          rtdb2.ref("recall").remove()
        ]);
      }
    };
  }

  // ---------- デモモード (localStorage) ----------
  const KEY2 = "ordyxis-demo-db2";
  const load2 = () => {
    try { return JSON.parse(localStorage.getItem(KEY2)) || { cooked: {}, recall: {} }; }
    catch (e) { return { cooked: {}, recall: {} }; }
  };
  const save2 = (d) => localStorage.setItem(KEY2, JSON.stringify(d));
  const cookedWatchers = [], recallWatchers = [];
  let last2 = null;
  function notify2(force) {
    const raw = localStorage.getItem(KEY2) || "";
    if (!force && raw === last2) return;
    last2 = raw;
    const d = load2();
    cookedWatchers.forEach((cb) => cb(d.cooked || {}));
    recallWatchers.forEach((cb) => cb(d.recall || {}));
  }
  window.addEventListener("storage", (e) => { if (e.key === KEY2) notify2(); });
  setInterval(() => notify2(false), 1500);
  return {
    mode: "local",
    projectId: "demo",
    watchCooked(cb) { cookedWatchers.push(cb); cb(load2().cooked || {}); },
    setCooked(id, val) {
      const d = load2();
      if (val) d.cooked[id] = true; else delete d.cooked[id];
      save2(d); notify2();
    },
    watchRecall(cb) { recallWatchers.push(cb); cb(load2().recall || {}); },
    recall(id, number) {
      const d = load2();
      d.recall[id] = { number: Number(number), ts: Date.now() };
      save2(d); notify2();
    },
    clearAll() { save2({ cooked: {}, recall: {} }); notify2(true); }
  };
})();

// ---------------- 在庫(注文可能数) ヘルパー ----------------
function ordyxisDayKey() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}
// 本日の全注文から商品ごとの注文済み個数を集計
function soldCounts(orders) {
  const day = ordyxisDayKey();
  const map = {};
  // キャンセルされた注文は在庫を消費しない (時間超過キャンセル分は枠が戻る)
  (orders || []).filter((o) => o.day === day && o.status !== "cancelled").forEach((o) => {
    (o.items || []).forEach((i) => { map[i.id] = (map[i.id] || 0) + i.qty; });
  });
  return map;
}
// 商品の在庫状態を返す { limit, sold, remaining, soldOut }
function stockState(productId, sold, limits) {
  const limit = (limits && limits[productId] != null && limits[productId] !== "") ? Number(limits[productId]) : null;
  const s = (sold && sold[productId]) || 0;
  if (limit === null || isNaN(limit)) return { limit: null, sold: s, remaining: Infinity, soldOut: false };
  const remaining = Math.max(0, limit - s);
  return { limit, sold: s, remaining, soldOut: remaining <= 0 };
}

// ---------------- 時間指定予約 (FastPass 方式) ヘルパー ----------------
// 予約設定のデフォルト値 (店舗が変更可能)
//   enabled  : 時間指定予約機能の ON/OFF
//   start/end: 受取可能時間の開始/終了 ("HH:MM")
//   interval : スロットの間隔 (分)
//   capacity : 1スロットあたりの定員 (規定人数)
const RESERVATION_DEFAULTS = { enabled: false, start: "09:00", end: "14:45", interval: 15, capacity: 8 };

function reservationConfig(cfg) {
  return Object.assign({}, RESERVATION_DEFAULTS, cfg || {});
}
// 設定から受取スロット ["09:00","09:15",...] を生成
function reservationSlots(cfg) {
  cfg = reservationConfig(cfg);
  const toMin = (s) => { const p = String(s).split(":"); return (+p[0]) * 60 + (+p[1]); };
  const fmt = (t) => String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
  const interval = Math.max(1, Number(cfg.interval) || 15);
  const out = [];
  for (let t = toMin(cfg.start); t <= toMin(cfg.end); t += interval) out.push(fmt(t));
  return out;
}
// 本日の予約注文をスロット時刻ごとに集計 { "09:00": 件数, ... }
function slotCounts(orders) {
  const day = ordyxisDayKey();
  const m = {};
  (orders || []).filter((o) => o.day === day && o.type === "scheduled" && o.pickupTime && o.status !== "cancelled")
    .forEach((o) => { m[o.pickupTime] = (m[o.pickupTime] || 0) + 1; });
  return m;
}
// 受取ウィンドウ: 受取時刻の 15分前 〜 30分後 まで受付。お客様への表記は「15分以内」。
const RESV_WINDOW_BEFORE_MIN = 15;
const RESV_WINDOW_AFTER_MIN = 30;
function reservationWindow(o) {
  if (!o || o.type !== "scheduled" || !o.pickupTime) return null;
  const p = String(o.pickupTime).split(":");
  const center = new Date(); center.setHours(+p[0], +p[1], 0, 0);
  return {
    pickup: center,
    openAt: new Date(center.getTime() - RESV_WINDOW_BEFORE_MIN * 60000),
    closeAt: new Date(center.getTime() + RESV_WINDOW_AFTER_MIN * 60000)
  };
}
// 受取ウィンドウが開いたか (= 店舗の準備リストに出す / 受け取り可能)。通常注文は常に対象。
function reservationDue(o, now) {
  const w = reservationWindow(o);
  if (!w) return true;
  return (now || new Date()) >= w.openAt;
}
// 受取ウィンドウを過ぎてキャンセル対象か (未到着・未提供の予約のみ)
function reservationExpired(o, now) {
  const w = reservationWindow(o);
  if (!w) return false;
  if (o.status !== "new" || o.arrived) return false;  // 到着済み・呼出済み・完了は対象外
  return (now || new Date()) > w.closeAt;
}
// 来店(到着)確認を受け付けられる時間帯か (受取時刻の15分前〜30分後)。通常注文は対象外。
function reservationWindowOpen(o, now) {
  const w = reservationWindow(o);
  if (!w) return false;
  const t = now || new Date();
  return t >= w.openAt && t <= w.closeAt;
}
// 店舗の準備リスト(調理開始)に出すべきか。
//   Disney方式: 時間指定の予約は「お客様の来店確認(arrived)後」に初めて調理を開始する。
//   通常(今すぐ)注文は受付後すぐ準備対象。
function inPrep(o, now) {
  if (!o || o.status !== "new") return false;
  if (o.type === "scheduled") {
    // 時間指定予約は2条件を満たしたら準備中に出す:
    //   (1) お客様が来店確認済み (受け取れる状態であることを確認) … o.arrived
    //   (2) 提供できる時刻になった (受取ウィンドウ到来 = 受取時刻の15分前〜) … reservationDue
    // ※来店確認(arrived)は受取時刻の15分前からしかできないため、arrived が立った時点で
    //   提供できる時間帯に入っている。両条件を明示して堅牢にしておく。
    return !!o.arrived && reservationDue(o, now);
  }
  return true; // 今すぐ注文は受付後すぐ準備対象
}

// ---------------- 注文IDの永続化 (端末を閉じても復元) ----------------
// localStorage は iOS の「コードスキャナー」等のアプリ内ブラウザではタスク終了時に
// 消えることがある。Cookie にも二重で保存し、どちらかが残っていれば復元できるようにする。
function persistOrderId(id) {
  try { localStorage.setItem("ordyxis-current-order", id); } catch (e) {}
  try { document.cookie = "ordyxis_order=" + encodeURIComponent(id) + ";path=/;max-age=86400;samesite=lax"; } catch (e) {}
}
function clearPersistedOrderId() {
  try { localStorage.removeItem("ordyxis-current-order"); } catch (e) {}
  try { document.cookie = "ordyxis_order=;path=/;max-age=0;samesite=lax"; } catch (e) {}
}
function readPersistedOrderId() {
  try { const v = localStorage.getItem("ordyxis-current-order"); if (v) return v; } catch (e) {}
  try {
    const m = document.cookie.match(/(?:^|;\s*)ordyxis_order=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  } catch (e) {}
  return null;
}

// ---------------- アプリ内ブラウザ判定 ----------------
// iOS の「コードスキャナー」/ SNS アプリ内ブラウザはストレージが揮発しやすく、
// 注文が保存されないため、通常ブラウザ (Safari 等) で開くよう促す。
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  // 既知のアプリ内ブラウザ (LINE/Facebook/Instagram/X 等)
  if (/(Line\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger|KAKAOTALK|NAVER|Snapchat|TikTok|musical_ly|WhatsApp|Twitter|GSA\/)/i.test(ua)) return true;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) {
    // 本物の Safari は "Version/x Safari/x" を含む。アプリ内 WKWebView は含まない。
    const realSafari = /Version\/[\d.]+.*Safari/i.test(ua);
    const chromeIOS = /CriOS/i.test(ua);
    const fxIOS = /FxiOS/i.test(ua);
    const edgeIOS = /EdgiOS/i.test(ua);
    const standalone = ("standalone" in navigator) && navigator.standalone; // ホーム画面PWA
    if (!realSafari && !chromeIOS && !fxIOS && !edgeIOS && !standalone) return true;
  }
  return false;
}

// ---------------- 早期ブラウザ脱出 (共通: ページを開いた瞬間に実行) ----------------
// LINE/Instagram 等の iOS アプリ内ブラウザは、下スワイプで即座に閉じられてしまい
// (注文が消えて URL からやり直しになる)。スプラッシュを待たず、ページを開いた直後に
// Safari (iOS) / 既定ブラウザ (Android) へ脱出させる。確実なアプリ内ブラウザのみ対象
// (誤検出で実ブラウザを飛ばさないため)。脱出は無視されることがあるので複数回試みる。
//   canonicalUrl : そのページを通常ブラウザで開くための正規URL
function forceBrowserEscapeEarly(canonicalUrl) {
  // 既に通常ブラウザで確認済み(?b=1 / 同セッション)なら何もしない
  try {
    const p = new URLSearchParams(location.search);
    if (p.get("b") === "1") { sessionStorage.setItem("ordyxis_browser_ok", "1"); return; }
    if (sessionStorage.getItem("ordyxis_browser_ok") === "1") return;
  } catch (e) {}
  if (!isInAppBrowser()) return;   // 確実なアプリ内ブラウザのみ (iOS実Safari等は飛ばさない)

  const CU_B = canonicalUrl + (canonicalUrl.indexOf("?") >= 0 ? "&" : "?") + "b=1";
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const noProto = CU_B.replace(/^https?:\/\//, "");
  function escape() {
    try {
      if (isAndroid) {
        // Android: intent:// で既定ブラウザへ (未所持でも fallback URL で確実)
        window.location.href = "intent://" + noProto +
          "#Intent;scheme=https;S.browser_fallback_url=" + encodeURIComponent(CU_B) + ";end";
      } else {
        // iOS (LINE等): x-safari-https:// で WKWebView から Safari へ脱出
        window.location.href = "x-safari-" + CU_B;
      }
    } catch (e) {}
  }
  // すぐに脱出を試み、無視された場合に備えて数回リトライする。
  // (Safari が前面に出ればこのページは hidden になり、以降の発火は止まる)
  escape();
  setTimeout(() => { if (!document.hidden) escape(); }, 500);
  setTimeout(() => { if (!document.hidden) escape(); }, 1200);
  setTimeout(() => { if (!document.hidden) escape(); }, 2500);
  // LINE はスワイプで一旦戻ってからこのページに復帰することがある → 復帰時に再脱出
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) setTimeout(escape, 200);
  });
}

// ---------------- 通常ブラウザ強制ゲート (共通: customer / store 両用) ----------------
// QR・コードスキャナーの簡易ブラウザや SNS のアプリ内ブラウザ、iOS の組込 Safari で
// 開かれたままだとストレージが揮発し、データが保存されない/消える。通常ブラウザ
// (Safari / Chrome) で開き直すまで先へ進ませない自己完結ゲート。
//   canonicalUrl : そのページを通常ブラウザで開くための正規URL
//   onPass       : ゲート不要(=通常ブラウザで確認済み)のときに呼ぶコールバック
// ※ ゲート表示時は onPass を呼ばない(=画面の操作に進ませない)。
function enforceRealBrowser(canonicalUrl, onPass) {
  const CU = canonicalUrl;
  const CU_B = CU + (CU.indexOf("?") >= 0 ? "&" : "?") + "b=1";   // ブラウザで開いた印 (?b=1)

  // 通常ブラウザで開かれたことが確認できるか (?b=1 経由 / 同セッションで確認済み)
  function browserConfirmed() {
    try {
      const p = new URLSearchParams(location.search);
      if (p.get("b") === "1") { sessionStorage.setItem("ordyxis_browser_ok", "1"); return true; }
      if (sessionStorage.getItem("ordyxis_browser_ok") === "1") return true;
    } catch (e) {}
    return false;
  }
  function isIOS() {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function isAndroid() { return /Android/i.test(navigator.userAgent || ""); }
  // ゲートを出す(=進ませない)条件: 通常ブラウザ確認が無く、かつ アプリ内ブラウザのとき。
  // ※ 以前は「iOS端末すべて」を対象にしていたが、通常のSafari/Chromeでも誤って表示されて
  //   しまうため廃止。コードスキャナーの簡易ブラウザ・LINE等のアプリ内ブラウザ(isInAppBrowser)
  //   のみを対象とする(シークレットモードは customer 側の別ゲートで扱う)。
  function gated() { return !browserConfirmed() && isInAppBrowser(); }

  if (!gated()) { if (onPass) onPass(); return; }

  const noProto = CU_B.replace(/^https?:\/\//, "");
  function openInSafari() { try { window.location.href = "x-safari-" + CU_B; } catch (e) {} }
  // カスタムURLスキームでアプリ起動を試し、起動できなければ onFail (iOS用)
  function tryScheme(url, onFail) {
    let done = false; const start = Date.now();
    const onVis = () => { if (document.hidden) done = true; };
    document.addEventListener("visibilitychange", onVis);
    try { window.location.href = url; } catch (e) {}
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onVis);
      if (!done && !document.hidden && (Date.now() - start) < 2000) { try { onFail(); } catch (e) {} }
    }, 1400);
  }
  function openInChrome() {
    try {
      if (isAndroid()) {
        window.location.href = "intent://" + noProto + "#Intent;scheme=https;package=com.android.chrome;" +
          "S.browser_fallback_url=" + encodeURIComponent(CU_B) + ";end";
      } else {
        // iOS: googlechromes:// で起動。失敗時のみ x-safari- で脱出 (CU_B 直接遷移はしない)
        tryScheme("googlechromes://" + noProto, openInSafari);
      }
    } catch (e) {}
  }
  function openInDefaultBrowser() {
    try {
      window.location.href = "intent://" + noProto +
        "#Intent;scheme=https;S.browser_fallback_url=" + encodeURIComponent(CU_B) + ";end";
    } catch (e) {}
  }

  // --- ゲートUI (自己完結のスタイル + マークアップ) ---
  if (!document.getElementById("odxGateStyle")) {
    const st = document.createElement("style");
    st.id = "odxGateStyle";
    st.textContent =
      ".odx-gate{position:fixed;inset:0;z-index:2147483000;background:#0b0e16;color:#e6ebf5;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;" +
      "padding:28px 24px calc(28px + env(safe-area-inset-bottom));" +
      "font-family:'Segoe UI','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;}" +
      ".odx-gate .ig-ic{font-size:50px;margin-bottom:8px;}" +
      ".odx-gate h2{font-size:20px;font-weight:800;margin-bottom:12px;}" +
      ".odx-gate p{font-size:13.5px;color:#9aa6bd;line-height:1.9;max-width:380px;margin-bottom:18px;}" +
      ".odx-gate .url{font-size:12.5px;color:#bcd0ee;background:rgba(255,255,255,.06);" +
      "border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 12px;" +
      "word-break:break-all;max-width:380px;margin-bottom:16px;}" +
      ".odx-gate .ig-btn{border:none;border-radius:13px;padding:14px 24px;font-size:15px;font-weight:800;" +
      "color:#fff;background:linear-gradient(90deg,#49a8ff,#a07ae0,#f0a73d);cursor:pointer;" +
      "width:min(340px,86vw);margin-bottom:10px;}" +
      ".odx-gate .ig-chrome{background:#2a7de1;}" +
      ".odx-gate .ig-copy{background:#27304a;}";
    document.head.appendChild(st);
  }
  const gate = document.createElement("div");
  gate.className = "odx-gate";
  const safariLabel = isAndroid() ? "Chrome で開く" : "Safari で開く";
  const chromeLabel = isAndroid() ? "既定のブラウザで開く" : "Chrome で開く";
  const browsersLabel = isAndroid() ? "Chrome などのブラウザアプリ" : "Safari ／ Chrome";
  gate.innerHTML =
    '<div class="ig-ic">🧭</div>' +
    '<h2>ブラウザで開いてください</h2>' +
    '<p>データを確実に保存するため、<b>' + browsersLabel + '</b> で開いてください。<br>' +
    'QR・コードスキャナーの簡易ブラウザのままだと、画面を閉じた際に情報が消えてしまうことがあります。<br>' +
    '下のボタンからブラウザで開き直してください。</p>' +
    '<div class="url">' + CU + '</div>' +
    '<button class="ig-btn" id="odxGSafari">' + safariLabel + '</button>' +
    '<button class="ig-btn ig-chrome" id="odxGChrome">' + chromeLabel + '</button>' +
    '<button class="ig-btn ig-copy" id="odxGCopy">URLをコピーして開く</button>';
  document.body.appendChild(gate);

  gate.querySelector("#odxGSafari").onclick = isAndroid() ? openInChrome : openInSafari;
  gate.querySelector("#odxGChrome").onclick = isAndroid() ? openInDefaultBrowser : openInChrome;
  const copyBtn = gate.querySelector("#odxGCopy");
  copyBtn.onclick = async () => {
    try { await navigator.clipboard.writeText(CU_B); copyBtn.textContent = "コピーしました ✓ ブラウザに貼り付けてください"; }
    catch (e) {
      try {
        const t = document.createElement("textarea"); t.value = CU_B; document.body.appendChild(t);
        t.select(); document.execCommand("copy"); t.remove();
        copyBtn.textContent = "コピーしました ✓ ブラウザに貼り付けてください";
      } catch (e2) { copyBtn.textContent = "コピーできませんでした"; }
    }
    setTimeout(() => { copyBtn.textContent = "URLをコピーして開く"; }, 2200);
  };

  // 確実な組込ブラウザのみ自動脱出を試行 (Android は既定ブラウザ、それ以外は Safari)
  if (isInAppBrowser()) setTimeout(isAndroid() ? openInDefaultBrowser : openInSafari, 300);
}

// デモモードのときに画面上部へ案内バナーを表示
function demoBannerIfNeeded() {
  if (DB.mode !== "local") return;
  const b = document.createElement("div");
  b.style.cssText =
    "background:#fff3cd;color:#7a5d00;font-size:12px;padding:6px 12px;text-align:center;" +
    "border-bottom:1px solid #e8d48a;font-family:'Segoe UI',sans-serif;";
  b.textContent = "デモモードで動作中: firebase-config.js を設定すると端末間でリアルタイム共有されます (現在は同一ブラウザのタブ間のみ共有)";
  document.body.prepend(b);
}

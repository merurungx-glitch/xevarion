/* ══════════════════════════════════════════════════════════════
   XEVARION 通信設定（2026-08-20 新設）
   ------------------------------------------------------------
   これまでの動き:
     ・オンライン … いつでも<b>最新のデータ</b>を取りに行く
     ・オフライン … <b>ダウンロードずみのデータ</b>で動く
   これに加えて、<b>Wi-Fi のとき</b>と<b>モバイルデータのとき</b>で
   ふるまいを別々に決められるようにする（ご指定）。

     ・「最新のデータを使う」… オフにすると、そのつなぎかたのあいだは
        通信せず<b>ダウンロードずみのデータ</b>で動く（＝通信量を使わない）。
     ・「更新を自動でダウンロード」… オフにすると、更新・オフライン用の
        まとめてダウンロードの前に<b>確認</b>が出る。

   ★★ 実際に効かせているのは<b>Service Worker</b>。
     この画面で決めた「最新を取りに行くか」を各アプリの SW へ送り、
     SW 側が「キャッシュ優先」と「通信優先」を切り替える。
     送り先は navigator.serviceWorker.getRegistrations()＝
     <b>このオリジンの SW 全部</b>（ポータル・MagiLex・MagiBurst…）。

   ★★ iPhone には回線の種類を教えてくれる仕組みが無い
     （Network Information API が未実装）。そこで
     「判定できないときは Wi-Fi 扱い／モバイル扱い」を<b>利用者が選べる</b>ようにしてある。
     ここを用意しないと、iPhone では設定そのものが意味を持たなくなる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const KEY = "xeva_net_v1";
  /* ★★ 2026-08-22b 既定値を変更（ご指定）: <b>自動ダウンロードは初期設定でオフ</b>。
     Wi-Fi でも勝手に落とさない。更新のたびに数十MB が黙って流れるより、
     「更新があります」を見てから自分で決められるほうが安心なため。
     ★ 最新のデータを使う（latest）はこれまでどおり両方オン。
       ここをオフにすると通信できるのにキャッシュで動いてしまい、
       お知らせやランキングが古いままになる。
     ★ すでに設定を触ったことがある人の値は localStorage に残っているので変わらない
       （DEF は「まだ何も決めていない項目」にだけ効く）。 */
  const DEF = { wifi: { latest: 1, autodl: 0 }, cell: { latest: 1, autodl: 0 }, unknown: "wifi" };

  function load() {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    if (!o || typeof o !== "object") o = {};
    const one = (k) => ({
      latest: o[k] && o[k].latest != null ? (o[k].latest ? 1 : 0) : DEF[k].latest,
      autodl: o[k] && o[k].autodl != null ? (o[k].autodl ? 1 : 0) : DEF[k].autodl,
    });
    return { wifi: one("wifi"), cell: one("cell"), unknown: o.unknown === "cell" ? "cell" : "wifi" };
  }
  function save(cfg) {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
  }

  function conn() {
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }
  /* 端末が教えてくれる回線の種類（"wifi" / "cellular" / "ethernet" …）。
     ★ iOS Safari は connection そのものが無いので、いつも "" になる。 */
  function rawType() {
    const c = conn();
    return (c && typeof c.type === "string") ? c.type : "";
  }
  function canDetect() { return !!rawType(); }

  /* いまのつなぎかた。"offline" / "wifi" / "cell" */
  function kind() {
    if (!navigator.onLine) return "offline";
    const t = rawType();
    if (t === "cellular") return "cell";
    if (t === "wifi" || t === "ethernet" || t === "wimax") return "wifi";
    return load().unknown === "cell" ? "cell" : "wifi";   // 判定できない端末はこの扱い
  }
  /* いま効いている設定（オフラインのときは「最新を取りに行かない」で固定） */
  function cur() {
    const k = kind();
    if (k === "offline") return { latest: 0, autodl: 0 };
    return load()[k];
  }
  function useLatest() { return !!cur().latest; }
  function allowDownload() { return !!cur().autodl; }

  /* ── SW へ知らせる ──
     ★ 送るのは「最新を取りに行くか」だけ。回線の判定はページ側の仕事にしてある
       （SW からは navigator.connection を安定して読めないため）。 */
  async function push() {
    const latest = useLatest();
    try {
      const rs = await navigator.serviceWorker.getRegistrations();
      rs.forEach((r) => {
        const t = r.active || r.waiting || r.installing;
        if (t) { try { t.postMessage({ type: "xev-netmode", latest: latest }); } catch (e) {} }
      });
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("xeva:netmode", { detail: { kind: kind(), latest: latest } })); } catch (e) {}
  }

  function get() { return load(); }
  function setFlag(k, field, on) {
    const cfg = load();
    if (!cfg[k]) return;
    cfg[k][field] = on ? 1 : 0;
    save(cfg); push();
  }
  function setUnknown(k) {
    const cfg = load();
    cfg.unknown = k === "cell" ? "cell" : "wifi";
    save(cfg); push();
  }

  window.XHNet = {
    get: get, setFlag: setFlag, setUnknown: setUnknown,
    kind: kind, canDetect: canDetect, useLatest: useLatest, allowDownload: allowDownload,
    push: push,
    /* 画面に出す名前 */
    kindName: function (k) {
      k = k || kind();
      return k === "offline" ? "オフライン" : k === "cell" ? "モバイルデータ" : "Wi-Fi";
    },
  };

  /* 起動時と、つなぎかたが変わったときに知らせ直す */
  push();
  addEventListener("online", push);
  addEventListener("offline", push);
  try { const c = conn(); if (c && c.addEventListener) c.addEventListener("change", push); } catch (e) {}
  /* SW は登録された直後だと active がまだ無いことがあるので、用意ができたらもう一度送る */
  try { if (navigator.serviceWorker) navigator.serviceWorker.ready.then(push).catch(function () {}); } catch (e) {}
})();

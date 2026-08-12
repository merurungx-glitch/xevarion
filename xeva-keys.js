/* ============================================================
   XEVA-KEYS — 「アカウントに属するデータ」の一覧（唯一の台帳）
   ------------------------------------------------------------
   2026-08-03 の同期まわり再構築でつくったファイル。

   ★ なぜ台帳を1か所にまとめたか
     これまで「どの localStorage キーを同期するか」は xeva-cloud.js の中に
     直接書いてあり、アプリ専用の Firebase を使う MagiBurst / MagiLex は
     それぞれの *-cloud.js に別の一覧を持っていた。
     一覧が3か所に散らばっていたせいで、新しい機能を足すたびに
     「同期リストに入れ忘れる」事故が起きていた。
     （例：ジェムショップの購入履歴 xeva_shop_v1 はどこにも載っておらず、
       「別の端末で見ると買っていないことになる」状態だった）

   ★ もうひとつ大事な役割：ログアウト時の掃除
     アカウントに属するデータは、ログアウトしたら端末から消さなければならない。
     消さないまま新規登録すると、前のアカウントのセーブがそのまま
     新しいアカウントのものとしてクラウドへ上がってしまう
     （＝「新規登録したのに前のアカウントのデータになっている」）。
     どのキーを消せばよいかは、この台帳を見れば分かる。

   ── 追加するときの決めかた ─────────────────────────────
     ・そのデータを別の端末でも引き継ぎたい？   → ACCOUNT（同期する）
     ・その端末でしか意味がない？               → DEVICE（同期しない）
     迷ったら ACCOUNT にする。同期して困るのは「端末ごとに変えたい設定」だけ。
   ============================================================ */

/* ── ① XEVARION 本体（xevarion-account の accounts/{uid}/store）で同期するキー ──
   xeva-cloud.js が担当。XEVA・ジェム・メール・各ゲームのセーブ。 */
export const PORTAL_SYNC_KEYS = [
  /* ══ アカウントのコア ══ */
  "xeva_account_v1",        // 表示名・アイコン・4桁PW・xvUid
  "xeva_wallet_v1",         // XEVA 残高と履歴
  /* 💎ジェム（XEVARION 共通のプレミアム通貨）。
     ★ MagiBurst 専用 Firebase にある magiburst_v1 の中ではなく、必ずここで同期すること。
       別プロジェクトに分かれていると XEVA とジェムのタイムスタンプ基準がそろわず、
       「XEVA だけ減ってジェムが増えない」（iPhone で顕著）が起きる。 */
  "xeva_gem_v1",
  "xeva_gacha_v1",          // XEVAガチャの所持キャラ・凸・ポイント
  "xeva_collection_v1",
  "xeva_limited_v1",
  "xeva_bday_v1",
  "xeva_cdk_v1",
  "xeva_mail_v1",           // 📧メールの受取状況
  "xeva_howto_v2",          // 入手方法ガイドを見たか
  /* 🛒ジェムショップの購入履歴。
     ★ 2026-08-03 追加。ここに無かったせいで「買ったのに他の端末では買えたまま」
       「別端末で買い直せてしまう」状態だった。購入回数の制限はこのキーで数えるので、
       同期していないと制限そのものが成立しない。 */
  "xeva_shop_v1",
  /* 📧メールやショップで受け取った MagiBurst 向けプレゼントの引換券。
     MagiBurst 起動時に精算するので、全端末で「受け取り済みかどうか」を共有する必要がある。 */
  "xeva_mbgift_v1",
  "xeva_s5banner_v1",       // シーズンバナーの既読
  "xeva_home_order_v2",     // ホームのアプリ並び順（端末をまたいで同じ並びにする）
  "xeva_home_order_gen",
  "xeva_ai_timers_v2",      // Magi AI Assistant の学習タイマー

  /* ══ 各ゲームのセーブ ══
     ★ magiburst_v1 / magilex_* は、それぞれ専用の Firebase（magiburst / magilex-cb250）で
       app-cloud.js が同期する。ここに入れると二重同期になってタイムスタンプが競合するので
       入れない（下の APP_SYNC_KEYS を参照）。 */
  "magibattle_v1",
  "chainparty_save_v1", "chainparty_setup_v1",
  "magidiamond_setup_v1",
  "magisharecore_save_v1",
  "magires_dq1",
  "magimanor_save_v1", "magimanor_mem_v1", "magimanor_x_v1",
  "magiempire_board_save_v1", "magiempire_names",
  "magiport_v1",
  "magijackpot_v1", "mj_party_links_v1",
  "magimuse_v1",
  "magiarena.save.v2", "magiarena.names.v1",
  "magifinance_v2_store", "magifinance_prime_list_v2",
  "magimusic_v1", "xeva_music_v1",
  "sg_v3",
  "magifocus_v1",
  /* XEVYNAR（学習AI）が覚えていること・学習記録・プラン。
     端末を変えても「自分のことを知っているAI」であり続けるために同期する。 */
  "xevynar_v1",
];

/* ── ② アプリ専用 Firebase（app-cloud.js）で同期するキー ──
   アプリ名 → キー一覧。ログアウトの掃除では、これも全部消す必要がある。 */
export const APP_SYNC_KEYS = {
  magiburst: ["magiburst_v1"],
  magilex: [
    "magilex_v2",           // 学習の本体（習得状況・成績・進捗）
    "magilex_howto_v1",
    "magilex_autonext_v1",
    "magilex_audio_v1",
    "magilex_arisa_v1",
    "magilex_flash_v1",
  ],
};

/* ── ③ アカウントに属するが、同期はしない（端末に置いたままでも困らない）──
   ログアウトのときはこれも消す。残っていると次の人に前の人の状態が見えてしまう。 */
export const ACCOUNT_LOCAL_KEYS = [
  "xeva_earn_pending_v1",   // まだランキングへ送っていない獲得XEVA
  "xeva_lb_shown_v1",       // 今日のログインボーナスを見せたか
  "mburst_news_seen",
  "mburst_newchar_seen_v1",
  "mburst_age_ok_month_v1",
  "mburst_accessed",
  "ml_accessed_v1",
  "ml_avatar_synced_v2",
  "sg_ob_seen",
];

/* ── ④ 端末そのものの設定・状態（ログアウトしても消さない）──
   ここに挙げたものは「誰が使っても同じ」なので触らない。台帳としての記録も兼ねる。 */
export const DEVICE_KEYS = [
  "xeva_device_id",         // 端末ID（セッション判定に必要）
  "xeva_session_v1",        // ログイン状態そのもの
  "xeva_keymeta_v1",        // 同期用の書込時刻
  "xeva_store_owner",       // 端末に残っているデータの持ち主
  "xeva_skew_v1",           // サーバー時刻とのズレ（誰が使っても同じ）
  "xeva_pkg_ver_v1",        // 入っている更新パッケージの版
  "xeva_install_hint_v2",
  "xeva_solo_pwa_notice_v1",
  "xeva_admin_ok_v1", "xeva_admin_unlocked_v1",
  "magires_uid", "magimanor_uid",
  "magires_mute",
  "ordyxis_fb", "ordyxis_fb2", "ordyxis-lang", "ordyxis-store-prefs",
  "ordyxis-monitor-scale", "ordyxis-monitor-voice", "ordyxis-current-order",
  "ordyxis-demo-db", "ordyxis-demo-db2", "ordyxis_access_v1",
  "xevynar_kb_burst_v1",    // XEVYNAR に渡す知識のキャッシュ（起動時に作り直される）
  /* ドル円レートのキャッシュ（xeva-fx.js）。誰が使っても同じ相場の値なので
     アカウントには属さない。消すとオフライン時に既定値まで落ちるだけ損。 */
  "xeva_fx_v1",
];

/* ── ログアウト・アカウント切替のときに端末から消すキーの全体 ── */
export const ALL_ACCOUNT_KEYS = (function () {
  const out = [];
  const seen = new Set();
  const add = (k) => { if (k && !seen.has(k)) { seen.add(k); out.push(k); } };
  PORTAL_SYNC_KEYS.forEach(add);
  Object.keys(APP_SYNC_KEYS).forEach((n) => APP_SYNC_KEYS[n].forEach(add));
  ACCOUNT_LOCAL_KEYS.forEach(add);
  return out;
})();

/* app-cloud.js が自分のメタ／持ち主マーカーを消すための名前（掃除で使う） */
export const APP_META_PREFIXES = ["appcloud_meta_", "appcloud_owner_"];

/* ── アカウントのデータを端末から消す ──
   ログアウト、および「別のアカウントでログインした」ときに呼ぶ。
   raw には localStorage.removeItem の“素の”関数を渡す（同期のフックを通さないため。
   通すとクラウド側まで消してしまい、ログアウトがデータ削除になってしまう）。 */
export function wipeAccountData(raw) {
  const rm = raw || ((k) => { try { localStorage.removeItem(k); } catch (e) {} });
  ALL_ACCOUNT_KEYS.forEach((k) => { try { rm(k); } catch (e) {} });
  /* app-cloud の書込時刻・持ち主マーカーも落とす。
     残っていると「この端末では未プレイ扱い」の判定が狂う。 */
  try {
    const kill = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && APP_META_PREFIXES.some((p) => k.indexOf(p) === 0)) kill.push(k);
    }
    kill.forEach((k) => { try { rm(k); } catch (e) {} });
  } catch (e) {}
}

/* ══════════════════════════════════════════════════════════════
   ★ 2026-08-05 アカウント「削除」専用の完全消去
   ──────────────────────────────────────────────
   ログアウト（wipeAccountData）は台帳に載っているキーだけを消す。
   これは「載せ忘れたキーが残る」ことを許す作りで、ふだんは同期でつじつまが合う。
   だが<b>アカウントの削除</b>では、載せ忘れが1つでもあると
   「消したはずの XEVA やセーブが端末に残り、次に作ったアカウントへ引き継がれる」。
   そこで削除のときだけ考え方を逆にする：
     <b>DEVICE_KEYS（端末そのものの設定）に載っていないキーは、すべて消す。</b>
   知らないキー・あとから増えたキーも、これなら確実に道連れにできる。
   sessionStorage も同じ理由で丸ごと空にする。
   ══════════════════════════════════════════════════════════════ */
export function wipeAccountDataFull(raw) {
  const rm = raw || ((k) => { try { localStorage.removeItem(k); } catch (e) {} });
  /* ① まず台帳ぶんを確実に消す（同期フックを通さない raw で消す） */
  wipeAccountData(rm);
  /* ② 端末設定いがいの「残り物」をすべて掃除する（許可リスト方式） */
  const keep = new Set(DEVICE_KEYS);
  try {
    const kill = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (keep.has(k)) continue;
      kill.push(k);
    }
    kill.forEach((k) => { try { rm(k); } catch (e) {} });
  } catch (e) {}
  /* ③ sessionStorage（アクセス画面の1回きりフラグ・管理者解錠など）も空にする */
  try { sessionStorage.clear(); } catch (e) {}
}

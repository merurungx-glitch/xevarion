# Firebase 移行のいまの状態

## 1. 接続先（すべて新プロジェクトへ切り替え済み）

| 用途 | いまの接続先 | 実装ファイル |
|---|---|---|
| アカウント／XEVA／セッション／ストア同期／月間ランキング | `xevarion-account` | `xevarion-fb.js` / `xeva-cloud.js` |
| **メンテナンス状態の読み取り（全ページ）** | `xevarion-account` | `maintenance-gate.js` |
| オンライン対戦の部屋（ChainParty / Diamond / Manor / Resonance） | `xevarion-online` | 各 `*/js/online.js` |
| MagiBattle スコアアタック／MagiRanking 読み出し | `xevarion-online` | `MagiBattle/index.html`, `MagiRanking/index.html` |
| MagiBurst マルチプレイ・車種ランキング／セーブ | `magiburst` | `MagiBurst/js/online.js`, `MagiBurst/magiburst-cloud.js` |
| MagiLex の学習・習得状況 | `magilex-cb250` | `MagiLex/magilex-cloud.js` |
| MagiLink 本体（チャット・掲示板・ユーザー） | `magilink-63067` | `MagiLink/magilink.js`, `xeva-sync.js` |
| ORDYXIS（店舗システム・独立） | `ordyxis` / `ordyxis2` | `ORDYXIS/firebase-config.js` |

> **旧プロジェクト `xevarion-b6425` / `magichainparty` / `magibattle-ef562` を見ているコードは残っていません。**

### ★ 直したこと：メンテナンスが解除されなかった原因

`maintenance-gate.js` だけが **旧 `xevarion-b6425`** を読んでいました。
管理画面（`admin.html`）は新しい `xevarion-account` に書くので、
解除しても各ページは旧DBに残った `on:true` を読み続け、メンテ画面のままになっていました。

あわせて次の2点も直しています。

- 参照先を `xevarion-account` に変更（`?v=5` にしてキャッシュも入れ替え）
- **30秒ごとに読み直す**ようにした。開きっぱなしの端末でも、
  解除したらそのままメンテ画面が外れます（再読込は不要）。
  タブに戻ったタイミングでも即確認します。

## 2. 旧プロジェクトの後始末（Console 作業）

コード側の参照はもう無いので、**旧プロジェクトは削除して問題ありません**。
念のため、消す前に次を確認してください。

1. XEVARION を開いてログインできる
2. 設定 → 管理画面 でアカウント一覧が出る
3. メンテナンスの ON / OFF が数十秒以内に反映される
4. MagiChainParty / MagiBurst で部屋を作れる
5. MagiRanking に今月の XEVA が出る

消す対象：`xevarion-b6425`・`magichainparty`・`magibattle-ef562`

> MagiLink（`magilink-63067`）は**現役**です。消さないでください。
> チャット履歴・掲示板・ユーザーが入っています。
> 統合したい場合はデータ移行が別途必要なので、その時に言ってください。

## 3. セキュリティルール

`firebase-rules/` のルールを各 Console の Realtime Database → **ルール** に貼って公開します。

- `firebase-rules/xevarion-account.rules.json` → **xevarion-account**
- `firebase-rules/xevarion-online.rules.json` → **xevarion-online**
- `firebase-rules/magiburst.rules.json` → **magiburst**
- `firebase-rules/magilex.rules.json` → **magilex-cb250**

## 4. 同期のしくみ（2026-07 に作り直した部分）

「iPhone で XEVA が増減しない・MagiBurst のジェムが記録されない・
MagiLex の習得が戻る」の原因は、次の3つでした。

1. **端末時計のズレ**
   `store` のマージは「タイムスタンプが新しい側が勝つ」方式なのに、
   時刻を端末の `Date.now()` で付けていたため、
   時計が進んでいる端末の**古いデータ**が勝って進行が巻き戻っていました。
   → `.info/serverTimeOffset` でサーバー基準にそろえました（`XEVARIONFB.now()`）。

2. **離脱の瞬間に送信が捨てられる**
   iOS はホームに戻る・アプリを切り替えた瞬間にページを凍結・破棄するため、
   SDK の書込（Promise）は完了せず捨てられます。
   旧実装は 1.2 秒のデバウンス後に送っていたので、
   「使ってすぐ閉じる」と、その変更はクラウドに届きませんでした。
   → `pagehide` / `visibilitychange` では **`fetch(keepalive)` で REST に直接 PATCH**。
     64KB を超えるセーブは離脱時だけ同期XHRで送り切ります。
   → 通常のデバウンスも 1.2秒 → 0.4秒、ウォレット系は即時送信に。

3. **同着のときの勝敗判定が「データ量が多い方」だった**
   XEVA を消費する・間違えた問題を消すといった「短くなる更新」で必ず逆転します。
   → 同着なら「いま目の前で使っているローカル」を採用してクラウドへ上げる方式に変更。

あわせて、
- 画面に戻るたびに「送る → 取り込む」を1往復（`pullNow`）
- 表示中は15秒ごとに未送信ぶんを押し出す
- `syncDown` の reload 前に未送信ぶんを送り切る（旧実装は捨てていた）
- `app-cloud.js` は**オフラインで開いた回でも、オンラインに戻ったら接続からやり直す**
  （旧実装は `ready` にならず、その後ずっと同期されないままでした）

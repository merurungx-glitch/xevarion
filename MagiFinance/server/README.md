# MagiFinance 中継サーバー（yfinance バックエンド）

MagiFinance（静的サイト）へ、yfinance のデータを **CORS 付き JSON** で安定提供する軽量サーバーです。
ブラウザの CORS 制限や公開プロキシの混雑に左右されず、**常時安定運用**できます。
さらに、**東証プライムの全銘柄**をサーバー側で分析して買い時をランキングする `/api/screen` を備えます。

## セットアップ

```bash
cd XEVARION/MagiFinance/server
pip install -r requirements.txt
python server.py
```

既定で `http://localhost:8787` で待ち受けます（ポートは環境変数 `PORT` で変更可）。

MagiFinance 側は **設定 → データ接続 → 中継サーバーURL** に `http://localhost:8787` を入力すると、
価格・チャート・スクリーニングがこのサーバー経由（安定）になります。
別端末（iPhone/iPad）から使う場合は、PC の IP アドレス（例 `http://192.168.0.10:8787`）を指定してください。

## エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/health` | 稼働確認 |
| GET | `/api/history?symbol=7203.T&range=1y` | 日足 OHLC（range: 6mo/1y/2y） |
| GET | `/api/quote?symbol=7203.T` | 最新値（`symbols=` でカンマ区切り複数可） |
| GET | `/api/screen?market=prime&limit=0&min_score=18` | 東証プライム全銘柄を分析しスコア順に返す |

`/api/screen` は重いため結果を既定 1 時間キャッシュします（`SCREEN_TTL` 秒で変更可、`?force=1` で再計算）。
`limit` は分析銘柄数の上限（0=全件）。初回は全銘柄取得のため数分かかることがあります。

## 東証プライム“全銘柄”の取得について

`/api/screen` は **JPX 公表の上場銘柄一覧（data_j.xls）** を自動ダウンロードして
「市場・商品区分」が *プライム* の銘柄を抽出します（1 日キャッシュ）。
ネットワークの都合で取得できない場合は、同梱の `tse_prime_fallback.json`（主要プライム銘柄）を使用します。
`tse_prime_fallback.json` は `[["コード","銘柄名","業種"], ...]` 形式なので、
JPX の最新一覧を貼り付ければそのまま全銘柄に差し替えられます。

## 注意

- yfinance は Yahoo Finance の非公式データに依存します。無保証・無料の範囲でご利用ください。
- 本サーバーの判定はテクニカル分析に基づく参考情報であり、投資助言ではありません。

# MagiScope 自動取得の設定（鍵なし・サーバーなし）

カラオケ（DAM）・FANZA同人・国内アニメ（Annict）の実ランキングは、`collect.py` が
**各サイトの公開ページを読んで**集め、XEVARION の GitHub リポジトリの **`magiscope-data` ブランチ**に JSON で置きます。
アプリはそこ（raw.githubusercontent.com）を読むだけです。**API キー・トークン・Firebase の鍵は一切使いません。**
（アニメの「総合・新作・今季…」は AniList をアプリが直接読むので、設定しなくても動きます）

| 取得するもの | どこから | どこで動かす |
|---|---|---|
| カラオケ | カラオケ DAM のランキングページ（＋ジャケット＝iTunes、ソロ/グループ＝MusicBrainz） | GitHub（自動） |
| 国内アニメ | Annict の季節ページ・作品ページ（視聴者数） | GitHub（自動） |
| FANZA同人 | FANZA同人のコミックランキングページ・作品ページ | **この PC**（FANZA は日本からしか見られないため） |

## 1. GitHub で自動取得を動かす（カラオケ・国内アニメ）
1. XEVARION と一緒に **`.github/workflows/magiscope.yml`** を GitHub（merurungx-glitch/xevarion）に上げる。
   ★ `.github` は名前が「.」で始まるフォルダなので、アップロードのときに漏れやすいので注意。
2. GitHub のリポジトリ → **Actions** タブ →（初めてなら「I understand…」で有効にする）→
   「MagiScope collector」→ **Run workflow**。緑になれば完了。以降は1時間ごとに自動で動きます。
   使うのは GitHub が自動で用意する権限だけです（設定する鍵はありません）。

## 2. この PC で FANZA同人を取る
1. `register-task.bat` をダブルクリック。1時間ごとに `run-pc.bat` が動くように Windows に登録し、最初の1回をその場で動かします。
2. 最初の1回だけ、Git が **GitHub のログイン画面**を出します（ふだんのログインで OK。鍵は作りません）。
3. やめるときは `unregister-task.bat`。
- PC が起動しているあいだだけ更新されます（止まっていても、最後に取ったランキングはアプリに出つづけます）。
- 必要なもの：Python と Git（どちらもこの PC に入っています）。

## 確認
- MagiScope の「設定 → データソース」に「◯分前に更新」と出れば動いています。
- 取得の記録は `magiscope-data` ブランチの `meta.json` の `log` に残ります。

## メモ
- 前回順位は「前の日までの最後の記録」、順位推移は日ごとの記録です。動かしはじめた日から少しずつたまります。
- ジャケット（iTunes）・視聴者数（Annict）・FANZA の作品ページ（ジャンル・配信日）は、1回あたりの件数を絞って少しずつ補います。
  最初の数時間は画像やジャンルが無い作品があります。
- `magiscope-data` ブランチは毎回1つのコミットにまとめて上書きするので、リポジトリは大きくなりません。
- 各サイトのページのつくりが変わると取れなくなることがあります。そのときは `meta.json` の `log` に「取得失敗」と出ます。
- 手で試すとき：`python collect.py --out 出力フォルダ --only karaoke,anime,fanza`

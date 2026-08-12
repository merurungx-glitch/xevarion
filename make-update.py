#!/usr/bin/env python3
"""XEVARION 更新パッケージ情報 (update.json) を作る。

ポータルと3アプリの Service Worker が事前キャッシュするファイル一覧（CORE）を読み、
実ファイルの合計サイズを数えて update.json を書き出す。
ホームはこの update.json を見て「更新があります（約 N MB）」を出し、
ダウンロードしてから反映する。

使い方:  python make-update.py "ホーム画面リニューアル" "変更点1" "変更点2" ...
引数を省略すると VERSION 日付だけ更新する。
"""
import io, json, os, re, sys, datetime

BASE = os.path.dirname(os.path.abspath(__file__))
# xev-refresh（まとめて最新化）に応じる SW をすべて並べる。
# ★ ここに載っていない SW のファイルは「パッケージ外」と見なされ、
#   ホームのダウンロード量表示で端末の実行時キャッシュぶんとして数えられる。
#   MagiMusic も更新の対象になったので加える（曲＝MP3 は別キャッシュで対象外）。
SWS = ["sw.js", "MagiLex/sw.js", "MagiBurst/sw.js", "MagiChainParty/sw.js", "XEVYNAR/sw.js",
       "MagiJackpot/sw.js", "MagiMusic/sw.js"]


def core_of(sw_path):
    """sw.js の const CORE = [ ... ]; を読み、URL のリストを返す"""
    s = io.open(os.path.join(BASE, sw_path), encoding="utf-8").read()
    m = re.search(r"const CORE = \[(.*?)\n\];", s, re.S)
    if not m:
        return []
    return re.findall(r'"([^"]+)"', m.group(1))


def resolve(sw_path, url):
    """CORE の相対URLを実ファイルパスへ。外部URLとクエリは落とす"""
    if url.startswith("http"):
        return None
    url = url.split("?")[0]
    d = os.path.dirname(os.path.join(BASE, sw_path))
    p = os.path.normpath(os.path.join(d, url))
    if p.endswith(os.sep) or url.endswith("/"):
        p = os.path.join(p, "index.html")
    return p


def main():
    total, files, missing = 0, 0, []
    seen = set()
    urls = []          # パッケージに入っているファイル（サイト直下からの相対パス）
    for sw in SWS:
        for u in core_of(sw):
            p = resolve(sw, u)
            if not p or p in seen:
                continue
            seen.add(p)
            if os.path.isfile(p):
                total += os.path.getsize(p)
                files += 1
                urls.append(os.path.relpath(p, BASE).replace(os.sep, "/"))
            else:
                missing.append(os.path.relpath(p, BASE))

    args = sys.argv[1:]
    title = args[0] if args else "XEVARION アップデート"
    notes = args[1:] if len(args) > 1 else []

    out_path = os.path.join(BASE, "update.json")
    prev = {}
    if os.path.exists(out_path):
        try:
            prev = json.load(io.open(out_path, encoding="utf-8"))
        except Exception:
            prev = {}
    if not notes:
        notes = prev.get("notes", [])

    today = datetime.date.today().isoformat()
    # 同じ日に複数回作ったら枝番を上げる
    seq = 1
    if str(prev.get("version", "")).startswith(today):
        try:
            seq = int(str(prev["version"]).split("-")[-1]) + 1
        except Exception:
            seq = 2

    version = "%s-%d" % (today, seq)

    # 過去の版（新しい順）。更新を何回か見送っていた人に、
    # 「見ていなかったぶん」をまとめて出すためにホームがこれを読む。
    history = prev.get("history")
    if not isinstance(history, list):
        history = []
    # 同じ版が二重に入らないよう、いったん除いてから先頭に積む
    history = [h for h in history
               if isinstance(h, dict) and h.get("version") not in (version, prev.get("version"))]
    if prev.get("version"):
        history.insert(0, {
            "version": prev.get("version"),
            "date": prev.get("date", ""),
            "title": prev.get("title", ""),
            "notes": prev.get("notes", []),
        })
    history = history[:20]

    data = {
        "version": version,
        "date": today,
        "title": title,
        "notes": notes,
        "bytes": total,
        "files": files,
        # ★ ホームがダウンロード量を正しく出すために使う。
        #   実際の更新は「CORE ＋ 端末の実行時キャッシュ」を丸ごと取り直すので、
        #   bytes（＝CORE の合計）だけでは足りない。ホームはこの一覧と端末のキャッシュを
        #   突き合わせて「CORE に無いぶん」の実サイズを足し、本当のダウンロード量を出す。
        "urls": urls,
        "history": history,
    }
    io.open(out_path, "w", encoding="utf-8").write(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print("update.json ->", data["version"], "|", files, "files |",
          "%.1f MB" % (total / 1024 / 1024))
    if missing:
        print("  ※ 見つからないファイル (%d件):" % len(missing))
        for m in missing[:10]:
            print("   -", m)


if __name__ == "__main__":
    main()

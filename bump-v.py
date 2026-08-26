# -*- coding: utf-8 -*-
"""XEVARION の全ファイルを歩いて、参照の ?v=<数字> を +1 する。

★ なぜ道具にしてあるか（xevarion-release-checklist）
  ・?v= の参照は<b>数が増え続ける</b>ので、覚えた数字を信じてはいけない。
  ・上げ忘れると「直したのに反映されない」形で表に出る。
★ 使い方
    python bump-v.py            … 全ファイルの ?v= を +1（書きかえたファイルを出力）
    python bump-v.py --only mb-core.js,xeva.js  … 指定した名前の参照だけ +1
★ 行末（CRLF / LF）はファイルごとに違うので、必ずそのまま残すこと。
★ 名前がかぶるファイルに注意（online.js は MagiBurst 以外にもある）。
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
EXTS = (".html", ".js", ".css", ".webmanifest")
SKIP_DIRS = {".git", "__pycache__", "node_modules"}

only = None
if "--only" in sys.argv:
    only = set(x.strip() for x in sys.argv[sys.argv.index("--only") + 1].split(",") if x.strip())

PAT = re.compile(r"([A-Za-z0-9_\-./]+\.(?:js|css|html|webmanifest|png|jpg|webp|json))\?v=(\d+)")

changed = []
total = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if not fn.endswith(EXTS):
            continue
        p = os.path.join(dirpath, fn)
        try:
            with io.open(p, "r", encoding="utf-8", newline="") as f:
                t = f.read()
        except Exception:
            continue
        n = [0]

        def rep(m):
            name = m.group(1).split("/")[-1]
            if only and name not in only:
                return m.group(0)
            n[0] += 1
            return "%s?v=%d" % (m.group(1), int(m.group(2)) + 1)

        t2 = PAT.sub(rep, t)
        if n[0] and t2 != t:
            tmp = p + ".tmp_bump"
            with io.open(tmp, "w", encoding="utf-8", newline="") as f:
                f.write(t2)
            os.replace(tmp, p)
            changed.append((os.path.relpath(p, ROOT).replace("\\", "/"), n[0]))
            total += n[0]

for rel, n in changed:
    print("%-46s %d" % (rel, n))
print("---- %d files / %d refs" % (len(changed), total))

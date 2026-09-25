"""ホームの左上のバナー用に、ガチャの台帳（開催期間とバナー）を MagiBurst/js/mb-core.js から書き出す。

    python make-gacha-live.py        → gacha-live.js（window.XH_GACHA_DEFS）

★ ホーム（index.html）は mb-core.js（2MB）を読まないので、FESTS / DEBUT_VERSIONS の<b>期間とバナーだけ</b>をここで抜き出す。
  「いま開催中か」はホーム側（home-mate.js の liveGachas）で毎回計算する（mb-core と同じ決まり）。
★ make-update.py が最初に自動で呼ぶ（新しいフェスを足したときの書き忘れを防ぐ）。
"""
import io
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'MagiBurst', 'js', 'mb-core.js')
OUT = os.path.join(HERE, 'gacha-live.js')


def main():
    s = io.open(SRC, encoding='utf-8').read()
    consts = dict(re.findall(r'^const ([A-Z0-9_]+) = "([^"]*)"', s, re.M))
    nums = dict((k, int(v)) for k, v in re.findall(r'^const ([A-Z0-9_]+) = (\d+);', s, re.M))

    def val(v):
        v = v.strip()
        if v.startswith('"'):
            return v.strip('"')
        return consts.get(v, '')

    defs = []
    # FESTS = { fes: {...}, fes2: {...}, fes3: {...} } と FESTS.fesN = {...}
    i0 = s.index('const FESTS = {')
    i1 = s.index('const FES_KEYS = Object.keys(FESTS);')
    body = s[i0:i1]
    starts = [(m.group(1) or m.group(2), m.start()) for m in re.finditer(r'^(?:  ([a-z0-9]+): \{|FESTS\.([a-z0-9]+) = \{)', body, re.M)]
    for n, (key, st) in enumerate(starts):
        en = starts[n + 1][1] if n + 1 < len(starts) else len(body)
        if key == 'value':                      # アーカイブ（下で足す）
            continue
        blk = re.sub(r'/\*.*?\*/', '', body[st:en], flags=re.S)       # コメントの中の古い値（「もとは until: …」）を拾わない
        blk = re.sub(r'(?m)^\s*//.*$', '', blk)

        def f(name):
            m = re.search(r'\b' + name + r':\s*("[^"]*"|[A-Z0-9_]+)', blk)
            return val(m.group(1)) if m else ''
        mon = re.search(r'\bmonthly:\s*\[(\d+),\s*(\d+)\]', blk)
        d = dict(key=key, nm=f('nm'), banner=f('banner'), bannerSoon=f('bannerSoon'), since=f('since'), until=f('until'),
                 openAt=f('openAt'), monthly=[int(mon.group(1)), int(mon.group(2))] if mon else None,
                 perm=bool(re.search(r'\bperm:\s*true', blk)), lux=bool(re.search(r'\bluxGacha:\s*true', blk)))
        for k in ('banner', 'bannerSoon'):
            d[k] = d[k].replace('../img/', 'MagiBurst/img/')
        defs.append(d)
    # 常設のアーカイブ（Object.defineProperty で足している）
    defs.append(dict(key='archive', nm='Festival Archive', banner='MagiBurst/img/bn_archive_s.webp', perm=True))
    # GRAND DEBUT の版
    j0 = s.index('const DEBUT_VERSIONS = [')
    j1 = s.index('];', j0)
    vers = [dict(ver=m.group(1), date=m.group(2), movedAt=(re.search(r'movedAt:\s*"([^"]+)"', m.group(0)) or [None, ''])[1])
            for m in re.finditer(r'\{\s*ver:\s*"([^"]+)",\s*date:\s*"([^"]+)"[^}]*\}', s[j0:j1])]
    out = dict(fests=defs, debut=dict(vers=vers, days=nums.get('DEBUT_DAYS', 20), banner='MagiBurst/img/bn_debut_s.webp'),
               premium=dict(banner='MagiBurst/img/bn_premium_s.webp'), fesDays=nums.get('FES_DAYS', 20))
    js = ('/* ★ 自動生成（make-gacha-live.py）。手で直さない。元は MagiBurst/js/mb-core.js の FESTS / DEBUT_VERSIONS */\n'
          'window.XH_GACHA_DEFS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    old = io.open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    if old != js:
        io.open(OUT, 'w', encoding='utf-8').write(js)
        # 中身が変わったら ?v= と sw.js の VERSION も上げる（上げないと古いのが使われ続ける）
        for fn in ('index.html', 'sw.js'):
            fp = os.path.join(HERE, fn)
            t = io.open(fp, encoding='utf-8', newline='').read()
            t2 = re.sub(r'gacha-live\.js\?v=(\d+)', lambda m: 'gacha-live.js?v=%d' % (int(m.group(1)) + 1), t)
            if fn == 'sw.js' and t2 != t:
                t2 = re.sub(r'const VERSION = "xevarion-sw-v(\d+)";', lambda m: 'const VERSION = "xevarion-sw-v%d";' % (int(m.group(1)) + 1), t2)
            if t2 != t:
                io.open(fp, 'w', encoding='utf-8', newline='').write(t2)
    print('gacha-live.js', len(defs), 'fests', len(vers), 'debut versions', '(changed)' if old != js else '(same)')
    return old != js


if __name__ == '__main__':
    main()

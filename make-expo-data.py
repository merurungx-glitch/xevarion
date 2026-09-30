"""3D 会場（expo/）の中身を、ポータルの台帳から書き出す。  python make-expo-data.py  → expo/expo-data.js

・アプリ（XH_APPS）… 展示ホールのブース
・更新情報（XH_UPDATES）・update.json … 基調講演の大画面
・イベント（XH_EVENTS）・お知らせ（index.html の nm-item）… 講演トラックのスライド
・パートナー（home-mate.js の HM_MATES）… 3D アバターの名前・色・セリフ。色は立ち絵から自動で拾う
・新キャラ（mb-newchars.js ＋ xeva.js の MB_CHAR_MASTER）… ホールの基調講演（新キャラ発表）・ロビーのホログラム
★ make-update.py が最初に自動で呼ぶ（台帳を変えたときの書き忘れを防ぐ）。
"""
import io
import json
import os
import re

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'expo', 'expo-data.js')


def objs(src, start_pat, end_pat):
    i = src.index(start_pat)
    j = src.index(end_pat, i)
    body = src[i:j]
    body = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
    out = []
    for m in re.finditer(r'\{([^{}]*)\}', body):
        d = {}
        for k, v in re.findall(r'(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"', m.group(1)):
            d[k] = v.replace('\\"', '"')
        for k, v in re.findall(r'(\w+)\s*:\s*(true|false)', m.group(1)):
            d[k] = v == 'true'
        if d:
            out.append(d)
    return out


def strip(s):
    s = re.sub(r'<br\s*/?>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'[ \t]+', ' ', s)
    return s.strip()


def news(html):
    out = []
    for m in re.finditer(r'<div class="nm-item"[^>]*data-date="([^"]+)"[^>]*>(.*?)\n    </div>', html, re.S):
        blk = m.group(2)
        t = re.search(r'<div class="nm-title">(.*?)</div>', blk, re.S)
        x = re.search(r'<div class="nm-txt">(.*?)</div>', blk, re.S)
        if t:
            out.append({'date': m.group(1), 'title': strip(t.group(1)), 'text': strip(x.group(1)) if x else ''})
        if len(out) >= 60:
            break
    return out


def newchars():
    """★ 2026-09-29d 新キャラ（mb-newchars.js の MB_NEW_CHARS ＋ xeva.js の MB_CHAR_MASTER の名前・絵）… ホールの発表・ホログラム"""
    src = io.open(os.path.join(HERE, 'mb-newchars.js'), encoding='utf-8').read()
    lst = objs(src, 'window.MB_NEW_CHARS = [', '\n];')
    xv = io.open(os.path.join(HERE, 'xeva.js'), encoding='utf-8').read()
    master = {d.get('mbId'): d for d in objs(xv, 'var MB_CHAR_MASTER = [', '\n  ];')}
    out = []
    for d in lst:
        m = master.get(d.get('id'))
        if not m or not m.get('file'):
            continue
        th = m['file']
        full = th.replace('/t_', '/')
        if not os.path.exists(os.path.join(HERE, full.replace('../', ''))):
            full = th
        out.append({'id': d['id'], 'name': m.get('name', ''), 'img': full, 'thumb': th, 'catch': d.get('catch', ''), 'where': d.get('where', ''), 'since': d.get('since', ''), 'color': d.get('color', '')})
        if len(out) >= 30:
            break
    return out


def mates(js):
    i = js.index('const HM_MATES = {')
    j = js.index('\n  };\n', i)
    body = js[i:j]
    out = []
    for m in re.finditer(r'\n    (\w+): \{\n      dir: "([^"]+)", name: "([^"]+)", ruby: "([^"]+)", color: "([^"]+)",', body):
        cid = m.group(1)
        st = m.end()
        nxt = re.search(r'\n    \w+: \{\n      dir:', body[st:])
        blk = body[st:st + nxt.start()] if nxt else body[st:]
        intro = re.search(r'intro: "((?:[^"\\]|\\.)*)"', blk)
        lines = {}
        for key in ('intro', 'idle', 'chain', 'head', 'day', 'evening', 'night', 'morning', 'pick', 'friends'):
            mm = re.search(r'\n        ' + key + r': \[(.*?)\](?:,|\n)', blk, re.S)
            if mm:
                lines[key] = re.findall(r'"((?:[^"\\]|\\.)*)"', mm.group(1))
        out.append(dict(id=cid, dir=m.group(2), name=m.group(3), ruby=m.group(4), color=m.group(5),
                        intro=intro.group(1) if intro else '', lines=lines))
    return out


def sample_colors(cid, rig):
    """立ち絵からアバターの色を拾う（髪・肌・上の服・下の服・目）"""
    p = os.path.join(HERE, 'home-mate', cid, cid + '.webp')
    lab = os.path.join(HERE, 'home-mate', cid, cid + '_label.webp')
    if not os.path.exists(p):
        return {}
    A = np.asarray(Image.open(p).convert('RGBA')).astype(float)
    L = np.asarray(Image.open(lab).convert('RGB').resize((A.shape[1], A.shape[0]))).astype(float) if os.path.exists(lab) else None

    def med(mask):
        px = A[..., :3][mask & (A[..., 3] > 200)]
        if len(px) < 10:
            return None
        return '#%02x%02x%02x' % tuple(int(v) for v in np.median(px, axis=0))
    H, W = A.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    fx, fy = rig['face']; fr = rig.get('faceRadius', 70)
    col = {}
    if L is not None:
        hair = (L[..., 0] > 180) & (np.hypot(xx - fx, yy - fy) < fr * 2.2)
        col['hair'] = med(hair)
        # 髪の暗い色（影）
        px = A[..., :3][hair & (A[..., 3] > 200)]
        if len(px) > 20:
            lum = px.mean(axis=1)
            col['hairDark'] = '#%02x%02x%02x' % tuple(int(v) for v in np.median(px[lum < np.percentile(lum, 30)], axis=0))
            col['hairLight'] = '#%02x%02x%02x' % tuple(int(v) for v in np.median(px[lum > np.percentile(lum, 80)], axis=0))
    skin = (np.hypot(xx - fx, yy - (fy + fr * 0.35)) < fr * 0.35)
    col['skin'] = med(skin)
    ix, iy = rig['irisL']
    col['eye'] = med(np.hypot(xx - ix, yy - iy) < 3)
    bx = (rig['bustL'][0] + rig['bustR'][0]) / 2; by = (rig['bustL'][1] + rig['bustR'][1]) / 2
    for nm, cx, cy, r in (('top', rig['bustL'][0], rig['bustL'][1], rig['bustRadius'] * 0.35),
                          ('top2', rig['bustR'][0], rig['bustR'][1], rig['bustRadius'] * 0.35)):
        col[nm] = med(np.hypot(xx - cx, yy - cy) < r)
    if rig.get('pants'):
        x0, y0, x1, y1 = rig['pants']
        col['bottom'] = med((xx > x0 + (x1 - x0) * 0.3) & (xx < x1 - (x1 - x0) * 0.3) & (yy > y0 + (y1 - y0) * 0.35) & (yy < y1 - (y1 - y0) * 0.25))
    return col


def main():
    home = io.open(os.path.join(HERE, 'xevarion-home.js'), encoding='utf-8').read()
    apps = objs(home, 'const XH_APPS = [', '\n];')
    retired = set(re.findall(r'^\s+(\w+):\s*"', home[home.index('const XH_RETIRED = {'):home.index('};', home.index('const XH_RETIRED = {'))], re.M))
    apps = [a for a in apps if a.get('id') and a.get('href') and a['id'] not in retired]
    updates = objs(home, 'const XH_UPDATES = [', '\n];')
    events = objs(home, 'const XH_EVENTS = [', '\n];')
    html = io.open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()
    upd = json.load(io.open(os.path.join(HERE, 'update.json'), encoding='utf-8'))
    hm = io.open(os.path.join(HERE, 'home-mate.js'), encoding='utf-8').read()
    ms = mates(hm)
    hv = re.search(r'const HM_VER = (\d+);', hm)
    for m in ms:
        m['v'] = int(hv.group(1)) if hv else 0          # 素材の ?v=（3D会場も sw.js の CORE と同じURLで読む＝オフラインでも出る）
        try:
            rig = json.load(io.open(os.path.join(HERE, 'home-mate', m['id'], m['id'] + '.json'), encoding='utf-8'))
            m['col'] = sample_colors(m['id'], rig)
        except Exception as e:
            print('!! colors', m['id'], e)
            m['col'] = {}
    data = dict(apps=[{k: a.get(k, '') for k in ('id', 'name', 'full', 'sub', 'cat', 'tone', 'href', 'img', 'desc')} for a in apps],
                updates=updates[:24], events=events, news=news(html),
                release=dict(version=upd.get('version'), date=upd.get('date'), title=upd.get('title'), notes=upd.get('notes', [])),
                mates=ms, newchars=newchars())
    js = ('/* ★ 自動生成（make-expo-data.py）。手で直さない。元はポータルの台帳（XH_APPS / XH_UPDATES / XH_EVENTS / お知らせ / HM_MATES） */\n'
          'window.EXPO_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    old = io.open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    if old != js:
        io.open(OUT, 'w', encoding='utf-8').write(js)
        for fn in (os.path.join('expo', 'index.html'),):
            fp = os.path.join(HERE, fn)
            if os.path.exists(fp):
                t = io.open(fp, encoding='utf-8', newline='').read()
                t2 = re.sub(r'expo-data\.js\?v=(\d+)', lambda m: 'expo-data.js?v=%d' % (int(m.group(1)) + 1), t)
                if t2 != t:
                    io.open(fp, 'w', encoding='utf-8', newline='').write(t2)
        sw = os.path.join(HERE, 'sw.js')
        t = io.open(sw, encoding='utf-8', newline='').read()
        t2 = re.sub(r'expo/expo-data\.js\?v=(\d+)', lambda m: 'expo/expo-data.js?v=%d' % (int(m.group(1)) + 1), t)
        if t2 != t:
            t2 = re.sub(r'const VERSION = "xevarion-sw-v(\d+)";', lambda m: 'const VERSION = "xevarion-sw-v%d";' % (int(m.group(1)) + 1), t2)
            io.open(sw, 'w', encoding='utf-8', newline='').write(t2)
    print('expo-data.js', len(data['apps']), 'apps', len(data['updates']), 'updates', len(data['events']), 'events',
          len(data['news']), 'news', len(ms), 'mates', '(changed)' if old != js else '(same)')


if __name__ == '__main__':
    main()

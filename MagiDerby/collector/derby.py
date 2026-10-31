# -*- coding: utf-8 -*-
"""
MagiDerby 自動取得（2026-10-21・ご指定「実際の G1 の結果を使う形に」）
------------------------------------------------------------
実際の JRA 平地 GⅠ の
  ・日程（重賞日程）・レースの番号（race_id）・発走時刻
  ・出馬表（登録馬 → 枠順確定後は枠・馬番・馬体重）
  ・オッズ（単勝・複勝は発売中から。レース当日は枠連〜3連単も）
  ・結果（着順・タイム・着差・人気・単勝オッズ・上がり・通過順・馬体重）・払戻金（8券種）・コーナー通過順位・ラップ
  ・出走馬のプロフィール（生年月日・調教師・馬主と勝負服・生産者・獲得賞金・通算成績）・血統（父・母・母父…）・近走
を netkeiba の公開ページから読み、--out のフォルダの derby/ に JSON で置く。
（MagiScope と同じしくみ：PC のタスク（MagiScope/collector/run-pc.bat）が1時間ごとに動かし、
  GitHub の magiscope-data ブランチに置く。アプリは raw.githubusercontent.com から読むだけ。鍵・トークンは使わない）

★ GⅠ の当日は、発走の75分前〜発走の50分後のあいだ、4分おきにオッズと結果を取り直して置く（--loop）。
★★ 2026-10-21 ご指定「結果で実際のレースの動画にとべるように」
  → 確定したレースは、JRA 公式 YouTube（JRA公式チャンネル）の<b>レース映像</b>の動画 id をさがして置く。
    まず公式チャンネルの新着（RSS・15本）を見て、無ければ YouTube の検索結果から（1回の取得で4レースまで）。
    「年・レース名・勝ち馬の名前」がそろった題名だけを採る（ジョッキーカメラ・インタビューなどは採らない）。

使いかた
  python derby.py --out <フォルダ> [--loop] [--no-push] [--days 9]
"""
import json, os, re, sys, time, html, datetime, unicodedata, urllib.request, urllib.parse, http.cookiejar, subprocess

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
JST = datetime.timezone(datetime.timedelta(hours=9))
LOG = []


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a and a.index(name) + 1 < len(a) else default


OUT = arg("--out", "derby-out")
D_OUT = os.path.join(OUT, "derby")
CACHE = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "MagiDerby", "cache")
NO_PUSH = "--no-push" in sys.argv
LOOP = "--loop" in sys.argv
AHEAD_DAYS = int(arg("--days", "9"))          # 何日先までの GⅠ の出馬表を取るか（特別登録は1週間前の日曜）
HORSE_TTL = 20 * 3600                          # 出走馬のくわしい情報を取り直す間隔（秒）


def now():
    return datetime.datetime.now(JST)


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG.append(now().strftime("%m/%d %H:%M ") + s)
    print(s, flush=True)


# ══════════ 通信 ══════════
_cj = http.cookiejar.CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_cj))
_last = [0.0]


def _decode(b, hint):
    for enc in ([hint] if hint else []) + ["utf-8", "euc_jp", "cp932"]:
        try:
            return b.decode(enc)
        except Exception:
            pass
    return b.decode("utf-8", "replace")


def http_get(url, binary=False, timeout=30, tries=3):
    err = None
    for k in range(tries):
        wait = 0.9 - (time.time() - _last[0])        # 相手に負担をかけないよう、1件ずつ間をあける
        if wait > 0:
            time.sleep(wait)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.5", "Referer": "https://race.netkeiba.com/"})
            with _opener.open(req, timeout=timeout) as r:
                b = r.read()
                _last[0] = time.time()
                if binary:
                    return b
                return _decode(b, r.headers.get_content_charset())
        except Exception as e:
            _last[0] = time.time()
            err = e
            time.sleep(2 + k * 3)
    raise err


def strip(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def fnum(s):
    try:
        return float(str(s).replace(",", "").strip())
    except Exception:
        return None


def inum(s):
    try:
        return int(re.sub(r"[^\d-]", "", str(s)))
    except Exception:
        return None


def load_json(p, dflt=None):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return dflt


def save_json(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def ms(dt):
    return int(dt.timestamp() * 1000)


def post_dt(r):
    """発走の日時（JST）。発走時刻が分からなければ 15:40 とみなす"""
    y, m, d = [int(x) for x in r["date"].split("-")]
    hh, mm = [int(x) for x in (r.get("post") or "15:40").split(":")]
    return datetime.datetime(y, m, d, hh, mm, tzinfo=JST)


# ══════════ 重賞日程 → GⅠ ══════════
def fetch_schedule():
    s = http_get("https://race.netkeiba.com/top/schedule.html")
    year = now().year
    out = []
    for r in re.findall(r'<tr class="schedule_list\d">(.*?)</tr>', s, re.S):
        tds = [strip(t) for t in re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)]
        if len(tds) < 7 or tds[2] != "G1":
            continue
        md = re.match(r"(\d{2})/(\d{2})", tds[0])
        sd = re.match(r"(芝|ダ)(\d+)m", tds[4])
        if not md or not sd:
            continue
        out.append({"date": "%d-%s-%s" % (year, md.group(1), md.group(2)), "nm": tds[1], "place": tds[3],
                    "surf": sd.group(1), "dist": int(sd.group(2)), "cond": tds[5], "rule": tds[6]})
    log("GⅠ の日程", len(out), "レース")
    return out


# ══════════ その日のレース一覧 → GⅠ の race_id・発走時刻 ══════════
ALIAS = {"優駿牝馬": "オークス", "東京優駿": "日本ダービー"}   # 重賞日程の正式名 → レース一覧での呼び名


def norm_nm(s):
    s = unicodedata.normalize("NFKC", s or "").replace(" ", "")
    return ALIAS.get(s, s)


def find_race(r):
    ds = r["date"].replace("-", "")
    s = http_get("https://race.netkeiba.com/top/race_list_sub.html?kaisai_date=" + ds)
    for b in re.findall(r'<li class="RaceList_DataItem[^"]*">(.*?)</li>', s, re.S):
        nm = re.search(r'<span class="ItemTitle">(.*?)</span>', b)
        if not nm:
            continue
        title = strip(nm.group(1))
        g1 = re.search(r'Icon_GradeType1[ "]', b)
        a, b2 = norm_nm(title), norm_nm(r["nm"])
        if not (g1 and (a == b2 or a in b2 or b2 in a)):
            continue
        rid = re.search(r"race_id=(\d{12})", b)
        tm = re.search(r'RaceList_Itemtime">\s*(\d{1,2}:\d{2})', b)
        if rid:
            r["rid"] = rid.group(1)
            if tm:
                r["post"] = tm.group(1).zfill(5)
            log("race_id", r["nm"], r["rid"], r.get("post"))
            return True
    return False


# ══════════ 出馬表 ══════════
def parse_racedata(s, race):
    d1 = re.search(r'<div class="RaceData01">(.*?)</div>', s, re.S)
    d2 = re.search(r'<div class="RaceData02">(.*?)</div>', s, re.S)
    if d1:
        t = strip(d1.group(1))
        m = re.search(r"(\d{1,2}:\d{2})発走", t)
        if m:
            race["post"] = m.group(1).zfill(5)
        m = re.search(r"(芝|ダ)(\d+)m\s*\(([^)]*)\)", t)
        if m:
            race["surf"], race["dist"], race["dir"] = m.group(1), int(m.group(2)), re.sub(r"\s+", " ", m.group(3)).strip()
        m = re.search(r"天候:(\S+)", t)
        if m:
            race["weather"] = m.group(1)
        m = re.search(r"馬場:(\S+)", t)
        if m:
            race["going"] = m.group(1)
    if d2:
        spans = [strip(x) for x in re.findall(r"<span>(.*?)</span>", d2.group(1), re.S)]
        race["kai"] = "".join(spans[:3]) if len(spans) >= 3 else ""
        for sp in spans:
            m = re.match(r"本賞金:([\d,]+)", sp)
            if m:
                race["prize"] = [int(x) for x in m.group(1).split(",") if x]
            m = re.match(r"(\d+)頭", sp)
            if m:
                race["heads"] = int(m.group(1))


def fetch_shutuba(rid, race):
    s = http_get("https://race.netkeiba.com/race/shutuba.html?race_id=" + rid)
    parse_racedata(s, race)
    ents = []
    for m in re.finditer(r'<tr class="(HorseList[^"]*)"\s+id="tr_(\d+)">(.*?)</tr>', s, re.S):
        cls, idx, row = m.group(1), int(m.group(2)), m.group(3)
        hid = re.search(r"db\.netkeiba\.com/horse/(\d+)", row)
        if not hid:
            continue
        nm = re.search(r'/horse/\d+"[^>]*title="([^"]+)"', row)
        w = re.search(r'<td class="Waku[^"]*"><span>(\d*)</span>', row)
        u = re.search(r'<td class="Umaban[^"]*">(\d*)</td>', row)
        sa = re.search(r'<td class="Barei[^"]*">(.*?)</td>', row, re.S)
        kg = re.search(r'<td class="Barei[^"]*">.*?</td>\s*<td[^>]*>([\d.]+)</td>', row, re.S)
        jk = re.search(r'<td class="Jockey">.*?/jockey/result/recent/(\w+)/"[^>]*title="([^"]+)"', row, re.S)
        tr = re.search(r'<td class="Trainer"><span class="Label\d">(.*?)</span><a[^>]*title="([^"]+)"', row, re.S)
        wt = re.search(r'<td class="Weight">(.*?)</td>', row, re.S)
        txt = strip(row)
        cx = 1 if ("Cancel" in cls or "取消" in txt or "除外" in txt) else 0
        ents.append({
            "hid": hid.group(1), "nm": html.unescape(nm.group(1)) if nm else "", "idx": idx,
            "waku": inum(w.group(1)) if w and w.group(1) else None, "no": inum(u.group(1)) if u and u.group(1) else None,
            "sa": strip(sa.group(1)) if sa else "", "kg": fnum(kg.group(1)) if kg else None,
            "j": html.unescape(jk.group(2)) if jk else "", "jid": jk.group(1) if jk else "",
            "tr": html.unescape(tr.group(2)) if tr else "", "trb": strip(tr.group(1)) if tr else "",
            "bw": strip(wt.group(1)).replace(" ", "") if wt else "", "cx": cx,
        })
    ents.sort(key=lambda e: (e["no"] or 99, e["idx"]))
    return ents


# ══════════ オッズ（netkeiba の JSON） ══════════
TYPE_KEYS = {1: "win", 2: "place", 3: "waku", 4: "quin", 5: "wide", 6: "exa", 7: "trio", 8: "tri"}


def fetch_odds(rid, t):
    s = http_get("https://race.netkeiba.com/api/api_get_jra_odds.html?race_id=%s&type=%d&action=init" % (rid, t))
    j = json.loads(s)
    data = (j.get("data") or {}) if isinstance(j.get("data"), dict) else {}
    od = (data.get("odds") or {}).get(str(t)) or {}
    return j.get("status") or "", data.get("official_datetime") or "", od


def split_key(k, t):
    k = str(k)
    if t in (1, 2):
        return [int(k)]
    n = 3 if t in (7, 8) else 2
    if len(k) != 2 * n:
        return None
    return [int(k[i * 2:i * 2 + 2]) for i in range(n)]


def odds_block(rid, types):
    """types の券種のオッズ。返す：{kind, at, win:{no:[o,pop]}, place:{no:[lo,hi,pop]}, quin:[[a,b,o,pop]..], wide:[[a,b,lo,hi,pop]..] …}"""
    res = {}
    for t in types:
        try:
            st, at, od = fetch_odds(rid, t)
        except Exception as e:
            log("オッズ取得失敗", rid, t, e)
            continue
        if not od or st in ("NG", ""):
            continue
        if t == 1 or "kind" not in res:          # 状態（yoso＝予想オッズ／middle＝発売中／result＝確定）は単勝のもの
            res["kind"] = st
            res["at"] = at
        key = TYPE_KEYS[t]
        if t == 1:
            res[key] = {str(int(k)): [fnum(v[0]), inum(v[2])] for k, v in od.items() if fnum(v[0])}
        elif t == 2:
            res[key] = {str(int(k)): [fnum(v[0]), fnum(v[1]), inum(v[2])] for k, v in od.items() if fnum(v[0])}
        else:
            arr = []
            for k, v in od.items():
                c = split_key(k, t)
                o = fnum(v[0])
                if not c or not o:
                    continue
                arr.append(c + ([o, fnum(v[1]) or o, inum(v[2])] if t == 5 else [o, inum(v[2])]))
            arr.sort(key=lambda x: x[-1] or 99999)
            res[key] = arr
    return res


# ══════════ 結果・払戻金 ══════════
PAY_ROWS = {"Tansho": "win", "Fukusho": "place", "Wakuren": "waku", "Umaren": "quin", "Wide": "wide", "Umatan": "exa", "Fuku3": "trio", "Tan3": "tri"}


def fetch_result(rid, race):
    s = http_get("https://race.netkeiba.com/race/result.html?race_id=" + rid)
    parse_racedata(s, race)
    tb = re.search(r'id="All_Result_Table">(.*?)</table>', s, re.S)
    if not tb:
        return None
    rows = []
    for row in re.findall(r'<tr[^>]*HorseList[^>]*>(.*?)</tr>', tb.group(1), re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if len(tds) < 13:
            continue
        hid = re.search(r"db\.netkeiba\.com/horse/(\d+)", row)
        nm = re.search(r'<span class="HorseNameSpan">(.*?)</span>', row, re.S)
        jk = re.search(r"/jockey/result/recent/(\w+)/", row)
        tr = re.search(r'<span class="Label\d">(.*?)</span>', row, re.S)
        g = [strip(x) for x in tds]
        rows.append({
            "pos": g[0], "waku": inum(g[1]), "no": inum(g[2]), "hid": hid.group(1) if hid else "", "nm": strip(nm.group(1)) if nm else g[3],
            "sa": g[4], "kg": fnum(g[5]), "j": g[6], "jid": jk.group(1) if jk else "", "time": g[7], "mg": g[8],
            "pop": inum(g[9]), "odds": fnum(g[10]), "l3": fnum(g[11]), "pass": g[12],
            "tr": strip(re.sub(r'<span class="Label\d">.*?</span>', "", tds[13])) if len(tds) > 13 else "", "trb": strip(tr.group(1)) if tr else "",
            "bw": g[14].replace(" ", "") if len(g) > 14 else "",
        })
    pay = {}
    for cls, key in PAY_ROWS.items():
        m = re.search(r'<tr class="%s">(.*?)</tr>' % cls, s, re.S)
        if not m:
            continue
        b = m.group(1)
        res = re.search(r'<td class="Result">(.*?)</td>', b, re.S)
        po = re.search(r'<td class="Payout">(.*?)</td>', b, re.S)
        nk = re.search(r'<td class="Ninki">(.*?)</td>', b, re.S)
        if not res or not po:
            continue
        if key in ("win", "place"):
            combos = [[int(x)] for x in re.findall(r"<span>(\d+)</span>", res.group(1))]
        else:
            combos = [[int(x) for x in re.findall(r"<span>(\d+)</span>", ul)] for ul in re.findall(r"<ul>(.*?)</ul>", res.group(1), re.S)]
            combos = [c for c in combos if c]
        yen = [inum(x) for x in re.split(r"<br\s*/?>", po.group(1)) if inum(x)]
        pops = [inum(x) for x in re.findall(r"(\d+)人気", nk.group(1))] if nk else []
        lst = []
        for i, c in enumerate(combos):
            if i < len(yen):
                lst.append({"c": c, "y": yen[i], "pop": pops[i] if i < len(pops) else None})
        if lst:
            pay[key] = lst
    corners = []
    ct = re.search(r'summary="コーナー通過順位"[^>]*>(.*?)</table>', s, re.S)
    if ct:
        for th, td in re.findall(r"<th>(.*?)</th>\s*<td>(.*?)</td>", ct.group(1), re.S):
            k = inum(strip(th))
            corners.append({"k": k, "s": strip(td).replace(" ", "")})
    laps = {}
    lt = re.search(r'class="RaceCommon_Table Race_HaronTime">(.*?)</table>', s, re.S)
    if lt:
        heads = [strip(x) for x in re.findall(r"<th>(.*?)</th>", lt.group(1), re.S)]
        trs = re.findall(r'<tr class="HaronTime">(.*?)</tr>', lt.group(1), re.S)
        vals = [[strip(x) for x in re.findall(r"<td>(.*?)</td>", t, re.S)] for t in trs]
        laps = {"d": [inum(h) for h in heads], "rows": vals}
    pace = re.search(r'RapPace_Title">ペース:<span>(\w)</span>', s)
    return {"rows": rows, "pay": pay, "corners": corners, "laps": laps, "pace": pace.group(1) if pace else ""}


# ══════════ 出走馬（プロフィール・血統・近走） ══════════
def fetch_horse(hid):
    p = os.path.join(CACHE, "horse_%s.json" % hid)
    c = load_json(p)
    if c and time.time() - c.get("t", 0) < HORSE_TTL:
        return c
    out = {"t": time.time(), "prof": {}, "ped": [], "runs": []}
    try:
        s = http_get("https://db.netkeiba.com/horse/" + hid)
        t1 = re.search(r'<div class="horse_title">(.*?)</div>', s, re.S)
        if t1:
            p1 = re.search(r'<p class="txt_01">(.*?)</p>', t1.group(1), re.S)
            out["prof"]["title"] = strip(p1.group(1)) if p1 else ""
        tb = re.search(r'class="db_prof_table[^"]*">(.*?)</table>', s, re.S)
        if tb:
            for th, td in re.findall(r"<th>(.*?)</th>\s*<td>(.*?)</td>", tb.group(1), re.S):
                k = strip(th)
                v = strip(td)
                if k == "生年月日":
                    out["prof"]["birth"] = v
                elif k == "調教師":
                    out["prof"]["trainer"] = v
                elif k == "馬主":
                    out["prof"]["owner"] = v
                    oc = re.search(r"colours/(\d+)\.gif", td)
                    if oc:
                        out["prof"]["oid"] = oc.group(1)
                elif k == "生産者":
                    out["prof"]["breeder"] = v
                elif k == "産地":
                    out["prof"]["area"] = v
                elif k.startswith("獲得賞金") and "中央" in k:
                    out["prof"]["prize"] = v
                elif k == "通算成績":
                    out["prof"]["rec"] = v
                elif k == "主な勝鞍":
                    out["prof"]["best"] = v
    except Exception as e:
        log("馬のページ取得失敗", hid, e)
    try:
        j = json.loads(http_get("https://db.netkeiba.com/horse/ajax_horse_pedigree.html?input=UTF-8&output=json&id=" + hid))
        bt = re.search(r'class="blood_table">(.*?)</table>', j.get("data") or "", re.S)
        if bt:
            out["ped"] = [strip(n) for n in re.findall(r'/horse/ped/\w+/"[^>]*>(?:<span[^>]*>)?(.*?)</', bt.group(1), re.S)][:6]
    except Exception as e:
        log("血統取得失敗", hid, e)
    try:
        j = json.loads(http_get("https://db.netkeiba.com/horse/ajax_horse_results.html?input=UTF-8&output=json&id=" + hid))
        s = j.get("data") or ""
        heads = [re.sub(r"\s+", "", strip(x)) for x in re.findall(r"<th[^>]*>(.*?)</th>", s, re.S)]
        H = {}
        for i, h in enumerate(heads):
            for key, pat in (("date", "日付"), ("venue", "開催"), ("wx", "天気"), ("rn", "R"), ("race", "レース名"), ("n", "頭数"), ("waku", "枠番"), ("no", "馬番"),
                             ("odds", "オッズ"), ("pop", "人気"), ("pos", "着順"), ("j", "騎手"), ("kg", "斤量"), ("dist", "距離"), ("going", "馬場"), ("time", "タイム"),
                             ("mg", "着差"), ("pass", "通過"), ("pace", "ペース"), ("l3", "上り"), ("bw", "馬体重"), ("win", "勝ち馬(2着馬)"), ("prize", "賞金")):
                if h == pat and key not in H:
                    H[key] = i
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", s, re.S)
        for row in rows:
            tds = [strip(x) for x in re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)]
            if len(tds) < 20 or not re.match(r"\d{4}/\d{2}/\d{2}", tds[H.get("date", 0)] if H.get("date", 0) < len(tds) else ""):
                continue
            rec = {k: tds[i] if i < len(tds) else "" for k, i in H.items()}
            out["runs"].append(rec)
            if len(out["runs"]) >= 10:
                break
    except Exception as e:
        log("近走取得失敗", hid, e)
    save_json(p, out)
    return out


def save_silks(oid):
    if not oid:
        return
    p = os.path.join(D_OUT, "silks", oid + ".gif")
    if os.path.exists(p):
        return
    try:
        b = http_get("https://cdnv2.netkeiba.com/img/db/colours/%s.gif" % oid, binary=True)
        if b and len(b) < 40000:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "wb") as f:
                f.write(b)
    except Exception as e:
        log("勝負服の画像を取れませんでした", oid, e)


# ══════════ 実際のレース映像（JRA 公式 YouTube） ══════════
JRA_CH = "UCj6AKkCWS6FJqf0o5wP45eQ"      # JRA公式チャンネル
_rss = [None]


def nk(t):
    return unicodedata.normalize("NFKC", html.unescape(t or "")).replace(" ", "").replace("\u3000", "")


def video_ok(title, r, winner):
    t = nk(title)
    if t.startswith("【") or "shorts" in t or "ジョッキーカメラ" in t or "インタビュー" in t or "過去" in t:
        return False
    if (r["date"][:4] + "年") not in t or "GI" not in t:
        return False
    if winner and nk(winner) not in t:
        return False
    names = {nk(r["nm"]), nk(ALIAS.get(unicodedata.normalize("NFKC", r["nm"]), "")), nk(r["nm"]).replace("ステークス", "S")}
    return any(n and n in t for n in names)


def jra_rss():
    if _rss[0] is None:
        _rss[0] = []
        try:
            x = http_get("https://www.youtube.com/feeds/videos.xml?channel_id=" + JRA_CH)
            for vid, title in re.findall(r"<entry>.*?<yt:videoId>([^<]+)</yt:videoId>.*?<title>([^<]+)</title>", x, re.S):
                _rss[0].append((vid, html.unescape(title)))
        except Exception as e:
            log("JRA の新着動画を読めませんでした", e)
    return _rss[0]


def yt_search(q):
    out = []
    x = http_get("https://www.youtube.com/results?search_query=" + urllib.parse.quote(q))
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", x, re.S)
    if not m:
        return out
    d = json.loads(m.group(1))

    def walk(o):
        if isinstance(o, dict):
            v = o.get("videoRenderer")
            if isinstance(v, dict):
                t = "".join(r.get("text", "") for r in (v.get("title") or {}).get("runs", []))
                ch = "".join(r.get("text", "") for r in (v.get("ownerText") or {}).get("runs", []))
                out.append((v.get("videoId"), t, ch))
            for y in o.values():
                walk(y)
        elif isinstance(o, list):
            for y in o:
                walk(y)
    walk(d)
    return out


def find_video(r, race, allow_search):
    rows = ((race.get("result") or {}).get("rows") or [])
    win = next((x["nm"] for x in rows if x.get("pos") == "1"), "")
    for vid, title in jra_rss():
        if video_ok(title, r, win):
            return {"yt": vid, "title": title}
    if not allow_search:
        return None
    nm = ALIAS.get(unicodedata.normalize("NFKC", r["nm"]), r["nm"])
    try:
        for vid, title, ch in yt_search(r["date"][:4] + "年 " + nm + " GⅠ JRA公式")[:20]:
            if vid and "JRA" in ch and video_ok(title, r, win):
                return {"yt": vid, "title": title}
    except Exception as e:
        log("動画の検索に失敗", r["nm"], e)
    return None


def fill_videos(races, max_search=4):
    n = 0
    for r in races:
        if r.get("st") != "result" or not r.get("rid") or r.get("yt"):
            continue
        if time.time() * 1000 - (r.get("vtry") or 0) < 6 * 3600 * 1000 and n >= 0 and r.get("vtry"):
            # 6時間以内に探して見つからなかったレースは、新着（RSS）だけ見る
            allow = False
        else:
            allow = n < max_search
        race = load_json(race_path(r["rid"]), {}) or {}
        v = find_video(r, race, allow)
        if allow:
            n += 1
            r["vtry"] = ms(now())        # 検索までしたときだけ（6時間は検索しない）
        if v:
            r["yt"] = v["yt"]
            race["video"] = v
            save_json(race_path(r["rid"]), race)
            log("レース映像", r["nm"], v["yt"], v["title"])


# ══════════ 1レースぶんを新しくする ══════════
def race_path(rid):
    return os.path.join(D_OUT, "race", rid + ".json")


def result_full(race):
    """結果の表が全頭そろっているか。
    ★★ 2026-10-26 レース直後の netkeiba の結果は速報（上位5頭だけ）のことがあり、それで確定あつかいにして取り直さなかった
    → アプリで6着以下の馬の名前が出なかった・取消の返還を見落とすおそれ。出走頭数（heads）に足りなければ「途中」"""
    rows = ((race.get("result") or {}).get("rows") or [])
    need = race.get("heads") or len([e for e in (race.get("entries") or []) if not e.get("cx")])
    return (not need) or len(rows) >= need


def update_race(r, full=True):
    today = now().date()
    d = datetime.date(*[int(x) for x in r["date"].split("-")])
    days = (d - today).days
    if r.get("st") == "result":
        # ★★ 2026-10-26 結果が途中（速報）なら、全頭そろうまで（レースから1週間まで）取り直す
        if not (r.get("rid") and days >= -7 and (r.get("part") or not result_full(load_json(race_path(r["rid"]), {}) or {}))):
            return False
    if days > AHEAD_DAYS:
        r["st"] = "sched"
        return False
    if not r.get("rid"):
        if not find_race(r):
            r["st"] = "sched"
            return False
    rid = r["rid"]
    race = load_json(race_path(rid), {}) or {}
    race.update({"v": 1, "rid": rid, "nm": r["nm"], "date": r["date"], "place": r["place"], "surf": r["surf"], "dist": r["dist"], "cond": r.get("cond", ""), "rule": r.get("rule", "")})
    if r.get("post"):
        race["post"] = r["post"]
    changed = False
    pdt = post_dt(r)
    # ── 結果（発走の6分あと以降）
    if now() >= pdt + datetime.timedelta(minutes=6):
        try:
            res = fetch_result(rid, race)
            if res and res.get("pay") and res.get("rows"):
                race["result"] = res
                race["st"] = "result"
                r["st"] = "result"
                if result_full(race):
                    r.pop("part", None)
                else:
                    res["part"] = 1
                    r["part"] = 1
                    log("結果（速報・上位だけ）", r["nm"], len(res["rows"]), "頭")
                top = [x for x in res["rows"] if x["pos"] == "1"]
                r["win"] = {"no": top[0]["no"], "nm": top[0]["nm"], "j": top[0]["j"], "time": top[0]["time"]} if top else None
                w = res["pay"].get("win") or []
                t3 = res["pay"].get("tri") or []
                r["pay"] = {"win": w[0]["y"] if w else None, "tri": t3[0]["y"] if t3 else None}
                r["n"] = len([x for x in res["rows"] if x["pos"] not in ("取消", "除外")])
                changed = True
                log("結果", r["nm"], r["win"])
            else:
                race["st"] = "wait"
                r["st"] = "wait"
        except Exception as e:
            log("結果の取得失敗", r["nm"], e)
    if r.get("st") != "result" and days >= -1:
        # ── 出馬表
        try:
            ents = fetch_shutuba(rid, race)
            if ents:
                race["entries"] = ents
                drawn = all(e["no"] for e in ents if not e["cx"])
                st = "draw" if drawn else "entry"
                if r.get("st") != "wait":
                    race["st"] = st
                    r["st"] = st
                r["post"] = race.get("post") or r.get("post")
                r["n"] = len([e for e in ents if not e["cx"]])
                changed = True
        except Exception as e:
            log("出馬表の取得失敗", r["nm"], e)
        # ── オッズ（単勝・複勝はいつも。JRA の発売が始まっていれば全券種）
        # ★★ 2026-10-27 ご報告「単勝・複勝以外のオッズが表示されない」：前は「レースの前日から」だけ枠連〜3連単を取っていた。
        #   → 単勝が予想オッズ（yoso）でなくなったら＝JRA の発売が始まったら、日に関係なく全券種を取る（アプリは無いあいだ単勝からの試算を出す）
        try:
            od = odds_block(rid, [1, 2])
            if od and od.get("kind") not in (None, "", "yoso"):
                od.update({k: v for k, v in odds_block(rid, [3, 4, 5, 6, 7, 8]).items() if k not in ("kind", "at")})
            if od:
                if od.get("kind") == "yoso":
                    # 予想オッズ（発売前）：番号を馬の id に読みかえて置く
                    # ★★ 2026-10-30 ご報告「人気とオッズがズレていることがある」の真因：netkeiba の予想オッズの番号は
                    #   枠順の発表前＝「登録の並び（tr_◯）」、発表後＝<b>馬番</b>に変わる。前は発表後も tr_◯ で読みかえていたので、
                    #   木曜の枠順確定〜金曜の発売開始のあいだ、オッズと人気がよその馬に付いていた（天皇賞（秋）で確認：クロワデュノールの 2.7・1番人気がセイウンハーデスに）。
                    #   → 出走する馬に馬番がそろっていれば馬番で、まだなら登録の並びで読みかえる。
                    ents = race.get("entries") or []
                    drawn = any(e.get("no") for e in ents if not e.get("cx"))
                    by_key = {str(e["no"]): e["hid"] for e in ents if e.get("no")} if drawn else {str(e["idx"]): e["hid"] for e in ents}
                    race["odds"] = {"kind": "yoso", "at": od.get("at", ""),
                                    "winH": {by_key[k]: v for k, v in (od.get("win") or {}).items() if k in by_key}}
                else:
                    race["odds"] = {k: od[k] for k in ("kind", "at", "win", "place") if k in od}
                    ex = {k: od[k] for k in ("kind", "at", "waku", "quin", "wide", "exa", "trio", "tri") if k in od}
                    if len(ex) > 2:
                        save_json(os.path.join(D_OUT, "odds", rid + ".json"), ex)
                changed = True
        except Exception as e:
            log("オッズの取得失敗", r["nm"], e)
        # ── 出走馬のくわしい情報（1日1回）
        if full and race.get("entries"):
            hs = race.get("horses") or {}
            for e in race["entries"]:
                if e["cx"]:
                    continue
                try:
                    h = fetch_horse(e["hid"])
                    hs[e["hid"]] = {"prof": h.get("prof") or {}, "ped": h.get("ped") or [], "runs": (h.get("runs") or [])[:8]}
                    save_silks((h.get("prof") or {}).get("oid"))
                except Exception as ex:
                    log("出走馬の取得失敗", e["hid"], ex)
            race["horses"] = hs
            changed = True
    race["upd"] = ms(now())
    r["upd"] = race["upd"]
    save_json(race_path(rid), race)
    return changed


def write_index(idx, races):
    idx["v"] = 1
    idx["at"] = ms(now())
    idx["year"] = now().year
    idx["races"] = races
    idx["log"] = (idx.get("log") or [])[-60:] + LOG[-40:]
    save_json(os.path.join(D_OUT, "index.json"), idx)


def push(msg):
    if NO_PUSH:
        return
    try:
        subprocess.run(["git", "-C", OUT, "add", "-A"], check=False, capture_output=True)
        subprocess.run(["git", "-C", OUT, "-c", "user.name=magiscope-pc", "-c", "user.email=magiscope-pc@users.noreply.github.com", "commit", "-q", "-m", msg], check=False, capture_output=True)
        p = subprocess.run(["git", "-C", OUT, "push", "-q", "-f", "origin", "HEAD:magiscope-data"], check=False, capture_output=True)
        log("push", "ok" if p.returncode == 0 else "failed")
    except Exception as e:
        log("push 失敗", e)


def active_now(r):
    if (r.get("st") == "result" and not r.get("part")) or not r.get("rid"):   # ★★ 2026-10-26 結果が途中（速報）なら4分おきに取り直しつづける
        return False
    t = now()
    p = post_dt(r)
    return p - datetime.timedelta(minutes=75) <= t <= p + datetime.timedelta(minutes=50)


def main():
    os.makedirs(D_OUT, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)
    idx = load_json(os.path.join(D_OUT, "index.json"), {}) or {}
    known = {}
    for r in idx.get("races") or []:
        known[r["date"] + "|" + r["nm"]] = r
    try:
        sched = fetch_schedule()
    except Exception as e:
        log("日程を取れませんでした", e)
        sched = []
    races = []
    if sched:
        for g in sched:
            r = dict(known.get(g["date"] + "|" + g["nm"]) or {})
            r.update(g)
            races.append(r)
    else:
        races = list(known.values())
    races.sort(key=lambda r: (r["date"], r.get("post") or ""))
    for r in races:
        try:
            update_race(r)
        except Exception as e:
            log("取得失敗", r.get("nm"), e)
    try:
        fill_videos(races)
    except Exception as e:
        log("レース映像をさがせませんでした", e)
    write_index(idx, races)
    if LOOP:
        t_end = time.time() + 58 * 60
        while time.time() < t_end:
            act = [r for r in races if active_now(r)]
            if not act:
                break
            push("MagiDerby data (live)")
            time.sleep(240)
            for r in act:
                try:
                    update_race(r, full=False)
                except Exception as e:
                    log("取得失敗", r.get("nm"), e)
            _rss[0] = None
            try:
                fill_videos(races, max_search=0)
            except Exception as e:
                log("レース映像をさがせませんでした", e)
            write_index(idx, races)
    log("完了", len(races), "レース")


if __name__ == "__main__":
    main()

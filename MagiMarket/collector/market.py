# -*- coding: utf-8 -*-
"""
MagiMarket の自動取得（★★ 2026-11-08 新作・MagiScope の PC タスク run-pc.bat の stage「market」）
  ・キオクシア（285A.T）の株価 … Yahoo Finance の chart（1分足＝その日・5分足＝5日・日足＝1年）
  ・ジェフユナイテッド千葉の試合 … J リーグ公式のクラブページ（日程・結果・スコア・会場・キックオフ）と J1 の順位表
置き場：GitHub の magiscope-data ブランチの market/（kioxia.json・jef.json）。アプリはそれを読む（MagiMarket/js/mm-net.js）。
★ 株価はアプリが Yahoo を直接（CORS の中継）でも読む。ここは中継が使えないときの控え。
★ 鍵・トークンは使わない（公開ページを読むだけ）。

使い方:  python market.py --out <magiscope-data の作業フォルダ>   （--loop：試合の日・取引の時間は少し長く回して、そのつど push）
"""
import argparse, io, json, os, re, sys, time, datetime, urllib.request, urllib.parse

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 XEVARION-MagiMarket"
JST = datetime.timezone(datetime.timedelta(hours=9))


def get(url, timeout=25, tries=3):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.8"})
            return urllib.request.urlopen(req, timeout=timeout).read()
        except Exception as e:
            last = e
            time.sleep(1.5 * (k + 1))
    raise last


def log(*a):
    print("[market]", *a, flush=True)


# ══ キオクシア ══
SYM = "285A.T"


def chart(rng, interval):
    u = "https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=%s" % (urllib.parse.quote(SYM), rng, interval)
    j = json.loads(get(u).decode("utf-8"))
    r = j["chart"]["result"][0]
    q = r["indicators"]["quote"][0]
    ts = r.get("timestamp") or []
    bars = []
    for i, t in enumerate(ts):
        c = q["close"][i]
        if c is None:
            continue
        o = q["open"][i] if q["open"][i] is not None else c
        h = q["high"][i] if q["high"][i] is not None else c
        lo = q["low"][i] if q["low"][i] is not None else c
        v = q["volume"][i] or 0
        bars.append([int(t), round(o, 2), round(h, 2), round(lo, 2), round(c, 2), int(v)])
    return r["meta"], bars


def stock(out):
    meta, m1 = chart("5d", "1m")      # 1分足（5日ぶん）＝注文の約定に使う
    _, d1 = chart("1y", "1d")
    # 前日の終値＝1分足の「最後の日より前の日」の最後の値段（range=5d の chartPreviousClose は5日前の終値なので使わない）
    def day(t):
        return datetime.datetime.fromtimestamp(t, JST).date()
    prev = None
    last = day(m1[-1][0]) if m1 else None
    if last and d1:
        for b in reversed(d1):                 # 日足（公式の終値）で、最後の日より前の日
            if day(b[0]) < last:
                prev = b[4]
                break
    if prev is None and m1:
        for b in reversed(m1):
            if day(b[0]) < last:
                prev = b[4]
                break
    data = {
        "sym": SYM, "name": "キオクシアホールディングス", "at": int(time.time() * 1000),
        "price": meta.get("regularMarketPrice"), "time": meta.get("regularMarketTime"),
        "prev": prev,
        "hi": meta.get("regularMarketDayHigh"), "lo": meta.get("regularMarketDayLow"), "vol": meta.get("regularMarketVolume"),
        "hi52": meta.get("fiftyTwoWeekHigh"), "lo52": meta.get("fiftyTwoWeekLow"),
        "m1": m1[-1900:],   # 5日ぶんの1分足
        "d1": d1,
    }
    os.makedirs(os.path.join(out, "market"), exist_ok=True)
    io.open(os.path.join(out, "market", "kioxia.json"), "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    log("kioxia", data["price"], len(m1), "m1", len(d1), "d1")


# ══ ジェフ千葉 ══
CLUB = "chiba"


def rsc_text(html):
    """Next.js のページの self.__next_f.push([1,"…"]) をつなげて、ふつうの文字にする"""
    out = []
    for m in re.finditer(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)', html):
        try:
            out.append(json.loads('"' + m.group(1) + '"'))
        except Exception:
            pass
    return "".join(out)


def grab_array(text, key):
    """text の中の "key":[ … ] を JSON として取り出す（入れ子の [] を数える）"""
    i = text.find('"' + key + '":[')
    if i < 0:
        return None
    j = text.index("[", i)
    depth, k, ins, esc = 0, j, False, False
    while k < len(text):
        ch = text[k]
        if ins:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                ins = False
        else:
            if ch == '"':
                ins = True
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    return json.loads(text[j:k + 1])
        k += 1
    return None


def month_list(first_run):
    """取りに行く月：はじめては今シーズン（8月〜）ぜんぶ、ふだんは前の月〜2か月先"""
    now = datetime.datetime.now(JST)
    y, m = now.year, now.month
    sy = y if m >= 7 else y - 1          # 秋春制：シーズンは8月から
    out = []
    if first_run:
        yy, mm = sy, 8
    else:
        yy, mm = (y, m - 1) if m > 1 else (y - 1, 12)
    end = (y + (m + 2 - 1) // 12, (m + 2 - 1) % 12 + 1)
    while (yy, mm) <= end:
        out.append((yy, mm))
        yy, mm = (yy, mm + 1) if mm < 12 else (yy + 1, 1)
    return out


def jef_month(y, m):
    html = get("https://www.jleague.jp/club/%s/day/?year=%d&month=%d" % (CLUB, y, m)).decode("utf-8", "replace")
    sl = grab_array(rsc_text(html), "scheduleList") or []
    out = []
    for blk in sl:
        for sc in blk.get("schedules", []):
            date = str(sc.get("matchDate", "")).replace("$D", "")[:10]
            for mt in sc.get("matches", []):
                ht, at_ = mt.get("homeTeam") or {}, mt.get("awayTeam") or {}
                home = ht.get("name") == "千葉"
                me, op = (ht, at_) if home else (at_, ht)
                row = {
                    "id": mt.get("id"), "date": date, "time": mt.get("time") or "", "comp": sc.get("leagueDisplayName") or "",
                    "league": sc.get("leagueName") or "", "sec": sc.get("seasonText") or "", "home": home,
                    "opp": op.get("name") or "", "oppFull": op.get("fullName") or "", "oppColor": op.get("primaryColor") or "",
                    "stadium": mt.get("stadiumName") or "", "stadiumFull": mt.get("stadiumFullName") or "",
                    "state": mt.get("state") or "", "href": "https://www.jleague.jp" + (mt.get("detailHref") or ""),
                }
                if isinstance(me.get("score"), int) and isinstance(op.get("score"), int):
                    row["gf"], row["ga"] = me["score"], op["score"]
                if mt.get("pkScore"):
                    row["pk"] = mt.get("pkScore")
                if row["id"]:
                    out.append(row)
    return out


def jef_matches(prev):
    """前回のぶん（prev）に、取り直した月を重ねる（id で上書き）"""
    by = {m["id"]: m for m in (prev or []) if m.get("id")}
    for (y, m) in month_list(not by):
        try:
            for r in jef_month(y, m):
                by[r["id"]] = r
        except Exception as e:
            log("jef month fail", y, m, e)
    out = sorted(by.values(), key=lambda r: (r["date"], r["time"]))
    return out


def j1_table():
    """J1 の順位表（オッズの計算に使う）。取れなければ空"""
    try:
        html = get("https://www.jleague.jp/standings/j1/").decode("utf-8", "replace")
    except Exception as e:
        log("standings fail", e)
        return []
    arr = grab_array(rsc_text(html), "standingList") or []
    out = []
    for x in arr:
        c = x.get("club") or {}
        out.append({"team": c.get("shortName") or c.get("name") or "", "full": c.get("name") or "", "rank": (x.get("ranking") or {}).get("value"),
                    "pts": x.get("point"), "played": x.get("match"), "w": x.get("win"), "d": x.get("draw"), "l": x.get("loss"),
                    "gf": x.get("goalScored"), "ga": x.get("goalLost"), "gd": x.get("goalDifference"),
                    "form": "".join({"win": "W", "draw": "D", "loss": "L"}.get(g.get("state"), "-") for g in (x.get("pastGames") or []))})
    return out


def jef(out):
    prev = None
    try:
        prev = json.load(io.open(os.path.join(out, "market", "jef.json"), encoding="utf-8")).get("matches")
    except Exception:
        prev = None
    ms = jef_matches(prev)
    if not ms:
        raise RuntimeError("試合が1つも読めませんでした（ページのつくりが変わった？）")
    data = {"at": int(time.time() * 1000), "team": "千葉", "teamFull": "ジェフユナイテッド市原・千葉", "matches": ms, "table": j1_table()}
    os.makedirs(os.path.join(out, "market"), exist_ok=True)
    io.open(os.path.join(out, "market", "jef.json"), "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    done = [m for m in ms if m["state"] == "game-over"]
    log("jef", len(ms), "matches", len(done), "done", len(data["table"]), "table rows")
    return data


def kick_ms(m):
    try:
        d = [int(x) for x in m["date"].split("-")]
        hh, mm = ([int(x) for x in (m["time"] or "14:00").split(":")] + [0])[:2]
        return datetime.datetime(d[0], d[1], d[2], hh, mm, tzinfo=JST).timestamp() * 1000
    except Exception:
        return 0


def busy_now(jd):
    """取引の時間（平日 9:00〜15:30）か、試合の前後（キックオフ 20 分前〜2時間30分後）"""
    now = datetime.datetime.now(JST)
    if now.weekday() < 5 and (9, 0) <= (now.hour, now.minute) <= (15, 35):
        return True
    t = now.timestamp() * 1000
    for m in (jd or {}).get("matches", []):
        k = kick_ms(m)
        if k and k - 20 * 60000 <= t <= k + 150 * 60000 and m.get("state") != "game-over":
            return True
    return False


def push(out, msg):
    if not os.path.isdir(os.path.join(out, ".git")):
        return
    import subprocess
    subprocess.run(["git", "-C", out, "add", "-A"], capture_output=True)
    subprocess.run(["git", "-C", out, "-c", "user.name=magiscope-pc", "-c", "user.email=magiscope-pc@users.noreply.github.com", "commit", "-q", "-m", msg], capture_output=True)
    r = subprocess.run(["git", "-C", out, "push", "-q", "-f", "origin", "HEAD:magiscope-data"], capture_output=True)
    log("push", "ok" if r.returncode == 0 else "failed")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--loop", action="store_true", help="取引の時間・試合の前後は 5 分おきに取り直して push（最大 45 分）")
    a = ap.parse_args()
    jd = None
    try:
        stock(a.out)
    except Exception as e:
        log("kioxia fail", e)
    try:
        jd = jef(a.out)
    except Exception as e:
        log("jef fail", e)
    if not a.loop:
        return
    t0 = time.time()
    while time.time() - t0 < 45 * 60 and busy_now(jd):
        push(a.out, "MagiMarket data")
        time.sleep(300)
        try:
            stock(a.out)
        except Exception as e:
            log("kioxia fail", e)
        try:
            jd = jef(a.out)
        except Exception as e:
            log("jef fail", e)


if __name__ == "__main__":
    main()

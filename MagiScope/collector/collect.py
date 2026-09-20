# -*- coding: utf-8 -*-
"""
MagiScope 自動取得（2026-09-20d・鍵なし版）
------------------------------------------------------------
API キーもサーバーも使わず、各サイトの公開ページを読んでランキングを作る。
結果は JSON ファイルとして --out のフォルダに書き、GitHub の magiscope-data ブランチに置く
（アプリは raw.githubusercontent.com から読む。GitHub Actions の標準の権限だけで書ける＝鍵を作らない）。

取りに行くもの（すべて公開ページ）
  カラオケ … カラオケ DAM のランキングページ（総合・急上昇・デュエット・検索・年間・ジャンル別）
             ジャケット・発売日・ジャンル＝iTunes Search API（鍵なし）／ソロ・グループ・男女＝MusicBrainz（鍵なし）
  FANZA    … FANZA同人のランキングページ（コミック：24時間・1時間・週間・月間・累計・販売数順）と作品ページ
             ★ FANZA は日本からしか見られない → GitHub（海外）では取れないので、自分の PC で動かす（run-pc.bat）
  アニメ   … Annict の公開ページ（国内の視聴者数：今季・前季・今年・人気）＋ AniList（表紙・トレンドの記録）

使いかた
  python collect.py --out <フォルダ> [--only karaoke,anime,fanza]

書き出すファイル（<フォルダ>/…）
  lists/<key>.json … { at, d, prevD, prevIds, entries:[{ id, rank, prev, …表示に要る項目 }] }
  hist/<key>.json  … { "YYYY-MM-DD": "id,id,…" }（並びが変わった日だけ・400日分）
  index/karaoke.json ・ index/fanza.json ・ index/anime.json … 詳細・検索用
  state.json（前回の並び）・cache/*.json（補足情報の控え）・meta.json（更新時刻と記録）
"""
import json, os, re, sys, time, html, unicodedata, datetime, urllib.request, urllib.parse, http.cookiejar

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
JST = datetime.timezone(datetime.timedelta(hours=9))
NOW = datetime.datetime.now(JST)
TODAY = NOW.strftime("%Y-%m-%d")
NOW_MS = int(time.time() * 1000)
HIST_DAYS = 400
LOG = []


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a and a.index(name) + 1 < len(a) else default


OUT = arg("--out", "magiscope-data")
ONLY = set(x for x in (arg("--only", "") or "").split(",") if x)


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG.append(NOW.strftime("%H:%M ") + s)
    print(s, flush=True)


# ══════════ 通信 ══════════
_cj = http.cookiejar.CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_cj))


def http_get(url, headers=None, data=None, timeout=40, want_url=False):
    h = {"User-Agent": UA, "Accept-Language": "ja,en;q=0.5"}
    h.update(headers or {})
    body = None
    if data is not None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=h)
    with _opener.open(req, timeout=timeout) as r:
        raw = r.read()
        txt = raw.decode(r.headers.get_content_charset() or "utf-8", "replace")
        return (txt, r.geturl()) if want_url else txt


def jget(url, **kw):
    return json.loads(http_get(url, **kw))


# ══════════ ファイル ══════════
def rd(path, default):
    p = os.path.join(OUT, path)
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def wr(path, obj):
    p = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(p) or ".", exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def fname(key):
    return re.sub(r"[^\w.\-]", "_", key)


STATE = rd("state.json", {})


def record(key, ids, entries, extra=None):
    """並びを記録して、表示用の一覧（前回順位つき）を書く。前回＝前の日までの最後の並び"""
    st = STATE.setdefault(key, {})
    last, prev = st.get("last"), st.get("prev")
    sig = ",".join(ids)
    if not last or last.get("ids") != sig:
        if last and last.get("d") != TODAY:
            prev = last
            st["prev"] = prev
        last = {"d": TODAY, "ids": sig}
        st["last"] = last
        hist = rd("hist/" + fname(key) + ".json", {})
        hist[TODAY] = sig
        lim = (NOW - datetime.timedelta(days=HIST_DAYS)).strftime("%Y-%m-%d")
        hist = {d: v for d, v in hist.items() if d >= lim}
        wr("hist/" + fname(key) + ".json", hist)
    pr = {}
    if prev:
        for i, x in enumerate(prev["ids"].split(",")):
            pr[x] = i + 1
    for e in entries:
        e["prev"] = pr.get(e["id"])
    out = {"at": NOW_MS, "d": last["d"], "prevD": prev["d"] if prev else None, "prevIds": prev["ids"] if prev else None, "entries": entries}
    if extra:
        out.update(extra)
    wr("lists/" + fname(key) + ".json", out)


def norm(s):
    s = unicodedata.normalize("NFKC", str(s or "")).lower()
    return re.sub(r"[\s　・,，.。、'\"’!！?？~〜\-－_:：]", "", s)


def strip_paren(s):
    return re.sub(r"[（(\[［【].*?[）)\]］】]", "", str(s or "")).strip()


def text(s):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or ""))).strip()


# ══════════ カラオケ（DAM） ══════════
DAM = "https://www.clubdam.com"
DAM_PAGES = {
    "total": ("/ranking/", ["daily", "weekly", "monthly"]),
    "burst": ("/ranking/burst/", ["daily", "weekly", "monthly"]),
    "duet": ("/ranking/duet/", ["weekly", "monthly"]),
    "kensaku": ("/ranking/kensaku/", ["monthly"]),
    "year": ("/ranking/year.html", ["year"]),
    "anison": ("/genre/anison/", ["weekly", "monthly"]),
    "vocaloid": ("/genre/vocaloid/", ["weekly", "monthly"]),
    "foreign": ("/genre/foreign/", ["weekly", "monthly"]),
    "enka": ("/genre/enka/", ["weekly", "monthly"]),
    "vtuber": ("/genre/vtuber/", ["weekly", "monthly"]),
}


def parse_dam(src, terms):
    out = {}
    last_end = 0
    for m in re.finditer(r'<ul class="[^"]*p-ranking-list[^"]*"[^>]*>([\s\S]*?)</ul>', src):
        before = src[last_end:m.start()]
        last_end = m.start()
        ids = re.findall(r'id="[^"]*(daily|weekly|monthly|year)[^"]*"', before)
        term = ids[-1] if ids else next((t for t in terms if t not in out), terms[0])
        if term not in terms or term in out:   # 横の小さな一覧（年間TOP3 など）は読まない
            continue
        items = []
        for li in re.finditer(r'<li class="p-song-list__item[\s\S]*?</li>', m.group(1)):
            b = li.group(0)
            rn = re.search(r"requestNo=([\w-]+)", b)
            t = re.search(r'p-song__title">([\s\S]*?)</h4>', b)
            a = re.search(r'p-song__artist">([\s\S]*?)</div>', b)
            ac = re.search(r"artistCode=(\d+)", b)
            if rn and t:
                items.append({"rn": rn.group(1), "t": text(t.group(1)), "a": text(a.group(1)) if a else "", "ac": ac.group(1) if ac else ""})
        if items:
            out[term] = items
    return out


def karaoke():
    songs = rd("cache/karaoke-songs.json", {})
    artists = rd("cache/karaoke-artists.json", {})
    lists = {}
    for key, (path, terms) in DAM_PAGES.items():
        try:
            got = parse_dam(http_get(DAM + path), terms)
            for term, items in got.items():
                lists[key + "-" + term] = items
            log("DAM", key, {t: len(v) for t, v in got.items()})
        except Exception as e:
            log("DAM 取得失敗", key, e)
        time.sleep(1.0)
    if not lists:
        return False
    order = []
    for k in ["total-weekly", "total-daily", "total-monthly"] + list(lists.keys()):
        for it in lists.get(k, []):
            if it["rn"] not in order:
                order.append(it["rn"])
            s = songs.setdefault(it["rn"], {})
            s.update(t=it["t"], a=it["a"], ac=it["ac"])
    # iTunes（1分に20回まで → 3.2秒おき）
    budget = int(os.environ.get("MS_ITUNES_BUDGET", "60"))
    for rn in order:
        if budget <= 0:
            break
        s = songs[rn]
        if "img" in s or s.get("noart"):
            continue
        budget -= 1
        try:
            j = jget("https://itunes.apple.com/search?country=JP&lang=ja_jp&entity=song&limit=8&term=" + urllib.parse.quote(strip_paren(s["t"]) + " " + strip_paren(s["a"])))
            nt, na = norm(strip_paren(s["t"])), norm(strip_paren(s["a"]))
            res = j.get("results", [])
            best = next((x for x in res if norm(x.get("trackName")).startswith(nt) and na[:4] in norm(x.get("artistName"))), None) \
                or next((x for x in res if norm(x.get("trackName")).startswith(nt)), None)
            if best:
                s.update(img=str(best.get("artworkUrl100", "")).replace("100x100bb", "600x600bb"), rel=str(best.get("releaseDate", ""))[:10],
                         g=best.get("primaryGenreName", ""), url=best.get("trackViewUrl", ""), al=best.get("collectionName", ""))
            else:
                s["noart"] = 1
        except Exception as e:
            log("iTunes 失敗", rn, e)
            if "403" in str(e) or "429" in str(e):
                break
        time.sleep(3.2)
    # MusicBrainz（1秒に1回まで）
    budget = int(os.environ.get("MS_MB_BUDGET", "40"))
    for rn in order:
        if budget <= 0:
            break
        ac = songs[rn].get("ac")
        if not ac or ac in artists:
            continue
        budget -= 1
        try:
            name = re.split(r"[×x&＆,、]| feat\.| with ", strip_paren(songs[rn]["a"]), flags=re.I)[0].strip()
            j = jget("https://musicbrainz.org/ws/2/artist/?fmt=json&limit=5&query=" + urllib.parse.quote('artist:"%s"' % name),
                     headers={"User-Agent": "MagiScope/1.0 (XEVARION entertainment ranking)", "Accept": "application/json"})
            cand = sorted([x for x in j.get("artists", []) if (x.get("score") or 0) >= 90], key=lambda x: x.get("country") != "JP")
            a = cand[0] if cand else None
            artists[ac] = {"type": a.get("type", ""), "gender": a.get("gender", "")} if a else {"none": 1}
        except Exception as e:
            log("MusicBrainz 失敗", ac, e)
            if "503" in str(e):
                break
        time.sleep(1.1)
    wr("cache/karaoke-songs.json", songs)
    wr("cache/karaoke-artists.json", artists)

    def view(rn):
        s = songs.get(rn, {})
        ar = artists.get(s.get("ac", ""), {})
        return {"id": rn, "title": s.get("t", ""), "artist": s.get("a", ""), "ac": s.get("ac", ""), "image": s.get("img") or None,
                "releaseDate": s.get("rel", ""), "genre": s.get("g", ""), "album": s.get("al", ""), "appleUrl": s.get("url", ""),
                "unit": {"Group": "グループ", "Person": "ソロ"}.get(ar.get("type"), ""),
                "vocal": {"male": "男性", "female": "女性"}.get(ar.get("gender"), "")}
    for k, items in lists.items():
        ids = [it["rn"] for it in items]
        ents = [dict(view(rn), rank=i + 1) for i, rn in enumerate(ids)]
        record("karaoke_" + k, ids, ents, {"source": DAM + DAM_PAGES[k.split("-")[0]][0]})
    wr("index/karaoke.json", [view(rn) for rn in songs])
    return True


# ══════════ FANZA同人（公開ページ） ══════════
FZ = "https://www.dmm.co.jp/dc/doujin/-/ranking-all/=/submedia=comic/"
FZ_LISTS = {
    "overall": "sort=popular/term=h24/",     # 総合＝24時間
    "rising":  "sort=popular/term=per_hour/", # 急上昇＝1時間
    "week":    "sort=popular/term=weekly/",
    "month":   "sort=popular/term=monthly/",
    "alltime": "sort=popular/term=total/",   # 累計
    "popular": "sort=sales/term=weekly/",    # 販売数順（週間）
}


def fz_get(url):
    txt, final = http_get(url, headers={"Cookie": "age_check_done=1"}, want_url=True)
    if "age_check" in final or "not-available" in final or "error/area" in final or "お住まいの地域" in txt[:20000]:
        raise RuntimeError("FANZA に入れません（海外からの取得・年齢確認）: " + final)
    return txt


def parse_fz_rank(src):
    items = []
    for b in re.split(r'<li class="rank-rankListItem fn', src)[1:]:
        cid = re.search(r"/detail/=/cid=([\w]+)/", b)
        name = re.search(r'rank-name">([\s\S]*?)</b>', b)
        if not cid or not name:
            continue
        circle = re.search(r'rank-circle">([\s\S]*?)</p>', b)
        mk = re.search(r"article=maker/id=(\d+)", b)
        img = re.search(r'<img src="(https://doujin-assets[^"]*?(?:pl|ps|pt)\.jpg)"', b)
        rv = re.search(r'ico_review-\d+\.png" alt="([\d.]+)/5"', b)
        rc = re.search(r'rank-review">[\s\S]*?\((\d[\d,]*)件\)', b)
        sales = re.search(r"販売数\s*:\s*([\d,]+)", b)
        fav = re.search(r"お気に入り登録数：([\d,]+)", b)
        pc = re.search(r'rank-priceContent">([\s\S]*?)</div>', b)
        price = re.findall(r"([\d,]+)円", text(pc.group(1))) if pc else []
        items.append({"id": cid.group(1), "title": text(name.group(1)), "circle": text(circle.group(1)) if circle else "", "circleId": mk.group(1) if mk else "",
                      "image": img.group(1) if img else None, "rating": (float(rv.group(1)) or None) if rv else None, "votes": int(rc.group(1).replace(",", "")) if rc else 0,
                      "sales": int(sales.group(1).replace(",", "")) if sales else None, "favs": int(fav.group(1).replace(",", "")) if fav else None,
                      "price": price[-1] if price else "", "isNew": 'class="rank-new"' in b,
                      "url": "https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=%s/" % cid.group(1)})
    return items


def parse_fz_detail(src):
    info = {}
    for m in re.finditer(r'informationList__ttl">([\s\S]*?)</dt>\s*<dd class="informationList__(?:txt|item)">([\s\S]*?)</dd>', src):
        info[text(m.group(1))] = m.group(2)
    genres = []
    for a in re.findall(r"<a[^>]*>([\s\S]*?)</a>", info.get("ジャンル", "")):
        t = text(a)
        if t and t != "一覧へ" and t not in genres:
            genres.append(t)
    series = info.get("シリーズ", "")
    sid = re.search(r"article=series/id=(\d+)", series)
    return {"releaseDate": text(info.get("配信開始日", ""))[:10].replace("/", "-"), "author": text(info.get("作者", "")) or text(info.get("作家", "")),
            "kind": text(info.get("作品形式", "")), "volume": text(info.get("ページ数", "")), "theme": text(info.get("題材", "")),
            "genres": genres, "series": text(series) if sid else "", "seriesId": sid.group(1) if sid else ""}


def fanza():
    detail = rd("cache/fanza-detail.json", {})
    lists = {}
    for k, path in FZ_LISTS.items():
        items = []
        try:
            for page in range(1, 6):     # 1ページ20件 × 5 ＝ 1〜100位
                items += parse_fz_rank(fz_get(FZ + path + ("" if page == 1 else "page=%d/" % page)))
                time.sleep(1.2)
            lists[k] = items
            log("FANZA", k, len(items))
        except Exception as e:
            log("FANZA 取得失敗", k, e)
            if "入れません" in str(e):
                return False
    if not lists:
        return False
    # 作品ページ：ジャンル・配信日・作者・シリーズ（まだ読んでいない作品から少しずつ）
    budget = int(os.environ.get("MS_FZ_DETAIL_BUDGET", "80"))
    seen = []
    for k in ["overall", "week", "rising", "month", "popular", "alltime"]:
        for it in lists.get(k, []):
            if it["id"] not in seen:
                seen.append(it["id"])
    for cid in seen:
        if budget <= 0:
            break
        if cid in detail:
            continue
        budget -= 1
        try:
            detail[cid] = parse_fz_detail(fz_get("https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=%s/" % cid))
        except Exception as e:
            log("FANZA 作品ページ失敗", cid, e)
        time.sleep(1.2)
    wr("cache/fanza-detail.json", detail)
    index = {x["id"]: x for x in rd("index/fanza.json", []) if isinstance(x, dict)}
    for k, items in lists.items():
        ents = []
        for i, it in enumerate(items):
            v = dict(it, **detail.get(it["id"], {}))
            v["rank"] = i + 1
            ents.append(v)
            index[v["id"]] = v
        record("fanza_" + k, [e["id"] for e in ents], ents, {"source": FZ + FZ_LISTS[k]})
    # 新刊＝24時間・週間ランキングのうち配信30日以内（「新作」の印か配信日で判定）
    lim = (NOW - datetime.timedelta(days=30)).strftime("%Y-%m-%d")
    new, ids = [], []
    for it in lists.get("overall", []) + lists.get("week", []):
        v = dict(it, **detail.get(it["id"], {}))
        if v["id"] in ids:
            continue
        if v.get("isNew") or (v.get("releaseDate") or "") >= lim:
            ids.append(v["id"])
            new.append(dict(v, rank=len(ids)))
    record("fanza_new", ids, new, {"source": FZ + FZ_LISTS["overall"]})
    wr("index/fanza.json", list(index.values())[-3000:])
    return True


# ══════════ アニメ（Annict の公開ページ ＋ AniList） ══════════
ANILIST = "https://graphql.anilist.co"
AL_FIELDS = "id idMal title{native romaji} coverImage{extraLarge large} bannerImage genres season seasonYear format status episodes averageScore popularity siteUrl"
GENRE_JA = {"Action": "アクション", "Adventure": "アドベンチャー", "Comedy": "コメディ", "Drama": "ドラマ", "Ecchi": "お色気", "Fantasy": "ファンタジー",
            "Horror": "ホラー", "Mahou Shoujo": "魔法少女", "Mecha": "ロボット", "Music": "音楽", "Mystery": "ミステリー", "Psychological": "サイコ",
            "Romance": "恋愛", "Sci-Fi": "SF", "Slice of Life": "日常", "Sports": "スポーツ", "Supernatural": "超常", "Thriller": "サスペンス"}


def anilist(query, variables):
    for _ in range(3):
        try:
            j = jget(ANILIST, data={"query": query, "variables": variables}, headers={"Accept": "application/json"})
            if j.get("data"):
                return j["data"]
            raise RuntimeError(j.get("errors"))
        except Exception as e:
            if "429" in str(e):
                time.sleep(30)
                continue
            raise
    raise RuntimeError("AniList 混雑")


def parse_annict_list(src):
    out = []
    for c in re.split(r'<div class="c-work-card ', src)[1:]:
        wid = re.search(r'href="/works/(\d+)"', c)
        t = re.search(r'c-work-card__work-title[\s\S]*?title="([^"]+)"', c)
        img = re.search(r'srcset="([^" ]+@jpg) 1x, ([^" ]+@jpg) 2x"', c)
        if wid and t:
            out.append({"annictId": wid.group(1), "title": html.unescape(t.group(1)), "image": (img.group(2) if img else None)})
    return out


def season_slug(y, i):
    return "%d-%s" % (y, ["winter", "spring", "summer", "autumn"][i])


def anime():
    ok = False
    # AniList の一覧の記録（アプリの前回順位・3か月/1年の推移用）
    y, si = NOW.year, (NOW.month - 1) // 3
    al_jobs = {"overall": ({"sort": ["TRENDING_DESC"]}, 2), "season": ({"sort": ["POPULARITY_DESC"], "season": ["WINTER", "SPRING", "SUMMER", "FALL"][si], "year": y}, 1),
               "year": ({"sort": ["POPULARITY_DESC"], "year": y}, 1), "alltime": ({"sort": ["POPULARITY_DESC"]}, 1),
               "popular": ({"sort": ["POPULARITY_DESC"], "status": "RELEASING"}, 1), "rating": ({"sort": ["SCORE_DESC"], "minPop": 10000}, 1)}
    q = 'query($p:Int,$sort:[MediaSort],$season:MediaSeason,$year:Int,$status:MediaStatus,$minPop:Int){Page(page:$p,perPage:50){media(type:ANIME,countryOfOrigin:"JP",isAdult:false,sort:$sort,season:$season,seasonYear:$year,status:$status,popularity_greater:$minPop){id}}}'
    for k, (v, pages) in al_jobs.items():
        try:
            ids = []
            for p in range(1, pages + 1):
                ids += [str(m["id"]) for m in anilist(q, dict(v, p=p))["Page"]["media"]]
            record("anime_" + k, ids, [{"id": x, "rank": i + 1} for i, x in enumerate(ids)])
            ok = True
        except Exception as e:
            log("AniList 失敗", k, e)
        time.sleep(2.1)

    # 国内（Annict）：季節のページは視聴者の多い順に並んでいる
    py, psi = (y, si - 1) if si else (y - 1, 3)
    jobs = {"season": "/works/" + season_slug(y, si), "prevseason": "/works/" + season_slug(py, psi), "year": "/works/%d-all" % y, "all": "/works/popular"}
    amap = rd("cache/anime-map.json", {})        # annictId → AniList の作品（無ければ {"none":1}）
    watch = rd("cache/annict-watchers.json", {})  # annictId → { n, d, season, media }
    lists = {}
    for k, path in jobs.items():
        try:
            works = []
            for page in (1, 2):
                works += parse_annict_list(http_get("https://annict.com" + path + ("" if page == 1 else "?page=%d" % page)))
                time.sleep(1.0)
            lists[k] = works[:60]
            log("Annict", k, len(works))
        except Exception as e:
            log("Annict 失敗", k, e)
    if not lists:
        return ok
    uniq = []
    for k in ["season", "prevseason", "year", "all"]:
        for w in lists.get(k, []):
            if w["annictId"] not in uniq:
                uniq.append(w["annictId"])
    titles = {w["annictId"]: w for k in lists for w in lists[k]}
    # 作品ページ：視聴者数・放送時期・媒体（1日1回だけ読み直す）
    budget = int(os.environ.get("MS_ANNICT_BUDGET", "90"))
    for aid in uniq:
        if budget <= 0:
            break
        if (watch.get(aid) or {}).get("d") == TODAY:
            continue
        budget -= 1
        try:
            src = http_get("https://annict.com/works/" + aid)
            t = text(re.sub(r"<script[\s\S]*?</script>", " ", src))
            n = re.search(r"視聴者数:\s*([\d,]+)", t)
            meta = re.search(r"(TV|映画|OVA|Web|その他)\s+(\d{4}年(?:春|夏|秋|冬)?)", t)
            off = re.search(r'href="(https?://[^"]+)"[^>]*>\s*公式サイト', src)
            watch[aid] = {"n": int(n.group(1).replace(",", "")) if n else 0, "d": TODAY, "media": meta.group(1) if meta else "",
                          "season": meta.group(2) if meta else "", "official": off.group(1) if off else ""}
        except Exception as e:
            log("Annict 作品ページ失敗", aid, e)
        time.sleep(1.0)
    wr("cache/annict-watchers.json", watch)
    # AniList と結びつける（題名で検索・一度だけ）
    budget = int(os.environ.get("MS_MAP_BUDGET", "70"))
    for aid in uniq:
        if budget <= 0:
            break
        if aid in amap:
            continue
        budget -= 1
        title = titles[aid]["title"]
        try:
            d = anilist('query($s:String){Page(perPage:6){media(type:ANIME,search:$s){%s}}}' % AL_FIELDS, {"s": title})
            cand = d["Page"]["media"]
            nt = norm(title)
            best = next((m for m in cand if norm((m.get("title") or {}).get("native")) == nt), None) \
                or next((m for m in cand if nt and norm((m.get("title") or {}).get("native")).startswith(nt[:10])), None)
            amap[aid] = {k2: best.get(k2) for k2 in ("id", "coverImage", "bannerImage", "genres", "format", "status", "siteUrl")} if best else {"none": 1}
        except Exception as e:
            log("AniList 対応づけ失敗", title, e)
            if "混雑" in str(e):
                break
        time.sleep(2.1)
    wr("cache/anime-map.json", amap)
    index = {}
    for k, works in lists.items():
        ents, ids = [], []
        for w in works:
            aid = w["annictId"]
            m = amap.get(aid) or {}
            m = {} if m.get("none") else m
            wa = watch.get(aid) or {}
            wid = str(m["id"]) if m.get("id") else "an" + aid
            if wid in ids:
                continue
            e = {"id": wid, "rank": len(ids) + 1, "title": w["title"], "watchers": wa.get("n", 0), "seasonText": wa.get("season", ""),
                 "media": wa.get("media", ""), "annictId": aid, "annictUrl": "https://annict.com/works/" + aid, "official": wa.get("official", ""),
                 "image": ((m.get("coverImage") or {}).get("extraLarge")) or w.get("image"), "banner": m.get("bannerImage") or None,
                 "genres": [GENRE_JA.get(g, g) for g in (m.get("genres") or [])], "format": m.get("format") or "", "status": m.get("status") or "",
                 "anilist": bool(m.get("id"))}
            ids.append(wid)
            ents.append(e)
            index[wid] = e
        record("anime_jp-" + k, ids, ents, {"source": "https://annict.com" + jobs[k]})
        ok = True
    old = {x["id"]: x for x in rd("index/anime.json", []) if isinstance(x, dict)}
    old.update(index)
    wr("index/anime.json", list(old.values())[-2000:])
    return ok


# ══════════ 本体 ══════════
def main():
    os.makedirs(OUT, exist_ok=True)
    meta = rd("meta.json", {})
    res = {}
    for name, fn in (("karaoke", karaoke), ("anime", anime), ("fanza", fanza)):
        if ONLY and name not in ONLY:
            continue
        try:
            res[name] = fn()
        except Exception as e:
            log(name, "失敗", e)
            res[name] = False
        if res[name]:
            meta[name + "At"] = NOW_MS
    meta["at"] = NOW_MS
    meta["log"] = ((meta.get("log") or []) + LOG)[-80:]
    wr("state.json", STATE)
    wr("meta.json", meta)
    log("完了", res)
    if res and not any(res.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""
MagiScope 自動取得（2026-09-21・鍵なし版 v2）
------------------------------------------------------------
API キーもサーバーも使わず、各サイトの公開ページを読んでランキングを作る。
結果は JSON ファイルとして --out のフォルダに書き、GitHub の magiscope-data ブランチに置く。

取りに行くもの（すべて公開ページ・鍵なし）
  カラオケ … カラオケ DAM のランキング（総合・急上昇・デュエット・検索・年間・ジャンル別）
             ジャケット/発売日/ジャンル＝iTunes ／ ソロ・グループ・男女＝MusicBrainz
  アニメ   … Annict（国内の視聴者数ランキング・声優・監督・制作会社）
             ＋ Filmarks（国内の評価・あらすじ・レビュー・話題のアニメ）＋ AniList（表紙・トレンドの記録）
  FANZA    … FANZA同人 コミックのランキングと作品ページ（ジャンル・作者・サンプル・レビュー）
  DLsite   … DLsite 同人 マンガのランキングと一覧（ジャンル・サークル・サンプル・評価）
  映画     … 映画.com の国内・全米ランキング（作品ページ）＋ Box Office Mojo（国内の興行収入）
  特集     … DMM TV の「ご褒美版」などの特別版アニメ＋DMM TV のアニメランキング（公開データ）
  ★ FANZA は日本からしか見られない → PC で動かす（run-pc.bat / register-task.bat）

使いかた
  python collect.py --out <フォルダ> [--only karaoke,music,anime,fanza,dlsite,danime,fbooks,fvideo,movie,special]
"""
import json, os, re, sys, time, html, unicodedata, datetime, urllib.request, urllib.parse, http.cookiejar, zlib

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
JST = datetime.timezone(datetime.timedelta(hours=9))
NOW = datetime.datetime.now(JST)
TODAY = NOW.strftime("%Y-%m-%d")
NOW_MS = int(time.time() * 1000)
T0 = time.time()
HIST_DAYS = 400
LOG = []


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a and a.index(name) + 1 < len(a) else default


OUT = arg("--out", "magiscope-data")
ONLY = set(x for x in (arg("--only", "") or "").split(",") if x)
# ★★ 2026-09-21c ご指定「圏外のデータをもっと」。
#    ランキングの外の作品は、一覧ページの2ページ目から先を読んで index にためる。
#    （ランキングそのものは1ページ目だけ。順位は付けない）
FZ_PAGES = int(arg("--fz-pages", "25"))         # FANZA同人 コミック（圏外ぶんの一覧ページ・1ページ120件）
FZ_RANK_PAGES = int(arg("--fz-rank-pages", "20"))  # ★ FANZA同人のランキングは20ページ（約380位）まである
FZ_ANIME_PAGES = int(arg("--fz-anime-pages", "12"))
DL_PAGES = int(arg("--dl-pages", "10"))         # DLsite 同人マンガ
INDEX_MAX = int(arg("--index-max", "20000"))    # 1カテゴリーにためる上限
MONO_PAGES = int(arg("--mono-pages", "5"))      # FANZA 通販ランキング（1ページ20件・最大5＝100位）
def budget(name, dflt):
    return int(os.environ.get("MS_" + name + "_BUDGET", str(dflt)))


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
        txt = r.read().decode(r.headers.get_content_charset() or "utf-8", "replace")
        return (txt, r.geturl()) if want_url else txt


def jget(url, **kw):
    return json.loads(http_get(url, **kw))


# ══════════ ファイル ══════════
def rd(path, default):
    try:
        with open(os.path.join(OUT, path), encoding="utf-8") as f:
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
        wr("hist/" + fname(key) + ".json", {d: v for d, v in hist.items() if d >= lim})
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


def price_of(block, after=None):
    """★★ 2026-09-21e 値段は「いまの値段（安いほう）」「元の値段（高いほう）」「何％引き」の3つに分ける。
       FANZA は「15%OFF サークル設定価格 880円 748円 880円」のように両方が並ぶので、
       前は最後の 880円（＝元の値段）を拾っていた。安いほうが本当の値段。"""
    if after:
        i = block.find(after)
        block = block[i:i + 5000] if i >= 0 else ""   # ★ 空白がとても多いので広めに（1件ぶんの中だけ）
    t = re.sub(r"<[^>]+>", " ", block)
    ps = [int(x.replace(",", "")) for x in re.findall(r"([\d,]{2,})\s*円", t) if x.replace(",", "").isdigit()]
    off = re.search(r"(\d{1,2})\s*%\s*OFF", t, re.I)
    if not ps:
        return {"price": "", "listPrice": None, "off": int(off.group(1)) if off else 0}
    cur, hi = min(ps), max(ps)
    o = int(off.group(1)) if off else (round((hi - cur) * 100 / hi) if hi > cur else 0)
    return {"price": "{:,}".format(cur), "priceN": cur, "listPrice": hi if hi > cur else None, "off": o}


def norm(s):
    s = unicodedata.normalize("NFKC", str(s or "")).lower()
    return re.sub(r"[\s　・,，.。、'\"’!！?？~〜\-－_:：]", "", s)


def strip_paren(s):
    return re.sub(r"[（(\[［【].*?[）)\]］】]", "", str(s or "")).strip()


def text(s):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or ""))).strip()


def num(s):
    return int(str(s).replace(",", "")) if s else 0


# ══════════ iTunes（ジャケット・発売日・ジャンル。鍵はいらない） ══════════
ITUNES_TRY = 3          # 見つからなかった曲を何回までさがし直すか
IT = "https://itunes.apple.com"


def it_view(x):
    """iTunes の1件を、MagiScope が使う形にする"""
    return {"img": str(x.get("artworkUrl100", "")).replace("100x100bb", "600x600bb"),
            "rel": str(x.get("releaseDate", ""))[:10], "g": x.get("primaryGenreName", ""),
            "url": x.get("trackViewUrl", ""), "al": x.get("collectionName", ""),
            "aid": str(x.get("artistId", "")), "tid": str(x.get("trackId", "")), "ms": x.get("trackTimeMillis") or 0}


def mmss(ms):
    """ミリ秒 → 「3:45」"""
    try:
        sec = int(round(int(ms) / 1000))
    except Exception:
        return ""
    return "%d:%02d" % (sec // 60, sec % 60) if sec > 0 else ""


def it_lengths(songs, budget_name, dflt):
    """★★ 2026-09-22 ご指定「長さも記載」。曲の長さが無い曲を、iTunes の lookup でまとめて埋める（1回で150曲）。
       trackId は控え（tid）か、Apple Music のリンク（…?i=数字）から取る。"""
    need = {}
    for k, so in songs.items():
        if so.get("ms"):
            continue
        tid = so.get("tid") or ""
        if not tid:
            m = re.search(r"[?&]i=(\d+)", so.get("url") or "")
            tid = m.group(1) if m else ""
        if tid:
            need[tid] = k
    ids = list(need)
    b = budget(budget_name, dflt)
    for i in range(0, len(ids), 150):
        if b <= 0:
            break
        b -= 1
        try:
            j = jget(IT + "/lookup?country=JP&id=" + ",".join(ids[i:i + 150]))
        except Exception as e:
            log("iTunes 長さ 失敗", e)
            break
        for x in j.get("results", []):
            k = need.get(str(x.get("trackId")))
            if k and x.get("trackTimeMillis"):
                songs[k]["ms"] = x["trackTimeMillis"]
        time.sleep(3.2)


# ★★ さがした結果は1か所にためる。カラオケの曲と音楽ランキングの曲はかなり重なるので、
#    ここを共有すると、同じ曲を2回 iTunes に聞かずにすむ（＝ジャケットが早くそろう）。
#    ためるのは「絵の在りか」だけで、ランキングそのものは混ぜない。
_IT_CACHE = None


def it_cache():
    global _IT_CACHE
    if _IT_CACHE is None:
        _IT_CACHE = rd("cache/itunes-lookup.json", {})
    return _IT_CACHE


def it_cache_save():
    if _IT_CACHE is not None:
        wr("cache/itunes-lookup.json", _IT_CACHE)


def itunes_song(title, artist):
    """曲名＋アーティストでジャケットをさがす。
       ★ 見つからない原因はたいてい「曲名に（）の但し書きが付いている」ことなので、
         ①曲名＋アーティスト ②曲名だけ ③()を外した曲名＋アーティスト の3通りで試す。
       返り値 … 見つかった:辞書 ／ 見つからない:{} ／ 叩きすぎ:None"""
    nt, na = norm(strip_paren(title)), norm(strip_paren(artist))
    ck = nt + "|" + na
    cache = it_cache()
    if ck in cache:
        return cache[ck] or {}
    tries = [strip_paren(title) + " " + strip_paren(artist), title + " " + artist, strip_paren(title)]
    for q in tries:
        try:
            j = jget(IT + "/search?country=JP&lang=ja_jp&entity=song&limit=12&term=" + urllib.parse.quote(q))
        except Exception as e:
            if "403" in str(e) or "429" in str(e):
                return None
            log("iTunes 失敗", q[:30], e)
            return {}
        res = j.get("results", [])
        best = next((x for x in res if norm(x.get("trackName")).startswith(nt) and na[:4] and na[:4] in norm(x.get("artistName"))), None) \
            or next((x for x in res if nt and nt in norm(x.get("trackName")) and na[:4] and na[:4] in norm(x.get("artistName"))), None) \
            or next((x for x in res if norm(x.get("trackName")).startswith(nt)), None)
        if best:
            cache[ck] = it_view(best)
            return cache[ck]
        time.sleep(3.2)
    return {}


def itunes_artist_songs(artist_id, limit=60):
    """そのアーティストの曲をまとめて取る（ランキング圏外の曲を出すため）"""
    try:
        j = jget(IT + "/lookup?country=JP&lang=ja_jp&id=%s&entity=song&limit=%d" % (artist_id, limit))
    except Exception as e:
        if "403" in str(e) or "429" in str(e):
            return None
        return []
    return [x for x in j.get("results", []) if x.get("wrapperType") == "track" and x.get("kind") == "song"]


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
    out, last_end = {}, 0
    for m in re.finditer(r'<ul class="[^"]*p-ranking-list[^"]*"[^>]*>([\s\S]*?)</ul>', src):
        before = src[last_end:m.start()]
        last_end = m.start()
        ids = re.findall(r'id="[^"]*(daily|weekly|monthly|year)[^"]*"', before)
        term = ids[-1] if ids else next((t for t in terms if t not in out), terms[0])
        if term not in terms or term in out:
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
            songs.setdefault(it["rn"], {}).update(t=it["t"], a=it["a"], ac=it["ac"])
    b = budget("ITUNES", 110)
    for rn in order:
        if b <= 0:
            break
        so = songs[rn]
        if so.get("img") or so.get("noart", 0) >= ITUNES_TRY:
            continue
        b -= 1
        got = itunes_song(so["t"], so["a"])
        if got is None:
            break                                   # 403/429＝叩きすぎ。次回に回す
        if got:
            so.update({k: v for k, v in got.items() if k in ("img", "rel", "g", "url", "al", "tid", "ms")})
            so["itArtist"] = got.get("aid", "")
            so.pop("noart", None)
        else:
            so["noart"] = so.get("noart", 0) + 1     # ★ 一度で決めつけない（次の回にもう一度さがす）
        time.sleep(3.2)
    # ★★ MusicBrainz（ソロ／グループ・男女）は混んでいると 503 を返す。
    #    これは壊れているのではなく「いまは順番待ち」なので、失敗あつかいにしない。
    #    3回だけ間をあけて試し、それでもだめなら何も言わずに次の回へ回す。
    b = budget("MB", 40)
    mb_busy = 0
    for rn in order:
        if b <= 0 or mb_busy:
            break
        ac = songs[rn].get("ac")
        if not ac or ac in artists:
            continue
        b -= 1
        name = re.split(r"[×x&＆,、]| feat\.| with ", strip_paren(songs[rn]["a"]), flags=re.I)[0].strip()
        for attempt in range(3):
            try:
                j = jget("https://musicbrainz.org/ws/2/artist/?fmt=json&limit=5&query=" + urllib.parse.quote('artist:"%s"' % name),
                         headers={"User-Agent": "MagiScope/1.0 (XEVARION entertainment ranking)", "Accept": "application/json"})
                cand = sorted([x for x in j.get("artists", []) if (x.get("score") or 0) >= 90], key=lambda x: x.get("country") != "JP")
                a = cand[0] if cand else None
                artists[ac] = {"type": a.get("type", ""), "gender": a.get("gender", "")} if a else {"none": 1}
                break
            except Exception as e:
                if "503" in str(e) or "429" in str(e):
                    if attempt == 2:
                        mb_busy = 1                  # きょうは混んでいる。次の回にまわす
                        break
                    time.sleep(3.0 * (attempt + 1))
                    continue
                artists[ac] = {"none": 1}            # 名前が見つからないだけ。もう聞かない
                break
        time.sleep(1.3)
    if mb_busy:
        log("MusicBrainz は混んでいたので次回に回します")
    it_lengths(songs, "KARA_LEN", 3)
    wr("cache/karaoke-songs.json", songs)
    wr("cache/karaoke-artists.json", artists)

    def view(rn):
        s = songs.get(rn, {})
        ar = artists.get(s.get("ac", ""), {})
        return {"id": rn, "title": s.get("t", ""), "artist": s.get("a", ""), "ac": s.get("ac", ""), "image": s.get("img") or None,
                "releaseDate": s.get("rel", ""), "genre": s.get("g", ""), "album": s.get("al", ""), "appleUrl": s.get("url", ""),
                "length": mmss(s.get("ms")),
                "unit": {"Group": "グループ", "Person": "ソロ"}.get(ar.get("type"), ""),
                "vocal": {"male": "男性", "female": "女性"}.get(ar.get("gender"), "")}
    for k, items in lists.items():
        ids = [it["rn"] for it in items]
        record("karaoke_" + k, ids, [dict(view(rn), rank=i + 1) for i, rn in enumerate(ids)], {"source": DAM + DAM_PAGES[k.split("-")[0]][0]})
    wr("index/karaoke.json", [view(rn) for rn in songs])
    return True


# ══════════ FANZA同人（公開ページ） ══════════
FZ = "https://www.dmm.co.jp/dc/doujin/-/ranking-all/=/submedia=comic/"
FZ_COMIC_LIST = "https://www.dmm.co.jp/dc/doujin/-/list/=/media=comic/sort=ranking/"
FZ_LISTS = {
    "overall": "sort=popular/term=h24/",
    "rising": "sort=popular/term=per_hour/",
    "week": "sort=popular/term=weekly/",
    "month": "sort=popular/term=monthly/",
    "alltime": "sort=popular/term=total/",
    "popular": "sort=sales/term=weekly/",
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
        pr = price_of(b, "rank-priceContent")
        items.append({"id": cid.group(1), "title": text(name.group(1)), "circle": text(circle.group(1)) if circle else "", "circleId": mk.group(1) if mk else "",
                      "image": img.group(1) if img else None, "rating": (float(rv.group(1)) or None) if rv else None, "votes": num(rc.group(1)) if rc else 0,
                      "sales": num(sales.group(1)) if sales else None, "favs": num(fav.group(1)) if fav else None,
                      "price": pr["price"], "priceN": pr.get("priceN"), "listPrice": pr["listPrice"], "off": pr["off"],
                      "isNew": 'class="rank-new"' in b,
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
    au = re.search(r"article=(?:creator|author)/id=([\w-]+)", info.get("作者", "") + info.get("作家", ""))
    # サンプル画像（作品ページの大きい画像）
    samples = []
    for u in re.findall(r'(https://doujin-assets\.dmm\.co\.jp/[^"\']+?jp-\d+\.jpg)', src):
        if u not in samples:
            samples.append(u)
    # ★★ 2026-09-21f レビュー：作品ページにそのまま10件入っている（dcd-review__unit）。
    #    星（dcd-review-rating-50＝★5）・見出し・本文・書いた人・日付をとる。前の正規表現は1件も当たっていなかった。
    reviews, reviewers = [], []
    for b in re.split(r'<li class="dcd-review__unit"', src)[1:11]:
        st = re.search(r"dcd-review-rating-(\d+)", b)
        tt = re.search(r'dcd-review__unit__title">([\s\S]*?)</span>', b)
        cms = re.findall(r'<div class="dcd-review__unit__comment(?! fn-dcd-review__unit__caution)[^"]*">([\s\S]*?)</div>', b)
        by = re.search(r'reviewer/list/(\w+)">([\s\S]*?)<span>', b)
        dt = re.search(r'postdate">-?(\d{4}-\d{2}-\d{2})', b)
        body = text(" ".join(cms))
        if not body and not tt:
            continue
        reviews.append({"star": int(st.group(1)) / 10 if st else None, "title": text(tt.group(1)) if tt else "",
                        "t": body[:600], "by": text(by.group(2)) if by else "", "date": dt.group(1) if dt else "",
                        "spoiler": "dcd-review__unit__spoiler" in b})
        if by and by.group(1) not in reviewers:
            reviewers.append(by.group(1))
    # ★★ 2026-09-21d ご指定「同人アニメ系は原作があれば表示」。
    #    FANZA の作品ページには「原作」という欄があることもあれば、
    #    二次創作のもとになった作品が「題材」に書いてあることもある。両方を拾う。
    #    「オリジナル」は原作ではないので、原作としては出さない。
    theme = text(info.get("題材", ""))
    origin = text(info.get("原作", "")) or text(info.get("原作者", ""))
    if not origin and theme and "オリジナル" not in theme:
        origin = theme
    return {"releaseDate": text(info.get("配信開始日", ""))[:10].replace("/", "-"), "author": text(info.get("作者", "")) or text(info.get("作家", "")),
            "authorId": au.group(1) if au else "", "kind": text(info.get("作品形式", "")), "volume": text(info.get("ページ数", "")) or text(info.get("動画本数", "")),
            "size": text(info.get("ファイル容量", "")), "illust": text(info.get("イラスト", "")),
            "length": text(info.get("収録時間", "")) or text(info.get("再生時間", "")),
            "theme": theme, "origin": origin, "voice": text(info.get("声優", "")), "scenario": text(info.get("シナリオ", "")),
            "genres": genres, "series": text(series) if sid else "", "seriesId": sid.group(1) if sid else "",
            "samples": samples[:30], "reviews": reviews, "reviewers": reviewers[:10], "dv": 3}


# ★★ 2026-09-21c 同人アニメは FANZA から取る（ご指定）。
#    FANZA同人の「ランキング」には動画の区分が無いので、
#    <b>キーワード「動画」(id=156004) の一覧を sort= で並べ替えたもの</b>をランキングとして使う。
#    1ページ120件・115ページあるので、圏外の作品もたくさん取れる。
FZ_LIST_URL = "https://www.dmm.co.jp/dc/doujin/-/list/=/article=keyword/id=156004/"
FZ_ANIME_SORTS = {
    "overall":  "ranking",        # 人気順（＝ふだんのランキング）
    "rising":   "popular",        # 注目
    "new":      "date",           # 新着
    "popular":  "sales",          # 売れている順
    "alltime":  "total_sales",    # 累計
    "rating":   "review_rank",    # 評価
    "week":     "bookmark_desc",  # お気に入りが多い順
}


def parse_fz_list(src):
    """FANZA同人の一覧ページ（productList）の1件ずつ"""
    out = []
    for b in re.split(r'<li class="productList__item"', src)[1:]:
        cid = re.search(r"/detail/=/cid=([\w]+)/", b)
        if not cid:
            continue
        ttl = re.search(r'tileListTtl__txt">\s*<a[^>]*>([\s\S]*?)</a>', b)
        au = re.search(r'tileListTtl__txt--author">\s*<a href="[^"]*article=maker/id=(\d+)/"[^>]*>([\s\S]*?)</a>', b)
        img = re.search(r'<img src="(https://doujin-assets[^"]+?)"', b)
        kind = re.search(r'c_icon_genre">([^<]{1,8})<', b)
        sales = re.search(r"販売数：([\d,]+)", b)
        rate = re.search(r"listRate__ico--rate(\d+)", b)
        votes = re.search(r"\((\d[\d,]*)件\)", b)
        pr = price_of(b, "productTable-price")
        out.append({"id": cid.group(1), "title": text(ttl.group(1)) if ttl else cid.group(1),
                    "circle": text(au.group(2)) if au else "", "circleId": au.group(1) if au else "",
                    "image": img.group(1) if img else None,
                    "kind": text(kind.group(1)) if kind else "動画",
                    "sales": num(sales.group(1)) if sales else None,
                    "rating": (int(rate.group(1)) / 10) if rate else None,
                    "votes": num(votes.group(1)) if votes else 0,
                    "price": pr["price"], "priceN": pr.get("priceN"), "listPrice": pr["listPrice"], "off": pr["off"],
                    "url": "https://www.dmm.co.jp/dc/doujin/-/detail/=/cid=%s/" % cid.group(1)})
    return out


def danime():
    """同人アニメ（FANZA同人の動画）。ランキング＋圏外ぶんの一覧。"""
    index = {x["id"]: x for x in rd("index/danime.json", []) if isinstance(x, dict)}
    detail = rd("cache/danime-detail.json", {})
    ok = False
    for key, sort in FZ_ANIME_SORTS.items():
        try:
            url = FZ_LIST_URL + "sort=%s/" % sort
            # ★ キーワード「動画」の一覧には、ボイスコミックやゲームも少し混ざる。
            #   ここで「動画」だけに絞る（同人アニメのランキングなので）。
            items = [v for v in parse_fz_list(fz_get(url)) if v.get("kind") == "動画"]
            for i, v in enumerate(items):
                v["rank"] = i + 1
            if not items:
                continue
            for i, v in enumerate(items):
                v["rank"] = i + 1
                index[v["id"]] = dict(index.get(v["id"], {}), **v)
            record("danime_" + key, [v["id"] for v in items], items, {"source": url})
            log("同人アニメ", key, len(items))
            ok = True
        except Exception as e:
            log("同人アニメ 取得失敗", key, e)
        time.sleep(1.2)
    if not ok:
        return False
    # ★ 圏外ぶん：2ページ目から先は一覧に入れるだけ（順位は付けない）
    for pg in range(2, FZ_ANIME_PAGES + 1):
        try:
            for v in parse_fz_list(fz_get(FZ_LIST_URL + "sort=ranking/page=%d/" % pg)):
                if v.get("kind") != "動画":
                    continue
                v.pop("rank", None)
                index[v["id"]] = dict(index.get(v["id"], {}), **v)
        except Exception as e:
            log("同人アニメ 圏外の取得失敗", pg, e)
            break
        time.sleep(1.2)
    # ★★ 2026-09-21e 作品ページ：ジャンル・配信日・サンプル・原作。
    #    ご指定「動画でジャンルが出ていないものがある」＝1回40件しか読んでいなかった。
    #    ランキングに入っている作品を先に、1回150件まで読む（3回つづけて失敗したらやめる）。
    b, miss = budget("FZ_DETAIL", 250), 0
    ranked = [v["id"] for v in index.values() if v.get("rank")]
    order = ranked + [k for k in list(index.keys())[::-1] if k not in set(ranked)]
    for cid in order:
        if b <= 0 or miss >= 3:
            break
        if cid in detail and detail[cid].get("genres") and detail[cid].get("dv") == 3:
            continue
        b -= 1
        try:
            detail[cid] = parse_fz_detail(fz_get(index[cid]["url"]))
            miss = 0
        except Exception as e:
            log("同人アニメ 作品ページ失敗", cid, e)
            miss += 1
        time.sleep(1.3)
    wr("cache/danime-detail.json", detail)
    for cid, d in detail.items():
        if cid in index:
            for k2, val in d.items():
                if val and not index[cid].get(k2):
                    index[cid][k2] = val
    wr("index/danime.json", list(index.values())[-INDEX_MAX:])
    for key in FZ_ANIME_SORTS:
        f = "lists/danime_" + key + ".json"
        L = rd(f, None)
        if not L:
            continue
        for e in L.get("entries", []):
            v = index.get(e["id"])
            if v:
                for k2 in ("genres", "releaseDate", "author", "authorId", "series", "seriesId", "volume", "theme", "origin", "voice", "scenario", "samples", "reviews", "size", "illust", "length"):
                    if v.get(k2) and not e.get(k2):
                        e[k2] = v[k2]
        wr(f, L)
    return True


def fanza():
    detail = rd("cache/fanza-detail.json", {})
    lists = {}
    for k, path in FZ_LISTS.items():
        items = []
        try:
            seen_ids = set()
            for page in range(1, FZ_RANK_PAGES + 1):
                got = [x for x in parse_fz_rank(fz_get(FZ + path + ("" if page == 1 else "page=%d/" % page))) if x["id"] not in seen_ids]
                if not got:
                    break                      # その先のページは無い
                seen_ids.update(x["id"] for x in got)
                items += got
                time.sleep(1.0)
            lists[k] = items
            log("FANZA", k, len(items))
        except Exception as e:
            log("FANZA 取得失敗", k, e)
            if "入れません" in str(e):
                return False
    if not lists:
        return False
    b = budget("FZ_DETAIL", 180)
    seen = []
    for k in ["overall", "week", "rising", "month", "popular", "alltime"]:
        for it in lists.get(k, []):
            if it["id"] not in seen:
                seen.append(it["id"])
    for cid in seen:
        if b <= 0:
            break
        if cid in detail and detail[cid].get("dv") == 3:
            continue
        b -= 1
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
    # ★ 圏外ぶん：コミックの一覧ページを読んで index にためる（順位は付けない）
    for pg in range(1, FZ_PAGES + 1):
        try:
            for v in parse_fz_list(fz_get(FZ_COMIC_LIST + ("" if pg == 1 else "page=%d/" % pg))):
                v.pop("rank", None)
                if v["id"] not in index:
                    index[v["id"]] = v
        except Exception as e:
            log("FANZA 圏外の取得失敗", pg, e)
            break
        time.sleep(1.2)
    wr("index/fanza.json", list(index.values())[-INDEX_MAX:])
    return True


# ══════════ この作品を見た人が見る作品 ══════════
# ★★ 2026-09-21f ご指定「この作品を見たユーザーが見る作品」。
#    FANZA … 作品ページのレビューを書いた人の「レビュー一覧」（review.dmm.co.jp・公開）を読み、
#            その人たちがほかに見た作品を数えて多い順（＝この作品を見た人がよく見る作品）
#    DLsite … 公式の「この作品を買った人はこんな作品も買っています」（load/recommend viewsales2）
REVIEWER_DAYS = 7


def fz_also(key):
    """key … fanza / danime。作品ページのレビューを書いた人から「ほかに見た作品」を集める"""
    detail = rd("cache/%s-detail.json" % key, {})
    rv = rd("cache/fz-reviewers.json", {})
    index = {x["id"]: x for x in rd("index/%s.json" % key, []) if isinstance(x, dict)}
    order = sorted([k for k in index if detail.get(k, {}).get("reviewers")], key=lambda k: index[k].get("rank") or 9999)
    b, miss = budget("REVIEWER", 60), 0
    old = int(time.time()) - REVIEWER_DAYS * 86400
    for cid in order:
        for rid in detail[cid]["reviewers"][:4]:
            if b <= 0 or miss >= 3:
                break
            if rid in rv and rv[rid].get("at", 0) > old:
                continue
            b -= 1
            try:
                src = http_get("https://review.dmm.co.jp/review-front/reviewer/list/" + rid, headers={"Cookie": "age_check_done=1"})
                rv[rid] = {"at": int(time.time()), "cids": list(dict.fromkeys(re.findall(r"cid=([a-z0-9_]+)", src)))[:60]}
                miss = 0
            except Exception as e:
                miss += 1
                log("レビューした人の一覧 失敗", rid, e)
            time.sleep(1.0)
    wr("cache/fz-reviewers.json", rv)
    n = 0
    for cid, v in index.items():
        cnt = {}
        for rid in detail.get(cid, {}).get("reviewers", []):
            for c2 in rv.get(rid, {}).get("cids", []):
                if c2 != cid:
                    cnt[c2] = cnt.get(c2, 0) + 1
        if cnt:
            v["also"] = [k for k, _ in sorted(cnt.items(), key=lambda x: -x[1])][:16]
            n += 1
    wr("index/%s.json" % key, list(index.values()))
    log("見た人が見る作品", key, n, "作品")


def dl_also():
    index = {x["id"]: x for x in rd("index/dlsite.json", []) if isinstance(x, dict)}
    cache = rd("cache/dl-also.json", {})
    old = int(time.time()) - REVIEWER_DAYS * 86400
    order = sorted(index, key=lambda k: index[k].get("rank") or 9999)
    b, miss = budget("DL_ALSO", 80), 0
    for pid in order:
        if b <= 0 or miss >= 3:
            break
        if pid in cache and cache[pid].get("at", 0) > old:
            continue
        b -= 1
        try:
            src = http_get(DL + "/load/recommend/v2/=/type/viewsales2/product_id/%s.html" % pid,
                           headers={"Cookie": "adultchecked=1; recommend_device_id=1000000000.1789990000", "X-Requested-With": "XMLHttpRequest", "Referer": DL + "/"})
            items = []
            for m in re.finditer(r'data-product_id="(RJ\d+)"data-work_name="([^"]*)"data-maker_id="(\w*)"data-work_type="(\w*)"[^>]*?data-price="(\d*)"(?:data-official_price="(\d*)")?', src):
                if m.group(1) == pid or any(x["id"] == m.group(1) for x in items):
                    continue
                items.append({"id": m.group(1), "title": html.unescape(m.group(2)), "circleId": m.group(3), "type": m.group(4),
                              "priceN": int(m.group(5)) if m.group(5) else None, "listPrice": int(m.group(6)) if m.group(6) and m.group(6) != m.group(5) else None})
            for it in items:
                im = re.search(r"//img\.dlsite\.jp/[^'\"]*?%s_img_main[^'\"]*?\.(?:jpg|webp)" % it["id"], src)
                if im:
                    it["image"] = "https:" + im.group(0)
            cache[pid] = {"at": int(time.time()), "items": items[:16]}
            miss = 0
        except Exception as e:
            miss += 1
            log("DLsite 見た人が見る作品 失敗", pid, e)
        time.sleep(1.0)
    wr("cache/dl-also.json", cache)
    added = 0
    for pid, c in cache.items():
        if pid in index:
            index[pid]["also"] = [x["id"] for x in c.get("items", [])]
        for x in c.get("items", []):
            if x.get("type") == "MNG" and x["id"] not in index:     # ★ マンガなら圏外の作品として一覧にも足す
                index[x["id"]] = {"id": x["id"], "title": x["title"], "image": x.get("image"), "circleId": x.get("circleId", ""),
                                  "price": "{:,}".format(x["priceN"]) if x.get("priceN") else "", "priceN": x.get("priceN"),
                                  "listPrice": x.get("listPrice"), "kind": "マンガ",
                                  "url": DL + "/work/=/product_id/%s.html" % x["id"]}
                added += 1
    wr("index/dlsite.json", list(index.values())[-INDEX_MAX:])
    log("見た人が見る作品 DLsite", len(cache), "作品・圏外に", added, "件追加")


# ══════════ セール情報（開催中のキャンペーン） ══════════
# ★★ 2026-09-21f ご指定「セールが行われている情報を表示するタブ」。
#    FANZA同人 … トップページ・ランキングに出ている「キャンペーン」の一覧ページを読む
#                （名前・終わる日・対象作品）。対象作品は同人本／同人アニメの一覧にも足す。
#    DLsite   … キャンペーンの名前は JavaScript で描くので読めない。割引中の作品を割引率ごとにまとめる。
def campaigns():
    out = []
    ids = []
    for u in ["https://www.dmm.co.jp/dc/doujin/", FZ + FZ_LISTS["overall"], "https://www.dmm.co.jp/dc/doujin/-/list/=/section=mens/sort=ranking/"]:
        try:
            for cid in re.findall(r"article=campaign/id=(\d+)/", fz_get(u)):
                if cid not in ids:
                    ids.append(cid)
        except Exception as e:
            log("キャンペーン一覧 失敗", e)
        time.sleep(1.0)
    add = {"fanza": {}, "danime": {}}
    for cid in ids[:20]:
        url = "https://www.dmm.co.jp/dc/doujin/-/list/=/article=campaign/id=%s/" % cid
        try:
            src = fz_get(url + "sort=ranking/")
            h1 = re.search(r"<h1[^>]*>([\s\S]{0,160}?)</h1>", src)
            title = re.sub(r"^同人,\s*|の作品一覧$", "", text(h1.group(1))) if h1 else "キャンペーン"
            ends = re.findall(r'data-js-discount-campaign-period="([^"]+)"', src)
            end = max(set(ends), key=ends.count)[:10] if ends else ""
            # 対象の数は「15,956 タイトル」のように書かれている（いちばん大きい数）
            tn = [num(x) for x in re.findall(r"([\d,]+)\s*タイトル", re.sub(r"<[^>]+>", " ", src))]
            items = parse_fz_list(src)
            for v in items:
                k = "danime" if v.get("kind") == "動画" else "fanza" if v.get("kind") in ("コミック", "CG", "CG集") else None
                if k:
                    add[k][v["id"]] = v
            out.append({"src": "fanza", "id": "fz" + cid, "title": title, "url": url, "end": end,
                        "count": max(tn) if tn else len(items),
                        "items": [{k2: v.get(k2) for k2 in ("id", "title", "image", "price", "listPrice", "off", "circle", "kind", "rating", "sales")} for v in items[:40]]})
        except Exception as e:
            log("キャンペーン 失敗", cid, e)
        time.sleep(1.2)
    for k, m in add.items():
        ix = {x["id"]: x for x in rd("index/%s.json" % k, []) if isinstance(x, dict)}
        for i2, v in m.items():
            v.pop("rank", None)
            ix[i2] = dict(ix.get(i2, {}), **{a: b for a, b in v.items() if b not in (None, "")})
        wr("index/%s.json" % k, list(ix.values())[-INDEX_MAX:])
    # DLsite：割引率ごと
    dl = [x for x in rd("index/dlsite.json", []) if isinstance(x, dict) and (x.get("off") or 0) > 0]
    for lo, hi, nm in [(70, 100, "70%OFF 以上"), (50, 69, "50〜69%OFF"), (30, 49, "30〜49%OFF"), (1, 29, "30%OFF 未満")]:
        g = sorted([x for x in dl if lo <= x["off"] <= hi], key=lambda x: -(x.get("sales") or 0))
        if g:
            out.append({"src": "dlsite", "id": "dl%d" % lo, "title": "DLsite 同人マンガ " + nm, "url": DL + "/works/discount", "end": "",
                        "count": len(g), "items": [{k2: v.get(k2) for k2 in ("id", "title", "image", "price", "listPrice", "off", "circle", "kind", "rating", "sales")} for v in g[:40]]})
    wr("campaigns.json", {"at": NOW_MS, "list": out})
    log("セール情報", len(out), "件")
    return bool(out)


# ══════════ FANZA 本・アニメ（通販のランキングページ） ══════════
# ★★ 2026-09-21d ご指定「FANZAブックス」「FANZA動画の中のアニメ」。
#    電子書籍の FANZAブックス（book.dmm.co.jp）と 動画配信（video.dmm.co.jp）は
#    <b>中身を JavaScript で描くつくり</b>に変わっていて、公開ページを読んでも作品が1件も入っていない。
#    そこで、同じ FANZA の中で<b>サーバー側が HTML を返してくれる通販のランキング</b>を使う。
#    　・本   … /mono/book/-/ranking/（コミック／エロ本）
#    　・アニメ … /mono/anime/-/ranking/
#    どちらも 1ページ20件 × 5ページ＝100位まで、日間／週間／月間がある。
MONO = "https://www.dmm.co.jp"
MONO_SETS = {
    # key: (floor, ランキングの種類, 一覧のキー → mode)
    "fbooks": {"floor": "book", "nm": "FANZA 本", "modes": {"": "comic", "adult": "adult"}},
    "fvideo": {"floor": "anime", "nm": "FANZA アニメ", "modes": {"": ""}},
}
MONO_TERMS = {"overall": "monthly", "week": "week", "rising": "daily"}


def parse_mono(src, floor):
    out = []
    for b in re.split(r'<span class="rank">', src)[1:]:
        rk = re.match(r"(\d+)", b)
        cid = re.search(r"/detail/=/cid=([\w]+)/", b)
        if not cid:
            continue
        img = re.search(r'<img src="(https://pics\.dmm\.co\.jp/[^"]+)" alt="([^"]*)"', b)
        mk = re.search(r'article=(?:maker|label)/id=(\d+)/">([\s\S]*?)</a>', b)
        au = re.search(r'作家(?:&nbsp;|\s)*：(?:&nbsp;|\s)*(?:<a[^>]*>)?([^<]{1,30})', b)
        date = re.search(r"(\d{4})/(\d{2})/(\d{2})", b)
        price = re.search(r"([\d,]+)円", b)
        out.append({"id": cid.group(1), "rank": int(rk.group(1)) if rk else len(out) + 1,
                    "title": html.unescape(img.group(2)) if img else cid.group(1),
                    "image": img.group(1).replace("pt.jpg", "pl.jpg") if img else None,
                    "circle": text(mk.group(2)) if mk else "", "circleId": mk.group(1) if mk else "",
                    "releaseDate": ("%s-%s-%s" % date.groups()) if date else "",
                    "price": price.group(1) if price else "", "priceN": int(price.group(1).replace(",", "")) if price else None,
                    "author": text(au.group(1)) if au else "",
                    "kind": "アニメ" if floor == "anime" else "本",
                    "url": MONO + "/mono/%s/-/detail/=/cid=%s/" % (floor, cid.group(1))})
    return out


def parse_mono_detail(src):
    """通販の作品ページ：ジャンル・シリーズ・作家（ジャンルが無いと絞り込めないので）"""
    genres = []
    for m in re.finditer(r'article=keyword/id=\d+/"[^>]*>([^<]{1,24})</a>', src):
        g = text(m.group(1))
        if g and g not in genres:
            genres.append(g)
    se = re.search(r'article=series/id=(\d+)/"[^>]*>([^<]{1,40})</a>', src)
    au = re.search(r'article=author/id=\d+/"[^>]*>([^<]{1,30})</a>', src)
    # ★★ 2026-09-22 ご指定「長さ・ページ数も」。アニメは「収録時間：20分」、本は「ページ数」
    flat = text(re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", src))
    ln = re.search(r"収録時間[：:]\s*(\d+\s*分)", flat)
    pg = re.search(r"(?:ページ数|頁数)[：:]\s*(\d+)", flat)
    return {"genres": genres[:14], "series": text(se.group(2)) if se else "", "seriesId": se.group(1) if se else "",
            "author": text(au.group(1)) if au else "", "length": ln.group(1).replace(" ", "") if ln else "",
            "volume": (pg.group(1) + "ページ") if pg else "", "lv": 2}


def mono_one(cat):
    conf = MONO_SETS[cat]
    floor, nm = conf["floor"], conf["nm"]
    index = {x["id"]: x for x in rd("index/%s.json" % cat, []) if isinstance(x, dict)}
    ok = False
    for key, term in MONO_TERMS.items():
        for mkey, mode in conf["modes"].items():
            items, base = [], MONO + "/mono/%s/-/ranking/=/" % floor + ("mode=%s/" % mode if mode else "")
            try:
                for pg in ["", "rank=21_40/", "rank=41_60/", "rank=61_80/", "rank=81_100/"][:MONO_PAGES]:
                    items += parse_mono(fz_get(base + pg + "term=%s/" % term), floor)
                    time.sleep(1.2)
            except Exception as e:
                log(nm + " 取得失敗", key, e)
                continue
            if not items:
                continue
            for i, v in enumerate(items):
                v["rank"] = i + 1
                index[v["id"]] = dict(index.get(v["id"], {}), **v)
            lk = cat + "_" + key + (("-" + mkey) if mkey else "")
            record(lk, [v["id"] for v in items], items, {"source": base + "term=%s/" % term})
            log(nm, lk, len(items))
            ok = True
    if ok:
        detail = rd("cache/%s-detail.json" % cat, {})
        b, miss = budget("MONO_DETAIL", 80), 0
        for cid, v in index.items():
            if b <= 0 or miss >= 3:
                break
            if cid in detail and detail[cid].get("lv") == 2:
                continue
            b -= 1
            try:
                detail[cid] = parse_mono_detail(fz_get(v["url"]))
                miss = 0
            except Exception as e:
                log(nm + " 作品ページ失敗", cid, e)
                miss += 1
            time.sleep(1.3)
        wr("cache/%s-detail.json" % cat, detail)
        for cid, d in detail.items():
            if cid in index:
                for k2, val in d.items():
                    if val and not index[cid].get(k2):
                        index[cid][k2] = val
        wr("index/%s.json" % cat, list(index.values())[-INDEX_MAX:])
    return ok


def fbooks():
    return mono_one("fbooks")


def fvideo():
    return mono_one("fvideo")


# ══════════ DLsite 同人（マンガ） ══════════
DL = "https://www.dlsite.com/maniax"
DL_RANK = {"overall": "day", "week": "week", "month": "month", "year": "year", "alltime": "total"}   # ?sub=MNG でマンガだけの順位になる
DL_SEARCH = {"popular": "dl_d", "new": "release_d", "rating": "rate_d", "rising": "trend"}
DL_SEARCH_URL = DL + "/fsr/=/work_category%5B0%5D/doujin/work_type_category%5B0%5D/{w}/order%5B0%5D/{o}/per_page/100"
# ★★ 2026-09-21 DLsite は「マンガ」と「同人アニメ（動画）」の2つを取る（ご指定）。
#    どちらも同じ作りなので、ここの表を変えるだけで増やせる。
#      sub  … ランキングページの ?sub=（MNG＝マンガ／MOV＝動画）
#      work … 検索ページの work_type_category（comic／movie）
#      kind … 画面に出す「作品の種類」
DL_SUBS = {
    "dlsite": {"sub": "MNG", "work": "comic", "kind": "マンガ"},
}
# ※ 同人アニメは 2026-09-21c から FANZA のほうで取る（ご指定）。DLsite は同人マンガだけ。


def dl_get(url):
    return http_get(url, headers={"Cookie": "adultchecked=1"})


def dl_fields(b, pid):
    title = re.search(r'work_name[\s\S]{0,500}?product_id/%s\.html"[^>]*>([\s\S]*?)</a>' % pid, b) or re.search(r'product_id/%s\.html"[^>]*>([\s\S]{2,150}?)</a>' % pid, b)
    maker = re.search(r'maker_id/(\w+)\.html">([\s\S]*?)</a>', b)
    img = re.search(r"//img\.dlsite\.jp/[^'\"]*?%s_img_main(?:_240x240)?\.(?:jpg|webp)" % pid, b)
    star = re.search(r"star_rating star_(\d+)", b)
    votes = re.search(r"star_rating star_\d+\"[^>]*>\((\d[\d,]*)\)", b)
    dl = re.search(r"_dl_count_%s\">([\d,]+)" % pid, b) or re.search(r'dl_count[^>]*>[^<]*?([\d,]+)\s*<', b)
    price = re.search(r'work_price[^>]*>([\d,]+)', b)
    offm = re.search(r"(\d{1,2})\s*%\s*OFF", re.sub(r"<[^>]+>", " ", b), re.I)
    pn = int(price.group(1).replace(",", "")) if price else None
    offv = int(offm.group(1)) if offm else 0
    lp = int(round(pn / (1 - offv / 100.0) / 10.0) * 10) if (pn and 0 < offv < 100) else None
    date = re.search(r"(\d{4})年(\d{2})月(\d{2})日", b)
    kind = re.search(r"work_category type_(\w+)", b)
    genres = []
    at = re.search(r'__product_attributes"[^>]*value="([^"]*)"', b) or re.search(r'data-product_attributes="([^"]*)"', b)
    if at:
        for t in html.unescape(at.group(1)).split(","):
            t = t.strip()
            if t and not re.fullmatch(r"[\w\-]+", t) and t not in genres:
                genres.append(t)
    samples = []
    sm = re.search(r"data-(?:view_)?samples=\"([^\"]*)\"", b)
    if sm:
        for u in re.findall(r"//img\.dlsite\.jp[^'\"]+?\.jpg", html.unescape(sm.group(1)).replace("\\/", "/")):
            u = "https:" + u
            if u not in samples:
                samples.append(u)
    return {"id": pid, "title": text(title.group(1)) if title else pid, "circle": text(maker.group(2)) if maker else "",
            "circleId": maker.group(1) if maker else "", "image": ("https:" + img.group(0)) if img else None,
            "rating": (int(star.group(1)) / 10) if star else None, "votes": num(votes.group(1)) if votes else 0,
            "sales": num(dl.group(1)) if dl else None, "price": price.group(1) if price else "",
            "priceN": pn, "listPrice": lp, "off": offv,
            "releaseDate": ("%s-%s-%s" % date.groups()) if date else "",
            "kind": {"MNG": "マンガ", "ICG": "CG集", "SOU": "ボイス", "MOV": "同人アニメ", "ACN": "ゲーム"}.get(kind.group(1) if kind else "", ""),
            "genres": genres[:12], "samples": samples[:30], "url": DL + "/work/=/product_id/%s.html" % pid}


def parse_dl_rank(src, want="MNG"):
    out = []
    for b in re.split(r'<tr class="[^"]*">', src)[1:]:
        m = re.search(r"product_id/(RJ\d+)\.html", b)
        if not m:
            continue
        kind = re.search(r"work_category type_(\w+)", b)
        if not kind or kind.group(1) != want:     # ほしい種類いがい（ゲーム・ボイス）は入れない
            continue
        out.append(dl_fields(b, m.group(1)))
    return out


def parse_dl_search(src):
    out = []
    for b in re.split(r'data-list_item_product_id="', src)[1:]:
        m = re.match(r"(RJ\d+)", b)
        if not m:
            continue
        out.append(dl_fields(b, m.group(1)))
    return out


def parse_dl_detail(src):
    """DLsite の作品ページからジャンル・販売日・作者・ページ数・レビューを拾う"""
    genres = []
    for m in re.finditer(r'href="[^"]*genre[^"]*"[^>]*>([^<]{1,24})</a>', src):
        t = text(m.group(1))
        if t and t not in genres and "特集" not in t:
            genres.append(t)
    flat = text(re.sub(r"<script[\s\S]*?</script>", " ", src))
    date = re.search(r"販売日\s*(\d{4})年(\d{2})月(\d{2})日", flat)
    au = re.search(r"(?:作者|作家|シナリオ)\s*([^\s/]{1,20})", flat)
    pages = re.search(r"ページ数[／/]?[^\d]{0,12}([\d,]+)\s*ページ", flat)
    pg_txt = (pages.group(1) + "ページ") if pages else ""
    if not pg_txt and not re.search(r"作品形式\s*(?:動画|アニメ|ボイス|音声|ゲーム)", flat):
        # ★★ 2026-09-23 ご指定「同人誌はページ数も」（動画・音声・ゲームの作品では数えない）。DLsite は表にページ数が無く、説明文に
        #   「本編84ページ」「合計41ページ」「フルカラー91P」のように書いてある作品が多い。
        #   サイト共通の案内（「8～32ページの漫画」）を拾わないよう、範囲（～）の右側は数えない。
        best = None
        for mm in re.finditer(r"(本編|本文|合計|総|全|計|漫画)?[^\d～〜~\-]{0,6}?(?<![\d～〜~\-])(\d{1,4})\s*(?:ページ|[PpＰ](?![A-Za-z])|枚)", flat):
            n = int(mm.group(2))
            if not (4 <= n <= 2000):
                continue
            k = (1 if mm.group(1) else 0, n)
            if best is None or k > best:
                best = k
        if best:
            pg_txt = "%dページ" % best[1]
    size = re.search(r"ファイル容量\s*(?:総計)?\s*([\d.,]+\s*[KMGT]B)", flat)
    reviews = []
    for m in re.finditer(r'class="[^"]*(?:review_text|user_review_text|review-text)[^"]*"[^>]*>([\s\S]{10,600}?)</', src):
        t = text(m.group(1))
        if t and t not in reviews:
            reviews.append(t)
        if len(reviews) >= 3:
            break
    return {"genres": genres[:14], "releaseDate": ("%s-%s-%s" % date.groups()) if date else "",
            "author": au.group(1) if au else "", "volume": pg_txt, "reviews": reviews,
            "size": size.group(1).replace(" ", "") if size else "", "dv": 2}


def dlsite(cat="dlsite"):
    """cat … "dlsite"（マンガ）か "danime"（同人アニメ）。作りは同じで、見にいく種類だけ変える。"""
    conf = DL_SUBS[cat]
    index = {x["id"]: x for x in rd("index/%s.json" % cat, []) if isinstance(x, dict)}
    detail = rd("cache/%s-detail.json" % cat, {})
    nm = "DLsite" if cat == "dlsite" else "同人アニメ"
    ok = False
    for k, term in DL_RANK.items():
        try:
            url = DL + "/ranking/%s?category=doujin&sub=%s" % (term, conf["sub"])
            items = parse_dl_rank(dl_get(url), conf["sub"])
            if not items:
                continue
            for i, v in enumerate(items):
                v["rank"] = i + 1
                index[v["id"]] = v
            record(cat + "_" + k, [v["id"] for v in items], items, {"source": url})
            log(nm, k, len(items))
            ok = True
        except Exception as e:
            log(nm + " 取得失敗", k, e)
        time.sleep(1.2)
    for k, order in DL_SEARCH.items():
        try:
            url = DL_SEARCH_URL.format(w=conf["work"], o=order)
            items = parse_dl_search(dl_get(url))
            if not items:
                continue
            for i, v in enumerate(items):
                v["rank"] = i + 1
                index[v["id"]] = v
            record(cat + "_" + k, [v["id"] for v in items], items, {"source": url})
            log(nm, k, len(items))
            ok = True
        except Exception as e:
            log(nm + " 取得失敗", k, e)
        time.sleep(1.2)
    # ★ 圏外ぶん：検索ページの2ページ目から先を index にためる（順位は付けない）
    for pg in range(2, DL_PAGES + 1):
        try:
            url = DL_SEARCH_URL.format(w=conf["work"], o="trend") + "/page/%d" % pg
            for v in parse_dl_search(dl_get(url)):
                v.pop("rank", None)
                if v["id"] not in index:
                    index[v["id"]] = v
        except Exception as e:
            log(nm + " 圏外の取得失敗", pg, e)
            break
        time.sleep(1.2)
    # 作品ページ：ジャンル・配信日・作者（一覧に無いぶんを少しずつ）
    # ★★ 2026-09-23 ページ数を取るため、<b>一覧でジャンルが分かっていても</b>作品ページを読む（dv=2 で1回だけ）。
    #   前は「ジャンルと販売日があれば読まない」だったので、DLsite はほとんどページ数が無かった（2727本中40本）。
    b = budget("DL_DETAIL", 250)
    ranked = [k for k, v in index.items() if v.get("rank")]
    for pid in ranked + [k for k in list(index.keys())[::-1] if k not in set(ranked)]:
        if b <= 0:
            break
        if (detail.get(pid) or {}).get("dv") == 2:
            continue
        b -= 1
        try:
            detail[pid] = parse_dl_detail(dl_get(DL + "/work/=/product_id/%s.html" % pid))
        except Exception as e:
            log(nm + " 作品ページ失敗", pid, e)
        time.sleep(1.2)
    wr("cache/%s-detail.json" % cat, detail)
    for pid, d in detail.items():
        if pid in index:
            v = index[pid]
            for k2, val in d.items():
                if val and not v.get(k2):
                    v[k2] = val
    if ok:
        wr("index/%s.json" % cat, list(index.values())[-INDEX_MAX:])
        # 一覧にも作品ページの情報を反映する
        for k in list(DL_RANK) + list(DL_SEARCH):
            f = "lists/%s_%s.json" % (cat, k)
            L = rd(f, None)
            if not L:
                continue
            for e in L.get("entries", []):
                v = index.get(e["id"])
                if v:
                    for k2 in ("genres", "releaseDate", "author", "authorId", "volume", "reviews", "size"):
                        if v.get(k2) and not e.get(k2):
                            e[k2] = v[k2]
            wr(f, L)
    return ok


# ══════════ 音楽（Billboard JAPAN の公開ページ。鍵はいらない） ══════════
# ★★ 2026-09-21 ご指定の「カラオケではなく“視聴されている曲”のランキング」。
#    Billboard JAPAN は ストリーミング・ダウンロード・動画再生 などを公開している。
BB = "https://www.billboard-japan.com"
BB_LISTS = {
    "stream":   ("stsongs",  "ストリーミング（聴かれている曲）"),
    "overall":  ("hot100",   "総合（Billboard JAPAN Hot 100）"),
    "download": ("dlsongs",  "ダウンロード"),
    "video":    ("ugc",      "動画再生"),
    "anime":    ("anime",    "アニメ"),
    "niconico": ("niconico", "ニコニコ"),
    "sales":    ("sales",    "CD売上"),
}
BB_ROW = re.compile(r'<tr class="rank\d+"[^>]*>([\s\S]*?)</tr>')


def parse_bb(src):
    out = []
    for m in BB_ROW.finditer(src):
        b = m.group(1)
        ti = re.search(r'class="musuc_title">([\s\S]*?)</p>', b)
        if not ti:
            continue
        rk = re.search(r'class="rank_td[^"]*">\s*<span>(\d+)</span>\s*<span class="cont">([^<]*)</span>', b)
        ar = re.search(r'class="artist_name">(?:<a href="/artists/detail/(\d+)">)?([\s\S]*?)(?:</a>)?</p>', b)
        im = re.search(r'<img src="([^"]+)"', b)
        gd = re.search(r"/goods/detail/(\d+)", b)
        pt = re.search(r'class="num">([\d,]+)</p>', b)
        img = im.group(1) if im else ""
        if "noimage" in img:
            img = ""
        title = text(ti.group(1))
        artist = text(ar.group(2)) if ar else ""
        out.append({"id": ("bb" + gd.group(1)) if gd else ("bx" + re.sub(r"\W+", "", norm(title + artist))[:24]),
                    "title": title, "artist": artist, "aid": (ar.group(1) if ar and ar.group(1) else ""),
                    "image": (BB + img) if img.startswith("/") else (img or None),
                    "point": num(pt.group(1)) if pt else None,
                    "url": (BB + "/goods/detail/" + gd.group(1)) if gd else BB + "/charts/",
                    "rank": int(rk.group(1)) if rk else len(out) + 1})
    return out


def music():
    songs = rd("cache/music-songs.json", {})
    seen = rd("cache/music-artists.json", {})
    lists, ok = {}, False
    for key, (code, label) in BB_LISTS.items():
        try:
            items = parse_bb(http_get(BB + "/charts/detail?a=" + code))
            if not items:
                continue
            lists[key] = items
            for v in items:
                songs.setdefault(v["id"], {}).update({k: v[k] for k in ("title", "artist", "aid", "image", "url") if v.get(k)})
            log("Billboard", key, len(items))
            ok = True
        except Exception as e:
            log("Billboard 取得失敗", key, e)
        time.sleep(1.2)
    if not ok:
        return False
    # ジャケットと発売日・ジャンルを iTunes で足す（Billboard に絵が無い曲がある）
    b = budget("BB_ITUNES", 60)
    for sid, so in songs.items():
        if b <= 0:
            break
        if so.get("image") and so.get("rel"):
            continue
        if so.get("noart", 0) >= ITUNES_TRY:
            continue
        b -= 1
        got = itunes_song(so.get("title", ""), so.get("artist", ""))
        if got is None:
            break
        if got:
            if not so.get("image"):
                so["image"] = got["img"]
            so.update({k: got[k] for k in ("rel", "g", "url", "al", "aid2", "tid", "ms") if k in got})
            so["itArtist"] = got.get("aid", "")
            so.pop("noart", None)
        else:
            so["noart"] = so.get("noart", 0) + 1
        time.sleep(3.2)
    # ★ ご指定：ランキングに出ているアーティストの曲は、圏外のものもぜんぶ出す
    b = budget("BB_ARTIST", 12)
    for sid, so in list(songs.items()):
        if b <= 0:
            break
        aid = so.get("itArtist")
        if not aid or aid in seen:
            continue
        b -= 1
        seen[aid] = 1
        got = itunes_artist_songs(aid)
        if got is None:
            break
        for x in got:
            k = "it" + str(x.get("trackId"))
            if k in songs:
                continue
            v = it_view(x)
            songs[k] = {"title": x.get("trackName", ""), "artist": x.get("artistName", ""), "image": v["img"],
                        "rel": v["rel"], "g": v["g"], "url": v["url"], "al": v["al"], "itArtist": aid, "off": 1, "tid": v["tid"], "ms": v["ms"]}
        time.sleep(3.2)
    it_lengths(songs, "MUSIC_LEN", 3)
    wr("cache/music-songs.json", songs)
    wr("cache/music-artists.json", seen)

    def view(sid):
        so = songs.get(sid, {})
        return {"id": sid, "title": so.get("title", ""), "artist": so.get("artist", ""), "image": so.get("image") or None,
                "releaseDate": so.get("rel", ""), "genre": so.get("g", ""), "album": so.get("al", ""),
                "appleUrl": so.get("url", ""), "offchart": bool(so.get("off")), "length": mmss(so.get("ms"))}
    for k, items in lists.items():
        ids = [v["id"] for v in items]
        record("music_" + k, ids, [dict(view(i), rank=n + 1, point=items[n].get("point")) for n, i in enumerate(ids)],
               {"source": BB + "/charts/detail?a=" + BB_LISTS[k][0], "note": BB_LISTS[k][1]})
    wr("index/music.json", [view(i) for i in songs])
    return True


# ══════════ アニメ（Annict ＋ Filmarks ＋ AniList） ══════════
ANILIST = "https://graphql.anilist.co"
AL_FIELDS = "id idMal title{native romaji} coverImage{extraLarge large} bannerImage genres season seasonYear format status episodes averageScore popularity siteUrl"
GENRE_JA = {"Action": "アクション", "Adventure": "アドベンチャー", "Comedy": "コメディ", "Drama": "ドラマ", "Ecchi": "お色気", "Fantasy": "ファンタジー",
            "Horror": "ホラー", "Mahou Shoujo": "魔法少女", "Mecha": "ロボット", "Music": "音楽", "Mystery": "ミステリー", "Psychological": "サイコ",
            "Romance": "恋愛", "Sci-Fi": "SF", "Slice of Life": "日常", "Sports": "スポーツ", "Supernatural": "超常", "Thriller": "サスペンス"}
FM = "https://filmarks.com"


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


def parse_pairs(src):
    """Annict の「左：役割／右：名前」の2列を拾う"""
    out = []
    for m in re.finditer(r'<div class="col-6 text-end">([\s\S]*?)</div>\s*<div class="col-6">([\s\S]*?)</div>', src):
        a, b = text(m.group(1)), text(m.group(2))
        if a and b:
            out.append((a, b))
    return out


def annict_detail(aid):
    """声優（キャスト）と監督・制作会社（スタッフ）"""
    d = {"cast": [], "staff": [], "director": "", "studio": ""}
    try:
        for r, n in parse_pairs(http_get("https://annict.com/works/%s/casts" % aid))[:20]:
            d["cast"].append({"c": r, "n": n})
    except Exception as e:
        log("Annict キャスト失敗", aid, e)
    time.sleep(1.0)
    try:
        for r, n in parse_pairs(http_get("https://annict.com/works/%s/staffs" % aid))[:24]:
            d["staff"].append({"r": r, "n": n})
            if r == "監督" and not d["director"]:
                d["director"] = n
            if r in ("アニメーション制作", "制作", "アニメーション") and not d["studio"]:
                d["studio"] = n
    except Exception as e:
        log("Annict スタッフ失敗", aid, e)
    return d


def parse_fm_cassettes(src):
    """★★ 2026-09-22 ご指定「Filmarks の作品の画像が違うものが多い」。
       前は題名の位置から<b>前後4000文字</b>を見て最初の絵・点数を拾っていたので、
       <b>1つ前の作品のポスター</b>や配信サービスのロゴを拾っていた（点数・リンクも同じようにずれていた）。
       1作品＝ <div class="js-cassette" …> ～ 次の js-cassette の手前、の中だけを見る。
       ポスターは p-content-cassette__jacket の中の絵だけ。"""
    out = []
    for b in re.split(r'<div class="js-cassette"', src)[1:]:
        t = re.search(r'p-content-cassette__title">([\s\S]*?)</h3>', b)
        if not t:
            continue
        url = re.search(r"onClickDetailLink\(\$event, &#39;(/animes/\d+/\d+)&#39;\)", b) or re.search(r'href="(/animes/\d+/\d+)"', b)
        score = re.search(r'c-rating__score">([\d.]+)<', b)
        date = re.search(r'公開日：</h4>\s*<span>([^<]+)</span>', b)
        dur = re.search(r'(?:再生時間|上映時間)：</h4>\s*<span>([^<]+)</span>', b)
        comp = re.findall(r'href="/list-anime/company/(\d+)">([^<]+)</a>', b)
        syn = re.search(r'p-content-cassette__synopsis-desc-text">([\s\S]*?)</p>', b)
        jk = re.search(r'p-content-cassette__jacket[\s\S]*?<img[^>]+src="(https://[^"]+?\.(?:jpg|jpeg|png|webp))"', b)
        img = jk.group(1) if jk and "noimage" not in jk.group(1) else None
        out.append({"title": text(t.group(1)), "url": (FM + url.group(1)) if url else "", "score": float(score.group(1)) if score and float(score.group(1)) > 0 else None,
                    "date": text(date.group(1)) if date else "", "studios": [text(c[1]) for c in comp], "studioIds": [c[0] for c in comp],
                    "synopsis": text(syn.group(1))[:300] if syn else "", "image": img, "duration": text(dur.group(1)) if dur else ""})
    return out


def fm_search(title):
    src = http_get(FM + "/search/animes?q=" + urllib.parse.quote(strip_paren(title)))
    cs = parse_fm_cassettes(src)
    nt = norm(strip_paren(title))
    return next((c for c in cs if norm(c["title"]) == nt), None) or next((c for c in cs if nt and norm(c["title"]).startswith(nt[:8])), None)


def fm_reviews(url):
    """★★ 2026-09-21f ご指定「レビューをもっと」。1ページ3〜4件なので3ページぶん（12件まで）読む。"""
    out = []
    for pg in (1, 2, 3):
        try:
            src = http_get(url + ("" if pg == 1 else "?page=%d" % pg))
        except Exception:
            break
        got = 0
        for m in re.finditer(r'p-mark-review__contents">([\s\S]{10,700}?)</p>', src):
            t = text(m.group(1))
            if t and t not in out:
                out.append(t)
                got += 1
        if not got or len(out) >= 12:
            break
        time.sleep(0.8)
    return out[:12]


# ★★ 2026-09-21c ご指定「略称も詳細で教えてほしい」。
#    しょぼいカレンダー（cal.syoboi.jp）の公開DBには <ShortTitle>（＝略称）と
#    <TitleYomi>（＝よみ）が入っている。鍵はいらず、**全作品を1リクエストで**取れる（約1.3MB・8000件）。
#    1回の取得につき1回だけ読んで、題名を突き合わせる。
SYOBO_URL = "https://cal.syoboi.jp/db.php?Command=TitleLookup&TID=*&Fields=TID,Title,ShortTitle,TitleYomi"


def title_key(t):
    """題名の突き合わせ用に、記号・空白・季（2期など）を落とす"""
    t = re.sub(r"[\s　]+", "", str(t or ""))
    t = re.sub(r"[「」『』【】〔〕（）()\[\]~〜～\-－―ー・,、.。!！?？:：;；'\"’”]", "", t)
    t = re.sub(r"(第?\s*[0-9０-９IVX]+\s*(期|シーズン|クール|部)|Season[0-9]+|[0-9]+(st|nd|rd|th)Season)$", "", t, flags=re.I)
    t = re.sub(r"[ⅠⅡⅢⅣⅤ]+$", "", t)
    return t.lower()


def syobocal():
    """{題名キー: {"short": 略称, "yomi": よみ}} を返す（取れなければ空）"""
    try:
        src = http_get(SYOBO_URL, timeout=120)
    except Exception as e:
        log("しょぼいカレンダー 取得失敗", e)
        return {}
    out = {}
    for b in re.findall(r"<TitleItem id=\"\d+\">([\s\S]*?)</TitleItem>", src):
        def f(k):
            m = re.search(r"<%s>([\s\S]*?)</%s>" % (k, k), b)
            return html.unescape(m.group(1)).strip() if m else ""
        t, sh, ym = f("Title"), f("ShortTitle"), f("TitleYomi")
        if not t:
            continue
        v = {"short": sh, "yomi": ym}
        for k in (title_key(t), title_key(sh)):
            if k and k not in out:
                out[k] = v
    log("しょぼいカレンダー", len(out), "件")
    return out


def syobo_of(sc, title):
    """題名から略称・よみをさがす（そのまま → 季を落として → いちばん長い前方一致）"""
    if not sc or not title:
        return {}
    k = title_key(title)
    if k in sc:
        return sc[k]
    best, bl = None, 0
    for k2, v in sc.items():
        if len(k2) >= 4 and len(k2) > bl and k.startswith(k2):
            best, bl = v, len(k2)
    return best or {}


def season_slug(y, i):
    return "%d-%s" % (y, ["winter", "spring", "summer", "autumn"][i])


def anime():
    ok = False
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

    py, psi = (y, si - 1) if si else (y - 1, 3)
    jobs = {"season": "/works/" + season_slug(y, si), "prevseason": "/works/" + season_slug(py, psi), "year": "/works/%d-all" % y, "all": "/works/popular"}
    amap = rd("cache/anime-map.json", {})
    watch = rd("cache/annict-watchers.json", {})
    det = rd("cache/anime-detail.json", {})
    fmc = rd("cache/filmarks.json", {})
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
    uniq, titles = [], {}
    for k in ["season", "prevseason", "year", "all"]:
        for w in lists.get(k, []):
            titles[w["annictId"]] = w
            if w["annictId"] not in uniq:
                uniq.append(w["annictId"])
    # 視聴者数（1日1回）
    b = budget("ANNICT", 90)
    for aid in uniq:
        if b <= 0:
            break
        if (watch.get(aid) or {}).get("d") == TODAY:
            continue
        b -= 1
        try:
            src = http_get("https://annict.com/works/" + aid)
            t = text(re.sub(r"<script[\s\S]*?</script>", " ", src))
            n = re.search(r"視聴者数:\s*([\d,]+)", t)
            meta = re.search(r"(TV|映画|OVA|Web|その他)\s+(\d{4}年(?:春|夏|秋|冬)?)", t)
            off = re.search(r'href="(https?://[^"]+)"[^>]*>\s*公式サイト', src)
            watch[aid] = {"n": num(n.group(1)) if n else 0, "d": TODAY, "media": meta.group(1) if meta else "",
                          "season": meta.group(2) if meta else "", "official": off.group(1) if off else ""}
        except Exception as e:
            log("Annict 作品ページ失敗", aid, e)
        time.sleep(1.0)
    wr("cache/annict-watchers.json", watch)
    # 声優・監督・制作会社（一度だけ）
    b = budget("ANNICT_DETAIL", 25)
    for aid in uniq:
        if b <= 0:
            break
        if aid in det:
            continue
        b -= 1
        det[aid] = annict_detail(aid)
        time.sleep(1.0)
    wr("cache/anime-detail.json", det)
    # AniList と結びつける（表紙・ジャンル）
    b = budget("MAP", 60)
    for aid in uniq:
        if b <= 0:
            break
        if aid in amap:
            continue
        b -= 1
        try:
            d = anilist('query($s:String){Page(perPage:6){media(type:ANIME,search:$s){%s}}}' % AL_FIELDS, {"s": titles[aid]["title"]})
            cand = d["Page"]["media"]
            nt = norm(titles[aid]["title"])
            best = next((m for m in cand if norm((m.get("title") or {}).get("native")) == nt), None) \
                or next((m for m in cand if nt and norm((m.get("title") or {}).get("native")).startswith(nt[:10])), None)
            amap[aid] = {k2: best.get(k2) for k2 in ("id", "coverImage", "bannerImage", "genres", "format", "status", "siteUrl")} if best else {"none": 1}
        except Exception as e:
            log("AniList 対応づけ失敗", titles[aid]["title"], e)
            if "混雑" in str(e):
                break
        time.sleep(2.1)
    # ★★ 2026-09-22 ご指定「話数構成も」。結びつけずみの作品の話数と1話の長さを、50件ずつまとめて聞く
    need = [aid for aid, m in amap.items() if m.get("id") and "ep" not in m]
    for i in range(0, min(len(need), 150), 50):
        grp = need[i:i + 50]
        try:
            d = anilist('query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:ANIME){id episodes duration}}}', {"ids": [int(amap[a]["id"]) for a in grp]})
            got = {str(m["id"]): m for m in d["Page"]["media"]}
            for a in grp:
                m = got.get(str(amap[a]["id"])) or {}
                amap[a]["ep"] = m.get("episodes")
                amap[a]["dur"] = m.get("duration")
        except Exception as e:
            log("AniList 話数 失敗", e)
            break
        time.sleep(2.1)
    wr("cache/anime-map.json", amap)
    # Filmarks（国内の評価・あらすじ・レビュー）
    b = budget("FM", 25)
    for aid in uniq:
        if b <= 0:
            break
        if aid in fmc and (fmc[aid].get("none") or fmc[aid].get("rv") == 3):
            continue
        b -= 1
        try:
            hit = fm_search(titles[aid]["title"])
            if hit:
                hit["reviews"] = fm_reviews(hit["url"]) if hit.get("url") else []
                hit["rv"] = 3
                fmc[aid] = hit
            else:
                fmc[aid] = {"none": 1}
        except Exception as e:
            log("Filmarks 失敗", titles[aid]["title"], e)
        time.sleep(1.5)
    wr("cache/filmarks.json", fmc)

    def view(w, rank):
        aid = w["annictId"]
        m = amap.get(aid) or {}
        m = {} if m.get("none") else m
        wa = watch.get(aid) or {}
        dd = det.get(aid) or {}
        fm = fmc.get(aid) or {}
        fm = {} if fm.get("none") else fm
        wid = str(m["id"]) if m.get("id") else "an" + aid
        return {"id": wid, "rank": rank, "title": w["title"], "watchers": wa.get("n", 0), "seasonText": wa.get("season", ""),
                "media": wa.get("media", ""), "annictId": aid, "annictUrl": "https://annict.com/works/" + aid, "official": wa.get("official", ""),
                "image": ((m.get("coverImage") or {}).get("extraLarge")) or w.get("image"), "banner": m.get("bannerImage") or None,
                "genres": [GENRE_JA.get(g, g) for g in (m.get("genres") or [])], "format": m.get("format") or "", "status": m.get("status") or "",
                "anilist": bool(m.get("id")), "director": dd.get("director", ""), "studio": dd.get("studio", "") or (fm.get("studios") or [""])[0],
                "cast": dd.get("cast", [])[:12], "staff": dd.get("staff", [])[:12],
                "fmScore": fm.get("score"), "fmUrl": fm.get("url", ""), "synopsis": fm.get("synopsis", ""), "reviews": (fm.get("reviews") or [])[:12],
                "episodes": m.get("ep"), "duration": ("%d分" % m["dur"]) if m.get("dur") else fm.get("duration", "")}
    index = {x["id"]: x for x in rd("index/anime.json", []) if isinstance(x, dict) and not str(x.get("id", "")).startswith("fm")}
    for k, works in lists.items():
        ents, ids = [], []
        for w in works:
            v = view(w, len(ids) + 1)
            if v["id"] in ids:
                continue
            ids.append(v["id"])
            ents.append(v)
            index[v["id"]] = v
        record("anime_jp-" + k, ids, ents, {"source": "https://annict.com" + jobs[k]})
        ok = True
    # Filmarks の「今話題のアニメ」（国内の評価つき）
    try:
        cs = []   # ★★ 2026-09-22c Filmarks のランキングはやめた（ご指定）。あらすじ・レビューは作品ごとの検索でだけ使う
        ents, ids = [], []
        for c in cs[:60]:
            wid = "fm" + re.sub(r"\D", "_", c["url"].replace(FM + "/animes/", "")) if c["url"] else "fm" + str(len(ids))
            if wid in ids:
                continue
            ids.append(wid)
            ents.append({"id": wid, "rank": len(ids), "title": c["title"], "image": c["image"], "fmScore": c["score"], "fmUrl": c["url"],
                         "synopsis": c["synopsis"], "studio": (c["studios"] or [""])[0], "genres": [], "seasonText": c["date"][:7].replace("-", "/"),
                         "releaseDate": c["date"], "media": "", "watchers": 0, "anilist": False, "duration": c.get("duration", "")})
            index[wid] = ents[-1]
        if ents:
            record("anime_fm-trend", ids, ents, {"source": FM + "/list-anime/trend"})
            log("Filmarks trend", len(ents))
            ok = True
    except Exception as e:
        log("Filmarks trend 失敗", e)
    # ★★ 略称・よみ（しょぼいカレンダー）を全作品に付ける。取れなければ何も変わらない。
    sc = syobocal()
    if sc:
        for v in index.values():
            got = syobo_of(sc, v.get("title"))
            if got.get("short") and got["short"] != v.get("title"):
                v["short"] = got["short"]
            if got.get("yomi"):
                v["yomi"] = got["yomi"]
    wr("index/anime.json", list(index.values())[-INDEX_MAX:])
    # 一覧のほうにも略称を写す（詳細を開かなくても検索に効くように）
    for f in sorted(os.listdir(os.path.join(OUT, "lists"))) if os.path.isdir(os.path.join(OUT, "lists")) else []:
        if not f.startswith("anime_"):
            continue
        L = rd("lists/" + f, None)
        if not L:
            continue
        ch = False
        for e in L.get("entries", []):
            v = index.get(e["id"])
            if v and v.get("short") and not e.get("short"):
                e["short"] = v["short"]; ch = True
            if v and v.get("yomi") and not e.get("yomi"):
                e["yomi"] = v["yomi"]; ch = True
        if ch:
            wr("lists/" + f, L)
    return ok


# ══════════ 映画（ご指定「映画の興行収入ランキング・メインは国内」） ══════════
# ★★ 2026-09-22
#   国内 … 映画.com の「国内映画ランキング」（週末の観客動員＝興行通信社調べ。先週の順位・公開館数・上映週つき）
#   国内の興行収入 … Box Office Mojo の日本の週末・年間（金額は米ドル換算で公開されている）
#   全米 … 映画.com の「全米映画ランキング」（週末の興収・累計の興収つき）
#   作品の中身（上映時間・監督・出演・あらすじ・評価）は映画.com の作品ページの構造化データから。
EIGA = "https://eiga.com"
MOJO = "https://www.boxofficemojo.com"
MOJO_DIST = {"Toho": "東宝", "Shochiku": "松竹", "Toei": "東映", "Warner": "ワーナー", "Sony": "ソニー", "Disney": "ディズニー",
             "Universal": "ユニバーサル", "Aniplex": "アニプレックス", "Kadokawa": "KADOKAWA", "Gaga": "ギャガ", "Happinet": "ハピネット",
             "Avex": "エイベックス", "Towa": "東和", "Paramount": "パラマウント", "Bitters": "ビターズ", "Pony": "ポニー", "Nikkatsu": "日活",
             "Klockworx": "クロックワークス", "Showgate": "ショウゲート", "Kino": "キノ", "Asmik": "アスミック", "Shout": "ショウゲート",
             "Bandai": "バンダイ", "Kinoshita": "木下", "Tohokushinsha": "東北新社", "Twin": "ツイン", "K2": "K2", "Culture": "カルチュア"}


def parse_eiga_rank(src, us=False):
    out = []
    for m in re.finditer(r'<th abbr="(\d+)位">([\s\S]*?)</tr>', src):
        rank, b = int(m.group(1)), m.group(2)
        mid = re.search(r'href="/movie/(\d+)/"', b)
        if not mid:
            continue
        lw = re.search(r'last-week (\w+)">([^<]*)<', b)
        img = re.search(r'<img[^>]+src="(https://media\.eiga\.com/[^"]+)"', b)
        tt = re.search(r'<h2 class="title">\s*<a[^>]*>([\s\S]*?)</a>', b)
        raw = tt.group(1) if tt else ""
        en, ja = "", text(raw)
        if us and "<br" in raw:
            en = text(raw.split("<br")[0])
            j2 = re.search(r"「([\s\S]+)」", text(raw))
            ja = j2.group(1) if j2 else en
        dist = re.search(r"配給：([^<]+)</p>", b)
        dist_us = re.search(r"</h2>\s*<p>([\s\S]*?)</p>", b) if us else None
        inc = re.findall(r'<span class="income">([\d,]+)</span>', b)
        # ★ 同じ映画が国内と全米の両方に出るので、全米は別の id にする（混ぜると配給や題名が上書きされる）
        out.append({"id": ("eu" if us else "e") + mid.group(1), "eid": mid.group(1), "title": ja, "en": en, "image": img.group(1).replace("/160.jpg", ".jpg") if img else None,
                    "lw": None if (not lw or lw.group(1) == "new" or not lw.group(2).strip().isdigit()) else int(lw.group(2)),
                    "isNew": bool(lw and lw.group(1) == "new"),
                    "dist": text(dist.group(1)) if dist else (text(dist_us.group(1)) if dist_us else ""),
                    "screens": num(re.search(r'class="screen">([\d,]+)<', b).group(1)) if re.search(r'class="screen">([\d,]+)<', b) else None,
                    "weeks": num(re.search(r'class="weeks">(\d+)<', b).group(1)) if re.search(r'class="weeks">(\d+)<', b) else None,
                    "weekendGross": ("$" + inc[0]) if us and len(inc) > 0 else "", "totalGross": ("$" + inc[1]) if us and len(inc) > 1 else "",
                    "market": "us" if us else "jp", "url": EIGA + "/movie/" + mid.group(1) + "/", "rank": rank})
    return out


def parse_eiga_detail(src):
    """作品ページの構造化データ（JSON-LD）と「2026年製作／145分／G／日本」の行"""
    d = {"dv": 1}
    for m in re.finditer(r'<script type="application/ld\+json">([\s\S]*?)</script>', src):
        try:
            j = json.loads(m.group(1))
        except Exception:
            continue
        for o in (j if isinstance(j, list) else [j]):
            if not isinstance(o, dict) or o.get("@type") != "Movie":
                continue
            d["director"] = "・".join(p.get("name", "") for p in (o.get("director") or [])[:3] if isinstance(p, dict))
            d["cast"] = [{"n": p.get("name", "")} for p in (o.get("actor") or [])[:12] if isinstance(p, dict)]
            d["origin"] = "・".join(p.get("name", "") for p in (o.get("author") or [])[:2] if isinstance(p, dict))
            d["synopsis"] = str(o.get("description") or "")[:400]
            d["releaseDate"] = str(o.get("datePublished") or "")[:10]
            g = o.get("genre")
            d["genres"] = [x for x in (g if isinstance(g, list) else [g] if g else []) if x and x.strip("-－ ")][:6]
            ar = o.get("aggregateRating") or {}
            if ar.get("ratingValue"):
                d["rating"] = float(ar["ratingValue"])
                d["votes"] = num(str(ar.get("ratingCount") or ar.get("reviewCount") or 0))
            if o.get("image") and not d.get("image"):
                d["image"] = o["image"] if isinstance(o["image"], str) else (o["image"] or {}).get("url")
    line = re.search(r'<p class="data">\s*([\s\S]*?)</p>', src)
    if line:
        t = text(line.group(1).replace("<br/>", "／").replace("<br>", "／"))
        mm = re.search(r"(\d{4})年製作／(\d+)分(?:／([^／]+))?／([^／]+)", t)
        if mm:
            d["year"], d["length"] = int(mm.group(1)), mm.group(2) + "分"
            d["certif"], d["country"] = (mm.group(3) or "").strip(), mm.group(4).strip()
        ds = re.search(r"配給：([^／]+)", t)
        if ds:
            d["dist"] = ds.group(1).strip()
    if not d.get("genres"):
        d["genres"] = [text(x) for x in re.findall(r'href="/search/[^"]*genre[^"]*"[^>]*>([^<]{1,16})</a>', src)][:6]
    return d


def mojo_table(src):
    """Box Office Mojo の表 → [{列名: 値, "_rl": release id}]"""
    rows = re.findall(r"<tr>([\s\S]*?)</tr>", src)
    if not rows:
        return []
    head = [text(c) for c in re.findall(r"<th[^>]*>([\s\S]*?)</th>", rows[0])]
    out = []
    for r in rows[1:]:
        cells = [text(c) for c in re.findall(r"<td[^>]*>([\s\S]*?)</td>", r)]
        if len(cells) < 3:
            continue
        o = dict(zip(head, cells))
        rl = re.search(r'href="/release/(rl\d+)/', r)
        o["_rl"] = rl.group(1) if rl else ""
        out.append(o)
    return out


def dist_ok(en, ja):
    en, ja = str(en or ""), str(ja or "")
    return any(k.lower() in en.lower() and v in ja for k, v in MOJO_DIST.items())


def movie():
    ok = False
    index = {x["id"]: x for x in rd("index/movie.json", []) if isinstance(x, dict)}
    det = rd("cache/movie-detail.json", {})
    lists = {}
    for key, path, us in (("jp-weekend", "/ranking/jp/", False), ("us-weekend", "/ranking/us/", True)):
        try:
            lists[key] = parse_eiga_rank(http_get(EIGA + path), us)
            log("映画", key, len(lists[key]))
        except Exception as e:
            log("映画 取得失敗", key, e)
        time.sleep(1.2)
    # 作品ページ（上映時間・監督・出演・あらすじ・評価）… 一度読んだら 14日は読み直さない
    b = budget("MOVIE_DETAIL", 40)
    for key in ("jp-weekend", "us-weekend"):
        for v in lists.get(key, []):
            if b <= 0:
                break
            d0 = det.get(v["id"]) or {}
            if d0.get("d") and d0["d"] >= (NOW - datetime.timedelta(days=14)).strftime("%Y-%m-%d"):
                continue
            b -= 1
            try:
                d1 = parse_eiga_detail(http_get(v["url"]))
                d1["d"] = TODAY
                det[v["id"]] = d1
            except Exception as e:
                log("映画 作品ページ失敗", v["id"], e)
            time.sleep(1.2)
    wr("cache/movie-detail.json", det)

    def full(v):
        d = dict(det.get(v["id"]) or {})
        d.pop("d", None)
        x = dict(index.get(v["id"], {}), **{k: val for k, val in d.items() if val})
        x.update({k: val for k, val in v.items() if val is not None and val != ""})
        if not x.get("image") and d.get("image"):
            x["image"] = d["image"]
        return x
    for key, items in lists.items():
        ents = [full(v) for v in items]
        for e in ents:
            index[e["id"]] = e
        if ents:
            record("movie_" + key, [e["id"] for e in ents], ents, {"source": EIGA + ("/ranking/jp/" if key.startswith("jp") else "/ranking/us/")})
            ok = True
    # 国内の興行収入（Box Office Mojo）… 映画.com の作品と「上映週・配給」で結びつける
    jp = lists.get("jp-weekend", [])
    try:
        by = http_get(MOJO + "/weekend/by-year/%d/?area=JP" % NOW.year)
        wk = re.search(r'href="(/weekend/\d{4}W\d+/\?area=JP)', by)
        rows = mojo_table(http_get(MOJO + wk.group(1))) if wk else []
        time.sleep(1.2)
        ents = []
        for o in rows:
            wks = num(re.sub(r"\D", "", o.get("Weeks", "")) or 0)
            cand = [v for v in jp if v.get("weeks") and abs(v["weeks"] - wks) <= 1 and dist_ok(o.get("Distributor"), v.get("dist"))]
            v = cand[0] if len(cand) >= 1 else None
            base = full(v) if v else {"id": "bo" + o["_rl"], "title": o.get("Release", ""), "en": o.get("Release", ""), "market": "jp", "dist": o.get("Distributor", ""),
                                       "url": MOJO + "/release/" + o["_rl"] + "/"}
            e = dict(base, weekendGross=o.get("Gross", ""), totalGross=o.get("Total Gross", ""), weeks=wks or base.get("weeks"), boUrl=MOJO + "/release/" + o["_rl"] + "/")
            # ★ 先週の順位は Box Office Mojo の表のもの（映画.com の順位とは数えかたが違う）
            lwv = re.sub(r"\D", "", o.get("LW", ""))
            e["lw"] = int(lwv) if lwv else None
            if any(x["id"] == e["id"] for x in ents):
                continue
            ents.append(e)
            index[e["id"]] = dict(index.get(e["id"], {}), **e)
        if ents:
            record("movie_bo-weekend", [e["id"] for e in ents], ents, {"source": MOJO + wk.group(1), "note": "金額は米ドル換算（Box Office Mojo）"})
            log("映画 国内興収 週末", len(ents))
            ok = True
    except Exception as e:
        log("映画 国内興収 失敗", e)
    try:
        rows = mojo_table(http_get(MOJO + "/year/%d/?area=JP" % NOW.year))
        time.sleep(1.2)
        # 公開日（"Jul 18"）＋配給で、これまでに取った映画.com の作品と結びつける
        mon = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
        ents = []
        for o in rows[:100]:
            rd_ = re.match(r"([A-Z][a-z]{2})\s+(\d+)", o.get("Release Date", ""))
            date = "%d-%02d-%02d" % (NOW.year, mon.get(rd_.group(1), 1), int(rd_.group(2))) if rd_ else ""
            v = next((x for x in index.values() if x.get("market") == "jp" and x.get("releaseDate") == date and dist_ok(o.get("Distributor"), x.get("dist"))), None) if date else None
            base = dict(v) if v else {"id": "bo" + o["_rl"], "title": o.get("Release", ""), "en": o.get("Release", ""), "market": "jp", "dist": o.get("Distributor", ""),
                                       "url": MOJO + "/release/" + o["_rl"] + "/", "releaseDate": date}
            rt = re.match(r"(\d+)\s*hr\s*(\d+)?", o.get("Running Time", ""))
            # ★ 年間の表は「Gross」と「Total Gross」の2列。更新が遅れている列があるので、大きいほうを使う
            gs = [x for x in (o.get("Gross", ""), o.get("Total Gross", "")) if re.search(r"\d", x or "")]
            e = dict(base, yearGross=max(gs, key=lambda x: int(re.sub(r"\D", "", x))) if gs else "", boUrl=MOJO + "/release/" + o["_rl"] + "/")
            e.pop("lw", None)          # 年間の表に「先週」は無い
            if rt and not e.get("length"):
                e["length"] = "%d分" % (int(rt.group(1)) * 60 + int(rt.group(2) or 0))
            if o.get("Genre") and not e.get("genres"):
                e["genres"] = [o["Genre"]]
            if any(x["id"] == e["id"] for x in ents):
                continue
            ents.append(e)
            index[e["id"]] = dict(index.get(e["id"], {}), **e)
        if ents:
            record("movie_bo-year", [e["id"] for e in ents], ents, {"source": MOJO + "/year/%d/?area=JP" % NOW.year, "note": "今年公開・国内の興行収入（米ドル換算・Box Office Mojo）"})
            log("映画 国内興収 年間", len(ents))
            ok = True
    except Exception as e:
        log("映画 国内興収 年間 失敗", e)
    # ★★ 2026-09-22b ご指定「映画の興行収入は歴代ランキングも」。
    #   興行通信社の「歴代興収ベスト100」（億円・日本語の題名・配給・公開日・邦画の印）。
    #   ポスターと上映時間などは、映画.com の検索で作品を見つけて作品ページから（1回20本まで・見つけたら覚える）。
    try:
        src = http_get("https://www.kogyotsushin.com/archives/alltime/")
        emap = rd("cache/movie-eiga-map.json", {})
        b = budget("MOVIE_ALLTIME", 20)
        ents = []
        for m in re.finditer(r'<tr[^>]*>\s*<th scope="row">(\d+)</th>\s*<td class="t[^"]*">([\s\S]*?)</td>\s*<td>([\s\S]*?)</td>\s*<td>([\d.,]+)</td>\s*<td>([\d/]+)</td>\s*<td>([\s\S]*?)</td>', src):
            rank, title, dist, oku, date, jp = int(m.group(1)), text(m.group(2)), text(m.group(3)), m.group(4), m.group(5).replace("/", "-"), "*" in m.group(6)
            key = norm(title) + "|" + date[:4]
            eid = emap.get(key)
            if eid is None and b > 0:
                b -= 1
                try:
                    res = http_get(EIGA + "/search/" + urllib.parse.quote(title) + "/")
                    cands = [(mm.group(1), norm(text(mm.group(2)))) for mm in re.finditer(r'href="/movie/(\d+)/"[^>]*>([\s\S]{0,200}?)</a>', res)]
                    nt = norm(title)
                    hit = next((c for c in cands if c[1] == nt), None) or next((c for c in cands if c[1] == nt + "（" + date[:4] + "）" or c[1] == nt + "(" + date[:4] + ")"), None)
                    eid = hit[0] if hit else ""
                    emap[key] = eid
                    if eid and ("e" + eid) not in det:
                        time.sleep(1.2)
                        d1 = parse_eiga_detail(http_get(EIGA + "/movie/" + eid + "/"))
                        d1["d"] = TODAY
                        det["e" + eid] = d1
                except Exception as e:
                    log("映画 歴代 検索失敗", title, e)
                time.sleep(1.2)
            base = full({"id": "e" + eid}) if eid else {}
            e = dict(base, id=("e" + eid) if eid else "at" + str(zlib.crc32(key.encode("utf-8"))), title=title, dist=dist, allGross=oku + "億円",
                     releaseDate=date, country=base.get("country") or ("日本" if jp else "海外"), market="jp", rank=rank,
                     url=(EIGA + "/movie/" + eid + "/") if eid else "https://www.kogyotsushin.com/archives/alltime/")
            if eid and not e.get("image"):
                e["image"] = (det.get("e" + eid) or {}).get("image")
            e.pop("lw", None)
            ents.append(e)
            index[e["id"]] = dict(index.get(e["id"], {}), **e)
        wr("cache/movie-eiga-map.json", emap)
        wr("cache/movie-detail.json", det)
        if ents:
            record("movie_bo-all", [e["id"] for e in ents], ents, {"source": "https://www.kogyotsushin.com/archives/alltime/", "note": "歴代の国内興行収入（億円・興行通信社調べ）"})
            log("映画 歴代興収", len(ents))
            ok = True
    except Exception as e:
        log("映画 歴代興収 失敗", e)
    wr("index/movie.json", list(index.values())[-INDEX_MAX:])
    return ok


# ══════════ ご褒美版などの特別版アニメ（dアニメストア・DMM TV） ══════════
# ★★ 2026-09-22 ご指定「ご褒美バージョンなどがあるアニメの DMM TV や dアニメストアなどの特集ページ」。
#   dアニメストア … サイトの検索が読む公開 JSON（rest/WS000105）。鍵はいらない。
#   DMM TV      … サイトが読む公開の GraphQL（searchVideos）。鍵はいらない。
#   どちらも「ご褒美・解放・謎の光なし…」を検索して、題名に特別版の印がある作品だけを残す。
#   ★ DMM TV の「オリエア版」は<b>放送と同じ版</b>（＝特別版ではない）なので入れない。
SP_WORDS = ["ご褒美", "解放版", "謎の光", "湯気", "無修正", "限界突破", "完全版", "ディレクターズカット"]
# ★ 「ご褒美版」のような<b>サービス（お色気）版</b>の印。DMM TV はアニメ以外（実写の完全版・ノーカットの舞台など）が
#   たくさん混ざるので、この印だけにする。dアニメストアはアニメだけの店なので「完全版・ディレクターズカット」も入れる。
SP_FAN = re.compile(r"ご褒美|解放版|Hネルギー|謎の光|光なし|湯気|限界突破|解禁版|無修正\s*(?:Ver|版|オリジナル)|[＜《（(【]無修正", re.I)
SP_MARK = re.compile(SP_FAN.pattern + r"|完全版|ディレクターズ", re.I)
SP_LABEL = [("ご褒美", "ご褒美版"), ("解放", "解放版"), ("解禁", "解禁版"), ("謎の光", "謎の光なし"), ("光なし", "謎の光なし"), ("湯気", "湯気なし"),
            ("無修正", "無修正版"), ("ディレクターズ", "ディレクターズカット"), ("限界突破", "限界突破版"), ("Hネルギー", "解放版"), ("規制解除", "規制解除版"),
            ("完全版", "完全版")]


def sp_label(t):
    return next((lb for k, lb in SP_LABEL if k.lower() in t.lower()), "特別版")
# （SP_LABEL に無いものは、かっこの中の言葉＝「かくしてない版」などをそのまま札にする）


def dmm_gql(query, variables):
    body = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = urllib.request.Request("https://api.tv.dmm.com/graphql", data=body,
                                 headers={"Content-Type": "application/json", "Origin": "https://tv.dmm.com", "Referer": "https://tv.dmm.com/", "User-Agent": UA})
    return json.loads(urllib.request.urlopen(req, timeout=40).read().decode("utf-8"))


# ★★ 2026-09-22b ご指定「特別版は DMM TV だけ」「範囲を広げて表示数を増やして」「アニメのランキングに DMM TV も」。
#   DMM TV は categories:["15"]（＝アニメ）で検索を<b>アニメだけ</b>に絞れる。実写が混ざらないので、
#   「【◯◯版】《◯◯Ver.》」のような<b>かっこ付きの版</b>を広く拾い、放送と同じ版・吹替・リマスターなどだけ外す。
#   作品の中身（話数・評価・声優・監督・ジャンル・あらすじ）は video(id) で1本ずつ（覚えておく）。
DMM_VIDEO = """id titleName seasonName packageImage description startPublicAt genres{ name } categories{ id name }
  casts{ castName actorName } staffs{ roleName staffName }
  ... on VideoSeason { keyVisualImage episodes(first:1){ total edges{ node{ playInfo{ duration } } } } reviewSummary{ averagePoint reviewerCount } }"""
SP_BRACKET = re.compile(r"[【《＜〈\[(（]([^】》＞〉\])）]{1,20}?(?:版|[Vv]er\.?|バージョン))[】》＞〉\])）]")
SP_SKIP = re.compile(r"オンエア|放送|吹替|字幕|TV|リマスター|HD|劇場|総集|編集|カット版|日本語|英語|先行|短縮|前編|後編|特別編|ダイジェスト|配信|3D|4K|ノーカット|OVA|リミックス|インターネット|CENSORED|かくしてる|全面規制|規制版|修正版|web|WEB", re.I)


def dmm_title(t, s):
    """★ シーズン名が「第4期」「【◯◯版】」だけのことがあるので、作品名とつなげる"""
    t, s = (t or "").strip(), (s or "").strip()
    if not s:
        return t
    if not t or t in s:
        return s
    # 頭の4文字が同じ＝シーズン名だけで作品名がわかる（「無職転生Ⅲ …」など）
    k = min(4, len(t))
    if s[:k] == t[:k]:
        return s
    return t + " " + s


def dmm_view(v):
    """DMM TV の作品 → アニメの作品の形"""
    st = v.get("staffs") or []
    rv = v.get("reviewSummary") or {}
    # ★★ 2026-09-23 ご指定「アニメは各話の長さも」。1話めの長さ（秒）を分にする
    sec = 0
    try:
        sec = int((((((v.get("episodes") or {}).get("edges") or [{}])[0].get("node") or {}).get("playInfo") or {}).get("duration") or 0))
    except Exception:
        sec = 0
    return {"title": dmm_title(v.get("titleName"), v.get("seasonName")), "image": v.get("packageImage"), "banner": v.get("keyVisualImage"),
            "genres": [g["name"] for g in (v.get("genres") or []) if g.get("name") and "DMM" not in g["name"]][:6],
            "cast": [{"n": c.get("actorName", ""), "c": c.get("castName", "")} for c in (v.get("casts") or [])[:12] if c.get("actorName")],
            "director": next((x["staffName"] for x in st if "監督" in (x.get("roleName") or "")), ""),
            "studio": next((x["staffName"] for x in st if "制作" in (x.get("roleName") or "") and "製作" not in (x.get("roleName") or "")), ""),
            "staff": [{"r": x.get("roleName", ""), "n": x.get("staffName", "")} for x in st[:12]],
            "synopsis": str(v.get("description") or "")[:400], "releaseDate": str(v.get("startPublicAt") or "")[:10],
            "episodes": ((v.get("episodes") or {}).get("total")) or None,
            "dmmRating": round(rv["averagePoint"], 2) if rv.get("averagePoint") else None, "dmmVotes": rv.get("reviewerCount"),
            "duration": ("%d分" % round(sec / 60)) if sec >= 60 else "", "dv": 2,
            "link": "https://tv.dmm.com/vod/detail/?season=" + str(v.get("id")), "service": "DMM TV"}


def dmmtv():
    """DMM TV のアニメランキング（日間・週間・月間）"""
    index = {x["id"]: x for x in rd("index/animedmm.json", []) if isinstance(x, dict)}
    ok = False
    q = 'query($t:VideoRankingTerm!){ videoRankings(device:BROWSER, term:$t, first:100, category:"15"){ edges{ node{ rank video{ %s } } } } }' % DMM_VIDEO
    for key, term in (("dmm-daily", "DAILY"), ("dmm-weekly", "WEEKLY"), ("dmm-monthly", "MONTHLY")):
        try:
            j = dmm_gql(q, {"t": term})
            ents, ids = [], []
            for e in (((j.get("data") or {}).get("videoRankings") or {}).get("edges") or []):
                v = (e.get("node") or {}).get("video") or {}
                if not v.get("id"):
                    continue
                x = dict(dmm_view(v), id="dm" + v["id"], rank=len(ids) + 1)
                if x["id"] in ids:
                    continue
                ids.append(x["id"])
                ents.append(x)
                index[x["id"]] = dict(index.get(x["id"], {}), **x)
            if ents:
                record("anime_" + key, ids, ents, {"source": "https://tv.dmm.com/vod/ranking/"})
                log("DMM TV ランキング", key, len(ents))
                ok = True
        except Exception as e:
            log("DMM TV ランキング失敗", key, e)
        time.sleep(1.2)
    wr("index/animedmm.json", list(index.values())[-INDEX_MAX:])
    return ok


# ★★ 2026-09-23 ご指定「特別版は <b>R15 以上</b>の作品を表示」「表示数が少なく、関係のないものが出ている」。
#   DMM TV の作品には <b>rating</b>（NR / G / PG12 / R15 …）がある（searchVideos の node で読める）。
#   キーワード "" で<b>アニメ全部（約6,900本）</b>を並べられるが、1つの並びでは約5,000本（50ページ）までしか
#   めくれないので、<b>並べ方を4通り</b>（既定・NEW・RANK・SALES）変えて全体をおおう。
#   そのうち rating が R15 以上の作品だけを「特別版（R15+）」として残す。題名の印（ご褒美 Ver. など）で札を付ける。
SP_RATINGS = {"R15", "R15+", "R18", "R18+", "R-15", "R-18"}


def special():
    # ★ 前回までの「印の付いた題名」だけの一覧は捨てて、毎回 R15+ で作り直す（関係のない作品を残さない）
    index = {}
    ok = False
    dm = {}
    q = 'query($a:String){ searchVideos(keyword:"", first:100, after:$a, device:BROWSER, categories:["15"]%s){ edges{ node{ id seasonName titleName packageImage packageLargeImage keyVisualImage description startDeliveryAt rating } } pageInfo{ hasNextPage endCursor } } }'
    seen = set()
    for sort in ("", ", sort:NEW", ", sort:RANK", ", sort:SALES"):
        after = None
        for page in range(52):
            try:
                j = dmm_gql(q % sort, {"a": after})
                sv = (j.get("data") or {}).get("searchVideos") or {}
                if not sv:
                    break
                for e in (sv.get("edges") or []):
                    n = e.get("node") or {}
                    nid = n.get("id")
                    if not nid or nid in seen:
                        continue
                    seen.add(nid)
                    if str(n.get("rating") or "").upper() not in SP_RATINGS:
                        continue
                    t = dmm_title(n.get("titleName"), n.get("seasonName"))
                    pic = n.get("packageLargeImage") or n.get("packageImage") or ""
                    if "/digital/" in pic:      # 成人向け VR の絵
                        continue
                    tn = unicodedata.normalize("NFKC", t)
                    br = SP_BRACKET.search(tn)
                    fan = SP_FAN.search(t) or re.search(r"完全版|ディレクターズ|規制解除|限界突破|解禁", t)
                    tag = sp_label(t) if fan else (br.group(1) if br and not SP_SKIP.search(br.group(1)) else "R15+")
                    dm[nid] = {"id": "spdm" + nid, "vid": nid, "title": t, "image": pic or n.get("keyVisualImage"), "banner": n.get("keyVisualImage"),
                               "link": "https://tv.dmm.com/vod/detail/?season=" + nid, "service": "DMM TV", "special": True,
                               "rating": str(n.get("rating") or ""), "tag": tag,
                               "synopsis": str(n.get("description") or "")[:300], "releaseDate": str(n.get("startDeliveryAt") or "")[:10]}
                pi = sv.get("pageInfo") or {}
                if not pi.get("hasNextPage"):
                    break
                after = pi.get("endCursor")
            except Exception as e:
                log("DMM TV R15 一覧の失敗", sort or "既定", page, e)
                break
            time.sleep(0.8)
    log("DMM TV R15+", len(dm), "本（全 " + str(len(seen)) + " 本から）")
    # 中身（話数・評価・声優など）… 1回60本まで・一度読んだら覚える
    vd = rd("cache/dmm-video.json", {})
    b = budget("DMM_VIDEO", 90)
    for k, x in dm.items():
        if (k in vd and (vd[k] or {}).get("dv") == 2) or b <= 0:   # ★★ 2026-09-23 長さの無い古い控えは読み直す
            continue
        b -= 1
        try:
            j = dmm_gql('query($id:ID!){ video(id:$id){ %s } }' % DMM_VIDEO, {"id": k})
            vd[k] = dmm_view((j.get("data") or {}).get("video") or {})
        except Exception as e:
            log("DMM TV 作品失敗", k, e)
            vd[k] = {}
        time.sleep(1.0)
    wr("cache/dmm-video.json", vd)
    for k, x in dm.items():
        d = vd.get(k) or {}
        for kk, vv in d.items():
            if vv and not x.get(kk) and kk not in ("title", "service"):
                x[kk] = vv
    ents = sorted(dm.values(), key=lambda v: v.get("releaseDate") or "", reverse=True)
    for i, e in enumerate(ents):
        e["rank"] = i + 1
        index[e["id"]] = dict(index.get(e["id"], {}), **e)
    if ents:
        record("anime_sp-dmm", [e["id"] for e in ents], ents, {"source": "https://tv.dmm.com/vod/"})
        log("特集 DMM TV", len(ents))
        ok = True
    wr("index/animesp.json", list(index.values()))
    try:
        ok = dmmtv() or ok
    except Exception as e:
        log("DMM TV ランキング失敗", e)
    return ok


# ══════════ 値段の記録（値下がり・セール） ══════════
# ★★ 2026-09-21e ご指定「過去の価格とくらべて安くなっているもの」「セール作品」。
#    取るたびに作品ごとの値段を cache/price-hist.json にためておき、index の各作品に
#       low（これまでの最安）・high（これまでの最高）・was（直前の、いまと違う値段）
#       dropAt（値下がりした日）・since（記録を始めた日）
#    を書き足す。アプリはこれを見て「値下がり」「セール」の画面を作る。
PRICE_KEYS = ["fanza", "danime", "fbooks", "fvideo", "dlsite"]


def price_pass():
    hist = rd("cache/price-hist.json", {})
    day = NOW.strftime("%Y-%m-%d")
    n_drop = 0
    for key in PRICE_KEYS:
        rows = rd("index/%s.json" % key, None)
        if not rows:
            continue
        H = hist.setdefault(key, {})
        for v in rows:
            p = v.get("priceN")
            if p is None and v.get("price"):
                try:
                    p = int(str(v["price"]).replace(",", ""))
                except Exception:
                    p = None
            if not p:
                continue
            h = H.setdefault(v["id"], [])
            if not h or h[-1][1] != p:
                h.append([day, p])            # 値段が変わったときだけ1行ふやす
            if len(h) > 40:
                del h[:len(h) - 40]
            # ★ 過去の値段は「実際に売られていた値段」の記録だけで見る。
            #   元の値段（listPrice）を混ぜると、セール中の作品がぜんぶ「値下がり」に入ってしまう。
            ps = [x[1] for x in h]
            v["low"], v["high"], v["since"] = min(ps), max(ps), h[0][0]
            prev = [x for x in h[:-1] if x[1] != p]
            if prev:
                v["was"] = prev[-1][1]
                if p < prev[-1][1]:
                    v["dropAt"] = h[-1][0]
                    n_drop += 1
            else:
                v.pop("was", None); v.pop("dropAt", None)
        wr("index/%s.json" % key, rows)
    wr("cache/price-hist.json", hist)
    log("値段の記録", "値下がり", n_drop, "件")


# ══════════ 本体 ══════════
def main():
    os.makedirs(OUT, exist_ok=True)
    meta = rd("meta.json", {})
    res = {}
    for name, fn in (("karaoke", karaoke), ("music", music), ("anime", anime),
                     ("dlsite", dlsite), ("danime", danime), ("fanza", fanza),
                     ("fbooks", fbooks), ("fvideo", fvideo), ("movie", movie), ("special", special)):
        if ONLY and name not in ONLY:
            continue
        try:
            res[name] = fn()
        except Exception as e:
            log(name, "失敗", e)
            res[name] = False
        if res[name]:
            meta[name + "At"] = NOW_MS
    for nm2, fn2 in (("also-fanza", lambda: fz_also("fanza")), ("also-danime", lambda: fz_also("danime")), ("also-dlsite", dl_also), ("campaign", campaigns)):
        if ONLY and not ({"fanza", "danime", "dlsite", "campaign"} & ONLY):
            break
        if nm2 == "also-fanza" and ONLY and "fanza" not in ONLY:
            continue
        if nm2 == "also-danime" and ONLY and "danime" not in ONLY:
            continue
        if nm2 == "also-dlsite" and ONLY and "dlsite" not in ONLY:
            continue
        if nm2 == "campaign" and ONLY and "campaign" not in ONLY:
            continue
        try:
            r2 = fn2()
            if nm2 == "campaign" and r2:
                meta["campaignAt"] = NOW_MS
        except Exception as e:
            log(nm2, "失敗", e)
    try:
        price_pass()
    except Exception as e:
        log("値段の記録 失敗", e)
    meta["at"] = int(time.time() * 1000)      # ★ 取り終わった時刻（「最後に取れたのは◯分前」に使う）
    meta["startAt"] = NOW_MS
    meta["log"] = ((meta.get("log") or []) + LOG)[-80:]
    # ★★ 2026-09-21e 「いつ動いたか」がアプリで分かるように、実行ごとの記録を残す（最新24回）
    runs = meta.get("runs") or []
    runs.append({"at": NOW_MS, "sec": int(time.time() - T0), "ok": [k for k, v in res.items() if v],
                 "ng": [k for k, v in res.items() if not v], "host": os.environ.get("COMPUTERNAME", "")})
    meta["runs"] = runs[-24:]
    it_cache_save()
    wr("state.json", STATE)
    wr("meta.json", meta)
    log("完了", res)
    if res and not any(res.values()):
        sys.exit(1)


if __name__ == "__main__":
    main()

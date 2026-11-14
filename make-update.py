#!/usr/bin/env python3
"""XEVARION 更新パッケージ情報 (update.json) を作る。

ポータルと3アプリの Service Worker が事前キャッシュするファイル一覧（CORE）を読み、
実ファイルの合計サイズを数えて update.json を書き出す。
ホームはこの update.json を見て「更新があります（約 N MB）」を出し、
ダウンロードしてから反映する。

使い方:  python make-update.py "ホーム画面リニューアル" "変更点1" "変更点2" ...
引数を省略すると VERSION 日付だけ更新する。
"""
import io, json, os, re, sys, datetime, hashlib

BASE = os.path.dirname(os.path.abspath(__file__))
# xev-refresh（まとめて最新化）に応じる SW をすべて並べる。
# ★ ここに載っていない SW のファイルは「パッケージ外」と見なされ、
#   ホームのダウンロード量表示で端末の実行時キャッシュぶんとして数えられる。
#   MagiMusic も更新の対象になったので加える（曲＝MP3 は別キャッシュで対象外）。
SWS = ["sw.js", "MagiLex/sw.js", "MagiBurst/sw.js", "MagiChainParty/sw.js", "XEVYNAR/sw.js",
       "MagiJackpot/sw.js", "MagiMusic/sw.js", "MagiLotto/sw.js",
       # ★★ 2026-09-03 新作 Magi Dominion Grid
       "MagiDominionGrid/sw.js",
       # ★★ 2026-09-08 新作 MagiCounter（Pokémon Champions 対戦支援）
       "MagiCounter/sw.js",
       # ★★ 2026-09-08 新作 Magi: Boccia Rush
       "MagiBocciaRush/sw.js",
       # ★★ 2026-09-18 新作 MagiRail（鉄道経営シミュレーション）
       "MagiRail/sw.js",
       # ★★ 2026-09-20 新作 MagiScope（エンタメランキング）
       "MagiScope/sw.js",
       # ★★ 2026-09-21 新作 MagiShift（対戦ボードゲーム）
       "MagiShift/sw.js",
       # ★★ 2026-10-05 新作 MagiAbyss（見下ろし型ドットアクションRPG）
       "MagiAbyss/sw.js",
       # ★★ 2026-10-06 新作 MagiChemLex（難関化学の問題集）
       "MagiChemLex/sw.js",
       # ★★ 2026-10-21 新作 MagiDerby（実際の JRA GⅠ に XEVA で賭ける）
       "MagiDerby/sw.js",
       # ★★ 2026-10-23 新作 MagiQuiz（MagiChemLex の基礎問題で遊ぶ1台のクイズ対戦）
       "MagiQuiz/sw.js",
       # ★★ 2026-10-30 NGX・ISHIDA Production の公式サイトもオフラインで（ご指定）
       "NGX/sw.js", "IshidaProduction/sw.js",
       # ★★ 2026-10-31 MagiBattle 3.0（作り直し）の SW
       "MagiBattle/sw.js",
       # ★★ 2026-11-08 新作 MagiMarket（キオクシアの株・ジェフ千葉の試合に XEVA）
       "MagiMarket/sw.js"]


# ══════════════════════════════════════════════════════════════
# ★★ 2026-08-22b 「この版でどのアプリが変わったか」を出す
# ------------------------------------------------------------
# ホームの下バーとアプリ一覧に「更新があった印」を付けるために、
# update.json に apps（変わったアプリのキー）を入れる。
#
# 仕組み
#   ・パッケージに入る全ファイルの中身のハッシュを update-hashes.json に控える。
#   ・次に作るとき、前回のハッシュと突き合わせて<b>変わったファイル</b>を出す。
#   ・変わったファイルのパスから「どのアプリか」を決める（下の APP_OF）。
# ★ update-hashes.json は<b>作る側だけが使う</b>ので、SW の CORE には入れない
#   （端末に配る必要がないうえ、毎回変わるので配ると無駄な通信になる）。
# ══════════════════════════════════════════════════════════════
HASH_FILE = "update-hashes.json"
# フォルダ名を小文字にしたものが、そのままホームのアプリID（XH_APPS の id）になる。
# ならないものだけここで読み替える。
FOLDER_APP = {
    "ishidaproduction": "ishida",
    "magibattle": "magibattle",
}
# ★★ 2026-09-09 アプリではない<b>共通の置き場</b>。
#   ここを見逃すと apps に "img" や "thumbs" が入り、
#   どのタイルにも当たらない印が<b>消せないまま残る</b>。
SHARED_DIRS = {"img", "thumbs", "brand", "icons", "home-mate", "expo", "events", "jef"}   # ★★ 2026-11-08 jef＝ジェフ千葉のホームの絵   # ★ 2026-09-24 home-mate＝ホームの動くキャラ・09-28 expo＝3D 会場・10-06 events＝共通イベントの絵
# ルート直下のファイルは「どのタブの話か」に振り分ける（tab: を付けて区別する）
ROOT_TAB = {
    "gacha.html": "tab:gacha", "gacha-ui.js": "tab:gacha",
    "mb-boot.js": "tab:gacha", "mb-char-detail.js": "tab:gacha",
    "mb-char-detail.css": "tab:gacha", "mb-gacha-reveal.css": "tab:gacha",
    "mb-newchars.js": "tab:gacha",
    "characters.html": "tab:chars",
    "community.html": "tab:community",
}


def file_hash(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def app_of(path):
    """パッケージ内の相対パス → アプリのキー（分からなければ None）"""
    parts = path.split("/")
    if len(parts) > 1:
        low = parts[0].lower()
        if low in SHARED_DIRS:
            return "tab:home"
        return FOLDER_APP.get(low, low)
    return ROOT_TAB.get(parts[0], "tab:home")


# ══════════════════════════════════════════════════════════════
# ★★ 2026-11-12 SW の版（v）と一覧（core）は sw-list/<アプリ>.js にある
# ------------------------------------------------------------
# ご指定「更新のたびに sw のファイルをすべてアップロードするのが手間 → まとめて楽に」。
#   ・各アプリの sw.js は importScripts("../sw-list/_shared.js", "../sw-list/<アプリ>.js") で読むだけ。
#   ・更新のたびに変わるのは sw-list の中だけ（sw.js は「しくみ」を直したときだけ）。
#   ・一覧のパスは、これまでどおり<b>その sw.js から見た相対パス</b>（resolve は sw.js の場所で解く）。
# ══════════════════════════════════════════════════════════════
LIST_RE = re.compile(r'self\.XEV_SW = \{ v: "([^"]+)", core: \[(.*)\n\] \};', re.S)


def list_of(sw_path):
    """sw.js → その SW の版と一覧のファイル（sw-list/<アプリ>.js。ルートは _root.js）"""
    d = os.path.dirname(sw_path)
    return "sw-list/%s.js" % (d if d else "_root")


def read_list(sw_path):
    """(版の文字, CORE の URL のリスト)。読めなければ ("", [])"""
    p = os.path.join(BASE, list_of(sw_path))
    if not os.path.exists(p):
        return "", []
    m = LIST_RE.search(io.open(p, encoding="utf-8").read())
    if not m:
        return "", []
    return m.group(1), re.findall(r'"([^"]+)"', m.group(2))


def core_of(sw_path):
    """その SW の CORE（URL のリスト）"""
    return read_list(sw_path)[1]


# ══════════════════════════════════════════════════════════════
# ★★ 2026-11-12 SW の版（v）の上げ忘れを自動で直す
# ------------------------------------------------------------
# 「CORE のファイルを直したのに版を上げ忘れた」（＝端末の SW が入れかわらず、直したものが届かない）を、
# 手順でなく道具で防ぐ。
#   ・update-sw.json に、前回の「版」と「CORE の中身の印（URL と各ファイルの md5 をまとめた md5）」を控える。
#   ・今回の印が前回とちがうのに<b>版が前回のまま</b>なら、sw-list/<アプリ>.js の v を +1 する。
#   ・手で（または bump-v のあとで）もう上げてあれば何もしない。台帳がまだ無い SW は控えるだけ。
# ★ update-sw.json は作る側だけが使う（配らない・SW の CORE に入れない）。
# ══════════════════════════════════════════════════════════════
SW_LEDGER = "update-sw.json"


def sw_sig(sw_path):
    h = hashlib.md5()
    for u in core_of(sw_path):
        p = resolve(sw_path, u)
        if not p:
            continue
        h.update((u + "|" + (file_hash(p) if os.path.isfile(p) else "-") + "\n").encode("utf-8"))
    return h.hexdigest()[:16]


def bump_sw_versions(dry=False):
    path = os.path.join(BASE, SW_LEDGER)
    led = {}
    if os.path.exists(path):
        try:
            led = json.load(io.open(path, encoding="utf-8"))
        except Exception:
            led = {}
    bumped = []
    for sw in SWS:
        ver, core = read_list(sw)
        if not ver:
            print("!! 一覧が読めません:", list_of(sw))
            continue
        sig = sw_sig(sw)
        old = led.get(sw)
        if old and old.get("sig") != sig and old.get("v") == ver:
            m = re.search(r"v(\d+)$", ver)
            if m:
                new_ver = ver[:m.start()] + "v%d" % (int(m.group(1)) + 1)
                lp = os.path.join(BASE, list_of(sw))
                t = io.open(lp, encoding="utf-8", newline="").read()
                t2 = t.replace('v: "%s"' % ver, 'v: "%s"' % new_ver, 1)
                if t2 != t and not dry:
                    io.open(lp, "w", encoding="utf-8", newline="").write(t2)
                bumped.append("%s %s → %s" % (list_of(sw), ver, new_ver))
                ver = new_ver
        led[sw] = {"v": ver, "sig": sig}
    if not dry:
        io.open(path, "w", encoding="utf-8").write(json.dumps(led, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
    if bumped:
        print("  SW の版を自動で上げました（CORE の中身が変わっていたため）:")
        for b in bumped:
            print("   -", b)
    return bumped


# ══════════════════════════════════════════════════════════════
# ★★ 2026-11-12 アップロード用フォルダ（_upload）
# ------------------------------------------------------------
# GitHub に上げるのは「今回変わったファイル」だけでよいが、それが20以上のフォルダに散らばっていて手間だった。
# → 変わったファイルだけを、<b>同じフォルダの形のまま</b> Documents/Claude/_upload/<版>/ に写す。
#   その中身をぜんぶ選んで、GitHub の「Upload files」（リポジトリのいちばん上）へドラッグすれば、1回で正しい場所に入る。
#   ・GitHub は1回に100ファイルまでなので、100を超えたら 1・2・… のフォルダに分ける（それぞれの中身をドラッグ）。
#   ・くらべる相手は「前の版をまとめたときの全ファイルの md5」（_upload/_state.json）。同じ版を作り直したときは同じ相手とくらべる。
#   ・前の版のフォルダは消さない（まだ上げていないかもしれないため）。上げ終わったら手で消してよい。
# ★ _upload は XEVARION の外に置く（配るものではない）。
# ══════════════════════════════════════════════════════════════
UPLOAD_DIR = os.path.join(os.path.dirname(BASE), "_upload")
UPLOAD_STATE = os.path.join(UPLOAD_DIR, "_state.json")
UPLOAD_MAX = 100
UP_SKIP_DIRS = {"__pycache__", ".git", ".claude", "node_modules"}
UP_SKIP_FILES = {HASH_FILE, SW_LEDGER}
UP_SKIP_EXT = (".pyc", ".orig", ".bak", ".tmp_bump", ".tmp_ed", ".tmp_sw")


def snapshot_all():
    out = {}
    for dp, dn, fn in os.walk(BASE):
        dn[:] = [d for d in dn if d not in UP_SKIP_DIRS]
        for f in fn:
            if f in UP_SKIP_FILES or f.endswith(UP_SKIP_EXT) or f.startswith("_tmp"):
                continue
            p = os.path.join(dp, f)
            out[os.path.relpath(p, BASE).replace(os.sep, "/")] = file_hash(p)
    return out


def build_upload(version):
    import shutil
    now = snapshot_all()
    st = {}
    if os.path.exists(UPLOAD_STATE):
        try:
            st = json.load(io.open(UPLOAD_STATE, encoding="utf-8"))
        except Exception:
            st = {}
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    if not st.get("now"):
        # はじめて：いまの状態を「もう上げてあるもの」として控えるだけ
        io.open(UPLOAD_STATE, "w", encoding="utf-8").write(json.dumps({"version": version, "base": now, "now": now}, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
        print("  アップロード用フォルダ: はじめてなので、いまの状態を基準として控えました（次の版から変わったファイルを集めます）")
        return
    base = st.get("base", {}) if st.get("version") == version else st.get("now", {})
    changed = sorted(k for k, v in now.items() if base.get(k) != v)
    gone = sorted(k for k in base if k not in now)
    out = os.path.join(UPLOAD_DIR, version)
    if os.path.isdir(out):
        shutil.rmtree(out)
    # いちばん上のまとまり（ルートのファイル／フォルダごと）で、100 ファイルまでの山に分ける
    groups = {}
    for rel in changed:
        top = rel.split("/")[0] if "/" in rel else ""
        groups.setdefault(top, []).append(rel)
    parts, cur = [], []
    for top in sorted(groups, key=lambda t: (t != "", t.lower())):
        g = groups[top]
        if cur and len(cur) + len(g) > UPLOAD_MAX:
            parts.append(cur); cur = []
        while len(g) > UPLOAD_MAX:
            room = UPLOAD_MAX - len(cur)
            cur += g[:room]; g = g[room:]
            parts.append(cur); cur = []
        cur += g
    if cur:
        parts.append(cur)
    size = 0
    for i, part in enumerate(parts):
        dst_root = out if len(parts) == 1 else os.path.join(out, str(i + 1))
        for rel in part:
            src = os.path.join(BASE, rel.replace("/", os.sep))
            dst = os.path.join(dst_root, rel.replace("/", os.sep))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            size += os.path.getsize(src)
    io.open(UPLOAD_STATE, "w", encoding="utf-8").write(json.dumps({"version": version, "base": base, "now": now}, ensure_ascii=False, indent=0, sort_keys=True) + "\n")
    # よみかた（_upload のいちばん上＝版のフォルダの外に置く。中に置くと一緒に上がってしまう）
    pend = sorted(d for d in os.listdir(UPLOAD_DIR) if os.path.isdir(os.path.join(UPLOAD_DIR, d)))
    L = ["XEVARION アップロード用フォルダ（make-update.py が作ります）", "",
         "■ 使いかた",
         "  1. GitHub のリポジトリのいちばん上で「Add file」→「Upload files」を開く。",
         "  2. 下の版のフォルダを開き、中身をぜんぶ選んで（Ctrl+A）、そのままブラウザへドラッグする。",
         "     ★ 版のフォルダそのもの（%s など）や 1・2 のフォルダそのものはドラッグしない（中身をドラッグ）。" % version,
         "     ★ 1・2・… に分かれているときは、1 の中身 → Commit → 2 の中身 → Commit の順に。",
         "  3. 「Commit changes」を押す。フォルダの形のまま、正しい場所に入ります。",
         "  4. 上げ終わった版のフォルダは消して構いません（消さなくても害はありません）。",
         "",
         "■ いまあるフォルダ（古い順に上げてください）"] + ["  ・" + d for d in pend] + [
         "",
         "■ 今回（%s）: %d ファイル・%s・%s" % (version, len(changed), "%.1f MB" % (size / 1024 / 1024), ("%d 個に分割" % len(parts)) if len(parts) > 1 else "分割なし")]
    for i, part in enumerate(parts):
        if len(parts) > 1:
            L.append("  [%d] %d ファイル" % (i + 1, len(part)))
        tops = {}
        for rel in part:
            top = rel.split("/")[0] if "/" in rel else "（いちばん上のファイル）"
            tops[top] = tops.get(top, 0) + 1
        L += ["      %s … %d" % (t, n) for t, n in sorted(tops.items(), key=lambda x: (x[0] != "（いちばん上のファイル）", x[0].lower()))]
    if gone:
        L += ["", "■ この PC から消したファイル（GitHub に残っていても動作に害はありません。気になるときは GitHub で消してください）"] + ["  ・" + g for g in gone]
    io.open(os.path.join(UPLOAD_DIR, "よみかた.txt"), "w", encoding="utf-8-sig").write("\r\n".join(L) + "\r\n")
    print("  アップロード用フォルダ: %s（%d ファイル・%.1f MB%s）" % (out, len(changed), size / 1024 / 1024, "・%d 個に分割" % len(parts) if len(parts) > 1 else ""))
    if gone:
        print("  ※ この PC から消したファイル %d 件（よみかた.txt に一覧）" % len(gone))


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
    # ★★ 2026-09-25 ホームのガチャのバナー用の台帳（gacha-live.js）を mb-core.js から作り直す（変わっていれば ?v= も上げる）
    try:
        import importlib.util
        sp = importlib.util.spec_from_file_location("mgl", os.path.join(BASE, "make-gacha-live.py"))
        mgl = importlib.util.module_from_spec(sp); sp.loader.exec_module(mgl); mgl.main()
    except Exception as e:
        print("!! make-gacha-live.py failed:", e)
    # ★★ 2026-09-28 3D 会場の中身（expo/expo-data.js）も台帳から作り直す（変われば ?v= も上げる）
    try:
        import importlib.util
        sp = importlib.util.spec_from_file_location("med", os.path.join(BASE, "make-expo-data.py"))
        med = importlib.util.module_from_spec(sp); sp.loader.exec_module(med); med.main()
    except Exception as e:
        print("!! make-expo-data.py failed:", e)
    # ★★ 2026-11-12 CORE の中身が変わったのに版がそのままの SW は、ここで自動で +1（上げ忘れの保険）
    bump_sw_versions()
    total, files, missing = 0, 0, []
    seen = set()
    urls = []          # パッケージに入っているファイル（サイト直下からの相対パス）
    hashes = {}        # ★ 相対パス → 中身のハッシュ（次回の差分判定に使う）
    for sw in SWS:
        for u in core_of(sw):
            p = resolve(sw, u)
            if not p or p in seen:
                continue
            seen.add(p)
            if os.path.isfile(p):
                total += os.path.getsize(p)
                files += 1
                rel = os.path.relpath(p, BASE).replace(os.sep, "/")
                urls.append(rel)
                hashes[rel] = file_hash(p)
            else:
                missing.append(os.path.relpath(p, BASE))

    # ★ 前回のハッシュと突き合わせて「変わったファイル」→「変わったアプリ」を出す
    hash_path = os.path.join(BASE, HASH_FILE)
    prev_hashes = {}
    if os.path.exists(hash_path):
        try:
            prev_hashes = json.load(io.open(hash_path, encoding="utf-8"))
        except Exception:
            prev_hashes = {}
    changed = [k for k, v in hashes.items() if prev_hashes.get(k) != v]
    apps = sorted({app_of(k) for k in changed})
    # 前回のハッシュが1件も無い＝はじめて作るときは「全部変わった」ことになってしまうので、
    # そのときは印を付けない（初回に全アプリへバッジが出るのを避ける）。
    if not prev_hashes:
        apps = []
    io.open(hash_path, "w", encoding="utf-8").write(
        json.dumps(hashes, ensure_ascii=False, indent=0, sort_keys=True) + "\n")

    args = sys.argv[1:]
    # ★ --apps a,b,c … 変わったアプリを手で指定する（ハッシュの台帳がまだ無い初回用）。
    #   台帳ができたあとは自動で出るので、ふだんは付けなくてよい。
    apps_override = None
    rest = []
    i = 0
    while i < len(args):
        if args[i] == "--apps" and i + 1 < len(args):
            apps_override = [x.strip() for x in args[i + 1].split(",") if x.strip()]
            i += 2
            continue
        rest.append(args[i])
        i += 1
    args = rest
    if apps_override is not None:
        apps = apps_override
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
            # ★ 更新を何回か見送っていた人には、見送ったぶんの apps もまとめて印を付ける
            "apps": prev.get("apps", []),
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
        # ★★ 2026-08-22b この版で中身が変わったアプリ（ホームの「更新あり」の印に使う）
        "apps": apps,
        "changedFiles": len(changed),
        "history": history,
    }
    io.open(out_path, "w", encoding="utf-8").write(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print("update.json ->", data["version"], "|", files, "files |",
          "%.1f MB" % (total / 1024 / 1024))
    print("  変わったファイル: %d 件 / 変わったアプリ: %s"
          % (len(changed), ", ".join(apps) if apps else "（なし）"))
    if missing:
        print("  ※ 見つからないファイル (%d件):" % len(missing))
        for m in missing[:10]:
            print("   -", m)
    # ★★ 2026-11-12 GitHub に上げるファイルだけを、フォルダの形のまま _upload/<版>/ に集める
    try:
        build_upload(version)
    except Exception as e:
        print("!! アップロード用フォルダを作れませんでした:", e)


if __name__ == "__main__":
    # ★★ 2026-11-12 --sw-ledger … SW の版の台帳（update-sw.json）だけを書いて終わる（update.json は作らない）
    if "--sw-ledger" in sys.argv:
        bump_sw_versions()
        print("update-sw.json を書きました")
    else:
        main()

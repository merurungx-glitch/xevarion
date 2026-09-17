# -*- coding: utf-8 -*-
"""MagiBocciaRush のボイスを VOICEVOX で作る（2026-09-17c）
  ★★ 2026-09-17d キャラごとのボイスは廃止（ご指定）。いまはチュートリアル（ずんだもん）だけを作る。
     キャラの台本（LINES・GROUP_SPK）は記録として残してあるが、書き出しには使わない。

  使い方: VOICEVOX（エンジン）を起動しておいてから
      python MagiBocciaRush/tools/make_voice.py
  ★ 出力
      MagiBocciaRush/voice/<話者id>/<群>-<種類>-<番号>.m4a … 戦型ごとのせりふ
      MagiBocciaRush/voice/<話者id>/c-<キャラid>.m4a       … 新キャラ告知のキャッチコピー
      MagiBocciaRush/voice/3/tut-<番号>.m4a                … チュートリアル（ずんだもん）
      MagiBocciaRush/js/mbr-voice.js                       … 台本・話者の割り当て・クレジット
  ★ すでにあるファイルは作り直さない（キャラが増えたらもう一度走らせるだけ）。
  ★ 音声は AAC 32kbps モノラル（Safari でも鳴る）。変換は ffmpeg。
"""
import io, json, os, re, subprocess, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))   # XEVARION
APP = os.path.join(ROOT, "MagiBocciaRush")
OUT = os.path.join(APP, "voice")
ENGINE = "http://127.0.0.1:50021"
FFMPEG = os.environ.get("FFMPEG") or r"C:\Users\shoem\AppData\Local\CapCut\Apps\3.9.0.1459\ffmpeg.exe"

# ── 話者（VOICEVOX のスタイルid）── ★ 女性の声を中心に、群の性格に合うものを選ぶ
SPEAKERS = {
    2: "四国めたん（ノーマル）", 6: "四国めたん（ツンツン）", 3: "ずんだもん（ノーマル）",
    8: "春日部つむぎ", 10: "雨晴はう", 65: "波音リツ（クイーン）", 14: "冥鳴ひまり",
    16: "九州そら（ノーマル）", 15: "九州そら（あまあま）", 18: "九州そら（ツンツン）",
    20: "もち子さん", 23: "WhiteCUL", 29: "No.7", 43: "櫻歌ミコ", 46: "小夜/SAYO",
    54: "春歌ナナ", 55: "猫使アル", 110: "猫使アル（つよつよ）", 58: "猫使ビィ",
    61: "中国うさぎ", 68: "あいえるたん", 69: "満別花丸", 74: "琴詠ニア", 90: "ぞん子",
    94: "中部つるぎ", 100: "黒沢冴白", 102: "ユーレイちゃん", 107: "東北ずん子",
    108: "東北きりたん", 109: "東北イタコ", 113: "あんこもん",
}
# クレジット表記に使う名前（スタイル名なし）
CREDIT_FIX = {"もち子さん": "もち子(cv 明日葉よもぎ)"}   # 利用規約どおりの表記
def credit_name(sid):
    n = re.sub(r"（.*?）", "", SPEAKERS[sid])
    return CREDIT_FIX.get(n, n)

# ── 群（MagiBurst の戦型 typeKey）ごとの話者とせりふ ──
GROUP_SPK = {
    "cannon":  [65, 94, 18, 110, 6],
    "striker": [55, 8, 69, 43, 16],
    "speed":   [58, 61, 113, 108],
    "trick":   [3, 14, 100, 102, 90],
    "support": [10, 20, 54, 23, 107],
    "balance": [2, 15, 29, 46, 74, 109, 68],
}
LINES = {
    "cannon": {
        "enter": ["まとめて吹き飛ばしてあげる。", "火力なら、誰にも負けない。", "道をあけて。私が撃つわ。"],
        "hit": ["どいてもらうわ！", "まだまだ！", "直撃よ！"],
        "jack": ["目標、捕捉。", "ジャックごと、いただくわ。"],
        "ult": ["全力でいくわよ！", "これで決める！"],
        "win": ["当然の結果ね。", "私たちの勝ちよ。"],
        "lose": ["次は、全部撃ち抜く。", "……認めないわ。"],
    },
    "striker": {
        "enter": ["いっくよー！", "よーし、突っ込むよ！", "見ててね、決めてくるから！"],
        "hit": ["当たりっ！", "そこだぁ！", "ナイスヒット！"],
        "jack": ["ジャック、ゲット！", "ぴったり！"],
        "ult": ["フルパワーだよ！", "いっけぇぇ！"],
        "win": ["やったぁ、勝ったよ！", "最高の試合だったね！"],
        "lose": ["くやしい〜！もう一回！", "次は負けないんだから！"],
    },
    "speed": {
        "enter": ["一瞬で終わらせるよ。", "スピード勝負だね！", "置いていかないでね？"],
        "hit": ["はやっ！", "もらったよ！", "えいっ！"],
        "jack": ["ジャックまで、一直線！", "ちょうどいい距離！"],
        "ult": ["最速でいくよ！", "ついてこれる？"],
        "win": ["私の勝ち、だね！", "速さは正義！"],
        "lose": ["うぅ、追いつけなかった……", "次は、もっと速く！"],
    },
    "trick": {
        "enter": ["まっすぐ行くと思った？", "ちょっとだけ、ずるい軌道。", "ふふ、見てて。"],
        "hit": ["引っかかったね。", "計算どおり。", "ふふっ。"],
        "jack": ["ジャック、動かしちゃった。", "ここが正解。"],
        "ult": ["とっておき、見せてあげる。", "種明かしは、あとでね。"],
        "win": ["楽しかったね。", "思ったとおり。"],
        "lose": ["あれれ、読まれてた？", "次は、もっと驚かせるから。"],
    },
    "support": {
        "enter": ["みんな、次はまかせてね。", "ゆっくり、ていねいに。", "準備はできてるよ。"],
        "hit": ["ごめんね、どいてね。", "届いた！", "よし。"],
        "jack": ["ジャックのそばに、置けたよ。", "いい位置だね。"],
        "ult": ["みんなの力、借りるね。", "いまだよ、みんな！"],
        "win": ["みんなのおかげだよ。", "おつかれさま！"],
        "lose": ["大丈夫、次があるよ。", "みんな、よくがんばったね。"],
    },
    "balance": {
        "enter": ["落ち着いていきましょう。", "狙いは、もう決まっています。", "ここは、私にまかせて。"],
        "hit": ["そこです。", "ヒット、確認しました。", "ええ、狙いどおり。"],
        "jack": ["ジャックに寄せました。", "いい距離です。"],
        "ult": ["決めます。", "これが、私の本気です。"],
        "win": ["いい試合でした。", "作戦どおりですね。"],
        "lose": ["次は、もっと正確に。", "……悔しいですね。"],
    },
}
TUT_SPK = 3
TUTORIAL = [
    "白いボールがジャックなのだ！黄色い線より奥へ、引っぱって投げるのだ！",
    "次は赤いボールなのだ。引っぱる長さが強さで、反対の向きに飛ぶのだ。",
    "ボッチャは、ジャックに近づけるゲームなのだ。1メートル以内に止めてみるのだ！",
    "青いボールがジャックのそばに来たのだ。ぶつけて追い出すのだ！",
    "エンドの終わりに、ジャックにいちばん近いチームが点をもらえるのだ。",
    "下の特殊ショットを選んでから投げると、キャラの技が出るのだ！",
    "ゲージが満タンなのだ！ULTを押してから投げると、アルティメットなのだ！",
    "チュートリアル完了なのだ！これでボッチャの基本はばっちりなのだ！",
    "ボッチャは初めてなのだ？投げながら覚えるチュートリアルがおすすめなのだ！",
]

def fnv(s):
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h

def read(p):
    return io.open(p, encoding="utf-8").read()

def roster():
    core = read(os.path.join(ROOT, "MagiBurst", "js", "mb-core.js"))
    m = re.search(r"const CHAR_TYPE = \{([\s\S]*?)\n\};", core)
    ctype = dict(re.findall(r"^\s*(\w+)\s*:\s*\"(\w+)\"", m.group(1), re.M)) if m else {}
    ids = re.findall(r"id: \"(\w+)\", nm: \"([^\"]+)\"", core)
    mi = re.search(r"const CHAR_IDS = \[([\s\S]*?)\];", core)
    valid = set(re.findall(r"\"(\w+)\"", re.sub(r"/\*[\s\S]*?\*/", "", mi.group(1)))) if mi else None
    ids = [x for x in ids if valid is None or x[0] in valid]
    seen, out = set(), []
    for cid, nm in ids:
        if cid in seen:
            continue
        seen.add(cid)
        out.append((cid, nm, ctype.get(cid, "balance")))
    return out

def catches():
    t = read(os.path.join(ROOT, "mb-newchars.js"))
    return dict(re.findall(r"\{ id: \"(\w+)\"[^}]*?catch: \"([^\"]+)\"", t))

def synth(sid, text, path):
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    q = urllib.request.urlopen(urllib.request.Request(
        ENGINE + "/audio_query?speaker=%d&text=%s" % (sid, urllib.parse.quote(text)), method="POST"), timeout=120).read()
    qd = json.loads(q)
    qd["speedScale"] = 1.08
    qd["outputSamplingRate"] = 24000
    wav = urllib.request.urlopen(urllib.request.Request(
        ENGINE + "/synthesis?speaker=%d" % sid, data=json.dumps(qd).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"), timeout=300).read()
    tmp = path + ".wav"
    open(tmp, "wb").write(wav)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", tmp, "-ac", "1", "-ar", "24000",
                    "-c:a", "aac", "-b:a", "32k", "-movflags", "+faststart", path], check=True)
    os.remove(tmp)
    return True

def main():
    chars = roster()
    cat = catches()
    char_spk = {}
    for cid, nm, grp in chars:
        pool = GROUP_SPK.get(grp) or GROUP_SPK["balance"]
        char_spk[cid] = pool[fnv(cid) % len(pool)]
    used = {}
    for cid, nm, grp in chars:
        used.setdefault(char_spk[cid], set()).add(grp)
    jobs = []
    used = {}          # ★ 2026-09-17d キャラの声は作らない
    cat = {}
    for sid, grps in sorted(used.items()):
        for grp in sorted(grps):
            for kind, arr in LINES[grp].items():
                for i, tx in enumerate(arr):
                    jobs.append((sid, tx, os.path.join(OUT, str(sid), "%s-%s-%d.m4a" % (grp, kind, i))))
    have_catch = []
    for cid, nm, grp in chars:
        if cid in cat:
            have_catch.append(cid)
            jobs.append((char_spk[cid], cat[cid], os.path.join(OUT, str(char_spk[cid]), "c-%s.m4a" % cid)))
    for i, tx in enumerate(TUTORIAL):
        jobs.append((TUT_SPK, tx, os.path.join(OUT, str(TUT_SPK), "tut-%d.m4a" % i)))
    print("jobs", len(jobs), flush=True)
    made = 0
    for n, (sid, tx, path) in enumerate(jobs):
        try:
            if synth(sid, tx, path):
                made += 1
        except Exception as e:
            print("ERR", sid, tx, e, flush=True)
        if n % 25 == 0:
            print(n, "/", len(jobs), flush=True)
    # 台本と割り当て
    credits = sorted({credit_name(s) for s in list(used.keys()) + [TUT_SPK]})
    js = [
        "/* ══════════════════════════════════════════════════════════════",
        "   MagiBocciaRush — ボイス（VOICEVOX）★ tools/make_voice.py が書き出したファイル。手で直さない",
        "   ・声は MagiBurst の戦型（typeKey）ごとに性格の合う話者から、キャラの id で1人に決める。",
        "   ・音声は voice/<話者id>/<群>-<種類>-<番号>.m4a（キャッチコピーは c-<キャラid>.m4a）。",
        "   ・キャラが増えたら make_voice.py を走らせ直すだけ（ここに無いキャラは群の話者から自動で選ぶ）。",
        "   ══════════════════════════════════════════════════════════════ */",
        "window.MBR_VOICE = " + json.dumps({
            "tutSpk": TUT_SPK, "tutorial": TUTORIAL,
            "speakers": {str(TUT_SPK): SPEAKERS[TUT_SPK]}, "credits": credits,
        }, ensure_ascii=False) + ";",
    ]
    io.open(os.path.join(APP, "js", "mbr-voice.js"), "w", encoding="utf-8", newline="\n").write("\n".join(js) + "\n")
    print("done made", made, "credits", credits, flush=True)

if __name__ == "__main__":
    main()

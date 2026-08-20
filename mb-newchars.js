/* ══════════════════════════════════════════════════════════════
   新キャラ告知の台帳（MagiBurst と XEVARION ポータルの<b>共通データ</b>）

   ★★ 2026-08-18 これまで MagiBurst/index.html の中にだけあったので、
     ポータル側の「新キャラのお知らせ」は名前と絵しか出せず、
     しかも<b>足しわすれ</b>が起きていた（グレース以降の12体が丸ごと抜けていた）。
     告知はポータルのログイン時にまとめて出す形にしたので、台帳もここ1本にする。

   ★ キャラを足したら、この配列の<b>先頭</b>に1行足すだけ。
     since … 告知が始まる日。未来の日付にしておくと、その日が来るまで出ない。
              "2026-08-10T11:45:14" のように<b>秒まで</b>書いてもよい。
     where … どこで手に入るか（告知カードの本文）
     mode  … ガチャの種類（premium / fes2 / fes3 …）。
              書くと「ガチャへ行く」ボタンが出る。ガチャ排出でないキャラは書かない。
     catch … キャッチコピー　color … カードの差し色
   ★ 名前・絵・No. は xeva.js の MB_CHAR_MASTER が持ち主。
     こちらに足したら<b>あちらにも since 付きで1行</b>足すこと（無いとポータルに絵が出ない）。
   ══════════════════════════════════════════════════════════════ */
window.MB_NEW_CHARS = [
  /* ── ★ 2026-08-20 GRAND DEBUT GACHA 新SSR 5体 ──
     ★ 新キャラは<b>GRAND DEBUT GACHA でしか引けません</b>（フェス・プレミアムのすり抜けにも出ない）。
       次の更新で新しいキャラが GRAND DEBUT に入ると、この5体はプレミアムセレクトガチャへ移ります。 */
  { id: "mio", since: "2026-08-20", where: "GRAND DEBUT GACHA", mode: "debut",
    catch: "曙の光は、閉ざされた道をこじ開ける。", color: "#ffd257" },
  { id: "amelia", since: "2026-08-20", where: "GRAND DEBUT GACHA", mode: "debut",
    catch: "木もれ日は、となりの背中をあたためる。", color: "#2fbf71" },
  { id: "koyuki", since: "2026-08-20", where: "GRAND DEBUT GACHA", mode: "debut",
    catch: "宵の猫は、毒を撒いてから爪を立てる。", color: "#a86bff" },
  { id: "scarlet", since: "2026-08-20", where: "GRAND DEBUT GACHA", mode: "debut",
    catch: "蒼い涙は、終わりの一手を先へ延ばす。", color: "#38a6ff" },
  { id: "mirelle", since: "2026-08-20", where: "GRAND DEBUT GACHA", mode: "debut",
    catch: "桜の焔は、守りごと燃やしてから落とす。", color: "#ff5d8f" },
  /* ★ since が未来の日付なので、その日が来るまで告知バナーには出ない（newCharLive で判定） */
  /* ★★ 2026-08-18 ここから12体は、これまで台帳に足しわすれていたぶんです
     （グレース／瑶華＆玉蘭・瑶妃／プレミアムSSR 8体＋ロキシー）。
     xeva.js の MB_CHAR_MASTER には since 付きで入っていたのに、
     こちらに無かったので告知にいっさい出てきませんでした。 */
  /* ── 2026-08-18 プレミアムSSR 9体 ── */
  { id: "roxy", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "積みあがる雷は、最後にまとめて落ちる。", color: "#38a6ff" },
  { id: "melty", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "甘い毒で、やさしく看取ってあげる。", color: "#c86bff" },
  { id: "sayo", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "黒薔薇は、とどめの一手だけ咲く。", color: "#ffe9a8" },
  { id: "satsuki", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "紅焔は、繋いだ数だけ濃くなる。", color: "#ff5d47" },
  { id: "lyra", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "氷の華で、みんなを護る。", color: "#a86bff" },
  { id: "lilith", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "宴のあいだは、こちらの盤面。", color: "#a86bff" },
  { id: "blair", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "驟雨は、追いつめられてから強い。", color: "#38a6ff" },
  { id: "asuha", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "春の陽は、触れた背中を押していく。", color: "#2fbf71" },
  { id: "artemia", since: "2026-08-18", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "聖なる裁きは、弱点だけを射抜く。", color: "#ffe9a8" },
  /* ── 2026-08-17 蓬莱の九重（爆絶）の降臨キャラ2体。ガチャ排出なしなので mode は付けない ── */
  { id: "youhi", since: "2026-08-17", where: "蓬莱の九重「蓬莱天宮」クリア（降臨）",
    catch: "天宮の風が、盤ごと吹き払う。", color: "#ff5d47" },
  { id: "youka", since: "2026-08-17", where: "蓬莱の九重 50WAVE踏破（降臨）",
    catch: "二人でひとつ、舞は二度重なる。", color: "#ffd7e6" },
  /* ── 2026-08-17 プレミアムSSR ── */
  { id: "grace", since: "2026-08-17", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "聖光は、まっすぐ撃ち滅ぼす。", color: "#ffe9a8" },
  /* ★ 2026-08-16b プレミアムSSR 6体（No.110〜115） */
  { id: "elena", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "蒼き波は、二度打ち寄せる。", color: "#38a6ff" },
  { id: "touka", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "白閃は、止まってから速くなる。", color: "#f0b429" },
  { id: "kanata", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "紅蓮の号令、弱点へ全員で。", color: "#ff5d47" },
  { id: "violet", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "壁は、跳ねるほど力になる。", color: "#2fbf71" },
  { id: "suzuha", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "宵闇は、ただ一体を沈める。", color: "#a86bff" },
  { id: "moeka", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "蒼き雫は、壁をすり抜ける。", color: "#38a6ff" },
  /* ★ 2026-08-16 プレミアムSSR 2体 */
  { id: "tsukino", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "紅い月は、みんなの背中を押す。", color: "#ff6f91" },
  { id: "anna", since: "2026-08-16", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "四十連のあと、盤面ごと吹き飛ばす。", color: "#ffd257" },
  /* ★ 2026-08-12 蒼夏祭（Aoka Summer Fest）限定SSR 7体 */
  { id: "seira", since: "2026-08-12", where: "蒼夏祭", mode: "fes4",
    catch: "宵闇は、ただ一体を沈める。", color: "#6f3fd0" },
  { id: "chizuru", since: "2026-08-12", where: "蒼夏祭", mode: "fes4",
    catch: "宵の海は、まだ終わらない。", color: "#8e4fe0" },
  { id: "mayu", since: "2026-08-12", where: "蒼夏祭", mode: "fes4",
    catch: "動かないまま、半分ぜんぶを縛る。", color: "#2fbf71" },
  { id: "karem", since: "2026-08-12", where: "蒼夏祭", mode: "fes4",
    catch: "近づけばいい。それだけの話。", color: "#ff5d47" },
  { id: "suzuka", since: "2026-08-12", where: "蒼夏祭", mode: "fes4",
    catch: "壁ぎわは、逃げ場じゃない。", color: "#ffd257" },
  { id: "tsumugi", since: "2026-08-12", where: "蒼夏祭", mode: "fes4",
    catch: "8ターン。燃やすものは、もう決めた。", color: "#8affc4" },
  { id: "fuka", since: "2026-08-12", where: "蒼夏祭", mode: "fes4",
    catch: "波は、みんなをいちどに押し上げる。", color: "#38a6ff" },
  /* ★ 2026-08-11 Luminous Summer Fest 追加2体（どちらもクロススキル持ち） */
  { id: "kokonaalpha", since: "2026-08-11", where: "Luminous Summer Fest", mode: "fes2",
    catch: "祈りは、夏のいちばん高いところで。", color: "#ff8ab5" },
  { id: "cherylalpha", since: "2026-08-11", where: "Luminous Summer Fest", mode: "fes2",
    catch: "四十連、蒼く。届くまで止まらない。", color: "#38a6ff" },
  /* ★ 2026-08-11 プレミアムSSR 3体（アンチ2種・オムニなし。庭園に属性有利の適正あり） */
  { id: "izumi", since: "2026-08-11", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "泉のほとりで、時間だけが遅れていく。", color: "#7dd87d" },
  { id: "yuunagi", since: "2026-08-11", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "宵の凪。壁を叩くほど、灯りは強い。", color: "#ffd257" },
  { id: "shizuku", since: "2026-08-11", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "ひとしずくが、みんなを立ち上がらせる。", color: "#38a6ff" },
  /* ★ 2026-08-08c プレミアムSSR 3体 */
  { id: "kotone", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "壁の数だけ、焔は太くなる。", color: "#ff5d47" },
  { id: "ran", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "祈りは、まだ折れていない。", color: "#ffd257" },
  { id: "ceris", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "囲まれたほうが、都合がいい。", color: "#2fbf71" },
  { id: "yaju", since: "2026-08-10T11:45:14", where: "Phantom Legend Fest", mode: "fes3",
    catch: "お待たせ。ここからは、野獣の時間だ。", color: "#c86bff" },
  /* ★ 2026-08-08 プレミアムSSR 2体 */
  { id: "nanami", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "壁の数だけ、速くなる。", color: "#ff5d47" },
  { id: "kaede", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "壁の向こうから、もう来てる。", color: "#ff5d47" },
  { id: "rinon", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "その技、二度みせて。", color: "#ffe9a8" },
  /* ★ 2026-08-10 XEVAガチャ移行SSR 6体 */
  { id: "kotomi", since: "2026-08-10", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "夜を、あなたの追い風に。", color: "#c9a6ff" },
  { id: "riko", since: "2026-08-10", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "みんな、いっせいに行くよ！", color: "#ffe9a8" },
  { id: "kaho", since: "2026-08-10", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "この半円、逃がさない。", color: "#38a6ff" },
  { id: "nana", since: "2026-08-10", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "壁の数だけ、燃えあがる。", color: "#ff5d47" },
  { id: "rea", since: "2026-08-10", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "壁ごと、抜けていく。", color: "#a86bff" },
  { id: "rinonx", since: "2026-08-10", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "凍った壁、叩くほど熱い。", color: "#ff9d2e" },
  { id: "kokoro", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "翠の霧に、弱点を晒して。", color: "#2fbf71" },
  { id: "ange", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "痛むほど、鎮魂歌は強く。", color: "#c86bff" },
  { id: "chitose", since: "2026-08-08", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "蒼雷、三つまとめて落とす。", color: "#38a6ff" },
  { id: "solea", since: "2026-08-06", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "全部、まとめて撃ち抜く。", color: "#38a6ff" },
  { id: "yuria", since: "2026-08-06", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "冥き花は、わたしが摘む。", color: "#a86bff" },
  { id: "altia", since: "2026-08-06", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "灼き尽くすまで、走り抜ける。", color: "#ff5d47" },
  { id: "liana", since: "2026-08-06", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "壁の数だけ、光は強くなる。", color: "#ffd257" },
  { id: "roselia", since: "2026-08-05", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "棘は、殴られた数だけ伸びる。", color: "#e0405e" },
  { id: "shizuka", since: "2026-08-05", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "宵闇より、あなたを高く。", color: "#a86bff" },
  { id: "nemu", since: "2026-08-05", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "あなたの光、写し取るね。", color: "#f0b429" },
  { id: "sheril", since: "2026-08-04", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "碧き潮の号令、いざ。", color: "#38a6ff" },
  /* ★ 2026-08-07 プレミアムSSR 4体 ＋ 幽冥の庭園 降臨 */
  { id: "iori", since: "2026-08-07", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "灼けた壁ほど、よく斬れる。", color: "#c86bff" },
  { id: "noelle", since: "2026-08-07", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "この夜は、誰にも触れさせない。", color: "#c9a6ff" },
  { id: "yukino", since: "2026-08-07", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "七つ数えたら、もう抜けてる。", color: "#7ce8ff" },
  { id: "reika", since: "2026-08-07", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "冥も蝕も、まとめて灼く。", color: "#ffd257" },
  /* ★ ドミニアはガチャ排出なし（庭園の踏破報酬）なので mode は付けない
     ＝告知カードに「ガチャへ行く」ボタンを出さない */
  { id: "dominia", since: "2026-08-07", where: "幽冥の庭園 80WAVE踏破（降臨）",
    catch: "庭ごと、喰らってあげる。", color: "#8e4fe0" },
  { id: "fia", since: "2026-08-04", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "みんな、こっちへ集まって。", color: "#7cc4ff" },
  { id: "lysera", since: "2026-08-04", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "触れるほど、燃えあがる。", color: "#ff5d47" },
  { id: "soleria", since: "2026-08-04", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "陽炎の毒は、弱点を灼く。", color: "#ffb84d" },
  { id: "beltia", since: "2026-08-04", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "翠の茨、手番ごと絡めとる。", color: "#2fbf71" },
  { id: "astera", since: "2026-08-04", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "宵の星が、七つ連なる。", color: "#baffd9" },
  { id: "kaguyaalpha", since: "2026-07-31", where: "Luminous Summer Fest", mode: "fes2",
    catch: "灼夏の重力、解き放つ。", color: "#ff9d2e" },
  { id: "mionalpha", since: "2026-07-31", where: "Luminous Summer Fest", mode: "fes2",
    catch: "終焔の連撃、二度目は闇で。", color: "#1d8fd8" },
  { id: "chloe", since: "2026-07-27", where: "プレミアムセレクトガチャ", mode: "premium",
    catch: "深海の覇者、参戦。", color: "#38a6ff" },
];

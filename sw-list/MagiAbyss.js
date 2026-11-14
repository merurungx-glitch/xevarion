/* ============================================================
   MagiAbyss — Service Worker が控えるファイルの一覧（sw-list/MagiAbyss.js）
   ★★ 2026-11-12 MagiAbyss/sw.js から、版（v）と一覧（core）だけをここへ移した
   ------------------------------------------------------------
   ・v    … 置き場の名前（版）。core のファイルが1つでも変わったら、最後の数字を +1 する
             （上げ忘れは make-update.py が見つけて自動で +1 する）
   ・core … オフライン用に先に取りこむファイル。パスは MagiAbyss/sw.js から見た相対パスのまま
   ・MagiAbyss/sw.js がこのファイルを importScripts で読む（しくみは sw-list/_shared.js の説明）
   ============================================================ */
self.XEV_SW = { v: "magiabyss-sw-v26", core: [
  "./index.html",
  "./manifest.webmanifest",
  "./css/ma.css?v=14",
  "./css/ma-ui2.css?v=1",      // ★★ 2026-10-28 UI・デザインの作り直し
  "./js/ma-data.js?v=14",
  "./js/ma-pixel.js?v=12",
  "./js/ma-art.js?v=12",
  "./js/ma-gaiden.js?v=2",
  "./js/ma-map.js?v=2",
  "./js/ma-save.js?v=4",
  "./js/ma-stats.js?v=2",
  "./js/ma-audio.js?v=1",
  "./js/ma-input.js?v=4",
  "./js/ma-engine.js?v=8",
  "./js/ma-ai.js?v=2",
  "./js/ma-weapons.js?v=7",
  "./js/ma-skills.js?v=8",
  "./js/ma-cards.js?v=3",
  "./js/ma-boss.js?v=3",
  "./js/ma-prog.js?v=6",
  "./js/ma-render.js?v=3",
  "./js/ma-render25.js?v=2",   /* ★★ 2026-10-22 2.5D の描画 */
  "./js/ma-ui.js?v=14",
  "./js/ma-fx.js?v=1",
  "./js/ma-town.js?v=2",
  "./js/ma-town25.js?v=1",   /* ★★ 2026-10-23 拠点（町の広場）の 2.5D */
  "./js/ma-guild.js?v=16",
  "./js/ma-stages.js?v=5",
  "./js/ma-howto.js?v=6",
  "./js/ma-main.js?v=5",
  "./img/title.webp?v=2",
  "./img/title_blur.webp?v=2",
  "./img/icon_s.webp?v=2",
  "../thumbs/MagiAbyss.jpg?v=2",
  "../gem.png",
  /* XEVARION の共通部品 */
  "../mb-boot.js?v=18",
  "../MagiBurst/js/mb-core.js?v=147",
  "../xeva.js?v=87",
  "../xeva-alive.js?v=9",
  "../xeva-loading.js?v=19",
  "../xeva-splash.js?v=22",
  "../xeva-safebottom.js?v=12",
  "../xeva-back.js?v=9",
  "../xeva-presence.js?v=9",
  "../maintenance-gate.js?v=13",
  "../xeva-cloud.js?v=51",
  "../MagiBurst/magiburst-cloud.js?v=29",
  "../app-cloud.js?v=15",
  "../xeva-keys.js?v=36",
  "../xevarion-fb.js?v=37",
  /* 遊べる10体（極彩祭・極煌祭・極華祭）の絵 */
  "../img/Takina.webp", "../img/t_Takina.webp",
  /* ★★ 2026-10-09 Pumpkin Night の10体（絵）と、UR の必殺技カットインの縦長の SS 絵 */
  "../img/Ayano.webp", "../img/t_Ayano.webp", "../img/Saki.webp", "../img/t_Saki.webp", "../img/Yuka.webp", "../img/t_Yuka.webp",
  "../img/Natsumi.webp", "../img/t_Natsumi.webp", "../img/Miu.webp", "../img/t_Miu.webp", "../img/Mai.webp", "../img/t_Mai.webp",
  "../img/Chinatsu.webp", "../img/t_Chinatsu.webp", "../img/Yuumi.webp", "../img/t_Yuumi.webp", "../img/Rina.webp", "../img/t_Rina.webp",
  "../img/Kaori.webp", "../img/t_Kaori.webp",
  /* ★★ 2026-10-16 超極華祭の5体（絵と SS 絵） */
  "../img/Chie.webp", "../img/t_Chie.webp", "../img/Ichika.webp", "../img/t_Ichika.webp", "../img/Nonoka.webp", "../img/t_Nonoka.webp",
  "../img/Aina.webp", "../img/t_Aina.webp", "../img/Yuna.webp", "../img/t_Yuna.webp",
  "../MagiBurst/img/ss/ChieSS.webp", "../MagiBurst/img/ss/IchikaSS.webp", "../MagiBurst/img/ss/NonokaSS.webp", "../MagiBurst/img/ss/AinaSS.webp", "../MagiBurst/img/ss/YunaSS.webp",
  /* ★★ 2026-10-22 超極煌祭の3体（絵と SS 絵） */
  "../img/Kohaku.webp", "../img/t_Kohaku.webp", "../img/Suzu.webp", "../img/t_Suzu.webp", "../img/Shouko.webp", "../img/t_Shouko.webp",
  "../MagiBurst/img/ss/KohakuSS.webp", "../MagiBurst/img/ss/SuzuSS.webp", "../MagiBurst/img/ss/ShoukoSS.webp",
  /* ★★ 2026-10-24 ヒサコ・アリス（超極煌祭）・ミキ（MagiChemLex の WP 交換）の絵と SS 絵 */
  "../img/Hisako.webp", "../img/t_Hisako.webp", "../img/Alice.webp", "../img/t_Alice.webp", "../img/Miki.webp", "../img/t_Miki.webp",
  "../MagiBurst/img/ss/HisakoSS.webp", "../MagiBurst/img/ss/AliceSS.webp", "../MagiBurst/img/ss/MikiSS.webp",
  /* ★★ 2026-10-30 ハル・チカ（超極彩祭）の絵と SS 絵 */
  "../img/Haru.webp", "../img/t_Haru.webp", "../img/Chika.webp", "../img/t_Chika.webp",
  "../MagiBurst/img/ss/HaruSS.webp", "../MagiBurst/img/ss/ChikaSS.webp",
  /* ★★ 2026-11-03 チフル・ミント・プリカ（超極彩祭）の絵と SS 絵 */
  "../img/Chifuru.webp", "../img/t_Chifuru.webp", "../img/Mint.webp", "../img/t_Mint.webp", "../img/Purika.webp", "../img/t_Purika.webp",
  "../MagiBurst/img/ss/ChifuruSS.webp", "../MagiBurst/img/ss/MintSS.webp", "../MagiBurst/img/ss/PurikaSS.webp",
  "../img/Ena.webp", "../img/t_Ena.webp", "../img/Mimi.webp", "../img/t_Mimi.webp", "../img/Mako.webp", "../img/t_Mako.webp", "../img/Ako.webp", "../img/t_Ako.webp", "../img/Mina.webp", "../img/t_Mina.webp",   /* ★★ 2026-11-10 エナ・ミミ・マコ・アコ・ミナ */
  "../MagiBurst/img/ss/EnaSS.webp", "../MagiBurst/img/ss/MimiSS.webp", "../MagiBurst/img/ss/MakoSS.webp", "../MagiBurst/img/ss/AkoSS.webp", "../MagiBurst/img/ss/MinaSS.webp",
  "../MagiBurst/img/ss/TakinaSS.webp", "../MagiBurst/img/ss/HibanaSS.webp", "../MagiBurst/img/ss/FukiSS.webp",
  "../MagiBurst/img/ss/AyanoSS.webp", "../MagiBurst/img/ss/SakiSS.webp", "../MagiBurst/img/ss/YukaSS.webp", "../MagiBurst/img/ss/NatsumiSS.webp",
  "../MagiBurst/img/ss/MiuSS.webp", "../MagiBurst/img/ss/MaiSS.webp", "../MagiBurst/img/ss/ChinatsuSS.webp", "../MagiBurst/img/ss/YuumiSS.webp",
  "../MagiBurst/img/ss/RinaSS.webp", "../MagiBurst/img/ss/KaoriSS.webp",
  /* ★★ 2026-10-07 Sapphire Breeze ヒバナ・フキ */
  "../img/Hibana.webp", "../img/t_Hibana.webp", "../img/Fuki.webp", "../img/t_Fuki.webp",
  "../img/Hinano.webp", "../img/t_Hinano.webp",
  "../img/Hanon.webp", "../img/t_Hanon.webp",
  "../img/Kokoha.webp", "../img/t_Kokoha.webp",
  "../img/Mutsumi.webp", "../img/t_Mutsumi.webp",
  "../img/Reina.webp", "../img/t_Reina.webp",
  "../img/Azusa.webp", "../img/t_Azusa.webp",
  "../img/KumikoReina.webp", "../img/t_KumikoReina.webp",
  "../img/Kagura.webp", "../img/t_Kagura.webp",
  "../img/Kotori.webp", "../img/t_Kotori.webp",
] };

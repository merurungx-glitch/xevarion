/* ══════════════════════════════════════════════════════════════
   xeva-fav-traits.js — ★★ 2026-11-05 キャラの見た目の台帳（お気に入りの「好み診断」用）
   ──────────────────────────────────────────────────────────────
   ご指定「お気に入り登録されているキャラの特徴から、その人の好みを詳しく判別」。
   mb-core の CHARS には見た目の情報が無いので、290体の絵を1枚ずつ見て4文字の印を付けた。
     1文字目 髪色   k 黒・b 茶・y 金・w 銀・r 赤・o 橙・p 桃・v 紫・u 青・c 水・g 緑
     2文字目 髪型   L ロング・M ミディアム・S ショート・P ポニーテール・T ツインテール・U おだんご/アップ
     3文字目 雰囲気 c かわいい・s 清楚・k クール・o 大人っぽい・g 元気・m ミステリアス
     4文字目 世界観 n 夜・月・f 花・森・a 海・夏・p 宮殿・幻想・e 日常・h ハロウィン
   ★ 新しいキャラを足したら、ここにも1行足す（無いキャラは診断の見た目の集計から外れるだけで、こわれはしない）。
   ══════════════════════════════════════════════════════════════ */
window.XEVA_CHAR_TRAITS = {
  hina:"pLcf",runa:"wLkn",noa:"ySsp",haruka:"gMsf",shiona:"uLmn",ede:"bSsp",yuina:"kLkn",ririka:"pTcf",
  serina:"wLsp",akane:"rPkp",airi:"cLsp",eruna:"yLop",kotoha:"kSkn",mika:"oLop",mirea:"bLmn",miyu:"bLmn",
  nene:"vPmp",rei:"wSkn",rusia:"yLsp",ema:"bLcf",sakura:"kLge",arisa:"kLop",kaguya:"wLsn",cheryl:"kLmn",
  aira:"wLcf",shion:"wLsn",viola:"kLon",mion:"bUoe",kokona:"wMoe",mao:"wLmp",bernica:"bLoe",tsubaki:"kLoe",
  alicia:"wLsp",natsuki:"kLon",mizuki:"kLmp",ayaka:"kPga",iroha:"bLoe",shirayuki:"kLke",mashiro:"kLoe",hotaru:"kLkn",
  koharu:"kPge",yuri:"yLon",rinne:"kLop",hecatia:"kLmn",rezelia:"wLsp",elsia:"wLsp",karina:"kPga",nephia:"kLon",
  setsuna:"bPga",selene:"kPka",nazuna:"bLmn",lilia:"wLmn",revia:"wLoe",fiona:"cLce",milfy:"pLof",mabel:"gMmf",
  abyss:"kLmn",arche:"ySon",chloe:"kLmn",kaguyaalpha:"vLga",mionalpha:"bUoa",sheril:"bTga",fia:"uLsa",lysera:"rTga",
  soleria:"oLof",beltia:"gTmp",astera:"bPon",nemu:"ySkn",roselia:"wLmn",shizuka:"vLse",yuria:"kLon",altia:"pMce",
  liana:"oPce",solea:"uSke",yaju:"kSon",iori:"kLse",noelle:"vLme",yukino:"cPsn",reika:"yLoe",dominia:"bLmn",
  nanami:"rLon",chitose:"yMga",kaede:"pLce",rinon:"yLsn",kokoro:"gLoe",ange:"wSmn",kotone:"rLon",ran:"yLke",
  ceris:"gLkf",kotomi:"kLon",riko:"yPgn",kaho:"uSca",nana:"oPga",rea:"vLsa",rinonx:"pTca",shizuku:"uLkn",
  yuunagi:"wLon",izumi:"yLsf",cherylalpha:"vLoa",kokonaalpha:"wLca",fuka:"yPsa",tsumugi:"bPoa",suzuka:"yMga",karem:"pLca",
  mayu:"wLsa",chizuru:"kSka",seira:"kLoa",anna:"bLoe",tsukino:"bLcf",moeka:"cLcf",suzuha:"kPkn",violet:"kLke",
  kanata:"kLoe",touka:"kLoe",elena:"kPcf",grace:"yLsp",youka:"kLmn",youhi:"kLmn",artemia:"wLkp",asuha:"kLgf",
  blair:"uSkn",lilith:"wLmp",lyra:"cLcp",satsuki:"rLge",sayo:"bLoe",melty:"kMmn",roxy:"kLka",mirelle:"pLce",
  scarlet:"uLge",koyuki:"kLmn",amelia:"gSsf",mio:"yUoe",otoha:"wLge",sayaka:"kLke",sayuri:"bMce",akari:"bLse",
  hinata:"yTge",guren:"rLkf",yuuna:"uLkn",momo:"vLce",chihaya:"kMce",yui:"yLoe",suzune:"yPce",minamo:"kMke",
  karen:"kLoe",tomoe:"kLse",himari:"bLsf",karin:"kSkn",mirei:"cLsp",yuuka:"wLke",miyabi:"cMkp",sumire:"bPse",
  kanade:"yTce",homura:"rLga",yoizuki:"wLsa",sumika:"vLoa",seina:"bLoe",shiduki:"kLke",sayuki:"kLke",sara:"kMsf",
  sakuya:"bLcf",hinano:"kLge",mutsumi:"rSkn",yuika:"pLmf",misuzu:"uMce",kazane:"bMke",kokoa:"kPsf",nodoka:"oLce",
  yua:"wLse",shiori:"kLge",rena:"uLsf",ryouka:"kMke",miko:"kLce",kotori:"kLge",reina:"wUsn",rans:"rLce",
  kurenai:"wLoe",yuki:"cPsn",marika:"kLse",yuukas:"yLop",annas:"bLon",annam:"ySgn",chia:"kLce",risa:"uSse",
  rin:"kLmn",minori:"yLge",seika:"kLse",riona:"kLsa",mireir:"bPga",suzuhar:"kLga",seirak:"bPga",hanon:"bSce",
  shizuru:"kLsa",yuuri:"kMke",hisui:"kLme",raika:"kLke",astraea:"wLsp",reis:"kPkn",rikas:"yLgp",annaran:"rLon",
  yoiduki:"wLkn",kayo:"yPgf",shino:"yMon",maaya:"vLmp",asuka:"kUkf",renad:"bMce",kaoru:"yLce",subaru:"uLkn",
  kasumi:"gLgf",tsukinod:"bSoe",naos:"bTge",harukas:"uMkn",reia:"pLce",miori:"vLcn",annamd:"ySce",saya:"wPgn",
  aoik:"cLce",narumi:"kSkn",ayame:"vLon",misaki:"cTka",kyoka:"bPgn",haduki:"gTkn",hikari:"yLon",ruri:"cSon",
  nagisa:"kLoa",hiyori:"rMce",erika:"bLon",momoka:"bMcf",miyuki:"wScf",natsume:"ySge",kagura:"kLkn",annaalpha:"yMce",
  asuhaalpha:"bLse",ranalpha:"rLcf",sayakaalpha:"kLce",kotorialpha:"kLse",kana:"wSkn",maki:"kPmn",kumireina:"bLce",miya:"bMon",
  emika:"kLke",uta:"kLse",shiho:"bLce",kiduki:"kSkn",kuon:"bLkp",asahi:"kLop",sougetsu:"uLsf",natsune:"yLsf",
  amane:"kLkn",akatsuki:"kLkn",ayane:"wPkp",chiha:"gPsf",himeri:"pLop",honoka:"vLsa",azusa:"yLop",kokoha:"kLsf",
  kureha:"kLcf",mikoto:"kMse",mei:"kLsf",hikaru:"kLse",miduki:"kTse",takina:"kLke",hibana:"wLce",fuki:"kLke",
  ayano:"pMch",saki:"bLoh",yuka:"kLch",natsumi:"kLsh",miu:"gSgh",mai:"gUoh",chinatsu:"gSmh",yuumi:"kMgh",
  rina:"bSgh",kaori:"vLoh",chie:"kPsf",ichika:"kLsa",nonoka:"kSsf",aina:"vLmn",yuna:"kTkn",kohaku:"kLse",
  suzu:"kLsa",shouko:"bSoa",hisako:"bPge",alice:"kLse",miki:"kLse",haru:"uSsa",chika:"uLsn",chifuru:"bMge",
  mint:"kLge",purika:"kPke",
  /* ★★ 2026-11-10 エナ・ミミ（超極華祭）・マコ・アコ・ミナ（ROYAL DEBUT） */
  ena:"bSca",mimi:"vSga",mako:"pLof",ako:"wLsn",mina:"kLke",
};



/* ============================================================
   MagiFinance 窶・engine
   1) 繧ｷ繝ｼ繝我ｻ倥″荵ｱ謨ｰ縺ｧ蜀咲樟諤ｧ縺ｮ縺ゅｋ逶ｸ蝣ｴ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ
   2) 螳溘ョ繝ｼ繧ｿ邉ｻ蛻励°繧画悽迚ｩ縺ｮ繝・け繝九き繝ｫ謖・ｨ吶ｒ險育ｮ・   3) 謖・ｨ吶ｒ邨ｱ蜷医＠縺ｦ BUY/SELL/HOLD 繧ｹ繧ｳ繧｢繧堤函謌・   ============================================================ */
"use strict";

/* ---------- utils ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
function fmtNum(n,d){return Number(n).toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d});}
function fmtPrice(n,cur){
  if(cur==='JPY')return 'ﾂ･'+fmtNum(n, n<10?2:0);
  if(cur==='USD')return '$'+fmtNum(n,2);
  return fmtNum(n,2); // index points
}
function fmtBig(n){
  if(n>=1e12)return (n/1e12).toFixed(2)+'蜈・;
  if(n>=1e8)return (n/1e8).toFixed(1)+'蜆・;
  if(n>=1e4)return (n/1e4).toFixed(1)+'荳・;
  return fmtNum(n,0);
}
function fmtCap(cap,cur){
  if(cur==='USD'){
    if(cap>=1e12)return '$'+(cap/1e12).toFixed(2)+'T';
    if(cap>=1e9)return '$'+(cap/1e9).toFixed(1)+'B';
    return '$'+(cap/1e6).toFixed(0)+'M';
  }
  return 'ﾂ･'+fmtBig(cap);
}
function pct(n){return (n>=0?'+':'')+n.toFixed(2)+'%';}
function signCls(n){return n>0?'up':n<0?'down':'flat';}
function avColor(seed){const h=(seed*47)%360;return `hsl(${h} 55% 58%)`;}
function timeAgo(min){if(min<60)return min+'蛻・燕';const h=Math.floor(min/60);if(h<24)return h+'譎る俣蜑・;return Math.floor(h/24)+'譌･蜑・;}

/* ---------- universe ---------- */
const UNIVERSE=[
  // [ticker, name, market, currency, basePrice, sector, vol(annualized), drift, sharesOut]
  ['7203','繝医Κ繧ｿ閾ｪ蜍戊ｻ・,'譚ｱ險ｼP','JPY',2850,'閾ｪ蜍戊ｻ・,0.26,0.05,1.6e10],
  ['6758','繧ｽ繝九・繧ｰ繝ｫ繝ｼ繝・,'譚ｱ險ｼP','JPY',3320,'髮ｻ讖・,0.30,0.10,1.25e9],
  ['9984','繧ｽ繝輔ヨ繝舌Φ繧ｯ繧ｰ繝ｫ繝ｼ繝・,'譚ｱ險ｼP','JPY',9650,'諠・ｱ騾壻ｿ｡',0.45,0.06,1.45e9],
  ['6861','繧ｭ繝ｼ繧ｨ繝ｳ繧ｹ','譚ｱ險ｼP','JPY',62800,'髮ｻ讖・,0.31,0.12,2.43e8],
  ['8306','荳芽廠UFJ FG','譚ｱ險ｼP','JPY',1815,'驫陦・,0.28,0.14,1.2e10],
  ['9983','繝輔ぃ繝ｼ繧ｹ繝医Μ繝・う繝ｪ繝ｳ繧ｰ','譚ｱ險ｼP','JPY',48200,'蟆丞｣ｲ',0.29,0.08,3.18e8],
  ['6098','繝ｪ繧ｯ繝ｫ繝ｼ繝・D','譚ｱ險ｼP','JPY',9180,'繧ｵ繝ｼ繝薙せ',0.34,0.11,1.55e9],
  ['8035','譚ｱ莠ｬ繧ｨ繝ｬ繧ｯ繝医Ο繝ｳ','譚ｱ險ｼP','JPY',24800,'蜊雁ｰ惹ｽ・,0.42,0.18,4.7e8],
  ['6902','繝・Φ繧ｽ繝ｼ','譚ｱ險ｼP','JPY',2240,'閾ｪ蜍戊ｻ企Κ蜩・,0.27,0.03,3.0e9],
  ['4661','繧ｪ繝ｪ繧ｨ繝ｳ繧ｿ繝ｫ繝ｩ繝ｳ繝・,'譚ｱ險ｼP','JPY',3480,'繧ｵ繝ｼ繝薙せ',0.25,-0.02,1.8e9],
  ['9432','譌･譛ｬ髮ｻ菫｡髮ｻ隧ｱ','譚ｱ險ｼP','JPY',152,'諠・ｱ騾壻ｿ｡',0.20,0.01,9.0e10],
  ['7974','莉ｻ螟ｩ蝣・,'譚ｱ險ｼP','JPY',8420,'繧ｲ繝ｼ繝',0.33,0.09,1.16e9],
  ['6594','繝九ョ繝・け','譚ｱ險ｼP','JPY',2980,'髮ｻ讖・,0.40,-0.04,5.8e8],
  ['6501','譌･遶玖｣ｽ菴懈園','譚ｱ險ｼP','JPY',3760,'髮ｻ讖・,0.31,0.16,4.6e9],
  ['4063','菫｡雜雁喧蟄ｦ蟾･讌ｭ','譚ｱ險ｼP','JPY',5480,'蛹門ｭｦ',0.30,0.07,2.0e9],
  ['8058','荳芽廠蝠・ｺ・,'譚ｱ險ｼP','JPY',2710,'蝠・､ｾ',0.29,0.13,4.1e9],
  // US
  ['AAPL','Apple Inc.','NASDAQ','USD',231,'繝・け繝弱Ο繧ｸ繝ｼ',0.26,0.10,1.51e10],
  ['MSFT','Microsoft','NASDAQ','USD',438,'繝・け繝弱Ο繧ｸ繝ｼ',0.25,0.13,7.43e9],
  ['NVDA','NVIDIA','NASDAQ','USD',136,'蜊雁ｰ惹ｽ・,0.52,0.30,2.46e10],
  ['GOOGL','Alphabet','NASDAQ','USD',181,'繝・け繝弱Ο繧ｸ繝ｼ',0.30,0.11,1.22e10],
  ['AMZN','Amazon','NASDAQ','USD',201,'EC',0.33,0.14,1.05e10],
  ['TSLA','Tesla','NASDAQ','USD',342,'閾ｪ蜍戊ｻ・,0.58,0.04,3.19e9],
  ['META','Meta Platforms','NASDAQ','USD',585,'繝・け繝弱Ο繧ｸ繝ｼ',0.36,0.20,2.54e9],
];
const INDICES=[
  // [code, name, base, vol, drift]
  ['N225','譌･邨悟ｹｳ蝮・ｪ萓｡',39200,0.18,0.06],
  ['TOPIX','TOPIX',2740,0.16,0.07],
  ['SPX','S&P 500',5920,0.15,0.09],
  ['NDX','NASDAQ邱丞粋',19400,0.20,0.13],
  ['DJI','NY繝繧ｦ',43100,0.14,0.07],
];

/* ---------- technical indicators (real math) ---------- */
function SMA(arr,p){const o=[];for(let i=0;i<arr.length;i++){if(i<p-1){o.push(null);continue;}let s=0;for(let j=i-p+1;j<=i;j++)s+=arr[j];o.push(s/p);}return o;}
function EMA(arr,p){const k=2/(p+1),o=[];let prev;for(let i=0;i<arr.length;i++){if(i===0){prev=arr[0];o.push(prev);}else{prev=arr[i]*k+prev*(1-k);o.push(prev);}}return o;}
function RSI(arr,p=14){
  const o=new Array(arr.length).fill(null);let g=0,l=0;
  for(let i=1;i<arr.length;i++){const d=arr[i]-arr[i-1];const up=Math.max(d,0),dn=Math.max(-d,0);
    if(i<=p){g+=up;l+=dn;if(i===p){g/=p;l/=p;o[i]=100-100/(1+(l===0?100:g/l));}}
    else{g=(g*(p-1)+up)/p;l=(l*(p-1)+dn)/p;o[i]=100-100/(1+(l===0?100:g/l));}}
  return o;
}
function MACD(arr,f=12,s=26,sig=9){
  const ef=EMA(arr,f),es=EMA(arr,s);const macd=arr.map((_,i)=>ef[i]-es[i]);
  const signal=EMA(macd,sig);const hist=macd.map((m,i)=>m-signal[i]);
  return {macd,signal,hist};
}
function Bollinger(arr,p=20,k=2){
  const mid=SMA(arr,p),up=[],lo=[];
  for(let i=0;i<arr.length;i++){if(i<p-1){up.push(null);lo.push(null);continue;}
    let s=0;for(let j=i-p+1;j<=i;j++)s+=(arr[j]-mid[i])**2;const sd=Math.sqrt(s/p);
    up.push(mid[i]+k*sd);lo.push(mid[i]-k*sd);}
  return {mid,up,lo};
}

/* ---------- signal synthesis (the MAGI verdict) ---------- */
function buildSignal(closes){
  const n=closes.length,last=closes[n-1];
  const sma25=SMA(closes,25),sma75=SMA(closes,75);
  const rsi=RSI(closes,14);
  const {macd,signal,hist}=MACD(closes);
  const bb=Bollinger(closes,20,2);
  const factors=[];
  let score=0;

  // 1. trend (price vs SMA75) + cross of SMA25/75
  const tDev=(last-sma75[n-1])/sma75[n-1]*100;
  let tScore=clamp(tDev*4,-25,25);
  const crossNow=sma25[n-1]-sma75[n-1], crossPrev=sma25[n-2]-sma75[n-2];
  if(crossPrev<0&&crossNow>0)tScore=25; // golden cross
  if(crossPrev>0&&crossNow<0)tScore=-25; // dead cross
  factors.push({label:'繝医Ξ繝ｳ繝会ｼ育ｧｻ蜍募ｹｳ蝮・ｼ・,val:tScore,
    note: crossPrev<0&&crossNow>0?'繧ｴ繝ｼ繝ｫ繝・Φ繧ｯ繝ｭ繧ｹ逋ｺ逕・:crossPrev>0&&crossNow<0?'繝・ャ繝峨け繝ｭ繧ｹ逋ｺ逕・:
      tDev>0?'25譌･邱壹′75譌･邱壹・荳翫〒謗ｨ遘ｻ':'75譌･邱壹ｒ荳句屓縺｣縺ｦ謗ｨ遘ｻ'});
  score+=tScore;

  // 2. RSI momentum
  const r=rsi[n-1]??50;
  let rScore=0;
  if(r<30)rScore=22; else if(r<40)rScore=11; else if(r>70)rScore=-22; else if(r>60)rScore=-11; else rScore=(50-r)*0.4;
  factors.push({label:'繝｢繝｡繝ｳ繧ｿ繝・・SI14・・,val:rScore,raw:r,
    note:r<30?'螢ｲ繧峨ｌ驕弱℃・亥渚逋ｺ譛溷ｾ・ｼ・:r>70?'雋ｷ繧上ｌ驕弱℃・磯℃辭ｱ・・:'荳ｭ遶句恟'});
  score+=rScore;

  // 3. MACD
  const h=hist[n-1],hp=hist[n-2];
  let mScore=clamp(h/last*900,-18,18);
  if(hp<0&&h>0)mScore=20; if(hp>0&&h<0)mScore=-20;
  factors.push({label:'MACD',val:mScore,
    note:hp<0&&h>0?'繝偵せ繝医げ繝ｩ繝縺悟･ｽ霆｢':hp>0&&h<0?'繝偵せ繝医げ繝ｩ繝縺梧が蛹・:h>0?'繝励Λ繧ｹ蝨上〒謗ｨ遘ｻ':'繝槭う繝翫せ蝨上〒謗ｨ遘ｻ'});
  score+=mScore;

  // 4. Bollinger position
  const bw=bb.up[n-1]-bb.lo[n-1];
  const bpos=bw>0?(last-bb.lo[n-1])/bw:0.5; // 0..1
  let bScore=0;
  if(bpos<0.1)bScore=15; else if(bpos<0.25)bScore=8; else if(bpos>0.9)bScore=-15; else if(bpos>0.75)bScore=-8;
  factors.push({label:'繝懊Μ繝ｳ繧ｸ繝｣繝ｼ菴咲ｽｮ',val:bScore,raw:bpos,
    note:bpos<0.1?'荳矩剞繝舌Φ繝我ｻ倩ｿ・:bpos>0.9?'荳企剞繝舌Φ繝我ｻ倩ｿ・:'繝舌Φ繝我ｸｭ螟ｮ莉倩ｿ・});
  score+=bScore;

  // 5. short-term volatility / pullback (5d vs 20d)
  const ret5=(last-closes[n-6])/closes[n-6]*100;
  let vScore=clamp(-ret5*1.4,-12,12); // contrarian short-term
  factors.push({label:'遏ｭ譛滄怙邨ｦ・・譌･・・,val:vScore,raw:ret5,
    note:ret5>3?'遏ｭ譛滄℃辭ｱ縺ｮ隱ｿ謨ｴ繝ｪ繧ｹ繧ｯ':ret5<-3?'遏ｭ譛滉ｸ玖誠縺ｮ蜿咲匱菴吝慍':'關ｽ縺｡逹縺・◆蛟､蜍輔″'});
  score+=vScore;

  score=clamp(score,-100,100);
  let verdict,vClass;
  if(score>=45){verdict='蠑ｷ縺・ｲｷ縺・;vClass='up';}
  else if(score>=18){verdict='雋ｷ縺・;vClass='up';}
  else if(score>-18){verdict='荳ｭ遶・;vClass='flat';}
  else if(score>-45){verdict='螢ｲ繧・;vClass='down';}
  else{verdict='蠑ｷ縺・｣ｲ繧・;vClass='down';}
  const confidence=Math.round(40+Math.abs(score)*0.6);
  return {score:Math.round(score),verdict,vClass,confidence,factors,
    rsi:r, sma25:sma25[n-1], sma75:sma75[n-1], bb};
}

/* ---------- market simulation ---------- */
const SEED=20260617;
const DAYS=200;
const Market={ assets:{}, indices:{}, _t:0 };

function genSeries(base,vol,drift,seedKey){
  const rnd=mulberry32(SEED+seedKey*7919);
  const dt=1/252, candles=[];
  let price=base*(0.82+rnd()*0.12); // start below current so we trend toward "now"
  // regime: gentle multi-phase trend so charts look organic
  let regime=drift;
  for(let i=0;i<DAYS;i++){
    if(i%28===0)regime=drift + (rnd()-0.5)*0.55;
    const open=price;
    // intraday path -> OHLC
    let hi=open,lo=open,p=open;
    const steps=6;
    for(let s=0;s<steps;s++){
      const shock=(rnd()-0.5);
      p=p*Math.exp((regime-0.5*vol*vol)*(dt/steps)+vol*Math.sqrt(dt/steps)*shock*1.9);
      hi=Math.max(hi,p);lo=Math.min(lo,p);
    }
    const close=p;
    const volume=Math.round((0.6+rnd()*0.9)*base*1e4/Math.sqrt(base));
    candles.push({open,high:hi,low:lo,close,volume});
    price=close;
  }
  // normalize last close roughly to base (so "current price" is realistic)
  const ratio=base/candles[candles.length-1].close;
  const blend=i=>1+(ratio-1)*(i/(DAYS-1)); // gradual so history stays organic
  candles.forEach((c,i)=>{const b=blend(i);c.open*=b;c.high*=b;c.low*=b;c.close*=b;});
  return candles;
}

function buildAsset(def,idx){
  const [ticker,name,market,currency,base,sector,vol,drift,shares]=def;
  const candles=genSeries(base,vol,drift,idx+1);
  const closes=candles.map(c=>c.close);
  const last=candles[candles.length-1];
  const prevClose=candles[candles.length-2].close;
  return {ticker,name,market,currency,sector,vol,shares,seed:idx+1,
    candles, price:last.close, prevClose, dayOpen:last.open,
    signal:buildSignal(closes)};
}

function init(){
  UNIVERSE.forEach((d,i)=>{Market.assets[d[0]]=buildAsset(d,i);});
  INDICES.forEach((d,i)=>{
    const [code,name,base,vol,drift]=d;
    const candles=genSeries(base,vol,drift,200+i);
    const closes=candles.map(c=>c.close);
    Market.indices[code]={code,name,candles,price:closes[closes.length-1],
      prevClose:closes[closes.length-2], currency:'PT', closes};
  });
}

/* live tick: nudge last candle + occasionally roll new bar */
function tick(){
  Market._t++;
  const drift=()=>(Math.random()-0.5);
  Object.values(Market.assets).forEach(a=>{
    const c=a.candles[a.candles.length-1];
    const step=a.price*(a.vol/100)*0.6*drift();
    let np=a.price+step;
    np=clamp(np,a.prevClose*0.7,a.prevClose*1.3);
    a.price=np;
    c.close=np;c.high=Math.max(c.high,np);c.low=Math.min(c.low,np);
    a.candles[a.candles.length-1]=c;
    // recompute signal occasionally (cheap, but throttle)
    if(Market._t%3===0){const closes=a.candles.map(x=>x.close);a.signal=buildSignal(closes);}
  });
  Object.values(Market.indices).forEach(ix=>{
    const c=ix.candles[ix.candles.length-1];
    const step=ix.price*0.0006*drift();
    ix.price=clamp(ix.price+step,ix.prevClose*0.92,ix.prevClose*1.08);
    c.close=ix.price;c.high=Math.max(c.high,ix.price);c.low=Math.min(c.low,ix.price);
    ix.closes[ix.closes.length-1]=ix.price;
  });
}

/* ---------- derived helpers ---------- */
function dayChange(a){const d=a.price-a.prevClose;return {abs:d,pct:d/a.prevClose*100};}
function marketCap(a){const cap=a.price*a.shares; if(a.currency==='USD')return cap; return cap;}
function searchUniverse(q){
  q=q.trim().toLowerCase();if(!q)return [];
  return UNIVERSE.filter(d=>d[0].toLowerCase().includes(q)||d[1].toLowerCase().includes(q)||d[5].toLowerCase().includes(q))
    .map(d=>Market.assets[d[0]]);
}

/* ---------- news generation ---------- */
const NEWS_SRC=['譌･邨碁溷ｱ','Bloomberg','Reuters','莨夂､ｾIR','譚ｱ豢狗ｵ梧ｸ・,'MarketWire'];
const POS=[
  '__N__縲・壽悄讌ｭ邵ｾ莠域Φ繧剃ｸ頑婿菫ｮ豁｣ 蝟ｶ讌ｭ逶翫′蟶ょｴ莠域Φ繧剃ｸ雁屓繧・,
  '__N__縺ｫ譁ｰ隕上悟ｼｷ豌励阪Ξ繝ｼ繝・ぅ繝ｳ繧ｰ 逶ｮ讓呎ｪ萓｡蠑輔″荳翫￡',
  '__N__縲∬・遉ｾ譬ｪ雋ｷ縺・ｒ逋ｺ陦ｨ 逋ｺ陦梧ｸ医∩譬ｪ蠑上・荳企剞__P__%',
  '__N__縺ｮ荳ｻ蜉帑ｺ区･ｭ縺悟･ｽ隱ｿ縲＼_S__蛻・㍽縺ｧ蜿玲ｳｨ諡｡螟ｧ',
  '__N__縲∝｢鈴・繧堤匱陦ｨ 譬ｪ荳ｻ驍・・繧貞ｼｷ蛹・,
  '讖滄未謚戊ｳ・ｮｶ縺契_N__譬ｪ繧定ｲｷ縺・｢励＠ 螟ｧ驥丈ｿ晄怏蝣ｱ蜻・,
];
const NEG=[
  '__N__縲∝屁蜊頑悄豎ｺ邂励′蟶ょｴ莠域Φ縺ｫ螻翫°縺・譬ｪ萓｡荳玖誠',
  '__N__縺ｫ蠑ｱ豌苓ｦ矩壹＠ 繧｢繝翫Μ繧ｹ繝医′逶ｮ讓呎ｪ萓｡繧剃ｸ区婿菫ｮ豁｣',
  '__N__縲＼_S__蟶ょｴ縺ｮ遶ｶ莠画ｿ蛹悶〒蛻ｩ逶顔紫縺ｫ蝨ｧ蜉・,
  '__N__縺ｮ逕溽肇險育判縺ｫ驕・ｌ 繧ｵ繝励Λ繧､繝√ぉ繝ｼ繝ｳ諛ｸ蠢ｵ',
  '轤ｺ譖ｿ縺ｮ騾・｢ｨ縺ｧ__N__縺ｮ豬ｷ螟門庶逶翫↓蠖ｱ髻ｿ縺ｨ縺ｮ隕区婿',
];
const NEU=[
  '__N__縲∵眠陬ｽ蜩√Λ繧､繝ｳ繧堤匱陦ｨ 蟶ょｴ縺ｮ蜿榊ｿ懊・髯仙ｮ夂噪',
  '__N__縺靴EO莠､莉｣繧堤匱陦ｨ 邨悟霧菴灘宛繧貞姐譁ｰ',
  '__N__縲＼_S__蛻・㍽縺ｧ譁ｰ縺溘↑謠先声繧貞鵠隴ｰ荳ｭ縺ｨ縺ｮ蝣ｱ驕・,
  '__N__縺ｮ譛域ｬ｡繝・・繧ｿ蜈ｬ陦ｨ 蜑榊ｹｴ荳ｦ縺ｿ縺ｧ謗ｨ遘ｻ',
];
const MKT_NEWS=[
  ['譌･邨悟ｹｳ蝮・∫ｱｳ驥大茜蜍募髄縺ｫ繧峨∩__D__螻暮幕 蜊雁ｰ惹ｽ馴未騾｣縺契_M__','蟶ょｴ蜈ｨ菴・,'neutral'],
  ['FRB鬮伜ｮ倡匱險繧貞女縺醍ｱｳ譬ｪ__M__縲√ワ繧､繝・け譬ｪ縺ｫ雉・≡豬∝・','邀ｳ蝗ｽ蟶ょｴ','pos'],
  ['蜀・嶌蝣ｴ縺契_W__縺ｫ謖ｯ繧後∬ｼｸ蜃ｺ髢｢騾｣譬ｪ縺ｮ驥阪＠縺ｫ','轤ｺ譖ｿ','neg'],
  ['譚ｱ險ｼ繝励Λ繧､繝縲∝｣ｲ雋ｷ莉｣驥代′__V__蜈・・ 蛟倶ｺｺ謚戊ｳ・ｮｶ縺ｮ蜍輔″豢ｻ逋ｺ','蟶ょｴ蜈ｨ菴・,'neutral'],
  ['荳也阜逧・↑繝ｪ繧ｹ繧ｯ驕ｸ螂ｽ縺ｮ__R__縺ｧ譁ｰ闊亥嵜蟶ょｴ縺ｫ繧りｳ・≡','繧ｰ繝ｭ繝ｼ繝舌Ν','pos'],
];
function genNews(){
  const rnd=mulberry32(SEED+Market._t*13);
  const items=[];
  // per-asset news weighted by signal direction
  UNIVERSE.forEach((d,i)=>{
    if(rnd()>0.55)return;
    const a=Market.assets[d[0]];
    const dir=a.signal.score;
    let pool,senti;
    const roll=rnd();
    if(dir>15&&roll<0.7){pool=POS;senti='pos';}
    else if(dir<-15&&roll<0.7){pool=NEG;senti='neg';}
    else if(roll<0.4){pool=NEU;senti='neutral';}
    else if(dir>=0){pool=POS;senti='pos';}
    else {pool=NEG;senti='neg';}
    const tpl=pool[Math.floor(rnd()*pool.length)];
    const title=tpl.replace('__N__',a.name).replace('__S__',a.sector).replace('__P__',(3+Math.floor(rnd()*7)));
    items.push({title,senti,ticker:a.ticker,name:a.name,
      src:NEWS_SRC[Math.floor(rnd()*NEWS_SRC.length)],
      min:Math.floor(rnd()*640)+2,
      ex:newsExcerpt(a,senti)});
  });
  // market-wide
  MKT_NEWS.forEach(m=>{
    if(rnd()>0.6)return;
    const t=m[0].replace('__D__',rnd()>0.5?'蠎募・＞':'繧ゅ∩蜷医＞').replace('__M__',rnd()>0.5?'荳頑・':'霆溯ｪｿ')
      .replace('__W__',rnd()>0.5?'蜀・ｮ・:'蜀・ｫ・).replace('__V__',(3+rnd()*2).toFixed(1))
      .replace('__R__',rnd()>0.5?'蝗槫ｾｩ':'蠕碁');
    items.push({title:t,senti:m[2],ticker:null,name:m[1],src:NEWS_SRC[Math.floor(rnd()*3)],
      min:Math.floor(rnd()*300)+1,ex:'蟶ょｴ髢｢菫り・↓繧医ｋ縺ｨ縲∝ｽ馴擇縺ｯ邨梧ｸ域欠讓吶→隕∽ｺｺ逋ｺ險繧定ｦ区･ｵ繧√ｋ螻暮幕縺檎ｶ壹￥縺ｨ縺ｿ繧峨ｌ繧九よ兜雉・ｮｶ蠢・炊縺ｯ蠑輔″邯壹″諷朱㍾縺ｪ縺後ｉ繧ゅ∵款縺礼岼雋ｷ縺・э谺ｲ縺ｯ譬ｹ蠑ｷ縺・・});
  });
  return items.sort((a,b)=>a.min-b.min);
}
function newsExcerpt(a,senti){
  const ch=dayChange(a);
  if(senti==='pos')return `${a.name}縺ｯ${a.sector}莠区･ｭ縺ｮ蝣・ｪｿ縺輔′隧穂ｾ｡縺輔ｌ縲∵悽譌･縺ｮ譬ｪ萓｡縺ｯ${pct(ch.pct)}縺ｨ${ch.pct>=0?'邯壻ｼｸ':'蜿咲匱'}縲ゅい繝翫Μ繧ｹ繝医・繝舌Μ繝･繧ｨ繝ｼ繧ｷ繝ｧ繝ｳ髱｢縺ｮ菴吝慍繧呈欠鞫倥＠縺ｦ縺・ｋ縲Ａ;
  if(senti==='neg')return `${a.name}繧貞ｷ｡縺｣縺ｦ縺ｯ遏ｭ譛溽噪縺ｪ髴邨ｦ謔ｪ蛹悶′諢剰ｭ倥＆繧後∵ｪ萓｡縺ｯ${pct(ch.pct)}縲ゆｸｭ髟ｷ譛溘・謌宣聞繧ｷ繝翫Μ繧ｪ縺ｯ邯ｭ謖√→縺ｮ螢ｰ繧ゅ≠繧翫∵款縺礼岼繧呈爾繧句虚縺阪ｂ縲Ａ;
  return `${a.name}縺ｫ髢｢縺吶ｋ譚先侭縺御ｼ昴ｏ縺｣縺溘′縲∝ｸょｴ縺ｮ蜿榊ｿ懊・髯仙ｮ夂噪縲ょｼ輔″邯壹″${a.sector}繧ｻ繧ｯ繧ｿ繝ｼ蜈ｨ菴薙・蜍募髄縺梧ｳｨ逶ｮ縺輔ｌ繧九Ａ;
}


function gaugeSVG(s){
  const W=230,H=140,cx=W/2,cy=H-12,R=96;
  const ang=score=>(180-((score+100)/200*180))*Math.PI/180; // score -> radians (180ﾂｰ=left, 0ﾂｰ=right)
  // build an arc band as a polyline (robust, no SVG flag ambiguity)
  const band=(from,to,col,wd)=>{
    const steps=24,pts=[];
    for(let i=0;i<=steps;i++){const sc=from+(to-from)*i/steps;const a=ang(sc);
      pts.push(`${(cx+Math.cos(a)*R).toFixed(1)},${(cy-Math.sin(a)*R).toFixed(1)}`);}
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round"/>`;
  };
  const a=ang(s.score);
  const nx=cx+Math.cos(a)*(R-8), ny=cy-Math.sin(a)*(R-8);
  const col=s.vClass==='up'?'#2BD980':s.vClass==='down'?'#FF5C72':'#A7B0C2';
  return `<svg width="${W}" height="${H+34}" viewBox="0 0 ${W} ${H+34}">
    ${band(-100,-45,'#FF5C72',9)}${band(-44,-19,'rgba(255,92,114,.42)',9)}
    ${band(-18,18,'#3a4256',9)}
    ${band(19,44,'rgba(43,217,128,.42)',9)}${band(45,100,'#2BD980',9)}
    <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="#141925" stroke="${col}" stroke-width="2.5"/>
    <text x="14" y="${H-2}" fill="#FF5C72" font-size="9" font-family="JetBrains Mono,monospace">蠑ｷ縺・｣ｲ繧・/text>
    <text x="${W-14}" y="${H-2}" fill="#2BD980" font-size="9" font-family="JetBrains Mono,monospace" text-anchor="end">蠑ｷ縺・ｲｷ縺・/text>
    <text x="${cx}" y="${H+16}" text-anchor="middle" fill="${col}" font-size="22" font-weight="700" font-family="Space Grotesk,sans-serif">${s.verdict}</text>
    <text x="${cx}" y="${H+32}" text-anchor="middle" fill="#6B7589" font-size="11" font-family="JetBrains Mono,monospace">遒ｺ菫｡蠎ｦ ${s.confidence}%</text>
  </svg>`;
}

/* ---------- canvas candlestick chart ---------- */
function drawChart(a,range){
  const cv=$('#mainChart');if(!cv)return;
  const dpr=window.devicePixelRatio||1;
  const cssW=cv.clientWidth||cv.parentElement.clientWidth;
  const cssH=340;
  cv.width=cssW*dpr;cv.height=cssH*dpr;cv.style.height=cssH+'px';
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cssW,cssH);

  const data=a.candles.slice(-range);
  const closes=a.candles.map(c=>c.close);
  const sma25=SMA(closes,25).slice(-range);
  const sma75=SMA(closes,75).slice(-range);
  const bb=Bollinger(closes,20,2);
  const bbu=bb.up.slice(-range),bbl=bb.lo.slice(-range);

  const padL=8,padR=66,padT=14,padB=46,volH=54;
  const plotW=cssW-padL-padR, plotTop=padT, plotBot=cssH-padB-volH, plotH=plotBot-plotTop;
  let mn=Infinity,mx=-Infinity;
  data.forEach(c=>{mn=Math.min(mn,c.low);mx=Math.max(mx,c.high);});
  bbl.forEach(v=>{if(v!=null)mn=Math.min(mn,v);});bbu.forEach(v=>{if(v!=null)mx=Math.max(mx,v);});
  const pad=(mx-mn)*0.06;mn-=pad;mx+=pad;const rg=mx-mn||1;
  const X=i=>padL+(i/(data.length-1))*plotW;
  const Y=v=>plotTop+(1-(v-mn)/rg)*plotH;

  // grid + price axis
  ctx.font='10px '+getComputedStyle(document.body).getPropertyValue('--mono');
  ctx.textBaseline='middle';
  for(let g=0;g<=4;g++){
    const v=mn+rg*g/4, y=Y(v);
    ctx.strokeStyle='rgba(255,255,255,0.045)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(padL+plotW,y);ctx.stroke();
    ctx.fillStyle='#6B7589';ctx.textAlign='left';
    ctx.fillText(a.currency==='JPY'?fmtNum(v,v<10?2:0):fmtNum(v,2),padL+plotW+6,y);
  }
  // date axis
  ctx.textAlign='center';ctx.fillStyle='#6B7589';
  const today=new Date();const ticks=5;
  for(let t=0;t<=ticks;t++){
    const i=Math.round(t/ticks*(data.length-1));const x=X(i);
    const dt=new Date(today);dt.setDate(dt.getDate()-(data.length-1-i));
    ctx.fillText(`${dt.getMonth()+1}/${dt.getDate()}`,x,cssH-volH-padB+30);
  }

  // bollinger band fill
  ctx.beginPath();let started=false;
  for(let i=0;i<data.length;i++){if(bbu[i]==null)continue;const x=X(i),y=Y(bbu[i]);if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);}
  for(let i=data.length-1;i>=0;i--){if(bbl[i]==null)continue;ctx.lineTo(X(i),Y(bbl[i]));}
  ctx.closePath();ctx.fillStyle='rgba(82,214,232,0.05)';ctx.fill();
  // bb edges
  [[bbu,'rgba(82,214,232,0.35)'],[bbl,'rgba(82,214,232,0.35)']].forEach(([arr,col])=>{
    ctx.beginPath();let st=false;arr.forEach((v,i)=>{if(v==null)return;const x=X(i),y=Y(v);if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y);});
    ctx.strokeStyle=col;ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([]);
  });

  // volume
  const vmax=Math.max(...data.map(c=>c.volume));
  data.forEach((c,i)=>{const x=X(i);const bw=Math.max(1.5,plotW/data.length*0.62);
    const h=(c.volume/vmax)*volH;
    ctx.fillStyle=c.close>=c.open?'rgba(43,217,128,0.22)':'rgba(255,92,114,0.22)';
    ctx.fillRect(x-bw/2,cssH-padB-h+10,bw,h);
  });

  // candles
  data.forEach((c,i)=>{const x=X(i);const up=c.close>=c.open;
    const col=up?'#2BD980':'#FF5C72';ctx.strokeStyle=col;ctx.fillStyle=col;
    const bw=Math.max(1.6,plotW/data.length*0.62);
    ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,Y(c.high));ctx.lineTo(x,Y(c.low));ctx.stroke();
    const yo=Y(c.open),yc=Y(c.close);const top=Math.min(yo,yc),hgt=Math.max(1.5,Math.abs(yc-yo));
    if(bw>2.4){ctx.fillRect(x-bw/2,top,bw,hgt);}else{ctx.lineWidth=bw;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+hgt);ctx.stroke();}
  });

  // moving averages
  const line=(arr,col,wd)=>{ctx.beginPath();let st=false;arr.forEach((v,i)=>{if(v==null)return;const x=X(i),y=Y(v);if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y);});ctx.strokeStyle=col;ctx.lineWidth=wd;ctx.stroke();};
  line(sma25,'#F2B84B',1.6);
  line(sma75,'#9A8CFF',1.6);

  // last price marker
  const lastY=Y(data[data.length-1].close);
  ctx.fillStyle=a.signal.vClass==='down'?'#FF5C72':'#2BD980';
  ctx.fillRect(padL+plotW,lastY-9,padR-2,18);
  ctx.fillStyle='#0B0E14';ctx.textAlign='center';ctx.font='600 10px '+getComputedStyle(document.body).getPropertyValue('--mono');
  ctx.fillText(a.currency==='JPY'?fmtNum(a.price,a.price<10?2:0):fmtNum(a.price,2),padL+plotW+padR/2,lastY);
}


/* ============================================================
   MagiFinance v2 窶・app layer
   - 螳溘ョ繝ｼ繧ｿ蜷梧悄 (Twelve Data: 萓｡譬ｼ / Finnhub: 繝九Η繝ｼ繧ｹ繝ｻ蟆る摩螳ｶ隧穂ｾ｡)
   - 隍・焚繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝・/ 豕ｨ逶ｮ髢句ｧ九°繧峨・鬨ｰ關ｽ / 逶ｮ讓呎ｪ萓｡騾夂衍
   - 譌･譛ｬ繝ｻ豬ｷ螟門・譖ｿ / 蜈ｨ驫俶氛縺九ｉ縺ｮ雋ｷ縺・｣ｲ繧雁・譫・   繧ｭ繝ｼ譛ｪ險ｭ螳壽凾縺ｯ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繧ｨ繝ｳ繧ｸ繝ｳ縺ｫ閾ｪ蜍輔ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ
   ============================================================ */

/* ---------- persistence (download譎ゅ・豌ｸ邯壼喧, 繝励Ξ繝薙Η繝ｼ縺ｧ縺ｯ謠｡繧翫▽縺ｶ縺・ ---------- */
const PKEY='magifinance_v2_store';
function loadStore(){try{const r=localStorage.getItem(PKEY);if(r)return JSON.parse(r);}catch(e){}return null;}
function saveStore(){try{localStorage.setItem(PKEY,JSON.stringify(Store));}catch(e){}}

let Store = loadStore() || {
  keys:{td:'',fh:''},
  region:'all', live:false,
  lists:[{id:'l1',name:'繝｡繧､繝ｳ',tickers:['7203','6758','8035','AAPL','NVDA']}],
  activeList:'l1',
  marks:{}, targets:{}, alerts:[], custom:[]
};
// migrate guards
Store.keys=Store.keys||{td:'',fh:''};
Store.lists=Store.lists&&Store.lists.length?Store.lists:[{id:'l1',name:'繝｡繧､繝ｳ',tickers:[]}];
Store.marks=Store.marks||{}; Store.targets=Store.targets||{}; Store.alerts=Store.alerts||[]; Store.custom=Store.custom||[];
Store.provider=Store.provider||'yahoo'; // 'yahoo'(繧ｭ繝ｼ荳崎ｦ√・譌｢螳・ | 'twelvedata'(隕√く繝ｼ)
if(!Store.lists.find(l=>l.id===Store.activeList))Store.activeList=Store.lists[0].id;

const UI={view:'dashboard', current:null, stockRange:120, liveBusy:false, newsTab:'watch', _liveSeriesDone:{}};

/* ---------- registry helpers ---------- */
function regionOf(a){return a.currency==='JPY'?'jp':'us';}
function inRegion(a){return Store.region==='all'||regionOf(a)===Store.region;}
function allAssets(){return Object.values(Market.assets);}
function getAsset(tk){return Market.assets[tk]||null;}
function listById(id){return Store.lists.find(l=>l.id===id);}
function activeList(){return listById(Store.activeList)||Store.lists[0];}
function uid(p){return p+Math.random().toString(36).slice(2,8);}
function trackedSymbols(){
  const s=new Set();
  Store.lists.forEach(l=>l.tickers.forEach(t=>s.add(t)));
  if(UI.current)s.add(UI.current);
  Object.keys(Store.targets).forEach(t=>{if(Store.targets[t]&&Store.targets[t].length)s.add(t);});
  return [...s];
}

/* build a placeholder simulated asset for a user-added custom symbol */
function ensureAsset(def){
  // def: [ticker,name,market,currency,base,sector,vol,drift,shares]
  const tk=def[0];
  if(Market.assets[tk])return Market.assets[tk];
  const a=buildAsset(def, 900+Object.keys(Market.assets).length);
  Market.assets[tk]=a; return a;
}
function rebuildCustoms(){ Store.custom.forEach(def=>ensureAsset(def)); }

/* ============================================================
   LIVE DATA PROVIDERS
   ============================================================ */
const TD_BASE='https://api.twelvedata.com';
const FH_BASE='https://finnhub.io/api/v1';
const LiveCache={news:{}, reco:{}, mktNews:null, mktNewsTs:0, quoteErr:null};

function isoDate(d){return d.toISOString().slice(0,10);}
function tdSymbol(a){
  // Tokyo listings: pass country=Japan to disambiguate numeric codes
  if(a.currency==='JPY')return {symbol:a.ticker, country:'Japan'};
  return {symbol:a.ticker};
}
function fhSymbol(a){ return a.currency==='JPY'? a.ticker+'.T' : a.ticker; }

async function tdTimeSeries(a){
  const key=Store.keys.td; if(!key)throw new Error('Twelve Data API繧ｭ繝ｼ譛ｪ險ｭ螳・);
  const m=tdSymbol(a);
  const u=new URL(TD_BASE+'/time_series');
  u.searchParams.set('symbol',m.symbol);
  if(m.country)u.searchParams.set('country',m.country);
  u.searchParams.set('interval','1day');
  u.searchParams.set('outputsize','200');
  u.searchParams.set('apikey',key);
  const r=await fetch(u.toString());
  const j=await r.json();
  if(j.status==='error'||!j.values)throw new Error(j.message||'譎らｳｻ蛻怜叙蠕励お繝ｩ繝ｼ');
  const vals=j.values.slice().reverse(); // oldest first
  return vals.map(v=>({open:+v.open,high:+v.high,low:+v.low,close:+v.close,vol:+(v.volume||0)}));
}
async function tdQuote(a){
  const key=Store.keys.td; if(!key)throw new Error('nokey');
  const m=tdSymbol(a);
  const u=new URL(TD_BASE+'/quote');
  u.searchParams.set('symbol',m.symbol);
  if(m.country)u.searchParams.set('country',m.country);
  u.searchParams.set('apikey',key);
  const r=await fetch(u.toString()); const j=await r.json();
  if(j.status==='error'||j.close===undefined)throw new Error(j.message||'quote error');
  return {price:+j.close, prevClose:+(j.previous_close||j.close), open:+(j.open||j.close),
          high:+(j.high||j.close), low:+(j.low||j.close)};
}
async function tdSearch(q){
  const key=Store.keys.td; if(!key)return null;
  const u=new URL(TD_BASE+'/symbol_search');
  u.searchParams.set('symbol',q); u.searchParams.set('outputsize','12'); u.searchParams.set('apikey',key);
  const r=await fetch(u.toString()); const j=await r.json();
  return (j&&j.data)?j.data:[];
}
async function fhCompanyNews(a){
  const key=Store.keys.fh; if(!key)throw new Error('nokey');
  const to=new Date(), from=new Date(Date.now()-21*864e5);
  const u=`${FH_BASE}/company-news?symbol=${encodeURIComponent(fhSymbol(a))}&from=${isoDate(from)}&to=${isoDate(to)}&token=${key}`;
  const r=await fetch(u); const j=await r.json();
  return Array.isArray(j)?j:[];
}
async function fhReco(a){
  const key=Store.keys.fh; if(!key)throw new Error('nokey');
  const u=`${FH_BASE}/stock/recommendation?symbol=${encodeURIComponent(fhSymbol(a))}&token=${key}`;
  const r=await fetch(u); const j=await r.json();
  return (Array.isArray(j)&&j.length)?j[0]:null;
}
async function fhMarketNews(){
  const key=Store.keys.fh; if(!key)throw new Error('nokey');
  const r=await fetch(`${FH_BASE}/news?category=general&token=${key}`);
  const j=await r.json(); return Array.isArray(j)?j.slice(0,40):[];
}

/* ---------- Yahoo Finance 繝励Ο繝舌う繝・・PI繧ｭ繝ｼ荳崎ｦ√・譌｢螳夲ｼ・----------
   繝悶Λ繧ｦ繧ｶ縺九ｉ逶ｴ謗･ Yahoo 繧貞娼縺上→ CORS 縺ｧ蠑ｾ縺九ｌ繧九◆繧√∝・髢気ORS繝励Ο繧ｭ繧ｷ繧・   鬆・↓隧ｦ縺吶ゅ☆縺ｹ縺ｦ螟ｱ謨励＠縺溷ｴ蜷医・繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ邉ｻ蛻励・縺ｾ縺ｾ邯咏ｶ壹☆繧九・*/
const YH_PROXIES=[
  u=>'https://corsproxy.io/?url='+encodeURIComponent(u),
  u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
  u=>'https://thingproxy.freeboard.io/fetch/'+u
];
const YH_INDEX={N225:'^N225',SPX:'^GSPC',NDX:'^IXIC',DJI:'^DJI'}; // TOPIX縺ｯ辟｡譁咏ｳｻ縺ｧ螳牙ｮ壼叙蠕嶺ｸ榊庄竊痴im邯咏ｶ・function yahooSymbol(a){ return a.yh || (a.currency==='JPY'? a.ticker+'.T' : a.ticker); }
async function yhFetchJSON(url){
  let lastErr;
  for(const p of YH_PROXIES){
    try{
      const r=await fetch(p(url),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      return await r.json();
    }catch(e){ lastErr=e; }
  }
  throw lastErr||new Error('蜈ｨ繝励Ο繧ｭ繧ｷ縺ｧ蜿門ｾ怜､ｱ謨・);
}
function yhParseChart(j){
  const res=j&&j.chart&&j.chart.result&&j.chart.result[0];
  if(!res||!res.indicators||!res.indicators.quote)throw new Error('繝・・繧ｿ蠖｢蠑上お繝ｩ繝ｼ');
  const q=res.indicators.quote[0], ts=res.timestamp||[], out=[];
  for(let i=0;i<ts.length;i++){
    const o=q.open[i],h=q.high[i],l=q.low[i],c=q.close[i];
    if(c==null||o==null)continue;
    out.push({open:o,high:h,low:l,close:c,volume:(q.volume&&q.volume[i])||0});
  }
  if(out.length<10)throw new Error('繝・・繧ｿ荳崎ｶｳ');
  return {candles:out, meta:res.meta||{}};
}
async function yahooSeries(a){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(a))}?range=1y&interval=1d`;
  return yhParseChart(await yhFetchJSON(url)).candles;
}
async function yahooQuote(a){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol(a))}?range=1d&interval=1m`;
  const {candles,meta}=yhParseChart(await yhFetchJSON(url));
  const last=candles[candles.length-1].close;
  return {price:meta.regularMarketPrice||last, prevClose:meta.chartPreviousClose||meta.previousClose||last,
    open:meta.regularMarketOpen||last, high:meta.regularMarketDayHigh||last, low:meta.regularMarketDayLow||last};
}
async function yahooIndexSeries(code){
  const sym=YH_INDEX[code]; if(!sym)throw new Error('no yahoo index');
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=6mo&interval=1d`;
  return yhParseChart(await yhFetchJSON(url)).candles;
}
async function liveIndices(){
  for(const ix of Object.values(Market.indices)){
    if(!YH_INDEX[ix.code])continue;
    try{
      const c=await yahooIndexSeries(ix.code);
      ix.candles=c; ix.closes=c.map(x=>x.close);
      ix.price=ix.closes[ix.closes.length-1]; ix.prevClose=ix.closes[ix.closes.length-2]; ix.live=true;
    }catch(e){}
    await sleep(250);
  }
  if(UI.view==='dashboard')renderCurrent();
}

/* apply a fetched candle series to an asset and recompute the (real) signal */
function applySeries(a,candles){
  if(!candles||candles.length<30)return;
  a.candles=candles;
  a.price=candles[candles.length-1].close;
  a.prevClose=candles[candles.length-2].close;
  a.dayOpen=candles[candles.length-1].open;
  a.signal=buildSignal(candles.map(c=>c.close));
  a.live=true;
}
function applyQuote(a,q){
  a.price=q.price; a.prevClose=q.prevClose;
  const c=a.candles[a.candles.length-1]; if(c){c.close=q.price;c.high=Math.max(c.high,q.price);c.low=Math.min(c.low,q.price);}
  a.live=true;
}

let _seriesQueue=[];
async function liveBootstrap(){
  const yahoo=Store.provider==='yahoo';
  if(!yahoo && !Store.keys.td){toast('Twelve Data API繧ｭ繝ｼ縺悟ｿ・ｦ√〒縺呻ｼ郁ｨｭ螳夂判髱｢・・);return;}
  UI.liveBusy=true; updateLiveBtn();
  if(yahoo) liveIndices(); // 謖・焚縺ｮ螳溘ョ繝ｼ繧ｿ蜿門ｾ暦ｼ井ｸｦ陦鯉ｼ・  const syms=trackedSymbols(); let ok=0, fail=0;
  for(const tk of syms){
    const a=getAsset(tk); if(!a)continue;
    if(UI._liveSeriesDone[tk]){ok++;continue;}
    try{
      const c = yahoo ? await yahooSeries(a) : await tdTimeSeries(a);
      applySeries(a,c); UI._liveSeriesDone[tk]=true; ok++;
      if(['dashboard','watchlist','signals','sectors'].includes(UI.view))renderCurrent();
      await sleep(yahoo?400:8200); // TD辟｡譁呎棧縺ｯ ~8 req/min
    }catch(e){ fail++; LiveCache.quoteErr=e.message;
      if(!yahoo && /run out|limit|credits/i.test(e.message||'')){toast('API繝ｬ繝ｼ繝井ｸ企剞縺ｫ驕斐＠縺ｾ縺励◆縲ょｰ代＠蠕・▲縺ｦ蜀崎ｩｦ陦後＠縺ｾ縺・);break;} }
  }
  UI.liveBusy=false; updateLiveBtn(); renderCurrent();
  if(ok)toast(`螳溘ョ繝ｼ繧ｿ蜷梧悄: ${ok}驫俶氛繧呈峩譁ｰ`+(fail?` / ${fail}莉ｶ縺ｯ蜿門ｾ励〒縺阪★sim邯咏ｶ啻:''));
  else if(fail)toast(yahoo?'螳溘ョ繝ｼ繧ｿ蜿門ｾ励↓螟ｱ謨暦ｼ亥屓邱・繝励Ο繧ｭ繧ｷ蛻ｶ髯撰ｼ峨ゅす繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ陦ｨ遉ｺ繧堤ｶ咏ｶ壹＠縺ｾ縺・:'繝ｩ繧､繝門叙蠕励↓螟ｱ謨励＠縺ｾ縺励◆縲ゅく繝ｼ縺ｨ驫俶氛繧ｳ繝ｼ繝峨ｒ縺皮｢ｺ隱阪￥縺縺輔＞');
}
async function liveQuotePoll(){
  if(!Store.live||UI.liveBusy)return;
  const yahoo=Store.provider==='yahoo';
  if(!yahoo && !Store.keys.td)return;
  const syms=trackedSymbols().slice(0,8);
  for(const tk of syms){
    const a=getAsset(tk); if(!a)continue;
    try{ const q = yahoo? await yahooQuote(a) : await tdQuote(a); applyQuote(a,q); checkTargets(a); await sleep(yahoo?250:800);}
    catch(e){ if(!yahoo && /run out|limit|credits/i.test(e.message||''))break; }
  }
  if(yahoo){
    for(const x of Object.values(Market.indices)){
      if(!YH_INDEX[x.code])continue;
      try{ const c=await yahooIndexSeries(x.code); x.price=c[c.length-1].close; x.closes[x.closes.length-1]=x.price; }catch(e){}
      await sleep(200);
    }
  }
  if(UI.view==='stock'&&UI.current)updateStockLive(); else renderCurrent();
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ============================================================
   NOTIFICATIONS  (逶ｮ讓呎ｪ萓｡蛻ｰ驕・/ 繧ｷ繧ｰ繝翫Ν霆｢謠・
   ============================================================ */
function pushAlert(ticker,msg,dir){
  const al={id:uid('a'),ticker,msg,dir,ts:Date.now(),seen:false};
  Store.alerts.unshift(al); if(Store.alerts.length>80)Store.alerts.length=80;
  saveStore(); updateNotifBadge(); toast(msg);
  try{ if('Notification'in window&&Notification.permission==='granted')new Notification('MagiFinance',{body:msg}); }catch(e){}
}
function checkTargets(a){
  const list=Store.targets[a.ticker]; if(!list)return;
  list.forEach(t=>{
    if(t.done)return;
    const hit=(t.dir==='up'&&a.price>=t.price)||(t.dir==='down'&&a.price<=t.price);
    if(hit){ t.done=true; pushAlert(a.ticker, `${a.name} 縺檎岼讓呎ｪ萓｡ ${fmtPrice(t.price,a.currency)} 縺ｫ蛻ｰ驕費ｼ育樟蝨ｨ ${fmtPrice(a.price,a.currency)}・荏, t.dir); }
  });
  saveStore();
}
function unseenCount(){return Store.alerts.filter(a=>!a.seen).length;}
function updateNotifBadge(){
  const b=$('#notifBadge'); if(!b)return; const n=unseenCount();
  b.style.display=n?'grid':'none'; b.textContent=n>99?'99+':n;
}

/* ============================================================
   MARKS  (豕ｨ逶ｮ髢句ｧ九°繧峨・鬨ｰ關ｽ)
   ============================================================ */
function isMarked(tk){return !!Store.marks[tk];}
function toggleMark(tk){
  const a=getAsset(tk); if(!a)return;
  if(Store.marks[tk]){delete Store.marks[tk];toast(`${a.name} 縺ｮ豕ｨ逶ｮ繧定ｧ｣髯､`);}
  else{Store.marks[tk]={price:a.price,ts:Date.now()};toast(`${a.name} 繧呈ｳｨ逶ｮ髢句ｧ具ｼ亥渕貅・${fmtPrice(a.price,a.currency)}・荏);}
  saveStore(); renderCurrent();
}
function markChange(a){
  const m=Store.marks[a.ticker]; if(!m)return null;
  const abs=a.price-m.price, pct=abs/m.price*100;
  return {abs,pct,base:m.price,ts:m.ts};
}

/* ============================================================
   WATCHLIST ops
   ============================================================ */
function inAnyList(tk){return Store.lists.some(l=>l.tickers.includes(tk));}
function addToList(tk,listId){
  const l=listById(listId||Store.activeList); if(!l)return;
  if(!l.tickers.includes(tk)){l.tickers.push(tk);saveStore();toast('繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝医↓霑ｽ蜉縺励∪縺励◆');
    if(Store.live)scheduleSeries(tk);}
}
function removeFromList(tk,listId){
  const l=listById(listId); if(!l)return;
  l.tickers=l.tickers.filter(t=>t!==tk); saveStore(); renderCurrent();
}
function scheduleSeries(tk){ if(Store.live&&Store.keys.td&&!UI._liveSeriesDone[tk]){ const a=getAsset(tk); if(a)tdTimeSeries(a).then(c=>{applySeries(a,c);UI._liveSeriesDone[tk]=true;renderCurrent();}).catch(()=>{});}}

/* ============================================================
   ROUTER
   ============================================================ */
function go(view,ticker){
  UI.view=view; if(ticker)UI.current=ticker;
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  $$('.view').forEach(v=>v.classList.remove('active'));
  const el=$('#view-'+view); if(el)el.classList.add('active');
  renderCurrent(); $('#main').scrollTop=0;
}
function renderCurrent(){
  const v=UI.view;
  if(v==='dashboard')renderDashboard();
  else if(v==='watchlist')renderWatchlist();
  else if(v==='signals')renderSignals();
  else if(v==='sectors')renderSectors();
  else if(v==='news')renderNews();
  else if(v==='notifications')renderNotifications();
  else if(v==='stock')renderStock();
  else if(v==='datasource')renderDataSource();
  else if(v==='settings')renderSettings();
}

/* ---------- small render helpers ---------- */
function chgHTML(a){const d=dayChange(a);const c=signCls(d.pct);return `<span class="mono ${c}">${pct(d.pct)}</span>`;}
function priceHTML(a){return `<span class="mono">${fmtPrice(a.price,a.currency)}</span>`;}
function verdictPill(s){return `<span class="verdict-pill ${s.vClass}">${s.verdict}</span>`;}
function sparkSVG(closes,w=104,h=30){
  const n=Math.min(40,closes.length),arr=closes.slice(-n),mn=Math.min(...arr),mx=Math.max(...arr),rng=mx-mn||1;
  const up=arr[arr.length-1]>=arr[0];
  const pts=arr.map((v,i)=>`${(i/(n-1)*w).toFixed(1)},${(h-((v-mn)/rng)*h).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up?'var(--up)':'var(--down)'}" stroke-width="1.6"/></svg>`;
}
function assetRow(a,opts={}){
  const mk=isMarked(a.ticker), mc=markChange(a);
  const since=mc?`<span class="markchip"><span class="lbl">豕ｨ逶ｮ縺九ｉ</span><span class="${signCls(mc.pct)}">${pct(mc.pct)}</span></span>`:'';
  const del=opts.listId?`<button class="del-x" data-rm="${a.ticker}" data-list="${opts.listId}" title="蜑企勁">笨・/button>`:'';
  return `<div class="asset-row" data-go="${a.ticker}">
    <div class="ar-id"><span class="ar-tk mono">${a.ticker}</span><span class="ar-nm">${a.name}</span></div>
    <div class="ar-spark">${sparkSVG(a.candles.map(c=>c.close))}</div>
    ${since?`<div class="ar-since">${since}</div>`:''}
    <div class="ar-sig">${verdictPill(a.signal)}</div>
    <div class="ar-px">${priceHTML(a)}<div class="ar-chg">${chgHTML(a)}</div></div>
    <div class="ar-act">${mk?'<span class="star on" title="豕ｨ逶ｮ荳ｭ">笘・/span>':''}${del}</div>
  </div>`;
}

/* ============================================================
   VIEW: DASHBOARD
   ============================================================ */
function renderDashboard(){
  const idx=Object.values(Market.indices).filter(ix=>{
    if(Store.region==='all')return true;
    const jp=['N225','TOPIX'].includes(ix.code); return Store.region==='jp'?jp:!jp;
  });
  const strip=idx.map(ix=>{
    const d=(ix.price-ix.prevClose)/ix.prevClose*100;
    return `<div class="ix-card"><div class="ix-name">${ix.name}</div>
      <div class="ix-val mono">${fmtNum(ix.price,2)}</div>
      <div class="ix-chg mono ${signCls(d)}">${pct(d)}</div>
      <div class="ix-spark">${sparkSVG(ix.closes,120,26)}</div></div>`;
  }).join('');

  const pool=allAssets().filter(inRegion);
  const buys=pool.slice().sort((a,b)=>b.signal.score-a.signal.score).slice(0,5);
  const sells=pool.slice().sort((a,b)=>a.signal.score-b.signal.score).slice(0,5);
  const movers=pool.slice().sort((a,b)=>dayChange(b).pct-dayChange(a).pct);
  const gain=movers.slice(0,5), lose=movers.slice(-5).reverse();
  const wl=activeList().tickers.map(getAsset).filter(Boolean).filter(inRegion);

  const liveBanner = Store.live
    ? (Store.provider==='yahoo'
        ? `<div class="banner info">笞｡ 螳溘ョ繝ｼ繧ｿ(Yahoo Finance)縺ｧ蜷梧悄荳ｭ縺ｧ縺吶ょ屓邱壹ｄ繝励Ο繧ｭ繧ｷ縺ｮ迥ｶ豕√↓繧医ｊ荳驛ｨ驫俶氛縺ｯ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ縺ｮ縺ｾ縺ｾ陦ｨ遉ｺ縺輔ｌ繧句ｴ蜷医′縺ゅｊ縺ｾ縺吶・/div>`
        : (Store.keys.td?'':`<div class="banner warn">笞｡ 繝ｩ繧､繝冶｡ｨ遉ｺ荳ｭ縺ｧ縺吶′ Twelve Data 縺ｮAPI繧ｭ繝ｼ縺梧悴險ｭ螳壹〒縺吶・b style="cursor:pointer;text-decoration:underline" data-open="keys">繧ｭ繝ｼ繧定ｨｭ螳・/b>縺吶ｋ縺ｨ螳溘ョ繝ｼ繧ｿ縺ｫ蛻・ｊ譖ｿ繧上ｊ縺ｾ縺吶・/div>`))
    : `<div class="banner info">迴ｾ蝨ｨ縺ｯ繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ陦ｨ遉ｺ縺ｧ縺吶・b style="cursor:pointer;text-decoration:underline" data-open="live">螳溘ョ繝ｼ繧ｿ縺ｫ蛻・ｊ譖ｿ縺医ｋ・・ahoo Finance繝ｻAPI繧ｭ繝ｼ荳崎ｦ・ｼ・/b>縲√∪縺溘・<b style="cursor:pointer;text-decoration:underline" data-open="keys">API繧ｭ繝ｼ險ｭ螳・/b>繧偵＃蛻ｩ逕ｨ縺上□縺輔＞縲・/div>`;

  $('#view-dashboard').innerHTML=`
    ${liveBanner}
    <div class="ix-strip">${strip||'<div class="muted">蟇ｾ雎｡蝨ｰ蝓溘・謖・焚縺ｯ縺ゅｊ縺ｾ縺帙ｓ</div>'}</div>
    <div class="dash-grid">
      <div class="card span2">
        <div class="card-head"><h2>繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝・span class="sub">繝ｻ${activeList().name}</span></h2>
          <button class="add-btn" data-open="addstock">・・驫俶氛繧定ｿｽ蜉</button></div>
        <div class="asset-list">${wl.length?wl.map(a=>assetRow(a,{listId:Store.activeList})).join(''):'<div class="empty-mini">驫俶氛縺檎匳骭ｲ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲ゅ碁釜譟・ｒ霑ｽ蜉縲阪°繧臥匳骭ｲ縺励※縺上□縺輔＞縲・/div>'}</div>
      </div>
      <div class="card">
        <div class="card-head"><h2>雋ｷ縺・呵｣・<span class="sub">蜈ｨ${pool.length}驫俶氛縺九ｉ蛻・梵</span></h2><button class="link-btn" data-view-link="signals">縺吶∋縺ｦ隕九ｋ 竊・/button></div>
        <div class="mini-list">${buys.map(a=>miniSig(a)).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><h2>螢ｲ繧翫・隴ｦ謌・/h2></div>
        <div class="mini-list">${sells.map(a=>miniSig(a)).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><h2>蛟､荳翫′繧顔紫</h2></div>
        <div class="mini-list">${gain.map(a=>miniMove(a)).join('')}</div>
      </div>
      <div class="card">
        <div class="card-head"><h2>蛟､荳九′繧顔紫</h2></div>
        <div class="mini-list">${lose.map(a=>miniMove(a)).join('')}</div>
      </div>
    </div>`;
}
function miniSig(a){return `<div class="mini-row" data-go="${a.ticker}">
  <span class="mini-tk mono">${a.ticker}</span><span class="mini-nm">${a.name}</span>
  ${verdictPill(a.signal)}<span class="mini-score mono ${a.signal.score>=0?'up':'down'}">${a.signal.score>0?'+':''}${a.signal.score}</span></div>`;}
function miniMove(a){const d=dayChange(a);return `<div class="mini-row" data-go="${a.ticker}">
  <span class="mini-tk mono">${a.ticker}</span><span class="mini-nm">${a.name}</span>
  <span class="mono">${fmtPrice(a.price,a.currency)}</span><span class="mini-score mono ${signCls(d.pct)}">${pct(d.pct)}</span></div>`;}

/* ============================================================
   VIEW: WATCHLIST (隍・焚繝ｪ繧ｹ繝・
   ============================================================ */
function renderWatchlist(){
  const tabs=Store.lists.map(l=>`<button class="wltab ${l.id===Store.activeList?'on':''}" data-list-tab="${l.id}">
    ${l.name}<span class="ct">${l.tickers.length}</span></button>`).join('');
  const l=activeList();
  const rows=l.tickers.map(getAsset).filter(Boolean).filter(inRegion);
  $('#view-watchlist').innerHTML=`
    <div class="view-head"><h1>繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝・/h1>
      <div class="vh-actions"><button class="add-btn" data-open="addstock">・・驫俶氛繧定ｿｽ蜉</button></div></div>
    <div class="wltabs">${tabs}
      <button class="wltab add" data-open="newlist">・・繝ｪ繧ｹ繝井ｽ懈・</button>
      ${Store.lists.length>0?`<button class="wltab" data-open="managelist" title="繝ｪ繧ｹ繝育ｷｨ髮・>笞・/button>`:''}
    </div>
    <div class="asset-list big">${rows.length?rows.map(a=>assetRow(a,{listId:l.id})).join(''):
      `<div class="empty-state"><div class="es-ico">笘・/div><div class="es-t">縲・{l.name}縲阪・遨ｺ縺ｧ縺・/div>
       <div class="es-d">荳翫・縲碁釜譟・ｒ霑ｽ蜉縲阪°繧峨∬ｿｽ霍｡縺励◆縺・ｪ繧堤匳骭ｲ縺励∪縺励ｇ縺・よ､懃ｴ｢縺ｧ譌･譛ｬ譬ｪ繝ｻ豬ｷ螟匁ｪ縺ｩ縺｡繧峨ｂ霑ｽ蜉縺ｧ縺阪∪縺吶・/div></div>`}</div>`;
}

/* ============================================================
   VIEW: SIGNALS (蜈ｨ驫俶氛繧ｹ繧ｭ繝｣繝ｳ)
   ============================================================ */
function renderSignals(){
  const pool=allAssets().filter(inRegion).slice().sort((a,b)=>b.signal.score-a.signal.score);
  const buy=pool.filter(a=>a.signal.score>=18);
  const hold=pool.filter(a=>a.signal.score>-18&&a.signal.score<18);
  const sell=pool.filter(a=>a.signal.score<=-18);
  const col=(title,arr,cls)=>`<div class="sig-col">
    <div class="sig-col-head ${cls}">${title}<span class="ct mono">${arr.length}</span></div>
    ${arr.length?arr.map(sigCard).join(''):'<div class="empty-mini">隧ｲ蠖薙↑縺・/div>'}</div>`;
  $('#view-signals').innerHTML=`
    <div class="view-head"><h1>雋ｷ縺・・螢ｲ繧雁呵｣・/h1>
      <div class="vh-sub">${Store.region==='all'?'譌･譛ｬ・区ｵｷ螟・:Store.region==='jp'?'譌･譛ｬ譬ｪ':'豬ｷ螟匁ｪ'}縺ｮ蜈ｨ${pool.length}驫俶氛繧・謖・ｨ吶〒蛻・梵縺励√せ繧ｳ繧｢鬆・↓繝ｩ繝ｳ繧ｯ莉倥￠縺励※縺・∪縺吶・/div></div>
    <div class="sig-board">${col('雋ｷ縺・,buy,'up')}${col('荳ｭ遶・,hold,'flat')}${col('螢ｲ繧・,sell,'down')}</div>`;
}
function sigCard(a){
  const top=a.signal.factors.slice().sort((x,y)=>Math.abs(y.val)-Math.abs(x.val))[0];
  return `<div class="sig-card" data-go="${a.ticker}">
    <div class="sc-top"><span class="sc-tk mono">${a.ticker}</span><span class="sc-nm">${a.name}</span>
      <span class="sc-score mono ${a.signal.score>=0?'up':'down'}">${a.signal.score>0?'+':''}${a.signal.score}</span></div>
    <div class="sc-mid">${verdictPill(a.signal)}<span class="sc-conf">遒ｺ菫｡蠎ｦ ${a.signal.confidence}%</span>
      <span class="mono sc-px">${fmtPrice(a.price,a.currency)}</span></div>
    <div class="sc-note">荳ｻ蝗: ${top.label}・・{top.note}・・/div></div>`;
}

/* ============================================================
   VIEW: 讌ｭ逡悟挨繝帙ャ繝・(HOT SECTORS) + 雋ｷ縺・凾繝ｪ繧ｹ繝・   ============================================================ */
function sectorAggregate(){
  const pool=allAssets().filter(inRegion);
  const map={};
  pool.forEach(a=>{
    const s=a.sector||'縺昴・莉・;
    (map[s]=map[s]||{sector:s,assets:[]}).assets.push(a);
  });
  const arr=Object.values(map).map(g=>{
    const n=g.assets.length;
    const avgScore=g.assets.reduce((s,a)=>s+a.signal.score,0)/n;
    const avgChg=g.assets.reduce((s,a)=>s+dayChange(a).pct,0)/n;
    const buys=g.assets.filter(a=>a.signal.score>=18).length;
    // 繝偵・繝域欠讓・ 繧ｷ繧ｰ繝翫Ν繧ｹ繧ｳ繧｢縺ｨ蠖捺律鬨ｰ關ｽ邇・ｒ蜷域・
    const heat=avgScore*0.7+clamp(avgChg*5,-30,30)*0.6;
    const leaders=g.assets.slice().sort((x,y)=>y.signal.score-x.signal.score).slice(0,3);
    return {...g,n,avgScore,avgChg,buys,heat,leaders};
  });
  return arr.sort((a,b)=>b.heat-a.heat);
}
function renderSectors(){
  const sectors=sectorAggregate();
  const pool=allAssets().filter(inRegion);
  // 雋ｷ縺・凾縺ｮ譬ｪ繝ｪ繧ｹ繝・ 繧ｹ繧ｳ繧｢荳贋ｽ・+ 驕守・縺励☆縺弱※縺・↑縺・RSI<72)驫俶氛
  const buyList=pool.slice()
    .filter(a=>a.signal.score>=18 && a.signal.rsi<72)
    .sort((a,b)=>b.signal.score-a.signal.score).slice(0,8);
  const flame=h=>h>=20?'櫨':h>=8?'幻・・:h>=-8?'筐・:'ｧ・;
  const heatBadge=h=>h>=8?'<span class="heat-badge hot">驕守・繝ｻ雋ｷ縺・━蜍｢</span>':h<=-8?'<span class="heat-badge cold">霆溯ｪｿ繝ｻ螢ｲ繧雁━蜍｢</span>':'<span class="heat-badge warm">荳ｭ遶・/span>';
  const cards=sectors.map((g,i)=>{
    const w=clamp((g.heat+40)/80*100,4,100);
    const cold=g.heat<0;
    return `<div class="heat-card">
      <span class="rank">#${i+1}</span>
      <div class="heat-top"><span class="heat-flame">${flame(g.heat)}</span>
        <span class="heat-name">${g.sector}</span>
        <span class="heat-score ${g.heat>=0?'up':'down'}">${g.heat>0?'+':''}${g.heat.toFixed(0)}</span></div>
      <div class="heat-meter"><i class="${cold?'cold':''}" style="width:${w}%"></i></div>
      <div class="heat-stats">${heatBadge(g.heat)}
        <span>驫俶氛 <b>${g.n}</b></span>
        <span>蟷ｳ蝮・ｨｰ關ｽ <b class="${signCls(g.avgChg)}">${pct(g.avgChg)}</b></span>
        <span>雋ｷ縺・す繧ｰ繝翫Ν <b>${g.buys}</b></span></div>
      <div class="heat-stocks">${g.leaders.map(a=>`<div class="heat-stock" data-go="${a.ticker}">
        <span class="ht-tk">${a.ticker}</span><span class="ht-nm">${a.name}</span>
        ${verdictPill(a.signal)}<span class="mono ${signCls(dayChange(a).pct)}">${pct(dayChange(a).pct)}</span></div>`).join('')}</div>
    </div>`;
  }).join('');
  $('#view-sectors').innerHTML=`
    <div class="view-head"><h1>讌ｭ逡悟挨繝帙ャ繝・/h1>
      <div class="vh-sub">${Store.region==='all'?'譌･譛ｬ・区ｵｷ螟・:Store.region==='jp'?'譌･譛ｬ譬ｪ':'豬ｷ螟匁ｪ'}縺ｮ蜈ｨ${pool.length}驫俶氛繧呈･ｭ逡・繧ｻ繧ｯ繧ｿ繝ｼ)蛻･縺ｫ髮・ｨ医＠縲√ユ繧ｯ繝九き繝ｫ繧ｹ繧ｳ繧｢縺ｨ蠖捺律鬨ｰ關ｽ邇・ｒ蜷域・縺励◆縲後ヲ繝ｼ繝域欠讓吶阪′鬮倥＞鬆・↓荳ｦ縺ｹ縺ｦ縺・∪縺吶ゆｻ翫＞縺｡縺ｰ繧灘兇縺・・縺ゅｋ讌ｭ逡後′縺ｲ縺ｨ逶ｮ縺ｧ蛻・°繧翫∪縺吶・/div></div>
    <div class="card buylist-card">
      <div class="card-head"><h2>將 莉頑律縺ｮ雋ｷ縺・凾繝ｪ繧ｹ繝・<span class="sub">繧ｹ繧ｳ繧｢荳贋ｽ阪・驕守・縺励☆縺弱※縺・↑縺・釜譟・/span></h2>
        <button class="link-btn" data-view-link="signals">蜈ｨ蛟呵｣懊ｒ隕九ｋ 竊・/button></div>
      ${buyList.length?buyList.map((a,i)=>{
        const top=a.signal.factors.slice().sort((x,y)=>Math.abs(y.val)-Math.abs(x.val))[0];
        return `<div class="buy-row" data-go="${a.ticker}">
          <span class="buy-rank">${i+1}</span>
          <div><div class="ar-nm">${a.name} <span class="mono" style="color:var(--txt-3);font-size:11px">${a.ticker}</span></div>
            <div class="buy-reason">${a.sector}繝ｻ${top.label}・・{top.note}・会ｼ・RSI ${fmtNum(a.signal.rsi,0)}</div></div>
          ${verdictPill(a.signal)}
          <div class="ar-px">${priceHTML(a)}<div class="ar-chg">${chgHTML(a)}</div></div></div>`;
      }).join(''):'<div class="empty-mini">迴ｾ蝨ｨ縲∝ｼｷ縺・ｲｷ縺・呵｣懊・縺ゅｊ縺ｾ縺帙ｓ縲ゆｸｭ遶九懷｣ｲ繧雁━蜍｢縺ｮ蝨ｰ蜷医＞縺ｧ縺吶・/div>'}
    </div>
    <div class="card" style="background:none;border:none;padding:0;margin-bottom:10px"><div class="card-head"><h2>讌ｭ逡後ヲ繝ｼ繝医・繝・・</h2></div></div>
    <div class="heat-grid">${cards}</div>`;
}

/* ============================================================
   VIEW: NEWS + EXPERTS
   ============================================================ */
function renderNews(){
  const watchTickers=[...new Set(Store.lists.flatMap(l=>l.tickers))].map(getAsset).filter(Boolean).filter(inRegion);
  $('#view-news').innerHTML=`
    <div class="view-head"><h1>繝九Η繝ｼ繧ｹ繝ｻ蟆る摩螳ｶ</h1>
      <div class="vh-actions"><div class="seg" id="newsSeg">
        <button data-news="watch" class="${UI.newsTab==='watch'?'on':''}">豕ｨ逶ｮ驫俶氛</button>
        <button data-news="market" class="${UI.newsTab==='market'?'on':''}">蟶ょｴ蜈ｨ菴・/button></div>
        <button class="btn ghost btn-sm" id="newsRefresh">譖ｴ譁ｰ</button></div></div>
    <div id="newsBody"><div class="loading-row"><span class="spin"></span>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ窶ｦ</div></div>`;
  loadNews(watchTickers);
}
async function loadNews(watchTickers){
  const body=$('#newsBody'); if(!body)return;
  const useLive=Store.live&&Store.keys.fh;
  try{
    if(UI.newsTab==='market'){
      if(useLive){
        const items=await fhMarketNews();
        body.innerHTML=items.length?items.map(n=>liveNewsCard(n)).join(''):simMarketNews();
      } else body.innerHTML=simMarketNews();
    } else {
      if(!watchTickers.length){body.innerHTML='<div class="empty-mini">繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝医↓驫俶氛繧定ｿｽ蜉縺吶ｋ縺ｨ縲√◎縺ｮ莨∵･ｭ縺ｮ繝九Η繝ｼ繧ｹ縺ｨ蟆る摩螳ｶ隧穂ｾ｡縺瑚｡ｨ遉ｺ縺輔ｌ縺ｾ縺吶・/div>';return;}
      if(useLive){
        let html='';
        for(const a of watchTickers.slice(0,6)){
          let news=[],reco=null;
          try{news=await fhCompanyNews(a);}catch(e){}
          try{reco=await fhReco(a);}catch(e){}
          html+=`<div class="news-company"><div class="nc-head"><span class="mono nc-tk">${a.ticker}</span><span class="nc-nm">${a.name}</span></div>`;
          if(reco)html+=analystBlock(a,reco);
          html+= news.length? news.slice(0,4).map(n=>liveNewsCard(n)).join('') : `<div class="empty-mini">縺薙・驫俶氛縺ｮ譛霑代・繝九Η繝ｼ繧ｹ縺ｯ蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆・育┌譁呎棧縺ｯ邀ｳ蝗ｽ驫俶氛荳ｭ蠢・〒縺呻ｼ峨・/div>`;
          html+='</div>';
        }
        body.innerHTML=html;
      } else {
        body.innerHTML=watchTickers.slice(0,8).map(a=>simCompanyNews(a)).join('');
      }
    }
  }catch(e){ body.innerHTML=`<div class="banner warn">繝九Η繝ｼ繧ｹ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆: ${e.message}</div>`+simMarketNews(); }
}
function liveNewsCard(n){
  const senti = n.sentiment||'neutral';
  const t=n.datetime?timeAgo(Math.max(1,Math.floor((Date.now()/1000-n.datetime)/60))):'';
  return `<a class="news-card" href="${n.url||'#'}" target="_blank" rel="noopener">
    <div class="news-head"><span class="news-src">${n.source||'News'}</span>
      ${n.related?`<span class="news-tk mono">${n.related}</span>`:''}<span class="news-time">${t}</span></div>
    <div class="news-title">${escapeHTML(n.headline||'')}</div>
    ${n.summary?`<div class="news-ex">${escapeHTML(n.summary).slice(0,160)}窶ｦ</div>`:''}
    <span class="news-link">蜈・ｨ倅ｺ九ｒ髢九￥ 竊・/span></a>`;
}
function analystBlock(a,r){
  const total=r.strongBuy+r.buy+r.hold+r.sell+r.strongSell||1;
  const w=k=>((r[k]/total)*100).toFixed(1)+'%';
  const score=(r.strongBuy*2+r.buy-r.sell-r.strongSell*2)/total;
  const cons=score>0.6?'蠑ｷ縺・ｲｷ縺・:score>0.15?'雋ｷ縺・:score>-0.15?'荳ｭ遶・:score>-0.6?'螢ｲ繧・:'蠑ｷ縺・｣ｲ繧・;
  const ccls=score>0.15?'up':score<-0.15?'down':'flat';
  return `<div class="analyst"><div class="muted" style="font-size:12px">繧｢繝翫Μ繧ｹ繝茨ｼ亥ｰる摩螳ｶ・峨さ繝ｳ繧ｻ繝ｳ繧ｵ繧ｹ 窶・${r.period||''}</div>
    <div class="an-consensus ${ccls}">${cons}</div>
    <div class="an-bar">
      <div class="an-seg ss" style="width:${w('strongBuy')}"></div><div class="an-seg b" style="width:${w('buy')}"></div>
      <div class="an-seg h" style="width:${w('hold')}"></div><div class="an-seg s" style="width:${w('sell')}"></div>
      <div class="an-seg sb" style="width:${w('strongSell')}" ></div></div>
    <div class="an-leg">
      <span><span class="an-dot" style="background:var(--up)"></span>蠑ｷ豌苓ｲｷ縺・${r.strongBuy}</span>
      <span><span class="an-dot" style="background:#3fae6e"></span>雋ｷ縺・${r.buy}</span>
      <span><span class="an-dot" style="background:var(--txt-3)"></span>荳ｭ遶・${r.hold}</span>
      <span><span class="an-dot" style="background:#c0556a"></span>螢ｲ繧・${r.sell}</span>
      <span><span class="an-dot" style="background:var(--down)"></span>蠑ｷ豌怜｣ｲ繧・${r.strongSell}</span></div>
    <div class="muted" style="font-size:11px;margin-top:8px">蜃ｺ蜈ｸ: Finnhub 髮・ｨ茨ｼ郁､・焚險ｼ蛻ｸ莨夂､ｾ繧｢繝翫Μ繧ｹ繝医・謗ｨ螂ｨ・・/div></div>`;
}
function simCompanyNews(a){
  const items=genNews().filter(n=>n.ticker===a.ticker).slice(0,3);
  const base=items.length?items:[{title:`${a.name}縲√ユ繧ｯ繝九き繝ｫ謖・ｨ吶・${a.signal.verdict}繧堤､ｺ蜚・,senti:a.signal.vClass==='up'?'pos':a.signal.vClass==='down'?'neg':'neutral',src:NEWS_SRC[0],min:42,ex:newsExcerpt(a,a.signal.vClass==='up'?'pos':'neg')}];
  return `<div class="news-company"><div class="nc-head"><span class="mono nc-tk">${a.ticker}</span><span class="nc-nm">${a.name}</span>${verdictPill(a.signal)}</div>
    ${base.map(n=>`<div class="news-card" data-go="${a.ticker}" style="cursor:pointer">
      <div class="news-head"><span class="news-senti ${n.senti}">${n.senti==='pos'?'繝昴ず繝・ぅ繝・:n.senti==='neg'?'繝阪ぎ繝・ぅ繝・:'荳ｭ遶・}</span>
        <span class="news-src">${n.src}</span><span class="news-time">${timeAgo(n.min)}</span></div>
      <div class="news-title">${n.title}</div><div class="news-ex">${n.ex}</div></div>`).join('')}
    <div class="muted" style="font-size:11px">窶ｻ 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ逕滓・縺ｮ繝九Η繝ｼ繧ｹ縺ｧ縺吶・innhub API繧ｭ繝ｼ繧定ｨｭ螳壹☆繧九→螳溘ル繝･繝ｼ繧ｹ縺ｨ蟆る摩螳ｶ隧穂ｾ｡縺ｫ蛻・ｊ譖ｿ繧上ｊ縺ｾ縺吶・/div></div>`;
}
function simMarketNews(){
  const items=genNews().filter(n=>!n.ticker).slice(0,10);
  return items.map(n=>`<div class="news-card" style="cursor:default">
    <div class="news-head"><span class="news-senti ${n.senti}">${n.senti==='pos'?'繝昴ず繝・ぅ繝・:n.senti==='neg'?'繝阪ぎ繝・ぅ繝・:'荳ｭ遶・}</span>
      <span class="news-src">${n.src}</span><span class="news-time">${timeAgo(n.min)}</span></div>
    <div class="news-title">${n.title}</div><div class="news-ex">${n.ex}</div></div>`).join('')
    +`<div class="muted" style="font-size:11px;margin-top:6px">窶ｻ 繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ逕滓・縲ょｮ溘ル繝･繝ｼ繧ｹ縺ｯ險ｭ螳壹〒Finnhub API繧ｭ繝ｼ繧堤匳骭ｲ縺励※縺上□縺輔＞縲・/div>`;
}

/* ============================================================
   VIEW: NOTIFICATIONS
   ============================================================ */
function renderNotifications(){
  Store.alerts.forEach(a=>a.seen=true); saveStore(); updateNotifBadge();
  const targetCount=Object.values(Store.targets).reduce((s,l)=>s+(l?l.filter(t=>!t.done).length:0),0);
  $('#view-notifications').innerHTML=`
    <div class="view-head"><h1>騾夂衍繧ｻ繝ｳ繧ｿ繝ｼ</h1>
      <div class="vh-sub">險ｭ螳壻ｸｭ縺ｮ逶ｮ讓呎ｪ萓｡繧｢繝ｩ繝ｼ繝・ ${targetCount}莉ｶ ・・螻･豁ｴ: ${Store.alerts.length}莉ｶ
        ${Store.alerts.length?'<button class="btn ghost btn-sm" id="clearAlerts" style="margin-left:10px">螻･豁ｴ繧呈ｶ亥悉</button>':''}</div></div>
    <div class="notif-list">${Store.alerts.length?Store.alerts.map(notifRow).join(''):
      '<div class="empty-state"><div class="es-ico">粕</div><div class="es-t">騾夂衍縺ｯ縺ｾ縺縺ゅｊ縺ｾ縺帙ｓ</div><div class="es-d">驫俶氛隧ｳ邏ｰ縺九ｉ縲檎岼讓呎ｪ萓｡繧定ｨｭ螳壹阪☆繧九→縲∽ｾ｡譬ｼ蛻ｰ驕疲凾縺ｫ縺薙％縺ｸ騾夂衍縺輔ｌ縺ｾ縺吶・/div></div>'}</div>`;
}
function notifRow(al){
  const a=getAsset(al.ticker);
  return `<div class="notif ${al.seen?'':'unseen'}" ${a?`data-go="${al.ticker}"`:''} style="${a?'cursor:pointer':''}">
    <div class="nico ${al.dir==='down'?'down':'up'}">${al.dir==='down'?'笆ｼ':'笆ｲ'}</div>
    <div class="nbody"><div class="nmsg">${al.msg}</div><div class="nmeta">${new Date(al.ts).toLocaleString('ja-JP')}</div></div></div>`;
}

/* ============================================================
   VIEW: STOCK DETAIL
   ============================================================ */
function renderStock(){
  const a=getAsset(UI.current); if(!a){$('#view-stock').innerHTML='<div class="empty-mini">驫俶氛縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ</div>';return;}
  const d=dayChange(a), mc=markChange(a);
  const ranges=[60,120,200].map(r=>`<button class="rng ${UI.stockRange===r?'on':''}" data-range="${r}">${r}譌･</button>`).join('');
  const targets=(Store.targets[a.ticker]||[]);
  const sinceBlock=mc?`<div class="markchip"><span class="lbl">豕ｨ逶ｮ髢句ｧ・${new Date(mc.ts).toLocaleDateString('ja-JP')})縺九ｉ</span>
      <span class="${signCls(mc.pct)}">${mc.abs>=0?'笆ｲ':'笆ｼ'} ${fmtPrice(Math.abs(mc.abs),a.currency)} (${pct(mc.pct)})</span></div>`:'';
  $('#view-stock').innerHTML=`
    <div class="stock-head">
      <div class="sh-id"><button class="back-btn" data-view-link="dashboard">竊・謌ｻ繧・/button>
        <div class="sh-tk mono">${a.ticker}</div><div class="sh-nm">${a.name}</div>
        <span class="sh-mkt">${a.market}繝ｻ${a.sector}</span>${a.live?'<span class="live-dot">笳・LIVE</span>':''}</div>
      <div class="sh-actions">
        <button class="btn ${isMarked(a.ticker)?'primary':'ghost'} btn-sm" data-mark="${a.ticker}">${isMarked(a.ticker)?'笘・豕ｨ逶ｮ荳ｭ':'笘・豕ｨ逶ｮ髢句ｧ・}</button>
        <button class="btn ghost btn-sm" data-open="settarget">粕 逶ｮ讓呎ｪ萓｡</button>
        <button class="btn ghost btn-sm" data-addwatch="${a.ticker}">${inAnyList(a.ticker)?'笨・逋ｻ骭ｲ貂医∩':'・・繧ｦ繧ｩ繝・メ'}</button>
      </div>
    </div>
    <div class="stock-price">
      <div class="sp-now mono" id="dPrice">${fmtPrice(a.price,a.currency)}</div>
      <div class="sp-chg mono ${signCls(d.pct)}" id="dChg">${d.abs>=0?'+':''}${fmtPrice(d.abs,a.currency)}・・{pct(d.pct)}・・/div>
      ${sinceBlock}
    </div>
    <div class="stock-grid">
      <div class="card gauge-card"><div class="card-head"><h2>MAGI蛻､螳・/h2></div>
        <div id="dGauge">${gaugeSVG(a.signal)}</div>
        <div class="verdict-note" id="dVerdictNote">${verdictNote(a)}</div></div>
      <div class="card factors-card"><div class="card-head"><h2>蛻､螳壹ヵ繧｡繧ｯ繧ｿ繝ｼ</h2></div>
        <div id="dFactors">${factorsHTML(a.signal)}</div></div>
    </div>
    <div class="card chart-card">
      <div class="card-head"><h2>萓｡譬ｼ繝√Ε繝ｼ繝・/h2><div class="rng-seg" id="rangeSeg">${ranges}</div></div>
      <canvas id="mainChart" height="360"></canvas>
      <div class="chart-legend"><span><i style="background:var(--gold)"></i>25譌･邱・/span><span><i style="background:var(--violet)"></i>75譌･邱・/span>
        <span><i style="background:var(--cyan);opacity:.5"></i>繝懊Μ繝ｳ繧ｸ繝｣繝ｼ</span></div>
    </div>
    ${targets.length?`<div class="card"><div class="card-head"><h2>險ｭ螳壻ｸｭ縺ｮ逶ｮ讓呎ｪ萓｡</h2></div>
      ${targets.map(t=>targetRow(a,t)).join('')}</div>`:''}
    <div class="card"><div class="card-head"><h2>荳ｻ隕∵欠讓・/h2></div><div class="metrics">${metricsHTML(a)}</div></div>
    <div class="card"><div class="card-head"><h2>繝九Η繝ｼ繧ｹ繝ｻ蟆る摩螳ｶ隧穂ｾ｡</h2></div>
      <div id="stockNews"><div class="loading-row"><span class="spin"></span>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ窶ｦ</div></div></div>`;
  requestAnimationFrame(()=>drawChart(a,UI.stockRange));
  loadStockNews(a);
}
function verdictNote(a){
  const s=a.signal;
  return `邱丞粋繧ｹ繧ｳ繧｢ <b class="${s.score>=0?'up':'down'}">${s.score>0?'+':''}${s.score}</b> / 遒ｺ菫｡蠎ｦ ${s.confidence}%縲・{
    s.vClass==='up'?'隍・焚縺ｮ謖・ｨ吶′荳頑・繧呈髪謖√＠縺ｦ縺・∪縺吶・:s.vClass==='down'?'隍・焚縺ｮ謖・ｨ吶′荳玖誠繝ｪ繧ｹ繧ｯ繧堤､ｺ縺励※縺・∪縺吶・:'譁ｹ蜷第─縺悟ｮ壹∪繧峨↑縺・ｸｭ遶句恟縺ｧ縺吶・}`;
}
function factorsHTML(s){
  return s.factors.map(f=>{
    const w=Math.min(100,Math.abs(f.val)/25*100);
    return `<div class="factor"><div class="f-top"><span class="f-lbl">${f.label}</span>
      <span class="f-val mono ${f.val>=0?'up':'down'}">${f.val>0?'+':''}${f.val.toFixed(0)}</span></div>
      <div class="f-bar"><div class="f-fill ${f.val>=0?'up':'down'}" style="width:${w}%;margin-left:${f.val<0?(100-w)/2:50}%"></div></div>
      <div class="f-note">${f.note}</div></div>`;
  }).join('');
}
function metricsHTML(a){
  const s=a.signal;
  const rows=[['譎ゆｾ｡邱城｡・,fmtCap(a.price*a.shares,a.currency)],['RSI(14)',fmtNum(s.rsi,1)],
    ['25譌･遘ｻ蜍募ｹｳ蝮・,fmtPrice(s.sma25,a.currency)],['75譌･遘ｻ蜍募ｹｳ蝮・,fmtPrice(s.sma75,a.currency)],
    ['蜑肴律邨ょ､',fmtPrice(a.prevClose,a.currency)],['蟋句､',fmtPrice(a.dayOpen,a.currency)],
    ['騾夊ｲｨ',a.currency],['蟶ょｴ',a.market]];
  return rows.map(r=>`<div class="metric"><span class="m-k">${r[0]}</span><span class="m-v mono">${r[1]}</span></div>`).join('');
}
function targetRow(a,t){
  const hit=t.done, near=Math.abs(a.price-t.price)/t.price*100;
  return `<div class="target-row ${hit?'hit':''}">
    <span class="tdir ${t.dir}">${t.dir==='up'?'蛻ｰ驕・莉･荳・':'荳玖誠(莉･荳・'}</span>
    <span class="mono" style="font-size:15px">${fmtPrice(t.price,a.currency)}</span>
    ${hit?'<span class="up" style="font-size:12px">笨・蛻ｰ驕疲ｸ医∩</span>':`<span class="muted" style="font-size:12px">迴ｾ蝨ｨ蛟､縺ｾ縺ｧ ${near.toFixed(1)}%</span>`}
    ${t.note?`<span class="muted" style="font-size:12px">${t.note}</span>`:''}
    <button class="del-x" data-rmtarget="${t.id}" data-tk="${a.ticker}" style="margin-left:auto">笨・/button></div>`;
}
function updateStockLive(){
  const a=getAsset(UI.current); if(!a||UI.view!=='stock')return;
  const d=dayChange(a);
  const p=$('#dPrice'),c=$('#dChg'),g=$('#dGauge'),f=$('#dFactors'),n=$('#dVerdictNote');
  if(p)p.textContent=fmtPrice(a.price,a.currency);
  if(c){c.textContent=`${d.abs>=0?'+':''}${fmtPrice(d.abs,a.currency)}・・{pct(d.pct)}・荏;c.className='sp-chg mono '+signCls(d.pct);}
  if(g)g.innerHTML=gaugeSVG(a.signal); if(f)f.innerHTML=factorsHTML(a.signal); if(n)n.innerHTML=verdictNote(a);
  drawChart(a,UI.stockRange); checkTargets(a);
}
async function loadStockNews(a){
  const box=$('#stockNews'); if(!box)return;
  if(Store.live&&Store.keys.fh){
    try{
      let news=[],reco=null;
      try{news=await fhCompanyNews(a);}catch(e){}
      try{reco=await fhReco(a);}catch(e){}
      let html=reco?analystBlock(a,reco):'';
      html+= news.length? news.slice(0,5).map(n=>liveNewsCard(n)).join('') : '<div class="empty-mini">譛霑代・繝九Η繝ｼ繧ｹ縺ｯ蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆・育┌譁呎棧縺ｯ邀ｳ蝗ｽ驫俶氛荳ｭ蠢・〒縺呻ｼ峨・/div>';
      box.innerHTML=html; return;
    }catch(e){ box.innerHTML=`<div class="banner warn">蜿門ｾ怜､ｱ謨・ ${e.message}</div>`; return; }
  }
  box.innerHTML=simCompanyNews(a);
}

/* ============================================================
   VIEW: DATA SOURCE GUIDE
   ============================================================ */
function renderDataSource(){
  const tdOk=!!Store.keys.td, fhOk=!!Store.keys.fh;
  $('#view-datasource').innerHTML=`
    <div class="view-head"><h1>繝・・繧ｿ謗･邯・/h1>
      <div class="vh-sub">辟｡譁僊PI繧ｭ繝ｼ繧堤匳骭ｲ縺吶ｋ縺ｨ縲∽ｾ｡譬ｼ繝ｻ繝九Η繝ｼ繧ｹ繝ｻ蟆る摩螳ｶ隧穂ｾ｡縺悟ｮ溘ョ繝ｼ繧ｿ縺ｫ蛻・ｊ譖ｿ繧上ｊ縺ｾ縺吶ゅく繝ｼ縺ｯ縺薙・遶ｯ譛ｫ蜀・ｼ医ヶ繝ｩ繧ｦ繧ｶ・峨↓縺ｮ縺ｿ菫晏ｭ倥＆繧後∝､夜Κ縺ｫ騾∽ｿ｡縺輔ｌ縺ｾ縺帙ｓ縲・/div></div>
    <div class="card"><div class="card-head"><h2>箝・譌｢螳・窶・Yahoo Finance・・PI繧ｭ繝ｼ荳崎ｦ・ｼ・/h2>
      <span class="statebadge ${Store.provider==='yahoo'?'ok':'off'}">${Store.provider==='yahoo'?'菴ｿ逕ｨ荳ｭ':'蠕・ｩ・}</span></div>
      <div class="ds-body">
        <p>逋ｻ骭ｲ荳崎ｦ√〒縲∵律譛ｬ譬ｪ(譚ｱ險ｼ)繝ｻ豬ｷ螟匁ｪ繝ｻ荳ｻ隕∵欠謨ｰ(譌･邨悟ｹｳ蝮・・S&amp;P500繝ｻNASDAQ繝ｻNY繝繧ｦ)縺ｮ螳溘ョ繝ｼ繧ｿ繧貞叙蠕励＠縺ｾ縺吶ゅ・繝・ム繝ｼ蜿ｳ荳翫・縲後す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ縲阪・繧ｿ繝ｳ繧呈款縺吶□縺代〒螳溘ョ繝ｼ繧ｿ陦ｨ遉ｺ縺ｫ蛻・ｊ譖ｿ繧上ｊ縺ｾ縺吶・/p>
        <p class="muted">繝悶Λ繧ｦ繧ｶ縺九ｉ逶ｴ謗･ Yahoo 縺ｸ縺ｯ繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪↑縺・CORS)縺溘ａ縲∝・髢九・繝ｭ繧ｭ繧ｷ邨檎罰縺ｧ蜿門ｾ励＠縺ｦ縺・∪縺吶よｷｷ髮第凾繧・・繝ｭ繧ｭ繧ｷ蛻ｶ髯先凾縺ｯ荳驛ｨ驫俶氛縺後す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ陦ｨ遉ｺ縺ｮ縺ｾ縺ｾ縺ｫ縺ｪ繧九％縺ｨ縺後≠繧翫∪縺呻ｼ医◎縺ｮ蝣ｴ蜷医ｂ蛻､螳壹お繝ｳ繧ｸ繝ｳ縺ｯ蜷後§繝ｭ繧ｸ繝・け縺ｧ蜍穂ｽ懊＠縺ｾ縺呻ｼ峨・/p>
      </div></div>
    <div class="ds-grid">
      <div class="card"><div class="card-head"><h2>竭 萓｡譬ｼ繝・・繧ｿ 窶・Twelve Data</h2>
        <span class="statebadge ${tdOk?'ok':'off'}">${tdOk?'謗･邯壽ｸ医∩':'譛ｪ謗･邯・}</span></div>
        <div class="ds-body">
          <p>譌･譛ｬ譬ｪ・域擲險ｼ・峨→豬ｷ螟匁ｪ縺ｮ荳｡譁ｹ縺ｫ蟇ｾ蠢懊ら┌譁吶・繝ｩ繝ｳ縺ｧ1譌･縺ゅ◆繧贋ｸ螳壼屓謨ｰ縺ｾ縺ｧ蜿門ｾ励〒縺阪∪縺吶・/p>
          <ol><li><a href="https://twelvedata.com/pricing" target="_blank" rel="noopener">twelvedata.com</a> 縺ｧ辟｡譁咏匳骭ｲ</li>
          <li>繝繝・す繝･繝懊・繝峨〒API繧ｭ繝ｼ繧貞叙蠕・/li><li>荳九・險ｭ螳夂判髱｢縺ｧ雋ｼ繧贋ｻ倥￠</li></ol>
          <p class="muted">譌･譛ｬ譬ｪ縺ｯ繧ｳ繝ｼ繝会ｼ井ｾ・ 7203・峨〒讀懃ｴ｢繝ｻ霑ｽ蜉縺ｧ縺阪∪縺吶よ悽繧｢繝励Μ縺ｯ蜀・Κ縺ｧ country=Japan 繧剃ｻ倅ｸ弱＠縺ｦ譚ｱ險ｼ驫俶氛繧定ｧ｣豎ｺ縺励∪縺吶・/p>
        </div></div>
      <div class="card"><div class="card-head"><h2>竭｡ 繝九Η繝ｼ繧ｹ繝ｻ蟆る摩螳ｶ隧穂ｾ｡ 窶・Finnhub</h2>
        <span class="statebadge ${fhOk?'ok':'off'}">${fhOk?'謗･邯壽ｸ医∩':'譛ｪ謗･邯・}</span></div>
        <div class="ds-body">
          <p>莨∵･ｭ繝九Η繝ｼ繧ｹ縺ｨ縲∬､・焚險ｼ蛻ｸ莨夂､ｾ繧｢繝翫Μ繧ｹ繝医・謗ｨ螂ｨ・亥ｼｷ豌苓ｲｷ縺・懷ｼｷ豌怜｣ｲ繧奇ｼ峨ｒ髮・ｨ医＠縺溘悟ｰる摩螳ｶ繧ｳ繝ｳ繧ｻ繝ｳ繧ｵ繧ｹ縲阪ｒ陦ｨ遉ｺ縺励∪縺吶・/p>
          <ol><li><a href="https://finnhub.io/" target="_blank" rel="noopener">finnhub.io</a> 縺ｧ辟｡譁咏匳骭ｲ</li>
          <li>API繧ｭ繝ｼ繧貞叙蠕励＠縺ｦ險ｭ螳夂判髱｢縺ｫ雋ｼ繧贋ｻ倥￠</li></ol>
          <p class="muted">辟｡譁呎棧縺ｮ繝九Η繝ｼ繧ｹ繝ｻ謗ｨ螂ｨ縺ｯ邀ｳ蝗ｽ驫俶氛縺御ｸｭ蠢・〒縺吶よ律譛ｬ驫俶氛縺ｯ蜿門ｾ励〒縺阪↑縺・ｴ蜷医′縺ゅｊ縲√◎縺ｮ髫帙・繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ陦ｨ遉ｺ縺ｫ縺ｪ繧翫∪縺吶・/p>
        </div></div>
    </div>
    <div class="card"><div class="card-head"><h2>莉慕ｵ・∩・医が繝輔Λ繧､繝ｳ蛻・梵繧ｨ繝ｳ繧ｸ繝ｳ・・/h2></div>
      <div class="ds-body"><p>蜿門ｾ励＠縺滓律雜ｳ縺ｮ邨ょ､邉ｻ蛻励°繧峨ヽSI繝ｻMACD繝ｻ遘ｻ蜍募ｹｳ蝮・・繝懊Μ繝ｳ繧ｸ繝｣繝ｼ繝舌Φ繝峨ｒ<b>螳滄圀縺ｫ險育ｮ・/b>縺励・縺､縺ｮ繝輔ぃ繧ｯ繧ｿ繝ｼ繧堤ｵｱ蜷医＠縺ｦ雋ｷ縺・ｼ丞｣ｲ繧翫せ繧ｳ繧｢繧堤函謌舌＠縺ｾ縺吶ゅく繝ｼ譛ｪ險ｭ螳壽凾繧ょ酔縺倥お繝ｳ繧ｸ繝ｳ縺後す繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ邉ｻ蛻嶺ｸ翫〒蜍穂ｽ懊☆繧九◆繧√√＞縺､縺ｧ繧ょ愛螳壹ｒ隧ｦ縺帙∪縺吶・/p></div></div>
    <div style="text-align:center;margin-top:8px"><button class="btn primary" data-open="keys">API繧ｭ繝ｼ繧定ｨｭ螳壹☆繧・/button></div>`;
}

/* ============================================================
   VIEW: SETTINGS
   ============================================================ */
function renderSettings(){
  const tdOk=!!Store.keys.td, fhOk=!!Store.keys.fh;
  let notifPerm='譛ｪ蟇ｾ蠢・; try{ if('Notification'in window)notifPerm=Notification.permission==='granted'?'險ｱ蜿ｯ貂医∩':Notification.permission==='denied'?'諡貞凄':'譛ｪ險ｭ螳・; }catch(e){}
  $('#view-settings').innerHTML=`
    <div class="view-head"><h1>險ｭ螳・/h1></div>
    <div class="card"><div class="card-head"><h2>繝・・繧ｿ謗･邯・/h2></div>
      <div class="set-row"><div class="si"><div class="st">萓｡譬ｼ繝・・繧ｿ縺ｮ蜿門ｾ怜・</div>
        <div class="sd">Yahoo Finance 縺ｯAPI繧ｭ繝ｼ荳崎ｦ√〒譌･譛ｬ譬ｪ繝ｻ豬ｷ螟匁ｪ繝ｻ荳ｻ隕∵欠謨ｰ縺ｮ螳溘ョ繝ｼ繧ｿ繧貞叙蠕励＠縺ｾ縺呻ｼ亥・髢九・繝ｭ繧ｭ繧ｷ邨檎罰縺ｮ縺溘ａ縺ｾ繧後↓螟ｱ謨励☆繧句ｴ蜷医≠繧奇ｼ峨５welve Data 縺ｯ繧ｭ繝ｼ逋ｻ骭ｲ縺ｧ螳牙ｮ壼叙蠕励・/div></div>
        <div class="seg" id="setProviderSeg">
          <button data-provider="yahoo" class="${Store.provider==='yahoo'?'on':''}">Yahoo・医く繝ｼ荳崎ｦ・ｼ・/button>
          <button data-provider="twelvedata" class="${Store.provider==='twelvedata'?'on':''}">Twelve Data</button></div></div>
      <div class="set-row"><div class="si"><div class="st">Twelve Data API繧ｭ繝ｼ・井ｾ｡譬ｼ・・/div>
        <div class="sd">譌･譛ｬ譬ｪ繝ｻ豬ｷ螟匁ｪ縺ｮ螳溘ョ繝ｼ繧ｿ萓｡譬ｼ縲・{tdOk?'險ｭ螳壽ｸ医∩・域忰蟆ｾ 窶ｦ'+Store.keys.td.slice(-4)+'・・:'譛ｪ險ｭ螳・}</div></div>
        <span class="statebadge ${tdOk?'ok':'off'}">${tdOk?'ON':'OFF'}</span></div>
      <div class="set-row"><div class="si"><div class="st">Finnhub API繧ｭ繝ｼ・医ル繝･繝ｼ繧ｹ繝ｻ蟆る摩螳ｶ・・/div>
        <div class="sd">莨∵･ｭ繝九Η繝ｼ繧ｹ縺ｨ繧｢繝翫Μ繧ｹ繝域耳螂ｨ縲・{fhOk?'險ｭ螳壽ｸ医∩・域忰蟆ｾ 窶ｦ'+Store.keys.fh.slice(-4)+'・・:'譛ｪ險ｭ螳・}</div></div>
        <span class="statebadge ${fhOk?'ok':'off'}">${fhOk?'ON':'OFF'}</span></div>
      <div class="set-row"><div class="si"></div><button class="btn primary btn-sm" data-open="keys">API繧ｭ繝ｼ繧堤ｷｨ髮・/button></div>
    </div>
    <div class="card"><div class="card-head"><h2>陦ｨ遉ｺ繝ｻ蜷梧悄</h2></div>
      <div class="set-row"><div class="si"><div class="st">陦ｨ遉ｺ蝨ｰ蝓・/div><div class="sd">譌･譛ｬ譬ｪ繝ｻ豬ｷ螟匁ｪ縺ｮ陦ｨ遉ｺ蛻・崛・医・繝・ム繝ｼ縺ｧ繧ょ､画峩蜿ｯ・・/div></div>
        <div class="seg" id="setRegionSeg">
          <button data-region="all" class="${Store.region==='all'?'on':''}">縺吶∋縺ｦ</button>
          <button data-region="jp" class="${Store.region==='jp'?'on':''}">譌･譛ｬ</button>
          <button data-region="us" class="${Store.region==='us'?'on':''}">豬ｷ螟・/button></div></div>
      <div class="set-row"><div class="si"><div class="st">繝ｩ繧､繝門酔譛・/div><div class="sd">螳溘ョ繝ｼ繧ｿ縺ｮ螳壽悄蜿門ｾ暦ｼ郁ｦ・Twelve Data 繧ｭ繝ｼ・・/div></div>
        <button class="btn ${Store.live?'primary':'ghost'} btn-sm" id="setLiveToggle">${Store.live?'ON':'OFF'}</button></div>
      <div class="set-row"><div class="si"><div class="st">繝悶Λ繧ｦ繧ｶ騾夂衍</div><div class="sd">逶ｮ讓呎ｪ萓｡蛻ｰ驕斐ｒ繝・せ繧ｯ繝医ャ繝鈴夂衍・育樟蝨ｨ: ${notifPerm}・・/div></div>
        <button class="btn ghost btn-sm" id="notifPermBtn">騾夂衍繧定ｨｱ蜿ｯ</button></div>
    </div>
    <div class="card"><div class="card-head"><h2>繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝育ｮ｡逅・/h2><button class="add-btn" data-open="newlist">・・繝ｪ繧ｹ繝井ｽ懈・</button></div>
      ${Store.lists.map(l=>`<div class="set-row"><div class="si"><div class="st">${l.name}</div><div class="sd">${l.tickers.length}驫俶氛</div></div>
        <button class="btn ghost btn-sm" data-renamelist="${l.id}">蜷榊燕螟画峩</button>
        ${Store.lists.length>1?`<button class="btn danger btn-sm" data-dellist="${l.id}">蜑企勁</button>`:''}</div>`).join('')}
    </div>
    <div class="card"><div class="card-head"><h2>繝・・繧ｿ蛻晄悄蛹・/h2></div>
      <div class="set-row"><div class="si"><div class="st">縺吶∋縺ｦ縺ｮ險ｭ螳壹ｒ豸亥悉</div><div class="sd">繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝医・豕ｨ逶ｮ繝ｻ逶ｮ讓呎ｪ萓｡繝ｻAPI繧ｭ繝ｼ繝ｻ騾夂衍螻･豁ｴ繧貞炎髯､縺励∪縺・/div></div>
        <button class="btn danger btn-sm" id="resetAll">蛻晄悄蛹・/button></div></div>`;
}

/* ============================================================
   MODALS
   ============================================================ */
function openModal(html){const m=$('#modalMask');$('#modalBox').innerHTML=html;m.classList.add('open');}
function closeModal(){$('#modalMask').classList.remove('open');}

function modalAddStock(){
  openModal(`<div class="modal-head"><h3>驫俶氛繧定ｿｽ蜉</h3></div>
    <div class="modal-body">
      <div class="field"><label>驫俶氛繧呈､懃ｴ｢・亥錐蜑阪・繧ｳ繝ｼ繝峨・繝・ぅ繝・き繝ｼ・・/label>
        <input id="mAddInput" placeholder="萓・ 繝医Κ繧ｿ / 7203 / Apple / AAPL" autocomplete="off"/>
        <div class="hint">逋ｻ骭ｲ貂医∩繝ｦ繝九ヰ繝ｼ繧ｹ縺九ｉ讀懃ｴ｢縺励∪縺吶ゆｸ隕ｧ縺ｫ縺ｪ縺・釜譟・・荳九・縲後さ繝ｼ繝峨〒逶ｴ謗･霑ｽ蜉縲阪ｒ縺泌茜逕ｨ縺上□縺輔＞縲・/div></div>
      <div id="mAddResults" class="modal-results"></div>
      <div class="field" style="margin-top:14px"><label>繧ｳ繝ｼ繝峨〒逶ｴ謗･霑ｽ蜉・井ｻｻ諢上・驫俶氛・・/label>
        <div style="display:flex;gap:8px"><input id="mCustomTk" placeholder="萓・ 6501 縺ｾ縺溘・ TSLA" style="flex:1"/>
          <select id="mCustomMkt"><option value="jp">譌･譛ｬ譬ｪ(JPY)</option><option value="us">豬ｷ螟匁ｪ(USD)</option></select></div>
        <div class="hint">霑ｽ蜉蜈医Μ繧ｹ繝・ <b>${activeList().name}</b>縲ゅΛ繧､繝門酔譛欅N縺ｪ繧芽・蜍輔〒螳溘ョ繝ｼ繧ｿ繧貞叙蠕励＠縺ｾ縺吶・/div></div>
    </div>
    <div class="modal-foot"><button class="btn ghost" data-close>髢峨§繧・/button>
      <button class="btn primary" id="mCustomAdd">縺薙・繧ｳ繝ｼ繝峨ｒ霑ｽ蜉</button></div>`);
  const inp=$('#mAddInput'); inp.focus();
  const draw=()=>{const q=inp.value.trim();const res=$('#mAddResults');
    if(!q){res.innerHTML='';return;}
    const hits=searchUniverse(q).slice(0,8);
    res.innerHTML=hits.length?hits.map(a=>`<div class="mr-row" data-add="${a.ticker}">
      <span class="mono mr-tk">${a.ticker}</span><span class="mr-nm">${a.name}</span>
      <span class="mr-mkt">${a.market}</span><span class="mono mr-px">${fmtPrice(a.price,a.currency)}</span></div>`).join('')
      :'<div class="sr-empty">荳閾ｴ縺ｪ縺励ゅさ繝ｼ繝峨〒逶ｴ謗･霑ｽ蜉繧偵♀隧ｦ縺励￥縺縺輔＞縲・/div>';};
  inp.oninput=draw;
}
function modalNewList(){
  openModal(`<div class="modal-head"><h3>譁ｰ縺励＞繧ｦ繧ｩ繝・メ繝ｪ繧ｹ繝・/h3></div>
    <div class="modal-body"><div class="field"><label>繝ｪ繧ｹ繝亥錐</label>
      <input id="mListName" placeholder="萓・ 鬮倬・蠖・/ 蜊雁ｰ惹ｽ・/ 邀ｳ蝗ｽ謌宣聞譬ｪ" autocomplete="off"/></div></div>
    <div class="modal-foot"><button class="btn ghost" data-close>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
      <button class="btn primary" id="mListCreate">菴懈・</button></div>`);
  $('#mListName').focus();
}
function modalRenameList(id){
  const l=listById(id); if(!l)return;
  openModal(`<div class="modal-head"><h3>繝ｪ繧ｹ繝亥錐繧貞､画峩</h3></div>
    <div class="modal-body"><div class="field"><label>繝ｪ繧ｹ繝亥錐</label>
      <input id="mListName" value="${l.name}" autocomplete="off"/></div></div>
    <div class="modal-foot"><button class="btn ghost" data-close>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
      <button class="btn primary" data-renamesave="${id}">菫晏ｭ・/button></div>`);
  $('#mListName').focus();
}
function modalSetTarget(){
  const a=getAsset(UI.current); if(!a)return;
  openModal(`<div class="modal-head"><h3>逶ｮ讓呎ｪ萓｡繧｢繝ｩ繝ｼ繝・/h3></div>
    <div class="modal-body">
      <div class="muted" style="margin-bottom:14px">${a.name}・育樟蝨ｨ <b class="mono">${fmtPrice(a.price,a.currency)}</b>・峨′謖・ｮ壻ｾ｡譬ｼ縺ｫ蛻ｰ驕斐＠縺溘ｉ騾夂衍縺励∪縺吶・/div>
      <div class="field"><label>譚｡莉ｶ</label><select id="mTgtDir">
        <option value="up">縺薙・萓｡譬ｼ縲蝉ｻ･荳翫代↓縺ｪ縺｣縺溘ｉ</option><option value="down">縺薙・萓｡譬ｼ縲蝉ｻ･荳九代↓縺ｪ縺｣縺溘ｉ</option></select></div>
      <div class="field"><label>逶ｮ讓呎ｪ萓｡・・{a.currency}・・/label><input id="mTgtPrice" type="number" step="any" placeholder="${Math.round(a.price)}"/></div>
      <div class="field"><label>繝｡繝｢・井ｻｻ諢擾ｼ・/label><input id="mTgtNote" placeholder="萓・ 蛻ｩ遒ｺ繝ｩ繧､繝ｳ / 謚ｼ縺礼岼雋ｷ縺・/></div>
    </div>
    <div class="modal-foot"><button class="btn ghost" data-close>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
      <button class="btn primary" id="mTgtSave">繧｢繝ｩ繝ｼ繝医ｒ險ｭ螳・/button></div>`);
  $('#mTgtPrice').focus();
}
function modalKeys(){
  openModal(`<div class="modal-head"><h3>API繧ｭ繝ｼ險ｭ螳・/h3></div>
    <div class="modal-body">
      <div class="field"><label>Twelve Data API繧ｭ繝ｼ・井ｾ｡譬ｼ繝・・繧ｿ・・/label>
        <input id="mKeyTd" value="${Store.keys.td||''}" placeholder="雋ｼ繧贋ｻ倥￠" autocomplete="off"/>
        <div class="hint"><a href="https://twelvedata.com/pricing" target="_blank" rel="noopener">twelvedata.com</a> 縺ｧ辟｡譁吝叙蠕励よ律譛ｬ譬ｪ繝ｻ豬ｷ螟匁ｪ縺ｮ萓｡譬ｼ縲・/div></div>
      <div class="field"><label>Finnhub API繧ｭ繝ｼ・医ル繝･繝ｼ繧ｹ繝ｻ蟆る摩螳ｶ隧穂ｾ｡・・/label>
        <input id="mKeyFh" value="${Store.keys.fh||''}" placeholder="雋ｼ繧贋ｻ倥￠" autocomplete="off"/>
        <div class="hint"><a href="https://finnhub.io/" target="_blank" rel="noopener">finnhub.io</a> 縺ｧ辟｡譁吝叙蠕励ゆｼ∵･ｭ繝九Η繝ｼ繧ｹ縺ｨ繧｢繝翫Μ繧ｹ繝域耳螂ｨ縲・/div></div>
      <div class="banner info" style="margin:0">繧ｭ繝ｼ縺ｯ縺薙・遶ｯ譛ｫ縺ｮ繝悶Λ繧ｦ繧ｶ蜀・・縺ｿ縺ｫ菫晏ｭ倥＆繧後、nthropic繧・ｬｬ荳芽・↓縺ｯ騾∽ｿ｡縺輔ｌ縺ｾ縺帙ｓ縲・/div>
    </div>
    <div class="modal-foot"><button class="btn ghost" data-close>繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
      <button class="btn primary" id="mKeySave">菫晏ｭ倥＠縺ｦ蜷梧悄</button></div>`);
}

/* ============================================================
   SEARCH (header)
   ============================================================ */
function wireSearch(){
  const inp=$('#searchInput'),res=$('#searchResults');let act=-1,rows=[];
  const close=()=>{res.classList.remove('open');act=-1;};
  inp.addEventListener('input',()=>{
    const q=inp.value.trim(); if(!q){close();return;}
    rows=searchUniverse(q).filter(inRegion).slice(0,8);
    if(!rows.length)rows=searchUniverse(q).slice(0,8);
    res.innerHTML=rows.length?rows.map((a,i)=>`<div class="sr-row" data-idx="${i}">
      <span class="tk">${a.ticker}</span><span class="nm">${a.name}</span><span class="px mono">${fmtPrice(a.price,a.currency)}</span></div>`).join('')
      :'<div class="sr-empty">荳閾ｴ縺吶ｋ驫俶氛縺後≠繧翫∪縺帙ｓ</div>';
    res.classList.add('open');act=-1;
    $$('.sr-row',res).forEach(r=>r.onclick=()=>{go('stock',rows[+r.dataset.idx].ticker);inp.value='';close();});
  });
  inp.addEventListener('keydown',e=>{
    const items=$$('.sr-row',res); if(!items.length)return;
    if(e.key==='ArrowDown'){e.preventDefault();act=(act+1)%items.length;}
    else if(e.key==='ArrowUp'){e.preventDefault();act=(act-1+items.length)%items.length;}
    else if(e.key==='Enter'&&act>=0){go('stock',rows[act].ticker);inp.value='';close();return;}
    else if(e.key==='Escape'){close();return;}
    items.forEach((it,i)=>it.classList.toggle('active',i===act));
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.search'))close();});
}

/* ============================================================
   LIVE button + region
   ============================================================ */
function updateLiveBtn(){
  const b=$('#liveBtn'),l=$('#liveLabel'); if(!b)return;
  b.classList.toggle('on',Store.live&&!UI.liveBusy);
  b.classList.toggle('sim',!Store.live);
  const src=Store.provider==='yahoo'?'螳溘ョ繝ｼ繧ｿ':'繝ｩ繧､繝・;
  l.textContent=UI.liveBusy?'蜷梧悄荳ｭ窶ｦ':(Store.live?src:'繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ');
}
function setRegion(r){
  Store.region=r; saveStore();
  $$('#regionSeg button').forEach(b=>b.classList.toggle('on',b.dataset.region===r));
  renderCurrent();
}
async function toggleLive(){
  if(!Store.live){
    if(Store.provider!=='yahoo' && !Store.keys.td){ modalKeys(); toast('Twelve Data 繧剃ｽｿ縺・ｴ蜷医・API繧ｭ繝ｼ縺悟ｿ・ｦ√〒縺・); return; }
    Store.live=true; saveStore(); updateLiveBtn();
    if(Store.provider==='yahoo')toast('Yahoo Finance 縺九ｉ螳溘ョ繝ｼ繧ｿ繧貞叙蠕励＠縺ｾ縺吮ｦ');
    UI._liveSeriesDone={}; await liveBootstrap();
  } else { Store.live=false; saveStore(); updateLiveBtn(); toast('繧ｷ繝溘Η繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ縺ｫ謌ｻ縺励∪縺励◆'); renderCurrent(); }
}

/* ============================================================
   WIRING
   ============================================================ */
function escapeHTML(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function wire(){
  $$('.nav-item').forEach(n=>n.addEventListener('click',()=>go(n.dataset.view)));
  $('#regionSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setRegion(b.dataset.region);});
  $('#liveBtn').addEventListener('click',toggleLive);
  $('#notifBtn').addEventListener('click',()=>go('notifications'));
  $('#settingsBtn').addEventListener('click',()=>go('settings'));
  wireSearch();

  // delegated clicks across views + modals
  document.body.addEventListener('click',e=>{
    const t=e.target;
    const go_=t.closest('[data-go]'); if(go_&&!t.closest('[data-rm],[data-mark],.del-x,[data-rmtarget]')){go('stock',go_.dataset.go);return;}
    const vl=t.closest('[data-view-link]'); if(vl){go(vl.dataset.viewLink);return;}
    const sl=t.closest('[data-view-link="signals"],[data-view-link]'); // handled above
    const open=t.closest('[data-open]'); if(open){const k=open.dataset.open;
      if(k==='addstock')modalAddStock(); else if(k==='newlist')modalNewList();
      else if(k==='settarget')modalSetTarget(); else if(k==='keys')modalKeys();
      else if(k==='live')toggleLive();
      else if(k==='managelist')go('settings'); return;}
    if(t.closest('[data-close]')){closeModal();return;}
    const tab=t.closest('[data-list-tab]'); if(tab){Store.activeList=tab.dataset.listTab;saveStore();renderWatchlist();return;}
    const rm=t.closest('[data-rm]'); if(rm){removeFromList(rm.dataset.rm,rm.dataset.list);return;}
    const mark=t.closest('[data-mark]'); if(mark){toggleMark(mark.dataset.mark);return;}
    const aw=t.closest('[data-addwatch]'); if(aw){addToList(aw.dataset.addwatch);renderStock();return;}
    const add=t.closest('[data-add]'); if(add){addToList(add.dataset.add);closeModal();renderCurrent();return;}
    const rmt=t.closest('[data-rmtarget]'); if(rmt){const tk=rmt.dataset.tk;Store.targets[tk]=(Store.targets[tk]||[]).filter(x=>x.id!==rmt.dataset.rmtarget);saveStore();renderStock();return;}
    const rnl=t.closest('[data-renamelist]'); if(rnl){modalRenameList(rnl.dataset.renamelist);return;}
    const rns=t.closest('[data-renamesave]'); if(rns){const l=listById(rns.dataset.renamesave);const v=$('#mListName').value.trim();if(l&&v){l.name=v;saveStore();}closeModal();renderCurrent();return;}
    const dll=t.closest('[data-dellist]'); if(dll){if(Store.lists.length>1){Store.lists=Store.lists.filter(l=>l.id!==dll.dataset.dellist);if(Store.activeList===dll.dataset.dellist)Store.activeList=Store.lists[0].id;saveStore();renderCurrent();}return;}
    const rng=t.closest('[data-range]'); if(rng){UI.stockRange=+rng.dataset.range;$$('#rangeSeg .rng').forEach(x=>x.classList.toggle('on',x===rng));const a=getAsset(UI.current);if(a)drawChart(a,UI.stockRange);return;}
    // modal action buttons
    if(t.id==='mCustomAdd'){addCustom();return;}
    if(t.id==='mListCreate'){const v=$('#mListName').value.trim();if(v){const id=uid('l');Store.lists.push({id,name:v,tickers:[]});Store.activeList=id;saveStore();}closeModal();go('watchlist');return;}
    if(t.id==='mTgtSave'){saveTarget();return;}
    if(t.id==='mKeySave'){saveKeys();return;}
    if(t.id==='newsRefresh'){renderNews();return;}
    if(t.id==='clearAlerts'){Store.alerts=[];saveStore();renderNotifications();updateNotifBadge();return;}
    if(t.id==='resetAll'){if(confirm('縺吶∋縺ｦ縺ｮ險ｭ螳壹ｒ蛻晄悄蛹悶＠縺ｾ縺吶°・・)){try{localStorage.removeItem(PKEY);}catch(e){}location.reload();}return;}
    if(t.id==='setLiveToggle'){toggleLive().then(()=>renderSettings());return;}
    if(t.id==='notifPermBtn'){try{Notification.requestPermission().then(()=>renderSettings());}catch(e){}return;}
    const nseg=t.closest('#newsSeg button'); if(nseg){UI.newsTab=nseg.dataset.news;renderNews();return;}
    const setReg=t.closest('#setRegionSeg button'); if(setReg){setRegion(setReg.dataset.region);renderSettings();return;}
    const setProv=t.closest('#setProviderSeg button'); if(setProv){Store.provider=setProv.dataset.provider;saveStore();updateLiveBtn();
      if(Store.live){UI._liveSeriesDone={};liveBootstrap();} renderSettings();
      toast(Store.provider==='yahoo'?'蜿門ｾ怜・繧・Yahoo Finance・医く繝ｼ荳崎ｦ・ｼ峨↓險ｭ螳・:'蜿門ｾ怜・繧・Twelve Data 縺ｫ險ｭ螳・);return;}
    const mr=t.closest('[data-add]'); // results in modal handled above
  });
  $('#modalMask').addEventListener('click',e=>{if(e.target.id==='modalMask')closeModal();});

  // clock + market status
  function clock(){
    const now=new Date();
    const ct=$('#clockTime'),cd=$('#clockDate');
    if(ct)ct.textContent=now.toLocaleTimeString('ja-JP');
    if(cd)cd.textContent=now.toLocaleDateString('ja-JP',{month:'short',day:'numeric',weekday:'short'});
    const day=now.getDay(),h=now.getHours(),m=now.getMinutes(),hm=h*60+m;
    const open=day>=1&&day<=5&&((hm>=540&&hm<690)||(hm>=750&&hm<900));
    const p=$('#mktPulse'),s=$('#mktStatus');
    if(p)p.classList.toggle('closed',!open);
    if(s)s.textContent=open?'譚ｱ險ｼ 蜿門ｼ墓凾髢謎ｸｭ':'譚ｱ險ｼ 譎る俣螟・;
  }
  clock(); setInterval(clock,1000);

  // live loop: sim ticks when not live; quote poll when live
  let qTick=0;
  setInterval(()=>{
    if(document.hidden)return;
    if(Store.live){ qTick++; if(qTick%30===0)liveQuotePoll(); }
    else{
      tick(); allAssets().forEach(checkTargets);
      if(UI.view==='stock')updateStockLive();
      else if(['dashboard','watchlist','signals'].includes(UI.view))renderCurrent();
    }
  },2000);

  window.addEventListener('resize',()=>{if(UI.view==='stock'){const a=getAsset(UI.current);if(a)drawChart(a,UI.stockRange);}});
}

function addCustom(){
  const tk=($('#mCustomTk').value||'').trim().toUpperCase(); if(!tk)return;
  const mkt=$('#mCustomMkt').value;
  if(!getAsset(tk)){
    const cur=mkt==='jp'?'JPY':'USD', market=mkt==='jp'?'譚ｱ險ｼ':'US';
    const base=mkt==='jp'?(/^\d+$/.test(tk)?1000+Math.random()*4000:200):150;
    const def=[tk,tk,market,cur,Math.round(base),'窶・,0.3,0.05,1e9];
    Store.custom.push(def); saveStore(); ensureAsset(def);
  }
  addToList(tk); closeModal(); go('stock',tk);
  if(Store.live)scheduleSeries(tk);
}
function saveTarget(){
  const a=getAsset(UI.current); if(!a)return;
  const price=parseFloat($('#mTgtPrice').value); if(!price){toast('萓｡譬ｼ繧貞・蜉帙＠縺ｦ縺上□縺輔＞');return;}
  const dir=$('#mTgtDir').value, note=$('#mTgtNote').value.trim();
  Store.targets[a.ticker]=Store.targets[a.ticker]||[];
  Store.targets[a.ticker].push({id:uid('t'),price,dir,note,done:false});
  saveStore(); closeModal(); renderStock(); toast('逶ｮ讓呎ｪ萓｡繧｢繝ｩ繝ｼ繝医ｒ險ｭ螳壹＠縺ｾ縺励◆');
}
function saveKeys(){
  Store.keys.td=($('#mKeyTd').value||'').trim();
  Store.keys.fh=($('#mKeyFh').value||'').trim();
  saveStore(); closeModal(); updateLiveBtn();
  toast('API繧ｭ繝ｼ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆');
  if(Store.keys.td&&Store.live){UI._liveSeriesDone={};liveBootstrap();}
  renderCurrent();
}

/* ============================================================
   SPLASH (NGX 竊・Magical Future 竊・MagiFinance 繝ｭ繧ｴ + 繝ｭ繝ｼ繝峨ヰ繝ｼ)
   ============================================================ */
function showSplashMF(onDone){
  const css=`
  #mf-splash{position:fixed;inset:0;z-index:99999;background:radial-gradient(1200px 600px at 80% -10%,rgba(82,214,232,.07),transparent 60%),radial-gradient(900px 500px at -5% 110%,rgba(242,184,75,.06),transparent 55%),#0B0E14;overflow:hidden;display:flex;align-items:center;justify-content:center;transition:opacity .55s ease}
  #mf-splash.out{opacity:0;pointer-events:none}
  #mf-splash .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none}
  #mf-splash .intro{justify-content:space-between;gap:18px;padding:9vh 24px}
  #mf-splash .intro.in{opacity:1}
  #mf-splash .intro.out{opacity:0;transition:opacity .5s ease}
  #mf-splash .logo{width:min(620px,90vw);border-radius:22px;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:26px 34px}
  #mf-splash .logo img{max-width:100%;max-height:22vh;object-fit:contain;display:block}
  #mf-splash .ngx{background:#000}
  #mf-splash .mf{background:#fff}
  #mf-splash .intro.in .ngx{animation:mfUp .8s cubic-bezier(.2,.7,.3,1) both}
  #mf-splash .intro.in .mf{animation:mfDown .8s cubic-bezier(.2,.7,.3,1) .12s both}
  #mf-splash .amp{color:#586079;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:30px;opacity:.55}
  #mf-splash .main{gap:28px}
  #mf-splash .main.in{opacity:1;animation:mfIn .6s ease}
  #mf-splash .applogo img{width:min(340px,72vw);max-height:30vh;object-fit:contain;border-radius:26px;filter:drop-shadow(0 14px 50px rgba(242,184,75,.4))}
  #mf-splash .wm{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:600;letter-spacing:.5px;color:#E7EBF3}
  #mf-splash .wm span{color:#F2B84B}
  #mf-splash .bar{width:min(340px,72vw);height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
  #mf-splash .bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#F2B84B,#52D6E8)}
  #mf-splash .cap{color:#6B7589;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.28em}
  #mf-splash .tx{font-family:'Space Grotesk',sans-serif;font-weight:800;letter-spacing:.12em}
  #mf-splash .tx.gold{color:#e9b13c;font-size:46px}
  #mf-splash .tx.mfx{font-size:34px;background:linear-gradient(90deg,#3a5bff,#e83e8c);-webkit-background-clip:text;background-clip:text;color:transparent}
  @keyframes mfUp{from{opacity:0;transform:translateY(-34px)}to{opacity:1;transform:none}}
  @keyframes mfDown{from{opacity:0;transform:translateY(34px)}to{opacity:1;transform:none}}
  @keyframes mfIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){#mf-splash *{animation:none!important}}`;
  const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  const el=document.createElement('div'); el.id='mf-splash';
  el.innerHTML=`
    <div class="ph intro" id="mfIntro">
      <div class="logo ngx"><img src="../brand/NGX.png" alt="NGX" onerror="this.outerHTML='<span class=&quot;tx gold&quot;>NGX</span>'"></div>
      <div class="amp">ﾃ・/div>
      <div class="logo mf"><img src="../brand/MagicalFuture.png" alt="Magical Future" onerror="this.outerHTML='<span class=&quot;tx mfx&quot;>Magical Future</span>'"></div>
    </div>
    <div class="ph main" id="mfMain">
      <div class="applogo"><img src="../thumbs/MagiFinance.jpg" alt="MagiFinance" onerror="this.remove()"></div>
      <div class="wm">Magi<span>Finance</span></div>
      <div class="bar"><i id="mfFill"></i></div>
      <div class="cap">Loading market data ...</div>
    </div>`;
  document.body.appendChild(el);
  const intro=el.querySelector('#mfIntro'), main=el.querySelector('#mfMain'), fill=el.querySelector('#mfFill');
  const P1_IN=120,P1_HOLD=1500,P1_OUT=550,P2_BAR=1900,P2_END=250;
  const p2=P1_IN+P1_HOLD+P1_OUT;
  setTimeout(()=>intro.classList.add('in'),P1_IN);
  setTimeout(()=>intro.classList.add('out'),P1_IN+P1_HOLD);
  setTimeout(()=>{ main.classList.add('in'); fill.style.transition='width '+P2_BAR+'ms ease'; setTimeout(()=>fill.style.width='100%',60); },p2);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>{ el.remove(); if(onDone)onDone(); },600); },p2+P2_BAR+P2_END);
}

/* ============================================================
   BOOT
   ============================================================ */
function boot(){
  init();
  rebuildCustoms();
  wire();
  updateLiveBtn(); updateNotifBadge();
  setRegion(Store.region);
  go('dashboard');
  // 譌｢螳・Yahoo)縺ｯ襍ｷ蜍墓凾縺ｫ閾ｪ蜍輔〒螳溘ョ繝ｼ繧ｿ蜿門ｾ励ｒ隧ｦ縺ｿ繧具ｼ亥､ｱ謨玲凾縺ｯsim邯咏ｶ夲ｼ・  if(Store.live && (Store.provider==='yahoo'||Store.keys.td)){UI._liveSeriesDone={};liveBootstrap();}
}
showSplashMF(boot);

/* Web繝輔か繝ｳ繝医・隱ｭ縺ｿ霎ｼ縺ｿ・域悽菴灘ｮ溯｡悟ｾ後↑縺ｮ縺ｧ襍ｷ蜍輔ｒ繝悶Ο繝・け縺励↑縺・ｼ・*/
(function(){var l=document.createElement('link');l.rel='stylesheet';
l.href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
document.head.appendChild(l);})();



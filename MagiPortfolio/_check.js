"use strict";
/* ============================================================
   MagiPortfolio — 持ち株マネージャー（XEVARION）
   実データ: Yahoo Finance を CORSプロキシ経由で取得（キー不要）
   保存: localStorage（バックエンド無し・自己完結）
   ============================================================ */

/* ---------- Store ---------- */
const LS_KEY='magiport_v1';
const Store = (()=>{
  let s={holdings:[], watchlist:[], lists:[], settings:{baseCcy:'JPY'}, lastUpdate:0};
  try{ const r=localStorage.getItem(LS_KEY); if(r) s=Object.assign(s,JSON.parse(r)); }catch(e){}
  return s;
})();
function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(Store)); }catch(e){} }

const UI = { view:'dashboard', detailId:null, detailKind:'holding', range:'1y', fx:{USDJPY:null}, loading:false, listFilter:'__all__' };

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function ccySym(c){ return c==='JPY'?'¥':c==='USD'?'$':c==='EUR'?'€':(c||'')+' '; }
function fmtMoney(v,c){ if(v==null||isNaN(v))return '—'; const d=(c==='JPY')?0:2; return ccySym(c)+Number(v).toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function fmtNum(v,d){ if(v==null||isNaN(v))return '—'; return Number(v).toLocaleString('ja-JP',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
function fmtPct(v){ if(v==null||isNaN(v))return '—'; return (v>=0?'+':'')+v.toFixed(2)+'%'; }
function signCls(v){ return v>0?'up':v<0?'down':''; }
function arrow(v){ return v>0?'▲':v<0?'▼':'•'; }
function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2400); }
function logoColor(seed){ let h=0; for(const ch of (seed||'')) h=(h*31+ch.charCodeAt(0))%360; return `hsl(${h} 52% 42%)`; }
// 銘柄ごとに見分けやすい配色パレット（円グラフ・ロゴタイル等で使用、変更可）
const PALETTE=['#7C8BFF','#2BD980','#F2B84B','#FF5C72','#52D6E8','#9A8CFF','#FF9F43','#26C6DA','#EC4899','#A3E635','#FB7185','#38BDF8','#C084FC','#F59E0B','#14B8A6','#F97316','#818CF8','#4ADE80'];
function ensureColors(){
  const used=new Set(Store.holdings.filter(h=>h.color).map(h=>h.color));
  Store.holdings.forEach((h,i)=>{ if(!h.color){ const free=PALETTE.find(c=>!used.has(c))||PALETTE[i%PALETTE.length]; h.color=free; used.add(free); } });
}
function holdColor(h){ return h.color||logoColor(h.code||h.name); }
function relTime(ts){ if(!ts)return''; const d=Date.now()/1000-ts; if(d<3600)return Math.max(1,Math.floor(d/60))+'分前'; if(d<86400)return Math.floor(d/3600)+'時間前'; return Math.floor(d/86400)+'日前'; }

/* ---------- リスト（証券会社・口座など） ---------- */
function listName(id){ if(!id)return '未分類'; const l=Store.lists.find(x=>x.id===id); return l?l.name:'未分類'; }
function createList(name){ name=(name||'').trim(); if(!name)return null; let l=Store.lists.find(x=>x.name===name); if(!l){ l={id:'L'+uid(),name}; Store.lists.push(l); save(); } return l.id; }
function listOptionsHTML(sel){
  const opts=Store.lists.map(l=>`<option value="${l.id}" ${l.id===sel?'selected':''}>${esc(l.name)}</option>`).join('');
  return `<option value="" ${!sel?'selected':''}>未分類</option>${opts}<option value="__new__">＋ 新しいリスト…</option>`;
}
// モーダルのlist選択（__new__なら新規作成）。idを返す
function getModalListId(sel){
  const el=sel||$('#inList'); if(!el)return '';
  let v=el.value;
  if(v==='__new__'){ const nm=prompt('新しいリスト名（証券会社・口座など）を入力'); const id=createList(nm); return id||''; }
  return v||'';
}
// list選択で__new__が選ばれたら即作成して選択し直す
function wireListSelect(el){
  el.onchange=()=>{ if(el.value==='__new__'){ const nm=prompt('新しいリスト名（証券会社・口座など）を入力'); const id=createList(nm); el.innerHTML=listOptionsHTML(id||''); } };
}

/* ---------- load bar ---------- */
let _barT=0;
function bar(p){ const b=$('#loadBar'),i=b.querySelector('i'); if(p<0){b.classList.remove('on');return;} b.classList.add('on'); i.style.width=Math.min(100,p)+'%'; clearTimeout(_barT); if(p>=100)_barT=setTimeout(()=>b.classList.remove('on'),450); }

/* ============================================================
   Yahoo Finance（CORSプロキシ経由・キー不要）
   ============================================================ */
const YH_PROXIES=[
  u=>'https://corsproxy.io/?url='+encodeURIComponent(u),
  u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
  u=>'https://thingproxy.freeboard.io/fetch/'+u
];
async function fetchTO(url,ms){
  const ctrl=new AbortController(); const id=setTimeout(()=>ctrl.abort(),ms||9000);
  try{ return await fetch(url,{cache:'no-store',signal:ctrl.signal}); }
  finally{ clearTimeout(id); }
}
async function yhJSON(url){
  let last;
  for(const p of YH_PROXIES){
    try{ const r=await fetchTO(p(url),9000); if(!r.ok)throw new Error('HTTP '+r.status); return await r.json(); }
    catch(e){ last=e; }
  }
  throw last||new Error('全プロキシで取得失敗');
}
async function yhText(url){
  let last;
  for(const p of YH_PROXIES){
    try{ const r=await fetchTO(p(url),9000); if(!r.ok)throw new Error('HTTP '+r.status); const t=await r.text(); if(t)return t; }
    catch(e){ last=e; }
  }
  throw last||new Error('取得失敗');
}
// 業種（英語→日本語）
const SECTOR_JP={'Technology':'テクノロジー','Consumer Cyclical':'一般消費財','Consumer Defensive':'生活必需品','Financial Services':'金融','Financial':'金融','Healthcare':'ヘルスケア','Industrials':'資本財','Communication Services':'通信','Energy':'エネルギー','Basic Materials':'素材','Real Estate':'不動産','Utilities':'公益'};
function jpSector(x){ return x.sectorDisp||SECTOR_JP[x.sector]||x.sector||''; }
// 銘柄検索（番号・名前→シンボル逆引き）
async function yhSearch(q){
  const url='https://query1.finance.yahoo.com/v1/finance/search?lang=ja-JP&region=JP&quotesCount=12&newsCount=0&q='+encodeURIComponent(q);
  const j=await yhJSON(url);
  return (j.quotes||[]).filter(x=>x.symbol && (x.quoteType==='EQUITY'||x.quoteType==='ETF'||x.quoteType==='INDEX'||x.quoteType==='MUTUALFUND'))
    .map(x=>({symbol:x.symbol, name:x.shortname||x.longname||x.symbol, exch:x.exchDisp||x.exchange||'', type:x.quoteType, ccy:/\.T$/.test(x.symbol)?'JPY':(x.currency||'USD'), sector:jpSector(x), industry:x.industryDisp||x.industry||''}));
}
// 既存保有の業種を検索APIから補完
async function fetchSector(h){
  try{ const sym=h.sym||holdingSym(h);
    const j=await yhJSON('https://query1.finance.yahoo.com/v1/finance/search?lang=ja-JP&region=JP&quotesCount=6&newsCount=0&q='+encodeURIComponent(h.code));
    const m=(j.quotes||[]).find(x=>x.symbol===sym)||(j.quotes||[])[0];
    if(m){ h.sector=jpSector(m)||h.sector; h.industry=m.industryDisp||m.industry||h.industry; }
  }catch(e){}
}
function parseChart(j){
  const res=j&&j.chart&&j.chart.result&&j.chart.result[0];
  if(!res||!res.indicators||!res.indicators.quote)throw new Error('データ形式エラー');
  const q=res.indicators.quote[0], ts=res.timestamp||[], out=[];
  for(let i=0;i<ts.length;i++){
    const o=q.open[i],h=q.high[i],l=q.low[i],c=q.close[i];
    if(c==null)continue;
    out.push({t:ts[i],open:o==null?c:o,high:h==null?c:h,low:l==null?c:l,close:c,volume:(q.volume&&q.volume[i])||0});
  }
  return {candles:out, meta:res.meta||{}};
}
const RANGE_INTERVAL={'5d':'30m','1mo':'1d','3mo':'1d','6mo':'1d','1y':'1d','2y':'1d','5y':'1wk','max':'1mo'};
async function yhChart(sym,range,interval){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval||RANGE_INTERVAL[range]||'1d'}`;
  return parseChart(await yhJSON(url));
}
async function yhQuote(sym){
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`;
  const {candles,meta}=parseChart(await yhJSON(url));
  const n=candles.length;
  const last=n?candles[n-1].close:null;
  // 前日比は「直前の営業日の終値」との差を取る。日足の最後の足が当日（東京時間）なら
  // 1つ前の足が前日終値。最後の足が当日でない（＝最新の確定足が前営業日）場合もその確定足が前日終値。
  const lastIsToday=n?isTokyoToday(candles[n-1].t*1000):false;
  let prevClose;
  if(n>=2) prevClose = lastIsToday ? candles[n-2].close : candles[n-1].close;
  else prevClose = meta.previousClose||meta.chartPreviousClose||last;
  return {
    price: meta.regularMarketPrice!=null?meta.regularMarketPrice:last,
    prevClose,
    open: meta.regularMarketOpen, high:meta.regularMarketDayHigh, low:meta.regularMarketDayLow,
    ccy: meta.currency, name: meta.shortName||meta.longName, exch:meta.fullExchangeName,
    meta
  };
}
function isTokyoToday(tsMs){
  const f=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Tokyo'});
  return f(tsMs)===f(Date.now());
}
// 購入日からその日（直近営業日）の終値を逆引き
async function yhCloseOnDate(sym, dateStr){
  const d=new Date(dateStr+'T00:00:00'); if(isNaN(d))throw new Error('日付が不正');
  const p2=Math.floor(d.getTime()/1000)+86400*4;       // 4日後まで（休場対策）
  const p1=Math.floor(d.getTime()/1000)-86400*9;        // 9日前から
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1d`;
  const {candles}=parseChart(await yhJSON(url));
  if(!candles.length)throw new Error('該当日のデータ無し');
  const target=Math.floor(d.getTime()/1000);
  let best=candles[0], bd=Infinity;
  for(const c of candles){ const diff=Math.abs(c.t-target); if(c.t<=target+86400 && diff<bd){bd=diff;best=c;} }
  return best.close;
}
// ニュース（日本語・キー不要）。Bing ニュースRSSを主、Google ニュースRSSを副に、
// 複数CORSプロキシで順に試行（Googleは共有プロキシをブロックしがちなため）。
function parseRSSItems(xml,fallbackSrc){
  if(!xml||xml.indexOf('<item')<0)return [];
  let doc; try{ doc=new DOMParser().parseFromString(xml,'application/xml'); }catch(e){ return []; }
  return [...doc.getElementsByTagName('item')].map(it=>{
    const g=t=>{const e=it.getElementsByTagName(t)[0];return e?e.textContent:'';};
    const pub=g('pubDate'); let src=g('News:Source')||g('source')||fallbackSrc;
    src=String(src).replace(/\s*on MSN$/i,'');
    let title=g('title'), url=g('link');
    return {headline:title, source:src||'ニュース', url, datetime:pub?Math.floor(Date.parse(pub)/1000):0};
  }).filter(x=>x.headline);
}
async function fetchRSS(rssUrl,fallbackSrc){
  for(const p of YH_PROXIES){
    try{ const r=await fetchTO(p(rssUrl),8000); if(!r.ok)continue; const t=await r.text();
      if(t&&t.indexOf('<item')>=0){ const items=parseRSSItems(t,fallbackSrc); if(items.length)return items; } }
    catch(e){}
  }
  return [];
}
async function yhNews(query){
  const bing='https://www.bing.com/news/search?q='+encodeURIComponent(query)+'&format=rss&setLang=ja&cc=JP';
  let items=await fetchRSS(bing,'Bing ニュース');
  if(items.length<3){
    const g='https://news.google.com/rss/search?q='+encodeURIComponent(query)+'&hl=ja&gl=JP&ceid=JP:ja';
    const gi=await fetchRSS(g,'Google ニュース');
    // 重複（同一見出し）を除外して結合
    const seen=new Set(items.map(x=>x.headline));
    gi.forEach(x=>{ if(!seen.has(x.headline)){ items.push(x); seen.add(x.headline); } });
  }
  items.sort((a,b)=>(b.datetime||0)-(a.datetime||0));
  return items.slice(0,16);
}

/* ---------- 企業ロゴ（ドメイン推定 → Clearbit Logo） ---------- */
function logoUrl(h){
  if(h._logo!==undefined)return h._logo;
  return null;
}
// 既知の主要日本株ドメイン（ロゴ表示用・無ければ頭文字タイル）
const DOMAIN_MAP={
 '7203':'toyota.jp','6758':'sony.com','6861':'keyence.co.jp','9984':'softbank.jp','8306':'mufg.jp',
 '9432':'ntt.com','6098':'recruit.co.jp','4063':'shinetsu.co.jp','8035':'tel.com','6594':'nidec.com',
 '7974':'nintendo.co.jp','9983':'fastretailing.com','4568':'daiichisankyo.co.jp','6902':'denso.com',
 '7267':'honda.co.jp','8058':'mitsubishicorp.com','8001':'itochu.co.jp','8316':'smfg.co.jp','8411':'mizuho-fg.com',
 '4502':'takeda.com','6501':'hitachi.com','6503':'mitsubishielectric.com','6981':'murata.com','7741':'hoya.com',
 '9433':'kddi.com','4661':'olc.co.jp','2914':'jt.com','4901':'fujifilm.com','6273':'smc-corp.co.jp',
 '6367':'daikin.co.jp','7751':'canon.jp','6954':'fanuc.co.jp','8031':'mitsui.com','5108':'bridgestone.co.jp',
 '6920':'lasertec.co.jp','4519':'chugai-pharm.co.jp','9020':'jreast.co.jp','9022':'jr-central.co.jp',
 '7269':'suzuki.co.jp','7270':'subaru.co.jp','7011':'mhi.com','6326':'kubota.co.jp','4543':'terumo.co.jp'
};
function domainFor(h){
  if(h.ccy==='JPY' && DOMAIN_MAP[h.code])return DOMAIN_MAP[h.code];
  return null;
}
function logoHTML(h,size){
  const dom=domainFor(h);
  const initial=esc((h.name||h.code||'?').trim().charAt(0).toUpperCase());
  const bg=holdColor(h);
  if(dom){
    return `<img src="https://logo.clearbit.com/${dom}" alt="" onerror="this.parentNode.style.background='${bg}';this.outerHTML='${initial}'">`;
  }
  return `<span style="display:grid;place-items:center;width:100%;height:100%;background:${bg}">${initial}</span>`;
}

/* ============================================================
   保有データのロード/計算
   ============================================================ */
function holdingSym(h){ return h.ccy==='JPY' ? (/\.T$/.test(h.code)?h.code:h.code+'.T') : h.code; }
async function loadHolding(h){
  const sym=h.sym||holdingSym(h);
  const [q,ch]=await Promise.all([ yhQuote(sym), yhChart(sym,'1y','1d') ]);
  h._q=q; h._candles=ch.candles; h._meta=ch.meta; h._loaded=true; h._err=null;
  if(q.ccy && !h.ccy)h.ccy=q.ccy;
  if(!h.sector){ try{ await fetchSector(h); }catch(e){} }
}
async function loadFx(){
  try{ const q=await yhQuote('JPY=X'); if(q.price)UI.fx.USDJPY=q.price; }catch(e){}
}

/* ---------- 市場指数・業種動向 ---------- */
const Market={indices:[],sectors:[],indicesAt:0,sectorsAt:0,sectorsLoading:false};
const INDICES=[
  {sym:'^N225',label:'日経平均',ccy:'JPY'},
  {sym:'1306.T',label:'TOPIX(ETF)',ccy:'JPY'},
  {sym:'^DJI',label:'NYダウ',ccy:'USD'},
  {sym:'^GSPC',label:'S&P500',ccy:'USD'},
  {sym:'^IXIC',label:'NASDAQ',ccy:'USD'},
  {sym:'JPY=X',label:'ドル円',ccy:'JPY'}
];
// TOPIX-17 業種別ETF（NEXT FUNDS）→ 市場の業種動向
const SECTOR_ETF=[
  ['1617.T','食品'],['1618.T','エネルギー資源'],['1619.T','建設・資材'],['1620.T','素材・化学'],
  ['1621.T','医薬品'],['1622.T','自動車・輸送機'],['1623.T','鉄鋼・非鉄'],['1624.T','機械'],
  ['1625.T','電機・精密'],['1626.T','情報通信・サービス'],['1627.T','電力・ガス'],['1628.T','運輸・物流'],
  ['1629.T','商社・卸売'],['1630.T','小売'],['1631.T','銀行'],['1632.T','金融(除く銀行)'],['1633.T','不動産']
];
async function loadIndices(){
  const res=[];
  await Promise.all(INDICES.map(async ix=>{
    try{ const q=await yhQuote(ix.sym); res.push({...ix,price:q.price,prev:q.prevClose,chg:q.price-q.prevClose,pct:q.prevClose?(q.price-q.prevClose)/q.prevClose*100:0}); }
    catch(e){ res.push({...ix,err:true}); }
  }));
  // 元の並び順を維持
  Market.indices=INDICES.map(ix=>res.find(r=>r.sym===ix.sym)).filter(Boolean);
  Market.indicesAt=Date.now();
}
async function loadSectors(){
  if(Market.sectorsLoading)return; Market.sectorsLoading=true;
  const res=[]; const queue=[...SECTOR_ETF]; let done=0;
  async function w(){ while(queue.length){ const [sym,label]=queue.shift();
    try{ const q=await yhQuote(sym); res.push({sym,label,pct:q.prevClose?(q.price-q.prevClose)/q.prevClose*100:0}); }catch(e){}
    done++; const el=$('#secProg'); if(el)el.textContent=done+'/'+SECTOR_ETF.length;
    if(UI.view==='analytics'){ const host=$('#mktSectors'); if(host)host.innerHTML=marketSectorsInner(res.slice().sort((a,b)=>b.pct-a.pct),done); }
  } }
  await Promise.all([w(),w(),w(),w()]);
  Market.sectors=res.sort((a,b)=>b.pct-a.pct); Market.sectorsAt=Date.now(); Market.sectorsLoading=false;
  if(UI.view==='analytics')renderAnalytics();
}
async function refreshAll(){
  if(UI.loading)return; UI.loading=true;
  const hs=Store.holdings;
  const rb=$('#refreshBtn'); rb.innerHTML='<span class="spin">⟳</span> 取得中…';
  const pill=$('#loadPill'); const total=hs.length||1;
  pill.classList.add('on'); pill.innerHTML='<span class="ld"></span><span id="loadCnt">0/'+total+' 取得中…</span>';
  // 取得中であることを即座に視覚化（スケルトン表示）
  renderAll();
  bar(8);
  await loadFx();
  loadIndices().then(()=>{ if(UI.view==='dashboard')renderDashboard(); }); // 指数は並行取得→入り次第表示
  let done=0;
  const queue=[...hs]; const CONC=4;
  async function worker(){
    while(queue.length){
      const h=queue.shift();
      try{ await loadHolding(h); }catch(e){ h._err=e.message||'取得失敗'; h._loaded=false; }
      done++; const lc=$('#loadCnt'); if(lc)lc.textContent=done+'/'+total+' 取得中…'; bar(8+done/total*90);
      // ロード済みの行を順次反映（動いている実感）
      if(UI.view==='dashboard'||UI.view==='holdings'){ renderDashboard(); renderHoldings(); $('#navCount').textContent=Store.holdings.length; }
    }
  }
  await Promise.all(Array.from({length:CONC},worker));
  Store.lastUpdate=Date.now(); save();
  UI.loading=false; bar(100);
  rb.textContent='⟳ 更新'; pill.classList.remove('on');
  $('#footUpd').textContent='更新: '+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
  renderAll();
}

// 1銘柄の集計（現地通貨）
function calc(h){
  if(!h._loaded||!h._q)return null;
  const px=h._q.price, prev=h._q.prevClose;
  const shares=Number(h.shares)||0, buy=Number(h.buyPrice)||0;
  const value=px*shares, cost=buy*shares;
  const pl=value-cost, plPct=buy>0?(px-buy)/buy*100:null;
  const dayChg=(px-prev), dayPct=prev>0?(px-prev)/prev*100:0, dayPL=dayChg*shares;
  return {px,prev,shares,buy,value,cost,pl,plPct,dayChg,dayPct,dayPL,ccy:h.ccy};
}
// JPY換算
function toJPY(v,ccy){ if(ccy==='JPY')return v; if(ccy==='USD'&&UI.fx.USDJPY)return v*UI.fx.USDJPY; return v; }
function portfolioTotals(){
  let value=0,cost=0,dayPL=0, anyFx=false, hasUSD=false;
  for(const h of Store.holdings){ const c=calc(h); if(!c)continue;
    value+=toJPY(c.value,c.ccy); cost+=toJPY(c.cost,c.ccy); dayPL+=toJPY(c.dayPL,c.ccy);
    if(c.ccy!=='JPY')hasUSD=true;
  }
  if(hasUSD&&!UI.fx.USDJPY)anyFx=true;
  const pl=value-cost, plPct=cost>0?pl/cost*100:0, dayPct=(value-dayPL)>0?dayPL/(value-dayPL)*100:0;
  return {value,cost,pl,plPct,dayPL,dayPct,fxMissing:anyFx,hasUSD};
}

/* ============================================================
   テクニカル指標・ホット度・MAGI 売買判断
   ============================================================ */
function ema(arr,k){ const a=2/(k+1); let e=arr[0]; const out=[e]; for(let i=1;i<arr.length;i++){ e=arr[i]*a+e*(1-a); out.push(e);} return out; }
function tech(h){
  if(!h._candles||h._candles.length<10)return null;
  const cl=h._candles.map(c=>c.close), n=cl.length, last=cl[n-1];
  const vols=h._candles.map(c=>c.volume||0);
  const hi=Math.max(...cl), lo=Math.min(...cl);
  const ma=k=>{const s=cl.slice(-Math.min(k,n));return s.reduce((a,b)=>a+b,0)/s.length;};
  const maAt=(k,back)=>{const e=n-back; const s=cl.slice(Math.max(0,e-k),e); return s.length?s.reduce((a,b)=>a+b,0)/s.length:last;};
  const ma5=ma(5), ma25=ma(25), ma75=ma(75);
  const pos52=(last-lo)/((hi-lo)||1)*100;             // 52週レンジ内の位置(0-100)
  let g=0,l=0; for(let i=Math.max(1,n-14);i<n;i++){const d=cl[i]-cl[i-1];if(d>0)g+=d;else l-=d;}
  const rsi=l===0?(g===0?50:100):100-100/(1+g/l);
  const chg=(a,b)=>b?(a-b)/b*100:0;
  const m5=chg(last,cl[n-6]||cl[0]), m20=chg(last,cl[n-21]||cl[0]), m60=chg(last,cl[n-61]||cl[0]);
  const dev25=chg(last,ma25);
  // MACD(12,26,9)
  const e12=ema(cl,12), e26=ema(cl,26); const macdArr=e12.map((v,i)=>v-e26[i]); const sig=ema(macdArr,9);
  const macd=macdArr[n-1], macdSig=sig[n-1], macdHist=macd-macdSig, macdHistPrev=macdArr[n-2]-sig[n-2];
  // ゴールデン/デッドクロス（25日と75日線の直近クロス）
  const ma25p=maAt(25,5), ma75p=maAt(75,5);
  const cross=(ma25>ma75&&ma25p<=ma75p)?'golden':(ma25<ma75&&ma25p>=ma75p)?'dead':'';
  // ボリンジャーバンド(20,2σ) 位置
  const win=cl.slice(-20); const mean=win.reduce((a,b)=>a+b,0)/win.length;
  const sd=Math.sqrt(win.reduce((a,b)=>a+(b-mean)*(b-mean),0)/win.length);
  const bb=sd?((last-mean)/(2*sd)):0;                  // -1=下限,0=中央,+1=上限
  // 出来高トレンド（直近5日 vs 過去25日平均）
  const v5=vols.slice(-5).reduce((a,b)=>a+b,0)/5, v25=vols.slice(-25).reduce((a,b)=>a+b,0)/Math.min(25,n);
  const volRatio=v25?v5/v25:1;
  return {last,hi,lo,ma5,ma25,ma75,pos52,rsi,m5,m20,m60,dev25,macd,macdSig,macdHist,macdHistPrev,cross,bb,volRatio};
}
// ホット度(0-100): 直近モメンタム＋トレンド＋過熱感の合成
function hotScore(h){
  const t=tech(h); const c=calc(h); if(!t)return null;
  let s=50;
  s+=clamp(t.m5*1.6,-14,14);
  s+=clamp(t.m20*0.9,-16,16);
  s+=(t.last>t.ma25?6:-6)+(t.ma25>t.ma75?6:-6);
  s+=clamp((t.pos52-50)*0.18,-9,9);
  if(c){ s+=clamp(c.dayPct*1.4,-10,10); }
  if(t.rsi>78)s-=6; if(t.rsi<25)s+=5;
  return Math.round(clamp(s,2,98));
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function hotLabel(s){ return s>=72?'過熱':s>=58?'強い':s>=43?'中立':s>=28?'軟調':'低調'; }
function hotColor(s){ return s>=58?'var(--up)':s<=42?'var(--down)':'var(--gold)'; }

// 業種別ホット度の集計
function sectorHeat(){
  const map={};
  for(const h of Store.holdings){ const s=hotScore(h); const c=calc(h);
    const sec=h.sector||'その他';
    if(!map[sec])map[sec]={sec,scores:[],value:0,day:[],n:0,plus:0};
    const m=map[sec]; m.n++;
    if(s!=null)m.scores.push(s);
    if(c){ m.value+=toJPY(c.value,h.ccy); m.day.push(c.dayPct); if(c.dayPct>0)m.plus++; }
  }
  return Object.values(map).map(m=>({
    sec:m.sec, n:m.n, value:m.value,
    hot:m.scores.length?Math.round(m.scores.reduce((a,b)=>a+b,0)/m.scores.length):null,
    avgDay:m.day.length?m.day.reduce((a,b)=>a+b,0)/m.day.length:0,
    plus:m.plus
  })).sort((a,b)=>(b.hot||0)-(a.hot||0));
}

/* MAGI 売買判断システム — 4賢者の合議＋コンセンサス指標
   MELCHIOR=オシレーター / BALTHASAR=トレンド / CASPER=取得状況 / MARQUIS=市場地合い */
function holdDays(h){ if(!h.buyDate)return null; const d=(Date.now()-new Date(h.buyDate+'T00:00:00').getTime())/86400000; return d>0?Math.floor(d):null; }
function nikkeiPct(){ const ix=Market.indices.find(x=>x.sym==='^N225'); return ix&&!ix.err?ix.pct:null; }
function magi(h){
  const t=tech(h), c=calc(h); if(!t)return null;
  const sages=[]; const signals=[]; // signals: {k,label,vote,detail}
  const sig=(k,label,vote,detail)=>{ signals.push({k,label,vote,detail}); return vote; };
  // MELCHIOR — オシレーター系（買われすぎ/売られすぎ）
  (()=>{ let v=0; const r=[];
    if(t.rsi>=72){v+=sig('RSI','RSI',-1,`RSI ${t.rsi.toFixed(0)}（買われすぎ）`);r.push(`RSI ${t.rsi.toFixed(0)} と買われすぎ圏で短期は過熱気味`);}
    else if(t.rsi<=30){v+=sig('RSI','RSI',1,`RSI ${t.rsi.toFixed(0)}（売られすぎ）`);r.push(`RSI ${t.rsi.toFixed(0)} と売られすぎ圏で反発を狙いやすい`);}
    else { sig('RSI','RSI',0,`RSI ${t.rsi.toFixed(0)}（中立）`); r.push(`RSI ${t.rsi.toFixed(0)} は中立圏`);}
    if(t.bb>=0.9){v+=sig('BB','ボリンジャー',-1,'+2σ上限タッチ');r.push('ボリンジャー+2σに接近（短期の上振れ）');}
    else if(t.bb<=-0.9){v+=sig('BB','ボリンジャー',1,'-2σ下限タッチ');r.push('ボリンジャー-2σに接近（短期の下振れ・反発期待）');}
    else sig('BB','ボリンジャー',0,'バンド内');
    if(t.dev25>=12){v+=sig('乖離','25日乖離',-1,`+${t.dev25.toFixed(0)}%`);r.push(`25日線から+${t.dev25.toFixed(0)}%上方乖離（過熱）`);}
    else if(t.dev25<=-12){v+=sig('乖離','25日乖離',1,`${t.dev25.toFixed(0)}%`);r.push(`25日線から${t.dev25.toFixed(0)}%下方乖離（売られすぎ）`);}
    else sig('乖離','25日乖離',0,`${t.dev25.toFixed(0)}%`);
    sages.push({name:'MELCHIOR',role:'オシレーター',vote:clamp(v,-1,1),reasons:r}); })();
  // BALTHASAR — トレンド（移動平均・MACD・クロス）
  (()=>{ let v=0; const r=[];
    const up=t.last>t.ma25 && t.ma25>t.ma75, dn=t.last<t.ma25 && t.ma25<t.ma75;
    if(up){v+=sig('トレンド','MA配列',1,'株価>25日>75日');r.push('株価>25日線>75日線の上昇トレンド（順張り良好）');}
    else if(dn){v+=sig('トレンド','MA配列',-1,'株価<25日<75日');r.push('株価<25日線<75日線の下降トレンド');}
    else { sig('トレンド','MA配列',0,'もみ合い'); r.push('移動平均が方向感に欠ける（もみ合い）');}
    if(t.cross==='golden'){v+=sig('クロス','GC/DC',1,'ゴールデンクロス');r.push('直近でゴールデンクロス（中期上昇示唆）');}
    else if(t.cross==='dead'){v+=sig('クロス','GC/DC',-1,'デッドクロス');r.push('直近でデッドクロス（中期下落示唆）');}
    else sig('クロス','GC/DC',0,'—');
    if(t.macdHist>0&&t.macdHistPrev<=0){v+=sig('MACD','MACD',1,'シグナル上抜け');r.push('MACDがシグナルを上抜け（買い転換）');}
    else if(t.macdHist<0&&t.macdHistPrev>=0){v+=sig('MACD','MACD',-1,'シグナル下抜け');r.push('MACDがシグナルを下抜け（売り転換）');}
    else { const mv=t.macdHist>0?1:t.macdHist<0?-1:0; sig('MACD','MACD',mv,t.macdHist>0?'プラス圏':'マイナス圏'); if(mv)r.push(`MACDは${t.macdHist>0?'プラス圏（強気）':'マイナス圏（弱気）'}`);}
    if(t.m20>=8){v+=sig('モメンタム','20日騰落',1,`+${t.m20.toFixed(0)}%`);r.push(`直近20日で+${t.m20.toFixed(0)}%と勢いが強い`);}
    else if(t.m20<=-8){v+=sig('モメンタム','20日騰落',-1,`${t.m20.toFixed(0)}%`);r.push(`直近20日で${t.m20.toFixed(0)}%と下落基調`);}
    else sig('モメンタム','20日騰落',0,`${t.m20.toFixed(0)}%`);
    if(t.volRatio>=1.6)r.push(`出来高が平常の${t.volRatio.toFixed(1)}倍（注目度上昇）`);
    sages.push({name:'BALTHASAR',role:'トレンド',vote:clamp(v,-1,1),reasons:r}); })();
  // CASPER — あなたの取得状況（買値・時期）
  (()=>{ let v=0; const r=[]; const days=holdDays(h);
    if(c&&c.plPct!=null){
      if(c.plPct>=25){v+=sig('損益','取得来損益',-1,`+${c.plPct.toFixed(0)}%`);r.push(`取得来 +${c.plPct.toFixed(1)}% の含み益。利益確定（一部売却）も選択肢`);}
      else if(c.plPct<=-18){r.push(`取得来 ${c.plPct.toFixed(1)}% の含み損。損切り基準（例 -20%）が近く要判断`);v+=sig('損益','取得来損益',c.plPct<=-25?-1:0,`${c.plPct.toFixed(0)}%`);}
      else if(c.plPct>0){sig('損益','取得来損益',0,`+${c.plPct.toFixed(0)}%`);r.push(`取得来 +${c.plPct.toFixed(1)}% の含み益で、まだ伸びしろあり`);}
      else { sig('損益','取得来損益',0,`${c.plPct.toFixed(0)}%`); r.push(`取得来 ${c.plPct.toFixed(1)}% とほぼ取得価格付近`);}
      if(c.plPct<0 && t.last>t.ma75){v+=sig('押し目','押し目','1','長期線の上')*1;r.push('長期線(75日)の上で取得来マイナス＝押し目買いの好機');}
    } else { r.push('取得単価が未設定のため、損益ベースの判断は限定的'); }
    if(days!=null)r.push(`保有 ${days} 日（${days<30?'短期':days<180?'中期':'長期'}）`);
    sages.push({name:'CASPER',role:'取得状況',vote:clamp(v,-1,1),reasons:r}); })();
  // MARQUIS — 市場地合い（日経平均・本日）
  (()=>{ let v=0; const r=[]; const nk=nikkeiPct();
    if(nk!=null){ if(nk>=0.8){v+=sig('地合い','日経平均',1,`+${nk.toFixed(1)}%`);r.push(`日経平均 +${nk.toFixed(2)}% と地合い良好`);}
      else if(nk<=-0.8){v+=sig('地合い','日経平均',-1,`${nk.toFixed(1)}%`);r.push(`日経平均 ${nk.toFixed(2)}% と地合い軟調`);}
      else { sig('地合い','日経平均',0,`${nk.toFixed(1)}%`); r.push(`日経平均 ${nk>=0?'+':''}${nk.toFixed(2)}% と方向感は限定的`);} }
    else r.push('市場指数の取得後に地合いを反映します');
    if(c){ if(c.dayPct>=3){v+=sig('当日','本日',1,`+${c.dayPct.toFixed(1)}%`);r.push(`本日 +${c.dayPct.toFixed(1)}% と強い`);}
      else if(c.dayPct<=-3){v+=sig('当日','本日',-1,`${c.dayPct.toFixed(1)}%`);r.push(`本日 ${c.dayPct.toFixed(1)}% と弱い`);} }
    sages.push({name:'MARQUIS',role:'市場地合い',vote:clamp(v,-1,1),reasons:r}); })();
  const sum=sages.reduce((a,s)=>a+s.vote,0);
  let verdict,vc,vi;
  if(sum>=3){verdict='強い買い';vc='var(--up)';vi='▲▲';}
  else if(sum===2){verdict='買い増し検討';vc='var(--up)';vi='▲';}
  else if(sum===1){verdict='買い寄り（押し目）';vc='var(--up)';vi='△';}
  else if(sum===0){verdict='中立・継続保有';vc='var(--gold)';vi='＝';}
  else if(sum===-1){verdict='利確・様子見寄り';vc='var(--down)';vi='▽';}
  else if(sum===-2){verdict='売り検討';vc='var(--down)';vi='▼';}
  else {verdict='強い売り';vc='var(--down)';vi='▼▼';}
  // コンセンサス（多数の指標の賛否を 0-100 の強気度に集約）
  const sigSum=signals.reduce((a,s)=>a+(+s.vote||0),0);
  const bull=Math.round(clamp(50+sigSum*7,2,98));
  const buyN=signals.filter(s=>(+s.vote)>0).length, sellN=signals.filter(s=>(+s.vote)<0).length, neutN=signals.length-buyN-sellN;
  const consensus = bull>=70?'強気':bull>=57?'やや強気':bull>=43?'中立':bull>=30?'やや弱気':'弱気';
  const agree=Math.abs(sum), conf=agree>=4?'非常に高い':agree>=3?'高い':agree>=2?'中程度':'低い';
  return {sages,sum,verdict,vc,vi,conf,signals,bull,consensus,buyN,sellN,neutN};
}

/* ============================================================
   描画
   ============================================================ */
function renderAll(){ renderDashboard(); renderHoldings(); renderAnalytics(); updateMarketClock(); $('#navCount').textContent=Store.holdings.length; updateWatchBadge(); if(UI.view==='watch')renderWatch(); if(UI.view==='detail'&&UI.detailId){ if(UI.detailKind==='watch')renderWatchDetail(UI.detailId); else renderDetail(UI.detailId); } }

function emptyState(icon,title,msg){
  return `<div class="empty"><div class="ei">${icon}</div><h3>${title}</h3><p>${msg}</p><button class="btn primary" onclick="openAdd()" style="margin-top:14px">＋ 最初の銘柄を追加</button></div>`;
}

/* 市場サマリー（指数）ストリップ */
function marketStripHTML(){
  if(!Market.indices.length)return `<div class="mkt-strip"><div class="mkt-cell skel-cell"><span class="skel" style="width:70px"></span><span class="skel" style="width:90px;margin-top:6px"></span></div><div class="mkt-cell skel-cell"><span class="skel" style="width:70px"></span><span class="skel" style="width:90px;margin-top:6px"></span></div><div class="mkt-cell skel-cell"><span class="skel" style="width:70px"></span><span class="skel" style="width:90px;margin-top:6px"></span></div><div class="mkt-loading">${UI.loading?'<span class="ld"></span> 市場データ取得中…':'市場データ待機中'}</div></div>`;
  return `<div class="mkt-strip">`+Market.indices.map(ix=>{
    if(ix.err)return `<div class="mkt-cell"><div class="mkt-n">${esc(ix.label)}</div><div class="mkt-p mono" style="color:var(--txt-3)">—</div></div>`;
    const dec=(ix.sym==='JPY=X')?2:(ix.ccy==='JPY'&&ix.sym!=='1306.T')?0:2;
    return `<div class="mkt-cell"><div class="mkt-n">${esc(ix.label)}</div><div class="mkt-p mono">${fmtNum(ix.price,dec)}</div><div class="mkt-c mono ${signCls(ix.pct)}">${arrow(ix.pct)} ${fmtPct(ix.pct)}</div></div>`;
  }).join('')+`</div>`;
}
/* ---- Dashboard ---- */
function renderDashboard(){
  const el=$('#v-dashboard');
  if(!Store.holdings.length){ el.innerHTML=`<div class="page-head"><h2>ポートフォリオ</h2><div class="sub">今日の市場の動き</div></div>${marketStripHTML()}${emptyState('📈','まだ保有銘柄がありません','買った株を証券コードや会社名で追加すると、取得単価からの伸び率・損益・チャートが見られます。')}`; return; }
  const t=portfolioTotals();
  const loadedN=Store.holdings.filter(h=>h._loaded).length, allN=Store.holdings.length;
  const loaded=loadedN===allN;
  const ld=UI.loading&&!loaded?' loading':'';
  const subTxt=UI.loading&&!loaded?`<span class="loadpill on" style="margin-left:6px"><span class="ld"></span>${loadedN}/${allN} 取得中…</span>`:'';
  const fxNote=t.hasUSD?`<div class="side-foot" style="border:none;padding:0;margin-top:4px;font-size:10px">米国株は${UI.fx.USDJPY?'1$=¥'+UI.fx.USDJPY.toFixed(1)+'で円換算':'為替取得待ち'}</div>`:'';
  el.innerHTML=`
    <div class="page-head"><h2>ポートフォリオ</h2><div class="sub">${allN}銘柄${subTxt}</div>
      <div class="ph-right"><button class="btn ghost sm" onclick="refreshAll()">⟳ 再取得</button></div></div>
    ${marketStripHTML()}
    <div class="grid kpis">
      <div class="card kpi${ld}"><div class="lbl">評価額（円換算）</div><div class="val mono">${fmtMoney(t.value,'JPY')}</div><div class="chg mono ${signCls(t.dayPL)}">${arrow(t.dayPL)} ${fmtMoney(Math.abs(t.dayPL),'JPY')}（本日）</div>${fxNote}</div>
      <div class="card kpi${ld}"><div class="lbl">取得額（投資元本）</div><div class="val mono">${fmtMoney(t.cost,'JPY')}</div><div class="chg mono" style="color:var(--txt-3)">${allN}銘柄の合計</div></div>
      <div class="card kpi${ld}"><div class="lbl">評価損益（取得来）</div><div class="val mono ${signCls(t.pl)}">${t.pl>=0?'+':'-'}${fmtMoney(Math.abs(t.pl),'JPY')}</div><div class="chg"><span class="tag-pill ${signCls(t.pl)} mono">${arrow(t.pl)} ${fmtPct(t.plPct)}</span></div></div>
      <div class="card kpi${ld}"><div class="lbl">本日の損益（前日比）</div><div class="val mono ${signCls(t.dayPL)}">${t.dayPL>=0?'+':'-'}${fmtMoney(Math.abs(t.dayPL),'JPY')}</div><div class="chg"><span class="tag-pill ${signCls(t.dayPL)} mono">${arrow(t.dayPL)} ${fmtPct(t.dayPct)}</span></div></div>
    </div>
    <div class="grid dash-2">
      <div class="card">
        <div style="display:flex;align-items:center;margin-bottom:12px"><b style="font-family:var(--display);font-size:15px">保有銘柄</b><button class="btn ghost sm" style="margin-left:auto" onclick="go('holdings')">すべて表示</button></div>
        <div style="overflow-x:auto">${holdingsTable(Store.holdings.slice(0,6))}</div>
      </div>
      <div class="card">
        <b style="font-family:var(--display);font-size:15px">資産配分</b>
        <div class="donut-wrap" style="margin-top:14px">${donutHTML()}</div>
      </div>
    </div>`;
  drawSparks(el);
}

function holdingsTable(list){
  if(!list.length)return '<div class="empty" style="padding:26px"><p>銘柄がありません</p></div>';
  let rows='';
  for(const h of list){
    const c=calc(h);
    const loading=!h._loaded&&!h._err;
    const px=c?fmtMoney(c.px,h.ccy):(h._err?'<span class="down">取得失敗</span>':'<span class="skel px"></span>');
    // 前日比: 額 + 率
    const day=c?`<span class="${signCls(c.dayPL)} mono">${arrow(c.dayPL)} ${fmtPct(c.dayPct)}</span><span class="hm-s mono ${signCls(c.dayPL)}">${c.dayPL>=0?'+':'-'}${fmtMoney(Math.abs(c.dayPL),h.ccy)}</span>`:(loading?'<span class="skel"></span>':'<span class="hm-s" style="color:var(--txt-3)">—</span>');
    const val=c?fmtMoney(toJPY(c.value,h.ccy),'JPY'):(loading?'<span class="skel wide"></span>':'—');
    // 取得来: 額 + 率
    const pl=c&&c.plPct!=null?`<span class="${signCls(c.pl)} mono">${c.pl>=0?'+':'-'}${fmtMoney(Math.abs(toJPY(c.pl,h.ccy)),'JPY')}</span><span class="tag-pill ${signCls(c.pl)} mono hm-s" style="margin-top:1px">${arrow(c.plPct)} ${fmtPct(c.plPct)}</span>`:(c?'<span class="hm-s" style="color:var(--txt-3)">単価未設定</span>':(loading?'<span class="skel"></span>':'—'));
    const hs=hotScore(h);
    const sec=h.sector?`<span class="sec-chip">${esc(h.sector)}</span>`:'';
    const hot=hs!=null?`<span class="hot-chip" style="color:${hotColor(hs)};border-color:${hotColor(hs)}33">🔥${hs}</span>`:'';
    rows+=`<div class="hcard ${loading?'loading':''}" onclick="openDetail('${h.id}')">
      <div class="hc-main"><div class="hlogo">${logoHTML(h)}</div><div style="min-width:0"><div class="hname">${esc(h.name)}</div><div class="hcode mono">${esc(h.code)} · ${esc(h.ccy)} ${sec}${hot}</div></div></div>
      <canvas class="spark hc-spark" data-id="${h.id}"></canvas>
      <div class="hm hc-px"><span class="hm-k">現在値 ・ 前日比</span><span class="hm-v mono">${px}</span>${day}</div>
      <div class="hm"><span class="hm-k">評価額（円）</span><span class="hm-v mono">${val}</span></div>
      <div class="hm"><span class="hm-k">取得来 損益（円）</span><span class="hm-v">${pl}</span></div>
    </div>`;
  }
  return `<div class="hlist">${rows}</div>`;
}

function donutHTML(){
  const items=Store.holdings.map(h=>{const c=calc(h);return {name:h.name,code:h.code,v:c?toJPY(c.value,h.ccy):0,col:holdColor(h)};}).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
  const total=items.reduce((s,x)=>s+x.v,0);
  if(!total)return '<div style="color:var(--txt-3);font-size:13px">評価額の取得後に表示されます</div>';
  let a=-90, segs='';
  const R=54,C=2*Math.PI*R;
  let off=0;
  for(const it of items){ const frac=it.v/total; const len=frac*C;
    segs+=`<circle cx="70" cy="70" r="${R}" fill="none" stroke="${it.col}" stroke-width="18" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"/>`;
    off+=len;
  }
  const legend=items.slice(0,8).map(it=>`<div class="leg-row"><span class="leg-dot" style="background:${it.col}"></span><span class="nm">${esc(it.name)}</span><span class="pc">${(it.v/total*100).toFixed(1)}%</span></div>`).join('');
  return `<svg width="140" height="140" viewBox="0 0 140 140">${segs}<circle cx="70" cy="70" r="36" fill="var(--panel)"/><text x="70" y="66" text-anchor="middle" fill="var(--txt-3)" font-size="9" font-family="var(--mono)">合計</text><text x="70" y="82" text-anchor="middle" fill="var(--txt)" font-size="13" font-weight="600" font-family="var(--mono)">${items.length}銘柄</text></svg><div class="legend">${legend}</div>`;
}

/* sparkline */
function drawSparks(scope){
  (scope||document).querySelectorAll('canvas.spark').forEach(cv=>{
    const h=Store.holdings.find(x=>x.id===cv.dataset.id); if(!h||!h._candles)return;
    const data=h._candles.slice(-60).map(c=>c.close); if(data.length<2)return;
    const dpr=window.devicePixelRatio||1, w=cv.clientWidth||96, ht=cv.clientHeight||30;
    cv.width=w*dpr; cv.height=ht*dpr; const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
    const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
    const up=data[data.length-1]>=data[0];
    const col=up?getC('--up'):getC('--down');
    ctx.beginPath();
    data.forEach((v,i)=>{const x=i/(data.length-1)*w, y=ht-((v-mn)/rng)*(ht-4)-2; i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();
    const grad=ctx.createLinearGradient(0,0,0,ht); grad.addColorStop(0,col+'30'); grad.addColorStop(1,col+'00');
    ctx.lineTo(w,ht); ctx.lineTo(0,ht); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
  });
}
function getC(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

/* ---- Holdings ---- */
function isUncategorized(h){ return !h.listId||!Store.lists.some(l=>l.id===h.listId); }
function holdingsFiltered(){
  if(UI.listFilter==='__none__')return Store.holdings.filter(isUncategorized);
  if(UI.listFilter!=='__all__')return Store.holdings.filter(h=>h.listId===UI.listFilter);
  return Store.holdings;
}
function listSubtotal(hs){ let value=0,cost=0; for(const h of hs){ const c=calc(h); if(!c)continue; value+=toJPY(c.value,h.ccy); cost+=toJPY(c.cost,h.ccy); } return {value,cost,pl:value-cost}; }
function setListFilter(f){ UI.listFilter=f; renderHoldings(); const el=$('#v-holdings'); drawSparks(el); }
function renderHoldings(){
  const el=$('#v-holdings');
  if(!Store.holdings.length){ el.innerHTML=`<div class="page-head"><h2>保有銘柄</h2></div>${emptyState('💼','保有銘柄がありません','「＋ 銘柄を追加」から登録してください。')}`; return; }
  // 無効なフィルタはリセット
  if(UI.listFilter!=='__all__'&&UI.listFilter!=='__none__'&&!Store.lists.some(l=>l.id===UI.listFilter))UI.listFilter='__all__';
  const uncatN=Store.holdings.filter(isUncategorized).length;
  const chips=[{k:'__all__',n:'すべて',c:Store.holdings.length}]
    .concat(Store.lists.map(l=>({k:l.id,n:l.name,c:Store.holdings.filter(h=>h.listId===l.id).length})));
  if(uncatN&&Store.lists.length)chips.push({k:'__none__',n:'未分類',c:uncatN});
  const chipHTML=Store.lists.length||uncatN
    ? `<div class="lchips">${chips.map(c=>`<button class="lchip ${UI.listFilter===c.k?'on':''}" onclick="setListFilter('${c.k}')">${esc(c.n)} <span class="lchip-n">${c.c}</span></button>`).join('')}<button class="lchip" onclick="newListPrompt()">＋ リスト</button></div>`
    : `<div class="lchips"><span style="font-size:11.5px;color:var(--txt-3);align-self:center">証券会社・口座ごとに分けるには、追加・編集でリストを指定するか</span><button class="lchip" onclick="newListPrompt()">＋ リストを作成</button></div>`;
  let body;
  if(UI.listFilter==='__all__'&&Store.lists.length){
    const groups=Store.lists.map(l=>({name:l.name,hs:Store.holdings.filter(h=>h.listId===l.id)}))
      .concat([{name:'未分類',hs:Store.holdings.filter(isUncategorized)}]).filter(g=>g.hs.length);
    body=groups.map(g=>{ const st=listSubtotal(g.hs);
      return `<div class="card" style="margin-bottom:14px"><div class="lgrp-head"><b>${esc(g.name)}</b><span class="lgrp-n">${g.hs.length}銘柄</span><span class="lgrp-sum">評価 ${fmtMoney(st.value,'JPY')} ・ <span class="${signCls(st.pl)}">${st.pl>=0?'+':'-'}${fmtMoney(Math.abs(st.pl),'JPY')}</span></span></div><div style="overflow-x:auto">${holdingsTable(g.hs)}</div></div>`;
    }).join('');
  }else{
    body=`<div class="card"><div style="overflow-x:auto">${holdingsTable(holdingsFiltered())}</div></div>`;
  }
  el.innerHTML=`<div class="page-head"><h2>保有銘柄</h2><div class="sub">${Store.holdings.length}銘柄${Store.lists.length?` ・ ${Store.lists.length}リスト`:''}</div>
    <div class="ph-right"><button class="btn primary sm" onclick="openAdd()">＋ 追加</button></div></div>
    ${chipHTML}${body}`;
  drawSparks(el);
}
function newListPrompt(){ const nm=prompt('新しいリスト名（証券会社・口座など）を入力'); const id=createList(nm); if(id){ UI.listFilter=id; renderHoldings(); toast('リストを作成しました。追加・編集で銘柄を割り当てられます'); } }

/* ---- Analytics ---- */
function renderAnalytics(){
  const el=$('#v-analytics');
  if(!Store.holdings.length){ el.innerHTML=`<div class="page-head"><h2>損益・分析</h2></div>${emptyState('📊','データがありません','銘柄を追加すると損益ランキングや構成比が表示されます。')}`; return; }
  const rows=Store.holdings.map(h=>({h,c:calc(h)})).filter(x=>x.c&&x.c.plPct!=null);
  const t=portfolioTotals();
  const sorted=[...rows].sort((a,b)=>b.c.plPct-a.c.plPct);
  const best=sorted.slice(0,5), worst=[...sorted].reverse().slice(0,5);
  function rankRows(arr){ return arr.map(x=>{const c=x.c;return `<tr class="hrow" onclick="openDetail('${x.h.id}')"><td><div class="htick"><div class="hlogo" style="width:28px;height:28px;font-size:11px">${logoHTML(x.h)}</div><div class="hname" style="max-width:150px">${esc(x.h.name)}</div></div></td><td class="r"><span class="${signCls(c.pl)} mono">${c.pl>=0?'+':'-'}${fmtMoney(Math.abs(toJPY(c.pl,x.h.ccy)),'JPY')}</span></td><td class="r"><span class="tag-pill ${signCls(c.pl)} mono">${fmtPct(c.plPct)}</span></td></tr>`;}).join(''); }
  el.innerHTML=`<div class="page-head"><h2>損益・分析</h2><div class="sub">伸び率ランキングと構成</div></div>
    <div class="grid kpis">
      <div class="card kpi"><div class="lbl">総リターン</div><div class="val mono ${signCls(t.pl)}">${fmtPct(t.plPct)}</div><div class="chg mono ${signCls(t.pl)}">${t.pl>=0?'+':'-'}${fmtMoney(Math.abs(t.pl),'JPY')}</div></div>
      <div class="card kpi"><div class="lbl">含み益の銘柄</div><div class="val mono up">${rows.filter(x=>x.c.pl>0).length}</div><div class="chg mono" style="color:var(--txt-3)">/ ${rows.length}銘柄</div></div>
      <div class="card kpi"><div class="lbl">含み損の銘柄</div><div class="val mono down">${rows.filter(x=>x.c.pl<0).length}</div><div class="chg mono" style="color:var(--txt-3)">/ ${rows.length}銘柄</div></div>
      <div class="card kpi"><div class="lbl">最大の保有</div><div class="val mono" style="font-size:18px">${esc((rows.slice().sort((a,b)=>toJPY(b.c.value,b.h.ccy)-toJPY(a.c.value,a.h.ccy))[0]||{h:{name:'—'}}).h.name)}</div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap"><b style="font-family:var(--display);font-size:15px">🌐 市場全体の業種動向（本日の騰落率）</b><span class="sub" style="color:var(--txt-3);font-size:12px">東証17業種ETFで、いまどの業種が買われているかを把握</span></div>
      <div id="mktSectors">${marketSectorsInner(Market.sectors, Market.sectors.length)}</div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap"><b style="font-family:var(--display);font-size:15px">🔥 保有銘柄の業種別ホット度</b><span class="sub" style="color:var(--txt-3);font-size:12px">あなたの保有を業種でまとめ、勢い（モメンタム＋トレンド＋過熱感）を集計</span></div>
      ${sectorHeatHTML()}
    </div>
    <div class="grid dash-2">
      <div class="card"><b style="font-family:var(--display);font-size:15px">📈 値上がり率トップ</b><table class="htable" style="margin-top:10px"><tbody>${rankRows(best)||'<tr><td>—</td></tr>'}</tbody></table></div>
      <div class="card"><b style="font-family:var(--display);font-size:15px">📉 値下がり率トップ</b><table class="htable" style="margin-top:10px"><tbody>${rankRows(worst)||'<tr><td>—</td></tr>'}</tbody></table></div>
    </div>`;
  // 市場の業種動向を必要に応じて取得（分析画面を開いた時・5分キャッシュ）
  if(UI.view==='analytics' && !Market.sectorsLoading && (!Market.sectors.length || Date.now()-Market.sectorsAt>300000)) loadSectors();
}
function marketSectorsInner(secs, done){
  const N=SECTOR_ETF.length;
  if(!secs||!secs.length){ return `<div class="sec-loading"><span class="ld"></span> 市場の業種データを取得中… <span id="secProg" class="mono">${done||0}/${N}</span></div>`; }
  const max=Math.max(...secs.map(s=>Math.abs(s.pct)),0.5);
  const loadingTail = (Market.sectorsLoading&&secs.length<N)?`<div class="sec-loading" style="margin-top:8px"><span class="ld"></span> 取得中 <span id="secProg" class="mono">${secs.length}/${N}</span></div>`:'';
  return `<div class="msec-list" style="margin-top:10px">`+secs.map((s,i)=>{
    const up=s.pct>=0; const col=up?'var(--up)':'var(--down)'; const w=Math.abs(s.pct)/max*50;
    return `<div class="msec-row">
      <div class="msec-rank mono">${i+1}</div>
      <div class="msec-name">${esc(s.label)}</div>
      <div class="msec-track"><i class="${up?'pos':'neg'}" style="width:${w}%;background:${col}"></i></div>
      <div class="msec-pct mono ${signCls(s.pct)}">${arrow(s.pct)} ${fmtPct(s.pct)}</div>
    </div>`;
  }).join('')+`</div>${loadingTail}<div style="font-size:10.5px;color:var(--txt-3);margin-top:8px">上位の業種ほど本日強く買われています（東証17業種ETF・NEXT FUNDS の前日比）。</div>`;
}
function sectorHeatHTML(){
  const secs=sectorHeat();
  if(!secs.length||secs.every(s=>s.hot==null))return '<div style="color:var(--txt-3);font-size:13px;padding:8px 0">データ取得後に表示されます</div>';
  return `<div class="heat-list" style="margin-top:10px">`+secs.map(s=>{
    const hot=s.hot==null?0:s.hot;
    const col=hotColor(hot);
    return `<div class="heat-row">
      <div class="heat-name"><b>${esc(s.sec)}</b><span class="mono" style="color:var(--txt-3);font-size:11px"> ${s.n}銘柄</span></div>
      <div class="heat-bar"><i style="width:${hot}%;background:${col}"></i></div>
      <div class="heat-val mono" style="color:${col}">${s.hot==null?'—':hot} <span style="color:var(--txt-3);font-size:10px">${hotLabel(hot)}</span></div>
      <div class="heat-day mono ${signCls(s.avgDay)}">${arrow(s.avgDay)} ${fmtPct(s.avgDay)}</div>
    </div>`;
  }).join('')+`</div><div style="font-size:10.5px;color:var(--txt-3);margin-top:8px">ホット度は 0〜100。58以上=強い/過熱、42以下=軟調/低調。右端は業種内の平均前日比。</div>`;
}

/* ============================================================
   発見・ランキング（スクリーナー）
   主要日本株を実データ（株価・出来高）でスクリーニングし、
   「今人気」「コスパが良い」「買い／売り注文が多い」を算出
   ============================================================ */
// スクリーニング対象ユニバース（東証主力銘柄。code=証券コード, sec=業種）
const UNIVERSE=[
  {code:'7203',name:'トヨタ自動車',sector:'自動車'},{code:'7267',name:'ホンダ',sector:'自動車'},
  {code:'7269',name:'スズキ',sector:'自動車'},{code:'7270',name:'SUBARU',sector:'自動車'},
  {code:'6902',name:'デンソー',sector:'自動車部品'},{code:'5108',name:'ブリヂストン',sector:'タイヤ'},
  {code:'6758',name:'ソニーグループ',sector:'電機'},{code:'6752',name:'パナソニックHD',sector:'電機'},
  {code:'6501',name:'日立製作所',sector:'電機'},{code:'6503',name:'三菱電機',sector:'電機'},
  {code:'6861',name:'キーエンス',sector:'電機'},{code:'6981',name:'村田製作所',sector:'電子部品'},
  {code:'6645',name:'オムロン',sector:'電機'},{code:'6594',name:'ニデック',sector:'電機'},
  {code:'8035',name:'東京エレクトロン',sector:'半導体'},{code:'6857',name:'アドバンテスト',sector:'半導体'},
  {code:'6920',name:'レーザーテック',sector:'半導体'},{code:'6963',name:'ローム',sector:'半導体'},
  {code:'6367',name:'ダイキン工業',sector:'機械'},{code:'6954',name:'ファナック',sector:'機械'},
  {code:'7011',name:'三菱重工業',sector:'機械'},{code:'6326',name:'クボタ',sector:'機械'},
  {code:'7741',name:'HOYA',sector:'精密'},{code:'4543',name:'テルモ',sector:'医療機器'},
  {code:'4063',name:'信越化学工業',sector:'化学'},{code:'3407',name:'旭化成',sector:'化学'},
  {code:'4502',name:'武田薬品工業',sector:'医薬'},{code:'4519',name:'中外製薬',sector:'医薬'},
  {code:'4568',name:'第一三共',sector:'医薬'},{code:'4452',name:'花王',sector:'日用品'},
  {code:'2914',name:'日本たばこ産業',sector:'食品'},{code:'2802',name:'味の素',sector:'食品'},
  {code:'9983',name:'ファーストリテイリング',sector:'小売'},{code:'3382',name:'セブン&アイ',sector:'小売'},
  {code:'8267',name:'イオン',sector:'小売'},{code:'4661',name:'オリエンタルランド',sector:'サービス'},
  {code:'6098',name:'リクルートHD',sector:'サービス'},{code:'7974',name:'任天堂',sector:'ゲーム'},
  {code:'9984',name:'ソフトバンクグループ',sector:'投資'},{code:'9432',name:'NTT',sector:'通信'},
  {code:'9433',name:'KDDI',sector:'通信'},{code:'9434',name:'ソフトバンク',sector:'通信'},
  {code:'8306',name:'三菱UFJ',sector:'銀行'},{code:'8316',name:'三井住友FG',sector:'銀行'},
  {code:'8411',name:'みずほFG',sector:'銀行'},{code:'8058',name:'三菱商事',sector:'商社'},
  {code:'8001',name:'伊藤忠商事',sector:'商社'},{code:'8031',name:'三井物産',sector:'商社'},
  {code:'8053',name:'住友商事',sector:'商社'},{code:'9101',name:'日本郵船',sector:'海運'},
  {code:'5401',name:'日本製鉄',sector:'鉄鋼'},{code:'1605',name:'INPEX',sector:'エネルギー'},
  {code:'8801',name:'三井不動産',sector:'不動産'},{code:'9020',name:'JR東日本',sector:'鉄道'},
  {code:'9501',name:'東京電力HD',sector:'電力'},{code:'4755',name:'楽天グループ',sector:'IT'}
];
const Screener={items:[],loading:false,at:0,done:0};

// 1銘柄のチャート(OHLCV)から各種スコアを算出
function scMetrics(candles){
  const t=tech({_candles:candles}); if(!t)return null;
  const n=candles.length;
  const last=candles[n-1].close, prev=n>1?candles[n-2].close:last;
  const dayPct=prev?(last-prev)/prev*100:0;
  // 直近20日の売買圧力（チャイキン式マネーフロー）と売買代金
  const rec=candles.slice(-20); let buy=0,sell=0,turn=0,buyT=0,sellT=0;
  for(const c of rec){ const rng=(c.high-c.low)||1e-9; const mfm=((c.close-c.low)-(c.high-c.close))/rng;
    const v=c.volume||0, tv=c.close*v;
    buy+=v*(mfm+1)/2; sell+=v*(1-mfm)/2;
    buyT+=tv*(mfm+1)/2; sellT+=tv*(1-mfm)/2; turn+=tv; }
  const days=rec.length||1;
  const flowTot=buy+sell||1; const buyPct=buy/flowTot*100; const turnover=turn/days;
  const buyTurn=buyT/days, sellTurn=sellT/days; // 買い／売りの1日平均売買代金（現地通貨）
  // 人気度：出来高急増＋モメンタム＋本日の強さ＋高値圏
  let pop=50;
  pop+=clamp((t.volRatio-1)*38,-18,46); pop+=clamp(t.m5*1.5,-15,18); pop+=clamp(t.m20*0.7,-14,18);
  pop+=clamp(dayPct*1.4,-12,12); pop+=clamp((t.pos52-50)*0.14,-8,8);
  pop=Math.round(clamp(pop,2,99));
  // コスパ：長期上昇基調×足元は押し目×過熱(割高)でない、を合成した独自スコア
  let val=50;
  val+=(t.ma25>t.ma75?9:-9); val+=(t.last>t.ma75?7:-7);
  val+=clamp(t.m60*0.25,-12,10);        // 長期は上昇しているほど良い
  val+=clamp(-t.m5*0.8,-8,8);           // 直近は下げている（押し目）ほど割安余地
  val+=clamp(-t.dev25*0.75,-15,15);     // 25日線から上方乖離＝割高
  val+=clamp(9-Math.abs(t.rsi-45)*0.35,-8,9); // RSI45付近が妙味
  val+=clamp(-(t.pos52-45)*0.12,-9,9);  // 52週高値圏は割高
  if(t.bb<=-0.8)val+=6; if(t.bb>=0.9)val-=6;
  val=Math.round(clamp(val,2,99));
  // 活発度：売買代金 × 出来高急増度
  const activity=turnover*Math.sqrt(Math.max(0.3,t.volRatio));
  return {last,dayPct,volRatio:t.volRatio,rsi:t.rsi,m20:t.m20,pos52:t.pos52,buyPct,turnover,buyTurn,sellTurn,pop,val,activity};
}
async function loadScreener(force){
  if(Screener.loading)return;
  if(!force && Screener.items.length && Date.now()-Screener.at<600000)return;
  Screener.loading=true; Screener.done=0; Screener.items=[];
  if(UI.view==='discover')paintDiscover();
  const queue=[...UNIVERSE]; const CONC=5;
  async function w(){ while(queue.length){ const u=queue.shift();
    try{ const {candles}=await yhChart(u.code+'.T','6mo','1d');
      if(candles&&candles.length>=30){ const m=scMetrics(candles); if(m)Screener.items.push({...u,...m}); } }
    catch(e){}
    Screener.done++;
    if(UI.view==='discover'){ const p=$('#discProg'); if(p)p.textContent=Screener.done+'/'+UNIVERSE.length;
      if(Screener.done%4===0)paintDiscover(); }
  } }
  await Promise.all(Array.from({length:CONC},w));
  Screener.loading=false; Screener.at=Date.now();
  if(UI.view==='discover')paintDiscover();
}
function renderDiscover(){
  const el=$('#v-discover');
  el.innerHTML=`<div class="page-head"><h2>発見・ランキング</h2><div class="sub">主要${UNIVERSE.length}銘柄を実データでスクリーニング</div>
    <div class="ph-right"><span class="loadpill" id="discPill"></span><button class="btn ghost sm" onclick="loadScreener(true)">⟳ 再スクリーニング</button></div></div>
    ${marketStripHTML()}
    <div id="discProgWrap"></div>
    <div class="grid disc-grid" id="discCards"></div>
    <div style="font-size:10.5px;color:var(--txt-3);margin-top:14px;line-height:1.7">※ ランキングは Yahoo Finance の実データ（株価・出来高）から本アプリが独自に算出した参考指標です。「人気度」「コスパ」はモメンタムや需給からの推計で、PER等の財務指標ではありません。最終的な投資判断はご自身の責任で行ってください。銘柄をタップすると、チャート・買い時判断・予想株価などの詳細を確認でき、そこからウォッチや保有に追加できます。</div>`;
  paintDiscover();
  loadScreener();
}
function discSkeletonCard(){
  let r=''; for(let i=0;i<8;i++)r+=`<div class="sk"><span class="skel" style="width:18px"></span><span class="skel" style="width:46%"></span><span class="skel" style="width:42px;margin-left:auto"></span></div>`;
  return `<div class="card disc-card"><div class="disc-skel">${r}</div></div>`;
}
function paintDiscover(){
  const cards=$('#discCards'); if(!cards)return;
  const pill=$('#discPill');
  if(pill){ pill.classList.toggle('on',Screener.loading); if(Screener.loading)pill.innerHTML=`<span class="ld"></span>${Screener.done}/${UNIVERSE.length}`; }
  const pw=$('#discProgWrap');
  if(pw)pw.innerHTML=(Screener.loading&&Screener.items.length<6)?`<div class="disc-prog"><span class="ld"></span> 主要銘柄をスクリーニング中… <span id="discProg" class="mono">${Screener.done}/${UNIVERSE.length}</span></div>`:'';
  const items=Screener.items;
  if(!items.length){ cards.innerHTML=Screener.loading?(discSkeletonCard()+discSkeletonCard()+discSkeletonCard()+discSkeletonCard()):`<div class="empty" style="grid-column:1/-1"><div class="ei">🛰️</div><h3>データを取得できませんでした</h3><p>「再スクリーニング」を押すか、回線状況をご確認ください。</p></div>`; return; }
  const pop=[...items].sort((a,b)=>b.pop-a.pop).slice(0,10);
  const val=[...items].sort((a,b)=>b.val-a.val).slice(0,10);
  const buyL=[...items].sort((a,b)=>b.buyTurn-a.buyTurn).slice(0,10);
  const sellL=[...items].sort((a,b)=>b.sellTurn-a.sellTurn).slice(0,10);
  cards.innerHTML=
    discCard('🔥','linear-gradient(135deg,#FF6B4A,#FF9F43)','今人気の銘柄10選','出来高の急増と価格モメンタムから、いま注目を集めている銘柄',pop,'pop','出来高倍率・直近の勢い・本日の強さが高いほど上位。') +
    discCard('💎','linear-gradient(135deg,#52D6E8,#7C8BFF)','コスパが良い銘柄10選','長期は上昇基調ながら足元は過熱しておらず、妙味のある水準',val,'val','長期トレンド×押し目×割高でない、を合成した独自スコア。') +
    discCard('🟢','linear-gradient(135deg,#2BD980,#26C6DA)','買い注文が多い銘柄10選','買いの売買代金（直近20日のマネーフロー）が大きい銘柄',buyL,'buy','緑=買い圧力 / 赤=売り圧力。金額は1日平均の買い売買代金。') +
    discCard('🔴','linear-gradient(135deg,#FF5C72,#FF9F43)','売り注文が多い銘柄10選','売りの売買代金（直近20日のマネーフロー）が大きい銘柄',sellL,'sell','緑=買い圧力 / 赤=売り圧力。金額は1日平均の売り売買代金。');
}
function discCard(icon,bg,title,sub,list,kind,foot){
  const rows=list.length?list.map((x,i)=>discRow(x,i,kind)).join(''):'<div style="color:var(--txt-3);font-size:12px;padding:14px 4px">データ取得中…</div>';
  return `<div class="card disc-card">
    <div class="disc-head"><div class="disc-ico" style="background:${bg}">${icon}</div><div class="disc-title">${title}</div></div>
    <div class="disc-sub">${sub}</div>
    <div class="disc-list">${rows}</div>
    <div class="disc-foot">${foot}</div>
  </div>`;
}
function discRow(x,i,kind){
  const rk=i+1, dpc=signCls(x.dayPct);
  let right,meta;
  if(kind==='pop'){
    right=`<div class="disc-score" style="color:${hotColor(x.pop)}">${x.pop}<small> 度</small></div><div class="disc-day mono ${dpc}">${arrow(x.dayPct)} ${fmtPct(x.dayPct)}</div>`;
    meta=`<span>出来高 ${x.volRatio.toFixed(1)}倍</span><span>20日 ${fmtPct(x.m20)}</span>`;
  }else if(kind==='val'){
    const vc=x.val>=58?'var(--cyan)':x.val>=43?'var(--gold)':'var(--txt-2)';
    right=`<div class="disc-score" style="color:${vc}">${x.val}<small> pt</small></div><div class="disc-day mono ${dpc}">${arrow(x.dayPct)} ${fmtPct(x.dayPct)}</div>`;
    meta=`<span>RSI ${x.rsi.toFixed(0)}</span><span>52週 ${x.pos52.toFixed(0)}%</span>`;
  }else{ // buy / sell
    const oku=((kind==='sell'?x.sellTurn:x.buyTurn)||0)/1e8;
    right=`<div class="disc-score" style="font-size:13px">${fmtNum(oku,0)}<small> 億/日</small></div><div class="disc-bar" title="買い ${x.buyPct.toFixed(0)}% ・ 売り ${(100-x.buyPct).toFixed(0)}%"><i style="width:${clamp(x.buyPct,0,100)}%"></i></div>`;
    meta=`<span style="color:${x.buyPct>=55?'var(--up)':x.buyPct<=45?'var(--down)':'var(--txt-3)'}">${x.buyPct>=55?'買い優勢':x.buyPct<=45?'売り優勢':'拮抗'}</span><span>売買代金 ${fmtNum(x.turnover/1e8,0)}億</span>`;
  }
  const nm=esc(x.name).replace(/'/g,"\\'");
  return `<div class="disc-row" onclick="openPreviewDetail('${x.code}','${nm}','${esc(x.sector||'')}')">
    <div class="disc-rk ${rk<=3?'top':''}">${rk}</div>
    <div class="disc-id"><div class="disc-nm">${esc(x.name)}</div><div class="disc-meta">${esc(x.code)}${x.sector?`<span class="sec-chip">${esc(x.sector)}</span>`:''}${meta}</div></div>
    <div class="disc-right">${right}</div>
  </div>`;
}
function quickAddSym(code,name,sector){
  openAdd();
  selectSym({symbol:code+'.T',name,ccy:'JPY',exch:'東証',sector:sector||'',industry:''});
}

/* ============================================================
   ウォッチリスト（購入を検討中の銘柄）
   追加日からの変動・買い時判断（MAGI）・予想株価を表示
   ============================================================ */
const WatchState={loading:false,at:0,done:0};
function updateWatchBadge(){ const e=$('#navWatch'); if(e)e.textContent=Store.watchlist.length; }
// 追加した時点を基準にした計算用のフィールドを整える（addPrice→buyPriceに対応付け）
function watchPrep(w){ w.shares=0; if(w.addPrice!=null)w.buyPrice=w.addPrice; if(w.addDate&&!w.buyDate)w.buyDate=w.addDate; }
// 追加日からの変動
function watchChange(w){
  if(!w._loaded||!w._q||w.addPrice==null)return null;
  const px=w._q.price, base=w.addPrice;
  const pct=base>0?(px-base)/base*100:null, diff=px-base;
  const days=w.addedAt?Math.max(0,Math.floor((Date.now()-w.addedAt)/86400000)):null;
  return {px,base,pct,diff,days};
}
// 予想株価（テクニカル推計）：直近の対数リターンのドリフト＋ボラティリティで1ヶ月後を推計
function forecast(w){
  if(!w._candles||w._candles.length<25)return null;
  const cl=w._candles.map(c=>c.close), n=cl.length, last=cl[n-1];
  const win=cl.slice(-60), rets=[];
  for(let i=1;i<win.length;i++)rets.push(Math.log(win[i]/win[i-1]));
  if(rets.length<5)return null;
  const mu=rets.reduce((a,b)=>a+b,0)/rets.length;
  const sd=Math.sqrt(rets.reduce((a,b)=>a+(b-mu)*(b-mu),0)/rets.length)||0.001;
  const H=21;                          // 約1ヶ月（営業日）
  const dampedMu=mu*0.5;               // 純粋外挿は過大評価しやすいため減衰
  const band=sd*Math.sqrt(H);
  const mid=last*Math.exp(dampedMu*H);
  const high=last*Math.exp(dampedMu*H+band);
  const low=last*Math.exp(dampedMu*H-band);
  const ma25=cl.slice(-25).reduce((a,b)=>a+b,0)/Math.min(25,n);
  const buyZone=Math.min(ma25,last*Math.exp(-band*0.6));   // 押し目の目安
  return {last,mid,high,low,buyZone,annVol:sd*Math.sqrt(252)*100,
    expPct:(mid-last)/last*100, highPct:(high-last)/last*100, lowPct:(low-last)/last*100};
}
// 買い時の一言アドバイス
function watchAdvice(w,m,t){
  if(!t)return {head:'判定待ち',detail:'データ取得後に表示します',col:'var(--txt-3)'};
  let head,col,detail;
  if(m && m.sum>=2){ head='買い検討の好機'; col='var(--up)'; detail='テクニカルは強気。打診買い〜の検討余地。'; }
  else if(m && m.sum===1){ head='押し目なら妙味'; col='var(--up)'; detail='地合い次第で買い寄り。深押しを狙うのも一案。'; }
  else if(m && m.sum<=-2){ head='今は見送り無難'; col='var(--down)'; detail='過熱／下落リスク。様子見が無難。'; }
  else if(m && m.sum===-1){ head='様子見寄り'; col='var(--gold)'; detail='強い買い材料は乏しい。押し目を待ちたい。'; }
  else { head='中立・待機'; col='var(--gold)'; detail='方向感に欠ける。買い場を待つ局面。'; }
  if(t.rsi<=32)detail='売られすぎ圏（RSI '+t.rsi.toFixed(0)+'）で反発を狙いやすい。';
  else if(t.rsi>=72)detail='買われすぎ圏（RSI '+t.rsi.toFixed(0)+'）。押し目を待ちたい。';
  else if(t.last>t.ma25&&t.ma25>t.ma75&&t.dev25<4)detail='上昇トレンド中の押し目水準で妙味あり。';
  return {head,col,detail};
}
async function loadWatchAll(force){
  const ws=Store.watchlist; if(!ws.length||WatchState.loading)return;
  if(!force && WatchState.at && Date.now()-WatchState.at<120000 && ws.every(w=>w._loaded))return;
  WatchState.loading=true; WatchState.done=0;
  if(UI.view==='watch')renderWatch();
  const queue=[...ws]; const CONC=4;
  async function worker(){ while(queue.length){ const it=queue.shift();
    try{ await loadHolding(it); if(it.addPrice==null&&it._q)it.addPrice=it._q.price; watchPrep(it); it._err=null; }
    catch(e){ it._err=e.message||'取得失敗'; }
    WatchState.done++;
    if(UI.view==='watch')renderWatch();
  } }
  await Promise.all(Array.from({length:CONC},worker));
  WatchState.loading=false; WatchState.at=Date.now(); save();
  if(UI.view==='watch')renderWatch();
}
async function saveWatch(){
  const code=/\.T$/.test(_sel.symbol)?_sel.symbol.replace('.T',''):_sel.symbol;
  if(Store.watchlist.some(x=>x.sym===_sel.symbol||x.code===code)){ toast('すでにウォッチリストにあります'); return; }
  const w={ id:uid(), sym:_sel.symbol, code, name:_sel.name, ccy:_sel.ccy, exch:_sel.exch,
    sector:_sel.sector||'', industry:_sel.industry||'', note:$('#inNote').value.trim(),
    addDate:new Date().toISOString().slice(0,10), addedAt:Date.now(), addPrice:null, shares:0, _loaded:false };
  Store.watchlist.push(w); save();
  closeAdd(); updateWatchBadge(); go('watch');
  try{ await loadHolding(w); w.addPrice=w._q?w._q.price:null; watchPrep(w); save(); renderWatch(); }
  catch(e){ w._err='取得失敗'; renderWatch(); }
  toast(`${w.name} をウォッチリストに追加しました`);
}
function removeWatch(id){
  const w=Store.watchlist.find(x=>x.id===id); if(!w)return;
  if(!confirm(`${w.name} をウォッチリストから削除しますか？`))return;
  Store.watchlist=Store.watchlist.filter(x=>x.id!==id); save(); updateWatchBadge();
  if(UI.view==='detail')go('watch'); else renderWatch();
  toast('削除しました');
}
function watchToHolding(id){
  const w=Store.watchlist.find(x=>x.id===id); if(!w)return;
  // 検索結果と同形に整えて追加モーダルを開く（株数・取得単価を入力して保有へ）
  openAdd('holding');
  selectSym({symbol:w.sym,name:w.name,ccy:w.ccy,exch:w.exch||w.ccy,sector:w.sector||'',industry:w.industry||''});
  if(w._q&&w._q.price)$('#inPrice').value=Math.round(w._q.price*100)/100;
  toast('株数を入力すると保有に追加できます');
}
/* ウォッチ編集（管理開始日の変更など） */
let _wEditId=null;
function openWatchEdit(id){
  const w=Store.watchlist.find(x=>x.id===id); if(!w)return; _wEditId=id;
  $('#wEditTitle').textContent=w.name;
  $('#wEdDate').value=w.addDate||''; $('#wEdPrice').value=w.addPrice||''; $('#wEdNote').value=w.note||'';
  $('#wEditOvl').classList.add('open');
}
function closeWatchEdit(){ $('#wEditOvl').classList.remove('open'); }
async function saveWatchEdit(){
  const w=Store.watchlist.find(x=>x.id===_wEditId); if(!w)return;
  const newDate=$('#wEdDate').value||''; const price=parseFloat($('#wEdPrice').value);
  const dateChanged=newDate&&newDate!==w.addDate;
  w.note=$('#wEdNote').value.trim();
  if(newDate){ w.addDate=newDate; w.addedAt=new Date(newDate+'T00:00:00').getTime(); }
  if(!isNaN(price)&&price>0){ w.addPrice=price; }
  else if(dateChanged){
    const btn=$('#wEdSave'); btn.textContent='取得中…'; btn.disabled=true;
    try{ w.addPrice=await yhCloseOnDate(w.sym,newDate); toast('開始日の終値を取得: '+fmtMoney(w.addPrice,w.ccy)); }
    catch(e){ toast('終値を取得できませんでした。基準価格を手動で入力してください。'); }
    btn.textContent='保存'; btn.disabled=false;
  }
  watchPrep(w); save(); closeWatchEdit();
  if(UI.view==='detail'&&UI.detailKind==='watch')renderWatchDetail(_wEditId); else renderWatch();
  toast('保存しました');
}

/* 発見・ランキングの銘柄プレビュー（未保有でも詳細・買い時・予想を表示） */
const Preview={item:null};
async function openPreviewDetail(code,name,sector){
  UI.range='1y'; UI.detailKind='preview'; UI.detailId=null; go('detail');
  $$('.nav-item').forEach(b=>b.classList.remove('active'));
  const sym=/\./.test(code)?code:code+'.T';
  Preview.item={ id:'preview', sym, code, name, ccy:'JPY', exch:'東証', sector:sector||'', shares:0, _loaded:false };
  renderPreviewDetail();
}
async function renderPreviewDetail(){
  const p=Preview.item; if(!p)return go('discover');
  const el=$('#v-detail');
  if(!p._loaded&&!p._err){
    el.innerHTML=`<div class="page-head" style="margin-bottom:14px"><button class="btn ghost sm" onclick="go('discover')">← 発見</button></div>
      <div class="dt-head"><div class="dt-logo" style="background:${holdColor(p)}">${logoHTML(p)}</div><div><div style="font-family:var(--display);font-size:22px;font-weight:600">${esc(p.name)}</div><div class="mono" style="color:var(--txt-3);font-size:12.5px">${esc(p.code)} · 読込中…</div></div></div>
      <div class="card"><div class="sec-loading"><span class="ld"></span> 株価データを取得中…</div></div>`;
    try{ await loadHolding(p); }catch(e){ p._err='取得失敗'; }
    if(UI.detailKind!=='preview'||Preview.item!==p)return;
  }
  const c=calc(p), t=tech(p), m=magi(p), adv=watchAdvice(p,m,t), stats=valuationStats(p);
  el.innerHTML=`
    <div class="page-head" style="margin-bottom:14px"><button class="btn ghost sm" onclick="go('discover')">← 発見・ランキング</button>
      <div class="ph-right"><button class="btn ghost sm" onclick="quickWatchSym('${p.code}','${esc(p.name).replace(/'/g,"\\'")}','${esc(p.sector||'')}')">⭐ ウォッチに追加</button><button class="btn primary sm" onclick="quickAddSym('${p.code}','${esc(p.name).replace(/'/g,"\\'")}','${esc(p.sector||'')}')">＋ 保有に追加</button></div></div>
    <div class="dt-head">
      <div class="dt-logo" style="background:${holdColor(p)}">${logoHTML(p)}</div>
      <div><div style="font-family:var(--display);font-size:22px;font-weight:600">${esc(p.name)}</div><div class="mono" style="color:var(--txt-3);font-size:12.5px">${esc(p.code)} · ${esc(p._q&&p._q.exch||p.ccy)}</div>${p.sector?`<div style="margin-top:5px"><span class="sec-chip">${esc(p.sector)}</span></div>`:''}</div>
      <div class="dt-price">${c?`<div class="px mono">${fmtMoney(c.px,p.ccy)}</div><div class="ch mono ${signCls(c.dayChg)}">${arrow(c.dayChg)} ${fmtMoney(Math.abs(c.dayChg),p.ccy)} (${fmtPct(c.dayPct)})</div>`:(p._err?'<div class="down">取得失敗</div>':'<div style="color:var(--txt-3)">読込中…</div>')}</div>
    </div>
    ${c?`<div class="grid kpis">
      <div class="card kpi"><div class="lbl">現在値</div><div class="val mono" style="font-size:20px">${fmtMoney(c.px,p.ccy)}</div><div class="chg mono ${signCls(c.dayChg)}">${arrow(c.dayChg)} ${fmtPct(c.dayPct)}（前日比）</div></div>
      <div class="card kpi"><div class="lbl">買い時の目安</div><div class="val mono" style="font-size:16px;color:${adv.col}">${adv.head}</div><div class="chg mono" style="color:var(--txt-3)">${esc(adv.detail)}</div></div>
      <div class="card kpi"><div class="lbl">RSI(14)</div><div class="val mono ${t&&t.rsi>=70?'down':t&&t.rsi<=30?'up':''}" style="font-size:20px">${t?t.rsi.toFixed(0):'—'}</div><div class="chg mono" style="color:var(--txt-3)">${t?(t.rsi>=70?'買われすぎ':t.rsi<=30?'売られすぎ':'中立'):''}</div></div>
      <div class="card kpi"><div class="lbl">52週レンジ位置</div><div class="val mono" style="font-size:20px">${t?t.pos52.toFixed(0)+'%':'—'}</div><div class="chg mono" style="color:var(--txt-3)">0%=安値 / 100%=高値</div></div>
    </div>`:''}
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:6px"><b style="font-family:var(--display);font-size:15px">株価チャート</b>
        <div class="rng-seg" id="rngSeg" style="margin-left:auto">${['5d','1mo','3mo','6mo','1y','2y','5y','max'].map(r=>`<button data-r="${r}" class="${UI.range===r?'on':''}">${({'5d':'1週','1mo':'1月','3mo':'3月','6mo':'6月','1y':'1年','2y':'2年','5y':'5年','max':'全'})[r]}</button>`).join('')}</div>
      </div>
      <div class="chart-box"><canvas id="detChart"></canvas><div id="crossV"></div><div id="crossH"></div><div id="crossDot"></div><div id="crossYLbl"></div><div id="crossXLbl"></div><div id="crossTip"></div></div>
    </div>
    ${forecastCardHTML(p)}
    ${magiHTML(p)}
    <div class="grid dash-2">
      <div class="card"><b style="font-family:var(--display);font-size:15px">企業・株価データ</b><div class="stat-grid" style="margin-top:12px">${stats}</div></div>
      <div class="card"><div style="display:flex;align-items:center;gap:8px"><b style="font-family:var(--display);font-size:15px">関連ニュース</b><span class="loadpill on" id="detNewsPill" style="font-size:10px"><span class="ld"></span>取得中</span></div><div id="detNews" style="margin-top:8px">${newsSkeleton(4)}</div></div>
    </div>`;
  if(c){ drawDetailChart(p); wireRange(p); loadDetailNews(p); }
}
function quickWatchSym(code,name,sector){
  openAdd('watch');
  selectSym({symbol:(/\./.test(code)?code:code+'.T'),name,ccy:'JPY',exch:'東証',sector:sector||'',industry:''});
}
function sparkSVG(candles,w,h){
  const data=(candles||[]).slice(-44).map(c=>c.close); if(data.length<2)return '';
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1, up=data[data.length-1]>=data[0];
  const pts=data.map((v,i)=>`${(i/(data.length-1)*w).toFixed(1)},${(h-((v-mn)/rng)*(h-3)-1.5).toFixed(1)}`).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block"><polyline points="${pts}" fill="none" stroke="${up?'var(--up)':'var(--down)'}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function fcBarHTML(f,ccy){
  const lo=Math.min(f.low,f.last), hi=Math.max(f.high,f.last), span=(hi-lo)||1;
  const pos=v=>clamp((v-lo)/span*100,0,100);
  return `<div class="fc-bar">
    <div class="fc-track"></div>
    <div class="fc-range" style="left:${pos(f.low)}%;right:${(100-pos(f.high)).toFixed(1)}%"></div>
    <div class="fc-mid" style="left:${pos(f.mid)}%"></div>
    <div class="fc-now" style="left:${pos(f.last)}%"></div>
  </div>
  <div class="fc-ends"><span class="down">弱気 ${fmtMoney(f.low,ccy)}</span><span style="color:var(--brand)">予想 ${fmtMoney(f.mid,ccy)} ${fmtPct(f.expPct)}</span><span class="up">強気 ${fmtMoney(f.high,ccy)}</span></div>`;
}
// 予想株価カード（保有・ウォッチ共通）
function forecastCardHTML(h){
  const f=forecast(h); if(!f)return '';
  return `<div class="card" style="margin-bottom:16px">
    <b style="font-family:var(--display);font-size:15px">📈 予想株価（1ヶ月後・テクニカル推計）</b>
    <div style="margin-top:14px">${fcBarHTML(f,h.ccy)}</div>
    <div class="stat-grid" style="margin-top:16px">
      <div class="stat-cell"><div class="k">予想中央値</div><div class="v">${fmtMoney(f.mid,h.ccy)}</div></div>
      <div class="stat-cell"><div class="k">強気シナリオ</div><div class="v up">${fmtMoney(f.high,h.ccy)} <span style="font-size:11px">${fmtPct(f.highPct)}</span></div></div>
      <div class="stat-cell"><div class="k">弱気シナリオ</div><div class="v down">${fmtMoney(f.low,h.ccy)} <span style="font-size:11px">${fmtPct(f.lowPct)}</span></div></div>
      <div class="stat-cell"><div class="k">押し目の目安</div><div class="v" style="color:var(--gold)">${fmtMoney(f.buyZone,h.ccy)}</div></div>
      <div class="stat-cell"><div class="k">想定変動率(年率)</div><div class="v">${f.annVol.toFixed(0)}%</div></div>
      <div class="stat-cell"><div class="k">予想レンジ幅</div><div class="v">${fmtPct(f.lowPct)} 〜 ${fmtPct(f.highPct)}</div></div>
    </div>
    <div style="font-size:10.5px;color:var(--txt-3);margin-top:12px;line-height:1.6">直近60日の値動き（リターンのドリフトとボラティリティ）から統計的に推計した参考レンジです。決算・材料・地合いで大きく変わり得ます。将来の株価を保証するものではありません。</div>
  </div>`;
}
function renderWatch(){
  const el=$('#v-watch');
  const ws=Store.watchlist;
  updateWatchBadge();
  if(!ws.length){
    el.innerHTML=`<div class="page-head"><h2>ウォッチリスト</h2><div class="sub">購入を検討中の銘柄</div>
      <div class="ph-right"><button class="btn primary sm" onclick="openAdd('watch')">＋ ウォッチ追加</button></div></div>
      ${marketStripHTML()}
      <div class="empty"><div class="ei">⭐</div><h3>ウォッチ銘柄がありません</h3><p>気になる銘柄を登録すると、追加した日からの変動・買い時の判断・予想株価レンジが表示され、購入の判断材料になります。「発見・ランキング」から探すのもおすすめです。</p><button class="btn primary" onclick="openAdd('watch')" style="margin-top:14px">＋ 銘柄をウォッチ</button></div>`;
    return;
  }
  // KPI集計
  let buySig=0, sumChg=0, chgN=0;
  ws.forEach(w=>{ const ch=watchChange(w); if(ch&&ch.pct!=null){ sumChg+=ch.pct; chgN++; }
    const m=w._loaded?magi(w):null; if(m&&m.sum>=1)buySig++; });
  const avgChg=chgN?sumChg/chgN:null;
  const loadingTail=WatchState.loading?`<span class="loadpill on" style="margin-left:8px"><span class="ld"></span>${WatchState.done}/${ws.length} 取得中…</span>`:'';
  el.innerHTML=`<div class="page-head"><h2>ウォッチリスト</h2><div class="sub">${ws.length}銘柄${loadingTail}</div>
      <div class="ph-right"><button class="btn ghost sm" onclick="loadWatchAll(true)">⟳ 更新</button><button class="btn primary sm" onclick="openAdd('watch')">＋ ウォッチ追加</button></div></div>
    ${marketStripHTML()}
    <div class="grid kpis watch-kpis">
      <div class="card kpi"><div class="lbl">ウォッチ銘柄</div><div class="val mono">${ws.length}</div><div class="chg mono" style="color:var(--txt-3)">購入検討リスト</div></div>
      <div class="card kpi"><div class="lbl">買い時シグナル</div><div class="val mono up">${buySig}</div><div class="chg mono" style="color:var(--txt-3)">/ ${ws.length}銘柄（MAGI買い寄り）</div></div>
      <div class="card kpi"><div class="lbl">平均 追加来変動</div><div class="val mono ${avgChg==null?'':signCls(avgChg)}">${avgChg==null?'—':fmtPct(avgChg)}</div><div class="chg mono" style="color:var(--txt-3)">登録時の株価との比較</div></div>
    </div>
    <div class="grid watch-grid">${ws.map(wcardHTML).join('')}</div>
    <div style="font-size:10.5px;color:var(--txt-3);margin-top:14px;line-height:1.7">※ 「買い時」はMAGIのテクニカル合議、「予想株価」は直近リターンとボラティリティからの統計的推計（参考）で、将来を保証するものではありません。投資判断はご自身の責任で。</div>`;
}
function wcardHTML(w){
  if(w._err && !w._loaded){
    return `<div class="card wcard"><div class="wc-top"><div class="wc-logo" style="background:${holdColor(w)}">${logoHTML(w)}</div><div class="wc-id"><div class="wc-nm">${esc(w.name)}</div><div class="wc-sub">${esc(w.code)} · <span class="down">取得失敗</span></div></div></div><div class="wc-actions"><button class="btn ghost sm" onclick="loadWatchAll(true)">再取得</button><button class="btn danger sm" onclick="removeWatch('${w.id}')">削除</button></div></div>`;
  }
  if(!w._loaded){
    return `<div class="card wcard"><div class="wc-top"><div class="wc-logo" style="background:${holdColor(w)}">${logoHTML(w)}</div><div class="wc-id"><div class="wc-nm">${esc(w.name)}</div><div class="wc-sub">${esc(w.code)} · <span class="skel" style="width:60px"></span></div></div></div><div class="wc-stats"><div class="wc-stat"><div class="k">読込中…</div><div class="v"><span class="skel"></span></div></div></div></div>`;
  }
  const c=calc(w), t=tech(w), m=magi(w), f=forecast(w), ch=watchChange(w);
  const adv=watchAdvice(w,m,t);
  const day=c?`<div class="d ${signCls(c.dayChg)}">${arrow(c.dayChg)} ${fmtPct(c.dayPct)}</div>`:'';
  const v=m?`<div class="wc-vbadge" style="color:${m.vc};border-color:${m.vc}66"><span class="vi">${m.vi}</span><span class="vt">${m.verdict}</span></div>`:'';
  const chgStat=ch&&ch.pct!=null
    ? `<div class="wc-stat"><div class="k">追加来変動${ch.days!=null?`（${ch.days}日）`:''}</div><div class="v ${signCls(ch.pct)}">${fmtPct(ch.pct)}</div></div>`
    : `<div class="wc-stat"><div class="k">追加来変動</div><div class="v" style="color:var(--txt-3)">—</div></div>`;
  const rsiStat=t?`<div class="wc-stat"><div class="k">RSI(14)</div><div class="v ${t.rsi>=70?'down':t.rsi<=30?'up':''}">${t.rsi.toFixed(0)}</div></div>`:'';
  const posStat=t?`<div class="wc-stat"><div class="k">52週レンジ位置</div><div class="v">${t.pos52.toFixed(0)}%</div></div>`:'';
  const fc=f?`<div class="wc-fc"><div class="wc-fc-h">📈 1ヶ月後の予想株価レンジ <span style="color:var(--txt-3)">（テクニカル推計）</span></div>${fcBarHTML(f,w.ccy)}<div style="font-size:10.5px;color:var(--txt-3);margin-top:4px">押し目の目安 ${fmtMoney(f.buyZone,w.ccy)} ・ 想定変動率(年率) ${f.annVol.toFixed(0)}%</div></div>`:'';
  return `<div class="card wcard">
    <div class="wc-top" onclick="openWatchDetail('${w.id}')">
      <div class="wc-logo" style="background:${holdColor(w)}">${logoHTML(w)}</div>
      <div class="wc-id"><div class="wc-nm">${esc(w.name)}</div>
        <div class="wc-sub">${esc(w.code)}${w.sector?`<span class="sec-chip">${esc(w.sector)}</span>`:''}<span style="width:60px;display:inline-block">${sparkSVG(w._candles,60,16)}</span></div></div>
      <div class="wc-px">${c?`<div class="p">${fmtMoney(c.px,w.ccy)}</div>`:''}${day}</div>
    </div>
    <div class="wc-verdict">${v}<div class="wc-vmeta"><b style="color:${adv.col}">買い時：${adv.head}</b><br>${esc(adv.detail)}${m?` <span style="color:var(--txt-3)">／ 強気度 ${m.bull}</span>`:''}</div></div>
    <div class="wc-stats">${chgStat}${rsiStat}${posStat}</div>
    ${fc}
    <div class="wc-actions">
      <button class="btn ghost" onclick="openWatchDetail('${w.id}')">詳細・予想</button>
      <button class="btn ghost" onclick="openWatchEdit('${w.id}')">編集</button>
      <button class="btn ghost" onclick="watchToHolding('${w.id}')">保有に</button>
      <button class="btn danger" onclick="removeWatch('${w.id}')">削除</button>
    </div>
  </div>`;
}
// ウォッチ銘柄の詳細（チャート＋買い時＋予想）— 保有の詳細ビューを流用
async function openWatchDetail(id){ UI.range='1y'; UI.detailKind='watch'; go('detail'); $$('.nav-item').forEach(b=>b.classList.remove('active')); renderWatchDetail(id); }
async function renderWatchDetail(id){
  const w=Store.watchlist.find(x=>x.id===id); if(!w)return go('watch');
  UI.detailId=id; watchPrep(w);
  const el=$('#v-detail');
  if(!w._loaded){ try{ await loadHolding(w); if(w.addPrice==null&&w._q)w.addPrice=w._q.price; watchPrep(w); save(); }catch(e){ w._err='取得失敗'; } }
  const c=calc(w), ch=watchChange(w), t=tech(w), m=magi(w), adv=watchAdvice(w,m,t);
  const stats=valuationStats(w);
  el.innerHTML=`
    <div class="page-head" style="margin-bottom:14px"><button class="btn ghost sm" onclick="go('watch')">← ウォッチリスト</button>
      <div class="ph-right"><button class="btn ghost sm" onclick="openWatchEdit('${w.id}')">編集（開始日）</button><button class="btn ghost sm" onclick="watchToHolding('${w.id}')">保有に追加</button><button class="btn danger sm" onclick="removeWatch('${w.id}')">削除</button></div></div>
    <div class="dt-head">
      <div class="dt-logo" style="background:${holdColor(w)}">${logoHTML(w)}</div>
      <div><div style="font-family:var(--display);font-size:22px;font-weight:600">${esc(w.name)}</div><div class="mono" style="color:var(--txt-3);font-size:12.5px">${esc(w.code)} · ${esc(w._q&&w._q.exch||w.ccy)}${w.note?' · '+esc(w.note):''}</div>${w.sector?`<div style="margin-top:5px"><span class="sec-chip">${esc(w.sector)}</span>${w.industry?`<span class="sec-chip">${esc(w.industry)}</span>`:''}</div>`:''}</div>
      <div class="dt-price">${c?`<div class="px mono">${fmtMoney(c.px,w.ccy)}</div><div class="ch mono ${signCls(c.dayChg)}">${arrow(c.dayChg)} ${fmtMoney(Math.abs(c.dayChg),w.ccy)} (${fmtPct(c.dayPct)})</div>`:(w._err?'<div class="down">取得失敗</div>':'<div style="color:var(--txt-3)">読込中…</div>')}</div>
    </div>
    <div class="grid kpis">
      <div class="card kpi"><div class="lbl">追加した日</div><div class="val mono" style="font-size:18px">${esc(w.addDate||'—')}</div><div class="chg mono" style="color:var(--txt-3)">${ch&&ch.days!=null?ch.days+'日前から監視':'登録時'}</div></div>
      <div class="card kpi"><div class="lbl">追加時の株価</div><div class="val mono" style="font-size:20px">${w.addPrice!=null?fmtMoney(w.addPrice,w.ccy):'—'}</div><div class="chg mono" style="color:var(--txt-3)">基準価格</div></div>
      <div class="card kpi"><div class="lbl">追加来の変動</div>${ch&&ch.pct!=null?`<div class="val mono ${signCls(ch.pct)}" style="font-size:20px">${ch.diff>=0?'+':'-'}${fmtMoney(Math.abs(ch.diff),w.ccy)}</div><div class="chg"><span class="tag-pill ${signCls(ch.pct)} mono">${arrow(ch.pct)} ${fmtPct(ch.pct)}</span></div>`:'<div class="val mono" style="font-size:18px;color:var(--txt-3)">—</div>'}</div>
      <div class="card kpi"><div class="lbl">買い時の目安</div><div class="val mono" style="font-size:16px;color:${adv.col}">${adv.head}</div><div class="chg mono" style="color:var(--txt-3)">${m?'強気度 '+m.bull:''}</div></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:6px"><b style="font-family:var(--display);font-size:15px">株価チャート</b>
        <div class="rng-seg" id="rngSeg" style="margin-left:auto">${['5d','1mo','3mo','6mo','1y','2y','5y','max'].map(r=>`<button data-r="${r}" class="${UI.range===r?'on':''}">${({'5d':'1週','1mo':'1月','3mo':'3月','6mo':'6月','1y':'1年','2y':'2年','5y':'5年','max':'全'})[r]}</button>`).join('')}</div>
      </div>
      <div class="chart-box"><canvas id="detChart"></canvas><div id="crossV"></div><div id="crossH"></div><div id="crossDot"></div><div id="crossYLbl"></div><div id="crossXLbl"></div><div id="crossTip"></div></div>
      <div style="font-size:11px;color:var(--txt-3);margin-top:6px">破線 = ウォッチ追加時の株価（${w.addPrice!=null?fmtMoney(w.addPrice,w.ccy):'—'}）。線より上＝監視開始から上昇。</div>
    </div>
    ${forecastCardHTML(w)}
    ${magiHTML(w)}
    <div class="grid dash-2">
      <div class="card"><b style="font-family:var(--display);font-size:15px">企業・株価データ</b><div class="stat-grid" style="margin-top:12px">${stats}</div></div>
      <div class="card"><div style="display:flex;align-items:center;gap:8px"><b style="font-family:var(--display);font-size:15px">関連ニュース</b><span class="loadpill on" id="detNewsPill" style="font-size:10px"><span class="ld"></span>取得中</span></div><div id="detNews" style="margin-top:8px">${newsSkeleton(4)}</div></div>
    </div>`;
  drawDetailChart(w);
  wireRange(w);
  loadDetailNews(w);
}

/* ---- News ---- */
let _newsTab='stocks', _newsCache={stocks:null,market:null};
function newsSkeleton(n){ let s=''; for(let i=0;i<(n||6);i++)s+=`<div class="news-row"><div class="nx"><h4><span class="skel" style="width:${60+Math.random()*30}%;height:15px"></span></h4><div class="meta" style="margin-top:7px"><span class="skel" style="width:90px"></span></div></div></div>`; return s; }
function renderNews(force){
  const el=$('#v-news');
  el.innerHTML=`<div class="page-head"><h2>ニュース</h2><div class="sub">日本語・キー不要（Bing／Google ニュース）</div>
    <div class="ph-right"><span class="loadpill" id="newsPill"></span><button class="btn ghost sm" onclick="renderNews(true)">⟳ 再取得</button></div></div>
    <div class="news-tabs">
      <button class="ntab ${_newsTab==='stocks'?'on':''}" onclick="switchNewsTab('stocks')">保有銘柄</button>
      <button class="ntab ${_newsTab==='market'?'on':''}" onclick="switchNewsTab('market')">市況・時事・政治</button>
    </div>
    <div class="card" id="newsCard"></div>`;
  showNewsTab(force);
}
function switchNewsTab(t){ if(_newsTab===t)return; _newsTab=t; renderNews(false); }
function showNewsTab(force){
  const card=$('#newsCard'); if(!card)return;
  const tab=_newsTab;
  if(tab==='stocks' && !Store.holdings.length){ card.innerHTML=`<div class="empty" style="padding:30px"><div class="ei">📰</div><h3>保有銘柄がありません</h3><p>銘柄を追加すると関連ニュースが表示されます。市況・時事タブは銘柄が無くても見られます。</p></div>`; return; }
  const cached=_newsCache[tab];
  if(cached&&!force){ paintNews(card,cached); return; }
  card.innerHTML=newsSkeleton(tab==='market'?7:6);
  const pill=$('#newsPill'); if(pill){ pill.classList.add('on'); pill.innerHTML='<span class="ld"></span><span id="newsCnt">取得中…</span>'; }
  (tab==='stocks'?loadStockNews():loadMarketNews()).then(items=>{
    _newsCache[tab]=items;
    if(UI.view==='news' && _newsTab===tab){ const c=$('#newsCard'); if(c)paintNews(c,items); }
    const p=$('#newsPill'); if(p)p.classList.remove('on');
  });
}
function paintNews(card,all){
  if(!all||!all.length){ card.innerHTML=`<div class="empty" style="padding:34px"><div class="ei">😶‍🌫️</div><h3>ニュースを取得できませんでした</h3><p>時間をおいて「再取得」を押してください。</p></div>`; return; }
  card.innerHTML=all.slice(0,26).map(n=>`<div class="news-row"><div class="nx"><h4><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.headline)}</a></h4><div class="meta">${n.tag?`<span class="chip">${esc(n.tag)}</span>`:''}${esc(n.source)} · ${relTime(n.datetime)}</div></div></div>`).join('');
}
function setNewsCnt(t){ const e=$('#newsCnt'); if(e)e.textContent=t; }
async function loadStockNews(){
  const list=Store.holdings.slice(0,8); let all=[]; let done=0;
  const queue=[...list];
  async function w(){ while(queue.length){ const h=queue.shift();
    try{ const items=await yhNews(h.name+' 株'); items.slice(0,3).forEach(it=>all.push({...it,tag:h.name})); }catch(e){}
    done++; setNewsCnt(done+'/'+list.length+' 取得中…');
  } }
  await Promise.all([w(),w(),w()]);
  // 重複見出し除外＋新しい順
  const seen=new Set(); all=all.filter(x=>{ if(seen.has(x.headline))return false; seen.add(x.headline); return true; });
  return all.sort((a,b)=>(b.datetime||0)-(a.datetime||0));
}
// 時事・政治・経済（株価への影響を考えるための市況ニュース）
const MARKET_QUERIES=[
  {q:'日経平均 株価 市場 見通し',tag:'市況'},
  {q:'日銀 金利 為替 円相場',tag:'金融政策'},
  {q:'日本 政治 経済 政策',tag:'政治'},
  {q:'米国株 NYダウ 利上げ',tag:'海外'},
  {q:'決算 業績 上方修正',tag:'企業'}
];
async function loadMarketNews(){
  let all=[]; let done=0;
  const queue=[...MARKET_QUERIES];
  async function w(){ while(queue.length){ const m=queue.shift();
    try{ const items=await yhNews(m.q); items.slice(0,4).forEach(it=>all.push({...it,tag:m.tag})); }catch(e){}
    done++; setNewsCnt(done+'/'+MARKET_QUERIES.length+' 取得中…');
  } }
  await Promise.all([w(),w(),w()]);
  const seen=new Set(); all=all.filter(x=>{ if(seen.has(x.headline))return false; seen.add(x.headline); return true; });
  return all.sort((a,b)=>(b.datetime||0)-(a.datetime||0));
}

/* ---- Detail ---- */
async function renderDetail(id){
  const h=Store.holdings.find(x=>x.id===id); if(!h)return go('holdings');
  UI.detailId=id;
  const el=$('#v-detail');
  const c=calc(h);
  const sym=h.sym||holdingSym(h);
  const stats=valuationStats(h);
  el.innerHTML=`
    <div class="page-head" style="margin-bottom:14px"><button class="btn ghost sm" onclick="go('holdings')">← 戻る</button><div class="ph-right"><button class="btn ghost sm" onclick="openEdit('${h.id}')">編集</button></div></div>
    <div class="dt-head">
      <div class="dt-logo">${logoHTML(h)}</div>
      <div><div style="font-family:var(--display);font-size:22px;font-weight:600">${esc(h.name)}</div><div class="mono" style="color:var(--txt-3);font-size:12.5px">${esc(h.code)} · ${esc(h._q&&h._q.exch||h.ccy)}${h.note?' · '+esc(h.note):''}</div>${h.sector?`<div style="margin-top:5px"><span class="sec-chip">${esc(h.sector)}</span>${h.industry?`<span class="sec-chip">${esc(h.industry)}</span>`:''}</div>`:''}</div>
      <div class="dt-price">${c?`<div class="px mono">${fmtMoney(c.px,h.ccy)}</div><div class="ch mono ${signCls(c.dayChg)}">${arrow(c.dayChg)} ${fmtMoney(Math.abs(c.dayChg),h.ccy)} (${fmtPct(c.dayPct)})</div>`:(h._err?'<div class="down">取得失敗</div>':'<div style="color:var(--txt-3)">読込中…</div>')}</div>
    </div>
    ${c?`<div class="grid kpis">
      <div class="card kpi"><div class="lbl">取得単価</div><div class="val mono" style="font-size:20px">${c.buy>0?fmtMoney(c.buy,h.ccy):'—'}</div><div class="chg mono" style="color:var(--txt-3)">${fmtNum(c.shares)}株 ${h.buyDate?'· '+h.buyDate:''}</div></div>
      <div class="card kpi"><div class="lbl">評価額</div><div class="val mono" style="font-size:20px">${fmtMoney(c.value,h.ccy)}</div><div class="chg mono" style="color:var(--txt-3)">取得額 ${c.cost>0?fmtMoney(c.cost,h.ccy):'—'}</div></div>
      <div class="card kpi"><div class="lbl">前日比（本日）</div><div class="val mono ${signCls(c.dayPL)}" style="font-size:20px">${c.dayPL>=0?'+':'-'}${fmtMoney(Math.abs(c.dayPL),h.ccy)}</div><div class="chg"><span class="tag-pill ${signCls(c.dayPL)} mono">${arrow(c.dayPct)} ${fmtPct(c.dayPct)}</span></div></div>
      <div class="card kpi"><div class="lbl">取得来 損益・伸び率</div>${c.plPct!=null?`<div class="val mono ${signCls(c.pl)}" style="font-size:20px">${c.pl>=0?'+':'-'}${fmtMoney(Math.abs(c.pl),h.ccy)}</div><div class="chg"><span class="tag-pill ${signCls(c.pl)} mono">${arrow(c.plPct)} ${fmtPct(c.plPct)}</span></div>`:'<div class="val mono" style="font-size:18px;color:var(--txt-3)">—</div><div class="chg" style="color:var(--txt-3);font-size:11px">取得単価が未設定です</div>'}</div>
    </div>`:''}
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:6px"><b style="font-family:var(--display);font-size:15px">株価チャート</b>
        <div class="rng-seg" id="rngSeg" style="margin-left:auto">${['5d','1mo','3mo','6mo','1y','2y','5y','max'].map(r=>`<button data-r="${r}" class="${UI.range===r?'on':''}">${({'5d':'1週','1mo':'1月','3mo':'3月','6mo':'6月','1y':'1年','2y':'2年','5y':'5年','max':'全'})[r]}</button>`).join('')}</div>
      </div>
      <div class="chart-box"><canvas id="detChart"></canvas><div id="crossV"></div><div id="crossH"></div><div id="crossDot"></div><div id="crossYLbl"></div><div id="crossXLbl"></div><div id="crossTip"></div></div>
      <div style="font-size:11px;color:var(--txt-3);margin-top:6px">破線 = 取得単価（${c?fmtMoney(c.buy,h.ccy):'—'}）。価格がこの線より上なら含み益です。</div>
    </div>
    ${forecastCardHTML(h)}
    ${magiHTML(h)}
    <div class="grid dash-2">
      <div class="card"><b style="font-family:var(--display);font-size:15px">企業・株価データ</b><div class="stat-grid" style="margin-top:12px">${stats}</div></div>
      <div class="card"><div style="display:flex;align-items:center;gap:8px"><b style="font-family:var(--display);font-size:15px">関連ニュース</b><span class="loadpill on" id="detNewsPill" style="font-size:10px"><span class="ld"></span>取得中</span></div><div id="detNews" style="margin-top:8px">${newsSkeleton(4)}</div></div>
    </div>`;
  drawDetailChart(h);
  wireRange(h);
  loadDetailNews(h);
}

function magiHTML(h){
  const m=magi(h); if(!m)return '';
  const sageCard=s=>{
    const vc=s.vote>0?'var(--up)':s.vote<0?'var(--down)':'var(--gold)';
    const vt=s.vote>0?'買い':s.vote<0?'売り':'中立';
    return `<div class="magi-sage">
      <div class="ms-head"><span class="ms-name">${s.name}</span><span class="ms-role">${s.role}</span><span class="ms-vote" style="color:${vc};border-color:${vc}55">${vt}</span></div>
      <ul class="ms-reasons">${s.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>
    </div>`;
  };
  const gcol=m.bull>=57?'var(--up)':m.bull<=42?'var(--down)':'var(--gold)';
  // コンセンサス・ゲージ（半円）
  // 針は上半円の左(強気度0)→上(50)→右(100)を指す。SVGはy下向きなのでsinを反転。
  const th=Math.PI*(1-clamp(m.bull,0,100)/100), gx=70+52*Math.cos(th), gy=70-52*Math.sin(th);
  const gauge=`<svg width="150" height="86" viewBox="0 0 140 80">
    <path d="M14 70 A56 56 0 0 1 126 70" fill="none" stroke="var(--ink-2)" stroke-width="11" stroke-linecap="round"/>
    <path d="M14 70 A56 56 0 0 1 126 70" fill="none" stroke="${gcol}" stroke-width="11" stroke-linecap="round" stroke-dasharray="${m.bull/100*176} 400"/>
    <line x1="70" y1="70" x2="${gx}" y2="${gy}" stroke="var(--txt)" stroke-width="2.5"/><circle cx="70" cy="70" r="4" fill="var(--txt)"/>
    <text x="70" y="44" text-anchor="middle" fill="${gcol}" font-size="20" font-weight="700" font-family="var(--mono)">${m.bull}</text>
    <text x="70" y="60" text-anchor="middle" fill="var(--txt-3)" font-size="9">強気度</text></svg>`;
  const sigChips=m.signals.map(s=>{const col=(+s.vote)>0?'var(--up)':(+s.vote)<0?'var(--down)':'var(--txt-3)';const ic=(+s.vote)>0?'▲':(+s.vote)<0?'▼':'•';return `<span class="sig-chip" style="border-color:${col}44"><b style="color:var(--txt-2)">${esc(s.label)}</b> <span style="color:${col}">${ic} ${esc(s.detail)}</span></span>`;}).join('');
  return `<div class="card magi-card" style="margin-bottom:16px">
    <div class="magi-top">
      <div class="magi-badge">MAGI</div>
      <div style="flex:1;min-width:160px"><b style="font-family:var(--display);font-size:15px">MAGI 売買判断システム</b><div style="font-size:11.5px;color:var(--txt-3)">取得価格・購入時期＋テクニカル＋市場地合いを、4つの賢者が合議で判断します</div></div>
      <div class="magi-verdict" style="color:${m.vc};border-color:${m.vc}66"><span class="mv-i">${m.vi}</span><span class="mv-t">${m.verdict}</span><span class="mv-c">一致度 ${m.conf}</span></div>
    </div>
    <div class="magi-consensus">
      <div class="mc-gauge">${gauge}</div>
      <div class="mc-info">
        <div class="mc-label" style="color:${gcol}">テクニカル・コンセンサス：${m.consensus}</div>
        <div class="mc-bars">
          <span class="mc-b up">買い ${m.buyN}</span><span class="mc-b neu">中立 ${m.neutN}</span><span class="mc-b dn">売り ${m.sellN}</span>
        </div>
        <div class="sig-chips">${sigChips}</div>
      </div>
    </div>
    <div class="magi-sages">${m.sages.map(sageCard).join('')}</div>
    <div class="magi-note">※ 多数のテクニカル指標（RSI・MACD・移動平均・ボリンジャー・出来高・乖離率）と市場地合い・あなたの取得状況から機械的に算出した<b>コンセンサス（参考）</b>です。証券会社のアナリスト評価とは異なり、特定銘柄の個別アナリスト目標株価は無料データでは提供されません。投資の最終判断はご自身で行ってください。</div>
  </div>`;
}

function valuationStats(h){
  if(!h._candles||!h._candles.length)return '<div class="stat-cell"><div class="k">データ</div><div class="v">読込中…</div></div>';
  const cl=h._candles.map(c=>c.close);
  const hi=Math.max(...cl), lo=Math.min(...cl), last=cl[cl.length-1];
  const ma=(n)=>{ const s=cl.slice(-n); return s.reduce((a,b)=>a+b,0)/s.length; };
  const ma25=ma(25), ma75=ma(Math.min(75,cl.length));
  const pos52=(last-lo)/(hi-lo||1)*100;
  // RSI(14)
  let g=0,l=0; for(let i=cl.length-14;i<cl.length;i++){ if(i<1)continue; const d=cl[i]-cl[i-1]; if(d>0)g+=d;else l-=d; } const rs=l===0?100:g/l; const rsi=100-100/(1+rs);
  const vol=h._candles[h._candles.length-1].volume;
  const cell=(k,v,cls)=>`<div class="stat-cell"><div class="k">${k}</div><div class="v ${cls||''}">${v}</div></div>`;
  return [
    cell('52週 高値',fmtMoney(hi,h.ccy)),
    cell('52週 安値',fmtMoney(lo,h.ccy)),
    cell('52週レンジ位置',pos52.toFixed(0)+'%'),
    cell('25日移動平均',fmtMoney(ma25,h.ccy)),
    cell('75日移動平均',fmtMoney(ma75,h.ccy)),
    cell('MA25乖離',fmtPct((last-ma25)/ma25*100),signCls(last-ma25)),
    cell('RSI(14)',rsi.toFixed(0),rsi>70?'down':rsi<30?'up':''),
    cell('出来高',fmtNum(vol))
  ].join('');
}

let MagiChart=null;
async function drawDetailChart(h){
  const cv=$('#detChart'); if(!cv)return;
  let candles=h._candles;
  if(UI.range!=='1y'){
    h._rc=h._rc||{};
    if(h._rc[UI.range])candles=h._rc[UI.range];
    else{
      try{ const sym=h.sym||holdingSym(h); const {candles:cs}=await yhChart(sym,UI.range); h._rc[UI.range]=cs; candles=cs; }
      catch(e){ candles=h._candles; }
    }
  }
  if(!candles||candles.length<2)return;
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  cv.width=W*dpr; cv.height=H*dpr; const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  const padL=58,padR=12,padT=12,padB=24, plotW=W-padL-padR, plotH=H-padT-padB;
  const cl=candles.map(c=>c.close);
  const buy=Number(h.buyPrice)||0;
  let mn=Math.min(...cl), mx=Math.max(...cl);
  if(buy>0){ mn=Math.min(mn,buy); mx=Math.max(mx,buy); }
  const pad=(mx-mn)*0.08||1; mn-=pad; mx+=pad; const rng=mx-mn||1;
  const X=i=>padL+i/(cl.length-1)*plotW;
  const Y=v=>padT+(1-(v-mn)/rng)*plotH;
  // grid
  ctx.strokeStyle=getC('--line-soft'); ctx.lineWidth=1; ctx.fillStyle=getC('--txt-3'); ctx.font='10px '+getC('--mono');
  for(let i=0;i<=4;i++){ const v=mn+rng*i/4, y=Y(v); ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke(); ctx.fillText(ccySym(h.ccy)+Math.round(v).toLocaleString(),6,y+3); }
  // area+line
  const up=cl[cl.length-1]>=cl[0]; const col=up?getC('--up'):getC('--down');
  ctx.beginPath(); cl.forEach((v,i)=>{const x=X(i),y=Y(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  const grad=ctx.createLinearGradient(0,padT,0,padT+plotH); grad.addColorStop(0,col+'33'); grad.addColorStop(1,col+'00');
  ctx.lineTo(X(cl.length-1),padT+plotH); ctx.lineTo(X(0),padT+plotH); ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
  ctx.beginPath(); cl.forEach((v,i)=>{const x=X(i),y=Y(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.strokeStyle=col; ctx.lineWidth=1.8; ctx.lineJoin='round'; ctx.stroke();
  // cost basis line
  if(buy>0){ const yb=Y(buy); ctx.save(); ctx.setLineDash([5,4]); ctx.strokeStyle=getC('--gold'); ctx.lineWidth=1.3; ctx.beginPath(); ctx.moveTo(padL,yb); ctx.lineTo(W-padR,yb); ctx.stroke(); ctx.restore();
    ctx.fillStyle=getC('--gold'); ctx.fillText('取得 '+ccySym(h.ccy)+Math.round(buy).toLocaleString(),padL+4,yb-4); }
  MagiChart={candles,padL,padR,padT,plotW,plotH,W,H,mn,rng,ccy:h.ccy,X,Y};
  setupCrosshair();
}
function setupCrosshair(){
  const cv=$('#detChart'),tip=$('#crossTip'),cV=$('#crossV'),cH=$('#crossH'),dot=$('#crossDot'),yl=$('#crossYLbl'),xl=$('#crossXLbl');
  if(!cv||!MagiChart)return;
  const show=on=>[tip,cV,cH,dot,yl,xl].forEach(e=>{if(e)e.style.display=on?'block':'none';});
  const move=e=>{
    const r=cv.getBoundingClientRect();
    const px=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
    const m=MagiChart; const frac=(px-m.padL)/m.plotW; if(frac<0||frac>1){show(false);return;}
    const i=Math.round(frac*(m.candles.length-1)); const c=m.candles[i]; if(!c)return;
    const x=m.X(i), y=m.Y(c.close);
    const d=new Date(c.t*1000);
    const intra=UI.range==='5d';
    const dlabel=intra ? d.toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : d.toLocaleDateString('ja-JP',{year:'2-digit',month:'numeric',day:'numeric'});
    show(true);
    // 十字線
    cV.style.left=x+'px'; cV.style.top=m.padT+'px'; cV.style.height=m.plotH+'px';
    cH.style.top=y+'px'; cH.style.left=m.padL+'px'; cH.style.width=m.plotW+'px';
    dot.style.left=x+'px'; dot.style.top=y+'px';
    // 軸ラベル（価格＝左、日付＝下）
    yl.textContent=fmtMoney(c.close,m.ccy); yl.style.top=y+'px';
    xl.textContent=dlabel; let xlx=x; xl.style.left=xlx+'px'; xl.style.top=(m.padT+m.plotH+3)+'px';
    // ツールチップ
    tip.innerHTML=`<div style="color:var(--txt-3);font-size:10px">${dlabel}</div><b style="font-size:13px">${fmtMoney(c.close,m.ccy)}</b><div style="color:var(--txt-3);margin-top:2px">高 ${fmtMoney(c.high,m.ccy)}<br>安 ${fmtMoney(c.low,m.ccy)}</div>`;
    let tx=x+14; if(tx>m.W-128)tx=x-128; if(tx<m.padL)tx=m.padL;
    tip.style.left=tx+'px'; tip.style.top=(m.padT+6)+'px';
  };
  cv.onpointermove=move; cv.ontouchmove=e=>{move(e);e.preventDefault();};
  cv.onpointerleave=()=>show(false); cv.ontouchend=()=>show(false);
  show(false);
}
function wireRange(h){
  const seg=$('#rngSeg'); if(!seg)return;
  seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{ UI.range=b.dataset.r; seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); drawDetailChart(h); });
}
async function loadDetailNews(h){
  const box=$('#detNews'); if(!box)return; const pill=$('#detNewsPill');
  try{ const items=await yhNews(h.name+' 株'); if(!items.length)throw 0;
    if($('#detNews')!==box && !document.body.contains(box))return;
    box.innerHTML=items.slice(0,7).map(n=>`<div class="news-row" style="padding:11px 0"><div class="nx"><h4 style="font-size:13px"><a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.headline)}</a></h4><div class="meta">${esc(n.source)} · ${relTime(n.datetime)}</div></div></div>`).join('');
  }catch(e){ box.innerHTML='<div style="color:var(--txt-3);font-size:13px;padding:10px 0">ニュースを取得できませんでした。時間をおいて再度開いてください。</div>'; }
  if(pill)pill.remove();
}

/* ---- Settings ---- */
function renderSettings(){
  const el=$('#v-settings');
  el.innerHTML=`<div class="page-head"><h2>設定</h2></div>
    <div class="card" style="margin-bottom:16px">
      <b style="font-family:var(--display);font-size:15px">データ</b>
      <p style="color:var(--txt-2);font-size:13px;margin:10px 0">株価・ニュースは Yahoo Finance（実データ）を CORSプロキシ経由で取得します（APIキー不要）。保有データはこのブラウザ内（localStorage）にのみ保存され、外部に送信されません。</p>
      <div style="display:flex;gap:9px;flex-wrap:wrap">
        <button class="btn ghost sm" onclick="refreshAll()">⟳ いま再取得</button>
        <button class="btn ghost sm" onclick="exportData()">⤓ バックアップ書き出し</button>
        <button class="btn ghost sm" onclick="$('#importFile').click()">⤒ 読み込み</button>
        <input type="file" id="importFile" accept="application/json" style="display:none" onchange="importData(this)">
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <b style="font-family:var(--display);font-size:15px">保有銘柄（${Store.holdings.length}）</b>
      <div style="margin-top:10px">${Store.holdings.map(h=>`<div class="lot-row"><div class="hlogo" style="width:30px;height:30px;font-size:12px">${logoHTML(h)}</div><div style="flex:1"><b>${esc(h.name)}</b> <span class="mono" style="color:var(--txt-3);font-size:11px">${esc(h.code)}</span></div><span class="mono" style="color:var(--txt-2)">${fmtNum(h.shares)}株</span><button class="btn ghost sm" onclick="openEdit('${h.id}')">編集</button></div>`).join('')||'<div style="color:var(--txt-3);font-size:13px">なし</div>'}</div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-family:var(--display);font-size:15px">リスト（証券会社・口座など）</b><span class="sub" style="color:var(--txt-3);font-size:12px">保有銘柄を口座ごとに分けて管理</span><button class="btn ghost sm" style="margin-left:auto" onclick="newListPrompt();renderSettings()">＋ 新しいリスト</button></div>
      <div style="margin-top:12px">${Store.lists.length?Store.lists.map(l=>`<div class="lot-row"><span style="flex:1"><b>${esc(l.name)}</b> <span class="mono" style="color:var(--txt-3);font-size:11px">${Store.holdings.filter(h=>h.listId===l.id).length}銘柄</span></span><button class="btn ghost sm" onclick="renameList('${l.id}')">名称変更</button><button class="btn danger sm" onclick="deleteList('${l.id}')">削除</button></div>`).join(''):'<div style="color:var(--txt-3);font-size:13px">まだリストがありません。「＋ 新しいリスト」で証券会社・口座などを作成できます。</div>'}</div>
    </div>
    <div class="card">
      <b style="font-family:var(--display);font-size:15px;color:var(--down)">危険な操作</b>
      <p style="color:var(--txt-2);font-size:13px;margin:10px 0">すべての保有・ウォッチデータを削除します。元に戻せません。</p>
      <button class="btn danger sm" onclick="if(confirm('すべてのデータ（保有・ウォッチ・リスト）を削除しますか？')){Store.holdings=[];Store.watchlist=[];Store.lists=[];save();renderAll();go('dashboard');toast('全データを削除しました');}">すべて削除</button>
    </div>`;
}
function renameList(id){ const l=Store.lists.find(x=>x.id===id); if(!l)return; const nm=prompt('リスト名を変更',l.name); if(nm&&nm.trim()){ l.name=nm.trim(); save(); renderSettings(); renderAll(); toast('変更しました'); } }
function deleteList(id){ const l=Store.lists.find(x=>x.id===id); if(!l)return; const n=Store.holdings.filter(h=>h.listId===id).length; if(!confirm(`リスト「${l.name}」を削除しますか？${n?`\n（${n}銘柄は「未分類」に移ります。銘柄自体は削除されません）`:''}`))return; Store.holdings.forEach(h=>{ if(h.listId===id)h.listId=''; }); Store.lists=Store.lists.filter(x=>x.id!==id); if(UI.listFilter===id)UI.listFilter='__all__'; save(); renderSettings(); renderAll(); toast('リストを削除しました'); }

function exportData(){
  const blob=new Blob([JSON.stringify({holdings:Store.holdings.map(h=>({code:h.code,name:h.name,ccy:h.ccy,shares:h.shares,buyPrice:h.buyPrice,buyDate:h.buyDate,note:h.note,sym:h.sym,color:h.color,sector:h.sector,industry:h.industry})),exported:new Date().toISOString()},null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='magiportfolio-backup.json'; a.click();
}
function importData(input){
  const f=input.files[0]; if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{ try{ const j=JSON.parse(rd.result); if(Array.isArray(j.holdings)){ j.holdings.forEach(x=>{ x.id=uid(); x._loaded=false; }); Store.holdings=j.holdings; ensureColors(); save(); toast('読み込みました'); refreshAll(); go('dashboard'); } }catch(e){ toast('読み込みに失敗しました'); } };
  rd.readAsText(f);
}

/* ============================================================
   ナビゲーション
   ============================================================ */
function go(view){
  UI.view=view;
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#v-'+view).classList.add('active');
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $$('#mobnav button').forEach(b=>b.classList.toggle('on',b.dataset.view===view));
  $('.main').scrollTop=0;
  if(view==='news')renderNews();
  if(view==='settings')renderSettings();
  if(view==='analytics')renderAnalytics();
  if(view==='discover')renderDiscover();
  if(view==='watch'){ renderWatch(); loadWatchAll(); }
}
function openDetail(id){ UI.range='1y'; UI.detailKind='holding'; go('detail'); $$('.nav-item').forEach(b=>b.classList.remove('active')); renderDetail(id); }

function updateMarketClock(){
  const now=new Date();
  // 日本市場（JST 9:00-15:30, 平日）
  const day=now.getDay(), h=now.getHours(), m=now.getMinutes(), t=h*60+m;
  const open=day>=1&&day<=5 && t>=540 && t<=930;
  $('#mktDot').classList.toggle('closed',!open);
  $('#mktTxt').textContent=(open?'東証 取引時間中':'東証 時間外')+' · '+now.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
}
setInterval(updateMarketClock,30000);

/* ============================================================
   追加モーダル
   ============================================================ */
let _sel=null, _searchT=0, _addMode='holding';
function openAdd(mode){
  _addMode=(mode==='watch')?'watch':'holding';
  _sel=null; $('#symSearch').value=''; $('#symBox').classList.remove('open'); $('#symBox').innerHTML=''; $('#selectedPane').style.display='none';
  $('#inShares').value=''; $('#inPrice').value=''; $('#inDate').value=''; $('#inNote').value=''; $('#addSave').disabled=true;
  const watch=_addMode==='watch';
  $('#addTitle').textContent=watch?'ウォッチリストに追加':'保有銘柄を追加';
  $('#addSave').textContent=watch?'ウォッチに追加':'追加する';
  $('#holdingFields').style.display=watch?'none':'block';
  $('#watchHint').style.display=watch?'block':'none';
  if(!watch){ const ls=$('#inList'); if(ls){ ls.innerHTML=listOptionsHTML(UI.listFilter&&UI.listFilter!=='__all__'&&UI.listFilter!=='__none__'?UI.listFilter:''); wireListSelect(ls); } }
  $('#addOvl').classList.add('open'); setTimeout(()=>$('#symSearch').focus(),60);
}
function closeAdd(){ $('#addOvl').classList.remove('open'); }
$('#addBtn').onclick=openAdd; $('#addClose').onclick=closeAdd; $('#addCancel').onclick=closeAdd;
$('#addOvl').addEventListener('mousedown',e=>{ if(e.target===$('#addOvl'))closeAdd(); });

$('#symSearch').addEventListener('input',e=>{
  const q=e.target.value.trim(); const box=$('#symBox');
  clearTimeout(_searchT);
  if(q.length<1){ box.classList.remove('open'); return; }
  _searchT=setTimeout(async()=>{
    box.classList.add('open'); box.innerHTML='<div class="sb-empty">検索中…</div>';
    try{
      let results=await yhSearch(q);
      // 数値4桁なら .T を優先表示
      results.sort((a,b)=>{ const ja=a.ccy==='JPY'?0:1, jb=b.ccy==='JPY'?0:1; return ja-jb; });
      if(!results.length){ box.innerHTML='<div class="sb-empty">該当する銘柄が見つかりません</div>'; return; }
      box.innerHTML=results.map((r,i)=>`<div class="sb-row" data-i="${i}"><span class="tk">${esc(r.symbol)}</span><span class="nm">${esc(r.name)}</span><span class="ex">${esc(r.exch)}</span></div>`).join('');
      box.querySelectorAll('.sb-row').forEach((row,i)=>row.onclick=()=>selectSym(results[i]));
    }catch(err){ box.innerHTML='<div class="sb-empty">検索に失敗しました。回線を確認してください。</div>'; }
  },300);
});
function selectSym(r){
  _sel=r; $('#symBox').classList.remove('open');
  $('#symSearch').value=r.name;
  $('#selTk').textContent=r.symbol; $('#selNm').textContent=r.name; $('#selEx').textContent=r.exch||r.ccy;
  $('#selectedPane').style.display='block';
  $('#addSave').disabled=false;
  setTimeout(()=>$((_addMode==='watch'?'#inNote':'#inShares')).focus(),50);
}
$('#addSave').onclick=async()=>{
  if(!_sel)return;
  if(_addMode==='watch'){ await saveWatch(); return; }
  let shares=parseFloat($('#inShares').value);
  if(isNaN(shares)||shares<=0) shares=100;   // 未入力は標準100株
  let buyPrice=parseFloat($('#inPrice').value);
  const buyDate=$('#inDate').value||'';
  const code=/\.T$/.test(_sel.symbol)?_sel.symbol.replace('.T',''):_sel.symbol;
  const listId=getModalListId();
  const h={ id:uid(), sym:_sel.symbol, code, name:_sel.name, ccy:_sel.ccy, exch:_sel.exch, sector:_sel.sector||'', industry:_sel.industry||'', shares, buyDate, listId, note:$('#inNote').value.trim(), addedAt:Date.now(), _loaded:false };
  // 取得単価の逆引き
  if((isNaN(buyPrice)||buyPrice<=0) && buyDate){
    $('#addSave').textContent='取得中…'; $('#addSave').disabled=true;
    try{ buyPrice=await yhCloseOnDate(_sel.symbol,buyDate); toast(`購入日の株価を取得: ${fmtMoney(buyPrice,_sel.ccy)}`); }
    catch(e){ toast('購入日の株価を取得できませんでした。単価は後で編集できます。'); }
    $('#addSave').textContent='追加する';
  }
  h.buyPrice=(!isNaN(buyPrice)&&buyPrice>0)?buyPrice:null;
  Store.holdings.push(h); ensureColors(); save();
  closeAdd(); $('#navCount').textContent=Store.holdings.length;
  go('dashboard'); renderAll();
  try{ await loadHolding(h); save(); renderAll(); }catch(e){ h._err='取得失敗'; renderAll(); }
  toast(`${h.name} を追加しました`);
};

/* ---- Edit modal ---- */
let _editId=null, _editColor=null;
function openEdit(id){
  const h=Store.holdings.find(x=>x.id===id); if(!h)return; _editId=id;
  $('#editTitle').textContent=h.name;
  $('#edShares').value=h.shares||''; $('#edPrice').value=h.buyPrice||''; $('#edDate').value=h.buyDate||''; $('#edNote').value=h.note||'';
  const ls=$('#edList'); if(ls){ ls.innerHTML=listOptionsHTML(h.listId||''); wireListSelect(ls); }
  _editColor=holdColor(h);
  const sw=$('#edSwatches');
  sw.innerHTML=PALETTE.map(c=>`<button data-c="${c}" style="background:${c}" class="${c===_editColor?'on':''}"></button>`).join('');
  sw.querySelectorAll('button').forEach(b=>b.onclick=()=>{ _editColor=b.dataset.c; sw.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); });
  $('#editOvl').classList.add('open');
}
function closeEdit(){ $('#editOvl').classList.remove('open'); }
$('#editClose').onclick=closeEdit; $('#edCancel').onclick=closeEdit;
$('#editOvl').addEventListener('mousedown',e=>{ if(e.target===$('#editOvl'))closeEdit(); });
$('#edSave').onclick=()=>{
  const h=Store.holdings.find(x=>x.id===_editId); if(!h)return;
  h.shares=parseFloat($('#edShares').value)||0;
  const p=parseFloat($('#edPrice').value); h.buyPrice=(!isNaN(p)&&p>0)?p:null;
  h.buyDate=$('#edDate').value||''; h.note=$('#edNote').value.trim();
  h.listId=getModalListId($('#edList'));
  if(_editColor)h.color=_editColor;
  save(); closeEdit(); renderAll();
  if(UI.view==='detail')renderDetail(_editId);
  toast('保存しました');
};
$('#edDelete').onclick=()=>{
  const h=Store.holdings.find(x=>x.id===_editId); if(!h)return;
  if(!confirm(`${h.name} を削除しますか？`))return;
  Store.holdings=Store.holdings.filter(x=>x.id!==_editId); save(); closeEdit();
  $('#navCount').textContent=Store.holdings.length; renderAll(); go('holdings');
  toast('削除しました');
};
async function edFetchDate(){ /* reserved */ }

/* watch edit modal wiring */
$('#wEditClose').onclick=closeWatchEdit; $('#wEdCancel').onclick=closeWatchEdit;
$('#wEditOvl').addEventListener('mousedown',e=>{ if(e.target===$('#wEditOvl'))closeWatchEdit(); });
$('#wEdSave').onclick=saveWatchEdit;
$('#wEdDelete').onclick=()=>{ const id=_wEditId; closeWatchEdit(); removeWatch(id); };

/* ---- wiring ---- */
$$('.nav-item').forEach(b=>b.onclick=()=>go(b.dataset.view));
$$('#mobnav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
$('#refreshBtn').onclick=()=>{ _newsCache={stocks:null,market:null}; Market.sectors=[]; refreshAll(); loadWatchAll(true); };
window.addEventListener('keydown',e=>{ if(e.key==='Escape'){closeAdd();closeEdit();closeWatchEdit();} });
window.addEventListener('resize',()=>{ if(UI.view==='detail'){ const h=(UI.detailKind==='preview')?Preview.item:(Store.holdings.find(x=>x.id===UI.detailId)||Store.watchlist.find(x=>x.id===UI.detailId)); if(h&&h._loaded)drawDetailChart(h);} drawSparks(); });

// expose
window.go=go; window.openAdd=openAdd; window.openDetail=openDetail; window.openEdit=openEdit;
window.refreshAll=refreshAll; window.renderNews=renderNews; window.exportData=exportData; window.importData=importData; window.switchNewsTab=switchNewsTab;
window.save=save; window.Store=Store; window.renderAll=renderAll; window.$=$;
window.loadScreener=loadScreener; window.paintDiscover=paintDiscover; window.quickAddSym=quickAddSym;
window.renderWatch=renderWatch; window.loadWatchAll=loadWatchAll; window.openWatchDetail=openWatchDetail;
window.removeWatch=removeWatch; window.watchToHolding=watchToHolding; window.openAdd=openAdd;
window.openWatchEdit=openWatchEdit; window.openPreviewDetail=openPreviewDetail; window.quickWatchSym=quickWatchSym;
window.setListFilter=setListFilter; window.newListPrompt=newListPrompt;
window.renameList=renameList; window.deleteList=deleteList; window.renderSettings=renderSettings;

/* ============================================================
   スプラッシュ（NGX × Magical Future → MagiPortfolio + ロードバー）
   ============================================================ */
function showSplash(onDone){
  const css=`
  #mp-splash{position:fixed;inset:0;z-index:99999;background:radial-gradient(1200px 600px at 82% -12%,rgba(124,139,255,.09),transparent 60%),radial-gradient(900px 520px at -6% 112%,rgba(43,217,128,.06),transparent 55%),#0A0D16;overflow:hidden;display:flex;align-items:center;justify-content:center;transition:opacity .55s ease}
  #mp-splash.out{opacity:0;pointer-events:none}
  #mp-splash .ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none}
  #mp-splash .intro{justify-content:space-between;gap:18px;padding:9vh 24px}
  #mp-splash .intro.in{opacity:1}
  #mp-splash .intro.out{opacity:0;transition:opacity .5s ease}
  #mp-splash .logo{width:min(620px,90vw);border-radius:22px;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:26px 34px}
  #mp-splash .logo img{max-width:100%;max-height:22vh;object-fit:contain;display:block}
  #mp-splash .ngx{background:#000}
  #mp-splash .mf{background:#fff}
  #mp-splash .intro.in .ngx{animation:mpUp .8s cubic-bezier(.2,.7,.3,1) both}
  #mp-splash .intro.in .mf{animation:mpDown .8s cubic-bezier(.2,.7,.3,1) .12s both}
  #mp-splash .amp{color:#586079;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:30px;opacity:.55}
  #mp-splash .main{gap:26px}
  #mp-splash .main.in{opacity:1;animation:mpIn .6s ease}
  #mp-splash .applogo img{width:min(320px,70vw);max-height:30vh;object-fit:contain;border-radius:26px;filter:drop-shadow(0 14px 50px rgba(124,139,255,.45))}
  #mp-splash .wm{font-family:'Space Grotesk',sans-serif;font-size:26px;font-weight:600;letter-spacing:.5px;color:#E8ECF6}
  #mp-splash .wm span{color:#7C8BFF}
  #mp-splash .bar{width:min(320px,70vw);height:8px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden}
  #mp-splash .bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#7C8BFF,#52D6E8)}
  #mp-splash .cap{color:#697188;font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.28em}
  #mp-splash .tx{font-family:'Space Grotesk',sans-serif;font-weight:800;letter-spacing:.12em}
  #mp-splash .tx.gold{color:#e9b13c;font-size:46px}
  #mp-splash .tx.mfx{font-size:34px;background:linear-gradient(90deg,#3a5bff,#e83e8c);-webkit-background-clip:text;background-clip:text;color:transparent}
  @keyframes mpUp{from{opacity:0;transform:translateY(-34px)}to{opacity:1;transform:none}}
  @keyframes mpDown{from{opacity:0;transform:translateY(34px)}to{opacity:1;transform:none}}
  @keyframes mpIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){#mp-splash *{animation:none!important}}`;
  const s=document.createElement('style'); s.textContent=css; document.head.appendChild(s);
  const el=document.createElement('div'); el.id='mp-splash';
  el.innerHTML=`
    <div class="ph intro" id="mpIntro">
      <div class="logo ngx"><img src="../brand/NGX.png" alt="NGX" onerror="this.outerHTML='<span class=&quot;tx gold&quot;>NGX</span>'"></div>
      <div class="amp">×</div>
      <div class="logo mf"><img src="../brand/MagicalFuture.png" alt="Magical Future" onerror="this.outerHTML='<span class=&quot;tx mfx&quot;>Magical Future</span>'"></div>
    </div>
    <div class="ph main" id="mpMain">
      <div class="applogo"><img src="../thumbs/MagiPortfolio.jpg" alt="MagiPortfolio" onerror="this.remove()"></div>
      <div class="wm">Magi<span>Portfolio</span></div>
      <div class="bar"><i id="mpFill"></i></div>
      <div class="cap">Loading your portfolio ...</div>
    </div>`;
  document.body.appendChild(el);
  const intro=el.querySelector('#mpIntro'), main=el.querySelector('#mpMain'), fill=el.querySelector('#mpFill');
  const P1_IN=120,P1_HOLD=1500,P1_OUT=550,P2_BAR=1800,P2_END=250;
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
  updateMarketClock();
  ensureColors();
  $('#navCount').textContent=Store.holdings.length;
  updateWatchBadge();
  renderAll();
  go('dashboard');
  loadIndices().then(()=>{ if(UI.view==='dashboard')renderDashboard(); });
  if(Store.holdings.length) refreshAll();
  if(Store.watchlist.length) loadWatchAll();
}
showSplash(boot);

/* Webフォント（本体実行後に読込・起動をブロックしない） */
(function(){var l=document.createElement('link');l.rel='stylesheet';
l.href='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
document.head.appendChild(l);})();

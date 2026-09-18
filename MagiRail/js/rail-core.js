/* ══════════════════════════════════════════════════════════════
   MagiRail — Railway Balance（2026-09-18 新作・ご指定）
   rail-core.js … 都市・需要・列車の運行シミュレーション・収支・満足度・成長・イベント・保存
   ──────────────────────────────────────────────────────────────
   ★ 画面には一切さわらない（rail-ui.js が window.RAIL を読むだけ）。
   ★ ゲームの芯は「人口 → 需要 → 列車 → 混雑 → 利益」。どの数字もほかの数字に効く:
       人口・施設 ─→ 駅ごとの需要（時間帯×目的）
       運賃・昨日の満足度 ─→ 鉄道を選ぶ割合（＝需要）
       本数×両数×車両 ─→ 輸送力 ─→ 積み残し・待ち時間・混雑・遅延
       混雑 ─→ 乗り降りが遅い ─→ 遅延 ─→ 定時性
       走らせた量 ─→ 運行費 ／ 乗った人 ─→ 運賃収入
       満足度・利用 ─→ 街の成長（ゆっくり）─→ 翌日の需要
   ★ 列車は<b>1本ずつ</b>走らせる。駅には時間とともに客がたまり、来た列車に空きがあるだけ乗り、
     乗れなかった人は<b>次の列車まで持ちこす</b>（＝積み残しが蓄積する）。
   ★ 車両は会社全体で1つのプール。走っている編成は終点で折り返しの時間が過ぎるまで使えない。
     足りなければその列車は<b>運休</b>＝時間帯ごとに車両を配りなおす「車両運用」が戦略になる。
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function mkRand(seed) {
    let s = seed >>> 0 || 1;
    return function () { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ══════════ ① 時間帯（9つ）══════════ */
  const BANDS = [
    { k: "early",  nm: "早朝",       s: 5,  e: 6 },
    { k: "morn",   nm: "朝",         s: 6,  e: 7 },
    { k: "rushA",  nm: "朝ラッシュ", s: 7,  e: 9 },
    { k: "forenn", nm: "昼前",       s: 9,  e: 12 },
    { k: "noon",   nm: "昼",         s: 12, e: 15 },
    { k: "aftn",   nm: "夕方前",     s: 15, e: 17 },
    { k: "rushP",  nm: "夕方ラッシュ", s: 17, e: 20 },
    { k: "night",  nm: "夜",         s: 20, e: 22 },
    { k: "late",   nm: "深夜",       s: 22, e: 24 },
  ];
  BANDS.forEach((b) => { b.h = b.e - b.s; b.lbl = b.s + ":00〜" + b.e + ":00"; });
  const DAY_START = 5 * 60, DAY_END = 24 * 60;
  function bandOf(t) { const h = Math.floor(t / 60); for (let i = 0; i < BANDS.length; i++) if (h < BANDS[i].e) return i; return BANDS.length - 1; }
  const FREQS = [0, 1, 2, 3, 4, 6, 8, 10, 12, 15, 20];
  const CARS = [1, 2, 3, 4, 6, 8, 10];

  /* ══════════ ② 車両（★ 足すときはここに1件書くだけ）══════════
     cap … 1両の定員（乗車率100%）／ crush … 乗れる上限（定員の何倍まで押しこめるか）
     speed … 最高速度 km/h ／ accLoss … 駅ごとの加減速で失う分 ／ comfort … 快適性（満足度）
     price … 1両の購入価格 ／ maint … 1両1日の維持費 ／ carKm … 1両1km の電力・摩耗費 */
  const VEHICLES = {
    commuter: { nm: "Magi Commuter", ja: "通勤形", cap: 150, crush: 1.45, speed: 85,  accLoss: 0.35, accel: "高",   comfort: 62, price: 12e6,  maint: 9000,  carKm: 240,
      d: "標準的な通勤車両。定員が多く加速が良い。購入・維持が安い。" },
    rapid:    { nm: "Magi Rapid",    ja: "快速形", cap: 130, crush: 1.3,  speed: 110, accLoss: 0.6,  accel: "中",   comfort: 78, price: 18e6,  maint: 13000, carKm: 290,
      d: "快速運転向け。最高速度が高く、長い路線ほど所要時間が短い＝同じ本数でも車両が少なくて済む。" },
    premium:  { nm: "Magi Premium",  ja: "上質形", cap: 90,  crush: 1.1,  speed: 95,  accLoss: 0.5,  accel: "普通", comfort: 95, price: 26e6,  maint: 19000, carKm: 360,
      d: "快適性重視。座席が広く満足度が上がるが、定員が少なく混雑に弱い。" },
  };
  const VKEYS = Object.keys(VEHICLES);

  /* ══════════ ③ 混雑の区分 ══════════ */
  const CROWD = [
    { max: 0.5, nm: "余裕",       ic: "○" },
    { max: 0.8, nm: "快適",       ic: "◎" },
    { max: 1.0, nm: "適正",       ic: "●" },
    { max: 1.2, nm: "混雑",       ic: "▲" },
    { max: 1.5, nm: "非常に混雑", ic: "▲▲" },
    { max: 99,  nm: "極端な混雑", ic: "✖" },
  ];
  function crowdOf(r) { for (let i = 0; i < CROWD.length; i++) if (r < CROWD[i].max) return Object.assign({ lv: i }, CROWD[i]); return Object.assign({ lv: 5 }, CROWD[5]); }

  /* ══════════ ④ 目的ごとの「時間帯の配分」（それぞれ合計1）══════════
     out … 家→目的地 ／ back … 目的地→家。1日の量をこの割合で9つの時間帯に配る。 */
  const PROF = {
    work:   { out: [0.03, 0.12, 0.55, 0.14, 0.03, 0.02, 0.05, 0.04, 0.02], back: [0, 0, 0.01, 0.03, 0.06, 0.1, 0.54, 0.18, 0.08] },
    school: { out: [0, 0.05, 0.78, 0.12, 0.03, 0, 0.01, 0.01, 0], back: [0, 0, 0, 0.04, 0.2, 0.5, 0.22, 0.03, 0.01] },
    shop:   { out: [0, 0.01, 0.04, 0.3, 0.32, 0.14, 0.14, 0.05, 0], back: [0, 0, 0.01, 0.1, 0.28, 0.2, 0.28, 0.11, 0.02] },
    tour:   { out: [0, 0.01, 0.06, 0.42, 0.3, 0.12, 0.07, 0.02, 0], back: [0, 0, 0, 0.04, 0.18, 0.3, 0.3, 0.15, 0.03] },
    event:  { out: [0, 0, 0, 0.05, 0.1, 0.35, 0.5, 0, 0], back: [0, 0, 0, 0, 0, 0.02, 0.18, 0.6, 0.2] },
  };

  /* ══════════ ⑤ 都市 ══════════ */
  const LINE_COL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948", "#2aa6c7", "#8a5a2b", "#6f7f94", "#b1308f"];
  const LINE_NM = ["Central", "East", "West", "North", "South", "Harbor", "Park", "Hill", "River", "Bay", "Sky", "Metro"];
  const CITIES = {
    small: {
      nm: "Small City", ja: "スモールシティ", pop: 80000, stars: 1, lines: 3, stations: 10, seed: 11,
      rail: 0.30, carShare: 0.52, growth: 0.0006, tourists: 2600, cash: 400e6, loanMax: 300e6, fare: 200, refFare: 200,
      plat: 6, cars0: 3, delayK: 0.5, eventRate: 0.18, fleet: { commuter: 40, rapid: 0, premium: 0 }, depot: 56, gk: 0.01, gcap: 0.007,
      d: "3路線・10駅の小さな街。まずは「需要と輸送力」の関係をつかむのに向いています。" },
    regional: {
      nm: "Regional City", ja: "リージョナルシティ", pop: 300000, stars: 2, lines: 4, stations: 18, seed: 23,
      rail: 0.31, carShare: 0.48, growth: 0.0005, tourists: 9000, cash: 1200e6, loanMax: 800e6, fare: 210, refFare: 210,
      plat: 8, cars0: 6, fmul: 1.5, delayK: 0.75, eventRate: 0.25, fleet: { commuter: 110, rapid: 36, premium: 0 }, depot: 170, gk: 0.007, gcap: 0.005,
      d: "4路線・18駅。大学やスタジアムがあり、平日の波と催しの波が重なります。" },
    large: {
      nm: "Large City", ja: "ラージシティ", pop: 800000, stars: 3, lines: 7, stations: 35, seed: 37,
      rail: 0.34, carShare: 0.4, growth: 0.0004, tourists: 26000, cash: 3500e6, loanMax: 2000e6, fare: 220, refFare: 220,
      plat: 10, cars0: 8, fmul: 1.5, delayK: 1.0, eventRate: 0.32, fleet: { commuter: 440, rapid: 64, premium: 16 }, depot: 560, gk: 0.005, gcap: 0.0035,
      d: "7路線・35駅。朝ラッシュの積み残しと遅延がはっきり効いてきます。" },
    mega: {
      nm: "Mega City", ja: "メガシティ", pop: 2000000, stars: 5, lines: 12, stations: 70, seed: 53,
      rail: 0.38, carShare: 0.3, growth: 0.0003, tourists: 70000, cash: 9000e6, loanMax: 5000e6, fare: 230, refFare: 230,
      plat: 10, cars0: 10, fmul: 2.5, delayK: 1.2, eventRate: 0.4, fleet: { commuter: 1300, rapid: 200, premium: 60 }, depot: 1640, gk: 0.004, gcap: 0.003,
      d: "12路線・70駅の巨大都市。車両の配りかたと遅延の連鎖が勝負を分けます。" },
  };

  /* ══════════ ⑥ シナリオ（勝利条件は複数を組み合わせる）══════════ */
  const SCENARIOS = [
    { id: "small",   city: "small",    nm: "Small City",        d: "人口10万人の街に育てる。",
      goals: [{ k: "pop", v: 100000 }, { k: "sat", v: 70 }, { k: "profitStreak", v: 3 }] },
    { id: "growing", city: "regional", nm: "Growing City",      d: "人口を増やしながら黒字経営を続ける。",
      goals: [{ k: "pop", v: 330000 }, { k: "profitStreak", v: 7 }] },
    { id: "rush",    city: "large",    nm: "Rush Hour",         d: "朝ラッシュの積み残しを抑えこむ。",
      goals: [{ k: "rushLeft", v: 0.01, days: 5 }, { k: "sat", v: 65 }] },
    { id: "profit",  city: "regional", nm: "Profit Challenge",  d: "30日以内に累計利益を積み上げる。",
      goals: [{ k: "cumProfit", v: 1e9, within: 30 }] },
    { id: "mega",    city: "mega",     nm: "Mega City",         d: "200万人の都市を運営し、220万人まで育てる。",
      goals: [{ k: "pop", v: 2200000 }, { k: "sat", v: 75 }, { k: "profitStreak", v: 7 }] },
  ];
  const GOAL_TX = {
    pop: (g) => (g.keep ? "人口 " : "人口 ") + fmtN(g.v) + " 人" + (g.keep ? " を維持" : " を達成"),
    sat: (g) => "乗客満足度 " + g.v + " 以上",
    profitStreak: (g) => g.v + " 日連続で黒字",
    rushLeft: (g) => "朝ラッシュの積み残し率 " + (g.v * 100).toFixed(0) + "% 以下を " + g.days + " 日連続",
    cumProfit: (g) => g.within + " 日以内に累計利益 " + fmtYen(g.v),
  };

  /* ══════════ ⑦ 街を組み立てる ══════════
     Small City だけは手で置いた10駅。ほかは seed から<b>毎回同じ形</b>に作る。 */
  const PREF = ["桜", "緑", "青葉", "若葉", "朝日", "白鳥", "星", "海浜", "山手", "梅", "松", "藤", "萩", "泉", "清水", "花", "月見", "光", "春日", "栄", "富士見", "桃", "金", "銀", "湖", "川", "森", "野", "鳩", "鷹", "柏", "楓", "椿", "菖蒲", "蛍", "虹", "雲", "風", "空", "瑞穂", "錦", "双葉", "稲", "芝", "紅葉", "若宮", "天神", "東雲", "千鳥", "宝"];
  const SUF = ["ヶ丘", "台", "町", "浜", "野", "原", "坂", "橋", "通", "本町", "が原", "ニュータウン", "公園", "谷", "宮", "山"];
  function smallCity() {
    const S = (nm, x, y, t) => Object.assign({ nm, x, y }, t);
    const st = [
      S("西ヶ丘", 120, 360, { res: 9, jobs: 1, com: 1, sch: 2 }),
      S("学園前", 280, 350, { res: 4, jobs: 2, com: 2, sch: 6, uni: 5 }),
      S("中央駅", 470, 340, { res: 3, jobs: 10, com: 10, sch: 1, hub: 1 }),
      S("市役所前", 640, 330, { res: 3, jobs: 7, com: 3 }),
      S("港町", 820, 400, { res: 4, jobs: 3, com: 5, tour: 6 }),
      S("東町", 600, 210, { res: 8, jobs: 1, com: 2, sch: 2 }),
      S("新都心", 720, 130, { res: 2, jobs: 8, com: 6 }),
      S("スタジアム前", 860, 70, { res: 3, jobs: 1, com: 1, venue: 1 }),
      S("緑ヶ丘", 400, 500, { res: 9, jobs: 1, com: 1, sch: 2 }),
      S("北ニュータウン", 310, 640, { res: 12, jobs: 1, com: 2, sch: 3 }),
    ];
    const lines = [
      { st: [0, 1, 2, 3, 4], km: [2.4, 2.8, 2.2, 3.0] },
      { st: [2, 5, 6, 7], km: [2.6, 2.4, 2.8] },
      { st: [2, 8, 9], km: [2.6, 2.9] },
    ];
    return { st, lines };
  }
  function genCity(def) {
    const R = mkRand(def.seed * 7919);
    const nL = def.lines, target = def.stations;
    const hubs = [{ x: 500, y: 350 }];
    if (nL > 4) hubs.push({ x: 330, y: 260 }, { x: 680, y: 450 });
    if (nL > 8) hubs.push({ x: 700, y: 220 }, { x: 300, y: 480 });
    const perLine = Math.max(3, Math.round((target - hubs.length) / nL) + 1);
    const used = {};
    const name = () => {
      for (let k = 0; k < 200; k++) {
        const n = PREF[Math.floor(R() * PREF.length)] + SUF[Math.floor(R() * SUF.length)];
        if (!used[n]) { used[n] = 1; return n; }
      }
      return "駅" + Object.keys(used).length;
    };
    const st = [];
    const hubIdx = hubs.map((h, i) => {
      const nm = i === 0 ? "中央駅" : ["新都心", "副都心", "北ターミナル", "南ターミナル"][i - 1];
      used[nm] = 1;
      st.push({ nm, x: h.x, y: h.y, res: 3, jobs: i === 0 ? 14 : 9, com: i === 0 ? 14 : 9, sch: 1, hub: 1 });
      return st.length - 1;
    });
    const lines = [];
    for (let k = 0; k < nL; k++) {
      const hi = k % hubs.length, h = hubs[hi];
      const a = (k / nL) * Math.PI + (R() - 0.5) * 0.35 + (hi ? 0.4 : 0);
      const dx = Math.cos(a), dy = Math.sin(a) * 0.72;
      const m = perLine + (R() < 0.3 ? 1 : 0);
      const before = Math.max(1, Math.floor((m - 1) * (0.35 + R() * 0.3)));
      const ids = [], km = [];
      const sp = 440 / Math.max(3, m - 1) + 20;
      for (let p = 0; p < m; p++) {
        const off = p - before;
        if (off === 0) { ids.push(hubIdx[hi]); continue; }
        let x = h.x + dx * off * sp, y = h.y + dy * off * sp;
        x = clamp(x + (R() - 0.5) * 24, 40, 960); y = clamp(y + (R() - 0.5) * 24, 40, 660);
        const d = Math.hypot(x - 500, y - 350);
        const outer = d > 260, term = p === 0 || p === m - 1;
        const s = { nm: name(), x, y, res: outer ? 7 + R() * 6 : 3 + R() * 4, jobs: d < 160 ? 5 + R() * 5 : 0.6 + R() * 1.6,
                    com: d < 160 ? 4 + R() * 5 : 0.8 + R() * 2, sch: R() < 0.55 ? 1 + R() * 2 : 0 };
        if (term && outer) { s.res += 5; s.nm = s.nm.replace(/(ヶ丘|台|町|浜|野|原|坂|橋|通|本町|が原|公園|谷|宮|山)$/, "") + "ニュータウン"; if (used[s.nm]) s.nm += "東"; used[s.nm] = 1; }
        st.push(s);
        ids.push(st.length - 1);
      }
      for (let p = 0; p < m - 1; p++) {
        const A = st[ids[p]], B = st[ids[p + 1]];
        km.push(Math.round(clamp(Math.hypot(A.x - B.x, A.y - B.y) / 42, 1.2, 4.2) * 10) / 10);
      }
      lines.push({ st: ids, km });
    }
    /* 特別な施設：大学・観光地・スタジアム */
    const plain = st.map((s, i) => i).filter((i) => !st[i].hub);
    const pick = () => plain.splice(Math.floor(R() * plain.length), 1)[0];
    const nU = Math.max(1, Math.round(target / 12)), nT = Math.max(1, Math.round(target / 10)), nV = Math.max(1, Math.round(target / 22));
    for (let i = 0; i < nU && plain.length; i++) { const s = st[pick()]; s.uni = 5 + R() * 3; s.sch += 3; s.nm = s.nm.replace(/(ヶ丘|台|町|浜|野|原|坂|橋|通|本町|が原|公園|谷|宮|山|ニュータウン)$/, "") + "大学前"; }
    for (let i = 0; i < nT && plain.length; i++) { const s = st[pick()]; s.tour = 4 + R() * 4; s.com += 2; }
    for (let i = 0; i < nV && plain.length; i++) { const s = st[pick()]; s.venue = 1; s.nm = s.nm.replace(/(ヶ丘|台|町|浜|野|原|坂|橋|通|本町|が原|公園|谷|宮|山|ニュータウン)$/, "") + (i ? "アリーナ前" : "スタジアム前"); }
    return { st, lines };
  }
  function buildCity(cityId) {
    const def = CITIES[cityId];
    const raw = cityId === "small" ? smallCity() : genCity(def);
    const stations = raw.st.map((s, i) => ({
      id: i, nm: s.nm, x: s.x, y: s.y, lines: [],
      res: s.res || 1, jobs: s.jobs || 0.5, com: s.com || 0.5, sch: s.sch || 0, uni: s.uni || 0, tour: s.tour || 0, venue: s.venue || 0, hub: s.hub || 0,
      plat: s.hub ? Math.min(10, def.plat + 2) : def.plat, fac: 0, dev: 1,
    }));
    const lines = raw.lines.map((L, k) => {
      L.st.forEach((sid) => { if (stations[sid].lines.indexOf(k) < 0) stations[sid].lines.push(k); });
      return { id: k, nm: LINE_NM[k] + " Line", col: LINE_COL[k % LINE_COL.length], st: L.st.slice(), km: L.km.slice() };
    });
    return { stations, lines };
  }

  /* ══════════ ⑧ 新しいゲーム ══════════ */
  const TEMPLATE_F = [2, 3, 4, 4, 4, 4, 4, 3, 2];
  function nearF(x) { let b = FREQS[1]; FREQS.forEach((f) => { if (f && Math.abs(f - x) < Math.abs(b - x)) b = f; }); return b; }
  function newGame(scenarioId) {
    const sc = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];
    const def = CITIES[sc.city];
    const { stations, lines } = buildCity(sc.city);
    const G = {
      v: 1, scenario: sc.id, cityId: sc.city, day: 1, seed: (Date.now() & 0x7fffffff) >>> 0,
      cash: def.cash, loan: 0, fare: def.fare, crisis: 0, over: false, cleared: false, clearedDay: 0,
      city: { pop: def.pop, pop0: def.pop, rail: def.rail, tourists: def.tourists, growthBase: def.growth, commerce: 1, office: 1 },
      stations, lines,
      plan: lines.map(() => BANDS.map((b, i) => ({ f: nearF(TEMPLATE_F[i] * (def.fmul || 1)), c: def.cars0 > 6 && (i === 0 || i === 8) ? def.cars0 - 2 : def.cars0, v: "commuter" }))),
      fleet: Object.assign({}, def.fleet), depot: def.depot,
      lineSat: lines.map(() => 70), satAll: 70,
      events: [], hist: [], report: null, streak: 0, rushStreak: 0, cum: 0, speed: 1,
    };
    /* 長い路線は快速形を1本入れておく（最初から3種類の違いが見えるように） */
    if (def.fleet.rapid > 0) { const L = G.lines.reduce((a, l, i) => (l.km.reduce((x, y) => x + y, 0) > G.lines[a].km.reduce((x, y) => x + y, 0) ? i : a), 0); G.plan[L].forEach((p) => { p.v = "rapid"; p.c = Math.min(p.c, 6); }); }
    scheduleEvents(G, true);
    return G;
  }

  /* ══════════ ⑨ 需要 ══════════
     1日の「目的ごとの移動」を駅と駅のあいだに配り（OD）、時間帯の配分で割って「1時間あたり」にする。
     ★ 乗り換えは扱わない（駅の発生量をその駅を通る路線に等分し、行き先は同じ路線の駅から選ぶ）。 */
  function stationPop(G) {
    const S = G.stations; let tr = 0, tj = 0;
    S.forEach((s) => { tr += s.res * s.dev; tj += s.jobs * s.dev * G.city.office; });
    return S.map((s) => ({ res: G.city.pop * (s.res * s.dev) / tr, jobs: G.city.pop * 0.62 * (s.jobs * s.dev * G.city.office) / tj }));
  }
  function railShare(G, li) {
    const def = CITIES[G.cityId];
    const fareF = Math.pow(def.refFare / Math.max(60, G.fare), 0.45);
    const satF = 0.72 + 0.56 * clamp(G.lineSat[li], 0, 100) / 100;
    return clamp(G.city.rail * fareF * satF, 0.02, 0.8);
  }
  function eventMods(G, day) {
    const m = { st: {}, extra: [], broken: {}, cap: {}, tour: 1 };
    G.events.forEach((e) => {
      if (day < e.day || day >= e.day + e.days) return;
      if (e.k === "concert") m.extra.push({ st: e.st, n: e.n, p: "event" });
      if (e.k === "festival") m.st[e.st] = Object.assign(m.st[e.st] || {}, { schoolX: 2.2 });
      if (e.k === "tourism") m.tour *= 1.6;
      if (e.k === "breakdown") m.broken[e.v] = (m.broken[e.v] || 0) + e.n;
      if (e.k === "construction") m.cap[e.line] = Math.min(m.cap[e.line] || 99, e.fmax);
    });
    return m;
  }
  /* OD[b][dir][p] = { r: 1分あたりに駅 p に来る人, d: 行き先の割合（位置の配列）} ／ dem[b] = 片方向のいちばん混む区間の人/h */
  function buildDemand(G, day) {
    const SP = stationPop(G), EM = eventMods(G, day);
    const out = [];
    G.lines.forEach((L, li) => {
      const n = L.st.length, s = railShare(G, li);
      const od = []; for (let b = 0; b < BANDS.length; b++) { od.push([]); for (let i = 0; i < n; i++) { od[b].push(new Array(n).fill(0)); } }
      const add = (prof, daily, wO, wD) => {
        /* daily … この路線に割りあてた1日の量。wO/wD … 起点・終点の重み（位置ごと） */
        let sO = 0; wO.forEach((x) => { sO += x; }); if (sO <= 0) return;
        for (let i = 0; i < n; i++) {
          if (!wO[i]) continue;
          let sD = 0; const w = [];
          for (let j = 0; j < n; j++) { const d = Math.abs(i - j); const x = d ? wD[j] * Math.min(1, d / 1.6) * Math.exp(-d / 9) : 0; w.push(x); sD += x; }
          if (sD <= 0) continue;
          const tot = daily * wO[i] / sO;
          for (let j = 0; j < n; j++) {
            if (!w[j]) continue;
            const v = tot * w[j] / sD;
            for (let b = 0; b < BANDS.length; b++) {
              od[b][i][j] += v * prof.out[b] / BANDS[b].h;
              od[b][j][i] += v * prof.back[b] / BANDS[b].h;
            }
          }
        }
      };
      const share = (sid) => 1 / G.stations[sid].lines.length;
      const res = L.st.map((sid) => SP[sid].res * share(sid));
      const jobs = L.st.map((sid) => SP[sid].jobs * share(sid));
      const sch = L.st.map((sid) => { const S0 = G.stations[sid]; return (S0.sch + S0.uni * 2) * ((EM.st[sid] && EM.st[sid].schoolX) || 1); });
      const com = L.st.map((sid) => G.stations[sid].com * G.stations[sid].dev * G.city.commerce);
      const tour = L.st.map((sid) => G.stations[sid].tour);
      const totRes = res.reduce((a, b) => a + b, 0), totJobs = jobs.reduce((a, b) => a + b, 0);
      /* 通勤（家→職場）: 住んでいる人と働く場所の少ないほうに合わせる */
      add(PROF.work, Math.min(totRes * 0.46, totJobs * 0.8) * 0.9 * s * DEM_K, res, jobs);
      add(PROF.school, totRes * 0.13 * s * 1.25 * DEM_K, res, sch);
      add(PROF.shop, totRes * 0.12 * s * DEM_K, res, com);
      const tourTot = G.city.tourists * EM.tour * 0.45 * (tour.some((x) => x > 0) ? 1 : 0) * tour.reduce((a, b) => a + b, 0) / Math.max(1, G.stations.reduce((a, x) => a + x.tour, 0));
      add(PROF.tour, tourTot, com.map((c, i) => c + res[i] / 4000), tour);
      EM.extra.forEach((e) => {
        const p = L.st.indexOf(e.st); if (p < 0) return;
        const wD = L.st.map((sid, i) => (i === p ? 1 : 0));
        add(PROF.event, e.n * share(e.st), res.map((r, i) => r + com[i] * 800), wD);
      });
      /* 1分あたりの到着と行き先の割合（方向ごと）、いちばん混む区間の人/h */
      const bands = [], dem = [], rid = [];
      for (let b = 0; b < BANDS.length; b++) {
        const dirs = [[], []];
        let peak = 0, riders = 0;
        for (let dir = 0; dir < 2; dir++) {
          for (let i = 0; i < n; i++) {
            let r = 0; const d = new Array(n).fill(0);
            for (let j = 0; j < n; j++) { if (dir === 0 ? j > i : j < i) { r += od[b][i][j]; d[j] = od[b][i][j]; } }
            if (r > 0) for (let j = 0; j < n; j++) d[j] /= r;
            dirs[dir].push({ r: r / 60, d });
            riders += r;
          }
          /* 区間 i→i+1（上り）／ i+1→i（下り）を通る人/h */
          for (let k = 0; k < n - 1; k++) {
            let f = 0;
            for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) {
              if (dir === 0 && a <= k && c > k) f += od[b][a][c];
              if (dir === 1 && a > k && c <= k) f += od[b][a][c];
            }
            if (f > peak) peak = f;
          }
        }
        bands.push(dirs); dem.push(peak); rid.push(riders);
      }
      out.push({ bands, dem, riders: rid });
    });
    return { lines: out, mods: EM };
  }

  /* ══════════ ⑩ 1日の運行 ══════════ */
  function lineMaxCars(G, li) { return G.lines[li].st.reduce((m, sid) => Math.min(m, G.stations[sid].plat), 99); }
  function runMin(G, li, k, vk) { const V = VEHICLES[vk]; return G.lines[li].km[k] / V.speed * 60 + V.accLoss; }
  function cycleMin(G, li, vk) { let t = 0; G.lines[li].km.forEach((x, k) => { t += runMin(G, li, k, vk) + 0.5; }); return t + 6; }
  const CREW_KM = 900;      /* 乗務員・信号・運行管理（1列車1km）*/
  const DEM_K = 1.8;        /* 需要の全体の大きさ（調整用） */
  function newStats() {
    return { board: 0, left: 0, waitArea: 0, waitN: 0, loadMax: 0, loadSum: 0, loadN: 0, pkm: 0, ckm: 0, trains: 0, cancel: 0, delay: 0, delayMax: 0,
             rev: 0, cost: 0, comfortSum: 0, crowdPen: 0, lost: 0 };
  }
  function startDay(G) {
    const D = buildDemand(G, G.day);
    const def = CITIES[G.cityId];
    const R = {
      t: DAY_START, clock: DAY_START, done: false, D, mods: D.mods,
      q: G.lines.map((L) => [L.st.map(() => 0), L.st.map(() => 0)]),
      qT: G.lines.map((L) => [L.st.map(() => DAY_START), L.st.map(() => DAY_START)]),
      qLeft: G.lines.map((L) => [L.st.map(() => 0), L.st.map(() => 0)]),
      next: G.lines.map(() => [DAY_START, DAY_START + 3]),
      trains: [], release: [], inUse: { commuter: 0, rapid: 0, premium: 0 },
      S: G.lines.map(() => BANDS.map(() => newStats())),
      stS: G.stations.map(() => BANDS.map(() => ({ board: 0, left: 0, waitArea: 0, waitN: 0, qMax: 0 }))),
      hourRiders: new Array(24).fill(0),
      useBand: BANDS.map(() => ({ commuter: 0, rapid: 0, premium: 0 })),
      opCost: 0, rev: 0, delayK: def.delayK, seq: 0,
    };
    G.run = R;
    return R;
  }
  /* 駅の待ち客を t まで進める（時間帯をまたぐときは区切って積分）。待ち時間の面積も足す。 */
  function flow(G, R, li, dir, p, t) {
    let t0 = R.qT[li][dir][p];
    if (t <= t0) return;
    let q = R.q[li][dir][p];
    const sid = G.lines[li].st[p];
    while (t0 < t) {
      const b = bandOf(t0);
      const bEnd = Math.min(t, BANDS[b].e * 60);
      const dt = Math.max(0, bEnd - t0);
      const r = R.D.lines[li].bands[b][dir][p].r;
      const area = q * dt + r * dt * dt / 2;
      R.S[li][b].waitArea += area; R.stS[sid][b].waitArea += area;
      q += r * dt;
      t0 = bEnd > t0 ? bEnd : t;
    }
    R.q[li][dir][p] = q; R.qT[li][dir][p] = t;
  }
  function dispatch(G, R, li, dir, t) {
    const b = bandOf(t);
    const P = G.plan[li][b];
    let f = P.f;
    if (R.mods.cap[li] != null) f = Math.min(f, R.mods.cap[li]);
    if (!f) { R.next[li][dir] = BANDS[b].e * 60 + dir * 2; return; }
    R.next[li][dir] = t + 60 / f;
    const cars = Math.min(P.c, lineMaxCars(G, li));
    const vk = P.v;
    const avail = (G.fleet[vk] || 0) - (R.mods.broken[vk] || 0) - R.inUse[vk];
    if (avail < cars) { R.S[li][b].cancel++; return; }
    R.inUse[vk] += cars;
    const n = G.lines[li].st.length;
    const V = VEHICLES[vk];
    R.trains.push({ id: ++R.seq, li, dir, cars, vk, cap: cars * V.cap, maxL: cars * V.cap * V.crush, onb: new Array(n).fill(0), tot: 0,
                    p: dir === 0 ? 0 : n - 1, at: t, delay: 0, b, maxLoad: 0, loadS: 0, loadN: 0, t0: t, km: 0 });
    R.S[li][b].trains++;
  }
  function arrive(G, R, T) {
    const L = G.lines[T.li], n = L.st.length, p = T.p, sid = L.st[p];
    const b = bandOf(Math.min(T.at, DAY_END - 1));
    const S = R.S[T.li][b], V = VEHICLES[T.vk];
    const alight = T.onb[p]; T.onb[p] = 0; T.tot -= alight;
    const last = T.dir === 0 ? p === n - 1 : p === 0;
    let board = 0;
    if (!last && T.at < DAY_END + 30) {
      flow(G, R, T.li, T.dir, p, T.at);
      const q = R.q[T.li][T.dir][p];
      board = Math.max(0, Math.min(q, T.maxL - T.tot));
      const left = q - board;
      R.q[T.li][T.dir][p] = left;
      R.qLeft[T.li][T.dir][p] = left;
      const dd = R.D.lines[T.li].bands[b][T.dir][p].d;
      for (let j = 0; j < n; j++) if (dd[j]) T.onb[j] += board * dd[j];
      T.tot += board;
      S.board += board; S.left += left > 0.5 ? left : 0; S.waitN += board;
      const st = R.stS[sid][b]; st.board += board; st.left += left > 0.5 ? left : 0; st.waitN += board; if (q > st.qMax) st.qMax = q;
      R.hourRiders[Math.min(23, Math.floor(T.at / 60))] += board;
      const fare = G.fare; S.rev += board * fare; R.rev += board * fare;
    }
    /* 停車時間：乗り降りの人数と混雑で伸びる。予定の 0.5 分を超えたぶんが遅延になる */
    const fac = G.stations[sid].fac || 0;
    const load = T.tot / T.cap;
    const crowd = load > 1 ? 1 + (load - 1) * 2.4 * R.delayK : 1;
    const dwell = 0.3 + (board + alight) / (T.cars * 110 * (1 + 0.25 * fac)) * crowd;
    T.delay = Math.max(0, T.delay + (dwell - 0.5) - (dwell < 0.5 ? 0.08 : 0));
    if (load > T.maxLoad) T.maxLoad = load;
    if (last) {
      S.delay += T.delay; if (T.delay > S.delayMax) S.delayMax = T.delay;
      S.loadMax += T.maxLoad; S.loadN++;
      S.comfortSum += V.comfort * (T.loadS || 0); S.crowdPen += 0;
      R.release.push({ at: T.at + 6, vk: T.vk, cars: T.cars });
      T.done = true;
      return;
    }
    const k = T.dir === 0 ? p : p - 1;
    const run = runMin(G, T.li, k, T.vk);
    const km = L.km[k];
    /* 区間の人キロ・席キロ（平均乗車率）と費用 */
    S.pkm += T.tot * km; S.ckm += T.cap * km;
    const cost = km * (T.cars * V.carKm + CREW_KM);
    S.cost += cost; R.opCost += cost;
    T.loadS = (T.loadS || 0) + T.tot * km;
    T.p += T.dir === 0 ? 1 : -1;
    T.at = T.at + dwell + run;
  }
  /* 分きざみで t まで進める。返り値＝1日が終わったか */
  /* ★★ 2026-09-18 ご報告「倍速を変えても電車の動きが変わらず速い」の真因。
     前は while (R.t < target) で<b>1分ずつ</b>進めていたので、1フレームで target が 0.05 分しか
     進まなくても<b>必ず1分進んでいた</b>（60fps なら倍率に関係なく毎秒60分）。
     ⇒ 時計（R.clock）は<b>小数のまま</b>持ち、1分の処理は「時計が次の1分を越えたとき」だけ行う。 */
  function stepTo(G, target) {
    const R = G.run; if (!R || R.done) return true;
    target = Math.min(target, DAY_END + 60);
    if (target > (R.clock || R.t)) R.clock = target;
    while (R.t + 1 <= R.clock) {
      const t = R.t + 1;
      /* 折り返しが終わった車両を戻す */
      for (let i = R.release.length - 1; i >= 0; i--) if (R.release[i].at <= t) { R.inUse[R.release[i].vk] -= R.release[i].cars; R.release.splice(i, 1); }
      if (t < DAY_END) {
        for (let li = 0; li < G.lines.length; li++) for (let dir = 0; dir < 2; dir++) {
          let guard = 0;
          while (R.next[li][dir] <= t && guard++ < 30) dispatch(G, R, li, dir, R.next[li][dir]);
        }
        const bb = bandOf(t);
        VKEYS.forEach((vk) => { if (R.inUse[vk] > R.useBand[bb][vk]) R.useBand[bb][vk] = R.inUse[vk]; });
      }
      for (let i = 0; i < R.trains.length; i++) {
        const T = R.trains[i];
        let g = 0;
        while (!T.done && T.at <= t && g++ < 40) arrive(G, R, T);
      }
      R.trains = R.trains.filter((T) => !T.done);
      R.t = t;
      if (t >= DAY_END && !R.trains.length) { R.done = true; R.clock = R.t; break; }
    }
    if (R.t >= DAY_END + 60) { R.trains = []; R.done = true; }
    return R.done;
  }
  /* いまの待ち客（表示用・進めずに推定） */
  function waitingAt(G, sid) {
    const R = G.run; if (!R) return 0;
    let q = 0;
    G.lines.forEach((L, li) => { const p = L.st.indexOf(sid); if (p < 0) return; for (let dir = 0; dir < 2; dir++) { const dt = Math.max(0, R.t - R.qT[li][dir][p]); q += R.q[li][dir][p] + R.D.lines[li].bands[bandOf(Math.min(R.t, DAY_END - 1))][dir][p].r * dt; } });
    return q;
  }
  /* 列車のいまの位置（地図に描く用）: 駅と駅のあいだを直線で補間 */
  function trainPos(G, T, t) {
    const L = G.lines[T.li];
    const from = T.dir === 0 ? T.p - 1 : T.p + 1;
    const A = G.stations[L.st[clamp(from, 0, L.st.length - 1)]], B = G.stations[L.st[T.p]];
    const k = T.dir === 0 ? T.p - 1 : T.p;
    const run = k >= 0 && k < L.km.length ? runMin(G, T.li, k, T.vk) : 1;
    const f = clamp(1 - (T.at - t) / Math.max(0.5, run), 0, 1);
    return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, load: T.tot / T.cap };
  }

  /* ══════════ ⑪ 1日のしめ ══════════ */
  function sumBands(arr, f) { let s = 0; arr.forEach((x) => { s += f(x); }); return s; }
  function satOf(G, parts) {
    const w = { wait: 0.22, left: 0.2, crowd: 0.18, fare: 0.14, punct: 0.12, comfort: 0.14 };
    let t = 0; Object.keys(w).forEach((k) => { t += parts[k] * w[k]; });
    return Math.round(t);
  }
  function satParts(G, S, fareOnly) {
    const def = CITIES[G.cityId];
    const board = sumBands(S, (x) => x.board);
    const wait = board > 0 ? sumBands(S, (x) => x.waitArea) / board : 0;
    const left = board > 0 ? sumBands(S, (x) => x.left) / board : 0;
    const lN = sumBands(S, (x) => x.loadN);
    const ld = lN ? sumBands(S, (x) => x.loadMax) / lN : 0;
    const trains = sumBands(S, (x) => x.loadN);
    const delay = trains ? sumBands(S, (x) => x.delay) / trains : 0;
    const pkm = sumBands(S, (x) => x.pkm);
    const comfort = pkm > 0 ? sumBands(S, (x) => x.comfortSum) / pkm : 65;
    const cancel = sumBands(S, (x) => x.cancel);
    const parts = {
      wait: clamp(Math.round(100 - (wait - 2.5) * 6), 0, 100),
      left: clamp(Math.round(100 - left * 700), 0, 100),
      crowd: clamp(Math.round(ld <= 0.8 ? 100 : ld <= 1 ? 100 - (ld - 0.8) * 75 : ld <= 1.3 ? 85 - (ld - 1) * 100 : 55 - (ld - 1.3) * 120), 0, 100),
      fare: clamp(Math.round(100 - Math.max(0, G.fare - def.refFare * 0.7) / (def.refFare * 1.3) * 100), 0, 100),
      punct: clamp(Math.round(100 - delay * 14 - cancel / Math.max(1, trains + cancel) * 150), 0, 100),
      comfort: clamp(Math.round(comfort - Math.max(0, ld - 0.9) * 40), 0, 100),
    };
    return { parts, wait, left, ld, delay, board, cancel };
  }
  function endDay(G) {
    const R = G.run, def = CITIES[G.cityId];
    /* 終電のあとに駅に残った人（乗れずに帰った人） */
    let lost = 0;
    G.lines.forEach((L, li) => { for (let dir = 0; dir < 2; dir++) L.st.forEach((sid, p) => { flow(G, R, li, dir, p, DAY_END); lost += R.q[li][dir][p]; }); });
    const allS = [].concat.apply([], R.S);
    const sp = satParts(G, allS);
    const sat = satOf(G, sp.parts);
    const lineRes = G.lines.map((L, li) => {
      const p = satParts(G, R.S[li]);
      const s2 = satOf(G, p.parts);
      G.lineSat[li] = Math.round(G.lineSat[li] * 0.6 + s2 * 0.4);
      return { sat: s2, riders: p.board, rev: sumBands(R.S[li], (x) => x.rev), cost: sumBands(R.S[li], (x) => x.cost) };
    });
    G.satAll = sat;
    /* 費用 */
    let vMaint = 0; VKEYS.forEach((vk) => { vMaint += (G.fleet[vk] || 0) * VEHICLES[vk].maint; });
    const stMaint = G.stations.reduce((a, s) => a + 60000 + s.fac * 30000 + (s.plat - 4) * 8000, 0);
    const depotMaint = G.depot * 1500;
    const interest = Math.round(G.loan * 0.0004);
    const other = Math.round(def.cash * 0.0006);
    const cost = { op: Math.round(R.opCost), veh: vMaint, st: stMaint, depot: depotMaint, interest, other };
    const costT = cost.op + cost.veh + cost.st + cost.depot + cost.interest + cost.other;
    const profit = Math.round(R.rev - costT);
    G.cash += profit;
    G.cum += profit;
    G.streak = profit > 0 ? G.streak + 1 : 0;
    /* 朝ラッシュの積み残し率 */
    const rb = G.lines.reduce((a, L, li) => a + R.S[li][2].board, 0), rl = G.lines.reduce((a, L, li) => a + R.S[li][2].left, 0);
    const rushLeft = rb > 0 ? rl / (rb + rl) : 0;
    G.rushStreak = rushLeft <= 0.01 ? G.rushStreak + 1 : 0;
    /* 街の成長（ゆっくり）: 満足度と利用のしやすさで伸び、悪ければ少し減る */
    const riders = sp.board;
    const use = riders / Math.max(1, G.city.pop * G.city.rail * 1.35);
    const g = clamp(G.city.growthBase + (def.gk || 0.004) * (sat - 62) / 38 * clamp(use, 0.3, 1.2), -0.0015, def.gcap || 0.004);
    const popBefore = G.city.pop;
    G.city.pop = Math.round(G.city.pop * (1 + g));
    /* 駅ごとの発展：よく使われ、待たずに乗れる駅のまわりに商業が集まる */
    G.stations.forEach((s) => {
      let bd = 0, lf = 0; R.stS[s.id].forEach((x) => { bd += x.board; lf += x.left; });
      const good = bd > 0 ? clamp(1 - lf / (bd + 1) * 4, -1, 1) : 0;
      s.dev = clamp(s.dev * (1 + 0.0025 * good * Math.min(1, bd / 2000) + g * 0.3), 0.6, 2.2);
    });
    G.city.commerce = clamp(G.city.commerce * (1 + g * 0.6), 0.6, 2.5);
    /* 経営危機 */
    if (G.cash < 0) G.crisis++; else G.crisis = 0;
    if (G.crisis >= 14) G.over = true;
    /* 記録 */
    const H = { day: G.day, pop: G.city.pop, riders: Math.round(riders), rev: Math.round(R.rev), cost: costT, profit, sat, cash: G.cash,
                left: Math.round(sp.board ? sumBands(allS, (x) => x.left) : 0), wait: sp.wait, load: sp.ld, lost: Math.round(lost), rushLeft,
                lineRiders: lineRes.map((x) => Math.round(x.riders)) };
    G.hist.push(H); if (G.hist.length > 120) G.hist.shift();
    const rep = report(G, R, { sp, sat, cost, costT, profit, lineRes, lost, rushLeft, popBefore, g });
    G.report = rep;
    checkGoals(G);
    G.day++;
    scheduleEvents(G, false);
    G.run = null;
    save(G);
    return rep;
  }
  /* ── 分析コメント（★ 命令しない。数字から「何が起きたか」だけを書く）── */
  function report(G, R, x) {
    const issues = [];
    const pct = (v) => Math.round(v * 100) + "%";
    G.lines.forEach((L, li) => {
      const low = [];
      BANDS.forEach((b, bi) => {
        const S = R.S[li][bi];
        if (S.left > Math.max(60, S.board * 0.03)) issues.push({ lv: 3, t: L.nm + "で" + b.nm + "（" + b.lbl + "）に積み残しが発生しました（延べ " + fmtN(Math.round(S.left)) + " 人）" });
        const eff = S.ckm > 0 ? S.pkm / S.ckm : 0;
        if (S.trains >= b.h * 3 && eff < 0.3 && S.ckm > 0) low.push({ nm: b.nm, eff });
        if (S.cancel > 0) issues.push({ lv: 3, t: L.nm + "で" + b.nm + "に " + S.cancel + " 本が車両不足で運休しました" });
      });
      /* ★ 乗車率の低い時間帯は、路線ごとに1行にまとめる（時間帯ごとに並べると読めない） */
      if (low.length) {
        low.sort((a, b) => a.eff - b.eff);
        issues.push({ lv: 1, t: L.nm + "は " + low.map((x) => x.nm).join("・") + " の平均乗車率が 30% 未満でした（いちばん低いのは" + low[0].nm + "の " + pct(low[0].eff) + "）" });
      }
      const dm = Math.max.apply(null, R.S[li].map((s) => s.delayMax));
      if (dm >= 3) issues.push({ lv: 2, t: L.nm + "で最大 +" + dm.toFixed(1) + " 分の遅延が発生しました（混雑で乗り降りに時間がかかっています）" });
      const wait = sumBands(R.S[li], (s) => s.waitArea) / Math.max(1, sumBands(R.S[li], (s) => s.board));
      if (wait > 8) issues.push({ lv: 2, t: L.nm + "の平均待ち時間は " + wait.toFixed(1) + " 分でした" });
    });
    if (x.lost > 50) issues.push({ lv: 2, t: "終電までに乗れなかった人が " + fmtN(Math.round(x.lost)) + " 人いました" });
    if (x.profit < 0) issues.push({ lv: 2, t: "本日は赤字でした（費用 " + fmtYen(x.costT) + " ／ 運賃収入 " + fmtYen(Math.round(R.rev)) + "）" });
    if (G.cash < 0) issues.push({ lv: 3, t: "資金がマイナスです（経営危機 " + G.crisis + " 日目・14日続くと経営破綻）" });
    const need = BANDS.map((b, bi) => VKEYS.reduce((a, vk) => a + R.useBand[bi][vk], 0));
    const own = VKEYS.reduce((a, vk) => a + (G.fleet[vk] || 0), 0);
    const pk = Math.max.apply(null, need);
    if (own > 0 && pk / own < 0.55) issues.push({ lv: 1, t: "いちばん多い時間帯でも保有車両の " + pct(pk / own) + " しか使っていません（" + pk + " / " + own + " 両）" });
    const up = G.events.filter((e) => e.day === G.day + 1 && e.ann);
    up.forEach((e) => issues.push({ lv: 1, t: "【予告】明日：" + eventText(G, e) }));
    issues.sort((a, b) => b.lv - a.lv);
    return {
      day: G.day, pop: G.city.pop, popBefore: x.popBefore, g: x.g, riders: Math.round(x.sp.board), load: x.sp.ld, avgLoad: (function () {
        let p = 0, c = 0; R.S.forEach((a) => a.forEach((s) => { p += s.pkm; c += s.ckm; })); return c ? p / c : 0; })(),
      left: Math.round(sumBands([].concat.apply([], R.S), (s) => s.left)), wait: x.sp.wait, delay: x.sp.delay, cancel: x.sp.cancel,
      rev: Math.round(R.rev), cost: x.cost, costT: x.costT, profit: x.profit, sat: x.sat, parts: x.sp.parts, lineRes: x.lineRes,
      issues: issues.slice(0, 9), lost: Math.round(x.lost), rushLeft: x.rushLeft,
      bands: BANDS.map((b, bi) => {
        let bd = 0, lf = 0, dem = 0, cap = 0, pkm = 0, ckm = 0;
        G.lines.forEach((L, li) => { const S = R.S[li][bi]; bd += S.board; lf += S.left; pkm += S.pkm; ckm += S.ckm; dem += R.D.lines[li].dem[bi]; cap += capOf(G, li, bi, R.mods); });
        return { board: bd, left: lf, dem, cap, eff: ckm ? pkm / ckm : 0 };
      }),
      useBand: R.useBand.map((u) => VKEYS.reduce((a, vk) => a + u[vk], 0)),
      lines: G.lines.map((L, li) => ({
        bands: BANDS.map((b, bi) => { const S = R.S[li][bi]; return { board: S.board, left: S.left, wait: S.board ? S.waitArea / S.board : 0,
          load: S.loadN ? S.loadMax / S.loadN : 0, eff: S.ckm ? S.pkm / S.ckm : 0, dem: R.D.lines[li].dem[bi], cap: capOf(G, li, bi, R.mods), rev: S.rev, cost: S.cost,
          cancel: S.cancel, delayMax: S.delayMax, trains: S.trains }; }),
      })),
      stations: G.stations.map((s) => R.stS[s.id].map((x) => ({ board: x.board, left: x.left, wait: x.board ? x.waitArea / x.board : 0, qMax: x.qMax }))),
    };
  }
  function capOf(G, li, bi, mods) {
    const P = G.plan[li][bi];
    let f = P.f; if (mods && mods.cap[li] != null) f = Math.min(f, mods.cap[li]);
    return f * Math.min(P.c, lineMaxCars(G, li)) * VEHICLES[P.v].cap;
  }
  /* 計画の段階で見える数字（まだ走らせていない日にも出す）: 需要は今日のモデルから */
  function preview(G) {
    const D = G.run ? G.run.D : buildDemand(G, G.day);
    return G.lines.map((L, li) => BANDS.map((b, bi) => ({ dem: D.lines[li].dem[bi], cap: capOf(G, li, bi, D.mods), riders: D.lines[li].riders[bi] })));
  }
  /* 時間帯ごとに必要な両数（計画から）: 本数 × 1往復の所要 ÷ 60 × 両数 ×（上り下り）÷ 2 */
  function fleetNeed(G) {
    return BANDS.map((b, bi) => {
      const o = { commuter: 0, rapid: 0, premium: 0 };
      G.lines.forEach((L, li) => {
        const P = G.plan[li][bi]; if (!P.f) return;
        const cyc = cycleMin(G, li, P.v);
        o[P.v] += Math.ceil(2 * P.f * cyc / 60) * Math.min(P.c, lineMaxCars(G, li));
      });
      return o;
    });
  }

  /* ══════════ ⑫ イベント ══════════ */
  function venueStations(G, key) { return G.stations.filter((s) => (key === "venue" ? s.venue : key === "uni" ? s.uni > 0 : key === "tour" ? s.tour > 0 : s.com > 3)); }
  function eventText(G, e) {
    const S = e.st != null ? G.stations[e.st] : null, L = e.line != null ? G.lines[e.line] : null;
    switch (e.k) {
      case "concert": return (S ? S.nm : "") + "で大規模コンサート（約 " + fmtN(e.n) + " 人・夕方〜夜）";
      case "festival": return (S ? S.nm : "") + "で学園祭（大学まわりの需要が増えます）";
      case "tourism": return "観光シーズン（観光地方面の需要が増えます・" + e.days + "日間）";
      case "mall": return (S ? S.nm : "") + "に大型商業施設がオープン（駅の利用が増えます）";
      case "breakdown": return VEHICLES[e.v].nm + " が " + e.n + " 両、故障で使えません";
      case "construction": return (L ? L.nm : "") + "で工事（1時間あたり最大 " + e.fmax + " 本・" + e.days + "日間）";
    }
    return "";
  }
  function scheduleEvents(G, first) {
    const def = CITIES[G.cityId];
    const R = mkRand((G.seed ^ (G.day * 2654435761)) >>> 0);
    G.events = G.events.filter((e) => e.day + e.days > G.day - 1);
    if (first) return;
    if (R() > def.eventRate) return;
    const kinds = ["concert", "festival", "tourism", "mall", "breakdown", "construction"];
    const k = kinds[Math.floor(R() * kinds.length)];
    const ann = k === "concert" || k === "festival" || k === "tourism" || k === "construction" || k === "mall";
    const lead = ann ? 1 + Math.floor(R() * 2) : 0;
    const e = { k, day: G.day + lead, days: 1, ann };
    if (k === "concert") { const v = venueStations(G, "venue"); if (!v.length) return; e.st = v[Math.floor(R() * v.length)].id; e.n = Math.round(G.city.pop * (0.06 + R() * 0.05)); }
    if (k === "festival") { const v = venueStations(G, "uni"); if (!v.length) return; e.st = v[Math.floor(R() * v.length)].id; e.days = 2; }
    if (k === "tourism") { e.days = 4 + Math.floor(R() * 3); }
    if (k === "mall") { const v = G.stations; e.st = v[Math.floor(R() * v.length)].id; e.perm = true; }
    if (k === "breakdown") { const own = VKEYS.filter((vk) => G.fleet[vk] > 0); if (!own.length) return; e.v = own[Math.floor(R() * own.length)]; e.n = Math.max(2, Math.round(G.fleet[e.v] * (0.05 + R() * 0.07))); e.day = G.day; }
    if (k === "construction") { e.line = Math.floor(R() * G.lines.length); e.fmax = 4; e.days = 2; }
    if (G.events.some((x) => x.k === k && x.day + x.days > e.day)) return;
    G.events.push(e);
  }
  /* 常設の変化（商業施設のオープン）は当日に反映 */
  function applyPermanent(G) {
    G.events.forEach((e) => { if (e.perm && e.day === G.day && !e.done) { G.stations[e.st].com += 4; G.stations[e.st].jobs += 2; e.done = true; } });
  }
  function eventsToday(G) { return G.events.filter((e) => G.day >= e.day && G.day < e.day + e.days); }

  /* ══════════ ⑬ 投資・経営 ══════════ */
  function totalCars(G) { return VKEYS.reduce((a, vk) => a + (G.fleet[vk] || 0), 0); }
  function buyCars(G, vk, n) {
    const V = VEHICLES[vk]; if (!V) return "車両がありません";
    if (totalCars(G) + n > G.depot) return "車両基地に入りきりません（基地を拡張してください）";
    const cost = V.price * n; if (G.cash < cost) return "資金が足りません";
    G.cash -= cost; G.fleet[vk] = (G.fleet[vk] || 0) + n; return "";
  }
  function sellCars(G, vk, n) {
    if ((G.fleet[vk] || 0) < n) return "売れる車両がありません";
    G.fleet[vk] -= n; G.cash += Math.round(VEHICLES[vk].price * 0.45) * n; return "";
  }
  const DEPOT_STEP = 20;
  function depotCost(G) { return 80e6 + G.depot * 0.4e6; }
  function expandDepot(G) { const c = depotCost(G); if (G.cash < c) return "資金が足りません"; G.cash -= c; G.depot += DEPOT_STEP; return ""; }
  function platCost(G, s) { return 45e6 + (s.plat - 4) * 10e6; }
  function extendPlat(G, sid) { const s = G.stations[sid]; if (s.plat >= 10) return "これ以上のばせません"; const c = platCost(G, s); if (G.cash < c) return "資金が足りません"; G.cash -= c; s.plat += 2; return ""; }
  function facCost(s) { return 25e6 * (s.fac + 1); }
  function upFac(G, sid) { const s = G.stations[sid]; if (s.fac >= 3) return "最大です"; const c = facCost(s); if (G.cash < c) return "資金が足りません"; G.cash -= c; s.fac++; return ""; }
  function downFac(G, sid) { const s = G.stations[sid]; if (s.fac <= 0) return "これ以上下げられません"; s.fac--; G.cash += Math.round(facCost(s) * 0.3); return ""; }
  function borrow(G, amt) { const def = CITIES[G.cityId]; const room = def.loanMax - G.loan; const a = Math.min(amt, room); if (a <= 0) return "借入の上限です"; G.loan += a; G.cash += a; return ""; }
  function repay(G, amt) { const a = Math.min(amt, G.loan, Math.max(0, G.cash)); if (a <= 0) return "返せる資金がありません"; G.loan -= a; G.cash -= a; return ""; }

  /* ══════════ ⑭ 勝利条件 ══════════ */
  function goalState(G) {
    const sc = SCENARIOS.find((s) => s.id === G.scenario);
    const last = G.hist[G.hist.length - 1];
    return sc.goals.map((g) => {
      let ok = false, now = "";
      if (g.k === "pop") { ok = G.city.pop >= g.v; now = fmtN(G.city.pop) + " 人"; }
      if (g.k === "sat") { ok = !!last && last.sat >= g.v; now = last ? last.sat + " 点" : "—"; }
      if (g.k === "profitStreak") { ok = G.streak >= g.v; now = G.streak + " 日"; }
      if (g.k === "rushLeft") { ok = G.rushStreak >= g.days; now = G.rushStreak + " 日（昨日 " + (last ? (last.rushLeft * 100).toFixed(1) : "—") + "%）"; }
      if (g.k === "cumProfit") { ok = G.cum >= g.v && G.day - 1 <= g.within; now = fmtYen(G.cum) + "（" + Math.max(0, g.within - (G.day - 1)) + " 日残り）"; }
      return { tx: GOAL_TX[g.k](g), ok, now };
    });
  }
  function checkGoals(G) {
    if (G.cleared) return;
    const gs = goalState(G);
    if (gs.every((x) => x.ok)) { G.cleared = true; G.clearedDay = G.day; G.justCleared = true; }
    const sc = SCENARIOS.find((s) => s.id === G.scenario);
    sc.goals.forEach((g) => { if (g.k === "cumProfit" && G.day > g.within && !G.cleared) G.failed = true; });
  }

  /* ══════════ ⑮ 表示の小道具 ══════════ */
  function fmtN(n) { return Math.round(n).toLocaleString("ja-JP"); }
  function fmtYen(n) {
    const a = Math.abs(n), s = n < 0 ? "-" : "";
    if (a >= 1e8) return s + "¥" + (a / 1e8).toFixed(a >= 1e10 ? 0 : 2) + "億";
    if (a >= 1e4) return s + "¥" + Math.round(a / 1e4).toLocaleString("ja-JP") + "万";
    return s + "¥" + Math.round(a).toLocaleString("ja-JP");
  }
  function clock(t) { const h = Math.floor(t / 60), m = Math.floor(t % 60); return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }

  /* ══════════ ⑯ 保存 ══════════ */
  const KEY = "magirail_v1";
  function save(G) { try { const c = Object.assign({}, G); delete c.run; delete c.justCleared; localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && o.v === 1 ? o : null; } catch (e) { return null; } }
  function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }

  window.RAIL = {
    BANDS, FREQS, CARS, VEHICLES, VKEYS, CROWD, CITIES, SCENARIOS, DAY_START, DAY_END,
    bandOf, crowdOf, newGame, buildDemand, startDay, stepTo, endDay, waitingAt, trainPos, preview, fleetNeed, capOf, lineMaxCars, cycleMin,
    eventText, eventsToday, applyPermanent, totalCars, buyCars, sellCars, expandDepot, depotCost, DEPOT_STEP, extendPlat, platCost, upFac, downFac, facCost,
    borrow, repay, goalState, railShare, stationPop, fmtN, fmtYen, clock, save, load, clearSave,
  };
})();

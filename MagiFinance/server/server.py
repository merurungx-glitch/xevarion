# -*- coding: utf-8 -*-
"""
MagiFinance 中継サーバー（軽量バックエンド）
================================================
yfinance を用いて株価・指数を取得し、MagiFinance（静的サイト）へ
CORS 付き JSON で安定的に提供します。ブラウザの CORS / 公開プロキシ制限に
依存しないため、常時安定運用に向いています。

提供エンドポイント:
  GET /api/health
  GET /api/history?symbol=7203.T&range=1y           … 日足 OHLC
  GET /api/quote?symbol=7203.T                        … 最新値
  GET /api/quote?symbols=7203.T,AAPL                  … 複数まとめて
  GET /api/screen?market=prime&limit=0&min_score=18   … 東証プライム“全銘柄”を
                                                        サーバー側で分析しランキング

依存: flask, flask-cors, yfinance, pandas, requests
      （プライム一覧の自動取得には openpyxl / xlrd があると堅牢）

起動:
  pip install -r requirements.txt
  python server.py            # http://localhost:8787 で待受
"""
import io
import os
import time
import json
import threading
import datetime as dt

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import yfinance as yf

try:
    import requests
except Exception:  # requests は yfinance 依存で通常入っている
    requests = None

app = Flask(__name__)
CORS(app)  # すべてのオリジンから利用可（静的サイトから直接呼べる）

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, "_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# ============================================================
# テクニカル指標（クライアント buildSignal と同じロジック）
# ============================================================
def _sma(s, p):
    return s.rolling(p).mean()

def _ema(s, p):
    return s.ewm(span=p, adjust=False).mean()

def _rsi(s, p=14):
    d = s.diff()
    up = d.clip(lower=0).ewm(alpha=1 / p, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / p, adjust=False).mean()
    rs = up / dn.replace(0, 1e-9)
    return 100 - 100 / (1 + rs)

def clamp(v, a, b):
    return max(a, min(b, v))

def build_signal(closes):
    """終値リストから BUY/SELL/HOLD スコアと内訳を返す。"""
    s = pd.Series(closes, dtype="float64").dropna()
    n = len(s)
    if n < 80:
        return None
    last = float(s.iloc[-1])
    sma25 = _sma(s, 25); sma75 = _sma(s, 75)
    rsi = _rsi(s, 14)
    ef = _ema(s, 12); es = _ema(s, 26)
    macd = ef - es
    signal = _ema(macd, 9)
    hist = macd - signal
    mid = _sma(s, 20); sd = s.rolling(20).std()
    bb_up = mid + 2 * sd; bb_lo = mid - 2 * sd

    score = 0.0
    # 1) トレンド（移動平均）
    t_dev = (last - float(sma75.iloc[-1])) / float(sma75.iloc[-1]) * 100
    t_score = clamp(t_dev * 4, -25, 25)
    cross_now = float(sma25.iloc[-1]) - float(sma75.iloc[-1])
    cross_prev = float(sma25.iloc[-2]) - float(sma75.iloc[-2])
    if cross_prev < 0 and cross_now > 0:
        t_score = 25
    if cross_prev > 0 and cross_now < 0:
        t_score = -25
    score += t_score
    # 2) RSI
    r = float(rsi.iloc[-1])
    if r < 30: r_score = 22
    elif r < 40: r_score = 11
    elif r > 70: r_score = -22
    elif r > 60: r_score = -11
    else: r_score = (50 - r) * 0.4
    score += r_score
    # 3) MACD
    h = float(hist.iloc[-1]); hp = float(hist.iloc[-2])
    m_score = clamp(h / last * 900, -18, 18)
    if hp < 0 and h > 0: m_score = 20
    if hp > 0 and h < 0: m_score = -20
    score += m_score
    # 4) ボリンジャー位置
    bw = float(bb_up.iloc[-1]) - float(bb_lo.iloc[-1])
    bpos = (last - float(bb_lo.iloc[-1])) / bw if bw > 0 else 0.5
    if bpos < 0.1: b_score = 15
    elif bpos < 0.25: b_score = 8
    elif bpos > 0.9: b_score = -15
    elif bpos > 0.75: b_score = -8
    else: b_score = 0
    score += b_score
    # 5) 短期需給（5日）
    ret5 = (last - float(s.iloc[-6])) / float(s.iloc[-6]) * 100
    score += clamp(-ret5 * 1.4, -12, 12)

    score = clamp(score, -100, 100)
    if score >= 45: verdict = "強い買い"; vc = "up"
    elif score >= 18: verdict = "買い"; vc = "up"
    elif score > -18: verdict = "中立"; vc = "flat"
    elif score > -45: verdict = "売り"; vc = "down"
    else: verdict = "強い売り"; vc = "down"
    return {
        "score": round(score), "verdict": verdict, "vClass": vc,
        "confidence": round(40 + abs(score) * 0.6),
        "rsi": round(r, 1),
        "sma25": float(sma25.iloc[-1]), "sma75": float(sma75.iloc[-1]),
    }

# ============================================================
# 取得ヘルパー
# ============================================================
RANGE_PERIOD = {"6mo": "6mo", "1y": "1y", "2y": "2y", "1d": "1d"}

def candles_from_df(df):
    out = []
    for idx, row in df.iterrows():
        c = row.get("Close")
        o = row.get("Open")
        if pd.isna(c) or pd.isna(o):
            continue
        out.append({
            "t": int(pd.Timestamp(idx).timestamp()),
            "open": float(o), "high": float(row.get("High", o)),
            "low": float(row.get("Low", o)), "close": float(c),
            "volume": int(row.get("Volume", 0) or 0),
        })
    return out

@app.route("/api/health")
def health():
    return jsonify({"ok": True, "service": "magifinance-relay", "time": dt.datetime.now().isoformat()})

VALID_PERIOD = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}
VALID_INTERVAL = {"1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"}

@app.route("/api/history")
def history():
    symbol = (request.args.get("symbol") or "").strip()
    rng = request.args.get("range", "1y")
    interval = request.args.get("interval", "1d")
    if rng not in VALID_PERIOD:
        rng = "1y"
    if interval not in VALID_INTERVAL:
        interval = "1d"
    if not symbol:
        return jsonify({"error": "symbol is required"}), 400
    try:
        df = yf.Ticker(symbol).history(period=rng, interval=interval, auto_adjust=False)
        if df is None or df.empty:
            return jsonify({"error": "no data", "symbol": symbol}), 404
        candles = candles_from_df(df)
        meta = {"regularMarketPrice": candles[-1]["close"] if candles else None,
                "previousClose": candles[-2]["close"] if len(candles) > 1 else None}
        return jsonify({"symbol": symbol, "candles": candles, "meta": meta})
    except Exception as e:
        return jsonify({"error": str(e), "symbol": symbol}), 502

@app.route("/api/fundamentals")
def fundamentals():
    """PER/PBR/ROE/配当利回り/時価総額/業種＋業績推移(売上・純利益) を返す。"""
    symbol = (request.args.get("symbol") or "").strip()
    if not symbol:
        return jsonify({"error": "symbol required"}), 400
    try:
        tk = yf.Ticker(symbol)
        info = {}
        try:
            info = tk.info or {}
        except Exception:
            info = {}
        def g(*keys):
            for k in keys:
                v = info.get(k)
                if v is not None:
                    return v
            return None
        out = {
            "symbol": symbol,
            "name": g("longName", "shortName"),
            "sector": g("sector"),
            "industry": g("industry"),
            "per": g("trailingPE"),
            "forwardPer": g("forwardPE"),
            "pbr": g("priceToBook"),
            "roe": g("returnOnEquity"),
            "dividendYield": g("dividendYield"),
            "marketCap": g("marketCap"),
            "eps": g("trailingEps"),
            "profitMargin": g("profitMargins"),
            "high52": g("fiftyTwoWeekHigh"),
            "low52": g("fiftyTwoWeekLow"),
            "earnings": [],
        }
        # 業績推移（年次の売上・純利益）
        try:
            fin = tk.income_stmt
            if fin is not None and not fin.empty:
                rev = fin.loc["Total Revenue"] if "Total Revenue" in fin.index else None
                ni = fin.loc["Net Income"] if "Net Income" in fin.index else None
                cols = list(fin.columns)[:5]
                for c in reversed(cols):
                    out["earnings"].append({
                        "year": str(getattr(c, "year", c))[:4],
                        "revenue": float(rev[c]) if rev is not None and not pd.isna(rev[c]) else None,
                        "netIncome": float(ni[c]) if ni is not None and not pd.isna(ni[c]) else None,
                    })
        except Exception:
            pass
        return jsonify(out)
    except Exception as e:
        return jsonify({"error": str(e), "symbol": symbol}), 502

@app.route("/api/news")
def news():
    """Google ニュース(日本語) RSS を取得して返す。q=検索語。"""
    q = (request.args.get("q") or "").strip()
    if not q:
        return jsonify({"error": "q required"}), 400
    if requests is None:
        return jsonify({"items": []})
    try:
        import urllib.parse, xml.etree.ElementTree as ET
        url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(q) + "&hl=ja&gl=JP&ceid=JP:ja"
        r = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        root = ET.fromstring(r.content)
        items = []
        for it in root.iter("item"):
            title = it.findtext("title") or ""
            link = it.findtext("link") or ""
            pub = it.findtext("pubDate") or ""
            src = it.findtext("source") or "Google ニュース"
            ts = 0
            try:
                ts = int(dt.datetime.strptime(pub[:25], "%a, %d %b %Y %H:%M:%S").timestamp())
            except Exception:
                pass
            items.append({"headline": title, "source": src, "url": link, "datetime": ts})
            if len(items) >= 15:
                break
        return jsonify({"q": q, "items": items})
    except Exception as e:
        return jsonify({"error": str(e), "items": []}), 502

@app.route("/api/quote")
def quote():
    syms = request.args.get("symbols") or request.args.get("symbol") or ""
    symbols = [s.strip() for s in syms.split(",") if s.strip()]
    if not symbols:
        return jsonify({"error": "symbol(s) required"}), 400
    out = {}
    for sym in symbols:
        try:
            df = yf.Ticker(sym).history(period="5d", interval="1d", auto_adjust=False)
            if df is None or df.empty:
                out[sym] = {"error": "no data"}
                continue
            price = float(df["Close"].iloc[-1])
            prev = float(df["Close"].iloc[-2]) if len(df) > 1 else price
            out[sym] = {"price": price, "prevClose": prev,
                        "open": float(df["Open"].iloc[-1]),
                        "high": float(df["High"].iloc[-1]),
                        "low": float(df["Low"].iloc[-1])}
        except Exception as e:
            out[sym] = {"error": str(e)}
    if len(symbols) == 1:
        single = out[symbols[0]]
        single = dict(single); single["symbol"] = symbols[0]
        return jsonify(single)
    return jsonify({"quotes": out})

# ============================================================
# 東証プライム“全銘柄”一覧（JPX 公表データから取得・キャッシュ）
# ============================================================
JPX_URL = "https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xls"
PRIME_CACHE = os.path.join(CACHE_DIR, "tse_prime.json")
FALLBACK_LIST = os.path.join(HERE, "tse_prime_fallback.json")

def _load_prime_list():
    """[(code, name, sector)] のリストを返す。JPX→キャッシュ→同梱フォールバックの順。"""
    # 1) 1日キャッシュ
    if os.path.exists(PRIME_CACHE) and time.time() - os.path.getmtime(PRIME_CACHE) < 86400:
        try:
            return json.load(open(PRIME_CACHE, encoding="utf-8"))
        except Exception:
            pass
    # 2) JPX から取得
    rows = []
    try:
        if requests is not None:
            headers = {"User-Agent": "Mozilla/5.0"}
            try:
                r = requests.get(JPX_URL, timeout=30, headers=headers)
                r.raise_for_status()
            except requests.exceptions.SSLError:
                # Windows 等で証明書チェーンの検証に失敗する環境向けフォールバック。
                # JPX の data_j.xls は公開データのため verify 無しでも取得して問題ない。
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                r = requests.get(JPX_URL, timeout=30, headers=headers, verify=False)
                r.raise_for_status()
            df = pd.read_excel(io.BytesIO(r.content))
            # 列名は「コード」「銘柄名」「市場・商品区分」「33業種区分」
            col_mkt = next((c for c in df.columns if "市場" in str(c)), None)
            col_code = next((c for c in df.columns if "コード" in str(c)), None)
            col_name = next((c for c in df.columns if "銘柄名" in str(c)), None)
            col_sec = next((c for c in df.columns if "業種" in str(c)), None)
            sub = df[df[col_mkt].astype(str).str.contains("プライム", na=False)]
            for _, row in sub.iterrows():
                code = str(row[col_code]).strip()
                if not code or code.lower() == "nan":
                    continue
                rows.append([code, str(row[col_name]).strip(),
                             str(row[col_sec]).strip() if col_sec else ""])
    except Exception as e:
        print("[warn] JPX一覧の取得に失敗:", e)
    # 3) 同梱フォールバック
    if not rows and os.path.exists(FALLBACK_LIST):
        try:
            rows = json.load(open(FALLBACK_LIST, encoding="utf-8"))
        except Exception:
            rows = []
    if rows:
        try:
            json.dump(rows, open(PRIME_CACHE, "w", encoding="utf-8"), ensure_ascii=False)
        except Exception:
            pass
    return rows

# スクリーニング結果のキャッシュ（重いので既定1時間）
_screen_cache = {"ts": 0, "data": None, "running": False}
SCREEN_TTL = int(os.environ.get("SCREEN_TTL", "3600"))

def _run_screen(limit=0):
    prime = _load_prime_list()
    if limit and limit > 0:
        prime = prime[:limit]
    symbols = [c[0] + ".T" for c in prime]
    info = {(c[0] + ".T"): {"code": c[0], "name": c[1], "sector": c[2] if len(c) > 2 else ""}
            for c in prime}
    items = []
    # まとめてダウンロード（100件ずつ）
    BATCH = 100
    for i in range(0, len(symbols), BATCH):
        batch = symbols[i:i + BATCH]
        try:
            data = yf.download(batch, period="6mo", interval="1d",
                               group_by="ticker", threads=True, progress=False, auto_adjust=False)
        except Exception as e:
            print("[warn] batch download失敗:", e)
            continue
        for sym in batch:
            try:
                if len(batch) == 1:
                    closes = data["Close"].dropna().tolist()
                else:
                    closes = data[sym]["Close"].dropna().tolist()
            except Exception:
                continue
            if len(closes) < 80:
                continue
            sig = build_signal(closes)
            if not sig:
                continue
            price = float(closes[-1]); prev = float(closes[-2])
            meta = info.get(sym, {})
            items.append({
                "symbol": sym, "code": meta.get("code", sym.replace(".T", "")),
                "name": meta.get("name", sym), "sector": meta.get("sector", ""),
                "price": round(price, 1), "prevClose": round(prev, 1),
                "changePct": round((price - prev) / prev * 100, 2),
                "score": sig["score"], "verdict": sig["verdict"], "vClass": sig["vClass"],
                "confidence": sig["confidence"], "rsi": sig["rsi"],
            })
    items.sort(key=lambda x: x["score"], reverse=True)
    return {"count": len(items), "generatedAt": dt.datetime.now().isoformat(),
            "market": "prime", "items": items}

@app.route("/api/screen")
def screen():
    limit = int(request.args.get("limit", "0") or 0)
    min_score = int(request.args.get("min_score", "-101") or -101)
    force = request.args.get("force") == "1"
    now = time.time()
    if (not force) and _screen_cache["data"] and now - _screen_cache["ts"] < SCREEN_TTL:
        data = _screen_cache["data"]
    else:
        data = _run_screen(limit)
        _screen_cache.update(ts=now, data=data)
    items = [x for x in data["items"] if x["score"] >= min_score]
    return jsonify({**data, "items": items, "cached": (not force) and now - _screen_cache["ts"] < SCREEN_TTL})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8787"))
    print("MagiFinance 中継サーバー → http://localhost:%d  (Ctrl+C で停止)" % port)
    app.run(host="0.0.0.0", port=port, threaded=True)

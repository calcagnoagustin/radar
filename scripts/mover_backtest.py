#!/usr/bin/env python3
"""
mover_backtest.py — Backtest del modo "mover-hunter" de Ganesha (Binance Spot).

Idea: Ganesha, ademas del universo de semillas, entra LONG en corto sobre movers
que disparan (a) un movimiento fresco de +X% en N dias con volumen, o (b) un salto
en el ranking de volumen 24h (gigante que despierta). Salida = stop ATR + TP parcial
(+2R, 30%) + trailing, igual que el Ejecutor en vivo. Todo Binance Spot /USDT, fee 0.1%.

Mide VIABILIDAD propia (expectancy, win rate, profit factor, payoff, max DD) y
ENTRADAS/MES. Control: entradas al azar con el mismo manejo de salida, para aislar
si el trigger aporta edge sobre entrar a ciegas. NO se compara contra buy&hold.

Standalone (solo stdlib + API publica de Binance). Cachea klines en /tmp.
"""
import json, os, time, math, base64, urllib.request, random, statistics as stats, traceback

# ----------------------------- CONFIG -----------------------------
BASE = "https://api.binance.com"
DAYS = 540                       # ventana (~18 meses) de velas diarias
MIN_QVOL_USD = 3_000_000         # liquidez: mediana de quoteVolume 24h >= esto
LOOKBACK = 7                     # ventana del % (retorno de N dias)
ATR_N = 14
ATR_MULT = 2.5
SCALEOUT_R = 2.0                 # TP1 a +2R
SCALEOUT_FRAC = 0.30             # vende 30% en TP1
FEE = 0.001                      # 0.1% por lado
MAX_HOLD = 30                    # dias maximo por trade (corte de seguridad)
CACHE = "/tmp/bt_cache"

# Barridos
MOVE_THRESHES = [12, 15, 20, 25]     # % en LOOKBACK dias
VOL_MULTS = [1.5, 3.0]               # spike de volumen (vol dia / mediana)
ANTITOP = ["none", "rsi70", "fresh"] # filtro anti-techo
USE_VOLRANK = True                   # sumar señal de volume_rank (OR)
VOLRANK_TOP = 100
VOLRANK_JUMP = 50

EXCLUDE_BASES = {"USDC","FDUSD","TUSD","DAI","USDP","EUR","BUSD","AEUR","USD1","XUSD"}

# ----------------------------- IO -----------------------------
def gh_put(path, content_bytes, msg):
    t = os.environ.get("GITHUB_TOKEN"); r = os.environ.get("GITHUB_REPO")
    br = os.environ.get("GITHUB_BRANCH", "main")
    if not t or not r:
        print("[bt] sin GITHUB creds; no publico"); return
    h = {"Authorization": "Bearer " + t, "Accept": "application/vnd.github+json", "User-Agent": "bt"}
    sha = None
    try:
        rq = urllib.request.Request("https://api.github.com/repos/%s/contents/%s?ref=%s" % (r, path, br), headers=h)
        sha = json.load(urllib.request.urlopen(rq)).get("sha")
    except Exception:
        sha = None
    body = {"message": msg, "content": base64.b64encode(content_bytes).decode(), "branch": br}
    if sha: body["sha"] = sha
    rq = urllib.request.Request("https://api.github.com/repos/%s/contents/%s" % (r, path),
                                data=json.dumps(body).encode(), method="PUT", headers=h)
    print("[bt] publish", path, urllib.request.urlopen(rq).status)

def _get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "bt"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(1.5 * (i + 1))

def fetch_symbols():
    info = _get(BASE + "/api/v3/exchangeInfo")
    out = []
    for s in info["symbols"]:
        if s.get("quoteAsset") != "USDT": continue
        if s.get("status") != "TRADING": continue
        if not s.get("isSpotTradingAllowed", False): continue
        b = s.get("baseAsset", "")
        if b in EXCLUDE_BASES: continue
        if any(x in b for x in ("UP", "DOWN", "BULL", "BEAR")): continue
        out.append(s["symbol"])
    return out

def fetch_klines(sym):
    os.makedirs(CACHE, exist_ok=True)
    fp = os.path.join(CACHE, sym + ".json")
    if os.path.exists(fp) and (time.time() - os.path.getmtime(fp)) < 86400:
        return json.load(open(fp))
    kl = _get(BASE + "/api/v3/klines?symbol=%s&interval=1d&limit=%d" % (sym, DAYS + ATR_N + 5))
    rows = [[int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]),
             float(k[5]), float(k[7])] for k in kl]   # t,o,h,l,c,vol,qvol
    json.dump(rows, open(fp, "w"))
    time.sleep(0.06)
    return rows

# ----------------------------- INDICADORES -----------------------------
def pct_return(c, i, n):
    if i - n < 0 or c[i - n] <= 0: return 0.0
    return (c[i] / c[i - n] - 1) * 100

def vol_spike(qv, i, n=20):
    if i < n: return 0.0
    window = qv[i - n:i]
    m = stats.median(window) if window else 0
    return (qv[i] / m) if m > 0 else 0.0

def rsi(c, i, n=14):
    if i < n: return 50.0
    gains = losses = 0.0
    for k in range(i - n + 1, i + 1):
        d = c[k] - c[k - 1]
        gains += max(d, 0); losses += max(-d, 0)
    if losses == 0: return 100.0
    rs = (gains / n) / (losses / n)
    return 100 - 100 / (1 + rs)

def atr(h, l, c, i, n=ATR_N):
    if i < n: return None
    trs = []
    for k in range(i - n + 1, i + 1):
        trs.append(max(h[k] - l[k], abs(h[k] - c[k - 1]), abs(l[k] - c[k - 1])))
    return sum(trs) / n

def is_fresh(c, i, n=10):
    """dia 1 de romper el maximo de cierres de N dias (breakout fresco)."""
    if i < n + 1: return False
    prev_hi = max(c[i - n:i])
    prev_hi2 = max(c[i - n - 1:i - 1])
    return c[i] > prev_hi and c[i - 1] <= prev_hi2

# ----------------------------- SIMULACION DE SALIDA -----------------------------
def simulate(o, h, l, c, entry_i):
    """Entra al close[entry_i]; stop ATR, TP1 +2R (30%), trailing. Devuelve ret% neto."""
    entry = c[entry_i]
    a = atr(h, l, c, entry_i)
    if not a or a <= 0: return None
    stop = entry - ATR_MULT * a
    if stop <= 0 or stop >= entry: return None
    R = entry - stop
    qty = 1.0
    realized = 0.0
    so = False
    for i in range(entry_i + 1, min(entry_i + 1 + MAX_HOLD, len(c))):
        # stop intradia (usa low)
        if l[i] <= stop:
            realized += qty * (stop - entry)
            qty = 0.0
            reason = "stop" if not so else "trail"
            break
        # TP1 a +2R con el high
        if not so and h[i] >= entry + SCALEOUT_R * R:
            sq = qty * SCALEOUT_FRAC
            realized += sq * (entry + SCALEOUT_R * R - entry)
            qty -= sq
            so = True
            stop = max(stop, entry)  # breakeven
        # trailing despues de TP1
        if so:
            a2 = atr(h, l, c, i)
            if a2:
                ns = c[i] - ATR_MULT * a2
                if ns > stop: stop = ns
    else:
        # corte por MAX_HOLD o fin de data: cierra al ultimo close
        i = min(entry_i + MAX_HOLD, len(c) - 1)
        realized += qty * (c[i] - entry)
        qty = 0.0
        reason = "timeout"
    # ret bruto sobre notional de entrada, menos fees (entrada + salidas ~2 lados)
    gross = realized / entry
    ret = gross - 2 * FEE
    return {"ret": ret * 100, "bars": i - entry_i, "reason": reason}

# ----------------------------- SEÑALES -----------------------------
def build_volrank(data, dates):
    """rank[date_idx][sym] = puesto por quoteVolume ese dia (1 = mas volumen)."""
    # index global de fechas
    all_days = sorted(dates)
    day_pos = {d: i for i, d in enumerate(all_days)}
    per_day = [dict() for _ in all_days]
    for sym, d in data.items():
        for i, t in enumerate(d["t"]):
            per_day[day_pos[t]][sym] = d["qv"][i]
    ranks = []
    for dd in per_day:
        order = sorted(dd.items(), key=lambda x: x[1], reverse=True)
        ranks.append({s: r + 1 for r, (s, _) in enumerate(order)})
    return day_pos, ranks

# ----------------------------- BACKTEST -----------------------------
def run(data, day_pos, ranks, move_thr, vol_mult, antitop):
    trades = []
    for sym, d in data.items():
        o, h, l, c, qv, t = d["o"], d["h"], d["l"], d["c"], d["qv"], d["t"]
        n = len(c)
        open_until = -1
        for i in range(max(ATR_N, 21), n - 1):
            if i <= open_until:
                continue
            # --- señal weekly_move (long only) ---
            wk = pct_return(c, i, LOOKBACK) >= move_thr and vol_spike(qv, i) >= vol_mult
            # --- señal volume_rank ---
            vr = False
            if USE_VOLRANK:
                gi = day_pos[t[i]]
                rk = ranks[gi].get(sym)
                rk_prev = ranks[gi - 1].get(sym) if gi > 0 else None
                if rk is not None and rk <= VOLRANK_TOP:
                    if rk_prev is None or (rk_prev - rk) >= VOLRANK_JUMP:
                        vr = True
            if not (wk or vr):
                continue
            # --- filtro anti-techo ---
            if antitop == "rsi70" and rsi(c, i) >= 70:
                continue
            if antitop == "fresh" and not is_fresh(c, i):
                continue
            res = simulate(o, h, l, c, i)
            if res is None:
                continue
            res["symbol"] = sym; res["t"] = t[i]
            trades.append(res)
            open_until = i + res["bars"]  # no re-entrar mientras "esta abierta"
    return trades

def metrics(trades, months):
    if not trades:
        return {"n": 0}
    rets = [x["ret"] for x in trades]
    wins = [r for r in rets if r > 0]
    losses = [r for r in rets if r <= 0]
    gp = sum(wins); gl = -sum(losses)
    return {
        "n": len(trades),
        "per_month": round(len(trades) / months, 1),
        "win_rate": round(100 * len(wins) / len(trades), 1),
        "avg_ret": round(sum(rets) / len(rets), 3),
        "median_ret": round(stats.median(rets), 3),
        "profit_factor": round(gp / gl, 2) if gl > 0 else None,
        "payoff": round((gp / len(wins)) / (gl / len(losses)), 2) if wins and losses else None,
        "expectancy": round(sum(rets) / len(rets), 3),
        "tp1_rate": round(100 * sum(1 for x in trades if x["reason"] in ("trail", "timeout")) / len(trades), 1),
        "max_dd": round(max_dd(rets), 2),
    }

def max_dd(rets):
    eq = 0.0; peak = 0.0; dd = 0.0
    for r in rets:
        eq += r
        peak = max(peak, eq)
        dd = min(dd, eq - peak)
    return dd

def random_control(data, n_trades, seed=0):
    random.seed(seed)
    syms = list(data.keys())
    out = []
    tries = 0
    while len(out) < n_trades and tries < n_trades * 20:
        tries += 1
        sym = random.choice(syms)
        d = data[sym]; c = d["c"]
        if len(c) < ATR_N + MAX_HOLD + 5: continue
        i = random.randint(ATR_N + 21, len(c) - 2)
        res = simulate(d["o"], d["h"], d["l"], c, i)
        if res: out.append(res["ret"])
    return round(sum(out) / len(out), 3) if out else None

# ----------------------------- MAIN -----------------------------
def main():
    t0 = time.time()
    syms = fetch_symbols()
    print("[bt] símbolos /USDT spot:", len(syms))
    data = {}; dates = set()
    for j, sym in enumerate(syms):
        try:
            rows = fetch_klines(sym)
        except Exception:
            continue
        if len(rows) < 120: continue
        qv = [r[6] for r in rows]
        if stats.median(qv[-30:]) < MIN_QVOL_USD:  # liquidez
            continue
        data[sym] = {"t": [r[0] for r in rows], "o": [r[1] for r in rows],
                     "h": [r[2] for r in rows], "l": [r[3] for r in rows],
                     "c": [r[4] for r in rows], "qv": qv}
        for r in rows: dates.add(r[0])
        if (j + 1) % 100 == 0:
            print("[bt] descargados", j + 1, "/", len(syms))
    print("[bt] universo líquido:", len(data), "| fetch %.0fs" % (time.time() - t0))
    day_pos, ranks = build_volrank(data, dates) if USE_VOLRANK else (None, None)
    all_days = sorted(dates)
    cutoff = all_days[int(len(all_days) * 0.66)]          # 66% IS / 34% OOS
    span = (all_days[-1] - all_days[0]) / 86400000.0
    m_all, m_is, m_oos = span / 30.0, span * 0.66 / 30.0, span * 0.34 / 30.0

    def summ(trs, mo):
        mm = metrics(trs, mo) if trs else {"n": 0}
        return {k: mm.get(k) for k in ("n", "per_month", "win_rate", "expectancy",
                                       "profit_factor", "payoff", "max_dd")}

    results = []
    for mt in MOVE_THRESHES:
        for vm in VOL_MULTS:
            for at in ANTITOP:
                tr = run(data, day_pos, ranks, mt, vm, at)
                istr = [x for x in tr if x["t"] < cutoff]
                oostr = [x for x in tr if x["t"] >= cutoff]
                row = {"move_thr": mt, "vol_mult": vm, "antitop": at,
                       "all": summ(tr, m_all), "is": summ(istr, m_is), "oos": summ(oostr, m_oos),
                       "rand_control": random_control(data, min(len(tr), 400), seed=1) if tr else None}
                results.append(row)
                print("[bt] mt=%s vm=%s at=%s | IS exp=%s n=%s | OOS exp=%s n=%s | ctrl=%s"
                      % (mt, vm, at, row["is"].get("expectancy"), row["is"].get("n"),
                        row["oos"].get("expectancy"), row["oos"].get("n"), row["rand_control"]))
    out = {"generated": int(time.time()), "days": DAYS, "universe": len(data),
           "cutoff_iso": time.strftime("%Y-%m-%d", time.gmtime(cutoff / 1000)),
           "fee": FEE, "params": {"lookback": LOOKBACK, "atr_mult": ATR_MULT,
           "scaleout_r": SCALEOUT_R, "scaleout_frac": SCALEOUT_FRAC},
           "results": sorted(results, key=lambda x: (x["oos"].get("expectancy") or -99), reverse=True)}
    json.dump(out, open("/tmp/bt_results.json", "w"), indent=1)
    gh_put("docs/_btres.json", json.dumps(out, indent=1).encode(), "bt results %d" % out["generated"])
    print("[bt] LISTO en %.0fs" % (time.time() - t0))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        err = {"error": str(e), "traceback": traceback.format_exc()[-3000:], "ts": int(time.time())}
        try:
            gh_put("docs/_btres.json", json.dumps(err, indent=1).encode(), "bt error")
        except Exception:
            pass
        print("[bt] ERROR:", e)
        raise

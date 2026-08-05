"""Backtest de la CONFIRMACION del Jardinero — event study.

No mide un hold (la tesis resuelve el hold: moonbag). Mide la SEÑAL:
cada vez que se dispara la confirmacion semanal sobre una canasta de
proyectos, medimos el retorno HACIA ADELANTE a horizontes fijos y lo
comparamos contra comprar sin filtro (el cuchillo cayendo).

Pregunta unica que responde: ¿comprar tier-1 caido Y confirmado rinde
mejor hacia adelante que comprar tier-1 caido a secas?

Caveats (honestos, van en el reporte): n chico, sesgo de supervivencia
brutal (la canasta son los que zafaron), horizontes largos = intuicion
no prueba.

Corre SOLO cuando api.binance.com este en la allowlist.
Uso: python3 bt_confirmacion.py
"""
import json, time, sys, urllib.request, statistics as st

BINANCE = "https://api.binance.com/api/v3/klines"
DAY = 86400_000  # ms

# Canasta candidata PROVISIONAL (Agus firma la lista tier-1 real).
# Alts vivas con historia larga en Binance, varias narrativas.
BASKET = [
    "SOLUSDT","BNBUSDT","ADAUSDT","AVAXUSDT","DOTUSDT","LINKUSDT","ATOMUSDT",
    "NEARUSDT","INJUSDT","RUNEUSDT","AAVEUSDT","UNIUSDT","ARBUSDT","OPUSDT",
    "APTUSDT","SUIUSDT","FETUSDT","GRTUSDT","IMXUSDT","SANDUSDT","MANAUSDT",
    "AXSUSDT","FILUSDT","ALGOUSDT","XTZUSDT","THETAUSDT","LDOUSDT","RENDERUSDT",
    "TIAUSDT","SEIUSDT","DYDXUSDT","STXUSDT","EGLDUSDT","FLOWUSDT","CHZUSDT",
]

HORIZONS = [30, 90, 180, 365, 730]  # dias hacia adelante

# Variantes de media larga a competir
MA_VARIANTS = [
    ("SMA30w", "1w", 30, "sma"),
    ("EMA30w", "1w", 30, "ema"),
    ("SMA40w", "1w", 40, "sma"),   # ~200 dias, lenta/segura
    ("EMA40w", "1w", 40, "ema"),
]
SLOPE_K = 4        # semanas para exigir media plana/subiendo
RS_LOOKBACK = 12   # semanas de fuerza relativa vs BTC


def fetch_klines(symbol, interval, start_ms=0):
    """Baja klines paginando. Devuelve [[openTime, open, high, low, close, vol], ...]."""
    out, cur = [], start_ms
    for _ in range(20):
        url = f"{BINANCE}?symbol={symbol}&interval={interval}&startTime={cur}&limit=1000"
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                data = json.load(r)
        except Exception as e:
            if not out:
                raise
            break
        if not data:
            break
        for k in data:
            out.append([int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])])
        if len(data) < 1000:
            break
        cur = data[-1][0] + 1
        time.sleep(0.15)
    return out


def sma(vals, n, i):
    if i + 1 < n:
        return None
    return sum(vals[i - n + 1:i + 1]) / n


def ema_series(vals, n):
    k = 2 / (n + 1)
    out = [None] * len(vals)
    e = None
    for i, v in enumerate(vals):
        e = v if e is None else v * k + e * (1 - k)
        out[i] = e if i + 1 >= n else None
    return out


def daily_close_at(daily, ts_ms):
    """Cierre diario en o justo despues de ts_ms."""
    for d in daily:
        if d[0] >= ts_ms:
            return d[4]
    return None


def fwd_return(daily, entry_ts, days):
    p0 = daily_close_at(daily, entry_ts)
    p1 = daily_close_at(daily, entry_ts + days * DAY)
    if p0 is None or p1 is None or p0 <= 0:
        return None
    return (p1 / p0) - 1.0


def confirmations(weekly, btc_weekly, variant):
    """Devuelve lista de timestamps (ms) de eventos de confirmacion fresca:
    cierre semanal cruza ARRIBA de la media (esta semana arriba, la previa
    abajo), media plana/subiendo, y fuerza relativa vs BTC positiva."""
    _, iv, n, mtype = variant
    closes = [w[4] for w in weekly]
    if len(closes) < n + SLOPE_K + 2:
        return []
    ma = ema_series(closes, n) if mtype == "ema" else [sma(closes, n, i) for i in range(len(closes))]
    # mapa BTC time->close para RS
    btc = {w[0]: w[4] for w in btc_weekly}
    events = []
    armed = False  # cruzó arriba de la media y sigue arriba, esperando que la media gire
    fired = False  # ya disparó esta pierna (no re-disparar hasta volver abajo)
    for i in range(1, len(weekly)):
        if ma[i] is None:
            continue
        above = closes[i] > ma[i]
        if not above:
            armed = False
            fired = False
            continue
        # precio arriba de la media
        if ma[i - 1] is not None and closes[i - 1] <= ma[i - 1]:
            armed = True  # acaba de cruzar arriba
        if not armed or fired:
            continue
        # ¿la media ya giró (plana o subiendo en SLOPE_K semanas)?
        if i - SLOPE_K < 0 or ma[i - SLOPE_K] is None:
            continue
        slope_ok = ma[i] >= ma[i - SLOPE_K]
        if not slope_ok:
            continue
        # fuerza relativa vs BTC en RS_LOOKBACK semanas
        j = i - RS_LOOKBACK
        rs_ok = True
        if j >= 0:
            t_now, t_then = weekly[i][0], weekly[j][0]
            b_now = btc.get(t_now); b_then = btc.get(t_then)
            if b_now and b_then and b_then > 0 and closes[j] > 0:
                rs_ok = (closes[i] / closes[j] - 1) > (b_now / b_then - 1)
        if rs_ok:
            events.append(weekly[i][0])
            fired = True
    return events


def dip_weeks(weekly, variant):
    """Baseline 'cuchillo': semanas con precio POR DEBAJO de la media (barato
    sin confirmacion). Timestamps de esas semanas."""
    _, iv, n, mtype = variant
    closes = [w[4] for w in weekly]
    ma = ema_series(closes, n) if mtype == "ema" else [sma(closes, n, i) for i in range(len(closes))]
    return [weekly[i][0] for i in range(len(weekly)) if ma[i] and closes[i] < ma[i]]


def dist(xs):
    xs = [x for x in xs if x is not None]
    if not xs:
        return None
    xs.sort()
    return {
        "n": len(xs),
        "med": round(st.median(xs) * 100, 1),
        "mean": round(sum(xs) / len(xs) * 100, 1),
        "hit": round(100 * sum(1 for x in xs if x > 0) / len(xs), 1),
    }


def main():
    print("Bajando BTC semanal (para fuerza relativa)...")
    btc_w = fetch_klines("BTCUSDT", "1w")
    data = {}
    for sym in BASKET:
        try:
            wk = fetch_klines(sym, "1w")
            dl = fetch_klines(sym, "1d")
            if len(wk) > 45 and dl:
                data[sym] = (wk, dl)
                print(f"  {sym:12s} wk={len(wk)} dl={len(dl)}")
            else:
                print(f"  {sym:12s} SKIP (historia corta)")
        except Exception as e:
            print(f"  {sym:12s} ERR {str(e)[:50]}")
        time.sleep(0.1)

    print(f"\nSimbolos usables: {len(data)}\n")
    print("=" * 78)
    for variant in MA_VARIANTS:
        name = variant[0]
        conf_ret = {h: [] for h in HORIZONS}
        dip_ret = {h: [] for h in HORIZONS}
        n_events = 0
        for sym, (wk, dl) in data.items():
            evs = confirmations(wk, btc_w, variant)
            n_events += len(evs)
            for ts in evs:
                for h in HORIZONS:
                    conf_ret[h].append(fwd_return(dl, ts, h))
            for ts in dip_weeks(wk, variant):
                for h in HORIZONS:
                    dip_ret[h].append(fwd_return(dl, ts, h))
        print(f"\n### {name}  |  eventos de confirmacion: {n_events}")
        print(f"{'horizonte':>10} | {'CONFIRMADO (med/mean/hit%)':>34} | {'CUCHILLO baseline':>28}")
        for h in HORIZONS:
            c = dist(conf_ret[h]); d = dist(dip_ret[h])
            cs = f"n={c['n']:<4} {c['med']:+6.1f}/{c['mean']:+6.1f}/{c['hit']:4.0f}" if c else "sin datos"
            ds = f"n={d['n']:<5} {d['med']:+6.1f}/{d['mean']:+6.1f}/{d['hit']:4.0f}" if d else "sin datos"
            edge = ""
            if c and d:
                edge = "  <-- EDGE" if c["med"] > d["med"] else "  (sin edge)"
            print(f"{h:>8}d  | {cs:>34} | {ds:>28}{edge}")
    print("\n" + "=" * 78)
    print("Lectura: si CONFIRMADO no le gana al CUCHILLO en mediana, el filtro no")
    print("tiene edge y se descarta. n chico + sesgo de supervivencia => direccional.")


if __name__ == "__main__":
    main()

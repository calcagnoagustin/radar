"""Pescador v1. Captura una fraccion de explosiones ULTRA confirmadas.

Complementa a Ganesha, no lo reemplaza. Ganesha entra en el breakout, se come
los falsos y cuando la pega se queda con todo el movimiento. El Pescador no
adivina: espera a que el rally ya sea un hecho publico (volumen y precio ya
explotaron), entra con capital grande, se lleva +15% y se va en 24h.

REGLAS (todas salidas de medicion sobre 77 confirmaciones, abr'25 - jul'26):
  1. Confirmacion:  volumen 24h >= $10M absolutos
                    volumen 24h >= 15x la mediana de los 20 dias previos
                    dia >= +8%   y   semana >= +20%
  2. TP  = +15%   (medido: +15 le gana a +20 en casi toda config)
  3. SL  = -20%   (medido: con -8% el sistema PIERDE. Toda la ventaja esta
                   en aguantar la sacudida inicial. El stop ancho no es
                   descuido, es la condicion del edge.)
  4. Salida forzada a las 24h pase lo que pase.

Resultado de la simulacion de cartera ($1000, fees 0.1%, cash compartido):
  120 dias : +$556 con -9.0% de drawdown (tamano 25%)
  15 meses : esperanza +3.95%/op, 44 ganadas contra 11 paradas de 77
             ALZA de BTC 16-0 (+8.36%) | BAJA 28-9 (+3.25%)
CAVEATS reales: n=77, sesgo de supervivencia (el universo son los pares con
volumen HOY), y CERO validacion hacia adelante. Ver NOTAS al final.

MODO POR DEFECTO: PAPER. Para pasar a real hace falta el archivo LIVE + keys.
Eso lo hace Agus a mano. Este script NO lo hace solo.
"""
import json, os, time, statistics as st

import ccxt

try:
    import notify
except Exception:                                    # pragma: no cover
    notify = None

BASE = os.path.dirname(os.path.abspath(__file__))
PDIR = os.path.join(BASE, "pescador")
PSTATE = os.path.join(PDIR, "state.json")
PLOG = os.path.join(PDIR, "events.jsonl")
LIVEFLAG = os.path.join(PDIR, "LIVE")
KEYS = os.path.join(PDIR, "keys.json")

P = {
    # --- confirmacion (dial duro sobre el mismo escaner de Ganesha) ---
    "min_qv_usd": 10_000_000,    # volumen 24h absoluto minimo
    "vol_ratio": 15.0,           # x la mediana de 20 dias
    "min_day_pct": 8.0,          # cambio del dia
    "min_week_pct": 20.0,        # cambio de 7 dias
    "vol_median_n": 20,
    # --- gestion ---
    "tp_pct": 15.0,
    "sl_pct": 20.0,
    "max_hold_h": 24.0,
    # --- capital ---
    "size_pct": 25.0,            # % del equity por entrada
    "max_open": 4,
    "min_notional": 12.0,
    "cooldown_h": 20.0,          # no re-entrar al mismo simbolo antes de esto
}


# --------------------------------------------------------------------------
# infraestructura
# --------------------------------------------------------------------------
def load(p, d):
    try:
        return json.load(open(p))
    except Exception:
        return d


def save(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=1)
    os.replace(tmp, p)


def log(ev):
    ev["ts"] = time.time()
    ev["iso"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    os.makedirs(PDIR, exist_ok=True)
    with open(PLOG, "a") as f:
        f.write(json.dumps(ev) + "\n")
    print("[pescador]", json.dumps(ev))


def alert(sym, kind, msg):
    if notify is None:
        return
    try:
        notify.exec_alert(sym, kind, msg)
    except Exception as e:
        log({"type": "warn", "msg": "notify: " + str(e)[:80]})


def get_ex():
    """Devuelve (exchange, live). Live SOLO con flag LIVE + keys presentes."""
    live = os.path.exists(LIVEFLAG)
    creds = None
    if live:
        k = load(KEYS, {})
        if k.get("apiKey") and k.get("secret"):
            creds = k
        else:
            live = False
            log({"type": "warn", "msg": "LIVE presente pero sin keys; sigo en paper"})
    cfg = {"enableRateLimit": True}
    if creds:
        cfg.update({"apiKey": creds["apiKey"], "secret": creds["secret"]})
    return ccxt.binance(cfg), live


# --------------------------------------------------------------------------
# deteccion
# --------------------------------------------------------------------------
def btc_regime(ex):
    """Contexto de mercado. NO filtra: solo se loggea para poder decidir mas
    adelante, con datos propios, si conviene modular el tamano por regimen.
    Medido: sobre EMA200 -> 16-0 (+8.36%); bajo EMA200 -> 28-11 (+1.95%)."""
    try:
        d = ex.fetch_ohlcv("BTC/USDT", "1d", limit=210)[:-1]
        c = [x[4] for x in d]
        if len(c) < 200:
            return None
        ema200 = sum(c[-200:]) / 200
        return {"px": c[-1], "ema200": round(ema200, 2),
                "sobre_ema200": c[-1] > ema200,
                "vs_ema200_pct": round(100 * (c[-1] / ema200 - 1), 2),
                "btc30_pct": round(100 * (c[-1] / c[-31] - 1), 2) if len(c) > 31 else None}
    except Exception as e:
        log({"type": "warn", "msg": "btc_regime: " + str(e)[:80]})
        return None


def prefiltro(ex):
    """Mismo universo que Ganesha (todo Binance /USDT), pero con el dial duro.
    Filtra por ticker primero: 1 request, evita bajar OHLCV de 400 pares."""
    try:
        tk = ex.fetch_tickers()
    except Exception as e:
        log({"type": "error", "msg": "fetch_tickers: " + str(e)[:100]})
        return []
    cand = []
    for s, t in tk.items():
        if not s.endswith("/USDT"):
            continue
        qv = t.get("quoteVolume") or 0
        pc = t.get("percentage") or 0
        if qv >= P["min_qv_usd"] and pc >= P["min_day_pct"]:
            cand.append((s, qv, pc))
    cand.sort(key=lambda x: -x[1])
    return cand[:40]


def confirmar(ex, sym, qv_hoy, pc_hoy):
    """Segunda pasada sobre velas diarias: semana >= +20% y volumen >= 15x."""
    try:
        d = ex.fetch_ohlcv(sym, "1d", limit=P["vol_median_n"] + 10)
    except Exception:
        return None
    if len(d) < P["vol_median_n"] + 8:
        return None
    hoy = d[-1]
    prev = d[:-1]
    c = [x[4] for x in prev]
    q = [x[5] * x[4] for x in prev]
    if len(c) < 8:
        return None
    wk = 100 * (hoy[4] / c[-7] - 1) if c[-7] > 0 else 0
    med = st.median(q[-P["vol_median_n"]:]) or 1
    qv = hoy[5] * hoy[4] or qv_hoy
    vr = qv / med
    if wk < P["min_week_pct"] or vr < P["vol_ratio"]:
        return None
    return {"symbol": sym, "px": hoy[4], "dia_pct": round(pc_hoy, 2),
            "sem_pct": round(wk, 2), "vol_ratio": round(vr, 1),
            "qv_musd": round(qv / 1e6, 1)}


# --------------------------------------------------------------------------
# ordenes
# --------------------------------------------------------------------------
def place_oco(ex, sym, qty, tp, sl):
    """TP y SL nativos en Binance. Es lo que hace al bot resistente: si la VM
    se cae, la posicion sigue protegida y el objetivo sigue vivo."""
    try:
        q = float(ex.amount_to_precision(sym, qty))
        tp_p = float(ex.price_to_precision(sym, tp))
        sl_p = float(ex.price_to_precision(sym, sl))
        sl_lim = float(ex.price_to_precision(sym, sl * 0.985))
        o = ex.private_post_order_oco({
            "symbol": ex.market(sym)["id"], "side": "SELL",
            "quantity": ex.amount_to_precision(sym, q),
            "price": ex.price_to_precision(sym, tp_p),
            "stopPrice": ex.price_to_precision(sym, sl_p),
            "stopLimitPrice": ex.price_to_precision(sym, sl_lim),
            "stopLimitTimeInForce": "GTC"})
        ids = [str(x.get("orderId")) for x in o.get("orders", [])]
        return {"kind": "oco", "listId": str(o.get("orderListId")), "ids": ids}
    except Exception as e:
        log({"type": "warn", "symbol": sym, "msg": "oco fallo: " + str(e)[:120]})
    # fallback: al menos el stop nativo
    try:
        q = float(ex.amount_to_precision(sym, qty))
        sp = float(ex.price_to_precision(sym, sl))
        lp = float(ex.price_to_precision(sym, sl * 0.985))
        o = ex.create_order(sym, "limit", "sell", q, lp, {"stopPrice": sp})
        return {"kind": "stop", "listId": None, "ids": [str(o["id"])]}
    except Exception as e:
        log({"type": "error", "symbol": sym, "msg": "stop fallback: " + str(e)[:120]})
        return None


def cancel_protection(ex, sym, prot):
    if not prot:
        return
    for oid in prot.get("ids", []):
        try:
            ex.cancel_order(oid, sym)
        except Exception:
            pass


def sell_market(ex, sym, qty):
    base = sym.split("/")[0]
    try:
        free = ex.fetch_balance().get(base, {}).get("free", 0)
    except Exception:
        free = qty
    q = float(ex.amount_to_precision(sym, min(qty, free)))
    if q <= 0:
        return None
    return ex.create_order(sym, "market", "sell", q)


# --------------------------------------------------------------------------
# gestion de posiciones abiertas
# --------------------------------------------------------------------------
def gestionar(ex, live, stt):
    """Cierra por tiempo, detecta TP/SL ya ejecutados, reconcilia ventas
    manuales. Corre en cada corrida, antes de buscar entradas nuevas."""
    ahora = time.time()
    for sym in list(stt["positions"].keys()):
        pos = stt["positions"][sym]
        try:
            px = ex.fetch_ticker(sym)["last"]
        except Exception as e:
            log({"type": "warn", "symbol": sym, "msg": "ticker: " + str(e)[:80]})
            continue

        # --- 1) en live: la posicion pudo cerrarse sola por OCO ---
        if live:
            try:
                base = sym.split("/")[0]
                real = float(ex.fetch_balance().get(base, {}).get("total", 0) or 0)
            except Exception:
                real = pos["qty"]
            if real * px < P["min_notional"] * 0.5:
                pnl = pos["qty"] * (px - pos["entry"])
                cerrar_registro(stt, sym, pos, px, pnl, "oco_o_manual")
                continue
            if real < pos["qty"] * 0.95:
                pos["qty"] = real

        # --- 2) salida forzada por tiempo ---
        horas = (ahora - pos["abierta_ts"]) / 3600.0
        if horas >= P["max_hold_h"]:
            if live:
                cancel_protection(ex, sym, pos.get("prot"))
                try:
                    sell_market(ex, sym, pos["qty"])
                except Exception as e:
                    log({"type": "error", "symbol": sym,
                         "msg": "venta por tiempo: " + str(e)[:100]})
                    continue
            pnl = pos["qty"] * (px - pos["entry"])
            cerrar_registro(stt, sym, pos, px, pnl, "tiempo_24h")
            continue

        # --- 3) en paper no hay OCO: simulo TP/SL con el precio actual ---
        if not live:
            if px >= pos["tp"]:
                cerrar_registro(stt, sym, pos, pos["tp"],
                                pos["qty"] * (pos["tp"] - pos["entry"]), "tp")
            elif px <= pos["sl"]:
                cerrar_registro(stt, sym, pos, pos["sl"],
                                pos["qty"] * (pos["sl"] - pos["entry"]), "sl")


def cerrar_registro(stt, sym, pos, px, pnl, motivo):
    horas = round((time.time() - pos["abierta_ts"]) / 3600.0, 1)
    ret = 100 * (px / pos["entry"] - 1)
    stt["realized_pnl"] = round(stt.get("realized_pnl", 0) + pnl, 4)
    stt["trades_total"] = stt.get("trades_total", 0) + 1
    if pnl > 0:
        stt["wins"] = stt.get("wins", 0) + 1
    stt["closed"].append({
        "symbol": sym, "entry": pos["entry"], "exit": round(px, 10),
        "qty": pos["qty"], "pnl": round(pnl, 4), "ret_pct": round(ret, 2),
        "motivo": motivo, "horas": horas,
        "btc_sobre_ema200": pos.get("btc_sobre_ema200"),
        "vol_ratio": pos.get("vol_ratio"), "qv_musd": pos.get("qv_musd"),
        "closed_ts": time.time()})
    stt["closed"] = stt["closed"][-200:]
    stt["cooldown"][sym] = time.time()
    del stt["positions"][sym]
    log({"type": "CLOSE", "symbol": sym, "motivo": motivo, "px": px,
         "ret_pct": round(ret, 2), "pnl": round(pnl, 2), "horas": horas})
    alert(sym, "PESCADOR_CLOSE",
          f"Pescador: cierre {sym} @ {px:.6g} ({ret:+.1f}%) por {motivo}, "
          f"pnl {pnl:+.2f} USDT en {horas}h")


# --------------------------------------------------------------------------
# entradas
# --------------------------------------------------------------------------
def equity(ex, live, stt):
    if not live:
        return stt.get("equity_paper", 1000.0)
    try:
        bal = ex.fetch_balance()
        free = float(bal.get("USDT", {}).get("free", 0) or 0)
        inv = 0.0
        for sym, pos in stt["positions"].items():
            try:
                inv += pos["qty"] * ex.fetch_ticker(sym)["last"]
            except Exception:
                inv += pos["qty"] * pos["entry"]
        return free + inv
    except Exception as e:
        log({"type": "warn", "msg": "equity: " + str(e)[:80]})
        return stt.get("equity_paper", 1000.0)


def cash_libre(ex, live, stt, eq):
    if not live:
        usado = sum(p["qty"] * p["entry"] for p in stt["positions"].values())
        return max(eq - usado, 0)
    try:
        return float(ex.fetch_balance().get("USDT", {}).get("free", 0) or 0)
    except Exception:
        return 0.0


def entrar(ex, live, stt, sig, eq, cash, reg):
    sym = sig["symbol"]
    px = sig["px"]
    notional = min(eq * P["size_pct"] / 100.0, cash * 0.97)
    if notional < P["min_notional"]:
        log({"type": "skip", "symbol": sym, "msg": "sin cash suficiente",
             "notional": round(notional, 2)})
        return False
    qty = notional / px
    tp = px * (1 + P["tp_pct"] / 100.0)
    sl = px * (1 - P["sl_pct"] / 100.0)
    prot = None
    if live:
        try:
            q = float(ex.amount_to_precision(sym, qty))
            o = ex.create_order(sym, "market", "buy", q)
            fill = o.get("average") or o.get("price") or px
            qty = float(o.get("filled") or q)
            px = float(fill)
            tp = px * (1 + P["tp_pct"] / 100.0)
            sl = px * (1 - P["sl_pct"] / 100.0)
        except Exception as e:
            log({"type": "error", "symbol": sym, "msg": "compra: " + str(e)[:120]})
            return False
        prot = place_oco(ex, sym, qty, tp, sl)
        if prot is None:
            log({"type": "error", "symbol": sym,
                 "msg": "SIN PROTECCION: cierro a mercado por seguridad"})
            try:
                sell_market(ex, sym, qty)
            except Exception:
                alert(sym, "PESCADOR_RIESGO",
                      f"Pescador: {sym} quedo SIN stop y no pude cerrar. Revisar a mano.")
            return False

    stt["positions"][sym] = {
        "entry": px, "qty": qty, "tp": tp, "sl": sl, "prot": prot,
        "abierta_ts": time.time(), "notional": round(qty * px, 4),
        "dia_pct": sig["dia_pct"], "sem_pct": sig["sem_pct"],
        "vol_ratio": sig["vol_ratio"], "qv_musd": sig["qv_musd"],
        "btc_sobre_ema200": (reg or {}).get("sobre_ema200"),
        "btc_vs_ema200_pct": (reg or {}).get("vs_ema200_pct")}
    log({"type": "ENTRY", "symbol": sym, "px": round(px, 10),
         "qty": round(qty, 8), "notional": round(qty * px, 2),
         "tp": round(tp, 10), "sl": round(sl, 10),
         "vol_ratio": sig["vol_ratio"], "qv_musd": sig["qv_musd"],
         "sem_pct": sig["sem_pct"], "modo": "LIVE" if live else "PAPER"})
    alert(sym, "PESCADOR_ENTRY",
          f"Pescador {'LIVE' if live else 'PAPER'}: entrada {sym} @ {px:.6g}, "
          f"${qty * px:.0f}, vol {sig['vol_ratio']}x, semana {sig['sem_pct']:+.0f}%. "
          f"TP {tp:.6g} / SL {sl:.6g}, salida forzada en {P['max_hold_h']:.0f}h.")
    return True


# --------------------------------------------------------------------------
# publicacion para el dashboard
# --------------------------------------------------------------------------
def publicar(stt, live, eq):
    cerr = stt.get("closed", [])
    n = len(cerr)
    wins = [c for c in cerr if c["pnl"] > 0]
    gl = sum(-c["pnl"] for c in cerr if c["pnl"] < 0)
    gw = sum(c["pnl"] for c in wins)
    out = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "modo": "LIVE" if live else "PAPER",
        "equity_now": round(eq, 2),
        "realized_pnl": round(stt.get("realized_pnl", 0), 2),
        "trades_total": stt.get("trades_total", 0),
        "win_rate": round(100 * len(wins) / n) if n else 0,
        "profit_factor": round(gw / gl, 2) if gl > 0 else (round(gw, 2) if gw else 0),
        "reglas": {"tp_pct": P["tp_pct"], "sl_pct": P["sl_pct"],
                   "max_hold_h": P["max_hold_h"], "size_pct": P["size_pct"],
                   "vol_ratio": P["vol_ratio"], "min_qv_usd": P["min_qv_usd"]},
        "open_positions": [
            {"symbol": s, "entry": p["entry"], "qty": p["qty"],
             "tp": p["tp"], "sl": p["sl"],
             "horas": round((time.time() - p["abierta_ts"]) / 3600.0, 1),
             "vol_ratio": p.get("vol_ratio")}
            for s, p in stt["positions"].items()],
        "recent_closed": cerr[-30:]}
    save(os.path.join(PDIR, "pescador_data.json"), out)
    publicar_repo(os.path.join(PDIR, "pescador_data.json"))
    return out


def _gh_token():
    import re
    for k in ("GH_TOKEN", "GITHUB_TOKEN", "GH_PAT", "DASHBOARD_TOKEN"):
        v = os.environ.get(k)
        if v and len(v) > 20:
            return v
    pat = re.compile(r"(?:GH_TOKEN|GITHUB_TOKEN|GH_PAT|DASHBOARD_TOKEN)"
                     r"\s*=\s*['\"]?([A-Za-z0-9_\-]{20,})")
    for p in (os.path.join(BASE, ".env"), os.path.join(BASE, "env"),
              "/home/opc/.env", "/opt/ganesha_bot/.env"):
        try:
            m = pat.search(open(p).read())
            if m:
                return m.group(1)
        except Exception:
            pass
    return None


def publicar_repo(path, repo="calcagnoagustin/radar", dest="docs/pescador_data.json"):
    """Sube el JSON al repo para que lo lea el dashboard. Silencioso si falla:
    no vale la pena tumbar una corrida por un problema de publicacion."""
    import base64, urllib.request
    tok = _gh_token()
    if not tok:
        log({"type": "warn", "msg": "sin token GitHub; no publico dashboard"})
        return False
    url = "https://api.github.com/repos/%s/contents/%s" % (repo, dest)
    hdr = {"Authorization": "Bearer " + tok,
           "Accept": "application/vnd.github+json", "User-Agent": "pescador"}
    sha = None
    try:
        rq = urllib.request.Request(url, headers=hdr)
        sha = json.load(urllib.request.urlopen(rq, timeout=30)).get("sha")
    except Exception:
        pass
    body = {"message": "pescador_data", "content":
            base64.b64encode(open(path, "rb").read()).decode()}
    if sha:
        body["sha"] = sha
    try:
        rq = urllib.request.Request(
            url, data=json.dumps(body).encode(),
            headers=dict(hdr, **{"Content-Type": "application/json"}), method="PUT")
        urllib.request.urlopen(rq, timeout=60)
        return True
    except Exception as e:
        log({"type": "warn", "msg": "publicar_repo: " + str(e)[:100]})
        return False


# --------------------------------------------------------------------------
def main():
    os.makedirs(PDIR, exist_ok=True)
    stt = load(PSTATE, {})
    stt.setdefault("positions", {})
    stt.setdefault("closed", [])
    stt.setdefault("cooldown", {})
    stt.setdefault("realized_pnl", 0.0)
    stt.setdefault("trades_total", 0)
    stt.setdefault("equity_paper", 1000.0)

    ex, live = get_ex()
    log({"type": "RUN", "modo": "LIVE" if live else "PAPER",
         "abiertas": len(stt["positions"])})

    gestionar(ex, live, stt)

    reg = btc_regime(ex)
    if reg:
        log({"type": "REGIMEN", **reg})

    eq = equity(ex, live, stt)
    cash = cash_libre(ex, live, stt, eq)

    if len(stt["positions"]) < P["max_open"] and cash >= P["min_notional"]:
        ahora = time.time()
        for sym, qv, pc in prefiltro(ex):
            if len(stt["positions"]) >= P["max_open"]:
                break
            if sym in stt["positions"]:
                continue
            cd = stt["cooldown"].get(sym, 0)
            if ahora - cd < P["cooldown_h"] * 3600:
                continue
            sig = confirmar(ex, sym, qv, pc)
            if not sig:
                continue
            log({"type": "CONFIRMACION", **sig})
            if entrar(ex, live, stt, sig, eq, cash, reg):
                cash = cash_libre(ex, live, stt, eq)

    if not live:
        stt["equity_paper"] = round(
            stt.get("equity_paper", 1000.0) + 0, 4)  # el pnl ya entra por realized

    eq = equity(ex, live, stt)
    save(PSTATE, stt)
    d = publicar(stt, live, eq)
    log({"type": "FIN", "equity": d["equity_now"], "abiertas": len(stt["positions"]),
         "trades": d["trades_total"], "wr": d["win_rate"], "pf": d["profit_factor"]})


if __name__ == "__main__":
    main()

# ---------------------------------------------------------------------------
# NOTAS DE INSTALACION Y LIMITES
# ---------------------------------------------------------------------------
# CRON sugerido (cada hora, para que la salida forzada de 24h sea puntual y
# para que en paper el TP/SL se evalue seguido):
#     7 * * * * cd /home/opc/bot_semillas && venv/bin/python3 pescador.py \
#               >> pescador/cron.log 2>&1
#
# En LIVE el TP y el SL viven en Binance como OCO: si la VM se cae, la
# posicion sigue protegida y el objetivo sigue vivo. Lo unico que necesita al
# bot corriendo es la salida forzada por tiempo.
#
# PARA PASAR A REAL (esto lo hace Agus, no el bot ni Claude):
#   1. crear pescador/keys.json con las keys de la sub-cuenta (spot-only,
#      IP restringida al VM, sin retiro)
#   2. crear el archivo vacio pescador/LIVE
#   3. fondear la sub-cuenta
# Sin esos tres pasos el bot corre en PAPER y no toca plata real.
#
# LIMITES QUE HAY QUE TENER PRESENTES:
#   - n=77 confirmaciones en 15 meses. Es poco. La diferencia entre 44-11 y
#     38-17 esta dentro del ruido de esa muestra.
#   - Sesgo de supervivencia: el universo se armo con los pares que HOY tienen
#     volumen. Los que explotaron y murieron no estan. Esto infla el resultado
#     una cantidad que no se puede estimar con estos datos.
#   - Cero validacion hacia adelante. Todo es historico.
#   - El size_pct de 25% es el conservador de la simulacion (+55% con -9% de
#     drawdown en 120 dias). A 40% daba +91% con -14%. No subirlo hasta tener
#     20-30 operaciones propias.
#   - El SL de -20% es ancho a proposito y NO se toca: con -8% el sistema
#     pierde plata. Si duele, la respuesta es bajar size_pct, no el stop.
#   - El regimen de BTC se loggea pero NO filtra ni modula. Con 30-40 trades
#     propios se decide si conviene, con datos sin sesgo de seleccion.

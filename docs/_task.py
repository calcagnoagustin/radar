# TASK: anatomia de ganadoras + grilla fast-fail, sobre datos propios de Ganesha
import base64, json, os, re, urllib.request
B = "/home/opc/bot_semillas"
L = B + "/learning"
OUT = {"t": "anatomia"}

# ---------- 1) reconstruir trades de Ganesha desde events.jsonl ----------
ev = []
for path in (L + "/events.jsonl", B + "/ejecutor/events.jsonl"):
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if not line:
                continue
            try:
                ev.append(json.loads(line))
            except Exception:
                pass
OUT["n_eventos"] = len(ev)

def ts_of(e):
    for k in ("ts", "time", "t"):
        if k in e:
            try:
                v = float(e[k])
                return v / 1000.0 if v > 1e11 else v
            except Exception:
                pass
    return None

abiertos, trades = {}, []
for e in sorted(ev, key=lambda x: ts_of(x) or 0):
    ty = str(e.get("type", ""))
    sym = e.get("symbol")
    t = ts_of(e)
    if not sym or t is None:
        continue
    if ty.endswith("_ENTRY"):
        abiertos[sym] = {"symbol": sym, "entry": e.get("px"), "stop": e.get("stop"),
                         "entry_ts": t, "tp1": False, "eventos": []}
    elif sym in abiertos:
        p = abiertos[sym]
        p["eventos"].append(ty)
        if "SCALE_OUT" in ty:
            p["tp1"] = True
        if ty.endswith("_STOP_OUT") or "MANUAL_CLOSE" in ty or ty.endswith("_TRAIL_OUT") or "CLOSE" in ty:
            p["close_ts"] = t
            p["exit"] = e.get("px")
            p["pnl"] = e.get("pnl")
            p["salida"] = ty
            if p.get("entry") and p.get("stop") and p["entry"] > p["stop"]:
                p["r"] = p["entry"] - p["stop"]
                trades.append(p)
            abiertos.pop(sym, None)
OUT["n_trades_reconstruidos"] = len(trades)
OUT["n_con_tp1"] = sum(1 for t in trades if t["tp1"])

# ---------- 2) velas ----------
def velas(sym):
    f = L + "/ohlcv/" + sym.replace("/", "_") + "_15m.json"
    if not os.path.exists(f):
        return None
    try:
        return json.load(open(f))
    except Exception:
        return None

def camino(tr):
    """Recorre las velas desde la entrada. Devuelve el perfil temporal en R."""
    v = velas(tr["symbol"])
    if not v:
        return None
    e, r = tr["entry"], tr["r"]
    ini = tr["entry_ts"] * 1000
    fin = tr.get("close_ts", 1e18) * 1000
    vv = [c for c in v if ini <= c[0] <= fin]
    if len(vv) < 2:
        return None
    hitos = {}
    max_r, min_r, max_r_ts = -99.0, 99.0, None
    peor_antes_de_1r, llego_1r = None, False
    for c in vv:
        h_r = (c[2] - e) / r          # maximo de la vela en R
        l_r = (c[3] - e) / r          # minimo de la vela en R
        horas = (c[0] - ini) / 3600000.0
        if l_r < min_r:
            min_r = l_r
        if h_r > max_r:
            max_r, max_r_ts = h_r, horas
        for nivel in (0.5, 1.0, 1.5, 2.0):
            k = "h_%.1fR" % nivel
            if k not in hitos and h_r >= nivel:
                hitos[k] = round(horas, 1)
        if not llego_1r:
            peor_antes_de_1r = min_r
            if h_r >= 1.0:
                llego_1r = True
    return {"max_r": round(max_r, 2), "min_r": round(min_r, 2),
            "h_max": round(max_r_ts, 1) if max_r_ts is not None else None,
            "mae_antes_1r": round(peor_antes_de_1r, 2) if peor_antes_de_1r is not None else None,
            "horas_total": round((vv[-1][0] - ini) / 3600000.0, 1),
            "n_velas": len(vv), **hitos}

gan, per, sin_datos = [], [], []
for tr in trades:
    c = camino(tr)
    fila = {"symbol": tr["symbol"], "tp1": tr["tp1"], "pnl": tr.get("pnl"),
            "salida": tr.get("salida"), "r_pct": round(tr["r"] / tr["entry"] * 100, 1)}
    if not c:
        sin_datos.append(fila["symbol"])
        continue
    fila.update(c)
    (gan if tr["tp1"] else per).append(fila)
OUT["ganadoras"] = gan
OUT["perdedoras"] = per[:25]
OUT["sin_velas"] = sin_datos

# ---------- 3) resumen comparativo ----------
def resumen(rows, campo):
    xs = [r[campo] for r in rows if r.get(campo) is not None]
    if not xs:
        return None
    xs = sorted(xs)
    return {"n": len(xs), "min": round(xs[0], 2), "p50": round(xs[len(xs) // 2], 2),
            "max": round(xs[-1], 2), "prom": round(sum(xs) / len(xs), 2)}
OUT["comparativa"] = {
    "ganadoras": {k: resumen(gan, k) for k in ("h_0.5R", "h_1.0R", "h_2.0R", "min_r", "mae_antes_1r", "max_r")},
    "perdedoras": {k: resumen(per, k) for k in ("h_0.5R", "h_1.0R", "min_r", "max_r")},
}

# ---------- 4) grilla fast-fail ----------
# Regla: si a las N horas la posicion nunca supero UMBRAL R -> salir al precio de esa hora.
grilla = []
for N in (4, 8, 12, 24, 36, 48, 72):
    for U in (0.0, 0.25, 0.5, 1.0):
        cortadas = ganadoras_matadas = 0
        r_total_orig = r_total_new = 0.0
        for tr in trades:
            c = camino(tr)
            if not c:
                continue
            v = velas(tr["symbol"])
            e, r = tr["entry"], tr["r"]
            ini = tr["entry_ts"] * 1000
            fin = tr.get("close_ts", 1e18) * 1000
            vv = [x for x in v if ini <= x[0] <= fin]
            if len(vv) < 2:
                continue
            r_final = (tr.get("exit", e) - e) / r if tr.get("exit") else 0.0
            r_total_orig += r_final
            max_hasta_N, px_en_N = -99.0, None
            for x in vv:
                horas = (x[0] - ini) / 3600000.0
                if horas <= N:
                    max_hasta_N = max(max_hasta_N, (x[2] - e) / r)
                    px_en_N = x[4]
                else:
                    break
            if px_en_N is not None and max_hasta_N < U and (vv[-1][0] - ini) / 3600000.0 > N:
                cortadas += 1
                r_total_new += (px_en_N - e) / r
                if tr["tp1"] or r_final > 0:
                    ganadoras_matadas += 1
            else:
                r_total_new += r_final
        grilla.append({"horas": N, "umbral_R": U, "cortadas": cortadas,
                       "ganadoras_matadas": ganadoras_matadas,
                       "R_original": round(r_total_orig, 2),
                       "R_con_regla": round(r_total_new, 2),
                       "delta_R": round(r_total_new - r_total_orig, 2)})
grilla.sort(key=lambda x: -x["delta_R"])
OUT["grilla_fastfail"] = grilla

# ---------- publicar ----------
tok = ""
for Ln in open(B + "/.env"):
    m = re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)", Ln)
    if m:
        tok = m.group(1)
U2 = "https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_anatomia.json"
def R(m, d=None):
    q = urllib.request.Request(U2, data=d, method=m)
    q.add_header("Authorization", "token " + tok); q.add_header("User-Agent", "anat")
    return urllib.request.urlopen(q, timeout=30).read()
sha = None
try:
    sha = json.loads(R("GET")).get("sha")
except Exception:
    pass
p = {"message": "anatomia", "content": base64.b64encode(json.dumps(OUT, indent=1, default=str).encode()).decode()}
if sha:
    p["sha"] = sha
R("PUT", json.dumps(p).encode())
print("ANATOMIA OK")

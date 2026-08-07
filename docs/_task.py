# TASK: Ganesha v3 — atr_mult 2.5->2.0 + TIME STOP (capital muerto)
# Ediciones puntuales sobre el archivo REAL de la VM. Backup + compile + verify + rollback.
import base64, json, os, py_compile, re, shutil, subprocess, time, urllib.request

B = "/home/opc/bot_semillas"
GAN = B + "/ganesha_ejecutor.py"
LOOP = B + "/loop_analista.py"
STATE = B + "/ejecutor/state.json"

# ---- parametros de la nueva regla (aprobados por Agus) ----
MAX_HOLD_D = 10.0      # dias maximos sin progreso
MIN_R = 1.0            # "progreso" = haber tocado al menos 1R en algun momento
GRACE_D = 0.0          # sin gracia: corta desde la primera corrida (decision Agus 7/08)

info = {"task": "ganesha_v3_timestop", "now": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime()),
        "pasos": [], "params": {"atr_mult": 2.0, "max_hold_d": MAX_HOLD_D,
                                "min_r": MIN_R, "grace_d": GRACE_D}}
def step(s):
    info["pasos"].append(s); print("[gan-v3]", s)

# ============ EDICIONES ============
E_PARAMS_OLD = '''     "atr_n": 14, "atr_mult": 2.5,
     "scaleout_r": 2.0, "scaleout_frac": 0.30, "trail_after_r": 2.0}'''
E_PARAMS_NEW = '''     "atr_n": 14, "atr_mult": 2.0,
     "scaleout_r": 2.0, "scaleout_frac": 0.30, "trail_after_r": 2.0,
     "max_hold_d": %.1f, "time_stop_min_r": %.1f}

# TIME STOP: una posicion que no progresa es capital muerto. Si pasaron max_hold_d
# dias y nunca toco time_stop_min_r ni hizo TP1, se cierra a mercado y libera el
# capital. NUNCA mata una posicion que ya hizo TP1 (esa es la cola de ganancia:
# tiene stop en breakeven + trailing y se la deja correr).
TS_DEPLOY = %d          # epoch del deploy: gracia para las posiciones preexistentes
TS_GRACE_D = %.1f''' % (MAX_HOLD_D, MIN_R, int(time.time()), GRACE_D)

E_OPENED_OLD = '''                                        "opened": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}'''
E_OPENED_NEW = '''                                        "opened": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                        "opened_ts": time.time(), "max_r": 0.0}'''

E_TS_OLD = '''        close4 = c4h[-1][4]
        rmult = (px - pos["entry"]) / pos["r"]
        if close4 < pos["stop"]:'''
E_TS_NEW = '''        close4 = c4h[-1][4]
        rmult = (px - pos["entry"]) / pos["r"]
        pos["max_r"] = max(float(pos.get("max_r") or 0.0), rmult)

        # ---- TIME STOP: capital muerto ----
        _op = pos.get("opened_ts")
        if not _op:
            try:
                _op = time.mktime(time.strptime(pos.get("opened", ""), "%Y-%m-%dT%H:%M:%SZ")) - time.timezone
            except Exception:
                _op = None
            pos["opened_ts"] = _op
        _age_d = ((time.time() - _op) / 86400.0) if _op else 0.0
        _grace_ok = time.time() >= TS_DEPLOY + TS_GRACE_D * 86400
        if (P.get("max_hold_d") and _grace_ok and not pos["so"]
                and _age_d >= P["max_hold_d"] and pos["max_r"] < P["time_stop_min_r"]):
            if live and pos.get("mode") == "LIVE":
                cancel_stop(ex, sym, pos.get("stop_oid"))
                try:
                    sell_market(ex, sym, pos["qty"])
                except Exception as e:
                    log({"type": "error", "symbol": sym,
                         "msg": "time_stop live: " + str(e)[:120]})
                    continue
            pnl = pos["qty"] * (px - pos["entry"])
            gs["paper_pnl"] += pnl
            log({"type": mode + "_STOP_OUT", "symbol": sym, "px": px,
                 "pnl": round(pnl, 2), "via": "time_stop",
                 "edad_d": round(_age_d, 1), "max_r": round(pos["max_r"], 2),
                 "r": round((px - pos["entry"]) / pos["r"], 2)})
            try:
                notify.exec_alert(sym, mode + "_TIME_STOP",
                                  f"Ejecutor {mode}: TIME STOP {sym} @ {px:.6g} tras {_age_d:.1f}d sin progreso (max {pos['max_r']:.2f}R), pnl {pnl:.2f} USDT")
            except Exception:
                pass
            del gs["positions"][sym]
            continue

        if close4 < pos["stop"]:'''

E_LOOP_OLD = "LIVE_ATR_MULT = 2.5"
E_LOOP_NEW = "LIVE_ATR_MULT = 2.0"

EDITS = [(GAN, E_PARAMS_OLD, E_PARAMS_NEW, "params atr_mult 2.0 + max_hold_d"),
         (GAN, E_OPENED_OLD, E_OPENED_NEW, "opened_ts + max_r en ENTRY"),
         (GAN, E_TS_OLD, E_TS_NEW, "bloque TIME STOP"),
         (LOOP, E_LOOP_OLD, E_LOOP_NEW, "loop_analista compara contra 2.0")]

baks = []
try:
    # 1) verificar que TODOS los anchors existan antes de tocar nada
    for path, old, new, desc in EDITS:
        src = open(path).read()
        n = src.count(old)
        if n != 1:
            raise Exception("anchor '%s' aparece %d veces en %s (esperaba 1)" % (desc, n, os.path.basename(path)))
    step("4/4 anchors verificados unicos")

    # 2) backups
    for path in {p for p, _, _, _ in EDITS}:
        bak = path + ".bak.pre_v3"
        if not os.path.exists(bak):
            shutil.copy2(path, bak)
        baks.append((path, bak))
        step("backup -> " + os.path.basename(bak))

    # 3) aplicar
    for path, old, new, desc in EDITS:
        src = open(path).read()
        open(path, "w").write(src.replace(old, new, 1))
        step("aplicado: " + desc)

    # 4) compile
    for path, _ in baks:
        py_compile.compile(path, doraise=True)
    step("py_compile OK")

    # 5) verificacion en vivo (sin tocar el exchange)
    test = ("import sys; sys.path.insert(0,%r); import ganesha_ejecutor as G, json;"
            "assert G.P['atr_mult']==2.0; assert G.P['max_hold_d']==%.1f;"
            "assert G.P['time_stop_min_r']==%.1f;"
            "import loop_analista as A; assert A.LIVE_ATR_MULT==2.0;"
            "print(json.dumps({'atr_mult':G.P['atr_mult'],'max_hold_d':G.P['max_hold_d'],"
            "'min_r':G.P['time_stop_min_r'],'grace_hasta':G.TS_DEPLOY+int(G.TS_GRACE_D*86400)}))"
            ) % (B, MAX_HOLD_D, MIN_R)
    r = subprocess.run([B + "/venv/bin/python", "-c", test],
                       capture_output=True, text=True, timeout=55, cwd=B)
    info["test_stdout"] = r.stdout[-800:]
    info["test_stderr"] = r.stderr[-600:]
    if r.returncode != 0:
        raise Exception("test rc=%d" % r.returncode)
    step("verificacion OK")

    # 6) foto de que posiciones caerian por time stop cuando venza la gracia
    try:
        gs = json.load(open(STATE))
        now = time.time()
        sim = []
        for s, p in (gs.get("positions") or {}).items():
            op = p.get("opened_ts")
            if not op:
                try:
                    op = time.mktime(time.strptime(p.get("opened", ""), "%Y-%m-%dT%H:%M:%SZ")) - time.timezone
                except Exception:
                    op = None
            age = round((now - op) / 86400.0, 1) if op else None
            sim.append({"symbol": s, "edad_d": age, "tp1": bool(p.get("so")),
                        "caeria": bool(age and age >= MAX_HOLD_D and not p.get("so"))})
        info["simulacion_time_stop"] = sorted(sim, key=lambda x: -(x["edad_d"] or 0))
        info["caerian"] = sum(1 for x in sim if x["caeria"])
        step("simulacion: %d de %d posiciones caerian al vencer la gracia" % (info["caerian"], len(sim)))
    except Exception as e:
        info["sim_error"] = str(e)[:200]

    info["ok"] = True
except Exception as e:
    info["ok"] = False
    info["error"] = str(e)[:400]
    for path, bak in baks:                      # ROLLBACK
        try:
            shutil.copy2(bak, path); step("ROLLBACK " + os.path.basename(path))
        except Exception:
            pass

# ---- reporte al repo ----
tok = ""
try:
    for L in open(B + "/.env"):
        m = re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)", L)
        if m:
            tok = m.group(1)
except Exception:
    pass
U = "https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m, d=None):
    q = urllib.request.Request(U, data=d, method=m)
    q.add_header("Authorization", "token " + tok); q.add_header("User-Agent", "ganv3")
    return urllib.request.urlopen(q, timeout=30).read()
sha = None
try:
    sha = json.loads(R("GET")).get("sha")
except Exception:
    pass
p = {"message": "ganesha v3 timestop", "content": base64.b64encode(json.dumps(info, indent=1).encode()).decode()}
if sha:
    p["sha"] = sha
try:
    R("PUT", json.dumps(p).encode()); print("REPORTADO ok=%s" % info.get("ok"))
except Exception as e:
    print("PUSH_ERR", e)

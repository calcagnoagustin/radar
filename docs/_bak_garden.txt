"""JARDINERO v2 — ejecuta la gestion de cartera mensual dictaminada por el CEREBRO.

El cerebro deja en state['garden_plan'] (una vez al mes):
  {"month": "YYYY-MM", "verdicts": [
     {"symbol": "X/USDT", "verdict": "reforzar|mantener|liquidar|dust",
      "dca_usdt": 25.0, "razon": "..."} ]}

Este modulo corre a diario y:
- REFORZAR: espera el timing (Stage 2 + cierre en maximo de N dias) y compra.
  Vetos duros: Stage 2 obligatorio (nunca promediar a la baja), presupuesto =
  USDT libre - GARDEN_RESERVE_USDT (las semillas y el colchon son intocables),
  tope GARDEN_MAX_COIN_FRAC de la subcuenta por moneda.
- LIQUIDAR: ejecuta SOLO sobre tesis ya cerradas (stopped_moonbag / frozen).
  Un moonbag con tesis viva solo genera recomendacion por mail (regla de Agus).
- Fin de mes sin ejecutar => aviso por mail (incluye 'sin presupuesto').
"""
import datetime
import config
import indicators as ind
import execlayer
import notify

def _month():
    return datetime.datetime.utcnow().strftime("%Y-%m")

def _free_usdt(ex):
    try:
        return float((ex.client.fetch_balance().get(config.QUOTE_ASSET) or {}).get("free", 0) or 0)
    except Exception:
        return 0.0

def _subaccount_equity(ex, state, free):
    eq = free
    for sym, p in state.get("positions", {}).items():
        try:
            if p.get("qty", 0) > 0:
                eq += p["qty"] * ex.price(sym)
        except Exception:
            pass
    return eq

def _timing_ok(ex, sym):
    ohlcv = ex.ohlcv(sym, "1d", limit=config.MA_PERIOD + config.SLOPE_LOOKBACK + 20)
    cl = ind.closes(ohlcv)
    stg = ind.stage(ohlcv, config.MA_PERIOD, config.SLOPE_LOOKBACK)
    n = config.GARDEN_TIMING_HIGH_D
    return stg == 2 and len(cl) > n and cl[-1] >= max(cl[-n:]), cl[-1]

def run(ex, state, DRY, run_id):
    acts = []
    plan = state.get("garden_plan") or {}
    mes = _month()
    if plan.get("month") != mes:
        return acts  # sin plan vigente este mes
    positions = state.get("positions", {})
    done = plan.setdefault("done", [])
    warned = plan.setdefault("warned", [])
    last_day_of_month = (datetime.date.today() + datetime.timedelta(days=1)).day == 1

    free = _free_usdt(ex) if not DRY else 9999.0
    budget = max(0.0, free - config.GARDEN_RESERVE_USDT)
    equity = _subaccount_equity(ex, state, free if not DRY else 0.0)

    for v in plan.get("verdicts", []):
        sym = v.get("symbol")
        verdict = (v.get("verdict") or "").lower()
        if not sym or sym in done:
            continue
        pos = positions.get(sym)

        if verdict == "reforzar":
            amt = float(v.get("dca_usdt") or 0)
            if amt <= 0 or not pos or pos.get("status") != "confirmed":
                continue
            # tope de exposicion por moneda
            try:
                px_now = ex.price(sym)
                expo = pos.get("qty", 0) * px_now
            except Exception:
                continue
            cap = equity * config.GARDEN_MAX_COIN_FRAC
            amt = min(amt, max(0.0, cap - expo))
            if amt < 5.0:
                if sym not in warned:
                    warned.append(sym)
                    acts.append({"symbol": sym, "type": "DCA_SKIP",
                                 "reason": f"tope {config.GARDEN_MAX_COIN_FRAC*100:.0f}% por moneda alcanzado"})
                continue
            if budget < amt:
                if last_day_of_month and sym not in warned:
                    warned.append(sym)
                    notify.send("Semillas — DCA no realizado",
                                f"<p>El refuerzo de {sym} (${amt:.0f}) no se ejecuto este mes: "
                                f"presupuesto insuficiente (libre ${free:.2f}, reserva "
                                f"${config.GARDEN_RESERVE_USDT:.0f}). Las semillas tienen prioridad.</p>")
                    acts.append({"symbol": sym, "type": "DCA_SIN_PRESUPUESTO",
                                 "reason": f"libre {free:.2f} < reserva+monto"})
                continue
            try:
                ok, price = _timing_ok(ex, sym)
            except Exception as e:
                acts.append({"symbol": sym, "type": "DCA_ERROR", "reason": str(e)[:120]})
                continue
            if not ok:
                if last_day_of_month and sym not in warned:
                    warned.append(sym)
                    notify.send("Semillas — DCA no realizado",
                                f"<p>El refuerzo de {sym} no encontro timing este mes "
                                f"(sin Stage 2 + maximo de {config.GARDEN_TIMING_HIGH_D} dias). "
                                f"Veto Weinstein: nunca promediar a la baja.</p>")
                    acts.append({"symbol": sym, "type": "DCA_SIN_TIMING", "reason": "veto Stage 2/timing"})
                continue
            res = execlayer.execute_buy_quote(ex, sym, amt, "GARDEN_DCA", run_id, DRY, price=price)
            if res["ok"] and res["filled"] > 0:
                old_qty = pos["qty"]
                pos["avg_cost"] = (pos["avg_cost"] * old_qty + (res["cost"] or amt)) / (old_qty + res["filled"])
                pos["qty"] = old_qty + res["filled"]
                pos["dca_adds"] = pos.get("dca_adds", 0) + 1
                budget -= (res["cost"] or amt)
                done.append(sym)
                acts.append({"symbol": sym, "type": "GARDEN_DCA", "price": price,
                             "reason": f"${amt:.0f} — {str(v.get('razon',''))[:120]}"})
                print(f"[garden] DCA {sym} ${amt:.0f} ejecutado")
            else:
                acts.append({"symbol": sym, "type": "DCA_ERROR", "reason": res["reason"]})

        elif verdict in ("liquidar", "dust"):
            if not pos or pos.get("qty", 0) <= 0:
                done.append(sym)
                continue
            if pos.get("status") in ("stopped_moonbag", "frozen"):
                res = execlayer.execute_sell_base(ex, sym, pos["qty"], "GARDEN_LIQ", run_id, DRY)
                if res["ok"] and res["filled"] > 0:
                    pos["qty"] -= res["filled"]
                    if pos["qty"] <= 1e-9:
                        pos["qty"] = 0
                        pos["status"] = "closed"
                    done.append(sym)
                    acts.append({"symbol": sym, "type": "GARDEN_LIQ",
                                 "reason": str(v.get("razon", ""))[:120]})
                else:
                    acts.append({"symbol": sym, "type": "LIQ_SKIP",
                                 "reason": res["reason"] + " (posible dust: convertir a BNB a mano)"})
                    done.append(sym)
            else:
                if sym not in warned:
                    warned.append(sym)
                    notify.send("Semillas — el cerebro recomienda cerrar " + sym,
                                f"<p>Dictamen: {v.get('razon','')}. La posicion tiene tesis viva "
                                f"(status {pos.get('status')}); por regla inviolable la decision es tuya.</p>")
                    acts.append({"symbol": sym, "type": "LIQ_RECOMENDADA",
                                 "reason": "moonbag/confirmada viva: decision de Agus"})
                done.append(sym)
    return acts

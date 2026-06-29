# Sistema Semillas 2.0 - codigo bot_semillas (snapshot 2026-06-29)
Bot de especulacion cripto Binance Spot. 15 archivos Python. SIN secretos (.env excluido).
Fixes recientes: qty real desde la orden (compra y DCA), doble-incremento dca_adds corregido, aviso de brain vacio, imports muertos limpiados, .env a 600.


## brain_monthly.py
```python
"""Cerebro mensual de seleccion (llama a Claude API con web_search).

Filosofia: filtro barato (triggers) primero; el LLM corre SOLO sobre lo que pasa
el filtro. Scout multi-senal: busca asimetrias tempranas (monedas que explotan)
con disciplina. Produce shortlist rankeado con fundamentales, senales y tesis.

Devuelve dict: {"regimen": "...", "summary": "...", "shortlist": [...], "raw": "..."}
"""
import json
import requests
import config

MODEL = "claude-opus-4-8"

SYSTEM = """Sos el cerebro de seleccion del Sistema Semillas 2.0: especulacion
disciplinada en Binance Spot (sin leverage, sin futuros). Tu trabajo es encontrar
monedas con potencial de EXPLOTAR temprano (asimetria grande), sin perder la
disciplina del sistema.

OBJETIVO
Detectar criptos en transicion Stage 1->2 (Weinstein) o en acumulacion Wyckoff,
ANTES del movimiento grande, con confirmacion tecnica. Buscas "el proximo Kite":
proyectos que arrancan a moverse con narrativa + volumen + interes creciente.

DOS CANASTAS (cubri las dos en cada run)
1) LAUNCHES RECIENTES de Binance: listings nuevos, Launchpool, Launchpad, Megadrop,
   HODLer Airdrops. Tickers recien salidos con volumen real. Marca type="launch".
2) HISTORICAS EN REACELERACION: proyectos con +1 ano de historia y liquidez sana
   que vuelven a despertar (ej. tipo FET y otros nombres AI/L1/L2/DePIN
   establecidos saliendo de base larga). Marca type="historica".
   (momentum generico de mediana data: type="momentum".)

INVESTIGACION MULTI-SENAL (usa web_search, cruza varias fuentes)
Para cada candidato junta y cita evidencia de:
- Google Trends / interes de busqueda subiendo en el token o su narrativa.
- Social: X/Twitter, Reddit, Telegram - menciones y sentimiento creciente.
- Binance: trending, spikes de volumen, nuevos listings/programas.
- On-chain / mercado: volumen, liquidez, market cap, holders, TVL si aplica.
- Narrativa de sector que esta rotando capital este mes.
El cruce de senales es lo predictivo: una sola senal no alcanza.

FUNDAMENTALES (obligatorio por candidato)
Explica que hace el proyecto, sector/narrativa, utilidad del token, por que AHORA
(catalizador concreto), y contexto de liquidez/market cap. Esto fundamenta la
compra y queda registrado en el historial.

DISCIPLINA (no negociable)
- No persigas Stage 3/4 ni cosas ya extendidas/parabolicas: buscas temprano.
- La senal tecnica manda sobre la narrativa. Sin estructura, no entra.
- Liquidez sana obligatoria (nada iliquido/manipulable).
- Se honesto con el riesgo; si no hay nada bueno, devolve shortlist corto o vacio.

REGIMEN
Lee el macro del mes (BTC, dominancia, condiciones) y devolve regimen:
"risk_on" (ofensivo), "neutral", o "risk_off" (defensivo, priorizar caja).

SALIDA
No mas de ~8 busquedas; despues ESCRIBI el JSON. Tu ULTIMO mensaje debe ser
EXCLUSIVAMENTE un JSON valido, sin markdown ni texto extra, con forma:
{"regimen":"risk_on|neutral|risk_off",
 "summary":"2-3 frases con la lectura macro del mes",
 "shortlist":[{"symbol":"XXX/USDT","rank":1,"type":"launch|historica|momentum",
   "stage":"1|2","thesis":"1-2 frases accionables: por que entrar",
   "fundamentals":"que hace, sector, utilidad, por que ahora",
   "catalyst":"evento/catalizador concreto",
   "signals":{"google_trends":"...","social":"...","binance":"...","onchain":"..."},
   "risk":"riesgo principal","sources":["url"]}]}
Exactamente 3 candidatos (las 3 mejores a 30 dias), rankeados por asimetria/conviccion. Cada uno operable en
Binance Spot, con liquidez sana. Prioriza calidad sobre cantidad."""


def run(candidates_context):
    """candidates_context: texto con los disparadores y datos tecnicos detectados."""
    if not config.ANTHROPIC_API_KEY:
        return {"shortlist": [], "summary": "ANTHROPIC_API_KEY no configurada.", "raw": ""}
    user = (
        "Disparadores y contexto tecnico detectados este ciclo:\n\n"
        + candidates_context
        + "\n\nResearchea con web_search las dos canastas (launches recientes de "
          "Binance e historicas en reaceleracion tipo FET), cruza senales "
          "(Google Trends, social, Binance trending, on-chain), y devolve el "
          "shortlist rankeado con fundamentales y tesis en el JSON especificado."
    )
    headers = {
        "x-api-key": config.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    messages = [{"role": "user", "content": user}]
    text = ""
    try:
        for _ in range(6):  # continua si la API devuelve pause_turn
            r = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json={
                    "model": MODEL,
                    "max_tokens": 8000,
                    "system": SYSTEM,
                    "messages": messages,
                    "tools": [{"type": "web_search_20250305", "name": "web_search",
                               "max_uses": 8}],
                },
                timeout=240,
            )
            data = r.json()
            content = data.get("content")
            if not content:
                return {"shortlist": [], "summary": "Cerebro: respuesta sin content (%s)" % str(data.get("error") or data.get("type")), "raw": json.dumps(data)[:2000]}
            blocks = [b.get("text", "") for b in content if b.get("type") == "text"]
            if blocks:
                text = blocks[-1]
            if data.get("stop_reason") == "pause_turn":
                messages.append({"role": "assistant", "content": content})
                continue
            break
        text = (text or "").strip()
        clean = text.replace("```json", "").replace("```", "").strip()
        a = clean.find("{"); b = clean.rfind("}")
        if a != -1 and b > a:
            clean = clean[a:b + 1]
        parsed = json.loads(clean)
        try:
            import tokenomics
            if isinstance(parsed.get("shortlist"), list):
                parsed["shortlist"] = tokenomics.annotate_shortlist(parsed["shortlist"])
        except Exception as _te:
            print("[brain] tokenomics skip:", str(_te)[:120])
        parsed.setdefault("regimen", "neutral")
        parsed["raw"] = text
        return parsed
    except Exception as e:
        return {"shortlist": [], "summary": f"Error en cerebro: {e}", "raw": text[:2000]}

```


## config.py
```python
"""Carga y validación de configuración desde .env."""
import os
from dotenv import load_dotenv

load_dotenv()


def _f(key, default):
    return float(os.getenv(key, default))


def _i(key, default):
    return int(os.getenv(key, default))


def _parse_tp(raw):
    """ '30:25,60:25,120:25' -> [(30.0, 25.0), (60.0, 25.0), (120.0, 25.0)] """
    levels = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        gain, frac = chunk.split(":")
        levels.append((float(gain), float(frac)))
    return sorted(levels, key=lambda x: x[0])


# --- Binance ---
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY", "")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET", "")
BINANCE_TESTNET = os.getenv("BINANCE_TESTNET", "true").lower() == "true"
QUOTE_ASSET = os.getenv("QUOTE_ASSET", "USDT")

# --- Email ---
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "")
EMAIL_TO = os.getenv("EMAIL_TO", "")

# --- Claude ---
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# --- Estrategia ---
MA_PERIOD = _i("MA_PERIOD", 30)
CONFIRM_DAYS = _i("CONFIRM_DAYS", 10)
SLOPE_LOOKBACK = _i("SLOPE_LOOKBACK", 5)

SEED_SIZE_USDT = _f("SEED_SIZE_USDT", 7)
MAX_SEEDS = _i("MAX_SEEDS", 60)
MAX_DCA_ADDS = _i("MAX_DCA_ADDS", 3)
DCA_SIZE_USDT = _f("DCA_SIZE_USDT", 7)

TP_LEVELS = _parse_tp(os.getenv("TP_LEVELS", "30:25,60:25,120:25"))
MOONBAG_PCT = _f("MOONBAG_PCT", 25)

FREEZE_DAYS = _i("FREEZE_DAYS", 60)

# --- Triggers ---
TRIGGER_WEEKLY_MOVE = _f("TRIGGER_WEEKLY_MOVE", 25)
TRIGGER_VOLUME_MULT = _f("TRIGGER_VOLUME_MULT", 3)
RSS_FEEDS = [u.strip() for u in os.getenv("RSS_FEEDS", "").split(",") if u.strip()]
RSS_KEYWORDS = [k.strip().lower() for k in os.getenv("RSS_KEYWORDS", "").split(",") if k.strip()]


def validate(require_trading=False):
    """Chequea que lo mínimo esté seteado. Devuelve lista de errores."""
    errs = []
    if not BINANCE_API_KEY or not BINANCE_API_SECRET:
        errs.append("Falta BINANCE_API_KEY / BINANCE_API_SECRET")
    if not RESEND_API_KEY:
        errs.append("Falta RESEND_API_KEY (reportes por email desactivados)")
    if not EMAIL_TO:
        errs.append("Falta EMAIL_TO")
    if require_trading and BINANCE_TESTNET:
        errs.append("BINANCE_TESTNET=true pero pediste modo real")
    return errs

SCAN_FEED = os.getenv("SCAN_FEED", "brain")
SCAN_TOP = _i("SCAN_TOP", 12)
SCAN_SHORTLIST_N = _i("SCAN_SHORTLIST_N", 3)

DCA_LADDER = [2, 3, 5]  # refuerzos escalonados en USDT (add 1, 2, 3)
SEEDS_PER_MONTH = _i("SEEDS_PER_MONTH", 3)
MOONBAG_FRAC = _f("MOONBAG_FRAC", 0.10)

```


## dashboard.py
```python
"""
dashboard.py — Publica el estado del Sistema Semillas 2.0 a GitHub Pages.

- Lee state.json (fuente de verdad), arma un payload publico (sin secretos)
  y lo sube como docs/dashboard_data.json al repo via GitHub Contents API.
- `--deploy` ademas sube docs/index.html (la cascara estatica, una sola vez).
- update() se llama al final de main.py; cualquier error se traga para no
  afectar nunca la corrida del bot.

Requiere en .env:  GITHUB_TOKEN   (fine-grained PAT, Contents: R/W sobre el repo)
Opcionales:        GITHUB_REPO=calcagnoagustin/semillaredes
                   GITHUB_BRANCH=main
                   CAPITAL_INICIAL=100
"""
import os, json, base64, datetime, pathlib

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

import requests

HERE      = pathlib.Path(__file__).resolve().parent
STATE_PATH= HERE / "state.json"
REPO      = os.getenv("GITHUB_REPO", "calcagnoagustin/semillaredes")
BRANCH    = os.getenv("GITHUB_BRANCH", "main")
TOKEN     = os.getenv("GITHUB_TOKEN", "")
CAPITAL   = float(os.getenv("CAPITAL_INICIAL", "100"))
API       = "https://api.github.com"

# Orden de prioridad para mostrar estados (abiertas primero, cerradas al final)
def _binance(sym): return sym.replace("/", "").upper()


def _rules():
    r = {"freeze_days": 60, "max_seeds": 3, "seed_size_usdt": 7}
    try:
        import config
        r["freeze_days"]    = getattr(config, "FREEZE_DAYS", r["freeze_days"])
        r["max_seeds"]      = getattr(config, "MAX_SEEDS", r["max_seeds"])
        r["seed_size_usdt"] = getattr(config, "SEED_SIZE_USDT", r["seed_size_usdt"])
    except Exception:
        pass
    return r


def build_payload():
    state = json.loads(STATE_PATH.read_text())
    positions = []
    for sym, p in (state.get("positions") or {}).items():
        positions.append({
            "symbol":       sym,
            "binance":      _binance(sym),
            "status":       p.get("status"),
            "qty":          p.get("qty", 0),
            "avg_cost":     p.get("avg_cost", 0),
            "dca_adds":     p.get("dca_adds", 0),
            "tp_hit":       p.get("tp_hit", []),
            "confirmed_at": p.get("confirmed_at"),
            "note":         p.get("note", ""),
        })
    # abiertas primero
    positions.sort(key=lambda x: (0 if (x["qty"] or 0) > 0 else 1, x["symbol"]))

    _free_usdt = None
    try:
        import ccxt as _ccxt, os as _os
        _ex = _ccxt.binance({"apiKey": _os.environ.get("BINANCE_API_KEY", ""), "secret": _os.environ.get("BINANCE_API_SECRET", ""), "enableRateLimit": True})
        _free_usdt = float(_ex.fetch_balance()["free"].get("USDT", 0))
    except Exception:
        _free_usdt = None
    return {
        "generated_at":     datetime.datetime.now(datetime.timezone.utc)
                              .strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cron":             "15 0 * * * (00:15 UTC / 21:15 ART)",
        "capital_inicial":  CAPITAL,
        "free_usdt": _free_usdt,
        "deposits":         state.get("deposits", []),
        "positions":        positions,
        "shortlist":        state.get("shortlist", []),
        "narrativa_active": state.get("narrativa_active"),
        "regimen": state.get("regimen", "neutral"),
        "last_brain_run":   state.get("last_brain_run"),
        "recent_closed": state.get("recent_closed", []),
        "shortlist_full": state.get("shortlist_full", []),
        "rules":            _rules(),
    }


def _headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def gh_put(repo_path, content_bytes, message):
    """Crea o actualiza un archivo en el repo via Contents API."""
    if not TOKEN:
        raise RuntimeError("GITHUB_TOKEN no esta seteado en .env")
    url = f"{API}/repos/{REPO}/contents/{repo_path}"
    # sha actual (si existe)
    sha = None
    g = requests.get(url, headers=_headers(), params={"ref": BRANCH}, timeout=20)
    if g.status_code == 200:
        sha = g.json().get("sha")
    body = {
        "message": message,
        "content": base64.b64encode(content_bytes).decode(),
        "branch":  BRANCH,
    }
    if sha:
        body["sha"] = sha
    r = requests.put(url, headers=_headers(), json=body, timeout=20)
    r.raise_for_status()
    return r.json()


def update():
    """Push del snapshot diario. Se llama desde main.py; nunca lanza."""
    try:
        payload = build_payload()
        gh_put("docs/dashboard_data.json",
               json.dumps(payload, ensure_ascii=False, indent=1).encode("utf-8"),
               f"dashboard: estado {payload['generated_at']}")
        print("[dashboard] data publicada OK")
        return True
    except Exception as e:
        print(f"[dashboard] update fallo (ignorado): {e}")
        return False


def deploy():
    """Sube la cascara index.html + el primer dashboard_data.json."""
    html = (HERE / "docs" / "index.html").read_text(encoding="utf-8")
    gh_put("docs/index.html", html.encode("utf-8"), "dashboard: shell index.html")
    payload = build_payload()
    gh_put("docs/dashboard_data.json",
           json.dumps(payload, ensure_ascii=False, indent=1).encode("utf-8"),
           "dashboard: snapshot inicial")
    print("[dashboard] deploy OK -> docs/index.html + docs/dashboard_data.json")


if __name__ == "__main__":
    import sys
    if "--deploy" in sys.argv:
        deploy()
    else:
        update()

```


## exchange.py
```python
"""Capa de acceso a Binance Spot vía ccxt. Soporta testnet (sandbox)."""
import ccxt
import config


class Exchange:
    def __init__(self):
        self.client = ccxt.binance({
            "apiKey": config.BINANCE_API_KEY,
            "secret": config.BINANCE_API_SECRET,
            "enableRateLimit": True,
            "options": {"defaultType": "spot"},
        })
        if config.BINANCE_TESTNET:
            self.client.set_sandbox_mode(True)
        self._markets = None

    # ---------- lectura ----------
    def markets(self):
        if self._markets is None:
            self._markets = self.client.load_markets()
        return self._markets

    def ohlcv(self, symbol, timeframe="1d", limit=200):
        """Devuelve lista de [ts, open, high, low, close, volume]."""
        return self.client.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)

    def price(self, symbol):
        return self.client.fetch_ticker(symbol)["last"]

    def tickers(self):
        """Todos los tickers 24h. Para ranking por volumen."""
        return self.client.fetch_tickers()

    def balance(self, asset=None):
        bal = self.client.fetch_balance()
        if asset:
            return bal.get("total", {}).get(asset, 0.0)
        return bal

    def deposits(self, since_ms=None):
        try:
            return self.client.fetch_deposits(since=since_ms)
        except Exception:
            return []

    # ---------- ejecución ----------
    def market_buy_quote(self, symbol, quote_amount):
        """Compra a mercado gastando 'quote_amount' de la quote (USDT)."""
        return self.client.create_order(
            symbol, "market", "buy", None, None,
            {"quoteOrderQty": quote_amount},
        )

    def market_sell_base(self, symbol, base_qty):
        """Vende a mercado 'base_qty' del activo base, acotado al balance LIBRE real."""
        base = symbol.split("/")[0]
        free = float((self.client.fetch_balance().get(base) or {}).get("free", 0) or 0)
        base_qty = min(float(base_qty), free)
        base_qty = float(self.client.amount_to_precision(symbol, base_qty))
        if base_qty <= 0:
            print(f"[sell] {symbol}: balance libre {free} insuficiente, venta omitida")
            return None
        try:
            _t = self.client.fetch_ticker(symbol)
            _last = float((_t or {}).get("last") or 0)
            if _last and base_qty * _last < self.min_notional(symbol):
                print("[sell] " + symbol + ": dust < min_notional, venta omitida")
                return None
        except Exception as _e:
            print("[sell] " + symbol + ": min_notional check fallo: " + str(_e)[:80])
        try:
            return self.client.create_order(symbol, "market", "sell", base_qty)
        except Exception as _e:
            print("[sell] " + symbol + ": orden rechazada: " + str(_e)[:140] + " -- sigo sin cortar")
            return None

    def min_notional(self, symbol):
        m = self.markets().get(symbol, {})
        limits = m.get("limits", {})
        cost = (limits.get("cost") or {}).get("min")
        return cost or 5.0  # fallback típico de Binance

```


## indicators.py
```python
"""Indicadores técnicos puros. Entrada: lista de velas OHLCV de ccxt.
Sin red ni estado -> fáciles de testear.
"""


def closes(ohlcv):
    return [c[4] for c in ohlcv]


def volumes(ohlcv):
    return [c[5] for c in ohlcv]


def sma(values, period):
    """Media móvil simple. Devuelve lista alineada (None hasta tener 'period')."""
    out = []
    for i in range(len(values)):
        if i + 1 < period:
            out.append(None)
        else:
            window = values[i + 1 - period:i + 1]
            out.append(sum(window) / period)
    return out


def slope(series, lookback):
    """Pendiente simple: valor actual - valor hace 'lookback'. >0 sube, <0 baja."""
    vals = [v for v in series if v is not None]
    if len(vals) <= lookback:
        return 0.0
    return vals[-1] - vals[-1 - lookback]


def pct_return(values, periods):
    if len(values) <= periods or values[-1 - periods] == 0:
        return 0.0
    return (values[-1] / values[-1 - periods] - 1) * 100


def volume_spike(ohlcv, window=20):
    """Ratio del volumen actual vs promedio de las últimas 'window' velas."""
    vols = volumes(ohlcv)
    if len(vols) < window + 1:
        return 1.0
    avg = sum(vols[-window - 1:-1]) / window
    if avg == 0:
        return 1.0
    return vols[-1] / avg


def stage(ohlcv, ma_period, slope_lookback):
    """Proxy de Stan Weinstein Stage Analysis.
       Stage 2 = precio > MA y MA en alza (tendencia alcista confirmada).
       Stage 4 = precio < MA y MA en baja (tendencia bajista -> invalidación).
       Devuelve: 2 (alcista), 4 (bajista), o 1/3 (transición/lateral).
    """
    cl = closes(ohlcv)
    ma = sma(cl, ma_period)
    if ma[-1] is None:
        return None
    price = cl[-1]
    ma_now = ma[-1]
    ma_slope = slope(ma, slope_lookback)

    if price > ma_now and ma_slope > 0:
        return 2
    if price < ma_now and ma_slope < 0:
        return 4
    if price > ma_now:
        return 3  # sobre MA pero MA aún no gira -> transición alcista
    return 1      # bajo MA pero MA no cae -> base/lateral


def consecutive_stage2(ohlcv, ma_period, slope_lookback, n):
    """¿Hubo Stage 2 sostenido los últimos 'n' días? Confirmación de entrada."""
    cl = closes(ohlcv)
    ma = sma(cl, ma_period)
    if len(cl) < ma_period + n + slope_lookback:
        return False
    for i in range(n):
        idx = len(cl) - 1 - i
        if ma[idx] is None:
            return False
        if cl[idx] <= ma[idx]:
            return False
        # pendiente local de la MA en ese punto
        if ma[idx] - ma[idx - slope_lookback] <= 0:
            return False
    return True

```


## main.py
```python
#!/usr/bin/env python3
"""Sistema Semillas 2.0 — Bot de ejecución diaria.

Corre una vez por día (cron). Flujo:
  1. Detecta depósitos nuevos (loggea separado del P&L).
  2. Gestiona cada posición abierta según las reglas Semillas (strategy.decide).
  3. Ejecuta las acciones resultantes en Binance (testnet o real).
  4. Evalúa triggers; si dispara o toca el ciclo mensual, despierta al cerebro.
  5. Manda reporte diario por email (Resend) y persiste estado.

Uso:
  python main.py            # corrida diaria normal
  python main.py --brain    # fuerza correr el cerebro mensual ahora
  python main.py --dry      # no ejecuta órdenes, solo simula y reporta
"""
import sys
from datetime import date

import config
import state as st
import dashboard
import strategy
import triggers
import notify
import brain_monthly
from exchange import Exchange
import seeds
import scanner

DRY = "--dry" in sys.argv
FORCE_BRAIN = "--brain" in sys.argv


def detect_deposits(ex, state):
    """Loggea depósitos nuevos para separarlos del P&L."""
    known = {(d["date"], d["amount"], d["asset"]) for d in state["deposits"]}
    new = []
    for d in ex.deposits():
        if d.get("status") not in ("ok", "completed", None):
            continue
        rec = {
            "date": (d.get("datetime") or "")[:10] or st.today_str(),
            "amount": float(d.get("amount") or 0),
            "asset": d.get("currency") or config.QUOTE_ASSET,
        }
        key = (rec["date"], rec["amount"], rec["asset"])
        if key not in known and rec["amount"] > 0:
            new.append(rec)
            state["deposits"].append(rec)
    return new


def execute(ex, action, pos, state):
    """Aplica una acción al exchange y actualiza el estado de la posición."""
    sym = action["symbol"]
    typ = action["type"]

    if typ == "ACTIVATE":
        # confirmación: pasa a 'confirmed' (la compra semilla ya estaba hecha)
        pos["status"] = "confirmed"
        pos["confirmed_at"] = st.today_str()

    elif typ == "DCA":
        # regimen POR MONEDA: strategy.py ya exige Stage 2 propio; sin gate global.
        adds = pos.get("dca_adds", 0)
        usdt_amt = config.DCA_LADDER[adds] if adds < len(config.DCA_LADDER) else config.DCA_LADDER[-1]
        free = float((ex.client.fetch_balance().get("USDT") or {}).get("free", 0) or 0)
        if free < usdt_amt:
            notify.funding_alert(sym, usdt_amt, free)
            print("[dca] " + sym + ": faltan fondos; aviso enviado"); return pos
        added_qty = usdt_amt / action["price"]   # fallback teorico
        added_cost = usdt_amt
        if not DRY:
            _o = ex.market_buy_quote(sym, usdt_amt) or {}
            _f = float(_o.get("filled") or 0)
            if _f > 0:
                added_qty = _f
                _c = float(_o.get("cost") or 0)
                added_cost = _c if _c > 0 else usdt_amt
        old_qty = pos["qty"]
        pos["avg_cost"] = (pos["avg_cost"] * old_qty + added_cost) / (old_qty + added_qty)
        pos["qty"] = old_qty + added_qty
        pos["dca_adds"] = adds + 1

    elif typ == "TAKE_PROFIT":
        sell_qty = pos["qty"] * (action["sell_frac"] / 100.0)
        if not DRY:
            ex.market_sell_base(sym, sell_qty)
        pos["qty"] -= sell_qty
        pos.setdefault("tp_hit", []).append(action["level"])
        # si ya bajamos al nivel moonbag, marcar moonbag
        sold_levels = len(pos["tp_hit"])
        if sold_levels >= len(config.TP_LEVELS):
            pos["status"] = "moonbag"

    elif typ == "STOP":
        # stop: preserva SIEMPRE moonbag testigo (regla inviolable, aunque vaya a cero)
        keep = pos["qty"] * config.MOONBAG_FRAC
        sell_qty = pos["qty"] - keep
        if sell_qty > 0 and not DRY:
            ex.market_sell_base(sym, sell_qty)
        pos["qty"] = keep
        pos["status"] = "moonbag"

    elif typ == "FREEZE":
        # liberar capital de semilla muerta
        if pos["qty"] > 0 and not DRY:
            ex.market_sell_base(sym, pos["qty"])
            pos["qty"] = 0
            pos["status"] = "frozen"
        elif pos["qty"] > 0 and DRY:
            print("[DRY] frozen sin vender; NO se cierra: " + sym)
        else:
            pos["status"] = "frozen"

    return pos


def manage_positions(ex, state):
    actions = []
    for sym, pos in list(state["positions"].items()):
        if pos.get("status") in ("closed", "frozen"):
            continue
        try:
            ohlcv = ex.ohlcv(sym, "1d", limit=config.MA_PERIOD + config.CONFIRM_DAYS + 20)
        except Exception as e:
            actions.append({"symbol": sym, "type": "ERROR", "reason": f"sin datos: {e}"})
            continue
        action = strategy.decide(sym, ohlcv, pos)
        if action and action["type"] not in ("HOLD",):
            _was_open = pos.get("qty", 0) > 0 and pos.get("status") not in ("closed", "frozen")
            _entry = pos.get("avg_cost", 0)
            _qty0 = pos.get("qty", 0)
            _thesis = pos.get("thesis", "")
            newpos = execute(ex, action, pos, state)
            state["positions"][sym] = newpos
            actions.append(action)
            if _was_open and newpos.get("status") == "closed":
                try:
                    _exit = float(ohlcv[-1][4])
                except Exception:
                    _exit = _entry
                if not _thesis:
                    for _c in state.get("shortlist_full", []):
                        if _c.get("symbol") == sym:
                            _thesis = _c.get("thesis", "")
                            break
                state.setdefault("recent_closed", []).append({
                    "symbol": sym, "entry": _entry, "exit": _exit,
                    "qty_total": round(_qty0, 8),
                    "action": (action.get("type", "") or "").lower(),
                    "pnl_net": round((_exit - _entry) * _qty0, 4),
                    "thesis": _thesis,
                    "opened_ts": pos.get("opened_ts"),
                    "closed_ts": __import__("time").time(),
                })
                state["recent_closed"] = state["recent_closed"][-1000:]
    return actions


def maybe_run_brain(ex, state, trig_hits):
    """Despierta el cerebro si: hay triggers, es nuevo mes, o se forzó."""
    today = date.today()
    last = state.get("last_brain_run")
    new_month = (last is None) or (last[:7] != today.isoformat()[:7])
    if not (trig_hits or new_month or FORCE_BRAIN):
        return None

    ctx_lines = [f"- {h['symbol']}: {h['signal']} ({h['detail']})" for h in trig_hits]
    ctx = "\n".join(ctx_lines) or "Sin triggers; corrida mensual de rutina."
    _sc = state.get("scanner_raw", [])
    if _sc:
        ctx = ctx + " || Scanner: " + "; ".join("%s sc %.1f st %s m30 %s%% tr %s" % (c["symbol"], c["score"], c["stage"], c["mom30"], c["trending"]) for c in _sc[:12])
    result = brain_monthly.run(ctx)
    if result.get("shortlist"):
        _mk = ex.markets()
        _full = [c for c in result["shortlist"] if c.get("symbol") in _mk]
        state["shortlist"] = [c["symbol"] for c in _full]
        state["shortlist_full"] = _full
    state["last_brain_run"] = today.isoformat()
    state["regimen"] = result.get("regimen") or "neutral"
    return result


def build_portfolio_view(ex, state):
    view = {}
    for sym, p in state["positions"].items():
        if p.get("status") in ("closed",):
            continue
        pnl = "—"
        try:
            if p.get("avg_cost"):
                price = ex.price(sym)
                pnl = f"{(price / p['avg_cost'] - 1) * 100:+.1f}%"
        except Exception:
            pass
        view[sym] = {"status": p["status"], "qty": p.get("qty", 0), "pnl_pct": pnl}
    return view


def main():
    errs = config.validate(require_trading=not config.BINANCE_TESTNET)
    for e in errs:
        print(f"[config] aviso: {e}")

    ex = Exchange()
    state = st.load()

    deposits = detect_deposits(ex, state)
    for d in deposits:
        print(f"[deposit] +{d['amount']} {d['asset']} (loggeado, fuera del P&L)")

    try:
        actions = manage_positions(ex, state)
    except Exception as e:
        actions = []
        print('[main] manage_positions fallo:', str(e)[:160])
    try:
        scanner.apply_to_shortlist(ex, state)
    except Exception as e:
        print('[main] scanner fallo:', str(e)[:160])
    try:
        actions += seeds.plant_seeds(ex, state, DRY)
    except Exception as e:
        print('[main] plant_seeds fallo:', str(e)[:160])

    universe = list(set(state.get("shortlist", []) + list(state["positions"].keys())))
    trig_hits = []
    trig_hits += triggers.weekly_move_triggers(ex, universe)
    vol_hits, current_rank = triggers.volume_rank_triggers(ex, state)
    trig_hits += vol_hits
    state["prev_volume_rank"] = current_rank
    trig_hits += triggers.news_triggers(state, universe)

    brain = maybe_run_brain(ex, state, trig_hits)
    brain_summary = brain.get("summary") if brain else None
    if brain and not brain.get("shortlist"):
        brain_summary = "BRAIN VACIO (revisar credito Anthropic). " + (brain_summary or "")

    portfolio = build_portfolio_view(ex, state)
    html = notify.daily_report(actions, trig_hits, portfolio, brain_summary, config.BINANCE_TESTNET)
    mode = "TESTNET" if config.BINANCE_TESTNET else "REAL"
    dry = " [DRY]" if DRY else ""
    notify.send(f"🌱 Semillas — {st.today_str()} ({mode}){dry}", html)

    st.save(state)
    dashboard.update()
    print(f"[ok] corrida completa. {len(actions)} acciones, {len(trig_hits)} triggers.")


if __name__ == "__main__":
    main()

```


## notify.py
```python
"""Envío de reportes por email vía Resend (HTTP API)."""
import requests
import config


def send(subject, html):
    if not config.RESEND_API_KEY or not config.EMAIL_TO:
        print("[notify] Resend no configurado; salteando email.\n" + subject)
        return False
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {config.RESEND_API_KEY}"},
            json={
                "from": config.EMAIL_FROM,
                "to": [config.EMAIL_TO],
                "subject": subject,
                "html": html,
            },
            timeout=20,
        )
        ok = r.status_code in (200, 201)
        if not ok:
            print(f"[notify] Resend error {r.status_code}: {r.text[:200]}")
        return ok
    except Exception as e:
        print(f"[notify] excepción enviando email: {e}")
        return False


def daily_report(actions, triggers, portfolio, brain_summary, mode):
    """Construye el HTML del reporte diario."""
    badge = "TESTNET" if mode else "REAL"
    rows = ""
    for a in actions:
        rows += (
            f"<tr><td>{a.get('symbol','')}</td>"
            f"<td><b>{a.get('type','')}</b></td>"
            f"<td>{a.get('reason','')}</td></tr>"
        )
    if not rows:
        rows = "<tr><td colspan='3'>Sin acciones hoy. El sistema esperó.</td></tr>"

    trig = ""
    for t in triggers:
        trig += f"<li>{t['symbol']} — {t['signal']}: {t['detail']}</li>"
    if not trig:
        trig = "<li>Ningún trigger disparó.</li>"

    pf = ""
    for sym, p in portfolio.items():
        pf += (
            f"<tr><td>{sym}</td><td>{p['status']}</td>"
            f"<td>{p.get('qty',0):.4f}</td>"
            f"<td>{p.get('pnl_pct','—')}</td></tr>"
        )
    if not pf:
        pf = "<tr><td colspan='4'>Sin posiciones abiertas.</td></tr>"

    brain = f"<p><b>Cerebro mensual:</b> {brain_summary}</p>" if brain_summary else ""

    return f"""
    <div style="font-family:system-ui,Arial,sans-serif;max-width:640px">
      <h2>🌱 Sistema Semillas — Reporte diario <span style="font-size:12px;
          background:#eee;padding:2px 8px;border-radius:6px">{badge}</span></h2>

      <h3>Acciones ejecutadas</h3>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px"
             border="1">{rows}</table>

      <h3>Portfolio</h3>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px"
             border="1">
        <tr><th>Activo</th><th>Estado</th><th>Cantidad</th><th>P&amp;L</th></tr>
        {pf}
      </table>

      <h3>Triggers</h3>
      <ul style="font-size:14px">{trig}</ul>
      {brain}
      <p style="color:#888;font-size:12px">Revisión una vez al día. Pausar no es fallar.</p>
    </div>
    """


def funding_alert(sym, need, have):
    """Aviso por mail: falta USDT libre para reforzar (DCA) una posicion."""
    try:
        import requests, config
        subject = f"[Semillas] Fondear para reforzar {sym}"
        html = (f"<p>El bot quiere reforzar <b>{sym}</b> con <b>${need}</b> USDT "
                f"pero el balance libre es <b>${have:.2f}</b>.</p>"
                f"<p>Transferi USDT a la sub-cuenta para que el proximo DCA entre.</p>")
        requests.post("https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {config.RESEND_API_KEY}"},
            json={"from": config.EMAIL_FROM, "to": [config.EMAIL_TO],
                  "subject": subject, "html": html}, timeout=20)
        print(f"[notify] funding_alert enviado: {sym} need ${need} have ${have:.2f}")
    except Exception as e:
        print("[notify] funding_alert fallo:", str(e)[:120])

```


## patch_idx.py
```python
#!/usr/bin/env python3
# Edita el index.html del radar (repo calcagnoagustin/radar, docs/index.html):
#  1) % de cada trade calculado desde pnl_net/(entry*cantidad) -> consistente con el $.
#  2) "Ver mas" en AMBOS historiales (Semillas y Ganesha): muestra 8, despliega el resto.
# Reutiliza dashboard.gh_put (maneja sha). Asserts frenan antes de publicar si algo no matchea.
import requests
import dashboard

RAW = "https://raw.githubusercontent.com/calcagnoagustin/radar/main/docs/index.html"


def main():
    html = requests.get(RAW, timeout=20).text
    orig = html

    # 1) FIX % (2 ocurrencias identicas: Semillas y Ganesha)
    old_pct = "const pnl=t.pnl_net||0;const pct=t.entry?((t.exit/t.entry-1)*100):0;"
    new_pct = "const pnl=t.pnl_net||0;const _cb=(t.entry||0)*(t.qty_total||0);const pct=_cb?(pnl/_cb*100):0;"
    assert html.count(old_pct) == 2, "pct anchors=%d" % html.count(old_pct)
    html = html.replace(old_pct, new_pct)

    # 2) helper paginateHist (global, una vez) tras la def de fmtPct
    anchor = 'const fmtPct=n=>(n>=0?"+":"")+n.toFixed(2)+"%";'
    assert html.count(anchor) == 1, "fmtPct anchor=%d" % html.count(anchor)
    fn = (
        "\nfunction paginateHist(cid,lim){var c=document.getElementById(cid);if(!c)return;"
        "var rows=Array.prototype.slice.call(c.querySelectorAll('.trade'));if(rows.length<=lim)return;"
        "rows.forEach(function(r,i){if(i>=lim)r.classList.add('tr-hidden');});"
        "var rest=rows.length-lim;var w=document.createElement('div');w.style.textAlign='center';"
        "var btn=document.createElement('button');btn.className='vermas';"
        "btn.textContent='Ver m\\u00e1s ('+rest+')';btn.dataset.exp='0';"
        "btn.addEventListener('click',function(){"
        "if(btn.dataset.exp==='0'){c.querySelectorAll('.trade.tr-hidden').forEach(function(e){e.classList.remove('tr-hidden');});"
        "btn.textContent='Ver menos';btn.dataset.exp='1';}"
        "else{Array.prototype.slice.call(c.querySelectorAll('.trade')).forEach(function(e,i){if(i>=lim)e.classList.add('tr-hidden');});"
        "btn.textContent='Ver m\\u00e1s ('+rest+')';btn.dataset.exp='0';}});"
        "w.appendChild(btn);c.appendChild(w);}"
    )
    html = html.replace(anchor, anchor + fn)

    # 3) llamadas tras cada forEach
    a_s = "    shc.appendChild(el);\n  });"
    assert html.count(a_s) == 1, "semillas foreach=%d" % html.count(a_s)
    html = html.replace(a_s, a_s + '\n  paginateHist("sHistory",8);')
    a_g = "      hc.appendChild(el);\n    });"
    assert html.count(a_g) == 1, "ganesha foreach=%d" % html.count(a_g)
    html = html.replace(a_g, a_g + '\n    paginateHist("gHistory",8);')

    # 4) CSS
    css = ".trade .tr-pct{font-size:12px}"
    assert html.count(css) == 1, "css anchor=%d" % html.count(css)
    html = html.replace(css, css + (
        "\n  .tr-hidden{display:none}"
        "\n  .vermas{margin-top:12px;background:transparent;border:1px solid #2a3b32;color:#9fe0b8;"
        "font:inherit;font-size:12px;padding:7px 16px;border-radius:8px;cursor:pointer;width:100%}"
        "\n  .vermas:hover{background:#16241c}"
    ))

    assert html != orig, "sin cambios"
    dashboard.gh_put("docs/index.html", html.encode("utf-8"),
                     "fix % (pnl-based) + Ver mas paginacion en ambos radares")
    print("PUSHED ok, len", len(html))


if __name__ == "__main__":
    main()

```


## scanner.py
```python
import requests
import config
import indicators as ind
from exchange import Exchange

STABLES = {"USDT", "USDC", "FDUSD", "TUSD", "DAI", "BUSD", "USDP", "EUR", "TRY", "BRL", "ARS", "GBP", "AEUR", "RLUSD", "USD1", "USDE", "PYUSD", "USDD", "GUSD", "FRAX", "LUSD", "USDS", "USDF", "EURI", "XUSD"}

def _is_lev(base):
    return base.endswith("UP") or base.endswith("DOWN") or base.endswith("BULL") or base.endswith("BEAR") or "3L" in base or "3S" in base

def top_universe(ex, n=300):
    tk = ex.client.fetch_tickers()
    rows = []
    for sym, t in tk.items():
        if not sym.endswith("/USDT"):
            continue
        base = sym.split("/")[0]
        if base in STABLES or _is_lev(base):
            continue
        qv = t.get("quoteVolume") or 0
        rows.append((sym, qv, t.get("percentage") or 0, t.get("last") or 0))
    rows.sort(key=lambda r: r[1], reverse=True)
    return rows[:n]

def trending_cg():
    try:
        r = requests.get("https://api.coingecko.com/api/v3/search/trending", timeout=15)
        d = r.json()
        return {c["item"]["symbol"].upper() for c in d.get("coins", [])}
    except Exception:
        return set()

def score_candidates(ex, universe, deep=40):
    trend = trending_cg()
    pre = sorted(universe, key=lambda r: r[1] * (1 + max(r[2], 0) / 100.0), reverse=True)[:deep]
    out = []
    for sym, qv, pct, last in pre:
        try:
            oh = ex.ohlcv(sym, "1d", limit=config.MA_PERIOD + 40)
            stg = ind.stage(oh, config.MA_PERIOD, config.SLOPE_LOOKBACK)
            cl = ind.closes(oh)
            mom7 = (cl[-1] / cl[-8] - 1) * 100 if len(cl) > 8 else 0
            mom30 = (cl[-1] / cl[-31] - 1) * 100 if len(cl) > 31 else 0
        except Exception:
            continue
        base = sym.split("/")[0]
        tr = base in trend
        sc = 0.0
        sc += 2.0 if stg == 2 else (0.5 if stg == 1 else (-2.0 if stg == 4 else 0.0))
        sc += min(mom7, 50) * 0.05 + min(mom30, 100) * 0.02
        sc += 1.5 if tr else 0.0
        out.append({"symbol": sym, "score": round(sc, 2), "stage": stg, "mom7": round(mom7, 1), "mom30": round(mom30, 1), "vol_musd": round(qv / 1e6, 1), "trending": tr})
    out.sort(key=lambda c: c["score"], reverse=True)
    return out

def scan(ex, top=12):
    return score_candidates(ex, top_universe(ex))[:top]

if __name__ == "__main__":
    ex = Exchange()
    uni = top_universe(ex)
    print("universo /USDT:", len(uni))
    print("trending CG:", trending_cg())
    print("=== TOP CANDIDATOS ===")
    for c in scan(ex, 12):
        print(c)

def apply_to_shortlist(ex, state):
    mode = getattr(config, "SCAN_FEED", "direct")
    try:
        cands = scan(ex, top=getattr(config, "SCAN_TOP", 12))
    except Exception as e:
        print("[scanner] error:", e)
        return
    state["scanner_raw"] = cands
    print("[scanner] %d candidatos modo=%s" % (len(cands), mode))
    if mode == "direct":
        n = getattr(config, "SCAN_SHORTLIST_N", 3)
        picks = [c for c in cands if c["stage"] in (1, 2)][:n]
        state["shortlist"] = [c["symbol"] for c in picks]
        state["shortlist_full"] = [{"symbol": c["symbol"], "thesis": "scanner score %.1f stage %s mom30 %s%% trending %s" % (c["score"], c["stage"], c["mom30"], c["trending"])} for c in picks]

```


## seeds.py
```python
import datetime
import config
import indicators as ind
import state as st


def plant_seeds(ex, state, DRY):
    """3 semillas FORZADAS por mes (las del brain). Sin regimen global, sin requisito de stage.
    Son $7 de seguimiento/aprendizaje. El stage por-moneda gobierna despues el DCA, no la entrada."""
    acts = []
    positions = state.setdefault("positions", {})
    mes = datetime.datetime.utcnow().strftime("%Y-%m")
    if state.get("last_seed_month") == mes:
        return acts  # ya se plantaron las de este mes
    theses = {c.get("symbol"): c.get("thesis", "") for c in state.get("shortlist_full", [])}
    plantadas = 0
    for sym in state.get("shortlist", []):
        if plantadas >= config.SEEDS_PER_MONTH:
            break
        p = positions.get(sym)
        if p and p.get("status") in ("seed", "confirmed", "moonbag"):
            continue
        try:
            ohlcv = ex.ohlcv(sym, "1d", limit=config.MA_PERIOD + config.SLOPE_LOOKBACK + 20)
            price = ind.closes(ohlcv)[-1]
        except Exception as e:
            acts.append({"symbol": sym, "type": "SEED_ERROR", "reason": str(e)[:120]})
            continue
        qty = config.SEED_SIZE_USDT / price   # fallback teorico
        avg_cost = price
        if not DRY:
            try:
                _o = ex.market_buy_quote(sym, config.SEED_SIZE_USDT) or {}
            except Exception as e:
                acts.append({"symbol": sym, "type": "SEED_ERROR", "reason": str(e)[:120]})
                continue
            _f = float(_o.get("filled") or 0)
            if _f > 0:
                qty = _f
                _avg = _o.get("average")
                if _avg:
                    avg_cost = float(_avg)
                else:
                    _c = float(_o.get("cost") or 0)
                    if _c > 0:
                        avg_cost = _c / _f
        positions[sym] = {"symbol": sym, "status": "seed", "qty": qty, "avg_cost": avg_cost,
                          "dca_adds": 0, "tp_hit": [], "planted_at": st.today_str(),
                          "thesis": theses.get(sym, "")}
        plantadas += 1
        acts.append({"symbol": sym, "type": "SEED", "price": price})
        print("[seed] plantada " + sym + f" (${config.SEED_SIZE_USDT})")
    if plantadas > 0:
        state["last_seed_month"] = mes
    return acts

```


## selftest.py
```python
#!/usr/bin/env python3
"""Autotest del Sistema Semillas — NO requiere API keys ni toca saldo.

Usa la API PÚBLICA de Binance (precios/velas) para:
  - confirmar conectividad real con el exchange,
  - correr los indicadores Weinstein/Wyckoff sobre datos reales,
  - simular el motor de decisión sobre cada símbolo,
  - armar un reporte de muestra.

Uso: python selftest.py
"""
import sys
import ccxt
import config
import indicators as ind
import strategy

SYMBOLS = ["PENDLE/USDT", "WLD/USDT", "DOGE/USDT", "LINK/USDT"]


def main():
    print("=" * 56)
    print(" SISTEMA SEMILLAS 2.0 — AUTOTEST (sin keys, sin riesgo)")
    print("=" * 56)
    print(f" Parámetros: MA={config.MA_PERIOD}  confirm={config.CONFIRM_DAYS}d"
          f"  slope={config.SLOPE_LOOKBACK}")
    print("-" * 56)

    client = ccxt.binance({"enableRateLimit": True,
                           "options": {"defaultType": "spot"}})
    try:
        client.load_markets()
    except Exception as e:
        print(f"[FALLO] No se pudo conectar a Binance público: {e}")
        sys.exit(1)
    print("[OK] Conexión con Binance (API pública) establecida.\n")

    stage_names = {2: "Stage 2 (alcista)", 4: "Stage 4 (bajista)",
                   3: "transición", 1: "base/lateral", None: "sin datos"}

    for sym in SYMBOLS:
        try:
            ohlcv = client.fetch_ohlcv(sym, "1d", limit=config.MA_PERIOD + 40)
        except Exception as e:
            print(f"{sym:14} -> sin datos ({e})")
            continue
        price = ind.closes(ohlcv)[-1]
        st = ind.stage(ohlcv, config.MA_PERIOD, config.SLOPE_LOOKBACK)
        wk = ind.pct_return(ind.closes(ohlcv), 7)
        vspike = ind.volume_spike(ohlcv)

        # simulo una posición semilla recién plantada para ver qué decidiría
        pos = {"status": "seed", "planted_at": "2026-06-18",
               "qty": 1.0, "avg_cost": price, "dca_adds": 0, "tp_hit": []}
        action = strategy.decide(sym, ohlcv, pos)

        print(f"{sym:14} ${price:<11.4f} {stage_names.get(st):18}"
              f" 7d:{wk:+6.1f}%  vol:{vspike:4.1f}x  -> {action['type']}")

    print("\n[OK] Indicadores y motor de decisión corrieron sobre datos reales.")
    print("[OK] El sistema está listo. Falta cargar las API keys para operar.")


if __name__ == "__main__":
    main()

```


## state.py
```python
"""Estado persistente del bot (JSON en disco, con deduplicación).

Estructura de state.json:
{
  "positions": {
     "WLD/USDT": {
        "status": "seed" | "confirmed" | "moonbag" | "frozen" | "closed",
        "planted_at": "2026-06-18",
        "confirmed_at": "2026-06-25" | null,
        "qty": 12.34,                # cantidad base en cartera (gestionada por el bot)
        "avg_cost": 1.83,           # costo promedio
        "dca_adds": 1,              # cuántos agregados se hicieron
        "tp_hit": [30],             # niveles de TP ya ejecutados
        "tag": "NARRATIVA" | null
     }
  },
  "shortlist": ["WLD/USDT", "PENDLE/USDT", ...],
  "prev_volume_rank": {"WLD/USDT": 84, ...},
  "seen_news": ["hash1", "hash2", ...],     # dedup de noticias ya reportadas
  "deposits": [{"date": "...", "amount": 50.0, "asset": "USDT"}],
  "last_brain_run": "2026-06-01",
  "narrativa_active": "XYZ/USDT" | null
}
"""
import json
import os
from datetime import date

STATE_PATH = os.getenv("SEMILLAS_STATE", os.path.join(os.path.dirname(__file__), "state.json"))

_DEFAULT = {
    "positions": {},
    "shortlist": [],
    "prev_volume_rank": {},
    "seen_news": [],
    "deposits": [],
    "last_brain_run": None,
    "narrativa_active": None,
}


def load():
    if not os.path.exists(STATE_PATH):
        return json.loads(json.dumps(_DEFAULT))
    with open(STATE_PATH, "r") as f:
        data = json.load(f)
    # rellenar claves nuevas si el archivo es viejo
    for k, v in _DEFAULT.items():
        data.setdefault(k, json.loads(json.dumps(v)))
    return data


def save(state):
    tmp = STATE_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
    os.replace(tmp, STATE_PATH)  # escritura atómica


def today_str():
    return date.today().isoformat()

```


## strategy.py
```python
"""Motor de reglas del Sistema Semillas 2.0.

Decide acciones a partir de velas + estado de la posición. NO ejecuta órdenes
(eso lo hace main.py). Cada función devuelve una "acción" o None.

Reglas inviolables implementadas:
  - Stop DURO ante invalidación de tesis (Stage 4) -> salida 100%, incluida moonbag.
    (La tesis murió; ya no hay nada que preservar.)
  - Moonbag universal en TOMAS DE GANANCIA: nunca se vende el 100% mientras la
    tesis sigue viva. Siempre queda MOONBAG_PCT.
  - DCA SOLO con confirmación de tendencia (Stage 2). Nunca promediar a la baja.
  - Regla 60 días: semilla sin activar -> congelar.
"""
from datetime import date
import config
import indicators as ind


def _days_since(iso):
    if not iso:
        return 0
    y, m, d = map(int, iso.split("-"))
    return (date.today() - date(y, m, d)).days


def decide(symbol, ohlcv, pos):
    """Devuelve un dict de acción o None.

    Acción: {"type": ..., "symbol": ..., "reason": ..., ...}
      types: ACTIVATE, DCA, TAKE_PROFIT, STOP, FREEZE, HOLD
    """
    st = ind.stage(ohlcv, config.MA_PERIOD, config.SLOPE_LOOKBACK)
    price = ind.closes(ohlcv)[-1]
    status = pos.get("status", "seed")

    # 1) STOP DURO — invalidación de tesis. Aplica a cualquier estado vivo.
    if status in ("seed", "confirmed", "moonbag") and st == 4:
        return {
            "type": "STOP", "symbol": symbol, "price": price,
            "qty": pos["qty"],
            "reason": "Tesis invalidada (Stage 4: precio < MA y MA en baja). Salida total, incluida moonbag.",
        }

    # 2) Semilla aún sin confirmar
    if status == "seed":
        # Regla 60 días: sin activación -> congelar
        if _days_since(pos.get("planted_at")) >= config.FREEZE_DAYS:
            return {
                "type": "FREEZE", "symbol": symbol, "price": price,
                "qty": pos["qty"],
                "reason": f"Semilla sin activar en {config.FREEZE_DAYS} días. Congelar.",
            }
        # ¿Confirmó Stage 2 sostenido?
        if ind.consecutive_stage2(ohlcv, config.MA_PERIOD, config.SLOPE_LOOKBACK, config.CONFIRM_DAYS):
            return {
                "type": "ACTIVATE", "symbol": symbol, "price": price,
                "reason": f"Stage 2 confirmado {config.CONFIRM_DAYS} días. Activar -> habilita DCA.",
            }
        return {"type": "HOLD", "symbol": symbol, "reason": "Semilla esperando confirmación."}

    # 3) Posición confirmada -> DCA con tendencia + tomas de ganancia
    if status == "confirmed":
        action = _check_take_profit(symbol, pos, price)
        if action:
            return action
        # DCA SOLO con tendencia intacta (Stage 2) y sin pasarse del máximo de agregados
        if st == 2 and pos.get("dca_adds", 0) < config.MAX_DCA_ADDS:
            # confirmación de continuación: nuevo máximo de los últimos CONFIRM_DAYS
            recent_high = max(ind.closes(ohlcv)[-config.CONFIRM_DAYS:])
            if price >= recent_high:
                return {
                    "type": "DCA", "symbol": symbol, "price": price,
                    "reason": "Tendencia confirmada + nuevo máximo. Agregar con tendencia (nunca a la baja).",
                }
        return {"type": "HOLD", "symbol": symbol, "reason": "Confirmada, sin gatillo."}

    # 4) Moonbag — solo se cierra por stop duro (ya cubierto arriba)
    if status == "moonbag":
        return {"type": "HOLD", "symbol": symbol, "reason": "Moonbag testigo, tesis viva."}

    return None


def _check_take_profit(symbol, pos, price):
    """Tomas escalonadas preservando moonbag. Devuelve acción TAKE_PROFIT o None."""
    avg = pos.get("avg_cost", 0) or 0
    if avg <= 0:
        return None
    gain = (price / avg - 1) * 100
    already = set(pos.get("tp_hit", []))

    for level_pct, sell_frac in config.TP_LEVELS:
        if gain >= level_pct and level_pct not in already:
            return {
                "type": "TAKE_PROFIT", "symbol": symbol, "price": price,
                "level": level_pct, "sell_frac": sell_frac,
                "reason": f"+{gain:.0f}% (nivel {level_pct}%). Vender {sell_frac:.0f}%, preservar moonbag.",
            }
    return None

```


## tokenomics.py
```python
import requests

CG = "https://api.coingecko.com/api/v3"
HDRS = {"User-Agent": "semillas-bot"}

def _base(sym):
    return (sym or "").split("/")[0].strip().lower()

def fetch_tokenomics(symbols):
    """Best-effort FDV/MCAP + float% via CoinGecko. base_lower -> dict. Nunca rompe."""
    out = {}
    bases = sorted({_base(s) for s in symbols if s})
    if not bases:
        return out
    try:
        url = CG + "/coins/markets"
        params = {"vs_currency": "usd", "symbols": ",".join(bases),
                  "order": "market_cap_desc", "per_page": 250, "page": 1}
        data = requests.get(url, params=params, headers=HDRS, timeout=15).json()
    except Exception as e:
        print("[tokenomics] coingecko fallo:", str(e)[:120])
        return out
    if not isinstance(data, list):
        print("[tokenomics] respuesta inesperada:", str(data)[:120])
        return out
    best = {}
    for c in data:
        s = (c.get("symbol") or "").lower()
        if s not in bases:
            continue
        mc = c.get("market_cap") or 0
        if s not in best or mc > (best[s].get("market_cap") or 0):
            best[s] = c
    for s, c in best.items():
        mc = c.get("market_cap") or 0
        fdv = c.get("fully_diluted_valuation")
        circ = c.get("circulating_supply") or 0
        maxs = c.get("max_supply") or c.get("total_supply") or 0
        ratio = round(fdv / mc, 2) if (fdv and mc) else None
        floatp = round(100.0 * circ / maxs, 1) if (circ and maxs) else None
        flags = []
        if ratio is not None and ratio >= 5:
            flags.append("FDV/MCAP %sx (dilucion alta)" % ratio)
        if floatp is not None and floatp < 25:
            flags.append("float %s%% (poco supply circulando)" % floatp)
        penalty = 2 if (ratio is not None and ratio >= 10) else (1 if flags else 0)
        out[s] = {"mcap": mc, "fdv": fdv, "fdv_mcap": ratio, "float_pct": floatp,
                  "cg_id": c.get("id"), "warning": "; ".join(flags), "penalty": penalty}
    return out

def annotate_shortlist(shortlist):
    """Enriquece cada item con 'tokenomics', suma warning a 'risk' y reordena por penalty (sin descartar). Nunca rompe ni vacia."""
    if not isinstance(shortlist, list) or not shortlist:
        return shortlist
    try:
        tk = fetch_tokenomics([it.get("symbol") for it in shortlist])
        for it in shortlist:
            info = tk.get(_base(it.get("symbol", "")))
            if not info:
                it["tokenomics"] = {"status": "sin_datos"}
                continue
            it["tokenomics"] = info
            if info.get("warning"):
                br = it.get("risk", "") or ""
                it["risk"] = (br + " | TOKENOMICS: " + info["warning"]).strip(" |")
        shortlist.sort(key=lambda it: (it.get("tokenomics") or {}).get("penalty", 0))
    except Exception as e:
        print("[tokenomics] annotate fallo:", str(e)[:140])
    return shortlist

```


## triggers.py
```python
"""Triggers que despiertan al cerebro mensual (filtro barato, sin LLM).

Tres señales:
  1. Movimiento semanal fuerte (>= TRIGGER_WEEKLY_MOVE %) con volumen (>= xN).
  2. Salto en el ranking por volumen 24h (gigante que despierta en el top-100).
  3. Noticia RSS que matchea keyword narrativa + un ticker del universo.

Todo con deduplicación vía state["seen_news"] para no repetir alertas.
"""
import hashlib
import feedparser
import config
import indicators as ind


def weekly_move_triggers(ex, symbols):
    """Revisa la shortlist/universo por movimientos semanales con volumen."""
    hits = []
    for sym in symbols:
        try:
            ohlcv = ex.ohlcv(sym, "1d", limit=config.MA_PERIOD + 30)
        except Exception:
            continue
        cl = ind.closes(ohlcv)
        if len(cl) < 8:
            continue
        wk = ind.pct_return(cl, 7)
        vspike = ind.volume_spike(ohlcv)
        if abs(wk) >= config.TRIGGER_WEEKLY_MOVE and vspike >= config.TRIGGER_VOLUME_MULT:
            hits.append({
                "symbol": sym,
                "signal": "weekly_move",
                "detail": f"{wk:+.0f}% en 7d, volumen {vspike:.1f}x",
            })
    return hits


def volume_rank_triggers(ex, state, top_n=100):
    """Detecta activos que suben fuerte en el ranking por volumen (quote)."""
    hits = []
    try:
        tickers = ex.tickers()
    except Exception:
        return hits, state.get("prev_volume_rank", {})

    quote = config.QUOTE_ASSET
    ranked = sorted(
        [(s, t.get("quoteVolume") or 0) for s, t in tickers.items() if s.endswith("/" + quote)],
        key=lambda x: x[1], reverse=True,
    )
    current_rank = {s: i + 1 for i, (s, _) in enumerate(ranked[:300])}
    prev = state.get("prev_volume_rank", {})

    for sym, rank in current_rank.items():
        if rank <= top_n:
            old = prev.get(sym)
            # entró nuevo al top-100, o saltó >=50 puestos hacia arriba
            if old is None or (old - rank) >= 50:
                detail = "nuevo en top-100" if old is None else f"saltó {old}->{rank}"
                hits.append({"symbol": sym, "signal": "volume_rank", "detail": detail})
    return hits, current_rank


def news_triggers(state, symbols):
    """Parsea RSS y matchea keywords narrativas + tickers del universo."""
    hits = []
    seen = set(state.get("seen_news", []))
    # bases de los símbolos (WLD/USDT -> wld)
    bases = {s.split("/")[0].lower(): s for s in symbols}

    for url in config.RSS_FEEDS:
        try:
            feed = feedparser.parse(url)
        except Exception:
            continue
        for entry in feed.entries[:40]:
            title = (entry.get("title", "") + " " + entry.get("summary", "")).lower()
            h = hashlib.sha1(title.encode("utf-8")).hexdigest()[:16]
            if h in seen:
                continue
            kw = next((k for k in config.RSS_KEYWORDS if k in title), None)
            base = next((b for b in bases if b in title.split()), None)
            if kw and base:
                hits.append({
                    "symbol": bases[base], "signal": "news",
                    "detail": f"[{kw}] {entry.get('title', '')[:90]}",
                })
                seen.add(h)
    state["seen_news"] = list(seen)[-500:]  # acotar
    return hits

```
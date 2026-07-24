"""Carga y validacion de configuracion desde .env. — v2 (2026-07-11)"""
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

# --- Estrategia (Weinstein) ---
MA_PERIOD = _i("MA_PERIOD", 30)
CONFIRM_DAYS = _i("CONFIRM_DAYS", 10)
SLOPE_LOOKBACK = _i("SLOPE_LOOKBACK", 5)

# --- Semillas v2 ---
SEED_SIZE_USDT = _f("SEED_SIZE_USDT", 10)     # v2: $10 por semilla
SEEDS_PER_MONTH = _i("SEEDS_PER_MONTH", 3)
MAX_SEEDS = _i("MAX_SEEDS", 60)
FREEZE_DAYS = _i("FREEZE_DAYS", 60)

TP_LEVELS = _parse_tp(os.getenv("TP_LEVELS", "30:25,60:25,120:25"))

# --- Moonbag v2: dinamico por estructura + piso en USD ---
MOONBAG_FRAC_WEAK = _f("MOONBAG_FRAC_WEAK", 0.10)     # estructura rota
MOONBAG_FRAC_STRONG = _f("MOONBAG_FRAC_STRONG", 0.25) # soportes mensuales intactos
MOONBAG_FLOOR_USDT = _f("MOONBAG_FLOOR_USDT", 10.0)   # = semilla; abajo de esto no hay testigo
STRUCT_LOOKBACK_D = _i("STRUCT_LOOKBACK_D", 30)       # marco mensual para 'suelos'

# --- Jardin v2: DCA mensual dictaminado por el CEREBRO, ejecutado con timing ---
GARDEN_RESERVE_USDT = _f("GARDEN_RESERVE_USDT",
                         SEEDS_PER_MONTH * SEED_SIZE_USDT + 15.0)  # $45: intocable
GARDEN_MAX_COIN_FRAC = _f("GARDEN_MAX_COIN_FRAC", 0.20)  # tope 20% de la subcuenta por moneda
GARDEN_TIMING_HIGH_D = _i("GARDEN_TIMING_HIGH_D", 10)    # gatillo: nuevo maximo de N dias

# --- Scanner / Brain ---
SCAN_FEED = os.getenv("SCAN_FEED", "brain")   # v2: 'brain' => scanner NO pisa shortlist
SCAN_TOP = _i("SCAN_TOP", 12)
SCAN_SHORTLIST_N = _i("SCAN_SHORTLIST_N", 3)
BRAIN_SHORTLIST_N = _i("BRAIN_SHORTLIST_N", 12)          # v2: shortlist amplia
BRAIN_STALE_DAYS = _i("BRAIN_STALE_DAYS", 35)            # shortlist mas vieja => fallback scanner

# --- Ejecucion ---
MAX_AUTO_CLAMP_USDT = _f("MAX_AUTO_CLAMP_USDT", 10)
LIQUIDITY_BUFFER_USDT = _f("LIQUIDITY_BUFFER_USDT", 15)

# --- Triggers ---
TRIGGER_WEEKLY_MOVE = _f("TRIGGER_WEEKLY_MOVE", 25)
TRIGGER_VOLUME_MULT = _f("TRIGGER_VOLUME_MULT", 3)
RSS_FEEDS = [u.strip() for u in os.getenv("RSS_FEEDS", "").split(",") if u.strip()]
RSS_KEYWORDS = [k.strip().lower() for k in os.getenv("RSS_KEYWORDS", "").split(",") if k.strip()]

# --- Legacy (compatibilidad de imports; el runner P9/P11 fue retirado en v2) ---
MAX_DCA_ADDS = _i("MAX_DCA_ADDS", 3)
DCA_SIZE_USDT = _f("DCA_SIZE_USDT", 7)
DCA_LADDER = [6, 6, 6]
MOONBAG_PCT = _f("MOONBAG_PCT", 25)
MOONBAG_FRAC = MOONBAG_FRAC_WEAK

def validate(require_trading=False):
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

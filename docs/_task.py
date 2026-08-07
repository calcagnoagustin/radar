import base64, json, re, time, urllib.request, os
B = "/home/opc/bot_semillas"
o = {"t": "schema"}
try:
    tr = json.load(open(B + "/learning/trades.json"))
    o["trades_type"] = str(type(tr))
    if isinstance(tr, dict):
        o["trades_keys"] = list(tr.keys())[:12]
        for k in tr:
            if isinstance(tr[k], list) and tr[k]:
                o["muestra_lista_" + k] = tr[k][:2]; break
    else:
        o["n"] = len(tr); o["muestra"] = tr[:2]
except Exception as e:
    o["err_trades"] = str(e)[:200]
try:
    p = B + "/learning/ohlcv/KAITO_USDT_15m.json"
    d = json.load(open(p))
    o["ohlcv_type"] = str(type(d))
    o["ohlcv_muestra"] = d[:2] if isinstance(d, list) else str(d)[:300]
    o["ohlcv_n"] = len(d) if isinstance(d, list) else None
except Exception as e:
    o["err_ohlcv"] = str(e)[:200]
try:
    o["summary"] = json.load(open(B + "/learning/summary.json"))
except Exception as e:
    o["err_sum"] = str(e)[:150]
tok = ""
for L in open(B + "/.env"):
    m = re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)", L)
    if m: tok = m.group(1)
U = "https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m, d=None):
    q = urllib.request.Request(U, data=d, method=m)
    q.add_header("Authorization", "token " + tok); q.add_header("User-Agent", "s")
    return urllib.request.urlopen(q, timeout=30).read()
sha = None
try: sha = json.loads(R("GET")).get("sha")
except Exception: pass
p = {"message": "schema", "content": base64.b64encode(json.dumps(o, indent=1, default=str).encode()).decode()}
if sha: p["sha"] = sha
R("PUT", json.dumps(p).encode()); print("ok")

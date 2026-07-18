import ast,time,shutil,sys
P="/home/opc/bot_semillas/ejecutor_dash.py"
src=open(P).read()
if "_deposits(" in src:
    print("YA_PARCHEADO"); sys.exit(0)
func='''def _deposits(gs, pnl):
    """Depositos estimados (identidad contable, estable a precio):
    cash USDT libre + costo de posiciones abiertas - P&L realizado."""
    try:
        import json as _j, os as _o, ccxt as _c
        k=_j.load(open(_o.path.join(GDIR,"keys.json")))
        ex=_c.binance({"apiKey":k["apiKey"],"secret":k["secret"],"enableRateLimit":True})
        cash=float(ex.fetch_balance()["USDT"]["free"] or 0)
        cost=sum((p.get("qty",0) or 0)*(p.get("entry",0) or 0) for p in (gs.get("positions") or {}).values())
        return round(cash+cost-pnl,2)
    except Exception:
        return 0


'''
if "def build():" not in src or '"deposits_total": 0,' not in src:
    print("ANCLAS_NO_ENCONTRADAS"); sys.exit(1)
src2=src.replace("def build():", func+"def build():",1)
src2=src2.replace('"deposits_total": 0,', '"deposits_total": (_deposits(gs, pnl) if live else 0),',1)
try:
    ast.parse(src2)
except Exception as e:
    print("SYNTAX_ERR",e); sys.exit(1)
bak=P+".bak."+str(int(time.time()))
shutil.copy(P,bak)
open(P,"w").write(src2)
print("PARCHEADO_OK backup="+bak)

# TASK: reconciliar conversion manual de SYN y MANTA en Semillas (OK de Agus 27/07) — backup + verificacion + fix + republish
import base64,json,os,re,subprocess,time,urllib.request
B="/home/opc/bot_semillas"
def scrub(s):
    if not s: return s
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+|sk-ant-[A-Za-z0-9_\-]+)","<TOK>",s)
    return re.sub(r"[A-Za-z0-9]{56,}","<REDACTED>",s)
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"fix_dust_close","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
FIX=r'''
import sys,json,os,shutil,time
B="/home/opc/bot_semillas"
sys.path.insert(0,B)
import state as st
from exchange import Exchange
s=st.load()
ex=Exchange()
bal=ex.client.fetch_balance()
res={"cerradas":[],"saltadas":[]}
if not os.path.exists(B+"/state.json.bak.pre_dust_fix"):
    shutil.copy(B+"/state.json", B+"/state.json.bak.pre_dust_fix")
for sym in ("SYN/USDT","MANTA/USDT"):
    base=sym.split("/")[0]
    p=(s.get("positions") or {}).get(sym)
    if not p or p.get("status")=="closed":
        res["saltadas"].append({sym:"no esta o ya closed"}); continue
    real=float((bal.get(base) or {}).get("total") or 0)
    try: px=float(ex.client.fetch_ticker(sym).get("last") or 0)
    except Exception: px=0.0
    if real*px>=1.0:
        res["saltadas"].append({sym:"todavia hay %.6f %s (~$%.2f) en Binance; NO se toca"%(real,base,real*px)}); continue
    entry=float(p.get("avg_cost") or 0)
    qty=float(p.get("qty") or 0)
    pnl=round((px-entry)*qty,4)
    s.setdefault("recent_closed",[]).append({
        "symbol":sym,"entry":entry,"exit":round(px,6),
        "qty_total":round(qty,8),"action":"manual","pnl_net":pnl,
        "thesis":(p.get("thesis") or "")+" | convertida a mano por Agus (Binance Convert) 28/07Z; precio de salida ESTIMADO por ticker (Convert no aparece en fetch_my_trades); reconciliada por task",
        "closed_ts":time.time()})
    s["recent_closed"]=s["recent_closed"][-1000:]
    p["status"]="closed"; p["qty"]=0.0
    p["note"]=((p.get("note") or "")+" | cerrada: conversion manual 28/07Z").strip(" |")
    res["cerradas"].append({sym:{"exit_est":px,"qty":qty,"pnl_est":pnl,"resto_binance":real}})
st.save(s)
# a donde fue la plata: USDT libre y BNB
res["usdt_free"]=round(float((bal.get("USDT") or {}).get("free") or 0),2)
res["bnb_total"]=float((bal.get("BNB") or {}).get("total") or 0)
try:
    if res["bnb_total"]>0:
        res["bnb_usd"]=round(res["bnb_total"]*float(ex.client.fetch_ticker("BNB/USDT").get("last") or 0),2)
except Exception: pass
print(json.dumps(res))
import dashboard as D
print("update:", D.update())
'''
try:
    r=subprocess.run([B+"/venv/bin/python","-c",FIX],capture_output=True,text=True,timeout=300,cwd=B)
    info["fix_stdout"]=scrub(r.stdout[-2500:]); info["fix_stderr"]=scrub(r.stderr[-800:])
    info["pasos"].append("fix rc=%d"%r.returncode)
    info["ok"]=(r.returncode==0)
except Exception as e:
    info["ok"]=False; info["error"]=scrub(str(e)[:250])
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","dustfix")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"fix dust close syn manta","content":base64.b64encode(json.dumps(info,indent=1,ensure_ascii=False).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

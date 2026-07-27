# TASK: cerrar ATM/USDT en state de Semillas (venta manual 24/07) — backup + fix + republish (OK de Agus 27/07)
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
info={"task":"fix_atm_close","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s)
FIX=r'''
import sys,json,os,shutil,time
B="/home/opc/bot_semillas"
sys.path.insert(0,B)
import state as st
from exchange import Exchange
s=st.load()
p=(s.get("positions") or {}).get("ATM/USDT")
assert p, "no hay ATM en state"
assert p.get("status")!="closed", "ATM ya estaba closed"
if not os.path.exists(B+"/state.json.bak.pre_atm_fix"):
    shutil.copy(B+"/state.json", B+"/state.json.bak.pre_atm_fix")
ex=Exchange()
entry=float(p.get("avg_cost") or 0)
qty=float(p.get("qty") or 0)
exit_px=None; qty_sold=None; fuente="fetch_my_trades"
try:
    tr=ex.client.fetch_my_trades("ATM/USDT", since=1784764800000, limit=100)
    sells=[t for t in tr if t.get("side")=="sell"]
    amt=sum(float(t.get("amount") or 0) for t in sells)
    if amt>0:
        exit_px=sum(float(t.get("price") or 0)*float(t.get("amount") or 0) for t in sells)/amt
        qty_sold=amt
except Exception as e:
    print("trades_err:", str(e)[:120])
if exit_px is None:
    fuente="ticker_estimado"
    try: exit_px=float(ex.price("ATM/USDT"))
    except Exception: exit_px=entry
if not qty_sold: qty_sold=round(qty-0.0068,8)
pnl=round((exit_px-entry)*qty_sold,4)
s.setdefault("recent_closed",[]).append({
    "symbol":"ATM/USDT","entry":entry,"exit":round(exit_px,6),
    "qty_total":round(qty_sold,8),"action":"manual","pnl_net":pnl,
    "thesis":(p.get("thesis") or "")+" | venta manual Agus 24/07 (dictamen Brain: liquidar); reconciliada por task 27/07; resto 0.0068 ATM dust en Binance",
    "closed_ts":time.time()})
s["recent_closed"]=s["recent_closed"][-1000:]
p["status"]="closed"; p["qty"]=0.0
p["note"]=((p.get("note") or "")+" | cerrada: venta manual 24/07, reconciliada 27/07").strip(" |")
st.save(s)
print(json.dumps({"exit_px":round(exit_px,6),"qty_sold":qty_sold,"pnl":pnl,"fuente":fuente}))
import dashboard as D
print("update:", D.update())
'''
try:
    r=subprocess.run([B+"/venv/bin/python","-c",FIX],capture_output=True,text=True,timeout=300,cwd=B)
    info["fix_stdout"]=scrub(r.stdout[-1200:]); info["fix_stderr"]=scrub(r.stderr[-800:])
    step("fix rc=%d"%r.returncode)
    info["ok"]=(r.returncode==0)
    if r.returncode==0:
        v=subprocess.run([B+"/venv/bin/python","-c","import sys,json;sys.path.insert(0,'%s');import state as st;s=st.load();p=s['positions']['ATM/USDT'];print(json.dumps({'status':p.get('status'),'qty':p.get('qty')}))"%B],capture_output=True,text=True,timeout=60,cwd=B)
        info["verif"]=scrub((v.stdout+v.stderr)[-300:])
        step("verificado")
except Exception as e:
    info["ok"]=False; info["error"]=scrub(str(e)[:250])
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","fixatm")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"fix atm close","content":base64.b64encode(json.dumps(info,indent=1,ensure_ascii=False).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

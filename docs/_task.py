# TASK: auditoria de divergencia — balances REALES de Binance vs state (SOLO LECTURA)
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
info={"task":"audit_divergencia","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
AUD=r'''
import sys,json,time
B="/home/opc/bot_semillas"
sys.path.insert(0,B)
out={}
import ccxt
def val(ex,bal):
    tot={k:float(v) for k,v in (bal.get("total") or {}).items() if v and float(v)>0}
    res={}; total=0.0
    for a,q in sorted(tot.items()):
        if a=="USDT": px=1.0
        else:
            try: px=float(ex.fetch_ticker(a+"/USDT").get("last") or 0)
            except Exception: px=0.0
        usd=q*px; total+=usd
        res[a]={"qty":round(q,6),"usd":round(usd,2)}
    return res,round(total,2)
from exchange import Exchange
exs=Exchange()
bs=exs.client.fetch_balance()
sa,stot=val(exs.client,bs)
sstate=json.load(open(B+"/state.json"))
out["semillas"]={"total_usd":stot,"assets":sa,
 "free_usdt":round(float((bs.get("USDT") or {}).get("free") or 0),2),
 "state_positions":{k:round(float(v.get("qty") or 0),6) for k,v in sstate.get("positions",{}).items() if v.get("status") not in ("closed","frozen")}}
k=json.load(open(B+"/ejecutor/keys.json"))
exg=ccxt.binance({"apiKey":k["apiKey"],"secret":k["secret"],"enableRateLimit":True})
bg=exg.fetch_balance()
ga,gtot=val(exg,bg)
gstate=json.load(open(B+"/ejecutor/state.json"))
out["ganesha"]={"total_usd":gtot,"assets":ga,
 "free_usdt":round(float((bg.get("USDT") or {}).get("free") or 0),2),
 "state_positions":{k2:{"qty":round(float(v.get("qty") or 0),6),"entry":v.get("entry")} for k2,v in gstate.get("positions",{}).items()}}
out["people_trades"]={}
for name,exx in (("ganesha",exg),("semillas",exs.client)):
    try:
        tr=exx.fetch_my_trades("PEOPLE/USDT",limit=30)
        out["people_trades"][name]=[{"side":t.get("side"),"amt":t.get("amount"),"px":t.get("price"),"iso":t.get("datetime")} for t in tr[-10:]]
    except Exception as e:
        out["people_trades"][name]="ERR "+str(e)[:80]
print(json.dumps(out))
'''
try:
    r=subprocess.run([B+"/venv/bin/python","-c",AUD],capture_output=True,text=True,timeout=280,cwd=B)
    info["audit_stdout"]=scrub(r.stdout[-14000:]); info["audit_stderr"]=scrub(r.stderr[-600:])
    info["pasos"].append("audit rc=%d"%r.returncode)
    info["ok"]=(r.returncode==0)
except Exception as e:
    info["ok"]=False; info["error"]=scrub(str(e)[:250])
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","audit")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"audit divergencia","content":base64.b64encode(json.dumps(info,indent=1,ensure_ascii=False).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

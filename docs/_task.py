# TASK: diag universo ganesha — backup vs instalado + ultimo scan + eventos
import json,re,time,base64,urllib.request
B="/home/opc/bot_semillas"
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"diag_universo_ganesha","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime())}
def sect(path):
    try:
        s=open(path).read()
        m=re.search(r"def confirmed_symbols.*?(?=\ndef )",s,re.S)
        return (m.group(0)[:600] if m else "FUNCION NO ENCONTRADA")
    except Exception as e:
        return "ERR "+str(e)[:80]
info["universo_bak_pre_rec"]=sect(B+"/ganesha_ejecutor.py.bak.pre_rec")
info["universo_instalado"]=sect(B+"/ganesha_ejecutor.py")
try:
    lines=open(B+"/ejecutor/events.jsonl").read().splitlines()
    scans=[l for l in lines if chr(34)+"type"+chr(34)+": "+chr(34)+"scan"+chr(34) in l]
    info["ultimo_scan"]=scans[-1][:700] if scans else None
    info["ultimos_eventos"]=[l[:250] for l in lines[-14:]]
except Exception as e:
    info["err_events"]=str(e)[:100]
try:
    st=json.load(open(B+"/state.json"))
    info["confirmadas_semillas"]=[s for s,p in st.get("positions",{}).items() if p.get("status")=="confirmed"]
except Exception as e:
    info["err_state"]=str(e)[:80]
info["ok"]=True
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diag universo ganesha","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

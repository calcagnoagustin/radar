# TASK: export dashboard/main + probe depositos y ATM (solo lectura)
import base64,hashlib,json,os,re,subprocess,time,urllib.request
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
API="https://api.github.com/repos/calcagnoagustin/radar/contents/"
def gh(m,path,d=None):
    q=urllib.request.Request(API+path,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","expprobe")
    return urllib.request.urlopen(q,timeout=30).read()
def gh_put(path,raw,msg):
    sha=None
    try: sha=json.loads(gh("GET",path)).get("sha")
    except Exception: pass
    p={"message":msg,"content":base64.b64encode(raw).decode()}
    if sha: p["sha"]=sha
    gh("PUT",path,json.dumps(p).encode())
info={"task":"export_dash_probe_dep","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s); print("[exp]",s)
for fn,dst in (("dashboard.py","docs/_bak_dashboard.txt"),("main.py","docs/_bak_main.txt"),
               ("config.py","docs/_bak_config.txt"),("execlayer.py","docs/_bak_execlayer.txt")):
    try:
        raw=open(B+"/"+fn,"rb").read()
        gh_put(dst,scrub(raw.decode(errors="ignore")).encode(),"export "+fn)
        step("%s exportado (%d b)"%(fn,len(raw)))
    except Exception as e:
        info["err_"+fn]=scrub(str(e)[:150])
PROBE=r'''
import json,re,sys
B="/home/opc/bot_semillas"
def sc(s): return re.sub(r"[A-Za-z0-9]{56,}","<R>",str(s))[:300]
out={}
k=s=None
try:
    for L in open(B+"/.env"):
        L=L.strip()
        if L.startswith("BINANCE_API_KEY"): k=L.split("=",1)[1].strip().strip('"').strip("'")
        if L.startswith("BINANCE_API_SECRET"): s=L.split("=",1)[1].strip().strip('"').strip("'")
except Exception as e: out["env_err"]=sc(e)
import ccxt
def probe(key,sec):
    r={}
    try:
        ex=ccxt.binance({"apiKey":key,"secret":sec,"enableRateLimit":True})
        b=ex.fetch_balance()
        r["usdt_free"]=(b.get("USDT") or {}).get("free")
        r["atm_total"]=(b.get("ATM") or {}).get("total")
        try:
            h=ex.sapiGetSubAccountTransferSubUserHistory({"limit":100})
            if isinstance(h,list):
                r["subhist"]=[{"asset":x.get("asset"),"qty":x.get("qty"),"type":x.get("type"),"time":x.get("time")} for x in h][:40]
            else: r["subhist_raw"]=sc(h)
        except Exception as e: r["subhist_err"]=sc(e)
        try:
            d=ex.fetch_deposits(params={"limit":20})
            r["deposits_ext"]=[{"amt":x.get("amount"),"cur":x.get("currency"),"ts":x.get("timestamp")} for x in d][:20]
        except Exception as e: r["dep_err"]=sc(e)
    except Exception as e: r["err"]=sc(e)
    return r
out["semillas"]=probe(k,s)
try:
    gk=json.load(open(B+"/ejecutor/keys.json"))
    out["ganesha"]=probe(gk.get("apiKey"),gk.get("secret"))
except Exception as e: out["ganesha"]={"keys_err":sc(e)}
print(json.dumps(out))
'''
try:
    open("/tmp/_probe_dep.py","w").write(PROBE)
    r=subprocess.run([B+"/venv/bin/python","/tmp/_probe_dep.py"],capture_output=True,text=True,timeout=180,cwd=B)
    try: info["probe"]=json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: info["probe_stdout"]=scrub(r.stdout[-900:])
    info["probe_stderr"]=scrub(r.stderr[-400:])
    step("probe rc=%d"%r.returncode)
except Exception as e:
    info["err_probe"]=scrub(str(e)[:200])
info["ok"]=True
try:
    gh_put("docs/_diag.json",json.dumps(info,indent=1).encode(),"export dash + probe depositos")
    print("REPORTADO ok")
except Exception as e:
    print("PUSH_ERR",e)

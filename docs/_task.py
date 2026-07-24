# TASK: sembrar deposits_ledger.json (estimado por reconstruccion P&L; sin withdrawals segun Agus)
import base64,json,os,re,time,urllib.request
B="/home/opc/bot_semillas"
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"seed_deposits","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s); print("[seed]",s)
LP=B+"/deposits_ledger.json"
try:
    try: led=json.load(open(LP))
    except Exception: led={"semillas":[],"ganesha":[],"seeded":False}
    def has_seed(rows): return any(r.get("src","").startswith("seed") for r in rows)
    T0=1782604800000  # 2026-06-28 aprox arranque
    if not has_seed(led.get("semillas",[])):
        led.setdefault("semillas",[]).append({"asset":"USDT","qty":132.0,"type":1,"time":T0,"src":"seed_estimado_pnl"})
        step("seed semillas 132")
    if not has_seed(led.get("ganesha",[])):
        led.setdefault("ganesha",[]).append({"asset":"USDT","qty":194.0,"type":1,"time":T0,"src":"seed_estimado_pnl"})
        step("seed ganesha 194")
    led["seeded"]=True
    led["nota"]="montos ESTIMADOS por reconstruccion de P&L 24/07 (Agus: sin withdrawals). Corregir si aparece el numero real."
    open(LP,"w").write(json.dumps(led,indent=1))
    step("ledger guardado")
    import subprocess
    r=subprocess.run([B+"/venv/bin/python","-c","import sys;sys.path.insert(0,'"+B+"');import dashboard as D;print('update:',D.update())"],capture_output=True,text=True,timeout=300,cwd=B)
    info["pub_stdout"]=r.stdout[-300:]; info["pub_stderr"]=r.stderr[-200:]
    step("publicado rc=%d"%r.returncode)
    info["ok"]=(r.returncode==0)
except Exception as e:
    info["ok"]=False; info["error"]=str(e)[:250]
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","seed")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"seed deposits","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

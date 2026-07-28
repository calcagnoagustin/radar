# TASK: tail del log del launcher A1 (solo lectura)
import base64,json,re,subprocess,time,urllib.request
B="/home/opc/bot_semillas"
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
def sh(c):
    try:
        r=subprocess.run(c,shell=True,capture_output=True,text=True,timeout=30)
        return (r.stdout+r.stderr).strip()[-2000:]
    except Exception as e: return "ERR "+str(e)[:80]
info={"task":"a1_tail","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),
      "log":sh("tail -25 %s/a1_retry.log"%B),
      "proceso":sh("pgrep -af a1_launcher.py"),
      "mem":sh("free -m | head -2"),"ok":True}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","a1tail")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"a1 tail","content":base64.b64encode(json.dumps(info,indent=1,ensure_ascii=False).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

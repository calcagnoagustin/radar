# TASK: migracion A1 paso 1 - keypair ssh de control + inventario para el rebuild ARM
import base64,json,os,re,subprocess,time,urllib.request
B="/home/opc/bot_semillas"
def scrub(s):
    if not s: return s
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+|sk-ant-[A-Za-z0-9_\-]+)","<TOK>",s)
    return re.sub(r"[A-Za-z0-9+/=]{60,}","<REDACTED>",s)
def sh(cmd,t=60):
    try:
        r=subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=t)
        return (r.stdout+"\n"+r.stderr).strip()[-3000:]
    except Exception as e: return "ERR "+str(e)[:120]
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"mig1_sshkey_inventario","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s)
try:
    K=os.path.expanduser("~/.ssh/id_migracion")
    if not os.path.exists(K):
        os.makedirs(os.path.expanduser("~/.ssh"),exist_ok=True)
        out=sh("ssh-keygen -t ed25519 -f %s -N '' -C migracion-a1"%K)
        step("keygen: "+out[:120])
    info["pubkey"]=open(K+".pub").read().strip()
    step("pubkey listo")
    info["os"]=sh("cat /etc/os-release | head -3; uname -m")
    info["python"]=sh("python3 --version; %s/venv/bin/python --version"%B)
    info["pip_freeze"]=sh("%s/venv/bin/pip freeze 2>/dev/null | head -40"%B)
    info["du"]=sh("du -sh %s %s/learning 2>/dev/null; du -sh %s/venv 2>/dev/null"%(B,B,B))
    info["opt_ganesha"]=sh("ls -la /opt/ganesha_bot 2>/dev/null | head")
    info["crontab"]=sh("crontab -l")
    info["envfiles"]=sh("ls -la %s/.env %s/ejecutor/keys.json %s/ejecutor/LIVE 2>/dev/null"%(B,B,B))
    info["ok"]=True
    step("inventario ok")
except Exception as e:
    info["ok"]=False; info["error"]=scrub(str(e)[:250])
for k in ("os","python","pip_freeze","du","opt_ganesha","crontab","envfiles"):
    info[k]=scrub(info.get(k,""))
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","mig1")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"mig1 sshkey + inventario","content":base64.b64encode(json.dumps(info,indent=1,ensure_ascii=False).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

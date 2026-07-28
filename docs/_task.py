# TASK: migracion A1 por API — paso 1: keypair API de OCI en la VM + instalar SDK oci (la privada NUNCA sale de la VM)
import base64,json,os,re,subprocess,time,urllib.request
B="/home/opc/bot_semillas"
def sh(cmd,t=120):
    try:
        r=subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=t)
        return (r.stdout+"\n"+r.stderr).strip()[-1500:]
    except Exception as e: return "ERR "+str(e)[:120]
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"oci_api_key","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s)
try:
    O=os.path.expanduser("~/.oci")
    os.makedirs(O,exist_ok=True)
    K=O+"/oci_api_key.pem"
    if not os.path.exists(K):
        step(sh("openssl genrsa -out %s 2048 2>&1 | tail -1"%K)[:80])
        sh("chmod 600 "+K)
    sh("openssl rsa -in %s -pubout -out %s/oci_api_key_public.pem 2>/dev/null"%(K,O))
    info["public_pem"]=open(O+"/oci_api_key_public.pem").read()
    # fingerprint estilo OCI: md5 con dos puntos del DER de la publica
    fp=sh("openssl rsa -in %s -pubout -outform DER 2>/dev/null | openssl md5 -c | awk '{print $2}'"%K)
    info["fingerprint"]=fp.strip()
    step("keypair listo")
    # instalar SDK oci en el venv en background (tarda; log a /tmp/pip_oci.log)
    if "oci" not in sh(B+"/venv/bin/pip list 2>/dev/null | grep -i '^oci '"):
        sh("nohup %s/venv/bin/pip install --no-cache-dir oci > /tmp/pip_oci.log 2>&1 &"%B,10)
        step("pip install oci lanzado en background")
    else:
        step("SDK oci ya instalado")
    info["ok"]=True
except Exception as e:
    info["ok"]=False; info["error"]=str(e)[:250]
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","ocikey")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"oci api key","content":base64.b64encode(json.dumps(info,indent=1,ensure_ascii=False).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

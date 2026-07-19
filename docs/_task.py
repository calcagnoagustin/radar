# TASK: exportar backup completo de ganesha_ejecutor pre-deploy para diff
import json,re,time,base64,urllib.request
B="/home/opc/bot_semillas"
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"export_bak_ganesha","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime())}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/%s"
def gh_put(path,data,msg):
    u=U%path
    def R(m,d=None):
        q=urllib.request.Request(u,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","exp")
        return urllib.request.urlopen(q,timeout=30).read()
    sha=None
    try: sha=json.loads(R("GET")).get("sha")
    except Exception: pass
    p={"message":msg,"content":base64.b64encode(data).decode()}
    if sha: p["sha"]=sha
    R("PUT",json.dumps(p).encode())
try:
    bak=open(B+"/ganesha_ejecutor.py.bak.pre_rec","rb").read()
    info["bak_bytes"]=len(bak)
    import hashlib
    info["bak_sha"]=hashlib.sha256(bak).hexdigest()[:16]
    gh_put("docs/_bak_ganesha.txt",bak,"export backup ganesha pre-deploy")
    info["ok"]=True
except Exception as e:
    info["ok"]=False; info["error"]=str(e)[:200]
try:
    gh_put("docs/_diag.json",json.dumps(info,indent=1).encode(),"export bak report")
    print("REPORTADO")
except Exception as e:
    print("PUSH_ERR",e)

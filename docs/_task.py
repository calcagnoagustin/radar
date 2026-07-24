# TASK: diagnostico DCA semillas (solo lectura, no toca nada)
import base64,hashlib,json,os,re,time,urllib.request
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
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diagdca")
    return urllib.request.urlopen(q,timeout=30).read()
def gh_put(path,raw,msg):
    sha=None
    try: sha=json.loads(gh("GET",path)).get("sha")
    except Exception: pass
    p={"message":msg,"content":base64.b64encode(raw).decode()}
    if sha: p["sha"]=sha
    gh("PUT",path,json.dumps(p).encode())
info={"task":"diag_dca_semillas","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s); print("[dca]",s)
try:
    g=open(B+"/garden.py","rb").read()
    info["garden_sha"]=hashlib.sha256(g).hexdigest()[:16]; info["garden_bytes"]=len(g)
    gh_put("docs/_bak_garden.txt",g,"export garden.py (diag dca)"); step("garden.py exportado")
except Exception as e:
    info["err_garden"]=scrub(str(e)[:200])
try:
    st=open(B+"/state.json","rb").read()
    gh_put("docs/_bak_sem_state.txt",st,"export state semillas (diag dca)")
    step("state.json exportado (%d bytes)"%len(st))
except Exception as e:
    info["err_state"]=scrub(str(e)[:200])
try:
    info["ls"]=sorted(os.listdir(B))[:80]
except Exception as e:
    info["err_ls"]=scrub(str(e)[:100])
hits=[]
try:
    import glob
    cands=(glob.glob(B+"/*.log")+glob.glob(B+"/*.jsonl")+glob.glob(B+"/nohup*")
           +glob.glob(B+"/logs/*")+glob.glob(B+"/ejecutor/*.jsonl"))
    for fp in cands:
        try:
            for L in open(fp,errors="ignore").readlines()[-4000:]:
                if "dca" in L.lower():
                    hits.append(os.path.basename(fp)+": "+L.strip()[:220])
        except Exception: pass
    info["log_files_vistos"]=[os.path.basename(x) for x in cands][:30]
except Exception as e:
    info["err_log"]=scrub(str(e)[:100])
info["dca_log_hits"]=[scrub(h) for h in hits[-60:]]
info["ok"]=True
try:
    gh_put("docs/_diag.json",json.dumps(info,indent=1).encode(),"diag dca semillas")
    print("REPORTADO ok")
except Exception as e:
    print("PUSH_ERR",e)

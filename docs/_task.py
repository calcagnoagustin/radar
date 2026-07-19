import json,base64,subprocess,time,urllib.request,re
def sh(c):
    try: return subprocess.getoutput(c)
    except Exception as e: return "ERR:"+str(e)
def scrub(s):
    if not s: return s
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+|sk-ant-[A-Za-z0-9_\-]+)","<TOK>",s)
    s=re.sub(r"[A-Za-z0-9]{56,}","<REDACTED>",s)
    return s
tok=""
try:
    for Ln in open("/home/opc/bot_semillas/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",Ln)
        if m: tok=m.group(1)
except Exception: pass
B="/home/opc/bot_semillas"
info={}
info["now"]=time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime())
info["loop_src"]=scrub(sh("cat "+B+"/loop_analista.py 2>/dev/null"))
info["loop_ls"]=sh("ls -la "+B+" | grep -iE 'loop|learn|analist|outcome|result'")[:1200]
info["loop_outputs"]=scrub(sh("head -c 500 "+B+"/loop_state.json "+B+"/loop_analista.json "+B+"/loop.jsonl 2>/dev/null"))[:1500]
info["cron_all"]=scrub(sh("crontab -l 2>/dev/null | grep -v grep | grep loop"))[:600]
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diagL","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try:
    R("PUT",json.dumps(p).encode()); print("PUSHEDL len_src",len(info["loop_src"] or ""))
except Exception as e:
    print("ERR",e)

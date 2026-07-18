import glob,json,base64,subprocess,time,urllib.request,re
def sh(c):
    try: return subprocess.getoutput(c)
    except Exception as e: return "ERR:"+str(e)
def scrub(s):
    if not s: return s
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)","<TOK>",s)
    s=re.sub(r"[A-Za-z0-9]{56,}","<REDACTED>",s)
    return s
tok=""
for f in ["/home/opc/bot_semillas/.env"]+glob.glob("/home/opc/bot_semillas/**/.env",recursive=True):
    try:
        for L in open(f):
            m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
            if m: tok=m.group(1)
    except Exception: pass
B="/home/opc/bot_semillas"
info={
 "now": time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),
 "dash_src": scrub(sh("cat "+B+"/ejecutor_dash.py 2>/dev/null")),
 "cron_tail": scrub(sh("tail -n 30 "+B+"/ejecutor/cron.log 2>/dev/null"))[:2500],
 "env_keys": scrub(sh("grep -oE '^[A-Z_]+=' "+B+"/.env 2>/dev/null | tr -d = | tr '\\n' ' '")),
}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diag4","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try:
    R("PUT",json.dumps(p).encode()); print("PUSHED4")
except Exception as e:
    print("ERR",e)

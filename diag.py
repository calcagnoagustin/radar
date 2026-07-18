import glob,os,json,base64,subprocess,time,urllib.request,re
def sh(c):
    try: return subprocess.getoutput(c)
    except Exception as e: return "ERR:"+str(e)
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
 "ejecutor_log": sh("tail -n 70 "+B+"/ejecutor/cron.log 2>/dev/null")[:4000],
 "ejecutor_ls": sh("ls -la "+B+"/ejecutor 2>/dev/null")[:1200],
 "cron_log_tail": sh("tail -n 20 "+B+"/cron.log 2>/dev/null")[:1500],
 "state_files": sh("for j in "+B+"/ejecutor/*.json; do echo \"== $j ($(stat -c %y \"$j\" 2>/dev/null)) ==\"; head -c 500 \"$j\"; echo; done 2>/dev/null")[:2500],
}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diag2","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try:
    R("PUT",json.dumps(p).encode()); print("PUSHED2 tok",len(tok))
except Exception as e:
    print("ERR",e)

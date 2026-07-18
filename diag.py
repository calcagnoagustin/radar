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
 "state": scrub(sh("cat "+B+"/ejecutor/state.json 2>/dev/null"))[:4500],
 "events_tail": scrub(sh("tail -n 50 "+B+"/ejecutor/events.jsonl 2>/dev/null"))[:4000],
 "publish_lines": scrub(sh("grep -niE 'publicad|push|commit|error|trace|exception|fail|429|401|403|404' "+B+"/ejecutor/cron.log 2>/dev/null | tail -n 45"))[:2800],
 "dash_push_src": scrub(sh("grep -niE 'github|api.github|contents/|urllib|requests|subprocess|git |push|publicar' "+B+"/ejecutor_dash.py 2>/dev/null | grep -viE 'token|secret|apikey|=\"gh' | head -n 35"))[:2200],
}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diag3 scrubbed","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try:
    R("PUT",json.dumps(p).encode()); print("PUSHED3")
except Exception as e:
    print("ERR",e)

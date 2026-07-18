import glob,os,json,base64,subprocess,time,urllib.request,re
def sh(c):
    try: return subprocess.getoutput(c)
    except Exception as e: return "ERR:"+str(e)
tok=""
paths=["/home/opc/bot_semillas/.env"]+glob.glob("/home/opc/bot_semillas/**/.env",recursive=True)
for f in paths:
    try:
        for L in open(f):
            m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
            if m: tok=m.group(1)
    except Exception: pass
info={
 "now": time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),
 "tok_len": len(tok),
 "ps": sh("ps -eo pid,etimes,cmd | grep -iE 'ejecutor|ganesha|main.py|loop_analista|momentum' | grep -v grep")[:1400],
 "systemd_user": sh("systemctl --user list-units --type=service 2>/dev/null | grep -iE 'ganesha|ejecutor|semillas|momentum'")[:500],
 "systemd_sys": sh("systemctl list-units --type=service 2>/dev/null | grep -iE 'ganesha|ejecutor|semillas|momentum'")[:500],
 "cron": sh("crontab -l 2>/dev/null | grep -vE '^#'")[:900],
 "ganesha_json_mtime": sh("stat -c '%y' /home/opc/bot_semillas/docs/ganesha_data.json 2>/dev/null || find /home/opc/bot_semillas -name ganesha_data.json -printf '%t %p\\n' 2>/dev/null | head"),
 "ls": sh("ls -la /home/opc/bot_semillas 2>/dev/null | head -45")[:1500],
 "logtail": sh("for g in /home/opc/bot_semillas/*ejecutor*.log /home/opc/bot_semillas/*ganesha*.log /home/opc/bot_semillas/nohup.out /home/opc/bot_semillas/logs/*.log; do [ -f \"$g\" ] && echo \"== $g ==\" && tail -n 15 \"$g\"; done 2>/dev/null")[:2000],
}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
payload={"message":"diag ejecutor","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: payload["sha"]=sha
try:
    R("PUT",json.dumps(payload).encode()); print("PUSHED tok_len",len(tok))
except Exception as e:
    print("PUSH_ERR",e)

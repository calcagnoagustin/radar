# TASK: diagnostico ATM + salud ciclo diario (SOLO LECTURA, no toca state ni ordenes)
import base64,json,os,re,subprocess,time,urllib.request
B="/home/opc/bot_semillas"
def scrub(s):
    if not s: return s
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+|sk-ant-[A-Za-z0-9_\-]+)","<TOK>",s)
    return re.sub(r"[A-Za-z0-9]{56,}","<REDACTED>",s)
def sh(cmd,t=40):
    try:
        r=subprocess.run(cmd,shell=True,capture_output=True,text=True,timeout=t)
        return scrub((r.stdout+"\n"+r.stderr).strip()[-2500:])
    except Exception as e: return "ERR "+str(e)[:120]
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"diag_atm_ciclo","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s)
try:
    # 1) que hace reconcile.py (el modulo de Semillas)
    try: info["reconcile_py"]=scrub(open(B+"/reconcile.py").read()[:5000])
    except Exception as e: info["reconcile_py"]="ERR "+str(e)[:100]
    # 2) ATM en el state de Semillas
    try:
        st=json.load(open(B+"/state.json"))
        info["state_atm"]=st.get("positions",{}).get("ATM/USDT")
        info["state_positions_status"]={k:(v.get("status"),round(float(v.get("qty") or 0),4)) for k,v in st.get("positions",{}).items()}
    except Exception as e: info["state_atm"]="ERR "+str(e)[:100]
    step("state leido")
    # 3) crontab y logs
    info["crontab"]=sh("crontab -l")
    info["logs_ls"]=sh("ls -la %s/*.log %s/logs/ /tmp/*.log 2>/dev/null | tail -20"%(B,B))
    info["grep_reconcile"]=sh("grep -h -a '\\[reconcile\\]' %s/*.log %s/logs/*.log 2>/dev/null | tail -12"%(B,B))
    info["grep_atm_log"]=sh("grep -h -a -i 'ATM' %s/*.log %s/logs/*.log 2>/dev/null | tail -12"%(B,B))
    # 4) por que no publico el ciclo del 24/07 (00:15 UTC del 25/07): OOM / cron
    info["oom"]=sh("(dmesg -T 2>/dev/null | grep -i -E 'oom|out of memory|killed process' | tail -12); (journalctl -k --since '2026-07-24' 2>/dev/null | grep -i -E 'oom|killed process' | tail -12)")
    info["cron_2425"]=sh("(grep -a 'main.py' /var/log/cron 2>/dev/null | grep -a -E 'Jul 2[45]' | tail -8); (journalctl --since '2026-07-25 00:00' --until '2026-07-25 01:30' 2>/dev/null | grep -i -E 'cron|python' | tail -12)")
    info["tail_daily_log"]=sh("L=$(ls -t %s/*.log %s/logs/*.log 2>/dev/null | head -1); echo LOG=$L; tail -60 \"$L\" 2>/dev/null"%(B,B))
    info["mem"]=sh("free -m; uptime")
    step("diagnostico ok")
    info["ok"]=True
except Exception as e:
    info["ok"]=False; info["error"]=scrub(str(e)[:250])
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diagatm")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diag atm + ciclo diario","content":base64.b64encode(json.dumps(info,indent=1,ensure_ascii=False).encode()).decode()}
if sha: p["sha"]=sha
try: R("PUT",json.dumps(p).encode()); print("REPORTADO")
except Exception as e: print("PUSH_ERR",e)

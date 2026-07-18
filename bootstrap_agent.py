import os,base64,subprocess,json,urllib.request,re,time
B="/home/opc/bot_semillas"
AGENT=base64.b64decode("IyBBZ2VudGUgU2VtaWxsYXM6IGNhZGEgY29ycmlkYSAoY3JvbiAqLzIpIGJ1c2NhIGRvY3MvX3Rhc2sucHkgZW4gZWwgcmVwbzsgc2kgY2FtYmnDsywgbG8gZWplY3V0YS4KIyBMYSB0YXJlYSBlc2NyaWJlIHN1IHByb3BpbyByZXN1bHRhZG8gYSBkb2NzL19kaWFnLmpzb24uIEVzY3JpYmlyIF90YXNrLnB5IHJlcXVpZXJlIGVsIHRva2VuIChyZXBvIHdyaXRlLXByb3RlY3RlZCkuCmltcG9ydCBvcyxyZSxqc29uLGJhc2U2NCxoYXNobGliLHN1YnByb2Nlc3MsdXJsbGliLnJlcXVlc3QsdGltZQpCPSIvaG9tZS9vcGMvYm90X3NlbWlsbGFzIgpkZWYgZ2V0X3RvaygpOgogICAgdHJ5OgogICAgICAgIGZvciBMIGluIG9wZW4oQisiLy5lbnYiKToKICAgICAgICAgICAgbT1yZS5zZWFyY2gociIoZ2l0aHViX3BhdF9bQS1aYS16MC05X10rfGdoW3Bvc3J1XV9bQS1aYS16MC05XSspIixMKQogICAgICAgICAgICBpZiBtOiByZXR1cm4gbS5ncm91cCgxKQogICAgZXhjZXB0IEV4Y2VwdGlvbjogcGFzcwogICAgcmV0dXJuICIiClQ9Z2V0X3RvaygpCmlmIG5vdCBUOiByYWlzZSBTeXN0ZW1FeGl0KDApCnVybD0iaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy9jYWxjYWdub2FndXN0aW4vcmFkYXIvY29udGVudHMvZG9jcy9fdGFzay5weT9yZWY9bWFpbiIKcmVxPXVybGxpYi5yZXF1ZXN0LlJlcXVlc3QodXJsKQpyZXEuYWRkX2hlYWRlcigiQXV0aG9yaXphdGlvbiIsInRva2VuICIrVCk7IHJlcS5hZGRfaGVhZGVyKCJVc2VyLUFnZW50Iiwic2VtaWxsYXMtYWdlbnQiKQp0cnk6CiAgICBkPWpzb24ubG9hZHModXJsbGliLnJlcXVlc3QudXJsb3BlbihyZXEsdGltZW91dD0zMCkucmVhZCgpKQogICAgY29udGVudD1iYXNlNjQuYjY0ZGVjb2RlKGRbImNvbnRlbnQiXSkKZXhjZXB0IEV4Y2VwdGlvbjoKICAgIHJhaXNlIFN5c3RlbUV4aXQoMCkKaD1oYXNobGliLnNoYTI1Nihjb250ZW50KS5oZXhkaWdlc3QoKQpTVD1CKyIvLmFnZW50X2xhc3QiCmxhc3Q9b3BlbihTVCkucmVhZCgpLnN0cmlwKCkgaWYgb3MucGF0aC5leGlzdHMoU1QpIGVsc2UgIiIKaWYgaD09bGFzdDogcmFpc2UgU3lzdGVtRXhpdCgwKQpvcGVuKFNULCJ3Iikud3JpdGUoaCkKdGY9QisiLy5hZ2VudF90YXNrLnB5IgpvcGVuKHRmLCJ3YiIpLndyaXRlKGNvbnRlbnQpCnRyeToKICAgIHN1YnByb2Nlc3MucnVuKFtCKyIvdmVudi9iaW4vcHl0aG9uIix0Zl0sdGltZW91dD0xODApCiAgICBwcmludCgicmFuIixoWzo4XSx0aW1lLnN0cmZ0aW1lKCIlSDolTTolU1oiLHRpbWUuZ210aW1lKCkpKQpleGNlcHQgRXhjZXB0aW9uIGFzIGU6CiAgICBwcmludCgidGFza19lcnIiLGUpCg==")
open(B+"/agent.py","wb").write(AGENT)
cron_line="*/2 * * * * "+B+"/venv/bin/python "+B+"/agent.py >> "+B+"/agent.log 2>&1"
cur=subprocess.getoutput("crontab -l 2>/dev/null")
installed="agent.py" in cur
if not installed:
    base=cur if cur and "no crontab" not in cur else ""
    newcron=(base.rstrip()+"\n"+cron_line+"\n").lstrip("\n")
    subprocess.run(["crontab","-"],input=newcron.encode())
    cur2=subprocess.getoutput("crontab -l 2>/dev/null")
    installed="agent.py" in cur2
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"agent":"installed" if installed else "FAILED","cron_has_agent":installed,"now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"cron_jobs":subprocess.getoutput("crontab -l 2>/dev/null | grep -vE '^#' | wc -l")}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","agent")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"agent bootstrap","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try:
    R("PUT",json.dumps(p).encode()); print("AGENT_INSTALLED cron_ok="+str(installed))
except Exception as e:
    print("PUSH_ERR",e,"installed="+str(installed))

import base64, json, os, re, subprocess, time, urllib.request
B = "/home/opc/bot_semillas"
o = {"t": "recon", "now": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime())}
def sh(c):
    try:
        return subprocess.run(c, shell=True, capture_output=True, text=True, timeout=60).stdout[-1500:]
    except Exception as e:
        return "ERR " + str(e)[:100]
o["free"] = sh("free -m")
o["swap"] = sh("swapon --show; cat /proc/swaps")
o["crontab"] = sh("crontab -l")
o["ls"] = sh("ls -la %s | head -40" % B)
o["ls_learning"] = sh("ls -la %s/learning 2>/dev/null | head -30; ls %s/learning/ohlcv 2>/dev/null | head -20; ls %s/learning/ohlcv 2>/dev/null | wc -l" % (B, B, B))
o["agent_py"] = sh("cat %s/agent.py" % B)[-2500:]
o["events_n"] = sh("wc -l %s/ejecutor/events.jsonl %s/events.jsonl 2>/dev/null" % (B, B))
o["events_tipos"] = sh("cat %s/ejecutor/events.jsonl 2>/dev/null | python3 -c \"import sys,json,collections;c=collections.Counter();[c.update([json.loads(l).get('type','?')]) for l in sys.stdin if l.strip()];print(c.most_common(20))\"")
o["md5_gan"] = sh("md5sum %s/ganesha_ejecutor.py %s/loop_analista.py" % (B, B))
o["py"] = sh("%s/venv/bin/python -V; %s/venv/bin/python -c 'import ccxt;print(ccxt.__version__)'" % (B, B))
o["disk"] = sh("df -h / | tail -1")
tok = ""
try:
    for L in open(B + "/.env"):
        m = re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)", L)
        if m:
            tok = m.group(1)
except Exception as e:
    o["env_err"] = str(e)[:100]
U = "https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_recon.json"
def R(m, d=None):
    q = urllib.request.Request(U, data=d, method=m)
    q.add_header("Authorization", "token " + tok)
    q.add_header("User-Agent", "recon")
    return urllib.request.urlopen(q, timeout=30).read()
sha = None
try:
    sha = json.loads(R("GET")).get("sha")
except Exception:
    pass
p = {"message": "recon", "content": base64.b64encode(json.dumps(o, indent=1).encode()).decode()}
if sha:
    p["sha"] = sha
try:
    R("PUT", json.dumps(p).encode())
    print("RECON OK")
except Exception as e:
    print("PUSH_ERR", e)

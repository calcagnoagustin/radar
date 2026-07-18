import json,base64,glob,time,urllib.request,re
def scrub(s):
    if s is None: return s
    s=str(s)
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)","<TOK>",s)
    s=re.sub(r"[A-Za-z0-9]{56,}","<REDACTED>",s)
    return s
tok=""
for f in ["/home/opc/bot_semillas/.env"]:
    try:
        for L in open(f):
            m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
            if m: tok=m.group(1)
    except Exception: pass
B="/home/opc/bot_semillas"
res={"now":time.strftime("%H:%M:%SZ",time.gmtime())}
try:
    import ccxt
    res["ccxt_ver"]=ccxt.__version__
    k=json.load(open(B+"/ejecutor/keys.json"))
    ex=ccxt.binance({"apiKey":k["apiKey"],"secret":k["secret"],"enableRateLimit":True})
    def tryf(name,fn):
        try:
            r=fn(); res[name]=str(r)[:1800]
        except Exception as e:
            res[name]="ERR:"+str(e)[:280]
    # unified methods
    tryf("fetch_deposits_USDT", lambda: ex.fetch_deposits("USDT"))
    tryf("fetch_transfers", lambda: ex.fetch_transfers(None,None,None,{"type":"MAIN_UMFUTURE"}))
    # sub-account own transfer history (varios nombres posibles segun version)
    for nm in ["sapi_get_sub_account_transfer_subuserhistory","sapiGetSubAccountTransferSubUserHistory","sapi_get_sub_account_transfer_sub_user_history"]:
        fn=getattr(ex,nm,None)
        if fn:
            tryf("subUserHistory["+nm+"]", lambda fn=fn: fn())
            break
    else:
        res["subUserHistory"]="no method found in ccxt "+ccxt.__version__
    # universal transfer query (master-level, puede fallar)
    tryf("universalTransfer_MAIN", lambda: ex.sapi_get_asset_transfer({"type":"MAIN_MAIN"}))
    try:
        bal=ex.fetch_balance()
        res["usdt_free"]=bal.get("USDT",{}).get("free")
        res["usdt_total"]=bal.get("USDT",{}).get("total")
    except Exception as e:
        res["bal"]="ERR:"+str(e)[:200]
except Exception as e:
    res["ccxt"]="ERR:"+str(e)[:400]
info={kk:scrub(vv) for kk,vv in res.items()}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=30).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diag5","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try:
    R("PUT",json.dumps(p).encode()); print("PUSHED5")
except Exception as e:
    print("ERR",e)

import json,base64,time,urllib.request,re
def scrub(s):
    if s is None: return s
    s=str(s)
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)","<TOK>",s)
    s=re.sub(r"[A-Za-z0-9]{56,}","<REDACTED>",s)
    return s
tok=""
try:
    for L in open("/home/opc/bot_semillas/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
B="/home/opc/bot_semillas"
res={"now":time.strftime("%H:%M:%SZ",time.gmtime())}
try:
    import ccxt
    k=json.load(open(B+"/ejecutor/keys.json"))
    ex=ccxt.binance({"apiKey":k["apiKey"],"secret":k["secret"],"enableRateLimit":True})
    now_ms=int(time.time()*1000)
    start=1748736000000  # 2025-06-01
    win=29*86400*1000
    allt=[]; errs=[]
    s=start
    while s < now_ms:
        e=min(s+win, now_ms)
        try:
            r=ex.sapi_get_sub_account_transfer_subuserhistory({"startTime":s,"endTime":e,"limit":100})
            if r: allt+=r
        except Exception as ee:
            errs.append(str(ee)[:120])
        s=e+1
    seen=set(); uniq=[]
    for t in allt:
        tid=t.get("tranId")
        if tid in seen: continue
        seen.add(tid); uniq.append(t)
    def price_usdt(asset,ms):
        if asset in ("USDT","USDC","BUSD","FDUSD","DAI","TUSD"): return 1.0
        try:
            o=ex.fetch_ohlcv(asset+"/USDT","1d",since=int(ms)-86400000,limit=3)
            if o: return o[-1][4]
        except Exception: pass
        try: return ex.fetch_ticker(asset+"/USDT")["last"]
        except Exception: return None
    dep=0.0; out=0.0; rows=[]
    for t in uniq:
        typ=str(t.get("type")); asset=t.get("asset")
        qty=float(t.get("qty",0) or 0); ms=int(t.get("time",0) or 0)
        px=price_usdt(asset,ms); usd=round(qty*px,2) if px else None
        rows.append({"type":typ,"asset":asset,"qty":qty,"iso":time.strftime("%Y-%m-%d",time.gmtime(ms/1000)),"px":px,"usd":usd})
        if usd:
            if typ=="2": dep+=usd
            elif typ=="1": out+=usd
    res["n_uniq"]=len(uniq); res["windows_err"]=errs[:5]
    res["rows"]=rows
    res["deposits_usd_type2"]=round(dep,2)
    res["withdrawals_usd_type1"]=round(out,2)
    res["net_deposits_usd"]=round(dep-out,2)
except Exception as e:
    res["err"]="ERR:"+str(e)[:400]
info={kk:scrub(vv) for kk,vv in res.items()}
U="https://api.github.com/repos/calcagnoagustin/radar/contents/docs/_diag.json"
def R(m,d=None):
    q=urllib.request.Request(U,data=d,method=m)
    q.add_header("Authorization","token "+tok); q.add_header("User-Agent","diag")
    return urllib.request.urlopen(q,timeout=45).read()
sha=None
try: sha=json.loads(R("GET")).get("sha")
except Exception: pass
p={"message":"diag7","content":base64.b64encode(json.dumps(info,indent=1).encode()).decode()}
if sha: p["sha"]=sha
try:
    R("PUT",json.dumps(p).encode()); print("PUSHED7 net_dep=",res.get("net_deposits_usd"))
except Exception as e:
    print("ERR",e)

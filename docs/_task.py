# TASK: validacion out-of-sample del backtest de toma de ganancias (dias 90-180 atras)
import json,re,sys,time,base64,urllib.request
B="/home/opc/bot_semillas"
def scrub(s):
    if not s: return s
    s=re.sub(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+|sk-ant-[A-Za-z0-9_\-]+)","<TOK>",s)
    return re.sub(r"[A-Za-z0-9]{56,}","<REDACTED>",s)
tok=""
try:
    for L in open(B+"/.env"):
        m=re.search(r"(github_pat_[A-Za-z0-9_]+|gh[posru]_[A-Za-z0-9]+)",L)
        if m: tok=m.group(1)
except Exception: pass
info={"task":"backtest_tp_oos","now":time.strftime("%Y-%m-%d %H:%M:%SZ",time.gmtime()),"pasos":[]}
def step(s): info["pasos"].append(s); print("[bt-oos]",s)
U="https://api.github.com/repos/calcagnoagustin/radar/contents/%s"
def gh_put(path,data,msg):
    u=U%path
    def R(m,d=None):
        q=urllib.request.Request(u,data=d,method=m); q.add_header("Authorization","token "+tok); q.add_header("User-Agent","bt-oos")
        return urllib.request.urlopen(q,timeout=30).read()
    sha=None
    try: sha=json.loads(R("GET")).get("sha")
    except Exception: pass
    p={"message":msg,"content":base64.b64encode(data).decode()}
    if sha: p["sha"]=sha
    R("PUT",json.dumps(p).encode())
try:
    sys.path.insert(0,B)
    import backtest_tp as BT
    import ccxt
    ex=ccxt.binance({"enableRateLimit":True})
    syms=set()
    try:
        for ln in open(B+"/ejecutor/events.jsonl"):
            try:
                e=json.loads(ln)
                if e.get("symbol"): syms.add(e["symbol"])
            except Exception: pass
    except Exception: pass
    try:
        st=json.load(open(B+"/state.json"))
        for s,p in st.get("positions",{}).items():
            if p.get("status")=="confirmed": syms.add(s)
    except Exception: pass
    mk=ex.load_markets()
    syms=sorted(s for s in syms if s in mk)[:16]
    step("universo: %d simbolos"%len(syms))
    cut=int((time.time()-90*86400)*1000)   # solo velas ANTERIORES a la ventana ya testeada
    detail,agg={},{k:[] for k in BT.VARIANTS}
    fallos=[]
    for sym in syms:
        try:
            c15=BT.fetch_15m(ex,sym,180)
        except Exception as e:
            fallos.append("%s: %s"%(sym,str(e)[:60])); continue
        c15=[c for c in c15 if c[0]<cut]
        if len(c15)<BT.LOOKBACK+BT.VOL_SMA+100:
            fallos.append("%s: datos OOS insuficientes (%d)"%(sym,len(c15))); continue
        detail[sym]={}
        for name,cfg in BT.VARIANTS.items():
            tr=BT.sim_symbol(c15,cfg)
            detail[sym][name]=BT.metrics(tr)
            agg[name]+=tr
        print("[bt-oos] %s ok (%d velas)"%(sym,len(c15)))
    resumen={name:BT.metrics(trs) for name,trs in agg.items()}
    res={"generated":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
         "ventana":"dias 90-180 atras (out-of-sample, no vista por el test in-sample)",
         "equity_sim":BT.EQUITY,"riesgo_pct":BT.RISK_PCT,
         "simbolos":sorted(detail.keys()),"fallos":fallos,
         "resumen":resumen,"detalle":detail}
    json.dump(res,open(B+"/learning/backtest_tp_oos.json","w"),indent=1)
    gh_put("docs/backtest_tp_oos.json",json.dumps(res,ensure_ascii=False,indent=1).encode("utf-8"),"backtest tp OOS")
    step("publicado docs/backtest_tp_oos.json")
    info["resumen"]=resumen
    info["simbolos"]=res["simbolos"]
    info["fallos"]=fallos[:5]
    info["ok"]=True
except Exception as e:
    info["ok"]=False; info["error"]=scrub(str(e)[:300])
try:
    gh_put("docs/_diag.json",json.dumps(info,indent=1).encode(),"backtest oos report")
    print("REPORTADO ok=%s"%info.get("ok"))
except Exception as e:
    print("PUSH_ERR",e)

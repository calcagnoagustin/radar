/* sistema_extra.js — Header "Total sistema" + panel "Dictamen del Cerebro"
   Solo visualización: lee dashboard_data.json + ganesha_data.json + precios Binance. */
(function(){
  var fmt=function(n,d){d=(d==null?2:d);return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
  var pct=function(n){return (n>=0?"+":"")+n.toFixed(2)+"%";};
  var cls=function(n){return n>0.0001?"up":(n<-0.0001?"down":"flat");};
  var bS=function(s){return s.replace("/","").toUpperCase();};
  var SEM=null,GAN=null,PX={};
  var $=function(id){return document.getElementById(id);};

  // ---- Header TOTAL SISTEMA (arriba de todo) ----
  var hero=document.createElement("section");
  hero.className="hero"; hero.id="sysHero";
  hero.style.borderColor="rgba(111,191,142,.35)";
  hero.style.marginBottom="26px";
  hero.innerHTML='<div>'+
    '<div class="eyebrow">Total sistema &middot; Semillas + Ganesha</div>'+
    '<div class="pnl-val mono" id="sysBal">&mdash;</div>'+
    '<div class="pnl-sub" id="sysSub">cargando&hellip;</div></div>'+
    '<div class="hero-stats">'+
    '<div class="stat"><div class="k">Ganancia / p&eacute;rdida general</div><div class="v mono" id="sysPct" style="font-size:1.6em">&mdash;</div></div>'+
    '<div class="stat"><div class="k">P&amp;L no realizado</div><div class="v mono" id="sysUnreal" style="font-size:1.6em">&mdash;</div></div>'+
    '<div class="stat"><div class="k">Dep&oacute;sitos netos</div><div class="v mono" id="sysDep">&mdash;</div></div>'+
    '</div>';
  var firstHeader=document.querySelector("header");
  if(firstHeader) firstHeader.parentNode.insertBefore(hero,firstHeader);

  // ---- Panel Dictamen del Cerebro (despues de Alertas) ----
  var bc=document.createElement("div");
  bc.className="card"; bc.style.marginBottom="18px";
  bc.innerHTML='<div class="head"><span class="title">Dictamen del Cerebro</span><span class="eyebrow" id="gpMonth"></span></div>'+
               '<div class="body" id="gpBody"><div class="row"><span class="lbl">Cargando&hellip;</span></div></div>';
  var ac=$("alertCard");
  if(ac&&ac.parentNode) ac.parentNode.insertBefore(bc,ac.nextSibling);

  function renderBrain(){
    var gp=(SEM&&SEM.garden_plan_pub)||{verdicts:[]};
    var m=$("gpMonth"); if(m) m.textContent=gp.month?("plan "+gp.month):"";
    var body=$("gpBody"); if(!body) return;
    var V={reforzar:["confirmed","REFORZAR"],mantener:["seed","MANTENER"],liquidar:["closed","LIQUIDAR"],dust:["closed","DUST"]};
    var vs=gp.verdicts||[];
    if(!vs.length){body.innerHTML='<div class="row"><span class="lbl">Sin plan vigente este mes.</span></div>';return;}
    body.innerHTML=vs.map(function(v){
      var c=V[v.verdict]||["",(v.verdict||"").toUpperCase()];
      var extra=(v.verdict==="reforzar"&&v.dca_usdt)?(" $"+v.dca_usdt):"";
      var est=v.estado||"";
      var estCol=est.indexOf("pendiente")>=0?"var(--clay)":(est==="ejecutado"?"var(--jade)":"var(--muted)");
      return '<div class="pos"><div class="pos-top"><div><span class="sym">'+String(v.symbol||"").split("/")[0]+'</span>'+
        ' <span class="badge '+c[0]+'" style="margin-left:8px">'+c[1]+extra+'</span></div>'+
        '<div class="pos-pnl"><span class="badge" style="color:'+estCol+'">'+est+'</span></div></div>'+
        '<div class="pos-meta"><span style="max-width:100%;line-height:1.5">'+String(v.razon||"")+'</span></div></div>';
    }).join("");
  }

  function renderTotals(){
    if(!SEM||!GAN) return;
    var semMkt=0,semCost=0,priced=true;
    (SEM.positions||[]).forEach(function(p){
      if(!(p.qty>0)) return;
      var t=PX[bS(p.symbol)];
      semCost+=p.qty*p.avg_cost;
      if(t) semMkt+=p.qty*t.price; else priced=false;
    });
    var semBal=(SEM.free_usdt||0)+semMkt;
    var ganInv=0,ganMkt=0;
    (GAN.open_positions||[]).forEach(function(p){
      var t=PX[bS(p.symbol)];
      ganInv+=p.qty*p.entry;
      if(t) ganMkt+=p.qty*t.price; else priced=false;
    });
    var ganFree=(GAN.equity_now||0)-ganInv;
    var ganBal=ganFree+ganMkt;
    var total=semBal+ganBal;
    var unreal=(semMkt-semCost)+(ganMkt-ganInv);
    if(!priced) return;
    $("sysBal").textContent=fmt(total);
    $("sysSub").textContent="Semillas "+fmt(semBal)+" · Ganesha "+fmt(ganBal);
    $("sysUnreal").innerHTML='<span class="'+cls(unreal)+'">'+fmt(unreal)+'</span>';
    var dl=SEM.deposits_ledger;
    if(dl&&dl.seeded){
      var dep=((dl.semillas||{}).neto_usdt||0)+((dl.ganesha||{}).neto_usdt||0);
      if(dep>0){
        var g=total-dep;
        $("sysPct").innerHTML='<span class="'+cls(g)+'">'+pct(g/dep*100)+'</span>';
        $("sysDep").textContent=fmt(dep);
        return;
      }
    }
    $("sysPct").innerHTML='<span class="flat" style="font-size:.55em">falta sembrar hist&oacute;rico de dep&oacute;sitos</span>';
    $("sysDep").textContent="—";
  }

  async function load(){
    try{SEM=await(await fetch("./dashboard_data.json?ts="+Date.now())).json();}catch(e){}
    try{GAN=await(await fetch("./ganesha_data.json?ts="+Date.now())).json();}catch(e){}
  }
  async function prices(){
    var ss=new Set();
    if(SEM)(SEM.positions||[]).forEach(function(p){if(p.qty>0)ss.add(bS(p.symbol));});
    if(GAN)(GAN.open_positions||[]).forEach(function(p){ss.add(bS(p.symbol));});
    if(!ss.size) return;
    var L=JSON.stringify(Array.from(ss));
    var urls=["https://data-api.binance.vision/api/v3/ticker/24hr?symbols=","https://api.binance.com/api/v3/ticker/24hr?symbols="];
    for(var i=0;i<urls.length;i++){
      try{
        var r=await fetch(urls[i]+encodeURIComponent(L));
        if(r.ok){(await r.json()).forEach(function(t){PX[t.symbol]={price:+t.lastPrice,chg:+t.priceChangePercent};});return;}
      }catch(e){}
    }
  }
  async function cycle(){await load();renderBrain();await prices();renderTotals();}
  cycle();
  setInterval(cycle,60000);
})();

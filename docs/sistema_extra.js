/* sistema_extra.js — Header "Total sistema" + panel "Dictamen del Cerebro"
   Solo visualización: lee dashboard_data.json + ganesha_data.json + precios Binance. */
(function(){
  var fmt=function(n,d){d=(d==null?2:d);return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
  var pct=function(n){return (n>=0?"+":"")+n.toFixed(2)+"%";};
  var cls=function(n){return n>0.0001?"up":(n<-0.0001?"down":"flat");};
  var bS=function(s){return s.replace("/","").toUpperCase();};
  var SEM=null,GAN=null,FON=null,PES=null,CHI=null,RET=null,COL=null,BIN=null,PX={};
  var $=function(id){return document.getElementById(id);};

  // ---- Header TOTAL SISTEMA (arriba de todo) ----
  var hero=document.createElement("section");
  hero.className="hero"; hero.id="sysHero";
  hero.style.borderColor="rgba(191,215,141,.35)";
  hero.style.marginBottom="26px";
  hero.innerHTML='<div>'+
    '<div class="eyebrow">Total &middot; plata real: Colch&oacute;n + Retiro + Binance</div>'+
    '<div class="pnl-val mono" id="sysBal">&mdash;</div>'+
    '<div class="pnl-sub" id="sysSub">cargando&hellip;</div></div>'+
    '<div class="hero-stats">'+
    '<div class="stat"><div class="k">Ganancia total</div><div class="v mono" id="sysPct" style="font-size:1.6em">&mdash;</div></div>'+
    '<div class="stat"><div class="k">Colch&oacute;n</div><div class="v mono" id="sysUnreal" style="font-size:1.1em">&mdash;</div></div>'+
    '<div class="stat"><div class="k">Retiro</div><div class="v mono" id="sysDep">&mdash;</div></div>'+
    '</div>';
  var firstHeader=document.querySelector("header");
  if(firstHeader) firstHeader.parentNode.insertBefore(hero,firstHeader);

  // ---- Panel Dictamen del Cerebro (despues de Alertas) ----
  var bc=document.createElement("div");
  bc.className="card"; bc.style.marginBottom="18px";
  bc.innerHTML='<div class="head"><span class="title">Dictamen del Cerebro</span><span class="eyebrow" id="gpMonth"></span></div>'+
               '<div class="body" id="gpBody"><div class="row"><span class="lbl">Cargando&hellip;</span></div></div>';
  // 28/08: Dictamen del Cerebro NO se inyecta mas -- Semillas 1.0 cerrada.
  // (bc queda creado pero jamas insertado)

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
    // 10/10/2026: TOTAL = solo plata real: Colchon + Fondo de Retiro + Binance (sin invertir).
    // El Fondo Abundancia (paper) y los experimentos viven en Laboratorio y NO suman.
    var r=RET||{}, c=COL||{}, bz=BIN||{};
    var re=(r.total_usd!=null)?r.total_usd:0, ce=c.saldo_usd||0, be=bz.saldo_usd||0;
    // El resultado historico de Binance (desde 2018) se muestra en su bloque y NO entra en la ganancia del Total.
    var tot=re+ce+be, p=(r.gan_usd||0), base=tot-p;
    $("sysBal").textContent=fmt(tot);
    $("sysSub").textContent="Colch\u00f3n "+fmt(ce)+" \u00b7 Retiro "+fmt(re)+" \u00b7 Binance "+(bz.saldo_usd!=null?fmt(be):"(pendiente)");
    $("sysPct").innerHTML='<span class="'+cls(p)+'">'+fmt(p)+' <span style="font-size:.7em">('+pct(base>0?100*p/base:0)+')</span></span>';
    var u=$("sysUnreal"); if(u) u.innerHTML=fmt(ce)+' <span style="font-size:.75em;color:var(--faint)">colch\u00f3n</span>';
    var d=$("sysDep"); if(d) d.innerHTML=fmt(re)+' <span style="font-size:.75em;color:var(--faint)">retiro</span>';
  }

  async function load(){
    try{SEM=await(await fetch("./dashboard_data.json?ts="+Date.now())).json();}catch(e){}
    try{GAN=await(await fetch("./ganesha_data.json?ts="+Date.now())).json();
  fetch("./fondo_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)FON=j;}).catch(function(){});}catch(e){}
    try{PES=await(await fetch("./pescador_data.json?ts="+Date.now())).json();}catch(e){}
    try{CHI=await(await fetch("./pescador_chico_data.json?ts="+Date.now())).json();}catch(e){}
    try{RET=await(await fetch("./retiro_data.json?ts="+Date.now())).json();}catch(e){}
    try{COL=await(await fetch("./colchon_data.json?ts="+Date.now())).json();}catch(e){}
    try{BIN=await(await fetch("./binance_data.json?ts="+Date.now())).json();}catch(e){BIN=null;}
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


/* sistema_extra.js — bloque archivo (28/08): la card Semillas es un registro
   historico; sus numeros en vivo ($0, -100%, alertas de liquidez) confunden. */
(function(){
  function archivo(){
    var b=document.getElementById("semBal");
    if(b&&b.textContent!=="cerrada"){
      b.textContent="cerrada";
      b.style.fontSize="1.6em";b.style.color="var(--muted)";
    }
    var sub=document.getElementById("semSub");
    if(sub)sub.textContent="capital consolidado en cuenta principal (28/08)";
    var gen=document.getElementById("semGen");
    if(gen)gen.innerHTML='<span style="color:var(--muted)">\u2014</span>';
    var un=document.getElementById("semUnreal");
    if(un)un.innerHTML='<span style="color:var(--muted)">\u2014</span>';
    var re=document.getElementById("semReal");
    if(re)re.innerHTML='<span class="down">-$15.81</span> <span style="font-size:.75em;color:var(--faint)">final</span>';
    var de=document.getElementById("semDep");
    if(de)de.textContent="$156 hist.";
    // alertas de liquidez del sistema cerrado: fuera
    var al=document.getElementById("alertas");
    if(al){
      Array.prototype.slice.call(al.children).forEach(function(ch){
        var t=(ch.textContent||"");
        if(t.indexOf("Liquidez baja")>=0||t.indexOf("Considerar depositar")>=0
           ||t.indexOf("Refuerzo (DCA) de PYTH")>=0||t.indexOf("PYTH/USDT pendiente")>=0)ch.remove();
      });
    }
  }
  setInterval(archivo,2000);
  setTimeout(archivo,800);
})();

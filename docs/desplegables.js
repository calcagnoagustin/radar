/* desplegables.js (09/10/2026) - 4 bloques plegables: Total, Fondo Abundancia, Fondo de Retiro y
   Laboratorio (Ganesha, Pescadores, Faro, RS y cualquier experimento futuro).
   No mueve el DOM: marca cada hijo de <body> con su grupo y lo oculta con una clase.
   Lo de Semillas 1.0 (cerrado) se oculta siempre. */
(function(){
  var G={
    total:  {n:"Total",             bal:["sysBal"],  pnl:["sysPct"], tag:"plata real \u00b7 Colch\u00f3n + Retiro + Binance"},
    binance:{n:"Binance",          bal:["binBal"],  pnl:["binPnl"], tag:"real \u00b7 sin invertir \u00b7 desde el 10/10/2026"},
    colchon:{n:"Colch\u00f3n",        bal:["colBal"],  pnl:[], tag:"emergencias \u00b7 real", sub:"ahorro de emergencia"},
    liquido:{n:"Subtotal l\u00edquido", bal:["liqBal"], pnl:[], tag:"Colch\u00f3n + Binance \u00b7 disponible ya", sub:"lo que se puede usar hoy"},
    retiro: {n:"Fondo de Retiro",   bal:["retBal"],  pnl:["retPnl"], tag:"real \u00b7 Inviu \u00b7 a 20 a\u00f1os"},
    lab:    {n:"Laboratorio",       bal:["fBal","gBal","p2Bal","pcBal","faroBal","rsBal"],
             pnl:["fPnl","gGen","p2Real","p2Unr","pcReal","pcUnr","faroPnl","rsPnl"], tag:"simulaciones con plata ficticia \u00b7 no suman al total"}
  };
  var SUB={
    fondo:   {n:"Fondo Abundancia", bal:["fBal"], pnl:["fPnl"], tag:"rotativo \u00b7 pasa a real con la plata de Binance"},
    ganesha: {n:"Ganesha",        bal:["gBal"],    pnl:["gGen"], tag:"alts de momentum + sombra v5.1"},
    pescador:{n:"Pescador",       bal:["p2Bal"],   pnl:["p2Real","p2Unr"], tag:"runners de bStocks"},
    chico:   {n:"Pescador Chico", bal:["pcBal"],   pnl:["pcReal","pcUnr"], tag:"ganancias chicas y salir"},
    faro:    {n:"Faro",           bal:["faroBal"], pnl:["faroPnl"], tag:"r\u00e9gimen de mercado"},
    rs:      {n:"RS-BTC",         bal:["rsBal"],   pnl:["rsPnl"], tag:"fuerza relativa vs BTC"}
  };
  var KEY="radar_abiertos4", abiertos={};
  try{abiertos=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){}
  var st=document.createElement("style");
  st.textContent=[
    '.bot-oculto,.legado-oculto{display:none!important}',
    '.bot-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;margin:0 0 12px;border:1px solid var(--hair,rgba(255,255,255,.08));border-radius:14px;background:var(--surface,rgba(255,255,255,.02));cursor:pointer;user-select:none}',
    '.bot-bar.abierto{margin-bottom:20px}',
    '.bot-bar .bn{font-weight:600;font-size:1.05em;display:flex;flex-direction:column;gap:3px}',
    '.bot-bar .bn small{font-weight:400;font-size:11px;letter-spacing:.06em;opacity:.55}',
    '.bot-bar .bd{display:flex;align-items:center;gap:14px;opacity:.85}',
    '.bot-bar .br{display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}',
    '.bot-bar .bg{font-size:1.6em;font-weight:700;letter-spacing:-.01em;line-height:1.1;display:flex;align-items:center;gap:10px;justify-content:flex-end}',
    '.bot-bar .bg .bp{font-size:.62em;font-weight:700;padding:3px 10px;border-radius:999px;background:rgba(127,127,127,.14)}',
    '.bot-bar .bk{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;opacity:.55}',
    '.bot-bar .bt{font-size:1.75em;font-weight:700;letter-spacing:-.01em;line-height:1.1;color:var(--ink,#e8efe9)}',
    '.bot-bar .bg{font-size:1.15em!important}',
    '.bot-bar .bv{font-size:.85em;opacity:.65}',
    '.bot-bar .ch{transition:transform .2s;opacity:.6}',
    '.bot-bar.abierto .ch{transform:rotate(90deg)}',
    '.bot-bar[data-g="lab"]{margin-top:78px;border-style:dashed;background:transparent;position:relative;opacity:.9}',
    '.bot-bar[data-g="lab"]:before{content:"LABORATORIO \\00B7  SIMULACIONES";position:absolute;left:0;right:0;top:-44px;padding-top:16px;border-top:1px solid rgba(255,255,255,.12);text-align:center;font:600 10.5px/1 system-ui;letter-spacing:.24em;color:rgba(232,239,233,.45)}',
    '.bot-bar[data-g="lab"] .bt{color:rgba(232,239,233,.75)}',
    '.bot-bar[data-g="liquido"]{border:1px solid rgba(191,215,141,.6);background:linear-gradient(135deg,rgba(191,215,141,.16),rgba(191,215,141,.04));border-left:4px solid #BFD78D;margin:4px 0 22px}',
    '.bot-bar[data-g="liquido"] .bn{color:#BFD78D}',
    '.bot-bar[data-g="liquido"] .bt{color:#BFD78D}',
    '.bot-bar[data-g="liquido"] .bv{color:rgba(191,215,141,.75);opacity:1}',
    '.bot-bar[data-g="total"]{padding:24px 20px;margin-bottom:26px;border:1px solid rgba(191,215,141,.55);background:linear-gradient(135deg,rgba(191,215,141,.14),rgba(191,215,141,.03));box-shadow:0 10px 30px rgba(0,0,0,.25)}',
    '.bot-bar[data-g="total"] .bn{font-size:1.25em;letter-spacing:.02em}',
    '.bot-bar[data-g="total"] .bt{font-size:2.2em}',
    '.bot-bar.sub{margin:0 0 10px 22px;padding:12px 16px;border-radius:12px;background:rgba(127,127,127,.04)}',
    '.bot-bar.sub .bt{font-size:1.3em}',
    '.bot-bar.sub .bn{font-size:.95em}',
    '.bot-bar.sub.abierto{margin-bottom:16px;border-color:rgba(191,215,141,.45)}'
  ].join("");
  document.head.appendChild(st);

  function legado(el){
    if(el.id==="alertCard"||el.id==="discipline") return true;
    if(el.querySelector&&(el.querySelector("#semBal")||el.querySelector("#positions")||el.querySelector("#sHistory")||el.querySelector("#fondoAuditor"))) return true;
    return false;
  }
  function grupoDe(el, actual){
    if(el.classList.contains("bot-bar")) return actual;
    if(el.id==="sysHero") return "total";
    if(el.id==="colchonSec") return "colchon";
    if(el.id==="binanceSec") return "binance";
    if(el.id==="liquidoSec") return "liquido";
    if(el.tagName==="HEADER"||el.id==="fondoWrap") return "lab";
    if(el.id==="retiroSec") return "retiro";
    if(el.tagName==="HR"&&el.classList.contains("gan-sep")) return "lab";
    if(el.id==="pescadorV2"||el.id==="pescadorChico"||el.id==="labV51Host"||el.classList.contains("labsec")) return "lab";
    if(el.tagName==="FOOTER"||el.tagName==="SCRIPT"||el.tagName==="STYLE") return null;
    return actual;
  }
  function subDe(el, actual){
    if(el.tagName==="HEADER"||el.id==="fondoWrap") return "fondo";
    if(el.id==="pescadorV2") return "pescador";
    if(el.id==="pescadorChico") return "chico";
    if(el.id==="faroRadar") return "faro";
    if(el.id==="rsRadar") return "rs";
    if(el.id==="labV51Host") return "ganesha";
    if(el.tagName==="HR"&&el.classList.contains("gan-sep")) return "ganesha";
    return actual;
  }
  function barra(g){
    var esSub=!!SUB[g]&&!G[g], D=esSub?SUB[g]:G[g];
    var b=document.querySelector('.bot-bar[data-g="'+g+'"]'); if(b) return b;
    b=document.createElement("div"); b.className="bot-bar"+(esSub?" sub":""); b.setAttribute("data-g",g);
    b.innerHTML='<span class="bn">'+D.n+(D.tag?'<small>'+D.tag+'</small>':'')+'</span><span class="bd"><span class="br"><span class="bk">Total en cartera</span><span class="mono bt">&mdash;</span><span class="mono bg">&mdash;</span><span class="mono bv">&mdash;</span></span><span class="ch">&#9656;</span></span>';
    var k=esSub?"sub_"+g:g;
    b.addEventListener("click",function(){abiertos[k]=!abiertos[k];try{localStorage.setItem(KEY,JSON.stringify(abiertos));}catch(e){}aplicar();});
    return b;
  }
  var ocupado=false;
  function aplicar(){
    if(ocupado) return; ocupado=true;
    try{
      var actual=null, sub=null, primero={}, primSub={}, subEls={};
      Array.prototype.slice.call(document.body.children).forEach(function(el){
        if(el.classList.contains("bot-bar")) return;
        if(legado(el)){ el.classList.add("legado-oculto"); return; }
        actual=grupoDe(el,actual);
        if(actual==="lab"){ sub=subDe(el,sub); } else sub=null;
        if(actual&&G[actual]){
          el.setAttribute("data-grupo",actual);
          if(!primero[actual]) primero[actual]=el;
          var visible=!!abiertos[actual]&&(!sub||!!abiertos["sub_"+sub]);
          if(sub&&!primSub[sub]) primSub[sub]=el;
          if(sub){ (subEls[sub]=subEls[sub]||[]).push(el); }
          el.classList.toggle("bot-oculto",!visible);
        } else if(el.hasAttribute("data-grupo")){ el.removeAttribute("data-grupo"); el.classList.remove("bot-oculto"); }
      });
      Object.keys(G).forEach(function(g){
        var b=barra(g), p=primero[g];
        if(!p){ if(b.parentNode) b.parentNode.removeChild(b); return; }
        var nx=b.nextElementSibling, ok=(nx===p)||(nx&&nx.classList.contains("sub")&&nx.nextElementSibling===p);
        if(!ok) p.parentNode.insertBefore(b,p);
        b.classList.toggle("abierto",!!abiertos[g]);
      });
      // Laboratorio ordenado por efectividad: % de ganancia sobre lo puesto, de mayor a menor
      var orden=Object.keys(subEls).map(function(g){var D=SUB[g],bal=suma(D.bal),pnl=suma(D.pnl);
        var pc=(bal!=null&&pnl!=null&&bal-pnl>0)?pnl/(bal-pnl):-1e9; return {g:g,pc:pc};}).sort(function(a,b){return b.pc-a.pc;}).map(function(x){return x.g;});
      var actualOrden=Object.keys(subEls).sort(function(a,b){return subEls[a][0].compareDocumentPosition(subEls[b][0])&Node.DOCUMENT_POSITION_FOLLOWING?-1:1;});
      var ft=document.querySelector("body > footer");
      if(ft&&orden.length&&orden.join()!==actualOrden.join()&&orden.every(function(g){return suma(SUB[g].bal)!=null;})){
        orden.forEach(function(g){ var b=barra(g); ft.parentNode.insertBefore(b,ft); subEls[g].forEach(function(e){ ft.parentNode.insertBefore(e,ft); }); });
        primSub={}; orden.forEach(function(g){ primSub[g]=subEls[g][0]; });
        var labBar=document.querySelector('.bot-bar[data-g="lab"]'); var f0=document.querySelector('.bot-bar[data-g="'+orden[0]+'"]');
        if(labBar&&f0) f0.parentNode.insertBefore(labBar,f0);
        primero.lab=f0;
      }
      Object.keys(SUB).forEach(function(g){
        var b=barra(g), p=primSub[g];
        if(!p){ if(b.parentNode) b.parentNode.removeChild(b); return; }
        if(b.nextElementSibling!==p) p.parentNode.insertBefore(b,p);
        b.classList.toggle("abierto",!!abiertos["sub_"+g]);
        b.classList.toggle("bot-oculto",!abiertos.lab);
      });
    } finally { ocupado=false; }
  }
  function num(t){
    if(!t) return null;
    var m=String(t).replace(/\u2212/g,"-").match(/(-?)\s*\$\s*(-?)([\d.,]+)/); if(!m) return null;
    var x=m[3];
    if(/,\d{1,2}$/.test(x)&&x.indexOf(".")>=0&&x.lastIndexOf(",")>x.lastIndexOf(".")) x=x.replace(/\./g,"").replace(",",".");
    else x=x.replace(/,/g,"");
    var v=parseFloat(x); if(isNaN(v)) return null; return (m[1]||m[2])?-v:v;
  }
  var fm=function(v){return (v>0?"+":(v<0?"-":""))+"$"+Math.abs(v).toFixed(2)};
  function suma(ids){var t=0,ok=false;ids.forEach(function(i){var e=document.getElementById(i),v=e?num(e.textContent):null;if(v!=null){t+=v;ok=true;}});return ok?t:null;}
  function saldos(){
    Object.keys(G).concat(Object.keys(SUB)).forEach(function(g){
      var bar=document.querySelector('.bot-bar[data-g="'+g+'"]'); if(!bar) return;
      var D=G[g]||SUB[g], bal=suma(D.bal), pnl=suma(D.pnl);
      if(bal!=null) bar.querySelector(".bt").textContent="$"+bal.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
      if(pnl==null){ if(D.sub){ bar.querySelector(".bg").textContent=""; bar.querySelector(".bv").textContent=D.sub; } return; }
      var pct=(bal!=null&&bal-pnl>0)?100*pnl/(bal-pnl):null;
      var c=pnl>0.004?"#BFD78D":(pnl<-0.004?"#D9967E":"");
      var el=bar.querySelector(".bg");
      el.innerHTML='<span>'+fm(pnl)+'</span>'+(pct!=null?'<span class="bp" style="color:'+c+'">'+(pct>0?"+":"")+pct.toFixed(2)+'%</span>':'');
      el.style.color=c;
      if(bal!=null) bar.querySelector(".bv").textContent="ganancia \u00b7 puso $"+(bal-pnl).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    });
  }
  var t=null;
  new MutationObserver(function(){ if(ocupado) return; clearTimeout(t); t=setTimeout(aplicar,120); }).observe(document.body,{childList:true});
  aplicar();
  setInterval(function(){aplicar();saldos();},2000);
})();

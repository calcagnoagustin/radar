/* desplegables.js (09/10/2026) - 4 bloques plegables: Total, Fondo Abundancia, Fondo de Retiro y
   Laboratorio (Ganesha, Pescadores, Faro, RS y cualquier experimento futuro).
   No mueve el DOM: marca cada hijo de <body> con su grupo y lo oculta con una clase.
   Lo de Semillas 1.0 (cerrado) se oculta siempre. */
(function(){
  var G={
    total:  {n:"Total",             bal:["sysBal"],  pnl:["sysPct"]},
    fondo:  {n:"Fondo Abundancia",  bal:["fBal"],    pnl:["fPnl"], tag:"rotativo \u00b7 paper"},
    retiro: {n:"Fondo de Retiro",   bal:["retBal"],  pnl:["retPnl"], tag:"real \u00b7 Inviu"},
    lab:    {n:"Laboratorio",       bal:["gBal","p2Bal","pcBal","faroBal","rsBal"],
             pnl:["gGen","p2Real","p2Unr","pcReal","pcUnr","faroPnl","rsPnl"], tag:"experimentos \u00b7 paper \u00b7 no suman al total"}
  };
  var SUB={
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
    '.bot-bar[data-g="lab"]{margin-top:26px;border-style:dashed}',
    '.bot-bar.sub{margin:0 0 10px 22px;padding:12px 16px;border-radius:12px;background:rgba(127,127,127,.04)}',
    '.bot-bar.sub .bt{font-size:1.3em}',
    '.bot-bar.sub .bn{font-size:.95em}',
    '.bot-bar.sub.abierto{margin-bottom:16px;border-color:rgba(111,191,142,.45)}'
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
    if(el.tagName==="HEADER"||el.id==="fondoWrap") return "fondo";
    if(el.id==="retiroSec") return "retiro";
    if(el.tagName==="HR"&&el.classList.contains("gan-sep")) return "lab";
    if(el.id==="pescadorV2"||el.id==="pescadorChico"||el.id==="labV51Host"||el.classList.contains("labsec")) return "lab";
    if(el.tagName==="FOOTER"||el.tagName==="SCRIPT"||el.tagName==="STYLE") return null;
    return actual;
  }
  function subDe(el, actual){
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
      var actual=null, sub=null, primero={}, primSub={};
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
      if(pnl==null) return;
      var pct=(bal!=null&&bal-pnl>0)?100*pnl/(bal-pnl):null;
      var c=pnl>0.004?"#3fb950":(pnl<-0.004?"#f85149":"");
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

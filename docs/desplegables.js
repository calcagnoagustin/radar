/* desplegables.js (21/09/2026) - Cada bot del Radar como bloque plegable.
   No mueve nada del DOM: marca cada elemento con su grupo y lo oculta con una
   clase (no pisa los display:none que ponen los otros scripts). Arranca todo
   cerrado; recuerda lo que abriste en este navegador. */
(function(){
  var G={
    total:  {n:"Total sistema",  bal:"sysBal", pnl:"sysPct"},
    fondo:  {n:"Fondo Semillas", bal:"fBal",   pnl:"fPnl"},
    ganesha:{n:"Ganesha",        bal:"gBal",   pnl:"gGen"},
    pescador:{n:"Pescador",      bal:"p2Bal",  sum:["p2Real","p2Unr"]},
    chico:  {n:"Pescador Chico", bal:"pcBal",  sum:["pcReal","pcUnr"]}
  };
  var KEY="radar_abiertos";
  var abiertos={};
  try{abiertos=JSON.parse(localStorage.getItem(KEY)||"{}")||{};}catch(e){}

  var st=document.createElement("style");
  st.textContent=[
    '.bot-oculto{display:none!important}',
    '.bot-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;',
    'padding:16px 18px;margin:0 0 12px;border:1px solid var(--hair,rgba(255,255,255,.08));',
    'border-radius:14px;background:var(--surface,rgba(255,255,255,.02));cursor:pointer;user-select:none}',
    '.bot-bar.abierto{margin-bottom:20px}',
    '.bot-bar .bn{font-weight:600;font-size:1.05em}',
    '.bot-bar .bd{display:flex;align-items:center;gap:14px;opacity:.85}',
    '.bot-bar .br{display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}',
    '.bot-bar .bg{font-size:1.02em;font-weight:600}',
    '.bot-bar .bv{font-size:.8em;opacity:.6}',
    '.bot-bar .ch{transition:transform .2s;opacity:.6}',
    '.bot-bar.abierto .ch{transform:rotate(90deg)}',
    'hr.gan-sep[data-grupo],#pescadorV2>hr.gan-sep,#pescadorChico>hr.gan-sep{display:none}'
  ].join("");
  document.head.appendChild(st);

  function grupoDe(el, actual){
    if(el.classList.contains("bot-bar")) return actual;
    if(el.id==="sysHero") return "total";
    if(el.tagName==="HEADER") return "fondo";
    if(el.id==="pescadorV2") return "pescador";
    if(el.id==="pescadorChico") return "chico";
    if(el.tagName==="HR"&&el.classList.contains("gan-sep")){
      var sig=el.nextElementSibling;
      if(sig&&sig.classList.contains("gan-head")&&/Ganesha/.test(sig.textContent)) return "ganesha";
    }
    if(el.classList.contains("gan-head")&&/Ganesha/.test(el.textContent)) return "ganesha";
    if(el.tagName==="FOOTER"||el.tagName==="SCRIPT"||el.tagName==="STYLE") return null;
    return actual;
  }

  function barra(g){
    var b=document.querySelector('.bot-bar[data-g="'+g+'"]');
    if(b) return b;
    b=document.createElement("div");
    b.className="bot-bar"; b.setAttribute("data-g",g);
    b.innerHTML='<span class="bn">'+G[g].n+'</span><span class="bd"><span class="br"><span class="mono bg">&mdash;</span><span class="mono bv">&mdash;</span></span><span class="ch">&#9656;</span></span>';
    b.addEventListener("click",function(){
      abiertos[g]=!abiertos[g];
      try{localStorage.setItem(KEY,JSON.stringify(abiertos));}catch(e){}
      aplicar();
    });
    return b;
  }

  var ocupado=false;
  function aplicar(){
    if(ocupado) return; ocupado=true;
    try{
      var actual=null, primero={};
      Array.prototype.slice.call(document.body.children).forEach(function(el){
        actual=grupoDe(el,actual);
        if(el.classList.contains("bot-bar")) return;
        if(actual&&G[actual]){
          el.setAttribute("data-grupo",actual);
          if(!primero[actual]) primero[actual]=el;
          el.classList.toggle("bot-oculto",!abiertos[actual]);
        } else if(el.hasAttribute("data-grupo")){
          el.removeAttribute("data-grupo"); el.classList.remove("bot-oculto");
        }
      });
      Object.keys(G).forEach(function(g){
        var b=barra(g), p=primero[g];
        if(!p){ if(b.parentNode) b.parentNode.removeChild(b); return; }
        if(b.nextElementSibling!==p) p.parentNode.insertBefore(b,p);
        b.classList.toggle("abierto",!!abiertos[g]);
      });
    } finally { ocupado=false; }
  }

  function num(t){
    if(!t) return null;
    var m=String(t).replace(/\u2212/g,"-").match(/(-?)\s*\$\s*(-?)([\d.,]+)/);
    if(!m) return null;
    var x=m[3];
    if(/,\d{1,2}$/.test(x)&&x.indexOf(".")>=0&&x.lastIndexOf(",")>x.lastIndexOf(".")) x=x.replace(/\./g,"").replace(",",".");
    else x=x.replace(/,/g,"");
    var v=parseFloat(x); if(isNaN(v)) return null;
    return (m[1]||m[2])?-v:v;
  }
  function pctDe(t){ var m=String(t||"").match(/\(\s*([+\-\u2212]?[\d.,]+)\s*%\s*\)/);
    return m?parseFloat(m[1].replace("\u2212","-").replace(",",".")):null; }
  var fm=function(v){return (v>0?"+":(v<0?"-":""))+"$"+Math.abs(v).toFixed(2)};
  function saldos(){
    Object.keys(G).forEach(function(g){
      var bar=document.querySelector('.bot-bar[data-g="'+g+'"]'); if(!bar) return;
      var c=G[g], bs=document.getElementById(c.bal), bal=bs?num(bs.textContent):null;
      if(bal!=null) bar.querySelector(".bv").textContent="saldo $"+bal.toFixed(2);
      var pnl=null, pct=null;
      if(c.pnl){ var e=document.getElementById(c.pnl); if(e){ pnl=num(e.textContent); pct=pctDe(e.textContent); } }
      if(c.sum){ pnl=0; c.sum.forEach(function(id){ var e=document.getElementById(id), v=e?num(e.textContent):null;
        if(v==null) pnl=null; else if(pnl!=null) pnl+=v; }); }
      if(pnl==null) return;
      if(pct==null&&bal!=null&&bal-pnl>0) pct=100*pnl/(bal-pnl);
      var el=bar.querySelector(".bg");
      el.textContent=fm(pnl)+(pct!=null?" \u00b7 "+(pct>0?"+":"")+pct.toFixed(2)+"%":"");
      el.style.color=pnl>0.004?"#3fb950":(pnl<-0.004?"#f85149":"");
    });
  }

  var t=null;
  new MutationObserver(function(){ if(ocupado) return; clearTimeout(t); t=setTimeout(aplicar,120); })
    .observe(document.body,{childList:true});
  aplicar();
  setInterval(function(){aplicar();saldos();},2000);
})();

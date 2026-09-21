/* desplegables.js (21/09/2026) - Cada bot del Radar como bloque plegable.
   No mueve nada del DOM: marca cada elemento con su grupo y lo oculta con una
   clase (no pisa los display:none que ponen los otros scripts). Arranca todo
   cerrado; recuerda lo que abriste en este navegador. */
(function(){
  var G={
    total:  {n:"Total sistema",  bal:"sysBal"},
    fondo:  {n:"Fondo Semillas", bal:"fBal"},
    ganesha:{n:"Ganesha",        bal:"gBal"},
    pescador:{n:"Pescador",      bal:"p2Bal"},
    chico:  {n:"Pescador Chico", bal:"pcBal"}
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
    b.innerHTML='<span class="bn">'+G[g].n+'</span><span class="bd"><span class="mono bv">&mdash;</span><span class="ch">&#9656;</span></span>';
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

  function saldos(){
    Object.keys(G).forEach(function(g){
      var b=document.querySelector('.bot-bar[data-g="'+g+'"] .bv'), s=document.getElementById(G[g].bal);
      if(b&&s&&s.textContent) b.textContent=s.textContent;
    });
  }

  var t=null;
  new MutationObserver(function(){ if(ocupado) return; clearTimeout(t); t=setTimeout(aplicar,120); })
    .observe(document.body,{childList:true});
  aplicar();
  setInterval(function(){aplicar();saldos();},2000);
})();

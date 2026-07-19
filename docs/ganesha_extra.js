/* ganesha_extra.js — mejoras del Radar sin tocar el bot.
   1) Cada activo del portfolio (posiciones Semillas/Ganesha, shortlist e historial)
      es clickeable -> abre TradingView en BINANCE:<PAR> con velas 1D.
   2) En cada posicion abierta de Ganesha marca el nivel de TP1 previsto (+2R, vende 30%).
   NO duplica el historial: ese ya lo renderiza el dashboard.
   Se re-aplica en intervalos porque los scripts base re-renderizan cada 60s. */
(function(){
  function tvOpen(sym){window.open("https://www.tradingview.com/chart/?symbol=BINANCE:"+sym.replace("/","").toUpperCase()+"&interval=1D","_blank","noopener");}
  function mk(el,sym){
    if(el.dataset.tv)return;
    el.dataset.tv="1";el.style.cursor="pointer";el.title="Ver en TradingView (1D)";el.style.textDecoration="underline dotted";
    el.addEventListener("click",function(e){e.stopPropagation();tvOpen(sym);});
  }
  function linkify(){
    document.querySelectorAll(".sym").forEach(function(el){
      var base=el.textContent.trim();if(!base)return;
      var quote="USDT";var pe=el.parentElement&&el.parentElement.querySelector(".pair");
      if(pe){var m=pe.textContent.replace("/","").trim();if(m)quote=m;}
      mk(el,base+"/"+quote);
    });
    document.querySelectorAll("#shortlist .chip").forEach(function(c){
      var base=(c.textContent.trim().split(/\s/)[0]||"");if(!base)return;mk(c,base+"/USDT");
    });
    document.querySelectorAll("#gHistory .lbl b, #sHistory .lbl b").forEach(function(b){
      var base=(b.textContent.trim().split(/\s/)[0]||"");if(!base)return;mk(b,base+"/USDT");
    });
  }
  var D=null;
  function loadG(){return fetch("./ganesha_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)D=j;}).catch(function(){});}
  function fU(n){return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:n<1?4:2,maximumFractionDigits:n<1?4:2});}
  function tpOpen(){
    if(!D)return;
    var cont=document.getElementById("gPositions");if(!cont)return;
    var rows=cont.querySelectorAll(".pos");var op=D.open_positions||[];
    rows.forEach(function(row,i){
      if(row.dataset.tp)return;var p=op[i];if(!p)return;
      var slot=row.querySelector(".pos-meta")||row;
      var html;
      if(p.tp1_done){html='<span style="margin-left:14px">TP1 <b class="mono up">✓ hecho</b></span>';}
      else if(p.entry!=null&&p.stop!=null&&p.entry>p.stop){var tp=p.entry+2*(p.entry-p.stop);html='<span style="margin-left:14px">TP1 <b class="mono">'+fU(tp)+'</b> (+2R · vende 30%)</span>';}
      else return;
      slot.insertAdjacentHTML("beforeend",html);row.dataset.tp="1";
    });
  }
  function apply(){linkify();tpOpen();}
  loadG().then(function(){setTimeout(apply,1000);});
  setInterval(function(){loadG();},20000);
  setInterval(apply,2500);
})();

/* ganesha_extra.js — bloque 2 (18 jul 2026): curva de equity REALIZADA.
   Calcula el P&L realizado acumulado desde recent_closed (que el dashboard ya carga)
   y lo dibuja como card SVG, sin dependencias externas (CSP-safe).
   Es realizada (cierres): la equity total mark-to-market no es reconstruible mientras
   deposits_total no quede registrado. */
(function(){
  var G=null, lastSig="";
  function load(){return fetch("./ganesha_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)G=j;}).catch(function(){});}
  function fU(n){return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function anchor(){var h=document.getElementById("gHistory");return h?h.closest(".card"):null;}
  function ensureCard(){
    if(document.getElementById("gEqCurveCard"))return document.getElementById("gEqCurveBody");
    var a=anchor();if(!a||!a.parentNode)return null;
    var card=document.createElement("div");
    card.className="card";card.id="gEqCurveCard";card.style.marginTop="18px";
    card.innerHTML='<div class="head"><span class="title">Curva de equity</span><span class="eyebrow">realizada · acumulado</span></div><div class="body" id="gEqCurveBody"></div>';
    a.parentNode.insertBefore(card,a);
    return card.querySelector("#gEqCurveBody");
  }
  function render(){
    if(!G||!G.recent_closed||!G.recent_closed.length)return;
    var cl=G.recent_closed.slice().sort(function(x,y){return (x.closed_ts||0)-(y.closed_ts||0);});
    var sig=cl.length+":"+(cl[cl.length-1].closed_ts||0);
    var body=ensureCard();if(!body)return;
    if(sig===lastSig&&body.dataset.done)return;lastSig=sig;
    var cum=0, pts=[{c:0,a:"base"}];
    cl.forEach(function(t){cum+=(t.pnl_net||0);pts.push({c:cum,a:t.action||"stop"});});
    var vals=pts.map(function(p){return p.c;});
    var mx=Math.max.apply(null,vals.concat([0])), mn=Math.min.apply(null,vals.concat([0]));
    var pad=(mx-mn)*0.12||1; mx+=pad; mn-=pad;
    var W=320,H=132,L=10,R=10,T=12,B=20, pw=W-L-R, ph=H-T-B;
    function X(i){return L+(pts.length<2?0:pw*i/(pts.length-1));}
    function Y(v){return T+ph*(mx-v)/(mx-mn);}
    var line=pts.map(function(p,i){return (i?"L":"M")+X(i).toFixed(1)+" "+Y(p.c).toFixed(1);}).join(" ");
    var y0=Y(0).toFixed(1);
    var dots=pts.map(function(p,i){
      if(p.a==="base")return "";
      var col=p.a==="tp"?"var(--jade)":(p.a==="manual"?"var(--grain)":"var(--clay)");
      return '<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.c).toFixed(1)+'" r="3.2" style="fill:'+col+'"></circle>';
    }).join("");
    var lastC=pts[pts.length-1].c, floor=Math.min.apply(null,vals);
    var lastCol=lastC>=0?"var(--jade)":"var(--clay)";
    var svg='<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Curva de P&L realizado acumulado de Ganesha">'
      +'<line x1="'+L+'" y1="'+y0+'" x2="'+(W-R)+'" y2="'+y0+'" style="stroke:var(--faint);stroke-dasharray:3 3;stroke-width:1"></line>'
      +'<text x="'+(W-R)+'" y="'+(+y0-3)+'" text-anchor="end" style="fill:var(--faint);font:10px \'IBM Plex Mono\',monospace">0</text>'
      +'<path d="'+line+'" style="fill:none;stroke:var(--sky);stroke-width:2;stroke-linejoin:round;stroke-linecap:round"></path>'
      +dots+'</svg>';
    var legend='<div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:var(--muted)">'
      +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--jade);margin-right:5px"></span>cierre en TP</span>'
      +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--clay);margin-right:5px"></span>cierre en stop</span>'
      +'<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--grain);margin-right:5px"></span>cierre manual</span></div>';
    var stats='<div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--muted)">'
      +'<span>Realizado <b class="mono" style="color:'+lastCol+'">'+fU(lastC)+'</b></span>'
      +'<span>Piso <b class="mono down">'+fU(floor)+'</b></span>'
      +'<span>Cierres <b class="mono" style="color:var(--ink)">'+cl.length+'</b></span></div>';
    var note='<div class="note">Sólo P&amp;L de operaciones cerradas. No incluye lo no-realizado de las posiciones abiertas ni la equity total (depósitos no registrados).</div>';
    body.innerHTML=svg+legend+stats+note;body.dataset.done="1";
  }
  load().then(function(){setTimeout(render,1200);});
  setInterval(function(){load().then(render);},20000);
  setInterval(render,3000);
})();

/* binance_card.js (10/10/2026) - Bloque BINANCE (plata real sin invertir): cuenta principal + subcuentas
   menos lo reservado para el Colchon. Lee binance_data.json (VM binance_main/publicar.py, diario). */
(function(){
  var B=null, sig="";
  var $=function(i){return document.getElementById(i);};
  var fU=function(n,d){d=(d==null?2:d);return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
  function ensure(){
    if($("binanceSec")) return true;
    var ret=$("retiroSec"); if(!ret||!ret.parentNode) return false;
    var w=document.createElement("div"); w.id="binanceSec";
    w.innerHTML='<section class="hero" style="border-color:rgba(240,185,11,.35)"><div><div class="eyebrow">Balance (USD) &middot; Binance &middot; real, sin invertir</div>'
      +'<div class="pnl-val mono" id="binBal">&mdash;</div><div class="pnl-sub" id="binSub"></div></div>'
      +'<div class="hero-stats"><div class="stat"><div class="k">Resultado hist&oacute;rico (desde 2018)</div><div class="v mono" id="binPnl" style="font-size:1.3em">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Aportes netos</div><div class="v mono" id="binAp">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Reservado Colch&oacute;n</div><div class="v mono" id="binRes">&mdash;</div></div></div></section>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Qu&eacute; hay</span><span class="eyebrow" id="binAct"></span></div><div class="body" id="binComp"></div></div>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Plata que entr&oacute; (+) y sali&oacute; (&minus;) por a&ntilde;o</span><span class="eyebrow">aprox.</span></div><div class="body" id="binAnios"></div></div>';
    ret.parentNode.insertBefore(w,ret.nextSibling); return true;
  }
  function render(){
    if(!B||!ensure()) return; if(sig===B.actualizado) return; sig=B.actualizado;
    $("binBal").textContent=fU(B.saldo_usd);
    $("binSub").textContent="Cuenta "+fU(B.cuenta_total_usd)+" menos "+fU(B.reservado_colchon_usd,0)+" en USDT que van al Colch\u00f3n. Destino: el Fondo Abundancia cuando pase a real.";
    var p=B.pnl_historico_usd; $("binPnl").innerHTML='<span style="color:'+(p>=0?"var(--jade)":"var(--clay)")+'">'+(p>=0?"+":"")+fU(p)+'</span>';
    $("binAp").textContent=fU(B.aportes_netos_usd); $("binRes").textContent=fU(B.reservado_colchon_usd,0);
    $("binAct").textContent="al "+String(B.actualizado).replace("T"," ")+" UTC";
    $("binComp").innerHTML=(B.composicion||[]).map(function(x){return '<div class="row"><span class="lbl">'+x.activo+'</span><span class="mono">'+fU(x.usd)+'</span></div>';}).join("");
    var a=B.aportes_por_anio||{};
    $("binAnios").innerHTML=Object.keys(a).map(function(k){var v=a[k];return '<div class="row"><span class="lbl">'+k+'</span><span class="mono" style="color:'+(v>=0?"var(--ink)":"var(--muted)")+'">'+(v>=0?"+":"")+fU(v,0)+'</span></div>';}).join("")
      +'<div class="note" style="margin-top:10px">'+(B.nota||"")+' Incluye lo que mandaste a otras billeteras como salida.</div>';
  }
  function load(){return fetch("./binance_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)B=j;}).catch(function(){});}
  load().then(function(){setTimeout(render,900);}); setInterval(function(){load().then(render);},60000); setInterval(render,3000);
})();

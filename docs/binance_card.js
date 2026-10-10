/* binance_card.js (10/10/2026) - Bloque BINANCE (plata real sin invertir): cuenta principal + subcuentas
   menos lo reservado para el Colchon. Lee binance_data.json (VM binance_main/publicar.py, diario). */
(function(){
  var B=null, sig="", t0=Date.now();
  var $=function(i){return document.getElementById(i);};
  var fU=function(n,d){d=(d==null?2:d);return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
  function ensure(){
    if($("binanceSec")) return true;
    // 10/10/2026 (orden pedido por Agus): Total, Colchon, Binance, subtotal liquido, Fondo de Retiro.
    var col=$("colchonSec"), ret=$("retiroSec");
    if(!col&&Date.now()-t0<12000) return false;
    if(!col&&!(ret&&ret.parentNode)) return false;
    var w=document.createElement("div"); w.id="binanceSec";
    w.innerHTML='<section class="hero" style="border-color:rgba(240,185,11,.35)"><div><div class="eyebrow">Balance (USD) &middot; Binance &middot; real, sin invertir</div>'
      +'<div class="pnl-val mono" id="binBal">&mdash;</div><div class="pnl-sub" id="binSub"></div></div>'
      +'<div class="hero-stats"><div class="stat"><div class="k">Resultado desde el 10/10/2026</div><div class="v mono" id="binPnl" style="font-size:1.3em">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Base 10/10/2026</div><div class="v mono" id="binAp">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Reservado Colch&oacute;n</div><div class="v mono" id="binRes">&mdash;</div></div></div></section>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Qu&eacute; hay</span><span class="eyebrow" id="binAct"></span></div><div class="body" id="binComp"></div></div>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Historial desde la base</span><span class="eyebrow">diario</span></div><div class="body" id="binAnios"></div></div>';
    if(col) col.parentNode.insertBefore(w,col.nextSibling); else ret.parentNode.insertBefore(w,ret);
    // Subtotal liquido = Colchon + Binance (lo que se puede usar ya). El Retiro (Inviu, a 20 anios) va abajo.
    var l=document.createElement("div"); l.id="liquidoSec";
    l.innerHTML='<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Qu&eacute; suma</span><span class="eyebrow">Colch&oacute;n + Binance</span></div><div class="body" id="liqPartes"></div></div><span id="liqBal" style="display:none"></span>';
    w.parentNode.insertBefore(l,w.nextSibling);
    if(ret&&ret.parentNode&&(ret.compareDocumentPosition(l)&Node.DOCUMENT_POSITION_FOLLOWING)) l.parentNode.insertBefore(ret,l.nextSibling);
    return true;
  }
  function liquido(){
    var c=parseFloat((($("colBal")||{}).textContent||"").replace(/[^0-9.\-]/g,"")), b=(B&&B.saldo_usd!=null)?B.saldo_usd:NaN;
    if(isNaN(c)||isNaN(b)) return;
    var el=$("liqBal"); if(el) el.textContent=fU(c+b);
    var pt=$("liqPartes"); if(pt) pt.innerHTML='<div class="row"><span class="lbl">Colch&oacute;n (Mercado Pago)</span><span class="mono">'+fU(c)+'</span></div><div class="row"><span class="lbl">Binance (sin invertir)</span><span class="mono">'+fU(b)+'</span></div><div class="row"><span class="lbl"><b style="color:var(--ink)">Subtotal l&iacute;quido</b></span><span class="mono"><b>'+fU(c+b)+'</b></span></div><div class="note" style="margin-top:10px">Plata disponible ya. El Fondo de Retiro no entra: es a 20 a&ntilde;os y est&aacute; en Inviu.</div>';
  }
  function render(){
    if(!B||!ensure()) return; liquido(); if(sig===B.actualizado) return; sig=B.actualizado;
    $("binBal").textContent=fU(B.saldo_usd);
    $("binSub").textContent="Cuenta "+fU(B.cuenta_total_usd)+" menos "+fU(B.reservado_colchon_usd,0)+" en USDT que van al Colch\u00f3n. Destino: el Fondo Abundancia cuando pase a real.";
    // 10/10/2026 (decision Agus): la verdad arranca en la foto de ese dia (baseline). El historico 2018-2026 es sucio y no se muestra.
    var bl=B.baseline||{}, p=(bl.pnl_desde_baseline_usd!=null)?bl.pnl_desde_baseline_usd:0;
    $("binPnl").innerHTML='<span style="color:'+(p>=0?"var(--jade)":"var(--clay)")+'">'+(p>=0?"+":"")+fU(p)+(bl.pnl_desde_baseline_pct!=null?' <span style="font-size:.7em">('+(p>=0?"+":"")+bl.pnl_desde_baseline_pct.toFixed(2)+'%)</span>':'')+'</span>';
    $("binAp").textContent=fU(bl.total_usd||0)+(bl.flujos_posteriores_usd?(" \u00b7 flujos "+(bl.flujos_posteriores_usd>0?"+":"")+fU(bl.flujos_posteriores_usd)):""); $("binRes").textContent=fU(B.reservado_colchon_usd,0);
    $("binAct").textContent="al "+String(B.actualizado).replace("T"," ")+" UTC";
    $("binComp").innerHTML=(B.composicion||[]).map(function(x){return '<div class="row"><span class="lbl">'+x.activo+'</span><span class="mono">'+fU(x.usd)+'</span></div>';}).join("");
    var h=(B.historial||[]).slice(-30).reverse();
    $("binAnios").innerHTML=h.map(function(x){var v=x.pnl_bl||0;return '<div class="row"><span class="lbl">'+x.d+'</span><span class="mono">'+fU(x.total)+' <span style="color:'+(v>=0?"var(--jade)":"var(--clay)")+';font-size:.85em">'+(v>=0?"+":"")+fU(v)+'</span></span></div>';}).join("")
      +'<div class="note" style="margin-top:10px">Base: foto de la cuenta del 10/10/2026 ('+fU((B.baseline||{}).total_usd||0)+'). El resultado descuenta lo que entre o salga despu\u00e9s de esa fecha.</div>';
  }
  function load(){return fetch("./binance_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)B=j;}).catch(function(){});}
  load().then(function(){setTimeout(render,900);}); setInterval(function(){load().then(render);},60000); setInterval(render,3000);
})();

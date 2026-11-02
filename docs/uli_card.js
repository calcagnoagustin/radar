/* uli_card.js (02/11/2026) - Fondo Uli: fondo de retiro del hijo de Agus (ARQ, SPY). NO suma al Total. Lee uli_data.json. */
(function(){
  var U=null, sig="";
  var $=function(i){return document.getElementById(i);};
  var fU=function(n,d){d=(d==null?0:d);return "$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
  function ensure(){
    if($("uliSec")) return true;
    var ret=$("retiroSec"); if(!ret||!ret.parentNode) return false;
    var w=document.createElement("div"); w.id="uliSec";
    w.innerHTML='<section class="hero" style="border-color:rgba(140,180,220,.35)"><div><div class="eyebrow">Balance (USD) &middot; Fondo Uli &middot; de Uli, no suma a tu total</div>'
      +'<div class="pnl-val mono" id="uliBal">&mdash;</div><div class="pnl-sub" id="uliSub"></div></div>'
      +'<div class="hero-stats"><div class="stat"><div class="k">Aporte</div><div class="v mono" id="uliAp">&mdash;</div></div>'
      +'<div class="stat"><div class="k">A los 65 (7% real)</div><div class="v mono" id="uli65">&mdash;</div></div></div></section>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Proyecci&oacute;n</span><span class="eyebrow" id="uliAct"></span></div><div class="body" id="uliProy"></div></div>';
    ret.parentNode.insertBefore(w,ret.nextSibling); return true;
  }
  function tabla(t,a,b){
    var h='<div style="font-size:12px;color:var(--faint);margin:10px 0 6px">'+t+'</div><div class="row"><span class="lbl" style="color:var(--faint)">Edad &middot; puesto</span><span class="mono" style="color:var(--faint)">7% &middot; 5%</span></div>';
    return h+a.map(function(x,i){return '<div class="row"><span class="lbl"><b style="color:var(--ink)">'+x.edad+' a&ntilde;os</b> <span style="color:var(--faint)">&middot; '+fU(x.puesto)+'</span></span><span class="mono">'+fU(x.valor)+' <span style="color:var(--faint);font-size:.85em">&middot; '+fU(b[i].valor)+'</span></span></div>';}).join("");
  }
  function render(){
    if(!U||!ensure()) return; if(sig===U.publicado) return; sig=U.publicado;
    var P=U.proyeccion||{};
    $("uliBal").textContent=fU(U.saldo_usd,2);
    $("uliSub").textContent=U.donde+" \u00b7 siempre "+U.activo+" \u00b7 Uli tiene "+U.edad+" a\u00f1os. "+(U.plan||"");
    $("uliAp").textContent=fU(U.aporte_mensual_usd)+"/mes";
    var b65=(P.base_7||[]).filter(function(x){return x.edad===65;})[0]; $("uli65").textContent=b65?fU(b65.valor):"\u2014";
    $("uliAct").textContent="al "+U.actualizado;
    $("uliProy").innerHTML=tabla("Si siguen los "+fU(U.aporte_mensual_usd)+"/mes hasta los 65",P.base_7||[],P.base_5||[])
      +tabla("Si desde los 18 Uli aporta $200/mes",P.uli200_7||[],P.uli200_5||[])
      +'<div class="note" style="margin-top:10px">'+(P.nota||"")+'</div>';
  }
  function load(){return fetch("./uli_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)U=j;}).catch(function(){});}
  load().then(function(){setTimeout(render,900);}); setInterval(function(){load().then(render);},60000); setInterval(render,3000);
})();

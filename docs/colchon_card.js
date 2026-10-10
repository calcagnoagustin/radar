/* colchon_card.js (10/10/2026) - Colchón: ahorro de emergencia (6 meses de gastos). Lee colchon_data.json. */
(function(){
  var C=null, sig="";
  var $=function(i){return document.getElementById(i);};
  var fU=function(n,d){d=(d==null?2:d);return "$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
  function ensure(){
    if($("colchonSec")) return true;
    var ref=document.getElementById("retiroSec")||document.querySelector("body > header"); if(!ref) return false;
    var w=document.createElement("div"); w.id="colchonSec";
    w.innerHTML='<section class="hero" style="border-color:rgba(200,180,120,.35)"><div><div class="eyebrow">Balance (USD) &middot; Colch&oacute;n &middot; ahorro de emergencia</div>'
      +'<div class="pnl-val mono" id="colBal">&mdash;</div><div class="pnl-sub" id="colSub"></div></div>'
      +'<div class="hero-stats"><div class="stat"><div class="k">Cubre</div><div class="v mono" id="colMeses">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Meta</div><div class="v mono" id="colMetaV">&mdash;</div></div></div></section>'
      +'<div id="colMeta" style="margin:-6px 0 18px;padding:0 4px"></div>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">D&oacute;nde est&aacute;</span><span class="eyebrow" id="colAct"></span></div><div class="body" id="colPartes"></div></div>';
    ref.parentNode.insertBefore(w,ref); return true;
  }
  function render(){
    if(!C||!ensure()) return; if(sig===C.actualizado+C.saldo_usd) return; sig=C.actualizado+C.saldo_usd;
    var s=C.saldo_usd||0, m=C.meta_usd||1, g=C.gasto_mensual_usd||1;
    $("colBal").textContent=fU(s); $("colSub").textContent="Para imprevistos: se usa y se repone. Plan: "+(C.plan||"");
    $("colMeses").textContent=(s/g).toFixed(1)+" meses"; $("colMetaV").textContent=fU(m,0);
    var p=Math.min(100,100*s/m), p1=100*(C.meta_1_usd||0)/m;
    $("colMeta").innerHTML='<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--faint);margin-bottom:5px"><span>Meta 6 meses &middot; '+fU(m,0)+' &middot; escal&oacute;n 3 meses '+fU(C.meta_1_usd||0,0)+'</span><span class="mono">'+p.toFixed(1)+'%</span></div>'
      +'<div style="position:relative;height:5px;border-radius:4px;background:rgba(127,127,127,.15)"><div style="height:100%;width:'+Math.max(0.6,p)+'%;border-radius:4px;background:#c8b478;opacity:.7"></div>'
      +'<div style="position:absolute;top:-3px;bottom:-3px;left:'+p1+'%;width:1px;background:var(--faint)"></div></div>';
    $("colAct").textContent="al "+C.actualizado;
    $("colPartes").innerHTML=(C.partes||[]).map(function(x){return '<div class="row"><span class="lbl"><b style="color:var(--ink)">'+String(x.donde).split(" \u00b7 ")[0]+'</b>'+(String(x.donde).indexOf(" \u00b7 ")>0?' <span style="color:var(--faint)">\u00b7 '+String(x.donde).split(" \u00b7 ").slice(1).join(" \u00b7 ")+'</span>':'')+(x.ok===false?' <span style="color:var(--clay);font-size:11.5px">&middot; '+(x.nota||"mover")+'</span>':'')+'</span><span class="mono">'+fU(x.usd)+'</span></div>';}).join("")
      +(C.pendiente?'<div class="note" style="margin-top:10px">'+C.pendiente+'</div>':'');
  }
  function load(){return fetch("./colchon_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)C=j;}).catch(function(){});}
  load().then(function(){setTimeout(render,600);}); setInterval(function(){load().then(render);},60000); setInterval(render,3000);
})();

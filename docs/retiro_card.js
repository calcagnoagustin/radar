/* retiro_card.js (09/10/2026) - Fondo de Retiro (REAL, Inviu, manual). Recomendacion del mes arriba,
   balance, distribucion vs objetivo y tenencias. Lee retiro_data.json (VM retiro/retiro.py). */
(function(){
  var R=null, sig="";
  var $=function(i){return document.getElementById(i);};
  var fU=function(n,d){d=(d==null?2:d);return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});};
  var fA=function(n){return "ARS "+Math.round(n).toLocaleString("es-AR");};
  var col=function(n){return n>0.004?"var(--jade)":(n<-0.004?"var(--clay)":"var(--muted)");};
  function ensure(){
    if($("retiroSec")) return true;
    var w=document.createElement("div"); w.id="retiroSec";
    w.innerHTML=
      '<div class="card" id="retRec" style="margin-bottom:18px;border-color:rgba(191,215,141,.55)"><div class="head"><span class="title" id="retRecT">Recomendaci&oacute;n del mes</span><span class="eyebrow">Fondo de Retiro &middot; a 20 a&ntilde;os</span></div><div class="body" id="retRecB"></div></div>'
      +'<section class="hero" style="border-color:rgba(130,170,220,.4)"><div><div class="eyebrow">Balance (USD) &middot; Fondo de Retiro &middot; REAL (Inviu)</div>'
      +'<div class="pnl-val mono" id="retBal">&mdash;</div><div class="pnl-sub" id="retSub">cargando&hellip;</div></div>'
      +'<div class="hero-stats"><div class="stat"><div class="k">Ganancia (en d&oacute;lares MEP)</div><div class="v mono" id="retPnl" style="font-size:1.4em">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Invertido (MEP de cada compra)</div><div class="v mono" id="retCost">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Aporte mensual</div><div class="v mono" id="retAp">&mdash;</div></div>'
      +'<div class="stat"><div class="k">Cuenta desde</div><div class="v mono" id="retDesde">&mdash;</div></div></div></section>'
      +'<div id="retMeta" style="margin:-6px 0 18px;padding:0 4px"></div>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Distribuci&oacute;n vs objetivo</span><span class="eyebrow">a 20 a&ntilde;os</span></div><div class="body" id="retDist"></div></div>'
      +'<div class="card" style="margin-bottom:18px"><div class="head"><span class="title">Tenencias</span><span class="eyebrow" id="retN"></span></div><div class="body" id="retPos"></div></div>';
    var col=document.getElementById("colchonSec"), hd=document.querySelector("body > header");
    if(col&&col.parentNode){ col.parentNode.insertBefore(w,col.nextSibling); return true; }
    if(!hd) return false; hd.parentNode.insertBefore(w,hd); return true;
  }
  function render(){
    if(!R||!ensure()) return;
    if(sig===R.generated_at) return; sig=R.generated_at;
    var rc=R.recomendacion||{};
    $("retRecT").innerHTML="Recomendaci&oacute;n de "+(rc.mes||"");
    var h='<div class="row"><span class="lbl">Aporte del mes (USD '+rc.aporte_usd+' al MEP de hoy)</span><span class="mono"><b>'+fA(rc.presupuesto_ars||0)+'</b></span></div>';
    h+='<div style="padding:10px 0 4px;color:var(--muted);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase">Tu rutina fija</div>';
    (rc.fija||[]).forEach(function(f){h+='<div class="row"><span class="lbl">'+f.q+' '+f.t+'</span><span class="mono">'+fA(f.ars)+'</span></div>';});
    h+='<div style="padding:12px 0 4px;color:var(--muted);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase">Con el resto ('+fA(rc.resto_ars||0)+') te recomiendo</div>';
    (rc.extra||[]).forEach(function(e){
      h+='<div class="pos"><div class="pos-top"><div><span class="sym">'+e.t+'</span>'+(e.q?' <span class="badge confirmed" style="margin-left:8px">'+e.q+' unidades</span>':'')+'</div><div class="pos-pnl mono"><b>'+fA(e.ars)+'</b></div></div>'
        +'<div class="pos-meta"><span style="max-width:100%;line-height:1.5">'+e.porque+(e.tendencia_12m!=null?' &middot; &uacute;ltimos 12 meses '+(e.tendencia_12m>0?"+":"")+(100*e.tendencia_12m).toFixed(0)+'%':'')+'</span></div></div>';
    });
    if((rc.suficiente||[]).length) h+='<div class="note" style="margin-top:10px">Ya alcanza por ahora: '+rc.suficiente.join(", ")+'. No sumar hasta que vuelvan a quedar por debajo de su objetivo.</div>';
    h+='<div class="note" style="margin-top:8px;color:var(--faint)">'+(rc.regla||"")+'</div>';
    $("retRecB").innerHTML=h;
    $("retBal").textContent=fU(R.total_usd); 
    $("retSub").textContent=fA(R.total_ars)+" \u00b7 d\u00f3lar MEP "+R.mep+" \u00b7 tenencias al "+R.tenencias_al;
    var p=R.gan_usd, pc=R.costo_usd>0?100*p/R.costo_usd:0;
    $("retPnl").innerHTML='<span style="color:'+col(p)+'">'+fU(p)+' <span style="font-size:.8em">('+(pc>=0?"+":"")+pc.toFixed(2)+'%)</span></span>';
    if(R.meta_usd){ var pm=Math.min(100,100*R.total_usd/R.meta_usd);
      $("retMeta").innerHTML='<div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--faint);margin-bottom:5px"><span>Meta de libertad &middot; '+fU(R.meta_usd,0)+'</span><span class="mono">'+pm.toFixed(1)+'%</span></div>'
        +'<div style="height:5px;border-radius:4px;background:rgba(127,127,127,.15);overflow:hidden"><div style="height:100%;width:'+Math.max(0.6,pm)+'%;background:var(--jade);opacity:.6"></div></div>'; }
    $("retCost").textContent=fU(R.costo_usd); $("retAp").textContent="USD "+rc.aporte_usd; $("retDesde").textContent=R.cuenta_desde;
    var cl=R.clases||{}, d="";
    ["nucleo","conviccion","argentina","bonos","oro"].forEach(function(k){var c=cl[k]; if(!c) return;
      var w=100*(c.peso||0), o=100*(c.objetivo||0), dif=w-o;
      d+='<div style="padding:8px 0"><div class="row" style="padding:0 0 5px;border:0"><span class="lbl">'+c.nom+'</span><span class="mono">'+w.toFixed(0)+'% <span style="color:var(--faint)">/ obj '+o.toFixed(0)+'%</span> '
        +'<span style="color:'+(Math.abs(dif)<3?"var(--muted)":(dif<0?"var(--clay)":"var(--jade)"))+'">'+(dif>0?"+":"")+dif.toFixed(0)+'</span></span></div>'
        +'<div style="position:relative;height:8px;border-radius:5px;background:rgba(127,127,127,.15)"><div style="position:absolute;left:0;top:0;bottom:0;width:'+Math.min(100,w)+'%;border-radius:5px;background:var(--jade);opacity:.75"></div>'
        +'<div style="position:absolute;top:-3px;bottom:-3px;left:'+o+'%;width:2px;background:var(--ink)"></div></div></div>';});
    $("retDist").innerHTML=d;
    var ps=R.posiciones||[]; $("retN").textContent=ps.length+" activos";
    $("retPos").innerHTML=ps.map(function(x){var g=x.gan_usd, gp=x.cost_usd>0?100*g/x.cost_usd:null;
      return '<div class="pos"><div class="pos-top"><div><span class="sym">'+x.t+'</span> <span style="font-size:11.5px;color:var(--faint);margin-left:6px">'+x.nom+'</span></div>'
        +'<div class="pos-pnl">'+(gp!=null?'<span style="color:'+col(g)+'" class="mono">'+fU(g)+' ('+(gp>=0?"+":"")+gp.toFixed(0)+'%)</span>':'')+' <span class="mono" style="margin-left:8px;color:var(--ink)">'+fU(x.val_usd)+'</span></div></div>'
        +'<div class="pos-meta"><span>Cant <b class="mono">'+x.q+'</b></span><span style="margin-left:14px">Precio <b class="mono">'+fA(x.ars)+'</b></span></div></div>';}).join("")
      +'<div class="note" style="margin-top:10px">Precios BYMA del d&iacute;a; las tenencias se actualizan cuando Claude entra a Inviu o le pas&aacute;s capturas.</div>';
  }
  function load(){return fetch("./retiro_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)R=j;}).catch(function(){});}
  load().then(function(){setTimeout(render,700);});
  setInterval(function(){load().then(render);},60000);
  setInterval(render,3000);
})();

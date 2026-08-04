/* Tarjeta del Pescador. Se auto-inyecta antes del footer. */
(function(){
  var host=document.createElement("div");
  host.innerHTML=[
'<hr class="gan-sep">',
'<div class="gan-head"><div class="brand"><h1>Radar - Pescador</h1>',
'<div class="sub">Explosiones ultra confirmadas &middot; entra tarde y sale rapido</div></div>',
'<div style="display:flex;align-items:center;gap:14px"><span class="badge dry" id="pMode">&mdash;</span>',
'<div class="pulse"><span class="dot"></span><span id="pFresh">&mdash;</span></div></div></div>',
'<section class="hero"><div><div class="eyebrow">Equity (USD) &middot; Pescador</div>',
'<div class="pnl-val mono" id="pBal">&mdash;</div><div class="pnl-sub" id="pSub">cargando&hellip;</div></div>',
'<div class="hero-stats">',
'<div class="stat"><div class="k">P&amp;L realizado</div><div class="v mono" id="pReal" style="font-size:1.4em">&mdash;</div></div>',
'<div class="stat"><div class="k">Operaciones</div><div class="v mono" id="pTrades">&mdash;</div></div>',
'<div class="stat"><div class="k">Aciertos</div><div class="v mono" id="pWin">&mdash;</div></div>',
'<div class="stat"><div class="k">Profit factor</div><div class="v mono" id="pPF">&mdash;</div></div></div></section>',
'<div class="cols"><div class="card"><div class="head"><span class="title">Posiciones abiertas</span>',
'<span class="eyebrow" id="pPosCount"></span></div><div class="body" id="pPositions"></div></div>',
'<div class="card"><div class="head"><span class="title">Reglas</span><span class="eyebrow">medidas</span></div>',
'<div class="body" id="pRules"></div></div></div>',
'<div class="card" style="margin-top:18px"><div class="head"><span class="title">Historial</span>',
'<span class="eyebrow" id="pHistCount"></span></div><div class="body" id="pHistory"></div></div>'
  ].join("");
  var foot=document.querySelector("footer");
  if(foot&&foot.parentNode){ while(host.firstChild) foot.parentNode.insertBefore(host.firstChild,foot); }
  else { document.body.appendChild(host); }

  var $=function(i){return document.getElementById(i)};
  var f=function(n){return (n<0?"-":"")+"$"+Math.abs(Number(n)||0).toFixed(2)};
  function pinta(d){
    var r=d.reglas||{};
    $("pMode").textContent=d.modo;
    $("pMode").className="badge "+(d.modo==="LIVE"?"live":"dry");
    $("pFresh").textContent=(d.generated_at||"").replace("T"," ").replace("Z"," UTC");
    $("pBal").textContent=f(d.equity_now);
    $("pSub").textContent="objetivo +"+r.tp_pct+"% / stop -"+r.sl_pct+"% / salida forzada "+r.max_hold_h+"h";
    var pr=$("pReal"); pr.textContent=f(d.realized_pnl);
    pr.style.color=(d.realized_pnl>0?"#3fb950":(d.realized_pnl<0?"#f85149":""));
    $("pTrades").textContent=d.trades_total;
    $("pWin").textContent=(d.win_rate||0)+"%";
    $("pPF").textContent=d.profit_factor;
    var op=d.open_positions||[];
    $("pPosCount").textContent=op.length?op.length+" abierta":"ninguna";
    $("pPositions").innerHTML=op.length?op.map(function(p){
      return '<div class="row"><span class="lbl">'+p.symbol+'</span><span class="mono">'+
        Number(p.entry).toPrecision(4)+" &middot; TP "+Number(p.tp).toPrecision(4)+
        " &middot; SL "+Number(p.sl).toPrecision(4)+" &middot; "+p.horas+"h &middot; vol "+p.vol_ratio+"x</span></div>";
    }).join(""):'<div class="row"><span class="lbl">Sin posiciones. Esperando confirmacion.</span></div>';
    $("pRules").innerHTML=
      '<div class="row"><span class="lbl">Volumen 24h minimo</span><span class="mono">$'+(r.min_qv_usd/1e6)+'M</span></div>'+
      '<div class="row"><span class="lbl">Volumen vs mediana 20d</span><span class="mono">&ge; '+r.vol_ratio+'x</span></div>'+
      '<div class="row"><span class="lbl">Tamano por entrada</span><span class="mono">'+r.size_pct+'% del equity</span></div>'+
      '<div class="row"><span class="lbl">Dia / semana</span><span class="mono">&ge; +8% / &ge; +20%</span></div>';
    var h=(d.recent_closed||[]).slice().reverse();
    $("pHistCount").textContent=h.length?h.length+" cerradas":"";
    $("pHistory").innerHTML=h.length?h.map(function(c){
      var col=c.pnl>0?"#3fb950":"#f85149";
      return '<div class="row"><span class="lbl">'+c.symbol+' <span style="opacity:.6">'+c.motivo+' &middot; '+c.horas+'h</span></span>'+
        '<span class="mono" style="color:'+col+'">'+(c.ret_pct>0?"+":"")+c.ret_pct+"% &middot; "+f(c.pnl)+"</span></div>";
    }).join(""):'<div class="row"><span class="lbl">Todavia sin operaciones cerradas.</span></div>';
  }
  function carga(){
    fetch("./pescador_data.json?ts="+Date.now()).then(function(r){return r.json()}).then(pinta)
      .catch(function(){ var s=$("pSub"); if(s) s.textContent="sin datos todavia"; });
  }
  carga(); setInterval(carga,120000);
})();

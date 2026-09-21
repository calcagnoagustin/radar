/* Tarjeta del Pescador Chico (paralelo). Va debajo del Pescador.
   Equity en vivo: caja + qty x precio publico de Binance (se recalcula c/60s). */
(function(){
  if (document.getElementById("pescadorChico")) return;
  var css=[
'#pescadorChico .pos{padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
'#pescadorChico .pos:last-child{border-bottom:0}',
'#pescadorChico .pos-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}',
'#pescadorChico .pos-sym{font-weight:600}',
'#pescadorChico .pos-det{opacity:.6;font-size:.85em;margin-top:4px;line-height:1.5}',
'#pescadorChico .rg{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
'#pescadorChico .rg:last-child{border-bottom:0}',
'#pescadorChico .rg .lbl{flex:0 0 auto;opacity:.7}',
'#pescadorChico .rg .mono{text-align:right;flex:1 1 auto}'
  ].join("");
  var st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);

  var host=document.createElement("div"); host.id="pescadorChico";
  host.innerHTML=[
'<hr class="gan-sep">',
'<div class="gan-head"><div class="brand"><h1>Radar - Pescador Chico</h1>',
'<div class="sub" id="pcHeadSub">&mdash;</div></div>',
'<div style="display:flex;align-items:center;gap:14px"><span class="badge dry" id="pcMode">&mdash;</span>',
'<div class="pulse"><span class="dot"></span><span id="pcFresh">&mdash;</span></div></div></div>',
'<section class="hero"><div><div class="eyebrow">Equity en vivo (USD) &middot; Pescador Chico</div>',
'<div class="pnl-val mono" id="pcBal">&mdash;</div><div class="pnl-sub" id="pcSub">cargando&hellip;</div></div>',
'<div class="hero-stats">',
'<div class="stat"><div class="k">No realizado</div><div class="v mono" id="pcUnr" style="font-size:1.4em">&mdash;</div></div>',
'<div class="stat"><div class="k">Realizado</div><div class="v mono" id="pcReal">&mdash;</div></div>',
'<div class="stat"><div class="k">Operaciones</div><div class="v mono" id="pcTrades">&mdash;</div></div>',
'<div class="stat"><div class="k">Aciertos &middot; PF</div><div class="v mono" id="pcWin">&mdash;</div></div></div></section>',
'<div class="cols"><div class="card"><div class="head"><span class="title">Posiciones abiertas</span>',
'<span class="eyebrow" id="pcPosCount"></span></div><div class="body" id="pcPositions"></div></div>',
'<div class="card"><div class="head"><span class="title">Reglas</span><span class="eyebrow">medidas</span></div>',
'<div class="body" id="pcRules"></div></div></div>',
'<div class="card" style="margin-top:18px"><div class="head"><span class="title">Historial</span>',
'<span class="eyebrow" id="pcHistCount"></span></div><div class="body" id="pcHistory"></div></div>'
  ].join("");
  var ref=document.getElementById("pescadorV2");
  if(ref&&ref.parentNode) ref.parentNode.insertBefore(host,ref.nextSibling);
  else { var foot=document.querySelector("footer");
    if(foot&&foot.parentNode) foot.parentNode.insertBefore(host,foot); else document.body.appendChild(host); }

  var $=function(i){return document.getElementById(i)};
  var f=function(n){return (n<0?"-":"")+"$"+Math.abs(Number(n)||0).toFixed(2)};
  var p4=function(n){return Number(n).toPrecision(4)};
  var col=function(v){return v>0?"#3fb950":(v<0?"#f85149":"")};
  var sg=function(v){return (v>0?"+":"")+Number(v).toFixed(2)};
  var D=null, PX={};

  function precios(){
    var op=(D&&D.open_positions)||[];
    if(!op.length) return Promise.resolve();
    var syms=JSON.stringify(op.map(function(p){return p.symbol.replace("/","")}));
    return fetch("https://api.binance.com/api/v3/ticker/price?symbols="+encodeURIComponent(syms))
      .then(function(r){return r.json()})
      .then(function(a){ (a||[]).forEach(function(t){PX[t.symbol]=+t.price}); })
      .catch(function(){});
  }

  function pinta(){
    var d=D; if(!d) return;
    $("pcMode").textContent=d.modo;
    $("pcMode").className="badge "+(d.modo==="LIVE"?"live":"dry");
    $("pcFresh").textContent="bot: "+(d.generated_at||"").replace("T"," ").replace("Z"," UTC");
    $("pcHeadSub").innerHTML=d.sub||"";
    $("pcSub").innerHTML=d.subtitulo||"";

    var op=d.open_positions||[], inv=0, unr=0;
    op.forEach(function(p){
      var live=PX[p.symbol.replace("/","")];
      p._px=live||p.px;
      var q=p.qty||(p.notional/p.entry);
      inv+=q*p._px; unr+=q*p._px-p.notional;
      p._ret=100*(p._px-p.entry)/p.entry;
    });
    var eq=(d.caja!==undefined)?d.caja+inv:d.equity_now;
    $("pcBal").textContent=f(eq);
    var u=$("pcUnr"); u.textContent=f(unr); u.style.color=col(unr);
    var r=$("pcReal"); r.textContent=f(d.realized_pnl); r.style.color=col(d.realized_pnl);
    $("pcTrades").textContent=d.trades_total;
    $("pcWin").textContent=(d.win_rate||0)+"% · "+d.profit_factor;

    $("pcPosCount").textContent=op.length?op.length+" abierta"+(op.length>1?"s":""):"ninguna";
    $("pcPositions").innerHTML=op.length?op.map(function(p){
      var distStop=100*(p._px-p.stop)/p._px;
      return '<div class="pos"><div class="pos-top"><span class="pos-sym">'+p.symbol.replace("/USDT","")+
        '</span><span class="mono" style="color:'+col(p._ret)+'">'+sg(p._ret)+'%</span></div>'+
        '<div class="pos-det mono">'+p4(p.entry)+' &rarr; '+p4(p._px)+' &middot; '+f(p.notional)+'<br>'+
        'TP '+p4(p.tp)+' (+'+(100*(p.tp-p._px)/p._px).toFixed(1)+'% falta) &middot; stop '+p4(p.stop)+' ('+distStop.toFixed(1)+'% abajo) &middot; '+p.ruedas+' rueda'+(p.ruedas===1?'':'s')+'</div></div>';
    }).join(""):'<div class="pos"><span style="opacity:.6">Sin posiciones. Esperando senal.</span></div>';

    $("pcRules").innerHTML=(d.reglas_lista||[]).map(function(x){
      return '<div class="rg"><span class="lbl">'+x.l+'</span><span class="mono">'+x.v+'</span></div>';
    }).join("");

    var h=(d.recent_closed||[]).slice().reverse();
    $("pcHistCount").textContent=h.length?h.length+" cerradas":"";
    $("pcHistory").innerHTML=h.length?h.map(function(c){
      var dur=(c.ruedas!==undefined)?(c.ruedas+"r"):(c.horas+"h");
      return '<div class="pos"><div class="pos-top"><span class="pos-sym">'+c.symbol.replace("/USDT","")+
        ' <span style="opacity:.55;font-weight:400">'+c.motivo+' &middot; '+dur+'</span></span>'+
        '<span class="mono" style="color:'+col(c.pnl)+'">'+sg(c.ret_pct)+'% &middot; '+f(c.pnl)+'</span></div></div>';
    }).join(""):'<div class="pos"><span style="opacity:.6">Todavia sin operaciones cerradas.</span></div>';
  }

  function ciclo(){
    fetch("./pescador_chico_data.json?ts="+Date.now())
      .then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .then(function(j){ D=j; return precios(); })
      .then(pinta)
      .catch(function(){ var s=$("pcSub"); if(s) s.textContent="sin datos del bot todavia"; });
  }
  ciclo(); setInterval(ciclo,60000);
})();

/* Radar - Laboratorio (02/10/2026). Lee docs/lab_data.json. Cuatro experimentos PAPER:
   Faro, RS-BTC (seleccion), Ganesha v5.1 (shadow de riesgo), Positioning (logger). Solo lectura. */
(function(){
  if (document.getElementById("labRadar")) return;
  var css=[
'#labRadar .lab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px;align-items:start}',
'#labRadar .card{height:auto!important;max-height:none!important;overflow:visible!important}',
'#labRadar .card .body{height:auto!important;max-height:none!important;overflow:visible!important}',
'#labRadar .card .head .title{white-space:nowrap}',
'#labRadar .kv{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px}',
'#labRadar .kv:last-child{border-bottom:0}',
'#labRadar .kv .lbl{opacity:.7}',
'#labRadar .pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border:1px solid rgba(255,255,255,.18)}',
'#labRadar .pill.on{color:#3fb950;border-color:#3fb950}',
'#labRadar .pill.off{color:#f0883e;border-color:#f0883e}',
'#labRadar .pill.warn{color:#f85149;border-color:#f85149}',
'#labRadar table{width:100%;border-collapse:collapse;font-size:12.5px}',
'#labRadar th,#labRadar td{padding:6px 4px;text-align:right;border-bottom:1px solid rgba(255,255,255,.06)}',
'#labRadar th:first-child,#labRadar td:first-child{text-align:left}',
'#labRadar .hint{opacity:.6;font-size:12.5px;line-height:1.5;margin-top:10px}',
'#labRadar svg{width:100%;height:110px;display:block;margin-top:10px}'
  ].join("");
  var st=document.createElement("style"); st.textContent=css; document.head.appendChild(st);
  var host=document.createElement("div"); host.id="labRadar";
  host.innerHTML=['<span id="labBal" style="display:none"></span><span id="labPnl" style="display:none"></span>',
'<hr class="gan-sep">',
'<div class="gan-head"><div class="brand"><h1>Radar - Laboratorio</h1>',
'<div class="sub">Experimentos PAPER &middot; hip&oacute;tesis separadas, misma infraestructura &middot; criterios de muerte escritos de antemano</div></div>',
'<div style="display:flex;align-items:center;gap:14px"><span class="badge dry">PAPER</span><div class="pulse"><span class="dot"></span><span id="labFresh">&mdash;</span></div></div></div>',
'<div class="lab-grid">',
'<div class="card"><div class="head"><span class="title">Faro</span><span class="eyebrow">BTC / cash &middot; ensamble 21/28/35/42</span></div><div class="body" id="labFaro"></div></div>',
'<div class="card"><div class="head"><span class="title">RS-BTC</span><span class="eyebrow">selecci&oacute;n de alts &middot; 3 carteras, mismo gate</span></div><div class="body" id="labRS"></div></div>',
'<div class="card"><div class="head"><span class="title">Ganesha v5.1</span><span class="eyebrow">shadow de riesgo &middot; movers</span></div><div class="body" id="labV51"></div></div>',
'<div class="card"><div class="head"><span class="title">Positioning</span><span class="eyebrow">logger de derivados &middot; sin PAPER</span></div><div class="body" id="labPos"></div></div>',
'</div>',
'<div class="hint" style="margin-top:14px">Rechazados con n&uacute;meros (02/10/2026, motor com&uacute;n 2021-26, costos 0,2%/lado): RMM-14/7 no agrega sobre BTC a igual exposici&oacute;n &middot; CTREND-lite DD -94% &middot; Squeeze Breakout PF 0,79 &middot; Quiet Pullback sin edge y 1 trade/mes. Lead-Lag: no priorizado (no testeado).</div>'
  ].join("");
  var foot=document.querySelector("footer");
  if(foot&&foot.parentNode) foot.parentNode.insertBefore(host,foot); else document.body.appendChild(host);

  var $=function(i){return document.getElementById(i)};
  var f=function(n,d){d=(d==null)?2:d;return (n<0?"-":"")+"$"+Math.abs(Number(n)||0).toFixed(d)};
  var pc=function(n){return n==null?"&mdash;":((n>0?"+":"")+Number(n).toFixed(2)+"%")};
  var col=function(v){return v>0?"#3fb950":(v<0?"#f85149":"")};
  var kv=function(l,v,c){return '<div class="kv"><span class="lbl">'+l+'</span><span class="mono"'+(c?' style="color:'+c+'"':'')+'>'+v+'</span></div>'};
  var pill=function(t,k){return '<span class="pill '+(k||"")+'">'+t+'</span>'};
  function spark(series,keys,colors){
    if(!series||series.length<2) return "";
    var vals=[];series.forEach(function(r){keys.forEach(function(k){if(r[k]!=null)vals.push(r[k])})});
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);if(mx===mn)mx=mn+1;
    var W=300,H=110,n=series.length;
    var paths=keys.map(function(k,i){
      var d=series.map(function(r,j){var x=(j/(n-1))*W,y=H-4-((r[k]-mn)/(mx-mn))*(H-8);return (j?"L":"M")+x.toFixed(1)+","+y.toFixed(1)}).join("");
      return '<path d="'+d+'" fill="none" stroke="'+colors[i]+'" stroke-width="1.6" opacity="'+(i?0.7:1)+'"/>';
    }).join("");
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+paths+'</svg>';
  }
  function pintaFaro(d){
    if(!d){$("labFaro").innerHTML='<div class="kv"><span class="lbl">sin datos</span></div>';return;}
    var h=kv("Estado",pill(d.estado,d.estado==="ON"?"on":"off")+' <span style="opacity:.6;font-size:12px">'+d.positivos+'/4 lookbacks positivos</span>');
    h+=kv("Equity paper",f(d.equity)+' <span style="opacity:.6;font-size:12px">vs hold '+f(d.btc_hold)+'</span>',col(d.vs_hold_pct));
    h+=kv("vs BTC hold",pc(d.vs_hold_pct),col(d.vs_hold_pct));
    h+=kv("Upside / downside capturado",(d.upside_capture==null?"&mdash;":d.upside_capture+"%")+" / "+(d.downside_capture==null?"&mdash;":d.downside_capture+"%"));
    h+=kv("BTC durante per&iacute;odos OFF",pc(d.btc_en_periodos_off_pct)+' <span style="opacity:.6;font-size:12px">'+d.dias_off+' d&iacute;as</span>',col(-d.btc_en_periodos_off_pct));
    h+=kv("Transiciones ON&harr;OFF",d.transiciones);
    h+=kv("Gate de evaluaci&oacute;n",pill(d.gate,d.gate==="EVALUABLE"?"on":""));
    h+=spark(d.curva,["eq","btc"],["#58a6ff","#8b949e"]);
    h+='<div class="hint">Desde '+d.desde+' &middot; '+d.dias+' d&iacute;as &middot; fees '+f(d.fees)+'. Hip&oacute;tesis: trend long/flat sobre BTC captura buena parte del upside con menos drawdown. No es "salir antes del bear" (2022 backtest: -49% con gate). Azul = Faro, gris = BTC hold.</div>';
    $("labFaro").innerHTML=h;
  }
  function pintaRS(d){
    if(!d){$("labRS").innerHTML='<div class="kv"><span class="lbl">sin datos</span></div>';return;}
    var h=kv("Estado",pill(d.estado,d.estado==="VIVO"?"on":(d.estado.indexOf("MUERE")===0?"warn":"")));
    h+=kv("Gate BTC",pill(d.gate_on?"ON":"OFF",d.gate_on?"on":"off"));
    h+=kv("RS top-4",f(d.RS.equity)+" ("+pc(d.RS.ret_pct)+")",col(d.RS.ret_pct));
    h+=kv("BTC en gate",f(d.BTC.equity)+" ("+pc(d.BTC.ret_pct)+")",col(d.BTC.ret_pct));
    h+=kv("Top-4 por volumen",f(d.VOL.equity)+" ("+pc(d.VOL.ret_pct)+")",col(d.VOL.ret_pct));
    h+=kv("Selection alpha vs BTC",pc(d.selection_alpha_vs_BTC_pct),col(d.selection_alpha_vs_BTC_pct));
    h+=kv("Selection alpha vs volumen",pc(d.selection_alpha_vs_VOL_pct),col(d.selection_alpha_vs_VOL_pct));
    h+=kv("Cierres RS / d&iacute;as",d.RS.cierres+" / "+d.dias);
    h+=kv("RS tiene",(d.RS.pos||[]).map(function(p){return p.sym.replace("/USDT","")+" "+Math.round(p.w*100)+"%"}).join(" &middot; ")||"cash");
    h+=spark(d.curva,["RS","BTC","VOL"],["#58a6ff","#8b949e","#d29922"]);
    h+='<div class="hint">Mismo gate, mismo capital, mismas fechas: s&oacute;lo cambia qu&eacute; se compra. Muere a los 90 d&iacute;as y 25 cierres si RS no supera a BTC-en-gate. Backtest 2021-26: RS 10,8x vs BTC-en-gate 4,5x, pero desde 2023 pierde contra BTC (3,1x vs 3,9x). Azul RS, gris BTC, amarillo volumen.</div>';
    $("labRS").innerHTML=h;
  }
  function pintaV51(d){
    if(!d){$("labV51").innerHTML='<div class="kv"><span class="lbl">sin datos</span></div>';return;}
    var warn=d.veredicto.indexOf("DEFECTO")===0;
    var h=kv("Veredicto",pill(d.veredicto,warn?"warn":(d.veredicto.indexOf("SHOCK")===0?"on":"")));
    h+=kv("Entradas v5 analizadas",d.n_trades+" ("+d.movers_cerrados+" movers cerrados)");
    h+=kv("Peor p&eacute;rdida mover (% equity)",d.movers.peor_pct_eq==null?"&mdash;":d.movers.peor_pct_eq+"%",col(d.movers.peor_pct_eq));
    h+=kv("Movers P&amp;L real / con sizing v5.1",f(d.movers_real_pnl_total)+" / "+f(d.movers_alt_pnl_total),col(d.movers_alt_pnl_total-d.movers_real_pnl_total));
    var tr=(d.trades||[]).slice().reverse().slice(0,8);
    if(tr.length){
      h+='<table style="margin-top:10px"><tr><th>Trade</th><th>stop%</th><th>ATR4h%</th><th>real</th><th>%eq</th><th>v5.1 stop%</th><th>v5.1</th></tr>';
      tr.forEach(function(t){h+='<tr><td>'+t.sym.replace("/USDT","")+' <span style="opacity:.5">'+t.fecha.slice(5)+'</span></td><td>'+t.stop_pct+'</td><td>'+t.atr4h_pct+'</td><td style="color:'+col(t.real_pnl)+'">'+(t.real_pnl==null?"abierto":f(t.real_pnl))+'</td><td style="color:'+col(t.real_loss_pct_eq)+'">'+(t.real_loss_pct_eq==null?"&mdash;":t.real_loss_pct_eq+"%")+'</td><td>'+t.alt_stop_pct+'</td><td style="color:'+col(t.alt_pnl)+'">'+f(t.alt_pnl)+(t.cerrado_alt?"":"*")+'</td></tr>'});
      h+='</table>';
    }
    h+='<div class="hint">Sombra, no opera. Para cada mover de v5 recalcula stop y tama&ntilde;o con ATR = max(ATR diario incluyendo el d&iacute;a de la explosi&oacute;n, ATR 4h) y simula la salida v5 (chandelier + pir&aacute;mide) a cierre 4h. * = a&uacute;n abierto, a mercado. Criterio: '+d.criterio+'.</div>';
    $("labV51").innerHTML=h;
  }
  function pintaPos(d){
    if(!d){$("labPos").innerHTML='<div class="kv"><span class="lbl">sin datos</span></div>';return;}
    var h=kv("Estado",pill(d.estado,""));
    h+=kv("S&iacute;mbolos hoy",d.hoy_simbolos);
    if(d.btc){h+=kv("BTC funding 8h (&uacute;ltimo)",(d.btc.funding_8h[d.btc.funding_8h.length-1]*100).toFixed(4)+"%");h+=kv("BTC top-trader L/S &middot; cuentas L/S",d.btc.top_ls_ratio+" &middot; "+d.btc.global_ls_ratio);h+=kv("BTC open interest",f(d.btc.oi_usd/1e9,2).replace("$","$")+" B");}
    if(d.eth){h+=kv("ETH funding 8h &middot; top L/S",(d.eth.funding_8h[d.eth.funding_8h.length-1]*100).toFixed(4)+"% &middot; "+d.eth.top_ls_ratio);}
    h+='<div class="hint">Binance s&oacute;lo publica 30 d&iacute;as de historia de positioning: no hay backtest posible. 90 d&iacute;as de log para decidir si los datos merecen un forward m&aacute;s largo. No valida la hip&oacute;tesis, valida los datos.</div>';
    $("labPos").innerHTML=h;
  }
  fetch("./lab_data.json?ts="+Date.now()).then(function(r){return r.json()}).then(function(d){
    $("labFresh").textContent="lab: "+(d.generated_at||"").replace("T"," ").replace("Z"," UTC");
    pintaFaro(d.faro);pintaRS(d.rs);pintaV51(d.v51);pintaPos(d.positioning);
    if(d.faro){var eq=d.faro.equity,pn=eq-1000;$("labBal").textContent="$"+eq.toFixed(2);$("labPnl").textContent=(pn<0?"-":"")+"$"+Math.abs(pn).toFixed(2)+" ("+(pn>=0?"+":"")+(pn/10).toFixed(2)+"%)";}
    if(d.errores&&d.errores.length){var e=document.createElement("div");e.className="hint";e.style.color="#f85149";e.textContent="errores: "+d.errores.join(" | ");host.appendChild(e);}
  }).catch(function(){$("labFresh").innerHTML='<span class="err">lab_data.json a&uacute;n no disponible</span>';});
})();

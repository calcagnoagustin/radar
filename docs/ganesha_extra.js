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
      var manual=(D.recent_closed||[]).some(function(c){return c.symbol===p.symbol&&c.action==="manual";});
      if(manual){html+='<span style="margin-left:14px;color:var(--grain)">Parcial manual <b class="mono" style="color:var(--grain)">✓</b></span>';}
      slot.insertAdjacentHTML("beforeend",html);row.dataset.tp="1";
    });
  }
  function valorize(){
    document.querySelectorAll("#gPositions .pos").forEach(function(row){
      var t=row.textContent||"";
      var mp=t.match(/Precio\s*\$([\d.,]+)/), mc=t.match(/Cant\s*([\d.,]+)/);
      if(!mp||!mc)return;
      var px=parseFloat(mp[1].replace(/,/g,"")), q=parseFloat(mc[1].replace(/,/g,""));
      if(!(px>0)||!(q>0))return;
      var val=px*q;
      var txt="$"+val.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
      var slot=row.querySelector(".pos-meta")||row;
      var el=row.querySelector(".valchip");
      if(el){var b=el.querySelector("b");if(b&&b.textContent!==txt)b.textContent=txt;return;}
      slot.insertAdjacentHTML("beforeend",'<span class="valchip" style="margin-left:14px">Valor <b class="mono" style="color:var(--ink)">'+txt+'</b></span>');
    });
  }
  function paperLabels(){
    if(!D||!D.dry_run)return;
    if(!("paper_base_date" in D))return;
    // SOLO la card de Ganesha: por id, nunca por texto global (28/08: el selector
    // global contamino la seccion Semillas con labels de Ganesha)
    [["gDep","Base paper (28/08)"],["gGen","P&L del paper (desde 28/08)"]].forEach(function(par){
      var v=document.getElementById(par[0]);if(!v)return;
      var st=v.closest(".stat");if(!st)return;
      var k=st.querySelector(".k");if(k&&k.textContent!==par[1])k.textContent=par[1];
    });
    // el script base del index pisa gDep/gGen con el ledger de depositos REALES
    // (dashboard_data.json, $294): en paper esos valores se sobreescriben aca
    // con la base y el P&L del paper, en cada tick, gane el ultimo que escribe.
    function fU2(n){return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
    var dep=document.getElementById("gDep");
    if(dep&&D.deposits_total!=null){
      var t=fU2(D.deposits_total);
      if(dep.textContent!==t)dep.textContent=t;
    }
    var gen=document.getElementById("gGen");
    if(gen&&D.pnl_vs_depositos!=null){
      var p=D.pnl_vs_depositos, pc=D.pnl_vs_depositos_pct;
      var col=p>=0?"var(--jade)":"var(--clay)";
      var html='<span style="color:'+col+'">'+fU2(p)+' <span style="font-size:.8em">('+(p>=0?"+":"")+(pc!=null?pc:0)+'%)</span></span>';
      if(gen.innerHTML!==html)gen.innerHTML=html;
    }
  }
  function apply(){linkify();tpOpen();valorize();paperLabels();}
  loadG().then(function(){setTimeout(apply,1000);});
  setInterval(function(){loadG();},20000);
  setInterval(apply,2500);
})();

/* ganesha_extra.js — bloque 2 (v3, 24 jul 2026): curva de equity REALIZADA con ejes + 4 colores.
   Novedades vs v1:
     - Eje Y con valores en $ (techo / $0 / piso rotulados) y gridlines, para que se lea qué es.
     - Color propio para el "stop en ganancia": trailing que cierra por ENCIMA de la entrada
       (p.ej. BANK +$19.55) ya no se pinta igual que un stop en pérdida.
     - Punto final resaltado con su valor, y tooltip por punto (símbolo · P&L · acumulado).
   Sin dependencias externas (CSP-safe). Realizada = solo cierres. */
(function(){
  var COL={tp:"#6FBF8E",stopwin:"#57B8A9",stoploss:"#E07A5F",manual:"#E8C36A"};
  var LBL={tp:"cierre en TP (+2R)",stopwin:"stop en ganancia (trailing)",stoploss:"stop en pérdida",manual:"cierre manual"};
  var G=null, lastSig="";
  function load(){return fetch("./ganesha_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)G=j;}).catch(function(){});}
  function fU(n){return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function outcome(t){if(t.action==="tp")return "tp";if(t.action==="manual")return "manual";return (t.pnl_net>0)?"stopwin":"stoploss";}
  function anchor(){var h=document.getElementById("gHistory");return h?h.closest(".card"):null;}
  function ensureCard(){
    if(document.getElementById("gEqCurveCard"))return document.getElementById("gEqCurveBody");
    var a=anchor();if(!a||!a.parentNode)return null;
    var card=document.createElement("div");
    card.className="card";card.id="gEqCurveCard";card.style.marginTop="18px";
    card.innerHTML='<div class="head"><span class="title">Curva de equity</span><span class="eyebrow">realizada &middot; acumulado</span></div><div class="body" id="gEqCurveBody"></div>';
    a.parentNode.insertBefore(card,a);
    return card.querySelector("#gEqCurveBody");
  }
  function render(){
    var src=(G&&G.equity_curve&&G.equity_curve.length)?G.equity_curve:(G&&G.recent_closed)||[];
    if(!src.length)return;
    var full=!!(G&&G.equity_curve&&G.equity_curve.length);
    var cl=src.slice().sort(function(x,y){return (x.closed_ts||0)-(y.closed_ts||0);});
    var sig=cl.length+":"+(cl[cl.length-1].closed_ts||0);
    var body=ensureCard();if(!body)return;
    if(sig===lastSig&&body.dataset.done)return;lastSig=sig;
    var cum=0, pts=[{c:0,o:"base",t:null}];
    cl.forEach(function(t){cum+=(t.pnl_net||0);pts.push({c:cum,o:outcome(t),t:t});});
    var vals=pts.map(function(p){return p.c;});
    var realMax=Math.max.apply(null,vals), realMin=Math.min.apply(null,vals);
    var mx=Math.max(realMax,0), mn=Math.min(realMin,0);
    var pad=(mx-mn)*0.16||1; mx+=pad; mn-=pad;
    var W=380,H=182,L=50,R=14,T=16,B=24, pw=W-L-R, ph=H-T-B;
    function X(i){return L+(pts.length<2?0:pw*i/(pts.length-1));}
    function Y(v){return T+ph*(mx-v)/(mx-mn);}
    function gy(v,txt,strong){return '<line x1="'+L+'" y1="'+Y(v).toFixed(1)+'" x2="'+(W-R)+'" y2="'+Y(v).toFixed(1)+'" style="stroke:'+(strong?"var(--faint)":"var(--hair)")+';stroke-dasharray:'+(strong?"3 3":"2 4")+';stroke-width:1"></line>'
      +'<text x="'+(L-7)+'" y="'+(Y(v)+3).toFixed(1)+'" text-anchor="end" style="fill:var(--faint);font:9.5px \'IBM Plex Mono\',monospace">'+txt+'</text>';}
    var grid=gy(0,"$0",true);
    if(realMax>0.01)grid+=gy(realMax,fU(realMax),false);
    if(realMin<-0.01)grid+=gy(realMin,fU(realMin),false);
    var line=pts.map(function(p,i){return (i?"L":"M")+X(i).toFixed(1)+" "+Y(p.c).toFixed(1);}).join(" ");
    var dots=pts.map(function(p,i){
      if(p.o==="base")return "";
      var tt=(p.t.symbol||"")+" · "+(p.t.pnl_net>=0?"+":"")+fU(p.t.pnl_net)+" ("+LBL[p.o]+") · acum "+fU(p.c);
      return '<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(p.c).toFixed(1)+'" r="3.3" style="fill:'+COL[p.o]+'"><title>'+tt+'</title></circle>';
    }).join("");
    var li=pts.length-1, lastC=pts[li].c, lastCol=lastC>=0?"var(--jade)":"var(--clay)";
    var lastRing='<circle cx="'+X(li).toFixed(1)+'" cy="'+Y(lastC).toFixed(1)+'" r="6" style="fill:none;stroke:'+lastCol+';stroke-width:1.5"></circle>'
      +'<text x="'+(X(li)-9).toFixed(1)+'" y="'+(Y(lastC)-9).toFixed(1)+'" text-anchor="end" style="fill:'+lastCol+';font:11px \'IBM Plex Mono\',monospace">'+fU(lastC)+'</text>';
    var svg='<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Curva de P&L realizado acumulado de Ganesha con ejes en dólares">'
      +grid
      +'<path d="'+line+'" style="fill:none;stroke:var(--sky);stroke-width:2;stroke-linejoin:round;stroke-linecap:round"></path>'
      +dots+lastRing
      +'<text x="'+L+'" y="'+(H-6)+'" style="fill:var(--faint);font:9.5px \'IBM Plex Mono\',monospace">1er cierre</text>'
      +'<text x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end" style="fill:var(--faint);font:9.5px \'IBM Plex Mono\',monospace">cierre #'+cl.length+'</text>'
      +'</svg>';
    var order=["tp","stopwin","stoploss","manual"];
    var legend='<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11.5px;color:var(--muted)">'
      +order.map(function(k){return '<span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:'+COL[k]+';margin-right:5px"></span>'+LBL[k]+'</span>';}).join("")+'</div>';
    var stats='<div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:10px;font-size:12.5px;color:var(--muted)">'
      +'<span>Realizado <b class="mono" style="color:'+lastCol+'">'+fU(lastC)+'</b></span>'
      +'<span>Techo <b class="mono up">'+fU(realMax)+'</b></span>'
      +'<span>Piso <b class="mono down">'+fU(realMin)+'</b></span>'
      +'<span>Cierres <b class="mono" style="color:var(--ink)">'+cl.length+'</b></span></div>';
    var note='<div class="note">'+(full
      ?'Historia completa: P&amp;L de todas las operaciones cerradas desde el primer trade del ejecutor, acumulado desde cero real. No incluye lo no-realizado de las abiertas. Pasá el cursor sobre cada punto para ver el trade.'
      :'ATENCIÓN: solo últimos 40 cierres, acumulados desde un cero arbitrario — no es el resultado real del sistema.')+'</div>';
    body.innerHTML=svg+legend+stats+note;body.dataset.done="1";
  }
  load().then(function(){setTimeout(render,1200);});
  setInterval(function(){load().then(render);},20000);
  setInterval(render,3000);
})();

/* ganesha_extra.js — bloque 3 (v1, 24 jul 2026): panel "Aprendizaje — Auditor Loop".
   Lee learning_data.json (que loop_analista ya publica) y lo muestra en el dashboard:
   métricas rodantes de Ganesha, la atribución clave (TP1 antes del stop) y las propuestas.
   Nada se aplica solo: el auditor sólo propone con evidencia. */
(function(){
  var L=null, done=false;
  function load(){return fetch("./learning_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)L=j;}).catch(function(){});}
  function fU(n){return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function anchor(){var c=document.getElementById("gEqCurveCard");if(c)return c;var h=document.getElementById("gHistory");return h?h.closest(".card"):null;}
  function ensureCard(){
    if(document.getElementById("gAuditCard"))return document.getElementById("gAuditBody");
    var a=anchor();if(!a||!a.parentNode)return null;
    var d=document.createElement("div");
    d.className="card";d.id="gAuditCard";d.style.marginTop="18px";
    d.innerHTML='<div class="head"><span class="title">Aprendizaje &mdash; Auditor Loop</span><span class="eyebrow" id="gAuditGen">&mdash;</span></div><div class="body" id="gAuditBody"></div>';
    if(a.nextSibling)a.parentNode.insertBefore(d,a.nextSibling);else a.parentNode.appendChild(d);
    return d.querySelector("#gAuditBody");
  }
  function metricRow(m){
    if(!m||!m.n)return '<span class="lbl">sin datos aún</span>';
    function cell(k,v,c){return '<div style="min-width:70px"><div style="font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.05em">'+k+'</div><div class="mono" style="font-size:14px;color:'+(c||"var(--ink)")+'">'+v+'</div></div>';}
    return '<div style="display:flex;gap:16px;flex-wrap:wrap">'
      +cell("Trades",m.n)
      +cell("Win rate",m.win_rate+"%")
      +cell("Profit factor",m.profit_factor,(m.profit_factor>=1?"var(--jade)":"var(--clay)"))
      +cell("Expectancy",((m.expectancy_r>=0?"+":"")+m.expectancy_r+"R"),(m.expectancy_r>=0?"var(--jade)":"var(--clay)"))
      +cell("Payoff",m.payoff)
      +cell("P&L",fU(m.pnl_total),(m.pnl_total>=0?"var(--jade)":"var(--clay)"))
      +cell("Max DD",fU(m.max_dd_usd),"var(--clay)")+'</div>';
  }
  function tp1Block(atr){
    var si=null,no=null;
    (atr||[]).forEach(function(r){if(r.tag==="tp1_antes_del_stop=si")si=r;if(r.tag==="tp1_antes_del_stop=no")no=r;});
    if(!si&&!no)return "";
    function box(r,ok){
      if(!r)return "";
      return '<div style="flex:1;min-width:190px;border:1px solid var(--hair);border-radius:10px;padding:11px 13px;background:'+(ok?"rgba(111,191,142,.07)":"rgba(224,122,95,.07)")+'">'
        +'<div style="font-size:12px;color:'+(ok?"var(--jade)":"var(--clay)")+';font-weight:600">'+(ok?"Tocó TP1 antes del stop ✓":"Murió antes del TP1 ✗")+'</div>'
        +'<div class="mono" style="font-size:13px;margin-top:5px">'+r.n+' trades &middot; WR '+r.win_rate+'% &middot; '+(r.pnl_total>=0?"+":"")+fU(r.pnl_total)+'</div></div>';
    }
    return '<div class="note" style="margin-top:14px;margin-bottom:8px">Hallazgo del auditor: el resultado de Ganesha vive o muere en si el trade llega a +2R (TP1) antes de que lo saque el stop.</div>'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap">'+box(si,true)+box(no,false)+'</div>';
  }
  function propBlock(props){
    if(!props||!props.length)return '<div class="note" style="margin-top:14px">Sin propuestas nuevas: el auditor sólo propone con evidencia (n&ge;15 y, p.ej., PF&lt;0.7). Nada se aplica automáticamente.</div>';
    return '<div style="margin-top:14px">'+props.map(function(p){return '<div class="row"><span class="lbl">'+(p.id||"")+'</span><span style="color:var(--ink);text-align:right;max-width:70%">'+(p.texto||"")+'</span></div>';}).join("")+'</div>';
  }
  function render(){
    if(!L)return;var b=ensureCard();if(!b)return;if(done&&b.dataset.sig===L.generated)return;
    var g=(L.metricas&&L.metricas.ganesha)||{};
    var m=g.historico||g.ult_20_trades||{};
    var gen=document.getElementById("gAuditGen");if(gen)gen.textContent=(L.generated||"").replace("T"," ").replace("Z"," UTC");
    b.innerHTML='<div class="note" style="margin-top:0;margin-bottom:8px;border-left-color:var(--sky)">Métricas rodantes de Ganesha (histórico consolidado)</div>'
      +metricRow(m)+tp1Block(L.atribucion)+propBlock(L.propuestas)
      +'<div class="note" style="margin-top:12px;color:var(--faint)">'+(L.nota||"")+' &middot; '+(L.n_trades_consolidados||0)+' trades consolidados.</div>';
    b.dataset.sig=L.generated;done=true;
  }
  load().then(function(){setTimeout(render,1400);});
  setInterval(function(){load().then(render);},30000);
  setInterval(render,3000);
})();


/* ganesha_extra.js — bloque 4 (28 ago 2026): card "Fondo Semillas" (paper, base real)
   + banner de cierre sobre el panel del sistema Semillas 1.0. */
(function(){
  var F=null, done="";
  function load(){return fetch("./fondo_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)F=j;}).catch(function(){});}
  function fU(n){return (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function banner(){
    var h=document.querySelector("h1");
    if(!h||document.getElementById("semCerrado"))return;
    if((h.textContent||"").indexOf("Semillas")<0)return;
    var d=document.createElement("div");
    d.id="semCerrado";d.className="note";
    d.style.cssText="margin:10px 0 14px;border-left:3px solid var(--grain);padding:10px 14px";
    d.innerHTML="Estrategia <b>Semillas 1.0 cerrada</b> (ago-2026): PYTH/PUMP/ZEC vendidos y capital consolidado. Este panel queda como registro hist\u00f3rico. La continuidad es el <b>Fondo Semillas</b> (card m\u00e1s abajo) y el capital consolidado vive en la cuenta principal.";
    h.parentNode.insertBefore(d,h.nextSibling);
  }
  function card(){
    if(!F)return;
    var sig=F.generated_at||"";
    var b=document.getElementById("fondoCardBody");
    if(!b){
      var anchor=document.getElementById("gEqCurveCard")||document.querySelector(".card");
      if(!anchor||!anchor.parentNode)return;
      var c=document.createElement("div");
      c.className="card";c.id="fondoCard";c.style.marginTop="18px";
      c.innerHTML='<div class="head"><span class="title">Fondo Semillas &mdash; PAPER (base real 28/08)</span><span class="eyebrow" id="fondoGen"></span></div><div class="body" id="fondoCardBody"></div>';
      anchor.parentNode.insertBefore(c,anchor);
      b=c.querySelector("#fondoCardBody");
    }
    if(done===sig&&b.dataset.ok)return;done=sig;
    var g=document.getElementById("fondoGen");if(g)g.textContent=(sig||"").replace("T"," ")+" UTC";
    var pos=F.posiciones||{};
    var nuc=["BTC/USDT","ETH/USDT"].filter(function(k){return pos[k];});
    var sat=Object.keys(pos).filter(function(k){return nuc.indexOf(k)<0;});
    function chip(k){var p=pos[k];return '<span style="display:inline-block;border:1px solid var(--hair);border-radius:8px;padding:4px 9px;margin:3px 5px 3px 0;font-size:12px" class="mono">'+k.replace("/USDT","")+" &middot; "+fU(p.cost)+"</span>";}
    var sem=F.semaforos||{};
    function semTxt(x){return x==="sol"?'<b style="color:var(--jade)">sol</b>':'<b style="color:var(--clay)">tormenta</b>';}
    b.innerHTML=
      '<div style="display:flex;gap:26px;flex-wrap:wrap;margin-bottom:10px">'
      +'<span>Total <b class="mono" style="font-size:1.25em;color:var(--ink)">'+fU(F.equity||0)+'</b></span>'
      +'<span>Base <b class="mono">'+fU(F.aportado||0)+'</b></span>'
      +'<span>P&L <b class="mono" style="color:'+((F.pnl||0)>=0?"var(--jade)":"var(--clay)")+'">'+fU(F.pnl||0)+'</b></span>'
      +'<span>Caja <b class="mono">'+fU(F.caja||0)+'</b></span></div>'
      +'<div style="margin-bottom:6px;font-size:12.5px;color:var(--muted)">Sem\u00e1foros: acciones '+semTxt(sem.acciones)+' &middot; cripto '+semTxt(sem.cripto)+' <span style="color:var(--faint)">(eval '+(sem.eval||"&mdash;")+')</span></div>'
      +'<div style="font-size:12px;color:var(--faint);margin-top:8px">N\u00facleo (designado, nunca se vende)</div><div>'+nuc.map(chip).join("")+'</div>'
      +'<div style="font-size:12px;color:var(--faint);margin-top:8px">Sat\u00e9lite momentum 12-1 (rota el d\u00eda 1)</div><div>'+(sat.map(chip).join("")||'<span class="lbl">en cash (paraguas)</span>')+'</div>'
      +'<div class="note" style="margin-top:10px">Paper con la cartera REAL como base: BTC+ETH designados n\u00facleo, sat\u00e9lite en bStocks. Aportes reales se registran con <span class="mono">--aporte</span>. Fuera del per\u00edmetro: BNB, WLD, BANK y el colch\u00f3n en Earn.</div>';
    b.dataset.ok="1";
  }
  load().then(function(){setTimeout(function(){banner();card();},1500);});
  setInterval(function(){load().then(card);},30000);
  setInterval(function(){banner();card();},4000);
})();

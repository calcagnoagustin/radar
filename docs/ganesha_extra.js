/* ganesha_extra.js — mejoras del Radar sin tocar el bot.
   1) Historial persistente de Ganesha (lee recent_closed del ledger events.jsonl)
   2) Nivel de TP1 (+2R, 30%) en cada posicion abierta
   3) Cada activo del portfolio es clickeable -> TradingView (BINANCE, velas 1D)
   Se re-aplica en intervalos porque los scripts base re-renderizan cada 60s. */
(function(){
  var MONTHS=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  function fU(n,d){if(d==null)d=2;return n==null?"—":(n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});}
  function fP(n){return (n>=0?"+":"")+n.toFixed(2)+"%";}
  function cl(n){return n>0.0001?"up":(n<-0.0001?"down":"flat");}
  function stamp(ts){var t=new Date(ts*1000);return isNaN(t)?"—":t.getDate()+" "+MONTHS[t.getMonth()]+" "+String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0");}
  function tvUrl(sym){return "https://www.tradingview.com/chart/?symbol=BINANCE:"+sym.replace("/","").toUpperCase()+"&interval=1D";}
  function openTV(sym){window.open(tvUrl(sym),"_blank","noopener");}

  function linkify(){
    document.querySelectorAll(".sym").forEach(function(el){
      if(el.dataset.tv)return;
      var base=el.textContent.trim();
      if(!base)return;
      var quote="USDT";
      var pe=el.parentElement&&el.parentElement.querySelector(".pair");
      if(pe){var m=pe.textContent.replace("/","").trim();if(m)quote=m;}
      el.dataset.tv="1";el.style.cursor="pointer";el.title="Ver en TradingView (1D)";el.style.textDecoration="underline dotted";
      var sym=base+"/"+quote;
      el.addEventListener("click",function(){openTV(sym);});
    });
    document.querySelectorAll("#shortlist .chip").forEach(function(c){
      if(c.dataset.tv)return;
      var base=(c.textContent.trim().split(/\s/)[0]||"");
      if(!base)return;
      c.dataset.tv="1";c.style.cursor="pointer";c.title="Ver en TradingView (1D)";
      c.addEventListener("click",function(){openTV(base+"/USDT");});
    });
  }

  var D=null;
  function loadG(){return fetch("./ganesha_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){if(j)D=j;}).catch(function(){});}

  function tpOpen(){
    if(!D)return;
    var cont=document.getElementById("gPositions");if(!cont)return;
    var rows=cont.querySelectorAll(".pos");var op=D.open_positions||[];
    rows.forEach(function(row,i){
      if(row.dataset.tp)return;
      var p=op[i];if(!p){return;}
      var meta=row.querySelector(".pos-meta");if(!meta)return;
      var html="";
      if(p.tp1_done){html='<span>TP1 <b class="mono up">✓ hecho</b> <span class="flat">luego trailing</span></span>';}
      else if(p.entry!=null&&p.stop!=null&&p.entry>p.stop){var tp=p.entry+2*(p.entry-p.stop);html='<span>TP1 <b class="mono">'+fU(tp,tp<1?4:2)+'</b> <span class="flat">(+2R · vende 30%)</span></span>';}
      if(html)meta.insertAdjacentHTML("beforeend",html);
      row.dataset.tp="1";
    });
  }

  function history(){
    if(!D)return;
    var card=document.getElementById("gHistCard");
    if(!card){
      var cols=document.querySelectorAll(".cols");var gc=cols[cols.length-1];if(!gc)return;
      card=document.createElement("div");card.className="card";card.id="gHistCard";card.style.marginTop="18px";
      card.innerHTML='<div class="head"><span class="title">Historial Ganesha</span><span class="eyebrow" id="gHistCount"></span></div><div class="body" id="gHistBody"></div>';
      gc.parentElement.insertBefore(card,gc.nextSibling);
    }
    var body=document.getElementById("gHistBody");
    var arr=(D.recent_closed||[]).slice().reverse();
    document.getElementById("gHistCount").textContent=arr.length+" evento(s)";
    if(!arr.length){body.innerHTML='<div class="row"><span class="lbl">Sin cierres todavía.</span></div>';return;}
    body.innerHTML=arr.map(function(c){
      var isTp=c.action==="tp";var sym=(c.symbol||"").split("/")[0];var tvs=(c.symbol||"").replace("/","").toUpperCase();
      var pnl=c.pnl_net||0;var varpct=(c.exit&&c.entry)?(c.exit/c.entry-1)*100:null;
      return '<div class="pos"><div class="pos-top"><div><span class="sym" data-tv="1" style="cursor:pointer;text-decoration:underline dotted" title="TradingView (1D)" onclick="window.open(\'https://www.tradingview.com/chart/?symbol=BINANCE:'+tvs+'&interval=1D\',\'_blank\',\'noopener\')">'+sym+'</span> <span class="badge '+(isTp?"moonbag":"closed")+'" style="margin-left:6px">'+(isTp?"TP parcial":"Stop")+'</span></div><div class="pos-pnl"><div class="pct '+cl(pnl)+'">'+fU(pnl)+'</div><div class="abs">'+stamp(c.closed_ts)+'</div></div></div><div class="pos-meta"><span>Entrada <b class="mono">'+fU(c.entry,c.entry<1?4:2)+'</b></span><span>Salida <b class="mono">'+fU(c.exit,c.exit<1?4:2)+'</b></span>'+(varpct!=null?'<span>Var <b class="mono '+cl(varpct/100)+'">'+fP(varpct)+'</b></span>':'')+'</div></div>';
    }).join("");
  }

  function decorate(){linkify();tpOpen();}
  loadG().then(function(){setTimeout(function(){decorate();history();},1200);});
  setInterval(function(){loadG().then(history);},15000);
  setInterval(decorate,2500);
})();

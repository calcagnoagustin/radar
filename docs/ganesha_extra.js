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
      slot.insertAdjacentHTML("beforeend",html);row.dataset.tp="1";
    });
  }
  function apply(){linkify();tpOpen();}
  loadG().then(function(){setTimeout(apply,1000);});
  setInterval(function(){loadG();},20000);
  setInterval(apply,2500);
})();

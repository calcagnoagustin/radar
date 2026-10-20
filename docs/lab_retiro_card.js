(function(){
  if(document.getElementById("retlabRadar")) return;
  var h=document.createElement("div"); h.id="retlabRadar"; h.className="labsec";
  h.innerHTML='<hr class="gan-sep"><div class="gan-head"><div class="brand"><h1>Radar - Retiro Lab</h1><div class="sub">Misma plata y mismas fechas que tu Retiro real &middot; &iquest;qu&eacute; hubiera pasado con el modelo o con SPY solo? &middot; no opera</div></div>'+
    '<div style="display:flex;align-items:center;gap:14px"><span class="badge dry">PAPER</span><div class="pulse"><span class="dot"></span><span class="labFresh">&mdash;</span></div></div></div>'+
    '<span id="retlabBal" style="display:none"></span><span id="retlabPnl" style="display:none"></span>'+
    '<div class="lab-grid"><div class="card"><div class="head"><span class="title">Real vs modelo vs SPY</span><span class="eyebrow" id="retlabE"></span></div><div class="body" id="retlabB"></div></div>'+
    '<div class="card"><div class="head"><span class="title">Backtest</span><span class="eyebrow">aporte 100/mes &middot; Yahoo mensual</span></div><div class="body" id="retlabBT"></div></div></div>';
  var foot=document.querySelector("footer"); if(foot&&foot.parentNode) foot.parentNode.insertBefore(h,foot); else document.body.appendChild(h);
  var $=function(i){return document.getElementById(i)};
  var f=function(n,d){d=(d==null)?2:d;return (n<0?"-":"")+"$"+Math.abs(Number(n)||0).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})};
  var pc=function(n){return n==null?"&mdash;":((n>0?"+":"")+Number(n).toFixed(2)+"%")};
  var col=function(v){return v>0?"#BFD78D":(v<0?"#D9967E":"")};
  var kv=function(l,v,c){return '<div class="kv"><span class="lbl">'+l+'</span><span class="mono"'+(c?' style="color:'+c+'"':'')+'>'+v+'</span></div>'};
  function spark(cur){
    var keys=["real","modelo","spy"],colors=["#e8efe9","#BFD78D","#82AADC"];
    var n=cur.real.length; if(n<2) return "";
    var vals=[];keys.forEach(function(k){cur[k].forEach(function(r){vals.push(r[1])})});
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);if(mx===mn)mx=mn+1;var W=300,H=110;
    var paths=keys.map(function(k,i){var s=cur[k],m=s.length;
      var d=s.map(function(r,j){var x=(j/(m-1))*W,y=H-4-((r[1]-mn)/(mx-mn))*(H-8);return (j?"L":"M")+x.toFixed(1)+","+y.toFixed(1)}).join("");
      return '<path d="'+d+'" fill="none" stroke="'+colors[i]+'" stroke-width="1.6" opacity="'+(i?0.85:1)+'"/>';}).join("");
    return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:110px">'+paths+'</svg><div style="font-size:11px;color:var(--faint)"><span style="color:#e8efe9">&#9644;</span> real &nbsp; <span style="color:#BFD78D">&#9644;</span> modelo &nbsp; <span style="color:#82AADC">&#9644;</span> SPY</div>';
  }
  fetch("./lab_retiro_data.json?ts="+Date.now()).then(function(r){return r.json()}).then(function(d){
    $("retlabE").textContent="desde "+d.desde+" \u00b7 aportes "+f(d.aportes_usd,0);
    var h=spark(d.curvas);
    [["Real (Inviu)","real"],["Modelo SPY 55 / QQQ 25 / GLD 10 / ACWI 10","modelo"],["100% SPY","spy"]].forEach(function(x){var r=d[x[1]];h+=kv(x[0],f(r.valor)+' &middot; <span style="color:'+col(r.ganancia)+'">'+f(r.ganancia)+' ('+pc(r.pct)+')</span>');});
    h+=kv("Modelo vs real",'<span style="color:'+col(d.modelo.valor-d.real.valor)+'">'+f(d.modelo.valor-d.real.valor)+'</span>');
    h+='<div class="hint">'+d.regla+' Arranca con tu valor real del '+d.desde+' ('+f(d.inicio_usd)+').</div>';
    $("retlabB").innerHTML=h;
    var bt='';(d.backtest.filas||[]).forEach(function(fila){bt+='<div style="font-size:11px;color:var(--faint);margin:8px 0 2px">'+fila[0]+'</div>';Object.keys(fila[1]).forEach(function(k){bt+=kv(k,fila[1][k]);});});
    bt+='<div class="hint">TIR = rendimiento anual de la plata aportada mes a mes. Lo que el backtest dice: SPY solo le gana al mix con Argentina, bonos y FXI en casi todos los per&iacute;odos; sumar QQQ y oro lo iguala en los a&ntilde;os buenos y lo protege en la d&eacute;cada perdida 2004-2012. Argentina y emergentes restaron en los &uacute;ltimos 15 a&ntilde;os.</div>';
    $("retlabBT").innerHTML=bt;
    $("retlabBal").textContent="$"+d.modelo.valor.toFixed(2); $("retlabPnl").textContent=(d.modelo.ganancia<0?"-":"")+"$"+Math.abs(d.modelo.ganancia).toFixed(2)+" ("+pc(d.modelo.pct)+")";
    Array.prototype.forEach.call(h.querySelectorAll?[]:[],function(){});
    var fr=document.querySelector("#retlabRadar .labFresh"); if(fr) fr.textContent="lab: "+(d.generated_at||"").replace("T"," ")+" UTC";
  }).catch(function(e){ var fr=document.querySelector("#retlabRadar .labFresh"); if(fr) fr.innerHTML='<span class="err">lab_retiro_data.json a&uacute;n no disponible</span>'; });
})();

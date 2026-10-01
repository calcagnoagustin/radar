/* curvas.js (01/10/2026) — "Curva del mes" dentro del panel de cada bot.
   Lee curvas_data.json (lo publica panel_curvas.py en la VM una vez por dia).
   Muestra: valor y ganancia en $ y %, la misma plata en BTC y en SPY, hitos de
   cada viernes, promedio diario y peor caida. Solo visualizacion. */
(function(){
  var MO=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  var D=null;
  function $(id){return document.getElementById(id);}
  function fU(n){if(n==null)return "\u2014";return (n<0?"-":"+")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function fV(n){return "$"+(+n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function fP(n){if(n==null)return "\u2014";return (n>=0?"+":"")+(+n).toFixed(2)+"%";}
  function col(n){return n>0.004?"var(--jade)":(n<-0.004?"var(--clay)":"var(--muted)");}
  function dm(s){var p=s.split("-");return (+p[2])+" "+MO[+p[1]-1];}
  function both(u,p){return '<span style="color:'+col(u)+'">'+fU(u)+' <span style="font-size:.85em">('+fP(p)+')</span></span>';}

  var css=document.createElement("style");
  css.textContent=".cv-card{margin-bottom:18px}.cv-big{font-size:22px;font-weight:600;margin:4px 0 2px}"
   +".cv-leg{display:flex;flex-wrap:wrap;gap:12px;font-size:11.5px;color:var(--muted);margin:6px 0 4px}"
   +".cv-leg i{display:inline-block;width:14px;height:0;border-top:2px solid;vertical-align:middle;margin-right:5px}"
   +".cv-tb{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}"
   +".cv-tb td,.cv-tb th{padding:6px 4px;border-top:1px solid var(--hair-soft);text-align:right}"
   +".cv-tb th{color:var(--faint);font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:500}"
   +".cv-tb td:first-child,.cv-tb th:first-child{text-align:left}";
  document.head.appendChild(css);

  function svg(b){
    var P=b.puntos, W=600, H=150, pad=8, padB=18;
    var vals=[];P.forEach(function(p){vals.push(p.eq);if(p.btc)vals.push(p.btc);if(p.spy)vals.push(p.spy);});
    var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), rg=(mx-mn)||1;
    var X=function(i){return pad+i*(W-2*pad)/Math.max(1,P.length-1);};
    var Y=function(v){return H-padB-(v-mn)/rg*(H-padB-pad);};
    function path(k){var d="",on=false;P.forEach(function(p,i){var v=p[k];if(v==null){on=false;return;}d+=(on?" L ":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1);on=true;});return d;}
    var last=P[P.length-1], c=col(b.gan_usd);
    var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:150px;display:block">'
      +'<line x1="0" x2="'+W+'" y1="'+Y(b.base).toFixed(1)+'" y2="'+Y(b.base).toFixed(1)+'" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 4"/>';
    (b.viernes||[]).forEach(function(v){
      var i=P.findIndex(function(p){return p.d===v.d;}); if(i<0)return;
      s+='<line x1="'+X(i).toFixed(1)+'" x2="'+X(i).toFixed(1)+'" y1="'+pad+'" y2="'+(H-padB)+'" stroke="rgba(255,255,255,.07)"/>'
        +'<text x="'+X(i).toFixed(1)+'" y="'+(H-4)+'" fill="#7E9085" font-size="11" text-anchor="middle" font-family="IBM Plex Mono,monospace">vie '+dm(v.viernes)+'</text>';
    });
    s+='<path d="'+path("btc")+'" fill="none" stroke="#E8C36A" stroke-width="1.4" stroke-dasharray="5 4" vector-effect="non-scaling-stroke" opacity=".8"/>'
      +'<path d="'+path("spy")+'" fill="none" stroke="#7FB0C9" stroke-width="1.4" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" opacity=".8"/>'
      +'<path d="'+path("eq")+'" fill="none" stroke="'+c+'" stroke-width="2.4" vector-effect="non-scaling-stroke"/>';
    (b.viernes||[]).forEach(function(v){
      var i=P.findIndex(function(p){return p.d===v.d;}); if(i<0)return;
      s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(v.eq).toFixed(1)+'" r="4" fill="'+c+'" stroke="#0E1411" stroke-width="2"/>';
    });
    s+='<circle cx="'+X(P.length-1).toFixed(1)+'" cy="'+Y(last.eq).toFixed(1)+'" r="3.5" fill="'+c+'"/></svg>';
    return s;
  }

  function card(key,b){
    var h='<div class="head"><span class="title">Curva del mes</span><span class="eyebrow">'
      +(b.sin_datos?"sin datos":dm(b.desde)+" \u2192 "+dm(b.hasta))+'</span></div><div class="body">';
    if(b.sin_datos){return h+'<div class="row"><span class="lbl">Todav\u00eda no hay dos d\u00edas de datos para dibujar.</span></div></div>';}
    h+='<div class="row" style="border:0;padding-bottom:0"><span class="lbl">Ganancia del per\u00edodo</span><span class="mono">'+fV(b.base)+' \u2192 '+fV(b.valor)+'</span></div>'
      +'<div class="cv-big mono">'+both(b.gan_usd,b.gan_pct)+'</div>'
      +svg(b)
      +'<div class="cv-leg"><span><i style="border-color:'+col(b.gan_usd)+'"></i>'+b.nombre+'</span>'
      +'<span><i style="border-color:#E8C36A;border-top-style:dashed"></i>misma plata en BTC</span>'
      +'<span><i style="border-color:#7FB0C9;border-top-style:dotted"></i>misma plata en SPY</span>'
      +'<span>\u25cf viernes</span></div>';
    function vs(k,lbl){
      if(b[k+"_usd"]==null)return "";
      var d=b["vs_"+k+"_usd"];
      return '<div class="row"><span class="lbl">'+lbl+'</span><span class="mono">'+both(b[k+"_usd"],b[k+"_pct"])
        +' <span style="font-size:.85em;color:'+col(d)+'">\u00b7 '+(d>=0?"le gana ":"pierde ")+fU(Math.abs(d)).replace("+","")+'</span></span></div>';
    }
    h+=vs("btc","Si estaba en BTC")+vs("spy","Si estaba en SPY")
      +'<div class="row"><span class="lbl">Promedio por d\u00eda</span><span class="mono">'+both(b.prom_dia_usd,b.prom_dia_pct)
      +' <span style="font-size:.85em;color:var(--muted)">\u00b7 '+b.dias_arriba+'/'+b.dias+' d\u00edas arriba</span></span></div>'
      +'<div class="row"><span class="lbl">Peor ca\u00edda</span><span class="mono" style="color:var(--clay)">'+fU(b.max_dd_usd)+' ('+fP(b.max_dd_pct)+')</span></div>';
    if((b.viernes||[]).length){
      h+='<table class="cv-tb mono"><tr><th>Viernes</th><th>Valor</th><th>Semana</th><th>Acumulado</th></tr>';
      b.viernes.forEach(function(v){
        h+='<tr><td>'+dm(v.viernes)+'</td><td>'+fV(v.eq)+'</td><td style="color:'+col(v.sem_usd)+'">'+fU(v.sem_usd)+' ('+fP(v.sem_pct)+')</td>'
          +'<td style="color:'+col(v.gan)+'">'+fU(v.gan)+'</td></tr>';
      });
      var u=b.puntos[b.puntos.length-1];
      h+='<tr><td>hoy '+dm(u.d)+'</td><td>'+fV(u.eq)+'</td><td></td><td style="color:'+col(u.gan)+'">'+fU(u.gan)+'</td></tr></table>';
    }
    if(b.nota)h+='<div style="color:var(--faint);font-size:11.5px;margin-top:10px">'+b.nota+'</div>';
    return h+'</div>';
  }

  var DEST={
    fondo:{ancla:"fondoHero"},
    ganesha:{ancla:"gBal",hero:true},
    pescador:{ancla:"p2Bal",hero:true,viejo:"p2CurvaBody"},
    chico:{ancla:"pcBal",hero:true,viejo:"pcCurvaBody"}
  };
  function colocar(){
    if(!D)return false;var todo=true;
    Object.keys(DEST).forEach(function(k){
      var b=D.bots&&D.bots[k]; if(!b)return;
      var cfg=DEST[k], a=$(cfg.ancla);
      if(!a){todo=false;return;}
      var ref=cfg.hero?(a.closest("section.hero")||a.closest(".hero")):a;
      if(!ref){todo=false;return;}
      var id="cv_"+k, el=$(id);
      if(!el){el=document.createElement("div");el.id=id;el.className="card cv-card";ref.parentNode.insertBefore(el,ref.nextSibling);}
      el.innerHTML=card(k,b);
      if(cfg.viejo){var v=$(cfg.viejo);if(v){var vc=v.closest(".card");if(vc)vc.style.display="none";}}
    });
    return todo;
  }
  fetch("./curvas_data.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null;}).then(function(j){
    D=j; var n=0; (function intento(){if(colocar()||++n>40)return; setTimeout(intento,500);})();
  }).catch(function(){});
})();

/* pescador_analitica.js (22/09/2026) - Curva del equity + Auditoria
   para el Pescador y el Pescador Chico. Se cuelga dentro de cada host
   existente; no toca el renderer de las tarjetas. */
(function(){
  var BOTS=[
    {host:"pescadorV2",    pre:"p2", data:"./pescador_data.json",       k:"pescador", nom:"Pescador"},
    {host:"pescadorChico", pre:"pc", data:"./pescador_chico_data.json", k:"chico",    nom:"Pescador Chico"}
  ];
  var AUD=null;
  var $=function(i){return document.getElementById(i)};
  var sg=function(v,d){d=(d==null?2:d);return (v>=0?"+":"")+Number(v).toFixed(d)};
  var col=function(v){return v>0?"#3fb950":(v<0?"#f85149":"var(--faint,#888)")};

  function tarjetas(b){
    var h=$(b.host); if(!h||$(b.pre+"CurvaBody")) return false;
    var d=document.createElement("div");
    d.innerHTML='<div class="card" style="margin-top:18px"><div class="head">'
      +'<span class="title">Curva del equity</span><span class="eyebrow" id="'+b.pre+'CurvaN"></span></div>'
      +'<div class="body" id="'+b.pre+'CurvaBody"></div></div>'
      +'<div class="card" style="margin-top:18px"><div class="head">'
      +'<span class="title">Auditor\u00eda</span><span class="eyebrow" id="'+b.pre+'AudN"></span></div>'
      +'<div class="body" id="'+b.pre+'AudBody"></div></div>';
    while(d.firstChild) h.appendChild(d.firstChild);
    return true;
  }

  function curva(b,pts){
    var body=$(b.pre+"CurvaBody"); if(!body) return;
    var n=$(b.pre+"CurvaN");
    if(!pts||pts.length<2){
      body.innerHTML='<div class="row"><span class="lbl">Arranc\u00f3 reci\u00e9n: la curva se dibuja con un punto por d\u00eda.</span></div>';
      if(n) n.textContent=(pts&&pts.length?pts.length+" d\u00eda":"sin datos"); return;
    }
    var v=pts.map(function(p){return p.eq}), mn=Math.min.apply(null,v), mx=Math.max.apply(null,v);
    var base=v[0], ult=v[v.length-1], rg=(mx-mn)||1, W=600,H=120,P=6;
    var xy=v.map(function(y,i){return [P+i*(W-2*P)/(v.length-1), H-P-(y-mn)/rg*(H-2*P)]});
    var d="M"+xy.map(function(p){return p[0].toFixed(1)+" "+p[1].toFixed(1)}).join(" L ");
    var yb=H-P-(base-mn)/rg*(H-2*P), c=col(ult-base);
    body.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="width:100%;height:120px;display:block">'
      +'<line x1="0" y1="'+yb.toFixed(1)+'" x2="'+W+'" y2="'+yb.toFixed(1)+'" stroke="rgba(255,255,255,.18)" stroke-dasharray="4 4"/>'
      +'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'
      +'<div class="rg" style="margin-top:10px"><span class="lbl">Desde '+pts[0].d+'</span>'
      +'<span class="mono" style="color:'+c+'">'+sg(100*(ult-base)/base)+'% &middot; $'+ult.toFixed(2)+'</span></div>'
      +'<div class="rg"><span class="lbl">Piso / techo</span><span class="mono">$'+mn.toFixed(2)+' &middot; $'+mx.toFixed(2)+'</span></div>';
    if(n) n.textContent=pts.length+" d\u00edas";
  }

  function audit(b){
    var body=$(b.pre+"AudBody"); if(!body) return;
    var a=AUD?AUD[b.k]:null, n=$(b.pre+"AudN");
    if(!a||a.sin_datos){ body.innerHTML='<div class="row"><span class="lbl">Sin auditor\u00eda todav\u00eda.</span></div>'; return; }
    if(n) n.textContent=(a.trades||0)+" operaciones cerradas";
    var h='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">'
      +'<tr style="color:var(--faint);text-transform:uppercase;font-size:10px;letter-spacing:.05em">'
      +'<th style="text-align:left;padding:6px 8px 6px 0">Contra qu\u00e9 se compara</th>'
      +'<th style="text-align:right;padding:6px 8px">Retorno</th>'
      +'<th style="text-align:right;padding:6px 0 6px 8px">Diferencia</th></tr>';
    (a.controles||[]).forEach(function(c){
      if(c.v==null) return;
      h+='<tr style="border-top:1px solid var(--hair);'+(c.destacar?'background:rgba(111,191,142,.06)':'')+'">'
        +'<td style="padding:7px 8px 7px 0;'+(c.destacar?'font-weight:600':'color:var(--faint)')+'">'+c.k+'</td>'
        +'<td class="mono" style="text-align:right;padding:7px 8px;color:'+col(c.v)+'">'+sg(c.v)+'%</td>'
        +'<td class="mono" style="text-align:right;padding:7px 0 7px 8px;color:'+(c.pp==null?"var(--faint)":col(c.pp))+'">'
        +(c.pp==null?"\u2014":sg(c.pp)+" pp")+'</td></tr>';
    });
    h+='</table></div>';

    var s=a.salida||{};
    if(s.con_reglas!=null&&s.sin_salir!=null){
      var dif=s.con_reglas-s.sin_salir;
      h+='<div class="rg" style="margin-top:12px"><span class="lbl">Salir con las reglas vs. no vender nunca</span>'
        +'<span class="mono" style="color:'+col(dif)+'">'+sg(s.con_reglas)+'% vs '+sg(s.sin_salir)+'% &middot; '+sg(dif)+' pp</span></div>';
    }
    if(a.trades){
      h+='<div class="rg"><span class="lbl">Aciertos &middot; PF &middot; ruedas promedio</span><span class="mono">'
        +(a.win_rate!=null?a.win_rate+"%":"\u2014")+' &middot; '+(a.profit_factor!=null?a.profit_factor:"\u2014")
        +' &middot; '+(a.ruedas_prom!=null?a.ruedas_prom:"\u2014")+'</span></div>';
    }
    h+='<div class="rg"><span class="lbl">Ca\u00edda m\u00e1xima</span><span class="mono" style="color:'+col(a.max_dd_pct)+'">'
      +Number(a.max_dd_pct||0).toFixed(2)+'%</span></div>';
    h+='<div style="margin-top:14px">';
    (a.chequeos||[]).forEach(function(c){
      h+='<div class="rg"><span class="lbl">'+(c.ok?'<span style="color:#3fb950">\u2713</span>':'<span style="color:#f85149">\u2717</span>')
        +' '+c.k+'</span><span class="mono" style="opacity:.7">'+c.v+'</span></div>';
    });
    body.innerHTML=h+'</div>';
  }

  function ciclo(){
    fetch("./pescador_audit.json?ts="+Date.now()).then(function(r){return r.ok?r.json():null})
      .then(function(j){ if(j) AUD=j; })
      .catch(function(){})
      .then(function(){
        BOTS.forEach(function(b){
          if(!$(b.host)) return;
          tarjetas(b);
          fetch(b.data+"?ts="+Date.now()).then(function(r){return r.ok?r.json():null})
            .then(function(j){ curva(b,j&&j.equity_curve); audit(b); })
            .catch(function(){ audit(b); });
        });
      });
  }
  ciclo(); setInterval(ciclo,60000);
  setTimeout(ciclo,1500); setTimeout(ciclo,4000);
})();

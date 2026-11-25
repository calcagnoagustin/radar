/* orden_portfolio.js (25/11/2026, pedido de Agus): la vista Portfolio en este orden y sin confusiones:
   1) Colchón (grande, lo más importante: lo que realmente tiene)  2) Retiro  3) Total  y después Fondo Uli y Otros.
   El "Subtotal líquido" se oculta. Mueve bloques enteros (barra + contenido), no toca desplegables.js. Cargar DESPUÉS de desplegables.js. */
(function(){
  var ORDEN=["colchon","retiro","total","uli","binance"];
  var st=document.createElement("style");
  st.textContent=[
    '.bot-bar[data-g="liquido"],[data-grupo="liquido"]{display:none!important}',
    /* Colchón protagonista */
    '.bot-bar[data-g="colchon"]{padding:26px 20px!important;margin-bottom:18px!important;border:1px solid rgba(200,180,120,.6)!important;background:linear-gradient(135deg,rgba(200,180,120,.18),rgba(200,180,120,.04))!important;box-shadow:0 10px 30px rgba(0,0,0,.25)}',
    '.bot-bar[data-g="colchon"] .bn{font-size:1.35em!important;color:#e2cf98}',
    '.bot-bar[data-g="colchon"] .bt{font-size:2.6em!important;color:#f1e3b4!important}',
    /* Retiro normal */
    '.bot-bar[data-g="retiro"]{margin-bottom:14px!important}',
    /* Total discreto, abajo */
    '.bot-bar[data-g="total"]{padding:14px 18px!important;margin:10px 0 26px!important;border:1px dashed var(--hair,rgba(255,255,255,.15))!important;background:transparent!important;box-shadow:none!important;opacity:.8}',
    '.bot-bar[data-g="total"] .bn{font-size:1em!important}',
    '.bot-bar[data-g="total"] .bt{font-size:1.3em!important}',
    '.bot-bar[data-g="uli"],.bot-bar[data-g="binance"]{opacity:.75}',
    '.bot-bar[data-g="uli"] .bt,.bot-bar[data-g="binance"] .bt{font-size:1.25em!important}'
  ].join("");
  document.head.appendChild(st);
  function nodos(g){
    var out=[], b=document.querySelector('.bot-bar[data-g="'+g+'"]'); if(!b) return out; out.push(b);
    Array.prototype.forEach.call(document.body.children,function(el){ if(!el.classList.contains("bot-bar")&&el.getAttribute("data-grupo")===g) out.push(el); });
    return out;
  }
  function ordenar(){
    var ancla=document.querySelector('.bot-bar[data-g="lab"]')||document.querySelector("body > header"); if(!ancla) return;
    var seq=[]; ORDEN.forEach(function(g){ seq=seq.concat(nodos(g)); });
    if(!seq.length) return;
    var set=new Set(seq), actual=Array.prototype.filter.call(document.body.children,function(n){return set.has(n);});
    var ok=actual.length===seq.length&&actual.every(function(n,i){return n===seq[i];})&&(seq[seq.length-1].compareDocumentPosition(ancla)&Node.DOCUMENT_POSITION_FOLLOWING);
    if(ok) return;
    // lo que no es del ORDEN (liquido) queda antes; insertamos la secuencia antes del ancla
    seq.forEach(function(n){ ancla.parentNode.insertBefore(n,ancla); });
  }
  setTimeout(ordenar,900); setInterval(ordenar,2500);
})();

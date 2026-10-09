/* chat_radar.js (09/10/2026) - Chat con Claude dentro del Radar, con el proyecto y el playbook.
   Backend: https://vm.semillaredes.com/radar (VM radar_chat/radar_chat_srv.py). La clave se carga una vez
   con el link .../#rk=<clave> y queda guardada en este navegador. */
(function(){
  var API="https://vm.semillaredes.com/radar", K=null, ocup=false, abierto=false, tab="chat";
  try{ var m=location.hash.match(/rk=([\w-]+)/); if(m){ localStorage.setItem("radar_ck",m[1]); history.replaceState(null,"",location.pathname+location.search); } K=localStorage.getItem("radar_ck"); }catch(e){}
  var VERDE="#5E7B3C";
  var st=document.createElement("style");
  st.textContent=[
   '#rcFab{position:fixed;right:18px;bottom:18px;z-index:2147483001;width:60px;height:60px;border-radius:50%;border:0;background:'+VERDE+';color:#fff;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center}',
   '#rcFab svg{width:28px;height:28px}',
   '#rcTip{position:fixed;right:88px;bottom:30px;z-index:2147483001;background:#f4efe6;color:#1A2456;font:600 14px/1.2 system-ui,sans-serif;padding:10px 14px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);cursor:pointer}',
   '#rcBox{position:fixed;right:18px;bottom:90px;z-index:2147483002;width:min(420px,calc(100vw - 24px));height:min(640px,calc(100vh - 120px));background:#121a16;border:1px solid rgba(111,191,142,.35);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.55);display:none;flex-direction:column;overflow:hidden;font:15px/1.45 system-ui,-apple-system,sans-serif;color:#e8efe9}',
   '#rcBox.on{display:flex}',
   '@media(max-width:600px){#rcBox{right:0;bottom:0;width:100vw;height:100dvh;border-radius:0}#rcFab.on{display:none}}',
   '#rcHead{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}',
   '#rcHead b{flex:1;font-size:15px}#rcHead button{background:rgba(255,255,255,.08);color:#e8efe9;border:0;border-radius:10px;padding:7px 11px;font:inherit;font-size:13px;cursor:pointer}',
   '#rcHead button.act{background:'+VERDE+';color:#fff}',
   '#rcMsgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
   '.rcM{max-width:88%;padding:10px 13px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}',
   '.rcM.yo{align-self:flex-end;background:#2a3b6b;color:#fff;border-bottom-right-radius:4px}',
   '.rcM.ia{align-self:flex-start;background:rgba(255,255,255,.06);border-bottom-left-radius:4px}',
   '.rcChip{display:block;margin-top:8px;font-size:12.5px;padding:6px 9px;border-radius:9px;background:rgba(111,191,142,.14);color:#9fd3b0}',
   '.rcChip.ped{background:rgba(240,136,62,.14);color:#f3b07e}',
   '#rcIn{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08)}',
   '#rcIn textarea{flex:1;resize:none;height:44px;max-height:120px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#e8efe9;padding:11px 12px;font:inherit}',
   '#rcIn button{border:0;border-radius:12px;padding:0 16px;background:'+VERDE+';color:#fff;font:600 15px system-ui;cursor:pointer}',
   '#rcIn button:disabled{opacity:.5}',
   '#rcPb{flex:1;overflow-y:auto;padding:16px 18px;display:none;font-size:14.5px}',
   '#rcPb h1{font-size:18px;margin:0 0 8px}#rcPb h2{font-size:15.5px;margin:18px 0 6px;color:#9fd3b0}#rcPb h3{font-size:14.5px;margin:12px 0 4px}',
   '#rcPb ul{margin:4px 0;padding-left:18px}#rcPb li{margin:3px 0}#rcPb p{margin:6px 0;opacity:.85}',
   '.rcHint{opacity:.6;font-size:13px;text-align:center;padding:6px 10px}',
   '.rcDots:after{content:"\\2026";animation:rcD 1.2s infinite}@keyframes rcD{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}}'
  ].join("");
  document.head.appendChild(st);
  function el(t,a,h){var e=document.createElement(t);if(a)for(var k in a)e.setAttribute(k,a[k]);if(h!=null)e.innerHTML=h;return e;}
  function esc(s){return String(s||"").replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}
  function md(s){return esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");}
  function mdDoc(s){
    var out=[],ul=false;
    esc(s).split("\n").forEach(function(l){
      var b=function(x){return x.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");};
      if(/^\s*- /.test(l)){ if(!ul){out.push("<ul>");ul=true;} out.push("<li>"+b(l.replace(/^\s*- /,""))+"</li>"); return; }
      if(ul){out.push("</ul>");ul=false;}
      if(/^### /.test(l)) out.push("<h3>"+b(l.slice(4))+"</h3>");
      else if(/^## /.test(l)) out.push("<h2>"+b(l.slice(3))+"</h2>");
      else if(/^# /.test(l)) out.push("<h1>"+b(l.slice(2))+"</h1>");
      else if(l.trim()) out.push("<p>"+b(l)+"</p>");
    });
    if(ul) out.push("</ul>"); return out.join("");
  }
  var fab=el("button",{id:"rcFab","aria-label":"Chat con Claude"},'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/><path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z"/></svg>');
  var tip=el("div",{id:"rcTip"},"Habl&aacute; con Claude");
  var box=el("div",{id:"rcBox"});
  box.innerHTML='<div id="rcHead"><b>Radar &middot; Claude</b><button data-t="chat" class="act">Chat</button><button data-t="pb">Playbook</button><button id="rcX">&#10005;</button></div>'
    +'<div id="rcMsgs"></div><div id="rcPb"></div>'
    +'<div id="rcIn"><textarea id="rcT" placeholder="Pregunt&aacute;, ped&iacute; un cambio o tir&aacute; una idea&hellip;"></textarea><button id="rcS">Enviar</button></div>';
  document.body.appendChild(fab); document.body.appendChild(tip); document.body.appendChild(box);
  try{ if(localStorage.getItem("radar_ct")) tip.remove(); }catch(e){}
  var $=function(i){return document.getElementById(i);};
  function abrir(v){abierto=v;box.classList.toggle("on",v);fab.classList.toggle("on",v);if(v){try{localStorage.setItem("radar_ct","1");}catch(e){} if(tip.parentNode)tip.remove(); cargar();}}
  fab.onclick=function(){abrir(!abierto);}; tip.onclick=function(){abrir(true);}; $("rcX").onclick=function(){abrir(false);};
  Array.prototype.forEach.call(box.querySelectorAll("#rcHead button[data-t]"),function(b){b.onclick=function(){
    tab=b.getAttribute("data-t"); box.querySelectorAll("#rcHead button[data-t]").forEach(function(x){x.classList.toggle("act",x===b);});
    $("rcMsgs").style.display=tab==="chat"?"flex":"none"; $("rcIn").style.display=tab==="chat"?"flex":"none"; $("rcPb").style.display=tab==="pb"?"block":"none";
    if(tab==="pb") playbook(); };});
  function burbuja(m){
    var d=el("div",{"class":"rcM "+(m.rol==="ia"?"ia":"yo")},md(m.texto));
    (m.playbook||[]).forEach(function(x){d.appendChild(el("span",{"class":"rcChip"},"&#128210; Guardado en el playbook &middot; "+esc(x)));});
    (m.cambios||[]).forEach(function(x){d.appendChild(el("span",{"class":"rcChip"},"&#10003; "+esc(x)));});
    if(m.pedido) d.appendChild(el("span",{"class":"rcChip ped"},"&#128221; Pedido para Claude: "+esc(m.pedido)));
    $("rcMsgs").appendChild(d); $("rcMsgs").scrollTop=1e9;
  }
  function pedirClave(){
    $("rcMsgs").innerHTML=""; $("rcMsgs").appendChild(el("div",{"class":"rcHint"},"Abr&iacute; el panel una vez desde el link con la clave (te lo pas&oacute; Claude) o pegala ac&aacute;:"));
    var i=el("textarea",{placeholder:"clave del chat"}); i.style.cssText="height:44px;border-radius:12px;background:rgba(255,255,255,.04);color:#fff;border:1px solid rgba(255,255,255,.2);padding:10px";
    var b=el("button",null,"Guardar"); b.style.cssText="margin-top:8px;border:0;border-radius:10px;padding:10px;background:"+VERDE+";color:#fff";
    b.onclick=function(){K=i.value.trim(); try{localStorage.setItem("radar_ck",K);}catch(e){} cargar();};
    $("rcMsgs").appendChild(i); $("rcMsgs").appendChild(b);
  }
  var cargado=false;
  function cargar(){
    if(!K) return pedirClave();
    if(cargado) return;
    fetch(API+"/hilo?k="+encodeURIComponent(K)).then(function(r){ if(r.status===403) throw "clave"; return r.json(); }).then(function(d){
      cargado=true; $("rcMsgs").innerHTML="";
      if(!(d.hilo||[]).length) $("rcMsgs").appendChild(el("div",{"class":"rcHint"},"Preguntame lo que quieras de tus fondos. Si decid&iacute;s algo o tir&aacute;s una idea, la guardo en el playbook. Cambios del Retiro (aporte, objetivos, compras que hiciste) los aplico al toque; el resto lo dejo como pedido."));
      (d.hilo||[]).forEach(burbuja);
    }).catch(function(e){ if(e==="clave"){ K=null; try{localStorage.removeItem("radar_ck");}catch(x){} pedirClave(); } else $("rcMsgs").innerHTML='<div class="rcHint">No pude conectar con el servidor.</div>'; });
  }
  function playbook(){
    if(!K) return; $("rcPb").innerHTML='<div class="rcHint rcDots">Cargando el playbook</div>';
    fetch(API+"/playbook?k="+encodeURIComponent(K)).then(function(r){return r.text();}).then(function(t){$("rcPb").innerHTML=mdDoc(t);}).catch(function(){$("rcPb").innerHTML='<div class="rcHint">No pude cargarlo.</div>';});
  }
  function enviar(){
    var t=$("rcT").value.trim(); if(!t||ocup||!K) return;
    ocup=true; $("rcS").disabled=true; $("rcT").value="";
    var h=$("rcMsgs").querySelector(".rcHint"); if(h&&!cargado) h.remove(); else if(h&&$("rcMsgs").children.length===1) h.remove();
    burbuja({rol:"yo",texto:t});
    var w=el("div",{"class":"rcM ia rcDots"},"Pensando"); $("rcMsgs").appendChild(w); $("rcMsgs").scrollTop=1e9;
    fetch(API+"/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({k:K,texto:t})})
      .then(function(r){return r.json();}).then(function(d){ w.remove(); burbuja({rol:"ia",texto:d.respuesta||"(sin respuesta)",playbook:d.playbook,cambios:d.cambios,pedido:d.pedido}); })
      .catch(function(){ w.remove(); burbuja({rol:"ia",texto:"No pude conectar. Prob\u00e1 de nuevo."}); })
      .then(function(){ ocup=false; $("rcS").disabled=false; });
  }
  $("rcS").onclick=enviar;
  $("rcT").addEventListener("keydown",function(e){ if(e.key==="Enter"&&!e.shiftKey&&window.innerWidth>600){ e.preventDefault(); enviar(); } });
})();

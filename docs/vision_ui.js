/* vision_ui.js (10/10/2026) - Identidad "Portfolio Visión" sobre el Radar.
   - Cabecera con el ojo (brand/vision-eye.svg inline) y wordmark.
   - Dos vistas: Portfolio (plata real) / Laboratorio (simulaciones). No mueve el DOM:
     marca <body> con data-vista y oculta por CSS lo que no corresponde.
   - Splash "Apertura 01-02-03" al cargar (los niveles aparecen de afuera hacia adentro).
   Cargar ANTES de desplegables.js. Fuente de verdad del diseño: brand/BRANDING.md */
(function(){
  var EYE='<svg viewBox="0 0 64 64" aria-hidden="true"><path class="l1" d="M 2 32 A 37.5 37.5 0 0 1 62 32 A 37.5 37.5 0 0 1 2 32 Z" fill="#ECECDF"/><path class="l1" d="M 13.46 32 A 23.175 23.175 0 0 1 50.54 32 A 23.175 23.175 0 0 1 13.46 32 Z" fill="#0F1A14"/><path class="l2" d="M 20.542 32 A 14.322 14.322 0 0 1 43.458 32 A 14.322 14.322 0 0 1 20.542 32 Z" fill="#ECECDF"/><path class="l2" d="M 24.919 32 A 8.851 8.851 0 0 1 39.081 32 A 8.851 8.851 0 0 1 24.919 32 Z" fill="#0F1A14"/><circle class="l3" cx="32" cy="32" r="3.3" fill="#BFD78D"/></svg>';
  var KEY_AB="radar_abiertos4", KEY_V="pv_vista";
  // Laboratorio siempre "abierto" para desplegables.js; la vista decide qué se ve.
  try{ var ab=JSON.parse(localStorage.getItem(KEY_AB)||"{}")||{}; if(!ab.lab){ ab.lab=true; localStorage.setItem(KEY_AB,JSON.stringify(ab)); } }catch(e){}
  var vista="portfolio"; try{ vista=localStorage.getItem(KEY_V)||"portfolio"; }catch(e){}
  if(location.hash==="#lab") vista="lab"; if(location.hash==="#portfolio") vista="portfolio";

  var st=document.createElement("style");
  st.textContent=[
    'body{background-image:none!important;padding-top:0!important}',
    '#pvHead{position:sticky;top:0;z-index:50;margin:0 calc(-1*clamp(16px,4vw,40px)) 18px;padding:14px clamp(16px,4vw,40px) 12px;background:rgba(15,26,20,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--hair)}',
    '#pvHead .pvRow{display:flex;align-items:center;justify-content:space-between;gap:14px;max-width:1080px;margin:0 auto}',
    '#pvBrand{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink)}',
    '#pvBrand svg{width:44px;height:44px;flex:none}',
    '#pvBrand .pvEye{font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:500;line-height:1}',
    '#pvBrand .pvName{font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.05;margin-top:3px}',
    '#pvTabs{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--surface-2);border:1px solid var(--hair)}',
    '#pvTabs button{appearance:none;border:0;background:transparent;color:var(--muted);font:600 13px/1 "Space Grotesk",system-ui,sans-serif;padding:9px 14px;border-radius:999px;cursor:pointer;letter-spacing:.01em;display:flex;align-items:center;gap:7px}',
    '#pvTabs button .pvDot{width:7px;height:7px;border-radius:50%;background:transparent;border:1px solid var(--faint)}',
    '#pvTabs button.on{background:var(--ink);color:var(--soil)}',
    '#pvTabs button.on .pvDot{background:var(--jade);border-color:var(--jade)}',
    '@media(max-width:560px){#pvBrand .pvName{font-size:19px}#pvBrand svg{width:38px;height:38px}#pvTabs button{padding:9px 12px;font-size:12.5px}}',
    /* vistas */
    'body[data-vista="portfolio"] .bot-bar[data-g="lab"],body[data-vista="portfolio"] .bot-bar.sub,body[data-vista="portfolio"] [data-grupo="lab"]{display:none!important}',
    'body[data-vista="lab"] .bot-bar[data-g="total"],body[data-vista="lab"] .bot-bar[data-g="colchon"],body[data-vista="lab"] .bot-bar[data-g="retiro"],body[data-vista="lab"] .bot-bar[data-g="binance"],body[data-vista="lab"] [data-grupo="total"],body[data-vista="lab"] [data-grupo="colchon"],body[data-vista="lab"] [data-grupo="retiro"],body[data-vista="lab"] [data-grupo="binance"]{display:none!important}',
    'body[data-vista="lab"] .bot-bar[data-g="lab"]{margin-top:0!important;border-style:solid!important;background:var(--surface)!important;cursor:default;opacity:1!important}',
    'body[data-vista="lab"] .bot-bar[data-g="lab"]:before{display:none}',
    'body[data-vista="lab"] .bot-bar[data-g="lab"] .ch{display:none}',
    'body[data-vista="lab"] .bot-bar[data-g="lab"] .bt{color:var(--ink)!important}',
    /* ajustes de marca sobre desplegables */
    '.bot-bar[data-g="total"]{border-color:rgba(191,215,141,.55)!important;background:linear-gradient(135deg,rgba(191,215,141,.14),rgba(191,215,141,.03))!important}',
    '.bot-bar .bg .bp{background:rgba(191,215,141,.12)}',
    /* splash */
    '#pvSplash{position:fixed;inset:0;z-index:2147483100;background:#0F1A14;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;transition:opacity .35s ease}',
    '#pvSplash.off{opacity:0;pointer-events:none}',
    '#pvSplash svg{width:min(70vw,360px);height:auto}',
    '#pvSplash .l1,#pvSplash .l2,#pvSplash .l3{opacity:0;transform-origin:32px 32px;animation:pvIn .42s cubic-bezier(.2,.8,.2,1) forwards}',
    '#pvSplash .l2{animation-delay:.18s}#pvSplash .l3{animation-delay:.36s}',
    '@keyframes pvIn{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}',
    '#pvSplash .pvT{text-align:center;color:#ECECDF;font-family:"Space Grotesk",system-ui,sans-serif;opacity:0;animation:pvIn .4s .45s ease forwards}',
    '#pvSplash .pvT small{display:block;font-size:12px;letter-spacing:.22em;text-transform:uppercase;font-weight:400;color:#8FA094}',
    '#pvSplash .pvT b{display:block;font-size:40px;font-weight:700;letter-spacing:-.01em;margin-top:4px}',
    '@media(prefers-reduced-motion:reduce){#pvSplash .l1,#pvSplash .l2,#pvSplash .l3,#pvSplash .pvT{animation:none;opacity:1}}'
  ].join("");
  document.head.appendChild(st);

  // Splash (una vez por carga; corto)
  var sp=document.createElement("div"); sp.id="pvSplash";
  sp.innerHTML=EYE+'<div class="pvT"><small>Portfolio</small><b>Visión</b></div>';
  document.body.appendChild(sp);
  setTimeout(function(){ sp.classList.add("off"); setTimeout(function(){ if(sp.parentNode) sp.parentNode.removeChild(sp); },400); }, 1150);

  // Cabecera
  var h=document.createElement("div"); h.id="pvHead";
  h.innerHTML='<div class="pvRow"><a id="pvBrand" href="#portfolio">'+EYE+'<span><span class="pvEye">Portfolio</span><span class="pvName">Visión</span></span></a>'
   +'<div id="pvTabs" role="tablist"><button data-v="portfolio" role="tab"><span class="pvDot"></span>Portfolio</button><button data-v="lab" role="tab"><span class="pvDot"></span>Laboratorio</button></div></div>';
  document.body.insertBefore(h,document.body.firstChild);

  function setVista(v){
    vista=v; document.body.setAttribute("data-vista",v);
    try{ localStorage.setItem(KEY_V,v); }catch(e){}
    Array.prototype.forEach.call(h.querySelectorAll("#pvTabs button"),function(b){ b.classList.toggle("on",b.getAttribute("data-v")===v); b.setAttribute("aria-selected",b.getAttribute("data-v")===v); });
    if(v==="lab"){ try{ var ab=JSON.parse(localStorage.getItem(KEY_AB)||"{}")||{}; if(!ab.lab){ ab.lab=true; localStorage.setItem(KEY_AB,JSON.stringify(ab)); } }catch(e){} }
    window.scrollTo({top:0,behavior:"instant" in window?"instant":"auto"});
  }
  h.addEventListener("click",function(e){ var b=e.target.closest("button[data-v]"); if(b){ e.preventDefault(); setVista(b.getAttribute("data-v")); } var a=e.target.closest("#pvBrand"); if(a){ e.preventDefault(); setVista("portfolio"); } });
  window.addEventListener("hashchange",function(){ if(location.hash==="#lab") setVista("lab"); if(location.hash==="#portfolio") setVista("portfolio"); });
  setVista(vista);

  // En vista Laboratorio la barra "lab" de desplegables no debe cerrarse al tocarla
  document.addEventListener("click",function(e){ var b=e.target.closest('.bot-bar[data-g="lab"]'); if(b&&vista==="lab"){ e.stopPropagation(); e.preventDefault(); } },true);
})();

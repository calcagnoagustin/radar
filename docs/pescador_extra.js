/* Pescador — bloque del dashboard.
   Se auto-inyecta antes del footer y reusa las clases del index (card, hero,
   stat, gmetrics, row...). No toca nada de Semillas ni de Ganesha. */
(function () {
  "use strict";

  var FUENTE = "./pescador_data.json";
  var PX = {}, D = null, lastFetch = 0;

  function el(id) { return document.getElementById(id); }
  function n(v, d) { return (v === null || v === undefined || isNaN(v)) ? d : v; }
  function usd(v) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    var s = (v < 0 ? "-" : "") + "$" + Math.abs(v).toFixed(2);
    return s;
  }
  function pct(v) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return (v > 0 ? "+" : "") + v.toFixed(1) + "%";
  }
  function color(v) { return v > 0 ? "var(--ok,#16a34a)" : (v < 0 ? "var(--err,#dc2626)" : "inherit"); }
  function corto(s) { return String(s || "").replace("/USDT", ""); }
  function fmtPx(p) {
    if (!p && p !== 0) return "—";
    return p >= 1 ? p.toFixed(4) : p.toPrecision(4);
  }
  function hace(ts) {
    var m = Math.floor((Date.now() / 1000 - ts) / 60);
    if (m < 60) return "hace " + m + " min";
    var h = Math.floor(m / 60);
    if (h < 24) return "hace " + h + " h";
    return "hace " + Math.floor(h / 24) + " d";
  }

  // ---------------------------------------------------------------- markup
  var HTML = ''
    + '<hr class="gan-sep">'
    + '<div class="gan-head">'
    + '  <div class="brand">'
    + '    <h1>Radar - Pescador</h1>'
    + '    <div class="sub">Explosiones ultra confirmadas · entra tarde y a propósito · sale en horas</div>'
    + '  </div>'
    + '  <div style="display:flex;align-items:center;gap:14px">'
    + '    <span class="badge dry" id="pMode">—</span>'
    + '    <div class="pulse"><span class="dot"></span><span id="pFresh">—</span></div>'
    + '  </div>'
    + '</div>'
    + '<section class="hero">'
    + '  <div>'
    + '    <div class="eyebrow">Balance (USD) · Pescador</div>'
    + '    <div class="pnl-val mono" id="pBal">—</div>'
    + '    <div class="pnl-sub" id="pSub">cargando estado…</div>'
    + '  </div>'
    + '  <div class="hero-stats">'
    + '    <div class="stat"><div class="k">Ganancia / pérdida general</div><div class="v mono" id="pGen" style="font-size:1.4em">—</div></div>'
    + '    <div class="stat"><div class="k">P&amp;L no realizado</div><div class="v mono" id="pUnreal">—</div></div>'
    + '    <div class="stat"><div class="k">P&amp;L realizado</div><div class="v mono" id="pReal">—</div></div>'
    + '    <div class="stat"><div class="k">Operaciones</div><div class="v mono" id="pOps">—</div></div>'
    + '  </div>'
    + '</section>'
    + '<div class="cols">'
    + '  <div class="card">'
    + '    <div class="head"><span class="title">Posiciones abiertas</span><span class="eyebrow" id="pPosCount"></span></div>'
    + '    <div class="body" id="pPositions"><div class="row"><span class="lbl">Cargando…</span></div></div>'
    + '  </div>'
    + '  <div class="card">'
    + '    <div class="head"><span class="title">Desempeño</span><span class="eyebrow">acumulado</span></div>'
    + '    <div class="body">'
    + '      <div class="gmetrics">'
    + '        <div class="m"><div class="k">Trades</div><div class="v mono" id="pMTrades">—</div></div>'
    + '        <div class="m"><div class="k">Win rate</div><div class="v mono" id="pMWin">—</div></div>'
    + '        <div class="m"><div class="k">Profit factor</div><div class="v mono" id="pMPF">—</div></div>'
    + '      </div>'
    + '      <div class="row" style="margin-top:14px"><span class="lbl" id="pReglas">—</span></div>'
    + '      <div class="row"><span class="lbl" id="pNote">—</span></div>'
    + '    </div>'
    + '  </div>'
    + '</div>'
    + '<div class="card" style="margin-top:18px">'
    + '  <div class="head"><span class="title">Historial</span><span class="eyebrow" id="pHistCount"></span></div>'
    + '  <div class="body" id="pHistory"><div class="row"><span class="lbl">Cargando…</span></div></div>'
    + '</div>';

  function montar() {
    if (el("pBal")) return;
    var box = document.createElement("div");
    box.id = "pescadorBlock";
    box.innerHTML = HTML;
    var foot = document.querySelector("footer");
    if (foot && foot.parentNode) foot.parentNode.insertBefore(box, foot);
    else document.body.appendChild(box);
  }

  // ------------------------------------------------------------------ data
  function cargar() {
    return fetch(FUENTE + "?ts=" + Date.now())
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { D = j; return j; });
  }

  function precios() {
    if (!D || !D.open_positions || !D.open_positions.length) return Promise.resolve();
    var syms = D.open_positions.map(function (p) { return p.symbol.replace("/", ""); });
    var L = JSON.stringify(syms);
    var urls = ["https://api.binance.com/api/v3/ticker/24hr?symbols=",
                "https://data-api.binance.vision/api/v3/ticker/24hr?symbols="];
    var i = 0;
    function intento() {
      if (i >= urls.length) return Promise.resolve();
      return fetch(urls[i++] + encodeURIComponent(L))
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (arr) {
          arr.forEach(function (t) { PX[t.symbol] = +t.lastPrice; });
          lastFetch = Date.now();
        })
        .catch(intento);
    }
    return intento();
  }

  // --------------------------------------------------------------- render
  function pintar() {
    if (!D) return;
    var modo = el("pMode");
    modo.textContent = D.modo === "LIVE" ? "LIVE" : "PAPER";
    modo.className = "badge " + (D.modo === "LIVE" ? "live" : "dry");

    var abiertas = D.open_positions || [];
    var unreal = 0, hayPx = false;
    abiertas.forEach(function (p) {
      var px = PX[p.symbol.replace("/", "")];
      if (px) { unreal += p.qty * (px - p.entry); hayPx = true; }
    });

    var real = n(D.realized_pnl, 0);
    var eq = n(D.equity_now, 0);
    el("pBal").textContent = usd(eq + (hayPx ? unreal : 0));
    el("pSub").textContent = D.modo === "LIVE"
      ? "sub-cuenta aislada · capital real"
      : "papel · no toca plata real";

    var gen = real + (hayPx ? unreal : 0);
    var g = el("pGen"); g.textContent = usd(gen); g.style.color = color(gen);
    var u = el("pUnreal"); u.textContent = hayPx ? usd(unreal) : "—"; u.style.color = color(unreal);
    var r = el("pReal"); r.textContent = usd(real); r.style.color = color(real);
    el("pOps").textContent = n(D.trades_total, 0);

    // --- posiciones abiertas ---
    var cont = el("pPositions");
    el("pPosCount").textContent = abiertas.length ? abiertas.length + " abierta" + (abiertas.length > 1 ? "s" : "") : "";
    if (!abiertas.length) {
      cont.innerHTML = '<div class="row"><span class="lbl">Sin posiciones. Esperando una confirmación.</span></div>';
    } else {
      cont.innerHTML = abiertas.map(function (p) {
        var px = PX[p.symbol.replace("/", "")];
        var ret = px ? 100 * (px / p.entry - 1) : null;
        var restan = Math.max(0, 24 - n(p.horas, 0));
        return '<div class="row">'
          + '<span class="lbl"><b>' + corto(p.symbol) + '</b> '
          + '<span style="opacity:.6">entry ' + fmtPx(p.entry) + ' · vol ' + n(p.vol_ratio, "?") + 'x</span></span>'
          + '<span class="mono" style="color:' + (ret === null ? "inherit" : color(ret)) + '">'
          + (ret === null ? "—" : pct(ret))
          + '<span style="opacity:.55;font-size:.85em"> · TP ' + fmtPx(p.tp) + ' / SL ' + fmtPx(p.sl)
          + ' · ' + restan.toFixed(1) + 'h</span></span>'
          + '</div>';
      }).join("");
    }

    // --- desempeño ---
    el("pMTrades").textContent = n(D.trades_total, 0);
    el("pMWin").textContent = D.trades_total ? n(D.win_rate, 0) + "%" : "—";
    el("pMPF").textContent = D.trades_total ? n(D.profit_factor, 0) : "—";

    var R = D.reglas || {};
    el("pReglas").innerHTML = "Regla: entra con volumen &ge; $"
      + Math.round(n(R.min_qv_usd, 0) / 1e6) + "M y &ge; " + n(R.vol_ratio, "?")
      + "x su mediana. TP +" + n(R.tp_pct, "?") + "% · SL &minus;" + n(R.sl_pct, "?")
      + "% · salida forzada a las " + n(R.max_hold_h, "?") + "h · "
      + n(R.size_pct, "?") + "% del equity por entrada.";

    var t = n(D.trades_total, 0);
    el("pNote").textContent = t < 15
      ? "Muestra chica (" + t + "). Hacen falta 15-20 operaciones antes de sacar conclusiones."
      : "Muestra en construcción (" + t + " operaciones).";

    // --- historial ---
    var cerr = (D.recent_closed || []).slice().reverse();
    el("pHistCount").textContent = cerr.length ? cerr.length + " cerrada" + (cerr.length > 1 ? "s" : "") : "";
    var h = el("pHistory");
    if (!cerr.length) {
      h.innerHTML = '<div class="row"><span class="lbl">Todavía sin operaciones cerradas.</span></div>';
    } else {
      h.innerHTML = cerr.map(function (c) {
        var motivo = { tp: "objetivo", sl: "stop", tiempo_24h: "24h",
                       oco_o_manual: "cerrada en el exchange" }[c.motivo] || c.motivo;
        var reg = c.btc_sobre_ema200 === true ? "BTC alza"
                : (c.btc_sobre_ema200 === false ? "BTC baja" : "");
        return '<div class="row">'
          + '<span class="lbl"><b>' + corto(c.symbol) + '</b> '
          + '<span style="opacity:.6">' + motivo + ' · ' + n(c.horas, "?") + 'h'
          + (reg ? ' · ' + reg : '') + '</span></span>'
          + '<span class="mono" style="color:' + color(c.pnl) + '">'
          + usd(c.pnl) + '<span style="opacity:.55;font-size:.85em"> · ' + pct(c.ret_pct) + '</span></span>'
          + '</div>';
      }).join("");
    }

    if (D.generated_at) {
      var ts = Date.parse(D.generated_at) / 1000;
      el("pFresh").textContent = isNaN(ts) ? "—" : hace(ts);
    }
  }

  // ------------------------------------------------------------------ boot
  function ciclo() {
    return cargar().then(precios).then(pintar).catch(function () {
      var s = el("pSub");
      if (s) s.innerHTML = '<span class="err">pescador_data.json aún no disponible</span>';
    });
  }

  function iniciar() {
    montar();
    ciclo();
    setInterval(ciclo, 60000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();

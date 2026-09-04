/* fondo_auditor.js — panel "Auditoria del Fondo" (auditor loop, N5).
   Lee learning_data.json -> .fondo (lo publica loop_analista tras correr fondo/auditor.py).
   Muestra el Fondo Semillas contra sus controles: cartera congelada, BTC, 50/50 y SPY.
   El P&L solo no dice nada: lo que importa es si le gana a no hacer nada. */
(function () {
  var A = null, sig = "", tries = 0;

  function load() {
    return fetch("./learning_data.json?ts=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.fondo) A = j.fondo; })
      .catch(function () {});
  }
  function fU(n) {
    return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function sgn(n, d) { d = (d == null ? 2 : d); return (n >= 0 ? "+" : "") + n.toFixed(d); }
  function col(n) { return n >= 0 ? "var(--jade)" : "var(--clay)"; }

  function anchor() {
    return document.getElementById("fondoMov") || document.getElementById("fondoPos")
        || document.getElementById("fondoHero");
  }

  function ensureCard() {
    var ex = document.getElementById("fAuditBody");
    if (ex) return ex;
    var a = anchor(); if (!a || !a.parentNode) return null;
    var d = document.createElement("div");
    d.className = "card"; d.id = "fAuditCard"; d.style.marginBottom = "18px";
    d.innerHTML = '<div class="head"><span class="title">Auditor\u00eda del Fondo</span>'
      + '<span class="eyebrow" id="fAuditGen">&mdash;</span></div>'
      + '<div class="body" id="fAuditBody"></div>';
    if (a.nextSibling) a.parentNode.insertBefore(d, a.nextSibling);
    else a.parentNode.appendChild(d);
    return d.querySelector("#fAuditBody");
  }

  var ETIQ = {
    fondo: "Fondo Semillas",
    congelado: "Cartera congelada (no hacer nada)",
    btc_100: "100% BTC",
    btc_eth_5050: "50/50 BTC-ETH",
    spy_100: "100% SPY"
  };

  function tablaControles(comp, vs) {
    var ord = ["fondo", "congelado", "btc_100", "btc_eth_5050", "spy_100"];
    var h = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px">'
      + '<tr style="color:var(--faint);text-transform:uppercase;font-size:10px;letter-spacing:.05em">'
      + '<th style="text-align:left;padding:6px 8px 6px 0">Estrategia</th>'
      + '<th style="text-align:right;padding:6px 8px">Retorno</th>'
      + '<th style="text-align:right;padding:6px 8px">Max DD</th>'
      + '<th style="text-align:right;padding:6px 8px">Vol anual</th>'
      + '<th style="text-align:right;padding:6px 0 6px 8px">vs Fondo</th></tr>';
    ord.forEach(function (k) {
      var m = comp[k]; if (!m || m.ret_pct == null) return;
      var esF = (k === "fondo");
      var diff = esF ? null : (vs || {})[k];
      h += '<tr style="border-top:1px solid var(--hair);' + (esF ? 'background:rgba(111,191,142,.06)' : '') + '">'
        + '<td style="padding:7px 8px 7px 0;' + (esF ? 'font-weight:600' : 'color:var(--faint)') + '">' + ETIQ[k] + '</td>'
        + '<td class="mono" style="text-align:right;padding:7px 8px;color:' + col(m.ret_pct) + '">' + sgn(m.ret_pct) + '%</td>'
        + '<td class="mono" style="text-align:right;padding:7px 8px;color:var(--clay)">' + (m.max_dd_pct != null ? m.max_dd_pct.toFixed(2) + "%" : "\u2014") + '</td>'
        + '<td class="mono" style="text-align:right;padding:7px 8px;color:var(--faint)">' + (m.vol_anual_pct != null ? m.vol_anual_pct.toFixed(0) + "%" : "\u2014") + '</td>'
        + '<td class="mono" style="text-align:right;padding:7px 0 7px 8px;color:' + (diff == null ? "var(--faint)" : col(diff)) + '">'
        + (diff == null ? "\u2014" : sgn(diff) + " pp") + '</td></tr>';
    });
    return h + '</table></div>';
  }

  function bloques(b) {
    if (!b) return "";
    var ord = ["nucleo", "satelite", "caja"];
    var NOM = { nucleo: "N\u00facleo (BTC/ETH)", satelite: "Sat\u00e9lite (bStocks)", caja: "Caja (USDT)" };
    var h = '<div class="note" style="margin-top:16px;margin-bottom:8px;border-left-color:var(--sky)">Atribuci\u00f3n por bloque y desv\u00edo contra el dise\u00f1o 60/30/10</div>';
    ord.forEach(function (k) {
      var x = b[k]; if (!x) return;
      var dr = x.drift_pp;
      h += '<div class="row"><span class="lbl">' + NOM[k] + '</span>'
        + '<span class="mono" style="text-align:right">'
        + fU(x.val) + ' \u00b7 <span style="color:' + col(x.pnl) + '">' + sgn(x.pnl) + '</span>'
        + ' \u00b7 <span style="color:var(--faint)">' + (x.peso_pct != null ? x.peso_pct.toFixed(1) : "\u2014") + '% vs ' + x.objetivo_pct + '%</span>'
        + (dr != null ? ' <span style="color:' + (Math.abs(dr) >= 7 ? "var(--clay)" : "var(--faint)") + '">(' + sgn(dr, 1) + ' pp)</span>' : "")
        + '</span></div>';
    });
    return h;
  }

  function checks(cs) {
    if (!cs || !cs.length) return "";
    var C = { ok: "var(--jade)", info: "var(--sky)", aviso: "var(--grain)", alerta: "var(--clay)" };
    return '<div style="margin-top:14px;display:flex;flex-direction:column;gap:6px">'
      + cs.map(function (c) {
        var col2 = C[c.nivel] || "var(--faint)";
        return '<div style="display:flex;gap:8px;align-items:flex-start;font-size:12.5px">'
          + '<span style="color:' + col2 + ';font-weight:700">\u2022</span>'
          + '<span style="color:var(--ink)">' + c.txt + '</span></div>';
      }).join("") + '</div>';
  }

  function rotacion(r) {
    if (!r) return "";
    var t = (r.ult_top || []).join(", ");
    var mov = "";
    if ((r.entraron || []).length || (r.salieron || []).length) {
      mov = ' \u00b7 entraron: ' + ((r.entraron || []).join(", ") || "\u2014")
          + ' \u00b7 salieron: ' + ((r.salieron || []).join(", ") || "\u2014");
    } else if (r.corridas >= 2) {
      mov = ' \u00b7 sin cambios en la \u00faltima rotaci\u00f3n';
    }
    return '<div class="row"><span class="lbl">Rotaci\u00f3n mensual</span>'
      + '<span class="mono" style="text-align:right;max-width:70%">' + (r.corridas || 0) + ' corridas \u00b7 top-5: '
      + (t || "\u2014") + mov + '</span></div>';
  }

  function render() {
    if (!A) { if (tries++ < 40) return; return; }
    var b = ensureCard(); if (!b) return;
    if (sig === A.generated && b.dataset.ok) return;
    sig = A.generated;

    var esSinEv = (A.estado === "sin_evidencia");
    var badge = '<span class="badge" style="background:' + (esSinEv ? "rgba(224,122,95,.13)" : "rgba(111,191,142,.13)")
      + ';color:' + (esSinEv ? "var(--clay)" : "var(--jade)") + '">'
      + (esSinEv ? "muestra insuficiente" : "muestra medible") + '</span>';

    var g = document.getElementById("fAuditGen");
    if (g) g.textContent = A.dias + " d\u00edas \u00b7 " + A.desde + " \u2192 " + A.hasta;

    b.innerHTML =
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' + badge
      + '<span class="mono" style="font-size:13px">' + fU(A.equity) + ' \u00b7 <span style="color:' + col(A.pnl) + '">'
      + sgn(A.pnl) + ' (' + sgn(A.pnl_pct) + '%)</span> sobre ' + fU(A.aportado) + ' aportados</span></div>'
      + '<div class="note" style="margin-top:0;margin-bottom:10px">' + A.veredicto + '</div>'
      + tablaControles(A.comparativa || {}, A.vs_controles_pp || {})
      + bloques(A.bloques)
      + rotacion(A.rotacion)
      + checks(A.checks)
      + '<div class="note" style="margin-top:12px;color:var(--faint)">' + (A.nota || "")
      + ' \u00b7 auditado ' + (A.generated || "").replace("T", " ") + ' UTC.</div>';
    b.dataset.ok = "1";
  }

  load().then(function () { setTimeout(render, 1500); });
  setInterval(function () { load().then(render); }, 30000);
  setInterval(render, 2500);
})();

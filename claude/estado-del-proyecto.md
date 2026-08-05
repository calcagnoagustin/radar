# BOT-CRIPTO — Estado del proyecto
_Última actualización: 2026-08-04 (sesión REDISEÑO BRAIN/JARDINERO — auditoría conceptual + spec, sin tocar VM) — sesión previa: `claude/resumen-sesion-23-24-07.md`_

## Qué es
Sistema de bots de trading cripto en Binance Spot con plata real (sub-cuentas Semillas / Ganesha), en una VM de Oracle (`semillas-bot`, E2.1.Micro 1GB, IP 163.176.185.60, usuario `opc`, código en `/home/opc/bot_semillas`). Dashboard: cripto.semillaredes.com (GitHub Pages del repo `radar`). Email diario vía Resend.

## ★★ SESIÓN 4/08 — REDISEÑO CONCEPTUAL BRAIN + JARDINERO (spec, NO deployado)
_Auditoría conversacional. NO se tocó la VM (SSH queda para otra sesión). Todo lo de abajo es DISEÑO a implementar cuando entremos a la VM._

### Hallazgo que gatilló todo
Ganesha y el Brain NO están conectados hoy. Ganesha entra por `mover_symbols()` (escáner ciego de volumen de todo Binance), sin pasar por el filtro del Brain. Reconstruido: ~100% de los trades de Ganesha son movers, ~0 semillas. **Todo el edge vino del radar ciego, no del Brain.** BANK (+$40.11, el mejor trade) fue un mover cerrado por venta manual de Agus; sin BANK el sistema realiza ≈ −$37. Conclusión: no forzar todo por un filtro único → **dos motores en paralelo**.

### GANESHA — queda como está, sólo movers
- Ganesha mira SÓLO movers (radar de volumen). Es fuerza pura, rápido y sucio; su edge es la VELOCIDAD, no la calidad. Se come algún pump&dump, el stop lo saca, y un BANK cada tanto paga la fiesta.
- **A1 (grabar origen semilla/mover) CANCELADO**: dentro de Ganesha todo es mover por definición, no hay nada que separar. (El patch quedó escrito y verificado por si algún día se necesita: ejecutor md5 `6869f6a5…`, backfill probado — pero NO se deployó y NO se necesita.)
- El Brain NO es portero de Ganesha. A lo sumo, SESGO de tamaño: si un mover cae en narrativa caliente del Brain, más tamaño; nunca veto.

### BRAIN — dos antenas ("Y no O") + aduana semanal + lazo de aprendizaje
1. **Antena de FUERZA** (ya existe): Weinstein Stage 2 / momentum.
2. **Antena de VALOR** (NUEVA, a construir): watchlist curada de proyectos tier-1. Un candidato entra por **(a) tier-1 barato que giró desde el piso** O **(b) tier-1 ya en tendencia que rompe** — los dos exigen confirmación (calidad **Y** confirmado).
3. **Aduana semanal**: el Brain SÓLO admite a la watchlist lo que YA dio vuelta en semanal. Es filtro de ENTRADA (curación), no etiqueta de salida. Lo que entra a la lista ya está bendecido; el Jardinero no re-chequea.
4. **Lazo Ganesha→Brain (abajo→arriba, B1)**: el Brain LEE los movers que Ganesha ganó cada mes y busca patrón/narrativa/primos que todavía no explotaron → de ahí nacen semillas o entradas a la watchlist. Ganesha son "los ojos en el barro" del Brain. (Sólo requiere el registro de cerrados con símbolo+P&L, que ya está en events.jsonl.)
5. **Régimen macro**: BTC vs EMA-200 como LECTOR de clima risk-on/off (palanca = monto). NO es regla por-moneda. La vieja Donchian+EMA200 sigue DESCARTADA.
6. **Tier 1 = filtro de SUPERVIVENCIA, no de tamaño**: proyecto vivo (uso/narrativa real, equipo, liquidez) que sobrevive el próximo invierno, todavía chico/mediano para upside x5/x10. Ni ETH (sin edge) ni iota (fundido). **La lista tier-1 la firma Agus**; Claude propone candidatos y los mide.

### JARDINERO — un solo reloj (el diario), su único trabajo es COMPRAR BIEN
- El Jardinero NO mira el semanal (eso es del Brain, que le entrega la watchlist ya curada). El Jardinero usa el **diario** sólo para el GATILLO fino: entra en pullback a EMA diaria en subida con vela de reclaim, nunca agarra el cuchillo.
- Único trabajo: **comprar bien**. El hold lo resuelve la tesis (moonbag universal, meses/años). Todo el skill está en no comprar el cuchillo y entrar en confirmación.
- Planta lo que la watchlist le asigna + refuerza DCA (con confirmación, veto Weinstein).
- Cada semilla confirmada sostenida = ladrillo del **fondo cripto** de largo plazo (horizontes hasta 2/5 años).

### BACKTEST de la confirmación (arquetipo a) — armado, NO corrido
- `bt_confirmacion.py`: event study. Mide retorno forward (30/90/180/365/730d) tras cada confirmación semanal vs baseline "cuchillo" (comprar debajo de la media sin confirmar). 4 variantes de media (30w/40w × SMA/EMA) compiten. Lógica validada con sintéticos; **espera desbloqueo de Binance para bajar velas**.
- Cubre arquetipo (a) reversión. **Arquetipo (b) breakout/continuación = señal distinta, backtest aparte, pendiente.**

### BLOQUEO / ACCIÓN DE AGUS (allowlist de red — NO la puede tocar Claude)
Agregar a la allowlist de red del entorno de Claude:
- `api.binance.com` + `data-api.binance.vision` → desbloquea el backtest (HTTPS, corre acá mismo, sin VM).
- `163.176.185.60` (IP VM) → intento de SSH directo para trabajo nocturno sin cortes; NO garantizado (el proxy es HTTP/HTTPS; SSH puede no tunelar). Plan B si falla: mini-canal HTTPS en la VM.

### DIFERIDO / FUTURO
- **B4 — Auditor General / CEO conversacional** (hablar por voz/texto, exporta doc para cruzar con ChatGPT+Grok): idea a futuro, NO ahora. Nunca decide, es espejo de Agus.
- **C1 — migración A1** (VM deja de morir por OOM) + allowlist VM: PRÓXIMA sesión. PAYG posiblemente necesario (acción de billing de Agus). Cambiar de proveedor NO arregla los cortes de Claude (eso es la red del sandbox, no el hosting).
- **Depósitos**: captura OK, falta VISUALIZACIÓN en el dashboard (pendiente chico).

### PRIMER PASO PRÓXIMA SESIÓN
Agus agrega hosts → Claude corre `bt_confirmacion.py` → tabla confirmado vs cuchillo → elegir media → recién ahí definir parámetros de la antena de valor.

---

## ★ SESIÓN 1/08 — STATUS POST-BRAIN (verificado: dashboard, repo, Gmail, consola Oracle, Binance API)
- **Brain corrió el 1/08 ✅** (ciclo 21:15 ART del 31/07 = 00:17Z). Plan 2026-08: **PYTH reforzar $23** (solo con Stage 2 + cierre en máximos) y **ZEC mantener** sin agregar (extendido, Stage 3). Macro del Brain: régimen **neutral**, BTC consolida $60-85k, estacionalidad agosto negativa, rotaciones selectivas (RWA/privacidad), no risk-on general.
- **⚠ CONFLICTO DETECTADO**: el mismo 1/08 el ejecutor hizo `DCA_SKIP` en PYTH por "tope 20% por moneda alcanzado" (PYTH ya tiene $22 sobre ~$106 de Semillas). La orden de refuerzo del Brain queda bloqueada por la regla de riesgo todo agosto salvo que Agus suba el tope. **Decisión Agus 1/08: no tocar por ahora** (el skip es la regla protegiendo en mercado neutral-bajista).
- **📌 DATO A RETENER — `grid_atr_drift` (pedido explícito de Agus)**: el Auditor Loop simula cada noche 9 combos (atr 2.0/2.5/3.0 × vol 1.3/1.5/2.0) sobre velas reales. El combo VIVO (atr 2.5/vol 1.5) lleva **12 corridas seguidas fuera del top-3**; líder consistente: **2.0/1.5** (r_promedio +0.21 vs −0.46 del 2.5/1.3; n=4 por combo). El backtest del 24/07 apuntaba a lo mismo → **dos fuentes de evidencia coinciden en bajar atr_mult a 2.0**. Decisión Agus 1/08: **no cambiar nada todavía**; cuando haya tiempo, validar con backtest_tp antes de decidir. El Auditor sigue acumulando esta evidencia solo (learning_data.json, `propuestas[].evidencia.runs_live_fuera_top3`), así que el contador sigue creciendo sin intervención.
- **T cerró por stop el 30/07** (Stage 4, −$3.48, sin moonbag porque $6.54 < piso $10). El pendiente "Brain revisa T el 1/08" quedó resuelto solo. Semillas queda: PYTH + ZEC + cash.
- **VM A1: sigue sin existir** (verificado en consola Oracle: solo `semillas-bot` Running). Última evidencia del launcher: 29/07 19:44Z, intento ~405, siempre `HTTP 500 Out of host capacity`. Ya pasó el umbral de 3-4 días → **pendiente charlar PAYG con Agus**. Liveness actual del launcher NO verificada (diag viejo; encolar task de tail cuando se retome). Banner Oracle: límites Always Free A1 ahora 2 OCPU/12GB (el plan de escalar sigue válido).
- **Mercado 1/08**: BTC $62.354, bajo SMA20 (~$64.4k) y SMA50 (~$63.4k), −3.1% 7d; ETH $1.828. Rango 60d $58.6k-$66.6k. Neutral-bajista. Riesgo asumido: si BTC pierde $58.6k, las 12 posiciones de Ganesha probablemente salgan por stop en cadena.

## 🟢 MIGRACIÓN A1 — LOOP AUTÓNOMO (estado al 1/08: sin capacidad aún)
**La VM vieja intenta crear `semillas-bot-a1` por API de OCI cada 5 minutos, sola.** Setup completo 28/07 ~02:38Z: keypair API OCI en la VM (`~/.oci/oci_api_key.pem`, fingerprint b8:dc:98:...:9e:6a, registrada en el perfil de Agus), `~/.oci/config` (user/tenancy OCIDs, sa-saopaulo-1), SDK oci 2.182.1, `a1_launcher.py` nohup (pid 908648), log `~/bot_semillas/a1_retry.log`. Encontró solo AD/VCN/subnet/imagen (Oracle-Linux-9.8-aarch64). Todos los intentos: `HTTP 500 Out of host capacity` (~288 intentos/día; ~405 al 29/07).
- **Specs**: semillas-bot-a1, A1.Flex 1 OCPU/6GB (subir a 2/12 después con reboot), IP pública, ssh key = `~/.ssh/id_migracion.pub`.
- **Al crear**: reporta a `docs/_diag.json` (task `a1_created`, con IP) + MAIL a Agus "[Migracion] VM A1 CREADA".
- **Siguiente paso cuando exista** (Claude, vía canal task): bootstrap desde VM vieja — ssh a IP nueva → venv ARM + deps → rsync código+estado+.env+keys → dry-run → migrar crontab → probar API Binance desde IP nueva (whitelist=Agus) → VM vieja de backup.
- Si el launcher muriera (reboot): task `nohup venv/bin/python a1_launcher.py >> a1_retry.log &`. **Umbral 3-4 días sin capacidad: CUMPLIDO → charlar PAYG.**
- Nota memoria: el launcher+SDK suman RSS en una VM de 498MB; tras el arranque quedó estable. Vigilar el ciclo 21:15.

## ★ ORGANIGRAMA CANÓNICO — 4 ROLES ACTIVOS + 1 PROYECTADO
1. **BRAIN** — estratega mensual (garden_plan). Último: 1/08. Próximo: 1/09.
2. **JARDINERO** — swing paciente (Semillas, garden.py).
3. **GANESHA** — intradía 15m, 6x/día :07 (01/05/09/13/17/21 ART).
4. **AUDITOR LOOP** — no opera; consolida y propone con evidencia (n≥15). Ciclo 21:15 ART.
5. **PESCADOR** *(proyectado; nace en paper)*.

## ★ CÓMO OPERA GANESHA (mecánica del TP)
R y ATR, sin TP fijo en %: entrada = cierre 15m sobre máximo 24h + **volumen > vol_mult(1.5)×SMA20**; stop = entrada − **atr_mult(2.5)**×ATR(14) 4h; riesgo 2%/trade; TP1 a +2R vende 30% y stop a breakeven; resto trailing atr_mult×ATR(4h) solo-sube con stop nativo. "Stop en ganancia" = trailing cierra sobre la entrada (BANK 2×, KAITO 28/07 +$4.02).
- **atr_mult** = cuántos ATR de aire tiene el trade (más chico = stop apretado, salidas rápidas; más grande = aguanta más ruido, pierde más cuando falla). **vol_mult** = cuán exigente es el filtro de volumen de la entrada (más alto = menos señales pero más "reales").
- **grid_atr_drift** = alerta del Auditor: simula la estrategia con 9 combos (atr 2.0/2.5/3.0 × vol 1.3/1.5/2.0) sobre velas reales recientes y rankea; si el combo VIVO (2.5/1.5) queda fuera del top-3 muchas corridas seguidas (≥7), avisa. **Al 1/08: 12 corridas fuera del top-3; líder 2.0/1.5. Decisión: no tocar aún; validar con backtest_tp primero.**
- **Regla PF<0.7 con n≥15**: profit factor = ganancia bruta ÷ pérdida bruta. Con al menos 15 cierres, si el PF rodante de los últimos 20 cae bajo 0.7, el Auditor PROPONE volver Ganesha a PAPER. Al 1/08: PF 1.05 consolidado (n=24) / 1.05 crudo (31 trades) → lejos del fusible.

## ★ VOCABULARIO
- "Veda de cambios" = acuerdo humano, no parámetro. / "Freeze 60d" = semillas nuevas no se venden 60 días. / DCA del Jardinero = refuerzo EN FUERZA (veto Weinstein). / "Checklist" del Brain ≠ fuente de Ganesha (pendiente backtest).

## ★ RECETAS (re-validadas 27-28/07 con 9 tasks + 1 deploy de docs/)
- **Canal _task.py**: cron VM cada 2 min; edición vía Chrome github.com/.../edit/main/docs/<archivo>: B64→`.cm-content`+execCommand→commit por DOM (modal `[role="dialog"]`); verificar byte a byte (git fetch+cmp). **Payloads grandes: partir el ARCHIVO en chunks exactos en bash (¡nunca truncar a mano!) e insertar secuencialmente** (chunks siguientes con caret al final: `sel.selectAllChildren(cm);sel.collapseToEnd()`; probado con 4 chunks × ~3.7KB).
- **Consola Oracle vía Chrome**: IFRAME mismo-origen; scroll `.jet_form_wrapper_scroll`; OJ radios con `.click()`; textos con click+type reales; JS >40s → timeout. Si el sessionPicker dice "sesión activa" basta un click; si pide contraseña, SOLO Agus. (1/08: /compute/instances carga lento; wait 6s + screenshot funciona.)
- **Lectura remota sin ssh**: raw.githubusercontent.com/calcagnoagustin/radar/main/docs/*.json vía fetch en JS desde el dashboard (dashboard_data, learning_data, ganesha_data, _diag). Precios en vivo: api.binance.com público desde el mismo tab.
- **Auditoría de balances**: venv python, Exchange (Semillas) + ccxt(keys.json) (Ganesha); Convert no deja rastro en fetch_my_trades.
- Crontab VM: `15 0 * * *` main.py; `7 0,4,8,12,16,20 * * *` ganesha_ejecutor.py; `*/2 * * * *` agent.py. SSH/Binance desde sandbox: bloqueados; GitHub OK.
- `_task.py` actual = `a1_tail3` (ya consumida; diag viejo del 29/07). Backups VM: `state.json.bak.pre_atm_fix`, `.pre_dust_fix`. Llaves VM: `~/.ssh/id_migracion`, `~/.oci/oci_api_key.pem`. Procesos extra: `a1_launcher.py`.

## ★ REGLA MANUAL DE AGUS (intacta)
+100% → vender 30% una vez. <+100% no vender. Cancelar stop → vender → reconcilia (auto SOLO Ganesha; en Semillas vía task).

## PENDIENTES (próximo chat)
0. **PAYG para A1**: umbral 3-4 días sin capacidad CUMPLIDO → decidir con Agus (upgrade es acción de Agus, involucra billing). / 0b. Encolar task tail para verificar que `a1_launcher.py` siga vivo (última prueba 29/07).
1. Destino de los ~$5.44 de ATM → ledger. / 2. Swap 2GB (¿OK?). / 3. Healthcheck ciclo diario (alerta si no hay commit a las 00:40Z).
4. Dashboard: "última actualización" por panel + valuar con qty API. / Mails de decisión más visibles.
5. **Conflicto PYTH**: Brain ordena DCA $23 pero tope 20%/moneda lo bloquea (DCA_SKIP 1/08). Decisión vigente: no subir el tope; revisar si cambia el mercado. / 6. **grid_atr_drift → atr 2.0**: correr backtest_tp con atr 2.0 cuando Agus tenga tiempo; recién ahí decidir. / 7. Backtest shortlist 3ª fuente Ganesha. / 8. PESCADOR. / 9. Análisis rojo Semillas, feeds Brain, captura depósitos, espejo bots/src. / 10. Playbook loop ~21:40 ART.

## Estado financiero (1/08 ~14:00 ART; precios en vivo Binance + datos repo)
- **TOTAL ≈ $290** = Semillas ~$106 + Ganesha ~$184. Depósitos $326 → **−11%** (28/07 era $311; la semana bajista costó ~$21).
- **Ganesha (LIVE)**: 12 abiertas (~$179 invertidos, casi sin free) con stops nativos; 9 en rojo (SXT −27%, SKL −21%, QI −17%, EUL −16%, HEMI −12%, XEC −13%, PEOPLE −4%, ONDO −6%, BOME −5%), 3 en verde (DGB +30%, COTI +11%, PROM +3%). Realizado **+$2.85** (bajó de +$10.66; semana: ZAMA +4.42, KAITO +4.02, ACE −4.09, ERA −4.16, COTI −3.33, LA −3.18). WR 42% crudo / 29% consolidado. PF 1.05.
- **Semillas**: PYTH ~$18.5 (−16%), ZEC ~$19.8 (−15%) + free **$67.63** (64% en cash, defensivo); realizado ≈ −$13.57.
- Auditor consolidado: n=24 Ganesha (27 todo), PF 1.05, expectancy +$0.12/trade, maxDD −$19.95.
- Baseline depósitos: Semillas $132 / Ganesha $194 = $326.

## Regla para futuras sesiones
Guardar acá todo avance o decisión al final de cada sesión, incluyendo el VOCABULARIO de Agus. Las sesiones no comparten memoria: sin este doc, cada chat arranca ciego. Arrancar SIEMPRE leyendo este doc + el resumen de la última sesión.

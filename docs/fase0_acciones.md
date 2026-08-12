# FASE 0 — Confirmacion del Jardinero sobre ACCIONES

**Fecha:** 2026-08-12 · **Universo:** Dow-30 actual (30/30 usables) · **Benchmark:** SPY
**Fuente:** Yahoo Finance, adjusted close (gratis, sin key) · **Costo:** $0
**Historia:** varios simbolos desde 1970; SPY desde 1993
**Entrada:** primer cierre diario posterior al fin de la semana de confirmacion

## Veredicto

**La confirmacion semanal NO tiene edge sobre el Dow-30.** No le gana a comprar
el mismo activo en una semana cualquiera, en ninguna de las 4 variantes de media
ni en ninguno de los 5 horizontes. Sin costos de transaccion. Con costos, peor.

Le gana al indice — pero eso es efecto del ACTIVO, no de la senal: comprar
cualquier semana tambien le gana al indice. Las 30 del Dow batieron al SPY solas.

## Tabla (mediana de retorno forward, %)

### SMA30w — 2076 eventos

| horizonte | CONFIRMADO | CUCHILLO | CUALQUIER SEMANA | INDICE |
|---|---|---|---|---|
| 30d | n=2071 · +1.2 | n=24519 · +1.6 | n=72748 · +1.3 | n=2071 · +0.0 |
| 90d | n=2067 · +4.0 | n=24416 · +4.6 | n=72478 · +3.9 | n=2067 · +0.0 |
| 180d | n=2062 · +6.6 | n=24235 · +7.9 | n=72088 · +7.4 | n=2062 · +0.0 |
| 365d | n=2041 · +12.9 | n=24025 · +14.0 | n=71308 · +14.7 | n=2041 · +3.9 |
| 730d | n=1993 · +25.4 | n=23480 · +29.7 | n=69748 · +28.9 | n=1993 · +7.3 |

### EMA30w — 2389 eventos

| horizonte | CONFIRMADO | CUCHILLO | CUALQUIER SEMANA | INDICE |
|---|---|---|---|---|
| 30d | n=2380 · +1.2 | n=23150 · +1.6 | n=72748 · +1.3 | n=2380 · +0.0 |
| 90d | n=2373 · +3.5 | n=23054 · +4.6 | n=72478 · +3.9 | n=2373 · +0.0 |
| 180d | n=2367 · +6.2 | n=22880 · +7.9 | n=72088 · +7.4 | n=2367 · +0.1 |
| 365d | n=2340 · +12.5 | n=22660 · +14.5 | n=71308 · +14.7 | n=2340 · +3.9 |
| 730d | n=2284 · +27.3 | n=22173 · +30.4 | n=69748 · +28.9 | n=2284 · +8.9 |

### SMA40w — 1797 eventos

| horizonte | CONFIRMADO | CUCHILLO | CUALQUIER SEMANA | INDICE |
|---|---|---|---|---|
| 30d | n=1793 · +1.4 | n=22888 · +1.5 | n=72748 · +1.3 | n=1793 · +0.0 |
| 90d | n=1786 · +3.9 | n=22796 · +4.5 | n=72478 · +3.9 | n=1786 · +0.0 |
| 180d | n=1779 · +6.5 | n=22629 · +7.5 | n=72088 · +7.4 | n=1779 · +0.0 |
| 365d | n=1761 · +12.3 | n=22430 · +14.1 | n=71308 · +14.7 | n=1761 · +3.6 |
| 730d | n=1720 · +26.6 | n=21945 · +30.1 | n=69748 · +28.9 | n=1720 · +8.2 |

### EMA40w — 2031 eventos

| horizonte | CONFIRMADO | CUCHILLO | CUALQUIER SEMANA | INDICE |
|---|---|---|---|---|
| 30d | n=2024 · +1.5 | n=21701 · +1.6 | n=72748 · +1.3 | n=2024 · +0.0 |
| 90d | n=2018 · +3.7 | n=21614 · +4.6 | n=72478 · +3.9 | n=2018 · +0.0 |
| 180d | n=2013 · +6.3 | n=21448 · +7.9 | n=72088 · +7.4 | n=2013 · +0.0 |
| 365d | n=1992 · +12.4 | n=21239 · +14.7 | n=71308 · +14.7 | n=1992 · +3.7 |
| 730d | n=1946 · +27.0 | n=20789 · +30.5 | n=69748 · +28.9 | n=1946 · +8.4 |

## Lo que este numero SI dice

1. El motor funciona y es reutilizable. Fase 0 cumplida.
2. Sobre megacaps, la senal de entrada de Weinstein no separa nada. n masivo
   (~2.000 eventos, ~72.000 semanas de control), no es ruido de muestra chica.
3. El resultado de cripto (+18% a 1 mes) queda bajo sospecha por dos motivos:
   el sesgo de look-ahead que se detecto al portar el motor, y que aca, con
   entrada limpia, el efecto desaparece.

## Lo que este numero NO dice

1. **Universo inadecuado para el metodo.** Weinstein busca la transicion Stage
   1 -> 2. El Dow-30 vive en Stage 2 estructural. Es el peor universo posible
   para lucirse. Small/mid caps es donde el metodo deberia mostrarse.
2. **Mide solo la ENTRADA.** Weinstein es entrada + stop + salida en Stage 4.
   Este event study es buy-and-hold sin gestion. El metodo completo no fue medido.
3. **Mide retorno, no riesgo.** Weinstein reclama menor drawdown, no mayor
   retorno. Falta medir drawdown y retorno ajustado por riesgo.
4. **Sesgo de supervivencia jugando EN CONTRA.** En el Dow-30 actual, comprar
   cualquier caida siempre funciono. Eso pone la vara artificialmente alta.
   Si en Fase 1 con delistadas la senal aparece, sera creible.

## Bug encontrado en el motor de cripto

`bt_confirmacion.py` dispara el evento con el CIERRE semanal pero toma el precio
de entrada en la APERTURA de esa misma semana. Como la semana que cruza la media
suele ser una semana fuerte, eso regala retorno gratis e infla el edge medido.
El resultado de cripto (+18% a 30d vs -5.6%) esta contaminado por esto.
**Pendiente: re-correr el de cripto con la entrada corregida.**

## Siguiente

- Re-correr cripto sin look-ahead (costo $0, decide si el hallazgo viejo sobrevive)
- Fase 1 ($9/mes Sharadar): universo amplio con delistadas + bakeoff de 5 metodos
- Medir drawdown, no solo retorno
- PAYG Oracle (accion de Agus) — condicion previa a IB Gateway

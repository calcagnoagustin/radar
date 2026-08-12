# CRIPTO — re-corrida con el motor corregido (sin look-ahead)

**Fecha:** 2026-08-12 · **Canasta:** 35 alts · **Benchmark:** BTCUSDT · **Costo:** $0

## Veredicto: el hallazgo viejo no sobrevive

El resultado de agosto (SMA-40w, +18% de mediana a 30 dias vs -5.6% del cuchillo)
estaba inflado por un sesgo de look-ahead: el motor disparaba el evento con el
CIERRE de la semana pero entraba a la APERTURA de esa MISMA semana — hasta 7 dias
de ventaja, justo en la semana que cruza la media, que por construccion es fuerte.

Con la entrada corregida (primer cierre POSTERIOR al fin de la semana), esa misma
variante SMA-40w a 30 dias pasa de **+18% a +1.9%**. El resto de las variantes da
mediana NEGATIVA a 30 dias.

## Y hay algo peor: BTC le gana en 20 de 20

En las 4 variantes de media x 5 horizontes, comprar BTC en la fecha de la senal
rinde MAS que comprar la altcoin confirmada. Sin excepcion.

| SMA30w | CONFIRMADO | CUALQUIER SEMANA | BTC misma fecha |
|---|---|---|---|
| 30d | -4.9% (n=159) | -3.8% (n=10200) | +0.9% (n=159) |
| 90d | -6.2% (n=158) | -11.8% (n=9885) | +19.5% (n=158) |
| 180d | -28.2% (n=157) | -18.0% (n=9430) | +17.5% (n=157) |
| 365d | -29.7% (n=142) | -27.8% (n=8520) | +15.4% (n=142) |
| 730d | -59.0% (n=108) | -33.7% (n=6700) | +99.8% (n=108) |

A 730 dias: la altcoin confirmada da mediana **-59.0%**; BTC comprado el mismo dia,
**+99.8%**. La senal no solo no agrega — selecciona peor que no elegir.

## Matiz honesto: es una distribucion de cola

A 365d el confirmado tiene mediana -29.7% pero MEDIA +137.7%. O sea: la mayoria
de las veces perdes y unos pocos ganadores gigantes levantan el promedio. Eso es
compatible con una logica de moonbag que aguanta la cola.

Pero el control lo mata igual: comprar en CUALQUIER semana tiene media +193.0%,
mas alta todavia. Ni en la cola la senal agrega valor.

## Caveats

- n de eventos chico (125-197) y muy solapado en el tiempo: los ciclos de cripto
  hacen que las confirmaciones se amontonen. El n efectivo es mucho menor.
- Sesgo de supervivencia: la canasta son las alts que zafaron.
- Mide solo la ENTRADA, no el sistema completo con stop y gestion.

## Consecuencia

Las dos corridas (acciones y cripto) dicen lo mismo con motores identicos: la
confirmacion semanal como SENAL DE SELECCION no tiene edge medible. En cripto,
ademas, pierde contra simplemente tener BTC.

Esto NO tumba a Ganesha (su edge viene del radar de movers, otra cosa). Tumba la
premisa que justificaba los 4 cambios pendientes de Brain/Jardinero.

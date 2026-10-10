# Portfolio Visión — Branding v1 (cerrado 10/10/2026)

App personal de Agus (no comercial). Dashboard en https://cripto.semillaredes.com (repo `radar`, GitHub Pages, `docs/`).
Diseño: ChatGPT genera, Claude audita y publica. Esta carpeta es la **fuente de verdad** del branding: cualquier cambio visual sale de acá.

## Concepto
El tercer ojo: ver con claridad para decidir. Criterio, no predicción. Nombre: **Portfolio Visión** ("Portfolio" descriptor chico, "Visión" protagonista).

## Símbolo: "Doble iris" (lámina 03, elegido 10/10/2026 — reemplaza a "Apertura")
- Párpado = vésica (dos arcos de círculo iguales que se cruzan), proporción ~1,18:1 (ancho 60, alto 51 en viewBox 64; arcos r = 30,4).
- Adentro, un iris de anillos concéntricos centrados: círculo fondo r 15 → anillo marfil r 11,4 → anillo fondo r 8,6 → pupila lima r 6,1. Simetría vertical y horizontal perfectas. Flat, sin brillos ni texturas.
- Versión simple (16/32 px): párpado + círculo fondo r 15 + pupila lima r 7,5.
- Archivos: `vision-eye.svg` (símbolo completo, fondo transparente), `vision-favicon.svg` (favicon: fondo redondeado + ojo de 2 niveles, pupila grande; es el único válido para 16-64 px), `vision-appicon.svg` (sobre fondo, ojo al 80 %), `vision-eye-simple.svg` (2 niveles sin fondo, solo para usar sobre fondo oscuro).
- Renders: `favicon-16/32/64.png`, `apple-touch-icon.png` (180), `appicon-1024.png`, `eye-512.png`. Regenerar con `rsvg-convert` desde los SVG; nunca editar los PNG a mano.
- Mobile: splash = ojo al 70 % del ancho sobre fondo, "Portfolio" (400) arriba y "Visión" (700) abajo, centrados.
- Microinteracción reservada: secuencia 01-02-03 (párpado+iris, anillos, pupila al final) como animación de carga del ícono.

## Paleta (hex)
| Uso | Hex |
|---|---|
| Fondo verde oscuro | #0F1A14 |
| Marfil: texto, párpados | #ECECDF |
| Lima: pupila, resultados positivos, estado activo | #BFD78D |
| Terracota: resultados negativos | #D9967E |
| Superficie (tarjetas) | #15221B |
| Superficie 2 (chips) | #1B2C23 |
| Líneas | #243A2E |
| Texto secundario / terciario | #8FA094 / #5F7066 |

Tokens CSS listos en `tokens.css` (prefijo `--pv-`).

## Tipografía
Space Grotesk: "Visión" 700, "Portfolio" 400, cuerpo 400/500. Números tabulares en IBM Plex Mono.

## Reglas
1. Positivo siempre lima, negativo siempre terracota. No usar otros verdes/rojos.
2. El ojo nunca se deforma, rota ni se le agrega línea vertical, sombra o degradé.
3. Fondo siempre #0F1A14; el marfil nunca se usa como fondo de pantalla completa.
4. Navegación de la app: dos vistas, **Portfolio** (dinero real) y **Laboratorio** (simulaciones / paper). Estado activo en lima.
5. Las láminas de exploración (Órbita, Umbral, Pulso, Prisma, Ritual) quedan descartadas; no reabrir.

# Piloto de mapa — referencia 26×6 (histórico)

**No es el mapa base visual oficial actual.**  
El terreno maestro 78×18 es `docs/map-grid-pilot/terrain-iter-match-lote1/01-map-empty.png`  
(copia: `docs/map-grid-pilot/approved-master/00-MAPA_MAESTRO_APROBADO.png`).

Este piloto **no redibuja** el escenario. Usa la ilustración aprobada por Neni/ChatGPT
el 18 ago 2026 (composite limpio arriba + grid de ChatGPT abajo).

No está integrado en Zona Zero. No sustituye el mapa de producción.

## Archivos

- `00-approved-source.png` — composite original tal cual se aprobó.
- `01-map-clean.png` — solo el escenario (mitad superior), sin grid.
- `02-map-debug-grid.png` — el mismo escenario + coordenadas A–Z × 1–6.
- `03-map-occupancy.png` — edificable / bloqueado para revisión.
- `04-map-building-test.png` — footprints de prueba (el jugador no los ve).
- `map_grid.json` — ocupación celda a celda.

## Dimensiones

- Recorte limpio original: **1024 × 340** px.
- Entrega de revisión: **4096 × 1360** px (×4 LANCZOS, sin redibujar).
- Concepto de viewport: mapa más ancho que una pantalla landscape; pan izquierda → derecha.

## Cuadrícula lógica (invisible en partida)

- **26 × 6** celdas (A–Z × 1–6) = **156** celdas.
- A1 = noroeste (arriba-izquierda).
- El jugador nunca ve esta rejilla. Solo existe para saber qué hay en cada celda.

## Ocupación

- Edificable: **86 / 156** (55.1%).
- Bloqueada: **70**.

- `BLOCKED_OBSTACLE`: 3
- `BLOCKED_ROAD`: 25
- `BLOCKED_RUIN`: 10
- `BLOCKED_TREE`: 8
- `BLOCKED_VEHICLE`: 7
- `BUILDABLE`: 86
- `DIRT_PATH`: 17

Las parcelas vacías son deliberadas. Los caminos de tierra de la ilustración
dividen el terreno; nosotros no pintamos cuadrados artificiales en el fondo.

## Prueba de colonia (`04`)

- Piezas colocadas: **12**.
- Celdas usadas por footprints: **52**.
- Edificable que sigue libre después: **34**.

- `edificio_grande` 3×3 ancla H1 → H1, I1, J1, H2, I2, J2, H3, I3, J3
- `taller` 3×2 ancla V1 → V1, W1, X1, V2, W2, X2
- `casa_1` 2×2 ancla H5 → H5, I5, H6, I6
- `casa_2` 2×2 ancla M1 → M1, N1, M2, N2
- `casa_3` 2×2 ancla S2 → S2, T2, S3, T3
- `casa_4` 2×2 ancla D5 → D5, E5, D6, E6
- `casa_5` 2×2 ancla J5 → J5, K5, J6, K6
- `casa_6` 2×2 ancla S5 → S5, T5, S6, T6
- `huerto_1` 2×2 ancla Q1 → Q1, R1, Q2, R2
- `huerto_2` 2×2 ancla M5 → M5, N5, M6, N6
- `huerto_3` 2×2 ancla W5 → W5, X5, W6, X6
- `pozo` 1×1 ancla K1 → K1

Criterio visual: aquí había un lugar antes del desastre; la colonia se reconstruye encima.
No es un escenario lleno de decoración buscando huecos.


# Revisión de escala — fondo limpio + viviendas 4×2

**Solo piloto.** No está integrado en Zona Zero. No cambia gameplay, población ni el editor de Neni.

Fondo: la ilustración aprobada (`approved-reference-pilot/01-map-clean.png`), **sin redibujar**. Se eliminaron vehículos y ruinas grandes, reconstruyendo el terreno con la textura de la zona.

## Qué se quitó del fondo

- Coche oxidado sobre la carretera (izquierda).
- Autobús verde diagonal (centro-derecha).
- Vehículos a la derecha / far-right.
- Cluster de muros de piedra noroeste.
- Segundo cluster de muros + molino/torre oxidada.
- Ruinas de piedra en parcela norte-centro.
- Cobertizo/contenedor metálico y ruina rectangular sureste que ocupaban solar.

Se mantienen carretera, caminos de tierra, parcelas, vegetación y árboles sueltos.

## Cuadrícula

- **78 × 18 = 1.404 celdas** (igual que el piloto anterior).
- Celda ≈ 52,5 × 75,6 px sobre 4096 × 1360.

## Simulación colocada (orgánica, no dos filas)

| Pieza | Footprint | Cantidad |
|---|---|---|
| Vivienda (4 habitantes) | 4×2 o 2×4 rotada | 16 |
| Huerto | 2×2 (×3) y 4×3 (×3) | 6 |
| Pozo | 1×1 | 2 |
| Taller | 5×2 | 1 |
| Almacén | 5×3 | 1 |
| Clínica | 5×3 | 1 |
| Edificio de prueba | 4×4, 5×3, 5×4, 6×4 | 4 |

Las 16 viviendas **no son el máximo** del mapa: son la carga de prueba para ver crecimiento con casas pequeñas de 4 habitantes.

## Capacidad

- Celdas ocupadas por footprints: **293**
- Celdas útiles estimadas (parcelas marrones, sin carretera): **656**
- Celdas restantes en esas parcelas: **363**
- Ocupado sobre terreno útil: **44.7%**
- Ocupado sobre el grid completo: **20.9%**

**¿Caben cómodamente las 16 viviendas + servicios + 4 edificios de prueba?** Sí. Queda aproximadamente la mitad del terreno de parcela libre, con huecos entre piezas y sin tapar la carretera.

## Viviendas 4×2 adicionales (estimación)

Si cada casa sigue siendo 4×2 (8 celdas) y **no** queremos llenar el mapa:

- Holgado (dejar ~35% de parcelas abiertas): **~16 casas más**
- Moderado (llenar hasta ~70% de parcelas útiles): **~20 casas más**
- Apretado (usar el resto de parcelas estimadas): **~45 casas más**

Población teórica solo con las 16 de prueba: **64 habitantes**. Con las adicionales holgadas: del orden de **128**. Esto es capacidad de mapa, no diseño de gameplay.

Neni clasificará después las 1.404 celdas a mano. Esta simulación ignora piedras/decoración pequeña.

## Archivos

1. `01-map-clean-no-vehicles-ruins.png` — fondo limpio
2. `02-map-clean-grid-78x18.png` — fondo limpio + grid
3. `03-capacity-sim-4x2.png` — footprints de prueba
4. `capacity-sim-4x2.json` — datos
5. `RESUMEN.md` — este archivo

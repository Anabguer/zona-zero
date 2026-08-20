# Migración Espacial — Zona Zero 4096×2720

**Fecha:** 2026-08-19
**Estado:** BORRADOR PARA HUMAN GATE
**Versión de mapa:** `mapa-4096x2720-B-real.png` (congelado)
**WORLD_W = 4096 · WORLD_H = 2720 · NUCLEUS_X = 2600 · NUCLEUS_Y = 380**

---

## 1. Arquitectura actual (sistema 100×100)

El juego fue diseñado con un **mundo lógico abstracto de 100×100 unidades**. Ninguna de esas unidades corresponde a píxeles reales del mapa visual. La cámara SVG manipulaba el `viewBox` de `0 0 100 100` para simular pan y zoom.

### Capas del sistema actual

```
VIEWPORT (pantalla)
    └── SVG viewBox  [0..100 × 0..100]
            ├── rect fondo              (0,0,100,100)
            ├── drawColonyGround()      imagen COLONY_DIRT_ART en coords camp-relativas
            ├── drawPlayableTerrain()   rect 0,0,100,100 + carreteras SVG en coords 0-100
            ├── drawRoads()             paths SVG en coords 0-100 (anchors hardcoded)
            ├── drawUrbanBlocks()       ruinas RNG coords 0-100
            ├── drawSettlementCore()    translate(camp.x, camp.y) = coords 0-100
            │       └── SLOT_TEMPLATES  lx/ly camp-relativos (unidades 1-30)
            └── drawWeather()           partículas en coords vbW×vbH (antes 100×100)
```

---

## 2. Dependencias del sistema 100×100

| Sistema | Coordenadas | Quién consume | Para qué | ¿Conservar? |
|---|---|---|---|---|
| state.zones[].x/y/r | 0-100 absoluto | drawZone, recenterCamera, expeditions | Posición de zona en mapa | Transformar a px mundo |
| drawColonyGround() | camp.x/y ± offset | Visual suelo camp | Textura de tierra bajo HQ | Eliminar — mapa maestro ya lo tiene |
| drawPlayableTerrain() | rect(0,0,100,100) + roads | Visual fondo mundo | Carreteras SVG, ruinas, halo | Eliminar — mapa maestro ya lo tiene |
| drawRoads() / streetCorridors() | Coords 0-100 hardcodeadas | Visual calles | Caminos pintados SVG | Eliminar — mapa maestro ya lo tiene |
| drawUrbanBlocks() | RNG 6-94 en 0-100 | Visual ruinas fondo | Bloques de ruinas | Eliminar — mapa maestro ya lo tiene |
| drawSectorIdentity() | sec.polyOff + camp-relativo | Visual identidad sector | Manchas, props, vallados | Revisar |
| SLOT_TEMPLATES[].lx/ly | Camp-relativo (-30 a +30) | Posición visual de slot | Dónde pintar el edificio | Transformar a px mundo |
| SLOT_TEMPLATES[].cell | Grid abstracto 0-13 × 0-10 | isCellBuildable, sectorForCell | Validación colocación | Conservar lógica; transformar render |
| settlementScale() | Devuelve 2.95-4.6 | cellToWorld, worldToCell, render slots | Escala visual colonia | Transformar — nueva escala px mundo |
| cellToWorld() | cell + camp(0-100) + scale | snapGhostToWorld, render ghost | cell → coord mapa | Transformar — resultado px mundo |
| worldToCell() | coord 0-100 → celda | Interacción clic | tap/click → celda build | Transformar — input px mundo |
| SECTOR_CELL_SCALE = 4.25 | Multiplica celda → unidades mapa | sectors.js polyOff | Tamaño celda en mapa | Transformar — nueva escala |
| sectors[].polyOff | Polígono camp-relativo (~±15 u.) | Render contorno sector, hit area | Límite visual/lógico sector | Transformar a px mundo |
| isCellBuildable() | Celda abstracta [x,y] | Validación | ¿Puede construirse? | Conservar — lógica independiente |
| drawWeather() | W = m.vbW = 4096 | Partículas lluvia, niebla | Efectos visuales | Mover a screen space |
| drawExpeditions() | camp.x/y y dest.x/y en 0-100 | Rutas animadas | Animación exploradores | Transformar a px mundo |

### Riesgo crítico en ensureColonyLayout()

Las líneas 288-296 de `colony-layout.js` sobreescriben `state.mapCamera` con coords del camp en espacio 0-100 si la flag `colonyCamV2` no está seteada. En partidas nuevas esto mueve la cámara a ~(48, 63) px mundo (esquina superior izquierda). Debe eliminarse en Fase 3.

---

## 3. Código visual antiguo que sobra con el mapa maestro

El mapa maestro A+B ya representa visualmente:
- Carretera asfalto E-O deteriorada
- Caminos de tierra verticales y diagonales
- Grandes parcelas delimitadas por caminos
- Vegetación en bordes
- Tierra seca, piedras, erosión, rodadas

**Código SVG a eliminar directamente:**
- drawPlayableTerrain() — completo
- drawRoads() — completo
- drawUrbanBlocks() — completo
- drawColonyGround() — la imagen COLONY_DIRT_ART bajo el HQ
- COLONY_YARD_ART wide en drawSettlementYard() — el mapa ya da el suelo

---

## 4. Lógica que debe sobrevivir íntegra

- isCellBuildable(), isCellFree() — validación pura
- ghostPlacementOk(), slotFitsType(), slotIsVacant(), slotIsUnlocked() — lógica slots
- buildingForSlot(), slotForBuilding(), attachBuildingToSlot(), syncOccupancy()
- Sistema de sectores: estados (locked/recovering/recovered), componentes, coste
- sim.js: días, recursos, expediciones, ataques — no dependen de escala visual
- state.zones[].state (unknown/discovered/controlled/hostile) — lógica pura

---

## 5. Propuesta WORLD SPACE

**Todo vive en coordenadas mundo (px del mapa maestro).** La cámara solo transforma WORLD → VIEWPORT.

```
WORLD SPACE:   (0,0) top-left del mapa maestro
               (4096, 2720) bottom-right
               1 unidad = 1 px del PNG a zoom=1
```

### Conversión de zonas — Opción B (recomendada)

Reasignar manualmente cada zona a coordenadas mundo, mirando el mapa real. Hay ~10-15 zonas. Permite coherencia geográfica real.

Coordenadas propuestas (requieren aprobación visual):

| Zona | Coord actual 0-100 | Coord mundo propuesta | Referencia mapa |
|---|---|---|---|
| camp (Refugio) | ~(48,62) | (2600, 380) | Intersección caminos, tercio superior |
| lot_west | ~(22,48) | (1100, 420) | Parcela izquierda media |
| ruins_east | ~(72,38) | (3300, 360) | Zona derecha, borde arbóreo |
| alley_south | ~(50,78) | (2500, 700) | Sur del núcleo |
| yard_north | ~(48,28) | (2600, 180) | Norte del núcleo |
| scrap_sw | ~(18,68) | (900, 560) | Esquina suroeste |
| green_se | ~(72,72) | (3400, 600) | Esquina sureste |

---

## 6. Grid lógico invisible

La cuadrícula NO se dibuja. Solo existe como herramienta de validación interna.

```
CELL_WORLD_SIZE = 64 px   (provisional — validar en Fase 2)

cellToWorld(cx, cy):
  wx = NUCLEUS_X + (cx - BW/2 + 0.5) * CELL_WORLD_SIZE
  wy = NUCLEUS_Y + (cy - BH/2 + 0.5) * CELL_WORLD_SIZE

worldToCell(wx, wy):
  cx = round((wx - NUCLEUS_X) / CELL_WORLD_SIZE + BW/2 - 0.5)
  cy = round((wy - NUCLEUS_Y) / CELL_WORLD_SIZE + BH/2 - 0.5)
```

El grid solo se muestra:
- En modo construcción: highlight de celda objetivo
- En debug: activable por flag
- Nunca permanente sobre el terreno

---

## 7. Separación sprite / footprint / anchor

```
SPRITE:    PNG del edificio con perspectiva. Puede sobresalir del footprint.
FOOTPRINT: Rectángulo lógico de ocupación (N×M celdas). Invisible para jugador.
ANCHOR:    Punto mundo (wx, wy) = celda inferior-central del footprint.
```

### Análisis de CELL_WORLD_SIZE

El sistema 0-100 equivale implícitamente a ~147 px mundo por celda (demasiado grande para portrait).

A zoom=1.0, viewport portrait 390px:
- CELL_WORLD_SIZE = 48px → edificio 2×2 = 96px → caben ~4 anchos (pequeño)
- CELL_WORLD_SIZE = 64px → edificio 2×2 = 128px → caben ~3 anchos (✓ propuesta)
- CELL_WORLD_SIZE = 80px → edificio 2×2 = 160px → caben ~2.4 anchos (posible)

**Propuesta provisional: CELL_WORLD_SIZE = 64 px — validar en prueba de escala.**

### Prueba de escala pendiente

Una vez resuelto el contrato de coordenadas:
- Juego real, cámara real, portrait/landscape/desktop
- Renderizar colonia con CELL_WORLD_SIZE = 48, 64, 80
- Neni elige cuál lee mejor
- Solo entonces fijar CELL_WORLD_SIZE definitivo

---

## 8. Parcelas del mapa como zonas lógicas

El mapa maestro tiene 6-8 grandes parcelas naturales:

```
Parcela N:  x=[1190, 2720], y=[0, 540]    <- ZONA DEL NUCLEO
Parcela NW: x=[0, 1190],    y=[0, 540]
Parcela NE: x=[2720, 4096], y=[0, 540]
Parcela S:  x=[1190, 2720], y=[600, 1360]
Parcela SW: x=[0, 1190],    y=[600, 1360]
Parcela SE: x=[2720, 4096], y=[600, 1360]
+ Bloque B: parcelas adicionales (caminos distintos)
```

Los sectores actuales encajan bien con esta geografía. No es necesario rediseñar el sistema de sectores. Solo re-expresar polyOff en px mundo.

---

## 9. Análisis del núcleo (2600, 380)

- Horizontal: 63.5% del ancho (central-derecha)
- Vertical: 14% del alto (tercio superior bloque A)
- Cae en tierra abierta, cerca del cruce de caminos verticales
- Espacio disponible: Norte 380px, Sur 980px hasta carretera, Oeste ~1410px, Este 1496px
- Es un punto razonable para el Refugio Central

**Recomendación: conservar (2600, 380) hasta la prueba de escala (Fase 2).** Ajustar solo si el HQ cae sobre un camino visible.

---

## 10. Weather: world space vs screen space

### Problema

Con vbW=4096 y zoom variable, las partículas de lluvia/nieve escalan con el zoom del mapa. A zoom=0.5 aparecen dos veces más pequeñas. La lluvia no debe depender del zoom del mundo.

### Propuesta

Weather en screen space — overlay HTML encima del SVG del mapa:

```html
<div id="zz-weather-overlay"
     style="position:absolute;inset:0;pointer-events:none;z-index:20">
  <!-- Canvas o SVG con partículas en px pantalla -->
</div>
```

La niebla puede ser simplemente un div con background semitransparente.

No implementar hasta Fase 6.

---

## 11. Orden de migración

```
FASE 0 (HECHO): Mapa maestro, cámara 4096×2720, portrait, NUCLEUS_X/Y

FASE 1 — Limpieza visual (sin tocar gameplay):
  - Eliminar drawPlayableTerrain(), drawRoads(), drawUrbanBlocks()
  - Eliminar drawColonyGround(), COLONY_YARD_ART wide
  GATE: mapa limpio sin capas SVG duplicadas

FASE 2 — Prueba de escala de edificios:
  - CELL_WORLD_SIZE provisional (64px)
  - Renderizar colonia en px mundo
  - Prueba portrait/landscape/desktop
  GATE: Neni aprueba CELL_WORLD_SIZE definitivo

FASE 3 — Migrar slots y colonia:
  - Reescribir cellToWorld/worldToCell con CELL_WORLD_SIZE px mundo
  - Reescribir SLOT_TEMPLATES.lx/ly a px mundo
  - Eliminar bloque colonyCamV2 de ensureColonyLayout()
  GATE: edificios visibles en posición correcta sobre el mapa

FASE 4 — Migrar zonas:
  - Añadir zone.wx/wy (px mundo) para cada zona
  - Actualizar drawZone(), drawExpeditions()
  GATE: zonas visibles sobre geografía real del mapa

FASE 5 — Migrar sectores:
  - Re-expresar sectors[].polyOff en px mundo
  GATE: sectores coherentes con geografía

FASE 6 — Weather screen space:
  GATE: lluvia/nieve invariante al zoom

FASE 7 — Limpieza final:
  - Eliminar referencias residuales a espacio 0-100
  GATE: código sin espacio abstracto
```

---

## 12. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| CELL_WORLD_SIZE mal elegido | Alta | Medio | Prueba Fase 2 antes de fijar |
| Partidas guardadas con coords 0-100 | Media | Alto | migrateState() + fallback |
| Slots en posición incorrecta sobre mapa | Alta | Medio | Reposicionar en Fase 3 con mapa como referencia |
| Camp fuera de vista en portrait | Baja | Medio | NUCLEUS_X/Y validados |
| ensureColonyLayout() resetea cámara | YA OCURRE | Alto | Corregir en Fase 3 |
| Weather con vbW=4096 | YA OCURRE | Bajo | Fase 6 |

---

## 13. Gates de aprobación humana

| Gate | Qué verifica Neni |
|---|---|
| Fase 1 | Mapa limpio sin carreteras SVG duplicadas sobre mapa maestro |
| Fase 2 | Escala visual de edificios correcta en portrait, landscape y desktop |
| Fase 3 | Edificios en posición correcta sobre el mapa real |
| Fase 4 | Zonas exploradas/hostiles en ubicaciones geográficamente plausibles |
| Fase 5 | Sectores coherentes con geografía (scrap_sw al suroeste, green_se al sureste) |
| Fase 6 | Lluvia/nieve no escala con el zoom del mapa |
| Fase 7 | Juego completo funcional: partida nueva, continuar, expediciones, build, ataques |
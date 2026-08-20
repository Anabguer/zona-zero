# CONJUNTO DE REFERENCIA VISUAL APROBADO — Zona Zero

**Estado: CONGELADO. No regenerar. No retocar. No sustituir.**  
**Aprobado:** 18 ago 2026 (Neni)  
**Grid:** 78×18. JSON de Neni intacto. No gameplay.

Esta carpeta es la **copia de seguridad con nombre explícito**.  
Las rutas de trabajo originales (abajo) también quedan congeladas.  
Ninguna generación posterior puede usar esos nombres de archivo como destino.

---

## Mapa base visual oficial

| Rol | Archivo congelado (esta carpeta) | Origen (no sustituir) |
|-----|----------------------------------|------------------------|
| **MAPA MAESTRO** | `00-MAPA_MAESTRO_APROBADO.png` | `docs/map-grid-pilot/terrain-iter-match-lote1/01-map-empty.png` |
| Prueba de integración (7 edificios) | `00-INTEGRACION_7_EDIFICIOS.png` | `…/terrain-iter-match-lote1/02-map-with-buildings.png` |
| Norma de transición tierra | `00-TRANSICION_TIERRA_APROBADA.png` | `…/terrain-iter-match-lote1/03-closeup-dirt-blend.png` |

**El mapa base visual oficial es `01-map-empty.png` / `00-MAPA_MAESTRO_APROBADO.png`.**  
No es `approved-reference-pilot/01-map-clean.png` (piloto 26×6 anterior).  
No es `scale-iter-clean-4x2/01-map-clean-no-vehicles-ruins.png`.

---

## Los 14 assets congelados — no regenerar

| id | Nombre | Footprint | Asset original (no tocar) | Copia congelada |
|----|--------|-----------|---------------------------|-----------------|
| `house` | Casa | 4×2 | `building-pilots/01-house-4x2.png` | `buildings/01-house-4x2.png` |
| `workshop` | Taller | 5×2 | `building-pilots/01-workshop-5x2.png` | `buildings/01-workshop-5x2.png` |
| `hq_central_l1` | Refugio Central I | 5×4 | `building-pilots/01-hq-5x4.png` | `buildings/01-hq-5x4.png` |
| `well` | Pozo | 2×1 | `building-pilots/lote-1/01-well-2x1.png` | `buildings/01-well-2x1.png` |
| `farm` | Huerto | 3×2 | `building-pilots/lote-1/01-farm-3x2.png` | `buildings/01-farm-3x2.png` |
| `infirmary` | Enfermería | 4×3 | `building-pilots/lote-1/01-infirmary-4x3.png` | `buildings/01-infirmary-4x3.png` |
| `storage` | Almacén | 5×3 | `building-pilots/lote-1/01-storage-5x3.png` | `buildings/01-storage-5x3.png` |
| `sawmill` | Aserradero | 5×3 | `building-pilots/lote-2/01-sawmill-5x3.png` | `buildings/01-sawmill-5x3.png` |
| `greenhouse` | Invernadero | 4×3 | `building-pilots/lote-2/01-greenhouse-4x3.png` | `buildings/01-greenhouse-4x3.png` |
| `cistern` | Cisterna | 2×2 | `building-pilots/lote-2/01-cistern-2x2.png` | `buildings/01-cistern-2x2.png` |
| `kitchen` | Cocina | 4×2 | `building-pilots/lote-2/01-kitchen-4x2.png` | `buildings/01-kitchen-4x2.png` |
| `scrapyard` | Chatarrería | 5×3 | `building-pilots/lote-3/01-scrapyard-5x3.png` | `buildings/01-scrapyard-5x3.png` |
| `radio` | Radio | 3×2 | `building-pilots/lote-3/01-radio-3x2.png` | `buildings/01-radio-3x2.png` |
| `medkit` | Botiquín | 2×2 | `building-pilots/lote-3/01-medkit-2x2.png` | `buildings/01-medkit-2x2.png` |

El **refugio** (`shelter` 3×2) está en **HOLD HUMANO**. No regenerar hasta decisión de Neni.

Lote 2 cerrado. El huerto **no** tiene niveles en el catálogo. El invernadero es otro edificio.

---

## Norma de base para edificios futuros

Tierra, piedras, vegetación y grano de **cualquier** edificio nuevo deben integrarse con este terreno, tomando como referencia `00-TRANSICION_TIERRA_APROBADA.png` (`03-closeup-dirt-blend.png`).

Cámara, escala, orientación y acabado: `building-pilots/NORMA_VISUAL_EDIFICIOS.md`.

---

## Qué no es este congelado

- No cambia el grid 78×18 ni las 662 celdas `buildable` de Neni.
- No entra en producción / deploy.
- No autoriza regenerar maestros ni lote 1.

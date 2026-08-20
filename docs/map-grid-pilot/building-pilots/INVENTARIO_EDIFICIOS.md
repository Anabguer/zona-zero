# Inventario real de edificios — Zona Zero

**Fecha:** 18 ago 2026  
**Fuentes:** `content/buildings.json` (catálogo runtime), `GAME_MASTER.md` §4 y §7, `js/v1-catalog.js`, `js/art.js`, `docs/CONTENT_SCHEMA.md`.  
**No se inventan edificios nuevos.** Los tamaños “propuestos” son **solo escala visual de mapa 78×18**. No se aplican a gameplay, costes ni JSON de Neni.

Grid de partida actual (motor): `balance.baseGrid` **14×12**, footprints casi todos **1×1** o **2×1** / **2×2**.  
Grid del piloto de mapa: **78×18**, 662 celdas buildable (Neni).

Principio de propuesta (no aplicado): una **Casa** pasa de 1×1 a **4×2** y debe sentirse pequeña; lo comunitario/productivo importante, mayor.

---

## A. Actuales en gameplay (`buildings.json` jugable v1)

| id | Nombre | Función | w×h actual | Propuesta escala mapa (NO aplicada) | Notas |
|----|--------|---------|------------|-------------------------------------|-------|
| `hq_central_l1` | Refugio Central I | HQ + vivienda 6 + def pasiva | 2×2 | **5×4** | Único. Gratis al inicio. jobs 0. |
| `hq_central_l2` | Refugio Central II | Upgrade HQ, vivienda 10 | 2×2 | 5×4 (in-place) | Upgrade, no edificio nuevo. |
| `hq_central_l3` | Refugio Central III | Cuartel, vivienda 16 | 2×2 | 5×4 (in-place) | Upgrade. |
| `shelter` | Refugio | +2 camas, protección 0 | 1×1 | 3×2 | Arranque, más precario que la casa. |
| `house` | Casa | +4 camas, protección 1 | 1×1 | **4×2** | Vivienda de referencia de este piloto. |
| `insulated_house` | Casa aislada | +4 camas, protección 2 | 1×1 | 4×2 | Misma planta; tech `insulation`. |
| `block` | Bloque | +8 camas, 2 plantas lógicas | 2×1 | 5×3 | Mayor que una casa. |
| `farm` | Huerto | Comida, 3 jobs | 1×1 | 3×2 | Tierra de cultivo, no edificio. |
| `greenhouse` | Invernadero | Comida↑ | 1×1 | 4×3 | Requiere farm + tech. |
| `well` | Pozo | Producción de agua | 1×1 | 2×1 | Objeto; se lee el brocal. |
| `cistern` | Cisterna | Reserva/soft-cap agua, lluvia | 1×1 | 2×2 | No es “otro pozo”. |
| `sawmill` | Aserradero | Madera | 1×1 | **5×3** | |
| `scrapyard` | Chatarrería | Metal | 1×1 | 4×3 | Patio + cobertizo. |
| `storage` | Almacén | Soft-cap stock | 1×1 | 5×3 | |
| `workshop` | Taller | Metal + requisito de ramas | 1×1 | **5×2** | |
| `kitchen` | Cocina | Raciones / −merma comida | 1×1 | 4×2 | |
| `mech_shop` | Taller mecánico | Metal↑ + vehículos | 2×1 | 5×3 | Requiere workshop. |
| `medkit` | Botiquín | 1 cama médica | 1×1 | 2×2 | |
| `infirmary` | Enfermería | 4 camas | 1×1 | 4×3 | Requiere medkit. |
| `clinic` | Clínica | 8 camas, centro médico | 2×1 | 5×3 | Victoria / infra avanzada. Sin `max` arbitrario en diseño. |
| `barricade` | Barricada | Defensa baja | 1×1 | 1×2 | Lineal. |
| `fence` | Cerca | Defensa media | 1×1 | 1×2 | Perímetro. |
| `watchtower` | Atalaya | Defensa alta | 1×1 | 2×2 | Volumen vertical. |
| `armory` | Armería | Def + ammo | 1×1 | 4×3 | Requiere atalaya. |
| `bunker` | Búnker | Def muy alta + 2 housing | 2×1 | 4×4 | Masa compacta, menor planta que HQ. |
| `radio` | Radio | Señales / misiones | 1×1 | 3×2 | max 1. |
| `expedition_center` | Centro de expediciones | Logística exploradores | 2×1 | 5×3 | max 1. Requiere radio. |
| `garage` | Garaje | Vehículos ≥ coche | 2×1 | 5×3 | |
| `tech_bench` | Banco técnico | Research básico | 1×1 | 3×2 | |
| `lab` | Laboratorio | Research avanzado + medicine | 2×1 | 5×3 | Requiere banco. |

`command` está **en el JSON** (Puesto de mando, 1×1) pero el contrato v1 lo trata como **legado HQ** (`CONTENT_SCHEMA`, GM §7: “command → HQ”). No usarlo como piloto.

---

## B. Previstos / canónicos documentados, no en catálogo runtime

| id | Nombre | Función | Estado | Footprint doc | Propuesta escala |
|----|--------|---------|--------|---------------|------------------|
| `block_reinforced` | Residencia reforzada | Upgrade del bloque, prot. 3, 10–12 camas | **previsto** GM §4.2 | no en JSON | 5×3 in-place |

---

## C. Ideas, WIP o contenido antiguo (fuera de v1)

| id | Nombre | Función histórica | Estado |
|----|--------|-------------------|--------|
| `generator` | Generador | Electricidad | **Eliminado v1.** Saves legacy → `storage`. |
| `solar` | Solar | Electricidad | Eliminado v1. |
| `power_plant` | (alias) | Electricidad | Eliminado v1 (`v1-catalog.js`). |
| `power_hub` / `power_grid` | Red eléctrica | Electricidad | Eliminado. |
| `wall` | Muro | Defensa | Fuera de catálogo; `art.js` aún tiene alias a `defense.webp`. |
| `camp_d1` | Campamento D1 | Arte de arranque | Asset/`art.js` only, no def de catálogo. |

---

## Arte raster actual (`assets/art/buildings/`)

Muchos tipos **comparten** el mismo archivo (deuda ART_DEBT):

- `dwelling-v1b.png` → HQ, shelter, house, insulated, block, kitchen  
- `workshop.webp` → workshop, sawmill, scrapyard, mech_shop  
- `infirmary.webp` → medkit, infirmary, clinic  
- `defense.webp` → barricade, fence, watchtower, bunker, wall  
- `farm-iso.png`, `well-iso.png`, `storage.webp`, `camp-d1.webp` propios  

Esto **no** es el look del mapa aprobado 78×18. Los pilotos de abajo son una familia visual nueva alineada a esa ilustración.

---

## Pilotos de esta fase (solo 3)

Elegidos del inventario **actual**, no inventados:

| Rol | id | Nombre | Footprint piloto | Por qué |
|-----|----|--------|------------------|---------|
| A. Vivienda | `house` | Casa | **4×2** | Canónica, 4 habitantes, debe sentirse pequeña. |
| B. Mediano | `workshop` | Taller | **5×2** | Gameplay D1–mid, silueta industrial clara, distinto de la casa. |
| C. Grande | `hq_central_l1` | Refugio Central I | **5×4** | Edificio más importante del juego; debe dominar visualmente a la casa. |

No se generan más hasta aprobación de Neni/ChatGPT.

**Regla de dibujo:** el PNG no rellena el 100% del rectángulo lógico. Volumen + entrada, tablones, bidones, patio mínimo. Apoyado en el terreno, no pegatina rectangular.

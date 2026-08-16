# AUDIT_ENGINE — Motor vs GAME_MASTER **2.8**

**Fecha:** 2026-08-16 · **Diseño:** GAME_MASTER **2.8** · Actualizado en **ZZ-183** (release gate)  
**Alcance:** `js/*` + `content/*.json` (runtime). Scripts/docs solo si afectan load path.

**Leyenda estado:** `OK` · `PARTIAL` · `STUB` · `CONFLICT` · `MISSING` · `REMOVED`  
**Deuda:** `KEEP` · `EXTEND` · `REWRITE` · `REMOVE` · `DONE`  
**Prioridad:** P0 (rompe 2.8 / load path) → P3 (pulido)

---

## Estado eléctrico / energy (ZZ-183 · release)

| Ítem | Estado actual | Notas |
|------|---------------|-------|
| `victory.needEnergy` | **false** | `content/balance.json` · victoria multi-condición sin electricidad (`js/victory.js`) |
| `state.energy` | **eliminado del estado activo** | `createNewState` no lo crea; `migrateState` strippea + flag `_migratedEnergy`; `applyProduction` no acumula/persiste |
| `generator` / `solar` en catálogo v1 | **fuera** | Eliminados de `content/buildings.json`; filtro `js/v1-catalog.js`; UI `playableBuildingDefs`; `placeBuilding` rechaza |
| Saves legacy `generator`/`solar` | **→ `storage`** | Solo migración v7 (`js/state.js`); **no** construibles nuevos |
| Electricidad como requisito sistemas/victoria | **no** | Contrato 2.8 · `deprecatedV1.electricity: true` |
| Research energy (`power_grid`, etc.) | **filtrado** | `js/research.js` excluye IDs energy; no techs en JSON actual |

---

## Matriz por sistema (resumen vigente)

| Sistema | Status | Archivos clave | Deuda | P | Notas vs 2.8 |
|---------|--------|----------------|-------|---|--------------|
| **Population** | OK | `js/population.js`, `js/state.js`, `js/sim.js` | KEEP | P2 | Total + sick/injured/dependents; workforce. |
| **Labor / staffing** | OK / PARTIAL | `js/colony.js`, `js/population.js`, `js/main.js` | EXTEND | P2 | Workers por edificio + UI. |
| **Housing / climate wood** | OK | `js/state.js`, woodHeating en balance | KEEP | P2 | Calefacción madera (no fuel colonia eléctrico). |
| **Resources (sin energy)** | OK | `content/balance.json`, `js/state.js`, `js/sim.js` | KEEP | — | Sin loop `state.energy`. Fuel = vehículos. |
| **Buildings (catálogo v1)** | OK | `content/buildings.json`, `js/v1-catalog.js` | KEEP | — | **Sin** generator/solar. `command` aún en JSON (legado HQ — fuera de este ticket). |
| **Research** | OK / PARTIAL | `content/research.json`, `js/research.js` | EXTEND | P2 | Sin rama eléctrica en árbol filtrado. |
| **Exploration / defense / eras** | OK | sim + content | KEEP | P2 | — |
| **Outbreaks / ambient life** | OK | `js/outbreaks.js`, `js/ambient-life.js` | KEEP | P2 | Cap ambient ≤16. |
| **Victory** | OK | `js/victory.js`, `balance.victory` | KEEP | — | `needEnergy: false`. |
| **Save / migrate v7** | OK | `js/state.js`, `scripts/smoke-save.mjs` | KEEP | — | Strip energy; generator/solar→storage. |
| **Map / UI** | OK | `js/render-map.js`, `js/main.js` | KEEP | P2 | Sin GIS / sin city.webp. |

---

## Load-path: clasificados (ZZ-183)

| Ítem | Clasificación | Acción |
|------|---------------|--------|
| `generator`/`solar` en `buildings.json` | ~~activo jugable~~ → **REMOVED** | Eliminados del JSON |
| `js/v1-catalog.js` + filtros UI/`placeBuilding` | **JUSTIFICADO defensa en profundidad** | Impide reaparición |
| `migrateState` energy strip + remap | **JUSTIFICADO legacy** | Conservar |
| `icons.js` paintGenerator/paintSolar | **JUSTIFICADO legacy** | Painters muertos para catálogo; no listados en UI |
| `achievements.js` / `research.js` filtros energy | **JUSTIFICADO** | Bloqueo defensivo |
| `balance.deprecatedV1.electricity` | **JUSTIFICADO** | Flag contrato |
| `events.json` texto «solares» (= solares urbanos / lots) | **JUSTIFICADO copy** | No es edificio `solar` |
| Docs/archive GM históricos mencionando generator | **JUSTIFICADO documentación histórica** | No tocar a ciegas |
| `docs/AUDIT_ENGINE.md` (este archivo) | **ACTUALIZADO 2.8** | Sustituye matriz obsoleta needEnergy:true |

---

## Prioridades residuales (no bloquean ZZ-183 eléctrico)

### Hecho (eléctrico)
1. ~~Quitar generator/solar del catálogo + energy sim + needEnergy~~ **DONE** (ZZ-140…144 + ZZ-180 + ZZ-183).

### P2 — no este gate
2. `command` aún en buildings (revisar si consolidar solo HQ).
3. Ampliar REGRESSION_SUITE_CANDIDATE: placement ghost+✓; Hub→Continuar.
4. Deuda artística NO BLOQUEANTE · sin ART PASS.

---

## Resumen ejecutivo (ZZ-183)

El motor alinea el **contrato espacial/eléctrico 2.8** en release: **sin electricidad jugable**, **sin needEnergy**, **sin state.energy activo**, **generator/solar fuera del catálogo**, migración legacy → storage. Este documento deja de afirmar CONFLICT P0 sobre needEnergy/generator en catálogo.

*Fuente diseño: `GAME_MASTER.md` 2.8 · PLAN 2.8 · DEVELOPMENT_LOG ZZ-180…183.*

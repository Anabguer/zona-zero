# AUDIT_ENGINE — Motor vs GAME_MASTER 2.5

**Fecha:** 2026-08-15 · **Diseño:** GAME_MASTER 2.5 · **Thoroughness:** medium  
**Alcance:** `js/*` + `content/*.json` (runtime). Scripts/docs solo si afectan load path.

**Leyenda estado:** `OK` · `PARTIAL` · `STUB` · `CONFLICT` · `MISSING`  
**Deuda:** `KEEP` · `EXTEND` · `REWRITE` · `REMOVE`  
**Prioridad:** P0 (rompe 2.5 / load path muerto) → P3 (pulido)

---

## Matriz por sistema

| Sistema | Status | Archivos clave | Deuda | P | Notas vs 2.5 |
|---------|--------|----------------|-------|---|--------------|
| **Population** | OK | `js/population.js`, `js/state.js`, `js/sim.js` (`populationTick`) | KEEP | P2 | Total + sick/injured/dependents; births/immigrants; workforce resta enfermos/heridos. Falta `outbreakSeverity` / exposición fría (ver brotes/clima). |
| **Labor / staffing** | PARTIAL | `js/colony.js`, `js/population.js`, `js/main.js` | EXTEND | P1 | Workers por edificio + sync a categorías; UI ± en ficha. Dual legacy (categorías + edificios) aún vivo. Sin research-staff explícito ni labor `per_building` en `balance.json`. |
| **Housing** | PARTIAL | `content/buildings.json` (shelter/house/block/HQ), `js/state.js` `housingCapacity` | EXTEND | P1 | Capacidad Σ housing OK; overflow gracia. **MISSING** `insulated_house`, `block_reinforced`, `protecciónClimática`. |
| **Climate / wood heating** | CONFLICT | `js/sim.js` (`weatherMod`, `fuelNeed`), `js/director.js` (weather events), `js/main.js` HUD weather | REWRITE | **P0** | Clima = estado puntual vía eventos + malus prod. **No** calefacción madera auto, ni `exposiciónAlFrío`, ni aviso previo. **Fuel diario de colonia** (`fuelPerDayBase`/`fuelPerPersonPerDay`) contradice 2.5 (fuel solo vehículos). |
| **Resources (energy/fuel/wood)** | CONFLICT | `content/balance.json`, `js/state.js`, `js/sim.js` | REWRITE | **P0** | Principales OK (food/water/wood/metal/meds/fuel/ammo). Energy sim activa; `parts`/`tools` en inventario + loot raro; soft-caps food/water parciales (storage suma días; cisterna no soft-cap agua). |
| **Buildings (generator/solar)** | CONFLICT | `content/buildings.json`, `js/icons.js`, `js/sim.js` `applyProduction` | REMOVE | **P0** | `generator`/`solar`/`command` en catálogo jugable; energy± en defs. HQ L2/L3 aún cuestan **fuel** (2.5: sin fuel). Cistern = segundo pozo (`produces.water`). |
| **Research (energy branch, stubs)** | CONFLICT | `content/research.json`, `js/sim.js` `tickResearch`/`startResearch`, `js/state.js` | REWRITE | **P0** | Pipeline días/coste/bench OK. Efectos casi stub (`foodProdBonus` etc. no cableados). IDs legacy (`surv_crops`/`surv_filters`/`def_fortify`) ≠ techs JSON. `power_grid` → `power_hub` (edificio inexistente). Sin workers-en-banco como coste; sin `efficient_heating`/`quarantine_protocol`. |
| **Exploration** | OK | `js/sim.js` (expeditions), `js/explorers.js`, `js/render-map.js` | EXTEND | P2 | Multi-expedición, riesgo/días/loot/control, slots 1–3 por pop/zonas/era. Falta bonus visible del centro; plantillas combinatorias (§20) no. |
| **Vehicles** | PARTIAL | `content/vehicles.json`, `js/sim.js` `buyVehicle`, `js/main.js` | EXTEND | P2 | Compra + garage (≠ bike) + fuel/trip + risk/días. Sin arco repair mecánico profundo; fuel colonia diluye tradeoff. |
| **Defense** | OK | `js/state.js` `defenseValue`, `js/sim.js` `resolveBaseAttack` | EXTEND | P2 | Edificios + staff + patrulla + ammo. Daño HP aleatorio en ataque. Sin repair loop / coste madera-metal explícito. |
| **Outbreaks / health** | STUB | `js/population.js` (`sick`, `healPopulationTick`), medical buildings produce medicine | EXTEND | **P1** | Sick/heal con medicine + labor medicine. **No** brotes probabilísticos, fases, cuarentena pasiva, semáforo ambiental. |
| **Building damage** | PARTIAL | `js/sim.js` (HP en ataque), `js/director.js` `damageBuildingChance`, `js/render-base.js` | EXTEND | P1 | HP 0 = muerto; sin UI daño/estados, sin repair action, sin merma prod por HP parcial. |
| **Radio** | STUB | `content/buildings.json` `radio`, icons | EXTEND | **P1** | Construible + jobs; **cero** efecto en misiones/señales/director weight. |
| **Expedition center** | STUB | `content/buildings.json` `expedition_center`, `js/sim.js` `expeditionPreview` | EXTEND | **P1** | Requiere radio; **cero** Δ riesgo/días/slots en preview. |
| **Missions** | MISSING | `js/colony.js` `currentObjective`, `js/main.js` `paintObjective`, `play.php` `#zz-mission` | EXTEND | P2 | Solo objetivos heurísticos UI (post D5). No `missions[]`, templates, radio missions, cooldowns. |
| **Director / events** | OK | `js/director.js`, `content/events.json` | KEEP | P2 | Threat/tension/force/fragility, familias, cooldowns, quiet nights, choices. Cadencia no fija OK-ish. Radio no pondera; weather effects sin cadena madera. |
| **Eras** | OK | `content/eras.json`, `js/sim.js` `updateEra`, HUD | KEEP | P3 | Unlock por pop/control/tech/día. Alinear umbrales con 2.5 si diverge el JSON. |
| **Victory (`needEnergy`)** | CONFLICT | `content/balance.json` `victory`, `js/sim.js` `checkVictory` | REWRITE | **P0** | `needEnergy: true` + chequeo `energy.produced >= demand`. 2.5: **eliminar**; sustituir por clinic L2+/lab o HQ L3 + defensa. Crisis final sí existe. |
| **Map (zones vs locations)** | PARTIAL | `js/state.js` `loadContent`, `content/locations.json`, `content/zones.json` | EXTEND | P2 | Runtime load: **solo** `locations.json` → deriva `zonesDoc`. `zones.json` sigue en disco + `scripts/smoke.mjs`. Estado usa `state.zones` (OK semántica). |
| **UI / onboarding** | PARTIAL | `js/onboarding.js`, `js/main.js`, `play.php` | EXTEND | P2 | Guía D1 farm→well→staff sólida. Coach/brief/mapa mundo-primero. Sin guía clima/vivienda/madera; mission chip = objective no misiones. |
| **Ambient life** | STUB | `js/render-base.js` (props estáticos) | EXTEND | P3 | Props/ruinas/luz; **no** figuras proporcionales a pop ni semáforo brote/frío (§32B). |

---

## Load-path: eliminar / deprecar (concretos)

| Ítem | Dónde vive hoy | Acción |
|------|----------------|--------|
| **`generator`** | `content/buildings.json`, `js/icons.js` (`paintGenerator`), scripts balance/screenshots | **REMOVE** del catálogo + iconos obligatorios; filtrar UI build |
| **`solar`** | idem | **REMOVE** |
| **`command`** | `buildings.json` (+ icon) | **REMOVE** (rol → HQ) |
| **`power_grid` / unlock `power_hub`** | `content/research.json` | **REMOVE** tech; no existe edificio |
| **`needEnergy`** | `balance.json` → `victory.needEnergy` | **REMOVE** flag + rama en `checkVictory` |
| **`energyDemand` / `state.energy`** | `sim.js` `applyProduction`, `state.js` create/migrate, fuelNeed half-if-energy-ok | **REMOVE** produced/demand loop |
| **`def.energy` ±** | buildings generator/solar (y cualquier demand negativo) | **REMOVE** campos |
| **`secondaryResources` `parts`/`tools`** | `balance.json`, `state.js` `DEFAULT_RESOURCES`, loot raro `sim.js` | **REMOVE** inventario + labels; no spawn en loot |
| **Fuel calefacción/colonia** | `balance.fuelPerDayBase`, `fuelPerPersonPerDay`, `noFuelExtraFoodLoss`, `fuelNeed()` | **REWRITE** → fuel solo trip vehículo (+ repair veh si aplica); quitar burn diario |
| **`zones.json`** | `content/zones.json` (archivo), `scripts/smoke.mjs` load | **DEPRECATE**: no está en `loadContent()`; alinear smoke a `locations.json`; borrar o marcar `DEPRECATED` |
| **HQ L2/L3 `fuel` en cost** | `buildings.json` | **REMOVE** fuel del coste (2.5) |
| **Tech effect dead IDs** | `surv_crops` / `surv_filters` / `def_fortify` en `sim.js`/`state.js` | **REWRITE** a IDs reales o cablear effects schema |

---

## Prioridades de trabajo (orden sugerido)

### P0 — cortar electricidad / alineación recursos
1. Quitar `generator`/`solar`/`command` + energy sim + `needEnergy`.
2. Quitar `parts`/`tools` + `secondaryResources`.
3. Sustituir `fuelNeed` diario por fuel solo logística.
4. Victoria multi-condición sin energía (clinic/HQ3/def).

### P1 — sistemas 2.5 ausentes o stub
5. Wood heating + exposición + avisos; `protecciónClimática` en housing (+ `insulated_house`).
6. Cistern ≠ well (reserva/soft-cap/lluvia; sin prod espejo).
7. Cablear radio (peso misiones/señales) y expedition_center (números en preview).
8. Brotes + quarantine tech; repair visible edificios.

### P2 — extender lo que ya funciona
9. Research effects reales + poda power_* ; workers en bench/lab.
10. Labor model único documentado en balance; missions schema.
11. Deprecar `zones.json` en tests; housing upgrades.

### P3 — feedback / polish
12. Ambient life figures; eras/copy; onboarding clima.

---

## Resumen ejecutivo

El motor **1.3** cubre núcleo jugable (población, staffing por edificio, exploración, director, defensa, eras, victoria/derrota, onboarding D1). Respecto a **GAME_MASTER 2.5**, el mayor **conflicto** es la **cadena eléctrica + fuel-como-calor + victoria `needEnergy`**, aún en load path. Calefacción madera, brotes, daño/repair jugable, radio/centro con roles, cisterna-reserva y vida ambiental están **MISSING/STUB**. Research es **pipeline sin efectos**. Mapa runtime ya es **locations-first**; `zones.json` solo deuda de tests/archivo.

*Fuente diseño: `GAME_MASTER.md` §2–7, §11–12, §18, §20, §32B, §41.13 / auditoría 2.5.*

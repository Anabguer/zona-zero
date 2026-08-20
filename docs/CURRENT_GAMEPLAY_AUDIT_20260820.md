# Auditoría de jugabilidad actual — Zona Zero

**Fecha:** 2026-08-20  
**Fuentes:** `GAME_MASTER.md` 2.8 · código `js/*` · `content/*.json` · piloto `?pilot=neni` / `?qa=1` · propuesta Neni §43  
**Alcance:** SOLO documentación. No se ha tocado gameplay, HUD, assets, mapa ni saves.

> **Regla de lectura:** "existe una función JS" ≠ "funciona".  
> Columnas: **DISEÑADO** · **IMPLEMENTADO EN MOTOR** · **FUNCIONA JUEGO NORMAL** · **FUNCIONA PILOTO NENI** · **ACCESIBLE JUGADOR** · **PROBLEMA ACTUAL**.

**Convención piloto:**

| Modo | Qué implica |
|------|-------------|
| `?pilot=neni` | Terreno canónico, HQ A, onboarding forzado off, build mínimo (house/well/storage) |
| `?pilot=neni&qa=1` | + catálogo footprints aprobados, recursos 9999, era≥2, 3 exploradores, vecinos revealed |

---

## 0. Resumen ejecutivo

| Veredicto | Sistemas |
|-----------|----------|
| **Core real y jugable** | Población, staffing, prod/consumo, comida/agua/madera/metal (flat), place+fichas, exploradores/expediciones, control de zonas, Director, brief diario, estaciones+calefacción madera, daño/repair, defensa/ataques, victoria/derrota |
| **Real pero gated / thin** | Research, radio/misiones, logros, facciones, recuperación de sectores (órfana en piloto), medicine/ammo |
| **Diseño ≠ código espacial** | Forest no alimenta aserradero; scrap no alimenta chatarrería/taller |
| **Pendiente de retirar (propuesta)** | Fuel + vehículos v1 (§43.D) — mapa de deps abajo; **aún no borrado** |
| **§0.2 GAME_MASTER desfasado** | Research/misiones/estaciones ya no son "stub / no sistemas" |

---

## 1. Matriz por sistema

### 1.1 Población
| Campo | Valor |
|-------|-------|
| DISEÑADO | GM §2: contador + estados agregados; sin Sims |
| IMPLEMENTADO EN MOTOR | Sí — `population.js` / `changePopulation` |
| FUNCIONA JUEGO NORMAL | Sí — nace/muere/inmigra en `advanceDay` |
| FUNCIONA PILOTO NENI | Sí (QA fuerza pop≥6) |
| ACCESIBLE JUGADOR | Sí — HUD / panel población |
| PROBLEMA ACTUAL | En piloto no-QA pocas viviendas → cap bajo |

### 1.2 Capacidad vivienda
| Campo | Valor |
|-------|-------|
| DISEÑADO | Σ housing edificios vivos + HQ |
| IMPLEMENTADO EN MOTOR | Sí — `housingCapacity` |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí (HQ 5×4 canónico + houses) |
| ACCESIBLE JUGADOR | Indirecto (overflow / crecimiento) |
| PROBLEMA ACTUAL | Feedback de hacinamiento poco enfatizado en UI |

### 1.3 Staffing por edificio
| Campo | Valor |
|-------|-------|
| DISEÑADO | ± workers en ficha; producción 0 sin staff |
| IMPLEMENTADO EN MOTOR | Sí — `adjustBuildingWorkers` / `syncLaborFromColony` |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí si el edificio tiene `jobs` |
| ACCESIBLE JUGADOR | Sí — tap edificio → sheet |
| PROBLEMA ACTUAL | En piloto no-QA casi solo el pozo pide staff |

### 1.4 Producción diaria
| Campo | Valor |
|-------|-------|
| DISEÑADO | GM §10 según staff + edificio |
| IMPLEMENTADO EN MOTOR | Sí — `applyProduction` |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí (mismo path) |
| ACCESIBLE JUGADOR | Indirecto (brief / stock) |
| PROBLEMA ACTUAL | Flat rates; no enlaza forest/scrap del mapa canónico |

### 1.5 Consumo diario
| Campo | Valor |
|-------|-------|
| DISEÑADO | Comida/agua por pop; calefacción madera en frío |
| IMPLEMENTADO EN MOTOR | Sí — `consumeNeed` + `applyColdWoodHeating` |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Brief / alertas |
| PROBLEMA ACTUAL | Fuel diario de colonia **apagado** por flag (`colonyDailyFuelEnabled: false`) |

### 1.6 Comida
| Campo | Valor |
|-------|-------|
| DISEÑADO | Farm / greenhouse / cocina / loot |
| IMPLEMENTADO EN MOTOR | Sí |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí en sim; farm solo en QA footprints |
| ACCESIBLE JUGADOR | HUD siempre |
| PROBLEMA ACTUAL | Piloto no-QA: sin farm en menú → dependencia de stock/loot |

### 1.7 Agua
| Campo | Valor |
|-------|-------|
| DISEÑADO | Pozo produce; cisterna almacena + lluvia (§43.C confirma) |
| IMPLEMENTADO EN MOTOR | Sí — well `produces.water`; cistern storage + rain |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Well sí; cistern solo QA |
| ACCESIBLE JUGADOR | Sí |
| PROBLEMA ACTUAL | Ninguno de diseño; alinear con §43.C (no recolectores manuales) |

### 1.8 Madera
| Campo | Valor |
|-------|-------|
| DISEÑADO | Aserradero + calefacción; **§43.A: forest como fuente** |
| IMPLEMENTADO EN MOTOR | Sawmill produce wood flat; calefacción sí |
| FUNCIONA JUEGO NORMAL | Produce sin bosque |
| FUNCIONA PILOTO NENI | `forest` = no buildable; **no** input de producción |
| ACCESIBLE JUGADOR | HUD; sawmill gated |
| PROBLEMA ACTUAL | **Gap diseño↔código:** magia de edificio; forest no es fuente |

### 1.9 Metal
| Campo | Valor |
|-------|-------|
| DISEÑADO | Scrapyard clasifica; workshop refina (§43.B) |
| IMPLEMENTADO EN MOTOR | Ambos `produces.metal` flat; loot scrap→metal puntual |
| FUNCIONA JUEGO NORMAL | Sí producen metal |
| FUNCIONA PILOTO NENI | Celdas scrap no-buildable; sin bonus |
| ACCESIBLE JUGADOR | Sí si edificios disponibles |
| PROBLEMA ACTUAL | **Duplicados funcionales**; scrap terreno no alimenta cadena |

### 1.10 Medicina
| Campo | Valor |
|-------|-------|
| DISEÑADO | Infirmary / medkit / loot / brotes |
| IMPLEMENTADO EN MOTOR | Sí |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Edificios médicos en QA; no-QA limitados |
| ACCESIBLE JUGADOR | HUD parcial; ficha médica |
| PROBLEMA ACTUAL | Curva débil sin edificio médico temprano en piloto |

### 1.11 Munición
| Campo | Valor |
|-------|-------|
| DISEÑADO | Defensa / expediciones hostiles |
| IMPLEMENTADO EN MOTOR | Sí |
| FUNCIONA JUEGO NORMAL | Sí en sim |
| FUNCIONA PILOTO NENI | Sí; HUD piloto la muestra |
| ACCESIBLE JUGADOR | **Oculta en HUD normal** |
| PROBLEMA ACTUAL | Recurso invisible en juego normal |

### 1.12 Fuel / vehículos
| Campo | Valor |
|-------|-------|
| DISEÑADO | GM §17. **§43.D: eliminar de v1** |
| IMPLEMENTADO EN MOTOR | Sí — `vehicles.js`, buyVehicle, trip fuel, garage/mech_shop |
| FUNCIONA JUEGO NORMAL | Viajes cobran fuel; gasto diario colonia OFF |
| FUNCIONA PILOTO NENI | Código vivo; garage/mech_shop no en footprints QA |
| ACCESIBLE JUGADOR | Más → vehículos; pick en expedición |
| PROBLEMA ACTUAL | Sistema completo pero Neni lo saca de v1; ver §3 |

### 1.13 Edificios
| Campo | Valor |
|-------|-------|
| DISEÑADO | GM §7 + §9; piloto terreno canónico |
| IMPLEMENTADO EN MOTOR | placeBuilding + slots (normal) / terreno (piloto) |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Free-place world-space; JSON zonas autoridad |
| ACCESIBLE JUGADOR | Construir dock |
| PROBLEMA ACTUAL | Dos modelos espaciales; piloto no-QA catálogo mínimo |

### 1.14 Fichas de edificios
| Campo | Valor |
|-------|-------|
| DISEÑADO | Staff / repair / info |
| IMPLEMENTADO EN MOTOR | openBuildingSheet |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí (tap footprint; drag≠sheet) |
| ACCESIBLE JUGADOR | Sí |
| PROBLEMA ACTUAL | UX a revisar después; lógica base OK |

### 1.15 Exploradores
| Campo | Valor |
|-------|-------|
| DISEÑADO | Máx 3. UI futura §43.E |
| IMPLEMENTADO EN MOTOR | explorers.js |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí; QA fuerza 3 ready |
| ACCESIBLE JUGADOR | Sí — UI actual ancha |
| PROBLEMA ACTUAL | UI no es mock 3 slots; decisión registrada |

### 1.16 Expediciones
| Campo | Valor |
|-------|-------|
| DISEÑADO | 1 explorador / destino |
| IMPLEMENTADO EN MOTOR | startExpedition / resolveExpedition |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí; sin QA zonas unknown difíciles |
| ACCESIBLE JUGADOR | Tap zona discovered |
| PROBLEMA ACTUAL | UI aún ofrece vehículos/fuel; §43.D → a pie |

### 1.17 Landmarks
| Campo | Valor |
|-------|-------|
| DISEÑADO | 18 landmarks |
| IMPLEMENTADO EN MOTOR | Zonas + arte |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Remapeadas; anillos ocultos |
| ACCESIBLE JUGADOR | Mapa |
| PROBLEMA ACTUAL | Remap escala puede dejar landmarks raros sin reveal QA |

### 1.18 Loot
| Campo | Valor |
|-------|-------|
| DISEÑADO | Expedición + eventos |
| IMPLEMENTADO EN MOTOR | Sí |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Brief / log / stock |
| PROBLEMA ACTUAL | Ninguno crítico |

### 1.19 Control de zonas
| Campo | Valor |
|-------|-------|
| DISEÑADO | discovered → controlled |
| IMPLEMENTADO EN MOTOR | Sí |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Mapa |
| PROBLEMA ACTUAL | Anillos visuales reducidos en piloto |

### 1.20 Recuperación territorio (sectores)
| Campo | Valor |
|-------|-------|
| DISEÑADO | Expandir colonia |
| IMPLEMENTADO EN MOTOR | sectors.js + tick |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Tick corre; no acoplado a footprints |
| ACCESIBLE JUGADOR | Normal sí; piloto semi-huérfano |
| PROBLEMA ACTUAL | Sistema paralelo al build piloto |

### 1.21 Clima
| Campo | Valor |
|-------|-------|
| DISEÑADO | GM §11; HUD futuro §43.F |
| IMPLEMENTADO EN MOTOR | weather pending |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Logs/brief — no cabecera |
| PROBLEMA ACTUAL | Motor > UI |

### 1.22 Estaciones
| Campo | Valor |
|-------|-------|
| DISEÑADO | Ciclo estacional |
| IMPLEMENTADO EN MOTOR | tickSeason |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Poco visible en HUD |
| PROBLEMA ACTUAL | Falta cabecera |

### 1.23 Previsiones
| Campo | Valor |
|-------|-------|
| DISEÑADO | Avisos tormenta / frío |
| IMPLEMENTADO EN MOTOR | Pending weather + textos calefacción |
| FUNCIONA JUEGO NORMAL | Parcial |
| FUNCIONA PILOTO NENI | Parcial |
| ACCESIBLE JUGADOR | Alertas/log |
| PROBLEMA ACTUAL | §43.F pide avisos en cabecera |

### 1.24 Salud / brotes
| Campo | Valor |
|-------|-------|
| DISEÑADO | GM §12 |
| IMPLEMENTADO EN MOTOR | outbreaks.js |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Indirecto |
| PROBLEMA ACTUAL | Sin infirmary temprano en piloto no-QA |

### 1.25 Defensa
| Campo | Valor |
|-------|-------|
| DISEÑADO | Perímetro |
| IMPLEMENTADO EN MOTOR | defenseValue |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí; pocas defensas en no-QA |
| ACCESIBLE JUGADOR | Indirecto |
| PROBLEMA ACTUAL | Piloto frágil ante ataques |

### 1.26 Ataques
| Campo | Valor |
|-------|-------|
| DISEÑADO | Aviso → combate |
| IMPLEMENTADO EN MOTOR | Director → resolveBaseAttack |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Cartas |
| PROBLEMA ACTUAL | Ninguno de motor |

### 1.27 Daño edificios
| Campo | Valor |
|-------|-------|
| DISEÑADO | Estados estructurales |
| IMPLEMENTADO EN MOTOR | buildings-damage.js |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Ficha |
| PROBLEMA ACTUAL | Ninguno crítico |

### 1.28 Reparación
| Campo | Valor |
|-------|-------|
| DISEÑADO | Coste + tiempo |
| IMPLEMENTADO EN MOTOR | Repair sheet + tick |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Botón Reparar |
| PROBLEMA ACTUAL | Ninguno crítico |

### 1.29 Research
| Campo | Valor |
|-------|-------|
| DISEÑADO | Techs útiles + workers |
| IMPLEMENTADO EN MOTOR | research.js + effects |
| FUNCIONA JUEGO NORMAL | Sí si hay banco |
| FUNCIONA PILOTO NENI | tech_bench/lab no en footprints QA |
| ACCESIBLE JUGADOR | Más (si edificio) |
| PROBLEMA ACTUAL | Acceso gated; fuelSaveBonus stub |

### 1.30 Radio
| Campo | Valor |
|-------|-------|
| DISEÑADO | Gatea eventos |
| IMPLEMENTADO EN MOTOR | radio.js |
| FUNCIONA JUEGO NORMAL | Sí con radio |
| FUNCIONA PILOTO NENI | Radio en QA footprints |
| ACCESIBLE JUGADOR | Más |
| PROBLEMA ACTUAL | Piloto no-QA sin radio |

### 1.31 Misiones
| Campo | Valor |
|-------|-------|
| DISEÑADO | Guías / SOS |
| IMPLEMENTADO EN MOTOR | missions.js |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Más / alertas |
| PROBLEMA ACTUAL | §0.2 GM obsoleto |

### 1.32 Logros
| Campo | Valor |
|-------|-------|
| DISEÑADO | Badges |
| IMPLEMENTADO EN MOTOR | achievements.js |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Más |
| PROBLEMA ACTUAL | ach_first_vehicle vs §43.D |

### 1.33 Facciones / contactos
| Campo | Valor |
|-------|-------|
| DISEÑADO | Ligeras / trueque |
| IMPLEMENTADO EN MOTOR | factions.js |
| FUNCIONA JUEGO NORMAL | Thin pero real |
| FUNCIONA PILOTO NENI | Igual |
| ACCESIBLE JUGADOR | Tras discover |
| PROBLEMA ACTUAL | Sin sim diaria (acorde GM) |

### 1.34 Director
| Campo | Valor |
|-------|-------|
| DISEÑADO | Imprevisibilidad |
| IMPLEMENTADO EN MOTOR | runDirector cada día |
| FUNCIONA JUEGO NORMAL | Sí — de los más vivos |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Eventos |
| PROBLEMA ACTUAL | Ninguno |

### 1.35 Eras
| Campo | Valor |
|-------|-------|
| DISEÑADO | 0–4 |
| IMPLEMENTADO EN MOTOR | updateEraByIndicators |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | QA fuerza era≥2 |
| ACCESIBLE JUGADOR | Desbloqueos |
| PROBLEMA ACTUAL | En piloto no-QA era irrelevante para build |

### 1.36 Victoria
| Campo | Valor |
|-------|-------|
| DISEÑADO | Umbrales |
| IMPLEMENTADO EN MOTOR | checkVictoryMulti |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Código sí |
| ACCESIBLE JUGADOR | Pantalla victoria |
| PROBLEMA ACTUAL | No es objetivo del piloto |

### 1.37 Derrota
| Campo | Valor |
|-------|-------|
| DISEÑADO | Pop 0 / HQ perdido |
| IMPLEMENTADO EN MOTOR | checkDefeatState |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Pantalla derrota |
| PROBLEMA ACTUAL | Ninguno |

### 1.38 Brief diario
| Campo | Valor |
|-------|-------|
| DISEÑADO | Ritual post-día |
| IMPLEMENTADO EN MOTOR | buildDayBrief |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Tras Avanzar día |
| PROBLEMA ACTUAL | Ninguno |

### 1.39 Tutorial / onboarding
| Campo | Valor |
|-------|-------|
| DISEÑADO | Coach contextual |
| IMPLEMENTADO EN MOTOR | onboarding.js |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | **Forzado OFF** |
| ACCESIBLE JUGADOR | Normal sí; piloto no |
| PROBLEMA ACTUAL | Piloto salta aprendizaje |

### 1.40 Ayuda
| Campo | Valor |
|-------|-------|
| DISEÑADO | Reconsulta |
| IMPLEMENTADO EN MOTOR | help.js |
| FUNCIONA JUEGO NORMAL | Sí |
| FUNCIONA PILOTO NENI | Sí |
| ACCESIBLE JUGADOR | Más |
| PROBLEMA ACTUAL | Puede citar vehículos/fuel |

### 1.41 Habitantes ambientales / vida visual
| Campo | Valor |
|-------|-------|
| DISEÑADO | Vida agregada; cuadrillas futuras §43.A |
| IMPLEMENTADO EN MOTOR | ambient-life.js |
| FUNCIONA JUEGO NORMAL | Sí visual |
| FUNCIONA PILOTO NENI | Sí visual |
| ACCESIBLE JUGADOR | Solo ojos |
| PROBLEMA ACTUAL | Cosmético; no economía |

---

## 2. PROPUESTA NENI 2026-08-20 — estado registro

Registrada en `GAME_MASTER.md` **§43**.

| ID | Tema | Acción código ahora |
|----|------|---------------------|
| A | Madera ← forest + cuadrillas aserradero | Ninguna — pendiente bloque |
| B | Scrap → chatarrería → taller → metal | Ninguna — auditar scrap primero |
| C | Agua: pozo + cisterna; no recolectores | Ninguna — mantener |
| D | Quitar fuel + vehículos v1 | Ninguna — mapa deps; no borrar aún |
| E | UI 3 slots exploradores | Ninguna — UI futura |
| F | HUD Día · estación · clima · avisos | Ninguna — dirección |
| G | Método: 1 bloque → commit → PARAR | Operativo |

---

## 3. Mapa de dependencias FUEL / VEHICLES (pre-eliminación)

> Pedido §43.D: mapa **antes** de borrar. Este commit **no elimina** código.

### 3.1 Archivos núcleo

| Archivo | Rol |
|---------|-----|
| js/vehicles.js | garage, mech_shop, tripFuelCost, usable, repair |
| js/sim.js | expedition fuel; buyVehicle; loot fuel |
| js/main.js | UI comprar/reparar/pick-vehicle |
| js/explorers.js | vehicleId |
| js/state.js | resources.fuel, vehiclesOwned |
| js/hud-resources.js | fuel en HUD solo piloto |
| js/pilot-test.js | QA fuel 9999 |
| js/achievements.js | vehicles_ge |
| js/research.js | fuelSaveBonus copy (sin apply) |
| js/icons.js / art.js / help.js | iconos / tips |
| content/vehicles.json | bike/car/van/armored |
| content/buildings.json | garage, mech_shop |
| content/balance.json | colonyDailyFuelEnabled: false |
| content/research.json | costes tech con fuel |
| content/events.json | rewards/effects fuel |
| content/locations.json / missions.json / factions.json | loot/wants fuel |
| content/achievements.json | ach_first_vehicle |
| js/pilot-footprints.js | garage/mech_shop provisionales |

### 3.2 Símbolos a barrer en bloque futuro

fuel · vehiclesOwned · buyVehicle · repairVehicle · garage · mech_shop · vehicleId · tripFuelCost · fuelPerTrip · vehicleUsable · colonyDailyFuelEnabled · fuelSaveBonus · ach_first_vehicle

### 3.3 Qué NO es fuel

- Calefacción = **madera**.  
- Props visuales vehicle wreck ≠ sistema de vehículos.

---

## 4. Orden propuesto de recuperación (SOLO orden)

### P0 — Puedo jugar y entender qué hacer
1. Objetivo inmediato (brief + coach ligero).  
2. Cabecera: colonia + día (+ hueco §43.F).  
3. Avanzar día → brief → stock comida/agua/madera.  
4. Fichas + staffing OK en piloto.

### P1 — Edificios y staffing
1. Catálogo alineado al loop (no solo QA).  
2. Staffing con consecuencia.  
3. Fichas con prod/consumo/capacidad mínima.

### P2 — Exploración (sin vehículos)
1. Expediciones a pie canónicas (§43.D).  
2. Landmarks/control/loot claros.  
3. UI exploradores compacta (§43.E) después del flujo.

### P3 — Producción / recolección espacial
1. Madera: forest → aserradero/cuadrillas (§43.A).  
2. Metal: scrap → chatarrería → taller (§43.B).  
3. Agua: pozo/cisterna (§43.C).

### P4 — Clima / crisis / presión
1. Estaciones/clima/previsiones en HUD (§43.F).  
2. Calefacción madera + avisos visibles.  
3. Brotes/defensa/ataques con aviso a tiempo.

### P5 — Sistemas gated / late
1. Research accesible.  
2. Radio / misiones / facciones.  
3. Sectores: acoplar a piloto o aparcar.

### P6 — Limpieza v1
1. Eliminar fuel/vehículos tras HUMAN_GATE §3.  
2. Limpiar logros/techs/eventos fuel.  
3. Actualizar §0.2 GM y ayuda.

### P7 — Victoria / pulido / arte ambiental
1. Feedback victoria/derrota.  
2. Ambient life / rutas cuadrillas (§43.A–B).  
3. No rediseñar HUD entero hasta P0–P4 firmes.

---

## 5. Diez hallazgos principales

1. Motor supervivencia diario es **real** (prod/consumo/staff/población/brief).  
2. §0.2 GAME_MASTER **desactualizado** (research/misiones/estaciones sí existen).  
3. Forest/scrap del JSON piloto **no alimentan economía** — solo colocación.  
4. Scrapyard ≈ workshop en metal flat — choca con §43.B.  
5. Fuel/vehículos implementados pero Neni los saca de v1 — mapa deps listo; no borrar aún.  
6. Piloto no-QA **recorta el loop** (3 edificios, onboarding off).  
7. Piloto QA engorda build pero no sustituye tutorial/loop enseñable.  
8. Clima/estaciones corren en sim pero casi no se ven en cabecera.  
9. Sectores semi-huérfanos en piloto (build world-space).  
10. Loop recuperable más barato: staffing + brief + comida/agua + exploración a pie — antes que rediseño HUD.

---

## 6. Referencias rápidas

| Tema | Entradas |
|------|----------|
| Día | js/sim.js → advanceDay |
| Prod | js/colony.js → applyProduction |
| Piloto terreno | js/pilot-terrain.js, content/pilot/neni-pilot-zones-v3.json |
| HQ canónico A | js/main.js — anchor (-7,14) / world (824,520) |
| Vehículos | js/vehicles.js, content/vehicles.json |
| Onboarding off piloto | js/main.js onboardingDone=true |

---

*Fin auditoría 2026-08-20. HUMAN_GATE ChatGPT/Neni antes de cualquier bloque de código.*

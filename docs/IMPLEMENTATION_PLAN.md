> **ERRATA 2.4 (obligatoria):** Electricidad eliminada de v1. Fases/techs/edificios `generator`/`solar`/`power_*`/`needEnergy` quedan **INVALIDADAS o a reescribir** como reparación/clínica/HQ. Calefacción = madera. Research = workers en banco/lab. Brotes/daño/vida visual/misiones plantilla = nuevos requisitos de diseño antes de implementar.

# Zona Zero — Plan de implementación técnico (Diseño 2.1)

**Estado:** Contrato de ejecución — **NO IMPLEMENTAR** hasta que ChatGPT apruebe GAME_MASTER + este plan (fase ZZ-001).  
**Protocolo:** `ZONA_ZERO_DEVELOPMENT_LOG.md` (Drive) / `docs/DEVELOPMENT_LOG.md` (repo).  
**Stack:** HTML/CSS/JS + PHP + MySQL · contenido en `content/*.json`.  
**IDs:** `ZZ-XXX` (orden numérico + dependencias).

---

## 0. Reglas de ejecución (Cursor ↔ ChatGPT)

1. Leer GAME_MASTER 2.1 antes de cada fase.  
2. Tras cada fase: tests → capturas si aplica → commit → push → actualizar DEVELOPMENT_LOG → `ESTADO REVISIÓN: PENDIENTE DE REVISIÓN`.  
3. Continuar a la siguiente **solo si** no hay `HUMAN_GATE: YES` pendiente de `APROBADA` + `APROBACIÓN FINAL CHATGPT: SÍ`.  
4. Silencio / “se ve mejor” / tests verdes **NO** son aprobación.  
5. No hardcodear balance en UI.  
6. No deploy salvo orden explícita (ZZ-183).  
7. Drive y GitHub siempre sincronizados en los 3 docs maestros.

### HUMAN_GATE (lista canónica)

- ZZ-001
- ZZ-010
- ZZ-012
- ZZ-014
- ZZ-015
- ZZ-021
- ZZ-023
- ZZ-032
- ZZ-045
- ZZ-065
- ZZ-073
- ZZ-082
- ZZ-106
- ZZ-125
- ZZ-133
- ZZ-144
- ZZ-150
- ZZ-154
- ZZ-161
- ZZ-165
- ZZ-173
- ZZ-183

**Total fases:** 100  
**Con HUMAN_GATE:** 22

---

## 1. Índice por bloque

| Bloque | Fases | Gates |
|--------|-------|-------|
| A · Fundación | ZZ-001, ZZ-002, ZZ-003, ZZ-004, ZZ-005, ZZ-006 (6) | ZZ-001 |
| B · Experiencia D1 | ZZ-010, ZZ-011, ZZ-012, ZZ-013, ZZ-014, ZZ-015 (6) | ZZ-010, ZZ-012, ZZ-014, ZZ-015 |
| C · Loop D2–D5 | ZZ-020, ZZ-021, ZZ-022, ZZ-023, ZZ-024, ZZ-025, ZZ-026, ZZ-027 (8) | ZZ-021, ZZ-023 |
| D · Necesidades y vivienda | ZZ-030, ZZ-031, ZZ-032, ZZ-033, ZZ-034, ZZ-035 (6) | ZZ-032 |
| E · Estaciones y clima | ZZ-040, ZZ-041, ZZ-042, ZZ-043, ZZ-044, ZZ-045 (6) | ZZ-045 |
| F · Salud | ZZ-050, ZZ-051, ZZ-052, ZZ-053 (4) | — |
| G · Defensa e infectados | ZZ-060, ZZ-061, ZZ-062, ZZ-063, ZZ-064, ZZ-065 (6) | ZZ-065 |
| H · Territorio | ZZ-070, ZZ-071, ZZ-072, ZZ-073 (4) | ZZ-073 |
| I · Investigación | ZZ-080, ZZ-081, ZZ-082, ZZ-083 (4) | ZZ-082 |
| J · Vehículos | ZZ-090, ZZ-091, ZZ-092, ZZ-093 (4) | — |
| K · Misiones | ZZ-100, ZZ-101, ZZ-102, ZZ-103, ZZ-104, ZZ-105, ZZ-106 (7) | ZZ-106 |
| L · Logros | ZZ-110, ZZ-111, ZZ-112, ZZ-113 (4) | — |
| M · Eventos / Director 2.1 | ZZ-120, ZZ-121, ZZ-122, ZZ-123, ZZ-124, ZZ-125 (6) | ZZ-125 |
| N · Otros humanos | ZZ-130, ZZ-131, ZZ-132, ZZ-133 (4) | ZZ-133 |
| O · Eras y victoria | ZZ-140, ZZ-141, ZZ-142, ZZ-143, ZZ-144 (5) | ZZ-144 |
| P · UX mundo completa | ZZ-150, ZZ-151, ZZ-152, ZZ-153, ZZ-154 (5) | ZZ-150, ZZ-154 |
| Q · Arte y audio | ZZ-160, ZZ-161, ZZ-162, ZZ-163, ZZ-164, ZZ-165 (6) | ZZ-161, ZZ-165 |
| R · Simulador y balance | ZZ-170, ZZ-171, ZZ-172, ZZ-173 (4) | ZZ-173 |
| S · Producción / release | ZZ-180, ZZ-181, ZZ-182, ZZ-183, ZZ-184 (5) | ZZ-183 |

---

## 2. Grafo de dependencias (resumen)

```
ZZ-001 (GATE diseño)
  ├─ ZZ-002 → ZZ-003 → ZZ-004/ZZ-005 → ZZ-006
  └─ ZZ-010…ZZ-015 (GATE D1) → ZZ-020…ZZ-027
        ├─ ZZ-030…ZZ-035 vivienda
        ├─ ZZ-040…ZZ-045 clima (GATE invierno)
        ├─ ZZ-050…ZZ-053 salud
        ├─ ZZ-060…ZZ-065 defensa (GATE)
        ├─ ZZ-070…ZZ-073 territorio (GATE mapa)
        ├─ ZZ-080…ZZ-083 research
        ├─ ZZ-090…ZZ-093 vehículos
        ├─ ZZ-100…ZZ-106 misiones (GATE)
        ├─ ZZ-110…ZZ-113 logros
        ├─ ZZ-120…ZZ-125 director (GATE)
        ├─ ZZ-130…ZZ-133 humanos (GATE go/no-go)
        ├─ ZZ-140…ZZ-144 victoria (GATE)
        ├─ ZZ-150…ZZ-154 UX (GATE)
        ├─ ZZ-160…ZZ-165 arte (GATE)
        ├─ ZZ-170…ZZ-173 sim (GATE)
        └─ ZZ-180…ZZ-184 release (GATE deploy)
```

---

## 3. Fases detalladas


## A · Fundación

### ZZ-001 — Aprobar contrato de diseño 2.1

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Congelar GAME_MASTER + IMPLEMENTATION_PLAN + protocolo DEVELOPMENT_LOG como contrato antes de código. |
| **Sistemas** | documentación, gobernanza |
| **Dependencias** | ninguna |
| **Archivos approx.** | GAME_MASTER.md, docs/IMPLEMENTATION_PLAN.md, docs/DEVELOPMENT_LOG.md |
| **Datos/contenido** | GAME_MASTER.md, docs/IMPLEMENTATION_PLAN.md, docs/DEVELOPMENT_LOG.md |
| **Assets** | ninguno |
| **Pruebas automáticas** | n/a |
| **Pruebas funcionales** | Revisión humana exhaustiva de diseño |
| **Revisión visual** | No |

**Tareas concretas:**
- ChatGPT revisa ZONA_ZERO_GAME_MASTER.md completo
- ChatGPT revisa ZONA_ZERO_IMPLEMENTATION_PLAN.md completo
- Marcar APROBADA en DEVELOPMENT_LOG solo tras revisión literal

**Criterio exacto de aceptación:**
- ESTADO REVISIÓN: APROBADA en ZZ-001
- APROBACIÓN FINAL CHATGPT: SÍ
- Autorización explícita a implementar ZZ-002+

### ZZ-002 — Auditoría motor vs diseño 2.1

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Matriz código↔diseño: conservar / reescribir / deprecar / borrar. |
| **Sistemas** | motor, deuda técnica |
| **Dependencias** | ZZ-001 |
| **Archivos approx.** | docs/AUDIT_ENGINE.md |
| **Datos/contenido** | content/*.json, balance.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | node scripts existentes de smoke no regresan |
| **Pruebas funcionales** | Documento AUDIT_ENGINE completo y priorizado |
| **Revisión visual** | No |

**Tareas concretas:**
- Inventariar js/*, content/*, css/*, assets
- Marcar cada sistema: OK / PARCIAL / STUB / CONFLICTO
- Escribir docs/AUDIT_ENGINE.md

**Criterio exacto de aceptación:**
- Lista priorizada sin cambios de gameplay aún
- Conflictos explícitos (labor dual, wall/power_hub, etc.)

### ZZ-003 — Schemas de contenido unificados

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Documentar schemas JSON para buildings, research, seasons, missions, achievements, housingClimate. |
| **Sistemas** | content, balance |
| **Dependencias** | ZZ-002 |
| **Archivos approx.** | docs/CONTENT_SCHEMA.md |
| **Datos/contenido** | schemas documentados |
| **Assets** | ninguno |
| **Pruebas automáticas** | n/a |
| **Pruebas funcionales** | Schema cubre todos los sistemas 2.1 |
| **Revisión visual** | No |

**Tareas concretas:**
- docs/CONTENT_SCHEMA.md
- Campos obligatorios + opcionales
- Notas de migración save

**Criterio exacto de aceptación:**
- CONTENT_SCHEMA.md revisable por ChatGPT

### ZZ-004 — Una sola fuente de mapa

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Deprecar zones.json del load path; locations.json canónico. |
| **Sistemas** | mapa, loadContent |
| **Dependencias** | ZZ-003 |
| **Archivos approx.** | js/content-loader.js, content/zones.json |
| **Datos/contenido** | locations.json, zones.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | loadContent + partida nueva sin error |
| **Pruebas funcionales** | Mapa usa solo locations |
| **Revisión visual** | No |

**Tareas concretas:**
- Auditar referencias zones.json
- Documentar migración
- Quitar load path o stub seguro

**Criterio exacto de aceptación:**
- Una fuente de landmarks activa

### ZZ-005 — Skeleton balance 2.1

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Añadir secciones seasons, housingClimate, missions, laborModel, achievements en balance sin cambiar UX visible. |
| **Sistemas** | balance |
| **Dependencias** | ZZ-003 |
| **Archivos approx.** | content/balance.json |
| **Datos/contenido** | balance.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | loadContent OK; smoke partida nueva |
| **Pruebas funcionales** | Campos nuevos leídos o ignorados sin crash |
| **Revisión visual** | No |

**Tareas concretas:**
- Extender balance.json con defaults seguros
- Defaults no alteran D1 visual

**Criterio exacto de aceptación:**
- laborModel=per_building documentado
- Sin regresión visual

### ZZ-006 — Protocolo sync Drive ↔ GitHub

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Automatizar/copiar los 3 docs maestros a Drive y repo con hash idéntico. |
| **Sistemas** | documentación |
| **Dependencias** | ZZ-001 |
| **Archivos approx.** | scripts/sync-game-master-drive.mjs |
| **Datos/contenido** | tres docs Drive |
| **Assets** | ninguno |
| **Pruebas automáticas** | hash Drive === hash repo |
| **Pruebas funcionales** | ChatGPT puede abrir los 3 en Drive |
| **Revisión visual** | No |

**Tareas concretas:**
- Mantener scripts/sync-game-master-drive.mjs
- Incluir DEVELOPMENT_LOG en sync
- Verificar hashes

**Criterio exacto de aceptación:**
- Sync reproducible


## B · Experiencia D1

### ZZ-010 — Colonia física D1 sin GIS

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Colonia legible al entrar: sin círculo/polígono territorio; suelo orgánico bajo edificios. |
| **Sistemas** | render-map, UX D1, arte terreno |
| **Dependencias** | ZZ-001, ZZ-005 |
| **Archivos approx.** | js/render-map.js, css/game.css, css/world.css |
| **Datos/contenido** | — |
| **Assets** | props colonia si faltan |
| **Pruebas automáticas** | smoke-d1 |
| **Pruebas funcionales** | Usuario reconoce colonia en ≤3 s |
| **Revisión visual** | Sí — docs/review + Drive Review |

**Tareas concretas:**
- Eliminar/ocultar look GIS en viewport inicial
- Props/restos discretos
- Edificios a escala protagonista

**Criterio exacto de aceptación:**
- Sin círculo marrón dominante
- Sin rejilla GIS obvia en D1

### ZZ-011 — Cámara D1 protagonista

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Zoom/pan/recenter que no pierdan la colonia. |
| **Sistemas** | cámara, mapa |
| **Dependencias** | ZZ-010 |
| **Archivos approx.** | js/render-map.js, js/main.js |
| **Datos/contenido** | balance camera si aplica |
| **Assets** | ninguno |
| **Pruebas automáticas** | smoke cámara |
| **Pruebas funcionales** | Recentrar siempre útil en móvil y desktop |
| **Revisión visual** | Sí — capturas móvil+desktop |

**Tareas concretas:**
- Zoom inicial ~colonia
- Recentrar fiable
- Límites de pan

**Criterio exacto de aceptación:**
- Colonia centrada al inicio
- No vacío confuso en desktop

### ZZ-012 — Tutorial D1 por acciones

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Intro → huerto → colocar → staff → (pozo); una acción/explicación. |
| **Sistemas** | onboarding, misiones guía |
| **Dependencias** | ZZ-010 |
| **Archivos approx.** | js/onboarding.js, js/main.js |
| **Datos/contenido** | textos guía |
| **Assets** | ninguno |
| **Pruebas automáticas** | smoke onboarding steps |
| **Pruebas funcionales** | Jugador completa D1 sin modal spam |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Quitar cascada Continuar
- Coach ligado a acciones
- Cierre natural

**Criterio exacto de aceptación:**
- Sin cascada Continuar
- Una explicación por acción

### ZZ-013 — HUD recursos D1 comprensible

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Nombres legibles comida/agua; sin Au/Gu/A/D crudos. |
| **Sistemas** | HUD, recursos |
| **Dependencias** | ZZ-010 |
| **Archivos approx.** | js/main.js, css/game.css |
| **Datos/contenido** | resourceOrder |
| **Assets** | iconos recursos si faltan |
| **Pruebas automáticas** | HUD labels presentes |
| **Pruebas funcionales** | Jugador entiende stock en 5 s |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Labels claros
- Tooltips/tap toast
- Prioridad comida/agua

**Criterio exacto de aceptación:**
- Sin abreviaturas opacas en D1

### ZZ-014 — Layout desktop 1920 D1

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Panel lateral + mundo legible; no escritorio vacío. |
| **Sistemas** | UX desktop |
| **Dependencias** | ZZ-011, ZZ-013 |
| **Archivos approx.** | css/world.css, css/game.css |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | screenshot desktop |
| **Pruebas funcionales** | Colonia + panel visibles |
| **Revisión visual** | Sí — desktop obligatorio |

**Tareas concretas:**
- Composición desktop
- Dock/panel
- QA 1920×1080

**Criterio exacto de aceptación:**
- Desktop no se siente vacío
- Móvil intacto

### ZZ-015 — QA D1 + contact sheet + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Cerrar bloque D1 con tests, capturas, sync Review, parar hasta aprobación. |
| **Sistemas** | QA, review |
| **Dependencias** | ZZ-010, ZZ-011, ZZ-012, ZZ-013, ZZ-014 |
| **Archivos approx.** | docs/review/, scripts/review-shots.mjs |
| **Datos/contenido** | — |
| **Assets** | docs/review/* |
| **Pruebas automáticas** | smoke-d1; save/load |
| **Pruebas funcionales** | Partida nueva real D1 |
| **Revisión visual** | Sí — gate humano |

**Tareas concretas:**
- Smoke D1 save/load
- Capturas móvil+desktop
- review-contact-sheet
- Actualizar DEVELOPMENT_LOG
- PARAR hasta APROBADA

**Criterio exacto de aceptación:**
- Contact sheet regenerado
- ESTADO REVISIÓN pendiente hasta ChatGPT
- No avanzar a ZZ-020 sin APROBADA


## C · Loop D2–D5

### ZZ-020 — Brief diario ritual

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Al avanzar día: comida/agua producida·consumida·balance + hechos. |
| **Sistemas** | sim, UX brief |
| **Dependencias** | ZZ-015 |
| **Archivos approx.** | js/sim.js, js/main.js |
| **Datos/contenido** | balance consumo |
| **Assets** | ninguno |
| **Pruebas automáticas** | brief tras nextDay |
| **Pruebas funcionales** | Jugador entiende balance diario |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Card/sheet brief
- Datos reales de sim
- No spam

**Criterio exacto de aceptación:**
- Brief siempre tras avanzar día
- Números coherentes

### ZZ-021 — Staffing por edificio canónico

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Modelo único labor: +/- en ficha edificio; resumen población solo lectura. |
| **Sistemas** | colony, labor |
| **Dependencias** | ZZ-020 |
| **Archivos approx.** | js/colony.js, js/main.js |
| **Datos/contenido** | laborModel |
| **Assets** | ninguno |
| **Pruebas automáticas** | staff cambia producción |
| **Pruebas funcionales** | Con 12 pop: asignar farm/well/defensa intuitivo |
| **Revisión visual** | Sí |

**Tareas concretas:**
- UI ficha workers
- Eliminar/ocultar asignación dual por categorías como primaria
- Autoasignar opcional

**Criterio exacto de aceptación:**
- Un solo modelo de asignación
- Sin micromanejo doble

### ZZ-022 — Exploración D3–D5 mínima

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Reveal → ficha → enviar → ruta → retorno; sin research/vehículos en tutorial. |
| **Sistemas** | exploración, mapa |
| **Dependencias** | ZZ-020 |
| **Archivos approx.** | js/explore.js, js/main.js |
| **Datos/contenido** | locations.json |
| **Assets** | landmarks si faltan |
| **Pruebas automáticas** | expedition roundtrip |
| **Pruebas funcionales** | Primera salida en D3–D5 jugable |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Flujo completo primer landmark
- Informe retorno
- Riesgo/botín legibles

**Criterio exacto de aceptación:**
- Sin forzar research
- Feedback ida/vuelta

### ZZ-023 — QA bloque D1→D5

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Validar loop core hasta D5; gate humano. |
| **Sistemas** | QA |
| **Dependencias** | ZZ-020, ZZ-021, ZZ-022 |
| **Archivos approx.** | docs/review/ |
| **Datos/contenido** | — |
| **Assets** | docs/review |
| **Pruebas automáticas** | smoke D5 |
| **Pruebas funcionales** | Partida guiada D1–D5 |
| **Revisión visual** | Sí — gate |

**Tareas concretas:**
- Capturas D2–D5
- Smoke
- PARAR si HUMAN_GATE

**Criterio exacto de aceptación:**
- Loop estable
- APROBADA antes de sistemas mid

### ZZ-024 — Construcción flujo selecciono→coloco→construyen

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Lista filtrada, preview fantasma solo en modo build, pago recursos, aparece edificio. |
| **Sistemas** | construcción |
| **Dependencias** | ZZ-021 |
| **Archivos approx.** | js/build.js |
| **Datos/contenido** | buildings.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | place building |
| **Pruebas funcionales** | D1 farm place |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §9
- Sin Tetris
- Radio colocación cluster

**Criterio exacto de aceptación:**
- Preview solo en build mode

### ZZ-025 — Crecimiento población abstracto

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Inmigración/rescates/natalidad rara según §26; límites housing/food. |
| **Sistemas** | población |
| **Dependencias** | ZZ-030 |
| **Archivos approx.** | js/sim.js |
| **Datos/contenido** | balance immigration |
| **Assets** | ninguno |
| **Pruebas automáticas** | immigration gates |
| **Pruebas funcionales** | Sin housing no crece |
| **Revisión visual** | No |

**Tareas concretas:**
- §26

**Criterio exacto de aceptación:**
- Sin parejas Sims

### ZZ-026 — Feedback acciones importantes

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Toast/log/card por construir, explorar, ataque, tech, era, logro. |
| **Sistemas** | feedback, UX |
| **Dependencias** | ZZ-020 |
| **Archivos approx.** | js/ui-feedback.js |
| **Datos/contenido** | — |
| **Assets** | sfx opcionales |
| **Pruebas automáticas** | events emit |
| **Pruebas funcionales** | Cada acción clave tiene feedback |
| **Revisión visual** | Parcial |

**Tareas concretas:**
- §32 matriz

**Criterio exacto de aceptación:**
- Matriz §32 cubierta

### ZZ-027 — Exploradores: recluta, muerte, dolor

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Máx 3; muerte permanente; recluta desde pop; nuevo verde. |
| **Sistemas** | exploradores |
| **Dependencias** | ZZ-022 |
| **Archivos approx.** | js/explorers.js |
| **Datos/contenido** | survivors names, balance explorers |
| **Assets** | retratos |
| **Pruebas automáticas** | death permanent; recruit cooldown |
| **Pruebas funcionales** | Perder explorador duele |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §3

**Criterio exacto de aceptación:**
- No RPG partido
- Nombre editable


## D · Necesidades y vivienda

### ZZ-030 — Capacidad vivienda + overflow

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Necesidades y vivienda |
| **HUMAN_GATE** | NO |
| **Objetivo** | Capacidad = Σ housing; overflow frena crecimiento y baja estabilidad. |
| **Sistemas** | vivienda, población |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | content/buildings.json, js/sim.js, js/colony.js |
| **Datos/contenido** | buildings.json, balance housingClimate |
| **Assets** | ninguno |
| **Pruebas automáticas** | unit housing math |
| **Pruebas funcionales** | Escenarios overflow / frío avisado |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar según GAME_MASTER §4–5
- Tests numéricos
- UI mínima

**Criterio exacto de aceptación:**
- Cumple §4–5
- Sin micromanejo alquiler

### ZZ-031 — Protección climática por tipo

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Necesidades y vivienda |
| **HUMAN_GATE** | NO |
| **Objetivo** | Campo climateProtection 0–3 en viviendas; cobertura efectiva. |
| **Sistemas** | vivienda, clima |
| **Dependencias** | ZZ-030 |
| **Archivos approx.** | content/buildings.json, js/sim.js, js/colony.js |
| **Datos/contenido** | buildings.json, balance housingClimate |
| **Assets** | ninguno |
| **Pruebas automáticas** | unit housing math |
| **Pruebas funcionales** | Escenarios overflow / frío avisado |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar según GAME_MASTER §4–5
- Tests numéricos
- UI mínima

**Criterio exacto de aceptación:**
- Cumple §4–5
- Sin micromanejo alquiler

### ZZ-032 — Vivienda aislada + unlock

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Necesidades y vivienda |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Añadir insulated_house + tech insulation. |
| **Sistemas** | vivienda, research, content |
| **Dependencias** | ZZ-031 |
| **Archivos approx.** | content/buildings.json, js/sim.js, js/colony.js |
| **Datos/contenido** | buildings.json, balance housingClimate |
| **Assets** | asset insulated_house |
| **Pruebas automáticas** | unit housing math |
| **Pruebas funcionales** | Escenarios overflow / frío avisado |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Implementar según GAME_MASTER §4–5
- Tests numéricos
- UI mínima

**Criterio exacto de aceptación:**
- Cumple §4–5
- Sin micromanejo alquiler

### ZZ-033 — Alertas cobertura térmica

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Necesidades y vivienda |
| **HUMAN_GATE** | NO |
| **Objetivo** | Aviso: plazas protegidas vs pop antes de ola. |
| **Sistemas** | alertas, vivienda |
| **Dependencias** | ZZ-032 |
| **Archivos approx.** | content/buildings.json, js/sim.js, js/colony.js |
| **Datos/contenido** | buildings.json, balance housingClimate |
| **Assets** | ninguno |
| **Pruebas automáticas** | unit housing math |
| **Pruebas funcionales** | Escenarios overflow / frío avisado |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Implementar según GAME_MASTER §4–5
- Tests numéricos
- UI mínima

**Criterio exacto de aceptación:**
- Cumple §4–5
- Sin micromanejo alquiler

### ZZ-034 — Soft-caps almacenamiento

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Necesidades y vivienda |
| **HUMAN_GATE** | NO |
| **Objetivo** | Soft-cap visible; merma exceso; almacenes aumentan. |
| **Sistemas** | recursos, storage |
| **Dependencias** | ZZ-033 |
| **Archivos approx.** | content/buildings.json, js/sim.js, js/colony.js |
| **Datos/contenido** | buildings.json, balance housingClimate |
| **Assets** | ninguno |
| **Pruebas automáticas** | unit housing math |
| **Pruebas funcionales** | Escenarios overflow / frío avisado |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar según GAME_MASTER §4–5
- Tests numéricos
- UI mínima

**Criterio exacto de aceptación:**
- Cumple §4–5
- Sin micromanejo alquiler

### ZZ-035 — Estabilidad factores UI

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Necesidades y vivienda |
| **HUMAN_GATE** | NO |
| **Objetivo** | Estabilidad secundaria legible sin barra spam. |
| **Sistemas** | estabilidad, UX |
| **Dependencias** | ZZ-034 |
| **Archivos approx.** | content/buildings.json, js/sim.js, js/colony.js |
| **Datos/contenido** | buildings.json, balance housingClimate |
| **Assets** | ninguno |
| **Pruebas automáticas** | unit housing math |
| **Pruebas funcionales** | Escenarios overflow / frío avisado |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar según GAME_MASTER §4–5
- Tests numéricos
- UI mínima

**Criterio exacto de aceptación:**
- Cumple §4–5
- Sin micromanejo alquiler


## E · Estaciones y clima

### ZZ-040 — Ciclo estaciones state

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Estaciones y clima |
| **HUMAN_GATE** | NO |
| **Objetivo** | Primavera/verano/otoño/invierno en state + balance. |
| **Sistemas** | clima, director, sim |
| **Dependencias** | ZZ-031, ZZ-023 |
| **Archivos approx.** | js/sim.js, js/director.js, content/balance.json |
| **Datos/contenido** | balance seasons, events clima |
| **Assets** | ninguno |
| **Pruebas automáticas** | season tick; warn before blizzard |
| **Pruebas funcionales** | Jugador recibe aviso ≥1 día antes |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar §11
- Integrar Director

**Criterio exacto de aceptación:**
- Patrón aviso→prep→consecuencia
- No muerte sorpresa D1

### ZZ-041 — Clima puntual + duración

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Estaciones y clima |
| **HUMAN_GATE** | NO |
| **Objetivo** | clear/rain/storm/cold/heat/fog + duración. |
| **Sistemas** | clima, director, sim |
| **Dependencias** | ZZ-040 |
| **Archivos approx.** | js/sim.js, js/director.js, content/balance.json |
| **Datos/contenido** | balance seasons, events clima |
| **Assets** | ninguno |
| **Pruebas automáticas** | season tick; warn before blizzard |
| **Pruebas funcionales** | Jugador recibe aviso ≥1 día antes |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar §11
- Integrar Director

**Criterio exacto de aceptación:**
- Patrón aviso→prep→consecuencia
- No muerte sorpresa D1

### ZZ-042 — Pipeline aviso→prep→consecuencia

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Estaciones y clima |
| **HUMAN_GATE** | NO |
| **Objetivo** | Nunca castigo imposible de prever. |
| **Sistemas** | clima, director, sim |
| **Dependencias** | ZZ-041 |
| **Archivos approx.** | js/sim.js, js/director.js, content/balance.json |
| **Datos/contenido** | balance seasons, events clima |
| **Assets** | ninguno |
| **Pruebas automáticas** | season tick; warn before blizzard |
| **Pruebas funcionales** | Jugador recibe aviso ≥1 día antes |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar §11
- Integrar Director

**Criterio exacto de aceptación:**
- Patrón aviso→prep→consecuencia
- No muerte sorpresa D1

### ZZ-043 — Feedback visual clima

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Estaciones y clima |
| **HUMAN_GATE** | NO |
| **Objetivo** | Partículas/tono/velo según clima. |
| **Sistemas** | clima, director, sim |
| **Dependencias** | ZZ-042 |
| **Archivos approx.** | js/sim.js, js/director.js, content/balance.json |
| **Datos/contenido** | balance seasons, events clima |
| **Assets** | FX clima |
| **Pruebas automáticas** | season tick; warn before blizzard |
| **Pruebas funcionales** | Jugador recibe aviso ≥1 día antes |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Implementar §11
- Integrar Director

**Criterio exacto de aceptación:**
- Patrón aviso→prep→consecuencia
- No muerte sorpresa D1

### ZZ-044 — Impacto prod/exploración/salud

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Estaciones y clima |
| **HUMAN_GATE** | NO |
| **Objetivo** | Tablas §11 aplicadas en sim. |
| **Sistemas** | clima, director, sim |
| **Dependencias** | ZZ-043 |
| **Archivos approx.** | js/sim.js, js/director.js, content/balance.json |
| **Datos/contenido** | balance seasons, events clima |
| **Assets** | ninguno |
| **Pruebas automáticas** | season tick; warn before blizzard |
| **Pruebas funcionales** | Jugador recibe aviso ≥1 día antes |
| **Revisión visual** | No |

**Tareas concretas:**
- Implementar §11
- Integrar Director

**Criterio exacto de aceptación:**
- Patrón aviso→prep→consecuencia
- No muerte sorpresa D1

### ZZ-045 — QA invierno simulado

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Estaciones y clima |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Escenario forzado + capturas + gate. |
| **Sistemas** | clima, director, sim |
| **Dependencias** | ZZ-044 |
| **Archivos approx.** | js/sim.js, js/director.js, content/balance.json |
| **Datos/contenido** | balance seasons, events clima |
| **Assets** | ninguno |
| **Pruebas automáticas** | season tick; warn before blizzard |
| **Pruebas funcionales** | Jugador recibe aviso ≥1 día antes |
| **Revisión visual** | Sí |

**Tareas concretas:**
- Implementar §11
- Integrar Director

**Criterio exacto de aceptación:**
- Patrón aviso→prep→consecuencia
- No muerte sorpresa D1


## F · Salud

### ZZ-050 — Camas médicas y curación agregada

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud |
| **HUMAN_GATE** | NO |
| **Objetivo** | Σ camas health; curación/día limitada. |
| **Sistemas** | salud, exploradores |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | js/sim.js, js/explorers.js |
| **Datos/contenido** | buildings health, balance heal |
| **Assets** | ninguno |
| **Pruebas automáticas** | heal tick |
| **Pruebas funcionales** | Heridos bajan labor; camas aceleran |
| **Revisión visual** | No |

**Tareas concretas:**
- §12

**Criterio exacto de aceptación:**
- Sin RPG de 100 fichas
- Explorador individual sí

### ZZ-051 — Cadena botiquín→enfermería→clínica

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud |
| **HUMAN_GATE** | NO |
| **Objetivo** | Progresión edificios health. |
| **Sistemas** | salud, exploradores |
| **Dependencias** | ZZ-050 |
| **Archivos approx.** | js/sim.js, js/explorers.js |
| **Datos/contenido** | buildings health, balance heal |
| **Assets** | ninguno |
| **Pruebas automáticas** | heal tick |
| **Pruebas funcionales** | Heridos bajan labor; camas aceleran |
| **Revisión visual** | No |

**Tareas concretas:**
- §12

**Criterio exacto de aceptación:**
- Sin RPG de 100 fichas
- Explorador individual sí

### ZZ-052 — Explorador wounded/sick timings

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud |
| **HUMAN_GATE** | NO |
| **Objetivo** | Días indisponible; medicinas acortan. |
| **Sistemas** | salud, exploradores |
| **Dependencias** | ZZ-051 |
| **Archivos approx.** | js/sim.js, js/explorers.js |
| **Datos/contenido** | buildings health, balance heal |
| **Assets** | ninguno |
| **Pruebas automáticas** | heal tick |
| **Pruebas funcionales** | Heridos bajan labor; camas aceleran |
| **Revisión visual** | No |

**Tareas concretas:**
- §12

**Criterio exacto de aceptación:**
- Sin RPG de 100 fichas
- Explorador individual sí

### ZZ-053 — Alertas salud

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud |
| **HUMAN_GATE** | NO |
| **Objetivo** | Camas X/Y; riesgo muerte agregado. |
| **Sistemas** | salud, exploradores |
| **Dependencias** | ZZ-052 |
| **Archivos approx.** | js/sim.js, js/explorers.js |
| **Datos/contenido** | buildings health, balance heal |
| **Assets** | ninguno |
| **Pruebas automáticas** | heal tick |
| **Pruebas funcionales** | Heridos bajan labor; camas aceleran |
| **Revisión visual** | No |

**Tareas concretas:**
- §12

**Criterio exacto de aceptación:**
- Sin RPG de 100 fichas
- Explorador individual sí


## G · Defensa e infectados

### ZZ-060 — Defensa agregada legible

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Score defensa sin A/D crudos opacos. |
| **Sistemas** | defensa, infectados, director |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | js/combat.js, js/director.js, content/infected.json |
| **Datos/contenido** | infected.json, balance defense |
| **Assets** | ninguno |
| **Pruebas automáticas** | resolveBaseAttack cases |
| **Pruebas funcionales** | 50→pérdida→recuperación posible |
| **Revisión visual** | Parcial |

**Tareas concretas:**
- §13–14

**Criterio exacto de aceptación:**
- No combate manual
- Informe claro de bajas/daños

### ZZ-061 — Ataques prep→resolve→informe

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Jugador prepara; juego resuelve. |
| **Sistemas** | defensa, infectados, director |
| **Dependencias** | ZZ-060 |
| **Archivos approx.** | js/combat.js, js/director.js, content/infected.json |
| **Datos/contenido** | infected.json, balance defense |
| **Assets** | ninguno |
| **Pruebas automáticas** | resolveBaseAttack cases |
| **Pruebas funcionales** | 50→pérdida→recuperación posible |
| **Revisión visual** | Parcial |

**Tareas concretas:**
- §13–14

**Criterio exacto de aceptación:**
- No combate manual
- Informe claro de bajas/daños

### ZZ-062 — Infectados tipados en combate

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | common/fast/tank/horde/rare afectan. |
| **Sistemas** | defensa, infectados, director |
| **Dependencias** | ZZ-061 |
| **Archivos approx.** | js/combat.js, js/director.js, content/infected.json |
| **Datos/contenido** | infected.json, balance defense |
| **Assets** | ninguno |
| **Pruebas automáticas** | resolveBaseAttack cases |
| **Pruebas funcionales** | 50→pérdida→recuperación posible |
| **Revisión visual** | Parcial |

**Tareas concretas:**
- §13–14

**Criterio exacto de aceptación:**
- No combate manual
- Informe claro de bajas/daños

### ZZ-063 — Munición y armería

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Consumo ammo; armería produce. |
| **Sistemas** | defensa, infectados, director |
| **Dependencias** | ZZ-062 |
| **Archivos approx.** | js/combat.js, js/director.js, content/infected.json |
| **Datos/contenido** | infected.json, balance defense |
| **Assets** | ninguno |
| **Pruebas automáticas** | resolveBaseAttack cases |
| **Pruebas funcionales** | 50→pérdida→recuperación posible |
| **Revisión visual** | Parcial |

**Tareas concretas:**
- §13–14

**Criterio exacto de aceptación:**
- No combate manual
- Informe claro de bajas/daños

### ZZ-064 — Recuperación post-ataque

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Protección post-desastre; objetivos recovery. |
| **Sistemas** | defensa, infectados, director |
| **Dependencias** | ZZ-063 |
| **Archivos approx.** | js/combat.js, js/director.js, content/infected.json |
| **Datos/contenido** | infected.json, balance defense |
| **Assets** | ninguno |
| **Pruebas automáticas** | resolveBaseAttack cases |
| **Pruebas funcionales** | 50→pérdida→recuperación posible |
| **Revisión visual** | Parcial |

**Tareas concretas:**
- §13–14

**Criterio exacto de aceptación:**
- No combate manual
- Informe claro de bajas/daños

### ZZ-065 — QA ataque + recuperación visual

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Capturas + gate gameplay. |
| **Sistemas** | defensa, infectados, director |
| **Dependencias** | ZZ-064 |
| **Archivos approx.** | js/combat.js, js/director.js, content/infected.json |
| **Datos/contenido** | infected.json, balance defense |
| **Assets** | FX ataque opcional |
| **Pruebas automáticas** | resolveBaseAttack cases |
| **Pruebas funcionales** | 50→pérdida→recuperación posible |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §13–14

**Criterio exacto de aceptación:**
- No combate manual
- Informe claro de bajas/daños


## H · Territorio

### ZZ-070 — Beneficios reales de control

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Seguridad, reveal, rutas, loot residual. |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-022 |
| **Archivos approx.** | js/map.js, content/locations.json |
| **Datos/contenido** | locations.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | control bonuses |
| **Pruebas funcionales** | Controlar zona mejora seguridad medible |
| **Revisión visual** | No |

**Tareas concretas:**
- §15–16

**Criterio exacto de aceptación:**
- No pintar verde vacío

### ZZ-071 — Contested / pérdida fronteriza

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Opcional según diseño; si sí, reglas claras. |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-070 |
| **Archivos approx.** | js/map.js, content/locations.json |
| **Datos/contenido** | locations.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | control bonuses |
| **Pruebas funcionales** | Controlar zona mejora seguridad medible |
| **Revisión visual** | No |

**Tareas concretas:**
- §15–16

**Criterio exacto de aceptación:**
- No pintar verde vacío

### ZZ-072 — Tablas loot por landmark

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Supermercado≠farmacia≠comisaría. |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-071 |
| **Archivos approx.** | js/map.js, content/locations.json |
| **Datos/contenido** | locations.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | control bonuses |
| **Pruebas funcionales** | Controlar zona mejora seguridad medible |
| **Revisión visual** | No |

**Tareas concretas:**
- §15–16

**Criterio exacto de aceptación:**
- No pintar verde vacío

### ZZ-073 — Fog/discovered polish visual

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Sin GIS; landmarks art. |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-072 |
| **Archivos approx.** | js/map.js, content/locations.json |
| **Datos/contenido** | locations.json |
| **Assets** | landmarks set |
| **Pruebas automáticas** | control bonuses |
| **Pruebas funcionales** | Controlar zona mejora seguridad medible |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §15–16

**Criterio exacto de aceptación:**
- No pintar verde vacío


## I · Investigación

### ZZ-080 — Cablear effects research existentes

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Cada effect JSON aplica en sim. |
| **Sistemas** | research |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | js/research.js, content/research.json |
| **Datos/contenido** | research.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | tech effect suite |
| **Pruebas funcionales** | Investigar insulation unlock insulated_house |
| **Revisión visual** | No |

**Tareas concretas:**
- §18 + Apéndice A

**Criterio exacto de aceptación:**
- Cero techs stub
- Sin unlock wall/power_hub huérfanos

### ZZ-081 — Árbol 2.1 ramas Medicina/Energía

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Ampliar a ~28 techs diseño. |
| **Sistemas** | research |
| **Dependencias** | ZZ-080 |
| **Archivos approx.** | js/research.js, content/research.json |
| **Datos/contenido** | research.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | tech effect suite |
| **Pruebas funcionales** | Investigar insulation unlock insulated_house |
| **Revisión visual** | No |

**Tareas concretas:**
- §18 + Apéndice A

**Criterio exacto de aceptación:**
- Cero techs stub
- Sin unlock wall/power_hub huérfanos

### ZZ-082 — UI research legible

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | En Más / sheet; deseo de unlock. |
| **Sistemas** | research |
| **Dependencias** | ZZ-081 |
| **Archivos approx.** | js/research.js, content/research.json |
| **Datos/contenido** | research.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | tech effect suite |
| **Pruebas funcionales** | Investigar insulation unlock insulated_house |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §18 + Apéndice A

**Criterio exacto de aceptación:**
- Cero techs stub
- Sin unlock wall/power_hub huérfanos

### ZZ-083 — Tests por tech medible

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | NO |
| **Objetivo** | 1 assertion por tech. |
| **Sistemas** | research |
| **Dependencias** | ZZ-082 |
| **Archivos approx.** | js/research.js, content/research.json |
| **Datos/contenido** | research.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | tech effect suite |
| **Pruebas funcionales** | Investigar insulation unlock insulated_house |
| **Revisión visual** | No |

**Tareas concretas:**
- §18 + Apéndice A

**Criterio exacto de aceptación:**
- Cero techs stub
- Sin unlock wall/power_hub huérfanos


## J · Vehículos

### ZZ-090 — Garage y requisitos compra

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Sin vehículo pesado sin garage/tech. |
| **Sistemas** | vehículos, exploración |
| **Dependencias** | ZZ-022, ZZ-080 |
| **Archivos approx.** | js/vehicles.js, content/vehicles.json |
| **Datos/contenido** | vehicles.json |
| **Assets** | sprites vehículos si faltan |
| **Pruebas automáticas** | fuel cost trip |
| **Pruebas funcionales** | Bike early; car mid |
| **Revisión visual** | No |

**Tareas concretas:**
- §17

**Criterio exacto de aceptación:**
- Sin inventario piezas

### ZZ-091 — Efectos speed/cargo/fuel/prot

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Aplicados en expedición. |
| **Sistemas** | vehículos, exploración |
| **Dependencias** | ZZ-090 |
| **Archivos approx.** | js/vehicles.js, content/vehicles.json |
| **Datos/contenido** | vehicles.json |
| **Assets** | sprites vehículos si faltan |
| **Pruebas automáticas** | fuel cost trip |
| **Pruebas funcionales** | Bike early; car mid |
| **Revisión visual** | No |

**Tareas concretas:**
- §17

**Criterio exacto de aceptación:**
- Sin inventario piezas

### ZZ-092 — Reparación abstracta

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Coste metal/fuel + mech_shop; sin piezas. |
| **Sistemas** | vehículos, exploración |
| **Dependencias** | ZZ-091 |
| **Archivos approx.** | js/vehicles.js, content/vehicles.json |
| **Datos/contenido** | vehicles.json |
| **Assets** | sprites vehículos si faltan |
| **Pruebas automáticas** | fuel cost trip |
| **Pruebas funcionales** | Bike early; car mid |
| **Revisión visual** | No |

**Tareas concretas:**
- §17

**Criterio exacto de aceptación:**
- Sin inventario piezas

### ZZ-093 — Integración expedición UI

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Elegir vehículo al enviar. |
| **Sistemas** | vehículos, exploración |
| **Dependencias** | ZZ-092 |
| **Archivos approx.** | js/vehicles.js, content/vehicles.json |
| **Datos/contenido** | vehicles.json |
| **Assets** | sprites vehículos si faltan |
| **Pruebas automáticas** | fuel cost trip |
| **Pruebas funcionales** | Bike early; car mid |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §17

**Criterio exacto de aceptación:**
- Sin inventario piezas


## K · Misiones

### ZZ-100 — Schema missions + state

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones |
| **HUMAN_GATE** | NO |
| **Objetivo** | missions[] en save. |
| **Sistemas** | misiones, director |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | js/missions.js, content/missions.json |
| **Datos/contenido** | content/missions.json nuevo |
| **Assets** | ninguno |
| **Pruebas automáticas** | mission spawn rules |
| **Pruebas funcionales** | Máx 1–2 activas relevantes |
| **Revisión visual** | No |

**Tareas concretas:**
- §20 + Apéndice K

**Criterio exacto de aceptación:**
- No campaña lineal rígida
- No spam

### ZZ-101 — Misiones guía

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Sustituyen coach sticky. |
| **Sistemas** | misiones, director |
| **Dependencias** | ZZ-100 |
| **Archivos approx.** | js/missions.js, content/missions.json |
| **Datos/contenido** | content/missions.json nuevo |
| **Assets** | ninguno |
| **Pruebas automáticas** | mission spawn rules |
| **Pruebas funcionales** | Máx 1–2 activas relevantes |
| **Revisión visual** | No |

**Tareas concretas:**
- §20 + Apéndice K

**Criterio exacto de aceptación:**
- No campaña lineal rígida
- No spam

### ZZ-102 — Misiones contextuales necesidad

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones |
| **HUMAN_GATE** | NO |
| **Objetivo** | food/water/beds/warmth. |
| **Sistemas** | misiones, director |
| **Dependencias** | ZZ-101 |
| **Archivos approx.** | js/missions.js, content/missions.json |
| **Datos/contenido** | content/missions.json nuevo |
| **Assets** | ninguno |
| **Pruebas automáticas** | mission spawn rules |
| **Pruebas funcionales** | Máx 1–2 activas relevantes |
| **Revisión visual** | No |

**Tareas concretas:**
- §20 + Apéndice K

**Criterio exacto de aceptación:**
- No campaña lineal rígida
- No spam

### ZZ-103 — Misiones aleatorias

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones |
| **HUMAN_GATE** | NO |
| **Objetivo** | radio, rescate, supply, nest. |
| **Sistemas** | misiones, director |
| **Dependencias** | ZZ-102 |
| **Archivos approx.** | js/missions.js, content/missions.json |
| **Datos/contenido** | content/missions.json nuevo |
| **Assets** | ninguno |
| **Pruebas automáticas** | mission spawn rules |
| **Pruebas funcionales** | Máx 1–2 activas relevantes |
| **Revisión visual** | No |

**Tareas concretas:**
- §20 + Apéndice K

**Criterio exacto de aceptación:**
- No campaña lineal rígida
- No spam

### ZZ-104 — Misiones de era / victoria path

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Gates era + final_chain. |
| **Sistemas** | misiones, director |
| **Dependencias** | ZZ-103 |
| **Archivos approx.** | js/missions.js, content/missions.json |
| **Datos/contenido** | content/missions.json nuevo |
| **Assets** | ninguno |
| **Pruebas automáticas** | mission spawn rules |
| **Pruebas funcionales** | Máx 1–2 activas relevantes |
| **Revisión visual** | No |

**Tareas concretas:**
- §20 + Apéndice K

**Criterio exacto de aceptación:**
- No campaña lineal rígida
- No spam

### ZZ-105 — UI objetivo único

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Un objetivo visible; recompensas. |
| **Sistemas** | misiones, director |
| **Dependencias** | ZZ-104 |
| **Archivos approx.** | js/missions.js, content/missions.json |
| **Datos/contenido** | content/missions.json nuevo |
| **Assets** | ninguno |
| **Pruebas automáticas** | mission spawn rules |
| **Pruebas funcionales** | Máx 1–2 activas relevantes |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §20 + Apéndice K

**Criterio exacto de aceptación:**
- No campaña lineal rígida
- No spam

### ZZ-106 — QA misiones no spam

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Cooldowns; gate. |
| **Sistemas** | misiones, director |
| **Dependencias** | ZZ-105 |
| **Archivos approx.** | js/missions.js, content/missions.json |
| **Datos/contenido** | content/missions.json nuevo |
| **Assets** | ninguno |
| **Pruebas automáticas** | mission spawn rules |
| **Pruebas funcionales** | Máx 1–2 activas relevantes |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §20 + Apéndice K

**Criterio exacto de aceptación:**
- No campaña lineal rígida
- No spam


## L · Logros

### ZZ-110 — Schema achievements

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | content/achievements.json |
| **Sistemas** | logros |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | js/achievements.js |
| **Datos/contenido** | achievements.json |
| **Assets** | iconos logros opcionales |
| **Pruebas automáticas** | unlock triggers |
| **Pruebas funcionales** | Logro D7 / pop10 |
| **Revisión visual** | No |

**Tareas concretas:**
- §22

**Criterio exacto de aceptación:**
- Sin pay-to-win
- ≥60

### ZZ-111 — Tracking + persistencia

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | Unlock + save |
| **Sistemas** | logros |
| **Dependencias** | ZZ-110 |
| **Archivos approx.** | js/achievements.js |
| **Datos/contenido** | achievements.json |
| **Assets** | iconos logros opcionales |
| **Pruebas automáticas** | unlock triggers |
| **Pruebas funcionales** | Logro D7 / pop10 |
| **Revisión visual** | No |

**Tareas concretas:**
- §22

**Criterio exacto de aceptación:**
- Sin pay-to-win
- ≥60

### ZZ-112 — Cablear ≥60 logros

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | Apéndice L ids |
| **Sistemas** | logros |
| **Dependencias** | ZZ-111 |
| **Archivos approx.** | js/achievements.js |
| **Datos/contenido** | achievements.json |
| **Assets** | iconos logros opcionales |
| **Pruebas automáticas** | unlock triggers |
| **Pruebas funcionales** | Logro D7 / pop10 |
| **Revisión visual** | No |

**Tareas concretas:**
- §22

**Criterio exacto de aceptación:**
- Sin pay-to-win
- ≥60

### ZZ-113 — Feedback badge no invasivo

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | Toast/badge sin modal spam |
| **Sistemas** | logros |
| **Dependencias** | ZZ-112 |
| **Archivos approx.** | js/achievements.js |
| **Datos/contenido** | achievements.json |
| **Assets** | iconos logros opcionales |
| **Pruebas automáticas** | unlock triggers |
| **Pruebas funcionales** | Logro D7 / pop10 |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §22

**Criterio exacto de aceptación:**
- Sin pay-to-win
- ≥60


## M · Eventos / Director 2.1

### ZZ-120 — Pesos Director vs era/estación

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Eventos / Director 2.1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Recalibrar families. |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-040, ZZ-023 |
| **Archivos approx.** | js/director.js, content/events.json |
| **Datos/contenido** | events.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | director budget; cooldown |
| **Pruebas funcionales** | Ritmo tensión→crisis→recovery en sim |
| **Revisión visual** | No |

**Tareas concretas:**
- §19 + §25 + Apéndice J

**Criterio exacto de aceptación:**
- No crisis infinita
- No 100 días planos

### ZZ-121 — Memoria flags secuelas

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Eventos / Director 2.1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | flags narrativas. |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-120 |
| **Archivos approx.** | js/director.js, content/events.json |
| **Datos/contenido** | events.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | director budget; cooldown |
| **Pruebas funcionales** | Ritmo tensión→crisis→recovery en sim |
| **Revisión visual** | No |

**Tareas concretas:**
- §19 + §25 + Apéndice J

**Criterio exacto de aceptación:**
- No crisis infinita
- No 100 días planos

### ZZ-122 — Antirrepetición reforzada

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Eventos / Director 2.1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | ventana M días. |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-121 |
| **Archivos approx.** | js/director.js, content/events.json |
| **Datos/contenido** | events.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | director budget; cooldown |
| **Pruebas funcionales** | Ritmo tensión→crisis→recovery en sim |
| **Revisión visual** | No |

**Tareas concretas:**
- §19 + §25 + Apéndice J

**Criterio exacto de aceptación:**
- No crisis infinita
- No 100 días planos

### ZZ-123 — Quiet nights calibrados

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Eventos / Director 2.1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | ~30%. |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-122 |
| **Archivos approx.** | js/director.js, content/events.json |
| **Datos/contenido** | events.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | director budget; cooldown |
| **Pruebas funcionales** | Ritmo tensión→crisis→recovery en sim |
| **Revisión visual** | No |

**Tareas concretas:**
- §19 + §25 + Apéndice J

**Criterio exacto de aceptación:**
- No crisis infinita
- No 100 días planos

### ZZ-124 — Catástrofes con aviso

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Eventos / Director 2.1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | aviso→prep→consecuencia. |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-123 |
| **Archivos approx.** | js/director.js, content/events.json |
| **Datos/contenido** | events.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | director budget; cooldown |
| **Pruebas funcionales** | Ritmo tensión→crisis→recovery en sim |
| **Revisión visual** | No |

**Tareas concretas:**
- §19 + §25 + Apéndice J

**Criterio exacto de aceptación:**
- No crisis infinita
- No 100 días planos

### ZZ-125 — Auditoría 110 eventos

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Eventos / Director 2.1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | familia vs diseño; recortar inútiles. |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-124 |
| **Archivos approx.** | js/director.js, content/events.json |
| **Datos/contenido** | events.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | director budget; cooldown |
| **Pruebas funcionales** | Ritmo tensión→crisis→recovery en sim |
| **Revisión visual** | No |

**Tareas concretas:**
- §19 + §25 + Apéndice J

**Criterio exacto de aceptación:**
- No crisis infinita
- No 100 días planos


## N · Otros humanos

### ZZ-130 — Contactos por evento

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Sin diplomacia 4X. |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-120 |
| **Archivos approx.** | js/factions.js, content/factions.json |
| **Datos/contenido** | factions.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | event trade |
| **Pruebas funcionales** | Contacto no requiere panel 4X |
| **Revisión visual** | No |

**Tareas concretas:**
- §27

**Criterio exacto de aceptación:**
- Si no aporta → solo flags

### ZZ-131 — Comercio evento

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Trueque simple. |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-130 |
| **Archivos approx.** | js/factions.js, content/factions.json |
| **Datos/contenido** | factions.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | event trade |
| **Pruebas funcionales** | Contacto no requiere panel 4X |
| **Revisión visual** | No |

**Tareas concretas:**
- §27

**Criterio exacto de aceptación:**
- Si no aporta → solo flags

### ZZ-132 — UI mínima contactos

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Cards o solo eventos. |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-131 |
| **Archivos approx.** | js/factions.js, content/factions.json |
| **Datos/contenido** | factions.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | event trade |
| **Pruebas funcionales** | Contacto no requiere panel 4X |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §27

**Criterio exacto de aceptación:**
- Si no aporta → solo flags

### ZZ-133 — Go/no-go facciones tras playtest

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Decisión documentada. |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-132 |
| **Archivos approx.** | js/factions.js, content/factions.json |
| **Datos/contenido** | factions.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | event trade |
| **Pruebas funcionales** | Contacto no requiere panel 4X |
| **Revisión visual** | No |

**Tareas concretas:**
- §27

**Criterio exacto de aceptación:**
- Si no aporta → solo flags


## O · Eras y victoria

### ZZ-140 — Unlock eras por indicadores 2.1

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | pop/control/research/infra. |
| **Sistemas** | eras, victoria, derrota |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | js/eras.js, js/victory.js |
| **Datos/contenido** | eras.json, balance victory |
| **Assets** | ninguno |
| **Pruebas automáticas** | victory checks |
| **Pruebas funcionales** | Derrota explica por qué |
| **Revisión visual** | No |

**Tareas concretas:**
- §23 §28 §29

**Criterio exacto de aceptación:**
- No checkbox pop solo
- Endless disponible

### ZZ-141 — Victoria multi-condición

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | Checklist culminación §28. |
| **Sistemas** | eras, victoria, derrota |
| **Dependencias** | ZZ-140 |
| **Archivos approx.** | js/eras.js, js/victory.js |
| **Datos/contenido** | eras.json, balance victory |
| **Assets** | ninguno |
| **Pruebas automáticas** | victory checks |
| **Pruebas funcionales** | Derrota explica por qué |
| **Revisión visual** | No |

**Tareas concretas:**
- §23 §28 §29

**Criterio exacto de aceptación:**
- No checkbox pop solo
- Endless disponible

### ZZ-142 — Crisis final variable

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | Variantes por semilla. |
| **Sistemas** | eras, victoria, derrota |
| **Dependencias** | ZZ-141 |
| **Archivos approx.** | js/eras.js, js/victory.js |
| **Datos/contenido** | eras.json, balance victory |
| **Assets** | ninguno |
| **Pruebas automáticas** | victory checks |
| **Pruebas funcionales** | Derrota explica por qué |
| **Revisión visual** | No |

**Tareas concretas:**
- §23 §28 §29

**Criterio exacto de aceptación:**
- No checkbox pop solo
- Endless disponible

### ZZ-143 — Endless post-victoria

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | Continuar partida. |
| **Sistemas** | eras, victoria, derrota |
| **Dependencias** | ZZ-142 |
| **Archivos approx.** | js/eras.js, js/victory.js |
| **Datos/contenido** | eras.json, balance victory |
| **Assets** | ninguno |
| **Pruebas automáticas** | victory checks |
| **Pruebas funcionales** | Derrota explica por qué |
| **Revisión visual** | No |

**Tareas concretas:**
- §23 §28 §29

**Criterio exacto de aceptación:**
- No checkbox pop solo
- Endless disponible

### ZZ-144 — Pantallas victoria/derrota

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Narrativa causa clara. |
| **Sistemas** | eras, victoria, derrota |
| **Dependencias** | ZZ-143 |
| **Archivos approx.** | js/eras.js, js/victory.js |
| **Datos/contenido** | eras.json, balance victory |
| **Assets** | ninguno |
| **Pruebas automáticas** | victory checks |
| **Pruebas funcionales** | Derrota explica por qué |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §23 §28 §29

**Criterio exacto de aceptación:**
- No checkbox pop solo
- Endless disponible


## P · UX mundo completa

### ZZ-150 — Sheets móvil/desktop consistentes

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo completa |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Mundo primero; bottom sheets / panel. |
| **Sistemas** | UX |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | css/world.css, js/main.js |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | a11y smoke |
| **Pruebas funcionales** | Sin pestañas Mapa|Base|Gente |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §21 §31

**Criterio exacto de aceptación:**
- Contrato UI §31

### ZZ-151 — Alertas prioritizadas

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo completa |
| **HUMAN_GATE** | NO |
| **Objetivo** | Crítico > objetivo > tip. |
| **Sistemas** | UX |
| **Dependencias** | ZZ-150 |
| **Archivos approx.** | css/world.css, js/main.js |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | a11y smoke |
| **Pruebas funcionales** | Sin pestañas Mapa|Base|Gente |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §21 §31

**Criterio exacto de aceptación:**
- Contrato UI §31

### ZZ-152 — Ayuda contextual

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo completa |
| **HUMAN_GATE** | NO |
| **Objetivo** | ? sin mandar al jugador. |
| **Sistemas** | UX |
| **Dependencias** | ZZ-151 |
| **Archivos approx.** | css/world.css, js/main.js |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | a11y smoke |
| **Pruebas funcionales** | Sin pestañas Mapa|Base|Gente |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §21 §31

**Criterio exacto de aceptación:**
- Contrato UI §31

### ZZ-153 — Diario no spam

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo completa |
| **HUMAN_GATE** | NO |
| **Objetivo** | Log filtrable. |
| **Sistemas** | UX |
| **Dependencias** | ZZ-152 |
| **Archivos approx.** | css/world.css, js/main.js |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | a11y smoke |
| **Pruebas funcionales** | Sin pestañas Mapa|Base|Gente |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §21 §31

**Criterio exacto de aceptación:**
- Contrato UI §31

### ZZ-154 — Accesibilidad básica

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo completa |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Tap targets, contraste. |
| **Sistemas** | UX |
| **Dependencias** | ZZ-153 |
| **Archivos approx.** | css/world.css, js/main.js |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | a11y smoke |
| **Pruebas funcionales** | Sin pestañas Mapa|Base|Gente |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §21 §31

**Criterio exacto de aceptación:**
- Contrato UI §31


## Q · Arte y audio

### ZZ-160 — Assets edificios faltantes *(revisar: sin solar assets obligatorios)*

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | insulated_house etc. |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-015 |
| **Archivos approx.** | assets/, docs/art-direction/ |
| **Datos/contenido** | — |
| **Assets** | lote completo |
| **Pruebas automáticas** | assets load |
| **Pruebas funcionales** | Reconocibilidad |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §33 §34

**Criterio exacto de aceptación:**
- Dirección artística coherente

### ZZ-161 — Terreno ciudad close-up

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | No blur GIS. |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-160 |
| **Archivos approx.** | assets/, docs/art-direction/ |
| **Datos/contenido** | — |
| **Assets** | lote completo |
| **Pruebas automáticas** | assets load |
| **Pruebas funcionales** | Reconocibilidad |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §33 §34

**Criterio exacto de aceptación:**
- Dirección artística coherente

### ZZ-162 — Landmarks set completo

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | 18 tipos reconocibles. |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-161 |
| **Archivos approx.** | assets/, docs/art-direction/ |
| **Datos/contenido** | — |
| **Assets** | lote completo |
| **Pruebas automáticas** | assets load |
| **Pruebas funcionales** | Reconocibilidad |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §33 §34

**Criterio exacto de aceptación:**
- Dirección artística coherente

### ZZ-163 — Props colonia

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Restos, valla, detalles. |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-162 |
| **Archivos approx.** | assets/, docs/art-direction/ |
| **Datos/contenido** | — |
| **Assets** | lote completo |
| **Pruebas automáticas** | assets load |
| **Pruebas funcionales** | Reconocibilidad |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §33 §34

**Criterio exacto de aceptación:**
- Dirección artística coherente

### ZZ-164 — SFX mínimo + mute

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | §34. |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-163 |
| **Archivos approx.** | assets/, docs/art-direction/ |
| **Datos/contenido** | — |
| **Assets** | lote completo |
| **Pruebas automáticas** | assets load |
| **Pruebas funcionales** | Reconocibilidad |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §33 §34

**Criterio exacto de aceptación:**
- Dirección artística coherente

### ZZ-165 — Review visual por era

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Contact sheets era 0–3. |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-164 |
| **Archivos approx.** | assets/, docs/art-direction/ |
| **Datos/contenido** | — |
| **Assets** | lote completo |
| **Pruebas automáticas** | assets load |
| **Pruebas funcionales** | Reconocibilidad |
| **Revisión visual** | Sí |

**Tareas concretas:**
- §33 §34

**Criterio exacto de aceptación:**
- Dirección artística coherente


## R · Simulador y balance

### ZZ-170 — Harness perfiles IA-jugador

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | NO |
| **Objetivo** | atento/expansivo/conservador/mala gestión/sin explorar/sobreexpansión. |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-120, ZZ-140 |
| **Archivos approx.** | scripts/sim-harness.mjs, docs/BALANCE_REPORT.md |
| **Datos/contenido** | balance.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | sim batch |
| **Pruebas funcionales** | Perfil mala gestión pierde más |
| **Revisión visual** | No |

**Tareas concretas:**
- §36

**Criterio exacto de aceptación:**
- Informe accionable

### ZZ-171 — Métricas batch D30/D100

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | NO |
| **Objetivo** | supervivencia, pop, crisis, victoria. |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-170 |
| **Archivos approx.** | scripts/sim-harness.mjs, docs/BALANCE_REPORT.md |
| **Datos/contenido** | balance.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | sim batch |
| **Pruebas funcionales** | Perfil mala gestión pierde más |
| **Revisión visual** | No |

**Tareas concretas:**
- §36

**Criterio exacto de aceptación:**
- Informe accionable

### ZZ-172 — Calibración dificultad normal

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | NO |
| **Objetivo** | Ajustar balance.json. |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-171 |
| **Archivos approx.** | scripts/sim-harness.mjs, docs/BALANCE_REPORT.md |
| **Datos/contenido** | balance.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | sim batch |
| **Pruebas funcionales** | Perfil mala gestión pierde más |
| **Revisión visual** | No |

**Tareas concretas:**
- §36

**Criterio exacto de aceptación:**
- Informe accionable

### ZZ-173 — Informe balance

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | docs/BALANCE_REPORT.md + gate. |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-172 |
| **Archivos approx.** | scripts/sim-harness.mjs, docs/BALANCE_REPORT.md |
| **Datos/contenido** | balance.json |
| **Assets** | ninguno |
| **Pruebas automáticas** | sim batch |
| **Pruebas funcionales** | Perfil mala gestión pierde más |
| **Revisión visual** | No |

**Tareas concretas:**
- §36

**Criterio exacto de aceptación:**
- Informe accionable


## S · Producción / release

### ZZ-180 — Migraciones save v5+

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Producción / release |
| **HUMAN_GATE** | NO |
| **Objetivo** | Compat saves antiguos. |
| **Sistemas** | release |
| **Dependencias** | ZZ-173, ZZ-165 |
| **Archivos approx.** | js/save.js, scripts/ |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | e2e |
| **Pruebas funcionales** | Checklist release |
| **Revisión visual** | No |

**Tareas concretas:**
- § release

**Criterio exacto de aceptación:**
- No deploy sin orden

### ZZ-181 — Smoke E2E móvil+desktop

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Producción / release |
| **HUMAN_GATE** | NO |
| **Objetivo** | Suite completa. |
| **Sistemas** | release |
| **Dependencias** | ZZ-180 |
| **Archivos approx.** | js/save.js, scripts/ |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | e2e |
| **Pruebas funcionales** | Checklist release |
| **Revisión visual** | Sí |

**Tareas concretas:**
- § release

**Criterio exacto de aceptación:**
- No deploy sin orden

### ZZ-182 — Perf mapa

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Producción / release |
| **HUMAN_GATE** | NO |
| **Objetivo** | FPS/pan aceptable. |
| **Sistemas** | release |
| **Dependencias** | ZZ-181 |
| **Archivos approx.** | js/save.js, scripts/ |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | e2e |
| **Pruebas funcionales** | Checklist release |
| **Revisión visual** | No |

**Tareas concretas:**
- § release

**Criterio exacto de aceptación:**
- No deploy sin orden

### ZZ-183 — Deploy bajo orden explícita

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Producción / release |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Solo si se pide. |
| **Sistemas** | release |
| **Dependencias** | ZZ-182 |
| **Archivos approx.** | js/save.js, scripts/ |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | e2e |
| **Pruebas funcionales** | Checklist release |
| **Revisión visual** | No |

**Tareas concretas:**
- § release

**Criterio exacto de aceptación:**
- No deploy sin orden

### ZZ-184 — Hotfix post-lanzamiento

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Producción / release |
| **HUMAN_GATE** | NO |
| **Objetivo** | Proceso. |
| **Sistemas** | release |
| **Dependencias** | ZZ-183 |
| **Archivos approx.** | js/save.js, scripts/ |
| **Datos/contenido** | — |
| **Assets** | ninguno |
| **Pruebas automáticas** | e2e |
| **Pruebas funcionales** | Checklist release |
| **Revisión visual** | No |

**Tareas concretas:**
- § release

**Criterio exacto de aceptación:**
- No deploy sin orden


---

## 4. Conteos

| Métrica | Valor |
|---------|-------|
| Total fases/subfases | **100** |
| HUMAN_GATE YES | **22** |
| HUMAN_GATE NO | 78 |

---

## 5. Sync Drive

| Doc | Drive | Repo |
|-----|-------|------|
| Biblia | `G:\\Mi unidad\\Juegos\\Zona Zero\\GAME_MASTER\\ZONA_ZERO_GAME_MASTER.md` | `GAME_MASTER.md` |
| Plan | `...\\ZONA_ZERO_IMPLEMENTATION_PLAN.md` | `docs/IMPLEMENTATION_PLAN.md` |
| Log | `...\\ZONA_ZERO_DEVELOPMENT_LOG.md` | `docs/DEVELOPMENT_LOG.md` |

---

*Fin del plan técnico 2.1 — contrato de fases ZZ-XXX.*

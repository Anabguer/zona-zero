# Zona Zero — Plan de implementación técnico (GAME_MASTER 2.8)

> **SYNC VERIFY IMPLEMENTATION_PLAN** · stamp=2026-08-16 · source=repo

**Versión plan:** 2.8  
**Estado:** Contrato espacial **2.8**. B0 + **ZZ-012…032 APROBADAS**. · **ZZ-033…048 APROBADAS**. · **ZZ-050…059 APROBADAS**. · **ZZ-060…065 APROBADAS**. · **ZZ-066…069 APROBADAS**. · **ZZ-070…073 APROBADAS**. · **ZZ-080…083 APROBADAS**. · **ZZ-084…108 APROBADAS**. · **ZZ-110…125 APROBADAS**. · **ZZ-126…133 APROBADAS** (GO lean). · **ZZ-140…144 APROBADAS**. · **ZZ-150…154 APROBADAS**. · **ZZ-160…165 APROBADAS**. · **ZZ-166…172 APROBADAS**. · **ZZ-175…178 APROBADAS**. · **ZZ-180…182** hechas · **ZZ-183 HUMAN_GATE** PENDIENTE. · Deudas arte **NO BLOQUEANTES**. · No deploy sin orden (ZZ-183).  
**Biblia:** GAME_MASTER **2.8**.  
**Protocolo:** DEVELOPMENT_LOG · §41 biblia.  
**Stack:** HTML/CSS/JS + PHP + MySQL · `content/*.json`.

> Este plan **sustituye 2.7** en B0/B afectados por superficies edificables.  
> **Fuera de alcance v1:** electricidad, generator, solar, power_grid/power_hub, needEnergy, calefacción con fuel.  
> **Fuera de UX v1:** múltiples slots de partida manuales · GIS visible · construcción portrait dual · simulador de carreteras.

---

## 0. Reglas de ejecución

1. Leer GAME_MASTER **2.8** antes de cada fase.  
2. Tras cada fase: tests → capturas si aplica → commit → push → DEVELOPMENT_LOG → `PENDIENTE DE REVISIÓN`.  
3. Si `HUMAN_GATE: YES`: no continuar dependientes sin `APROBADA` + `SÍ`.  
4. Tests verdes / elogios / silencio ≠ aprobación.  
5. Balance solo en content.  
6. Deploy solo ZZ-183 bajo orden.  
7. Sync Drive = GitHub en docs maestros.  
8. **No implementar sistemas D1+ encima del patio fijo 10×8** tras 2.7/2.8: primero B0 (016→019) + **ZZ-019A**.  
9. Si `REVIEW_STOP: YES`: PARAR tras la fase; no continuar hasta autorización explícita (aunque no sea HUMAN_GATE canónico).  
10. **No** inventar bonuses/mecánicas de caminos/muros sin enlace sistémico + decisión Neni.

### REVIEW_STOP (2.8)

- **ZZ-018** · Sectores + recuperar territorio → **cerrado** (autorizado → ZZ-019).  
- **ZZ-019A** · Escenario diseñado + superficies edificables → **APROBADA** (REVIEW_STOP cerrado).

### HUMAN_GATE (canónica 2.8)

- ZZ-001
- ZZ-007
- ZZ-008
- ZZ-010 *(histórica; retrofit espacial en B0)*
- ZZ-016 · Landscape + rotate gate
- ZZ-019 · **Colocación semilibre landscape** *(APROBADA — no reabrir ghost/✓)*
- ZZ-012 *(replanificada; depende ZZ-019A tras 2.8)*
- ZZ-014
- ZZ-015
- ZZ-021
- ZZ-023
- ZZ-032
- ZZ-048
- ZZ-059
- ZZ-065
- ZZ-069
- ZZ-073
- ZZ-083
- ZZ-108
- ZZ-125
- ZZ-133
- ZZ-144
- ZZ-150
- ZZ-154
- ZZ-161
- ZZ-165
- ZZ-172
- ZZ-178
- ZZ-183

**Total fases:** 136 *(+ ZZ-019A)*  
**Con HUMAN_GATE:** 29  

> **Duda Neni:** ~~¿ZZ-019A HUMAN_GATE?~~ **CERRADA:** solo **REVIEW_STOP** (Neni+ChatGPT 2026-08-16).
---

## 0.1 Enmienda 2.8 — qué cambia respecto a 2.7

| Tema | Acción |
|------|--------|
| Superficies edificables orgánicas | Contrato §9.2/§9.4; fase **ZZ-019A** + **REVIEW_STOP** |
| Escenario grande diseñado (finito) | §9.4; arte/layout en ZZ-019A (no procedural infinito) |
| Avisos → cámara + ficha | Contrato §9.4/§21 (impl. en fases UI/alertas existentes; no sistema nuevo) |
| Caminos / muros | Solo visual/estructura ahora; mecánicas futuras si sistémicas (§9.4) — **sin fase inventada** |
| ZZ-019 | **APROBADA** — no reabrir ghost/✓/semilibre |
| ZZ-012 | **APROBADA** · tips 2.8 |
| ZZ-013 | **APROBADA** · HUD comida/agua/madera |
| ZZ-014 | **APROBADA** · desktop panel+mundo (solo UX) |
| Integración arte escenario D1 | **ZZ-019B APROBADA** (funcional/visual anti-GIS). Arte final = **DEUDA NO BLOQUEANTE** (carretera, props, edificio–suelo, identidades, pulido superficies) |
| ZZ-015 | QA D1 — **APROBADA** |
| ZZ-020 / ZZ-021 / ZZ-022 | Brief + staffing APROBADA · exploración D3 hecha |

## 0.1b Enmienda 2.7 — qué cambió respecto a 2.6 (histórico)

| Tema | Acción |
|------|--------|
| Landscape móvil | Nuevo ZZ-016 (GATE) |
| Arte patio / cámara > viewport | Nuevo ZZ-017 |
| Sectores + recuperar territorio | Nuevo ZZ-018 + **REVIEW_STOP** |
| Plantillas recuperación / sin cupo sector / sin macrogrid | Contrato §9.4–§9.5 (cierre 2.7) |
| Mundo > viewport (no caber colonia en pantalla) | §9.4 aclaración escala; evidencia pan/zoom ZZ-018 |
| radio max=1 · clinic sin max arbitrario | §9.7 |
| Recuperación sin RNG punitivo v1 | §9.5 |
| Construcción semilibre + snap + ✓ | **ZZ-019 (GATE espacial)** — APROBADA |
| ZZ-010 | Completada históricamente; **no** es el modelo espacial final |
| ZZ-011 | Absorbida/ampliada por ZZ-017 |
| ZZ-012 | Depende espacial; reescribir tips |
| ZZ-024 | Alinear a §9.2–§9.6 (confirm ✓, semilibre) |
| Save | Migración layout/sectores en ZZ-017/018 |

---

## 1. Índice por bloque

| Bloque | Fases | Gates |
|--------|-------|-------|
| A · Fundación | ZZ-001…ZZ-006 (6) | ZZ-001 |
| A2 · Arranque y persistencia | ZZ-009, ZZ-007, ZZ-008 (3) | ZZ-007, ZZ-008 |
| **B0 · Modelo espacial landscape** | **ZZ-016…019 + ZZ-019A (5)** | **ZZ-016, ZZ-019** + **REVIEW_STOP ZZ-018, ZZ-019A** |
| B · Experiencia D1 | ZZ-010…ZZ-015 (6) | ZZ-010, ZZ-012, ZZ-014, ZZ-015 |
| C · Loop D2–D5 | ZZ-020…ZZ-027 (8) | ZZ-021, ZZ-023 |
| D · Vivienda y agua | ZZ-030…ZZ-036 (7) | ZZ-032 |
| E · Clima e invierno | ZZ-040…ZZ-048 (9) | ZZ-048 |
| F · Salud y brotes | ZZ-050…ZZ-059 (10) | ZZ-059 |
| G · Defensa e infectados | ZZ-060…ZZ-065 (6) | ZZ-065 |
| G2 · Daño y reparación | ZZ-066…ZZ-069 (4) | ZZ-069 |
| H · Territorio | ZZ-070…ZZ-073 (4) | ZZ-073 |
| I · Investigación | ZZ-080…ZZ-084 (5) | ZZ-083 |
| J · Vehículos | ZZ-090…ZZ-093 (4) | — |
| J2 · Radio y Centro | ZZ-094…ZZ-096 (3) | — |
| K · Misiones | ZZ-100…ZZ-108 (9) | ZZ-108 |
| L · Logros | ZZ-110…ZZ-113 (4) | — |
| M · Director | ZZ-120…ZZ-126 (7) | ZZ-125 |
| N · Otros humanos | ZZ-130…ZZ-133 (4) | ZZ-133 |
| O · Eras y victoria | ZZ-140…ZZ-144 (5) | ZZ-144 |
| P · UX mundo | ZZ-150…ZZ-154 (5) | ZZ-150, ZZ-154 |
| Q · Arte y audio | ZZ-160…ZZ-165 (6) | ZZ-161, ZZ-165 |
| Q2 · Vida visual | ZZ-166…ZZ-172 (7) | ZZ-172 |
| R · Simulador y balance | ZZ-175…ZZ-178 (4) | ZZ-178 |
| S · Persistencia/ops | ZZ-180…ZZ-183 (4) | ZZ-183 |

---


## A · Fundación

### ZZ-001 — Aprobar contrato GAME_MASTER 2.5 + este plan

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Congelar biblia 2.5 + plan alineado; única puerta a implementación. |
| **Sistemas** | gobernanza, docs |
| **Dependencias** | — |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | n/a |
| **Pruebas funcionales** | Revisión humana |
| **Revisión visual** | No |

**Tareas:** Revisión ChatGPT de GM 2.5; Revisión de este plan + matriz cobertura; Marcar APROBADA solo literal

**Aceptación:**
- ESTADO REVISIÓN APROBADA + APROBACIÓN SÍ
- Matriz cobertura 100%

### ZZ-002 — Auditoría motor vs GAME_MASTER 2.5

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Matriz código↔diseño 2.5 (conservar/reescribir/borrar). Incluir deudas: energía legado, calefacción fuel, techs stub. |
| **Sistemas** | deuda técnica |
| **Dependencias** | ZZ-001 |
| **Archivos approx.** | docs/AUDIT_ENGINE.md |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** docs/AUDIT_ENGINE.md; Listar generator/solar/needEnergy a eliminar del load path

**Aceptación:**
- Sin cambios gameplay aún
- Lista priorizada

### ZZ-003 — Schemas content 2.5

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Schemas: buildings (sin energy), research (sin rama Energía), seasons, outbreaks, buildingHP, missions templates, achievements, ambientLife. |
| **Sistemas** | content |
| **Dependencias** | ZZ-002 |
| **Archivos approx.** | docs/CONTENT_SCHEMA.md |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** docs/CONTENT_SCHEMA.md

**Aceptación:**
- Schemas cubren GM 2.5

### ZZ-004 — Una fuente de mapa (locations)

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Deprecar zones.json del load path. |
| **Sistemas** | mapa |
| **Dependencias** | ZZ-003 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Deprecar zones.json del load path.

**Aceptación:**
- Solo locations.json activo

### ZZ-005 — Balance skeleton 2.5

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | balance.json: labor per_building, woodHeating, outbreaks, buildingDamage, ambientLife, sin needEnergy/energyDemand. |
| **Sistemas** | balance |
| **Dependencias** | ZZ-003 |
| **Archivos approx.** | — |
| **Datos** | balance.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** balance.json: labor per_building, woodHeating, outbreaks, buildingDamage, ambientLife, sin needEnergy/energyDemand.

**Aceptación:**
- Load OK
- Sin regresión D1 visual

### ZZ-006 — Sync Drive ↔ GitHub de los 3 maestros

| Campo | Valor |
|-------|-------|
| **Bloque** | A · Fundación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Hash idéntico GM/PLAN/LOG. |
| **Sistemas** | docs |
| **Dependencias** | ZZ-001 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Hash idéntico GM/PLAN/LOG.

**Aceptación:**
- Hashes iguales


## A2 · Arranque y persistencia

### ZZ-009 — Save v1: 1 partida + autosave + Guardar ahora + backup

| Campo | Valor |
|-------|-------|
| **Bloque** | A2 · Arranque y persistencia |
| **HUMAN_GATE** | NO |
| **Objetivo** | Persistencia §31.7 / Ap. E: main+backup; rotación segura; autosave; Guardar ahora; CONTINUAR con fallback backup. |
| **Sistemas** | save, api PHP/MySQL o storage |
| **Dependencias** | ZZ-006 |
| **Archivos approx.** | api/save, js/save |
| **Datos** | saveVersion bump |
| **Assets** | — |
| **Pruebas auto** | smoke-save |
| **Pruebas funcionales** | corrupt main → backup; no double-corrupt |
| **Revisión visual** | No |

**Tareas:** Eliminar UX multi-slot; main/backup; validación antes de rotar; autosave triggers; Guardar ahora.

**Aceptación:**
- Rotación segura documentada en código+tests
- CONTINUAR sin selector

### ZZ-007 — Portada / inicio (Continuar · Nueva partida)

| Campo | Valor |
|-------|-------|
| **Bloque** | A2 · Arranque y persistencia |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Portada de juego terminado: sin partida → Nueva; con partida → Continuar (principal) + Nueva; ajustes mínimos. Sin slots. |
| **Sistemas** | UX arranque, hub |
| **Dependencias** | ZZ-009 |
| **Archivos approx.** | hub HTML/CSS/JS, api save |
| **Datos** | — |
| **Assets** | arte portada si aplica |
| **Pruebas auto** | smoke-boot |
| **Pruebas funcionales** | Sin/con partida; Continuar primario |
| **Revisión visual** | Sí |

**Tareas:** Portada §31.5; Continuar/Nueva; sin UI de slots; branding.

**Aceptación:**
- Flujo §31.5 cumplido
- Gate humano

### ZZ-008 — Nueva partida: confirmación + mini-intro → D1

| Campo | Valor |
|-------|-------|
| **Bloque** | A2 · Arranque y persistencia |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Aviso si hay colonia; intro ≤3 pasos saltables (contexto/colonia/objetivo); entrar a Día 1. |
| **Sistemas** | onboarding intro |
| **Dependencias** | ZZ-007 |
| **Archivos approx.** | intro UI |
| **Datos** | meta.introSeen |
| **Assets** | — |
| **Pruebas auto** | smoke-boot |
| **Pruebas funcionales** | Skip intro; confirm overwrite |
| **Revisión visual** | Sí |

**Tareas:** Confirmación §31.6; mini-intro 2–3 pasos; Skip; landing D1.

**Aceptación:**
- Sin cascada manual
- Gate humano



## B0 · Modelo espacial y landscape (2.7 → 2.8)

> **Flujo:** ZZ-016 (HUMAN_GATE) → ZZ-017 → ZZ-018 (**REVIEW_STOP**) → ZZ-019 (HUMAN_GATE espacial · **APROBADA**) → **ZZ-019A (REVIEW_STOP · 2.8)** → autorización → ZZ-012.  
> **Criterio:** *«estoy construyendo mi colonia dentro de un mundo»* — superficies reales, no patio ni libertad absoluta de píxel (§9.4).

### ZZ-016 — Landscape móvil + rotate gate

| Campo | Valor |
|-------|-------|
| **Bloque** | B0 · Modelo espacial landscape |
| **HUMAN_GATE** | **YES** |
| **REVIEW_STOP** | NO |
| **Objetivo** | Gameplay landscape-first; pantalla «Gira tu dispositivo» cuidada en portrait; portada/intro vertical OK. |
| **Sistemas** | UX shell, orientación |
| **Dependencias** | ZZ-008 |
| **Archivos approx.** | play.php/css, rotate overlay |
| **Datos** | — |
| **Assets** | icono rotate |
| **Pruebas auto** | smoke-orient |
| **Pruebas funcionales** | Portrait→gate→landscape entra juego; hub vertical |
| **Revisión visual** | Sí |

**Tareas:** Detectar orientación; overlay ZZ; desktop sin gate; hub/intro vertical opcionales.

**Aceptación:**
- Gameplay no usable en portrait sin gate
- Gate de marca (no alert nativo)
- Gate humano

### ZZ-017 — Arte base limpio + colonia > viewport

| Campo | Valor |
|-------|-------|
| **Bloque** | B0 · Modelo espacial landscape |
| **HUMAN_GATE** | NO |
| **REVIEW_STOP** | NO |
| **Objetivo** | Purgar pozo/huerto falsos del terreno; cámara pan/zoom/recenter con espacio > pantalla; save schema posiciones/sectores stub. |
| **Sistemas** | arte, cámara, save |
| **Dependencias** | ZZ-016 |
| **Archivos approx.** | colony-yard, render-map, state/save |
| **Datos** | saveVersion bump |
| **Assets** | patio solo escenografía |
| **Pruebas auto** | smoke-d1, smoke-save |
| **Pruebas funcionales** | Pan lejos del HQ; sin edificios falsos en arte |
| **Revisión visual** | Sí |

**Tareas:** Regenerar arte base; relajar clamp; documentar migración.

**Aceptación:**
- Escenografía ≠ jugable
- Colonia claramente mayor que viewport en landscape

### ZZ-018 — Sectores orgánicos + recuperar territorio

| Campo | Valor |
|-------|-------|
| **Bloque** | B0 · Modelo espacial landscape |
| **HUMAN_GATE** | NO |
| **REVIEW_STOP** | **YES** |
| **Objetivo** | Sectores de geometría orgánica (sin macrogrid); plantillas/componentes de recuperación (§9.5); perímetro vulnerable; UI de decisión clara. |
| **Sistemas** | sectors, construcción, defensa |
| **Dependencias** | ZZ-017 |
| **Archivos approx.** | js/sectors, sim, UI recuperar |
| **Datos** | sectors[] (geometría + plantilla + componentes) |
| **Assets** | ruinas/escombros por sector (formas distintas) |
| **Pruebas auto** | smoke-sectors |
| **Pruebas funcionales** | Recuperar 1 sector con componentes visibles; no construir fuera; sin cupo N; sin RNG punitivo |
| **Revisión visual** | Sí (obligatoria + PARAR) |

**Tareas:** Modelo datos sectores orgánicos; componentes de recuperación; feedback «hemos recuperado…»; link §9.5/§9.8; **generar evidencia REVIEW_STOP**.

**Evidencia REVIEW_STOP (mínimo):**
- D1 normal cercano **sin overlays** = «es un lugar» (no plano de sectores)
- pan a zonas distintas con identidad ambiental (ruinas, aparcamiento, etc.)
- zoom cercano · zoom alejado · recenter
- modo expansión (límites tenues, no GIS) · sector seleccionado
- Núcleo fundido con el entorno (no isla)
- 844×390 · 740×360 · desktop
- Contrato: avisos UI → foco cámara (§9.4) documentado aunque UI completa sea posterior

**Aceptación:**
- No casillas bloqueadas tipo GIS ni hexes uniformes
- Recuperar = decisión situacional, no level-up vacío
- **PARAR** — no ZZ-019 sin autorización Neni/ChatGPT

### ZZ-019 — Construcción semilibre landscape (GATE ESPACIAL TEMPRANO)

| Campo | Valor |
|-------|-------|
| **Bloque** | B0 · Modelo espacial landscape |
| **HUMAN_GATE** | **YES** |
| **REVIEW_STOP** | NO |
| **Objetivo** | Ghost + snap invisible + ✓/✕; pan vs ghost (§9.6); edificios repetibles donde quepan; demo fantasía B0 completa. |
| **Sistemas** | construcción, touch, sectores |
| **Dependencias** | ZZ-018 **autorizada tras REVIEW_STOP**, ZZ-016 |
| **Archivos approx.** | main/build UX, render |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | smoke-build-place |
| **Pruebas funcionales** | 3 huertos distintos; quedarse sin espacio físico; cancelar; pan en build; sin segundo-tap |
| **Revisión visual** | Sí |

**Tareas:** Implementar §9.2–§9.6; navegación básica lista→centrar; contact sheet landscape; validar criterio fantasía §9.4.

**Aceptación:**
- Fantasía de colocación semilibre demostrable (§9.2/§9.6)
- UX móvil landscape inequívoca
- **Gate humano** — APROBADA 2026-08-16 (no reabrir B0 de ghost/✓)
- **Nota 2.8:** el *dónde* (superficies orgánicas + mapa diseñado) → **ZZ-019A**

### ZZ-019A — Escenario diseñado + superficies edificables orgánicas

> **2.8:** Refina el contrato espacial **sin** descartar ZZ-019. El jugador coloca semilibre **dentro** de superficies recuperadas, no en cualquier píxel ni en solares prefijados.

| Campo | Valor |
|-------|-------|
| **Bloque** | B0 · Modelo espacial landscape |
| **HUMAN_GATE** | NO |
| **REVIEW_STOP** | **YES** |
| **Objetivo** | Mapa grande finito con zonas reconocibles; superficies edificables orgánicas (1..N por sector); en modo Construir solo esas superficies; capacidad = geometría+footprint; mantener ghost/✓ de ZZ-019. Caminos/vallas solo visuales. |
| **Sistemas** | mapa/arte colonia, build-place, sectores |
| **Dependencias** | ZZ-019 APROBADA |
| **Archivos approx.** | render-map, sectors/surfaces data, build-place, assets escenario |
| **Datos** | superficies por sector (geometría); save bump si hace falta |
| **Assets** | escenario continuo (carreteras, ruinas, pecios, vegetación, vallas…) — tono actual, más legible |
| **Pruebas auto** | smoke-build-place (solo en superficies); smoke-sectors |
| **Pruebas funcionales** | 2+ layouts distintos en misma superficie; no construir fuera; pan mundo grande; sin GIS/solares beige |
| **Revisión visual** | Sí (obligatoria + PARAR) |

**Tareas:** Datos de superficies; highlight solo en build mode; adaptar freeCells/validación; enriquecer arte del mapa diseñado (sin bonuses inventados); evidencia REVIEW_STOP.

**Evidencia REVIEW_STOP (mínimo):**
- Mundo continuo legible (no superficie neutra) · pan lejos del Núcleo
- Modo construir: solo superficies · ghost · válido/inválido · ✓/✕
- Misma superficie: dos huertos vs huerto+otro · “sin espacio” físico
- 844×390 · desktop · contact sheet

**Aceptación:**
- No libertad absoluta de píxel; no solares prefijados; no cupo N
- ZZ-019 UX intacta
- **PARAR** — no reescribir/aprobar ZZ-012 sin autorización Neni/ChatGPT

### ZZ-019B — Integración visual escenario D1 (REVIEW_STOP · APROBADA)

> **APROBADA 2026-08-16 (Neni+ChatGPT).** No reabre ZZ-019/019A mecánicas. No toca ghost/snap/✓. No solares/macrogrid.  
> Aprobación **funcional/visual de fase** — **no** arte final. Deuda artística → LOG «POST ZZ-019B (NO BLOQUEANTE)».

| Campo | Valor |
|-------|-------|
| **Bloque** | B0 · acabado visual escenario (puente a cierre arte D1) |
| **HUMAN_GATE** | NO |
| **REVIEW_STOP** | **YES** (cerrado APROBADA) |
| **Objetivo** | Mundo coherente sin geometría técnica; carretera integrada; props físicos; build-mode con señal de superficie discreta/temporal; mejor contacto edificio/suelo. |
| **Dependencias** | ZZ-019A, ZZ-014 |
| **Antes de** | ZZ-015 |
| **Archivos approx.** | render-map, css world, harness cache-bust |
| **Pruebas auto** | smoke-d1, smoke-build-place (regresión mecánica) |
| **Revisión visual** | Sí · archivada `docs/review-archive/zz-019b/` |

**Estado revisión:** APROBADA · APROBACIÓN CONTINUACIÓN: SÍ

**Aceptación:** sin Construir = solo escenario; con Construir = capacidad legible sin GIS amarillo dominante.

---

## B · Experiencia D1

### ZZ-010 — Colonia física D1 sin GIS

> **2.7:** Aprobada históricamente como base visual; **no** es el modelo espacial final. Retrofit en B0 (ZZ-017…019).

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Colonia legible; sin círculo/GIS. |
| **Sistemas** | UX D1, mapa, onboarding |
| **Dependencias** | ZZ-001, ZZ-005 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | smoke-d1 |
| **Pruebas funcionales** | Partida nueva D1 |
| **Revisión visual** | Sí |

**Tareas:** Colonia legible; sin círculo/GIS.

**Aceptación:**
- Colonia legible; sin círculo/GIS.
- Gate humano

### ZZ-011 — Cámara D1 protagonista

> **2.7:** Hecha; ampliación colonia > viewport y landscape en **ZZ-017**.

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Zoom/pan/recenter. |
| **Sistemas** | UX D1, mapa, onboarding |
| **Dependencias** | ZZ-010 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | smoke-d1 |
| **Pruebas funcionales** | Partida nueva D1 |
| **Revisión visual** | Sí |

**Tareas:** Zoom/pan/recenter.

**Aceptación:**
- Zoom/pan/recenter.
- OK móvil+desktop

### ZZ-012 — Tutorial D1 contextual en el mundo

> **2.8:** **APROBADA** (Neni+ChatGPT). Tips 2.8 cerrados. No reabrir 019/019A.

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Coach en mundo landscape: una pista contextual; avance por acción; sin cascada Continuar; ayuda §21.3; tips asumen superficies edificables + ✓. |
| **Sistemas** | UX D1, mapa, onboarding |
| **Dependencias** | ZZ-019, **ZZ-019A**, ZZ-008 |
| **Archivos approx.** | js/onboarding.js |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | smoke-d1 |
| **Pruebas funcionales** | Partida nueva D1; skip intro → coach mundo |
| **Revisión visual** | Sí |

**Tareas:** Implementar/rehacer §31.4 tras 2.8; retirar cascadas Continuar; destacar acción; coach se apaga al dominar; enlace a ayuda.

**Aceptación:**
- Una pista a la vez; avance natural; tips 2.8
- Gate humano
### ZZ-013 — HUD recursos D1

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Comida/agua/madera legibles; sin Au/Gu. |
| **Sistemas** | UX D1, mapa, onboarding |
| **Dependencias** | ZZ-012, ZZ-019, ZZ-019A |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | smoke-d1 |
| **Pruebas funcionales** | Partida nueva D1 |
| **Revisión visual** | Sí |

**Tareas:** Comida/agua/madera legibles; sin Au/Gu.

**Aceptación:**
- Comida/agua/madera legibles; sin Au/Gu.
- OK móvil+desktop

### ZZ-014 — Desktop 1920 D1

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Panel+mundo; no vacío. |
| **Sistemas** | UX D1, mapa, onboarding |
| **Dependencias** | ZZ-013 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | smoke-d1 |
| **Pruebas funcionales** | Partida nueva D1 |
| **Revisión visual** | Sí |

**Tareas:** Panel+mundo; no vacío.

**Aceptación:**
- Panel+mundo; no vacío.
- Gate humano

### ZZ-015 — QA D1 + contact sheet

| Campo | Valor |
|-------|-------|
| **Bloque** | B · Experiencia D1 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Smoke+capturas; PARAR hasta APROBADA. |
| **Sistemas** | UX D1, mapa, onboarding |
| **Dependencias** | ZZ-014 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | smoke-d1 |
| **Pruebas funcionales** | Partida nueva D1 |
| **Revisión visual** | Sí |

**Tareas:** Smoke+capturas; PARAR hasta APROBADA.

**Aceptación:**
- Smoke+capturas; PARAR hasta APROBADA.
- Gate humano


## C · Loop D2–D5

### ZZ-020 — Brief diario ritual

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Balance comida/agua (+ madera si frío). |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-015 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Balance comida/agua (+ madera si frío).

**Aceptación:**
- Balance comida/agua (+ madera si frío).

### ZZ-021 — Staffing por edificio canónico

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Único modelo +/-; resumen población SO. |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-020 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Único modelo +/-; resumen población SO.

**Aceptación:**
- Único modelo +/-; resumen población SO.

### ZZ-022 — Exploración D3–D5 mínima

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Reveal→enviar→ruta→retorno. |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-021 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Reveal→enviar→ruta→retorno.

**Aceptación:**
- Reveal→enviar→ruta→retorno.

### ZZ-023 — QA D1→D5

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Loop estable; gate. |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-022 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Loop estable; gate.

**Aceptación:**
- Loop estable; gate.

### ZZ-024 — Construcción selecciono→coloco

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Preview solo en build; sin Tetris. |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Preview solo en build; sin Tetris.

**Aceptación:**
- Preview solo en build; sin Tetris.

### ZZ-025 — Crecimiento población abstracto

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Inmigración/rescates; límites housing. |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-024 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Inmigración/rescates; límites housing.

**Aceptación:**
- Inmigración/rescates; límites housing.

### ZZ-026 — Feedback acciones clave

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Matriz §32. |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-025 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Matriz §32.

**Aceptación:**
- Matriz §32.

### ZZ-027 — Exploradores muerte/recluta

| Campo | Valor |
|-------|-------|
| **Bloque** | C · Loop D2–D5 |
| **HUMAN_GATE** | NO |
| **Objetivo** | Máx 3; dolor real; sin RPG 100. |
| **Sistemas** | sim, colony, exploración |
| **Dependencias** | ZZ-026 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Máx 3; dolor real; sin RPG 100.

**Aceptación:**
- Máx 3; dolor real; sin RPG 100.


## D · Vivienda y agua

### ZZ-030 — Capacidad vivienda + overflow

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Vivienda y agua |
| **HUMAN_GATE** | NO |
| **Objetivo** | Capacidad vivienda + overflow según GM §4–7. |
| **Sistemas** | vivienda, agua, recursos |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | buildings.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Capacidad vivienda + overflow según GM §4–7.

**Aceptación:**
- Pozo produce; cisterna buffer/soft-cap/lluvia
- Sin alquiler diario

### ZZ-031 — Protección climática por tipo

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Vivienda y agua |
| **HUMAN_GATE** | NO |
| **Objetivo** | Protección climática por tipo según GM §4–7. |
| **Sistemas** | vivienda, agua, recursos |
| **Dependencias** | ZZ-030 |
| **Archivos approx.** | — |
| **Datos** | buildings.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Protección climática por tipo según GM §4–7.

**Aceptación:**
- Pozo produce; cisterna buffer/soft-cap/lluvia
- Sin alquiler diario

### ZZ-032 — Vivienda aislada + tech insulation

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Vivienda y agua |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Vivienda aislada + tech insulation según GM §4–7. |
| **Sistemas** | vivienda, agua, recursos |
| **Dependencias** | ZZ-031 |
| **Archivos approx.** | — |
| **Datos** | buildings.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Vivienda aislada + tech insulation según GM §4–7.

**Aceptación:**
- Pozo produce; cisterna buffer/soft-cap/lluvia
- Sin alquiler diario

### ZZ-033 — Alertas cobertura / madera estimada

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Vivienda y agua |
| **HUMAN_GATE** | NO |
| **Objetivo** | Alertas cobertura / madera estimada según GM §4–7. |
| **Sistemas** | vivienda, agua, recursos |
| **Dependencias** | ZZ-032 |
| **Archivos approx.** | — |
| **Datos** | buildings.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Alertas cobertura / madera estimada según GM §4–7.

**Aceptación:**
- Pozo produce; cisterna buffer/soft-cap/lluvia
- Sin alquiler diario

### ZZ-034 — Pozo fuente ≠ cisterna reserva

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Vivienda y agua |
| **HUMAN_GATE** | NO |
| **Objetivo** | Pozo fuente ≠ cisterna reserva según GM §4–7. |
| **Sistemas** | vivienda, agua, recursos |
| **Dependencias** | ZZ-033 |
| **Archivos approx.** | — |
| **Datos** | buildings.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Pozo fuente ≠ cisterna reserva según GM §4–7.

**Aceptación:**
- Pozo produce; cisterna buffer/soft-cap/lluvia
- Sin alquiler diario

### ZZ-035 — Soft-caps storage + cisterna agua

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Vivienda y agua |
| **HUMAN_GATE** | NO |
| **Objetivo** | Soft-caps storage + cisterna agua según GM §4–7. |
| **Sistemas** | vivienda, agua, recursos |
| **Dependencias** | ZZ-034 |
| **Archivos approx.** | — |
| **Datos** | buildings.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Soft-caps storage + cisterna agua según GM §4–7.

**Aceptación:**
- Pozo produce; cisterna buffer/soft-cap/lluvia
- Sin alquiler diario

### ZZ-036 — Estabilidad factores UI secundaria

| Campo | Valor |
|-------|-------|
| **Bloque** | D · Vivienda y agua |
| **HUMAN_GATE** | NO |
| **Objetivo** | Estabilidad factores UI secundaria según GM §4–7. |
| **Sistemas** | vivienda, agua, recursos |
| **Dependencias** | ZZ-035 |
| **Archivos approx.** | — |
| **Datos** | buildings.json |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Estabilidad factores UI secundaria según GM §4–7.

**Aceptación:**
- Pozo produce; cisterna buffer/soft-cap/lluvia
- Sin alquiler diario


## E · Clima e invierno (madera)

### ZZ-040 — Ciclo estaciones en state

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | Primavera/verano/otoño/invierno. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-031, ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | No |

**Tareas:** Primavera/verano/otoño/invierno.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-041 — Clima puntual + duración

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | clear/rain/storm/cold/heat/fog + eventos. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-040 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | No |

**Tareas:** clear/rain/storm/cold/heat/fog + eventos.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-042 — Pipeline aviso→prep→consecuencia

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | Nunca castigo imposible de prever. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-041 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | No |

**Tareas:** Nunca castigo imposible de prever.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-043 — Calefacción automática MADERA

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | maderaNecesariaCalefacción(pop,prot,sev); auto; NO fuel. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-042 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | No |

**Tareas:** maderaNecesariaCalefacción(pop,prot,sev); auto; NO fuel.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-044 — Exposición acumulativa frío

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | verde→ámbar→rojo; no enfermar 1 noche. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-043 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | No |

**Tareas:** verde→ámbar→rojo; no enfermar 1 noche.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-045 — Aviso previo + estimación reserva madera

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | HUD/brief: madera/día y días reserva. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-044 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | No |

**Tareas:** HUD/brief: madera/día y días reserva.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-046 — Impacto clima en prod/exploración/salud

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | Tablas §11. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-045 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | No |

**Tareas:** Tablas §11.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-047 — Feedback visual clima

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | NO |
| **Objetivo** | Partículas/tono; chimeneas si calefacción. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-046 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | Sí |

**Tareas:** Partículas/tono; chimeneas si calefacción.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- OK

### ZZ-048 — QA invierno forzado + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | E · Clima e invierno (madera) |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Escenario frío; wood heat; exposición; capturas. |
| **Sistemas** | clima, madera, vivienda, salud |
| **Dependencias** | ZZ-047 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | woodHeating math; exposure thresholds |
| **Pruebas funcionales** | Aviso ≥1 día antes; Sin fuel en calefacción |
| **Revisión visual** | Sí |

**Tareas:** Escenario frío; wood heat; exposición; capturas.

**Aceptación:**
- Fuel no calienta
- Exposición progresiva
- HUMAN_GATE invierno


## F · Salud y brotes

### ZZ-050 — Camas médicas + curación agregada

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Camas médicas + curación agregada (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Camas médicas + curación agregada (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-051 — Cadena botiquín→enfermería→clínica

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Cadena botiquín→enfermería→clínica (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-050 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Cadena botiquín→enfermería→clínica (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-052 — Explorador wounded/sick timings

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Explorador wounded/sick timings (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-051 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Explorador wounded/sick timings (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-053 — Motor brotes probabilístico (sin calendario)

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Motor brotes probabilístico (sin calendario) (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-052 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Motor brotes probabilístico (sin calendario) (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-054 — Fases brote germen→propagación→pico→contención/crisis→recuperación

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Fases brote germen→propagación→pico→contención/crisis→recuperación (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-053 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Fases brote germen→propagación→pico→contención/crisis→recuperación (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-055 — Arquetipos brote + factores riesgo/reducción

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Arquetipos brote + factores riesgo/reducción (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-054 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Arquetipos brote + factores riesgo/reducción (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-056 — Staffing sanitario + prod solo por sick/reasignación

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Staffing sanitario + prod solo por sick/reasignación (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-055 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Staffing sanitario + prod solo por sick/reasignación (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-057 — Protocolo cuarentena pasivo (tech)

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Protocolo cuarentena pasivo (tech) (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-056 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | No |

**Tareas:** Protocolo cuarentena pasivo (tech) (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-058 — Feedback semáforo salud + alertas brote

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | NO |
| **Objetivo** | Feedback semáforo salud + alertas brote (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-057 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | Sí |

**Tareas:** Feedback semáforo salud + alertas brote (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- OK

### ZZ-059 — QA crisis sanitaria completa + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | F · Salud y brotes |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | QA crisis sanitaria completa + gate (GM §12). |
| **Sistemas** | salud, brotes, research, staffing |
| **Dependencias** | ZZ-058 |
| **Archivos approx.** | — |
| **Datos** | outbreaks content, research quarantine_protocol |
| **Assets** | — |
| **Pruebas auto** | outbreak no fixed day; quarantine reduces spread/duration; no artificial prod penalty; contained vs escalate scenarios |
| **Pruebas funcionales** | Reasignar a enfermería baja contagio esperado; Tech cuarentena pasiva |
| **Revisión visual** | Sí |

**Tareas:** QA crisis sanitaria completa + gate (GM §12).

**Aceptación:**
- Sin calendario fijo
- Prod↓ solo sick+reasignación
- Cuarentena no toggle
- HUMAN_GATE crisis sanitaria jugable


## G · Defensa e infectados

### ZZ-060 — Defensa agregada legible

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Defensa agregada legible |
| **Sistemas** | defensa, infectados |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Defensa agregada legible

**Aceptación:**
- No combate manual
- Informe bajas/daños

### ZZ-061 — Ataques prep→resolve→informe

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Ataques prep→resolve→informe |
| **Sistemas** | defensa, infectados |
| **Dependencias** | ZZ-060 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Ataques prep→resolve→informe

**Aceptación:**
- No combate manual
- Informe bajas/daños

### ZZ-062 — Infectados tipados afectan combate

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Infectados tipados afectan combate |
| **Sistemas** | defensa, infectados |
| **Dependencias** | ZZ-061 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Infectados tipados afectan combate

**Aceptación:**
- No combate manual
- Informe bajas/daños

### ZZ-063 — Munición y armería

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Munición y armería |
| **Sistemas** | defensa, infectados |
| **Dependencias** | ZZ-062 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Munición y armería

**Aceptación:**
- No combate manual
- Informe bajas/daños

### ZZ-064 — Recuperación post-ataque Director

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | NO |
| **Objetivo** | Recuperación post-ataque Director |
| **Sistemas** | defensa, infectados |
| **Dependencias** | ZZ-063 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Parcial |

**Tareas:** Recuperación post-ataque Director

**Aceptación:**
- No combate manual
- Informe bajas/daños

### ZZ-065 — QA ataque + recuperación visual

| Campo | Valor |
|-------|-------|
| **Bloque** | G · Defensa e infectados |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | QA ataque + recuperación visual |
| **Sistemas** | defensa, infectados |
| **Dependencias** | ZZ-064 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** QA ataque + recuperación visual

**Aceptación:**
- No combate manual
- Informe bajas/daños


## G2 · Daño y reparación

### ZZ-066 — HP/estados estructurales edificios

| Campo | Valor |
|-------|-------|
| **Bloque** | G2 · Daño y reparación |
| **HUMAN_GATE** | NO |
| **Objetivo** | ok→damaged→critical→destroyed. |
| **Sistemas** | edificios, defensa, recursos, staffing |
| **Dependencias** | ZZ-061 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | estados daño visual |
| **Pruebas auto** | damage reduces output; repair restores HP; cost wood/metal |
| **Pruebas funcionales** | Tocar dañado→Reparar; Alerta localiza |
| **Revisión visual** | Sí |

**Tareas:** ok→damaged→critical→destroyed.

**Aceptación:**
- Sin craft piezas
- Compite con expansión
- OK

### ZZ-067 — Daño por hordas/eventos/tormentas + perímetro

| Campo | Valor |
|-------|-------|
| **Bloque** | G2 · Daño y reparación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Perímetro roto → interiores. |
| **Sistemas** | edificios, defensa, recursos, staffing |
| **Dependencias** | ZZ-066 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | estados daño visual |
| **Pruebas auto** | damage reduces output; repair restores HP; cost wood/metal |
| **Pruebas funcionales** | Tocar dañado→Reparar; Alerta localiza |
| **Revisión visual** | Sí |

**Tareas:** Perímetro roto → interiores.

**Aceptación:**
- Sin craft piezas
- Compite con expansión
- OK

### ZZ-068 — Acción Reparar (coste/tiempo/workers) + alerta localizar

| Campo | Valor |
|-------|-------|
| **Bloque** | G2 · Daño y reparación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Aviso N edificios; tap→resaltar. |
| **Sistemas** | edificios, defensa, recursos, staffing |
| **Dependencias** | ZZ-067 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | estados daño visual |
| **Pruebas auto** | damage reduces output; repair restores HP; cost wood/metal |
| **Pruebas funcionales** | Tocar dañado→Reparar; Alerta localiza |
| **Revisión visual** | Sí |

**Tareas:** Aviso N edificios; tap→resaltar.

**Aceptación:**
- Sin craft piezas
- Compite con expansión
- OK

### ZZ-069 — QA visual daño→reparación→recuperación + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | G2 · Daño y reparación |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Capturas estados + flujo repair. |
| **Sistemas** | edificios, defensa, recursos, staffing |
| **Dependencias** | ZZ-068 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | estados daño visual |
| **Pruebas auto** | damage reduces output; repair restores HP; cost wood/metal |
| **Pruebas funcionales** | Tocar dañado→Reparar; Alerta localiza |
| **Revisión visual** | Sí |

**Tareas:** Capturas estados + flujo repair.

**Aceptación:**
- Sin craft piezas
- Compite con expansión
- HUMAN_GATE repair visual


## H · Territorio

### ZZ-070 — Beneficios reales de control

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Beneficios reales de control |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-022 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Beneficios reales de control

**Aceptación:**
- Control ≠ pintar verde vacío

### ZZ-071 — Contested/pérdida fronteriza

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Contested/pérdida fronteriza |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-070 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Contested/pérdida fronteriza

**Aceptación:**
- Control ≠ pintar verde vacío

### ZZ-072 — Loot tables por landmark type

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Loot tables por landmark type |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-071 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Loot tables por landmark type

**Aceptación:**
- Control ≠ pintar verde vacío

### ZZ-073 — Fog/discovered polish (no GIS) + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | H · Territorio |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Fog/discovered polish (no GIS) + gate |
| **Sistemas** | mapa, exploración |
| **Dependencias** | ZZ-072 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Fog/discovered polish (no GIS) + gate

**Aceptación:**
- Control ≠ pintar verde vacío


## I · Investigación

### ZZ-080 — Banco técnico + lab con workers +/-

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Research no UI hasta banco; 1 tech activa; más workers→más progreso. |
| **Sistemas** | research |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | research.json |
| **Assets** | — |
| **Pruebas auto** | no energy branch; each tech effect; quarantine passive |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Research no UI hasta banco; 1 tech activa; más workers→más progreso.

**Aceptación:**
- Sin rama Energía
- Sin número prefijado
- Huerto D1 sin tech

### ZZ-081 — Árbol utilitario sin Energía + quarantine_protocol

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Solo techs con test deseo; sin cuota 20/28; sin generator/solar/power_*. |
| **Sistemas** | research |
| **Dependencias** | ZZ-080 |
| **Archivos approx.** | — |
| **Datos** | research.json |
| **Assets** | — |
| **Pruebas auto** | no energy branch; each tech effect; quarantine passive |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Solo techs con test deseo; sin cuota 20/28; sin generator/solar/power_*.

**Aceptación:**
- Sin rama Energía
- Sin número prefijado
- Huerto D1 sin tech

### ZZ-082 — Cablear efectos reales de cada tech

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | NO |
| **Objetivo** | 1 assertion medible por tech. |
| **Sistemas** | research |
| **Dependencias** | ZZ-081 |
| **Archivos approx.** | — |
| **Datos** | research.json |
| **Assets** | — |
| **Pruebas auto** | no energy branch; each tech effect; quarantine passive |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** 1 assertion medible por tech.

**Aceptación:**
- Sin rama Energía
- Sin número prefijado
- Huerto D1 sin tech

### ZZ-083 — UI research legible (deseo claro)

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Beneficio en lenguaje humano. |
| **Sistemas** | research |
| **Dependencias** | ZZ-082 |
| **Archivos approx.** | — |
| **Datos** | research.json |
| **Assets** | — |
| **Pruebas auto** | no energy branch; each tech effect; quarantine passive |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Beneficio en lenguaje humano.

**Aceptación:**
- Sin rama Energía
- Sin número prefijado
- Huerto D1 sin tech

### ZZ-084 — Tests suite research + cuarentena pasiva

| Campo | Valor |
|-------|-------|
| **Bloque** | I · Investigación |
| **HUMAN_GATE** | NO |
| **Objetivo** | Cuarentena no toggle/−prod. |
| **Sistemas** | research |
| **Dependencias** | ZZ-083 |
| **Archivos approx.** | — |
| **Datos** | research.json |
| **Assets** | — |
| **Pruebas auto** | no energy branch; each tech effect; quarantine passive |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Cuarentena no toggle/−prod.

**Aceptación:**
- Sin rama Energía
- Sin número prefijado
- Huerto D1 sin tech


## J · Vehículos

### ZZ-090 — Garage + compra vehículos

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Garage + compra vehículos (fuel ≠ calor). |
| **Sistemas** | vehículos, fuel |
| **Dependencias** | ZZ-022, ZZ-080 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Garage + compra vehículos (fuel ≠ calor).

**Aceptación:**
- Fuel no calienta ni HQ

### ZZ-091 — Fuel solo viajes/repair vehicular

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Fuel solo viajes/repair vehicular (fuel ≠ calor). |
| **Sistemas** | vehículos, fuel |
| **Dependencias** | ZZ-090 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Fuel solo viajes/repair vehicular (fuel ≠ calor).

**Aceptación:**
- Fuel no calienta ni HQ

### ZZ-092 — Efectos speed/cargo/prot

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Efectos speed/cargo/prot (fuel ≠ calor). |
| **Sistemas** | vehículos, fuel |
| **Dependencias** | ZZ-091 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Efectos speed/cargo/prot (fuel ≠ calor).

**Aceptación:**
- Fuel no calienta ni HQ

### ZZ-093 — UI elegir vehículo en expedición

| Campo | Valor |
|-------|-------|
| **Bloque** | J · Vehículos |
| **HUMAN_GATE** | NO |
| **Objetivo** | UI elegir vehículo en expedición (fuel ≠ calor). |
| **Sistemas** | vehículos, fuel |
| **Dependencias** | ZZ-092 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** UI elegir vehículo en expedición (fuel ≠ calor).

**Aceptación:**
- Fuel no calienta ni HQ


## J2 · Radio y Centro de expediciones

### ZZ-094 — Radio: señales/misiones/contactos

| Campo | Valor |
|-------|-------|
| **Bloque** | J2 · Radio y Centro de expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Historias; no +% invisible. |
| **Sistemas** | radio, exploración, misiones |
| **Dependencias** | ZZ-022 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Historias; no +% invisible.

**Aceptación:**
- Roles A GM 2.5
- Ambos edificios

### ZZ-095 — Centro expediciones: info riesgo/tiempo/slots

| Campo | Valor |
|-------|-------|
| **Bloque** | J2 · Radio y Centro de expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Logística; feedback en ficha salida. |
| **Sistemas** | radio, exploración, misiones |
| **Dependencias** | ZZ-094 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Logística; feedback en ficha salida.

**Aceptación:**
- Roles A GM 2.5
- Ambos edificios

### ZZ-096 — QA roles distintos radio≠centro

| Campo | Valor |
|-------|-------|
| **Bloque** | J2 · Radio y Centro de expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Tests que no duplican función. |
| **Sistemas** | radio, exploración, misiones |
| **Dependencias** | ZZ-095 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Tests que no duplican función.

**Aceptación:**
- Roles A GM 2.5
- Ambos edificios


## K · Misiones y expediciones

### ZZ-100 — Schema missions + state

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Schema missions + state |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-094, ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Schema missions + state

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-101 — Misiones guía (pocas)

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Misiones guía (pocas) |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-100 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Misiones guía (pocas)

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-102 — Misiones contextuales necesidad

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Misiones contextuales necesidad |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-101 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Misiones contextuales necesidad

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-103 — Misiones radio/historia/crisis/ambiguas

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Misiones radio/historia/crisis/ambiguas |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-102 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Misiones radio/historia/crisis/ambiguas

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-104 — Motor expedición combinatorio placeState×encounter×choice×outcome×aftermath

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Motor expedición combinatorio placeState×encounter×choice×outcome×aftermath |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-103 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Motor expedición combinatorio placeState×encounter×choice×outcome×aftermath

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-105 — Pesos/cooldown/memoria/antirrepetición/rareza

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Pesos/cooldown/memoria/antirrepetición/rareza |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-104 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Pesos/cooldown/memoria/antirrepetición/rareza

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-106 — UI objetivo único + recompensas

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | UI objetivo único + recompensas |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-105 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** UI objetivo único + recompensas

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-107 — Tests batch muchas expediciones (detección repetición)

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | NO |
| **Objetivo** | Tests batch muchas expediciones (detección repetición) |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-106 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Tests batch muchas expediciones (detección repetición)

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- OK

### ZZ-108 — QA misiones/expediciones variedad + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | K · Misiones y expediciones |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | QA misiones/expediciones variedad + gate |
| **Sistemas** | misiones, exploración, director |
| **Dependencias** | ZZ-107 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | combinatorial coverage; anti-repeat metrics |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** QA misiones/expediciones variedad + gate

**Aceptación:**
- No checklist build infinito
- Supermercado≠farmacia
- HUMAN_GATE


## L · Logros

### ZZ-110 — Schema achievements

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | Schema achievements |
| **Sistemas** | logros |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Schema achievements

**Aceptación:**
- Sin pay-to-win
- Sin logros de electricidad

### ZZ-111 — Tracking + persistencia

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | Tracking + persistencia |
| **Sistemas** | logros |
| **Dependencias** | ZZ-110 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Tracking + persistencia

**Aceptación:**
- Sin pay-to-win
- Sin logros de electricidad

### ZZ-112 — Cablear ≥60 logros (sin generator/solar)

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | Cablear ≥60 logros (sin generator/solar) |
| **Sistemas** | logros |
| **Dependencias** | ZZ-111 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Cablear ≥60 logros (sin generator/solar)

**Aceptación:**
- Sin pay-to-win
- Sin logros de electricidad

### ZZ-113 — Feedback badge no invasivo

| Campo | Valor |
|-------|-------|
| **Bloque** | L · Logros |
| **HUMAN_GATE** | NO |
| **Objetivo** | Feedback badge no invasivo |
| **Sistemas** | logros |
| **Dependencias** | ZZ-112 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Feedback badge no invasivo

**Aceptación:**
- Sin pay-to-win
- Sin logros de electricidad


## M · Director y eventos

### ZZ-120 — Pesos Director vs era/estación/estado

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Director y eventos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Pesos Director vs era/estación/estado (sin cadencia fija). |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-040, ZZ-053 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Pesos Director vs era/estación/estado (sin cadencia fija).

**Aceptación:**
- Nunca cada X días fijo
- Brotes vía pesos

### ZZ-121 — Memoria flags secuelas

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Director y eventos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Memoria flags secuelas (sin cadencia fija). |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-120 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Memoria flags secuelas (sin cadencia fija).

**Aceptación:**
- Nunca cada X días fijo
- Brotes vía pesos

### ZZ-122 — Antirrepetición reforzada

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Director y eventos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Antirrepetición reforzada (sin cadencia fija). |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-121 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Antirrepetición reforzada (sin cadencia fija).

**Aceptación:**
- Nunca cada X días fijo
- Brotes vía pesos

### ZZ-123 — Quiet nights + post-desastre

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Director y eventos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Quiet nights + post-desastre (sin cadencia fija). |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-122 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Quiet nights + post-desastre (sin cadencia fija).

**Aceptación:**
- Nunca cada X días fijo
- Brotes vía pesos

### ZZ-124 — Catástrofes con aviso

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Director y eventos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Catástrofes con aviso (sin cadencia fija). |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-123 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Catástrofes con aviso (sin cadencia fija).

**Aceptación:**
- Nunca cada X días fijo
- Brotes vía pesos

### ZZ-125 — Auditoría eventos vs familias + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Director y eventos |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Auditoría eventos vs familias + gate (sin cadencia fija). |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-124 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Auditoría eventos vs familias + gate (sin cadencia fija).

**Aceptación:**
- Nunca cada X días fijo
- Brotes vía pesos

### ZZ-126 — Ritmo tensión→crisis→recovery tests

| Campo | Valor |
|-------|-------|
| **Bloque** | M · Director y eventos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Ritmo tensión→crisis→recovery tests (sin cadencia fija). |
| **Sistemas** | director, eventos |
| **Dependencias** | ZZ-125 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Ritmo tensión→crisis→recovery tests (sin cadencia fija).

**Aceptación:**
- Nunca cada X días fijo
- Brotes vía pesos


## N · Otros humanos

### ZZ-130 — Contactos por evento (sin 4X)

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Contactos por evento (sin 4X) |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-120 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Contactos por evento (sin 4X)

**Aceptación:**
- Si no aporta → solo flags

### ZZ-131 — Comercio evento

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | NO |
| **Objetivo** | Comercio evento |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-130 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Comercio evento

**Aceptación:**
- Si no aporta → solo flags

### ZZ-132 — UI mínima o solo cards

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | NO |
| **Objetivo** | UI mínima o solo cards |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-131 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** UI mínima o solo cards

**Aceptación:**
- Si no aporta → solo flags

### ZZ-133 — Go/no-go facciones tras playtest

| Campo | Valor |
|-------|-------|
| **Bloque** | N · Otros humanos |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Go/no-go facciones tras playtest |
| **Sistemas** | facciones ligeras |
| **Dependencias** | ZZ-132 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Go/no-go facciones tras playtest

**Aceptación:**
- Si no aporta → solo flags


## O · Eras y victoria

### ZZ-140 — Unlock eras por indicadores 2.5

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | Unlock eras por indicadores 2.5 |
| **Sistemas** | eras, victoria |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Unlock eras por indicadores 2.5

**Aceptación:**
- Sin electricidad en victoria
- Culminación no checkbox pop

### ZZ-141 — Victoria multi-condición SIN needEnergy

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | Victoria multi-condición SIN needEnergy |
| **Sistemas** | eras, victoria |
| **Dependencias** | ZZ-140 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Victoria multi-condición SIN needEnergy

**Aceptación:**
- Sin electricidad en victoria
- Culminación no checkbox pop

### ZZ-142 — Crisis final variable

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | Crisis final variable |
| **Sistemas** | eras, victoria |
| **Dependencias** | ZZ-141 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Crisis final variable

**Aceptación:**
- Sin electricidad en victoria
- Culminación no checkbox pop

### ZZ-143 — Endless post-victoria

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | NO |
| **Objetivo** | Endless post-victoria |
| **Sistemas** | eras, victoria |
| **Dependencias** | ZZ-142 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Endless post-victoria

**Aceptación:**
- Sin electricidad en victoria
- Culminación no checkbox pop

### ZZ-144 — Pantallas victoria/derrota + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | O · Eras y victoria |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Pantallas victoria/derrota + gate |
| **Sistemas** | eras, victoria |
| **Dependencias** | ZZ-143 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Pantallas victoria/derrota + gate

**Aceptación:**
- Sin electricidad en victoria
- Culminación no checkbox pop


## P · UX mundo

### ZZ-150 — Sheets móvil/desktop consistentes

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Sheets móvil/desktop consistentes |
| **Sistemas** | UX |
| **Dependencias** | ZZ-023 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Sheets móvil/desktop consistentes

**Aceptación:**
- Mundo primero; sin pestañas app

### ZZ-151 — Alertas prioritizadas

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo |
| **HUMAN_GATE** | NO |
| **Objetivo** | Alertas prioritizadas |
| **Sistemas** | UX |
| **Dependencias** | ZZ-150 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Alertas prioritizadas

**Aceptación:**
- Mundo primero; sin pestañas app

### ZZ-152 — Ayuda consultable (§21.3)

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo |
| **HUMAN_GATE** | NO |
| **Objetivo** | Panel ayuda pequeña: controles, recursos, conceptos desbloqueados, consejos; sin spoilers de sistemas futuros. |
| **Sistemas** | UX, ayuda |
| **Dependencias** | ZZ-151, ZZ-012 |
| **Archivos approx.** | help UI |
| **Datos** | meta.helpSeenTopics |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | Abrir ayuda; no spoilers |
| **Revisión visual** | Sí |

**Tareas:** §21.3; acceso ?/Más; contenido gated por progreso; no enciclopedia.

**Aceptación:**
- Consulta voluntaria OK
- Sin spoiler de sistemas no vistos

### ZZ-153 — Diario no spam

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo |
| **HUMAN_GATE** | NO |
| **Objetivo** | Diario no spam |
| **Sistemas** | UX |
| **Dependencias** | ZZ-152 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Diario no spam

**Aceptación:**
- Mundo primero; sin pestañas app

### ZZ-154 — Accesibilidad básica + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | P · UX mundo |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Accesibilidad básica + gate |
| **Sistemas** | UX |
| **Dependencias** | ZZ-153 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Accesibilidad básica + gate

**Aceptación:**
- Mundo primero; sin pestañas app


## Q · Arte y audio

### ZZ-160 — Assets edificios (insulated, estados daño)

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Assets edificios (insulated, estados daño) (sin assets solar/generator obligatorios). |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-015 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Assets edificios (insulated, estados daño) (sin assets solar/generator obligatorios).

**Aceptación:**
- Sin dependencia eléctrica

### ZZ-161 — Terreno ciudad close-up + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Terreno ciudad close-up + gate (sin assets solar/generator obligatorios). |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-160 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Terreno ciudad close-up + gate (sin assets solar/generator obligatorios).

**Aceptación:**
- Sin dependencia eléctrica

### ZZ-162 — Landmarks set

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Landmarks set (sin assets solar/generator obligatorios). |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-161 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Landmarks set (sin assets solar/generator obligatorios).

**Aceptación:**
- Sin dependencia eléctrica

### ZZ-163 — Props colonia

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | Props colonia (sin assets solar/generator obligatorios). |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-162 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Props colonia (sin assets solar/generator obligatorios).

**Aceptación:**
- Sin dependencia eléctrica

### ZZ-164 — SFX mínimo + mute

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | NO |
| **Objetivo** | SFX mínimo + mute (sin assets solar/generator obligatorios). |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-163 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** SFX mínimo + mute (sin assets solar/generator obligatorios).

**Aceptación:**
- Sin dependencia eléctrica

### ZZ-165 — Review visual por era + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | Q · Arte y audio |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Review visual por era + gate (sin assets solar/generator obligatorios). |
| **Sistemas** | arte, audio |
| **Dependencias** | ZZ-164 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | Sí |

**Tareas:** Review visual por era + gate (sin assets solar/generator obligatorios).

**Aceptación:**
- Sin dependencia eléctrica


## Q2 · Vida visual y movimiento

### ZZ-166 — Sistema habitantes ambientales (cap render)

| Campo | Valor |
|-------|-------|
| **Bloque** | Q2 · Vida visual y movimiento |
| **HUMAN_GATE** | NO |
| **Objetivo** | Muestra proporcional; sin fichas individuales. |
| **Sistemas** | arte, UX, perf |
| **Dependencias** | ZZ-021, ZZ-015 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | sprite cap; perf budget mobile |
| **Pruebas funcionales** | Se ve viva sin 100 NPCs |
| **Revisión visual** | Sí |

**Tareas:** Muestra proporcional; sin fichas individuales.

**Aceptación:**
- No Sims
- Cap render
- OK

### ZZ-167 — Movimiento trabajo por edificio staffed

| Campo | Valor |
|-------|-------|
| **Bloque** | Q2 · Vida visual y movimiento |
| **HUMAN_GATE** | NO |
| **Objetivo** | Farm/well/taller/etc. |
| **Sistemas** | arte, UX, perf |
| **Dependencias** | ZZ-166 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | sprite cap; perf budget mobile |
| **Pruebas funcionales** | Se ve viva sin 100 NPCs |
| **Revisión visual** | Sí |

**Tareas:** Farm/well/taller/etc.

**Aceptación:**
- No Sims
- Cap render
- OK

### ZZ-168 — Animaciones construcción + reparación

| Campo | Valor |
|-------|-------|
| **Bloque** | Q2 · Vida visual y movimiento |
| **HUMAN_GATE** | NO |
| **Objetivo** | Polvo/andamiaje. |
| **Sistemas** | arte, UX, perf |
| **Dependencias** | ZZ-167 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | sprite cap; perf budget mobile |
| **Pruebas funcionales** | Se ve viva sin 100 NPCs |
| **Revisión visual** | Sí |

**Tareas:** Polvo/andamiaje.

**Aceptación:**
- No Sims
- Cap render
- OK

### ZZ-169 — Semáforo verde/ámbar/rojo + enfermos

| Campo | Valor |
|-------|-------|
| **Bloque** | Q2 · Vida visual y movimiento |
| **HUMAN_GATE** | NO |
| **Objetivo** | Estados agregados. |
| **Sistemas** | arte, UX, perf |
| **Dependencias** | ZZ-168 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | sprite cap; perf budget mobile |
| **Pruebas funcionales** | Se ve viva sin 100 NPCs |
| **Revisión visual** | Sí |

**Tareas:** Estados agregados.

**Aceptación:**
- No Sims
- Cap render
- OK

### ZZ-170 — Clima visible + explorador ida/vuelta

| Campo | Valor |
|-------|-------|
| **Bloque** | Q2 · Vida visual y movimiento |
| **HUMAN_GATE** | NO |
| **Objetivo** | Ruta silueta. |
| **Sistemas** | arte, UX, perf |
| **Dependencias** | ZZ-169 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | sprite cap; perf budget mobile |
| **Pruebas funcionales** | Se ve viva sin 100 NPCs |
| **Revisión visual** | Sí |

**Tareas:** Ruta silueta.

**Aceptación:**
- No Sims
- Cap render
- OK

### ZZ-171 — Actividad/alerta durante hordas

| Campo | Valor |
|-------|-------|
| **Bloque** | Q2 · Vida visual y movimiento |
| **HUMAN_GATE** | NO |
| **Objetivo** | Flash perímetro; refugio. |
| **Sistemas** | arte, UX, perf |
| **Dependencias** | ZZ-170 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | sprite cap; perf budget mobile |
| **Pruebas funcionales** | Se ve viva sin 100 NPCs |
| **Revisión visual** | Sí |

**Tareas:** Flash perímetro; refugio.

**Aceptación:**
- No Sims
- Cap render
- OK

### ZZ-172 — Perf móvil ambient life + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | Q2 · Vida visual y movimiento |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | 3 y ~100 pop; FPS aceptable. |
| **Sistemas** | arte, UX, perf |
| **Dependencias** | ZZ-171 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | sprite cap; perf budget mobile |
| **Pruebas funcionales** | Se ve viva sin 100 NPCs |
| **Revisión visual** | Sí |

**Tareas:** 3 y ~100 pop; FPS aceptable.

**Aceptación:**
- No Sims
- Cap render
- HUMAN_GATE perf+vida


## R · Simulador y balance

### ZZ-175 — Harness perfiles IA-jugador

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | NO |
| **Objetivo** | Harness perfiles IA-jugador |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-120, ZZ-053, ZZ-043 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Harness perfiles IA-jugador

**Aceptación:**
- Perfil mala gestión pierde más

### ZZ-176 — Métricas batch D30/D100

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | NO |
| **Objetivo** | Métricas batch D30/D100 |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-175 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Métricas batch D30/D100

**Aceptación:**
- Perfil mala gestión pierde más

### ZZ-177 — Calibración normal (madera/brotes/ataques)

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | NO |
| **Objetivo** | Calibración normal (madera/brotes/ataques) |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-176 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Calibración normal (madera/brotes/ataques)

**Aceptación:**
- Perfil mala gestión pierde más

### ZZ-178 — Informe balance + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | R · Simulador y balance |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Informe balance + gate |
| **Sistemas** | simulador, balance |
| **Dependencias** | ZZ-177 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Informe balance + gate

**Aceptación:**
- Perfil mala gestión pierde más


## S · Release

### ZZ-180 — Migraciones save (main+backup, sin energy)

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Release |
| **HUMAN_GATE** | NO |
| **Objetivo** | Migrar saves multi-slot/legacy → main(+backup); quitar campos energy; alinear Ap. E / §31.7. |
| **Sistemas** | release, save |
| **Dependencias** | ZZ-178, ZZ-172, ZZ-009 |
| **Archivos approx.** | migraciones |
| **Datos** | saveVersion |
| **Assets** | — |
| **Pruebas auto** | smoke-save |
| **Pruebas funcionales** | Save viejo carga |
| **Revisión visual** | No |

**Tareas:** Migraciones; sin energy fields; multi-slot → main.

**Aceptación:**
- Carga legacy segura
- No deploy sin orden

### ZZ-181 — Smoke E2E móvil+desktop

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Release |
| **HUMAN_GATE** | NO |
| **Objetivo** | Smoke E2E móvil+desktop |
| **Sistemas** | release |
| **Dependencias** | ZZ-180 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Smoke E2E móvil+desktop

**Aceptación:**
- No deploy sin orden

### ZZ-182 — Perf mapa + ambient

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Release |
| **HUMAN_GATE** | NO |
| **Objetivo** | Perf mapa + ambient |
| **Sistemas** | release |
| **Dependencias** | ZZ-181 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Perf mapa + ambient

**Aceptación:**
- No deploy sin orden

### ZZ-183 — Deploy solo bajo orden + gate

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Release |
| **HUMAN_GATE** | **YES** |
| **Objetivo** | Deploy solo bajo orden + gate |
| **Sistemas** | release |
| **Dependencias** | ZZ-182 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Deploy solo bajo orden + gate

**Aceptación:**
- No deploy sin orden

### ZZ-184 — Hotfix post-lanzamiento

| Campo | Valor |
|-------|-------|
| **Bloque** | S · Release |
| **HUMAN_GATE** | NO |
| **Objetivo** | Hotfix post-lanzamiento |
| **Sistemas** | release |
| **Dependencias** | ZZ-183 |
| **Archivos approx.** | — |
| **Datos** | — |
| **Assets** | — |
| **Pruebas auto** | — |
| **Pruebas funcionales** | — |
| **Revisión visual** | No |

**Tareas:** Hotfix post-lanzamiento

**Aceptación:**
- No deploy sin orden


---

## 5. Conteos

| Métrica | Valor |
|---------|-------|
| Total fases | **131** |
| HUMAN_GATE | **27** |
| Nuevos bloques vs plan 2.5 | A2 arranque/persistencia (ZZ-007..009) |
| Ampliadas | ZZ-012 tutorial contextual; ZZ-152 ayuda; ZZ-180 migraciones main+backup |
| Eliminado del alcance | Energía eléctrica / generator / solar / needEnergy / calefacción fuel / multi-slots UX |

---

## 6. Sync Drive

| Doc | Drive | Repo |
|-----|-------|------|
| Biblia | `...\GAME_MASTER\ZONA_ZERO_GAME_MASTER.md` | `GAME_MASTER.md` |
| Plan | `...\ZONA_ZERO_IMPLEMENTATION_PLAN.md` | `docs/IMPLEMENTATION_PLAN.md` |
| Log | `...\ZONA_ZERO_DEVELOPMENT_LOG.md` | `docs/DEVELOPMENT_LOG.md` |

---

*Fin plan técnico 2.6 — alineado a GAME_MASTER 2.6.*

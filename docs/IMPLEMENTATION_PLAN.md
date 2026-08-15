# Zona Zero — Plan de implementación técnico (Diseño 2.0)

**Estado:** Contrato de ejecución — **no implementar** hasta aprobación humana del `GAME_MASTER.md` 2.0.  
**Principio:** bloques de aprobación; nunca capas encima de UX D1 no aprobada.  
**Stack:** HTML/CSS/JS + PHP + MySQL · contenido en `content/*.json`.

---

## 0. Reglas de ejecución

1. Leer `GAME_MASTER.md` 2.0 antes de cada bloque.  
2. No hardcodear balance en UI.  
3. Cada fase: tests + criterio de aceptación; revisión humana cuando se indique.  
4. Capturas/review solo cuando el bloque cambie experiencia visual jugable.  
5. No deploy salvo petición explícita.  
6. Commit de código solo tras aprobación del bloque.

---

## A. FUNDACIÓN DOCUMENTAL Y DATOS

### F01 — Congelar contrato de diseño
- Objetivo: GAME_MASTER 2.0 + este plan aprobados.  
- Archivos: `GAME_MASTER.md`, `docs/IMPLEMENTATION_PLAN.md`.  
- Tests: revisión humana.  
- Aceptación: “autorizado a implementar bloque N”.  
- **Revisión humana: SÍ (bloquea todo).**

### F02 — Inventario de deuda técnica vs diseño
- Objetivo: matriz código↔diseño (qué conservar, qué reescribir, qué borrar).  
- Archivos: `docs/AUDIT_ENGINE.md` (nuevo).  
- Aceptación: lista priorizada sin cambios de juego aún.

### F03 — Esquema de content unificado
- Objetivo: definir schemas JSON (buildings, research, seasons, missions, achievements…).  
- Archivos: `docs/CONTENT_SCHEMA.md`.  
- Aceptación: schemas documentados.

### F04 — Deprecar fuentes dobles
- Objetivo: `zones.json` legado fuera del load path; documentar migración.  
- Dependencias: F03.  
- Aceptación: una sola fuente de mapa.

### F05 — Balance skeleton 2.0
- Objetivo: `balance.json` con secciones seasons, housingClimate, missions, laborModel.  
- Sin retocar gameplay visible aún.  
- Tests: loadContent no rompe.

---

## B. EXPERIENCIA D1 (VISUAL + INTERACCIÓN) — BLOQUE APROBACIÓN

### F10 — Colonia física D1 (sin GIS)
- Objetivo: refugio legible, sin círculo/polígono territorio.  
- Archivos: `js/render-map.js`, `css/game.css`, assets props si hay.  
- Aceptación: usuario reconoce colonia en 3 s.  
- Capturas: D1 entrar / tras intro.  
- **Revisión humana: SÍ.**

### F11 — Cámara D1 protagonista
- Zoom/pan/recenter; no perder colonia.  
- Archivos: `render-map.js`, `main.js`.  
- Aceptación: recenter siempre útil.

### F12 — Tutorial D1 por acciones
- Intro → construir huerto → colocar → staff → (pozo).  
- Archivos: `onboarding.js`, `main.js`, `world.css`.  
- Aceptación: sin cascada Continuar; una acción/explicación.

### F13 — HUD recursos comprensibles D1
- Nombres comida/agua; tooltips; tap toast.  
- Aceptación: sin Au/Gu/A/D.

### F14 — Desktop 1920 D1
- Panel/dock/colonia legible.  
- **Revisión humana: SÍ (móvil+desktop).**

### F15 — QA D1 save/load + contact sheet
- Tests: smoke-d1, partida nueva real.  
- Parar hasta aprobación.

---

## C. LOOP CORE D2–D5 (TRAS APROBACIÓN D1)

### F20 — Brief diario ritual
- Comida/agua balance + hechos.  
- Archivos: `sim.js`, `main.js`, CSS.

### F21 — Staffing por edificio pulido
- Ficha clara; warn sin dots GIS; autoasignar opcional.  
- Archivos: `colony.js`, `main.js`.

### F22 — Exploración D3–D5
- Reveal natural; ficha; ruta; retorno.  
- Sin research/vehículos aún en tutorial.

### F23 — QA D1→D5 bloque
- Capturas + revisión humana. **SÍ.**

---

## D. NECESIDADES Y VIVIENDA

### F30 — Capacidad vivienda + overflow
### F31 — Protección climática por edificio
### F32 — Vivienda aislada + tech unlock
### F33 — Alertas cobertura térmica
### F34 — Soft-caps almacenamiento visibles
### F35 — Estabilidad: factores y UI secundaria

---

## E. ESTACIONES Y CLIMA

### F40 — Ciclo estaciones en balance + state
### F41 — Clima puntual + duración
### F42 — Pipeline aviso → preparación → consecuencia
### F43 — Feedback visual clima
### F44 — Impacto producción/exploración/salud
### F45 — QA invierno simulado

---

## F. SALUD

### F50 — Camas médicas y curación agregada
### F51 — Cadena botiquín→enfermería→clínica
### F52 — Explorador wounded/sick timings
### F53 — Alertas salud

---

## G. DEFENSA E INFECTADOS

### F60 — Defensa agregada legible (sin A/D crudos)
### F61 — Ataques: prep → resolve → informe
### F62 — Infectados tipados en combate zona
### F63 — Munición y armería
### F64 — Recuperación post-ataque
### F65 — QA ataque + recuperación visual

---

## H. TERRITORIO

### F70 — Beneficios reales de control
### F71 — Contested/pérdida fronteriza (si diseño lo mantiene)
### F72 — Landmarks tablas loot por tipo
### F73 — Fog/discovered polish visual (no GIS)

---

## I. RESEARCH (EFECTOS REALES)

### F80 — Cablear todos los effects de research
### F81 — Ramas Medicina/Energía ampliadas
### F82 — UI research legible en Más
### F83 — Tests: cada tech aplica al menos 1 efecto medible

---

## J. VEHÍCULOS

### F90 — Compra/requisitos garage
### F91 — Efectos speed/cargo/fuel/protección
### F92 — Reparación abstracta
### F93 — Integración expedición

---

## K. MISIONES

### F100 — Schema missions + state
### F101 — Misiones guía (sustituyen coach sticky)
### F102 — Misiones contextuales por necesidad
### F103 — Misiones aleatorias (radio, rescate…)
### F104 — Misiones de era
### F105 — UI objetivo único + recompensas
### F106 — QA misiones no spam

---

## L. LOGROS

### F110 — Schema achievements
### F111 — Tracking + persistencia
### F112 — ≥60 logros cableados
### F113 — Feedback badge no invasivo

---

## M. EVENTOS / DIRECTOR 2.0

### F120 — Revisar pesos vs eras/estaciones
### F121 — Memoria flags secuelas
### F122 — Antirrepetición reforzada
### F123 — Quiet nights calibrados
### F124 — Catástrofes con aviso
### F125 — Contenido: auditar 110 eventos vs familias

---

## N. OTROS HUMANOS (LIGERO)

### F130 — Contactos por evento (sin 4X)
### F131 — Comercio evento
### F132 — UI mínima o solo cards
### F133 — Decisión go/no-go tras playtest

---

## O. ERAS Y VICTORIA

### F140 — Unlock eras por indicadores diseño 2.0
### F141 — Cadena victoria multi-condición
### F142 — Crisis final variable por semilla
### F143 — Endless post-victoria
### F144 — Pantallas victoria/derrota narrativas

---

## P. UX MUNDO COMPLETA

### F150 — Sheets consistentes móvil/desktop
### F151 — Alertas prioritizadas
### F152 — Ayuda / ? contextual
### F153 — Diario no spam
### F154 — Accesibilidad básica (tap targets, contraste)

---

## Q. ARTE Y AUDIO (TRAS APROBACIÓN VISUAL)

### F160 — Lote edificios faltantes (insulated, etc.)
### F161 — Terreno ciudad close-up
### F162 — Landmarks set completo
### F163 — Props colonia
### F164 — SFX set mínimo + mute
### F165 — Review visual por era

---

## R. SIMULADOR Y BALANCE

### F170 — Harness perfiles IA-jugador
### F171 — Métricas batch D30/D100
### F172 — Calibración normal
### F173 — Informe balance

---

## S. PRODUCCIÓN / RELEASE

### F180 — Migraciones save v5
### F181 — Smoke E2E móvil+desktop
### F182 — Perf mapa
### F183 — Deploy solo bajo orden
### F184 — Hotfix post-lanzamiento

---

## Conteos del plan

| Bloque | Fases |
|--------|-------|
| A Fundación | F01–F05 (5) |
| B D1 | F10–F15 (6) |
| C D2–D5 | F20–F23 (4) |
| D Vivienda | F30–F35 (6) |
| E Clima | F40–F45 (6) |
| F Salud | F50–F53 (4) |
| G Defensa | F60–F65 (6) |
| H Territorio | F70–F73 (4) |
| I Research | F80–F83 (4) |
| J Vehículos | F90–F93 (4) |
| K Misiones | F100–F106 (7) |
| L Logros | F110–F113 (4) |
| M Director | F120–F125 (6) |
| N Humanos | F130–F133 (4) |
| O Eras/Victoria | F140–F144 (5) |
| P UX | F150–F154 (5) |
| Q Arte/Audio | F160–F165 (6) |
| R Sim | F170–F173 (4) |
| S Release | F180–F184 (5) |
| **Total** | **~94 fases** |

Subfases de QA/capturas se cuentan dentro de cada Fi cuando aplica.

---

## Dependencias críticas

```
F01 ──► F02–F05
F01 ──► F10–F15 (D1) ──► APROBACIÓN HUMANA
         └──► F20–F23
                ├──► F30–F35 + F40–F45
                ├──► F50–F53
                ├──► F60–F65 + F70–F73
                ├──► F80–F83 + F90–F93
                ├──► F100–F113
                └──► F120+ … F184
```

---

## Decisiones de implementación vs código actual

1. Conservar motor diario `sim.js` como base; extender, no tirar.  
2. Staffing por edificio = canónico; panel labor por categorías → resumen.  
3. Cablear research antes de añadir más techs.  
4. No nuevas capas UI hasta D1 aprobado.  
5. Misiones/logros/estaciones = sistemas nuevos en content + state.  
6. Facciones: último en prioridad core.

---

*Fin del plan técnico 2.0.*

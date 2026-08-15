# ZONA ZERO — GAME_MASTER

**Fuente de verdad compartida** (Cursor ↔ ChatGPT)  
**Versión de diseño:** 1.0 · **Versión técnica objetivo:** **1.0.0**  
**Repositorio:** `Anabguer/zona-zero` · rama `main`  
**URL:** https://intocables13.com/juegos/zona-zero/  
**Stack:** HTML/CSS/JS + PHP + MySQL · sin APK · 3 slots · auth Intocables

---

## 0. REGLA MAESTRA

Zona Zero es un juego de **gestión indirecta, expansión territorial y supervivencia emergente**.

> Empiezo con 3 supervivientes y casi nada. Veo algo que necesito. Asigno gente. Arriesgo. Consigo recursos. Construyo. Ocupo edificios. Mi zona crece. Llega más gente. Cuando creo que lo tengo controlado, sucede algo inesperado. Pierdo recursos, edificios o población. Me reorganizo y sigo creciendo.

No es un RPG. No se controla directamente a ningún personaje. No hay campaña lineal.

---

## 1–35. DISEÑO APROBADO (PRODUCTO)

Las reglas de diseño, sistemas, contenido mínimo, arte, Director, eras, victoria/endless, balance, simulador y criterio de entrega están definidas en el diseño integral v1.0 aprobado (documento MEGA PLAN fusionado). Resumen operativo:

### Pilares
Gestión indirecta · crecimiento visible · riesgo real · imprevisibilidad controlada · poca microgestión.

### Inicio
3 supervivientes · Refugio Central N1 · capacidad ~4 · reservas mínimas · sector inicial seguro · 2–4 localizaciones próximas conocidas · semilla procedural.

### Recursos (7)
comida, agua, madera, metal, medicinas, combustible, munición (+ energía como capacidad, no inventario basura).

### Habilidades (5)
Explorar · Recolectar · Construir · Producir · Defender. Escala 1–5, suben con uso. 1–2 rasgos ligeros.

### Sistemas v1 (mínimos)
- Base visual + 20+ edificios/mejoras
- Mapa urbano 15+ tipos de localización + estados territoriales
- Expediciones automáticas + equipamiento rápido + vehículos
- Infectados (pocos tipos) + ataques a base
- Director adaptativo (fuerza/fragilidad/momentum/tensión + presupuesto)
- **≥80 eventos base / ≥15 familias** + variantes + antirrepetición
- Clima/catástrofes · facciones 3–6 · investigación 4 ramas · 5 eras
- Victoria + endless · muerte permanente · 3 slots MySQL
- Arte SVG propio (sin emojis como arte principal)
- Tutorial contextual corto
- Simulador headless + tests E2E
- Móvil primero

### Familias de eventos
hallazgos, radio, supervivientes, hambre_agua, enfermedad, accidentes, clima, infectados, ataques, infraestructura, comercio, rumores, conflictos, expansion, catastrofes (+ calma).

### Eras
0 Sobrevivir · 1 Asegurar · 2 Expandir · 3 Consolidar · 4 Estabilizar (por indicadores, no por día fijo).

### Victoria
Estabilizar Zona Zero (territorio, población, sostenibilidad, sanidad, energía, defensa, logística, crisis final). Luego endless o nueva partida.

### Prohibido
Campaña lineal · control directo · combate manual · Excel-UI · emojis como arte · APK · hardcodes de balance en lógica · monetización.

### Criterio de entrega
No basta con que compile: partida manual jugable, simulaciones largas, derrota/recuperación/victoria verificables, móvil+escritorio, deploy, commit/push.

---

## TÉCNICO — IMPLEMENTACIÓN

| Campo | Valor |
|-------|--------|
| Versión técnica | **1.0.0** |
| Ubicación local | `W:\juegos\zona-zero\` |
| Biblioteca | https://intocables13.com/juegos/ |
| Prefijo SQL | `zona_zero_*` |
| Auth | Intocables (`/intocables/includes` local, `/includes` prod) |
| `save_version` / `v` | **3** |
| Eventos | **110** (15 familias ×7 + 5 calma) |
| Edificios | **32** |
| Localizaciones mapa | **18** |

### Arquitectura
- Cliente: `js/` (state, sim, director, render, icons, api, main)
- Contenido: `content/*.json` (balance, buildings, locations, events, survivors, research, vehicles, infected, factions, eras)
- API PHP: `api/` + `zona_zero_saves`
- Assets SVG generados en proyecto
- Tools: `scripts/balance-sim.mjs`, E2E Playwright/harness

### Persistencia
3 slots · autosave + guardado explícito · migraciones versionadas (v1/v2 → v3).

---

## CHANGELOG

### 1.0.0
- Fusión GAME_MASTER con diseño integral v1 (MEGA PLAN)
- Implementación v1: save v3, 5 skills, 32 edificios, 18 localizaciones, 110 eventos / 15 familias + calma
- Sistemas: producción con puestos, expediciones+equipo, combate/ataques, Director (tensión/fuerza/fragilidad), investigación, vehículos, facciones, clima, eras, victoria+endless
- Arte/UX: HUD, mapa urbano, base, retratos, tips; móvil-first
- Simulador `scripts/balance-sim.mjs`: 360 partidas (4 perfiles × 80 @60d + 40 @120d) + test victoria
  - balanced@60 supervivencia ~80%; mismanaged@60 ~42%; balanced@120 ~87%; victoria forzada OK
- E2E motor + Playwright UI OK

### 0.3.0
- Pasada UX/UI MVP (paleta tierra/metal, mapa/base visual, skills, tips)

### 0.2.x – 0.1.0
- MVP jugable inicial, recursos ampliados, fix `[hidden]`/Derrota, repo GitHub

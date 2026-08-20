# PRE_RELEASE_PLAN — Propuesta (sin implementar)

**Fecha:** 2026-08-16  
**Estado:** PROPUESTA para decisión Neni/ChatGPT  
**No es** continuación automática del IMPLEMENTATION_PLAN 2.8 (135 fases).  
**No incluye** ZZ-184 (hotfix post-lanzamiento).  
**No autoriza** deploy.

---

## 1. Por qué un plan aparte

Hasta ZZ-183 el PLAN 2.8 sirvió para **construir y cerrar sistemas** con HUMAN_GATE.

La etapa pre-publicación pregunta otra cosa:

> ¿Es un producto jugable, comprensible y presentable?

Eso exige **pocas frentes grandes** (playtest → UX fricción → objetivos → arte A → audio → robustez), no 40 microfases de sistemas nuevos.

**Recomendación:** mantener GAME_MASTER 2.8 + DEVELOPMENT_LOG como biblia/bitácora, y gobernar el trabajo pre-pub con **este PRE_RELEASE_PLAN** (o un bloque `PR-*` corto en el LOG), sin inventar mecánicas nuevas salvo P0 de playtest.

---

## 2. Principios

1. **No nuevos sistemas** salvo que un playtest demuestre bloqueo.  
2. **Playtest humano antes** de pulir a ciegas.  
3. **Arte A ≠ deuda de desarrollo**; requiere ART PASS expreso.  
4. **Balance:** WATCH ZZ-178 intactos hasta evidencia humana.  
5. **Deploy** solo con orden expresa (independiente de este plan).  
6. **ZZ-184** solo post-publicación si hay hotfix real.

---

## 3. Backlog propuesto (prioridad)

### P0 — bloquea playtest serio o publicación mínima

| ID | Ítem | Origen | Notas |
|----|------|--------|-------|
| **P0-MOBILE-VIEWPORT** | Superficie de mundo insuficiente en móvil landscape (chrome browser + HUD/dock) | PT1-A Neni | `docs/MOBILE_VIEWPORT_AUDIT.md`. Bloquea reinicio PT1. PWA + HUD compacto. **Sin deploy hasta revisión.** |
| PR-P0-1 | Ejecutar PLAYTEST 1–2 (móvil landscape) | PLAYTEST_PLAN | **PT1-A interrumpido** — reiniciar tras viewport |
| PR-P0-2 | Hub Continuar → carga (si hub entra en paquete) | REGRESSION_SUITE_CANDIDATE | E2E o prueba manual documentada |
| PR-P0-3 | Placement ghost→✓ estable en dispositivo real | REGRESSION_SUITE_CANDIDATE | Confirmar no rotura |
| PR-P0-4 | Decisión producto: ¿qué arte A es obligatorio en v1? | ART_DEBT_AUDIT | Humana |
| PR-P0-5 | Victoria/derrota presentables (no “overlay provisional”) | ART + UX | Primera impresión de cierre |

### P1 — necesario antes de release (tras playtests)

| ID | Ítem | Origen |
|----|------|--------|
| PR-P1-1 | Reducir fricción **staffing** (menos reopen/toast; batch o auto-staff post-build en guía) | PRE_RELEASE_AUDIT §2–3 |
| PR-P1-2 | Reorganizar **Más** (agrupar Recuperar / Research / Contactos; no reopen entero) | UX midgame |
| PR-P1-3 | Objetivos midgame visibles (chip / no forever-off; misiones no solo lista) | Misiones semi-muertas |
| PR-P1-4 | Progreso hacia **victoria** legible (checklist o “os falta…”) | Late game opaco |
| PR-P1-5 | Recover territorio descubrible (dock o coach post-D5) | Expansión enterrada |
| PR-P1-6 | ART PASS expreso — capa **A** acordada | ART_DEBT_AUDIT |
| PR-P1-7 | Feedback crisis: attack card no se pierde bajo brief | UX |
| PR-P1-8 | Suite regresión mínima pre-pub (save + E2E + placement + Continuar) | Robustez |

### P2 — polish recomendable

| ID | Ítem |
|----|------|
| PR-P2-1 | ART capa **B** (props, clima, habitantes, HUD cohesión) |
| PR-P2-2 | Audio: ambiente mínimo + reemplazo gradual de beeps críticos |
| PR-P2-3 | Limpieza dead UI (`command`, equip-weapon, help badge, sfx good/bad) |
| PR-P2-4 | PLAYTEST 3–4 + pasar WATCH a “confirmar / descartar” con evidencia humana |
| PR-P2-5 | Variedad percibida D100 (antirrepetición copy/eventos) sin meter sistemas nuevos |

### POST — después de release

| ID | Ítem |
|----|------|
| POST-1 | ZZ-184 hotfixes reales |
| POST-2 | ART capa **C** |
| POST-3 | Contenido extra (más encounters/missions) si playtests lo piden |
| POST-4 | Recalibración balance solo con datos humanos + WATCH |
| POST-5 | Features v2 (electricidad, etc.) — **fuera** salvo decisión explícita |

---

## 4. Secuencia sugerida (no automática)

```
1) Aprobar este PRE_RELEASE_PLAN (o variante)
2) PLAYTEST 1 + 2  →  triage P0/P1 reales
3) Fixes P0/P1 de fricción (sin mecánicas nuevas)
4) Decisión arte A  →  ART PASS expreso (fase propia)
5) PLAYTEST 3 (+ 4 si estable)
6) Suite regresión pre-pub
7) Solo entonces: conversación de DEPLOY (orden expresa)
```

**Paradas humanas:** tras playtests; antes de ART PASS; antes de deploy.

---

## 5. Relación con documentos

| Doc | Rol |
|-----|-----|
| `PRE_RELEASE_AUDIT.md` | Diagnóstico producto |
| `ART_DEBT_AUDIT.md` | Inventario visual A/B/C |
| `PLAYTEST_PLAN.md` | Protocolo Neni |
| `PRE_RELEASE_PLAN.md` | Este backlog / secuencia |
| `IMPLEMENTATION_PLAN.md` 2.8 | Histórico de sistemas; no roadmap automático pre-pub |
| `review-archive/zz-183/` | Release gate funcional cerrado |

---

## 6. Fuera de este plan

- Implementar ahora.  
- ART PASS ahora.  
- Balance tuning ahora.  
- Deploy.  
- ZZ-184.  
- WIP hub (salvo decisión de incluirlo en P0-2).

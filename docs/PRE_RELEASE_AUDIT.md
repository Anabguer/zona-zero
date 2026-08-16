# PRE_RELEASE_AUDIT — Zona Zero (producto provisional)

**Fecha:** 2026-08-16  
**Contexto:** ZZ-183 **APROBADA** · release gate **funcional** · **deploy NO autorizado** · sin ZZ-184  
**Método:** auditoría de producto sobre código + content + docs (sin playtest humano en esta entrega).  
**Alcance:** experiencia completa, jugabilidad, UX, móvil/desktop, audio, contenido, balance, perf/robustez.  
**Arte:** ver `ART_DEBT_AUDIT.md`. **Playtest:** ver `PLAYTEST_PLAN.md`. **Fases:** ver `PRE_RELEASE_PLAN.md`.

> Hasta ZZ-183 se validó sistema/contrato/regresión.  
> Esta etapa pregunta: **¿se puede jugar y evaluar como producto?**

---

## 0. Veredicto ejecutivo

| Eje | Estado provisional |
|-----|-------------------|
| Motor / contratos / save v7 | Sólido para playtest interno |
| Loop D1 (coach + construir + staff + avanzar) | Jugable y dirigido |
| Midgame (D10–D40) | Funcional pero **denso y opaco** (Más omnibus, staffing administrativo) |
| Late game / victoria | Mecánicamente completo; **progresión a victoria poco visible** |
| Diversión “uno más” | Probable en D1–D5; **riesgo de fatiga administrativa** después |
| Arte para publicar | **No listo** (ver ART_DEBT) — distinto de “deuda no bloqueaba desarrollo” |
| Audio | Feedback mínimo (beeps); **no diseño sonoro de producto** |
| Deploy | **Prohibido** hasta orden expresa |

**Conclusión:** el juego es un **prototipo jugable de colonia** con sistemas reales, no un producto listo para publicar. Está listo para **playtest humano estructurado** si se acepta arte provisional + audio beeps + fricción midgame conocida.

---

## 1. Experiencia completa (recorrido de partida)

### 1.1 Cadena esperada

Portada → Nueva/Continuar → intro (opcional) → tutorial coach → primeros días → construir/staff → explorar → expandir → clima → salud → ataques → repair → research → vehículos → misiones → contactos → eras → crisis final → victoria/derrota → endless.

### 1.2 Hallazgos por tramo

| Tramo | Qué funciona | Fricción / riesgo |
|-------|--------------|-------------------|
| **Portada / hub** | Continuar / Nueva existen | Hub WIP local **fuera de alcance**; REGRESSION_SUITE: Continuar→carga no E2E’d |
| **Intro** | 3 beats + skip; activa coach sin cascada Continuar | Arte intro jpg provisional |
| **Tutorial D1** | 5 pasos por **acción** (farm→staff→well→staff→día); coach se oculta ante overlays | Tras construir abre ficha; coach puede decir “tocadlo” cuando ya está abierta |
| **Primeros días** | Brief diario de recursos; sin chip misión D1–D5 (evita competencia) | Brief obligatorio + Continuuar; 20s no auto-cierra |
| **Construcción** | Ghost + snap + ✓/✕ + superficies 2.8 | Lista truncada top-18; cupo labor construcción poco visible; REGRESSION: placement completo no E2E |
| **Staffing** | Stepper ± en ficha | **Alto coste de clic** (reopen sheet + toast por ±); edificios nacen con 0 workers |
| **Exploración** | Rail/desk → zona → preview → enviar; safety D≤5 | Descubrimiento de landmarks/mercado vía toast; poco “por qué esta zona” |
| **Expansión** | Recuperar territorio real (días/madera/metal/labor) | Enterrado en **Más**; discoverability baja vs Construir en dock |
| **Clima / madera** | woodHeating + brief madera; HUD comida/agua/madera | Labels técnicos de clima; ammo/fuel fuera de HUD (intencional) |
| **Salud / brotes** | Brotes con fases; objetivo high; Salud en Más | Poco “qué hacer ya” en mundo; semáforo ambiental subordinado |
| **Ataques** | Aviso previo + card + banner | Card ~5.6s puede **perderse** bajo brief; prep de defensa poco guiada |
| **Reparación** | Daño en mapa + ficha; misión need_repair localiza | Un flujo por edificio; visual damage lean |
| **Investigación** | 22 techs, 1 activa, banco/lab | Solo en Más; reopen scroll hell tras cada acción |
| **Vehículos** | Compra/garage/fuel trip | Asignación en ficha zona, no explorador; fuel invisible en HUD |
| **Misiones** | Motor diario vivo (9 templates) | **Casi invisibles**: lista pasiva en Más, sin chip/CTA/toast completar |
| **Contactos** | Lean post ZZ-133 (no 4X) | Enterrados en Más; trueque poco protagonismo |
| **Eras** | 5 eras por condiciones | Sim D100 eras bajas (WATCH); jugador puede no percibir umbrales |
| **Crisis / victoria** | Multi-condición + crisis final variable | **Sin tracker de victoria**; sorpresa late-game |
| **Derrota / endless** | Stats + endless limpio | Derrota por pop/HQ; messaging ok |

### 1.3 Patrones transversales

1. **Pasos confusos:** Recuperar territorio; cómo progresar a victoria; dónde está ammo/fuel; labor “construcción”.  
2. **Momentos muertos:** Avanzar día en bucle cuando no hay crisis ni objetivo visible (post-D5 sin chip útil).  
3. **Repetición:** Construir→staff→avanzar; reopen Más; ± staffing.  
4. **Sistemas difíciles de descubrir:** misiones, research, contactos, recuperación, prep catástrofe.  
5. **Info insuficiente:** victoria; por qué falló una expedición; coste de oportunidad de no explorar.  
6. **Info excesiva:** dump de Más; brief + event + attack concurrentes.  
7. **Decisiones obvias vs interesantes:** D1 muy dirigido (bien); midgame a menudo “arreglar el rojo del brief”.  
8. **Sistemas infrautilizados (UX):** misiones, helpSeenTopics sin badge, equip-weapon sin UI, sfx good/bad.

---

## 2. Jugabilidad real (¿es divertido?)

> Sin playtest humano esta sección es **hipótesis fundada en diseño + sims ZZ-178**, no veredicto final.

| Pregunta | Lectura provisional |
|----------|---------------------|
| ¿Decisiones interesantes? | Sí en exploración, recuperación, staffing food/water vs defensa, quiet nights vs riesgo. Debilitadas si el jugador no ve misiones/victoria. |
| ¿“Uno más”? | Fuerte en D1–D10 (coach + brief + mundo). Debilita si staffing/Más se sienten papeleo. |
| ¿Tensión? | Sí: escasez, ataques avisados, brotes, clima frío. Riesgo: banner crítico pegajoso. |
| ¿Recompensa? | Construcción visible, loot, control de zona, logros (67). Menos clara: tech effects, misiones. |
| ¿Crecimiento? | Colonia en mapa + pop + eras. Arte no refuerza eras (progresión emergente lean). |
| ¿Objetivos C/M/L? | Corto: brief + coach. Medio: chip misión (a veces off forever). Largo: victoria **opaca**. |
| ¿Variabilidad partidas? | Director + 110 eventos + crisis variable + landmarks. Riesgo repetición familia si D100 largo. |
| ¿Decisiones cambian partida? | Sims: mala gestión ≠ viable (CUMPLE). Humanos: por confirmar. |
| ¿Estrategias distintas? | WATCH: sobreexpansión muy fuerte en bot; sin explorar sobrevive demasiado. |
| ¿Clic administrativo? | **Sí, staffing y Más** son el principal candidato a “correcto pero poco divertido”. |
| ¿Solo avanzar días? | Riesgo mid/late si no hay crisis ni objetivo chip. |

**Sistemas técnicamente correctos, sospechosos de poco divertidos:**

1. Staffing edificio-a-edificio con reopen.  
2. Panel Más omnibus (10+ sistemas).  
3. Misiones simuladas pero no protagonistas.  
4. Victoria multi-check sin UI de progreso.  
5. Audio beep sin atmósfera.

---

## 3. UX completa

| Superficie | Evaluación |
|------------|------------|
| Portada | Funcional; hub WIP no aprobado |
| Continuar / Nueva | Ok; Continuar = REGRESSION_SUITE_CANDIDATE |
| Intro | Clara, skippable |
| Tutorial | Excelente pacing por acción |
| HUD | Lean (pop + food/water/wood); fuel/ammo intencionalmente fuera |
| Fichas | Contrato landscape card / desk panel sólido (ZZ-150) |
| Construcción | Buen modelo ghost; fricción lista + labor |
| Staffing | Correcto, **demasiado micro** |
| Alertas | Jerarquía §21 buena; “Ocultar” → `objectivesOff` forever es fricción |
| Diario | Anti-spam ok; enterrado en Más |
| Ayuda | Gating anti-spoiler ok; sin unread |
| Más | **Mayor problema UX midgame** — scroll dump |
| Research / misiones / contactos | Enterrados |
| Informes expedición | Tras brief → doble modal |
| Victoria / derrota | Claras al final; prep insuficiente |

**Duplicidades:** desk tip vs coach/objetivo; Más vs dock Construir; misión chip vs banner vs brief facts.

---

## 4. Móvil landscape

Contrato: landscape-first + rotate-gate portrait.

| Tema | Riesgo |
|------|--------|
| Targets | ≥44 declarado en ZZ-154; verificar en pantallas pequeñas reales |
| Texto | Brief/Más densos → overflow/scroll |
| Ghost / drag | Core loop; REGRESSION placement incompleto en E2E |
| Pan / zoom | Existe + clamp; perf ambient cap 16 |
| Fichas | Body scroll; close accesible |
| Alertas | Banner + toast + cards en viewport bajo |
| Orientación | Gate ok; estado preservado |
| Teclado / back | Escape cierra sheet; Android back no auditado aquí |

**No asumir desktop = móvil.** Playtest 1–2 deben ser **en dispositivo real landscape**.

---

## 5. Desktop

- ≥1100px: desk panel + mapa.  
- Riesgo: Más + desk = sensación “app de gestión” si se abusa del panel texto.  
- Mitigación existente: mundo-primero, sin tabs de app en sheet.  
- Mantener: decisiones en el mapa, no en hojas de cálculo.

---

## 6–7. Arte y audio

Ver `ART_DEBT_AUDIT.md`.  
Audio: Web Audio beeps (`js/sound.js`); mute OK; sin ambiente musical; good/bad sfx definidos sin uso. **Funcional ≠ diseño sonoro final.**

---

## 8. Inventario de contenido (resumen)

| Tipo | Cantidad | Nota producto |
|------|----------|---------------|
| Edificios | 31 (sin gen/solar) | `command` legado aún listable |
| Techs | 22 / 4 ramas | Sin energía |
| Eventos | 110 / 16 familias | Incl. 5 calma |
| Misiones | 9 templates | UX débil |
| Vehículos | 4 | |
| Infectados | 5 | |
| Facciones | 6 contactos lean | |
| Eras | 5 | |
| Logros | 67 | Contenido, no cuota |
| Landmarks seed | 18 | Sin carpeta `assets/art/landmarks/` |
| Sectores colonia | 7 | |

**D30:** variedad probablemente suficiente.  
**D100:** riesgo de repetición de familias/eventos y de “Más como trabajo”.

---

## 9. Balance (base ZZ-178)

| Perfil | D30 surv | D100 surv |
|--------|----------|-----------|
| atento | 92% | 75% |
| expansivo | 100% | 75% |
| conservador | 92% | 63% |
| mala_gestion | 25% | 0% |
| sin_explorar | 88% | 56% |
| sobreexpansion | 96% | **88%** |

**WATCH (intactos · no recalibrar ahora):**

1. Sobreexpansión D100 dominante en bots.  
2. Eras D100 bajas.  
3. Sin explorar demasiado viable.  
4. Conservador: no interpretar 63% como “mal” automático.

**Distinción crítica:**

- **Balance matemático:** harness CUMPLE (mala gestión pierde).  
- **Experiencia humana:** pendiente de PLAYTEST 2–4. Sims ≠ diversión.

---

## 10. Performance / robustez

| Tema | Estado |
|------|--------|
| Ambient cap ≤16 | Smoke ZZ-182 PASS |
| Pop alta | Cap visual ≠ pop real |
| Save main+backup+migrate v7 | Smoke-save PASS |
| E2E móvil/desktop boot | PASS (no placement completo / no Hub Continuar) |
| Errores JS conocidos bloqueantes | Ninguno en E2E ZZ-181 |
| Assets | Pocos webp; landmarks procedural/SVG |
| Partidas largas humanas | **No medidas** |

---

## 11. Sistemas muertos / semi-muertos (limpieza futura, no ahora)

- `objectivesDismissed` vs `objectivesOff`  
- Handlers `[data-labor]` / `equip-weapon` sin UI  
- `helpSeenTopics` sin badge  
- Misiones motor vivo / UX pasiva  
- `sfx.good` / `sfx.bad` sin callers  
- `command` en buildings  
- `zones.json` deprecated  

---

## 12. Qué NO hacer todavía

- No ART PASS completo.  
- No nuevas mecánicas.  
- No tuning de balance a ciegas.  
- No deploy.  
- No ZZ-184.  
- No perpetuar 135 fases del PLAN 2.8 como roadmap de producto.

---

## 13. Referencias

- `docs/review-archive/zz-183/CLOSURE.md`  
- `docs/BALANCE_REPORT.md` · `docs/AUDIT_ENGINE.md`  
- `GAME_MASTER.md` 2.8 · `docs/IMPLEMENTATION_PLAN.md` 2.8  
- Código: `js/main.js`, `onboarding.js`, `intro.js`, `alerts.js`, `missions.js`, `victory.js`, `sound.js`, `v1-catalog.js`

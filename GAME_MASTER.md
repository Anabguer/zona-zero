# ZONA ZERO — GAME MASTER (BIBLIA DE DISEÑO DEFINITIVA)

> **SYNC VERIFY GAME_MASTER** · stamp=2026-08-15 19:41:46 · sha256_16=E699961EE3D959BF · source=repo→Drive force rewrite · plan must be 2.5 / 128 phases if IMPLEMENTATION_PLAN

**Versión de diseño:** 2.8 · **BIBLIA ÚNICA DEL PROYECTO** (diseño + forma de trabajar · ronda revisión ChatGPT↔Cursor)
**Estado:** Contrato vigente — enmienda **superficies edificables orgánicas + escenario diseñado** (2026-08-16) · no descarta B0/ZZ-019
**Fecha:** 2026-08-16  
**Plataforma:** Web · **gameplay landscape-first** (móvil horizontal obligatorio) · desktop panorámico · HTML/CSS/JS + PHP + MySQL  
**Repositorio:** `Anabguer/zona-zero`  
**URL objetivo:** `/juegos/zona-zero/`

### Tres documentos maestros (siempre idénticos Drive ↔ GitHub)

| Documento | Drive | GitHub |
|-----------|-------|--------|
| **Esta biblia** | `G:\Mi unidad\Juegos\Zona Zero\GAME_MASTER\ZONA_ZERO_GAME_MASTER.md` | `GAME_MASTER.md` |
| **Plan de fases** | `...\GAME_MASTER\ZONA_ZERO_IMPLEMENTATION_PLAN.md` | `docs/IMPLEMENTATION_PLAN.md` |
| **Log de ejecución** | `...\GAME_MASTER\ZONA_ZERO_DEVELOPMENT_LOG.md` | `docs/DEVELOPMENT_LOG.md` |

> **Prioridad:** esta biblia **2.8** manda sobre diseños 1.x–2.7 previos, chats sueltos y código existente cuando haya contradicción.  
> El código actual es **prototipo / motor parcial**; no define el juego definitivo.  
> **Cómo trabajamos** está documentado en el §41 (parte integral de esta biblia, no un anexo opcional).

---

## CÓMO USAR ESTA BIBLIA (lectura rápida)

1. **ChatGPT** lee Drive (`ZONA_ZERO_GAME_MASTER.md`) para diseñar, revisar y aprobar.  
2. **Cursor** lee el mismo contenido en repo (`GAME_MASTER.md`) para implementar.  
3. **Nadie implementa** hasta que ZZ-001 diga literalmente `ESTADO REVISIÓN: APROBADA` + `APROBACIÓN FINAL CHATGPT: SÍ` en el DEVELOPMENT_LOG.  
4. Cada cambio de diseño se escribe **aquí** (y se sincroniza a Drive + GitHub).  
5. Cada fase de código se ejecuta según IMPLEMENTATION_PLAN y se registra en DEVELOPMENT_LOG.  
6. Capturas de revisión visual: `docs/review/` + Drive `...\Zona Zero\Review\` (ver reglas del repo).

---

## ÍNDICE

0. Fuentes, auditoría y reglas de prioridad  
1. Filosofía y pilares  
2. Población colectiva  
3. Exploradores  
4. Viviendas  
5. Necesidades de la colonia  
6. Recursos  
7. Catálogo de edificios  
8. Mejoras de colonia (taller / hub)  
9. Construcción y modelo espacial (sectores / superficies / landscape)  
10. Producción y trabajo (modelo único)  
11. Clima y estaciones  
12. Salud  
13. Defensa y ataques  
14. Infectados y amenazas  
15. Exploración  
16. Ciudad y territorio  
17. Vehículos  
18. Investigación  
19. Eventos  
20. Misiones  
21. Objetivos, alertas y ayuda  
22. Logros  
23. Eras / progresión  
24. Curva de experiencia D1→endgame  
25. Director de juego  
26. Crecimiento de población  
27. Otros humanos (facciones ligeras)  
28. Victoria  
29. Derrota  
30. Dificultad  
31. UI / UX (mundo, portada, intro, tutorial, save)  
32. Feedback  
33. Arte (inventario, no producción)  
34. Sonido  
35. Datos y balance  
36. Simulador  
37. Plan de implementación (resumen) → detalle en plan ZZ-XXX  
38. Changelog de diseño  
39. Auditoría del documento (pasadas 2 y 3)  
40. Decisiones que cambian o eliminan el diseño anterior  
41. **Flujo de trabajo Cursor ↔ ChatGPT (gobernanza — parte de la biblia)**  
42. Mapa de documentos, carpetas Drive y sync  
A–N. Apéndices (techs, logros, misiones, costes, save, gates, inventario motor, curva, fichas, director, misiones detalle, logros ids, sync, checklist 30h) 

---

# 0. FUENTES, AUDITORÍA Y PRIORIDAD

## 0.1 Fuentes releídas

- `GAME_MASTER.md` 1.2 completo  
- `docs/TECH.md`, `docs/art-direction/README.md`  
- Historial de commits 1.0 → 1.3.1 / Bloque 1–1B  
- Motor `js/*` y `content/*.json` (auditoría 2026-08-15)

## 0.2 Qué hay YA en el motor (resumen)

| Sistema | Estado |
|---------|--------|
| Población colectiva | Implementado |
| Workers por edificio | Implementado (modelo actual) |
| Exploradores máx. 3 | Implementado |
| Producción / consumo diario | Implementado |
| Mapa / zonas / control | Implementado (18 landmarks) |
| Director + ~110 eventos / 16 familias | Implementado |
| Clima como estado puntual | Parcial (vía eventos) |
| Research 20 techs | Pipeline sí; **efectos mayormente stub** |
| Vehículos 4 | Básico |
| Eras 0–4 | Implementado |
| Victoria / derrota | Implementado (umbrales simples) |
| Facciones | Datos + UI; **casi sin simulación** |
| Infectados tipados | JSON ornamental |
| Misiones / logros / estaciones | **No como sistemas** |
| Onboarding D1 | Prototipo UI |

## 0.3 Reglas de prioridad

1. Este documento 2.0  
2. Decisiones explícitas de aprobación humana posteriores  
3. Código / JSON existentes (adaptar, no sacralizar)

---

# 1. FILOSOFÍA Y PILARES

## 1.1 Qué es Zona Zero

Juego de **gestión de colonia + supervivencia + expansión + exploración + eventos imprevisibles + progresión a largo plazo**.

Referencias conceptuales (no clones): Infection Free Zone, Final Outpost, Banished (gestión indirecta), juegos donde construir poco a poco obliga a nuevas soluciones.  
**Legibilidad espacial** (no copia de arte/sistemas): city builders tipo Townsmen / bases de supervivencia móvil — el escenario es parte de la jugabilidad.  
**Composición espacial (2.8 · referencia, no copia):** *The Walking Dead: Survivors* (móvil) — mapa/base > viewport, cámara navegable, carreteras que estructuran el asentamiento, mezcla de zonas (verde/urbana/tierra/ruinas/abiertas), áreas reconocibles, edificios en un escenario. **No** copiar arte, UI, edificios, economía, 4X ni monetización. Zona Zero conserva identidad postapocalíptica propia.

## 1.2 Qué NO es

- RPG individual de 100 personajes  
- Simulador de inventario / craft de picos  
- Control táctico de unidades  
- City builder hipercomplejo  
- Campaña lineal de misiones idénticas  

## 1.3 Sensación objetivo

> Empiezo con casi nada → resuelvo necesidades → crezco → aparecen problemas nuevos → me adapto → exploro → consigo cosas → amplío → algo sale mal → pierdo parte → me recupero → sigo.

## 1.4 Pilares

1. **Gestión indirecta** — el jugador decide qué/dónde/quién (explorador); el sistema resuelve.  
2. **Crecimiento visible** — la colonia se ve crecer en el mundo.  
3. **Riesgo real** — se puede perder mucho y recuperarse.  
4. **Imprevisibilidad controlada** — Director, no guion fijo ni RNG injusto.  
5. **Poca microgestión, muchas decisiones** — un modelo de labor, no dos.  
6. **Aviso → preparación → consecuencia** — nunca castigo imposible de prever en sistemas climáticos/vivienda.  
7. **Mundo primero** — UI sin pestañas principales tipo app.

---

# 2. POBLACIÓN COLECTIVA

## 2.1 Principio

La población es un **contador + estados agregados**. Nunca lista de habitantes.

HUD:

**Población 35 / 50**

Estados agregados (panel al tocar población):

| Campo | Significado |
|-------|-------------|
| Disponibles | fuerza laboral libre (no asignada a edificios ni extras) |
| Trabajando | suma de workers en edificios |
| En defensa | puestos de defensa / extra defensa |
| Heridos | restan fuerza laboral parcial o total según balance |
| Enfermos | restan fuerza laboral |
| Dependientes | niños/ancianos abstractos; restan fuerza; no se gestionan |

## 2.2 Capacidad

`capacidad = Σ housing de edificios vivos + HQ`.

Sin plazas: frena inmigración/crecimiento; baja estabilidad; en extremos abandono.

## 2.3 Prohibido

- Nombres/caras/skills de cada colono  
- Asignar “Manolo al huerto”  
- Pestaña Gente  
- Parejas / Sims  

---

# 3. EXPLORADORES

## 3.1 Rol

Únicos personajes individuales. **Máximo 3** activos.

| Plaza | Desbloqueo orientativo |
|-------|------------------------|
| 1 | Día 1 |
| 2 | pop ≥ 10 · zonas controladas ≥ 3 · era ≥ 1 |
| 3 | pop ≥ 24 · controladas ≥ 5 · era ≥ 2 |

## 3.2 Atributos

- Nombre procedural **editable**  
- Retrato  
- Nivel / XP  
- Skills 1–5: Explorar · Saquear · Combatir · Resistir  
- Salud / heridas  
- Estado: `ready | away | wounded | sick | dead`  
- Equipo ligero: arma / protección  
- Vehículo opcional  

## 3.3 Aprendizaje

Aprenden haciendo (lento a propósito). Explorar → Explorar; loot → Saquear; combates → Combatir; clima/heridas → Resistir.

## 3.4 Muerte

Permanente. Se pierde XP. Posible recuperación parcial de equipo. Reclutar desde población (−1 pop, cooldown). El nuevo empieza verde. **Debe doler**, sin convertir el juego en RPG.

## 3.5 En paralelo

Hasta 3 expediciones simultáneas (1 explorador / 1 destino).

---

# 4. VIVIENDAS (SISTEMA COMPLETO)

## 4.1 Principio

No una casa por persona. Tipos con **capacidad** y **protección climática** (0–3).

| Nivel protección | Efecto |
|------------------|--------|
| 0 Improvisado | Frío/calor golpean fuerte |
| 1 Básico | Mitiga clima leve |
| 2 Aislado | Mitiga olas |
| 3 Residencial | Casi inmune a clima ordinario |

## 4.2 Catálogo de vivienda

### Refugio improvisado (`shelter`)
- Capacidad: 2  
- Protección: 0  
- Coste: madera baja, metal mínimo  
- Era: 0  
- Uso: arranque  

### Casa básica (`house`)
- Capacidad: 4  
- Protección: 1  
- Coste: madera + metal  
- Requiere: haber construido al menos un shelter o HQ  
- Era: 0–1  

### Vivienda aislada (`insulated_house`) — **nuevo en diseño 2.0**
- Capacidad: 4  
- Protección: 2  
- Coste: madera + metal + combustible o aislamiento  
- Tech: aislamiento térmico  
- Era: 1–2  
- Resuelve: olas de frío  

### Bloque / residencia (`block`)
- Capacidad: 8–10  
- Protección: 2  
- Coste alto, footprint 2×1  
- Era: 2  
- Requiere: carpintería / vivienda avanzada  

### Residencia reforzada (`block_reinforced`) — mejora
- Capacidad: 10–12  
- Protección: 3  
- Era: 3  

### HQ / Refugio Central (L1–L3)
- Capacidad creciente (6 → 10 → 16)  
- Protección: 1 → 2 → 2  
- Defensa pasiva  
- Único, upgrade in-place  

**CHATGPT: REVISAR.** La protección climática no debe quedarse en un multiplicador abstracto. Hay que cerrar la cadena vivienda → temperatura → combustible/energía → salud, y decidir exactamente qué prepara el jugador antes de frío/calor. No implementar hasta resolver esa relación.

### CURSOR: RESPUESTA — cadena climática CERRADA (decisión de diseño 2.3)

**Aceptada la crítica.** La protección no es un multiplicador mágico: es una **cadena causal** con decisiones previas.

#### Cadena canónica

```
AVISO (1–3 días)
  → PREPARACIÓN (vivienda / fuel / stock / exploradores a casa / research si a tiempo)
  → CLIMA EXTREMO
  → cobertura térmica = f(plazas × nivel protección vs severidad)
  → déficit de plazas “a cubierto”
  → (opcional) MITIGACIÓN CON COMBUSTIBLE
  → efectos: consumo↑, enfermos↑, estabilidad↓
  → extremos prolongados: muertes
```

#### Qué prepara el jugador (acciones reales, no abstractas)

| Acción | Para qué |
|--------|----------|
| Construir `house` / `insulated_house` / upgrade HQ | Subir plazas con protección ≥ umbral del clima |
| Acumular comida/agua | Aguantar consumo↑ durante la ola |
| Acumular **madera** | Cubrir `maderaNecesariaCalefacción` |
| No enviar exploradores lejos | Evitar heridos/muertos por clima en ruta |
| Tener camas médicas libres | Absorber enfermos post-ola |
| Research `insulation` | Desbloquear vivienda aislada **antes** del primer invierno duro |

#### Cobertura (fórmula)

```
plazasACubierto = Σ camas de edificios con protección ≥ umbral(clima)
déficit = max(0, población − plazasACubierto)
```

Umbrales orientativos:
- frío leve / lluvia fría → protección ≥ 1 basta  
- ola de frío / blizzard → protección ≥ 2  
- calor extremo → protección ≥ 1 mitiga; ≥ 2 casi inmune (agua consumo sigue↑)

#### Mitigación térmica v2.4 = MADERA automática (decisión Neni Ronda 2)

> Sustituye cualquier mención previa a fuel/toggle de calefacción.

Ver bloque **CHATGPT: DECISIÓN NENI** inmediatamente debajo — consolidado como canónico.

### CHATGPT: DECISIÓN NENI — calefacción con MADERA, automática (Ronda 2)

Neni decide que **la calefacción NO use combustible/gasolina**. En v1 el frío se combate con **calidad de vivienda + reserva de madera**, y el consumo de madera es **automático** cuando la temperatura lo requiere. No existe toggle de calefacción por casa ni decisión diaria de encender/apagar.

**Diseño propuesto por ChatGPT para cerrar la lógica:**
- La madera sigue siendo material de construcción y, en frío, se convierte también en **reserva térmica**. No crear un recurso separado `leña`.
- Cada vivienda aporta una `protecciónClimática` y cada episodio de frío tiene una `severidad`. Cuanto mejor sea la vivienda, **menos madera por persona/día** necesita para mantener cobertura térmica.
- El juego calcula diariamente `maderaNecesariaCalefacción` según población expuesta, protección de vivienda y severidad. Si hay stock, se descuenta automáticamente y el HUD/brief lo explica: “Calefacción: −6 madera”.
- Si no hay suficiente madera, NO aplicar enfermedad instantánea. Se acumula un estado agregado `exposiciónAlFrío` por personas-día sin cobertura. La barra/estado progresa en varios días: **verde → ámbar → rojo**. La enfermedad aparece probabilísticamente cuando la exposición supera umbrales; muerte solo tras exposición grave/prolongada + mala capacidad médica.
- Recuperar madera o mejorar viviendas reduce/limpia progresivamente la exposición. Un solo día malo no condena una partida.
- Antes de un episodio frío, aviso comprensible: “En 3 días llega frío fuerte. Con tus viviendas actuales consumirás ~8 madera/día. Reserva estimada: 4 días.”
- El jugador decide INDIRECTAMENTE: construir mejor vivienda, aumentar madera, parar otros consumos de madera, ampliar producción o asumir el riesgo. No decide “encender calefacción”.

### CURSOR: CONSOLIDADO 2.4 — calefacción madera

**Aceptada y aplicada en toda la biblia.**

- Calefacción: **madera automática** según `maderaNecesariaCalefacción(popExpuesta, protección, severidad)`.
- Exposición al frío: acumulada `exposiciónAlFrío` verde→ámbar→rojo; enfermedad probabilística; muerte solo grave/prolongada + mala sanidad.
- Aviso previo con estimación de madera/día y días de reserva.
- **Fuel NO calienta.** Fuel = vehículos (+ reparaciones vehiculares si aplica).
- Mejor vivienda ⇒ menos madera/día. Tech `efficient_heating` / aislamiento reduce consumo.
- Sin toggle. Decisión indirecta: construir, stockear madera, o asumir riesgo.

**Conexiones:** vivienda §4 ↔ clima §11 ↔ madera §6 ↔ aserradero §7 ↔ salud §12 ↔ alertas §21.

---

# 5. NECESIDADES DE LA COLONIA

Solo necesidades con decisión jugable. No 40 barras.

| Necesidad | Aparece | Satisface | Si falla (leve → grave) | Aviso |
|-----------|---------|-----------|-------------------------|-------|
| Comida | D1 | Huertos, cocina, loot, raciones | hambre → bajas productividad → muertes/abandono | “comida para X días” |
| Agua | D1 | Pozo, cisterna, loot | sed → enfermedad → muertes | igual |
| Vivienda | D1–2 | shelters/casas/bloques | frena crecimiento → abandono | “X sin plaza” |
| Temperatura | ~D8+ / estación | vivienda + **madera** (calefacción auto) + tech | exposición↑ → enfermos | “ola en Y días · madera ~N/día” |
| Salud | heridos/enfermos/brotes | botiquín→enfermería→clínica + staff | curación lenta → crisis sanitaria | “camas X/Y” / “brote” |
| Seguridad | amenaza visible | defensa, territorio, torres | ataques peores | “amenaza alta” |
| Almacenamiento | soft-cap | almacenes / cisterna(agua) | merma de exceso | “reservas se estropean” |
| Estabilidad | siempre (oculto early) | necesidades cubiertas | productividad↓, inmigración↓ | “moral baja” |
| Combustible | con vehículos | loot, gasolinera, eventos | sin rutas lejanas / cargo | “fuel crítico” |
| ~~Energía eléctrica~~ | — | **ELIMINADA v1** | — | — |
| Medicinas | heridos/enfermedad | loot, botiquín | heridas largas | “sin medicinas” |
| Munición | ataques / hostiles | armería, loot | defensa peor | “munición baja” |

**Higiene/saneamiento:** no barra propia en v1; absorbida en enfermedad + eventos infraestructura.

---

# 6. RECURSOS

## 6.1 Principales (inventario)

| Recurso | Fuente | Consumo | Usos |
|---------|--------|---------|------|
| Comida | farm, greenhouse, cocina, loot | pop × rate | supervivencia |
| Agua | well, cistern, loot | pop × rate | supervivencia, algo de food |
| Madera | sawmill, loot, eventos | construcción + **calefacción automática en frío** + reparación | build / calor / repair |
| Metal | scrapyard, workshop, loot | construcción, defensas, reparación | build / repair |
| Medicinas | med buildings, loot, farmacia | curación + brotes | salud |
| Combustible | loot, gasolinera, eventos | **solo vehículos** (y repair vehicular) | logística |
| Munición | armería, loot, comisaría | defensa, expediciones hostiles | combate abstracto |

## 6.2 Secundarios

| Recurso | Tipo | Nota 2.4 |
|---------|------|----------|
| Energía eléctrica | **ELIMINADA de v1** | No generador/solar/barra |
| Piezas / tools | **eliminados** | Absorben en taller/research |

## 6.3 Soft-caps

Comida/agua: ~`pop × díasReserva` + bonus almacén. Exceso → merma. Obliga a no stockpile infinito sin almacenes.

---

# 7. CATÁLOGO DE EDIFICIOS

Principio: cada edificio resuelve un problema. Si no, fuera.

**Conteo diseño 2.4:** ~26 edificios activos (+ upgrades HQ). **Eliminados v1:** `generator`, `solar`, `command` (→HQ), `wall`/`power_hub`. Radio + centro de expediciones **mantenidos** (roles distintos).

### 7.1 Núcleo

| ID | Nombre | Función | Coste orient. | Jobs | Era | Notas |
|----|--------|---------|---------------|------|-----|-------|
| hq_central_l1 | Refugio Central I | HQ + vivienda 6 + def **pasiva** | gratis inicio | **0** | 0 | único · sin staffing |
| hq_central_l2 | Refugio Central II | +vivienda/def/mando | wood/metal (**sin fuel**) | **0** | 1 | upgrade · sin staffing hasta diseño |
| hq_central_l3 | Refugio Central III | cuartel | wood/metal/ammo alto (**sin fuel**) | **0** | 2 | upgrade · sin staffing hasta diseño |

### 7.2 Vivienda

Ver §4 (`shelter`, `house`, `insulated_house`, `block`, `block_reinforced`).

### 7.3 Producción comida/agua

**CHATGPT: REVISAR POZO/CISTERNA.** Ahora mismo corremos el riesgo de que la cisterna sea simplemente “el pozo mejor”. Separar funciones: el pozo debe ser **fuente/producción** de agua; la cisterna debe aportar **reserva, almacenamiento, seguridad ante cortes/sequía/variabilidad** (y, si encaja, recogida de lluvia), no limitarse a producir un número mayor. Revisar también cómo encaja con los soft-caps de agua.

### CURSOR: RESPUESTA — pozo ≠ cisterna (decisión 2.3)

**Aceptada.** Eran el mismo edificio con otro número; eso falla el test “¿para qué existe?”.

| Edificio | Rol | Produce/día | Soft-cap agua | Jobs | Clima |
|----------|-----|-------------|---------------|------|-------|
| **Pozo** `well` | **Fuente** | sí (agua) | no | 2–3 | en sequía/tormenta: producción↓ |
| **Cisterna** `cistern` | **Reserva / buffer** | **no** (o residual mínimo 0–1) | **sí** (+días de reserva agua) | 0–1 mantenimiento | lluvia: **recogida pasiva**; sequía: aguantas con stock |

**Soft-caps:** el almacén general sube soft-cap de varios recursos; la cisterna sube **específicamente** el soft-cap de agua y reduce merma de agua. Así no hay dos “pozos” ni dos “almacenes idénticos”.

**Decisión del jugador:**  
- Poco agua diaria → más pozos / más workers en pozo.  
- Suficiente caudal pero pierdes reservas / llega sequía avisada → cisterna.  
- Lluvias frecuentes → cisterna aún más valiosa (recogida).

**Conexiones:** agua §5–6 ↔ clima lluvia/sequía §11 ↔ storage §7.5 ↔ alertas “agua para X días”.

| ID | Nombre | Función real | Jobs | Era |
|----|--------|--------------|------|-----|
| farm | Huerto | produce comida | 3 | 0 |
| greenhouse | Invernadero | comida↑ + resistencia clima outdoor | 3 | 1–2 |
| kitchen | Cocina | −merma comida / +eficiencia raciones (no “otro huerto”) | 2 | 1 |
| well | Pozo | **producción** de agua | 2–3 | 0 |
| cistern | Cisterna | **reserva** agua + soft-cap + lluvia | 0–1 | 1 |

### 7.4 Industria / materiales

| ID | Nombre | Produce | Jobs | Era |
|----|--------|---------|------|-----|
| sawmill | Aserradero | wood | 2 | 1 |
| scrapyard | Chatarrería | metal | 2 | 1 |
| workshop | Taller | metal + **mejoras de colonia** | 2–3 | 1 |
| mech_shop | Taller mecánico | metal↑ + vehículos | 2 | 2 |

### 7.5 Logística

| ID | Nombre | Función | Era |
|----|--------|---------|-----|
| storage | Almacén | soft-cap stock | 0–1 |
| expedition_center | Centro de expediciones | bonus info/riesgo exploradores | 1 |
| garage | Garaje | requiere para vehículos ≥ coche | 2 |
| radio | Radio | misiones/radio events más frecuentes · **max = 1** (infraestructura única §9.7) | 1 |

**CURSOR: PROPUESTA / DUDA — radio vs centro de expediciones** *(CERRADA Ronda 2 → opción A)*

Riesgo de dos edificios mid-game que “mejoran exploración/info” sin diferencia clara.

| Opción | Idea | Pros | Contras |
|--------|------|------|---------|
| **A (recomendada)** | **Radio** = misiones/señales/eventos de contacto. **Centro** = reduce riesgo/tiempo de rutas + prep de 2º/3º explorador (logística). Roles distintos. | Claridad; ambos justificables | Dos edificios que construir |
| B | Fusionar en un solo **Puesto de operaciones** (radio+logística) | Menos clutter | Menos progresión de builds |
| C | Radio solo evento/HQ upgrade; quitar edificio radio | Más simple | Menos presencia en mapa |

**Recomendación Cursor: A.** Si en playtest el centro se siente “+% invisible”, subir su feedback (ficha de expedición muestra riesgo↓) o pasar a B.


### CHATGPT: DECISIÓN NENI — mantener RADIO + CENTRO DE EXPEDICIONES (Ronda 2)

Neni aprueba la opción A, con roles que deben sentirse diferentes:
- **Radio:** genera señales, llamadas de auxilio, rumores, oportunidades, contactos y misiones. Debe crear historias y sorpresa, no ser un simple +X %.
- **Centro de expediciones:** logística de exploradores: rutas, previsión de riesgo/tiempo, preparación de salidas y desbloqueo/gestión del 2.º y 3.º explorador. Sus beneficios deben verse en la ficha de expedición.

Si en playtest uno de los dos no genera decisiones propias, fusionarlo; no conservar edificios por catálogo.

### CURSOR: CONSOLIDADO 2.4 — Radio + Centro
**Aceptada opción A.** Roles canónicos arriba. Feedback obligatorio: radio → misiones/señales; centro → números visibles en ficha de expedición (riesgo/tiempo/slots).

### 7.6 Salud

| ID | Nombre | Función | Era |
|----|--------|---------|-----|
| medkit | Botiquín | curación lenta, medicine 1 | 0–1 |
| infirmary | Enfermería | camas médicas, curación media | 1–2 |
| clinic | Clínica / Hospital menor | camas↑, victoria req. | 2–3 |

### 7.7 Defensa

| ID | Nombre | Def | Jobs | Era |
|----|--------|-----|------|-----|
| barricade | Barricada | baja | 0 | 0–1 |
| fence | Cerca | media | 0 | 1 |
| watchtower | Atalaya | alta | 1 | 1–2 |
| armory | Armería | media + ammo | 1 | 2 |
| bunker | Búnker | muy alta + algo housing | 0–1 | 3 |

### 7.8 Energía eléctrica — ELIMINADA DE v1

### CHATGPT: DECISIÓN NENI — ELIMINAR SISTEMA DE ELECTRICIDAD DE v1 (Ronda 2)
*(texto de decisión conservado arriba en historial de revisión; abajo = consolidación canónica)*

### CURSOR: CONSOLIDADO 2.4 — sin electricidad

**Aceptada la eliminación.** Tras auditoría de coherencia:

| Elemento | Destino v1 |
|----------|------------|
| `energíaDisponible` / demanda | **Eliminado** |
| `generator`, `solar` | **Fuera del catálogo** |
| `power_grid`, `power_hub`, techs energía | **Fuera del árbol** |
| Victoria `needEnergy` | **Eliminado** — sustituido por infra avanzada (clínica L2+/lab o HQ L3 + defensa) |
| Clínica / lab / armería / mech | Funcionan por **nivel edificio + workers + recursos + repair + research** |
| Atalayas | Workers + ammo + tech; **sin luz** |
| Fuel | **Vehículos** (y repair vehicular) |
| Calor | **Madera** |

**¿Qué decisión jugable perdemos?** El tradeoff “quemar fuel para clínica vs coche”.  
**¿Es grave?** No: el tradeoff divertido de fuel queda en **exploración lejana**; la clínica se gana con metal/workers/medicinas/tiempo. Menos barras = más claridad.

**CURSOR:** no propone recuperar electricidad en v1. Posible v2 opcional si Neni lo pide tras playtest.

### 7.9 Investigación

| ID | Nombre | Función | Era |
|----|--------|---------|-----|
| tech_bench | Banco técnico | permite research | 1 |
| lab | Laboratorio | research + medicine | 2–3 |

### 7.10 Aspecto visual esperado

Cada tipo: asset WebP/SVG reconocible; estados dañado/ok; crecimiento de colonia por densidad de edificios + props, **sin polígonos GIS**.

---

# 8. MEJORAS DE COLONIA (TALLER)

**CHATGPT: REVISAR.** Cada mejora debe nacer de un problema que el jugador ya haya visto o pueda anticipar. No desbloquear mejoras únicamente porque toca una era. Comprobar que Taller, research y edificios no estén duplicando tres caminos para resolver lo mismo.

### CURSOR: RESPUESTA — un solo camino de “mejoras” = RESEARCH (decisión 2.3)

**Aceptada.** Había riesgo de tres sistemas paralelos (edificio / “mejoras de colonia” / tech) haciendo lo mismo.

#### Arquitectura clara (anti-duplicado)

| Capa | Qué hace | Qué NO hace |
|------|----------|-------------|
| **Edificio** | Capacidad física aquí y ahora (camas, prod, def, jobs) | No “investiga” por sí solo |
| **Research** | Única fuente de unlocks y bonos globales | No se coloca en el mapa |
| **Taller** `workshop` | (1) produce/refina metal; (2) **requisito** para ramas Construcción (y parte de logística); (3) flavor de colonia industrial | No tiene menú propio de mejoras aparte del research |
| **Taller mecánico** | Vehículos + metal↑ + reparaciones | No sustituye research de blindaje |
| **Lab** | Acelera research + medicine | No desbloquea techs sin banco/lab path |

**No craft de objetos individuales.**  
**No tabla separada de “mejoras de colonia”** distinta del árbol de research: esas filas **son** techs (Apéndice A).

#### El taller ¿para qué existe?

1. Problema: “necesito metal de construcción y no solo chatarra cruda”.  
2. Problema: “quiero investigar aislamiento/carpintería y el juego pide infra mínima”.  
3. Si solo produjera metal como la chatarrería → **sobra** (duplicado). Por eso el requisito de research + rol de refinación lo justifica.  
4. Si en playtest sigue sintiéndose decorativo → fusionar scrapyard+workshop o exigir workshop solo como gate de tech (Cursor vigilará en sim).

#### Mapa problema → tech (no “porque era 2”)

| Problema que el jugador ya vio | Tech deseable |
|--------------------------------|---------------|
| Comida justa tras crecer | `rationing` / cocina |
| Agua enferma / poca | `water_filters` |
| Frío avisado, shelters malos | `insulation` → insulated_house |
| Builds caras en madera | `basic_carpentry` |
| Ataques / amenaza sube | `watch_protocols` / torres |
| Expediciones cortas de carga | `pack_tactics` / bike |
| Clínica lenta / brotes | techs medicina + más staff sanitario |
| Edificios rotos post-ataque | `rapid_repair` / workers en reparación |
| Invierno caro en madera | `insulation` / `efficient_heating` |

Desbloqueo por **era** solo como *techo máximo*, nunca como única causa. La causa es el problema + infra (taller/banco) + días de research.

---

# 9. CONSTRUCCIÓN Y MODELO ESPACIAL DE COLONIA

### CURSOR: CONSOLIDADO 2.8 — refinamiento Neni + ChatGPT (2026-08-16)

**Se mantiene (B0 / ZZ-019 APROBADO — no reabrir):** sectores orgánicos · colocación semilibre · snap invisible · ghost · tint válido/inválido · ✓/✕ · no construir al soltar · colonia > viewport · **móvil landscape** · sin solares prefijados · sin cupo artificial N edificios/sector.

**Refinamiento 2.8:** el *dónde* de esa colocación = **superficies edificables orgánicas** dentro del territorio recuperado (no libertad absoluta sobre cualquier píxel del mundo; no “todo el polígono del sector = construible”).

**Prohibido:** pantalla fija · patio 2×2 · solares preasignados · 3 huecos donde el juego decide qué cabe · parcelas beige · cuadrados permanentes · imagen decorativa a rellenar · GIS visible · editor pixel-perfect · construir con segundo tap accidental · **macrocuadrícula de sectores** · **capacidad máxima artificial por sector** · **receta universal de recuperación** · **RNG punitivo al final de una recuperación cumplida** · mapa infinito procedural como sustituto de un escenario diseñado.

## 9.1 Orientación (landscape-first)

| Superficie | Orientación | Notas |
|------------|-------------|-------|
| **Gameplay** (`play`) | **Horizontal obligatorio** en móvil/tablet | Una sola UI jugable landscape; no dual portrait/landscape equivalente |
| **Portada + mini-intro** | Vertical **permitido** si la composición brand/cine se sostiene | Preferencia: adaptar; no forzar rotate en hub/intro |
| **Desktop** | Panorámico | Sin rotate gate |

**Rotate gate (solo gameplay en portrait):** pantalla cuidada Zona Zero (icono móvil girando + «Gira tu dispositivo · Zona Zero se juega en horizontal»). Al detectar landscape → entrar al juego. **No** `alert()` del navegador.

## 9.2 Flujo de construcción

1. Dock **Construir** → lista (era/tech/requisitos/coste/puestos).  
2. Elegir tipo → **modo colocación** (ghost).  
3. El mundo muestra **únicamente las superficies edificables** donde ese footprint puede anclarse (territorio recuperado · sin obstáculos · cabida física).  
4. Mover ghost con **snap invisible** interno; tint válido/inválido.  
5. **✓ CONSTRUIR** (confirmación explícita) · **✕ CANCELAR**.  
6. Paga recursos → edificio aparece integrado en el suelo (sin grid visible).

**No** = libertad absoluta sobre cualquier píxel del mapa.  
**No** = solares/slots predeterminados ni “huecos” pintados de forma permanente fuera de modo construir.

## 9.3 D1 disponible (tipos)

HQ (ya), shelter, farm, well, barricade (opcional), storage (si recursos).  
**No** implica huecos pre-pintados en el terreno.

## 9.4 Modelo espacial (contrato)

### Colonia > viewport · escenario grande diseñado

El viewport es una **ventana** sobre un mundo físico mayor — no un marco donde “debe caber la colonia”, ni un patio, ni una imagen de fondo.

**Contrato de escala (2.7 · aclaración ZZ-018 · reforzado 2.8):**

- El mundo de la colonia es **físicamente mayor** que 844×390 y que 932×430.  
- El jugador **recorre** con pan; **pinch** acerca/aleja; **Recentrar** vuelve a una referencia útil (Refugio Central / Núcleo al inicio).  
- **No** intentar mostrar todos los sectores a la vez.  
- **No** reducir edificios para hacer caber artificialmente la colonia.  
- Edificios con tamaño visual agradable y legible.  
- Crecimiento D1→D100 = más territorio real utilizado; late game puede exigir desplazarse en varias direcciones.  
- Zoom alejado = lectura más global, dentro de límites de legibilidad/performance.  
- El límite del mundo **no** es el borde de la pantalla.

**Mapa finito diseñado (2.8):** el escenario **no** tiene que generarse infinito. Puede (y en v1 debe) ser un **mapa grande deliberado** con zonas distintas y reconocibles — p. ej. antiguo aparcamiento, calle comercial destruida, descampado, zona verde, almacenes, carretera, ruinas residenciales, perímetro industrial. Cada zona puede tener características propias **solo** si enlazan con sistemas existentes (escombros, hostiles, perímetro inseguro, acceso bloqueado, terreno apto, elementos recuperables — §9.5 / §13–§16). **Prohibido** inventar bonuses “porque quedan bien” sin enlace sistémico en esta biblia.

| Fase | Sensación espacial |
|------|-------------------|
| D1 | Refugio Central + entorno inmediato |
| Media | Desplazamiento entre áreas funcionales / sectores recuperados |
| Avanzada | Extensión varias veces el viewport |

**Pregunta de diseño correcta:** ¿es cómodo recorrer, localizar y gestionar una colonia mayor que la pantalla desde móvil?  
**Incorrecta:** ¿cabe la colonia en móvil?

Referencias de sensación (no copia de arte/sistemas): mundos/bases navegables tipo Day R; **legibilidad espacial** tipo Townsmen / bases de supervivencia móvil — el escenario es jugabilidad.

### Lectura visual: mundo físico, no plano de sectores

- El fondo/escenario existe **debajo** de cualquier lectura de sector: **carreteras apocalípticas**, caminos, ruinas, coches/pecios, árboles muertos/vegetación, escombros, vallas, desniveles, zonas destruidas, accesos.  
- En **vista normal** los sectores **no** se representan como polígonos rellenos permanentes. CONTROLADO / NO CONTROLADO / EN RECUPERACIÓN se lee por tratamiento ambiental (limpieza, escombros, luz, perímetro, actividad).  
- Límites explícitos de sector: preferentemente en **modo expansión/recuperación** (o selección), con estética integrada (contorno tenue / resplandor / borde de suelo) — **no** GIS (líneas discontinuas, relleno plano de tablero).  
- **Refugio Central / Núcleo** = origen de la colonia, parte ya recuperada del mismo mundo (más limpia/iluminada), **no** una isla/placa sobre negro.  
- **No recuperado ≠ vacío/negro**: el lugar existe y se recorre; no es construible aún.

### Avisos UI → navegación espacial (contrato)

**Principio:** los paneles informan; el mundo es donde se resuelve el problema.  
En un mapa grande, los avisos **deben poder actuar como navegación** — no obligar a buscar a ojo objetos pequeños.

Al tocar un aviso localizado (p. ej. «Pozo dañado», «Valla rota», «Enfermería saturada», «Falta de trabajadores en huerto», «Ataque en perímetro», «Construcción terminada», «Sector listo para recuperar»):

1. La **cámara viaja / centra** el elemento o zona.  
2. Lo **resalta** de forma breve.  
3. **Abre la ficha / panel** correspondiente cuando exista acción (p. ej. Reparar, asignar, recuperar).  
4. El jugador actúa desde ahí.

Aplicable a: edificio dañado · enfermos · falta de workers · ataque · obra terminada · problema de producción · incidente localizado · expansión.

Implementación concreta puede llegar en fases de UI/alertas; el contrato espacial **ya lo exige**. No es un sistema nuevo: es el puente UI ↔ mundo (§21 / §13 repair).

### Sectores orgánicos (geometría del mundo)

- **D1:** solo **Sector Núcleo** recuperado (alrededor del Refugio Central).  
- El resto del entorno cercano **existe** como mundo (ruinas, coches, escombros, vegetación, calles rotas, obstáculos) — **no** como casillas bloqueadas.  
- Ampliar = **recuperar sectores colindantes** (gameplay), no “subes de nivel y aparece vacío”.

**Regla dura — no macrogrid:** los sectores **NO** son una cuadrícula/hexes ocultos del mismo tamaño.  
Cada sector tiene **tamaño, forma y orientación propios** derivados del entorno:

ejemplos: antiguo aparcamiento · parcela entre ruinas · patio industrial · manzana parcial · terreno tras carretera · zona verde abandonada · hueco entre estructuras.

Al mirar la colonia debe percibirse **ciudad/entorno recuperado**, no Civilization con celdas escondidas.

Los sectores **pueden continuar fuera del viewport**; no se diseñan como N piezas que deban caber todas en pantalla a la vez. El jugador las descubre/recorre espacialmente.

### Superficies edificables orgánicas (2.8 — refinamiento del *dónde*)

**Sector recuperado ≠ “puedo construir en cualquier píxel del sector”.**

Dentro del territorio recuperado existen **superficies edificables** de geometría orgánica (p. ej. una explanada/aparcamiento recuperado relativamente grande). Internamente puede existir snap/grid invisible para footprints; **el jugador no ve esa cuadrícula** en juego normal.

| Idea | Contrato |
|------|----------|
| Qué ve al construir | Solo superficies donde el footprint elegido puede colocarse |
| Qué decide el jugador | Cómo aprovechar el espacio (2 huertos; huerto+vivienda; reservar; reorganizar) |
| Qué **no** | Cupo “este sector admite 2 edificios”; solares fijos; 3 huecos prefijados |

La capacidad emerge de: **geometría de la superficie** · footprint del edificio · obstáculos · separaciones · suelo no edificable · edificios ya colocados.  
Ejemplo conceptual: superficie ≈ 6×5 unidades internas; huerto 2×2; casa 2×2; casa superior / enfermería footprints mayores → decisiones espaciales reales.

Un mismo sector recuperado **puede** (y a menudo **debe**) contener **una o varias superficies edificables disjuntas**.  
**SECTOR ≠ PARCELA.** Entre superficies puede haber carretera, ruina, árboles, escombros permanentes, muro, terreno inutilizable.  
Cada superficie grande admite **múltiples configuraciones** — no un solar para un edificio concreto.

### Orden de diseño del escenario (2.8 · ZZ-019A)

1. Diseñar un fragmento de **mundo creíble** (carreteras, caminos, ruinas, vegetación, escombros, vallas…).  
2. Esa estructura da forma al lugar.  
3. De la geometría **restante** surgen naturalmente superficies donde construir.  
4. Esas zonas se registran como superficies edificables internas.  
5. En juego normal **no** parecen parcelas.  
6. Solo al entrar en **Construir** se revela dónde cabe el edificio seleccionado.

**Prohibido** el orden inverso: pintar primero “zonas edificables” y decorar alrededor.

### Capacidad = física, no cupo

**Prohibido** “este sector admite máximo N edificios”.  
La capacidad surge de: tamaño · forma · footprints · obstáculos · caminos/estructuras · separaciones mínimas · edificios ya colocados · **límites de superficie edificable**.  
Si caben tres huertos y el jugador asume coste/staffing/mantenimiento → **puede construir tres**.

### Recuperar territorio (§9.5)

Acción del mundo: «Hemos recuperado esta parte de la ciudad.»  
**No** hay una tasa administrativa global (X madera + Y metal + Z días fijos para todos).  
Cada sector declara **componentes de recuperación** según su situación física (§9.5).  
Solo sistemas/recursos admitidos por esta biblia (sin reintroducir electricidad, etc.).

Resultado: sector → **recuperado** → sus **superficies edificables** pasan a ser suelo válido de colocación. Expandir **aumenta perímetro vulnerable** (§9.8).

### Colocación semilibre + snap invisible

- Interno: ancla discreta densa (puntos/celdas **ocultas** al jugador; no se enseña grid ni hex).  
- Externo: sensación de colocación libre **dentro de la superficie**; **sin** cuadrícula, coordenadas ni GIS.  
- Válido: footprint cabe · no solapa · dentro de superficie edificable de sector recuperado · no sobre obstáculo · no corta conectividad mínima al HQ / acceso.

### Edificios repetibles

Si el catálogo lo permite, Neni elige **dónde** integrar el 2º/3º huerto (u otro) **dentro de las superficies disponibles**.  
Límites naturales: coste, workers, producción/consumo, **espacio físico**, progresión, balance.  
`max` solo con razón de diseño (§9.7).

### Caminos / carreteras (estructura visual; mecánicas solo si sistémicas)

Los caminos y carreteras **preexistentes** (a menudo destruidos) dan **estructura visual** al escenario.  
**No** convertir Zona Zero en un simulador de carreteras.

**ZZ-019A:** caminos/vallas/muros = **solo visuales/estructurales**.  
**Prohibido en 019A:** construir/reparar carreteras, reparar vallas, construir muralla, bonuses de carretera, costes nuevos, sistemas paralelos.

Fases futuras **pueden** integrar reparar tramos / abrir accesos / reforzar perímetro **solo** si hay función sistémica real enlazada a §9.5 / §13 / exploración — sin duplicar sistemas. Cualquier mecánica concreta exige decisión Neni/ChatGPT.

### Muros / vallas / perímetro (absorber en defensa existente)

No implementar ahora un sistema independiente de murallas.  
El escenario puede mostrar vallas destruidas, muros, accesos y perímetros recuperables.  
Fases posteriores pueden **reparar/reforzar** elementos existentes o construir defensas del catálogo (§7.7) conectando con **ataques, perímetro, daño y repair** (§13 / §9.8).  
**No** crear un segundo sistema de defensa paralelo.

### Arte base (purga) + integración de lo construido

**Si tiene función jugable, no puede venir pintado como decoración fija.**  
Purgar pozo/huerto/taller/enfermería/defensas falsas del terreno base.  
Permitido: ruinas, coches, árboles, basura, escombros, vallas rotas, carreteras, estructuras destruidas **no funcionales**.

Mantener tono apocalíptico, suciedad y edificios legibles. Evolucionar hacia **mapa grande diseñado**, no superficie neutra enorme.

**Integración visual de edificios construidos** (fase artística posterior; **no bloquea sistemas** — post ZZ-019B sigue como deuda artística no bloqueante: sombras/contacto/transiciones finales, props, carretera art pass, identidades del mundo): sombra de contacto · perspectiva coherente · transición con suelo · escala coherente · evitar efecto PNG/pegatina.

### Arco visual QA (no calendario rígido)

| Hito | Sensación |
|------|-----------|
| D1 | Núcleo pequeño precario |
| D15 | Primer cluster funcional |
| D30 | Colonia reconocible + primera expansión |
| D60 | Varios sectores; áreas diferenciadas |
| D100 | Asentamiento amplio, vivo, defendido, construido por el jugador |

**Test:** D1 vs D100 → «todo esto lo he construido yo».

### Organización sin zoning artificial

No forzar «zona residencial / industrial».  
Ayudas suaves: footprints, separación mínima, snap/orientación, corredores orgánicos, props, requisitos reales de edificios, conectividad al HQ.  
**Sin** cupos numéricos por sector.

### Navegación colonia grande

Con 30–50 edificios: lista/filtros en Más · avisos → centrar + ficha (§9.4) · «Localizar» desde ficha/alerta.  
**Sin** minimapa GIS permanente salvo necesidad demostrada en playtest.

### Criterio de fantasía del bloque B0 (PLAN)

B0 **no** se aprueba porque “la cámara funciona” o “puedo colocar un edificio”.  
Debe demostrar: **estoy construyendo mi propia colonia dentro de un mundo** (recorrer · decidir dónde en superficies reales · repetir edificios · quedarse sin espacio físico · recuperar territorio que parece ciudad · expansión con consecuencias · imaginar D1→D100 · cómodo en móvil horizontal).

**2.8:** ZZ-019 validó ghost/✓/semilibre. Queda demostrar **superficies orgánicas + escenario diseñado legible** antes de cerrar el tutorial (ZZ-012).
## 9.5 Recuperar un sector — plantillas / componentes

### Reglas base

1. Solo sectores **colindantes** a recuperados (crecimiento contiguo).  
2. Antes de empezar, UI clara: **problema del sector** · **qué necesita** · **tiempo/trabajo aproximado** · **qué gana al recuperarlo**.  
3. Feedback: limpieza visual progresiva + mensaje humano («Hemos recuperado…»).  
4. Tras recuperar: suelo válido + perímetro se recalcula.  
5. **v1 — sin fracaso aleatorio punitivo:** si el jugador conoce requisitos, los cumple, dedica labor/tiempo y resuelve amenazas requeridas → **éxito**.  
   Puede haber eventos, descubrimientos, amenazas o complicaciones **antes/durante** como gameplay visible.  
   **Prohibido:** invertir todo → dado oculto → fallo → pérdida arbitraria de la inversión correcta.

### Sistema de componentes (no receta universal)

Cada sector instancia una **plantilla** con 1..N componentes. El coste/tiempo se **deriva** de esos componentes (content + sim), no de una fórmula global fija.

| Componente | Significado | Coste típico (solo sistemas existentes) |
|------------|-------------|------------------------------------------|
| `debris` | Escombros / basura densa | labor + tiempo |
| `heavy_wreck` | Vehículos / estructuras pesadas | labor + tiempo + wood/metal si procede |
| `blocked_access` | Acceso cortado | limpieza / reparación ligera (labor + recursos menores) |
| `hostiles` | Infectados / amenaza residual | asegurar la zona primero (§14 / defensa) |
| `unsafe_perimeter` | Borde inseguro al abrir | trabajo defensivo o barricadas/torres adicionales (§13) cuando corresponda |
| `explore_local` | Área no reconocida | exploración/descubrimiento local (§15–§16) |

**UI de decisión:** el jugador elige *si* y *cuándo* abrir ese sector según su situación concreta — no “comprar parcela genérica”.

## 9.6 UX móvil landscape — pan vs ghost

**Decisión de interacción (contrato):**

| Gesto | Efecto |
|-------|--------|
| 1 dedo **sobre el ghost** (o handle del ghost) | Mueve el edificio (snap) |
| 1 dedo **fuera del ghost** en el mapa | Pan de cámara |
| Pinch (2 dedos) | Zoom; pan de cámara si el gesto es drag de dos dedos |
| ✓ / ✕ | Confirmar / cancelar (barra inferior landscape, zona pulgar) |

**No** construir al soltar el ghost.  
Ghost inválido: no habilita ✓ (o ✓ deshabilitado + tint).

## 9.7 Auditoría `max` de edificios (contrato de limpieza)

| Clasificación | Significado |
|---------------|-------------|
| **JUSTIFICADO** | Único por función de sistema (HQ, lab, centro expediciones, **radio**, command stub…) |
| **HEREDADO** | Tope alto de plantilla JSON; **no** freno de diseño temprano; limpiar en balance/content |
| **ARBITRARIO** | Límite numérico sin razón de sistema → **eliminar** |

| ID | Nombre | max contrato 2.7 | Clase | Decisión |
|----|--------|------------------|-------|----------|
| hq_central_l* | Refugio Central | 1 | JUSTIFICADO | Único HQ |
| expedition_center | Centro expediciones | 1 | JUSTIFICADO | Único hub logística |
| lab | Laboratorio | 1 | JUSTIFICADO | Único lab avanzado |
| radio | Radio | **1** | JUSTIFICADO | Infraestructura central de señales (§7.5); **no** duplicar sin función sistémica documentada |
| command | Puesto mando | 1 | JUSTIFICADO | Stub/legado; no reintroducir si fuera de catálogo activo |
| clinic | Clínica | **sin max arbitrario** | HEREDADO→limpiar | Colonia grande puede necesitar más sanidad; límite = coste + staffing + camas + espacio + progresión. `max=2` del JSON = **ARBITRARIO** → eliminar en limpieza content |
| farm | Huerto | alto / sin freno temprano | HEREDADO | Freno = coste/workers/espacio físico |
| well | Pozo | alto / sin freno temprano | HEREDADO | Igual; pozo≠cisterna |
| greenhouse | Invernadero | HEREDADO | HEREDADO | Tech/era puede gatear |
| shelter / house / block | Vivienda | altos | HEREDADO | Soft por need + espacio |
| barricade / fence / watchtower | Defensa | altos | HEREDADO | Perímetro / longitud / balance defensa |
| infirmary / medkit | Salud early | HEREDADO | HEREDADO | Misma lógica que clinic (capacidad sanitaria, no cupo mágico) |
| garage / armory / bunker | Varios | 2 en JSON | HEREDADO | Revisar en balance: solo mantener 2 si hay función dual real |
| generator / solar | Energía | — | — | **Fuera v1** |

**Regla:** huertos y clínicas (y análogos) se limitan por economía, staffing y espacio físico — no por “N huecos” ni “máximo 2 porque sí”.

## 9.8 Expansión y defensa

Expandir tiene **coste estratégico**: más perímetro, más puntos vulnerables, más estructuras que reparar, más distancia, más defensa necesaria.  
Hordas/ataques pueden afectar sectores/perímetro (§13).  
Decisión: «¿me expandiré ahora o aún no puedo defenderlo?»

Vallas/muros/accesos del escenario alimentan este mismo modelo (§9.4 muros) — no un sistema paralelo.

## 9.9 Reglas técnicas residuales

- Snap interno invisible sobre **superficies edificables**; footprint habitual 1×1 o 2×1 (y mayores según catálogo).  
- Workers de construcción: ≥1 idle/build.  
- Upgrade HQ in-place.  
- Mover edificios: no en v1; reconstruir.  
- Save: versionar sectores (geometría/plantilla/componentes) + **superficies edificables** + posiciones.

---

# 10. PRODUCCIÓN Y TRABAJO — MODELO ÚNICO

## 10.1 Decisión 2.0 (obligatoria)

**Un solo modelo: asignación de trabajadores POR EDIFICIO.**

```
HUERTO
Trabajadores 0/3   [−] [+]
Produce: +X comida/día (según plantilla)
```

- La producción de un edificio es 0 si workers = 0.  
- Panel Población muestra **resumen derivado** (solo lectura) + extras:
  - Construcción (pool para builds)
  - Defensa (torres + extra)
  - Medicina (si hay puestos libres en edificios de salud)

**Prohibido** un segundo panel que vuelva a repartir “8 a comida / 5 a agua” como asignación primaria (eso duplicaba microgestión).

## 10.2 Con 12 personas — ejemplo

Jugador:
1. Abre Huerto → 3 workers  
2. Abre Pozo → 2  
3. Abre Torre → 1  
4. Deja resto disponibles para construir  

Resumen población: Trabajando 6 · Defensa 1 · Disponibles 5.

## 10.3 Autoasignar

Botón opcional: reparte workers a edificios productivos críticos (food/water primero) respetando caps. Nunca obligatorio.

## 10.4 Escala 3 ↔ 100

Mismos controles; con muchos edificios, filtros por familia + autoasignar.


### CHATGPT: DECISIÓN NENI — gestión visible “más/menos” + vida ambiental (Ronda 2)

La sensación de juego debe venir de **mover capacidad humana entre necesidades**. El control `[−] / [+]` por edificio es central: durante una plaga puedo quitar trabajadores del aserradero y ponerlos en enfermería; antes del invierno puedo priorizar madera; ante una horda puedo reforzar defensa.

**Reglas de UX:**
- Tocar edificio → muestra puestos `ocupados/máximo`, efecto actual y efecto si añado/quitar un trabajador.
- Panel Población = resumen, no segundo sistema de asignación.
- En crisis debe existir acceso rápido a edificios relevantes (“3 edificios sanitarios”, “4 defensas”, etc.) sin buscar por todo el mapa.

**Vida visual sin individualizar colonos:**
- Pequeños habitantes/figuras ambientales se mueven entre edificios y caminos como representación agregada. NO tienen nombre, ficha ni pathfinding estratégico.
- Su estado visual puede usar semáforo discreto: **verde = normal**, **ámbar = problema/agotamiento/enfermedad leve**, **rojo = grave/crítico**.
- Esto no debe convertir 100 habitantes en 100 objetos pesados. Se renderiza una muestra proporcional/capada que represente actividad y salud agregada.
- Clima, edificios activos, reparación, construcción, enfermedad y ataques deben tener movimiento/feedback visible. Zona Zero no puede sentirse como una captura estática.

### CURSOR: CONSOLIDADO 2.4 — staffing + vida ambiental
**Aceptado.** Ver también **§32B Vida visual** (nuevo) para estados, movimiento y caps de render.

---

# 11. CLIMA Y ESTACIONES

**CHATGPT: REVISAR COMO CADENA, NO COMO EVENTO AISLADO.** El clima debe provocar decisiones previas y conectar con vivienda, agua/comida, salud, exploración y —solo si tiene sentido— energía/combustible. Mantener el patrón aviso → preparación → consecuencia, pero concretar qué acciones reales permite cada aviso.

### CURSOR: RESPUESTA — clima = arco de decisiones (decisión 2.3)

**Aceptada.** El clima no es “flavor del día”: es un **arco** (ver también cadena §4).

#### Por tipo de aviso → acciones concretas

| Aviso | Acciones útiles | Sistemas tocados | Consecuencia si ignoras |
|-------|-----------------|------------------|-------------------------|
| Ola de frío / blizzard | viviendas↑prot, **stock madera**, stock food, exploradores a casa, camas médicas | vivienda, madera, comida, exploradores, salud | exposición↑, enfermos, muertes extremas |
| Ola de calor | stock agua, cisterna, sombra/prot≥1, menos expediciones pesadas | agua, cisterna, salud | sed, enfermos, productividad↓ |
| Tormenta | no enviar exploradores; prep reparación | exploración, HP edificios | heridos, daño edificios |
| Sequía (si existe) | cisternas llenas, más pozos, racionar | pozo/cisterna | agua crítica |
| Lluvia fuerte | cisterna recoge; farms leve− | cisterna, food | oportunidad de stock agua |

**Sin electricidad.** **Fuel** no entra en clima. **Madera** = calefacción.

#### Feedback de aviso (ejemplo)
> “Ola de frío en 3 días. Con tus viviendas: ~8 madera/día. Reserva: 4 días. Mejora casas o corta más madera.”

Eso es **orientar**, no mandar (§21).

## 11.1 Estaciones (ciclo)

| Estación | Duración orient. | Efectos |
|----------|------------------|---------|
| Primavera | ~20–25 días | producción normal, lluvia posible |
| Verano | ~20–25 | calor, riesgo ola de calor, agua↑ consumo |
| Otoño | ~20–25 | transición, tormentas |
| Invierno | ~20–25 | frío, food↓ leve en outdoor farms, calefacción |

Día 1 arranca en **final de verano / otoño** o primavera suave (calibrable) para no matar en tutorial.

## 11.2 Climas puntuales

`clear | rain | storm | cold | heat | fog` (+ eventos `blizzard` / `heatwave` con aviso).

## 11.3 Patrón AVISO → PREPARACIÓN → CONSECUENCIA

1. **Aviso** (1–3 días antes): “Se acerca una ola de frío.” + cobertura vivienda  
2. **Preparación:** construir aisladas, stock food/water/**madera**, no enviar exploradores lejos  
3. **Consecuencia:** si falta madera/cobertura → exposición↑ → enfermos probabilísticos; muertes solo grave/prolongado  

## 11.4 Impactos por clima

| Clima | Producción | Exploración | Salud | Visual |
|-------|------------|-------------|-------|--------|
| rain | leve− | riesgo+ | — | partículas |
| storm | − | riesgo++ | accidentes | fuerte |
| cold/blizzard | outdoor food−− | riesgo+ | frío | hielo/niebla |
| heat/heatwave | water consumo↑ | — | golpe calor | tono cálido |
| fog | — | riesgo+ | — | velo |

---

# 12. SALUD

## 12.1 Población

- `injured`, `sick` agregados  
- Camas médicas = Σ de edificios health  
- Curación/día limitada por camas + medicinas + tech  
- Sin camas: curación mínima; riesgo de muerte en heridos graves  

## 12.2 Explorador

- Herida → X días `wounded`  
- Medicinas pueden acortar  
- Muerte permanente posible en expediciones extremas / ataques  

## 12.3 Cadena edificios

Botiquín → Enfermería → Clínica.


### CHATGPT: REVISAR — enfermedades y contagio como sistema probabilístico, no calendario fijo (Ronda 2)

Neni quiere brotes/plagas imprevisibles pero lógicos. Diseñar un modelo agregado de enfermedad que use **pesos y probabilidades condicionadas**, nunca “cada X días hay plaga”.

Factores que pueden elevar riesgo: población alta/densa, frío o calor prolongado, agua insuficiente/contaminada, heridos sin tratar, baja capacidad sanitaria, eventos específicos y estación. Factores que lo reducen: camas médicas, medicinas, edificios sanitarios, research y buenas condiciones.

El brote debe tener fases y feedback: casos iniciales → contagio posible → pico → recuperación. El número de nuevos enfermos por día debe ser aleatorio dentro de una distribución condicionada por el estado real de la colonia. No todos los brotes se comportan igual.

**Decisión jugable:** ante un brote, el jugador puede mover trabajadores a sanidad (y por tanto dejar de producir en otros edificios), gastar medicinas, cancelar expediciones o priorizar research/infra. La pérdida de producción es consecuencia de enfermos/aislados + reasignación, no un slider de cuarentena. Mala preparación puede convertir un brote pequeño en crisis; buena prep + protocolo lo contiene.

**CURSOR: diseñar varios arquetipos de enfermedad/evento**, con parámetros y consecuencias diferentes, sin inventar una lista médica realista innecesaria. El objetivo es variedad jugable, no simulación epidemiológica.

### CURSOR: CONSOLIDADO 2.4 — sistema de brotes (diseño completo)

#### Para qué existe
Crear crisis sanitarias **imprevisibles pero justas**, que obliguen a reasignar workers ([−]/[+]) hacia enfermería y a gastar medicinas — sin simulación médica.

#### Modelo
- Estado agregado: `sick`, `outbreakSeverity` (0–3), `outbreakType`, `daysInOutbreak`.
- Cada día en riesgo: tirada ponderada `P(nuevosCasos | factores)` — **nunca** “día 15 = plaga”.
- Factores ↑ riesgo: pop alta, overflow vivienda, exposición frío/calor, agua baja, heridos sin tratar, estación, evento semilla.
- Factores ↓ riesgo: camas libres, medicinas, staff sanitario, techs medicina (esp. protocolo de cuarentena, antibiotics), estabilidad, post-protección Director.

#### Fases de un brote
1. **Germen** — 1–3 enfermos; alerta suave.  
2. **Propagación** — casos/día aleatorios en rango; semáforo ámbar en figuras ambientales.  
3. **Pico** — presión máxima; estabilidad↓; prod↓ por enfermos.  
4. **Contención o crisis** — si camas+meds+staff suficientes → baja; si no → muertes + evento catástrofe sanitaria posible.  
5. **Recuperación** — cooldown familia enfermedad; Director baja presión.

#### Arquetipos (variedad, no catálogo médico)
| ID | Sensación | Empuja al jugador a… |
|----|-----------|----------------------|
| `fever_wave` | Fiebre general | más camas / meds |
| `gut_bug` | Agua/comida | filtros, cisterna, cocina |
| `wound_infection` | Tras ataque | curar heridos ya |
| `winter_cough` | Tras frío | madera + aislamiento + sanidad |
| `mystery_radio` | Señal + enfermos | misión + riesgo |

#### Pérdida de producción durante brote (regla 2.5)
La producción cae **solo** por causas reales:
1. Población `sick` / aislada que **no trabaja** (agregado).
2. El jugador **reasigna** workers a enfermería/clínica con controles +/- (menos gente en huerto/aserradero/etc.).
**Prohibido** un modificador global artificial de producción “por cuarentena activada”.

#### Protocolo de cuarentena (tech — Ronda 3 CERRADA)
Una vez investigado `quarantine_protocol` / `quarantine_drill`:
- Es **permanente y pasivo** (no botón, no toggle diario).
- Ante brote: la colonia detecta/aisla antes (agregado: más enfermos “en cuidado”, menos en circulación productiva).
- Reduce **probabilidad de contagio** y **duración esperada** del brote.
- Eficacia = f(camas médicas, workers sanitarios, medicinas, gravedad del brote, azar).
- Ejemplo de diseño (no cadencia fija): un brote que sin protocolo podría alargarse ~15 días puede controlarse ~5–7 si infra+staff+meds acompañan.
- Sin protocolo + mala sanidad → brote pequeño puede escalar a crisis.
- Con protocolo + buena sanidad → más fácil contención; el jugador sigue moviendo staff y gastando meds.

#### Decisión de staffing
Durante brote, ficha enfermería muestra preview de efecto esperado al añadir workers. Quitar del aserradero duele en invierno (madera): ese es el coste real.

#### Conexiones
Director §19/§25 ↔ clima §11 ↔ vivienda overcrowding ↔ medicinas ↔ research cuarentena §18 ↔ vida visual §32B.

---

# 13. DEFENSA Y ATAQUES

## 13.1 Preparación (jugador)

- Edificios defensa  
- Workers en torres  
- Munición  
- Territorio controlado (reduce intensidad)  
- Avisos de amenaza  

## 13.2 Resolución (juego)

`resolveBaseAttack(intensity)`:
- gasta ammo  
- compara defensa vs intensidad  
- resultados: win / messy / lose  
- bajas pop, heridos, daño HP edificios, posible pérdida de zona fronteriza  

## 13.3 Escalado

Amenaza 0–100 (Director). Soft-cap early days. Tras crisis: protección temporal.

## 13.4 Recuperación

Periodo de recuperación: menos eventos graves; prioridad comida/defensa en objetivos.

Ejemplo válido: 50 → ataque → 34 → recuperación → 45.


### CHATGPT: REVISAR — daño y reparación de edificios debe ser una consecuencia visible (Ronda 2)

Hordas, tormentas, incendios u otros eventos pueden dañar edificios. No basta con restar un número oculto.

Propuesta:
- Edificio con estados visuales `ok → dañado → crítico → destruido`.
- El daño reduce producción/capacidad/defensa según severidad.
- Tocar edificio dañado → acción **Reparar**, mostrando coste, tiempo y trabajadores.
- Alerta agregada: “4 edificios necesitan reparación”; al tocarla, resaltar/centrar los afectados.
- La reparación compite por madera/metal/trabajadores con expansión: decisión real post-crisis.
- Una horda que rompe perímetro puede empezar a dañar edificios interiores; mientras el perímetro aguanta, la colonia interior está más protegida.

Cursor debe conectar esto con Taller/research sin crear un segundo minijuego de herramientas/piezas.

### CURSOR: CONSOLIDADO 2.7/2.8 — expansión y perímetro

Más sectores recuperados → perímetro más largo → más superficie expuesta a hordas/eventos de daño (§9.8).  
La defensa y el repair (§13) deben poder señalar sectores/borde afectados y centrar cámara **+ abrir ficha** (§9.4 avisos).  
Elementos del escenario (vallas rotas, accesos) se absorben aquí; no crear “sistema de muros” aparte.

### CURSOR: CONSOLIDADO 2.4 — daño y reparación

**Aceptado y ampliado.**

#### Estados
`ok → damaged → critical → destroyed` (visual + numérico HP%).

| Estado | Efecto |
|--------|--------|
| damaged | prod/def/housing −25–40% |
| critical | −60–80%; alerta fuerte |
| destroyed | edificio perdido; escombros; rebuild |

#### Fuentes de daño
Ataques (perímetro roto → interiores), tormentas, incendios/eventos, accidentes raros.

#### Reparar
- Acción en ficha: coste madera/metal, tiempo, workers (pool construcción o puestos del edificio).
- Compite con expansión nueva.
- Tech `rapid_repair` / taller: −coste o −tiempo.
- Alerta “N edificios necesitan reparación” → al tocar, resalta afectados.

#### Perímetro
Mientras barricadas/torres aguantan, edificios interiores reciben menos daño. Horda que rompe perímetro empieza a morder producción/vivienda → decisión de recuperación.

---

# 14. INFECTADOS Y AMENAZAS

## 14.1 Infectados (pocos tipos)

| Tipo | Rol |
|------|-----|
| Común | baseline |
| Rápido | más riesgo expedición |
| Resistente | más fuerza en limpieza de zona |
| Horda | ataques base |
| Raro | eventos especiales era≥2–3 |

Deben **afectar combate** (no JSON muerto).

## 14.2 No zombis

Saqueadores, clima, enfermedad, incendios, accidentes, hambre — vía eventos.

---

# 15. EXPLORACIÓN

## 15.1 Flujo

1. Ver landmark (revelado)  
2. Tocar  
3. Distancia / tiempo / riesgo / botín posible  
4. Elegir explorador (+ equipo/vehículo)  
5. Enviar → ruta en mapa  
6. Retorno → informe  

## 15.2 Tablas por tipo (sesgo, no fijo)

| Lugar | Botín típico | Riesgo |
|-------|--------------|--------|
| Supermercado | food, water | medio |
| Farmacia | medicine | medio |
| Hospital | medicine↑, riesgo↑ | alto |
| Gasolinera | fuel | medio-alto |
| Ferretería | wood/metal | medio |
| Comisaría | ammo | alto |
| Almacén | mixed | medio |
| Industrial | metal | alto |
| Parque | poco, eventos | bajo |
| Oficinas | rumores/radio | bajo-medio |

## 15.3 Control

Explorar ≠ controlar. Limpiar infectados + progreso de control + posible puesto.

Beneficios de controlar: seguridad, vecinos revelados, rutas, posibles edificios aprovechables (bonus abstracto).

---

# 16. CIUDAD Y TERRITORIO

## 16.1 Estructura

- Mapa semilla + layout de landmarks  
- Fog of war  
- Estados landmark: unknown · discovered · hostile · controlled · (contested opcional)  
- **Colonia:** sectores orgánicos (§9.4) — Núcleo D1 + sectores recuperables colindantes  

## 16.2 Visual

Ciudad abandonada, no GIS. Landmarks con arte.  
Colonia **integrada** en terreno: **escenario grande diseñado** desplazable; viewport parcial.  
Escenografía ≠ edificios jugables (§9.4 arte).  
Referencias de sensación espacial (no copia): Day R (escala); Townsmen / bases supervivencia (legibilidad del escenario como jugabilidad).

## 16.3 Beneficio de control (landmarks)

No “pintar verde”: reduce amenaza local, revela vecinos, bonus defensa/perímetro, acceso a loot residual menor, misiones de consolidación.

## 16.4 Recuperación de sectores de colonia

Distinto de controlar un landmark lejano: es **ampliar el territorio de colonia** junto al camp mediante **plantillas/componentes** (§9.5), no una tasa global.  
Geometría **orgánica del mundo** + **superficies edificables** (§9.4) — sin macrogrid ni cupo N edificios/sector.  
v1: recuperación cumplida → **éxito** (sin RNG punitivo final).

---

# 17. VEHÍCULOS

| ID | Nombre | Fuel/viaje | Cargo | Notas |
|----|--------|------------|-------|-------|
| bike | Bici / carrito | 0 | bajo | early |
| car | Coche | 2 | medio | garage |
| van | Furgoneta | 3 | alto | tech |
| armored | Reforzado | 4 | medio + protección | late |

Reparación: abstracta (coste metal/fuel + taller mecánico), no inventario de piezas.

---

# 18. INVESTIGACIÓN

**CHATGPT: REVISAR DESBLOQUEOS.** Una tecnología debe ser deseable porque resuelve o mejora una necesidad entendible. Revisar tech por tech para eliminar efectos ornamentales/stub y evitar “Era X = aparece botón nuevo” sin causa jugable.

### CURSOR: RESPUESTA — test de deseo por tech (decisión 2.3)

**Aceptada.** Toda tech del Apéndice A debe pasar:

1. ¿Qué problema ya sintió (o anticipa) el jugador?  
2. ¿Qué cambia en la partida de forma visible?  
3. ¿Duplica un edificio que ya resuelve lo mismo? Si sí → cortar efecto o cortar tech.  
4. ¿Es stub? → **prohibido** en diseño 2.3: o se cablea o se elimina del árbol.

**Regla de era:** `minEra` es **candado máximo**, no motor de deseo. El deseo nace del problema + aviso del Director/alertas (“Se acerca frío → insulation”).

**Limpieza vs JSON actual:** quitar unlocks a `wall` / `power_hub` inexistentes; `fortify` no “desbloquea barricade” si ya es buildable en era 0 — debe mejorar barricadas/defensa, no gatear el edificio.

**CURSOR:** número de techs = orgánico (§18). Duda 20 vs 28 **cerrada**.


### CHATGPT: DECISIÓN NENI — número de tecnologías ORGÁNICO + investigación con trabajadores (Ronda 2)

Neni no quiere fijar “20” o “28”. El número sale de techs **útiles**. Investigación con workers en banco/lab.

### CURSOR: CONSOLIDADO 2.4 — research por utilidad + staffing

#### Modelo de juego
1. Research **no** es sistema principal hasta construir **Banco técnico**.  
2. **Una** tech activa.  
3. Puestos en banco (1–2) / lab (hasta 3): controles [-]/[+] iguales que cualquier edificio.  
4. Más workers → más progreso/día (rendimiento decreciente opcional). Tradeoff real vs comida/agua/madera/defensa.  
5. HUD: progreso %, días estimados según staffing, beneficio en lenguaje claro.  
6. Tutorial D1: **huerto sin tech**. Techs agrícolas solo mejoran / desbloquean invernadero.

#### Ramas v1 (SIN Energía)

1. Supervivencia  
2. Construcción / Industria  
3. Defensa  
4. Medicina  
5. Exploración / Logística  

#### Árbol canónico 2.4 (lista orgánica — no cuota)

Cada tech: problema · req · coste orient. · días base (1 worker) · efecto · deseo.

##### Supervivencia
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| `rationing` | comida justa al crecer | banco | food+wood | 3 | −consumo comida ~8% | “aguantar más con lo mismo” |
| `water_filters` | agua enferma / merma | banco | metal+water | 3 | +eficiencia agua; −riesgo brote agua | “menos sed y menos plagas” |
| `preservation` | stock se pudre | rationing | metal+food | 4 | soft-cap food↑; merma↓ | “guardar para el invierno” |
| `greenhouse_tech` | frío mata huertos | water_filters+farm | wood+metal | 5 | unlock invernadero | “comida estable en invierno” |
| `efficient_heating` | madera se va en frío | insulation o house | wood | 4 | −consumo madera calefacción | “el invierno no me seca el aserradero” |

##### Construcción / Industria
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| `basic_carpentry` | builds caras en madera | banco+taller | wood | 3 | −coste wood builds | “crecer más barato” |
| `metalwork` | falta metal útil | carpentry+taller | metal+fuel? no: metal | 4 | +prod metal / −coste metal | “más torres y casas” |
| `insulation` | frío avisado, shelters malos | carpentry | wood+metal | 5 | unlock `insulated_house` | “quiero eso antes del frío” |
| `advanced_housing` | pop sin plazas buenas | insulation | wood+metal | 6 | unlock/mejora block | “densidad sin miseria” |
| `reinforced_structures` | hordas rompen builds | metalwork | metal | 6 | +HP edificios; −daño ataques | “que no me tumben el huerto” |
| `rapid_repair` | post-ataque lento | metalwork o taller | metal+wood | 5 | −coste/tiempo reparación | “recuperarme antes de la siguiente” |

##### Defensa
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| `watch_protocols` | amenaza sube | banco | wood+ammo | 3 | +def; mejor uso workers torre | “aguantar la noche” |
| `ammo_craft` | ammo se acaba | watch | metal+ammo | 4 | armería +eficiencia ammo | “no pelear a piedra” |
| `tower_optics` | ataques sorpresa | watch | metal | 5 | +def; avisos amenaza mejores | “verlos venir” |
| `fortify` | perímetro flojo | ammo_craft+optics | wood+metal | 6 | +def; barricadas más efectivas (no unlock si ya buildable) | “que no entren” |
| `perimeter_doctrine` | zonas fronterizas caen | fortify | — | 7 | territorio controlado reduce intensidad ataque | “el mapa me protege” |

##### Medicina
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| `field_medicine` | heridos lentos | banco | medicine | 4 | +curación | “volver a tener manos” |
| `triage` | camas saturadas | field_medicine | — | 4 | +camas efectivas | “cabemos más enfermos” |
| `antibiotics_protocol` | brotes se disparan | triage | medicine | 6 | −spread brote | “contener la plaga” |
| `quarantine_protocol` (id:`quarantine_drill`) | brotes largos / contagio | antibiotics | wood+medicine | 5 | **pasivo permanente**: −spread y −duración esperada del brote; eficacia escala con camas, staff sanitario, meds, gravedad y azar. **NO toggle. NO −prod artificial.** | “quiero que el próximo brote no se me vaya de las manos” |
| `field_surgery` | explorador herido días | triage | medicine | 6 | −1 día wounded explorador | “no perder al bueno” |
| `public_health` | camino victoria / clínica | antibiotics+clinic | — | 7 | unlock path clínica avanzada / bonus estabilidad sanidad | “colonia sana = victoria” |

##### Exploración / Logística
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| `scouting` | mapa a ciegas | banco | food+wood | 3 | −riesgo leve; +info loot | “menos sorpresas malas” |
| `pack_tactics` | vuelvo con poco | scouting | wood+metal | 4 | +cargo | “cada viaje cuenta” |
| `bike_tech` | a pie es lento | scouting | metal+wood | 3 | unlock bike | “más lejos sin fuel” |
| `vehicle_bay` | rutas largas | bike+garage | metal+fuel | 6 | unlock car | “el almacén lejano” |
| `convoy` | necesito mucho loot | vehicle_bay | metal+fuel | 7 | unlock van + cargo | “una furgoneta llena” |

**Total actual árbol 2.4: 26 techs** (orgánico; se puede añadir/quitar en playtest sin “rellenar cuota”).

**Eliminadas por electricidad / stubs:** `basic_generator`, `solar_array`, `power_grid`, `fuel_discipline` (como tech de generador), unlocks `wall`/`power_hub`.

## 18.2 Reglas (resumen)
- 1 research activa · staffing en banco/lab · efectos reales obligatorios · `minEra` solo techo.

## 18.3 Deseo
“Aislamiento antes del invierno.” · “Protocolo de cuarentena antes del próximo brote.” · “Antibióticos.” · “Reparación rápida tras la horda.” · “Coche para la gasolinera lejana.”

---

# 19. EVENTOS

## 19.1 Familias (16+)

calma, hallazgos, radio, supervivientes, hambre_agua, enfermedad, accidentes, clima, infectados, ataques, infraestructura, comercio, rumores, conflictos, expansion, catastrofes.

## 19.2 Reglas Director

- pesos por estado  
- cooldown familia/evento  
- antirrepetición  
- intensidad acotada  
- choices en ~25–30%  

## 19.3 Memoria

Flags simples (ayudaste_X, black_market, etc.) para secuelas.


### CHATGPT: DECISIÓN NENI — aleatoriedad ponderada, nunca cadencia fija (Ronda 2)

Los eventos NO salen “cada día” ni “cada 2 días”. El Director trabaja con ventanas, pesos, estado de colonia, era/estación, memoria y cooldowns. Debe haber días tranquilos, rachas tensas y momentos de recuperación.

**Regla:** ningún evento importante se agenda por patrón que el jugador pueda memorizar. Se permiten avisos de consecuencias que ya están en marcha (p. ej. frente frío) porque eso es preparación, no guion.

Los pesos deben cambiar según contexto: una colonia sin medicina hace más probable que un brote pequeño sea peligroso; una colonia muy fuerte puede recibir amenazas más exigentes; tras una catástrofe grave el Director baja presión temporalmente.

### CURSOR: CONSOLIDADO 2.4 — Director sin cadencia fija
**Aceptado.** Quiet nights, cooldowns, pesos contextuales, antirrepetición. Avisos de clima ≠ guion memorizable.

---

# 20. MISIONES

## 20.1 Tipos

| Tipo | Ejemplo | Fallo |
|------|---------|-------|
| Guía | Construye huerto | no bloquea forever |
| Contextual | “Te quedan 2 días de comida” → objetivo construir/asignar | se actualiza |
| Aleatoria | radio / atrapados / hallazgo | tiempo límite opcional |
| Progresión | metas de era | empuja sistemas nuevos |

## 20.2 Generación

Director + necesidades + era. Recompensa: recursos, XP explorador, estabilidad, unlock narrativo. No pay-to-win.


### CHATGPT: REVISAR — variedad real de misiones y expediciones (Ronda 2)

No convertir misiones en “construye cada edificio de la lista”. Debe haber guía, pero también rescates, señales, decisiones ambiguas, problemas internos, amenazas, oportunidades, objetivos de investigación, recuperación post-crisis y cadenas cortas procedurales.

Para expediciones, cada tipo de landmark necesita **muchas variantes de encuentro** (no una ruta fija que se memoriza). No hace falta que sean exactamente 50 por localización, pero sí suficiente profundidad combinatoria: estado del lugar + encuentro + decisión + resultado + secuela. Supermercado, hospital, gasolinera, comisaría, ferretería, etc. deben sentirse distintos.

Cursor debe diseñar el sistema de plantillas/modificadores para producir decenas de resultados posibles sin escribir miles de escenas manuales inconexas.

### CURSOR: CONSOLIDADO 2.4 — variedad misiones + expediciones procedurales

#### Misiones: no “build checklist”
| Capa | Rol | Ejemplos (no lista cerrada) |
|------|-----|-------------------------------|
| Guía (pocas) | Enseñar 1 mecánica | huerto+staff; primera expedición |
| Contextual | Resolver necesidad actual | comida 2d; cobertura frío; reparación N |
| Radio/historia | Sorpresa | SOS, trueque, rumor, mapa oral, hermano perdido |
| Crisis | Recuperación | “restablece perímetro”; “contén brote” |
| Progresión | Era / victoria | checks infra; final_chain variantes |
| Ambigua | Tradeoff | ayudar forasteros vs riesgo; racionar vs estabilidad |

Generación: Director elige **familia × peso × memoria × era**; instancia con parámetros (lugar, recurso, timer). Antirrepetición fuerte en guías.

#### Expediciones: motor de plantillas
Cada salida combina:

```
landmarkType × placeState × encounter × playerChoice × outcome × aftermath
```

**placeState:** pristine / looted / infested / contested / collapsed / radio_tagged  
**encounter (ejemplos por tipo):**  
- supermercado: estantes, trampa, grupo hostil, familia atrapada, almacén trasero  
- farmacia: botiquín sellado, contagio, saqueador herido, lab casero  
- hospital: ala segura/ala roja, generador muerto (flavor, no sistema eléctrico), pacientes, horda interna  
- gasolinera: surtidor, coche abandonado (fuel/vehiculo), emboscada  
- comisaría: armería, alarma, preso, francotirador abstracto  
- ferretería: herramientas→metal/wood, derrumbe, mapa local  

**playerChoice:** entrar / rodear / ayudar / retirarse / usar ammo / gastar meds  
**outcome:** loot table ±, herida, muerte, +pop, flag memoria, daño explorador  
**aftermath:** landmark state cambia; posible misión secuela; relación contacto

Objetivo: **decenas de combinaciones** por tipo sin escribir 50 guiones lineales. Supermercado ≠ farmacia en pesos y encuentros.

Radio alimenta misiones; Centro de expediciones mejora lectura de `placeState`/riesgo antes de salir.

---

# 21. OBJETIVOS, ALERTAS Y AYUDA

## 21.1 Capas (prioridad)

1. Modal decisión / brief diario  
2. Alerta crítica (comida 0, ataque inminente)  
3. Objetivo contextual (1)  
4. Coach tutorial **en el mundo** (solo mecánicas nuevas; una pista a la vez)  
5. Tips discreto  

## 21.2 Ejemplos de alertas

- “Comida para 2 días”  
- “Frío en 3 días — ~8 madera/día · reserva 4 días”  
- “Explorador herido 3 días”  
- “Movimiento infectado al norte”  
- “Podrías construir enfermería”  
- “Pozo dañado” / “N edificios necesitan reparación” → al tocar: **cámara + resalte + ficha** (§9.4)

No mandar: orientar. Las alertas localizadas son **navegación espacial**, no solo texto.

## 21.3 Ayuda consultable (v1)

### CURSOR: CONSOLIDADO 2.6 — decisión Neni

Acceso desde el juego (p. ej. `?` / Más → Ayuda). **No** es una enciclopedia enorme.

**Contiene solo lo ya descubierto / desbloqueado:**
- Controles (pan, zoom, recentrar, construir, avanzar día).  
- Significado de recursos visibles en HUD.  
- Conceptos que el jugador ya ha tocado (staffing, brief, exploración…).  
- Consejos básicos del sistema actual.

**Prohibido:** spoilear sistemas, eras, techs o amenazas que aún no hayan aparecido si eso rompe descubrimiento.

**Relación con coach:** el coach empuja en contexto (§31.4); la ayuda es consulta voluntaria cuando “ya sé, pero olvidé”.

---

# 22. LOGROS

Lista grande, sin moneda premium.

### Supervivencia
Sobrevivir 7 / 30 / 100 días; primer invierno; crisis y recuperación.

### Población
10 / 25 / 50 / 100 habitantes; recuperar tras perder 20.

### Exploración
5 / 15 landmarks; controlar 8 zonas; explorador nivel máx.

### Construcción
10 / 25 edificios; HQ L3; clínica operativa.

### Defensa
Repeler 5 ataques; sobrevivir horda; bunker.

### Recursos
Soft-cap comida 30 días; 0 fuel week challenge (humor).

### Secretos / humor
Nombrar explorador de cierta forma; día tranquilo 10 seguidos; etc.

**Conteo objetivo diseño:** ≥ **60** logros. Recompensa: badge + estabilidad/flavor, no power creep.

---

# 23. ERAS

| Era | Nombre | Problema central | Sistemas nuevos |
|-----|--------|------------------|-----------------|
| 0 | Sobrevivir | food/water/refugio | farm, well, explore cercano |
| 1 | Estabilizar | defensa, stock, vivienda | research, radio, storage, torres |
| 2 | Expandir | territorio, sanidad, vehículos | greenhouse, garage, clinic |
| 3 | Consolidar | hordas, logística, reparación | bunker, vehículos, facciones ligeras |
| 4 | Recuperar | estabilización regional | victoria, endless |

Unlock por indicadores (pop, control, research, infra), no solo día.

---

# 24. CURVA DE EXPERIENCIA (SISTEMAS)

**CHATGPT: REVISAR CAUSALIDAD DE LA CURVA.** No basta con repartir sistemas por días. Para cada entrada hay que poder responder: qué problema ha aparecido, qué información recibió el jugador y por qué ahora desea ese sistema. Los días son orientación, no la causa del desbloqueo.

### CURSOR: RESPUESTA — curva por CAUSA, días solo brújula (decisión 2.3)

**Aceptada.** Tabla canónica = **problema → información → deseo → sistema**. Los días son tipico/orientativo.

| Momento tip. | Problema que aparece | Info que recibe el jugador | Por qué desea el sistema | Sistema | Aún no |
|--------------|----------------------|----------------------------|--------------------------|---------|--------|
| D1 | Reservas finitas; 3 bocas | HUD comida/agua; coach huerto | “Si no produzco, me muero” | build + staff farm/well | amenaza, research, vehículos |
| D2–3 | ¿Bastará mañana? | Brief diario balance | Quiere ritual de control | brief | hordas |
| D3–5 | Colonia pequeña / loot | Landmark visible; riesgo/botín | Quiere recursos sin solo farm | exploración ida/vuelta | invierno duro |
| ~D7–10 | Pop/stock crecen; amenaza baja | Soft threat / barricade útil | Quiere no perder lo ganado | defensa básica, storage | facciones UI |
| al cumplir indicadores | Necesita eficiencia / unlocks | Banco técnico disponible | Quiere insulation/raciones… | research | — |
| tras 1ª presión combate o stock | Info del mapa incompleta | Radio / rumores | Quiere misiones/señales | radio, misiones | — |
| pop≥10 + control | Un explorador no basta | Slot 2 disponible | Quiere paralelizar rutas | 2º explorador | — |
| 1ª estación dura avisada | Frío/calor en Y días | Alerta madera/día + cobertura | Quiere casas aisladas / cisterna / madera | clima como arco | victoria |
| heridos o brote | Cola sanitaria | “camas X/Y” / brote | Quiere enfermería + staff | sanidad | — |
| rutas lejos | A pie lento | Garage/tech | Quiere vehículo (fuel) | vehículos | — |
| post-ataque | Edificios dañados | “N por reparar” | Quiere repair + fortify | daño/reparación | — |
| amenaza alta mid | Oleadas | Aviso amenaza | Quiere torres/ammo/búnker | hordas | — |
| checklist visible | Falta región estable | Objetivos victoria | Quiere cerrar arco | crisis final → victoria → endless | — |

**Regla:** si un sistema aparece **sin** problema previo ni info, es un error de diseño aunque el día “toque”.

---

# 25. DIRECTOR DE JUEGO

## 25.1 Observa

pop, reservas, prod, defensa, salud, progreso, pérdidas recientes, exploración, era, dificultad.

## 25.2 Índices

Fuerza · Fragilidad · Momentum · Tensión (0–100).

## 25.3 Ritmo

TENSIÓN → CRISIS → RECUPERACIÓN → CRECIMIENTO → TENSIÓN.

Presupuesto de amenaza, cooldowns, quiet nights (~30%), protección post-desastre.

---

# 26. CRECIMIENTO DE POBLACIÓN

- Inmigración (estabilidad, vivienda, food/water, seguridad)  
- Rescates (exploración/eventos)  
- Natalidad abstracta (raro, mid+)  
- Radio / misiones  
- Límites: housing, maxPopulation, enfermedad  

Sin parejas.

---

# 27. OTROS HUMANOS (FACCIONES LIGERAS)

## Decisión 2.0

**No diplomacia 4X.** Mantener **contactos procedurales** vía eventos/comercio:

- 3–6 grupos por semilla (traits)  
- Relación simple: hostil / tensa / neutral / amistosa  
- Acciones: comercio evento, pedir paso, conflicto abstracto  

Si en playtests no aportan, reducir a flags de evento sin UI dedicada.

---

# 28. VICTORIA

**Estabilizar Zona Zero** — culminación, no checkbox pop.

Requisitos conceptuales (todos):
- territorio significativo controlado  
- población estable elevada  
- food/water sostenibles (producción + reservas)  
- clínica / hospital menor operativo  
- defensa avanzada (perímetro + ammo path)  
- infraestructura de recuperación (capacidad de reparación / HQ alto)  
- sobrevivir **crisis final adaptativa** (variantes por semilla)  

**Sin requisito de electricidad.**  

Luego: **Continuar endless** o nueva partida.

---

# 29. DERROTA

- Población 0  
- HQ perdido sin recuperación viable  

Pantalla: días, max pop, territorio, causa, semilla.  
Antes: estados críticos con avisos.

---

# 30. DIFICULTAD

v1: **Normal** (calibrar con simulador).  
Futuro: Fácil / Difícil (multiplicadores Director).

Filosofía: se puede perder; se aprende; no death spiral injusta tras crisis (protección).

---

# 31. UI / UX (CONTRATO)

## 31.1 Pantalla principal = MUNDO

Dock landscape: Construir · Avanzar día · Más (alcance pulgar).  
Móvil landscape: sheets / paneles adaptados a horizontal. Desktop: panel lateral.  
Prohibido: pestañas Mapa|Base|Gente|Más.

## 31.2 Interacción

Tocar edificio / landmark / explorador / alerta.  
Cámara: pan · zoom · Recentrar; colonia early centrada pero **espacio > viewport** (§9.4).  
Construcción: ghost + ✓/✕ (§9.2, §9.6).  
Navegación late: lista/filtros/centrar (§9.4).

## 31.8 Orientación y landscape

### CURSOR: CONSOLIDADO 2.7

- Gameplay: landscape obligatorio en móvil (§9.1) + rotate gate.  
- Portada + intro: vertical permitido.  
- No mantener dos UIs jugables equivalentes portrait/landscape.

## 31.3 Brief diario

Ritual: comida/agua producida·consumida·balance + hechos del día.

## 31.4 Tutorial contextual (aprender jugando)

### CURSOR: CONSOLIDADO 2.6 — decisión Neni

El tutorial **principal ocurre dentro del mundo**, no en cascadas de modales Continuar.

| Regla | Detalle |
|-------|---------|
| Una pista | Un objetivo/explicación a la vez |
| Contextual | Surge cuando el estado lo pide (ej. D1: “Necesitamos una fuente estable de comida.”) |
| Destacar acción | Resalta el control/edificio relevante (p. ej. Construir → huerto) |
| Avance natural | Al completar la acción, la guía avanza o se retira |
| Desaparición | Cuando el jugador ya usa el sistema, el coach de esa mecánica se apaga |
| Reconsulta | Siempre disponible vía §21.3 Ayuda |

**Prohibido:** modal → Continuar → modal → Continuar → modal → Continuar.

La mini-intro de nueva partida (§31.6) **no** sustituye este tutorial: la intro da tono; el coach enseña mecánica en D1+.

**2.7/2.8:** el tutorial contextual asume colonia landscape + sectores + **superficies edificables** + ✓ construir (§9). **ZZ-019A APROBADA** — tips de ZZ-012 reescritos sobre ese modelo; pendiente HUMAN_GATE de ZZ-012.

## 31.5 Portada / inicio (arranque del juego)

### CURSOR: CONSOLIDADO 2.6 — decisión Neni

Entrada propia de **juego terminado**, no pantalla técnica ni gestor de slots.

| Estado | Acciones |
|--------|----------|
| **Sin partida** | **NUEVA PARTIDA** (principal) · ajustes/sonido secundarios mínimos |
| **Con partida** | **CONTINUAR** (acción principal) · **NUEVA PARTIDA** · ajustes si procede |

- **CONTINUAR** carga la partida principal válida (§31.7 Carga).  
- **Prohibido:** UI de múltiples slots, selector de archivos, jerga técnica.  
- Branding / atmósfera de Zona Zero en primer viewport (no dashboard vacío).

## 31.6 Nueva partida — confirmación + mini-intro

### Confirmación (si ya hay partida)

Si existe partida y el jugador pulsa **NUEVA PARTIDA**:

> “Ya tienes una colonia en curso. Empezar de nuevo sustituirá esta partida.”

Confirmación explícita. **No** destruir partida por un toque accidental.

### Mini-intro (2–3 pasos máx.)

Bienvenida breve y atractiva. **No** manual. **No** cascada larga.

Cubrir en ≤3 pantallas/pasos:
1. Qué ha ocurrido / contexto mínimo.  
2. Qué representa nuestra colonia.  
3. Objetivo general: **sobrevivir, estabilizar, explorar y recuperar territorio.**

| Regla | |
|-------|--|
| Saltarse | Obligatorio (Skip / Saltar intro) |
| Tras intro | **Entrar directamente al Día 1** |
| Tono | Emoción + claridad; cero muro de texto |

## 31.7 Sistema de guardado v1

### CURSOR: CONSOLIDADO 2.6 — decisión Neni

Sustituye el modelo de **múltiples slots manuales**.

#### Modelo

| Pieza | Rol |
|-------|-----|
| **1 partida principal** | Única colonia en curso que ve el jugador |
| **AUTOGUARDADO** | Automático |
| **GUARDAR AHORA** | Acción manual sencilla (Más / menú) |
| **1 backup automático** | Copia anterior segura — **no** es un “slot” de usuario |

#### Autoguardado (cuándo)

- Periódicamente (intervalo seguro, calibrable).  
- Al **avanzar día**.  
- Tras **hitos importantes** cuando sea seguro (p. ej. construir, retorno de expedición, fin de brief).  
- Al salir / volver al hub / cerrar si técnicamente procede.

#### Backup — rotación segura

Objetivo: recuperar ante corrupción, error de guardado o fallo técnico grave.

**Regla de rotación (contrato técnico):**
1. Antes de sobrescribir la partida principal con un autoguardado nuevo, validar que el payload nuevo es íntegro (parse OK + `saveVersion` + campos mínimos).  
2. Solo si la principal **actual** es válida **y** el nuevo guardado es válido → copiar principal → backup, luego escribir principal.  
3. Si el nuevo guardado **falla** validación → **no** tocar principal ni backup; informar error suave.  
4. Si la principal está corrupta al cargar → intentar **backup** (véase Carga abajo); **no** rotar backup sobre una principal ya mala.  
5. Nunca presentar backup como segunda colonia jugable en portada.

#### Carga (CONTINUAR)

1. Cargar partida principal válida más reciente.  
2. Si falla → intentar recuperación desde backup.  
3. Informar al jugador en lenguaje humano (“Recuperamos tu colonia desde una copia de seguridad.”).  
4. Sin selector de archivos ni slots.

Detalle de campos: Apéndice E.

---

# 32. FEEDBACK

| Acción | Feedback |
|--------|----------|
| Construir | aparece en mapa + toast + log |
| Staff +/− | producción/efecto preview en ficha |
| Avanzar día | brief (incl. madera calefacción si frío) |
| Explorar | ruta + estado away |
| Retorno | card resultado (encuentro variante) |
| Herida/muerte | card + rail explorador |
| Brote | alerta fases + semáforo ambiental |
| Ataque | card + daños visibles edificios |
| Reparar | HP visual sube; coste cobrado |
| Tech | toast + unlock lista |
| Era | banner |
| Logro | badge discreto |
| Victoria | pantalla ritual |

---

# 32B. VIDA VISUAL (SIN 100 UNIDADES)

### CURSOR: CONSOLIDADO 2.4 — movimiento y estados

#### Principio
La colonia **se ve viva**, pero la población sigue siendo **agregada**. Figuras ambientales = theater, no Sims.

#### Render
- Cap de figuras en pantalla (p. ej. máx 12–20 sprites) proporcionales a pop/actividad.
- Pathing simple edificio↔edificio / punto de trabajo; sin IA estratégica.
- Sin nombres, sin selección individual de colonos.

#### Semáforo
| Color | Significado agregado |
|-------|----------------------|
| Verde | normal |
| Ámbar | cansancio / enfermos leves / frío empezando |
| Rojo | brote grave / ataque / exposición crítica |

#### Por situación (feedback mínimo)
| Situación | Qué se ve |
|-----------|-----------|
| Trabajo | figuras van a farm/well/taller según buildings staffed |
| Construcción | polvo/animación en parcela; workers “de obra” |
| Enfermedad | más ámbar/rojo cerca de edificios health; menos tráfico productivo |
| Reparación | chispas/andamiaje en edificio dañado |
| Clima frío | aliento/humo chimenea abstracto; menos movimiento outdoor |
| Calor | haze; menos movimiento mediodía |
| Ataque | flash perímetro; daño visual en builds; figuras a refugio |
| Explorador | silueta sale por ruta; icono away; vuelve con informe |
| Calefacción | brief “−N madera”; chimeneas activas si hay consumo |

#### Conexiones
Staffing §10 ↔ brotes §12 ↔ daño §13 ↔ clima §11 ↔ arte §33.

---

# 33. ARTE (INVENTARIO)

Conservar dirección: edificios/retratos WebP actuales como base.

Necesarios a medio plazo:
- edificios por tipo/nivel  
- landmarks  
- terreno ciudad cercano (no solo textura blur)  
- props colonia  
- defensas  
- vehículos  
- infectados silueta  
- clima  
- UI iconos recursos  
- logros  

No producir en esta fase documental.

---

# 34. SONIDO

Mínimo: click, construir, alerta, expedición, retorno, ataque, logro, tech, victoria. Mute ON/OFF.

---

# 35. DATOS Y BALANCE

Todo en `content/*.json` + `balance.json`.  
Nada de números mágicos en UI.  
Tablas: buildings, research, events, locations, infected, vehicles, eras, missions, achievements, seasons.

---

# 36. SIMULADOR

Perfiles: atento, expansivo, conservador, mala gestión, sin explorar, sobreexpansión.  
Métricas: supervivencia, pop, recursos, muertes, edificios, eras, victoria, crisis, recuperación.  
Usar para calibrar, no para “aprobar UX”.

---

# 37. PLAN DE IMPLEMENTACIÓN

Detalle exhaustivo de fases/subfases (`ZZ-XXX`), dependencias, tests, HUMAN_GATE y criterios de aceptación:

→ `docs/IMPLEMENTATION_PLAN.md` (**versión 2.8**) / Drive `ZONA_ZERO_IMPLEMENTATION_PLAN.md`

Ejecución y revisiones fase a fase:

→ Drive: `ZONA_ZERO_DEVELOPMENT_LOG.md`  
→ Repo: `docs/DEVELOPMENT_LOG.md`

Resumen: construcción por **bloques con HUMAN_GATE**; arranque (portada/save) + experiencia D1 visual; luego sistemas capa a capa; **nunca “MVP rápido”** que salte esta biblia. Gobernanza completa en §41.

---

# 38. CHANGELOG DE DISEÑO

## 2.8 (2026-08-16) — superficies edificables + escenario diseñado (Neni+ChatGPT)
- **No descarta** B0 ni ZZ-019 (ghost/✓/semilibre APROBADO).
- **Refina el dónde:** superficies edificables orgánicas dentro de territorio recuperado; al construir solo esas superficies; capacidad = geometría+footprint (sin cupo N).
- **SECTOR ≠ PARCELA:** un sector puede tener **varias** superficies disjuntas.
- Orden de diseño: mundo → estructura → superficies (no al revés).
- Mapa **finito diseñado**; refs composición: TWD Survivors (no copia) + Townsmen (legibilidad).
- Avisos → cámara + resalte + **abrir ficha** (§9.4 / §21).
- Caminos/muros: **solo visual en ZZ-019A**; mecánicas futuras vía §13/§9.5 si procede.
- Arte: integración sombra/perspectiva = fase posterior no bloqueante. **ZZ-019B APROBADA** (anti-GIS/funcional); art pass carretera/props/edificio–suelo/identidades = **deuda artística NO BLOQUEANTE** (no interpretar 019B como arte final).
- PLAN 2.8: **ZZ-019A = REVIEW_STOP** (no HUMAN_GATE extra); ZZ-012 CAMBIOS SOLICITADOS hasta 019A APROBADA.
- **Decisiones cerradas 2026-08-16:** (1) 019A=REVIEW_STOP · (2) varias superficies=SÍ · (3) caminos/vallas 019A=solo visual.

## 2.7 (2026-08-15) — modelo espacial / landscape / sectores (Neni+ChatGPT)
- **Landscape-first** gameplay; rotate gate; portada/intro pueden ser vertical (§9.1, §31.8).  
- **Sectores orgánicos** + recuperar territorio como gameplay (§9.4–§9.5, §16).  
- **Colocación semilibre** + snap invisible + confirmación ✓ (§9.2, §9.6).  
- Colonia **> viewport**; arco visual D1–D100; arte base sin falsos edificios jugables.  
- Expansión = más perímetro vulnerable (§9.8, §13).  
- Auditoría `max` edificios (§9.7); huertos sin max temprano arbitrario.  
- PLAN 2.7: HUMAN_GATE espacial temprano; ZZ-012 replanificada (pendiente).
- **Cierre decisiones:** plantillas de recuperación (no receta universal); sin cupo artificial por sector; sectores sin macrogrid; radio max=1; clinic sin max arbitrario; recuperación v1 sin RNG punitivo; REVIEW_STOP tras ZZ-018; criterio fantasía B0.
- **Aclaración escala:** viewport = ventana; mundo mayor que 844×390/932×430; pan/zoom/recenter; no caber toda la colonia en pantalla (§9.4).
- **Mundo físico vs plano:** sectores = estado ambiental (no placas GIS permanentes); límites en modo expansión; avisos UI → foco cámara (§9.4).

## 2.6 (2026-08-15) — arranque, tutorial contextual, save v1 (Neni)
- **Portada / inicio:** Continuar (principal si hay partida) · Nueva partida · sin slots (§31.5).  
- **Nueva partida:** aviso si hay colonia; mini-intro ≤3 pasos saltables → Día 1 (§31.6).  
- **Tutorial:** aprender en el mundo; una pista contextual; sin cascada Continuar (§31.4).  
- **Ayuda consultable** pequeña, sin spoilers (§21.3).  
- **Save v1:** 1 partida + autoguardado + Guardar ahora + 1 backup con rotación segura (§31.7, Ap. E).  
- Plan: fases ZZ-007 / ZZ-008 / ZZ-009; ampliaciones ZZ-012, ZZ-152, ZZ-180.

## 2.5 (2026-08-15) — contrato aprobado ZZ-001
- Electricidad fuera de v1; calefacción madera; brotes; quarantine pasivo; radio≠centro; etc. (ver 2.3–2.4).

## 2.3 (2026-08-15) — ronda Neni + ChatGPT → consolidación pendiente Cursor
- Calefacción de invierno: **madera automática**, no fuel ni toggle por casa; exposición al frío progresiva y enfermedad probabilística (§4/§11).
- Pozo = fuente; cisterna = reserva/soft-cap/lluvia (§7.3).
- Propuesta de **eliminar electricidad completa de v1** salvo dependencia jugable imprescindible (§7.8).
- Radio + Centro de Expediciones se mantienen con roles distintos (§7.5).
- Mejoras de colonia = research; taller no es menú paralelo (§8).
- Número de tecnologías no se fija por cuota; research con trabajadores por edificio y máximo pequeño en laboratorio avanzado (§18).
- Huerto básico no se bloquea por investigación; agricultura mejora/desbloquea variantes avanzadas (§18).
- Curva por causalidad problema→info→deseo; días solo brújula (§24).
- Gestión `[−]/[+]` por edificio reforzada; habitantes ambientales animados sin individualización (§10).
- Enfermedades/plagas y eventos por pesos/estado, sin calendario fijo (§12/§19).
- Daño y reparación visibles de edificios tras hordas/eventos (§13).
- Misiones y expediciones con variedad combinatoria/antirrepetición, no checklist lineal (§20).
- Pendiente Cursor: revisar impacto global, especialmente referencias a energía/fuel y árbol research.

## 2.2 (2026-08-15)
- Esta biblia incorpora **el flujo de trabajo Cursor ↔ ChatGPT** (§41–§42) como contrato, no como nota aparte.
- Tres maestros obligatorios: GAME_MASTER + IMPLEMENTATION_PLAN + DEVELOPMENT_LOG (Drive = GitHub).
- Aprobación solo literal (`APROBADA` + `SÍ`); HUMAN_GATE documentado.

## 2.0 / 2.1
- Modelo labor: **solo por edificio** (elimina doble asignación por categorías como primario).  
- Vivienda: protección climática + vivienda aislada.  
- Estaciones formales + patrón aviso/preparación/consecuencia.  
- Misiones y logros como sistemas.  
- Facciones → contactos ligeros.  
- Eliminar inventario pieces/tools.  
- Research debe aplicar efectos reales.  
- Infectados tipados deben importar en combate.  
- Victoria = culminación + crisis final variable.  
- UI: mundo-primero confirmado; tutorial por acción.  
- Prioridad: diseño antes que más capas de código.  
- Apéndices G–N: inventario motor, curva detallada, director operativo, sync.

---

# 39. AUDITORÍA DEL DOCUMENTO

## Pasada 2 — contradicciones / basura

- Eliminado micromanagement dual labor.  
- Eliminados recursos decorativos.  
- Edificios sin función (command puro) fusionados conceptualmente en HQ.  
- wall/power_hub huérfanos: no catálogo hasta existir edificio real.  
- Facciones no bloquean v1 core.

## Pasada 3 — “¿Divertido 30 horas?”

Sí, si: Director rítmico, exploración con peso, invierno como arco, pérdida recuperable, techs deseables, misiones contextuales, victoria lejana.  
Huecos cubiertos: estaciones, misiones, logros, vivienda climática, curva D1–endgame, plan técnico separado.

---

## Auditoría coherencia 2.4 (post-consolidación Ronda 2)

| Sistema | ¿Para qué? | ¿Duplica? | ¿Si lo quitamos? | Veredicto |
|---------|------------|-----------|------------------|-----------|
| Calefacción madera | Tradeoff builds vs calor | No (no leña aparte) | Invierno sin tensión | **Keep** |
| Electricidad | — | Inventaba demanda | Casi nada del núcleo | **Eliminada** |
| Fuel | Vehículos lejanos | No con madera | Solo a pie late | **Keep acotado** |
| Pozo/cisterna | Fuente vs reserva | No | Un solo agua plano | **Keep** |
| Radio/Centro | Historias vs logística | Evitado con roles A | Menos variedad/claridad | **Keep** |
| Research+workers | Progresión deseable | No (≠ edificios) | Sin arco mid | **Keep** |
| Brotes | Crisis staffing | No calendario | Menos imprevisión | **Keep** |
| Daño/repair | Consecuencia ataques | No craft piezas | Ataques sin huella | **Keep** |
| Vida ambiental | Feedback vivo | No 100 NPCs | Mapa estático | **Keep** |
| Plantillas expedición | Variedad | No misiones-build | Repetición | **Keep** |
| Protocolo cuarentena | Contener brotes sin micro | No toggle/−prod | Brotes siempre iguales de duros | **Keep** |

# 40. DECISIONES QUE CAMBIAN EL DISEÑO ANTERIOR

Ver resumen ejecutivo al final de `docs/IMPLEMENTATION_PLAN.md` y §38.

**Documento maestro 2.0 = contrato.** Implementación solo tras revisión humana (ChatGPT + autor).

---

*Fin del GAME_MASTER 2.0 — cuerpo de diseño. El plan técnico numerado continúa en `docs/IMPLEMENTATION_PLAN.md`.*

---


---

# APÉNDICE G — INVENTARIO EXHAUSTIVO DEL MOTOR ACTUAL (content/*.json)

> Auditoría factual del prototipo. **No sacraliza** el diseño 2.1: donde contradiga este documento, gana el diseño 2.1.
> Fecha de dump: 2026-08-15.

## G.1 Edificios presentes en código (32)

### `hq_central_l1` — Refugio Central I
- **Categoría:** core
- **Descripción:** Núcleo del asentamiento. Vivienda básica y centro de mando.
- **Coste:** wood: 0, metal: 0
- **Tamaño:** 2×2 · **max:** 1
- **Jobs:** 1 · **Housing:** 6 · **Defense:** 4
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `hq_central_l2` — Refugio Central II
- **Categoría:** core
- **Descripción:** Ampliación del núcleo: más camas, mejor coordinación y defensa.
- **Coste:** wood: 18, metal: 12, fuel: 2
- **Tamaño:** 2×2 · **max:** 1
- **Jobs:** 2 · **Housing:** 10 · **Defense:** 8
- **minEra:** 1
- **upgradeFrom:** `hq_central_l1`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `hq_central_l3` — Refugio Central III
- **Categoría:** core
- **Descripción:** Cuartel general fortificado. Máxima capacidad de mando y vivienda.
- **Coste:** wood: 28, metal: 22, fuel: 4, ammo: 2
- **Tamaño:** 2×2 · **max:** 1
- **Jobs:** 3 · **Housing:** 16 · **Defense:** 14
- **minEra:** 2
- **upgradeFrom:** `hq_central_l2`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `shelter` — Refugio
- **Categoría:** housing
- **Descripción:** Camas y techo improvisado. +2 capacidad.
- **Coste:** wood: 5, metal: 2
- **Tamaño:** 1×1 · **max:** 40
- **Jobs:** 0 · **Housing:** 2 · **Defense:** 0
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `house` — Casa
- **Categoría:** housing
- **Descripción:** Vivienda reforzada con más camas y algo de privacidad.
- **Coste:** wood: 10, metal: 4
- **Tamaño:** 1×1 · **max:** 20
- **Jobs:** 0 · **Housing:** 4 · **Defense:** 0
- **minEra:** 0
- **requiresBuilding:** `shelter`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `block` — Bloque
- **Categoría:** housing
- **Descripción:** Edificio de varias plantas. Mucha capacidad en poco suelo.
- **Coste:** wood: 16, metal: 12, fuel: 1
- **Tamaño:** 2×1 · **max:** 8
- **Jobs:** 0 · **Housing:** 8 · **Defense:** 0
- **minEra:** 1
- **requiresBuilding:** `house`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `farm` — Huerto
- **Categoría:** production
- **Descripción:** Cultivos a cielo abierto. Produce comida con personal.
- **Coste:** wood: 4, water: 2
- **Tamaño:** 1×1 · **max:** 12
- **Jobs:** 3 · **Housing:** 0 · **Defense:** 0
- **Produce:** food: 5
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `greenhouse` — Invernadero
- **Categoría:** production
- **Descripción:** Cultivo protegido. Más rendimiento y menos mermas.
- **Coste:** wood: 8, metal: 4, water: 3
- **Tamaño:** 1×1 · **max:** 6
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** food: 8
- **minEra:** 1
- **requiresBuilding:** `farm`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `well` — Pozo
- **Categoría:** production
- **Descripción:** Extrae agua potable cada día.
- **Coste:** metal: 5, wood: 2
- **Tamaño:** 1×1 · **max:** 8
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** water: 5
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `cistern` — Cisterna
- **Categoría:** production
- **Descripción:** Almacena y filtra agua. Mayor caudal con personal.
- **Coste:** metal: 8, wood: 3
- **Tamaño:** 1×1 · **max:** 4
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **Produce:** water: 7
- **minEra:** 1
- **requiresBuilding:** `well`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `sawmill` — Aserradero
- **Categoría:** production
- **Descripción:** Procesa madera útil a partir de restos y troncos.
- **Coste:** metal: 4, wood: 3
- **Tamaño:** 1×1 · **max:** 6
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** wood: 3
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `scrapyard` — Chatarrería
- **Categoría:** production
- **Descripción:** Clasifica chatarra y recupera metal usable.
- **Coste:** wood: 4, metal: 3
- **Tamaño:** 1×1 · **max:** 6
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** metal: 2
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `storage` — Almacén
- **Categoría:** logistics
- **Descripción:** Reduce pérdidas por saqueos, humedad y pudrición.
- **Coste:** wood: 5, metal: 2
- **Tamaño:** 1×1 · **max:** 4
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `workshop` — Taller
- **Categoría:** production
- **Descripción:** Forja y repara piezas. Produce metal refinado.
- **Coste:** wood: 4, metal: 4
- **Tamaño:** 1×1 · **max:** 6
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** metal: 2
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `kitchen` — Cocina
- **Categoría:** production
- **Descripción:** Raciona y conserva comida. Mejora el rendimiento alimentario.
- **Coste:** wood: 5, metal: 3, water: 1
- **Tamaño:** 1×1 · **max:** 4
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** food: 2
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `mech_shop` — Taller mecánico
- **Categoría:** production
- **Descripción:** Mantiene vehículos y herramientas. Produce piezas y metal.
- **Coste:** wood: 6, metal: 8, fuel: 2
- **Tamaño:** 2×1 · **max:** 3
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** metal: 3
- **minEra:** 1
- **requiresBuilding:** `workshop`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `medkit` — Botiquín
- **Categoría:** health
- **Descripción:** Puesto de primeros auxilios. Poca producción, cura básica.
- **Coste:** wood: 2, metal: 2, medicine: 1
- **Tamaño:** 1×1 · **max:** 6
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **Produce:** medicine: 1
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `infirmary` — Enfermería
- **Categoría:** health
- **Descripción:** Camas de cura y triaje. Mejora la recuperación de heridos.
- **Coste:** wood: 6, metal: 4, medicine: 2
- **Tamaño:** 1×1 · **max:** 4
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** medicine: 1
- **minEra:** 0
- **requiresBuilding:** `medkit`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `clinic` — Clínica
- **Categoría:** health
- **Descripción:** Centro médico completo. Genera medicinas y cura avanzada. Límite por coste/staffing/camas/espacio (§9.7); **no** max=2 arbitrario.
- **Coste:** metal: 8, wood: 5, medicine: 3, fuel: 1
- **Tamaño:** 2×1 · **max:** — (sin tope arbitrario; limpiar JSON)
- **Jobs:** 3 · **Housing:** 0 · **Defense:** 0
- **Produce:** medicine: 2
- **minEra:** 1
- **requiresBuilding:** `infirmary`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `barricade` — Barricada
- **Categoría:** defense
- **Descripción:** Obstáculo improvisado que frena asaltos.
- **Coste:** wood: 3, metal: 1
- **Tamaño:** 1×1 · **max:** 20
- **Jobs:** 0 · **Housing:** 0 · **Defense:** 3
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `fence` — Cerca
- **Categoría:** defense
- **Descripción:** Perímetro reforzado. Mejor cobertura que una barricada suelta.
- **Coste:** wood: 5, metal: 3
- **Tamaño:** 1×1 · **max:** 12
- **Jobs:** 0 · **Housing:** 0 · **Defense:** 5
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `watchtower` — Atalaya
- **Categoría:** defense
- **Descripción:** Vigilancia elevada. Mejora la defensa del asentamiento.
- **Coste:** wood: 6, metal: 4, ammo: 1
- **Tamaño:** 1×1 · **max:** 6
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 8
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `armory` — Armería
- **Categoría:** defense
- **Descripción:** Almacén y taller de armas. Mejora el uso de munición.
- **Coste:** wood: 6, metal: 8, ammo: 2
- **Tamaño:** 1×1 · **max:** 2
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 6
- **Produce:** ammo: 1
- **minEra:** 1
- **requiresBuilding:** `watchtower`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `bunker` — Búnker
- **Categoría:** defense
- **Descripción:** Refugio fortificado. Alta defensa y algo de vivienda de emergencia.
- **Coste:** wood: 10, metal: 16, ammo: 3, fuel: 2
- **Tamaño:** 2×1 · **max:** 2
- **Jobs:** 1 · **Housing:** 2 · **Defense:** 18
- **minEra:** 2
- **requiresBuilding:** `armory`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `radio` — Radio
- **Categoría:** logistics
- **Descripción:** Escucha señales y contacta supervivientes. Apoyo a exploración. **Única** infraestructura central de comunicaciones (§9.7).
- **Coste:** metal: 5, wood: 2, fuel: 1
- **Tamaño:** 1×1 · **max:** 1
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `expedition_center` — Centro de expediciones
- **Categoría:** logistics
- **Descripción:** Planifica salidas: más alcance y mejor organización de escuadras.
- **Coste:** wood: 8, metal: 6, fuel: 2
- **Tamaño:** 2×1 · **max:** 1
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **minEra:** 1
- **requiresBuilding:** `radio`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `garage` — Garaje
- **Categoría:** logistics
- **Descripción:** Aparcamiento y mantenimiento ligero. Reduce gasto de combustible en rutas.
- **Coste:** wood: 6, metal: 8, fuel: 2
- **Tamaño:** 2×1 · **max:** 2
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **fuelSave:** 1
- **minEra:** 1
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `command` — Puesto de mando
- **Categoría:** core
- **Descripción:** Sala de operaciones. Coordina defensa y expediciones.
- **Coste:** wood: 8, metal: 10, fuel: 1
- **Tamaño:** 1×1 · **max:** 1
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 4
- **minEra:** 1
- **requiresBuilding:** `hq_central_l1`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `generator` — Generador
- **Categoría:** energy
- **Descripción:** Energía diésel. Reduce el consumo diario de combustible neto.
- **Coste:** metal: 8, fuel: 2
- **Tamaño:** 1×1 · **max:** 3
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **Energía:** 4
- **fuelSave:** 1
- **minEra:** 0
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `solar` — Placas solares
- **Categoría:** energy
- **Descripción:** Energía limpia. Menos dependencia del diésel.
- **Coste:** metal: 10, wood: 2
- **Tamaño:** 1×1 · **max:** 4
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **Energía:** 3
- **fuelSave:** 1
- **minEra:** 1
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `tech_bench` — Banco técnico
- **Categoría:** research
- **Descripción:** Banco de prototipos. Desbloquea mejoras y prototipos simples.
- **Coste:** wood: 4, metal: 6
- **Tamaño:** 1×1 · **max:** 2
- **Jobs:** 1 · **Housing:** 0 · **Defense:** 0
- **minEra:** 1
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

### `lab` — Laboratorio
- **Categoría:** research
- **Descripción:** Investigación avanzada: medicinas, filtros y prototipos.
- **Coste:** wood: 6, metal: 10, medicine: 2, fuel: 1
- **Tamaño:** 2×1 · **max:** 1
- **Jobs:** 2 · **Housing:** 0 · **Defense:** 0
- **Produce:** medicine: 1
- **minEra:** 2
- **requiresBuilding:** `tech_bench`
- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1

## G.2 Decisiones de catálogo 2.1 vs JSON

| ID JSON | Decisión 2.1 |
|---------|--------------|
| command | **Fusionar** en HQ L2+ (no edificio separado obligatorio) |
| wall / power_hub / generator / solar | **Eliminados v1** |
| insulated_house | **AÑADIR** |
| block_reinforced | Mejora opcional era 3 |
| pieces/tools / energía | **Eliminados** |

## G.3 Research actual en código

### Rama: Supervivencia

#### `rationing` — Racionamiento
- Mejora el aprovechamiento de comida.
- Coste: food: 4, wood: 2 · Días: 2 · minEra: 0
- Requires: —
- Effects JSON: foodProdBonus=0.1
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `water_filters` — Filtros de agua
- Purificación improvisada más eficiente.
- Coste: metal: 3, water: 2 · Días: 2 · minEra: 0
- Requires: —
- Effects JSON: waterProdBonus=0.1
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `field_medicine` — Medicina de campo
- Vendajes y triaje básico.
- Coste: medicine: 3, wood: 2 · Días: 3 · minEra: 1
- Requires: rationing
- Effects JSON: healBonus=0.15
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `greenhouse_tech` — Cultivo protegido
- Permite construir invernaderos.
- Coste: wood: 6, metal: 3, water: 4 · Días: 4 · minEra: 1
- Requires: water_filters
- Effects JSON: unlockBuilding="greenhouse"; foodProdBonus=0.15
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `preservation` — Conservas
- Reduce el deterioro de alimentos.
- Coste: metal: 4, fuel: 2, food: 3 · Días: 4 · minEra: 2
- Requires: field_medicine, greenhouse_tech
- Effects JSON: foodProdBonus=0.2; spoilReduction=0.25
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

### Rama: Construcción

#### `basic_carpentry` — Carpintería básica
- Mejores estructuras de madera.
- Coste: wood: 5, metal: 1 · Días: 2 · minEra: 0
- Requires: —
- Effects JSON: buildCostReduction=0.1
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `metalwork` — Metalurgia improvisada
- Forja y reciclaje de chapa.
- Coste: metal: 5, fuel: 2 · Días: 3 · minEra: 0
- Requires: basic_carpentry
- Effects JSON: metalProdBonus=0.15
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `reinforced_walls` — Muros reforzados
- Perímetro más resistente.
- Coste: wood: 6, metal: 6 · Días: 3 · minEra: 1
- Requires: metalwork
- Effects JSON: defenseBonus=5; unlockBuilding="wall"
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `advanced_housing` — Alojamiento avanzado
- Más capacidad por refugio.
- Coste: wood: 8, metal: 4 · Días: 4 · minEra: 1
- Requires: basic_carpentry
- Effects JSON: housingBonus=1
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `power_grid` — Red eléctrica
- Optimiza generadores y talleres.
- Coste: metal: 8, fuel: 4 · Días: 5 · minEra: 2
- Requires: metalwork, reinforced_walls
- Effects JSON: fuelSaveBonus=0.2; unlockBuilding="power_hub"
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

### Rama: Logística

#### `scouting` — Exploración
- Mejor lectura del mapa y rutas.
- Coste: food: 2, wood: 2 · Días: 2 · minEra: 0
- Requires: —
- Effects JSON: expeditionSlots=1
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `pack_mules` — Carga ligera
- Más botín por expedición a pie.
- Coste: wood: 3, metal: 2 · Días: 2 · minEra: 0
- Requires: scouting
- Effects JSON: cargoBonus=0.15
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `bike_tech` — Taller de bicis
- Desbloquea bicicletas.
- Coste: metal: 4, wood: 4 · Días: 3 · minEra: 1
- Requires: scouting
- Effects JSON: vehicleUnlock="bike"
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `vehicle_bay` — Bahía de vehículos
- Coches y furgonetas.
- Coste: metal: 8, fuel: 3, wood: 4 · Días: 4 · minEra: 2
- Requires: bike_tech, pack_mules
- Effects JSON: vehicleUnlock="car"; expeditionSlots=1
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `convoy` — Convoy
- Operaciones con van y más carga.
- Coste: metal: 10, fuel: 5 · Días: 5 · minEra: 3
- Requires: vehicle_bay
- Effects JSON: vehicleUnlock="van"; cargoBonus=0.25
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

### Rama: Defensa

#### `watch_protocols` — Protocolos de guardia
- Turnos más efectivos.
- Coste: wood: 3, ammo: 1 · Días: 2 · minEra: 0
- Requires: —
- Effects JSON: defenseBonus=3
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `ammo_craft` — Recarga de munición
- Recuperáis vainas útiles.
- Coste: metal: 4, ammo: 2 · Días: 3 · minEra: 1
- Requires: watch_protocols
- Effects JSON: ammoEfficiency=0.2
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `tower_optics` — Óptica de atalaya
- Detección temprana de oleadas.
- Coste: metal: 5, wood: 3 · Días: 3 · minEra: 1
- Requires: watch_protocols
- Effects JSON: defenseBonus=5; threatSight=1
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `fortify` — Fortificación
- Barricadas y trampas perimetrales.
- Coste: wood: 8, metal: 6, ammo: 2 · Días: 4 · minEra: 2
- Requires: ammo_craft, tower_optics
- Effects JSON: defenseBonus=8; unlockBuilding="barricade"
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

#### `armor_vehicle` — Blindaje móvil
- Desbloquea el vehículo acorazado.
- Coste: metal: 12, fuel: 4, ammo: 3 · Días: 5 · minEra: 3
- Requires: fortify
- Effects JSON: vehicleUnlock="armored"; defenseBonus=5
- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs

## G.4 Familias de eventos en código

| Familia | Nº eventos |
|---------|------------|
| accidentes | 7 |
| ataques | 7 |
| calma | 5 |
| catastrofes | 7 |
| clima | 7 |
| comercio | 7 |
| conflictos | 7 |
| enfermedad | 7 |
| expansion | 7 |
| hallazgos | 7 |
| hambre_agua | 7 |
| infectados | 7 |
| infraestructura | 7 |
| radio | 7 |
| rumores | 7 |
| supervivientes | 7 |

**Total eventos:** 110

## G.5 Vehículos

- `0` **Bicicleta** — fuel/viaje 0 · speed 0.15 · cargo 0 · prot 0 · era 1 · coste metal: 4, wood: 6
- `1` **Coche** — fuel/viaje 2 · speed 0.35 · cargo 0.25 · prot 1 · era 2 · coste metal: 10, wood: 4, fuel: 3
- `2` **Furgoneta** — fuel/viaje 3 · speed 0.25 · cargo 0.5 · prot 2 · era 3 · coste metal: 14, wood: 6, fuel: 4
- `3` **Blindado** — fuel/viaje 4 · speed 0.2 · cargo 0.35 · prot 5 · era 3 · coste metal: 20, wood: 4, fuel: 5, ammo: 2

## G.6 Infectados

- `0` **Común** — HP 20 · speed 1 · dmg 8 · threatWeight 1 · era 0 — Infectado lento y numeroso.
- `1` **Rápido** — HP 16 · speed 1.8 · dmg 12 · threatWeight 2 · era 1 — Ágil y agresivo; rompe formaciones.
- `2` **Tanque** — HP 80 · speed 0.6 · dmg 22 · threatWeight 5 · era 2 — Bruto resistente que derriba barreras.
- `3` **Horda** — HP 12 · speed 1.1 · dmg 6 · threatWeight 3 · era 1 — Oleada densa; el peligro es el número.
- `4` **Raro** — HP 45 · speed 1.3 · dmg 18 · threatWeight 4 · era 3 — Mutación infrecuente con comportamiento imprevisible.

## G.7 Eras (JSON)

- **Era 0 — Refugio**: unlock={"minPop":0,"minControlled":0,"minResearch":0,"minDay":0} soft={"minDay":1} — Sobrevivir el primer cerco.
- **Era 1 — Asentamiento**: unlock={"minPop":5,"minControlled":2,"minResearch":2,"minDay":8} soft={"minDay":6} — Organizar producción y rutas.
- **Era 2 — Colonia**: unlock={"minPop":10,"minControlled":4,"minResearch":5,"minDay":18} soft={"minDay":14} — Expandir perímetro y diplomacia.
- **Era 3 — Distrito**: unlock={"minPop":18,"minControlled":7,"minResearch":10,"minDay":30} soft={"minDay":24} — Logística pesada y amenazas mayores.
- **Era 4 — Zona Zero**: unlock={"minPop":28,"minControlled":10,"minResearch":16,"minDay":45} soft={"minDay":36} — Dominio regional bajo presión constante.

## G.8 Tipos de landmark / localización


## G.9 Balance clave (números actuales)

```json
{
  "saveVersion": 4,
  "startingPopulation": 3,
  "maxPopulation": 150,
  "startingResources": {
    "food": 36,
    "water": 32,
    "wood": 13,
    "metal": 9,
    "medicine": 5,
    "fuel": 8,
    "ammo": 4
  },
  "foodPerPersonPerDay": 0.9,
  "waterPerPersonPerDay": 0.88,
  "explorers": {
    "maxActive": 3,
    "startSlots": 1,
    "slot2": {
      "minPop": 10,
      "minControlled": 3,
      "minEra": 1
    },
    "slot3": {
      "minPop": 24,
      "minControlled": 5,
      "minEra": 2
    },
    "skills": [
      "explore",
      "loot",
      "fight",
      "resist"
    ],
    "skillMax": 5,
    "xpPerLevel": [
      0,
      8,
      20,
      40,
      70
    ],
    "startingSkillRange": [
      1,
      2
    ],
    "recruitCooldownDays": 2,
    "gearRecoverChanceOnDeath": 0.55
  },
  "victory": {
    "minPop": 40,
    "minControlled": 8,
    "minStability": 55,
    "minEra": 3,
    "needHospital": true,
        "needDefense": 40,
    "finalCrisisSurvived": true
  },
  "quietNightChance": 0.32,
  "foodSoftCapDays": 10,
  "secondaryResources": [
    "parts",
    "tools"
  ]
}
```

## G.10 Facciones plantilla (JSON)

- `0` **Los del Puente** (friendly) hostility=10 tradeMult=0.9
- `1` **Caravana Gris** (trader) hostility=25 tradeMult=1
- `2` **Muralla Cerrada** (isolationist) hostility=40 tradeMult=1.4
- `3` **Chatarra Viva** (opportunist) hostility=55 tradeMult=1.2
- `4` **Jauría Roja** (hostile) hostility=85 tradeMult=2
- `5` **Círculo de Niebla** (variable) hostility=45 tradeMult=1.1

---

# APÉNDICE H — CURVA DE SISTEMAS DETALLADA (D1 → ENDGAME)

No es un guion fijo. Es la **curva de sistemas**: qué puede ocurrir, qué suele necesitarse, qué no debe aparecer aún.

## H.1 Día 1 — Entrar en el mundo
- **Sistemas activos:** mapa mundo, colonia física legible, HQ, recursos HUD (comida/agua/madera/metal…), construir, colocar, staff por edificio, avanzar día.
- **Contenido típico:** 3 habitantes, reservas iniciales, 1 explorador (aún sin forzar salida).
- **Objetivo guía:** construir huerto + asignar trabajadores; opcional pozo.
- **Prohibido introducir:** research UI, vehículos, hordas, facciones, invierno duro, victoria.
- **Sensación:** “tengo un sitio y un problema inmediato de comida”.
- **Alertas:** comida para X días.
- **Feedback:** edificio aparece, staff cambia preview producción, brief al avanzar.

## H.2 Día 2
- Brief diario ritual (producción − consumo).
- Posible segundo edificio (pozo/shelter).
- Todavía tutorial por acción, no cascada.
- Amenaza muy baja / soft-cap Director.

## H.3 Día 3
- Primera exploración cercana (campamento/landmark adyacente).
- Flujo: tocar lugar → riesgo/tiempo → enviar → ruta → retorno informe.
- Botín pequeño; herida rara.
- Aún sin clima extremo.

## H.4 Día 5
- Loop estable: producir, stockear, 1–2 landmarks, 1 shelter extra.
- Posible primer avistamiento infectado (evento leve).
- Defensa: barricada opcional, no ataque grave.

## H.5 Día 7–10
- Soft pressure: comida/agua, capacidad vivienda, storage.
- Era 1 cerca (indicadores pop/control/research).
- Radio / primer research desbloqueable si infra lista.
- Defensa básica (cerca/torre) se vuelve relevante.
- **NO:** crisis final, vehículos pesados.

## H.6 Día 15–20
- 2º explorador posible.
- Research activo con efectos reales.
- Primer ataque menor posible (preparación avisada).
- Misiones contextuales (need_food / need_beds).
- Contactos humanos solo como evento.

## H.7 Día 25–30
- Estaciones/clima: primer aviso de frío u ola.
- Enfermería útil.
- Invernadero / cisterna.
- Población 10–20 típica si bien gestionado.
- Territorio: 3–5 zonas controladas.

## H.8 Día 40–50
- Vehículos (bike→car) si garage+tech.
- Clínica en camino.
- Hordas / ataques medios.
- Pérdida recuperable (ejemplo 28→19→25).
- Era 2–3.

## H.9 Día 60–75
- Búnker / doctrina perímetro / reparación post-crisis.
- Logística (van), convoy.
- Catástrofes avisadas.
- Población 30–50.

## H.10 Día 90–100+
- Consolidación regional.
- Cadena victoria multi-condición visible.
- Crisis final variable por semilla (una de varias).
- Post-victoria: endless.

## H.11 Matriz “demasiado pronto”

| Sistema | Antes de |
|---------|----------|
| Research | D1–D5 tutorial cerrado |
| Vehículos | garage + era≥1–2 |
| Invierno duro | aviso + vivienda aislada disponible |
| Horda | defensa básica construible |
| Victoria UI | era≥3 + checklist |
| Facciones UI | playtest eventos OK |

---

# APÉNDICE I — FICHAS COMPLETAS DE EDIFICIOS (DISEÑO 2.1)

Números orientativos (calibración posterior). Protección climática solo vivienda.

## I.1 Núcleo

### Refugio Central I (`hq_central_l1`)
- **Función:** HQ, vivienda 6, defensa **pasiva**, único.
- **Coste:** gratis (inicio).
- **Tamaño:** 2×2.
- **Construcción:** ya colocado.
- **Workers:** **0** — no hay puesto asignable en v1.
- **Por qué 0:** “coordinación” no tenía efecto sistémico documentado (qué cambia con 0 vs 1). Hasta definir un efecto concreto (p. ej. bonus defensa/estabilidad solo con staff), el HQ **no** consume trabajadores. Vivienda y defensa son pasivas.
- **Era:** 0.
- **Mejoras:** → L2 → L3 in-place.
- **Clima protección:** 1.
- **Visual:** edificio ancla reconocible, escala protagonista D1.
- **Problema:** “¿dónde está mi colonia?”

### Refugio Central II / III
- Ver costes JSON G.1; aumentan housing/defensa; **jobs = 0** hasta diseñar mando/coordinación jugable.

## I.2 Vivienda

### Refugio improvisado (`shelter`)
- Capacidad 2 · protección 0 · wood 5 metal 2 · era 0 · max alto.
- Resuelve: camas baratas; riesgo clima.

### Casa básica (`house`)
- Capacidad 4 · protección 1 · wood 10 metal 4 · requiere shelter · era 0–1.

### Vivienda aislada (`insulated_house`) — NUEVO 2.1
- Capacidad 4 · protección 2 · wood 14 metal 6 fuel 1 · tech `insulation` · era 1–2.
- Resuelve: olas de frío.

### Bloque (`block`)
- Capacidad 8 · protección 2 · footprint 2×1 · requiere house · era 1–2.

### Bloque reforzado (`block_reinforced`) — mejora
- Capacidad 10–12 · protección 3 · era 3 · coste alto.

## I.3 Resto del catálogo activo
Contrato común para productivos (farm, well, greenhouse, cistern, sawmill, scrapyard, workshop, kitchen, mech_shop, storage, medkit, infirmary, clinic, barricade, fence, watchtower, armory, bunker, radio, expedition_center, garage, tech_bench, lab):
1. Sin workers → producción 0 (si aplica).
2. Staff en ficha del edificio (modelo único §10).
3. Soft-cap stock vía almacenes.
4. Daño en ataques → HP/eficiencia ↓ hasta reparar (abstracto o rebuild).
5. Baseline numérico = G.1 hasta calibración.

**Fuera del catálogo activo v1:** `command`, `generator`, `solar`, `wall`, `power_hub`.

---

# APÉNDICE J — DIRECTOR: ESPECIFICACIÓN OPERATIVA

## J.1 Inputs (cada día)
pop, housingCap, foodDays, waterDays, defenseScore, threat, injured, sick, stability, tension, era, day, recentLosses, explorersAway, controlledZones, season, weather, activeMissions, lastCrisisDay.

## J.2 Índices derivados (0–100)
- **Fuerza** = f(pop, defense, foodDays, controlled)
- **Fragilidad** = f(déficits, heridos, overflow vivienda, ammo baja)
- **Momentum** = f(crecimiento, research, exploración reciente)
- **Tensión** = suavizado hacia objetivo del Director

## J.3 Presupuesto diario de amenaza
- Early soft-cap (primeros ~10 días).
- Quiet night ~30%.
- Post-desastre: protección N días (menos eventos graves).
- Cooldown por familia de evento.
- Antirrepetición: no mismo id en ventana M días.
- Si Fragilidad alta → más oportunidades/recursos, menos catástrofe.
- Si Fuerza alta + Momentum alto → más presión (ataques/hordas) para evitar aburrimiento.

## J.4 Ritmo obligatorio
TENSIÓN → CRISIS → RECUPERACIÓN → CRECIMIENTO → TENSIÓN.
Nunca crisis infinita; nunca 100 días planos.

---

# APÉNDICE K — MISIONES: ESPECIFICACIÓN POR PATRÓN

1. **guide_farm** — D1 — construir+staff huerto — cierra coach — no fail hard
2. **guide_well** — post farm — pozo
3. **guide_explore** — ~D3 — primera expedición
4. **need_food** — foodDays<3 — asignar/producir/loot — fail → evento hambre
5. **need_water** — análogo
6. **need_beds** — pop>cap — construir vivienda
7. **need_warmth** — freezeWarn — cobertura térmica
8. **radio_signal** — radio+era≥1 — enviar a landmark — loot / timeout
9. **trapped_survivors** — explore — rescatar +pop / heridos
10. **supply_drop** — reclamar zona — recursos / contestado
11. **clear_nest** — hostile cerca — limpiar — control / bajas
12. **era1_gate** — checks — subir era
13. **era2_gate** — territorio+sanidad
14. **final_chain_*** — variantes semilla victoria

Campos schema: id, pattern, title, desc, status, progress, expiresDay, rewards, failEffects, uiPriority.

---

# APÉNDICE L — LOGROS COMPLETOS (IDS IMPLEMENTABLES)

### Supervivencia
`ach_dawn`, `ach_week`, `ach_month`, `ach_quarter`, `ach_century`, `ach_first_winter`, `ach_heatwave`, `ach_no_deaths_15`, `ach_food_crisis_recover`, `ach_water_crisis_recover`, `ach_pop_crash_recover`, `ach_endless_50`

### Población
`ach_pop_10`, `ach_pop_25`, `ach_pop_50`, `ach_pop_100`, `ach_full_housing`, `ach_mass_immigration`, `ach_rescue`, `ach_lose20_recover`, `ach_healthy_20`, `ach_stability_80`

### Exploración
`ach_first_explore`, `ach_landmarks_5`, `ach_landmarks_15`, `ach_control_3`, `ach_control_8`, `ach_control_12`, `ach_explorer_lvl3`, `ach_explorer_lvl5`, `ach_three_explorers`, `ach_heal_explorer`, `ach_extreme_clear`

### Construcción
`ach_first_farm`, `ach_first_well`, `ach_buildings_10`, `ach_buildings_25`, `ach_hq2`, `ach_hq3`, `ach_greenhouse`, `ach_storage_3`, `ach_dense_colony`

### Defensa
`ach_first_barricade`, `ach_repel_1`, `ach_repel_5`, `ach_messy_survive`, `ach_horde`, `ach_bunker`, `ach_zero_ammo_win`, `ach_perimeter_clean`

### Tech / industria
`ach_first_research`, `ach_branch_complete`, `ach_first_vehicle`, `ach_van_route`, `ach_winter_wood`, `ach_outbreak_contained`

### Eventos / misiones
`ach_hard_choice`, `ach_trade`, `ach_radio_mission`, `ach_failed_rescue`, `ach_calm_10`, `ach_prepared_catastrophe`

### Secretos / humor
`ach_name_zonazero`, `ach_recenter_50`, `ach_only_shelters`, `ach_brief_zero`, `ach_seed_secret`

**Total ids ≥ 63.**

---

# APÉNDICE M — SINCRONIZACIÓN DRIVE ↔ REPO

| Documento | Drive | Repo |
|-----------|-------|------|
| Biblia (este archivo) | `G:\Mi unidad\Juegos\Zona Zero\GAME_MASTER\ZONA_ZERO_GAME_MASTER.md` | `GAME_MASTER.md` |
| Plan técnico | `G:\Mi unidad\Juegos\Zona Zero\GAME_MASTER\ZONA_ZERO_IMPLEMENTATION_PLAN.md` | `docs/IMPLEMENTATION_PLAN.md` |
| Development log | `G:\Mi unidad\Juegos\Zona Zero\GAME_MASTER\ZONA_ZERO_DEVELOPMENT_LOG.md` | `docs/DEVELOPMENT_LOG.md` |
| Capturas review | `G:\Mi unidad\Juegos\Zona Zero\Review\` | `docs/review/` |

**Regla:** toda modificación documental actualiza Drive **y** repo con el mismo contenido (hash idéntico). Ver §41.9 y §42.

---

# APÉNDICE N — CHECKLIST “¿DIVERTIDO 30 HORAS?”

- [x] Curva de problemas nuevos (no un solo loop)
- [x] Pérdida recuperable
- [x] Exploración con peso
- [x] Clima como arco (aviso→prep→consecuencia)
- [x] Techs deseables
- [x] Eventos no memorizables
- [x] Misiones no campaña rígida
- [x] Victoria lejana + endless
- [x] Sin micro de 100 NPCs
- [x] Sin craft de picos
- [x] Modelo labor único
- [x] Feedback por acción importante
- [x] Plan técnico por fases con gates humanos
- [x] Forma de trabajar Cursor↔ChatGPT documentada en la biblia (§41–§42)
---

# APÉNDICE A — TECNOLOGÍAS (LISTA COMPLETA OBJETIVO)

Cada tech: **id · nombre · rama · req · días · coste · efecto (debe aplicarse en sim)**.

## Supervivencia (5)
1. `rationing` — Racionamiento — — — 3d — food — −8% consumo comida  
2. `water_filters` — Filtros de agua — — — 3d — — +10% water / −enfermedad agua  
3. `field_medicine` — Medicina de campo — rationing? — 4d — medicine — +curación  
4. `greenhouse_tech` — Cultivo protegido — — — 5d — wood/metal — unlock greenhouse +15% food outdoor mitigation  
5. `preservation` — Conservas — rationing — 5d — — soft-cap comida +20%, merma −25%  

## Construcción (5)
6. `basic_carpentry` — Carpintería — — — 3d — wood — −10% coste wood  
7. `metalwork` — Metalurgia — carpentry — 4d — metal — +15% metal prod  
8. `insulation` — Aislamiento térmico — carpentry — 5d — — unlock `insulated_house`  
9. `advanced_housing` — Vivienda avanzada — insulation — 6d — — unlock block / +1 housing global  
10. `reinforced_structures` — Estructuras reforzadas — metalwork — 6d — — +HP edificios / −daño ataque  

## Defensa (5)
11. `watch_protocols` — Protocolos de vigilancia — — — 3d — — +3 def  
12. `ammo_craft` — Munición improvisada — — — 4d — metal — armería +eficiencia ammo  
13. `tower_optics` — Óptica de torres — watch_protocols — 5d — — +5 def + avisos amenaza  
14. `fortify` — Fortificación — metalwork — 6d — — +8 def  
15. `perimeter_doctrine` — Doctrina de perímetro — fortify — 7d — — territorio controlado reduce intensidad ataque  

## Medicina (4)
16. `triage` — Triaje — field_medicine — 4d — — +camas efectivas  
17. `antibiotics_protocol` — Protocolo epidemia — triage — 6d — medicine — −spread enfermedad  
18. `field_surgery` — Cirugía de campaña — triage — 6d — — heridos explorador −1 día  
19. `public_health` — Salud pública — antibiotics — 7d — — unlock clínica avanzada / victoria path  

## Energía
**ELIMINADA v1** — no techs de generador/solar/power_grid.

## Exploración / Logística (5)
24. `scouting` — Exploración sistemática — — — 3d — — −riesgo leve / +info loot  
25. `pack_tactics` — Carga eficiente — scouting — 4d — — +cargo  
26. `bike_tech` — Movilidad ligera — — — 3d — — unlock bike  
27. `vehicle_bay` — Bahía de vehículos — bike_tech + garage — 6d — — unlock car  
28. `convoy` — Convoy — vehicle_bay — 7d — — unlock van + cargo  

**Total tecnologías canónicas 2.4: ver §18 (~26). Apéndice A histórico parcialmente superseded.**

---

# APÉNDICE B — LOGROS (≥60)

## Supervivencia (12)
1. Primer amanecer (D2)  
2. Semana viva (D7)  
3. Mes en la zona (D30)  
4. Trimestre (D90)  
5. Centenario (D100)  
6. Primer invierno sobrevivido  
7. Ola de calor superada  
8. Sin muertes 15 días  
9. Comida crítica y recuperación  
10. Agua crítica y recuperación  
11. Crisis y renacer (pop −30% y volver)  
12. Endless día 50 post-victoria  

## Población (10)
13. Diez almas  
14. Veinticinco  
15. Cincuenta  
16. Cien  
17. Capacidad llena  
18. Inmigración masiva (evento)  
19. Rescate exitoso  
20. Pérdida de 20 y recuperación  
21. Cero dependientes enfermos 20 días  
22. Estabilidad ≥80 diez días  

## Exploración (10)
23. Primera salida  
24. Cinco lugares  
25. Quince lugares  
26. Controlar 3 / 8 / 12 zonas  
27. Explorador nivel 3 / 5  
28. Tres exploradores activos  
29. Volver herido y curar  
30. Expedición extrema limpia  

## Construcción (8)
31. Primer huerto  
32. Primer pozo  
33. Diez edificios  
34. Veinticinco edificios  
35. HQ II / HQ III  
36. Invernadero  
37. Red de almacenes (3)  
38. Colonia “llena” visual mente densa  

## Defensa (8)
39. Primera barricada  
40. Repeler ataque  
41. Cinco ataques repelidos  
42. Ataque messy sobrevivido  
43. Horda contenida  
44. Búnker erigido  
45. Munición cero y victoria defensiva (humor/riesgo)  
46. Perímetro sin bajas  

## Tecnología / Industria (6)
47. Primera research  
48. Rama completa (cualquiera)  
49. Invierno con madera suficiente  
50. Brote contenido  
51. Primer vehículo  
52. Furgoneta en ruta  

## Eventos / Misiones (6)
53. Decisión difícil tomada  
54. Comercio con forasteros  
55. Misión radio completada  
56. Rescate fallido (logro amargo)  
57. Diez días en calma  
58. Catástrofe avisada y preparada  

## Secretos / humor (6+)
59. Nombrar explorador “Zona Zero”  
60. Recentrar 50 veces  
61. Construir solo shelters (run especial)  
62. Brief con balance 0 exacto  
63. Logro oculto semilla  
64. … (espacio para más en content)

**Total listado: 63+.**

---

# APÉNDICE C — MISIONES TIPO (CATÁLOGO)

| ID patrón | Tipo | Trigger | Objetivo | Recompensa | Fallo |
|-----------|------|---------|----------|------------|-------|
| guide_farm | guía | D1 | construir+staff huerto | XP guía / cierra coach | — |
| guide_well | guía | post farm | pozo staff | — | — |
| guide_explore | guía | D3 | primera expedición | — | — |
| need_food | contextual | foodDays&lt;3 | producir/asignar | estabilidad+ | hambre event |
| need_water | contextual | waterDays&lt;3 | igual | — | — |
| need_beds | contextual | pop&gt;cap | construir vivienda | — | abandono risk |
| need_warmth | contextual | freezeWarn | cobertura térmica | — | enfermos |
| radio_signal | aleatoria | radio+era≥1 | enviar explorador a X | loot | tiempo |
| trapped_survivors | aleatoria | explore | rescatar (+pop) | pop+ | heridos |
| supply_drop | aleatoria | — | reclamar zona | recursos | contestado |
| clear_nest | aleatoria | hostile cerca | limpiar | control | bajas |
| era1_gate | progresión | checks era1 | cumplir infra | era | — |
| era2_gate | progresión | — | territorio+sanidad | era | — |
| final_chain_a/b/c | progresión | victoria path | variantes semilla | victoria | crisis |

**Tipos de misión documentados: 14 patrones** (instancias procedurales infinitas).

---

# APÉNDICE D — TABLAS ORIENTATIVAS DE COSTES (NO FINALES)

Calibración vía simulador. Orden de magnitud:

| Edificio | Wood | Metal | Otros | Días build abstract |
|----------|------|-------|-------|---------------------|
| shelter | 5 | 2 | — | inmediato |
| house | 10 | 4 | — | inmediato |
| insulated_house | 14 | 6 | fuel 1 | inmediato |
| block | 22 | 12 | — | inmediato |
| farm | 6 | 2 | — | inmediato |
| well | 4 | 3 | — | inmediato |
| greenhouse | 16 | 10 | — | — |
| storage | 8 | 4 | — | — |
| workshop | 12 | 10 | — | — |
| infirmary | 10 | 8 | medicine 2 | — |
| watchtower | 10 | 8 | — | — |
| generator | ~~eliminado v1~~ | — | — | — |
| solar | ~~eliminado v1~~ | — | — | — |

Producción base (a plena plantilla): farm food 5, well water 5, etc. (ajustar en balance).

---

# APÉNDICE E — ESTADOS DEL SAVE (CONTRATO)

## E.1 Modelo de persistencia v1 (2.6)

| Key lógica | Visible al jugador | Uso |
|------------|-------------------|-----|
| `main` | Partida (CONTINUAR) | Única colonia |
| `backup` | No (interno) | Recuperación técnica |
| *(slots 1..N)* | **Eliminado de UX** | Migrar legado → main + descartar extras con aviso una vez |

Acciones UI: **Guardar ahora**, autoguardado (§31.7). Sin pantalla de slots.

## E.2 Campos de estado de juego

Campos nuevos previstos (migración v5+):
- `season`, `seasonDay`, `weather`, `weatherUntil`  
- `missions[]`, `missionCooldowns`  
- `achievementsUnlocked[]`  
- `housingClimateCoverage` (cache)  
- `flags` memoria narrativa  
- `laborModel: "per_building"`  
- `meta.introSeen` (bool) — mini-intro nueva partida  
- `meta.helpSeenTopics[]` — ayuda desbloqueada  

Compat: migrar saves 1.3 / multi-slot → **main** (+ backup si había slot secundario válido); defaults seguros.

---

# APÉNDICE F — MATRIZ DE APROBACIÓN HUMANA (HUMAN_GATE)

La aprobación formal vive en DEVELOPMENT_LOG. Equivalencia de hitos:

| Hito | Fase(s) | Requiere APROBADA + SÍ |
|------|---------|-------------------------|
| Biblia + plan | ZZ-001 | Sí (bloquea todo) |
| Portada / arranque | ZZ-007 | Sí |
| Intro nueva partida | ZZ-008 | Sí |
| D1 visual / tutorial / desktop | ZZ-010, ZZ-012, ZZ-014, ZZ-015 | Sí |
| Loop D1–D5 + labor | ZZ-021, ZZ-023 | Sí |
| Vivienda aislada | ZZ-032 | Sí |
| Invierno / clima QA | ZZ-045 | Sí |
| Ataque + recuperación | ZZ-065 | Sí |
| Mapa / fog polish | ZZ-073 | Sí |
| UI research | ZZ-082 | Sí |
| Misiones QA | ZZ-106 | Sí |
| Director auditoría | ZZ-125 | Sí |
| Facciones go/no-go | ZZ-133 | Sí |
| Victoria/derrota pantallas | ZZ-144 | Sí |
| UX mundo / a11y | ZZ-150, ZZ-154 | Sí |
| Arte terreno / review eras | ZZ-161, ZZ-165 | Sí |
| Informe balance | ZZ-173 | Sí |
| Deploy | ZZ-183 | Sí + orden explícita |

---

*Apéndices A–N + §41–§42 incluidos en la biblia 2.2 — documento maestro completo (diseño + forma de trabajar).*


---

# 41. FLUJO DE TRABAJO CURSOR ↔ CHATGPT (GOBERNANZA)

> Este capítulo **forma parte de la biblia**. No es un tip de proceso: es contrato operativo del proyecto Zona Zero.

## 41.1 Roles

| Quién | Rol |
|-------|-----|
| **Esta biblia (GAME_MASTER)** | Qué es el juego: sistemas, contenido, curvas, UX contrato, arte, balance. |
| **IMPLEMENTATION_PLAN** | Cómo se construye: fases `ZZ-XXX` con dependencias, tests y gates. |
| **DEVELOPMENT_LOG** | Qué pasó: resultado Cursor, revisiones ChatGPT, correcciones, aprobaciones. |
| **Cursor** | Ejecuta fases, escribe código/docs, tests, capturas, commits, push, actualiza el log. |
| **ChatGPT** | Revisa diseño y cada fase leyendo Drive; escribe revisiones; otorga o deniega aprobación literal. |
| **Humano (autor)** | Dueño del producto; puede reforzar o anular, pero el canal formal es el log. |

## 41.1A REGLA DE REVISIÓN CHATGPT → CURSOR (OBLIGATORIA)

Cuando el trabajo sea revisar o rediseñar el juego, **ChatGPT trabaja directamente sobre este GAME_MASTER**. No se limita a describir cambios en el chat para que Cursor los interprete después.

- ChatGPT revisa cada sistema con criterio de diseño y deja las observaciones **junto al apartado afectado** mediante notas con prefijo `CHATGPT:`.
- Las notas pueden indicar: mantener, cambiar, eliminar, conectar con otro sistema, contradicción, hueco de diseño o pregunta pendiente.
- Cursor debe leer estas notas como instrucciones de revisión y **no implementar nada todavía** mientras ZZ-001 no esté aprobado.
- Después de la pasada de ChatGPT, el mensaje para Cursor será esencialmente: **“Lee el GAME_MASTER y revisa/aplica documentalmente las notas `CHATGPT:` que he dejado. No implementes código.”**
- Si una observación afecta al orden técnico o a una fase, después se refleja también en IMPLEMENTATION_PLAN. El DEVELOPMENT_LOG registra únicamente qué revisión se hizo y su estado.

**Reparto claro:** GAME_MASTER = qué juego queremos y comentarios de diseño; IMPLEMENTATION_PLAN = cómo/orden de construcción; DEVELOPMENT_LOG = qué se ha hecho/aprobado.

## 41.2 Los tres documentos (siempre vivos)

### GAME_MASTER / `ZONA_ZERO_GAME_MASTER.md`
- Biblia funcional **completa**.
- Incluye diseño del juego **y** esta forma de trabajar (§41–§42).
- Si cambia una decisión de diseño, se actualiza **aquí primero**, luego sync.

### IMPLEMENTATION_PLAN / `ZONA_ZERO_IMPLEMENTATION_PLAN.md`
- Catálogo exhaustivo de fases/subfases (`ZZ-001` …).
- Cada fase: ID, nombre, objetivo, sistemas, dependencias, tareas, datos, assets, pruebas auto/funcionales, revisión visual, aceptación, **HUMAN_GATE**.
- No es un MVP de 5 fases: es el plan completo.

### DEVELOPMENT_LOG / `ZONA_ZERO_DEVELOPMENT_LOG.md`
- Documento de **comunicación de ejecución** Cursor ↔ ChatGPT.
- Una sección por fase, formato obligatorio (ver §41.5).
- Fuente de verdad de: dónde estamos, qué está hecho, qué pidió ChatGPT, qué está aprobado/bloqueado.

## 41.3 Orden global del proyecto

```
1) Terminar / mantener esta biblia (diseño)
2) Mantener IMPLEMENTATION_PLAN alineado
3) ChatGPT aprueba ZZ-001 (GAME_MASTER + PLAN)
4) Cursor ejecuta fases en orden de dependencias
5) Tras cada fase → log PENDIENTE DE REVISIÓN
6) Si HUMAN_GATE → esperar APROBADA + SÍ antes de continuar dependientes
7) Si CAMBIOS SOLICITADOS → corregir → nueva ronda → otra vez PENDIENTE
8) Solo con APROBADA + SÍ la fase se considera cerrada
```

**Ahora mismo:** pasos 1–2 en curso de revisión; **prohibido implementar juego** hasta ZZ-001 aprobada.

## 41.4 Regla de oro de aprobación

Una fase **solo** está autorizada/cerrada cuando el DEVELOPMENT_LOG contiene **literalmente**:

```
ESTADO REVISIÓN: APROBADA
APROBACIÓN FINAL CHATGPT: SÍ
```

**NO equivalen a aprobación:**
- silencio de ChatGPT;
- “se ve mejor”, “va bien”, comentarios positivos;
- tests verdes / smoke OK;
- commit/push hechos;
- capturas generadas.

## 41.5 Formato obligatorio por fase (DEVELOPMENT_LOG)

```markdown
# FASE ZZ-XXX — Nombre

## PLAN
Qué debía hacerse.

## RESULTADO CURSOR
Qué se ha hecho realmente.

## ARCHIVOS MODIFICADOS
Lista.

## PRUEBAS
Qué se ejecutó y resultado.

## CAPTURAS
Rutas cuando proceda.

## PROBLEMAS / LIMITACIONES
Pendiente o provisional.

## COMMIT
Hash.

## ESTADO CURSOR
COMPLETADA / BLOQUEADA / NO INICIADA

## REVISIÓN CHATGPT
(Pendiente inicialmente / texto de revisión)

## ESTADO REVISIÓN
PENDIENTE DE REVISIÓN | CAMBIOS SOLICITADOS | APROBADA

## CORRECCIONES SOLICITADAS
(Vacío o lista concreta)

## RESPUESTA CURSOR A LA REVISIÓN
(Vacío o qué se corrigió)

## APROBACIÓN FINAL CHATGPT
NO | SÍ
```

### Historial de rondas (nunca borrar)

Si hay varias pasadas:

```markdown
## REVISIÓN CHATGPT — RONDA 1
…

## RESPUESTA CURSOR — RONDA 1
…

## REVISIÓN CHATGPT — RONDA 2
…

## RESPUESTA CURSOR — RONDA 2
…
```

## 41.6 Qué hace Cursor después de CADA fase

1. Ejecutar pruebas de la fase.  
2. Generar capturas si el plan lo pide (`docs/review/` + copia Drive Review + contact sheet).  
3. Commit.  
4. Push.  
5. Actualizar DEVELOPMENT_LOG (Drive + repo).  
6. Poner `ESTADO REVISIÓN: PENDIENTE DE REVISIÓN`.  
7. Mantener `APROBACIÓN FINAL CHATGPT: NO` hasta nueva aprobación.  
8. Continuar a la siguiente fase **solo si** no hay HUMAN_GATE pendiente de aprobación en dependencias.

## 41.7 HUMAN_GATE

Algunas fases llevan `HUMAN_GATE: YES` (arquitectura visual, D1, UX principal, mapa, arte, grandes cambios de gameplay, hitos jugables, deploy).

En esas fases Cursor **NO** avanza a fases dependientes hasta:

- `ESTADO REVISIÓN: APROBADA`
- `APROBACIÓN FINAL CHATGPT: SÍ`

Lista canónica vigente: ver **IMPLEMENTATION_PLAN 2.7** § HUMAN_GATE (incluye ZZ-016, ZZ-019, etc.).

### 41.7.1 REVIEW_STOP (revisión humana intermedia, no gate canónico extra)

Algunas fases marcan `REVIEW_STOP: YES` (p. ej. **ZZ-018**, **ZZ-019A**).  
Tras completar la fase: tests → capturas/evidencia → commit → log `PENDIENTE DE REVISIÓN` → **PARAR**.  
**No** ejecutar la fase siguiente (p. ej. ZZ-019) hasta autorización explícita Neni/ChatGPT.  
No cuenta como HUMAN_GATE adicional en el total canónico, pero **bloquea** igual que un gate a efectos de avance.

## 41.8 Cuando ChatGPT pide cambios

Si el log dice `ESTADO REVISIÓN: CAMBIOS SOLICITADOS`:

1. Leer revisión completa + correcciones.  
2. Implementar.  
3. Re-ejecutar pruebas.  
4. Regenerar capturas si aplica.  
5. Commit/push.  
6. Rellenar `RESPUESTA CURSOR A LA REVISIÓN` (o RONDA N).  
7. Volver a `ESTADO REVISIÓN: PENDIENTE DE REVISIÓN`.  
8. Dejar `APROBACIÓN FINAL CHATGPT: NO` hasta nueva revisión.

## 41.9 Sincronización Drive ↔ GitHub

Tras **cualquier** cambio documental:

1. Escribir el mismo contenido en Drive y en repo.  
2. Verificar igualdad (hash / diff).  
3. Commit + push de documentación.  

Scripts de apoyo:
- `scripts/build-dev-protocol-docs.mjs` — regenera plan + log + sync.
- `scripts/sync-game-master-drive.mjs` — sync biblia/plan (ampliar si hace falta).

**Regla:** Drive y GitHub deben contener la **misma versión** de los tres maestros. ChatGPT trabaja sobre Drive; Cursor sobre repo; el contenido es uno.

## 41.10 Capturas y revisión visual

Cuando una fase pide revisión visual:

- Generar capturas necesarias.  
- Subir a `docs/review/` en el mismo commit (sustituir antiguas; no acumular).  
- Regenerar `docs/review/index.html` (preferible `node scripts/review-shots.mjs`).  
- Copiar (no mover) a `G:\Mi unidad\Juegos\Zona Zero\Review\`.  
- Regenerar `review-contact-sheet.jpg` en repo y Drive Review.  
- Indicar en el log: commit, rutas, contact sheet.

## 41.11 Qué NO hacer

- No implementar fases antes de ZZ-001 APROBADA.  
- No “seguir un poco” tras un HUMAN_GATE pendiente.  
- No borrar revisiones anteriores del log.  
- No diverger Drive vs GitHub.  
- No tratar el código existente como diseño definitivo.  
- No deploy salvo orden explícita (ZZ-183 + gate).

## 41.12 Estado actual del proyecto (actualizar cuando cambie)

| Ítem | Estado |
|------|--------|
| Biblia GAME_MASTER 2.2 | Lista para revisión ChatGPT |
| Plan ZZ-XXX (~100 fases) | Listo para revisión ChatGPT |
| DEVELOPMENT_LOG (plantillas) | Creado; fases NO INICIADAS |
| Implementación de juego | **PARADA** hasta ZZ-001 |
| ZZ-001 | PENDIENTE DE REVISIÓN |

## 41.13 Tablero revisión diseño

| Tema | Estado 2.4 |
|------|------------|
| Calefacción madera auto | **CONSOLIDADO** |
| Sin electricidad v1 | **CONSOLIDADO** |
| Radio + Centro | **CONSOLIDADO** |
| Research + workers | **CONSOLIDADO** (~26 techs) |
| Brotes probabilísticos | **CONSOLIDADO** |
| Daño/reparación | **CONSOLIDADO** |
| Vida ambiental | **CONSOLIDADO** §32B |
| Misiones/expediciones plantillas | **CONSOLIDADO** |
| Director sin cadencia fija | **CONSOLIDADO** |

**DECISIONES CERRADAS — NENI + CHATGPT (Ronda 3):**
1. Protocolo de cuarentena = tech sanitaria **permanente/pasiva** (ver §12 + §18). Sin toggle. Sin −prod artificial.
2. HQ L2/L3 sin fuel: **confirmado**.
3. Fuel ≈ vehículos / usos con función jugable real.

### CURSOR: CONSOLIDADO 2.5 — Ronda 3 aplicada
- §12 y §18 actualizados; definición antigua “−prod leve / decisión toggle” **eliminada**.
- Brotes siguen probabilísticos, sin calendario fijo.
- Dudas menores de 2.4 sobre cuarentena y fuel en HQ: **cerradas**.

### Auditoría final 2.5 — resultado
| Check | Resultado |
|-------|-----------|
| Calefacción = madera auto | OK |
| Sin electricidad v1 | OK |
| Fuel ≠ calor / ≠ HQ | OK |
| Pozo ≠ cisterna | OK |
| Radio ≠ Centro (roles) | OK |
| Research = workers, sin cuota | OK |
| Cuarentena pasiva, no toggle/−prod | OK |
| Brotes sin cadencia fija | OK |
| Daño/repair visible | OK |
| Victoria sin needEnergy | OK |
| Prod en brote = sick + reasignación | OK |

**Dudas reales abiertas para Neni/ChatGPT:** ninguna bloqueante de diseño tras Ronda 3. Queda solo **ZZ-001** (aprobación formal de la biblia+plan).

**ZZ-001 sigue NO aprobada** hasta revisión final ChatGPT de esta consolidación 2.5.

---

# 42. MAPA DE DOCUMENTOS, CARPETAS Y RESPONSABILIDADES

## 42.1 Carpeta Drive del proyecto

```
G:\Mi unidad\Juegos\Zona Zero\
  GAME_MASTER\
    ZONA_ZERO_GAME_MASTER.md          ← biblia (este documento)
    ZONA_ZERO_IMPLEMENTATION_PLAN.md  ← fases
    ZONA_ZERO_DEVELOPMENT_LOG.md      ← ejecución/revisión
  Review\
    *.png / review-contact-sheet.jpg  ← solo capturas de revisión actual
```

## 42.2 Equivalentes en el repositorio

```
GAME_MASTER.md
docs/IMPLEMENTATION_PLAN.md
docs/DEVELOPMENT_LOG.md
docs/review/                          ← galería + capturas versionadas
docs/art-direction/                   ← dirección arte (si aplica)
docs/TECH.md                          ← notas técnicas (subordinado a esta biblia)
content/*.json                        ← datos de juego (implementación)
```

## 42.3 Prioridad de fuentes de verdad

1. **GAME_MASTER** (diseño + gobernanza)  
2. Decisiones explícitas APROBADAS en DEVELOPMENT_LOG  
3. IMPLEMENTATION_PLAN (cómo construir lo ya aprobado)  
4. Código / JSON (adaptar al diseño; no sacralizar)

## 42.4 Si dentro de 6 meses alguien abre solo un archivo

Debe poder entender **todo Zona Zero** leyendo `ZONA_ZERO_GAME_MASTER.md` / `GAME_MASTER.md`, y saber **cómo se trabaja** leyendo §41–§42; el detalle de fases y el historial de ejecución viven en los otros dos maestros sincronizados.


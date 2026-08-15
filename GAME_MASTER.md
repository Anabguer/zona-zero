# ZONA ZERO — GAME MASTER (BIBLIA DE DISEÑO DEFINITIVA)

**Versión de diseño:** 2.3 · **BIBLIA ÚNICA DEL PROYECTO** (diseño + forma de trabajar · ronda revisión ChatGPT↔Cursor)  
**Estado:** Diseño integral — **sin implementación autorizada** hasta revisión humana (ZZ-001)  
**Fecha:** 2026-08-15  
**Plataforma:** Web responsive (móvil + escritorio) · HTML/CSS/JS + PHP + MySQL  
**Repositorio:** `Anabguer/zona-zero`  
**URL objetivo:** `/juegos/zona-zero/`

### Tres documentos maestros (siempre idénticos Drive ↔ GitHub)

| Documento | Drive | GitHub |
|-----------|-------|--------|
| **Esta biblia** | `G:\Mi unidad\Juegos\Zona Zero\GAME_MASTER\ZONA_ZERO_GAME_MASTER.md` | `GAME_MASTER.md` |
| **Plan de fases** | `...\GAME_MASTER\ZONA_ZERO_IMPLEMENTATION_PLAN.md` | `docs/IMPLEMENTATION_PLAN.md` |
| **Log de ejecución** | `...\GAME_MASTER\ZONA_ZERO_DEVELOPMENT_LOG.md` | `docs/DEVELOPMENT_LOG.md` |

> **Prioridad:** esta biblia 2.2 manda sobre diseños 1.x, chats sueltos y código existente cuando haya contradicción.  
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
9. Construcción  
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
31. UI / UX (contrato de juego, no pantallas)  
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
| Acumular combustible | Mitigar déficit de cobertura (ver abajo) |
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

#### Mitigación con combustible (no barra de energía diaria)

Si `déficit > 0` durante clima extremo y hay **combustible**:
- el jugador puede activar **calefacción colectiva** (toggle/estado automático si stock > mínimo);
- consume fuel proporcional al déficit (calibrable);
- reduce el déficit efectivo (p. ej. 1 fuel mitiga N personas-día);
- **no** sustituye vivienda a largo plazo: es parche caro.

**Energía eléctrica** (§7.8) **no** es requisito de calefacción v1: evita tres sistemas para lo mismo. La energía sirve a edificios avanzados; el frío se pelea con **vivienda + fuel**.

#### Conexiones

- Vivienda §4 ↔ Clima §11 ↔ Combustible §6 ↔ Salud §12 ↔ Alertas §21 ↔ Research aislamiento §18.

#### ¿Para qué existe cada pieza?

| Pieza | Existe para… | Si la quitamos… |
|-------|--------------|-----------------|
| Protección por tipo de casa | Forzar progresión de vivienda antes del invierno | Solo “más camas” sin tensión climática |
| Aviso previo | Decisión justa | Castigo RNG |
| Fuel como parche | Tradeoff vs vehículos/generador | O solo vivienda o solo muerte |

## 4.3 Cobertura climática (resumen operativo)

Ver cadena arriba. HUD en aviso: *“Frío en 3 días — alojamiento protegido 18/27. Fuel puede cubrir parte del déficit.”*

## 4.4 Mantenimiento

Viviendas **no** pagan alquiler diario.  
Único consumo asociado: **fuel de calefacción** solo en clima extremo con déficit (y solo si el jugador tiene stock / lo permite).  
Sin micromanagement de “encender cada casa”.

**CURSOR: PROPUESTA / DUDA (Neni + ChatGPT)**  
¿La calefacción con fuel debe ser **automática** (gasta si hay déficit y stock) o un **toggle** “priorizar calefacción / priorizar vehículos”?  
- **Recomendación Cursor:** toggle simple en panel colonia (default ON en primeras olas, luego el jugador aprende). Evita sorpresas de fuel a 0 el día del viaje en coche.  
- Alternativa: automático puro (más simple, menos control).

---

# 5. NECESIDADES DE LA COLONIA

Solo necesidades con decisión jugable. No 40 barras.

| Necesidad | Aparece | Satisface | Si falla (leve → grave) | Aviso |
|-----------|---------|-----------|-------------------------|-------|
| Comida | D1 | Huertos, cocina, loot, raciones | hambre → bajas productividad → muertes/abandono | “comida para X días” |
| Agua | D1 | Pozo, cisterna, loot | sed → enfermedad → muertes | igual |
| Vivienda | D1–2 | shelters/casas/bloques | frena crecimiento → abandono | “X sin plaza” |
| Temperatura | ~D8+ / estación | vivienda aislada, fuel, tech | frío/calor: consumo, enfermos | “ola en Y días” |
| Salud | al haber heridos/enfermos | botiquín→enfermería→clínica | curación lenta → muertes | “camas médicas X/Y” |
| Seguridad | amenaza visible | defensa, territorio, torres | ataques peores | “amenaza alta” |
| Almacenamiento | soft-cap | almacenes | merma de exceso | “reservas se estropean” |
| Energía | era 1–2 | generador/solar | fuel↑, fallos eventos | “demanda > producción” |
| Estabilidad | siempre (oculto early) | necesidades cubiertas | productividad↓, inmigración↓ | “moral baja” |
| Combustible | con vehículos/generador | loot, eventos | sin vehículos lejanos | “fuel crítico” |
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
| Madera | sawmill, loot, eventos | construcción, algo de calefacción | build |
| Metal | scrapyard, workshop, loot | construcción, defensas | build |
| Medicinas | med buildings, loot, farmacia | curación | salud |
| Combustible | loot, gasolinera, eventos | vehículos, generador | logística/energía |
| Munición | armería, loot, comisaría | defensa, expediciones hostiles | combate abstracto |

## 6.2 Secundarios

| Recurso | Tipo | Nota 2.0 |
|---------|------|----------|
| Energía | **capacidad** producida/demanda, no stack | HUD cuando exista generador |
| Piezas / tools | **eliminados como inventario** | Absorben en niveles de Taller |

## 6.3 Soft-caps

Comida/agua: ~`pop × díasReserva` + bonus almacén. Exceso → merma. Obliga a no stockpile infinito sin almacenes.

---

# 7. CATÁLOGO DE EDIFICIOS

Principio: cada edificio resuelve un problema. Si no, fuera.

**Conteo diseño 2.0:** 28 edificios activos (+ 3 upgrades HQ = 30 entradas). Eliminados o fusionados vs JSON legado: radio como edificio opcional ligero; `command` fusionable con HQ L2+; no `wall`/`power_hub` huérfanos.

### 7.1 Núcleo

| ID | Nombre | Función | Coste orient. | Jobs | Era | Notas |
|----|--------|---------|---------------|------|-----|-------|
| hq_central_l1 | Refugio Central I | HQ + vivienda 6 + def | gratis inicio | 1 | 0 | único |
| hq_central_l2 | Refugio Central II | +vivienda/def/mando | wood/metal/fuel | 2 | 1 | upgrade |
| hq_central_l3 | Refugio Central III | cuartel | alto | 3 | 2 | upgrade |

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
| radio | Radio | misiones/radio events más frecuentes | 1 |

**CURSOR: PROPUESTA / DUDA — radio vs centro de expediciones**

Riesgo de dos edificios mid-game que “mejoran exploración/info” sin diferencia clara.

| Opción | Idea | Pros | Contras |
|--------|------|------|---------|
| **A (recomendada)** | **Radio** = misiones/señales/eventos de contacto. **Centro** = reduce riesgo/tiempo de rutas + prep de 2º/3º explorador (logística). Roles distintos. | Claridad; ambos justificables | Dos edificios que construir |
| B | Fusionar en un solo **Puesto de operaciones** (radio+logística) | Menos clutter | Menos progresión de builds |
| C | Radio solo evento/HQ upgrade; quitar edificio radio | Más simple | Menos presencia en mapa |

**Recomendación Cursor: A.** Si en playtest el centro se siente “+% invisible”, subir su feedback (ficha de expedición muestra riesgo↓) o pasar a B.

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

### 7.8 Energía

**CHATGPT: REVISAR CADENA ENERGÉTICA.** Antes de mantener generador/solar hay que definir qué consume energía y qué problema concreto resuelven. Evitar una barra de energía decorativa. Conectar de forma comprensible con necesidades reales (p. ej. calefacción, clínica, instalaciones avanzadas), sin inventar consumos diarios solo para justificar edificios.

### CURSOR: RESPUESTA — energía como CAPACIDAD de edificios avanzados (decisión 2.3)

**Aceptada la crítica.** Energía **no** es barra de supervivencia diaria ni justificación circular del generador.

#### Qué es
- Contador **capacidad** `energíaDisponible` vs `energíaDemandada` (no stack inventariable).  
- **Aparece en HUD solo cuando** existe el primer generador/solar **o** el primer edificio que demanda energía.

#### Qué CONSUME energía (demanda)

Solo edificios **avanzados** (lista cerrada v1):

| Edificio / función | Demanda | Sin energía suficiente |
|--------------------|---------|------------------------|
| Clínica | alta | curación a ritmo de enfermería (degradado) |
| Laboratorio | media | research más lento o pausado |
| Taller mecánico / garaje (reparar vehículos) | media | no repara / repara muy lento |
| Armería avanzada (si tech) | baja | produce menos ammo |
| **No:** huertos, pozos, casas, torres básicas, HQ early | 0 | — |

#### Qué NO hace la energía v1
- No calienta casas (eso es **fuel + vivienda**, §4).  
- No es requisito de victoria por sí sola: es requisito **indirecto** porque clínica/lab/energía estable sí entran en cadena de victoria.

#### Generador vs solar (roles distintos)

| | Generador | Solar |
|--|-----------|-------|
| Para qué | potencia alta ya | independencia de fuel a medio plazo |
| Coste continuo | **fuel/día** si está online | 0 fuel |
| Debilidad | compite fuel con vehículos/calefacción | menos potencia; peor en tormentas (opcional −) |
| Decisión | “¿quemo fuel para clínica ya?” | “¿invierto metal para dejar de quemar fuel?” |

#### ¿Si lo elimináramos?
Perderíamos el arco mid/late de “infraestructura que exige potencia” y el tradeoff fuel. Si no conectamos demanda real, **mejor eliminar** generador/solar que dejarlos decorativos — por eso esta lista es obligatoria.

| ID | Nombre | Oferta | Era |
|----|--------|--------|-----|
| generator | Generador | +4 · consume fuel si activo | 1–2 |
| solar | Placas | +3 · sin fuel | 2–3 |

**CURSOR: PROPUESTA / DUDA**  
¿Las atalayas ganan bonus nocturno con energía?  
- **Recomendación Cursor: NO en v1.** Torres ya tienen workers+ammo. Añadir energía diluye el mensaje “energía = edificios avanzados”.  
- Alternativa: sí, +defensa menor de noche (más simulación, más UI).

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
| Clínica lenta sin potencia | generador + techs energía |
| Fuel se va en generador | `solar_array` / `fuel_discipline` |

Desbloqueo por **era** solo como *techo máximo*, nunca como única causa. La causa es el problema + infra (taller/banco) + días de research.

---

# 9. CONSTRUCCIÓN

## 9.1 Flujo

1. Construir → lista filtrada por era/tech/requisitos  
2. Ver coste / beneficio / puestos  
3. Elegir → modo colocación  
4. Preview fantasma en parcelas válidas **solo mientras construyes**  
5. Confirmar → paga recursos → edificio aparece  

## 9.2 D1 disponible

HQ (ya), shelter, farm, well, barricade (opcional), storage (si recursos).

## 9.3 Reglas

- Grid interno invisible; visual orgánico  
- Sin Tetris: footprint 1×1 o 2×1 máximo habitual  
- Workers de construcción: al menos 1 idle/build labor  
- Upgrade HQ in-place  
- Mover edificios: no en v1 (evita edge cases); reconstruir  

## 9.4 Libertad

El jugador ordena la colonia; el sistema solo exige adyacencia razonable al cluster (radio de colocación).

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

---

# 11. CLIMA Y ESTACIONES

**CHATGPT: REVISAR COMO CADENA, NO COMO EVENTO AISLADO.** El clima debe provocar decisiones previas y conectar con vivienda, agua/comida, salud, exploración y —solo si tiene sentido— energía/combustible. Mantener el patrón aviso → preparación → consecuencia, pero concretar qué acciones reales permite cada aviso.

### CURSOR: RESPUESTA — clima = arco de decisiones (decisión 2.3)

**Aceptada.** El clima no es “flavor del día”: es un **arco** (ver también cadena §4).

#### Por tipo de aviso → acciones concretas

| Aviso | Acciones útiles | Sistemas tocados | Consecuencia si ignoras |
|-------|-----------------|------------------|-------------------------|
| Ola de frío / blizzard | viviendas↑prot, fuel, stock food, exploradores a casa, camas médicas | vivienda, fuel, comida, exploradores, salud | enfermos, consumo↑, muertes extremas |
| Ola de calor | stock agua, cisterna, sombra/prot≥1, menos expediciones pesadas | agua, cisterna, salud | sed, enfermos, productividad↓ |
| Tormenta | no enviar exploradores, reforzar (opcional), stock | exploración, accidentes | heridos, builds retrasados |
| Sequía (si existe) | cisternas llenas, más pozos, racionar | pozo/cisterna, comida (riego abstracto leve) | agua crítica |
| Lluvia fuerte | cisterna recoge; farms leve− | cisterna, food | — mayormente oportunidad |

**Energía:** solo si un edificio avanzado (clínica) debe seguir a pleno en crisis; no para “pagar el clima”.  
**Combustible:** calefacción de déficit + vehículos (tradeoff explícito).

#### Feedback de aviso (ejemplo)
> “Ola de frío en 3 días. Cobertura 18/27. Puedes: construir vivienda aislada, acumular fuel, o retirar exploradores.”

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
2. **Preparación:** construir aisladas, stock food/water/fuel, no enviar exploradores lejos  
3. **Consecuencia:** si déficit → enfermos, consumo↑, muertes solo si déficit grave y prolongado  

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
- Estados: unknown · discovered · hostile · controlled · (contested opcional)  

## 16.2 Visual

Ciudad abandonada, no GIS. Landmarks con arte. Colonia integrada en terreno.

## 16.3 Beneficio de control

No “pintar verde”: reduce amenaza local, revela vecinos, bonus defensa/perímetro, acceso a loot residual menor, misiones de consolidación.

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

**CURSOR: PROPUESTA / DUDA**  
Árbol objetivo 28 techs (Apéndice A) vs 20 en JSON:  
- **Recomendación:** adoptar Apéndice A como canónico; migrar JSON en ZZ-081; no implementar techs stub “para rellenar”.  
- Alternativa: quedarse en 20 pero **todas** con efecto real (menos fantasía, más foco). Cursor prefiere **menos techs pero todas deseables** si Neni quiere ritmo más corto; si quiere arco 100+ días, 28 bien cableadas.

## 18.1 Ramas (6)

1. Supervivencia  
2. Construcción  
3. Defensa  
4. Medicina  
5. Energía  
6. Exploración / Logística  

(~4–5 techs/rama ≈ **24–28 tecnologías**; priorizar cablear efectos).

## 18.2 Reglas

- 1 research activa  
- Requiere banco técnico (luego lab acelera)  
- Días + posibles costes recurso  
- Cada tech: coste, req, beneficio **aplicado en sim**, unlock  

## 18.3 Ejemplos de deseo

“Quiero aislamiento térmico antes del invierno.”  
“Quiero bahía de vehículos para el almacén lejano.”

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

---

# 21. OBJETIVOS, ALERTAS Y AYUDA

## 21.1 Capas (prioridad)

1. Modal decisión / brief diario  
2. Alerta crítica (comida 0, ataque inminente)  
3. Objetivo contextual (1)  
4. Coach tutorial (solo mecánicas nuevas)  
5. Tips discreto  

## 21.2 Ejemplos de alertas

- “Comida para 2 días”  
- “Frío en 3 días — cobertura 18/27”  
- “Explorador herido 3 días”  
- “Movimiento infectado al norte”  
- “Podrías construir enfermería”  

No mandar: orientar.

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
10 / 25 edificios; HQ L3; red energética.

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
| 3 | Consolidar | energía, hordas, logística | solar, bunker, facciones ligeras |
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
| 1ª estación dura avisada | Frío/calor en Y días | Alerta cobertura X/N | Quiere casas aisladas / cisterna / fuel | clima como arco | victoria |
| heridos acumulados | Cola de curación | “camas X/Y” | Quiere enfermería | sanidad | — |
| rutas lejos / fuel | A pie es lento/arriesgado | Garage/tech | Quiere vehículo | vehículos | — |
| clínica/lab offline | Edificios avanzados flojos | “sin energía” | Quiere generador/solar | energía | — |
| amenaza alta mid | Oleadas | Aviso amenaza | Quiere torres/ammo/búnker | hordas escaladas | — |
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
- food/water sostenibles  
- clínica/hospital  
- energía estable  
- defensa avanzada  
- sobrevivir **crisis final adaptativa** (variantes por semilla)  

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

Dock: Construir · Avanzar día · Más.  
Móvil: bottom sheets. Desktop: panel lateral.  
Prohibido: pestañas Mapa|Base|Gente|Más.

## 31.2 Interacción

Tocar edificio / landmark / explorador / alerta.  
Cámara: centrada en colonia early; límites; Recentrar.

## 31.3 Brief diario

Ritual: comida/agua producida·consumida·balance + hechos del día.

## 31.4 Tutorial

Una acción → una explicación. Sin cascadas de Continuar.

---

# 32. FEEDBACK

| Acción | Feedback |
|--------|----------|
| Construir | aparece en mapa + toast + log |
| Staff | producción preview en ficha |
| Avanzar día | brief |
| Explorar | ruta + estado away |
| Retorno | card resultado |
| Herida/muerte | card + rail explorador |
| Ataque | card + daños visibles |
| Tech | toast + unlock lista |
| Era | banner |
| Logro | badge discreto |
| Victoria | pantalla ritual |

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

→ Drive: `ZONA_ZERO_IMPLEMENTATION_PLAN.md`  
→ Repo: `docs/IMPLEMENTATION_PLAN.md`

Ejecución y revisiones fase a fase:

→ Drive: `ZONA_ZERO_DEVELOPMENT_LOG.md`  
→ Repo: `docs/DEVELOPMENT_LOG.md`

Resumen: construcción por **bloques con HUMAN_GATE**; primero experiencia D1 visual; luego sistemas capa a capa; **nunca “MVP rápido”** que salte esta biblia. Gobernanza completa en §41.

---

# 38. CHANGELOG DE DISEÑO

## 2.3 (2026-08-15) — ronda notas CHATGPT → respuestas CURSOR
- Cadena climática vivienda→aviso→fuel→salud cerrada (§4, §11).
- Pozo = fuente; cisterna = reserva/soft-cap/lluvia (§7.3).
- Energía = capacidad para edificios avanzados; calefacción ≠ electricidad (§7.8).
- Mejoras de colonia = research; taller no es menú paralelo (§8).
- Curva por causalidad problema→info→deseo; días solo brújula (§24).
- Test de deseo por tech; limpieza unlocks huérfanos (§18).
- Notas `CURSOR: PROPUESTA / DUDA` pendientes de Neni/ChatGPT.

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
- **Descripción:** Centro médico completo. Genera medicinas y cura avanzada.
- **Coste:** metal: 8, wood: 5, medicine: 3, fuel: 1
- **Tamaño:** 2×1 · **max:** 2
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
- **Descripción:** Escucha señales y contacta supervivientes. Apoyo a exploración.
- **Coste:** metal: 5, wood: 2, fuel: 1
- **Tamaño:** 1×1 · **max:** 2
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
| wall / power_hub | Referenciados por research legado; **no** en buildings — crear o quitar unlock |
| insulated_house | **AÑADIR** (no existe aún en JSON) |
| block_reinforced | Mejora opcional era 3 |
| pieces/tools | **Eliminar** como inventario |

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
    "needEnergy": true,
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
- Energía (generador/solar).
- Búnker / doctrina perímetro.
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
- **Función:** HQ, vivienda 6, defensa pasiva, único.
- **Coste:** gratis (inicio).
- **Tamaño:** 2×2.
- **Construcción:** ya colocado.
- **Workers:** 1 (coordinación).
- **Era:** 0.
- **Mejoras:** → L2 → L3 in-place.
- **Clima protección:** 1.
- **Visual:** edificio ancla reconocible, escala protagonista D1.
- **Problema:** “¿dónde está mi colonia?”

### Refugio Central II / III
- Ver costes JSON G.1; aumentan housing/defensa/jobs; L3 camino a mando regional.

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
Contrato común para productivos (farm, well, greenhouse, cistern, sawmill, scrapyard, workshop, kitchen, mech_shop, storage, medkit, infirmary, clinic, barricade, fence, watchtower, armory, bunker, radio, expedition_center, garage, generator, solar, tech_bench, lab):
1. Sin workers → producción 0 (si aplica).
2. Staff en ficha del edificio (modelo único §10).
3. Soft-cap stock vía almacenes.
4. Daño en ataques → HP/eficiencia ↓ hasta reparar (abstracto o rebuild).
5. Baseline numérico = G.1 hasta calibración.

**Fuera del catálogo activo v1:** `command` (fusionado HQ), `wall`/`power_hub` huérfanos hasta decisión explícita.

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
`ach_first_research`, `ach_branch_complete`, `ach_generator`, `ach_solar`, `ach_first_vehicle`, `ach_van_route`

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

## Energía (4)
20. `basic_generator` — Generación básica — — — 4d — fuel/metal — unlock generator eficiencia  
21. `fuel_discipline` — Disciplina de fuel — basic_generator — 4d — — −consumo fuel  
22. `solar_array` — Captación solar — basic_generator — 6d — — unlock/bonus solar  
23. `power_grid` — Red eléctrica — solar_array — 7d — — demanda edificios cubierta / estabilidad+  

## Exploración / Logística (5)
24. `scouting` — Exploración sistemática — — — 3d — — −riesgo leve / +info loot  
25. `pack_tactics` — Carga eficiente — scouting — 4d — — +cargo  
26. `bike_tech` — Movilidad ligera — — — 3d — — unlock bike  
27. `vehicle_bay` — Bahía de vehículos — bike_tech + garage — 6d — — unlock car  
28. `convoy` — Convoy — vehicle_bay — 7d — — unlock van + cargo  

**Total tecnologías definidas: 28.**

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
49. Generador online  
50. Solar online  
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
| generator | 8 | 14 | fuel 2 | — |

Producción base (a plena plantilla): farm food 5, well water 5, etc. (ajustar en balance).

---

# APÉNDICE E — ESTADOS DEL SAVE (CONTRATO)

Campos nuevos previstos (migración v5+):
- `season`, `seasonDay`, `weather`, `weatherUntil`  
- `missions[]`, `missionCooldowns`  
- `achievementsUnlocked[]`  
- `housingClimateCoverage` (cache)  
- `flags` memoria narrativa  
- `laborModel: "per_building"`  

Compat: migrar saves 1.3 → 2.x con defaults seguros.

---

# APÉNDICE F — MATRIZ DE APROBACIÓN HUMANA (HUMAN_GATE)

La aprobación formal vive en DEVELOPMENT_LOG. Equivalencia de hitos:

| Hito | Fase(s) | Requiere APROBADA + SÍ |
|------|---------|-------------------------|
| Biblia + plan | ZZ-001 | Sí (bloquea todo) |
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

Lista canónica actual (plan 2.1/2.2):  
`ZZ-001`, `ZZ-010`, `ZZ-012`, `ZZ-014`, `ZZ-015`, `ZZ-021`, `ZZ-023`, `ZZ-032`, `ZZ-045`, `ZZ-065`, `ZZ-073`, `ZZ-082`, `ZZ-106`, `ZZ-125`, `ZZ-133`, `ZZ-144`, `ZZ-150`, `ZZ-154`, `ZZ-161`, `ZZ-165`, `ZZ-173`, `ZZ-183`.

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

## 41.13 Tablero ronda de revisión diseño (ChatGPT ↔ Cursor)

| Nota CHATGPT | Estado Cursor | Pendiente humano |
|--------------|---------------|------------------|
| Cadena climática vivienda | **Aplicada** (§4) | Toggle calefacción vs automático |
| Pozo/cisterna | **Aplicada** (§7.3) | — |
| Cadena energética | **Aplicada** (§7.8) | ¿Energía en torres? (rec: NO) |
| Taller/mejoras duplicadas | **Aplicada** (§8) | — |
| Clima como cadena | **Aplicada** (§11) | — |
| Desbloqueos research | **Aplicada** (§18) | ¿28 techs o 20 densas? |
| Causalidad curva | **Aplicada** (§24) | — |
| *(Cursor propio)* Radio vs centro expediciones | **Propuesta** (§7.5) | A / B / C |

**ZZ-001 sigue NO aprobada** hasta que ChatGPT marque el GAME_MASTER tras esta ronda.

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


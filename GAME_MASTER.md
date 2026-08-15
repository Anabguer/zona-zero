# ZONA ZERO — GAME MASTER (BIBLIA DE DISEÑO DEFINITIVA)

**Versión de diseño:** 2.0 · **Contrato funcional**  
**Estado:** Diseño integral — **sin implementación autorizada** hasta revisión humana  
**Fecha:** 2026-08-15  
**Plataforma:** Web responsive (móvil + escritorio) · HTML/CSS/JS + PHP + MySQL  
**Repositorio:** `Anabguer/zona-zero`  
**URL objetivo:** `/juegos/zona-zero/`

> Esta orden de diseño **tiene prioridad** sobre `GAME_MASTER` 1.x, decisiones de chat y código existente cuando haya contradicción.  
> El código actual es **prototipo / motor parcial**; no define el juego definitivo.

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
37. Plan de implementación (resumen) → detalle en `docs/IMPLEMENTATION_PLAN.md`  
38. Changelog de diseño 2.0  
39. Auditoría del documento (pasadas 2 y 3)  
40. Decisiones que cambian o eliminan el diseño anterior  

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

## 4.3 Cobertura climática

```
plazasProtegidas = Σ (housing × f(protección, climaActual))
déficit = max(0, población − plazasProtegidasEfectivas)
```

Si hay déficit en ola de frío:
- aviso previo (ver §11)  
- luego: consumo↑, enfermedad↑, estabilidad↓, muertes solo en extremos y tras aviso  

## 4.4 Mantenimiento

Viviendas no consumen recursos diarios en v1 salvo clima extremo (combustible para calefacción colectiva si tech desbloqueada). Evitar micromanagement de “pagar alquiler”.

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

| ID | Nombre | Produce | Jobs | Era |
|----|--------|---------|------|-----|
| farm | Huerto | food | 3 | 0 |
| greenhouse | Invernadero | food↑, resistente clima | 3 | 1–2 |
| kitchen | Cocina | food bonus / reduce waste | 2 | 1 |
| well | Pozo | water | 2–3 | 0 |
| cistern | Cisterna | water↑ | 2 | 1 |

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

| ID | Nombre | Energía | Era |
|----|--------|---------|-----|
| generator | Generador | +4 · consume fuel | 1–2 |
| solar | Placas | +3 · sin fuel | 2–3 |

### 7.9 Investigación

| ID | Nombre | Función | Era |
|----|--------|---------|-----|
| tech_bench | Banco técnico | permite research | 1 |
| lab | Laboratorio | research + medicine | 2–3 |

### 7.10 Aspecto visual esperado

Cada tipo: asset WebP/SVG reconocible; estados dañado/ok; crecimiento de colonia por densidad de edificios + props, **sin polígonos GIS**.

---

# 8. MEJORAS DE COLONIA (TALLER)

No craft de objetos individuales.

El **Taller** (y luego mecánico/lab) desbloquea **mejoras globales** vía research + edificios:

| Mejora | Efecto |
|--------|--------|
| Carpintería básica | −coste build madera |
| Metalurgia | +metal / −coste metal |
| Aislamiento | unlock vivienda aislada |
| Protocolos de vigilancia | +defensa |
| Racionamiento | −consumo comida leve |
| Filtros de agua | +water / −enfermedad agua |
| Óptica de torres | +defensa / avisos amenaza |
| Bahía de vehículos | unlock coche/furgoneta |
| Red eléctrica | mejor fuelSave / estabilidad energía |

El taller **no** existe “porque survival”. Existe para: construir más barato, reparar vehículos (evento/acción abstracta), desbloquear defensas y techs de construcción.

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

| Momento | Enfoque | NO introducir aún |
|---------|---------|-------------------|
| D1 | colonia, food/water, construir, staff | amenaza, research, vehículos |
| D2–3 | brief, producción, primer landmark | hordas |
| D5 | exploración ida/vuelta | invierno duro |
| D10 | defensa básica, storage, era 1 cerca | facciones |
| D20 | research, radio, 2º explorador | crisis final |
| D30 | clima/estaciones, sanidad | victoria |
| D50 | vehículos, territorio amplio | — |
| D75 | energía, hordas, era 3 | — |
| D100+ | consolidación, cadena victoria | — |
| Endgame | crisis final variable → victoria → endless | — |

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

Detalle exhaustivo de fases/subfases, dependencias, tests y criterios de aceptación:

→ **`docs/IMPLEMENTATION_PLAN.md`**

Resumen: construcción por **bloques de aprobación humana**; primero experiencia D1 visual; luego sistemas capa a capa; nunca “MVP rápido” que salte diseño.

---

# 38. CHANGELOG DE DISEÑO 2.0

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

# APÉNDICE F — MATRIZ DE APROBACIÓN HUMANA

| Hito | Requiere “sí, continuar” |
|------|---------------------------|
| GAME_MASTER 2.0 | Sí (este doc) |
| D1 visual F10–F15 | Sí |
| D1–D5 loop | Sí |
| Estaciones+vivienda | Sí |
| Misiones+logros | Recomendado |
| Arte lote final | Sí |
| Release | Sí |

---

*Apéndices incluidos en la biblia 2.0.*

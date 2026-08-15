/**
 * Consolidate Ronda 2 Neni/ChatGPT decisions into GAME_MASTER 2.4
 * Then sync Drive + lightly patch IMPLEMENTATION_PLAN.
 */
import fs from "fs";

const repo = "GAME_MASTER.md";
const drive =
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_GAME_MASTER.md";
const planRepo = "docs/IMPLEMENTATION_PLAN.md";
const planDrive =
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_IMPLEMENTATION_PLAN.md";

let t = fs.readFileSync(repo, "utf8");

t = t.replace(
  /\*\*Versión de diseño:\*\* 2\.[0-9]/,
  "**Versión de diseño:** 2.4"
);

// ——— Replace outdated climate mitigation (fuel) block before Neni decision with consolidated wood system ———
t = t.replace(
  /#### Mitigación con combustible \(no barra de energía diaria\)[\s\S]*?\*\*CURSOR: PROPUESTA \/ DUDA \(Neni \+ ChatGPT\)\*\*[\s\S]*?Alternativa: automático puro \(más simple, menos control\)\.\n\n### CHATGPT: DECISIÓN NENI — calefacción con MADERA/,
  `#### Mitigación térmica v2.4 = MADERA automática (decisión Neni Ronda 2)

> Sustituye cualquier mención previa a fuel/toggle de calefacción.

Ver bloque **CHATGPT: DECISIÓN NENI** inmediatamente debajo — consolidado como canónico.

### CHATGPT: DECISIÓN NENI — calefacción con MADERA`
);

// After Neni heating decision, mark consolidated
t = t.replace(
  "**Pendiente Cursor:** recalcular §4, §5, §6, §11 y cualquier tabla que aún mencione fuel para calefacción. Fuel queda reservado a vehículos u otros usos que sobrevivan a la revisión.",
  `### CURSOR: CONSOLIDADO 2.4 — calefacción madera

**Aceptada y aplicada en toda la biblia.**

- Calefacción: **madera automática** según \`maderaNecesariaCalefacción(popExpuesta, protección, severidad)\`.
- Exposición al frío: acumulada \`exposiciónAlFrío\` verde→ámbar→rojo; enfermedad probabilística; muerte solo grave/prolongada + mala sanidad.
- Aviso previo con estimación de madera/día y días de reserva.
- **Fuel NO calienta.** Fuel = vehículos (+ reparaciones vehiculares si aplica).
- Mejor vivienda ⇒ menos madera/día. Tech \`efficient_heating\` / aislamiento reduce consumo.
- Sin toggle. Decisión indirecta: construir, stockear madera, o asumir riesgo.

**Conexiones:** vivienda §4 ↔ clima §11 ↔ madera §6 ↔ aserradero §7 ↔ salud §12 ↔ alertas §21.`
);

// Needs table
t = t.replace(
  `| Temperatura | ~D8+ / estación | vivienda aislada, fuel, tech | frío/calor: consumo, enfermos | “ola en Y días” |
| Salud | al haber heridos/enfermos | botiquín→enfermería→clínica | curación lenta → muertes | “camas médicas X/Y” |
| Seguridad | amenaza visible | defensa, territorio, torres | ataques peores | “amenaza alta” |
| Almacenamiento | soft-cap | almacenes | merma de exceso | “reservas se estropean” |
| Energía | era 1–2 | generador/solar | fuel↑, fallos eventos | “demanda > producción” |
| Estabilidad | siempre (oculto early) | necesidades cubiertas | productividad↓, inmigración↓ | “moral baja” |
| Combustible | con vehículos/generador | loot, eventos | sin vehículos lejanos | “fuel crítico” |`,
  `| Temperatura | ~D8+ / estación | vivienda + **madera** (calefacción auto) + tech | exposición↑ → enfermos | “ola en Y días · madera ~N/día” |
| Salud | heridos/enfermos/brotes | botiquín→enfermería→clínica + staff | curación lenta → crisis sanitaria | “camas X/Y” / “brote” |
| Seguridad | amenaza visible | defensa, territorio, torres | ataques peores | “amenaza alta” |
| Almacenamiento | soft-cap | almacenes / cisterna(agua) | merma de exceso | “reservas se estropean” |
| Estabilidad | siempre (oculto early) | necesidades cubiertas | productividad↓, inmigración↓ | “moral baja” |
| Combustible | con vehículos | loot, gasolinera, eventos | sin rutas lejanas / cargo | “fuel crítico” |
| ~~Energía eléctrica~~ | — | **ELIMINADA v1** | — | — |`
);

// Resources
t = t.replace(
  `| Madera | sawmill, loot, eventos | construcción, algo de calefacción | build |
| Metal | scrapyard, workshop, loot | construcción, defensas | build |
| Medicinas | med buildings, loot, farmacia | curación | salud |
| Combustible | loot, gasolinera, eventos | vehículos, generador | logística/energía |
| Munición | armería, loot, comisaría | defensa, expediciones hostiles | combate abstracto |

## 6.2 Secundarios

| Recurso | Tipo | Nota 2.0 |
|---------|------|----------|
| Energía | **capacidad** producida/demanda, no stack | HUD cuando exista generador |
| Piezas / tools | **eliminados como inventario** | Absorben en niveles de Taller |`,
  `| Madera | sawmill, loot, eventos | construcción + **calefacción automática en frío** + reparación | build / calor / repair |
| Metal | scrapyard, workshop, loot | construcción, defensas, reparación | build / repair |
| Medicinas | med buildings, loot, farmacia | curación + brotes | salud |
| Combustible | loot, gasolinera, eventos | **solo vehículos** (y repair vehicular) | logística |
| Munición | armería, loot, comisaría | defensa, expediciones hostiles | combate abstracto |

## 6.2 Secundarios

| Recurso | Tipo | Nota 2.4 |
|---------|------|----------|
| Energía eléctrica | **ELIMINADA de v1** | No generador/solar/barra |
| Piezas / tools | **eliminados** | Absorben en taller/research |`
);

// Building count + catalog energy section replacement
t = t.replace(
  "**Conteo diseño 2.0:** 28 edificios activos (+ 3 upgrades HQ = 30 entradas). Eliminados o fusionados vs JSON legado: radio como edificio opcional ligero; `command` fusionable con HQ L2+; no `wall`/`power_hub` huérfanos.",
  "**Conteo diseño 2.4:** ~26 edificios activos (+ upgrades HQ). **Eliminados v1:** `generator`, `solar`, `command` (→HQ), `wall`/`power_hub`. Radio + centro de expediciones **mantenidos** (roles distintos)."
);

// Replace entire 7.8 energy section through CURSOR REVISAR IMPACTO with eliminated
t = t.replace(
  /### 7\.8 Energía\n\n\*\*CHATGPT: REVISAR CADENA ENERGÉTICA\.[\s\S]*?\*\*CURSOR: REVISAR IMPACTO\.\*\*[\s\S]*?Si alguna referencia es realmente imprescindible, márcala como `CURSOR: PROPUESTA \/ DUDA` y explica qué decisión jugable perderíamos\.\n\n### 7\.9 Investigación/,
  `### 7.8 Energía eléctrica — ELIMINADA DE v1

### CHATGPT: DECISIÓN NENI — ELIMINAR SISTEMA DE ELECTRICIDAD DE v1 (Ronda 2)
*(texto de decisión conservado arriba en historial de revisión; abajo = consolidación canónica)*

### CURSOR: CONSOLIDADO 2.4 — sin electricidad

**Aceptada la eliminación.** Tras auditoría de coherencia:

| Elemento | Destino v1 |
|----------|------------|
| \`energíaDisponible\` / demanda | **Eliminado** |
| \`generator\`, \`solar\` | **Fuera del catálogo** |
| \`power_grid\`, \`power_hub\`, techs energía | **Fuera del árbol** |
| Victoria \`needEnergy\` | **Eliminado** — sustituido por infra avanzada (clínica L2+/lab o HQ L3 + defensa) |
| Clínica / lab / armería / mech | Funcionan por **nivel edificio + workers + recursos + repair + research** |
| Atalayas | Workers + ammo + tech; **sin luz** |
| Fuel | **Vehículos** (y repair vehicular) |
| Calor | **Madera** |

**¿Qué decisión jugable perdemos?** El tradeoff “quemar fuel para clínica vs coche”.  
**¿Es grave?** No: el tradeoff divertido de fuel queda en **exploración lejana**; la clínica se gana con metal/workers/medicinas/tiempo. Menos barras = más claridad.

**CURSOR:** no propone recuperar electricidad en v1. Posible v2 opcional si Neni lo pide tras playtest.

### 7.9 Investigación`
);

// Fix workshop problem→tech map energy rows
t = t.replace(
  `| Expediciones cortas de carga | \`pack_tactics\` / bike |
| Clínica lenta sin potencia | generador + techs energía |
| Fuel se va en generador | \`solar_array\` / \`fuel_discipline\` |`,
  `| Expediciones cortas de carga | \`pack_tactics\` / bike |
| Clínica lenta / brotes | techs medicina + más staff sanitario |
| Edificios rotos post-ataque | \`rapid_repair\` / workers en reparación |
| Invierno caro en madera | \`insulation\` / \`efficient_heating\` |`
);

// Mark radio decision consolidated
t = t.replace(
  "Si en playtest uno de los dos no genera decisiones propias, fusionarlo; no conservar edificios por catálogo.\n\n### 7.6 Salud",
  `Si en playtest uno de los dos no genera decisiones propias, fusionarlo; no conservar edificios por catálogo.

### CURSOR: CONSOLIDADO 2.4 — Radio + Centro
**Aceptada opción A.** Roles canónicos arriba. Feedback obligatorio: radio → misiones/señales; centro → números visibles en ficha de expedición (riesgo/tiempo/slots).

### 7.6 Salud`
);

// Staffing + ambient - mark consolidated and expand visual section pointer
t = t.replace(
  "Zona Zero no puede sentirse como una captura estática.\n\n---\n\n# 11. CLIMA Y ESTACIONES",
  `Zona Zero no puede sentirse como una captura estática.

### CURSOR: CONSOLIDADO 2.4 — staffing + vida ambiental
**Aceptado.** Ver también **§32B Vida visual** (nuevo) para estados, movimiento y caps de render.

---

# 11. CLIMA Y ESTACIONES`
);

// Fix climate table fuel→wood
t = t.replace(
  `| Ola de frío / blizzard | viviendas↑prot, fuel, stock food, exploradores a casa, camas médicas | vivienda, fuel, comida, exploradores, salud | enfermos, consumo↑, muertes extremas |
| Ola de calor | stock agua, cisterna, sombra/prot≥1, menos expediciones pesadas | agua, cisterna, salud | sed, enfermos, productividad↓ |
| Tormenta | no enviar exploradores, reforzar (opcional), stock | exploración, accidentes | heridos, builds retrasados |
| Sequía (si existe) | cisternas llenas, más pozos, racionar | pozo/cisterna, comida (riego abstracto leve) | agua crítica |
| Lluvia fuerte | cisterna recoge; farms leve− | cisterna, food | — mayormente oportunidad |

**Energía:** solo si un edificio avanzado (clínica) debe seguir a pleno en crisis; no para “pagar el clima”.  
**Combustible:** calefacción de déficit + vehículos (tradeoff explícito).

#### Feedback de aviso (ejemplo)
> “Ola de frío en 3 días. Cobertura 18/27. Puedes: construir vivienda aislada, acumular fuel, o retirar exploradores.”`,
  `| Ola de frío / blizzard | viviendas↑prot, **stock madera**, stock food, exploradores a casa, camas médicas | vivienda, madera, comida, exploradores, salud | exposición↑, enfermos, muertes extremas |
| Ola de calor | stock agua, cisterna, sombra/prot≥1, menos expediciones pesadas | agua, cisterna, salud | sed, enfermos, productividad↓ |
| Tormenta | no enviar exploradores; prep reparación | exploración, HP edificios | heridos, daño edificios |
| Sequía (si existe) | cisternas llenas, más pozos, racionar | pozo/cisterna | agua crítica |
| Lluvia fuerte | cisterna recoge; farms leve− | cisterna, food | oportunidad de stock agua |

**Sin electricidad.** **Fuel** no entra en clima. **Madera** = calefacción.

#### Feedback de aviso (ejemplo)
> “Ola de frío en 3 días. Con tus viviendas: ~8 madera/día. Reserva: 4 días. Mejora casas o corta más madera.”`
);

t = t.replace(
  `2. **Preparación:** construir aisladas, stock food/water/fuel, no enviar exploradores lejos  
3. **Consecuencia:** si déficit → enfermos, consumo↑, muertes solo si déficit grave y prolongado`,
  `2. **Preparación:** construir aisladas, stock food/water/**madera**, no enviar exploradores lejos  
3. **Consecuencia:** si falta madera/cobertura → exposición↑ → enfermos probabilísticos; muertes solo grave/prolongado`
);

// Expand disease after ChatGPT note
t = t.replace(
  "**CURSOR: diseñar varios arquetipos de enfermedad/evento**, con parámetros y consecuencias diferentes, sin inventar una lista médica realista innecesaria. El objetivo es variedad jugable, no simulación epidemiológica.\n\n---\n\n# 13. DEFENSA Y ATAQUES",
  `**CURSOR: diseñar varios arquetipos de enfermedad/evento**, con parámetros y consecuencias diferentes, sin inventar una lista médica realista innecesaria. El objetivo es variedad jugable, no simulación epidemiológica.

### CURSOR: CONSOLIDADO 2.4 — sistema de brotes (diseño completo)

#### Para qué existe
Crear crisis sanitarias **imprevisibles pero justas**, que obliguen a reasignar workers ([−]/[+]) hacia enfermería y a gastar medicinas — sin simulación médica.

#### Modelo
- Estado agregado: \`sick\`, \`outbreakSeverity\` (0–3), \`outbreakType\`, \`daysInOutbreak\`.
- Cada día en riesgo: tirada ponderada \`P(nuevosCasos | factores)\` — **nunca** “día 15 = plaga”.
- Factores ↑ riesgo: pop alta, overflow vivienda, exposición frío/calor, agua baja, heridos sin tratar, estación, evento semilla.
- Factores ↓ riesgo: camas libres, medicinas, staff sanitario, techs medicina, estabilidad, post-protección Director.

#### Fases de un brote
1. **Germen** — 1–3 enfermos; alerta suave.  
2. **Propagación** — casos/día aleatorios en rango; semáforo ámbar en figuras ambientales.  
3. **Pico** — presión máxima; estabilidad↓; prod↓ por enfermos.  
4. **Contención o crisis** — si camas+meds+staff suficientes → baja; si no → muertes + evento catástrofe sanitaria posible.  
5. **Recuperación** — cooldown familia enfermedad; Director baja presión.

#### Arquetipos (variedad, no catálogo médico)
| ID | Sensación | Empuja al jugador a… |
|----|-----------|----------------------|
| \`fever_wave\` | Fiebre general | más camas / meds |
| \`gut_bug\` | Agua/comida | filtros, cisterna, cocina |
| \`wound_infection\` | Tras ataque | curar heridos ya |
| \`winter_cough\` | Tras frío | madera + aislamiento + sanidad |
| \`mystery_radio\` | Señal + enfermos | misión + riesgo |

#### Decisión de staffing
Durante brote, ficha enfermería muestra preview: “+1 worker → −30% riesgo mañana (est.)”. Quitar del aserradero duele en invierno (madera).

#### Conexiones
Director §19/§25 ↔ clima §11 ↔ vivienda overcrowding ↔ medicinas ↔ research medicina ↔ vida visual §32B.

---

# 13. DEFENSA Y ATAQUES`
);

// Building damage consolidation
t = t.replace(
  "Cursor debe conectar esto con Taller/research sin crear un segundo minijuego de herramientas/piezas.\n\n---\n\n# 14. INFECTADOS Y AMENAZAS",
  `Cursor debe conectar esto con Taller/research sin crear un segundo minijuego de herramientas/piezas.

### CURSOR: CONSOLIDADO 2.4 — daño y reparación

**Aceptado y ampliado.**

#### Estados
\`ok → damaged → critical → destroyed\` (visual + numérico HP%).

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
- Tech \`rapid_repair\` / taller: −coste o −tiempo.
- Alerta “N edificios necesitan reparación” → al tocar, resalta afectados.

#### Perímetro
Mientras barricadas/torres aguantan, edificios interiores reciben menos daño. Horda que rompe perímetro empieza a morder producción/vivienda → decisión de recuperación.

---

# 14. INFECTADOS Y AMENAZAS`
);

// Research section - major replace from DECISIÓN NENI through 18.3
t = t.replace(
  /### CHATGPT: DECISIÓN NENI — número de tecnologías ORGÁNICO[\s\S]*?# 19\. EVENTOS/,
  `### CHATGPT: DECISIÓN NENI — número de tecnologías ORGÁNICO + investigación con trabajadores (Ronda 2)

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
| \`rationing\` | comida justa al crecer | banco | food+wood | 3 | −consumo comida ~8% | “aguantar más con lo mismo” |
| \`water_filters\` | agua enferma / merma | banco | metal+water | 3 | +eficiencia agua; −riesgo brote agua | “menos sed y menos plagas” |
| \`preservation\` | stock se pudre | rationing | metal+food | 4 | soft-cap food↑; merma↓ | “guardar para el invierno” |
| \`greenhouse_tech\` | frío mata huertos | water_filters+farm | wood+metal | 5 | unlock invernadero | “comida estable en invierno” |
| \`efficient_heating\` | madera se va en frío | insulation o house | wood | 4 | −consumo madera calefacción | “el invierno no me seca el aserradero” |

##### Construcción / Industria
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| \`basic_carpentry\` | builds caras en madera | banco+taller | wood | 3 | −coste wood builds | “crecer más barato” |
| \`metalwork\` | falta metal útil | carpentry+taller | metal+fuel? no: metal | 4 | +prod metal / −coste metal | “más torres y casas” |
| \`insulation\` | frío avisado, shelters malos | carpentry | wood+metal | 5 | unlock \`insulated_house\` | “quiero eso antes del frío” |
| \`advanced_housing\` | pop sin plazas buenas | insulation | wood+metal | 6 | unlock/mejora block | “densidad sin miseria” |
| \`reinforced_structures\` | hordas rompen builds | metalwork | metal | 6 | +HP edificios; −daño ataques | “que no me tumben el huerto” |
| \`rapid_repair\` | post-ataque lento | metalwork o taller | metal+wood | 5 | −coste/tiempo reparación | “recuperarme antes de la siguiente” |

##### Defensa
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| \`watch_protocols\` | amenaza sube | banco | wood+ammo | 3 | +def; mejor uso workers torre | “aguantar la noche” |
| \`ammo_craft\` | ammo se acaba | watch | metal+ammo | 4 | armería +eficiencia ammo | “no pelear a piedra” |
| \`tower_optics\` | ataques sorpresa | watch | metal | 5 | +def; avisos amenaza mejores | “verlos venir” |
| \`fortify\` | perímetro flojo | ammo_craft+optics | wood+metal | 6 | +def; barricadas más efectivas (no unlock si ya buildable) | “que no entren” |
| \`perimeter_doctrine\` | zonas fronterizas caen | fortify | — | 7 | territorio controlado reduce intensidad ataque | “el mapa me protege” |

##### Medicina
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| \`field_medicine\` | heridos lentos | banco | medicine | 4 | +curación | “volver a tener manos” |
| \`triage\` | camas saturadas | field_medicine | — | 4 | +camas efectivas | “cabemos más enfermos” |
| \`antibiotics_protocol\` | brotes se disparan | triage | medicine | 6 | −spread brote | “contener la plaga” |
| \`quarantine_drill\` | crisis sanitaria | antibiotics | wood | 5 | opcional: −prod leve a cambio de −spread fuerte (decisión) | “aislar para salvar” |
| \`field_surgery\` | explorador herido días | triage | medicine | 6 | −1 día wounded explorador | “no perder al bueno” |
| \`public_health\` | camino victoria / clínica | antibiotics+clinic | — | 7 | unlock path clínica avanzada / bonus estabilidad sanidad | “colonia sana = victoria” |

##### Exploración / Logística
| ID | Problema | Req | Coste | Días | Efecto | Deseo |
|----|----------|-----|-------|------|--------|-------|
| \`scouting\` | mapa a ciegas | banco | food+wood | 3 | −riesgo leve; +info loot | “menos sorpresas malas” |
| \`pack_tactics\` | vuelvo con poco | scouting | wood+metal | 4 | +cargo | “cada viaje cuenta” |
| \`bike_tech\` | a pie es lento | scouting | metal+wood | 3 | unlock bike | “más lejos sin fuel” |
| \`vehicle_bay\` | rutas largas | bike+garage | metal+fuel | 6 | unlock car | “el almacén lejano” |
| \`convoy\` | necesito mucho loot | vehicle_bay | metal+fuel | 7 | unlock van + cargo | “una furgoneta llena” |

**Total actual árbol 2.4: 26 techs** (orgánico; se puede añadir/quitar en playtest sin “rellenar cuota”).

**Eliminadas por electricidad / stubs:** \`basic_generator\`, \`solar_array\`, \`power_grid\`, \`fuel_discipline\` (como tech de generador), unlocks \`wall\`/\`power_hub\`.

## 18.2 Reglas (resumen)
- 1 research activa · staffing en banco/lab · efectos reales obligatorios · \`minEra\` solo techo.

## 18.3 Deseo
“Aislamiento antes del invierno.” · “Antibióticos porque hay brote.” · “Reparación rápida tras la horda.” · “Coche para la gasolinera lejana.”

---

# 19. EVENTOS`
);

// Events Neni decision mark
t = t.replace(
  "Los pesos deben cambiar según contexto: una colonia sin medicina hace más probable que un brote pequeño sea peligroso; una colonia muy fuerte puede recibir amenazas más exigentes; tras una catástrofe grave el Director baja presión temporalmente.\n\n---\n\n# 20. MISIONES",
  `Los pesos deben cambiar según contexto: una colonia sin medicina hace más probable que un brote pequeño sea peligroso; una colonia muy fuerte puede recibir amenazas más exigentes; tras una catástrofe grave el Director baja presión temporalmente.

### CURSOR: CONSOLIDADO 2.4 — Director sin cadencia fija
**Aceptado.** Quiet nights, cooldowns, pesos contextuales, antirrepetición. Avisos de clima ≠ guion memorizable.

---

# 20. MISIONES`
);

// Missions variety expansion
t = t.replace(
  "Cursor debe diseñar el sistema de plantillas/modificadores para producir decenas de resultados posibles sin escribir miles de escenas manuales inconexas.\n\n---\n\n# 21. OBJETIVOS, ALERTAS Y AYUDA",
  `Cursor debe diseñar el sistema de plantillas/modificadores para producir decenas de resultados posibles sin escribir miles de escenas manuales inconexas.

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

\`\`\`
landmarkType × placeState × encounter × playerChoice × outcome × aftermath
\`\`\`

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

Radio alimenta misiones; Centro de expediciones mejora lectura de \`placeState\`/riesgo antes de salir.

---

# 21. OBJETIVOS, ALERTAS Y AYUDA`
);

// Fix alerts example
t = t.replace(
  `- “Frío en 3 días — cobertura 18/27”`,
  `- “Frío en 3 días — ~8 madera/día · reserva 4 días”`
);

// Achievements / eras / victory / curve fixes
t = t.replace(
  "10 / 25 edificios; HQ L3; red energética.",
  "10 / 25 edificios; HQ L3; clínica operativa."
);
t = t.replace(
  "| 3 | Consolidar | energía, hordas, logística | solar, bunker, facciones ligeras |",
  "| 3 | Consolidar | hordas, logística, reparación | bunker, vehículos, facciones ligeras |"
);
t = t.replace(
  `| 1ª estación dura avisada | Frío/calor en Y días | Alerta cobertura X/N | Quiere casas aisladas / cisterna / fuel | clima como arco | victoria |
| heridos acumulados | Cola de curación | “camas X/Y” | Quiere enfermería | sanidad | — |
| rutas lejos / fuel | A pie es lento/arriesgado | Garage/tech | Quiere vehículo | vehículos | — |
| clínica/lab offline | Edificios avanzados flojos | “sin energía” | Quiere generador/solar | energía | — |
| amenaza alta mid | Oleadas | Aviso amenaza | Quiere torres/ammo/búnker | hordas escaladas | — |`,
  `| 1ª estación dura avisada | Frío/calor en Y días | Alerta madera/día + cobertura | Quiere casas aisladas / cisterna / madera | clima como arco | victoria |
| heridos o brote | Cola sanitaria | “camas X/Y” / brote | Quiere enfermería + staff | sanidad | — |
| rutas lejos | A pie lento | Garage/tech | Quiere vehículo (fuel) | vehículos | — |
| post-ataque | Edificios dañados | “N por reparar” | Quiere repair + fortify | daño/reparación | — |
| amenaza alta mid | Oleadas | Aviso amenaza | Quiere torres/ammo/búnker | hordas | — |`
);

t = t.replace(
  `Requisitos conceptuales (todos):
- territorio significativo controlado  
- población estable elevada  
- food/water sostenibles  
- clínica/hospital  
- energía estable  
- defensa avanzada  
- sobrevivir **crisis final adaptativa** (variantes por semilla)`,
  `Requisitos conceptuales (todos):
- territorio significativo controlado  
- población estable elevada  
- food/water sostenibles (producción + reservas)  
- clínica / hospital menor operativo  
- defensa avanzada (perímetro + ammo path)  
- infraestructura de recuperación (capacidad de reparación / HQ alto)  
- sobrevivir **crisis final adaptativa** (variantes por semilla)  

**Sin requisito de electricidad.**`
);

// Insert §32B before sonido or after feedback - find # 32. FEEDBACK end
t = t.replace(
  /# 32\. FEEDBACK\n\n\| Acción \| Feedback \|[\s\S]*?\| Victoria \| pantalla ritual \|\n\n---\n\n# 33\. ARTE/,
  `# 32. FEEDBACK

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

# 33. ARTE`
);

// Changelog 2.4
t = t.replace(
  /## 2\.3 \(2026-08-15\) — ronda notas CHATGPT → respuestas CURSOR[\s\S]*?## 2\.2 \(2026-08-15\)/,
  `## 2.4 (2026-08-15) — consolidación Ronda 2 (Neni)
- Calefacción = **madera automática** + exposición progresiva (no fuel, no toggle).
- **Electricidad eliminada** de v1 (generator/solar/barra/rama Energía/victoria needEnergy).
- Fuel ≈ vehículos.
- Research: staffing en banco/lab; árbol **26 techs** por utilidad (sin cuota 20/28).
- Radio + Centro expediciones mantenidos (roles A).
- Brotes probabilísticos + fases; daño/reparación visible; vida ambiental documentada.
- Misiones/expediciones: motor plantillas placeState×encuentro×decisión×secuela.
- Director: sin cadencia fija.

## 2.3 (2026-08-15) — ronda notas CHATGPT → respuestas CURSOR
- (histórico) cadenas clima/agua/energía propuestas; supersedidas parcialmente por 2.4.

## 2.2 (2026-08-15)`
);

// Fix appendix board and energy leftovers in appendix A header - replace Energy section
t = t.replace(
  /## Energía \(4\)\n[\s\S]*?## Exploración \/ Logística \(5\)/,
  `## Energía
**ELIMINADA v1** — no techs de generador/solar/power_grid.

## Exploración / Logística (5)`
);

t = t.replace(
  "**Total tecnologías definidas: 28.**",
  "**Total tecnologías canónicas 2.4: ver §18 (~26). Apéndice A histórico parcialmente superseded.**"
);

t = t.replace(
  `\`ach_first_research\`, \`ach_branch_complete\`, \`ach_generator\`, \`ach_solar\`, \`ach_first_vehicle\`, \`ach_van_route\``,
  `\`ach_first_research\`, \`ach_branch_complete\`, \`ach_first_vehicle\`, \`ach_van_route\`, \`ach_winter_wood\`, \`ach_outbreak_contained\``
);

t = t.replace(
  `49. Generador online  
50. Solar online  
51. Primer vehículo  
52. Furgoneta en ruta`,
  `49. Invierno con madera suficiente  
50. Brote contenido  
51. Primer vehículo  
52. Furgoneta en ruta`
);

// Update 41.13 board
t = t.replace(
  /## 41\.13 Tablero ronda de revisión diseño \(ChatGPT ↔ Cursor\)[\s\S]*?\*\*ZZ-001 sigue NO aprobada\*\*[^\n]*/,
  `## 41.13 Tablero revisión diseño

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

**CURSOR: PROPUESTA / DUDA restantes (menores):**
1. ¿\`quarantine_drill\` como tech con tradeoff −prod? (rec: sí, opcional).  
2. ¿HQ L2/L3 debe seguir costando fuel o solo wood/metal? (rec: quitar fuel del coste HQ; fuel solo vehículos).

**ZZ-001 sigue NO aprobada** hasta que ChatGPT marque el GAME_MASTER tras consolidación 2.4.`
);

// Fix G.2 decisions table
t = t.replace(
  `| wall / power_hub | Referenciados por research legado; **no** en buildings — crear o quitar unlock |
| insulated_house | **AÑADIR** (no existe aún en JSON) |
| block_reinforced | Mejora opcional era 3 |
| pieces/tools | **Eliminar** como inventario |`,
  `| wall / power_hub / generator / solar | **Eliminados v1** |
| insulated_house | **AÑADIR** |
| block_reinforced | Mejora opcional era 3 |
| pieces/tools / energía | **Eliminados** |`
);

t = t.replace(
  "**Fuera del catálogo activo v1:** `command` (fusionado HQ), `wall`/`power_hub` huérfanos hasta decisión explícita.",
  "**Fuera del catálogo activo v1:** `command`, `generator`, `solar`, `wall`, `power_hub`."
);

t = t.replace(
  "Contrato común para productivos (farm, well, greenhouse, cistern, sawmill, scrapyard, workshop, kitchen, mech_shop, storage, medkit, infirmary, clinic, barricade, fence, watchtower, armory, bunker, radio, expedition_center, garage, generator, solar, tech_bench, lab):",
  "Contrato común para productivos (farm, well, greenhouse, cistern, sawmill, scrapyard, workshop, kitchen, mech_shop, storage, medkit, infirmary, clinic, barricade, fence, watchtower, armory, bunker, radio, expedition_center, garage, tech_bench, lab):"
);

// Victory path H.9 energy line
t = t.replace(
  `- Energía (generador/solar).
- Búnker / doctrina perímetro.`,
  `- Búnker / doctrina perímetro / reparación post-crisis.`
);

t = t.replace(
  '- Energía (generador/solar).',
  '- (Electricidad eliminada v1).'
);

// needEnergy in balance dump
t = t.replace(/"needEnergy": true,?\n?/, "");

// Old CURSOR response energy contradiction in §4 - fix remaining fuel heating lines in chain
t = t.replace(
  "**Energía eléctrica** (§7.8) **no** es requisito de calefacción v1: evita tres sistemas para lo mismo. La energía sirve a edificios avanzados; el frío se pelea con **vivienda + fuel**.",
  "**Sin electricidad.** El frío se pelea con **vivienda + madera** (2.4)."
);
t = t.replace(
  `| Fuel como parche | Tradeoff vs vehículos/generador | O solo vivienda o solo muerte |`,
  `| Madera calefacción | Tradeoff vs builds/repair | O solo vivienda o exposición |`
);
t = t.replace(
  /- Acumular combustible \\| Mitigar déficit de cobertura \\(ver abajo\\)/,
  "- Acumular **madera** | Cubrir calefacción automática"
);

// Fix table row that still says combustible for heating prep
t = t.replace(
  `| Acumular combustible | Mitigar déficit de cobertura (ver abajo) |`,
  `| Acumular **madera** | Cubrir \`maderaNecesariaCalefacción\` |`
);

fs.writeFileSync(repo, t);
fs.mkdirSync("G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER", { recursive: true });
fs.copyFileSync(repo, drive);

// Patch implementation plan - mark energy phases obsolete
let plan = fs.readFileSync(planRepo, "utf8");
if (!plan.includes("ERRATA 2.4")) {
  plan =
    `> **ERRATA 2.4 (obligatoria):** Electricidad eliminada de v1. Fases/techs/edificios \`generator\`/\`solar\`/\`power_*\`/\`needEnergy\` quedan **INVALIDADAS o a reescribir** como reparación/clínica/HQ. Calefacción = madera. Research = workers en banco/lab. Brotes/daño/vida visual/misiones plantilla = nuevos requisitos de diseño antes de implementar.\n\n` +
    plan;
  plan = plan.replace(
    /### ZZ-160[^\n]*/g,
    (m) => m + " *(revisar: sin solar assets obligatorios)*"
  );
}
fs.writeFileSync(planRepo, plan);
fs.copyFileSync(planRepo, planDrive);

const checks = {
  fuelCalef: (t.match(/fuel de calefacción|calefacción.*fuel|fuel.*calef/gi) || [])
    .length,
  energyBar: (t.match(/energíaDisponible|needEnergy/g) || []).length,
  genSolarCatalog: (t.match(/\| generator \|/g) || []).length,
  woodHeat: (t.match(/maderaNecesariaCalefacción|calefacción con MADERA/g) || [])
    .length,
  consolidated: (t.match(/CURSOR: CONSOLIDADO 2\.4/g) || []).length,
  bytes: Buffer.byteLength(t),
};
console.log(JSON.stringify(checks, null, 2));

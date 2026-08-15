/**
 * Review round: respond to CHATGPT: notes in GAME_MASTER, apply design, sync Drive.
 */
import fs from "fs";

const repo = "GAME_MASTER.md";
const drive =
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_GAME_MASTER.md";

let t = fs.readFileSync(repo, "utf8");

// Version bump
t = t.replace(
  "**Versión de diseño:** 2.2 · **BIBLIA ÚNICA DEL PROYECTO** (diseño + forma de trabajar)",
  "**Versión de diseño:** 2.3 · **BIBLIA ÚNICA DEL PROYECTO** (diseño + forma de trabajar · ronda revisión ChatGPT↔Cursor)"
);

// ——— NOTE 1: climate housing chain ———
t = t.replace(
  `**CHATGPT: REVISAR.** La protección climática no debe quedarse en un multiplicador abstracto. Hay que cerrar la cadena vivienda → temperatura → combustible/energía → salud, y decidir exactamente qué prepara el jugador antes de frío/calor. No implementar hasta resolver esa relación.

## 4.3 Cobertura climática

\`\`\`
plazasProtegidas = Σ (housing × f(protección, climaActual))
déficit = max(0, población − plazasProtegidasEfectivas)
\`\`\`

Si hay déficit en ola de frío:
- aviso previo (ver §11)  
- luego: consumo↑, enfermedad↑, estabilidad↓, muertes solo en extremos y tras aviso  

## 4.4 Mantenimiento

Viviendas no consumen recursos diarios en v1 salvo clima extremo (combustible para calefacción colectiva si tech desbloqueada). Evitar micromanagement de “pagar alquiler”.`,
  `**CHATGPT: REVISAR.** La protección climática no debe quedarse en un multiplicador abstracto. Hay que cerrar la cadena vivienda → temperatura → combustible/energía → salud, y decidir exactamente qué prepara el jugador antes de frío/calor. No implementar hasta resolver esa relación.

### CURSOR: RESPUESTA — cadena climática CERRADA (decisión de diseño 2.3)

**Aceptada la crítica.** La protección no es un multiplicador mágico: es una **cadena causal** con decisiones previas.

#### Cadena canónica

\`\`\`
AVISO (1–3 días)
  → PREPARACIÓN (vivienda / fuel / stock / exploradores a casa / research si a tiempo)
  → CLIMA EXTREMO
  → cobertura térmica = f(plazas × nivel protección vs severidad)
  → déficit de plazas “a cubierto”
  → (opcional) MITIGACIÓN CON COMBUSTIBLE
  → efectos: consumo↑, enfermos↑, estabilidad↓
  → extremos prolongados: muertes
\`\`\`

#### Qué prepara el jugador (acciones reales, no abstractas)

| Acción | Para qué |
|--------|----------|
| Construir \`house\` / \`insulated_house\` / upgrade HQ | Subir plazas con protección ≥ umbral del clima |
| Acumular comida/agua | Aguantar consumo↑ durante la ola |
| Acumular combustible | Mitigar déficit de cobertura (ver abajo) |
| No enviar exploradores lejos | Evitar heridos/muertos por clima en ruta |
| Tener camas médicas libres | Absorber enfermos post-ola |
| Research \`insulation\` | Desbloquear vivienda aislada **antes** del primer invierno duro |

#### Cobertura (fórmula)

\`\`\`
plazasACubierto = Σ camas de edificios con protección ≥ umbral(clima)
déficit = max(0, población − plazasACubierto)
\`\`\`

Umbrales orientativos:
- frío leve / lluvia fría → protección ≥ 1 basta  
- ola de frío / blizzard → protección ≥ 2  
- calor extremo → protección ≥ 1 mitiga; ≥ 2 casi inmune (agua consumo sigue↑)

#### Mitigación con combustible (no barra de energía diaria)

Si \`déficit > 0\` durante clima extremo y hay **combustible**:
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
- Alternativa: automático puro (más simple, menos control).`
);

// ——— NOTE 2: well/cistern ———
t = t.replace(
  `**CHATGPT: REVISAR POZO/CISTERNA.** Ahora mismo corremos el riesgo de que la cisterna sea simplemente “el pozo mejor”. Separar funciones: el pozo debe ser **fuente/producción** de agua; la cisterna debe aportar **reserva, almacenamiento, seguridad ante cortes/sequía/variabilidad** (y, si encaja, recogida de lluvia), no limitarse a producir un número mayor. Revisar también cómo encaja con los soft-caps de agua.

| ID | Nombre | Produce | Jobs | Era |
|----|--------|---------|------|-----|
| farm | Huerto | food | 3 | 0 |
| greenhouse | Invernadero | food↑, resistente clima | 3 | 1–2 |
| kitchen | Cocina | food bonus / reduce waste | 2 | 1 |
| well | Pozo | water | 2–3 | 0 |
| cistern | Cisterna | water↑ | 2 | 1 |`,
  `**CHATGPT: REVISAR POZO/CISTERNA.** Ahora mismo corremos el riesgo de que la cisterna sea simplemente “el pozo mejor”. Separar funciones: el pozo debe ser **fuente/producción** de agua; la cisterna debe aportar **reserva, almacenamiento, seguridad ante cortes/sequía/variabilidad** (y, si encaja, recogida de lluvia), no limitarse a producir un número mayor. Revisar también cómo encaja con los soft-caps de agua.

### CURSOR: RESPUESTA — pozo ≠ cisterna (decisión 2.3)

**Aceptada.** Eran el mismo edificio con otro número; eso falla el test “¿para qué existe?”.

| Edificio | Rol | Produce/día | Soft-cap agua | Jobs | Clima |
|----------|-----|-------------|---------------|------|-------|
| **Pozo** \`well\` | **Fuente** | sí (agua) | no | 2–3 | en sequía/tormenta: producción↓ |
| **Cisterna** \`cistern\` | **Reserva / buffer** | **no** (o residual mínimo 0–1) | **sí** (+días de reserva agua) | 0–1 mantenimiento | lluvia: **recogida pasiva**; sequía: aguantas con stock |

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
| cistern | Cisterna | **reserva** agua + soft-cap + lluvia | 0–1 | 1 |`
);

// ——— NOTE 3: energy ———
t = t.replace(
  `**CHATGPT: REVISAR CADENA ENERGÉTICA.** Antes de mantener generador/solar hay que definir qué consume energía y qué problema concreto resuelven. Evitar una barra de energía decorativa. Conectar de forma comprensible con necesidades reales (p. ej. calefacción, clínica, instalaciones avanzadas), sin inventar consumos diarios solo para justificar edificios.

| ID | Nombre | Energía | Era |
|----|--------|---------|-----|
| generator | Generador | +4 · consume fuel | 1–2 |
| solar | Placas | +3 · sin fuel | 2–3 |`,
  `**CHATGPT: REVISAR CADENA ENERGÉTICA.** Antes de mantener generador/solar hay que definir qué consume energía y qué problema concreto resuelven. Evitar una barra de energía decorativa. Conectar de forma comprensible con necesidades reales (p. ej. calefacción, clínica, instalaciones avanzadas), sin inventar consumos diarios solo para justificar edificios.

### CURSOR: RESPUESTA — energía como CAPACIDAD de edificios avanzados (decisión 2.3)

**Aceptada la crítica.** Energía **no** es barra de supervivencia diaria ni justificación circular del generador.

#### Qué es
- Contador **capacidad** \`energíaDisponible\` vs \`energíaDemandada\` (no stack inventariable).  
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
- Alternativa: sí, +defensa menor de noche (más simulación, más UI).`
);

// ——— NOTE 4: workshop ———
t = t.replace(
  `**CHATGPT: REVISAR.** Cada mejora debe nacer de un problema que el jugador ya haya visto o pueda anticipar. No desbloquear mejoras únicamente porque toca una era. Comprobar que Taller, research y edificios no estén duplicando tres caminos para resolver lo mismo.

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

El taller **no** existe “porque survival”. Existe para: construir más barato, reparar vehículos (evento/acción abstracta), desbloquear defensas y techs de construcción.`,
  `**CHATGPT: REVISAR.** Cada mejora debe nacer de un problema que el jugador ya haya visto o pueda anticipar. No desbloquear mejoras únicamente porque toca una era. Comprobar que Taller, research y edificios no estén duplicando tres caminos para resolver lo mismo.

### CURSOR: RESPUESTA — un solo camino de “mejoras” = RESEARCH (decisión 2.3)

**Aceptada.** Había riesgo de tres sistemas paralelos (edificio / “mejoras de colonia” / tech) haciendo lo mismo.

#### Arquitectura clara (anti-duplicado)

| Capa | Qué hace | Qué NO hace |
|------|----------|-------------|
| **Edificio** | Capacidad física aquí y ahora (camas, prod, def, jobs) | No “investiga” por sí solo |
| **Research** | Única fuente de unlocks y bonos globales | No se coloca en el mapa |
| **Taller** \`workshop\` | (1) produce/refina metal; (2) **requisito** para ramas Construcción (y parte de logística); (3) flavor de colonia industrial | No tiene menú propio de mejoras aparte del research |
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
| Comida justa tras crecer | \`rationing\` / cocina |
| Agua enferma / poca | \`water_filters\` |
| Frío avisado, shelters malos | \`insulation\` → insulated_house |
| Builds caras en madera | \`basic_carpentry\` |
| Ataques / amenaza sube | \`watch_protocols\` / torres |
| Expediciones cortas de carga | \`pack_tactics\` / bike |
| Clínica lenta sin potencia | generador + techs energía |
| Fuel se va en generador | \`solar_array\` / \`fuel_discipline\` |

Desbloqueo por **era** solo como *techo máximo*, nunca como única causa. La causa es el problema + infra (taller/banco) + días de research.`
);

// ——— NOTE 5: climate as chain ———
t = t.replace(
  `**CHATGPT: REVISAR COMO CADENA, NO COMO EVENTO AISLADO.** El clima debe provocar decisiones previas y conectar con vivienda, agua/comida, salud, exploración y —solo si tiene sentido— energía/combustible. Mantener el patrón aviso → preparación → consecuencia, pero concretar qué acciones reales permite cada aviso.

## 11.1 Estaciones (ciclo)`,
  `**CHATGPT: REVISAR COMO CADENA, NO COMO EVENTO AISLADO.** El clima debe provocar decisiones previas y conectar con vivienda, agua/comida, salud, exploración y —solo si tiene sentido— energía/combustible. Mantener el patrón aviso → preparación → consecuencia, pero concretar qué acciones reales permite cada aviso.

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

## 11.1 Estaciones (ciclo)`
);

// ——— NOTE 6: research ———
t = t.replace(
  `**CHATGPT: REVISAR DESBLOQUEOS.** Una tecnología debe ser deseable porque resuelve o mejora una necesidad entendible. Revisar tech por tech para eliminar efectos ornamentales/stub y evitar “Era X = aparece botón nuevo” sin causa jugable.

## 18.1 Ramas (6)`,
  `**CHATGPT: REVISAR DESBLOQUEOS.** Una tecnología debe ser deseable porque resuelve o mejora una necesidad entendible. Revisar tech por tech para eliminar efectos ornamentales/stub y evitar “Era X = aparece botón nuevo” sin causa jugable.

### CURSOR: RESPUESTA — test de deseo por tech (decisión 2.3)

**Aceptada.** Toda tech del Apéndice A debe pasar:

1. ¿Qué problema ya sintió (o anticipa) el jugador?  
2. ¿Qué cambia en la partida de forma visible?  
3. ¿Duplica un edificio que ya resuelve lo mismo? Si sí → cortar efecto o cortar tech.  
4. ¿Es stub? → **prohibido** en diseño 2.3: o se cablea o se elimina del árbol.

**Regla de era:** \`minEra\` es **candado máximo**, no motor de deseo. El deseo nace del problema + aviso del Director/alertas (“Se acerca frío → insulation”).

**Limpieza vs JSON actual:** quitar unlocks a \`wall\` / \`power_hub\` inexistentes; \`fortify\` no “desbloquea barricade” si ya es buildable en era 0 — debe mejorar barricadas/defensa, no gatear el edificio.

**CURSOR: PROPUESTA / DUDA**  
Árbol objetivo 28 techs (Apéndice A) vs 20 en JSON:  
- **Recomendación:** adoptar Apéndice A como canónico; migrar JSON en ZZ-081; no implementar techs stub “para rellenar”.  
- Alternativa: quedarse en 20 pero **todas** con efecto real (menos fantasía, más foco). Cursor prefiere **menos techs pero todas deseables** si Neni quiere ritmo más corto; si quiere arco 100+ días, 28 bien cableadas.

## 18.1 Ramas (6)`
);

// ——— NOTE 7: curve causality ———
t = t.replace(
  `**CHATGPT: REVISAR CAUSALIDAD DE LA CURVA.** No basta con repartir sistemas por días. Para cada entrada hay que poder responder: qué problema ha aparecido, qué información recibió el jugador y por qué ahora desea ese sistema. Los días son orientación, no la causa del desbloqueo.

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
| Endgame | crisis final variable → victoria → endless | — |`,
  `**CHATGPT: REVISAR CAUSALIDAD DE LA CURVA.** No basta con repartir sistemas por días. Para cada entrada hay que poder responder: qué problema ha aparecido, qué información recibió el jugador y por qué ahora desea ese sistema. Los días son orientación, no la causa del desbloqueo.

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

**Regla:** si un sistema aparece **sin** problema previo ni info, es un error de diseño aunque el día “toque”.`
);

// Changelog 2.3 at section 38
t = t.replace(
  `## 2.2 (2026-08-15)
- Esta biblia incorpora **el flujo de trabajo Cursor ↔ ChatGPT** (§41–§42) como contrato, no como nota aparte.
- Tres maestros obligatorios: GAME_MASTER + IMPLEMENTATION_PLAN + DEVELOPMENT_LOG (Drive = GitHub).
- Aprobación solo literal (\`APROBADA\` + \`SÍ\`); HUMAN_GATE documentado.`,
  `## 2.3 (2026-08-15) — ronda notas CHATGPT → respuestas CURSOR
- Cadena climática vivienda→aviso→fuel→salud cerrada (§4, §11).
- Pozo = fuente; cisterna = reserva/soft-cap/lluvia (§7.3).
- Energía = capacidad para edificios avanzados; calefacción ≠ electricidad (§7.8).
- Mejoras de colonia = research; taller no es menú paralelo (§8).
- Curva por causalidad problema→info→deseo; días solo brújula (§24).
- Test de deseo por tech; limpieza unlocks huérfanos (§18).
- Notas \`CURSOR: PROPUESTA / DUDA\` pendientes de Neni/ChatGPT.

## 2.2 (2026-08-15)
- Esta biblia incorpora **el flujo de trabajo Cursor ↔ ChatGPT** (§41–§42) como contrato, no como nota aparte.
- Tres maestros obligatorios: GAME_MASTER + IMPLEMENTATION_PLAN + DEVELOPMENT_LOG (Drive = GitHub).
- Aprobación solo literal (\`APROBADA\` + \`SÍ\`); HUMAN_GATE documentado.`
);

// Add review board near end of section 41.12
if (!t.includes("## 41.13 Tablero ronda de revisión diseño")) {
  t = t.replace(
    `| ZZ-001 | PENDIENTE DE REVISIÓN |
`,
    `| ZZ-001 | PENDIENTE DE REVISIÓN |

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

**ZZ-001 sigue NO aprobada** hasta que ChatGPT marque el GAME_MASTER tras esta ronda.
`
  );
}

fs.writeFileSync(repo, t);
fs.mkdirSync("G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER", { recursive: true });
fs.copyFileSync(repo, drive);

const chatgptLeft = (t.match(/\*\*CHATGPT:/g) || []).length;
const cursorResp = (t.match(/### CURSOR: RESPUESTA/g) || []).length;
const cursorDuda = (t.match(/\*\*CURSOR: PROPUESTA \/ DUDA/g) || []).length;

console.log(
  JSON.stringify(
    {
      bytes: Buffer.byteLength(t),
      lines: t.split(/\n/).length,
      chatgptNotes: chatgptLeft,
      cursorResponses: cursorResp,
      cursorDudas: cursorDuda,
    },
    null,
    2
  )
);

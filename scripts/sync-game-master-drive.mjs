/**
 * Builds GAME_MASTER 2.1 megadoc (expands catalogs from content/*.json)
 * and syncs identical copies to Drive + repo.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const driveDir = path.join("G:", "Mi unidad", "Juegos", "Zona Zero", "GAME_MASTER");

fs.mkdirSync(driveDir, { recursive: true });

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function costStr(c) {
  if (!c || typeof c !== "object") return "—";
  return Object.entries(c)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

function effectsStr(e) {
  if (!e || typeof e !== "object") return "—";
  return Object.entries(e)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join("; ");
}

function hashFile(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

const buildings = readJson("content/buildings.json");
const research = readJson("content/research.json");
const eventsRaw = readJson("content/events.json");
const vehiclesRaw = readJson("content/vehicles.json");
const infectedRaw = readJson("content/infected.json");
const erasRaw = readJson("content/eras.json");
const locations = readJson("content/locations.json");
const balance = readJson("content/balance.json");
const factionsRaw = readJson("content/factions.json");

const eventList = Array.isArray(eventsRaw)
  ? eventsRaw
  : eventsRaw.events || [];
const fam = {};
for (const ev of eventList) {
  if (ev.family) fam[ev.family] = (fam[ev.family] || 0) + 1;
}

let header = fs.readFileSync(path.join(root, "GAME_MASTER.md"), "utf8");

header = header
  .replace(
    /\*\*Versión de diseño:\*\* 2\.0 · \*\*Contrato funcional\*\*/,
    "**Versión de diseño:** 2.1 · **Contrato funcional / BIBLIA COMPLETA**"
  )
  .replace(
    /\*\*Versión de diseño:\*\* 2\.1 · \*\*Contrato funcional \/ BIBLIA COMPLETA\*\*/,
    "**Versión de diseño:** 2.1 · **Contrato funcional / BIBLIA COMPLETA**"
  );

if (!header.includes("Copia de trabajo Drive")) {
  header = header.replace(
    "**Fecha:** 2026-08-15  \n",
    `**Fecha:** 2026-08-15  \n**Copia de trabajo Drive:** \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_GAME_MASTER.md\`  \n**Copia repo:** \`GAME_MASTER.md\` (idénticas)  \n**Plan técnico Drive:** \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_IMPLEMENTATION_PLAN.md\` · **Repo:** \`docs/IMPLEMENTATION_PLAN.md\`  \n`
  );
}

// If already expanded (has APÉNDICE G), strip from G to before A and rebuild
const markerA = "# APÉNDICE A — TECNOLOGÍAS";
const markerG = "# APÉNDICE G — INVENTARIO EXHAUSTIVO";
let idxA = header.indexOf(markerA);
if (idxA < 0) throw new Error("APÉNDICE A marker not found");

// Remove previous G–N block if present (between end of body and A, or after F)
const idxG = header.indexOf(markerG);
let body;
let apps;
if (idxG >= 0 && idxG < idxA) {
  body = header.slice(0, idxG);
  apps = header.slice(idxA);
} else if (idxG > idxA) {
  // G was appended after apps — keep A–F then rebuild G–N after
  const endF = header.indexOf("*Apéndices incluidos");
  body = header.slice(0, idxA);
  // keep A through F only
  const cut = endF >= 0 ? header.indexOf("\n", endF) + 1 : header.length;
  apps = header.slice(idxA, cut);
} else {
  body = header.slice(0, idxA);
  apps = header.slice(idxA);
}

let expand = "";
expand += `
---

# APÉNDICE G — INVENTARIO EXHAUSTIVO DEL MOTOR ACTUAL (content/*.json)

> Auditoría factual del prototipo. **No sacraliza** el diseño 2.1: donde contradiga este documento, gana el diseño 2.1.
> Fecha de dump: 2026-08-15.

## G.1 Edificios presentes en código (${Object.keys(buildings).length})

`;

for (const [id, b] of Object.entries(buildings)) {
  expand += `### \`${id}\` — ${b.name}\n`;
  expand += `- **Categoría:** ${b.category || "—"}\n`;
  expand += `- **Descripción:** ${b.desc || "—"}\n`;
  expand += `- **Coste:** ${costStr(b.cost)}\n`;
  expand += `- **Tamaño:** ${b.w || 1}×${b.h || 1} · **max:** ${b.max ?? "—"}\n`;
  expand += `- **Jobs:** ${b.jobs ?? 0} · **Housing:** ${b.housing ?? 0} · **Defense:** ${b.defense ?? 0}\n`;
  if (b.produces) expand += `- **Produce:** ${costStr(b.produces)}\n`;
  if (b.energy != null) expand += `- **Energía:** ${b.energy}\n`;
  if (b.fuelSave != null) expand += `- **fuelSave:** ${b.fuelSave}\n`;
  expand += `- **minEra:** ${b.minEra ?? 0}\n`;
  if (b.requiresBuilding)
    expand += `- **requiresBuilding:** \`${b.requiresBuilding}\`\n`;
  if (b.upgradeFrom) expand += `- **upgradeFrom:** \`${b.upgradeFrom}\`\n`;
  expand += `- **Problema que resuelve (diseño):** ver §7 · decidir conservar/fusionar/eliminar según 2.1\n\n`;
}

expand += `## G.2 Decisiones de catálogo 2.1 vs JSON

| ID JSON | Decisión 2.1 |
|---------|--------------|
| command | **Fusionar** en HQ L2+ (no edificio separado obligatorio) |
| wall / power_hub | Referenciados por research legado; **no** en buildings — crear o quitar unlock |
| insulated_house | **AÑADIR** (no existe aún en JSON) |
| block_reinforced | Mejora opcional era 3 |
| pieces/tools | **Eliminar** como inventario |

## G.3 Research actual en código

`;

const branches = research.branches || {};
for (const [bid, br] of Object.entries(branches)) {
  expand += `### Rama: ${br.name || bid}\n\n`;
  for (const t of br.techs || []) {
    expand += `#### \`${t.id}\` — ${t.name}\n`;
    expand += `- ${t.desc || ""}\n`;
    expand += `- Coste: ${costStr(t.cost)} · Días: ${t.days} · minEra: ${t.minEra}\n`;
    expand += `- Requires: ${(t.requires || []).join(", ") || "—"}\n`;
    expand += `- Effects JSON: ${effectsStr(t.effects)}\n`;
    expand += `- **Estado diseño 2.1:** efectos deben aplicarse en sim (hoy mayormente stub) · ver Apéndice A para árbol objetivo 28 techs\n\n`;
  }
}

expand += `## G.4 Familias de eventos en código\n\n| Familia | Nº eventos |\n|---------|------------|\n`;
for (const [f, n] of Object.entries(fam).sort((a, b) => a[0].localeCompare(b[0]))) {
  expand += `| ${f} | ${n} |\n`;
}
const totalEv =
  eventList.length || Object.values(fam).reduce((a, b) => a + b, 0);
expand += `\n**Total eventos:** ${totalEv}\n\n`;

expand += `## G.5 Vehículos\n\n`;
const veh = vehiclesRaw.vehicles || vehiclesRaw;
for (const [id, v] of Object.entries(veh)) {
  if (typeof v !== "object" || !v.name) continue;
  expand += `- \`${id}\` **${v.name}** — fuel/viaje ${v.fuelPerTrip} · speed ${v.speedBonus} · cargo ${v.cargoBonus} · prot ${v.protection} · era ${v.minEra} · coste ${costStr(v.cost)}\n`;
}

expand += `\n## G.6 Infectados\n\n`;
const inf = infectedRaw.types || infectedRaw;
for (const [id, v] of Object.entries(inf)) {
  if (typeof v !== "object" || !v.name) continue;
  expand += `- \`${id}\` **${v.name}** — HP ${v.hp} · speed ${v.speed} · dmg ${v.damage} · threatWeight ${v.threatWeight} · era ${v.minEra} — ${v.desc || ""}\n`;
}

expand += `\n## G.7 Eras (JSON)\n\n`;
const eraList = erasRaw.eras || erasRaw;
const eraArr = Array.isArray(eraList) ? eraList : Object.values(eraList);
for (const e of eraArr) {
  expand += `- **Era ${e.id} — ${e.name}**: unlock=${JSON.stringify(e.unlock || e.hard || {})} soft=${JSON.stringify(e.soft || {})} — ${e.desc || ""}\n`;
}

expand += `\n## G.8 Tipos de landmark / localización\n\n`;
const types = locations.types || {};
for (const [id, t] of Object.entries(types)) {
  expand += `- \`${id}\` **${t.name}** — riesgo base ${t.baseRisk} · lootBias ${JSON.stringify(t.lootBias || {})} · infectados ${JSON.stringify(t.infected || t.infectedRange || [])}\n`;
}

expand += `\n## G.9 Balance clave (números actuales)\n\n\`\`\`json\n`;
expand += JSON.stringify(
  {
    saveVersion: balance.saveVersion,
    startingPopulation: balance.startingPopulation,
    maxPopulation: balance.maxPopulation,
    startingResources: balance.startingResources,
    foodPerPersonPerDay: balance.foodPerPersonPerDay,
    waterPerPersonPerDay: balance.waterPerPersonPerDay,
    explorers: balance.explorers,
    victory: balance.victory,
    quietNightChance: balance.quietNightChance,
    foodSoftCapDays: balance.foodSoftCapDays,
    secondaryResources: balance.secondaryResources,
  },
  null,
  2
);
expand += `\n\`\`\`\n\n`;

expand += `## G.10 Facciones plantilla (JSON)\n\n`;
const fac = factionsRaw.factions || factionsRaw.templates || factionsRaw;
for (const [id, f] of Object.entries(fac)) {
  if (typeof f !== "object" || !f.name) continue;
  expand += `- \`${id}\` **${f.name}** (${f.trait}) hostility=${f.hostility} tradeMult=${f.tradeMult}\n`;
}

expand += `
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

### Refugio Central I (\`hq_central_l1\`)
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

### Refugio improvisado (\`shelter\`)
- Capacidad 2 · protección 0 · wood 5 metal 2 · era 0 · max alto.
- Resuelve: camas baratas; riesgo clima.

### Casa básica (\`house\`)
- Capacidad 4 · protección 1 · wood 10 metal 4 · requiere shelter · era 0–1.

### Vivienda aislada (\`insulated_house\`) — NUEVO 2.1
- Capacidad 4 · protección 2 · wood 14 metal 6 fuel 1 · tech \`insulation\` · era 1–2.
- Resuelve: olas de frío.

### Bloque (\`block\`)
- Capacidad 8 · protección 2 · footprint 2×1 · requiere house · era 1–2.

### Bloque reforzado (\`block_reinforced\`) — mejora
- Capacidad 10–12 · protección 3 · era 3 · coste alto.

## I.3 Resto del catálogo activo
Contrato común para productivos (farm, well, greenhouse, cistern, sawmill, scrapyard, workshop, kitchen, mech_shop, storage, medkit, infirmary, clinic, barricade, fence, watchtower, armory, bunker, radio, expedition_center, garage, generator, solar, tech_bench, lab):
1. Sin workers → producción 0 (si aplica).
2. Staff en ficha del edificio (modelo único §10).
3. Soft-cap stock vía almacenes.
4. Daño en ataques → HP/eficiencia ↓ hasta reparar (abstracto o rebuild).
5. Baseline numérico = G.1 hasta calibración.

**Fuera del catálogo activo v1:** \`command\` (fusionado HQ), \`wall\`/\`power_hub\` huérfanos hasta decisión explícita.

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
\`ach_dawn\`, \`ach_week\`, \`ach_month\`, \`ach_quarter\`, \`ach_century\`, \`ach_first_winter\`, \`ach_heatwave\`, \`ach_no_deaths_15\`, \`ach_food_crisis_recover\`, \`ach_water_crisis_recover\`, \`ach_pop_crash_recover\`, \`ach_endless_50\`

### Población
\`ach_pop_10\`, \`ach_pop_25\`, \`ach_pop_50\`, \`ach_pop_100\`, \`ach_full_housing\`, \`ach_mass_immigration\`, \`ach_rescue\`, \`ach_lose20_recover\`, \`ach_healthy_20\`, \`ach_stability_80\`

### Exploración
\`ach_first_explore\`, \`ach_landmarks_5\`, \`ach_landmarks_15\`, \`ach_control_3\`, \`ach_control_8\`, \`ach_control_12\`, \`ach_explorer_lvl3\`, \`ach_explorer_lvl5\`, \`ach_three_explorers\`, \`ach_heal_explorer\`, \`ach_extreme_clear\`

### Construcción
\`ach_first_farm\`, \`ach_first_well\`, \`ach_buildings_10\`, \`ach_buildings_25\`, \`ach_hq2\`, \`ach_hq3\`, \`ach_greenhouse\`, \`ach_storage_3\`, \`ach_dense_colony\`

### Defensa
\`ach_first_barricade\`, \`ach_repel_1\`, \`ach_repel_5\`, \`ach_messy_survive\`, \`ach_horde\`, \`ach_bunker\`, \`ach_zero_ammo_win\`, \`ach_perimeter_clean\`

### Tech / industria
\`ach_first_research\`, \`ach_branch_complete\`, \`ach_generator\`, \`ach_solar\`, \`ach_first_vehicle\`, \`ach_van_route\`

### Eventos / misiones
\`ach_hard_choice\`, \`ach_trade\`, \`ach_radio_mission\`, \`ach_failed_rescue\`, \`ach_calm_10\`, \`ach_prepared_catastrophe\`

### Secretos / humor
\`ach_name_zonazero\`, \`ach_recenter_50\`, \`ach_only_shelters\`, \`ach_brief_zero\`, \`ach_seed_secret\`

**Total ids ≥ 63.**

---

# APÉNDICE M — SINCRONIZACIÓN DRIVE ↔ REPO

| Documento | Drive | Repo |
|-----------|-------|------|
| Biblia diseño | \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_GAME_MASTER.md\` | \`GAME_MASTER.md\` |
| Plan técnico | \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_IMPLEMENTATION_PLAN.md\` | \`docs/IMPLEMENTATION_PLAN.md\` |

**Regla:** toda modificación de diseño actualiza **ambos** con el mismo contenido (hash idéntico).

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

---

`;

// Clean apps footer / version mentions
apps = apps
  .replace(/\*Apéndices incluidos en la biblia 2\.[0-9].*/, "")
  .replace(/GAME_MASTER 2\.0/g, "GAME_MASTER 2.1")
  .replace(/biblia 2\.0/g, "biblia 2.1");

const full =
  body +
  expand +
  apps.trimEnd() +
  "\n\n*Apéndices A–N incluidos en la biblia 2.1 — documento maestro completo.*\n";

let plan = fs.readFileSync(path.join(root, "docs/IMPLEMENTATION_PLAN.md"), "utf8");
plan = plan
  .replace(/Diseño 2\.0/g, "Diseño 2.1")
  .replace(/GAME_MASTER\.md` 2\.0/g, "GAME_MASTER.md` 2.1");
if (!plan.includes("ZONA_ZERO_IMPLEMENTATION_PLAN.md")) {
  plan += `

---

## Sync Drive

Copia idéntica en: \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_IMPLEMENTATION_PLAN.md\`
`;
}

const gmRepo = path.join(root, "GAME_MASTER.md");
const gmDrive = path.join(driveDir, "ZONA_ZERO_GAME_MASTER.md");
const planRepo = path.join(root, "docs/IMPLEMENTATION_PLAN.md");
const planDrive = path.join(driveDir, "ZONA_ZERO_IMPLEMENTATION_PLAN.md");

fs.writeFileSync(gmRepo, full);
fs.writeFileSync(gmDrive, full);
fs.writeFileSync(planRepo, plan);
fs.writeFileSync(planDrive, plan);

const h1 = hashFile(gmRepo);
const h2 = hashFile(gmDrive);
const h3 = hashFile(planRepo);
const h4 = hashFile(planDrive);

console.log(
  JSON.stringify(
    {
      gmBytes: fs.statSync(gmRepo).size,
      gmLines: full.split(/\r?\n/).length,
      planBytes: fs.statSync(planRepo).size,
      planLines: plan.split(/\r?\n/).length,
      gmHashMatch: h1 === h2,
      planHashMatch: h3 === h4,
      gmHash12: h1.slice(0, 12),
      planHash12: h3.slice(0, 12),
      driveDir,
    },
    null,
    2
  )
);

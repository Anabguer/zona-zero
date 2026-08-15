/**
 * Generates IMPLEMENTATION_PLAN + DEVELOPMENT_LOG (ZZ-XXX) and syncs Drive ↔ repo.
 * Docs only — no game implementation.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const driveDir = path.join("G:", "Mi unidad", "Juegos", "Zona Zero", "GAME_MASTER");
fs.mkdirSync(driveDir, { recursive: true });

function hash(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

/** @typedef {{
 *  id: string,
 *  name: string,
 *  block: string,
 *  objective: string,
 *  systems: string[],
 *  deps: string[],
 *  tasks: string[],
 *  data: string[],
 *  assets: string[],
 *  autoTests: string[],
 *  funcTests: string[],
 *  visualReview: string,
 *  acceptance: string[],
 *  humanGate: boolean,
 *  filesHint: string[]
 * }} Phase */

/** @type {Phase[]} */
const phases = [];

function add(p) {
  phases.push(p);
}

function P(partial) {
  add({
    systems: [],
    deps: [],
    tasks: [],
    data: [],
    assets: [],
    autoTests: [],
    funcTests: [],
    visualReview: "No",
    acceptance: [],
    humanGate: false,
    filesHint: [],
    ...partial,
  });
}

// ——— A FUNDACIÓN ———
P({
  id: "ZZ-001",
  name: "Aprobar contrato de diseño 2.1",
  block: "A · Fundación",
  objective: "Congelar GAME_MASTER + IMPLEMENTATION_PLAN + protocolo DEVELOPMENT_LOG como contrato antes de código.",
  systems: ["documentación", "gobernanza"],
  deps: [],
  tasks: [
    "ChatGPT revisa ZONA_ZERO_GAME_MASTER.md completo",
    "ChatGPT revisa ZONA_ZERO_IMPLEMENTATION_PLAN.md completo",
    "Marcar APROBADA en DEVELOPMENT_LOG solo tras revisión literal",
  ],
  data: ["GAME_MASTER.md", "docs/IMPLEMENTATION_PLAN.md", "docs/DEVELOPMENT_LOG.md"],
  assets: [],
  autoTests: ["n/a"],
  funcTests: ["Revisión humana exhaustiva de diseño"],
  visualReview: "No",
  acceptance: [
    "ESTADO REVISIÓN: APROBADA en ZZ-001",
    "APROBACIÓN FINAL CHATGPT: SÍ",
    "Autorización explícita a implementar ZZ-002+",
  ],
  humanGate: true,
  filesHint: ["GAME_MASTER.md", "docs/IMPLEMENTATION_PLAN.md", "docs/DEVELOPMENT_LOG.md"],
});

P({
  id: "ZZ-002",
  name: "Auditoría motor vs diseño 2.1",
  block: "A · Fundación",
  objective: "Matriz código↔diseño: conservar / reescribir / deprecar / borrar.",
  systems: ["motor", "deuda técnica"],
  deps: ["ZZ-001"],
  tasks: [
    "Inventariar js/*, content/*, css/*, assets",
    "Marcar cada sistema: OK / PARCIAL / STUB / CONFLICTO",
    "Escribir docs/AUDIT_ENGINE.md",
  ],
  data: ["content/*.json", "balance.json"],
  assets: [],
  autoTests: ["node scripts existentes de smoke no regresan"],
  funcTests: ["Documento AUDIT_ENGINE completo y priorizado"],
  visualReview: "No",
  acceptance: ["Lista priorizada sin cambios de gameplay aún", "Conflictos explícitos (labor dual, wall/power_hub, etc.)"],
  humanGate: false,
  filesHint: ["docs/AUDIT_ENGINE.md"],
});

P({
  id: "ZZ-003",
  name: "Schemas de contenido unificados",
  block: "A · Fundación",
  objective: "Documentar schemas JSON para buildings, research, seasons, missions, achievements, housingClimate.",
  systems: ["content", "balance"],
  deps: ["ZZ-002"],
  tasks: ["docs/CONTENT_SCHEMA.md", "Campos obligatorios + opcionales", "Notas de migración save"],
  data: ["schemas documentados"],
  assets: [],
  autoTests: ["n/a"],
  funcTests: ["Schema cubre todos los sistemas 2.1"],
  visualReview: "No",
  acceptance: ["CONTENT_SCHEMA.md revisable por ChatGPT"],
  humanGate: false,
  filesHint: ["docs/CONTENT_SCHEMA.md"],
});

P({
  id: "ZZ-004",
  name: "Una sola fuente de mapa",
  block: "A · Fundación",
  objective: "Deprecar zones.json del load path; locations.json canónico.",
  systems: ["mapa", "loadContent"],
  deps: ["ZZ-003"],
  tasks: ["Auditar referencias zones.json", "Documentar migración", "Quitar load path o stub seguro"],
  data: ["locations.json", "zones.json"],
  assets: [],
  autoTests: ["loadContent + partida nueva sin error"],
  funcTests: ["Mapa usa solo locations"],
  visualReview: "No",
  acceptance: ["Una fuente de landmarks activa"],
  humanGate: false,
  filesHint: ["js/content-loader.js", "content/zones.json"],
});

P({
  id: "ZZ-005",
  name: "Skeleton balance 2.1",
  block: "A · Fundación",
  objective: "Añadir secciones seasons, housingClimate, missions, laborModel, achievements en balance sin cambiar UX visible.",
  systems: ["balance"],
  deps: ["ZZ-003"],
  tasks: ["Extender balance.json con defaults seguros", "Defaults no alteran D1 visual"],
  data: ["balance.json"],
  assets: [],
  autoTests: ["loadContent OK", "smoke partida nueva"],
  funcTests: ["Campos nuevos leídos o ignorados sin crash"],
  visualReview: "No",
  acceptance: ["laborModel=per_building documentado", "Sin regresión visual"],
  humanGate: false,
  filesHint: ["content/balance.json"],
});

P({
  id: "ZZ-006",
  name: "Protocolo sync Drive ↔ GitHub",
  block: "A · Fundación",
  objective: "Automatizar/copiar los 3 docs maestros a Drive y repo con hash idéntico.",
  systems: ["documentación"],
  deps: ["ZZ-001"],
  tasks: ["Mantener scripts/sync-game-master-drive.mjs", "Incluir DEVELOPMENT_LOG en sync", "Verificar hashes"],
  data: ["tres docs Drive"],
  assets: [],
  autoTests: ["hash Drive === hash repo"],
  funcTests: ["ChatGPT puede abrir los 3 en Drive"],
  visualReview: "No",
  acceptance: ["Sync reproducible"],
  humanGate: false,
  filesHint: ["scripts/sync-game-master-drive.mjs"],
});

// ——— B D1 ———
P({
  id: "ZZ-010",
  name: "Colonia física D1 sin GIS",
  block: "B · Experiencia D1",
  objective: "Colonia legible al entrar: sin círculo/polígono territorio; suelo orgánico bajo edificios.",
  systems: ["render-map", "UX D1", "arte terreno"],
  deps: ["ZZ-001", "ZZ-005"],
  tasks: [
    "Eliminar/ocultar look GIS en viewport inicial",
    "Props/restos discretos",
    "Edificios a escala protagonista",
  ],
  data: [],
  assets: ["props colonia si faltan"],
  autoTests: ["smoke-d1"],
  funcTests: ["Usuario reconoce colonia en ≤3 s"],
  visualReview: "Sí — docs/review + Drive Review",
  acceptance: ["Sin círculo marrón dominante", "Sin rejilla GIS obvia en D1"],
  humanGate: true,
  filesHint: ["js/render-map.js", "css/game.css", "css/world.css"],
});

P({
  id: "ZZ-011",
  name: "Cámara D1 protagonista",
  block: "B · Experiencia D1",
  objective: "Zoom/pan/recenter que no pierdan la colonia.",
  systems: ["cámara", "mapa"],
  deps: ["ZZ-010"],
  tasks: ["Zoom inicial ~colonia", "Recentrar fiable", "Límites de pan"],
  data: ["balance camera si aplica"],
  assets: [],
  autoTests: ["smoke cámara"],
  funcTests: ["Recentrar siempre útil en móvil y desktop"],
  visualReview: "Sí — capturas móvil+desktop",
  acceptance: ["Colonia centrada al inicio", "No vacío confuso en desktop"],
  humanGate: false,
  filesHint: ["js/render-map.js", "js/main.js"],
});

P({
  id: "ZZ-012",
  name: "Tutorial D1 por acciones",
  block: "B · Experiencia D1",
  objective: "Intro → huerto → colocar → staff → (pozo); una acción/explicación.",
  systems: ["onboarding", "misiones guía"],
  deps: ["ZZ-010"],
  tasks: ["Quitar cascada Continuar", "Coach ligado a acciones", "Cierre natural"],
  data: ["textos guía"],
  assets: [],
  autoTests: ["smoke onboarding steps"],
  funcTests: ["Jugador completa D1 sin modal spam"],
  visualReview: "Sí",
  acceptance: ["Sin cascada Continuar", "Una explicación por acción"],
  humanGate: true,
  filesHint: ["js/onboarding.js", "js/main.js"],
});

P({
  id: "ZZ-013",
  name: "HUD recursos D1 comprensible",
  block: "B · Experiencia D1",
  objective: "Nombres legibles comida/agua; sin Au/Gu/A/D crudos.",
  systems: ["HUD", "recursos"],
  deps: ["ZZ-010"],
  tasks: ["Labels claros", "Tooltips/tap toast", "Prioridad comida/agua"],
  data: ["resourceOrder"],
  assets: ["iconos recursos si faltan"],
  autoTests: ["HUD labels presentes"],
  funcTests: ["Jugador entiende stock en 5 s"],
  visualReview: "Sí",
  acceptance: ["Sin abreviaturas opacas en D1"],
  humanGate: false,
  filesHint: ["js/main.js", "css/game.css"],
});

P({
  id: "ZZ-014",
  name: "Layout desktop 1920 D1",
  block: "B · Experiencia D1",
  objective: "Panel lateral + mundo legible; no escritorio vacío.",
  systems: ["UX desktop"],
  deps: ["ZZ-011", "ZZ-013"],
  tasks: ["Composición desktop", "Dock/panel", "QA 1920×1080"],
  data: [],
  assets: [],
  autoTests: ["screenshot desktop"],
  funcTests: ["Colonia + panel visibles"],
  visualReview: "Sí — desktop obligatorio",
  acceptance: ["Desktop no se siente vacío", "Móvil intacto"],
  humanGate: true,
  filesHint: ["css/world.css", "css/game.css"],
});

P({
  id: "ZZ-015",
  name: "QA D1 + contact sheet + gate",
  block: "B · Experiencia D1",
  objective: "Cerrar bloque D1 con tests, capturas, sync Review, parar hasta aprobación.",
  systems: ["QA", "review"],
  deps: ["ZZ-010", "ZZ-011", "ZZ-012", "ZZ-013", "ZZ-014"],
  tasks: [
    "Smoke D1 save/load",
    "Capturas móvil+desktop",
    "review-contact-sheet",
    "Actualizar DEVELOPMENT_LOG",
    "PARAR hasta APROBADA",
  ],
  data: [],
  assets: ["docs/review/*"],
  autoTests: ["smoke-d1", "save/load"],
  funcTests: ["Partida nueva real D1"],
  visualReview: "Sí — gate humano",
  acceptance: ["Contact sheet regenerado", "ESTADO REVISIÓN pendiente hasta ChatGPT", "No avanzar a ZZ-020 sin APROBADA"],
  humanGate: true,
  filesHint: ["docs/review/", "scripts/review-shots.mjs"],
});

// ——— C D2-D5 ———
P({
  id: "ZZ-020",
  name: "Brief diario ritual",
  block: "C · Loop D2–D5",
  objective: "Al avanzar día: comida/agua producida·consumida·balance + hechos.",
  systems: ["sim", "UX brief"],
  deps: ["ZZ-015"],
  tasks: ["Card/sheet brief", "Datos reales de sim", "No spam"],
  data: ["balance consumo"],
  assets: [],
  autoTests: ["brief tras nextDay"],
  funcTests: ["Jugador entiende balance diario"],
  visualReview: "Sí",
  acceptance: ["Brief siempre tras avanzar día", "Números coherentes"],
  humanGate: false,
  filesHint: ["js/sim.js", "js/main.js"],
});

P({
  id: "ZZ-021",
  name: "Staffing por edificio canónico",
  block: "C · Loop D2–D5",
  objective: "Modelo único labor: +/- en ficha edificio; resumen población solo lectura.",
  systems: ["colony", "labor"],
  deps: ["ZZ-020"],
  tasks: [
    "UI ficha workers",
    "Eliminar/ocultar asignación dual por categorías como primaria",
    "Autoasignar opcional",
  ],
  data: ["laborModel"],
  assets: [],
  autoTests: ["staff cambia producción"],
  funcTests: ["Con 12 pop: asignar farm/well/defensa intuitivo"],
  visualReview: "Sí",
  acceptance: ["Un solo modelo de asignación", "Sin micromanejo doble"],
  humanGate: true,
  filesHint: ["js/colony.js", "js/main.js"],
});

P({
  id: "ZZ-022",
  name: "Exploración D3–D5 mínima",
  block: "C · Loop D2–D5",
  objective: "Reveal → ficha → enviar → ruta → retorno; sin research/vehículos en tutorial.",
  systems: ["exploración", "mapa"],
  deps: ["ZZ-020"],
  tasks: ["Flujo completo primer landmark", "Informe retorno", "Riesgo/botín legibles"],
  data: ["locations.json"],
  assets: ["landmarks si faltan"],
  autoTests: ["expedition roundtrip"],
  funcTests: ["Primera salida en D3–D5 jugable"],
  visualReview: "Sí",
  acceptance: ["Sin forzar research", "Feedback ida/vuelta"],
  humanGate: false,
  filesHint: ["js/explore.js", "js/main.js"],
});

P({
  id: "ZZ-023",
  name: "QA bloque D1→D5",
  block: "C · Loop D2–D5",
  objective: "Validar loop core hasta D5; gate humano.",
  systems: ["QA"],
  deps: ["ZZ-020", "ZZ-021", "ZZ-022"],
  tasks: ["Capturas D2–D5", "Smoke", "PARAR si HUMAN_GATE"],
  data: [],
  assets: ["docs/review"],
  autoTests: ["smoke D5"],
  funcTests: ["Partida guiada D1–D5"],
  visualReview: "Sí — gate",
  acceptance: ["Loop estable", "APROBADA antes de sistemas mid"],
  humanGate: true,
  filesHint: ["docs/review/"],
});

// ——— D Vivienda ———
const housing = [
  ["ZZ-030", "Capacidad vivienda + overflow", "Capacidad = Σ housing; overflow frena crecimiento y baja estabilidad.", ["vivienda", "población"]],
  ["ZZ-031", "Protección climática por tipo", "Campo climateProtection 0–3 en viviendas; cobertura efectiva.", ["vivienda", "clima"]],
  ["ZZ-032", "Vivienda aislada + unlock", "Añadir insulated_house + tech insulation.", ["vivienda", "research", "content"]],
  ["ZZ-033", "Alertas cobertura térmica", "Aviso: plazas protegidas vs pop antes de ola.", ["alertas", "vivienda"]],
  ["ZZ-034", "Soft-caps almacenamiento", "Soft-cap visible; merma exceso; almacenes aumentan.", ["recursos", "storage"]],
  ["ZZ-035", "Estabilidad factores UI", "Estabilidad secundaria legible sin barra spam.", ["estabilidad", "UX"]],
];
housing.forEach(([id, name, objective, systems], i) => {
  P({
    id,
    name,
    block: "D · Necesidades y vivienda",
    objective,
    systems,
    deps: i === 0 ? ["ZZ-023"] : [housing[i - 1][0]],
    tasks: ["Implementar según GAME_MASTER §4–5", "Tests numéricos", "UI mínima"],
    data: ["buildings.json", "balance housingClimate"],
    assets: id === "ZZ-032" ? ["asset insulated_house"] : [],
    autoTests: ["unit housing math"],
    funcTests: ["Escenarios overflow / frío avisado"],
    visualReview: id === "ZZ-032" || id === "ZZ-033" ? "Sí" : "No",
    acceptance: ["Cumple §4–5", "Sin micromanejo alquiler"],
    humanGate: id === "ZZ-032",
    filesHint: ["content/buildings.json", "js/sim.js", "js/colony.js"],
  });
});

// ——— E Clima ———
const climate = [
  ["ZZ-040", "Ciclo estaciones state", "Primavera/verano/otoño/invierno en state + balance."],
  ["ZZ-041", "Clima puntual + duración", "clear/rain/storm/cold/heat/fog + duración."],
  ["ZZ-042", "Pipeline aviso→prep→consecuencia", "Nunca castigo imposible de prever."],
  ["ZZ-043", "Feedback visual clima", "Partículas/tono/velo según clima."],
  ["ZZ-044", "Impacto prod/exploración/salud", "Tablas §11 aplicadas en sim."],
  ["ZZ-045", "QA invierno simulado", "Escenario forzado + capturas + gate."],
];
climate.forEach(([id, name, objective], i) => {
  P({
    id,
    name,
    block: "E · Estaciones y clima",
    objective,
    systems: ["clima", "director", "sim"],
    deps: i === 0 ? ["ZZ-031", "ZZ-023"] : [climate[i - 1][0]],
    tasks: ["Implementar §11", "Integrar Director"],
    data: ["balance seasons", "events clima"],
    assets: id === "ZZ-043" ? ["FX clima"] : [],
    autoTests: ["season tick", "warn before blizzard"],
    funcTests: ["Jugador recibe aviso ≥1 día antes"],
    visualReview: id === "ZZ-043" || id === "ZZ-045" ? "Sí" : "No",
    acceptance: ["Patrón aviso→prep→consecuencia", "No muerte sorpresa D1"],
    humanGate: id === "ZZ-045",
    filesHint: ["js/sim.js", "js/director.js", "content/balance.json"],
  });
});

// ——— F Salud ———
[
  ["ZZ-050", "Camas médicas y curación agregada", "Σ camas health; curación/día limitada."],
  ["ZZ-051", "Cadena botiquín→enfermería→clínica", "Progresión edificios health."],
  ["ZZ-052", "Explorador wounded/sick timings", "Días indisponible; medicinas acortan."],
  ["ZZ-053", "Alertas salud", "Camas X/Y; riesgo muerte agregado."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "F · Salud",
    objective,
    systems: ["salud", "exploradores"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§12"],
    data: ["buildings health", "balance heal"],
    assets: [],
    autoTests: ["heal tick"],
    funcTests: ["Heridos bajan labor; camas aceleran"],
    visualReview: "No",
    acceptance: ["Sin RPG de 100 fichas", "Explorador individual sí"],
    humanGate: false,
    filesHint: ["js/sim.js", "js/explorers.js"],
  });
});

// ——— G Defensa ———
[
  ["ZZ-060", "Defensa agregada legible", "Score defensa sin A/D crudos opacos."],
  ["ZZ-061", "Ataques prep→resolve→informe", "Jugador prepara; juego resuelve."],
  ["ZZ-062", "Infectados tipados en combate", "common/fast/tank/horde/rare afectan."],
  ["ZZ-063", "Munición y armería", "Consumo ammo; armería produce."],
  ["ZZ-064", "Recuperación post-ataque", "Protección post-desastre; objetivos recovery."],
  ["ZZ-065", "QA ataque + recuperación visual", "Capturas + gate gameplay."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "G · Defensa e infectados",
    objective,
    systems: ["defensa", "infectados", "director"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§13–14"],
    data: ["infected.json", "balance defense"],
    assets: id === "ZZ-065" ? ["FX ataque opcional"] : [],
    autoTests: ["resolveBaseAttack cases"],
    funcTests: ["50→pérdida→recuperación posible"],
    visualReview: id === "ZZ-065" ? "Sí" : "Parcial",
    acceptance: ["No combate manual", "Informe claro de bajas/daños"],
    humanGate: id === "ZZ-065",
    filesHint: ["js/combat.js", "js/director.js", "content/infected.json"],
  });
});

// ——— H Territorio ———
[
  ["ZZ-070", "Beneficios reales de control", "Seguridad, reveal, rutas, loot residual."],
  ["ZZ-071", "Contested / pérdida fronteriza", "Opcional según diseño; si sí, reglas claras."],
  ["ZZ-072", "Tablas loot por landmark", "Supermercado≠farmacia≠comisaría."],
  ["ZZ-073", "Fog/discovered polish visual", "Sin GIS; landmarks art."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "H · Territorio",
    objective,
    systems: ["mapa", "exploración"],
    deps: i === 0 ? ["ZZ-022"] : [arr[i - 1][0]],
    tasks: ["§15–16"],
    data: ["locations.json"],
    assets: id === "ZZ-073" ? ["landmarks set"] : [],
    autoTests: ["control bonuses"],
    funcTests: ["Controlar zona mejora seguridad medible"],
    visualReview: id === "ZZ-073" ? "Sí" : "No",
    acceptance: ["No pintar verde vacío"],
    humanGate: id === "ZZ-073",
    filesHint: ["js/map.js", "content/locations.json"],
  });
});

// ——— I Research ———
[
  ["ZZ-080", "Cablear effects research existentes", "Cada effect JSON aplica en sim."],
  ["ZZ-081", "Árbol 2.1 ramas Medicina/Energía", "Ampliar a ~28 techs diseño."],
  ["ZZ-082", "UI research legible", "En Más / sheet; deseo de unlock."],
  ["ZZ-083", "Tests por tech medible", "1 assertion por tech."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "I · Investigación",
    objective,
    systems: ["research"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§18 + Apéndice A"],
    data: ["research.json"],
    assets: [],
    autoTests: ["tech effect suite"],
    funcTests: ["Investigar insulation unlock insulated_house"],
    visualReview: id === "ZZ-082" ? "Sí" : "No",
    acceptance: ["Cero techs stub", "Sin unlock wall/power_hub huérfanos"],
    humanGate: id === "ZZ-082",
    filesHint: ["js/research.js", "content/research.json"],
  });
});

// ——— J Vehículos ———
[
  ["ZZ-090", "Garage y requisitos compra", "Sin vehículo pesado sin garage/tech."],
  ["ZZ-091", "Efectos speed/cargo/fuel/prot", "Aplicados en expedición."],
  ["ZZ-092", "Reparación abstracta", "Coste metal/fuel + mech_shop; sin piezas."],
  ["ZZ-093", "Integración expedición UI", "Elegir vehículo al enviar."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "J · Vehículos",
    objective,
    systems: ["vehículos", "exploración"],
    deps: i === 0 ? ["ZZ-022", "ZZ-080"] : [arr[i - 1][0]],
    tasks: ["§17"],
    data: ["vehicles.json"],
    assets: ["sprites vehículos si faltan"],
    autoTests: ["fuel cost trip"],
    funcTests: ["Bike early; car mid"],
    visualReview: id === "ZZ-093" ? "Sí" : "No",
    acceptance: ["Sin inventario piezas"],
    humanGate: false,
    filesHint: ["js/vehicles.js", "content/vehicles.json"],
  });
});

// ——— K Misiones ———
[
  ["ZZ-100", "Schema missions + state", "missions[] en save."],
  ["ZZ-101", "Misiones guía", "Sustituyen coach sticky."],
  ["ZZ-102", "Misiones contextuales necesidad", "food/water/beds/warmth."],
  ["ZZ-103", "Misiones aleatorias", "radio, rescate, supply, nest."],
  ["ZZ-104", "Misiones de era / victoria path", "Gates era + final_chain."],
  ["ZZ-105", "UI objetivo único", "Un objetivo visible; recompensas."],
  ["ZZ-106", "QA misiones no spam", "Cooldowns; gate."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "K · Misiones",
    objective,
    systems: ["misiones", "director"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§20 + Apéndice K"],
    data: ["content/missions.json nuevo"],
    assets: [],
    autoTests: ["mission spawn rules"],
    funcTests: ["Máx 1–2 activas relevantes"],
    visualReview: id === "ZZ-105" || id === "ZZ-106" ? "Sí" : "No",
    acceptance: ["No campaña lineal rígida", "No spam"],
    humanGate: id === "ZZ-106",
    filesHint: ["js/missions.js", "content/missions.json"],
  });
});

// ——— L Logros ———
[
  ["ZZ-110", "Schema achievements", "content/achievements.json"],
  ["ZZ-111", "Tracking + persistencia", "Unlock + save"],
  ["ZZ-112", "Cablear ≥60 logros", "Apéndice L ids"],
  ["ZZ-113", "Feedback badge no invasivo", "Toast/badge sin modal spam"],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "L · Logros",
    objective,
    systems: ["logros"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§22"],
    data: ["achievements.json"],
    assets: ["iconos logros opcionales"],
    autoTests: ["unlock triggers"],
    funcTests: ["Logro D7 / pop10"],
    visualReview: id === "ZZ-113" ? "Sí" : "No",
    acceptance: ["Sin pay-to-win", "≥60"],
    humanGate: false,
    filesHint: ["js/achievements.js"],
  });
});

// ——— M Director ———
[
  ["ZZ-120", "Pesos Director vs era/estación", "Recalibrar families."],
  ["ZZ-121", "Memoria flags secuelas", "flags narrativas."],
  ["ZZ-122", "Antirrepetición reforzada", "ventana M días."],
  ["ZZ-123", "Quiet nights calibrados", "~30%."],
  ["ZZ-124", "Catástrofes con aviso", "aviso→prep→consecuencia."],
  ["ZZ-125", "Auditoría 110 eventos", "familia vs diseño; recortar inútiles."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "M · Eventos / Director 2.1",
    objective,
    systems: ["director", "eventos"],
    deps: i === 0 ? ["ZZ-040", "ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§19 + §25 + Apéndice J"],
    data: ["events.json"],
    assets: [],
    autoTests: ["director budget", "cooldown"],
    funcTests: ["Ritmo tensión→crisis→recovery en sim"],
    visualReview: "No",
    acceptance: ["No crisis infinita", "No 100 días planos"],
    humanGate: id === "ZZ-125",
    filesHint: ["js/director.js", "content/events.json"],
  });
});

// ——— N Humanos ———
[
  ["ZZ-130", "Contactos por evento", "Sin diplomacia 4X."],
  ["ZZ-131", "Comercio evento", "Trueque simple."],
  ["ZZ-132", "UI mínima contactos", "Cards o solo eventos."],
  ["ZZ-133", "Go/no-go facciones tras playtest", "Decisión documentada."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "N · Otros humanos",
    objective,
    systems: ["facciones ligeras"],
    deps: i === 0 ? ["ZZ-120"] : [arr[i - 1][0]],
    tasks: ["§27"],
    data: ["factions.json"],
    assets: [],
    autoTests: ["event trade"],
    funcTests: ["Contacto no requiere panel 4X"],
    visualReview: id === "ZZ-132" ? "Sí" : "No",
    acceptance: ["Si no aporta → solo flags"],
    humanGate: id === "ZZ-133",
    filesHint: ["js/factions.js", "content/factions.json"],
  });
});

// ——— O Eras/Victoria ———
[
  ["ZZ-140", "Unlock eras por indicadores 2.1", "pop/control/research/infra."],
  ["ZZ-141", "Victoria multi-condición", "Checklist culminación §28."],
  ["ZZ-142", "Crisis final variable", "Variantes por semilla."],
  ["ZZ-143", "Endless post-victoria", "Continuar partida."],
  ["ZZ-144", "Pantallas victoria/derrota", "Narrativa causa clara."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "O · Eras y victoria",
    objective,
    systems: ["eras", "victoria", "derrota"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§23 §28 §29"],
    data: ["eras.json", "balance victory"],
    assets: [],
    autoTests: ["victory checks"],
    funcTests: ["Derrota explica por qué"],
    visualReview: id === "ZZ-144" ? "Sí" : "No",
    acceptance: ["No checkbox pop solo", "Endless disponible"],
    humanGate: id === "ZZ-144",
    filesHint: ["js/eras.js", "js/victory.js"],
  });
});

// ——— P UX ———
[
  ["ZZ-150", "Sheets móvil/desktop consistentes", "Mundo primero; bottom sheets / panel."],
  ["ZZ-151", "Alertas prioritizadas", "Crítico > objetivo > tip."],
  ["ZZ-152", "Ayuda contextual", "? sin mandar al jugador."],
  ["ZZ-153", "Diario no spam", "Log filtrable."],
  ["ZZ-154", "Accesibilidad básica", "Tap targets, contraste."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "P · UX mundo completa",
    objective,
    systems: ["UX"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    tasks: ["§21 §31"],
    data: [],
    assets: [],
    autoTests: ["a11y smoke"],
    funcTests: ["Sin pestañas Mapa|Base|Gente"],
    visualReview: "Sí",
    acceptance: ["Contrato UI §31"],
    humanGate: id === "ZZ-150" || id === "ZZ-154",
    filesHint: ["css/world.css", "js/main.js"],
  });
});

// ——— Q Arte/Audio ———
[
  ["ZZ-160", "Assets edificios faltantes", "insulated_house etc."],
  ["ZZ-161", "Terreno ciudad close-up", "No blur GIS."],
  ["ZZ-162", "Landmarks set completo", "18 tipos reconocibles."],
  ["ZZ-163", "Props colonia", "Restos, valla, detalles."],
  ["ZZ-164", "SFX mínimo + mute", "§34."],
  ["ZZ-165", "Review visual por era", "Contact sheets era 0–3."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "Q · Arte y audio",
    objective,
    systems: ["arte", "audio"],
    deps: i === 0 ? ["ZZ-015"] : [arr[i - 1][0]],
    tasks: ["§33 §34"],
    data: [],
    assets: ["lote completo"],
    autoTests: ["assets load"],
    funcTests: ["Reconocibilidad"],
    visualReview: "Sí",
    acceptance: ["Dirección artística coherente"],
    humanGate: id === "ZZ-161" || id === "ZZ-165",
    filesHint: ["assets/", "docs/art-direction/"],
  });
});

// ——— R Sim ———
[
  ["ZZ-170", "Harness perfiles IA-jugador", "atento/expansivo/conservador/mala gestión/sin explorar/sobreexpansión."],
  ["ZZ-171", "Métricas batch D30/D100", "supervivencia, pop, crisis, victoria."],
  ["ZZ-172", "Calibración dificultad normal", "Ajustar balance.json."],
  ["ZZ-173", "Informe balance", "docs/BALANCE_REPORT.md + gate."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "R · Simulador y balance",
    objective,
    systems: ["simulador", "balance"],
    deps: i === 0 ? ["ZZ-120", "ZZ-140"] : [arr[i - 1][0]],
    tasks: ["§36"],
    data: ["balance.json"],
    assets: [],
    autoTests: ["sim batch"],
    funcTests: ["Perfil mala gestión pierde más"],
    visualReview: "No",
    acceptance: ["Informe accionable"],
    humanGate: id === "ZZ-173",
    filesHint: ["scripts/sim-harness.mjs", "docs/BALANCE_REPORT.md"],
  });
});

// ——— S Release ———
[
  ["ZZ-180", "Migraciones save v5+", "Compat saves antiguos."],
  ["ZZ-181", "Smoke E2E móvil+desktop", "Suite completa."],
  ["ZZ-182", "Perf mapa", "FPS/pan aceptable."],
  ["ZZ-183", "Deploy bajo orden explícita", "Solo si se pide."],
  ["ZZ-184", "Hotfix post-lanzamiento", "Proceso."],
].forEach(([id, name, objective], i, arr) => {
  P({
    id,
    name,
    block: "S · Producción / release",
    objective,
    systems: ["release"],
    deps: i === 0 ? ["ZZ-173", "ZZ-165"] : [arr[i - 1][0]],
    tasks: ["§ release"],
    data: [],
    assets: [],
    autoTests: ["e2e"],
    funcTests: ["Checklist release"],
    visualReview: id === "ZZ-181" ? "Sí" : "No",
    acceptance: ["No deploy sin orden"],
    humanGate: id === "ZZ-183",
    filesHint: ["js/save.js", "scripts/"],
  });
});

// Extra detail subphases for construction/pop/feedback often missing
P({
  id: "ZZ-024",
  name: "Construcción flujo selecciono→coloco→construyen",
  block: "C · Loop D2–D5",
  objective: "Lista filtrada, preview fantasma solo en modo build, pago recursos, aparece edificio.",
  systems: ["construcción"],
  deps: ["ZZ-021"],
  tasks: ["§9", "Sin Tetris", "Radio colocación cluster"],
  data: ["buildings.json"],
  assets: [],
  autoTests: ["place building"],
  funcTests: ["D1 farm place"],
  visualReview: "Sí",
  acceptance: ["Preview solo en build mode"],
  humanGate: false,
  filesHint: ["js/build.js"],
});

P({
  id: "ZZ-025",
  name: "Crecimiento población abstracto",
  block: "C · Loop D2–D5",
  objective: "Inmigración/rescates/natalidad rara según §26; límites housing/food.",
  systems: ["población"],
  deps: ["ZZ-030"],
  tasks: ["§26"],
  data: ["balance immigration"],
  assets: [],
  autoTests: ["immigration gates"],
  funcTests: ["Sin housing no crece"],
  visualReview: "No",
  acceptance: ["Sin parejas Sims"],
  humanGate: false,
  filesHint: ["js/sim.js"],
});

P({
  id: "ZZ-026",
  name: "Feedback acciones importantes",
  block: "C · Loop D2–D5",
  objective: "Toast/log/card por construir, explorar, ataque, tech, era, logro.",
  systems: ["feedback", "UX"],
  deps: ["ZZ-020"],
  tasks: ["§32 matriz"],
  data: [],
  assets: ["sfx opcionales"],
  autoTests: ["events emit"],
  funcTests: ["Cada acción clave tiene feedback"],
  visualReview: "Parcial",
  acceptance: ["Matriz §32 cubierta"],
  humanGate: false,
  filesHint: ["js/ui-feedback.js"],
});

P({
  id: "ZZ-027",
  name: "Exploradores: recluta, muerte, dolor",
  block: "C · Loop D2–D5",
  objective: "Máx 3; muerte permanente; recluta desde pop; nuevo verde.",
  systems: ["exploradores"],
  deps: ["ZZ-022"],
  tasks: ["§3"],
  data: ["survivors names", "balance explorers"],
  assets: ["retratos"],
  autoTests: ["death permanent", "recruit cooldown"],
  funcTests: ["Perder explorador duele"],
  visualReview: "Sí",
  acceptance: ["No RPG partido", "Nombre editable"],
  humanGate: false,
  filesHint: ["js/explorers.js"],
});

// Sort by id numerically
phases.sort((a, b) => {
  const na = parseInt(a.id.replace("ZZ-", ""), 10);
  const nb = parseInt(b.id.replace("ZZ-", ""), 10);
  return na - nb;
});

const humanGates = phases.filter((p) => p.humanGate).map((p) => p.id);

function phaseMarkdown(p) {
  return `### ${p.id} — ${p.name}

| Campo | Valor |
|-------|-------|
| **Bloque** | ${p.block} |
| **HUMAN_GATE** | ${p.humanGate ? "**YES**" : "NO"} |
| **Objetivo** | ${p.objective} |
| **Sistemas** | ${p.systems.join(", ") || "—"} |
| **Dependencias** | ${p.deps.join(", ") || "ninguna"} |
| **Archivos approx.** | ${p.filesHint.join(", ") || "—"} |
| **Datos/contenido** | ${p.data.join(", ") || "—"} |
| **Assets** | ${p.assets.join(", ") || "ninguno"} |
| **Pruebas automáticas** | ${p.autoTests.join("; ") || "—"} |
| **Pruebas funcionales** | ${p.funcTests.join("; ") || "—"} |
| **Revisión visual** | ${p.visualReview} |

**Tareas concretas:**
${p.tasks.map((t) => `- ${t}`).join("\n")}

**Criterio exacto de aceptación:**
${p.acceptance.map((t) => `- ${t}`).join("\n")}

`;
}

function buildPlan() {
  const byBlock = new Map();
  for (const p of phases) {
    if (!byBlock.has(p.block)) byBlock.set(p.block, []);
    byBlock.get(p.block).push(p);
  }

  let md = `# Zona Zero — Plan de implementación técnico (Diseño 2.1)

**Estado:** Contrato de ejecución — **NO IMPLEMENTAR** hasta que ChatGPT apruebe GAME_MASTER + este plan (fase ZZ-001).  
**Protocolo:** \`ZONA_ZERO_DEVELOPMENT_LOG.md\` (Drive) / \`docs/DEVELOPMENT_LOG.md\` (repo).  
**Stack:** HTML/CSS/JS + PHP + MySQL · contenido en \`content/*.json\`.  
**IDs:** \`ZZ-XXX\` (orden numérico + dependencias).

---

## 0. Reglas de ejecución (Cursor ↔ ChatGPT)

1. Leer GAME_MASTER 2.1 antes de cada fase.  
2. Tras cada fase: tests → capturas si aplica → commit → push → actualizar DEVELOPMENT_LOG → \`ESTADO REVISIÓN: PENDIENTE DE REVISIÓN\`.  
3. Continuar a la siguiente **solo si** no hay \`HUMAN_GATE: YES\` pendiente de \`APROBADA\` + \`APROBACIÓN FINAL CHATGPT: SÍ\`.  
4. Silencio / “se ve mejor” / tests verdes **NO** son aprobación.  
5. No hardcodear balance en UI.  
6. No deploy salvo orden explícita (ZZ-183).  
7. Drive y GitHub siempre sincronizados en los 3 docs maestros.

### HUMAN_GATE (lista canónica)

${humanGates.map((id) => `- ${id}`).join("\n")}

**Total fases:** ${phases.length}  
**Con HUMAN_GATE:** ${humanGates.length}

---

## 1. Índice por bloque

| Bloque | Fases | Gates |
|--------|-------|-------|
`;

  for (const [block, list] of byBlock) {
    const gates = list.filter((p) => p.humanGate).map((p) => p.id).join(", ") || "—";
    md += `| ${block} | ${list.map((p) => p.id).join(", ")} (${list.length}) | ${gates} |\n`;
  }

  md += `
---

## 2. Grafo de dependencias (resumen)

\`\`\`
ZZ-001 (GATE diseño)
  ├─ ZZ-002 → ZZ-003 → ZZ-004/ZZ-005 → ZZ-006
  └─ ZZ-010…ZZ-015 (GATE D1) → ZZ-020…ZZ-027
        ├─ ZZ-030…ZZ-035 vivienda
        ├─ ZZ-040…ZZ-045 clima (GATE invierno)
        ├─ ZZ-050…ZZ-053 salud
        ├─ ZZ-060…ZZ-065 defensa (GATE)
        ├─ ZZ-070…ZZ-073 territorio (GATE mapa)
        ├─ ZZ-080…ZZ-083 research
        ├─ ZZ-090…ZZ-093 vehículos
        ├─ ZZ-100…ZZ-106 misiones (GATE)
        ├─ ZZ-110…ZZ-113 logros
        ├─ ZZ-120…ZZ-125 director (GATE)
        ├─ ZZ-130…ZZ-133 humanos (GATE go/no-go)
        ├─ ZZ-140…ZZ-144 victoria (GATE)
        ├─ ZZ-150…ZZ-154 UX (GATE)
        ├─ ZZ-160…ZZ-165 arte (GATE)
        ├─ ZZ-170…ZZ-173 sim (GATE)
        └─ ZZ-180…ZZ-184 release (GATE deploy)
\`\`\`

---

## 3. Fases detalladas

`;

  for (const [block, list] of byBlock) {
    md += `\n## ${block}\n\n`;
    for (const p of list) md += phaseMarkdown(p);
  }

  md += `
---

## 4. Conteos

| Métrica | Valor |
|---------|-------|
| Total fases/subfases | **${phases.length}** |
| HUMAN_GATE YES | **${humanGates.length}** |
| HUMAN_GATE NO | ${phases.length - humanGates.length} |

---

## 5. Sync Drive

| Doc | Drive | Repo |
|-----|-------|------|
| Biblia | \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_GAME_MASTER.md\` | \`GAME_MASTER.md\` |
| Plan | \`...\\\\ZONA_ZERO_IMPLEMENTATION_PLAN.md\` | \`docs/IMPLEMENTATION_PLAN.md\` |
| Log | \`...\\\\ZONA_ZERO_DEVELOPMENT_LOG.md\` | \`docs/DEVELOPMENT_LOG.md\` |

---

*Fin del plan técnico 2.1 — contrato de fases ZZ-XXX.*
`;

  return md;
}

function logSection(p) {
  return `# FASE ${p.id} — ${p.name}

## PLAN
${p.objective}

**Bloque:** ${p.block}  
**HUMAN_GATE:** ${p.humanGate ? "YES" : "NO"}  
**Dependencias:** ${p.deps.join(", ") || "ninguna"}  
**Sistemas:** ${p.systems.join(", ") || "—"}  
**Tareas previstas:** ${p.tasks.join("; ") || "—"}  
**Aceptación:** ${p.acceptance.join("; ") || "—"}

## RESULTADO CURSOR
Pendiente de ejecución (fase no iniciada).

## ARCHIVOS MODIFICADOS
—

## PRUEBAS
—

## CAPTURAS
—

## PROBLEMAS / LIMITACIONES
—

## COMMIT
—

## ESTADO CURSOR
NO INICIADA

## REVISIÓN CHATGPT
Pendiente inicialmente.

## ESTADO REVISIÓN
PENDIENTE DE REVISIÓN

## CORRECCIONES SOLICITADAS
—

## RESPUESTA CURSOR A LA REVISIÓN
—

## APROBACIÓN FINAL CHATGPT
NO

---

`;
}

function buildLog() {
  let md = `# Zona Zero — DEVELOPMENT LOG (Cursor ↔ ChatGPT)

**Versión protocolo:** 1.0 · **Fecha:** 2026-08-15  
**Estado global:** Diseño/plan en revisión — **PROHIBIDO implementar código de juego** hasta ZZ-001 APROBADA.  
**Drive:** \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_DEVELOPMENT_LOG.md\`  
**Repo:** \`docs/DEVELOPMENT_LOG.md\`

---

## Protocolo (obligatorio)

1. Tras cada fase ejecutada: tests → capturas si aplica → commit → push → actualizar esta sección → \`ESTADO REVISIÓN: PENDIENTE DE REVISIÓN\`.  
2. Si \`HUMAN_GATE: YES\`: **no** continuar a dependientes hasta \`ESTADO REVISIÓN: APROBADA\` **y** \`APROBACIÓN FINAL CHATGPT: SÍ\`.  
3. Si \`CAMBIOS SOLICITADOS\`: implementar correcciones → nueva ronda (no borrar historial) → volver a \`PENDIENTE DE REVISIÓN\`.  
4. Historial de rondas: \`REVISIÓN CHATGPT — RONDA N\` / \`RESPUESTA CURSOR — RONDA N\`.  
5. **Nunca** interpretar silencio, elogios o tests verdes como aprobación.  
6. Tras cualquier cambio documental: sync Drive = GitHub.

### Aprobación literal requerida

\`\`\`
ESTADO REVISIÓN: APROBADA
APROBACIÓN FINAL CHATGPT: SÍ
\`\`\`

---

## Tablero rápido

| ID | Nombre | HUMAN_GATE | ESTADO CURSOR | ESTADO REVISIÓN | APROBACIÓN FINAL |
|----|--------|------------|---------------|-----------------|------------------|
`;

  for (const p of phases) {
    md += `| ${p.id} | ${p.name} | ${p.humanGate ? "YES" : "NO"} | NO INICIADA | PENDIENTE DE REVISIÓN | NO |\n`;
  }

  md += `
---

## Secciones por fase

`;

  for (const p of phases) md += logSection(p);

  md += `
## Notas de sincronización

- Actualizar este archivo en **Drive y repo** en el mismo commit documental/de fase.  
- Script auxiliar: \`scripts/sync-game-master-drive.mjs\` (ampliar para incluir DEVELOPMENT_LOG).

---

*Fin DEVELOPMENT_LOG protocolo 1.0 — ${phases.length} fases registradas.*
`;

  return md;
}

// ——— Update GAME_MASTER header with workflow + third doc ———
let gm = fs.readFileSync(path.join(root, "GAME_MASTER.md"), "utf8");
if (!gm.includes("ZONA_ZERO_DEVELOPMENT_LOG")) {
  gm = gm.replace(
    "**Plan técnico Drive:** `G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_IMPLEMENTATION_PLAN.md` · **Repo:** `docs/IMPLEMENTATION_PLAN.md`  \n",
    "**Plan técnico Drive:** `G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_IMPLEMENTATION_PLAN.md` · **Repo:** `docs/IMPLEMENTATION_PLAN.md`  \n**Development log Drive:** `G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_DEVELOPMENT_LOG.md` · **Repo:** `docs/DEVELOPMENT_LOG.md`  \n"
  );
}
if (!gm.includes("# 41. FLUJO CURSOR ↔ CHATGPT")) {
  gm += `

---

# 41. FLUJO CURSOR ↔ CHATGPT (GOBERNANZA)

## 41.1 Documentos maestros (Drive = GitHub)

| Doc | Rol |
|-----|-----|
| GAME_MASTER | Biblia funcional |
| IMPLEMENTATION_PLAN | Fases ZZ-XXX |
| DEVELOPMENT_LOG | Ejecución + revisiones + aprobaciones |

## 41.2 Regla de oro

Una fase solo está cerrada si el log contiene literalmente:

- \`ESTADO REVISIÓN: APROBADA\`
- \`APROBACIÓN FINAL CHATGPT: SÍ\`

Silencio, elogios o tests verdes **no** autorizan.

## 41.3 HUMAN_GATE

Fases marcadas \`HUMAN_GATE: YES\` bloquean el avance a dependientes hasta aprobación.

## 41.4 Prohibición actual

**No implementar código de juego** hasta ZZ-001 (aprobación GAME_MASTER + PLAN) esté APROBADA.

`;
}

// Index update
if (!gm.includes("41. Flujo Cursor")) {
  gm = gm.replace(
    "40. Decisiones que cambian o eliminan el diseño anterior  \n",
    "40. Decisiones que cambian o eliminan el diseño anterior  \n41. Flujo Cursor ↔ ChatGPT (gobernanza)  \n"
  );
}

const plan = buildPlan();
const log = buildLog();

const paths = {
  gmRepo: path.join(root, "GAME_MASTER.md"),
  gmDrive: path.join(driveDir, "ZONA_ZERO_GAME_MASTER.md"),
  planRepo: path.join(root, "docs/IMPLEMENTATION_PLAN.md"),
  planDrive: path.join(driveDir, "ZONA_ZERO_IMPLEMENTATION_PLAN.md"),
  logRepo: path.join(root, "docs/DEVELOPMENT_LOG.md"),
  logDrive: path.join(driveDir, "ZONA_ZERO_DEVELOPMENT_LOG.md"),
};

fs.writeFileSync(paths.gmRepo, gm);
fs.writeFileSync(paths.gmDrive, gm);
fs.writeFileSync(paths.planRepo, plan);
fs.writeFileSync(paths.planDrive, plan);
fs.writeFileSync(paths.logRepo, log);
fs.writeFileSync(paths.logDrive, log);

const report = {
  totalPhases: phases.length,
  humanGates,
  humanGateCount: humanGates.length,
  gmBytes: fs.statSync(paths.gmRepo).size,
  planBytes: fs.statSync(paths.planRepo).size,
  logBytes: fs.statSync(paths.logRepo).size,
  gmMatch: hash(paths.gmRepo) === hash(paths.gmDrive),
  planMatch: hash(paths.planRepo) === hash(paths.planDrive),
  logMatch: hash(paths.logRepo) === hash(paths.logDrive),
  driveDir,
};

fs.writeFileSync(
  path.join(root, "scripts/.last-phase-report.json"),
  JSON.stringify(report, null, 2)
);
console.log(JSON.stringify(report, null, 2));

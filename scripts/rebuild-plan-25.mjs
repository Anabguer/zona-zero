/**
 * Rebuild IMPLEMENTATION_PLAN for GAME_MASTER 2.5 — full alignment, no errata.
 */
import fs from "fs";
import crypto from "crypto";

const phases = [];
const push = (p) =>
  phases.push({
    systems: [],
    deps: [],
    tasks: [],
    data: [],
    assets: [],
    auto: [],
    func: [],
    visual: "No",
    accept: [],
    files: [],
    humanGate: false,
    ...p,
  });

// ——— A Fundación ———
push({
  id: "ZZ-001",
  name: "Aprobar contrato GAME_MASTER 2.5 + este plan",
  block: "A · Fundación",
  objective: "Congelar biblia 2.5 + plan alineado; única puerta a implementación.",
  systems: ["gobernanza", "docs"],
  humanGate: true,
  tasks: ["Revisión ChatGPT de GM 2.5", "Revisión de este plan + matriz cobertura", "Marcar APROBADA solo literal"],
  accept: ["ESTADO REVISIÓN APROBADA + APROBACIÓN SÍ", "Matriz cobertura 100%"],
  auto: ["n/a"],
  func: ["Revisión humana"],
});
push({
  id: "ZZ-002",
  name: "Auditoría motor vs GAME_MASTER 2.5",
  block: "A · Fundación",
  objective: "Matriz código↔diseño 2.5 (conservar/reescribir/borrar). Incluir deudas: energía legado, calefacción fuel, techs stub.",
  systems: ["deuda técnica"],
  deps: ["ZZ-001"],
  tasks: ["docs/AUDIT_ENGINE.md", "Listar generator/solar/needEnergy a eliminar del load path"],
  accept: ["Sin cambios gameplay aún", "Lista priorizada"],
  files: ["docs/AUDIT_ENGINE.md"],
});
push({
  id: "ZZ-003",
  name: "Schemas content 2.5",
  block: "A · Fundación",
  objective: "Schemas: buildings (sin energy), research (sin rama Energía), seasons, outbreaks, buildingHP, missions templates, achievements, ambientLife.",
  systems: ["content"],
  deps: ["ZZ-002"],
  tasks: ["docs/CONTENT_SCHEMA.md"],
  accept: ["Schemas cubren GM 2.5"],
  files: ["docs/CONTENT_SCHEMA.md"],
});
push({
  id: "ZZ-004",
  name: "Una fuente de mapa (locations)",
  block: "A · Fundación",
  objective: "Deprecar zones.json del load path.",
  systems: ["mapa"],
  deps: ["ZZ-003"],
  accept: ["Solo locations.json activo"],
});
push({
  id: "ZZ-005",
  name: "Balance skeleton 2.5",
  block: "A · Fundación",
  objective: "balance.json: labor per_building, woodHeating, outbreaks, buildingDamage, ambientLife, sin needEnergy/energyDemand.",
  systems: ["balance"],
  deps: ["ZZ-003"],
  accept: ["Load OK", "Sin regresión D1 visual"],
  data: ["balance.json"],
});
push({
  id: "ZZ-006",
  name: "Sync Drive ↔ GitHub de los 3 maestros",
  block: "A · Fundación",
  objective: "Hash idéntico GM/PLAN/LOG.",
  systems: ["docs"],
  deps: ["ZZ-001"],
  accept: ["Hashes iguales"],
});

// ——— B D1 ———
[
  ["ZZ-010", "Colonia física D1 sin GIS", true, "Colonia legible; sin círculo/GIS."],
  ["ZZ-011", "Cámara D1 protagonista", false, "Zoom/pan/recenter."],
  ["ZZ-012", "Tutorial D1 por acciones", true, "Una acción/explicación; sin cascada Continuar."],
  ["ZZ-013", "HUD recursos D1", false, "Comida/agua/madera legibles; sin Au/Gu."],
  ["ZZ-014", "Desktop 1920 D1", true, "Panel+mundo; no vacío."],
  ["ZZ-015", "QA D1 + contact sheet", true, "Smoke+capturas; PARAR hasta APROBADA."],
].forEach(([id, name, gate, objective], i, arr) => {
  push({
    id,
    name,
    block: "B · Experiencia D1",
    objective,
    systems: ["UX D1", "mapa", "onboarding"],
    deps: i === 0 ? ["ZZ-001", "ZZ-005"] : [arr[i - 1][0]],
    humanGate: gate,
    visual: "Sí",
    auto: ["smoke-d1"],
    func: ["Partida nueva D1"],
    accept: [objective, gate ? "Gate humano" : "OK móvil+desktop"],
  });
});

// ——— C Loop ———
[
  ["ZZ-020", "Brief diario ritual", false, "Balance comida/agua (+ madera si frío)."],
  ["ZZ-021", "Staffing por edificio canónico", true, "Único modelo +/-; resumen población SO."],
  ["ZZ-022", "Exploración D3–D5 mínima", false, "Reveal→enviar→ruta→retorno."],
  ["ZZ-023", "QA D1→D5", true, "Loop estable; gate."],
  ["ZZ-024", "Construcción selecciono→coloco", false, "Preview solo en build; sin Tetris."],
  ["ZZ-025", "Crecimiento población abstracto", false, "Inmigración/rescates; límites housing."],
  ["ZZ-026", "Feedback acciones clave", false, "Matriz §32."],
  ["ZZ-027", "Exploradores muerte/recluta", false, "Máx 3; dolor real; sin RPG 100."],
].forEach(([id, name, gate, objective], i, arr) => {
  push({
    id,
    name,
    block: "C · Loop D2–D5",
    objective,
    systems: ["sim", "colony", "exploración"],
    deps: i === 0 ? ["ZZ-015"] : [arr[i - 1][0]],
    humanGate: gate,
    visual: gate || id === "ZZ-022" ? "Sí" : "Parcial",
    accept: [objective],
  });
});

// ——— D Vivienda / agua ———
[
  ["ZZ-030", "Capacidad vivienda + overflow", false],
  ["ZZ-031", "Protección climática por tipo", false],
  ["ZZ-032", "Vivienda aislada + tech insulation", true],
  ["ZZ-033", "Alertas cobertura / madera estimada", false],
  ["ZZ-034", "Pozo fuente ≠ cisterna reserva", false],
  ["ZZ-035", "Soft-caps storage + cisterna agua", false],
  ["ZZ-036", "Estabilidad factores UI secundaria", false],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "D · Vivienda y agua",
    objective: name + " según GM §4–7.",
    systems: ["vivienda", "agua", "recursos"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    data: ["buildings.json"],
    accept: ["Pozo produce; cisterna buffer/soft-cap/lluvia", "Sin alquiler diario"],
    visual: gate ? "Sí" : "No",
  });
});

// ——— E Clima madera ———
[
  ["ZZ-040", "Ciclo estaciones en state", false, "Primavera/verano/otoño/invierno."],
  ["ZZ-041", "Clima puntual + duración", false, "clear/rain/storm/cold/heat/fog + eventos."],
  ["ZZ-042", "Pipeline aviso→prep→consecuencia", false, "Nunca castigo imposible de prever."],
  ["ZZ-043", "Calefacción automática MADERA", false, "maderaNecesariaCalefacción(pop,prot,sev); auto; NO fuel."],
  ["ZZ-044", "Exposición acumulativa frío", false, "verde→ámbar→rojo; no enfermar 1 noche."],
  ["ZZ-045", "Aviso previo + estimación reserva madera", false, "HUD/brief: madera/día y días reserva."],
  ["ZZ-046", "Impacto clima en prod/exploración/salud", false, "Tablas §11."],
  ["ZZ-047", "Feedback visual clima", false, "Partículas/tono; chimeneas si calefacción."],
  ["ZZ-048", "QA invierno forzado + gate", true, "Escenario frío; wood heat; exposición; capturas."],
].forEach(([id, name, gate, objective], i, arr) => {
  push({
    id,
    name,
    block: "E · Clima e invierno (madera)",
    objective,
    systems: ["clima", "madera", "vivienda", "salud"],
    deps: i === 0 ? ["ZZ-031", "ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: id === "ZZ-047" || gate ? "Sí" : "No",
    auto: ["woodHeating math", "exposure thresholds"],
    func: ["Aviso ≥1 día antes", "Sin fuel en calefacción"],
    accept: ["Fuel no calienta", "Exposición progresiva", gate ? "HUMAN_GATE invierno" : "OK"],
  });
});

// ——— F Salud brotes ———
[
  ["ZZ-050", "Camas médicas + curación agregada", false],
  ["ZZ-051", "Cadena botiquín→enfermería→clínica", false],
  ["ZZ-052", "Explorador wounded/sick timings", false],
  ["ZZ-053", "Motor brotes probabilístico (sin calendario)", false],
  ["ZZ-054", "Fases brote germen→propagación→pico→contención/crisis→recuperación", false],
  ["ZZ-055", "Arquetipos brote + factores riesgo/reducción", false],
  ["ZZ-056", "Staffing sanitario + prod solo por sick/reasignación", false],
  ["ZZ-057", "Protocolo cuarentena pasivo (tech)", false],
  ["ZZ-058", "Feedback semáforo salud + alertas brote", false],
  ["ZZ-059", "QA crisis sanitaria completa + gate", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "F · Salud y brotes",
    objective: name + " (GM §12).",
    systems: ["salud", "brotes", "research", "staffing"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: id === "ZZ-058" || gate ? "Sí" : "No",
    auto: [
      "outbreak no fixed day",
      "quarantine reduces spread/duration",
      "no artificial prod penalty",
      "contained vs escalate scenarios",
    ],
    func: ["Reasignar a enfermería baja contagio esperado", "Tech cuarentena pasiva"],
    accept: [
      "Sin calendario fijo",
      "Prod↓ solo sick+reasignación",
      "Cuarentena no toggle",
      gate ? "HUMAN_GATE crisis sanitaria jugable" : "OK",
    ],
    data: ["outbreaks content", "research quarantine_protocol"],
  });
});

// ——— G Defensa ———
[
  ["ZZ-060", "Defensa agregada legible", false],
  ["ZZ-061", "Ataques prep→resolve→informe", false],
  ["ZZ-062", "Infectados tipados afectan combate", false],
  ["ZZ-063", "Munición y armería", false],
  ["ZZ-064", "Recuperación post-ataque Director", false],
  ["ZZ-065", "QA ataque + recuperación visual", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "G · Defensa e infectados",
    objective: name,
    systems: ["defensa", "infectados"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: gate ? "Sí" : "Parcial",
    accept: ["No combate manual", "Informe bajas/daños"],
  });
});

// ——— G2 Daño reparación ———
[
  ["ZZ-066", "HP/estados estructurales edificios", false, "ok→damaged→critical→destroyed."],
  ["ZZ-067", "Daño por hordas/eventos/tormentas + perímetro", false, "Perímetro roto → interiores."],
  ["ZZ-068", "Acción Reparar (coste/tiempo/workers) + alerta localizar", false, "Aviso N edificios; tap→resaltar."],
  ["ZZ-069", "QA visual daño→reparación→recuperación + gate", true, "Capturas estados + flujo repair."],
].forEach(([id, name, gate, objective], i, arr) => {
  push({
    id,
    name,
    block: "G2 · Daño y reparación",
    objective,
    systems: ["edificios", "defensa", "recursos", "staffing"],
    deps: i === 0 ? ["ZZ-061"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: "Sí",
    auto: ["damage reduces output", "repair restores HP", "cost wood/metal"],
    func: ["Tocar dañado→Reparar", "Alerta localiza"],
    accept: ["Sin craft piezas", "Compite con expansión", gate ? "HUMAN_GATE repair visual" : "OK"],
    assets: ["estados daño visual"],
  });
});

// ——— H Territorio ———
[
  ["ZZ-070", "Beneficios reales de control", false],
  ["ZZ-071", "Contested/pérdida fronteriza", false],
  ["ZZ-072", "Loot tables por landmark type", false],
  ["ZZ-073", "Fog/discovered polish (no GIS) + gate", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "H · Territorio",
    objective: name,
    systems: ["mapa", "exploración"],
    deps: i === 0 ? ["ZZ-022"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: gate ? "Sí" : "No",
    accept: ["Control ≠ pintar verde vacío"],
  });
});

// ——— I Research ———
[
  ["ZZ-080", "Banco técnico + lab con workers +/-", false, "Research no UI hasta banco; 1 tech activa; más workers→más progreso."],
  ["ZZ-081", "Árbol utilitario sin Energía + quarantine_protocol", false, "Solo techs con test deseo; sin cuota 20/28; sin generator/solar/power_*."],
  ["ZZ-082", "Cablear efectos reales de cada tech", false, "1 assertion medible por tech."],
  ["ZZ-083", "UI research legible (deseo claro)", true, "Beneficio en lenguaje humano."],
  ["ZZ-084", "Tests suite research + cuarentena pasiva", false, "Cuarentena no toggle/−prod."],
].forEach(([id, name, gate, objective], i, arr) => {
  push({
    id,
    name,
    block: "I · Investigación",
    objective,
    systems: ["research"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: gate ? "Sí" : "No",
    auto: ["no energy branch", "each tech effect", "quarantine passive"],
    accept: ["Sin rama Energía", "Sin número prefijado", "Huerto D1 sin tech"],
    data: ["research.json"],
  });
});

// ——— J Vehicles ———
[
  ["ZZ-090", "Garage + compra vehículos", false],
  ["ZZ-091", "Fuel solo viajes/repair vehicular", false],
  ["ZZ-092", "Efectos speed/cargo/prot", false],
  ["ZZ-093", "UI elegir vehículo en expedición", false],
].forEach(([id, name], i, arr) => {
  push({
    id,
    name,
    block: "J · Vehículos",
    objective: name + " (fuel ≠ calor).",
    systems: ["vehículos", "fuel"],
    deps: i === 0 ? ["ZZ-022", "ZZ-080"] : [arr[i - 1][0]],
    accept: ["Fuel no calienta ni HQ"],
  });
});

// ——— Radio / Centro ———
[
  ["ZZ-094", "Radio: señales/misiones/contactos", false, "Historias; no +% invisible."],
  ["ZZ-095", "Centro expediciones: info riesgo/tiempo/slots", false, "Logística; feedback en ficha salida."],
  ["ZZ-096", "QA roles distintos radio≠centro", false, "Tests que no duplican función."],
].forEach(([id, name, gate, objective], i, arr) => {
  push({
    id,
    name,
    block: "J2 · Radio y Centro de expediciones",
    objective,
    systems: ["radio", "exploración", "misiones"],
    deps: i === 0 ? ["ZZ-022"] : [arr[i - 1][0]],
    humanGate: false,
    accept: ["Roles A GM 2.5", "Ambos edificios"],
  });
});

// ——— K Misiones ———
[
  ["ZZ-100", "Schema missions + state", false],
  ["ZZ-101", "Misiones guía (pocas)", false],
  ["ZZ-102", "Misiones contextuales necesidad", false],
  ["ZZ-103", "Misiones radio/historia/crisis/ambiguas", false],
  ["ZZ-104", "Motor expedición combinatorio placeState×encounter×choice×outcome×aftermath", false],
  ["ZZ-105", "Pesos/cooldown/memoria/antirrepetición/rareza", false],
  ["ZZ-106", "UI objetivo único + recompensas", false],
  ["ZZ-107", "Tests batch muchas expediciones (detección repetición)", false],
  ["ZZ-108", "QA misiones/expediciones variedad + gate", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "K · Misiones y expediciones",
    objective: name,
    systems: ["misiones", "exploración", "director"],
    deps: i === 0 ? ["ZZ-094", "ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: gate || id === "ZZ-106" ? "Sí" : "No",
    auto: ["combinatorial coverage", "anti-repeat metrics"],
    accept: ["No checklist build infinito", "Supermercado≠farmacia", gate ? "HUMAN_GATE" : "OK"],
  });
});

// ——— L Logros ———
["ZZ-110", "ZZ-111", "ZZ-112", "ZZ-113"].forEach((id, i) => {
  const names = [
    "Schema achievements",
    "Tracking + persistencia",
    "Cablear ≥60 logros (sin generator/solar)",
    "Feedback badge no invasivo",
  ];
  push({
    id,
    name: names[i],
    block: "L · Logros",
    objective: names[i],
    systems: ["logros"],
    deps: [i === 0 ? "ZZ-023" : ["ZZ-110", "ZZ-111", "ZZ-112"][i - 1]],
    accept: ["Sin pay-to-win", "Sin logros de electricidad"],
  });
});

// ——— M Director ———
[
  ["ZZ-120", "Pesos Director vs era/estación/estado", false],
  ["ZZ-121", "Memoria flags secuelas", false],
  ["ZZ-122", "Antirrepetición reforzada", false],
  ["ZZ-123", "Quiet nights + post-desastre", false],
  ["ZZ-124", "Catástrofes con aviso", false],
  ["ZZ-125", "Auditoría eventos vs familias + gate", true],
  ["ZZ-126", "Ritmo tensión→crisis→recovery tests", false],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "M · Director y eventos",
    objective: name + " (sin cadencia fija).",
    systems: ["director", "eventos"],
    deps: i === 0 ? ["ZZ-040", "ZZ-053"] : [arr[i - 1][0]],
    humanGate: !!gate,
    accept: ["Nunca cada X días fijo", "Brotes vía pesos"],
  });
});

// ——— N Humans ———
["ZZ-130", "ZZ-131", "ZZ-132", "ZZ-133"].forEach((id, i) => {
  const names = [
    "Contactos por evento (sin 4X)",
    "Comercio evento",
    "UI mínima o solo cards",
    "Go/no-go facciones tras playtest",
  ];
  push({
    id,
    name: names[i],
    block: "N · Otros humanos",
    objective: names[i],
    systems: ["facciones ligeras"],
    deps: [i === 0 ? "ZZ-120" : ["ZZ-130", "ZZ-131", "ZZ-132"][i - 1]],
    humanGate: id === "ZZ-133",
    accept: ["Si no aporta → solo flags"],
  });
});

// ——— O Eras victoria ———
[
  ["ZZ-140", "Unlock eras por indicadores 2.5", false],
  ["ZZ-141", "Victoria multi-condición SIN needEnergy", false],
  ["ZZ-142", "Crisis final variable", false],
  ["ZZ-143", "Endless post-victoria", false],
  ["ZZ-144", "Pantallas victoria/derrota + gate", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "O · Eras y victoria",
    objective: name,
    systems: ["eras", "victoria"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    accept: ["Sin electricidad en victoria", "Culminación no checkbox pop"],
  });
});

// ——— P UX ———
[
  ["ZZ-150", "Sheets móvil/desktop consistentes", true],
  ["ZZ-151", "Alertas prioritizadas", false],
  ["ZZ-152", "Ayuda contextual", false],
  ["ZZ-153", "Diario no spam", false],
  ["ZZ-154", "Accesibilidad básica + gate", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "P · UX mundo",
    objective: name,
    systems: ["UX"],
    deps: i === 0 ? ["ZZ-023"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: "Sí",
    accept: ["Mundo primero; sin pestañas app"],
  });
});

// ——— Q Arte ———
[
  ["ZZ-160", "Assets edificios (insulated, estados daño)", false],
  ["ZZ-161", "Terreno ciudad close-up + gate", true],
  ["ZZ-162", "Landmarks set", false],
  ["ZZ-163", "Props colonia", false],
  ["ZZ-164", "SFX mínimo + mute", false],
  ["ZZ-165", "Review visual por era + gate", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "Q · Arte y audio",
    objective: name + " (sin assets solar/generator obligatorios).",
    systems: ["arte", "audio"],
    deps: i === 0 ? ["ZZ-015"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: "Sí",
    accept: ["Sin dependencia eléctrica"],
  });
});

// ——— Q2 Vida visual ———
[
  ["ZZ-166", "Sistema habitantes ambientales (cap render)", false, "Muestra proporcional; sin fichas individuales."],
  ["ZZ-167", "Movimiento trabajo por edificio staffed", false, "Farm/well/taller/etc."],
  ["ZZ-168", "Animaciones construcción + reparación", false, "Polvo/andamiaje."],
  ["ZZ-169", "Semáforo verde/ámbar/rojo + enfermos", false, "Estados agregados."],
  ["ZZ-170", "Clima visible + explorador ida/vuelta", false, "Ruta silueta."],
  ["ZZ-171", "Actividad/alerta durante hordas", false, "Flash perímetro; refugio."],
  ["ZZ-172", "Perf móvil ambient life + gate", true, "3 y ~100 pop; FPS aceptable."],
].forEach(([id, name, gate, objective], i, arr) => {
  push({
    id,
    name,
    block: "Q2 · Vida visual y movimiento",
    objective,
    systems: ["arte", "UX", "perf"],
    deps: i === 0 ? ["ZZ-021", "ZZ-015"] : [arr[i - 1][0]],
    humanGate: !!gate,
    visual: "Sí",
    auto: ["sprite cap", "perf budget mobile"],
    func: ["Se ve viva sin 100 NPCs"],
    accept: ["No Sims", "Cap render", gate ? "HUMAN_GATE perf+vida" : "OK"],
  });
});

// ——— R Sim ———
[
  ["ZZ-175", "Harness perfiles IA-jugador", false],
  ["ZZ-176", "Métricas batch D30/D100", false],
  ["ZZ-177", "Calibración normal (madera/brotes/ataques)", false],
  ["ZZ-178", "Informe balance + gate", true],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "R · Simulador y balance",
    objective: name,
    systems: ["simulador", "balance"],
    deps: i === 0 ? ["ZZ-120", "ZZ-053", "ZZ-043"] : [arr[i - 1][0]],
    humanGate: !!gate,
    accept: ["Perfil mala gestión pierde más"],
  });
});

// ——— S Release ———
[
  ["ZZ-180", "Migraciones save (sin energy fields)", false],
  ["ZZ-181", "Smoke E2E móvil+desktop", false],
  ["ZZ-182", "Perf mapa + ambient", false],
  ["ZZ-183", "Deploy solo bajo orden + gate", true],
  ["ZZ-184", "Hotfix post-lanzamiento", false],
].forEach(([id, name, gate], i, arr) => {
  push({
    id,
    name,
    block: "S · Release",
    objective: name,
    systems: ["release"],
    deps: i === 0 ? ["ZZ-178", "ZZ-172"] : [arr[i - 1][0]],
    humanGate: !!gate,
    accept: ["No deploy sin orden"],
  });
});

phases.sort((a, b) => parseInt(a.id.slice(3), 10) - parseInt(b.id.slice(3), 10));
const gates = phases.filter((p) => p.humanGate).map((p) => p.id);

// Coverage matrix systems from GM 2.5
const coverage = [
  ["Filosofía / pilares", "ZZ-001", "ZZ-001", "ZZ-001"],
  ["Población colectiva", "ZZ-021,ZZ-025", "ZZ-023", "—"],
  ["Exploradores", "ZZ-027,ZZ-022", "ZZ-023,ZZ-027", "—"],
  ["Vivienda + protección", "ZZ-030..032", "ZZ-032,ZZ-048", "ZZ-032"],
  ["Calefacción madera", "ZZ-043..045", "ZZ-048", "ZZ-048"],
  ["Exposición frío", "ZZ-044", "ZZ-048", "ZZ-048"],
  ["Necesidades colonia", "ZZ-020,ZZ-030..036", "ZZ-023", "—"],
  ["Recursos (sin energía)", "ZZ-005,ZZ-013", "ZZ-015", "—"],
  ["Pozo ≠ cisterna", "ZZ-034,ZZ-035", "ZZ-034", "—"],
  ["Catálogo edificios (sin gen/solar)", "ZZ-002,ZZ-005", "ZZ-002", "—"],
  ["Radio", "ZZ-094", "ZZ-096", "—"],
  ["Centro expediciones", "ZZ-095", "ZZ-096", "—"],
  ["Taller / mejoras=research", "ZZ-080..084", "ZZ-084", "ZZ-083"],
  ["Construcción", "ZZ-024", "ZZ-024", "—"],
  ["Staffing por edificio", "ZZ-021", "ZZ-021", "ZZ-021"],
  ["Clima estaciones", "ZZ-040..048", "ZZ-048", "ZZ-048"],
  ["Salud camas/cadena", "ZZ-050..052", "ZZ-059", "ZZ-059"],
  ["Brotes probabilísticos + fases", "ZZ-053..056", "ZZ-059", "ZZ-059"],
  ["Cuarentena pasiva", "ZZ-057,ZZ-081", "ZZ-059,ZZ-084", "ZZ-059"],
  ["Defensa / ataques", "ZZ-060..065", "ZZ-065", "ZZ-065"],
  ["Daño y reparación edificios", "ZZ-066..069", "ZZ-069", "ZZ-069"],
  ["Infectados tipados", "ZZ-062", "ZZ-065", "—"],
  ["Exploración + plantillas", "ZZ-022,ZZ-104..108", "ZZ-107,ZZ-108", "ZZ-108"],
  ["Territorio / fog", "ZZ-070..073", "ZZ-073", "ZZ-073"],
  ["Vehículos + fuel", "ZZ-090..093", "ZZ-093", "—"],
  ["Research workers + árbol utilitario", "ZZ-080..084", "ZZ-084", "ZZ-083"],
  ["Eventos / Director", "ZZ-120..126", "ZZ-125,ZZ-126", "ZZ-125"],
  ["Misiones variedad", "ZZ-100..108", "ZZ-108", "ZZ-108"],
  ["Alertas / ayuda", "ZZ-151,ZZ-152", "ZZ-154", "ZZ-154"],
  ["Logros", "ZZ-110..113", "ZZ-113", "—"],
  ["Eras", "ZZ-140", "ZZ-144", "—"],
  ["Victoria sin needEnergy", "ZZ-141..144", "ZZ-144", "ZZ-144"],
  ["Derrota", "ZZ-144", "ZZ-144", "ZZ-144"],
  ["UX mundo", "ZZ-150..154", "ZZ-150,ZZ-154", "ZZ-150,ZZ-154"],
  ["Feedback §32", "ZZ-026", "ZZ-026", "—"],
  ["Vida visual §32B", "ZZ-166..172", "ZZ-172", "ZZ-172"],
  ["Arte / sonido", "ZZ-160..165", "ZZ-165", "ZZ-161,ZZ-165"],
  ["Datos/balance", "ZZ-005,ZZ-177", "ZZ-178", "ZZ-178"],
  ["Simulador", "ZZ-175..178", "ZZ-178", "ZZ-178"],
  ["Gobernanza Cursor↔ChatGPT", "ZZ-001,ZZ-006", "ZZ-001", "ZZ-001"],
  ["Electricidad v1", "N/A — FUERA DE ALCANCE", "N/A", "N/A"],
];

function phaseMd(p) {
  return `### ${p.id} — ${p.name}

| Campo | Valor |
|-------|-------|
| **Bloque** | ${p.block} |
| **HUMAN_GATE** | ${p.humanGate ? "**YES**" : "NO"} |
| **Objetivo** | ${p.objective} |
| **Sistemas** | ${(p.systems || []).join(", ") || "—"} |
| **Dependencias** | ${(p.deps || []).join(", ") || "—"} |
| **Archivos approx.** | ${(p.files || []).join(", ") || "—"} |
| **Datos** | ${(p.data || []).join(", ") || "—"} |
| **Assets** | ${(p.assets || []).join(", ") || "—"} |
| **Pruebas auto** | ${(p.auto || []).join("; ") || "—"} |
| **Pruebas funcionales** | ${(p.func || []).join("; ") || "—"} |
| **Revisión visual** | ${p.visual} |

**Tareas:** ${(p.tasks || []).length ? p.tasks.map((x) => x).join("; ") : p.objective}

**Aceptación:**
${(p.accept || []).map((a) => `- ${a}`).join("\n")}

`;
}

const byBlock = new Map();
for (const p of phases) {
  if (!byBlock.has(p.block)) byBlock.set(p.block, []);
  byBlock.get(p.block).push(p);
}

let md = `# Zona Zero — Plan de implementación técnico (GAME_MASTER 2.5)

**Versión plan:** 2.5  
**Estado:** Contrato de ejecución — **NO IMPLEMENTAR** hasta ZZ-001 APROBADA (\`APROBADA\` + \`SÍ\`).  
**Biblia:** GAME_MASTER **2.5** (Drive + repo idénticos).  
**Protocolo:** DEVELOPMENT_LOG · §41 biblia.  
**Stack:** HTML/CSS/JS + PHP + MySQL · \`content/*.json\`.

> Este plan **sustituye** cualquier versión 2.1 y cualquier ERRATA provisional.  
> **Fuera de alcance v1:** electricidad, generator, solar, power_grid/power_hub, needEnergy, calefacción con fuel.

---

## 0. Reglas de ejecución

1. Leer GAME_MASTER **2.5** antes de cada fase.  
2. Tras cada fase: tests → capturas si aplica → commit → push → DEVELOPMENT_LOG → \`PENDIENTE DE REVISIÓN\`.  
3. Si \`HUMAN_GATE: YES\`: no continuar dependientes sin \`APROBADA\` + \`SÍ\`.  
4. Tests verdes / elogios / silencio ≠ aprobación.  
5. Balance solo en content.  
6. Deploy solo ZZ-183 bajo orden.  
7. Sync Drive = GitHub en docs maestros.

### HUMAN_GATE (canónica 2.5)

${gates.map((g) => `- ${g}`).join("\n")}

**Total fases:** ${phases.length}  
**Con HUMAN_GATE:** ${gates.length}

---

## 1. Índice por bloque

| Bloque | Fases | Gates |
|--------|-------|-------|
`;

for (const [block, list] of byBlock) {
  const g = list.filter((p) => p.humanGate).map((p) => p.id).join(", ") || "—";
  md += `| ${block} | ${list.map((p) => p.id).join(", ")} (${list.length}) | ${g} |\n`;
}

md += `
---

## 2. Grafo de dependencias (resumen)

\`\`\`
ZZ-001 (GATE biblia+plan 2.5)
 ├─ ZZ-002..006 fundación
 └─ ZZ-010..015 D1 (GATEs) → ZZ-020..027
      ├─ ZZ-030..036 vivienda/agua
      ├─ ZZ-040..048 clima+madera (GATE invierno)
      ├─ ZZ-050..059 salud/brotes/cuarentena (GATE crisis sanitaria)
      ├─ ZZ-060..065 defensa (GATE)
      ├─ ZZ-066..069 daño/repair (GATE)
      ├─ ZZ-070..073 territorio (GATE)
      ├─ ZZ-080..084 research utilitario (GATE UI)
      ├─ ZZ-090..093 vehículos (fuel)
      ├─ ZZ-094..096 radio ≠ centro
      ├─ ZZ-100..108 misiones/expediciones (GATE)
      ├─ ZZ-110..113 logros
      ├─ ZZ-120..126 director (GATE)
      ├─ ZZ-130..133 humanos (GATE go/no-go)
      ├─ ZZ-140..144 victoria sin energía (GATE)
      ├─ ZZ-150..154 UX (GATE)
      ├─ ZZ-160..165 arte (GATE)
      ├─ ZZ-166..172 vida visual (GATE perf)
      ├─ ZZ-175..178 sim (GATE)
      └─ ZZ-180..184 release (GATE deploy)
\`\`\`

---

## 3. Matriz de cobertura GAME_MASTER 2.5 → PLAN

| Sistema GM | Implementa | Prueba | HUMAN_GATE |
|------------|------------|--------|------------|
`;

for (const row of coverage) {
  md += `| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} |\n`;
}

md += `
**Cobertura objetivo: 100%** de sistemas activos v1. Electricidad = explícitamente fuera.

---

## 4. Fases detalladas

`;

for (const [block, list] of byBlock) {
  md += `\n## ${block}\n\n`;
  for (const p of list) md += phaseMd(p);
}

md += `
---

## 5. Conteos

| Métrica | Valor |
|---------|-------|
| Total fases | **${phases.length}** |
| HUMAN_GATE | **${gates.length}** |
| Nuevos bloques vs plan 2.1 | G2 daño/repair, J2 radio/centro, Q2 vida visual; F y E ampliados |
| Eliminado del alcance | Energía eléctrica / generator / solar / needEnergy / calefacción fuel |

---

## 6. Sync Drive

| Doc | Drive | Repo |
|-----|-------|------|
| Biblia | \`...\\GAME_MASTER\\ZONA_ZERO_GAME_MASTER.md\` | \`GAME_MASTER.md\` |
| Plan | \`...\\ZONA_ZERO_IMPLEMENTATION_PLAN.md\` | \`docs/IMPLEMENTATION_PLAN.md\` |
| Log | \`...\\ZONA_ZERO_DEVELOPMENT_LOG.md\` | \`docs/DEVELOPMENT_LOG.md\` |

---

*Fin plan técnico 2.5 — alineado a GAME_MASTER 2.5.*
`;

fs.writeFileSync("docs/IMPLEMENTATION_PLAN.md", md);
fs.mkdirSync("G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER", { recursive: true });
fs.copyFileSync(
  "docs/IMPLEMENTATION_PLAN.md",
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_IMPLEMENTATION_PLAN.md"
);

// Also copy GM to drive to keep sync
fs.copyFileSync(
  "GAME_MASTER.md",
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_GAME_MASTER.md"
);

fs.writeFileSync(
  "scripts/.plan25-meta.json",
  JSON.stringify(
    {
      total: phases.length,
      gates,
      gateCount: gates.length,
      newBlocks: ["G2 · Daño y reparación", "J2 · Radio y Centro", "Q2 · Vida visual"],
      removedScope: ["electricidad", "generator", "solar", "needEnergy", "fuel heating"],
    },
    null,
    2
  )
);

const h1 = crypto
  .createHash("sha256")
  .update(fs.readFileSync("docs/IMPLEMENTATION_PLAN.md"))
  .digest("hex");
const h2 = crypto
  .createHash("sha256")
  .update(
    fs.readFileSync(
      "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_IMPLEMENTATION_PLAN.md"
    )
  )
  .digest("hex");

console.log(
  JSON.stringify(
    {
      total: phases.length,
      gates: gates.length,
      gateList: gates,
      sync: h1 === h2,
      bytes: fs.statSync("docs/IMPLEMENTATION_PLAN.md").size,
      energyMentionsAsSystem: (md.match(/rama Energía|needEnergy|generator \|/gi) || [])
        .length,
    },
    null,
    2
  )
);

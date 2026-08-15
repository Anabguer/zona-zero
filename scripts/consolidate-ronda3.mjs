import fs from "fs";
import crypto from "crypto";

const repo = "GAME_MASTER.md";
const drive =
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_GAME_MASTER.md";
const planRepo = "docs/IMPLEMENTATION_PLAN.md";
const planDrive =
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_IMPLEMENTATION_PLAN.md";

let t = fs.readFileSync(repo, "utf8");

t = t.replace(
  /\*\*Versión de diseño:\*\* 2\.[0-9]+/,
  "**Versión de diseño:** 2.5"
);

t = t.replace(
  "| `quarantine_drill` | crisis sanitaria | antibiotics | wood | 5 | opcional: −prod leve a cambio de −spread fuerte (decisión) | “aislar para salvar” |",
  "| `quarantine_protocol` (id:`quarantine_drill`) | brotes largos / contagio | antibiotics | wood+medicine | 5 | **pasivo permanente**: −spread y −duración esperada del brote; eficacia escala con camas, staff sanitario, meds, gravedad y azar. **NO toggle. NO −prod artificial.** | “quiero que el próximo brote no se me vaya de las manos” |"
);

const oldStaff = `#### Decisión de staffing
Durante brote, ficha enfermería muestra preview: “+1 worker → −30% riesgo mañana (est.)”. Quitar del aserradero duele en invierno (madera).

#### Conexiones
Director §19/§25 ↔ clima §11 ↔ vivienda overcrowding ↔ medicinas ↔ research medicina ↔ vida visual §32B.`;

const newStaff = `#### Pérdida de producción durante brote (regla 2.5)
La producción cae **solo** por causas reales:
1. Población \`sick\` / aislada que **no trabaja** (agregado).
2. El jugador **reasigna** workers a enfermería/clínica con controles +/- (menos gente en huerto/aserradero/etc.).
**Prohibido** un modificador global artificial de producción “por cuarentena activada”.

#### Protocolo de cuarentena (tech — Ronda 3 CERRADA)
Una vez investigado \`quarantine_protocol\` / \`quarantine_drill\`:
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
Director §19/§25 ↔ clima §11 ↔ vivienda overcrowding ↔ medicinas ↔ research cuarentena §18 ↔ vida visual §32B.`;

if (!t.includes(oldStaff)) {
  console.error("oldStaff block not found");
  process.exit(1);
}
t = t.replace(oldStaff, newStaff);

t = t.replace(
  "**Decisión jugable:** ante un brote, el jugador puede mover trabajadores a sanidad, gastar medicinas, sacrificar producción, cancelar expediciones o priorizar research/infraestructura. Debe existir posibilidad de que una mala preparación convierta un brote pequeño en crisis, pero también de contenerlo.",
  "**Decisión jugable:** ante un brote, el jugador puede mover trabajadores a sanidad (y por tanto dejar de producir en otros edificios), gastar medicinas, cancelar expediciones o priorizar research/infra. La pérdida de producción es consecuencia de enfermos/aislados + reasignación, no un slider de cuarentena. Mala preparación puede convertir un brote pequeño en crisis; buena prep + protocolo lo contiene."
);

t = t.replace(
  "- Factores ↓ riesgo: camas libres, medicinas, staff sanitario, techs medicina, estabilidad, post-protección Director.",
  "- Factores ↓ riesgo: camas libres, medicinas, staff sanitario, techs medicina (esp. protocolo de cuarentena, antibiotics), estabilidad, post-protección Director."
);

t = t.replace(
  "“Aislamiento antes del invierno.” · “Antibióticos porque hay brote.” · “Reparación rápida tras la horda.” · “Coche para la gasolinera lejana.”",
  "“Aislamiento antes del invierno.” · “Protocolo de cuarentena antes del próximo brote.” · “Antibióticos.” · “Reparación rápida tras la horda.” · “Coche para la gasolinera lejana.”"
);

t = t.replace(
  "**CURSOR: PROPUESTA / DUDA — radio vs centro de expediciones**",
  "**CURSOR: PROPUESTA / DUDA — radio vs centro de expediciones** *(CERRADA Ronda 2 → opción A)*"
);

t = t.replace(
  /\*\*CURSOR: PROPUESTA \/ DUDA\*\*  \nÁrbol objetivo 28 techs[\s\S]*?28 bien cableadas\.\n\n/,
  "**CURSOR:** número de techs = orgánico (§18). Duda 20 vs 28 **cerrada**.\n\n"
);

const boardOld = t.match(
  /\*\*DECISIONES CERRADAS — NENI \+ CHATGPT \(Ronda 3\):[\s\S]*?\*\*ZZ-001 sigue NO aprobada\*\*[^\n]*/
);
if (!boardOld) {
  console.error("board block not found");
  process.exit(1);
}

t = t.replace(
  boardOld[0],
  `**DECISIONES CERRADAS — NENI + CHATGPT (Ronda 3):**
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

**ZZ-001 sigue NO aprobada** hasta revisión final ChatGPT de esta consolidación 2.5.`
);

if (!t.includes("## 2.5 (2026-08-15)")) {
  t = t.replace(
    "## 2.4 (2026-08-15) — consolidación Ronda 2 (Neni)",
    `## 2.5 (2026-08-15) — Ronda 3 cerrada
- Protocolo de cuarentena = research permanente; eficacia contextual; sin toggle/−prod artificial.
- HQ sin fuel confirmado; fuel = vehículos.
- Auditoría final de coherencia OK; ZZ-001 pendiente de aprobación formal.

## 2.4 (2026-08-15) — consolidación Ronda 2 (Neni)`
  );
}

t = t.replace(
  "| Plantillas expedición | Variedad | No misiones-build | Repetición | **Keep** |",
  "| Plantillas expedición | Variedad | No misiones-build | Repetición | **Keep** |\n| Protocolo cuarentena | Contener brotes sin micro | No toggle/−prod | Brotes siempre iguales de duros | **Keep** |"
);

// Soft-clean leftover contradiction phrases in tech appendix if any
t = t.replace(
  /opcional: −prod leve a cambio de −spread fuerte \(decisión\)/g,
  "pasivo permanente: −spread/−duración (sin −prod artificial)"
);

fs.writeFileSync(repo, t);
fs.mkdirSync("G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER", { recursive: true });
fs.copyFileSync(repo, drive);

let plan = fs.readFileSync(planRepo, "utf8");
if (!plan.includes("ERRATA 2.5")) {
  plan =
    "> **ERRATA 2.5:** Protocolo de cuarentena = tech pasiva permanente (no toggle, no −prod artificial). Pérdida de prod en brote = sick/aislados + reasignación real de workers. HQ sin fuel. Fases health/research deben reflejar esto.\n\n" +
    plan;
}
fs.writeFileSync(planRepo, plan);
fs.copyFileSync(planRepo, planDrive);

const h1 = crypto.createHash("sha256").update(fs.readFileSync(repo)).digest("hex");
const h2 = crypto.createHash("sha256").update(fs.readFileSync(drive)).digest("hex");
const leftover = (
  t.match(/−prod leve|toggle.*cuarentena|cuarentena activada|activación manual con tradeoff/gi) ||
  []
).length;

console.log(
  JSON.stringify(
    {
      bytes: fs.statSync(repo).size,
      sync: h1 === h2,
      leftoverBad: leftover,
      hasProtocolBlock: t.includes("Protocolo de cuarentena (tech — Ronda 3 CERRADA)"),
      hasAudit25: t.includes("Auditoría final 2.5"),
    },
    null,
    2
  )
);

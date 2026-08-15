import fs from "fs";
import crypto from "crypto";

const driveDir = "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER";
fs.mkdirSync(driveDir, { recursive: true });

function setBoard(id, cursor, review, approval) {
  let log = fs.readFileSync("docs/DEVELOPMENT_LOG.md", "utf8");
  const re = new RegExp(
    `\\| ${id} \\| ([^|]+) \\| (YES|NO) \\| [^|\\n]+ \\| [^|\\n]+ \\| [^|\\n]+ \\|`
  );
  if (!re.test(log)) throw new Error("board " + id);
  log = log.replace(
    re,
    `| ${id} | $1 | $2 | ${cursor} | ${review} | ${approval} |`
  );
  fs.writeFileSync("docs/DEVELOPMENT_LOG.md", log);
}

function patchPhase(id, body) {
  let log = fs.readFileSync("docs/DEVELOPMENT_LOG.md", "utf8");
  const re = new RegExp(
    `# FASE ${id} —[\\s\\S]*?(?=\\n# FASE ZZ-|\\n## Notas|$)`
  );
  if (!re.test(log)) throw new Error("phase " + id);
  log = log.replace(re, body.trimEnd() + "\n\n");
  fs.writeFileSync("docs/DEVELOPMENT_LOG.md", log);
}

const phases = [
  {
    id: "ZZ-002",
    files: "docs/AUDIT_ENGINE.md",
    result:
      "Matriz código↔GM 2.5 creada. P0: electricidad/needEnergy/fuel colonia/parts-tools. P1: wood heating, brotes, radio/centro, cisterna, repair.",
    tests: "Revisión documental de js/* + content/*",
  },
  {
    id: "ZZ-003",
    files: "docs/CONTENT_SCHEMA.md",
    result:
      "Schemas documentados: balance 2.5, buildings, research sin Energía, outbreaks, buildingHP, missions templates, ambientLife, save v5+.",
    tests: "Schema cubre sistemas GM 2.5",
  },
  {
    id: "ZZ-004",
    files: "scripts/smoke.mjs, content/zones.json (DEPRECATED), js/state.js (ya locations-first)",
    result:
      "Runtime ya usaba locations.json. Smoke alineado a locations. zones.json vaciado y marcado DEPRECATED.",
    tests: "node scripts/smoke.mjs OK; smoke-d1 OK",
  },
  {
    id: "ZZ-005",
    files: "content/balance.json",
    result:
      "Skeleton: laborModel=per_building, woodHeating/outbreaks/buildingDamage/ambientLife enabled:false, deprecatedV1.electricity, victory.needEnergy=false. Sin cambiar D1 visual.",
    tests: "smoke + smoke-d1 OK; load balance",
  },
  {
    id: "ZZ-006",
    files: "scripts/sync-masters.mjs, Drive GAME_MASTER/*",
    result: "Hashes idénticos GM/PLAN/LOG Drive↔repo verificados.",
    tests: "SHA256 match ×3",
  },
];

for (const p of phases) {
  setBoard(p.id, "COMPLETADA", "PENDIENTE DE REVISIÓN", "NO");
  patchPhase(
    p.id,
    `# FASE ${p.id} — (ver PLAN 2.5)

## PLAN
Ver IMPLEMENTATION_PLAN 2.5 (§ ${p.id}).

## RESULTADO CURSOR
${p.result}

## ARCHIVOS MODIFICADOS
${p.files}

## PRUEBAS
${p.tests}

## CAPTURAS
—

## PROBLEMAS / LIMITACIONES
—

## COMMIT
(foundation batch)

## ESTADO CURSOR
COMPLETADA

## REVISIÓN CHATGPT
Pendiente (fase sin HUMAN_GATE; se puede revisar en bloque fundación).

## ESTADO REVISIÓN
PENDIENTE DE REVISIÓN

## CORRECCIONES SOLICITADAS
—

## RESPUESTA CURSOR A LA REVISIÓN
—

## APROBACIÓN FINAL CHATGPT
NO
`
  );
}

function sync() {
  fs.copyFileSync("GAME_MASTER.md", `${driveDir}/ZONA_ZERO_GAME_MASTER.md`);
  fs.copyFileSync(
    "docs/IMPLEMENTATION_PLAN.md",
    `${driveDir}/ZONA_ZERO_IMPLEMENTATION_PLAN.md`
  );
  fs.copyFileSync(
    "docs/DEVELOPMENT_LOG.md",
    `${driveDir}/ZONA_ZERO_DEVELOPMENT_LOG.md`
  );
  const pairs = [
    ["GAME_MASTER.md", `${driveDir}/ZONA_ZERO_GAME_MASTER.md`],
    [
      "docs/IMPLEMENTATION_PLAN.md",
      `${driveDir}/ZONA_ZERO_IMPLEMENTATION_PLAN.md`,
    ],
    ["docs/DEVELOPMENT_LOG.md", `${driveDir}/ZONA_ZERO_DEVELOPMENT_LOG.md`],
  ];
  for (const [a, b] of pairs) {
    const ha = crypto.createHash("sha256").update(fs.readFileSync(a)).digest("hex");
    const hb = crypto.createHash("sha256").update(fs.readFileSync(b)).digest("hex");
    if (ha !== hb) throw new Error("mismatch " + a);
  }
  const verify = `stamp=${new Date().toISOString()}
GM=${crypto.createHash("sha256").update(fs.readFileSync("GAME_MASTER.md")).digest("hex")}
PLAN=${crypto.createHash("sha256").update(fs.readFileSync("docs/IMPLEMENTATION_PLAN.md")).digest("hex")}
LOG=${crypto.createHash("sha256").update(fs.readFileSync("docs/DEVELOPMENT_LOG.md")).digest("hex")}
ZZ-001=APROBADA
next_HUMAN_GATE=ZZ-010
foundation=ZZ-002..ZZ-006 done
`;
  fs.writeFileSync(`${driveDir}/SYNC_VERIFY.txt`, verify);
  fs.writeFileSync("docs/SYNC_VERIFY.txt", verify);
  console.log(verify);
}

sync();
console.log("log phases 002-006 updated + synced");

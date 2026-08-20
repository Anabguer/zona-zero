import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";

const driveDir = "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER";
fs.mkdirSync(driveDir, { recursive: true });

function syncMasters() {
  fs.copyFileSync("GAME_MASTER.md", `${driveDir}/ZONA_ZERO_GAME_MASTER.md`);
  fs.copyFileSync(
    "docs/IMPLEMENTATION_PLAN.md",
    `${driveDir}/ZONA_ZERO_IMPLEMENTATION_PLAN.md`
  );
  fs.copyFileSync(
    "docs/DEVELOPMENT_LOG.md",
    `${driveDir}/ZONA_ZERO_DEVELOPMENT_LOG.md`
  );
}

function hash(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function assertSync() {
  const pairs = [
    ["GAME_MASTER.md", `${driveDir}/ZONA_ZERO_GAME_MASTER.md`],
    ["docs/IMPLEMENTATION_PLAN.md", `${driveDir}/ZONA_ZERO_IMPLEMENTATION_PLAN.md`],
    ["docs/DEVELOPMENT_LOG.md", `${driveDir}/ZONA_ZERO_DEVELOPMENT_LOG.md`],
  ];
  for (const [a, b] of pairs) {
    if (hash(a) !== hash(b)) throw new Error(`hash mismatch ${a}`);
  }
}

function patchLogPhase(id, patch) {
  let log = fs.readFileSync("docs/DEVELOPMENT_LOG.md", "utf8");
  const re = new RegExp(
    `# FASE ${id} —[\\s\\S]*?(?=\\n# FASE ZZ-|\\n## Notas|$)`
  );
  if (!re.test(log)) throw new Error(`phase ${id} not found`);
  log = log.replace(re, patch.trimEnd() + "\n\n");
  fs.writeFileSync("docs/DEVELOPMENT_LOG.md", log);
}

function setBoard(id, cursor, review, approval) {
  let log = fs.readFileSync("docs/DEVELOPMENT_LOG.md", "utf8");
  const re = new RegExp(
    `\\| ${id} \\| ([^|]+) \\| (YES|NO) \\| [^|]+ \\| [^|]+ \\| [^|]+ \\|`
  );
  if (!re.test(log)) throw new Error(`board row ${id} not found`);
  log = log.replace(
    re,
    `| ${id} | $1 | $2 | ${cursor} | ${review} | ${approval} |`
  );
  fs.writeFileSync("docs/DEVELOPMENT_LOG.md", log);
}

function gitCommit(msg, body) {
  execSync('git -c safe.directory="*" add -A -- docs GAME_MASTER.md content scripts/smoke.mjs content/zones.json', {
    stdio: "inherit",
    shell: true,
  });
  // more careful add below in caller
}

// ——— ZZ-001 close ———
setBoard("ZZ-001", "COMPLETADA", "APROBADA", "SÍ");
patchLogPhase(
  "ZZ-001",
  `# FASE ZZ-001 — Aprobar contrato GAME_MASTER 2.5 + plan

## PLAN
Congelar biblia 2.5 + IMPLEMENTATION_PLAN 2.5 alineado (cobertura 100%).

## RESULTADO CURSOR
Contrato cerrado tras aprobación formal ChatGPT.

## ARCHIVOS MODIFICADOS
- GAME_MASTER.md / Drive ZONA_ZERO_GAME_MASTER.md
- docs/IMPLEMENTATION_PLAN.md / Drive ZONA_ZERO_IMPLEMENTATION_PLAN.md
- docs/DEVELOPMENT_LOG.md

## PRUEBAS
Revisión humana ChatGPT (ZZ-001).

## CAPTURAS
—

## PROBLEMAS / LIMITACIONES
—

## COMMIT
(cierre ZZ-001)

## ESTADO CURSOR
COMPLETADA

## REVISIÓN CHATGPT — RONDA 1
Plan desalineado; CAMBIOS SOLICITADOS.

## RESPUESTA CURSOR — RONDA 1
Plan 2.5 + matriz cobertura.

## REVISIÓN CHATGPT — RONDA 2 (final)
Aprobación formal: GAME_MASTER 2.5 + IMPLEMENTATION_PLAN 2.5 (128 fases, 25 HUMAN_GATE, matriz, sistemas 2.5).

## ESTADO REVISIÓN
APROBADA

## CORRECCIONES SOLICITADAS
—

## RESPUESTA CURSOR A LA REVISIÓN
Cierre documental aplicado. Implementación ZZ-002+ autorizada.

## APROBACIÓN FINAL CHATGPT
SÍ

**Contrato autorizado:** GAME_MASTER 2.5 + IMPLEMENTATION_PLAN 2.5.
`
);

syncMasters();
assertSync();
console.log("ZZ-001 log closed + synced");

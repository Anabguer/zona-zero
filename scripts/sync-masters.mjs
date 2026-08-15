/**
 * ZZ-006 — sync 3 maestros Drive ↔ repo + hash check
 */
import fs from "fs";
import crypto from "crypto";

const driveDir = "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER";
fs.mkdirSync(driveDir, { recursive: true });

const pairs = [
  ["GAME_MASTER.md", `${driveDir}/ZONA_ZERO_GAME_MASTER.md`],
  ["docs/IMPLEMENTATION_PLAN.md", `${driveDir}/ZONA_ZERO_IMPLEMENTATION_PLAN.md`],
  ["docs/DEVELOPMENT_LOG.md", `${driveDir}/ZONA_ZERO_DEVELOPMENT_LOG.md`],
];

for (const [repo, drive] of pairs) {
  fs.copyFileSync(repo, drive);
}

function h(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

let ok = true;
for (const [repo, drive] of pairs) {
  const a = h(repo);
  const b = h(drive);
  console.log(repo, a === b ? "MATCH" : "FAIL", a.slice(0, 12));
  if (a !== b) ok = false;
}
if (!ok) process.exit(1);
console.log("ZZ-006 SYNC OK");

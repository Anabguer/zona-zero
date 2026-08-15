import fs from "fs";
import crypto from "crypto";

const plan = fs.readFileSync("docs/IMPLEMENTATION_PLAN.md", "utf8");
const phaseRe = /### (ZZ-\d+) — (.+)/g;
const phases = [];
let m;
while ((m = phaseRe.exec(plan))) {
  const id = m[1];
  const name = m[2];
  const slice = plan.slice(m.index, m.index + 900);
  const gate = /\*\*HUMAN_GATE\*\* \| \*\*YES\*\*/.test(slice);
  phases.push({ id, name, gate });
}

let log = `# Zona Zero — DEVELOPMENT LOG (Cursor ↔ ChatGPT)

**Versión protocolo:** 1.2 · anclado a GAME_MASTER **2.5** + PLAN **2.5**  
**Fecha:** 2026-08-15  
**Estado global:** ZZ-001 en revisión — **PROHIBIDO implementar código** hasta APROBADA + SÍ.  
**Drive:** \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_DEVELOPMENT_LOG.md\`  
**Repo:** \`docs/DEVELOPMENT_LOG.md\`

> Norma: GAME_MASTER §41–§42. Este log es bitácora de ejecución/revisión.

---

## Protocolo (obligatorio)

1. Tras cada fase: tests → capturas → commit → push → actualizar sección → \`PENDIENTE DE REVISIÓN\`.  
2. HUMAN_GATE: no continuar sin \`APROBADA\` + \`SÍ\`.  
3. CAMBIOS SOLICITADOS → corregir → RONDA N (no borrar historial).  
4. Silencio/elogios/tests verdes ≠ aprobación.  
5. Sync Drive = GitHub.

### Aprobación literal

\`\`\`
ESTADO REVISIÓN: APROBADA
APROBACIÓN FINAL CHATGPT: SÍ
\`\`\`

---

## Tablero rápido (PLAN 2.5 — ${phases.length} fases)

| ID | Nombre | HUMAN_GATE | ESTADO CURSOR | ESTADO REVISIÓN | APROBACIÓN FINAL |
|----|--------|------------|---------------|-----------------|------------------|
`;

for (const p of phases) {
  const rev = p.id === "ZZ-001" ? "CAMBIOS SOLICITADOS" : "PENDIENTE DE REVISIÓN";
  const cur =
    p.id === "ZZ-001" ? "COMPLETADA (docs plan 2.5)" : "NO INICIADA";
  log += `| ${p.id} | ${p.name} | ${p.gate ? "YES" : "NO"} | ${cur} | ${rev} | NO |\n`;
}

log += `
---

## Secciones por fase

`;

for (const p of phases) {
  if (p.id === "ZZ-001") {
    log += `# FASE ZZ-001 — Aprobar contrato GAME_MASTER 2.5 + plan

## PLAN
Congelar biblia 2.5 + IMPLEMENTATION_PLAN 2.5 alineado (cobertura 100%).

## RESULTADO CURSOR
Plan 2.1 reconstruido → plan **2.5** (${phases.length} fases). Matriz GM→PLAN. Sin erratas. Sistemas 2.5 con fases propias (brotes, cuarentena, daño/repair, vida visual, radio/centro, clima madera, research sin Energía).

## ARCHIVOS MODIFICADOS
- docs/IMPLEMENTATION_PLAN.md
- docs/DEVELOPMENT_LOG.md
- Drive ZONA_ZERO_IMPLEMENTATION_PLAN.md / ZONA_ZERO_DEVELOPMENT_LOG.md
- scripts/rebuild-plan-25.mjs

## PRUEBAS
Revisión documental + anti-regresión (sin sistema eléctrico v1, sin ERRATA activa, calefacción=madera).

## CAPTURAS
—

## PROBLEMAS / LIMITACIONES
ZZ-001 aún no APROBADA; pendiente re-revisión ChatGPT del plan 2.5.

## COMMIT
(ver push de esta ronda)

## ESTADO CURSOR
COMPLETADA (documentación plan)

## REVISIÓN CHATGPT — RONDA 1
Revisión final GM 2.5: coherente; sin dudas de diseño Neni. ZZ-001 NO aprobada porque el PLAN seguía en 2.1 / erratas / huecos (energía, brotes, repair, vida visual, etc.).

## RESPUESTA CURSOR — RONDA 1
Reconstrucción completa del IMPLEMENTATION_PLAN a versión 2.5 alineada a GAME_MASTER 2.5 + matriz de cobertura + este log actualizado.

## REVISIÓN CHATGPT — RONDA 2
Pendiente (siguiente pasada sobre el plan 2.5).

## ESTADO REVISIÓN
CAMBIOS SOLICITADOS

## CORRECCIONES SOLICITADAS
Alinear plan a GM 2.5; quitar Energía/~28 techs; fases brotes/cuarentena/daño/repair/vida visual/radio-centro/clima madera; matriz cobertura; sin erratas. (Aplicadas en RESPUESTA RONDA 1.)

## RESPUESTA CURSOR A LA REVISIÓN
Plan 2.5 entregado. Listo para nueva revisión ChatGPT.

## APROBACIÓN FINAL CHATGPT
NO

---

`;
    continue;
  }

  log += `# FASE ${p.id} — ${p.name}

## PLAN
Ver IMPLEMENTATION_PLAN 2.5 (§ ${p.id}).

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

log += `
## Notas
- El tablero del plan 2.1 queda **superseded** por este tablero 2.5.
- HUMAN_GATE nuevos clave: ZZ-048 invierno madera, ZZ-059 crisis sanitaria, ZZ-069 repair visual, ZZ-108 variedad expediciones, ZZ-172 vida visual perf.

*Fin DEVELOPMENT_LOG — plan 2.5 / ZZ-001 CAMBIOS SOLICITADOS.*
`;

fs.writeFileSync("docs/DEVELOPMENT_LOG.md", log);
fs.copyFileSync(
  "docs/DEVELOPMENT_LOG.md",
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_DEVELOPMENT_LOG.md"
);
fs.copyFileSync(
  "docs/IMPLEMENTATION_PLAN.md",
  "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_IMPLEMENTATION_PLAN.md"
);

const sync = (a, b) =>
  crypto.createHash("sha256").update(fs.readFileSync(a)).digest("hex") ===
  crypto.createHash("sha256").update(fs.readFileSync(b)).digest("hex");

console.log(
  JSON.stringify(
    {
      phases: phases.length,
      gates: phases.filter((p) => p.gate).length,
      planSync: sync(
        "docs/IMPLEMENTATION_PLAN.md",
        "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_IMPLEMENTATION_PLAN.md"
      ),
      logSync: sync(
        "docs/DEVELOPMENT_LOG.md",
        "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER/ZONA_ZERO_DEVELOPMENT_LOG.md"
      ),
    },
    null,
    2
  )
);

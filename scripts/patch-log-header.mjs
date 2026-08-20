import fs from "fs";

const p = "docs/DEVELOPMENT_LOG.md";
let t = fs.readFileSync(p, "utf8");
const old = `# Zona Zero — DEVELOPMENT LOG (Cursor ↔ ChatGPT)

**Versión protocolo:** 1.0 · **Fecha:** 2026-08-15  
**Estado global:** Diseño/plan en revisión — **PROHIBIDO implementar código de juego** hasta ZZ-001 APROBADA.  
**Drive:** \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_DEVELOPMENT_LOG.md\`  
**Repo:** \`docs/DEVELOPMENT_LOG.md\`

---`;

const neu = `# Zona Zero — DEVELOPMENT LOG (Cursor ↔ ChatGPT)

**Versión protocolo:** 1.1 · anclado a **GAME_MASTER §41–§42** (biblia 2.2)  
**Fecha:** 2026-08-15  
**Estado global:** Diseño/plan en revisión — **PROHIBIDO implementar código de juego** hasta ZZ-001 APROBADA.  
**Drive:** \`G:\\\\Mi unidad\\\\Juegos\\\\Zona Zero\\\\GAME_MASTER\\\\ZONA_ZERO_DEVELOPMENT_LOG.md\`  
**Repo:** \`docs/DEVELOPMENT_LOG.md\`

> El protocolo completo (roles, aprobación literal, HUMAN_GATE, rondas, sync, capturas) está en la biblia: **§41** y **§42**. Este log es la bitácora; la biblia es la norma.

---`;

if (!t.includes("GAME_MASTER §41")) {
  if (!t.includes(old.slice(0, 80))) {
    // try looser replace on first 8 lines
    const lines = t.split(/\r?\n/);
    lines[2] =
      "**Versión protocolo:** 1.1 · anclado a **GAME_MASTER §41–§42** (biblia 2.2)  ";
    lines.splice(
      6,
      0,
      "",
      "> El protocolo completo (roles, aprobación literal, HUMAN_GATE, rondas, sync, capturas) está en la biblia: **§41** y **§42**. Este log es la bitácora; la biblia es la norma."
    );
    t = lines.join("\n");
  } else {
    t = t.replace(old, neu);
  }
  fs.writeFileSync(p, t);
}

const drive = "G:/Mi unidad/Juegos/Zona Zero/GAME_MASTER";
fs.mkdirSync(drive, { recursive: true });
fs.copyFileSync("GAME_MASTER.md", `${drive}/ZONA_ZERO_GAME_MASTER.md`);
fs.copyFileSync(
  "docs/IMPLEMENTATION_PLAN.md",
  `${drive}/ZONA_ZERO_IMPLEMENTATION_PLAN.md`
);
fs.copyFileSync(p, `${drive}/ZONA_ZERO_DEVELOPMENT_LOG.md`);
console.log("synced", t.slice(0, 350));

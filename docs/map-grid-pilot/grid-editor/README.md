# Grid Editor (interno)

Herramienta para que Neni clasifique manualmente celdas sobre el fondo limpio
(`scale-iter-clean-4x2/01-map-clean-no-vehicles-ruins.png`, grid **78×18**).

Separamos **dos capas**:
- **Terrain ("qué hay aquí")**: `dirt`, `road`, `dirt_path`, `vegetation`, `tree`, `ruin`, `vehicle`, `obstacle`.
- **BuildState ("construcción")**: `buildable`, `blocked`, `recoverable`.

## Flujo
1. Abre `index.html` (no integra gameplay).
2. Cambia entre **Mover** y **Pintar**.
3. Elige tipo en la paleta de **terrain** o en la paleta de **construcción**.
4. Usa pincel **1×1 / 2×2 / 3×3** o activa **Selección rectangular**.
5. Exporta con **Exportar JSON** (se guarda también por autosave en localStorage).

## JSON export/import
- Exporta `map_grid.json` con estructura `{ grid, defaults, cells: { "AA7": { terrain, buildState } } }`.
- Base vacía coherente: `map_grid_base.json`.


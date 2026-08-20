/* Editor interno (NO juego público)
   Separación de capas:
   - Capa 1: terrain/content (que hay aquí)
   - Capa 2: buildState (estado de construcción)
*/

(() => {
  const COLS = 78;
  const ROWS = 18;

  const TERRAIN_TYPES = [
    "dirt",
    "road",
    "dirt_path",
    "vegetation",
    "tree",
    "ruin",
    "vehicle",
    "obstacle",
  ];

  const BUILD_STATES = ["buildable", "blocked", "recoverable"];

  const DEFAULT_TERRAIN = "dirt";
  const DEFAULT_BUILD = "blocked";

  const TYPE_META_TERRAIN = {
    dirt: { label: "dirt", color: [40, 180, 70, 78] },
    road: { label: "road", color: [70, 70, 75, 120] },
    dirt_path: { label: "dirt_path", color: [170, 140, 70, 90] },
    vegetation: { label: "vegetation", color: [55, 140, 55, 80] },
    tree: { label: "tree", color: [20, 90, 35, 110] },
    ruin: { label: "ruin", color: [150, 70, 40, 115] },
    vehicle: { label: "vehicle", color: [190, 95, 35, 120] },
    obstacle: { label: "obstacle", color: [110, 85, 45, 100] },
  };

  const TYPE_META_BUILD = {
    buildable: { label: "buildable", color: [40, 180, 70, 90] },
    blocked: { label: "blocked", color: [95, 95, 95, 70] },
    recoverable: { label: "recoverable", color: [200, 170, 70, 95] },
  };

  const STORAGE_KEY = "zz_grid_editor_v2_78x18";

  const el = (id) => document.getElementById(id);
  const canvas = el("canvas");
  const ctx = canvas.getContext("2d");

  const paletteTerrainEl = el("paletteTerrain");
  const paletteBuildEl = el("paletteBuild");
  const statsEl = el("stats");

  const modeMeta = el("modeMeta");
  const cellMeta = el("cellMeta");
  const zoomMeta = el("zoomMeta");
  const panMeta = el("panMeta");

  const toggleGrid = el("toggleGrid");
  const toggleTerrainOverlay = el("toggleTerrainOverlay");
  const toggleBuildOverlay = el("toggleBuildOverlay");
  const toggleLabels = el("toggleLabels");

  const btnModeMove = el("btnModeMove");
  const btnModePaint = el("btnModePaint");
  const btnUndo = el("btnUndo");
  const btnRedo = el("btnRedo");
  const btnErase = el("btnErase");
  const btnReset = el("btnReset");
  const btnExport = el("btnExport");
  const btnImport = el("btnImport");
  const fileImport = el("fileImport");
  const jsonBox = el("jsonBox");

  const btnBrush1 = el("btnBrush1");
  const btnBrush2 = el("btnBrush2");
  const btnBrush3 = el("btnBrush3");
  const toggleRectSelect = el("toggleRectSelect");

  const overridesTerrain = {}; // cid -> terrain
  const overridesBuild = {}; // cid -> buildState

  const Mode = { MOVE: "MOVE", PAINT: "PAINT" };
  let mode = Mode.PAINT;

  // Capa activa para pintar
  let activeLayer = "terrain"; // "terrain" | "build"
  let paintTerrain = "dirt";
  let paintBuild = "buildable";

  let brushSize = 2;

  const undoStack = [];
  const redoStack = [];

  let autosaveTimer = null;
  const autosaveDebounceMs = 450;
  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            schema: "zz-grid-editor-v2",
            overridesTerrain,
            overridesBuild,
            mode,
            activeLayer,
            paintTerrain,
            paintBuild,
            brushSize,
          })
        );
      } catch {}
    }, autosaveDebounceMs);
  }

  function colLetters(index) {
    let n = index;
    let s = "";
    while (true) {
      const r = n % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor(n / 26) - 1;
      if (n < 0) break;
    }
    return s;
  }

  function cidFromIndex(c, r) {
    return `${colLetters(c)}${r + 1}`;
  }

  function indexFromCid(cid) {
    const m = cid.match(/^([A-Z]+)(\d+)$/);
    if (!m) return null;
    const letters = m[1];
    const row = parseInt(m[2], 10) - 1;
    let c = 0;
    for (let i = 0; i < letters.length; i++) {
      c = c * 26 + (letters.charCodeAt(i) - 65 + 1);
    }
    c -= 1;
    if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return null;
    return { c, r: row };
  }

  function cellW() { return imgW / COLS; }
  function cellH() { return imgH / ROWS; }

  let img = new Image();
  let imgW = 4096;
  let imgH = 1360;
  const BG_SRC = "../scale-iter-clean-4x2/01-map-clean-no-vehicles-ruins.png";

  let scale = 0.65;
  let panX = 0;
  let panY = 0;

  let activeRectPreview = null;
  let activeRectStart = null;

  function screenToWorld(sx, sy) {
    return { x: (sx - panX) / scale, y: (sy - panY) / scale };
  }

  function worldToCell(x, y) {
    const c = Math.floor(x / cellW());
    const r = Math.floor(y / cellH());
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { c, r };
  }

  function setMode(nextMode) {
    mode = nextMode;
    modeMeta.textContent = mode === Mode.MOVE ? "MOVER" : activeLayer === "terrain" ? "PINTAR (TERRAIN)" : "PINTAR (BUILD)";
    btnModeMove.classList.toggle("btn--primary", mode === Mode.MOVE);
    btnModePaint.classList.toggle("btn--primary", mode === Mode.PAINT);
  }

  function setPaintTerrain(t) {
    paintTerrain = t;
    activeLayer = "terrain";
    for (const b of paletteTerrainEl.querySelectorAll(".swatchBtn")) {
      b.classList.toggle("swatchBtn--active", b.getAttribute("data-type") === t);
    }
    setMode(mode);
  }

  function setPaintBuild(b) {
    paintBuild = b;
    activeLayer = "build";
    for (const bb of paletteBuildEl.querySelectorAll(".swatchBtn")) {
      bb.classList.toggle("swatchBtn--active", bb.getAttribute("data-type") === b);
    }
    setMode(mode);
  }

  function paletteInit() {
    paletteTerrainEl.innerHTML = "";
    for (const t of TERRAIN_TYPES) {
      const meta = TYPE_META_TERRAIN[t];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatchBtn";
      btn.setAttribute("data-type", t);

      const sw = document.createElement("div");
      sw.className = "swatch";
      const [rr, gg, bb, aa] = meta.color;
      sw.style.background = `rgba(${rr},${gg},${bb},${aa / 255})`;

      const lab = document.createElement("div");
      lab.className = "swatchLabel";
      lab.textContent = meta.label;

      const row = document.createElement("div");
      row.className = "swatchRow";
      row.appendChild(sw);
      row.appendChild(lab);
      btn.appendChild(row);

      btn.addEventListener("click", () => setPaintTerrain(t));
      paletteTerrainEl.appendChild(btn);
    }

    paletteBuildEl.innerHTML = "";
    for (const b of BUILD_STATES) {
      const meta = TYPE_META_BUILD[b];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatchBtn";
      btn.setAttribute("data-type", b);

      const sw = document.createElement("div");
      sw.className = "swatch";
      const [rr, gg, bb, aa] = meta.color;
      sw.style.background = `rgba(${rr},${gg},${bb},${aa / 255})`;

      const lab = document.createElement("div");
      lab.className = "swatchLabel";
      lab.textContent = meta.label;

      const row = document.createElement("div");
      row.className = "swatchRow";
      row.appendChild(sw);
      row.appendChild(lab);
      btn.appendChild(row);

      btn.addEventListener("click", () => setPaintBuild(b));
      paletteBuildEl.appendChild(btn);
    }

    setPaintTerrain("dirt");
    setPaintBuild("buildable");
  }

  function updateBrushUI() {
    btnBrush1.classList.toggle("btn--primary", brushSize === 1);
    btnBrush2.classList.toggle("btn--primary", brushSize === 2);
    btnBrush3.classList.toggle("btn--primary", brushSize === 3);
  }

  function updateStats() {
    const total = COLS * ROWS;
    const countsBuild = { buildable: 0, blocked: 0, recoverable: 0 };
    const countsTerrainPainted = {};
    for (const t of TERRAIN_TYPES) countsTerrainPainted[t] = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cid = cidFromIndex(c, r);
        const b = overridesBuild[cid] ?? DEFAULT_BUILD;
        countsBuild[b] += 1;
        const t = overridesTerrain[cid];
        if (t) countsTerrainPainted[t] += 1;
      }
    }

    const pct = (n) => (total ? (100 * n) / total : 0);

    statsEl.innerHTML = `
      <div><b>Total celdas:</b> ${total}</div>
      <div style="margin-top:6px"><b>Construcción (effective)</b></div>
      <div>buildable: ${countsBuild.buildable} (${pct(countsBuild.buildable).toFixed(1)}%)</div>
      <div>blocked: ${countsBuild.blocked} (${pct(countsBuild.blocked).toFixed(1)}%)</div>
      <div>recoverable: ${countsBuild.recoverable} (${pct(countsBuild.recoverable).toFixed(1)}%)</div>
      <div style="margin-top:8px"><b>Terrain pintado</b></div>
      ${TERRAIN_TYPES.map((t) => `<div>${t}: ${countsTerrainPainted[t]}</div>`).join("")}
      <div style="margin-top:8px;color:rgba(255,255,255,.65)">Sin clasificación automática: solo cuenta lo que pintas.</div>
    `;
  }

  function render() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, imgW, imgH);

    // Terreno tint solo si hay override
    if (toggleTerrainOverlay.checked) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cid = cidFromIndex(c, r);
          const t = overridesTerrain[cid];
          if (!t) continue;
          const meta = TYPE_META_TERRAIN[t];
          if (!meta) continue;
          const [rr, gg, bb, aa] = meta.color;
          ctx.fillStyle = `rgba(${rr},${gg},${bb},${aa / 255})`;
          ctx.fillRect(c * cellW(), r * cellH(), cellW(), cellH());
        }
      }
    }

    // Build tint solo si hay override
    if (toggleBuildOverlay.checked) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cid = cidFromIndex(c, r);
          const b = overridesBuild[cid];
          if (!b) continue;
          const meta = TYPE_META_BUILD[b];
          if (!meta) continue;
          const [rr, gg, bb, aa] = meta.color;
          ctx.fillStyle = `rgba(${rr},${gg},${bb},${aa / 255})`;
          ctx.fillRect(c * cellW(), r * cellH(), cellW(), cellH());
        }
      }
    }

    if (toggleGrid.checked) {
      ctx.strokeStyle = "rgba(255,220,150,0.34)";
      ctx.lineWidth = 1 / scale;
      for (let c = 0; c <= COLS; c++) {
        const x = c * cellW();
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, imgH);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        const y = r * cellH();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(imgW, y);
        ctx.stroke();
      }

      if (toggleLabels.checked) {
        ctx.fillStyle = "rgba(255,236,180,0.65)";
        ctx.font = `${Math.max(10, 14 / scale)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cid = cidFromIndex(c, r);
            const x = (c + 0.5) * cellW();
            const y = (r + 0.86) * cellH();
            ctx.fillText(cid, x - 10, y - 2);
          }
        }
      }
    }

    if (activeRectPreview) {
      const { c0, r0, c1, r1 } = activeRectPreview;
      const x = Math.min(c0, c1) * cellW();
      const y = Math.min(r0, r1) * cellH();
      const w = (Math.abs(c1 - c0) + 1) * cellW();
      const h = (Math.abs(r1 - r0) + 1) * cellH();
      ctx.save();
      ctx.strokeStyle = "rgba(220,220,180,0.85)";
      ctx.lineWidth = 3 / scale;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    ctx.restore();
  }

  function beginStroke() {
    const changes = [];
    const touched = new Set();
    return {
      record: (ch) => {
        if (touched.has(ch.cid)) return;
        touched.add(ch.cid);
        changes.push(ch);
      },
      commit: () => {
        if (!changes.length) return;
        undoStack.push({ changes: [...changes] });
        redoStack.length = 0;
      },
      changes,
    };
  }

  function applyPaintAtCell(c, r, stroke) {
    const cid = cidFromIndex(c, r);
    const prevTerrain = overridesTerrain[cid] ?? DEFAULT_TERRAIN;
    const prevBuild = overridesBuild[cid] ?? DEFAULT_BUILD;

    if (activeLayer === "terrain") {
      const nextTerrain = paintTerrain;
      if (prevTerrain === nextTerrain) return;
      stroke.record({ cid, prevTerrain, nextTerrain, prevBuild, nextBuild: prevBuild });
      if (nextTerrain === DEFAULT_TERRAIN) delete overridesTerrain[cid];
      else overridesTerrain[cid] = nextTerrain;
      return;
    }

    const nextBuild = paintBuild;
    if (prevBuild === nextBuild) return;
    stroke.record({ cid, prevTerrain, nextTerrain: prevTerrain, prevBuild, nextBuild });
    if (nextBuild === DEFAULT_BUILD) delete overridesBuild[cid];
    else overridesBuild[cid] = nextBuild;
  }

  function applyBrushAt(originC, originR, size, stroke) {
    for (let r = originR; r < originR + size; r++) {
      for (let c = originC; c < originC + size; c++) {
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
        applyPaintAtCell(c, r, stroke);
      }
    }
  }

  function applyRect(c0, r0, c1, r1, stroke) {
    const minC = Math.min(c0, c1);
    const maxC = Math.max(c0, c1);
    const minR = Math.min(r0, r1);
    const maxR = Math.max(r0, r1);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        applyPaintAtCell(c, r, stroke);
      }
    }
  }

  function applyChanges(changes, direction) {
    for (const ch of changes) {
      const cid = ch.cid;
      const useTerrain = direction < 0 ? ch.prevTerrain : ch.nextTerrain;
      const useBuild = direction < 0 ? ch.prevBuild : ch.nextBuild;
      if (useTerrain === DEFAULT_TERRAIN) delete overridesTerrain[cid];
      else overridesTerrain[cid] = useTerrain;
      if (useBuild === DEFAULT_BUILD) delete overridesBuild[cid];
      else overridesBuild[cid] = useBuild;
    }
  }

  function undo() {
    const act = undoStack.pop();
    if (!act) return;
    applyChanges(act.changes, -1);
    redoStack.push(act);
    scheduleAutosave();
    updateStats();
    render();
  }

  function redo() {
    const act = redoStack.pop();
    if (!act) return;
    applyChanges(act.changes, +1);
    undoStack.push(act);
    scheduleAutosave();
    updateStats();
    render();
  }

  let pointerDown = false;
  let activeStroke = null;
  let lastCell = null;

  function pointerPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function applyPaintBetween(fromCell, toCell, stroke) {
    if (!fromCell || !toCell) return;
    const steps = Math.max(Math.abs(toCell.c - fromCell.c), Math.abs(toCell.r - fromCell.r));
    for (let i = 0; i <= steps; i++) {
      const cc = fromCell.c + Math.round(((toCell.c - fromCell.c) * i) / steps);
      const rr = fromCell.r + Math.round(((toCell.r - fromCell.r) * i) / steps);
      applyBrushAt(cc, rr, brushSize, stroke);
    }
  }

  canvas.addEventListener("pointerdown", (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    pointerDown = true;

    const { x, y } = pointerPos(ev);
    const wpos = screenToWorld(x, y);
    const cell = worldToCell(wpos.x, wpos.y);
    if (!cell) return;

    lastCell = cell;
    cellMeta.textContent = cidFromIndex(cell.c, cell.r);

    if (mode === Mode.PAINT) {
      activeStroke = beginStroke();
      if (toggleRectSelect.checked) {
        activeRectStart = cell;
        activeRectPreview = { c0: cell.c, r0: cell.r, c1: cell.c, r1: cell.r };
      } else {
        applyBrushAt(cell.c, cell.r, brushSize, activeStroke);
      }
      render();
    }
  });

  canvas.addEventListener("pointermove", (ev) => {
    const { x, y } = pointerPos(ev);
    const wpos = screenToWorld(x, y);
    const cell = worldToCell(wpos.x, wpos.y);

    if (cell) cellMeta.textContent = cidFromIndex(cell.c, cell.r);
    else cellMeta.textContent = "—";

    if (!pointerDown) {
      if (activeRectPreview && cell) {
        activeRectPreview.c1 = cell.c;
        activeRectPreview.r1 = cell.r;
        render();
      }
      return;
    }

    if (mode === Mode.MOVE) {
      if (!canvas._lastMove) canvas._lastMove = { x: ev.clientX, y: ev.clientY };
      const dx = ev.clientX - canvas._lastMove.x;
      const dy = ev.clientY - canvas._lastMove.y;
      canvas._lastMove = { x: ev.clientX, y: ev.clientY };
      panX += dx;
      panY += dy;
      panMeta.textContent = `${Math.round(panX)},${Math.round(panY)}`;
      render();
      return;
    }

    if (mode === Mode.PAINT && activeStroke) {
      if (toggleRectSelect.checked) {
        if (cell) {
          activeRectPreview = {
            c0: activeRectStart.c,
            r0: activeRectStart.r,
            c1: cell.c,
            r1: cell.r,
          };
          render();
        }
        return;
      }

      if (!cell || !lastCell) return;
      applyPaintBetween(lastCell, cell, activeStroke);
      lastCell = cell;
      updateStats();
      render();
    }
  });

  function endStroke() {
    if (mode === Mode.PAINT && activeStroke) {
      if (toggleRectSelect.checked && activeRectPreview) {
        const { c0, r0, c1, r1 } = activeRectPreview;
        applyRect(c0, r0, c1, r1, activeStroke);
      }
      activeStroke.commit();
      activeStroke = null;
      scheduleAutosave();
    }

    pointerDown = false;
    lastCell = null;
    activeRectStart = null;
    activeRectPreview = null;
    canvas._lastMove = null;
    updateStats();
    render();
  }

  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("pointerleave", () => {
    pointerDown = false;
    activeStroke = null;
    activeRectPreview = null;
  });

  canvas.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const { x, y } = pointerPos(ev);
      const wposBefore = screenToWorld(x, y);
      const zoomFactor = Math.exp(-ev.deltaY / 500);
      const nextScale = Math.min(2.8, Math.max(0.25, scale * zoomFactor));
      panX = x - wposBefore.x * nextScale;
      panY = y - wposBefore.y * nextScale;
      scale = nextScale;
      zoomMeta.textContent = `${Math.round(scale * 100)}%`;
      panMeta.textContent = `${Math.round(panX)},${Math.round(panY)}`;
      render();
    },
    { passive: false }
  );

  btnModeMove.addEventListener("click", () => setMode(Mode.MOVE));
  btnModePaint.addEventListener("click", () => setMode(Mode.PAINT));

  btnUndo.addEventListener("click", undo);
  btnRedo.addEventListener("click", redo);

  btnBrush1.addEventListener("click", () => { brushSize = 1; updateBrushUI(); });
  btnBrush2.addEventListener("click", () => { brushSize = 2; updateBrushUI(); });
  btnBrush3.addEventListener("click", () => { brushSize = 3; updateBrushUI(); });

  btnErase.addEventListener("click", () => {
    const cid = cellMeta.textContent;
    if (!cid || cid === "—") return;

    const prevTerrain = overridesTerrain[cid] ?? DEFAULT_TERRAIN;
    const prevBuild = overridesBuild[cid] ?? DEFAULT_BUILD;

    const stroke = beginStroke();
    stroke.record({ cid, prevTerrain, nextTerrain: DEFAULT_TERRAIN, prevBuild, nextBuild: DEFAULT_BUILD });

    delete overridesTerrain[cid];
    delete overridesBuild[cid];

    stroke.commit();
    scheduleAutosave();
    updateStats();
    render();
  });

  btnReset.addEventListener("click", () => {
    const ok = confirm("¿Restablecer TODO el editor? (borrar overrides)");
    if (!ok) return;
    for (const k of Object.keys(overridesTerrain)) delete overridesTerrain[k];
    for (const k of Object.keys(overridesBuild)) delete overridesBuild[k];
    undoStack.length = 0;
    redoStack.length = 0;
    scheduleAutosave();
    updateStats();
    render();
  });

  btnExport.addEventListener("click", () => {
    const cells = {};
    const used = new Set([...Object.keys(overridesTerrain), ...Object.keys(overridesBuild)]);
    for (const cid of used) {
      const terrain = overridesTerrain[cid] ?? DEFAULT_TERRAIN;
      const buildState = overridesBuild[cid] ?? DEFAULT_BUILD;
      if (terrain === DEFAULT_TERRAIN && buildState === DEFAULT_BUILD) continue;
      cells[cid] = { terrain, buildState };
    }

    const payload = {
      schema: "zz-map-grid-editor-export-v2",
      grid: { cols: COLS, rows: ROWS },
      defaults: { terrain: DEFAULT_TERRAIN, buildState: DEFAULT_BUILD },
      cells,
      meta: { note: "Editor interno. El jugador no ve grid/labels.", },
    };

    const txt = JSON.stringify(payload, null, 2);
    jsonBox.value = txt;

    const blob = new Blob([txt], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "map_grid.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  btnImport.addEventListener("click", () => fileImport.click());
  fileImport.addEventListener("change", async () => {
    const file = fileImport.files?.[0];
    if (!file) return;
    const txt = await file.text();
    importJSON(txt);
  });

  function importJSON(txt) {
    let payload;
    try { payload = JSON.parse(txt); } catch { alert("JSON inválido"); return; }

    const nextTerrain = {};
    const nextBuild = {};

    const cells = payload.cells ?? {};
    for (const [cid, obj] of Object.entries(cells)) {
      if (!obj || typeof obj !== "object") continue;
      const terrain = obj.terrain;
      const buildState = obj.buildState;
      if (typeof terrain === "string" && TERRAIN_TYPES.includes(terrain) && terrain !== DEFAULT_TERRAIN) nextTerrain[cid] = terrain;
      if (typeof buildState === "string" && BUILD_STATES.includes(buildState) && buildState !== DEFAULT_BUILD) nextBuild[cid] = buildState;
    }

    for (const k of Object.keys(overridesTerrain)) delete overridesTerrain[k];
    for (const k of Object.keys(overridesBuild)) delete overridesBuild[k];
    Object.assign(overridesTerrain, nextTerrain);
    Object.assign(overridesBuild, nextBuild);

    undoStack.length = 0;
    redoStack.length = 0;
    jsonBox.value = JSON.stringify(payload, null, 2);
    scheduleAutosave();
    updateStats();
    render();
  }

  // Init
  paletteInit();
  updateBrushUI();

  toggleGrid.checked = true;
  toggleTerrainOverlay.checked = true;
  toggleBuildOverlay.checked = true;
  toggleLabels.checked = false;

  btnModeMove.addEventListener("click", () => setMode(Mode.MOVE));
  btnModePaint.addEventListener("click", () => setMode(Mode.PAINT));

  for (const t of [toggleGrid, toggleTerrainOverlay, toggleBuildOverlay, toggleLabels]) {
    t.addEventListener("change", () => render());
  }
  window.addEventListener("resize", () => render());

  function loadAutosaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.overridesTerrain) Object.assign(overridesTerrain, parsed.overridesTerrain);
      if (parsed?.overridesBuild) Object.assign(overridesBuild, parsed.overridesBuild);
      if (parsed?.brushSize && [1,2,3].includes(parsed.brushSize)) brushSize = parsed.brushSize;
      updateBrushUI();
      if (parsed?.paintTerrain && TERRAIN_TYPES.includes(parsed.paintTerrain)) setPaintTerrain(parsed.paintTerrain);
      if (parsed?.paintBuild && BUILD_STATES.includes(parsed.paintBuild)) setPaintBuild(parsed.paintBuild);
      if (parsed?.activeLayer && (parsed.activeLayer === "terrain" || parsed.activeLayer === "build")) activeLayer = parsed.activeLayer;
    } catch {}
  }

  loadAutosaved();
  initViewport();
  setMode(Mode.PAINT);
  updateStats();

  img.onload = () => {
    imgW = img.naturalWidth;
    imgH = img.naturalHeight;
    render();
  };
  img.onerror = () => {
    alert("No se pudo cargar el fondo. Revisa ../approved-reference-pilot/01-map-clean.png");
  };
  img.src = BG_SRC;

  function initViewport() {
    panX = 24;
    panY = 24;
    zoomMeta.textContent = `${Math.round(scale * 100)}%`;
    panMeta.textContent = `${Math.round(panX)},${Math.round(panY)}`;
  }

  // textarea: evita enter que cause cambios raros
  jsonBox.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") { ev.preventDefault(); jsonBox.blur(); }
  });

})();

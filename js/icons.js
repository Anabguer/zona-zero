/**
 * Iconos SVG propios Zona Zero (inline). Sin emojis.
 */
const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}, kids = []) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  kids.forEach((c) => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
}

export function iconSvg(paths, { size = 24, className = '', view = 24 } = {}) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${view} ${view}`,
    width: size,
    height: size,
    class: className,
    'aria-hidden': 'true',
  });
  paths.forEach((p) => {
    if (typeof p === 'string') {
      svg.appendChild(svgEl('path', { d: p, fill: 'currentColor' }));
    } else {
      svg.appendChild(svgEl(p.tag || 'path', p));
    }
  });
  return svg;
}

/** Iconos de recurso (stroke/fill compactos) */
export const RES_ICONS = {
  food: (s = 20) =>
    iconSvg(
      [
        { tag: 'path', d: 'M7 20V10c0-3 2-5 5-5s5 2 5 5v10', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' },
        { tag: 'path', d: 'M7 14h10', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' },
        { tag: 'circle', cx: '12', cy: '6', r: '1.5', fill: 'currentColor' },
      ],
      { size: s, className: 'zz-ico zz-ico--food' }
    ),
  water: (s = 20) =>
    iconSvg(
      [{ tag: 'path', d: 'M12 3c0 0-6 8-6 12a6 6 0 0012 0c0-4-6-12-6-12z', fill: 'currentColor' }],
      { size: s, className: 'zz-ico zz-ico--water' }
    ),
  wood: (s = 20) =>
    iconSvg(
      [
        { tag: 'path', d: 'M5 19l4-14h2l4 14', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linejoin': 'round' },
        { tag: 'path', d: 'M8 12h6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6' },
      ],
      { size: s, className: 'zz-ico zz-ico--wood' }
    ),
  metal: (s = 20) =>
    iconSvg(
      [
        { tag: 'path', d: 'M4 16l4-10h8l4 10H4z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linejoin': 'round' },
        { tag: 'path', d: 'M8 16v3h8v-3', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7' },
      ],
      { size: s, className: 'zz-ico zz-ico--metal' }
    ),
  medicine: (s = 20) =>
    iconSvg(
      [
        { tag: 'rect', x: '4', y: '8', width: '16', height: '10', rx: '2', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7' },
        { tag: 'path', d: 'M12 10v6M9 13h6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round' },
      ],
      { size: s, className: 'zz-ico zz-ico--medicine' }
    ),
  fuel: (s = 20) =>
    iconSvg(
      [
        { tag: 'path', d: 'M7 20V7h7v13H7z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7' },
        { tag: 'path', d: 'M14 10h2.5a2 2 0 012 2v5a2 2 0 01-2 2H14', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7' },
        { tag: 'path', d: 'M9 4h3v3H9z', fill: 'currentColor' },
      ],
      { size: s, className: 'zz-ico zz-ico--fuel' }
    ),
  ammo: (s = 20) =>
    iconSvg(
      [
        { tag: 'path', d: 'M9 20V9l3-5 3 5v11', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linejoin': 'round' },
        { tag: 'path', d: 'M9 14h6', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6' },
      ],
      { size: s, className: 'zz-ico zz-ico--ammo' }
    ),
};

export const SKILL_META = {
  scout: { label: 'Explorar', short: 'Explorar', color: '#c4a574' },
  gather: { label: 'Recolectar', short: 'Recolectar', color: '#8fbc8f' },
  build: { label: 'Construir', short: 'Construir', color: '#a89070' },
  produce: { label: 'Producir', short: 'Producir', color: '#7a9ab0' },
  fight: { label: 'Defender', short: 'Defender', color: '#c07060' },
};

export const SKILL_ORDER = ['scout', 'gather', 'build', 'produce', 'fight'];

export function skillIcon(key, s = 14) {
  const map = {
    scout: [{ tag: 'circle', cx: '12', cy: '12', r: '7', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8' }, { tag: 'circle', cx: '12', cy: '12', r: '2.2', fill: 'currentColor' }],
    gather: [{ tag: 'path', d: 'M12 4v12M8 9l4-5 4 5M7 20h10', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }],
    build: [{ tag: 'path', d: 'M5 18V9l7-4 7 4v9H5z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linejoin': 'round' }],
    produce: [{ tag: 'path', d: 'M6 18V10l6-5 6 5v8H6z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linejoin': 'round' }, { tag: 'path', d: 'M10 18v-5h4v5', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' }],
    fight: [{ tag: 'path', d: 'M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linejoin': 'round' }],
  };
  return iconSvg(map[key] || map.scout, { size: s, className: `zz-skill-ico zz-skill-ico--${key}` });
}

/** Hash estable de id → variación de retrato */
export function portraitVariant(id) {
  let h = 0;
  const str = String(id || 'x');
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return {
    skin: h % 5,
    hair: (h >> 3) % 6,
    cloth: (h >> 6) % 5,
    accessory: (h >> 9) % 4,
  };
}

const SKINS = ['#c4a882', '#a67c52', '#8d5524', '#d4b896', '#b08968'];
const HAIRS = ['#2a2218', '#4a3728', '#6b4423', '#1a1a1a', '#5c4033', '#3d2914'];
const CLOTHS = ['#5c4a3a', '#3d4a5c', '#4a5c3d', '#5c3d3d', '#4a4a4a'];

export function renderPortraitSvg(survivor, size = 48) {
  const v = portraitVariant(survivor.id);
  const skin = SKINS[v.skin];
  const hair = HAIRS[v.hair];
  const cloth = CLOTHS[v.cloth];
  const wounded = survivor.status === 'wounded';
  const dead = survivor.status === 'dead';
  const svg = svgEl('svg', {
    viewBox: '0 0 48 48',
    width: size,
    height: size,
    class: 'zz-portrait' + (dead ? ' is-dead' : '') + (wounded ? ' is-wounded' : ''),
    'aria-hidden': 'true',
  });
  svg.appendChild(
    svgEl('circle', {
      cx: 24,
      cy: 24,
      r: 23,
      fill: dead ? '#2a2a2a' : '#1c1814',
      stroke: wounded ? '#c07040' : '#6a5a48',
      'stroke-width': 1.5,
    })
  );
  svg.appendChild(svgEl('ellipse', { cx: 24, cy: 42, rx: 14, ry: 10, fill: dead ? '#444' : cloth }));
  svg.appendChild(svgEl('circle', { cx: 24, cy: 20, r: 11, fill: dead ? '#777' : skin }));
  if (!dead) {
    if (v.hair % 2 === 0) {
      svg.appendChild(svgEl('path', { d: 'M13 18c1-9 20-9 22 0v-2c-2-8-20-8-22 0z', fill: hair }));
    } else {
      svg.appendChild(svgEl('path', { d: 'M12 20c2-10 22-10 24 0-4-6-20-6-24 0z', fill: hair }));
    }
  }
  if (!dead) {
    svg.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 1.4, fill: '#1a1410' }));
    svg.appendChild(svgEl('circle', { cx: 28, cy: 20, r: 1.4, fill: '#1a1410' }));
  } else {
    svg.appendChild(svgEl('path', { d: 'M18 18l4 4M22 18l-4 4M26 18l4 4M30 18l-4 4', fill: 'none', stroke: '#222', 'stroke-width': 1.2 }));
  }
  if (!dead && v.accessory === 1) {
    svg.appendChild(svgEl('path', { d: 'M14 17h20', fill: 'none', stroke: '#3a3530', 'stroke-width': 2 }));
  } else if (!dead && v.accessory === 2) {
    svg.appendChild(svgEl('rect', { x: 16, y: 26, width: 16, height: 3, rx: 1, fill: '#8a7060' }));
  }
  return svg;
}

/* ─── Edificios: nivel visual y familias ─── */

/** Nivel 1–3 según sufijo _lN o cadena de mejora implícita */
export function resolveVisualLevel(type) {
  const t = String(type || '');
  const m = t.match(/_l(\d+)$/i);
  if (m) return Math.min(3, Math.max(1, Number(m[1])));
  const implied = {
    house: 2,
    block: 3,
    greenhouse: 2,
    cistern: 2,
    infirmary: 2,
    clinic: 3,
    mech_shop: 2,
    bunker: 3,
    armory: 2,
    command: 2,
    lab: 2,
    solar: 2,
    expedition_center: 2,
  };
  return implied[t] || 1;
}

/** Clave de familia visual (sin sufijo de nivel) */
export function buildingFamily(type) {
  const t = String(type || '');
  if (t.startsWith('hq_central')) return 'hq_central';
  return t;
}

/** Iconos compactos por familia de evento / UI */
export const FAMILY_ICONS = {
  housing: (s = 18) =>
    iconSvg([{ tag: 'path', d: 'M4 18V10l8-6 8 6v8H4z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linejoin': 'round' }], {
      size: s,
      className: 'zz-fam-ico zz-fam-ico--housing',
    }),
  food: (s = 18) => RES_ICONS.food(s),
  water: (s = 18) => RES_ICONS.water(s),
  defense: (s = 18) =>
    iconSvg([{ tag: 'path', d: 'M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7l7-4z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6' }], {
      size: s,
      className: 'zz-fam-ico zz-fam-ico--defense',
    }),
  power: (s = 18) =>
    iconSvg([{ tag: 'path', d: 'M13 3L6 14h5l-1 7 8-12h-5l0-6z', fill: 'currentColor' }], {
      size: s,
      className: 'zz-fam-ico zz-fam-ico--power',
    }),
  medical: (s = 18) =>
    iconSvg([{ tag: 'path', d: 'M12 6v12M6 12h12', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' }], {
      size: s,
      className: 'zz-fam-ico zz-fam-ico--medical',
    }),
  industry: (s = 18) =>
    iconSvg([{ tag: 'path', d: 'M5 19V9l5 3V9l5 3V8l4 2v9H5z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }], {
      size: s,
      className: 'zz-fam-ico zz-fam-ico--industry',
    }),
  scout: (s = 18) => skillIcon('scout', s),
  tech: (s = 18) =>
    iconSvg(
      [
        { tag: 'rect', x: '5', y: '7', width: '14', height: '10', rx: '1', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5' },
        { tag: 'path', d: 'M8 17h8M10 10h4', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.4' },
      ],
      { size: s, className: 'zz-fam-ico zz-fam-ico--tech' }
    ),
};

export function familyIcon(family, size = 18) {
  const fn = FAMILY_ICONS[family] || FAMILY_ICONS.housing;
  return fn(size);
}

function append(g, tag, attrs) {
  g.appendChild(svgEl(tag, attrs));
}

/** Pinta glifo de edificio en coords 0–40 (sin fondo de miniatura) */
export function paintBuildingGlyph(g, type, level = 1) {
  const fam = buildingFamily(type);
  const lv = level || resolveVisualLevel(type);
  const painters = {
    hq_central: paintHq,
    shelter: paintShelter,
    house: paintHouse,
    block: paintBlock,
    farm: paintFarm,
    greenhouse: paintGreenhouse,
    well: paintWell,
    cistern: paintCistern,
    sawmill: paintSawmill,
    scrapyard: paintScrapyard,
    storage: paintStorage,
    workshop: paintWorkshop,
    kitchen: paintKitchen,
    mech_shop: paintMechShop,
    medkit: paintMedkit,
    infirmary: paintInfirmary,
    clinic: paintClinic,
    barricade: paintBarricade,
    fence: paintFence,
    watchtower: paintWatchtower,
    armory: paintArmory,
    bunker: paintBunker,
    radio: paintRadio,
    expedition_center: paintExpedition,
    garage: paintGarage,
    command: paintCommand,
    generator: paintGenerator,
    solar: paintSolar,
    tech_bench: paintTechBench,
    lab: paintLab,
  };
  const fn = painters[fam] || paintStorage;
  fn(g, lv);
}

function paintHq(g, lv) {
  // Cuerpo principal más ancho
  append(g, 'rect', { x: 5, y: 14, width: 30, height: 18, rx: 2, fill: '#4a4038', stroke: '#c4a882', 'stroke-width': 1.4 });
  append(g, 'path', { d: 'M4 14l16-9 16 9', fill: '#5a4a3a', stroke: '#d4b892', 'stroke-width': 1.2 });
  append(g, 'rect', { x: 17, y: 22, width: 6, height: 10, fill: '#2a2218' });
  append(g, 'rect', { x: 9, y: 18, width: 5, height: 4, fill: '#d4a060', opacity: 0.75 });
  append(g, 'rect', { x: 26, y: 18, width: 5, height: 4, fill: '#d4a060', opacity: 0.55 });
  if (lv >= 2) {
    // Antena
    append(g, 'path', { d: 'M32 14V6M29 8h6', fill: 'none', stroke: '#a09080', 'stroke-width': 1.3, 'stroke-linecap': 'round' });
    append(g, 'circle', { cx: 32, cy: 5, r: 1.6, fill: '#c07060' });
    append(g, 'rect', { x: 7, y: 12, width: 8, height: 3, rx: 0.5, fill: '#3a5040', stroke: '#7a9a70', 'stroke-width': 0.8 });
  }
  if (lv >= 3) {
    // Luces y bandera
    append(g, 'circle', { cx: 10, cy: 16, r: 1.4, fill: '#f0c070' });
    append(g, 'circle', { cx: 30, cy: 16, r: 1.4, fill: '#f0c070' });
    append(g, 'path', { d: 'M12 5v8', fill: 'none', stroke: '#8a7a68', 'stroke-width': 1.2 });
    append(g, 'path', { d: 'M12 5h7l-1.5 2.5L19 10H12z', fill: '#c07060' });
    append(g, 'rect', { x: 22, y: 10, width: 10, height: 4, rx: 1, fill: '#3a4555', stroke: '#8a9aaa', 'stroke-width': 0.8 });
  }
}

function paintShelter(g) {
  append(g, 'path', { d: 'M7 32V20l13-11 13 11v12H7z', fill: '#6b5344', stroke: '#c4a882', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M8 20l12-10 12 10', fill: 'none', stroke: '#8a7060', 'stroke-width': 1 });
  append(g, 'rect', { x: 17, y: 23, width: 6, height: 9, fill: '#2e241c' });
  append(g, 'path', { d: 'M10 18l4 3M26 18l-4 3', fill: 'none', stroke: '#5a4a3a', 'stroke-width': 1.2 });
}

function paintHouse(g) {
  append(g, 'rect', { x: 8, y: 16, width: 24, height: 16, fill: '#5a4a3c', stroke: '#c4a882', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M6 16l14-10 14 10', fill: '#7a5040', stroke: '#d4a882', 'stroke-width': 1.2 });
  append(g, 'rect', { x: 17, y: 22, width: 6, height: 10, fill: '#2a2018' });
  append(g, 'rect', { x: 11, y: 19, width: 5, height: 4, fill: '#d4a060', opacity: 0.8 });
  append(g, 'rect', { x: 24, y: 19, width: 5, height: 4, fill: '#d4a060', opacity: 0.65 });
  // Chimenea (nivel implícito 2)
  append(g, 'rect', { x: 26, y: 6, width: 4, height: 8, fill: '#4a4038', stroke: '#8a7a68', 'stroke-width': 0.8 });
}

function paintBlock(g) {
  append(g, 'rect', { x: 6, y: 10, width: 28, height: 22, fill: '#4a4a52', stroke: '#9a9aa8', 'stroke-width': 1.3 });
  append(g, 'rect', { x: 6, y: 8, width: 28, height: 3, fill: '#5a5a62' });
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      append(g, 'rect', {
        x: 9 + col * 8,
        y: 12 + row * 6,
        width: 5,
        height: 3.5,
        fill: '#d4a060',
        opacity: 0.45 + (row + col) * 0.05,
      });
    }
  }
  append(g, 'rect', { x: 17, y: 26, width: 6, height: 6, fill: '#2a2828' });
  append(g, 'rect', { x: 30, y: 4, width: 3, height: 6, fill: '#5a5048' });
}

function paintFarm(g) {
  append(g, 'rect', { x: 5, y: 28, width: 30, height: 5, fill: '#3a3020' });
  for (let i = 0; i < 5; i++) {
    append(g, 'path', {
      d: `M${8 + i * 6} 28v-14c0-2 2-4 3-4s3 2 3 4v14`,
      fill: 'none',
      stroke: '#6a8a3a',
      'stroke-width': 1.4,
      'stroke-linecap': 'round',
    });
    append(g, 'circle', { cx: 11 + i * 6, cy: 12, r: 1.8, fill: '#8aaa4a' });
  }
}

function paintGreenhouse(g) {
  append(g, 'path', { d: 'M6 30V16l14-8 14 8v14H6z', fill: '#2a4040', stroke: '#7abaa0', 'stroke-width': 1.4, opacity: 0.9 });
  append(g, 'path', { d: 'M6 16l14-8 14 8', fill: 'none', stroke: '#9ad4b8', 'stroke-width': 1.2 });
  append(g, 'path', { d: 'M20 8v22M6 16h28', fill: 'none', stroke: '#6a9a88', 'stroke-width': 1 });
  append(g, 'rect', { x: 10, y: 20, width: 4, height: 8, fill: '#4a7a3a', opacity: 0.7 });
  append(g, 'rect', { x: 18, y: 18, width: 4, height: 10, fill: '#5a8a4a', opacity: 0.7 });
  append(g, 'rect', { x: 26, y: 21, width: 4, height: 7, fill: '#4a7a3a', opacity: 0.7 });
}

function paintWell(g) {
  append(g, 'ellipse', { cx: 20, cy: 26, rx: 12, ry: 5, fill: '#3a3530' });
  append(g, 'circle', { cx: 20, cy: 22, r: 10, fill: '#3a4550', stroke: '#8a9aaa', 'stroke-width': 1.5 });
  append(g, 'circle', { cx: 20, cy: 22, r: 5.5, fill: '#1a3040' });
  append(g, 'path', { d: 'M10 14h20M12 14V10h16v4', fill: 'none', stroke: '#6a5a48', 'stroke-width': 1.8, 'stroke-linejoin': 'round' });
  append(g, 'path', { d: 'M20 10V6', fill: 'none', stroke: '#8a7a68', 'stroke-width': 1.2 });
}

function paintCistern(g) {
  append(g, 'ellipse', { cx: 20, cy: 30, rx: 13, ry: 4, fill: '#2a3538' });
  append(g, 'rect', { x: 8, y: 12, width: 24, height: 18, rx: 2, fill: '#3a5058', stroke: '#7a9aaa', 'stroke-width': 1.4 });
  append(g, 'ellipse', { cx: 20, cy: 12, rx: 12, ry: 4, fill: '#4a6070', stroke: '#8a9aaa', 'stroke-width': 1 });
  append(g, 'path', { d: 'M12 18h16M12 24h16', fill: 'none', stroke: '#5a7080', 'stroke-width': 1 });
  append(g, 'circle', { cx: 20, cy: 12, r: 2, fill: '#1a3040' });
  append(g, 'path', { d: 'M28 10v-4h4', fill: 'none', stroke: '#8a9aaa', 'stroke-width': 1.3 });
}

function paintSawmill(g) {
  append(g, 'path', { d: 'M5 32h30L28 12H12z', fill: '#5a5048', stroke: '#a09080', 'stroke-width': 1.3 });
  append(g, 'circle', { cx: 20, cy: 20, r: 7, fill: 'none', stroke: '#c4a882', 'stroke-width': 1.8 });
  append(g, 'path', { d: 'M20 13v14M13 20h14', fill: 'none', stroke: '#a09070', 'stroke-width': 1.2 });
  append(g, 'rect', { x: 7, y: 28, width: 8, height: 3, fill: '#6a5a40' });
  append(g, 'rect', { x: 25, y: 28, width: 8, height: 3, fill: '#6a5a40' });
}

function paintScrapyard(g) {
  append(g, 'rect', { x: 6, y: 22, width: 12, height: 10, fill: '#5a5048', stroke: '#908070', 'stroke-width': 1 });
  append(g, 'rect', { x: 16, y: 18, width: 14, height: 14, fill: '#4a4540', stroke: '#a09080', 'stroke-width': 1.2 });
  append(g, 'path', { d: 'M8 22l4-6h6l-2 6', fill: '#6a6058', stroke: '#908880', 'stroke-width': 0.8 });
  append(g, 'circle', { cx: 12, cy: 30, r: 2.5, fill: '#3a3530', stroke: '#7a7060', 'stroke-width': 1 });
  append(g, 'circle', { cx: 26, cy: 30, r: 2.5, fill: '#3a3530', stroke: '#7a7060', 'stroke-width': 1 });
  append(g, 'path', { d: 'M20 12l3 4h-6z', fill: '#c07050' });
}

function paintStorage(g) {
  append(g, 'rect', { x: 6, y: 12, width: 28, height: 20, rx: 1, fill: '#454040', stroke: '#908880', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M12 12v20M20 12v20M28 12v20', fill: 'none', stroke: '#706860', 'stroke-width': 1.1 });
  append(g, 'rect', { x: 6, y: 12, width: 28, height: 3, fill: '#555048' });
  append(g, 'circle', { cx: 10, cy: 22, r: 1.2, fill: '#a09080' });
  append(g, 'circle', { cx: 30, cy: 22, r: 1.2, fill: '#a09080' });
}

function paintWorkshop(g) {
  append(g, 'rect', { x: 7, y: 12, width: 26, height: 20, rx: 2, fill: '#4a4a52', stroke: '#9a9aa8', 'stroke-width': 1.3 });
  append(g, 'rect', { x: 11, y: 16, width: 7, height: 5, fill: '#d4a060', opacity: 0.7 });
  append(g, 'path', { d: 'M22 28l7-10h-4l5-7', fill: 'none', stroke: '#c0a070', 'stroke-width': 1.6, 'stroke-linejoin': 'round' });
  append(g, 'rect', { x: 9, y: 26, width: 10, height: 4, fill: '#3a3838' });
}

function paintKitchen(g) {
  append(g, 'rect', { x: 7, y: 14, width: 26, height: 18, rx: 2, fill: '#5a4840', stroke: '#c4a882', 'stroke-width': 1.3 });
  append(g, 'rect', { x: 10, y: 18, width: 10, height: 8, rx: 1, fill: '#3a3028', stroke: '#8a7060', 'stroke-width': 1 });
  append(g, 'circle', { cx: 13, cy: 22, r: 1.5, fill: '#c07040' });
  append(g, 'circle', { cx: 17, cy: 22, r: 1.5, fill: '#c07040' });
  append(g, 'path', { d: 'M26 18c0 0 4 2 4 6s-4 6-4 6', fill: 'none', stroke: '#a09080', 'stroke-width': 1.4 });
  append(g, 'rect', { x: 24, y: 8, width: 4, height: 7, fill: '#4a4038' });
  append(g, 'path', { d: 'M25 8c1-3 3-3 4 0', fill: 'none', stroke: '#8a8a8a', 'stroke-width': 1, opacity: 0.6 });
}

function paintMechShop(g) {
  append(g, 'rect', { x: 5, y: 14, width: 30, height: 18, rx: 1, fill: '#3a4048', stroke: '#8a9aa8', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M5 14h30v4H5z', fill: '#4a5560' });
  append(g, 'rect', { x: 10, y: 20, width: 14, height: 12, fill: '#2a3038' });
  append(g, 'circle', { cx: 30, cy: 26, r: 5, fill: 'none', stroke: '#c0a070', 'stroke-width': 1.5 });
  append(g, 'path', { d: 'M30 21v10M25 26h10', fill: 'none', stroke: '#a09070', 'stroke-width': 1 });
  append(g, 'rect', { x: 12, y: 10, width: 8, height: 4, fill: '#5a5040' });
}

function paintMedkit(g) {
  append(g, 'rect', { x: 10, y: 14, width: 20, height: 16, rx: 2, fill: '#3a4550', stroke: '#8a9aaa', 'stroke-width': 1.2 });
  append(g, 'path', { d: 'M20 17v10M15 22h10', fill: 'none', stroke: '#e08080', 'stroke-width': 2, 'stroke-linecap': 'round' });
  append(g, 'rect', { x: 14, y: 10, width: 12, height: 4, rx: 1, fill: '#5a4050' });
}

function paintInfirmary(g) {
  append(g, 'rect', { x: 7, y: 12, width: 26, height: 20, rx: 2, fill: '#3a4555', stroke: '#8a9aaa', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M20 16v12M14 22h12', fill: 'none', stroke: '#e08080', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
  append(g, 'rect', { x: 10, y: 15, width: 5, height: 4, fill: '#d4a060', opacity: 0.5 });
  append(g, 'rect', { x: 25, y: 15, width: 5, height: 4, fill: '#d4a060', opacity: 0.5 });
  append(g, 'path', { d: 'M8 12l12-5 12 5', fill: '#4a5565', stroke: '#9aaaba', 'stroke-width': 1 });
}

function paintClinic(g) {
  append(g, 'rect', { x: 5, y: 10, width: 30, height: 22, rx: 2, fill: '#354550', stroke: '#9ab0c0', 'stroke-width': 1.4 });
  append(g, 'path', { d: 'M20 14v14M13 21h14', fill: 'none', stroke: '#f09090', 'stroke-width': 2.6, 'stroke-linecap': 'round' });
  append(g, 'rect', { x: 8, y: 14, width: 6, height: 5, fill: '#c0d4e0', opacity: 0.35 });
  append(g, 'rect', { x: 26, y: 14, width: 6, height: 5, fill: '#c0d4e0', opacity: 0.35 });
  append(g, 'rect', { x: 16, y: 6, width: 8, height: 5, rx: 1, fill: '#c07070' });
  append(g, 'circle', { cx: 32, cy: 12, r: 1.5, fill: '#f0c070' });
}

function paintBarricade(g) {
  append(g, 'rect', { x: 6, y: 20, width: 28, height: 10, fill: '#4a4030', stroke: '#8a7a60', 'stroke-width': 1.2 });
  append(g, 'path', { d: 'M8 20l4-8h4l-2 8M18 20l3-7h5l-2 7M28 20l2-6h4', fill: '#5a5040', stroke: '#9a8a70', 'stroke-width': 0.9 });
  append(g, 'path', { d: 'M10 24h20', fill: 'none', stroke: '#6a5a48', 'stroke-width': 1.2 });
}

function paintFence(g) {
  for (let i = 0; i < 5; i++) {
    append(g, 'rect', { x: 7 + i * 6, y: 14, width: 2.5, height: 18, fill: '#5a4a38', stroke: '#8a7a60', 'stroke-width': 0.6 });
  }
  append(g, 'path', { d: 'M6 18h28M6 26h28', fill: 'none', stroke: '#7a6a50', 'stroke-width': 1.5 });
}

function paintWatchtower(g) {
  append(g, 'path', { d: 'M14 34L20 6l6 28H14z', fill: '#5a4a30', stroke: '#c0a050', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M12 34h16', fill: 'none', stroke: '#8a7a50', 'stroke-width': 1.5 });
  append(g, 'rect', { x: 15, y: 10, width: 10, height: 7, fill: '#2a2010', stroke: '#a09060', 'stroke-width': 1 });
  append(g, 'circle', { cx: 20, cy: 13, r: 1.6, fill: '#f0c070' });
  append(g, 'path', { d: 'M17 34V28M23 34V28', fill: 'none', stroke: '#6a5a40', 'stroke-width': 1.4 });
}

function paintArmory(g) {
  append(g, 'rect', { x: 7, y: 12, width: 26, height: 20, rx: 1, fill: '#3a3835', stroke: '#8a8070', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M14 18v10M14 20h8l2 2v6', fill: 'none', stroke: '#c0a070', 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
  append(g, 'rect', { x: 24, y: 16, width: 5, height: 12, fill: '#4a4540', stroke: '#7a7060', 'stroke-width': 0.8 });
  append(g, 'circle', { cx: 20, cy: 8, r: 3, fill: 'none', stroke: '#a09070', 'stroke-width': 1.2 });
}

function paintBunker(g) {
  append(g, 'path', { d: 'M6 28h28v4H6z', fill: '#2a2825' });
  append(g, 'path', { d: 'M8 28V16l12-8 12 8v12H8z', fill: '#3a3a38', stroke: '#7a7a70', 'stroke-width': 1.4 });
  append(g, 'rect', { x: 16, y: 20, width: 8, height: 8, fill: '#1a1a18' });
  append(g, 'circle', { cx: 12, cy: 18, r: 2, fill: '#2a3028', stroke: '#6a7060', 'stroke-width': 1 });
  append(g, 'circle', { cx: 28, cy: 18, r: 2, fill: '#2a3028', stroke: '#6a7060', 'stroke-width': 1 });
  append(g, 'path', { d: 'M20 8v-3', fill: 'none', stroke: '#8a8070', 'stroke-width': 1.2 });
}

function paintRadio(g) {
  append(g, 'rect', { x: 10, y: 16, width: 20, height: 14, rx: 2, fill: '#3a4048', stroke: '#8a9aa8', 'stroke-width': 1.3 });
  append(g, 'circle', { cx: 16, cy: 23, r: 3, fill: '#2a3038', stroke: '#7a8a98', 'stroke-width': 1 });
  append(g, 'rect', { x: 22, y: 20, width: 5, height: 6, fill: '#5a5040' });
  append(g, 'path', { d: 'M20 16V6M17 9c2-3 4-3 6 0', fill: 'none', stroke: '#c4a882', 'stroke-width': 1.3, 'stroke-linecap': 'round' });
  append(g, 'circle', { cx: 20, cy: 5, r: 1.5, fill: '#c07060' });
}

function paintExpedition(g) {
  append(g, 'rect', { x: 6, y: 16, width: 28, height: 16, rx: 1, fill: '#4a4538', stroke: '#a09070', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M10 16l10-8 10 8', fill: '#5a5040', stroke: '#b0a080', 'stroke-width': 1 });
  append(g, 'circle', { cx: 20, cy: 12, r: 4, fill: 'none', stroke: '#c4a882', 'stroke-width': 1.4 });
  append(g, 'circle', { cx: 20, cy: 12, r: 1.5, fill: '#c4a882' });
  append(g, 'rect', { x: 12, y: 22, width: 6, height: 4, fill: '#d4a060', opacity: 0.5 });
  append(g, 'path', { d: 'M26 20h6v8h-6', fill: 'none', stroke: '#8a7a60', 'stroke-width': 1.2 });
}

function paintGarage(g) {
  append(g, 'rect', { x: 5, y: 12, width: 30, height: 20, fill: '#3a3a40', stroke: '#8a8a90', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M5 12h30v5H5z', fill: '#4a4a50' });
  append(g, 'rect', { x: 9, y: 18, width: 22, height: 14, fill: '#2a2a30' });
  append(g, 'path', { d: 'M9 25h22', fill: 'none', stroke: '#5a5a60', 'stroke-width': 1 });
  // Silueta de vehículo
  append(g, 'path', { d: 'M12 28h16l-2-5h-4l-2-3h-4l-2 3H12z', fill: '#5a5040', stroke: '#8a7a60', 'stroke-width': 0.9 });
  append(g, 'circle', { cx: 15, cy: 28, r: 1.8, fill: '#2a2825' });
  append(g, 'circle', { cx: 25, cy: 28, r: 1.8, fill: '#2a2825' });
}

function paintCommand(g) {
  append(g, 'rect', { x: 7, y: 14, width: 26, height: 18, rx: 2, fill: '#3a4048', stroke: '#9aa8b0', 'stroke-width': 1.3 });
  append(g, 'rect', { x: 11, y: 18, width: 18, height: 8, rx: 1, fill: '#1a2830', stroke: '#5a7080', 'stroke-width': 1 });
  append(g, 'path', { d: 'M14 21h4M20 20h6M14 24h10', fill: 'none', stroke: '#6a9aaa', 'stroke-width': 1 });
  append(g, 'path', { d: 'M20 8v6M17 10h6', fill: 'none', stroke: '#c4a882', 'stroke-width': 1.2 });
  append(g, 'circle', { cx: 20, cy: 7, r: 1.4, fill: '#70c080' });
}

function paintGenerator(g) {
  append(g, 'rect', { x: 8, y: 14, width: 24, height: 16, rx: 2, fill: '#5a4030', stroke: '#d09050', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M15 18h5l-3 6h6', fill: 'none', stroke: '#f0c070', 'stroke-width': 1.8, 'stroke-linejoin': 'round' });
  append(g, 'rect', { x: 10, y: 28, width: 6, height: 3, fill: '#3a3028' });
  append(g, 'rect', { x: 24, y: 28, width: 6, height: 3, fill: '#3a3028' });
  append(g, 'circle', { cx: 28, cy: 18, r: 2, fill: '#c07040', opacity: 0.8 });
}

function paintSolar(g) {
  append(g, 'rect', { x: 6, y: 14, width: 28, height: 16, rx: 1, fill: '#1a3048', stroke: '#6a9aba', 'stroke-width': 1.3 });
  append(g, 'path', { d: 'M6 22h28M20 14v16M13 14v16M27 14v16', fill: 'none', stroke: '#4a7a9a', 'stroke-width': 1 });
  append(g, 'path', { d: 'M10 12l10-6 10 6', fill: 'none', stroke: '#8ab0c8', 'stroke-width': 1.2 });
  append(g, 'circle', { cx: 32, cy: 10, r: 3, fill: '#f0c070', opacity: 0.7 });
}

function paintTechBench(g) {
  append(g, 'rect', { x: 6, y: 18, width: 28, height: 12, rx: 1, fill: '#3a3a42', stroke: '#8a8a98', 'stroke-width': 1.2 });
  append(g, 'rect', { x: 10, y: 12, width: 12, height: 8, rx: 1, fill: '#2a3040', stroke: '#6a8090', 'stroke-width': 1 });
  append(g, 'path', { d: 'M12 15h8M12 18h5', fill: 'none', stroke: '#70a0b0', 'stroke-width': 1 });
  append(g, 'circle', { cx: 28, cy: 14, r: 3, fill: 'none', stroke: '#c0a070', 'stroke-width': 1.3 });
  append(g, 'rect', { x: 8, y: 28, width: 4, height: 4, fill: '#4a4038' });
  append(g, 'rect', { x: 28, y: 28, width: 4, height: 4, fill: '#4a4038' });
}

function paintLab(g) {
  append(g, 'rect', { x: 6, y: 12, width: 28, height: 20, rx: 2, fill: '#2a3540', stroke: '#7a9aaa', 'stroke-width': 1.3 });
  append(g, 'rect', { x: 10, y: 16, width: 8, height: 10, fill: '#1a2830', stroke: '#5a8090', 'stroke-width': 1 });
  append(g, 'path', { d: 'M22 18h8v10h-8', fill: 'none', stroke: '#8ab0c0', 'stroke-width': 1.2 });
  append(g, 'circle', { cx: 26, cy: 22, r: 2.5, fill: '#60a080', opacity: 0.7 });
  append(g, 'path', { d: 'M12 8v4M10 10h4', fill: 'none', stroke: '#a0c0d0', 'stroke-width': 1.2 });
  append(g, 'circle', { cx: 30, cy: 10, r: 2, fill: '#70c0a0', opacity: 0.8 });
}

/** Miniatura de edificio para barra de construcción */
export function buildingThumb(type, size = 36) {
  const lv = resolveVisualLevel(type);
  const fam = buildingFamily(type);
  const svg = svgEl('svg', {
    viewBox: '0 0 40 40',
    width: size,
    height: size,
    class: `zz-bthumb zz-bthumb--${fam}`,
    'aria-hidden': 'true',
  });
  // Fondo mínimo (casi transparente) para contraste en barra
  svg.appendChild(svgEl('rect', { width: 40, height: 40, rx: 5, fill: '#1a1612', opacity: 0.35 }));
  paintBuildingGlyph(svg, type, lv);
  return svg;
}

/** Arte de edificio en celda de base */
export function drawBuildingOnCell(ns, type, rx, ry, cell, level) {
  const lv = level != null ? level : resolveVisualLevel(type);
  const fam = buildingFamily(type);
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', `zz-bldg zz-bldg--${fam} zz-bldg--lv${lv}`);
  const s = cell / 40;
  // HQ y edificios anchos se dibujan un poco más grandes
  const boost = fam === 'hq_central' ? 1.15 : fam === 'block' || fam === 'garage' || fam === 'bunker' ? 1.08 : 1;
  const ox = rx - ((boost - 1) * cell) / 2;
  const oy = ry - ((boost - 1) * cell) / 2;
  const wrap = document.createElementNS(ns, 'g');
  wrap.setAttribute('transform', `translate(${ox},${oy}) scale(${s * boost})`);
  paintBuildingGlyph(wrap, type, lv);
  // Detalles extra de nivel genéricos (chimenea / brillo) si el painter no los cubrió
  if (lv >= 2 && !String(type).startsWith('hq_') && !['house', 'block', 'clinic', 'infirmary', 'greenhouse', 'cistern'].includes(fam)) {
    wrap.appendChild(svgEl('rect', { x: 30, y: 6, width: 3, height: 7, fill: '#4a4038', opacity: 0.85 }));
  }
  if (lv >= 3 && fam !== 'hq_central') {
    wrap.appendChild(svgEl('circle', { cx: 8, cy: 10, r: 1.4, fill: '#f0c070', opacity: 0.75 }));
  }
  g.appendChild(wrap);
  return g;
}

/** @deprecated usar drawBuildingOnCell / paintBuildingGlyph */
export function appendBuildingArt(parent, type, x, y, cell = 36) {
  const g = drawBuildingOnCell(NS, type, x, y, cell);
  parent.appendChild(g);
  return g;
}

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
  // fondo
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
  // cuerpo / ropa
  svg.appendChild(svgEl('ellipse', { cx: 24, cy: 42, rx: 14, ry: 10, fill: dead ? '#444' : cloth }));
  // cabeza
  svg.appendChild(svgEl('circle', { cx: 24, cy: 20, r: 11, fill: dead ? '#777' : skin }));
  // pelo
  if (!dead) {
    if (v.hair % 2 === 0) {
      svg.appendChild(svgEl('path', { d: 'M13 18c1-9 20-9 22 0v-2c-2-8-20-8-22 0z', fill: hair }));
    } else {
      svg.appendChild(svgEl('path', { d: 'M12 20c2-10 22-10 24 0-4-6-20-6-24 0z', fill: hair }));
    }
  }
  // ojos
  if (!dead) {
    svg.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 1.4, fill: '#1a1410' }));
    svg.appendChild(svgEl('circle', { cx: 28, cy: 20, r: 1.4, fill: '#1a1410' }));
  } else {
    svg.appendChild(svgEl('path', { d: 'M18 18l4 4M22 18l-4 4M26 18l4 4M30 18l-4 4', fill: 'none', stroke: '#222', 'stroke-width': 1.2 }));
  }
  // accesorio
  if (!dead && v.accessory === 1) {
    svg.appendChild(svgEl('path', { d: 'M14 17h20', fill: 'none', stroke: '#3a3530', 'stroke-width': 2 }));
  } else if (!dead && v.accessory === 2) {
    svg.appendChild(svgEl('rect', { x: 16, y: 26, width: 16, height: 3, rx: 1, fill: '#8a7060' }));
  }
  return svg;
}

/** Miniatura de edificio para barra de construcción */
export function buildingThumb(type, size = 36) {
  const svg = svgEl('svg', {
    viewBox: '0 0 40 40',
    width: size,
    height: size,
    class: `zz-bthumb zz-bthumb--${type}`,
    'aria-hidden': 'true',
  });
  svg.appendChild(svgEl('rect', { width: 40, height: 40, rx: 6, fill: '#1a1612' }));
  const draw = BUILDING_GLYPHS[type] || BUILDING_GLYPHS.storage;
  draw(svg);
  return svg;
}

const BUILDING_GLYPHS = {
  shelter: (svg) => {
    svg.appendChild(svgEl('path', { d: 'M8 30V18l12-10 12 10v12H8z', fill: '#6b5344', stroke: '#c4a882', 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('rect', { x: 17, y: 22, width: 6, height: 8, fill: '#3a2e24' }));
  },
  farm: (svg) => {
    for (let i = 0; i < 4; i++) {
      svg.appendChild(svgEl('rect', { x: 8 + i * 7, y: 14, width: 5, height: 16, rx: 1, fill: '#5a6b3a', stroke: '#9aaa6a', 'stroke-width': 0.8 }));
    }
  },
  well: (svg) => {
    svg.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 10, fill: '#2a4050', stroke: '#7a9aaa', 'stroke-width': 1.4 }));
    svg.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 5, fill: '#1a3040' }));
  },
  sawmill: (svg) => {
    svg.appendChild(svgEl('path', { d: 'M6 30h28L30 12H10z', fill: '#5a5048', stroke: '#a09080', 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 5, fill: 'none', stroke: '#c4a882', 'stroke-width': 1.5 }));
  },
  workshop: (svg) => {
    svg.appendChild(svgEl('rect', { x: 8, y: 12, width: 24, height: 18, rx: 2, fill: '#4a4a50', stroke: '#9a9aa0', 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('path', { d: 'M14 28V18h4l6 6v4', fill: 'none', stroke: '#c0a070', 'stroke-width': 1.5 }));
  },
  clinic: (svg) => {
    svg.appendChild(svgEl('rect', { x: 8, y: 12, width: 24, height: 18, rx: 2, fill: '#3a4555', stroke: '#8a9aaa', 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('path', { d: 'M20 16v12M14 22h12', fill: 'none', stroke: '#d07070', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
  },
  generator: (svg) => {
    svg.appendChild(svgEl('rect', { x: 9, y: 14, width: 22, height: 14, rx: 2, fill: '#5a4030', stroke: '#d09050', 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('path', { d: 'M16 18h4l-2 5h4', fill: 'none', stroke: '#f0c070', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
  },
  watchtower: (svg) => {
    svg.appendChild(svgEl('path', { d: 'M14 32L20 6l6 26H14z', fill: '#5a4a30', stroke: '#c0a050', 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('rect', { x: 16, y: 12, width: 8, height: 5, fill: '#3a3020' }));
  },
  storage: (svg) => {
    svg.appendChild(svgEl('rect', { x: 7, y: 14, width: 26, height: 16, rx: 1, fill: '#454040', stroke: '#908880', 'stroke-width': 1.2 }));
    svg.appendChild(svgEl('path', { d: 'M12 14v16M20 14v16M28 14v16', fill: 'none', stroke: '#706860', 'stroke-width': 1 }));
  },
};

export function appendBuildingArt(parent, type, x, y, cell = 36) {
  const g = svgEl('g', { class: `zz-bldg zz-bldg--${type}`, transform: `translate(${x},${y})` });
  const scale = cell / 40;
  const inner = svgEl('g', { transform: `scale(${scale})` });
  const draw = BUILDING_GLYPHS[type] || BUILDING_GLYPHS.storage;
  // re-draw without dark bg rect for map placement
  const tmp = svgEl('svg');
  draw(tmp);
  [...tmp.childNodes].forEach((n) => {
    if (n.getAttribute && n.getAttribute('width') === '40') return;
    inner.appendChild(n.cloneNode(true));
  });
  // Actually BUILDING_GLYPHS draws on svg with bg - better dedicated ground glyphs
  g.appendChild(inner);
  parent.appendChild(g);
  return g;
}

/** Arte de edificio en celda de base (sin fondo de thumb) */
export function drawBuildingOnCell(ns, type, rx, ry, cell) {
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', `zz-bldg zz-bldg--${type}`);
  const s = cell / 40;
  const wrap = document.createElementNS(ns, 'g');
  wrap.setAttribute('transform', `translate(${rx},${ry}) scale(${s})`);
  const fake = { appendChild: (el) => wrap.appendChild(el) };
  // patch: call glyph without bg
  const glyphs = {
    shelter: () => {
      wrap.appendChild(svgEl('path', { d: 'M8 32V18l12-11 12 11v14H8z', fill: '#6b5344', stroke: '#c4a882', 'stroke-width': 1.4 }));
      wrap.appendChild(svgEl('rect', { x: 17, y: 22, width: 6, height: 10, fill: '#2e241c' }));
      wrap.appendChild(svgEl('rect', { x: 11, y: 20, width: 5, height: 4, fill: '#d4a060', opacity: 0.85 }));
    },
    farm: () => {
      wrap.appendChild(svgEl('rect', { x: 6, y: 28, width: 28, height: 4, fill: '#3a3020' }));
      for (let i = 0; i < 4; i++) {
        wrap.appendChild(svgEl('rect', { x: 8 + i * 7, y: 12, width: 5, height: 16, rx: 1, fill: '#5a6b3a', stroke: '#8a9a5a', 'stroke-width': 0.8 }));
      }
    },
    well: () => {
      wrap.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 11, fill: '#3a4550', stroke: '#8a9aaa', 'stroke-width': 1.5 }));
      wrap.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 5.5, fill: '#1a2830' }));
      wrap.appendChild(svgEl('path', { d: 'M10 14h20', fill: 'none', stroke: '#6a5a48', 'stroke-width': 2 }));
    },
    sawmill: () => {
      wrap.appendChild(svgEl('path', { d: 'M6 32h28L30 12H10z', fill: '#5a5048', stroke: '#a09080', 'stroke-width': 1.3 }));
      wrap.appendChild(svgEl('circle', { cx: 20, cy: 20, r: 6, fill: 'none', stroke: '#c4a882', 'stroke-width': 1.6 }));
    },
    workshop: () => {
      wrap.appendChild(svgEl('rect', { x: 7, y: 12, width: 26, height: 20, rx: 2, fill: '#4a4a52', stroke: '#9a9aa8', 'stroke-width': 1.3 }));
      wrap.appendChild(svgEl('rect', { x: 12, y: 16, width: 6, height: 5, fill: '#d4a060', opacity: 0.7 }));
      wrap.appendChild(svgEl('path', { d: 'M22 28l6-8h-4l4-6', fill: 'none', stroke: '#c0a070', 'stroke-width': 1.5 }));
    },
    clinic: () => {
      wrap.appendChild(svgEl('rect', { x: 7, y: 12, width: 26, height: 20, rx: 2, fill: '#3a4555', stroke: '#8a9aaa', 'stroke-width': 1.3 }));
      wrap.appendChild(svgEl('path', { d: 'M20 16v12M14 22h12', fill: 'none', stroke: '#e08080', 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
    },
    generator: () => {
      wrap.appendChild(svgEl('rect', { x: 8, y: 14, width: 24, height: 16, rx: 2, fill: '#5a4030', stroke: '#d09050', 'stroke-width': 1.3 }));
      wrap.appendChild(svgEl('path', { d: 'M15 18h5l-3 6h6', fill: 'none', stroke: '#f0c070', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }));
    },
    watchtower: () => {
      wrap.appendChild(svgEl('path', { d: 'M13 34L20 6l7 28H13z', fill: '#5a4a30', stroke: '#c0a050', 'stroke-width': 1.3 }));
      wrap.appendChild(svgEl('rect', { x: 16, y: 12, width: 8, height: 6, fill: '#2a2010' }));
      wrap.appendChild(svgEl('circle', { cx: 20, cy: 15, r: 1.5, fill: '#f0c070' }));
    },
    storage: () => {
      wrap.appendChild(svgEl('rect', { x: 6, y: 12, width: 28, height: 20, rx: 1, fill: '#454040', stroke: '#908880', 'stroke-width': 1.3 }));
      wrap.appendChild(svgEl('path', { d: 'M12 12v20M20 12v20M28 12v20', fill: 'none', stroke: '#706860', 'stroke-width': 1.1 }));
    },
  };
  (glyphs[type] || glyphs.storage)();
  g.appendChild(wrap);
  // silence unused
  void fake;
  return g;
}

/** Render base / asentamiento SVG */
const ICONS = {
  shelter: (x, y, ns) => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', `M${x + 4} ${y + 28} V${y + 14} L${x + 16} ${y + 6} L${x + 28} ${y + 14} V${y + 28} Z`);
    p.setAttribute('class', 'zz-b-shape zz-b-shelter');
    return p;
  },
  farm: (x, y, ns) => {
    const g = document.createElementNS(ns, 'g');
    for (let i = 0; i < 3; i++) {
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', x + 6 + i * 7);
      r.setAttribute('y', y + 10);
      r.setAttribute('width', '5');
      r.setAttribute('height', '16');
      r.setAttribute('class', 'zz-b-shape zz-b-farm');
      g.appendChild(r);
    }
    return g;
  },
  workshop: (x, y, ns) => {
    const p = document.createElementNS(ns, 'rect');
    p.setAttribute('x', x + 6);
    p.setAttribute('y', y + 8);
    p.setAttribute('width', '20');
    p.setAttribute('height', '18');
    p.setAttribute('rx', '2');
    p.setAttribute('class', 'zz-b-shape zz-b-workshop');
    return p;
  },
  clinic: (x, y, ns) => {
    const g = document.createElementNS(ns, 'g');
    const box = document.createElementNS(ns, 'rect');
    box.setAttribute('x', x + 6);
    box.setAttribute('y', y + 8);
    box.setAttribute('width', '20');
    box.setAttribute('height', '18');
    box.setAttribute('class', 'zz-b-shape zz-b-clinic');
    const h = document.createElementNS(ns, 'path');
    h.setAttribute('d', `M${x + 16} ${y + 12} V${y + 22} M${x + 11} ${y + 17} H${x + 21}`);
    h.setAttribute('class', 'zz-b-cross');
    g.appendChild(box);
    g.appendChild(h);
    return g;
  },
  watchtower: (x, y, ns) => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', `M${x + 12} ${y + 28} L${x + 16} ${y + 6} L${x + 20} ${y + 28} Z`);
    p.setAttribute('class', 'zz-b-shape zz-b-tower');
    return p;
  },
  storage: (x, y, ns) => {
    const p = document.createElementNS(ns, 'rect');
    p.setAttribute('x', x + 5);
    p.setAttribute('y', y + 10);
    p.setAttribute('width', '22');
    p.setAttribute('height', '16');
    p.setAttribute('class', 'zz-b-shape zz-b-storage');
    return p;
  },
};

export function renderBase(svg, state, { onCellClick } = {}) {
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const cell = 36;
  const pad = 8;
  const w = state.base.w * cell + pad * 2;
  const h = state.base.h * cell + pad * 2;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

  const ground = document.createElementNS(ns, 'rect');
  ground.setAttribute('width', w);
  ground.setAttribute('height', h);
  ground.setAttribute('class', 'zz-base-ground');
  svg.appendChild(ground);

  for (let y = 0; y < state.base.h; y++) {
    for (let x = 0; x < state.base.w; x++) {
      const rx = pad + x * cell;
      const ry = pad + y * cell;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', rx);
      rect.setAttribute('y', ry);
      rect.setAttribute('width', cell - 2);
      rect.setAttribute('height', cell - 2);
      rect.setAttribute('rx', '4');
      rect.setAttribute('class', 'zz-base-cell');
      rect.style.cursor = state.buildMode ? 'pointer' : 'default';
      rect.addEventListener('click', () => onCellClick && onCellClick(x, y));
      svg.appendChild(rect);

      const b = state.base.buildings.find((bb) => bb.x === x && bb.y === y);
      if (b) {
        const iconFn = ICONS[b.type] || ICONS.storage;
        svg.appendChild(iconFn(rx, ry, ns));
      }
    }
  }
}

/** Utilidades Zona Zero */
export function randInt(min, max) {
  const a = Math.ceil(min);
  const b = Math.floor(max);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function chance(p) {
  return Math.random() < p;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function rollRange(range) {
  if (!Array.isArray(range) || range.length < 2) return 0;
  return randInt(range[0], range[1]);
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

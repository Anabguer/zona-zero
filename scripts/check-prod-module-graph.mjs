/**
 * Verifica grafo de imports de main.js en producción (sin auth).
 * node scripts/check-prod-module-graph.mjs
 */
import { parse } from 'es-module-lexer';

const BASE = 'https://intocables13.com/juegos/zona-zero/js/';
const seen = new Set();
const queue = ['main.js'];
const bad = [];

async function load(path) {
  const url = path.startsWith('http') ? path : BASE + path.replace(/^\.\//, '');
  const bare = url.replace(BASE, '').split('?')[0];
  if (seen.has(bare)) return;
  seen.add(bare);
  const res = await fetch(url);
  if (!res.ok) {
    bad.push({ bare, status: res.status });
    return;
  }
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!/javascript|ecmascript|module/i.test(ct) && !bare.endsWith('.js')) {
    bad.push({ bare, status: res.status, ct, note: 'bad content-type' });
  }
  if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
    bad.push({ bare, status: res.status, note: 'HTML instead of JS', head: text.slice(0, 80) });
    return;
  }
  let imports;
  try {
    [imports] = parse(text);
  } catch (e) {
    bad.push({ bare, note: 'parse fail: ' + e.message });
    return;
  }
  for (const im of imports) {
    const n = im.n;
    if (!n || !n.startsWith('.')) continue;
    const resolved = new URL(n, url).href.replace(BASE, '');
    queue.push(resolved);
  }
}

while (queue.length) {
  await load(queue.shift());
}

console.log('modules', seen.size);
if (bad.length) {
  console.error('BAD', bad);
  process.exit(1);
}
console.log('OK graph');

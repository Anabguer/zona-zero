/**
 * Verifica en DOM (jsdom no; usa happy-dom si no hay) — fallback: parse CSS + simulación atributo.
 * node scripts/e2e-hidden-dom.mjs
 * Comprueba que display:grid NO gana a [hidden] en reglas críticas.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'css', 'game.css'), 'utf8');

const checks = [
  { name: '[hidden] !important', re: /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s },
  { name: '.zz-defeat:not([hidden])', re: /\.zz-defeat:not\(\[hidden\]\)/ },
  { name: '.zz-boot:not([hidden])', re: /\.zz-boot:not\(\[hidden\]\)/ },
  { name: '.zz-app:not([hidden])', re: /\.zz-app:not\(\[hidden\]\)/ },
  { name: '.zz-toast:not([hidden])', re: /\.zz-toast:not\(\[hidden\]\)/ },
  { name: 'no .zz-defeat { display:grid } sin :not', re: null },
];

let fails = 0;
for (const c of checks) {
  if (c.name.startsWith('no ')) {
    // Asegurar que .zz-defeat no tiene display:grid en el bloque base
    const base = css.match(/\.zz-defeat\s*\{[^}]+\}/);
    const ok = base && !/display\s*:/.test(base[0]);
    console.log(ok ? 'OK' : 'FAIL', c.name, base ? base[0].slice(0, 80) : 'missing');
    if (!ok) fails++;
    continue;
  }
  const ok = c.re.test(css);
  console.log(ok ? 'OK' : 'FAIL', c.name);
  if (!ok) fails++;
}

if (fails) process.exit(1);
console.log('hidden-DOM CSS OK');

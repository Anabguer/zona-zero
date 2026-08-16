/**
 * Smoke ZZ-150 — sheets consistentes (shell + sin pestañas)
 * node scripts/smoke-zz150-sheets.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'css', 'world.css'), 'utf8');
const main = readFileSync(join(root, 'js', 'main.js'), 'utf8');
const play = readFileSync(join(root, 'play.php'), 'utf8');
const harness = readFileSync(join(root, 'dev', 'harness-zz.html'), 'utf8');

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

assert(css.includes('.zz-sheet__body'), 'CSS body scroll');
assert(css.includes('display: flex') && css.includes('flex-direction: column'), 'CSS flex shell');
assert(css.includes('min(44vw, 320px)') || css.includes('min(42vw, 280px)'), 'landscape side card');
assert(css.includes('body.zz-desk-layout .zz-sheet__body'), 'desktop body padding');
assert(main.includes('function sheetPanel'), 'sheetPanel helper');
assert(main.includes('function sheetSection'), 'sheetSection helper');
assert(main.includes("dataset.sheetKind"), 'sheet kind');
assert(main.includes("ev.key !== 'Escape'"), 'Escape cierra');
assert(main.includes("role', 'dialog'") || main.includes('role", "dialog"'), 'aria dialog');
assert(!/Mapa\s*\|\s*Base|tabs?\s*=\s*['"]mapa/i.test(main), 'sin tabs Mapa|Base');
assert(main.includes('sin pestañas'), 'copy anti-tabs en Más');
assert(play.includes('zz-sheet__body') && harness.includes('zz-sheet__body'), 'HTML body en play+harness');
assert(play.includes('aria-label="Ficha"'), 'aria label ficha');
assert(main.includes("'more'") && main.includes("'building'") && main.includes("'build'"), 'kinds cableados');

console.log(fails ? `FAIL ${fails}` : 'smoke-zz150-sheets OK');
process.exit(fails ? 1 : 0);

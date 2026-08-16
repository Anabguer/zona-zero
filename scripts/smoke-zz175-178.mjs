/**
 * Smoke ZZ-175…178 — perfiles §36, acceptance mala gestión, informe
 * node scripts/smoke-zz175-178.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => readFileSync(join(root, rel), 'utf8');

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

const { PROFILES, runGame, summarize } = await import(
  pathToFileURL(join(root, 'scripts', 'balance-sim.mjs')).href
);

const expected = ['atento', 'expansivo', 'conservador', 'mala_gestion', 'sin_explorar', 'sobreexpansion'];
for (const id of expected) assert(PROFILES[id], `perfil ${id}`);

const bal = JSON.parse(load('content/balance.json'));
assert(bal.victory?.needEnergy === false, 'needEnergy false');
assert(!JSON.stringify(PROFILES).includes('generator'), 'profiles no generator string');

const rowsA = [];
const rowsM = [];
for (let i = 0; i < 8; i++) {
  rowsA.push(runGame(`sm-a-${i}`, 30, 'atento'));
  rowsM.push(runGame(`sm-m-${i}`, 30, 'mala_gestion'));
}
const sa = summarize(rowsA, 'atento@D30');
const sm = summarize(rowsM, 'mala_gestion@D30');
assert(sm.survivalRate < sa.survivalRate, `mala gestión ${sm.survivalRate} < atento ${sa.survivalRate}`);
assert(sm.dead >= sa.dead, `mala gestión dead ${sm.dead} ≥ atento ${sa.dead}`);

assert(existsSync(join(root, 'docs', 'BALANCE_REPORT.md')), 'BALANCE_REPORT.md');
assert(existsSync(join(root, 'scripts', 'balance-report.json')), 'balance-report.json');

const report = JSON.parse(load('scripts/balance-report.json'));
assert(report.acceptance?.ok === true, 'report acceptance ok');
assert(report.batches?.some((b) => b.label.includes('@D30')), 'D30 batches');
assert(report.batches?.some((b) => b.label.includes('@D100')), 'D100 batches');
assert(load('docs/BALANCE_REPORT.md').includes('mala gestión'), 'md mentions mala gestión');

if (fails) {
  console.error(`\n${fails} FAIL(s)`);
  process.exit(1);
}
console.log('\nsmoke-zz175-178 OK');

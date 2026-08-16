/**
 * Smoke ZZ-160…161 — insulated overlays, damage states, close-up LOD, no city.webp / solar
 * node scripts/smoke-zz160-161.mjs
 */
import { readFileSync } from 'fs';
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

const renderSrc = load('js/render-map.js');
const iconsSrc = load('js/icons.js');
const cssSrc = load('css/game.css');
const artSrc = load('js/art.js');

assert(renderSrc.includes('drawInsulatedOverlays'), 'drawInsulatedOverlays');
assert(renderSrc.includes('drawDestroyedRubble'), 'drawDestroyedRubble');
assert(renderSrc.includes('drawDamageMarks'), 'drawDamageMarks');
assert(renderSrc.includes('buildingStructuralState'), 'uses buildingStructuralState');
assert(renderSrc.includes('zz-settle-bldg--insulated'), 'insulated class');
assert(renderSrc.includes('closeUp'), 'closeUp LOD ZZ-161');
assert(renderSrc.includes('zoom >= 2.55'), 'close-up threshold');
assert(renderSrc.includes('zz-ground-ruin-wall--near'), 'near ruins close-up');
assert(/NO fotografía|no city\.webp|NO.*city\.webp/i.test(renderSrc), 'anti city.webp paint');
assert(!/href:\s*artUrl\(TERRAIN_ART\)|TERRAIN_ART\)/.test(renderSrc.replace(/\/\/[^\n]*/g, '')), 'TERRAIN_ART not painted');

assert(iconsSrc.includes('paintInsulatedHouse'), 'paintInsulatedHouse');
assert(iconsSrc.includes('insulated_house: paintInsulatedHouse'), 'glyph map insulated');

assert(cssSrc.includes('.zz-settle-insul-roof'), 'CSS insulated roof');
assert(cssSrc.includes('.zz-settle-crack'), 'CSS crack marks');
assert(cssSrc.includes('.zz-settle-bldg-img--damaged'), 'CSS damaged filter');
assert(cssSrc.includes('.zz-settle-bldg-img--critical'), 'CSS critical filter');
assert(cssSrc.includes('.zz-ground-ruin-wall--near'), 'CSS near ruin');

assert(artSrc.includes("insulated_house: 'buildings/house.webp'"), 'insulated reuses house.webp lean');
assert(!/solar.*generator|generator.*solar/i.test(renderSrc.slice(0, 500)), 'no solar/generator in map head');

const { buildingStructuralState, buildingMaxHp } = await import(
  pathToFileURL(join(root, 'js', 'buildings-damage.js')).href
);

const mock = { type: 'farm', hp: 100 };
assert(buildingStructuralState(mock, null) === 'ok', 'state ok');
mock.hp = 50;
assert(buildingStructuralState(mock, null) === 'damaged', 'state damaged');
mock.hp = 20;
assert(buildingStructuralState(mock, null) === 'critical', 'state critical');
mock.hp = 0;
assert(buildingStructuralState(mock, null) === 'destroyed', 'state destroyed');
assert(buildingMaxHp({ type: 'farm' }, null) === 100, 'maxHp default');

assert(load('js/main.js').includes('Cubierta aislada'), 'ficha badge insulated');
assert(load('js/main.js').includes('buildingMaxHp'), 'ficha usa buildingMaxHp');

if (fails) {
  console.error(`\n${fails} FAIL(s)`);
  process.exit(1);
}
console.log('\nsmoke-zz160-161 OK');

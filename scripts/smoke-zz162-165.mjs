/**
 * Smoke ZZ-162…165 — landmarks tipados, props, SFX §34, anti-GIS
 * node scripts/smoke-zz162-165.mjs
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
const artSrc = load('js/art.js');
const soundSrc = load('js/sound.js');
const mainSrc = load('js/main.js');
const cssSrc = load('css/game.css');
const loc = JSON.parse(load('content/locations.json'));

const types = [...new Set((loc.seedLayout || []).map((z) => z.type).filter((t) => t && t !== 'camp'))];
assert(types.length >= 17, `seed landmarks ${types.length}`);
assert(renderSrc.includes('drawLandmarkSilhouette'), 'silhouette fn');
assert(renderSrc.includes("t === 'apartments'"), 'sil apartments');
assert(renderSrc.includes("t === 'pharmacy'"), 'sil pharmacy');
assert(renderSrc.includes("t === 'police'"), 'sil police');
assert(renderSrc.includes("t === 'water_plant'"), 'sil water_plant');
assert(renderSrc.includes("t === 'gas_station'"), 'sil gas_station');
assert(renderSrc.includes('drawLandmarkSilhouette(g, z, z.type)'), 'pass z.type');
assert(artSrc.includes('ZONE_ART_TYPES'), 'exact WebP types');
assert(!artSrc.includes("pharmacy: 'zones/hospital.webp'"), 'pharmacy not hospital alias');
assert(!/city\.webp|TERRAIN_ART/.test(renderSrc) || !renderSrc.includes('artUrl(TERRAIN_ART)'), 'no city.webp paint');

assert(renderSrc.includes("kind === 'sandbag'"), 'prop sandbag');
assert(renderSrc.includes("kind === 'tarp'"), 'prop tarp');
assert(renderSrc.includes("kind === 'scrap'"), 'prop scrap');
assert(renderSrc.includes('ZZ-163'), 'ZZ-163 props colony');
assert(cssSrc.includes('.zz-prop-sandbag'), 'CSS sandbag');
assert(cssSrc.includes('.zz-landmark-cross'), 'CSS pharmacy cross');

const requiredSfx = ['click', 'build', 'alert', 'expedition', 'return', 'attack', 'achievement', 'tech', 'victory'];
for (const k of requiredSfx) {
  assert(new RegExp(`${k}\\s*:`).test(soundSrc) || soundSrc.includes(`${k}:`), `sfx.${k}`);
}
assert(soundSrc.includes('setSoundEnabled'), 'mute API');
assert(mainSrc.includes('sfx.alert'), 'wire alert');
assert(mainSrc.includes('sfx.return'), 'wire return');
assert(mainSrc.includes('sfx.achievement'), 'wire achievement');
assert(mainSrc.includes('sfx.tech'), 'wire tech');
assert(mainSrc.includes('sfx.victory'), 'wire victory');

const { zoneArtUrl } = await import(pathToFileURL(join(root, 'js', 'art.js')).href);
assert(zoneArtUrl({ type: 'hospital' }), 'hospital webp');
assert(zoneArtUrl({ type: 'supermarket' }), 'supermarket webp');
assert(!zoneArtUrl({ type: 'pharmacy' }), 'pharmacy → silhouette');
assert(!zoneArtUrl({ type: 'police' }), 'police → silhouette');
assert(!zoneArtUrl({ type: 'gas_station' }), 'gas → silhouette');

if (fails) {
  console.error(`\n${fails} FAIL(s)`);
  process.exit(1);
}
console.log('\nsmoke-zz162-165 OK');

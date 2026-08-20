/**
 * Smoke piloto Neni — footprints reales + colisión.
 * node --experimental-vm-modules dev/smoke-pilot-footprints.mjs
 */
import {
  pilotFootprint,
  footprintFits,
  footprintsOverlap,
  cellOccupiedByBuilding,
  validPilotAnchors,
} from '../js/pilot-footprints.js';

function mockState() {
  return {
    flags: { pilot: 'neni' },
    base: {
      w: 14,
      h: 12,
      buildings: [{ id: 'hq', type: 'hq_central_l1', x: 7, y: 5, hp: 100 }],
    },
    sectors: [],
  };
}

const st = mockState();
const hqFp = pilotFootprint('hq_central_l1');
const houseFp = pilotFootprint('house');
const wellFp = pilotFootprint('well');
const storageFp = pilotFootprint('storage');

console.log('Footprints:', { hqFp, houseFp, wellFp, storageFp });

const houseAnchors = validPilotAnchors(st, null, 'house');
console.log('House anchors válidos:', houseAnchors.length, houseAnchors.slice(0, 5));

const pick = houseAnchors.find((a) => !footprintsOverlap(a.x, a.y, houseFp.w, houseFp.h, 7, 5, hqFp.w, hqFp.h));
console.log('House anchor sin solapar HQ:', pick);

st.base.buildings.push({ id: 'h1', type: 'house', x: pick.x, y: pick.y, hp: 100 });

const overlapStorage = footprintFits(st, 'storage', pick.x + 1, pick.y);
console.log('Storage solapado con Casa (debe false):', overlapStorage);

const wellOk = footprintFits(st, 'well', 2, 8);
console.log('Pozo en (2,8) válido:', wellOk);

const CELL = 96;
console.log('\nAnálisis CELL=96:');
console.log('  HQ mundo:', hqFp.w * CELL, '×', hqFp.h * CELL, 'px');
console.log('  Casa mundo:', houseFp.w * CELL, '×', houseFp.h * CELL, 'px');
console.log('  Pozo mundo:', wellFp.w * CELL, '×', wellFp.h * CELL, 'px');
console.log('  Almacén mundo:', storageFp.w * CELL, '×', storageFp.h * CELL, 'px');
console.log('  Grid base 14×12:', 14 * CELL, '×', 12 * CELL, 'px');

const fail = [];
if (!houseFp || houseFp.w !== 4 || houseFp.h !== 2) fail.push('house footprint');
if (!pick) fail.push('no house anchor');
if (overlapStorage !== false) fail.push('collision storage/house');
if (!wellOk) fail.push('well placement');

if (fail.length) {
  console.error('FAIL:', fail.join(', '));
  process.exit(1);
}
console.log('OK smoke footprints piloto');

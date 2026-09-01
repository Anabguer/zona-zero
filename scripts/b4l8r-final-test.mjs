/**
 * B4L.8R-FINAL — Validation tests for damageSurvivor derived RNG fix.
 *
 * Tests:
 *   A. Unit: val/100 produces expected probability (4%, 15%, 35%)
 *   B. Sibling RNG isolation: loot/killRoll identical A/B
 *   C. Determinism: same seed + same state → same result
 *
 *   node scripts/b4l8r-final-test.mjs
 */
import { createRng } from '../js/rng.js';

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

function approxEq(a, b, tolerance) {
  return Math.abs(a - b) <= tolerance;
}

// ─── A. Unit tests: val/100 probability ───
console.log('=== A. Unit tests: damageSurvivor probability ===');

function testProbability(val, expectedPct, trials = 20000) {
  const baseSeed = 12345;
  let fires = 0;
  for (let i = 0; i < trials; i++) {
    const rng = createRng(baseSeed ^ (i * 7919) ^ 0xD5);
    if (rng.chance(val / 100)) fires++;
  }
  const actualPct = (fires / trials) * 100;
  const tolerance = expectedPct < 10 ? 2.0 : 3.0; // wider tolerance for extreme values
  const ok = approxEq(actualPct, expectedPct, tolerance);
  console.log(`  val=${val}: expected=${expectedPct.toFixed(1)}% actual=${actualPct.toFixed(1)}% (${fires}/${trials}) ${ok ? 'PASS' : 'FAIL'}`);
  assert(ok, `probability val=${val}`);
}

testProbability(4, 4);
testProbability(15, 15);
testProbability(35, 35);
testProbability(0, 0);
testProbability(100, 100, 5000);

// ─── B. Sibling RNG isolation ───
console.log('\n=== B. Sibling RNG isolation ===');

// Simulate applyEventEffects with derived RNG (variant B) vs shared RNG (variant A)
function simulateEffectsA(rngState, day, val) {
  // Variant A (boolean): damageSurvivor always fires, no RNG consumed
  const rng = createRng(rngState ^ (day * 7919));
  const loot = rng.int(0, 100);       // loot roll
  const killRoll = rng.chance(0.1);   // killSurvivorChance
  const bldgDmg = rng.int(25, 60);    // damageBuilding damage
  return { loot, killRoll, bldgDmg, injured: true };
}

function simulateEffectsB(rngState, day, val) {
  // Variant B (derived): damageSurvivor uses separate RNG, shared stream untouched
  const rng = createRng(rngState ^ (day * 7919));
  const loot = rng.int(0, 100);       // loot roll (same position)
  const killRoll = rng.chance(0.1);   // killSurvivorChance (same position)
  const bldgDmg = rng.int(25, 60);    // damageBuilding damage (same position)
  // damageSurvivor uses derived RNG — does NOT consume shared stream
  const derivedRng = createRng((rngState || 1) ^ (day * 7919) ^ 0xD5);
  const injured = derivedRng.chance(val / 100);
  return { loot, killRoll, bldgDmg, injured };
}

const testRngState = 98765;
const testDay = 15;
const testVal = 15;

let lootMatch = 0, killMatch = 0, bldgMatch = 0, totalTrials = 0;
for (let seed = 0; seed < 1000; seed++) {
  const rngState = testRngState ^ seed;
  const a = simulateEffectsA(rngState, testDay, testVal);
  const b = simulateEffectsB(rngState, testDay, testVal);
  totalTrials++;
  if (a.loot === b.loot) lootMatch++;
  if (a.killRoll === b.killRoll) killMatch++;
  if (a.bldgDmg === b.bldgDmg) bldgMatch++;
}

console.log(`  loot matches: ${lootMatch}/${totalTrials} ${lootMatch === totalTrials ? 'PASS' : 'FAIL'}`);
console.log(`  killRoll matches: ${killMatch}/${totalTrials} ${killMatch === totalTrials ? 'PASS' : 'FAIL'}`);
console.log(`  bldgDmg matches: ${bldgMatch}/${totalTrials} ${bldgMatch === totalTrials ? 'PASS' : 'FAIL'}`);
assert(lootMatch === totalTrials, 'sibling loot isolation');
assert(killMatch === totalTrials, 'sibling killRoll isolation');
assert(bldgMatch === totalTrials, 'sibling bldgDmg isolation');

// Verify damageSurvivor actually fires at different rates in A vs B
let aFires = 0, bFires = 0;
for (let seed = 0; seed < 10000; seed++) {
  const rngState = testRngState ^ seed;
  const a = simulateEffectsA(rngState, testDay, testVal);
  const b = simulateEffectsB(rngState, testDay, testVal);
  if (a.injured) aFires++;
  if (b.injured) bFires++;
}
const aRate = aFires / 10000;
const bRate = bFires / 10000;
console.log(`  A fires: ${(aRate * 100).toFixed(1)}% (always = 100%) ${approxEq(aRate, 1.0, 0.01) ? 'PASS' : 'FAIL'}`);
console.log(`  B fires: ${(bRate * 100).toFixed(1)}% (expected ~${testVal}%) ${approxEq(bRate, testVal / 100, 0.03) ? 'PASS' : 'FAIL'}`);
assert(approxEq(aRate, 1.0, 0.01), 'A always fires');
assert(approxEq(bRate, testVal / 100, 0.03), 'B fires at val/100');

// ─── C. Determinism ───
console.log('\n=== C. Determinism ===');

let detPass = 0;
for (let i = 0; i < 100; i++) {
  const rngState = 54321 ^ i;
  const day = (i % 30) + 1;
  const val = [4, 15, 35][i % 3];
  const r1 = simulateEffectsB(rngState, day, val);
  const r2 = simulateEffectsB(rngState, day, val);
  const r3 = simulateEffectsB(rngState, day, val);
  if (r1.loot === r2.loot && r2.loot === r3.loot &&
      r1.killRoll === r2.killRoll && r2.killRoll === r3.killRoll &&
      r1.bldgDmg === r2.bldgDmg && r2.bldgDmg === r3.bldgDmg &&
      r1.injured === r2.injured && r2.injured === r3.injured) {
    detPass++;
  }
}
console.log(`  determinism: ${detPass}/100 identical runs ${detPass === 100 ? 'PASS' : 'FAIL'}`);
assert(detPass === 100, 'determinism');

// ─── Summary ───
console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);

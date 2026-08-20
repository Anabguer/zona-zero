/**
 * P0 terreno canonico — validacion runtime QA publico.
 *   ZZ_EMAIL=... ZZ_PASSWORD=... node scripts/qa-neni-p0-terrain.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'review', 'qa-neni');
mkdirSync(outDir, { recursive: true });

const email = process.env.ZZ_EMAIL || '';
const password = process.env.ZZ_PASSWORD || '';
if (!email || !password) {
  console.error('ZZ_EMAIL / ZZ_PASSWORD required');
  process.exit(2);
}

const QA_URL =
  'https://intocables13.com/juegos/zona-zero/play.php?pilot=neni&qa=1&new=1&clear=1';

const report = { ok: [], fail: [], info: {} };
const pass = (m) => { report.ok.push(m); console.log('OK ', m); };
const fail = (m) => { report.fail.push(m); console.error('FAIL', m); };

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error') errors.push('console:' + t);
  if (t.includes('[pilot-place]') || t.includes('[pilot-hq]')) console.log('LOG', t);
});

await page.goto('https://intocables13.com/login.php', { waitUntil: 'domcontentloaded' });
const login = await page.evaluate(async ({ email, password }) => {
  const fd = new FormData();
  fd.append('email', email);
  fd.append('password', password);
  fd.append('remember', '1');
  const res = await fetch('/api/auth.php', { method: 'POST', body: fd, credentials: 'same-origin' });
  return res.json();
}, { email, password });
if (!login.success) throw new Error('login failed');
pass('login');

await page.goto(QA_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__zz?.getState?.(), null, { timeout: 90000 });
await page.waitForTimeout(1200);

const boot = await page.evaluate(() => {
  const st = window.__zz.getState();
  const hq = st.base.buildings.find((b) => String(b.type).startsWith('hq_'));
  return {
    terrain: !!st.flags.pilotTerrainCoords,
    hq: hq ? { x: hq.x, y: hq.y } : null,
    cands: st.flags.pilotHqCandidates,
    provisional: st.flags.pilotHqProvisional,
    rings: document.querySelectorAll('.zz-zone-owned-ring, .zz-zone-discovered-edge, .zz-zone-explore-ring, .zz-zone-contested-ring').length,
    slotHits: document.querySelectorAll('.zz-pilot-slot-hit').length,
  };
});
report.info.boot = boot;
if (boot.terrain) pass('pilotTerrainCoords'); else fail('pilotTerrainCoords missing');
if (boot.hq) pass(`HQ provisional @(${boot.hq.x},${boot.hq.y})`);
if (boot.rings === 0) pass('zone rings ocultos en piloto'); else fail(`rings residuales: ${boot.rings}`);
if (boot.slotHits === 0) pass('slot hits legacy ocultos'); else fail(`slot hits: ${boot.slotHits}`);

await page.evaluate(() => window.__zz.startBuild('house'));
await page.waitForTimeout(500);

const overlay = await page.evaluate(() => ({
  cells: document.querySelectorAll('.zz-pilot-buildable-cell').length,
  ghost: window.__zz.getState().buildGhost,
  mode: window.__zz.getState().buildMode,
}));
report.info.overlay = overlay;
if (overlay.cells > 100) pass(`overlay buildable ${overlay.cells} celdas`); else fail(`overlay debil: ${overlay.cells}`);
await page.screenshot({ path: join(outDir, 'p0-overlay-buildable.png') });

const placeTests = await page.evaluate(async () => {
  const st = window.__zz.getState();
  const content = window.__zz.getContent();
  const bp = await import('./js/build-place.js');
  const { terrainSemantic, terrainFootprintWorldRect } = await import('./js/pilot-terrain.js');
  const hq = st.base.buildings.find((b) => String(b.type).startsWith('hq_'));
  let blocked = null, forest = null, scrap = null, farBuildable = null;
  for (let cy = -6; cy <= 30; cy++) {
    for (let cx = -39; cx <= 36; cx++) {
      const s = terrainSemantic(cx, cy);
      if (!blocked && s === 'blocked') blocked = { x: cx, y: cy };
      if (!forest && s === 'forest') forest = { x: cx, y: cy };
      if (!scrap && s === 'scrap') scrap = { x: cx, y: cy };
      if (!farBuildable && s === 'buildable' && hq && Math.abs(cx - hq.x) + Math.abs(cy - hq.y) > 18) {
        if (bp.ghostPlacementOk(st, content, 'house', cx, cy).ok) farBuildable = { x: cx, y: cy };
      }
    }
  }
  const results = {};
  for (const [name, cell] of [['road_blocked', blocked], ['forest', forest], ['scrap', scrap]]) {
    if (!cell) { results[name] = { skip: true }; continue; }
    results[name] = { cell, semantic: terrainSemantic(cell.x, cell.y), ok: bp.ghostPlacementOk(st, content, 'house', cell.x, cell.y).ok };
  }
  let placed = null;
  if (farBuildable) {
    const check = bp.ghostPlacementOk(st, content, 'house', farBuildable.x, farBuildable.y);
    const r = window.__zz.place('house', farBuildable.x, farBuildable.y);
    const b = st.base.buildings.find((bl) => bl.type === 'house' && bl.x === farBuildable.x && bl.y === farBuildable.y);
    const rect = b ? terrainFootprintWorldRect(b.x, b.y, 4, 2) : null;
    placed = { anchor: farBuildable, checkOk: check.ok, placeOk: r.ok, stored: b ? { x: b.x, y: b.y } : null, worldTL: rect ? { x: rect.x, y: rect.y } : null, match: !!(b && b.x === farBuildable.x && b.y === farBuildable.y) };
  }
  const extras = [];
  for (const type of ['well', 'storage', 'workshop']) {
    let found = null;
    for (let cy = -6; cy <= 30 && !found; cy++) {
      for (let cx = -39; cx <= 36; cx++) {
        if (Math.abs(cx - hq.x) + Math.abs(cy - hq.y) < 10) continue;
        if (placed && Math.abs(cx - placed.anchor.x) + Math.abs(cy - placed.anchor.y) < 8) continue;
        if (extras.some((e) => Math.abs(cx - e.x) + Math.abs(cy - e.y) < 8)) continue;
        if (bp.ghostPlacementOk(st, content, type, cx, cy).ok) { found = { x: cx, y: cy }; break; }
      }
    }
    if (found) {
      const r = window.__zz.place(type, found.x, found.y);
      extras.push({ type, ...found, ok: r.ok });
    }
  }
  window.__zz.paint();
  return { results, placed, extras, hq: { x: hq.x, y: hq.y } };
});
report.info.placeTests = placeTests;

for (const [name, r] of Object.entries(placeTests.results)) {
  if (r.skip) { fail(`no celda ${name}`); continue; }
  if (r.ok === false) pass(`Casa en ${name} RECHAZADA @(${r.cell.x},${r.cell.y})`);
  else fail(`Casa en ${name} deberia rechazarse`);
}
if (placeTests.placed?.match && placeTests.placed.placeOk) pass(`Casa lejos exactamente (${placeTests.placed.anchor.x},${placeTests.placed.anchor.y})`);
else fail(`Casa lejos: ${JSON.stringify(placeTests.placed)}`);
if (placeTests.extras.filter((e) => e.ok).length >= 3) pass('3 edificios extra separados OK');
else fail(`extras: ${JSON.stringify(placeTests.extras)}`);

await page.evaluate(() => {
  window.__zz.cancelBuild?.();
  const st = window.__zz.getState();
  const camp = st.zones.find((z) => z.type === 'camp');
  if (camp && st.mapCamera) { st.mapCamera.x = camp.x; st.mapCamera.y = camp.y; st.mapCamera.zoom = 1.6; }
  window.__zz.paint();
});
await page.waitForTimeout(600);
await page.screenshot({ path: join(outDir, 'p0-four-buildings-separated.png') });

const roadGhost = await page.evaluate(async () => {
  window.__zz.startBuild('house');
  const st = window.__zz.getState();
  const { terrainSemantic, terrainFootprintWorldRect } = await import('./js/pilot-terrain.js');
  let cell = null;
  for (let cy = -6; cy <= 30 && !cell; cy++) {
    for (let cx = -39; cx <= 36; cx++) {
      if (terrainSemantic(cx, cy) === 'blocked') { cell = { x: cx, y: cy }; break; }
    }
  }
  if (!cell) return null;
  window.__zz.setGhost(cell.x, cell.y);
  const rect = terrainFootprintWorldRect(cell.x, cell.y, 4, 2);
  st.mapCamera.x = rect.cx;
  st.mapCamera.y = rect.cy - rect.h / 2;
  st.mapCamera.zoom = 2.2;
  window.__zz.paint();
  return { cell, valid: st.buildGhostValid };
});
report.info.roadGhost = roadGhost;
if (roadGhost && roadGhost.valid === false) pass('ghost carretera invalido');
else fail(`ghost carretera: ${JSON.stringify(roadGhost)}`);
await page.waitForTimeout(400);
await page.screenshot({ path: join(outDir, 'p0-house-on-road-rejected.png') });
await page.evaluate(() => window.__zz.cancelBuild?.());

const clickTests = await page.evaluate(async () => {
  const st = window.__zz.getState();
  const hq = st.base.buildings.find((b) => String(b.type).startsWith('hq_'));
  const house = st.base.buildings.find((b) => b.type === 'house');
  const out = {};
  for (const [label, b] of [['hq', hq], ['house', house]]) {
    if (!b) { out[label] = { miss: true }; continue; }
    const hit = document.querySelector(`.zz-pilot-bldg-hit[data-bldg="${b.id}"]`);
    if (!hit) { out[label] = { noHit: true }; continue; }
    const r = hit.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    hit.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, pointerId: 1 }));
    hit.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx, clientY: cy, pointerId: 1 }));
    await new Promise((res) => setTimeout(res, 100));
    const sheet = document.getElementById('zz-sheet');
    out[label] = { sheetOpen: sheet && !sheet.hidden, selected: st.selectedBuildingId === b.id };
    document.getElementById('zz-sheet-close')?.click();
  }
  if (house) {
    const hit = document.querySelector(`.zz-pilot-bldg-hit[data-bldg="${house.id}"]`);
    if (hit) {
      const r = hit.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      hit.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy, pointerId: 2 }));
      hit.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: cx + 40, clientY: cy + 20, pointerId: 2 }));
      await new Promise((res) => setTimeout(res, 50));
      const sheet = document.getElementById('zz-sheet');
      out.dragNoSheet = !sheet || sheet.hidden || st.selectedBuildingId !== house.id;
    }
  }
  return out;
});
report.info.clicks = clickTests;
if (clickTests.hq?.sheetOpen || clickTests.hq?.selected) pass('click HQ'); else fail(`click HQ: ${JSON.stringify(clickTests.hq)}`);
if (clickTests.house?.sheetOpen || clickTests.house?.selected) pass('click Casa'); else fail(`click Casa: ${JSON.stringify(clickTests.house)}`);
if (clickTests.dragNoSheet) pass('drag Casa no abre sheet'); else fail('drag abrio sheet');

await page.waitForTimeout(1600);
const before = await page.evaluate(() => window.__zz.getState().base.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y })));
await page.goto('https://intocables13.com/juegos/zona-zero/play.php?pilot=neni&qa=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForFunction(() => window.__zz?.getState?.(), null, { timeout: 90000 });
await page.waitForTimeout(800);
const after = await page.evaluate(() => window.__zz.getState().base.buildings.map((b) => ({ type: b.type, x: b.x, y: b.y })));
const persistOk = before.length === after.length && before.every((b) => after.some((a) => a.type === b.type && a.x === b.x && a.y === b.y));
if (persistOk) pass(`save ${after.length} edificios`); else fail(`persistencia fail`);
report.info.persist = { before, after };
await page.screenshot({ path: join(outDir, 'p0-after-reload.png') });

if (errors.length) report.info.errors = errors.slice(0, 20);
writeFileSync(join(outDir, 'p0-terrain-report.json'), JSON.stringify(report, null, 2));
console.log('PASS', report.ok.length, 'FAIL', report.fail.length);
console.log('HQ candidates', JSON.stringify(boot.cands, null, 2));
await browser.close();
process.exit(report.fail.length ? 1 : 0);


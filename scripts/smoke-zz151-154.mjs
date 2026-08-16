/**
 * Smoke ZZ-151…154 — alertas · ayuda · diario · a11y
 * node scripts/smoke-zz151-154.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loadJson = (n) => JSON.parse(readFileSync(join(root, 'content', n), 'utf8'));
const css = readFileSync(join(root, 'css', 'world.css'), 'utf8');
const locationsDoc = loadJson('locations.json');
const content = {
  balance: loadJson('balance.json'),
  buildings: loadJson('buildings.json'),
  eventsDoc: loadJson('events.json'),
  survivorsDoc: loadJson('survivors.json'),
  researchDoc: loadJson('research.json'),
  vehiclesDoc: loadJson('vehicles.json'),
  infectedDoc: loadJson('infected.json'),
  factionsDoc: loadJson('factions.json'),
  erasDoc: loadJson('eras.json'),
  locationsDoc,
  missionsDoc: loadJson('missions.json'),
  achievementsDoc: loadJson('achievements.json'),
  zonesDoc: { zones: locationsDoc.seedLayout || [] },
};

const { createNewState, pushLog, diaryEntries } = await import(
  pathToFileURL(join(root, 'js', 'state.js')).href
);
const { criticalBannerAlert, missionAlert, collectAlerts } = await import(
  pathToFileURL(join(root, 'js', 'alerts.js')).href
);
const { visibleHelpTopics, renderHelpHtml, HELP_TOPICS } = await import(
  pathToFileURL(join(root, 'js', 'help.js')).href
);

let fails = 0;
function assert(c, m) {
  if (!c) {
    console.error('FAIL', m);
    fails++;
  } else console.log('OK', m);
}

// ZZ-151
const s = createNewState(content, 'Alertas', 'a151');
s.day = 10;
s.flags.onboardingDone = true;
s.pendingAttack = { arrivesOnDay: 12, intensity: 3, horde: { label: 'Oleada' } };
s.director.protectionUntil = 20;
const banner = criticalBannerAlert(s, content);
assert(banner?.id === 'pending_attack', `banner crítico ataque (${banner?.id})`);
const mission = missionAlert(s, content);
assert(mission?.id === 'recovery' || !mission || mission.id !== 'pending_attack', `chip no duplica banner (${mission?.id})`);
const alerts = collectAlerts(s, content);
assert(alerts.some((a) => a.id === 'pending_attack'), 'collect incluye ataque');

s.pendingAttack = null;
s.resources.food = 0;
s.population.total = 5;
const foodBan = criticalBannerAlert(s, content);
assert(foodBan?.id === 'food_critical', 'banner comida crítica');

// ZZ-152
const early = createNewState(content, 'Help', 'h152');
const earlyTopics = visibleHelpTopics(early);
assert(earlyTopics.every((t) => !['research', 'contacts', 'vehicles', 'health'].includes(t.id)), 'sin spoilers early');
assert(earlyTopics.some((t) => t.id === 'controls'), 'controles siempre');
early.flags.onboardingDone = true;
early.base.buildings.push({ id: 'tb', type: 'tech_bench', hp: 100, x: 0, y: 0 });
const { html, topics } = renderHelpHtml(early);
assert(html.includes('Investigación') || topics.some((t) => t.id === 'research'), 'research tras banco');
assert((early.meta.helpSeenTopics || []).length >= 2, 'helpSeenTopics marcado');
assert(HELP_TOPICS.length >= 8, 'catálogo temas');

// ZZ-153
const d = createNewState(content, 'Diary', 'd153');
pushLog(d, 'Amanece el día 2.', 'story', { routine: true });
pushLog(d, 'Construís Huerto.', 'good');
pushLog(d, 'Escasez de comida.', 'bad');
const diary = diaryEntries(d, 10);
assert(!diary.some((e) => /Amanece/.test(e.text)), 'diario sin routine amanecer');
assert(diary.some((e) => /Huerto|Escasez/.test(e.text)), 'diario conserva hechos');

// ZZ-154
assert(css.includes('prefers-reduced-motion'), 'reduced-motion');
assert(css.includes('min-width: 44px') || css.includes('min-height: 44px'), 'tap targets');
assert(css.includes('focus-visible'), 'focus-visible');
assert(css.includes('zz-diary'), 'diary CSS');

console.log(fails ? `FAIL ${fails}` : 'smoke-zz151-154 OK');
process.exit(fails ? 1 : 0);

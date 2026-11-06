import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createState,
  tick,
  sizeUp,
  orderMove,
  placeUnit,
  beginApply,
  beginRescue,
  beginVent,
  beginSecure,
  beginOverhaul,
  requestAssistance,
  setUnitMode,
  situationNumbers,
  suppressionRate,
  toolRange,
  studyNotes,
  endExercise,
  getUnit,
  zoneById,
  insideFuselage,
  parkingSpot,
  horizontalDistance,
} from './sim.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function intensities(state) {
  return state.zones.map((z) => [z.id, Math.round(z.intensity * 100) / 100, Math.round(z.fuel * 100) / 100]);
}

function run(state, seconds) {
  let left = seconds;
  while (left > 0) {
    const step = Math.min(0.1, left);
    tick(state, step);
    left -= step;
  }
}

const sameA = createState({ seed: 7, course: 'exterior', equipment: 'full' });
const sameB = createState({ seed: 7, course: 'exterior', equipment: 'full' });
assert(JSON.stringify(intensities(sameA)) === JSON.stringify(intensities(sameB)), 'same seed matches');
const seatA = sameA.zones.find((z) => z.seat).id;
const other = createState({ seed: 99, course: 'exterior', equipment: 'full', forceEngine: 'eng4' });
assert(other.zones.find((z) => z.seat).id === 'eng4', 'forced engine seat');
assert(seatA === 'eng1' || seatA === 'eng2' || seatA === 'eng3' || seatA === 'eng4', 'seat is an engine');

const windA = createState({ seed: 42, course: 'exterior', equipment: 'full' });
const windB = createState({ seed: 42, course: 'exterior', equipment: 'full' });
windA.weather.windKt = 99;
windA.weather.windFrom = 12;
windA.weather.tempC = -40;
windB.weather.windKt = 0;
windB.weather.windFrom = 300;
windB.weather.tempC = 50;
run(windA, 20);
run(windB, 20);
assert(JSON.stringify(intensities(windA)) === JSON.stringify(intensities(windB)), 'wind and temperature do not change the fire');
assert(JSON.stringify(situationNumbers(windA)) === JSON.stringify(situationNumbers(windB)), 'situation numbers ignore weather');

const blocked = createState({ seed: 3, course: 'exterior', equipment: 'full' });
const early = beginApply(blocked, { unitId: 'crash3', tool: 'turret', agent: 'afff' });
assert(early.ok === false, 'cannot apply before positioning');
assert(/position/i.test(early.reason), 'position message, got ' + early.reason);

const rangeState = createState({ seed: 5, course: 'exterior', equipment: 'full', forceEngine: 'eng2' });
const engine = zoneById(rangeState, 'eng2');
const before = engine.intensity;
placeUnit(rangeState, 'crash3', engine.x, engine.z + 70);
const missed = beginApply(rangeState, { unitId: 'crash3', tool: 'turret', agent: 'afff', zoneId: 'eng2', pattern: 'straight' });
assert(missed.ok && missed.reached === false, 'far turret reports short');
const tankBeforeMiss = getUnit(rangeState, 'crash3').tank.afff;
run(rangeState, 2);
assert(engine.intensity >= before - 0.4, 'short stream does not knock down, intensity ' + engine.intensity);
assert(getUnit(rangeState, 'crash3').tank.afff < tankBeforeMiss, 'short stream still uses agent');
assert(rangeState.stats.shortStreams > 0, 'short stream counted');

placeUnit(rangeState, 'crash3', engine.x + 6, engine.z + 4);
assert(horizontalDistance(getUnit(rangeState, 'crash3').x, getUnit(rangeState, 'crash3').z, engine.x, engine.z) < toolRange('turret', 'straight'), 'close placement is in range');
const hit = beginApply(rangeState, { unitId: 'crash3', tool: 'turret', agent: 'afff', zoneId: 'eng2', pattern: 'straight' });
assert(hit.reached === true, 'close turret reaches');
const burning = engine.intensity;
const tankAtHit = getUnit(rangeState, 'crash3').tank.afff;
run(rangeState, 3);
assert(engine.intensity < burning - 4, 'in-range AFFF drops the engine, now ' + engine.intensity);
assert(getUnit(rangeState, 'crash3').tank.afff < tankAtHit - 5, 'tank drops while flowing');

const full = createState({ seed: 1, course: 'exterior', equipment: 'full', forceEngine: 'eng1' });
const half = createState({ seed: 1, course: 'exterior', equipment: 'full', forceEngine: 'eng1' });
placeUnit(full, 'crash3', -10, 4);
placeUnit(half, 'crash3', -10, 4);
beginApply(full, { unitId: 'crash3', tool: 'turret', agent: 'afff', zoneId: 'eng1' });
setUnitMode(half, 'crash3', 'modulate');
beginApply(half, { unitId: 'crash3', tool: 'turret', agent: 'afff', zoneId: 'eng1' });
run(full, 2);
run(half, 2);
const usedFull = 120 - getUnit(full, 'crash3').tank.afff;
const usedHalf = 120 - getUnit(half, 'crash3').tank.afff;
assert(usedHalf < usedFull * 0.7, 'modulate uses less agent ' + usedHalf + ' vs ' + usedFull);

assert(suppressionRate('afff', 'turret', 'pool', 'straight', false, {}) > suppressionRate('water', 'turret', 'pool', 'straight', false, {}) * 2, 'AFFF beats water on a pool');
assert(toolRange('handline', 'fog') < toolRange('handline', 'straight'), 'fog pattern is shorter');

const poolA = createState({ seed: 8, course: 'exterior', equipment: 'full', forceEngine: 'eng3' });
const poolB = createState({ seed: 8, course: 'exterior', equipment: 'full', forceEngine: 'eng3' });
for (const s of [poolA, poolB]) {
  s.secured.fuel = true;
  const pool = zoneById(s, 'pool');
  pool.intensity = 46;
  pool.fuel = 80;
  pool.x = 16;
  pool.z = 4;
  placeUnit(s, 'crash3', 16, 12);
}
beginApply(poolA, { unitId: 'crash3', tool: 'turret', agent: 'afff', zoneId: 'pool' });
beginApply(poolB, { unitId: 'crash3', tool: 'turret', agent: 'water', zoneId: 'pool' });
run(poolA, 3);
run(poolB, 3);
assert(zoneById(poolA, 'pool').intensity < zoneById(poolB, 'pool').intensity - 5, 'AFFF integration beats water on the pool');

const halon = createState({ seed: 4, course: 'interior', equipment: 'full' });
assert(halon.people.aboard > 0, 'interior starts with people aboard');
placeUnit(halon, 'crash3', 6, -2);
beginApply(halon, { unitId: 'crash3', tool: 'turret', agent: 'halon', zoneId: 'cabin' });
run(halon, 7);
assert(halon.people.unaccounted >= 1, 'Halon before rescue raises the unaccounted count');
const cleared = createState({ seed: 4, course: 'interior', equipment: 'full' });
cleared.people.recovered = cleared.people.aboard;
cleared.people.aboard = 0;
placeUnit(cleared, 'crash3', 6, -2);
beginApply(cleared, { unitId: 'crash3', tool: 'turret', agent: 'halon', zoneId: 'cabin' });
run(cleared, 7);
assert(cleared.people.unaccounted === 0, 'Halon after the count is clear does not add unaccounted');

const vented = createState({ seed: 11, course: 'interior', equipment: 'full' });
const held = createState({ seed: 11, course: 'interior', equipment: 'full' });
placeUnit(vented, 'engine7', -10, -16);
placeUnit(held, 'engine7', -10, -16);
const ventTry = beginVent(vented, { unitId: 'engine7', entryId: 'crew' });
if (!ventTry.ok) {
  const open = vented.entries.find((e) => !e.blocked);
  placeUnit(vented, 'engine7', open.x + Math.sign(open.x || -1) * 6, open.z);
  placeUnit(held, 'engine7', open.x + Math.sign(open.x || -1) * 6, open.z);
  assert(beginVent(vented, { unitId: 'engine7', entryId: open.id }).ok, 'vent starts');
}
run(vented, 14);
run(held, 14);
assert(zoneById(vented, 'cabin').intensity > zoneById(held, 'cabin').intensity + 4, 'uncovered vent grows the cabin fire');

const wet = createState({ seed: 12, course: 'interior', equipment: 'full' });
const safer = createState({ seed: 12, course: 'interior', equipment: 'full' });
safer.secured.electrical = true;
for (const s of [wet, safer]) {
  zoneById(s, 'cabin').intensity = 40;
  placeUnit(s, 'engine7', 6, -4);
  beginApply(s, { unitId: 'engine7', tool: 'handline', agent: 'water', zoneId: 'cabin' });
}
run(wet, 4);
run(safer, 4);
assert(zoneById(safer, 'cabin').intensity < zoneById(wet, 'cabin').intensity - 3, 'water works better after electrical is secured');

const fuel = createState({ seed: 13, course: 'exterior', equipment: 'full', forceEngine: 'eng1' });
const openFuel = createState({ seed: 13, course: 'exterior', equipment: 'full', forceEngine: 'eng1' });
fuel.secured.fuel = true;
run(fuel, 18);
run(openFuel, 18);
assert(zoneById(fuel, 'eng1').intensity < zoneById(openFuel, 'eng1').intensity - 3, 'securing fuel slows the engine fire');

const chem = createState({ seed: 15, course: 'exterior', equipment: 'full', forceEngine: 'eng4' });
const eng4 = zoneById(chem, 'eng4');
eng4.intensity = 28;
eng4.fuel = 70;
placeUnit(chem, 'crash3', 22, 2);
beginApply(chem, { unitId: 'crash3', tool: 'turret', agent: 'drychem', zoneId: 'eng4' });
run(chem, 5);
assert(eng4.intensity < 6, 'dry chemical knocks the engine down, left ' + eng4.intensity);
setUnitMode(chem, 'crash3', 'standby');
run(chem, 10);
assert(eng4.intensity > 15, 'dry chemical reflash while fuel remains, now ' + eng4.intensity);
const watched = createState({ seed: 15, course: 'exterior', equipment: 'full', forceEngine: 'eng4' });
const w4 = zoneById(watched, 'eng4');
w4.intensity = 16;
w4.fuel = 70;
w4.knockedBy = 'drychem';
placeUnit(watched, 'crash3', 22, 2);
assert(beginOverhaul(watched, { unitId: 'crash3', zoneId: 'eng4' }).ok, 'overhaul starts');
run(watched, 8);
assert(w4.overhauled === true, 'overhaul marks the zone');
const afterOverhaul = w4.intensity;
run(watched, 10);
assert(w4.intensity <= afterOverhaul + 1, 'overhaul prevents the reflash');

const move = createState({ seed: 2, course: 'exterior', equipment: 'full' });
const spot = parkingSpot(move, zoneById(move, move.zones.find((z) => z.seat).id).id, 'turret');
assert(!insideFuselage(spot.x, spot.z), 'parking spot stays off the fuselage');
orderMove(move, 'crash3', spot.x, spot.z);
run(move, 12);
const crash3 = getUnit(move, 'crash3');
assert(crash3.positioned, 'truck arrives and is positioned');
assert(horizontalDistance(crash3.x, crash3.z, spot.x, spot.z) < 2.5, 'truck reaches the spot');
assert(!insideFuselage(crash3.x, crash3.z), 'truck does not finish inside the fuselage');

const sized = createState({ seed: 6, course: 'interior', equipment: 'full' });
assert(sized.people.known === false, 'occupants hidden before size-up');
sizeUp(sized);
assert(sized.people.known === true, 'size-up reveals the count');
assert(sized.firstAction === 'SIZE-UP', 'size-up can be first');
assert(sized.entries.some((e) => e.blocked), 'a door is blocked');
const notes = studyNotes(sized);
assert(notes.some((n) => /size-?up/i.test(n)), 'study note mentions size-up');
assert(notes.some((n) => /illustrative toy/i.test(n)), 'study note labels the toy');

const aid = createState({ seed: 19, course: 'exterior', equipment: 'full', forceEngine: 'eng1' });
const foam = requestAssistance(aid, 'foam');
assert(foam.ok, 'foam request accepted');
const drained = getUnit(aid, 'crash3');
drained.tank.afff = 3;
run(aid, 21);
assert(getUnit(aid, 'crash3').tank.afff === getUnit(aid, 'crash3').tankMax.afff, 'foam resupply refills AFFF');
assert(aid.support.foam === true, 'foam support flag');

const rescue = createState({ seed: 21, course: 'exterior', equipment: 'full', forceBlocked: 'troop' });
const door = rescue.entries.find((e) => e.id === 'crew');
assert(!door.blocked, 'crew door open when troop is blocked');
placeUnit(rescue, 'rescue6', door.x - 6, door.z);
assert(beginRescue(rescue, { unitId: 'rescue6', entryId: 'troop' }).ok === false, 'blocked door rejects rescue');
assert(beginRescue(rescue, { unitId: 'rescue6', entryId: 'crew' }).ok, 'open door accepts rescue');
const aboard = rescue.people.aboard;
run(rescue, 20);
assert(rescue.people.recovered > 0, 'rescue reduces the aboard count via recovered');
assert(rescue.people.aboard < aboard, 'aboard fell');

const secure = createState({ seed: 22, course: 'exterior', equipment: 'full' });
placeUnit(secure, 'engine7', 8, 12);
assert(beginSecure(secure, { unitId: 'engine7', system: 'fuel' }).ok, 'secure starts');
run(secure, 10);
assert(secure.secured.fuel === true, 'fuel becomes secured');

const report = endExercise(sized);
assert(report.log.length > 0, 'summary keeps the log');
assert(report.course === 'interior', 'summary course');
assert(report.notes.length > 0, 'summary notes');

const root = path.resolve(__dirname, '../..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'shared/data/experiments.json'), 'utf8'));
const card = catalog.experiments.find((e) => e.id === 'firefighter-simulator');
assert(card, 'experiments catalog has the simulator');
assert(card.href === 'experiments/firefighter-simulator/', 'catalog href');
assert(card.showOnTopLevel === true, 'listed on the home grid');
assert(card.topics.some((t) => t.href === 'experiments/firefighter-simulator/'), 'topic link');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
const scene = fs.readFileSync(path.join(__dirname, 'scene.js'), 'utf8');
const bundle = html + app + scene + fs.readFileSync(path.join(__dirname, 'sim.js'), 'utf8');
assert(html.includes('Modern 3D reconstruction inspired by the documented predecessor; not original software or validated firefighting training.'), 'disclaimer sentence');
assert(html.includes('https://archive.org/details/DTIC_ADA221132'), 'archive link');
assert(html.includes('ESL-TR-86-35'), 'report number');
assert(html.includes('Christina Uyak'), 'author citation');
assert(/laserdisc|videodisc/i.test(html), 'original visuals explained');
assert(!/quintar/i.test(bundle), 'no Quintar branding');
assert(!/Richard Bailey/i.test(bundle), 'no Richard attribution');
assert(!/official (U\.S\. |US )?(Air Force|Navy) (training|trainer)/i.test(bundle), 'not presented as an official trainer');

console.log('firefighter-simulator selftest ok');

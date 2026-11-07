// Aircraft anchors and the scenario library.
// Only the two predecessor ids are the documented 1988 courses.
// Every other incident is a fictional extension for this page.

const seatDown = (state) => {
  const zone = state.zones.find((z) => z.seat);
  return !!zone && zone.intensity < 8;
};

const down = (id) => (state) => {
  const zone = state.zones.find((z) => z.id === id);
  return !!zone && zone.intensity < 8;
};

const aboardClear = (state) => state.people.aboard === 0;

const hangarSafe = (state) => {
  const zone = state.zones.find((z) => z.id === 'hangar');
  return !!zone && zone.peak < 12;
};

const wingsQuiet = (state) => state.zones.filter((z) => z.kind === 'wing').every((z) => z.peak < 28);

const gearNote = 'Assumption in this toy: a gear fire responds more to water than a fuel pool does. That is not a procedure.';
const nightNote = 'Night is a visibility setting only. It does not change the toy fire.';
const deckNote = 'Fictional practice deck. Not a ship, not a Navy trainer, and not a historical scenario.';
const hangarNote = 'Assumption in this toy: a nearby structure starts to burn if the aircraft fire stays large. Knocking that fire down prevents it.';
const fictional = 'Fictional extension. Not part of the 1988 simulator, and not evidence about anyone’s later work.';

export const AIRFRAMES = {
  starlifter: {
    id: 'starlifter',
    shape: 'starlifter',
    name: 'C-141-style transport',
    keepout: { rx: 5.4, rz: 25.5 },
    mapSpan: 46,
    frame: { pos: [-40, 22, 62], target: [-2, 3.4, -4] },
    interior: { pos: [-0.15, 2.5, -9], look: [0.4, 2.2, 8] },
    engines: [
      { id: 'eng1', name: 'No. 1 engine', x: -16, y: 3.35, z: -2 },
      { id: 'eng2', name: 'No. 2 engine', x: -7, y: 3.35, z: -2 },
      { id: 'eng3', name: 'No. 3 engine', x: 7, y: 3.35, z: -2 },
      { id: 'eng4', name: 'No. 4 engine', x: 16, y: 3.35, z: -2 },
    ],
    wings: [
      { id: 'wingL', name: 'Left wing', x: -12, y: 4.9, z: -2 },
      { id: 'wingR', name: 'Right wing', x: 12, y: 4.9, z: -2 },
    ],
    cabin: { id: 'cabin', name: 'Cabin', x: 0, y: 3.05, z: -6 },
    gear: [
      { id: 'gearL', name: 'Left main gear', x: -2.2, y: 0.5, z: 2 },
      { id: 'gearR', name: 'Right main gear', x: 2.2, y: 0.5, z: 2 },
    ],
    entries: [
      { id: 'crew', name: 'Crew door', kind: 'normal', x: -3.4, y: 1.5, z: -16 },
      { id: 'troop', name: 'Troop door', kind: 'emergency', x: -3.4, y: 1.5, z: 8 },
      { id: 'ramp', name: 'Cargo ramp', kind: 'normal', x: 0, y: 1.1, z: 23 },
      { id: 'cutin', name: 'Cut-in', kind: 'cut-in', x: 3.4, y: 1.8, z: -2 },
    ],
  },
  hercules: {
    id: 'hercules',
    shape: 'hercules',
    name: 'C-130-style turboprop',
    keepout: { rx: 3.6, rz: 16 },
    mapSpan: 36,
    frame: { pos: [-34, 16, 44], target: [0, 3, 0] },
    interior: { pos: [-0.2, 2.2, -4], look: [0.2, 1.8, 6] },
    engines: [
      { id: 'eng1', name: 'No. 1 prop', x: -13, y: 3.5, z: -0.4 },
      { id: 'eng2', name: 'No. 2 prop', x: -6.2, y: 3.7, z: -0.2 },
      { id: 'eng3', name: 'No. 3 prop', x: 6.2, y: 3.7, z: -0.2 },
      { id: 'eng4', name: 'No. 4 prop', x: 13, y: 3.5, z: -0.4 },
    ],
    wings: [
      { id: 'wingL', name: 'Left wing', x: -10, y: 4.4, z: 0 },
      { id: 'wingR', name: 'Right wing', x: 10, y: 4.4, z: 0 },
    ],
    cabin: { id: 'cabin', name: 'Cargo cabin', x: 0, y: 2.5, z: -1 },
    gear: [
      { id: 'gearL', name: 'Left main gear', x: -2, y: 0.45, z: 1 },
      { id: 'gearR', name: 'Right main gear', x: 2, y: 0.45, z: 1 },
    ],
    entries: [
      { id: 'crew', name: 'Crew door', kind: 'normal', x: -2.6, y: 1.6, z: -7 },
      { id: 'troop', name: 'Paratroop door', kind: 'emergency', x: -2.6, y: 1.6, z: 4 },
      { id: 'ramp', name: 'Cargo ramp', kind: 'normal', x: 0, y: 1.2, z: 14 },
    ],
  },
  widebody: {
    id: 'widebody',
    shape: 'widebody',
    name: 'Large tanker / airliner',
    keepout: { rx: 4.8, rz: 28 },
    mapSpan: 54,
    frame: { pos: [-52, 26, 74], target: [0, 4, 2] },
    interior: { pos: [0, 3.1, -8], look: [0.4, 2.6, 10] },
    engines: [
      { id: 'eng1', name: 'No. 1 engine', x: -18, y: 1.7, z: 2 },
      { id: 'eng2', name: 'No. 2 engine', x: -9, y: 1.75, z: 1 },
      { id: 'eng3', name: 'No. 3 engine', x: 9, y: 1.75, z: 1 },
      { id: 'eng4', name: 'No. 4 engine', x: 18, y: 1.7, z: 2 },
    ],
    wings: [
      { id: 'wingL', name: 'Left wing', x: -14, y: 2.3, z: 0.5 },
      { id: 'wingR', name: 'Right wing', x: 14, y: 2.3, z: 0.5 },
    ],
    cabin: { id: 'cabin', name: 'Cabin', x: 0, y: 3.3, z: -6 },
    gear: [
      { id: 'gearL', name: 'Left main gear', x: -4.5, y: 0.55, z: 6 },
      { id: 'gearR', name: 'Right main gear', x: 4.5, y: 0.55, z: 6 },
    ],
    entries: [
      { id: 'crew', name: 'Forward door', kind: 'normal', x: -3.4, y: 2.4, z: -16 },
      { id: 'mid', name: 'Mid door', kind: 'emergency', x: -3.4, y: 2.4, z: 4 },
    ],
  },
  bizjet: {
    id: 'bizjet',
    shape: 'bizjet',
    name: 'Small business jet',
    keepout: { rx: 1.7, rz: 8.5 },
    mapSpan: 22,
    frame: { pos: [-18, 9, 26], target: [0, 1.6, 0] },
    interior: { pos: [0, 1.45, -2], look: [0.2, 1.3, 3] },
    engines: [
      { id: 'engL', name: 'Left rear engine', x: -1.55, y: 1.7, z: 4.2 },
      { id: 'engR', name: 'Right rear engine', x: 1.55, y: 1.7, z: 4.2 },
    ],
    wings: [
      { id: 'wingL', name: 'Left wing', x: -4.5, y: 1.45, z: -0.6 },
      { id: 'wingR', name: 'Right wing', x: 4.5, y: 1.45, z: -0.6 },
    ],
    cabin: { id: 'cabin', name: 'Cabin', x: 0, y: 1.55, z: -1.5 },
    gear: [
      { id: 'gearL', name: 'Left main gear', x: -1.1, y: 0.35, z: 0.4 },
      { id: 'gearR', name: 'Right main gear', x: 1.1, y: 0.35, z: 0.4 },
    ],
    entries: [
      { id: 'crew', name: 'Cabin door', kind: 'normal', x: -1.35, y: 1.2, z: -2.4 },
      { id: 'hatch', name: 'Overwing hatch', kind: 'emergency', x: 1.2, y: 1.7, z: -0.4 },
    ],
  },
  fighterTwin: {
    id: 'fighterTwin',
    shape: 'fighterTwin',
    name: 'Twin-engine fighter',
    keepout: { rx: 1.6, rz: 8 },
    mapSpan: 18,
    frame: { pos: [-16, 8, 22], target: [0, 1.5, 1] },
    interior: { pos: [0, 1.55, -2.2], look: [0, 1.4, 2] },
    engines: [
      { id: 'engL', name: 'Left engine bay', x: -0.75, y: 1.25, z: 4.6 },
      { id: 'engR', name: 'Right engine bay', x: 0.75, y: 1.25, z: 4.6 },
    ],
    wings: [
      { id: 'wingL', name: 'Left wing', x: -3.6, y: 1.35, z: 0.4 },
      { id: 'wingR', name: 'Right wing', x: 3.6, y: 1.35, z: 0.4 },
    ],
    cabin: { id: 'cabin', name: 'Cockpit', x: 0, y: 1.7, z: -2.6 },
    gear: [
      { id: 'gearL', name: 'Left main gear', x: -1.3, y: 0.35, z: 0.8 },
      { id: 'gearR', name: 'Right main gear', x: 1.3, y: 0.35, z: 0.8 },
    ],
    entries: [
      { id: 'crew', name: 'Canopy', kind: 'normal', x: 0, y: 1.9, z: -2.4 },
    ],
  },
  fighterSingle: {
    id: 'fighterSingle',
    shape: 'fighterSingle',
    name: 'Single-engine fighter',
    keepout: { rx: 1.35, rz: 7.2 },
    mapSpan: 16,
    frame: { pos: [-14, 7, 20], target: [0, 1.4, 0] },
    interior: { pos: [0, 1.45, -1.6], look: [0, 1.3, 2] },
    engines: [
      { id: 'eng1', name: 'Engine', x: 0, y: 1.15, z: 4.2 },
    ],
    wings: [
      { id: 'wingL', name: 'Left wing', x: -3.2, y: 1.25, z: -0.2 },
      { id: 'wingR', name: 'Right wing', x: 3.2, y: 1.25, z: -0.2 },
    ],
    cabin: { id: 'cabin', name: 'Cockpit', x: 0, y: 1.55, z: -2.2 },
    gear: [
      { id: 'gearL', name: 'Left main gear', x: -1.1, y: 0.32, z: 0.2 },
      { id: 'gearR', name: 'Right main gear', x: 1.1, y: 0.32, z: 0.2 },
    ],
    entries: [
      { id: 'crew', name: 'Canopy', kind: 'normal', x: 0, y: 1.75, z: -2 },
    ],
  },
  helo: {
    id: 'helo',
    shape: 'helo',
    name: 'Rotary-wing transport',
    keepout: { rx: 2.5, rz: 6.2 },
    mapSpan: 24,
    frame: { pos: [-20, 12, 26], target: [0, 2.2, 0] },
    interior: { pos: [0, 1.7, -1], look: [0.3, 1.5, 3] },
    engines: [
      { id: 'exh', name: 'Exhaust bay', x: 0.2, y: 3.15, z: -0.4 },
    ],
    wings: [],
    cabin: { id: 'cabin', name: 'Cabin', x: 0, y: 1.7, z: 0.2 },
    gear: [],
    entries: [
      { id: 'crew', name: 'Cabin door', kind: 'normal', x: -1.7, y: 1.3, z: 0.4 },
      { id: 'side', name: 'Opposite door', kind: 'emergency', x: 1.7, y: 1.3, z: 0.4 },
    ],
  },
};

const fight = (unit, tool, agent, extra = {}) => ({
  unit,
  tool,
  agent,
  pattern: 'straight',
  zones: ['seat'],
  overhaul: false,
  rescue: false,
  rescueFirst: false,
  rescueUnit: 'rescue6',
  entry: 'crew',
  secure: null,
  secureUnit: 'engine7',
  driveTimeout: 24,
  ...extra,
});

export const SCENARIOS = [
  {
    id: 'predecessor-exterior',
    legacy: true,
    fictional: false,
    course: 'exterior',
    aircraft: 'starlifter',
    scene: 'apron',
    night: false,
    title: 'Engine fire on the ramp',
    brief: 'Documented predecessor, exterior course. A C-141-style transport is on the apron with an engine fire just becoming visible. This is the 1988 exercise, retold with toy numbers.',
    demoIntro: 'Size-up first. Name the seat of the fire before anyone flows agent.',
    plan: fight('crash3', 'turret', 'afff', { overhaul: true, rescue: true, secure: 'fuel', zones: ['seat'] }),
    objectives: [
      { id: 'fire', text: 'Knock the engine fire down', done: seatDown },
      { id: 'people', text: 'Account for everyone aboard', done: aboardClear },
    ],
  },
  {
    id: 'predecessor-interior',
    legacy: true,
    fictional: false,
    course: 'interior',
    aircraft: 'starlifter',
    scene: 'apron',
    night: false,
    title: 'Cabin fire after landing',
    brief: 'Documented predecessor, interior course. The transport has landed after an electrical fire. People are still aboard, counted only as a number. Halon before that count is clear raises the unaccounted tally in this toy.',
    demoIntro: 'Size-up before anyone goes in. Halon is available and is the wrong first move while people are aboard.',
    plan: fight('engine7', 'handline', 'water', {
      zones: ['cabin'],
      rescue: true,
      rescueFirst: true,
      secure: 'electrical',
      secureUnit: 'engine7',
    }),
    objectives: [
      { id: 'people', text: 'Get the aboard count to zero before Halon', done: aboardClear },
      { id: 'fire', text: 'Bring the cabin fire down', done: down('cabin') },
    ],
  },
  {
    id: 'herc-prop',
    fictional: true,
    course: 'exterior',
    aircraft: 'hercules',
    scene: 'runway',
    night: false,
    staging: { z: 72, x0: -12, gap: 11 },
    occupants: 3,
    smoke: 14,
    blocked: 'troop',
    title: 'Prop fire on a remote runway',
    brief: fictional + ' A C-130-style turboprop is at the far end of the runway. The outboard prop is burning. The trucks have a long roll before they are in range.',
    demoIntro: 'Remote runway. Size-up, then send the turret truck. The drive is longer than the apron.',
    fires: [
      { id: 'eng1', intensity: 24, fuel: 70, seat: true },
    ],
    plan: fight('crash3', 'turret', 'afff', { overhaul: true, rescue: true, driveTimeout: 36 }),
    objectives: [
      { id: 'fire', text: 'Knock down the outboard prop fire', done: seatDown },
      { id: 'people', text: 'Account for the crew', done: aboardClear },
    ],
  },
  {
    id: 'herc-cabin',
    fictional: true,
    course: 'interior',
    aircraft: 'hercules',
    scene: 'apron',
    night: false,
    occupants: 6,
    smoke: 36,
    blocked: 'troop',
    title: 'Cargo-cabin smoke',
    brief: fictional + ' Smoke is building in the cargo cabin of a parked turboprop. Getting the count out matters more than the size of the flame. There is no injury depiction.',
    demoIntro: 'Cabin smoke. Send rescue and secure electrical before flowing water.',
    fires: [
      { id: 'cabin', intensity: 18, fuel: 64, seat: true },
    ],
    plan: fight('engine7', 'handline', 'water', {
      zones: ['cabin'],
      rescue: true,
      rescueFirst: true,
      secure: 'electrical',
    }),
    objectives: [
      { id: 'people', text: 'Clear the cabin count', done: aboardClear },
      { id: 'fire', text: 'Bring cabin smoke and fire down', done: down('cabin') },
    ],
  },
  {
    id: 'tanker-spill',
    fictional: true,
    course: 'exterior',
    aircraft: 'widebody',
    scene: 'apron',
    night: false,
    occupants: 2,
    smoke: 16,
    blocked: 'mid',
    lockPool: true,
    poolSpreads: true,
    title: 'Wing fuel spill',
    brief: fictional + ' A large tanker is on the apron with a fuel pool already burning under the left wing. In this toy the pool can creep into the wing if it stays large. AFFF is the strong match here. Water barely moves it.',
    demoIntro: 'The pool is the seat of the fire. Put AFFF on it before it reaches the wing.',
    fires: [
      { id: 'pool', x: -12, z: 4, intensity: 34, fuel: 84, seat: true },
    ],
    plan: fight('crash3', 'turret', 'afff', { zones: ['pool'], overhaul: true, rescue: true }),
    objectives: [
      { id: 'pool', text: 'Knock down the fuel pool', done: down('pool') },
      { id: 'wing', text: 'Keep the wings from becoming involved', done: wingsQuiet },
      { id: 'people', text: 'Account for the crew', done: aboardClear },
    ],
  },
  {
    id: 'tanker-night-gear',
    fictional: true,
    course: 'exterior',
    aircraft: 'widebody',
    scene: 'apron',
    night: true,
    occupants: 0,
    smoke: 8,
    blocked: null,
    title: 'Night gear fire',
    brief: fictional + ' ' + nightNote + ' A main-gear fire on the tanker, after dark. ' + gearNote,
    assumption: gearNote + ' ' + nightNote,
    demoIntro: 'Night does not change the fire. Engine 7 flows water on the gear.',
    fires: [
      { id: 'gearL', intensity: 22, fuel: 48, seat: true },
    ],
    plan: fight('engine7', 'handline', 'water', { zones: ['gearL'], overhaul: true }),
    objectives: [
      { id: 'gear', text: 'Knock down the gear fire', done: down('gearL') },
    ],
  },
  {
    id: 'bizjet-cabin',
    fictional: true,
    course: 'interior',
    aircraft: 'bizjet',
    scene: 'hangar',
    night: false,
    unitIds: ['crash3', 'rescue6', 'engine7'],
    occupants: 4,
    smoke: 30,
    blocked: 'hatch',
    exposure: true,
    title: 'Business jet, cabin, hangar exposure',
    brief: fictional + ' A small jet is parked beside a hangar with cabin smoke. Only three units are on scene. ' + hangarNote,
    assumption: hangarNote,
    demoIntro: 'Limited units. Rescue the count, and do not let the hangar catch.',
    fires: [
      { id: 'cabin', intensity: 16, fuel: 55, seat: true },
    ],
    plan: fight('engine7', 'handline', 'water', {
      zones: ['cabin'],
      rescue: true,
      rescueFirst: true,
      secure: 'electrical',
    }),
    objectives: [
      { id: 'people', text: 'Clear the cabin count', done: aboardClear },
      { id: 'fire', text: 'Bring the cabin fire down', done: down('cabin') },
      { id: 'hangar', text: 'Keep the hangar from catching', done: hangarSafe },
    ],
  },
  {
    id: 'bizjet-remote',
    fictional: true,
    course: 'exterior',
    aircraft: 'bizjet',
    scene: 'runway',
    night: false,
    unitIds: ['crash3', 'rescue6'],
    staging: { z: 64, x0: -6, gap: 12 },
    occupants: 2,
    smoke: 10,
    blocked: null,
    title: 'Rear-engine fire, one turret',
    brief: fictional + ' A business jet is at a remote runway end. One rear engine is burning. Only Crash 3 and Rescue 6 are available, and they start far away.',
    demoIntro: 'One turret truck, a long drive, a small rear engine.',
    fires: [
      { id: 'engR', intensity: 20, fuel: 46, seat: true },
    ],
    plan: fight('crash3', 'turret', 'afff', { zones: ['engR'], rescue: true, driveTimeout: 36 }),
    objectives: [
      { id: 'fire', text: 'Knock down the rear engine', done: down('engR') },
      { id: 'people', text: 'Account for the two people', done: aboardClear },
    ],
  },
  {
    id: 'fighter-bay',
    fictional: true,
    course: 'exterior',
    aircraft: 'fighterTwin',
    scene: 'apron',
    night: false,
    unitIds: ['crash3', 'rescue6'],
    occupants: 1,
    smoke: 8,
    blocked: null,
    title: 'Twin-engine bay fire',
    brief: fictional + ' A twin-engine fighter is parked on the apron. One engine bay is burning. One person is in the abstract count. This is not combat and there are no weapons.',
    demoIntro: 'Small airframe, short reach problem if you park too far. Turret AFFF on the bay.',
    fires: [
      { id: 'engL', intensity: 22, fuel: 40, seat: true },
    ],
    plan: fight('crash3', 'turret', 'afff', { zones: ['engL'], rescue: true }),
    objectives: [
      { id: 'fire', text: 'Knock down the engine bay', done: down('engL') },
      { id: 'people', text: 'Account for the pilot', done: aboardClear },
    ],
  },
  {
    id: 'fighter-gear-night',
    fictional: true,
    course: 'exterior',
    aircraft: 'fighterSingle',
    scene: 'apron',
    night: true,
    unitIds: ['engine7', 'crash9', 'rescue6'],
    occupants: 1,
    smoke: 6,
    blocked: null,
    title: 'Single-engine fighter, gear, night',
    brief: fictional + ' ' + nightNote + ' A single-engine fighter has a main-gear fire. No turret is on scene. ' + gearNote,
    assumption: gearNote + ' ' + nightNote,
    demoIntro: 'No turret. Engine 7 uses a handline and water on the gear.',
    fires: [
      { id: 'gearL', intensity: 18, fuel: 36, seat: true },
    ],
    plan: fight('engine7', 'handline', 'water', { zones: ['gearL'], rescue: true }),
    objectives: [
      { id: 'gear', text: 'Knock down the gear fire', done: down('gearL') },
      { id: 'people', text: 'Account for the pilot', done: aboardClear },
    ],
  },
  {
    id: 'helo-smoke',
    fictional: true,
    course: 'interior',
    aircraft: 'helo',
    scene: 'apron',
    night: false,
    occupants: 5,
    smoke: 32,
    blocked: 'side',
    title: 'Helicopter cabin smoke',
    brief: fictional + ' A rotary-wing transport is on a pad with the rotor stopped. The cabin is smoky. People are a count only. The exhaust is warm but the cabin is the problem.',
    demoIntro: 'Rotor is stopped. Clear the cabin count, then cool the cabin.',
    fires: [
      { id: 'cabin', intensity: 16, fuel: 50, seat: true },
      { id: 'exh', intensity: 6, fuel: 20, seat: false },
    ],
    plan: fight('engine7', 'handline', 'water', {
      zones: ['cabin'],
      rescue: true,
      rescueFirst: true,
      secure: 'electrical',
    }),
    objectives: [
      { id: 'people', text: 'Clear the cabin count', done: aboardClear },
      { id: 'fire', text: 'Bring the cabin fire down', done: down('cabin') },
    ],
  },
  {
    id: 'helo-hangar',
    fictional: true,
    course: 'exterior',
    aircraft: 'helo',
    scene: 'hangar',
    night: false,
    unitIds: ['crash3', 'rescue6'],
    occupants: 2,
    smoke: 12,
    blocked: 'side',
    exposure: true,
    title: 'Helicopter exhaust beside a hangar',
    brief: fictional + ' The helicopter’s exhaust bay is burning next to a hangar. ' + hangarNote,
    assumption: hangarNote,
    demoIntro: 'Exhaust fire. Knock it down before the hangar is involved, then account for the crew.',
    fires: [
      { id: 'exh', intensity: 20, fuel: 44, seat: true },
    ],
    plan: fight('crash3', 'turret', 'afff', { zones: ['exh'], rescue: true }),
    objectives: [
      { id: 'fire', text: 'Knock down the exhaust bay', done: down('exh') },
      { id: 'hangar', text: 'Keep the hangar from catching', done: hangarSafe },
      { id: 'people', text: 'Account for the crew', done: aboardClear },
    ],
  },
  {
    id: 'deck-engine',
    fictional: true,
    course: 'exterior',
    aircraft: 'widebody',
    scene: 'deck',
    night: false,
    unitIds: ['crash3', 'crash9', 'rescue6'],
    staging: { z: 34, x0: -14, gap: 12 },
    occupants: 4,
    smoke: 14,
    blocked: 'mid',
    title: 'Practice-deck engine fire',
    brief: fictional + ' ' + deckNote + ' A large tanker is parked on a flat practice deck. One engine is burning. There is no armament and no combat.',
    assumption: deckNote,
    demoIntro: 'Practice deck. Turret AFFF on the engine, then the aboard count.',
    fires: [
      { id: 'eng2', intensity: 24, fuel: 60, seat: true },
    ],
    plan: fight('crash3', 'turret', 'afff', { zones: ['eng2'], overhaul: true, rescue: true }),
    objectives: [
      { id: 'fire', text: 'Knock down the engine fire', done: down('eng2') },
      { id: 'people', text: 'Account for the people aboard', done: aboardClear },
    ],
  },
  {
    id: 'herc-night-pool',
    fictional: true,
    course: 'exterior',
    aircraft: 'hercules',
    scene: 'apron',
    night: true,
    occupants: 0,
    smoke: 18,
    blocked: null,
    lockPool: true,
    poolSpreads: true,
    title: 'Night spill and a prop fire',
    brief: fictional + ' ' + nightNote + ' A turboprop has both a fuel pool and a prop fire. Two objectives: the pool and the prop. AFFF is the strong match for the pool in this toy.',
    assumption: nightNote,
    demoIntro: 'Two fires. Pool first, then the prop. Night does not help or hurt.',
    fires: [
      { id: 'pool', x: -10, z: 5, intensity: 28, fuel: 72, seat: true },
      { id: 'eng1', intensity: 18, fuel: 50, seat: false },
    ],
    plan: fight('crash3', 'turret', 'afff', { zones: ['pool', 'eng1'], overhaul: false }),
    objectives: [
      { id: 'pool', text: 'Knock down the fuel pool', done: down('pool') },
      { id: 'prop', text: 'Knock down the prop fire', done: down('eng1') },
      { id: 'wing', text: 'Keep the wings quiet', done: wingsQuiet },
    ],
  },
];

export function getScenario(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export function listScenarios() {
  return SCENARIOS.map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    fictional: scenario.fictional,
    aircraft: AIRFRAMES[scenario.aircraft].name,
    shape: AIRFRAMES[scenario.aircraft].shape,
    scene: scenario.scene,
    night: scenario.night,
  }));
}

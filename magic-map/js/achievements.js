// ============================================================
// Tiered achievements. Each tier has a threshold and a reward
// that feeds back into the walking loop: wider detection, a
// bigger fog torch, acorn bait, the radar, themes and trails.
// ============================================================

import { TOTAL_SPECIES } from './squirrels.js';
import { CONFIG } from './config.js';
import { fmtArea } from './util.js';

const km = (n) => n * 1000;

export const ACHIEVEMENTS = [
  {
    id: 'walker',
    icon: '🥾',
    name: 'Trailblazer',
    desc: 'Total distance walked',
    metric: (s) => s.data.distanceTotal,
    fmt: (v) => (v / 1000).toFixed(1) + ' km',
    tiers: [
      { at: km(1),   reward: { acorns: 2 },        label: '+2 acorns' },
      { at: km(5),   reward: { detect: 10 },       label: '+10 m detection' },
      { at: km(15),  reward: { trail: 'ember' },   label: 'Ember trail' },
      { at: km(42),  reward: { reveal: 30 },       label: '+30 m fog torch' },
      { at: km(100), reward: { theme: 'aurora' },  label: 'Aurora map theme' },
    ],
  },
  {
    id: 'streak',
    icon: '🔥',
    name: 'Creature of Habit',
    desc: `Daily streak (${CONFIG.DAY_GOAL_M} m+ per day)`,
    metric: (s) => s.data.bestStreak,
    fmt: (v) => v + (v === 1 ? ' day' : ' days'),
    tiers: [
      { at: 2,   reward: { acorns: 2 },       label: '+2 acorns' },
      { at: 5,   reward: { detect: 12 },      label: '+12 m detection' },
      { at: 10,  reward: { theme: 'ember' },  label: 'Ember map theme' },
      { at: 30,  reward: { reveal: 40 },      label: '+40 m fog torch' },
      { at: 100, reward: { trail: 'neon' },   label: 'Neon trail' },
    ],
  },
  {
    id: 'explorer',
    icon: '🗺️',
    name: 'Fogbreaker',
    desc: 'Map area uncovered',
    metric: (s) => s.exploredSet.size,
    fmt: (v) => fmtArea(v, CONFIG.CELL_M),
    tiers: [
      { at: 40,   reward: { acorns: 2 },        label: '+2 acorns' },          // ~0.1 km²
      { at: 160,  reward: { reveal: 20 },       label: '+20 m fog torch' },    // ~0.4 km²
      { at: 600,  reward: { detect: 15 },       label: '+15 m detection' },    // ~1.5 km²
      { at: 2000, reward: { theme: 'matrix' },  label: 'Matrix map theme' },   // ~5 km²
      { at: 6000, reward: { trail: 'gold' },    label: 'Gold trail' },         // ~15 km²
    ],
  },
  {
    id: 'collector',
    icon: '📖',
    name: 'Compendium Keeper',
    desc: `Unique species (of ${TOTAL_SPECIES})`,
    metric: (s) => s.uniqueSpecies,
    fmt: (v) => v + ' species',
    tiers: [
      { at: 3,  reward: { radar: true },        label: '📡 Radar unlocked!' },
      { at: 6,  reward: { acorns: 3 },          label: '+3 acorns' },
      { at: 10, reward: { detect: 15 },         label: '+15 m detection' },
      { at: 15, reward: { reveal: 30 },         label: '+30 m fog torch' },
      { at: 20, reward: { theme: 'noir', trail: 'matrix' }, label: 'Noir theme + Matrix trail' },
    ],
  },
  {
    id: 'hoarder',
    icon: '🌰',
    name: 'Den Mother',
    desc: 'Total squirrels befriended',
    metric: (s) => s.data.totalCaught,
    fmt: (v) => v + ' caught',
    tiers: [
      { at: 5,   reward: { acorns: 2 },   label: '+2 acorns' },
      { at: 25,  reward: { detect: 8 },   label: '+8 m detection' },
      { at: 100, reward: { reveal: 25 },  label: '+25 m fog torch' },
      { at: 500, reward: { acorns: 20 },  label: '+20 acorns' },
    ],
  },
  {
    id: 'nightowl',
    icon: '🌙',
    name: 'Night Owl',
    desc: 'Squirrels found after dark',
    metric: (s) => s.data.nightCatches,
    fmt: (v) => v + ' night finds',
    tiers: [
      { at: 1,  reward: { acorns: 1 },  label: '+1 acorn' },
      { at: 10, reward: { detect: 10 }, label: '+10 m detection' },
    ],
  },
];

// Check all achievements against state; unlock any newly-earned
// tiers, apply their rewards, and return toast-ready strings.
export function checkAchievements(state) {
  const unlocked = [];
  for (const ach of ACHIEVEMENTS) {
    const value = ach.metric(state);
    const current = state.data.achievements[ach.id] ?? -1; // highest tier index earned
    for (let i = current + 1; i < ach.tiers.length; i++) {
      if (value >= ach.tiers[i].at) {
        state.data.achievements[ach.id] = i;
        state.applyReward(ach.tiers[i].reward);
        unlocked.push({
          ach,
          tier: i,
          text: `${ach.icon} ${ach.name} ${'★'.repeat(i + 1)} — ${ach.tiers[i].label}`,
        });
      } else {
        break;
      }
    }
  }
  if (unlocked.length) state.save();
  return unlocked;
}

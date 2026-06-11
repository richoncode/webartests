// ============================================================
// The Squirrel Compendium.
// All species render the 🐿️ emoji recoloured with CSS filters,
// so no image assets are needed. `glow` is the marker/card aura.
// ============================================================

import { weightedChoice, isNightTime } from './util.js';

export const RARITIES = {
  common:    { name: 'Common',    weight: 62,  xp: 20,   color: '#9aa0a6', glow: 'rgba(154,160,166,0.18)' },
  uncommon:  { name: 'Uncommon',  weight: 24,  xp: 45,   color: '#4caf50', glow: 'rgba(76,175,80,0.3)' },
  rare:      { name: 'Rare',      weight: 9.5, xp: 90,   color: '#5b9bd5', glow: 'rgba(91,155,213,0.4)' },
  epic:      { name: 'Epic',      weight: 3.5, xp: 180,  color: '#b06bd5', glow: 'rgba(176,107,213,0.45)' },
  legendary: { name: 'Legendary', weight: 0.9, xp: 400,  color: '#f0a040', glow: 'rgba(240,160,64,0.55)' },
  mythic:    { name: 'Mythic',    weight: 0.1, xp: 1500, color: '#ff5bd5', glow: 'rgba(255,91,213,0.6)' },
};

export const SPECIES = [
  // ---- Common ----
  { id: 'city-gray', name: 'City Gray', rarity: 'common',
    filter: 'grayscale(1)',
    flavor: 'The classic park hustler. Has strong opinions about which bench gets the best crumbs.' },
  { id: 'red-rascal', name: 'Red Rascal', rarity: 'common',
    filter: 'saturate(1.6)',
    flavor: 'Small, loud, and convinced this entire street is legally its property.' },
  { id: 'acorn-hoarder', name: 'Acorn Hoarder', rarity: 'common',
    filter: 'sepia(0.6)',
    flavor: 'Cheeks at maximum capacity. Has forgotten the location of 94% of its stash.' },
  { id: 'park-pudge', name: 'Park Pudge', rarity: 'common',
    filter: 'brightness(1.08)', scale: 1.18,
    flavor: 'Winter prep started in June. Rolls slightly when cornering at speed.' },

  // ---- Uncommon ----
  { id: 'midnight-black', name: 'Midnight Black', rarity: 'uncommon',
    filter: 'brightness(0.3) contrast(1.2)',
    flavor: 'A melanistic beauty. Vanishes completely in shadow, reappears exactly where your snacks are.' },
  { id: 'fox-squirrel', name: 'Fox Squirrel', rarity: 'uncommon',
    filter: 'hue-rotate(-18deg) saturate(2)',
    flavor: 'Big, rust-coloured, unbothered. Walks places other squirrels sprint.' },
  { id: 'graffiti-tagger', name: 'Graffiti Tagger', rarity: 'uncommon',
    filter: 'hue-rotate(90deg) saturate(2.2)',
    flavor: 'Urban legend says the green streaks are paint. The Tagger says nothing.' },
  { id: 'snowdrift', name: 'Snowdrift', rarity: 'uncommon',
    filter: 'grayscale(1) brightness(1.7)',
    flavor: 'Pale as frost. Loiters near cold drinks and judges your jacket choices.' },

  // ---- Rare ----
  { id: 'flying-squirrel', name: 'Flying Squirrel', rarity: 'rare', nightOnly: true, badge: '🌙',
    filter: 'hue-rotate(200deg) saturate(1.4) brightness(0.9)',
    flavor: 'A nocturnal glider. Only ever seen after dark, usually mid-leap, always showing off.' },
  { id: 'albino', name: 'Albino', rarity: 'rare',
    filter: 'grayscale(1) brightness(2.1)',
    flavor: 'One in a hundred thousand. Locals consider a sighting good luck for a full week.' },
  { id: 'ninja', name: 'Ninja Squirrel', rarity: 'rare', badge: '🥷',
    filter: 'brightness(0.18)',
    flavor: 'You did not find the Ninja Squirrel. The Ninja Squirrel allowed itself to be found.' },
  { id: 'jazzpaw', name: 'Jazzpaw', rarity: 'rare',
    filter: 'hue-rotate(280deg) saturate(2)',
    flavor: 'Taps its foot in 7/8 time. Buries acorns exclusively on the off-beat.' },

  // ---- Epic ----
  { id: 'neon-cyber', name: 'Neon Cyber-Squirrel', rarity: 'epic', badge: '⚡',
    filter: 'hue-rotate(160deg) saturate(3) brightness(1.2)',
    flavor: 'Escaped from a research lab, or possibly the year 2087. Tail glows when WiFi is near.' },
  { id: 'shogun', name: 'Shogun Bushytail', rarity: 'epic', badge: '⚔️',
    filter: 'sepia(0.7) hue-rotate(-30deg) saturate(2.4)',
    flavor: 'Commands the loyalty of every squirrel within three blocks. Bows before taking your peanut.' },
  { id: 'cogsworth', name: 'Cogsworth', rarity: 'epic', badge: '⚙️',
    filter: 'sepia(1) contrast(1.1)',
    flavor: 'Brass-furred and ticking softly. Nobody knows who winds it.' },
  { id: 'frostbyte', name: 'Frostbyte', rarity: 'epic', badge: '❄️',
    filter: 'hue-rotate(180deg) brightness(1.5) saturate(1.6)',
    flavor: 'Leaves tiny frozen pawprints in July. Refuses to discuss it.' },

  // ---- Legendary ----
  { id: 'golden-guardian', name: 'Golden Acorn Guardian', rarity: 'legendary', badge: '👑',
    filter: 'sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.25)',
    flavor: 'Keeper of the First Acorn. Appears only to walkers it deems worthy of the hoard.' },
  { id: 'voidtail', name: 'Voidtail', rarity: 'legendary', badge: '🟣',
    filter: 'brightness(0) drop-shadow(0 0 6px rgba(150,80,255,0.9))',
    flavor: 'A squirrel-shaped absence in the world. Stars are faintly visible through its tail.' },
  { id: 'stormcaller', name: 'Stormcaller', rarity: 'legendary', badge: '🌩️',
    filter: 'hue-rotate(210deg) saturate(2.5) contrast(1.3)',
    flavor: 'Fur crackling with static. Pigeons evacuate the block minutes before it arrives.' },

  // ---- Mythic ----
  { id: 'ratatoskr', name: 'Ratatoskr', rarity: 'mythic', badge: '🌳',
    filter: 'hue-rotate(300deg) saturate(2.5) brightness(1.2) drop-shadow(0 0 8px rgba(255,91,213,0.9))',
    flavor: 'Messenger of the World Tree, carrier of insults between the eagle above and the serpent below. It has been running for ten thousand years. Today, it stopped for you.' },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const TOTAL_SPECIES = SPECIES.length;

// Pick a species for a fresh spawn.
// - nightOnly species are excluded during the day.
// - `luck` (>1 with streaks) boosts rare-and-above weights.
export function pickSpecies({ luck = 1, ts = Date.now() } = {}) {
  const night = isNightTime(ts);
  const pool = SPECIES.filter((s) => !s.nightOnly || night);
  return weightedChoice(pool, (s) => {
    const r = RARITIES[s.rarity];
    // Per-species weight = rarity weight split across that rarity's pool members.
    const siblings = pool.filter((p) => p.rarity === s.rarity).length;
    let w = r.weight / siblings;
    if (r.xp >= 90) w *= luck;                  // rare and above benefit from luck
    if (s.nightOnly && night) w *= 2.5;         // night-time spotlight
    return w;
  });
}

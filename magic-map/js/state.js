// ============================================================
// GameState — single source of truth, persisted to localStorage.
// Holds progression (xp/level), stats (distance, streak, fog
// cells), the collection, and unlocked rewards.
// ============================================================

import { CONFIG, perksForLevel, levelFromXp } from './config.js';
import { RARITIES } from './squirrels.js';
import { dayKey, isYesterday, clamp, throttle } from './util.js';

const FRESH = () => ({
  version: 1,
  createdAt: Date.now(),
  home: null,                 // first GPS fix — anchor for frontier bonus

  xp: 0,
  level: 1,
  acorns: 1,                  // start with one bait to teach the mechanic

  explored: [],               // fog cell keys
  distanceTotal: 0,
  distanceToday: 0,
  dailyDistance: {},          // local date -> filtered walking metres
  todayKey: dayKey(),
  streak: 0,
  bestStreak: 0,
  lastQualifiedDay: null,     // last day that hit DAY_GOAL_M

  caught: {},                 // speciesId -> count
  totalCaught: 0,
  nightCatches: 0,
  activeSpawns: [],           // live squirrels, restored after a reload
  lastGiftDay: null,          // daily check-in gift tracker

  achievements: {},           // achievementId -> highest tier index unlocked (0-based)
  bonusDetect: 0,
  bonusReveal: 0,
  radar: false,
  themesUnlocked: ['twilight'],
  trailsUnlocked: ['scout'],

  settings: { theme: 'twilight', trail: 'scout', mock: false, lightMode: false },
  lastPos: null,
});

export class GameState {
  constructor() {
    this.data = FRESH();
    this.exploredSet = new Set();
    this.meterBank = 0;        // walking metres not yet converted to XP
    this.onChange = null;      // ui refresh hook
    this.load();
    this.save = throttle(() => this._saveNow(), 2000);
    window.addEventListener('pagehide', () => this._saveNow());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this._saveNow();
    });
  }

  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...FRESH(), ...parsed, settings: { ...FRESH().settings, ...parsed.settings } };
      }
    } catch (e) {
      console.warn('State load failed, starting fresh', e);
    }
    this.exploredSet = new Set(this.data.explored);
    if (!this.data.dailyDistance || typeof this.data.dailyDistance !== 'object') {
      this.data.dailyDistance = {};
    }
    if (this.data.distanceToday && !this.data.dailyDistance[this.data.todayKey]) {
      this.data.dailyDistance[this.data.todayKey] = this.data.distanceToday;
    }
    this.rolloverDay();
  }

  _saveNow() {
    this.data.explored = [...this.exploredSet];
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('State save failed', e);
    }
  }

  reset() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    this.data = FRESH();
    this.exploredSet = new Set();
  }

  // ---------- derived ----------
  get detectRadius() {
    return clamp(CONFIG.DETECT_BASE + this.data.bonusDetect, CONFIG.DETECT_BASE, CONFIG.DETECT_CAP);
  }
  get revealRadius() {
    return clamp(CONFIG.REVEAL_BASE + this.data.bonusReveal, CONFIG.REVEAL_BASE, CONFIG.REVEAL_CAP);
  }
  get uniqueSpecies() {
    return Object.keys(this.data.caught).length;
  }
  // Streak luck: up to +60% rare odds at a 12-day streak.
  get luck() {
    return 1 + Math.min(0.6, this.data.streak * 0.05);
  }
  get stepsToday() {
    return this.stepsForMetres(this.data.distanceToday);
  }
  get stepsTotal() {
    return this.stepsForMetres(this.data.distanceTotal);
  }
  stepsForMetres(metres) {
    return Math.max(0, Math.round((metres || 0) / CONFIG.STEP_STRIDE_M));
  }
  get recentStepDays() {
    const entries = Object.entries(this.data.dailyDistance || {})
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7);
    return entries.map(([date, metres]) => ({
      date,
      metres,
      steps: this.stepsForMetres(metres),
    }));
  }

  // ---------- day / streak ----------
  rolloverDay() {
    const today = dayKey();
    if (this.data.todayKey !== today) {
      this.data.todayKey = today;
      this.data.distanceToday = 0;
      // A missed day (no qualification yesterday or today) breaks the streak.
      if (
        this.data.lastQualifiedDay &&
        this.data.lastQualifiedDay !== today &&
        !isYesterday(this.data.lastQualifiedDay)
      ) {
        this.data.streak = 0;
      }
    }
  }

  // Returns events: { xpGained, leveled, dayQualified }
  addDistance(metres) {
    this.rolloverDay();
    const d = this.data;
    const beforeQualified = d.distanceToday >= CONFIG.DAY_GOAL_M;
    d.distanceTotal += metres;
    d.distanceToday += metres;
    d.dailyDistance[dayKey()] = (d.dailyDistance[dayKey()] || 0) + metres;
    this.meterBank += metres;

    let xpGained = 0;
    while (this.meterBank >= 250) {
      this.meterBank -= 250;
      xpGained += CONFIG.XP_PER_250M;
    }

    let dayQualified = false;
    if (!beforeQualified && d.distanceToday >= CONFIG.DAY_GOAL_M) {
      dayQualified = true;
      const today = dayKey();
      if (d.lastQualifiedDay !== today) {
        d.streak = isYesterday(d.lastQualifiedDay) ? d.streak + 1 : 1;
        d.lastQualifiedDay = today;
        d.bestStreak = Math.max(d.bestStreak, d.streak);
      }
    }

    const leveled = xpGained ? this.addXp(xpGained) : [];
    this.save();
    return { xpGained, leveled, dayQualified };
  }

  // ---------- xp / levels ----------
  // Returns array of levels gained (with their perks applied).
  addXp(amount) {
    this.data.xp += Math.round(amount);
    const newLevel = levelFromXp(this.data.xp);
    const gained = [];
    while (this.data.level < newLevel) {
      this.data.level++;
      const perks = perksForLevel(this.data.level);
      this.data.acorns += perks.acorns;
      this.data.bonusDetect += perks.detect;
      this.data.bonusReveal += perks.reveal;
      gained.push({ level: this.data.level, perks });
    }
    this.save();
    return gained;
  }

  // ---------- fog ----------
  addCells(keys) {
    let added = 0;
    for (const k of keys) {
      if (!this.exploredSet.has(k)) {
        this.exploredSet.add(k);
        added++;
      }
    }
    if (added) {
      this.addXp(added * CONFIG.XP_PER_NEW_CELL);
      this.save();
    }
    return added;
  }

  // ---------- collection ----------
  registerCatch(species, { xp, isNight }) {
    const d = this.data;
    const isNew = !d.caught[species.id];
    d.caught[species.id] = (d.caught[species.id] || 0) + 1;
    d.totalCaught++;
    if (isNight) d.nightCatches++;
    const leveled = this.addXp(xp);
    this.save();
    return { isNew, leveled };
  }

  // ---------- rewards ----------
  applyReward(reward) {
    const d = this.data;
    if (!reward) return;
    if (reward.acorns) d.acorns += reward.acorns;
    if (reward.detect) d.bonusDetect += reward.detect;
    if (reward.reveal) d.bonusReveal += reward.reveal;
    if (reward.radar) d.radar = true;
    if (reward.theme && !d.themesUnlocked.includes(reward.theme)) d.themesUnlocked.push(reward.theme);
    if (reward.trail && !d.trailsUnlocked.includes(reward.trail)) d.trailsUnlocked.push(reward.trail);
    this.save();
  }

  xpForSpecies(species) {
    return RARITIES[species.rarity].xp;
  }
}

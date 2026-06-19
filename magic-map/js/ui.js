// ============================================================
// UI — HUD updates, sliding panels (Den / Journal / Settings),
// the catch modal, toasts, radar arrow. Pure DOM, no game logic.
// ============================================================

import { CONFIG, THEMES, TRAILS, xpForLevel, APP_VERSION } from './config.js';
import { SPECIES, RARITIES } from './squirrels.js';
import { ACHIEVEMENTS } from './achievements.js';
import { $, fmtDist, fmtArea, escapeHtml } from './util.js';

export class UI {
  constructor(state, hooks) {
    this.state = state;
    this.hooks = hooks; // { setTheme, setTrail, setMock, resetGame, useBait, openCatch }
    this.activePanel = null;

    this.els = {
      lvlNum: $('#lvl-num'),
      xpFill: $('#xp-fill'),
      streak: $('#streak-num'),
      distToday: $('#dist-today'),
      acorns: $('#acorn-num'),
      panel: $('#panel'),
      panelTitle: $('#panel-title'),
      panelBody: $('#panel-body'),
      toasts: $('#toasts'),
      catchModal: $('#catch-modal'),
      catchCard: $('#catch-card'),
      baitChip: $('#bait-chip'),
      baitTimer: $('#bait-timer'),
      countryChip: $('#country-chip'),
      radarArrow: $('#radar-arrow'),
      radarPointer: $('#radar-pointer'),
      radarDist: $('#radar-dist'),
      btnRadar: $('#btn-radar'),
    };

    $('#panel-close').addEventListener('click', () => this.closePanel());
    document.querySelectorAll('#hud-nav button').forEach((b) =>
      b.addEventListener('click', () => this.togglePanel(b.dataset.panel))
    );
  }

  showHud() {
    ['#hud-top', '#hud-side', '#hud-nav'].forEach((s) => $(s).classList.remove('hidden'));
  }

  // ---------- HUD ----------
  refreshHud() {
    const d = this.state.data;
    this.els.lvlNum.textContent = d.level;
    const base = xpForLevel(d.level);
    const next = xpForLevel(d.level + 1);
    const pct = Math.min(100, ((d.xp - base) / (next - base)) * 100);
    this.els.xpFill.style.width = pct.toFixed(1) + '%';
    this.els.streak.textContent = d.streak;
    this.els.distToday.textContent = fmtDist(d.distanceToday);
    this.els.acorns.textContent = d.acorns;
    this.els.btnRadar.classList.toggle('hidden', !d.radar);
  }

  setBaitChip(remainingMs) {
    const on = remainingMs > 0;
    this.els.baitChip.classList.toggle('hidden', !on);
    if (on) {
      const m = Math.floor(remainingMs / 60000);
      const s = Math.floor((remainingMs % 60000) / 1000);
      this.els.baitTimer.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }
  }

  // Country-mode badge: shown only while spawns are on the player's land.
  setCountryChip(info) {
    if (!this.els.countryChip) return;
    const on = !!(info && info.active);
    this.els.countryChip.classList.toggle('hidden', !on);
    this._countryInfo = info;
    if (on) this.els.countryChip.textContent = `🌾 On your land · ${info.parcel.acres.toFixed(2)} ac`;
  }

  // ---------- Radar ----------
  showRadar(bearing, dist) {
    this.els.radarArrow.classList.remove('hidden');
    this.els.radarPointer.style.transform = `rotate(${Math.round(bearing)}deg)`;
    this.els.radarDist.textContent = fmtDist(dist) + ' away';
  }
  hideRadar() {
    this.els.radarArrow.classList.add('hidden');
  }

  // ---------- Toasts ----------
  toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.textContent = msg;
    this.els.toasts.appendChild(t);
    while (this.els.toasts.children.length > 3) this.els.toasts.firstChild.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 350);
    }, 3500);
  }

  // ---------- Panels ----------
  togglePanel(name) {
    if (this.activePanel === name) return this.closePanel();
    this.activePanel = name;
    document.querySelectorAll('#hud-nav button').forEach((b) =>
      b.classList.toggle('active', b.dataset.panel === name)
    );
    this.els.panel.classList.remove('hidden');
    if (name === 'den') this.renderDen();
    if (name === 'journal') this.renderJournal();
    if (name === 'settings') this.renderSettings();
  }

  closePanel() {
    this.activePanel = null;
    this.els.panel.classList.add('hidden');
    document.querySelectorAll('#hud-nav button').forEach((b) => b.classList.remove('active'));
  }

  renderDen() {
    const d = this.state.data;
    this.els.panelTitle.textContent = '🏡 The Den';
    const cards = SPECIES.map((sp) => {
      const count = d.caught[sp.id] || 0;
      const r = RARITIES[sp.rarity];
      if (!count) {
        return `<div class="den-card unknown">
          <span class="sq">🐿️</span>
          <div class="nm">???</div>
          <span class="rarity-chip" style="color:${r.color};border:1px solid ${r.color}33;background:${r.color}14">${r.name}</span>
        </div>`;
      }
      const scale = sp.scale || 1;
      return `<div class="den-card">
        <span class="sq" style="filter:${sp.filter}; font-size:${Math.round(34 * scale)}px">🐿️</span>
        <div class="nm">${sp.badge ? sp.badge + ' ' : ''}${escapeHtml(sp.name)}</div>
        <div class="ct">× ${count}</div>
        <span class="rarity-chip" style="color:${r.color};border:1px solid ${r.color}55;background:${r.color}1f">${r.name}</span>
      </div>`;
    }).join('');
    this.els.panelBody.innerHTML = `
      <p class="den-summary"><b>${this.state.uniqueSpecies}</b> of <b>${SPECIES.length}</b> species discovered ·
      <b>${d.totalCaught}</b> total befriended</p>
      <div class="den-grid">${cards}</div>`;
  }

  renderJournal() {
    const s = this.state;
    const d = s.data;
    this.els.panelTitle.textContent = '📔 Journal';
    const fmtSteps = (n) => Math.round(n).toLocaleString();
    const recentSteps = s.recentStepDays
      .map((day) => `<div class="ach-desc" style="display:flex;justify-content:space-between;gap:12px;margin-top:4px">
        <span>${escapeHtml(day.date)}</span>
        <span><b>${fmtSteps(day.steps)}</b> steps · ${fmtDist(day.metres)}</span>
      </div>`)
      .join('');

    const stats = `
      <div class="stat-grid">
        <div class="stat-box"><div class="v">${(d.distanceTotal / 1000).toFixed(2)} km</div><div class="k">Total distance</div></div>
        <div class="stat-box"><div class="v">${fmtDist(d.distanceToday)}</div><div class="k">Today (goal ${CONFIG.DAY_GOAL_M} m)</div></div>
        <div class="stat-box"><div class="v">${fmtSteps(s.stepsToday)}</div><div class="k">Estimated steps today</div></div>
        <div class="stat-box"><div class="v">${fmtSteps(s.stepsTotal)}</div><div class="k">Estimated total steps</div></div>
        <div class="stat-box"><div class="v">${fmtArea(s.exploredSet.size, CONFIG.CELL_M)}</div><div class="k">Map uncovered</div></div>
        <div class="stat-box"><div class="v">🔥 ${d.streak} <span style="font-size:12px;color:#888">(best ${d.bestStreak})</span></div><div class="k">Daily streak</div></div>
        <div class="stat-box"><div class="v">${Math.round(s.detectRadius)} m</div><div class="k">Detection radius</div></div>
        <div class="stat-box"><div class="v">${Math.round(s.revealRadius)} m</div><div class="k">Fog torch radius</div></div>
      </div>
      <div class="ach-item">
        <div class="ach-top">
          <span class="ach-name">👟 Recent estimated steps</span>
          <span class="ach-stars">0.75 m stride</span>
        </div>
        <div class="ach-desc">Browser-safe estimate from filtered walking distance, not Apple Health or Google Fit.</div>
        ${recentSteps || '<div class="ach-desc" style="margin-top:4px">No walking distance logged yet today.</div>'}
      </div>`;

    const achs = ACHIEVEMENTS.map((a) => {
      const value = a.metric(s);
      const earned = (d.achievements[a.id] ?? -1) + 1;
      const maxed = earned >= a.tiers.length;
      const nextTier = maxed ? null : a.tiers[earned];
      const prevAt = earned > 0 ? a.tiers[earned - 1].at : 0;
      const pct = maxed ? 100 : Math.min(100, ((value - prevAt) / (nextTier.at - prevAt)) * 100);
      const stars = '★'.repeat(earned) + '☆'.repeat(a.tiers.length - earned);
      return `<div class="ach-item${maxed ? ' maxed' : ''}">
        <div class="ach-top">
          <span class="ach-name">${a.icon} ${escapeHtml(a.name)}</span>
          <span class="ach-stars">${stars}</span>
        </div>
        <div class="ach-desc">${escapeHtml(a.desc)} — ${a.fmt(value)}</div>
        <div class="ach-bar"><i style="width:${Math.max(0, pct).toFixed(1)}%"></i></div>
        <div class="ach-next">${maxed
          ? 'All tiers complete!'
          : `Next: <b>${a.fmt(nextTier.at)}</b> → ${escapeHtml(nextTier.label)}`}</div>
      </div>`;
    }).join('');

    this.els.panelBody.innerHTML = stats + achs;
  }

  renderSettings() {
    const d = this.state.data;
    this.els.panelTitle.textContent = '⚙️ Settings';

    const ci = this._countryInfo;
    const countryStatus = ci
      ? (ci.active ? `Active — ${escapeHtml(ci.reason)}` : `Off — ${escapeHtml(ci.reason)}`)
      : 'Spawns shift onto your property near fast roads';

    const themeChips = Object.entries(THEMES).map(([id, t]) => {
      const unlocked = d.themesUnlocked.includes(id);
      const sel = d.settings.theme === id;
      return `<button class="chip${sel ? ' sel' : ''}${unlocked ? '' : ' locked'}" data-theme="${id}">
        ${unlocked ? '' : '🔒 '}${t.name}</button>`;
    }).join('');

    const trailChips = Object.entries(TRAILS).map(([id, t]) => {
      const unlocked = d.trailsUnlocked.includes(id);
      const sel = d.settings.trail === id;
      return `<button class="chip${sel ? ' sel' : ''}${unlocked ? '' : ' locked'}" data-trail="${id}">
        ${unlocked ? '' : '🔒 '}<span style="color:${t.color}">●</span> ${t.name}</button>`;
    }).join('');

    this.els.panelBody.innerHTML = `
      <div class="set-group">
        <div class="set-label">Map theme</div>
        <div class="chips">${themeChips}</div>
      </div>
      <div class="set-group">
        <div class="set-label">Trail colour</div>
        <div class="chips">${trailChips}</div>
      </div>
      <div class="set-group">
        <div class="set-label">Display Mode</div>
        <div class="set-row">
          <div>High-contrast Light Mode<small>Very high contrast for outdoor/sun visibility</small></div>
          <div class="toggle${d.settings.lightMode ? ' on' : ''}" id="set-light-mode"></div>
        </div>
        <div class="set-row">
          <div>Style Playground<small>Open interactive tool to design high contrast filters</small></div>
          <button class="btn-secondary" onclick="window.open('design-review.html', '_blank')" style="width:auto; padding:6px 12px; font-size:12px;">🎨 Design Review</button>
        </div>
      </div>
      <div class="set-group">
        <div class="set-label">Testing</div>
        <div class="set-row">
          <div>Demo mode (no GPS)<small>D-pad walking, teleport, speed boost</small></div>
          <div class="toggle${d.settings.mock ? ' on' : ''}" id="set-mock"></div>
        </div>
        <div class="set-row">
          <div>Country mode<small>${countryStatus}</small></div>
          <button class="btn-secondary" id="set-country-demo">🌾 Try demo</button>
        </div>
      </div>
      <div class="set-group">
        <div class="set-label">Roadmap</div>
        <div class="set-row">
          <div>Feature ideas<small>100 future collectables &amp; play modes, simplest first</small></div>
          <button class="btn-secondary" id="set-features">💡 View</button>
        </div>
        <div class="set-row">
          <div>Spawning rules<small>Walking modes, distance bands, and street safety rules</small></div>
          <button class="btn-secondary" id="set-spawning-rules">🧭 View</button>
        </div>
      </div>
      <div class="set-group">
        <div class="set-label">Danger zone</div>
        <button class="btn-danger" id="set-reset">Reset all progress</button>
      </div>
      <p style="color:#555;font-size:11px;text-align:center">
        Magic Map · Squirrel Scouts · ${APP_VERSION}<br>
        Data stays in your browser · Map © OpenStreetMap & CARTO · roads via Overpass API
      </p>`;

    this.els.panelBody.querySelectorAll('[data-theme]').forEach((b) =>
      b.addEventListener('click', () => {
        if (!d.themesUnlocked.includes(b.dataset.theme)) {
          return this.toast('🔒 Earn this theme through achievements!');
        }
        this.hooks.setTheme(b.dataset.theme);
        this.renderSettings();
      })
    );
    this.els.panelBody.querySelectorAll('[data-trail]').forEach((b) =>
      b.addEventListener('click', () => {
        if (!d.trailsUnlocked.includes(b.dataset.trail)) {
          return this.toast('🔒 Earn this trail through achievements!');
        }
        this.hooks.setTrail(b.dataset.trail);
        this.renderSettings();
      })
    );
    this.els.panelBody.querySelector('#set-light-mode').addEventListener('click', (e) => {
      const on = !d.settings.lightMode;
      e.currentTarget.classList.toggle('on', on);
      this.hooks.setLightMode(on);
    });
    this.els.panelBody.querySelector('#set-mock').addEventListener('click', (e) => {
      const on = !d.settings.mock;
      e.currentTarget.classList.toggle('on', on);
      this.hooks.setMock(on);
    });
    this.els.panelBody.querySelector('#set-country-demo').addEventListener('click', () => {
      this.hooks.tryCountryDemo();
    });
    this.els.panelBody.querySelector('#set-features').addEventListener('click', () => {
      this.renderFeatures();
    });
    this.els.panelBody.querySelector('#set-spawning-rules').addEventListener('click', () => {
      window.open('spawning.html', '_blank');
    });
    this.els.panelBody.querySelector('#set-reset').addEventListener('click', () => {
      if (confirm('Erase all squirrels, fog, streaks and achievements?')) {
        this.hooks.resetGame();
      }
    });
  }

  // ---------- Feature ideas (roadmap browser) ----------
  // Renders features.xml. Each feature's <arch> element is an AI
  // implementation prompt and is intentionally never shown here.
  async renderFeatures(filter = 'all', tab = 'ideas') {
    this.els.panelTitle.textContent = '💡 Feature Ideas';
    if (!this._featuresDoc) {
      this.els.panelBody.innerHTML = '<p class="den-summary">Loading roadmap…</p>';
      try {
        const res = await fetch('features.xml');
        if (!res.ok) throw new Error(res.status);
        const doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
        if (doc.querySelector('parsererror')) throw new Error('parse');
        this._featuresDoc = doc;
      } catch (e) {
        this.els.panelBody.innerHTML = '<p class="den-summary">Could not load features.xml</p>';
        return;
      }
    }
    const doc = this._featuresDoc;
    const attr = (el, k) => el.getAttribute(k) || '';
    const text = (el, sel) => (el.querySelector(sel)?.textContent || '').trim();

    const types = {};
    doc.querySelectorAll('playerTypes > type').forEach((t) => {
      types[attr(t, 'id')] = { icon: attr(t, 'icon'), name: attr(t, 'name'), desc: t.textContent.trim() };
    });
    const genres = {};
    doc.querySelectorAll('genres > genre').forEach((g) => {
      genres[attr(g, 'id')] = { icon: attr(g, 'icon'), name: attr(g, 'name') };
    });
    const feats = [...doc.querySelectorAll('features > feature')].map((f) => ({
      genre: attr(f, 'genre'),
      types: attr(f, 'types').split(/\s+/).filter(Boolean),
      complexity: +attr(f, 'complexity') || 3,
      title: text(f, 'title'),
      blurb: text(f, 'blurb'),
    }));
    const patterns = {};
    doc.querySelectorAll('subjectPatterns > pattern').forEach((p) => {
      patterns[attr(p, 'id')] = p.textContent.trim();
    });
    const subjects = [...doc.querySelectorAll('subjects > subject')].map((s) => ({
      icon: attr(s, 'icon'),
      pattern: attr(s, 'pattern'),
      types: attr(s, 'types').split(/\s+/).filter(Boolean),
      complexity: +attr(s, 'complexity') || 2,
      title: text(s, 'title'),
      blurb: text(s, 'blurb'),
    }));

    const dotColor = (c) => (c <= 2 ? 'var(--green)' : c === 3 ? 'var(--orange)' : 'var(--red)');
    const dots = (c) => '●'.repeat(c) + '○'.repeat(5 - c);
    const typeIcons = (ids) => ids.map((id) => types[id]?.icon || '').join(' ');

    const tabChips = `
      <div class="chips" style="margin:12px 0 14px">
        <button class="chip${tab === 'ideas' ? ' sel' : ''}" data-ftab="ideas">💡 Ideas (${feats.length})</button>
        <button class="chip${tab === 'subjects' ? ' sel' : ''}" data-ftab="subjects">🐾 Subjects (${subjects.length})</button>
      </div>`;

    let body;
    if (tab === 'subjects') {
      const shown = [...subjects].sort((a, b) => a.complexity - b.complexity);
      const patternLegend = Object.entries(patterns)
        .map(([id, d]) => `<div class="ach-desc" style="margin-top:4px"><b style="color:#ccc">${escapeHtml(id)}</b> — ${escapeHtml(d)}</div>`)
        .join('');
      body = `
        <p class="den-summary">
          <b>${shown.length}</b> kinds of things to find on the Magic Map besides squirrels —
          each can carry a whole game mode. Sorted simplest-first.
        </p>
        <details style="margin-bottom:14px"><summary style="color:#888;font-size:12px;cursor:pointer">Implementation patterns</summary>${patternLegend}</details>
        ${shown.map((s) => `<div class="ach-item">
          <div class="ach-top">
            <span class="ach-name">${s.icon} ${escapeHtml(s.title)}</span>
            <span class="ach-stars" style="color:${dotColor(s.complexity)}" title="gameplay complexity ${s.complexity}/5">${dots(s.complexity)}</span>
          </div>
          <div class="ach-desc">${escapeHtml(s.blurb)}</div>
          <div class="ach-next">pattern: <b>${escapeHtml(s.pattern)}</b> · for ${typeIcons(s.types)}</div>
        </div>`).join('')}`;
    } else {
      const shown = feats
        .filter((f) => filter === 'all' || f.genre === filter)
        .sort((a, b) => a.complexity - b.complexity);
      const genreChips = [
        `<button class="chip${filter === 'all' ? ' sel' : ''}" data-fgenre="all">All (${feats.length})</button>`,
        ...Object.entries(genres).map(([id, g]) => {
          const n = feats.filter((f) => f.genre === id).length;
          return `<button class="chip${filter === id ? ' sel' : ''}" data-fgenre="${id}">${g.icon} ${escapeHtml(g.name)} (${n})</button>`;
        }),
      ].join('');
      const legend = Object.values(types)
        .map((t) => `<div class="ach-desc" style="margin-top:4px">${t.icon} <b style="color:#ccc">${escapeHtml(t.name)}</b> — ${escapeHtml(t.desc)}</div>`)
        .join('');
      body = `
        <p class="den-summary">
          <b>${shown.length}</b> idea${shown.length === 1 ? '' : 's'} · sorted simplest-first —
          low-complexity loops pair best with walking. Dots = gameplay complexity (1–5).
        </p>
        <details style="margin-bottom:14px"><summary style="color:#888;font-size:12px;cursor:pointer">Player types we design for</summary>${legend}</details>
        <div class="chips" style="margin-bottom:14px">${genreChips}</div>
        ${shown.map((f) => {
          const g = genres[f.genre] || { icon: '❓', name: f.genre };
          return `<div class="ach-item">
            <div class="ach-top">
              <span class="ach-name">${escapeHtml(f.title)}</span>
              <span class="ach-stars" style="color:${dotColor(f.complexity)}" title="gameplay complexity ${f.complexity}/5">${dots(f.complexity)}</span>
            </div>
            <div class="ach-desc">${escapeHtml(f.blurb)}</div>
            <div class="ach-next">${g.icon} ${escapeHtml(g.name)} · for ${typeIcons(f.types)}</div>
          </div>`;
        }).join('')}`;
    }

    this.els.panelBody.innerHTML = `
      <button class="chip" id="feat-back">← Settings</button>
      ${tabChips}
      ${body}`;

    this.els.panelBody.scrollTop = 0;
    this.els.panelBody.querySelector('#feat-back').addEventListener('click', () => this.renderSettings());
    this.els.panelBody.querySelectorAll('[data-ftab]').forEach((b) =>
      b.addEventListener('click', () => this.renderFeatures('all', b.dataset.ftab))
    );
    this.els.panelBody.querySelectorAll('[data-fgenre]').forEach((b) =>
      b.addEventListener('click', () => this.renderFeatures(b.dataset.fgenre, 'ideas'))
    );
  }

  // ---------- Catch modal ----------
  // info: { species, rarity, xp, isNew, frontierLabel, onCatch }
  showCatchModal(info) {
    const { species, rarity } = info;
    const scale = species.scale || 1;
    this.els.catchCard.innerHTML = `
      ${info.isNew ? '<span class="catch-new">NEW SPECIES!</span>' : ''}
      <div class="catch-aura" style="--aura:${rarity.glow}">
        <span class="sq-emoji" style="filter:${species.filter}; font-size:${Math.round(64 * scale)}px">🐿️</span>
      </div>
      <h3>${species.badge ? species.badge + ' ' : ''}${escapeHtml(species.name)}</h3>
      <span class="rarity-chip" style="color:${rarity.color};border:1px solid ${rarity.color}55;background:${rarity.color}1f">${rarity.name}</span>
      <p class="catch-flavor">${escapeHtml(species.flavor)}</p>
      <p class="catch-xp">+${info.xp} XP</p>
      ${info.frontierLabel ? `<p class="catch-frontier">🧭 ${escapeHtml(info.frontierLabel)}</p>` : ''}
      <div class="catch-btns">
        <button class="btn-secondary" id="catch-later">Leave it</button>
        <button class="btn-primary" id="catch-go">🌰 Befriend</button>
      </div>`;
    this.els.catchModal.classList.remove('hidden');

    this.els.catchCard.querySelector('#catch-later').addEventListener('click', () => this.hideCatchModal());
    this.els.catchCard.querySelector('#catch-go').addEventListener('click', () => {
      this._burst();
      setTimeout(() => {
        this.hideCatchModal();
        info.onCatch();
      }, 450);
    });
  }

  hideCatchModal() {
    this.els.catchModal.classList.add('hidden');
    this.els.catchCard.innerHTML = '';
  }

  _burst() {
    const bits = ['🌰', '✨', '🍂', '⭐', '🌰', '✨'];
    bits.forEach((b, i) => {
      const el = document.createElement('span');
      el.className = 'burst-bit';
      el.textContent = b;
      const ang = (i / bits.length) * Math.PI * 2;
      el.style.setProperty('--bx', Math.cos(ang) * 90 + 'px');
      el.style.setProperty('--by', Math.sin(ang) * 90 - 30 + 'px');
      this.els.catchCard.appendChild(el);
    });
  }
}

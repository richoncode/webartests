import { PALETTE_FILES, FALLBACK_PALETTES } from './constants.js';
import { App } from './app.js';

export const PalMgr = {
  async load() {
    for (const id of PALETTE_FILES) {
      try {
        const r = await fetch(`palettes/${id}.json`);
        if (!r.ok) throw new Error();
        const data = await r.json();
        App.palettes[data.id || id] = data;
      } catch {
        if (FALLBACK_PALETTES[id]) App.palettes[id] = FALLBACK_PALETTES[id];
      }
    }
  },
  list() { return Object.values(App.palettes); },
  get(id) { return App.palettes[id] || null; },
  getParams(paletteId, entryIdx) {
    const p = this.get(paletteId);
    if (!p) return { power: 20, speed: 100, density: 333, repeat: 1, processingLightSource: 'blue' };
    const e = p.entries[entryIdx] || p.entries[0] || {};
    const isIR = p.laser === 'ir' || p.name.toUpperCase().includes('IR');
    return {
      power: e.power ?? p.power ?? 20,
      speed: e.speed ?? p.speed ?? 100,
      density: e.lpcm ?? p.lpcm ?? 333,
      repeat: e.repeat ?? p.repeat ?? 1,
      processingLightSource: isIR ? 'red' : 'blue'
    };
  },
  entryColor(paletteId, idx) {
    const p = this.get(paletteId);
    return (p && p.entries[idx]) ? p.entries[idx].rgb : '#5b9bd5';
  },
  fillEntrySelect(sel, paletteId, currentIdx) {
    sel.innerHTML = '';
    const p = this.get(paletteId);
    if (!p) { sel.innerHTML = '<option value="0">— no palette —</option>'; return; }
    p.entries.forEach((e, i) => {
      const opt = document.createElement('option');
      opt.value = i; 
      opt.textContent = `■ ${e.label} (${e.power}%)`;
      opt.style.color = e.rgb;
      if (i === currentIdx) opt.selected = true;
      sel.appendChild(opt);
    });
  },
  fillPaletteSelect(sel, currentId) {
    sel.innerHTML = '<option value="">— none —</option>';
    this.list().forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = p.name;
      if (p.id === currentId) opt.selected = true;
      sel.appendChild(opt);
    });
  }
};

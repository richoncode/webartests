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

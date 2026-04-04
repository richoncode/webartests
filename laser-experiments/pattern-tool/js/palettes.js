import { PALETTE_FILES, FALLBACK_PALETTES } from './constants.js';
import { App } from './app.js';
import { PalletStore } from '../../xcs-module/js/XCSPallet.js';

export const PalMgr = {
  async load() {
    for (const id of PALETTE_FILES) {
      let data = null;
      try {
        const r = await fetch(`palettes/${id}.json`);
        if (!r.ok) throw new Error();
        data = await r.json();
      } catch {
        if (FALLBACK_PALETTES[id]) data = FALLBACK_PALETTES[id];
      }
      
      if (data) {
        PalletStore.register(data);
        App.palettes[data.id || id] = PalletStore.get(data.id || id);
      }
    }
  },
  list() { return PalletStore.list(); },
  get(id) { return PalletStore.get(id); },
  getParams(paletteId, entryIdx) {
    const p = this.get(paletteId);
    if (!p) return { power: 20, speed: 100, density: 333, repeat: 1, processingLightSource: 'blue' };
    
    // entries in XCSPallet have index property added, but we use the provided entryIdx
    const e = p.getEntry(entryIdx) || {};
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
    if (!p) return '#5b9bd5';
    const e = p.getEntry(idx);
    return e ? e.rgb : '#5b9bd5';
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

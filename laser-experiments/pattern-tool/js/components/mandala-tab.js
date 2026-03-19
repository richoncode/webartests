import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid } from '../utils.js';
import { XcsTab } from './xcs-tab.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const MandalaTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Mandala Designer</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Mandala Design';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'ss304-ir',
      ringCount: 4,
      symmetry: 8,
      dotScaling: 0.2,
      alternateRotation: true,
      spiralPalette: true,
      ringSpiral: 5,
      centerDot: true,
      centerDotDiameter: 3,
      centerDotEntry: 0,
      rings: [
        { dotDiameter: 2, ringRadius: 10, countMultiplier: 1, countManual: 8, countMode: 'auto', paletteEntryIndex: 0, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 3, ringRadius: 20, countMultiplier: 1, countManual: 8, countMode: 'auto', paletteEntryIndex: 1, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 4, ringRadius: 30, countMultiplier: 1, countManual: 8, countMode: 'auto', paletteEntryIndex: 2, rotationOffset: 0, shape: 'circle' },
        { dotDiameter: 5, ringRadius: 40, countMultiplier: 1, countManual: 8, countMode: 'auto', paletteEntryIndex: 3, rotationOffset: 0, shape: 'circle' }
      ]
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'mandala', pane, cfg, state };

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XcsTab.parseXCS(inst.state.rawData);
    XCSViewer.update(inst.pane, inst.state, lazy);
  },

  generateXCS(cfg) {
    const project = XCSExporter.createProject();
    const palette = PalMgr.get(cfg.paletteId);
    if (!palette) {
      console.error('Palette not found:', cfg.paletteId);
      return project;
    }
    const usedColors = new Set();
    const CX = 50, CY = 50;

    // Detect laser type from palette
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    const addShape = (lx, ly, r, type, color, entry) => {
      const x = CX + lx, y = CY + ly;
      usedColors.add(color);

      const params = entry ? { 
        power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
        processingLightSource: laserSource
      } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };

      const options = {
        x, y, width: r*2, height: r*2,
        layerColor: color, laserSource, params,
        extraDisplayData: { hideLabels: true }
      };

      if (type === 'circle') {
        XCSExporter.addCircle(project, options);
      } else {
        XCSExporter.addRect(project, options);
      }
    };

    const radii = this.computeRadii(cfg);
    cfg.rings.forEach((ring, i) => {
      if (i >= cfg.ringCount) return;
      const r = radii[i];
      const count = ring.countMode === 'auto' ? cfg.symmetry * ring.countMultiplier : ring.countManual;
      const entryIdx = cfg.spiralPalette ? (ring.paletteEntryIndex + i) % palette.entries.length : ring.paletteEntryIndex;
      const entry = palette.entries[entryIdx];
      const scale = 1 + (cfg.dotScaling * i);
      const diam = Math.max(0.1, ring.dotDiameter * scale);
      const halfStep = cfg.alternateRotation && i % 2 === 1 ? (180 / count) : 0;
      const spiralOffset = cfg.ringSpiral * i;
      for (let j = 0; j < count; j++) {
        const ang = ((360/count)*j + ring.rotationOffset + halfStep + spiralOffset) * Math.PI / 180;
        addShape(Math.cos(ang) * r, Math.sin(ang) * r, diam/2, ring.shape, entry.rgb, entry);
      }
    });

    if (cfg.centerDot) {
      const entry = palette.entries[cfg.centerDotEntry];
      addShape(0, 0, cfg.centerDotDiameter/2, 'circle', entry.rgb, entry);
    }

    const canvas = project.canvas[0];
    [...usedColors].forEach((c, idx) => {
      canvas.layerData[c] = { name: `Layer ${idx+1}`, order: idx+1, visible: true };
    });

    return project;
  },

  computeRadii(cfg) {
    const radii = [];
    let currentR = 0;
    for (let i = 0; i < cfg.ringCount; i++) {
      currentR += cfg.rings[i].ringRadius;
      radii.push(currentR);
    }
    return radii;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };

    const palOpts = Object.keys(App.palettes);
    const palLabels = {}; palOpts.forEach(id => palLabels[id] = App.palettes[id].name);

    scroll.appendChild(this.makeSection('Global', [
      this.makeRow('Palette', this.makeToggles(palOpts, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); }, palLabels)),
      this.makeRow('Rings', this.makeStepCounter(cfg.ringCount, 1, 10, v => { cfg.ringCount = v; this.renderControls(tabId); update(); Persistence.save(); })),
      this.makeRow('Symmetry', this.makeStepCounter(cfg.symmetry, 1, 32, v => set('symmetry', v))),
      this.makeRow('Scaling', this.makeRange(-0.5, 1, 0.05, cfg.dotScaling, v => set('dotScaling', +v))),
      this.makeRow('Twist', this.makeRange(-20, 20, 1, cfg.ringSpiral, v => set('ringSpiral', +v), '°')),
      this.makeToggleRow('Alternate rotation', cfg.alternateRotation, v => set('alternateRotation', v)),
      this.makeToggleRow('Spiral palette', cfg.spiralPalette, v => set('spiralPalette', v))
    ]));

    scroll.appendChild(this.makeSection('Center Dot', [
      this.makeToggleRow('Visible', cfg.centerDot, v => set('centerDot', v)),
      this.makeRow('Size', this.makeRange(0.1, 20, 0.1, cfg.centerDotDiameter, v => set('centerDotDiameter', +v), 'mm')),
      this.makeRow('Color Index', this.makeStepCounter(cfg.centerDotEntry, 0, 99, v => set('centerDotEntry', v)))
    ]));

    for (let i = 0; i < cfg.ringCount; i++) {
      const ring = cfg.rings[i] || { dotDiameter: 2, ringRadius: 10, countMultiplier: 1, countManual: 8, countMode: 'auto', paletteEntryIndex: 0, rotationOffset: 0, shape: 'circle' };
      cfg.rings[i] = ring;
      const setRing = (path, val) => { ring[path] = val; update(); Persistence.save(); };

      scroll.appendChild(this.makeSection(`Ring ${i + 1}`, [
        this.makeRow('Shape', this.makeToggles(['circle', 'rect'], ring.shape, v => setRing('shape', v), { circle: 'Circle', rect: 'Rect' })),
        this.makeRow('Dot Size', this.makeRange(0.1, 20, 0.1, ring.dotDiameter, v => setRing('dotDiameter', +v), 'mm')),
        this.makeRow('Spacing', this.makeRange(1, 50, 0.5, ring.ringRadius, v => setRing('ringRadius', +v), 'mm')),
        this.makeRow('Count', this.makeRow('', (ring.countMode === 'auto' ? 
          this.makeStepCounter(ring.countMultiplier, 1, 8, v => setRing('countMultiplier', v)) : 
          this.makeStepCounter(ring.countManual, 1, 128, v => setRing('countManual', v))
        ))),
        this.makeRow('', this.makeToggles(['auto', 'manual'], ring.countMode, v => { ring.countMode = v; this.renderControls(tabId); update(); Persistence.save(); }, { auto: 'Auto (Symmetry)', manual: 'Manual' })),
        this.makeRow('Color Index', this.makeStepCounter(ring.paletteEntryIndex, 0, 99, v => setRing('paletteEntryIndex', v))),
        this.makeRow('Rotation', this.makeRange(0, 360, 5, ring.rotationOffset, v => setRing('rotationOffset', +v), '°'))
      ]));
    }
  },

  makeSection(title, rows, collapsed = false, headerExtra = null) {
    const sec = document.createElement('div');
    sec.className = 'tool-section' + (collapsed ? ' collapsed' : '');
    const head = document.createElement('div');
    head.className = 'tool-section-header';
    head.innerHTML = `<span class="tool-section-toggle">▼</span> <span class="tool-section-title">${title}</span>`;
    if (headerExtra) head.appendChild(headerExtra);
    
    head.querySelector('.tool-section-toggle').onclick = () => sec.classList.toggle('collapsed');
    sec.appendChild(head);
    const body = document.createElement('div');
    body.className = 'tool-section-body';
    rows.forEach(r => body.appendChild(r));
    sec.appendChild(body);
    return sec;
  },

  makeRow(label, control) {
    const row = document.createElement('div');
    row.className = 'ctrl-row';
    const lbl = document.createElement('span');
    lbl.className = 'ctrl-label'; lbl.textContent = label;
    row.appendChild(lbl); row.appendChild(control);
    return row;
  },

  makeRange(min, max, step, val, onChange, unit='', onManualEdit=null) {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl-val-wrap';
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    const disp = document.createElement('span');
    disp.className = 'range-val'; disp.textContent = val + unit;

    const enterEdit = () => {
      const edit = document.createElement('input');
      edit.type = 'text'; 
      edit.style.width = (disp.offsetWidth + 10) + 'px'; 
      edit.style.background = '#000'; edit.style.color = '#fff';
      edit.style.border = '1px solid #5b9bd5'; edit.style.borderRadius = '4px';
      edit.style.padding = '0 4px'; edit.style.fontSize = '11px'; edit.style.fontFamily = 'monospace';
      edit.style.textAlign = 'right';
      edit.value = val + unit;
      
      const oldDispDisplay = disp.style.display;
      disp.style.display = 'none';
      wrap.appendChild(edit);
      edit.focus(); edit.select();
      
      let done = false;
      const finish = (save) => {
        if (done) return; done = true;
        if (wrap.contains(edit)) {
          wrap.removeChild(edit);
          disp.style.display = oldDispDisplay;
          if (save) {
            if (onManualEdit) {
              onManualEdit(edit.value);
            } else {
              const parsed = parseFloat(edit.value.replace(/[^\d.]/g, ''));
              if (!isNaN(parsed)) {
                val = parsed;
                disp.textContent = val + unit;
                onChange(parsed);
              }
            }
          }
        }
      };

      edit.addEventListener('blur', () => finish(true));
      edit.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      });
    };

    disp.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      enterEdit();
    });

    inp.addEventListener('input', () => { 
      val = inp.value;
      disp.textContent = val + unit; 
      onChange(val); 
    });
    wrap.appendChild(inp); wrap.appendChild(disp);
    return wrap;
  },

  makeSelect(options, current, onChange) {
    const sel = document.createElement('select');
    sel.className = 'ctrl-select';
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      if (String(o) === String(current)) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  },

  makeToggles(options, current, onChange, labels = {}, titles = {}) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '4px';
    options.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'hbtn sm' + (String(o) === String(current) ? ' primary' : '');
      btn.textContent = labels[o] || o;
      if (titles[o]) btn.title = titles[o];
      btn.addEventListener('click', () => {
        onChange(o);
        wrap.querySelectorAll('button').forEach(b => b.classList.remove('primary'));
        btn.classList.add('primary');
      });
      wrap.appendChild(btn);
    });
    return wrap;
  },

  makeToggleRow(label, current, onChange) {
    const row = document.createElement('div');
    row.className = 'ctrl-row';
    row.innerHTML = `<span class="ctrl-label">${label}</span>`;
    const btn = document.createElement('button');
    btn.className = 'hbtn sm' + (current ? ' primary' : '');
    btn.textContent = current ? 'ON' : 'OFF';
    btn.onclick = () => {
      current = !current;
      btn.textContent = current ? 'ON' : 'OFF';
      btn.classList.toggle('primary');
      onChange(current);
    };
    row.appendChild(btn);
    return row;
  },

  makeStepCounter(val, min, max, onChange, step = 1) {
    const wrap = document.createElement('div');
    wrap.className = 'step-counter';
    const dec = document.createElement('button'); dec.textContent = '−';
    const inc = document.createElement('button'); inc.textContent = '+';
    const disp = document.createElement('span'); disp.textContent = val;
    dec.onclick = () => { if (val > min) { val -= step; disp.textContent = val; onChange(val); } };
    inc.onclick = () => { if (val < max) { val += step; disp.textContent = val; onChange(val); } };
    wrap.appendChild(dec); wrap.appendChild(disp); wrap.appendChild(inc);
    return wrap;
  }
};

import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { PalMgr } from '../palettes.js';
import { XCSViewer } from '../viewer.js';
import { uuid } from '../utils.js';
import { XcsTab } from './xcs-tab.js';

export function defaultRing(i) {
  return { dotDiameter:3, shape:'circle', countMode:'auto', countMultiplier:1, countManual:8, rotationOffset:0, paletteEntryIndex: i % 21 };
}
export function defaultConfig() {
  return { symmetry:8, ringCount:4, totalDiameter:80, innerMargin:8, spacingMode:'equal',
           centerDot:false, centerDotDiameter:3, centerDotEntry:0,
           alternateRotation:false, paletteId:'laFont-1000lpcm', spiralPalette:false,
           dotScaling:0, ringSpiral:0,
           rings: [0,1,2,3].map(defaultRing) };
}

export const MandalaTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Mandala</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Mandala Design';
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const cfg = initialCfg ? { ...defaultConfig(), ...initialCfg } : defaultConfig();
    // Deep copy rings if they exist in initialCfg to avoid shared references
    if (initialCfg && initialCfg.rings) {
      cfg.rings = initialCfg.rings.map(r => ({ ...defaultRing(0), ...r }));
    }
    const state = { rawData:null, shapes:[] };
    App.instances[tabId] = { type:'mandala', pane, cfg, state };

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
    const canvasId = uuid();
    const displays = [];
    const displayValues = [];
    const palette = PalMgr.get(cfg.paletteId);
    if (!palette) {
      console.error('Palette not found:', cfg.paletteId);
      return { canvasId, canvas: [], device: { data: { value: [] } } };
    }
    const usedColors = new Set();
    const CX = 50, CY = 50;

    // Detect laser type from palette
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';
    const planType = isIR ? 'ir' : 'blue';

    const addShape = (lx, ly, r, type, color, entry) => {
      const id = uuid();
      const x = CX + lx, y = CY + ly;
      usedColors.add(color);

      displays.push({ 
        id, name: null, type: type === 'circle' ? 'CIRCLE' : 'RECT', 
        x, y, width: r*2, height: r*2, angle: 0,
        scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, 
        pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: x, offsetY: y, lockRatio: false, isClosePath: true,
        zOrder: displays.length, sourceId: id, groupTag: "", layerTag: color,
        layerColor: color, visible: true, originColor: "#000000",
        enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { 
          paintType: "color", visible: true, color: 0, alpha: 1, width: 1,
          cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 
        },
        isFill: true, lineColor: 0, fillColor: color, hideLabels: true, power: null
      });
      
      const pt = "COLOR_FILL_ENGRAVE";
      const pm = entry ? { 
        power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1,
        processingLightSource: laserSource, bitmapScanMode: "zMode", needGapNumDensity: true,
        dotDuration: 100, dpi: 500, enableKerf: false, kerfDistance: 0
      } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };
      
      // Mandatory nodes for F2 sliders to appear
      const nodes = {
        VECTOR_CUTTING: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 16, repeat: 1, processingLightSource: laserSource } } },
        VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 20, repeat: 1, processingLightSource: laserSource } } },
        FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        INTAGLIO: { materialType: "customize", planType: planType, parameter: { customize: { power: 1, speed: 80, repeat: 1, processingLightSource: laserSource } } }
      };

      displayValues.push([id, { 
        isFill: true, type: type === 'circle' ? 'CIRCLE' : 'RECT',
        processingType: pt, processIgnore: false, isWhiteModel: false,
        data: nodes
      }]);
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

    const layerData = {};
    [...usedColors].forEach((c, idx) => {
      layerData[c] = { name: `Layer ${idx+1}`, order: idx+1, visible: true };
    });

    return {
      canvasId: canvasId,
      canvas: [{ 
        id: canvasId, title: "{panel}1", 
        layerData,
        groupData: {}, displays 
      }],
      device: { 
        id: "GS006",
        power: [5, 15],
        data: { 
          dataType: "Map", 
          value: [[canvasId, { 
            mode: "LASER_PLANE",
            data: {
              LASER_PLANE: {
                material: 0, lightSourceMode: planType, thickness: null,
                perimeter: null, diameter: null, isProcessByLayer: false,
                pathPlanning: "auto", fillPlanning: "separate", dreedyTsp: false,
                avoidSmokeModal: false, scanDirection: "topToBottom",
                enableOddEvenKerf: true, xcsUsed: []
              }
            },
            displays: { dataType: "Map", value: displayValues } 
          }]] 
        } 
      },
      extId: "GS006",
      extName: "F2",
      version: "1.5.8",
      minRequiredVersion: "2.6.0",
      created: Date.now(),
      modify: Date.now(),
      projectTraceID: uuid()
    };
  },
  computeRadii(cfg) {
    const { ringCount, totalDiameter, innerMargin, spacingMode } = cfg;
    const outerRadius = totalDiameter / 2;
    const usable = outerRadius - innerMargin;
    if (spacingMode === 'equal') return Array.from({length:ringCount}, (_,i) => innerMargin + usable*(i+1)/ringCount);
    if (spacingMode === 'golden') {
      const phi = 1.618033988749895;
      const w = Array.from({length:ringCount}, (_,i) => Math.pow(phi,i));
      const tot = w.reduce((s,v)=>s+v,0);
      let cum = 0; return w.map(v => { cum += v; return innerMargin + usable*cum/tot; });
    }
    if (spacingMode === 'fibonacci') {
      let a=1,b=1, fibs=[1];
      for (let i=1;i<ringCount;i++){[a,b]=[b,a+b];fibs.push(a);}
      const tot = fibs.reduce((s,v)=>s+v,0);
      let cum = 0; return fibs.map(v => { cum += v; return innerMargin + usable*cum/tot; });
    }
    return Array.from({length:ringCount}, (_,i) => innerMargin + usable*(i+1)/ringCount);
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll');
    scroll.innerHTML = '';

    const update = (lazy = false) => this.refresh(tabId, lazy);

    const set = (path, val) => {
      const parts = path.split('.');
      let obj = cfg;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length-1]] = val;
      if (path === 'ringCount') {
        while (cfg.rings.length < cfg.ringCount) cfg.rings.push(defaultRing(cfg.rings.length));
        this.renderControls(tabId);
        update(false);
      } else {
        update(true);
      }
      Persistence.save();
    };

    // ── Global section ──
    const globalSec = this.makeSection('Global', [
      this.makeRow('Palette', this.makePaletteSelect(cfg, (v) => { set('paletteId', v); this.renderControls(tabId); })),
      this.makeToggleRow('Spiral Palette', cfg.spiralPalette, v => set('spiralPalette', v)),
      this.makeRow('Size (Ø)', this.makeRange(10, 300, 1, cfg.totalDiameter, v => set('totalDiameter', +v), 'mm')),
      this.makeRow('Inner radius', this.makeRange(0, 40, 0.5, cfg.innerMargin, v => set('innerMargin', +v), 'mm')),
      this.makeRow('Ring Scale', this.makeRange(-0.5, 0.5, 0.05, cfg.dotScaling, v => set('dotScaling', +v), '×')),
      this.makeRow('Ring Spiral', this.makeRange(-45, 45, 1, cfg.ringSpiral, v => set('ringSpiral', +v), '°')),
      this.makeRow('Symmetry', this.makeStepCounter(cfg.symmetry, 2, 48, v => set('symmetry', +v))),
      this.makeRow('Rings', this.makeStepCounter(cfg.ringCount, 1, 12, (v) => set('ringCount', v))),
      this.makeRow('Spacing', this.makeToggles(['equal','golden','fibonacci'], cfg.spacingMode, v => set('spacingMode', v), {equal:'Equal', golden:'Golden', fibonacci:'Fibonacci'})),
      this.makeToggleRow('Alt rotate', cfg.alternateRotation, v => set('alternateRotation', v)),
      this.makeCenterDotSection(cfg, tabId),
    ]);
    scroll.appendChild(globalSec);

    // ── Per-ring sections ──
    for (let i = 0; i < cfg.ringCount; i++) {
      const ring = cfg.rings[i];
      const p = `rings.${i}.`;
      const sec = this.makeSection(`Ring ${i+1}`, [
        this.makeRow('Color', this.makeEntryPicker(cfg.paletteId, ring.paletteEntryIndex, (v) => set(p + 'paletteEntryIndex', +v))),
        this.makeRow('Dot size', this.makeRange(0.3, 8, 0.1, ring.dotDiameter, v => set(p + 'dotDiameter', +v), 'mm')),
        this.makeRow('Shape', this.makeToggles(['circle','ring','diamond','cross','petal'], ring.shape, v => set(p + 'shape', v), {circle:'Circle', ring:'Ring', diamond:'Diamond', cross:'Cross', petal:'Petal'})),
        this.makeCountRow(ring, (mode, val) => {
          ring.countMode = mode;
          if (mode==='auto') ring.countMultiplier = val;
          else ring.countManual = val;
          update(true);
          Persistence.save();
        }, cfg.symmetry),
        this.makeRow('Rotation', this.makeRange(0, 360, 1, ring.rotationOffset, v => set(p + 'rotationOffset', +v), '°')),
      ], true);
      scroll.appendChild(sec);
    }
  },

  makeSection(title, children, collapsed, headerControl) {
    const sec = document.createElement('div');
    sec.className = 'ctrl-section';
    const hdr = document.createElement('div');
    hdr.className = 'ctrl-section-title';
    hdr.style.display = 'flex';
    hdr.style.alignItems = 'center';
    
    const label = document.createElement('span');
    label.textContent = title;
    hdr.appendChild(label);

    if (headerControl) {
      headerControl.style.marginLeft = 'auto';
      headerControl.style.marginRight = '8px';
      headerControl.addEventListener('click', e => e.stopPropagation());
      hdr.appendChild(headerControl);
    } else {
      const spacer = document.createElement('div');
      spacer.style.flex = '1';
      hdr.appendChild(spacer);
    }

    const arrow = document.createElement('span');
    arrow.style.cssText = 'color:#333;font-size:9px';
    arrow.textContent = collapsed ? '▸' : '▾';
    hdr.appendChild(arrow);

    const body = document.createElement('div');
    body.className = 'ctrl-section-body' + (collapsed ? ' collapsed' : '');
    hdr.addEventListener('click', () => {
      const isOpen = !body.classList.contains('collapsed');
      body.classList.toggle('collapsed', isOpen);
      arrow.textContent = isOpen ? '▸' : '▾';
    });
    children.forEach(c => { if (c) body.appendChild(c); });
    sec.appendChild(hdr);
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
      edit.style.width = '60px'; edit.style.background = '#000'; edit.style.color = '#fff';
      edit.style.border = '1px solid #5b9bd5'; edit.style.borderRadius = '4px';
      edit.style.padding = '0 4px'; edit.style.fontSize = '11px'; edit.style.fontFamily = 'monospace';
      edit.value = val + unit;
      
      wrap.replaceChild(edit, disp);
      edit.focus(); edit.select();
      
      let done = false;
      const finish = (save) => {
        if (done) return; done = true;
        if (wrap.contains(edit)) {
          wrap.replaceChild(disp, edit);
          if (save) {
            if (onManualEdit) {
              onManualEdit(edit.value);
            } else {
              const parsed = parseFloat(edit.value.replace(/[^\d.]/g, ''));
              if (!isNaN(parsed)) onChange(parsed);
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

    disp.addEventListener('click', (e) => {
      e.stopPropagation();
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
        if (String(o) === String(current)) return;
        onChange(o);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  },

  makePaletteSelect(cfg, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'entry-picker';
    const swatch = document.createElement('div');
    swatch.className = 'entry-swatch';
    
    const updateSwatch = (id) => {
      const p = PalMgr.get(id);
      swatch.style.background = (p && p.entries.length) ? p.entries[0].rgb : '#333';
    };
    updateSwatch(cfg.paletteId);

    const sel = document.createElement('select');
    sel.className = 'entry-select';
    PalMgr.fillPaletteSelect(sel, cfg.paletteId);
    sel.addEventListener('change', () => {
      updateSwatch(sel.value);
      onChange(sel.value);
    });
    wrap.appendChild(swatch); wrap.appendChild(sel);
    return wrap;
  },

  makeEntryPicker(paletteId, currentIdx, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'entry-picker';
    const swatch = document.createElement('div');
    swatch.className = 'entry-swatch';
    swatch.style.background = PalMgr.entryColor(paletteId, currentIdx);
    const sel = document.createElement('select');
    sel.className = 'entry-select';
    PalMgr.fillEntrySelect(sel, paletteId, currentIdx);
    sel.addEventListener('change', () => {
      swatch.style.background = PalMgr.entryColor(paletteId, +sel.value);
      onChange(sel.value);
    });
    wrap.appendChild(swatch); wrap.appendChild(sel);
    return wrap;
  },

  makeToggleRow(label, val, onChange) {
    const row = document.createElement('div');
    row.className = 'ctrl-row';
    const lbl = document.createElement('label');
    lbl.className = 'ctrl-toggle';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = val;
    cb.addEventListener('change', () => onChange(cb.checked));
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + label));
    const lsp = document.createElement('span');
    lsp.className = 'ctrl-label';
    row.appendChild(lsp); row.appendChild(lbl);
    return row;
  },

  makeCenterDotSection(cfg, tabId) {
    const frag = document.createDocumentFragment();
    const toggleRow = document.createElement('div');
    toggleRow.className = 'ctrl-row';
    const lbl = document.createElement('label');
    lbl.className = 'ctrl-toggle';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = cfg.centerDot;
    cb.addEventListener('change', () => {
      cfg.centerDot = cb.checked;
      sizeRow.style.display = cfg.centerDot ? 'flex' : 'none';
      colorRow.style.display = cfg.centerDot ? 'flex' : 'none';
      this.refresh(tabId, true);
      Persistence.save();
    });
    lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' Center dot'));
    const lsp = document.createElement('span');
    lsp.className = 'ctrl-label';
    toggleRow.appendChild(lsp); toggleRow.appendChild(lbl);
    frag.appendChild(toggleRow);

    const sizeRow = this.makeRow('Size', this.makeRange(0.5, 10, 0.1, cfg.centerDotDiameter, v => { cfg.centerDotDiameter = +v; this.refresh(tabId, true); Persistence.save(); }, 'mm'));
    sizeRow.style.display = cfg.centerDot ? 'flex' : 'none';
    frag.appendChild(sizeRow);

    const colorRow = this.makeRow('Color', this.makeEntryPicker(cfg.paletteId, cfg.centerDotEntry, v => { cfg.centerDotEntry = +v; this.refresh(tabId, true); Persistence.save(); }));
    colorRow.style.display = cfg.centerDot ? 'flex' : 'none';
    frag.appendChild(colorRow);

    return frag;
  },

  makeStepCounter(current, min, max, onChange, step = 1) {
    const wrap = document.createElement('div');
    wrap.className = 'ring-counter';
    const minus = document.createElement('button');
    minus.className = 'hbtn sm'; minus.textContent = '−';
    const val = document.createElement('span');
    val.className = 'ring-counter-val'; val.textContent = current;
    const plus = document.createElement('button');
    plus.className = 'hbtn sm'; plus.textContent = '+';
    minus.addEventListener('click', () => { if (current > min) { current -= step; if (current < min) current = min; val.textContent = current; onChange(current); } });
    plus.addEventListener('click',  () => { if (current < max) { current += step; if (current > max) current = max; val.textContent = current; onChange(current); } });
    wrap.appendChild(minus); wrap.appendChild(val); wrap.appendChild(plus);
    return wrap;
  },

  makeCountRow(ring, onChange, symmetry) {
    const wrap = document.createElement('div');
    wrap.style.flex = '1';
    const modeWrap = document.createElement('div');
    modeWrap.style.cssText = 'display:flex;gap:4px;margin-bottom:4px';
    const autoBtn = document.createElement('button');
    autoBtn.className = 'hbtn sm' + (ring.countMode==='auto'?' primary':'');
    autoBtn.textContent = 'Auto';
    const manBtn = document.createElement('button');
    manBtn.className = 'hbtn sm' + (ring.countMode==='manual'?' primary':'');
    manBtn.textContent = 'Manual';
    const countDisplay = document.createElement('span');
    countDisplay.style.cssText = 'font-size:11px;color:#777;padding:2px 6px';
    const updateDisplay = () => {
      const n = ring.countMode==='auto' ? symmetry * ring.countMultiplier : ring.countManual;
      countDisplay.textContent = `= ${n} dots`;
    };
    updateDisplay();
    const autoRow = document.createElement('div');
    autoRow.style.cssText = 'display:flex;align-items:center;gap:6px;' + (ring.countMode==='manual'?'display:none!important':'');
    const multSel = document.createElement('select');
    multSel.className = 'ctrl-select';
    [1,2,3,4].forEach(v => { const o = document.createElement('option'); o.value=v; o.textContent=`×${v}`; if(v===ring.countMultiplier)o.selected=true; multSel.appendChild(o); });
    multSel.addEventListener('change', () => { ring.countMultiplier = +multSel.value; updateDisplay(); onChange('auto', +multSel.value); });
    autoRow.appendChild(document.createTextNode('×'));
    autoRow.appendChild(multSel);
    const manRow = document.createElement('div');
    manRow.style.cssText = 'display:' + (ring.countMode==='auto'?'none':'flex') + ';align-items:center;gap:6px';
    const countInp = document.createElement('input');
    countInp.type = 'number'; countInp.className = 'ctrl-number'; countInp.min = 1; countInp.max = 200; countInp.value = ring.countManual;
    countInp.addEventListener('input', () => { ring.countManual = +countInp.value; updateDisplay(); onChange('manual', +countInp.value); });
    manRow.appendChild(countInp);
    autoBtn.addEventListener('click', () => {
      ring.countMode = 'auto'; autoBtn.className='hbtn sm primary'; manBtn.className='hbtn sm';
      autoRow.style.display='flex'; manRow.style.display='none'; updateDisplay(); onChange('auto', ring.countMultiplier);
    });
    manBtn.addEventListener('click', () => {
      ring.countMode = 'manual'; autoBtn.className='hbtn sm'; manBtn.className='hbtn sm primary';
      autoRow.style.display='none'; manRow.style.display='flex'; updateDisplay(); onChange('manual', ring.countManual);
    });
    modeWrap.appendChild(autoBtn); modeWrap.appendChild(manBtn); modeWrap.appendChild(countDisplay);
    wrap.appendChild(modeWrap); wrap.appendChild(autoRow); wrap.appendChild(manRow);
    const outer = document.createElement('div');
    outer.className = 'ctrl-row';
    const lbl = document.createElement('span'); lbl.className = 'ctrl-label'; lbl.textContent = 'Count';
    outer.appendChild(lbl); outer.appendChild(wrap);
    return outer;
  }
};

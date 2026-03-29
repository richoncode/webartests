import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { UI, uuid } from '../utils.js';
import { XCSExporter } from '../xcs-exporter.js';
import { PalMgr } from '../palettes.js';

export const BitmapTab = {
  create(tabId, initialCfg) {
    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">Bitmap & Dithering</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const defaults = {
      type: 'dither-test',
      size: 10,
      count: 5,
      minPct: 0,
      maxPct: 100,
      paletteId: 'laFont-1000lpcm',
      color1Idx: 0,
      color2Idx: 10,
      dotRes: 0.08, 
      dpi: Math.round(25.4 / 0.08),
      method: 'ordered', 
      border: false
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;

    const state = { project: null };
    App.instances[tabId] = { type: 'bitmap', pane, cfg, state };

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || 'Dither Test';
    viewer.querySelector('.viewer-fname').textContent = label;
    
    const btnGroup = viewer.querySelector('.btn-group');
    const bmpBtn = document.createElement('button');
    bmpBtn.className = 'hbtn';
    bmpBtn.textContent = 'Export PNG';
    bmpBtn.onclick = () => this.exportBitmap(tabId);
    btnGroup.appendChild(bmpBtn);

    const layersBtn = document.createElement('button');
    layersBtn.className = 'hbtn';
    layersBtn.textContent = 'Export PNG Layers';
    layersBtn.onclick = () => this.exportPNGLayers(tabId);
    btnGroup.appendChild(layersBtn);

    pane.appendChild(viewer);

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.project = this.generateXCS(inst.cfg);
    XCSViewer.update(inst.pane, inst.state, lazy);
  },

  exportBitmap(tabId) {
    const { cfg } = App.instances[tabId];
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const ent1 = palette.entries[cfg.color1Idx % palette.entries.length];
    const ent2 = palette.entries[cfg.color2Idx % palette.entries.length];
    
    const count = cfg.count || 5;
    const cellSize = cfg.size || 10;
    const gap = 2;
    const dotRes = cfg.dotRes || 0.1;
    const totalW = count * cellSize + (count - 1) * gap;
    
    // Scale label area to fit dynamic height
    const isSmall = cellSize < 6;
    let labelHeight = cellSize / 2.2;
    if (isSmall) labelHeight *= 1.2; 
    const labelAreaMm = labelHeight + 4;
    const totalH = cellSize + labelAreaMm;

    const pxW = Math.ceil(totalW / dotRes);
    const pxH = Math.ceil(totalH / dotRes);
    
    const canvas = document.createElement('canvas');
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, pxW, pxH);

    const bayer4 = [
      [ 0,  8,  2, 10], [12,  4, 14,  6], [ 3, 11,  1,  9], [15,  7, 13,  5]
    ].map(row => row.map(v => (v + 0.5) / 16));

    for (let i = 0; i < count; i++) {
      const showLabel = !isSmall || (i % 2 === 0);
      const pct = count > 1 ? cfg.minPct + (cfg.maxPct - cfg.minPct) * (i / (count - 1)) : cfg.minPct;
      const mmX = i * (cellSize + gap);
      const mmY = labelAreaMm;

      const pxX = Math.floor(mmX / dotRes);
      const pxY = Math.floor(mmY / dotRes);
      const pxSize = Math.floor(cellSize / dotRes);

      // Cell Background
      ctx.fillStyle = ent1.rgb;
      ctx.fillRect(pxX, pxY, pxSize, pxSize);

      // Text Label
      if (showLabel) {
        ctx.fillStyle = ent2.rgb;
        const fontSizePx = Math.floor(labelHeight / dotRes);
        ctx.font = `bold ${fontSizePx}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(pct)}%`, pxX + pxSize / 2, pxY - Math.floor(2.0 / dotRes));
      }

      // Dither
      ctx.fillStyle = ent2.rgb;
      const thresh = pct / 100;
      let seed = (i + 1) * 12345;
      const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

      for (let dy = 0; dy < pxSize; dy++) {
        for (let dx = 0; dx < pxSize; dx++) {
          let active = (cfg.method === 'ordered') ? (bayer4[dy % 4][dx % 4] < thresh) : (random() < thresh);
          if (active) ctx.fillRect(pxX + dx, pxY + dy, 1, 1);
        }
      }
    }

    const name = (App.tabs.find(t => t.id === tabId)?.label || 'Dither-Test') + '.png';
    const link = document.createElement('a');
    link.download = name;
    link.href = canvas.toDataURL('image/png');
    link.click();
  },

  exportPNGLayers(tabId) {
    const { cfg } = App.instances[tabId];
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const ent1 = palette.entries[cfg.color1Idx % palette.entries.length];
    const ent2 = palette.entries[cfg.color2Idx % palette.entries.length];
    const p1 = PalMgr.getParams(cfg.paletteId, cfg.color1Idx);
    const p2 = PalMgr.getParams(cfg.paletteId, cfg.color2Idx);
    
    const count = cfg.count || 5;
    const cellSize = cfg.size || 10;
    const gap = 2;
    const dotRes = cfg.dotRes || 0.1;
    const totalW = count * cellSize + (count - 1) * gap;
    
    const isSmall = cellSize < 6;
    let labelHeight = cellSize / 2.2;
    if (isSmall) labelHeight *= 1.2;
    const labelAreaMm = labelHeight + 4;
    const totalH = cellSize + labelAreaMm;

    const pxW = Math.ceil(totalW / dotRes);
    const pxH = Math.ceil(totalH / dotRes);
    const baseName = (App.tabs.find(t => t.id === tabId)?.label || 'Dither-Test');

    const renderLayer = (layerIdx) => {
      const canvas = document.createElement('canvas');
      canvas.width = pxW; canvas.height = pxH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, pxW, pxH);
      ctx.fillStyle = '#ffffff';

      const bayer4 = [
        [ 0,  8,  2, 10], [12,  4, 14,  6], [ 3, 11,  1,  9], [15,  7, 13,  5]
      ].map(row => row.map(v => (v + 0.5) / 16));

      for (let i = 0; i < count; i++) {
        const showLabel = !isSmall || (i % 2 === 0);
        const pct = count > 1 ? cfg.minPct + (cfg.maxPct - cfg.minPct) * (i / (count - 1)) : cfg.minPct;
        const mmX = i * (cellSize + gap);
        const mmY = labelAreaMm;
        const pxX = Math.floor(mmX / dotRes);
        const pxY = Math.floor(mmY / dotRes);
        const pxSize = Math.floor(cellSize / dotRes);

        const thresh = pct / 100;
        let seed = (i + 1) * 12345;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

        if (layerIdx === 0) {
          // Layer 1: Background pixels (Complementary)
          for (let dy = 0; dy < pxSize; dy++) {
            for (let dx = 0; dx < pxSize; dx++) {
              let active = (cfg.method === 'ordered') ? (bayer4[dy % 4][dx % 4] < thresh) : (random() < thresh);
              if (!active) ctx.fillRect(pxX + dx, pxY + dy, 1, 1);
            }
          }
        } else {
          // Layer 2: Labels & Dither dots
          if (showLabel) {
            const fontSizePx = Math.floor(labelHeight / dotRes);
            ctx.font = `bold ${fontSizePx}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.round(pct)}%`, pxX + pxSize / 2, pxY - Math.floor(2.0 / dotRes));
          }

          for (let dy = 0; dy < pxSize; dy++) {
            for (let dx = 0; dx < pxSize; dx++) {
              let active = (cfg.method === 'ordered') ? (bayer4[dy % 4][dx % 4] < thresh) : (random() < thresh);
              if (active) ctx.fillRect(pxX + dx, pxY + dy, 1, 1);
            }
          }
        }
      }

      const params = layerIdx === 0 ? p1 : p2;
      const fname = `${baseName}_L${layerIdx+1}_P${params.power}S${params.speed}D${params.density}.png`;
      const link = document.createElement('a');
      link.download = fname;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    renderLayer(0);
    setTimeout(() => renderLayer(1), 500);
  },

  generateXCS(cfg) {
    const project = XCSExporter.createProject();
    const CX = 50, CY = 50;
    
    let palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return project;

    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    if (cfg.type === 'dither-test') {
      const count = cfg.count || 5;
      const cellSize = cfg.size || 10;
      const gap = 2;
      const dotRes = cfg.dotRes || 0.1;
      const totalW = count * cellSize + (count - 1) * gap;
      const startX = CX - totalW / 2;

      const ent1 = palette.entries[cfg.color1Idx % palette.entries.length];
      const ent2 = palette.entries[cfg.color2Idx % palette.entries.length];
      const params1 = PalMgr.getParams(cfg.paletteId, cfg.color1Idx);
      const params2 = PalMgr.getParams(cfg.paletteId, cfg.color2Idx);

      const isSmall = cellSize < 6;
      let labelHeight = cellSize / 2.2;
      if (isSmall) labelHeight *= 1.2;

      const bayer4 = [
        [ 0,  8,  2, 10], [12,  4, 14,  6], [ 3, 11,  1,  9], [15,  7, 13,  5]
      ].map(row => row.map(v => (v + 0.5) / 16));

      for (let i = 0; i < count; i++) {
        const showLabel = !isSmall || (i % 2 === 0);
        const pct = count > 1 ? cfg.minPct + (cfg.maxPct - cfg.minPct) * (i / (count - 1)) : cfg.minPct;
        const x = startX + i * (cellSize + gap) + cellSize / 2;
        const y = CY;

        // Label
        if (showLabel) {
          const sc = labelHeight / 23.35;
          XCSExporter.addText(project, {
            text: `${Math.round(pct)}%`, x, y: y - cellSize / 2 - labelHeight - 1, width: cellSize, height: labelHeight, fontSize: 72 * sc, scale: sc,
            params: params2, layerColor: ent2.rgb, laserSource, align: "center", isFill: false
          });
        }

        // Background
        XCSExporter.addRect(project, {
          x, y, width: cellSize, height: cellSize,
          params: params1, isFill: true, laserSource, layerColor: ent1.rgb,
          extraDisplayData: { paletteName: palette.name, colorName: ent1.label, hideLabels: true }
        });

        // Dither (RLE Optimized)
        const dotsX = Math.floor(cellSize / dotRes);
        const dotsY = Math.floor(cellSize / dotRes);
        const thresh = pct / 100;
        let seed = (i + 1) * 12345;
        const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

        let dotPath = "";
        for (let dy = 0; dy < dotsY; dy++) {
          let startDX = -1;
          for (let dx = 0; dx <= dotsX; dx++) {
            let active = false;
            if (dx < dotsX) {
              active = (cfg.method === 'ordered') ? (bayer4[dy % 4][dx % 4] < thresh) : (random() < thresh);
            }
            if (active && startDX === -1) {
              startDX = dx;
            } else if (!active && startDX !== -1) {
              const runLen = dx - startDX;
              const px = x - cellSize / 2 + startDX * dotRes;
              const py = y - cellSize / 2 + dy * dotRes;
              dotPath += `M ${px.toFixed(3)} ${py.toFixed(3)} h ${(runLen * dotRes).toFixed(3)} v ${dotRes.toFixed(3)} h -${(runLen * dotRes).toFixed(3)} z `;
              startDX = -1;
            }
          }
        }

        if (dotPath) {
          XCSExporter.addPath(project, {
            dPath: dotPath, x, y, width: cellSize, height: cellSize,
            params: params2, isFill: true, laserSource, layerColor: ent2.rgb,
            extraDisplayData: { typeOverride: 'BITMAP', ditherPct: Math.round(pct), paletteName: palette.name, colorName: ent2.label, hideLabels: true }
          });
        }
      }
    }

    if (cfg.border) {
      XCSExporter.addRect(project, {
        x: CX, y: CY, width: 100, height: 100,
        layerColor: "#ffffff", laserSource, isFill: false,
        params: { power: 10, speed: 100, repeat: 1, processingLightSource: laserSource },
        extraDisplayData: { hideLabels: true }
      });
    }
    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const rebuild = () => this.renderControls(tabId);

    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return;

    scroll.appendChild(UI.makeSection('General', [
      UI.makeRow('Palette', UI.makeSelect(PalMgr.list().map(p => p.id), cfg.paletteId, v => { cfg.paletteId = v; rebuild(); })),
      UI.makeRow('Color 1 (BG)', UI.makePalettePicker(palette.entries, cfg.color1Idx, v => set('color1Idx', v))),
      UI.makeRow('Color 2 (Dots)', UI.makePalettePicker(palette.entries, cfg.color2Idx, v => set('color2Idx', v))),
      UI.makeToggleRow('Show Border', cfg.border, v => set('border', v))
    ]));

    const beamPresets = {
      'IR (0.03mm)': 0.03, 'IR 2x (0.06mm)': 0.06, 'IR 3x (0.09mm)': 0.09,
      'Blue (0.08mm)': 0.08, 'Blue 2x (0.16mm)': 0.16, 'Blue 3x (0.24mm)': 0.24
    };

    scroll.appendChild(UI.makeSection('Dither Settings', [
      UI.makeRow('Method', UI.makeToggles(['random', 'ordered'], cfg.method, v => set('method', v))),
      UI.makeRow('Cell Size', UI.makeRange(2, 50, 1, cfg.size, v => set('size', +v), 'mm')),
      UI.makeRow('Count', UI.makeStepCounter(cfg.count, 1, 20, v => set('count', v))),
      UI.makeRow('Min Dither %', UI.makeRange(0, 100, 1, cfg.minPct, v => set('minPct', +v), '%')),
      UI.makeRow('Max Dither %', UI.makeRange(0, 100, 1, cfg.maxPct, v => set('maxPct', +v), '%'))
    ]));

    scroll.appendChild(UI.makeSection('Resolution & Pitch', [
      UI.makeRow('Beam Preset', UI.makeSelect(['Custom', ...Object.keys(beamPresets)], (() => {
        const found = Object.entries(beamPresets).find(([k, v]) => Math.abs(v - cfg.dotRes) < 0.0001);
        return found ? found[0] : 'Custom';
      })(), v => {
        if (v === 'Custom') return;
        const val = beamPresets[v];
        cfg.dotRes = val;
        cfg.dpi = Math.round(25.4 / val);
        rebuild(); update();
      })),
      UI.makeRow('DPI', UI.makeRange(25, 1000, 1, cfg.dpi, v => {
        cfg.dpi = +v;
        cfg.dotRes = +(25.4 / v).toFixed(4);
        rebuild(); update(true);
      })),
      UI.makeRow('Dot Size', UI.makeRange(0.02, 1.0, 0.01, cfg.dotRes, v => {
        cfg.dotRes = +v;
        cfg.dpi = Math.round(25.4 / v);
        rebuild(); update(true);
      }, 'mm'))
    ]));
  }
};

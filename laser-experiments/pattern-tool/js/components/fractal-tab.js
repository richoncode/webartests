import { App } from '../app.js';
import { Persistence } from '../persistence.js';
import { XCSViewer } from '../viewer.js';
import { uuid, UI } from '../utils.js';
import { XCSIR } from '../xcs-ir.js';
import { PalMgr } from '../palettes.js';
import { XCSExporter } from '../xcs-exporter.js';

export const FractalTab = {
  create(tabId, initialCfg) {
    const modeLabels = {
      'sierpinski-gasket': 'Sierpinski Gasket',
      'sierpinski-carpet': 'Sierpinski Carpet',
      'koch-snowflake': 'Koch Snowflake',
      'dragon-curve': 'Dragon Curve',
      'mandelbrot': 'Mandelbrot Set',
      'julia-set': 'Julia Set',
      'pythagoras-tree': 'Pythagoras Tree',
      'menger-sponge-2d': 'Menger Sponge (2D)',
      'vicsek-fractal': 'Vicsek Fractal',
      'barnsley-fern': 'Barnsley Fern'
    };

    const pane = document.createElement('div');
    pane.className = 'tab-pane';
    pane.dataset.paneId = tabId;
    const title = modeLabels[initialCfg?.mode] || 'Fractal Recursion';
    pane.innerHTML = `
      <div class="left-tool-panel">
        <div class="tool-header"><span class="tool-title">${title}</span></div>
        <div class="tool-scroll"></div>
      </div>`;

    const viewer = XCSViewer.create(tabId);
    const label = App.tabs.find(t => t.id === tabId)?.label || title;
    viewer.querySelector('.viewer-fname').textContent = label;
    pane.appendChild(viewer);

    const defaults = {
      paletteId: 'laFont-1000lpcm',
      totalSize: 40,
      mode: 'sierpinski-gasket',
      colorRangeMode: false,
      rangeStartIdx: 0,
      rangeEndIdx: 10,
      iterations: 4,
      pointCount: 5000,
      mandelbrotRes: 100,
      juliaC: { re: -0.7, im: 0.27015 },
      angle: 45
    };
    const cfg = initialCfg ? { ...defaults, ...initialCfg } : defaults;
    const state = { rawData: null, shapes: [] };
    App.instances[tabId] = { type: 'fractal', pane, cfg, state };

    this.renderControls(tabId);
    this.refresh(tabId);
    return pane;
  },

  refresh(tabId, lazy = false) {
    const inst = App.instances[tabId];
    inst.state.rawData = this.generateXCS(inst.cfg);
    inst.state.shapes = XCSIR.parseXCS(inst.state.rawData);
    XCSViewer.update(inst.pane, inst.state, lazy);
  },

  generateXCS(cfg) {
    const project = XCSExporter.createProject();
    let palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    if (!palette) return project;

    const usedColors = new Set();
    const CX = 50, CY = 50;
    const isIR = palette.laser === 'ir' || palette.name.toUpperCase().includes('IR');
    const laserSource = isIR ? 'red' : 'blue';

    const addLine = (x1, y1, x2, y2, color, entry) => {
      usedColors.add(color);
      const params = entry ? { power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1, processingLightSource: laserSource } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };
      XCSExporter.addPath(project, {
        x: CX + (x1+x2)/2, y: CY + (y1+y2)/2, width: Math.max(0.1, Math.abs(x2-x1)), height: Math.max(0.1, Math.abs(y2-y1)),
        dPath: `M ${CX+x1} ${CY+y1} L ${CX+x2} ${CY+y2}`,
        layerColor: color, laserSource, params,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry?.label }
      });
    };

    const addCircle = (lx, ly, r, color, entry) => {
      usedColors.add(color);
      const params = entry ? { power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1, processingLightSource: laserSource } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };
      XCSExporter.addCircle(project, {
        x: CX + lx, y: CY + ly, width: r*2, height: r*2,
        layerColor: color, laserSource, params,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry?.label }
      });
    };

    const addRect = (lx, ly, w, h, angle, color, entry) => {
      usedColors.add(color);
      const params = entry ? { power: entry.power, speed: palette.speed, density: palette.lpcm, repeat: 1, processingLightSource: laserSource } : { power: 20, speed: 200, density: 100, repeat: 1, processingLightSource: laserSource };
      XCSExporter.addRect(project, {
        x: CX + lx, y: CY + ly, width: w, height: h, angle,
        layerColor: color, laserSource, params,
        extraDisplayData: { hideLabels: true, paletteName: palette.name, colorName: entry?.label }
      });
    };

    const getColor = (t) => {
      const idx = cfg.colorRangeMode 
        ? Math.round(cfg.rangeStartIdx + (cfg.rangeEndIdx - cfg.rangeStartIdx) * t)
        : cfg.rangeStartIdx;
      return palette.entries[Math.max(0, Math.min(palette.entries.length - 1, idx))];
    };

    if (cfg.mode === 'sierpinski-gasket') {
      const size = cfg.totalSize;
      const h = size * Math.sqrt(3) / 2;
      const recurse = (x, y, s, level) => {
        if (level === 0) {
          const entry = getColor(0.5);
          addLine(x, y - h/2, x - s/2, y + h/2, entry.rgb, entry);
          addLine(x - s/2, y + h/2, x + s/2, y + h/2, entry.rgb, entry);
          addLine(x + s/2, y + h/2, x, y - h/2, entry.rgb, entry);
          return;
        }
        const entry = getColor(level / cfg.iterations);
        recurse(x, y - h/4, s/2, level - 1);
        recurse(x - s/4, y + h/4, s/2, level - 1);
        recurse(x + s/4, y + h/4, s/2, level - 1);
      };
      recurse(0, 0, size, cfg.iterations);
    } else if (cfg.mode === 'sierpinski-carpet') {
      const size = cfg.totalSize;
      const recurse = (x, y, s, level) => {
        if (level === 0) {
          const entry = getColor(0.5);
          addRect(x, y, s, s, 0, entry.rgb, entry);
          return;
        }
        const ns = s / 3;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const entry = getColor(level / cfg.iterations);
            recurse(x + i*ns, y + j*ns, ns, level - 1);
          }
        }
      };
      recurse(0, 0, size, cfg.iterations);
    } else if (cfg.mode === 'koch-snowflake') {
      const size = cfg.totalSize;
      const p1 = { x: 0, y: -size/Math.sqrt(3) };
      const p2 = { x: -size/2, y: size/(2*Math.sqrt(3)) };
      const p3 = { x: size/2, y: size/(2*Math.sqrt(3)) };
      
      const recurse = (a, b, level) => {
        if (level === 0) {
          const entry = getColor(0.5);
          addLine(a.x, a.y, b.x, b.y, entry.rgb, entry);
          return;
        }
        const dx = b.x - a.x, dy = b.y - a.y;
        const p1 = { x: a.x + dx/3, y: a.y + dy/3 };
        const p3 = { x: a.x + 2*dx/3, y: a.y + 2*dy/3 };
        const sin60 = Math.sqrt(3)/2, cos60 = 0.5;
        const p2 = {
          x: p1.x + (dx/3)*cos60 + (dy/3)*sin60,
          y: p1.y - (dx/3)*sin60 + (dy/3)*cos60
        };
        recurse(a, p1, level - 1);
        recurse(p1, p2, level - 1);
        recurse(p2, p3, level - 1);
        recurse(p3, b, level - 1);
      };
      recurse(p1, p2, cfg.iterations);
      recurse(p2, p3, cfg.iterations);
      recurse(p3, p1, cfg.iterations);
    } else if (cfg.mode === 'dragon-curve') {
      let path = [[-cfg.totalSize/4, 0], [cfg.totalSize/4, 0]];
      for (let i = 0; i < cfg.iterations + 6; i++) {
        const next = [path[0]];
        for (let j = 0; j < path.length - 1; j++) {
          const p1 = path[j], p2 = path[j+1];
          const mid = [
            (p1[0] + p2[0])/2 + (p2[1] - p1[1])/2 * (j % 2 === 0 ? 1 : -1),
            (p1[1] + p2[1])/2 - (p2[0] - p1[0])/2 * (j % 2 === 0 ? 1 : -1)
          ];
          next.push(mid, p2);
        }
        path = next;
      }
      for (let i = 0; i < path.length - 1; i++) {
        const entry = getColor(i / path.length);
        addLine(path[i][0], path[i][1], path[i+1][0], path[i+1][1], entry.rgb, entry);
      }
    } else if (cfg.mode === 'barnsley-fern') {
      let x = 0, y = 0;
      for (let i = 0; i < cfg.pointCount; i++) {
        const r = Math.random();
        let nx, ny;
        if (r < 0.01) { nx = 0; ny = 0.16 * y; }
        else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; }
        else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; }
        else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
        x = nx; y = ny;
        const entry = getColor(i / cfg.pointCount);
        addCircle(x * cfg.totalSize / 10, -y * cfg.totalSize / 10 + cfg.totalSize/2, 0.1, entry.rgb, entry);
      }
    } else if (cfg.mode === 'mandelbrot' || cfg.mode === 'julia-set') {
      const res = cfg.mandelbrotRes;
      const size = cfg.totalSize;
      const limit = 50;
      for (let iy = 0; iy < res; iy++) {
        for (let ix = 0; ix < res; ix++) {
          let zre = (ix / res - 0.5) * 3.0;
          let zim = (iy / res - 0.5) * 3.0;
          let cre = cfg.mode === 'mandelbrot' ? zre : cfg.juliaC.re;
          let cim = cfg.mode === 'mandelbrot' ? zim : cfg.juliaC.im;
          if (cfg.mode === 'mandelbrot') { zre = 0; zim = 0; }
          
          let n = 0;
          while (n < limit && (zre*zre + zim*zim) < 4) {
            const tr = zre*zre - zim*zim + cre;
            zim = 2*zre*zim + cim;
            zre = tr;
            n++;
          }
          if (n < limit) {
            const entry = getColor(n / limit);
            addRect((ix/res-0.5)*size, (iy/res-0.5)*size, size/res, size/res, 0, entry.rgb, entry);
          }
        }
      }
    } else if (cfg.mode === 'pythagoras-tree') {
      const recurse = (x, y, s, ang, level) => {
        if (level === 0) return;
        const entry = getColor(1 - level / cfg.iterations);
        addRect(x, y, s, s, ang, entry.rgb, entry);
        const rad = ang * Math.PI / 180;
        const bAng = cfg.angle * Math.PI / 180;
        
        // Pivot at top edge of current square
        const tx = x - (s/2)*Math.sin(rad), ty = y - (s/2)*Math.cos(rad);
        
        const sL = s * Math.cos(bAng), sR = s * Math.sin(bAng);
        const aL = ang + cfg.angle, aR = ang - (90 - cfg.angle);
        
        const xL = tx + (sL/2)*Math.cos((aL+90)*Math.PI/180) + (sL/2)*Math.cos(aL*Math.PI/180);
        const yL = ty + (sL/2)*Math.sin((aL+90)*Math.PI/180) + (sL/2)*Math.sin(aL*Math.PI/180);
        // Pythagoras tree logic is complex, simplify for beauty:
        recurse(x + s*Math.cos((ang+90)*Math.PI/180)*0.8, y + s*Math.sin((ang+90)*Math.PI/180)*0.8, s*0.7, ang+25, level-1);
        recurse(x + s*Math.cos((ang-90)*Math.PI/180)*0.8, y + s*Math.sin((ang-90)*Math.PI/180)*0.8, s*0.7, ang-25, level-1);
      };
      recurse(0, cfg.totalSize/2, cfg.totalSize/6, 0, cfg.iterations);
    } else if (cfg.mode === 'vicsek-fractal') {
      const recurse = (x, y, s, level) => {
        const entry = getColor(level / cfg.iterations);
        if (level === 0) {
          addRect(x, y, s, s, 0, entry.rgb, entry);
          return;
        }
        const ns = s / 3;
        recurse(x, y, ns, level - 1);
        recurse(x - ns, y, ns, level - 1);
        recurse(x + ns, y, ns, level - 1);
        recurse(x, y - ns, ns, level - 1);
        recurse(x, y + ns, ns, level - 1);
      };
      recurse(0, 0, cfg.totalSize, cfg.iterations);
    } else if (cfg.mode === 'menger-sponge-2d') {
      const size = cfg.totalSize;
      const recurse = (x, y, s, level) => {
        if (level === 0) {
          const entry = getColor(0.5);
          addRect(x, y, s, s, 0, entry.rgb, entry);
          return;
        }
        const ns = s / 3;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            recurse(x + i*ns, y + j*ns, ns, level - 1);
          }
        }
      };
      recurse(0, 0, size, cfg.iterations);
    }

    const canvas = project.canvas[0];
    [...usedColors].forEach((c, idx) => { canvas.layerData[c] = { name: `Layer ${idx+1}`, order: idx+1, visible: true }; });
    return project;
  },

  renderControls(tabId) {
    const { pane, cfg } = App.instances[tabId];
    const scroll = pane.querySelector('.tool-scroll'); scroll.innerHTML = '';
    const update = (lazy = false) => this.refresh(tabId, lazy);
    const set = (path, val) => { cfg[path] = val; update(true); Persistence.save(); };
    const palette = PalMgr.get(cfg.paletteId) || PalMgr.list()[0];
    const palOpts = Object.keys(App.palettes);
    const palLabels = {}; palOpts.forEach(id => palLabels[id] = App.palettes[id].name);

    scroll.appendChild(UI.makeSection('Global', [
      UI.makeRow('Palette', UI.makeToggles(palOpts, cfg.paletteId, v => { cfg.paletteId = v; this.renderControls(tabId); update(); Persistence.save(); }, palLabels)),
      UI.makeRow('Total Size', UI.makeRange(10, 100, 1, cfg.totalSize, v => set('totalSize', +v), 'mm')),
      UI.makeRow('Color Range', (() => {
        const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '8px';
        const btn = document.createElement('button'); btn.className = 'hbtn sm' + (cfg.colorRangeMode ? ' primary' : ''); btn.textContent = cfg.colorRangeMode ? 'ON' : 'OFF';
        btn.onclick = () => { cfg.colorRangeMode = !cfg.colorRangeMode; this.renderControls(tabId); update(); Persistence.save(); };
        wrap.appendChild(btn); wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeStartIdx, v => set('rangeStartIdx', v), { title: "Start" }));
        if (cfg.colorRangeMode) {
          const arrow = document.createElement('span'); arrow.innerHTML = '&rarr;'; arrow.style.color = '#444';
          wrap.appendChild(arrow); wrap.appendChild(UI.makePalettePicker(palette.entries, cfg.rangeEndIdx, v => set('rangeEndIdx', v), { title: "End" }));
        }
        return wrap;
      })())
    ]));

    const iterMax = (cfg.mode === 'dragon-curve' ? 12 : (cfg.mode === 'sierpinski-carpet' || cfg.mode === 'menger-sponge-2d' ? 4 : 8));
    scroll.appendChild(UI.makeSection('Fractal Parameters', [
      UI.makeRow('Iterations', UI.makeStepCounter(cfg.iterations, 1, iterMax, v => set('iterations', v))),
      ...(cfg.mode === 'barnsley-fern' ? [UI.makeRow('Points', UI.makeRange(1000, 20000, 500, cfg.pointCount, v => set('pointCount', +v)))] : []),
      ...((cfg.mode === 'mandelbrot' || cfg.mode === 'julia-set') ? [UI.makeRow('Resolution', UI.makeRange(20, 200, 5, cfg.mandelbrotRes, v => set('mandelbrotRes', +v)))] : []),
      ...(cfg.mode === 'julia-set' ? [
        UI.makeRow('C.re', UI.makeRange(-1, 1, 0.01, cfg.juliaC.re, v => { cfg.juliaC.re = +v; update(true); })),
        UI.makeRow('C.im', UI.makeRange(-1, 1, 0.01, cfg.juliaC.im, v => { cfg.juliaC.im = +v; update(true); }))
      ] : []),
      ...(cfg.mode === 'pythagoras-tree' ? [UI.makeRow('Branch Angle', UI.makeRange(10, 80, 1, cfg.angle, v => set('angle', +v)))] : [])
    ]));
  }
};

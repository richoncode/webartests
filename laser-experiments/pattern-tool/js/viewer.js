import { App } from './app.js';
import { XCSProject } from '../../xcs-module/js/xcs-system.js';
import { XCSCanvas } from '../../xcs-module/js/xcs-canvas.js';
import { PAD, XCS_LAYERS } from './constants.js';
import { svgEl, syntaxHL, dl } from './utils.js';

export const Popup = {
  show(ev, html) {
    let p = document.getElementById('globalPopup');
    if (!p) {
      p = document.createElement('div');
      p.id = 'globalPopup';
      p.className = 'popup';
      document.body.appendChild(p);
    }
    p.innerHTML = html;
    this.move(ev);
    p.classList.add('show');
  },
  move(ev) {
    const p = document.getElementById('globalPopup');
    if (!p || !ev) return;
    const pw = p.offsetWidth || 180, ph = p.offsetHeight || 130;
    let l = ev.clientX + 14, t = ev.clientY + 14;
    if (l + pw > window.innerWidth - 8) l = ev.clientX - pw - 10;
    if (t + ph > window.innerHeight - 8) t = ev.clientY - ph - 10;
    p.style.left = l + 'px';
    p.style.top = t + 'px';
  },
  hide() {
    const p = document.getElementById('globalPopup');
    if (p) p.classList.remove('show');
  }
};

export const XCSViewer = {
  create(tabId) {
    const v = document.createElement('div');
    v.className = 'xcs-viewer';
    v.innerHTML = `
      <div class="viewer-top">
        <div class="viewer-fname">Untitled.xcs</div>
        <div class="viewer-actions">
          <div class="btn-group">
            <button class="hbtn export-xcs-btn">Export XCS</button>
            <button class="hbtn export-pal-btn">Export Palette</button>
          </div>
        </div>
      </div>
      <div class="viewer-main">
        <div class="canvas-panel">
          <div class="canvas-label">Laser Area: 100 × 100 mm</div>
          <svg class="svg-canvas" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.1"/>
              </pattern>
            </defs>
            <g class="canvas-root">
              <rect width="100" height="100" fill="url(#grid)" />
              <g class="svg-content"></g>
            </g>
          </svg>
        </div>
        <div class="right-info-panel">
          <div class="right-tabs">
            <button class="rtab active" data-tab="shapes">Shapes</button>
            <button class="rtab" data-tab="palette">Palette</button>
            <button class="rtab" data-tab="process">Process</button>
            <button class="rtab" data-tab="json">JSON</button>
          </div>
          <div class="panel-body">
            <div class="right-pane active" data-pane="shapes">
              <div class="list-header shapes-hdr">Shapes (0)</div>
              <div class="shape-list shapes-body"></div>
            </div>
            <div class="right-pane" data-pane="palette">
              <div class="list-header">Unique Parameters</div>
              <div class="pal-list pal-body"></div>
            </div>
            <div class="right-pane" data-pane="process">
              <div class="list-header">Processing Order</div>
              <div class="shape-list process-tree" style="padding:10px"></div>
            </div>
            <div class="right-pane" data-pane="json">
              <div class="json-scroll">
                <pre class="json-code"></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="stats-bar">
        <div class="stat s-shapes"><strong>0</strong> shapes</div>
        <div class="stat s-power">Power: -</div>
        <div class="stat s-speed">Speed: -</div>
        <div class="stat s-density">Density: -</div>
      </div>
    `;

    const q = s => v.querySelector(s);
    const inst = App.instances[tabId];
    
    // Initialize unified XCSCanvas for this viewer instance
    inst.xcsCanvas = new XCSCanvas(
      q('.svg-canvas'),
      q('.svg-content'),
      document.getElementById('globalPopup'), // Pattern tool uses globalPopup
      { bedWidth: 100, bedHeight: 100 }
    );

    // Override hover behavior to sync with Pattern Tool's sidebar and Popup
    inst.xcsCanvas.onItemEnter = (item, el, ev) => {
      this.onHover(v, inst.state, item.idx, ev);
    };
    inst.xcsCanvas.onItemLeave = () => {
      this.onLeave(v);
    };
    
    v.querySelectorAll('.rtab').forEach(t => {
      t.onclick = () => {
        const wasJSON = v.querySelector('.rtab.active')?.dataset.tab === 'json';
        v.querySelectorAll('.rtab, .right-pane').forEach(el => el.classList.remove('active'));
        t.classList.add('active');
        q(`.right-pane[data-pane="${t.dataset.tab}"]`).classList.add('active');
        
        // If switched TO json, render it now
        if (t.dataset.tab === 'json' && !wasJSON) {
          this.renderJSON(v, App.instances[tabId].state);
        }
      };
    });

    q('.shapes-body').addEventListener('click', e => {
      const row = e.target.closest('.shape-row');
      if (row) {
        const idx = +row.dataset.idx;
        const isJSONVisible = q('.rtab[data-tab="json"]').classList.contains('active');
        if (isJSONVisible) {
          const block = q(`.json-display-block[data-idx="${idx}"]`);
          if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this.onHover(v, App.instances[tabId].state, idx, e);
      }
    });

    q('.svg-canvas').addEventListener('click', e => {
      const el = e.target.closest('[data-svg-idx]');
      if (el) {
        const idx = +el.getAttribute('data-svg-idx');
        const isJSONVisible = q('.rtab[data-tab="json"]').classList.contains('active');
        if (isJSONVisible) {
          const block = q(`.json-display-block[data-idx="${idx}"]`);
          if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this.onHover(v, App.instances[tabId].state, idx, e);
      }
    });

    q('.json-code').addEventListener('click', e => {
      const b = e.target.closest('.json-display-block');
      if (b) {
        const idx = +b.dataset.idx;
        // Don't switch tab automatically, but sync selection
        const row = q(`.shape-row[data-idx="${idx}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.onHover(v, App.instances[tabId].state, idx, e);
      }
    });

    const svg = q('.svg-canvas');
    const state = App.instances[tabId].state;
    const getSVGPoint = (clientX, clientY) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      return pt.matrixTransform(ctm ? ctm.inverse() : null);
    };

    if (!state.view) state.view = { scale: 1, x: 0, y: 0 };

    let isPanning = false;
    let isSpaceDown = false;
    let lastMouse = { x: 0, y: 0 };
    let lastTouchDist = 0;
    let lastTouchMid = { x: 0, y: 0 };

    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && (e.target === document.body || e.target === svg)) {
        isSpaceDown = true;
        svg.style.cursor = 'grab';
      }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space') {
        isSpaceDown = false;
        svg.style.cursor = 'default';
      }
    });

    svg.oncontextmenu = e => { isPanning && e.preventDefault(); };

    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = Math.pow(1.1, delta / 100);
      
      const p = getSVGPoint(e.clientX, e.clientY);

      // Zoom towards mouse point
      const newScale = Math.max(0.1, Math.min(20, state.view.scale * factor));
      const actualFactor = newScale / state.view.scale;

      state.view.x = p.x - (p.x - state.view.x) * actualFactor;
      state.view.y = p.y - (p.y - state.view.y) * actualFactor;
      state.view.scale = newScale;

      this.applyTransform(v, state);
    }, { passive: false });

    svg.addEventListener('mousedown', e => {
      const isBg = e.target === svg || e.target.classList.contains('canvas-root') || e.target.tagName === 'rect';
      const canPan = (e.button === 1 || e.button === 2 || (e.button === 0 && (isSpaceDown || isBg || e.altKey || e.shiftKey || e.metaKey)));
      
      if (canPan) {
        isPanning = true;
        lastMouse = { x: e.clientX, y: e.clientY };
        svg.style.cursor = 'grabbing';
      }
    });

    svg.addEventListener('mouseup', e => {
      if (isPanning && e.button === 2) {
        e.preventDefault(); // Final suppression
      }
    });

    window.addEventListener('mousemove', e => {
      if (!isPanning) return;
      const p = getSVGPoint(e.clientX, e.clientY);
      const pLast = getSVGPoint(lastMouse.x, lastMouse.y);
      state.view.x += (p.x - pLast.x);
      state.view.y += (p.y - pLast.y);
      lastMouse = { x: e.clientX, y: e.clientY };
      this.applyTransform(v, state);
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      svg.style.cursor = 'default';
    });

    svg.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        lastTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        lastTouchMid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      } else if (e.touches.length === 1) {
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    svg.addEventListener('touchmove', e => {
      if (e.touches.length === 2 || e.touches.length === 1) e.preventDefault();
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const mid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        
        const factor = dist / lastTouchDist;
        const newScale = Math.max(0.1, Math.min(20, state.view.scale * factor));
        const actualFactor = newScale / state.view.scale;

        const pMid = getSVGPoint(mid.x, mid.y);
        const pMidLast = getSVGPoint(lastTouchMid.x, lastTouchMid.y);

        state.view.x = pMid.x - (pMid.x - state.view.x) * actualFactor + (pMid.x - pMidLast.x);
        state.view.y = pMid.y - (pMid.y - state.view.y) * actualFactor + (pMid.y - pMidLast.y);
        state.view.scale = newScale;

        lastTouchDist = dist;
        lastTouchMid = mid;
        this.applyTransform(v, state);
      } else if (e.touches.length === 1) {
        const p = getSVGPoint(e.touches[0].clientX, e.touches[0].clientY);
        const pLast = getSVGPoint(lastMouse.x, lastMouse.y);
        state.view.x += (p.x - pLast.x);
        state.view.y += (p.y - pLast.y);
        lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.applyTransform(v, state);
      }
    }, { passive: false });

    svg.addEventListener('dblclick', () => {
      state.view = { scale: 1, x: 0, y: 0 };
      this.applyTransform(v, state);
    });

    q('.export-xcs-btn').onclick = () => {
      const inst = App.instances[tabId];
      const data = inst.state.project ? inst.state.project.toJSON() : inst.state.rawData;
      dl(v.querySelector('.viewer-fname').textContent + '.xcs', JSON.stringify(data), 'application/json');
    };
    q('.export-pal-btn').onclick = () => this.exportPaletteSummary(tabId);

    return v;
  },

  update(v, state) {
    const inst = Object.values(App.instances).find(i => i.pane.contains(v));
    if (!inst || !state.project) return;

    state.renderedShapes = state.project.getItems().map(item => item.getRenderProps());

    // Delegate rendering to the unified XCSCanvas
    inst.xcsCanvas.render(state.project);

    this.applyTransform(v, state);
    this.renderStats(v, state);
    this.renderList(v, state);
    this.renderPalette(v, state);
    this.renderProcessTree(v, state);
    
    // Performance: Only render JSON if tab is visible
    if (v.querySelector('.rtab[data-tab="json"]').classList.contains('active')) {
      this.renderJSON(v, state);
    } else {
      v.querySelector('.json-code').innerHTML = ''; // Clear stale heavy DOM
    }
  },

  applyTransform(v, state) {
    const content = v.querySelector('.canvas-root');
    if (content && state.view) {
      content.setAttribute('transform', `translate(${state.view.x}, ${state.view.y}) scale(${state.view.scale})`);
    }
  },

  renderList(v, state) {
    const list = v.querySelector('.shapes-body');
    const shapes = state.renderedShapes || [];
    v.querySelector('.shapes-hdr').textContent = `Shapes (${shapes.length})`;
    list.innerHTML = '';
    shapes.forEach(s => {
      const row = document.createElement('div');
      row.className = 'shape-row';
      row.dataset.idx = s.idx;
      const lIdx = XCS_LAYERS.indexOf(s.layerColor?.toLowerCase());
      const layerTag = lIdx !== -1 ? `<span class="shape-layer-tag">L${lIdx+1}</span>` : '';
      row.innerHTML = `
        <div class="shape-dot" style="background:${s.layerColor}"></div>
        <div class="shape-info">
          <div class="shape-row-title">${layerTag} ${s.type} ${s.w.toFixed(1)}×${s.h.toFixed(1)}mm</div>
          <div class="shape-row-sub">${s.power}% / ${s.speed} / ${s.density}</div>
        </div>
      `;
      row.onmouseenter = ev => this.onHover(v, state, s.idx, ev);
      row.onmouseleave = () => this.onLeave(v);
      list.appendChild(row);
    });
  },

  renderJSON(v, state) {
    let raw;
    const projectObj = state.project ? state.project.toJSON() : state.rawData;
    try {
      raw = JSON.stringify(projectObj, null, 2);
    } catch(e) { 
      v.querySelector('.json-code').textContent = "Data too large to display.";
      return; 
    }
    
    const positions = [];
    const shapes = state.renderedShapes || [];
    
    shapes.forEach(s => {
      const needle = `"id": "${s.id}"`;
      const pos = raw.indexOf(needle);
      if (pos === -1) return;
      let start = raw.lastIndexOf('{', pos), depth = 1, i = start+1;
      while (i < raw.length && depth > 0) { if (raw[i]==='{') depth++; else if (raw[i]==='}') depth--; i++; }
      positions.push({id:s.id, start, end:i, type:'geo', idx:s.idx});
    });

    const findNodes = (obj, path='') => {
      if (obj && typeof obj === 'object') {
        if (obj.id || obj.processingType) {
          const needle = obj.id ? `"id": "${obj.id}"` : `"processingType": "${obj.processingType}"`;
          const pos = raw.indexOf(needle);
          if (pos !== -1) {
            let start = raw.lastIndexOf('{', pos), depth = 1, i = start+1;
            while (i < raw.length && depth > 0) { if (raw[i]==='{') depth++; else if (raw[i]==='}') depth--; i++; }
            positions.push({id:obj.id||obj.processingType, start, end:i, type:'proc'});
          }
        }
        Object.keys(obj).forEach(k => findNodes(obj[k], path ? `${path}.${k}` : k));
      }
    };
    findNodes(projectObj.device);

    positions.sort((a,b) => a.start-b.start);
    let html = '', cursor = 0;
    for (const p of positions) {
      if (p.start < cursor) continue;
      html += syntaxHL(raw.slice(cursor, p.start));
      const attr = p.type==='geo' ? `data-idx="${p.idx}"` : `data-node-id="${p.id}"`;
      html += `<span class="json-display-block" ${attr}>${syntaxHL(raw.slice(p.start, p.end))}</span>`;
      cursor = p.end;
    }
    html += syntaxHL(raw.slice(cursor));
    v.querySelector('.json-code').innerHTML = html;
  },

  renderPalette(v, state) {
    const body = v.querySelector('.pal-body');
    body.innerHTML = '';
    const combos = state.project ? state.project.getSummary() : [];
    combos.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'pal-row';
      row.innerHTML = `
        <div class="pal-row-top">
          <div class="pal-id">LAYER ${i+1}</div>
          <div class="pal-count">${c.count}</div>
        </div>
        <div class="pal-params">
          <span>P: <span class="pal-v">${c.power}%</span></span>
          <span>S: <span class="pal-v">${c.speed}</span><span class="pal-u">mm/s</span></span>
          <span>D: <span class="pal-v">${c.density}</span></span>
        </div>
        <div class="pal-types">${[...c.types].join(', ')}</div>
      `;
      body.appendChild(row);
    });
  },

  renderProcessTree(v, state) {
    const list = v.querySelector('.process-tree');
    list.innerHTML = '';
    const projectObj = state.project ? state.project.toJSON() : state.rawData;
    const build = (obj, depth=0) => {
      if (!obj || typeof obj !== 'object' || depth > 10) return;
      Object.entries(obj).forEach(([k, val]) => {
        if (val && typeof val === 'object') {
          const id = val.id || val.processingType;
          if (id) {
            const item = document.createElement('div');
            item.className = 'process-item';
            item.style.paddingLeft = (depth * 12) + 'px';
            item.innerHTML = `<span class="p-key">${k}:</span> <span class="p-id">${id}</span>`;
            item.dataset.nodeId = id;
            list.appendChild(item);
          }
          build(val, depth + 1);
        }
      });
    };
    build(projectObj.device);
  },

  renderStats(v, state) {
    const shapes = state.renderedShapes || [];
    const formatRange = (label, vals, unit) => {
      if (!vals.length) return '';
      const sorted = [...new Set(vals)].sort((a,b) => a-b);
      if (sorted.length === 1) return `${label}: <strong>${sorted[0]} ${unit}</strong>`;
      return `${label}: <strong>${sorted[0]}–${sorted[sorted.length-1]} ${unit}</strong>`;
    };
    const powers = shapes.map(s => s.power).filter(v => v != null);
    const speeds = shapes.map(s => s.speed).filter(v => v != null);
    const dens = shapes.map(s => s.density).filter(v => v != null);
    
    v.querySelector('.s-shapes').innerHTML = `<strong>${shapes.length}</strong> shapes`;
    v.querySelector('.s-power').innerHTML = formatRange('Power', powers, '%');
    v.querySelector('.s-speed').innerHTML = formatRange('Speed', speeds, 'mm/s');
    v.querySelector('.s-density').innerHTML = formatRange('Density', dens, '');
  },

  onHover(v, state, idx, ev) {
    const shapes = state.renderedShapes || [];
    const s = shapes.find(x => x.idx === idx);
    if (!s) return;
    v.querySelectorAll('.shape-row, .json-display-block, [data-svg-idx]').forEach(el => el.classList.remove('hl', 'hover', 'json-hl'));
    const row = v.querySelector(`.shape-row[data-idx="${idx}"]`);
    if (row) row.classList.add('hl');
    const block = v.querySelector(`.json-display-block[data-idx="${idx}"]`);
    if (block) block.classList.add('json-hl');
    const svgEl = v.querySelector(`[data-svg-idx="${idx}"]`);
    if (svgEl) svgEl.classList.add('hover');

    const laserLabel = (s.laser === 'red' || s.laser === 'ir') ? 'IR' : 'Blue';
    const procMode = s.processingType 
      ? s.processingType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      : (s.isFill ? 'Fill' : 'Score');

    const html = `
      <div class="popup-title">${s.paletteName || 'Shape'} - ${s.typeOverride || s.colorName || s.type}</div>
      <div class="popup-row"><span class="popup-key">Mode</span><span class="popup-val hi">${procMode}</span></div>
      <div class="popup-row"><span class="popup-key">Power</span><span class="popup-val hi">${s.power}% (${laserLabel})</span></div>
      <div class="popup-row"><span class="popup-key">Pos (X,Y)</span><span class="popup-val">${s.x.toFixed(2)}, ${s.y.toFixed(2)} mm</span></div>
      <div class="popup-row"><span class="popup-key">Speed</span><span class="popup-val">${s.speed}mm/s</span></div>
      <div class="popup-row"><span class="popup-key">Density</span><span class="popup-val">${s.density}</span></div>
      <div class="popup-row"><span class="popup-key">Size</span><span class="popup-val">${s.w.toFixed(3)}x${s.h.toFixed(3)}mm</span></div>
      ${s.text ? `<div class="popup-row"><span class="popup-key">Text</span><span class="popup-val hi">${s.text}</span></div>` : ''}
      ${s.ditherPct != null ? `<div class="popup-row"><span class="popup-key">Dither</span><span class="popup-val">${s.ditherPct}%</span></div>` : ''}
      ${s.t !== null ? `<div class="popup-row" style="margin-top:4px; opacity:0.5; font-size:9px"><span class="popup-key">Normalized (t)</span><span class="popup-val">${s.t.toFixed(4)}</span></div>` : ''}
    `;
    Popup.show(ev, html);
  },

  onLeave(v) {
    v.querySelectorAll('.shape-row, .json-display-block, [data-svg-idx]').forEach(el => el.classList.remove('hl', 'hover', 'json-hl'));
    Popup.hide();
  },

  exportPaletteSummary(tabId) {
    const inst = App.instances[tabId];
    const combos = inst.state.project ? inst.state.project.getSummary() : [];
    const name = (App.tabs.find(t => t.id === tabId)?.label || 'Palette') + '-Summary.txt';
    let lines = [`Palette Summary for ${inst.pane.querySelector('.viewer-fname').textContent}`, `Generated: ${new Date().toLocaleString()}`, ''];
    lines.push(` ID | Power  | Speed    | Density   | Repeat | Count | Types`);
    lines.push(`----|--------|----------|-----------|--------|-------|-------`);
    combos.forEach((c, i) => {
      lines.push(` ${String(i+1).padStart(2)} | ${String(c.power).padEnd(6)} | ${String(c.speed).padEnd(8)} | ${String(c.density).padEnd(9)} | ${String(c.repeat).padEnd(6)} | ${String(c.count).padEnd(5)} | ${[...c.types].join(', ')}`);
    });
    dl(name, lines.join('\n'), 'text/plain');
  }
};

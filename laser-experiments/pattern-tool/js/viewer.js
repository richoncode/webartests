/**
 * Pattern Tool Viewer - VANTAGE-ALPHA Baseline
 * Synced to Left-Baseline Alphabetic rendering.
 */
import { App } from './app.js';
import { PAD } from './constants.js';
import { svgEl, syntaxHL, dl } from './utils.js';
import { XCSIR } from './xcs-ir.js';

export const Popup = {
  show(ev, html) {
    let p = document.getElementById('globalPopup');
    if (!p) {
      p = document.createElement('div');
      p.id = 'globalPopup';
      p.className = 'ui-popup';
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
      <div class="viewer-header">
        <div class="viewer-fname">Untitled.xcs</div>
        <div class="viewer-actions">
          <button class="hbtn export-xcs-btn">Export XCS</button>
          <button class="hbtn export-pal-btn">Export Palette</button>
        </div>
      </div>
      <div class="viewer-layout">
        <div class="viewer-main">
          <div class="canvas-container">
            <div class="canvas-label">Laser Area: 100 × 100 mm</div>
            <svg class="svg-canvas" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet">
              <!-- Grid -->
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
                </pattern>
              </defs>
              <rect width="500" height="500" fill="url(#grid)" />
              <g class="svg-content"></g>
            </svg>
          </div>
          <div class="viewer-stats">
            <div class="stat-pill s-shapes"><strong>0</strong> shapes</div>
            <div class="stat-pill s-power">Power: -</div>
            <div class="stat-pill s-speed">Speed: -</div>
            <div class="stat-pill s-density">Density: -</div>
          </div>
        </div>
        <div class="viewer-side">
          <div class="right-tabs">
            <div class="rtab active" data-tab="shapes">Shapes</div>
            <div class="rtab" data-tab="palette">Palette</div>
            <div class="rtab" data-tab="process">Process</div>
            <div class="rtab" data-tab="json">JSON</div>
          </div>
          <div class="right-pane active" data-pane="shapes">
            <div class="shapes-hdr">Shapes (0)</div>
            <div class="shapes-body"></div>
          </div>
          <div class="right-pane" data-pane="palette">
            <div class="pal-body"></div>
          </div>
          <div class="right-pane" data-pane="process">
            <div class="process-tree"></div>
          </div>
          <div class="right-pane" data-pane="json">
            <pre class="json-code"></pre>
          </div>
        </div>
      </div>
    `;

    const q = s => v.querySelector(s);
    
    // Tab switching
    v.querySelectorAll('.rtab').forEach(t => {
      t.onclick = () => {
        v.querySelectorAll('.rtab, .right-pane').forEach(el => el.classList.remove('active'));
        t.classList.add('active');
        q(`.right-pane[data-pane="${t.dataset.tab}"]`).classList.add('active');
      };
    });

    // Interaction setup
    q('.shapes-body').addEventListener('click', e => {
      const row = e.target.closest('.shape-row');
      if (row) {
        const idx = +row.dataset.idx;
        q('.rtab[data-tab="json"]').click();
        const block = q(`.json-display-block[data-idx="${idx}"]`);
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.onHover(v, App.instances[tabId].state, idx, e);
      }
    });

    q('.svg-canvas').addEventListener('click', e => {
      const el = e.target.closest('[data-svg-idx]');
      if (el) {
        const idx = +el.getAttribute('data-svg-idx');
        q('.rtab[data-tab="json"]').click();
        const block = q(`.json-display-block[data-idx="${idx}"]`);
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.onHover(v, App.instances[tabId].state, idx, e);
      }
    });

    q('.json-code').addEventListener('click', e => {
      const b = e.target.closest('.json-display-block');
      if (b) {
        const idx = +b.dataset.idx;
        q('.rtab[data-tab="shapes"]').click();
        const row = q(`.shape-row[data-idx="${idx}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.onHover(v, App.instances[tabId].state, idx, e);
      }
    });

    q('.export-xcs-btn').onclick = () => dl(v.querySelector('.viewer-fname').textContent + '.xcs', JSON.stringify(App.instances[tabId].state.rawData), 'application/json');
    q('.export-pal-btn').onclick = () => this.exportPaletteSummary(tabId);

    return v;
  },

  update(v, state, lazy = false) {
    this.renderSVG(v, state);
    this.renderStats(v, state);
    
    // Performance: Skip heavy UI tabs if lazy and dataset is huge
    if (lazy && state.shapes.length > 2000) {
      v.querySelector('.shapes-body').innerHTML = '<div style="padding:20px; color:#666;">UI limited for performance. Toggle a control to refresh full view.</div>';
      v.querySelector('.json-code').innerHTML = '';
      return;
    }

    this.renderList(v, state);
    this.renderPalette(v, state);
    this.renderProcessTree(v, state);
    this.renderJSON(v, state);
  },

  renderSVG(v, state) {
    const svg = v.querySelector('.svg-content');
    svg.innerHTML = '';
    const sc = 5; // 100mm -> 500px
    const mm2 = (x, y) => [x * sc, y * sc];

    state.shapes.forEach(s => {
      const isFill = s.processingType === 'VECTOR_ENGRAVING' || s.processingType === 'BITMAP_ENGRAVING';
      const renderColor = s.layerColor === '#000000' && isFill ? '#333' : s.layerColor;
      const strC = isFill ? 'none' : renderColor;
      const strW = isFill ? 0 : 1;
      const fillOp = isFill ? 0.6 : 0;
      const [cx, cy] = mm2(s.x, s.y);
      const rw = s.w * sc, rh = s.h * sc;

      let el;
      if (s.type === 'RECT') {
        el = svgEl('rect', {
          x: cx - rw/2, y: cy - rh/2, width: rw, height: rh, 
          fill: isFill ? renderColor : 'none', 'fill-opacity': fillOp,
          stroke: strC, 'stroke-width': strW
        });
        if (s.angle) el.setAttribute('transform', `rotate(${s.angle}, ${cx}, ${cy})`);
      } 
      else if (s.type === 'CIRCLE') {
        el = svgEl('circle', {
          cx, cy, r: rw/2, 
          fill: isFill ? renderColor : 'none', 'fill-opacity': fillOp,
          stroke: strC, 'stroke-width': strW
        });
      }
      else if (s.type==='PATH' && s.dPath) {
        const scaledD = s.dPath.replace(/([ML])\s*([\d.-]+)[,\s]+([\d.-]+)/g, (m, cmd, px, py) => {
          const [sx, sy] = mm2(+px, +py);
          return `${cmd} ${sx.toFixed(2)} ${sy.toFixed(2)}`;
        });
        el = svgEl('path', {
          d: scaledD, fill: isFill ? renderColor : 'none', 
          'fill-opacity': fillOp, stroke: strC, 'stroke-width': strW
        });
      }
      else if (s.type === 'IMAGE') {
        el = svgEl('rect', {
          x: cx - rw/2, y: cy - rh/2, width: rw, height: rh, 
          fill: 'rgba(255,255,255,0.1)', stroke: '#666', 'stroke-width': 1, 'stroke-dasharray': '2 2'
        });
      }

      if (el) {
        el.dataset.svgIdx = s.idx;
        el.style.cursor = 'pointer';
        el.addEventListener('mouseenter', ev => this.onHover(v, state, s.idx, ev));
        el.addEventListener('mousemove',  ev => Popup.move(ev));
        el.addEventListener('mouseleave', () => this.onLeave(v));
        svg.appendChild(el);
      }
    });
  },

  renderList(v, state) {
    const list = v.querySelector('.shapes-body');
    v.querySelector('.shapes-hdr').textContent = `Shapes (${state.shapes.length})`;
    list.innerHTML = '';
    
    // UI Cap for performance
    const maxItems = 500;
    const items = state.shapes.slice(0, maxItems);
    
    items.forEach(s => {
      const row = document.createElement('div');
      row.className = 'shape-row';
      row.dataset.idx = s.idx;
      row.innerHTML = `
        <div class="shape-swatch" style="background:${s.layerColor}"></div>
        <div class="shape-info">
          <div class="shape-type">${s.type} ${s.w.toFixed(1)}×${s.h.toFixed(1)}mm</div>
          <div class="shape-params">${s.power}% / ${s.speed} / ${s.density}</div>
        </div>
      `;
      row.onmouseenter = ev => this.onHover(v, state, s.idx, ev);
      row.onmouseleave = () => this.onLeave(v);
      list.appendChild(row);
    });

    if (state.shapes.length > maxItems) {
      const more = document.createElement('div');
      more.style.padding = '10px'; more.style.color = '#666'; more.style.fontSize = '11px';
      more.textContent = `... and ${state.shapes.length - maxItems} more shapes (view disabled for performance)`;
      list.appendChild(more);
    }
  },

  renderJSON(v, state) {
    const code = v.querySelector('.json-code');
    code.innerHTML = '';

    // Safeguard for very large datasets
    if (state.shapes.length > 2000) {
      code.innerHTML = `<div class="json-display-block" style="color:#666; font-style:italic; padding:20px;">
        JSON preview disabled for large datasets (${state.shapes.length} shapes). 
        Export XCS to view full raw data.
      </div>`;
      return;
    }

    let raw;
    try {
      raw = JSON.stringify(state.rawData, null, 2);
    } catch (e) {
      code.innerHTML = `<div class="json-display-block" style="color:#f87171; padding:20px;">Data too large to stringify.</div>`;
      return;
    }

    const positions = [];
    state.shapes.forEach(s => {
      const needle = `"id": "${s.id}"`;
      const pos = raw.indexOf(needle);
      if (pos === -1) return;
      let start = raw.lastIndexOf('{', pos), depth = 1, i = start+1;
      while (i < raw.length && depth > 0) { if (raw[i]==='{') depth++; else if (raw[i]==='}') depth--; i++; }
      positions.push({id:s.id, start, end:i, type:'geo', idx:s.idx});
    });

    positions.sort((a,b) => a.start - b.start);
    let html = '', cursor = 0;
    for (const p of positions) {
      if (p.start < cursor) continue;
      html += syntaxHL(raw.slice(cursor, p.start));
      const attr = p.type==='geo' ? `data-idx="${p.idx}"` : `data-node-id="${p.id}"`;
      html += `<span class="json-display-block" ${attr}>${syntaxHL(raw.slice(p.start, p.end))}</span>`;
      cursor = p.end;
    }
    html += syntaxHL(raw.slice(cursor));
    code.innerHTML = html;
  },

  renderPalette(v, state) {
    const body = v.querySelector('.pal-body');
    body.innerHTML = '';
    const combos = this.getUniqueCombos(state);
    combos.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'pal-row';
      row.innerHTML = `
        <div class="pal-idx">${i+1}</div>
        <div class="pal-vals">
          <span>P: <strong>${c.power}%</strong></span>
          <span>S: <strong>${c.speed}</strong></span>
          <span>D: <strong>${c.density}</strong></span>
        </div>
        <div class="pal-count">${c.count}</div>
      `;
      body.appendChild(row);
    });
  },

  renderProcessTree(v, state) {
    const list = v.querySelector('.process-tree');
    list.innerHTML = '';
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
    build(state.rawData.device);
  },

  getUniqueCombos(state) {
    const combos = new Map();
    state.shapes.forEach(s => {
      const key = `${s.power}|${s.speed}|${s.density}|${s.repeat}|${s.laser}`;
      if (!combos.has(key)) combos.set(key, {power:s.power, speed:s.speed, density:s.density, repeat:s.repeat, laser:s.laser, count:0, types:new Set()});
      const c = combos.get(key); c.count++; c.types.add(s.type);
    });
    return [...combos.values()];
  },

  renderStats(v, state) {
    const { shapes } = state;
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
    const s = state.shapes.find(x => x.idx === idx);
    if (!s) return;
    v.querySelectorAll('.shape-row, .json-display-block').forEach(el => el.classList.remove('hover'));
    const row = v.querySelector(`.shape-row[data-idx="${idx}"]`);
    if (row) row.classList.add('hover');
    const block = v.querySelector(`.json-display-block[data-idx="${idx}"]`);
    if (block) block.classList.add('hover');
    
    const svgEl = v.querySelector(`[data-svg-idx="${idx}"]`);
    if (svgEl) svgEl.classList.add('hover');

    const html = `
      <div class="pop-title">${s.paletteName || 'Shape'} - ${s.colorName || s.type}</div>
      <div class="pop-grid">
        <span>Power:</span> <strong>${s.power}%</strong>
        <span>Speed:</span> <strong>${s.speed}</strong>
        <span>Density:</span> <strong>${s.density}</strong>
        <span>Size:</span> <strong>${s.w.toFixed(2)}x${s.h.toFixed(2)}mm</strong>
      </div>
    `;
    Popup.show(ev, html);
  },

  onLeave(v) {
    v.querySelectorAll('.shape-row, .json-display-block, [data-svg-idx]').forEach(el => el.classList.remove('hover'));
    Popup.hide();
  },

  exportPaletteSummary(tabId) {
    const inst = App.instances[tabId];
    const combos = this.getUniqueCombos(inst.state);
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

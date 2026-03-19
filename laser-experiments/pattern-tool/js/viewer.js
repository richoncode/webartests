import { App } from './app.js';
import { PAD } from './constants.js';
import { svgEl, syntaxHL, dl } from './utils.js';

export const Popup = {
  show(s, ev) {
    const p = document.getElementById('globalPopup');
    const displayType = s.type === 'IMAGE' ? 'BITMAP' : s.type;
    document.getElementById('gpTitle').textContent   = `${displayType} #${s.idx+1}`;
    document.getElementById('gpPower').textContent   = s.power   != null ? s.power   + ' pwr%'   : '—';
    const speedUnit = (s.type === 'IMAGE' || s.isGrayscaleGradient) ? ' ms' : ' mm/s';
    document.getElementById('gpSpeed').textContent   = s.speed   != null ? s.speed   + speedUnit   : '—';
    const densityUnit = (s.type === 'IMAGE' || s.isGrayscaleGradient) ? ' DPI' : ' lpcm';
    document.getElementById('gpDensity').textContent = s.density != null ? s.density + densityUnit : '—';
    document.getElementById('gpRepeat').textContent  = s.repeat;
    document.getElementById('gpRepeatRow').style.display = s.repeat > 1 ? 'flex' : 'none';
    
    // Text properties
    const isText = s.type === 'TEXT';
    document.getElementById('gpTextRow').style.display = isText ? 'flex' : 'none';
    document.getElementById('gpFontRow').style.display = isText ? 'flex' : 'none';
    document.getElementById('gpStyleRow').style.display = isText ? 'flex' : 'none';
    
    if (isText) {
      document.getElementById('gpText').textContent = s.text || '—';
      document.getElementById('gpFont').textContent = s.style?.fontFamily || 'Lato';
      document.getElementById('gpStyle').textContent = `${s.style?.fontSize || 12}pt ${s.style?.fontSubfamily || 'Regular'}`;
    }

    document.getElementById('gpSize').textContent    = `${s.w.toFixed(1)} × ${s.h.toFixed(1)} mm`;
    document.getElementById('gpPos').textContent     = `${s.x.toFixed(1)}, ${s.y.toFixed(1)} mm`;

    const cellRow = document.getElementById('gpCellRow');
    if (s.ix != null && s.iy != null) {
      document.getElementById('gpCell').textContent = `[${s.ix}, ${s.iy}]`;
      cellRow.style.display = 'flex';
    } else {
      cellRow.style.display = 'none';
    }

    this.move(ev); p.classList.add('show');
  },
  move(ev) {
    const p = document.getElementById('globalPopup');
    const pw = p.offsetWidth||180, ph = p.offsetHeight||130;
    let l = ev.clientX+14, t = ev.clientY+14;
    if (l+pw > innerWidth-8) l = ev.clientX-pw-10;
    if (t+ph > innerHeight-8) t = ev.clientY-ph-10;
    p.style.left = l+'px'; p.style.top = t+'px';
  },
  hide() { document.getElementById('globalPopup').classList.remove('show'); }
};

// ═══════════════════════════════════════════════════════════════════
// XCS VIEWER
// Renders the Internal Representation (IR) of XCS data.
// WAIT, ASK, and CONFIRM for any features not supported in xcsformat.md.
// ═══════════════════════════════════════════════════════════════════
export const XCSViewer = {
  create(tabId) {
    const viewer = document.createElement('div');
    viewer.className = 'xcs-viewer';
    viewer.innerHTML = `
      <div class="viewer-top">
        <span class="viewer-fname"></span>
        <div class="btn-group">
          <button class="hbtn info-toggle-btn">Info</button>
          <button class="hbtn export-xcs-btn" disabled>Export XCS</button>
          <button class="hbtn primary export-pal-btn" disabled>Export Palette</button>
        </div>
      </div>
      <div class="viewer-main">
        <div class="canvas-panel">
          <svg class="svg-canvas" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="canvas-label"></div>
        </div>
        <div class="right-info-panel">
          <div class="right-tabs">
            <button class="rtab active" data-tab="shapes">Shapes</button>
            <button class="rtab" data-tab="palette">Palette</button>
            <button class="rtab" data-tab="process">Process</button>
            <button class="rtab" data-tab="json">JSON</button>
            <button class="rtab mobile-close" style="margin-left:auto;color:#e07070">✕ Close</button>
          </div>
          <div class="panel-body shapes-body">
            <div class="list-header shapes-hdr">Shapes</div>
            <div class="shape-list"></div>
          </div>
          <div class="panel-body palette-body" style="display:none">
            <div class="list-header pal-hdr">Unique Settings</div>
            <div class="pal-list"></div>
          </div>
          <div class="panel-body process-body" style="display:none">
            <div class="list-header proc-hdr">Processing Tree</div>
            <div class="process-tree"></div>
          </div>
          <div class="panel-body json-body" style="display:none">
            <div class="json-scroll"><pre class="json-code"></pre></div>
          </div>
        </div>
      </div>
      <div class="stats-bar">
        <div class="stat s-shapes"></div><div class="stat s-type"></div>
        <div class="stat s-power"></div><div class="stat s-speed"></div><div class="stat s-density"></div>
      </div>`;

    const q = s => viewer.querySelector(s);
    
    // Info panel toggle
    q('.info-toggle-btn').addEventListener('click', () => {
      viewer.classList.toggle('info-open');
    });

    // Sub-tabs logic
    q('.right-tabs').addEventListener('click', e => {
      const tab = e.target.closest('.rtab');
      if (!tab) return;
      if (tab.classList.contains('mobile-close')) {
        viewer.classList.remove('info-open');
        return;
      }
      viewer.querySelectorAll('.rtab:not(.mobile-close)').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      q('.shapes-body').style.display  = target === 'shapes'  ? 'flex' : 'none';
      q('.palette-body').style.display = target === 'palette' ? 'flex' : 'none';
      q('.process-body').style.display = target === 'process' ? 'flex' : 'none';
      q('.json-body').style.display    = target === 'json'    ? 'flex' : 'none';
    });

    // Process tree click -> Scroll JSON
    q('.process-tree').addEventListener('click', e => {
      const item = e.target.closest('.tree-item');
      if (item && item.dataset.id) {
        q('.rtab[data-tab="json"]').click();
        const block = q(`.json-display-block[data-node-id="${item.dataset.id}"]`);
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Shape list click -> Switch to JSON and scroll to TOP
    q('.shapes-body').addEventListener('click', e => {
      const row = e.target.closest('.shape-row');
      if (row) {
        const idx = +row.dataset.idx;
        q('.rtab[data-tab="json"]').click();
        const block = q(`.json-display-block[data-idx="${idx}"]`);
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.onHover(viewer, App.instances[tabId].state, idx);
      }
    });

    // SVG click -> Switch to JSON and scroll to TOP
    q('.svg-canvas').addEventListener('click', e => {
      const el = e.target.closest('[data-svg-idx]');
      if (el) {
        const idx = +el.getAttribute('data-svg-idx');
        q('.rtab[data-tab="json"]').click();
        const block = q(`.json-display-block[data-idx="${idx}"]`);
        if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.onHover(viewer, App.instances[tabId].state, idx);
      }
    });

    // JSON block click -> Switch to Shapes and scroll
    q('.json-code').addEventListener('click', e => {
      const b = e.target.closest('.json-display-block');
      if (b) {
        const idx = +b.dataset.idx;
        q('.rtab[data-tab="shapes"]').click();
        const row = q(`.shape-row[data-idx="${idx}"]`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        this.onHover(viewer, App.instances[tabId].state, idx);
      }
    });

    // Export buttons
    q('.export-xcs-btn').addEventListener('click', () => {
      const inst = App.instances[tabId];
      if (inst && inst.state.rawData) {
        const now = new Date();
        const ts = now.toISOString().replace(/[:T]/g, '-').split('.')[0];
        const def = (q('.viewer-fname').textContent || `mandala-${ts}`).replace(/\.xcs$/i, '') + '.xcs';
        let name = prompt("Export XCS as:", def);
        if (!name) return;
        if (!name.toLowerCase().endsWith('.xcs')) name += '.xcs';
        dl(name, JSON.stringify(inst.state.rawData, null, 2), 'application/json');
      }
    });
    q('.export-pal-btn').addEventListener('click', () => {
      const inst = App.instances[tabId];
      if (inst) this.exportPalette(q, inst.state);
    });

    // Hover delegation
    const jc = q('.json-code');
    jc.addEventListener('mouseover', e => {
      const b = e.target.closest('.json-display-block');
      if (b) this.onHover(viewer, App.instances[tabId].state, +b.dataset.idx, e);
      else this.onLeave(viewer);
    });
    jc.addEventListener('mousemove', e => { if (e.target.closest('.json-display-block')) Popup.move(e); });
    jc.addEventListener('mouseleave', () => this.onLeave(viewer));

    return viewer;
  },

  update(pane, state, lazy = false) {
    const v = pane.querySelector('.xcs-viewer');
    const q = s => v.querySelector(s);
    
    if (!state.shapes || !state.shapes.length) {
      v.style.display = 'none';
      return;
    }
    v.style.display = 'flex';
    q('.export-xcs-btn').disabled = false;
    q('.export-pal-btn').disabled = false;

    this.renderSVG(v, state);
    this.renderStats(v, state);

    if (lazy) {
      if (this._lazyTimer) clearTimeout(this._lazyTimer);
      this._lazyTimer = setTimeout(() => {
        this.renderList(v, state);
        this.renderPaletteList(v, state);
        this.renderProcessTree(v, state);
        this.renderJSON(v, state);
        this._lazyTimer = null;
      }, 250);
    } else {
      if (this._lazyTimer) { clearTimeout(this._lazyTimer); this._lazyTimer = null; }
      this.renderList(v, state);
      this.renderPaletteList(v, state);
      this.renderProcessTree(v, state);
      this.renderJSON(v, state);
    }
  },

  renderSVG(v, state) {
    const panel = v.querySelector('.canvas-panel');
    const W = panel.clientWidth||500, H = panel.clientHeight||500;
    const { shapes } = state;
    
    // Fixed Laser Area: 100x100mm
    const AREA = 100;
    const sc = Math.min((W-PAD*2)/AREA, (H-PAD*2)/AREA);
    const ox = PAD + ((W-PAD*2) - AREA*sc)/2;
    const oy = PAD + ((H-PAD*2) - AREA*sc)/2;
    const mm2 = (x,y) => [x*sc+ox, y*sc+oy];
    
    const svg = v.querySelector('.svg-canvas');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    
    // Laser Area Boundary
    const [ax, ay] = mm2(0, 0);
    const aw = AREA * sc;
    svg.appendChild(svgEl('rect', { x:ax, y:ay, width:aw, height:aw, fill:'#111', stroke:'#333', 'stroke-width':'1' }));

    // Grid (10mm steps)
    const gg = svgEl('g', {opacity:'0.15'});
    for (let g = 0; g <= AREA; g += 10) {
      const [p1] = mm2(g, 0);
      const [,p2] = mm2(0, g);
      gg.appendChild(svgEl('line',{x1:p1, y1:ay, x2:p1, y2:ay+aw, stroke:'#5b9bd5','stroke-width':'0.5'}));
      gg.appendChild(svgEl('line',{x1:ax, y1:p2, x2:ax+aw, y2:p2, stroke:'#5b9bd5','stroke-width':'0.5'}));
    }
    svg.appendChild(gg);

    const labels = [];
    for (const s of [...shapes].sort((a,b) => a.zOrder-b.zOrder)) {
      const [cx,cy] = mm2(s.x, s.y);
      const rx = s.w/2*sc, ry = s.h/2*sc;
      let el;
      
      const isFill = s.processingType === 'fill' || s.processingType === 'COLOR_FILL_ENGRAVE' || s.processingType === 'FILL_VECTOR_ENGRAVING';
      const fillOp = isFill ? '0.6' : '0.22';
      const strW = isFill ? '0' : '1.5';
      
      // Map black to white for visibility in the viewer
      const renderColor = s.layerColor === '#000000' ? '#ffffff' : s.layerColor;
      const strC = isFill ? 'none' : renderColor;

      if (s.type==='CIRCLE') el = svgEl('ellipse',{cx,cy,rx,ry,fill:renderColor,'fill-opacity':fillOp,stroke:strC,'stroke-width':strW});
      else if (s.type==='RECT' || s.type==='IMAGE') {
        let fill = renderColor;
        
        // Custom rendering for BitmapLine grayscale gradients
        if (s.isGrayscaleGradient) {
          const gradId = `grad-${s.id}`;
          let defs = svg.querySelector('defs');
          if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.prepend(defs);
          }
          
          if (!defs.querySelector(`#${gradId}`)) {
            const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            grad.setAttribute('id', gradId);
            grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
            grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '0%');
            
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#fff');
            
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#000');
            
            grad.appendChild(stop1);
            grad.appendChild(stop2);
            defs.appendChild(grad);
          }
          fill = `url(#${gradId})`;
        }

        el = svgEl('rect',{x:cx-rx,y:cy-ry,width:rx*2,height:ry*2,fill:fill,'fill-opacity':fillOp,stroke:strC,'stroke-width':strW});
        
        if (s.isGrayscaleGradient) {
          // Add a white border for contrast in the viewer
          el.setAttribute('stroke', '#ffffff');
          el.setAttribute('stroke-width', '0.5');
          el.setAttribute('stroke-opacity', '0.8');
        } else if (s.type === 'IMAGE' && !s.isGrayscaleGradient) {
          // Add a "bitmap" texture or indicator
          el.setAttribute('stroke-dasharray', '2 1');
        }
      }
      else if (s.type==='TEXT') {
        const fs = s.h * sc;
        const anchor = s.style?.align === 'center' ? 'middle' : (s.style?.align === 'right' ? 'end' : 'start');
        el = svgEl('text', {
          x: cx, y: cy, fill: renderColor, 'font-size': fs,
          'text-anchor': anchor,
          transform: `rotate(${s.angle||0}, ${cx}, ${cy})`,
          'font-family': 'Lato, system-ui, -apple-system, sans-serif', 'font-weight': '700',
          'fill-opacity': '0.8'
        });
        el.textContent = s.text || '';
      }
      else el = svgEl('rect',{x:cx-rx,y:cy-ry,width:rx*2,height:ry*2,fill:'none',stroke:'#555','stroke-width':'1','stroke-dasharray':'3 3'});
      
      el.setAttribute('data-svg-idx', s.idx);
      el.setAttribute('data-is-fill', (isFill || s.type === 'TEXT') ? 'true' : 'false');
      el.style.cursor = 'pointer';
      el.addEventListener('mouseenter', ev => this.onHover(v, state, s.idx, ev));
      el.addEventListener('mousemove',  ev => Popup.move(ev));
      el.addEventListener('mouseleave', () => this.onLeave(v));
      svg.appendChild(el);
      
      // Only show auto-power labels for larger shapes if NOT explicitly hidden
      if (s.power != null && rx > 12 && !s.hideLabels && s.type !== 'TEXT') {
        const t = svgEl('text',{x:cx,y:cy+4,'text-anchor':'middle','font-size':Math.min(rx*.55,12),'font-family':'SF Mono,Fira Code,monospace',fill:isFill?'#000':'#fff','fill-opacity':isFill?'0.8':'0.7','font-weight':'800','pointer-events':'none'});
        t.textContent = s.power+'%'; labels.push(t);
      }
    }
    labels.forEach(t => svg.appendChild(t));
    v.querySelector('.canvas-label').textContent = `Laser Area: 100 × 100 mm`;
  },

  renderList(v, state) {
    v.querySelector('.shapes-hdr').textContent = `Shapes (${state.shapes.length})`;
    const list = v.querySelector('.shape-list');
    list.innerHTML = '';
    state.shapes.forEach(s => {
      const row = document.createElement('div');
      row.className = 'shape-row'; row.dataset.idx = s.idx;
      const typeLabel = s.processingType ? s.processingType.toUpperCase() : '—';
      const displayType = s.type === 'IMAGE' ? 'BITMAP' : s.type;
      const laserLabel = s.laser ? `<span style="color:#5b9bd5;font-weight:800;margin-left:4px">${s.laser.toUpperCase()}</span>` : '';
      const deLabel = s.density != null ? `${s.density} lpcm` : '—';
      const dotColor = s.layerColor === '#000000' ? '#ffffff' : s.layerColor;
      const speedUnit = (s.type === 'IMAGE' || s.isGrayscaleGradient) ? 'ms' : 'mm/s';
      row.innerHTML = `
        <div class="shape-dot" style="background:${dotColor}"></div>
        <div style="flex:1">
          <div class="shape-row-title">${displayType} #${s.idx+1} ${laserLabel} <span style="color:#444;font-size:9px;margin-left:4px">${typeLabel}</span></div>
          <div class="shape-row-sub">${s.power!=null?s.power+' pwr%':'—'} · ${s.speed!=null?s.speed+' '+speedUnit:'—'} · ${deLabel}</div>
          <div style="font-size:8px;color:#444;font-family:monospace;margin-top:2px">ID: ${s.id}</div>
        </div>`;
      row.addEventListener('mouseenter', ev => this.onHover(v, state, s.idx, ev));
      row.addEventListener('mousemove',  ev => Popup.move(ev));
      row.addEventListener('mouseleave', () => this.onLeave(v));
      list.appendChild(row);
    });
  },

  renderPaletteList(v, state) {
    const combos = this.getUniqueCombos(state);
    const list = v.querySelector('.pal-list');
    list.innerHTML = '';
    combos.forEach((c, i) => {
      const row = document.createElement('div');
      row.className = 'pal-row';
      const pw = c.power != null ? `${c.power}<span class="pal-u"> pwr%</span>` : '—';
      const sp = c.speed != null ? `${c.speed}<span class="pal-u"> mm/s</span>` : '—';
      const de = c.density != null ? `${c.density}<span class="pal-u"> lpcm</span>` : '—';
      const laserLabel = c.laser ? `<span style="color:#5b9bd5;font-weight:800;font-size:9px;margin-left:4px">${c.laser.toUpperCase()}</span>` : '';
      row.innerHTML = `
        <div class="pal-row-top">
          <span class="pal-id">#${i+1} ${laserLabel}</span>
          <span class="pal-count">${c.count} shapes</span>
        </div>
        <div class="pal-params">
          <span>P: <span class="pal-v">${pw}</span></span>
          <span>S: <span class="pal-v">${sp}</span></span>
          <span>D: <span class="pal-v">${de}</span></span>
        </div>
        <div class="pal-types">${[...c.types].join(', ')}</div>`;
      list.appendChild(row);
    });
    v.querySelector('.pal-hdr').textContent = `Unique Settings (${combos.length})`;
  },

  getUniqueCombos(state) {
    const combos = new Map();
    state.shapes.forEach(s => {
      const key = `${s.power}|${s.speed}|${s.density}|${s.repeat}|${s.laser}`;
      if (!combos.has(key)) combos.set(key, {power:s.power, speed:s.speed, density:s.density, repeat:s.repeat, laser:s.laser, count:0, types:new Set()});
      const c = combos.get(key); c.count++; c.types.add(s.type);
    });
    const params = ['power','speed','density'];
    const un = p => new Set(state.shapes.map(s=>s[p]).filter(v=>v!=null)).size;
    const sp = params.reduce((b,p) => un(p)>un(b)?p:b, params[0]);
    return [...combos.values()].sort((a,b) => (a[sp]??-Infinity)-(b[sp]??-Infinity));
  },

  renderJSON(v, state) {
    const raw = JSON.stringify(state.rawData, null, 2);
    const positions = [];
    
    // Geometry blocks
    state.shapes.forEach(s => {
      const needle = `"id": "${s.id}"`;
      const pos = raw.indexOf(needle);
      if (pos === -1) return;
      let start = raw.lastIndexOf('{', pos), depth = 1, i = start+1;
      while (i < raw.length && depth > 0) { if (raw[i]==='{') depth++; else if (raw[i]==='}') depth--; i++; }
      positions.push({id:s.id, start, end:i, type:'geo', idx:s.idx});
    });

    // Processing blocks
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
    findNodes(state.rawData.device);

    positions.sort((a,b) => a.start-b.start);
    let html = '', cursor = 0;
    for (const p of positions) {
      if (p.start < cursor) continue; // Skip nested for now to keep simple
      html += syntaxHL(raw.slice(cursor, p.start));
      const attr = p.type==='geo' ? `data-idx="${p.idx}"` : `data-node-id="${p.id}"`;
      html += `<span class="json-display-block" ${attr}>${syntaxHL(raw.slice(p.start, p.end))}</span>`;
      cursor = p.end;
    }
    html += syntaxHL(raw.slice(cursor));
    v.querySelector('.json-code').innerHTML = html;
  },

  renderStats(v, state) {
    const { shapes } = state;
    const formatRange = (label, vals, unit) => {
      if (!vals.length) return '';
      if (vals.length === 1) return `${label}: <strong>${vals[0]} ${unit}</strong>`;
      const sorted = [...vals].sort((a,b) => a-b);
      const start = sorted[0], end = sorted[sorted.length-1];
      const step = sorted.length > 1 ? (sorted[1] - sorted[0]) : 0;
      return `${label}: <strong>${start}–${end} ${unit}</strong> (step: ${step})`;
    };
    
    const powers = [...new Set(shapes.map(s=>s.power).filter(v=>v!=null))];
    const speeds = [...new Set(shapes.map(s=>s.speed).filter(v=>v!=null))];
    const dens   = [...new Set(shapes.map(s=>s.density).filter(v=>v!=null))];
    
    v.querySelector('.s-shapes').innerHTML  = `<strong>${shapes.length}</strong> shapes`;
    v.querySelector('.s-power').innerHTML   = formatRange('Power', powers, 'pwr%');
    const isBitmap = shapes.some(s => s.type === 'IMAGE' || s.isGrayscaleGradient);
    const speedUnit = isBitmap ? 'ms' : 'mm/s';
    v.querySelector('.s-speed').innerHTML   = formatRange('Speed', speeds, speedUnit);
    const densityUnit = isBitmap ? 'DPI' : 'lpcm';
    v.querySelector('.s-density').innerHTML = formatRange('Density', dens, densityUnit);
  },

  renderProcessTree(v, state) {
    const list = v.querySelector('.process-tree');
    list.innerHTML = '';
    
    const build = (obj, depth=0) => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.entries(obj).forEach(([k, val]) => {
        if (val && typeof val === 'object') {
          const id = val.id || val.processingType;
          if (id) {
            const item = document.createElement('div');
            item.className = 'tree-item';
            item.dataset.id = id;
            item.style.paddingLeft = (depth * 12) + 'px';
            const label = val.processingType ? `<span class="tree-type">${val.processingType}</span>` : `<span class="tree-id">${id}</span>`;
            item.innerHTML = `<span class="tree-key">${k}:</span> ${label}`;
            list.appendChild(item);
            build(val, depth + 1);
          } else {
            build(val, depth + 1);
          }
        }
      });
    };
    build(state.rawData.device);
  },

  onHover(v, state, idx, ev) {
    const s = state.shapes[idx];
    v.querySelectorAll('.shape-row').forEach(r => {
      const match = +r.dataset.idx===idx;
      r.classList.toggle('hl', match);
    });
    v.querySelectorAll('[data-svg-idx]').forEach(el => {
      const hit = +el.getAttribute('data-svg-idx')===idx;
      const isFill = el.getAttribute('data-is-fill') === 'true';
      const isText = el.tagName === 'text';
      
      if (isText) {
        el.setAttribute('stroke', hit ? '#fff' : 'none');
        el.setAttribute('stroke-width', hit ? '0.5' : '0');
        el.setAttribute('fill-opacity', hit ? '1.0' : '0.8');
      } else if (isFill) {
        el.setAttribute('fill-opacity', hit ? '1.0' : '0.6');
        el.setAttribute('stroke', hit ? '#fff' : 'none');
        el.setAttribute('stroke-width', hit ? '2' : '0');
      } else {
        el.setAttribute('fill-opacity', hit ? '0.55' : '0.22');
        el.setAttribute('stroke-width', hit ? '2.5'  : '1.5');
      }
    });
    v.querySelectorAll('.json-display-block').forEach(b => {
      const match = +b.dataset.idx===idx;
      b.classList.toggle('json-hl', match);
    });
    Popup.show(s, ev);
  },

  onLeave(v) {
    Popup.hide();
    v.querySelectorAll('.shape-row').forEach(r => r.classList.remove('hl'));
    v.querySelectorAll('[data-svg-idx]').forEach(el => {
      const isFill = el.getAttribute('data-is-fill') === 'true';
      const isText = el.tagName === 'text';

      if (isText) {
        el.setAttribute('stroke', 'none');
        el.setAttribute('stroke-width', '0');
        el.setAttribute('fill-opacity', '0.8');
      } else if (isFill) {
        el.setAttribute('fill-opacity', '0.6');
        el.setAttribute('stroke', 'none');
        el.setAttribute('stroke-width', '0');
      } else {
        el.setAttribute('fill-opacity', '0.22');
        el.setAttribute('stroke-width', '1.5');
      }
    });
    v.querySelectorAll('.json-display-block').forEach(b => b.classList.remove('json-hl'));
  },

  exportPalette(q, state) {
    const combos = this.getUniqueCombos(state);
    const now = new Date();
    const ts = now.toISOString().replace(/[:T]/g, '-').split('.')[0];
    const def = (q('.viewer-fname').textContent || `mandala-${ts}`).replace(/\.xcs$/i, '') + '-palette.txt';
    let name = prompt("Export Palette as:", def);
    if (!name) return;
    if (!name.toLowerCase().endsWith('.txt')) name += '.txt';
    
    const params = ['power','speed','density'];
    const un = p => new Set(state.shapes.map(s=>s[p]).filter(v=>v!=null)).size;
    const sp = params.reduce((b,p) => un(p)>un(b)?p:b, params[0]);
    const lines = [`# Unique Settings — ${name}`, `# ${state.shapes.length} shapes, ${combos.length} combo(s) | sorted by ${sp}`, '',
      ` #  | Power  | Speed    | Density   | Repeat | Count | Type`,
      `----+--------+----------+-----------+--------+-------+------`];
    combos.forEach((c,i) => {
      const pw = c.power!=null?`${c.power} %`:'—';
      const sp = c.speed!=null?`${c.speed} mm/s`:'—';
      const de = c.density!=null?`${c.density} LPCM`:'—';
      lines.push(` ${String(i+1).padStart(2)} | ${pw.padEnd(6)} | ${sp.padEnd(8)} | ${de.padEnd(9)} | ${String(c.repeat).padEnd(6)} | ${String(c.count).padEnd(5)} | ${[...c.types].join(', ')}`);
    });
    dl(name, lines.join('\n'), 'text/plain');
  }
};

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
}

export function syntaxHL(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\u[\dA-Fa-f]{4}|\\[^u]|[^\\"])*")\s*:/g,'<span class="j-key">$1</span>:')
    .replace(/("(\\u[\dA-Fa-f]{4}|\\[^u]|[^\\"])*")/g,'<span class="j-str">$1</span>')
    .replace(/\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,'<span class="j-num">$1</span>')
    .replace(/\b(true|false)\b/g,'<span class="j-bool">$1</span>')
    .replace(/\bnull\b/g,'<span class="j-null">null</span>');
}

export function esc(str) { 
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); 
}

export function dl(filename, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:mime}));
  a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function getTimestampedName(prefix) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  return `${prefix}${months[now.getMonth()]}${now.getDate()}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

export const UI = {
  _tip: null,
  getTooltip() {
    if (!this._tip) {
      this._tip = document.createElement('div');
      this._tip.className = 'ui-tooltip';
      document.body.appendChild(this._tip);
    }
    return this._tip;
  },
  showTooltip(text, x, y) {
    const tip = this.getTooltip();
    tip.textContent = text;
    tip.classList.add('show');
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.min(x + 10, window.innerWidth - tw - 10) + 'px';
    tip.style.top = Math.max(10, y - th - 10) + 'px';
  },
  hideTooltip() {
    if (this._tip) this._tip.classList.remove('show');
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

  makeRange(min, max, step, val, onChange, unit='') {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl-val-wrap';
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    const disp = document.createElement('span');
    disp.className = 'range-val'; disp.textContent = val + unit;
    inp.addEventListener('input', () => { 
      val = inp.value;
      disp.textContent = val + unit; 
      onChange(val); 
    });
    wrap.appendChild(inp); wrap.appendChild(disp);
    return wrap;
  },

  makeToggles(options, current, onChange, labels = {}) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex'; wrap.style.gap = '4px';
    options.forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'hbtn sm' + (String(o) === String(current) ? ' primary' : '');
      btn.textContent = labels[o] || o;
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

  makePalettePicker(entries, currentIdx, onChange, options = {}) {
    const { labelPrefix = "", onInteract = null, title = "", autoIndicator = false } = options;
    const wrap = document.createElement('div');
    wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '4px';
    wrap.style.position = 'relative'; wrap.style.cursor = 'pointer';

    const swatch = document.createElement('div');
    swatch.className = 'picker-swatch-box';
    swatch.style.width = '16px'; swatch.style.height = '16px'; swatch.style.borderRadius = '3px';
    swatch.style.border = '1px solid rgba(255,255,255,0.3)';
    swatch.style.backgroundColor = entries[currentIdx]?.rgb || 'transparent';
    swatch.style.flexShrink = '0';

    if (labelPrefix) {
      const lp = document.createElement('span');
      lp.style.fontSize = '10px'; lp.style.color = '#5b9bd5'; lp.style.fontWeight = 'bold'; lp.textContent = labelPrefix;
      wrap.appendChild(lp);
    }
    wrap.appendChild(swatch);

    if (autoIndicator) {
      const ai = document.createElement('span');
      ai.style.fontSize = '9px'; ai.style.color = '#10b981'; ai.style.fontWeight = 'bold'; ai.style.opacity = '0.7';
      ai.textContent = 'AUTO';
      wrap.appendChild(ai);
    }

    const getInfo = (idx) => {
      const e = entries[idx];
      return e ? `${title ? title + ': ' : ''}${e.label} (${e.power}%)` : title;
    };

    wrap.onmouseenter = (e) => this.showTooltip(getInfo(currentIdx), e.clientX, e.clientY);
    wrap.onmousemove = (e) => this.showTooltip(getInfo(currentIdx), e.clientX, e.clientY);
    wrap.onmouseleave = () => this.hideTooltip();

    wrap.onclick = (e) => {
      e.stopPropagation();
      this.hideTooltip();
      
      const menu = document.createElement('div');
      menu.className = 'palette-dropdown-menu';
      menu.style.position = 'fixed';
      menu.style.background = '#1a1a1a';
      menu.style.border = '1px solid #333';
      menu.style.borderRadius = '8px';
      menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
      menu.style.zIndex = '3000';
      menu.style.maxHeight = '300px';
      menu.style.overflowY = 'auto';
      menu.style.padding = '4px';
      menu.style.minWidth = '180px';

      entries.forEach((e, i) => {
        const item = document.createElement('div');
        item.style.display = 'flex'; item.style.alignItems = 'center'; item.style.gap = '8px';
        item.style.padding = '6px 8px'; item.style.borderRadius = '4px';
        item.style.cursor = 'pointer'; item.style.fontSize = '11px';
        item.style.color = (i === currentIdx) ? '#fff' : '#aaa';
        item.style.background = (i === currentIdx) ? '#2a2a2a' : 'transparent';

        item.innerHTML = `
          <div style="width:12px;height:12px;border-radius:2px;background:${e.rgb};border:1px solid rgba(255,255,255,0.1)"></div>
          <div style="flex:1">${e.label}</div>
          <div style="color:#555;font-family:monospace">${e.power}%</div>
        `;

        item.onmouseenter = () => { item.style.background = '#333'; item.style.color = '#fff'; };
        item.onmouseleave = () => { 
          item.style.background = (i === currentIdx) ? '#2a2a2a' : 'transparent';
          item.style.color = (i === currentIdx) ? '#fff' : '#aaa';
        };

        item.onclick = (ev) => {
          ev.stopPropagation();
          swatch.style.backgroundColor = e.rgb;
          if (onInteract) onInteract();
          onChange(i);
          document.body.removeChild(menu);
        };
        menu.appendChild(item);
      });

      document.body.appendChild(menu);
      const rect = swatch.getBoundingClientRect();
      let top = rect.bottom + 4;
      if (top + menu.offsetHeight > window.innerHeight) top = rect.top - menu.offsetHeight - 4;
      menu.style.left = Math.min(rect.left, window.innerWidth - menu.offsetWidth - 10) + 'px';
      menu.style.top = top + 'px';

      const close = () => { if (document.body.contains(menu)) document.body.removeChild(menu); document.removeEventListener('click', close); };
      setTimeout(() => document.addEventListener('click', close), 10);
    };

    return wrap;
  },

  makeActionBtn(label, isActive, onClick) {
    const btn = document.createElement('button');
    btn.className = 'hbtn sm' + (isActive ? ' primary' : '');
    btn.textContent = label;
    btn.onclick = (e) => { e.stopPropagation(); onClick(); };
    return btn;
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
  },

  makeModeToggle(current, onPath, onFill, supported = { path: true, fill: true }) {
    const wrap = document.createElement('div');
    wrap.className = 'btn-group';
    
    const pathBtn = document.createElement('button');
    pathBtn.className = 'hbtn sm' + (current === 'path' ? ' primary' : '');
    pathBtn.textContent = 'Path';
    pathBtn.disabled = !supported.path;
    pathBtn.onclick = () => {
      if (current !== 'path') onPath();
    };

    const fillBtn = document.createElement('button');
    fillBtn.className = 'hbtn sm' + (current === 'fill' ? ' primary' : '');
    fillBtn.textContent = 'Fill';
    fillBtn.disabled = !supported.fill;
    fillBtn.onclick = () => {
      if (current !== 'fill') onFill();
    };

    wrap.appendChild(pathBtn);
    wrap.appendChild(fillBtn);
    return wrap;
  },

  makeGeneralSettingsSection(cfg, setFn, rebuildFn, palettes, currentPaletteObj, options = {}) {
    const opts = {
      supportPath: true,
      supportFill: true,
      supportColorRange: true,
      supportBorder: true,
      minSize: 10,
      maxSize: 200,
      ...options
    };

    const rows = [];
    
    // 1. Size
    rows.push(this.makeRow('Size', this.makeRange(
      opts.minSize, opts.maxSize, 1, cfg.size || 40, 
      v => setFn('size', +v), 'mm'
    )));

    // 2. Palette
    if (palettes) {
      const palOpts = Object.keys(palettes);
      const palLabels = {}; palOpts.forEach(id => palLabels[id] = palettes[id].name);
      rows.push(this.makeRow('Palette', this.makeToggles(
        palOpts, cfg.paletteId, 
        v => { 
          cfg.paletteId = v; 
          setFn('paletteId', v); 
          if(rebuildFn) rebuildFn(); 
        }, 
        palLabels
      )));
    }

    // 3. Color (Single or Range)
    if (opts.supportColorRange && currentPaletteObj && currentPaletteObj.entries) {
      rows.push(this.makeRow('Color', (() => {
        const wrap = document.createElement('div');
        wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '8px';
        
        const btn = document.createElement('button');
        btn.className = 'hbtn sm' + (cfg.colorRangeMode ? ' primary' : '');
        btn.textContent = cfg.colorRangeMode ? 'AUTO' : 'MANUAL';
        btn.onclick = () => {
          cfg.colorRangeMode = !cfg.colorRangeMode;
          setFn('colorRangeMode', cfg.colorRangeMode);
          if (rebuildFn) rebuildFn();
        };
        wrap.appendChild(btn);

        wrap.appendChild(this.makePalettePicker(
          currentPaletteObj.entries, 
          cfg.paletteOffset || 0, 
          v => setFn('paletteOffset', v),
          { title: cfg.colorRangeMode ? "Start Color" : "Color" }
        ));

        if (cfg.colorRangeMode) {
          const arrow = document.createElement('span');
          arrow.innerHTML = '&rarr;'; arrow.style.color = '#444'; arrow.style.fontSize = '10px';
          wrap.appendChild(arrow);
          wrap.appendChild(this.makePalettePicker(
            currentPaletteObj.entries, 
            cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10, 
            v => setFn('rangeEndIdx', v), 
            { title: "End Color" }
          ));
        }
        return wrap;
      })()));
    } else if (currentPaletteObj && currentPaletteObj.entries) {
      // Just single start color if range not supported
      rows.push(this.makeRow('Start Color', this.makePalettePicker(
        currentPaletteObj.entries, 
        cfg.paletteOffset || 0, 
        v => setFn('paletteOffset', v)
      )));
    }

    // 4. Mode (Fill/Path)
    rows.push(this.makeRow('Mode', this.makeModeToggle(
      cfg.renderMode || 'fill', 
      () => setFn('renderMode', 'path'), 
      () => setFn('renderMode', 'fill'),
      { path: opts.supportPath, fill: opts.supportFill }
    )));

    // 5. Border
    if (opts.supportBorder) {
      rows.push(this.makeToggleRow('Show Border', cfg.border || false, v => setFn('border', v)));
    }

    return this.makeSection('General', rows);
  },

  showPatternMenu(patterns) {
    const menu = document.getElementById('addPatternMenu');
    if (!menu) return;

    if (menu.classList.contains('show')) {
      menu.classList.remove('show');
      return;
    }

    if (menu.innerHTML === '') {
      const cats = [...new Set(patterns.map(p => p.cat))];
      cats.forEach(cat => {
        const col = document.createElement('div');
        col.className = 'menu-column';
        col.innerHTML = `<div class="menu-category"><span>${cat}</span></div>`;
        
        const grid = document.createElement('div');
        grid.className = 'menu-items-grid';
        
        patterns.filter(p => p.cat === cat).forEach(p => {
          const item = document.createElement('div');
          item.className = 'menu-item';
          item.innerHTML = `
            <span class="menu-item-icon">${p.icon || '◈'}</span>
            <span class="menu-item-label">${p.label}</span>
          `;
          item.onclick = (e) => {
            e.stopPropagation();
            import('./app.js').then(m => {
              m.App.addTab(p.label, p.comp, p.cfg);
              menu.classList.remove('show');
            });
          };
          grid.appendChild(item);
        });
        col.appendChild(grid);
        menu.appendChild(col);
      });
    }

    menu.classList.add('show');
    
    const btn = document.getElementById('addPatternBtn');
    const rect = btn.getBoundingClientRect();
    const menuW = 840;
    let left = rect.left;
    if (left + menuW > window.innerWidth) left = window.innerWidth - menuW - 20;
    menu.style.left = Math.max(10, left) + 'px';
    menu.style.top = (rect.bottom + 8) + 'px';

    setTimeout(() => {
      const close = (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
          menu.classList.remove('show');
          document.removeEventListener('click', close);
        }
      };
      document.addEventListener('click', close);
    }, 10);
  }
};

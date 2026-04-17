import { XCSPalletUI } from '../../xcs-module/js/XCSPalletUI.js';

const palletUI = new XCSPalletUI({
  tooltip: {
    show: (text, x, y) => UI.showTooltip(text, x, y),
    hide: () => UI.hideTooltip()
  }
});

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

  makeTextNode(text, className = '') {
    const el = document.createElement('span');
    el.textContent = text;
    if (className) el.className = className;
    return el;
  },
  _searchState: "",
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
    // Allow HTML for rich formatting
    tip.innerHTML = text.replace(/\n/g, '<br>');
    tip.classList.add('show');
    
    // Measure after content is set
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let finalX = x + 15;
    let finalY = y - th/2;

    // Boundary checks
    if (finalX + tw > window.innerWidth - 20) finalX = x - tw - 15;
    if (finalY + th > window.innerHeight - 20) finalY = window.innerHeight - th - 20;
    if (finalY < 20) finalY = 20;

    tip.style.left = finalX + 'px';
    tip.style.top = finalY + 'px';
  },
  hideTooltip() {
    if (this._tip) this._tip.classList.remove('show');
  },

  makeSection(title, rows, collapsed = false, headerExtra = null, tooltip = null) {
    const sec = document.createElement('div');
    sec.className = 'tool-section' + (collapsed ? ' collapsed' : '');
    const head = document.createElement('div');
    head.className = 'tool-section-header';
    head.innerHTML = `<span class="tool-section-toggle">▼</span> <span class="tool-section-title">${title}</span>`;
    
    const titleEl = head.querySelector('.tool-section-title');
    if (tooltip) {
      titleEl.style.cursor = 'help';
      titleEl.style.borderBottom = '1px dotted #444';
      titleEl.onmouseenter = (e) => this.showTooltip(tooltip, e.clientX, e.clientY);
      titleEl.onmousemove = (e) => this.showTooltip(tooltip, e.clientX, e.clientY);
      titleEl.onmouseleave = () => this.hideTooltip();
    }

    if (headerExtra) head.appendChild(headerExtra);
    head.querySelector('.tool-section-toggle').onclick = () => sec.classList.toggle('collapsed');
    sec.appendChild(head);
    const body = document.createElement('div');
    body.className = 'tool-section-body';
    rows.forEach(r => body.appendChild(r));
    sec.appendChild(body);
    return sec;
  },

  makeHeading(text) {
    const el = document.createElement('div');
    el.className = 'ctrl-heading';
    el.textContent = text;
    el.style.fontSize = '10px';
    el.style.fontWeight = '700';
    el.style.textTransform = 'uppercase';
    el.style.color = '#666';
    el.style.marginTop = '12px';
    el.style.marginBottom = '4px';
    el.style.paddingLeft = '4px';
    el.style.borderLeft = '2px solid #333';
    return el;
  },

  makeRow(label, control, tooltip = null) {
    const row = document.createElement('div');
    row.className = 'ctrl-row';
    const lbl = document.createElement('span');
    lbl.className = 'ctrl-label'; lbl.textContent = label;
    
    if (tooltip) {
      lbl.style.cursor = 'help';
      lbl.style.borderBottom = '1px dotted #444';
      lbl.onmouseenter = (e) => this.showTooltip(tooltip, e.clientX, e.clientY);
      lbl.onmousemove = (e) => this.showTooltip(tooltip, e.clientX, e.clientY);
      lbl.onmouseleave = () => this.hideTooltip();
    }

    row.appendChild(lbl); row.appendChild(control);
    return row;
  },

  makeSelect(options, current, onChange) {
    const sel = document.createElement('select');
    sel.className = 'ui-select';
    sel.style.background = '#0d0d0d';
    sel.style.border = '1px solid #333';
    sel.style.color = '#5b9bd5';
    sel.style.fontSize = '11px';
    sel.style.borderRadius = '4px';
    sel.style.padding = '2px 4px';
    sel.style.outline = 'none';
    sel.style.cursor = 'pointer';

    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      if (o === current) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.onchange = (e) => onChange(e.target.value);
    return sel;
  },

  makeTextInput(val, onChange, placeholder = '') {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = val;
    inp.placeholder = placeholder;
    inp.style.background = '#0d0d0d';
    inp.style.border = '1px solid #333';
    inp.style.color = '#5b9bd5';
    inp.style.fontSize = '11px';
    inp.style.borderRadius = '4px';
    inp.style.padding = '2px 6px';
    inp.style.width = '100%';
    inp.style.outline = 'none';
    inp.onchange = (e) => onChange(e.target.value);
    return inp;
  },

  makeRange(min, max, step, val, onChange, unit='') {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl-val-wrap';
    
    const inp = document.createElement('input');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    inp.style.flex = '1';

    const num = document.createElement('input');
    num.type = 'number'; num.min = min; num.max = max; num.step = step; num.value = val;
    num.className = 'range-num-input';
    num.style.width = '50px';
    num.style.background = 'transparent';
    num.style.border = 'none';
    num.style.borderBottom = '1px solid #333';
    num.style.color = '#5b9bd5';
    num.style.fontSize = '11px';
    num.style.textAlign = 'right';
    num.style.padding = '0';
    num.style.marginLeft = '8px';

    const unitSpan = unit ? document.createElement('span') : null;
    if (unitSpan) {
      unitSpan.textContent = unit;
      unitSpan.style.fontSize = '10px';
      unitSpan.style.opacity = '0.5';
      unitSpan.style.marginLeft = '2px';
    }

    const updateAll = (v) => {
      inp.value = v;
      num.value = v;
      onChange(v);
    };

    inp.addEventListener('input', () => updateAll(inp.value));
    num.addEventListener('change', () => updateAll(num.value));
    num.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') num.blur();
    });

    wrap.appendChild(inp);
    wrap.appendChild(num);
    if (unitSpan) wrap.appendChild(unitSpan);
    return wrap;
  },

  makePaletteSelector(palettes, currentId, onChange) {
    return palletUI.makePaletteSelector(palettes, currentId, onChange);
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
    return palletUI.makePalettePicker(entries, currentIdx, onChange, options);
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

  makeModeToggle(current, onSelect, supported = { path: true, fill: true }) {
    const wrap = document.createElement('div');
    wrap.className = 'btn-group';
    
    const modes = [
      { id: 'path', label: 'Outline', sup: supported.path },
      { id: 'fill', label: 'Fill', sup: supported.fill },
      { id: 'concentric', label: 'Concentric', sup: true },
      { id: 'spiral', label: 'Spiral', sup: true }
    ];

    modes.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'hbtn sm' + (current === m.id ? ' primary' : '');
      btn.textContent = m.label;
      btn.disabled = !m.sup;
      btn.onclick = () => { if (current !== m.id) onSelect(m.id); };
      wrap.appendChild(btn);
    });

    return wrap;
  },

  makeGeneralSettingsSection(cfg, setFn, rebuildFn, palettes, currentPaletteObj, options = {}) {
    const opts = {
      supportPath: true,
      supportFill: true,
      supportColor: true,
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
      rows.push(this.makeRow('Palette', this.makePaletteSelector(
        palettes, cfg.paletteId, 
        v => { 
          cfg.paletteId = v; 
          setFn('paletteId', v); 
          if(rebuildFn) rebuildFn(); 
        }
      )));
    }

    // 3. Color (Single or Range)
    if (opts.supportColor) {
      if (opts.supportColorRange && currentPaletteObj && currentPaletteObj.entries) {
        rows.push(this.makeRow('Color', palletUI.makeColorRangeControl(
          cfg, setFn, rebuildFn, currentPaletteObj.entries, { title: "Color" }
        )));
      } else if (currentPaletteObj && currentPaletteObj.entries) {
        // Just single start color if range not supported
        rows.push(this.makeRow('Start Color', this.makePalettePicker(
          currentPaletteObj.entries, 
          cfg.paletteOffset || 0, 
          v => setFn('paletteOffset', v)
        )));
      }
    }

    // 4. LPCM Display (read-only from palette)
    if (currentPaletteObj) {
      const lpcmVal = currentPaletteObj.lpcm || 1000;
      const lpcmEl = document.createElement('span');
      lpcmEl.style.color = '#888';
      lpcmEl.style.fontSize = '11px';
      lpcmEl.style.fontFamily = 'monospace';
      lpcmEl.textContent = `${lpcmVal} LPCM (${(10 / lpcmVal).toFixed(3)}mm step)`;
      rows.push(this.makeRow('Density', lpcmEl));
    }

    // 5. Draw Mode Dropdown
    const drawModes = [
      { id: 'path', label: 'Outline' },
      { id: 'fill', label: 'Fill' },
      { id: 'concentric', label: 'Concentric' },
      { id: 'spiral', label: 'Spiral' }
    ];
    // Filter by support if needed, though Concentric/Spiral are always available now
    const supportedModes = drawModes.filter(m => {
      if (m.id === 'path') return opts.supportPath;
      if (m.id === 'fill') return opts.supportFill;
      return true;
    });

    const modeSelector = document.createElement('select');
    modeSelector.className = 'ui-select';
    // Match styles from makeSelect
    Object.assign(modeSelector.style, {
      background: '#0d0d0d', border: '1px solid #333', color: '#5b9bd5',
      fontSize: '11px', borderRadius: '4px', padding: '2px 4px', outline: 'none', cursor: 'pointer', width: '100%'
    });
    supportedModes.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id; opt.textContent = m.label;
      if (m.id === (cfg.renderMode || 'fill')) opt.selected = true;
      modeSelector.appendChild(opt);
    });
    modeSelector.onchange = (e) => {
      setFn('renderMode', e.target.value);
      if (rebuildFn) rebuildFn();
    };
    rows.push(this.makeRow('Draw Mode', modeSelector));

    // 6. Technical Overrides (for Concentric/Spiral)
    if (cfg.renderMode === 'concentric' || cfg.renderMode === 'spiral') {
      rows.push(this.makeRow('Jitter', this.makeRange(0, 1, 0.05, cfg.jitter || 0, v => setFn('jitter', +v), 'mm'), 'Varies segment lengths randomly.'));
      rows.push(this.makeRow('Edge Fade', this.makeRange(0, 10, 0.1, cfg.edgeFade || 0, v => setFn('edgeFade', +v), 'mm'), 'Power fades to zero over this distance.'));
    }

    // 7. Border
    if (opts.supportBorder) {
      rows.push(this.makeToggleRow('Show Border', cfg.border || false, v => setFn('border', v)));
    }

    return this.makeSection('General', rows);
  },

  showPatternMenu(patterns, onSelect) {
    const menu = document.getElementById('addPatternMenu');
    if (!menu) return;

    if (menu.classList.contains('show')) {
      menu.classList.remove('show');
      return;
    }

    const renderMenu = (filterText = UI._searchState) => {
      menu.innerHTML = '';
      
      const searchWrap = document.createElement('div');
      searchWrap.style.padding = '12px 16px 8px 16px';
      searchWrap.style.borderBottom = '1px solid #2a2a2a';
      searchWrap.style.position = 'sticky';
      searchWrap.style.top = '0';
      searchWrap.style.background = '#1a1a1a';
      searchWrap.style.zIndex = '10';
      searchWrap.style.display = 'flex';
      searchWrap.style.gap = '8px';
      searchWrap.style.alignItems = 'center';

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search patterns...';
      searchInput.style.flex = '1';
      searchInput.style.background = '#0d0d0d';
      searchInput.style.border = '1px solid #333';
      searchInput.style.borderRadius = '6px';
      searchInput.style.padding = '8px 12px';
      searchInput.style.color = '#fff';
      searchInput.style.fontSize = '13px';
      searchInput.value = filterText;
      
      searchInput.oninput = (e) => {
        const text = e.target.value;
        UI._searchState = text;
        renderMenu(text);
        const inp = menu.querySelector('input');
        inp.focus();
        inp.setSelectionRange(text.length, text.length);
      };

      const clearBtn = document.createElement('button');
      clearBtn.className = 'hbtn sm';
      clearBtn.innerHTML = '&times;';
      clearBtn.title = 'Clear search';
      clearBtn.style.padding = '4px 10px';
      clearBtn.style.fontSize = '16px';
      clearBtn.style.display = filterText ? 'block' : 'none';
      clearBtn.onclick = (e) => {
        e.stopPropagation();
        UI._searchState = "";
        renderMenu("");
        const inp = menu.querySelector('input');
        if (inp) inp.focus();
      };

      searchWrap.appendChild(searchInput);
      searchWrap.appendChild(clearBtn);
      menu.appendChild(searchWrap);

      const cats = [...new Set(patterns.map(p => p.cat))];
      cats.forEach(cat => {
        const lowerFilter = filterText.toLowerCase();
        const filteredPatterns = patterns.filter(p => p.cat === cat && (p.label.toLowerCase().includes(lowerFilter) || cat.toLowerCase().includes(lowerFilter)));
        if (filteredPatterns.length === 0) return;

        const col = document.createElement('div');
        col.className = 'menu-column';
        col.innerHTML = `<div class="menu-category"><span>${cat}</span></div>`;
        
        const grid = document.createElement('div');
        grid.className = 'menu-items-grid';
        
        filteredPatterns.forEach(p => {
          const item = document.createElement('div');
          item.className = 'menu-item';
          item.innerHTML = `
            <span class="menu-item-icon">${p.icon || '◈'}</span>
            <span class="menu-item-label">${p.label}</span>
          `;
          item.onclick = (e) => {
            e.stopPropagation();
            if (onSelect) onSelect(p);
            menu.classList.remove('show');
          };
          grid.appendChild(item);
        });
        col.appendChild(grid);
        menu.appendChild(col);
      });
    };

    renderMenu();
    menu.classList.add('show');
    
    const btn = document.getElementById('addPatternBtn');
    const rect = btn.getBoundingClientRect();
    const menuW = 840;
    let left = rect.left;
    if (left + menuW > window.innerWidth) left = window.innerWidth - menuW - 20;
    menu.style.left = Math.max(10, left) + 'px';
    menu.style.top = (rect.bottom + 8) + 'px';

    // Focus search input
    setTimeout(() => {
      const inp = menu.querySelector('input');
      if (inp) inp.focus();
    }, 50);

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

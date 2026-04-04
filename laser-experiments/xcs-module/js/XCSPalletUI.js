/**
 * XCSPalletUI
 * Reusable UI components for xTool palettes and color selection.
 */

export class XCSPalletUI {
  constructor(options = {}) {
    this.tooltip = options.tooltip || null;
    this.onInteraction = options.onInteraction || null;
  }

  setTooltip(tip) {
    this.tooltip = tip;
  }

  showTooltip(text, x, y) {
    if (this.tooltip && this.tooltip.show) {
      this.tooltip.show(text, x, y);
    }
  }

  hideTooltip() {
    if (this.tooltip && this.tooltip.hide) {
      this.tooltip.hide();
    }
  }

  /**
   * Creates a palette entry picker (single color).
   */
  makePalettePicker(entries, currentIdx, onChange, options = {}) {
    const { labelPrefix = "", onInteract = null, title = "", autoIndicator = false } = options;
    const wrap = document.createElement('div');
    wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '4px';
    wrap.style.position = 'relative'; wrap.style.cursor = 'pointer';

    const swatch = document.createElement('div');
    swatch.style.width = '16px'; swatch.style.height = '16px'; swatch.style.borderRadius = '3px';
    swatch.style.border = '1px solid rgba(255,255,255,0.3)';
    swatch.style.backgroundColor = entries[currentIdx]?.rgb || entries[currentIdx]?.color || 'transparent';
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
      if (!e) return title;
      const power = e.power !== undefined ? ` (${e.power}%)` : '';
      return `${title ? title + ': ' : ''}${e.label || e.name || 'Unnamed'}${power}`;
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

        const color = e.rgb || e.color || '#fff';

        item.innerHTML = `
          <div style="width:12px;height:12px;border-radius:2px;background:${color};border:1px solid rgba(255,255,255,0.1)"></div>
          <div style="flex:1">${e.label || e.name || 'Unnamed'}</div>
          <div style="color:#555;font-family:monospace">${e.power !== undefined ? e.power + '%' : ''}</div>
        `;

        item.onmouseenter = () => { item.style.background = '#333'; item.style.color = '#fff'; };
        item.onmouseleave = () => { 
          item.style.background = (i === currentIdx) ? '#2a2a2a' : 'transparent';
          item.style.color = (i === currentIdx) ? '#fff' : '#aaa';
        };

        item.onclick = (ev) => {
          ev.stopPropagation();
          swatch.style.backgroundColor = color;
          if (this.onInteraction) this.onInteraction();
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
  }

  /**
   * Creates a full range selector (Start -> End) with AUTO/MANUAL toggle.
   */
  makeColorRangeControl(cfg, setFn, rebuildFn, entries, options = {}) {
    const { title = "Color" } = options;
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
      entries, 
      cfg.paletteOffset || 0, 
      v => setFn('paletteOffset', v),
      { title: cfg.colorRangeMode ? "Start Color" : title }
    ));

    if (cfg.colorRangeMode) {
      const arrow = document.createElement('span');
      arrow.innerHTML = '&rarr;'; arrow.style.color = '#444'; arrow.style.fontSize = '10px';
      wrap.appendChild(arrow);
      wrap.appendChild(this.makePalettePicker(
        entries, 
        cfg.rangeEndIdx !== undefined ? cfg.rangeEndIdx : 10, 
        v => setFn('rangeEndIdx', v), 
        { title: "End Color" }
      ));
    }
    return wrap;
  }

  /**
   * Creates a dropdown for choosing which palette to use.
   */
  makePaletteSelector(palettes, currentId, onChange) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap = '4px';
    wrap.style.position = 'relative'; wrap.style.cursor = 'pointer';

    const currentPalette = palettes[currentId] || Object.values(palettes)[0];
    const btn = document.createElement('button');
    btn.className = 'hbtn sm';
    btn.style.minWidth = '140px';
    btn.style.textAlign = 'left';
    btn.style.justifyContent = 'space-between';
    btn.innerHTML = `<span>${currentPalette?.name || 'Select Palette'}</span> <span style="opacity:0.5;font-size:10px">▼</span>`;
    wrap.appendChild(btn);

    wrap.onclick = (e) => {
      e.stopPropagation();
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
      menu.style.minWidth = '200px';

      Object.keys(palettes).forEach(id => {
        const pal = palettes[id];
        const item = document.createElement('div');
        item.style.display = 'flex'; item.style.alignItems = 'center'; item.style.gap = '8px';
        item.style.padding = '8px 10px'; item.style.borderRadius = '4px';
        item.style.cursor = 'pointer'; item.style.fontSize = '12px';
        item.style.color = (id === currentId) ? '#fff' : '#aaa';
        item.style.background = (id === currentId) ? '#2a2a2a' : 'transparent';

        const isIR = pal.laser === 'ir' || pal.name.toUpperCase().includes('IR');
        const laserColor = isIR ? '#ff4444' : '#4444ff';

        item.innerHTML = `
          <div style="width:8px;height:8px;border-radius:50%;background:${laserColor}"></div>
          <div style="flex:1">${pal.name}</div>
          <div style="font-size:9px;opacity:0.5">${pal.entries.length} steps</div>
        `;

        item.onmouseenter = () => { item.style.background = '#333'; item.style.color = '#fff'; };
        item.onmouseleave = () => { item.style.background = (id === currentId) ? '#2a2a2a' : 'transparent'; item.style.color = (id === currentId) ? '#fff' : '#aaa'; };
        item.onclick = (e) => {
          e.stopPropagation();
          onChange(id);
          document.body.removeChild(menu);
        };
        menu.appendChild(item);
      });

      const rect = wrap.getBoundingClientRect();
      document.body.appendChild(menu);
      const mRect = menu.getBoundingClientRect();
      let top = rect.bottom + 4;
      if (top + mRect.height > window.innerHeight) top = rect.top - mRect.height - 4;
      menu.style.top = top + 'px';
      menu.style.left = Math.max(10, rect.left) + 'px';

      const close = (e) => {
        if (!menu.contains(e.target)) {
          if (document.body.contains(menu)) document.body.removeChild(menu);
          window.removeEventListener('mousedown', close);
        }
      };
      window.addEventListener('mousedown', close);
    };

    return wrap;
  }
}

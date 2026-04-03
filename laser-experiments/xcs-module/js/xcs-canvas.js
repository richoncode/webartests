/**
 * XCSCanvas — Encapsulated SVG renderer for XCSProject / XCSItem data.
 *
 * Architecture contract:
 *   - ALL SVG element creation, transforms, and rendering logic lives here.
 *   - Consumers (index.html, pattern-tool, halftone, etc.) call:
 *       const canvas = new XCSCanvas(containerEl, popoverEl);
 *       canvas.render(project);
 *   - The XCS data layer (xcs-system.js) is never touched by this file.
 *
 * Coordinate system:
 *   - The SVG viewBox matches the physical bed in mm (default 100×100).
 *   - XCS charJSON paths use Y-up glyph coordinates; we negate scaleY here
 *     so they render upright in SVG's Y-down space.
 *
 * Stable checkpoint: xcs-text-stable-v1 (scale=fontSize/72, height=22.76*scale)
 */

export class XCSCanvas {
  /**
   * @param {SVGElement}     svgEl      - The <svg> element that owns the viewBox.
   * @param {Element}        contentEl  - The <g id="svgContent"> to render items into.
   * @param {Element}        popoverEl  - Floating popover element for hover info.
   * @param {Object}         [opts]
   * @param {number}         [opts.bedWidth=100]   Physical bed width in mm.
   * @param {number}         [opts.bedHeight=100]  Physical bed height in mm.
   */
  constructor(svgEl, contentEl, popoverEl, { bedWidth = 100, bedHeight = 100 } = {}) {
    this._svg      = svgEl;
    this._content  = contentEl;
    this._pop      = popoverEl;
    this._bedW     = bedWidth;
    this._bedH     = bedHeight;

    // Callback hooks — set by consumers for dashboard-specific behaviour.
    /** @type {((item: object, svgEl: Element, event: MouseEvent) => void) | null} */
    this.onItemEnter = null;
    /** @type {((item: object, svgEl: Element, event: MouseEvent) => void) | null} */
    this.onItemLeave = null;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Remove all rendered items from the canvas. */
  clear() {
    this._content.innerHTML = '';
  }

  /**
   * Render an XCSProject onto the canvas.
   * Clears previous content first.
   * @param {object} project — An XCSProject instance (has .getItems()).
   */
  render(project) {
    this.clear();
    const items = project.getItems();
    items.forEach(item => {
      const el = this._renderItem(item);
      if (el) {
        this._attachHover(el, item);
        this._content.appendChild(el);
      }
    });
    return items.length;
  }

  // ─── Item Dispatch ──────────────────────────────────────────────────────────

  _renderItem(item) {
    const p = item.getRenderProps();
    let el;

    switch (p.type) {
      case 'RECT':
      case 'IMAGE':
        el = this._renderRect(p);
        break;
      case 'CIRCLE':
        el = this._renderCircle(p);
        break;
      case 'PATH':
        el = this._renderPath(p);
        break;
      case 'TEXT':
        el = this._renderText(item, p);
        break;
      case 'BITMAP':
        el = this._renderBitmap(p);
        break;
      default:
        console.warn('[XCSCanvas] Unknown item type:', p.type);
        return null;
    }

    if (!el) return null;

    // Shared: apply stroke/fill for non-TEXT, non-BITMAP primitives
    if (p.type !== 'TEXT' && p.type !== 'BITMAP') {
      el.setAttribute('fill', p.isFill ? p.layerColor : 'transparent');
      el.setAttribute('stroke', p.layerColor);
      el.setAttribute('stroke-width', '0.4');
      el.style.pointerEvents = 'auto';
      el.style.cursor = 'help';
    }

    // testId for cross-highlight with unit test rows
    const testId = item.display?.testId;
    if (testId) el.setAttribute('data-test-id', testId);

    return el;
  }

  // ─── Shape Renderers ────────────────────────────────────────────────────────

  _renderRect(p) {
    const el = this._svgEl('rect');
    el.setAttribute('x', p.x - p.w / 2);
    el.setAttribute('y', p.y - p.h / 2);
    el.setAttribute('width', p.w);
    el.setAttribute('height', p.h);
    return el;
  }

  _renderCircle(p) {
    const el = this._svgEl('circle');
    el.setAttribute('cx', p.x);
    el.setAttribute('cy', p.y);
    el.setAttribute('r', p.w / 2);
    return el;
  }

  _renderPath(p) {
    const el = this._svgEl('path');
    el.setAttribute('d', p.dPath);
    el.setAttribute('transform', `translate(${p.x - p.w / 2}, ${p.y - p.h / 2})`);
    return el;
  }

  /**
   * Render a TEXT item.
   *
   * XCS export encodes glyph paths in Y-up coordinates with positive scale.
   * SVG uses Y-down; we apply scale(sx, -sy) per charJSON to flip upright.
   * This transform is browser-only — the exported .xcs file retains the
   * original Y-up paths that XCS Studio handles natively.
   *
   * @param {object} item  - Full XCSItem (needs item.display.charJSONs).
   * @param {object} p     - Render props from item.getRenderProps().
   */
  _renderText(item, p) {
    const g = this._svgEl('g');
    const charJSONs = item.display?.charJSONs ?? [];

    charJSONs.forEach(c => {
      const path = this._svgEl('path');
      path.setAttribute('d', c.dPath);
      // Y-up → Y-down: negate scaleY so glyphs render upright in SVG.
      path.setAttribute('transform',
        `translate(${c.x}, ${c.y}) scale(${c.scale.x}, ${-c.scale.y})`);
      path.setAttribute('fill', p.layerColor);
      g.appendChild(path);
    });

    // Text group needs pointer events for hover
    g.style.pointerEvents = 'bounding-box';
    g.style.cursor = 'help';
    return g;
  }

  /**
   * Render a BITMAP item.
   * Draws a dashed bounding box + the base64 image.
   */
  _renderBitmap(p) {
    const g = this._svgEl('g');

    // Dashed bounding box
    const bg = this._svgEl('rect');
    bg.setAttribute('x', p.x - p.w / 2);
    bg.setAttribute('y', p.y - p.h / 2);
    bg.setAttribute('width', p.w);
    bg.setAttribute('height', p.h);
    bg.setAttribute('fill', 'transparent');
    bg.setAttribute('stroke', p.layerColor);
    bg.setAttribute('stroke-width', '0.2');
    bg.setAttribute('stroke-dasharray', '1, 1');
    g.appendChild(bg);

    // Raster image
    const img = this._svgEl('image');
    img.setAttribute('x', p.x - p.w / 2);
    img.setAttribute('y', p.y - p.h / 2);
    img.setAttribute('width', p.w);
    img.setAttribute('height', p.h);
    img.setAttribute('preserveAspectRatio', 'none');
    img.setAttribute('href', p.base64);
    // SVG 1.1 xlink fallback for broader compatibility
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', p.base64);
    img.style.opacity = '1';
    img.style.visibility = 'visible';
    img.style.imageRendering = 'pixelated';
    g.appendChild(img);

    g.style.pointerEvents = 'auto';
    g.style.cursor = 'help';
    return g;
  }

  // ─── Hover / Popover ────────────────────────────────────────────────────────

  /**
   * Attach mouseenter / mousemove / mouseleave to a rendered SVG element.
   * Hover callbacks are used by the dashboard to cross-highlight test rows.
   * Popover rendering is handled here since it's driven by item render props.
   */
  _attachHover(el, item) {
    const p      = item.getRenderProps();
    const testId = item.display?.testId;

    el.addEventListener('mouseenter', e => {
      if (this.onItemEnter) this.onItemEnter(item, el, e);
      this._showPopover(p);
    });

    el.addEventListener('mousemove', e => {
      if (this._pop) {
        this._pop.style.display  = 'block';
        this._pop.style.left     = (e.clientX + 15) + 'px';
        this._pop.style.top      = (e.clientY + 15) + 'px';
        this._pop.style.position = 'fixed';
      }
    });

    el.addEventListener('mouseleave', e => {
      if (this.onItemLeave) this.onItemLeave(item, el, e);
      if (this._pop) this._pop.style.display = 'none';
    });
  }

  _showPopover(p) {
    if (!this._pop) return;
    this._pop.style.display = 'block';
    this._pop.innerHTML = `
      <div style="color:var(--primary); font-weight:bold; margin-bottom:4px">${p.type}</div>
      <div style="display:grid; grid-template-columns: 50px 1fr; gap: 4px;">
        <span>MODE:</span> <span style="color:var(--warning)">${p.processingType}</span>
        <span>POS:</span>  <span>${p.x.toFixed(1)}, ${p.y.toFixed(1)}</span>
        <span>SIZE:</span> <span>${p.w.toFixed(1)}×${p.h.toFixed(1)}</span>
        <span>LAYER:</span><span style="color:${p.layerColor}">${p.layerColor}</span>
        <span>PWR:</span>  <span>${p.power}%</span>
        <span>SPD:</span>  <span>${p.speed} mm/s</span>
        <span>LPCM:</span> <span>${p.density}</span>
      </div>
    `;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Create an SVG element in the correct namespace. */
  _svgEl(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
  }
}

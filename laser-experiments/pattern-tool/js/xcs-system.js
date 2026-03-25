/**
 * XCSSystem - Unified Model for XCS Projects and Items
 * Centralizes all internal XCS logic, anchoring math, and parameter mapping.
 */
import { uuid } from './utils.js';
import { LATO_REGULAR_GLYPHS, LATO_REGULAR_INFO } from './xcs-glyphs.js';

/**
 * Represents an individual element in an XCS canvas.
 * Encapsulates both Display (Visual) and Laser (Machine) nodes.
 */
export class XCSItem {
  constructor(displayNode, laserNode, idx = 0) {
    this.display = displayNode;
    this.laser = laserNode;
    this.idx = idx;
  }

  get id() { return this.display.id; }
  get type() { return this.display.type; }

  /**
   * Returns a normalized representation for the Viewer.
   * Agnostic of XCS file structure.
   */
  getRenderProps() {
    const d = this.display;
    const l = this.laser || { data: {} };
    const pt = l.processingType || '';
    
    // Always resolve parameters from the active operation node to ensure they match the machine state
    const opNode = l.data?.[pt] || {};
    const pm = opNode.parameter?.customize || {};
    const src = pm.processingLightSource || null;
    const laser = (src === 'red' || src === 'ir') ? 'ir' : src;

    return {
      idx: this.idx,
      id: d.id,
      type: d.type,
      x: d.x,
      y: d.y,
      w: d.width,
      h: d.height,
      angle: d.angle || 0,
      layerColor: d.layerColor || '#5b9bd5',
      zOrder: d.zOrder || 0,
      isFill: !!d.isFill,
      processingType: pt,
      power: pm.power ?? null,
      speed: pm.speed ?? null,
      density: pm.density ?? pm.dpi ?? null,
      repeat: pm.repeat ?? 1,
      laser: laser,
      t: d.t ?? null,
      hideLabels: !!d.hideLabels,
      ix: d.ix ?? null,
      iy: d.iy ?? null,
      paletteName: d.paletteName || null,
      colorName: d.colorName || null,
      text: d.text || null,
      style: d.style || null,
      dPath: d.dPath || null,
      scale: d.scale || { x: 1, y: 1 }
    };
  }

  /**
   * Updates laser parameters for this item.
   */
  updateParams(params) {
    const pt = this.laser.processingType;
    if (pt && this.laser.data[pt] && this.laser.data[pt].parameter) {
      Object.assign(this.laser.data[pt].parameter.customize, params);
    }
  }

  // --- Factory Helpers (MANDATORY for Hardware Compatibility) ---

  static createDisplayNode(id, type, options, layerColor, processingType, zOrder) {
    const isFill = processingType.includes("FILL") || (processingType.includes("ENGRAVE") && !processingType.includes("VECTOR_ENGRAVING"));
    
    const node = {
      id, name: null, type, x: options.x, y: options.y, 
      width: options.width, height: options.height, 
      angle: options.angle || 0,
      scale: options.scale || { x: 1, y: 1 }, 
      skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
      offsetX: options.x, offsetY: options.y, lockRatio: options.lockRatio ?? true, isClosePath: true,
      zOrder, sourceId: id, groupTag: uuid(), layerTag: layerColor,
      layerColor: layerColor, visible: true, originColor: "#000000",
      enableTransform: true, visibleState: true, lockState: false,
      resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
      isFill, lineColor: 0, fillColor: layerColor,
      ...options.extraDisplayData
    };

    if (type === 'PATH') node.dPath = options.dPath;
    if (type === 'TEXT') {
      XCSText.bake(node, options, layerColor);
    }

    return node;
  }

  static createLaserNode(id, type, options, laserSource, processingType) {
    const isFill = processingType.includes("FILL") || (processingType.includes("ENGRAVE") && !processingType.includes("VECTOR_ENGRAVING"));
    const planType = laserSource === 'red' ? 'red' : 'blue';
    
    // Core parameters from palette or defaults
    const pm = { 
      power: 20, speed: 100, density: 1000, repeat: 1,
      processingLightSource: laserSource, bitmapScanMode: "zMode", needGapNumDensity: true,
      dotDuration: 100, dpi: 500, enableKerf: false, kerfDistance: 0,
      ...(options.params || {})
    };

    return {
      isFill, type, processingType, processIgnore: false, isWhiteModel: !isFill,
      data: {
        VECTOR_CUTTING: this.createOpNode("VECTOR_CUTTING", planType, laserSource, pm),
        VECTOR_ENGRAVING: type === 'TEXT' ? {
          materialType: "official",
          planType,
          parameter: {
            customize: { ...pm, power: pm.power || 1, speed: pm.speed || 20 },
            official: { power: 90, speed: 500, repeat: 1, processingLightSource: laserSource, enableKerf: false, kerfDistance: 0 }
          }
        } : this.createOpNode("VECTOR_ENGRAVING", planType, laserSource, pm),
        FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        INTAGLIO: this.createOpNode("INTAGLIO", planType, laserSource, pm)
      }
    };
  }

  static createOpNode(type, planType, laserSource, overrides = {}) {
    const base = { 
      power: 1, speed: 16, repeat: 1, 
      processingLightSource: laserSource,
      ...overrides 
    };

    const node = {
      materialType: "customize",
      planType: planType,
      parameter: { customize: base }
    };

    // Add specific fields for Engrave mode if not present
    if (type === "COLOR_FILL_ENGRAVE") {
      Object.assign(node.parameter.customize, {
        density: overrides.density || 300,
        dotDuration: 100,
        dpi: overrides.density || 500,
        bitmapScanMode: "zMode",
        notResize: true,
        scanAngle: 0,
        angleType: 2,
        crossAngle: false
      });
    }

    return node;
  }
}

/**
 * Standard geometric shape (RECT, CIRCLE, PATH, IMAGE).
 */
export class XCSShape extends XCSItem {}

/**
 * Specialized text object with baked glyph paths for hardware compatibility.
 */
export class XCSText extends XCSItem {
  /**
   * Hydrates a display node with baked character paths and font metadata.
   * MANDATORY for xTool F2 hardware compatibility.
   */
  static bake(node, options, layerColor) {
    const { text, x, y, align = "center", angle = 0 } = options;
    const scale = typeof options.scale === 'number' ? options.scale : (options.scale?.y || 1.0);
    const sx = scale, sy = scale;

    const charJSONs = [];
    const glyphs = text.split('').map(char => LATO_REGULAR_GLYPHS[char] || LATO_REGULAR_GLYPHS[" "]);
    
    let totalAdvance = 0;
    glyphs.forEach(g => totalAdvance += g.advanceWidth);
    const totalWidth = totalAdvance * sx;

    let ax = x, ay = y;
    if (align === "center") {
      if (angle === -90) ay = y + totalWidth / 2;
      else ax = x - totalWidth / 2;
    } else if (align === "right") {
      if (angle === -90) ay = y + totalWidth;
      else ax = x - totalWidth;
    }

    // Update node anchor
    node.x = ax; node.y = ay;

    let minBX = Infinity, minBY = Infinity, maxBX = -Infinity, maxBY = -Infinity;
    let relX = 0;
    for (const g of glyphs) {
      if (g.bbox) {
        minBX = Math.min(minBX, relX + g.bbox.minX);
        maxBX = Math.max(maxBX, relX + g.bbox.maxX);
        minBY = Math.min(minBY, -g.bbox.maxY);
        maxBY = Math.max(maxBY, -g.bbox.minY);
      }
      relX += g.advanceWidth;
    }
    if (minBX === Infinity) { minBX = 0; maxBX = totalWidth / sx; minBY = -18; maxBY = 0; }
    
    const totalW = (maxBX - minBX) * sx;
    const totalH = (maxBY - minBY) * sy;
    node.width = totalW; node.height = totalH;
    node.offsetX = ax + (minBX + maxBX) / 2 * sx;
    node.offsetY = ay + (minBY + maxBY) / 2 * sy;

    let currentRelativeX = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = glyphs[i];
      const cx = ax + (currentRelativeX * sx);
      const cy = ay;
      
      const charW = glyph.bbox ? (glyph.bbox.maxX - glyph.bbox.minX) * sx : 0;
      const charH = glyph.bbox ? (glyph.bbox.maxY - glyph.bbox.minY) * sy : 0;
      const lCX = glyph.bbox ? (glyph.bbox.minX + glyph.bbox.maxX) / 2 * sx : 0;
      const lCY = glyph.bbox ? (-glyph.bbox.maxY - glyph.bbox.minY) / 2 * sy : 0;

      charJSONs.push({
        id: uuid(), name: null, type: "PATH", x: cx, y: cy, angle: 0,
        scale: { x: sx, y: sy }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: cx + lCX, offsetY: cy + lCY, lockRatio: true, isClosePath: true,
        zOrder: 0, groupTag: uuid(), layerTag: layerColor, layerColor: layerColor,
        visible: true, originColor: "#000000", enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        width: charW, height: charH,
        isFill: false, lineColor: 0, fillColor: layerColor,
        points: [], dPath: glyph.dPath, fillRule: "nonzero",
        graphicX: cx, graphicY: cy, isCompoundPath: false
      });
      currentRelativeX += glyph.advanceWidth;
    }

    Object.assign(node, {
      charJSONs,
      fontData: { fontInfo: LATO_REGULAR_INFO, glyphData: LATO_REGULAR_GLYPHS },
      text, resolution: 1,
      style: {
        fontSize: options.fontSize, fontFamily: "Lato", fontSubfamily: "Regular", fontSource: "build-in",
        letterSpacing: 0, leading: 0, align: "left", curveX: 56, curveY: 0,
        isUppercase: false, isWeld: false, direction: "auto", writingMode: "horizontal-tb", textOrientation: "mixed"
      }
    });
  }
}

/**
 * Represents a complete XCS Project.
 * Manages the tree of canvases and device processing maps.
 */
export class XCSProject {
  constructor(canvasId = uuid()) {
    this.canvasId = canvasId;
    const canvasObj = {
      id: canvasId,
      title: "{panel}1",
      layerData: {},
      groupData: {},
      displays: []
    };
    this.canvas = [canvasObj]; // Legacy compatibility (array)
    this.device = {
      id: "GS006",
      power: [5, 15],
      data: {
        dataType: "Map",
        value: [[
          canvasId,
          {
            mode: "LASER_PLANE",
            data: {
              LASER_PLANE: {
                material: 2544, // 304 Stainless Steel
                lightSourceMode: "blue",
                thickness: 0.3,
                isProcessByLayer: false,
                pathPlanning: "auto",
                fillPlanning: "separate",
                scanDirection: "topToBottom",
                enableOddEvenKerf: true,
                xcsUsed: ["glbModel", "purifierV3Gear"]
              }
            },
            displays: {
              dataType: "Map",
              value: []
            }
          }
        ]]
      }
    };
    this.root = {
      canvasId: this.canvasId,
      canvas: this.canvas,
      device: this.device,
      extId: "GS006",
      extName: "F2",
      version: "1.5.8",
      minRequiredVersion: "2.6.0",
      created: Date.now(),
      modify: Date.now(),
      projectTraceID: uuid()
    };
  }

  /**
   * Adds an item to the project.
   */
  addItem(type, options) {
    const id = uuid();
    const layerColor = options.layerColor || "#5b9bd5";
    
    // Abstract the processing type away from the components
    let processingType = options.processingType; 
    if (!processingType) {
      if (options.isFill === true) processingType = "COLOR_FILL_ENGRAVE";
      else if (options.isFill === false) processingType = "VECTOR_ENGRAVING";
      else processingType = type === 'TEXT' ? "VECTOR_ENGRAVING" : "COLOR_FILL_ENGRAVE";
    }

    const laserSource = options.laserSource || "red";
    const canvas = this.canvas[0];
    
    // 1. Register Layer
    if (!canvas.layerData[layerColor]) {
      canvas.layerData[layerColor] = {
        name: layerColor,
        order: Object.keys(canvas.layerData).length + 1,
        visible: true
      };
    }

    // 2. Create Display Node
    const zOrder = canvas.displays.length;
    const display = XCSItem.createDisplayNode(id, type, options, layerColor, processingType, zOrder);
    canvas.displays.push(display);

    // 3. Create Laser Node (Processing Config)
    const laser = XCSItem.createLaserNode(id, type, options, laserSource, processingType);
    const dvEntry = this.device.data.value[0][1];
    dvEntry.displays.value.push([id, laser]);

    // 4. Return appropriate subclass instance
    return (type === 'TEXT') ? new XCSText(display, laser, zOrder) : new XCSShape(display, laser, zOrder);
  }

  /**
   * Safe setter for layer metadata.
   */
  setLayerName(color, name) {
    const canvas = this.canvas[0];
    if (!canvas.layerData[color]) {
      canvas.layerData[color] = { order: Object.keys(canvas.layerData).length + 1, visible: true };
    }
    canvas.layerData[color].name = name;
  }

  /**
   * Safe setter for hardware path planning strategy.
   */
  setPathPlanning(mode) {
    const dvEntry = this.device.data.value[0][1];
    if (mode === 'custom') {
      dvEntry.data.LASER_PLANE.isProcessByLayer = true;
      dvEntry.data.LASER_PLANE.pathPlanning = "custom";
    } else {
      dvEntry.data.LASER_PLANE.isProcessByLayer = false;
      dvEntry.data.LASER_PLANE.pathPlanning = "auto";
    }
  }

  getItems() {
    const dvEntry = this.device.data.value[0][1];
    const dispMap = Object.fromEntries(dvEntry.displays.value);
    return this.canvas[0].displays.map((d, i) => {
      const laser = dispMap[d.id];
      return (d.type === 'TEXT') ? new XCSText(d, laser, i) : new XCSShape(d, laser, i);
    });
  }

  /**
   * Returns a summary of unique laser parameter combinations used in the project.
   */
  getSummary() {
    const combos = new Map();
    const items = this.getItems();
    
    items.forEach(item => {
      const s = item.getRenderProps();
      const key = `${s.power}|${s.speed}|${s.density}|${s.repeat}|${s.laser}`;
      if (!combos.has(key)) {
        combos.set(key, {
          power: s.power,
          speed: s.speed,
          density: s.density,
          repeat: s.repeat,
          laser: s.laser,
          count: 0,
          types: new Set()
        });
      }
      const c = combos.get(key);
      c.count++;
      c.types.add(s.type);
    });
    
    return [...combos.values()];
  }

  toJSON() {
    this.root.modify = Date.now();
    return this.root;
  }

  /**
   * Static factory to recreate a project from a JSON object.
   */
  static fromJSON(data) {
    if (!data || !data.canvas || !data.canvas[0]) return null;
    const project = new XCSProject(data.canvasId);
    project.root = data;
    project.canvas = data.canvas[0];
    project.device = data.device;
    project.canvasId = data.canvasId;
    return project;
  }
}

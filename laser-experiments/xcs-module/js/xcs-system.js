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

    // Calculate technical path length (mm)
    let totalLength = 0;
    if (d.type === 'RECT') totalLength = 2 * (d.width + d.height);
    else if (d.type === 'CIRCLE') totalLength = Math.PI * d.width;
    else if (d.type === 'PATH' && d.dPath) {
      totalLength = XCSItem.calculatePathLength(d.dPath);
    }

    return {
      idx: this.idx,
      id: d.id,
      type: d.type,
      x: d.x,
      y: d.y,
      w: d.width,
      h: d.height,
      totalLength,
      aggregateLength: d.aggregateLength ?? null,
      angle: d.angle || 0,
      layerColor: d.layerColor || '#5b9bd5',
      zOrder: d.zOrder || 0,
      isFill: !!d.isFill,
      fillRule: d.fillRule || null,
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
      scale: d.scale || { x: 1, y: 1 },
      base64: d.base64 || null
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

  /**
   * Technical Helper: Calculates approximate length of an SVG path (mm).
   */
  static calculatePathLength(dPath) {
    if (!dPath) return 0;
    let total = 0;
    let curX = 0, curY = 0, startX = 0, startY = 0;
    const commands = dPath.split(/(?=[MLQCSTAZHVmlqcstahvz])/);

    commands.forEach(cmd => {
      const type = cmd[0];
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(v => !isNaN(v));

      const dist = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

      if (type === 'M' || type === 'm') {
        curX = args[0]; curY = args[1];
        startX = curX; startY = curY;
      } else if (type === 'L' || type === 'l') {
        for (let i = 0; i < args.length; i += 2) {
          total += dist(curX, curY, args[i], args[i + 1]);
          curX = args[i]; curY = args[i + 1];
        }
      } else if (type === 'Q' || type === 'q') {
        for (let i = 0; i < args.length; i += 4) {
          // Linear approximation for quadratic (control point mid-split)
          const midX = (curX + 2 * args[i] + args[i + 2]) / 4;
          const midY = (curY + 2 * args[i + 1] + args[i + 3]) / 4;
          total += dist(curX, curY, midX, midY) + dist(midX, midY, args[i + 2], args[i + 3]);
          curX = args[i + 2]; curY = args[i + 3];
        }
      } else if (type === 'Z' || type === 'z') {
        total += dist(curX, curY, startX, startY);
        curX = startX; curY = startY;
      }
    });
    return total;
  }

  // --- Factory Helpers (MANDATORY for Hardware Compatibility) ---

  static createDisplayNode(id, type, options, layerColor, processingType, zOrder) {
    // Normalization: Remap generic or unsupported types to hardware-compliant primitives
    if (type === 'IMAGE') type = 'RECT';

    const isFill = type === 'BITMAP' || processingType.includes("FILL") || (processingType.includes("ENGRAVE") && !processingType.includes("VECTOR_ENGRAVING"));
    
    const node = {
      id, name: null, type, x: options.x, y: options.y, 
      width: options.width, height: options.height, 
      angle: options.angle || 0,
      scale: options.scale || { x: 1, y: 1 }, 
      skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
      offsetX: options.x, 
      offsetY: options.y, 
      lockRatio: options.lockRatio ?? true, isClosePath: type !== 'BITMAP',
      zOrder, sourceId: id, groupTag: uuid(), layerTag: layerColor,
      layerColor: layerColor, visible: true, originColor: "#000000",
      enableTransform: true, visibleState: true, lockState: false,
      resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
      isFill, lineColor: 0, fillColor: layerColor,
      ...options.extraDisplayData
    };

    if (type === 'PATH') {
      node.dPath = options.dPath;
      node.fillRule = options.extraDisplayData?.fillRule || "nonzero";
    }
    if (type === 'TEXT') {
      XCSText.bake(node, options, layerColor);
    }
    if (type === 'BITMAP') {
      node.base64 = options.base64;
      node.originWidth = options.originWidth || 64; 
      node.originHeight = options.originHeight || 64; 
      node.dpi = options.dpi || { dpiX: 25.4, dpiY: 25.4 };
      // Normalization: XCS treats pixels as mm (1.0 scale). We must scale down to the requested mm size.
      node.scale = { x: options.width / node.originWidth, y: options.height / node.originHeight };
      node.grayValue = [0, 255];
      node.sharpness = 50;
      node.brightness = 0;
      node.contrast = 0;
      node.saturation = 0;
      node.temperature = 0;
      node.tone = 0;
      node.colorInverted = false;
      node.filterList = [];
      node.filterAttrsMap = {
        emboss: { strength: 5 },
        halftone: { radius: 4, angle: 45 },
        binary: { threshold: 128 },
        sketch: { strength: 2 },
        dot: { angle: 45, scale: 14 }
      };
    }

    return node;
  }

  static createLaserNode(id, type, options, laserSource, processingType) {
    const isFill = type === 'BITMAP' || processingType.includes("FILL") || (processingType.includes("ENGRAVE") && !processingType.includes("VECTOR_ENGRAVING"));
    
    // Priority: 1. params.processingLightSource, 2. the explicit laserSource parameter
    const actualSource = options.params?.processingLightSource || laserSource;
    const planType = actualSource === 'red' ? 'red' : 'blue';
    
    // Core parameters from palette or defaults
    const pm = { 
      power: 20, speed: 100, density: 1000, repeat: 1,
      processingLightSource: actualSource, bitmapScanMode: "oneWay", needGapNumDensity: true,
      dotDuration: 100, dpi: 500, enableKerf: false, kerfDistance: 0,
      ...(options.params || {})
    };

    const laserNode = {
      isFill, type, processingType, processIgnore: false, isWhiteModel: type === 'BITMAP' ? true : !isFill,
      data: {
        VECTOR_CUTTING: this.createOpNode("VECTOR_CUTTING", planType, actualSource, pm),
        VECTOR_ENGRAVING: (type === 'BITMAP' || isFill) ? {
          materialType: "customize",
          planType: planType,
          parameter: {
            customize: { ...pm, power: pm.power || 1, speed: pm.speed || 20 },
            official: { power: 90, speed: 500, repeat: 1, processingLightSource: actualSource, enableKerf: false, kerfDistance: 0 }
          }
        } : this.createOpNode("VECTOR_ENGRAVING", planType, actualSource, pm),
        FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        INTAGLIO: this.createOpNode("INTAGLIO", planType, actualSource, pm)
      }
    };

    if (type === 'BITMAP') {
      laserNode.data.BITMAP_ENGRAVING = this.createOpNode("BITMAP_ENGRAVING", planType, actualSource, pm);
      laserNode.data.RELIEF = this.createOpNode("RELIEF", planType, actualSource, pm);
      laserNode.data.COLOR_ENGRAVE = this.createOpNode("COLOR_ENGRAVE", planType, actualSource, pm);
    }

    return laserNode;
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
        bitmapScanMode: "oneWay",
        notResize: true,
        scanAngle: 0,
        angleType: 2,
        crossAngle: false
      });
    }

    if (type === "BITMAP_ENGRAVING") {
      Object.assign(node.parameter.customize, {
        bitmapMode: overrides.bitmapMode || "grayscale",
        bitmapScanMode: overrides.bitmapScanMode || "oneWay",
        bitmapEngraveMode: overrides.bitmapEngraveMode || "dot",
        dotDuration: overrides.dotDuration || 200,
        dpi: overrides.dpi || 847,
        powerMinMaxRange: overrides.powerMinMaxRange || [overrides.power || 65, overrides.power || 65]
      });
    }

    if (type === "RELIEF") {
      Object.assign(node.parameter.customize, {
        bitmapScanMode: "zMode",
        sliceNumber: 256,
        density: 100,
        processAngle: 15,
        zAxisMove: false,
        zLayers: 1,
        zDecline: 0.01,
        reliefCleanUp: false,
        cleanUpLayers: 256,
        cleanUpPower: 1,
        cleanUpSpeed: 80,
        cleanUpRepeat: 1,
        cleanUpDensity: 100,
        cleanUpProcessAngle: 15
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
 * Bitmap image object.
 */
export class XCSBitmap extends XCSItem {}

/**
 * Specialized text object with baked glyph paths for hardware compatibility.
 */
export class XCSText extends XCSItem {
  /**
   * Flips all Y-coordinates in an SVG path string by negating them.
   * Converts Y-up glyph data to Y-down so XCS Studio renders without mirroring.
   */
  static flipPathY(dPath) {
    // Matches SVG path commands and their numeric arguments, negates all Y values.
    // Handles absolute commands: M, L, Q, C, A, V and their relative counterparts.
    return dPath.replace(
      /([MLQCSTAZHVmlqcstahvz])|([+-]?\d*\.?\d+)/g,
      (token, cmd, num) => {
        if (cmd) { return token; } // pass through command letters
        return token; // handled below per-command
      }
    );
  }

  /**
   * Negates all Y values in an SVG absolute path by parsing command by command.
   */
  static negateY(dPath) {
    // Simple regex-based negation: for each number following a command that has Y args,
    // negate every second number. This covers M, L, Q, C, T, S, and relative equivalents.
    // Strategy: replace every number, tracking odd/even position per command segment.
    const result = [];
    // Tokenise into [command, ...numbers] chunks
    const chunks = dPath.trim().split(/(?=[MLQCSTAZHVmlqcstahvz])/);
    for (const chunk of chunks) {
      const cmd = chunk[0];
      const nums = chunk.slice(1).trim().split(/[\s,]+/).filter(Boolean);
      if (!cmd || cmd === 'Z' || cmd === 'z') { result.push(cmd || ''); continue; }
      const negated = [];
      const upper = cmd.toUpperCase();
      for (let i = 0; i < nums.length; i++) {
        const v = parseFloat(nums[i]);
        let negate = false;
        // Commands where Y is the 2nd of each pair: M,L,T
        if ((upper === 'M' || upper === 'L' || upper === 'T') && i % 2 === 1) negate = true;
        // Q: x1 y1 x y — negate indices 1,3
        if (upper === 'Q' && (i % 4 === 1 || i % 4 === 3)) negate = true;
        // C: x1 y1 x2 y2 x y — negate indices 1,3,5
        if (upper === 'C' && (i % 6 === 1 || i % 6 === 3 || i % 6 === 5)) negate = true;
        // S: x2 y2 x y — negate indices 1,3
        if (upper === 'S' && (i % 4 === 1 || i % 4 === 3)) negate = true;
        // V: single value is Y
        if (upper === 'V') negate = true;
        // A: rx ry x-rot large-arc sweep x y — negate index 6 (7th)
        if (upper === 'A' && i % 7 === 6) negate = true;
        // H: single value is X — never negate
        negated.push(negate ? String(-v) : String(v));
      }
      result.push(cmd + negated.join(' '));
    }
    return result.join('');
  }

  /**
   * Hydrates a display node with baked character paths and font metadata.
   * MANDATORY for xTool F2 hardware compatibility.
   */
  static bake(node, options, layerColor) {
    const { text, x, y, align = "center", angle = 0 } = options;
    const glyphs = text.split('').map(char => LATO_REGULAR_GLYPHS[char] || LATO_REGULAR_GLYPHS[" "]);
    
    let totalAdvance = 0;
    glyphs.forEach(g => totalAdvance += g.advanceWidth);

    // Normalization: scale ↔ fontSize equivalence
    // XCS Studio native formula: 72pt = scale 1.0 (glyph paths are in pt units at 72pt baseline)
    // scale = desiredFontSize / 72
    // When width-constrained: derive fontSize from width coverage, then scale from that.
    let derivedFontSize, scale;
    if (options.fontSize) {
      derivedFontSize = options.fontSize;
      scale = options.fontSize / 72;
    } else if (options.width) {
      // Fit text to width: advanceWidth units * scale = width(mm)
      // We need: totalAdvance * scale = width
      // But scale = fontSize/72, and 1 font unit ≈ 1mm at scale 1
      // So: fontSize = width / totalAdvance * 72
      derivedFontSize = (options.width / totalAdvance) * 72;
      scale = options.width / totalAdvance;
    } else {
      derivedFontSize = 24;
      scale = 24 / 72;
    }
    const sx = scale, sy = scale;
    // CRITICAL: Set parent node scale — XCS Studio derives the UI pt value from this.
    // Formula: displayed_pt = node.scale.x * 72. Without this, XCS shows 72pt for everything.
    node.scale = { x: sx, y: sy };
    const totalWidth = totalAdvance * sx;
    const charJSONs = [];

    let ax = x, ay = y;
    if (align === "center") {
      if (angle === -90) ay = y + totalWidth / 2;
      else ax = x - totalWidth / 2;
    } else if (align === "right") {
      if (angle === -90) ay = y + totalWidth;
      else ax = x - totalWidth;
    }

    // Compute width from glyph advance widths (sum of advanceWidth * scale)
    // Height formula verified from native XCS reference:
    //   height = XCS_LINE_HEIGHT * scale, where XCS_LINE_HEIGHT = 22.76 font units
    //   This constant holds across all font sizes (6, 12, 20, 36, 48, 72pt). 
    const XCS_LINE_HEIGHT = 22.76;
    let minBX = Infinity, maxBX = -Infinity;
    let relX = 0;
    for (const g of glyphs) {
      if (g.bbox && g.bbox.minX != null) {
        minBX = Math.min(minBX, relX + g.bbox.minX);
        maxBX = Math.max(maxBX, relX + g.bbox.maxX);
      }
      relX += g.advanceWidth;
    }
    if (minBX === Infinity) { minBX = 0; maxBX = totalAdvance; }

    const totalW = (maxBX - minBX) * sx;
    const totalH = XCS_LINE_HEIGHT * sy;

    // Update node — XCS coordinate system
    node.x = ax; node.y = ay;
    node.width = totalW;
    node.height = totalH;
    node.offsetX = ax + (minBX + maxBX) / 2 * sx;
    node.offsetY = ay + totalH / 2;


    let currentRelativeX = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = glyphs[i];
      const cx = ax + (currentRelativeX * sx);
      const cy = ay;

      // Glyph bounding box dimensions (raw font units, Y-up)
      const hasBox = glyph.bbox && glyph.bbox.minX != null;
      const charW = hasBox ? (glyph.bbox.maxX - glyph.bbox.minX) * sx : 0;
      const charH = hasBox ? (glyph.bbox.maxY - glyph.bbox.minY) * sy : 0;
      const lCX   = hasBox ? (glyph.bbox.minX + glyph.bbox.maxX) / 2 * sx : 0;
      const lCY   = hasBox ? (glyph.bbox.minY + glyph.bbox.maxY) / 2 * sy : 0;

      // Use the ORIGINAL Y-up dPath — XCS Studio applies its own Y-flip internally.
      // Scale is POSITIVE (XCS native). Do NOT negate or pre-flip paths.
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
        fontSize: Math.round(derivedFontSize * 10) / 10,  // exact pt value
        fontFamily: "Lato", fontSubfamily: "Regular", fontSource: "build-in",
        letterSpacing: 0, leading: 0, align: "left", curveX: 0, curveY: 0,
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
  static DEFAULT_TEXT_COLOR = "#5b9bd5";

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
  async addItem(type, options) {
    // 1. Check for specialized Draw Modes (Concentric, Spiral)
    const drawMode = options.renderMode;
    if (drawMode === 'concentric' || drawMode === 'spiral') {
      return await this._addSpecializedDrawMode(type, options);
    }

    const id = uuid();
    const layerColor = options.layerColor || (type === 'TEXT' ? XCSProject.DEFAULT_TEXT_COLOR : "#5b9bd5");
    
    // Abstract the processing type away from the components
    let processingType = options.processingType; 
    if (!processingType) {
      if (type === 'BITMAP') processingType = "BITMAP_ENGRAVING";
      else if (options.isFill === true) processingType = "COLOR_FILL_ENGRAVE";
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
    if (type === 'TEXT') return new XCSText(display, laser, zOrder);
    if (type === 'BITMAP') return new XCSBitmap(display, laser, zOrder);
    return new XCSShape(display, laser, zOrder);
  }

  /**
   * Adds a compound path (e.g. circle inside a square) to the project.
   * Concatenates multiple dPaths into a single PATH object with even-odd fill rule.
   */
  async addCompoundPath(options) {
    const { subPaths, ...rest } = options;
    if (!subPaths || subPaths.length === 0) return null;

    // Concatenate all sub-paths into a single technical string
    const dPath = subPaths.map(p => p.dPath).join(" ");
    
    // Default to 'evenodd' for compound paths to ensure correct knockout behavior
    const extraDisplayData = {
      ...rest.extraDisplayData,
      isCompoundPath: true,
      fillRule: rest.fillRule || "evenodd"
    };

    return await this.addItem('PATH', { ...rest, dPath, extraDisplayData });
  }

  /**
   * Groups multiple existing display items by ID.
   * Registers the group in groupData and applies the groupTag to all members.
   */
  group(itemIds, groupName = "") {
    const groupTag = `g-${uuid()}`;
    const canvas = this.canvas[0];
    
    // 1. Register Group in Metadata Tree
    canvas.groupData[groupTag] = {
      groupName,
      groupTag,
      visible: true,
      enableTransform: true,
      zOrder: canvas.displays.length
    };

    // 2. Apply Group Tag to all member displays
    itemIds.forEach(id => {
      const display = canvas.displays.find(d => d.id === id);
      if (display) display.groupTag = groupTag;
    });

    return groupTag;
  }

  static _geoCache = new Map();

  /**
   * Expands a primitive (RECT, CIRCLE) into multiple concentric or spiral paths.
   * Spacing is defined by options.params.density (LPCM).
   * Processing order is always Inside-Out.
   */
  async _addSpecializedDrawMode(type, options) {
    const { renderMode, x, y, width, height, params, jitter = 0, edgeFade = 0 } = options;
    const density = params?.density || 1000;
    const stepMm = 10 / density; // spacing in mm
    
    // Yielding helper to keep UI alive during heavy math
    let ops = 0;
    const yieldIfBusy = async () => {
      ops++;
      if (ops % 100 === 0) await new Promise(r => requestAnimationFrame(r));
    };

    // Cache Key: COMPLETELY decoupled from position (x,y)
    const cacheKey = `${type}|${width.toFixed(3)}|${height.toFixed(3)}|${density}|${jitter}|${renderMode}|${options.dPath || ''}`;
    let paths = XCSProject._geoCache.get(cacheKey);

    if (!paths) {
      paths = [];
      // Local centers for caching (0,0 centered bounding box)
      const lcx = width/2, lcy = height/2;
      const getPathPoints = (d) => d.split(/[MLZmlz\s,]+/).filter(v => v !== "").map(parseFloat);

      if (type === 'CIRCLE') {
        const maxR = width / 2;
        let r = maxR;
        if (renderMode === 'concentric') {
          while (r > 0) {
            await yieldIfBusy();
            let dPath = "";
            for (let i = 0; i <= 64; i++) {
              const a = (i / 64) * Math.PI * 2;
              const jx = (Math.random() - 0.5) * jitter, jy = (Math.random() - 0.5) * jitter;
              const px = lcx + (r + jx) * Math.cos(a), py = lcy + (r + jy) * Math.sin(a);
              dPath += (i === 0 ? "M " : "L ") + `${px.toFixed(3)} ${py.toFixed(3)}`;
            }
            paths.push({ dPath: dPath + " Z", r });
            r -= stepMm;
          }
        } else if (renderMode === 'spiral') {
          let a = 0; r = 0;
          let lastPX = lcx, lastPY = lcy;
          while (r < maxR) {
            await yieldIfBusy();
            a += 0.2; r = (a / (Math.PI * 2)) * stepMm;
            const jx = (Math.random() - 0.5) * jitter, jy = (Math.random() - 0.5) * jitter;
            const px = lcx + (r + jx) * Math.cos(a), py = lcy + (r + jy) * Math.sin(a);
            paths.push({ dPath: `M ${lastPX.toFixed(3)} ${lastPY.toFixed(3)} L ${px.toFixed(3)} ${py.toFixed(3)}`, r });
            lastPX = px; lastPY = py;
          }
        }
      } else if (type === 'RECT' || type === 'PATH') {
        let pts = [];
        if (type === 'RECT') {
          pts = [{x: 0, y: 0}, {x: width, y: 0}, {x: width, y: height}, {x: 0, y: height}];
        } else {
          // Normalize custom PATH to 0,0 relative (assumes caller provided relative dPath)
          const raw = getPathPoints(options.dPath);
          for (let i = 0; i < raw.length; i += 2) pts.push({ x: raw[i], y: raw[i+1] });
        }
        const centroid = pts.reduce((acc, p) => ({ x: acc.x + p.x/pts.length, y: acc.y + p.y/pts.length }), {x:0, y:0});
        const maxDist = pts.reduce((max, p) => Math.max(max, Math.sqrt((p.x-centroid.x)**2 + (p.y-centroid.y)**2)), 0);
        const minDistToSide = pts.length === 4 ? Math.min(width, height) / 2 : maxDist * Math.cos(Math.PI / pts.length);

        if (renderMode === 'concentric') {
          let scale = 1.0;
          while (scale > 0) {
            await yieldIfBusy();
            let dPath = "";
            pts.forEach((p, i) => {
              const jx = (Math.random() - 0.5) * jitter, jy = (Math.random() - 0.5) * jitter;
              const px = centroid.x + (p.x - centroid.x) * scale + jx, py = centroid.y + (p.y - centroid.y) * scale + jy;
              dPath += (i === 0 ? "M " : "L ") + `${px.toFixed(3)} ${py.toFixed(3)}`;
            });
            paths.push({ dPath: dPath + " Z", scale, distFromEdge: minDistToSide * (1 - scale) });
            scale -= stepMm / minDistToSide;
          }
        } else if (renderMode === 'spiral') {
          let scale = 0, ptIdx = 0, lastP = { x: centroid.x, y: centroid.y };
          while (scale < 1.0) {
            await yieldIfBusy();
            const p = pts[ptIdx % pts.length];
            const jx = (Math.random() - 0.5) * jitter, jy = (Math.random() - 0.5) * jitter;
            const px = centroid.x + (p.x - centroid.x) * scale + jx, py = centroid.y + (p.y - centroid.y) * scale + jy;
            paths.push({ dPath: `M ${lastP.x.toFixed(3)} ${lastP.y.toFixed(3)} L ${px.toFixed(3)} ${py.toFixed(3)}`, scale, distFromEdge: minDistToSide * (1 - scale) });
            lastP = { x: px, y: py };
            ptIdx++;
            scale = (ptIdx * stepMm) / (pts.length * minDistToSide);
          }
        }
      }
      XCSProject._geoCache.set(cacheKey, paths);
    }

    if (renderMode === 'concentric' && !XCSProject._geoCache.has(cacheKey)) {
      paths.sort((a, b) => (a.r || a.scale || 0) - (b.r || b.scale || 0));
    }

    // Map Power (Geometry remains relative to 0,0 from cache)
    const processedPaths = paths.map(p => {
      const dFromEdge = p.distFromEdge !== undefined ? p.distFromEdge : (width/2 - (p.r || 0));
      let pScale = 1.0;
      if (edgeFade > 0 && dFromEdge < edgeFade) pScale = Math.max(0, dFromEdge / edgeFade);
      return { ...p, pScale };
    });

    // Batching Optimization: Group consecutive segments with same power
    let currentBatch = null, lastItem = null;
    const flushBatch = async () => {
      if (!currentBatch) return;
      const pParams = { ...params };
      if (currentBatch.pScale < 1.0) pParams.power = Math.max(1, Math.round(pParams.power * currentBatch.pScale));
      
      // CRITICAL: Use original x,y for item positioning. dPath is relative to 0,0.
      lastItem = await this.addItem('PATH', {
        ...options, 
        dPath: currentBatch.dPath, 
        renderMode: 'path', 
        params: pParams,
        extraDisplayData: { ...options.extraDisplayData, hideLabels: true }
      });
      currentBatch = null;
    };

    for (const p of processedPaths) {
      if (currentBatch && currentBatch.pScale === p.pScale) {
        if (renderMode === 'spiral') {
          currentBatch.dPath += ` L ${p.dPath.replace(/^M\s*[\d.-]+\s+[\d.-]+\s*L\s*/, '')}`;
        } else {
          currentBatch.dPath += ` ${p.dPath}`;
        }
      } else {
        await flushBatch(); currentBatch = { ...p };
      }
    }
    await flushBatch();
    return lastItem;
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
      if (d.type === 'TEXT') return new XCSText(d, laser, i);
      if (d.type === 'BITMAP') return new XCSBitmap(d, laser, i);
      return new XCSShape(d, laser, i);
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
    project.canvas = [data.canvas[0]];
    project.device = data.device;
    project.canvasId = data.canvasId;
    return project;
  }
}

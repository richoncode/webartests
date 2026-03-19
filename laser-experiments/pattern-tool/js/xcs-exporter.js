import { uuid } from './utils.js';
import { LATO_REGULAR_GLYPHS, LATO_REGULAR_INFO } from './xcs-glyphs.js';

export const XCSExporter = {
  createProject(canvasId = uuid()) {
    return {
      canvasId,
      canvas: [{
        id: canvasId,
        title: "{panel}1",
        layerData: {},
        groupData: {},
        displays: []
      }],
      device: {
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
      },
      extId: "GS006",
      extName: "F2",
      version: "1.5.8",
      minRequiredVersion: "2.6.0",
      created: Date.now(),
      modify: Date.now(),
      projectTraceID: uuid()
    };
  },

  addText(project, options) {
    const {
      text, x, y, width: manualWidth, height, fontSize, scale: manualScale,
      layerColor = "#00befe",
      processingType = "VECTOR_ENGRAVING",
      laserSource = "red",
      align = "center",
      angle = 0
    } = options;

    const id = uuid();
    const canvas = project.canvas[0];
    const dvEntry = project.device.data.value[0][1];
    const displayValues = dvEntry.displays.value;

    const scaleObj = typeof manualScale === 'number' ? { x: manualScale, y: manualScale } : (manualScale || { x: 1, y: 1 });
    const sx = scaleObj.x;
    const sy = scaleObj.y;

    // --- Layout Engine (Baking Glyphs) ---
    const charJSONs = [];
    const glyphs = text.split('').map(char => LATO_REGULAR_GLYPHS[char] || LATO_REGULAR_GLYPHS[" "]);
    
    // Calculate total advance width
    let totalAdvance = 0;
    glyphs.forEach(g => totalAdvance += g.advanceWidth);
    const totalWidth = totalAdvance * sx;
    const totalHeight = height;

    // Determine the baseline anchor point (ax, ay)
    // We manually handle alignment by shifting the anchor point,
    // so we must set the internal XCS alignment to "left" to avoid double-shifting.
    let ax = x;
    let ay = y;
    
    if (align === "center") {
      if (angle === -90) ay = y + totalWidth / 2;
      else ax = x - totalWidth / 2;
    } else if (align === "right") {
      if (angle === -90) ay = y + totalWidth;
      else ax = x - totalWidth;
    }

    let currentRelativeX = 0;
    for (let i = 0; i < text.length; i++) {
      const glyph = glyphs[i];
      const charId = uuid();
      
      let cx, cy;
      if (angle === -90) {
        cx = ax;
        cy = ay - (currentRelativeX * sx);
      } else {
        cx = ax + (currentRelativeX * sx);
        cy = ay;
      }

      charJSONs.push({
        id: charId, name: null, type: "PATH", x: cx, y: cy, angle,
        scale: { x: sx, y: sy }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
        offsetX: cx, offsetY: cy, lockRatio: true, isClosePath: true,
        zOrder: 0, groupTag: uuid(), layerTag: layerColor, layerColor: layerColor,
        visible: true, originColor: "#000000", enableTransform: true, visibleState: true, lockState: false,
        resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
        fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
        stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
        width: (glyph.bbox.maxX - glyph.bbox.minX) * sx,
        height: (glyph.bbox.maxY - glyph.bbox.minY) * sy,
        isFill: false, lineColor: 0, fillColor: layerColor,
        points: [], dPath: glyph.dPath, fillRule: "nonzero",
        graphicX: cx, graphicY: cy, isCompoundPath: false
      });

      currentRelativeX += glyph.advanceWidth;
    }

    const display = {
      id, name: null, type: "TEXT",
      x: ax, y: ay,
      angle, scale: scaleObj, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
      offsetX: ax, offsetY: ay, lockRatio: true, isClosePath: true,
      zOrder: canvas.displays.length, sourceId: id, groupTag: uuid(),
      layerTag: layerColor, layerColor: layerColor, visible: true, originColor: "#000000",
      enableTransform: true, visibleState: true, lockState: false,
      resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
      width: totalWidth, height: totalHeight,
      isFill: false, lineColor: 0, fillColor: layerColor, fillRule: "nonzero",
      charJSONs,
      fontData: {
        fontInfo: LATO_REGULAR_INFO,
        glyphData: LATO_REGULAR_GLYPHS,
        layout: {
          chars: text.split("").map((c, i) => ({ char: c, gid: i, offset: { x: 0, y: 0 }, advance: (LATO_REGULAR_GLYPHS[c] || LATO_REGULAR_GLYPHS[" "]).advanceWidth }))
        }
      },
      text, resolution: 1,
      style: {
        fontSize, fontFamily: "Lato", fontSubfamily: "Regular", fontSource: "build-in",
        letterSpacing: 0, leading: 0, align: "left", // Force left to match our manual anchor
        curveX: 0, curveY: 0,
        isUppercase: false, isWeld: false, direction: "auto", writingMode: "horizontal-tb", textOrientation: "mixed"
      }
    };

    canvas.displays.push(display);

    const planType = laserSource === 'red' ? 'red' : 'blue';
    const processingConfig = {
      isFill: false,
      type: "TEXT",
      processingType,
      data: {
        VECTOR_CUTTING: this.createNode("VECTOR_CUTTING", planType, laserSource),
        VECTOR_ENGRAVING: {
          materialType: "official",
          planType,
          parameter: {
            customize: { power: 1, speed: 20, repeat: 1, processingLightSource: laserSource, enableKerf: false, kerfDistance: 0 },
            official: { power: 90, speed: 500, repeat: 1, processingLightSource: laserSource, enableKerf: false, kerfDistance: 0 }
          }
        },
        FILL_VECTOR_ENGRAVING: this.createNode("FILL_VECTOR_ENGRAVING", planType, laserSource),
        INTAGLIO: this.createNode("INTAGLIO", planType, laserSource),
        COLOR_FILL_ENGRAVE: this.createNode("COLOR_FILL_ENGRAVE", planType, laserSource),
        BITMAP_ENGRAVING: this.createNode("BITMAP_ENGRAVING", planType, laserSource)
      },
      processIgnore: false,
      isWhiteModel: true
    };

    displayValues.push([id, processingConfig]);

    if (!canvas.layerData[layerColor]) {
      canvas.layerData[layerColor] = {
        name: layerColor,
        order: Object.keys(canvas.layerData).length + 1,
        visible: true
      };
    }

    return id;
  },

  addCircle(project, options) {
    const {
      x, y, width, height,
      layerColor = "#5b9bd5",
      processingType = "COLOR_FILL_ENGRAVE",
      laserSource = "red",
      params = {}
    } = options;

    const id = uuid();
    const canvas = project.canvas[0];
    const dvEntry = project.device.data.value[0][1];
    const displayValues = dvEntry.displays.value;

    const display = {
      id, name: null, type: 'CIRCLE', x, y, width, height, angle: 0,
      scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
      offsetX: x, offsetY: y, lockRatio: false, isClosePath: true,
      zOrder: canvas.displays.length, sourceId: id, groupTag: uuid(), layerTag: layerColor,
      layerColor: layerColor, visible: true, originColor: "#000000",
      enableTransform: true, visibleState: true, lockState: false,
      resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
      isFill: true, lineColor: 0, fillColor: layerColor,
      ...options.extraDisplayData
    };

    canvas.displays.push(display);

    const planType = laserSource === 'red' ? 'red' : 'blue';
    const pm = { 
      power: 20, speed: 100, density: 1000, repeat: 1,
      processingLightSource: laserSource, bitmapScanMode: "zMode", needGapNumDensity: true,
      dotDuration: 100, dpi: 500, enableKerf: false, kerfDistance: 0,
      ...params
    };

    const processingConfig = {
      isFill: true, type: 'CIRCLE', processingType, processIgnore: false, isWhiteModel: false,
      data: {
        VECTOR_CUTTING: this.createNode("VECTOR_CUTTING", planType, laserSource),
        VECTOR_ENGRAVING: this.createNode("VECTOR_ENGRAVING", planType, laserSource),
        FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        INTAGLIO: this.createNode("INTAGLIO", planType, laserSource)
      }
    };

    displayValues.push([id, processingConfig]);
    return id;
  },

  addRect(project, options) {
    const {
      x, y, width, height, angle = 0,
      layerColor = "#5b9bd5",
      processingType = "COLOR_FILL_ENGRAVE",
      laserSource = "red",
      params = {}
    } = options;

    const id = uuid();
    const canvas = project.canvas[0];
    const dvEntry = project.device.data.value[0][1];
    const displayValues = dvEntry.displays.value;

    const display = {
      id, name: null, type: 'RECT', x, y, width, height, angle,
      scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
      offsetX: x, offsetY: y, lockRatio: false, isClosePath: true,
      zOrder: canvas.displays.length, sourceId: id, groupTag: uuid(), layerTag: layerColor,
      layerColor: layerColor, visible: true, originColor: "#000000",
      enableTransform: true, visibleState: true, lockState: false,
      resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
      isFill: true, lineColor: 0, fillColor: layerColor,
      ...options.extraDisplayData
    };

    canvas.displays.push(display);

    const planType = laserSource === 'red' ? 'red' : 'blue';
    const pm = { 
      power: 20, speed: 100, density: 1000, repeat: 1,
      processingLightSource: laserSource, bitmapScanMode: "zMode", needGapNumDensity: true,
      dotDuration: 100, dpi: 500, enableKerf: false, kerfDistance: 0,
      ...params
    };

    const processingConfig = {
      isFill: true, type: 'RECT', processingType, processIgnore: false, isWhiteModel: false,
      data: {
        VECTOR_CUTTING: this.createNode("VECTOR_CUTTING", planType, laserSource),
        VECTOR_ENGRAVING: this.createNode("VECTOR_ENGRAVING", planType, laserSource),
        FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        INTAGLIO: this.createNode("INTAGLIO", planType, laserSource)
      }
    };

    displayValues.push([id, processingConfig]);
    return id;
  },

  addImage(project, options) {
    const {
      x, y, width, height,
      layerColor = "#ffffff",
      processingType = "FILL_VECTOR_ENGRAVING",
      laserSource = "red",
      params = {}
    } = options;

    const id = uuid();
    const canvas = project.canvas[0];
    const dvEntry = project.device.data.value[0][1];
    const displayValues = dvEntry.displays.value;

    const display = {
      id, name: null, type: 'IMAGE', x, y, width, height, angle: 0,
      scale: { x: 1, y: 1 }, skew: { x: 0, y: 0 }, pivot: { x: 0, y: 0 }, localSkew: { x: 0, y: 0 },
      offsetX: x, offsetY: y, lockRatio: false, isClosePath: true,
      zOrder: canvas.displays.length, sourceId: id, groupTag: uuid(), layerTag: layerColor,
      layerColor: layerColor, visible: true, originColor: "#000000",
      enableTransform: true, visibleState: true, lockState: false,
      resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
      isFill: true, lineColor: 0, fillColor: layerColor,
      ...options.extraDisplayData
    };

    canvas.displays.push(display);

    const planType = laserSource === 'red' ? 'red' : 'blue';
    const pm = {
      power: 20, speed: 100, repeat: 1, processingLightSource: laserSource, bitmapScanMode: "zMode",
      ...params
    };

    const processingConfig = {
      isFill: true, type: 'IMAGE', processingType, processIgnore: false, isWhiteModel: false,
      data: {
        VECTOR_CUTTING: this.createNode("VECTOR_CUTTING", planType, laserSource),
        VECTOR_ENGRAVING: this.createNode("VECTOR_ENGRAVING", planType, laserSource),
        FILL_VECTOR_ENGRAVING: { materialType: "customize", planType: planType, parameter: { customize: pm } },
        COLOR_FILL_ENGRAVE: { materialType: "customize", planType: planType, parameter: { customize: { ...pm, density: 300, dotDuration: 100, dpi: 500 } } },
        INTAGLIO: this.createNode("INTAGLIO", planType, laserSource)
      }
    };

    displayValues.push([id, processingConfig]);
    return id;
  },

  createNode(type, planType, laserSource) {
    const common = { power: 1, speed: 16, repeat: 1, processingLightSource: laserSource };
    if (type === "COLOR_FILL_ENGRAVE") {
      return {
        materialType: "customize",
        planType: "blue",
        parameter: {
          customize: { ...common, speed: 80, density: 300, dotDuration: 100, dpi: 500, bitmapScanMode: "zMode", notResize: true, scanAngle: 0, angleType: 2, crossAngle: false }
        }
      };
    }
    return {
      materialType: "customize",
      planType: "blue",
      parameter: { customize: common }
    };
  }
};

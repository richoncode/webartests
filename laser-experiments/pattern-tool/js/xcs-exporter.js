import { uuid } from './utils.js';

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
      text, x, y, width, height, fontSize, scale,
      layerColor = "#00befe",
      processingType = "VECTOR_ENGRAVING",
      laserSource = "red",
      align = "center"
    } = options;

    const id = uuid();
    const canvas = project.canvas[0];
    const dvEntry = project.device.data.value[0][1];
    const displayValues = dvEntry.displays.value;

    const display = {
      id,
      name: null,
      type: "TEXT",
      x, y,
      angle: 0,
      scale: typeof scale === 'number' ? { x: scale, y: scale } : (scale || { x: 1, y: 1 }),
      skew: { x: 0, y: 0 },
      pivot: { x: 0, y: 0 },
      localSkew: { x: 0, y: 0 },
      offsetX: x,
      offsetY: y,
      lockRatio: true,
      isClosePath: true,
      zOrder: canvas.displays.length,
      sourceId: id,
      groupTag: "",
      layerTag: layerColor,
      layerColor: layerColor,
      visible: true,
      originColor: "#000000",
      enableTransform: true,
      visibleState: true,
      lockState: false,
      resourceOrigin: "",
      customData: {},
      rootComponentId: "",
      minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: true, color: 0, alpha: 1, width: 1, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
      width,
      height,
      isFill: false,
      lineColor: 0,
      fillColor: layerColor,
      text,
      resolution: 1,
      style: {
        fontSize,
        fontFamily: "Lato",
        fontSubfamily: "Regular",
        fontSource: "build-in",
        letterSpacing: 0,
        leading: 0,
        align,
        curveX: 0,
        curveY: 0,
        isUppercase: false,
        isWeld: false,
        direction: "auto",
        writingMode: "horizontal-tb",
        textOrientation: "mixed"
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

    // Ensure layer exists in layerData
    if (!canvas.layerData[layerColor]) {
      canvas.layerData[layerColor] = {
        name: layerColor,
        order: Object.keys(canvas.layerData).length + 1,
        visible: true
      };
    }

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
      zOrder: canvas.displays.length, sourceId: id, groupTag: "", layerTag: layerColor,
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
      zOrder: canvas.displays.length, sourceId: id, groupTag: "", layerTag: layerColor,
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
      zOrder: canvas.displays.length, sourceId: id, groupTag: "", layerTag: layerColor,
      layerColor: layerColor, visible: true, originColor: "#000000",
      enableTransform: true, visibleState: true, lockState: false,
      resourceOrigin: "", customData: {}, rootComponentId: "", minCanvasVersion: "0.0.0",
      fill: { paintType: "color", visible: false, color: 0, alpha: 1 },
      stroke: { paintType: "color", visible: false, color: 0, alpha: 1, width: 0, cap: "butt", join: "miter", miterLimit: 4, alignment: 0.5 },
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
        planType: "blue", // Often defaults to blue in reference
        parameter: {
          customize: { ...common, speed: 80, density: 300, dotDuration: 100, dpi: 500, bitmapScanMode: "zMode", notResize: true, scanAngle: 0, angleType: 2, crossAngle: false }
        }
      };
    }
    // Simple default node
    return {
      materialType: "customize",
      planType: "blue",
      parameter: { customize: common }
    };
  }
};

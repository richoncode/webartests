# XCS File Format

XCS is the native project format for **xTool Creative Space** (XCS) software. Files use a `.xcs` extension and contain JSON.

---

## Top-Level Structure

```json
{
  "canvasId": "<uuid>",          // ID of the active canvas
  "canvas": [ ... ],             // Array of canvas objects (usually one)
  "device": { ... },             // Machine + processing config
  "version": "2.x.x",
  "created": 1234567890000,      // Unix timestamp (ms)
  "modify":  1234567890000,
  "ua": "...",                   // User-agent string of XCS app
  "meta": { "title": "..." },
  "cover": "<base64 PNG>",       // Thumbnail
  "extId": "...",
  "extName": "...",
  "projectTraceID": "<uuid>",
  "minRequiredVersion": "...",
  "appMinRequiredVersion": "...",
  "webMinRequiredVersion": "..."
}
```

---

## Canvas Object (`canvas[n]`)

```json
{
  "id": "<uuid>",
  "title": "Panel 1",
  "layerData": { ... },      // Layer visibility / colour config
  "groupData": { ... },      // Group info
  "displays": [ ... ],       // Array of shape display objects
  "extendInfo": { ... }      // Extended metadata (often sparse)
}
```

---

## Display Object (`canvas[n].displays[i]`)

Each element on the canvas is a "display". Coordinates are in **millimetres**; `x` and `y` are the **centre** of the shape.

```json
{
  "id": "<uuid>",             // Primary key (used to join processing config)
  "sourceId": "<uuid>",       // Source asset ID
  "name": "...",
  "type": "CIRCLE",           // Shape type (see Types below)
  "x": 60.27,                 // Centre X (mm from canvas origin)
  "y": 82.57,                 // Centre Y (mm from canvas origin)
  "width": 4.5,               // Bounding-box width (mm)
  "height": 4.5,              // Bounding-box height (mm)
  "angle": 0,                 // Rotation (degrees)
  "scale": { "x": 1, "y": 1 },
  "skew": { "x": 0, "y": 0 },
  "pivot": { "x": 0.5, "y": 0.5 },
  "zOrder": 0,
  "layerColor": "#00befe",    // Layer colour (hex)
  "fillColor": "#000000",
  "lineColor": "#000000",
  "isFill": true,
  "fill": { ... },            // Fill style descriptor
  "stroke": { ... },          // Stroke style descriptor
  "visible": true,
  "lockState": 0,
  "visibleState": 0,
  "enableTransform": true,
  "lockRatio": true,
  "isClosePath": true,
  "groupTag": "",
  "layerTag": ""
}
```

### Shape Types

| `type`    | Description          |
|-----------|----------------------|
| `CIRCLE`  | Ellipse / circle     |
| `RECT`    | Rectangle            |
| `TEXT`    | Text object          |
| `PATH`    | Arbitrary SVG path   |
| `IMAGE`   | Raster image         |
| `GROUP`   | Group container      |

---

## Processing Config (`device.data`)

Processing parameters (power, speed, density) are stored separately from the display geometry, in `device.data`.

`device.data.value` is a **serialised Map** — it serialises as an array of `[key, value]` pairs:

```json
{
  "dataType": "Map",
  "value": [
    [ "<canvasId>", { ... } ]
  ]
}
```

The value for each canvas ID:

```json
{
  "mode": "...",
  "data": { ... },
  "displays": {
    "dataType": "Map",
    "value": [
      [ "<display.id>", { ... } ]
    ]
  }
}
```

Note: the key joining processing config to a display is **`display.id`** (not `display.sourceId`).

---

## Per-Display Processing Config

```json
{
  "isFill": true,
  "type": "CIRCLE",
  "processingType": "COLOR_FILL_ENGRAVE",   // Active processing mode
  "processIgnore": false,
  "isWhiteModel": false,
  "data": {
    "COLOR_FILL_ENGRAVE": {
      "parameter": {
        "customize": {
          "power": 40,          // % of laser max power
          "speed": 200,         // mm/s
          "density": 1000,      // lines per cm (LPCM)
          "repeat": 1,          // pass count
          "dotDuration": 100,
          "dpi": 500,
          "processingLightSource": "red",
          "bitmapEngraveMode": "normal",
          "bitmapScanMode": "zMode",
          "scanAngle": 0,
          "angleType": 2,
          "crossAngle": true,
          "notResize": true
        }
      }
    }
  }
}
```

### Common Processing Types

| `processingType`       | Description                         |
|------------------------|-------------------------------------|
| `COLOR_FILL_ENGRAVE`   | Fill engraving with colour mapping  |
| `ENGRAVE`              | Standard raster engraving           |
| `CUT`                  | Vector cutting                      |
| `SCORE`                | Vector scoring / marking            |
| `BITMAP_ENGRAVE`       | Bitmap/photo engraving              |

---

## Joining Shapes to Processing Config

```javascript
// device.data.value is [[canvasId, entry], ...]
const dvMap = Object.fromEntries(data.device.data.value);
const entry = dvMap[canvas.id];

// entry.displays.value is [[displayId, cfg], ...]
const dispMap = Object.fromEntries(entry.displays.value);

// For each display:
const cfg = dispMap[display.id];
const pt = cfg.processingType;
const params = cfg.data[pt].parameter.customize;
// → params.power, params.speed, params.density, params.repeat
```

---

## Coordinate System

- Origin: top-left of the material/canvas area
- Units: millimetres
- `x`, `y` = **centre** of the shape's bounding box
- `width`, `height` = bounding-box dimensions
- For a CIRCLE: rendered as an ellipse with `rx = width/2`, `ry = height/2`
- `angle` = clockwise rotation in degrees around the shape's pivot

---

## Notes

- The `extendInfo.displayProcessConfigMap` field exists but is typically empty; the authoritative processing config is in `device.data.value`.
- Multiple canvases can exist in one file; each has its own processing config entry keyed by canvas ID.
- `device.power` is the machine's max power wattage; `parameter.customize.power` is a percentage of that max.

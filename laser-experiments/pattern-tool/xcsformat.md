# Confirmation of XCS File Format (xTool F2) - Confirmed Requirements

This document defines the strictly required structure for `.xcs` files to ensure full compatibility with xTool Creative Space and the F2 system.

---

## 1. Top-Level Node Hierarchy

1.  **Project Root**: Contains metadata and links trees via `canvasId`.
    *   **CRITICAL Root Fields**:
        *   `extId`: `"GS006"` (Mandatory for F2 recognition).
        *   `extName`: `"F2"` (Mandatory for F2 recognition).
        *   `version`: `"1.5.8"` (Matches current stable).
        *   `minRequiredVersion`: `"2.6.0"`.
2.  **Canvas Tree (`canvas[]`)**:
    *   `layerData`: A manifest registering every unique layer color.
    *   `displays[]`: Visual shape definitions.
3.  **Device Tree (`device`)**:
    *   `id`: `"GS006"` (F2 Identifier).
    *   `power`: `[5, 15]` (Laser wattages).
    *   `data`: The **Processing Tree** (Map keyed by `canvasId`).
        *   `displays`: The **Parameter Tree** (Map keyed by **Shape ID**).

---

## 2. Shape-to-Parameter Mapping Logic

XCS links geometry to settings using a strict **Three-Point Sync**:
1.  **Point A**: `project.canvasId`
2.  **Point B**: `canvas[0].id`
3.  **Point C**: `device.data.value[0][0]` (The Map key)

Individual shapes are linked via:
1.  **Point D**: `canvas[0].displays[i].id`
2.  **Point E**: `device.data.value[0][1].displays.value[j][0]` (The Map key)

---

## 3. Mandatory Processing Node Structure (Per Shape)

**CRITICAL:** For the F2 UI to show sliders, every shape configuration in the `device` tree MUST include all four operation nodes, regardless of which one is active.

### The Operation Keys:
*   `COLOR_FILL_ENGRAVE`: CONFIRMED primary type for **FILL**. Uses **1:1 LPCM mapping** (1000 in JSON = 1000 LPCM in UI).
*   `FILL_VECTOR_ENGRAVING`: Alternative fill type. Note: Some versions may scale density by 10x in this mode.
*   `VECTOR_ENGRAVING`: Used for **SCORE** (Outlines).
*   `VECTOR_CUTTING`: Used for **CUT**.
*   `INTAGLIO`: Used for 3D/relief.

### Internal Parameter Mapping:
Inside each operation node (e.g., `FILL_VECTOR_ENGRAVING`), the path to settings is:
`data` → `[OP_NAME]` → `parameter` → `customize` → `[power|speed|density|repeat]`

---

## 4. Text Object Structure

TEXT objects in XCS are complex as they often include baked glyph paths for offline processing.

### Root TEXT Fields:
*   `type`: `"TEXT"`
*   `text`: The actual string content.
*   `width`/`height`: Dimensions in mm of the bounding box at `scale: 1`.
*   `style`: Object containing formatting:
    *   `fontSize`: Size in points (pt). **CRITICAL:** XCS uses a ratio of approx **0.275 mm per point** for the visual height of built-in fonts like Lato.
        *   Example: `fontSize: 72` pt results in `height: 19.85` mm.
        *   Formula: `height (mm) ≈ fontSize (pt) * 0.2757`.
        *   Formula: `fontSize (pt) ≈ height (mm) * 3.626`.
    *   `fontFamily`: e.g., `"Lato"`.
    *   `fontSubfamily`: e.g., `"Bold"`.
    *   `fontSource`: `"build-in"` or `"system"`.
    *   `align`: `"center"`, `"left"`, or `"right"`. **CRITICAL:** `align` only centers the text *along* the baseline. It does NOT center the text across its height.
*   `fontData`: (Often required for F2) Contains `fontInfo` and `glyphData` (Map of char to SVG-like path data).

### Coordinate & Scaling Logic for TEXT:
1.  **Scaling**: Always prefer `scale: {x: 1, y: 1}` and set the desired size via `fontSize` and `width`/`height`.
2.  **Positioning (x, y)**:
    *   XCS uses the **baseline anchor** for its `x` and `y` properties.
    *   **Horizontal (0°)**: To center text at `targetY`, set `y = targetY + height/2`.
    *   **Vertical (-90°)**: To center text at `targetX`, set `x = targetX - height/2`. (Note: Rotated text expands rightward from the vertical baseline).
    *   **OffsetX/OffsetY**: Usually match `x` and `y` for newly created objects; XCS may recalculate them as the bounding box center upon saving.

---

## 5. Processing Order & Layer Sequencing

XCS determines the execution sequence of shapes based on a combination of layer metadata and device path planning settings.

### Layer-Based Ordering
Each layer defined in `canvas.layerData` contains an `order` integer.
*   **Property**: `canvas[0].layerData[HEX_COLOR].order`
*   **Behavior**: When custom ordering is active, XCS processes layers based on these values. 
*   **Note**: Observed behavior shows processing from **Highest Order value to Lowest Order value** (e.g., Order 3 processes before Order 1).

### Path Planning Settings
The logic switch for sequencing is found in the `device` tree:
`device` → `data` → `value[canvasId]` → `data` → `LASER_PLANE`

| Property | Value | Description |
| :--- | :--- | :--- |
| `pathPlanning` | `"auto"` | **Automatic Sequencing**: XCS optimizes for travel time, ignoring layer sequence. |
| `pathPlanning` | `"custom"` | **User Sequencing**: XCS respects the layer order and physical sequence. |
| `isProcessByLayer`| `true/false` | **Layer Grouping**: If true, all shapes in a layer are completed before moving to the next. |

### Implementation for Forced Order:
To ensure a file renders in a specific order (e.g., Layer A then Layer B):
1.  Set `"pathPlanning": "custom"`.
2.  Set `"isProcessByLayer": true`.
3.  Assign higher `order` values to the layers that should process first.

---

## 6. Mandatory Integrity Checks (Validation)

Every exported file must pass these two structural tests:

1.  **Canvas-to-Device Join**: The GUID in the root `canvasId` field MUST exist as a key in the `device.data.value` Map, and MUST match the `id` field of the corresponding object in the `canvas[]` array.
2.  **Shape-to-Parameter Join**: For every shape in `canvas[n].displays[]`, its `id` (GUID) MUST exist as a key within the `device.data.value[n][1].displays.value` Map.

---

## 7. Exporter Implementation Rules

1.  **IDs**: Generate standard 36-character UUIDs.
2.  **Layers**: Every unique `layerColor` used in `displays` MUST have a matching entry in `canvas.layerData`.
3.  **Maps**: Every Map-like structure MUST be wrapped in `{"dataType": "Map", "value": [...]}`.
4.  **Boilerplate**: Include all four operation nodes (`VECTOR_CUTTING`, `VECTOR_ENGRAVING`, `FILL_VECTOR_ENGRAVING`, `INTAGLIO`) in the shape's processing config.
5.  **Alignment**: Coordinates are mm from top-left (0,0). Mandala center is (50, 50) for 100x100 area.
6.  **Root Metadata**: Include `extId: "GS006"` and `extName: "F2"` at the root level.

---

## 9. XCS Reference Files (`xcs-references/`)

Authoritative samples exported directly from xTool Creative Space.

### `XCSFONTEXAMPLE1.xcs` (Scribe/Score Text)
*   **Purpose**: Shows "Lato Regular" text set to **Score** (Scribe) for 304 Stainless Steel.
*   **Geometry (`displays`)**:
    *   `type`: `"TEXT"`
    *   `isFill`: `false` (Required for Score/Scribe).
    *   `scale`: Uses non-uniform/non-identity scaling (e.g., `0.155`).
    *   **CRITICAL**: Includes a `fontData` block with `glyphData` (baked SVG paths). This may be required for F2 offline processing.
*   **Processing (`device`)**:
    *   `processingType`: `"VECTOR_ENGRAVING"` (Score).
    *   `isWhiteModel`: `true`.
    *   `planType`: `"red"` (for IR Laser).
    *   **Settings (Official 304 Score)**:
        *   Power: `90`
        *   Speed: `500`
        *   Repeat: `1`
        *   ProcessingLightSource: `"red"` (IR).

---

## 10. Summary of Findings (Scribe vs Fill)
| Feature | Fill (Engrave) | Scribe (Score) |
| :--- | :--- | :--- |
| `processingType` | `COLOR_FILL_ENGRAVE` | `VECTOR_ENGRAVING` |
| `isFill` (Root) | `true` | `false` |
| `isWhiteModel` | `false` | `true` |
| `planType` | `red` / `blue` | `red` / `blue` |
| `fontSize` | Ratio ~0.275 | Ratio ~0.275 |


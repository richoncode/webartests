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
*   `width`/`height`: Dimensions in mm.
*   `style`: Object containing formatting:
    *   `fontSize`: Size in points/units.
    *   `fontFamily`: e.g., `"Lato"`.
    *   `fontSubfamily`: e.g., `"Bold"`.
    *   `fontSource`: `"build-in"` or `"system"`.
    *   `align`: `"center"`, `"left"`, or `"right"`.
*   `fontData`: (Often required for F2) Contains `fontInfo` and `glyphData` (Map of char to SVG-like path data).

---

## 5. Confirmed Properties & Values

| Property | Value | Notes |
| :--- | :--- | :--- |
| `processingLightSource` | `"blue"` | F2 Diode (Blue) Laser. |
| `processingLightSource` | `"red"` | F2 IR (1064nm) Laser. |
| `processingType` | `"COLOR_FILL_ENGRAVE"` | Canonical name for Fill (1:1 LPCM). |
| `pivot` | `{"x": 0, "y": 0}` | CONFIRMED for primitives. |
| `alignment` | `0.5` | CONFIRMED requirement for stroke logic. |
| `isFill` | `true` | Required for visual rendering in XCS. |
| `fill.visible` | `false` | Counter-intuitive: MUST be false for simple fills. |
| `stroke.visible` | `true` | Required even for fills. |

---

## 5. Mandatory Integrity Checks (Validation)

Every exported file must pass these two structural tests:

1.  **Canvas-to-Device Join**: The GUID in the root `canvasId` field MUST exist as a key in the `device.data.value` Map, and MUST match the `id` field of the corresponding object in the `canvas[]` array.
2.  **Shape-to-Parameter Join**: For every shape in `canvas[n].displays[]`, its `id` (GUID) MUST exist as a key within the `device.data.value[n][1].displays.value` Map.

---

## 6. Exporter Implementation Rules

1.  **IDs**: Generate standard 36-character UUIDs.
2.  **Layers**: Every unique `layerColor` used in `displays` MUST have a matching entry in `canvas.layerData`.
3.  **Maps**: Every Map-like structure MUST be wrapped in `{"dataType": "Map", "value": [...]}`.
4.  **Boilerplate**: Include all four operation nodes (`VECTOR_CUTTING`, `VECTOR_ENGRAVING`, `FILL_VECTOR_ENGRAVING`, `INTAGLIO`) in the shape's processing config.
5.  **Alignment**: Coordinates are mm from top-left (0,0). Mandala center is (50, 50) for 100x100 area.
6.  **Root Metadata**: Include `extId: "GS006"` and `extName: "F2"` at the root level.

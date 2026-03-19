# XCS Viewer & Internal Representation Guidance

This document defines how the Pattern Tool internally represents and adapts XCS content. It acts as the official bridge between the tool's state and the formal requirements defined in `xcsformat.md`.

---

## 1. Internal State vs. Formal XCS Format

The tool maintains an **Internal Representation (IR)** of shapes to simplify rendering and UI logic. This IR must be mapped to the formal format upon export.

### Shape Representation
| Property | Internal Representation | Formal XCS (`xcsformat.md`) |
| :--- | :--- | :--- |
| **Coordinates** | mm from top-left (0,0) | Factor in `scale` and `offsetX/Y` |
| **Dimensions** | `w`, `h` in mm (final size) | `width`, `height` (may be unscaled) |
| **Text Anchor** | Center or Baseline | **Left-edge Baseline** (Strict) |
| **Colors** | Hex strings (`#5b9bd5`) | `lineColor` (Decimal), `fillColor` (Hex) |

---

## 2. The Adapter Pattern (`xcs-exporter.js`)

The `XCSExporter` is the only module permitted to generate formal XCS JSON. It must strictly follow the "Baking" rules:
1.  **Text Baking**: Must use the `charJSONs` logic documented in `xcsformat.md`.
2.  **Node Boilerplate**: Must include all 5 operation nodes for every shape.
3.  **Coordinate Translation**: Must convert tool coordinates to the **Left-Baseline anchor** required by XCS.

---

## 3. MANDATORY DEVELOPMENT PROTOCOL

### **RULE: No Speculative Implementation**
If a feature is requested that is not explicitly supported or documented in `xcsformat.md`:
1.  **STOP**: Do not attempt to guess the JSON structure.
2.  **WAIT**: Inform the user that the feature is unsupported by current knowledge.
3.  **ASK**: Request an exported `.xcs` sample from xTool Creative Space that demonstrates the feature.
4.  **CONFIRM**: Only implement after the sample has been analyzed and `xcsformat.md` has been updated with verified facts.

### **Common "Ask for Sample" Triggers**:
*   New shape types (Polygons, Stars, Bezier curves).
*   New processing modes (3D Relief settings).
*   Bitmap filters or advanced image adjustments.
*   Grouping or nesting of objects.

---

## 4. Parser Logic (`xcs-tab.js`)

The parser must normalize formal XCS data into the tool's Internal Representation.
*   **Scaling**: Must correctly resolve physical dimensions by factoring in the `scale` and `width/height` properties.
---

## 5. Coordinate & Anchor Math

XCS uses a **Left-Baseline Anchor** for text, and glyphs grow **UPWARD** from that baseline. To center or position text relative to the tool's grid, the following transformations are applied:

### Horizontal Alignment (Center)
*   `totalWidth = sum(advances) * scale`
*   `xcsX = toolX - (totalWidth / 2)`
*   `xcsY = toolY`

### Vertical Alignment (Center, -90° Rotation)
*   `xcsX = toolX`
*   `xcsY = toolY + (totalWidth / 2)`

### Bounding Box Padding
Because characters grow **UPWARD** from the baseline anchor:
*   A label placed at `y = gridBottom` will overlap the grid.
*   To place a label **below** the grid with a gap: `y = gridBottom + gap + labelHeight`.
*   To place a label **left** of the grid with a gap: `x = gridLeft - gap - labelHeight`.

# XCS Bitmap Etching Specification (xTool F2)

Derived from `XCSBITMAPREFERENCE.xcs`.

## 1. Display Node (`canvas[0].displays[]`)

*   **`type`**: `"BITMAP"`
*   **`base64`**: The raw image data (e.g., `"data:image/png;base64,..."`).
*   **`isFill`**: `true`
*   **`width` / `height`**: Physical dimensions in mm.
*   **`originWidth` / `originHeight`**: Original pixel dimensions.
*   **`dpi`**: Object containing `dpiX` and `dpiY` (e.g., `847` for high-res).
*   **`grayValue`**: Array `[min, max]` (usually `[0, 255]`).
*   **`sharpness`**, **`brightness`**, **`contrast`**, etc.: Image adjustment metadata.

## 2. Laser Node (`device.data.value[canvasId].displays.value[shapeId]`)

*   **`type`**: `"BITMAP"`
*   **`processingType`**: `"BITMAP_ENGRAVING"`
*   **`data.BITMAP_ENGRAVING`**:
    *   **`bitmapMode`**: `"grayscale"`, `"ordered"`, or `"stucki"`.
    *   **`bitmapScanMode`**: `"oneWay"` (Standard) or `"zMode"`.
    *   **`bitmapEngraveMode`**: `"dot"` (Pulsed) or `"normal"` (Continuous).
    *   **`dotDuration`**: Pulse time in microseconds (µs) (e.g., `200`).
    *   **`dpi`**: Horizontal/Vertical resolution (e.g., `847`).
    *   **`powerMinMaxRange`**: Array `[min, max]` for grayscale power mapping.

## 3. Implementation Notes

*   XCS treats Bitmaps as a distinct primitive from Paths or Rects.
*   The `processingType` MUST be `BITMAP_ENGRAVING` for the F2 to trigger the pulsed galvo mode correctly.
*   DPI in the processing node usually matches the DPI in the display node for 1:1 pixel mapping.

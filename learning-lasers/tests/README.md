# OxidePhysics.js Regression Testing

The `OxidePhysics.js` engine simulates the CIE 1931 colour output of thin-film interference on SS304. Because the structural colour calculations (e.g. contrast stretch, gamma expansion) are sensitive to small changes, this directory contains tests to prevent regressions.

## Running the Color Mapping Test

This script evaluates the exact RGB matrix output and string-label assignment of `getColor(nm, ra)` across the physiological range of laser-induced oxidation (0 nm to 250 nm).

To verify the colour engine:
```bash
node test_oxide_colors.js
```

### What to check:
1. **Hue continuity:** Ensure the colour shifts logically through Silver → Straw → Gold → Red → Purple → Deep Blue → Cyan.
2. **Deep Blue Validation:** Specifically check that around **100 nm**, the output is a **dark, saturated blue** (e.g. `rgb(39, 187, 255)` post-stretching, or deeper). If the blue shifts into a bright, washed-out Cyan, then the mathematical contrast curve (baseline subtraction or gamma expansion) has likely regressed.
3. **Black Boundary:** Ensure `0 nm` returns `rgb(0, 0, 0)` due to the absence of the interference peak, representing raw uniform reflection.
4. **Categorization:** Ensure the engine correctly labels the string names according to established thresholds.

Any adjustments to `getReflectance(lam, d)` or the `getColor` mapping loops should be immediately re-validated against this script.

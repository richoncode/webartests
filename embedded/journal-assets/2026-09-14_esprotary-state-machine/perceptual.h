#pragma once
// Brightness the eye's way, and rotation the wrist's way.
//
// Perceived lightness is not proportional to emitted light: CIE L* relates them
// by roughly a cube. So a knob that steps the raw duty cycle evenly feels wrong
// at both ends — coarse in the dark where the eye is most sensitive, and barely
// moving up near full. The knob therefore moves L* linearly, and the physical
// value follows the curve. Small steps at the bottom, large ones at the top,
// which is exactly what it feels like it should do.
//
//   L*   0    10    25    50    75   100
//   dps 10    21    53   192   511  1000

#include <math.h>

static const int DPS_MIN = 10, DPS_MAX = 1000;

// L* 0..100  ->  device brightness
inline int lstarToDps(float L) {
  if (L < 0) L = 0; if (L > 100) L = 100;
  float Y = (L > 8.0f) ? powf((L + 16.0f) / 116.0f, 3.0f) : L / 903.3f;
  int v = DPS_MIN + (int)lroundf((DPS_MAX - DPS_MIN) * Y);
  return v < DPS_MIN ? DPS_MIN : (v > DPS_MAX ? DPS_MAX : v);
}
// device brightness -> L* 0..100, for showing what a light is already doing
inline float dpsToLstar(int dps) {
  float Y = (float)(dps - DPS_MIN) / (DPS_MAX - DPS_MIN);
  if (Y <= 0) return 0;
  float L = (Y > 0.008856f) ? 116.0f * cbrtf(Y) - 16.0f : Y * 903.3f;
  return L < 0 ? 0 : (L > 100 ? 100 : L);
}

// ── rotation acceleration ───────────────────────────────────────────────────
// The target: a fast flick of about 120 degrees — the comfortable wrist arc —
// should cross the whole range. This knob has 20 detents per revolution, so
// 120 degrees is close to 7 detents. Crossing 100 units of L* in 7 detents
// means ~15 per detent when spinning; turned slowly it drops to 1 for
// placing a value exactly.
static const int DETENTS_PER_REV   = 20;
static const int FAST_ARC_DEGREES  = 120;
static const int FAST_ARC_DETENTS  = (DETENTS_PER_REV * FAST_ARC_DEGREES) / 360;  // 6

// gapMs is the time since the previous detent.
inline int accelStep(uint32_t gapMs, int fullRange) {
  const int fast = fullRange / FAST_ARC_DETENTS;        // units per detent at speed
  if (gapMs <= 25)  return fast;
  if (gapMs >= 180) return 1;
  // between the two, interpolate on the gap so it ramps smoothly
  float t = (180.0f - gapMs) / (180.0f - 25.0f);
  int step = (int)lroundf(1 + t * t * (fast - 1));      // squared: stays fine longer
  return step < 1 ? 1 : step;
}

#pragma once
// How likely a Vandenberg launch is to be worth walking outside for.
//
// What makes one visible from 178 miles away is the twilight plume: the rocket
// climbing into sunlight while the observer is already in the dark. So the
// question is not "is it after sunset" but "how dark is it here while the
// rocket is high", which is a curve rather than a threshold.
//
//   chance = twilight(t) x sky(cloud) x confidence(status)
//
// The sky is judged at lift-off plus a few minutes, once the vehicle is high
// enough to catch the sun. Those minutes are the difference between dismissing
// a launch and flagging it.
//
// Nothing here touches the network or the clock, so tools/chance-test.cpp can
// compile it on a laptop and assert the whole table.

#include <stddef.h>

struct CurvePoint { int x; float y; };

// minutes from sunset (negative = before) -> how well a plume shows
static const CurvePoint TWILIGHT_DUSK[] = {
  {-90, 0.02f}, {-60, 0.04f}, {-30, 0.12f}, {-10, 0.45f}, {5, 0.85f}, {20, 0.95f},
  {75, 0.95f}, {110, 0.70f}, {140, 0.40f}, {200, 0.20f}, {300, 0.12f}
};
// minutes from sunrise, the same shape mirrored, for a pre-dawn launch
static const CurvePoint TWILIGHT_DAWN[] = {
  {-300, 0.12f}, {-200, 0.20f}, {-140, 0.40f}, {-110, 0.70f}, {-75, 0.95f},
  {-20, 0.95f}, {-5, 0.85f}, {10, 0.45f}, {30, 0.12f}, {60, 0.04f}, {90, 0.02f}
};
// cloud cover at the lift-off hour
static const CurvePoint SKY[] = {
  {0, 1.00f}, {10, 1.00f}, {35, 0.80f}, {60, 0.45f}, {85, 0.15f}, {100, 0.02f}
};

inline float curveAt(const CurvePoint *c, size_t n, int x) {
  if (x <= c[0].x) return c[0].y;
  if (x >= c[n - 1].x) return c[n - 1].y;
  for (size_t i = 0; i + 1 < n; i++)
    if (x >= c[i].x && x <= c[i + 1].x) {
      float span = (float)(c[i + 1].x - c[i].x);
      return c[i].y + (c[i + 1].y - c[i].y) * (x - c[i].x) / span;
    }
  return c[n - 1].y;
}
#define CURVE(tbl, x) curveAt(tbl, sizeof(tbl) / sizeof(tbl[0]), x)

// A launch whose time is still provisional is worth less than one cleared to go.
inline float launchConfidence(const char *statusAbbrev) {
  if (!strcmp(statusAbbrev, "Go"))  return 1.00f;
  if (!strcmp(statusAbbrev, "TBC")) return 0.80f;
  if (!strcmp(statusAbbrev, "TBD")) return 0.55f;
  if (!strcmp(statusAbbrev, "Hold")) return 0.40f;
  return 0.55f;
}

// All times are minutes past local midnight. Returns 0-99.
inline int launchChance(int liftoffMin, int sunsetMin, int sunriseMin,
                        int cloudPct, const char *statusAbbrev) {
  int t = liftoffMin + LAUNCH_PLUME_LAG_MIN;
  float dusk = CURVE(TWILIGHT_DUSK, t - sunsetMin);
  float dawn = CURVE(TWILIGHT_DAWN, t - sunriseMin);
  float twilight = dusk > dawn ? dusk : dawn;
  float pct = 100.0f * twilight * CURVE(SKY, cloudPct) * launchConfidence(statusAbbrev);
  int v = (int)(pct + 0.5f);
  return v < 0 ? 0 : (v > 99 ? 99 : v);
}

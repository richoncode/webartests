#pragma once
// Scene payloads for dp 25.
//
// The LAN form is one byte of scene number followed by 13 bytes per unit:
//
//   switch duration 0-100 | gradient duration 0-100 | 0 static 1 jump 2 gradient
//   h 0-360 | s 0-1000 | v 0-1000 | bright 0-1000 | temperature 0-1000
//
// Decoded from a bulb's own scene and checked field by field against the same
// bulb's cloud JSON — see journal-assets/2026-09-14_back-porch-capabilities.
// A unit that leaves h, s and v at zero is a white unit driven by bright and
// temperature, which is what the Bar and Bath bulbs can show.

#include <stdio.h>
#include <string.h>

struct SceneUnit { uint8_t sw, grad, change; uint16_t h, s, v, bright, temp; };
struct Scene { const char *name; uint8_t count; SceneUnit units[3]; };

#define GRADIENT 2
#define JUMP     1
#define STATIC   0

static const Scene SCENES[] = {
  { "READING", 1, { { 10, 0, STATIC, 0, 0, 0, 1000, 750 } } },
  { "CANDLE",  1, { { 20, 40, GRADIENT, 28, 900, 700, 450, 0 } } },
  { "SUNSET",  3, { { 15, 30, GRADIENT, 12, 1000, 1000, 800, 0 },
                    { 15, 30, GRADIENT, 32,  950, 1000, 800, 0 },
                    { 15, 30, GRADIENT, 345, 900,  900, 700, 0 } } },
  { "OCEAN",   3, { { 15, 35, GRADIENT, 185, 900, 1000, 800, 0 },
                    { 15, 35, GRADIENT, 210, 950, 1000, 800, 0 },
                    { 15, 35, GRADIENT, 235, 900,  900, 700, 0 } } },
  { "FOREST",  2, { { 15, 35, GRADIENT, 105, 900, 900, 700, 0 },
                    { 15, 35, GRADIENT, 145, 950, 1000, 800, 0 } } },
  { "PARTY",   3, { { 5, 0, JUMP,   0, 1000, 1000, 1000, 0 },
                    { 5, 0, JUMP, 120, 1000, 1000, 1000, 0 },
                    { 5, 0, JUMP, 240, 1000, 1000, 1000, 0 } } },
};
static const uint8_t SCENE_COUNT = sizeof(SCENES) / sizeof(SCENES[0]);

// Build the hex string the bulb expects: 2 characters per byte, no separators.
inline void scenePayload(char *out, size_t cap, int idx) {
  if (idx < 0 || idx >= SCENE_COUNT) idx = 0;
  const Scene &s = SCENES[idx];
  size_t n = snprintf(out, cap, "%02x", idx);
  for (uint8_t i = 0; i < s.count && n + 26 < cap; i++) {
    const SceneUnit &u = s.units[i];
    n += snprintf(out + n, cap - n, "%02x%02x%02x%04x%04x%04x%04x%04x",
                  u.sw, u.grad, u.change, u.h, u.s, u.v, u.bright, u.temp);
  }
}

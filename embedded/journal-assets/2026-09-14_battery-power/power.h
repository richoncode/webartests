#pragma once
// Idle behaviour for battery use.
//
//   active        backlight at full, everything running
//   20 s idle     a slow fade to a dim glow, ~3 s
//   45 s idle     fade out, panel off, LEDs off, Wi-Fi off, light sleep
//   any input     awake, full brightness, Wi-Fi reconnecting
//
// Light sleep rather than deep sleep, because of where the inputs sit. Only
// GPIO 0-21 are RTC-capable on the ESP32-S3, so deep sleep's ext1 wake can see
// the touch interrupt on GPIO5 and none of the encoder — GPIO41, 42 and 45 are
// all outside that range. Light sleep keeps the GPIO peripheral powered and can
// wake on any pin, which is what lets the knob bring the device back.
//
// The wake level is chosen per pin from its level at the moment of sleeping,
// so whichever way the encoder happens to be resting, a turn changes something
// and that change is the wake.

#include <Arduino.h>
#include <WiFi.h>
#include "esp_sleep.h"
#include "driver/gpio.h"

static const uint32_t IDLE_DIM_MS   = 20000;
static const uint32_t IDLE_SLEEP_MS = 45000;
static const int      BL_ACTIVE = 200;
static const int      BL_DIM    = 16;
static const uint32_t FADE_STEP_MS = 16;      // 200 -> 16 in about three seconds

static uint32_t lastActivityMs = 0;
static int      blNow = BL_ACTIVE;

inline void backlight(int v) {
  blNow = v < 0 ? 0 : (v > 255 ? 255 : v);
  ledcWrite(PIN_LCD_BL, blNow);
}
inline void noteActivity() {
  lastActivityMs = millis();
  if (blNow != BL_ACTIVE) backlight(BL_ACTIVE);
}

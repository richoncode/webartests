#pragma once
// Battery percentage, and a days-until-recharge estimate.
//
// The first version anchored its baseline before the clock was synced, so t0
// landed in 1970 and the elapsed span came out at ~20,690 days. Dividing a 3%
// drop by that gave 0.000145 %/day and a runway of 607,333 days. Two defenses
// now: the estimate is only ever computed after NTP, and any stored timestamp
// that is not a plausible epoch is thrown away.
//
// It also starts from a measured prior rather than refusing to answer. Two
// clean overnight readings on the bench -- 88% at 05:57 on 2026-09-08 and 87%
// at 05:57 on 2026-09-09 -- give 1.0 %/day at a 6 h wake, which matches Seeed's
// three-month figure. Measured history displaces the prior as it accumulates.

#include <Preferences.h>
#include <time.h>
#include "config.h"

class Battery {
public:
  void begin() { prefs.begin("dash", false); }

  int readPercent() {
    pinMode(BATT_ENABLE_PIN, OUTPUT);
    digitalWrite(BATT_ENABLE_PIN, HIGH);
    delay(20);
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) { sum += analogReadMilliVolts(BATT_ADC_PIN); delay(2); }
    digitalWrite(BATT_ENABLE_PIN, LOW);
    return percentFromMillivolts((sum / 16.0f) * 2.0f);
  }

  // Call only once the clock is valid. Returns days until recharge.
  int daysUntilRecharge(int pct) {
    uint32_t now = (uint32_t)time(nullptr);
    if (!plausible(now)) return (int)(pct / DRAIN_PRIOR_PCT_PER_DAY + 0.5f);

    uint32_t t0 = prefs.getUInt("t0", 0);
    int      p0 = prefs.getInt("p0", 0);

    // Re-anchor on a bad timestamp, the first run, or a charge.
    if (!plausible(t0) || p0 <= 0 || pct > p0 + CHARGE_DETECT_PCT) {
      prefs.putUInt("t0", now);
      prefs.putInt("p0", pct);
      return (int)(pct / DRAIN_PRIOR_PCT_PER_DAY + 0.5f);
    }

    float elapsedDays = (now - t0) / 86400.0f;
    int   drop        = p0 - pct;
    float rate        = DRAIN_PRIOR_PCT_PER_DAY;

    if (elapsedDays >= 1.0f && drop >= 2) {
      float measured = drop / elapsedDays;
      // Trust the measurement more as the window lengthens; a single day of
      // 1%-resolution readings is far too noisy to stand on its own.
      float w = elapsedDays / 7.0f; if (w > 1.0f) w = 1.0f;
      rate = (1.0f - w) * DRAIN_PRIOR_PCT_PER_DAY + w * measured;
    }
    if (rate < DRAIN_MIN_PCT_PER_DAY) rate = DRAIN_MIN_PCT_PER_DAY;
    if (rate > DRAIN_MAX_PCT_PER_DAY) rate = DRAIN_MAX_PCT_PER_DAY;
    return (int)(pct / rate + 0.5f);
  }

  int  bumpMissedRefreshes() { int m = prefs.getInt("missed", 0) + 1; prefs.putInt("missed", m); return m; }
  void clearMissedRefreshes() { prefs.putInt("missed", 0); }

private:
  Preferences prefs;
  static bool plausible(uint32_t t) { return t > 1700000000u; }   // after Nov 2023

  static int percentFromMillivolts(float mv) {
    static const float V[]  = {3300, 3600, 3700, 3750, 3790, 3870, 3950, 4020, 4100, 4200};
    static const float Pc[] = {   0,   10,   20,   30,   40,   50,   60,   70,   85,  100};
    const int N = sizeof(V) / sizeof(V[0]);
    if (mv <= V[0]) return 0;
    if (mv >= V[N - 1]) return 100;
    for (int i = 1; i < N; i++)
      if (mv < V[i]) {
        float f = (mv - V[i - 1]) / (V[i] - V[i - 1]);
        return (int)(Pc[i - 1] + f * (Pc[i] - Pc[i - 1]) + 0.5f);
      }
    return 100;
  }
};

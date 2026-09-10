#pragma once
// Battery percentage, and a drain estimate built from samples kept in NVS.
//
// The panel must never print a runway it cannot support, so the estimate stays
// hidden until there are enough samples spread over enough drop to mean anything.

#include <Preferences.h>
#include <esp_adc_cal.h>
#include "config.h"

class Battery {
public:
  void begin() { prefs.begin("dash", false); }

  int readPercent() {
    pinMode(BATT_ENABLE_PIN, OUTPUT);
    digitalWrite(BATT_ENABLE_PIN, HIGH);
    delay(20);                                   // let the divider settle
    uint32_t sum = 0;
    for (int i = 0; i < 16; i++) { sum += analogReadMilliVolts(BATT_ADC_PIN); delay(2); }
    digitalWrite(BATT_ENABLE_PIN, LOW);
    float mv = (sum / 16.0f) * 2.0f;             // on-board divider halves it
    return percentFromMillivolts(mv);
  }

  // Straight-line fit over the stored samples. Returns false while the history
  // is too short or the total drop too small to mean anything.
  bool estimateRunwayDays(int pct, int &daysOut) {
    uint32_t now = (uint32_t)time(nullptr);
    int n = prefs.getInt("n", 0);
    uint32_t t0 = prefs.getUInt("t0", 0);
    int p0 = prefs.getInt("p0", 0);

    if (n == 0 || pct > p0) {                    // first run, or it was charged
      prefs.putUInt("t0", now);
      prefs.putInt("p0", pct);
      prefs.putInt("n", 1);
      return false;
    }
    prefs.putInt("n", ++n);

    float elapsedDays = (now - t0) / 86400.0f;
    int drop = p0 - pct;
    if (n < RUNWAY_MIN_SAMPLES || drop < RUNWAY_MIN_DROP_PCT || elapsedDays <= 0.0f) return false;

    float perDay = drop / elapsedDays;
    if (perDay <= 0.0f) return false;
    daysOut = (int)(pct / perDay + 0.5f);
    return true;
  }

  int bumpMissedRefreshes() {
    int m = prefs.getInt("missed", 0) + 1;
    prefs.putInt("missed", m);
    return m;
  }
  void clearMissedRefreshes() { prefs.putInt("missed", 0); }
  int  missedRefreshes() { return prefs.getInt("missed", 0); }

private:
  Preferences prefs;

  // Li-ion discharge curve is not linear, so interpolate a small table rather
  // than mapping voltage straight onto percent.
  static int percentFromMillivolts(float mv) {
    static const float V[] = {3300, 3600, 3700, 3750, 3790, 3870, 3950, 4020, 4100, 4200};
    static const float Pc[] = {   0,   10,   20,   30,   40,   50,   60,   70,   85,  100};
    const int N = sizeof(V) / sizeof(V[0]);
    if (mv <= V[0]) return 0;
    if (mv >= V[N - 1]) return 100;
    for (int i = 1; i < N; i++) {
      if (mv < V[i]) {
        float f = (mv - V[i - 1]) / (V[i] - V[i - 1]);
        return (int)(Pc[i - 1] + f * (Pc[i] - Pc[i - 1]) + 0.5f);
      }
    }
    return 100;
  }
};

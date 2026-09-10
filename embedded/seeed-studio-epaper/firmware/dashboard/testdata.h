#pragma once
// Synthetic frames for the development button modes. Nothing here reaches a
// live frame: a test frame is drawn only when testMode != 0, and the header
// says TEST so it cannot be mistaken for real data.

#include "model.h"
#include "config.h"
#include "calendar.h"

static const int TEST_MODE_COUNT = 4;

inline void fillDay(DayForecast &d, const char *label, int code, int hi, int lo, int pp) {
  snprintf(d.label, sizeof(d.label), "%s", label);
  d.weatherCode = code; d.high = hi; d.low = lo; d.precipPct = pp;
}

inline void loadTestFrame(Model &m, int mode) {
  m = Model{};
  snprintf(m.weekday,  sizeof(m.weekday),  "MONDAY");
  snprintf(m.dateLine, sizeof(m.dateLine), "8 May 2027");
  snprintf(m.sunrise,  sizeof(m.sunrise),  "6:41a");
  snprintf(m.sunset,   sizeof(m.sunset),   "7:27p");
  snprintf(m.peakAt,   sizeof(m.peakAt),   "at 3:40 PM");
  m.peakTemp = 94; m.aqi = 30; m.pm25 = 3.5f;
  m.batteryPct = 78; m.runwayDays = 78;
  fillDay(m.days[0], "TODAY", 0, 94, 54, 0);
  fillDay(m.days[1], "TUE",   0, 96, 56, 0);
  fillDay(m.days[2], "WED",   1, 91, 55, 10);
  fillDay(m.days[3], "THU",   2, 86, 53, 20);
  fillDay(m.days[4], "FRI",   3, 79, 52, 30);

  switch (mode) {
    case 1:   // every band at once — the tightest layout there is
      m.eventToday = true; m.eventKind = EVT_BIRTHDAY;
      snprintf(m.eventName, sizeof(m.eventName), "RICHARD'S BIRTHDAY");
      m.binsTonight = true;
      m.launchTonight = true; m.launchPrime = true;
      snprintf(m.launchName, sizeof(m.launchName), "FALCON 9 - STARLINK 15-24");
      snprintf(m.launchSub,  sizeof(m.launchSub),  "LOOK SSE - 200 mi - booster to droneship");
      snprintf(m.launchTime, sizeof(m.launchTime), "8:14 PM");
      snprintf(m.launchTz,   sizeof(m.launchTz),   "45 min after sunset");
      break;

    case 2:   // wildfire smoke and a flat battery
      m.aqi = 164; m.pm25 = 81.6f;
      m.peakTemp = 104; m.days[0].high = 104;
      m.batteryPct = 11; m.runwayDays = 11;
      snprintf(m.eventName, sizeof(m.eventName), "CALIFORNIA WILDLIFE DAY");
      m.eventToday = true; m.eventKind = EVT_WILDLIFE;
      break;

    case 3:   // carried-over data, nothing fetched
      m.stale = true; m.missedRefreshes = 3;
      m.aqi = -1;
      m.batteryPct = 44; m.runwayDays = 44;
      break;

    case 4:   // a wet week, moderate air, longest possible event name
      m.aqi = 78; m.pm25 = 24.1f;
      m.peakTemp = 61;
      fillDay(m.days[0], "TODAY", 61, 61, 49, 90);
      fillDay(m.days[1], "TUE",   61, 64, 48, 70);
      fillDay(m.days[2], "WED",    3, 69, 47, 40);
      fillDay(m.days[3], "THU",    1, 74, 48, 20);
      fillDay(m.days[4], "FRI",    0, 80, 50, 0);
      m.binsTonight = true;
      break;
  }
  snprintf(m.asOf, sizeof(m.asOf), "TEST MODE %d - not live data", mode);
}

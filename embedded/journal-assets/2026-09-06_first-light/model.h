#pragma once
// Everything the panel draws, in one struct. Fetch fills it, render reads it,
// and nothing else talks to the network.

#include <stdint.h>
#include <string.h>

struct DayForecast {
  char  label[8];      // "TODAY", "WED", ...
  int   weatherCode;   // WMO code from Open-Meteo
  int   high;          // deg F
  int   low;
  int   precipPct;     // precipitation_probability_max
};

struct Model {
  // header
  char  weekday[12];   // "MONDAY"
  char  dateLine[24];  // "7 September 2026"
  char  asOf[40];   // "as of 16:22 - next 18:00" is 24 chars; 24 truncated it to 18:0      // "as of 06:00 - next 12:00"
  int   nowTemp;
  int   nowCode;
  char  condition[28];

  // detail row
  int   peakTemp;
  char  peakAt[16];    // "at 3:40 PM"
  char  sunrise[8];    // "6:42a"
  char  sunset[8];     // "7:29p"
  int   aqi;
  float pm25;

  // forecast strip, index 0 is today
  DayForecast days[5];

  // today's hourly cloud cover, index = hour of day. A launch is only worth
  // showing if the sky is clear at lift-off, which a single daily weather code
  // cannot answer: today came back as code 3 (overcast) while the current code
  // was 0 (clear).
  uint8_t cloudPct[24];
  bool    haveCloud;

  // bands
  bool  binsTonight;
  bool  launchTonight;
  char  launchName[52];
  char  launchSub[56];
  char  launchTime[8];
  char  launchTz[32];
  bool  launchPrime;

  // footer
  int   batteryPct;
  bool  runwayKnown;
  int   runwayDays;

  // set when a fetch failed and the panel is showing carried-over data
  bool  stale;
  int   missedRefreshes;

  // A full refresh takes 15-20 s and flickers hard, so the panel is only
  // repainted when something it draws has actually changed. This hashes exactly
  // the fields that reach the screen -- not the fetch time, not the battery
  // voltage, which would change on every wake and defeat the whole point.
  uint32_t contentHash() const {
    uint32_t h = 2166136261u;
    auto mix = [&h](const void *p, size_t n) {
      const uint8_t *b = (const uint8_t *)p;
      for (size_t i = 0; i < n; i++) { h ^= b[i]; h *= 16777619u; }
    };
    auto str = [&](const char *s) { mix(s, strlen(s)); h ^= 0x5bf03635u; };
    str(weekday); str(dateLine); str(condition); str(peakAt); str(sunrise); str(sunset);
    mix(&nowTemp, sizeof nowTemp); mix(&nowCode, sizeof nowCode);
    mix(&peakTemp, sizeof peakTemp); mix(&aqi, sizeof aqi);
    int pm = (int)(pm25 * 10);              // tenths, as drawn
    mix(&pm, sizeof pm);
    for (int i = 0; i < 5; i++) {
      mix(&days[i].high, sizeof days[i].high);
      mix(&days[i].low, sizeof days[i].low);
      mix(&days[i].precipPct, sizeof days[i].precipPct);
      mix(&days[i].weatherCode, sizeof days[i].weatherCode);
      str(days[i].label);
    }
    mix(&binsTonight, sizeof binsTonight);
    mix(&launchTonight, sizeof launchTonight);
    str(launchName); str(launchSub); str(launchTime); str(launchTz);
    mix(&launchPrime, sizeof launchPrime);
    // battery to the nearest 5% and the runway to whole days, so ordinary drift
    // does not trigger a repaint
    int b5 = batteryPct / 5;   mix(&b5, sizeof b5);
    mix(&runwayKnown, sizeof runwayKnown);
    if (runwayKnown) mix(&runwayDays, sizeof runwayDays);
    mix(&stale, sizeof stale);
    return h;
  }
};

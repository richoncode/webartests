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
  bool     eventToday;
  uint8_t  eventKind;      // EventKind from calendar.h
  char     eventName[32];
  bool  binsTonight;
  bool  launchTonight;
  char  launchName[52];
  char  launchSub[56];
  char  launchTime[12];
  char  launchTz[32];
  bool  launchPrime;

  // footer
  int   batteryPct;
  int   runwayDays;      // days until recharge; always populated from a prior

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
    // asOf is drawn but deliberately NOT hashed: it changes on every wake, so
    // including it would repaint every time and there would be no way to see
    // whether change detection works at all.
    //
    // nowTemp, nowCode and condition are not hashed either -- they stopped
    // being drawn when the header lost the current temperature and its
    // condition line. Hashing a field the panel no longer shows repaints the
    // screen for a change nobody can see, which is exactly the symptom.
    str(weekday); str(dateLine); str(peakAt); str(sunrise); str(sunset);
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
    mix(&eventToday, sizeof eventToday); mix(&eventKind, sizeof eventKind); str(eventName);
    mix(&binsTonight, sizeof binsTonight);
    mix(&launchTonight, sizeof launchTonight);
    str(launchName); str(launchSub); str(launchTime); str(launchTz);
    mix(&launchPrime, sizeof launchPrime);
    // Both are drawn exactly, so both are hashed exactly. Bucketing them let the
    // panel show a percentage that no longer matched the reading behind it.
    // At ~1 %/day this costs about one repaint a day, which is the honest price
    // of the number on screen being true.
    mix(&batteryPct, sizeof batteryPct);
    mix(&runwayDays, sizeof runwayDays);
    mix(&stale, sizeof stale);
    return h;
  }
};

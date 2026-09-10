#pragma once
// Everything the panel draws, in one struct. Fetch fills it, render reads it,
// and nothing else talks to the network.

#include <stdint.h>

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
  char  asOf[24];      // "as of 06:00 - next 12:00"
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

  // bands
  bool  binsTonight;
  bool  launchTonight;
  char  launchName[40];
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
};

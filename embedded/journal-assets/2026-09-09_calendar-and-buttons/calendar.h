#pragma once
// Fixed dates worth a banner. No network, no configuration file — these do not
// change, so they live in the firmware.
//
// A birthday and bin night can land on the same Monday, and a Vandenberg launch
// on top of that. Three stacked bands leave the forecast strip too short, so
// the event and bins bands share one row when both are due (see layout.h).

#include <stdint.h>

struct CalendarEvent {
  uint8_t     month;
  uint8_t     day;
  const char *label;
};

static const CalendarEvent CALENDAR[] = {
  {  1,  8, "RHONDA'S BIRTHDAY"       },
  {  5,  8, "RICHARD'S BIRTHDAY"      },
  {  6, 15, "MAESTRO'S BIRTHDAY"      },
  {  9,  4, "CALIFORNIA WILDLIFE DAY" },
  { 10, 10, "TORI'S BIRTHDAY"         },
};
static const int CALENDAR_N = sizeof(CALENDAR) / sizeof(CALENDAR[0]);

// tm_mon is 0-based, tm_mday is 1-based.
inline const char *calendarLookup(int tm_mon, int tm_mday) {
  for (int i = 0; i < CALENDAR_N; i++)
    if (CALENDAR[i].month == tm_mon + 1 && CALENDAR[i].day == tm_mday)
      return CALENDAR[i].label;
  return nullptr;
}

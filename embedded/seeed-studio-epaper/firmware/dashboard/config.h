#pragma once

// Location — San Martin, CA
// https://en.wikipedia.org/wiki/San_Martin,_California
#define LAT              37.08778
#define LON             -121.60000
#define TZ_NAME         "America/Los_Angeles"
#define PLACE_LABEL     "SAN MARTIN, CA"

// Forecast source. Open-Meteo needs no API key, so the device stores no secret.
#define WX_HOST         "api.open-meteo.com"
#define WX_PATH \
  "/v1/forecast?latitude=37.08778&longitude=-121.60000" \
  "&current=temperature_2m,apparent_temperature,weather_code" \
  "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max," \
  "precipitation_sum,sunrise,sunset,weather_code" \
  "&hourly=temperature_2m,cloud_cover" \
  "&temperature_unit=fahrenheit&precipitation_unit=inch" \
  "&timezone=America%2FLos_Angeles&forecast_days=5"

// Day 0 of the daily arrays is today, so the forecast strip's first column and
// the today figures come from the same request. No second call, no drift
// between "today" in one place and "today" in another.
#define FORECAST_DAYS       5

// Refresh. The panel takes 15-20 s to repaint and has no partial refresh, so
// the wake interval is the battery decision. 6 h is Seeed's ~3-month figure.
#define WAKE_HOUR_MORNING   6      // the dashboard people actually read
#define WAKE_INTERVAL_HOURS 12     // 06:00 and 18:00 -- two repaints a day at most

// Bump this whenever the drawing changes shape. The content hash covers the
// data, not the layout, so without it a firmware update that moves everything
// around finds the same hash, skips the repaint, and leaves the old arrangement
// on the glass until something in the weather happens to change.
#define LAYOUT_VERSION      7

// The water filter is changed on the first Sunday of the month, and the badge
// stands for three days: Sunday green, Monday yellow, Tuesday red. The colour
// counts the days down rather than grading severity — red is the last day of
// the reminder, not a worse problem.
#define FILTER_FIRST_WEEKDAY  0    // Sunday
#define FILTER_DAYS           3

// Bins. They go to the curb on Monday night and come back in on Tuesday, once
// the truck has been. Two reminders, one band. 1 = Monday.
#define BIN_OUT_WEEKDAY     1
#define BIN_IN_WEEKDAY      2

// Battery
#define BATT_ADC_PIN        1
#define BATT_ENABLE_PIN     21
#define BATT_WARN_PCT       35     // amber
#define BATT_CRITICAL_PCT   15     // red, "PLUG IN NOW"
// Measured on the bench: 88% at 05:57 on 2026-09-08, 87% at 05:57 on
// 2026-09-09 -- 1.0 %/day at a 6 h wake. Used as the starting estimate so the
// panel shows a number from the first frame; measured history displaces it.
#define DRAIN_PRIOR_PCT_PER_DAY  1.0f
#define DRAIN_MIN_PCT_PER_DAY    0.2f   // clamp: no five-year runways
#define DRAIN_MAX_PCT_PER_DAY   20.0f
#define CHARGE_DETECT_PCT        3      // a rise this large means it was charged

// ── Air quality ──────────────────────────────────────────────────────────────
// Open-Meteo's air-quality endpoint, also keyless. Verified against the live
// endpoint on 2026-09-06: San Martin returned us_aqi 30, pm2_5 3.5 ug/m3.
#define AQ_HOST         "air-quality-api.open-meteo.com"
#define AQ_PATH \
  "/v1/air-quality?latitude=37.08778&longitude=-121.60000" \
  "&current=us_aqi,pm2_5&timezone=America%2FLos_Angeles"

// US EPA bands, collapsed onto the three colors the panel has for a scale.
#define AQI_GOOD_MAX        50     // green
#define AQI_MODERATE_MAX   100     // yellow; above this, red

// The forecast high is the day's headline here, so it turns red once it clears
// this. San Martin summers put it there often.
#define PEAK_HOT_F          90

// Onboard peripherals (Seeed ESPHome cookbook pin map)
// Green refreshes; the two white buttons drive the development test modes.
// All three are RTC-capable, so deep sleep wakes on any of them via ext1 rather
// than ext0, which can only watch one pin.
#define PIN_BTN_GREEN       3      // refresh now
#define PIN_BTN_WHITE_R     4      // next test frame  (also Seeed's suggested wake pin)
#define PIN_BTN_WHITE_L     5      // back to live
#define PIN_LED             6
#define PIN_BUZZER          45
#define PIN_I2C_SDA         19     // SHT4x — present on the board, not on the
#define PIN_I2C_SCL         20     // dashboard: air conditioning keeps the
                                   // inside reading flat, so it earns no space.
                                   // Kept here for the enclosure-alarm idea.

// ── Vandenberg launch visibility ─────────────────────────────────────────────
// Launch Library 2 needs no API key. Location id 11 is "Vandenberg SFB, CA, USA",
// verified against the live endpoint on 2026-09-06.
// https://thespacedevs.com/llapi
#define LL2_HOST        "ll.thespacedevs.com"
// Two steps, because the shapes differ in cost. The list response (~25 kB)
// carries net, name and id -- enough to decide whether anything qualifies
// tonight. Only then is one launch fetched in detail for its landing data.
// Asking for five detailed launches up front is ~71 kB and the read does not
// survive it: ArduinoJson reports IncompleteInput.
// v2.3.0, not 2.2.0. The old version still answers, and when it stops the band
// will vanish with no other symptom — the one failure the RTC cache cannot
// cover, because it expires with the day. The collection is plural in 2.3.0
// and the list response carries the mission's orbit, which the drift hint used
// to need a second request for.
#define LL2_PATH \
  "/2.3.0/launches/upcoming/?location__ids=11&limit=5&hide_recent_previous=true"
#define LL2_DETAIL_FMT  "/2.3.0/launches/%s/?mode=detailed"

// A Vandenberg launch is worth showing only when it is dark here and the rocket
// climbs into sunlight — the twilight effect. Show a launch when ALL hold:
//   1. the local sky is clear or nearly so          (WX_CLEAR_MAX_CLOUD_PCT)
//   2. lift-off falls after sunset or before sunrise (dusk margin below)
//   3. lift-off is today, local time
#define WX_CLEAR_MAX_CLOUD_PCT   35
#define LAUNCH_DUSK_MARGIN_MIN   15   // count from sunset minus this
// Best viewing runs from sunset to about 90 min after; flag those as prime.
// The band carries a chance rather than a verdict. Green says go outside,
// yellow says worth a look, blue says it is happening and probably not visible.
// The floor is low on purpose: a launch at ten percent is still a launch
// tonight, and "probably not, but it is up there at 6:29" is the point of it.
#define LAUNCH_SHOW_MIN_PCT       5
#define LAUNCH_YELLOW_PCT        30
#define LAUNCH_GREEN_PCT         55
#define LAUNCH_PLUME_LAG_MIN      6    // the sky is judged this long after lift-off
#define LAUNCH_PREP_MIN           5    // "out by" this many minutes before it goes

// Bearing from San Martin (37.08778, -121.60000) to Vandenberg SFB
// SLC-4E (34.632, -120.611) bears 162 degrees from San Martin — south-south-east,
// 178 miles out. The pad coordinates come from Launch Library's own record; the
// bearing and distance are the great-circle values between the two.
#define LAUNCH_LOOK_BEARING_DEG  160
#define LAUNCH_LOOK_LABEL        "LOOK SSE"

// Booster landings appear on the same launch record, under
// rocket.launcher_stage[].landing — location "LZ-4" is the Vandenberg pad and
// is worth calling out separately from a droneship recovery.
#define LANDING_PAD_HINT         "LZ-4"

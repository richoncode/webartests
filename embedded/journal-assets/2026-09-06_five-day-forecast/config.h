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
  "&hourly=temperature_2m" \
  "&temperature_unit=fahrenheit&precipitation_unit=inch" \
  "&timezone=America%2FLos_Angeles&forecast_days=5"

// Day 0 of the daily arrays is today, so the forecast strip's first column and
// the today figures come from the same request. No second call, no drift
// between "today" in one place and "today" in another.
#define FORECAST_DAYS       5

// Refresh. The panel takes 15-20 s to repaint and has no partial refresh, so
// the wake interval is the battery decision. 6 h is Seeed's ~3-month figure.
#define WAKE_HOUR_MORNING   6      // the dashboard people actually read
#define WAKE_INTERVAL_HOURS 6

// Bin night: reminder shown on this weekday. 1 = Monday.
#define BIN_WEEKDAY         1

// Battery
#define BATT_ADC_PIN        1
#define BATT_ENABLE_PIN     21
#define BATT_WARN_PCT       35     // amber
#define BATT_CRITICAL_PCT   15     // red, "PLUG IN NOW"
#define RUNWAY_MIN_SAMPLES  4      // days of history before showing an estimate
#define RUNWAY_MIN_DROP_PCT 3      // ignore noise below this total drop

// ── Air quality ──────────────────────────────────────────────────────────────
// Open-Meteo's air-quality endpoint, also keyless. Verified against the live
// endpoint on 2026-09-06: San Martin returned us_aqi 30, pm2_5 3.5 ug/m3.
#define AQ_HOST         "air-quality-api.open-meteo.com"
#define AQ_PATH \
  "/v1/air-quality?latitude=37.08778&longitude=-121.60000" \
  "&current=us_aqi,pm2_5&timezone=America%2FLos_Angeles"

// US EPA bands, collapsed onto the three colours the panel has for a scale.
#define AQI_GOOD_MAX        50     // green
#define AQI_MODERATE_MAX   100     // yellow; above this, red

// The forecast high is the day's headline here, so it turns red once it clears
// this. San Martin summers put it there often.
#define PEAK_HOT_F          90

// Onboard peripherals (Seeed ESPHome cookbook pin map)
#define PIN_BTN_GREEN       3
#define PIN_BTN_WHITE_R     4      // recommended deep-sleep wake pin
#define PIN_BTN_WHITE_L     5
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
#define LL2_PATH \
  "/2.2.0/launch/upcoming/?location__ids=11&limit=5&hide_recent_previous=true"

// A Vandenberg launch is worth showing only when it is dark here and the rocket
// climbs into sunlight — the twilight effect. Show a launch when ALL hold:
//   1. the local sky is clear or nearly so          (WX_CLEAR_MAX_CLOUD_PCT)
//   2. lift-off falls after sunset or before sunrise (dusk margin below)
//   3. lift-off is today, local time
#define WX_CLEAR_MAX_CLOUD_PCT   35
#define LAUNCH_DUSK_MARGIN_MIN   15   // count from sunset minus this
// Best viewing runs from sunset to about 90 min after; flag those as prime.
#define LAUNCH_PRIME_WINDOW_MIN  90

// Bearing from San Martin (37.08778, -121.60000) to Vandenberg SFB
// (34.742, -120.573) is about 160 degrees — south-south-east, 200 miles out.
#define LAUNCH_LOOK_BEARING_DEG  160
#define LAUNCH_LOOK_LABEL        "LOOK SSE"

// Booster landings appear on the same launch record, under
// rocket.launcher_stage[].landing — location "LZ-4" is the Vandenberg pad and
// is worth calling out separately from a droneship recovery.
#define LANDING_PAD_HINT         "LZ-4"

// Morning dashboard for the Seeed reTerminal E1002.
//
// Wakes on a timer or the right white button, fetches forecast, air quality and
// Vandenberg launches, and repaints ONLY if something it draws has changed. A
// full refresh takes 15-20 s and flickers hard, so an unchanged panel is left
// alone and the wake costs nothing but a few seconds of radio.
//
// Board:   esp32:esp32:esp32s3  FlashSize=32M,PSRAM=opi,PartitionScheme=custom
// Library: Seeed_GFX, ArduinoJson

#include "driver.h"
#include "TFT_eSPI.h"

#include <WiFi.h>
#include <time.h>
#include <esp_sleep.h>
#include <Preferences.h>
#include <driver/rtc_io.h>

#include "config.h"
#include "secrets.h"
#include "model.h"
#include "layout.h"
#include "battery.h"
#include "calendar.h"
#include "testdata.h"
#include "fetch.h"
#include "render.h"

EPaper epaper;
Battery battery;

// Survives deep sleep; the NVS copy survives a power cycle as well.
RTC_DATA_ATTR uint32_t rtcLastHash = 0;
RTC_DATA_ATTR uint32_t rtcWakeCount = 0;
RTC_DATA_ATTR int      rtcTestMode = 0;    // 0 = live; 1..TEST_MODE_COUNT = synthetic

// Which button, if any, woke us. ext1 reports a bitmask of the pins that were
// low, so a press can be attributed rather than merely detected.
static int wakeButton() {
  if (esp_sleep_get_wakeup_cause() != ESP_SLEEP_WAKEUP_EXT1) return -1;
  uint64_t mask = esp_sleep_get_ext1_wakeup_status();
  if (mask & (1ULL << PIN_BTN_GREEN))   return PIN_BTN_GREEN;
  if (mask & (1ULL << PIN_BTN_WHITE_R)) return PIN_BTN_WHITE_R;
  if (mask & (1ULL << PIN_BTN_WHITE_L)) return PIN_BTN_WHITE_L;
  return -1;
}

static const char *wakeReason() {
  switch (esp_sleep_get_wakeup_cause()) {
    case ESP_SLEEP_WAKEUP_TIMER: return "timer";
    case ESP_SLEEP_WAKEUP_EXT1:  return "button";
    default:                     return "power-on";
  }
}

static bool connectWiFi(uint32_t timeoutMs = 20000) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) delay(200);
  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("  wifi: failed, status %d after %lu ms\n", WiFi.status(), millis() - start);
    return false;
  }
  Serial.printf("  wifi: %s  ip %s  rssi %d dBm  %lu ms\n",
                WIFI_SSID, WiFi.localIP().toString().c_str(), WiFi.RSSI(), millis() - start);
  return true;
}

static bool syncClock(uint32_t timeoutMs = 12000) {
  configTzTime("PST8PDT,M3.2.0,M11.1.0", "pool.ntp.org", "time.nist.gov");
  uint32_t start = millis();
  while (time(nullptr) < 1700000000 && millis() - start < timeoutMs) delay(200);
  bool ok = time(nullptr) >= 1700000000;
  Serial.printf("  ntp:  %s\n", ok ? "ok" : "FAILED");
  return ok;
}

// Seconds until the next aligned wake. Shared with the sleep call so the panel
// cannot advertise 06:00 while the timer is actually set for 12:00.
static uint64_t secondsToNextWake() {
  time_t t = time(nullptr);
  if (t <= 1700000000) return (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL;
  struct tm lt; localtime_r(&t, &lt);
  // Align to WAKE_HOUR_MORNING, not to midnight. A 12 h interval aligned to
  // midnight wakes at 00:00 and 12:00, which is no use to a morning dashboard;
  // anchored at 06:00 it wakes at 06:00 and 18:00.
  int fromAnchor = ((lt.tm_hour - WAKE_HOUR_MORNING) % WAKE_INTERVAL_HOURS
                    + WAKE_INTERVAL_HOURS) % WAKE_INTERVAL_HOURS;
  int intoBlock = fromAnchor * 3600 + lt.tm_min * 60 + lt.tm_sec;
  uint64_t s = (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL - intoBlock;
  if (s < 300) s += (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL;   // do not wake twice in a minute
  return s;
}

static void fillAsOf(Model &m) {
  time_t t = time(nullptr);
  struct tm lt; localtime_r(&t, &lt);
  time_t next = t + (time_t)secondsToNextWake();
  struct tm nx; localtime_r(&next, &nx);
  snprintf(m.asOf, sizeof(m.asOf), "as of %02d:%02d - next %02d:%02d",
           lt.tm_hour, lt.tm_min, nx.tm_hour, nx.tm_min);
}

static void sleepUntilNextWake() {
  // Any of the three buttons wakes it. Pull-ups have to be held through deep
  // sleep or the pins float and the board wakes on noise.
  const uint64_t BTN_MASK = (1ULL << PIN_BTN_GREEN)
                          | (1ULL << PIN_BTN_WHITE_R)
                          | (1ULL << PIN_BTN_WHITE_L);
  for (int pin : {PIN_BTN_GREEN, PIN_BTN_WHITE_R, PIN_BTN_WHITE_L}) {
    rtc_gpio_pullup_en((gpio_num_t)pin);
    rtc_gpio_pulldown_dis((gpio_num_t)pin);
  }
  esp_sleep_enable_ext1_wakeup(BTN_MASK, ESP_EXT1_WAKEUP_ANY_LOW);
  uint64_t seconds = secondsToNextWake();
  Serial.printf("sleeping %llu s (%.1f h)\n\n", seconds, seconds / 3600.0);
  Serial.flush();
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(400);                       // let the USB serial settle before the first print
  rtcWakeCount++;
  int btn = wakeButton();
  bool forceRepaint = false;
  if (btn == PIN_BTN_GREEN) {
    // An update button that sometimes does nothing is not an update button.
    rtcTestMode = 0;
    forceRepaint = true;
  } else if (btn == PIN_BTN_WHITE_R) {
    rtcTestMode = rtcTestMode >= TEST_MODE_COUNT ? 1 : rtcTestMode + 1;
    forceRepaint = true;
  } else if (btn == PIN_BTN_WHITE_L) {
    rtcTestMode = 0;
    forceRepaint = true;
  }
  Serial.printf("\n=== wake %lu (%s%s) ===\n", rtcWakeCount, wakeReason(),
                btn == PIN_BTN_GREEN ? ": green/refresh"
              : btn == PIN_BTN_WHITE_R ? ": white-R/next test"
              : btn == PIN_BTN_WHITE_L ? ": white-L/live" : "");
  if (rtcTestMode) Serial.printf("  TEST MODE %d — synthetic frame, no fetch\n", rtcTestMode);
  Serial.printf("  heap %u free, psram %u free\n", ESP.getFreeHeap(), ESP.getFreePsram());

  battery.begin();

  if (rtcTestMode) {
    Model tm;
    loadTestFrame(tm, rtcTestMode);
    epaper.begin();
    epaper.setRotation(0);
    Renderer r(epaper);
    r.draw(tm);
    epaper.update();
    rtcLastHash = 0;            // force a real repaint on the way back to live
    Serial.println("  draw: test frame");
    sleepUntilNextWake();
  }

  Model m{};
  m.aqi = -1;
  m.batteryPct = battery.readPercent();
  Serial.printf("  batt: %d%%\n", m.batteryPct);

  // Fetch BEFORE the panel is initialized. Seeed_GFX allocates an 800x480
  // framebuffer, and a TLS handshake needs tens of kilobytes of contiguous heap;
  // taking the framebuffer first is what starved the first run's fetches.
  bool gotWeather = false, gotAir = false;
  if (connectWiFi() && syncClock()) {
    gotWeather = fetchers::weather(m);
    gotAir     = fetchers::airQuality(m);
    fetchers::launches(m);
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  Serial.printf("  fetch: weather %s, air %s, launch %s, bins %s\n",
                gotWeather ? "ok" : "FAILED", gotAir ? "ok" : "FAILED",
                m.launchTonight ? "band" : "none",
                m.binsTonight ? "tonight" : "no");

  // The runway needs a real wall clock: anchoring it before NTP is what put the
  // baseline in 1970 and produced a 607,333-day estimate.
  m.runwayDays = battery.daysUntilRecharge(m.batteryPct);
  Serial.printf("  runway: %d days until recharge\n", m.runwayDays);

  if (!gotAir) m.aqi = -1;
  if (gotWeather) {
    battery.clearMissedRefreshes();
    m.stale = false;
  } else {
    m.missedRefreshes = battery.bumpMissedRefreshes();
    m.stale = true;
  }
  // Fixed dates, straight off the synced clock. Independent of every fetch, so
  // a birthday still shows on a morning when the network is down.
  {
    time_t t = time(nullptr);
    if (t > 1700000000) {
      struct tm lt; localtime_r(&t, &lt);
      const CalendarEvent *ev = calendarLookup(lt.tm_mon, lt.tm_mday);
      if (ev) {
        m.eventToday = true;
        m.eventKind  = ev->kind;
        snprintf(m.eventName, sizeof(m.eventName), "%s", ev->label);
      }
    }
  }
  Serial.printf("  event: %s\n", m.eventToday ? m.eventName : "none");

  fillAsOf(m);

  // Repaint only when the drawn content differs. A wake that fetches the same
  // numbers costs a few seconds of radio and leaves the panel untouched.
  Preferences prefs;
  prefs.begin("dash", false);
  uint32_t stored = prefs.getUInt("hash", 0);
  uint32_t want = m.contentHash();
  uint32_t known = rtcLastHash ? rtcLastHash : stored;

  if (!gotWeather && known != 0 && !prefs.getBool("wasStale", false)) {
    // First failure after good data: mark it once, so the stale bar appears, but
    // do not repaint again on every subsequent failure.
    prefs.putBool("wasStale", true);
  } else if (gotWeather) {
    prefs.putBool("wasStale", false);
  }

  if (want == known && !forceRepaint) {
    Serial.printf("  draw: skipped, content unchanged (hash %08x)\n", want);
  } else if (!gotWeather && known == 0) {
    Serial.println("  draw: skipped, no data has ever been fetched");
  } else {
    Serial.printf("  draw: repainting%s, hash %08x -> %08x\n",
                  forceRepaint ? " (button)" : "", known, want);
    uint32_t t0 = millis();
    epaper.begin();
    epaper.setRotation(0);
    Renderer renderer(epaper);
    renderer.draw(m);
    epaper.update();
    Serial.printf("  draw: full refresh took %lu ms\n", millis() - t0);
    rtcLastHash = want;
    prefs.putUInt("hash", want);
  }
  prefs.end();

  sleepUntilNextWake();
}

void loop() {}

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

#include "config.h"
#include "secrets.h"
#include "model.h"
#include "layout.h"
#include "battery.h"
#include "fetch.h"
#include "render.h"

EPaper epaper;
Battery battery;

// Survives deep sleep; the NVS copy survives a power cycle as well.
RTC_DATA_ATTR uint32_t rtcLastHash = 0;
RTC_DATA_ATTR uint32_t rtcWakeCount = 0;

static const char *wakeReason() {
  switch (esp_sleep_get_wakeup_cause()) {
    case ESP_SLEEP_WAKEUP_TIMER: return "timer";
    case ESP_SLEEP_WAKEUP_EXT0:  return "button";
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

static void fillAsOf(Model &m) {
  time_t t = time(nullptr);
  struct tm lt; localtime_r(&t, &lt);
  int nextHour = ((lt.tm_hour / WAKE_INTERVAL_HOURS) + 1) * WAKE_INTERVAL_HOURS % 24;
  snprintf(m.asOf, sizeof(m.asOf), "as of %02d:%02d - next %02d:00", lt.tm_hour, lt.tm_min, nextHour);
}

static void sleepUntilNextWake() {
  esp_sleep_enable_ext0_wakeup((gpio_num_t)PIN_BTN_WHITE_R, 0);
  time_t t = time(nullptr);
  uint64_t seconds = (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL;
  if (t > 1700000000) {
    struct tm lt; localtime_r(&t, &lt);
    int intoBlock = (lt.tm_hour % WAKE_INTERVAL_HOURS) * 3600 + lt.tm_min * 60 + lt.tm_sec;
    seconds = (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL - intoBlock;
    if (seconds < 300) seconds += (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL;
  }
  Serial.printf("sleeping %llu s\n\n", seconds);
  Serial.flush();
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(400);                       // let the USB serial settle before the first print
  rtcWakeCount++;
  Serial.printf("\n=== wake %lu (%s) ===\n", rtcWakeCount, wakeReason());
  Serial.printf("  heap %u free, psram %u free\n", ESP.getFreeHeap(), ESP.getFreePsram());

  battery.begin();
  Model m{};
  m.aqi = -1;
  m.batteryPct = battery.readPercent();
  m.runwayKnown = battery.estimateRunwayDays(m.batteryPct, m.runwayDays);
  Serial.printf("  batt: %d%%  runway %s\n", m.batteryPct,
                m.runwayKnown ? String(m.runwayDays).c_str() : "learning");

  // Fetch BEFORE the panel is initialised. Seeed_GFX allocates an 800x480
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
  Serial.printf("  fetch: weather %s, air %s, launch %s\n",
                gotWeather ? "ok" : "FAILED", gotAir ? "ok" : "FAILED",
                m.launchTonight ? "band" : "none");

  if (!gotAir) m.aqi = -1;
  if (gotWeather) {
    battery.clearMissedRefreshes();
    m.stale = false;
  } else {
    m.missedRefreshes = battery.bumpMissedRefreshes();
    m.stale = true;
  }
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

  if (want == known) {
    Serial.printf("  draw: skipped, content unchanged (hash %08x)\n", want);
  } else if (!gotWeather && known == 0) {
    Serial.println("  draw: skipped, no data has ever been fetched");
  } else {
    Serial.printf("  draw: repainting, hash %08x -> %08x\n", known, want);
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

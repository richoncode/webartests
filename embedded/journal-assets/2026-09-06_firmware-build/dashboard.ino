// Morning dashboard for the Seeed reTerminal E1002.
//
// Wakes on a timer or the right white button, fetches forecast, air quality and
// Vandenberg launches, draws one frame, and sleeps. The panel holds the frame
// with the radio off, so all the power goes into the fetch and the 15-20 s
// repaint rather than into keeping anything lit.
//
// Board:   XIAO_ESP32S3 (esp32 core)
// Library: Seeed_GFX, ArduinoJson

#include "driver.h"      // sets BOARD_SCREEN_COMBO where the library can see it
#include "TFT_eSPI.h"

#include <WiFi.h>
#include <time.h>
#include <esp_sleep.h>

#include "config.h"
#include "secrets.h"
#include "model.h"
#include "layout.h"
#include "battery.h"
#include "fetch.h"
#include "render.h"

EPaper epaper;
Battery battery;

static bool connectWiFi(uint32_t timeoutMs = 20000) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) delay(200);
  return WiFi.status() == WL_CONNECTED;
}

static bool syncClock(uint32_t timeoutMs = 12000) {
  configTzTime("PST8PDT,M3.2.0,M11.1.0", "pool.ntp.org", "time.nist.gov");
  uint32_t start = millis();
  while (time(nullptr) < 1700000000 && millis() - start < timeoutMs) delay(200);
  return time(nullptr) >= 1700000000;
}

static void fillAsOf(Model &m) {
  time_t t = time(nullptr);
  struct tm lt; localtime_r(&t, &lt);
  int nextHour = (lt.tm_hour / WAKE_INTERVAL_HOURS + 1) * WAKE_INTERVAL_HOURS % 24;
  snprintf(m.asOf, sizeof(m.asOf), "as of %02d:%02d - next %02d:00", lt.tm_hour, lt.tm_min, nextHour);
}

static void sleepUntilNextWake() {
  // Wake on the right white button as well as the timer, so a refresh is always
  // one press away and serial uploads stay possible.
  esp_sleep_enable_ext0_wakeup((gpio_num_t)PIN_BTN_WHITE_R, 0);

  time_t t = time(nullptr);
  uint64_t seconds = (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL;
  if (t > 1700000000) {                       // align to the next boundary hour
    struct tm lt; localtime_r(&t, &lt);
    int intoBlock = (lt.tm_hour % WAKE_INTERVAL_HOURS) * 3600 + lt.tm_min * 60 + lt.tm_sec;
    seconds = (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL - intoBlock;
    if (seconds < 300) seconds += (uint64_t)WAKE_INTERVAL_HOURS * 3600ULL;
  }
  Serial.printf("sleeping %llu s\n", seconds);
  Serial.flush();
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(50);

  epaper.begin();
  epaper.setRotation(0);
  battery.begin();

  Model m{};
  m.batteryPct = battery.readPercent();
  m.runwayKnown = battery.estimateRunwayDays(m.batteryPct, m.runwayDays);
  m.aqi = -1;

  bool online = connectWiFi() && syncClock();
  bool gotWeather = false, gotAir = false;

  if (online) {
    gotWeather = fetchers::weather(m);
    gotAir     = fetchers::airQuality(m);
    fetchers::launches(m);                     // absence is not a failure
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  if (gotWeather) {
    battery.clearMissedRefreshes();
    m.stale = false;
  } else {
    // Nothing fresh to draw. Say so rather than repainting yesterday's numbers
    // as though they were today's.
    m.missedRefreshes = battery.bumpMissedRefreshes();
    m.stale = true;
    if (m.weekday[0] == '\0') snprintf(m.weekday, sizeof(m.weekday), "NO DATA");
  }
  if (!gotAir) m.aqi = -1;

  fillAsOf(m);

  Renderer renderer(epaper);
  renderer.draw(m);
  epaper.update();                             // one full refresh, 15-20 s

  sleepUntilNextWake();
}

void loop() {}

#pragma once
// The three keyless endpoints, into the Model. Nothing here draws.

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>
#include "config.h"
#include "model.h"

namespace fetchers {

// Open-Meteo and thespacedevs both serve public, unauthenticated data and the
// device sends nothing, so a pinned certificate would buy little and would need
// replacing whenever the issuer rotates. Verification is skipped deliberately.
inline void secureClient(WiFiClientSecure &c) { c.setInsecure(); }

inline bool httpGetJson(const char *host, const char *path, JsonDocument &doc,
                        const JsonDocument *filter = nullptr) {
  WiFiClientSecure client;
  secureClient(client);
  HTTPClient http;
  String url = String("https://") + host + path;
  uint32_t heapBefore = ESP.getFreeHeap();
  if (!http.begin(client, url)) {
    Serial.printf("  %-24s begin() failed, heap %u\n", host, heapBefore);
    return false;
  }
  http.setTimeout(15000);
  // Force HTTP/1.0. Both Open-Meteo and thespacedevs answer 1.1 with chunked
  // transfer encoding, and HTTPClient::getStream() hands back the raw socket
  // with the chunk-size framing still in it -- ArduinoJson then reads "1a3b\r\n{"
  // and fails with InvalidInput. HTTP/1.0 has no chunked encoding, so the body
  // can still be parsed as a stream and the filter keeps memory low.
  http.useHTTP10(true);
  int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("  %-24s HTTP %d (%s), heap %u -> %u\n", host, code,
                  http.errorToString(code).c_str(), heapBefore, ESP.getFreeHeap());
    http.end();
    return false;
  }
  Serial.printf("  %-24s HTTP 200, %d bytes, heap %u -> %u\n",
                host, http.getSize(), heapBefore, ESP.getFreeHeap());
  Stream &body = http.getStream();
  DeserializationError err = filter
      ? deserializeJson(doc, body, DeserializationOption::Filter(*filter))
      : deserializeJson(doc, body);
  if (err) {
    // Show what actually arrived, so a future failure names itself instead of
    // needing another flash to find out.
    char peek[49] = {0};
    size_t n = body.readBytes(peek, sizeof(peek) - 1);
    Serial.printf("  %-24s parse failed: %s; next %u bytes: \"%s\"\n",
                  host, err.c_str(), (unsigned)n, peek);
  }
  http.end();
  return !err;
}

// newlib on the ESP32 has no timegm(), and mktime() would apply the local zone
// to a timestamp that is already UTC. Convert explicitly instead.
inline time_t utcFromTm(const struct tm &t) {
  int y = t.tm_year + 1900, m = t.tm_mon + 1, d = t.tm_mday;
  y -= m <= 2;
  const int era = (y >= 0 ? y : y - 399) / 400;
  const unsigned yoe = (unsigned)(y - era * 400);
  const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  const long long days = (long long)era * 146097 + (long long)doe - 719468;
  return (time_t)(days * 86400LL + t.tm_hour * 3600LL + t.tm_min * 60LL + t.tm_sec);
}

// "2026-09-07T18:14:00" -> minutes since local midnight
inline int minutesOfDay(const char *iso) {
  if (!iso || strlen(iso) < 16) return -1;
  return (iso[11] - '0') * 600 + (iso[12] - '0') * 60 + (iso[14] - '0') * 10 + (iso[15] - '0');
}

inline void formatClock(int minutes, char *out, size_t n, bool suffixLetter) {
  int h = minutes / 60, m = minutes % 60;
  const char *ap = h < 12 ? "a" : "p";
  int h12 = h % 12; if (h12 == 0) h12 = 12;
  if (suffixLetter) snprintf(out, n, "%d:%02d%s", h12, m, ap);
  else              snprintf(out, n, "%d:%02d", h12, m);
}

inline const char *weekdayShort(int wday) {
  static const char *W[] = {"SUN","MON","TUE","WED","THU","FRI","SAT"};
  return W[wday % 7];
}
inline const char *weekdayLong(int wday) {
  static const char *W[] = {"SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"};
  return W[wday % 7];
}
inline const char *monthLong(int mon) {
  static const char *M[] = {"January","February","March","April","May","June",
                            "July","August","September","October","November","December"};
  return M[mon % 12];
}

// Launch Library names read "Falcon 9 Block 5 | SDA Tranche 1 Transport Layer A".
// Truncating that at the field width cuts mid-word; the mission after the pipe is
// the part worth reading, so drop the marketing half of the vehicle name and keep
// as much of the mission as fits.
inline void shortenLaunchName(const char *full, char *out, size_t n) {
  const char *bar = strstr(full, " | ");
  char vehicle[24];
  const char *mission = bar ? bar + 3 : full;
  size_t vlen = bar ? (size_t)(bar - full) : 0;
  if (vlen >= sizeof(vehicle)) vlen = sizeof(vehicle) - 1;
  memcpy(vehicle, full, vlen);
  vehicle[vlen] = '\0';

  // "Falcon 9 Block 5" and "Falcon Heavy" both reduce to their first two words.
  int spaces = 0;
  for (char *p = vehicle; *p; p++) {
    if (*p == ' ' && ++spaces == 2) { *p = '\0'; break; }
  }

  if (bar) snprintf(out, n, "%s - %s", vehicle, mission);
  else     snprintf(out, n, "%s", full);
  for (char *p = out; *p; p++) *p = toupper((unsigned char)*p);

  // If it still will not fit, cut at a word boundary rather than mid-word.
  if (strlen(full) + 4 > n) {
    size_t last = 0;
    for (size_t i = 0; out[i]; i++) if (out[i] == ' ') last = i;
    if (last > n / 2) out[last] = '\0';
  }
}

inline const char *conditionText(int code) {
  if (code == 0) return "Clear all day";
  if (code <= 2) return "Partly cloudy";
  if (code == 3) return "Overcast";
  if (code <= 48) return "Valley fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Storms";
}

inline bool weather(Model &m) {
  JsonDocument doc;
  if (!httpGetJson(WX_HOST, WX_PATH, doc)) return false;

  m.nowTemp = (int)lroundf(doc["current"]["temperature_2m"] | 0.0f);
  m.nowCode = doc["current"]["weather_code"] | 0;
  snprintf(m.condition, sizeof(m.condition), "%s", conditionText(m.nowCode));

  JsonArrayConst hi   = doc["daily"]["temperature_2m_max"];
  JsonArrayConst lo   = doc["daily"]["temperature_2m_min"];
  JsonArrayConst pp   = doc["daily"]["precipitation_probability_max"];
  JsonArrayConst code = doc["daily"]["weather_code"];
  JsonArrayConst srA  = doc["daily"]["sunrise"];
  JsonArrayConst ssA  = doc["daily"]["sunset"];
  if (hi.isNull() || hi.size() < 1) return false;

  time_t nowT = time(nullptr);
  struct tm lt; localtime_r(&nowT, &lt);

  for (int i = 0; i < FORECAST_DAYS && i < (int)hi.size(); i++) {
    DayForecast &d = m.days[i];
    if (i == 0) snprintf(d.label, sizeof(d.label), "TODAY");
    else        snprintf(d.label, sizeof(d.label), "%s", weekdayShort((lt.tm_wday + i) % 7));
    d.high        = (int)lroundf(hi[i] | 0.0f);
    d.low         = (int)lroundf(lo[i] | 0.0f);
    d.precipPct   = pp[i] | 0;
    d.weatherCode = code[i] | 0;
  }

  m.peakTemp = m.days[0].high;

  // Peak hour comes from the hourly series: the warmest of today's 24 entries.
  JsonArrayConst ht = doc["hourly"]["temperature_2m"];
  JsonArrayConst hTime = doc["hourly"]["time"];
  if (!ht.isNull() && ht.size() >= 24) {
    int best = 0; float bestT = -1000.0f;
    for (int i = 0; i < 24 && i < (int)ht.size(); i++) {
      float t = ht[i] | -1000.0f;
      if (t > bestT) { bestT = t; best = i; }
    }
    const char *iso = hTime[best] | "";
    int mm = minutesOfDay(iso);
    if (mm >= 0) {
      char hhmm[10]; formatClock(mm, hhmm, sizeof(hhmm), false);
      snprintf(m.peakAt, sizeof(m.peakAt), "at %s %s", hhmm, (mm / 60) < 12 ? "AM" : "PM");
    }
  }

  JsonArrayConst cc = doc["hourly"]["cloud_cover"];
  m.haveCloud = false;
  if (!cc.isNull() && cc.size() >= 24) {
    for (int i = 0; i < 24; i++) m.cloudPct[i] = (uint8_t)(cc[i] | 100);
    m.haveCloud = true;
  }

  int srm = minutesOfDay(srA[0] | ""), ssm = minutesOfDay(ssA[0] | "");
  if (srm >= 0) formatClock(srm, m.sunrise, sizeof(m.sunrise), true);
  if (ssm >= 0) formatClock(ssm, m.sunset,  sizeof(m.sunset),  true);

  snprintf(m.weekday, sizeof(m.weekday), "%s", weekdayLong(lt.tm_wday));
  snprintf(m.dateLine, sizeof(m.dateLine), "%d %s %d", lt.tm_mday, monthLong(lt.tm_mon), 1900 + lt.tm_year);
  m.binsTonight = (lt.tm_wday == BIN_WEEKDAY);
  return true;
}

inline bool airQuality(Model &m) {
  JsonDocument doc;
  if (!httpGetJson(AQ_HOST, AQ_PATH, doc)) return false;
  m.aqi  = doc["current"]["us_aqi"] | -1;
  m.pm25 = doc["current"]["pm2_5"] | 0.0f;
  return m.aqi >= 0;
}

// A Vandenberg launch only earns the band when the sky here is clear enough to
// see it. Cloud cover at the lift-off hour answers that; a daily weather code
// cannot, and neither can the code for the current hour twelve hours earlier.
inline bool skyIsClearAt(const Model &m, int hourOfDay) {
  if (!m.haveCloud) return m.nowCode <= 2;          // fall back to the code
  if (hourOfDay < 0 || hourOfDay > 23) return false;
  return m.cloudPct[hourOfDay] <= WX_CLEAR_MAX_CLOUD_PCT;
}

inline bool launches(Model &m) {
  m.launchTonight = false;

  // Step one: the cheap list. Only net, name and id are needed to decide.
  JsonDocument filter;
  filter["results"][0]["net"] = true;
  filter["results"][0]["name"] = true;
  filter["results"][0]["id"] = true;

  JsonDocument doc;
  if (!httpGetJson(LL2_HOST, LL2_PATH, doc, &filter)) return false;
  JsonArrayConst results = doc["results"];
  if (results.isNull()) return true;

  time_t nowT = time(nullptr);
  struct tm lt; localtime_r(&nowT, &lt);
  int sunsetMin = -1;
  { int hh, mm; if (sscanf(m.sunset, "%d:%d", &hh, &mm) == 2) {
      if (strchr(m.sunset, 'p') && hh != 12) hh += 12;
      sunsetMin = hh * 60 + mm; } }
  if (sunsetMin < 0) return true;

  for (JsonObjectConst r : results) {
    const char *net = r["net"] | "";           // UTC ISO-8601
    if (strlen(net) < 16) continue;
    struct tm g{};
    if (!strptime(net, "%Y-%m-%dT%H:%M:%S", &g)) continue;
    time_t utc = utcFromTm(g);
    struct tm local; localtime_r(&utc, &local);
    if (local.tm_yday != lt.tm_yday) continue; // today only

    int liftoff = local.tm_hour * 60 + local.tm_min;
    bool afterDusk = liftoff >= (sunsetMin - LAUNCH_DUSK_MARGIN_MIN);
    if (!afterDusk) continue;
    if (!skyIsClearAt(m, local.tm_hour)) continue;   // cloudy at lift-off

    m.launchTonight = true;
    m.launchPrime   = (liftoff - sunsetMin) <= LAUNCH_PRIME_WINDOW_MIN;
    shortenLaunchName(r["name"] | "LAUNCH", m.launchName, sizeof(m.launchName));

    // Step two: this one launch in detail, for where the booster comes down.
    // A failure here costs the landing note, not the band.
    const char *where = "", *how = "";
    JsonDocument det;
    JsonDocument detFilter;
    detFilter["rocket"]["launcher_stage"][0]["landing"]["location"]["abbrev"] = true;
    detFilter["rocket"]["launcher_stage"][0]["landing"]["type"]["abbrev"] = true;
    char detPath[96];
    snprintf(detPath, sizeof(detPath), LL2_DETAIL_FMT, (const char *)(r["id"] | ""));
    if (httpGetJson(LL2_HOST, detPath, det, &detFilter)) {
      JsonObjectConst landing = det["rocket"]["launcher_stage"][0]["landing"];
      where = landing["location"]["abbrev"] | "";
      how   = landing["type"]["abbrev"] | "";
    }
    if (strstr(where, LANDING_PAD_HINT))
      snprintf(m.launchSub, sizeof(m.launchSub), "%s - 200 mi - booster back to %s - booms",
               LAUNCH_LOOK_LABEL, where);
    else if (strcmp(how, "ASDS") == 0)
      snprintf(m.launchSub, sizeof(m.launchSub), "%s - 200 mi - booster to droneship %s",
               LAUNCH_LOOK_LABEL, where);
    else
      snprintf(m.launchSub, sizeof(m.launchSub), "%s - 200 mi - booster downrange", LAUNCH_LOOK_LABEL);

    char hhmm[10]; formatClock(liftoff, hhmm, sizeof(hhmm), false);
    snprintf(m.launchTime, sizeof(m.launchTime), "%s", hhmm);
    int after = liftoff - sunsetMin;
    if (after <= LAUNCH_PRIME_WINDOW_MIN)
      snprintf(m.launchTz, sizeof(m.launchTz), "%s - %d min after sunset", liftoff / 60 < 12 ? "AM" : "PM", after);
    else
      snprintf(m.launchTz, sizeof(m.launchTz), "%s - well after dark", liftoff / 60 < 12 ? "AM" : "PM");
    break;                                     // soonest qualifying launch wins
  }
  return true;
}

}  // namespace fetchers

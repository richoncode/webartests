#pragma once
// Draws the Model into the layout rectangles. No network, no state.
//
// Text is placed with datums against the box it belongs to, so a box moving in
// layout.h moves its contents with it.

#include "layout.h"
#include "model.h"

// Seeed_GFX is a TFT_eSPI fork. The wiki shows TFT_* names in its own example
// and GxEPD_* names in its colour list; whichever the installed library exposes,
// the six panel colours are named once, here.
#ifndef C_BLACK
  #define C_BLACK   TFT_BLACK
  #define C_WHITE   TFT_WHITE
  #define C_RED     TFT_RED
  #define C_GREEN   TFT_GREEN
  #define C_BLUE    TFT_BLUE
  #define C_YELLOW  TFT_YELLOW
#endif

#define C_PAPER  C_WHITE
#define C_INK    C_BLACK

class Renderer {
public:
  explicit Renderer(EPaper &d) : g(d) {}

  void draw(const Model &m) {
    Layout L = computeLayout(m.binsTonight, m.launchTonight);
    g.fillScreen(C_PAPER);

    drawHeader(L, m);
    g.fillRect(L.keyline.x, L.keyline.y, L.keyline.w, L.keyline.h, C_RED);

    drawPeak(L, m);
    rule(L.cell1Rule); rule(L.cell2Rule);
    drawSun(L, m);
    drawAir(L, m);
    rule(L.detailRule);

    drawForecast(L, m);

    if (m.binsTonight)   { rule(L.binRule); drawBins(L, m); }
    if (m.launchTonight) { rule(L.lchRule); drawLaunch(L, m); }

    rule(L.footRule);
    drawFooter(L, m);

    if (m.stale) drawStaleBar(L, m);
  }

private:
  EPaper &g;

  void rule(const Rect &r) { g.fillRect(r.x, r.y, r.w, r.h, C_INK); }

  void text(const char *s, int16_t x, int16_t y, uint8_t font, uint16_t fg, uint8_t datum = TL_DATUM) {
    g.setTextDatum(datum);
    g.setTextColor(fg);
    g.setTextFont(font);
    g.drawString(s, x, y);
  }

  void drawHeader(const Layout &L, const Model &m) {
    const Rect &r = L.header;
    g.fillRect(r.x, r.y, r.w, r.h, C_BLUE);
    text(m.weekday,  r.x + 22, r.y + 16, 6, C_PAPER);
    text(m.dateLine, r.x + 22, r.y + 56, 2, C_PAPER);

    char now[12]; snprintf(now, sizeof(now), "%d`", m.nowTemp);   // ` renders as degree in font 6
    text(now, r.x + 430, r.y + 20, 6, C_PAPER);
    text(m.condition, r.x + 430, r.y + 58, 2, C_PAPER);

    text("SAN MARTIN, CA", r.x + r.w - 22, r.y + 22, 2, C_PAPER, TR_DATUM);
    text(m.asOf,           r.x + r.w - 22, r.y + 48, 1, C_PAPER, TR_DATUM);
  }

  void drawPeak(const Layout &L, const Model &m) {
    const Rect &r = L.peak;
    g.fillRect(r.x, r.y, r.w, r.h, C_YELLOW);
    text("PEAK TODAY", r.x + 16, r.y + 10, 1, C_INK);
    char v[10]; snprintf(v, sizeof(v), "%d`", m.peakTemp);
    text(v, r.x + 16, r.y + 26, 6, m.peakTemp >= PEAK_HOT_F ? C_RED : C_INK);
    text(m.peakAt, r.x + 16, r.y + r.h - 20, 2, C_INK);
  }

  void drawSun(const Layout &L, const Model &m) {
    const Rect &r = L.sun;
    g.fillRect(r.x, r.y, r.w, r.h, C_GREEN);
    text("SUN", r.x + 16, r.y + 10, 1, C_PAPER);
    char v[24]; snprintf(v, sizeof(v), "%s > %s", m.sunrise, m.sunset);
    text(v, r.x + 16, r.y + 34, 4, C_PAPER);
  }

  void drawAir(const Layout &L, const Model &m) {
    const Rect &r = L.air;
    uint16_t col = m.aqi <= AQI_GOOD_MAX ? C_GREEN : (m.aqi <= AQI_MODERATE_MAX ? C_YELLOW : C_RED);
    const char *band = m.aqi <= AQI_GOOD_MAX ? "GOOD" : (m.aqi <= AQI_MODERATE_MAX ? "MODERATE" : "SMOKE");
    text("AIR", r.x + 16, r.y + 10, 1, C_INK);
    char v[8]; snprintf(v, sizeof(v), "%d", m.aqi);
    text(v, r.x + 16, r.y + 26, 6, col);
    text(band, r.x + 76, r.y + 38, 2, col);
    char pm[20]; snprintf(pm, sizeof(pm), "PM2.5 %.1f", m.pm25);
    text(pm, r.x + r.w - 16, r.y + 38, 1, C_INK, TR_DATUM);

    // three-segment band bar
    int16_t bw = (r.w - 32 - 4) / 3, by = r.y + r.h - 16;
    int lit = m.aqi <= AQI_GOOD_MAX ? 0 : (m.aqi <= AQI_MODERATE_MAX ? 1 : 2);
    uint16_t cols[3] = { C_GREEN, C_YELLOW, C_RED };
    for (int i = 0; i < 3; i++) {
      int16_t bx = r.x + 16 + i * (bw + 2);
      if (i <= lit) g.fillRect(bx, by, bw, 6, cols[i]);
      else          g.drawRect(bx, by, bw, 6, C_INK);
    }
  }

  void drawForecast(const Layout &L, const Model &m) {
    for (int i = 0; i < FC_N; i++) {
      Rect c = L.fcCol(i);
      int16_t cx = c.x + c.w / 2;
      if (i == 0) g.fillRect(c.x, c.y, c.w, c.h, C_YELLOW);

      const DayForecast &d = m.days[i];
      int16_t y = c.y + (c.h - 96) / 2;          // content block is ~96 tall
      text(d.label, cx, y, 1, C_INK, TC_DATUM);
      drawWeatherIcon(d.weatherCode, cx, y + 20, 36);

      char hi[8]; snprintf(hi, sizeof(hi), "%d`", d.high);
      char lo[8]; snprintf(lo, sizeof(lo), "%d`", d.low);
      g.setTextFont(4);
      int16_t wHi = g.textWidth(hi);
      g.setTextFont(2);
      int16_t wLo = g.textWidth(lo);
      int16_t total = wHi + 8 + wLo, sx = cx - total / 2;
      text(hi, sx, y + 60, 4, d.high >= PEAK_HOT_F ? C_RED : C_INK);
      text(lo, sx + wHi + 8, y + 66, 2, C_BLUE);

      char pp[8]; snprintf(pp, sizeof(pp), "%d%%", d.precipPct);
      bool wet = d.precipPct >= 20;
      text(pp, cx + 8, y + 84, 2, wet ? C_BLUE : C_INK, TL_DATUM);
      drawDrop(cx - 12, y + 86, wet ? C_BLUE : C_INK);

      if (i < FC_N - 1) rule(L.fcRule(i));
    }
  }

  void drawBins(const Layout &L, const Model &m) {
    const Rect &r = L.bins;
    g.fillRect(r.x, r.y, r.w, r.h, C_RED);
    text("BINS OUT TONIGHT", r.x + 22, r.y + 11, 4, C_PAPER);
    text("kerb by 6 AM - pickup Tuesday", r.x + r.w - 22, r.y + 14, 2, C_PAPER, TR_DATUM);
  }

  void drawLaunch(const Layout &L, const Model &m) {
    const Rect &r = L.launch;
    g.fillRect(r.x, r.y, r.w, r.h, C_BLUE);
    text(m.launchName, r.x + 22, r.y + 8, 4, C_PAPER);
    text(m.launchSub,  r.x + 22, r.y + 34, 2, C_PAPER);
    text(m.launchTime, r.x + r.w - 22, r.y + 8,  6, C_PAPER, TR_DATUM);
    text(m.launchTz,   r.x + r.w - 22, r.y + 38, 1, C_PAPER, TR_DATUM);
    if (m.launchPrime) {
      g.setTextFont(4);
      int16_t nw = g.textWidth(m.launchName);
      g.fillRoundRect(r.x + 30 + nw, r.y + 10, 54, 16, 8, C_YELLOW);
      text("PRIME", r.x + 34 + nw, r.y + 13, 1, C_INK);
    }
  }

  void drawFooter(const Layout &L, const Model &m) {
    const Rect &r = L.footer;
    uint16_t col = m.batteryPct <= BATT_CRITICAL_PCT ? C_RED
                 : (m.batteryPct <= BATT_WARN_PCT ? C_YELLOW : C_GREEN);
    int16_t bx = r.x + 22, by = r.y + (r.h - 32) / 2;
    g.drawRect(bx, by, 92, 32, C_INK);
    g.drawRect(bx + 1, by + 1, 90, 30, C_INK);
    g.fillRect(bx + 92, by + 9, 6, 14, C_INK);
    for (int i = 0; i < 5; i++) {
      if (m.batteryPct > i * 20) g.fillRect(bx + 5 + i * 17, by + 5, 15, 22, col);
    }

    char pct[8]; snprintf(pct, sizeof(pct), "%d%%", m.batteryPct);
    text(pct, bx + 112, by + 2, 6, m.batteryPct <= BATT_CRITICAL_PCT ? C_RED : C_INK);

    text("RUNWAY", bx + 210, r.y + 18, 1, C_INK);
    if (m.batteryPct <= BATT_CRITICAL_PCT) {
      g.fillRoundRect(bx + 208, r.y + 34, 148, 24, 12, C_RED);
      text("PLUG IN NOW", bx + 218, r.y + 39, 2, C_PAPER);
    } else if (!m.runwayKnown) {
      text("learning drain rate", bx + 210, r.y + 36, 4, C_INK);
    } else {
      char rn[24]; snprintf(rn, sizeof(rn), "~ %d days left", m.runwayDays);
      text(rn, bx + 210, r.y + 36, 4, m.runwayDays <= 10 ? C_RED : C_INK);
    }

    text("open-meteo - air quality", r.x + r.w - 22, r.y + 22, 1, C_INK, TR_DATUM);
    text("thespacedevs - 6 h wake",  r.x + r.w - 22, r.y + 40, 1, C_INK, TR_DATUM);
  }

  // E-paper holds its last frame, so a failed fetch would otherwise leave a
  // stale dashboard looking current.
  void drawStaleBar(const Layout &L, const Model &m) {
    g.fillRect(0, L.footer.y - 22, PANEL_W, 22, C_RED);
    char s[56]; snprintf(s, sizeof(s), "DATA IS STALE - %d MISSED REFRESHES", m.missedRefreshes);
    text(s, PANEL_W / 2, L.footer.y - 19, 2, C_PAPER, TC_DATUM);
  }

  void drawDrop(int16_t x, int16_t y, uint16_t col) {
    g.fillTriangle(x + 5, y, x, y + 8, x + 10, y + 8, col);
    g.fillCircle(x + 5, y + 9, 5, col);
  }

  void drawWeatherIcon(int code, int16_t cx, int16_t top, int16_t size) {
    int16_t cy = top + size / 2, rr = size / 3;
    if (code == 0) {                                   // clear
      g.fillCircle(cx, cy, rr, C_YELLOW);
      g.drawCircle(cx, cy, rr, C_INK);
      for (int i = 0; i < 8; i++) {
        float a = i * PI / 4;
        g.drawLine(cx + cos(a) * (rr + 3), cy + sin(a) * (rr + 3),
                   cx + cos(a) * (rr + 8), cy + sin(a) * (rr + 8), C_INK);
      }
    } else if (code <= 2) {                            // partly cloudy
      g.fillCircle(cx - 7, cy - 6, rr - 2, C_YELLOW);
      g.drawCircle(cx - 7, cy - 6, rr - 2, C_INK);
      cloud(cx + 3, cy + 5, size, C_PAPER);
    } else if (code <= 48) {                           // overcast / fog
      cloud(cx, cy, size, C_PAPER);
    } else {                                           // wet
      cloud(cx, cy - 5, size, C_PAPER);
      for (int i = -1; i <= 1; i++)
        g.drawLine(cx + i * 8, cy + 8, cx + i * 8 - 3, cy + 17, C_BLUE);
    }
  }
  void cloud(int16_t cx, int16_t cy, int16_t size, uint16_t fill) {
    int16_t r = size / 4;
    g.fillCircle(cx - r, cy, r, fill);       g.drawCircle(cx - r, cy, r, C_INK);
    g.fillCircle(cx + r, cy, r, fill);       g.drawCircle(cx + r, cy, r, C_INK);
    g.fillCircle(cx, cy - r / 2, r + 2, fill); g.drawCircle(cx, cy - r / 2, r + 2, C_INK);
    g.fillRect(cx - r, cy - 2, 2 * r, r, fill);
  }
};

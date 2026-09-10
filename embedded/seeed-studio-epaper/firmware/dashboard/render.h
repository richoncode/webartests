#pragma once
// Draws the Model into the layout rectangles. No network, no state.

#include "layout.h"
#include "model.h"
#include "calendar.h"

// Built-in fonts 6, 7 and 8 hold only "1234567890:-.apm" — a weekday drawn in
// font 6 comes out blank, which is exactly what the first panel showed. Font 4
// tops out at 26 px. Everything therefore uses the Adafruit free fonts that
// LOAD_GFXFF enables, which are also bold, so the small labels read at distance.
// The font symbols are already compiled in by TFT_eSPI when LOAD_GFXFF is set;
// including the headers again duplicates every glyph table.

#define F_TINY  (&FreeSansBold9pt7b)    // labels and captions
#define F_BODY  (&FreeSansBold12pt7b)
#define F_MID   (&FreeSansBold18pt7b)
#define F_BIG   (&FreeSansBold24pt7b)

// Seeed_GFX exposes the six panel colors under TFT_* when combo 521 sets
// USE_COLORFULL_EPAPER. GxEPD_* names do not exist in this library.
#define C_BLACK   TFT_BLACK
#define C_WHITE   TFT_WHITE
#define C_RED     TFT_RED
#define C_GREEN   TFT_GREEN
#define C_BLUE    TFT_BLUE
#define C_YELLOW  TFT_YELLOW
#define C_PAPER   C_WHITE
#define C_INK     C_BLACK

class Renderer {
public:
  explicit Renderer(EPaper &d) : g(d) {}

  void draw(const Model &m) {
    Layout L = computeLayout(m.eventToday, m.binsTonight, m.launchTonight);
    g.fillScreen(C_PAPER);

    drawHeader(L, m);
    g.fillRect(L.keyline.x, L.keyline.y, L.keyline.w, L.keyline.h, C_RED);

    drawPeak(L, m);
    rule(L.cell1Rule); rule(L.cell2Rule);
    drawSun(L, m);
    drawAir(L, m);
    rule(L.detailRule);
    drawForecast(L, m);

    if (m.eventToday || m.binsTonight) rule(L.bandRule);
    if (m.eventToday) drawEvent(L, m);
    if (m.binsTonight) drawBins(L, m);
    if (L.sharedRow) rule(L.evtBinRule);
    if (m.launchTonight) { rule(L.lchRule); drawLaunch(L, m); }

    rule(L.footRule);
    drawFooter(L, m);
    if (m.stale) drawStaleBar(L, m);
  }

private:
  EPaper &g;

  void rule(const Rect &r) { g.fillRect(r.x, r.y, r.w, r.h, C_INK); }

  void text(const char *s, int16_t x, int16_t y, const GFXfont *f, uint16_t fg, uint8_t datum = TL_DATUM) {
    g.setFreeFont(f);
    g.setTextDatum(datum);
    g.setTextColor(fg);
    g.drawString(s, x, y);
  }
  int16_t widthOf(const char *s, const GFXfont *f) { g.setFreeFont(f); return g.textWidth(s); }

  // The Adafruit free fonts cover ASCII only, so there is no degree glyph. The
  // backtick stood in for one and looked exactly like a backtick. Draw a ring.
  static int16_t degRadius(const GFXfont *f) {
    if (f == F_BIG)  return 5;
    if (f == F_MID)  return 4;
    if (f == F_BODY) return 3;
    return 2;
  }
  int16_t tempWidth(int v, const GFXfont *f) {
    char n[8]; snprintf(n, sizeof(n), "%d", v);
    return widthOf(n, f) + 2 * degRadius(f) + 5;
  }
  // Draws "83" followed by a ring. Returns the total width drawn.
  int16_t drawTemp(int v, int16_t x, int16_t y, const GFXfont *f, uint16_t col) {
    char n[8]; snprintf(n, sizeof(n), "%d", v);
    text(n, x, y, f, col);
    int16_t w = widthOf(n, f), r = degRadius(f);
    int16_t cx = x + w + r + 3, cy = y + r + 3;
    g.drawCircle(cx, cy, r, col);
    if (r >= 3) g.drawCircle(cx, cy, r - 1, col);   // heavier ring at larger sizes
    return w + 2 * r + 5;
  }

  void drawHeader(const Layout &L, const Model &m) {
    const Rect &r = L.header;
    g.fillRect(r.x, r.y, r.w, r.h, C_BLUE);
    // The current temperature and its condition text both repeated what the
    // TODAY column and its icon already show, so neither is drawn here.
    text(m.weekday,  r.x + 22, r.y + 8,  F_BIG,  C_PAPER);
    text(m.dateLine, r.x + 22, r.y + 56, F_TINY, C_PAPER);

    text("SAN MARTIN, CA", r.x + r.w - 22, r.y + 16, F_TINY, C_PAPER, TR_DATUM);
    text(m.asOf,           r.x + r.w - 22, r.y + 46, F_TINY, C_PAPER, TR_DATUM);
  }

  void drawPeak(const Layout &L, const Model &m) {
    const Rect &r = L.peak;
    g.fillRect(r.x, r.y, r.w, r.h, C_YELLOW);
    text("PEAK TODAY", r.x + 16, r.y + 6, F_TINY, C_INK);
    drawTemp(m.peakTemp, r.x + 16, r.y + 26, F_BIG, m.peakTemp >= PEAK_HOT_F ? C_RED : C_INK);
    text(m.peakAt, r.x + r.w - 16, r.y + 52, F_TINY, C_INK, TR_DATUM);
  }

  void drawSun(const Layout &L, const Model &m) {
    const Rect &r = L.sun;
    g.fillRect(r.x, r.y, r.w, r.h, C_GREEN);
    text("DAYLIGHT", r.x + 16, r.y + 6, F_TINY, C_PAPER);
    char v[26];
    if (m.sunrise[0] && m.sunset[0]) snprintf(v, sizeof(v), "%s - %s", m.sunrise, m.sunset);
    else                             snprintf(v, sizeof(v), "--");
    // 18 pt ran past the cell edge into the air-quality panel. Step down if the
    // string will not clear the padding on both sides.
    const GFXfont *sf = (widthOf(v, F_MID) > r.w - 32) ? F_BODY : F_MID;
    text(v, r.x + 16, r.y + (sf == F_MID ? 32 : 36), sf, C_PAPER);
  }

  void drawAir(const Layout &L, const Model &m) {
    const Rect &r = L.air;
    text("AIR", r.x + 16, r.y + 6, F_TINY, C_INK);
    if (m.aqi < 0) {                       // no reading; say so rather than "-1 GOOD"
      text("--", r.x + 16, r.y + 30, F_MID, C_INK);
      text("no reading", r.x + 76, r.y + 40, F_TINY, C_INK);
      return;
    }
    uint16_t col = m.aqi <= AQI_GOOD_MAX ? C_GREEN : (m.aqi <= AQI_MODERATE_MAX ? C_YELLOW : C_RED);
    const char *band = m.aqi <= AQI_GOOD_MAX ? "GOOD" : (m.aqi <= AQI_MODERATE_MAX ? "MODERATE" : "SMOKE");

    // Yellow type on paper white all but disappears on this panel. The number
    // is always ink, and the band name sits on an outlined chip so GOOD,
    // MODERATE and SMOKE all read at the same strength.
    char v[8]; snprintf(v, sizeof(v), "%d", m.aqi);
    text(v, r.x + 16, r.y + 26, F_MID, C_INK);
    int16_t vw = widthOf(v, F_MID);

    int16_t chipX = r.x + 26 + vw, chipY = r.y + 30;
    int16_t chipW = widthOf(band, F_TINY) + 16, chipH = 22;
    g.fillRect(chipX, chipY, chipW, chipH, col);
    g.drawRect(chipX, chipY, chipW, chipH, C_INK);
    text(band, chipX + 8, chipY + 4, F_TINY, col == C_YELLOW ? C_INK : C_PAPER);

    char pm[20]; snprintf(pm, sizeof(pm), "PM2.5 %.1f", m.pm25);
    text(pm, r.x + r.w - 16, r.y + 34, F_TINY, C_INK, TR_DATUM);

    // Every segment gets an outline, lit or not, so the yellow one has an edge.
    int16_t bw = (r.w - 32 - 4) / 3, by = r.y + r.h - 17;
    int lit = m.aqi <= AQI_GOOD_MAX ? 0 : (m.aqi <= AQI_MODERATE_MAX ? 1 : 2);
    uint16_t cols[3] = { C_GREEN, C_YELLOW, C_RED };
    for (int i = 0; i < 3; i++) {
      int16_t bx = r.x + 16 + i * (bw + 2);
      if (i <= lit) g.fillRect(bx, by, bw, 8, cols[i]);
      g.drawRect(bx, by, bw, 8, C_INK);
    }
  }

  void drawForecast(const Layout &L, const Model &m) {
    for (int i = 0; i < FC_N; i++) {
      Rect c = L.fcCol(i);
      int16_t cx = c.x + c.w / 2;
      if (i == 0) g.fillRect(c.x, c.y, c.w, c.h, C_YELLOW);
      const DayForecast &d = m.days[i];

      int16_t block = 13 + 6 + 36 + 6 + 25 + 6 + 14;      // label,icon,temps,precip
      int16_t y = c.y + (c.h - block) / 2;

      text(d.label, cx, y, F_TINY, C_INK, TC_DATUM);
      drawWeatherIcon(d.weatherCode, cx, y + 19, 36);

      int16_t wHi = tempWidth(d.high, F_MID), wLo = tempWidth(d.low, F_BODY);
      int16_t sx = cx - (wHi + 7 + wLo) / 2;
      drawTemp(d.high, sx, y + 61, F_MID, d.high >= PEAK_HOT_F ? C_RED : C_INK);
      drawTemp(d.low,  sx + wHi + 7, y + 68, F_BODY, C_BLUE);

      char pp[8]; snprintf(pp, sizeof(pp), "%d%%", d.precipPct);
      bool wet = d.precipPct >= 20;
      int16_t wp = widthOf(pp, F_TINY);
      drawDrop(cx - (wp + 14) / 2, y + 94, wet ? C_BLUE : C_INK);
      text(pp, cx - (wp + 14) / 2 + 15, y + 92, F_TINY, wet ? C_BLUE : C_INK);

      if (i < FC_N - 1) rule(L.fcRule(i));
    }
  }

  void drawBins(const Layout &L, const Model &m) {
    const Rect &r = L.bins;
    g.fillRect(r.x, r.y, r.w, r.h, C_RED);
    drawBinIcon(r.x + 22, r.y + (r.h - 26) / 2);
    if (L.sharedRow) {
      // Half width: the headline only, at the smaller size.
      text("BINS OUT TONIGHT", r.x + 56, r.y + 13, F_BODY, C_PAPER);
    } else {
      text("BINS OUT TONIGHT", r.x + 56, r.y + 7, F_MID, C_PAPER);
      text("curb by 6 AM - pickup Tuesday", r.x + r.w - 22, r.y + 12, F_TINY, C_PAPER, TR_DATUM);
    }
  }

  // Fixed dates from calendar.h. Green, so it is not mistaken for bin night or
  // a launch at a glance.
  void drawEvent(const Layout &L, const Model &m) {
    const Rect &r = L.event;
    g.fillRect(r.x, r.y, r.w, r.h, C_GREEN);
    if (m.eventKind == EVT_WILDLIFE) drawEagle(r.x + 22, r.y + r.h / 2);
    else                             drawCake(r.x + 22, r.y + r.h / 2);
    const GFXfont *f = F_MID;
    if (widthOf(m.eventName, f) > r.w - 90) f = F_BODY;
    if (widthOf(m.eventName, f) > r.w - 90) f = F_TINY;
    text(m.eventName, r.x + 64, r.y + (f == F_MID ? 9 : 13), f, C_PAPER);
  }

  // Layer cake with three lit candles. x is the left edge, cy the band's middle.
  void drawCake(int16_t x, int16_t cy) {
    const int16_t w = 30, h = 16, top = cy + 2;
    g.fillRect(x, top, w, h, C_PAPER);
    g.drawRect(x, top, w, h, C_INK);
    g.fillRect(x, top, w, 5, C_YELLOW);
    g.drawRect(x, top, w, 5, C_INK);
    for (int i = 0; i < 3; i++) {
      int16_t candleX = x + 5 + i * 10;
      g.fillRect(candleX, top - 9, 2, 9, C_PAPER);
      g.fillCircle(candleX + 1, top - 12, 3, C_YELLOW);
      g.drawCircle(candleX + 1, top - 12, 3, C_INK);
    }
  }

  // Soaring bird: swept wings, a body, a yellow beak. At 34 px a silhouette
  // reads as a bird where feather detail would turn to mud.
  void drawEagle(int16_t x, int16_t cy) {
    const int16_t cx = x + 17;
    g.fillTriangle(cx, cy - 1, cx - 17, cy - 10, cx - 4, cy + 5, C_PAPER);
    g.fillTriangle(cx, cy - 1, cx + 17, cy - 10, cx + 4, cy + 5, C_PAPER);
    g.drawTriangle(cx, cy - 1, cx - 17, cy - 10, cx - 4, cy + 5, C_INK);
    g.drawTriangle(cx, cy - 1, cx + 17, cy - 10, cx + 4, cy + 5, C_INK);
    g.fillRect(cx - 2, cy - 3, 5, 13, C_PAPER);
    g.drawRect(cx - 2, cy - 3, 5, 13, C_INK);
    g.fillCircle(cx, cy - 7, 5, C_PAPER);
    g.drawCircle(cx, cy - 7, 5, C_INK);
    g.fillTriangle(cx + 4, cy - 8, cx + 11, cy - 6, cx + 4, cy - 4, C_YELLOW);
    g.drawTriangle(cx + 4, cy - 8, cx + 11, cy - 6, cx + 4, cy - 4, C_INK);
  }

  void drawBinIcon(int16_t x, int16_t y) {
    g.fillRect(x + 3, y + 7, 20, 19, C_PAPER);
    g.fillRect(x, y + 3, 26, 4, C_PAPER);
    g.fillRect(x + 9, y, 8, 3, C_PAPER);
  }

  void drawLaunch(const Layout &L, const Model &m) {
    const Rect &r = L.launch;
    g.fillRect(r.x, r.y, r.w, r.h, C_BLUE);
    // Three columns with reserved widths. Placing PRIME straight after the
    // measured name put its pill on top of the last characters of the mission,
    // so it now has a slot of its own and the name gets what remains.
    const int16_t PAD = 22, TIME_W = 168, PRIME_W = 66;
    const int16_t nameX  = r.x + PAD;
    const int16_t primeX = r.x + r.w - PAD - TIME_W - PRIME_W;
    const int16_t nameAvail =
        (m.launchPrime ? primeX : (int16_t)(r.x + r.w - PAD - TIME_W)) - nameX - 12;

    const GFXfont *nf = F_MID;
    if (widthOf(m.launchName, nf) > nameAvail) nf = F_BODY;
    if (widthOf(m.launchName, nf) > nameAvail) nf = F_TINY;
    text(m.launchName, nameX, r.y + (nf == F_MID ? 6 : 10), nf, C_PAPER);
    text(m.launchSub,  nameX, r.y + 34, F_TINY, C_PAPER);

    text(m.launchTime, r.x + r.w - PAD, r.y + 6,  F_MID,  C_PAPER, TR_DATUM);
    text(m.launchTz,   r.x + r.w - PAD, r.y + 36, F_TINY, C_PAPER, TR_DATUM);

    if (m.launchPrime) {
      int16_t tw = widthOf("PRIME", F_TINY);
      int16_t pw = tw + 18, py = r.y + (r.h - 22) / 2;
      g.fillRoundRect(primeX, py, pw, 22, 11, C_YELLOW);
      g.drawRoundRect(primeX, py, pw, 22, 11, C_INK);
      text("PRIME", primeX + (pw - tw) / 2, py + 4, F_TINY, C_INK);
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
    for (int i = 0; i < 5; i++)
      if (m.batteryPct > i * 20) g.fillRect(bx + 5 + i * 17, by + 5, 15, 22, col);

    char pct[8]; snprintf(pct, sizeof(pct), "%d%%", m.batteryPct);
    text(pct, bx + 112, by - 2, F_BIG, m.batteryPct <= BATT_CRITICAL_PCT ? C_RED : C_INK);

    // On one 18 pt line this ran into the source credits on the right. Two
    // smaller lines keep it inside its own column.
    int16_t rx = bx + 240;
    if (m.batteryPct <= BATT_CRITICAL_PCT) {
      // Sized from the text with even padding, rather than a fixed 178 px the
      // words very nearly filled.
      int16_t tw = widthOf("PLUG IN NOW", F_BODY);
      int16_t pw = tw + 44, ph = 34, py = r.y + (r.h - ph) / 2;
      g.fillRoundRect(rx - 2, py, pw, ph, ph / 2, C_RED);
      text("PLUG IN NOW", rx - 2 + (pw - tw) / 2, py + 7, F_BODY, C_PAPER);
    } else {
      uint16_t rc = m.runwayDays <= 10 ? C_RED : C_INK;
      char n[16]; snprintf(n, sizeof(n), "%d days", m.runwayDays);
      text(n,                rx, r.y + 18, F_BODY, rc);
      text("until recharge", rx, r.y + 44, F_TINY, rc);
    }

    // Three narrow lines rather than one wide one.
    int16_t sx = r.x + r.w - 22;
    text("open-meteo",   sx, r.y + 12, F_TINY, C_INK, TR_DATUM);
    text("thespacedevs", sx, r.y + 33, F_TINY, C_INK, TR_DATUM);
    text("12 h wake",    sx, r.y + 54, F_TINY, C_INK, TR_DATUM);
  }

  void drawStaleBar(const Layout &L, const Model &m) {
    g.fillRect(0, L.footer.y - 26, PANEL_W, 26, C_RED);
    char s[64]; snprintf(s, sizeof(s), "DATA IS STALE - %d MISSED REFRESHES", m.missedRefreshes);
    text(s, PANEL_W / 2, L.footer.y - 23, F_TINY, C_PAPER, TC_DATUM);
  }

  void drawDrop(int16_t x, int16_t y, uint16_t col) {
    g.fillTriangle(x + 6, y, x, y + 9, x + 12, y + 9, col);
    g.fillCircle(x + 6, y + 10, 6, col);
  }

  void drawWeatherIcon(int code, int16_t cx, int16_t top, int16_t size) {
    int16_t cy = top + size / 2, rr = size / 3;
    if (code == 0) {
      g.fillCircle(cx, cy, rr, C_YELLOW);
      g.drawCircle(cx, cy, rr, C_INK);
      for (int i = 0; i < 8; i++) {
        float a = i * PI / 4;
        g.drawLine(cx + cos(a) * (rr + 3), cy + sin(a) * (rr + 3),
                   cx + cos(a) * (rr + 8), cy + sin(a) * (rr + 8), C_INK);
      }
    } else if (code <= 2) {
      g.fillCircle(cx - 7, cy - 6, rr - 2, C_YELLOW);
      g.drawCircle(cx - 7, cy - 6, rr - 2, C_INK);
      cloud(cx + 3, cy + 5, size, C_PAPER);
    } else if (code <= 48) {
      cloud(cx, cy, size, C_PAPER);
    } else {
      cloud(cx, cy - 5, size, C_PAPER);
      for (int i = -1; i <= 1; i++)
        g.drawLine(cx + i * 8, cy + 8, cx + i * 8 - 3, cy + 17, C_BLUE);
    }
  }
  void cloud(int16_t cx, int16_t cy, int16_t size, uint16_t fill) {
    int16_t r = size / 4;
    g.fillCircle(cx - r, cy, r, fill);         g.drawCircle(cx - r, cy, r, C_INK);
    g.fillCircle(cx + r, cy, r, fill);         g.drawCircle(cx + r, cy, r, C_INK);
    g.fillCircle(cx, cy - r / 2, r + 2, fill); g.drawCircle(cx, cy - r / 2, r + 2, C_INK);
    g.fillRect(cx - r, cy - 2, 2 * r, r, fill);
  }
};

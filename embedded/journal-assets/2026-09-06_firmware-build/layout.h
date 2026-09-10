#pragma once
// Panel geometry, transcribed from dashboard/mockup.html.
//
// The mockup places every box absolutely and prints this table under the panel;
// these constants are that table. Change one here and in the mockup together, or
// the mockup stops being the specification.

#include <stdint.h>

static const int16_t PANEL_W = 800, PANEL_H = 480;

static const int16_t HEADER_H  = 84;
static const int16_t KEYLINE_H = 5;
static const int16_t DETAIL_H  = 80;
static const int16_t FOOTER_H  = 78;
static const int16_t BIN_H     = 40;
static const int16_t LCH_H     = 56;
static const int16_t RULE      = 4;

// Detail row cells: peak | sun | air, with 4 px rules between
static const int16_t CELL_PEAK_X = 0,   CELL_PEAK_W = 280;
static const int16_t CELL_SUN_X  = 284, CELL_SUN_W  = 220;
static const int16_t CELL_AIR_X  = 508, CELL_AIR_W  = 292;

// Forecast strip: five columns on a 160 px pitch, last one absorbs the rule
static const int16_t FC_N = 5, FC_PITCH = 160, FC_COLW = 156;

struct Rect { int16_t x, y, w, h; };

struct Layout {
  Rect header, keyline, peak, cell1Rule, sun, cell2Rule, air, detailRule;
  Rect forecast, binRule, bins, lchRule, launch, footRule, footer;
  bool showBins, showLaunch;

  Rect fcCol(int i) const {
    return { (int16_t)(i * FC_PITCH), forecast.y,
             (int16_t)(i == FC_N - 1 ? FC_PITCH : FC_COLW), forecast.h };
  }
  Rect fcRule(int i) const {
    return { (int16_t)(i * FC_PITCH + FC_COLW), forecast.y, RULE, forecast.h };
  }
};

// Mirrors layout() in the mockup exactly, including the order the bands stack
// upward from the footer.
inline Layout computeLayout(bool showBins, bool showLaunch) {
  Layout L{};
  L.showBins = showBins;
  L.showLaunch = showLaunch;

  L.header  = { 0, 0, PANEL_W, HEADER_H };
  L.keyline = { 0, HEADER_H, PANEL_W, KEYLINE_H };
  const int16_t top = HEADER_H + KEYLINE_H;

  L.peak      = { CELL_PEAK_X, top, CELL_PEAK_W, DETAIL_H };
  L.cell1Rule = { (int16_t)(CELL_PEAK_X + CELL_PEAK_W), top, RULE, DETAIL_H };
  L.sun       = { CELL_SUN_X, top, CELL_SUN_W, DETAIL_H };
  L.cell2Rule = { (int16_t)(CELL_SUN_X + CELL_SUN_W), top, RULE, DETAIL_H };
  L.air       = { CELL_AIR_X, top, CELL_AIR_W, DETAIL_H };
  L.detailRule = { 0, (int16_t)(top + DETAIL_H), PANEL_W, RULE };

  const int16_t fcTop = top + DETAIL_H + RULE;

  L.footer   = { 0, (int16_t)(PANEL_H - FOOTER_H), PANEL_W, FOOTER_H };
  L.footRule = { 0, (int16_t)(PANEL_H - FOOTER_H - RULE), PANEL_W, RULE };

  int16_t bb = PANEL_H - FOOTER_H - RULE;
  if (showLaunch) {
    L.launch  = { 0, (int16_t)(bb - LCH_H), PANEL_W, LCH_H };
    bb -= LCH_H + RULE;
    L.lchRule = { 0, bb, PANEL_W, RULE };
  }
  if (showBins) {
    L.bins    = { 0, (int16_t)(bb - BIN_H), PANEL_W, BIN_H };
    bb -= BIN_H + RULE;
    L.binRule = { 0, bb, PANEL_W, RULE };
  }
  L.forecast = { 0, fcTop, PANEL_W, (int16_t)(bb - fcTop) };
  return L;
}

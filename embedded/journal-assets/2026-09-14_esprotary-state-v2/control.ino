// espRotary — light control for SmartLife/Tuya bulbs over the LAN.
//
//   LIGHTS   turn or swipe to browse groups
//            PRESS steps the mode:  off › white › colour › scene
//            TAP enters the adjustments that mode offers
//   ADJUST   turn to set, SWIPE to the next control, PRESS for on/off,
//            TAP back to LIGHTS
//
// Two levels, four inputs, and press is the power control on both: at the top
// it is the extended version, with off as one position in the cycle.
//
// A group offers a mode only when every member reports the datapoint that mode
// needs. dp 21 advertises white/colour/scene/music on every bulb here, and on
// most of them that is a lie — the Bar bulbs have no dp 24 at all.
//
// Network sends run on their own task: a group of three bulbs is three
// sequential round trips, and doing that in the UI loop froze the display for
// as long as it took.

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <time.h>
#include <Arduino_GFX_Library.h>
#include <Adafruit_NeoPixel.h>
#include "pins.h"
#include "secrets.h"
#include "devices_secret.h"
#include "tuya.h"
#include "perceptual.h"
#include "scenes.h"
#include "touch.h"
#include "version.h"

Arduino_DataBus *bus = new Arduino_ESP32SPI(PIN_LCD_DC, PIN_LCD_CS, PIN_LCD_SCLK, PIN_LCD_MOSI, GFX_NOT_DEFINED);
Arduino_GFX     *gfx = new Arduino_GC9A01(bus, PIN_LCD_RST, 0, true);
Adafruit_NeoPixel rgb(RGB_COUNT, PIN_RGB, NEO_GRB + NEO_KHZ800);
Touch touch;

// ── encoder ─────────────────────────────────────────────────────────────────
volatile int32_t encPos = 0;
volatile uint8_t encPrev = 0;
static const int8_t QTAB[16] = { 0,-1,+1,0, +1,0,0,-1, -1,0,0,+1, 0,+1,-1,0 };
void IRAM_ATTR onEnc() {
  uint8_t s = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  int8_t d = QTAB[(encPrev << 2) | s];
  if (d) encPos += d;
  encPrev = s;
}
static int32_t detents() { return encPos / 4; }

// ── modes and controls ──────────────────────────────────────────────────────
enum { MODE_OFF = 0, MODE_WHITE, MODE_COLOUR, MODE_SCENE, MODE_MUSIC };
enum { CTL_BRIGHT = 0, CTL_WARM, CTL_HUE, CTL_SAT, CTL_SCENE };

static const char *MODE_NAME[] = { "OFF", "WHITE", "COLOR", "SCENE", "MUSIC" };
static const char *CTL_NAME[]  = { "BRIGHTNESS", "WARMTH", "COLOR", "SATURATION", "SCENE" };
static const char *CTL_SHORT[] = { "bright", "warmth", "color", "sat", "scene" };

// ── what the UI wants the lights to be ──────────────────────────────────────
// The UI only ever writes these; the worker only ever reads them. Values are
// coalesced, so spinning the knob produces one send per round trip rather than
// a backlog — the last value is the only one that matters.
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
struct Desired {
  int  group = 0;
  int  mode  = MODE_WHITE;
  int  dps   = 500;                 // dp 22, white brightness
  int  warm  = 500;                 // dp 23
  int  hue = 0, sat = 1000, val = 1000;   // dp 24
  int  scene = 0;                   // index into SCENES
  bool power = false;
  uint32_t powerSeq = 0, modeSeq = 0, brightSeq = 0, warmSeq = 0,
           colourSeq = 0, sceneSeq = 0, readSeq = 0;
} want;
struct Sent { uint32_t powerSeq = 0, modeSeq = 0, brightSeq = 0, warmSeq = 0,
                       colourSeq = 0, sceneSeq = 0, readSeq = 0; } done;
volatile bool netBusy = false;
// When the knob last chose a mode. A status read inside this window keeps its
// hands off dp 21: the bulb has not caught up yet, and the press is the truth.
volatile uint32_t modeSetMs = 0;
static const uint32_t MODE_SETTLE_MS = 6000;

enum Screen { SCR_SELECT, SCR_ADJUST };
Screen screen = SCR_SELECT;
int    sel = 0;
int    mode = MODE_WHITE;
bool   power = false;
float  lstar = 50;                  // white brightness as perceived lightness
float  clstar = 100;                // colour brightness, same scale
int    warm = 500, hue = 0, sat = 1000, scene = 0;
bool   dirty = true;

static const LightGroup &G() { return GROUPS[sel]; }
TuyaDevice conns[8];

// The mode cycle for the group in front of you, built from its datapoints.
// A plain switch gets off/on and nothing else.
static uint8_t modeList[4], modeCount = 0, modeIdx = 0;
static void buildModes() {
  const LightGroup &g = G();
  modeCount = 0;
  modeList[modeCount++] = MODE_OFF;
  modeList[modeCount++] = MODE_WHITE;                      // "on" for a switch
  if (g.caps & CAP_COLOUR) modeList[modeCount++] = MODE_COLOUR;
  if (g.caps & CAP_SCENE)  modeList[modeCount++] = MODE_SCENE;
  if (g.caps)              modeList[modeCount++] = MODE_MUSIC;
  modeIdx = 0;
  for (uint8_t i = 0; i < modeCount; i++)
    if (modeList[i] == (power ? mode : MODE_OFF)) modeIdx = i;
}

static uint8_t ctlList[4], ctlCount = 0, ctlIdx = 0;
static void buildCtls() {
  const LightGroup &g = G();
  ctlCount = 0;
  if (mode == MODE_WHITE) {
    if (g.caps & CAP_BRIGHT) ctlList[ctlCount++] = CTL_BRIGHT;
    if (g.caps & CAP_WARM)   ctlList[ctlCount++] = CTL_WARM;
  } else if (mode == MODE_COLOUR) {
    ctlList[ctlCount++] = CTL_HUE;
    ctlList[ctlCount++] = CTL_SAT;
    ctlList[ctlCount++] = CTL_BRIGHT;
  } else if (mode == MODE_SCENE) {
    ctlList[ctlCount++] = CTL_SCENE;
    if (g.caps & CAP_BRIGHT) ctlList[ctlCount++] = CTL_BRIGHT;
  }
  if (ctlIdx >= ctlCount) ctlIdx = 0;
}
static uint8_t ctl() { return ctlCount ? ctlList[ctlIdx] : CTL_BRIGHT; }

// ── worker task: everything that can block lives here ───────────────────────
static void colourHex(char *out, int h, int s, int v) {
  snprintf(out, 16, "%04x%04x%04x", h & 0xFFFF, s & 0xFFFF, v & 0xFFFF);
}

static void netTask(void *) {
  for (;;) {
    Desired d;
    portENTER_CRITICAL(&mux); d = want; portEXIT_CRITICAL(&mux);
    const LightGroup &g = GROUPS[d.group];
    bool did = false;
    #define EACH for (int i = 0; i < g.count && i < 8; i++)
    #define DIAL conns[i].configure(g.members[i].id, g.members[i].ip, g.members[i].key, g.members[i].ver)

    if (d.powerSeq != done.powerSeq) {
      netBusy = true;
      EACH { DIAL; conns[i].setBool(g.members[i].kind == KIND_SWITCH ? 1 : 20, d.power); }
      done.powerSeq = d.powerSeq; did = true;
    }
    if (d.modeSeq != done.modeSeq) {
      netBusy = true;
      const char *m = d.mode == MODE_COLOUR ? "colour" : d.mode == MODE_SCENE ? "scene"
                    : d.mode == MODE_MUSIC ? "music" : "white";
      EACH {
        if (g.members[i].kind == KIND_SWITCH) continue;
        DIAL; conns[i].setStr(21, m);
      }
      done.modeSeq = d.modeSeq; did = true;
    }
    if (d.brightSeq != done.brightSeq) {
      netBusy = true;
      EACH {
        if (g.members[i].kind == KIND_SWITCH) continue;
        DIAL; conns[i].setInt(22, d.dps);
      }
      done.brightSeq = d.brightSeq; did = true;
    }
    if (d.warmSeq != done.warmSeq) {
      netBusy = true;
      EACH {
        if (g.members[i].kind == KIND_SWITCH) continue;
        DIAL; conns[i].setInt(23, d.warm);
      }
      done.warmSeq = d.warmSeq; did = true;
    }
    if (d.colourSeq != done.colourSeq) {
      netBusy = true;
      char hsv[16]; colourHex(hsv, d.hue, d.sat, d.val);
      EACH {
        if (g.members[i].kind != KIND_COLOUR) continue;
        DIAL; conns[i].setStr(24, hsv);
      }
      done.colourSeq = d.colourSeq; did = true;
    }
    if (d.sceneSeq != done.sceneSeq) {
      netBusy = true;
      char payload[128];
      scenePayload(payload, sizeof(payload), d.scene);
      EACH {
        if (g.members[i].kind == KIND_SWITCH) continue;
        DIAL; conns[i].setStr(25, payload);
      }
      done.sceneSeq = d.sceneSeq; did = true;
    }
    if (d.readSeq != done.readSeq) {
      netBusy = true;
      conns[0].configure(g.members[0].id, g.members[0].ip, g.members[0].key, g.members[0].ver);
      JsonDocument doc;
      if (conns[0].status(doc)) {
        JsonObject dps = doc["dps"];
        bool p = dps["20"].is<bool>() ? dps["20"].as<bool>()
               : (dps["1"].is<bool>() ? dps["1"].as<bool>() : false);
        int  b = dps["22"].is<int>() ? dps["22"].as<int>() : 500;
        int  t = dps["23"].is<int>() ? dps["23"].as<int>() : 500;
        const char *m = dps["21"].is<const char *>() ? dps["21"].as<const char *>() : "white";
        int mm = !strcmp(m, "colour") ? MODE_COLOUR : !strcmp(m, "scene") ? MODE_SCENE
               : !strcmp(m, "music") ? MODE_MUSIC : MODE_WHITE;
        if (millis() - modeSetMs < MODE_SETTLE_MS) mm = mode;
        int h = want.hue, s = want.sat, v = want.val;
        if (dps["24"].is<const char *>()) {
          const char *c = dps["24"].as<const char *>();
          if (strlen(c) >= 12) {
            char buf[5] = {0};
            memcpy(buf, c + 0, 4); h = strtol(buf, nullptr, 16);
            memcpy(buf, c + 4, 4); s = strtol(buf, nullptr, 16);
            memcpy(buf, c + 8, 4); v = strtol(buf, nullptr, 16);
          }
        }
        portENTER_CRITICAL(&mux);
        want.power = p; want.dps = b; want.warm = t; want.mode = mm;
        want.hue = h; want.sat = s; want.val = v;
        portEXIT_CRITICAL(&mux);
        power = p; mode = mm; lstar = dpsToLstar(b); warm = t;
        hue = h; sat = s; clstar = dpsToLstar(v);
        buildCtls(); dirty = true;
      }
      done.readSeq = d.readSeq; did = true;
    }
    netBusy = false;
    vTaskDelay((did ? 10 : 30) / portTICK_PERIOD_MS);
    #undef EACH
    #undef DIAL
  }
}
static void wantPower(bool p) { portENTER_CRITICAL(&mux); want.power = p; want.group = sel; want.powerSeq++;  portEXIT_CRITICAL(&mux); }
static void wantMode(int m)   { portENTER_CRITICAL(&mux); want.mode = m;  want.group = sel; want.modeSeq++;   portEXIT_CRITICAL(&mux); }
static void wantBright(int d) { portENTER_CRITICAL(&mux); want.dps = d;   want.group = sel; want.brightSeq++; portEXIT_CRITICAL(&mux); }
static void wantWarm(int w)   { portENTER_CRITICAL(&mux); want.warm = w;  want.group = sel; want.warmSeq++;   portEXIT_CRITICAL(&mux); }
static void wantColour()      { portENTER_CRITICAL(&mux); want.hue = hue; want.sat = sat; want.val = lstarToDps(clstar);
                                                          want.group = sel; want.colourSeq++; portEXIT_CRITICAL(&mux); }
static void wantScene(int s)  { portENTER_CRITICAL(&mux); want.scene = s; want.group = sel; want.sceneSeq++;  portEXIT_CRITICAL(&mux); }
static void wantRead()        { portENTER_CRITICAL(&mux); want.group = sel; want.readSeq++; portEXIT_CRITICAL(&mux); }

// ── drawing ─────────────────────────────────────────────────────────────────
#define C_BG RGB565_BLACK
#define C_TX RGB565_WHITE
#define C_DM RGB565_DARKGREY
#define C_AC RGB565_CYAN
#define C_ON RGB565_GREEN

// Every line is drawn opaque and padded to a fixed column count, so redrawing
// it covers whatever it replaces. No fillRect, no fillScreen — a clear wide
// enough to cover the text also ate the ring dots at the sides of the glass.
// cols must keep the band inside the ring at that height.
static void centre(const char *s, int y, uint16_t c, uint8_t sz, int cols) {
  char buf[44];
  int n = strlen(s);
  if (n > cols) n = cols;
  if (cols > 42) cols = 42;
  int pad = (cols - n) / 2;
  memset(buf, ' ', cols);
  memcpy(buf + pad, s, n);
  buf[cols] = 0;
  gfx->setTextSize(sz);
  gfx->setTextColor(c, C_BG);
  gfx->setCursor((240 - cols * 6 * sz) / 2, y);
  gfx->print(buf);
}
// A hue angle is a number nobody thinks in. Name the colour instead.
static const char *hueName(int h) {
  if (h < 15)  return "RED";
  if (h < 40)  return "ORANGE";
  if (h < 68)  return "YELLOW";
  if (h < 95)  return "LIME";
  if (h < 160) return "GREEN";
  if (h < 195) return "TEAL";
  if (h < 225) return "SKY";
  if (h < 260) return "BLUE";
  if (h < 290) return "VIOLET";
  if (h < 320) return "PURPLE";
  if (h < 345) return "PINK";
  return "RED";
}
static const char *warmName(int w) {
  if (w < 200) return "CANDLE";
  if (w < 400) return "WARM";
  if (w < 650) return "NEUTRAL";
  if (w < 850) return "COOL";
  return "DAYLIGHT";
}

// Arrow glyphs drawn as triangles: the built-in font has no arrow characters,
// and the words "swipe" and "toggle" describe the mechanism rather than the
// result. A pair of arrows says "this moves sideways" without any words at all.
static void arrowsHint(const char *label, int y, uint16_t col) {
  gfx->setTextSize(1);
  int16_t tw = strlen(label) * 6;
  int16_t total = 9 + 5 + tw + 5 + 9;
  int16_t x = (240 - total) / 2;
  gfx->fillTriangle(x + 8, y - 1, x + 8, y + 9, x, y + 4, col);          // left
  gfx->setTextColor(col); gfx->setCursor(x + 14, y + 1); gfx->print(label);
  int16_t rx = x + 14 + tw + 5;
  gfx->fillTriangle(rx, y - 1, rx, y + 9, rx + 8, y + 4, col);           // right
}

static uint16_t hsv565(int h, int s, int v) {
  float S = s / 1000.0f, V = v / 1000.0f;
  float c = V * S, x = c * (1 - fabsf(fmodf(h / 60.0f, 2) - 1)), m = V - c, r=0,g=0,b=0;
  if (h<60){r=c;g=x;} else if (h<120){r=x;g=c;} else if (h<180){g=c;b=x;}
  else if (h<240){g=x;b=c;} else if (h<300){r=x;b=c;} else {r=c;b=x;}
  return gfx->color565((r+m)*255, (g+m)*255, (b+m)*255);
}
static uint16_t hue565(int h) { return hsv565(h, 1000, 1000); }
// Warm to cool as the eye sees it: amber through white to blue-white.
static uint16_t warm565(int w) {
  float t = w / 1000.0f;
  return gfx->color565(255, 150 + 105 * t, 40 + 215 * t);
}

// The ring is 52 dots. A value change used to repaint all of them inside a
// full-screen clear, which cost 36 ms a detent; now the marker snaps to a dot
// and only the dots that actually changed get touched.
static const int RING_DOTS = 52;

static void dotXY(int i, int &x, int &y) {
  float r = (-220 + 5 * i) * PI / 180.0f;
  x = 120 + cosf(r) * 108;
  y = 120 + sinf(r) * 108;
}
static uint16_t dotColour(int i, int pct, uint16_t col, uint8_t style) {
  int p = i * 100 / RING_DOTS;
  return style == 1 ? hue565(p * 360 / 100)
       : style == 2 ? warm565(p * 10)
                    : (p <= pct ? col : C_DM);
}
static void plainDot(int i, int pct, uint16_t col, uint8_t style) {
  if (i < 0 || i >= RING_DOTS) return;
  int x, y; dotXY(i, x, y);
  gfx->fillCircle(x, y, 4, dotColour(i, pct, col, style));
}
static void markDot(int i, int pct, uint16_t col, uint8_t style) {
  int x, y; dotXY(i, x, y);
  gfx->fillCircle(x, y, 7, dotColour(i, pct, col, style));
  gfx->drawCircle(x, y, 8, C_TX);
  gfx->drawCircle(x, y, 9, C_TX);
}
static void clearDot(int i, int pct, uint16_t col, uint8_t style) {
  if (i < 0 || i >= RING_DOTS) return;
  int x, y; dotXY(i, x, y);
  gfx->fillCircle(x, y, 9, C_BG);
  plainDot(i - 1, pct, col, style);
  plainDot(i, pct, col, style);
  plainDot(i + 1, pct, col, style);
}
static int markIndex(int pct) {
  int i = (pct * RING_DOTS + 50) / 100;
  return i < 0 ? 0 : (i >= RING_DOTS ? RING_DOTS - 1 : i);
}
static void ringFull(int pct, uint16_t col, uint8_t style, int markPct) {
  for (int i = 0; i < RING_DOTS; i++) plainDot(i, pct, col, style);
  if (markPct >= 0) markDot(markIndex(markPct), pct, col, style);
}
// Repaint only what moved: the dots between the old and new fill level, plus
// the two marker positions.
static void ringDelta(int oldPct, int pct, int oldMark, int markPct,
                      uint16_t col, uint8_t style) {
  if (style == 0 && oldPct != pct) {
    int lo = oldPct < pct ? oldPct : pct, hi = oldPct < pct ? pct : oldPct;
    for (int i = 0; i < RING_DOTS; i++) {
      int p = i * 100 / RING_DOTS;
      if (p >= lo - 2 && p <= hi + 2) plainDot(i, pct, col, style);
    }
  }
  int oi = markIndex(oldMark), ni = markIndex(markPct);
  if (oi != ni || oldPct != pct) {
    clearDot(oi, pct, col, style);
    markDot(ni, pct, col, style);
  }
}

// Drawn on every screen, small and dim, so the running build is always visible
// without getting in the way.
static void drawBuildStamp() {
  char b[24];
  snprintf(b, sizeof(b), "b%d %s", FW_BUILD, FW_BUILD_TIME);
  gfx->setTextSize(1);
  gfx->setTextColor(RGB565_DARKGREY);
  gfx->setCursor((240 - (int)strlen(b) * 6) / 2, 222);
  gfx->print(b);
}

// What the last frame put on the glass, so the next one can repaint the
// difference instead of the whole screen.
static struct {
  int screen = -1, sel = -1, mode = -1, ctl = -1, pct = -1, mark = -1;
  uint8_t style = 255;
  uint16_t col = 0;
  bool power = false, busy = false;
} shown;

static void drawSelect() {
  centre("LIGHTS", 30, C_DM, 1, 10);
  centre(G().name, 66, C_TX, 2, 14);
  char s[40];
  if (G().count > 1) snprintf(s, sizeof(s), "%d lights", G().count);
  else snprintf(s, sizeof(s), "%s", G().kind==KIND_COLOUR?"colour":G().kind==KIND_DIMMABLE?"dimmable":"switch");
  centre(s, 94, C_DM, 1, 20);

  // The state the press cycle is sitting on, with the input that moves it
  // directly underneath — no sentence needed.
  const char *m = G().caps == 0 ? (power ? "ON" : "OFF") : (power ? MODE_NAME[mode] : "OFF");
  centre(m, 116, power ? C_ON : C_DM, 2, 10);
  centre("press", 140, C_DM, 1, 10);

  snprintf(s, sizeof(s), "%d / %d", sel+1, GROUP_COUNT);
  centre(s, 162, C_DM, 1, 9);
  centre(ctlCount ? "tap to adjust" : "no adjustments", 198, C_DM, 1, 16);
}

// Everything above the ON/OFF line: the part a knob turn changes.
static void drawValue() {
  char v[24];
  switch (ctl()) {
    case CTL_BRIGHT: {
      float L = (mode == MODE_COLOUR) ? clstar : lstar;
      snprintf(v, sizeof(v), "%d%%", (int)lroundf(L));
      centre(v, 80, power ? C_TX : C_DM, 4, 5);
      break;
    }
    case CTL_WARM:
      snprintf(v, sizeof(v), "%d%%", warm / 10);
      centre(v, 72, power ? C_TX : C_DM, 3, 5);
      centre(warmName(warm), 106, power ? C_TX : C_DM, 2, 9);
      break;
    case CTL_HUE:
      gfx->fillCircle(120, 88, 32, hsv565(hue, sat, 1000));
      gfx->drawCircle(120, 88, 32, C_TX);
      centre(hueName(hue), 128, power ? C_TX : C_DM, 2, 8);
      break;
    case CTL_SAT:
      gfx->fillCircle(120, 88, 32, hsv565(hue, sat, 1000));
      gfx->drawCircle(120, 88, 32, C_TX);
      snprintf(v, sizeof(v), "%d%%", sat / 10);
      centre(v, 128, power ? C_TX : C_DM, 2, 5);
      break;
    case CTL_SCENE:
      centre(SCENES[scene].name, 86, power ? C_TX : C_DM, 2, 9);
      snprintf(v, sizeof(v), "%d / %d", scene + 1, SCENE_COUNT);
      centre(v, 116, C_DM, 1, 7);
      break;
  }
}

static void adjustMark(int &pct, int &markPct, uint8_t &style) {
  style = 0;
  switch (ctl()) {
    case CTL_BRIGHT: markPct = (int)lroundf((mode == MODE_COLOUR) ? clstar : lstar); break;
    case CTL_WARM:   markPct = warm / 10; style = 2; break;
    case CTL_HUE:    markPct = hue * 100 / 360; style = 1; break;
    case CTL_SAT:    markPct = sat / 10; break;
    case CTL_SCENE:  markPct = SCENE_COUNT > 1 ? scene * 100 / (SCENE_COUNT - 1) : 0; break;
  }
  pct = markPct;
}

static void drawAdjust() {
  centre(G().name, 28, C_DM, 1, 16);
  // On the scene screen the control and the mode carry the same name, and
  // printing it twice tells you nothing.
  centre(strcmp(CTL_NAME[ctl()], MODE_NAME[mode]) ? CTL_NAME[ctl()] : "", 46, C_AC, 1, 14);
  drawValue();
  centre(power ? "ON" : "OFF", 148, power ? C_ON : C_DM, 2, 4);
  centre("press", 172, C_DM, 1, 8);
  if (ctlCount > 1) arrowsHint(CTL_SHORT[ctlList[(ctlIdx + 1) % ctlCount]], 190, C_DM);
  centre("tap to exit", 206, C_DM, 1, 12);
}

static void draw() {
  int pct = sel * 100 / (GROUP_COUNT - 1), markPct = pct;
  uint8_t style = 0;
  uint16_t col = C_AC;
  if (screen == SCR_ADJUST) { adjustMark(pct, markPct, style); col = power ? C_AC : C_DM; }

  // Only a change of layout needs the glass wiped. Everything else repaints
  // over itself: opaque text, and the handful of ring dots that moved.
  bool full = shown.screen != (int)screen || shown.ctl != (int)ctl() || shown.style != style;
  if (full) {
    gfx->fillScreen(C_BG);
    if (screen == SCR_SELECT) drawSelect(); else drawAdjust();
    ringFull(pct, col, style, markPct);
    drawBuildStamp();
  } else if (shown.col != col) {
    // the light went on or off: every dot changes colour, not just the moved one
    if (screen == SCR_SELECT) drawSelect(); else drawAdjust();
    ringFull(pct, col, style, markPct);
  } else {
    if (screen == SCR_SELECT) drawSelect(); else drawAdjust();
    ringDelta(shown.pct, pct, shown.mark, markPct, col, style);
  }
  if (netBusy != shown.busy) gfx->fillCircle(120, 14, 4, netBusy ? C_AC : C_BG);

  shown.screen = screen; shown.sel = sel; shown.mode = mode; shown.ctl = ctl();
  shown.power = power; shown.pct = pct; shown.mark = markPct; shown.style = style;
  shown.col = col;
  shown.busy = netBusy;
  dirty = false;
}
static void leds() {
  uint32_t c;
  if (!power)                        c = rgb.Color(4, 0, 0);
  else if (screen == SCR_SELECT)     c = rgb.Color(0, 30, 45);
  else if (mode == MODE_COLOUR)      { uint16_t p = hsv565(hue, sat, 1000); c = rgb.Color(((p>>11)&31)*8, ((p>>5)&63)*4, (p&31)*8); }
  else if (ctl() == CTL_WARM)        { uint16_t p = warm565(warm); c = rgb.Color(((p>>11)&31)*8, ((p>>5)&63)*4, (p&31)*8); }
  else                               c = rgb.Color(lstar*2.2f, lstar*1.7f, 0);
  for (int i = 0; i < RGB_COUNT; i++) rgb.setPixelColor(i, c);
  rgb.show();
}

// ── the press cycle ─────────────────────────────────────────────────────────
// off is one position in it, so press never stops meaning power.
static void stepMode() {
  modeIdx = (modeIdx + 1) % modeCount;
  uint8_t m = modeList[modeIdx];
  modeSetMs = millis();
  if (m == MODE_OFF) {
    power = false; wantPower(false);
  } else {
    bool wasOff = !power;
    power = true; mode = m;
    if (wasOff) wantPower(true);
    if (G().caps) wantMode(m);
    if (m == MODE_SCENE) wantScene(scene);
    buildCtls();
  }
}

void setup() {
  Serial.begin(115200); delay(300);
  pinMode(PIN_DISP_PWR_A, OUTPUT); digitalWrite(PIN_DISP_PWR_A, HIGH);
  pinMode(PIN_DISP_PWR_B, OUTPUT); digitalWrite(PIN_DISP_PWR_B, HIGH);
  ledcAttach(PIN_LCD_BL, 5000, 8); ledcWrite(PIN_LCD_BL, 200);
  gfx->begin(80000000); gfx->fillScreen(C_BG);   // 40 MHz was half the redraw cost
  rgb.begin(); rgb.setBrightness(50); rgb.clear(); rgb.show();
  if (!touch.begin()) Serial.println("touch: no response at 0x15");
  Serial.printf("touch: chip 0x%02X config %s (int-gated, filtered)\n", touch.chipId(), touch.configOk() ? "ok" : "MISMATCH");
  pinMode(PIN_ENC_A, INPUT_PULLUP); pinMode(PIN_ENC_B, INPUT_PULLUP);
  pinMode(PIN_ENC_SW, INPUT_PULLUP);
  encPrev = (digitalRead(PIN_ENC_A)<<1) | digitalRead(PIN_ENC_B);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), onEnc, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_B), onEnc, CHANGE);

  centre("connecting", 108, C_TX, 2, 12);
  drawBuildStamp();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis()-t0 < 20000) delay(200);
  configTzTime("PST8PDT,M3.2.0,M11.1.0", "pool.ntp.org");
  Serial.printf("wifi %s ip %s  %d groups\n", WiFi.status()==WL_CONNECTED?"ok":"FAILED",
                WiFi.localIP().toString().c_str(), GROUP_COUNT);
  xTaskCreatePinnedToCore(netTask, "net", 8192, nullptr, 1, nullptr, 0);
  buildModes(); buildCtls();
  dirty = true;
}

void loop() {
  static int32_t lastDet = 0;
  static uint32_t lastDetMs = 0;
  static int lastSw = HIGH;
  static bool touchBlocked = false;
  static uint32_t pressAt = 0;
  static uint32_t swChangedMs = 0;

  // ── rotation, accelerated ─────────────────────────────────────────────────
  int32_t now = detents();
  if (now != lastDet) {
    int32_t d = now - lastDet;
    uint32_t gap = millis() - lastDetMs;
    lastDet = now; lastDetMs = millis();
    if (screen == SCR_SELECT) {
      sel = (sel + (d > 0 ? 1 : -1) * min((int)labs(d), 3)) % GROUP_COUNT;
      if (sel < 0) sel += GROUP_COUNT;
      buildModes(); buildCtls();
    } else {
      switch (ctl()) {
        case CTL_BRIGHT: {
          int step = accelStep(gap, 100);
          float &L = (mode == MODE_COLOUR) ? clstar : lstar;
          L = constrain(L + d * step, 0.0f, 100.0f);
          if (mode == MODE_COLOUR) wantColour(); else wantBright(lstarToDps(L));
          break;
        }
        case CTL_WARM:
          warm = constrain(warm + d * accelStep(gap, 1000), 0, 1000);
          wantWarm(warm);
          break;
        case CTL_HUE:
          hue = (hue + d * accelStep(gap, 360)) % 360; if (hue < 0) hue += 360;
          wantColour();
          break;
        case CTL_SAT:
          sat = constrain(sat + d * accelStep(gap, 1000), 0, 1000);
          wantColour();
          break;
        case CTL_SCENE:
          scene = (scene + (d > 0 ? 1 : -1)) % SCENE_COUNT;
          if (scene < 0) scene += SCENE_COUNT;
          wantScene(scene);
          break;
      }
    }
    dirty = true;
  }

  // ── knob press: power at both levels, and blocks touch while held ─────────
  // Sample, then wait for the level to hold. The previous version compared one
  // sample 12 ms later and dropped the edge outright when they disagreed, which
  // is why roughly every other press did nothing.
  static int swRaw = HIGH;
  int sw = digitalRead(PIN_ENC_SW);
  if (sw != swRaw) { swRaw = sw; swChangedMs = millis(); }
  if (sw != lastSw && millis() - swChangedMs > 15) {
    lastSw = sw;
    if (sw == LOW) {
      pressAt = millis();
      touchBlocked = true;                   // pressing the knob presses the glass
      if (screen == SCR_SELECT) stepMode();
      else { power = !power; wantPower(power); }
      dirty = true;
    }
  }
  // keep touch suppressed for a moment after release, while the glass settles
  if (sw == HIGH && touchBlocked && millis() - pressAt > 350) touchBlocked = false;

  // ── gestures from the controller, not from a stopwatch ───────────────────
  uint8_t g = touch.poll();
  if (g) Serial.printf("gesture 0x%02X %s  screen=%d ctl=%d  publish+%lums%s\n", g,
           g==G_CLICK?"tap":g==G_LEFT?"swipe L":g==G_RIGHT?"swipe R":
           g==G_LONG?"long":g==G_UP?"swipe U":g==G_DOWN?"swipe D":"?",
           (int)screen, ctl(), touch.lastLatencyMs(), touchBlocked ? "  (blocked by press)" : "");
  if (touchBlocked) g = G_NONE;
  if (g == G_CLICK) {
    if (screen == SCR_SELECT) {
      buildCtls();
      if (ctlCount) { screen = SCR_ADJUST; ctlIdx = 0; wantRead(); }
    } else {
      screen = SCR_SELECT;
      buildModes();
    }
    dirty = true;
  } else if (g == G_LEFT || g == G_RIGHT) {
    if (screen == SCR_SELECT) {
      // Swiping through the list mirrors turning the knob: same axis, same
      // direction, so either hand movement does the obvious thing.
      sel += (g == G_RIGHT) ? 1 : -1;
      if (sel >= GROUP_COUNT) sel = 0;
      if (sel < 0) sel = GROUP_COUNT - 1;
      buildModes(); buildCtls();
      dirty = true;
    } else if (ctlCount > 1) {
      ctlIdx = (ctlIdx + (g == G_RIGHT ? 1 : ctlCount - 1)) % ctlCount;
      dirty = true;
    }
  }

  static uint32_t lastHealth = 0;
  if (millis() - lastHealth > 15000) {
    lastHealth = millis();
    Serial.printf("touch health: irq=%lu frames=%lu rejected=%lu lastG=0x%02X lastF=%u\n",
                  touch.irqs(), touch.frames(), touch.rejected(), touch.lastGesture(), touch.lastFingers());
  }

  if (dirty) {
    bool wasFull = shown.screen != (int)screen || shown.ctl != (int)ctl();
    uint32_t t0 = millis();
    draw(); leds();
    uint32_t ms = millis() - t0;
    if (ms > 8) Serial.printf("draw took %lu ms  full=%d\n", ms, (int)wasFull);
  }
  delay(3);
}

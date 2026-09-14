// espRotary — light control for SmartLife/Tuya bulbs over the LAN.
//
//   SELECT      rotate to browse groups, TAP to enter
//   BRIGHTNESS  rotate to dim, PRESS to toggle, TAP back to select,
//               SWIPE left/right to cycle to hue
//   HUE         rotate for hue, PRESS to toggle, TAP back to select,
//               SWIPE left/right to cycle back
//
// Tap navigates, swipe changes what the knob adjusts, the knob press toggles
// power. Gestures come from the CST816T's own classifier, not from timing a
// polling loop. A knob press still suppresses touch, because pushing the knob
// presses the glass at the same time.
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

// ── what the UI wants the lights to be ──────────────────────────────────────
// The UI only ever writes these; the worker only ever reads them. Values are
// coalesced, so spinning the knob produces one send per round trip rather than
// a backlog — the last value is the only one that matters.
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
struct Desired {
  int  group = 0;
  int  dps = 500;
  int  hue = 0;
  bool power = false;
  uint32_t brightSeq = 0, hueSeq = 0, powerSeq = 0, readSeq = 0;
} want;
struct Sent { uint32_t brightSeq = 0, hueSeq = 0, powerSeq = 0, readSeq = 0; } done;
volatile bool netBusy = false;

enum Screen { SCR_SELECT, SCR_BRIGHT, SCR_HUE };
Screen screen = SCR_SELECT;
int    sel = 0;
float  lstar = 50;
int    hue = 0;
bool   power = false;
bool   dirty = true;

static const LightGroup &G() { return GROUPS[sel]; }
TuyaDevice conns[8];

// ── worker task: everything that can block lives here ───────────────────────
static void netTask(void *) {
  for (;;) {
    Desired d; 
    portENTER_CRITICAL(&mux); d = want; portEXIT_CRITICAL(&mux);
    const LightGroup &g = GROUPS[d.group];
    bool did = false;

    if (d.readSeq != done.readSeq) {
      netBusy = true;
      conns[0].configure(g.members[0].id, g.members[0].ip, g.members[0].key, g.members[0].ver);
      JsonDocument doc;
      if (conns[0].status(doc)) {
        JsonObject dps = doc["dps"];
        bool p = dps["20"].is<bool>() ? dps["20"].as<bool>()
               : (dps["1"].is<bool>() ? dps["1"].as<bool>() : false);
        int  b = dps["22"].is<int>() ? dps["22"].as<int>() : 500;
        portENTER_CRITICAL(&mux); want.power = p; want.dps = b; portEXIT_CRITICAL(&mux);
        power = p; lstar = dpsToLstar(b); dirty = true;
      }
      done.readSeq = d.readSeq; did = true;
    }
    if (d.powerSeq != done.powerSeq) {
      netBusy = true;
      for (int i = 0; i < g.count && i < 8; i++) {
        conns[i].configure(g.members[i].id, g.members[i].ip, g.members[i].key, g.members[i].ver);
        conns[i].setBool(g.members[i].kind == KIND_SWITCH ? 1 : 20, d.power);
      }
      done.powerSeq = d.powerSeq; did = true;
    }
    if (d.brightSeq != done.brightSeq) {
      netBusy = true;
      for (int i = 0; i < g.count && i < 8; i++) {
        if (g.members[i].kind == KIND_SWITCH) continue;
        conns[i].configure(g.members[i].id, g.members[i].ip, g.members[i].key, g.members[i].ver);
        conns[i].setInt(22, d.dps);
      }
      done.brightSeq = d.brightSeq; did = true;
    }
    if (d.hueSeq != done.hueSeq) {
      netBusy = true;
      char hsv[20]; snprintf(hsv, sizeof(hsv), "%04x03e803e8", d.hue);
      for (int i = 0; i < g.count && i < 8; i++) {
        if (g.members[i].kind != KIND_COLOUR) continue;
        conns[i].configure(g.members[i].id, g.members[i].ip, g.members[i].key, g.members[i].ver);
        conns[i].setStr(21, "colour"); conns[i].setStr(24, hsv);
      }
      done.hueSeq = d.hueSeq; did = true;
    }
    netBusy = false;
    vTaskDelay((did ? 10 : 30) / portTICK_PERIOD_MS);
  }
}
static void wantBright(int dps) { portENTER_CRITICAL(&mux); want.dps = dps; want.group = sel; want.brightSeq++; portEXIT_CRITICAL(&mux); }
static void wantHue(int h)      { portENTER_CRITICAL(&mux); want.hue = h;   want.group = sel; want.hueSeq++;    portEXIT_CRITICAL(&mux); }
static void wantPower(bool p)   { portENTER_CRITICAL(&mux); want.power = p; want.group = sel; want.powerSeq++;  portEXIT_CRITICAL(&mux); }
static void wantRead()          { portENTER_CRITICAL(&mux); want.group = sel; want.readSeq++; portEXIT_CRITICAL(&mux); }

// ── drawing ─────────────────────────────────────────────────────────────────
#define C_BG RGB565_BLACK
#define C_TX RGB565_WHITE
#define C_DM RGB565_DARKGREY
#define C_AC RGB565_CYAN
#define C_ON RGB565_GREEN

static void centre(const char *s, int y, uint16_t c, uint8_t sz) {
  gfx->setTextSize(sz); gfx->setTextColor(c);
  gfx->setCursor((240 - (int)strlen(s) * 6 * sz) / 2, y); gfx->print(s);
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

static uint16_t hue565(int h) {
  float c = 1, x = c * (1 - fabsf(fmodf(h / 60.0f, 2) - 1)), r=0,g=0,b=0;
  if (h<60){r=c;g=x;} else if (h<120){r=x;g=c;} else if (h<180){g=c;b=x;}
  else if (h<240){g=x;b=c;} else if (h<300){r=x;b=c;} else {r=c;b=x;}
  return gfx->color565(r*255, g*255, b*255);
}
// markPct places a highlight on the dot that matches the current value, so the
// colour ring says where you are rather than only what is available.
static void ring(int pct, uint16_t col, bool rainbow=false, int markPct=-1) {
  for (int a = -220; a < 40; a += 5) {
    float r = a * PI / 180.0f;
    int x = 120 + cosf(r)*108, y = 120 + sinf(r)*108;
    uint16_t c = rainbow ? hue565(((a+220)*360)/260)
                         : (((a+220)*100/260) <= pct ? col : C_DM);
    gfx->fillCircle(x, y, 4, c);
  }
  if (markPct >= 0) {
    float r = (-220 + markPct * 260 / 100) * PI / 180.0f;
    int x = 120 + cosf(r)*108, y = 120 + sinf(r)*108;
    gfx->fillCircle(x, y, 7, rainbow ? hue565(markPct * 360 / 100) : col);
    gfx->drawCircle(x, y, 8, C_TX);
    gfx->drawCircle(x, y, 9, C_TX);
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

static void draw() {
  gfx->fillScreen(C_BG);
  if (screen == SCR_SELECT) {
    centre("LIGHTS", 34, C_DM, 1);
    centre(G().name, 94, C_TX, 2);
    char s[40];
    if (G().count > 1) snprintf(s, sizeof(s), "%d lights", G().count);
    else snprintf(s, sizeof(s), "%s", G().kind==KIND_COLOUR?"colour":G().kind==KIND_DIMMABLE?"dimmable":"switch");
    centre(s, 124, C_AC, 1);
    snprintf(s, sizeof(s), "%d / %d", sel+1, GROUP_COUNT); centre(s, 148, C_DM, 1);
    arrowsHint("or turn", 182, C_DM);
    centre("tap to enter", 200, C_DM, 1);
    ring(sel*100/(GROUP_COUNT-1), C_AC);
  } else if (screen == SCR_BRIGHT) {
    centre(G().name, 40, C_DM, 1);
    char v[12]; snprintf(v, sizeof(v), "%d%%", (int)lroundf(lstar));
    centre(v, 88, power ? C_TX : C_DM, 4);
    centre(power ? "ON" : "OFF", 142, power ? C_ON : C_DM, 2);
    if (G().kind == KIND_COLOUR) arrowsHint("color", 186, C_DM);
    centre("press for on / off", 204, C_DM, 1);
    ring((int)lroundf(lstar), power ? C_AC : C_DM);
  } else {
    centre(G().name, 40, C_DM, 1);
    gfx->fillCircle(120, 102, 44, hue565(hue));
    gfx->drawCircle(120, 102, 44, C_TX);
    centre(hueName(hue), 158, C_TX, 2);
    arrowsHint("brightness", 186, C_DM);
    centre("press for on / off", 204, C_DM, 1);
    ring(0, C_AC, true, hue * 100 / 360);
  }
  if (netBusy) gfx->fillCircle(120, 26, 4, C_AC);   // quiet activity dot
  drawBuildStamp();
  dirty = false;
}
static void leds() {
  uint32_t c;
  if (screen == SCR_SELECT) c = rgb.Color(0, 30, 45);
  else if (screen == SCR_HUE) { uint16_t p = hue565(hue); c = rgb.Color(((p>>11)&31)*8, ((p>>5)&63)*4, (p&31)*8); }
  else c = power ? rgb.Color(lstar*2.2f, lstar*1.7f, 0) : rgb.Color(5,0,0);
  for (int i = 0; i < RGB_COUNT; i++) rgb.setPixelColor(i, c);
  rgb.show();
}

void setup() {
  Serial.begin(115200); delay(300);
  pinMode(PIN_DISP_PWR_A, OUTPUT); digitalWrite(PIN_DISP_PWR_A, HIGH);
  pinMode(PIN_DISP_PWR_B, OUTPUT); digitalWrite(PIN_DISP_PWR_B, HIGH);
  ledcAttach(PIN_LCD_BL, 5000, 8); ledcWrite(PIN_LCD_BL, 200);
  gfx->begin(); gfx->fillScreen(C_BG);
  rgb.begin(); rgb.setBrightness(50); rgb.clear(); rgb.show();
  if (!touch.begin()) Serial.println("touch: no response at 0x15");
  Serial.printf("touch: chip 0x%02X config %s (int-gated, filtered)\n", touch.chipId(), touch.configOk() ? "ok" : "MISMATCH");
  pinMode(PIN_ENC_A, INPUT_PULLUP); pinMode(PIN_ENC_B, INPUT_PULLUP);
  pinMode(PIN_ENC_SW, INPUT_PULLUP);
  encPrev = (digitalRead(PIN_ENC_A)<<1) | digitalRead(PIN_ENC_B);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), onEnc, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_B), onEnc, CHANGE);

  centre("connecting", 108, C_TX, 2);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis()-t0 < 20000) delay(200);
  configTzTime("PST8PDT,M3.2.0,M11.1.0", "pool.ntp.org");
  Serial.printf("wifi %s ip %s  %d groups\n", WiFi.status()==WL_CONNECTED?"ok":"FAILED",
                WiFi.localIP().toString().c_str(), GROUP_COUNT);
  xTaskCreatePinnedToCore(netTask, "net", 8192, nullptr, 1, nullptr, 0);
  dirty = true;
}

void loop() {
  static int32_t lastDet = 0;
  static uint32_t lastDetMs = 0;
  static int lastSw = HIGH;
  static bool touchBlocked = false;
  static uint32_t pressAt = 0;

  // ── rotation, accelerated ─────────────────────────────────────────────────
  int32_t now = detents();
  if (now != lastDet) {
    int32_t d = now - lastDet;
    uint32_t gap = millis() - lastDetMs;
    lastDet = now; lastDetMs = millis();
    if (screen == SCR_SELECT) {
      sel = (sel + (d > 0 ? 1 : -1) * min((int)labs(d), 3)) % GROUP_COUNT;
      if (sel < 0) sel += GROUP_COUNT;
    } else if (screen == SCR_BRIGHT) {
      int step = accelStep(gap, 100);
      lstar = constrain(lstar + d * step, 0.0f, 100.0f);
      wantBright(lstarToDps(lstar));
    } else {
      int step = accelStep(gap, 360);
      hue = (hue + d * step) % 360; if (hue < 0) hue += 360;
      wantHue(hue);
    }
    dirty = true;
  }

  // ── knob press: toggles power, and blocks touch while held ────────────────
  int sw = digitalRead(PIN_ENC_SW);
  if (sw != lastSw) {
    delay(12);
    if (digitalRead(PIN_ENC_SW) == sw) {
      lastSw = sw;
      if (sw == LOW) {
        pressAt = millis();
        touchBlocked = true;                 // pressing the knob presses the glass
        if (screen != SCR_SELECT) { power = !power; wantPower(power); dirty = true; }
      }
    }
  }
  // keep touch suppressed for a moment after release, while the glass settles
  if (sw == HIGH && touchBlocked && millis() - pressAt > 350) touchBlocked = false;

  // ── gestures from the controller, not from a stopwatch ───────────────────
  uint8_t g = touch.poll();
  if (g) Serial.printf("gesture 0x%02X %s  screen=%d  publish+%lums%s\n", g,
           g==G_CLICK?"tap":g==G_LEFT?"swipe L":g==G_RIGHT?"swipe R":
           g==G_LONG?"long":g==G_UP?"swipe U":g==G_DOWN?"swipe D":"?",
           (int)screen, touch.lastLatencyMs(), touchBlocked ? "  (blocked by press)" : "");
  if (touchBlocked) g = G_NONE;
  if (g == G_CLICK) {
    if (screen == SCR_SELECT) { screen = SCR_BRIGHT; wantRead(); }
    else                      { screen = SCR_SELECT; }
    dirty = true;
  } else if (g == G_LEFT || g == G_RIGHT) {
    if (screen == SCR_SELECT) {
      // Swiping through the list mirrors turning the knob: same axis, same
      // direction, so either hand movement does the obvious thing.
      sel += (g == G_RIGHT) ? 1 : -1;
      if (sel >= GROUP_COUNT) sel = 0;
      if (sel < 0) sel = GROUP_COUNT - 1;
      dirty = true;
    } else if (G().kind == KIND_COLOUR) {
      // Cycle what the knob adjusts. Only colour-capable groups have a second
      // mode, so elsewhere a swipe has nowhere to go and is ignored.
      screen = (screen == SCR_BRIGHT) ? SCR_HUE : SCR_BRIGHT;
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
    uint32_t t0 = millis();
    draw(); leds();
    uint32_t ms = millis() - t0;
    if (ms > 25) Serial.printf("draw took %lu ms\n", ms);
  }
  delay(3);
}

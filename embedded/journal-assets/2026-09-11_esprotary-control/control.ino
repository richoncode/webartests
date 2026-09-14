// espRotary — light control for SmartLife/Tuya bulbs over the LAN.
//
//   SELECT      rotate to browse groups, press to enter
//   BRIGHTNESS  rotate to dim, touch to toggle, press to go back,
//               long-touch to enter hue (colour-capable groups only)
//   HUE         rotate to change hue, long-touch back to brightness,
//               press to go back to select
//
// Lights are grouped by the numeric suffix on their name, folding case, so
// "Bar 1/2/3" is one group and "Back Porch 1" joins "Back porch 2".
//
// Nothing leaves the LAN. See tuya.h for the one rule that matters: a bulb
// accepts a single local connection and must keep it.

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

Arduino_DataBus *bus = new Arduino_ESP32SPI(PIN_LCD_DC, PIN_LCD_CS, PIN_LCD_SCLK, PIN_LCD_MOSI, GFX_NOT_DEFINED);
Arduino_GFX     *gfx = new Arduino_GC9A01(bus, PIN_LCD_RST, 0, true);
Adafruit_NeoPixel rgb(RGB_COUNT, PIN_RGB, NEO_GRB + NEO_KHZ800);

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
static int32_t detents() { return encPos / 4; }   // 4 quarter-steps per detent

// ── touch ───────────────────────────────────────────────────────────────────
static bool tpRead(bool &down) {
  uint8_t b[6];
  Wire.beginTransmission(TP_ADDR); Wire.write(0x02);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((int)TP_ADDR, 6) != 6) return false;
  Wire.readBytes(b, 6);
  down = (b[0] & 0x0F) != 0;
  return true;
}

// ── state ───────────────────────────────────────────────────────────────────
enum Screen { SCR_SELECT, SCR_BRIGHT, SCR_HUE };
Screen screen = SCR_SELECT;

int      sel = 0;                 // index into GROUPS
int32_t  detBase = 0;             // encoder datum for the current screen
int      brightness = 500;        // 10..1000
int      hue = 0;                 // 0..359
bool     power = false;
bool     dirty = true;            // redraw needed
uint32_t lastSend = 0;            // rate limit outbound commands
bool     pending = false;         // a value changed and has not been sent

TuyaDevice conns[8];              // one persistent connection per group member

static const LightGroup &G() { return GROUPS[sel]; }

// ── drawing ─────────────────────────────────────────────────────────────────
#define C_BG     RGB565_BLACK
#define C_TEXT   RGB565_WHITE
#define C_DIM    RGB565_DARKGREY
#define C_ACCENT RGB565_CYAN
#define C_ON     RGB565_GREEN
#define C_OFF    RGB565_DARKGREY

static void centre(const char *s, int y, uint16_t c, uint8_t sz) {
  gfx->setTextSize(sz); gfx->setTextColor(c);
  gfx->setCursor((240 - (int)strlen(s) * 6 * sz) / 2, y);
  gfx->print(s);
}

// A ring gauge around the rim: the panel is round, so the rim is free real estate.
static void ring(int pct, uint16_t col) {
  for (int a = -220; a < 40; a += 3) {
    bool lit = (a + 220) * 100 / 260 <= pct;
    float r = a * PI / 180.0f;
    int x = 120 + cos(r) * 108, y = 120 + sin(r) * 108;
    gfx->fillCircle(x, y, 4, lit ? col : C_DIM);
  }
}

static void drawSelect() {
  gfx->fillScreen(C_BG);
  centre("SELECT", 34, C_DIM, 1);
  const LightGroup &g = G();
  centre(g.name, 96, C_TEXT, 2);
  char sub[40];
  if (g.count > 1) snprintf(sub, sizeof(sub), "%d lights", g.count);
  else             snprintf(sub, sizeof(sub), "%s", g.kind == KIND_COLOUR ? "colour" :
                                                    g.kind == KIND_DIMMABLE ? "dimmable" : "switch");
  centre(sub, 126, C_ACCENT, 1);
  char pos[16]; snprintf(pos, sizeof(pos), "%d / %d", sel + 1, GROUP_COUNT);
  centre(pos, 150, C_DIM, 1);
  centre("press to enter", 186, C_DIM, 1);
  ring((sel * 100) / (GROUP_COUNT - 1), C_ACCENT);
}

static void drawBright() {
  gfx->fillScreen(C_BG);
  centre(G().name, 40, C_DIM, 1);
  char v[12]; snprintf(v, sizeof(v), "%d%%", brightness / 10);
  centre(v, 92, power ? C_TEXT : C_OFF, 4);
  centre(power ? "ON" : "OFF", 144, power ? C_ON : C_OFF, 2);
  centre(G().kind == KIND_COLOUR ? "touch toggle - hold for hue" : "touch to toggle", 188, C_DIM, 1);
  ring(brightness / 10, power ? C_ACCENT : C_DIM);
}

static uint16_t hue565(int h) {                 // simple HSV->RGB565 at full S,V
  float s = 1, v = 1, c = v * s, x = c * (1 - fabs(fmod(h / 60.0, 2) - 1));
  float r = 0, g = 0, b = 0;
  if (h < 60)      { r = c; g = x; }
  else if (h < 120){ r = x; g = c; }
  else if (h < 180){ g = c; b = x; }
  else if (h < 240){ g = x; b = c; }
  else if (h < 300){ r = x; b = c; }
  else             { r = c; b = x; }
  return gfx->color565((uint8_t)(r * 255), (uint8_t)(g * 255), (uint8_t)(b * 255));
}

static void drawHue() {
  gfx->fillScreen(C_BG);
  centre(G().name, 40, C_DIM, 1);
  gfx->fillCircle(120, 108, 42, hue565(hue));
  gfx->drawCircle(120, 108, 42, C_TEXT);
  char v[12]; snprintf(v, sizeof(v), "%d", hue);
  centre(v, 160, C_TEXT, 2);
  centre("hold to go back", 190, C_DIM, 1);
  for (int a = -220; a < 40; a += 3) {
    float r = a * PI / 180.0f;
    int h = ((a + 220) * 360) / 260;
    gfx->fillCircle(120 + cos(r) * 108, 120 + sin(r) * 108, 4, hue565(h));
  }
}

static void draw() {
  if (screen == SCR_SELECT) drawSelect();
  else if (screen == SCR_BRIGHT) drawBright();
  else drawHue();
  dirty = false;
}

// ── LED ring mirrors what the knob is doing ─────────────────────────────────
static void leds() {
  uint32_t c;
  if (screen == SCR_SELECT)      c = rgb.Color(0, 40, 60);
  else if (screen == SCR_HUE)    { uint16_t p = hue565(hue); c = rgb.Color(((p>>11)&31)*8, ((p>>5)&63)*4, (p&31)*8); }
  else                           c = power ? rgb.Color(brightness/8, brightness/10, 0) : rgb.Color(6,0,0);
  for (int i = 0; i < RGB_COUNT; i++) rgb.setPixelColor(i, c);
  rgb.show();
}

// ── sending ─────────────────────────────────────────────────────────────────
static void pushToGroup() {
  const LightGroup &g = G();
  for (int i = 0; i < g.count && i < 8; i++) {
    TuyaDevice &t = conns[i];
    t.configure(g.members[i].id, g.members[i].ip, g.members[i].key, g.members[i].ver);
    if (screen == SCR_HUE && g.members[i].kind == KIND_COLOUR) {
      char hsv[16]; snprintf(hsv, sizeof(hsv), "%04x03e803e8", hue);   // h,s,v hex
      t.setStr(21, "colour"); t.setStr(24, hsv);
    } else if (g.members[i].kind != KIND_SWITCH) {
      t.setInt(22, brightness);
    }
  }
}
static void pushPower() {
  const LightGroup &g = G();
  for (int i = 0; i < g.count && i < 8; i++) {
    TuyaDevice &t = conns[i];
    t.configure(g.members[i].id, g.members[i].ip, g.members[i].key, g.members[i].ver);
    t.setBool(g.members[i].kind == KIND_SWITCH ? 1 : 20, power);
  }
}
static void readGroup() {
  const LightGroup &g = G();
  TuyaDevice &t = conns[0];
  t.configure(g.members[0].id, g.members[0].ip, g.members[0].key, g.members[0].ver);
  JsonDocument d;
  if (!t.status(d)) return;
  JsonObject dps = d["dps"];
  if (dps["20"].is<bool>())      power = dps["20"];
  else if (dps["1"].is<bool>())  power = dps["1"];
  if (dps["22"].is<int>())       brightness = dps["22"];
}

void setup() {
  Serial.begin(115200); delay(300);
  pinMode(PIN_DISP_PWR_A, OUTPUT); digitalWrite(PIN_DISP_PWR_A, HIGH);
  pinMode(PIN_DISP_PWR_B, OUTPUT); digitalWrite(PIN_DISP_PWR_B, HIGH);
  ledcAttach(PIN_LCD_BL, 5000, 8); ledcWrite(PIN_LCD_BL, 200);
  gfx->begin(); gfx->fillScreen(C_BG);
  rgb.begin(); rgb.setBrightness(50); rgb.clear(); rgb.show();
  Wire.begin(PIN_TP_SDA, PIN_TP_SCL, 400000);

  pinMode(PIN_ENC_A, INPUT_PULLUP); pinMode(PIN_ENC_B, INPUT_PULLUP);
  pinMode(PIN_ENC_SW, INPUT_PULLUP);
  encPrev = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), onEnc, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_B), onEnc, CHANGE);

  centre("connecting", 110, C_TEXT, 2);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) delay(200);
  configTzTime("PST8PDT,M3.2.0,M11.1.0", "pool.ntp.org");
  Serial.printf("wifi %s  ip %s  %d groups\n",
                WiFi.status() == WL_CONNECTED ? "ok" : "FAILED",
                WiFi.localIP().toString().c_str(), GROUP_COUNT);
  detBase = detents();
  dirty = true;
}

void loop() {
  static int lastSw = HIGH;
  static bool wasDown = false;
  static uint32_t downAt = 0;
  static bool longFired = false;

  // ── rotation ──────────────────────────────────────────────────────────────
  int32_t d = detents() - detBase;
  if (d != 0) {
    detBase = detents();
    if (screen == SCR_SELECT) {
      sel = (sel + d) % GROUP_COUNT; if (sel < 0) sel += GROUP_COUNT;
    } else if (screen == SCR_BRIGHT) {
      brightness = constrain(brightness + d * 25, 10, 1000);
      pending = true;
    } else {
      hue = (hue + d * 6) % 360; if (hue < 0) hue += 360;
      pending = true;
    }
    dirty = true;
  }

  // ── touch: short toggles power, long switches mode ─────────────────────────
  bool down;
  if (tpRead(down)) {
    if (down && !wasDown) { downAt = millis(); longFired = false; }
    if (down && !longFired && millis() - downAt > 700) {
      longFired = true;
      if (screen == SCR_BRIGHT && G().kind == KIND_COLOUR) { screen = SCR_HUE; detBase = detents(); dirty = true; }
      else if (screen == SCR_HUE) { screen = SCR_BRIGHT; detBase = detents(); dirty = true; }
    }
    if (!down && wasDown && !longFired && screen != SCR_SELECT) {
      power = !power; pushPower(); dirty = true;
    }
    wasDown = down;
  }

  // ── knob press: forward from select, back from anywhere else ──────────────
  int sw = digitalRead(PIN_ENC_SW);
  if (sw != lastSw) {
    delay(15);
    if (digitalRead(PIN_ENC_SW) == sw) {
      if (sw == LOW) {
        if (screen == SCR_SELECT) { screen = SCR_BRIGHT; detBase = detents(); readGroup(); }
        else                      { screen = SCR_SELECT; detBase = detents(); }
        dirty = true;
      }
      lastSw = sw;
    }
  }

  // Rate-limited so a fast spin does not queue dozens of commands behind a
  // bulb that answers in a few hundred milliseconds.
  if (pending && millis() - lastSend > 120) { pushToGroup(); pending = false; lastSend = millis(); }

  if (dirty) { draw(); leds(); }
  delay(4);
}

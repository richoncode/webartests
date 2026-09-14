// CST816 touch characterization, driven from the screen.
//
// The chip classifies gestures in hardware — including long press — so the
// reliable design is to trust its verdict rather than stopwatch a polling loop.
// This confirms what it actually reports on this unit.
//
// Every step is shown on the panel and waits for the user. A dark screen leaves
// no way to tell flashing from running from waiting.

#include <Arduino.h>
#include <Wire.h>
#include <Arduino_GFX_Library.h>
#include "pins.h"

Arduino_DataBus *bus = new Arduino_ESP32SPI(PIN_LCD_DC, PIN_LCD_CS, PIN_LCD_SCLK, PIN_LCD_MOSI, GFX_NOT_DEFINED);
Arduino_GFX     *gfx = new Arduino_GC9A01(bus, PIN_LCD_RST, 0, true);

#define C_BG RGB565_BLACK
#define C_TX RGB565_WHITE
#define C_DM RGB565_DARKGREY
#define C_AC RGB565_CYAN
#define C_OK RGB565_GREEN

static uint8_t rd(uint8_t r) {
  Wire.beginTransmission(TP_ADDR); Wire.write(r);
  if (Wire.endTransmission(false)) return 0xFF;
  if (Wire.requestFrom((int)TP_ADDR, 1) != 1) return 0xFF;
  return Wire.read();
}
static bool rdN(uint8_t r, uint8_t *b, uint8_t n) {
  Wire.beginTransmission(TP_ADDR); Wire.write(r);
  if (Wire.endTransmission(false)) return false;
  if (Wire.requestFrom((int)TP_ADDR, (int)n) != n) return false;
  Wire.readBytes(b, n); return true;
}
static void wr(uint8_t r, uint8_t v) {
  Wire.beginTransmission(TP_ADDR); Wire.write(r); Wire.write(v); Wire.endTransmission();
}
static const char *gname(uint8_t g) {
  switch (g) { case 0x01: return "SWIPE DOWN"; case 0x02: return "SWIPE UP";
    case 0x03: return "SWIPE LEFT"; case 0x04: return "SWIPE RIGHT";
    case 0x05: return "SINGLE CLICK"; case 0x0B: return "DOUBLE CLICK";
    case 0x0C: return "LONG PRESS"; default: return ""; }
}
static void centre(const char *s, int y, uint16_t c, uint8_t sz) {
  gfx->setTextSize(sz); gfx->setTextColor(c);
  gfx->setCursor((240 - (int)strlen(s) * 6 * sz) / 2, y); gfx->print(s);
}
static void wrap(const char *s, int y, uint16_t c, uint8_t sz, int per) {
  char line[40]; int n = strlen(s), i = 0;
  while (i < n) {
    int take = min(per, n - i);
    if (take == per) { int b = take; while (b > 0 && s[i+b] != ' ') b--; if (b > per/2) take = b; }
    memcpy(line, s + i, take); line[take] = 0;
    while (take && line[take-1] == ' ') line[--take] = 0;
    centre(line, y, c, sz); y += 8 * sz + 3; i += take;
    while (i < n && s[i] == ' ') i++;
  }
}

volatile uint32_t irqCount = 0;
void IRAM_ATTR onIrq() { irqCount++; }

static int step = 0, stepCount = 4;
static void prompt(const char *title, const char *what) {
  gfx->fillScreen(C_BG);
  char h[24]; snprintf(h, sizeof(h), "STEP %d of %d", step, stepCount);
  centre(h, 40, C_DM, 1);
  wrap(title, 62, C_AC, 2, 13);
  wrap(what, 112, C_TX, 1, 26);
  centre("waiting for you", 196, C_DM, 1);
  Serial.printf("\n--- STEP %d/%d  %s :: %s\n", step, stepCount, title, what);
}
static void result(const char *line1, const char *line2, bool ok) {
  gfx->fillScreen(C_BG);
  centre(ok ? "SEEN" : "NOTHING", 78, ok ? C_OK : RGB565_ORANGE, 3);
  wrap(line1, 126, C_TX, 1, 26);
  if (line2 && *line2) wrap(line2, 156, C_DM, 1, 26);
  Serial.printf("    %s | %s\n", line1, line2 ? line2 : "");
  delay(1800);
}

// Waits for the chip to report one of the wanted gestures, showing live state.
static uint8_t awaitGesture(uint8_t wantA, uint8_t wantB, uint32_t timeout,
                            uint32_t &heldMs, bool &flickered) {
  uint8_t b[7]; uint32_t t0 = millis(), downAt = 0; heldMs = 0; flickered = false;
  bool wasDown = false; uint8_t got = 0;
  while (millis() - t0 < timeout) {
    if (rdN(0x00, b, 7)) {
      uint8_t g = b[1], f = b[2];
      if (f && !wasDown) downAt = millis();
      if (!f && wasDown && downAt && millis() - downAt < 120) flickered = true;
      if (f && downAt) heldMs = millis() - downAt;
      wasDown = f;
      // live readout so the panel is never blank while it waits
      gfx->fillRect(0, 168, 240, 26, C_BG);
      char s[40]; snprintf(s, sizeof(s), "%s  f%d  %lums", gname(g)[0] ? gname(g) : "-", f, heldMs);
      centre(s, 172, C_DM, 1);
      if (g == wantA || (wantB && g == wantB)) { got = g; break; }
    }
    delay(8);
  }
  return got;
}

void setup() {
  Serial.begin(115200); delay(300);
  pinMode(PIN_DISP_PWR_A, OUTPUT); digitalWrite(PIN_DISP_PWR_A, HIGH);
  pinMode(PIN_DISP_PWR_B, OUTPUT); digitalWrite(PIN_DISP_PWR_B, HIGH);
  ledcAttach(PIN_LCD_BL, 5000, 8); ledcWrite(PIN_LCD_BL, 200);
  gfx->begin(); gfx->fillScreen(C_BG);
  centre("starting", 108, C_TX, 2);

  pinMode(PIN_TP_RST, OUTPUT);
  digitalWrite(PIN_TP_RST, LOW);  delay(20);
  digitalWrite(PIN_TP_RST, HIGH); delay(80);
  Wire.begin(PIN_TP_SDA, PIN_TP_SCL, 400000); delay(20);
  pinMode(PIN_TP_INT, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_TP_INT), onIrq, FALLING);

  uint8_t id = rd(0xA7), lp0 = rd(0xFC);
  wr(0xEC, 0x07);          // double click + continuous U/D + L/R
  wr(0xFA, 0x60);          // EnChange | EnMotion — already the default here
  wr(0xFC, 0x08);          // long-press threshold, default 0x3C is far too long
  delay(20);
  Serial.printf("CST816 id 0x%02X  LongPressTime %02X -> %02X  MotionMask %02X  IrqCtl %02X\n",
                id, lp0, rd(0xFC), rd(0xEC), rd(0xFA));

  gfx->fillScreen(C_BG);
  char s[40]; snprintf(s, sizeof(s), "chip 0x%02X", id);
  centre("TOUCH PROBE", 78, C_AC, 2);
  centre(s, 116, C_TX, 1);
  centre("follow the steps", 150, C_DM, 1);
  delay(2200);

  uint32_t held; bool flick; uint8_t g;

  step = 1; prompt("Tap", "Tap the glass once, quickly.");
  g = awaitGesture(0x05, 0, 25000, held, flick);
  { char a[48]; snprintf(a, sizeof(a), g ? "gesture 0x%02X %s" : "no gesture reported", g, gname(g));
    result(a, g == 0x05 ? "chip reports taps natively" : "tap not classified", g != 0); }

  step = 2; prompt("Hold", "Press and hold until it reacts.");
  g = awaitGesture(0x0C, 0, 25000, held, flick);
  { char a[48], b2[48];
    snprintf(a, sizeof(a), g ? "gesture 0x%02X %s" : "no long press reported", g, gname(g));
    snprintf(b2, sizeof(b2), "fired at %lu ms%s", held, flick ? " - contact flickered" : "");
    result(a, b2, g == 0x0C); }

  step = 3; prompt("Hold again", "Hold once more, to time it twice.");
  g = awaitGesture(0x0C, 0, 25000, held, flick);
  { char a[48]; snprintf(a, sizeof(a), "fired at %lu ms", held);
    result(a, flick ? "contact flickered during hold" : "contact steady throughout", g == 0x0C); }

  step = 4; prompt("Swipe", "Swipe across the glass, any direction.");
  g = awaitGesture(0x01, 0x04, 25000, held, flick);
  if (!g) { uint32_t h2; bool f2; g = awaitGesture(0x02, 0x03, 1, h2, f2); }
  { char a[48]; snprintf(a, sizeof(a), g ? "gesture 0x%02X %s" : "no swipe reported", g, gname(g));
    result(a, "", g != 0); }

  gfx->fillScreen(C_BG);
  centre("DONE", 80, C_OK, 3);
  char s2[40]; snprintf(s2, sizeof(s2), "%lu interrupts on GPIO5", irqCount);
  centre(s2, 130, C_TX, 1);
  centre("touch to run again", 160, C_DM, 1);
  Serial.printf("\n=== done. %lu interrupts on GPIO5 ===\n", irqCount);
}

void loop() {
  uint8_t b[7];
  if (rdN(0x00, b, 7) && b[2]) { delay(400); ESP.restart(); }
  delay(20);
}

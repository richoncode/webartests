// Guided self-test for the CrowPanel 1.28" rotary display.
//
// Each test puts its instruction on the screen, waits for you to do it, and
// advances on its own when the goal is met. Everything is mirrored to serial so
// there is a transcript afterwards. Nothing here is a library demo: the point is
// to confirm each peripheral against the wiki's pin map, one at a time.
//
// Order is deliberate — the display is proven first, because every later test
// uses it to tell you what to do.
//
// Board: ESP32S3 Dev Module, 16 MB, OPI PSRAM, USB CDC on boot, Huge APP.

#include <Arduino.h>
#include <Wire.h>
#include <Arduino_GFX_Library.h>
#include <Adafruit_NeoPixel.h>
#include "pins.h"

Arduino_DataBus *bus = new Arduino_ESP32SPI(PIN_LCD_DC, PIN_LCD_CS, PIN_LCD_SCLK, PIN_LCD_MOSI, GFX_NOT_DEFINED);
Arduino_GFX     *gfx = new Arduino_GC9A01(bus, PIN_LCD_RST, 0 /* rotation */, true /* IPS */);
Adafruit_NeoPixel rgb(RGB_COUNT, PIN_RGB, NEO_GRB + NEO_KHZ800);

// ── encoder, interrupt driven ───────────────────────────────────────────────
volatile int32_t  encPos = 0;
volatile uint32_t encEdges = 0, encMissed = 0;
volatile uint8_t  encPrev = 0;
static const int8_t QTABLE[16] = { 0,-1,+1,0, +1,0,0,-1, -1,0,0,+1, 0,+1,-1,0 };

void IRAM_ATTR onEncEdge() {
  uint8_t s = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  int8_t step = QTABLE[(encPrev << 2) | s];
  if (step == 0 && s != encPrev) encMissed++;
  else if (step != 0) { encPos += step; encEdges++; }
  encPrev = s;
}

// ── screen furniture ────────────────────────────────────────────────────────
#define C_BG    RGB565_BLACK
#define C_TITLE RGB565_CYAN
#define C_TEXT  RGB565_WHITE
#define C_DIM   RGB565_LIGHTGREY
#define C_OK    RGB565_GREEN
#define C_WARN  RGB565_ORANGE

static int  testIndex = 0, testCount = 0;
static bool anyFailed = false;

// The panel is a 240 px circle, so text has to stay inside a centered box or the
// corners clip it. Roughly 170 px of usable width at the middle.
static void centerText(const char *s, int y, uint16_t color, uint8_t size) {
  gfx->setTextSize(size);
  gfx->setTextColor(color);
  int16_t w = strlen(s) * 6 * size;
  gfx->setCursor((240 - w) / 2, y);
  gfx->print(s);
}

static void wrapText(const char *s, int y, uint16_t color, uint8_t size, int maxChars) {
  char line[40]; int n = strlen(s), i = 0;
  while (i < n) {
    int take = min(maxChars, n - i);
    if (take == maxChars) {                    // back up to a space
      int b = take;
      while (b > 0 && s[i + b] != ' ' && s[i + b - 1] != ' ') b--;
      if (b > maxChars / 2) take = b;
    }
    memcpy(line, s + i, take); line[take] = 0;
    while (take && line[take - 1] == ' ') line[--take] = 0;
    centerText(line, y, color, size);
    y += 8 * size + 3;
    i += take;
    while (i < n && s[i] == ' ') i++;
  }
}

static void drawStep(const char *title, const char *instruction, const char *hint) {
  gfx->fillScreen(C_BG);
  char hdr[24]; snprintf(hdr, sizeof(hdr), "TEST %d of %d", testIndex, testCount);
  centerText(hdr, 42, C_DIM, 1);
  wrapText(title, 62, C_TITLE, 2, 13);
  wrapText(instruction, 112, C_TEXT, 1, 26);
  if (hint && *hint) wrapText(hint, 170, C_DIM, 1, 26);
  Serial.printf("\n--- TEST %d/%d  %s\n    %s\n", testIndex, testCount, title, instruction);
}

static void drawResult(bool ok, const char *detail) {
  gfx->fillScreen(C_BG);
  centerText(ok ? "PASS" : "CHECK", 90, ok ? C_OK : C_WARN, 4);
  wrapText(detail, 140, C_TEXT, 1, 26);
  Serial.printf("    %s — %s\n", ok ? "PASS" : "CHECK", detail);
  if (!ok) anyFailed = true;
  delay(1600);
}

// Waits for cond() to come true. Returns false on timeout.
static bool waitFor(bool (*cond)(), uint32_t timeoutMs, void (*tick)() = nullptr) {
  uint32_t t0 = millis(), lastTick = 0;
  while (millis() - t0 < timeoutMs) {
    if (cond()) return true;
    if (tick && millis() - lastTick > 60) { tick(); lastTick = millis(); }
    delay(5);
  }
  return false;
}

// ── progress ring, drawn while a rotation test is running ───────────────────
static int32_t  ringBase = 0;
static int32_t  ringTarget = 0;
static void drawRing() {
  int32_t done = abs(encPos - ringBase);
  int pct = ringTarget ? (int)min((int32_t)100, done * 100 / ringTarget) : 0;
  gfx->fillRect(0, 196, 240, 24, C_BG);
  char s[32]; snprintf(s, sizeof(s), "%ld / %ld detents", (long)(done / 4), (long)(ringTarget / 4));
  centerText(s, 200, pct >= 100 ? C_OK : C_TEXT, 1);
  int barW = 160 * pct / 100;
  gfx->drawRect(40, 214, 160, 6, C_DIM);
  gfx->fillRect(40, 214, barW, 6, pct >= 100 ? C_OK : C_TITLE);
}

// ── the tests ───────────────────────────────────────────────────────────────
static bool rotReached() { return abs(encPos - ringBase) >= ringTarget; }

static void testRotate(const char *title, const char *instr, int detents, int sign) {
  drawStep(title, instr, "turn steadily");
  ringBase = encPos; ringTarget = detents * 4;
  uint32_t e0 = encEdges, m0 = encMissed, t0 = millis();
  bool ok = waitFor(rotReached, 25000, drawRing);
  uint32_t ms = millis() - t0;
  int32_t delta = encPos - ringBase;
  uint32_t edges = encEdges - e0, missed = encMissed - m0;
  bool rightWay = sign > 0 ? delta > 0 : delta < 0;
  char d[80];
  snprintf(d, sizeof(d), "%ld detents %s in %.1fs, %lu missed",
           (long)(labs(delta) / 4), rightWay ? "correct way" : "WRONG WAY", ms / 1000.0f, missed);
  drawResult(ok && rightWay && missed == 0, d);
  Serial.printf("    edges %lu  missed %lu  %.1f edges/s\n",
                edges, missed, ms ? edges * 1000.0f / ms : 0);
}

static bool swPressed()  { return digitalRead(PIN_ENC_SW) == LOW; }
static bool swReleased() { return digitalRead(PIN_ENC_SW) == HIGH; }

static uint8_t tpRead(uint8_t reg, uint8_t *buf, uint8_t n) {
  Wire.beginTransmission(TP_ADDR); Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return 0;
  return Wire.requestFrom((int)TP_ADDR, (int)n) == n ? (Wire.readBytes(buf, n), n) : 0;
}
static volatile bool tpHit = false;
static int tpX = 0, tpY = 0;
static bool tpTouched() {
  uint8_t b[6];
  if (tpRead(0x02, b, 6) != 6) return false;
  if ((b[0] & 0x0F) == 0) return false;
  tpX = ((b[1] & 0x0F) << 8) | b[2];
  tpY = ((b[3] & 0x0F) << 8) | b[4];
  tpHit = true;
  return true;
}

void setup() {
  Serial.begin(115200);
  uint32_t t0 = millis();
  while (!Serial && millis() - t0 < 3000) delay(10);
  delay(300);
  Serial.println("\n\nespRotary — guided self-test");

  // Power rails first. Without these the panel is dark no matter what the SPI
  // pins are, which is exactly how the first attempt failed.
  pinMode(PIN_DISP_PWR_A, OUTPUT); digitalWrite(PIN_DISP_PWR_A, HIGH);
  pinMode(PIN_DISP_PWR_B, OUTPUT); digitalWrite(PIN_DISP_PWR_B, HIGH);
  pinMode(PIN_PWR_LED, OUTPUT);    digitalWrite(PIN_PWR_LED, LOW);
  delay(20);

  // Backlight is a PWM channel, not a plain output.
  ledcAttach(PIN_LCD_BL, 5000, 8);
  ledcWrite(PIN_LCD_BL, 200);

  if (!gfx->begin()) Serial.println("!! gfx->begin() failed");
  gfx->fillScreen(C_BG);

  pinMode(PIN_ENC_A, INPUT_PULLUP);
  pinMode(PIN_ENC_B, INPUT_PULLUP);
  pinMode(PIN_ENC_SW, INPUT_PULLUP);
  encPrev = (digitalRead(PIN_ENC_A) << 1) | digitalRead(PIN_ENC_B);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_A), onEncEdge, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_B), onEncEdge, CHANGE);

  rgb.begin(); rgb.setBrightness(40); rgb.clear(); rgb.show();
  Wire.begin(PIN_TP_SDA, PIN_TP_SCL, 400000);

  testCount = 8;

  // 1 — display
  // This test used to print PASS unconditionally, which told us nothing: it
  // reported a healthy display while the screen was black. It now has to be
  // confirmed from the knob, so a dark panel fails it.
  testIndex = 1;
  for (int i = 0; i < 3; i++) {
    uint16_t c[3] = { RGB565_RED, RGB565_GREEN, RGB565_BLUE };
    const char *n[3] = { "RED", "GREEN", "BLUE" };
    gfx->fillScreen(c[i]); centerText(n[i], 108, RGB565_BLACK, 3); delay(500);
  }
  drawStep("Display", "Turn the knob a little to confirm you can read this.", "any direction");
  ringBase = encPos; ringTarget = 8;
  bool seen = waitFor(rotReached, 20000, drawRing);
  drawResult(seen, seen ? "panel, rails GPIO1/2 and PWM backlight all good"
                        : "not confirmed — screen unreadable or knob untouched");

  // 2..5 — rotation, each direction at two speeds
  testIndex = 2; testRotate("Turn CW slow", "Turn the knob CLOCKWISE, slowly, about 10 detents.", 10, +1);
  testIndex = 3; testRotate("Turn CW fast", "Now spin it CLOCKWISE fast, 20 detents.", 20, +1);
  testIndex = 4; testRotate("Turn CCW slow", "Turn COUNTER-CLOCKWISE, slowly, 10 detents.", 10, -1);
  testIndex = 5; testRotate("Turn CCW fast", "Now spin it COUNTER-CLOCKWISE fast, 20 detents.", 20, -1);

  // 6 — push button
  testIndex = 6;
  drawStep("Press the knob", "Push the knob straight down, then let go.", "GPIO41, unverified");
  bool p = waitFor(swPressed, 15000);
  bool r = p && waitFor(swReleased, 5000);
  drawResult(p && r, p ? (r ? "press and release seen on GPIO41"
                            : "press seen, release not")
                       : "no press seen — GPIO41 may be wrong");

  // 7 — touch
  testIndex = 7;
  drawStep("Touch the screen", "Tap the middle of the glass with one finger.", "CST816D at 0x15");
  bool t = waitFor(tpTouched, 15000);
  char td[64];
  if (t) snprintf(td, sizeof(td), "touch at x=%d y=%d", tpX, tpY);
  else   snprintf(td, sizeof(td), "no touch — check SDA6 SCL7 addr 0x15");
  drawResult(t, td);

  // 8 — LED ring
  testIndex = 8;
  drawStep("LED ring", "Watch the LEDs: red, then green, then blue.", "5x WS2812B on GPIO48");
  uint32_t cols[3] = { rgb.Color(255,0,0), rgb.Color(0,255,0), rgb.Color(0,0,255) };
  for (int c = 0; c < 3; c++) {
    for (int i = 0; i < RGB_COUNT; i++) { rgb.setPixelColor(i, cols[c]); rgb.show(); delay(120); }
    delay(400); rgb.clear(); rgb.show(); delay(200);
  }
  drawStep("LED ring", "Did all 5 light up in red, green and blue?", "press the knob for YES, wait for NO");
  bool led = waitFor(swPressed, 8000);
  if (led) waitFor(swReleased, 3000);
  drawResult(led, led ? "5x WS2812B on GPIO48 confirmed" : "not confirmed by you");

  // summary
  gfx->fillScreen(C_BG);
  centerText(anyFailed ? "SOME CHECKS" : "ALL PASS", 95, anyFailed ? C_WARN : C_OK, 2);
  char s[40]; snprintf(s, sizeof(s), "%lu edges, %lu missed", encEdges, encMissed);
  centerText(s, 130, C_TEXT, 1);
  centerText("turn knob to rerun", 155, C_DIM, 1);
  Serial.printf("\n=== finished. %s. %lu edges, %lu missed (%.2f%%) ===\n",
                anyFailed ? "Some checks need attention" : "All passed",
                encEdges, encMissed, encEdges + encMissed ? 100.0f * encMissed / (encEdges + encMissed) : 0.0f);
}

void loop() {
  static int32_t last = 0;
  if (abs(encPos - last) > 8) { last = encPos; ESP.restart(); }
  delay(20);
}

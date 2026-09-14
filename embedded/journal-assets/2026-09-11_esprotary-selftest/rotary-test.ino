// Rotary encoder characterization for the CrowPanel 1.28" rotary display.
//
// The stock firmware responds inconsistently to the knob. Before assuming why,
// this measures the encoder itself: every edge, in both directions, at whatever
// speed you care to turn it. The display is left alone entirely — if the signal
// is clean here, the fault is in the stock firmware's decoding, not the hardware.
//
// Two phases:
//   1. Pin discovery. Elecrow's wiki says A=45, B=42, SW=41, and none of that has
//      been checked. Every plausible GPIO is watched while you turn the knob, and
//      whichever ones move are reported.
//   2. Quadrature decode on PIN_A/PIN_B with a full 4x state machine, counting
//      invalid transitions — the signature of a missed edge.
//
// Board: ESP32S3 Dev Module, 16 MB flash, OPI PSRAM, USB CDC on boot.

#include <Arduino.h>

// ── phase 1 ────────────────────────────────────────────────────────────────
// Omitted deliberately: 0 (strapping), 19/20 (native USB D-/D+ — touching them
// drops the serial link), 26-37 (SPI flash and PSRAM), 43/44 (UART0),
// 46 (backlight; driving it as an input would blank the screen).
static const uint8_t CANDIDATES[] = {
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21,
  38, 39, 40, 41, 42, 45, 47, 48
};
static const int N_CAND = sizeof(CANDIDATES) / sizeof(CANDIDATES[0]);
static const uint32_t DISCOVER_MS = 12000;

// ── phase 2 ────────────────────────────────────────────────────────────────
#define PIN_A   45
#define PIN_B   42
#define PIN_SW  41

volatile int32_t  quarterSteps = 0;      // signed, 4 per detent on a typical encoder
volatile uint32_t validEdges   = 0;
volatile uint32_t invalidEdges = 0;      // both inputs changed between samples
volatile uint32_t lastEdgeUs   = 0;
volatile uint32_t minGapUs     = 0xFFFFFFFF;
volatile uint8_t  prevState    = 0;

// Standard quadrature table: index by (previous << 2) | current.
// 0 = no movement or an illegal jump, +1 = one way, -1 = the other.
static const int8_t QTABLE[16] = {
   0, -1, +1,  0,
  +1,  0,  0, -1,
  -1,  0,  0, +1,
   0, +1, -1,  0
};

void IRAM_ATTR onEdge() {
  uint8_t s = (digitalRead(PIN_A) << 1) | digitalRead(PIN_B);
  uint8_t idx = (prevState << 2) | s;
  int8_t step = QTABLE[idx];

  if (step == 0 && s != prevState) {
    // Both lines moved between samples: an edge was missed, or the contacts
    // bounced. This is the number that matters when the knob feels unreliable.
    invalidEdges++;
  } else if (step != 0) {
    quarterSteps += step;
    validEdges++;
    uint32_t now = micros();
    uint32_t gap = now - lastEdgeUs;
    if (lastEdgeUs && gap < minGapUs) minGapUs = gap;
    lastEdgeUs = now;
  }
  prevState = s;
}

static void discoverPins() {
  uint8_t  last[N_CAND];
  uint32_t changes[N_CAND];
  for (int i = 0; i < N_CAND; i++) {
    pinMode(CANDIDATES[i], INPUT_PULLUP);
    changes[i] = 0;
  }
  delay(50);
  for (int i = 0; i < N_CAND; i++) last[i] = digitalRead(CANDIDATES[i]);

  Serial.println("\n=== phase 1: pin discovery ===");
  Serial.printf("Turn the knob back and forth, and press it, for the next %lu seconds.\n",
                DISCOVER_MS / 1000);
  Serial.println("Watching: GPIO 1-18, 21, 38-42, 45, 47, 48\n");

  uint32_t start = millis(), lastDot = 0;
  while (millis() - start < DISCOVER_MS) {
    for (int i = 0; i < N_CAND; i++) {
      uint8_t v = digitalRead(CANDIDATES[i]);
      if (v != last[i]) { changes[i]++; last[i] = v; }
    }
    if (millis() - lastDot > 1000) { Serial.print("."); lastDot = millis(); }
  }

  Serial.println("\n\n  GPIO   transitions");
  bool any = false;
  for (int i = 0; i < N_CAND; i++) {
    if (changes[i] > 0) {
      Serial.printf("  %4d   %lu%s\n", CANDIDATES[i], changes[i],
                    (CANDIDATES[i] == PIN_A || CANDIDATES[i] == PIN_B || CANDIDATES[i] == PIN_SW)
                      ? "   <- matches the wiki" : "   <- NOT in the wiki pin map");
      any = true;
    }
  }
  if (!any) Serial.println("  none — nothing moved. Wrong pins, or the knob was not turned.");
  Serial.printf("\nDecoding will now use A=%d B=%d SW=%d.\n", PIN_A, PIN_B, PIN_SW);
}

void setup() {
  Serial.begin(115200);
  uint32_t t0 = millis();
  while (!Serial && millis() - t0 < 3000) delay(10);
  delay(300);
  Serial.println("\n\nespRotary — rotary encoder characterization");

  discoverPins();

  pinMode(PIN_A, INPUT_PULLUP);
  pinMode(PIN_B, INPUT_PULLUP);
  pinMode(PIN_SW, INPUT_PULLUP);
  prevState = (digitalRead(PIN_A) << 1) | digitalRead(PIN_B);
  attachInterrupt(digitalPinToInterrupt(PIN_A), onEdge, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_B), onEdge, CHANGE);

  Serial.println("\n=== phase 2: decoding ===");
  Serial.println("Turn slowly, then fast, then the other way. Each burst is summarized.");
  Serial.println("'missed' counts transitions where both lines moved at once.\n");
}

void loop() {
  static int32_t  burstStart = 0;
  static uint32_t burstT0 = 0, lastActivity = 0;
  static uint32_t burstValid0 = 0, burstInvalid0 = 0;
  static bool     inBurst = false;
  static int      lastSw = HIGH;
  static int32_t  reported = 0;

  noInterrupts();
  int32_t  pos = quarterSteps;
  uint32_t ve = validEdges, ie = invalidEdges, mg = minGapUs;
  interrupts();

  if (pos != reported) {
    if (!inBurst) {
      inBurst = true; burstStart = reported; burstT0 = millis();
      burstValid0 = ve; burstInvalid0 = ie;
    }
    reported = pos;
    lastActivity = millis();
  } else if (inBurst && millis() - lastActivity > 250) {
    int32_t  delta = pos - burstStart;
    uint32_t ms    = lastActivity - burstT0;
    uint32_t edges = ve - burstValid0;
    uint32_t bad   = ie - burstInvalid0;
    float    eps   = ms ? (edges * 1000.0f / ms) : 0;
    Serial.printf("%-4s %4ld quarter-steps (%5.1f detents)  in %5lu ms  "
                  "%6.1f edges/s  missed %lu%s\n",
                  delta > 0 ? "CW" : "CCW", (long)labs(delta), fabs(delta) / 4.0f,
                  ms, eps, bad, bad ? "   <-- dropped edges" : "");
    inBurst = false;
    noInterrupts(); minGapUs = 0xFFFFFFFF; interrupts();
    (void)mg;
  }

  int sw = digitalRead(PIN_SW);
  if (sw != lastSw) {
    delay(15);                                   // contact settle
    if (digitalRead(PIN_SW) == sw) {
      Serial.printf("button %s\n", sw == LOW ? "pressed" : "released");
      lastSw = sw;
    }
  }

  static uint32_t lastTotals = 0;
  if (millis() - lastTotals > 10000) {
    lastTotals = millis();
    Serial.printf("   totals: position %ld, valid edges %lu, missed %lu (%.2f%%)\n",
                  (long)pos, ve, ie, ve + ie ? 100.0f * ie / (ve + ie) : 0.0f);
  }
  delay(2);
}

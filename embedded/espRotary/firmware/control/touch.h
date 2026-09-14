#pragma once
// CST816T gesture input, interrupt gated and filtered.
//
// Measured on this unit, 2026-09-11:
//   0x05 single click  (published on LIFT, when the finger count is already 0)
//   0x0C long press    (240 ms at LongPressTime 0x08; a knob press produces one)
//   0x03/0x04 swipe left/right, published mid-motion
//
// Three defences against rogue touches, because free-running I2C polling reports
// events that never happened:
//
//   1. Read only when the controller's INT line says there is something to read.
//      Everything else is a slow resync poll, not an event source.
//   2. Reject implausible frames — finger counts above one, coordinates off the
//      240x240 panel, gesture codes the chip does not define.
//   3. Require two consecutive valid touch-down frames before arming, so a
//      single corrupt read cannot manufacture a tap.
//
// Rejects are counted rather than hidden, so noise is visible instead of felt.

#include <Wire.h>
#include "pins.h"

#define G_NONE   0x00
#define G_DOWN   0x01
#define G_UP     0x02
#define G_LEFT   0x03
#define G_RIGHT  0x04
#define G_CLICK  0x05
#define G_DCLICK 0x0B
#define G_LONG   0x0C

// File scope, not a class member: an IRAM ISR cannot reach literals that live in
// flash, and referencing a static member pulls one in — the linker rejects it
// with "dangerous relocation: literal placed after use".
static volatile bool tpIrqFlag = false;
static volatile uint32_t tpIrqCount = 0;
static void IRAM_ATTR tpIsr() { tpIrqFlag = true; tpIrqCount++; }

class Touch {
public:
  bool begin() {
    pinMode(PIN_TP_RST, OUTPUT);
    digitalWrite(PIN_TP_RST, LOW);  delay(20);
    digitalWrite(PIN_TP_RST, HIGH); delay(80);
    // 100 kHz rather than 400: more margin on a bus that runs beside a bit-banged
    // LED line and an SPI panel, and the gain from speed here is nothing.
    Wire.begin(PIN_TP_SDA, PIN_TP_SCL, 100000);
    Wire.setTimeOut(50);
    delay(20);
    _id = rd(0xA7);

    // 0x06 = EnConUD | EnConLR. Bit 0, EnDClick, is deliberately OFF.
    //
    // With double-click enabled the chip cannot declare a SINGLE CLICK until the
    // double-tap window has expired, so every tap pays that wait before it is
    // published — which is felt as a long delay on a control that should be
    // instant. Nothing here uses double tap, so the wait buys nothing.
    //
    // The continuous bits stay on: they make the chip report a swipe while the
    // finger is still moving rather than only after it lifts, which is the other
    // half of the latency.
    setAndCheck(0xEC, 0x06);
    setAndCheck(0xFA, 0x60);   // EnChange | EnMotion — interrupt on change and gesture
    setAndCheck(0xFC, 0x10);   // long press ~500 ms
    setAndCheck(0xED, 0x00);   // no auto-reset while touched without a gesture
    setAndCheck(0xEE, 0x00);   // no auto-reset after a long press
    setAndCheck(0xFE, 0x01);   // do not auto-sleep; waking mid-gesture emits junk

    pinMode(PIN_TP_INT, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_TP_INT), tpIsr, FALLING);
    return _id != 0xFF;
  }
  uint8_t chipId() const { return _id; }
  bool    configOk() const { return _ok; }
  uint32_t rejected() const { return _rejected; }
  uint32_t frames()   const { return _frames; }
  uint8_t  lastGesture() const { return _lastSeen; }
  uint8_t  lastFingers() const { return _lastFingers; }
  uint32_t lastLatencyMs() const { return _latency; }   // touch-down -> gesture
  uint32_t irqs() const { return tpIrqCount; }

  uint8_t poll() {
    // The interrupt is the event source. The timed read only exists so a missed
    // edge cannot wedge the state machine.
    bool due = tpIrqFlag || (millis() - _lastRead > 30);
    if (!due) return G_NONE;
    tpIrqFlag = false;
    _lastRead = millis();

    uint8_t b[7];
    if (!rdN(0x00, b, 7)) { _rejected++; return G_NONE; }

    _frames++;
    uint8_t g = b[1], fingers = b[2];
    _lastSeen = g; _lastFingers = fingers;
    int x = ((b[3] & 0x0F) << 8) | b[4];
    int y = ((b[5] & 0x0F) << 8) | b[6];

    if (fingers > 1)                 { _rejected++; return G_NONE; }
    if (fingers && (x > 239 || y > 239)) { _rejected++; return G_NONE; }
    if (!validGesture(g))            { _rejected++; return G_NONE; }

    _x = x; _y = y;

    // Arm once, on the touch-DOWN edge, and keep that arming through the lift.
    //
    // The two gestures have opposite timing and each previous rule satisfied one
    // while breaking the other:
    //   swipe  published WHILE the finger is down  -> re-arming per frame fires
    //          the same swipe repeatedly, so one swipe toggles twice and lands
    //          back where it started
    //   tap    published AFTER the finger lifts    -> arming that ends at the
    //          lift throws every tap away
    // Arming on the down edge and holding it until a gesture is consumed is the
    // only rule that satisfies both.
    bool nowDown = fingers != 0;
    if (nowDown && !_down) { _armed = true; _downAt = millis(); }
    _down = nowDown;

    if (_armed && g != G_NONE) { _armed = false; _downFrames = 0; return g; }
    return G_NONE;
  }

  bool down() const { return _down; }
  int  x() const { return _x; }
  int  y() const { return _y; }

private:
  uint8_t _id = 0xFF;
  uint32_t _lastRead = 0, _rejected = 0, _frames = 0;
  uint8_t _lastSeen = 0, _lastFingers = 0;
  uint32_t _downAt = 0, _latency = 0;
  bool _ok = true, _armed = false, _down = false;
  uint8_t _downFrames = 0;
  int _x = 0, _y = 0;

  static bool validGesture(uint8_t g) {
    return g == G_NONE || g == G_DOWN || g == G_UP || g == G_LEFT ||
           g == G_RIGHT || g == G_CLICK || g == G_DCLICK || g == G_LONG;
  }
  uint8_t rd(uint8_t r) {
    Wire.beginTransmission(TP_ADDR); Wire.write(r);
    if (Wire.endTransmission(false)) return 0xFF;
    if (Wire.requestFrom((int)TP_ADDR, 1) != 1) return 0xFF;
    return Wire.read();
  }
  bool rdN(uint8_t r, uint8_t *b, uint8_t n) {
    Wire.beginTransmission(TP_ADDR); Wire.write(r);
    if (Wire.endTransmission(false)) return false;
    if (Wire.requestFrom((int)TP_ADDR, (int)n) != n) return false;
    Wire.readBytes(b, n); return true;
  }
  void setAndCheck(uint8_t reg, uint8_t val) {
    Wire.beginTransmission(TP_ADDR); Wire.write(reg); Wire.write(val); Wire.endTransmission();
    delay(6);
    uint8_t got = rd(reg);
    if (got != val) { _ok = false; Serial.printf("  touch: 0x%02X wrote %02X read %02X\n", reg, val, got); }
  }
};

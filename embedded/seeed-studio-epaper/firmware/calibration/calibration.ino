// Color and type calibration for the reTerminal E1002 (Spectra 6).
//
// The dashboard design assumes six colors that read distinctly, and that type
// stays legible on each of the colored bands. Screen previews flatter e-paper,
// so print this, photograph the panel, and correct the mockup palette against
// the photograph before writing any layout code.
//
// Board:   XIAO_ESP32S3   (esp32 package)
//          https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
// Library: Seeed_GFX      https://wiki.seeedstudio.com/reterminal_e10xx_with_arduino/

#include "driver.h"      // sets BOARD_SCREEN_COMBO where the library can see it
#include "TFT_eSPI.h"

EPaper epaper;

// Seeed_GFX is a TFT_eSPI fork; the wiki shows TFT_* names in its own example
// and GxEPD_* names in the color list. Running this sketch settles which the
// installed library exposes — if it will not compile, swap the right column.
#define C_BLACK   TFT_BLACK
#define C_WHITE   TFT_WHITE
#define C_RED     TFT_RED
#define C_GREEN   TFT_GREEN
#define C_BLUE    TFT_BLUE
#define C_YELLOW  TFT_YELLOW

struct Swatch { uint16_t color; const char* name; };
Swatch SWATCHES[] = {
  { C_BLACK,  "BLACK"  },
  { C_WHITE,  "WHITE"  },
  { C_RED,    "RED"    },
  { C_YELLOW, "YELLOW" },
  { C_BLUE,   "BLUE"   },
  { C_GREEN,  "GREEN"  },
};
const int N_SWATCH = sizeof(SWATCHES) / sizeof(SWATCHES[0]);

// The pairings the dashboard actually uses, so legibility is tested as designed
// rather than in the abstract.
struct Pair { uint16_t bg; uint16_t fg; const char* label; };
Pair PAIRS[] = {
  { C_BLUE,   C_WHITE,  "header  blue/white"  },
  { C_YELLOW, C_BLACK,  "peak    yellow/black"},
  { C_GREEN,  C_WHITE,  "sun     green/white" },
  { C_RED,    C_WHITE,  "bins    red/white"   },
  { C_WHITE,  C_BLACK,  "body    white/black" },
  { C_WHITE,  C_RED,    "alert   white/red"   },
};
const int N_PAIR = sizeof(PAIRS) / sizeof(PAIRS[0]);

void setup() {
  Serial.begin(115200);
  epaper.begin();
  epaper.setRotation(0);
  epaper.fillScreen(C_WHITE);

  // ── Row 1: the six colors as solid blocks, 800/6 wide ──────────────────
  const int sw = 800 / N_SWATCH, sh = 150;
  for (int i = 0; i < N_SWATCH; i++) {
    epaper.fillRect(i * sw, 0, sw, sh, SWATCHES[i].color);
    epaper.drawRect(i * sw, 0, sw, sh, C_BLACK);
    epaper.setTextColor(SWATCHES[i].color == C_BLACK ? C_WHITE : C_BLACK);
    epaper.setTextFont(2);
    epaper.drawString(SWATCHES[i].name, i * sw + 8, sh - 24);
  }

  // ── Row 2: each color as a thin rule, to see what survives at 2 px ──────
  int y = sh + 14;
  for (int i = 0; i < N_SWATCH; i++) {
    epaper.fillRect(20, y + i * 9, 360, 2, SWATCHES[i].color);
  }
  epaper.setTextColor(C_BLACK);
  epaper.setTextFont(2);
  epaper.drawString("2 px rules", 20, y + N_SWATCH * 9 + 4);

  // ── Row 3: type sizes in black, to pick a floor for body text ────────────
  int ty = y;
  epaper.setTextColor(C_BLACK);
  for (int f = 2; f <= 4; f++) {
    epaper.setTextFont(f);
    epaper.drawString("Peak 94 at 3:40 PM", 410, ty);
    ty += 12 + f * 8;
  }

  // ── Row 4: the dashboard's own color pairings ───────────────────────────
  int py = 300, ph = 28;
  for (int i = 0; i < N_PAIR; i++) {
    epaper.fillRect(20, py + i * (ph + 4), 760, ph, PAIRS[i].bg);
    epaper.drawRect(20, py + i * (ph + 4), 760, ph, C_BLACK);
    epaper.setTextColor(PAIRS[i].fg);
    epaper.setTextFont(2);
    epaper.drawString(PAIRS[i].label, 30, py + i * (ph + 4) + 6);
    epaper.setTextFont(4);
    epaper.drawString("BINS OUT TONIGHT 94\xB0", 260, py + i * (ph + 4) + 2);
  }

  epaper.update();          // one full refresh, 15-20 s
  Serial.println("calibration frame drawn");
}

void loop() {}

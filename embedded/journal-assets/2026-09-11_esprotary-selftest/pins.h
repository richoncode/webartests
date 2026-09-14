#pragma once
// CrowPanel 1.28" HMI ESP32 Rotary Display.
//
// From Elecrow's wiki. Confirmed so far by running the hardware:
// Every pin below was confirmed on the hardware by selftest.ino on 2026-09-11:
// display drew, both encoder directions counted, the button registered, touch
// returned coordinates, and all five LEDs lit. Nothing here is documentation.

// Two power rails the display needs held high the whole time it is running.
// Elecrow's example sets these before touching the panel; their wiki does not
// mention them at all, and without them the screen stays black however correct
// the SPI pins are.
#define PIN_DISP_PWR_A  1
#define PIN_DISP_PWR_B  2

#define PIN_LCD_SCLK   10
#define PIN_LCD_MOSI   11
#define PIN_LCD_DC      3
#define PIN_LCD_CS      9
#define PIN_LCD_RST    14
#define PIN_LCD_BL     46   // LEDC PWM, not digitalWrite

#define PIN_TP_SDA      6
#define PIN_TP_SCL      7
#define PIN_TP_INT      5
#define PIN_TP_RST     13
#define TP_ADDR      0x15   // CST816D

#define PIN_ENC_A      45
#define PIN_ENC_B      42
#define PIN_ENC_SW     41

#define PIN_RGB        48
#define RGB_COUNT       5

#define PIN_PWR_LED    40

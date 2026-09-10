#pragma once
// Seeed_GFX picks this file up via `#if __has_include("driver.h")` in
// User_Setup_Select.h, so the define reaches the library's own translation
// units as well as the sketch. Putting it in the .ino instead leaves EPaper
// undefined at link time.
#define BOARD_SCREEN_COMBO 521   // reTerminal E1002 (UC8179C), 6-color Spectra

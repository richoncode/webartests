# reTerminal E1002 — peripheral and pin map

Pin assignments from Seeed's ESPHome cookbook for the reTerminal E Series:
https://wiki.seeedstudio.com/reterminal_e10xx_with_esphome_advanced/
Specification table from the E Series overview:
https://wiki.seeedstudio.com/reterminal_e10xx_main_page/

| Peripheral | Pin(s) | Notes |
|---|---|---|
| Button — green | GPIO3 | programmable |
| Button — white, left | GPIO5 | programmable |
| Button — white, right | GPIO4 | programmable; Seeed recommends this one as the deep-sleep wake pin, so serial uploads stay possible during development |
| Buzzer | GPIO45 | PWM via ESPHome `ledc`, default 1000 Hz |
| Status LED | GPIO6 | inverted binary output (E1001/E1002) |
| Battery voltage | GPIO1 analog, enable on GPIO21 | calibration curve maps voltage to 0-100% |
| Temperature / humidity | SHT4x on I2C — SDA GPIO19, SCL GPIO20 | |
| microSD | — | up to 32 GB, FAT32 |
| Expansion header | 8-pin | UART / I2C / GPIO |
| Microphone | — | Seeed's spec table lists it as "reserved"; not confirmed on this unit |
| Capacitive touch | — | E1003 only (GT911). The E1002 has no touch. |

## Verified on this unit, 2026-09-06

    ESP32-S3 (QFN56) revision v0.2, dual core + LP core, 240 MHz
    8 MB embedded PSRAM (AP_3v3), 40 MHz crystal
    32 MB Winbond W25Q256 flash, quad I/O, 3.3 V
    base MAC e0:72:a1:f9:02:60

    partition table read from 0x8000:
      nvs       0x00009000  500 kB
      otadata   0x00086000    8 kB
      phy_init  0x00088000    4 kB
      app0      0x00090000   12 MB
      app1      0x00c90000   12 MB
      spiffs    0x01890000    6 MB

## Display

    7.3 in E Ink Spectra 6, 800 x 480
    six colours: black, white, red, yellow, blue, green
    full refresh 15-20 s; no partial refresh
    holds its last frame with no power

## Power

    2000 mAh battery, USB-C 5 V / 1 A
    ~3 months on a 6-hour refresh interval

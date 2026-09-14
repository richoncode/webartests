# espRotary — CrowPanel 1.28" HMI ESP32 Rotary Display

Working files for the Elecrow rotary knob display. Session-by-session progress lives in
[`../engineeringjournal.html`](../engineeringjournal.html).

## Device

| | |
|---|---|
| Product | [CrowPanel 1.28inch-HMI ESP32 Rotary Display](https://www.elecrow.com/crowpanel-1-28inch-hmi-esp32-rotary-display-240-240-ips-round-touch-knob-screen.html) |
| Display | 1.28" round IPS, 240 × 240, GC9A01 driver, SPI |
| Touch | CST816D capacitive, I²C |
| Input | rotary encoder with push, clockwise and counter-clockwise |
| Light | 5 × WS2812B addressable LEDs |
| SoC | ESP32-S3-N16R8 (QFN56) revision v0.2, dual core + LP core, 240 MHz |
| PSRAM | 8 MB embedded (AP_3v3) |
| Flash | 16 MB — JEDEC `ba` `4018`, quad I/O, 3.3 V |
| Wireless | 2.4 GHz Wi-Fi, Bluetooth 5.0 LE |
| Base MAC | `68:ee:8f:5d:b3:74` |
| USB | **native USB-Serial/JTAG** (`303a`), no bridge chip |
| Expansion | UART, I²C, FPC |

Elecrow's [wiki](https://www.elecrow.com/wiki/CrowPanel_1.28inch-HMI_ESP32_Rotary_Display.html)
and [GitHub repository](https://github.com/Elecrow-RD/CrowPanel-1.28inch-HMI-ESP32-Rotary-Display-240-240-IPS-Round-Touch-Knob-Screen)
carry the examples.

## Pin map

Every line confirmed on the hardware by `firmware/selftest` on 2026-09-11.

| Function | Pin |
|---|---|
| **Display power rails** | **`GPIO1` and `GPIO2`, both held HIGH** |
| Display SCLK | `GPIO10` |
| Display MOSI | `GPIO11` |
| Display DC | `GPIO3` |
| Display CS | `GPIO9` |
| Display RST | `GPIO14` |
| Backlight | `GPIO46`, LEDC PWM — not `digitalWrite` |
| Touch SDA / SCL | `GPIO6` / `GPIO7` |
| Touch INT / RST | `GPIO5` / `GPIO13` |
| Encoder A / B | `GPIO45` / `GPIO42` |
| Encoder push | `GPIO41` |
| WS2812B data | `GPIO48` (5 LEDs) |
| Power LED | `GPIO40` |

## The screen stays black without GPIO1 and GPIO2

Two power-enable rails have to be driven HIGH and held there the whole time the
panel is running:

```cpp
pinMode(1, OUTPUT); digitalWrite(1, HIGH);
pinMode(2, OUTPUT); digitalWrite(2, HIGH);
```

Elecrow's wiki does not mention them. They appear only in the example source in
[their GitHub repository](https://github.com/Elecrow-RD/CrowPanel-1.28inch-HMI-ESP32-Rotary-Display-240-240-IPS-Round-Touch-Knob-Screen/blob/master/example/Arduino/RotaryScreen_1_28/RotaryScreen_1_28.ino).
Without them the display is dark however correct the SPI pins are, and the SPI
pins in the wiki are correct. The backlight is a PWM channel as well, so
`digitalWrite(46, HIGH)` is not enough:

```cpp
ledcAttach(46, 5000, 8);
ledcWrite(46, 200);
```

## The encoder is clean; the stock firmware is not

The stock app responds inconsistently to the knob. The encoder is not the cause.
Driven by interrupts with a 4x quadrature state machine it produced **704 edges
with zero missed** across both directions at up to 571 edges/s, and a further
584 edges with zero missed through the guided self-test. Any inconsistency is in
how the application reads the pins — polling drops edges while the UI redraws.

## Serial

The board enumerates as `/dev/cu.usbmodem*` over native USB-Serial/JTAG — not
`/dev/cu.usbserial-*`, which is what a CH340 bridge produces. Two consequences:

- **Do not pass `--baud`.** There is no UART to reclock; it is USB CDC. Asking esptool for
  921600 killed a read after 20 kB with `Serial data stream stopped`. At the default it
  sustains ~1460 kbit/s, so 16 MB reads back in about 90 seconds.
- The node number changes between plug-ins. Discover it rather than hard-coding.

## Partition table

Read from `0x8000` on 2026-09-11:

| Name | Type/Sub | Offset | Size |
|---|---|---|---|
| `nvs` | 01/02 | `0x00009000` | 24 kB |
| `phy_init` | 01/01 | `0x0000f000` | 4 kB |
| `app0` | 00/00 | `0x00010000` | 16320 kB (factory, no OTA, no filesystem) |

A single factory app at the **default `0x10000`**, so `arduino-cli upload` writes to the
right place without the offset surgery the reTerminal E1002 needed.

## Firmware backups

`firmware-backup/` holds full-flash images with their SHA-256 checksums. Git ignores the
`.bin` files; the checksums are tracked. Mirror the images somewhere outside this checkout.

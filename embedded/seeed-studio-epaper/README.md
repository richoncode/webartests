# Seeed Studio reTerminal E1002

Working files for the full-color ePaper terminal on the bench. Session-by-session progress
lives in [`../engineeringjournal.html`](../engineeringjournal.html).

## Device

| | |
|---|---|
| Product | [Seeed Studio reTerminal E1002](https://www.seeedstudio.com/reTerminal-E1002-p-6533.html) |
| Display | 7.3" E Ink Spectra 6, full color, 800 × 480 |
| SoC | ESP32-S3R8 (QFN56), revision v0.2, dual core + LP core, 240 MHz |
| PSRAM | 8 MB embedded (AP_3v3) |
| Flash | 32 MB Winbond W25Q256 — JEDEC `ef` `4019`, quad I/O, 3.3 V |
| Wireless | Wi-Fi 4, Bluetooth 5.0 LE |
| Base MAC | `e0:72:a1:f9:02:60` |
| Power | USB-C 5 V / 1 A, 2000 mAh battery |
| Crystal | 40 MHz |

Seeed's [getting-started wiki](https://wiki.seeedstudio.com/getting_started_with_reterminal_e1002/)
and the [Zephyr board documentation](https://docs.zephyrproject.org/latest/boards/seeed/reterminal_e1002/doc/index.html)
cover the hardware.

## Peripherals

Pin assignments from Seeed's [ESPHome cookbook for the E Series](https://wiki.seeedstudio.com/reterminal_e10xx_with_esphome_advanced/).

| Peripheral | Pin(s) | Notes |
|---|---|---|
| Button — green | `GPIO3` | programmable |
| Button — white, left | `GPIO5` | programmable |
| Button — white, right | `GPIO4` | programmable; Seeed recommends it as the deep-sleep wake pin so serial uploads still work during development |
| Buzzer | `GPIO45` | PWM, ESPHome `ledc`, default 1000 Hz |
| Status LED | `GPIO6` | inverted binary output |
| Battery voltage | `GPIO1` analog, enable `GPIO21` | calibration curve maps voltage to 0–100% |
| Temperature / humidity | SHT4x on I²C — SDA `GPIO19`, SCL `GPIO20` | |
| microSD | — | up to 32 GB, FAT32 |
| Expansion header | 8-pin | UART / I²C / GPIO |

The specification lists the microphone as *reserved* rather than fitted. Capacitive touch (GT911)
belongs to the E1003; the E1002 has no touchscreen.

The panel takes 15–20 s for a full refresh and has no partial refresh, so plan around a schedule or
a button press rather than continuous update. It holds its last frame with no power.

## Partition table

Read from `0x8000` on 2026-09-06:

| Name | Type/Sub | Offset | Size |
|---|---|---|---|
| `nvs` | 01/02 | `0x00009000` | 500 kB |
| `otadata` | 01/00 | `0x00086000` | 8 kB |
| `phy_init` | 01/01 | `0x00088000` | 4 kB |
| `app0` | 00/10 | `0x00090000` | 12 MB |
| `app1` | 00/11 | `0x00c90000` | 12 MB |
| `spiffs` | 01/82 | `0x01890000` | 6 MB |

Two 12 MB OTA slots leave room for large image assets in the application itself, with 6 MB of
SPIFFS beside them.

## Serial

macOS enumerates the board as `/dev/cu.usbserial-210`. The USB descriptors report
`1A86:7523` — a WCH CH340 bridge, with the generic product string `USB Serial`.

The ESP32-S3 carries a native USB_SERIAL_JTAG peripheral, but Seeed routes the USB-C port
through the CH340 to UART0 instead, so the CH340 can drive the EN and BOOT pins and put the
board into flashing mode without a button press.

The application firmware writes nothing to UART0, and the board sleeps most of the time to
reach its quoted three-month battery life. A serial terminal therefore stays blank at every
baud rate — that is normal, not a fault. Reach the board with `esptool`, which drives its own
reset sequence into the ROM downloader.

## Toolchain

Install esptool into a local environment rather than the system Python:

```sh
python3 -m venv .venv
.venv/bin/pip install esptool
```

Run every operation at 115200. Short 256 kB test reads fail at every higher rate: 921600 loses
the chip immediately after the rate change, 460800 returns `Invalid head of packet`, and 230400
returns short packets (`expected 0x1000 bytes but received 0xfc7`).

Two further constraints decide how a read has to be issued, and they pull opposite ways:

- **Below 16 MB** the stub flasher corrupts roughly three reads in five. The ROM loader
  (`--no-stub`) read 64 consecutive 256 kB chunks without a single retry.
- **At and above 16 MB** the ROM loader refuses outright — `Can't access flash regions larger
  than 16MB` — because its flash addressing is 24-bit. Only the stub flasher can reach there.

So no single `esptool read-flash` invocation can capture all 32 MB. Use the chunked reader below,
which switches mode at the boundary on its own.

## Commands

Identify the board:

```sh
.venv/bin/esptool --port /dev/cu.usbserial-210 --chip esp32s3 chip-id
.venv/bin/esptool --port /dev/cu.usbserial-210 --chip esp32s3 flash-id
```

Back up the full 32 MB image (about 60 minutes; resumable if interrupted):

```sh
./tools/read-flash-chunked.py \
  --esptool .venv/bin/esptool \
  --port /dev/cu.usbserial-210 --chip esp32s3 \
  --baud 115200 --chunk 0x40000 --retries 10 \
  --out firmware-backup/<date>-reterminal-e1002-factory-32MB.bin
```

The reader keeps completed chunks in `<out>.bin.parts/`, so re-running the same command retries
only what is missing. Delete that directory once the assembled image is verified.

Write an image back:

```sh
.venv/bin/esptool --port /dev/cu.usbserial-210 --chip esp32s3 --baud 115200 \
  write-flash 0x0 firmware-backup/<image>.bin
```

## Building the firmware

```sh
cd firmware
./build.sh dashboard              # compile
./build.sh dashboard --upload     # compile and flash, after a confirmation prompt
```

Prerequisites, once:

```sh
brew install arduino-cli
arduino-cli config init
arduino-cli config add board_manager.additional_urls \
  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
arduino-cli core update-index && arduino-cli core install esp32:esp32
arduino-cli lib install ArduinoJson
git clone --depth 1 https://github.com/Seeed-Studio/Seeed_GFX.git \
  "$(arduino-cli config get directories.user)/libraries/Seeed_GFX"
cp dashboard/secrets.example.h dashboard/secrets.h   # then fill it in
```

Three things about this board that the wiki does not make obvious:

- **Do not build as `XIAO_ESP32S3`.** That profile offers only 8 MB of flash. This board has 32 MB
  with two 12 MB OTA slots and 6 MB of SPIFFS, so building as XIAO writes an 8 MB partition table
  and strands 24 MB. `build.sh` uses `esp32:esp32:esp32s3` with `FlashSize=32M,PSRAM=opi,
  PartitionScheme=custom`, and the `partitions.csv` beside each sketch reproduces the factory table.
- **`BOARD_SCREEN_COMBO` belongs in `driver.h`, not the `.ino`.** Seeed_GFX finds it through
  `#if __has_include("driver.h")`, so a define in the sketch never reaches the library's own
  translation units and `EPaper` goes undefined at link time.
- **The six colors are `TFT_*`, not `GxEPD_*`.** Combo 521 sets `USE_COLORFULL_EPAPER`, which
  defines `TFT_BLACK`, `TFT_WHITE`, `TFT_RED`, `TFT_YELLOW`, `TFT_BLUE` and `TFT_GREEN` and maps
  every other color name onto the nearest of them.

Verified with esp32 core 3.3.11, Seeed_GFX 2.0.3 and ArduinoJson 7.4.3: the dashboard builds to
1,145,691 bytes, 9.1% of the 12 MB `app0` slot.

## Firmware backups

`firmware-backup/` holds full-flash images alongside a `.sha256` checksum and a `.manifest.txt`
recording how each was captured, its partition table, and its verification results. Git ignores the
`.bin` files — 32 MB each is too much for a GitHub Pages repo — so mirror them somewhere outside
this checkout. The checksum and manifest are tracked, so a restored image can be verified against
the capture it claims to be.

Two images of the same board will not share a checksum. esptool hard-resets the board after every
operation, the firmware boots and writes NVS, and the `nvs` partition (`0x9000`–`0x86000`) changes
between reads. Compare regions outside `nvs` when checking one image against another.

A full-image restore returns the board to the exact state captured, including NVS, Wi-Fi
credentials, and any calibration data stored in flash. It does not touch eFuses.

## Flashing alternatives

- [Browser web-flasher](https://seeed-projects.github.io/OSHW-reTerminal-Series-E-D/) — Seeed's hosted flasher, no toolchain
- [ESPHome](https://wiki.seeedstudio.com/reterminal_e10xx_with_esphome/) — Home Assistant integration
- [Arduino](https://wiki.seeedstudio.com/reterminal_e10xx_with_arduino/) — Seeed's Arduino cookbook
- [Zephyr](https://docs.zephyrproject.org/latest/boards/seeed/reterminal_e1002/doc/index.html) — upstream board support

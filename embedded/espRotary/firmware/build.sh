#!/usr/bin/env bash
# Build (and optionally flash) a CrowPanel 1.28" rotary display sketch.
#
#   ./build.sh rotary-test              compile only
#   ./build.sh rotary-test --upload     compile and flash
#   ./build.sh rotary-test --monitor    compile, flash, then watch serial
#
# Unlike the reTerminal E1002, this board needs no offset surgery: its factory
# partition table puts the app at the default 0x10000, so arduino-cli writes
# where the bootloader looks.
#
# CDCOnBoot=cdc routes Serial over the native USB, which is the only serial this
# board has. USBMode=hwcdc keeps the USB-Serial/JTAG peripheral rather than
# TinyUSB, so esptool can still reset it.
#
# Never pass --baud to esptool here. There is no UART to reclock; a request for
# 921600 ends a transfer after ~20 kB with "Serial data stream stopped".

set -euo pipefail
SKETCH="${1:?usage: build.sh <sketch-dir> [--upload|--monitor]}"
shift || true

FQBN="esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,CDCOnBoot=cdc,USBMode=hwcdc,PartitionScheme=huge_app"

PORT="${PORT:-}"
if [[ -z "$PORT" ]]; then
  PORT="$(ls /dev/cu.usbmodem* 2>/dev/null | head -1 || true)"
fi

cd "$(dirname "$0")"

# Stamp a fresh build number into the sketch, so the number on the panel and the
# binary just flashed cannot disagree.
VER="$SKETCH/version.h"
if [[ -f "$VER" ]]; then
  N=$(grep -oE '#define FW_BUILD +[0-9]+' "$VER" | grep -oE '[0-9]+$')
  N=$(( N + 1 ))
  /usr/bin/sed -i '' -E "s/#define FW_BUILD +[0-9]+/#define FW_BUILD $N/" "$VER"
  echo "build $N"
fi

echo "building $SKETCH"
arduino-cli compile --fqbn "$FQBN" "$SKETCH"

if [[ "${1:-}" == "--upload" || "${1:-}" == "--monitor" ]]; then
  if [[ -z "$PORT" ]]; then
    echo "no /dev/cu.usbmodem* found — is the board plugged in?" >&2
    exit 1
  fi
  echo
  echo "Flashing overwrites the factory firmware. Backups are in"
  echo "  ../firmware-backup/   (full 16 MB image, and app0 alone)"
  arduino-cli upload --fqbn "$FQBN" --port "$PORT" "$SKETCH"
  # Report the number that reached the board. Every compile bumps it, so the
  # number from an earlier dry compile is not the one on the panel.
  echo
  echo "FLASHED build $N — the panel must read b$N"
  if [[ "${1:-}" == "--monitor" ]]; then
    echo; echo "--- serial, ctrl-c to stop ---"
    arduino-cli monitor --port "$PORT" --config baudrate=115200
  fi
fi

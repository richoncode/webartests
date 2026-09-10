#!/usr/bin/env bash
# Build (and optionally flash) a reTerminal E1002 sketch.
#
#   ./build.sh dashboard              compile only
#   ./build.sh calibration --upload   compile and flash
#
# The FQBN matters. Seeed's wiki says to select XIAO_ESP32S3, but that profile
# offers only 8 MB of flash while this board carries 32 MB with a factory
# partition table of two 12 MB OTA slots and 6 MB of SPIFFS. Building as
# XIAO_ESP32S3 writes an 8 MB partition table and strands 24 MB. The generic
# esp32s3 profile takes FlashSize=32M, and PartitionScheme=custom makes the core
# use the partitions.csv sitting beside the sketch.

set -euo pipefail
SKETCH="${1:?usage: build.sh <sketch-dir> [--upload]}"
shift || true

# UploadSpeed=115200 is not a default worth changing: the CH340 on this board
# corrupts sustained transfers above it. arduino-cli defaults to 921600 and the
# upload fails right after the rate change.
FQBN="esp32:esp32:esp32s3:FlashSize=32M,PSRAM=opi,PartitionScheme=custom,UploadSpeed=115200"
PORT="${PORT:-/dev/cu.usbserial-210}"

cd "$(dirname "$0")"
echo "building $SKETCH"
arduino-cli compile --fqbn "$FQBN" "$SKETCH"

# arduino-cli honours a custom partitions.csv for the TABLE but not for the app
# OFFSET: it always writes the app at 0x10000 and boot_app0 at 0xe000. This
# board's factory layout puts otadata at 0x86000 and app0 at 0x90000, so an
# arduino-cli upload leaves the bootloader looking at an empty app0 and the
# board boot-loops with "invalid magic byte". Flash with esptool at the offsets
# the table actually specifies.
if [[ "${1:-}" == "--upload" ]]; then
  echo
  echo "Flashing overwrites the factory firmware. The backup is at"
  echo "  ../firmware-backup/2026-09-06_reterminal-e1002-factory-32MB.bin"
  echo "Confirm it is mirrored off this machine before continuing."
  read -r -p "type FLASH to continue: " ok
  [[ "$ok" == "FLASH" ]] || { echo "aborted"; exit 1; }
  BUILD="$(mktemp -d)"
  arduino-cli compile --fqbn "$FQBN" --build-path "$BUILD" "$SKETCH" >/dev/null
  ESPTOOL="${ESPTOOL:-esptool}"
  "$ESPTOOL" --port "$PORT" --chip esp32s3 --baud 115200 write-flash \
    0x0     "$BUILD/${SKETCH}.ino.bootloader.bin" \
    0x8000  "$BUILD/${SKETCH}.ino.partitions.bin" \
    0x86000 "$BUILD/boot_app0.bin" \
    0x90000 "$BUILD/${SKETCH}.ino.bin"
  rm -rf "$BUILD"
fi

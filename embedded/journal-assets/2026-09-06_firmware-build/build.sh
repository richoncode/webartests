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

FQBN="esp32:esp32:esp32s3:FlashSize=32M,PSRAM=opi,PartitionScheme=custom"
PORT="${PORT:-/dev/cu.usbserial-210}"

cd "$(dirname "$0")"
echo "building $SKETCH"
arduino-cli compile --fqbn "$FQBN" "$SKETCH"

if [[ "${1:-}" == "--upload" ]]; then
  echo
  echo "Flashing overwrites the factory firmware. The backup is at"
  echo "  ../firmware-backup/2026-09-06_reterminal-e1002-factory-32MB.bin"
  echo "Confirm it is mirrored off this machine before continuing."
  read -r -p "type FLASH to continue: " ok
  [[ "$ok" == "FLASH" ]] || { echo "aborted"; exit 1; }
  arduino-cli upload --fqbn "$FQBN" --port "$PORT" "$SKETCH"
fi

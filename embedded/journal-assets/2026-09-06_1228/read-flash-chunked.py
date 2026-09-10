#!/usr/bin/env python3
"""Read an ESP32 flash image in chunks, retrying each chunk.

The reTerminal E1002's CH340 link corrupts a sustained read every few hundred
kilobytes, so a single 32 MB `esptool read-flash` never finishes. This reads the
image a chunk at a time, retries a chunk that fails, and keeps finished chunks on
disk so an interrupted run resumes instead of starting over.

  ./read-flash-chunked.py --esptool ../.venv/bin/esptool \
      --out firmware-backup/2026-09-06_reterminal-e1002-factory-32MB.bin
"""

import argparse, hashlib, os, subprocess, sys, time

def human(n):
    return "%.1f MB" % (n / (1 << 20)) if n >= 1 << 20 else "%d kB" % (n >> 10)

def read_chunk(esptool, port, baud, chip, offset, size, path, retries, no_stub):
    cmd = [esptool, "--port", port, "--chip", chip, "--baud", str(baud)]
    if no_stub:
        cmd.append("--no-stub")
    cmd += ["read-flash", hex(offset), hex(size), path]
    for attempt in range(1, retries + 1):
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode == 0 and os.path.exists(path) and os.path.getsize(path) == size:
            return True, attempt
        if os.path.exists(path):
            os.remove(path)
        if attempt < retries:
            time.sleep(1.0)
    err = [l for l in (proc.stdout + proc.stderr).splitlines() if "fatal error" in l.lower()]
    return False, err[0] if err else "unknown failure"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--esptool", required=True)
    ap.add_argument("--port", default="/dev/cu.usbserial-210")
    ap.add_argument("--chip", default="esp32s3")
    ap.add_argument("--baud", type=int, default=115200)
    ap.add_argument("--size", type=lambda x: int(x, 0), default=0x2000000, help="total bytes (default 32 MB)")
    ap.add_argument("--chunk", type=lambda x: int(x, 0), default=0x40000, help="bytes per read (default 256 kB)")
    ap.add_argument("--retries", type=int, default=6)
    ap.add_argument("--no-stub", action="store_true",
                    help="talk to the ROM loader directly; slower per byte but far less likely to corrupt")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    parts = a.out + ".parts"
    os.makedirs(parts, exist_ok=True)
    total = (a.size + a.chunk - 1) // a.chunk
    started = time.time()
    failed = []

    for i in range(total):
        offset = i * a.chunk
        size = min(a.chunk, a.size - offset)
        path = os.path.join(parts, "%08x.bin" % offset)
        if os.path.exists(path) and os.path.getsize(path) == size:
            continue
        ok, info = read_chunk(a.esptool, a.port, a.baud, a.chip, offset, size, path, a.retries, a.no_stub)
        done = offset + size
        elapsed = time.time() - started
        rate = done / elapsed if elapsed else 0
        if ok:
            print("chunk %3d/%d  0x%08x  %s  %5.1f%%  %s attempt(s)  eta %s" % (
                i + 1, total, offset, human(size), 100 * done / a.size, info,
                time.strftime("%M:%S", time.gmtime((a.size - done) / rate)) if rate else "?"),
                flush=True)
        else:
            print("chunk %3d/%d  0x%08x  FAILED after %d attempts: %s" % (
                i + 1, total, offset, a.retries, info), flush=True)
            failed.append(offset)

    if failed:
        print("\n%d chunk(s) unread: %s" % (len(failed), ", ".join(hex(o) for o in failed)))
        print("Re-run the same command to retry only those chunks.")
        return 1

    h = hashlib.sha256()
    with open(a.out, "wb") as out:
        for i in range(total):
            offset = i * a.chunk
            with open(os.path.join(parts, "%08x.bin" % offset), "rb") as f:
                data = f.read()
            out.write(data)
            h.update(data)
    print("\nwrote %s  (%d bytes)" % (a.out, os.path.getsize(a.out)))
    print("sha256 %s" % h.hexdigest())
    print("elapsed %s" % time.strftime("%H:%M:%S", time.gmtime(time.time() - started)))
    print("Remove %s once the image is verified." % parts)
    return 0

if __name__ == "__main__":
    sys.exit(main())

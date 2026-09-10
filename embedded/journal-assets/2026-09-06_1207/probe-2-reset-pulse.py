import os, termios, fcntl, struct, time, select, array

PORT = "/dev/cu.usbserial-210"
TIOCMGET, TIOCMSET = 0x4004746A, 0x8004746D
TIOCM_DTR, TIOCM_RTS = 0x002, 0x004
IOSSIOSPEED = 0x80045402  # _IOW('T', 2, speed_t) -- arbitrary baud on macOS

def open_port(baud):
    fd = os.open(PORT, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    a = termios.tcgetattr(fd)
    cc = list(a[6]); cc[termios.VMIN] = 0; cc[termios.VTIME] = 0
    std = getattr(termios, "B%d" % baud, None)
    speed = std if std else termios.B9600
    termios.tcsetattr(fd, termios.TCSANOW,
                      [0, 0, termios.CS8 | termios.CREAD | termios.CLOCAL, 0, speed, speed, cc])
    if std is None:
        fcntl.ioctl(fd, IOSSIOSPEED, struct.pack("I", baud))
    termios.tcflush(fd, termios.TCIOFLUSH)
    return fd

def modem(fd, bits):
    fcntl.ioctl(fd, TIOCMSET, struct.pack("I", bits))

def read_for(fd, seconds):
    buf = b""; end = time.time() + seconds
    while time.time() < end:
        if select.select([fd], [], [], 0.1)[0]:
            try: c = os.read(fd, 4096)
            except OSError: break
            if c: buf += c
    return buf

def show(label, d):
    if not d:
        print("    %-24s (nothing)" % label); return
    pr = sum(1 for b in d if 9 <= b <= 13 or 32 <= b <= 126) / len(d)
    print("    %-24s %d bytes, %.0f%% printable" % (label, len(d), pr * 100))
    print("      text: %r" % d[:400])
    print("      hex : %s" % d[:64].hex(" "))

for baud in [115200, 74880, 9600, 250000, 921600]:
    print("=== %d baud, DTR/RTS reset pulse ===" % baud)
    try: fd = open_port(baud)
    except OSError as e:
        print("    open failed: %s" % e); continue
    try:
        # assert both (holds many boards in reset), then release -> boot
        modem(fd, TIOCM_DTR | TIOCM_RTS); time.sleep(0.15)
        modem(fd, 0); time.sleep(0.05)
        termios.tcflush(fd, termios.TCIFLUSH)
        show("post-reset 3.0s", read_for(fd, 3.0))
        os.write(fd, b"\r\n"); show("after CR/LF", read_for(fd, 1.0))
    finally:
        os.close(fd)

# loopback check: are TX and RX tied together / is anything echoing?
print("=== loopback / echo check @115200 ===")
fd = open_port(115200)
try:
    os.write(fd, b"CLAUDE-PROBE-1234\r\n")
    show("echo of sent bytes", read_for(fd, 1.5))
finally:
    os.close(fd)

# modem line state -- is anything on the other end driving CTS/DSR/DCD?
fd = os.open(PORT, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
bits = struct.unpack("I", fcntl.ioctl(fd, TIOCMGET, struct.pack("I", 0)))[0]
os.close(fd)
names = {0x002:"DTR",0x004:"RTS",0x020:"CTS",0x040:"CAR/DCD",0x080:"RNG",0x100:"DSR"}
print("=== modem lines: 0x%03x -> %s ===" % (bits, ", ".join(n for b,n in names.items() if bits & b) or "none asserted"))

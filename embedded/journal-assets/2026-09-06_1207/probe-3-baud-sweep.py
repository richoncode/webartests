import os, termios, fcntl, struct, time, select

PORT = "/dev/cu.usbserial-210"
TIOCMSET = 0x8004746D
DTR, RTS = 0x002, 0x004
IOSSIOSPEED = 0x80045402

BAUDS = [9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 460800, 921600]

def open_port(baud):
    fd = os.open(PORT, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    a = termios.tcgetattr(fd)
    cc = list(a[6]); cc[termios.VMIN] = 0; cc[termios.VTIME] = 0
    std = getattr(termios, "B%d" % baud, None)
    termios.tcsetattr(fd, termios.TCSANOW,
        [0, 0, termios.CS8 | termios.CREAD | termios.CLOCAL, 0, std or termios.B9600, std or termios.B9600, cc])
    if std is None:
        fcntl.ioctl(fd, IOSSIOSPEED, struct.pack("I", baud))
    termios.tcflush(fd, termios.TCIOFLUSH)
    return fd

def read_for(fd, s):
    buf = b""; end = time.time() + s
    while time.time() < end:
        if select.select([fd], [], [], 0.05)[0]:
            try: c = os.read(fd, 8192)
            except OSError: break
            if c: buf += c
    return buf

best = []
for baud in BAUDS:
    for trial in (1, 2):
        try: fd = open_port(baud)
        except OSError as e:
            print("%7d t%d  open failed: %s" % (baud, trial, e)); continue
        try:
            fcntl.ioctl(fd, TIOCMSET, struct.pack("I", DTR | RTS)); time.sleep(0.20)
            fcntl.ioctl(fd, TIOCMSET, struct.pack("I", 0))
            termios.tcflush(fd, termios.TCIFLUSH)
            d = read_for(fd, 2.5)
        finally:
            os.close(fd)
        if d:
            pr = sum(1 for b in d if 9 <= b <= 13 or 32 <= b <= 126) / len(d)
            print("%7d t%d  %4d bytes  %3.0f%% printable  %r" % (baud, trial, len(d), pr*100, d[:200]))
            best.append((pr, len(d), baud, d))
        else:
            print("%7d t%d  ---" % (baud, trial))
        time.sleep(0.3)

print()
if best:
    best.sort(reverse=True)
    pr, n, baud, d = best[0]
    print("most-printable capture: %d baud, %d bytes, %.0f%% printable" % (baud, n, pr*100))
    print(d.decode("utf-8", "replace"))
else:
    print("no data captured on any baud rate")

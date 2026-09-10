import os, sys, termios, time, select

PORT = "/dev/cu.usbserial-210"
BAUDS = [115200, 9600, 57600, 38400, 19200, 230400]

def open_port(baud):
    fd = os.open(PORT, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    a = termios.tcgetattr(fd)
    cc = list(a[6])
    cc[termios.VMIN] = 0
    cc[termios.VTIME] = 0
    speed = getattr(termios, "B%d" % baud)
    # raw, 8N1, no modem-control, no HUPCL (so closing does not drop DTR / reset the board)
    termios.tcsetattr(fd, termios.TCSANOW,
                      [0, 0, termios.CS8 | termios.CREAD | termios.CLOCAL, 0, speed, speed, cc])
    termios.tcflush(fd, termios.TCIOFLUSH)
    return fd

def read_for(fd, seconds):
    buf = b""
    end = time.time() + seconds
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], 0.1)
        if r:
            try:
                chunk = os.read(fd, 4096)
            except OSError:
                break
            if chunk:
                buf += chunk
    return buf

def show(label, data):
    if not data:
        print("    %-22s (nothing)" % label)
        return
    printable = sum(1 for b in data if 9 <= b <= 13 or 32 <= b <= 126)
    ratio = printable / len(data)
    print("    %-22s %d bytes, %.0f%% printable" % (label, len(data), ratio * 100))
    print("      text: %r" % data[:300])
    print("      hex : %s" % data[:48].hex(" "))

for baud in BAUDS:
    print("=== %d baud ===" % baud)
    try:
        fd = open_port(baud)
    except OSError as e:
        print("    open failed: %s" % e)
        continue
    try:
        show("passive 2.0s", read_for(fd, 2.0))
        for name, probe in [("CR/LF", b"\r\n"),
                            ("GRBL status '?'", b"?"),
                            ("GRBL build '$I'", b"$I\r\n"),
                            ("Marlin 'M115'", b"M115\r\n")]:
            os.write(fd, probe)
            show(name, read_for(fd, 1.0))
    finally:
        os.close(fd)

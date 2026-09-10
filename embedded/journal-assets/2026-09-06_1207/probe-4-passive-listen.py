import os, termios, fcntl, struct, time, select
PORT = "/dev/cu.usbserial-210"; IOSSIOSPEED = 0x80045402
def open_port(baud):
    fd = os.open(PORT, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
    cc = list(termios.tcgetattr(fd)[6]); cc[termios.VMIN]=0; cc[termios.VTIME]=0
    std = getattr(termios, "B%d" % baud, None)
    termios.tcsetattr(fd, termios.TCSANOW,
        [0,0,termios.CS8|termios.CREAD|termios.CLOCAL,0,std or termios.B9600,std or termios.B9600,cc])
    if std is None: fcntl.ioctl(fd, IOSSIOSPEED, struct.pack("I", baud))
    termios.tcflush(fd, termios.TCIOFLUSH); return fd
for baud in (115200, 9600):
    fd = open_port(baud); bursts = []; total = b""; end = time.time() + 15
    while time.time() < end:
        if select.select([fd], [], [], 0.2)[0]:
            try: c = os.read(fd, 8192)
            except OSError: break
            if c: bursts.append((round(time.time() % 100, 2), len(c))); total += c
    os.close(fd)
    print("%6d baud, 15s passive: %d bytes in %d bursts %s" % (baud, len(total), len(bursts), bursts[:10]))
    if total: print("        %r" % total[:200])

import math
import struct
import base64
import zlib

def make_png_grayscale_ramp(width, height):
    # Grayscale image (color type 0, bit depth 8)
    # The gradient goes from black (0) on left to white (255) on right.
    raw_data = bytearray()
    for y in range(height):
        # row filter type 0 (None)
        raw_data.append(0)
        for x in range(width):
            c = int((x / (width - 1)) * 255)
            raw_data.append(c)

    # Compress IDAT
    idat_data = zlib.compress(raw_data, 9)

    def make_chunk(chunk_type, data):
        length = struct.pack("!I", len(data))
        chunk = chunk_type + data
        crc = struct.pack("!I", zlib.crc32(chunk) & 0xffffffff)
        return length + chunk + crc

    # IHDR
    ihdr_data = struct.pack("!IIBBBBB", width, height, 8, 0, 0, 0, 0)
    ihdr_chunk = make_chunk(b"IHDR", ihdr_data)

    # IDAT
    idat_chunk = make_chunk(b"IDAT", idat_data)

    # IEND
    iend_chunk = make_chunk(b"IEND", b"")

    png = b"\x89PNG\r\n\x1a\n" + ihdr_chunk + idat_chunk + iend_chunk
    return base64.b64encode(png).decode("utf-8")

print(make_png_grayscale_ramp(64, 64))

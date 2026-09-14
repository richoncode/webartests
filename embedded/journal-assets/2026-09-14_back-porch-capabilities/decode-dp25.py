#!/usr/bin/env python3
"""Decode the LAN hex form of dp 25 (scene_data) and check it against the
JSON form the Tuya cloud reports for the same bulb at the same moment.

The LAN payload is 14 bytes per scene unit:
  0      scene number (0-based)
  1      unit_switch_duration    0-100
  2      unit_gradient_duration  0-100
  3      unit_change_mode        0 static, 1 jump, 2 gradient
  4-5    h            0-360
  6-7    s            0-1000
  8-9    v            0-1000
  10-11  bright       0-1000
  12-13  temperature  0-1000
"""
LAN   = "000e0d0000000000000000c80000"          # Back Porch 1, dp 25, over the LAN
CLOUD = {"scene_num": 1, "bright": 200, "h": 0, "s": 0, "v": 0, "temperature": 0,
         "unit_change_mode": "static", "unit_gradient_duration": 13,
         "unit_switch_duration": 14}             # same bulb, same moment, via the cloud

b = bytes.fromhex(LAN)
assert len(b) == 14, len(b)
u16 = lambda i: (b[i] << 8) | b[i + 1]
got = {
    "scene_num":              b[0] + 1,
    "unit_switch_duration":   b[1],
    "unit_gradient_duration": b[2],
    "unit_change_mode":       ["static", "jump", "gradient"][b[3]],
    "h": u16(4), "s": u16(6), "v": u16(8),
    "bright": u16(10), "temperature": u16(12),
}
for k in sorted(CLOUD):
    ok = "ok " if got[k] == CLOUD[k] else "DIFF"
    print(f"{ok} {k:24} lan={got[k]!r:10} cloud={CLOUD[k]!r}")
print("\nbytes:", " ".join(f"{x:02x}" for x in b))

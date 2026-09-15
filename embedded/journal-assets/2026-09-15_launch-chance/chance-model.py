#!/usr/bin/env python3
"""Visibility chance for a Vandenberg launch seen from San Martin, 200 miles away.

What makes one of these worth walking outside for is the twilight plume: the
rocket climbing into sunlight while the observer is already in the dark. So the
question is not "is it after sunset" but "how dark is it here while the rocket
is high", which is a curve rather than a threshold.

The plume is at its most visible a few minutes after lift-off, once the vehicle
is high enough to catch the sun, so the sky is judged at lift-off + 6 minutes
rather than at lift-off.

    chance = twilight(t) x sky(cloud) x confidence(status)

Every number here is a judgement, not a measurement. They are in one place so
they can be argued with.
"""
PLUME_LAG_MIN = 6

# minutes from sunset (negative = before) -> how well a plume shows
TWILIGHT_DUSK = [(-90, 0.02), (-60, 0.04), (-30, 0.12), (-10, 0.45), (5, 0.85),
                 (20, 0.95), (75, 0.95), (110, 0.70), (140, 0.40), (200, 0.20),
                 (300, 0.12)]
# minutes before sunrise -> the same shape, mirrored, for pre-dawn launches
TWILIGHT_DAWN = [(-300, 0.12), (-200, 0.20), (-140, 0.40), (-110, 0.70), (-75, 0.95),
                 (-20, 0.95), (-5, 0.85), (10, 0.45), (30, 0.12), (60, 0.04), (90, 0.02)]
SKY = [(0, 1.00), (10, 1.00), (35, 0.80), (60, 0.45), (85, 0.15), (100, 0.02)]
CONFIDENCE = {"Go": 1.00, "TBC": 0.80, "TBD": 0.55, "Hold": 0.40}
SHOW_AT = 15            # below this the band stays off the panel


def lerp(table, x):
    if x <= table[0][0]:
        return table[0][1]
    if x >= table[-1][0]:
        return table[-1][1]
    for (x0, y0), (x1, y1) in zip(table, table[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return table[-1][1]


def chance(liftoff_min, sunset_min, sunrise_min, cloud_pct, status):
    """All times are minutes past local midnight. Returns 0-99."""
    t = liftoff_min + PLUME_LAG_MIN
    dusk = lerp(TWILIGHT_DUSK, t - sunset_min)
    dawn = lerp(TWILIGHT_DAWN, t - sunrise_min)
    twilight = max(dusk, dawn)
    sky = lerp(SKY, cloud_pct)
    conf = CONFIDENCE.get(status, 0.55)
    return min(99, round(100 * twilight * sky * conf))


def band(pct):
    return "green" if pct >= 55 else "yellow" if pct >= 30 else "blue" if pct >= SHOW_AT else "hidden"


if __name__ == "__main__":
    hm = lambda m: f"{m // 60 % 24:d}:{m % 60:02d}"
    print(__doc__)
    cases = [
        ("USSF-259, tonight",        18 * 60 + 0,  19 * 60 + 13, 6 * 60 + 48, 0,  "Go"),
        ("Starlink 15-27, Fri 19th", 18 * 60 + 47, 19 * 60 + 9,  6 * 60 + 52, 0,  "Go"),
        ("same, but 40% cloud",      18 * 60 + 47, 19 * 60 + 9,  6 * 60 + 52, 40, "Go"),
        ("USSF R-3, 27th pre-dawn",  4 * 60 + 42,  19 * 60 + 0,  6 * 60 + 52, 0,  "TBC"),
        ("an ideal one",             19 * 60 + 40, 19 * 60 + 10, 6 * 60 + 50, 5,  "Go"),
        ("ideal, but overcast",      19 * 60 + 40, 19 * 60 + 10, 6 * 60 + 50, 90, "Go"),
        ("midnight, clear",          23 * 60 + 50, 19 * 60 + 10, 6 * 60 + 50, 0,  "Go"),
        ("noon",                     12 * 60 + 0,  19 * 60 + 10, 6 * 60 + 50, 0,  "Go"),
    ]
    print(f"{'case':28} {'lift':>6} {'vs dusk':>8} {'cloud':>6} {'status':>7} {'chance':>7}  band")
    for name, lift, ss, sr, cl, st in cases:
        c = chance(lift, ss, sr, cl, st)
        rel = lift + PLUME_LAG_MIN - ss
        print(f"{name:28} {hm(lift):>6} {rel:+7d}m {cl:5d}% {st:>7} {c:6d}%  {band(c)}")

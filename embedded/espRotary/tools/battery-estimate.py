#!/usr/bin/env python3
"""Battery life for espRotary, as a function of the one number nobody has measured.

Every figure below is an ESTIMATE from datasheet and typical values, not a
measurement of this board. They are collected here so they can be replaced one
at a time with real ones. See the journal entry for how to measure them.

The headline: at any realistic usage, sleep current decides the answer. A day
holds 86,400 seconds and the knob is touched for a few hundred of them.
"""

# ── the rail ────────────────────────────────────────────────────────────────
# The module takes 5 V. Its schematic (Eagle_SCH&PCB, U2 = RY3420) shows a
# step-down regulator, and there is no charger IC and no battery net anywhere in
# it, so a single lithium cell cannot feed it directly: 3.0-4.2 V is below what
# a buck needs to make 5 V. A cell reaches it through a boost converter, and
# every milliamp on the 5 V rail costs more than a milliamp out of the cell.
V_RAIL, V_CELL, BOOST_EFF = 5.0, 3.7, 0.88
CELL_FACTOR = V_RAIL / V_CELL / BOOST_EFF          # about 1.53

# ── estimated current draw on the 5 V rail, milliamps ───────────────────────
I_ACTIVE = 150.0   # S3 at 240 MHz with Wi-Fi associated, panel on, backlight 200/255
I_DIM    = 115.0   # same, backlight 16/255
I_SLEEP_CANDIDATES = [0.5, 1.0, 2.0, 5.0, 10.0]   # light sleep, radio off, panel off

# ── how it gets used, seconds per day ───────────────────────────────────────
PROFILES = {
    "light":   (10, 20),   # wakes per day, seconds awake per wake
    "typical": (25, 30),
    "heavy":   (60, 45),
}
DIM_TAIL = 25.0        # seconds between the fade starting and sleep, per wake

BATTERIES = [500, 1000, 2000, 3000, 5000]
USABLE = 0.85          # protection cut-off, ageing, and the regulator's dropout


def daily_mah(profile, i_sleep, at_cell=True):
    """Charge used per day. at_cell converts the 5 V rail figures into what has
    to come out of a 3.7 V cell through the boost converter."""
    wakes, secs = PROFILES[profile]
    active_s = wakes * secs
    dim_s = wakes * DIM_TAIL
    sleep_s = 86400 - active_s - dim_s
    rail = (I_ACTIVE * active_s + I_DIM * dim_s + i_sleep * sleep_s) / 3600.0
    return rail * (CELL_FACTOR if at_cell else 1.0)


def table(profile):
    wakes, secs = PROFILES[profile]
    print(f"\n{profile}: {wakes} wakes a day, {secs} s each "
          f"({wakes * secs / 60:.0f} min awake, {wakes * DIM_TAIL / 60:.0f} min fading)")
    print("  rail mA  | " + " | ".join(f"{b:>5} mAh" for b in BATTERIES) + "  | cell/day")
    print("  ---------+" + "+".join("-" * 11 for _ in BATTERIES) + "--+---------")
    for i_sleep in I_SLEEP_CANDIDATES:
        per_day = daily_mah(profile, i_sleep)
        cells = " | ".join(f"{b * USABLE / per_day:>7.1f} d" for b in BATTERIES)
        print(f"  {i_sleep:>8.1f} | {cells}  | {per_day:>5.1f} mAh")


if __name__ == "__main__":
    print(__doc__)
    print(f"active {I_ACTIVE:.0f} mA   dim {I_DIM:.0f} mA   on the 5 V rail")
    print(f"cell draw = rail x {CELL_FACTOR:.2f}  ({V_RAIL:.0f} V from {V_CELL:.1f} V at "
          f"{BOOST_EFF:.0%})   usable capacity {USABLE:.0%}")
    print("The sleep column is the 5 V rail. Add the boost converter's own quiescent")
    print("draw on top: a good part keeps it under 50 uA, a cheap one does not.")
    for p in PROFILES:
        table(p)
    print("\nWhere the charge goes, typical profile at 2 mA sleep:")
    wakes, secs = PROFILES["typical"]
    a = I_ACTIVE * wakes * secs / 3600 * CELL_FACTOR
    d = I_DIM * wakes * DIM_TAIL / 3600 * CELL_FACTOR
    s = 2.0 * (86400 - wakes * secs - wakes * DIM_TAIL) / 3600 * CELL_FACTOR
    t = a + d + s
    for name, v in (("awake", a), ("fading", d), ("asleep", s)):
        print(f"  {name:<7} {v:6.1f} mAh  {v / t:5.1%}")

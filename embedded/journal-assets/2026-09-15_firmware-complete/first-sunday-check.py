import datetime
def firmware(mday, wday, first_weekday=0):
    # date of the most recent `first_weekday` on or before today, wrapped into
    # the first week of the month
    back = (wday - first_weekday + 7) % 7
    return ((mday - back - 1) % 7 + 7) % 7 + 1
bad = 0
for y in (2026, 2027, 2028):
    for mo in range(1, 13):
        d = datetime.date(y, mo, 1)
        fs = 1 + ((6 - d.weekday()) % 7)                 # real first Sunday
        nxt = datetime.date(y + (mo == 12), mo % 12 + 1, 1)
        for md in range(1, (nxt - d).days + 1):
            dt = datetime.date(y, mo, md)
            wday = (dt.weekday() + 1) % 7
            got = firmware(md, wday)
            if got != fs:
                bad += 1
                if bad < 5: print("  MISMATCH", dt, "wday", wday, "got", got, "want", fs)
print("first-Sunday over 36 months:", "every day agrees" if not bad else f"{bad} mismatches")

#!/usr/bin/env python3
"""Predict whether a fresh Starlink train is visible from San Martin, CA.

The e-paper dashboard does not run SGP4. This script does, on a schedule, and
writes a small JSON file the firmware fetches from GitHub Pages.

Primary elements are CelesTrak supplemental GP (SupGP) for the starlink file,
CSV format. That file is fed by SpaceX ephemerides (DATA_SOURCE SpaceX-E) and
it is the keyless source that still carries catalog numbers 100000 and up.
Legacy TLE/GP queries cannot: the 5-digit catalog number ran out in July 2026,
and those endpoints answer "No GP data found" for anything launched since.

If that download fails and SPACETRACK_IDENTITY / SPACETRACK_PASSWORD are set,
the same prediction is attempted from Space-Track. The secrets are optional
while CelesTrak answers. They are never printed and never written to disk.

A launch is a train when it is at most 10 days old and at least half of its
published satellites, and at least five of them, still lie within 40 degrees
of argument of latitude. A pass is kept when, sometime in the next 30 hours,
the observer's sun is below -6 degrees, the satellite is sunlit, and the
train's max elevation is at least 10 degrees, with at least three of the
cluster actually above that floor. One JSON entry per pass.
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from http.cookiejar import CookieJar

# San Martin, CA. A few hundred meters from the weather point in config.h
# (37.08778, -121.60000); at 10 degrees of elevation the difference is noise.
OBSERVER_LAT = 37.085
OBSERVER_LON = -121.61
OBSERVER_ELEV_M = 90.0
TZ_NAME = "America/Los_Angeles"

LAUNCH_AGE = timedelta(days=10)
CLUSTER_DEG = 40.0
MIN_CLUSTER = 5
MIN_FRACTION = 0.5
MIN_VISIBLE = 3
MIN_EL = 10.0
SUN_DEG = -6.0
HORIZON = timedelta(hours=30)
STEP_S = 30
# Split a visibility run when the train drops out for longer than this.
GAP_S = 180

CELESTRAK_GP = (
    "https://celestrak.org/NORAD/elements/supplemental/sup-gp.php"
    "?FILE=starlink&FORMAT=csv"
)
CELESTRAK_SATCAT = "https://celestrak.org/satcat/records.php?INTDES={des}&FORMAT=JSON"
LL2_RECENT = (
    "https://ll.thespacedevs.com/2.3.0/launches/"
    "?search=Starlink&limit=15&ordering=-net&mode=list"
)
SPACETRACK_LOGIN = "https://www.space-track.org/ajaxauth/login"
SPACETRACK_SATCAT = (
    "https://www.space-track.org/basicspacedata/query/class/satcat/"
    "OBJECT_NAME/~~STARLINK/LAUNCH/>{day}/orderby/LAUNCH%20desc/limit/200/format/json"
)
SPACETRACK_GP = (
    "https://www.space-track.org/basicspacedata/query/class/gp/"
    "OBJECT_ID/~~{des}/orderby/OBJECT_ID/limit/80/format/json"
)

UA = "webartests-starlink-train/1.0 (San Martin e-paper; keyless SupGP)"
COMPASS_8 = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")


def compass8(azimuth_deg: float) -> str:
    return COMPASS_8[int((azimuth_deg % 360.0) + 22.5) // 45 % 8]


def launch_id(object_id: str) -> str:
    des = object_id.strip()
    while des and des[-1].isalpha():
        des = des[:-1]
    return des


def des_key(des: str) -> tuple[int, int]:
    year, num = des.split("-", 1)
    return int(year), int(num)


def arglat(row: dict) -> float:
    return (float(row["ARG_OF_PERICENTER"]) + float(row["MEAN_ANOMALY"])) % 360.0


def largest_cluster(items: list, angle_of, width: float) -> list:
    """Return the largest subset whose angles fit in a window of `width` degrees.

    The window wraps past 0. A satellite is never counted twice.
    """
    if not items:
        return []
    decorated = sorted(((angle_of(s) % 360.0, s) for s in items), key=lambda pair: pair[0])
    angles = [pair[0] for pair in decorated]
    sats = [pair[1] for pair in decorated]
    ext_a = angles + [a + 360.0 for a in angles]
    ext_s = sats + sats
    best: list = []
    j = 0
    n = len(sats)
    for i, start in enumerate(angles):
        if j < i:
            j = i
        while j < len(ext_a) and ext_a[j] - start <= width + 1e-6:
            j += 1
        count = min(j - i, n)
        if count > len(best):
            best = ext_s[i : i + count]
    return best


def median_altitude_km(rows: list[dict]) -> float:
    alts = sorted(_alt_km(float(r["MEAN_MOTION"])) for r in rows if r.get("MEAN_MOTION"))
    if not alts:
        return 9999.0
    mid = len(alts) // 2
    if len(alts) % 2:
        return alts[mid]
    return (alts[mid - 1] + alts[mid]) / 2.0


def _alt_km(mean_motion_rev_per_day: float) -> float:
    # mu in km^3/s^2, mean motion in rad/s.
    mu = 398600.4418
    n = mean_motion_rev_per_day * 2.0 * 3.141592653589793 / 86400.0
    return (mu / (n * n)) ** (1.0 / 3.0) - 6378.14


def http_get(url: str, timeout: int = 90, opener=None) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    open_fn = opener.open if opener is not None else urllib.request.urlopen
    delay = 5.0
    last: Exception | None = None
    for attempt in range(4):
        try:
            with open_fn(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code not in (403, 429, 500, 502, 503) or attempt == 3:
                raise
            print(f"HTTP {exc.code} from {url.split('?')[0]}, retrying in {delay:.0f}s", file=sys.stderr)
            time.sleep(delay)
            delay *= 2
    assert last is not None
    raise last


def looks_like_refusal(body: bytes) -> str | None:
    head = body[:240].lstrip().decode("utf-8", "replace")
    if head.startswith("{") or head.startswith("[") or head.startswith("OBJECT_"):
        return None
    if "No GP data" in head or head.startswith("No ") or head.startswith("<"):
        return head.splitlines()[0][:200]
    return None


def load_celestrak_gp() -> list[dict]:
    body = http_get(CELESTRAK_GP)
    refusal = looks_like_refusal(body)
    if refusal:
        raise RuntimeError("CelesTrak SupGP refused: " + refusal)
    text = body.decode("utf-8", "replace")
    rows = []
    for raw in csv.DictReader(io.StringIO(text)):
        row = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in raw.items() if k}
        if not row.get("OBJECT_NAME", "").startswith("STARLINK"):
            continue
        if not row.get("MEAN_MOTION") or not row.get("OBJECT_ID"):
            continue
        rows.append(row)
    if len(rows) < 100:
        raise RuntimeError(f"CelesTrak SupGP returned only {len(rows)} Starlink rows")
    return rows


def group_by_launch(rows: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {}
    for row in rows:
        groups.setdefault(launch_id(row["OBJECT_ID"]), []).append(row)
    return groups


def parse_utc(text: str) -> datetime | None:
    text = text.strip().replace("Z", "")
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


def fetch_ll2(now: datetime) -> list[dict]:
    """Recent Starlink launches, newest first. Empty if the site will not answer."""
    try:
        body = http_get(LL2_RECENT, timeout=45)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"launch library unavailable ({exc}); dating trains from SATCAT only", file=sys.stderr)
        return []
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        print("launch library returned a non-JSON body", file=sys.stderr)
        return []
    out = []
    for rec in payload.get("results") or []:
        net = parse_utc(rec.get("net") or "")
        if net is None:
            continue
        status = ((rec.get("status") or {}).get("abbrev") or "").upper()
        # A launch that has not flown yet has no train to propagate.
        if net > now + timedelta(hours=1):
            continue
        if status in {"TBD", "TBC", "HOLD"}:
            continue
        des = rec.get("launch_designator") or None
        if isinstance(des, str):
            des = des.strip() or None
        out.append({"net": net, "designator": des, "name": rec.get("name") or ""})
    return out


def fetch_satcat_date(des: str) -> datetime | None:
    url = CELESTRAK_SATCAT.format(des=urllib.parse.quote(des))
    try:
        body = http_get(url, timeout=45)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"SATCAT {des} failed ({exc})", file=sys.stderr)
        return None
    head = body.lstrip()[:1]
    if head not in (b"[", b"{"):
        return None
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return None
    if not isinstance(payload, list) or not payload:
        return None
    # The catalog date has no time. Noon UTC keeps a launch on that civil day
    # inside a 10-day window whether the site is ahead of or behind UTC.
    text = payload[0].get("LAUNCH_DATE") or ""
    day = parse_utc(text[:10]) if text else None
    if day is None:
        return None
    return day + timedelta(hours=12)


def short_name(ll2_name: str) -> str:
    # "Falcon 9 Block 5 | Starlink Group 15-25" -> "Starlink Group 15-25"
    if "|" in ll2_name:
        return ll2_name.split("|", 1)[1].strip()
    return ll2_name.strip()


def trains_within_age(groups: dict[str, list[dict]], now: datetime) -> list[dict]:
    """Launches from the last 10 days that are still one cluster."""
    ll2 = fetch_ll2(now)
    known = {rec["designator"] for rec in ll2 if rec["designator"]}
    dated: dict[str, tuple[datetime, str]] = {}
    undesignated = []
    for rec in ll2:
        if rec["net"] < now - LAUNCH_AGE:
            continue
        if rec["designator"]:
            dated[rec["designator"]] = (rec["net"], short_name(rec["name"]))
        else:
            undesignated.append(rec)

    newest_known = max(known, key=des_key) if known else None
    # The designator assigned in the last few hours often is not in Launch
    # Library yet. Anything newer than the newest designator LL2 does know,
    # plus a SATCAT check, is how that launch gets a date.
    extra = []
    for des in groups:
        if des in dated or des in known:
            continue
        if newest_known is not None and des_key(des) <= des_key(newest_known):
            continue
        if newest_known is None and des_key(des) < (now.year, 1):
            continue
        extra.append(des)
    extra.sort(key=des_key, reverse=True)
    for des in extra[:6]:
        time.sleep(1.0)
        sat_day = fetch_satcat_date(des)
        if sat_day is not None and now - LAUNCH_AGE <= sat_day <= now + timedelta(hours=1):
            dated[des] = (sat_day, "")
            continue
        if sat_day is None and undesignated:
            rec = undesignated.pop(0)
            dated[des] = (rec["net"], short_name(rec["name"]))
            continue
        # Launch Library has not been given a designator and SATCAT has no row
        # yet. A designator newer than anything either catalog lists, still in
        # the insertion altitude, is the launch that just flew.
        if sat_day is None and median_altitude_km(groups[des]) < 400:
            epochs = [parse_utc(r.get("EPOCH") or "") for r in groups[des]]
            epochs = [e for e in epochs if e is not None]
            if epochs and now - LAUNCH_AGE <= max(epochs) <= now + timedelta(hours=1):
                dated[des] = (max(epochs), "")

    found = []
    for des, (when, name) in sorted(dated.items(), key=lambda kv: kv[1][0]):
        rows = groups.get(des) or []
        if not rows:
            found.append({
                "launch": des,
                "name": name,
                "published": 0,
                "clustered": 0,
                "keep": False,
                "reason": "no elements published yet",
                "rows": [],
                "when": when,
            })
            continue
        cluster = largest_cluster(rows, arglat, CLUSTER_DEG)
        enough = len(cluster) >= MIN_CLUSTER and len(cluster) >= MIN_FRACTION * len(rows)
        reason = ""
        if not enough:
            reason = (
                f"{len(cluster)} of {len(rows)} within {CLUSTER_DEG:.0f} deg "
                f"(need {MIN_CLUSTER} and half the launch)"
            )
        found.append({
            "launch": des,
            "name": name,
            "published": len(rows),
            "clustered": len(cluster),
            "keep": enough,
            "reason": reason,
            "rows": cluster if enough else [],
            "when": when,
        })
    return found


def assemble_passes(times, alts, azs, vis) -> list[dict]:
    """Collapse per-satellite visibility samples into one entry per train pass.

    `times` is a list of aware datetimes. `alts`, `azs` and `vis` are parallel
    lists, one array-like per satellite, each aligned with `times`.
    """
    n = len(times)
    if n == 0 or not vis:
        return []
    any_vis = [False] * n
    for flags in vis:
        for i, flag in enumerate(flags):
            if flag:
                any_vis[i] = True
    on = [i for i, flag in enumerate(any_vis) if flag]
    if not on:
        return []

    runs: list[tuple[int, int]] = []
    start = prev = on[0]
    max_gap = max(1, int(GAP_S / STEP_S))
    for i in on[1:]:
        if i - prev > max_gap:
            runs.append((start, prev))
            start = i
        prev = i
    runs.append((start, prev))

    passes = []
    for i0, i1 in runs:
        count = 0
        best_el = -90.0
        best_i = i0
        for alt, flags in zip(alts, vis):
            seen = False
            for i in range(i0, i1 + 1):
                if not flags[i]:
                    continue
                seen = True
                if alt[i] > best_el:
                    best_el = float(alt[i])
                    best_i = i
            if seen:
                count += 1
        if count < MIN_VISIBLE or best_el < MIN_EL:
            continue
        from_az = _edge_azimuth(i0, alts, azs, vis)
        to_az = _edge_azimuth(i1, alts, azs, vis)
        passes.append({
            "start": _iso(times[i0]),
            "peak": _iso(times[best_i]),
            "end": _iso(times[i1]),
            "maxEl": int(round(best_el)),
            "from": compass8(from_az),
            "to": compass8(to_az),
            "count": count,
        })
    passes.sort(key=lambda p: p["peak"])
    return passes


def _edge_azimuth(index, alts, azs, vis) -> float:
    """Azimuth of the satellite closest to the horizon among those visible now."""
    best_el = 999.0
    best_az = 0.0
    for alt, az, flags in zip(alts, azs, vis):
        if not flags[index]:
            continue
        if alt[index] < best_el:
            best_el = float(alt[index])
            best_az = float(az[index])
    return best_az % 360.0


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def predict(rows_by_train: list[tuple[str, list[dict]]], now: datetime) -> list[dict]:
    # Keep the JPL kernel out of the repo. `load` reads this when it is imported.
    os.environ.setdefault("SKYFIELD_DATA", os.path.expanduser("~/skyfield-data"))
    import numpy as np
    from skyfield.api import load, wgs84
    from skyfield.api import EarthSatellite

    ts = load.timescale()
    eph = load("de421.bsp")
    sun = eph["sun"]
    earth = eph["earth"]
    topos = wgs84.latlon(OBSERVER_LAT, OBSERVER_LON, elevation_m=OBSERVER_ELEV_M)

    n = int(HORIZON.total_seconds() / STEP_S) + 1
    t0 = ts.from_datetime(now)
    tts = t0.tt + (STEP_S / 86400.0) * np.arange(n)
    times = ts.tt_jd(tts)
    when = [t.utc_datetime().replace(tzinfo=timezone.utc) for t in times]

    sun_alt, _, _ = (earth + topos).at(times).observe(sun).apparent().altaz()
    dark = sun_alt.degrees < SUN_DEG

    passes = []
    for des, rows in rows_by_train:
        alts = []
        azs = []
        vis = []
        for row in rows:
            try:
                sat = EarthSatellite.from_omm(ts, _omm_fields(row))
                alt, az, _dist = (sat - topos).at(times).altaz()
                lit = sat.at(times).is_sunlit(eph)
            except Exception as exc:  # a bad element should not sink the file
                print(f"skip {row.get('OBJECT_NAME')} ({exc})", file=sys.stderr)
                continue
            el = np.asarray(alt.degrees, dtype=float)
            good = np.isfinite(el) & (el >= MIN_EL) & np.asarray(lit, dtype=bool) & dark
            alts.append(el)
            azs.append(np.asarray(az.degrees, dtype=float) % 360.0)
            vis.append(good)
        for entry in assemble_passes(when, alts, azs, vis):
            entry["launch"] = des
            passes.append(entry)
    passes.sort(key=lambda p: p["peak"])
    return passes[:8]


def _omm_fields(row: dict) -> dict:
    fields = dict(row)
    epoch = fields.get("EPOCH") or ""
    if epoch and "." not in epoch:
        fields["EPOCH"] = epoch + ".000000"
    return fields


def load_spacetrack_gp(now: datetime) -> list[dict]:
    identity = os.environ.get("SPACETRACK_IDENTITY", "").strip()
    password = os.environ.get("SPACETRACK_PASSWORD", "").strip()
    if not identity or not password:
        raise RuntimeError(
            "CelesTrak SupGP failed and Space-Track secrets are not set "
            "(SPACETRACK_IDENTITY, SPACETRACK_PASSWORD)"
        )
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    form = urllib.parse.urlencode({"identity": identity, "password": password}).encode()
    req = urllib.request.Request(SPACETRACK_LOGIN, data=form, headers={"User-Agent": UA})
    with opener.open(req, timeout=60) as resp:
        resp.read()
    if not any(cookie.name for cookie in jar):
        raise RuntimeError("Space-Track login did not return a session cookie")
    day = (now - LAUNCH_AGE).strftime("%Y-%m-%d")
    cat_body = http_get(SPACETRACK_SATCAT.format(day=day), opener=opener)
    catalog = json.loads(cat_body)
    designators = []
    for rec in catalog:
        oid = rec.get("OBJECT_ID") or rec.get("INTLDES") or ""
        des = launch_id(oid)
        if des and des not in designators:
            designators.append(des)
    rows: list[dict] = []
    # OMM-shaped keys Space-Track's JSON GP class already uses.
    keep = {
        "OBJECT_NAME", "OBJECT_ID", "EPOCH", "MEAN_MOTION", "ECCENTRICITY",
        "INCLINATION", "RA_OF_ASC_NODE", "ARG_OF_PERICENTER", "MEAN_ANOMALY",
        "EPHEMERIS_TYPE", "CLASSIFICATION_TYPE", "NORAD_CAT_ID", "ELEMENT_SET_NO",
        "REV_AT_EPOCH", "BSTAR", "MEAN_MOTION_DOT", "MEAN_MOTION_DDOT",
    }
    for des in designators[:6]:
        time.sleep(1.0)
        body = http_get(SPACETRACK_GP.format(des=urllib.parse.quote(des)), opener=opener)
        for rec in json.loads(body):
            name = str(rec.get("OBJECT_NAME") or "")
            if not name.startswith("STARLINK"):
                continue
            row = {k: str(rec.get(k, "")).strip() for k in keep}
            if row["OBJECT_ID"] and row["MEAN_MOTION"]:
                rows.append(row)
    if not rows:
        raise RuntimeError("Space-Track returned no Starlink elements for the last 10 days")
    return rows


def build_document(now: datetime) -> dict:
    source = "celestrak-spacex-e"
    try:
        rows = load_celestrak_gp()
    except Exception as exc:
        print(f"primary elements failed: {exc}", file=sys.stderr)
        print("trying Space-Track", file=sys.stderr)
        rows = load_spacetrack_gp(now)
        source = "spacetrack"
    groups = group_by_launch(rows)
    considered = trains_within_age(groups, now)
    kept = [(c["launch"], c["rows"]) for c in considered if c["keep"]]
    passes = predict(kept, now) if kept else []
    # Tag passes with the launch id predict() already stored.
    return {
        "v": 1,
        "generated": _iso(now),
        "source": source,
        "observer": {
            "lat": OBSERVER_LAT,
            "lon": OBSERVER_LON,
            "elevM": OBSERVER_ELEV_M,
            "tz": TZ_NAME,
        },
        "criteria": {
            "maxLaunchAgeDays": 10,
            "clusterDeg": CLUSTER_DEG,
            "minCluster": MIN_CLUSTER,
            "minFraction": MIN_FRACTION,
            "sunDeg": SUN_DEG,
            "minEl": MIN_EL,
            "minVisible": MIN_VISIBLE,
        },
        "considered": [
            {
                "launch": c["launch"],
                "name": c["name"],
                "published": c["published"],
                "clustered": c["clustered"],
                "keep": c["keep"],
                "reason": c["reason"],
            }
            for c in considered
        ],
        "passes": passes,
    }


def write_stable(path: str, doc: dict) -> bool:
    """Write JSON. Keep the previous `generated` when nothing else changed.

    Returns True when the file on disk gained new contents.
    """
    previous = None
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as fh:
                previous = json.load(fh)
        except (OSError, json.JSONDecodeError):
            previous = None
    if isinstance(previous, dict):
        prev_body = {k: v for k, v in previous.items() if k != "generated"}
        new_body = {k: v for k, v in doc.items() if k != "generated"}
        if prev_body == new_body:
            doc["generated"] = previous.get("generated", doc["generated"])
    text = json.dumps(doc, indent=2) + "\n"
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(text)
    os.replace(tmp, path)
    if previous is None:
        return True
    return {k: v for k, v in previous.items() if k != "generated"} != {
        k: v for k, v in doc.items() if k != "generated"
    }


def self_test() -> None:
    assert compass8(0) == "N"
    assert compass8(22.4) == "N"
    assert compass8(22.5) == "NE"
    assert compass8(90) == "E"
    assert compass8(180) == "S"
    assert compass8(315) == "NW"
    assert compass8(337.5) == "N"
    assert compass8(-10) == "N"

    rows = [{"ARG_OF_PERICENTER": "0", "MEAN_ANOMALY": str(a), "id": a}
            for a in (350, 0, 10, 20, 180)]
    cluster = largest_cluster(rows, arglat, 40)
    assert sorted(r["id"] for r in cluster) == [0, 10, 20, 350], cluster
    # A shell spread around the orbit does not collapse into one train.
    shell = [{"ARG_OF_PERICENTER": "0", "MEAN_ANOMALY": str(i * (360 / 24)), "id": i}
             for i in range(24)]
    spread = largest_cluster(shell, arglat, 40)
    assert len(spread) < 24 * MIN_FRACTION

    t0 = datetime(2026, 10, 14, 3, 0, tzinfo=timezone.utc)
    times = [t0 + timedelta(seconds=STEP_S * i) for i in range(20)]
    # Two satellites rise in the northwest and set in the southeast.
    alts, azs, vis = [], [], []
    for shift, peak in ((2, 42.0), (6, 36.0)):
        el = [0.0] * 20
        az = [0.0] * 20
        flags = [False] * 20
        for i in range(20):
            k = i - shift
            if 0 <= k <= 8:
                el[i] = 10.0 + (peak - 10.0) * (1.0 - abs(k - 4) / 4.0)
                az[i] = 315.0 + (135.0 - 315.0 + 360.0) * (k / 8.0)
                if az[i] >= 360.0:
                    az[i] -= 360.0
                flags[i] = el[i] >= MIN_EL
        alts.append(el)
        azs.append(az)
        vis.append(flags)
    # A third satellite fills MIN_VISIBLE, same geometry, between the two.
    el = [0.0] * 20
    az = [0.0] * 20
    flags = [False] * 20
    for i in range(20):
        k = i - 4
        if 0 <= k <= 8:
            el[i] = 10.0 + 20.0 * (1.0 - abs(k - 4) / 4.0)
            az[i] = 315.0 + (180.0) * (k / 8.0)
            if az[i] >= 360.0:
                az[i] -= 360.0
            flags[i] = el[i] >= MIN_EL
    alts.append(el)
    azs.append(az)
    vis.append(flags)
    passes = assemble_passes(times, alts, azs, vis)
    assert len(passes) == 1, passes
    assert passes[0]["from"] == "NW", passes[0]
    assert passes[0]["to"] == "SE", passes[0]
    assert passes[0]["maxEl"] == 42, passes[0]
    assert passes[0]["count"] == 3
    assert passes[0]["peak"] == "2026-10-14T03:03:00Z"
    print("self-test ok")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", help="path to write starlink.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        self_test()
        if not args.out:
            return 0
    if not args.out:
        parser.error("--out is required unless --self-test is given alone")
    now = datetime.now(timezone.utc).replace(microsecond=0)
    doc = build_document(now)
    changed = write_stable(args.out, doc)
    n = len(doc["passes"])
    print(f"source {doc['source']}: {n} pass(es), considered {len(doc['considered'])}, "
          f"{'updated' if changed else 'unchanged'} -> {args.out}")
    for p in doc["passes"]:
        print(f"  {p['peak']}  {p['maxEl']} deg  {p['from']} > {p['to']}  ~{p['count']}  {p['launch']}")
    if not doc["passes"]:
        for c in doc["considered"]:
            print(f"  {c['launch']} {c['name']}: published {c['published']}, "
                  f"clustered {c['clustered']} ({c['reason'] or 'kept, no visible pass'})")
    return 0


if __name__ == "__main__":
    sys.exit(main())

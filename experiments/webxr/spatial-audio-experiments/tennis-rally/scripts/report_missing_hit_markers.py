#!/usr/bin/env python3
"""
Reports every shot in the recorded match data where motions[] independently confirms a real
racket hit occurred (arc_type == "Hit", with real speed/stroke data) but none of that shot's
frames carry the frame-level ball.event_marker == "Hit" tag a consumer would otherwise rely on
to detect the contact instant.

This is a genuine, checkable data-quality gap, not a guess: motions[] and frames[] are two
independent fields in the same export, and for these shots they disagree with each other about
whether/when a "Hit" happened.

Usage: python3 scripts/report_missing_hit_markers.py [path-to-json]
Defaults to public/reference-data/sample_tennis_data_v4.json.
"""
import json
import sys
from pathlib import Path

DEFAULT_PATH = Path(__file__).parent.parent / "public" / "reference-data" / "sample_tennis_data_v4.json"
BEFORE = 2  # frames to show before the shot's first frame
AFTER = 4  # frames to show from the shot's first frame onward


def fmt_vel(vel):
    if not vel:
        return "None"
    return f"({vel[0]:+.2f},{vel[1]:+.2f},{vel[2]:+.2f})"


def fmt_frame(frames, i, t0, marker_note=""):
    f = frames[i]
    t = (parse_ts(f["ts"]) - t0)
    b = f.get("ball")
    if not b:
        return f"  i={i:5d} t={t:6.2f}s  (no ball data -- between-point dead time)"
    marker = b.get("event_marker") or "-"
    return f"  i={i:5d} t={t:6.2f}s seg={b.get('segment')} shot={b.get('shot')} arc={b.get('arc')} marker={marker:8s} vel={fmt_vel(b.get('vel'))}{marker_note}"


def parse_ts(ts):
    from datetime import datetime
    return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%S.%fZ").timestamp()


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH
    with open(path) as f:
        data = json.load(f)

    frames = data["frames"]
    motions = data["motions"]
    t0 = parse_ts(frames[0]["ts"])

    hit_arcs = {}  # (segment, shot) -> motions[] Hit entry
    for m in motions:
        if m.get("arc_type") == "Hit":
            hit_arcs[(m["segment"], m["shot"])] = m

    frame_indices_by_shot = {}  # (segment, shot) -> [frame indices], in file order
    for i, f in enumerate(frames):
        b = f.get("ball")
        if not b or b.get("segment") is None or b.get("shot") is None:
            continue
        frame_indices_by_shot.setdefault((b["segment"], b["shot"]), []).append(i)

    missing = []
    for key in sorted(hit_arcs):
        indices = frame_indices_by_shot.get(key, [])
        has_marker = any(frames[i]["ball"].get("event_marker") == "Hit" for i in indices)
        if not has_marker:
            missing.append((key, indices))

    print(f"# Missing Hit-marker report")
    print(f"# source: {path}")
    print(f"# motions[] Hit arcs (real hits, confirmed by speed/stroke data): {len(hit_arcs)}")
    print(f"# of those, shots with ZERO frame tagged event_marker=='Hit': {len(missing)}")
    print()

    for (segment, shot), indices in missing:
        motion = hit_arcs[(segment, shot)]
        speed = motion.get("speed", {}).get("mps")
        stroke = motion.get("stroke")
        side = motion.get("side")
        print(f"--- segment={segment} shot={shot}: motions[] confirms Hit ({stroke}, {side}, {speed} m/s) -- 0/{len(indices)} frames marked Hit ---")
        if not indices:
            print("  (no frames found for this segment/shot at all)")
            print()
            continue
        first = indices[0]
        for i in range(max(0, first - BEFORE), first):
            print(fmt_frame(frames, i, t0))
        for i in range(first, min(len(frames), first + AFTER)):
            note = "   <- shot starts here, ball direction should reverse; no Hit marker present" if i == first else ""
            print(fmt_frame(frames, i, t0, note))
        print()


if __name__ == "__main__":
    main()

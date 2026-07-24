const DATA_URL = "./reference-data/sample_tennis_data_v4.json";

// Recorded axes (meters, court-centered): x = along court length, y = lateral, z = height.
// This project's Babylon scene: Y = up, Z = along court length, X = lateral. So the remap is
// recorded x -> Babylon z, recorded y -> Babylon x, recorded z -> Babylon y. See
// reference-data/tennis-tracking-data-format.md's "Coordinate system" section for how this was
// inferred from the data's own value ranges (sanity-checked against this project's own court
// dimensions during design, not just assumed).
const remapPoint = (raw) => {
  if (!raw) return null;
  const [rx, ry, rz] = raw;
  if (rx == null || ry == null || rz == null) return null;
  return { x: ry, y: rz, z: rx };
};

const RACKET_JOINT_INDEX = { handle: 13, shaft: 14, head: 15, rightEdge: 16, leftEdge: 17, rightCorner: 18, leftCorner: 19 };

// frames is sorted by tSec ascending — binary search for the frame whose tSec is closest to a
// given target, rather than scanning linearly every time this is needed.
const findClosestFrameIndex = (frames, targetSec) => {
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].tSec < targetSec) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(frames[lo - 1].tSec - targetSec) < Math.abs(frames[lo].tSec - targetSec)) return lo - 1;
  return lo;
};

// The "sweet spot" of a racket isn't directly recorded — approximate it as the midpoint of the
// strung area (corners, then edges, then the head alone) with graceful fallback toward the
// handle if the outer frame joints are occluded that frame.
const pickRacketCenter = (joints) => {
  const { rightCorner, leftCorner, rightEdge, leftEdge, head, handle } = RACKET_JOINT_INDEX;
  const mid = (a, b) => (joints[a] && joints[b] ? { x: (joints[a].x + joints[b].x) / 2, y: (joints[a].y + joints[b].y) / 2, z: (joints[a].z + joints[b].z) / 2 } : null);
  return mid(rightCorner, leftCorner) || mid(rightEdge, leftEdge) || joints[head] || joints[handle] || null;
};

let cachedPromise = null;

// Lazily fetches, parses, and precomputes the recorded match data exactly once — subsequent
// calls (e.g. switching Replay Loop off and back on) reuse the same cached, already-processed
// result instead of re-fetching the 22.8MB file or re-running the remap/index passes.
export const getReplayData = () => {
  if (!cachedPromise) cachedPromise = load();
  return cachedPromise;
};

const load = async () => {
  const response = await fetch(DATA_URL);
  const raw = await response.json();

  const t0 = Date.parse(raw.frames[0].ts);
  const frames = raw.frames.map((f) => ({
    tSec: (Date.parse(f.ts) - t0) / 1000,
    segment: f.ball?.segment ?? null,
    shot: f.ball?.shot ?? null,
    eventMarker: f.ball?.event_marker ?? null,
    hitterId: f.hitter ?? null,
    receiverId: f.receiver ?? null,
    ball: f.ball
      ? { position: remapPoint(f.ball.pos), velocity: remapPoint(f.ball.vel) }
      : null,
    players: (f.players || []).map((p) => ({
      objectId: p.objectId,
      joints: (p.joints || []).map(remapPoint)
    }))
  }));

  // Only "Hit" arcs carry speed/spin/stroke — index those by "segment:shot" for O(1) lookup
  // from a triggering frame, since that's the only thing a racket-hit event needs from motions[].
  const hitInfoByShotKey = new Map();
  for (const m of raw.motions) {
    if (m.arc_type !== "Hit") continue;
    hitInfoByShotKey.set(`${m.segment}:${m.shot}`, {
      speedMps: m.speed?.mps ?? null,
      spinType: m.spin?.type ?? null,
      spinRpm: m.spin?.rpm ?? null,
      stroke: m.stroke ?? null,
      side: m.side ?? null
    });
  }

  // Per-segment near/far assignment (not one global mapping) — ends can change between games,
  // and even within this short sample it costs nothing to compute this per point rather than
  // assume it holds for the whole file. "near" is this project's convention for the +Z baseline
  // (see TennisSimulation.js), which lines up directly with recorded x (no sign flip needed)
  // since recorded x -> Babylon z is a straight remap.
  const segmentNumbers = [...new Set(frames.map((f) => f.segment).filter((s) => s != null))].sort((a, b) => a - b);
  const nearFarBySegment = new Map();
  for (const segment of segmentNumbers) {
    const firstFrame = frames.find((f) => f.segment === segment && f.players.length === 2);
    const sideByObjectId = new Map();
    if (firstFrame) {
      for (const p of firstFrame.players) {
        const validZ = p.joints.filter(Boolean).map((j) => j.z);
        if (validZ.length) sideByObjectId.set(p.objectId, validZ.reduce((a, b) => a + b, 0) / validZ.length);
      }
    }
    const entries = [...sideByObjectId.entries()];
    const nearEntry = entries.find(([, z]) => z >= 0);
    const farEntry = entries.find(([, z]) => z < 0);
    nearFarBySegment.set(segment, {
      near: nearEntry?.[0] ?? entries[0]?.[0] ?? null,
      far: farEntry?.[0] ?? entries[1]?.[0] ?? null
    });
  }

  // The recorded file has zero dropped/missing frames (confirmed via
  // scripts/analyze-replay-sections.js), but most of it is between-point dead time —
  // changeovers, ball retrieval, players resetting — not active rally. Looping the whole file
  // would mean sitting through tens of seconds of near-nothing on every lap. Instead, pick the
  // single segment (point) with the longest span and loop on just that one — the same
  // "longest continuous section" logic scripts/analyze-replay-sections.js reports on demand,
  // computed here automatically so this stays correct if the underlying data file ever changes.
  const spanBySegment = new Map(); // segment -> { startIndex, endIndex, startSec, endSec }
  frames.forEach((f, i) => {
    if (f.segment == null) return;
    if (!spanBySegment.has(f.segment)) spanBySegment.set(f.segment, { startIndex: i, endIndex: i, startSec: f.tSec, endSec: f.tSec });
    const span = spanBySegment.get(f.segment);
    span.endIndex = i;
    span.endSec = f.tSec;
  });
  const longestSpan = [...spanBySegment.values()].sort((a, b) => (b.endSec - b.startSec) - (a.endSec - a.startSec))[0];

  // A recorded point's final shot is often followed by one more "shot" number covering the
  // dead ball settling after the last real racket contact (an unreturned shot bouncing out) —
  // not part of the rally, and since it has no Hit of its own, it reads as a confusing pause
  // rather than the point's actual conclusion. Trim the loop to end at the last frame of the
  // highest-numbered shot that has a real Hit (per hitInfoByShotKey, built from motions[] —
  // see the note on eventInstants below for why the frame-level event_marker isn't used for
  // this), discarding any trailing shot number(s) entirely.
  let lastHitShot = null;
  for (let i = longestSpan.startIndex; i <= longestSpan.endIndex; i++) {
    const f = frames[i];
    if (f.segment != null && f.shot != null && hitInfoByShotKey.has(`${f.segment}:${f.shot}`)) lastHitShot = f.shot;
  }
  let loopEndIndex = longestSpan.endIndex;
  if (lastHitShot != null) {
    for (let i = longestSpan.endIndex; i >= longestSpan.startIndex; i--) {
      if (frames[i].shot === lastHitShot) {
        loopEndIndex = i;
        break;
      }
    }
  }

  const loopStartIndex = longestSpan.startIndex;
  const loopStartSec = longestSpan.startSec;
  const loopDurationSec = frames[loopEndIndex].tSec - loopStartSec;

  // The frame-level ball.event_marker field turns out to be sparse and unreliable as a hit/bounce
  // trigger — scripts/report_missing_hit_markers.py found 20 of 38 real hits (motions[] arc_type
  // == "Hit", with real speed/stroke data) never get a matching per-frame "Hit" marker at all,
  // and bounces have the same gap. motions[] itself is complete and authoritative, so build the
  // real event timeline from *that* instead: one instant per Hit/Bounce arc, at its ts_start,
  // resolved to the nearest actual frame (verified against a known case: a Hit arc's ts_start
  // landed within 14ms of the frame where ball velocity visibly reverses — well under one
  // recorded frame at 50Hz). Only instants inside the (possibly trimmed) loop window are kept.
  const eventInstants = raw.motions
    .filter((m) => m.arc_type === "Hit" || m.arc_type === "Bounce")
    .map((m) => ({ tSec: (Date.parse(m.ts_start) - t0) / 1000, type: m.arc_type, segment: m.segment, shot: m.shot }))
    .filter((e) => e.tSec >= loopStartSec)
    .map((e) => ({ ...e, frameIndex: findClosestFrameIndex(frames, e.tSec) }))
    .filter((e) => e.frameIndex >= loopStartIndex && e.frameIndex <= loopEndIndex)
    .sort((a, b) => a.tSec - b.tSec);

  return {
    frames,
    hitInfoByShotKey,
    nearFarBySegment,
    eventInstants,
    loopStartIndex,
    loopEndIndex,
    loopStartSec,
    loopDurationSec,
    pickRacketCenter
  };
};

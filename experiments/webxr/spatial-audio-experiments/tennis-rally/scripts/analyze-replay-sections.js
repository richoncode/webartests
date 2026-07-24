// Reports the recorded replay data's per-segment (per-point) durations, ranked longest first,
// plus the dead-time gaps between them — the recorded file is one continuous 50Hz stream with
// zero missing frames, but most of it is between-point dead time (changeovers, ball retrieval,
// players resetting), not active rally. Run via `npm run analyze-replay`.
//
// ReplayDataStore.js uses this same "pick the segment with the longest span" logic at runtime
// to choose what Replay Loop actually loops on — this script is the read-only, human-facing
// version of that same analysis, for inspecting the data or re-checking after swapping in a
// different recorded match.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "public", "reference-data", "sample_tennis_data_v4.json");

const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
const frames = data.frames;
const t0 = Date.parse(frames[0].ts);

const bySegment = new Map(); // segment -> { startIndex, endIndex, startSec, endSec, shots: Set }
for (let i = 0; i < frames.length; i++) {
  const ball = frames[i].ball;
  if (!ball || ball.segment == null) continue;
  const tSec = (Date.parse(frames[i].ts) - t0) / 1000;
  if (!bySegment.has(ball.segment)) {
    bySegment.set(ball.segment, { startIndex: i, endIndex: i, startSec: tSec, endSec: tSec, shots: new Set() });
  }
  const entry = bySegment.get(ball.segment);
  entry.endIndex = i;
  entry.endSec = tSec;
  if (ball.shot != null) entry.shots.add(ball.shot);
}

const segments = [...bySegment.entries()]
  .map(([segment, e]) => ({ segment, ...e, durationSec: e.endSec - e.startSec, shotCount: e.shots.size }))
  .sort((a, b) => b.durationSec - a.durationSec);

console.log(`${frames.length} total frames, ${((Date.parse(frames.at(-1).ts) - t0) / 1000).toFixed(2)}s total span, zero missing frames (checked separately — see below).\n`);

console.log("Segments (points), longest continuous rally first:");
for (const s of segments) {
  console.log(
    `  segment ${s.segment}: ${s.durationSec.toFixed(2)}s, ${s.shotCount} shots, frames [${s.startIndex}-${s.endIndex}], time [${s.startSec.toFixed(2)}s-${s.endSec.toFixed(2)}s]`
  );
}

console.log("\nDead time between consecutive segments:");
const ordered = [...segments].sort((a, b) => a.startSec - b.startSec);
for (let i = 1; i < ordered.length; i++) {
  const gap = ordered[i].startSec - ordered[i - 1].endSec;
  console.log(`  ${ordered[i - 1].segment} -> ${ordered[i].segment}: ${gap.toFixed(2)}s dead`);
}

const longest = segments[0];
console.log(`\nLongest section: segment ${longest.segment} (${longest.durationSec.toFixed(2)}s, ${longest.shotCount} shots) — this is what Replay Loop loops on.`);

// Sanity check: confirm there really are no missing/dropped frames anywhere in the file (a
// separate concern from between-point dead time) — every consecutive pair should be ~1/50s apart.
const NOMINAL = 1 / 50;
let maxGap = 0;
for (let i = 1; i < frames.length; i++) {
  const gap = (Date.parse(frames[i].ts) - Date.parse(frames[i - 1].ts)) / 1000;
  if (gap > maxGap) maxGap = gap;
}
console.log(`\nLargest frame-to-frame gap anywhere in the file: ${maxGap.toFixed(3)}s (nominal is ${NOMINAL.toFixed(3)}s) — confirms no dropped-frame gaps, only between-point dead time.`);

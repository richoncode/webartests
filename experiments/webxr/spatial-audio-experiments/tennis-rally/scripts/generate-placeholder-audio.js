// Synthesizes small placeholder WAV files for the tennis-rally demo: racket-hit and
// floor-bounce percussive clips, plus a few reverb impulse responses. Run once via
// `npm run generate-audio` — the outputs are checked into public/audio/ so the app runs
// out of the box; swap any of these files (same filename) with real recordings later.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_AUDIO = join(__dirname, "..", "public", "audio");
const SAMPLE_RATE = 44100;

const encodeWav = (samples, sampleRate = SAMPLE_RATE) => {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
};

const normalize = (samples, target = 0.92) => {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak === 0) return samples;
  const scale = target / peak;
  return samples.map((s) => s * scale);
};

// One-pole lowpass, used to color white noise into something less harsh than raw hiss.
const lowpass = (samples, cutoffHz) => {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let prev = 0;
  return samples.map((s) => {
    prev = prev + alpha * (s - prev);
    return prev;
  });
};

const durationSamples = (seconds) => Math.floor(seconds * SAMPLE_RATE);

// A short, percussive impact: filtered noise burst (the "crack") layered with a brief tonal
// thump (the body), both under a fast-attack/exponential-decay envelope.
const makeImpactClip = ({ durationSec, noiseCutoffHz, thumpHz, decayTau, thumpAmount }) => {
  const n = durationSamples(durationSec);
  const noise = lowpass(
    Array.from({ length: n }, () => Math.random() * 2 - 1),
    noiseCutoffHz
  );
  const samples = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t / decayTau) * Math.min(1, t / 0.001);
    const thump = Math.sin(2 * Math.PI * thumpHz * t) * Math.exp(-t / (decayTau * 0.6));
    samples[i] = envelope * (noise[i] * (1 - thumpAmount) + thump * thumpAmount);
  }
  return normalize(samples);
};

const makeImpulseResponse = ({ durationSec, decayTau, earlyReflections }) => {
  const n = durationSamples(durationSec);
  const samples = new Array(n).fill(0);
  for (const [delaySec, gain] of earlyReflections) {
    const idx = Math.floor(delaySec * SAMPLE_RATE);
    if (idx < n) samples[idx] += gain;
  }
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] += (Math.random() * 2 - 1) * Math.exp(-t / decayTau);
  }
  return normalize(lowpass(samples, 6000), 0.85);
};

mkdirSync(join(PUBLIC_AUDIO, "racket"), { recursive: true });
mkdirSync(join(PUBLIC_AUDIO, "floor"), { recursive: true });
mkdirSync(join(PUBLIC_AUDIO, "impulse-responses"), { recursive: true });

const racketClips = [
  { name: "racket-hit-1.wav", noiseCutoffHz: 3200, thumpHz: 220, decayTau: 0.045, thumpAmount: 0.35, durationSec: 0.18 },
  { name: "racket-hit-2.wav", noiseCutoffHz: 2600, thumpHz: 190, decayTau: 0.05, thumpAmount: 0.4, durationSec: 0.2 },
  { name: "racket-hit-3.wav", noiseCutoffHz: 3800, thumpHz: 250, decayTau: 0.04, thumpAmount: 0.3, durationSec: 0.16 }
];
for (const clip of racketClips) {
  writeFileSync(join(PUBLIC_AUDIO, "racket", clip.name), encodeWav(makeImpactClip(clip)));
}

const floorClips = [
  { name: "floor-bounce-1.wav", noiseCutoffHz: 900, thumpHz: 95, decayTau: 0.09, thumpAmount: 0.55, durationSec: 0.3 },
  { name: "floor-bounce-2.wav", noiseCutoffHz: 750, thumpHz: 85, decayTau: 0.1, thumpAmount: 0.6, durationSec: 0.32 },
  { name: "floor-bounce-3.wav", noiseCutoffHz: 1050, thumpHz: 105, decayTau: 0.08, thumpAmount: 0.5, durationSec: 0.28 }
];
for (const clip of floorClips) {
  writeFileSync(join(PUBLIC_AUDIO, "floor", clip.name), encodeWav(makeImpactClip(clip)));
}

const impulseResponses = [
  { name: "small-room.wav", durationSec: 0.45, decayTau: 0.09, earlyReflections: [[0.006, 0.4], [0.013, 0.25], [0.021, 0.15]] },
  { name: "outdoor-court.wav", durationSec: 0.6, decayTau: 0.14, earlyReflections: [[0.02, 0.2], [0.045, 0.1]] },
  { name: "stadium.wav", durationSec: 1.6, decayTau: 0.4, earlyReflections: [[0.03, 0.3], [0.07, 0.22], [0.12, 0.16], [0.2, 0.1]] }
];
for (const ir of impulseResponses) {
  writeFileSync(join(PUBLIC_AUDIO, "impulse-responses", ir.name), encodeWav(makeImpulseResponse(ir)));
}

console.log(`Generated ${racketClips.length} racket clips, ${floorClips.length} floor clips, ${impulseResponses.length} impulse responses in ${PUBLIC_AUDIO}`);

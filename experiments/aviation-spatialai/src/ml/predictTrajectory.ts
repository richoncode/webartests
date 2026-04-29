import * as tf from '@tensorflow/tfjs';
import type { FlightHistoryPoint } from '../data/types';

/**
 * Predict the next `horizonSeconds` of (lat, lon, alt) using independent
 * linear regressions of each coordinate against time. Cheap; matches the
 * spec's "simple linear regression in TensorFlow.js" requirement and lets
 * us project a smooth 4D curtain.
 *
 * Returns a list of (t, lat, lon, alt) sample points, one per `stepSeconds`.
 */
export interface PredictedPoint { t: number; lat: number; lon: number; altM: number; }

export function predictTrajectory(
  history: FlightHistoryPoint[],
  horizonSeconds = 300,
  stepSeconds = 15,
): PredictedPoint[] {
  if (history.length < 2) return [];

  // Use only recent history (last 2 minutes) — keeps the regression responsive
  // when the aircraft turns or climbs.
  const cutoff = history[history.length - 1].t - 120;
  const recent = history.filter((p) => p.t >= cutoff);
  if (recent.length < 2) recent.push(...history.slice(-2));

  // tf.tidy can only return Tensor / TensorContainer types — extract scalars
  // (.m, .b) inside it, build PredictedPoint[] outside.
  const t0 = recent[0].t;
  const fits = tf.tidy(() => {
    const xs = tf.tensor1d(recent.map((p) => p.t - t0));
    return {
      lat: linearFit(xs, tf.tensor1d(recent.map((p) => p.lat))),
      lon: linearFit(xs, tf.tensor1d(recent.map((p) => p.lon))),
      alt: linearFit(xs, tf.tensor1d(recent.map((p) => p.altM))),
    };
  });

  const tNow = recent[recent.length - 1].t;
  const out: PredictedPoint[] = [];
  for (let dt = 0; dt <= horizonSeconds; dt += stepSeconds) {
    const x = tNow + dt - t0;
    out.push({
      t: tNow + dt,
      lat: fits.lat.m * x + fits.lat.b,
      lon: fits.lon.m * x + fits.lon.b,
      altM: Math.max(0, fits.alt.m * x + fits.alt.b),
    });
  }
  return out;
}

/** Closed-form OLS fit y = m·x + b with TF.js. Returns plain JS scalars. */
function linearFit(xs: tf.Tensor1D, ys: tf.Tensor1D): { m: number; b: number } {
  const xMean = xs.mean();
  const yMean = ys.mean();
  const xCent = xs.sub(xMean);
  const yCent = ys.sub(yMean);
  const mTensor = xCent.mul(yCent).sum().div(xCent.square().sum().add(1e-9));
  const bTensor = yMean.sub(mTensor.mul(xMean));
  return { m: mTensor.dataSync()[0], b: bTensor.dataSync()[0] };
}

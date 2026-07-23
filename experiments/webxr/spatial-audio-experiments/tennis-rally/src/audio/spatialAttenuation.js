// The standard Web Audio PannerNode distance-attenuation formulas, reimplemented in plain JS
// so the tuning UI's preview graph can plot "what will this actually sound like" without
// needing a live sound to probe. Babylon's spatialSound options map straight onto these same
// three models, so keeping one shared implementation is what keeps the graph honest.

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

// venueScale stretches/shrinks the *perceived* world: audioDistance = worldDistance * venueScale.
// Babylon has no such knob, so it's applied here (and mirrored in BallAudio) by dividing the
// reference/max distances by venueScale, which is mathematically equivalent — see README.
export const scaledSpatialParams = (spatial) => ({
  refDistance: spatial.minDistance / spatial.venueScale,
  maxDistance: spatial.maxDistance / spatial.venueScale,
  rolloffFactor: spatial.rolloffFactor,
  distanceModel: spatial.distanceModel
});

export const computeAttenuation = (distance, spatial) => {
  const { refDistance, maxDistance, rolloffFactor, distanceModel } = scaledSpatialParams(spatial);
  const d = Math.max(distance, 0);

  if (distanceModel === "linear") {
    const ref = Math.min(refDistance, maxDistance);
    const max = Math.max(refDistance, maxDistance);
    if (max === ref) return d <= ref ? 1 : 0;
    const clampedDistance = Math.min(Math.max(d, ref), max);
    return 1 - rolloffFactor * ((clampedDistance - ref) / (max - ref));
  }

  if (distanceModel === "exponential") {
    const clampedDistance = Math.max(d, refDistance);
    if (refDistance === 0) return 0;
    return Math.pow(clampedDistance / refDistance, -rolloffFactor);
  }

  // inverse (default)
  const clampedDistance = Math.max(d, refDistance);
  return refDistance / (refDistance + rolloffFactor * (clampedDistance - refDistance));
};

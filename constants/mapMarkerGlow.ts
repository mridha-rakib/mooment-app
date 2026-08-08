/**
 * Central configuration for Map marker glow brightness (check-in count) and
 * live-event pulse. Values here are the single source of truth — do not
 * duplicate them inline in components.
 */
export const MAP_MARKER_GLOW_CONFIG = {
  /** Checked-in count at/below which brightness is unscaled (1.0x). */
  checkInCountFloor: 0,
  /** Checked-in count at/above which brightness stops increasing. */
  checkInCountCap: 30,
  /** Brightness multiplier applied at the checked-in count floor. */
  minBrightnessMultiplier: 1.0,
  /** Brightness multiplier applied at the checked-in count cap. */
  maxBrightnessMultiplier: 1.5,
  /** Final opacity never exceeds this value, regardless of brightness/pulse. */
  maxOpacity: 1.0,
  /** Live pulse brightens the computed base opacity by up to this multiplier. */
  livePulsePeakMultiplier: 1.15,
  /** Duration of the live-pulse brighten leg. */
  livePulseBrightenDurationMs: 900,
  /** Duration of the live-pulse dim leg. */
  livePulseDimDurationMs: 900,
} as const;

/**
 * Normalizes a raw checked-in count into a valid, clamped number.
 * Missing/undefined/null/negative/NaN/non-finite/non-numeric values resolve
 * to the configured floor (0); valid values are clamped to the configured cap.
 */
export const normalizeCheckedInCount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MAP_MARKER_GLOW_CONFIG.checkInCountFloor;
  }

  return Math.min(
    Math.max(value, MAP_MARKER_GLOW_CONFIG.checkInCountFloor),
    MAP_MARKER_GLOW_CONFIG.checkInCountCap,
  );
};

/**
 * Linear brightness multiplier between minBrightnessMultiplier (at 0
 * checked-in) and maxBrightnessMultiplier (at the checked-in count cap).
 */
export const getCheckedInBrightnessMultiplier = (checkedInCount: unknown): number => {
  const normalizedCount = normalizeCheckedInCount(checkedInCount);
  const { checkInCountCap, minBrightnessMultiplier, maxBrightnessMultiplier } = MAP_MARKER_GLOW_CONFIG;

  return (
    minBrightnessMultiplier +
    (normalizedCount / checkInCountCap) * (maxBrightnessMultiplier - minBrightnessMultiplier)
  );
};

/**
 * Applies the checked-in brightness multiplier to an existing (pre-feature)
 * base glow opacity, capped at maxOpacity. At a checked-in count of 0 this
 * returns existingBaseOpacity unchanged.
 */
export const getMarkerGlowBaseOpacity = (existingBaseOpacity: number, checkedInCount: unknown): number => {
  const multiplier = getCheckedInBrightnessMultiplier(checkedInCount);

  return Math.min(existingBaseOpacity * multiplier, MAP_MARKER_GLOW_CONFIG.maxOpacity);
};

/**
 * The peak opacity a live marker's pulse brightens to, from a given base
 * opacity, capped at maxOpacity.
 */
export const getLivePulsePeakOpacity = (baseOpacity: number): number => {
  "worklet";

  return Math.min(baseOpacity * MAP_MARKER_GLOW_CONFIG.livePulsePeakMultiplier, MAP_MARKER_GLOW_CONFIG.maxOpacity);
};

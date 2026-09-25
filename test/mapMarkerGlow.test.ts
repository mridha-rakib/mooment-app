import assert from "node:assert/strict";
import test from "node:test";
import {
  MAP_MARKER_GLOW_CONFIG,
  getCheckedInBrightnessMultiplier,
  getLivePulsePeakOpacity,
  getMarkerGlowBaseOpacity,
  normalizeCheckedInCount,
} from "../constants/mapMarkerGlow";

test("normalizeCheckedInCount resolves missing/invalid inputs to zero", () => {
  assert.equal(normalizeCheckedInCount(undefined), 0);
  assert.equal(normalizeCheckedInCount(null), 0);
  assert.equal(normalizeCheckedInCount(-5), 0);
  assert.equal(normalizeCheckedInCount(Number.NaN), 0);
  assert.equal(normalizeCheckedInCount(Number.POSITIVE_INFINITY), 0);
  assert.equal(normalizeCheckedInCount(Number.NEGATIVE_INFINITY), 0);
  assert.equal(normalizeCheckedInCount("12"), 0);
  assert.equal(normalizeCheckedInCount("not a number"), 0);
  assert.equal(normalizeCheckedInCount({}), 0);
  assert.equal(normalizeCheckedInCount([]), 0);
  assert.equal(normalizeCheckedInCount(true), 0);
});

test("normalizeCheckedInCount clamps valid counts to the configured cap", () => {
  assert.equal(normalizeCheckedInCount(0), 0);
  assert.equal(normalizeCheckedInCount(15), 15);
  assert.equal(normalizeCheckedInCount(30), 30);
  assert.equal(normalizeCheckedInCount(31), 30);
  assert.equal(normalizeCheckedInCount(10_000), 30);
});

test("getCheckedInBrightnessMultiplier matches the approved formula at documented points", () => {
  assert.equal(getCheckedInBrightnessMultiplier(0), 1);
  assert.ok(Math.abs(getCheckedInBrightnessMultiplier(10) - 1.1667) < 0.0001);
  assert.ok(Math.abs(getCheckedInBrightnessMultiplier(20) - 1.3333) < 0.0001);
  assert.equal(getCheckedInBrightnessMultiplier(30), 1.5);
});

test("getCheckedInBrightnessMultiplier stays capped above 30 and normalizes invalid input to the floor multiplier", () => {
  assert.equal(getCheckedInBrightnessMultiplier(45), 1.5);
  assert.equal(getCheckedInBrightnessMultiplier(1000), 1.5);
  assert.equal(getCheckedInBrightnessMultiplier(undefined), 1);
  assert.equal(getCheckedInBrightnessMultiplier(null), 1);
  assert.equal(getCheckedInBrightnessMultiplier(Number.NaN), 1);
  assert.equal(getCheckedInBrightnessMultiplier(-1), 1);
});

test("getMarkerGlowBaseOpacity leaves the existing base opacity unchanged at zero check-ins", () => {
  assert.equal(getMarkerGlowBaseOpacity(0.5, 0), 0.5);
  assert.equal(getMarkerGlowBaseOpacity(0.7, 0), 0.7);
  assert.equal(getMarkerGlowBaseOpacity(0.4, 0), 0.4);
  assert.equal(getMarkerGlowBaseOpacity(0.5, undefined), 0.5);
  assert.equal(getMarkerGlowBaseOpacity(0.5, null), 0.5);
});

test("getMarkerGlowBaseOpacity scales linearly with checked-in count and never exceeds maxOpacity", () => {
  assert.ok(Math.abs(getMarkerGlowBaseOpacity(0.5, 10) - 0.5 * 1.1667) < 0.001);
  assert.ok(Math.abs(getMarkerGlowBaseOpacity(0.5, 20) - 0.5 * 1.3333) < 0.001);
  assert.equal(getMarkerGlowBaseOpacity(0.5, 30), 0.75);
  assert.equal(getMarkerGlowBaseOpacity(0.5, 1000), 0.75);

  // A base opacity high enough that the multiplier would exceed 1.0 must be capped.
  assert.equal(getMarkerGlowBaseOpacity(0.8, 30), 1);
  assert.ok(getMarkerGlowBaseOpacity(0.8, 30) <= MAP_MARKER_GLOW_CONFIG.maxOpacity);
});

test("getLivePulsePeakOpacity applies the approved peak multiplier and caps at 1.0", () => {
  assert.ok(Math.abs(getLivePulsePeakOpacity(0.5) - 0.575) < 0.0001);
  assert.equal(getLivePulsePeakOpacity(1), 1);
  assert.equal(getLivePulsePeakOpacity(0.95), 1);
  assert.ok(getLivePulsePeakOpacity(0.95) <= 1);
});

test("central config exposes the approved values used by the helpers", () => {
  assert.equal(MAP_MARKER_GLOW_CONFIG.checkInCountFloor, 0);
  assert.equal(MAP_MARKER_GLOW_CONFIG.checkInCountCap, 30);
  assert.equal(MAP_MARKER_GLOW_CONFIG.minBrightnessMultiplier, 1.0);
  assert.equal(MAP_MARKER_GLOW_CONFIG.maxBrightnessMultiplier, 1.5);
  assert.equal(MAP_MARKER_GLOW_CONFIG.maxOpacity, 1.0);
  assert.equal(MAP_MARKER_GLOW_CONFIG.livePulsePeakMultiplier, 1.15);
  assert.equal(MAP_MARKER_GLOW_CONFIG.livePulseBrightenDurationMs, 900);
  assert.equal(MAP_MARKER_GLOW_CONFIG.livePulseDimDurationMs, 900);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  clamp,
  clampStoryTransformPosition,
  clampStoryTransformScale,
  DEFAULT_IMAGE_TRANSFORM,
  hasValidStoryImageTransform,
  isDefaultStoryTransform,
  isFiniteStoryTransform,
  MAX_IMAGE_SCALE,
  MIN_IMAGE_SCALE,
  normalizeRotationDegrees,
  POSITION_BOUND_MAX,
  POSITION_BOUND_MIN,
} from "../lib/storyTransform";

test("DEFAULT_IMAGE_TRANSFORM reproduces the legacy centered full-cover state", () => {
  assert.deepEqual(DEFAULT_IMAGE_TRANSFORM, { x: 0.5, y: 0.5, scale: 1, rotation: 0 });
});

test("clamp keeps values within [min, max] and passes through in-range values", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
});

test("clampStoryTransformPosition clamps to the documented off-canvas allowance", () => {
  assert.equal(clampStoryTransformPosition(POSITION_BOUND_MIN - 1), POSITION_BOUND_MIN);
  assert.equal(clampStoryTransformPosition(POSITION_BOUND_MAX + 1), POSITION_BOUND_MAX);
  assert.equal(clampStoryTransformPosition(0.5), 0.5);
});

test("clampStoryTransformScale clamps a pinch commit to the image scale bounds", () => {
  assert.equal(clampStoryTransformScale(MIN_IMAGE_SCALE - 0.4, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE), MIN_IMAGE_SCALE);
  assert.equal(clampStoryTransformScale(MAX_IMAGE_SCALE + 10, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE), MAX_IMAGE_SCALE);
  assert.equal(clampStoryTransformScale(2, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE), 2);
});

test("normalizeRotationDegrees wraps repeated full turns into (-180, 180]", () => {
  assert.equal(normalizeRotationDegrees(0), 0);
  assert.equal(normalizeRotationDegrees(180), 180);
  assert.equal(normalizeRotationDegrees(-180), 180);
  assert.equal(normalizeRotationDegrees(360 + 45), 45);
  assert.equal(normalizeRotationDegrees(-360 - 45), -45);
  assert.equal(normalizeRotationDegrees(720 + 190), -170);
});

test("isDefaultStoryTransform detects an untouched image so the publish step can omit the field", () => {
  assert.equal(isDefaultStoryTransform(DEFAULT_IMAGE_TRANSFORM), true);
  assert.equal(isDefaultStoryTransform({ x: 0.6, y: 0.5, scale: 1, rotation: 0 }), false);
  assert.equal(isDefaultStoryTransform({ x: 0.5, y: 0.5, scale: 1.2, rotation: 0 }), false);
  assert.equal(isDefaultStoryTransform({ x: 0.5, y: 0.5, scale: 1, rotation: 5 }), false);
});

test("isFiniteStoryTransform rejects non-finite/malformed values (validation guard)", () => {
  assert.equal(isFiniteStoryTransform({ x: 0.5, y: 0.5, scale: 1, rotation: 0 }), true);
  assert.equal(isFiniteStoryTransform({ x: 0.5, y: 0.5, scale: 1 }), true, "rotation is optional");
  assert.equal(isFiniteStoryTransform({ x: Number.NaN, y: 0.5, scale: 1 }), false);
  assert.equal(isFiniteStoryTransform({ x: 0.5, y: 0.5 }), false, "scale is required");
  assert.equal(isFiniteStoryTransform({ x: 0.5, y: 0.5, scale: undefined }), false, "explicit undefined scale");
  assert.equal(isFiniteStoryTransform({ x: 0.5, y: 0.5, scale: Number.POSITIVE_INFINITY }), false, "non-finite scale");
  assert.equal(isFiniteStoryTransform({ x: Number.POSITIVE_INFINITY, y: 0.5, scale: 1 }), false, "non-finite x");
  assert.equal(isFiniteStoryTransform({ x: 0.5, y: Number.NaN, scale: 1 }), false, "non-finite y");
  assert.equal(isFiniteStoryTransform({ x: 0.5, y: 0.5, scale: 1, rotation: Number.NaN }), false, "non-finite rotation");
  assert.equal(isFiniteStoryTransform({ x: "0.5", y: 0.5, scale: 1 }), false, "x must be a number, not a numeric string");
  assert.equal(isFiniteStoryTransform(null), false);
  assert.equal(isFiniteStoryTransform(undefined), false);
  assert.equal(isFiniteStoryTransform("not-an-object"), false);
});

test("hasValidStoryImageTransform gates the viewer's transformed-vs-legacy render decision", () => {
  // Legacy Stories (never touched by the editor) -> legacy cover path.
  assert.equal(hasValidStoryImageTransform(null), false);
  assert.equal(hasValidStoryImageTransform(undefined), false);

  // A fully-valid transform -> transformed path.
  assert.equal(hasValidStoryImageTransform({ x: 0.5, y: 0.5, scale: 1, rotation: 0 }), true);
  assert.equal(hasValidStoryImageTransform(DEFAULT_IMAGE_TRANSFORM), true);

  // Truthy but malformed/partial -> legacy cover path, never a partial repair.
  assert.equal(hasValidStoryImageTransform({ x: 0.5, y: 0.5 }), false, "missing scale");
  assert.equal(hasValidStoryImageTransform({ x: 0.5, y: 0.5, scale: undefined }), false, "undefined scale");
  assert.equal(hasValidStoryImageTransform({ x: 0.5, y: 0.5, scale: Number.NaN }), false, "NaN scale");
  assert.equal(hasValidStoryImageTransform({ x: 0.5, y: 0.5, scale: Number.POSITIVE_INFINITY }), false, "Infinity scale");
  assert.equal(hasValidStoryImageTransform({}), false, "empty object");
});

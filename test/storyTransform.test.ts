import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

// --- Initial Story image fit geometry -------------------------------------
//
// There is no separate computeInitialImageFitScale helper anymore: showing
// the full source image at maximum size is delegated entirely to
// contentFit="contain" on the Image inside DraggableStoryImage/view-story's
// transformed branch (see DraggableStoryImage.tsx), using the untouched
// DEFAULT_IMAGE_TRANSFORM (scale 1) as the initial transform. A prior
// version computed a custom sub-1 "fit" scale applied on top of a `cover`
// base — but contentFit="cover" crops to the canvas box at Image layout
// time, before any Reanimated transform runs, so no scale value applied
// afterward can restore already-cropped pixels; it can only shrink the
// already-cropped box uniformly (still cropped, now also smaller). That
// mismatch was the root cause of a real-device regression where a portrait
// photo rendered as a small, still-cropped image with large black margins
// on every side. `contain` needs no compensating scale at all: it is
// computed against the full canvasWidth x canvasHeight box (already known,
// no image-dimension staleness/timing risk) and both the editor and the
// viewer already share that exact box via the same
// (translateX, translateY, scale, rotate) transform order, so parity holds
// without either side needing the source image's natural dimensions.
//
// containFit below is a standalone reimplementation of exactly what
// contentFit="contain" computes (this repo has no component-render test
// library — see the source-string convention in viewStoryParity.test.ts —
// so the actual Image behavior can't be mounted and asserted on directly).
// It exists only to prove the geometry contract holds for the realistic
// dimension matrix below; the *wiring* of contentFit="contain" itself is
// asserted separately against the real source files.
const containFit = (canvasWidth: number, canvasHeight: number, imageWidth: number, imageHeight: number) => {
  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  return { width: imageWidth * scale, height: imageHeight * scale };
};

const STORY_CANVAS = { width: 360, height: 800 };

const FIT_CASES: Array<[string, number, number]> = [
  ["portrait", 1080, 1920],
  ["near-story portrait", 1080, 2400],
  ["landscape", 1920, 1080],
  ["square", 1080, 1080],
  ["extreme tall", 1080, 4000],
  ["extreme wide", 4000, 1080],
];

for (const [label, imageWidth, imageHeight] of FIT_CASES) {
  test(`containFit(${label}) keeps the entire image on-canvas, aspect-preserved, at the maximum possible size`, () => {
    const { width, height } = containFit(STORY_CANVAS.width, STORY_CANVAS.height, imageWidth, imageHeight);

    // Requirement 3 + 4: whole image visible, no axis exceeds the canvas.
    assert.ok(width <= STORY_CANVAS.width + 1e-9, `width ${width} exceeds canvas ${STORY_CANVAS.width}`);
    assert.ok(height <= STORY_CANVAS.height + 1e-9, `height ${height} exceeds canvas ${STORY_CANVAS.height}`);

    // Requirement 7: aspect ratio preserved (no stretch/distortion).
    assert.ok(
      Math.abs(width / height - imageWidth / imageHeight) < 1e-9,
      `aspect ratio changed: got ${width / height}, expected ${imageWidth / imageHeight}`,
    );

    // Requirement 4/5: maximal, not an arbitrary/unnecessary shrink — at
    // least one axis must exactly reach the canvas edge.
    const touchesWidth = Math.abs(width - STORY_CANVAS.width) < 1e-6;
    const touchesHeight = Math.abs(height - STORY_CANVAS.height) < 1e-6;
    assert.ok(touchesWidth || touchesHeight, "fit size doesn't reach either canvas edge — it was shrunk further than necessary");
  });
}

test("containFit is a no-op scale (1:1) when canvas and image already share an aspect ratio", () => {
  const same = containFit(900, 1600, 900, 1600);
  assert.deepEqual(same, { width: 900, height: 1600 });
});

// --- Editor/viewer source wiring -------------------------------------------
//
// Confirms the actual fix (not just the math above) is in place: the
// editor's DraggableStoryImage and the viewer's transformed-image branches
// use contentFit="contain" so scale=1 really does render as "whole image,
// maximum size" on device — while every legacy (no/invalid imageTransform)
// fallback keeps the exact original contentFit="cover" so already-published
// legacy Stories are unaffected (requirement 7/10/13).
const draggableStoryImageSource = readFileSync(
  join(process.cwd(), "components/story/DraggableStoryImage.tsx"),
  "utf8",
);
const viewStorySource = readFileSync(join(process.cwd(), "app/post-screen/view-story.tsx"), "utf8");

test("DraggableStoryImage renders its Image with contentFit=\"contain\", not \"cover\"", () => {
  assert.match(draggableStoryImageSource, /contentFit="contain"/);
  assert.doesNotMatch(draggableStoryImageSource, /contentFit="cover"/);
});

test("view-story's transformed-image branches use contentFit=\"contain\" (renderStoryImage + renderCurrentStoryImage)", () => {
  const containSites = viewStorySource.match(/contentFit="contain"/g) ?? [];
  assert.equal(containSites.length, 2, "expected exactly 2 contentFit=\"contain\" sites (renderStoryImage + renderCurrentStoryImage transformed branches)");
});

test("view-story's legacy (no/invalid imageTransform) fallback branches still render with contentFit=\"cover\", unchanged", () => {
  // Isolate each `if (!hasValidStoryImageTransform(...)) { ... }` guard block
  // and confirm the plain Image it returns is still the exact pre-existing
  // cover render — unrelated cover sites (video thumbnail, VideoView
  // playback) must not be touched by this fix either.
  const guardMarker = "if (!hasValidStoryImageTransform(";
  let searchFrom = 0;
  let guardCount = 0;
  for (;;) {
    const start = viewStorySource.indexOf(guardMarker, searchFrom);
    if (start === -1) break;
    guardCount += 1;
    const end = viewStorySource.indexOf("}\n\n", start);
    const block = viewStorySource.slice(start, end === -1 ? start + 400 : end);
    assert.match(block, /contentFit="cover"/, `legacy fallback block at index ${start} lost contentFit="cover"`);
    searchFrom = start + guardMarker.length;
  }
  assert.equal(guardCount, 2, "expected exactly 2 hasValidStoryImageTransform guard blocks");
});

test("add-story no longer computes a custom initial fit scale — DEFAULT_IMAGE_TRANSFORM is staged as-is", () => {
  const addStorySource = readFileSync(join(process.cwd(), "app/post-screen/add-story.tsx"), "utf8");
  assert.doesNotMatch(addStorySource, /computeInitialImageFitScale/);
  assert.match(addStorySource, /setImageTransform\(DEFAULT_IMAGE_TRANSFORM\);/);
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

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const mapScreenSource = readFileSync(
  join(process.cwd(), "components/ui/MapScreen.tsx"),
  "utf8",
);
const getSourceBetween = (start: string, end: string) => {
  const startIndex = mapScreenSource.indexOf(start);
  const endIndex = mapScreenSource.indexOf(end, startIndex);

  assert.notEqual(startIndex, -1, `${start} should exist`);
  assert.notEqual(endIndex, -1, `${end} should exist after ${start}`);

  return mapScreenSource.slice(startIndex, endIndex);
};

test("mobile map keeps globe projection and explicitly enables native gestures", () => {
  assert.match(mapScreenSource, /projection="globe"/);
  assert.match(mapScreenSource, /scrollEnabled=\{true\}/);
  assert.match(mapScreenSource, /zoomEnabled=\{true\}/);
  assert.match(mapScreenSource, /gestureSettings=\{MAP_GESTURE_SETTINGS\}/);
  assert.match(mapScreenSource, /requestDisallowInterceptTouchEvent=\{true\}/);

  [
    "panEnabled",
    "pinchPanEnabled",
    "pinchZoomEnabled",
    "pitchEnabled",
    "rotateEnabled",
    "quickZoomEnabled",
    "doubleTapToZoomInEnabled",
    "doubleTouchToZoomOutEnabled",
    "simultaneousRotateAndPinchToZoomEnabled",
    "simultaneousRotateAndPinchZoomEnabled",
  ].forEach((setting) => {
    assert.match(
      mapScreenSource,
      new RegExp(`${setting}: true`),
      `${setting} should be explicitly enabled for globe interaction`,
    );
  });
});

test("mobile map does not use pan-mode props unsupported by the installed rnmapbox wrapper", () => {
  assert.doesNotMatch(mapScreenSource, /\bpanMode\b/);
  assert.doesNotMatch(mapScreenSource, /\bscrollMode\b/);
  assert.doesNotMatch(mapScreenSource, /\bhorizontalAndVertical\b/);
});

test("mobile map avoids full-screen overlay and marker decoration touch capture", () => {
  assert.match(mapScreenSource, /<View pointerEvents="box-none" style=\{styles\.topHeader\}>/);
  assert.match(mapScreenSource, /<View pointerEvents="none" style=\{\[styles\.mapShade, mapShadeStyle\]\} \/>/);
  assert.match(mapScreenSource, /<View pointerEvents="box-none" style=\{\[styles\.mapControlsLeft,/);
  assert.match(mapScreenSource, /<View pointerEvents="box-none" style=\{\[styles\.mapControlsRight,/);

  [
    "satImageGlow",
    "satAnchorGlow",
    "satAnchorPoint",
    "glowLayer",
    "labelContainer",
  ].forEach((styleName) => {
    assert.match(
      mapScreenSource,
      new RegExp(`pointerEvents="none"[^>]+styles\\.${styleName}`),
      `${styleName} should not capture map gestures`,
    );
  });
});

test("event viewport loading remains camera-passive in the mobile map", () => {
  const handleMapIdleSource = getSourceBetween(
    "const handleMapIdle",
    "const handleZoomIn",
  );

  assert.match(mapScreenSource, /onMapIdle=\{handleMapIdle\}/);
  assert.match(handleMapIdleSource, /onViewportChange\?\.\(viewport\)/);
  assert.doesNotMatch(
    handleMapIdleSource,
    /cameraRef\.current\?\.(?:setCamera|fitBounds|flyTo|moveTo|zoomTo)/,
  );
});

test("user gesture still cancels pending initial recenter without disabling manual recenter", () => {
  assert.match(mapScreenSource, /state\.gestures\.isGestureActive/);
  assert.match(mapScreenSource, /userHasExploredMapRef\.current = true/);
  assert.match(mapScreenSource, /pendingCameraMoveRef\.current\?\.mode === "initial"/);
  assert.match(mapScreenSource, /pendingCameraMoveRef\.current = null/);
  assert.match(mapScreenSource, /mode: "manual"/);
});

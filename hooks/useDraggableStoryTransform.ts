import { useEffect } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  runOnJS,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import {
  clampStoryTransformPosition,
  clampStoryTransformScale,
  normalizeRotationDegrees,
  type StoryTransform,
} from "@/lib/storyTransform";

type UseDraggableStoryTransformOptions = {
  initialTransform: StoryTransform;
  /** Measured canvas size in px — the container the object is dragged within. */
  canvasWidth: number;
  canvasHeight: number;
  minScale: number;
  maxScale: number;
  /** Pinch-to-scale. Off for text, which keeps its existing S/M/L controls. */
  enablePinch?: boolean;
  enableRotation?: boolean;
  disabled?: boolean;
  /** Fired on the JS thread once per gesture (pan/pinch/rotate) end — not per frame. */
  onTransformEnd?: (transform: StoryTransform) => void;
};

export type DraggableStoryTransformResult = {
  gesture: ReturnType<typeof Gesture.Simultaneous>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  rotation: SharedValue<number>;
};

// Reusable Story-canvas transform primitive shared by the freeform image and
// text objects in the Add Story editor. Drag/pinch/rotate updates run
// entirely on the UI thread via Reanimated shared values (no React state,
// no re-renders per frame); `onTransformEnd` is the only JS-thread hop, and
// it fires once per completed gesture so the caller can commit the final
// normalized value into React/draft state.
export function useDraggableStoryTransform({
  initialTransform,
  canvasWidth,
  canvasHeight,
  minScale,
  maxScale,
  enablePinch = false,
  enableRotation = false,
  disabled = false,
  onTransformEnd,
}: UseDraggableStoryTransformOptions): DraggableStoryTransformResult {
  const x = useSharedValue(initialTransform.x);
  const y = useSharedValue(initialTransform.y);
  const scale = useSharedValue(initialTransform.scale);
  const rotation = useSharedValue(initialTransform.rotation);

  const canvasWidthSv = useSharedValue(canvasWidth > 0 ? canvasWidth : 1);
  const canvasHeightSv = useSharedValue(canvasHeight > 0 ? canvasHeight : 1);

  const activeGestures = useSharedValue(0);

  useEffect(() => {
    if (canvasWidth > 0) canvasWidthSv.value = canvasWidth;
    if (canvasHeight > 0) canvasHeightSv.value = canvasHeight;
  }, [canvasWidth, canvasHeight, canvasWidthSv, canvasHeightSv]);

  useEffect(() => {
    x.value = initialTransform.x;
    y.value = initialTransform.y;
    scale.value = initialTransform.scale;
    rotation.value = initialTransform.rotation;
  }, [
    initialTransform.x,
    initialTransform.y,
    initialTransform.scale,
    initialTransform.rotation,
    x,
    y,
    scale,
    rotation,
  ]);

  const commit = (transform: StoryTransform) => {
    onTransformEnd?.(transform);
  };

  const maybeCommit = () => {
    "worklet";
    if (activeGestures.value <= 0) {
      x.value = clampStoryTransformPosition(x.value);
      y.value = clampStoryTransformPosition(y.value);
      scale.value = clampStoryTransformScale(scale.value, minScale, maxScale);
      rotation.value = normalizeRotationDegrees(rotation.value);
      runOnJS(commit)({
        x: x.value,
        y: y.value,
        scale: scale.value,
        rotation: rotation.value,
      });
    }
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .averageTouches(true)
    .onStart(() => {
      "worklet";
      activeGestures.value += 1;
    })
    .onChange((event) => {
      "worklet";
      const w = canvasWidthSv.value > 0 ? canvasWidthSv.value : 1;
      const h = canvasHeightSv.value > 0 ? canvasHeightSv.value : 1;
      x.value += event.changeX / w;
      y.value += event.changeY / h;
    })
    .onFinalize(() => {
      "worklet";
      activeGestures.value = Math.max(0, activeGestures.value - 1);
      maybeCommit();
    });

  const pinch = Gesture.Pinch()
    .enabled(!disabled && enablePinch)
    .onStart(() => {
      "worklet";
      activeGestures.value += 1;
    })
    .onChange((event) => {
      "worklet";
      scale.value = clampStoryTransformScale(
        scale.value * event.scaleChange,
        minScale,
        maxScale,
      );
    })
    .onFinalize(() => {
      "worklet";
      activeGestures.value = Math.max(0, activeGestures.value - 1);
      maybeCommit();
    });

  const rotate = Gesture.Rotation()
    .enabled(!disabled && enableRotation)
    .onStart(() => {
      "worklet";
      activeGestures.value += 1;
    })
    .onChange((event) => {
      "worklet";
      rotation.value += (event.rotationChange * 180) / Math.PI;
    })
    .onFinalize(() => {
      "worklet";
      activeGestures.value = Math.max(0, activeGestures.value - 1);
      maybeCommit();
    });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate);

  return { gesture, x, y, scale, rotation };
}

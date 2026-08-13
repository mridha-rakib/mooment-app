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

  const startX = useSharedValue(initialTransform.x);
  const startY = useSharedValue(initialTransform.y);
  const startScale = useSharedValue(initialTransform.scale);
  const startRotation = useSharedValue(initialTransform.rotation);

  const safeCanvasWidth = canvasWidth > 0 ? canvasWidth : 1;
  const safeCanvasHeight = canvasHeight > 0 ? canvasHeight : 1;

  const commit = (transform: StoryTransform) => {
    onTransformEnd?.(transform);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      x.value = startX.value + event.translationX / safeCanvasWidth;
      y.value = startY.value + event.translationY / safeCanvasHeight;
    })
    .onEnd(() => {
      x.value = clampStoryTransformPosition(x.value);
      y.value = clampStoryTransformPosition(y.value);
      startX.value = x.value;
      startY.value = y.value;
      runOnJS(commit)({
        x: x.value,
        y: y.value,
        scale: scale.value,
        rotation: rotation.value,
      });
    });

  const pinch = Gesture.Pinch()
    .enabled(!disabled && enablePinch)
    .onUpdate((event) => {
      scale.value = clampStoryTransformScale(
        startScale.value * event.scale,
        minScale,
        maxScale,
      );
    })
    .onEnd(() => {
      startScale.value = scale.value;
      runOnJS(commit)({
        x: x.value,
        y: y.value,
        scale: scale.value,
        rotation: rotation.value,
      });
    });

  const rotate = Gesture.Rotation()
    .enabled(!disabled && enableRotation)
    .onUpdate((event) => {
      rotation.value = startRotation.value + (event.rotation * 180) / Math.PI;
    })
    .onEnd(() => {
      rotation.value = normalizeRotationDegrees(rotation.value);
      startRotation.value = rotation.value;
      runOnJS(commit)({
        x: x.value,
        y: y.value,
        scale: scale.value,
        rotation: rotation.value,
      });
    });

  const gesture = Gesture.Simultaneous(pan, pinch, rotate);

  return { gesture, x, y, scale, rotation };
}

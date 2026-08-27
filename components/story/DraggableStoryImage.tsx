import { Image } from "expo-image";
import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import { useDraggableStoryTransform } from "@/hooks/useDraggableStoryTransform";
import {
  DEFAULT_IMAGE_TRANSFORM,
  MAX_IMAGE_SCALE,
  MIN_IMAGE_SCALE,
  type StoryTransform,
} from "@/lib/storyTransform";

type DraggableStoryImageProps = {
  uri: string;
  initialTransform?: StoryTransform;
  canvasWidth: number;
  canvasHeight: number;
  disabled?: boolean;
  onTransformEnd: (transform: StoryTransform) => void;
  style?: StyleProp<ViewStyle>;
};

// Freeform Story image object: pan + pinch + rotate, starting from the
// full-canvas `contain` fit (scale 1, centered, no rotation) — the whole
// source image visible at the largest size that fits the canvas, exactly
// like scale=1 always has for x/y/rotation. contentFit="contain" (not
// "cover") is required here: cover crops to the canvas box at Image
// layout time, before this component's transform ever runs, so no scale
// value applied on top of it can un-crop already-discarded pixels. Contain
// needs no extra fit math because it only ever needs the box's own size
// (canvasWidth x canvasHeight, already known) — unlike a true "contain
// rectangle" sized to the image's own aspect ratio, it doesn't need the
// image's natural dimensions at all, so the viewer can reproduce it byte
// for byte from just canvasWidth/canvasHeight + the same four transform
// numbers (see renderStoryImage/renderCurrentStoryImage in view-story.tsx).
function DraggableStoryImage({
  uri,
  initialTransform = DEFAULT_IMAGE_TRANSFORM,
  canvasWidth,
  canvasHeight,
  disabled,
  onTransformEnd,
  style,
}: DraggableStoryImageProps) {
  const { gesture, x, y, scale, rotation } = useDraggableStoryTransform({
    initialTransform,
    canvasWidth,
    canvasHeight,
    minScale: MIN_IMAGE_SCALE,
    maxScale: MAX_IMAGE_SCALE,
    enablePinch: true,
    enableRotation: true,
    disabled,
    onTransformEnd,
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (x.value - 0.5) * canvasWidth },
      { translateY: (y.value - 0.5) * canvasHeight },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, style, animatedStyle]}
        renderToHardwareTextureAndroid
      >
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(DraggableStoryImage);

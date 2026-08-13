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

// Freeform Story image object: pan + pinch + rotate, starting from exactly
// today's full-canvas `cover` position/size (scale 1, centered, no
// rotation) so an untouched image still looks like the legacy Story.
export default function DraggableStoryImage({
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
      >
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      </Animated.View>
    </GestureDetector>
  );
}

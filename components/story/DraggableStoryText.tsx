import React, { useEffect } from "react";
import { Keyboard, Platform, StyleSheet, Text, TextInput } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle } from "react-native-reanimated";

import { useDraggableStoryTransform } from "@/hooks/useDraggableStoryTransform";
import {
  MAX_TEXT_SCALE,
  MIN_TEXT_SCALE,
  type StoryTransform,
} from "@/lib/storyTransform";
import type { StoryTextOverlay } from "@/lib/stories";

type DraggableStoryTextProps = {
  text: string;
  onChangeText: (text: string) => void;
  color: string;
  fontWeight?: StoryTextOverlay["fontWeight"];
  textAlign?: StoryTextOverlay["textAlign"];
  x: number;
  y: number;
  rotation: number;
  scale: number;
  canvasWidth: number;
  canvasHeight: number;
  /** Editor-preview-only readability shadow toggle. Defaults to true (existing always-on behavior). */
  shadowEnabled?: boolean;
  /** True while the user is actively typing into this object. */
  isEditing: boolean;
  onStartEditing: () => void;
  onFinishEditing: () => void;
  onTransformEnd: (transform: StoryTransform) => void;
};

// The single on-canvas Story text object — both the editable input AND the
// draggable/rotatable preview are this ONE element, never two. While
// `isEditing`, it renders a focused TextInput and the drag/rotate/tap
// gesture is not even mounted (so it can never fight the TextInput's own
// touch handling); otherwise it renders plain Text wrapped in a
// GestureDetector composing Pan+Rotation (drag) raced against a Tap (which
// re-enters editing). The outer Animated.View — and the shared
// x/y/rotation values driving its transform — never unmounts between the
// two modes, so switching modes never resets position/rotation.
export default function DraggableStoryText({
  text,
  onChangeText,
  color,
  fontWeight,
  textAlign,
  x: initialX,
  y: initialY,
  rotation: initialRotation,
  scale: initialScale,
  canvasWidth,
  canvasHeight,
  shadowEnabled = true,
  isEditing,
  onStartEditing,
  onFinishEditing,
  onTransformEnd,
}: DraggableStoryTextProps) {
  const { gesture: dragRotateGesture, x, y, scale, rotation } = useDraggableStoryTransform({
    initialTransform: { x: initialX, y: initialY, scale: initialScale, rotation: initialRotation },
    canvasWidth,
    canvasHeight,
    minScale: MIN_TEXT_SCALE,
    maxScale: MAX_TEXT_SCALE,
    enablePinch: true,
    enableRotation: true,
    onTransformEnd,
  });

  // Android can hide the soft keyboard (via the IME's own dismiss
  // affordance, or a gesture-nav swipe) without the TextInput actually
  // losing focus — onBlur/onSubmitEditing alone don't fire for that case,
  // which otherwise leaves isEditing stuck true with no keyboard visible
  // and the object stuck un-draggable. This listener (the same
  // keyboardDidHide/keyboardWillHide convention already used elsewhere in
  // this repo, e.g. ShareModal.tsx) is the one signal that's guaranteed to
  // fire whenever the keyboard actually closes, regardless of focus state.
  // Scoped to only subscribe while isEditing, and always cleaned up.
  useEffect(() => {
    if (!isEditing) return;

    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subscription = Keyboard.addListener(hideEvent, () => {
      onFinishEditing();
    });

    return () => {
      subscription.remove();
    };
  }, [isEditing, onFinishEditing]);

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onStartEditing)();
  });

  const composedGesture = Gesture.Race(dragRotateGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (x.value - 0.5) * canvasWidth - 140 },
      { translateY: (y.value - 0.5) * canvasHeight - 30 },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const shadowStyle = shadowEnabled ? styles.overlayTextShadow : undefined;

  return (
    <Animated.View style={[styles.overlayTextWrap, animatedStyle]}>
      {isEditing ? (
        <TextInput
          value={text}
          onChangeText={onChangeText}
          onBlur={onFinishEditing}
          onSubmitEditing={onFinishEditing}
          autoFocus
          maxLength={160}
          placeholder="Type here"
          placeholderTextColor="rgba(255,255,255,0.65)"
          style={[styles.overlayText, shadowStyle, styles.overlayTextInput, { color, fontWeight: fontWeight ?? "700", textAlign: textAlign ?? "center" }]}
        />
      ) : (
        <GestureDetector gesture={composedGesture}>
          <Text
            style={[
              styles.overlayText,
              shadowStyle,
              { color, fontWeight: fontWeight ?? "700", textAlign: textAlign ?? "center" },
            ]}
          >
            {text}
          </Text>
        </GestureDetector>
      )}
    </Animated.View>
  );
}

// Mirrors add-story.tsx's previous static overlayTextWrap/overlayText
// styles (280 anchor width, same type scale) so the object's appearance is
// unchanged from before this refactor — only the interaction model changed.
const styles = StyleSheet.create({
  overlayTextWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 280,
    alignItems: "center",
    // Modest transparent padding widens the touch/gesture target beyond
    // the bare glyph height (previously ~40px for one line) without
    // changing the visible text's own size or position.
    paddingVertical: 10,
  },
  overlayText: {
    fontSize: 30,
    lineHeight: 36,
  },
  overlayTextShadow: {
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  overlayTextInput: {
    width: "100%",
    padding: 0,
  },
});

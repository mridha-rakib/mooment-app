import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

const FADE_DURATION_MS = 150;

type FadeInOnReadyProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// One-shot opacity fade for a skeleton -> real-content swap. Mounted once
// when a section becomes ready and left mounted afterward, so it never
// replays on routine re-renders/refreshes.
export default function FadeInOnReady({ children, style }: FadeInOnReadyProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    });

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

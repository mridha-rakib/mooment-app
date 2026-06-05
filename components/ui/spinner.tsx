import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type SpinnerSize = "small" | "large" | number;

export type SpinnerProps = {
  accessibilityLabel?: string;
  color?: string;
  size?: SpinnerSize;
  style?: StyleProp<ViewStyle>;
};

type SpinnerCustomProps = SpinnerProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

const resolveSize = (size: SpinnerSize) => {
  if (size === "small") {
    return 16;
  }

  if (size === "large") {
    return 28;
  }

  return size;
};

export function Spinner({ accessibilityLabel = "Loading", color = "#8E8E9B", size = 16, style }: SpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        duration: 900,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spinValue]);

  const iconSize = resolveSize(size);
  const rotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      pointerEvents="none"
      style={[
        styles.spinner,
        {
          height: iconSize,
          transform: [{ rotate: rotation }],
          width: iconSize,
        },
        style,
      ]}
    >
      <Feather name="loader" size={iconSize} color={color} />
    </Animated.View>
  );
}

export function SpinnerCustom({ containerStyle, ...props }: SpinnerCustomProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Spinner {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  spinner: {
    alignItems: "center",
    justifyContent: "center",
  },
});

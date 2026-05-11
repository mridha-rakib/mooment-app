import { useTheme } from "@/hooks/useTheme";
import {
  Canvas,
  LinearGradient,
  RoundedRect,
  Shadow,
  vec,
} from "@shopify/react-native-skia";
import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SegmentedControlProps {
  options: string[];
  selectedOption: string;
  onSelect: (option: string) => void;
  containerStyle?: object;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedOption,
  onSelect,
  containerStyle,
}) => {
  const { colors, isDark } = useTheme();
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={[styles.wrapper, containerStyle]} onLayout={onLayout}>
      {layout.width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Main Glass Background with Depth */}
          <RoundedRect
            x={1}
            y={1}
            width={layout.width - 2}
            height={layout.height - 2}
            r={16}
            color="#6868681A"
          >
            <Shadow dx={0} dy={1} blur={4} color="rgba(0,0,0,0.5)" inner />
          </RoundedRect>

          {/* High-Performance Metallic Border Gradient */}
          <RoundedRect
            x={0.5}
            y={0.5}
            width={layout.width - 1}
            height={layout.height - 1}
            r={16}
            style="stroke"
            strokeWidth={1}
          >
            <LinearGradient
              start={vec(0, 0)}
              end={vec(layout.width, 0)}
              colors={
                isDark
                  ? ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.9)", "rgba(255,255,255,0.05)"]
                  : ["rgba(0,0,0,0.1)", "rgba(255,255,255,1)", "rgba(0,0,0,0.1)"]
              }
            />
          </RoundedRect>
        </Canvas>
      )}

      <View style={styles.container}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            activeOpacity={0.8}
            style={[
              styles.segmentItem,
              selectedOption === option && {
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#FFF",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.segmentLabel,
                {
                  color:
                    selectedOption === option
                      ? colors.text
                      : colors.textSecondary,
                },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default SegmentedControl;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    position: "relative",
    minHeight: 46,
    justifyContent: "center",
  },
  container: {
    flexDirection: "row",
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
});

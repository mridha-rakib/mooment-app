import { useTheme } from "@/hooks/useTheme";
import {
  Canvas,
  LinearGradient,
  Path,
  RoundedRect,
  Shadow,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SegmentedControlProps {
  options: string[];
  selectedOption: string;
  onSelect: (option: string) => void;
  containerStyle?: object;
  activeSegmentStyle?: object;
  renderOption?: (option: string, isSelected: boolean) => React.ReactNode;
  flat?: boolean;
}

interface GappedBorderProps {
  width: number;
  height: number;
  r?: number;
  extension?: number;
  isDark: boolean;
}

const GappedBorder: React.FC<GappedBorderProps> = ({
  width,
  height,
  r = 12,
  isDark,
}) => {
  const { path1, path2 } = useMemo(() => {
    if (width === 0) return { path1: null, path2: null };
    const w = width;
    const h = height;
    const gapSize = 0.5; // Minimal gap for maximum length

    // Path 1: Top edge + Top-Left corner + Left edge
    const p1 = Skia.Path.Make();
    p1.moveTo(w - gapSize, 0.5); 
    p1.lineTo(r, 0.5);
    p1.arcToOval(Skia.XYWHRect(0.5, 0.5, r * 2, r * 2), 270, -90, false);
    p1.lineTo(0.5, h - gapSize);

    // Path 2: Bottom edge + Bottom-Right corner + Right edge
    const p2 = Skia.Path.Make();
    p2.moveTo(gapSize, h - 0.5);
    p2.lineTo(w - r, h - 0.5);
    p2.arcToOval(Skia.XYWHRect(w - r * 2 - 0.5, h - r * 2 - 0.5, r * 2, r * 2), 90, -90, false);
    p2.lineTo(w - 0.5, gapSize);

    return { path1: p1, path2: p2 };
  }, [width, height, r]);

  return (
    <>
      {path1 && (
        <Path path={path1} style="stroke" strokeWidth={0.4} strokeCap="round">
          <LinearGradient
            start={vec(width - r, 0)}
            end={vec(0, height - r)}
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0)"]}
            positions={[0, 0.04, 0.96, 1]}
          />
        </Path>
      )}
      {path2 && (
        <Path path={path2} style="stroke" strokeWidth={0.4} strokeCap="round">
          <LinearGradient
            start={vec(r, height)}
            end={vec(width, r)}
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0)"]}
            positions={[0, 0.04, 0.96, 1]}
          />
        </Path>
      )}
    </>
  );
};

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedOption,
  onSelect,
  containerStyle,
  activeSegmentStyle,
  renderOption,
  flat = false,
}) => {
  const { colors, isDark } = useTheme();
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [segmentLayout, setSegmentLayout] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setLayout({ width, height });
  };

  const onSegmentLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSegmentLayout({ width, height });
  };

  return (
    <View
      style={[
        styles.wrapper,
        flat && styles.flatWrapper,
        containerStyle,
      ]}
      onLayout={onLayout}
    >
      {layout.width > 0 && !flat && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Canvas style={{ width: layout.width, height: layout.height }}>
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

            <GappedBorder 
              width={layout.width} 
              height={layout.height} 
              r={16} 
              isDark={isDark} 
            />
          </Canvas>
        </View>
      )}

      <View style={[styles.container, flat && styles.flatContainer]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            activeOpacity={0.8}
            onLayout={selectedOption === option ? onSegmentLayout : undefined}
            style={[
              styles.segmentItem,
              flat && styles.flatSegmentItem,
              selectedOption === option && (
                flat
                  ? { backgroundColor: "rgba(104, 104, 104, 0.4)" }
                  : { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFF" }
              ),
              selectedOption === option && activeSegmentStyle,
            ]}
            onPress={() => onSelect(option)}
          >
            {selectedOption === option && segmentLayout.width > 0 && !flat && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Canvas style={{ width: segmentLayout.width, height: segmentLayout.height }}>
                  <GappedBorder 
                    width={segmentLayout.width} 
                    height={segmentLayout.height} 
                    r={12} 
                    isDark={isDark} 
                  />
                </Canvas>
              </View>
            )}
            {renderOption ? (
              renderOption(option, selectedOption === option)
            ) : (
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
            )}
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
  flatWrapper: {
    backgroundColor: "rgba(104, 104, 104, 0.1)",
    borderRadius: 12,
    minHeight: 40,
    height: 40,
  },
  container: {
    flexDirection: "row",
    padding: 5,
  },
  flatContainer: {
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  flatSegmentItem: {
    paddingVertical: 0,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "700",
    zIndex: 1,
  },
});

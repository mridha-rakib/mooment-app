import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <LinearGradient
        colors={
          isDark
            ? ["#2A2A30", "#4A4A52", "#2A2A30"]
            : ["#D0D0D0", "#A0A0A0", "#D0D0D0"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: isDark ? "#121217" : "#F5F5F5" },
          ]}
        >
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              activeOpacity={0.8}
              style={[
                styles.segmentItem,
                selectedOption === option && {
                  backgroundColor: isDark ? "#2A2A32" : "#FFF",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 3,
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
      </LinearGradient>
    </View>
  );
};

export default SegmentedControl;

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientBorder: {
    padding: 1,
    borderRadius: 16,
  },
  container: {
    flexDirection: "row",
    borderRadius: 15,
    padding: 3,
    overflow: "hidden",
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 12,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
});

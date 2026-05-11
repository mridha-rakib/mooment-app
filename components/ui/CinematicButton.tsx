import React from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { HugeiconsIcon } from "@hugeicons/react-native";

interface CinematicButtonProps {
  onPress?: () => void;
  icon?: any;
  text?: string;
  size?: number;
  color?: string;
  style?: any;
  children?: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

const CinematicButton: React.FC<CinematicButtonProps> = ({
  onPress,
  icon,
  text,
  size = 20,
  color,
  style,
  children,
  width = 40,
  height = 40,
  borderRadius = 16,
}) => {
  const { colors, isDark } = useTheme();
  const iconColor = color || colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[{ width, height }, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={isDark ? ["#18181c", "#c1c0c5", "#18181c"] : ["#e0e0e0", "#a0a0a0", "#e0e0e0"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.border, { borderRadius }]}
      >
        <BlurView 
          intensity={40} 
          tint={isDark ? "dark" : "light"} 
          style={[
            styles.inner, 
            { 
              backgroundColor: isDark ? "#1e1d21" : "rgba(255,255,255,0.8)",
              borderRadius: borderRadius - 0.5
            }
          ]}
        >
          {children ? (
            children
          ) : text ? (
            <Text style={[styles.text, { color: iconColor }]}>{text}</Text>
          ) : icon ? (
            <HugeiconsIcon icon={icon} size={size} color={iconColor} />
          ) : null}
        </BlurView>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default CinematicButton;

const styles = StyleSheet.create({
  border: {
    flex: 1,
    padding: 0.5,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden',
  },
  text: {
    fontSize: 13,
    fontWeight: "800",
  },
});

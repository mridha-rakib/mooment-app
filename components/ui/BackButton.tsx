import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface BackButtonProps {
  onPress?: () => void;
  iconName?: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  iconName = "chevron-left",
  size = 24,
  color,
  style
}) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  const iconColor = color || colors.text;

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.headerBtn, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[colors.border, colors.textSecondary, colors.border]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerBtnBorder}
      >
        <BlurView intensity={40} tint={isDark ? "dark" : "light"} style={[styles.headerBtnBg, { backgroundColor: colors.card }]}>
          <Feather name={iconName} size={size} color={iconColor} />
        </BlurView>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default BackButton;

const styles = StyleSheet.create({
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 100,
  },
  headerBtnBorder: {
    flex: 1,
    padding: 0.5,
    borderRadius: 100,
  },
  headerBtnBg: {
    flex: 1,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});

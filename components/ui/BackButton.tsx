import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

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
  color = "#FFFFFF",
  style
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.headerBtn, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={["#18181c", "#c1c0c5", "#18181c"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerBtnBorder}
      >
        <BlurView intensity={40} tint="dark" style={styles.headerBtnBg}>
          <Feather name={iconName} size={size} color={color} />
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
    backgroundColor: "#1e1d21",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
});

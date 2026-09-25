import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import React from "react";
import CinematicButton from "./CinematicButton";

interface BackButtonProps {
  onPress?: any;
  iconName?: any;
  size?: number;
  color?: string;
  style?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  iconName = ArrowLeft01Icon,
  size = 20,
  color,
  style,
  accessibilityLabel = "Go back",
  accessibilityHint = "Returns to the previous screen",
}) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  };

  return (
    <CinematicButton
      onPress={handlePress}
      icon={iconName}
      size={size}
      color={color}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    />
  );
};

export default BackButton;

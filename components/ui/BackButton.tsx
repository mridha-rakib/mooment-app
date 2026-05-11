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
}

const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  iconName = ArrowLeft01Icon,
  size = 20,
  color,
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
    <CinematicButton
      onPress={handlePress}
      icon={iconName}
      size={size}
      color={color}
      style={style}
    />
  );
};

export default BackButton;

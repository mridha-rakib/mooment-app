import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { useTheme } from "@/hooks/useTheme";

// Full-color gradient branding — never apply tintColor/tint to these, it
// would flatten the gradient to a single flat color.
const WORDMARK_ON_LIGHT = require("@/assets/images/logo-wordmark.png");
const WORDMARK_ON_DARK = require("@/assets/images/logo-wordmark-dark.png");
const ICON = require("@/assets/images/logo-icon.png");

// Intrinsic aspect ratios of the source assets, used to derive the missing
// dimension when a caller only supplies width or height.
const WORDMARK_ASPECT_RATIO = 2400 / 416;
const ICON_ASPECT_RATIO = 1;

export type LogoVariant = "wordmark" | "icon";
export type LogoSurface = "auto" | "light" | "dark";

interface LogoProps {
  /** "wordmark" is the full "mooment" lockup; "icon" is the standalone mark. */
  variant?: LogoVariant;
  /**
   * Which asset to render for the wordmark variant. "auto" (default) follows
   * the current app theme. Pass "light"/"dark" to pin it to a surface that
   * doesn't follow the theme (e.g. an always-dark header).
   */
  surface?: LogoSurface;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export default function Logo({ variant = "wordmark", surface = "auto", width, height, style }: LogoProps) {
  const { isDark } = useTheme();

  const aspectRatio = variant === "icon" ? ICON_ASPECT_RATIO : WORDMARK_ASPECT_RATIO;
  const resolvedWidth = width ?? (height ? height * aspectRatio : undefined);
  const resolvedHeight = height ?? (resolvedWidth ? resolvedWidth / aspectRatio : undefined);

  const source =
    variant === "icon"
      ? ICON
      : (surface === "auto" ? isDark : surface === "dark")
        ? WORDMARK_ON_DARK
        : WORDMARK_ON_LIGHT;

  return (
    <Image
      source={source}
      style={[{ width: resolvedWidth, height: resolvedHeight }, style]}
      resizeMode="contain"
    />
  );
}

type ThemeColors = {
  background: string;
  primary: string;
};

const DARK_BUTTON_BACKGROUND = "#FFFFFF";
const DARK_BUTTON_FOREGROUND = "#111111";

const isDarkThemeColors = (colors: ThemeColors) => colors.background.toLowerCase() === "#000000";

export const buttonBackground = (colors: ThemeColors) =>
  isDarkThemeColors(colors) ? DARK_BUTTON_BACKGROUND : colors.primary;

export const buttonForeground = (colors: ThemeColors) =>
  isDarkThemeColors(colors) ? DARK_BUTTON_FOREGROUND : colors.background;

export const whiteButtonForeground = DARK_BUTTON_FOREGROUND;

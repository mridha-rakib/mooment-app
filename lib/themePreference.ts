import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { ThemeMode } from "@/redux/slice/preference";

const THEME_PREFERENCE_KEY = "xenog.mobile.themePreference";

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

const canUseWebStorage = () => Platform.OS === "web" && typeof localStorage !== "undefined";

const canUseSecureStore = async () => Platform.OS !== "web" && (await SecureStore.isAvailableAsync());

export const readThemePreference = async (): Promise<ThemeMode | null> => {
  try {
    const storedTheme = (await canUseSecureStore())
      ? await SecureStore.getItemAsync(THEME_PREFERENCE_KEY)
      : canUseWebStorage()
        ? localStorage.getItem(THEME_PREFERENCE_KEY)
        : null;

    return isThemeMode(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
};

export const writeThemePreference = async (theme: ThemeMode): Promise<void> => {
  try {
    if (await canUseSecureStore()) {
      await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, theme);
      return;
    }

    if (canUseWebStorage()) {
      localStorage.setItem(THEME_PREFERENCE_KEY, theme);
    }
  } catch {
    // Keep the in-memory preference even if local persistence is temporarily unavailable.
  }
};

import Constants from "expo-constants";

export const MAPBOX_PUBLIC_TOKEN =
  (Constants.expoConfig?.extra?.mapboxPublicToken as string | undefined) ||
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN ||
  "";

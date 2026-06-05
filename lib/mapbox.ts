import Constants from "expo-constants";

const FALLBACK_MAPBOX_PUBLIC_TOKEN =
  "***REMOVED***";

export const MAPBOX_PUBLIC_TOKEN =
  (Constants.expoConfig?.extra?.mapboxPublicToken as string | undefined) ||
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
  process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN ||
  FALLBACK_MAPBOX_PUBLIC_TOKEN;

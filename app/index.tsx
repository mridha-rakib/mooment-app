import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";

export default function Splash() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const hasRestored = useAuthStore((state) => state.hasRestored);

  useEffect(() => {
    // Redirect as soon as the local auth session has been restored. No
    // artificial delay — the native splash already covered the very first
    // frames, and the destination screens render their own loading UI.
    if (isRestoring || !hasRestored) {
      return;
    }

    router.replace(
      isAuthenticated
        ? ("/(tabs)/home" as any)
        : ("/auth-screen/onboarding" as any),
    );
  }, [hasRestored, isAuthenticated, isRestoring, router]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/Splash-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0E0D12",
  },
  logo: {
    width: 240,
    height: 240,
  },
});

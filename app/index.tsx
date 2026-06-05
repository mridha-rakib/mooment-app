import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Image, View } from "react-native";
import { useAuthStore } from "@/stores/authStore";

export default function Splash() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isRestoring = useAuthStore((state) => state.isRestoring);
  const hasRestored = useAuthStore((state) => state.hasRestored);

  useEffect(() => {
    if (isRestoring || !hasRestored) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace(isAuthenticated ? '/(tabs)/home' as any : '/auth-screen/onboarding' as any);
    }, 1200);

    return () => clearTimeout(timer);
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

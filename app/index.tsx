import { router } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Image, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/auth-screen/onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image 
        source={require("../assets/images/Splash-logo.png")}
        style={[styles.logo, { tintColor: colors.text }]}
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
  },
  logo: {
    width: 240,
    height: 240,
  },
});

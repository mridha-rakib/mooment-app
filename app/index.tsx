import { router } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Placeholder for the glowing 'H' logo */}
        <Text style={styles.logoText}>H</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0d12",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "#1A1625",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8E54E9",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(142, 84, 233, 0.2)"
  },
  logoText: {
    color: "#D4B0EB",
    fontSize: 52,
    fontWeight: "bold",
    fontFamily: "sans-serif-thin",
  },
});

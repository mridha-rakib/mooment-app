import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SuccessChanged() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          
          <Image source={require("../assets/images/success.png")} style={{ width: 147, height: 170, marginBottom: 40 }} />

          <View style={styles.textContainer}>
            <Text style={styles.title}>Successfully Changed</Text>
            <Text style={styles.subtitle}>
              Return to the login page to enter your account with your new password
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.backLink} 
            activeOpacity={0.8}
            onPress={() => router.push("/login")}
          >
            <Feather name="chevron-left" size={16} color="#8E8E9B" />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  graphicContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#0A291A",
    opacity: 0.8,
    shadowColor: "#2DB46D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#2DB46D",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0e0d12",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E9B",
    textAlign: "center",
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  backLinkText: {
    color: "#8E8E9B",
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 4,
  },
});

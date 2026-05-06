import { router } from "expo-router";
import React from "react";
import { ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Onboarding() {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require("../../assets/images/splash.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlayContainer}>
          {/* Manually simulate a seamless gradient fade to dark using steps */}
          <View style={styles.fade1} />
          <View style={styles.fade2} />
          <View style={styles.fade3} />
          <View style={styles.fade4} />
          
          <View style={styles.solidBottom}>
            <SafeAreaView>
              <View style={styles.content}>
                <Text style={styles.title}>Discover Your Vibe</Text>
                <Text style={styles.subtitle}>
                  Find events happening near you! Connect with hosts and attendees, Get tickets seamlessly and share experiences.
                </Text>
                
                <TouchableOpacity 
                  style={styles.button} 
                  activeOpacity={0.8}
                  onPress={() => router.push('/auth-screen/login')}
                >
                  <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0d12",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
  },
  overlayContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  fade1: {
    height: 30,
    backgroundColor: "rgba(14, 13, 18, 0.2)",
  },
  fade2: {
    height: 30,
    backgroundColor: "rgba(14, 13, 18, 0.4)",
  },
  fade3: {
    height: 30,
    backgroundColor: "rgba(14, 13, 18, 0.6)",
  },
  fade4: {
    height: 30,
    backgroundColor: "rgba(14, 13, 18, 0.8)",
  },
  solidBottom: {
    backgroundColor: "#0e0d12", // Blend straight into pure dark background for text
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E9B",
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 20,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#B59EBE",
    width: "100%",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#0e0d12",
    fontSize: 16,
    fontWeight: "bold",
  },
});

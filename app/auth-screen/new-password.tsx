import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function NewPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            {/* <Text style={styles.logoText}>Mooment</Text> */}
            <Image
              source={require("../../assets/images/Mooment.png")}
              style={{ width: 147, height: 120, marginBottom: 40 }}
              contentFit="contain"
            />
            <Text style={styles.title}>New Password</Text>
            <Text style={styles.subtitle}>
              Set a new password and continue using this app
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <Feather
              name="lock"
              size={20}
              color="#7A7A85"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="........"
              placeholderTextColor="#7A7A85"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={20}
                color="#7A7A85"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
          <View style={styles.inputContainer}>
            <Feather
              name="lock"
              size={20}
              color="#7A7A85"
              style={styles.icon}
            />
            <TextInput
              style={styles.input}
              placeholder="........"
              placeholderTextColor="#7A7A85"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeBtn}
            >
              <Feather
                name={showConfirmPassword ? "eye" : "eye-off"}
                size={20}
                color="#7A7A85"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/success-changed')}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "serif",
    fontStyle: "italic",
    marginBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E9B",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  inputLabel: {
    color: "#8E8E9B",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
  },
  icon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  continueButton: {
    backgroundColor: "#B59EBE",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  continueButtonText: {
    color: "#0e0d12",
    fontSize: 16,
    fontWeight: "bold",
  },
});

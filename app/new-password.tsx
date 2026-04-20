import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

export default function NewPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logoText}>Mooment</Text>
            
            <Text style={styles.title}>New Password</Text>
            <Text style={styles.subtitle}>Set a new password and continue using this app</Text>
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color="#7A7A85" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="........"
              placeholderTextColor="#7A7A85"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#7A7A85" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.continueButton} 
            activeOpacity={0.8}
            onPress={() => router.push("/success")}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
          
          {/* Debug/Error link for easy viewing since it's hard to reach otherwise */}
          <TouchableOpacity 
            onPress={() => router.push("/error")} 
            style={{marginTop: 20, alignItems: 'center'}}
          >
             <Text style={{color: '#E64A54', fontSize: 12}}>Test Error Screen</Text>
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
  },
  continueButtonText: {
    color: "#0e0d12",
    fontSize: 16,
    fontWeight: "bold",
  },
});

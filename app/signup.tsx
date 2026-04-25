import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type AccountType = "personal" | "business";

export default function SignUp() {
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Set up your username, and password to successfully sign up to the system</Text>
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, accountType === "personal" && styles.toggleBtnActive]}
              onPress={() => setAccountType("personal")}
              activeOpacity={0.8}
            >
              <Feather 
                name="user" 
                size={36} 
                color={accountType === "personal" ? "#FFFFFF" : "#7A7A85"} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toggleBtn, accountType === "business" && styles.toggleBtnActive]}
              onPress={() => setAccountType("business")}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons 
                name="office-building-outline" 
                size={40} 
                color={accountType === "business" ? "#FFFFFF" : "#7A7A85"} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Feather name="user" size={20} color="#7A7A85" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder={accountType === "personal" ? "Fullname" : "Business Name"}
              placeholderTextColor="#7A7A85"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="at-sign" size={20} color="#7A7A85" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="username"
              placeholderTextColor="#7A7A85"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color="#7A7A85" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="name@nocturnal.com"
              placeholderTextColor="#7A7A85"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
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

          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setKeepSignedIn(!keepSignedIn)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, keepSignedIn && styles.checkboxChecked]}>
                {keepSignedIn && <Feather name="check" size={12} color="#0e0d12" />}
              </View>
              <Text style={styles.checkboxText}>Keep me signed in</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.signupButton} 
            activeOpacity={0.8}
            onPress={() => setShowSuccessModal(true)}
          >
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.loginText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Post-Signup Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.starContainer}>
              <Feather name="star" size={60} color="#FFFFFF" />
            </View>
            
            <Text style={styles.modalTitle}>One Last step</Text>
            <Text style={styles.modalSubtitle}>
              We just need a few quick details to personalized your experience and get your account fully ready to go
            </Text>

            <TouchableOpacity 
              style={styles.modalButton}
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                router.push("/onboarding-settings");
              }}
            >
              <Text style={styles.modalButtonText}>Add My Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#8E8E9B",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    marginHorizontal: -8,
  },
  toggleBtn: {
    flex: 1,
    height: 90,
    backgroundColor: "#13131A", // matches inactive dark
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1A1A22",
    marginHorizontal: 8,
  },
  toggleBtnActive: {
    borderColor: "#FFFFFF", // bold highlighted border
    backgroundColor: "#1A1A22",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A22",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
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
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#2B2B36",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#B59EBE",
  },
  checkboxText: {
    color: "#8E8E9B",
    fontSize: 13,
  },
  signupButton: {
    backgroundColor: "#B59EBE",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signupButtonText: {
    color: "#0e0d12",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#8E8E9B",
    fontSize: 13,
  },
  loginText: {
    color: "#B59EBE",
    fontSize: 13,
    fontWeight: "bold",
  },
  /* Success Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#13131A",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  starContainer: {
    marginBottom: 32,
    marginTop: 8,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  modalSubtitle: {
    color: "#8E8E9B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  modalButton: {
    backgroundColor: "#B59EBE",
    width: "100%",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#17121B",
    fontSize: 16,
    fontWeight: "bold",
  },
});

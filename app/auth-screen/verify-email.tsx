import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from "react-native";
import { router } from "expo-router";

export default function VerifyEmail() {
  const [code, setCode] = useState(["", "", "", ""]);
  
  // Create refs for the 4 inputs
  const input1 = useRef<TextInput>(null);
  const input2 = useRef<TextInput>(null);
  const input3 = useRef<TextInput>(null);
  const input4 = useRef<TextInput>(null);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-advance
    if (text.length === 1) {
      if (index === 0) input2.current?.focus();
      if (index === 1) input3.current?.focus();
      if (index === 2) input4.current?.focus();
    }
    
    // Auto-backspace behavior enhancement could be added via onKeyPress,
    // but onChangeText checking empty string handles standard deletions nicely.
    if (text.length === 0) {
      if (index === 3) input3.current?.focus();
      if (index === 2) input2.current?.focus();
      if (index === 1) input1.current?.focus();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify Email</Text>
            <Text style={styles.subtitle}>
              We Sent OTP code to your email example@gmail.com. Enter the code below to verify.
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <TextInput
              ref={input1}
              style={[styles.otpInput, code[0] ? styles.otpInputActive : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[0]}
              onChangeText={(text) => handleCodeChange(text, 0)}
              placeholder="&#8226;" /* Bullet character */
              placeholderTextColor="#7A7A85"
            />
            <TextInput
              ref={input2}
              style={[styles.otpInput, code[1] ? styles.otpInputActive : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[1]}
              onChangeText={(text) => handleCodeChange(text, 1)}
              placeholder="&#8226;"
              placeholderTextColor="#7A7A85"
            />
            <TextInput
              ref={input3}
              style={[styles.otpInput, code[2] ? styles.otpInputActive : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[2]}
              onChangeText={(text) => handleCodeChange(text, 2)}
              placeholder="&#8226;"
              placeholderTextColor="#7A7A85"
            />
            <TextInput
              ref={input4}
              style={[styles.otpInput, code[3] ? styles.otpInputActive : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[3]}
              onChangeText={(text) => handleCodeChange(text, 3)}
              placeholder="&#8226;"
              placeholderTextColor="#7A7A85"
            />
          </View>

          <TouchableOpacity 
            style={styles.continueButton} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/success-verified')}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Did not receive code? </Text>
            <TouchableOpacity>
              <Text style={styles.resendText}>Resend again</Text>
            </TouchableOpacity>
          </View>
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
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    marginHorizontal: 4,
  },
  otpInput: {
    width: 64,
    height: 64,
    backgroundColor: "#1A1A22",
    borderRadius: 14,
    color: "#B59EBE", 
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    borderWidth: 1.5,
    borderColor: "#2B2B36", 
  },
  otpInputActive: {
    borderColor: "#3A3A4A", // subtle lighter border when an input is filled
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#8E8E9B",
    fontSize: 13,
  },
  resendText: {
    color: "#B59EBE",
    fontSize: 13,
    fontWeight: "bold",
  },
});

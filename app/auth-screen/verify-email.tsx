import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";

export default function VerifyEmail() {
  const [code, setCode] = useState(["", "", "", ""]);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  
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
    
    if (text.length === 0) {
      if (index === 3) input3.current?.focus();
      if (index === 2) input2.current?.focus();
      if (index === 1) input1.current?.focus();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We Sent OTP code to your email example@gmail.com. Enter the code below to verify.
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <TextInput
              ref={input1}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[0] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[0]}
              onChangeText={(text) => handleCodeChange(text, 0)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              ref={input2}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[1] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[1]}
              onChangeText={(text) => handleCodeChange(text, 1)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              ref={input3}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[2] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[2]}
              onChangeText={(text) => handleCodeChange(text, 2)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              ref={input4}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[3] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={code[3]}
              onChangeText={(text) => handleCodeChange(text, 3)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: colors.primary }]} 
            activeOpacity={0.8}
            onPress={() => router.push('/auth-screen/success-verified')}
          >
            <Text style={[styles.continueButtonText, { color: colors.background }]}>Continue</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Did not receive code? </Text>
            <TouchableOpacity>
              <Text style={[styles.resendText, { color: colors.primary }]}>Resend again</Text>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
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
    borderRadius: 14,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    borderWidth: 1.5,
  },
  continueButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
  },
  resendText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});

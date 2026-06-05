import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { Spinner } from "@/components/ui/spinner";

export default function VerifyEmail() {
  const [code, setCode] = useState(["", "", "", ""]);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const pendingVerificationEmail = useAuthStore((state) => state.pendingVerificationEmail);
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const resendVerificationCode = useAuthStore((state) => state.resendVerificationCode);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const email = params.email || pendingVerificationEmail || "";
  
  // Create refs for the 4 inputs
  const input1 = useRef<TextInput>(null);
  const input2 = useRef<TextInput>(null);
  const input3 = useRef<TextInput>(null);
  const input4 = useRef<TextInput>(null);

  const getInputRef = (index: number) => {
    if (index === 0) return input1;
    if (index === 1) return input2;
    if (index === 2) return input3;
    return input4;
  };

  const handleCodeChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, "").slice(0, 4 - index);

    if (digits.length > 1) {
      const newCode = [...code];

      digits.split("").forEach((digit, offset) => {
        newCode[index + offset] = digit;
      });

      setCode(newCode);
      getInputRef(Math.min(index + digits.length, 3)).current?.focus();
      return;
    }

    const digit = digits;
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance
    if (digit.length === 1) {
      if (index === 0) input2.current?.focus();
      if (index === 1) input3.current?.focus();
      if (index === 2) input4.current?.focus();
    }
    
    if (digit.length === 0) {
      if (index === 3) input3.current?.focus();
      if (index === 2) input2.current?.focus();
      if (index === 1) input1.current?.focus();
    }
  };

  const handleVerifyEmail = async () => {
    try {
      await verifyEmail({
        email,
        code: code.join(""),
      });
      router.push('/auth-screen/success-verified');
    } catch {
      // The store exposes a user-friendly error below the form.
    }
  };

  const handleResendCode = async () => {
    try {
      await resendVerificationCode(email);
    } catch {
      // The store exposes a user-friendly error below the form.
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
              We sent OTP code to your email {email || "your email"}. Enter the code below to verify.
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <TextInput
              ref={input1}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[0] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={4}
              value={code[0]}
              onChangeText={(text) => handleCodeChange(text, 0)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
              editable={!isLoading}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
            <TextInput
              ref={input2}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[1] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={4}
              value={code[1]}
              onChangeText={(text) => handleCodeChange(text, 1)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
              editable={!isLoading}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
            <TextInput
              ref={input3}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[2] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={4}
              value={code[2]}
              onChangeText={(text) => handleCodeChange(text, 2)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
              editable={!isLoading}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
            <TextInput
              ref={input4}
              style={[styles.otpInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary }, code[3] ? { borderColor: colors.primary } : null]}
              keyboardType="number-pad"
              maxLength={4}
              value={code[3]}
              onChangeText={(text) => handleCodeChange(text, 3)}
              placeholder="&#8226;"
              placeholderTextColor={colors.textSecondary}
              editable={!isLoading}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
          </View>

          {authError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{authError}</Text>
          )}

          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: colors.primary }, isLoading && styles.continueButtonDisabled]} 
            activeOpacity={0.8}
            onPress={handleVerifyEmail}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner color={colors.background} />
            ) : (
              <Text style={[styles.continueButtonText, { color: colors.background }]}>Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Did not receive code? </Text>
            <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
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
  continueButtonDisabled: {
    opacity: 0.75,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
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

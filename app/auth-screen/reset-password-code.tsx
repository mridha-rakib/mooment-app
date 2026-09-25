import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/authStore";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";

const CODE_LENGTH = 4;

export default function ResetPasswordCode() {
  const [code, setCode] = useState(Array.from({ length: CODE_LENGTH }, () => ""));
  const [localError, setLocalError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "";
  const validatePasswordResetCode = useAuthStore((state) => state.validatePasswordResetCode);
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const inputs = useRef<(TextInput | null)[]>([]);

  const focusInput = (index: number) => {
    inputs.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus();
  };

  const handleCodeChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH - index);

    if (digits.length > 1) {
      const nextCode = [...code];

      digits.split("").forEach((digit, offset) => {
        nextCode[index + offset] = digit;
      });

      setCode(nextCode);
      focusInput(index + digits.length);
      return;
    }

    const nextCode = [...code];
    nextCode[index] = digits;
    setCode(nextCode);

    if (digits && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }

    if (!digits && index > 0) {
      focusInput(index - 1);
    }
  };

  const handleContinue = async () => {
    const joinedCode = code.join("");

    if (!email) {
      setLocalError("Enter your email address before verifying a reset code.");
      return;
    }

    if (joinedCode.length !== CODE_LENGTH) {
      setLocalError("Enter the 4-digit reset code.");
      return;
    }

    setLocalError(null);

    try {
      await validatePasswordResetCode({ email, code: joinedCode });
      router.push({
        pathname: "/auth-screen/new-password",
        params: { email, code: joinedCode },
      });
    } catch {
      // The store exposes a user-friendly error below the form.
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setLocalError("Enter your email address before requesting a new code.");
      return;
    }

    setLocalError(null);

    try {
      await requestPasswordReset({ email });
      setCode(Array.from({ length: CODE_LENGTH }, () => ""));
      focusInput(0);
    } catch {
      // The store exposes a user-friendly error below the form.
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We sent OTP code to your email {email || "your email"}. Enter the code below to continue.
            </Text>
          </View>

          <View style={styles.otpContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(input) => {
                  inputs.current[index] = input;
                }}
                style={[
                  styles.otpInput,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.primary },
                  digit ? { borderColor: colors.primary } : null,
                ]}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                placeholder="&#8226;"
                placeholderTextColor={colors.textSecondary}
                editable={!isLoading}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
              />
            ))}
          </View>

          {(localError || authError) && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{localError || authError}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: buttonBackground(colors) },
              isLoading && styles.continueButtonDisabled,
            ]}
            activeOpacity={0.8}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner color={buttonForeground(colors)} />
            ) : (
              <Text style={[styles.continueButtonText, { color: buttonForeground(colors) }]}>Continue</Text>
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
    width: 42,
    height: 56,
    borderRadius: 14,
    fontSize: 24,
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

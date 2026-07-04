import {
  Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React,
  { useState } from "react";
import { KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/authStore";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);

  const handleContinue = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setLocalError("Enter your email address.");
      return;
    }

    setLocalError(null);

    try {
      const resetEmail = await requestPasswordReset({ email: normalizedEmail });
      router.push({
        pathname: "/auth-screen/reset-password-code",
        params: { email: resetEmail },
      });
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
            {/* Logo placeholder */}
            <Text style={[styles.logoText, { color: colors.text }]}>Mooment</Text>
             
            <Text style={[styles.title, { color: colors.text }]}>Forget Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Type your email to recover your account</Text>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="mail" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="name@nocturnal.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          {(localError || authError) && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{localError || authError}</Text>
          )}

          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: buttonBackground(colors) }, isLoading && styles.continueButtonDisabled]} 
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
            <TouchableOpacity onPress={() => router.push('/auth-screen/login')}>
              <Text style={[styles.backLoginText, { color: colors.primary }]}>Back to Log In</Text>
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
  logoText: {
    fontSize: 40,
    fontFamily: 'OleoScript-Regular',
    marginBottom: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 24,
    borderWidth: 1,
  },
  icon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
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
    alignItems: "center",
  },
  backLoginText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});

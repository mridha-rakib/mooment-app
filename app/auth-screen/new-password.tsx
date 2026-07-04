import {
  Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React,
  { useState } from "react";
import {
  KeyboardAvoidingView,
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
export default function NewPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);

  const handleContinue = async () => {
    const email = params.email || "";
    const code = params.code || "";
    const isPasswordResetFlow = Boolean(email && code);

    if (!isPasswordResetFlow) {
      router.push("/auth-screen/success-changed");
      return;
    }

    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    setLocalError(null);

    try {
      await resetPassword({ email, code, newPassword: password });
      router.push("/auth-screen/success-changed");
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
            <Text style={[styles.logoText, { color: colors.text }]}>Mooment</Text>
            <Text style={[styles.title, { color: colors.text }]}>New Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Set a new password and continue using this app
            </Text>
          </View>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather
              name="lock"
              size={20}
              color={colors.textSecondary}
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="........"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Feather
                name={showPassword ? "eye" : "eye-off"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CONFIRM PASSWORD</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather
              name="lock"
              size={20}
              color={colors.textSecondary}
              style={styles.icon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="........"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeBtn}
            >
              <Feather
                name={showConfirmPassword ? "eye" : "eye-off"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
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
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  inputLabel: {
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
  eyeBtn: {
    padding: 4,
  },
  continueButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
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
});

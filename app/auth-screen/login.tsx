import {
  Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React,
  { useRef, useState } from "react";
import { KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { Spinner } from "@/components/ui/spinner";

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
export default function Login() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);

  const scrollToFormBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  const handleLogin = async () => {
    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)/home' as any);
    } catch {
      const state = useAuthStore.getState();

      if (state.authErrorCode === "EMAIL_NOT_VERIFIED" && state.pendingVerificationEmail) {
        router.push({
          pathname: '/auth-screen/verify-email',
          params: { email: state.pendingVerificationEmail },
        } as any);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ backgroundColor: colors.background }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your credentials to sync with the pulse.</Text>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email or username"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
              disableFullscreenUI={Platform.OS === "android"}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="lock" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="........"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              onSubmitEditing={handleLogin}
              onFocus={scrollToFormBottom}
              disableFullscreenUI={Platform.OS === "android"}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setKeepSignedIn(!keepSignedIn)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, { backgroundColor: colors.border }, keepSignedIn && { backgroundColor: colors.primary }]}>
                {keepSignedIn && <Feather name="check" size={12} color={colors.background} />}
              </View>
              <Text style={[styles.checkboxText, { color: colors.textSecondary }]}>Keep me signed in</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => router.push('/auth-screen/forgot-password')}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>FORGOT PASSWORD?</Text>
            </TouchableOpacity>
          </View>

          {authError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{authError}</Text>
          )}

          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: buttonBackground(colors) }, isLoading && styles.loginButtonDisabled]} 
            activeOpacity={0.8}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner color={buttonForeground(colors)} />
            ) : (
              <Text style={[styles.loginButtonText, { color: buttonForeground(colors) }]}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => router.push('/auth-screen/signup')}>
              <Text style={[styles.createOneText, { color: colors.primary }]}>Create One</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
    paddingBottom: 96,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 44,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1,
  },
  icon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 13,
  },
  forgotText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  loginButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
  createOneText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});

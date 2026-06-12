import { Feather } from "@expo/vector-icons";
import { Building03Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
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

type AccountType = "personal" | "business";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeUsername = (value: string) => value.trim().replace(/^@+/, "").toLowerCase();
const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getSignUpValidationError = ({
  name,
  username,
  email,
  password,
}: {
  name: string;
  username: string;
  email: string;
  password: string;
}) => {
  if (name.trim().length < 2) {
    return "Enter your full name or business name.";
  }

  if (username.length < 3) {
    return "Username must be at least 3 characters.";
  }

  if (!USERNAME_PATTERN.test(username)) {
    return "Username can only contain letters, numbers, and underscores.";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
};

export default function SignUp() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const visibleError = formError ?? authError;

  const scrollToFormBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 250);
  };

  const handleSignUp = async () => {
    const normalizedUsername = normalizeUsername(username);
    const normalizedEmail = normalizeEmail(email);
    const validationError = getSignUpValidationError({
      name,
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    });

    setUsername(normalizedUsername);
    setEmail(normalizedEmail);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    try {
      const pendingEmail = await register({
        name,
        username: normalizedUsername,
        email: normalizedEmail,
        password,
        accountType,
      });

      router.push({
        pathname: '/auth-screen/verify-email',
        params: { email: pendingEmail },
      } as any);
    } catch {
      // The store exposes a user-friendly error below the form.
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
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Set up your username, and password to successfully sign up to the system</Text>
          </View>

          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, { backgroundColor: colors.card, borderColor: colors.border }, accountType === "personal" && { borderColor: colors.primary }]}
              onPress={() => setAccountType("personal")}
              activeOpacity={0.8}
            >
              <HugeiconsIcon 
                icon={UserIcon} 
                size={32} 
                color={accountType === "personal" ? colors.primary : colors.textSecondary} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.toggleBtn, { backgroundColor: colors.card, borderColor: colors.border }, accountType === "business" && { borderColor: colors.primary }]}
              onPress={() => setAccountType("business")}
              activeOpacity={0.8}
            >
              <HugeiconsIcon 
                icon={Building03Icon} 
                size={32} 
                color={accountType === "business" ? colors.primary : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={accountType === "personal" ? "Fullname" : "Business Name"}
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setFormError(null);
              }}
              editable={!isLoading}
              disableFullscreenUI={Platform.OS === "android"}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="at-sign" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="username"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                setFormError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              disableFullscreenUI={Platform.OS === "android"}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="mail" size={20} color={colors.textSecondary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="name@nocturnal.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setFormError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
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
              onChangeText={(value) => {
                setPassword(value);
                setFormError(null);
              }}
              editable={!isLoading}
              onSubmitEditing={handleSignUp}
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
          </View>

          {visibleError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{visibleError}</Text>
          )}

          <TouchableOpacity 
            style={[styles.signupButton, { backgroundColor: colors.primary }, isLoading && styles.signupButtonDisabled]} 
            activeOpacity={0.8}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner color={colors.background} />
            ) : (
              <Text style={[styles.signupButtonText, { color: colors.background }]}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth-screen/login')}>
              <Text style={[styles.loginText, { color: colors.primary }]}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Post-Signup Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.starContainer}>
              <Feather name="star" size={60} color={colors.primary} />
            </View>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>One Last step</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              We just need a few quick details to personalized your experience and get your account fully ready to go
            </Text>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/profile-screen/edit-profile');
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.background }]}>Add My Profile</Text>
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
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
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
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    marginHorizontal: 8,
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 13,
  },
  signupButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signupButtonDisabled: {
    opacity: 0.75,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  signupButtonText: {
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
  loginText: {
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
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  starContainer: {
    marginBottom: 32,
    marginTop: 8,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  modalButton: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

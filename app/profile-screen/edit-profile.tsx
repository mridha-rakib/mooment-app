import BackButton from "@/components/ui/BackButton";
import { Spinner, SpinnerCustom } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageDownloadUrl, getStorageFileUrl, uploadFileToStorage } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200";
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_OPTIONS = ["Male", "Female", "Others"] as const;

type ProfileType = "personal" | "business";
type GenderOption = (typeof GENDER_OPTIONS)[number];
type FeatherIconName = React.ComponentProps<typeof Feather>["name"];
type ThemeColors = ReturnType<typeof useTheme>["colors"];

type PendingUpload = {
  contentType: string;
  key: string;
  uri: string;
};

type PendingDocument = PendingUpload & {
  name: string;
  size?: number | null;
};

type DocumentMeta = {
  contentType?: string | null;
  key?: string | null;
  name: string;
  size?: number | null;
  uri?: string | null;
};

type CustomInputProps = {
  autoCapitalize?: TextInputProps["autoCapitalize"];
  colors: ThemeColors;
  editable?: boolean;
  icon?: FeatherIconName;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  onChangeText: (text: string) => void;
  placeholder: string;
  rightIcon?: FeatherIconName;
  style?: StyleProp<ViewStyle>;
  value: string;
};

const getFileNameFromKey = (key?: string | null) => {
  if (!key) {
    return "Business document.pdf";
  }

  return decodeURIComponent(key.split("/").pop() || "Business document.pdf");
};

const formatFileSize = (size?: number | null) => {
  if (!size) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const roundedValue = value >= 10 ? Math.round(value).toString() : value.toFixed(1);

  return `${roundedValue} ${units[unitIndex]}`;
};

const getDocumentMetaText = (document: DocumentMeta | null) => {
  const fileType = document?.contentType?.split("/").pop()?.toUpperCase() || "PDF";
  const fileSize = formatFileSize(document?.size);

  return [fileType, fileSize].filter(Boolean).join(" • ");
};

const getUploadExtension = (contentType: string, fallback: string) => {
  const extension = contentType.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg");

  return extension || fallback;
};

const CustomInput = ({
  autoCapitalize,
  colors,
  editable = true,
  icon,
  keyboardType,
  multiline,
  onChangeText,
  placeholder,
  rightIcon,
  style,
  value,
}: CustomInputProps) => (
  <View
    style={[
      styles.inputContainer,
      { backgroundColor: colors.card, borderColor: colors.border },
      multiline && styles.inputContainerMultiline,
      style,
    ]}
  >
    {icon ? <Feather name={icon} size={16} color={colors.textSecondary} style={styles.inputIcon} /> : null}
    <TextInput
      autoCapitalize={autoCapitalize}
      disableFullscreenUI={Platform.OS === "android"}
      editable={editable}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      style={[styles.input, { color: editable ? colors.text : colors.textSecondary }, multiline && styles.inputMultiline]}
      textAlignVertical={multiline ? "top" : "center"}
      value={value}
    />
    {rightIcon ? (
      <Feather name={rightIcon} size={16} color={colors.textSecondary} style={styles.inputRightIcon} />
    ) : null}
  </View>
);

export default function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { type, mode } = useLocalSearchParams<{ type?: ProfileType; mode?: string }>();
  const isSwitchMode = mode === 'switch';
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const restoreAuthSession = useAuthStore((state) => state.restoreAuthSession);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isMountedRef = useRef(true);

  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileType, setProfileType] = useState<ProfileType>(type || user?.accountType || "personal");
  const [hasImage, setHasImage] = useState(true);
  const [avatarUri, setAvatarUri] = useState(DEFAULT_AVATAR);
  const [avatarKey, setAvatarKey] = useState<string | null>(user?.avatarKey ?? null);
  const [pendingAvatar, setPendingAvatar] = useState<PendingUpload | null>(null);
  const [businessDocumentKey, setBusinessDocumentKey] = useState<string | null>(user?.businessDocumentKey ?? null);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(
    user?.businessDocumentKey
      ? {
          contentType: "application/pdf",
          key: user.businessDocumentKey,
          name: getFileNameFromKey(user.businessDocumentKey),
        }
      : null,
  );
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [gender, setGender] = useState(user?.gender ?? "");
  const [isGenderDropdownVisible, setIsGenderDropdownVisible] = useState(false);
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [address, setAddress] = useState(user?.address ?? "");

  const isBusiness = profileType === "business";
  const hasDocument = Boolean(businessDocumentKey || pendingDocument);
  const isBusy = isLoading || isProfileLoading;

  const loadProfile = useCallback(async () => {
    setIsProfileLoading(true);
    setProfileLoadError(null);

    try {
      const restoredUser = await restoreAuthSession(true);

      if (!restoredUser && isMountedRef.current) {
        setProfileLoadError("Unable to load your profile. Please sign in again.");
      }
    } catch (error) {
      if (isMountedRef.current) {
        setProfileLoadError(getAuthErrorMessage(error, "Unable to load your profile."));
      }
    } finally {
      if (isMountedRef.current) {
        setIsProfileLoading(false);
      }
    }
  }, [restoreAuthSession]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileType(type || user.accountType || "personal");
    setName(user.name ?? "");
    setUsername(user.username ?? "");
    setEmail(user.email ?? "");
    setGender(user.gender ?? "");
    setAge(user.age ? String(user.age) : "");
    setBio(user.bio ?? "");
    setAddress(user.address ?? "");
    setAvatarKey(user.avatarKey ?? null);
    setPendingAvatar(null);
    setHasImage(true);
    setBusinessDocumentKey(user.businessDocumentKey ?? null);
    setPendingDocument(null);
    setDocumentMeta(
      user.businessDocumentKey
        ? {
            contentType: "application/pdf",
            key: user.businessDocumentKey,
            name: getFileNameFromKey(user.businessDocumentKey),
          }
        : null,
    );
  }, [type, user]);

  useEffect(() => {
    if (!user?.avatarKey) {
      setAvatarUri(DEFAULT_AVATAR);
      setHasImage(true);
      return;
    }

    setAvatarUri(getStorageFileUrl(user.avatarKey));
    setHasImage(true);
  }, [user?.avatarKey]);

  const handlePickAvatar = async () => {
    if (isBusy) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo library access to update your profile image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const contentType = asset.mimeType || "image/jpeg";
    const extension = getUploadExtension(contentType, "jpg");
    const key = `users/${user?.id ?? "me"}/avatar-${Date.now()}.${extension}`;

    setAvatarUri(asset.uri);
    setAvatarKey(key);
    setPendingAvatar({ contentType, key, uri: asset.uri });
    setHasImage(true);
  };

  const handleDeleteAvatar = () => {
    if (isBusy) {
      return;
    }

    setHasImage(false);
    setAvatarKey(null);
    setPendingAvatar(null);
  };

  const handlePickDocument = async () => {
    if (isBusy) {
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: "application/pdf",
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const isPdf = asset.mimeType === "application/pdf" || asset.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      Alert.alert("PDF required", "Please upload a PDF business registration document.");
      return;
    }

    const key = `users/${user?.id ?? "me"}/business-document-${Date.now()}.pdf`;
    const document: PendingDocument = {
      contentType: "application/pdf",
      key,
      name: asset.name || "Business document.pdf",
      size: asset.size ?? null,
      uri: asset.uri,
    };

    setBusinessDocumentKey(key);
    setPendingDocument(document);
    setDocumentMeta(document);
  };

  const handleDeleteDocument = () => {
    if (isBusy) {
      return;
    }

    setBusinessDocumentKey(null);
    setPendingDocument(null);
    setDocumentMeta(null);
  };

  const handleGenderSelect = (selectedGender: GenderOption) => {
    setGender(selectedGender);
    setIsGenderDropdownVisible(false);
  };

  const handleOpenDocument = async () => {
    try {
      const url = pendingDocument?.uri || (businessDocumentKey ? await getStorageDownloadUrl(businessDocumentKey) : null);

      if (!url) {
        Alert.alert("No document", "Upload a PDF document first.");
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Unable to open document", getAuthErrorMessage(error, "Please try again."));
    }
  };

  const validateProfile = () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim().replace(/^@/, "");
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedAge = age.trim();

    if (trimmedName.length < 2) {
      Alert.alert("Name required", "Enter at least 2 characters for your name.");
      return null;
    }

    if (!USERNAME_PATTERN.test(trimmedUsername)) {
      Alert.alert("Invalid username", "Username must be 3-40 characters and use only letters, numbers, or underscores.");
      return null;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return null;
    }

    if (!isBusiness && trimmedAge) {
      const parsedAge = Number(trimmedAge);

      if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 130) {
        Alert.alert("Invalid age", "Age must be a whole number between 0 and 130.");
        return null;
      }

      return {
        age: parsedAge,
        email: trimmedEmail,
        name: trimmedName,
        username: trimmedUsername,
      };
    }

    return {
      age: null,
      email: trimmedEmail,
      name: trimmedName,
      username: trimmedUsername,
    };
  };

  const handleSave = async () => {
    if (isBusy) {
      return;
    }

    if (!user) {
      Alert.alert("Profile unavailable", "Please sign in again before updating your profile.");
      return;
    }

    const validatedProfile = validateProfile();

    if (!validatedProfile) {
      return;
    }

    try {
      let finalAvatarKey = hasImage ? avatarKey : null;
      let finalDocumentKey = isBusiness ? businessDocumentKey : null;

      if (hasImage && pendingAvatar) {
        finalAvatarKey = await uploadFileToStorage(pendingAvatar);
      }

      if (isBusiness && pendingDocument) {
        finalDocumentKey = await uploadFileToStorage(pendingDocument);
      }

      await updateProfile({
        accountType: profileType,
        address: isBusiness ? address.trim() || null : null,
        age: isBusiness ? null : validatedProfile.age,
        avatarKey: finalAvatarKey,
        bio: bio.trim() || null,
        businessDocumentKey: isBusiness ? finalDocumentKey : null,
        email: validatedProfile.email,
        gender: isBusiness ? null : gender.trim() || null,
        name: validatedProfile.name,
        username: validatedProfile.username,
      });
      router.back();
    } catch (error) {
      Alert.alert("Unable to save profile", getAuthErrorMessage(error, "Please try again."));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isProfileLoading ? (
        <View style={styles.centerState}>
          <SpinnerCustom color={colors.textSecondary} size="large" />
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>Loading profile...</Text>
        </View>
      ) : profileLoadError ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Unable to load profile</Text>
          <Text style={[styles.stateText, { color: colors.textSecondary }]}>{profileLoadError}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadProfile}>
            <Text style={[styles.retryBtnText, { color: colors.background }]}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>IMAGE</Text>
                {hasImage ? (
                  <TouchableOpacity onPress={handleDeleteAvatar} disabled={isBusy}>
                    <Feather name="trash-2" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.avatarWrapper}>
                <View style={[styles.avatarContainer, { backgroundColor: colors.card }]}>
                  {hasImage ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.emptyAvatar, { backgroundColor: colors.border }]}>
                      <Feather name="user" size={40} color={colors.textSecondary} />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  disabled={isBusy}
                  onPress={handlePickAvatar}
                  style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}
                >
                  <Feather name="camera" size={14} color={colors.background} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <CustomInput
                  colors={colors}
                  editable={!isBusy}
                  icon="user"
                  onChangeText={setName}
                  placeholder={isBusiness ? "Business name" : "Fullname"}
                  value={name}
                />
                <CustomInput
                  autoCapitalize="none"
                  colors={colors}
                  editable={!isBusy && !isSwitchMode}
                  icon="at-sign"
                  onChangeText={setUsername}
                  placeholder="username"
                  value={username}
                />
                <CustomInput
                  autoCapitalize="none"
                  colors={colors}
                  editable={!isBusy && !isSwitchMode}
                  icon="mail"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="name@nocturnal.com"
                  value={email}
                />

                {isBusiness ? (
                  <CustomInput
                    colors={colors}
                    editable={!isBusy}
                    icon="map-pin"
                    onChangeText={setAddress}
                    placeholder="Address"
                    value={address}
                  />
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    disabled={isBusy}
                    onPress={() => setIsGenderDropdownVisible(true)}
                    style={[
                      styles.inputContainer,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isBusy && styles.disabledButton,
                    ]}
                  >
                    <Feather name="target" size={16} color={colors.textSecondary} style={styles.inputIcon} />
                    <Text style={[styles.input, { color: gender ? colors.text : colors.textSecondary }]}>
                      {gender || "Gender"}
                    </Text>
                    <Feather name="chevron-down" size={16} color={colors.textSecondary} style={styles.inputRightIcon} />
                  </TouchableOpacity>
                )}
              </View>

              {!isBusiness ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AGE</Text>
                  <CustomInput
                    colors={colors}
                    editable={!isBusy}
                    keyboardType="number-pad"
                    onChangeText={setAge}
                    placeholder="21"
                    value={age}
                  />
                </View>
              ) : null}

              {isBusiness ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBMIT BUSINESS DOCUMENTS FOR REVIEW</Text>
                  <Text style={[styles.docDesc, { color: colors.textSecondary }]}>
                    To confirm your business is legitimate, we require an official registration document (PDF). Our team
                    will review this in the background while you use your account.
                  </Text>

                  {!hasDocument ? (
                    <TouchableOpacity
                      disabled={isBusy}
                      onPress={handlePickDocument}
                      style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                    >
                      <Feather name="upload-cloud" size={16} color={colors.background} style={styles.uploadIcon} />
                      <Text style={[styles.uploadBtnText, { color: colors.background }]}>Upload PDF</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.uploadedDocCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={[styles.docIconWrapper, { backgroundColor: colors.border }]}>
                        <Feather name="file-text" size={20} color={colors.textSecondary} />
                      </View>
                      <View style={styles.docInfo}>
                        <Text numberOfLines={1} style={[styles.docName, { color: colors.text }]}>
                          {documentMeta?.name ?? getFileNameFromKey(businessDocumentKey)}
                        </Text>
                        <Text style={[styles.docMeta, { color: colors.textSecondary }]}>
                          {getDocumentMetaText(documentMeta) || "PDF"}
                        </Text>
                      </View>
                      <View style={styles.docActions}>
                        <TouchableOpacity style={styles.docActionBtn} onPress={handleOpenDocument} disabled={isBusy}>
                          <Feather name="download" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docActionBtn} onPress={handleOpenDocument} disabled={isBusy}>
                          <Feather name="eye" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.docActionBtn} onPress={handleDeleteDocument} disabled={isBusy}>
                          <Feather name="x" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BIO</Text>
                <CustomInput
                  colors={colors}
                  editable={!isBusy}
                  multiline
                  onChangeText={setBio}
                  placeholder={isBusiness ? "Detail about business" : "Detail about yourself"}
                  style={styles.bioInput}
                  value={bio}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              disabled={isLoading}
              onPress={() => router.back()}
              style={[styles.cancelBtn, { backgroundColor: colors.card }, isLoading && styles.disabledButton]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isLoading}
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: colors.primary }, isLoading && styles.disabledButton]}
            >
              {isLoading ? (
                <Spinner color={colors.background} />
              ) : (
                <Text style={[styles.saveBtnText, { color: colors.background }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <Modal
            animationType="slide"
            transparent
            visible={isGenderDropdownVisible}
            onRequestClose={() => setIsGenderDropdownVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsGenderDropdownVisible(false)}>
              <View style={styles.dropdownOverlay}>
                <TouchableWithoutFeedback>
                  <View style={[styles.dropdownSheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
                    {/* Drag handle */}
                    <View style={styles.dropdownHandle}>
                      <View style={[styles.dropdownHandleBar, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Title */}
                    <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Gender</Text>
                    </View>

                    {/* Options */}
                    {GENDER_OPTIONS.map((option, index) => (
                      <TouchableOpacity
                        key={option}
                        activeOpacity={0.7}
                        onPress={() => handleGenderSelect(option)}
                        style={[
                          styles.dropdownOption,
                          index < GENDER_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            { color: gender === option ? colors.primary : colors.text },
                            gender === option && styles.dropdownOptionSelected,
                          ]}
                        >
                          {option}
                        </Text>
                        {gender === option ? (
                          <Feather name="check" size={16} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    ))}

                    {/* Cancel button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIsGenderDropdownVisible(false)}
                      style={[styles.dropdownCancel, { borderTopColor: colors.border }]}
                    >
                      <Text style={[styles.dropdownCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 15,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerSpacer: {
    height: 36,
    width: 36,
  },
  keyboardView: {
    flex: 1,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  stateText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  retryBtn: {
    alignItems: "center",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 22,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  avatarWrapper: {
    alignSelf: "flex-start",
    marginBottom: 30,
    position: "relative",
  },
  avatarContainer: {
    alignItems: "center",
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    overflow: "hidden",
    width: 80,
  },
  avatar: {
    height: "100%",
    width: "100%",
  },
  emptyAvatar: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  cameraBadge: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    bottom: 0,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 0,
    width: 28,
  },
  formGroup: {
    gap: 12,
    marginBottom: 25,
  },
  inputContainer: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    height: 50,
    paddingHorizontal: 15,
  },
  inputContainerMultiline: {
    alignItems: "flex-start",
    height: "auto",
    paddingVertical: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputRightIcon: {
    marginLeft: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 70,
  },
  section: {
    marginBottom: 25,
  },
  bioInput: {
    height: 100,
  },
  docDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 15,
    marginTop: 8,
  },
  uploadBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  uploadIcon: {
    marginRight: 8,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  uploadedDocCard: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    padding: 15,
  },
  docIconWrapper: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    marginRight: 12,
    width: 40,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 11,
  },
  docActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 15,
  },
  docActionBtn: {
    padding: 2,
  },
  dropdownOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flex: 1,
    justifyContent: "flex-end",
  },
  dropdownSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  dropdownHandle: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  dropdownHandleBar: {
    borderRadius: 3,
    height: 4,
    width: 40,
  },
  dropdownHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 6,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dropdownOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 20,
  },
  dropdownOptionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  dropdownOptionSelected: {
    fontWeight: "700",
  },
  dropdownCancel: {
    alignItems: "center",
    borderTopWidth: 1,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 54,
  },
  dropdownCancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
  footer: {
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 25,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  cancelBtn: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    height: 50,
    justifyContent: "center",
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveBtn: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    height: 50,
    justifyContent: "center",
    marginLeft: 10,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.7,
  },
});

import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

const CustomInput = ({ icon, placeholder, value, rightIcon, multiline, style, colors }: any) => (
  <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }, multiline && styles.inputContainerMultiline, style]}>
    {icon && <Feather name={icon} size={16} color={colors.textSecondary} style={styles.inputIcon} />}
    <TextInput
      style={[styles.input, { color: colors.text }, multiline && styles.inputMultiline]}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
    />
    {rightIcon && <Feather name={rightIcon} size={16} color={colors.textSecondary} style={styles.inputRightIcon} />}
  </View>
);

export default function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: 'personal' | 'business' }>();

  // Using state to easily switch during dev, defaults to personal
  const [profileType, setProfileType] = useState<'personal' | 'business'>(type || 'personal');
  const [hasImage, setHasImage] = useState(true);
  const [hasDocument, setHasDocument] = useState(false);

  const isBusiness = profileType === 'business';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setProfileType(isBusiness ? 'personal' : 'business')}
        >
          <Feather name="refresh-cw" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Image Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>IMAGE</Text>
            {hasImage && (
              <TouchableOpacity onPress={() => setHasImage(false)}>
                <Feather name="trash-2" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.card }]}>
              {hasImage ? (
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.emptyAvatar, { backgroundColor: colors.border }]}>
                  <Feather name="user" size={40} color={colors.textSecondary} />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}
              onPress={() => setHasImage(true)}
            >
              <Feather name="camera" size={14} color={colors.background} />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <CustomInput
              colors={colors}
              icon="user"
              placeholder={isBusiness ? "Business name" : "Fullname"}
            />
            <CustomInput
              colors={colors}
              icon="at-sign"
              placeholder="username"
            />
            <CustomInput
              colors={colors}
              icon="mail"
              placeholder="name@nocturnal.com"
            />

            {isBusiness ? (
              <CustomInput
                colors={colors}
                icon="map-pin"
                placeholder="Address"
              />
            ) : (
              <CustomInput
                colors={colors}
                icon="target" // approximate icon for gender
                placeholder="Gender"
                rightIcon="chevron-down"
              />
            )}
          </View>

          {/* Age (Personal only) */}
          {!isBusiness && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AGE</Text>
              <CustomInput colors={colors} placeholder="21" />
            </View>
          )}

          {/* Business Documents (Business only) */}
          {isBusiness && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBMIT BUSINESS DOCUMENTS FOR REVIEW</Text>
              <Text style={[styles.docDesc, { color: colors.textSecondary }]}>
                To confirm your business is legitimate, we require an official registration document (PDF). Our team will review this in the background while you use your account.
              </Text>

              {!hasDocument ? (
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setHasDocument(true)}
                >
                  <Feather name="upload-cloud" size={16} color={colors.background} style={{ marginRight: 8 }} />
                  <Text style={[styles.uploadBtnText, { color: colors.background }]}>Upload PDF</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.uploadedDocCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.docIconWrapper, { backgroundColor: colors.border }]}>
                    <Feather name="file-text" size={20} color={colors.textSecondary} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={[styles.docName, { color: colors.text }]}>File name</Text>
                    <Text style={[styles.docMeta, { color: colors.textSecondary }]}>File type  •  245KB</Text>
                  </View>
                  <View style={styles.docActions}>
                    <TouchableOpacity style={styles.docActionBtn}><Feather name="download" size={16} color={colors.textSecondary} /></TouchableOpacity>
                    <TouchableOpacity style={styles.docActionBtn}><Feather name="eye" size={16} color={colors.textSecondary} /></TouchableOpacity>
                    <TouchableOpacity
                      style={styles.docActionBtn}
                      onPress={() => setHasDocument(false)}
                    >
                      <Feather name="x" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Bio */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BIO</Text>
            <CustomInput
              colors={colors}
              placeholder={isBusiness ? "Detail about business" : "Detail about yourselft"}
              multiline={true}
              style={{ height: 100 }}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.saveBtnText, { color: colors.background }]}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  avatarWrapper: {
    alignSelf: 'flex-start',
    marginBottom: 30,
    position: 'relative',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  emptyAvatar: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  formGroup: {
    gap: 12,
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
  },
  inputContainerMultiline: {
    height: 'auto',
    alignItems: 'flex-start',
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
  docDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 15,
    marginTop: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
  },
  docIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 11,
  },
  docActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  docActionBtn: {
    padding: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 10,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 10,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

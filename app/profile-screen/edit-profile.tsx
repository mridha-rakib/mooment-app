import { Feather } from "@expo/vector-icons";
import BackButton from "@/components/ui/BackButton";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CustomInput = ({ icon, placeholder, value, rightIcon, multiline, style }: any) => (
  <View style={[styles.inputContainer, multiline && styles.inputContainerMultiline, style]}>
    {icon && <Feather name={icon} size={16} color="#8E8E9B" style={styles.inputIcon} />}
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      placeholder={placeholder}
      placeholderTextColor="#8E8E9B"
      value={value}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
    />
    {rightIcon && <Feather name={rightIcon} size={16} color="#8E8E9B" style={styles.inputRightIcon} />}
  </View>
);

export default function EditProfileScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: 'personal' | 'business' }>();

  // Using state to easily switch during dev, defaults to personal
  const [profileType, setProfileType] = useState<'personal' | 'business'>(type || 'personal');
  const [hasImage, setHasImage] = useState(true);
  const [hasDocument, setHasDocument] = useState(false);

  const isBusiness = profileType === 'business';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setProfileType(isBusiness ? 'personal' : 'business')}
        >
          <Feather name="refresh-cw" size={16} color="#8E8E9B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Image Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>IMAGE</Text>
            {hasImage && (
              <TouchableOpacity onPress={() => setHasImage(false)}>
                <Feather name="trash-2" size={16} color="#8E8E9B" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              {hasImage ? (
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200' }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.emptyAvatar}>
                  <Feather name="user" size={40} color="#8E8E9B" />
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={() => setHasImage(true)}
            >
              <Feather name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <CustomInput
              icon="user"
              placeholder={isBusiness ? "Business name" : "Fullname"}
            />
            <CustomInput
              icon="at-sign"
              placeholder="username"
            />
            <CustomInput
              icon="mail"
              placeholder="name@nocturnal.com"
            />

            {isBusiness ? (
              <CustomInput
                icon="map-pin"
                placeholder="Address"
              />
            ) : (
              <CustomInput
                icon="target" // approximate icon for gender
                placeholder="Gender"
                rightIcon="chevron-down"
              />
            )}
          </View>

          {/* Age (Personal only) */}
          {!isBusiness && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AGE</Text>
              <CustomInput placeholder="21" />
            </View>
          )}

          {/* Business Documents (Business only) */}
          {isBusiness && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SUBMIT BUSINESS DOCUMENTS FOR REVIEW</Text>
              <Text style={styles.docDesc}>
                To confirm your business is legitimate, we require an official registration document (PDF). Our team will review this in the background while you use your account.
              </Text>

              {!hasDocument ? (
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => setHasDocument(true)}
                >
                  <Feather name="upload-cloud" size={16} color="#0e0d12" style={{ marginRight: 8 }} />
                  <Text style={styles.uploadBtnText}>Upload PDF</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.uploadedDocCard}>
                  <View style={styles.docIconWrapper}>
                    <Feather name="file-text" size={20} color="#8E8E9B" />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>File name</Text>
                    <Text style={styles.docMeta}>File type  •  245KB</Text>
                  </View>
                  <View style={styles.docActions}>
                    <TouchableOpacity style={styles.docActionBtn}><Feather name="download" size={16} color="#8E8E9B" /></TouchableOpacity>
                    <TouchableOpacity style={styles.docActionBtn}><Feather name="eye" size={16} color="#8E8E9B" /></TouchableOpacity>
                    <TouchableOpacity
                      style={styles.docActionBtn}
                      onPress={() => setHasDocument(false)}
                    >
                      <Feather name="x" size={16} color="#8E8E9B" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BIO</Text>
            <CustomInput
              placeholder={isBusiness ? "Detail about business" : "Detail about yourselft"}
              multiline={true}
              style={{ height: 100 }}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={() => router.back()}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0e0d12',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#FFFFFF',
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
    color: '#8E8E9B',
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
    backgroundColor: '#1A1A22',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#3B3B45',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0e0d12',
  },
  formGroup: {
    gap: 12,
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
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
    color: '#FFFFFF',
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 70,
  },
  section: {
    marginBottom: 25,
  },
  docDesc: {
    color: '#8E8E9B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 15,
    marginTop: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5D5F0',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: '#0e0d12',
    fontSize: 13,
    fontWeight: 'bold',
  },
  uploadedDocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    padding: 15,
  },
  docIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  docMeta: {
    color: '#8E8E9B',
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
    borderTopColor: '#1A1A22',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    marginRight: 10,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5D5F0',
    borderRadius: 12,
    marginLeft: 10,
  },
  saveBtnText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

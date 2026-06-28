import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage, isBusinessAccountRequiredError } from '@/lib/authErrors';
import { requireBusinessAccountForEvent } from '@/lib/eventGuard';
import { useEventDraftStore } from '@/stores/eventDraftStore';
import { useAuthStore } from '@/stores/authStore';

const requiredText = (label: string, maxLength: number) =>
  z
    .string({
      required_error: `${label} is required`,
      invalid_type_error: `${label} is required`,
    })
    .trim()
    .min(1, `${label} is required`)
    .max(maxLength, `${label} cannot exceed ${maxLength} characters`);

const createEventStepOneSchema = z.object({
  name: requiredText('Event name', 160),
  description: requiredText('Description', 5000),
  bannerImageUri: requiredText('Banner image', 300),
});

type CreateEventStepOneValues = z.infer<typeof createEventStepOneSchema>;
type CreateEventStepOneErrors = Partial<Record<keyof CreateEventStepOneValues, string>>;
type FocusableField = 'name' | 'description';

const getAndroidOriginalImageUri = (asset: ImagePicker.ImagePickerAsset) => {
  if (Platform.OS !== 'android' || !asset.assetId || !/^\d+$/.test(asset.assetId)) {
    return null;
  }

  return `content://media/external/images/media/${asset.assetId}`;
};

export default function CreateEventScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const formPosition = useRef(0);
  const fieldPositions = useRef<Partial<Record<FocusableField, number>>>({});
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const isEditingPublished = useEventDraftStore((state) => state.isEditingPublishedEvent);
  const draftName = useEventDraftStore((state) => state.name);
  const draftDescription = useEventDraftStore((state) => state.description);
  const draftBannerImageUri = useEventDraftStore((state) => state.bannerImageUri);
  const draftBannerOriginalImageUri = useEventDraftStore((state) => state.bannerOriginalImageUri);
  const setStepOne = useEventDraftStore((state) => state.setStepOne);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const currentUser = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [name, setName] = useState(draftName);
  const [description, setDescription] = useState(draftDescription);
  const [bannerImage, setBannerImage] = useState<string | null>(draftBannerImageUri);
  const [bannerOriginalImage, setBannerOriginalImage] = useState<string | null>(
    draftBannerOriginalImageUri ?? draftBannerImageUri,
  );
  const [errors, setErrors] = useState<CreateEventStepOneErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState(false);
  const isMountedRef = useRef(true);
  const isAdvancingRef = useRef(false);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const clearFieldError = (field: keyof CreateEventStepOneErrors) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    clearFieldError('name');
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    clearFieldError('description');
  };

  const scrollToField = (field: FocusableField) => {
    setTimeout(() => {
      const fieldPosition = fieldPositions.current[field] ?? 0;

      scrollViewRef.current?.scrollTo({
        y: Math.max(formPosition.current + fieldPosition - 24, 0),
        animated: true,
      });
    }, Platform.OS === 'android' ? 250 : 100);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const [asset] = result.assets;

      setBannerImage(asset.uri);
      setBannerOriginalImage(getAndroidOriginalImageUri(asset) ?? asset.uri);
      clearFieldError('bannerImageUri');
    }
  };

  const removeImage = () => {
    setBannerImage(null);
    setBannerOriginalImage(null);
  };

  const persistStepOne = (values?: CreateEventStepOneValues) => {
    setStepOne({
      name: values?.name ?? name,
      description: values?.description ?? description,
      bannerImageUri: values?.bannerImageUri ?? bannerImage,
      bannerOriginalImageUri: bannerOriginalImage,
    });
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    persistStepOne();
    setIsSaving(true);

    try {
      await saveDraft();
      setSavedLabel(true);
      setTimeout(() => setSavedLabel(false), 2000);
    } catch (error) {
      if (!isMountedRef.current) return;
      if (isBusinessAccountRequiredError(error)) {
        requireBusinessAccountForEvent({
          user: currentUser,
          completedProfileTypes,
          updateProfile,
          router,
          onReady: handleSaveDraft,
        });
      } else {
        Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Please try again.'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextDraftSaveError = (error: unknown) => {
    if (isBusinessAccountRequiredError(error)) {
      requireBusinessAccountForEvent({
        user: currentUser,
        completedProfileTypes,
        updateProfile,
        router,
        onReady: () => {
          void saveDraft().catch(handleNextDraftSaveError);
        },
      });
    } else {
      Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Your progress was not saved. Please try again.'));
    }
  };

  const handleNext = async () => {
    if (isSaving || isAdvancingRef.current) return;
    const result = createEventStepOneSchema.safeParse({
      name,
      description,
      bannerImageUri: bannerImage,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        name: fieldErrors.name?.[0],
        description: fieldErrors.description?.[0],
        bannerImageUri: fieldErrors.bannerImageUri?.[0],
      });

      return;
    }

    setErrors({});
    persistStepOne(result.data);

    if (!isEditingPublished) {
      isAdvancingRef.current = true;
      const draftSave = saveDraft();
      router.push('/create-event/step-2');
      void draftSave
        .catch(handleNextDraftSaveError)
        .finally(() => {
          isAdvancingRef.current = false;
        });
      return;
    }

    setIsSaving(true);

    try {
      await saveDraft();
      if (isMountedRef.current) {
        router.push('/create-event/step-2');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      if (isBusinessAccountRequiredError(error)) {
        requireBusinessAccountForEvent({
          user: currentUser,
          completedProfileTypes,
          updateProfile,
          router,
          onReady: handleNext,
        });
      } else {
        Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Your progress was not saved. Please try again.'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.replace('/(tabs)/home')} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditingPublished ? 'Update Event' : 'Create Event'}</Text>
        {isEditingPublished ? (
          <View style={{ width: 60 }} />
        ) : (
          <TouchableOpacity onPress={handleSaveDraft} disabled={isSaving}>
            <Text style={[styles.saveDraft, { color: savedLabel ? '#4CAF50' : colors.primary, opacity: isSaving ? 0.5 : 1 }]}>
              {isSaving ? 'Saving…' : savedLabel ? 'Saved ✓' : 'Save Draft'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Steps */}
          <View style={styles.stepContainer}>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 1</Text>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>1 out of 5</Text>
          </View>

          {/* Form Content */}
          <View
            style={styles.formContainer}
            onLayout={(event) => {
              formPosition.current = event.nativeEvent.layout.y;
            }}
          >
            {/* Event Name */}
            <View
              style={styles.inputGroup}
              onLayout={(event) => {
                fieldPositions.current.name = event.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>EVENT NAME</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.card, color: colors.text },
                  errors.name ? [styles.fieldError, { borderColor: colors.danger }] : null,
                ]}
                placeholder="Name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={handleNameChange}
                onFocus={() => scrollToField('name')}
                disableFullscreenUI={Platform.OS === 'android'}
              />
              {errors.name ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text> : null}
            </View>

            {/* Description */}
            <View
              style={styles.inputGroup}
              onLayout={(event) => {
                fieldPositions.current.description = event.nativeEvent.layout.y;
              }}
            >
              <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, color: colors.text },
                  errors.description ? [styles.fieldError, { borderColor: colors.danger }] : null,
                ]}
                placeholder="Event main highlights"
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                value={description}
                onChangeText={handleDescriptionChange}
                onFocus={() => scrollToField('description')}
                disableFullscreenUI={Platform.OS === 'android'}
              />
              {errors.description ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.description}</Text> : null}
            </View>

            {/* Banner */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>BANNER</Text>
                {bannerImage && (
                  <TouchableOpacity onPress={removeImage} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.uploadBox,
                  { borderColor: errors.bannerImageUri ? colors.danger : colors.border },
                  bannerImage ? { padding: 0, borderWidth: 0 } : {},
                ]}
                activeOpacity={0.8}
                onPress={bannerImage ? undefined : pickImage}
              >
                {bannerImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: bannerImage }} style={styles.bannerImagePreview} />
                  </View>
                ) : (
                  <>
                    <Text style={[styles.uploadText, { color: colors.textSecondary }]}>You can only upload one image for the banner</Text>

                    <View style={[styles.uploadButton, { backgroundColor: isDark ? "#D1D1D6" : colors.card }]}>
                      <Feather name="arrow-up-circle" size={16} color={isDark ? "#1A1A22" : colors.text} />
                      <Text style={[styles.uploadButtonText, { color: isDark ? "#1A1A22" : colors.text }]}>Upload Image</Text>
                    </View>

                    <Text style={[styles.uploadHint, { color: colors.textSecondary }]}>JPEG, or PNG</Text>
                  </>
                )}
              </TouchableOpacity>
              {errors.bannerImageUri ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.bannerImageUri}</Text> : null}
            </View>
          </View>

          <View style={styles.footerSpacer} />

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={handleNext}
              disabled={isSaving}
            >
              <Text style={[styles.nextButtonText, { color: colors.background }]}>{isSaving ? 'Saving…' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: 20,
  },
  saveDraft: {
    fontSize: 13,
    fontWeight: '500',
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  stepText: {
    fontSize: 13,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  fieldError: {
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  uploadHint: {
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 16,
  },
  footerSpacer: {
    flexGrow: 1,
  },
  nextButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

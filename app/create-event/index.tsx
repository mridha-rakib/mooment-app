import React, { useState } from 'react';
import { Alert, View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { z } from 'zod';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { useEventDraftStore } from '@/stores/eventDraftStore';

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

export default function CreateEventScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const draftName = useEventDraftStore((state) => state.name);
  const draftDescription = useEventDraftStore((state) => state.description);
  const draftBannerImageUri = useEventDraftStore((state) => state.bannerImageUri);
  const setStepOne = useEventDraftStore((state) => state.setStepOne);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const [name, setName] = useState(draftName);
  const [description, setDescription] = useState(draftDescription);
  const [bannerImage, setBannerImage] = useState<string | null>(draftBannerImageUri);
  const [errors, setErrors] = useState<CreateEventStepOneErrors>({});

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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setBannerImage(result.assets[0].uri);
      clearFieldError('bannerImageUri');
    }
  };

  const removeImage = () => {
    setBannerImage(null);
  };

  const persistStepOne = (values?: CreateEventStepOneValues) => {
    setStepOne({
      name: values?.name ?? name,
      description: values?.description ?? description,
      bannerImageUri: values?.bannerImageUri ?? bannerImage,
    });
  };

  const handleSaveDraft = async () => {
    persistStepOne();

    try {
      await saveDraft();
    } catch (error) {
      Alert.alert('Unable to save draft', getAuthErrorMessage(error, 'Please try saving the event draft again.'));
    }
  };

  const handleNext = () => {
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
    router.push('/create-event/step-2');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Event</Text>
        <TouchableOpacity onPress={handleSaveDraft}>
          <Text style={[styles.saveDraft, { color: colors.primary }]}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <View style={styles.stepContainer}>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 1</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>1 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Event Name */}
        <View style={styles.inputGroup}>
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
          />
          {errors.name ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text> : null}
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
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

      {/* Spacer to push footer down */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, { color: colors.background }]}>Next</Text>
        </TouchableOpacity>
      </View>
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

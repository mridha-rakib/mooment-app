import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { getCurrentLocationIfPermissionGranted } from '@/lib/locationSharing';
import { reverseGeocodeLocation } from '@/lib/locationSearch';
import { useEventDraftStore } from '@/stores/eventDraftStore';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
const createEventStepThreeSchema = z
  .object({
    searchLabel: z.string().nullable().optional(),
    venue: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
  })
  .refine(
    (loc) => Boolean(loc.searchLabel?.trim() || loc.venue?.trim() || loc.address?.trim()),
    { message: 'Please add a location for your event.' },
  );

const ADDITIONAL_INFO_MAX = 500;
const ADDITIONAL_INFO_WARN = 400;

type CreateEventStepThreeErrors = { location?: string; additionalInfo?: string };

export default function CreateEventStep3() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const draftLocation = useEventDraftStore((state) => state.location);
  const setStepThree = useEventDraftStore((state) => state.setStepThree);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const isEditingPublished = useEventDraftStore((state) => state.isEditingPublishedEvent);
  const [venue, setVenue] = useState(draftLocation.venue ?? '');
  const [address, setAddress] = useState(draftLocation.address ?? '');
  const [additionalInfo, setAdditionalInfo] = useState(draftLocation.additionalInfo ?? '');
  const [errors, setErrors] = useState<CreateEventStepThreeErrors>({});
  const additionalInfoLength = additionalInfo.length;
  const additionalInfoCounterColor =
    additionalInfoLength >= ADDITIONAL_INFO_MAX
      ? colors.danger
      : additionalInfoLength >= ADDITIONAL_INFO_WARN
        ? '#F59E0B'
        : colors.textSecondary;
  const [isSaving, setIsSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState(false);
  const isMountedRef = useRef(true);
  const isAdvancingRef = useRef(false);
  const searchLabel = draftLocation.searchLabel ?? address;

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    setVenue(draftLocation.venue ?? '');
  }, [draftLocation.venue]);

  useEffect(() => {
    setAddress(draftLocation.address ?? '');
  }, [draftLocation.address]);

  useEffect(() => {
    setAdditionalInfo(draftLocation.additionalInfo ?? '');
  }, [draftLocation.additionalInfo]);

  useEffect(() => {
    const hasDraftLocation = Boolean(
      draftLocation.searchLabel ||
      draftLocation.address ||
      typeof draftLocation.latitude === 'number' ||
      typeof draftLocation.longitude === 'number',
    );

    if (hasDraftLocation) {
      return;
    }

    let isMounted = true;

    getCurrentLocationIfPermissionGranted()
      .then(async (location) => {
        if (!location || !isMounted) {
          return;
        }

        const reverseLocation = await reverseGeocodeLocation(location.latitude, location.longitude).catch(() => null);
        const label = reverseLocation?.label || reverseLocation?.address || 'Current Location';
        const nextAddress = reverseLocation?.address || label;

        if (!isMounted) {
          return;
        }

        setStepThree({
          location: {
            ...draftLocation,
            address: nextAddress,
            latitude: location.latitude,
            longitude: location.longitude,
            searchLabel: label,
            venue: draftLocation.venue ?? '',
          },
        });
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [
    draftLocation.address,
    draftLocation.latitude,
    draftLocation.longitude,
    draftLocation.searchLabel,
    setStepThree,
  ]);

  const persistStepThree = () => {
    const trimmedAddress = address.trim();
    const trimmedVenue = venue.trim();
    const nextSearchLabel = trimmedAddress && trimmedAddress !== draftLocation.address ? trimmedAddress : searchLabel;

    setStepThree({
      location: {
        ...draftLocation,
        address: trimmedAddress || null,
        searchLabel: nextSearchLabel || null,
        venue: trimmedVenue || null,
        additionalInfo: additionalInfo.length > 0 ? additionalInfo : null,
      },
    });
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    persistStepThree();
    setIsSaving(true);

    try {
      await saveDraft();
      setSavedLabel(true);
      setTimeout(() => setSavedLabel(false), 2000);
    } catch (error) {
      Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextDraftSaveError = (error: unknown) => {
    Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Your progress was not saved. Please try again.'));
  };

  const handleNext = async () => {
    if (isSaving || isAdvancingRef.current) return;
    const trimmedAddress = address.trim();
    const trimmedVenue = venue.trim();
    const nextSearchLabel = trimmedAddress && trimmedAddress !== draftLocation.address ? trimmedAddress : searchLabel;

    const result = createEventStepThreeSchema.safeParse({
      searchLabel: nextSearchLabel || null,
      venue: trimmedVenue || null,
      address: trimmedAddress || null,
    });

    const nextErrors: CreateEventStepThreeErrors = {};

    if (!result.success) {
      nextErrors.location = result.error.errors[0]?.message;
    }

    if (additionalInfo.length > ADDITIONAL_INFO_MAX) {
      nextErrors.additionalInfo = `Additional info cannot exceed ${ADDITIONAL_INFO_MAX} characters`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    persistStepThree();

    if (!isEditingPublished) {
      isAdvancingRef.current = true;
      const draftSave = saveDraft();
      router.push('/create-event/step-4');
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
        router.push('/create-event/step-4');
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Your progress was not saved. Please try again.'));
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleOpenLocationPicker = () => {
    persistStepThree();
    setErrors({});
    router.push('/create-event/location-picker');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/create-event/step-2')} />
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

      {/* Steps */}
      <View style={styles.stepContainer}>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 3</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>3 out of 5</Text>
      </View>

      {/* Form Content + Footer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.body}
      >
        <ScrollView
          contentContainerStyle={styles.formContainer}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Location Search */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>LOCATION</Text>
            <TouchableOpacity
              style={[
                styles.searchBox,
                { borderColor: errors.location ? colors.danger : colors.border },
              ]}
              onPress={handleOpenLocationPicker}
            >
              <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={[styles.searchText, { color: searchLabel ? colors.text : colors.textSecondary }]}>
                {searchLabel || 'Search location'}
              </Text>
            </TouchableOpacity>
            {errors.location ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>{errors.location}</Text>
            ) : null}
          </View>

          {/* Venue */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>VENUE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Venue Name"
              placeholderTextColor={colors.textSecondary}
              value={venue}
              onChangeText={(v) => { setVenue(v); if (errors.location) setErrors({}); }}
            />
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ADDRESS</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Full Address"
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={(v) => { setAddress(v); if (errors.location) setErrors({}); }}
            />
          </View>

          {/* Additional Info */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ADDITIONAL INFO</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.card, color: colors.text },
                additionalInfoLength >= ADDITIONAL_INFO_WARN && {
                  borderWidth: 1,
                  borderColor: additionalInfoLength >= ADDITIONAL_INFO_MAX ? colors.danger : '#F59E0B',
                },
              ]}
              placeholder="Any extra details about the location…"
              placeholderTextColor={colors.textSecondary}
              value={additionalInfo}
              onChangeText={(v) => {
                setAdditionalInfo(v);
                if (errors.additionalInfo) setErrors((prev) => ({ ...prev, additionalInfo: undefined }));
              }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={ADDITIONAL_INFO_MAX}
            />
            <View style={styles.counterRow}>
              {errors.additionalInfo ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{errors.additionalInfo}</Text>
              ) : (
                <Text />
              )}
              <Text style={[styles.charCounter, { color: additionalInfoCounterColor }]}>
                {additionalInfoLength} / {ADDITIONAL_INFO_MAX}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: buttonBackground(colors) }]}
            onPress={handleNext}
            disabled={isSaving}
          >
            <Text style={[styles.nextButtonText, { color: buttonForeground(colors) }]}>{isSaving ? 'Saving…' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
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
  body: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  searchBox: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchText: {
    fontSize: 15,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    flex: 1,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  charCounter: {
    fontSize: 12,
    textAlign: 'right',
  },
  input: {
    borderRadius: 12,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 14,
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

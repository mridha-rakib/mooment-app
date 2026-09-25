import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';
import CreateEventStepNavigator from '@/components/create-event/CreateEventStepNavigator';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage, isBusinessAccountRequiredError } from '@/lib/authErrors';
import { requireBusinessAccountForEvent } from '@/lib/eventGuard';
import { notifySuccess } from '@/lib/successFeedback';
import {
  getEventWizardStepPath,
  getEventWizardStepValidity,
  getEventWizardStepStatesByKey,
  type EventWizardStepKey,
} from '@/lib/eventWizardSteps';
import { useEventDraftStore } from '@/stores/eventDraftStore';
import { useAuthStore } from '@/stores/authStore';
import type { EventPrivacy } from '@/lib/events';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
export default function CreateEventStep5() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const draftPrivacy = useEventDraftStore((state) => state.privacy);
  const categories = useEventDraftStore((state) => state.categories);
  const scheduledAt = useEventDraftStore((state) => state.scheduledAt);
  const endAt = useEventDraftStore((state) => state.endAt);
  // Read-only elsewhere-in-wizard fields, needed only to render the step
  // navigator's eligibility for Basics/Details/Location (this screen never
  // edits them; Privacy itself has no navigator-blocking requirement today).
  const draftName = useEventDraftStore((state) => state.name);
  const draftDescription = useEventDraftStore((state) => state.description);
  const draftBannerImageUri = useEventDraftStore((state) => state.bannerImageUri);
  const draftLocation = useEventDraftStore((state) => state.location);
  const setDraftPrivacy = useEventDraftStore((state) => state.setPrivacy);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const publishEvent = useEventDraftStore((state) => state.publish);
  const resetDraft = useEventDraftStore((state) => state.resetDraft);
  const isEditingPublished = useEventDraftStore((state) => state.isEditingPublishedEvent);
  const isEditingEvent = useEventDraftStore((state) => state.isExistingEventSession);
  const currentUser = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [privacy, setPrivacy] = useState<EventPrivacy>(draftPrivacy);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState(false);

  const handlePrivacyChange = (value: EventPrivacy) => {
    setPrivacy(value);
    setDraftPrivacy(value);
  };

  // EVT-002: step-navigator eligibility. Privacy has no local unflushed
  // state — every selection already writes straight through to the store
  // (handlePrivacyChange above) — and always has a valid default, so it can
  // never block navigation.
  const stepValidity = getEventWizardStepValidity({
    name: draftName,
    description: draftDescription,
    bannerImageUri: draftBannerImageUri,
    categoryCount: categories.length,
    hasStart: Boolean(scheduledAt),
    hasEnd: Boolean(endAt),
    location: draftLocation,
  });
  const stepStates = getEventWizardStepStatesByKey(stepValidity, 'privacy');

  const handleStepNavigatorPress = (step: EventWizardStepKey) => {
    if (step === 'privacy') return;
    // Privacy is already synced to the store on every selection above.
    // Navigator taps still must not call Save Draft/Publish; they are pure
    // UI navigation.
    router.replace(getEventWizardStepPath(step));
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    setDraftPrivacy(privacy);
    setIsSaving(true);

    try {
      await saveDraft();
      setSavedLabel(true);
      setTimeout(() => setSavedLabel(false), 2000);
    } catch (error) {
      Alert.alert('Unable to save draft', getAuthErrorMessage(error, 'Please try saving the event draft again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrimaryAction = async () => {
    if (isPreviewing) {
      return;
    }

    setDraftPrivacy(privacy);
    setIsPreviewing(true);

    try {
      if (!isEditingPublished) {
        if (categories.length === 0) {
          throw new Error("Select at least 1 category before saving the event.");
        }

        if (categories.length > 3) {
          throw new Error("You can select up to 3 categories.");
        }

        if (!scheduledAt || !endAt) {
          throw new Error("Select the event start and end dates and times before publishing.");
        }
      }

      const event = isEditingPublished ? await publishEvent() : await saveDraft();
      notifySuccess(isEditingPublished ? 'Event updated' : 'Event created');
      resetDraft();
      router.replace({
        pathname: '/event-screen/event',
        params: { eventId: event.id, mode: isEditingPublished ? 'host' : 'preview' },
      });
    } catch (error) {
      setIsPreviewing(false);

      const httpStatus = (error as { response?: { status?: number } })?.response?.status;

      if (isBusinessAccountRequiredError(error)) {
        requireBusinessAccountForEvent({
          user: currentUser,
          completedProfileTypes,
          updateProfile,
          router,
          onReady: handlePrimaryAction,
        });
        return;
      }

      if (httpStatus === 429) {
        Alert.alert('Too many requests', 'Too many requests, please try again shortly.');
        return;
      }

      Alert.alert(
        isEditingPublished ? 'Unable to update event' : 'Unable to preview event',
        getAuthErrorMessage(error, 'Please check the event details and try again.'),
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/create-event/step-4')} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditingEvent ? 'Edit Event' : 'Create Event'}</Text>
        {isEditingPublished ? (
          <TouchableOpacity onPress={handlePrimaryAction} disabled={isPreviewing}>
            <Text style={[styles.saveDraft, { color: colors.primary, opacity: isPreviewing ? 0.5 : 1 }]}>
              {isPreviewing ? 'Saving…' : 'Save & Exit'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSaveDraft} disabled={isSaving}>
            <Text style={[styles.saveDraft, { color: savedLabel ? '#4CAF50' : colors.primary, opacity: isSaving ? 0.5 : 1 }]}>
              {isSaving ? 'Saving…' : savedLabel ? 'Saved ✓' : 'Save Draft'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Step navigator */}
      <CreateEventStepNavigator stepStates={stepStates} onStepPress={handleStepNavigatorPress} />

      {/* Form Content */}
      <View style={styles.formContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Choose event privacy</Text>

        {/* Public Event */}
        <TouchableOpacity 
          style={[
            styles.optionCard, 
            { backgroundColor: colors.card, borderColor: colors.border },
            privacy === 'public' && { borderColor: colors.primary }
          ]}
          onPress={() => handlePrivacyChange('public')}
          activeOpacity={0.8}
        >
          <View style={styles.optionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? "#1A1A22" : "#F0F0F3", borderColor: colors.border }]}>
              <Ionicons name="globe-outline" size={20} color={colors.text} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Public Event</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Discoverable by everyone. People can view the Event and join through the normal ticket or access flow without host approval.
              </Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: colors.border }, privacy === 'public' && { borderColor: colors.primary }]}>
              {privacy === 'public' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </View>
        </TouchableOpacity>

        {/* Private Event */}
        <TouchableOpacity 
          style={[
            styles.optionCard, 
            { backgroundColor: colors.card, borderColor: colors.border },
            privacy === 'private' && { borderColor: colors.primary }
          ]}
          onPress={() => handlePrivacyChange('private')}
          activeOpacity={0.8}
        >
          <View style={styles.optionHeader}>
            <View style={[styles.iconContainer, { backgroundColor: isDark ? "#1A1A22" : "#F0F0F3", borderColor: colors.border }]}>
              <Feather name="unlock" size={18} color={colors.text} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Private Event</Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Invite or direct-access only. The Event is hidden from public discovery and cannot be publicly reposted.
              </Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: colors.border }, privacy === 'private' && { borderColor: colors.primary }]}>
              {privacy === 'private' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishButton, { backgroundColor: buttonBackground(colors) }]}
          onPress={handlePrimaryAction}
          disabled={isPreviewing}
          activeOpacity={0.85}
        >
          <Text style={[styles.publishButtonText, { color: buttonForeground(colors) }]}>
            {isPreviewing
              ? 'Saving...'
              : (isEditingPublished ? 'Save Changes' : 'Preview')}
          </Text>
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 32,
  },
  optionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  optionNote: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    flex: 2,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

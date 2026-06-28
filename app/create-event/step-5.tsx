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
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage, isBusinessAccountRequiredError } from '@/lib/authErrors';
import { requireBusinessAccountForEvent } from '@/lib/eventGuard';
import { useEventDraftStore } from '@/stores/eventDraftStore';
import { useAuthStore } from '@/stores/authStore';
import type { EventPrivacy } from '@/lib/events';

export default function CreateEventStep5() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const draftPrivacy = useEventDraftStore((state) => state.privacy);
  const setDraftPrivacy = useEventDraftStore((state) => state.setPrivacy);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const publishEvent = useEventDraftStore((state) => state.publish);
  const resetDraft = useEventDraftStore((state) => state.resetDraft);
  const isEditingPublished = useEventDraftStore((state) => state.isEditingPublishedEvent);
  const tickets = useEventDraftStore((state) => state.tickets);
  const scheduledAt = useEventDraftStore((state) => state.scheduledAt);
  const currentUser = useAuthStore((state) => state.user);
  const completedProfileTypes = useAuthStore((state) => state.completedProfileTypes);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [privacy, setPrivacy] = useState<EventPrivacy>(draftPrivacy);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState(false);

  const handlePrivacyChange = (value: EventPrivacy) => {
    setPrivacy(value);
    setDraftPrivacy(value);
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

  const handlePublish = async () => {
    if (isPublishing) {
      return;
    }

    // Client-side ticket date validation — mirrors the backend rules so the
    // user gets instant feedback without a network round-trip.
    const now = new Date();
    const eventDate = new Date(scheduledAt);
    for (const ticket of tickets) {
      if (!ticket.salesEndAt) continue;
      const salesEnd = new Date(ticket.salesEndAt);
      if (Number.isNaN(salesEnd.getTime())) continue;
      if (salesEnd <= now) {
        Alert.alert(
          'Ticket date is in the past',
          `"${ticket.name}" has a sales end date in the past. Go back to the tickets step and update it before publishing.`,
        );
        return;
      }
      if (!Number.isNaN(eventDate.getTime()) && salesEnd > eventDate) {
        Alert.alert(
          'Ticket date is too late',
          `"${ticket.name}" sales end date must not be after the event start date.`,
        );
        return;
      }
    }

    setDraftPrivacy(privacy);
    setIsPublishing(true);

    try {
      const event = await publishEvent();
      resetDraft();
      router.replace({
        pathname: '/event-screen/event',
        params: { eventId: event.id, mode: 'host' },
      });
    } catch (error) {
      setIsPublishing(false);

      const httpStatus = (error as { response?: { status?: number } })?.response?.status;

      if (isBusinessAccountRequiredError(error)) {
        requireBusinessAccountForEvent({
          user: currentUser,
          completedProfileTypes,
          updateProfile,
          router,
          onReady: handlePublish,
        });
        return;
      }

      if (httpStatus === 429) {
        Alert.alert('Too many requests', 'Too many requests, please try again shortly.');
        return;
      }

      Alert.alert(
        isEditingPublished ? 'Unable to update event' : 'Unable to publish event',
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
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 5</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>5 out of 5</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Choose event privacy</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          You can always change the event privacy from the screen, but if anybody buy tickets it can not be revert.
        </Text>

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
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>This event will be visible to everyone.</Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: colors.border }, privacy === 'public' && { borderColor: colors.primary }]}>
              {privacy === 'public' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
          </View>
          <Text style={[styles.optionNote, { color: colors.textSecondary, borderTopColor: colors.border }]}>
            Note: You can hold the tickets to being sell, change the event to locked event, where user will request to buy ticket.
          </Text>
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
                This event will be visible to selected members, you can select members after publishing the event
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
          style={[styles.publishButton, { backgroundColor: colors.primary }]}
          onPress={handlePublish}
          disabled={isPublishing}
          activeOpacity={0.85}
        >
          <Text style={[styles.publishButtonText, { color: colors.background }]}>
            {isPublishing
              ? (isEditingPublished ? 'Saving...' : 'Publishing...')
              : (isEditingPublished ? 'Save Changes' : 'Publish Event')}
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

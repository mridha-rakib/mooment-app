import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DeleteModal from '../../components/ui/DeleteModal';
import TicketCreatedModal from '../../components/ui/TicketCreatedModal';
import BackButton from '@/components/ui/BackButton';
import CreateEventStepNavigator from '@/components/create-event/CreateEventStepNavigator';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import {
  isTicketCreationCutoffReached,
  TICKET_CREATION_CUTOFF_MESSAGE,
} from '@/lib/ticketAvailability';
import {
  getEventWizardStepPath,
  getEventWizardStepValidity,
  getEventWizardStepStatesByKey,
  type EventWizardStepKey,
} from '@/lib/eventWizardSteps';
import { useEventDraftStore } from '@/stores/eventDraftStore';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
export default function CreateEventStep4() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = React.useState(false);
  const [ticketToDeleteId, setTicketToDeleteId] = React.useState<string | null>(null);
  // EVT-014: guards the reorder arrows while a published-event reorder API
  // call is in flight — draft reorder is synchronous/local and never sets
  // this. Prevents rapid taps from firing overlapping/out-of-order requests.
  const [isReorderInFlight, setIsReorderInFlight] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSavingAndExiting, setIsSavingAndExiting] = React.useState(false);
  const [savedLabel, setSavedLabel] = React.useState(false);
  // EVT-015: shown on return from Ticket Details after a brand-new ticket
  // save succeeds. Driven purely by local state once consumed — see the
  // useFocusEffect below, which reads and immediately clears the store's
  // ephemeral signal so it can never reappear on its own.
  const [isTicketCreatedModalVisible, setIsTicketCreatedModalVisible] = React.useState(false);
  const isMountedRef = React.useRef(true);
  const isAdvancingRef = React.useRef(false);
  const confirmationActionTakenRef = React.useRef(false);
  const tickets = useEventDraftStore((state) => state.tickets);
  const endAt = useEventDraftStore((state) => state.endAt);
  // Read-only elsewhere-in-wizard fields, needed only to render the step
  // navigator's eligibility for Basics/Details/Location (this screen never
  // edits them, and tickets themselves have no navigator-blocking
  // requirement today).
  const draftName = useEventDraftStore((state) => state.name);
  const draftDescription = useEventDraftStore((state) => state.description);
  const draftBannerImageUri = useEventDraftStore((state) => state.bannerImageUri);
  const draftCategories = useEventDraftStore((state) => state.categories);
  const draftScheduledAt = useEventDraftStore((state) => state.scheduledAt);
  const draftLocation = useEventDraftStore((state) => state.location);
  const removeTicket = useEventDraftStore((state) => state.removeTicket);
  const moveTicket = useEventDraftStore((state) => state.moveTicket);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const isEditingPublished = useEventDraftStore((state) => state.isEditingPublishedEvent);
  const isEditingEvent = useEventDraftStore((state) => state.isExistingEventSession);
  const [currentTimeMs, setCurrentTimeMs] = React.useState(Date.now());
  const ticketCreationCutoffReached = isTicketCreationCutoffReached(endAt, currentTimeMs);

  React.useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setCurrentTimeMs(Date.now());

      // EVT-015: one-shot consumption of the ephemeral new-ticket signal.
      // Read directly via getState() (not a reactive selector) so this only
      // fires on an actual focus transition — e.g. returning from Ticket
      // Details — never from an unrelated rerender, theme change, or Fast
      // Refresh. Clearing it immediately means it cannot retrigger later.
      const { newlyCreatedTicketLocalId, clearNewlyCreatedTicketSignal } = useEventDraftStore.getState();

      if (newlyCreatedTicketLocalId) {
        confirmationActionTakenRef.current = false;
        setIsTicketCreatedModalVisible(true);
        clearNewlyCreatedTicketSignal();
      }
    }, []),
  );

  const formatTicketExpiry = (value?: string | null) => {
    if (!value) {
      return 'Sales end • Sat, Sep 9 • 4:00 PM';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Sales end • Sat, Sep 9 • 4:00 PM';
    }

    const dateLabel = date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      weekday: 'short',
    });
    const timeLabel = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
      minute: '2-digit',
    });

    return `Sales end • ${dateLabel} • ${timeLabel}`;
  };

  const getTicketDescriptionPreview = (value?: string | null) => {
    const description = value?.trim() || 'Entry from 9pm. Standing only.';

    return description.length > 88 ? `${description.slice(0, 85).trim()}...` : description;
  };

  const formatTicketPrice = (price: number) =>
    `$${price.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
      maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    })}`;

  // EVT-002: step-navigator eligibility. Tickets has no local unflushed
  // state — every ticket mutation already writes straight through to the
  // store (see saveTicket/removeTicket in eventDraftStore.ts) — and no
  // required-ticket-count rule exists today, so this step is always valid
  // once reached (it can never block Privacy).
  const stepValidity = getEventWizardStepValidity({
    name: draftName,
    description: draftDescription,
    bannerImageUri: draftBannerImageUri,
    categoryCount: draftCategories.length,
    hasStart: Boolean(draftScheduledAt),
    hasEnd: Boolean(endAt),
    location: draftLocation,
  });
  const stepStates = getEventWizardStepStatesByKey(stepValidity, 'tickets');

  const handleStepNavigatorPress = (step: EventWizardStepKey) => {
    if (step === 'tickets') return;
    // No local field to flush here — tickets are always already persisted
    // to the store via saveTicket()/removeTicket(). Navigator taps still
    // must not call Save Draft; they are pure UI navigation.
    router.replace(getEventWizardStepPath(step));
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
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

  const handleDeleteTicket = async () => {
    const ticketId = ticketToDeleteId;

    if (!ticketId || isDeletingTicket) {
      return;
    }

    setIsDeleteModalVisible(false);
    setIsDeletingTicket(true);

    try {
      await removeTicket(ticketId);
    } catch (error) {
      Alert.alert('Unable to delete ticket', getAuthErrorMessage(error, 'Please try deleting the ticket again.'));
    } finally {
      setIsDeletingTicket(false);
      setTicketToDeleteId(null);
    }
  };

  const handleMoveTicket = async (localId: string, direction: 'up' | 'down') => {
    if (isReorderInFlight) return;

    setIsReorderInFlight(true);

    try {
      await moveTicket(localId, direction);
    } catch (error) {
      Alert.alert('Unable to reorder tickets', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setIsReorderInFlight(false);
    }
  };

  const handleNextDraftSaveError = (error: unknown) => {
    Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Your progress was not saved. Please try again.'));
  };

  const handleSaveAndExit = async () => {
    if (isSaving || isSavingAndExiting) return;
    setIsSavingAndExiting(true);

    try {
      const event = await saveDraft();
      if (isMountedRef.current) {
        router.replace({ pathname: '/event-screen/event', params: { eventId: event.id, mode: 'host' } });
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      Alert.alert('Unable to save changes', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      if (isMountedRef.current) {
        setIsSavingAndExiting(false);
      }
    }
  };

  const handleNext = async () => {
    if (isSaving || isSavingAndExiting || isAdvancingRef.current) return;

    if (!isEditingPublished) {
      isAdvancingRef.current = true;
      const draftSave = saveDraft();
      router.push('/create-event/step-5');
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
        router.push('/create-event/step-5');
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

  // Reused by both the main "Create Ticket" button and the post-create
  // confirmation's "Create another ticket" action, so the two stay
  // byte-identical — no localId param means Ticket Details always opens a
  // fresh, blank form (EVT-015 Part E).
  const navigateToCreateTicket = () => {
    router.push('/create-event/ticket-details');
  };

  const dismissTicketCreatedModal = () => {
    setIsTicketCreatedModalVisible(false);
  };

  const handleCreateAnotherTicket = () => {
    if (confirmationActionTakenRef.current) return;
    confirmationActionTakenRef.current = true;
    dismissTicketCreatedModal();
    navigateToCreateTicket();
  };

  const handleContinueFromTicketCreated = () => {
    if (confirmationActionTakenRef.current) return;
    confirmationActionTakenRef.current = true;
    dismissTicketCreatedModal();
    void handleNext();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/create-event/step-3')} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditingEvent ? 'Edit Event' : 'Create Event'}</Text>
        {isEditingPublished ? (
          <TouchableOpacity onPress={handleSaveAndExit} disabled={isSaving || isSavingAndExiting}>
            <Text style={[styles.saveDraft, { color: colors.primary, opacity: (isSaving || isSavingAndExiting) ? 0.5 : 1 }]}>
              {isSavingAndExiting ? 'Saving…' : 'Save & Exit'}
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
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Ticket Button */}
        <TouchableOpacity 
          style={[
            styles.createTicketButton,
            { backgroundColor: buttonBackground(colors) },
            ticketCreationCutoffReached ? styles.createTicketButtonDisabled : null,
            ticketCreationCutoffReached ? styles.createTicketButtonWithHelper : null,
          ]}
          onPress={navigateToCreateTicket}
          disabled={ticketCreationCutoffReached}
        >
          <Ionicons name="add" size={20} color={buttonForeground(colors)} style={{ marginRight: 8 }} />
          <Text style={[styles.createTicketText, { color: buttonForeground(colors) }]}>Create Ticket</Text>
        </TouchableOpacity>
        {ticketCreationCutoffReached ? (
          <Text style={[styles.createTicketHelperText, { color: colors.textSecondary }]}>
            {TICKET_CREATION_CUTOFF_MESSAGE}
          </Text>
        ) : null}

        {tickets.map((ticket, index) => {
          const isFreeTicket = ticket.type === 'free' || ticket.price <= 0;
          const ticketPriceLabel = isFreeTicket ? 'Free' : formatTicketPrice(ticket.price);
          const isFirstTicket = index === 0;
          const isLastTicket = index === tickets.length - 1;
          const ticketLabel = ticket.name || 'General Ticket';

          return (
          <TouchableOpacity
            key={ticket.localId}
            style={[
              styles.ticketCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowOpacity: isDark ? 0 : 0.08,
              },
            ]}
            activeOpacity={0.82}
            onPress={() => router.push({ pathname: '/create-event/ticket-preview', params: { localId: ticket.localId } })}
          >
            <View style={styles.ticketHeader}>
              {/* EVT-014: reorder — array position only, no ticket field is
                  touched. Draft reorder is purely local; a published event's
                  reorder also persists via handleMoveTicket below. */}
              <View style={styles.reorderColumn}>
                <TouchableOpacity
                  style={styles.reorderButton}
                  activeOpacity={0.7}
                  disabled={isFirstTicket || isReorderInFlight}
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleMoveTicket(ticket.localId, 'up');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${ticketLabel} up`}
                  accessibilityState={{ disabled: isFirstTicket || isReorderInFlight }}
                >
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={isFirstTicket ? colors.border : colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reorderButton}
                  activeOpacity={0.7}
                  disabled={isLastTicket || isReorderInFlight}
                  onPress={(event) => {
                    event.stopPropagation();
                    void handleMoveTicket(ticket.localId, 'down');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${ticketLabel} down`}
                  accessibilityState={{ disabled: isLastTicket || isReorderInFlight }}
                >
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={isLastTicket ? colors.border : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.ticketTitleContainer}>
                <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={1}>
                  {ticketLabel}
                </Text>
                <View style={[styles.badge, { backgroundColor: isDark ? '#3F3F46' : '#F1EEF5' }]}>
                  <Text style={[styles.badgeText, { color: isDark ? '#D9D2E2' : colors.primary }]}>{ticket.capacity} left</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.72}
                onPress={(event) => {
                  event.stopPropagation();
                  router.push({ pathname: '/create-event/ticket-details', params: { localId: ticket.localId } });
                }}
              >
                <Feather name="edit-3" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.ticketDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {getTicketDescriptionPreview(ticket.description)}
            </Text>
            <Text style={[styles.ticketExpiry, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatTicketExpiry(ticket.salesEndAt)}
            </Text>

            <View style={styles.ticketFooter}>
              <View>
                <Text style={[styles.ticketPrice, { color: colors.text }]}>{ticketPriceLabel}</Text>
                {!isFreeTicket && <Text style={[styles.perTicket, { color: colors.textSecondary }]}>per ticket</Text>}
              </View>
              <TouchableOpacity
                style={styles.iconButton}
                activeOpacity={0.72}
                disabled={isDeletingTicket}
                onPress={(event) => {
                  event.stopPropagation();
                  setTicketToDeleteId(ticket.localId);
                  setIsDeleteModalVisible(true);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: buttonBackground(colors) }]}
          onPress={handleNext}
          disabled={isSaving || isSavingAndExiting}
        >
          <Text style={[styles.nextButtonText, { color: buttonForeground(colors) }]}>{isSaving ? 'Saving…' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
      <DeleteModal
        visible={isDeleteModalVisible}
        onClose={() => {
          setIsDeleteModalVisible(false);
          setTicketToDeleteId(null);
        }}
        onConfirm={handleDeleteTicket}
      />
      <TicketCreatedModal
        visible={isTicketCreatedModalVisible}
        onCreateAnother={handleCreateAnotherTicket}
        onContinue={handleContinueFromTicketCreated}
      />
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
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  createTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 28,
  },
  createTicketButtonDisabled: {
    opacity: 0.45,
  },
  createTicketButtonWithHelper: {
    marginBottom: 8,
  },
  createTicketText: {
    fontSize: 15,
    fontWeight: '600',
  },
  createTicketHelperText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 20,
  },
  ticketCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  ticketTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reorderColumn: {
    justifyContent: 'space-between',
  },
  reorderButton: {
    alignItems: 'center',
    height: 20,
    justifyContent: 'center',
    width: 24,
  },
  ticketTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ticketDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  ticketExpiry: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 18,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  ticketPrice: {
    fontSize: 22,
    fontWeight: '700',
  },
  perTicket: {
    fontSize: 11,
  },
  iconButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
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

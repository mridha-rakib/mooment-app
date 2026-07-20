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
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import {
  isTicketCreationCutoffReached,
  TICKET_CREATION_CUTOFF_MESSAGE,
} from '@/lib/ticketAvailability';
import { useEventDraftStore } from '@/stores/eventDraftStore';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
export default function CreateEventStep4() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = React.useState(false);
  const [ticketToDeleteId, setTicketToDeleteId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedLabel, setSavedLabel] = React.useState(false);
  const isMountedRef = React.useRef(true);
  const isAdvancingRef = React.useRef(false);
  const tickets = useEventDraftStore((state) => state.tickets);
  const endAt = useEventDraftStore((state) => state.endAt);
  const removeTicket = useEventDraftStore((state) => state.removeTicket);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const isEditingPublished = useEventDraftStore((state) => state.isEditingPublishedEvent);
  const draftId = useEventDraftStore((state) => state.draftId);
  const isEditingEvent = Boolean(draftId || isEditingPublished);
  const [currentTimeMs, setCurrentTimeMs] = React.useState(Date.now());
  const ticketCreationCutoffReached = isTicketCreationCutoffReached(endAt, currentTimeMs);

  React.useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setCurrentTimeMs(Date.now());
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

  const handleNextDraftSaveError = (error: unknown) => {
    Alert.alert(isEditingPublished ? 'Unable to save changes' : 'Unable to save draft', getAuthErrorMessage(error, 'Your progress was not saved. Please try again.'));
  };

  const handleNext = async () => {
    if (isSaving || isAdvancingRef.current) return;

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/create-event/step-3')} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEditingEvent ? 'Edit Event' : 'Create Event'}</Text>
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
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 4</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>4 out of 5</Text>
      </View>

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
          onPress={() => router.push('/create-event/ticket-details')}
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

        {tickets.map((ticket) => {
          const isFreeTicket = ticket.type === 'free' || ticket.price <= 0;
          const ticketPriceLabel = isFreeTicket ? 'Free' : formatTicketPrice(ticket.price);

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
              <View style={styles.ticketTitleContainer}>
                <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={1}>
                  {ticket.name || 'General Ticket'}
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
          disabled={isSaving}
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

import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { useEventDraftStore } from '@/stores/eventDraftStore';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return 'Date TBA';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date TBA';
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

  return `${dateLabel} • ${timeLabel}`;
};

const formatPrice = (type: string, price: number) => {
  if (type === 'free' || price <= 0) {
    return 'Free';
  }

  return `$${price.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  })}`;
};

export default function TicketPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ localId?: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const localId = typeof params.localId === 'string' ? params.localId : null;
  const ticket = useEventDraftStore((state) =>
    localId ? state.tickets.find((item) => item.localId === localId) ?? null : null,
  );
  const eventName = useEventDraftStore((state) => state.name);
  const scheduledAt = useEventDraftStore((state) => state.scheduledAt);
  const endAt = useEventDraftStore((state) => state.endAt);
  const location = useEventDraftStore((state) => state.location);
  const privacy = useEventDraftStore((state) => state.privacy);

  const details = useMemo(() => {
    if (!ticket) {
      return [];
    }

    return [
      { icon: 'bookmark-outline', label: 'Ticket type', value: ticket.type === 'free' ? 'Free' : 'Paid' },
      { icon: 'cash-outline', label: 'Price', value: formatPrice(ticket.type, ticket.price) },
      { icon: 'people-outline', label: 'Capacity', value: `${ticket.capacity} left` },
      { icon: 'time-outline', label: 'Sales end', value: formatDateTime(ticket.salesEndAt) },
      { icon: 'calendar-outline', label: 'Event starts', value: formatDateTime(scheduledAt) },
      { icon: 'time-outline', label: 'Event ends', value: formatDateTime(endAt) },
      { icon: 'lock-closed-outline', label: 'Visibility', value: privacy === 'private' ? 'Private event' : 'Public event' },
      { icon: 'location-outline', label: 'Venue', value: location.venue || 'Venue TBA' },
      { icon: 'navigate-outline', label: 'Address', value: location.address || location.searchLabel || 'Address TBA' },
    ];
  }, [endAt, location.address, location.searchLabel, location.venue, privacy, scheduledAt, ticket]);

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <BackButton />
        <View style={styles.emptyContent}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Ticket not found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            This ticket is no longer available in the event draft.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const priceLabel = formatPrice(ticket.type, ticket.price);
  const description = ticket.description?.trim() || 'Ticket details provided by the event organizer.';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ticket Details</Text>
        <TouchableOpacity
          style={styles.headerIcon}
          activeOpacity={0.75}
          onPress={() => router.push({ pathname: '/create-event/ticket-details', params: { localId: ticket.localId } })}
        >
          <Feather name="edit-3" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 104 }]}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryTopRow}>
            <View style={[styles.ticketIcon, { backgroundColor: isDark ? '#27222D' : '#F1EEF5' }]}>
              <Ionicons name="ticket-outline" size={24} color={colors.primary} />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.success + '1A' }]}>
              <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
            </View>
          </View>

          <Text style={[styles.ticketTitle, { color: colors.text }]}>{ticket.name || 'General Ticket'}</Text>
          <Text style={[styles.eventName, { color: colors.textSecondary }]} numberOfLines={2}>
            {eventName.trim() || 'Untitled Event'}
          </Text>

          <View style={styles.priceRow}>
            <Text style={[styles.priceValue, { color: colors.text }]}>{priceLabel}</Text>
            {ticket.type !== 'free' && ticket.price > 0 && (
              <Text style={[styles.priceCaption, { color: colors.textSecondary }]}>per ticket</Text>
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Information</Text>
          {details.map((item, index) => (
            <View key={item.label}>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                  {item.value}
                </Text>
              </View>
              {index < details.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.card }]}
          activeOpacity={0.82}
          onPress={() => router.back()}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.82}
          onPress={() => router.push({ pathname: '/create-event/ticket-details', params: { localId: ticket.localId } })}
        >
          <Feather name="edit-3" size={17} color={colors.background} />
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  emptyContainer: {
    paddingHorizontal: 24,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerIcon: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  summaryTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  ticketIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ticketTitle: {
    fontSize: 25,
    fontWeight: '700',
    lineHeight: 31,
  },
  eventName: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  priceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  priceValue: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  priceCaption: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  section: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    width: 132,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'right',
  },
  divider: {
    height: 1,
  },
  footer: {
    bottom: 0,
    flexDirection: 'row',
    gap: 14,
    left: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    position: 'absolute',
    right: 0,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

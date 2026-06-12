import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { Spinner } from '@/components/ui/spinner';
import { useTheme } from '@/hooks/useTheme';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useEventDraftStore } from '@/stores/eventDraftStore';
import { getAuthErrorMessage } from '@/lib/authErrors';

const startOfToday = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const isSameCalendarDay = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const clampSalesEndAtRange = (value: Date, minimum: Date, maximum?: Date | null) => {
  const lowerBound = value < minimum ? new Date(minimum) : value;

  if (maximum && lowerBound > maximum) {
    return new Date(maximum);
  }

  return lowerBound;
};

const generateTicketLocalId = () => `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function TicketDetailsScreen() {
  const params = useLocalSearchParams<{ localId?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const scheduledAt = useEventDraftStore((state) => state.scheduledAt);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, React.ElementRef<typeof View> | null>>({});
  const activeFieldRef = useRef<string | null>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const footerHeightRef = useRef(0);
  const saveTicket = useEventDraftStore((state) => state.saveTicket);
  const selectedLocalId = typeof params.localId === 'string' ? params.localId : null;
  const selectedTicket = useEventDraftStore((state) =>
    selectedLocalId ? state.tickets.find((ticket) => ticket.localId === selectedLocalId) ?? null : null,
  );
  const ticketLocalIdRef = useRef(selectedLocalId ?? generateTicketLocalId());
  const eventDate = useMemo(() => {
    const parsed = new Date(scheduledAt);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [scheduledAt]);
  const now = new Date();
  const initialSalesEndAt = selectedTicket?.salesEndAt ? new Date(selectedTicket.salesEndAt) : now;
  const minimumSalesEndAt = now;
  const maximumSalesEndAt = eventDate && eventDate >= minimumSalesEndAt ? eventDate : null;
  const [ticketType, setTicketType] = useState<'Free' | 'Pay'>(selectedTicket?.type === 'pay' ? 'Pay' : 'Free');
  const [ticketName, setTicketName] = useState(selectedTicket?.name ?? '');
  const [ticketDescription, setTicketDescription] = useState(selectedTicket?.description ?? '');
  const [capacity, setCapacity] = useState(String(selectedTicket?.capacity ?? 185));
  const defaultTicketPrice = selectedTicket?.price && selectedTicket.price > 0 ? selectedTicket.price : 45;
  const [ticketPrice, setTicketPrice] = useState(String(defaultTicketPrice));
  const [date, setDate] = useState(() => {
    const normalizedInitial = Number.isNaN(initialSalesEndAt.getTime()) ? new Date(minimumSalesEndAt) : initialSalesEndAt;

    return clampSalesEndAtRange(normalizedInitial, minimumSalesEndAt, maximumSalesEndAt);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pickerButtonColors = {
    negativeButton: { label: 'Cancel', textColor: colors.textSecondary },
    positiveButton: { label: 'OK', textColor: colors.primary },
  };

  const ensureFieldVisible = useCallback(
    (field: string) => {
      const fieldRef = fieldRefs.current[field];

      if (!fieldRef) {
        return;
      }

      requestAnimationFrame(() => {
        fieldRef.measureInWindow((_, fieldY, __, fieldHeight) => {
          const keyboardTop = windowHeight - keyboardHeightRef.current;
          const footerTop = windowHeight - footerHeightRef.current;
          const visibleBottom = Math.min(keyboardTop, footerTop) - 16;
          const fieldBottom = fieldY + fieldHeight + 20;
          const delta = fieldBottom - visibleBottom;

          if (delta > 0) {
            scrollViewRef.current?.scrollTo({
              animated: true,
              y: Math.max(0, scrollOffsetRef.current + delta),
            });
          }
        });
      });
    },
    [windowHeight],
  );

  const focusField = useCallback(
    (field: string) => {
      activeFieldRef.current = field;
      ensureFieldVisible(field);
    },
    [ensureFieldVisible],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const field = activeFieldRef.current;

          if (field) {
            ensureFieldVisible(field);
          }
        });
      });
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [ensureFieldVisible]);

  const handleConfirm = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const parsedPrice = Number.parseFloat(ticketPrice);
      const price = ticketType === 'Free'
        ? 0
        : Number.isFinite(parsedPrice) && parsedPrice > 0
          ? parsedPrice
          : defaultTicketPrice;

      await saveTicket({
        capacity: Number.parseInt(capacity, 10) || 0,
        description: ticketDescription.trim() || selectedTicket?.description || 'Entry from 9pm. Standing only.',
        localId: ticketLocalIdRef.current,
        name: ticketName.trim() || selectedTicket?.name || 'General Ticket',
        price,
        salesEndAt: date.toISOString(),
        type: ticketType === 'Free' ? 'free' : 'pay',
      });
      setShowConfetti(true);
      setTimeout(() => {
        router.back();
      }, 2500);
    } catch (error) {
      Alert.alert('Unable to save ticket', getAuthErrorMessage(error, 'Please try saving the ticket again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const nextDate = new Date(date);
      nextDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      nextDate.setSeconds(0, 0);

      setDate(clampSalesEndAtRange(nextDate, minimumSalesEndAt, maximumSalesEndAt));
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const nextDate = new Date(date);
      nextDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

      setDate(clampSalesEndAtRange(nextDate, minimumSalesEndAt, maximumSalesEndAt));
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Success Animation */}
      <ConfettiOverlay 
        visible={showConfetti} 
        onFinish={() => setShowConfetti(false)} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton iconName={Cancel01Icon} size={24} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Set Ticket Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.body}
      >
      <ScrollView
        ref={scrollViewRef}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket Name */}
        <View ref={(node) => { fieldRefs.current.ticketName = node; }} style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>TICKET NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={ticketName}
            onChangeText={setTicketName}
            onFocus={() => focusField('ticketName')}
          />
        </View>

        {/* Description */}
        <View ref={(node) => { fieldRefs.current.ticketDescription = node; }} style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Detail about ticket"
            placeholderTextColor={colors.textSecondary}
            value={ticketDescription}
            onChangeText={setTicketDescription}
            onFocus={() => focusField('ticketDescription')}
          />
        </View>

        {/* Date and Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>END DATE</Text>
            <TouchableOpacity 
              style={[styles.selector, { backgroundColor: colors.card }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectorText, { color: colors.text }]}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>END TIME</Text>
            <TouchableOpacity 
              style={[styles.selector, { backgroundColor: colors.card }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectorText, { color: colors.text }]}>{formatTime(date)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={startOfToday(new Date())}
            maximumDate={maximumSalesEndAt ?? undefined}
            negativeButton={pickerButtonColors.negativeButton}
            positiveButton={pickerButtonColors.positiveButton}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            minimumDate={isSameCalendarDay(date, new Date()) ? new Date() : undefined}
            maximumDate={maximumSalesEndAt ?? undefined}
            negativeButton={pickerButtonColors.negativeButton}
            positiveButton={pickerButtonColors.positiveButton}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            onChange={onTimeChange}
          />
        )}

        {/* Ticket Type (Free/Pay) */}
        <View style={styles.radioRow}>
          <TouchableOpacity 
            style={styles.radioItem} 
            onPress={() => setTicketType('Free')}
          >
            <View style={[styles.radioOuter, { borderColor: colors.border }, ticketType === 'Free' && { borderColor: colors.primary }]}>
              {ticketType === 'Free' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.radioLabel, { color: colors.text }]}>Free</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.radioItem} 
            onPress={() => setTicketType('Pay')}
          >
            <View style={[styles.radioOuter, { borderColor: colors.border }, ticketType === 'Pay' && { borderColor: colors.primary }]}>
              {ticketType === 'Pay' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.radioLabel, { color: colors.text }]}>Pay</Text>
          </TouchableOpacity>
        </View>

        {ticketType === 'Pay' && (
          <View ref={(node) => { fieldRefs.current.ticketPrice = node; }} style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>PRICE</Text>
            <View style={[styles.priceInput, { backgroundColor: colors.card }]}>
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>£</Text>
              <TextInput
                style={[styles.priceField, { color: colors.text }]}
                placeholder="45"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={ticketPrice}
                onChangeText={setTicketPrice}
                onFocus={() => focusField('ticketPrice')}
              />
            </View>
          </View>
        )}

        {/* Capacity */}
        <View ref={(node) => { fieldRefs.current.capacity = node; }} style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CAPACITY</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="185"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={capacity}
            onChangeText={setCapacity}
            onFocus={() => focusField('capacity')}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        onLayout={(event) => {
          footerHeightRef.current = event.nativeEvent.layout.height;
        }}
        style={[styles.footer, { backgroundColor: colors.background }]}
      >
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: colors.card }]}
          disabled={isSaving}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, { color: isSaving ? colors.textSecondary : colors.text }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          disabled={isSaving}
          onPress={handleConfirm}
        >
          {isSaving ? (
            <View style={styles.buttonContent}>
              <Spinner color={colors.background} size="small" />
              <Text style={[styles.confirmButtonText, { color: colors.background }]}>Saving...</Text>
            </View>
          ) : (
            <Text style={[styles.confirmButtonText, { color: colors.background }]}>Confirm</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  body: {
    flex: 1,
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
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
  input: {
    borderRadius: 12,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceInput: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyPrefix: {
    fontSize: 15,
    marginRight: 8,
  },
  priceField: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selector: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: 15,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: 14,
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
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

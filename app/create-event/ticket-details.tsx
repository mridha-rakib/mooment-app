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
  Keyboard,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { Spinner } from '@/components/ui/spinner';
import { useTheme } from '@/hooks/useTheme';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useEventDraftStore } from '@/stores/eventDraftStore';
import { getAuthErrorDetails, getAuthErrorMessage } from '@/lib/authErrors';

const ticketSchema = z
  .object({
    name: z
      .string({ required_error: 'Ticket name is required', invalid_type_error: 'Ticket name is required' })
      .trim()
      .min(1, 'Ticket name is required')
      .max(120, 'Ticket name cannot exceed 120 characters'),
    description: z
      .string({ required_error: 'Description is required', invalid_type_error: 'Description is required' })
      .trim()
      .min(1, 'Description is required')
      .max(1000, 'Description cannot exceed 1000 characters'),
    capacity: z
      .number({ required_error: 'Capacity is required', invalid_type_error: 'Enter a valid capacity' })
      .int('Capacity must be a whole number')
      .min(1, 'Capacity must be at least 1')
      .max(1_000_000, 'Capacity cannot exceed 1,000,000'),
    price: z.number().positive().optional(),
    type: z.enum(['free', 'pay'] as const),
  })
  .refine((data) => data.type !== 'pay' || (typeof data.price === 'number' && data.price > 0), {
    message: 'Price must be greater than 0',
    path: ['price'],
  });

type TicketErrors = Partial<{
  name: string;
  description: string;
  capacity: string;
  price: string;
  form: string;
}>;

const BACKEND_FIELD_MAP: Record<string, keyof TicketErrors> = {
  name: 'name',
  description: 'description',
  capacity: 'capacity',
  price: 'price',
};

const parseBackendTicketErrors = (error: unknown): TicketErrors => {
  const details = getAuthErrorDetails(error);

  if (!details) {
    return { form: getAuthErrorMessage(error, 'Please try saving the ticket again.') };
  }

  const errors: TicketErrors = {};

  if (details.fields) {
    for (const [field, messages] of Object.entries(details.fields)) {
      const key = BACKEND_FIELD_MAP[field];

      if (key) {
        errors[key] = (messages as string[])[0];
      }
    }
  }

  const unmappedMessages = (details.issues ?? []).map((i) => i.message).filter(Boolean) as string[];

  if (Object.keys(errors).length === 0 || unmappedMessages.length > 0) {
    errors.form = unmappedMessages[0] ?? getAuthErrorMessage(error, 'Please try saving the ticket again.');
  }

  return errors;
};

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
  const [errors, setErrors] = useState<TicketErrors>({});
  const pickerButtonColors = {
    negativeButton: { label: 'Cancel', textColor: colors.textSecondary },
    positiveButton: { label: 'OK', textColor: colors.primary },
  };

  const clearFieldError = (field: keyof TicketErrors) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const ensureFieldVisible = useCallback(
    (field: string, delay = 0) => {
      const fieldRef = fieldRefs.current[field];

      if (!fieldRef) {
        return;
      }

      const measure = () => {
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
      };

      if (delay > 0) {
        setTimeout(measure, delay);
      } else {
        measure();
      }
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

      const field = activeFieldRef.current;

      if (field) {
        // On Android the keyboard animation finishes after keyboardDidShow fires,
        // so we give it a short extra delay before measuring.
        ensureFieldVisible(field, Platform.OS === 'android' ? 150 : 0);
      }
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

    const parsedCapacity = Number.parseInt(capacity, 10);
    const parsedPrice = Number.parseFloat(ticketPrice);
    const type = ticketType === 'Free' ? 'free' : 'pay';

    const result = ticketSchema.safeParse({
      name: ticketName,
      description: ticketDescription,
      capacity: Number.isNaN(parsedCapacity) ? undefined : parsedCapacity,
      price: type === 'pay' ? (Number.isFinite(parsedPrice) ? parsedPrice : undefined) : undefined,
      type,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        name: fieldErrors.name?.[0],
        description: fieldErrors.description?.[0],
        capacity: fieldErrors.capacity?.[0],
        price: fieldErrors.price?.[0],
      });

      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      await saveTicket({
        capacity: result.data.capacity,
        description: result.data.description,
        localId: ticketLocalIdRef.current,
        name: result.data.name,
        price: result.data.type === 'free' ? 0 : (result.data.price ?? 0),
        salesEndAt: date.toISOString(),
        type: result.data.type,
      });
      setShowConfetti(true);
      setTimeout(() => {
        router.back();
      }, 2500);
    } catch (error) {
      setErrors(parseBackendTicketErrors(error));
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
        {/* Form-level backend error */}
        {errors.form ? (
          <View style={[styles.formErrorBanner, { backgroundColor: `${colors.danger}18`, borderColor: `${colors.danger}40` }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.formErrorText, { color: colors.danger }]}>{errors.form}</Text>
          </View>
        ) : null}

        {/* Ticket Name */}
        <View ref={(node) => { fieldRefs.current.ticketName = node; }} style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>TICKET NAME</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
              errors.name ? [styles.inputError, { borderColor: colors.danger }] : null,
            ]}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={ticketName}
            onChangeText={(v) => { setTicketName(v); clearFieldError('name'); }}
            onFocus={() => focusField('ticketName')}
          />
          {errors.name ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text> : null}
        </View>

        {/* Description */}
        <View ref={(node) => { fieldRefs.current.ticketDescription = node; }} style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
              errors.description ? [styles.inputError, { borderColor: colors.danger }] : null,
            ]}
            placeholder="Detail about ticket"
            placeholderTextColor={colors.textSecondary}
            value={ticketDescription}
            onChangeText={(v) => { setTicketDescription(v); clearFieldError('description'); }}
            onFocus={() => focusField('ticketDescription')}
          />
          {errors.description ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.description}</Text> : null}
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
            onPress={() => { setTicketType('Free'); clearFieldError('price'); }}
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
            <View
              style={[
                styles.priceInput,
                { backgroundColor: colors.card },
                errors.price ? [styles.inputError, { borderColor: colors.danger }] : null,
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>$</Text>
              <TextInput
                style={[styles.priceField, { color: colors.text }]}
                placeholder="45"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={ticketPrice}
                onChangeText={(v) => { setTicketPrice(v); clearFieldError('price'); }}
                onFocus={() => focusField('ticketPrice')}
              />
            </View>
            {errors.price ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.price}</Text> : null}
          </View>
        )}

        {/* Capacity */}
        <View ref={(node) => { fieldRefs.current.capacity = node; }} style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CAPACITY</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.text },
              errors.capacity ? [styles.inputError, { borderColor: colors.danger }] : null,
            ]}
            placeholder="185"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            value={capacity}
            onChangeText={(v) => { setCapacity(v); clearFieldError('capacity'); }}
            onFocus={() => focusField('capacity')}
          />
          {errors.capacity ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.capacity}</Text> : null}
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
    paddingBottom: 120,
    paddingTop: 16,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  formErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  priceInput: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'transparent',
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

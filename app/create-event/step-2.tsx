import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import BackButton from '@/components/ui/BackButton';
import { EVENT_CATEGORIES, isEventCategory, type EventCategory } from '@/constants/eventCategories';
import { useTheme } from '@/hooks/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { fromAgeRestriction, toAgeRestriction, useEventDraftStore } from '@/stores/eventDraftStore';

const AGE_OPTIONS = ['All Ages', '18+', '21+'] as const;

type AgeOption = (typeof AGE_OPTIONS)[number];

const isAgeOption = (value: string): value is AgeOption => (AGE_OPTIONS as readonly string[]).includes(value);

const createEventStepTwoSchema = z.object({
  ageRestriction: z.enum(AGE_OPTIONS, {
    invalid_type_error: 'Choose an age restriction for this event.',
    required_error: 'Choose an age restriction for this event.',
  }),
  category: z.custom<EventCategory>((value) => isEventCategory(value), {
    message: 'Select a category before continuing.',
  }),
  scheduledAt: z.custom<Date>((value) => value instanceof Date && !Number.isNaN(value.getTime()), {
    message: 'Choose a valid date and time.',
  }),
});

type CreateEventStepTwoValues = z.infer<typeof createEventStepTwoSchema>;
type CreateEventStepTwoErrors = Partial<Record<keyof CreateEventStepTwoValues, string>>;

export default function CreateEventStep2() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const draftAgeRestriction = useEventDraftStore((state) => state.ageRestriction);
  const draftCategory = useEventDraftStore((state) => state.category);
  const draftScheduledAt = useEventDraftStore((state) => state.scheduledAt);
  const setStepTwo = useEventDraftStore((state) => state.setStepTwo);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const [selectedAge, setSelectedAge] = useState<AgeOption>(() => {
    const initialAge = fromAgeRestriction(draftAgeRestriction);

    return isAgeOption(initialAge) ? initialAge : 'All Ages';
  });
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(
    isEventCategory(draftCategory) ? draftCategory : null,
  );
  const [date, setDate] = useState(() => {
    const parsedDate = new Date(draftScheduledAt);

    return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState<CreateEventStepTwoErrors>({});

  const clearFieldError = (field: keyof CreateEventStepTwoErrors) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
      clearFieldError('scheduledAt');
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
      clearFieldError('scheduledAt');
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

  const handleAgeSelect = (age: AgeOption) => {
    setSelectedAge(age);
    clearFieldError('ageRestriction');
  };

  const handleCategorySelect = (category: EventCategory) => {
    setSelectedCategory(category);
    clearFieldError('category');
  };

  const persistStepTwo = (values?: CreateEventStepTwoValues) => {
    setStepTwo({
      ageRestriction: toAgeRestriction(values?.ageRestriction ?? selectedAge),
      category: values?.category ?? selectedCategory,
      scheduledAt: (values?.scheduledAt ?? date).toISOString(),
    });
  };

  const handleSaveDraft = async () => {
    persistStepTwo();

    try {
      await saveDraft();
    } catch (error) {
      Alert.alert('Unable to save draft', getAuthErrorMessage(error, 'Please try saving the event draft again.'));
    }
  };

  const handleNext = () => {
    const result = createEventStepTwoSchema.safeParse({
      ageRestriction: selectedAge,
      category: selectedCategory,
      scheduledAt: date,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        ageRestriction: fieldErrors.ageRestriction?.[0],
        category: fieldErrors.category?.[0],
        scheduledAt: fieldErrors.scheduledAt?.[0],
      });

      return;
    }

    setErrors({});
    persistStepTwo(result.data);
    router.push('/create-event/step-3');
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
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 2</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>2 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Age Restrictions */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>AGE RESTRICTIONS</Text>
          <View style={styles.chipRow}>
            {AGE_OPTIONS.map((age) => (
              <TouchableOpacity
                key={age}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  selectedAge === age ? { backgroundColor: colors.text, borderColor: colors.text } : { backgroundColor: 'transparent' },
                ]}
                onPress={() => handleAgeSelect(age)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedAge === age ? { color: colors.background } : { color: colors.text },
                  ]}
                >
                  {age}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.ageRestriction ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.ageRestriction}</Text> : null}
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
          <TouchableOpacity 
            style={[
              styles.selector,
              { backgroundColor: colors.card, borderColor: errors.category ? colors.danger : 'transparent' },
            ]}
            onPress={() => setIsCategorySheetVisible(true)}
          >
            <Text style={selectedCategory ? [styles.selectorText, { color: colors.text }] : [styles.selectorPlaceholder, { color: colors.textSecondary }]}>
              {selectedCategory || 'Select Category'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {errors.category ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.category}</Text> : null}
        </View>

        {/* Date and Time Row */}
        <View style={styles.dateTimeGroup}>
          <View style={styles.row}>
            <View style={[styles.dateTimeColumn, { marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>DATE</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  { backgroundColor: colors.card, borderColor: errors.scheduledAt ? colors.danger : 'transparent' },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.selectorText, { color: colors.text }]}>{formatDate(date)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dateTimeColumn, { marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>TIME</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  { backgroundColor: colors.card, borderColor: errors.scheduledAt ? colors.danger : 'transparent' },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.selectorText, { color: colors.text }]}>{formatTime(date)}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.scheduledAt ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.scheduledAt}</Text> : null}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            onChange={onTimeChange}
          />
        )}
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

      {/* Category Bottom Sheet */}
      <Modal
        visible={isCategorySheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategorySheetVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsCategorySheetVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Category</Text>
          
          <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
            {EVENT_CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.categoryItem}
                onPress={() => handleCategorySelect(item)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: colors.textSecondary },
                    selectedCategory === item && [styles.categoryTextSelected, { color: colors.text }],
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setIsCategorySheetVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsCategorySheetVisible(false)}
            >
              <Text style={[styles.continueButtonText, { color: colors.background }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selector: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
  selectorPlaceholder: {
    fontSize: 15,
  },
  selectorText: {
    fontSize: 15,
  },
  dateTimeGroup: {
    marginBottom: 24,
  },
  dateTimeColumn: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 60,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  categoryList: {
    marginBottom: 20,
  },
  categoryItem: {
    paddingVertical: 14,
  },
  categoryText: {
    fontSize: 16,
  },
  categoryTextSelected: {
    fontWeight: '700',
  },
  sheetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 10,
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
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

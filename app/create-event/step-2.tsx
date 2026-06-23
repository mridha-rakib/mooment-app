import BackButton from '@/components/ui/BackButton';
import { EVENT_CATEGORIES, isEventCategory, type EventCategory } from '@/constants/eventCategories';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { combineLocalDateAndTime, getEventDateRangeError, getLocalCalendarDaySpan } from '@/lib/eventDateRange';
import { fromAgeRestriction, toAgeRestriction, useEventDraftStore } from '@/stores/eventDraftStore';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

const AGE_OPTIONS = ['All Ages', '18+', '21+'] as const;
const MIN_CATEGORIES = 1;
const MAX_CATEGORIES = 3;
const REQUIRED_CATEGORY_MESSAGE = 'Select at least 1 category.';
const MAX_CATEGORY_MESSAGE = 'You can select up to 3 categories.';

type AgeOption = (typeof AGE_OPTIONS)[number];

const isAgeOption = (value: string): value is AgeOption => (AGE_OPTIONS as readonly string[]).includes(value);

const categorySelectionSchema = z
  .array(z.custom<EventCategory>((value) => isEventCategory(value)))
  .min(MIN_CATEGORIES, REQUIRED_CATEGORY_MESSAGE)
  .max(MAX_CATEGORIES, MAX_CATEGORY_MESSAGE);

const createEventStepTwoSchema = z.object({
  ageRestriction: z.enum(AGE_OPTIONS, {
    invalid_type_error: 'Choose an age restriction for this event.',
    required_error: 'Choose an age restriction for this event.',
  }),
  categories: categorySelectionSchema,
  scheduledAt: z.custom<Date>((value) => value instanceof Date && !Number.isNaN(value.getTime()), {
    message: 'Choose a valid start date and time.',
  }),
  endAt: z.custom<Date>((value) => value instanceof Date && !Number.isNaN(value.getTime()), {
    message: 'Choose a valid end date and time.',
  }),
}).superRefine((value, ctx) => {
  const message = getEventDateRangeError(value.scheduledAt, value.endAt);

  if (message) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: ['endAt'],
    });
  }
});

type CreateEventStepTwoValues = z.infer<typeof createEventStepTwoSchema>;
type CreateEventStepTwoErrors = Partial<Record<keyof CreateEventStepTwoValues, string>>;

export default function CreateEventStep2() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const draftAgeRestriction = useEventDraftStore((state) => state.ageRestriction);
  const draftCategories = useEventDraftStore((state) => state.categories);
  const draftScheduledAt = useEventDraftStore((state) => state.scheduledAt);
  const draftEndAt = useEventDraftStore((state) => state.endAt);
  const setStepTwo = useEventDraftStore((state) => state.setStepTwo);
  const saveDraft = useEventDraftStore((state) => state.saveDraft);
  const isEditingPublished = useEventDraftStore((state) => state.isEditingPublishedEvent);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);
  const [selectedAge, setSelectedAge] = useState<AgeOption>(() => {
    const initialAge = fromAgeRestriction(draftAgeRestriction);

    return isAgeOption(initialAge) ? initialAge : 'All Ages';
  });
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(
    draftCategories.filter(isEventCategory).slice(0, MAX_CATEGORIES),
  );
  const selectedCategoriesRef = useRef(selectedCategories);
  const [startAt, setStartAt] = useState(() => {
    const parsedDate = new Date(draftScheduledAt);

    return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  });
  const [endAt, setEndAt] = useState(() => {
    const parsedDate = new Date(draftEndAt);

    return Number.isNaN(parsedDate.getTime()) ? new Date(Date.now() + 2 * 60 * 60 * 1000) : parsedDate;
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [errors, setErrors] = useState<CreateEventStepTwoErrors>({});
  const pickerButtonColors = {
    negativeButton: { label: 'Cancel', textColor: colors.textSecondary },
    positiveButton: { label: 'OK', textColor: colors.primary },
  };

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

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const daySpan = getLocalCalendarDaySpan(startAt, endAt);
      const nextStartAt = combineLocalDateAndTime(selectedDate, startAt);
      const nextEndAt = combineLocalDateAndTime(selectedDate, endAt, daySpan);

      setStartAt(nextStartAt);
      setEndAt(nextEndAt);
      clearFieldError('scheduledAt');
      clearFieldError('endAt');
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndAt(combineLocalDateAndTime(selectedDate, endAt));
      clearFieldError('endAt');
    }
  };

  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const nextStartAt = new Date(startAt);
      nextStartAt.setHours(selectedTime.getHours());
      nextStartAt.setMinutes(selectedTime.getMinutes());
      nextStartAt.setSeconds(0, 0);
      setStartAt(nextStartAt);
      setEndAt((currentEndAt) =>
        currentEndAt > nextStartAt ? currentEndAt : new Date(nextStartAt.getTime() + 2 * 60 * 60 * 1000),
      );
      clearFieldError('scheduledAt');
      clearFieldError('endAt');
    }
  };

  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const nextEndAt = new Date(endAt);
      nextEndAt.setHours(selectedTime.getHours());
      nextEndAt.setMinutes(selectedTime.getMinutes());
      nextEndAt.setSeconds(0, 0);
      setEndAt(nextEndAt);
      clearFieldError('endAt');
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

  const setCategoryError = (message?: string) => {
    setErrors((currentErrors) => ({ ...currentErrors, categories: message }));
  };

  const handleCategoryToggle = (category: EventCategory) => {
    const currentCategories = selectedCategoriesRef.current;

    if (currentCategories.includes(category)) {
      const nextCategories = currentCategories.filter((item) => item !== category);
      selectedCategoriesRef.current = nextCategories;
      setSelectedCategories(nextCategories);
      setCategoryError(nextCategories.length === 0 ? REQUIRED_CATEGORY_MESSAGE : undefined);
      return;
    }

    if (currentCategories.length >= MAX_CATEGORIES) {
      setCategoryError(MAX_CATEGORY_MESSAGE);
      return;
    }

    const nextCategories = [...currentCategories, category];
    selectedCategoriesRef.current = nextCategories;
    setSelectedCategories(nextCategories);
    clearFieldError('categories');
  };

  const validateCategorySelection = () => {
    const result = categorySelectionSchema.safeParse(selectedCategories);

    if (!result.success) {
      setCategoryError(result.error.errors[0]?.message ?? REQUIRED_CATEGORY_MESSAGE);
      return false;
    }

    clearFieldError('categories');
    return true;
  };

  const handleCategoryContinue = () => {
    if (!validateCategorySelection()) {
      return;
    }

    setIsCategorySheetVisible(false);
  };

  const persistStepTwo = (values?: CreateEventStepTwoValues) => {
    setStepTwo({
      ageRestriction: toAgeRestriction(values?.ageRestriction ?? selectedAge),
      categories: values?.categories ?? selectedCategories,
      scheduledAt: (values?.scheduledAt ?? startAt).toISOString(),
      endAt: (values?.endAt ?? endAt).toISOString(),
    });
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    if (!validateCategorySelection()) {
      setIsCategorySheetVisible(true);
      return;
    }
    persistStepTwo();
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

  const handleNext = async () => {
    if (isSaving) return;
    const result = createEventStepTwoSchema.safeParse({
      ageRestriction: selectedAge,
      categories: selectedCategories,
      scheduledAt: startAt,
      endAt,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        ageRestriction: fieldErrors.ageRestriction?.[0],
        categories: fieldErrors.categories?.[0],
        scheduledAt: fieldErrors.scheduledAt?.[0],
        endAt: fieldErrors.endAt?.[0],
      });

      return;
    }

    setErrors({});
    persistStepTwo(result.data);
    setIsSaving(true);

    try {
      await saveDraft();
      if (isMountedRef.current) {
        router.push('/create-event/step-3');
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
        <BackButton onPress={() => router.canGoBack() ? router.back() : router.replace('/create-event')} />
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
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 2</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>2 out of 5</Text>
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

        {/* Categories */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORIES (1–3)</Text>
          <TouchableOpacity 
            style={[
              styles.selector,
              { backgroundColor: colors.card, borderColor: errors.categories ? colors.danger : 'transparent' },
            ]}
            onPress={() => setIsCategorySheetVisible(true)}
          >
            <Text
              numberOfLines={1}
              style={selectedCategories.length ? [styles.categorySummary, { color: colors.text }] : [styles.selectorPlaceholder, { color: colors.textSecondary }]}
            >
              {selectedCategories.length ? selectedCategories.join(', ') : 'Select 1–3 categories'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {errors.categories ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.categories}</Text> : null}
        </View>

        {/* Start/end dates and times */}
        <View style={styles.dateTimeGroup}>
          <View style={[styles.row, styles.dateRow]}>
            <View style={[styles.dateTimeColumn, { marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>START DATE</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  { backgroundColor: colors.card, borderColor: errors.scheduledAt ? colors.danger : 'transparent' },
                ]}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.compactSelectorText, { color: colors.text }]} numberOfLines={1}>{formatDate(startAt)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dateTimeColumn, { marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>END DATE</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  { backgroundColor: colors.card, borderColor: errors.endAt ? colors.danger : 'transparent' },
                ]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.compactSelectorText, { color: colors.text }]} numberOfLines={1}>{formatDate(endAt)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.dateTimeColumn, { marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>START TIME</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  { backgroundColor: colors.card, borderColor: errors.scheduledAt ? colors.danger : 'transparent' },
                ]}
                onPress={() => setShowStartTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.selectorText, { color: colors.text }]}>{formatTime(startAt)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.dateTimeColumn, { marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>END TIME</Text>
              <TouchableOpacity
                style={[
                  styles.selector,
                  { backgroundColor: colors.card, borderColor: errors.endAt ? colors.danger : 'transparent' },
                ]}
                onPress={() => setShowEndTimePicker(true)}
              >
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={[styles.selectorText, { color: colors.text }]}>{formatTime(endAt)}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.scheduledAt ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.scheduledAt}</Text> : null}
          {errors.endAt ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.endAt}</Text> : null}
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={startAt}
            mode="date"
            negativeButton={pickerButtonColors.negativeButton}
            positiveButton={pickerButtonColors.positiveButton}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartDateChange}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endAt}
            mode="date"
            minimumDate={new Date(startAt.getFullYear(), startAt.getMonth(), startAt.getDate())}
            negativeButton={pickerButtonColors.negativeButton}
            positiveButton={pickerButtonColors.positiveButton}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndDateChange}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={startAt}
            mode="time"
            negativeButton={pickerButtonColors.negativeButton}
            positiveButton={pickerButtonColors.positiveButton}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            onChange={onStartTimeChange}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endAt}
            mode="time"
            negativeButton={pickerButtonColors.negativeButton}
            positiveButton={pickerButtonColors.positiveButton}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            onChange={onEndTimeChange}
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
          disabled={isSaving}
        >
          <Text style={[styles.nextButtonText, { color: colors.background }]}>{isSaving ? 'Saving…' : 'Next'}</Text>
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
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Categories</Text>
          <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>
            {selectedCategories.length}/{MAX_CATEGORIES} selected
          </Text>
          {errors.categories ? (
            <Text style={[styles.sheetError, { color: colors.danger }]}>{errors.categories}</Text>
          ) : null}
          
          <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
            {EVENT_CATEGORIES.map((item) => {
              const isSelected = selectedCategories.includes(item);

              return (
                <TouchableOpacity
                  key={item}
                  style={styles.categoryItem}
                  onPress={() => handleCategoryToggle(item)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: colors.textSecondary },
                      isSelected && [styles.categoryTextSelected, { color: colors.text }],
                    ]}
                  >
                    {item}
                  </Text>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.sheetFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 }]}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setIsCategorySheetVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={handleCategoryContinue}
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
  selectorLeft: {
    alignItems: 'center',
    flexDirection: 'row',
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
  categorySummary: {
    flex: 1,
    fontSize: 14,
    marginRight: 10,
  },
  compactSelectorText: {
    flex: 1,
    fontSize: 13,
  },
  dateTimeGroup: {
    marginBottom: 24,
  },
  dateRow: {
    marginBottom: 20,
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
    marginBottom: 8,
  },
  categoryCount: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetError: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  categoryList: {
    marginBottom: 20,
  },
  categoryItem: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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

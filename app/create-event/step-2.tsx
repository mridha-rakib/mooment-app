import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';

export default function CreateEventStep2() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [selectedAge, setSelectedAge] = useState('All Ages');
  const [isCategorySheetVisible, setIsCategorySheetVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const ageOptions = ['All Ages', '18+', '21+'];
  const categories = [
    "I just don't like it",
    "Hate or exploitation",
    "Selling or promoting restricted items",
    "Nudity or sexual activity",
    "Violence or dangerous organizations",
    "It's spam",
    "Bullying or harassment",
    "False information",
    "Intellectual property violation",
    "Other",
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Event</Text>
        <TouchableOpacity>
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
            {ageOptions.map((age) => (
              <TouchableOpacity
                key={age}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  selectedAge === age ? { backgroundColor: colors.text, borderColor: colors.text } : { backgroundColor: 'transparent' },
                ]}
                onPress={() => setSelectedAge(age)}
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
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
          <TouchableOpacity 
            style={[styles.selector, { backgroundColor: colors.card }]}
            onPress={() => setIsCategorySheetVisible(true)}
          >
            <Text style={selectedCategory ? [styles.selectorText, { color: colors.text }] : [styles.selectorPlaceholder, { color: colors.textSecondary }]}>
              {selectedCategory || 'Select Category'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Date and Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DATE</Text>
            <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectorText, { color: colors.text }]}>Sep 9, 2026</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>TIME</Text>
            <TouchableOpacity style={[styles.selector, { backgroundColor: colors.card }]}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.selectorText, { color: colors.text }]}>10:00 AM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Spacer to push footer down */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/create-event/step-3')}
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
            {categories.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.categoryItem}
                onPress={() => setSelectedCategory(item)}
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
    paddingTop: 70,
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
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorPlaceholder: {
    fontSize: 15,
  },
  selectorText: {
    fontSize: 15,
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

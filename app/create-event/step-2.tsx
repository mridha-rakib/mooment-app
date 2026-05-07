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

export default function CreateEventStep2() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity>
          <Text style={styles.saveDraft}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Step 2</Text>
        <Text style={styles.stepText}>2 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Age Restrictions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>AGE RESTRICTIONS</Text>
          <View style={styles.chipRow}>
            {ageOptions.map((age) => (
              <TouchableOpacity
                key={age}
                style={[
                  styles.chip,
                  selectedAge === age ? styles.chipSelected : styles.chipUnselected,
                ]}
                onPress={() => setSelectedAge(age)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedAge === age ? styles.chipTextSelected : styles.chipTextUnselected,
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
          <Text style={styles.label}>CATEGORY</Text>
          <TouchableOpacity 
            style={styles.selector}
            onPress={() => setIsCategorySheetVisible(true)}
          >
            <Text style={selectedCategory ? styles.selectorText : styles.selectorPlaceholder}>
              {selectedCategory || 'Select Category'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#8E8E9B" />
          </TouchableOpacity>
        </View>

        {/* Date and Time Row */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>DATE</Text>
            <TouchableOpacity style={styles.selector}>
              <Ionicons name="calendar-outline" size={18} color="#8E8E9B" style={{ marginRight: 8 }} />
              <Text style={styles.selectorText}>Sep 9, 2026</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>TIME</Text>
            <TouchableOpacity style={styles.selector}>
              <Ionicons name="time-outline" size={18} color="#8E8E9B" style={{ marginRight: 8 }} />
              <Text style={styles.selectorText}>10:00 AM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Spacer to push footer down */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => router.push('/create-event/step-3')}
        >
          <Text style={styles.nextButtonText}>Next</Text>
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
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Category</Text>
          
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
                    selectedCategory === item && styles.categoryTextSelected,
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
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.continueButton}
              onPress={() => setIsCategorySheetVisible(false)}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
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
    backgroundColor: '#0e0d12',
    paddingTop: Platform.OS === 'android' ? 56 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: 20,
  },
  saveDraft: {
    color: '#AFA9EC',
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
    color: '#8E8E9B',
    fontSize: 13,
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#8E8E9B',
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
  chipSelected: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  chipUnselected: {
    backgroundColor: 'transparent',
    borderColor: '#2A2A32',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#0e0d12',
  },
  chipTextUnselected: {
    color: '#FFF',
  },
  selector: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorPlaceholder: {
    color: '#8E8E9B',
    fontSize: 15,
  },
  selectorText: {
    color: '#FFF',
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
    backgroundColor: '#A29CB5',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#0e0d12',
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
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 60,
    height: 4,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: '#FFF',
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
    color: '#A1A1AA',
    fontSize: 16,
  },
  categoryTextSelected: {
    color: '#FFF',
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#A29CB5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: '600',
  },
});

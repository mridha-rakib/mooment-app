import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';

export default function CreateEventStep3() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [venue, setVenue] = useState('Rooftop Terace, NYC');
  const [address, setAddress] = useState('123, Main Street NYC');

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
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step 3</Text>
        <Text style={[styles.stepText, { color: colors.textSecondary }]}>3 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Location Search */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>LOCATION</Text>
          <TouchableOpacity 
            style={[styles.searchBox, { borderColor: colors.border }]}
            onPress={() => router.push('/create-event/location-picker')}
          >
            <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
            <Text style={[styles.searchText, { color: colors.text }]}>123, Main Street NYC</Text>
          </TouchableOpacity>
        </View>

        {/* Venue */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>VENUE</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Venue Name"
            placeholderTextColor={colors.textSecondary}
            value={venue}
            onChangeText={setVenue}
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>ADDRESS</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Full Address"
            placeholderTextColor={colors.textSecondary}
            value={address}
            onChangeText={setAddress}
          />
        </View>
      </View>

      {/* Spacer to push footer down */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/create-event/step-4')}
        >
          <Text style={[styles.nextButtonText, { color: colors.background }]}>Next</Text>
        </TouchableOpacity>
      </View>
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
  searchBox: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchText: {
    fontSize: 15,
  },
  input: {
    borderRadius: 12,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
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

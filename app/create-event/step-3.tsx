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

export default function CreateEventStep3() {
  const router = useRouter();
  const [venue, setVenue] = useState('Rooftop Terace, NYC');
  const [address, setAddress] = useState('123, Main Street NYC');

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
        <Text style={styles.stepText}>Step 3</Text>
        <Text style={styles.stepText}>3 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Location Search */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>LOCATION</Text>
          <TouchableOpacity 
            style={styles.searchBox}
            onPress={() => router.push('/create-event/location-picker')}
          >
            <Ionicons name="location-outline" size={20} color="#8E8E9B" style={{ marginRight: 10 }} />
            <Text style={styles.searchText}>123, Main Street NYC</Text>
          </TouchableOpacity>
        </View>

        {/* Venue */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>VENUE</Text>
          <TextInput
            style={styles.input}
            placeholder="Venue Name"
            placeholderTextColor="#8E8E9B"
            value={venue}
            onChangeText={setVenue}
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Address"
            placeholderTextColor="#8E8E9B"
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
          style={styles.nextButton}
          onPress={() => router.push('/create-event/step-4')}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0d12',
    paddingTop: Platform.OS === 'android' ? 32 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginLeft: 16,
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
  searchBox: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F3F46',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchText: {
    color: '#FFF',
    fontSize: 15,
  },
  input: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    color: '#FFF',
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
    backgroundColor: '#A29CB5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: '600',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackButton from '@/components/ui/BackButton';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';

export default function CreateEventStep5() {
  const router = useRouter();
  const [privacy, setPrivacy] = useState('public'); // 'public' or 'private'
  const [showConfetti, setShowConfetti] = useState(false);

  const handlePublish = () => {
    setShowConfetti(true);
    // Simulate a delay before navigating back or to success screen
    setTimeout(() => {
      console.log('Event Published!');
      // router.replace('/(tabs)/home'); 
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Confetti Animation */}
      <ConfettiOverlay 
        visible={showConfetti} 
        onFinish={() => setShowConfetti(false)} 
      />
      
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity>
          <Text style={styles.saveDraft}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>Step 5</Text>
        <Text style={styles.stepText}>6 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        <Text style={styles.title}>Choose event privacy</Text>
        <Text style={styles.description}>
          You can always change the event privacy from the screen, but if anybody buy tickets it can not be revert.
        </Text>

        {/* Public Event */}
        <TouchableOpacity 
          style={[styles.optionCard, privacy === 'public' && styles.optionCardActive]}
          onPress={() => setPrivacy('public')}
          activeOpacity={0.8}
        >
          <View style={styles.optionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="globe-outline" size={20} color="#FFF" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Public Event</Text>
              <Text style={styles.optionDesc}>This event will be visible to everyone.</Text>
            </View>
            <View style={[styles.radioOuter, privacy === 'public' && styles.radioOuterActive]}>
              {privacy === 'public' && <View style={styles.radioInner} />}
            </View>
          </View>
          <Text style={styles.optionNote}>
            Note: You can hold the tickets to being sell, change the event to locked event, where user will request to buy ticket.
          </Text>
        </TouchableOpacity>

        {/* Private Event */}
        <TouchableOpacity 
          style={[styles.optionCard, privacy === 'private' && styles.optionCardActive]}
          onPress={() => setPrivacy('private')}
          activeOpacity={0.8}
        >
          <View style={styles.optionHeader}>
            <View style={styles.iconContainer}>
              <Feather name="unlock" size={18} color="#FFF" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Private Event</Text>
              <Text style={styles.optionDesc}>
                This event will be visible to selected members, you can select members after publishing the event
              </Text>
            </View>
            <View style={[styles.radioOuter, privacy === 'private' && styles.radioOuterActive]}>
              {privacy === 'private' && <View style={styles.radioInner} />}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.publishButton}
          onPress={handlePublish}
        >
          <Text style={styles.publishButtonText}>Publish Event</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0d12',
    paddingTop: 60,
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
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    color: '#8E8E9B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A32',
    marginBottom: 16,
  },
  optionCardActive: {
    borderColor: '#3F3F46',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1A1A22',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A32',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionDesc: {
    color: '#8E8E9B',
    fontSize: 12,
    lineHeight: 16,
  },
  optionNote: {
    color: '#71717A',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A32',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: '#FFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFF',
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  publishButton: {
    flex: 2,
    backgroundColor: '#A29CB5',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#0e0d12',
    fontSize: 16,
    fontWeight: '600',
  },
});

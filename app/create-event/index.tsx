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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function CreateEventScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setBannerImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setBannerImage(null);
  };

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
        <Text style={styles.stepText}>Step 1</Text>
        <Text style={styles.stepText}>1 out of 6</Text>
      </View>

      {/* Form Content */}
      <View style={styles.formContainer}>
        {/* Event Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>EVENT NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#8E8E9B"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Event main highlights"
            placeholderTextColor="#8E8E9B"
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Banner */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>BANNER</Text>
            {bannerImage && (
              <TouchableOpacity onPress={removeImage} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.uploadBox, bannerImage ? { padding: 0, borderWidth: 0 } : {}]}
            activeOpacity={0.8}
            onPress={bannerImage ? undefined : pickImage}
          >
            {bannerImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: bannerImage }} style={styles.bannerImagePreview} />
              </View>
            ) : (
              <>
                <Text style={styles.uploadText}>You can only upload one image for the banner</Text>
                
                <View style={styles.uploadButton}>
                  <Feather name="arrow-up-circle" size={16} color="#1A1A22" />
                  <Text style={styles.uploadButtonText}>Upload Image</Text>
                </View>
                
                <Text style={styles.uploadHint}>JPEG, or PNG</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Spacer to push footer down */}
      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => router.push('/create-event/step-2')}
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
  },
  input: {
    backgroundColor: '#1A1A22',
    borderRadius: 12,
    color: '#FFF',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#2A2A32',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: {
    color: '#8E8E9B',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1D1D6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  uploadButtonText: {
    color: '#1A1A22',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadHint: {
    color: '#8E8E9B',
    fontSize: 12,
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

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BackButton from '@/components/ui/BackButton';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/hooks/useTheme';

export default function AddStoryScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.permissionText, { color: colors.text }]}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={[styles.permissionBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.permissionBtnText, { color: colors.background }]}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />
      
      <CameraView style={styles.cameraBackground} facing="back">
        
        {/* Gradient Overlay for Top Nav Visibility */}
        <View style={styles.topGradient} />

        <SafeAreaView style={styles.safeArea}>
          
          {/* Header Navigation & Progress */}
          <View style={styles.header}>
            <BackButton />

            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>0</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: isRecording ? '40%' : '0%' }]} />
              </View>
              <Text style={styles.progressText}>15s</Text>
            </View>

            <View style={{ width: 32 }} /> {/* Placeholder for balance */}
          </View>

          {/* Right Action Column */}
          <View style={styles.rightActionsCol}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
              <Feather name="type" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8}>
              <Feather name="music" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Bottom Capture Button */}
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={[styles.captureBtnOuter, isRecording && styles.captureBtnOuterRecording]}
              onPress={() => setIsRecording(!isRecording)}
              activeOpacity={0.9}
            >
              <View style={[styles.captureBtnInner, isRecording && styles.captureBtnInnerRecording]} />
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  permissionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionBtnText: {
    fontWeight: 'bold',
  },
  cameraBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.3)', // Simple mock for gradient
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginHorizontal: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  rightActionsCol: {
    position: 'absolute',
    right: 16,
    top: 100,
    alignItems: 'center',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnOuterRecording: {
    borderColor: 'rgba(242, 36, 92, 0.5)', // Red tinted when recording
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  captureBtnInnerRecording: {
    width: 32,
    height: 32,
    borderRadius: 8, // Square shape when recording
    backgroundColor: '#F2245C',
  },
});

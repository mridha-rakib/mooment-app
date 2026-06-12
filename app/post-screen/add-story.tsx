import React, { useEffect, useRef, useState } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BackButton from '@/components/ui/BackButton';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useTheme } from '@/hooks/useTheme';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { createStory } from '@/lib/stories';
import { generateStoryThumbnail, setCachedStoryThumbnail } from '@/lib/storyThumbnails';
import { uploadFileToStorage } from '@/lib/storage';
import { getAuthErrorMessage } from '@/lib/authErrors';

const MAX_STORY_SECONDS = 15;

const getVideoContentType = (uri: string, mimeType?: string | null) => {
  if (mimeType) {
    return mimeType;
  }

  const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();

  if (normalizedUri.endsWith(".mov")) {
    return "video/quicktime";
  }

  return "video/mp4";
};

const getVideoExtension = (contentType: string) => {
  if (contentType.includes("quicktime")) {
    return "mov";
  }

  if (contentType.includes("webm")) {
    return "webm";
  }

  return "mp4";
};

export default function AddStoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  useEffect(() => {
    if (recordingFrameRef.current !== null) {
      cancelAnimationFrame(recordingFrameRef.current);
      recordingFrameRef.current = null;
    }

    if (!isRecording) {
      return;
    }

    const tick = () => {
      const startedAt = recordingStartedAtRef.current;

      if (!startedAt) {
        return;
      }

      const elapsed = Math.min(Date.now() - startedAt, MAX_STORY_SECONDS * 1000);
      setElapsedMs(elapsed);

      if (elapsed < MAX_STORY_SECONDS * 1000) {
        recordingFrameRef.current = requestAnimationFrame(tick);
      }
    };

    recordingFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (recordingFrameRef.current !== null) {
        cancelAnimationFrame(recordingFrameRef.current);
        recordingFrameRef.current = null;
      }
    };
  }, [isRecording]);

  const publishVideo = async ({
    uri,
    durationSeconds,
    contentType,
    source,
  }: {
    uri: string;
    durationSeconds: number;
    contentType: string;
    source: 'camera' | 'gallery';
  }) => {
    if (isPublishing) {
      return;
    }

    if (durationSeconds > MAX_STORY_SECONDS) {
      Alert.alert('Story too long', 'Stories can be up to 15 seconds long.');
      return;
    }

    setIsPublishing(true);

    try {
      const thumbnailPromise = generateStoryThumbnail(uri);
      const extension = getVideoExtension(contentType);
      const storageKey = await uploadFileToStorage({
        uri,
        key: `stories/${Date.now()}.${extension}`,
        contentType,
      });

      const story = await createStory({
        mediaSource: source,
        storageKey,
        contentType,
        durationSeconds: Math.max(0.1, durationSeconds),
      });

      const thumbnail = await thumbnailPromise;

      if (thumbnail) {
        setCachedStoryThumbnail(story.id, thumbnail);
      }

      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert(
        'Unable to create story',
        getAuthErrorMessage(error, 'Please check the video and try again.'),
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRecordPress = async () => {
    if (isPublishing) {
      return;
    }

    if (isRecording) {
      cameraRef.current?.stopRecording();
      return;
    }

    if (!cameraPermission?.granted || !microphonePermission?.granted) {
      const [nextCameraPermission, nextMicrophonePermission] = await Promise.all([
        cameraPermission?.granted ? Promise.resolve(cameraPermission) : requestCameraPermission(),
        microphonePermission?.granted ? Promise.resolve(microphonePermission) : requestMicrophonePermission(),
      ]);

      if (!nextCameraPermission.granted || !nextMicrophonePermission.granted) {
        Alert.alert(
          'Permission needed',
          'Camera and microphone permissions are required to record a story video.',
        );
        return;
      }
    }

    try {
      setElapsedMs(0);
      setIsRecording(true);
      recordingStartedAtRef.current = Date.now();
      recordingPromiseRef.current = cameraRef.current?.recordAsync({
        maxDuration: MAX_STORY_SECONDS,
      }) ?? null;

      const video = await recordingPromiseRef.current;
      setIsRecording(false);
      recordingPromiseRef.current = null;

      if (video?.uri) {
        const durationSeconds = recordingStartedAtRef.current
          ? Math.min(MAX_STORY_SECONDS, (Date.now() - recordingStartedAtRef.current) / 1000)
          : MAX_STORY_SECONDS;

        await publishVideo({
          uri: video.uri,
          durationSeconds,
          contentType: 'video/mp4',
          source: 'camera',
        });
      }

      recordingStartedAtRef.current = null;
    } catch (error) {
      setIsRecording(false);
      recordingPromiseRef.current = null;
      recordingStartedAtRef.current = null;
      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try recording again.'));
    }
  };

  const handlePickVideo = async () => {
    if (isPublishing || isRecording) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to choose a story video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.9,
      videoMaxDuration: MAX_STORY_SECONDS,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    const durationSeconds = asset.duration ? asset.duration / 1000 : MAX_STORY_SECONDS;

    await publishVideo({
      uri: asset.uri,
      durationSeconds,
      contentType: getVideoContentType(asset.uri, asset.mimeType),
      source: 'gallery',
    });
  };

  if (!cameraPermission || !microphonePermission) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.permissionText, { color: colors.text }]}>
          Camera and microphone permissions are needed to record story videos.
        </Text>
        <TouchableOpacity
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
          }}
          style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.permissionBtnText, { color: colors.background }]}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />

      <CameraView ref={cameraRef} style={styles.cameraBackground} facing="back" mode="video" />

      {/* Gradient Overlay for Top Nav Visibility */}
      <View style={styles.topGradient} />

      <SafeAreaView style={styles.safeArea}>
        {/* Header Navigation & Progress */}
        <View style={styles.header}>
          <BackButton />

        <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{Math.floor(elapsedMs / 1000)}s</Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${(elapsedMs / (MAX_STORY_SECONDS * 1000)) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>15s</Text>
          </View>

          {/* Placeholder for balance */}
          <View style={{ width: 32 }} />
        </View>

        {/* Right Action Column */}
        <View style={styles.rightActionsCol}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handlePickVideo} disabled={isPublishing}>
            <Feather name="film" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Bottom Capture Button */}
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={[styles.captureBtnOuter, isRecording && styles.captureBtnOuterRecording]}
            onPress={handleRecordPress}
            activeOpacity={0.9}
            disabled={isPublishing}
          >
            <View style={[styles.captureBtnInner, isRecording && styles.captureBtnInnerRecording]} />
          </TouchableOpacity>
          <Text style={styles.helperText}>
            {isPublishing ? 'Publishing story...' : isRecording ? 'Tap to stop' : 'Hold your story to 15 seconds'}
          </Text>
        </View>
      </SafeAreaView>
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
    ...StyleSheet.absoluteFillObject,
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
  helperText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
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

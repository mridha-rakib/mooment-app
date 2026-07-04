import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Camera, CameraView, type CameraType } from 'expo-camera';
import type { PermissionResponse } from 'expo-modules-core';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import BackButton from '@/components/ui/BackButton';
import { useTheme } from '@/hooks/useTheme';
import { createStory, type StoryMediaSource, type StoryMediaType, type StoryTextBackground, type StoryTextOverlay } from '@/lib/stories';
import { generateStoryThumbnail, setCachedStoryThumbnail } from '@/lib/storyThumbnails';
import { uploadFileToStorage } from '@/lib/storage';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { prepareStoryVideoForUpload } from '@/lib/videoProcessor';
import { optimizeStoryImageForUpload } from '@/lib/storyImageOptimizer';

const MAX_STORY_SECONDS = 15;
const DEFAULT_TEXT_DURATION_SECONDS = 5;
const STORY_IMAGE_QUALITY = 0.82;
// 720p at 2 Mbps keeps a 15-second camera story near 4 MB while preserving
// enough headroom for audio and MP4 container overhead.
const STORY_VIDEO_BITRATE = 2_000_000;

type CameraMode = 'image' | 'video';
type StoryDraft = {
  mediaType: StoryMediaType;
  uri?: string;
  source: StoryMediaSource;
  durationSeconds: number;
  contentType?: string;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  textContent?: string;
  textBackground?: StoryTextBackground;
  textOverlay?: StoryTextOverlay | null;
};

const TEXT_BACKGROUNDS: StoryTextBackground[] = [
  { type: 'gradient', colors: ['#37214F', '#111827'] },
  { type: 'gradient', colors: ['#0F766E', '#111827'] },
  { type: 'color', colors: ['#15151F'] },
  { type: 'color', colors: ['#7C2D12'] },
];

const TEXT_COLORS = ['#FFFFFF', '#FDE68A', '#C7D2FE', '#FBCFE8'];
const OVERLAY_POSITIONS = [
  { label: 'Top', y: 0.24 },
  { label: 'Middle', y: 0.5 },
  { label: 'Bottom', y: 0.76 },
];
const OVERLAY_SCALES = [
  { label: 'S', value: 0.85 },
  { label: 'M', value: 1 },
  { label: 'L', value: 1.2 },
];

const createStoryTiming = (flow: string) => {
  const startedAt = Date.now();
  let previousAt = startedAt;

  return (label: string, extra?: Record<string, unknown>) => {
    if (!__DEV__) return;

    const now = Date.now();
    console.log(`[StoryCreateTiming] ${flow}:${label}`, {
      stepMs: now - previousAt,
      totalMs: now - startedAt,
      ...extra,
    });
    previousAt = now;
  };
};

const getLocalUriByteSize = (uri: string): Promise<number | null> =>
  new Promise((resolve) => {
    const request = new XMLHttpRequest();

    request.responseType = 'blob';
    request.onload = () => resolve((request.response as Blob).size);
    request.onerror = () => resolve(null);
    request.ontimeout = () => resolve(null);
    request.timeout = 10000;
    request.open('GET', uri, true);
    request.send(null);
  });

const selectStoryPictureSize = (sizes: string[]) => {
  const parsedSizes = sizes
    .map((size) => {
      const [width, height] = size.split('x').map((value) => Number(value));

      if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

      return {
        size,
        width,
        height,
        longSide: Math.max(width, height),
        shortSide: Math.min(width, height),
        area: width * height,
      };
    })
    .filter((size): size is NonNullable<typeof size> => Boolean(size));

  const storySized = parsedSizes
    .filter((size) => size.longSide <= 1920 && size.shortSide <= 1080)
    .sort((a, b) => b.area - a.area);

  return storySized[0]?.size ?? null;
};

const getVideoContentType = (uri: string, mimeType?: string | null) => {
  if (mimeType) return mimeType;
  const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();
  if (normalizedUri.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
};

const getImageContentType = (uri: string, mimeType?: string | null) => {
  if (mimeType) return mimeType;
  const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();
  if (normalizedUri.endsWith(".png")) return "image/png";
  if (normalizedUri.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};

const getVideoExtension = (contentType: string) => {
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("webm")) return "webm";
  return "mp4";
};

const getImageExtension = (contentType: string) => {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
};

const buildOverlay = (
  text: string,
  positionY: number,
  color: string,
  scale: number,
): StoryTextOverlay | null => {
  const trimmedText = text.trim();
  if (!trimmedText) return null;

  return {
    text: trimmedText,
    x: 0.5,
    y: positionY,
    scale,
    color,
    fontWeight: '700',
    textAlign: 'center',
  };
};

function StoryVideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri, useCaching: false }, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });

  return <VideoView style={styles.previewMedia} player={player} nativeControls={false} contentFit="cover" />;
}

export default function AddStoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingFrameRef = useRef<number | null>(null);
  const cameraSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('image');
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [storyText, setStoryText] = useState('');
  const [overlayText, setOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState(TEXT_COLORS[0]);
  const [overlayY, setOverlayY] = useState(0.5);
  const [overlayScale, setOverlayScale] = useState(1);
  const [textBackground, setTextBackground] = useState<StoryTextBackground>(TEXT_BACKGROUNDS[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSwitchingCameraMode, setIsSwitchingCameraMode] = useState(false);
  const [publishStage, setPublishStage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraInstanceKey, setCameraInstanceKey] = useState(0);
  const [cameraPictureSize, setCameraPictureSize] = useState<string | undefined>(undefined);
  const [permissionLoadTimedOut, setPermissionLoadTimedOut] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<PermissionResponse | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<PermissionResponse | null>(null);
  const hasRequestedCameraPermission = useRef(false);
  const cameraRecoveryAttemptedRef = useRef(false);
  const publishInFlightRef = useRef(false);
  const uploadProgressRef = useRef(0);
  const uploadProgressEventCountRef = useRef(0);
  const lastUploadProgressUpdateAtRef = useRef(0);

  const currentOverlay = useMemo(
    () => buildOverlay(overlayText, overlayY, overlayColor, overlayScale),
    [overlayColor, overlayScale, overlayText, overlayY],
  );
  const isPreviewing = Boolean(draft);

  const updateUploadProgress = useCallback((progress: number) => {
    const normalizedProgress = Math.max(uploadProgressRef.current, Math.min(1, Math.max(0, progress)));
    const now = Date.now();
    uploadProgressEventCountRef.current += 1;

    if (
      normalizedProgress > uploadProgressRef.current &&
      (
        normalizedProgress >= 1 ||
        normalizedProgress - uploadProgressRef.current >= 0.02 ||
        now - lastUploadProgressUpdateAtRef.current >= 250
      )
    ) {
      if (__DEV__) {
        console.log('[StoryCreateTiming] upload progress update', {
          progress: normalizedProgress,
          eventCount: uploadProgressEventCountRef.current,
        });
      }
      uploadProgressRef.current = normalizedProgress;
      lastUploadProgressUpdateAtRef.current = now;
      setUploadProgress(normalizedProgress);
    }
  }, []);

  const refreshPermissions = useCallback(async () => {
    const nextCameraPermission = await Camera.getCameraPermissionsAsync();
    setCameraPermission(nextCameraPermission);
    return nextCameraPermission;
  }, []);

  const requestCameraPermission = useCallback(async () => {
    if (isRequestingPermissions) return false;
    setIsRequestingPermissions(true);

    try {
      const nextCameraPermission = cameraPermission?.granted
        ? cameraPermission
        : await Camera.requestCameraPermissionsAsync();
      setCameraPermission(nextCameraPermission);
      return nextCameraPermission.granted;
    } catch (error) {
      Alert.alert('Unable to request camera', getAuthErrorMessage(error, 'Please try again or enable camera access in Settings.'));
      return false;
    } finally {
      setIsRequestingPermissions(false);
    }
  }, [cameraPermission, isRequestingPermissions]);

  const requestMicrophonePermission = useCallback(async () => {
    if (microphonePermission?.granted) return true;

    try {
      const nextMicrophonePermission = await Camera.requestMicrophonePermissionsAsync();
      setMicrophonePermission(nextMicrophonePermission);
      return nextMicrophonePermission.granted;
    } catch {
      return false;
    }
  }, [microphonePermission]);

  const handleCameraModeChange = useCallback(async (mode: CameraMode) => {
    if (isRecording || isSwitchingCameraMode || cameraMode === mode) return;

    if (mode === 'video') {
      const microphoneGranted = await requestMicrophonePermission();
      if (!microphoneGranted) {
        Alert.alert('Permission needed', 'Microphone permission is required to record a story video.');
        return;
      }
    }

    cameraRecoveryAttemptedRef.current = false;
    setCameraError(null);
    setIsCameraReady(false);
    setElapsedMs(0);
    setIsSwitchingCameraMode(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setCameraMode(mode);
    setCameraInstanceKey((key) => key + 1);
    setIsSwitchingCameraMode(false);
  }, [cameraMode, isRecording, isSwitchingCameraMode, requestMicrophonePermission]);

  useEffect(() => {
    let isMounted = true;
    void refreshPermissions().catch(() => {
      if (isMounted) setPermissionLoadTimedOut(true);
    });
    return () => {
      isMounted = false;
    };
  }, [refreshPermissions]);

  useEffect(() => {
    if (!cameraPermission || cameraPermission.granted || hasRequestedCameraPermission.current) return;
    hasRequestedCameraPermission.current = true;
    void requestCameraPermission();
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (cameraPermission) {
      setPermissionLoadTimedOut(false);
      return;
    }
    const timeout = setTimeout(() => setPermissionLoadTimedOut(true), 4000);
    return () => clearTimeout(timeout);
  }, [cameraPermission]);

  useEffect(() => () => {
    cameraRef.current?.stopRecording();
    if (cameraSwitchTimeoutRef.current) {
      clearTimeout(cameraSwitchTimeoutRef.current);
      cameraSwitchTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setIsCameraReady(false);
      return;
    }

    if (isCameraReady || cameraError || !cameraPermission?.granted || isPreviewing || isSwitchingCameraMode) return;
    const timeout = setTimeout(() => {
      if (!cameraRecoveryAttemptedRef.current) {
        cameraRecoveryAttemptedRef.current = true;
        setCameraInstanceKey((key) => key + 1);
        return;
      }

      setCameraError('The camera could not initialize. Close other apps using the camera, then retry.');
    }, 12000);
    return () => clearTimeout(timeout);
  }, [cameraError, cameraInstanceKey, cameraPermission?.granted, isCameraReady, isFocused, isPreviewing, isSwitchingCameraMode]);

  useEffect(() => {
    if (recordingFrameRef.current !== null) {
      cancelAnimationFrame(recordingFrameRef.current);
      recordingFrameRef.current = null;
    }
    if (!isRecording) return;

    const tick = () => {
      const startedAt = recordingStartedAtRef.current;
      if (!startedAt) return;
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

  const resetDraft = useCallback(() => {
    setIsCameraReady(false);
    cameraRecoveryAttemptedRef.current = false;
    recordingStartedAtRef.current = null;
    recordingPromiseRef.current = null;
    setElapsedMs(0);
    setDraft(null);
    setStoryText('');
    setOverlayText('');
    setOverlayColor(TEXT_COLORS[0]);
    setOverlayY(0.5);
    setOverlayScale(1);
    setTextBackground(TEXT_BACKGROUNDS[0]);
    setIsPublishing(false);
    uploadProgressRef.current = 0;
    uploadProgressEventCountRef.current = 0;
    lastUploadProgressUpdateAtRef.current = 0;
    setUploadProgress(0);
    setPublishStage('');
  }, []);

  const handleSwitchCameraFacing = useCallback(() => {
    if (isPublishing || isRecording || isSwitchingCameraMode) return;

    if (cameraSwitchTimeoutRef.current) {
      clearTimeout(cameraSwitchTimeoutRef.current);
    }

    setIsSwitchingCameraMode(true);
    setCameraError(null);
    setIsCameraReady(false);
    setCameraPictureSize(undefined);

    cameraSwitchTimeoutRef.current = setTimeout(() => {
      setCameraFacing((current) => current === 'back' ? 'front' : 'back');
      setCameraInstanceKey((key) => key + 1);
      setIsSwitchingCameraMode(false);
      cameraSwitchTimeoutRef.current = null;
    }, 160);
  }, [isPublishing, isRecording, isSwitchingCameraMode]);

  const stageDraft = (nextDraft: StoryDraft) => {
    setIsCameraReady(false);
    setDraft(nextDraft);
    setStoryText(nextDraft.textContent ?? '');
    setOverlayText(nextDraft.textOverlay?.text ?? '');
    setOverlayColor(nextDraft.textOverlay?.color ?? TEXT_COLORS[0]);
    setOverlayY(nextDraft.textOverlay?.y ?? 0.5);
    setOverlayScale(nextDraft.textOverlay?.scale ?? 1);
    setTextBackground(nextDraft.textBackground ?? TEXT_BACKGROUNDS[0]);
  };

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }, [router]);

  const confirmDiscard = useCallback((onDiscard: () => void) => {
    if (isPublishing) return;

    Alert.alert(
      'Discard story?',
      'Your captured media and edits will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onDiscard },
      ],
    );
  }, [isPublishing]);

  const handleDiscardDraft = useCallback(() => {
    confirmDiscard(resetDraft);
  }, [confirmDiscard, resetDraft]);

  const handleLeaveStory = useCallback(() => {
    if (!draft) {
      goBack();
      return;
    }

    confirmDiscard(goBack);
  }, [confirmDiscard, draft, goBack]);

  useEffect(() => {
    if (!draft) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isPublishing) handleDiscardDraft();
      return true;
    });

    return () => subscription.remove();
  }, [draft, handleDiscardDraft, isPublishing]);

  useEffect(() => {
    if (!draft) return;

    const mark = createStoryTiming('preview');
    const frame = requestAnimationFrame(() => {
      mark('rendered', { mediaType: draft.mediaType });
    });

    return () => cancelAnimationFrame(frame);
  }, [draft]);

  const handleCaptureImage = async () => {
    if (isPublishing || isRecording) return;
    const mark = createStoryTiming('capture-image');
    mark('start');
    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Camera permission is required to capture an image story.');
        return;
      }
    }
    if (!isCameraReady || !cameraRef.current) {
      Alert.alert('Camera is starting', 'Wait a moment for the camera preview, then try again.');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: STORY_IMAGE_QUALITY });
      mark('camera capture result', {
        hasUri: Boolean(photo?.uri),
        width: photo?.width,
        height: photo?.height,
      });
      if (photo?.uri) {
        void getLocalUriByteSize(photo.uri).then((bytes) => mark('captured image size', { bytes }));
        stageDraft({
          mediaType: 'image',
          uri: photo.uri,
          source: 'camera',
      durationSeconds: DEFAULT_TEXT_DURATION_SECONDS,
      contentType: getImageContentType(photo.uri),
      width: photo.width,
      height: photo.height,
    });
      }
    } catch (error) {
      Alert.alert('Capture failed', getAuthErrorMessage(error, 'Please try capturing the image again.'));
    }
  };

  const handleRecordVideo = async () => {
    if (isPublishing) return;
    const mark = createStoryTiming('record-video');
    if (isRecording) {
      mark('stop requested');
      cameraRef.current?.stopRecording();
      return;
    }

    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Permission needed', 'Camera permission is required to record a story video.');
        return;
      }
    }

    const microphoneGranted = await requestMicrophonePermission();
    if (!microphoneGranted) {
      Alert.alert('Permission needed', 'Microphone permission is required to record a story video.');
      return;
    }

    if (!isCameraReady || !cameraRef.current) {
      Alert.alert('Camera is starting', 'Wait a moment for the camera preview, then try again.');
      return;
    }

    try {
      mark('start');
      setElapsedMs(0);
      setIsRecording(true);
      recordingStartedAtRef.current = Date.now();
      recordingPromiseRef.current = cameraRef.current.recordAsync({
        maxDuration: MAX_STORY_SECONDS,
        // expo-camera requires an explicit codec on iOS before videoBitrate is applied.
        ...(Platform.OS === 'ios' ? { codec: 'avc1' as const } : {}),
      }) ?? null;

      const video = await recordingPromiseRef.current;
      setIsRecording(false);
      recordingPromiseRef.current = null;
      mark('camera record result', { hasUri: Boolean(video?.uri) });

      if (video?.uri) {
        const durationSeconds = recordingStartedAtRef.current
          ? Math.min(MAX_STORY_SECONDS, (Date.now() - recordingStartedAtRef.current) / 1000)
          : MAX_STORY_SECONDS;

        void getLocalUriByteSize(video.uri).then((bytes) => mark('recorded video size', { bytes }));
        stageDraft({
          mediaType: 'video',
          uri: video.uri,
          source: 'camera',
          durationSeconds,
          contentType: 'video/mp4',
        });
      }

      recordingStartedAtRef.current = null;
      setElapsedMs(0);
    } catch (error) {
      setIsRecording(false);
      recordingPromiseRef.current = null;
      recordingStartedAtRef.current = null;
      setElapsedMs(0);
      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try recording again.'));
    }
  };

  const handlePickImage = async () => {
    if (isPublishing || isRecording) return;
    const mark = createStoryTiming('pick-image');
    mark('start');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to choose a story image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: STORY_IMAGE_QUALITY,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    mark('picker result', {
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
    });

    stageDraft({
      mediaType: 'image',
      uri: asset.uri,
      source: 'gallery',
      durationSeconds: DEFAULT_TEXT_DURATION_SECONDS,
      contentType: getImageContentType(asset.uri, asset.mimeType),
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
    });
  };

  const handlePickVideo = async () => {
    if (isPublishing || isRecording) return;
    const mark = createStoryTiming('pick-video');
    mark('start');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to choose a story video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.9,
      videoMaxDuration: MAX_STORY_SECONDS,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const durationSeconds = asset.duration ? asset.duration / 1000 : MAX_STORY_SECONDS;
    mark('picker result', {
      durationSeconds,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
    });

    if (durationSeconds > MAX_STORY_SECONDS) {
      Alert.alert('Story too long', 'Stories can be up to 15 seconds long.');
      return;
    }

    stageDraft({
      mediaType: 'video',
      uri: asset.uri,
      source: 'gallery',
      durationSeconds,
      contentType: getVideoContentType(asset.uri, asset.mimeType),
    });
  };

  const handleCreateTextDraft = () => {
    if (!storyText.trim()) {
      setStoryText('Write your story');
    }

    stageDraft({
      mediaType: 'text',
      source: 'upload',
      durationSeconds: DEFAULT_TEXT_DURATION_SECONDS,
      textContent: storyText.trim() || 'Write your story',
      textBackground,
    });
  };

  const publishDraft = async () => {
    if (!draft || isPublishing || publishInFlightRef.current) return;

    publishInFlightRef.current = true;
    Keyboard.dismiss();
    const mark = createStoryTiming(`publish-${draft.mediaType}`);
    mark('start', {
      mediaType: draft.mediaType,
      source: draft.source,
      hasMedia: Boolean(draft.uri),
      contentType: draft.contentType,
    });

    const finalOverlay = draft.mediaType === 'text' ? null : currentOverlay;
    const finalTextContent = draft.mediaType === 'text' ? storyText.trim() : undefined;

    if (draft.mediaType === 'text' && !finalTextContent) {
      publishInFlightRef.current = false;
      Alert.alert('Add text', 'Write something before posting a text story.');
      return;
    }

    setIsPublishing(true);
    setPublishStage('Preparing...');
    uploadProgressRef.current = 0;
    uploadProgressEventCountRef.current = 0;
    lastUploadProgressUpdateAtRef.current = 0;
    setUploadProgress(0);
    let didSucceed = false;

    try {
      if (draft.mediaType === 'text') {
        setPublishStage('Creating story...');
        mark('create story API start');
        await createStory({
          mediaType: 'text',
          mediaSource: 'upload',
          durationSeconds: draft.durationSeconds,
          textContent: finalTextContent,
          textBackground,
        });
        mark('create story API complete');
        didSucceed = true;
        setPublishStage('Posted');
        await new Promise((resolve) => setTimeout(resolve, 150));
        resetDraft();
        router.replace('/(tabs)/home');
        return;
      }

      if (!draft.uri || !draft.contentType) {
        throw new Error('The selected story media is incomplete.');
      }

      if (draft.mediaType === 'video') {
        if (draft.durationSeconds > MAX_STORY_SECONDS) {
          publishInFlightRef.current = false;
          setIsPublishing(false);
          setPublishStage('');
          Alert.alert('Story too long', 'Stories can be up to 15 seconds long.');
          return;
        }

        setPublishStage('Preparing...');
        mark('video preparation start');
        const processed = await prepareStoryVideoForUpload(
          draft.uri,
          draft.contentType,
          (stage, pct) => setPublishStage(pct > 0 ? `${stage} ${Math.round(pct)}%` : stage),
        );
        mark('video preparation complete', {
          optimizedUriChanged: processed.uri !== draft.uri,
          contentType: processed.contentType,
          bytes: processed.bytes,
        });

        setPublishStage('Uploading media...');
        const thumbnailPromise = generateStoryThumbnail(processed.uri);
        const extension = getVideoExtension(processed.contentType);
        mark('storage upload start');
        const storageKey = await uploadFileToStorage({
          uri: processed.uri,
          key: `stories/${Date.now()}.${extension}`,
          contentType: processed.contentType,
          onProgress: updateUploadProgress,
        });
        mark('storage upload complete', {
          progressEvents: uploadProgressEventCountRef.current,
          storageKey,
        });

        setPublishStage('Creating story...');
        mark('create story API start');
        const story = await createStory({
          mediaType: 'video',
          mediaSource: draft.source,
          storageKey,
          contentType: processed.contentType,
          durationSeconds: Math.max(0.1, draft.durationSeconds),
          textOverlay: finalOverlay,
        });
        mark('create story API complete');

        void thumbnailPromise
          .then((thumbnail) => {
            if (thumbnail) setCachedStoryThumbnail(story.id, thumbnail);
          })
          .catch(() => undefined);

        didSucceed = true;
        setPublishStage('Posted');
        await new Promise((resolve) => setTimeout(resolve, 150));
        resetDraft();
        router.replace('/(tabs)/home');
        return;
      }

      setPublishStage('Preparing...');
      mark('image preparation start');
      const originalImageBytes = draft.fileSize ?? await getLocalUriByteSize(draft.uri);
      const optimizedImage = draft.source === 'gallery'
        ? await optimizeStoryImageForUpload({
            uri: draft.uri,
            width: draft.width,
            height: draft.height,
            contentType: draft.contentType,
          })
        : {
            uri: draft.uri,
            width: draft.width ?? null,
            height: draft.height ?? null,
            contentType: draft.contentType ?? 'image/jpeg',
            resized: false,
          };
      const optimizedImageBytes = await getLocalUriByteSize(optimizedImage.uri);
      mark('image preparation complete', {
        source: draft.source,
        originalBytes: originalImageBytes,
        optimizedBytes: optimizedImageBytes,
        originalWidth: draft.width,
        originalHeight: draft.height,
        optimizedWidth: optimizedImage.width,
        optimizedHeight: optimizedImage.height,
        resized: optimizedImage.resized,
        contentType: optimizedImage.contentType,
      });

      setPublishStage('Uploading media...');
      const imageContentType = optimizedImage.contentType;
      mark('storage upload start');
      const storageKey = await uploadFileToStorage({
        uri: optimizedImage.uri,
        key: `stories/${Date.now()}.${getImageExtension(imageContentType)}`,
        contentType: imageContentType,
        onProgress: updateUploadProgress,
      });
      mark('storage upload complete', {
        progressEvents: uploadProgressEventCountRef.current,
        storageKey,
      });

      setPublishStage('Creating story...');
      mark('create story API start');
      await createStory({
        mediaType: 'image',
        mediaSource: draft.source,
        storageKey,
        contentType: imageContentType,
        durationSeconds: draft.durationSeconds,
        textOverlay: finalOverlay,
      });
      mark('create story API complete');

      didSucceed = true;
      setPublishStage('Posted');
      await new Promise((resolve) => setTimeout(resolve, 150));
      resetDraft();
      router.replace('/(tabs)/home');
    } catch (error) {
      mark('failed', { message: getAuthErrorMessage(error, 'Please check the story and try again.') });
      Alert.alert('Unable to create story', getAuthErrorMessage(error, 'Please check the story and try again.'));
    } finally {
      publishInFlightRef.current = false;
      if (!didSucceed) {
        setIsPublishing(false);
        setPublishStage('');
        uploadProgressRef.current = 0;
        uploadProgressEventCountRef.current = 0;
        lastUploadProgressUpdateAtRef.current = 0;
        setUploadProgress(0);
      }
    }
  };

  const renderTextOverlay = (overlay: StoryTextOverlay | null | undefined) => {
    if (!overlay?.text) return null;

    return (
      <View
        pointerEvents="none"
        style={[
          styles.overlayTextWrap,
          {
            left: `${overlay.x * 100}%`,
            top: `${overlay.y * 100}%`,
            transform: [{ translateX: -140 }, { translateY: -30 }, { scale: overlay.scale }],
          },
        ]}
      >
        <Text
          style={[
            styles.overlayText,
            {
              color: overlay.color,
              fontWeight: overlay.fontWeight ?? '700',
              textAlign: overlay.textAlign ?? 'center',
            },
          ]}
        >
          {overlay.text}
        </Text>
      </View>
    );
  };

  if (!cameraPermission && !draft) {
    return (
      <View style={styles.permissionContainer}>
        <BackButton />
        {permissionLoadTimedOut ? (
          <>
            <Feather name="camera-off" size={44} color="#FFFFFF" />
            <Text style={[styles.permissionText, styles.permissionLoadText]}>Camera permissions could not be loaded.</Text>
            <TouchableOpacity
              onPress={async () => {
                setPermissionLoadTimedOut(false);
                try {
                  await refreshPermissions();
                } catch {
                  setPermissionLoadTimedOut(true);
                }
              }}
              style={styles.permissionRetryBtn}
            >
              <Text style={styles.permissionRetryText}>Retry</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color="#FFFFFF" />
        )}
      </View>
    );
  }

  if (draft) {
    const previewOverlay = draft.mediaType === 'text' ? null : currentOverlay;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" hidden />
        {draft.mediaType === 'image' && draft.uri ? (
          <Image source={{ uri: draft.uri }} style={styles.previewMedia} contentFit="cover" />
        ) : draft.mediaType === 'video' && draft.uri ? (
          <StoryVideoPreview key={draft.uri} uri={draft.uri} />
        ) : (
          <View style={[styles.previewMedia, { backgroundColor: textBackground.colors[0] }]}>
            <TextInput
              value={storyText}
              onChangeText={setStoryText}
              placeholder="Write your story"
              placeholderTextColor="rgba(255,255,255,0.65)"
              multiline
              maxLength={500}
              style={styles.textStoryInput}
              textAlign="center"
            />
          </View>
        )}

        {renderTextOverlay(previewOverlay)}

        <SafeAreaView
          edges={['left', 'right']}
          style={[
            styles.previewSafeArea,
            { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.previewHeader}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleLeaveStory} disabled={isPublishing}>
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.previewHeaderActions}>
              <TouchableOpacity
                style={[styles.discardBtn, isPublishing && styles.disabledBtn]}
                onPress={handleDiscardDraft}
                disabled={isPublishing}
              >
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postBtn, isPublishing && styles.disabledBtn]}
                onPress={publishDraft}
                disabled={isPublishing}
              >
                {isPublishing ? <ActivityIndicator color="#111827" /> : <Text style={styles.postBtnText}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {draft.mediaType !== 'text' ? (
            <View style={styles.overlayEditor}>
              <TextInput
                value={overlayText}
                onChangeText={setOverlayText}
                placeholder="Add text"
                placeholderTextColor="rgba(255,255,255,0.65)"
                maxLength={160}
                style={styles.overlayInput}
              />
              <View style={styles.editorRow}>
                {TEXT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorDot, { backgroundColor: color }, overlayColor === color && styles.selectedDot]}
                    onPress={() => setOverlayColor(color)}
                  />
                ))}
              </View>
              <View style={styles.editorRow}>
                {OVERLAY_POSITIONS.map((position) => (
                  <TouchableOpacity
                    key={position.label}
                    style={[styles.optionPill, overlayY === position.y && styles.selectedPill]}
                    onPress={() => setOverlayY(position.y)}
                  >
                    <Text style={styles.optionPillText}>{position.label}</Text>
                  </TouchableOpacity>
                ))}
                {OVERLAY_SCALES.map((scale) => (
                  <TouchableOpacity
                    key={scale.label}
                    style={[styles.optionPill, overlayScale === scale.value && styles.selectedPill]}
                    onPress={() => setOverlayScale(scale.value)}
                  >
                    <Text style={styles.optionPillText}>{scale.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.overlayEditor}>
              <View style={styles.editorRow}>
                {TEXT_BACKGROUNDS.map((background) => (
                  <TouchableOpacity
                    key={background.colors.join('-')}
                    style={[
                      styles.backgroundSwatch,
                      { backgroundColor: background.colors[0] },
                      textBackground.colors[0] === background.colors[0] && styles.selectedSwatch,
                    ]}
                    onPress={() => setTextBackground(background)}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.publishStatus}>
            {isPublishing ? (
              <Text style={styles.publishStatusText}>
                {publishStage || 'Publishing story...'}{uploadProgress > 0 && uploadProgress < 1 ? ` ${Math.round(uploadProgress * 100)}%` : ''}
              </Text>
            ) : null}
          </View>
        </SafeAreaView>

        {isPublishing ? (
          <View
            style={[
              styles.uploadOverlay,
              { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) },
            ]}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.uploadOverlayText}>
              {publishStage || 'Publishing story...'}{uploadProgress > 0 && uploadProgress < 1 ? ` ${Math.round(uploadProgress * 100)}%` : ''}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  const cameraUnavailable = !cameraPermission?.granted;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" hidden />

      {cameraUnavailable ? (
        <View style={styles.cameraStatusOverlay}>
          <Feather name="camera-off" size={44} color="#FFFFFF" />
          <Text style={styles.cameraStatusText}>Camera access is needed to capture stories.</Text>
          <TouchableOpacity
            disabled={isRequestingPermissions}
            style={styles.cameraRetryBtn}
            onPress={async () => {
              const granted = await requestCameraPermission();
              if (!granted && !cameraPermission?.canAskAgain) {
                await Linking.openSettings();
              }
            }}
          >
            <Text style={styles.cameraRetryText}>{isRequestingPermissions ? 'Requesting...' : 'Grant camera access'}</Text>
          </TouchableOpacity>
        </View>
      ) : isFocused && !isSwitchingCameraMode ? (
        <CameraView
          key={`${cameraInstanceKey}-${cameraMode}-${cameraFacing}`}
          ref={cameraRef}
          active={isFocused && !isPreviewing}
          style={styles.cameraBackground}
          facing={cameraFacing}
          mode={cameraMode === 'video' ? 'video' : 'picture'}
          videoQuality="720p"
          videoBitrate={STORY_VIDEO_BITRATE}
          pictureSize={cameraMode === 'image' ? cameraPictureSize : undefined}
          onCameraReady={() => {
            cameraRecoveryAttemptedRef.current = false;
            setCameraError(null);
            if (cameraMode === 'image' && !cameraPictureSize) {
              const mark = createStoryTiming('camera-picture-size');
              void cameraRef.current?.getAvailablePictureSizesAsync()
                .then((sizes) => {
                  const selectedSize = selectStoryPictureSize(sizes);
                  mark('available sizes', { count: sizes.length, selectedSize });
                  if (selectedSize) {
                    setCameraPictureSize(selectedSize);
                  }
                })
                .catch((error) => mark('available sizes failed', { message: getAuthErrorMessage(error, 'Unable to read sizes.') }))
                .finally(() => setIsCameraReady(true));
              return;
            }

            setIsCameraReady(true);
          }}
          onMountError={({ message }) => {
            setIsCameraReady(false);
            setCameraError(message || 'The camera could not start.');
          }}
        />
      ) : null}

      {!cameraUnavailable && !isCameraReady && (
        <View style={styles.cameraStatusOverlay} pointerEvents={cameraError ? 'auto' : 'none'}>
          {cameraError ? (
            <>
              <Feather name="camera-off" size={44} color="#FFFFFF" />
              <Text style={styles.cameraStatusText}>{cameraError}</Text>
              <TouchableOpacity
                style={styles.cameraRetryBtn}
                onPress={() => {
                  cameraRecoveryAttemptedRef.current = false;
                  setCameraError(null);
                  setIsCameraReady(false);
                  setCameraInstanceKey((key) => key + 1);
                }}
              >
                <Text style={styles.cameraRetryText}>Retry camera</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ActivityIndicator size="large" color="#FFFFFF" />
          )}
        </View>
      )}

      <View style={styles.topGradient} />

      <SafeAreaView
        edges={['left', 'right']}
        style={[styles.safeArea, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <View style={styles.header}>
          <BackButton onPress={handleLeaveStory} />
          {cameraMode === 'video' ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>{`${Math.floor(elapsedMs / 1000)}s`}</Text>
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
          ) : <Text style={styles.headerTitle}>Story</Text>}
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.rightActionsCol}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.8}
            disabled={isPublishing || isRecording || isSwitchingCameraMode}
            accessibilityLabel="Switch camera"
            onPress={handleSwitchCameraFacing}
          >
            <Feather name="refresh-cw" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handlePickImage} disabled={isPublishing || isRecording}>
            <Feather name="image" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handlePickVideo} disabled={isPublishing || isRecording}>
            <Feather name="film" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handleCreateTextDraft} disabled={isPublishing || isRecording}>
            <Feather name="type" size={23} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.bottomControls, { bottom: Math.max(insets.bottom + 20, 32) }]}>
          <View style={styles.modeRow}>
            {(['image', 'video'] as CameraMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modePill, cameraMode === mode && styles.modePillActive]}
                onPress={() => void handleCameraModeChange(mode)}
                disabled={isSwitchingCameraMode}
              >
                <Text style={styles.modePillText}>{mode === 'image' ? 'Photo' : 'Video'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.captureBtnOuter, isRecording && styles.captureBtnOuterRecording]}
            onPress={cameraMode === 'video' ? handleRecordVideo : handleCaptureImage}
            activeOpacity={0.9}
            disabled={isPublishing || cameraUnavailable || !isCameraReady}
          >
            <View style={[styles.captureBtnInner, cameraMode === 'image' && styles.captureBtnInnerPhoto, isRecording && styles.captureBtnInnerRecording]} />
          </TouchableOpacity>
          <Text style={styles.helperText}>
            {isPublishing
              ? (publishStage || 'Publishing story...')
              : isRecording
              ? 'Tap to stop'
              : cameraMode === 'video'
              ? 'Record up to 15 seconds'
              : 'Tap to capture photo'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000000',
  },
  permissionText: { textAlign: 'center', marginBottom: 20, fontSize: 16 },
  permissionLoadText: { color: '#FFFFFF', marginTop: 16 },
  permissionRetryBtn: { borderRadius: 8, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10 },
  permissionRetryText: { color: '#000000', fontWeight: '700' },
  cameraBackground: { ...StyleSheet.absoluteFillObject },
  cameraStatusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#000000',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cameraStatusText: { color: '#FFFFFF', fontSize: 15, marginTop: 16, textAlign: 'center' },
  cameraRetryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cameraRetryText: { color: '#000000', fontWeight: '700' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10 },
  headerTitle: { color: '#FFFFFF', flex: 1, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  progressContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 16 },
  progressText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginHorizontal: 8,
  },
  progressBarFill: { height: '100%', borderRadius: 2 },
  rightActionsCol: { position: 'absolute', right: 16, top: 100, alignItems: 'center' },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  bottomControls: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modePill: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  modePillActive: { backgroundColor: 'rgba(255,255,255,0.24)' },
  modePillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  helperText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginTop: 14 },
  captureBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnOuterRecording: { borderColor: 'rgba(242, 36, 92, 0.5)' },
  captureBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  captureBtnInnerPhoto: { backgroundColor: '#E5F6FF' },
  captureBtnInnerRecording: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F2245C' },
  previewMedia: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  previewSafeArea: { flex: 1, justifyContent: 'space-between' },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  previewHeaderActions: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  postBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    minWidth: 76,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  postBtnText: { color: '#111827', fontSize: 14, fontWeight: '800' },
  discardBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  discardBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabledBtn: { opacity: 0.7 },
  overlayTextWrap: { position: 'absolute', width: 280, alignItems: 'center' },
  overlayText: {
    fontSize: 30,
    lineHeight: 36,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  overlayEditor: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 34,
    padding: 12,
  },
  overlayInput: {
    color: '#FFFFFF',
    borderBottomColor: 'rgba(255,255,255,0.25)',
    borderBottomWidth: 1,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 38,
  },
  editorRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  colorDot: { borderRadius: 14, height: 28, width: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  selectedDot: { borderColor: '#FFFFFF' },
  optionPill: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  selectedPill: { backgroundColor: 'rgba(255,255,255,0.34)' },
  optionPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  backgroundSwatch: { height: 32, width: 54, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  selectedSwatch: { borderColor: '#FFFFFF' },
  textStoryInput: {
    alignSelf: 'center',
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    maxHeight: '60%',
    paddingHorizontal: 24,
    position: 'absolute',
    textAlignVertical: 'center',
    top: '32%',
    width: '100%',
  },
  publishStatus: { minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  publishStatusText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.56)',
    justifyContent: 'center',
    zIndex: 20,
  },
  uploadOverlayText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginTop: 14 },
});

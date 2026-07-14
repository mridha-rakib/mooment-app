import AudiencePickerModal from '@/components/post/AudiencePickerModal';
import EventPickerModal from '@/components/post/EventPickerModal';
import PeopleTagModal from '@/components/post/PeopleTagModal';
import {
  Feather } from '@expo/vector-icons';
import { AddTeamIcon,
  Image01Icon,
  MusicNote04Icon,
  Video02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurView } from 'expo-blur';
import { CameraView,
  useCameraPermissions,
  useMicrophonePermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  AudioModule,
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioStatus,
} from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView,
  useVideoPlayer } from 'expo-video';
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import UserAvatar from '@/components/ui/UserAvatar';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { safeBack } from '@/lib/navigation';
import { createMoment, setPendingNewMoment } from '@/lib/moments';
import type { MomentAudience, MomentMediaItem, MomentMediaSource } from '@/lib/moments';
import { getStorageFileUrl, uploadFileToStorage } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';
import { useBottomSheetDragDismiss } from '@/components/ui/useBottomSheetDragDismiss';

import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
const { width } = Dimensions.get('window');

const FALLBACK_AUTHOR_NAME = 'Mooment User';
const MAX_MEDIA_ITEMS = 10;
const CREATE_MOMENT_COLORS = {
  background: '#0E0D12',
  text: '#FFFFFF',
  bodyText: '#B3B3B3',
  muted: '#8E8E9B',
  primary: '#B2ABBA',
  primaryText: '#111111',
  surface: 'rgba(104,104,104,0.10)',
  surfaceBorder: 'rgba(255,255,255,0.10)',
};

type SelectedMediaType = 'image' | 'video' | 'audio';
type SelectedImageItem = {
  id: string;
  uri: string;
  source: MomentMediaSource;
  contentType: string;
  name?: string | null;
};

const normalizeAudience = (value: string): MomentAudience => {
  if (value === 'Friends') {
    return 'friends';
  }

  if (value === 'Only Me') {
    return 'only_me';
  }

  return 'public';
};

const isRemoteUri = (uri: string) => /^https?:\/\//i.test(uri);

const getMediaContentType = (uri: string, mediaType: SelectedMediaType, providedContentType?: string | null) => {
  if (providedContentType) {
    return providedContentType;
  }

  if (mediaType === 'audio') {
    const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();

    if (normalizedUri.endsWith(".m4a") || normalizedUri.endsWith(".mp4")) {
      return "audio/mp4";
    }

    if (normalizedUri.endsWith(".aac")) {
      return "audio/aac";
    }

    if (normalizedUri.endsWith(".wav")) {
      return "audio/wav";
    }

    if (normalizedUri.endsWith(".webm")) {
      return "audio/webm";
    }

    if (normalizedUri.endsWith(".3gp")) {
      return "audio/3gpp";
    }

    return 'audio/mpeg';
  }

  if (mediaType === 'video') {
    const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();

    if (normalizedUri.endsWith(".mov")) {
      return "video/quicktime";
    }

    if (normalizedUri.endsWith(".m4v")) {
      return "video/x-m4v";
    }

    if (normalizedUri.endsWith(".webm")) {
      return "video/webm";
    }

    if (normalizedUri.endsWith(".3gp")) {
      return "video/3gpp";
    }

    return 'video/mp4';
  }

  const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();

  if (normalizedUri.endsWith(".png")) {
    return "image/png";
  }

  return "image/jpeg";
};

const getMediaExtension = (contentType: string) => {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "video/mp4") {
    return "mp4";
  }

  if (contentType === "video/quicktime") {
    return "mov";
  }

  if (contentType === "video/webm") {
    return "webm";
  }

  if (contentType === "video/3gpp") {
    return "3gp";
  }

  if (contentType.startsWith("video/")) {
    return contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "video";
  }

  if (contentType === "audio/mp4" || contentType === "audio/x-m4a" || contentType === "audio/aac") {
    return "m4a";
  }

  if (contentType === "audio/webm") {
    return "webm";
  }

  if (contentType === "audio/wav" || contentType === "audio/x-wav") {
    return "wav";
  }

  if (contentType === "audio/3gpp") {
    return "3gp";
  }

  if (contentType === "audio/mpeg") {
    return "mp3";
  }

  if (contentType === "audio/ogg") {
    return "ogg";
  }

  if (contentType.startsWith("audio/")) {
    return contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "audio";
  }

  return "jpg";
};

function VideoPreview({ uri, style }: { uri: string; style: object }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  return (
    <VideoView
      player={player}
      style={style}
      nativeControls={false}
      contentFit="cover"
    />
  );
}

// ── Camera Sheet ──────────────────────────────────────────────────────────
function CameraSheet({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string, contentType: string, name: string) => void;
}) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  if (!permission) return null;

  const capturePhoto = async () => {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.75,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        Alert.alert('Camera', 'No photo was captured. Please try again.');
        return;
      }

      onCapture(photo.uri, 'image/jpeg', `Photo ${Date.now()}.jpg`);
      onClose();
    } catch (error) {
      Alert.alert('Camera failed', getAuthErrorMessage(error, 'Please try taking the photo again.'));
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[camStyles.root, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" />
        {permission.granted ? (
          <CameraView ref={cameraRef} style={camStyles.camera} facing="back">
            {/* Header */}
            <SafeAreaView style={camStyles.header}>
              <TouchableOpacity onPress={onClose} style={camStyles.closeBtn} activeOpacity={0.8}>
                <Feather name="x" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </SafeAreaView>
            {/* Capture button */}
            <View style={camStyles.captureRow}>
              <TouchableOpacity
                style={[camStyles.captureOuter, isCapturing && camStyles.captureOuterDisabled]}
                activeOpacity={0.9}
                onPress={capturePhoto}
                disabled={isCapturing}
              >
                <View style={camStyles.captureInner} />
              </TouchableOpacity>
            </View>
          </CameraView>
        ) : (
          <View style={[camStyles.permissionView, { backgroundColor: colors.background }]}>
            <Feather name="camera-off" size={48} color={colors.textSecondary} />
            <Text style={[camStyles.permissionText, { color: colors.textSecondary }]}>Camera access needed</Text>
            <TouchableOpacity style={[camStyles.permissionBtn, { backgroundColor: buttonBackground(colors) }]} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={[camStyles.permissionBtnText, { color: buttonForeground(colors) }]}>Allow Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

function VideoPickerSheet({
  visible,
  onClose,
  onRecordVideo,
  onPickVideo,
}: {
  visible: boolean;
  onClose: () => void;
  onRecordVideo: () => void;
  onPickVideo: () => void;
}) {
  const { sheetTranslateY, dragPanHandlers } = useBottomSheetDragDismiss({
    visible,
    onClose,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={videoPickerStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[videoPickerStyles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View {...dragPanHandlers}>
            <View style={videoPickerStyles.handle} />
            <View style={videoPickerStyles.header}>
              <View>
                <Text style={videoPickerStyles.title}>Video</Text>
                <Text style={videoPickerStyles.subtitle}>Record live or upload a saved video</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={videoPickerStyles.optionButton} activeOpacity={0.86} onPress={onRecordVideo}>
            <View style={videoPickerStyles.optionIcon}>
              <Feather name="video" size={20} color={CREATE_MOMENT_COLORS.primary} />
            </View>
            <View style={videoPickerStyles.optionCopy}>
              <Text style={videoPickerStyles.optionTitle}>Record with camera</Text>
              <Text style={videoPickerStyles.optionMeta}>Use the live camera and microphone</Text>
            </View>
            <Feather name="chevron-right" size={20} color={CREATE_MOMENT_COLORS.bodyText} />
          </TouchableOpacity>

          <TouchableOpacity style={videoPickerStyles.optionButton} activeOpacity={0.86} onPress={onPickVideo}>
            <View style={videoPickerStyles.optionIcon}>
              <Feather name="folder" size={20} color={CREATE_MOMENT_COLORS.primary} />
            </View>
            <View style={videoPickerStyles.optionCopy}>
              <Text style={videoPickerStyles.optionTitle}>Choose video file</Text>
              <Text style={videoPickerStyles.optionMeta}>Select a recorded video from this device</Text>
            </View>
            <Feather name="chevron-right" size={20} color={CREATE_MOMENT_COLORS.bodyText} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function VideoCameraSheet({
  visible,
  onClose,
  onRecorded,
}: {
  visible: boolean;
  onClose: () => void;
  onRecorded: (uri: string, contentType: string, name: string, durationSeconds?: number | null) => void;
}) {
  const { colors } = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const hasPermissions = Boolean(cameraPermission?.granted && microphonePermission?.granted);

  const requestPermissions = async () => {
    const cameraStatus = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    const microphoneStatus = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();

    if (!cameraStatus.granted || !microphoneStatus.granted) {
      Alert.alert('Camera access needed', 'Please allow camera and microphone access to record video.');
    }
  };

  const startRecording = async () => {
    if (isPreparing || isRecording) {
      return;
    }

    if (!hasPermissions) {
      await requestPermissions();
      return;
    }

    setIsPreparing(true);

    try {
      const camera = cameraRef.current;

      if (!camera) {
        Alert.alert('Camera', 'Camera is not ready yet.');
        return;
      }

      setIsRecording(true);
      const recordingPromise = camera.recordAsync({
        maxDuration: 120,
        maxFileSize: 250 * 1024 * 1024,
      });
      recordingPromiseRef.current = recordingPromise;

      recordingPromise
        .then((video) => {
          if (video?.uri) {
            onRecorded(video.uri, 'video/mp4', `Video ${Date.now()}.mp4`);
            onClose();
          }
        })
        .catch((error) => {
          Alert.alert('Video recording failed', getAuthErrorMessage(error, 'Please try recording again.'));
        })
        .finally(() => {
          recordingPromiseRef.current = null;
          setIsRecording(false);
        });
    } catch (error) {
      setIsRecording(false);
      Alert.alert('Video recording failed', getAuthErrorMessage(error, 'Please try recording again.'));
    } finally {
      setIsPreparing(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) {
      return;
    }

    try {
      cameraRef.current?.stopRecording();
      await recordingPromiseRef.current;
    } catch (error) {
      Alert.alert('Video recording failed', getAuthErrorMessage(error, 'Please try stopping the recording again.'));
    }
  };

  const closeCamera = async () => {
    if (isRecording) {
      try {
        cameraRef.current?.stopRecording();
        await recordingPromiseRef.current;
      } catch {
        recordingPromiseRef.current = null;
        setIsRecording(false);
      }
      return;
    }

    onClose();
  };

  if (!cameraPermission || !microphonePermission) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={camStyles.root}>
        <StatusBar barStyle="light-content" />
        {hasPermissions ? (
          <CameraView
            ref={cameraRef}
            style={camStyles.camera}
            facing="back"
            mode="video"
            mute={false}
            videoQuality="720p"
          >
            <SafeAreaView style={camStyles.header}>
              <TouchableOpacity onPress={closeCamera} style={camStyles.closeBtn} activeOpacity={0.8}>
                <Feather name="x" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </SafeAreaView>
            <View style={camStyles.captureRow}>
              <TouchableOpacity
                style={[
                  camStyles.captureOuter,
                  isRecording && camStyles.captureOuterRecording,
                  isPreparing && camStyles.captureOuterDisabled,
                ]}
                activeOpacity={0.9}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isPreparing}
              >
                <View style={[camStyles.captureInner, isRecording && camStyles.videoStopInner]} />
              </TouchableOpacity>
            </View>
          </CameraView>
        ) : (
          <View style={[camStyles.permissionView, { backgroundColor: colors.background }]}>
            <Feather name="video-off" size={48} color={colors.textSecondary} />
            <Text style={[camStyles.permissionText, { color: colors.textSecondary }]}>Camera and microphone access needed</Text>
            <TouchableOpacity style={[camStyles.permissionBtn, { backgroundColor: buttonBackground(colors) }]} onPress={requestPermissions} activeOpacity={0.8}>
              <Text style={[camStyles.permissionBtnText, { color: buttonForeground(colors) }]}>Allow Access</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

function CreateMomentCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.closeButton}>
      <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
        <Rect width={32} height={32} rx={12} fill="#686868" fillOpacity={0.16} />
        <Path
          d="M22 10L10.0008 21.9992M21.9992 22L10 10.0009"
          stroke="#B3B3B3"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

// ── Room Setup Modal ──────────────────────────────────────────────────────
function RoomSetupModal({
  visible,
  onClose,
  onContinue,
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: (name: string, speakers: boolean) => void;
}) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [speakers, setSpeakers] = useState(true);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={rmStyles.overlay}>
        <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={rmStyles.blur}>
          <View style={[rmStyles.container, { backgroundColor: colors.background }]}>
            <Text style={[rmStyles.title, { color: colors.text }]}>Name your Room</Text>

            <View style={[rmStyles.inputWrapper, { backgroundColor: colors.card }]}>
              <TextInput
                style={[rmStyles.input, { color: colors.text }]}
                placeholder="Room name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <TouchableOpacity
              style={[rmStyles.checkboxRow, { backgroundColor: colors.card }]}
              onPress={() => setSpeakers(!speakers)}
              activeOpacity={0.8}
            >
              <View style={rmStyles.checkboxInfo}>
                <Text style={[rmStyles.checkboxTitle, { color: colors.text }]}>Allow all participants to speak</Text>
                <Text style={[rmStyles.checkboxSub, { color: colors.textSecondary }]}>You can always change this in the Live Room</Text>
              </View>
              <View style={[rmStyles.checkbox, { borderColor: colors.border }, speakers && [rmStyles.checkboxActive, { backgroundColor: colors.text, borderColor: colors.text }]]}>
                {speakers && <Feather name="check" size={12} color={colors.background} />}
              </View>
            </TouchableOpacity>

            <View style={rmStyles.footer}>
              <TouchableOpacity style={rmStyles.cancelBtn} onPress={onClose}>
                <Text style={[rmStyles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[rmStyles.continueBtn, { backgroundColor: buttonBackground(colors) }]} 
                onPress={() => onContinue(name, speakers)}
              >
                <Text style={[rmStyles.continueBtnText, { color: buttonForeground(colors) }]}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

// ── QR Details Modal ──────────────────────────────────────────────────────
function QRDetailsModal({
  visible,
  onClose,
  onContinue,
  eventTitle,
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  eventTitle: string;
}) {
  const { colors, isDark } = useTheme();
  React.useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onContinue();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={[qdStyles.overlay, { backgroundColor: colors.background }]}>
        <View style={qdStyles.container}>
          <View style={qdStyles.header}>
            <TouchableOpacity onPress={onClose} style={[qdStyles.backBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <Feather name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[qdStyles.headerTitle, { color: colors.text }]}>QR Code</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[qdStyles.productCard, { backgroundColor: colors.card }]}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1601049541289-9b1b7abc74a4?q=80&w=200' }}
              style={qdStyles.productImg}
            />
            <View style={{ flex: 1 }}>
              <Text style={[qdStyles.productTitle, { color: colors.text }]}>Medusa Skin Whitening Cream</Text>
              <Text style={[qdStyles.productMeta, { color: colors.textSecondary }]}>@df_koko • QTY: 1</Text>
              <Text style={[qdStyles.productPrice, { color: colors.primary }]}>$28</Text>
            </View>
          </View>

          <View style={[qdStyles.venueCard, { backgroundColor: colors.card }]}>
            <View style={qdStyles.venueHeader}>
              <Feather name="map-pin" size={18} color={colors.text} />
              <Text style={[qdStyles.venueTitle, { color: colors.text }]}>New York City</Text>
            </View>
            <View style={qdStyles.venueDetails}>
              <Text style={[qdStyles.venueLabel, { color: colors.textSecondary }]}>Venue: <Text style={[qdStyles.venueValue, { color: colors.text }]}>The Rooftop Lounge</Text></Text>
              <Text style={[qdStyles.venueLabel, { color: colors.textSecondary }]}>Address: <Text style={[qdStyles.venueValue, { color: colors.text }]}>123 Main Street, New York, NY 1001</Text></Text>
              <Text style={[qdStyles.venueLabel, { color: colors.textSecondary }]}>Time: <Text style={[qdStyles.venueValue, { color: colors.text }]}>Tonight • 9pm</Text></Text>
            </View>
          </View>

          <View style={qdStyles.orderRow}>
            <Text style={[qdStyles.orderText, { color: colors.textSecondary }]}>Order No: <Text style={[qdStyles.orderId, { color: colors.text }]}>MOM-2026-8741</Text></Text>
            <Feather name="check-circle" size={18} color={colors.primary} />
          </View>

          <View style={qdStyles.qrContainer}>
            <Image
              source={{ uri: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MOM-2026-8741' }}
              style={qdStyles.qrImage}
            />
          </View>

          <View style={[qdStyles.statusBanner, { backgroundColor: isDark ? 'rgba(22,216,105,0.06)' : 'rgba(22,216,105,0.1)' }]}>
            <Feather name="check" size={16} color="#16D869" />
            <Text style={[qdStyles.statusMsg, { color: colors.textSecondary }]}>Your Product has been handover to you in the venue. Thank you for buying from us.</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const camStyles = StyleSheet.create({
  root: { flex: 1 },
  camera: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  captureRow: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
  captureOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center' },
  captureOuterDisabled: { opacity: 0.45 },
  captureOuterRecording: { borderColor: '#F2245C' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF' },
  videoStopInner: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F2245C' },
  permissionView: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  permissionText: { fontSize: 16, textAlign: 'center' },
  permissionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  permissionBtnText: { fontWeight: 'bold', fontSize: 14 },
});

const videoPickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    backgroundColor: CREATE_MOMENT_COLORS.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 22,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: CREATE_MOMENT_COLORS.bodyText,
    fontSize: 13,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREATE_MOMENT_COLORS.surface,
  },
  optionButton: {
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CREATE_MOMENT_COLORS.surfaceBorder,
    backgroundColor: CREATE_MOMENT_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(178,171,186,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  optionMeta: {
    color: CREATE_MOMENT_COLORS.bodyText,
    fontSize: 12,
    marginTop: 4,
  },
});

const formatAudioDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatAudioSeconds = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  return formatAudioDuration(seconds * 1000);
};

const getAudioPreviewDuration = (status: AudioStatus, fallbackSeconds?: number | null) => {
  if (status.duration > 0 && Number.isFinite(status.duration)) {
    return status.duration;
  }

  if (fallbackSeconds != null && Number.isFinite(fallbackSeconds) && fallbackSeconds > 0) {
    return fallbackSeconds;
  }

  return 0;
};

const formatAudioPreviewTime = (status: AudioStatus, fallbackSeconds?: number | null) => {
  const duration = getAudioPreviewDuration(status, fallbackSeconds);

  if (duration <= 0) {
    return '0:00';
  }

  const currentTime = status.currentTime > 0 && Number.isFinite(status.currentTime)
    ? Math.min(status.currentTime, duration)
    : 0;

  if (status.playing || currentTime > 0) {
    return `${formatAudioSeconds(currentTime)} / ${formatAudioSeconds(duration)}`;
  }

  return formatAudioSeconds(duration);
};

const RECORDING_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'doNotMix' as const,
};

const PLAYBACK_AUDIO_MODE = {
  allowsRecording: false,
  playsInSilentMode: true,
  shouldRouteThroughEarpiece: false,
  interruptionMode: 'doNotMix' as const,
};

type RuntimeAudioRecorder = {
  uri?: string | null;
  getStatus?: () => { durationMillis?: number; isRecording?: boolean; url?: string | null };
  prepareToRecordAsync: () => Promise<void>;
  record: () => void;
  stop: () => Promise<{ durationMillis?: number; url?: string | null } | void>;
  remove?: () => void;
};

type RuntimeAudioRecordingPreset = {
  extension: string;
  sampleRate: number;
  numberOfChannels: number;
  bitRate: number;
  isMeteringEnabled?: boolean;
  android?: Record<string, unknown>;
  ios?: Record<string, unknown>;
  web?: Record<string, unknown>;
};

const getNativeRecordingOptions = (preset: RuntimeAudioRecordingPreset) => {
  const commonOptions = {
    extension: preset.extension,
    sampleRate: preset.sampleRate,
    numberOfChannels: preset.numberOfChannels,
    bitRate: preset.bitRate,
    isMeteringEnabled: preset.isMeteringEnabled ?? false,
  };

  if (Platform.OS === 'android') {
    return {
      ...commonOptions,
      ...preset.android,
    };
  }

  if (Platform.OS === 'ios') {
    return {
      ...commonOptions,
      ...preset.ios,
    };
  }

  return {
    ...commonOptions,
    ...preset.web,
  };
};

const showAudioRebuildAlert = () => {
  Alert.alert(
    'Recording unavailable',
    'Audio recording requires a rebuilt development client that includes expo-audio. You can still choose an audio file.',
  );
};

const AUDIO_SHEET_ANDROID_BOTTOM_GAP = 12;

const validateReadableFile = async (uri: string) => {
  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists || typeof fileInfo.size !== 'number' || fileInfo.size <= 0) {
    throw new Error('The audio file was empty.');
  }

  return fileInfo.size;
};

function AudioPickerSheet({
  visible,
  onClose,
  onPickAudio,
  onRecorded,
  previewUri,
  previewTitle,
  previewStatus,
  previewDurationSeconds,
  isPreviewBusy,
  onTogglePreview,
  onStopPreview,
}: {
  visible: boolean;
  onClose: () => void;
  onPickAudio: () => void;
  onRecorded: (uri: string, contentType: string, name: string, durationSeconds?: number | null) => void;
  previewUri?: string | null;
  previewTitle?: string | null;
  previewStatus: AudioStatus;
  previewDurationSeconds?: number | null;
  isPreviewBusy: boolean;
  onTogglePreview: () => Promise<void>;
  onStopPreview: () => void;
}) {
  const insets = useSafeAreaInsets();
  const recorderRef = useRef<RuntimeAudioRecorder | null>(null);
  const preparedRecorderRef = useRef<RuntimeAudioRecorder | null>(null);
  const preparePromiseRef = useRef<Promise<RuntimeAudioRecorder | null> | null>(null);
  const mountedRef = useRef(true);
  const sheetSessionRef = useRef(0);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const stopPromiseRef = useRef<Promise<{ uri: string | null; durationMillis: number } | null> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [isStoppingRecording, setIsStoppingRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDurationMillis, setRecordingDurationMillis] = useState(0);
  const hasPreview = Boolean(previewUri) && !isRecording;
  const isPreviewPlaying = hasPreview && previewStatus.playing;
  const audioSheetState = isStoppingRecording
    ? 'stopping'
    : isRecording
      ? 'recording'
      : isPreparingRecording
        ? 'warming'
        : hasPreview
          ? isPreviewPlaying
            ? 'playing'
            : 'ready'
          : 'idle';
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, 22) + AUDIO_SHEET_ANDROID_BOTTOM_GAP
    : Math.max(insets.bottom, 32);

  const releasePreparedRecorder = useCallback(() => {
    const recorder = preparedRecorderRef.current;
    preparedRecorderRef.current = null;

    try {
      recorder?.remove?.();
    } catch {
      // Best-effort native cleanup only.
    }
  }, []);

  const prepareRecorder = useCallback(async (showWaitState = false) => {
    if (preparedRecorderRef.current) {
      return preparedRecorderRef.current;
    }

    if (preparePromiseRef.current) {
      return preparePromiseRef.current;
    }

    if (showWaitState && mountedRef.current) {
      setIsPreparingRecording(true);
    }

    const preparePromise = (async () => {
      await setAudioModeAsync(RECORDING_AUDIO_MODE);

      const NativeAudioRecorder = (
        AudioModule as unknown as { AudioRecorder?: new (options: Record<string, unknown>) => RuntimeAudioRecorder }
      ).AudioRecorder;

      if (!NativeAudioRecorder) {
        await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
        showAudioRebuildAlert();
        return null;
      }

      const recorder = new NativeAudioRecorder(
        getNativeRecordingOptions(RecordingPresets.HIGH_QUALITY as RuntimeAudioRecordingPreset),
      ) as RuntimeAudioRecorder;

      await recorder.prepareToRecordAsync();

      if (!mountedRef.current) {
        try {
          recorder.remove?.();
        } catch {
          // The recorder may already be released by native teardown.
        }
        return null;
      }

      preparedRecorderRef.current = recorder;
      return recorder;
    })().catch(async (error) => {
      releasePreparedRecorder();

      try {
        await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      } catch {
        // Best-effort reset after a failed warm-up.
      }

      throw error;
    }).finally(() => {
      preparePromiseRef.current = null;

      if (showWaitState && mountedRef.current) {
        setIsPreparingRecording(false);
      }
    });

    preparePromiseRef.current = preparePromise;
    return preparePromise;
  }, [releasePreparedRecorder]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sheetSessionRef.current += 1;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      releasePreparedRecorder();
      recordingStartedAtRef.current = null;
      void recorder?.stop().catch(() => undefined);
      void setAudioModeAsync(PLAYBACK_AUDIO_MODE).catch(() => undefined);
    };
  }, [releasePreparedRecorder]);

  useEffect(() => {
    if (!visible || previewUri) {
      return;
    }

    const sessionId = sheetSessionRef.current + 1;
    sheetSessionRef.current = sessionId;
    let isCancelled = false;

    void (async () => {
      try {
        const permission = await getRecordingPermissionsAsync();

        if (isCancelled || sessionId !== sheetSessionRef.current || !permission.granted) {
          return;
        }

        await prepareRecorder(false);

        if (isCancelled || sessionId !== sheetSessionRef.current) {
          releasePreparedRecorder();
        }
      } catch {
        releasePreparedRecorder();
      }
    })();

    return () => {
      isCancelled = true;
      sheetSessionRef.current += 1;
    };
  }, [prepareRecorder, previewUri, releasePreparedRecorder, visible]);

  useEffect(() => {
    if (visible) {
      return;
    }

    releasePreparedRecorder();
  }, [releasePreparedRecorder, visible]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = setInterval(() => {
      const status = recorderRef.current?.getStatus?.();
      const nextDuration = status?.durationMillis
        ?? (recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0);
      setRecordingDurationMillis((current) => (
        Math.floor(current / 1000) === Math.floor(nextDuration / 1000)
          ? current
          : nextDuration
      ));
    }, 250);

    return () => clearInterval(interval);
  }, [isRecording]);

  const stopNativeRecorder = async () => {
    if (stopPromiseRef.current) {
      return stopPromiseRef.current;
    }

    const recorder = recorderRef.current;

    if (!recorder) {
      return null;
    }

    if (mountedRef.current) {
      setIsStoppingRecording(true);
    }

    const stopPromise = (async () => {
      let stopError: unknown = null;
      let finalStatus: { durationMillis?: number; url?: string | null } | undefined;
      const fallbackStatus = recorder.getStatus?.();
      const fallbackUri = recorder.uri ?? fallbackStatus?.url ?? null;
      const fallbackDurationMillis = fallbackStatus?.durationMillis
        ?? (recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : recordingDurationMillis);

      try {
        const stopResult = await recorder.stop();
        finalStatus = stopResult && typeof stopResult === 'object' ? stopResult : undefined;
      } catch (error) {
        stopError = error;
      }

      const uri = finalStatus?.url ?? recorder.uri ?? fallbackUri;
      const durationMillis = finalStatus?.durationMillis ?? fallbackDurationMillis;

      try {
        await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      } catch {
        // The native audio module may already be unavailable while tearing down.
      }

      recorderRef.current = null;
      recordingStartedAtRef.current = null;

      if (mountedRef.current) {
        setIsRecording(false);
        setIsStoppingRecording(false);
      }

      if (stopError) {
        throw stopError;
      }

      return {
        uri,
        durationMillis,
      };
    })().finally(() => {
      stopPromiseRef.current = null;
      if (mountedRef.current) {
        setIsStoppingRecording(false);
      }
    });

    stopPromiseRef.current = stopPromise;
    return stopPromise;
  };

  const startRecording = async () => {
    if (
      startPromiseRef.current
      || stopPromiseRef.current
      || isPreparingRecording
      || isRecording
      || isPreviewPlaying
      || isPreviewBusy
    ) {
      return;
    }

    setIsPreparingRecording(true);

    const startPromise = (async () => {
      onStopPreview();

      const currentPermission = await getRecordingPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Microphone access needed', 'Please allow microphone access to record audio.');
        return;
      }

      const recorder = await prepareRecorder(false);

      if (!recorder) {
        return;
      }

      preparedRecorderRef.current = null;
      recorder.record();
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();

      if (mountedRef.current) {
        setRecordingDurationMillis(0);
        setIsRecording(true);
      }
    })();

    startPromiseRef.current = startPromise;

    try {
      await startPromise;
    } catch (error) {
      try {
        await setAudioModeAsync(PLAYBACK_AUDIO_MODE);
      } catch {
        // Best-effort reset after a failed recording attempt.
      }

      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try recording again.'));
    } finally {
      startPromiseRef.current = null;
      if (mountedRef.current) {
        setIsPreparingRecording(false);
      }
    }
  };

  const stopRecording = async () => {
    if (!isRecording || isStoppingRecording) {
      return;
    }

    try {
      const recording = await stopNativeRecorder();
      const uri = recording?.uri;

      if (!uri) {
        Alert.alert('Recording failed', 'No recorded audio file was created.');
        return;
      }

      if (!recording.durationMillis || recording.durationMillis <= 0) {
        Alert.alert('Recording failed', 'The recorded audio was too short. Please try recording again.');
        return;
      }

      await validateReadableFile(uri);

      onRecorded(
        uri,
        'audio/mp4',
        `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        recording.durationMillis ? recording.durationMillis / 1000 : null,
      );
    } catch (error) {
      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try stopping the recording again.'));
    }
  };

  const closeSheet = async () => {
    if (isRecording || stopPromiseRef.current) {
      try {
        await stopNativeRecorder();
      } catch {
        // Recording may already be stopped by the native module.
        recorderRef.current = null;
        recordingStartedAtRef.current = null;
        if (mountedRef.current) {
          setIsRecording(false);
          setIsStoppingRecording(false);
        }
      }
    }

    releasePreparedRecorder();
    onStopPreview();
    onClose();
  };

  const { sheetTranslateY, dragPanHandlers } = useBottomSheetDragDismiss({
    visible,
    onClose: closeSheet,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={closeSheet}>
      <View style={audioStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeSheet} disabled={isStoppingRecording} />
        <Animated.View style={[audioStyles.sheet, { paddingBottom: bottomInset, transform: [{ translateY: sheetTranslateY }] }]}>
          <View {...dragPanHandlers}>
            <View style={audioStyles.handle} />
            <View style={audioStyles.header}>
              <View>
                <Text style={audioStyles.title}>Audio</Text>
                <Text style={audioStyles.subtitle}>Record or choose audio for your moment</Text>
              </View>
            </View>
          </View>

          <View style={audioStyles.recordCard}>
            <View style={[audioStyles.recordDot, (audioSheetState === 'recording' || audioSheetState === 'playing') && audioStyles.recordDotActive]} />
            <View style={audioStyles.recordInfo}>
              <Text style={audioStyles.recordTitle} numberOfLines={1}>
                {hasPreview ? (previewTitle ?? 'Audio') : audioSheetState === 'recording' ? 'Recording audio' : 'Ready to record'}
              </Text>
              <Text style={audioStyles.recordTime}>
                {hasPreview
                  ? formatAudioPreviewTime(previewStatus, previewDurationSeconds)
                  : formatAudioDuration(recordingDurationMillis)}
              </Text>
            </View>
            <TouchableOpacity
              style={[audioStyles.recordButton, isRecording && audioStyles.stopButton]}
              activeOpacity={0.85}
              onPress={hasPreview ? onTogglePreview : isRecording ? stopRecording : startRecording}
              disabled={hasPreview
                ? isPreviewBusy || isPreparingRecording || isStoppingRecording || isRecording
                : isPreparingRecording || isStoppingRecording}
            >
              <Feather name={hasPreview ? (isPreviewPlaying ? 'pause' : 'play') : isRecording ? 'square' : 'mic'} size={18} color="#111111" />
              <Text style={audioStyles.recordButtonText}>
                {hasPreview
                  ? isPreviewBusy ? 'Wait' : isPreviewPlaying ? 'Pause' : 'Play'
                  : isRecording ? (isStoppingRecording ? 'Wait' : 'Stop') : isPreparingRecording ? 'Wait' : 'Record'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[audioStyles.pickButton, (isRecording || isStoppingRecording || isPreparingRecording || isPreviewBusy) && audioStyles.pickButtonDisabled]}
            activeOpacity={0.85}
            onPress={onPickAudio}
            disabled={isRecording || isStoppingRecording || isPreparingRecording || isPreviewBusy}
          >
            <Feather name="folder" size={18} color="#FFFFFF" />
            <Text style={audioStyles.pickButtonText}>Choose audio file</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const audioStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  sheet: {
    backgroundColor: CREATE_MOMENT_COLORS.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: CREATE_MOMENT_COLORS.bodyText,
    fontSize: 13,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREATE_MOMENT_COLORS.surface,
  },
  recordCard: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CREATE_MOMENT_COLORS.surfaceBorder,
    backgroundColor: CREATE_MOMENT_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  recordDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: CREATE_MOMENT_COLORS.muted,
    marginRight: 12,
  },
  recordDotActive: {
    backgroundColor: '#F2245C',
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  recordTime: {
    color: CREATE_MOMENT_COLORS.bodyText,
    fontSize: 12,
    marginTop: 4,
  },
  recordButton: {
    minWidth: 96,
    height: 40,
    borderRadius: 12,
    backgroundColor: CREATE_MOMENT_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  stopButton: {
    backgroundColor: '#FFFFFF',
  },
  recordButtonText: {
    color: CREATE_MOMENT_COLORS.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  pickButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CREATE_MOMENT_COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pickButtonDisabled: {
    opacity: 0.45,
  },
  pickButtonText: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────
export default function CreateMomentScreen() {
  const screenColors = CREATE_MOMENT_COLORS;
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; eventName?: string }>();
  const user = useAuthStore((state) => state.user);
  const scrollViewRef = useRef<ScrollView>(null);
  const captionPosition = useRef(0);

  const [caption, setCaption] = useState('');
  const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<SelectedMediaType | null>(null);
  const [selectedMediaSource, setSelectedMediaSource] = useState<MomentMediaSource | null>(null);
  const [selectedMediaContentType, setSelectedMediaContentType] = useState<string | null>(null);
  const [selectedMediaName, setSelectedMediaName] = useState<string | null>(null);
  const [selectedMediaDurationSeconds, setSelectedMediaDurationSeconds] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventCode, setSelectedEventCode] = useState<string | null>(null);

  useEffect(() => {
    if (params.eventId && params.eventName) {
      setSelectedEventId(params.eventId);
      setSelectedEvent(params.eventName);
    }
  }, [params.eventId, params.eventName]);
  const [taggedPeople, setTaggedPeople] = useState<string[]>([]);
  const [audience, setAudience] = useState('Public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isAudioPickerOpeningRef = useRef(false);

  // Modal states
  const [showCamera, setShowCamera] = useState(false);
  const [showVideoPicker, setShowVideoPicker] = useState(false);
  const [showVideoCamera, setShowVideoCamera] = useState(false);
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const authorName = user?.name?.trim() || FALLBACK_AUTHOR_NAME;
  const audioPreviewSource = useMemo(() => (
    selectedMediaType === 'audio' && selectedImage
      ? { uri: selectedImage }
      : null
  ), [selectedImage, selectedMediaType]);
  const audioPreviewPlayer = useAudioPlayer(audioPreviewSource, {
    downloadFirst: false,
    updateInterval: 250,
  });
  const audioPreviewStatus = useAudioPlayerStatus(audioPreviewPlayer);
  const audioPreviewTransitionRef = useRef<Promise<void> | null>(null);
  const screenMountedRef = useRef(true);
  const [isAudioPreviewBusy, setIsAudioPreviewBusy] = useState(false);
  const audioPreviewDurationSeconds = getAudioPreviewDuration(
    audioPreviewStatus,
    selectedMediaDurationSeconds,
  );

  useEffect(() => {
    screenMountedRef.current = true;

    return () => {
      screenMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const player = audioPreviewPlayer;

    return () => {
      try {
        player.pause();
      } catch {
        // The hook releases the native player when the source changes or unmounts.
      }
    };
  }, [audioPreviewPlayer]);

  const stopAudioPreview = useCallback(() => {
    try {
      audioPreviewPlayer.pause();
    } catch {
      // The native player may already be released during source replacement.
    }
  }, [audioPreviewPlayer]);

  const toggleAudioPreview = useCallback(async () => {
    if (audioPreviewTransitionRef.current) {
      return audioPreviewTransitionRef.current;
    }

    const transition = (async () => {
      if (selectedMediaType !== 'audio' || !selectedImage) {
        return;
      }

      if (screenMountedRef.current) {
        setIsAudioPreviewBusy(true);
      }

      await setAudioModeAsync(PLAYBACK_AUDIO_MODE);

      audioPreviewPlayer.muted = false;

      if (!Number.isFinite(audioPreviewPlayer.volume) || audioPreviewPlayer.volume <= 0) {
        audioPreviewPlayer.volume = 1;
      }

      if (audioPreviewStatus.playing) {
        audioPreviewPlayer.pause();
        return;
      }

      const duration = getAudioPreviewDuration(audioPreviewStatus, selectedMediaDurationSeconds);
      const isAtEnd = audioPreviewStatus.didJustFinish
        || (duration > 0 && audioPreviewStatus.currentTime >= duration - 0.25);

      if (isAtEnd) {
        await audioPreviewPlayer.seekTo(0);
      }

      audioPreviewPlayer.play();
    })().catch((error) => {
      if (screenMountedRef.current) {
        Alert.alert('Audio preview failed', getAuthErrorMessage(error, 'Please try playing the audio again.'));
      }
    }).finally(() => {
      audioPreviewTransitionRef.current = null;

      if (screenMountedRef.current) {
        setIsAudioPreviewBusy(false);
      }
    });

    audioPreviewTransitionRef.current = transition;
    return transition;
  }, [
    audioPreviewPlayer,
    audioPreviewStatus,
    selectedImage,
    selectedMediaDurationSeconds,
    selectedMediaType,
  ]);

  useEffect(() => {
    if (!user?.avatarKey) {
      setAuthorAvatar(null);
      return;
    }

    try {
      // The API proxy is reachable from physical devices; direct presigned
      // MinIO URLs may resolve to localhost and fail outside the dev machine.
      setAuthorAvatar(getStorageFileUrl(user.avatarKey));
    } catch {
      setAuthorAvatar(null);
    }
  }, [user?.avatarKey]);

  const handleImageSelect = (
    images: {
      uri: string;
      source?: MomentMediaSource;
      contentType?: string | null;
      name?: string | null;
    }[],
  ) => {
    if (images.length === 0) {
      return;
    }

    stopAudioPreview();

    const existingImageCount = selectedMediaType === 'image' ? selectedImages.length : 0;
    const availableSlots = Math.max(MAX_MEDIA_ITEMS - existingImageCount, 0);

    if (availableSlots === 0) {
      Alert.alert('Image limit reached', `You can attach up to ${MAX_MEDIA_ITEMS} images.`);
      return;
    }

    const nextImages = images.slice(0, availableSlots).map((image) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      uri: image.uri,
      source: image.source ?? 'gallery',
      contentType: getMediaContentType(image.uri, 'image', image.contentType),
      name: image.name ?? null,
    }));

    setSelectedImages((currentImages) => (
      selectedMediaType === 'image'
        ? [...currentImages, ...nextImages]
        : nextImages
    ));
    setSelectedImage(null);
    setSelectedMediaType('image');
    setSelectedMediaSource(null);
    setSelectedMediaContentType(null);
    setSelectedMediaName(null);
    setSelectedMediaDurationSeconds(null);

    if (images.length > availableSlots) {
      Alert.alert('Image limit reached', `Only ${MAX_MEDIA_ITEMS} images can be attached to a moment.`);
    }
  };

  const handleVideoSelect = (
    uri: string,
    source: MomentMediaSource = 'upload',
    contentType?: string | null,
    name?: string | null,
  ) => {
    stopAudioPreview();
    setSelectedImages([]);
    setSelectedImage(uri);
    setSelectedMediaType('video');
    setSelectedMediaSource(source);
    setSelectedMediaContentType(getMediaContentType(uri, 'video', contentType));
    setSelectedMediaName(name ?? 'Video');
    setSelectedMediaDurationSeconds(null);
  };

  const handleAudioSelect = (
    uri: string,
    source: MomentMediaSource = 'upload',
    contentType?: string | null,
    name?: string | null,
    durationSeconds?: number | null,
  ) => {
    stopAudioPreview();
    setSelectedImages([]);
    setSelectedImage(uri);
    setSelectedMediaType('audio');
    setSelectedMediaSource(source);
    setSelectedMediaContentType(getMediaContentType(uri, 'audio', contentType));
    setSelectedMediaName(name ?? 'Audio');
    setSelectedMediaDurationSeconds(durationSeconds ?? null);
  };

  const clearSelectedMedia = () => {
    stopAudioPreview();
    setSelectedImages([]);
    setSelectedImage(null);
    setSelectedMediaType(null);
    setSelectedMediaSource(null);
    setSelectedMediaContentType(null);
    setSelectedMediaName(null);
    setSelectedMediaDurationSeconds(null);
  };

  const removeSelectedImage = (id: string) => {
    const nextImages = selectedImages.filter((image) => image.id !== id);

    setSelectedImages(nextImages);

    if (nextImages.length === 0) {
      clearSelectedMedia();
    }
  };

  const handlePickAudio = async () => {
    if (isAudioPickerOpeningRef.current) {
      return;
    }

    isAudioPickerOpeningRef.current = true;

    try {
      stopAudioPreview();

      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const audio = result.assets[0];
      await validateReadableFile(audio.uri);

      handleAudioSelect(audio.uri, 'upload', audio.mimeType, audio.name);
      setShowAudioPicker(false);
    } catch (error) {
      Alert.alert('Unable to choose audio', getAuthErrorMessage(error, 'Please choose another audio file.'));
    } finally {
      isAudioPickerOpeningRef.current = false;
    }
  };

  const handlePickImage = async () => {
    try {
      const selectedImageCount = selectedMediaType === 'image' ? selectedImages.length : 0;

      if (selectedImageCount >= MAX_MEDIA_ITEMS) {
        Alert.alert('Image limit reached', `You can attach up to ${MAX_MEDIA_ITEMS} images.`);
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Photos access needed', 'Please allow photo library access to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: MAX_MEDIA_ITEMS - selectedImageCount,
        orderedSelection: true,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      handleImageSelect(
        result.assets.map((image) => ({
          uri: image.uri,
          source: 'gallery',
          contentType: image.mimeType,
          name: image.fileName,
        })),
      );
    } catch (error) {
      Alert.alert('Unable to choose image', getAuthErrorMessage(error, 'Please choose another image.'));
    }
  };

  const handlePickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Videos access needed', 'Please allow photo library access to upload a video.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const video = result.assets[0];
      handleVideoSelect(video.uri, 'gallery', video.mimeType, video.fileName);
      setShowVideoPicker(false);
    } catch (error) {
      Alert.alert('Unable to choose video', getAuthErrorMessage(error, 'Please choose another video file.'));
    }
  };

  const buildMediaItem = async ({
    uri,
    type,
    source,
    contentType,
    durationSeconds,
  }: {
    uri: string;
    type: SelectedMediaType;
    source: MomentMediaSource;
    contentType: string;
    durationSeconds?: number | null;
  }): Promise<MomentMediaItem> => {
    const mediaSource = source ?? (isRemoteUri(uri) ? 'external' : 'upload');
    const mediaDurationSeconds = type === 'audio' && durationSeconds != null && Number.isFinite(durationSeconds)
      ? Math.max(0, durationSeconds)
      : null;

    if (isRemoteUri(uri)) {
      return {
        type,
        source: mediaSource,
        url: uri,
        contentType,
        durationSeconds: mediaDurationSeconds,
      };
    }

    const extension = getMediaExtension(contentType);
    const storageKey = await uploadFileToStorage({
      uri,
      key: `moments/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
      contentType,
    });

    return {
      type,
      source: mediaSource,
      storageKey,
      contentType,
      durationSeconds: mediaDurationSeconds,
    };
  };

  const buildMediaItems = async (): Promise<MomentMediaItem[]> => {
    if (selectedMediaType === 'image') {
      return Promise.all(
        selectedImages.map((image) => buildMediaItem({
          uri: image.uri,
          type: 'image',
          source: image.source,
          contentType: image.contentType,
        })),
      );
    }

    if (!selectedImage || !selectedMediaType) {
      return [];
    }

    return [
      await buildMediaItem({
        uri: selectedImage,
        type: selectedMediaType,
        source: selectedMediaSource ?? (isRemoteUri(selectedImage) ? 'external' : 'upload'),
        contentType: getMediaContentType(selectedImage, selectedMediaType, selectedMediaContentType),
        durationSeconds: selectedMediaDurationSeconds,
      }),
    ];
  };

  const scrollToCaption = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(captionPosition.current - 12, 0),
        animated: true,
      });
    }, Platform.OS === 'android' ? 300 : 120);
  };

  const publishMoment = async (eventTitleOverride?: string, eventCodeOverride?: string) => {
    if (isSubmittingRef.current) {
      return false;
    }

    const trimmedCaption = caption.trim();

    if (!trimmedCaption && selectedImages.length === 0 && !selectedImage) {
      Alert.alert('Create Mooment', 'Write a stitch or add media before creating a moment.');
      return false;
    }

    const eventTitle = (eventTitleOverride ?? selectedEvent).trim() || null;
    const eventCode = eventCodeOverride?.trim() || selectedEventCode?.trim() || null;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      stopAudioPreview();
      const mediaItems = await buildMediaItems();

      const newMoment = await createMoment({
        mode: selectedEventId ? 'event' : 'feed',
        caption: trimmedCaption || null,
        audience: normalizeAudience(audience),
        taggedPeople,
        eventTitle,
        eventCode,
        eventId: selectedEventId,
        mediaItems,
      });

      setPendingNewMoment(newMoment);
      return true;
    } catch (error) {
      Alert.alert(
        'Unable to create moment',
        getAuthErrorMessage(error, 'Please check the moment details and try again.'),
      );
      return false;
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDone = async () => {
    const created = await publishMoment();

    if (created) {
      setTimeout(() => {
        safeBack(router, '/(tabs)/home');
      }, 1500);
    }
  };

  const taggedLabel = taggedPeople.join(', ');
  const clearSelectedEvent = () => {
    setSelectedEvent('');
    setSelectedEventId(null);
    setSelectedEventCode(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={screenColors.background} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <CreateMomentCloseButton onPress={() => safeBack(router, '/(tabs)/home')} />
        <Text style={styles.headerTitle}>Create Mooment</Text>
        <TouchableOpacity style={[styles.doneBtn, isSubmitting && styles.doneBtnDisabled]} onPress={handleDone} activeOpacity={0.8} disabled={isSubmitting}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Author Row ── */}
          <View style={styles.authorRow}>
            <View style={styles.avatarRing}>
              <UserAvatar uri={authorAvatar} name={authorName} size={36} style={styles.avatar} />
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorNameFull} numberOfLines={2}>
                <Text style={styles.authorBold}>{authorName}</Text>
                {/* Tagged people visible in both modes */}
                {taggedPeople.length > 0 && (
                  <>
                    <Text style={styles.authorMuted}> with </Text>
                    <Text style={styles.authorBold}>{taggedLabel}</Text>
                  </>
                )}
                {selectedEvent ? (
                  <>
                    <Text style={styles.authorMuted}> at </Text>
                    <Text style={styles.authorBold}>{selectedEvent}</Text>
                  </>
                ) : null}
              </Text>
            </View>

            <View style={styles.eventActions}>
              <TouchableOpacity style={styles.eventPill} onPress={() => setShowEventModal(true)} activeOpacity={0.8}>
                <Feather name="map-pin" size={12} color="#16D869" />
                <Text style={styles.eventPillText} numberOfLines={1} ellipsizeMode="tail">
                  {selectedEvent || 'Tag Event'}
                </Text>
                <Feather name="chevron-down" size={12} color="#16D869" />
              </TouchableOpacity>
              {selectedEvent ? (
                <TouchableOpacity style={styles.eventClearPill} onPress={clearSelectedEvent} activeOpacity={0.8}>
                  <Feather name="x" size={13} color={screenColors.bodyText} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* ── Content Section (Media + Caption) ── */}
          {selectedImages.length > 0 && selectedMediaType === 'image' ? (
            <View style={styles.imageCarousel}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageCarouselContent}
              >
                {selectedImages.map((image, index) => (
                  <View key={image.id} style={styles.imagePreviewCard}>
                    <Image source={{ uri: image.uri }} style={styles.momentImage} resizeMode="cover" />
                    {selectedImages.length > 1 ? (
                      <View style={styles.imageCountBadge}>
                        <Text style={styles.imageCountText}>{index + 1}/{selectedImages.length}</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={styles.imageRemoveBtn}
                      onPress={() => removeSelectedImage(image.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={13} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {selectedImage && selectedMediaType === 'video' ? (
            <View style={styles.imageWrapper}>
              <VideoPreview uri={selectedImage} style={styles.momentImage} />
              <View style={styles.videoPreviewBadge}>
                <Feather name="video" size={13} color="#FFFFFF" />
                <Text style={styles.videoPreviewBadgeText} numberOfLines={1}>{selectedMediaName ?? 'Video'}</Text>
              </View>
              <TouchableOpacity style={styles.imageRemoveBtn} onPress={clearSelectedMedia} activeOpacity={0.8}>
                <Feather name="x" size={13} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : null}

          {selectedImage && selectedMediaType === 'audio' ? (
            <View style={styles.audioAttachment}>
              <TouchableOpacity
                style={[styles.audioAttachmentIcon, isAudioPreviewBusy && styles.audioAttachmentIconDisabled]}
                activeOpacity={0.85}
                onPress={toggleAudioPreview}
                disabled={isAudioPreviewBusy}
              >
                <Feather name={audioPreviewStatus.playing ? 'pause' : 'play'} size={20} color={screenColors.primary} />
              </TouchableOpacity>
              <View style={styles.audioAttachmentInfo}>
                <Text style={styles.audioAttachmentTitle} numberOfLines={1}>{selectedMediaName ?? 'Audio'}</Text>
                <Text style={styles.audioAttachmentMeta}>
                  {audioPreviewDurationSeconds > 0
                    ? formatAudioPreviewTime(audioPreviewStatus, selectedMediaDurationSeconds)
                    : selectedMediaContentType ?? 'audio'}
                </Text>
              </View>
              <TouchableOpacity style={styles.audioRemoveBtn} onPress={clearSelectedMedia} activeOpacity={0.8}>
                <Feather name="x" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}

          <TextInput
            style={styles.stitchInput}
            placeholder="Write your thoughts"
            placeholderTextColor={screenColors.bodyText}
            value={caption}
            onChangeText={setCaption}
            multiline
            onFocus={scrollToCaption}
            onLayout={(event) => {
              captionPosition.current = event.nativeEvent.layout.y;
            }}
            disableFullscreenUI={Platform.OS === 'android'}
          />

          <View style={styles.keyboardSpacer} />
        </ScrollView>

        {/* ── Bottom Toolbar ── */}
        <View style={styles.toolbar}>
          {/* People */}
          <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowPeopleModal(true)} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={[styles.toolbarIconBox, taggedPeople.length > 0 && styles.toolbarIconBoxActive]}>
              <HugeiconsIcon icon={AddTeamIcon} size={24} color={taggedPeople.length > 0 ? screenColors.primary : screenColors.bodyText} />
            </BlurView>
            <Text style={[styles.toolbarLabel, taggedPeople.length > 0 && styles.toolbarLabelActive]}>Friend</Text>
          </TouchableOpacity>

          {/* Image / Gallery */}
          <TouchableOpacity style={styles.toolbarItem} onPress={handlePickImage} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={[styles.toolbarIconBox, selectedMediaType === 'image' && styles.toolbarIconBoxActive]}>
              <HugeiconsIcon icon={Image01Icon} size={24} color={selectedMediaType === 'image' ? screenColors.primary : screenColors.bodyText} />
            </BlurView>
            <Text style={[styles.toolbarLabel, selectedMediaType === 'image' && styles.toolbarLabelActive]}>Image</Text>
          </TouchableOpacity>

          {/* Camera */}
          <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowCamera(true)} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={styles.toolbarIconBox}>
              <Feather name="camera" size={24} color={screenColors.bodyText} />
            </BlurView>
            <Text style={styles.toolbarLabel}>Camera</Text>
          </TouchableOpacity>

          {/* Video */}
          <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowVideoPicker(true)} activeOpacity={0.8}>
            <BlurView intensity={20} tint="dark" style={[styles.toolbarIconBox, selectedMediaType === 'video' && styles.toolbarIconBoxActive]}>
              <HugeiconsIcon icon={Video02Icon} size={24} color={selectedMediaType === 'video' ? screenColors.primary : screenColors.bodyText} />
            </BlurView>
            <Text style={[styles.toolbarLabel, selectedMediaType === 'video' && styles.toolbarLabelActive]}>Video</Text>
          </TouchableOpacity>

          {/* Audio */}
          <TouchableOpacity
            style={styles.toolbarItem}
            onPress={() => setShowAudioPicker(true)}
            activeOpacity={0.8}
          >
            <BlurView intensity={20} tint="dark" style={[styles.toolbarIconBox, selectedMediaType === 'audio' && styles.toolbarIconBoxActive]}>
              <HugeiconsIcon icon={MusicNote04Icon} size={24} color={selectedMediaType === 'audio' ? screenColors.primary : screenColors.bodyText} />
            </BlurView>
            <Text style={[styles.toolbarLabel, selectedMediaType === 'audio' && styles.toolbarLabelActive]}>Audio</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Modals ── */}
      <CameraSheet
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(uri, contentType, name) => handleImageSelect([
          {
            uri,
            source: 'camera',
            contentType,
            name,
          },
        ])}
      />
      <VideoPickerSheet
        visible={showVideoPicker}
        onClose={() => setShowVideoPicker(false)}
        onRecordVideo={() => {
          setShowVideoPicker(false);
          setShowVideoCamera(true);
        }}
        onPickVideo={handlePickVideo}
      />
      <VideoCameraSheet
        visible={showVideoCamera}
        onClose={() => setShowVideoCamera(false)}
        onRecorded={(uri, contentType, name) => handleVideoSelect(uri, 'camera', contentType, name)}
      />
      <AudioPickerSheet
        visible={showAudioPicker}
        onClose={() => setShowAudioPicker(false)}
        onPickAudio={handlePickAudio}
        onRecorded={(uri, contentType, name, durationSeconds) => handleAudioSelect(uri, 'upload', contentType, name, durationSeconds)}
        previewUri={selectedMediaType === 'audio' ? selectedImage : null}
        previewTitle={selectedMediaName}
        previewStatus={audioPreviewStatus}
        previewDurationSeconds={selectedMediaDurationSeconds}
        isPreviewBusy={isAudioPreviewBusy}
        onTogglePreview={toggleAudioPreview}
        onStopPreview={stopAudioPreview}
      />
      <EventPickerModal
        visible={showEventModal}
        onClose={() => setShowEventModal(false)}
        selectedEventId={selectedEventId}
        onSelect={ev => {
          setSelectedEvent(ev.title);
          setSelectedEventId(ev.id);
          setSelectedEventCode(null);
          setShowEventModal(false);
        }}
      />
      <PeopleTagModal
        visible={showPeopleModal}
        onClose={() => setShowPeopleModal(false)}
        onSelect={people => setTaggedPeople(people)}
        selected={taggedPeople}
      />
      <AudiencePickerModal
        visible={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        onSelect={aud => { setAudience(aud); setShowAudienceModal(false); }}
        current={audience}
      />

    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CREATE_MOMENT_COLORS.background,
    paddingTop: Platform.OS === 'android' ? 34 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 26,
  },
  closeButton: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    flex: 1,
    color: CREATE_MOMENT_COLORS.text,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 21,
    marginLeft: 12,
  },
  doneBtn: {
    width: 97,
    height: 40,
    borderRadius: 12,
    backgroundColor: CREATE_MOMENT_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnDisabled: {
    opacity: 0.55,
  },
  doneBtnText: {
    color: CREATE_MOMENT_COLORS.primaryText,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
  },

  keyboardView: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 116 },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginBottom: 20,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#16D869',
    padding: 2,
    marginRight: 12,
    shadowColor: '#16D869',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16D869',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#000', fontSize: 16, fontWeight: '700' },
  authorInfo: { flex: 1 },
  authorNameFull: { color: CREATE_MOMENT_COLORS.text, fontSize: 14, lineHeight: 18 },
  authorBold: { color: CREATE_MOMENT_COLORS.text, fontWeight: '600' },
  authorMuted: { color: CREATE_MOMENT_COLORS.bodyText, fontWeight: '400' },

  eventActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  eventPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(22,216,105,0.12)', borderWidth: 1, borderColor: 'rgba(22,216,105,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5, maxWidth: 132 },
  eventPillText: { color: '#16D869', fontSize: 12, fontWeight: '700', flexShrink: 1, maxWidth: 88 },
  eventClearPill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CREATE_MOMENT_COLORS.surface, borderWidth: 1, borderColor: CREATE_MOMENT_COLORS.surfaceBorder },

  imageCarousel: {
    marginBottom: 24,
  },
  imageCarouselContent: {
    paddingHorizontal: 28,
    gap: 12,
  },
  imagePreviewCard: {
    width: width - 56,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imageWrapper: { marginHorizontal: 28, marginBottom: 24, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  momentImage: { width: '100%', height: 220, borderRadius: 12 },
  imageRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  imageCountBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    minWidth: 42,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  imageCountText: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  videoPreviewBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    maxWidth: '78%',
    minHeight: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  videoPreviewBadgeText: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  audioAttachment: {
    marginHorizontal: 28,
    marginBottom: 24,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CREATE_MOMENT_COLORS.surfaceBorder,
    backgroundColor: CREATE_MOMENT_COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  audioAttachmentIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(178,171,186,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audioAttachmentIconDisabled: {
    opacity: 0.6,
  },
  audioAttachmentInfo: {
    flex: 1,
    minWidth: 0,
  },
  audioAttachmentTitle: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  audioAttachmentMeta: {
    color: CREATE_MOMENT_COLORS.bodyText,
    fontSize: 12,
    marginTop: 4,
  },
  audioRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginLeft: 10,
  },

  stitchInput: {
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 14,
    lineHeight: 18,
    paddingHorizontal: 28,
    paddingTop: 0,
    minHeight: 180,
    textAlignVertical: 'top',
  },

  keyboardSpacer: {
    minHeight: 160,
  },

  toolbar: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: Platform.OS === 'ios' ? 28 : 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: CREATE_MOMENT_COLORS.background,
  },
  toolbarItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  toolbarIconBox: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: CREATE_MOMENT_COLORS.surface,
    borderWidth: 1,
    borderColor: CREATE_MOMENT_COLORS.surfaceBorder,
  },
  toolbarIconBoxActive: {
    borderColor: 'rgba(178,171,186,0.42)',
  },
  toolbarLabel: {
    alignSelf: 'stretch',
    color: CREATE_MOMENT_COLORS.text,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  toolbarLabelActive: {
    color: CREATE_MOMENT_COLORS.primary,
  },
});

const rmStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  blur: { width: '85%', borderRadius: 28, overflow: 'hidden' },
  container: { padding: 24 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  inputWrapper: { borderRadius: 14, paddingHorizontal: 16, height: 56, justifyContent: 'center', marginBottom: 20 },
  input: { fontSize: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 14, marginBottom: 30 },
  checkboxInfo: { flex: 1, marginRight: 10 },
  checkboxTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  checkboxSub: { fontSize: 11 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: {},
  footer: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 54, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold' },
  continueBtn: { flex: 1.5, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  continueBtnText: { fontSize: 16, fontWeight: 'bold' },
});

const qdStyles = StyleSheet.create({
  overlay: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  productCard: { borderRadius: 20, padding: 12, flexDirection: 'row', gap: 14, marginBottom: 16 },
  productImg: { width: 70, height: 70, borderRadius: 14 },
  productTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  productMeta: { fontSize: 12, marginBottom: 6 },
  productPrice: { fontSize: 18, fontWeight: 'bold' },

  venueCard: { borderRadius: 20, padding: 18, marginBottom: 24 },
  venueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  venueTitle: { fontSize: 16, fontWeight: 'bold' },
  venueDetails: { gap: 6 },
  venueLabel: { fontSize: 13 },
  venueValue: { },

  orderRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
  orderText: { fontSize: 13 },
  orderId: { fontWeight: 'bold' },

  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrImage: { width: 260, height: 260, borderRadius: 20, backgroundColor: '#FFFFFF', padding: 10 },

  statusBanner: { flexDirection: 'row', gap: 12, padding: 18, borderRadius: 16, marginBottom: 24, alignItems: 'center' },
  statusMsg: { flex: 1, fontSize: 12, lineHeight: 18 },
});

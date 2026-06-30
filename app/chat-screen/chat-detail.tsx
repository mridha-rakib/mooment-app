import BackButton from '@/components/ui/BackButton';
import UserAvatar from '@/components/ui/UserAvatar';
import { Spinner } from '@/components/ui/spinner';
import {
  Feather,
  Ionicons } from '@expo/vector-icons';
import { AttachmentIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useLocalSearchParams,
  useRouter } from 'expo-router';
import React,
  { useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Alert,
  AppState,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventPickerModal from '@/components/post/EventPickerModal';
import { deleteConversation, getDirectMessageHistory, getGroupMessages } from '@/lib/chat';
import { safeBack } from '@/lib/navigation';
import type { ChatFileAttachment, ChatLocationAttachment, ChatMessageAttachment, ChatMessageType, DirectChatMessageResponse, GroupMessageResponse } from '@/lib/chat';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { createRealtimeSocket } from '@/lib/realtime';
import type { DirectRealtimeMessage, GroupRealtimeMessage } from '@/lib/realtime';
import { getStorageFileUrl, uploadFileToStorage } from '@/lib/storage';
import { blockUser, unblockUser } from '@/lib/users';
import { useAuthStore } from '@/stores/authStore';
import { useChatUnreadStore } from '@/stores/chatUnreadStore';

const { width } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────────
type Reaction = { emoji: string; count: number };
type MessageType = ChatMessageType;

type DeliveryState = 'sending' | 'sent' | 'failed';

type Message = {
  id: string;
  clientMessageId?: string | null;
  fromMe: boolean;
  type: MessageType;
  text?: string;
  attachment?: ChatMessageAttachment | null;
  mediaUri?: string;
  imageUri?: string;
  audioDuration?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventImage?: string;
  locationTitle?: string;
  locationDesc?: string;
  reactions?: Reaction[];
  time: string;
  delivered?: boolean;
  read?: boolean;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  isHost?: boolean;
  deliveryState?: DeliveryState;
  editedAt?: string | null;
};

type PendingAttachment = {
  id: string;
  type: Exclude<ChatMessageType, 'text'>;
  localUri?: string;
  fileName?: string | null;
  mimeType?: string;
  size?: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  attachment?: ChatMessageAttachment;
  status: 'uploading' | 'uploaded' | 'failed';
  progress: number;
  error?: string | null;
  eventTitle?: string | null;
  locationTitle?: string | null;
  locationDesc?: string | null;
};

const WAVEFORM_HEIGHTS = [8, 14, 20, 12, 28, 16, 24, 10, 18, 22, 14, 26, 8, 20, 16, 12, 24, 18, 10, 14];

const formatRealtimeTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const isObjectId = (value?: string) => /^[a-f\d]{24}$/i.test(value ?? '');

const formatSeconds = (seconds?: number | null) => {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remaining = totalSeconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
};

const getMediaContentType = (
  uri: string,
  type: 'image' | 'video' | 'audio',
  provided?: string | null,
) => {
  if (provided) return provided;
  const normalized = uri.toLowerCase().split('?')[0] ?? uri.toLowerCase();

  if (type === 'image') {
    if (normalized.endsWith('.png')) return 'image/png';
    if (normalized.endsWith('.webp')) return 'image/webp';
    if (normalized.endsWith('.heic')) return 'image/heic';
    return 'image/jpeg';
  }

  if (type === 'video') {
    if (normalized.endsWith('.mov')) return 'video/quicktime';
    if (normalized.endsWith('.webm')) return 'video/webm';
    if (normalized.endsWith('.3gp')) return 'video/3gpp';
    if (normalized.endsWith('.m4v')) return 'video/x-m4v';
    return 'video/mp4';
  }

  if (normalized.endsWith('.m4a') || normalized.endsWith('.mp4')) return 'audio/mp4';
  if (normalized.endsWith('.aac')) return 'audio/aac';
  if (normalized.endsWith('.wav')) return 'audio/wav';
  if (normalized.endsWith('.webm')) return 'audio/webm';
  if (normalized.endsWith('.3gp')) return 'audio/3gpp';
  if (normalized.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mpeg';
};

const getExtensionForContentType = (contentType: string) => {
  const normalized = contentType.toLowerCase();
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/heic' || normalized === 'image/heif') return 'heic';
  if (normalized === 'video/quicktime') return 'mov';
  if (normalized === 'video/webm') return 'webm';
  if (normalized === 'video/3gpp' || normalized === 'audio/3gpp') return '3gp';
  if (normalized === 'video/x-m4v') return 'm4v';
  if (normalized === 'audio/mp4' || normalized === 'audio/x-m4a' || normalized === 'audio/aac') return 'm4a';
  if (normalized === 'audio/wav' || normalized === 'audio/x-wav') return 'wav';
  if (normalized === 'audio/ogg') return 'ogg';
  if (normalized === 'audio/mpeg') return 'mp3';
  if (normalized === 'video/mp4') return 'mp4';
  return 'jpg';
};

const getAttachmentPreviewUri = (attachment?: ChatMessageAttachment | null) => {
  if (!attachment) return undefined;
  if (attachment.type === 'image' || attachment.type === 'video' || attachment.type === 'audio') {
    return attachment.url || getStorageFileUrl(attachment.key, attachment.mimeType);
  }
  if (attachment.type === 'event') {
    return attachment.coverImageUrl ?? null;
  }
  return undefined;
};

const openMapLocation = (latitude: number, longitude: number, label?: string | null) => {
  const encodedLabel = encodeURIComponent(label || 'Shared Location');
  const url = Platform.select({
    ios: `maps:0,0?q=${encodedLabel}@${latitude},${longitude}`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });

  if (url) {
    void Linking.openURL(url);
  }
};

const toMessageFromAttachment = (
  base: Omit<Message, 'type'>,
  type: ChatMessageType,
  text: string,
  attachment?: ChatMessageAttachment | null,
): Message => {
  const previewUri = getAttachmentPreviewUri(attachment);
  const message: Message = {
    ...base,
    type,
    text,
    attachment,
  };

  if (attachment?.type === 'image' || attachment?.type === 'video') {
    message.mediaUri = previewUri || undefined;
    message.imageUri = previewUri || undefined;
  }

  if (attachment?.type === 'audio') {
    message.mediaUri = previewUri || undefined;
    message.audioDuration = formatSeconds(attachment.durationSeconds);
  }

  if (attachment?.type === 'location') {
    message.locationTitle = attachment.label || 'Current Location';
    message.locationDesc = attachment.address || `${attachment.latitude.toFixed(5)}, ${attachment.longitude.toFixed(5)}`;
  }

  if (attachment?.type === 'event') {
    message.eventTitle = attachment.title || 'Event';
    message.eventDate = attachment.scheduledAt
      ? new Date(attachment.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : attachment.locationName || attachment.address || '';
    message.eventLocation = attachment.locationName || attachment.address || '';
    message.eventImage = previewUri || undefined;
  }

  return message;
};

const toRealtimeTextMessage = (message: DirectRealtimeMessage, currentUserId?: string): Message =>
  toMessageFromAttachment(
    {
      clientMessageId: message.clientMessageId ?? null,
      delivered: message.senderId === currentUserId,
      deliveryState: 'sent',
      fromMe: message.senderId === currentUserId,
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      time: formatRealtimeTime(message.createdAt),
      editedAt: message.editedAt ?? null,
    },
    message.type ?? 'text',
    message.text,
    message.attachment ?? null,
  );

const toApiTextMessage = (message: DirectChatMessageResponse, currentUserId?: string): Message =>
  toMessageFromAttachment(
    {
      delivered: message.senderId === currentUserId,
      deliveryState: 'sent',
      fromMe: message.senderId === currentUserId,
      id: message.id,
      senderId: message.senderId,
      time: formatRealtimeTime(message.createdAt),
      editedAt: message.editedAt ?? null,
    },
    message.type,
    message.text,
    message.attachment ?? null,
  );

const toGroupApiTextMessage = (message: GroupMessageResponse, currentUserId?: string): Message =>
  toMessageFromAttachment(
    {
      delivered: message.senderId === currentUserId,
      deliveryState: 'sent',
      fromMe: message.senderId === currentUserId,
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      time: formatRealtimeTime(message.createdAt),
      editedAt: message.editedAt ?? null,
    },
    message.type ?? 'text',
    message.text,
    message.attachment ?? null,
  );

const toGroupRealtimeTextMessage = (message: GroupRealtimeMessage, currentUserId?: string): Message =>
  toMessageFromAttachment(
    {
      clientMessageId: message.clientMessageId ?? null,
      delivered: message.senderId === currentUserId,
      deliveryState: 'sent',
      fromMe: message.senderId === currentUserId,
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      time: formatRealtimeTime(message.createdAt),
      editedAt: message.editedAt ?? null,
    },
    message.type ?? 'text',
    message.text,
    message.attachment ?? null,
  );

// ── Bubble Components ──────────────────────────────────────────────────────
function TextBubble({ msg }: { msg: Message }) {
  const isHostMsg = !msg.fromMe && msg.isHost;
  const locationAttachment = msg.attachment?.type === 'location' ? msg.attachment : null;

  return (
    <View style={[styles.bubble, msg.fromMe ? styles.bubbleMe : (isHostMsg ? styles.bubbleHost : styles.bubbleThem)]}>
      {msg.text ? (
        <Text style={[styles.bubbleText, msg.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
          {msg.text}
        </Text>
      ) : null}

      {/* Location Attachment */}
      {msg.locationTitle && (
        <TouchableOpacity
          style={styles.locationBox}
          activeOpacity={0.8}
          onPress={() => {
            if (locationAttachment) {
              openMapLocation(locationAttachment.latitude, locationAttachment.longitude, locationAttachment.label);
            }
          }}
        >
          <View style={styles.locationIconWrap}>
            <Feather name="map-pin" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.locationTitle}>{msg.locationTitle}</Text>
            <Text style={styles.locationDesc}>{msg.locationDesc}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.bubbleMeta, !msg.fromMe && { justifyContent: 'flex-start' }]}>
        {msg.editedAt ? <Text style={[styles.bubbleTime, msg.fromMe && styles.bubbleTimeMe]}>Edited • </Text> : null}
        <Text style={[styles.bubbleTime, msg.fromMe && styles.bubbleTimeMe]}>
          {msg.time}
          {msg.fromMe && msg.delivered ? ' • Delivered' : ''}
        </Text>
      </View>
    </View>
  );
}

function ImageBubble({ msg }: { msg: Message }) {
  return (
    <View style={[styles.imageBubble, msg.fromMe ? styles.imageBubbleMe : styles.imageBubbleThem]}>
      <Image source={{ uri: msg.imageUri || '' }} style={styles.bubbleImage} />
      {msg.deliveryState === 'failed' && (
        <View style={styles.failedOverlay}>
          <Feather name="alert-circle" size={18} color="#FFFFFF" />
        </View>
      )}
      <View style={styles.imageTimeBadge}>
        <Text style={styles.imageTimeText}>{msg.time}</Text>
        {msg.fromMe && (
          <Ionicons name={msg.read ? 'checkmark-done' : 'checkmark'} size={11} color="#fff" style={{ marginLeft: 3 }} />
        )}
      </View>
    </View>
  );
}

function VideoBubble({ msg }: { msg: Message }) {
  const player = useVideoPlayer(msg.mediaUri || '', (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = false;
  });

  return (
    <View style={[styles.imageBubble, msg.fromMe ? styles.imageBubbleMe : styles.imageBubbleThem]}>
      {msg.mediaUri ? (
        <VideoView
          player={player}
          style={styles.bubbleImage}
          nativeControls
          contentFit="cover"
        />
      ) : (
        <View style={[styles.bubbleImage, styles.mediaFallback]}>
          <Feather name="video" size={30} color="#8E8E9B" />
        </View>
      )}
      <View style={styles.imageTimeBadge}>
        <Text style={styles.imageTimeText}>{msg.time}</Text>
      </View>
    </View>
  );
}

function AudioBubble({ msg }: { msg: Message }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const audioSource = useMemo(() => (msg.mediaUri ? { uri: msg.mediaUri } : null), [msg.mediaUri]);
  const player = useAudioPlayer(audioSource, { downloadFirst: false, updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : msg.attachment?.type === 'audio' ? msg.attachment.durationSeconds ?? 0 : 0;
  const currentTime = duration > 0 ? Math.min(status.currentTime, duration) : status.currentTime;
  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.round(progress * WAVEFORM_HEIGHTS.length);

  const handleTogglePlayback = async () => {
    if (!msg.mediaUri) return;

    try {
      if (status.playing) {
        player.pause();
        return;
      }

      setLoadFailed(false);
      if (duration > 0 && currentTime >= duration - 0.25) {
        await player.seekTo(0);
      }
      player.play();
    } catch (error) {
      setLoadFailed(true);
      Alert.alert('Unable to play audio', getAuthErrorMessage(error, 'Please try again.'));
    }
  };

  return (
    <View style={[styles.bubble, msg.fromMe ? styles.bubbleMe : styles.bubbleThem, styles.audioBubble]}>
      <TouchableOpacity
        style={[styles.audioPlayBtn, msg.fromMe && styles.audioPlayBtnMe]}
        onPress={handleTogglePlayback}
        activeOpacity={0.8}
        disabled={!msg.mediaUri}
      >
        {loadFailed ? (
          <Feather name="alert-circle" size={16} color={msg.fromMe ? '#D4B0EB' : '#FFFFFF'} />
        ) : (
          <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={msg.fromMe ? '#D4B0EB' : '#FFFFFF'} style={{ marginLeft: status.playing ? 0 : 2 }} />
        )}
      </TouchableOpacity>
      <View style={styles.waveformRow}>
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={[
              styles.waveBar,
              { height: h },
              i < activeBars
                ? (msg.fromMe ? { backgroundColor: '#D4B0EB' } : { backgroundColor: '#FFFFFF' })
                : { backgroundColor: msg.fromMe ? 'rgba(212,176,235,0.35)' : 'rgba(255,255,255,0.3)' },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioDuration, msg.fromMe && styles.audioDurationMe]}>{msg.audioDuration}</Text>
    </View>
  );
}

function EventBubble({ msg }: { msg: Message }) {
  const router = useRouter();
  const eventId = msg.attachment?.type === 'event' ? msg.attachment.eventId : null;

  return (
    <View style={[styles.eventBubble, msg.fromMe ? styles.eventBubbleMe : styles.eventBubbleThem]}>
      {msg.eventImage && (
        <Image
          source={{ uri: msg.eventImage }}
          style={styles.eventBubbleBackground}
          blurRadius={10}
        />
      )}
      <View style={styles.eventBubbleScrim} />
      <View style={styles.eventBubbleGlow} />
      <View style={styles.eventBubbleInfo}>
        <View style={styles.eventBubbleTag}>
          <Ionicons name="calendar-outline" size={11} color="#F0D8FF" />
          <Text style={styles.eventBubbleTagText}>Event</Text>
        </View>
        <Text style={styles.eventBubbleTitle} numberOfLines={2}>{msg.eventTitle}</Text>
        {msg.eventDate ? (
          <View style={styles.eventBubbleMetaRow}>
            <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.78)" />
            <Text style={styles.eventBubbleDate} numberOfLines={1}>{msg.eventDate}</Text>
          </View>
        ) : null}
        {msg.eventLocation ? (
          <View style={styles.eventBubbleMetaRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.78)" />
            <Text style={styles.eventBubbleLocation} numberOfLines={2}>{msg.eventLocation}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.eventBubbleBtn}
          activeOpacity={0.8}
          onPress={() => {
            if (eventId) {
              router.push({ pathname: '/event-screen/event', params: { id: eventId } } as any);
            }
          }}
        >
          <Text style={styles.eventBubbleBtnText}>View Event</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.eventBubbleTimeWrap}>
        <Text style={styles.eventBubbleTime}>{msg.time}</Text>
      </View>
    </View>
  );
}

function PendingAttachmentTray({
  items,
  onRemove,
  onRetry,
}: {
  items: PendingAttachment[];
  onRemove: (id: string) => void;
  onRetry: (item: PendingAttachment) => void;
}) {
  if (items.length === 0) return null;

  return (
    <View style={styles.pendingTray}>
      {items.map((item) => (
        <View key={item.id} style={styles.pendingItem}>
          {item.localUri && item.type === 'image' ? (
            <Image source={{ uri: item.localUri }} style={styles.pendingThumb} />
          ) : item.localUri && item.type === 'video' ? (
            <View style={styles.pendingThumb}>
              <Feather name="video" size={22} color="#FFFFFF" />
            </View>
          ) : item.type === 'audio' ? (
            <View style={styles.pendingThumb}>
              <Feather name="music" size={22} color="#FFFFFF" />
            </View>
          ) : item.type === 'location' ? (
            <View style={styles.pendingThumb}>
              <Feather name="map-pin" size={22} color="#16D869" />
            </View>
          ) : (
            <View style={styles.pendingThumb}>
              <Feather name="calendar" size={22} color="#D4B0EB" />
            </View>
          )}

          <View style={styles.pendingInfo}>
            <Text style={styles.pendingTitle} numberOfLines={1}>
              {item.eventTitle || item.locationTitle || item.fileName || item.type}
            </Text>
            <Text style={[styles.pendingMeta, item.status === 'failed' && styles.pendingMetaError]}>
              {item.status === 'uploading'
                ? `Uploading ${Math.round(item.progress * 100)}%`
                : item.status === 'failed'
                  ? item.error || 'Upload failed'
                  : 'Ready'}
            </Text>
            {item.status === 'uploading' && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
              </View>
            )}
          </View>

          {item.status === 'failed' && (
            <TouchableOpacity style={styles.pendingIconBtn} onPress={() => onRetry(item)} activeOpacity={0.8}>
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.pendingIconBtn} onPress={() => onRemove(item.id)} activeOpacity={0.8}>
            <Feather name="x" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function AudioPickerSheet({
  visible,
  onClose,
  onPickAudio,
  onRecorded,
}: {
  visible: boolean;
  onClose: () => void;
  onPickAudio: () => void;
  onRecorded: (uri: string, durationSeconds?: number | null) => void;
}) {
  const recorderRef = useRef<any>(null);
  const audioModuleRef = useRef<any>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const status = recorderRef.current?.getStatus?.();
      setDurationMillis(status?.durationMillis ?? 0);
    }, 250);

    return () => clearInterval(interval);
  }, [isRecording]);

  const stopRecorder = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return null;

    await recorder.stop();
    await audioModuleRef.current?.setAudioModeAsync?.({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    const status = recorder.getStatus?.();
    const uri = recorder.uri ?? status?.url ?? null;
    const duration = status?.durationMillis ?? durationMillis;
    recorderRef.current = null;
    setIsRecording(false);
    return { uri, duration };
  };

  const startRecording = async () => {
    if (isPreparing || isRecording) return;
    setIsPreparing(true);

    try {
      const audio = await import('expo-audio') as any;
      const permission = await audio.requestRecordingPermissionsAsync();
      audioModuleRef.current = audio;

      if (!permission.granted) {
        Alert.alert('Microphone access needed', 'Please allow microphone access to record audio.');
        return;
      }

      await audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const NativeRecorder = audio.AudioModule?.AudioRecorder;

      if (!NativeRecorder) {
        Alert.alert('Recording unavailable', 'Audio recording is not available in this build. You can choose an audio file instead.');
        return;
      }

      const recorder = new NativeRecorder(audio.RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recorderRef.current = recorder;
      setDurationMillis(0);
      setIsRecording(true);
    } catch (error) {
      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try recording again.'));
    } finally {
      setIsPreparing(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      const recording = await stopRecorder();
      if (!recording?.uri) {
        Alert.alert('Recording failed', 'No recorded audio file was created.');
        return;
      }
      onRecorded(recording.uri, recording.duration ? recording.duration / 1000 : null);
      onClose();
    } catch (error) {
      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try stopping the recording again.'));
    }
  };

  const closeSheet = async () => {
    if (isRecording) {
      await stopRecorder().catch(() => undefined);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.audioSheetOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeSheet} />
        <View style={styles.audioSheet}>
          <View style={styles.audioSheetHandle} />
          <View style={styles.audioSheetHeader}>
            <View>
              <Text style={styles.audioSheetTitle}>Audio</Text>
              <Text style={styles.audioSheetSubtitle}>Record or choose audio</Text>
            </View>
            <TouchableOpacity onPress={closeSheet} style={styles.audioSheetClose} activeOpacity={0.8}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.recordCard}>
            <View style={[styles.recordDot, isRecording && styles.recordDotActive]} />
            <View style={styles.recordInfo}>
              <Text style={styles.recordTitle}>{isRecording ? 'Recording audio' : 'Ready to record'}</Text>
              <Text style={styles.recordTime}>{formatSeconds(durationMillis / 1000)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.stopButton]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.85}
              disabled={isPreparing}
            >
              <Feather name={isRecording ? 'square' : 'mic'} size={16} color="#111111" />
              <Text style={styles.recordButtonText}>{isRecording ? 'Stop' : isPreparing ? 'Wait' : 'Record'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.pickAudioButton, isRecording && { opacity: 0.45 }]}
            onPress={onPickAudio}
            activeOpacity={0.85}
            disabled={isRecording}
          >
            <Feather name="folder" size={18} color="#FFFFFF" />
            <Text style={styles.pickAudioButtonText}>Choose audio file</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string; avatar: string; isGroup?: string; isOnline?: string; isBlocked?: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [isFriendOnline, setIsFriendOnline] = useState(params.isOnline === 'true');
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(params.isBlocked === 'true');
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [moreMenuTop, setMoreMenuTop] = useState(0);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isEventPickerVisible, setIsEventPickerVisible] = useState(false);
  const [isAudioPickerVisible, setIsAudioPickerVisible] = useState(false);
  const [messageActionTarget, setMessageActionTarget] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const clearDirectUnread = useChatUnreadStore((state) => state.clearDirectUnread);
  const setActiveDirectConversationId = useChatUnreadStore((state) => state.setActiveDirectConversationId);
  const listRef = useRef<FlatList>(null);
  const moreMenuBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const realtimeRef = useRef<ReturnType<typeof createRealtimeSocket> | null>(null);
  const ownTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSendingTypingRef = useRef(false);
  const isLocationLoadingRef = useRef(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const name = params.name || 'Chat';
  const avatar = params.avatar?.trim() || null;
  const friendId = params.id;
  const isGroup = params.isGroup === 'true';

  const updatePendingAttachment = (id: string, patch: Partial<PendingAttachment>) => {
    setPendingAttachments((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const enqueueFileAttachment = async (file: {
    type: 'image' | 'video' | 'audio';
    uri: string;
    mimeType?: string | null;
    fileName?: string | null;
    size?: number | null;
    width?: number | null;
    height?: number | null;
    durationSeconds?: number | null;
  }) => {
    if (!currentUser?.id || !isObjectId(friendId)) {
      Alert.alert('Chat unavailable', 'Open a valid conversation before sending attachments.');
      return;
    }

    const mimeType = getMediaContentType(file.uri, file.type, file.mimeType);
    const extension = getExtensionForContentType(mimeType);
    const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key = `chat/${currentUser.id}/${isGroup ? 'groups' : 'dms'}/${friendId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const pending: PendingAttachment = {
      id,
      type: file.type,
      localUri: file.uri,
      fileName: file.fileName ?? `${file.type}-${Date.now()}.${extension}`,
      mimeType,
      size: file.size && file.size > 0 ? file.size : 1,
      width: file.width ?? null,
      height: file.height ?? null,
      durationSeconds: file.durationSeconds ?? null,
      status: 'uploading',
      progress: 0,
    };

    setPendingAttachments((prev) => [...prev, pending]);

    try {
      await uploadFileToStorage({
        uri: file.uri,
        key,
        contentType: mimeType,
        onProgress: (progress) => updatePendingAttachment(id, { progress }),
      });

      const attachment: ChatFileAttachment = {
        type: file.type,
        key,
        mimeType,
        size: pending.size ?? 1,
        fileName: pending.fileName ?? null,
        width: pending.width ?? null,
        height: pending.height ?? null,
        durationSeconds: pending.durationSeconds ?? null,
      };

      updatePendingAttachment(id, {
        attachment,
        status: 'uploaded',
        progress: 1,
        error: null,
      });
    } catch (error) {
      updatePendingAttachment(id, {
        status: 'failed',
        error: getAuthErrorMessage(error, 'Upload failed.'),
      });
    }
  };

  const retryPendingAttachment = (pending: PendingAttachment) => {
    if (!pending.localUri || !pending.mimeType) return;
    removePendingAttachment(pending.id);
    void enqueueFileAttachment({
      type: pending.type as 'image' | 'video' | 'audio',
      uri: pending.localUri,
      mimeType: pending.mimeType,
      fileName: pending.fileName,
      size: pending.size,
      width: pending.width,
      height: pending.height,
      durationSeconds: pending.durationSeconds,
    });
  };

  const handlePickGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Gallery access needed', 'Please allow photo library access to choose media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      selectionLimit: 10,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    });

    if (result.canceled) return;

    setShowAttach(false);
    for (const asset of result.assets ?? []) {
      const type = asset.type === 'video' ? 'video' : 'image';
      void enqueueFileAttachment({
        type,
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
        size: asset.fileSize,
        width: asset.width,
        height: asset.height,
        durationSeconds: asset.duration ? asset.duration / 1000 : null,
      });
    }
  };

  const launchCameraForType = async (type: 'image' | 'video') => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Please allow camera access to capture media.');
      return;
    }

    if (type === 'video') {
      const microphonePermission = await Camera.requestMicrophonePermissionsAsync();

      if (!microphonePermission.granted) {
        Alert.alert('Microphone access needed', 'Please allow microphone access to record video.');
        return;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: type === 'video' ? ['videos'] : ['images'],
      quality: 0.85,
      videoMaxDuration: 120,
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setShowAttach(false);
    void enqueueFileAttachment({
      type,
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      size: asset.fileSize,
      width: asset.width,
      height: asset.height,
      durationSeconds: asset.duration ? asset.duration / 1000 : null,
    });
  };

  const handleCamera = () => {
    Alert.alert('Camera', 'Capture a photo or video.', [
      { text: 'Photo', onPress: () => void launchCameraForType('image') },
      { text: 'Video', onPress: () => void launchCameraForType('video') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickAudioFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsAudioPickerVisible(false);
    setShowAttach(false);
    void enqueueFileAttachment({
      type: 'audio',
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.name,
      size: asset.size,
    });
  };

  const handleShareLocation = async () => {
    if (isLocationLoadingRef.current) return;
    isLocationLoadingRef.current = true;
    setIsLocationLoading(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Location access needed', 'Please allow location access to share your current location.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const firstAddress = await Location.reverseGeocodeAsync(position.coords).then((items) => items[0]).catch(() => null);
      const address = firstAddress
        ? [firstAddress.name, firstAddress.street, firstAddress.city, firstAddress.region, firstAddress.country].filter(Boolean).join(', ')
        : null;
      const attachment: ChatLocationAttachment = {
        type: 'location',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        label: firstAddress?.name || 'Current Location',
        address,
      };

      setPendingAttachments((prev) => {
        const existingIdx = prev.findIndex((p) => p.type === 'location');
        if (existingIdx !== -1) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx]!,
            attachment,
            status: 'uploaded',
            progress: 1,
            locationTitle: attachment.label,
            locationDesc: attachment.address || `${attachment.latitude.toFixed(5)}, ${attachment.longitude.toFixed(5)}`,
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: `location-${Date.now()}`,
            type: 'location',
            attachment,
            status: 'uploaded',
            progress: 1,
            locationTitle: attachment.label,
            locationDesc: attachment.address || `${attachment.latitude.toFixed(5)}, ${attachment.longitude.toFixed(5)}`,
          },
        ];
      });
      setShowAttach(false);
    } catch (error) {
      Alert.alert('Location unavailable', getAuthErrorMessage(error, 'Unable to get your current location.'));
    } finally {
      isLocationLoadingRef.current = false;
      setIsLocationLoading(false);
    }
  };

  const handleSelectEvent = (event: { id: string; title: string }) => {
    setPendingAttachments((prev) => [
      ...prev,
      {
        id: `event-${event.id}-${Date.now()}`,
        type: 'event',
        attachment: {
          type: 'event',
          eventId: event.id,
        },
        eventTitle: event.title,
        status: 'uploaded',
        progress: 1,
      },
    ]);
    setIsEventPickerVisible(false);
    setShowAttach(false);
  };

  const clearOwnTypingStopTimer = () => {
    if (ownTypingStopTimerRef.current) {
      clearTimeout(ownTypingStopTimerRef.current);
      ownTypingStopTimerRef.current = null;
    }
  };

  const sendOwnTypingState = (nextIsTyping: boolean) => {
    if (!isObjectId(friendId) || isSendingTypingRef.current === nextIsTyping) {
      return;
    }

    const realtime = realtimeRef.current;

    if (!realtime) {
      if (!nextIsTyping) {
        isSendingTypingRef.current = false;
      }

      return;
    }

    isSendingTypingRef.current = nextIsTyping;
    realtime.sendDirectTyping(friendId, nextIsTyping);
  };

  const stopOwnTyping = () => {
    clearOwnTypingStopTimer();
    sendOwnTypingState(false);
  };

  const handleInputTextChange = (value: string) => {
    setInputText(value);

    if (!isObjectId(friendId) || isGroup) {
      return;
    }

    if (!value.trim()) {
      stopOwnTyping();
      return;
    }

    sendOwnTypingState(true);
    clearOwnTypingStopTimer();
    ownTypingStopTimerRef.current = setTimeout(() => {
      sendOwnTypingState(false);
      ownTypingStopTimerRef.current = null;
    }, 1500);
  };

  useEffect(() => {
    setIsFriendTyping(false);
    isSendingTypingRef.current = false;

    if (ownTypingStopTimerRef.current) {
      clearTimeout(ownTypingStopTimerRef.current);
      ownTypingStopTimerRef.current = null;
    }

    if (friendTypingTimeoutRef.current) {
      clearTimeout(friendTypingTimeoutRef.current);
      friendTypingTimeoutRef.current = null;
    }
  }, [friendId]);

  useEffect(() => {
    if (isGroup || !isObjectId(friendId)) {
      return;
    }

    clearDirectUnread(friendId);
    setActiveDirectConversationId(friendId);

    return () => {
      setActiveDirectConversationId(null);
    };
  }, [clearDirectUnread, friendId, isGroup, setActiveDirectConversationId]);

  useEffect(() => {
    if (!isObjectId(friendId)) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);

    const loadMessageHistory = async () => {
      try {
        if (isGroup) {
          const history = await getGroupMessages(friendId);

          if (!isMounted) return;

          setMessages(history.map((message) => toGroupApiTextMessage(message, currentUser?.id)));
        } else {
          const history = await getDirectMessageHistory(friendId);

          if (!isMounted) return;

          setMessages(history.map((message) => toApiTextMessage(message, currentUser?.id)));
        }
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
      } catch {
        if (isMounted) {
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessageHistory();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, friendId, isGroup]);

  useEffect(() => {
    if (!accessToken || !isObjectId(friendId)) {
      return;
    }

    const realtime = createRealtimeSocket({
      accessToken,
      onDirectMessage: isGroup
        ? undefined
        : (realtimeMessage) => {
            const isCurrentConversation =
              realtimeMessage.senderId === friendId || realtimeMessage.recipientId === friendId;

            if (!isCurrentConversation) {
              return;
            }

            setMessages((prev) => {
              const serverMessage = toRealtimeTextMessage(realtimeMessage, currentUser?.id);
              const existingIndex = prev.findIndex(
                (message) => message.id === realtimeMessage.id ||
                  (Boolean(realtimeMessage.clientMessageId) && message.clientMessageId === realtimeMessage.clientMessageId),
              );

              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = {
                  ...serverMessage,
                  deliveryState: 'sent',
                };
                return next;
              }

              if (prev.some((message) => message.id === realtimeMessage.id)) {
                return prev;
              }

              return [...prev, serverMessage];
            });
            if (realtimeMessage.senderId === friendId) {
              clearDirectUnread(friendId);
              void getDirectMessageHistory(friendId, { limit: 1 }).catch(() => undefined);

              if (friendTypingTimeoutRef.current) {
                clearTimeout(friendTypingTimeoutRef.current);
                friendTypingTimeoutRef.current = null;
              }

              setIsFriendTyping(false);
            }
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          },
      onDirectTyping: isGroup
        ? undefined
        : (typing) => {
            const isCurrentConversation =
              typing.senderId === friendId && (!currentUser?.id || typing.recipientId === currentUser.id);

            if (!isCurrentConversation) {
              return;
            }

            if (friendTypingTimeoutRef.current) {
              clearTimeout(friendTypingTimeoutRef.current);
              friendTypingTimeoutRef.current = null;
            }

            setIsFriendTyping(typing.isTyping);

            if (typing.isTyping) {
              friendTypingTimeoutRef.current = setTimeout(() => {
                setIsFriendTyping(false);
                friendTypingTimeoutRef.current = null;
              }, 3500);
            }
          },
      onDirectMessageUpdated: isGroup
        ? undefined
        : (realtimeMessage) => {
            const isCurrentConversation =
              realtimeMessage.senderId === friendId || realtimeMessage.recipientId === friendId;

            if (!isCurrentConversation) return;

            setMessages((prev) => prev.map((message) =>
              message.id === realtimeMessage.id
                ? {
                    ...message,
                    text: realtimeMessage.text,
                    editedAt: realtimeMessage.editedAt ?? new Date().toISOString(),
                  }
                : message,
            ));
          },
      onDirectMessageDeleted: isGroup
        ? undefined
        : ({ messageId }) => {
            setMessages((prev) => prev.filter((message) => message.id !== messageId));
            setMessageActionTarget((current) => current?.id === messageId ? null : current);
            setEditingMessage((current) => current?.id === messageId ? null : current);
          },
      onGroupMessage: isGroup
        ? (realtimeMessage) => {
            if (realtimeMessage.groupId !== friendId) {
              return;
            }

            setMessages((prev) => {
              const serverMessage = toGroupRealtimeTextMessage(realtimeMessage, currentUser?.id);
              const existingIndex = prev.findIndex(
                (message) => message.id === realtimeMessage.id ||
                  (Boolean(realtimeMessage.clientMessageId) && message.clientMessageId === realtimeMessage.clientMessageId),
              );

              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = {
                  ...serverMessage,
                  deliveryState: 'sent',
                };
                return next;
              }

              if (prev.some((message) => message.id === realtimeMessage.id)) {
                return prev;
              }

              return [...prev, serverMessage];
            });
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          }
        : undefined,
      onGroupMessageUpdated: isGroup
        ? (realtimeMessage) => {
            if (realtimeMessage.groupId !== friendId) return;

            setMessages((prev) => prev.map((message) =>
              message.id === realtimeMessage.id
                ? {
                    ...message,
                    text: realtimeMessage.text,
                    editedAt: realtimeMessage.editedAt ?? new Date().toISOString(),
                  }
                : message,
            ));
          }
        : undefined,
      onGroupMessageDeleted: isGroup
        ? ({ groupId, messageId }) => {
            if (groupId !== friendId) return;
            setMessages((prev) => prev.filter((message) => message.id !== messageId));
            setMessageActionTarget((current) => current?.id === messageId ? null : current);
            setEditingMessage((current) => current?.id === messageId ? null : current);
          }
        : undefined,
      onError: (error) => {
        if (error.code === 'MESSAGE_EDIT_FAILED' || error.code === 'MESSAGE_DELETE_FAILED') {
          Alert.alert('Unable to update message', error.message);
          return;
        }

        setMessages((prev) =>
          prev.map((message) =>
            message.fromMe && message.deliveryState === 'sending'
              ? { ...message, deliveryState: 'failed', delivered: false }
              : message,
          ),
        );
        if (error.message) {
          Alert.alert('Message failed', error.message);
        }
      },
      onUserOnline: isGroup
        ? undefined
        : (userId) => {
            if (userId === friendId) setIsFriendOnline(true);
          },
      onUserOffline: isGroup
        ? undefined
        : (userId) => {
            if (userId === friendId) setIsFriendOnline(false);
          },
    });

    realtimeRef.current = realtime;

    return () => {
      clearOwnTypingStopTimer();
      if (!isGroup && isObjectId(friendId) && isSendingTypingRef.current) {
        realtime.sendDirectTyping(friendId, false);
        isSendingTypingRef.current = false;
      }
      realtime.close();
      if (realtimeRef.current === realtime) {
        realtimeRef.current = null;
      }
    };
  }, [accessToken, clearDirectUnread, currentUser?.id, friendId, isGroup]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && realtimeRef.current) {
        realtimeRef.current.reconnect();
      }
    });
    return () => subscription.remove();
  }, []);

  const sendMessage = () => {
    const uploadedAttachments = pendingAttachments.filter((item) => item.status === 'uploaded' && item.attachment);
    const hasUploading = pendingAttachments.some((item) => item.status === 'uploading');
    const hasFailed = pendingAttachments.some((item) => item.status === 'failed');
    if (!inputText.trim() && uploadedAttachments.length === 0) return;

    if (hasUploading) {
      Alert.alert('Upload in progress', 'Wait for uploads to finish before sending.');
      return;
    }

    if (hasFailed) {
      Alert.alert('Upload failed', 'Retry or remove failed attachments before sending.');
      return;
    }

    const text = inputText.trim();
    const attachmentsToSend = uploadedAttachments.map((item) => item.attachment!).filter(Boolean);
    const newMessages: Message[] = [];

    if (attachmentsToSend.length === 0) {
      const clientMessageId = `${isGroup ? 'gm' : 'dm'}-${Date.now()}`;
      newMessages.push({
        clientMessageId,
        id: clientMessageId,
        fromMe: true,
        type: 'text',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        delivered: true,
        deliveryState: 'sending',
      });

      if (isGroup) {
        if (isObjectId(friendId)) {
          realtimeRef.current?.sendGroupMessage(friendId, text, clientMessageId);
        }
      } else {
        stopOwnTyping();
        if (isObjectId(friendId)) {
          realtimeRef.current?.sendDirectMessage(friendId, text, clientMessageId);
        }
      }
    } else {
      attachmentsToSend.forEach((attachment, index) => {
        const pending = uploadedAttachments[index];
        const clientMessageId = `${isGroup ? 'gm' : 'dm'}-${attachment.type}-${Date.now()}-${index}`;
        const messageText = index === 0 ? text : '';
        const optimistic = toMessageFromAttachment(
          {
            clientMessageId,
            delivered: true,
            deliveryState: 'sending',
            fromMe: true,
            id: clientMessageId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          attachment.type,
          messageText,
          attachment,
        );

        if (pending?.localUri && (attachment.type === 'image' || attachment.type === 'video' || attachment.type === 'audio')) {
          optimistic.mediaUri = pending.localUri;
          optimistic.imageUri = pending.localUri;
        }

        if (attachment.type === 'event') {
          optimistic.eventTitle = pending?.eventTitle || optimistic.eventTitle;
        }

        newMessages.push(optimistic);

        if (isGroup) {
          if (isObjectId(friendId)) {
            realtimeRef.current?.sendGroupMessage(friendId, messageText, clientMessageId, {
              type: attachment.type,
              attachment,
            });
          }
        } else {
          if (isObjectId(friendId)) {
            realtimeRef.current?.sendDirectMessage(friendId, messageText, clientMessageId, {
              type: attachment.type,
              attachment,
            });
          }
        }
      });

      if (!isGroup) {
        stopOwnTyping();
      }
    }

    setMessages(prev => [...prev, ...newMessages]);
    setInputText('');
    setPendingAttachments([]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const retryMessage = (message: Message) => {
    if (!isObjectId(friendId)) return;

    const clientMessageId = message.clientMessageId || `${isGroup ? 'gm' : 'dm'}-retry-${Date.now()}`;
    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? { ...item, clientMessageId, deliveryState: 'sending', delivered: true }
          : item,
      ),
    );

    if (isGroup) {
      realtimeRef.current?.sendGroupMessage(
        friendId,
        message.text ?? '',
        clientMessageId,
        message.type === 'text'
          ? undefined
          : { type: message.type, attachment: message.attachment ?? undefined },
      );
      return;
    }

    realtimeRef.current?.sendDirectMessage(
      friendId,
      message.text ?? '',
      clientMessageId,
      message.type === 'text'
        ? undefined
        : { type: message.type, attachment: message.attachment ?? undefined },
    );
  };

  const canManageMessage = (message: Message) =>
    message.fromMe &&
    message.senderId === currentUser?.id &&
    message.deliveryState === 'sent' &&
    isObjectId(message.id);

  const openMessageActions = (message: Message) => {
    if (!canManageMessage(message)) return;
    setMessageActionTarget(message);
  };

  const startEditingMessage = (message: Message) => {
    if (!canManageMessage(message) || message.type !== 'text') return;
    setMessageActionTarget(null);
    setEditingMessage(message);
    setEditMessageText(message.text ?? '');
  };

  const saveEditedMessage = () => {
    if (!editingMessage || !canManageMessage(editingMessage)) return;
    const text = editMessageText.trim();
    if (!text || text === editingMessage.text?.trim()) {
      setEditingMessage(null);
      return;
    }

    if (isGroup) {
      realtimeRef.current?.editGroupMessage(editingMessage.id, text);
    } else {
      realtimeRef.current?.editDirectMessage(editingMessage.id, text);
    }
    setEditingMessage(null);
  };

  const confirmDeleteMessage = (message: Message) => {
    if (!canManageMessage(message)) return;
    setMessageActionTarget(null);
    Alert.alert(
      'Delete Message',
      'This message will be removed for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (isGroup) {
              realtimeRef.current?.deleteGroupMessage(message.id);
            } else {
              realtimeRef.current?.deleteDirectMessage(message.id);
            }
          },
        },
      ],
    );
  };

  const renderBubble = (item: Message) => {
    switch (item.type) {
      case 'image': return <ImageBubble msg={item} />;
      case 'video': return <VideoBubble msg={item} />;
      case 'audio': return <AudioBubble msg={item} />;
      case 'event': return <EventBubble msg={item} />;
      case 'location': return <TextBubble msg={item} />;
      default: return <TextBubble msg={item} />;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0e0d12" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <BackButton size={20} />

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.8}
          onPress={() => {
            router.push({
              pathname: '/profile-screen/user-profile',
              params: {
                userId: params.id,
                name: name,
                ...(avatar ? { avatar } : {}),
              }
            } as any);
          }}
        >
          <UserAvatar uri={avatar} name={name} size={40} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={styles.headerStatus}>
              {isFriendTyping ? 'Typing...' : isFriendOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            ref={moreMenuBtnRef}
            style={styles.headerBtn}
            activeOpacity={0.8}
            onPress={() => {
              moreMenuBtnRef.current?.measure((
                _x: number,
                _y: number,
                _w: number,
                h: number,
                _pageX: number,
                pageY: number,
              ) => {
                setMoreMenuTop(pageY + h + 6);
              });
              setIsMoreMenuVisible(true);
            }}
          >
            <Feather name="more-vertical" size={20} color="#8E8E9B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <Spinner size="large" color="#8E8E9B" />
          </View>
        ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContainer}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const prevMsg = messages[index - 1];
            const isSameGroup = prevMsg && prevMsg.fromMe === item.fromMe;
            return (
              <View>
                {/* Date separator (mock) */}
                {index === 0 && (
                  <View style={styles.dateSep}>
                    <View style={styles.dateSepLine} />
                    <Text style={styles.dateSepText}>Today</Text>
                    <View style={styles.dateSepLine} />
                  </View>
                )}

                <View style={[styles.msgRow, item.fromMe ? styles.msgRowMe : styles.msgRowThem, !isSameGroup && { marginTop: 12 }]}>
                  <View style={styles.messageColumn}>
                    <TouchableOpacity
                      activeOpacity={1}
                      disabled={!canManageMessage(item)}
                      delayLongPress={350}
                      onLongPress={() => openMessageActions(item)}
                    >
                      {renderBubble(item)}
                    </TouchableOpacity>

                    {/* Reactions */}
                    {item.reactions && item.reactions.length > 0 && (
                      <View style={[styles.reactionsRow, item.fromMe ? styles.reactionsRowMe : styles.reactionsRowThem]}>
                        {item.reactions.map((r: any, i: any) => (
                          <View key={i} style={styles.reactionPill}>
                            <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                            {r.count > 1 && <Text style={styles.reactionCount}>{r.count}</Text>}
                          </View>
                        ))}
                      </View>
                    )}

                    {item.fromMe && item.deliveryState === 'failed' && (
                      <TouchableOpacity
                        style={styles.failedRetryRow}
                        activeOpacity={0.8}
                        onPress={() => retryMessage(item)}
                      >
                        <Feather name="refresh-cw" size={12} color="#F2245C" />
                        <Text style={styles.failedRetryText}>Retry</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isFriendTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, { opacity: 0.6 }]} />
                  <View style={[styles.typingDot, { opacity: 0.3 }]} />
                </View>
              </View>
            ) : null
          }
        />
        )}

        {/* ── Attachment Options ── */}
        {showAttach && (
          <View style={styles.attachPanel}>
            {[
              { icon: 'image', label: 'Gallery', color: '#8E54E9', onPress: handlePickGallery, loading: false },
              { icon: 'camera', label: 'Camera', color: '#3B82F6', onPress: handleCamera, loading: false },
              { icon: 'music', label: 'Audio', color: '#F2245C', onPress: () => setIsAudioPickerVisible(true), loading: false },
              { icon: 'map-pin', label: 'Location', color: '#16D869', onPress: handleShareLocation, loading: isLocationLoading },
              { icon: 'calendar', label: 'Event', color: '#D4B0EB', onPress: () => setIsEventPickerVisible(true), loading: false },
            ].map(a => (
              <TouchableOpacity key={a.label} style={styles.attachItem} activeOpacity={0.8} onPress={a.onPress} disabled={a.loading}>
                <View style={[styles.attachIconWrap, { backgroundColor: a.color + '22' }]}>
                  {a.loading ? (
                    <Spinner size={22} color={a.color} />
                  ) : (
                    <Feather name={a.icon as any} size={22} color={a.color} />
                  )}
                </View>
                <Text style={styles.attachLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <PendingAttachmentTray
          items={pendingAttachments}
          onRemove={removePendingAttachment}
          onRetry={retryPendingAttachment}
        />

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TouchableOpacity style={styles.emojiBtn} activeOpacity={0.8}>
              <Feather name="smile" size={20} color="#8E8E9B" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Add Comment"
              placeholderTextColor="#8E8E9B"
              value={inputText}
              onChangeText={handleInputTextChange}
              multiline
              maxLength={500}
            />
            <TouchableOpacity style={styles.fileBtn} activeOpacity={0.8} onPress={() => setShowAttach((current) => !current)}>
              <HugeiconsIcon icon={AttachmentIcon} size={20} color="#8E8E9B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
            <Feather name="send" size={18} color="#FFFFFF" style={{ marginLeft: -2, marginTop: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Message Actions ── */}
      <Modal
        visible={Boolean(messageActionTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setMessageActionTarget(null)}
      >
        <TouchableOpacity
          style={styles.messageSheetOverlay}
          activeOpacity={1}
          onPress={() => setMessageActionTarget(null)}
        >
          <TouchableOpacity style={styles.messageSheet} activeOpacity={1} onPress={() => undefined}>
            <View style={styles.messageSheetHandle} />
            <Text style={styles.messageSheetTitle}>Message actions</Text>

            {messageActionTarget?.type === 'text' ? (
              <TouchableOpacity
                style={styles.messageActionRow}
                activeOpacity={0.8}
                onPress={() => startEditingMessage(messageActionTarget)}
              >
                <View style={styles.messageActionIcon}>
                  <Feather name="edit-2" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.messageActionText}>Edit Message</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.messageActionRow}
              activeOpacity={0.8}
              onPress={() => messageActionTarget && confirmDeleteMessage(messageActionTarget)}
            >
              <View style={[styles.messageActionIcon, styles.messageDeleteIcon]}>
                <Feather name="trash-2" size={18} color="#F2245C" />
              </View>
              <Text style={styles.messageDeleteText}>Delete Message</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Edit Message ── */}
      <Modal
        visible={Boolean(editingMessage)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingMessage(null)}
      >
        <KeyboardAvoidingView
          style={styles.messageSheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setEditingMessage(null)}
          />
          <View style={styles.messageSheet}>
            <View style={styles.messageSheetHandle} />
            <View style={styles.editMessageHeader}>
              <Text style={styles.messageSheetTitle}>Edit Message</Text>
              <TouchableOpacity style={styles.editMessageClose} onPress={() => setEditingMessage(null)}>
                <Feather name="x" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <TextInput
              autoFocus
              multiline
              maxLength={2000}
              style={styles.editMessageInput}
              value={editMessageText}
              onChangeText={setEditMessageText}
              placeholder="Write a message"
              placeholderTextColor="#8E8E9B"
            />
            <TouchableOpacity
              style={[styles.editMessageSave, !editMessageText.trim() && styles.editMessageSaveDisabled]}
              activeOpacity={0.8}
              disabled={!editMessageText.trim()}
              onPress={saveEditedMessage}
            >
              <Text style={styles.editMessageSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── More Options Modal ── */}
      <Modal visible={isMoreMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMoreMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMoreMenuVisible(false)}>
          <View style={[styles.moreMenuContainer, { top: moreMenuTop }]}>
            <View style={styles.moreMenuBox}>
              <TouchableOpacity
                style={styles.moreMenuItem}
                activeOpacity={0.8}
                disabled={isBlockLoading}
                onPress={async () => {
                  setIsMoreMenuVisible(false);
                  if (!isObjectId(friendId)) return;
                  setIsBlockLoading(true);
                  try {
                    if (isBlocked) {
                      await unblockUser(friendId);
                    } else {
                      await blockUser(friendId);
                    }
                    setIsBlocked((prev) => !prev);
                  } finally {
                    setIsBlockLoading(false);
                  }
                }}
              >
                {isBlockLoading ? (
                  <Spinner size="small" color="#FFFFFF" style={styles.moreMenuIcon} />
                ) : (
                  <Ionicons name="ban-outline" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
                )}
                <Text style={styles.moreMenuText}>{isBlocked ? 'Unblock' : 'Block'}</Text>
              </TouchableOpacity>

              {/* Create Plan — hidden until feature is ready */}
              {/* <View style={styles.moreMenuSeparator} />
              <TouchableOpacity
                style={styles.moreMenuItem}
                activeOpacity={0.8}
                onPress={() => {
                  setIsMoreMenuVisible(false);
                  router.push('/plan-screen/my-plan' as any);
                }}
              >
                <Feather name="plus" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
                <Text style={styles.moreMenuText}>Create Plan</Text>
              </TouchableOpacity> */}

              {/* Share Calendar — hidden until feature is ready */}
              {/* <View style={styles.moreMenuSeparator} />
              <TouchableOpacity style={styles.moreMenuItem} activeOpacity={0.8} onPress={() => setIsMoreMenuVisible(false)}>
                <Feather name="calendar" size={18} color="#FFFFFF" style={styles.moreMenuIcon} />
                <Text style={styles.moreMenuText}>Share Calendar</Text>
              </TouchableOpacity> */}

              <View style={styles.moreMenuSeparator} />

              <TouchableOpacity
                style={styles.moreMenuItem}
                activeOpacity={0.8}
                disabled={isDeleteLoading}
                onPress={async () => {
                  setIsMoreMenuVisible(false);
                  if (!isObjectId(friendId)) return;
                  setIsDeleteLoading(true);
                  try {
                    await deleteConversation(friendId);
                    safeBack(router, '/(tabs)/messages');
                  } finally {
                    setIsDeleteLoading(false);
                  }
                }}
              >
                {isDeleteLoading ? (
                  <Spinner size="small" color="#F2245C" style={styles.moreMenuIcon} />
                ) : (
                  <Feather name="trash-2" size={18} color="#F2245C" style={styles.moreMenuIcon} />
                )}
                <Text style={[styles.moreMenuText, { color: '#F2245C' }]}>Delete Conversation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <EventPickerModal
        visible={isEventPickerVisible}
        onClose={() => setIsEventPickerVisible(false)}
        onSelect={handleSelectEvent}
      />

      <AudioPickerSheet
        visible={isAudioPickerVisible}
        onClose={() => setIsAudioPickerVisible(false)}
        onPickAudio={handlePickAudioFile}
        onRecorded={(uri, durationSeconds) => {
          setIsAudioPickerVisible(false);
          setShowAttach(false);
          void enqueueFileAttachment({
            type: 'audio',
            uri,
            mimeType: 'audio/mp4',
            fileName: `Recording ${Date.now()}.m4a`,
            durationSeconds,
          });
        }}
      />

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0d12' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12
  },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  headerName: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  headerStatus: { color: '#8E8E9B', fontSize: 11, marginTop: 1 },
  headerRight: { paddingRight: 4 },
  headerBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  /* Messages */
  messagesContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  dateSep: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  dateSepText: { color: '#8E8E9B', fontSize: 11, marginHorizontal: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  messageColumn: { maxWidth: '84%' },

  /* Text Bubble */
  bubble: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, maxWidth: '100%' },
  bubbleMe: { backgroundColor: '#B2ABBA', borderBottomRightRadius: 2 },
  bubbleThem: { backgroundColor: '#111111', borderTopLeftRadius: 2, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  bubbleHost: { backgroundColor: '#191136', borderTopLeftRadius: 2 },
  bubbleSenderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bubbleSenderName: { color: '#8E8E9B', fontSize: 12, fontWeight: '600' },
  bubbleHostTag: { color: '#D4B0EB', fontSize: 10, fontWeight: '400' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#0e0d12' },
  bubbleTextThem: { color: '#FFFFFF' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 8 },
  bubbleTime: { color: '#8E8E9B', fontSize: 11 },
  bubbleTimeMe: { color: '#FFFFFF' },

  /* Location Box */
  locationBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, marginTop: 12, marginBottom: 4, minWidth: 200 },
  locationIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#5D35B0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  locationTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  locationDesc: { color: '#FFFFFF', fontSize: 11 },

  /* Image Bubble */
  imageBubble: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  imageBubbleMe: { alignSelf: 'flex-end' },
  imageBubbleThem: { alignSelf: 'flex-start' },
  bubbleImage: { width: width * 0.6, height: width * 0.6, borderRadius: 16 },
  mediaFallback: { backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  failedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  imageTimeBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  imageTimeText: { color: '#FFF', fontSize: 10 },

  /* Audio Bubble */
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  audioPlayBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  audioPlayBtnMe: { backgroundColor: 'rgba(212,176,235,0.2)' },
  waveformRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  audioDuration: { color: '#8E8E9B', fontSize: 11 },
  audioDurationMe: { color: 'rgba(212,176,235,0.7)' },

  /* Event Bubble */
  eventBubble: { borderRadius: 16, overflow: 'hidden', width: Math.min(width * 0.74, 310), minHeight: 190, position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  eventBubbleMe: { backgroundColor: '#2A1741', alignSelf: 'flex-end' },
  eventBubbleThem: { backgroundColor: '#151520', alignSelf: 'flex-start' },
  eventBubbleBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.72 },
  eventBubbleScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,16,0.68)' },
  eventBubbleGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, backgroundColor: 'rgba(92,53,176,0.36)' },
  eventBubbleInfo: { padding: 14, paddingBottom: 44, minHeight: 170, justifyContent: 'flex-end' },
  eventBubbleTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  eventBubbleTagText: { color: '#F0D8FF', fontSize: 11, fontWeight: '700' },
  eventBubbleTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, lineHeight: 21, marginBottom: 8 },
  eventBubbleMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 },
  eventBubbleDate: { flex: 1, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 16 },
  eventBubbleLocation: { flex: 1, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 16 },
  eventBubbleBtn: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 11, alignItems: 'center', marginTop: 8 },
  eventBubbleBtnText: { color: '#180F22', fontWeight: '800', fontSize: 13 },
  eventBubbleTimeWrap: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  eventBubbleTime: { color: 'rgba(255,255,255,0.72)', fontSize: 11 },

  /* Reactions */
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionsRowMe: { justifyContent: 'flex-end' },
  reactionsRowThem: { justifyContent: 'flex-start' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, gap: 3, borderWidth: 1, borderColor: '#2A2A3A' },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { color: '#8E8E9B', fontSize: 11, fontWeight: '600' },
  failedRetryRow: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(242,36,92,0.12)' },
  failedRetryText: { color: '#F2245C', fontSize: 11, fontWeight: '600' },

  /* Typing */
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, marginTop: 8, marginBottom: 4 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8E8E9B' },

  /* Attachment Panel */
  attachPanel: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#13131A', paddingHorizontal: 16, paddingVertical: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#1A1A2E' },
  attachItem: { width: (width - 80) / 3, alignItems: 'center', gap: 6 },
  attachIconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  attachLabel: { color: '#8E8E9B', fontSize: 12 },

  /* Pending Attachments */
  pendingTray: { backgroundColor: '#0e0d12', borderTopWidth: 1, borderTopColor: '#1A1A2E', paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  pendingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 12, padding: 8, gap: 10 },
  pendingThumb: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  pendingInfo: { flex: 1, minWidth: 0 },
  pendingTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  pendingMeta: { color: '#8E8E9B', fontSize: 11, marginTop: 2 },
  pendingMetaError: { color: '#F2245C' },
  progressTrack: { height: 3, backgroundColor: '#2A2A3A', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#D4B0EB', borderRadius: 2 },
  pendingIconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#24242C', alignItems: 'center', justifyContent: 'center' },

  /* Input Bar */
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#0e0d12', gap: 10 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, minHeight: 48 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14, maxHeight: 100, marginLeft: 10, marginRight: 10 },
  emojiBtn: { justifyContent: 'center', alignItems: 'center', width: 24 },
  fileBtn: { justifyContent: 'center', alignItems: 'center', width: 24 },
  sendBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'transparent' },
  moreMenuContainer: { position: 'absolute', right: 16 },
  moreMenuBox: { width: 210, backgroundColor: 'rgba(30, 29, 33, 0.95)', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  moreMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  moreMenuIcon: { marginRight: 12 },
  moreMenuText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  moreMenuSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  /* Message Actions */
  messageSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  messageSheet: { backgroundColor: '#0e0d12', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 22 },
  messageSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center', marginBottom: 16 },
  messageSheetTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  messageActionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderRadius: 14, paddingHorizontal: 10 },
  messageActionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  messageDeleteIcon: { backgroundColor: 'rgba(242,36,92,0.12)' },
  messageActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  messageDeleteText: { color: '#F2245C', fontSize: 15, fontWeight: '600' },
  editMessageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editMessageClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', marginTop: -8 },
  editMessageInput: { minHeight: 92, maxHeight: 180, color: '#FFFFFF', fontSize: 15, lineHeight: 21, textAlignVertical: 'top', backgroundColor: '#161616', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14 },
  editMessageSave: { minHeight: 48, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  editMessageSaveDisabled: { opacity: 0.45 },
  editMessageSaveText: { color: '#0e0d12', fontSize: 14, fontWeight: '700' },

  /* Audio Sheet */
  audioSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  audioSheet: { backgroundColor: '#0e0d12', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 22 },
  audioSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center', marginBottom: 16 },
  audioSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  audioSheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  audioSheetSubtitle: { color: '#8E8E9B', fontSize: 12, marginTop: 4 },
  audioSheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 14, padding: 12, marginBottom: 12, gap: 10 },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#454555' },
  recordDotActive: { backgroundColor: '#F2245C' },
  recordInfo: { flex: 1 },
  recordTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  recordTime: { color: '#8E8E9B', fontSize: 12, marginTop: 2 },
  recordButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 6 },
  stopButton: { backgroundColor: '#F6A6BC' },
  recordButtonText: { color: '#111111', fontSize: 13, fontWeight: '700' },
  pickAudioButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, paddingVertical: 13, gap: 8 },
  pickAudioButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

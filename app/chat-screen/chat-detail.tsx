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
import { useFocusEffect } from '@react-navigation/native';
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import EventPickerModal from '@/components/post/EventPickerModal';
import {
  blockMessages,
  deleteConversation,
  getDirectMessageHistory,
  getDirectMessageRelationship,
  getGroupMessages,
  leaveGroup,
  unblockMessages,
} from '@/lib/chat';
import { safeBack } from '@/lib/navigation';
import type { ChatFileAttachment, ChatLocationAttachment, ChatMessageAttachment, ChatMessageType, DirectChatMessageResponse, GroupMessageResponse } from '@/lib/chat';
import { getAuthErrorMessage } from '@/lib/authErrors';
import type { DirectRealtimeMessage, GroupRealtimeMessage } from '@/lib/realtime';
import * as realtimeSocket from '@/lib/socketClient';
import { getStorageFileUrl, uploadFileToStorage } from '@/lib/storage';
import { unblockUser } from '@/lib/users';
import { useAuthStore } from '@/stores/authStore';
import { useChatUnreadStore } from '@/stores/chatUnreadStore';
import { getMoment } from '@/lib/moments';
import { getStoryDetails } from '@/lib/stories';
import { createStoryViewerSession } from '@/lib/storyViewerSession';

const { width } = Dimensions.get('window');

// Shared chat design tokens.
// One sender/receiver color language reused by every message type (text, audio,
// location, event, post, story) so the chat UI reads as a single consistent system.
// Sender uses a clean deep-purple accent (not pink/mauve/magenta/washed-out lavender),
// receiver uses one neutral dark surface, and destructive/error states reuse the
// project's existing semantic danger color (Colors.dark.danger) instead of an
// arbitrary red.
const CHAT_COLORS = {
  screenBackground: '#0e0d12',
  senderAccent: '#5B3FD6',
  senderAccentSoft: '#9B8AFB',
  senderText: '#FFFFFF',
  receiverSurface: '#15151A',
  receiverBorder: 'rgba(255,255,255,0.08)',
  receiverText: '#FFFFFF',
  metadataText: 'rgba(255,255,255,0.55)',
  metadataTextOnAccent: 'rgba(255,255,255,0.78)',
  neutralIcon: '#8E8E9B',
  semanticError: Colors.dark.danger,
  semanticErrorSurface: 'rgba(255,59,48,0.14)',
  subtleSurface: 'rgba(255,255,255,0.06)',
} as const;

const validateReadableAudioFile = async (uri: string) => {
  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists || typeof fileInfo.size !== 'number' || fileInfo.size <= 0) {
    throw new Error('The audio file was empty.');
  }

  return fileInfo.size;
};

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
  postPreview?: string;
  postAuthor?: string;
  postImage?: string;
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

type SharedPostPreview = {
  mediaType: 'image' | 'video' | 'audio' | null;
  mediaUri?: string | null;
  preview?: string | null;
  authorName?: string | null;
  // Only set when mediaType === 'audio'. The moment model has no waveform
  // data (neither this screen's own AudioBubble nor the feed's AudioFeedPlayer
  // have real waveform data either — both render a static bar pattern driven
  // by playback progress), so duration is all that's needed to reuse that
  // same pattern here.
  audioDurationSeconds?: number | null;
};

const sharedPostPreviewCache = new Map<string, SharedPostPreview>();
const sharedPostPreviewRequests = new Map<string, Promise<SharedPostPreview>>();

const WAVEFORM_HEIGHTS = [8, 14, 20, 12, 28, 16, 24, 10, 18, 22, 14, 26, 8, 20, 16, 12, 24, 18, 10, 14];

// Ensures only one chat audio player (a regular AudioBubble message, or a
// shared-post's inline audio player) plays at a time, and lets a single
// AppState listener in the main screen pause whichever one is currently
// active without every player needing its own AppState subscription. Kept
// as a small module-level coordinator (same pattern as sharedPostPreviewCache
// above) rather than a new global audio architecture.
const activeChatAudio: { id: string | null; pause: (() => void) | null } = { id: null, pause: null };

const setActiveChatAudio = (id: string, pause: () => void) => {
  if (activeChatAudio.id && activeChatAudio.id !== id) {
    try {
      activeChatAudio.pause?.();
    } catch {
      // Ignore — the previously active player may already be torn down.
    }
  }
  activeChatAudio.id = id;
  activeChatAudio.pause = pause;
};

const clearActiveChatAudio = (id: string) => {
  if (activeChatAudio.id === id) {
    activeChatAudio.id = null;
    activeChatAudio.pause = null;
  }
};

const pauseActiveChatAudio = () => {
  try {
    activeChatAudio.pause?.();
  } catch {
    // Ignore — the underlying player may already be torn down.
  }
};

const COMMON_EMOJIS = [
  '😀','😂','🥹','😊','😍','🥰','😘','😎','😅','🙏',
  '❤️','🔥','👍','👏','🎉','✨','💯','🙌','💪','🤣',
  '😭','😢','😤','😠','😱','🤔','🫶','😴','🤩','🥳',
  '🌹','🌸','💐','🍕','🍔','🎂','🎁','⚽','🏆','🌟',
  '👀','💀','🫠','🥺','😬','🤯','🫡','🤝','✌️','🤞',
  '🐶','🐱','🐻','🦊','🐼','🦁','🐸','🐧','🦋','🌈',
];

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
  if (attachment.type === 'post') {
    return attachment.imageUrl ?? null;
  }
  return undefined;
};

const getSharedPostMediaUri = (mediaItem: { url?: string | null; storageKey?: string | null; contentType?: string | null }) => {
  if (mediaItem.url?.trim()) {
    return mediaItem.url;
  }

  if (mediaItem.storageKey?.trim()) {
    try {
      return getStorageFileUrl(mediaItem.storageKey, mediaItem.contentType);
    } catch {
      return null;
    }
  }

  return null;
};

const loadSharedPostPreview = (postId: string) => {
  const cached = sharedPostPreviewCache.get(postId);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = sharedPostPreviewRequests.get(postId);
  if (pending) {
    return pending;
  }

  const request = getMoment(postId)
    .then((moment): SharedPostPreview => {
      const mediaItem = moment.mediaItems?.find(
        (item) => item.type === 'image' || item.type === 'video' || item.type === 'audio',
      ) ?? null;
      const preview: SharedPostPreview = {
        mediaType: mediaItem?.type ?? null,
        mediaUri: mediaItem ? getSharedPostMediaUri(mediaItem) : null,
        preview: moment.caption?.trim() || null,
        authorName: moment.author?.name ?? null,
        audioDurationSeconds: mediaItem?.type === 'audio' ? mediaItem.durationSeconds ?? null : null,
      };

      sharedPostPreviewCache.set(postId, preview);
      return preview;
    })
    .catch(() => {
      const fallback: SharedPostPreview = {
        mediaType: null,
        mediaUri: null,
        preview: null,
        authorName: null,
      };

      sharedPostPreviewCache.set(postId, fallback);
      return fallback;
    })
    .finally(() => {
      sharedPostPreviewRequests.delete(postId);
    });

  sharedPostPreviewRequests.set(postId, request);
  return request;
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

  if (attachment?.type === 'post') {
    message.postPreview = attachment.preview || text || 'Shared post';
    message.postAuthor = attachment.authorName || 'Mooment user';
    message.postImage = previewUri || undefined;
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
  const { colors, isDark } = useTheme();
  const isHostMsg = !msg.fromMe && msg.isHost;
  const locationAttachment = msg.attachment?.type === 'location' ? msg.attachment : null;
  // Outgoing bubbles keep their existing purple brand identity unchanged in
  // both themes — only the incoming/receiver side (which used a near-black
  // surface unconditionally) needs a light-mode surface.
  const isIncomingLight = !msg.fromMe && !isDark;

  return (
    <View
      style={[
        styles.bubble,
        msg.fromMe ? styles.bubbleMe : (isHostMsg ? styles.bubbleHost : styles.bubbleThem),
        isIncomingLight && { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {msg.text ? (
        <Text
          style={[
            styles.bubbleText,
            msg.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem,
            isIncomingLight && { color: colors.text },
          ]}
        >
          {msg.text}
        </Text>
      ) : null}

      {/* Location Attachment */}
      {msg.locationTitle && (
        <TouchableOpacity
          style={[styles.locationBox, isIncomingLight && { backgroundColor: colors.backgroundSecondary }]}
          activeOpacity={0.8}
          onPress={() => {
            if (locationAttachment) {
              openMapLocation(locationAttachment.latitude, locationAttachment.longitude, locationAttachment.label);
            }
          }}
        >
          <View style={[styles.locationIconWrap, msg.fromMe && styles.locationIconWrapMe]}>
            <Feather name="map-pin" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.locationTitle, isIncomingLight && { color: colors.text }]}>{msg.locationTitle}</Text>
            <Text style={[styles.locationDesc, isIncomingLight && { color: colors.textSecondary }]}>{msg.locationDesc}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* One shared bottom-right metadata row for timestamp/edited/delivered state,
          reused by text, audio, event, post, and story cards. */}
      <View style={styles.bubbleMeta}>
        {msg.editedAt ? (
          <Text style={[styles.bubbleTime, msg.fromMe && styles.bubbleTimeMe, isIncomingLight && { color: colors.textSecondary }]}>
            Edited •{' '}
          </Text>
        ) : null}
        <Text style={[styles.bubbleTime, msg.fromMe && styles.bubbleTimeMe, isIncomingLight && { color: colors.textSecondary }]}>
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
  // VIDEO MESSAGE PLAYBACK UI TEMPORARILY HIDDEN
  // The interactive expo-video player (VideoView/useVideoPlayer/nativeControls) has been
  // replaced with a static, non-interactive placeholder — no player is mounted and there
  // is no play button. This is a frontend-only rendering change: the 'video' message type,
  // Message/ChatMessageType support, and backend/API acceptance of video messages are all
  // untouched, so existing video messages keep their row/timestamp/grouping behavior and
  // can regain a real player again later by restoring this component's previous body.
  return (
    <View style={[styles.imageBubble, msg.fromMe ? styles.imageBubbleMe : styles.imageBubbleThem]}>
      <View style={[styles.bubbleImage, styles.mediaFallback]}>
        <Feather name="video-off" size={28} color={CHAT_COLORS.neutralIcon} />
        <Text style={styles.videoPlaceholderText}>Video unavailable</Text>
      </View>
      <View style={styles.imageTimeBadge}>
        <Text style={styles.imageTimeText}>{msg.time}</Text>
      </View>
    </View>
  );
}

function AudioBubble({ msg }: { msg: Message }) {
  const { colors, isDark } = useTheme();
  // Outgoing (purple) side is unchanged in both themes; only the incoming
  // side's play button/waveform/duration (previously white-on-white-ish
  // once the bubble itself gets a light surface) need to flip to a dark
  // foreground in light mode.
  const isIncomingLight = !msg.fromMe && !isDark;
  const [loadFailed, setLoadFailed] = useState(false);
  const playbackPromiseRef = useRef<Promise<void> | null>(null);
  const audioSource = useMemo(() => (msg.mediaUri ? { uri: msg.mediaUri } : null), [msg.mediaUri]);
  const player = useAudioPlayer(audioSource, { downloadFirst: false, updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : msg.attachment?.type === 'audio' ? msg.attachment.durationSeconds ?? 0 : 0;
  const currentTime = duration > 0 ? Math.min(status.currentTime, duration) : status.currentTime;
  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.round(progress * WAVEFORM_HEIGHTS.length);

  useEffect(() => {
    if (!status.playing) {
      clearActiveChatAudio(msg.id);
    }
  }, [msg.id, status.playing]);

  useEffect(() => () => {
    clearActiveChatAudio(msg.id);
    try {
      player.pause();
    } catch {
      // Ignore cleanup failures during native player teardown.
    }
  }, [msg.id, player]);

  const handleTogglePlayback = async () => {
    if (!msg.mediaUri) return;
    if (playbackPromiseRef.current) return;

    const playbackPromise = (async () => {
      if (status.playing) {
        player.pause();
        clearActiveChatAudio(msg.id);
        return;
      }

      setLoadFailed(false);
      if (duration > 0 && currentTime >= duration - 0.25) {
        await player.seekTo(0);
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      player.muted = false;
      if (player.volume <= 0) {
        player.volume = 1;
      }
      setActiveChatAudio(msg.id, () => player.pause());
      player.play();
    })();

    playbackPromiseRef.current = playbackPromise;

    try {
      await playbackPromise;
    } catch (error) {
      clearActiveChatAudio(msg.id);
      setLoadFailed(true);
      Alert.alert('Unable to play audio', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      playbackPromiseRef.current = null;
    }
  };

  const audioFgColor = isIncomingLight ? colors.text : CHAT_COLORS.senderText;

  return (
    <View
      style={[
        styles.bubble,
        msg.fromMe ? styles.bubbleMe : styles.bubbleThem,
        styles.audioBubble,
        isIncomingLight && { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.audioPlayBtn,
          msg.fromMe && styles.audioPlayBtnMe,
          isIncomingLight && { backgroundColor: colors.backgroundSecondary },
        ]}
        onPress={handleTogglePlayback}
        activeOpacity={0.8}
        disabled={!msg.mediaUri}
      >
        {loadFailed ? (
          <Feather name="alert-circle" size={16} color={audioFgColor} />
        ) : (
          <Ionicons name={status.playing ? 'pause' : 'play'} size={16} color={audioFgColor} style={{ marginLeft: status.playing ? 0 : 2 }} />
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
                ? { backgroundColor: audioFgColor }
                : { backgroundColor: isIncomingLight ? colors.border : 'rgba(255,255,255,0.32)' },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioDuration, msg.fromMe && styles.audioDurationMe, isIncomingLight && { color: colors.textSecondary }]}>{msg.audioDuration}</Text>
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
          <Ionicons name="calendar-outline" size={11} color={CHAT_COLORS.senderText} />
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
              router.push({ pathname: '/event-screen/event', params: { eventId } } as any);
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

// Inline audio player for a shared POST whose underlying moment is an audio
// recording. Mirrors AudioBubble's playback logic (same expo-audio hooks,
// same restart-from-beginning-on-completion behavior, same waveform/duration
// styling) rather than a separate audio engine. Rendered only when the
// resolved shared post is actually an audio post with a real URI — never
// mounted for image/video/text shared posts, so it never allocates a player
// for the common case.
function SharedPostAudioPlayer({
  playerId,
  uri,
  durationSeconds,
  fromMe,
}: {
  playerId: string;
  uri: string;
  durationSeconds?: number | null;
  fromMe: boolean;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const playbackPromiseRef = useRef<Promise<void> | null>(null);
  const audioSource = useMemo(() => ({ uri }), [uri]);
  const player = useAudioPlayer(audioSource, { downloadFirst: false, updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : durationSeconds ?? 0;
  const currentTime = duration > 0 ? Math.min(status.currentTime, duration) : status.currentTime;
  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = Math.round(progress * WAVEFORM_HEIGHTS.length);

  useEffect(() => {
    if (!status.playing) {
      clearActiveChatAudio(playerId);
    }
  }, [playerId, status.playing]);

  useEffect(() => () => {
    clearActiveChatAudio(playerId);
    try {
      player.pause();
    } catch {
      // Ignore cleanup failures during native player teardown.
    }
  }, [playerId, player]);

  const handleTogglePlayback = async () => {
    if (playbackPromiseRef.current) return;

    const playbackPromise = (async () => {
      if (status.playing) {
        player.pause();
        clearActiveChatAudio(playerId);
        return;
      }

      setLoadFailed(false);
      if (duration > 0 && currentTime >= duration - 0.25) {
        await player.seekTo(0);
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      player.muted = false;
      if (player.volume <= 0) {
        player.volume = 1;
      }
      setActiveChatAudio(playerId, () => player.pause());
      player.play();
    })();

    playbackPromiseRef.current = playbackPromise;

    try {
      await playbackPromise;
    } catch (error) {
      clearActiveChatAudio(playerId);
      setLoadFailed(true);
      Alert.alert('Unable to play audio', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      playbackPromiseRef.current = null;
    }
  };

  return (
    <View style={styles.sharedPostAudioFrame}>
      <TouchableOpacity
        style={[styles.audioPlayBtn, fromMe && styles.audioPlayBtnMe]}
        onPress={handleTogglePlayback}
        activeOpacity={0.8}
      >
        {loadFailed ? (
          <Feather name="alert-circle" size={16} color={CHAT_COLORS.senderText} />
        ) : (
          <Ionicons
            name={status.playing ? 'pause' : 'play'}
            size={16}
            color={CHAT_COLORS.senderText}
            style={{ marginLeft: status.playing ? 0 : 2 }}
          />
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
                ? { backgroundColor: CHAT_COLORS.senderText }
                : { backgroundColor: 'rgba(255,255,255,0.32)' },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.audioDuration, fromMe && styles.audioDurationMe]}>{formatSeconds(duration)}</Text>
    </View>
  );
}

function PostBubble({ msg }: { msg: Message }) {
  const router = useRouter();
  const postId = msg.attachment?.type === 'post' ? msg.attachment.postId : null;
  const [resolvedPreview, setResolvedPreview] = useState<SharedPostPreview | null>(() => (
    postId ? sharedPostPreviewCache.get(postId) ?? null : null
  ));

  useEffect(() => {
    if (!postId || msg.postImage) {
      return;
    }

    let isMounted = true;
    const cached = sharedPostPreviewCache.get(postId);

    if (cached) {
      setResolvedPreview(cached);
      return;
    }

    loadSharedPostPreview(postId).then((preview) => {
      if (isMounted) {
        setResolvedPreview(preview);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [msg.postImage, postId]);

  const mediaUri = msg.postImage ?? resolvedPreview?.mediaUri ?? null;
  const isVideoPost = resolvedPreview?.mediaType === 'video';
  const isAudioPost = resolvedPreview?.mediaType === 'audio';
  const canPlayAudio = isAudioPost && Boolean(mediaUri);
  const postLabel = isVideoPost ? 'Shared video post' : isAudioPost ? 'Shared audio post' : 'POST';
  const postAuthor = resolvedPreview?.authorName || msg.postAuthor;
  const postPreview = resolvedPreview?.preview || msg.postPreview
    || (isVideoPost ? 'Shared video post' : isAudioPost ? 'Shared audio post' : 'Shared post');

  return (
    <TouchableOpacity
      style={[styles.sharedPostBubble, msg.fromMe ? styles.eventBubbleMe : styles.eventBubbleThem]}
      activeOpacity={0.82}
      onPress={() => postId && router.push({ pathname: '/post-screen/view-post', params: { postId } } as any)}
    >
      <View style={styles.sharedPostMediaFrame}>
        {canPlayAudio ? (
          <SharedPostAudioPlayer
            playerId={msg.id}
            uri={mediaUri as string}
            durationSeconds={resolvedPreview?.audioDurationSeconds}
            fromMe={msg.fromMe}
          />
        ) : mediaUri ? (
          <Image source={{ uri: mediaUri }} style={styles.sharedPostImage} resizeMode="cover" />
        ) : (
          <View style={[styles.sharedPostImage, styles.mediaFallback]}>
            <Feather name={isVideoPost ? 'play-circle' : isAudioPost ? 'music' : 'file-text'} size={28} color="#8E8E9B" />
          </View>
        )}
        {isVideoPost ? (
          <View pointerEvents="none" style={styles.sharedPostPlayBadge}>
            <Feather name="play" size={18} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <View style={styles.sharedPostInfo}>
        <Text style={styles.eventBubbleTagText}>{postLabel}</Text>
        <Text style={styles.sharedPostAuthor} numberOfLines={1}>{postAuthor}</Text>
        <Text style={styles.sharedPostPreview} numberOfLines={3}>{postPreview}</Text>
        <Text style={styles.eventBubbleTime}>{msg.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const STORY_LINK_REGEX = /^https:\/\/mooment\.app\/stories\/([a-f\d]{24})$/i;

function StoryBubble({ msg, storyId }: { msg: Message; storyId: string }) {
  const router = useRouter();
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.75,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    getStoryDetails(storyId)
      .then((data) => {
        if (active) {
          setStory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.warn("Failed to load story for chat preview", err);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [storyId]);

  const handlePress = () => {
    if (!story) return;

    const viewerGroup = {
      title: story.author?.name || 'Story',
      authorId: story.userId,
      authorAvatar: story.author?.avatarUrl ?? null,
      stories: [{
        id: story.id,
        mediaType: story.mediaType,
        mediaUri: story.mediaUrl,
        contentType: story.contentType,
        durationSeconds: story.durationSeconds || 15,
        caption: story.caption,
        textContent: story.textContent,
        textBackground: story.textBackground,
        textOverlay: story.textOverlay,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewsCount: story.viewsCount,
        reactionsCount: story.reactionsCount,
        commentsCount: story.commentsCount,
        isReacted: story.isReacted,
        isOwner: story.isOwner,
        authorId: story.userId,
        authorName: story.author?.name || 'Story',
        authorAvatar: story.author?.avatarUrl ?? null,
      }]
    };

    const sessionId = createStoryViewerSession([viewerGroup]);
    router.push({
      pathname: '/post-screen/view-story',
      params: { storySessionId: sessionId, groupIndex: 0 },
    } as any);
  };

  if (loading) {
    return (
      <Animated.View
        style={[
          styles.sharedPostBubble,
          msg.fromMe ? styles.eventBubbleMe : styles.eventBubbleThem,
          { flexDirection: 'row', alignItems: 'center', padding: 8, minHeight: 76, opacity: pulseAnim }
        ]}
      >
        <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
        <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
          <View style={{ width: 45, height: 10, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.16)' }} />
          <View style={{ width: '60%', height: 14, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
          <View style={{ width: '85%', height: 12, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
        </View>
      </Animated.View>
    );
  }

  if (error || !story) {
    return (
      <View style={[styles.sharedPostBubble, msg.fromMe ? styles.eventBubbleMe : styles.eventBubbleThem, { alignItems: 'center', justifyContent: 'center', minHeight: 60, flexDirection: 'row', paddingHorizontal: 16 }]}>
        <Feather name="alert-circle" size={16} color="#FF4D4D" style={{ marginRight: 6 }} />
        <Text style={{ color: '#E2E2EA', fontSize: 13, fontWeight: '600' }}>Story unavailable or expired</Text>
      </View>
    );
  }

  const hasThumbnail = story.mediaType === 'image' || story.mediaType === 'video';

  return (
    <TouchableOpacity
      style={[styles.sharedPostBubble, msg.fromMe ? styles.eventBubbleMe : styles.eventBubbleThem]}
      activeOpacity={0.82}
      onPress={handlePress}
    >
      {hasThumbnail && story.mediaUrl ? (
        <Image source={{ uri: story.mediaUrl }} style={styles.sharedPostImage} />
      ) : (
        <View style={[styles.sharedPostImage, styles.mediaFallback, story.mediaType === 'text' && { backgroundColor: story.textBackground?.colors[0] ?? '#37214F' }]}>
          <Feather name="film" size={24} color="#8E8E9B" />
        </View>
      )}
      <View style={styles.sharedPostInfo}>
        <Text style={styles.eventBubbleTagText}>STORY</Text>
        <Text style={styles.sharedPostAuthor} numberOfLines={1}>{story.author?.name || 'Mooment user'}</Text>
        <Text style={styles.sharedPostPreview} numberOfLines={2}>
          {story.mediaType === 'text' ? story.textContent : (story.caption || 'Shared story')}
        </Text>
        <Text style={styles.eventBubbleTime}>{msg.time}</Text>
      </View>
    </TouchableOpacity>
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
              <Feather name="calendar" size={22} color={CHAT_COLORS.senderAccentSoft} />
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
  const insets = useSafeAreaInsets();
  const recorderRef = useRef<any>(null);
  const audioModuleRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const stopPromiseRef = useRef<Promise<{ uri: string | null; duration: number } | null> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMillis, setDurationMillis] = useState(0);
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, 22)
    : Math.max(insets.bottom, 32);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      recordingStartedAtRef.current = null;
      void recorder?.stop?.().catch(() => undefined);
      void audioModuleRef.current?.setAudioModeAsync?.({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      }).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const status = recorderRef.current?.getStatus?.();
      const nextDuration = status?.durationMillis
        ?? (recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0);
      setDurationMillis((current) => (
        Math.floor(current / 1000) === Math.floor(nextDuration / 1000)
          ? current
          : nextDuration
      ));
    }, 250);

    return () => clearInterval(interval);
  }, [isRecording]);

  const stopRecorder = async () => {
    if (stopPromiseRef.current) return stopPromiseRef.current;

    const recorder = recorderRef.current;
    if (!recorder) return null;

    if (mountedRef.current) setIsStopping(true);

    const stopPromise = (async () => {
      const fallbackStatus = recorder.getStatus?.();
      const fallbackUri = recorder.uri ?? fallbackStatus?.url ?? null;
      const fallbackDuration = fallbackStatus?.durationMillis
        ?? (recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : durationMillis);
      const stopResult = await recorder.stop();
      const finalStatus = stopResult && typeof stopResult === 'object' ? stopResult : undefined;
      const uri = finalStatus?.url ?? fallbackUri;
      const duration = finalStatus?.durationMillis ?? fallbackDuration;

      await audioModuleRef.current?.setAudioModeAsync?.({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      }).catch(() => undefined);

      recorderRef.current = null;
      recordingStartedAtRef.current = null;

      if (mountedRef.current) {
        setIsRecording(false);
        setIsStopping(false);
      }

      return { uri, duration };
    })().finally(() => {
      stopPromiseRef.current = null;
      if (mountedRef.current) setIsStopping(false);
    });

    stopPromiseRef.current = stopPromise;
    return stopPromise;
  };

  const startRecording = async () => {
    if (startPromiseRef.current || stopPromiseRef.current || isPreparing || isRecording) return;
    setIsPreparing(true);

    const startPromise = (async () => {
      const audio = await import('expo-audio') as any;
      const permission = await audio.requestRecordingPermissionsAsync();
      audioModuleRef.current = audio;

      if (!permission.granted) {
        Alert.alert('Microphone access needed', 'Please allow microphone access to record audio.');
        return;
      }

      await audio.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      const NativeRecorder = audio.AudioModule?.AudioRecorder;

      if (!NativeRecorder) {
        await audio.setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'doNotMix',
        }).catch(() => undefined);
        Alert.alert('Recording unavailable', 'Audio recording is not available in this build. You can choose an audio file instead.');
        return;
      }

      const recorder = new NativeRecorder(audio.RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      recorder.record();
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();

      if (mountedRef.current) {
        setDurationMillis(0);
        setIsRecording(true);
      }
    })();

    startPromiseRef.current = startPromise;

    try {
      await startPromise;
    } catch (error) {
      await audioModuleRef.current?.setAudioModeAsync?.({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      }).catch(() => undefined);
      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try recording again.'));
    } finally {
      startPromiseRef.current = null;
      if (mountedRef.current) setIsPreparing(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording || isStopping) return;

    try {
      const recording = await stopRecorder();
      if (!recording?.uri) {
        Alert.alert('Recording failed', 'No recorded audio file was created.');
        return;
      }

      if (!recording.duration || recording.duration <= 0) {
        Alert.alert('Recording failed', 'The recorded audio was too short. Please try recording again.');
        return;
      }

      await validateReadableAudioFile(recording.uri);

      onRecorded(recording.uri, recording.duration ? recording.duration / 1000 : null);
      onClose();
    } catch (error) {
      Alert.alert('Recording failed', getAuthErrorMessage(error, 'Please try stopping the recording again.'));
    }
  };

  const closeSheet = async () => {
    if (isRecording || stopPromiseRef.current) {
      await stopRecorder().catch(() => undefined);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.audioSheetOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeSheet} disabled={isStopping} />
        <View style={[styles.audioSheet, { paddingBottom: bottomInset }]}>
          <View style={styles.audioSheetHandle} />
          <View style={styles.audioSheetHeader}>
            <View>
              <Text style={styles.audioSheetTitle}>Audio</Text>
              <Text style={styles.audioSheetSubtitle}>Record or choose audio</Text>
            </View>
            <TouchableOpacity onPress={closeSheet} style={styles.audioSheetClose} activeOpacity={0.8} disabled={isStopping}>
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
              disabled={isPreparing || isStopping}
            >
              <Feather name={isRecording ? 'square' : 'mic'} size={16} color="#111111" />
              <Text style={styles.recordButtonText}>{isRecording ? (isStopping ? 'Wait' : 'Stop') : isPreparing ? 'Wait' : 'Record'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.pickAudioButton, isRecording && { opacity: 0.45 }]}
            onPress={onPickAudio}
            activeOpacity={0.85}
            disabled={isRecording || isStopping}
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
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string; avatar: string; isGroup?: string; isOnline?: string; isBlocked?: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [isFriendOnline, setIsFriendOnline] = useState(params.isOnline === 'true');
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  // Two entirely separate block systems, four directional booleans total.
  // Full/Profile Block (existing UserBlockModel, managed from Profile) is
  // the stronger restriction — its UI takes precedence whenever present.
  // Message Block (new DirectMessageBlock, managed from this Chat menu) is
  // a lighter, Chat-only restriction. The nav param (`params.isBlocked`)
  // only ever reflects "I fully blocked them" (the DM list's isBlocked is
  // computed the same way — see xenog-api chat.service.ts), so it seeds
  // fullBlockedByMe as a reasonable initial value while the authoritative
  // combined fetch below is in flight.
  const [fullBlockedByMe, setFullBlockedByMe] = useState(params.isBlocked === 'true');
  const [fullBlockedMe, setFullBlockedMe] = useState(false);
  const [messageBlockedByMe, setMessageBlockedByMe] = useState(false);
  const [messageBlockedMe, setMessageBlockedMe] = useState(false);
  const [directAccessError, setDirectAccessError] = useState<string | null>(null);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isLeaveLoading, setIsLeaveLoading] = useState(false);
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
  const ownTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSendingTypingRef = useRef(false);
  const isLocationLoadingRef = useRef(false);
  const isAudioPickerOpeningRef = useRef(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Chat audio (AudioBubble and shared-post audio) must never keep playing
  // once this screen isn't the active, foregrounded surface — no background
  // playback is allowed for this feature. Pausing here (rather than per
  // player) covers backgrounding, leaving this screen, and unmount in one
  // place via the shared coordinator. Foreground does NOT auto-resume —
  // that's intentional, the user must press Play again.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        pauseActiveChatAudio();
      }
    });

    return () => {
      subscription.remove();
      pauseActiveChatAudio();
    };
  }, []);

  const toggleEmojiPicker = () => {
    const next = !showEmojiPicker;
    if (next) {
      Keyboard.dismiss();
      setShowAttach(false);
    }
    setShowEmojiPicker(next);
  };

  const insertEmoji = (emoji: string) => {
    handleInputTextChange(inputText + emoji);
  };

  const name = params.name || 'Chat';
  const avatar = params.avatar?.trim() || null;
  const friendId = params.id;
  const isGroup = params.isGroup === 'true';
  const isDirectRecipientInvalid = !isGroup && !isObjectId(friendId);
  const isSelfDirectConversation = !isGroup && Boolean(currentUser?.id && friendId === currentUser.id);
  // Either block system, either direction, makes messaging unavailable —
  // matches xenog-api's assertCanSendDirectMessage (Full Block OR Message
  // Block, either direction).
  const isFullBlocked = fullBlockedByMe || fullBlockedMe;
  const isMessageBlocked = messageBlockedByMe || messageBlockedMe;
  const isDirectChatUnavailable =
    !isGroup && (isDirectRecipientInvalid || isSelfDirectConversation || isFullBlocked || isMessageBlocked || Boolean(directAccessError));
  // Distinct from isDirectChatUnavailable (which also covers invalid-recipient/
  // self-chat/fetch-error cases that already navigate the user back out via
  // Alert.alert) — this specifically gates the blocked-state banner that
  // replaces the composer.
  const isBlockedConversation = !isGroup && (isFullBlocked || isMessageBlocked);

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
    // VIDEO MESSAGING TEMPORARILY DISABLED
    // Frontend creation/upload is intentionally hidden.
    // Backend/API/video rendering support is preserved for future re-enablement.
    // This is the single client-side choke point for all attachment creation (camera,
    // gallery, retry), so gating 'video' here blocks every frontend path from creating
    // a new video attachment without touching the 'image'/'audio' branches.
    if (file.type === 'video') {
      Alert.alert('Video unavailable', 'Sending videos is temporarily unavailable.');
      return;
    }

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
      // VIDEO MESSAGING TEMPORARILY DISABLED
      // Frontend creation/upload is intentionally hidden: the gallery picker is restricted
      // to images only ('videos' removed from mediaTypes below) so users can no longer
      // select a video from their library. videoExportPreset is left in place (unused while
      // mediaTypes excludes videos) so video support is trivial to restore later.
      mediaTypes: ['images'],
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

  // VIDEO MESSAGING TEMPORARILY DISABLED
  // Frontend creation/upload is intentionally hidden. This function's 'video' branch is
  // preserved for future re-enablement, but handleCamera below no longer offers a "Video"
  // option, so in practice this is only ever invoked with type: 'image' today.
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

  // VIDEO MESSAGING TEMPORARILY DISABLED
  // Frontend creation/upload is intentionally hidden: the "Video" chooser option has been
  // removed below so the camera can only capture photos.
  // Backend/API/video rendering support is preserved for future re-enablement.
  const handleCamera = () => {
    Alert.alert('Camera', 'Capture a photo.', [
      { text: 'Photo', onPress: () => void launchCameraForType('image') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePickAudioFile = async () => {
    if (isAudioPickerOpeningRef.current) return;

    isAudioPickerOpeningRef.current = true;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      await validateReadableAudioFile(asset.uri);
      setIsAudioPickerVisible(false);
      setShowAttach(false);
      void enqueueFileAttachment({
        type: 'audio',
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.name,
        size: asset.size,
      });
    } catch (error) {
      Alert.alert('Unable to choose audio', getAuthErrorMessage(error, 'Please choose another audio file.'));
    } finally {
      isAudioPickerOpeningRef.current = false;
    }
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
    if (!isObjectId(friendId) || isDirectChatUnavailable || isSendingTypingRef.current === nextIsTyping) {
      return;
    }

    isSendingTypingRef.current = nextIsTyping;
    realtimeSocket.sendDirectTyping(friendId, nextIsTyping);
  };

  const stopOwnTyping = () => {
    clearOwnTypingStopTimer();
    sendOwnTypingState(false);
  };

  const handleInputTextChange = (value: string) => {
    setInputText(value);

    if (!isObjectId(friendId) || isGroup || isDirectChatUnavailable) {
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
      if (!isGroup) {
        const message = 'This conversation is unavailable.';
        setDirectAccessError(message);
        Alert.alert('Chat unavailable', message, [
          { text: 'OK', onPress: () => safeBack(router, '/(tabs)/messages') },
        ]);
      }
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    if (isSelfDirectConversation) {
      setDirectAccessError('You cannot message yourself.');
      setMessages([]);
      setIsLoadingMessages(false);
      Alert.alert('Chat unavailable', 'You cannot message yourself.', [
        { text: 'OK', onPress: () => safeBack(router, '/(tabs)/messages') },
      ]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);
    setDirectAccessError(null);

    const loadMessageHistory = async () => {
      try {
        if (isGroup) {
          const history = await getGroupMessages(friendId);

          if (!isMounted) return;

          setMessages(history.map((message) => toGroupApiTextMessage(message, currentUser?.id)));
        } else {
          const history = await getDirectMessageHistory(friendId);

          if (!isMounted) return;

          setDirectAccessError(null);
          setMessages(history.map((message) => toApiTextMessage(message, currentUser?.id)));
        }
        setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }), 100);
      } catch (error) {
        if (isMounted) {
          if (!isGroup) {
            const message = getAuthErrorMessage(error, 'You cannot open this chat.');
            setDirectAccessError(message);
            Alert.alert('Chat unavailable', message, [
              { text: 'OK', onPress: () => safeBack(router, '/(tabs)/messages') },
            ]);
          }
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
  }, [currentUser?.id, friendId, isGroup, isSelfDirectConversation, router]);

  // Combined Full Block + Message Block directional state (four booleans,
  // one request) via the chat module's own relationship endpoint — see
  // xenog-api chat.service.ts's getDirectMessageRelationship for why this
  // is chat-owned rather than extending GET /users/:id (avoids a
  // user-module -> chat-module circular dependency, since chat already
  // depends on user). Runs on focus (not just mount) so returning to an
  // already-open thread after blocking/being blocked/unblocking elsewhere
  // reflects the authoritative state without requiring an app restart.
  useFocusEffect(
    useCallback(() => {
      if (isGroup || !isObjectId(friendId)) {
        return;
      }

      let isMounted = true;

      getDirectMessageRelationship(friendId)
        .then((relationship) => {
          if (!isMounted) return;
          setFullBlockedByMe(relationship.fullBlockedByMe);
          setFullBlockedMe(relationship.fullBlockedMe);
          setMessageBlockedByMe(relationship.messageBlockedByMe);
          setMessageBlockedMe(relationship.messageBlockedMe);
        })
        .catch(() => {
          // Leave whatever state is already known (e.g. the nav param's
          // seeded fullBlockedByMe value) — a failed refresh shouldn't flip
          // a possibly-correct state to unknown/false.
        });

      return () => {
        isMounted = false;
      };
    }, [friendId, isGroup]),
  );

  // Best-effort catch-up refresh after a *re*connect — Socket.IO reconnecting
  // does not replay events missed while disconnected, so re-fetch the open
  // thread's latest page. Deliberately silent (no alert/spinner): this is a
  // background reconciliation, not the initial load, which already has its
  // own error handling above.
  const refetchOpenThreadOnReconnect = useCallback(async () => {
    if (!isObjectId(friendId) || isSelfDirectConversation) return;

    try {
      if (isGroup) {
        const history = await getGroupMessages(friendId);
        setMessages(history.map((message) => toGroupApiTextMessage(message, currentUser?.id)));
      } else {
        const history = await getDirectMessageHistory(friendId);
        setMessages(history.map((message) => toApiTextMessage(message, currentUser?.id)));
      }
    } catch {
      // Leave the current in-memory state as-is; the next successful
      // reconnect or manual re-entry into the chat will retry.
    }
  }, [currentUser?.id, friendId, isGroup, isSelfDirectConversation]);

  useEffect(() => {
    if (!accessToken || !isObjectId(friendId)) {
      return;
    }

    const unsubscribe = realtimeSocket.subscribe({
      onReconnected: () => {
        void refetchOpenThreadOnReconnect();
      },
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
            setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
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
            setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
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
      // Every server-side error for message creation is also reported via
      // the send ack (see sendRealtimeMessage below), which marks the exact
      // clientMessageId as failed instead of sweeping every "sending"
      // message. Edit/delete failures are likewise handled at their call
      // sites via the ack. This handler is kept for forward compatibility
      // with any future server-emitted error that has no ack counterpart,
      // but intentionally does not duplicate the alert/sweep those paths
      // already do.
      onError: (error) => {
        if (error.code === 'MESSAGE_EDIT_FAILED' || error.code === 'MESSAGE_DELETE_FAILED') {
          return;
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

    return () => {
      clearOwnTypingStopTimer();
      if (!isGroup && isObjectId(friendId) && isSendingTypingRef.current) {
        realtimeSocket.sendDirectTyping(friendId, false);
        isSendingTypingRef.current = false;
      }
      unsubscribe();
    };
  }, [accessToken, clearDirectUnread, currentUser?.id, friendId, isGroup, refetchOpenThreadOnReconnect]);

  // Ack is used only to detect FAILURE quickly (instead of waiting on the
  // generic onError side-channel, or indefinitely if the socket never
  // recovers). Success reconciliation is intentionally left to the existing
  // onDirectMessage/onGroupMessage broadcast-echo handler above, which
  // already replaces the optimistic entry with the fully-detailed realtime
  // payload (senderName, etc.) that the ack response does not carry.
  const sendRealtimeMessage = (
    clientMessageId: string,
    text: string,
    options?: { type?: ChatMessageType; attachment?: ChatMessageAttachment },
  ) => {
    const ackPromise = isGroup
      ? realtimeSocket.sendGroupMessage(friendId, text, clientMessageId, options)
      : realtimeSocket.sendDirectMessage(friendId, text, clientMessageId, options);

    const markFailed = (errorMessage?: string) => {
      setMessages((prev) =>
        prev.map((item) =>
          item.clientMessageId === clientMessageId && item.deliveryState === 'sending'
            ? { ...item, deliveryState: 'failed', delivered: false }
            : item,
        ),
      );
      if (errorMessage) {
        Alert.alert('Message failed', errorMessage);
      }
    };

    ackPromise
      .then((ack) => {
        if (!ack.ok) {
          markFailed(ack.message);
        }
      })
      .catch(() => markFailed());
  };

  const sendMessage = () => {
    if (isDirectChatUnavailable) {
      Alert.alert(
        'Chat unavailable',
        directAccessError
          ?? (isSelfDirectConversation
            ? 'You cannot message yourself.'
            : 'You cannot message this user.'),
      );
      return;
    }

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
          sendRealtimeMessage(clientMessageId, text);
        }
      } else {
        stopOwnTyping();
        if (isObjectId(friendId)) {
          sendRealtimeMessage(clientMessageId, text);
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

        if (isObjectId(friendId)) {
          sendRealtimeMessage(clientMessageId, messageText, { type: attachment.type, attachment });
        }
      });

      if (!isGroup) {
        stopOwnTyping();
      }
    }

    setMessages(prev => [...prev, ...newMessages]);
    setInputText('');
    setPendingAttachments([]);
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
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

    sendRealtimeMessage(
      clientMessageId,
      message.text ?? '',
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

    // Awaited (rather than fire-and-forget) so a failed edit still surfaces
    // the same "Unable to update message" alert the old onError side-channel
    // used to show — the Socket.IO edit/delete handlers only report failure
    // via the ack, not a separate error event.
    const editAckPromise = isGroup
      ? realtimeSocket.editGroupMessage(editingMessage.id, text)
      : realtimeSocket.editDirectMessage(editingMessage.id, text);

    editAckPromise.then((ack) => {
      if (!ack.ok) {
        Alert.alert('Unable to update message', ack.message);
      }
    });
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
            const deleteAckPromise = isGroup
              ? realtimeSocket.deleteGroupMessage(message.id)
              : realtimeSocket.deleteDirectMessage(message.id);

            deleteAckPromise.then((ack) => {
              if (!ack.ok) {
                Alert.alert('Unable to update message', ack.message);
              }
            });
          },
        },
      ],
    );
  };

  // Group-only membership action — backend is authoritative on ownership
  // transfer / group deletion, so this never computes or sends a successor;
  // it only tells the user what could happen.
  const handleLeaveGroup = async () => {
    if (!isObjectId(friendId)) return;
    setIsLeaveLoading(true);
    try {
      await leaveGroup(friendId);
      // messages.tsx's Groups list refetches on focus (useFocusEffect), so
      // navigating back is enough to make the group disappear immediately —
      // no separate cache/event-bus mechanism needed.
      safeBack(router, '/(tabs)/messages');
    } catch (error) {
      Alert.alert('Unable to leave group', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setIsLeaveLoading(false);
    }
  };

  const confirmLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'You will leave this group and stop receiving its messages. If you are the owner, ownership transfers automatically to another member, or the group is deleted if you are the only member.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => void handleLeaveGroup() },
      ],
    );
  };

  const renderBubble = (item: Message) => {
    if (item.text) {
      const match = item.text.match(STORY_LINK_REGEX);
      if (match) {
        return <StoryBubble msg={item} storyId={match[1]} />;
      }
    }

    switch (item.type) {
      case 'image': return <ImageBubble msg={item} />;
      case 'video': return <VideoBubble msg={item} />;
      case 'audio': return <AudioBubble msg={item} />;
      case 'event': return <EventBubble msg={item} />;
      case 'post': return <PostBubble msg={item} />;
      case 'location': return <TextBubble msg={item} />;
      default: return <TextBubble msg={item} />;
    }
  };

  return (
    <SafeAreaView style={[styles.safe, !isDark && { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0e0d12" : colors.background} />

      {/* ── Header ── */}
      <View style={[styles.header, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            <Text style={[styles.headerName, !isDark && { color: colors.text }]}>{name}</Text>
            <Text style={[styles.headerStatus, !isDark && { color: colors.textSecondary }]}>
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
            <Feather name="more-vertical" size={20} color={colors.textSecondary} />
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
          inverted
          data={reversedMessages}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContainer}
          onLayout={() => listRef.current?.scrollToOffset({ offset: 0, animated: false })}
          onContentSizeChange={() => listRef.current?.scrollToOffset({ offset: 0, animated: false })}
          renderItem={({ item, index }) => {
            const prevMsg = reversedMessages[index + 1];
            const isSameGroup = prevMsg && prevMsg.fromMe === item.fromMe;
            return (
              <View>
                {/* Date separator (mock) */}
                {index === reversedMessages.length - 1 && (
                  <View style={styles.dateSep}>
                    <View style={[styles.dateSepLine, !isDark && { backgroundColor: colors.border }]} />
                    <Text style={[styles.dateSepText, !isDark && { color: colors.textSecondary }]}>Today</Text>
                    <View style={[styles.dateSepLine, !isDark && { backgroundColor: colors.border }]} />
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
                        <Feather name="refresh-cw" size={12} color={CHAT_COLORS.semanticError} />
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
              { icon: 'image', label: 'Gallery', color: CHAT_COLORS.senderAccentSoft, onPress: handlePickGallery, loading: false },
              { icon: 'camera', label: 'Camera', color: '#3B82F6', onPress: handleCamera, loading: false },
              { icon: 'music', label: 'Audio', color: CHAT_COLORS.senderAccentSoft, onPress: () => setIsAudioPickerVisible(true), loading: false },
              { icon: 'map-pin', label: 'Location', color: '#16D869', onPress: handleShareLocation, loading: isLocationLoading },
              { icon: 'calendar', label: 'Event', color: CHAT_COLORS.senderAccentSoft, onPress: () => setIsEventPickerVisible(true), loading: false },
            ].map(a => (
              <TouchableOpacity
                key={a.label}
                style={styles.attachItem}
                activeOpacity={0.8}
                onPress={a.onPress}
                disabled={a.loading || isDirectChatUnavailable}
              >
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

        {/* ── Emoji Picker ── */}
        {showEmojiPicker && (
          <View style={styles.emojiPanel}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.emojiGrid}>
                {COMMON_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.emojiItem}
                    onPress={() => insertEmoji(emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Blocked-state banner (replaces the composer entirely, rather
             than leaving a merely-disabled composer with no explanation) ── */}
        {isBlockedConversation ? (
          <View
            style={[
              styles.blockedBanner,
              !isDark && { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            ]}
          >
            <Feather name="slash" size={18} color={colors.textSecondary} style={styles.blockedBannerIcon} />
            <View style={styles.blockedBannerTextCol}>
              {/* Full Block UI takes precedence over Message Block whenever
                  both exist — Full Block is the stronger, pre-existing
                  restriction. Message Block only gets its own copy when no
                  Full Block is present in either direction. */}
              <Text style={[styles.blockedBannerTitle, !isDark && { color: colors.text }]}>
                {fullBlockedByMe
                  ? 'You blocked this user.'
                  : fullBlockedMe
                    ? "You can't reply to this conversation."
                    : messageBlockedByMe
                      ? 'You blocked messages from this user.'
                      : "You can't reply to this conversation."}
              </Text>
              {fullBlockedByMe || messageBlockedByMe ? (
                <Text style={[styles.blockedBannerSubtitle, !isDark && { color: colors.textSecondary }]}>
                  {fullBlockedByMe ? 'Unblock them to send messages again.' : 'Unblock messages to reply.'}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
        <View style={[styles.inputBar, !isDark && { backgroundColor: colors.background }]}>
          <View style={[styles.inputWrap, !isDark && { backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity
              style={styles.emojiBtn}
              activeOpacity={0.8}
              onPress={toggleEmojiPicker}
              disabled={isDirectChatUnavailable}
            >
              <Feather
                name={showEmojiPicker ? 'x' : 'smile'}
                size={20}
                color={showEmojiPicker ? (isDark ? '#FFFFFF' : colors.text) : colors.textSecondary}
              />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, !isDark && { color: colors.text }]}
              placeholder="Add text"
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={handleInputTextChange}
              onFocus={() => setShowEmojiPicker(false)}
              editable={!isDirectChatUnavailable}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={styles.fileBtn}
              activeOpacity={0.8}
              disabled={isDirectChatUnavailable}
              onPress={() => { setShowEmojiPicker(false); setShowAttach((current) => !current); }}
            >
              <HugeiconsIcon icon={AttachmentIcon} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              !isDark && { borderWidth: 1, borderColor: colors.border },
              isDirectChatUnavailable && { opacity: 0.45 },
            ]}
            onPress={sendMessage}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color="#111111" style={{ marginLeft: -2, marginTop: 2 }} />
          </TouchableOpacity>
        </View>
        )}
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
                <Feather name="trash-2" size={18} color={CHAT_COLORS.semanticError} />
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
            <View style={[styles.moreMenuBox, !isDark && { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Full Block UI wins whenever present in either direction —
                  a Message Block toggle would be redundant/confusing while
                  Full Block already covers messaging. fullBlockedByMe keeps
                  the existing "Unblock" (full-unblock) action exactly as
                  before; fullBlockedMe hides this item entirely, since the
                  current user doesn't own that block and has no action to
                  take on it. Only when neither Full Block direction is
                  active does this become the new Message Block toggle. */}
              {/* DM-only: block/unblock is a user-relationship action and has
                  no meaning against a group id. Never render it for a group
                  thread — see Leave Group below for the group equivalent. */}
              {!isGroup && (fullBlockedMe && !fullBlockedByMe ? null : (
                <TouchableOpacity
                  style={styles.moreMenuItem}
                  activeOpacity={0.8}
                  disabled={isBlockLoading}
                  onPress={async () => {
                    setIsMoreMenuVisible(false);
                    if (!isObjectId(friendId)) return;
                    setIsBlockLoading(true);
                    try {
                      if (fullBlockedByMe) {
                        const result = await unblockUser(friendId);
                        setFullBlockedByMe(result.isBlocked);
                      } else {
                        const result = messageBlockedByMe
                          ? await unblockMessages(friendId)
                          : await blockMessages(friendId);
                        setMessageBlockedByMe(result.isMessageBlocked);
                      }
                    } catch (error) {
                      Alert.alert('Unable to update block status', getAuthErrorMessage(error, 'Please try again.'));
                    } finally {
                      setIsBlockLoading(false);
                    }
                  }}
                >
                  {isBlockLoading ? (
                    <Spinner size="small" color={isDark ? '#FFFFFF' : colors.text} style={styles.moreMenuIcon} />
                  ) : (
                    <Ionicons name="ban-outline" size={18} color={isDark ? '#FFFFFF' : colors.text} style={styles.moreMenuIcon} />
                  )}
                  <Text style={[styles.moreMenuText, !isDark && { color: colors.text }]}>
                    {fullBlockedByMe ? 'Unblock' : messageBlockedByMe ? 'Unblock Messages' : 'Block Messages'}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Group-only: real membership action, backend-authoritative
                  ownership transfer / deletion. Never a DM action. */}
              {isGroup && (
                <TouchableOpacity
                  style={styles.moreMenuItem}
                  activeOpacity={0.8}
                  disabled={isLeaveLoading}
                  onPress={() => {
                    setIsMoreMenuVisible(false);
                    confirmLeaveGroup();
                  }}
                >
                  {isLeaveLoading ? (
                    <Spinner size="small" color={CHAT_COLORS.semanticError} style={styles.moreMenuIcon} />
                  ) : (
                    <Feather name="log-out" size={18} color={CHAT_COLORS.semanticError} style={styles.moreMenuIcon} />
                  )}
                  <Text style={[styles.moreMenuText, { color: CHAT_COLORS.semanticError }]}>Leave Group</Text>
                </TouchableOpacity>
              )}

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

              {/* DM-only: deletes a DM conversation record; has no group
                  equivalent (see Leave Group above for groups). */}
              {!isGroup && (
                <>
                  <View style={[styles.moreMenuSeparator, !isDark && { backgroundColor: colors.border }]} />

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
                      } catch (error) {
                        Alert.alert('Unable to delete conversation', getAuthErrorMessage(error, 'Please try again.'));
                      } finally {
                        setIsDeleteLoading(false);
                      }
                    }}
                  >
                    {isDeleteLoading ? (
                      <Spinner size="small" color={CHAT_COLORS.semanticError} style={styles.moreMenuIcon} />
                    ) : (
                      <Feather name="trash-2" size={18} color={CHAT_COLORS.semanticError} style={styles.moreMenuIcon} />
                    )}
                    <Text style={[styles.moreMenuText, { color: CHAT_COLORS.semanticError }]}>Delete Conversation</Text>
                  </TouchableOpacity>
                </>
              )}
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
  safe: { flex: 1, backgroundColor: CHAT_COLORS.screenBackground },
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

  /* Text Bubble — one shared radius (16, with a small 2px sender/receiver tail) and
     padding system reused by the audio bubble below. */
  bubble: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, maxWidth: '100%' },
  bubbleMe: { backgroundColor: CHAT_COLORS.senderAccent, borderBottomRightRadius: 2 },
  bubbleThem: { backgroundColor: CHAT_COLORS.receiverSurface, borderTopLeftRadius: 2, borderWidth: 1, borderColor: CHAT_COLORS.receiverBorder },
  bubbleHost: { backgroundColor: CHAT_COLORS.receiverSurface, borderTopLeftRadius: 2, borderWidth: 1, borderColor: CHAT_COLORS.receiverBorder },
  bubbleSenderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bubbleSenderName: { color: '#8E8E9B', fontSize: 12, fontWeight: '600' },
  bubbleHostTag: { color: CHAT_COLORS.senderAccentSoft, fontSize: 10, fontWeight: '400' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: CHAT_COLORS.senderText },
  bubbleTextThem: { color: CHAT_COLORS.receiverText },
  // Shared bottom-right metadata row (timestamp/edited/delivered) for text/audio/event/post/story.
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
  bubbleTime: { color: CHAT_COLORS.metadataText, fontSize: 11 },
  bubbleTimeMe: { color: CHAT_COLORS.metadataTextOnAccent },

  /* Location Box — belongs to the same sender/receiver system as the text bubble that hosts it. */
  locationBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 10, marginTop: 12, marginBottom: 4, minWidth: 200 },
  locationIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2A2A3A', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  locationIconWrapMe: { backgroundColor: CHAT_COLORS.senderAccent },
  locationTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  locationDesc: { color: '#FFFFFF', fontSize: 11 },

  /* Image Bubble — same 16 radius as every other card; VideoBubble reuses these too. */
  imageBubble: { borderRadius: 16, overflow: 'hidden', position: 'relative' },
  imageBubbleMe: { alignSelf: 'flex-end' },
  imageBubbleThem: { alignSelf: 'flex-start' },
  bubbleImage: { width: width * 0.6, height: width * 0.6, borderRadius: 16 },
  mediaFallback: { backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  videoPlaceholderText: { color: CHAT_COLORS.neutralIcon, fontSize: 12, fontWeight: '600', marginTop: 6 },
  failedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  imageTimeBadge: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  imageTimeText: { color: '#FFF', fontSize: 11 },

  /* Audio Bubble — outer shell reuses `bubble`/`bubbleMe`/`bubbleThem` so its background
     always matches the text bubble's sender/receiver color exactly. */
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  audioPlayBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  audioPlayBtnMe: { backgroundColor: 'rgba(255,255,255,0.22)' },
  waveformRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  audioDuration: { color: CHAT_COLORS.metadataText, fontSize: 11 },
  audioDurationMe: { color: CHAT_COLORS.metadataTextOnAccent },

  /* Event Bubble — eventBubbleMe/eventBubbleThem are reused as-is by PostBubble/StoryBubble
     below so all three card types share one sender/receiver background. */
  eventBubble: { borderRadius: 16, overflow: 'hidden', width: Math.min(width * 0.74, 310), minHeight: 190, position: 'relative' },
  eventBubbleMe: { backgroundColor: '#241B4D', alignSelf: 'flex-end' },
  eventBubbleThem: { backgroundColor: CHAT_COLORS.receiverSurface, alignSelf: 'flex-start', borderWidth: 1, borderColor: CHAT_COLORS.receiverBorder },
  eventBubbleBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.72 },
  eventBubbleScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,16,0.68)' },
  eventBubbleGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, backgroundColor: 'rgba(91,63,214,0.35)' },
  eventBubbleInfo: { padding: 14, paddingBottom: 44, minHeight: 170, justifyContent: 'flex-end' },
  eventBubbleTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  eventBubbleTagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  eventBubbleTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, lineHeight: 21, marginBottom: 8 },
  eventBubbleMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 },
  eventBubbleDate: { flex: 1, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 16 },
  eventBubbleLocation: { flex: 1, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 16 },
  eventBubbleBtn: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 11, alignItems: 'center', marginTop: 8 },
  eventBubbleBtnText: { color: '#180F22', fontWeight: '800', fontSize: 13 },
  eventBubbleTimeWrap: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  eventBubbleTime: { color: CHAT_COLORS.metadataText, fontSize: 11, textAlign: 'right' },
  sharedPostBubble: { width: Math.min(width * 0.74, 310), borderRadius: 16, overflow: 'hidden' },
  sharedPostMediaFrame: { width: '100%', height: 132, backgroundColor: '#19191F', position: 'relative' },
  sharedPostImage: { width: '100%', height: '100%', backgroundColor: '#19191F' },
  sharedPostAudioFrame: { width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, backgroundColor: '#1A1A2E' },
  sharedPostPlayBadge: { position: 'absolute', left: '50%', top: '50%', width: 42, height: 42, marginLeft: -21, marginTop: -21, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center' },
  sharedPostInfo: { padding: 14, gap: 4 },
  sharedPostAuthor: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  sharedPostPreview: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 18, marginBottom: 4 },

  /* Reactions */
  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionsRowMe: { justifyContent: 'flex-end' },
  reactionsRowThem: { justifyContent: 'flex-start' },
  reactionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2E', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, gap: 3, borderWidth: 1, borderColor: '#2A2A3A' },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { color: '#8E8E9B', fontSize: 11, fontWeight: '600' },
  failedRetryRow: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: CHAT_COLORS.semanticErrorSurface },
  failedRetryText: { color: CHAT_COLORS.semanticError, fontSize: 11, fontWeight: '600' },

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
  pendingMetaError: { color: CHAT_COLORS.semanticError },
  progressTrack: { height: 3, backgroundColor: '#2A2A3A', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: CHAT_COLORS.senderAccent, borderRadius: 2 },
  pendingIconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#24242C', alignItems: 'center', justifyContent: 'center' },

  /* Emoji Picker */
  emojiPanel: { backgroundColor: '#13131A', borderTopWidth: 1, borderTopColor: '#1A1A2E', maxHeight: 180, paddingHorizontal: 4, paddingVertical: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emojiItem: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  emojiText: { fontSize: 26 },

  /* Input Bar */
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#0e0d12', gap: 10 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, minHeight: 48 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14, maxHeight: 100, marginLeft: 10, marginRight: 10 },
  emojiBtn: { justifyContent: 'center', alignItems: 'center', width: 24 },
  fileBtn: { justifyContent: 'center', alignItems: 'center', width: 24 },
  sendBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },

  /* Blocked-state banner — replaces the Input Bar above when messaging is
     unavailable due to a block in either direction. Dark-mode values reuse
     the same subtleSurface/receiverBorder/receiverText/metadataText tokens
     already used by the location card, so it reads as part of the same
     design language rather than a new surface. */
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CHAT_COLORS.subtleSurface,
    borderWidth: 1,
    borderColor: CHAT_COLORS.receiverBorder,
  },
  blockedBannerIcon: { marginRight: 12, marginTop: 2 },
  blockedBannerTextCol: { flex: 1 },
  blockedBannerTitle: { color: CHAT_COLORS.receiverText, fontSize: 13, fontWeight: '700' },
  blockedBannerSubtitle: { color: CHAT_COLORS.metadataText, fontSize: 12, marginTop: 2 },

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
  messageDeleteIcon: { backgroundColor: CHAT_COLORS.semanticErrorSurface },
  messageActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  messageDeleteText: { color: CHAT_COLORS.semanticError, fontSize: 15, fontWeight: '600' },
  editMessageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editMessageClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', marginTop: -8 },
  editMessageInput: { minHeight: 92, maxHeight: 180, color: '#FFFFFF', fontSize: 15, lineHeight: 21, textAlignVertical: 'top', backgroundColor: '#161616', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14 },
  editMessageSave: { minHeight: 48, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  editMessageSaveDisabled: { opacity: 0.45 },
  editMessageSaveText: { color: '#0e0d12', fontSize: 14, fontWeight: '700' },

  /* Audio Sheet */
  audioSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.62)' },
  audioSheet: { backgroundColor: '#0e0d12', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 12 },
  audioSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center', marginBottom: 16 },
  audioSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  audioSheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  audioSheetSubtitle: { color: '#8E8E9B', fontSize: 12, marginTop: 4 },
  audioSheetClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 14, padding: 12, marginBottom: 12, gap: 10 },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#454555' },
  recordDotActive: { backgroundColor: CHAT_COLORS.semanticError },
  recordInfo: { flex: 1 },
  recordTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  recordTime: { color: '#8E8E9B', fontSize: 12, marginTop: 2 },
  recordButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, gap: 6 },
  stopButton: { backgroundColor: CHAT_COLORS.semanticError },
  recordButtonText: { color: '#111111', fontSize: 13, fontWeight: '700' },
  pickAudioButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A2E', borderRadius: 12, paddingVertical: 13, gap: 8 },
  pickAudioButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

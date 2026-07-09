import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import {
  createEventWindowPost,
  getEventWindowPosts,
  getEventWindows,
  type EventWindow,
  type EventWindowContentType,
  type EventWindowMediaSource,
  type EventWindowPost,
  type EventWindowPostMedia,
} from "@/lib/eventWindows";
import { uploadFileToStorage } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AttendeeEventWindowsTabProps = {
  eventId: string;
  eventStatus?: string | null;
};

type MediaContentType = Exclude<EventWindowContentType, "text">;

type SelectedMedia = {
  uri: string;
  type: MediaContentType;
  source: EventWindowMediaSource;
  contentType: string;
  fileName: string;
  durationSeconds?: number | null;
};

const CONTENT_LABELS: Record<EventWindowContentType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  audio: "Audio",
};

const CONTENT_ICONS: Record<EventWindowContentType, React.ComponentProps<typeof Feather>["name"]> = {
  text: "type",
  image: "image",
  video: "video",
  audio: "mic",
};

const STATUS_COLORS = {
  scheduled: "#3B82F6",
  open: "#16A34A",
  closed: "#71717A",
  cancelled: "#DC2626",
} as const;

const parseDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(date);

const formatTime = (date: Date) => new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
}).format(date);

const formatWindowRange = (startsAt: string, endsAt: string) => {
  const start = parseDate(startsAt);
  const end = parseDate(endsAt);
  return start.toDateString() === end.toDateString()
    ? `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`
    : `${formatDate(start)}, ${formatTime(start)} - ${formatDate(end)}, ${formatTime(end)}`;
};

const formatPostedAt = (value: string) => {
  const date = parseDate(value);
  return `${formatDate(date)} · ${formatTime(date)}`;
};

const getDefaultContentType = (type: MediaContentType) => {
  if (type === "image") return "image/jpeg";
  if (type === "video") return "video/mp4";
  return "audio/mpeg";
};

const getMediaExtension = (contentType: string, type: MediaContentType) => {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("quicktime")) return "mov";
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("m4a") || normalized.includes("mp4")) return type === "audio" ? "m4a" : "mp4";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("aac")) return "aac";
  if (normalized.includes("mpeg")) return type === "audio" ? "mp3" : "mpeg";
  return type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3";
};

const getWindowMessage = (window: EventWindow, eventEnded: boolean) => {
  if (window.hasPosted && eventEnded) return "Private gallery unlocked.";
  if (window.hasPosted) return "Post submitted. Gallery unlocks after the event ends.";
  if (!window.hasAttended) return "Check in at event to unlock posting.";
  if (window.computedStatus === "open" && window.remainingSlots > 0) return "Post to unlock this window.";
  if (window.computedStatus === "scheduled") return "Posting opens when this window starts.";
  if (window.computedStatus === "cancelled") return "This window was cancelled.";
  if (window.remainingSlots === 0) return "This window is full.";
  return "This window is closed.";
};

function GalleryVideo({ uri, headers }: { uri: string; headers?: Record<string, string> }) {
  const source = useMemo(() => ({ uri, headers }), [headers, uri]);
  const player = useVideoPlayer(source, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  return <VideoView player={player} style={styles.galleryMedia} nativeControls contentFit="cover" />;
}

function GalleryAudio({ uri, headers, durationSeconds }: { uri: string; headers?: Record<string, string>; durationSeconds?: number | null }) {
  const source = useMemo(() => ({ uri, headers }), [headers, uri]);
  const player = useAudioPlayer(source, { downloadFirst: false, updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : durationSeconds ?? 0;
  const currentTime = duration > 0 ? Math.min(status.currentTime, duration) : status.currentTime;

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (duration > 0 && currentTime >= duration - 0.25) await player.seekTo(0);
    player.play();
  };

  return (
    <TouchableOpacity style={styles.audioPlayer} onPress={() => void toggle()}>
      <View style={styles.audioPlayButton}>
        <Feather name={status.playing ? "pause" : "play"} size={17} color="#FFFFFF" />
      </View>
      <View style={styles.audioTrack}>
        <View style={[styles.audioProgress, { width: `${duration > 0 ? Math.min(100, currentTime / duration * 100) : 0}%` }]} />
      </View>
      <Text style={styles.audioTime}>{Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}</Text>
    </TouchableOpacity>
  );
}

const AttendeeEventWindowsTab = ({ eventId, eventStatus }: AttendeeEventWindowsTabProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const formScrollRef = useRef<ScrollView>(null);
  const windowHeightRef = useRef(windowHeight);
  const [windows, setWindows] = useState<EventWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<EventWindow | null>(null);
  const [selectedType, setSelectedType] = useState<EventWindowContentType>("text");
  const [text, setText] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expandedWindowId, setExpandedWindowId] = useState<string | null>(null);
  const [postsByWindow, setPostsByWindow] = useState<Record<string, EventWindowPost[]>>({});
  const [galleryCursors, setGalleryCursors] = useState<Record<string, string | null>>({});
  const [galleryLoadingId, setGalleryLoadingId] = useState<string | null>(null);
  const [galleryErrors, setGalleryErrors] = useState<Record<string, string>>({});
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);
  const androidNavigationInset = Platform.OS === "android"
    ? Math.max(0, Dimensions.get("screen").height - windowHeight)
    : 0;
  const systemBottomInset = Math.max(
    insets.bottom,
    androidNavigationInset,
    Platform.OS === "android" ? 16 : 12,
  );
  const formBodyBottomPadding = Platform.OS === "android" ? keyboardBottomInset : 0;
  const ModalContainer = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const modalContainerProps = Platform.OS === "ios" ? { behavior: "padding" as const } : {};
  const mediaRequestHeaders = useMemo(
    () => accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    [accessToken],
  );
  const eventEnded = eventStatus === "completed";

  const loadWindows = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    setLoadError(null);
    try {
      setWindows(await getEventWindows(eventId));
    } catch (error) {
      setLoadError(getAuthErrorMessage(error, "Unable to load event windows."));
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadWindows();
    const interval = setInterval(() => void loadWindows(false), 30000);
    return () => clearInterval(interval);
  }, [loadWindows]);

  useEffect(() => {
    windowHeightRef.current = windowHeight;
  }, [windowHeight]);

  const updateKeyboardBottomInset = useCallback((event: { endCoordinates?: { height?: number; screenY?: number } }) => {
    const coordinates = event.endCoordinates;
    const coveredBottom = typeof coordinates?.screenY === "number"
      ? Math.max(0, windowHeightRef.current - coordinates.screenY)
      : 0;
    const metrics = Keyboard.metrics?.();
    const metricsCoveredBottom = metrics && typeof metrics.screenY === "number"
      ? Math.max(0, windowHeightRef.current - metrics.screenY)
      : 0;

    setKeyboardBottomInset(Math.max(coveredBottom, metricsCoveredBottom, coordinates?.height ?? 0, metrics?.height ?? 0));
  }, []);

  useEffect(() => {
    if (!selectedWindow || Platform.OS !== "android") {
      setKeyboardBottomInset(0);
      return;
    }

    const showSubscription = Keyboard.addListener("keyboardDidShow", updateKeyboardBottomInset);
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setKeyboardBottomInset(0));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      setKeyboardBottomInset(0);
    };
  }, [selectedWindow, updateKeyboardBottomInset]);

  const closePostForm = () => {
    if (isSubmitting) return;
    Keyboard.dismiss();
    setSelectedWindow(null);
    setPostError(null);
    setSelectedMedia(null);
    setText("");
  };

  const openPostForm = (window: EventWindow) => {
    if (!window.hasAttended) {
      Alert.alert("Check-in required", "Check in at event to unlock posting.");
      return;
    }
    if (!window.canPost) return;
    setSelectedWindow(window);
    setSelectedType(window.allowedContentTypes[0] ?? "text");
    setText("");
    setSelectedMedia(null);
    setPostError(null);
    setUploadProgress(0);
  };

  const selectType = (type: EventWindowContentType) => {
    setSelectedType(type);
    setSelectedMedia(null);
    setPostError(null);
  };

  const pickMedia = async () => {
    try {
      if (selectedType === "audio") {
        const result = await DocumentPicker.getDocumentAsync({
          type: "audio/*",
          copyToCacheDirectory: true,
          multiple: false,
        });
        const asset = result.canceled ? null : result.assets[0];
        if (!asset) return;
        setSelectedMedia({
          uri: asset.uri,
          type: "audio",
          source: "upload",
          contentType: asset.mimeType ?? getDefaultContentType("audio"),
          fileName: asset.name,
        });
        return;
      }

      if (selectedType !== "image" && selectedType !== "video") return;
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Gallery access needed", "Allow photo library access to choose media.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: selectedType === "image" ? ["images"] : ["videos"],
        allowsMultipleSelection: false,
        quality: 0.9,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
      });
      const asset = result.canceled ? null : result.assets[0];
      if (!asset) return;
      setSelectedMedia({
        uri: asset.uri,
        type: selectedType,
        source: "gallery",
        contentType: asset.mimeType ?? getDefaultContentType(selectedType),
        fileName: asset.fileName ?? `${CONTENT_LABELS[selectedType]} upload`,
        durationSeconds: asset.duration ? asset.duration / 1000 : null,
      });
    } catch (error) {
      Alert.alert("Unable to choose media", getAuthErrorMessage(error, "Choose another file."));
    }
  };

  const loadGallery = useCallback(async (window: EventWindow, cursor: string | null = null) => {
    if (!eventEnded || !window.canViewPosts) return;
    setGalleryLoadingId(window.id);
    setGalleryErrors((current) => ({ ...current, [window.id]: "" }));
    try {
      const page = await getEventWindowPosts(eventId, window.id, { cursor });
      setPostsByWindow((current) => ({
        ...current,
        [window.id]: cursor ? [...(current[window.id] ?? []), ...page.posts] : page.posts,
      }));
      setGalleryCursors((current) => ({ ...current, [window.id]: page.nextCursor }));
    } catch (error) {
      setGalleryErrors((current) => ({
        ...current,
        [window.id]: getAuthErrorMessage(error, "Unable to load this private gallery."),
      }));
    } finally {
      setGalleryLoadingId(null);
    }
  }, [eventEnded, eventId]);

  const toggleGallery = (window: EventWindow) => {
    if (!eventEnded || !window.canViewPosts) return;
    if (expandedWindowId === window.id) {
      setExpandedWindowId(null);
      return;
    }
    setExpandedWindowId(window.id);
    if (!postsByWindow[window.id]) void loadGallery(window);
  };

  const submitPost = async () => {
    if (!selectedWindow || isSubmitting) return;
    if (!currentUserId) {
      setPostError("Sign in again before posting.");
      return;
    }
    const trimmedText = text.trim();
    if (selectedType === "text" && !trimmedText) {
      setPostError("Write something before posting.");
      return;
    }
    if (selectedType !== "text" && !selectedMedia) {
      setPostError(`Choose ${CONTENT_LABELS[selectedType].toLowerCase()} to post.`);
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setPostError(null);
    try {
      let mediaItems: (EventWindowPostMedia & { storageKey?: string | null })[] = [];
      if (selectedMedia) {
        const extension = getMediaExtension(selectedMedia.contentType, selectedMedia.type);
        const storageKey = await uploadFileToStorage({
          uri: selectedMedia.uri,
          key: `event-windows/${eventId}/${selectedWindow.id}/${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
          contentType: selectedMedia.contentType,
          onProgress: setUploadProgress,
        });
        mediaItems = [{
          type: selectedMedia.type,
          source: selectedMedia.source,
          storageKey,
          contentType: selectedMedia.contentType,
          durationSeconds: selectedMedia.durationSeconds ?? null,
        }];
      }

      await createEventWindowPost(eventId, selectedWindow.id, {
        contentType: selectedType,
        text: trimmedText || null,
        mediaItems,
      });

      const nextWindows = await getEventWindows(eventId);
      setWindows(nextWindows);
      setExpandedWindowId(null);
      setSelectedWindow(null);
      setSelectedMedia(null);
      setText("");
    } catch (error) {
      setPostError(getAuthErrorMessage(error, "Unable to post in this window."));
      requestAnimationFrame(() => formScrollRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const renderGalleryPost = (post: EventWindowPost) => (
    <View key={post.id} style={[styles.galleryPost, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.galleryPostHeader}>
        <View style={[styles.participantAvatar, { backgroundColor: colors.card }]}>
          <Feather name="user" size={15} color={colors.textSecondary} />
        </View>
        <View style={styles.galleryPostMeta}>
          <Text style={[styles.participantName, { color: colors.text }]}>{post.userId === currentUserId ? "You" : "Participant"}</Text>
          <Text style={[styles.postedAt, { color: colors.textSecondary }]}>{formatPostedAt(post.createdAt)}</Text>
        </View>
      </View>
      {post.text ? <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text> : null}
      {post.mediaItems.map((media, index) => {
        if (!media.url) return null;
        if (media.type === "image") return <Image key={`${post.id}-${index}`} source={{ uri: media.url, headers: mediaRequestHeaders }} style={styles.galleryMedia} contentFit="cover" />;
        if (media.type === "video") return <GalleryVideo key={`${post.id}-${index}`} uri={media.url} headers={mediaRequestHeaders} />;
        return <GalleryAudio key={`${post.id}-${index}`} uri={media.url} headers={mediaRequestHeaders} durationSeconds={media.durationSeconds} />;
      })}
    </View>
  );

  const renderWindow = (window: EventWindow) => {
    const statusColor = STATUS_COLORS[window.computedStatus];
    const isExpanded = expandedWindowId === window.id;
    const galleryPosts = postsByWindow[window.id];
    const nextCursor = galleryCursors[window.id];
    const canOpenGallery = eventEnded && window.canViewPosts;

    return (
      <View key={window.id} style={[styles.windowCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.windowHeader}>
          <Text style={[styles.windowTitle, { color: colors.text }]} numberOfLines={2}>{window.title?.trim() || "Event window"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{window.computedStatus[0].toUpperCase() + window.computedStatus.slice(1)}</Text>
          </View>
        </View>
        <View style={styles.timeRow}>
          <Feather name="clock" size={15} color={colors.textSecondary} />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{formatWindowRange(window.startsAt, window.endsAt)}</Text>
        </View>
        <View style={styles.typesRow}>
          {window.allowedContentTypes.map((type) => (
            <View key={type} style={[styles.typeBadge, { borderColor: colors.border }]}>
              <Feather name={CONTENT_ICONS[type]} size={14} color={colors.textSecondary} />
              <Text style={[styles.typeText, { color: colors.textSecondary }]}>{CONTENT_LABELS[type]}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.capacityRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.capacityText, { color: colors.textSecondary }]}>{window.remainingSlots} of {window.maxPosts} slots remaining</Text>
        </View>
        <View style={[styles.windowMessage, { backgroundColor: isDark ? "#191919" : "#F3F4F6" }]}>
          <Feather name={window.hasPosted ? "unlock" : window.hasAttended ? "lock" : "map-pin"} size={16} color={window.hasPosted ? colors.success : colors.textSecondary} />
          <Text style={[styles.windowMessageText, { color: colors.textSecondary }]}>{getWindowMessage(window, eventEnded)}</Text>
        </View>

        {window.canPost ? (
          <TouchableOpacity style={[styles.primaryAction, { backgroundColor: colors.text }]} onPress={() => openPostForm(window)}>
            <Feather name="plus" size={18} color={colors.background} />
            <Text style={[styles.primaryActionText, { color: colors.background }]}>Post to unlock</Text>
          </TouchableOpacity>
        ) : null}

        {canOpenGallery ? (
          <TouchableOpacity style={[styles.galleryToggle, { borderColor: colors.border }]} onPress={() => toggleGallery(window)}>
            <Feather name="image" size={17} color={colors.text} />
            <Text style={[styles.galleryToggleText, { color: colors.text }]}>Private gallery</Text>
            <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}

        {isExpanded && canOpenGallery ? (
          <View style={[styles.gallery, { borderTopColor: colors.border }]}>
            {galleryLoadingId === window.id ? <ActivityIndicator color={colors.primary} /> : null}
            {galleryErrors[window.id] ? (
              <View style={styles.galleryError}>
                <Text style={[styles.galleryErrorText, { color: colors.danger }]}>{galleryErrors[window.id]}</Text>
                <TouchableOpacity onPress={() => void loadGallery(window)}><Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text></TouchableOpacity>
              </View>
            ) : null}
            {galleryPosts?.length === 0 ? <Text style={[styles.emptyGalleryText, { color: colors.textSecondary }]}>No posts available.</Text> : null}
            {galleryPosts?.map(renderGalleryPost)}
            {nextCursor ? (
              <TouchableOpacity
                style={[styles.retryButton, { borderColor: colors.border }]}
                onPress={() => void loadGallery(window, nextCursor)}
                disabled={galleryLoadingId === window.id}
              >
                <Text style={[styles.retryText, { color: colors.text }]}>Load more</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: colors.text }]}>Event windows</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={() => void loadWindows()} accessibilityLabel="Refresh event windows">
          <Feather name="refresh-cw" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : loadError ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Feather name="alert-circle" size={28} color={colors.danger} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Windows unavailable</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity style={[styles.retryButton, { borderColor: colors.border }]} onPress={() => void loadWindows()}><Text style={[styles.retryText, { color: colors.text }]}>Retry</Text></TouchableOpacity>
        </View>
      ) : windows.length === 0 ? (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Feather name="clock" size={30} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{eventEnded ? "No participated windows yet" : "No event windows yet"}</Text>
        </View>
      ) : windows.map(renderWindow)}

      <Modal
        visible={Boolean(selectedWindow)}
        animationType="slide"
        presentationStyle="pageSheet"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={closePostForm}
      >
        <ModalContainer
          style={[styles.modal, { backgroundColor: colors.background }]}
          {...modalContainerProps}
        >
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top, 8) }]}>
            <TouchableOpacity style={styles.headerIcon} onPress={closePostForm} disabled={isSubmitting} accessibilityLabel="Close post form"><Feather name="x" size={24} color={colors.text} /></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Post to window</Text>
            <View style={styles.headerIcon} />
          </View>
          <View style={[styles.formBody, { paddingBottom: formBodyBottomPadding }]}>
            <ScrollView
              ref={formScrollRef}
              style={styles.formScroll}
              contentContainerStyle={[styles.formContent, { paddingBottom: systemBottomInset + 32 }]}
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.formWindowTitle, { color: colors.text }]}>{selectedWindow?.title?.trim() || "Event window"}</Text>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>POST TYPE</Text>
              <View style={styles.typeSelector}>
                {selectedWindow?.allowedContentTypes.map((type) => {
                  const selected = selectedType === type;
                  return (
                    <TouchableOpacity key={type} style={[styles.typeOption, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}22` : colors.card }]} onPress={() => selectType(type)}>
                      <Feather name={CONTENT_ICONS[type]} size={18} color={selected ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.typeOptionText, { color: selected ? colors.text : colors.textSecondary }]}>{CONTENT_LABELS[type]}</Text>
                      <Feather name={selected ? "check-circle" : "circle"} size={17} color={selected ? colors.primary : colors.textSecondary} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View>
                {selectedType !== "text" ? (
                  <>
                    <Text style={[styles.formLabel, { color: colors.textSecondary }]}>MEDIA</Text>
                    {selectedMedia ? (
                      <View style={[styles.selectedMedia, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        {selectedMedia.type === "image" ? <Image source={{ uri: selectedMedia.uri }} style={styles.selectedMediaPreview} contentFit="cover" /> : <Feather name={CONTENT_ICONS[selectedMedia.type]} size={28} color={colors.primary} />}
                        <Text style={[styles.selectedMediaName, { color: colors.text }]} numberOfLines={2}>{selectedMedia.fileName}</Text>
                        <TouchableOpacity style={styles.removeMedia} onPress={() => setSelectedMedia(null)} accessibilityLabel="Remove selected media"><Feather name="x" size={20} color={colors.textSecondary} /></TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={[styles.mediaPicker, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => void pickMedia()}>
                        <Feather name="upload" size={21} color={colors.primary} />
                        <Text style={[styles.mediaPickerText, { color: colors.text }]}>Choose {CONTENT_LABELS[selectedType].toLowerCase()}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : null}
              </View>

              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{selectedType === "text" ? "TEXT" : "CAPTION (OPTIONAL)"}</Text>
              <TextInput
                value={text}
                onChangeText={setText}
                multiline
                maxLength={5000}
                placeholder={selectedType === "text" ? "Share something from the event" : "Add a caption"}
                placeholderTextColor={colors.textSecondary}
                style={[styles.textArea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                textAlignVertical="top"
              />

              {postError ? (
                <View style={[styles.errorBox, { borderColor: colors.danger }]}>
                  <Feather name="alert-circle" size={17} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{postError}</Text>
                </View>
              ) : null}
            </ScrollView>
            <View style={[styles.formActions, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: systemBottomInset }]}>
              <TouchableOpacity style={[styles.formActionButton, { borderColor: colors.border }]} onPress={closePostForm} disabled={isSubmitting}><Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.formActionButton, { backgroundColor: colors.text }]} onPress={() => void submitPost()} disabled={isSubmitting}>
                {isSubmitting ? <View style={styles.submittingRow}><ActivityIndicator color={colors.background} /><Text style={[styles.submitText, { color: colors.background }]}>{uploadProgress > 0 && uploadProgress < 1 ? `${Math.round(uploadProgress * 100)}%` : "Posting"}</Text></View> : <Text style={[styles.submitText, { color: colors.background }]}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ModalContainer>
      </Modal>
    </View>
  );
};

export default AttendeeEventWindowsTab;

const styles = StyleSheet.create({
  container: { paddingTop: 20 },
  headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  heading: { fontSize: 20, fontWeight: "700" },
  refreshButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  loading: { marginVertical: 48 },
  windowCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 16, marginBottom: 14 },
  windowHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  windowTitle: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: "700" },
  statusBadge: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, borderRadius: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  timeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 14 },
  timeText: { flex: 1, fontSize: 13, lineHeight: 19 },
  typesRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  typeBadge: { minHeight: 29, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6 },
  typeText: { fontSize: 12, fontWeight: "600" },
  capacityRow: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 15, paddingTop: 13 },
  capacityText: { fontSize: 12, fontWeight: "600" },
  windowMessage: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 8, marginTop: 12 },
  windowMessageText: { flex: 1, fontSize: 13, lineHeight: 18 },
  primaryAction: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 8, marginTop: 12 },
  primaryActionText: { fontSize: 14, fontWeight: "700" },
  galleryToggle: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 12 },
  galleryToggleText: { flex: 1, fontSize: 14, fontWeight: "700" },
  gallery: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 15, paddingTop: 15, gap: 12 },
  galleryPost: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12 },
  galleryPostHeader: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  participantAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  galleryPostMeta: { flex: 1 },
  participantName: { fontSize: 13, fontWeight: "700" },
  postedAt: { fontSize: 11, marginTop: 2 },
  postText: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  galleryMedia: { width: "100%", aspectRatio: 1.25, borderRadius: 6, overflow: "hidden", backgroundColor: "#111111", marginTop: 4 },
  audioPlayer: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, borderRadius: 6, backgroundColor: "#202024", marginTop: 4 },
  audioPlayButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#6B4E71" },
  audioTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden", backgroundColor: "#50505A" },
  audioProgress: { height: "100%", backgroundColor: "#FFFFFF" },
  audioTime: { color: "#D0D0D8", fontSize: 11, fontVariant: ["tabular-nums"] },
  galleryError: { alignItems: "center", gap: 8 },
  galleryErrorText: { fontSize: 13, textAlign: "center" },
  emptyGalleryText: { fontSize: 13, textAlign: "center", paddingVertical: 12 },
  emptyState: { alignItems: "center", paddingVertical: 38, paddingHorizontal: 24, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 290 },
  retryButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 18, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 6 },
  retryText: { fontSize: 14, fontWeight: "700" },
  modal: { flex: 1 },
  modalHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  headerIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  formBody: { flex: 1 },
  formScroll: { flex: 1 },
  formContent: { padding: 20 },
  formWindowTitle: { fontSize: 19, lineHeight: 24, fontWeight: "700", marginBottom: 4 },
  formLabel: { fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 18 },
  typeSelector: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  typeOption: { width: "48%", minHeight: 46, flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8 },
  typeOptionText: { flex: 1, fontSize: 13, fontWeight: "600" },
  mediaPicker: { minHeight: 76, alignItems: "center", justifyContent: "center", gap: 7, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  mediaPickerText: { fontSize: 14, fontWeight: "700" },
  selectedMedia: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  selectedMediaPreview: { width: 54, height: 54, borderRadius: 6 },
  selectedMediaName: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "600" },
  removeMedia: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  textArea: { minHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 13, fontSize: 15, lineHeight: 21 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, marginTop: 18 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  formActions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  formActionButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  cancelText: { fontSize: 15, fontWeight: "700" },
  submitText: { fontSize: 15, fontWeight: "700" },
  submittingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});

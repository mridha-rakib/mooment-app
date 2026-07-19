import { Feather, Ionicons } from "@expo/vector-icons";
import { UploadCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import Mapbox from "@rnmapbox/maps";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, InteractionManager, Linking, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { navigateToProfile } from "@/lib/profileNavigation";
import { MAPBOX_PUBLIC_TOKEN } from "@/lib/mapbox";
import { APP_MAP_STYLE_URL } from "@/lib/mapStyles";
import { getStorageFileUrl, uploadFileToStorage } from "@/lib/storage";
import { followUser, unfollowUser } from "@/lib/users";
import {
  addEventMedia,
  deleteEventMedia,
  EVENT_MEDIA_IMAGE_MAX_BYTES,
  EVENT_MEDIA_VIDEO_MAX_BYTES,
  MAX_EVENT_MEDIA_BATCH_ITEMS,
  MAX_EVENT_MEDIA_ITEMS,
  MAX_EVENT_MEDIA_VIDEO_DURATION_SECONDS,
  type EventAgeRestriction,
  type EventHost,
  type EventLocation,
  type EventMedia,
  type EventMediaInput,
  type EventResponse,
  type EventStatus,
} from "@/lib/events";
import { optimizeStoryImageForUpload } from "@/lib/storyImageOptimizer";
import { generateStoryThumbnail, getCachedStoryThumbnail, setCachedStoryThumbnail, type StoryThumbnailSource } from "@/lib/storyThumbnails";
import { getLocalUriByteSize, prepareEventGalleryVideoForUpload } from "@/lib/videoProcessor";
import { useAuthStore } from "@/stores/authStore";
import { getCategoryColor } from "@/constants/categoryColors";
import FullScreenMediaModal, { type FullScreenMediaItem } from "../modals/FullScreenMediaModal";
import SegmentedControl from "../ui/SegmentedControl";

const { width } = Dimensions.get("window");
Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const isDirectMediaUrl = (value?: string | null) =>
  Boolean(value && /^(https?:|data:|file:|content:)/i.test(value.trim()));

const getNonEmptyString = (...values: (string | null | undefined)[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

type AboutTabProps = {
  eventId?: string | null;
  eventStatus?: EventStatus | null;
  description?: string | null;
  ageRestriction?: EventAgeRestriction | null;
  location?: EventLocation | null;
  host?: EventHost | null;
  eventMedia?: EventMedia[];
  eventImageUris?: string[];
  isHostMode?: boolean;
  isDraft?: boolean;
  category?: string | null;
  onHostFollowChange?: (isFollowing: boolean) => void;
  onEventMediaUpdated?: (event: EventResponse) => void;
};

const SUPPORTED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const SUPPORTED_VIDEO_CONTENT_TYPES = new Set(["video/mp4", "video/quicktime"]);
const INITIAL_GALLERY_MEDIA_RENDER_COUNT = 9;
const GALLERY_MEDIA_RENDER_BATCH_SIZE = 6;

type GalleryUploadPhase = "idle" | "opening" | "processing" | "uploading" | "persisting" | "refreshing";

type PendingUploadPhase = "processing" | "uploading" | "saving";

type PendingUploadItem = {
  id: string;
  batchId: number;
  pickerIndex: number;
  type: "image" | "video";
  phase: PendingUploadPhase;
  progress: number | null;
  previewSource: StoryThumbnailSource;
};

const formatAgeLabel = (ageRestriction?: EventAgeRestriction | null) => {
  if (ageRestriction === "18_plus") {
    return "18+ only";
  }

  if (ageRestriction === "21_plus") {
    return "21+ only";
  }

  return "All ages";
};

const formatCompactCount = (value?: number | null) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, value ?? 0));

const isFiniteCoordinate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeImageContentType = (contentType?: string | null, uri?: string | null) => {
  const lowerContentType = contentType?.toLowerCase().trim();

  if (lowerContentType === "image/jpg") {
    return "image/jpeg";
  }

  if (lowerContentType === "image/heic-sequence") {
    return "image/heic";
  }

  if (lowerContentType === "image/heif-sequence") {
    return "image/heif";
  }

  if (lowerContentType && SUPPORTED_IMAGE_CONTENT_TYPES.has(lowerContentType)) {
    return lowerContentType;
  }

  const extension = uri?.split("?")[0]?.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";

  return null;
};

const normalizeVideoContentType = (contentType?: string | null, uri?: string | null) => {
  const lowerContentType = contentType?.toLowerCase().trim();

  if (lowerContentType === "video/mov") {
    return "video/quicktime";
  }

  if (lowerContentType && SUPPORTED_VIDEO_CONTENT_TYPES.has(lowerContentType)) {
    return lowerContentType;
  }

  const extension = uri?.split("?")[0]?.split(".").pop()?.toLowerCase();

  if (extension === "mp4" || extension === "m4v") return "video/mp4";
  if (extension === "mov" || extension === "qt") return "video/quicktime";

  return null;
};

const getGalleryFileExtension = (contentType: string) => {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case "video/quicktime":
      return "mov";
    case "video/mp4":
      return "mp4";
    default:
      return "jpg";
  }
};

const createGalleryStorageKey = (
  eventId: string,
  userId: string,
  contentType: string,
  index: number,
) => {
  const safeEventId = encodeURIComponent(eventId);
  const safeUserId = encodeURIComponent(userId);
  const suffix = `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}`;

  return `events/gallery/${safeEventId}/${safeUserId}/${suffix}.${getGalleryFileExtension(contentType)}`;
};

const formatFailureMessage = (failures: string[]) => {
  if (failures.length === 0) {
    return "";
  }

  if (failures.length <= 3) {
    return failures.join("\n");
  }

  return `${failures.slice(0, 3).join("\n")}\n${failures.length - 3} more failed.`;
};

const resolveHostAvatar = (host?: EventHost | null) => {
  const avatarKey = getNonEmptyString(host?.avatarKey);

  if (avatarKey) {
    try {
      return getStorageFileUrl(avatarKey);
    } catch {
      // Fall through to avatarUrl below.
    }
  }

  const avatarUrl = getNonEmptyString(host?.avatarUrl);

  if (avatarUrl) {
    return isDirectMediaUrl(avatarUrl) ? avatarUrl : "";
  }

  return "";
};

const getHostInitial = (host?: EventHost | null) => {
  const source = host?.name?.trim() || host?.username?.trim() || "H";

  return source.charAt(0).toUpperCase();
};

type LocationLineProps = {
  label: string;
  value?: string | null;
  labelColor: string;
  valueColor: string;
};

const LocationLine = ({ label, value, labelColor, valueColor }: LocationLineProps) => {
  if (!value) {
    return null;
  }

  return (
    <Text style={[styles.detailLabel, { color: labelColor }]}>
      {label}: <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </Text>
  );
};

type EventLocationMapProps = {
  location?: EventLocation | null;
  markerImage: string;
  markerLabel: string;
  fallbackColor: string;
  markerColor: string;
  onExpand: () => void;
};

const EventLocationMap = ({
  location,
  markerImage,
  markerLabel,
  fallbackColor,
  markerColor,
  onExpand,
}: EventLocationMapProps) => {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const hasCoordinates = isFiniteCoordinate(latitude) && isFiniteCoordinate(longitude);
  const coordinate: [number, number] | null = hasCoordinates ? [longitude, latitude] : null;

  useEffect(() => {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }, []);

  if (!coordinate) {
    return (
      <View style={[styles.mapContainer, styles.mapFallback, { backgroundColor: fallbackColor }]}>
        <Ionicons name="map-outline" size={22} color="#B3B3B3" />
        <Text style={styles.mapFallbackText}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={APP_MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={false}
        scrollEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        <Mapbox.Camera
          ref={cameraRef}
          animationDuration={0}
          centerCoordinate={coordinate}
          zoomLevel={14.5}
        />
        <Mapbox.MarkerView coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }}>
          <View
            style={[styles.eventMarkerButton, { borderColor: markerColor, shadowColor: markerColor }]}
            accessibilityLabel={`${markerLabel} location`}
          >
            {markerImage ? (
              <Image source={{ uri: markerImage }} style={styles.eventMarkerImage} contentFit="cover" />
            ) : (
              <View style={[styles.eventMarkerDot, { backgroundColor: markerColor }]} />
            )}
          </View>
        </Mapbox.MarkerView>
      </Mapbox.MapView>
      <TouchableOpacity style={styles.expandMapBtn} activeOpacity={0.85} onPress={onExpand}>
        <Feather name="maximize" size={16} color="#B3B3B3" />
      </TouchableOpacity>
    </View>
  );
};

type GallerySkeletonTileProps = {
  pulse: Animated.Value;
  color: string;
};

const GallerySkeletonTile = React.memo(function GallerySkeletonTile({ pulse, color }: GallerySkeletonTileProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.galleryItemContainer, styles.gallerySkeletonTile, { backgroundColor: color, opacity: pulse }]}
    />
  );
});

type GalleryMediaTileProps = {
  item: EventMedia;
  index: number;
  shouldLoadMedia: boolean;
  isLoaded: boolean;
  cardColor: string;
  skeletonColor: string;
  pulse: Animated.Value;
  requestHeaders?: Record<string, string>;
  onPress: (index: number) => void;
  onTileLoaded: (id: string) => void;
};

const GalleryMediaTile = React.memo(function GalleryMediaTile({
  item,
  index,
  shouldLoadMedia,
  isLoaded,
  cardColor,
  skeletonColor,
  pulse,
  requestHeaders,
  onPress,
  onTileLoaded,
}: GalleryMediaTileProps) {
  const [videoPoster, setVideoPoster] = useState<StoryThumbnailSource>(() =>
    item.type === "video" ? getCachedStoryThumbnail(`event-gallery-${item.id}`) : null);

  useEffect(() => {
    if (item.type !== "video" || videoPoster || !shouldLoadMedia) {
      return undefined;
    }

    let isActive = true;

    generateStoryThumbnail(item.url, requestHeaders).then((thumbnail) => {
      if (!isActive) {
        return;
      }

      if (thumbnail) {
        setCachedStoryThumbnail(`event-gallery-${item.id}`, thumbnail);
        setVideoPoster(thumbnail);
      }
      onTileLoaded(item.id);
    });

    return () => {
      isActive = false;
    };
  }, [item.id, item.type, item.url, onTileLoaded, requestHeaders, shouldLoadMedia, videoPoster]);

  if (!shouldLoadMedia) {
    return <GallerySkeletonTile pulse={pulse} color={skeletonColor} />;
  }

  return (
    <TouchableOpacity
      style={[styles.galleryItemContainer, { backgroundColor: cardColor }]}
      onPress={() => onPress(index)}
      activeOpacity={0.9}
    >
      {item.type === "image" ? (
        <>
          <Image
            source={{ uri: item.url, headers: requestHeaders }}
            style={styles.galleryImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={item.id}
            onLoadEnd={() => onTileLoaded(item.id)}
            onError={() => onTileLoaded(item.id)}
          />
          {!isLoaded ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.galleryTileSkeletonOverlay, { backgroundColor: skeletonColor, opacity: pulse }]}
            />
          ) : null}
        </>
      ) : (
        <>
          {videoPoster ? (
            <Image
              source={videoPoster}
              style={styles.galleryImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Animated.View
              pointerEvents="none"
              style={[styles.galleryTileSkeletonOverlay, { backgroundColor: skeletonColor, opacity: pulse }]}
            />
          )}
          <View style={styles.galleryVideoTile} />
        </>
      )}

      {item.type === "video" && (
        <View style={styles.galleryIcon}>
          <Ionicons name="videocam" size={12} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
});

type PendingGalleryTileProps = {
  item: PendingUploadItem;
  skeletonColor: string;
  pulse: Animated.Value;
};

const PendingGalleryTile = React.memo(function PendingGalleryTile({
  item,
  skeletonColor,
  pulse,
}: PendingGalleryTileProps) {
  const progressLabel =
    item.phase === "uploading" && typeof item.progress === "number"
      ? `${Math.round(Math.max(0, Math.min(1, item.progress)) * 100)}%`
      : item.phase === "saving"
        ? "Saving"
        : "Processing";

  return (
    <View style={[styles.galleryItemContainer, { backgroundColor: skeletonColor }]}>
      {item.previewSource ? (
        <Image
          source={item.previewSource}
          style={styles.galleryImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Animated.View
          pointerEvents="none"
          style={[styles.galleryTileSkeletonOverlay, { backgroundColor: skeletonColor, opacity: pulse }]}
        />
      )}
      <View style={styles.pendingGalleryOverlay}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.pendingGalleryText}>{progressLabel}</Text>
      </View>
      {item.type === "video" ? (
        <View style={styles.galleryIcon}>
          <Ionicons name="videocam" size={12} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
});

const AboutTab = ({
  eventId,
  eventStatus,
  description,
  ageRestriction,
  location,
  host,
  eventMedia = [],
  eventImageUris = [],
  isHostMode = false,
  isDraft = false,
  category,
  onHostFollowChange,
  onEventMediaUpdated,
}: AboutTabProps) => {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { colors, isDark } = useTheme();
  const sharedLocation = useAuthStore((state) =>
    state.user?.currentLocationSharingEnabled ? state.user.currentLocation : null,
  );
  const [subTab, setSubTab] = useState("Description");
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [isUploadingGalleryMedia, setIsUploadingGalleryMedia] = useState(false);
  const [galleryUploadPhase, setGalleryUploadPhase] = useState<GalleryUploadPhase>("idle");
  const [pendingUploadItems, setPendingUploadItems] = useState<PendingUploadItem[]>([]);
  const [loadedTileIds, setLoadedTileIds] = useState<Set<string>>(() => new Set());
  const [renderableMediaCount, setRenderableMediaCount] = useState(INITIAL_GALLERY_MEDIA_RENDER_COUNT);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [isHostFollowing, setIsHostFollowing] = useState(Boolean(host?.isFollowing));
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [hostFollowerDelta, setHostFollowerDelta] = useState(0);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [hostAvatarFailed, setHostAvatarFailed] = useState(false);
  const isMountedRef = useRef(true);
  const uploadLockRef = useRef(false);
  const uploadBatchRef = useRef(0);
  const deleteLockRef = useRef<string | null>(null);
  const skeletonPulse = useRef(new Animated.Value(0.65)).current;

  const hostAvatar = useMemo(() => resolveHostAvatar(host), [host]);
  const hostInitial = useMemo(() => getHostInitial(host), [host]);
  const hostFollowers = useMemo(() => {
    const baseFollowers = typeof host?.followersCount === "number" ? host.followersCount : 0;

    return formatCompactCount(baseFollowers + hostFollowerDelta);
  }, [host?.followersCount, hostFollowerDelta]);

  const hostEvents = useMemo(() => formatCompactCount(host?.eventsCount), [host?.eventsCount]);

  const markerColor = getCategoryColor(category);
  const locationLabel = location?.searchLabel || location?.venue || location?.address || "Location";
  const primaryEventImage = eventImageUris[0] ?? "";
  const hasEventCoordinates = isFiniteCoordinate(location?.latitude) && isFiniteCoordinate(location?.longitude);
  const hasSharedCoordinates =
    isFiniteCoordinate(sharedLocation?.latitude) && isFiniteCoordinate(sharedLocation?.longitude);
  const galleryMedia = useMemo(
    () => [...eventMedia]
      .filter((item) => Boolean(item.url?.trim()))
      .sort((first, second) => {
        const firstOrder = typeof first.displayOrder === "number" ? first.displayOrder : 0;
        const secondOrder = typeof second.displayOrder === "number" ? second.displayOrder : 0;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
      }),
    [eventMedia],
  );
  const galleryMediaIds = useMemo(() => galleryMedia.map((item) => item.id).join("|"), [galleryMedia]);
  const viewerMediaItems = useMemo<FullScreenMediaItem[]>(
    () => galleryMedia.map((item) => ({
      id: item.id,
      uri: item.url,
      type: item.type,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })),
    [accessToken, galleryMedia],
  );
  const mediaRequestHeaders = useMemo(
    () => accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    [accessToken],
  );
  const canUploadGalleryMedia = isHostMode && Boolean(eventId && currentUserId);
  const galleryUploadDisabled =
    !canUploadGalleryMedia ||
    isUploadingGalleryMedia ||
    galleryUploadPhase !== "idle" ||
    eventStatus === "cancelled" ||
    galleryMedia.length >= MAX_EVENT_MEDIA_ITEMS;
  const canDeleteGalleryMedia = canUploadGalleryMedia && eventStatus !== "cancelled";
  const gallerySkeletonColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const cardBackground = isDark ? "rgba(17, 17, 17, 0.8)" : colors.card;
  const mutedCardBackground = isDark ? "rgba(17, 17, 17, 0.8)" : "rgba(0, 0, 0, 0.03)";
  const isAgeRestricted = ageRestriction === "18_plus" || ageRestriction === "21_plus";

  const setUploadState = useCallback((nextIsUploading: boolean, nextPhase: GalleryUploadPhase) => {
    if (!isMountedRef.current) {
      return;
    }

    setIsUploadingGalleryMedia(nextIsUploading);
    setGalleryUploadPhase(nextPhase);
  }, []);

  const setPendingUploadState = useCallback((updater: React.SetStateAction<PendingUploadItem[]>) => {
    if (!isMountedRef.current) {
      return;
    }

    setPendingUploadItems(updater);
  }, []);

  const updatePendingUploadItem = useCallback((
    batchId: number,
    pickerIndex: number,
    patch: Partial<Pick<PendingUploadItem, "phase" | "progress" | "previewSource">>,
  ) => {
    setPendingUploadState((current) => current.map((item) => (
      item.batchId === batchId && item.pickerIndex === pickerIndex
        ? { ...item, ...patch }
        : item
    )));
  }, [setPendingUploadState]);

  const handleGalleryTilePress = useCallback((index: number) => {
    setSelectedMediaIndex(index);
    setMediaViewerVisible(true);
  }, []);

  const markGalleryTileLoaded = useCallback((id: string) => {
    setLoadedTileIds((current) => {
      if (current.has(id)) {
        return current;
      }

      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const handleDeleteGalleryMedia = useCallback(async (mediaId?: string | null) => {
    if (!eventId || !mediaId || !canDeleteGalleryMedia || deleteLockRef.current) {
      return;
    }

    deleteLockRef.current = mediaId;
    setDeletingMediaId(mediaId);

    try {
      const result = await deleteEventMedia(eventId, mediaId);
      onEventMediaUpdated?.(result.event);
      const remainingCount = result.event.eventMedia?.length ?? 0;

      if (remainingCount === 0) {
        setMediaViewerVisible(false);
        setSelectedMediaIndex(0);
      } else {
        setSelectedMediaIndex((currentIndex) => Math.min(currentIndex, remainingCount - 1));
      }
    } catch (error) {
      Alert.alert("Unable to delete media", getAuthErrorMessage(error, "Please try again."));
    } finally {
      if (isMountedRef.current) {
        setDeletingMediaId(null);
      }
      deleteLockRef.current = null;
    }
  }, [canDeleteGalleryMedia, eventId, onEventMediaUpdated]);

  const confirmDeleteGalleryMedia = useCallback((item: FullScreenMediaItem) => {
    if (!item.id || !canDeleteGalleryMedia || deletingMediaId) {
      return;
    }

    Alert.alert(
      "Delete media",
      "Remove this item from the event Gallery?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDeleteGalleryMedia(item.id);
          },
        },
      ],
    );
  }, [canDeleteGalleryMedia, deletingMediaId, handleDeleteGalleryMedia]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      uploadLockRef.current = false;
      deleteLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.65,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [skeletonPulse]);

  useEffect(() => {
    const availableIds = new Set(galleryMedia.map((item) => item.id));

    setLoadedTileIds((current) => {
      const next = new Set([...current].filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [galleryMediaIds, galleryMedia]);

  useEffect(() => {
    const totalMedia = galleryMedia.length;
    setRenderableMediaCount(Math.min(INITIAL_GALLERY_MEDIA_RENDER_COUNT, totalMedia));

    if (totalMedia <= INITIAL_GALLERY_MEDIA_RENDER_COUNT) {
      return undefined;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let isCancelled = false;

    const scheduleNextBatch = () => {
      timeout = setTimeout(() => {
        if (isCancelled || !isMountedRef.current) {
          return;
        }

        setRenderableMediaCount((current) => {
          const next = Math.min(totalMedia, current + GALLERY_MEDIA_RENDER_BATCH_SIZE);

          if (next < totalMedia) {
            scheduleNextBatch();
          }

          return next;
        });
      }, 250);
    };

    const task = InteractionManager.runAfterInteractions(scheduleNextBatch);

    return () => {
      isCancelled = true;
      task.cancel?.();
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [galleryMedia.length, galleryMediaIds]);

  const openInGoogleMaps = () => {
    setShowMapsModal(false);
    const lat = location?.latitude;
    const lng = location?.longitude;
    let url: string;
    if (isFiniteCoordinate(lat) && isFiniteCoordinate(lng)) {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else {
      const query = location?.address || location?.venue || locationLabel;
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
    Linking.openURL(url);
  };

  const openEventMap = () => {
    if (!hasEventCoordinates) {
      return;
    }

    router.push({
      pathname: "/event-screen/map",
      params: {
        eventLatitude: String(location.latitude),
        eventLongitude: String(location.longitude),
        eventTitle: locationLabel,
        eventVenue: location?.venue ?? "",
        eventAddress: location?.address ?? "",
        markerImage: primaryEventImage,
        eventCategory: category ?? "",
        ...(hasSharedCoordinates
          ? {
              userLatitude: String(sharedLocation.latitude),
              userLongitude: String(sharedLocation.longitude),
            }
          : {}),
      },
    });
  };

  useEffect(() => {
    setIsHostFollowing(Boolean(host?.isFollowing));
    setHostFollowerDelta(0);
  }, [host?.id, host?.isFollowing]);

  useEffect(() => {
    setHostAvatarFailed(false);
  }, [hostAvatar]);

  const toggleHostFollow = async () => {
    if (!host?.id || isHostMode || isFollowPending) {
      return;
    }

    const wasFollowing = isHostFollowing;
    setIsHostFollowing(!wasFollowing);
    setHostFollowerDelta((current) => current + (wasFollowing ? -1 : 1));
    setIsFollowPending(true);

    try {
      const follow = wasFollowing ? await unfollowUser(host.id) : await followUser(host.id);
      setIsHostFollowing(follow.isFollowing);
      setHostFollowerDelta(follow.isFollowing === Boolean(host?.isFollowing) ? 0 : follow.isFollowing ? 1 : -1);
      onHostFollowChange?.(follow.isFollowing);
    } catch (error) {
      setIsHostFollowing(wasFollowing);
      setHostFollowerDelta((current) => current + (wasFollowing ? 1 : -1));
      Alert.alert(
        wasFollowing ? "Unable to unfollow" : "Unable to follow",
        getAuthErrorMessage(error, "Please try again."),
      );
    } finally {
      setIsFollowPending(false);
    }
  };

  const openHostProfile = () => {
    if (!host?.id) return;

    const hostName = host.name?.trim() || host.username?.trim() || "Host";

    navigateToProfile(router, currentUserId, {
      userId: host.id,
      name: hostName,
      avatar: hostAvatar,
      isFollowing: isHostFollowing,
    });
  };

  const buildImageMediaInput = async (
    asset: ImagePicker.ImagePickerAsset,
    batchId: number,
    index: number,
  ): Promise<EventMediaInput> => {
    const originalContentType = normalizeImageContentType(asset.mimeType, asset.uri);

    if (!originalContentType) {
      throw new Error("Unsupported image format.");
    }

    if (typeof asset.fileSize === "number" && asset.fileSize > EVENT_MEDIA_IMAGE_MAX_BYTES) {
      throw new Error("Image is larger than 15 MB.");
    }

    const optimized = await optimizeStoryImageForUpload({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      contentType: originalContentType,
    });
    updatePendingUploadItem(batchId, index, {
      phase: "processing",
      previewSource: { uri: optimized.uri },
    });
    const bytes = await getLocalUriByteSize(optimized.uri) ?? asset.fileSize ?? null;

    if (!bytes || bytes <= 0) {
      throw new Error("Unable to inspect the selected image.");
    }

    if (bytes > EVENT_MEDIA_IMAGE_MAX_BYTES) {
      throw new Error("Image is larger than 15 MB.");
    }

    setUploadState(true, "uploading");
    updatePendingUploadItem(batchId, index, { phase: "uploading", progress: 0 });
    const storageKey = createGalleryStorageKey(eventId!, currentUserId!, optimized.contentType, index);
    await uploadFileToStorage({
      uri: optimized.uri,
      key: storageKey,
      contentType: optimized.contentType,
      onProgress: (progress) => updatePendingUploadItem(batchId, index, { phase: "uploading", progress }),
    });

    return {
      type: "image",
      storageKey,
      contentType: optimized.contentType,
      fileSize: bytes,
      width: optimized.width,
      height: optimized.height,
    };
  };

  const buildVideoMediaInput = async (
    asset: ImagePicker.ImagePickerAsset,
    batchId: number,
    index: number,
  ): Promise<EventMediaInput> => {
    const contentType = normalizeVideoContentType(asset.mimeType, asset.uri);

    if (!contentType) {
      throw new Error("Unsupported video format.");
    }

    const durationSeconds = typeof asset.duration === "number" ? asset.duration / 1000 : null;

    if (!durationSeconds || durationSeconds <= 0) {
      throw new Error("Unable to inspect the selected video duration.");
    }

    if (durationSeconds > MAX_EVENT_MEDIA_VIDEO_DURATION_SECONDS) {
      throw new Error("Video is longer than 10 minutes.");
    }

    const prepared = await prepareEventGalleryVideoForUpload(asset.uri, contentType, () => undefined);
    const thumbnail = await generateStoryThumbnail(prepared.uri);
    if (thumbnail) {
      updatePendingUploadItem(batchId, index, {
        phase: "processing",
        previewSource: thumbnail,
      });
    }

    if ((prepared.bytes ?? 0) > EVENT_MEDIA_VIDEO_MAX_BYTES) {
      throw new Error("Video is larger than 300 MB.");
    }

    setUploadState(true, "uploading");
    updatePendingUploadItem(batchId, index, { phase: "uploading", progress: 0 });
    const storageKey = createGalleryStorageKey(eventId!, currentUserId!, prepared.contentType, index);
    await uploadFileToStorage({
      uri: prepared.uri,
      key: storageKey,
      contentType: prepared.contentType,
      onProgress: (progress) => updatePendingUploadItem(batchId, index, { phase: "uploading", progress }),
    });

    return {
      type: "video",
      storageKey,
      contentType: prepared.contentType,
      fileSize: prepared.bytes,
      width: asset.width || null,
      height: asset.height || null,
      durationSeconds,
    };
  };

  const handleUploadFromGallery = async () => {
    if (uploadLockRef.current || galleryUploadDisabled || !eventId || !currentUserId) {
      return;
    }

    uploadLockRef.current = true;
    const batchId = uploadBatchRef.current + 1;
    uploadBatchRef.current = batchId;
    setUploadState(true, "opening");

    const remainingSlots = MAX_EVENT_MEDIA_ITEMS - galleryMedia.length;

    if (remainingSlots <= 0) {
      uploadLockRef.current = false;
      setUploadState(false, "idle");
      Alert.alert("Gallery full", "This event already has 30 media items.");
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo library access to upload event media.");
        return;
      }

      const selectionLimit = Math.min(MAX_EVENT_MEDIA_BATCH_ITEMS, remainingSlots);
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit,
        orderedSelection: true,
        quality: 0.85,
        videoMaxDuration: MAX_EVENT_MEDIA_VIDEO_DURATION_SECONDS,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_640x480,
      });

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        return;
      }

      const selectedAssets = pickerResult.assets.slice(0, selectionLimit);
      setPendingUploadState(selectedAssets.map((asset, pickerIndex) => ({
        id: `upload-${batchId}-${pickerIndex}`,
        batchId,
        pickerIndex,
        type: asset.type === "video" ? "video" : "image",
        phase: "processing",
        progress: null,
        previewSource: asset.type === "image" ? { uri: asset.uri } : null,
      })));
      setUploadState(true, "processing");

      const failures: string[] = [];
      const mediaInputs: { input: EventMediaInput; pickerIndex: number }[] = [];

      for (const [index, asset] of selectedAssets.entries()) {
        try {
          setUploadState(true, "processing");
          if (asset.type === "video") {
            mediaInputs.push({ input: await buildVideoMediaInput(asset, batchId, index), pickerIndex: index });
          } else if (asset.type === "image") {
            mediaInputs.push({ input: await buildImageMediaInput(asset, batchId, index), pickerIndex: index });
          } else {
            throw new Error("Unsupported media type.");
          }
        } catch (error) {
          failures.push(`Item ${index + 1}: ${getAuthErrorMessage(error, "Unable to upload this media.")}`);
          setPendingUploadState((current) =>
            current.filter((item) => !(item.batchId === batchId && item.pickerIndex === index)));
        }
      }

      if (mediaInputs.length > 0) {
        setUploadState(true, "persisting");
        setPendingUploadState((current) => current.map((item) => (
          item.batchId === batchId ? { ...item, phase: "saving", progress: null } : item
        )));
        const result = await addEventMedia(eventId, mediaInputs.map((item) => item.input));
        setUploadState(true, "refreshing");
        onEventMediaUpdated?.(result.event);

        for (const failure of result.failures) {
          const originalIndex = mediaInputs[failure.index]?.pickerIndex ?? failure.index;
          failures.push(`Item ${originalIndex + 1}: ${failure.message}`);
          setPendingUploadState((current) =>
            current.filter((item) => !(item.batchId === batchId && item.pickerIndex === originalIndex)));
        }
      }

      if (failures.length > 0) {
        Alert.alert("Some media could not be uploaded", formatFailureMessage(failures));
      }
    } catch (error) {
      Alert.alert("Unable to upload media", getAuthErrorMessage(error, "Please try again."));
    } finally {
      setPendingUploadState((current) => current.filter((item) => item.batchId !== batchId));
      setUploadState(false, "idle");
      uploadLockRef.current = false;
    }
  };

  const renderGallery = () => (
    <View>
      {isHostMode ? (
        <TouchableOpacity
          style={styles.uploadGalleryButton}
          activeOpacity={0.8}
          disabled={galleryUploadDisabled}
          onPress={handleUploadFromGallery}
          accessibilityRole="button"
          accessibilityState={{ disabled: galleryUploadDisabled }}
          accessibilityLabel="Upload from gallery"
        >
          <HugeiconsIcon icon={UploadCircle01Icon} size={20} color="#111111" />
          <Text style={styles.uploadGalleryButtonText}>Upload from gallery</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.galleryGrid}>
        {galleryMedia.map((item, index) => (
          <GalleryMediaTile
            key={item.id}
            item={item}
            index={index}
            shouldLoadMedia={index < renderableMediaCount}
            isLoaded={item.type === "video" || loadedTileIds.has(item.id)}
            cardColor={colors.card}
            skeletonColor={gallerySkeletonColor}
            pulse={skeletonPulse}
            requestHeaders={mediaRequestHeaders}
            onPress={handleGalleryTilePress}
            onTileLoaded={markGalleryTileLoaded}
          />
        ))}
        {pendingUploadItems.map((item) => (
          <PendingGalleryTile
            key={item.id}
            item={item}
            skeletonColor={gallerySkeletonColor}
            pulse={skeletonPulse}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View>
      <FullScreenMediaModal
        visible={mediaViewerVisible}
        mediaItems={viewerMediaItems}
        initialIndex={selectedMediaIndex}
        onClose={() => setMediaViewerVisible(false)}
        onIndexChange={setSelectedMediaIndex}
        canDeleteCurrent={(item) => Boolean(item.id && canDeleteGalleryMedia)}
        deletingItemId={deletingMediaId}
        onDeleteCurrent={confirmDeleteGalleryMedia}
      />

      <Modal
        visible={showMapsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMapsModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMapsModal(false)}>
          <View style={styles.mapsModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.mapsModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.mapsModalHeader}>
                  <View style={[styles.mapsModalIconContainer, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)" }]}>
                    <Ionicons name="map-outline" size={22} color={isDark ? colors.primary : colors.text} />
                  </View>
                  <Text style={[styles.mapsModalTitle, { color: colors.text }]}>Open in Google Maps?</Text>
                </View>
                <Text style={[styles.mapsModalDesc, { color: colors.textSecondary }]}>
                  Do you want to open this event location in Google Maps?
                </Text>
                <View style={styles.mapsModalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.mapsModalBtnOpen,
                      {
                        borderWidth: isDark ? 0 : 1,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={openInGoogleMaps}
                  >
                    <Feather name="map" size={16} color="#111111" />
                    <Text style={styles.mapsModalBtnOpenText}>Open Google Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mapsModalBtnCancel}
                    activeOpacity={0.8}
                    onPress={() => setShowMapsModal(false)}
                  >
                    <Feather name="x-circle" size={16} color="#D44343" />
                    <Text style={styles.mapsModalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <SegmentedControl
        options={["Description", "Gallery"]}
        selectedOption={subTab}
        onSelect={setSubTab}
        containerStyle={styles.subTabContainer}
        segmentStyle={styles.subTabSegment}
        renderOption={(option, isSelected) => (
          <Ionicons
            name={
              option === "Description"
                ? isSelected
                  ? "document-text"
                  : "document-text-outline"
                : isSelected
                  ? "images"
                  : "images-outline"
            }
            size={20}
            color={isSelected ? colors.text : colors.textSecondary}
          />
        )}
      />

      <View style={styles.contentStack}>
        {subTab === "Description" ? (
          <>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {description?.trim() || "Description unavailable"}
            </Text>
            <View style={[styles.ageTag, { backgroundColor: isAgeRestricted ? "#FFFFFF" : "rgba(255, 255, 255, 0.08)" }]}>
              <Text style={[styles.ageTagText, { color: isAgeRestricted ? "#E83030" : colors.text }]}>
                {formatAgeLabel(ageRestriction)}
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Location</Text>
              <TouchableOpacity
                style={[styles.locationCard, { backgroundColor: cardBackground }]}
                activeOpacity={0.8}
                onPress={() => setShowMapsModal(true)}
              >
                <View style={styles.locationHeader}>
                  <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.locationCity, { color: colors.text }]} numberOfLines={1}>
                    {locationLabel}
                  </Text>
                </View>
                <View style={styles.locationDetails}>
                  <LocationLine label="Venue" value={location?.venue} labelColor={colors.text} valueColor={colors.textSecondary} />
                  <LocationLine label="Address" value={location?.address} labelColor={colors.text} valueColor={colors.textSecondary} />
                </View>
              </TouchableOpacity>

              <EventLocationMap
                location={location}
                markerImage={primaryEventImage}
                markerLabel={locationLabel}
                fallbackColor={cardBackground}
                markerColor={markerColor}
                onExpand={openEventMap}
              />
            </View>

            {location?.additionalInfo?.trim() ? (
              <View style={[styles.additionalInfoCard, { backgroundColor: mutedCardBackground }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Additional Info</Text>
                <Text style={[styles.bulletItem, { color: colors.textSecondary }]}>
                  {location.additionalInfo.trim()}
                </Text>
              </View>
            ) : null}

            {!isHostMode && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Host</Text>
                <View style={[styles.hostCard, { backgroundColor: cardBackground }]}>
                  <View style={styles.hostCardHeader}>
                    <TouchableOpacity activeOpacity={0.7} onPress={openHostProfile}>
                      {hostAvatar && !hostAvatarFailed ? (
                        <Image
                          source={{ uri: hostAvatar }}
                          style={styles.hostCardAvatar}
                          contentFit="cover"
                          onError={() => setHostAvatarFailed(true)}
                        />
                      ) : (
                        <View style={[styles.hostCardAvatar, styles.hostCardAvatarFallback]}>
                          <Text style={styles.hostCardAvatarFallbackText}>{hostInitial}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.hostCardInfo} activeOpacity={0.7} onPress={openHostProfile}>
                      <Text style={[styles.hostCardName, { color: colors.text }]}>{host?.name ?? "Host"}</Text>
                      {!!host?.username && (
                        <Text style={[styles.hostCardUser, { color: colors.textSecondary }]}>
                          @{host.username.replace(/^@+/, "")}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.followBtnLarge,
                        isHostFollowing && styles.followingBtnLarge,
                      ]}
                      activeOpacity={0.8}
                      disabled={isFollowPending}
                      onPress={toggleHostFollow}
                    >
                      <Text style={[styles.followBtnTextLarge, isHostFollowing && styles.followingBtnTextLarge]}>
                        {isHostFollowing ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.hostStatsRow}>
                    <Text style={[styles.hostStatItem, { color: colors.textSecondary }]}>
                      <Text style={[styles.hostStatValue, { color: colors.textSecondary }]}>{hostFollowers}</Text> Followers
                    </Text>
                    <Text style={[styles.hostStatItem, { color: colors.textSecondary }]}>
                      <Text style={[styles.hostStatValue, { color: colors.textSecondary }]}>{hostEvents}</Text> Events
                    </Text>
                  </View>
                  <Text style={[styles.hostBio, { color: colors.textSecondary }]}>
                    {host?.bio?.trim() || "Bio unavailable"}
                  </Text>
                </View>
              </>
            )}

            {isHostMode && !isDraft && (
              <View style={styles.withdrawalCard}>
                <Feather name="shield" size={20} color="#1D9E75" />
                <Text style={styles.withdrawalText}>Withdrawal will be available 72 hours after event completion</Text>
              </View>
            )}
          </>
        ) : (
          renderGallery()
        )}
      </View>
    </View>
  );
};

export default AboutTab;

const styles = StyleSheet.create({
  contentStack: {
    gap: 16,
    marginTop: 24,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  ageTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ageTagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionBlock: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  locationCard: {
    borderRadius: 12,
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationCity: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  locationDetails: {
    gap: 8,
    paddingLeft: 32,
  },
  detailLabel: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailValue: {
    fontWeight: "700",
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mapFallbackText: {
    color: "#B3B3B3",
    fontSize: 13,
    fontWeight: "600",
  },
  eventMarkerButton: {
    alignItems: "center",
    backgroundColor: "#080808",
    borderRadius: 28,
    borderWidth: 3,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
    width: 56,
  },
  eventMarkerImage: {
    height: "100%",
    width: "100%",
  },
  eventMarkerDot: {
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  expandMapBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(17, 17, 17, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  additionalInfoCard: {
    borderRadius: 12,
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  bulletItem: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 24,
  },
  hostCard: {
    borderRadius: 12,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hostCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  hostCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: "#C05178",
    borderWidth: 2,
  },
  hostCardAvatarFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    overflow: "hidden",
  },
  hostCardAvatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  hostCardInfo: {
    flex: 1,
  },
  hostCardName: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  hostCardUser: {
    fontSize: 12,
    lineHeight: 16,
  },
  followBtnLarge: {
    alignItems: "center",
    borderColor: "#AC86D4",
    borderRadius: 8,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  followingBtnLarge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 0,
  },
  followBtnTextLarge: {
    color: "#AC86D4",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  followingBtnTextLarge: {
    color: "#8E8E9B",
    fontSize: 11,
    fontWeight: "600",
  },
  hostStatsRow: {
    flexDirection: "row",
    gap: 25,
  },
  hostStatItem: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  hostStatValue: {
    fontWeight: "700",
  },
  hostBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  subTabContainer: {
    height: 40,
    marginBottom: 0,
    marginTop: 16,
    minHeight: 40,
    width: "100%",
  },
  subTabSegment: {
    height: 32,
    justifyContent: "center",
    paddingVertical: 0,
  },
  withdrawalCard: {
    alignItems: "center",
    backgroundColor: "rgba(14, 198, 23, 0.1)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  withdrawalText: {
    color: "#1D9E75",
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22,
  },
  uploadGalleryButton: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    backgroundColor: "#B3B3B3",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: "100%",
  },
  uploadGalleryButtonText: {
    alignItems: "center",
    color: "#111111",
    display: "flex",
    fontFamily: "SF Pro",
    fontSize: 16,
    fontWeight: "400",
    height: 19,
    lineHeight: 19,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
  },
  galleryItemContainer: {
    width: (width - 48) / 3,
    aspectRatio: 0.75,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  gallerySkeletonTile: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  galleryTileSkeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
  },
  galleryVideoTile: {
    ...StyleSheet.absoluteFillObject,
  },
  galleryIcon: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: [{ translateX: -12 }],
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  pendingGalleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    borderRadius: 60,
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 8,
    zIndex: 2,
  },
  pendingGalleryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    textAlign: "center",
  },
  mapsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  mapsModalCard: {
    borderRadius: 24,
    padding: 24,
    gap: 16,
    width: "100%",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  mapsModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mapsModalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  mapsModalTitle: {
    fontSize: 19,
    fontWeight: "700",
    flex: 1,
  },
  mapsModalDesc: {
    fontSize: 14,
    lineHeight: 22,
  },
  mapsModalButtons: {
    flexDirection: "column",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  mapsModalBtnCancel: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#150B0B",
    paddingVertical: 14,
    borderRadius: 12,
  },
  mapsModalBtnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D44343",
  },
  mapsModalBtnOpen: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
  },
  mapsModalBtnOpenText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    textAlign: "center",
  },
});

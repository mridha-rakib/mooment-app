import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { cancelEvent, getMyProfileEvents, type EventResponse, type ProfileEventGroups } from "@/lib/events";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { getStorageFileUrl } from "@/lib/storage";
import { useAuthStore } from "@/stores/authStore";
import FeedPost, { PostData } from "../post/FeedPost";

const ACTIVE_EVENT_WINDOW_MS = 12 * 60 * 60 * 1000;
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400";

const EMPTY_PROFILE_EVENTS: ProfileEventGroups = {
  active: [],
  past: [],
};

type ProfileEventsProps = {
  onCommentPress: (post: PostData) => void;
  onSharePress: (post: PostData) => void;
  isOwnProfile?: boolean;
};

const formatTimeAgo = (createdAt?: string | null) => {
  if (!createdAt) {
    return "Just now";
  }

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));

  if (elapsedSeconds < 60) {
    return "Just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours} hr ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
};

const formatEventDateTime = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return "Date TBA";
  }

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) {
    return "Date TBA";
  }

  const eventDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  const eventTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${eventDate} • ${eventTime}`;
};

const isLiveEvent = (scheduledAt?: string | null) => {
  if (!scheduledAt) {
    return false;
  }

  const scheduledTime = new Date(scheduledAt).getTime();
  const now = Date.now();

  return Number.isFinite(scheduledTime) && scheduledTime <= now && now - scheduledTime <= ACTIVE_EVENT_WINDOW_MS;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMiles = (from: [number, number], to: [number, number]) => {
  const earthRadiusKm = 6371;
  const [fromLongitude, fromLatitude] = from;
  const [toLongitude, toLatitude] = to;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distanceKm = 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return distanceKm * 0.621371;
};

const formatLocationLabel = (event: EventResponse) =>
  event.location?.venue || event.location?.address || event.location?.searchLabel || "Location TBA";

const formatDistanceOrLocation = (event: EventResponse, userLocation: [number, number] | null) => {
  const latitude = event.location?.latitude;
  const longitude = event.location?.longitude;

  if (
    userLocation &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  ) {
    const miles = getDistanceMiles(userLocation, [longitude, latitude]);

    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles).toString()}mi`;
  }

  return formatLocationLabel(event);
};

const resolveStorageUrl = (key?: string | null, fallback?: string) => {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
};

const mapEventToPost = (
  event: EventResponse,
  userLocation: [number, number] | null,
  fallbackAuthor: { name: string; avatar: string },
): PostData => {
  const isLive = isLiveEvent(event.scheduledAt);
  const categoryTags = (event.categories?.length ? event.categories : event.category ? [event.category] : ["Event"])
    .map((category) => ({ label: category, bg: "#FFFFFF", color: "#000000" }));
  const tags = [
    ...categoryTags,
    {
      label: isLive ? "Live" : "Upcoming",
      bg: isLive ? "rgba(22, 216, 105, 0.2)" : "rgba(255, 125, 84, 0.2)",
      color: isLive ? "#16D869" : "#FF7D54",
    },
  ];
  const bannerPreviewUri = event.bannerImageKey ? resolveStorageUrl(event.bannerImageKey) : null;
  const bannerFullUri = event.bannerOriginalImageKey
    ? resolveStorageUrl(event.bannerOriginalImageKey)
    : bannerPreviewUri;
  const mediaUris = bannerFullUri ? [bannerFullUri] : [];
  const mediaItems = bannerPreviewUri
    ? [{
        uri: bannerPreviewUri,
        fullUri: bannerFullUri ?? bannerPreviewUri,
        type: "image" as const,
        displayCrop: event.bannerImageDisplay,
      }]
    : [];

  return {
    id: `event-${event.id}`,
    eventId: event.id,
    postType: "event",
    authorId: event.userId,
    authorName: event.host?.name || fallbackAuthor.name,
    authorAvatar: resolveStorageUrl(event.host?.avatarKey, fallbackAuthor.avatar) ?? fallbackAuthor.avatar,
    timeAgo: formatTimeAgo(event.publishedAt ?? event.createdAt),
    isPublic: event.privacy === "public",
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    mediaUris,
    mediaItems,
    eventDetails: {
      isLive,
      title: event.name || "Event",
      datetime: formatEventDateTime(event.scheduledAt),
      distance: formatDistanceOrLocation(event, userLocation),
      attendeesCount: 0,
      attendeesAvatars: [],
      tags,
    },
  };
};

export default function ProfileEvents({ onCommentPress, onSharePress, isOwnProfile = true }: ProfileEventsProps) {
  const [filter, setFilter] = useState<'active' | 'past'>('active');
  const [events, setEvents] = useState<ProfileEventGroups>(EMPTY_PROFILE_EVENTS);
  const user = useAuthStore((state) => state.user);
  const userLocation = useMemo(
    () =>
      typeof user?.currentLocation?.longitude === "number" && typeof user.currentLocation.latitude === "number"
        ? ([user.currentLocation.longitude, user.currentLocation.latitude] as [number, number])
        : null,
    [user?.currentLocation?.latitude, user?.currentLocation?.longitude],
  );
  const fallbackAuthor = useMemo(
    () => ({
      name: user?.name?.trim() || "Mooment User",
      avatar: resolveStorageUrl(user?.avatarKey, DEFAULT_AVATAR) ?? DEFAULT_AVATAR,
    }),
    [user?.avatarKey, user?.name],
  );
  const eventPosts = useMemo(
    () => events[filter].map((event) => mapEventToPost(event, userLocation, fallbackAuthor)),
    [events, fallbackAuthor, filter, userLocation],
  );

  const handleCancelEventPost = useCallback(
    (post: PostData) => {
      const eventId = post.eventId;
      if (!eventId) return;

      Alert.alert(
        "Cancel Event",
        "Are you sure you want to cancel this event? This cannot be undone.",
        [
          { text: "Keep Event", style: "cancel" },
          {
            text: "Cancel Event",
            style: "destructive",
            onPress: async () => {
              try {
                await cancelEvent(eventId);
                setEvents((prev) => ({
                  active: prev.active.filter((e) => e.id !== eventId),
                  past: prev.past.filter((e) => e.id !== eventId),
                }));
              } catch (error) {
                Alert.alert("Unable to cancel event", getAuthErrorMessage(error, "Please try again."));
              }
            },
          },
        ],
      );
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadEvents = async () => {
        try {
          const profileEvents = isOwnProfile ? await getMyProfileEvents() : EMPTY_PROFILE_EVENTS;

          if (isActive) {
            setEvents(profileEvents);
          }
        } catch {
          if (isActive) {
            setEvents(EMPTY_PROFILE_EVENTS);
          }
        }
      };

      void loadEvents();

      return () => {
        isActive = false;
      };
    }, [isOwnProfile]),
  );

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggleWrapper}>
        <BlurView intensity={20} tint="dark" style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, filter === 'active' && styles.toggleBtnActive]} 
            onPress={() => setFilter('active')}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInner}>
              <Feather name="zap" size={14} color={filter === 'active' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
              <Text style={[styles.toggleText, filter === 'active' && styles.toggleTextActive]}>Active</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, filter === 'past' && styles.toggleBtnActive]} 
            onPress={() => setFilter('past')}
            activeOpacity={0.8}
          >
            <View style={styles.toggleInner}>
              <Feather name="clock" size={14} color={filter === 'past' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'} />
              <Text style={[styles.toggleText, filter === 'past' && styles.toggleTextActive]}>Past</Text>
            </View>
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Events List */}
      <View style={styles.list}>
        {eventPosts.map((event) => (
          <FeedPost
            key={event.id}
            post={event}
            onCommentPress={onCommentPress}
            onSharePress={onSharePress}
            isOwnPost={isOwnProfile}
            onDeletePress={isOwnProfile && filter === 'active' ? handleCancelEventPost : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 15,
  },
  toggleWrapper: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(104, 104, 104, 0.1)', // #686868 at 10%
    padding: 4,
    height: 40,
    alignItems: 'center',
    gap: 12, // Gap from Figma
  },
  toggleBtn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(104, 104, 104, 0.4)', // #686868 at 40%
  },
  toggleText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  
  list: {
    marginTop: 10,
  },
});

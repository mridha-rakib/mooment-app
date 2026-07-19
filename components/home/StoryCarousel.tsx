import type {
  StoryMediaType,
  StoryTextBackground,
  StoryTextOverlay,
} from "@/lib/stories";
import {
  generateStoryThumbnail,
  getCachedStoryThumbnail,
  setCachedStoryThumbnail,
  type StoryThumbnailSource,
} from "@/lib/storyThumbnails";
import {
  createStoryViewerSession,
  type StoryViewerTab,
} from "@/lib/storyViewerSession";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import UserAvatar from "../ui/UserAvatar";

export type StoryData = {
  id: string;
  type: "add" | "live" | "standard" | "muted";
  isOwnStory?: boolean;
  imageUri?: string | null;
  mediaUri?: string | null;
  contentType?: string | null;
  mediaType?: StoryMediaType;
  textContent?: string | null;
  textBackground?: StoryTextBackground | null;
  textOverlay?: StoryTextOverlay | null;
  storyItems?: StorySequenceItem[];
  title?: string;
  authorName?: string;
  seen?: boolean;
  authorId?: string;
  authorAvatar?: string | null;
};

export type StorySequenceItem = {
  id: string;
  mediaType: StoryMediaType;
  mediaUri?: string | null;
  contentType?: string | null;
  durationSeconds: number;
  caption?: string | null;
  textContent?: string | null;
  textBackground?: StoryTextBackground | null;
  textOverlay?: StoryTextOverlay | null;
  createdAt?: string;
  expiresAt?: string;
  viewsCount?: number;
  reactionsCount?: number;
  commentsCount?: number;
  isReacted?: boolean;
  isOwner?: boolean;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string | null;
};

const getCompactStoryName = (fullName?: string) => {
  const nameParts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (nameParts.length === 0) {
    return "";
  }

  if (nameParts.length === 1) {
    return nameParts[0];
  }

  return `${nameParts[0]} ${nameParts[1].charAt(0).toUpperCase()}.`;
};

const StoryThumbnail = React.memo(function StoryThumbnail({
  storyId,
  mediaUri,
  fallbackUri,
  fallbackName,
  mediaType = "video",
  textBackground,
}: {
  storyId: string;
  mediaUri?: string | null;
  fallbackUri?: string | null;
  fallbackName?: string | null;
  mediaType?: StoryMediaType;
  textBackground?: StoryTextBackground | null;
}) {
  const [localThumbnail, setLocalThumbnail] =
    React.useState<StoryThumbnailSource>(() =>
      getCachedStoryThumbnail(storyId),
    );

  React.useEffect(() => {
    if (localThumbnail) return;

    if (mediaType === "video" && mediaUri) {
      let isMounted = true;
      generateStoryThumbnail(mediaUri).then((thumb) => {
        if (!isMounted) return;
        if (thumb) {
          setCachedStoryThumbnail(storyId, thumb);
          setLocalThumbnail(thumb);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [storyId, mediaUri, mediaType, localThumbnail]);

  const thumbnailSource =
    localThumbnail ?? (fallbackUri ? { uri: fallbackUri } : null);

  if (mediaType === "text") {
    return (
      <View
        style={[
          styles.storyImage,
          styles.textThumbnail,
          { backgroundColor: textBackground?.colors[0] ?? "#37214F" },
        ]}
      >
        <Text style={styles.textThumbnailText} numberOfLines={3}>
          {fallbackName || "Story"}
        </Text>
      </View>
    );
  }

  if (mediaType === "image" && mediaUri) {
    return (
      <Image
        source={{ uri: mediaUri }}
        style={styles.storyImage}
        contentFit="cover"
      />
    );
  }

  if (thumbnailSource) {
    return (
      <Image
        source={thumbnailSource}
        style={styles.storyImage}
        contentFit="cover"
      />
    );
  }

  return (
    <UserAvatar
      uri={null}
      name={fallbackName}
      size={70}
      style={styles.storyImage}
    />
  );
});

function StoryCarousel({
  stories,
  friendStories = [],
  activeTab,
  onActiveTabChange,
}: {
  stories: StoryData[];
  friendStories?: StoryData[];
  activeTab: StoryViewerTab;
  onActiveTabChange: (tab: StoryViewerTab) => void;
}) {
  const router = useRouter();
  const [isOpeningAddStory, setIsOpeningAddStory] = React.useState(false);
  const isOpeningAddStoryRef = React.useRef(false);
  const openAddStoryTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const displayedStories = activeTab === "discover" ? stories : friendStories;
  const resetOpeningAddStory = React.useCallback(() => {
    isOpeningAddStoryRef.current = false;

    if (openAddStoryTimeoutRef.current) {
      clearTimeout(openAddStoryTimeoutRef.current);
      openAddStoryTimeoutRef.current = null;
    }

    setIsOpeningAddStory(false);
  }, []);
  const handleAddStoryPress = React.useCallback(() => {
    if (isOpeningAddStoryRef.current) {
      return;
    }

    isOpeningAddStoryRef.current = true;
    setIsOpeningAddStory(true);

    openAddStoryTimeoutRef.current = setTimeout(resetOpeningAddStory, 2500);

    try {
      router.push("/post-screen/add-story");
    } catch {
      resetOpeningAddStory();
    }
  }, [resetOpeningAddStory, router]);

  useFocusEffect(
    React.useCallback(() => {
      resetOpeningAddStory();

      return () => {
        if (openAddStoryTimeoutRef.current) {
          clearTimeout(openAddStoryTimeoutRef.current);
          openAddStoryTimeoutRef.current = null;
        }
      };
    }, [resetOpeningAddStory]),
  );

  const getGroups = React.useCallback(
    (items: StoryData[]) =>
      items
        .filter((story) => story.type !== "add" && story.storyItems?.length)
        .map((group) => ({
          title: group.title ?? group.authorName ?? "Story",
          authorId: group.authorId,
          authorAvatar: group.authorAvatar ?? group.imageUri,
          stories: group.storyItems ?? [],
        })),
    [],
  );
  const groups = displayedStories.filter(
    (story) => story.type !== "add" && story.storyItems?.length,
  );

  return (
    <View style={styles.storiesContainer}>
      <View style={styles.tabs}>
        {(["discover", "friends"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => onActiveTabChange(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab === "discover" ? "Discover" : "Friends"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesScroll}
      >
        {displayedStories.map((story) => {
          if (story.type === "add") {
            return (
              <TouchableOpacity
                key={story.id}
                style={[
                  styles.addStoryBtn,
                  isOpeningAddStory && styles.addStoryBtnDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleAddStoryPress}
                disabled={isOpeningAddStory}
                accessibilityState={{
                  disabled: isOpeningAddStory,
                  busy: isOpeningAddStory,
                }}
              >
                {isOpeningAddStory ? (
                  <ActivityIndicator size="small" color="#bcbccaff" />
                ) : (
                  <Feather name="plus" size={24} color="#bcbccaff" />
                )}
              </TouchableOpacity>
            );
          }

          const ringStyle = story.seen
            ? styles.storyRingSeen
            : story.type === "live"
              ? styles.storyRingLive
              : story.type === "standard"
                ? styles.storyRingStandard
                : styles.storyRingMuted;
          const compactStoryName = getCompactStoryName(
            story.title ?? story.authorName,
          );

          return (
            <TouchableOpacity
              key={story.id}
              style={styles.storyItem}
              activeOpacity={0.8}
              onPress={() => {
                if (
                  story.storyItems?.length ||
                  story.mediaUri ||
                  story.mediaType === "text"
                ) {
                  const storyItems =
                    story.storyItems ??
                    (story.mediaUri || story.mediaType === "text"
                      ? [
                          {
                            id: story.id,
                            mediaType: story.mediaType ?? "video",
                            mediaUri: story.mediaUri,
                            contentType: null,
                            durationSeconds: 15,
                            textContent: story.textContent,
                            textBackground: story.textBackground,
                            textOverlay: story.textOverlay,
                          },
                        ]
                      : []);
                  const sessionId = createStoryViewerSession({
                    activeTab,
                    discoverGroups: getGroups(stories),
                    friendGroups: getGroups(friendStories),
                  });

                  router.push({
                    pathname: "/post-screen/view-story",
                    params: {
                      stories: JSON.stringify(storyItems),
                      title: story.title ?? story.authorName ?? "Story",
                      openedAt: String(Date.now()),
                      storySessionId: sessionId,
                      groupIndex: String(
                        Math.max(
                          0,
                          groups.findIndex((group) => group.id === story.id),
                        ),
                      ),
                    },
                  });
                  return;
                }

                router.push("/live-screen/live-video");
              }}
            >
              <View style={[styles.storyRing, ringStyle]}>
                <StoryThumbnail
                  storyId={story.id}
                  mediaUri={story.mediaUri}
                  mediaType={story.mediaType}
                  fallbackUri={story.imageUri}
                  fallbackName={story.title ?? story.authorName}
                  textBackground={story.textBackground}
                />

                {story.type === "live" && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                  </View>
                )}

                {story.type === "standard" && compactStoryName && (
                  <View style={styles.storyOverlayTextContainer}>
                    <Text style={styles.storyOverlayText} numberOfLines={2}>
                      {compactStoryName}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default React.memo(StoryCarousel);

const styles = StyleSheet.create({
  storiesContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  storiesScroll: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  addStoryBtn: {
    width: 68,
    height: 86,
    borderRadius: 34,
    backgroundColor: "#2B2B36",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  addStoryBtnDisabled: {
    opacity: 0.72,
  },
  storyItem: {
    marginRight: 16,
  },
  storyRing: {
    width: 74,
    height: 92,
    borderRadius: 37,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  storyRingLive: {
    backgroundColor: "#F2245C",
  },
  storyRingStandard: {
    backgroundColor: "#42B0D5",
  },
  storyRingMuted: {
    backgroundColor: "transparent",
  },
  storyRingSeen: {
    backgroundColor: "#4A4A55",
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 35,
    borderWidth: 2,
    borderColor: "#0e0d12",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#23232D",
  },
  activeTab: { backgroundColor: "#42B0D5" },
  tabText: { color: "#9B9BA8", fontSize: 12, fontWeight: "700" },
  activeTabText: { color: "#FFFFFF" },
  textThumbnail: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  textThumbnailText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
  },
  liveBadge: {
    position: "absolute",
    top: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#16D869",
    marginRight: 4,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  storyOverlayTextContainer: {
    position: "absolute",
    top: 10,
    width: "100%",
    alignItems: "center",
  },
  storyOverlayText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

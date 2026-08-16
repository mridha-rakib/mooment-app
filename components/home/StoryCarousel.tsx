import type {
  StoryImageTransform,
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
import { getStorageFileUrl } from "@/lib/storage";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/stores/authStore";
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
  /** Marks the first-position current-user tile (see Part 1 of the Story UX plan). */
  isSelfTile?: boolean;
  /** Whether the self tile currently represents an active own Story vs. a plain create tile. */
  hasOwnStory?: boolean;
  imageUri?: string | null;
  mediaUri?: string | null;
  contentType?: string | null;
  mediaType?: StoryMediaType;
  textContent?: string | null;
  textBackground?: StoryTextBackground | null;
  textOverlay?: StoryTextOverlay | null;
  imageTransform?: StoryImageTransform | null;
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
  imageTransform?: StoryImageTransform | null;
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
}: {
  stories: StoryData[];
  friendStories?: StoryData[];
  // The Discover/Friends/Windows selector pills live in the sibling
  // `HomeTabsRow` component below (rendered once by the Home screen, above
  // both this carousel and the Windows list) — `activeTab` is only used
  // here to pick which story set to display.
  activeTab: StoryViewerTab | null;
}) {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserAvatarUri = currentUser?.avatarKey
    ? getStorageFileUrl(currentUser.avatarKey)
    : null;
  const currentUserName = currentUser?.name ?? currentUser?.username;
  const [isOpeningAddStory, setIsOpeningAddStory] = React.useState(false);
  const isOpeningAddStoryRef = React.useRef(false);
  const openAddStoryTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const displayedStories = activeTab === "discover" ? stories : activeTab === "friends" ? friendStories : [];
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

  const openStoryViewer = React.useCallback(
    (story: StoryData) => {
      if (
        !(
          story.storyItems?.length ||
          story.mediaUri ||
          story.mediaType === "text"
        )
      ) {
        router.push("/live-screen/live-video");
        return;
      }

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
                imageTransform: story.imageTransform,
              },
            ]
          : []);
      const sessionId = createStoryViewerSession({
        // Unreachable with activeTab === null in practice — a null activeTab
        // renders zero story tiles (see displayedStories), so this handler
        // never fires. The fallback only satisfies the non-nullable session type.
        activeTab: activeTab ?? "discover",
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
    },
    [activeTab, friendStories, getGroups, groups, router, stories],
  );

  return (
    <View style={styles.storiesContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesScroll}
      >
        {displayedStories.map((story) => {
          // Instagram-like self tile: the current user's own active Story
          // (when present) and the "add another Story" affordance share
          // this one first-position tile instead of rendering as two
          // separate tiles. Two sibling press targets (never one nested
          // inside the other) so the "+" badge and the main story/avatar
          // area each own an unambiguous hit area.
          if (story.isSelfTile) {
            const selfRingStyle = story.seen
              ? styles.storyRingSeen
              : styles.storyRingStandard;
            const mainDisabled = !story.hasOwnStory && isOpeningAddStory;

            return (
              <View key={story.id} style={styles.selfTileContainer}>
                <TouchableOpacity
                  style={[
                    styles.selfTileMain,
                    mainDisabled && styles.addStoryBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                  disabled={mainDisabled}
                  onPress={() => {
                    if (story.hasOwnStory) {
                      openStoryViewer(story);
                      return;
                    }
                    handleAddStoryPress();
                  }}
                  accessibilityLabel={
                    story.hasOwnStory
                      ? "View your story"
                      : "Add to your story"
                  }
                >
                  {story.hasOwnStory ? (
                    <View style={[styles.storyRing, selfRingStyle]}>
                      <StoryThumbnail
                        storyId={story.id}
                        mediaUri={story.mediaUri}
                        mediaType={story.mediaType}
                        fallbackUri={story.imageUri ?? currentUserAvatarUri}
                        fallbackName={
                          story.title ?? story.authorName ?? currentUserName
                        }
                        textBackground={story.textBackground}
                      />
                    </View>
                  ) : (
                    <UserAvatar
                      uri={currentUserAvatarUri}
                      name={currentUserName}
                      size={68}
                      style={styles.addStoryAvatar}
                    />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addStoryBadge,
                    isOpeningAddStory && styles.addStoryBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleAddStoryPress}
                  disabled={isOpeningAddStory}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Add to your story"
                  accessibilityState={{
                    disabled: isOpeningAddStory,
                    busy: isOpeningAddStory,
                  }}
                >
                  {isOpeningAddStory ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="plus" size={12} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            );
          }

          // Defensive fallback: any row entry that still uses the legacy
          // plain "add" shape (not expected from home.tsx's own data, kept
          // only in case another caller passes one) renders exactly as
          // before.
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
                accessibilityLabel="Add to your story"
                accessibilityState={{
                  disabled: isOpeningAddStory,
                  busy: isOpeningAddStory,
                }}
              >
                <UserAvatar
                  uri={currentUserAvatarUri}
                  name={currentUserName}
                  size={68}
                  style={styles.addStoryAvatar}
                />
                <View style={styles.addStoryBadge}>
                  {isOpeningAddStory ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="plus" size={12} color="#FFFFFF" />
                  )}
                </View>
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
              onPress={() => openStoryViewer(story)}
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

// The Discover/Friends/Windows selector row — kept as its own component so
// Home can render it once, above whichever content mode is active
// (the story-driven Feed vs. the participated-Windows list), instead of it
// living inside StoryCarousel and disappearing whenever the Feed itself is
// swapped out for the Windows list.
export function HomeTabsRow({
  activeTab,
  onActiveTabChange,
  showWindowsTab = false,
  isWindowsActive = false,
  onWindowsPress,
}: {
  activeTab: StoryViewerTab | null;
  onActiveTabChange: (tab: StoryViewerTab) => void;
  showWindowsTab?: boolean;
  isWindowsActive?: boolean;
  onWindowsPress?: () => void;
}) {
  const { isDark } = useTheme();
  // Dark mode keeps the exact pre-existing pixel values (approved, frozen).
  // Light mode swaps the near-black inactive chip for the app's existing
  // light-mode secondary surface/text tokens instead of a dark chip sitting
  // on a light page. The active pill stays the shared brand purple used
  // elsewhere in Stories in both themes — it already reads fine in light
  // mode, so it's left untouched.
  const inactiveBg = isDark ? "#23232D" : "#F5F5F7";
  const inactiveText = isDark ? "#9B9BA8" : "#8E8E9B";

  return (
    <View style={styles.tabs}>
      {(["discover", "friends"] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            { backgroundColor: inactiveBg },
            activeTab === tab && styles.activeTab,
          ]}
          onPress={() => onActiveTabChange(tab)}
        >
          <Text
            style={[
              styles.tabText,
              { color: inactiveText },
              activeTab === tab && styles.activeTabText,
            ]}
          >
            {tab === "discover" ? "Discover" : "Friends"}
          </Text>
        </TouchableOpacity>
      ))}
      {showWindowsTab ? (
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: inactiveBg },
            isWindowsActive && styles.activeTab,
          ]}
          onPress={onWindowsPress}
        >
          <Text
            style={[
              styles.tabText,
              { color: inactiveText },
              isWindowsActive && styles.activeTabText,
            ]}
          >
            Windows
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  addStoryBtnDisabled: {
    opacity: 0.72,
  },
  addStoryAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 34,
  },
  addStoryBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#AC86D4",
    borderWidth: 2,
    borderColor: "#0e0d12",
    justifyContent: "center",
    alignItems: "center",
  },
  storyItem: {
    marginRight: 16,
  },
  // Sized to the story ring's footprint (not the plain add tile's) so the
  // tile doesn't jump in size when the user's own Story appears/expires —
  // the plain add-avatar (UserAvatar size=68) is simply centered inside it
  // when there's no active own Story.
  selfTileContainer: {
    width: 74,
    height: 92,
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  selfTileMain: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "#AC86D4",
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
    marginTop: 10,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  activeTab: { backgroundColor: "#AC86D4" },
  tabText: { fontSize: 12, fontWeight: "700" },
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

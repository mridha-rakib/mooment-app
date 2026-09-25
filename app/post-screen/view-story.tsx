import CommentsModal from "@/components/post/CommentsModal";
import PostInteractionBar from "@/components/post/PostInteractionBar";
import ShareModal from "@/components/post/ShareModal";
import UserAvatar from "@/components/ui/UserAvatar";
import { usePopAnimation } from "@/hooks/usePopAnimation";
import { tapFeedback } from "@/lib/microFeedback";
import { safeBack } from "@/lib/navigation";
import {
  deleteStory,
  getDiscoverStories,
  getFriendStories,
  recordStoryView,
  shareStoryToFeed,
  toggleStoryReaction,
  type StoryImageTransform,
  type StoryMediaType,
  type StoryTextBackground,
  type StoryTextOverlay,
  type StoryTextStyle,
} from "@/lib/stories";
import { groupStoriesByAuthor } from "@/lib/storyRow";
import { markStoriesSeen } from "@/lib/storySeen";
import { getCachedStoryThumbnail } from "@/lib/storyThumbnails";
import { hasValidStoryImageTransform } from "@/lib/storyTransform";
import {
  clampHorizontalStoryDrag,
  clampStoryGroupDrag,
  clampStoryGroupPagerDrag,
  getHorizontalCommitDuration,
  getHorizontalCommitTranslateX,
  getStoryGroupCommitDuration,
  getStoryGroupCommitTranslateY,
  getStoryGroupSwipeDirection,
  getStoryGroupSwipeTarget,
  shouldCaptureHorizontalStorySwipe,
  shouldCommitHorizontalStorySwipe,
  STORY_GROUP_ACTIVATION_DISTANCE,
  STORY_GROUP_DIRECTION_DOMINANCE,
  type StoryGroupSwipeDirection,
  type StoryHorizontalSwipeDirection,
} from "@/lib/storyViewerGestures";
import {
  getStoryViewerSession,
  type StoryViewerTab,
  type ViewerGroup,
} from "@/lib/storyViewerSession";
import { useAuthStore } from "@/stores/authStore";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type AppStateStatus,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StorySequenceItem = {
  id: string;
  mediaType?: StoryMediaType;
  mediaUri?: string | null;
  contentType?: string | null;
  durationSeconds: number;
  caption?: string | null;
  textContent?: string | null;
  textBackground?: StoryTextBackground | null;
  textOverlay?: StoryTextOverlay | null;
  textStyle?: StoryTextStyle | null;
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

type StoryGroup = {
  title: string;
  authorId?: string;
  authorAvatar?: string | null;
  stories: StorySequenceItem[];
};

type AdjacentStoryLayer = {
  direction: StoryGroupSwipeDirection;
  story: StorySequenceItem;
};

type HorizontalAdjacentStoryLayer = {
  direction: StoryHorizontalSwipeDirection;
  story: StorySequenceItem;
};

const LONG_PRESS_DELAY_MS = 160;
const MIN_AUTO_ADVANCE_VISIBLE_MS = 400;

const normalizeId = (id?: string | null) => (id ? id.trim() : "");

const formatExpiry = (expiresAt?: string) => {
  const seconds = Math.max(
    0,
    Math.ceil(
      ((expiresAt ? new Date(expiresAt).getTime() : Date.now()) - Date.now()) /
        1000,
    ),
  );
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)}h left`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m left`;
  return `${seconds}s left`;
};

const parseStoryItems = (
  stories?: string,
  mediaUri?: string,
): StorySequenceItem[] => {
  if (stories) {
    try {
      const parsedStories = JSON.parse(stories) as StorySequenceItem[];

      return parsedStories.filter(
        (story) => story.mediaType === "text" || Boolean(story.mediaUri),
      );
    } catch {
      return [];
    }
  }

  return mediaUri
    ? [
        {
          id: "story",
          mediaType: "video",
          mediaUri,
          contentType: null,
          durationSeconds: 15,
        },
      ]
    : [];
};

const normalizeGroups = (groups?: ViewerGroup[]): StoryGroup[] =>
  groups
    ?.filter(
      (group) => Array.isArray(group.stories) && group.stories.length > 0,
    )
    .map((group) => ({
      title: group.title,
      authorId: group.authorId,
      authorAvatar: group.authorAvatar,
      stories: group.stories as StorySequenceItem[],
    })) ?? [];

// Reshapes the shared lib/storyRow.ts groupStoriesByAuthor()'s StoryData[]
// (the same canonical Story->StorySequenceItem mapping the home feed/
// StoryCarousel session data is built from) into this screen's lighter
// StoryGroup container shape. This is a field-selection adapter only — it
// must never re-derive any per-Story field itself, or the two mappers can
// drift out of sync again the way they previously did for imageTransform.
const toStoryGroups = (
  dataGroups: ReturnType<typeof groupStoriesByAuthor>,
): StoryGroup[] =>
  dataGroups
    .filter((group) => Boolean(group.storyItems?.length))
    .map((group) => ({
      title: group.title ?? group.authorName ?? "Story",
      authorId: group.authorId,
      authorAvatar: group.authorAvatar,
      stories: group.storyItems ?? [],
    }));

const removeStoryFromGroupList = (groups: StoryGroup[], storyId: string) =>
  groups
    .map((group) => ({
      ...group,
      stories: group.stories.filter((story) => story.id !== storyId),
    }))
    .filter((group) => group.stories.length > 0);

const getStoryVideoSource = (mediaUri?: string | null): VideoSource =>
  mediaUri ? { uri: mediaUri, useCaching: true } : null;

const getVideoSourceUri = (source: VideoSource) => {
  if (typeof source === "string") {
    return source;
  }

  return typeof source === "object" && source && "uri" in source
    ? source.uri
    : null;
};

function StoryBackground({
  background,
  children,
}: {
  background?: StoryTextBackground | null;
  children?: React.ReactNode;
}) {
  const colors = background?.colors?.length
    ? background.colors
    : ["#37214F", "#111827"];

  if (
    (background?.type === "gradient" || colors.length > 1) &&
    colors.length >= 2
  ) {
    return (
      <LinearGradient
        colors={[colors[0], colors[1]]}
        style={styles.textStoryBackground}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.textStoryBackground, { backgroundColor: colors[0] }]}>
      {children}
    </View>
  );
}

export default function ViewStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Window dimensions are still used for the vertical swipe-between-groups
  // navigation animation below (an unrelated, purely navigational concern)
  // — but NOT for reconstructing Story content transforms. The editor
  // measures its own rendered canvas via onLayout rather than trusting the
  // OS window size, since the two screens have different navigation
  // presentation/status-bar configuration and window size is not
  // guaranteed to equal the actual rendered Story surface. `canvasSize`
  // below is the viewer's equivalent measurement, attached to the same
  // View (`storySurface`) that both the transformed image and the text
  // overlay are rendered against — the common containing block for both.
  const { height: viewportHeight } = useWindowDimensions();
  // Bootstrapped from the device's own window size (not a hardcoded
  // screenshot value) so the very first frame already has a sane
  // fallback before onLayout fires; corrected to the real measured
  // storySurface size the instant it mounts, mirroring add-story.tsx's
  // identical canvasSize pattern.
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>(() => {
    const { width, height } = Dimensions.get("window");
    return { width, height };
  });
  const canvasWidth = canvasSize.width;
  const canvasHeight = canvasSize.height;
  const currentUserId = useAuthStore((state) => state.user?.id);
  const {
    mediaUri,
    stories,
    title,
    storySessionId,
    groupIndex: groupIndexParam,
    openedAt: openedAtParam,
  } = useLocalSearchParams<{
    mediaUri?: string;
    stories?: string;
    title?: string;
    openedAt?: string;
    storySessionId?: string;
    groupIndex?: string;
  }>();
  const openedAtRef = useRef(Number(openedAtParam) || Date.now());
  const openedAt = openedAtRef.current;
  const viewerMountedAtRef = useRef(Date.now());
  const initialStoryItems = useMemo(() => {
    const parseStartedAt = Date.now();
    const parsed = parseStoryItems(stories, mediaUri);

    if (__DEV__) {
      console.log("[StoryPlaybackTiming] metadata-parsed", {
        parseMs: Date.now() - parseStartedAt,
        storyCount: parsed.length,
        mediaTypes: parsed.map((story) => story.mediaType ?? "video"),
        sinceOpenMs: Date.now() - openedAt,
      });
    }

    return parsed;
  }, [mediaUri, openedAt, stories]);
  const fallbackGroups = useMemo<StoryGroup[]>(
    () => [{ title: title || "Story", stories: initialStoryItems }],
    [initialStoryItems, title],
  );
  const sessionData = useMemo(() => {
    const session = getStoryViewerSession(storySessionId);

    if (Array.isArray(session)) {
      const legacyGroups = normalizeGroups(session);
      return {
        initialTab: "discover" as StoryViewerTab,
        discoverGroups: legacyGroups.length ? legacyGroups : fallbackGroups,
        friendGroups: [] as StoryGroup[],
      };
    }

    const discoverGroups = normalizeGroups(
      session?.discoverGroups ?? session?.groups,
    );
    const friendGroups = normalizeGroups(session?.friendGroups);

    return {
      initialTab: session?.activeTab ?? ("discover" as StoryViewerTab),
      discoverGroups: discoverGroups.length ? discoverGroups : fallbackGroups,
      friendGroups,
    };
  }, [fallbackGroups, storySessionId]);
  const [activeStoryTab, setActiveStoryTab] = useState<StoryViewerTab>(
    sessionData.initialTab,
  );
  const [storyGroupsByTab, setStoryGroupsByTab] = useState<
    Record<StoryViewerTab, StoryGroup[]>
  >({
    discover: sessionData.discoverGroups,
    friends: sessionData.friendGroups,
  });
  const [resolvedStoryTabs, setResolvedStoryTabs] = useState<
    Record<StoryViewerTab, boolean>
  >({
    discover: false,
    friends: false,
  });
  const groups = useMemo(
    () =>
      storyGroupsByTab[activeStoryTab].length
        ? storyGroupsByTab[activeStoryTab]
        : activeStoryTab === "discover" && !resolvedStoryTabs.discover
          ? fallbackGroups
          : [],
    [
      activeStoryTab,
      fallbackGroups,
      resolvedStoryTabs.discover,
      storyGroupsByTab,
    ],
  );
  const [activeGroupIndex, setActiveGroupIndex] = useState(() =>
    Math.min(Math.max(Number(groupIndexParam) || 0, 0), groups.length - 1),
  );
  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const storyItems = useMemo(
    () =>
      activeGroup?.stories ??
      (activeStoryTab === "discover" ? initialStoryItems : []),
    [activeGroup?.stories, activeStoryTab, initialStoryItems],
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressTime, setProgressTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [isLoadingCurrentStory, setIsLoadingCurrentStory] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] = useState(false);
  const [activePlayerSlot, setActivePlayerSlot] = useState<0 | 1>(0);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [adjacentStoryLayer, setAdjacentStoryLayer] =
    useState<AdjacentStoryLayer | null>(null);
  const [horizontalAdjacentLayer, setHorizontalAdjacentLayer] =
    useState<HorizontalAdjacentStoryLayer | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verticalDragY = useRef(new Animated.Value(0)).current;
  // Dedicated to horizontal Story paging — never shared with verticalDragY.
  const horizontalDragX = useRef(new Animated.Value(0)).current;

  const triggerFeedback = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setShowFeedback(true);
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedback(false);
      feedbackTimeoutRef.current = null;
    }, 650);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);
  const [shareVisible, setShareVisible] = useState(false);
  const [interaction, setInteraction] = useState({
    viewsCount: 0,
    reactionsCount: 0,
    commentsCount: 0,
    isReacted: false,
  });
  const [isReactionSubmitting, setIsReactionSubmitting] = useState(false);
  const { style: reactionPopStyle, pop: popReaction } = usePopAnimation({ scale: 1.3 });
  const [isShareSubmitting, setIsShareSubmitting] = useState(false);
  const [isDeletingStory, setIsDeletingStory] = useState(false);
  const advanceLockRef = useRef(false);
  const groupSwipeLockRef = useRef(false);
  const verticalGestureActiveRef = useRef(false);
  const resumeAfterGroupGestureRef = useRef(false);
  const wasHoldingBeforeGroupGestureRef = useRef(false);
  const adjacentStoryLayerRef = useRef<AdjacentStoryLayer | null>(null);
  // Horizontal paging locks/latches — narrowly scoped mirrors of the vertical
  // group-swipe refs above.
  const horizontalSwipeLockRef = useRef(false);
  const horizontalGestureActiveRef = useRef(false);
  // True only while a *cancelled* (non-committing) horizontal swipe is
  // visually springing back to 0. A genuine tap arriving in this window is
  // valid — no Story transition is pending — so handlePressAction interrupts
  // the spring, normalises the surface, and lets the tap through.
  const horizontalCancelSpringActiveRef = useRef(false);
  const resumeAfterHorizontalGestureRef = useRef(false);
  const wasHoldingBeforeHorizontalGestureRef = useRef(false);
  const horizontalAdjacentLayerRef = useRef<HorizontalAdjacentStoryLayer | null>(
    null,
  );
  // Latched once per gesture so a diagonal drag can't flip axis frame-to-frame.
  const activePanAxisRef = useRef<"horizontal" | "vertical" | null>(null);
  const loadRequestIdRef = useRef(0);
  const autoPlayRequestedRef = useRef(false);
  const holdActivatedRef = useRef(false);
  // Press-sequence ownership for long-press suppression. onPressIn on either
  // tap zone bumps tapPressSequenceRef; pauseForHold records the current value
  // in heldPressSequenceRef. Only the *same* physical press that became a
  // long-press may be swallowed by handlePressAction — a brand-new tap has a
  // higher sequence and can never match a stale hold, so it is always
  // accepted regardless of whether the platform emits onPress after
  // onLongPress.
  const tapPressSequenceRef = useRef(0);
  const heldPressSequenceRef = useRef<number | null>(null);
  const resumeAfterHoldRef = useRef(false);
  const resumeAfterAppStateRef = useRef(false);
  const playbackIntentRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const currentSourceUriRef = useRef<string | null>(null);
  const sourceReadyRef = useRef(false);
  const visibleStartedAtRef = useRef(0);
  const progressTimeRef = useRef(0);
  const pendingStoryIndexRef = useRef<number | null>(null);
  const viewedStoryIdsRef = useRef(new Set<string>());
  const resumeAfterOverlayRef = useRef(false);
  const resumeAfterDeleteRef = useRef(false);
  const deletingStoryIdRef = useRef<string | null>(null);
  const preloadedUriRef = useRef<[string | null, string | null]>([null, null]);
  const preloadRequestRef = useRef(0);
  const activeGroupIndexRef = useRef(activeGroupIndex);
  const groupsRef = useRef(groups);
  const currentIndexRef = useRef(currentIndex);
  const storyItemsRef = useRef(storyItems);
  const activeStoryTabRef = useRef(activeStoryTab);
  const playbackTimingRef = useRef({
    storyId: "",
    requestStartedAt: 0,
    sourceLoadedAt: 0,
    playingAt: 0,
    firstFrameAt: 0,
    loadingStartedAt: 0,
    bufferingMs: 0,
  });
  const currentStory = storyItems[currentIndex];
  const nextStory = storyItems[currentIndex + 1];
  const currentMediaType = currentStory?.mediaType ?? "video";
  const isCurrentVideo = currentMediaType === "video";
  const isCurrentImage = currentMediaType === "image";
  const isCurrentText = currentMediaType === "text";
  const currentDuration = Math.max(
    0.1,
    loadedDuration || currentStory?.durationSeconds || 15,
  );
  const isOverlayOpen = commentsVisible || shareVisible || isDeletingStory;
  const isDeletingCurrentStory =
    isDeletingStory && deletingStoryIdRef.current === currentStory?.id;
  const currentStoryAuthorId = normalizeId(
    currentStory?.authorId ?? activeGroup?.authorId,
  );
  const normalizedCurrentUserId = normalizeId(currentUserId);
  const isCurrentStoryByCurrentUser = Boolean(
    currentStory?.isOwner ||
      (normalizedCurrentUserId &&
        currentStoryAuthorId &&
        normalizedCurrentUserId === currentStoryAuthorId),
  );

  const verticalSurfaceTranslateY = verticalDragY;
  const adjacentSurfaceTranslateY = useMemo(() => {
    if (!adjacentStoryLayer) {
      return verticalDragY;
    }

    return Animated.add(
      verticalDragY,
      adjacentStoryLayer.direction === "next" ? viewportHeight : -viewportHeight,
    );
  }, [adjacentStoryLayer, verticalDragY, viewportHeight]);

  // The current Story surface follows the finger horizontally. horizontalDragX
  // rests at 0 whenever no horizontal gesture is active, so adding it to the
  // surface transform never disturbs the vertical pager.
  const horizontalSurfaceTranslateX = horizontalDragX;
  const horizontalAdjacentTranslateX = useMemo(() => {
    if (!horizontalAdjacentLayer) {
      return horizontalDragX;
    }

    return Animated.add(
      horizontalDragX,
      horizontalAdjacentLayer.direction === "next" ? canvasWidth : -canvasWidth,
    );
  }, [horizontalAdjacentLayer, horizontalDragX, canvasWidth]);

  useEffect(() => {
    activeGroupIndexRef.current = activeGroupIndex;
  }, [activeGroupIndex]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    storyItemsRef.current = storyItems;
  }, [storyItems]);

  useEffect(() => {
    activeStoryTabRef.current = activeStoryTab;
  }, [activeStoryTab]);

  const setAdjacentStoryLayerState = useCallback(
    (nextLayer: AdjacentStoryLayer | null) => {
      adjacentStoryLayerRef.current = nextLayer;
      setAdjacentStoryLayer(nextLayer);
    },
    [],
  );

  const setHorizontalAdjacentLayerState = useCallback(
    (nextLayer: HorizontalAdjacentStoryLayer | null) => {
      horizontalAdjacentLayerRef.current = nextLayer;
      setHorizontalAdjacentLayer(nextLayer);
    },
    [],
  );

  useEffect(() => {
    setActiveStoryTab(sessionData.initialTab);
    setStoryGroupsByTab({
      discover: sessionData.discoverGroups,
      friends: sessionData.friendGroups,
    });
    setResolvedStoryTabs({ discover: false, friends: false });
  }, [
    sessionData.discoverGroups,
    sessionData.friendGroups,
    sessionData.initialTab,
  ]);

  useEffect(() => {
    let isActive = true;

    const loadViewerStories = async () => {
      const [discoverResult, friendsResult] = await Promise.allSettled([
        getDiscoverStories(),
        getFriendStories(),
      ]);

      if (!isActive) {
        return;
      }

      const nextDiscover: StoryGroup[] | null =
        discoverResult.status === "fulfilled"
          ? toStoryGroups(groupStoriesByAuthor(discoverResult.value))
          : null;
      const nextFriends: StoryGroup[] | null =
        friendsResult.status === "fulfilled"
          ? toStoryGroups(groupStoriesByAuthor(friendsResult.value))
          : null;

      // Never swap the Story data out from under an in-flight gesture — the
      // preview target would become stale mid-drag. This is a one-shot
      // freshness pass; skipping it while the user is actively swiping is
      // safe (the session snapshot they are navigating stays valid).
      if (
        horizontalGestureActiveRef.current ||
        verticalGestureActiveRef.current ||
        horizontalSwipeLockRef.current ||
        groupSwipeLockRef.current ||
        advanceLockRef.current
      ) {
        return;
      }

      // Preserve the same logical Story across the replacement: remember its
      // id, then re-point activeGroupIndex/currentIndex at it in the fresh
      // groups (indices can move if the feed reordered).
      const anchorStoryId =
        storyItemsRef.current[currentIndexRef.current]?.id ?? null;
      const anchorTabGroups =
        activeStoryTabRef.current === "discover" ? nextDiscover : nextFriends;

      setStoryGroupsByTab((current) => ({
        discover: nextDiscover ?? current.discover,
        friends: nextFriends ?? current.friends,
      }));
      setResolvedStoryTabs((current) => ({
        discover:
          discoverResult.status === "fulfilled" ? true : current.discover,
        friends: friendsResult.status === "fulfilled" ? true : current.friends,
      }));

      if (anchorStoryId && anchorTabGroups) {
        let anchorGroupIndex = -1;
        let anchorStoryIndex = -1;
        for (
          let groupIndex = 0;
          groupIndex < anchorTabGroups.length && anchorGroupIndex === -1;
          groupIndex += 1
        ) {
          const storyIndex = anchorTabGroups[groupIndex].stories.findIndex(
            (story) => story.id === anchorStoryId,
          );
          if (storyIndex !== -1) {
            anchorGroupIndex = groupIndex;
            anchorStoryIndex = storyIndex;
          }
        }

        if (anchorGroupIndex !== -1) {
          if (anchorGroupIndex !== activeGroupIndexRef.current) {
            pendingStoryIndexRef.current = anchorStoryIndex;
            setActiveGroupIndex(anchorGroupIndex);
          } else if (anchorStoryIndex !== currentIndexRef.current) {
            setCurrentIndex(anchorStoryIndex);
          }
        }
      }
    };

    void loadViewerStories();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (activeGroupIndex > groups.length - 1) {
      setActiveGroupIndex(Math.max(groups.length - 1, 0));
    }
  }, [activeGroupIndex, groups.length]);

  useEffect(() => {
    setCurrentIndex(pendingStoryIndexRef.current ?? 0);
    pendingStoryIndexRef.current = null;
  }, [activeGroupIndex]);

  useEffect(() => {
    if (currentIndex > storyItems.length - 1) {
      setCurrentIndex(Math.max(storyItems.length - 1, 0));
    }
  }, [currentIndex, storyItems.length]);

  useEffect(() => {
    if (!currentStory?.expiresAt) {
      return;
    }

    const expiresInMs = new Date(currentStory.expiresAt).getTime() - Date.now();

    if (expiresInMs <= 0) {
      setStoryGroupsByTab((current) => ({
        discover: removeStoryFromGroupList(current.discover, currentStory.id),
        friends: removeStoryFromGroupList(current.friends, currentStory.id),
      }));
      setResolvedStoryTabs({ discover: true, friends: true });
      return;
    }

    const timeout = setTimeout(() => {
      setStoryGroupsByTab((current) => ({
        discover: removeStoryFromGroupList(current.discover, currentStory.id),
        friends: removeStoryFromGroupList(current.friends, currentStory.id),
      }));
      setResolvedStoryTabs({ discover: true, friends: true });
    }, expiresInMs + 250);

    return () => clearTimeout(timeout);
  }, [currentStory?.expiresAt, currentStory?.id]);

  useEffect(() => {
    setInteraction({
      viewsCount: currentStory?.viewsCount ?? 0,
      reactionsCount: currentStory?.reactionsCount ?? 0,
      commentsCount: currentStory?.commentsCount ?? 0,
      isReacted: currentStory?.isReacted ?? false,
    });
  }, [
    currentStory?.commentsCount,
    currentStory?.id,
    currentStory?.isReacted,
    currentStory?.reactionsCount,
    currentStory?.viewsCount,
  ]);

  const playerA = useVideoPlayer(null, (player) => {
    player.loop = false;
    player.timeUpdateEventInterval = 0.1;
    player.bufferOptions = {
      minBufferForPlayback: 0.35,
      preferredForwardBufferDuration: 6,
      prioritizeTimeOverSizeThreshold: true,
    };
  });
  const playerB = useVideoPlayer(null, (player) => {
    player.loop = false;
    player.timeUpdateEventInterval = 0.1;
    player.bufferOptions = {
      minBufferForPlayback: 0.35,
      preferredForwardBufferDuration: 6,
      prioritizeTimeOverSizeThreshold: true,
    };
  });
  const player = activePlayerSlot === 0 ? playerA : playerB;
  const [playerIsPlaying, setPlayerIsPlaying] = useState(player.playing);
  const [playerStatus, setPlayerStatus] = useState(player.status);

  useEffect(() => {
    if (__DEV__) {
      console.log("[StoryPlaybackTiming] player-initialized", {
        initializeMs: Date.now() - viewerMountedAtRef.current,
        sinceOpenMs: Date.now() - openedAt,
      });
    }
  }, [openedAt]);
  const isPlaying = isCurrentVideo ? playerIsPlaying : !isHolding;
  const isLoadingStory =
    isCurrentVideo &&
    !loadFailed &&
    (!hasRenderedFirstFrame ||
      isLoadingCurrentStory ||
      (playerStatus === "loading" && !isPlaying));
  const currentTime = Math.min(progressTime, currentDuration);

  // Render-only index for the progress-segment bar. During the known 2-render
  // group-boundary handshake, `currentIndex` briefly still holds the previous
  // group's (larger) index while `storyItems` is already the new group — which
  // would paint every new segment as "index < currentIndex" → all full for
  // 1–2 frames. Clamp into the current storyItems range, preferring the
  // pending target the handshake is about to apply. DISPLAY ONLY — navigation,
  // currentStory selection, seen/view state all still use `currentIndex`.
  const progressDisplayIndex = Math.min(
    Math.max(pendingStoryIndexRef.current ?? currentIndex, 0),
    Math.max(storyItems.length - 1, 0),
  );

  useEffect(() => {
    progressTimeRef.current = progressTime;
  }, [progressTime]);

  const goToNextStory = useCallback(() => {
    if (advanceLockRef.current) {
      return;
    }

    if (currentIndex >= storyItems.length - 1) {
      advanceLockRef.current = true;
      if (activeGroupIndex < groups.length - 1) {
        pendingStoryIndexRef.current = 0;
        setProgressTime(0);
        setLoadedDuration(null);
        setActiveGroupIndex((index) => index + 1);
        return;
      }
      safeBack(router, "/(tabs)/home");
      return;
    }

    advanceLockRef.current = true;
    const nextIndex = currentIndex + 1;
    const targetStory = storyItems[nextIndex];
    const inactiveSlot: 0 | 1 = activePlayerSlot === 0 ? 1 : 0;

    if (
      (targetStory?.mediaType ?? "video") === "video" &&
      targetStory.mediaUri &&
      preloadedUriRef.current[inactiveSlot] === targetStory.mediaUri
    ) {
      setActivePlayerSlot(inactiveSlot);
    }
    setProgressTime(0);
    setLoadedDuration(null);
    setCurrentIndex(nextIndex);
  }, [
    activeGroupIndex,
    activePlayerSlot,
    currentIndex,
    groups.length,
    router,
    storyItems,
  ]);

  const goToPreviousStory = useCallback(() => {
    if (advanceLockRef.current) {
      return;
    }

    if (currentIndex > 0) {
      advanceLockRef.current = true;
      const previousIndex = currentIndex - 1;
      const targetStory = storyItems[previousIndex];
      const inactiveSlot: 0 | 1 = activePlayerSlot === 0 ? 1 : 0;

      if (
        (targetStory?.mediaType ?? "video") === "video" &&
        targetStory.mediaUri &&
        preloadedUriRef.current[inactiveSlot] === targetStory.mediaUri
      ) {
        setActivePlayerSlot(inactiveSlot);
      }
      setProgressTime(0);
      setLoadedDuration(null);
      setCurrentIndex(previousIndex);
      return;
    }

    if (activeGroupIndex > 0) {
      advanceLockRef.current = true;
      const previousGroup = groups[activeGroupIndex - 1];
      pendingStoryIndexRef.current = Math.max(
        (previousGroup?.stories.length ?? 1) - 1,
        0,
      );
      setProgressTime(0);
      setLoadedDuration(null);
      setActiveGroupIndex((index) => Math.max(0, index - 1));
      return;
    }

    // First Story of the first group: restart THIS Story from 0. currentStory.id
    // does not change, so the per-story load effect will NOT reinitialise the
    // progress clock — reset the full image/text timing origin here so the next
    // 100ms tick starts near 0 instead of jumping back to the prior elapsed
    // value. No Story-id change ⇒ no duplicate seen/view side effect.
    progressTimeRef.current = 0;
    visibleStartedAtRef.current = Date.now();
    setProgressTime(0);
    try {
      player.currentTime = 0;
      player.play();
    } catch {
      player.pause();
    }
  }, [
    activeGroupIndex,
    activePlayerSlot,
    currentIndex,
    groups,
    player,
    storyItems,
  ]);

  useEffect(() => {
    if (
      currentStory?.id &&
      playbackTimingRef.current.storyId === currentStory.id
    ) {
      return;
    }

    const loadRequestId = loadRequestIdRef.current + 1;

    loadRequestIdRef.current = loadRequestId;
    advanceLockRef.current = false;
    holdActivatedRef.current = false;
    heldPressSequenceRef.current = null;
    resumeAfterHoldRef.current = false;
    playbackIntentRef.current = true;
    setIsHolding(false);
    setProgressTime(0);
    setLoadedDuration(null);
    setLoadFailed(false);
    setSourceReady(false);
    setPlayerIsPlaying(false);
    setPlayerStatus(player.status);
    setHasRenderedFirstFrame(false);
    sourceReadyRef.current = false;
    currentSourceUriRef.current = currentStory?.mediaUri ?? null;
    visibleStartedAtRef.current = Date.now();
    playbackTimingRef.current = {
      storyId: currentStory?.id ?? "",
      requestStartedAt: 0,
      sourceLoadedAt: 0,
      playingAt: 0,
      firstFrameAt: 0,
      loadingStartedAt: 0,
      bufferingMs: 0,
    };

    if (!currentStory || !isCurrentVideo) {
      setIsLoadingCurrentStory(false);
      try {
        player.pause();
        player.replace(null, true);
        preloadedUriRef.current[activePlayerSlot] = null;
      } catch {
        // The hook owns player release; navigation cleanup needs no manual release.
      }
      currentSourceUriRef.current = currentStory?.mediaUri ?? null;
      sourceReadyRef.current = Boolean(currentStory);
      setSourceReady(Boolean(currentStory));
      return;
    }

    if (!currentStory.mediaUri) {
      setIsLoadingCurrentStory(false);
      setLoadFailed(true);
      player.replace(null, true);
      currentSourceUriRef.current = null;
      return;
    }

    setIsLoadingCurrentStory(true);
    autoPlayRequestedRef.current = true;
    playbackTimingRef.current.requestStartedAt = Date.now();
    playbackTimingRef.current.loadingStartedAt = Date.now();

    if (__DEV__) {
      console.log("[StoryPlaybackTiming] video-request-start", {
        storyId: currentStory.id,
        sinceOpenMs: Date.now() - openedAt,
      });
    }

    if (
      preloadedUriRef.current[activePlayerSlot] === currentStory.mediaUri &&
      player.status !== "error"
    ) {
      player.muted = false;
      sourceReadyRef.current = true;
      setSourceReady(true);
      if (Number.isFinite(player.duration) && player.duration > 0) {
        setLoadedDuration(player.duration);
      }
      autoPlayRequestedRef.current = false;
      try {
        player.currentTime = 0;
        player.play();
      } catch {
        setLoadFailed(true);
      }
      setIsLoadingCurrentStory(false);
      return;
    }

    void player
      .replaceAsync(getStoryVideoSource(currentStory.mediaUri))
      .then(() => {
        if (loadRequestIdRef.current !== loadRequestId) {
          return;
        }

        player.currentTime = 0;
        player.muted = false;
        preloadedUriRef.current[activePlayerSlot] =
          currentStory.mediaUri ?? null;
        setProgressTime(0);
        visibleStartedAtRef.current = Date.now();
        sourceReadyRef.current = true;
        setSourceReady(true);
        autoPlayRequestedRef.current = false;
        player.play();
      })
      .catch(() => {
        if (loadRequestIdRef.current === loadRequestId) {
          setLoadFailed(true);
          autoPlayRequestedRef.current = false;
        }
      })
      .finally(() => {
        if (loadRequestIdRef.current === loadRequestId) {
          setIsLoadingCurrentStory(false);
        }
      });
  }, [
    activePlayerSlot,
    currentStory,
    currentStory?.id,
    currentStory?.mediaUri,
    isCurrentVideo,
    openedAt,
    player,
  ]);

  useEffect(() => {
    if (!nextStory?.mediaUri) return;

    if (nextStory.mediaType === "image") {
      void Image.prefetch(nextStory.mediaUri, { cachePolicy: "memory-disk" });
      return;
    }

    if ((nextStory.mediaType ?? "video") !== "video") return;

    const preloadSlot: 0 | 1 = activePlayerSlot === 0 ? 1 : 0;
    const preloadPlayer = preloadSlot === 0 ? playerA : playerB;

    if (preloadedUriRef.current[preloadSlot] === nextStory.mediaUri) return;

    const requestId = ++preloadRequestRef.current;
    const preloadStartedAt = Date.now();
    preloadPlayer.muted = true;
    try {
      preloadPlayer.pause();
    } catch {
      return;
    }

    void preloadPlayer
      .replaceAsync(getStoryVideoSource(nextStory.mediaUri))
      .then(() => {
        if (preloadRequestRef.current !== requestId) return;
        preloadedUriRef.current[preloadSlot] = nextStory.mediaUri ?? null;
        if (__DEV__) {
          console.log("[StoryPlaybackTiming] next-video-preloaded", {
            storyId: nextStory.id,
            preloadMs: Date.now() - preloadStartedAt,
          });
        }
      })
      .catch(() => {
        if (preloadRequestRef.current === requestId) {
          preloadedUriRef.current[preloadSlot] = null;
        }
      });
  }, [
    activePlayerSlot,
    nextStory,
    nextStory?.id,
    nextStory?.mediaUri,
    playerA,
    playerB,
  ]);

  useEffect(() => {
    if (
      !currentStory ||
      isCurrentVideo ||
      isHolding ||
      loadFailed ||
      !sourceReady
    ) {
      return;
    }

    visibleStartedAtRef.current = visibleStartedAtRef.current || Date.now();
    const interval = setInterval(() => {
      if (appStateRef.current !== "active") {
        return;
      }

      const elapsedSeconds = (Date.now() - visibleStartedAtRef.current) / 1000;
      const nextProgress = Math.min(elapsedSeconds, currentDuration);

      setProgressTime(nextProgress);

      if (nextProgress >= currentDuration) {
        clearInterval(interval);
        goToNextStory();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [
    currentDuration,
    currentStory,
    goToNextStory,
    isCurrentVideo,
    isHolding,
    loadFailed,
    sourceReady,
  ]);

  useEffect(() => {
    if (currentStory?.id) {
      void markStoriesSeen([currentStory.id]);
      if (!viewedStoryIdsRef.current.has(currentStory.id)) {
        viewedStoryIdsRef.current.add(currentStory.id);
        void recordStoryView(currentStory.id)
          .then(setInteraction)
          .catch(() => {
            viewedStoryIdsRef.current.delete(currentStory.id);
          });
      }
    }
  }, [currentStory?.id]);

  useEventListener(player, "sourceLoad", ({ duration, videoSource }) => {
    if (getVideoSourceUri(videoSource) !== currentSourceUriRef.current) {
      return;
    }

    if (Number.isFinite(duration) && duration > 0) {
      setLoadedDuration(duration);
    }

    visibleStartedAtRef.current = Date.now();
    sourceReadyRef.current = true;
    setSourceReady(true);

    const timing = playbackTimingRef.current;
    if (!timing.sourceLoadedAt) {
      timing.sourceLoadedAt = Date.now();
      if (__DEV__) {
        console.log("[StoryPlaybackTiming] video-source-loaded", {
          storyId: timing.storyId,
          requestToSourceLoadMs: timing.requestStartedAt
            ? timing.sourceLoadedAt - timing.requestStartedAt
            : null,
          duration,
          sinceOpenMs: timing.sourceLoadedAt - openedAt,
        });
      }
    }
  });

  useEventListener(player, "timeUpdate", ({ currentTime: nextCurrentTime }) => {
    if (!currentStory || !sourceReadyRef.current || !isCurrentVideo) {
      return;
    }

    const nextProgress = Math.min(
      Math.max(nextCurrentTime, 0),
      currentDuration,
    );
    setProgressTime((current) =>
      Math.abs(current - nextProgress) >= 0.03 ? nextProgress : current,
    );
  });

  useEventListener(player, "statusChange", ({ status, oldStatus }) => {
    setPlayerStatus((current) => (current === status ? current : status));
    if (status === "error") {
      setLoadFailed(true);
    }
    const timing = playbackTimingRef.current;
    const now = Date.now();

    if (status === "loading" && oldStatus !== "loading") {
      timing.loadingStartedAt = now;
    } else if (
      oldStatus === "loading" &&
      status !== "loading" &&
      timing.loadingStartedAt
    ) {
      timing.bufferingMs += now - timing.loadingStartedAt;
      timing.loadingStartedAt = 0;
    }

    if (__DEV__) {
      console.log("[StoryPlaybackTiming] video-status", {
        storyId: timing.storyId,
        oldStatus,
        status,
        sinceRequestMs: timing.requestStartedAt
          ? now - timing.requestStartedAt
          : null,
      });
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setPlayerIsPlaying((current) =>
      current === isPlaying ? current : isPlaying,
    );
    if (isPlaying) {
      setHasRenderedFirstFrame(true);
      setIsLoadingCurrentStory(false);
    }
    const timing = playbackTimingRef.current;
    if (isPlaying && !timing.playingAt) {
      timing.playingAt = Date.now();
      if (__DEV__) {
        console.log("[StoryPlaybackTiming] video-playing", {
          storyId: timing.storyId,
          requestToPlayingMs: timing.requestStartedAt
            ? timing.playingAt - timing.requestStartedAt
            : null,
          sinceOpenMs: timing.playingAt - openedAt,
        });
      }
    }
  });

  useEffect(() => {
    if (
      !currentStory?.mediaUri ||
      !isCurrentVideo ||
      loadFailed ||
      isLoadingStory ||
      !sourceReady ||
      playerStatus !== "readyToPlay" ||
      !autoPlayRequestedRef.current
    ) {
      return;
    }

    autoPlayRequestedRef.current = false;

    try {
      player.currentTime = 0;
      visibleStartedAtRef.current = Date.now();
      player.play();
    } catch {
      player.pause();
    }
  }, [
    currentStory?.mediaUri,
    isCurrentVideo,
    isLoadingStory,
    loadFailed,
    player,
    playerStatus,
    sourceReady,
  ]);

  useEventListener(player, "playToEnd", () => {
    if (
      !sourceReadyRef.current ||
      Date.now() - visibleStartedAtRef.current < MIN_AUTO_ADVANCE_VISIBLE_MS
    ) {
      return;
    }

    if (player.currentTime < Math.max(0, currentDuration - 0.35)) {
      return;
    }

    goToNextStory();
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (previousState === "active" && nextState !== "active") {
        if (isCurrentVideo) {
          resumeAfterAppStateRef.current =
            playbackIntentRef.current && !isOverlayOpen && !isHolding;
          if (isPlaying) {
            try {
              player.pause();
            } catch {
              resumeAfterAppStateRef.current = false;
            }
          }
          return;
        }

        if (currentStory && sourceReady && !loadFailed) {
          const elapsedSeconds = visibleStartedAtRef.current
            ? (Date.now() - visibleStartedAtRef.current) / 1000
            : progressTimeRef.current;
          const frozenProgress = Math.min(
            currentDuration,
            Math.max(progressTimeRef.current, elapsedSeconds),
          );

          progressTimeRef.current = frozenProgress;
          setProgressTime(frozenProgress);
          setIsHolding(true);
        }
        return;
      }

      if (previousState !== "active" && nextState === "active") {
        if (isCurrentVideo) {
          if (
            resumeAfterAppStateRef.current &&
            currentStory?.mediaUri &&
            !isLoadingStory &&
            !loadFailed
          ) {
            try {
              player.play();
            } catch {
              resumeAfterAppStateRef.current = false;
            }
          }
          resumeAfterAppStateRef.current = false;
          return;
        }

        if (currentStory && sourceReady && !loadFailed) {
          visibleStartedAtRef.current =
            Date.now() - progressTimeRef.current * 1000;
          setIsHolding(false);
        }
      }
    });

    return () => subscription.remove();
  }, [
    currentDuration,
    currentStory,
    currentStory?.mediaUri,
    isCurrentVideo,
    isHolding,
    isLoadingStory,
    isOverlayOpen,
    isPlaying,
    loadFailed,
    player,
    sourceReady,
  ]);

  const freezeImagePlaybackProgress = useCallback(() => {
    if (isCurrentVideo || !currentStory || !sourceReady || loadFailed) {
      return;
    }

    const elapsedSeconds = visibleStartedAtRef.current
      ? (Date.now() - visibleStartedAtRef.current) / 1000
      : progressTimeRef.current;
    const frozenProgress = Math.min(
      currentDuration,
      Math.max(progressTimeRef.current, elapsedSeconds),
    );

    progressTimeRef.current = frozenProgress;
    setProgressTime(frozenProgress);
  }, [currentDuration, currentStory, isCurrentVideo, loadFailed, sourceReady]);

  const resumeImagePlaybackProgress = useCallback(() => {
    if (isCurrentVideo || !currentStory || !sourceReady || loadFailed) {
      return;
    }

    visibleStartedAtRef.current = Date.now() - progressTimeRef.current * 1000;
  }, [currentStory, isCurrentVideo, loadFailed, sourceReady]);

  const pausePlaybackForDelete = useCallback(() => {
    resumeAfterDeleteRef.current = isCurrentVideo ? isPlaying : !isHolding;

    if (!isCurrentVideo) {
      freezeImagePlaybackProgress();
    }

    setIsHolding(true);

    if (isCurrentVideo && isPlaying) {
      try {
        player.pause();
      } catch {
        resumeAfterDeleteRef.current = false;
      }
    }
  }, [
    freezeImagePlaybackProgress,
    isCurrentVideo,
    isHolding,
    isPlaying,
    player,
  ]);

  const resumePlaybackAfterDelete = useCallback(() => {
    const shouldResume = resumeAfterDeleteRef.current;
    resumeAfterDeleteRef.current = false;

    setIsHolding(false);

    if (!shouldResume) {
      return;
    }

    if (!isCurrentVideo) {
      resumeImagePlaybackProgress();
      return;
    }

    if (currentStory?.mediaUri && !isLoadingStory && !loadFailed) {
      try {
        player.play();
      } catch {
        // The next playback state change will recover when the player is ready.
      }
    }
  }, [
    currentStory?.mediaUri,
    isCurrentVideo,
    isLoadingStory,
    loadFailed,
    player,
    resumeImagePlaybackProgress,
  ]);

  const togglePlay = useCallback(() => {
    triggerFeedback();
    if (!isCurrentVideo) {
      setIsHolding((holding) => {
        if (holding) {
          resumeImagePlaybackProgress();
        } else {
          freezeImagePlaybackProgress();
        }

        return !holding;
      });
      return;
    }

    if (isLoadingStory || !currentStory?.mediaUri) {
      return;
    }

    if (isPlaying) {
      playbackIntentRef.current = false;
      player.pause();
    } else {
      playbackIntentRef.current = true;
      player.play();
    }
  }, [
    currentStory?.mediaUri,
    freezeImagePlaybackProgress,
    isCurrentVideo,
    isLoadingStory,
    isPlaying,
    player,
    resumeImagePlaybackProgress,
    triggerFeedback,
  ]);

  const pauseForHold = useCallback(() => {
    if (
      holdActivatedRef.current ||
      isLoadingStory ||
      isDeletingStory ||
      (!currentStory?.mediaUri && isCurrentVideo)
    ) {
      return;
    }

    holdActivatedRef.current = true;
    // Own this physical press: only its (possible) synthetic onPress may be
    // swallowed by handlePressAction; any later press bumps the sequence.
    heldPressSequenceRef.current = tapPressSequenceRef.current;
    resumeAfterHoldRef.current = isPlaying;
    if (!isCurrentVideo) freezeImagePlaybackProgress();
    setIsHolding(true);

    if (isCurrentVideo && isPlaying) {
      player.pause();
    }
  }, [
    currentStory?.mediaUri,
    freezeImagePlaybackProgress,
    isCurrentVideo,
    isDeletingStory,
    isLoadingStory,
    isPlaying,
    player,
  ]);

  const resumeFromHold = useCallback(() => {
    if (!holdActivatedRef.current) {
      return;
    }

    holdActivatedRef.current = false;
    setIsHolding(false);

    if (!isCurrentVideo) {
      resumeImagePlaybackProgress();
    }

    if (
      resumeAfterHoldRef.current &&
      currentStory?.mediaUri &&
      !isLoadingStory &&
      isCurrentVideo
    ) {
      player.play();
    }

    resumeAfterHoldRef.current = false;
  }, [
    currentStory?.mediaUri,
    isCurrentVideo,
    isLoadingStory,
    player,
    resumeImagePlaybackProgress,
  ]);

  const clearVerticalGroupGesture = useCallback(() => {
    verticalDragY.stopAnimation(() => {
      verticalDragY.setValue(0);
    });
    setAdjacentStoryLayerState(null);
    groupSwipeLockRef.current = false;
    verticalGestureActiveRef.current = false;
    resumeAfterGroupGestureRef.current = false;
    wasHoldingBeforeGroupGestureRef.current = false;
  }, [setAdjacentStoryLayerState, verticalDragY]);

  const pausePlaybackForVerticalGroupGesture = useCallback(() => {
    if (verticalGestureActiveRef.current) {
      return;
    }

    verticalGestureActiveRef.current = true;
    wasHoldingBeforeGroupGestureRef.current = isHolding;
    resumeAfterGroupGestureRef.current = isCurrentVideo ? isPlaying : !isHolding;

    if (!isCurrentVideo) {
      freezeImagePlaybackProgress();
    }

    setIsHolding(true);

    if (isCurrentVideo && isPlaying) {
      try {
        player.pause();
      } catch {
        resumeAfterGroupGestureRef.current = false;
      }
    }
  }, [
    freezeImagePlaybackProgress,
    isCurrentVideo,
    isHolding,
    isPlaying,
    player,
  ]);

  const resumePlaybackAfterVerticalGroupGesture = useCallback(() => {
    const shouldResume = resumeAfterGroupGestureRef.current;
    const wasHolding = wasHoldingBeforeGroupGestureRef.current;

    resumeAfterGroupGestureRef.current = false;
    wasHoldingBeforeGroupGestureRef.current = false;

    if (!shouldResume) {
      setIsHolding(wasHolding);
      return;
    }

    setIsHolding(false);

    if (!isCurrentVideo) {
      resumeImagePlaybackProgress();
      return;
    }

    if (currentStory?.mediaUri && !isLoadingStory && !loadFailed) {
      try {
        player.play();
      } catch {
        // The existing player status listeners recover playback when ready.
      }
    }
  }, [
    currentStory?.mediaUri,
    isCurrentVideo,
    isLoadingStory,
    loadFailed,
    player,
    resumeImagePlaybackProgress,
  ]);

  const resetVerticalGroupDrag = useCallback(() => {
    groupSwipeLockRef.current = true;
    Animated.spring(verticalDragY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start(() => {
      verticalDragY.setValue(0);
      setAdjacentStoryLayerState(null);
      groupSwipeLockRef.current = false;
      verticalGestureActiveRef.current = false;
      resumePlaybackAfterVerticalGroupGesture();
    });
  }, [
    resumePlaybackAfterVerticalGroupGesture,
    setAdjacentStoryLayerState,
    verticalDragY,
  ]);

  const getVerticalGroupSwipeTarget = useCallback(
    (direction: StoryGroupSwipeDirection) => {
      const currentGroupIndex = activeGroupIndexRef.current;
      const currentGroups = groupsRef.current;
      const targetGroup =
        direction === "next"
          ? currentGroups[currentGroupIndex + 1]
          : currentGroups[currentGroupIndex - 1];

      return getStoryGroupSwipeTarget({
        direction,
        currentGroupIndex,
        groupCount: currentGroups.length,
        targetGroupStoryCount: targetGroup?.stories.length ?? 0,
      });
    },
    [],
  );

  const getVerticalGroupAdjacentLayer = useCallback(
    (direction: StoryGroupSwipeDirection): AdjacentStoryLayer | null => {
      const target = getVerticalGroupSwipeTarget(direction);

      if (!target) {
        return null;
      }

      const story = groupsRef.current[target.groupIndex]?.stories[target.storyIndex];

      return story ? { direction, story } : null;
    },
    [getVerticalGroupSwipeTarget],
  );

  const prepareVerticalGroupAdjacentLayer = useCallback(
    (direction: StoryGroupSwipeDirection) => {
      const currentLayer = adjacentStoryLayerRef.current;

      if (currentLayer?.direction === direction) {
        return currentLayer;
      }

      const nextLayer = getVerticalGroupAdjacentLayer(direction);
      setAdjacentStoryLayerState(nextLayer);
      return nextLayer;
    },
    [getVerticalGroupAdjacentLayer, setAdjacentStoryLayerState],
  );

  const commitVerticalGroupSwipe = useCallback(
    (direction: StoryGroupSwipeDirection, releaseVelocity = 0) => {
      if (groupSwipeLockRef.current || advanceLockRef.current) {
        return false;
      }

      if (!prepareVerticalGroupAdjacentLayer(direction)) {
        return false;
      }

      groupSwipeLockRef.current = true;
      advanceLockRef.current = true;

      verticalDragY.stopAnimation((currentDragY) => {
        const targetDragY = getStoryGroupCommitTranslateY(
          direction,
          viewportHeight,
        );

        Animated.timing(verticalDragY, {
          toValue: targetDragY,
          duration: getStoryGroupCommitDuration(
            currentDragY,
            targetDragY,
            viewportHeight,
            releaseVelocity,
          ),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          verticalGestureActiveRef.current = false;

          if (!finished) {
            groupSwipeLockRef.current = false;
            advanceLockRef.current = false;
            resumePlaybackAfterVerticalGroupGesture();
            return;
          }

          const target = getVerticalGroupSwipeTarget(direction);

          if (!target) {
            groupSwipeLockRef.current = false;
            advanceLockRef.current = false;
            resumePlaybackAfterVerticalGroupGesture();
            return;
          }

          resumeAfterGroupGestureRef.current = false;
          wasHoldingBeforeGroupGestureRef.current = false;
          pendingStoryIndexRef.current = target.storyIndex;
          setCurrentIndex(target.storyIndex);
          setProgressTime(0);
          setLoadedDuration(null);
          setIsHolding(false);
          setActiveGroupIndex(target.groupIndex);
        });
      });

      return true;
    },
    [
      getVerticalGroupSwipeTarget,
      prepareVerticalGroupAdjacentLayer,
      resumePlaybackAfterVerticalGroupGesture,
      viewportHeight,
      verticalDragY,
    ],
  );

  useEffect(() => {
    clearVerticalGroupGesture();
  }, [activeGroupIndex, activeStoryTab, clearVerticalGroupGesture]);

  useEffect(() => {
    if (isOverlayOpen) {
      clearVerticalGroupGesture();
    }
  }, [clearVerticalGroupGesture, isOverlayOpen]);

  useEffect(() => clearVerticalGroupGesture, [clearVerticalGroupGesture]);

  // -----------------------------------------------------------------------
  // Horizontal Story paging — mirrors the vertical group pager above:
  // finger tracking + one adjacent layer + post-animation index commit +
  // cancel spring. Media-type agnostic (image and text use the exact same
  // path); only the content renderer differs.
  // -----------------------------------------------------------------------

  const pausePlaybackForHorizontalGesture = useCallback(() => {
    if (horizontalGestureActiveRef.current) {
      return;
    }

    horizontalGestureActiveRef.current = true;
    wasHoldingBeforeHorizontalGestureRef.current = isHolding;
    resumeAfterHorizontalGestureRef.current = isCurrentVideo
      ? isPlaying
      : !isHolding;

    if (!isCurrentVideo) {
      freezeImagePlaybackProgress();
    }

    setIsHolding(true);

    if (isCurrentVideo && isPlaying) {
      try {
        player.pause();
      } catch {
        resumeAfterHorizontalGestureRef.current = false;
      }
    }
  }, [freezeImagePlaybackProgress, isCurrentVideo, isHolding, isPlaying, player]);

  const resumePlaybackAfterHorizontalGesture = useCallback(() => {
    const shouldResume = resumeAfterHorizontalGestureRef.current;
    const wasHolding = wasHoldingBeforeHorizontalGestureRef.current;

    resumeAfterHorizontalGestureRef.current = false;
    wasHoldingBeforeHorizontalGestureRef.current = false;
    horizontalGestureActiveRef.current = false;

    if (!shouldResume) {
      setIsHolding(wasHolding);
      return;
    }

    setIsHolding(false);

    if (!isCurrentVideo) {
      resumeImagePlaybackProgress();
      return;
    }

    if (currentStory?.mediaUri && !isLoadingStory && !loadFailed) {
      try {
        player.play();
      } catch {
        // The existing player status listeners recover playback when ready.
      }
    }
  }, [
    currentStory?.mediaUri,
    isCurrentVideo,
    isLoadingStory,
    loadFailed,
    player,
    resumeImagePlaybackProgress,
  ]);

  const clearHorizontalStoryGesture = useCallback(() => {
    if (
      !horizontalAdjacentLayerRef.current &&
      !horizontalSwipeLockRef.current &&
      !horizontalGestureActiveRef.current &&
      !horizontalCancelSpringActiveRef.current
    ) {
      return;
    }

    horizontalCancelSpringActiveRef.current = false;
    horizontalDragX.stopAnimation();
    horizontalDragX.setValue(0);
    setHorizontalAdjacentLayerState(null);
    horizontalSwipeLockRef.current = false;
    horizontalGestureActiveRef.current = false;
    resumeAfterHorizontalGestureRef.current = false;
    wasHoldingBeforeHorizontalGestureRef.current = false;
  }, [horizontalDragX, setHorizontalAdjacentLayerState]);

  const cancelHorizontalStoryGesture = useCallback(() => {
    horizontalSwipeLockRef.current = true;
    horizontalCancelSpringActiveRef.current = true;
    Animated.spring(horizontalDragX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start(() => {
      if (!horizontalCancelSpringActiveRef.current) {
        // A genuine tap already interrupted and normalised this non-committing
        // settle (see handlePressAction) — nothing left to clean up.
        return;
      }
      horizontalCancelSpringActiveRef.current = false;
      horizontalDragX.setValue(0);
      setHorizontalAdjacentLayerState(null);
      horizontalSwipeLockRef.current = false;
      horizontalGestureActiveRef.current = false;
      resumePlaybackAfterHorizontalGesture();
    });
  }, [
    horizontalDragX,
    resumePlaybackAfterHorizontalGesture,
    setHorizontalAdjacentLayerState,
  ]);

  const getHorizontalAdjacentStory = useCallback(
    (
      direction: StoryHorizontalSwipeDirection,
    ): HorizontalAdjacentStoryLayer | null => {
      const items = storyItemsRef.current;
      const idx = currentIndexRef.current;
      const groupIndex = activeGroupIndexRef.current;
      const currentGroups = groupsRef.current;

      if (direction === "next") {
        if (idx < items.length - 1) {
          const story = items[idx + 1];
          return story ? { direction, story } : null;
        }

        const story = currentGroups[groupIndex + 1]?.stories[0];
        return story ? { direction, story } : null;
      }

      if (idx > 0) {
        const story = items[idx - 1];
        return story ? { direction, story } : null;
      }

      const previousGroup = currentGroups[groupIndex - 1];
      const story = previousGroup
        ? previousGroup.stories[previousGroup.stories.length - 1]
        : undefined;
      return story ? { direction, story } : null;
    },
    [],
  );

  const prepareHorizontalAdjacentLayer = useCallback(
    (direction: StoryHorizontalSwipeDirection) => {
      const currentLayer = horizontalAdjacentLayerRef.current;

      if (currentLayer?.direction === direction) {
        return currentLayer;
      }

      const nextLayer = getHorizontalAdjacentStory(direction);
      setHorizontalAdjacentLayerState(nextLayer);
      return nextLayer;
    },
    [getHorizontalAdjacentStory, setHorizontalAdjacentLayerState],
  );

  const commitHorizontalStorySwipe = useCallback(
    (direction: StoryHorizontalSwipeDirection, releaseVelocity = 0) => {
      if (horizontalSwipeLockRef.current || advanceLockRef.current) {
        return false;
      }

      if (!prepareHorizontalAdjacentLayer(direction)) {
        return false;
      }

      horizontalSwipeLockRef.current = true;
      advanceLockRef.current = true;

      horizontalDragX.stopAnimation((currentDragX) => {
        const targetX = getHorizontalCommitTranslateX(direction, canvasWidth);

        Animated.timing(horizontalDragX, {
          toValue: targetX,
          duration: getHorizontalCommitDuration(
            currentDragX,
            targetX,
            canvasWidth,
            releaseVelocity,
          ),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          horizontalGestureActiveRef.current = false;

          if (!finished) {
            horizontalSwipeLockRef.current = false;
            advanceLockRef.current = false;
            resumePlaybackAfterHorizontalGesture();
            return;
          }

          // The surface has fully settled at ±canvasWidth and the adjacent
          // layer now covers the screen. Commit exactly one logical
          // transition through the existing navigation semantics; the
          // [currentIndex]/[activeGroupIndex] effect then resets
          // horizontalDragX to 0 and drops the adjacent layer, so the new
          // current Story never paints at the old off-screen translation.
          resumeAfterHorizontalGestureRef.current = false;
          wasHoldingBeforeHorizontalGestureRef.current = false;
          advanceLockRef.current = false;
          setIsHolding(false);

          if (direction === "next") {
            goToNextStory();
          } else {
            goToPreviousStory();
          }
        });
      });

      return true;
    },
    [
      canvasWidth,
      goToNextStory,
      goToPreviousStory,
      horizontalDragX,
      prepareHorizontalAdjacentLayer,
      resumePlaybackAfterHorizontalGesture,
    ],
  );

  useEffect(() => {
    clearHorizontalStoryGesture();
  }, [
    activeGroupIndex,
    activeStoryTab,
    clearHorizontalStoryGesture,
    currentIndex,
  ]);

  useEffect(() => {
    if (isOverlayOpen) {
      clearHorizontalStoryGesture();
    }
  }, [clearHorizontalStoryGesture, isOverlayOpen]);

  useEffect(() => clearHorizontalStoryGesture, [clearHorizontalStoryGesture]);

  // Text-only Story body style. Fallbacks are non-negotiable for backward
  // compatibility: a Story created before textStyle existed has none and must
  // still render exactly as before — 800 / white / center / shadow-on.
  const textStoryTextStyle = (textStyle?: StoryTextStyle | null) => [
    styles.textStoryText,
    textStyle?.shadow !== false ? styles.textStoryTextShadow : null,
    {
      fontWeight: textStyle?.fontWeight ?? ("800" as const),
      color: textStyle?.color ?? "#FFFFFF",
      textAlign: textStyle?.textAlign ?? ("center" as const),
    },
  ];

  const renderTextOverlay = (overlay?: StoryTextOverlay | null) => {
    if (!overlay?.text) {
      return null;
    }

    return (
      <View
        pointerEvents="none"
        style={[
          styles.overlayTextWrap,
          {
            // Same formula, same measured-canvas dimension source, and the
            // same static left/top:'50%' anchor (baked into
            // overlayTextWrap below) as the editor's DraggableStoryText —
            // not a percentage-based reconstruction, so there is no
            // separate mechanism that could drift from the editor's.
            transform: [
              { translateX: (overlay.x - 0.5) * canvasWidth - 140 },
              { translateY: (overlay.y - 0.5) * canvasHeight - 30 },
              { scale: overlay.scale },
              { rotate: `${overlay.rotation ?? 0}deg` },
            ],
          },
        ]}
      >
        <Text
          style={[
            styles.overlayText,
            overlay.shadow !== false ? styles.overlayTextShadow : null,
            {
              color: overlay.color,
              fontWeight: overlay.fontWeight ?? "700",
              textAlign: overlay.textAlign ?? "center",
            },
          ]}
        >
          {overlay.text}
        </Text>
      </View>
    );
  };

  // Viewer-side counterpart to the editor's DraggableStoryImage — renders
  // the same normalized transform, but as a one-time static style (no
  // gesture, no reanimated shared values: the creator already committed
  // the composition, viewers only see it). Legacy Stories (no
  // imageTransform) fall through to the exact pre-existing `cover` render
  // untouched. The transformed branch below matches DraggableStoryImage's
  // full-canvas contain-fit baseline (scale=1 = whole image visible) — see
  // storyTransform.ts / DraggableStoryImage.tsx.
  const renderStoryImage = (
    uri: string,
    imageTransform: StoryImageTransform | null | undefined,
    imageStyle: typeof styles.media,
  ) => {
    // Only a fully-valid transform (finite x/y/scale, optional finite
    // rotation) may use the transformed branch. null/undefined (legacy)
    // AND any truthy-but-malformed/partial shape both fall back to the
    // exact pre-existing cover render — never a partial repair here.
    if (!hasValidStoryImageTransform(imageTransform)) {
      return (
        <Image
          source={{ uri }}
          style={imageStyle}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
        />
      );
    }

    return (
      <View style={imageStyle} pointerEvents="none">
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [
                { translateX: (imageTransform.x - 0.5) * canvasWidth },
                { translateY: (imageTransform.y - 0.5) * canvasHeight },
                { scale: imageTransform.scale },
                { rotate: `${imageTransform.rotation ?? 0}deg` },
              ],
            },
          ]}
        >
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>
      </View>
    );
  };

  // onPressIn on either tap zone — bump the press sequence so a brand-new tap
  // can never be mistaken for the long-press's own (possible) synthetic press.
  const handleTapPressIn = () => {
    tapPressSequenceRef.current += 1;
  };

  const handlePressAction = (action: () => void) => {
    if (isDeletingStory) {
      return;
    }

    // Defensive: CommentsModal / ShareModal are RN <Modal> windows that already
    // block click-through today; this keeps tap nav safe if an overlay ever
    // becomes an in-tree layer instead.
    if (isOverlayOpen) {
      return;
    }

    // Press-sequence ownership: only the exact physical press that became a
    // long-press may be swallowed here. A later genuine tap incremented
    // tapPressSequenceRef via onPressIn, so it can never match — it is always
    // accepted, regardless of whether the platform emits onPress after
    // onLongPress.
    if (
      heldPressSequenceRef.current !== null &&
      heldPressSequenceRef.current === tapPressSequenceRef.current
    ) {
      heldPressSequenceRef.current = null;
      return;
    }

    // An actual Story transition is in flight (a committed swipe settle, or a
    // just-issued nav) — block a second navigation. goTo*Story also enforces
    // this via advanceLockRef; returning here additionally stops the tap from
    // disturbing an in-flight committed settle.
    if (activePanAxisRef.current !== null || advanceLockRef.current) {
      return;
    }

    // A *cancelled* horizontal swipe commits NO index change — it is only a
    // visual spring-back. A genuine tap here is valid and must not be dropped:
    // interrupt the spring, normalise the surface to translateX 0, drop the
    // preview layer + cancelled-gesture state, then navigate exactly once.
    if (horizontalCancelSpringActiveRef.current) {
      horizontalCancelSpringActiveRef.current = false;
      horizontalDragX.stopAnimation();
      horizontalDragX.setValue(0);
      setHorizontalAdjacentLayerState(null);
      horizontalSwipeLockRef.current = false;
      horizontalGestureActiveRef.current = false;
      resumePlaybackAfterHorizontalGesture();
    } else if (
      horizontalGestureActiveRef.current ||
      horizontalSwipeLockRef.current
    ) {
      // A committed horizontal swipe settle is still establishing — stay blocked
      // until the transition is safely in place.
      return;
    }

    action();
  };

  const handleReactionPress = () => {
    if (!currentStory || isReactionSubmitting) return;

    tapFeedback();
    popReaction();

    const previous = interaction;
    setIsReactionSubmitting(true);
    setInteraction({
      ...previous,
      isReacted: !previous.isReacted,
      reactionsCount: Math.max(
        0,
        previous.reactionsCount + (previous.isReacted ? -1 : 1),
      ),
    });
    void toggleStoryReaction(currentStory.id)
      .then(setInteraction)
      .catch(() => setInteraction(previous))
      .finally(() => setIsReactionSubmitting(false));
  };

  const openOverlay = useCallback(
    (kind: "comments" | "share") => {
      resumeAfterOverlayRef.current = isCurrentVideo ? isPlaying : !isHolding;
      if (!isCurrentVideo) freezeImagePlaybackProgress();
      setIsHolding(true);
      if (isCurrentVideo) player.pause();
      if (kind === "comments") setCommentsVisible(true);
      else setShareVisible(true);
    },
    [freezeImagePlaybackProgress, isCurrentVideo, isHolding, isPlaying, player],
  );

  const closeOverlays = useCallback(() => {
    setCommentsVisible(false);
    setShareVisible(false);
    setIsHolding(!resumeAfterOverlayRef.current);
    if (resumeAfterOverlayRef.current && !isCurrentVideo)
      resumeImagePlaybackProgress();
    if (
      resumeAfterOverlayRef.current &&
      isCurrentVideo &&
      currentStory?.mediaUri &&
      !loadFailed
    )
      player.play();
    resumeAfterOverlayRef.current = false;
  }, [
    currentStory?.mediaUri,
    isCurrentVideo,
    loadFailed,
    player,
    resumeImagePlaybackProgress,
  ]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (commentsVisible || shareVisible) {
          closeOverlays();
          return true;
        }

        router.replace("/(tabs)/home");
        return true;
      },
    );

    return () => subscription.remove();
  }, [closeOverlays, commentsVisible, router, shareVisible]);

  const handleStoryTabPress = (tab: StoryViewerTab) => {
    if (isDeletingStory) {
      return;
    }

    clearVerticalGroupGesture();
    setActiveStoryTab(tab);
    setActiveGroupIndex(0);
    setCurrentIndex(0);
    setProgressTime(0);
  };

  const handleDeleteStory = useCallback(
    async (
      storyId: string,
      currentGroupStoryCount: number,
      groupCount: number,
    ) => {
      if (deletingStoryIdRef.current) {
        return;
      }

      deletingStoryIdRef.current = storyId;
      setIsDeletingStory(true);
      pausePlaybackForDelete();

      let shouldResumePlayback = true;

      try {
        await deleteStory(storyId);
        setStoryGroupsByTab((current) => ({
          discover: removeStoryFromGroupList(current.discover, storyId),
          friends: removeStoryFromGroupList(current.friends, storyId),
        }));
        setResolvedStoryTabs({ discover: true, friends: true });

        if (currentGroupStoryCount <= 1 && groupCount <= 1) {
          shouldResumePlayback = false;
          safeBack(router, "/(tabs)/home");
          return;
        }

        setCurrentIndex((index) =>
          Math.max(0, Math.min(index, currentGroupStoryCount - 2)),
        );
      } catch {
        Alert.alert("Unable to delete story", "Please try again.");
      } finally {
        deletingStoryIdRef.current = null;
        setIsDeletingStory(false);

        if (shouldResumePlayback) {
          resumePlaybackAfterDelete();
        } else {
          resumeAfterDeleteRef.current = false;
        }
      }
    },
    [pausePlaybackForDelete, resumePlaybackAfterDelete, router],
  );

  const handleMenu = () => {
    if (isDeletingStory || deletingStoryIdRef.current) {
      return;
    }

    if (!currentStory?.isOwner) {
      Alert.alert("Story", "Only the story owner can delete this story.");
      return;
    }
    const storyId = currentStory.id;
    const currentGroupStoryCount = storyItems.length;
    const groupCount = groups.length;

    Alert.alert("Story options", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete story",
        style: "destructive",
        onPress: () =>
          void handleDeleteStory(storyId, currentGroupStoryCount, groupCount),
      },
    ]);
  };

  const panResponder = useMemo(() => {
    // Latch the axis on the first qualifying move and keep it for the whole
    // gesture, so a diagonal drag can't flip between vertical paging and
    // horizontal paging frame-to-frame.
    const resolvePanAxis = (gesture: {
      dx: number;
      dy: number;
      vx: number;
    }): "horizontal" | "vertical" | null => {
      if (activePanAxisRef.current) {
        return activePanAxisRef.current;
      }

      const absDx = Math.abs(gesture.dx);
      const absDy = Math.abs(gesture.dy);

      if (
        absDy > STORY_GROUP_ACTIVATION_DISTANCE &&
        absDy > absDx * STORY_GROUP_DIRECTION_DOMINANCE
      ) {
        activePanAxisRef.current = "vertical";
        return "vertical";
      }

      if (
        shouldCaptureHorizontalStorySwipe({
          dx: gesture.dx,
          dy: gesture.dy,
          vx: gesture.vx,
        })
      ) {
        activePanAxisRef.current = "horizontal";
        return "horizontal";
      }

      return null;
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        activePanAxisRef.current = null;
        return false;
      },
      onMoveShouldSetPanResponder: (_event, gesture) => {
        if (isOverlayOpen) return false;
        return resolvePanAxis(gesture) !== null;
      },
      onMoveShouldSetPanResponderCapture: (_event, gesture) => {
        if (isOverlayOpen) return false;
        return resolvePanAxis(gesture) !== null;
      },
      onPanResponderRelease: (_event, gesture) => {
        const axis =
          activePanAxisRef.current ??
          (Math.abs(gesture.dy) > Math.abs(gesture.dx)
            ? "vertical"
            : "horizontal");
        activePanAxisRef.current = null;

        if (axis === "vertical" || verticalGestureActiveRef.current) {
          const direction = getStoryGroupSwipeDirection({
            dx: gesture.dx,
            dy: gesture.dy,
            vx: gesture.vx,
            vy: gesture.vy,
          });

          if (direction) {
            if (!commitVerticalGroupSwipe(direction, gesture.vy)) {
              resetVerticalGroupDrag();
            }
            return;
          }

          resetVerticalGroupDrag();
          return;
        }

        const direction = shouldCommitHorizontalStorySwipe({
          translationX: gesture.dx,
          velocityX: gesture.vx,
          translationY: gesture.dy,
          canvasWidth,
        });

        if (direction) {
          if (commitHorizontalStorySwipe(direction, gesture.vx)) {
            return;
          }

          // commit refused: either a settle is already running (ignore this
          // release) or there is no adjacent Story for this direction — the
          // first/last boundary, where the existing product behavior
          // (restart current / exit the viewer) must be preserved.
          if (!horizontalAdjacentLayerRef.current) {
            horizontalGestureActiveRef.current = false;
            horizontalDragX.stopAnimation();
            horizontalDragX.setValue(0);
            setHorizontalAdjacentLayerState(null);
            resumeAfterHorizontalGestureRef.current = false;
            wasHoldingBeforeHorizontalGestureRef.current = false;
            setIsHolding(false);
            if (direction === "next") {
              goToNextStory();
            } else {
              goToPreviousStory();
            }
          }
          return;
        }

        if (horizontalGestureActiveRef.current) {
          cancelHorizontalStoryGesture();
        }
      },
      onPanResponderMove: (_event, gesture) => {
        if (isOverlayOpen) {
          return;
        }

        if (activePanAxisRef.current === "horizontal") {
          if (horizontalSwipeLockRef.current || advanceLockRef.current) {
            return;
          }

          const direction: StoryHorizontalSwipeDirection =
            gesture.dx < 0 ? "next" : "previous";
          const adjacent = prepareHorizontalAdjacentLayer(direction);

          pausePlaybackForHorizontalGesture();
          horizontalDragX.setValue(
            adjacent
              ? clampHorizontalStoryDrag(gesture.dx, canvasWidth)
              : clampStoryGroupDrag(gesture.dx),
          );
          return;
        }

        if (groupSwipeLockRef.current) {
          return;
        }

        const absDx = Math.abs(gesture.dx);
        const absDy = Math.abs(gesture.dy);

        if (absDy <= absDx && !verticalGestureActiveRef.current) {
          verticalDragY.setValue(0);
          return;
        }

        const direction = gesture.dy >= 0 ? "previous" : "next";
        const adjacentLayer = prepareVerticalGroupAdjacentLayer(direction);

        pausePlaybackForVerticalGroupGesture();
        verticalDragY.setValue(
          adjacentLayer
            ? clampStoryGroupPagerDrag(gesture.dy, viewportHeight)
            : clampStoryGroupDrag(gesture.dy),
        );
      },
      onPanResponderTerminate: () => {
        const axis = activePanAxisRef.current;
        activePanAxisRef.current = null;

        if (axis === "horizontal" || horizontalGestureActiveRef.current) {
          // If a commit settle is already running it is driven by the
          // Animated value, not the responder — let it finish and commit.
          // Otherwise spring the drag back to the current Story.
          if (!horizontalSwipeLockRef.current) {
            cancelHorizontalStoryGesture();
          }
          return;
        }

        if (verticalGestureActiveRef.current) {
          resetVerticalGroupDrag();
          return;
        }

        verticalDragY.setValue(0);
        groupSwipeLockRef.current = false;
      },
    });
  }, [
    canvasWidth,
    cancelHorizontalStoryGesture,
    commitHorizontalStorySwipe,
    commitVerticalGroupSwipe,
    goToNextStory,
    goToPreviousStory,
    horizontalDragX,
    isOverlayOpen,
    pausePlaybackForHorizontalGesture,
    pausePlaybackForVerticalGroupGesture,
    prepareHorizontalAdjacentLayer,
    prepareVerticalGroupAdjacentLayer,
    resetVerticalGroupDrag,
    setHorizontalAdjacentLayerState,
    viewportHeight,
    verticalDragY,
  ]);

  const renderStaticStoryVisual = (story: StorySequenceItem) => {
    const mediaType = story.mediaType ?? "video";

    if (mediaType === "text") {
      return (
        <StoryBackground background={story.textBackground}>
          <Text style={textStoryTextStyle(story.textStyle)}>{story.textContent}</Text>
        </StoryBackground>
      );
    }

    if (mediaType === "image" && story.mediaUri) {
      return renderStoryImage(story.mediaUri, story.imageTransform, styles.media);
    }

    const thumbnailSource = story.mediaUri
      ? getCachedStoryThumbnail(story.id)
      : null;

    if (thumbnailSource) {
      return (
        <Image
          source={thumbnailSource}
          style={styles.media}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
        />
      );
    }

    return <View style={styles.adjacentVideoPreview} />;
  };

  const renderAdjacentStoryLayer = () => {
    if (!adjacentStoryLayer) {
      return null;
    }

    const mediaType = adjacentStoryLayer.story.mediaType ?? "video";

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.adjacentStorySurface,
          { transform: [{ translateY: adjacentSurfaceTranslateY }] },
        ]}
      >
        {renderStaticStoryVisual(adjacentStoryLayer.story)}
        {mediaType !== "text"
          ? renderTextOverlay(adjacentStoryLayer.story.textOverlay)
          : null}
      </Animated.View>
    );
  };

  const renderHorizontalAdjacentStoryLayer = () => {
    if (!horizontalAdjacentLayer) {
      return null;
    }

    const mediaType = horizontalAdjacentLayer.story.mediaType ?? "video";

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.adjacentStorySurface,
          { transform: [{ translateX: horizontalAdjacentTranslateX }] },
        ]}
      >
        {renderStaticStoryVisual(horizontalAdjacentLayer.story)}
        {mediaType !== "text"
          ? renderTextOverlay(horizontalAdjacentLayer.story.textOverlay)
          : null}
      </Animated.View>
    );
  };

  const renderCurrentStoryImage = () => {
    if (!currentStory?.mediaUri) return null;

    const imageLoadHandlers = {
      onLoadStart: () => {
        if (__DEV__)
          console.log("[StoryPlaybackTiming] image-request-start", {
            storyId: currentStory.id,
            sinceOpenMs: Date.now() - openedAt,
          });
      },
      onLoad: () => {
        if (__DEV__)
          console.log("[StoryPlaybackTiming] image-loaded", {
            storyId: currentStory.id,
            sinceOpenMs: Date.now() - openedAt,
          });
      },
      onDisplay: () => {
        if (__DEV__)
          console.log("[StoryPlaybackTiming] image-displayed", {
            storyId: currentStory.id,
            sinceOpenMs: Date.now() - openedAt,
          });
      },
    };

    // Only a fully-valid transform (finite x/y/scale, optional finite
    // rotation) may use the transformed branch. null/undefined (legacy)
    // AND any truthy-but-malformed/partial shape both fall back to the
    // exact pre-existing cover render — never a partial repair here.
    if (!hasValidStoryImageTransform(currentStory.imageTransform)) {
      return (
        <Image
          source={{ uri: currentStory.mediaUri }}
          style={styles.media}
          contentFit="cover"
          contentPosition="center"
          transition={100}
          cachePolicy="memory-disk"
          {...imageLoadHandlers}
        />
      );
    }

    const { imageTransform } = currentStory;

    return (
      <View style={styles.media} pointerEvents="none">
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [
                { translateX: (imageTransform.x - 0.5) * canvasWidth },
                { translateY: (imageTransform.y - 0.5) * canvasHeight },
                { scale: imageTransform.scale },
                { rotate: `${imageTransform.rotation ?? 0}deg` },
              ],
            },
          ]}
        >
          <Image
            source={{ uri: currentStory.mediaUri }}
            style={StyleSheet.absoluteFillObject}
            contentFit="contain"
            transition={100}
            cachePolicy="memory-disk"
            {...imageLoadHandlers}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderAdjacentStoryLayer()}
      {renderHorizontalAdjacentStoryLayer()}
      <Animated.View
        style={[
          styles.storySurface,
          {
            transform: [
              { translateX: horizontalSurfaceTranslateX },
              { translateY: verticalSurfaceTranslateY },
            ],
          },
        ]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setCanvasSize((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height },
            );
          }
        }}
      >
        <StatusBar style="light" translucent />
        {isCurrentVideo && currentStory?.mediaUri && !loadFailed ? (
          <VideoView
            style={styles.media}
            player={player}
            contentFit="cover"
            nativeControls={false}
            useExoShutter={false}
            surfaceType={Platform.OS === "android" ? "surfaceView" : undefined}
            onFirstFrameRender={() => {
              const timing = playbackTimingRef.current;
              setHasRenderedFirstFrame(true);
              setIsLoadingCurrentStory(false);
              if (timing.firstFrameAt) return;
              timing.firstFrameAt = Date.now();
              if (__DEV__) {
                console.log("[StoryPlaybackTiming] first-frame", {
                  storyId: timing.storyId,
                  requestToFirstFrameMs: timing.requestStartedAt
                    ? timing.firstFrameAt - timing.requestStartedAt
                    : null,
                  sourceLoadToFirstFrameMs: timing.sourceLoadedAt
                    ? timing.firstFrameAt - timing.sourceLoadedAt
                    : null,
                  bufferingMs: timing.bufferingMs,
                  storyOpenToFirstFrameMs: timing.firstFrameAt - openedAt,
                });
              }
            }}
          />
        ) : isCurrentImage && currentStory?.mediaUri && !loadFailed ? (
          renderCurrentStoryImage()
        ) : isCurrentText && currentStory && !loadFailed ? (
          <StoryBackground background={currentStory.textBackground}>
            <Text style={textStoryTextStyle(currentStory.textStyle)}>{currentStory.textContent}</Text>
          </StoryBackground>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Story unavailable</Text>
          </View>
        )}
        {!isCurrentText ? renderTextOverlay(currentStory?.textOverlay) : null}
        {isLoadingStory && !loadFailed && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        <View
          style={[
            styles.tapZones,
            {
              top: insets.top + 72,
              right: 0,
              bottom: Math.max(insets.bottom + 112, 148),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable
            style={styles.tapZone}
            delayLongPress={LONG_PRESS_DELAY_MS}
            onPressIn={handleTapPressIn}
            onLongPress={pauseForHold}
            onPress={() => handlePressAction(goToPreviousStory)}
            onPressOut={resumeFromHold}
          />
          <Pressable
            style={styles.tapZone}
            delayLongPress={LONG_PRESS_DELAY_MS}
            onPressIn={handleTapPressIn}
            onLongPress={pauseForHold}
            onPress={() => handlePressAction(goToNextStory)}
            onPressOut={resumeFromHold}
          />
        </View>

      {isCurrentVideo && !loadFailed && !!currentStory && (
        <Pressable
          style={[
            styles.centerPlayButton,
            isLoadingStory && styles.centerPlayButtonDisabled,
            { opacity: showFeedback ? 1 : 0 },
          ]}
          hitSlop={{ top: 100, bottom: 100, left: 80, right: 80 }}
          delayLongPress={LONG_PRESS_DELAY_MS}
          onLongPress={pauseForHold}
          onPress={() => handlePressAction(togglePlay)}
          onPressOut={resumeFromHold}
          disabled={isLoadingStory || isDeletingStory}
          accessibilityLabel={isPlaying ? "Pause story" : "Play story"}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="#FFFFFF"
            style={!isPlaying ? styles.playIcon : undefined}
          />
        </Pressable>
      )}

      <View
        style={[styles.topControls, { paddingTop: insets.top + 12 }]}
        pointerEvents="box-none"
      >
        <View style={styles.topControlRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => safeBack(router, "/(tabs)/home")}
            activeOpacity={0.8}
          >
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.viewerTabs}>
            {(["discover", "friends"] as StoryViewerTab[]).map((tab) => {
              const isActive = activeStoryTab === tab;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.viewerTab, isActive && styles.viewerTabActive]}
                  onPress={() => handleStoryTabPress(tab)}
                  activeOpacity={0.82}
                >
                  <Text
                    style={[
                      styles.viewerTabText,
                      isActive && styles.viewerTabTextActive,
                    ]}
                  >
                    {tab === "discover" ? "Discover" : "Friends"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.topRightSpacer} />
        </View>
      </View>

      {!loadFailed && !!currentStory && (
        <View style={styles.actionRail} pointerEvents="box-none">
          <PostInteractionBar
            vertical
            compact
            likesCount={interaction.reactionsCount}
            commentsCount={interaction.commentsCount}
            sharesCount={0}
            viewsCount={interaction.viewsCount}
            isLiked={interaction.isReacted}
            onLikePress={handleReactionPress}
            onCommentPress={() => openOverlay("comments")}
            onSharePress={() => openOverlay("share")}
            likeIconStyle={reactionPopStyle}
            likeDisabled={
              !currentStory || isReactionSubmitting || isDeletingStory
            }
            commentDisabled={!currentStory || isDeletingStory}
            shareDisabled={!currentStory || isShareSubmitting || isDeletingStory}
            iconColor="#FFFFFF"
            countColor="#FFFFFF"
            actionStyle={styles.railAction}
          />
        </View>
      )}

      {!loadFailed && !!currentStory && (
        <View
          style={[styles.footer, { bottom: Math.max(insets.bottom + 16, 24) }]}
        >
          <View style={styles.footerAuthorRow}>
            <UserAvatar
              uri={currentStory?.authorAvatar ?? activeGroup?.authorAvatar}
              name={currentStory?.authorName ?? activeGroup?.title}
              size={38}
            />
            <View style={styles.authorBlock}>
              <View style={styles.authorRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {currentStory?.authorName ??
                    activeGroup?.title ??
                    title ??
                    "Story"}
                </Text>
                {!isCurrentStoryByCurrentUser ? (
                  <Text style={styles.followingPill}>Following</Text>
                ) : null}
                {currentStory?.isOwner ? (
                  isDeletingCurrentStory ? (
                    <View style={styles.deletingStoryStatus}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.deletingStoryText}>Deleting...</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleMenu}
                      style={styles.moreBtn}
                      accessibilityLabel="Story options"
                      disabled={isDeletingStory}
                      accessibilityState={{
                        disabled: isDeletingStory,
                        busy: isDeletingStory,
                      }}
                    >
                      <Feather name="more-horizontal" size={21} color="#FFFFFF" />
                    </TouchableOpacity>
                  )
                ) : null}
              </View>
              <Text style={styles.metaText}>
                {formatExpiry(currentStory?.expiresAt)}
              </Text>
            </View>
          </View>
          {currentStory?.caption ? (
            <Text style={styles.captionText} numberOfLines={2}>
              {currentStory.caption}
            </Text>
          ) : null}
          <View style={styles.captionMetaRow}>
            {currentStory?.caption ? (
              <Text style={styles.captionMoreText}>see more</Text>
            ) : (
              <View />
            )}
            {activeGroupIndex < groups.length - 1 ? (
              <Text style={styles.swipeHint}>Swipe up</Text>
            ) : null}
          </View>
          <View style={styles.progressFooterRow}>
            <View style={styles.progressSegments}>
              {storyItems.map((story, index) => {
                const progress =
                  index < progressDisplayIndex
                    ? 1
                    : index > progressDisplayIndex
                      ? 0
                      : currentTime / currentDuration;

                return (
                  <View key={story.id} style={styles.segmentTrack}>
                    <View
                      style={[
                        styles.segmentFill,
                        { width: `${Math.min(progress, 1) * 100}%` },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
            <Text style={styles.durationText}>
              {Math.ceil(Math.max(currentDuration - currentTime, 0))}s
            </Text>
          </View>
        </View>
      )}
      </Animated.View>

      <CommentsModal
        visible={commentsVisible}
        onClose={closeOverlays}
        momentId={currentStory?.id}
        entityType="story"
        likesCount={interaction.reactionsCount}
        sharesCount={0}
        onStoryInteractionChange={setInteraction}
      />
      <ShareModal
        visible={shareVisible}
        onClose={closeOverlays}
        shareUrl={
          currentStory
            ? `https://mooment.app/stories/${currentStory.id}`
            : undefined
        }
        onRepost={async (payload) => {
          if (!currentStory) return;
          setIsShareSubmitting(true);
          try {
            await shareStoryToFeed(currentStory.id, payload);
            closeOverlays();
          } catch (error) {
            throw error;
          } finally {
            setIsShareSubmitting(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  storySurface: {
    flex: 1,
    backgroundColor: "#000000",
  },
  adjacentStorySurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  adjacentVideoPreview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  media: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
  },
  textStoryBackground: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  textStoryText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    textAlign: "center",
  },
  // Split out of textStoryText so the viewer can honour a text Story's
  // persisted shadow:false. Values are byte-identical to the previous
  // always-on shadow, so shadow-on Stories look exactly as before.
  textStoryTextShadow: {
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  // Kept byte-identical to DraggableStoryText.tsx's overlayTextWrap (same
  // position/left/top anchor, same width, same alignItems, same
  // paddingVertical) — this is the base geometry the `-140`/`-30`
  // compensating offsets in renderTextOverlay above were calibrated
  // against, so it must match the editor exactly for text to land in the
  // same relative spot the creator saw before publishing.
  overlayTextWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 280,
    alignItems: "center",
    paddingVertical: 10,
  },
  overlayText: {
    fontSize: 30,
    lineHeight: 36,
  },
  // Split out of overlayText so the viewer can honour an image-overlay's
  // persisted shadow:false. Values are byte-identical to the editor's
  // DraggableStoryText.overlayTextShadow and to the previous always-on
  // shadow here, so shadow-on overlays render exactly as before.
  overlayTextShadow: {
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  emptyState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  tapZone: {
    flex: 1,
  },
  centerPlayButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    left: "50%",
    marginLeft: -18,
    marginTop: -18,
    position: "absolute",
    top: "50%",
    width: 36,
  },
  centerPlayButtonDisabled: {
    opacity: 0.45,
  },
  topControls: {
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
  },
  topControlRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  viewerTabs: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 15,
    flexDirection: "row",
    overflow: "hidden",
    padding: 2,
  },
  viewerTab: {
    alignItems: "center",
    borderRadius: 13,
    height: 28,
    justifyContent: "center",
    minWidth: 68,
    paddingHorizontal: 10,
  },
  viewerTabActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  viewerTabDisabled: {
    opacity: 0.45,
  },
  viewerTabText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
  },
  viewerTabTextActive: {
    color: "#FFFFFF",
  },
  topRightSpacer: {
    height: 40,
    width: 40,
  },
  progressSegments: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  segmentTrack: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 2,
    flex: 1,
    height: 3,
    overflow: "hidden",
  },
  segmentFill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    height: "100%",
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    maxWidth: 150,
  },
  authorBlock: { flex: 1 },
  authorRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  moreBtn: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 34,
  },
  deletingStoryStatus: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  deletingStoryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  metaText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  followingPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 9,
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  playIcon: {
    marginLeft: 4,
  },
  footer: {
    bottom: Platform.OS === "ios" ? 30 : 24,
    left: 16,
    position: "absolute",
    right: 54,
  },
  footerAuthorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginBottom: 8,
  },
  actionRail: {
    alignItems: "center",
    bottom: 118,
    gap: 22,
    position: "absolute",
    right: 18,
  },
  railAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    minWidth: 34,
  },
  railActionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  swipeHint: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },
  captionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 18,
  },
  captionMoreText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
  },
  progressFooterRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 5,
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

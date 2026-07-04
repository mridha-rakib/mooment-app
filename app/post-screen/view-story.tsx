import { useEventListener } from "expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, type AppStateStatus, BackHandler, PanResponder, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { markStoriesSeen } from "@/lib/storySeen";
import { safeBack } from "@/lib/navigation";
import { deleteStory, getDiscoverStories, getFriendStories, recordStoryView, shareStoryToFeed, toggleStoryReaction, type Story, type StoryMediaType, type StoryTextBackground, type StoryTextOverlay } from "@/lib/stories";
import CommentsModal from "@/components/post/CommentsModal";
import PostInteractionBar from "@/components/post/PostInteractionBar";
import ShareModal from "@/components/post/ShareModal";
import UserAvatar from "@/components/ui/UserAvatar";
import { getStoryViewerSession, type StoryViewerTab, type ViewerGroup } from "@/lib/storyViewerSession";

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

type StoryGroup = { title: string; authorId?: string; authorAvatar?: string | null; stories: StorySequenceItem[] };

const LONG_PRESS_DELAY_MS = 160;
const MIN_AUTO_ADVANCE_VISIBLE_MS = 400;

const formatExpiry = (expiresAt?: string) => {
  const seconds = Math.max(0, Math.ceil(((expiresAt ? new Date(expiresAt).getTime() : Date.now()) - Date.now()) / 1000));
  if (seconds >= 3600) return `${Math.ceil(seconds / 3600)}h left`;
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m left`;
  return `${seconds}s left`;
};

const parseStoryItems = (stories?: string, mediaUri?: string): StorySequenceItem[] => {
  if (stories) {
    try {
      const parsedStories = JSON.parse(stories) as StorySequenceItem[];

      return parsedStories.filter((story) => story.mediaType === "text" || Boolean(story.mediaUri));
    } catch {
      return [];
    }
  }

  return mediaUri ? [{ id: "story", mediaType: "video", mediaUri, contentType: null, durationSeconds: 15 }] : [];
};

const normalizeGroups = (groups?: ViewerGroup[]): StoryGroup[] =>
  groups
    ?.filter((group) => Array.isArray(group.stories) && group.stories.length > 0)
    .map((group) => ({
      title: group.title,
      authorId: group.authorId,
      authorAvatar: group.authorAvatar,
      stories: group.stories as StorySequenceItem[],
    })) ?? [];

const isActiveStory = (story: Pick<StorySequenceItem, "expiresAt">) =>
  !story.expiresAt || new Date(story.expiresAt).getTime() > Date.now();

const groupStoriesByAuthor = (stories: Story[]): StoryGroup[] => {
  const grouped = new Map<string, Story[]>();

  stories.filter(isActiveStory).forEach((story) => {
    const authorId = story.author?.id ?? story.userId;
    grouped.set(authorId, [...(grouped.get(authorId) ?? []), story]);
  });

  return Array.from(grouped.entries()).map(([authorId, authorStories]) => {
    const sortedStories = [...authorStories].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const latestStory = sortedStories[sortedStories.length - 1];
    const title = latestStory.author?.name ?? "Story";
    const authorAvatar = latestStory.author?.avatarUrl ?? null;

    return {
      title,
      authorId,
      authorAvatar,
      stories: sortedStories.map((story) => ({
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
        authorId,
        authorName: title,
        authorAvatar,
      })),
    };
  });
};

const removeStoryFromGroupList = (groups: StoryGroup[], storyId: string) =>
  groups
    .map((group) => ({ ...group, stories: group.stories.filter((story) => story.id !== storyId) }))
    .filter((group) => group.stories.length > 0);

const getStoryVideoSource = (mediaUri?: string | null): VideoSource =>
  mediaUri ? { uri: mediaUri, useCaching: true } : null;

const getVideoSourceUri = (source: VideoSource) => {
  if (typeof source === "string") {
    return source;
  }

  return typeof source === "object" && source && "uri" in source ? source.uri : null;
};

function StoryBackground({ background, children }: { background?: StoryTextBackground | null; children?: React.ReactNode }) {
  const colors = background?.colors?.length ? background.colors : ["#37214F", "#111827"];

  if ((background?.type === "gradient" || colors.length > 1) && colors.length >= 2) {
    return (
      <LinearGradient colors={[colors[0], colors[1]]} style={styles.textStoryBackground}>
        {children}
      </LinearGradient>
    );
  }

  return <View style={[styles.textStoryBackground, { backgroundColor: colors[0] }]}>{children}</View>;
}

export default function ViewStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mediaUri, stories, title, storySessionId, groupIndex: groupIndexParam, openedAt: openedAtParam } = useLocalSearchParams<{
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
    () => [{ title: title || 'Story', stories: initialStoryItems }],
    [initialStoryItems, title],
  );
  const sessionData = useMemo(() => {
    const session = getStoryViewerSession(storySessionId);

    if (Array.isArray(session)) {
      const legacyGroups = normalizeGroups(session);
      return {
        initialTab: 'discover' as StoryViewerTab,
        discoverGroups: legacyGroups.length ? legacyGroups : fallbackGroups,
        friendGroups: [] as StoryGroup[],
      };
    }

    const discoverGroups = normalizeGroups(session?.discoverGroups ?? session?.groups);
    const friendGroups = normalizeGroups(session?.friendGroups);

    return {
      initialTab: session?.activeTab ?? 'discover' as StoryViewerTab,
      discoverGroups: discoverGroups.length ? discoverGroups : fallbackGroups,
      friendGroups,
    };
  }, [fallbackGroups, storySessionId]);
  const [activeStoryTab, setActiveStoryTab] = useState<StoryViewerTab>(sessionData.initialTab);
  const [storyGroupsByTab, setStoryGroupsByTab] = useState<Record<StoryViewerTab, StoryGroup[]>>({
    discover: sessionData.discoverGroups,
    friends: sessionData.friendGroups,
  });
  const [resolvedStoryTabs, setResolvedStoryTabs] = useState<Record<StoryViewerTab, boolean>>({
    discover: false,
    friends: false,
  });
  const groups = useMemo(() => (
    storyGroupsByTab[activeStoryTab].length
      ? storyGroupsByTab[activeStoryTab]
      : activeStoryTab === 'discover' && !resolvedStoryTabs.discover
        ? fallbackGroups
        : []
  ), [activeStoryTab, fallbackGroups, resolvedStoryTabs.discover, storyGroupsByTab]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(() => Math.min(Math.max(Number(groupIndexParam) || 0, 0), groups.length - 1));
  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const storyItems = useMemo(
    () => activeGroup?.stories ?? (activeStoryTab === 'discover' ? initialStoryItems : []),
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
  const [shareVisible, setShareVisible] = useState(false);
  const [interaction, setInteraction] = useState({ viewsCount: 0, reactionsCount: 0, commentsCount: 0, isReacted: false });
  const [isReactionSubmitting, setIsReactionSubmitting] = useState(false);
  const [isShareSubmitting, setIsShareSubmitting] = useState(false);
  const advanceLockRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const autoPlayRequestedRef = useRef(false);
  const holdActivatedRef = useRef(false);
  const ignoreNextPressRef = useRef(false);
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
  const preloadedUriRef = useRef<[string | null, string | null]>([null, null]);
  const preloadRequestRef = useRef(0);
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
  const currentDuration = Math.max(0.1, loadedDuration || currentStory?.durationSeconds || 15);
  const isOverlayOpen = commentsVisible || shareVisible;

  useEffect(() => {
    setActiveStoryTab(sessionData.initialTab);
    setStoryGroupsByTab({
      discover: sessionData.discoverGroups,
      friends: sessionData.friendGroups,
    });
    setResolvedStoryTabs({ discover: false, friends: false });
  }, [sessionData.discoverGroups, sessionData.friendGroups, sessionData.initialTab]);

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

      setStoryGroupsByTab((current) => ({
        discover: discoverResult.status === "fulfilled"
          ? groupStoriesByAuthor(discoverResult.value)
          : current.discover,
        friends: friendsResult.status === "fulfilled"
          ? groupStoriesByAuthor(friendsResult.value)
          : current.friends,
      }));
      setResolvedStoryTabs((current) => ({
        discover: discoverResult.status === "fulfilled" ? true : current.discover,
        friends: friendsResult.status === "fulfilled" ? true : current.friends,
      }));
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
  }, [currentStory?.commentsCount, currentStory?.id, currentStory?.isReacted, currentStory?.reactionsCount, currentStory?.viewsCount]);

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
  const isLoadingStory = isCurrentVideo && !loadFailed && (
    !hasRenderedFirstFrame ||
    isLoadingCurrentStory ||
    (playerStatus === "loading" && !isPlaying)
  );
  const currentTime = Math.min(progressTime, currentDuration);

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
      safeBack(router, '/(tabs)/home');
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
  }, [activeGroupIndex, activePlayerSlot, currentIndex, groups.length, router, storyItems]);

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
      pendingStoryIndexRef.current = Math.max((previousGroup?.stories.length ?? 1) - 1, 0);
      setProgressTime(0);
      setLoadedDuration(null);
      setActiveGroupIndex((index) => Math.max(0, index - 1));
      return;
    }

    setProgressTime(0);
    try {
      player.currentTime = 0;
      player.play();
    } catch {
      player.pause();
    }
  }, [activeGroupIndex, activePlayerSlot, currentIndex, groups, player, storyItems]);

  useEffect(() => {
    const loadRequestId = loadRequestIdRef.current + 1;

    loadRequestIdRef.current = loadRequestId;
    advanceLockRef.current = false;
    holdActivatedRef.current = false;
    ignoreNextPressRef.current = false;
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

    void player.replaceAsync(getStoryVideoSource(currentStory.mediaUri))
      .then(() => {
        if (loadRequestIdRef.current !== loadRequestId) {
          return;
        }

        player.currentTime = 0;
        player.muted = false;
        preloadedUriRef.current[activePlayerSlot] = currentStory.mediaUri ?? null;
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
  }, [activePlayerSlot, currentStory, currentStory?.id, currentStory?.mediaUri, isCurrentVideo, openedAt, player]);

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

    void preloadPlayer.replaceAsync(getStoryVideoSource(nextStory.mediaUri))
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
  }, [activePlayerSlot, nextStory, nextStory?.id, nextStory?.mediaUri, playerA, playerB]);

  useEffect(() => {
    if (!currentStory || isCurrentVideo || isHolding || loadFailed || !sourceReady) {
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
  }, [currentDuration, currentStory, goToNextStory, isCurrentVideo, isHolding, loadFailed, sourceReady]);

  useEffect(() => {
    if (currentStory?.id) {
      void markStoriesSeen([currentStory.id]);
      if (!viewedStoryIdsRef.current.has(currentStory.id)) {
        viewedStoryIdsRef.current.add(currentStory.id);
        void recordStoryView(currentStory.id).then(setInteraction).catch(() => {
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
          requestToSourceLoadMs: timing.requestStartedAt ? timing.sourceLoadedAt - timing.requestStartedAt : null,
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

    const nextProgress = Math.min(Math.max(nextCurrentTime, 0), currentDuration);
    setProgressTime((current) => Math.abs(current - nextProgress) >= 0.03 ? nextProgress : current);
  });

  useEventListener(player, "statusChange", ({ status, oldStatus }) => {
    setPlayerStatus((current) => current === status ? current : status);
    const timing = playbackTimingRef.current;
    const now = Date.now();

    if (status === "loading" && oldStatus !== "loading") {
      timing.loadingStartedAt = now;
    } else if (oldStatus === "loading" && status !== "loading" && timing.loadingStartedAt) {
      timing.bufferingMs += now - timing.loadingStartedAt;
      timing.loadingStartedAt = 0;
    }

    if (__DEV__) {
      console.log("[StoryPlaybackTiming] video-status", {
        storyId: timing.storyId,
        oldStatus,
        status,
        sinceRequestMs: timing.requestStartedAt ? now - timing.requestStartedAt : null,
      });
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    setPlayerIsPlaying((current) => current === isPlaying ? current : isPlaying);
    const timing = playbackTimingRef.current;
    if (isPlaying && !timing.playingAt) {
      timing.playingAt = Date.now();
      if (__DEV__) {
        console.log("[StoryPlaybackTiming] video-playing", {
          storyId: timing.storyId,
          requestToPlayingMs: timing.requestStartedAt ? timing.playingAt - timing.requestStartedAt : null,
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
  }, [currentStory?.mediaUri, isCurrentVideo, isLoadingStory, loadFailed, player, playerStatus, sourceReady]);

  useEventListener(player, "playToEnd", () => {
    if (!sourceReadyRef.current || Date.now() - visibleStartedAtRef.current < MIN_AUTO_ADVANCE_VISIBLE_MS) {
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
          const frozenProgress = Math.min(currentDuration, Math.max(progressTimeRef.current, elapsedSeconds));

          progressTimeRef.current = frozenProgress;
          setProgressTime(frozenProgress);
          setIsHolding(true);
        }
        return;
      }

      if (previousState !== "active" && nextState === "active") {
        if (isCurrentVideo) {
          if (resumeAfterAppStateRef.current && currentStory?.mediaUri && !isLoadingStory && !loadFailed) {
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
          visibleStartedAtRef.current = Date.now() - progressTimeRef.current * 1000;
          setIsHolding(false);
        }
      }
    });

    return () => subscription.remove();
  }, [currentDuration, currentStory, currentStory?.mediaUri, isCurrentVideo, isHolding, isLoadingStory, isOverlayOpen, isPlaying, loadFailed, player, sourceReady]);

  const freezeImagePlaybackProgress = useCallback(() => {
    if (isCurrentVideo || !currentStory || !sourceReady || loadFailed) {
      return;
    }

    const elapsedSeconds = visibleStartedAtRef.current
      ? (Date.now() - visibleStartedAtRef.current) / 1000
      : progressTimeRef.current;
    const frozenProgress = Math.min(currentDuration, Math.max(progressTimeRef.current, elapsedSeconds));

    progressTimeRef.current = frozenProgress;
    setProgressTime(frozenProgress);
  }, [currentDuration, currentStory, isCurrentVideo, loadFailed, sourceReady]);

  const resumeImagePlaybackProgress = useCallback(() => {
    if (isCurrentVideo || !currentStory || !sourceReady || loadFailed) {
      return;
    }

    visibleStartedAtRef.current = Date.now() - progressTimeRef.current * 1000;
  }, [currentStory, isCurrentVideo, loadFailed, sourceReady]);

  const togglePlay = useCallback(() => {
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
  }, [currentStory?.mediaUri, freezeImagePlaybackProgress, isCurrentVideo, isLoadingStory, isPlaying, player, resumeImagePlaybackProgress]);

  const pauseForHold = useCallback(() => {
    if (holdActivatedRef.current || isLoadingStory || (!currentStory?.mediaUri && isCurrentVideo)) {
      return;
    }

    holdActivatedRef.current = true;
    ignoreNextPressRef.current = true;
    resumeAfterHoldRef.current = isPlaying;
    if (!isCurrentVideo) freezeImagePlaybackProgress();
    setIsHolding(true);

    if (isCurrentVideo && isPlaying) {
      player.pause();
    }
  }, [currentStory?.mediaUri, freezeImagePlaybackProgress, isCurrentVideo, isLoadingStory, isPlaying, player]);

  const resumeFromHold = useCallback(() => {
    if (!holdActivatedRef.current) {
      return;
    }

    holdActivatedRef.current = false;
    setIsHolding(false);

    if (!isCurrentVideo) {
      resumeImagePlaybackProgress();
    }

    if (resumeAfterHoldRef.current && currentStory?.mediaUri && !isLoadingStory && isCurrentVideo) {
      player.play();
    }

    resumeAfterHoldRef.current = false;
  }, [currentStory?.mediaUri, isCurrentVideo, isLoadingStory, player, resumeImagePlaybackProgress]);

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

  const handlePressAction = (action: () => void) => {
    if (ignoreNextPressRef.current) {
      ignoreNextPressRef.current = false;
      return;
    }

    action();
  };

  const handleReactionPress = () => {
    if (!currentStory || isReactionSubmitting) return;

    const previous = interaction;
    setIsReactionSubmitting(true);
    setInteraction({
      ...previous,
      isReacted: !previous.isReacted,
      reactionsCount: Math.max(0, previous.reactionsCount + (previous.isReacted ? -1 : 1)),
    });
    void toggleStoryReaction(currentStory.id)
      .then(setInteraction)
      .catch(() => setInteraction(previous))
      .finally(() => setIsReactionSubmitting(false));
  };

  const openOverlay = useCallback((kind: 'comments' | 'share') => {
    resumeAfterOverlayRef.current = isCurrentVideo ? isPlaying : !isHolding;
    if (!isCurrentVideo) freezeImagePlaybackProgress();
    setIsHolding(true);
    if (isCurrentVideo) player.pause();
    if (kind === 'comments') setCommentsVisible(true);
    else setShareVisible(true);
  }, [freezeImagePlaybackProgress, isCurrentVideo, isHolding, isPlaying, player]);

  const closeOverlays = useCallback(() => {
    setCommentsVisible(false);
    setShareVisible(false);
    setIsHolding(!resumeAfterOverlayRef.current);
    if (resumeAfterOverlayRef.current && !isCurrentVideo) resumeImagePlaybackProgress();
    if (resumeAfterOverlayRef.current && isCurrentVideo && currentStory?.mediaUri && !loadFailed) player.play();
    resumeAfterOverlayRef.current = false;
  }, [currentStory?.mediaUri, isCurrentVideo, loadFailed, player, resumeImagePlaybackProgress]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (commentsVisible || shareVisible) {
        closeOverlays();
        return true;
      }

      router.replace("/(tabs)/home");
      return true;
    });

    return () => subscription.remove();
  }, [closeOverlays, commentsVisible, router, shareVisible]);

  const handleStoryTabPress = (tab: StoryViewerTab) => {
    setActiveStoryTab(tab);
    setActiveGroupIndex(0);
    setCurrentIndex(0);
    setProgressTime(0);
  };

  const handleMenu = () => {
    if (!currentStory?.isOwner) {
      Alert.alert('Story', 'Only the story owner can delete this story.');
      return;
    }
    const storyId = currentStory.id;
    Alert.alert('Story options', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete story', style: 'destructive', onPress: () => void deleteStory(storyId)
        .then(() => {
          setStoryGroupsByTab((current) => ({
            discover: removeStoryFromGroupList(current.discover, storyId),
            friends: removeStoryFromGroupList(current.friends, storyId),
          }));
          setResolvedStoryTabs({ discover: true, friends: true });
          const currentGroupStoryCount = storyItems.length;
          if (currentGroupStoryCount <= 1 && groups.length <= 1) {
            safeBack(router, '/(tabs)/home');
            return;
          }
          setCurrentIndex((index) => Math.max(0, Math.min(index, currentGroupStoryCount - 2)));
        })
        .catch(() => Alert.alert('Unable to delete story', 'Please try again.')) },
    ]);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => {
      if (isOverlayOpen) return false;
      const absDx = Math.abs(gesture.dx);
      const absDy = Math.abs(gesture.dy);
      return (absDy > 18 && absDy > absDx * 1.15) || (absDx > 24 && absDx > absDy * 1.15);
    },
    onMoveShouldSetPanResponderCapture: (_event, gesture) => {
      if (isOverlayOpen) return false;
      const absDx = Math.abs(gesture.dx);
      const absDy = Math.abs(gesture.dy);
      return (absDy > 18 && absDy > absDx * 1.15) || (absDx > 24 && absDx > absDy * 1.15);
    },
    onPanResponderRelease: (_event, gesture) => {
      const absDx = Math.abs(gesture.dx);
      const absDy = Math.abs(gesture.dy);

      if ((gesture.dy < -56 || gesture.vy < -0.45) && absDy > absDx) {
        if (activeGroupIndex < groups.length - 1 && !advanceLockRef.current) {
          advanceLockRef.current = true;
          pendingStoryIndexRef.current = 0;
          setCurrentIndex(0);
          setProgressTime(0);
          setLoadedDuration(null);
          setIsHolding(false);
          setActiveGroupIndex((index) => Math.min(index + 1, groups.length - 1));
        }
        return;
      }

      if ((gesture.dy > 80 || gesture.vy > 0.6) && absDy > absDx) {
        safeBack(router, '/(tabs)/home');
        return;
      }

      if ((gesture.dx < -60 || gesture.vx < -0.45) && absDx > absDy) {
        goToNextStory();
        return;
      }

      if ((gesture.dx > 60 || gesture.vx > 0.45) && absDx > absDy) {
        goToPreviousStory();
      }
    },
  }), [activeGroupIndex, goToNextStory, goToPreviousStory, groups.length, isOverlayOpen, router]);

  return (
    <View style={styles.container}>
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
                requestToFirstFrameMs: timing.requestStartedAt ? timing.firstFrameAt - timing.requestStartedAt : null,
                sourceLoadToFirstFrameMs: timing.sourceLoadedAt ? timing.firstFrameAt - timing.sourceLoadedAt : null,
                bufferingMs: timing.bufferingMs,
                storyOpenToFirstFrameMs: timing.firstFrameAt - openedAt,
              });
            }
          }}
        />
      ) : isCurrentImage && currentStory?.mediaUri && !loadFailed ? (
        <Image
          source={{ uri: currentStory.mediaUri }}
          style={styles.media}
          contentFit="cover"
          contentPosition="center"
          transition={100}
          cachePolicy="memory-disk"
          onLoadStart={() => {
            if (__DEV__) console.log("[StoryPlaybackTiming] image-request-start", { storyId: currentStory.id, sinceOpenMs: Date.now() - openedAt });
          }}
          onLoad={() => {
            if (__DEV__) console.log("[StoryPlaybackTiming] image-loaded", { storyId: currentStory.id, sinceOpenMs: Date.now() - openedAt });
          }}
          onDisplay={() => {
            if (__DEV__) console.log("[StoryPlaybackTiming] image-displayed", { storyId: currentStory.id, sinceOpenMs: Date.now() - openedAt });
          }}
        />
      ) : isCurrentText && currentStory && !loadFailed ? (
        <StoryBackground background={currentStory.textBackground}>
          <Text style={styles.textStoryText}>{currentStory.textContent}</Text>
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
            right: 84,
            bottom: Math.max(insets.bottom + 112, 148),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.tapZone}
          delayLongPress={LONG_PRESS_DELAY_MS}
          onLongPress={pauseForHold}
          onPress={() => handlePressAction(goToPreviousStory)}
          onPressOut={resumeFromHold}
        />
        <Pressable
          style={styles.tapZone}
          delayLongPress={LONG_PRESS_DELAY_MS}
          onLongPress={pauseForHold}
          onPress={() => handlePressAction(goToNextStory)}
          onPressOut={resumeFromHold}
        />
      </View>

      <Pressable
        style={[styles.centerPlayButton, isLoadingStory && styles.centerPlayButtonDisabled]}
        delayLongPress={LONG_PRESS_DELAY_MS}
        onLongPress={pauseForHold}
        onPress={() => handlePressAction(togglePlay)}
        onPressOut={resumeFromHold}
        disabled={isLoadingStory}
        accessibilityLabel={isPlaying ? "Pause story" : "Play story"}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#FFFFFF" style={!isPlaying ? styles.playIcon : undefined} />
      </Pressable>

      <View style={[styles.topControls, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.topControlRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => safeBack(router, '/(tabs)/home')} activeOpacity={0.8}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.viewerTabs}>
            {(['discover', 'friends'] as StoryViewerTab[]).map((tab) => {
              const isActive = activeStoryTab === tab;

              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.viewerTab, isActive && styles.viewerTabActive]}
                  onPress={() => handleStoryTabPress(tab)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.viewerTabText, isActive && styles.viewerTabTextActive]}>
                    {tab === 'discover' ? 'Discover' : 'Friends'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.topRightSpacer} />
        </View>
      </View>

      <View style={styles.actionRail}>
        <PostInteractionBar
          vertical
          compact
          likesCount={interaction.reactionsCount}
          commentsCount={interaction.commentsCount}
          sharesCount={0}
          viewsCount={interaction.viewsCount}
          isLiked={interaction.isReacted}
          onLikePress={handleReactionPress}
          onCommentPress={() => openOverlay('comments')}
          onSharePress={() => openOverlay('share')}
          likeDisabled={!currentStory || isReactionSubmitting}
          commentDisabled={!currentStory}
          shareDisabled={!currentStory || isShareSubmitting}
          iconColor="#FFFFFF"
          countColor="#FFFFFF"
          actionStyle={styles.railAction}
        />
      </View>

      <View style={[styles.footer, { bottom: Math.max(insets.bottom + 16, 24) }]}>
        <View style={styles.footerAuthorRow}>
          <UserAvatar uri={currentStory?.authorAvatar ?? activeGroup?.authorAvatar} name={currentStory?.authorName ?? activeGroup?.title} size={38} />
          <View style={styles.authorBlock}>
            <View style={styles.authorRow}>
              <Text style={styles.title} numberOfLines={1}>{currentStory?.authorName ?? activeGroup?.title ?? title ?? "Story"}</Text>
              <Text style={styles.followingPill}>Following</Text>
              {currentStory?.isOwner ? (
                <TouchableOpacity onPress={handleMenu} style={styles.moreBtn} accessibilityLabel="Story options">
                  <Feather name="more-horizontal" size={21} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.metaText}>{formatExpiry(currentStory?.expiresAt)}</Text>
          </View>
        </View>
        {currentStory?.caption ? (
          <Text style={styles.captionText} numberOfLines={2}>{currentStory.caption}</Text>
        ) : null}
        <View style={styles.captionMetaRow}>
          {currentStory?.caption ? <Text style={styles.captionMoreText}>see more</Text> : <View />}
          {activeGroupIndex < groups.length - 1 ? <Text style={styles.swipeHint}>Swipe up</Text> : null}
        </View>
        <View style={styles.progressFooterRow}>
          <View style={styles.progressSegments}>
            {storyItems.map((story, index) => {
              const progress =
                index < currentIndex ? 1 :
                  index > currentIndex ? 0 :
                    currentTime / currentDuration;

              return (
                <View key={story.id} style={styles.segmentTrack}>
                  <View style={[styles.segmentFill, { width: `${Math.min(progress, 1) * 100}%` }]} />
                </View>
              );
            })}
          </View>
          <Text style={styles.durationText}>{Math.ceil(Math.max(currentDuration - currentTime, 0))}s</Text>
        </View>
      </View>

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
        shareUrl={currentStory ? `https://mooment.app/stories/${currentStory.id}` : undefined}
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
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  overlayTextWrap: {
    alignItems: "center",
    position: "absolute",
    width: 280,
  },
  overlayText: {
    fontSize: 30,
    lineHeight: 36,
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
  authorRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  moreBtn: { alignItems: 'center', height: 30, justifyContent: 'center', width: 34 },
  metaText: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '600', marginTop: 1 },
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
  swipeHint: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '700', textAlign: 'right' },
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

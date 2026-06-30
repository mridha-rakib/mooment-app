import { useEvent, useEventListener } from "expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, type AppStateStatus, Dimensions, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { markStoriesSeen } from "@/lib/storySeen";
import { safeBack } from "@/lib/navigation";
import type { StoryMediaType, StoryTextBackground, StoryTextOverlay } from "@/lib/stories";

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
};

const { width } = Dimensions.get("window");
const LONG_PRESS_DELAY_MS = 160;
const MIN_AUTO_ADVANCE_VISIBLE_MS = 400;

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
  const { mediaUri, stories, title, openedAt: openedAtParam } = useLocalSearchParams<{
    mediaUri?: string;
    stories?: string;
    title?: string;
    openedAt?: string;
  }>();
  const openedAtRef = useRef(Number(openedAtParam) || Date.now());
  const openedAt = openedAtRef.current;
  const viewerMountedAtRef = useRef(Date.now());
  const storyItems = useMemo(() => {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressTime, setProgressTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [isLoadingCurrentStory, setIsLoadingCurrentStory] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const [hasRenderedFirstFrame, setHasRenderedFirstFrame] = useState(false);
  const [activePlayerSlot, setActivePlayerSlot] = useState<0 | 1>(0);
  const advanceLockRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const autoPlayRequestedRef = useRef(false);
  const holdActivatedRef = useRef(false);
  const ignoreNextPressRef = useRef(false);
  const resumeAfterHoldRef = useRef(false);
  const resumeAfterAppStateRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const currentSourceUriRef = useRef<string | null>(null);
  const sourceReadyRef = useRef(false);
  const visibleStartedAtRef = useRef(0);
  const progressTimeRef = useRef(0);
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

  useEffect(() => {
    if (__DEV__) {
      console.log("[StoryPlaybackTiming] player-initialized", {
        initializeMs: Date.now() - viewerMountedAtRef.current,
        sinceOpenMs: Date.now() - openedAt,
      });
    }
  }, [openedAt]);
  const timeUpdate = useEvent(player, "timeUpdate", {
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    currentTime: 0,
  });
  const playingChange = useEvent(player, "playingChange", { isPlaying: player.playing });
  const statusChange = useEvent(player, "statusChange", { status: player.status });
  const isPlaying = isCurrentVideo ? (playingChange?.isPlaying ?? true) : !isHolding;
  const isLoadingStory = isCurrentVideo && !loadFailed && (
    !hasRenderedFirstFrame ||
    isLoadingCurrentStory ||
    (statusChange?.status === "loading" && !isPlaying)
  );
  const currentTime = Math.min(progressTime, currentDuration);

  useEffect(() => {
    progressTimeRef.current = progressTime;
  }, [progressTime]);

  useEffect(() => {
    if (!currentStory || !sourceReadyRef.current || !isCurrentVideo) {
      return;
    }

    setProgressTime(Math.min(Math.max(timeUpdate?.currentTime ?? 0, 0), currentDuration));
  }, [currentDuration, currentStory, isCurrentVideo, timeUpdate?.currentTime]);

  const goToNextStory = useCallback(() => {
    if (advanceLockRef.current) {
      return;
    }

    if (currentIndex >= storyItems.length - 1) {
      advanceLockRef.current = true;
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
  }, [activePlayerSlot, currentIndex, router, storyItems]);

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

    setProgressTime(0);
    try {
      player.currentTime = 0;
      player.play();
    } catch {
      player.pause();
    }
  }, [activePlayerSlot, currentIndex, player, storyItems]);

  useEffect(() => {
    const loadRequestId = loadRequestIdRef.current + 1;

    loadRequestIdRef.current = loadRequestId;
    advanceLockRef.current = false;
    holdActivatedRef.current = false;
    ignoreNextPressRef.current = false;
    resumeAfterHoldRef.current = false;
    setIsHolding(false);
    setProgressTime(0);
    setLoadedDuration(null);
    setLoadFailed(false);
    setSourceReady(false);
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

  useEventListener(player, "statusChange", ({ status, oldStatus }) => {
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
      statusChange?.status !== "readyToPlay" ||
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
  }, [currentStory?.mediaUri, isCurrentVideo, isLoadingStory, loadFailed, player, sourceReady, statusChange?.status]);

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
          resumeAfterAppStateRef.current = isPlaying;
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
  }, [currentDuration, currentStory, currentStory?.mediaUri, isCurrentVideo, isLoadingStory, isPlaying, loadFailed, player, sourceReady]);

  const togglePlay = useCallback(() => {
    if (!isCurrentVideo) {
      setIsHolding((holding) => !holding);
      return;
    }

    if (isLoadingStory || !currentStory?.mediaUri) {
      return;
    }

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [currentStory?.mediaUri, isCurrentVideo, isLoadingStory, isPlaying, player]);

  const pauseForHold = useCallback(() => {
    if (holdActivatedRef.current || isLoadingStory || (!currentStory?.mediaUri && isCurrentVideo)) {
      return;
    }

    holdActivatedRef.current = true;
    ignoreNextPressRef.current = true;
    resumeAfterHoldRef.current = isPlaying;
    setIsHolding(true);

    if (isCurrentVideo && isPlaying) {
      player.pause();
    }
  }, [currentStory?.mediaUri, isCurrentVideo, isLoadingStory, isPlaying, player]);

  const resumeFromHold = useCallback(() => {
    if (!holdActivatedRef.current) {
      return;
    }

    holdActivatedRef.current = false;
    setIsHolding(false);

    if (resumeAfterHoldRef.current && currentStory?.mediaUri && !isLoadingStory && isCurrentVideo) {
      player.play();
    }

    resumeAfterHoldRef.current = false;
  }, [currentStory?.mediaUri, isCurrentVideo, isLoadingStory, player]);

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

      <View style={styles.tapZones} pointerEvents="box-none">
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
        style={styles.centerTapZone}
        delayLongPress={LONG_PRESS_DELAY_MS}
        onLongPress={pauseForHold}
        onPress={() => handlePressAction(togglePlay)}
        onPressOut={resumeFromHold}
      />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
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

        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => safeBack(router, '/(tabs)/home')} activeOpacity={0.8}>
            <Feather name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{title || "Story"}</Text>
          <View style={styles.storyCountPill}>
            <Text style={styles.storyCountText}>{storyItems.length ? `${currentIndex + 1}/${storyItems.length}` : "0/0"}</Text>
          </View>
        </View>
      </View>

      {!isPlaying && !isHolding && (
        <View style={styles.playIndicator} pointerEvents="none">
          <Ionicons name="play" size={32} color="#FFFFFF" style={styles.playIcon} />
        </View>
      )}

      <View style={[styles.footer, { bottom: Math.max(insets.bottom + 16, 24) }]} pointerEvents="none">
        {currentStory?.caption ? (
          <Text style={styles.captionText} numberOfLines={3}>{currentStory.caption}</Text>
        ) : null}
        <Text style={styles.durationText}>{Math.ceil(currentDuration)}s</Text>
      </View>
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
  centerTapZone: {
    height: "60%",
    left: width * 0.25,
    position: "absolute",
    top: "20%",
    width: width * 0.5,
  },
  header: {
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
  },
  progressSegments: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
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
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconBtn: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    marginHorizontal: 12,
  },
  storyCountPill: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    minWidth: 44,
    paddingHorizontal: 8,
  },
  storyCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  playIndicator: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.24)",
    borderRadius: 35,
    height: 70,
    justifyContent: "center",
    left: "50%",
    marginLeft: -35,
    marginTop: -35,
    position: "absolute",
    top: "50%",
    width: 70,
  },
  playIcon: {
    marginLeft: 4,
  },
  footer: {
    bottom: Platform.OS === "ios" ? 30 : 24,
    left: 16,
    position: "absolute",
    right: 16,
  },
  captionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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

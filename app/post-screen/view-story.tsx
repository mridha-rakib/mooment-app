import { useEvent, useEventListener } from "expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { markStoriesSeen } from "@/lib/storySeen";

type StorySequenceItem = {
  id: string;
  mediaUri: string;
  durationSeconds: number;
  caption?: string | null;
  createdAt?: string;
};

const { width } = Dimensions.get("window");
const LONG_PRESS_DELAY_MS = 160;
const MIN_AUTO_ADVANCE_VISIBLE_MS = 400;

const parseStoryItems = (stories?: string, mediaUri?: string): StorySequenceItem[] => {
  if (stories) {
    try {
      const parsedStories = JSON.parse(stories) as StorySequenceItem[];

      return parsedStories.filter((story) => Boolean(story.mediaUri));
    } catch {
      return [];
    }
  }

  return mediaUri ? [{ id: "story", mediaUri, durationSeconds: 15 }] : [];
};

const getStoryVideoSource = (mediaUri?: string | null): VideoSource =>
  mediaUri ? { uri: mediaUri, useCaching: true } : null;

const getVideoSourceUri = (source: VideoSource) => {
  if (typeof source === "string") {
    return source;
  }

  return typeof source === "object" && source && "uri" in source ? source.uri : null;
};

function StoryPreloader({ mediaUri }: { mediaUri?: string | null }) {
  const player = useVideoPlayer(getStoryVideoSource(mediaUri), (player) => {
    player.loop = false;
    player.muted = true;
    player.timeUpdateEventInterval = 0;
  });

  useEffect(() => {
    player.muted = true;
    player.pause();
  }, [player]);

  return null;
}

export default function ViewStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mediaUri, stories, title } = useLocalSearchParams<{
    mediaUri?: string;
    stories?: string;
    title?: string;
  }>();
  const storyItems = useMemo(() => parseStoryItems(stories, mediaUri), [mediaUri, stories]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressTime, setProgressTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [isLoadingCurrentStory, setIsLoadingCurrentStory] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [sourceReady, setSourceReady] = useState(false);
  const advanceLockRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const holdActivatedRef = useRef(false);
  const ignoreNextPressRef = useRef(false);
  const resumeAfterHoldRef = useRef(false);
  const currentSourceUriRef = useRef<string | null>(null);
  const sourceReadyRef = useRef(false);
  const visibleStartedAtRef = useRef(0);
  const currentStory = storyItems[currentIndex];
  const nextStory = storyItems[currentIndex + 1];
  const currentDuration = Math.max(0.1, loadedDuration || currentStory?.durationSeconds || 15);

  const player = useVideoPlayer(null, (player) => {
    player.loop = false;
    player.timeUpdateEventInterval = 0.1;
    player.bufferOptions = {
      minBufferForPlayback: 0.25,
      preferredForwardBufferDuration: 4,
    };
  });
  const timeUpdate = useEvent(player, "timeUpdate", {
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    currentTime: 0,
  });
  const playingChange = useEvent(player, "playingChange", { isPlaying: true });
  const statusChange = useEvent(player, "statusChange", { status: player.status });
  const isPlaying = playingChange?.isPlaying ?? true;
  const isLoadingStory = isLoadingCurrentStory || statusChange?.status === "loading";
  const currentTime = Math.min(progressTime, currentDuration);

  useEffect(() => {
    if (!currentStory || !sourceReadyRef.current) {
      return;
    }

    setProgressTime(Math.min(Math.max(timeUpdate?.currentTime ?? 0, 0), currentDuration));
  }, [currentDuration, currentStory, timeUpdate?.currentTime]);

  const goToNextStory = useCallback(() => {
    if (advanceLockRef.current) {
      return;
    }

    if (currentIndex >= storyItems.length - 1) {
      advanceLockRef.current = true;
      router.back();
      return;
    }

    advanceLockRef.current = true;
    setProgressTime(0);
    setLoadedDuration(null);
    setCurrentIndex(currentIndex + 1);
  }, [currentIndex, router, storyItems.length]);

  const goToPreviousStory = useCallback(() => {
    if (advanceLockRef.current) {
      return;
    }

    if (currentIndex > 0) {
      advanceLockRef.current = true;
      setProgressTime(0);
      setLoadedDuration(null);
      setCurrentIndex(currentIndex - 1);
      return;
    }

    setProgressTime(0);
    try {
      player.currentTime = 0;
      player.play();
    } catch {
      player.pause();
    }
  }, [currentIndex, player]);

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
    sourceReadyRef.current = false;
    currentSourceUriRef.current = currentStory?.mediaUri ?? null;
    visibleStartedAtRef.current = Date.now();

    if (!currentStory?.mediaUri) {
      setIsLoadingCurrentStory(false);
      player.replace(null, true);
      currentSourceUriRef.current = null;
      return;
    }

    setIsLoadingCurrentStory(true);

    void player.replaceAsync(getStoryVideoSource(currentStory.mediaUri))
      .then(() => {
        if (loadRequestIdRef.current !== loadRequestId) {
          return;
        }

        player.currentTime = 0;
        setProgressTime(0);
        visibleStartedAtRef.current = Date.now();
        sourceReadyRef.current = true;
        setSourceReady(true);
        player.play();
      })
      .catch(() => {
        if (loadRequestIdRef.current === loadRequestId) {
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (loadRequestIdRef.current === loadRequestId) {
          setIsLoadingCurrentStory(false);
        }
      });
  }, [currentStory?.id, currentStory?.mediaUri, player]);

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
  });

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
    if (!isPlaying || isLoadingStory || !sourceReady || !currentStory) {
      return;
    }

    if (Date.now() - visibleStartedAtRef.current < MIN_AUTO_ADVANCE_VISIBLE_MS) {
      return;
    }

    if (currentTime >= currentDuration - 0.15) {
      goToNextStory();
    }
  }, [currentDuration, currentStory, currentTime, goToNextStory, isLoadingStory, isPlaying, sourceReady]);

  const togglePlay = useCallback(() => {
    if (isLoadingStory || !currentStory?.mediaUri) {
      return;
    }

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [currentStory?.mediaUri, isLoadingStory, isPlaying, player]);

  const pauseForHold = useCallback(() => {
    if (holdActivatedRef.current || isLoadingStory || !currentStory?.mediaUri) {
      return;
    }

    holdActivatedRef.current = true;
    ignoreNextPressRef.current = true;
    resumeAfterHoldRef.current = isPlaying;
    setIsHolding(true);

    if (isPlaying) {
      player.pause();
    }
  }, [currentStory?.mediaUri, isLoadingStory, isPlaying, player]);

  const resumeFromHold = useCallback(() => {
    if (!holdActivatedRef.current) {
      return;
    }

    holdActivatedRef.current = false;
    setIsHolding(false);

    if (resumeAfterHoldRef.current && currentStory?.mediaUri && !isLoadingStory) {
      player.play();
    }

    resumeAfterHoldRef.current = false;
  }, [currentStory?.mediaUri, isLoadingStory, player]);

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
      {currentStory?.mediaUri && !loadFailed ? (
        <VideoView
          style={styles.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
          useExoShutter={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Story video unavailable</Text>
        </View>
      )}
      <StoryPreloader mediaUri={nextStory?.mediaUri} />

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
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
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

      <View style={styles.footer} pointerEvents="none">
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
  video: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
    width: "100%",
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
});

import { Feather, Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView,
  useVideoPlayer,
  type VideoSourceObject } from 'expo-video';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, LayoutChangeEvent, Modal, NativeScrollEvent, NativeSyntheticEvent, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { classifyFeedVideoPlaybackError, isStaleFeedVideoGeneration, shouldRunFeedVideoTimeUpdates, shouldShowFeedVideoRetry, type FeedVideoPlaybackFailure } from '@/lib/feedVideoPlayback';
import { clampFeedVideoSeekTarget, commitFeedVideoSeek, getFeedVideoSeekTargetFromLocation } from '@/lib/feedVideoSeek';
import { retryMomentVideoProcessing, toggleMomentReaction, toggleMomentSave, type MomentInteractionSummary } from '@/lib/moments';
import { navigateToProfile } from '@/lib/profileNavigation';
import { blockUser, followUser, unfollowUser } from '@/lib/users';
import { useAuthStore } from '@/stores/authStore';
import FullScreenMediaModal from '../modals/FullScreenMediaModal';
import ReportDetailsModal from '../modals/ReportDetailsModal';
import ReportModal from '../modals/ReportModal';
import UserAvatar from '../ui/UserAvatar';
import MoreMenuModal from "./MoreMenuModal";
import HashtagText from './HashtagText';
import PostInteractionBar from './PostInteractionBar';
import { buttonBackground, buttonForeground } from "@/lib/buttonTheme";
// Hardcoded visual waveform for Audio posts
const WAVEFORM_HEIGHTS = [14, 22, 10, 35, 26, 40, 16, 45, 30, 18, 42, 28, 12, 38, 22, 16, 32, 24, 14, 28, 36, 18, 12, 30, 42, 24, 16, 38, 28, 14, 45, 20, 12, 32, 24, 18, 10, 26, 14, 10];
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const MOMENT_VIDEO_CONTROL_HIDE_MS = 3000;
const MOMENT_VIDEO_AUTOPLAY_RETRY_LIMIT = 4;
const momentVideoPositions = new Map<string, number>();
let momentVideoSessionMuted = true;
const momentVideoMuteListeners = new Set<(muted: boolean) => void>();

const setMomentVideoSessionMuted = (muted: boolean) => {
  momentVideoSessionMuted = muted;
  momentVideoMuteListeners.forEach((listener) => listener(muted));
};

const formatVideoSeconds = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const redactFeedVideoUri = (uri: string) => {
  let hash = 0;

  for (let index = 0; index < uri.length; index += 1) {
    hash = ((hash << 5) - hash + uri.charCodeAt(index)) | 0;
  }

  return `media-${Math.abs(hash).toString(36)}`;
};

const logFeedVideoDebug = (event: string, uri: string, extra?: Record<string, unknown>) => {
  if (!__DEV__) {
    return;
  }

  console.log('[FeedVideo]', {
    event,
    mediaId: redactFeedVideoUri(uri),
    ...extra,
  });
};

export type PostContextNode = {
  text: string;
  type: 'bold' | 'muted';
  taggedUser?: {
    id?: string | null;
    name?: string | null;
    avatar?: string | null;
    isFollowing?: boolean;
  };
  taggedEvent?: {
    id?: string | null;
  };
};

export type AudioDetails = {
  uri?: string;
  duration: string;
  currentTime: string;
};

export type EventDetails = {
  isLive?: boolean;
  tags?: { label: string; bg?: string; color?: string }[];
  title?: string;
  datetime?: string;
  distance?: string;
  attendeesAvatars?: string[];
  attendeesCount?: number;
  priceLabel?: string;
};

export type ProductDetails = {
  title: string;
  price: string;
  buttonText: string;
};

export type MediaDisplayCrop = {
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

// Mirrors the backend's momentMediaProcessingStatuses / *ErrorCodes (see
// xenog-api src/modules/moments/moment.interface.ts). Absent (undefined) on
// legacy video media items and on non-video media — always optional, never
// assumed present, so legacy posts keep their exact current behavior.
export type PostMediaProcessingStatus = 'queued' | 'processing' | 'ready' | 'failed';
export type PostMediaProcessingErrorCode =
  | 'source_invalid'
  | 'source_too_large'
  | 'encode_failed'
  | 'storage_failed'
  | 'timeout'
  | 'unknown';

export type PostMediaItem = {
  uri: string;
  fullUri?: string | null;
  type: 'image' | 'video';
  displayCrop?: MediaDisplayCrop | null;
  processingStatus?: PostMediaProcessingStatus | null;
  processingErrorCode?: PostMediaProcessingErrorCode | null;
};

export type PostData = {
  id: string;
  createdAt?: string;
  eventId?: string;
  postType: 'standard' | 'audio' | 'event' | 'product';
  authorId?: string;
  authorName: string;
  authorContextNodes?: PostContextNode[];
  authorAvatar?: string | null;
  isFollowing?: boolean;
  timeAgo: string;
  caption?: string;
  hashtags?: string[];
  mediaUris?: string[];
  mediaItems?: PostMediaItem[];
  ticketsCount?: number;
  likedBy?: string;
  headerLabel?: string;
  repostCaption?: string | null;
  repostTaggedFriendNames?: string[];
  isPublic?: boolean;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  eventDetails?: EventDetails;
  audioDetails?: AudioDetails;
  productDetails?: ProductDetails;
  isExpandable?: boolean;
  isLiked?: boolean;
  isSaved?: boolean;
};

const VideoFeedMedia = React.memo(function VideoFeedMedia({ uri, isActive }: { uri: string; isActive: boolean }) {
  const isScreenFocused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const isPlaybackActive = isActive && isScreenFocused;
  const videoSource = useMemo<VideoSourceObject>(() => ({
    uri,
    useCaching: true,
  }), [uri]);
  const player = useVideoPlayer(videoSource, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = momentVideoSessionMuted;
    videoPlayer.timeUpdateEventInterval = 0;
  });
  const wasActiveRef = useRef(false);
  // `useVideoPlayer` loads (and starts buffering) the source the instant the
  // player is created, regardless of `isActive` — an off-screen/inactive
  // card left mounted (FlatList windowing keeps several around) would
  // otherwise keep a live ExoPlayer buffering forever. This ref tracks
  // whether the native player currently holds a loaded source, so the
  // isPlaybackActive effect below can release it (replace the source with
  // null) the moment a card goes inactive — including immediately after an
  // off-screen mount — and reload it only once the card is actually active
  // again, reusing the exact same reload+seek-restore path as manual retry.
  const sourceLoadedRef = useRef(true);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressWidthRef = useRef(0);
  const mediaUriRef = useRef(uri);
  const mediaGenerationRef = useRef(0);
  const initialCurrentTime = useRef(momentVideoPositions.get(uri) ?? 0).current;
  const currentTimeValueRef = useRef(initialCurrentTime);
  const durationValueRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isPlaybackActiveRef = useRef(isPlaybackActive);
  const isScreenFocusedRef = useRef(isScreenFocused);
  const appStateRef = useRef(appState);
  const playbackRateRef = useRef(1);
  const playbackFailureRef = useRef<FeedVideoPlaybackFailure | null>(null);
  const playAttemptInFlightRef = useRef(false);
  const recoveryInFlightRef = useRef(false);
  const [isSessionMuted, setIsSessionMuted] = useState(momentVideoSessionMuted);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(initialCurrentTime);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState(player.status);
  const [hasRequestedPlayback, setHasRequestedPlayback] = useState(false);
  const [playbackFailure, setPlaybackFailureState] = useState<FeedVideoPlaybackFailure | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const setPlaybackFailure = useCallback((failure: FeedVideoPlaybackFailure | null) => {
    playbackFailureRef.current = failure;
    setPlaybackFailureState(failure);
  }, []);

  const clearRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const clearHideControls = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  }, []);

  const isCurrentGeneration = useCallback((generation: number) => (
    !isStaleFeedVideoGeneration(generation, mediaGenerationRef.current) &&
    mediaUriRef.current === uri
  ), [uri]);

  const saveCurrentPosition = useCallback(() => {
    const nextCurrentTime = Number.isFinite(player.currentTime) && player.currentTime > 0
      ? player.currentTime
      : currentTimeValueRef.current;

    if (nextCurrentTime > 0) {
      momentVideoPositions.set(uri, nextCurrentTime);
    }
  }, [player, uri]);

  const applyPlayerSessionState = useCallback(() => {
    player.loop = true;
    player.muted = momentVideoSessionMuted;
    player.playbackRate = playbackRateRef.current;
    player.timeUpdateEventInterval = shouldRunFeedVideoTimeUpdates(isActive, isScreenFocused, appState) ? 0.25 : 0;
  }, [appState, isActive, isScreenFocused, player]);

  const tryPlay = useCallback(async (options?: {
    allowErrorRecovery?: boolean;
    generation?: number;
    reason?: string;
  }) => {
    const generation = options?.generation ?? mediaGenerationRef.current;

    if (
      !isCurrentGeneration(generation) ||
      !isPlaybackActiveRef.current ||
      appStateRef.current !== 'active' ||
      (recoveryInFlightRef.current && !options?.allowErrorRecovery) ||
      playAttemptInFlightRef.current ||
      (playbackFailureRef.current && !options?.allowErrorRecovery)
    ) {
      return;
    }

    playAttemptInFlightRef.current = true;
    setHasRequestedPlayback(true);

    try {
      applyPlayerSessionState();

      if (!momentVideoSessionMuted) {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'doNotMix',
        });
      }

      if (!isCurrentGeneration(generation) || !isPlaybackActiveRef.current || appStateRef.current !== 'active') {
        return;
      }

      player.play();
      retryCountRef.current = 0;
      logFeedVideoDebug('autoplay.play', uri, { generation, reason: options?.reason ?? 'active' });
    } catch (error) {
      if (!isCurrentGeneration(generation)) {
        return;
      }

      if (retryCountRef.current >= MOMENT_VIDEO_AUTOPLAY_RETRY_LIMIT) {
        const failure = classifyFeedVideoPlaybackError(error instanceof Error ? error.message : undefined);
        setPlaybackFailure(failure);
        setStatus('error');
        logFeedVideoDebug('autoplay.failed', uri, { generation, kind: failure.kind });
        return;
      }

      retryCountRef.current += 1;
      clearRetry();
      retryTimeoutRef.current = setTimeout(() => {
        if (
          isCurrentGeneration(generation) &&
          isPlaybackActiveRef.current &&
          appStateRef.current === 'active' &&
          !playbackFailureRef.current
        ) {
          void tryPlay({ generation, reason: 'bounded-retry' });
        }
      }, 300);
      logFeedVideoDebug('autoplay.retry_scheduled', uri, { generation, retry: retryCountRef.current });
    } finally {
      playAttemptInFlightRef.current = false;
    }
  }, [applyPlayerSessionState, clearRetry, isCurrentGeneration, player, setPlaybackFailure, uri]);

  const scheduleHideControls = useCallback((options?: { isDragging?: boolean }) => {
    clearHideControls();

    const dragging = options?.isDragging ?? isDragging;

    if (!controlsVisible || dragging || settingsVisible || isFullscreen) {
      return;
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, MOMENT_VIDEO_CONTROL_HIDE_MS);
  }, [clearHideControls, controlsVisible, isDragging, isFullscreen, settingsVisible]);

  const previewSeekPosition = useCallback((locationX: number) => {
    const width = progressWidthRef.current;
    const nextTime = getFeedVideoSeekTargetFromLocation(locationX, width, duration);

    if (nextTime == null) {
      return null;
    }

    currentTimeValueRef.current = nextTime;
    setCurrentTime(nextTime);
    momentVideoPositions.set(uri, nextTime);
    return nextTime;
  }, [duration, uri]);

  const commitSeekPosition = useCallback((targetSeconds: number | null) => {
    if (targetSeconds == null) {
      return false;
    }

    const result = commitFeedVideoSeek({
      player,
      targetSeconds,
      durationSeconds: duration,
      expectedMediaId: uri,
      currentMediaId: mediaUriRef.current,
      keepPlaying: isPlaybackActive,
      onError: (error) => {
        logFeedVideoDebug('seek.failed', uri, {
          mediaChanged: mediaUriRef.current !== uri,
          message: error instanceof Error ? error.message : 'Unknown seek error',
        });
      },
    });

    if (result.ok) {
      currentTimeValueRef.current = result.targetSeconds;
      setCurrentTime(result.targetSeconds);
      momentVideoPositions.set(uri, result.targetSeconds);
      return true;
    }

    return false;
  }, [duration, isPlaybackActive, player, uri]);

  const commitSeekFromLocation = useCallback((locationX: number) => {
    const nextTime = previewSeekPosition(locationX);
    return commitSeekPosition(nextTime);
  }, [commitSeekPosition, previewSeekPosition]);

  const progressPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      isDraggingRef.current = true;
      setIsDragging(true);
      clearHideControls();
      previewSeekPosition(event.nativeEvent.locationX);
    },
    onPanResponderMove: (event) => {
      previewSeekPosition(event.nativeEvent.locationX);
    },
    onPanResponderRelease: (event) => {
      commitSeekFromLocation(event.nativeEvent.locationX);
      isDraggingRef.current = false;
      setIsDragging(false);
      scheduleHideControls({ isDragging: false });
    },
    onPanResponderTerminate: () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      scheduleHideControls({ isDragging: false });
    },
  }), [clearHideControls, commitSeekFromLocation, previewSeekPosition, scheduleHideControls]);

  const handleManualRetry = useCallback(async () => {
    const generation = mediaGenerationRef.current;

    clearRetry();
    retryCountRef.current = 0;
    setPlaybackFailure(null);
    setStatus('loading');
    setIsRecovering(true);
    recoveryInFlightRef.current = true;
    saveCurrentPosition();
    logFeedVideoDebug('retry.start', uri, { generation });

    const restorePosition = currentTimeValueRef.current;

    try {
      try {
        player.pause();
      } catch {
        // Ignore pause failures during native player teardown.
      }

      await player.replaceAsync(videoSource);
      sourceLoadedRef.current = true;

      if (!isCurrentGeneration(generation)) {
        return;
      }

      applyPlayerSessionState();
      durationValueRef.current = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : durationValueRef.current;
      setDuration(durationValueRef.current);

      if (restorePosition > 0) {
        const result = commitFeedVideoSeek({
          player,
          targetSeconds: restorePosition,
          durationSeconds: durationValueRef.current || restorePosition,
          expectedMediaId: uri,
          currentMediaId: mediaUriRef.current,
          keepPlaying: false,
        });

        if (result.ok) {
          currentTimeValueRef.current = result.targetSeconds;
          setCurrentTime(result.targetSeconds);
        }
      }

      setStatus(player.status === 'error' ? 'loading' : player.status);
      logFeedVideoDebug('retry.source_reloaded', uri, { generation });

      if (isPlaybackActiveRef.current && appStateRef.current === 'active') {
        await tryPlay({ allowErrorRecovery: true, generation, reason: 'manual-retry' });
      }
    } catch (error) {
      if (isCurrentGeneration(generation)) {
        const failure = classifyFeedVideoPlaybackError(error instanceof Error ? error.message : undefined);
        setPlaybackFailure(failure);
        setStatus('error');
        logFeedVideoDebug('retry.failed', uri, { generation, kind: failure.kind });
      }
    } finally {
      if (isCurrentGeneration(generation)) {
        recoveryInFlightRef.current = false;
        setIsRecovering(false);
      }
    }
  }, [applyPlayerSessionState, clearRetry, isCurrentGeneration, player, saveCurrentPosition, setPlaybackFailure, tryPlay, uri, videoSource]);

  useEffect(() => {
    isPlaybackActiveRef.current = isPlaybackActive;
    isScreenFocusedRef.current = isScreenFocused;
    appStateRef.current = appState;
    playbackRateRef.current = playbackRate;
    isDraggingRef.current = isDragging;
  }, [appState, isDragging, isPlaybackActive, isScreenFocused, playbackRate]);

  useEffect(() => {
    applyPlayerSessionState();
  }, [applyPlayerSessionState]);

  useEventListener(player, 'statusChange', ({ status: nextStatus, error }) => {
    const generation = mediaGenerationRef.current;

    if (!isCurrentGeneration(generation)) {
      return;
    }

    setStatus((current) => (current === nextStatus ? current : nextStatus));

    if (nextStatus === 'error') {
      const failure = classifyFeedVideoPlaybackError(error?.message);
      setPlaybackFailure(failure);
      clearRetry();
      logFeedVideoDebug('status.error', uri, { generation, kind: failure.kind });
      return;
    }

    if (nextStatus === 'readyToPlay') {
      const nextDuration = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : durationValueRef.current;
      durationValueRef.current = nextDuration;
      setDuration((current) => (Math.abs(current - nextDuration) > 0.05 ? nextDuration : current));

      if (hasRequestedPlayback && !playbackFailureRef.current && isPlaybackActiveRef.current && appStateRef.current === 'active') {
        void tryPlay({ generation, reason: 'ready' });
      }
    }
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    logFeedVideoDebug('playing.change', uri, {
      generation: mediaGenerationRef.current,
      isPlaying,
    });
  });

  useEventListener(player, 'sourceLoad', ({ duration: loadedDuration }) => {
    const generation = mediaGenerationRef.current;

    if (!isCurrentGeneration(generation)) {
      return;
    }

    const nextDuration = Number.isFinite(loadedDuration) && loadedDuration > 0 ? loadedDuration : 0;
    durationValueRef.current = nextDuration;
    setDuration(nextDuration);
    logFeedVideoDebug('source.loaded', uri, { generation, duration: nextDuration });

    if (hasRequestedPlayback && !playbackFailureRef.current && isPlaybackActiveRef.current && appStateRef.current === 'active') {
      void tryPlay({ generation, reason: 'source-loaded' });
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime: nextCurrentTime, bufferedPosition }) => {
    if (!shouldRunFeedVideoTimeUpdates(isActive, isScreenFocusedRef.current, appStateRef.current)) {
      return;
    }

    const safeCurrentTime = Number.isFinite(nextCurrentTime) && nextCurrentTime >= 0
      ? Math.min(nextCurrentTime, durationValueRef.current || nextCurrentTime)
      : 0;

    if (!isDraggingRef.current && Math.abs(currentTimeValueRef.current - safeCurrentTime) >= 0.05) {
      currentTimeValueRef.current = safeCurrentTime;
      setCurrentTime(safeCurrentTime);
    }

    if (safeCurrentTime > 0) {
      momentVideoPositions.set(uri, safeCurrentTime);
    }

    if (bufferedPosition > 0 && Math.abs(durationValueRef.current - player.duration) > 0.05 && Number.isFinite(player.duration)) {
      const nextDuration = player.duration > 0 ? player.duration : durationValueRef.current;
      durationValueRef.current = nextDuration;
      setDuration(nextDuration);
    }
  });

  useEffect(() => {
    const listener = (muted: boolean) => {
      setIsSessionMuted(muted);
      player.muted = muted;
    };

    momentVideoMuteListeners.add(listener);
    return () => {
      momentVideoMuteListeners.delete(listener);
    };
  }, [player]);

  useEffect(() => {
    player.playbackRate = playbackRate;
    playbackRateRef.current = playbackRate;
  }, [playbackRate, player]);

  useEffect(() => {
    mediaGenerationRef.current += 1;
    const generation = mediaGenerationRef.current;
    mediaUriRef.current = uri;
    playbackFailureRef.current = null;
    setPlaybackFailureState(null);
    clearRetry();
    retryCountRef.current = 0;
    playAttemptInFlightRef.current = false;
    recoveryInFlightRef.current = false;
    setIsRecovering(false);
    applyPlayerSessionState();

    const savedPosition = momentVideoPositions.get(uri);

    if (savedPosition && Number.isFinite(savedPosition)) {
      const restoreDuration = Number.isFinite(player.duration) && player.duration > 0
        ? player.duration
        : savedPosition;
      const result = commitFeedVideoSeek({
        player,
        targetSeconds: savedPosition,
        durationSeconds: restoreDuration,
        expectedMediaId: uri,
        currentMediaId: mediaUriRef.current,
        keepPlaying: false,
        onError: (error) => {
          logFeedVideoDebug('restore.failed', uri, {
            mediaChanged: mediaUriRef.current !== uri,
            message: error instanceof Error ? error.message : 'Unknown seek error',
          });
        },
      });

      if (result.ok) {
        currentTimeValueRef.current = result.targetSeconds;
        setCurrentTime(result.targetSeconds);
      }
    } else {
      currentTimeValueRef.current = 0;
      setCurrentTime(0);
    }

    durationValueRef.current = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : 0;
    setDuration(durationValueRef.current);
    setStatus(player.status);
    logFeedVideoDebug('source.attached', uri, { generation });
  }, [applyPlayerSessionState, clearRetry, player, uri]);

  useEffect(() => {
    if (isPlaybackActive) {
      if (!wasActiveRef.current) {
        retryCountRef.current = 0;
        logFeedVideoDebug('active.enter', uri, { generation: mediaGenerationRef.current });
      }

      if (!playbackFailureRef.current) {
        if (sourceLoadedRef.current) {
          void tryPlay({ generation: mediaGenerationRef.current, reason: 'active' });
        } else {
          // The source was released while this card was off-screen (see the
          // else-branch below) — reload it via the exact same
          // reload+seek-restore+resume path manual retry already uses, then
          // let it resume play once loaded.
          void handleManualRetry();
        }
      }
    } else {
      if (wasActiveRef.current) {
        saveCurrentPosition();
        try {
          player.pause();
        } catch {
          // Ignore pause failures during native player teardown.
        }
        logFeedVideoDebug('pause.inactive', uri, { generation: mediaGenerationRef.current });
      }

      // Not gated on wasActiveRef: a card can mount already off-screen
      // (FlatList renders a window of items around the viewport), and its
      // player has already started loading/buffering the instant
      // useVideoPlayer created it — that must be released too, not just a
      // card that was previously playing and became inactive.
      if (sourceLoadedRef.current) {
        sourceLoadedRef.current = false;
        void player.replaceAsync(null).catch(() => {
          // Ignore release failures during native player teardown.
        });
        logFeedVideoDebug('source.released', uri, { generation: mediaGenerationRef.current });
      }

      clearRetry();
      setHasRequestedPlayback(false);
      setControlsVisible(false);
      setSettingsVisible(false);
      setIsFullscreen(false);
    }

    wasActiveRef.current = isPlaybackActive;
  }, [clearRetry, handleManualRetry, isPlaybackActive, player, saveCurrentPosition, tryPlay, uri]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      setAppState(nextState);

      if (nextState !== 'active') {
        clearRetry();
        saveCurrentPosition();
        try {
          player.pause();
        } catch {
          // Ignore pause failures during native player teardown.
        }
        logFeedVideoDebug('pause.app_state', uri, { appState: nextState, generation: mediaGenerationRef.current });
        return;
      }

      if (isPlaybackActiveRef.current && !playbackFailureRef.current) {
        void tryPlay({ generation: mediaGenerationRef.current, reason: 'app-active' });
      }
    });

    return () => subscription.remove();
  }, [clearRetry, player, saveCurrentPosition, tryPlay, uri]);

  useEffect(() => {
    scheduleHideControls();
    return clearHideControls;
  }, [clearHideControls, scheduleHideControls]);

  useEffect(() => () => {
    mediaGenerationRef.current += 1;
    clearRetry();
    clearHideControls();
    try {
      player.timeUpdateEventInterval = 0;
      player.pause();
    } catch {
      // Ignore cleanup failures during native player teardown.
    }
    logFeedVideoDebug('unmount', uri, { generation: mediaGenerationRef.current });
  }, [clearHideControls, clearRetry, player, uri]);

  const handleToggleControls = () => {
    setControlsVisible((visible) => !visible);
  };

  const handleToggleMute = async () => {
    const nextMuted = !momentVideoSessionMuted;
    setMomentVideoSessionMuted(nextMuted);
    player.muted = nextMuted;

    if (!nextMuted && isPlaybackActive) {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionMode: 'doNotMix',
      });
      void tryPlay();
    }
  };

  const handleProgressAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    const step = 5;
    const base = currentTimeValueRef.current;
    const target = event.nativeEvent.actionName === 'increment'
      ? base + step
      : event.nativeEvent.actionName === 'decrement'
        ? base - step
        : null;

    if (target == null) {
      return;
    }

    commitSeekPosition(clampFeedVideoSeekTarget(target, duration));
    scheduleHideControls();
  };

  const renderControls = (fullscreen = false) => {
    const safeDuration = duration > 0 ? duration : 0;
    const progress = safeDuration > 0 ? Math.min(1, Math.max(0, currentTime / safeDuration)) : 0;

    return (
      <>
        <TouchableOpacity
          style={[styles.videoMuteButton, !controlsVisible && styles.videoMuteButtonCollapsed]}
          activeOpacity={0.85}
          onPress={() => void handleToggleMute()}
          accessibilityLabel={isSessionMuted ? 'Unmute video' : 'Mute video'}
        >
          <Feather name={isSessionMuted ? 'volume-x' : 'volume-2'} size={18} color="#FFFFFF" />
        </TouchableOpacity>
        {controlsVisible ? (
          <View style={[styles.videoControls, fullscreen && styles.videoControlsFullscreen]}>
            <View
              style={styles.videoProgressTrack}
              hitSlop={{ top: 12, bottom: 12, left: 4, right: 4 }}
              onLayout={(event) => {
                progressWidthRef.current = event.nativeEvent.layout.width;
              }}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Video progress"
              accessibilityValue={{
                min: 0,
                max: Math.round(safeDuration),
                now: Math.round(currentTime),
                text: `${formatVideoSeconds(currentTime)} of ${formatVideoSeconds(safeDuration)}`,
              }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={handleProgressAccessibilityAction}
              {...progressPanResponder.panHandlers}
            >
              <View style={styles.videoProgressTrackLine} />
              <View style={[styles.videoProgressFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.videoProgressThumb, { left: `${progress * 100}%` }]} />
            </View>
            <View style={styles.videoControlsRow}>
              <Text style={styles.videoTimeText}>{formatVideoSeconds(currentTime)}</Text>
              <Text style={styles.videoTimeText}>{formatVideoSeconds(safeDuration)}</Text>
              <View style={styles.videoControlActions}>
                <TouchableOpacity
                  style={styles.videoIconButton}
                  activeOpacity={0.85}
                  onPress={() => setSettingsVisible((visible) => !visible)}
                  accessibilityLabel="Video playback speed"
                >
                  <Feather name="settings" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.videoIconButton}
                  activeOpacity={0.85}
                  onPress={() => setIsFullscreen(fullscreen ? false : true)}
                  accessibilityLabel={fullscreen ? 'Close video fullscreen' : 'Open video fullscreen'}
                >
                  <Feather name={fullscreen ? 'minimize' : 'maximize'} size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            {settingsVisible ? (
              <View style={styles.videoSettingsMenu}>
                {[0.5, 1, 1.5, 2].map((speed) => (
                  <TouchableOpacity
                    key={speed}
                    style={[styles.videoSpeedOption, playbackRate === speed && styles.videoSpeedOptionActive]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setPlaybackRate(speed);
                      setSettingsVisible(false);
                    }}
                  >
                    <Text style={styles.videoSpeedText}>{speed}x</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </>
    );
  };

  const showRetry = shouldShowFeedVideoRetry(status, playbackFailure);
  const isLoading = isPlaybackActive && !showRetry && (
    isRecovering ||
    status === 'loading' ||
    (hasRequestedPlayback && status !== 'readyToPlay' && status !== 'error')
  );
  const progressUriKey = `${uri}-fullscreen`;

  return (
    <View style={styles.videoMediaFrame}>
      <TouchableOpacity style={styles.videoTapLayer} activeOpacity={1} onPress={handleToggleControls}>
        <VideoView
          player={player}
          style={styles.postImage}
          nativeControls={false}
          contentFit="cover"
        />
        {isLoading ? (
          <View style={styles.videoStateOverlay} pointerEvents="none">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}
        {showRetry ? (
          <View style={styles.videoStateOverlay}>
            <Text style={styles.videoErrorText}>Video could not be played.</Text>
            <TouchableOpacity style={styles.videoRetryButton} activeOpacity={0.85} onPress={() => void handleManualRetry()}>
              <Text style={styles.videoRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {renderControls()}
      </TouchableOpacity>
      <Modal
        visible={isFullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.videoFullscreenRoot}>
          <TouchableOpacity style={styles.videoFullscreenClose} activeOpacity={0.85} onPress={() => setIsFullscreen(false)}>
            <Feather name="x" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity key={progressUriKey} style={styles.videoFullscreenTapLayer} activeOpacity={1} onPress={handleToggleControls}>
            <VideoView
              player={player}
              style={styles.videoFullscreenPlayer}
              nativeControls={false}
              contentFit="contain"
            />
            {renderControls(true)}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
});

// Renders inside the exact same `videoMediaFrame` layout the real video
// player uses (same size, same placement), so the surrounding card never
// resizes or shifts when a video is not yet playable. Never mounts
// VideoView/useVideoPlayer — no video initialization or playback is
// attempted for queued/processing/failed media.
const VideoProcessingPlaceholder = React.memo(function VideoProcessingPlaceholder({
  status,
  canRetry,
  isRetrying,
  onRetry,
}: {
  status: 'queued' | 'processing' | 'failed';
  canRetry: boolean;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <View style={styles.videoMediaFrame}>
      <View style={styles.videoStateOverlay}>
        {status === 'queued' ? (
          <>
            <Feather name="clock" size={22} color="#FFFFFF" style={styles.videoProcessingIcon} />
            <Text style={styles.videoErrorText}>Video queued for processing</Text>
          </>
        ) : null}
        {status === 'processing' ? (
          <>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={[styles.videoErrorText, styles.videoProcessingTextSpacing]}>Processing video</Text>
          </>
        ) : null}
        {status === 'failed' ? (
          <>
            <Feather name="alert-circle" size={22} color="#FFFFFF" style={styles.videoProcessingIcon} />
            <Text style={styles.videoErrorText}>This video couldn&apos;t be processed.</Text>
            {canRetry ? (
              <TouchableOpacity
                style={styles.videoRetryButton}
                activeOpacity={0.85}
                disabled={isRetrying}
                onPress={onRetry}
                accessibilityRole="button"
                accessibilityLabel="Retry video processing"
              >
                <Text style={styles.videoRetryText}>{isRetrying ? 'Retrying…' : 'Retry'}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
});

function CroppedFeedImage({ item, frameWidth, frameHeight = 340 }: { item: PostMediaItem; frameWidth: number; frameHeight?: number }) {
  const [imageSize, setImageSize] = useState(() => ({
    width: item.displayCrop?.imageWidth ?? 0,
    height: item.displayCrop?.imageHeight ?? 0,
  }));
  const crop = item.displayCrop?.crop;

  useEffect(() => {
    if (imageSize.width > 0 && imageSize.height > 0) {
      return;
    }

    Image.getSize(
      item.uri,
      (resolvedWidth, resolvedHeight) => {
        setImageSize({ width: resolvedWidth, height: resolvedHeight });
      },
      () => {
        setImageSize({ width: 0, height: 0 });
      },
    );
  }, [imageSize.height, imageSize.width, item.uri]);

  useEffect(() => {
    setImageSize({
      width: item.displayCrop?.imageWidth ?? 0,
      height: item.displayCrop?.imageHeight ?? 0,
    });
  }, [item.displayCrop?.imageHeight, item.displayCrop?.imageWidth, item.uri]);

  if (!crop || !imageSize.width || !imageSize.height) {
    return (
      <ExpoImage
        source={{ uri: item.uri }}
        style={[styles.postImage, { width: frameWidth }]}
        contentFit="cover"
        cachePolicy="disk"
        recyclingKey={item.uri}
      />
    );
  }

  const cropPixelWidth = Math.max(crop.width * imageSize.width, 1);
  const cropPixelHeight = Math.max(crop.height * imageSize.height, 1);
  const scale = Math.min(frameWidth / cropPixelWidth, frameHeight / cropPixelHeight);
  const renderedWidth = imageSize.width * scale;
  const renderedHeight = imageSize.height * scale;
  const left = (frameWidth - cropPixelWidth * scale) / 2 - crop.x * imageSize.width * scale;
  const top = (frameHeight - cropPixelHeight * scale) / 2 - crop.y * imageSize.height * scale;

  return (
    <View style={styles.croppedImageFrame}>
      <ExpoImage
        source={{ uri: item.uri }}
        style={[
          styles.croppedImage,
          {
            width: renderedWidth,
            height: renderedHeight,
            left,
            top,
          },
        ]}
        contentFit="fill"
        cachePolicy="disk"
        recyclingKey={item.uri}
      />
    </View>
  );
}

const formatAudioSeconds = (seconds?: number) => {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

function AudioFeedPlayer({ details }: { details: AudioDetails }) {
  const { colors, isDark } = useTheme();
  const playbackPromiseRef = useRef<Promise<void> | null>(null);
  const [hasRequestedPlayback, setHasRequestedPlayback] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const audioSource = useMemo(() => {
    if (!details.uri) {
      return null;
    }

    return {
      uri: details.uri,
      headers: details.uri.includes('ngrok-free')
        ? { 'ngrok-skip-browser-warning': 'true' }
        : undefined,
    };
  }, [details.uri]);
  const player = useAudioPlayer(audioSource, {
    downloadFirst: false,
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0 ? status.duration : 0;
  const currentTime = duration > 0 ? Math.min(status.currentTime, duration) : status.currentTime;
  const progress = duration > 0 ? currentTime / duration : 0;
  const activeBars = details.uri ? Math.max(1, Math.round(progress * WAVEFORM_HEIGHTS.length)) : 0;
  const isLoading = Boolean(
    details.uri &&
    hasRequestedPlayback &&
    !loadFailed &&
    !status.playing &&
    (status.isBuffering || !status.isLoaded)
  );
  const displayedCurrentTime = status.isLoaded ? formatAudioSeconds(currentTime) : details.currentTime;
  const displayedDuration = status.duration > 0 ? formatAudioSeconds(status.duration) : details.duration;

  useEffect(() => {
    setHasRequestedPlayback(false);
    setLoadFailed(false);
  }, [details.uri]);

  useEffect(() => () => {
    try {
      player.pause();
    } catch {
      // Ignore cleanup failures during native player teardown.
    }
  }, [player]);

  useEffect(() => {
    if (!hasRequestedPlayback || status.isLoaded || status.playing || !details.uri) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setHasRequestedPlayback(false);
      setLoadFailed(true);
      Alert.alert('Unable to play audio', 'The audio file could not be loaded. Please try again.');
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [details.uri, hasRequestedPlayback, status.isLoaded, status.playing]);

  const handleTogglePlayback = async () => {
    if (!details.uri) {
      return;
    }
    if (playbackPromiseRef.current) {
      return;
    }

    const playbackPromise = (async () => {
      if (status.playing) {
        player.pause();
        return;
      }

      setLoadFailed(false);
      setHasRequestedPlayback(true);

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
      player.play();
    })();

    playbackPromiseRef.current = playbackPromise;

    try {
      await playbackPromise;
    } catch (error) {
      setHasRequestedPlayback(false);
      setLoadFailed(true);
      Alert.alert('Unable to play audio', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      playbackPromiseRef.current = null;
    }
  };

  return (
    <View style={styles.audioContainer}>
      <View style={styles.waveformRow}>
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={[
              styles.waveBar,
              {
                height: h,
                backgroundColor: i < activeBars ? colors.primary : (isDark ? '#464646' : '#D9D9DF'),
                opacity: details.uri ? 1 : 0.45,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.audioControlsRow}>
        <TouchableOpacity
          style={[
            styles.playBtn,
            { backgroundColor: details.uri ? colors.primary : colors.border },
          ]}
          activeOpacity={0.8}
          disabled={!details.uri}
          onPress={handleTogglePlayback}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={buttonForeground(colors)} />
          ) : (
            <Ionicons
              name={status.playing ? 'pause' : 'play'}
              size={16}
              color={buttonForeground(colors)}
              style={status.playing ? undefined : { marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
        <Text style={[styles.audioTimeText, { color: colors.text }]}>
          {displayedCurrentTime} / {displayedDuration}
        </Text>
      </View>
    </View>
  );
}

export default function FeedPost({
  post,
  onCommentPress,
  onSharePress,
  onViewMapPress,
  onAuthorFollowChange,
  onInteractionChange,
  onSaveChange,
  onDeletePress,
  isOwnPost = false,
  embedded = false,
  isActiveVideo = false,
}: {
  post: PostData;
  onCommentPress?: (post: PostData) => void;
  onSharePress?: (post: PostData) => void;
  onViewMapPress?: () => void;
  onAuthorFollowChange?: (authorId: string, isFollowing: boolean) => void;
  onInteractionChange?: (postId: string, summary: MomentInteractionSummary) => void;
  onSaveChange?: (postId: string, isSaved: boolean) => void;
  onDeletePress?: (post: PostData) => void;
  isOwnPost?: boolean;
  embedded?: boolean;
  isActiveVideo?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [mediaFrameWidth, setMediaFrameWidth] = useState(() => Math.max(windowWidth - 64, 1));
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [showFullScreenMedia, setShowFullScreenMedia] = useState(false);
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(Boolean(post.isFollowing));
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const moreBtnRef = useRef<View>(null);
  const mediaScrollRef = useRef<ScrollView>(null);
  const [menuTop, setMenuTop] = useState(0);
  const canCompareAuthorId = Boolean(post.authorId && currentUserId);
  const isPostByCurrentUser = canCompareAuthorId ? post.authorId === currentUserId : isOwnPost;
  const canDeletePost = isPostByCurrentUser && Boolean(onDeletePress);
  const hasMoreMenuActions = !isPostByCurrentUser || canDeletePost;
  const isNormalPost = post.postType === 'standard';

  // Dynamic Interaction State
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const mediaItems = useMemo(() => {
    const sourceItems = post.mediaItems?.length
      ? post.mediaItems
      : post.mediaUris?.map((uri) => ({ uri, type: 'image' as const, fullUri: uri })) ?? [];

    return sourceItems.filter((item) => Boolean(item.uri?.trim()));
  }, [post.mediaItems, post.mediaUris]);
  const fullScreenMediaItems = useMemo(() => mediaItems.map((item) => ({
    uri: item.fullUri?.trim() || item.uri.trim(),
    type: item.type,
  })), [mediaItems]);
  // Local, per-instance overrides only — mirrors the existing isLiked/isSaved
  // pattern (no second post cache, no global polling). An index is only ever
  // added after its own Retry call succeeds, and the override only takes
  // effect while the incoming prop still says "failed" (stale data); once
  // the post's own next natural refresh (existing Feed/Profile mechanism)
  // brings a newer status, the real prop value is used and the override is
  // simply ignored.
  const [locallyRetriedIndexes, setLocallyRetriedIndexes] = useState<Set<number>>(new Set());
  const [retryPendingIndexes, setRetryPendingIndexes] = useState<Set<number>>(new Set());
  const handleRetryVideoProcessing = useCallback((index: number) => {
    if (retryPendingIndexes.has(index)) {
      return;
    }

    setRetryPendingIndexes((prev) => new Set(prev).add(index));

    void (async () => {
      try {
        await retryMomentVideoProcessing(post.id);
        setLocallyRetriedIndexes((prev) => new Set(prev).add(index));
      } catch (error) {
        Alert.alert('Unable to retry video', getAuthErrorMessage(error, 'Please try again.'));
      } finally {
        setRetryPendingIndexes((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    })();
  }, [post.id, retryPendingIndexes]);
  const resolvedEventId = useMemo(() => {
    const explicitEventId = post.eventId?.trim();

    if (explicitEventId) {
      return explicitEventId;
    }

    if (post.id.startsWith('event-')) {
      const eventIdFromPostId = post.id.slice('event-'.length).trim();

      return eventIdFromPostId || null;
    }

    return MONGO_OBJECT_ID_PATTERN.test(post.id) ? post.id : null;
  }, [post.eventId, post.id]);

  useEffect(() => {
    setIsFollowing(Boolean(post.isFollowing));
  }, [post.id, post.isFollowing]);

  useEffect(() => {
    setIsLiked(Boolean(post.isLiked));
    setIsSaved(Boolean(post.isSaved));
    setLikesCount(post.likesCount || 0);
    setCommentsCount(post.commentsCount || 0);
    setSharesCount(post.sharesCount || 0);
  }, [post.id, post.isLiked, post.isSaved, post.likesCount, post.commentsCount, post.sharesCount]);

  useEffect(() => {
    setCurrentMediaIndex(0);
    const frame = requestAnimationFrame(() => {
      mediaScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [post.id]);

  // Reanimated Shared Values
  const heartScale = useSharedValue(1);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }]
  }));

  const handleLike = async () => {
    if (isLikePending) {
      return;
    }

    // Haptic Feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const wasLiked = isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(!wasLiked);
    setLikesCount((currentCount) => Math.max(0, currentCount + (wasLiked ? -1 : 1)));

    // Animation: Scale up then back to normal
    heartScale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );

    if (!MONGO_OBJECT_ID_PATTERN.test(post.id)) {
      return;
    }

    setIsLikePending(true);

    try {
      const summary = await toggleMomentReaction(post.id);

      setIsLiked(summary.isLiked);
      setLikesCount(summary.likesCount);
      setCommentsCount(summary.commentsCount);
      setSharesCount(summary.sharesCount);
      onInteractionChange?.(post.id, summary);
    } catch (error) {
      setIsLiked(wasLiked);
      setLikesCount(previousLikesCount);
      Alert.alert('Unable to update reaction', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setIsLikePending(false);
    }
  };

  const handleSave = async () => {
    if (isSavePending || !MONGO_OBJECT_ID_PATTERN.test(post.id)) {
      return;
    }

    const wasSaved = isSaved;

    setIsSaved(!wasSaved);
    setIsSavePending(true);

    try {
      const summary = await toggleMomentSave(post.id);

      setIsSaved(summary.isSaved);
      onSaveChange?.(post.id, summary.isSaved);
    } catch (error) {
      setIsSaved(wasSaved);
      Alert.alert('Unable to save post', getAuthErrorMessage(error, 'Please try again.'));
    } finally {
      setIsSavePending(false);
    }
  };

  const handleMorePress = () => {
    if (!hasMoreMenuActions) {
      return;
    }

    moreBtnRef.current?.measureInWindow((x, y, width, height) => {
      setMenuTop(y + height + 5);
      setShowMoreMenu(true);
    });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize <= 0) {
      return;
    }

    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.min(Math.max(Math.round(index), 0), Math.max(mediaItems.length - 1, 0));
    if (roundIndex !== currentMediaIndex) {
      setCurrentMediaIndex(roundIndex);
    }
  };

  const handleMediaLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (nextWidth <= 0 || Math.abs(nextWidth - mediaFrameWidth) < 0.5) {
      return;
    }

    setMediaFrameWidth(nextWidth);
    requestAnimationFrame(() => {
      mediaScrollRef.current?.scrollTo({
        x: currentMediaIndex * nextWidth,
        y: 0,
        animated: false,
      });
    });
  };

  const handleMediaPress = (index: number) => {
    if (post.postType === 'event') {
      handleEventPress();
      return;
    }

    setCurrentMediaIndex(index);
    setShowFullScreenMedia(true);
  };

  const toggleFollow = async () => {
    if (isPostByCurrentUser || isFollowPending) {
      return;
    }

    const authorId = post.authorId;
    const wasFollowing = isFollowing;

    setIsFollowing(!wasFollowing);
    if (authorId) {
      onAuthorFollowChange?.(authorId, !wasFollowing);
    }

    if (!authorId || !MONGO_OBJECT_ID_PATTERN.test(authorId)) {
      return;
    }

    setIsFollowPending(true);

    try {
      const follow = wasFollowing ? await unfollowUser(authorId) : await followUser(authorId);

      setIsFollowing(follow.isFollowing);
      onAuthorFollowChange?.(authorId, follow.isFollowing);
    } catch (error) {
      setIsFollowing(wasFollowing);
      onAuthorFollowChange?.(authorId, wasFollowing);
      Alert.alert(
        wasFollowing ? 'Unable to unfollow' : 'Unable to follow',
        getAuthErrorMessage(error, 'Please try again.'),
      );
    } finally {
      setIsFollowPending(false);
    }
  };

  const handleBlock = () => {
    const authorId = post.authorId;
    if (!authorId || !MONGO_OBJECT_ID_PATTERN.test(authorId)) return;

    Alert.alert(
      "Block User",
      "You won't see posts from this user in your feed anymore. They won't be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setIsHidden(true);
            try {
              await blockUser(authorId);
            } catch {
              setIsHidden(false);
            }
          },
        },
      ],
    );
  };

  const handleEventPress = (eventId = resolvedEventId) => {
    const targetEventId = eventId?.trim();

    if (!targetEventId) {
      Alert.alert('Unable to load event', 'This event is missing its event id.');
      return;
    }

    router.push({
      pathname: '/event-screen/event',
      params: { eventId: targetEventId },
    });
  };

  const handleAuthorPress = () => {
    navigateToProfile(router, currentUserId, {
      userId: post.authorId,
      name: post.authorName,
      avatar: post.authorAvatar,
      isFollowing,
    });
  };

  const handleTaggedUserPress = (taggedUser: NonNullable<PostContextNode['taggedUser']>) => {
    navigateToProfile(router, currentUserId, {
      userId: taggedUser.id,
      name: taggedUser.name,
      avatar: taggedUser.avatar,
      isFollowing: taggedUser.isFollowing,
    });
  };

  const handleTaggedEventPress = (taggedEvent: NonNullable<PostContextNode['taggedEvent']>) => {
    handleEventPress(taggedEvent.id ?? null);
  };

  if (isHidden) {
    return null;
  }

  return (
    <View style={[styles.postWrapper, embedded && styles.embeddedPostWrapper]}>
      {/* Header Context Labels */}
      {post.headerLabel && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (post.headerLabel?.toLowerCase().includes('follow')) {
              router.push('/discover-screen/people-to-follow');
            }
          }}
        >
          <Text style={[styles.headerLabelText, { color: colors.textSecondary }]}>{post.headerLabel}</Text>
        </TouchableOpacity>
      )}
      {post.repostCaption ? <Text style={[styles.repostCaption, { color: colors.text }]}>{post.repostCaption}</Text> : null}
      {!!post.repostTaggedFriendNames?.length && (
        <Text style={[styles.repostTags, { color: colors.textSecondary }]}>with {post.repostTaggedFriendNames.join(', ')}</Text>
      )}
      {post.likedBy && (
        <Text style={[styles.likedByText, { color: colors.text }]}>
          <Text style={[styles.likedByNormal, { color: colors.textSecondary }]}>liked by </Text>
          {post.likedBy}
        </Text>
      )}

      <View
        style={[
          styles.postCard,
          { backgroundColor: colors.card },
          isNormalPost && styles.normalPostCard,
          isNormalPost && isDark && styles.normalPostCardDark,
          embedded && styles.embeddedPostCard,
          embedded && isNormalPost && styles.embeddedNormalPostCard,
        ]}
      >
        {/* Post Header */}
        <View style={[styles.postHeader, isNormalPost && styles.normalPostHeader]}>
          <View style={styles.postAuthorInfo}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleAuthorPress}>
              <UserAvatar
                uri={post.authorAvatar}
                name={post.authorName}
                size={isNormalPost ? 40 : 36}
                style={[styles.postAvatar, isNormalPost && styles.normalPostAvatar]}
                iconSize={isNormalPost ? 18 : 16}
              />
            </TouchableOpacity>
            <View style={[styles.authorTextContainer, isNormalPost && styles.normalAuthorTextContainer]}>
              <Text style={[styles.authorLine, isNormalPost && styles.normalAuthorLine]} numberOfLines={2}>
                <Text style={[styles.postAuthor, { color: colors.text }]} onPress={handleAuthorPress} suppressHighlighting>{post.authorName}</Text>
                {post.authorContextNodes?.map((node, i) => (
                  <Text
                    key={i}
                    style={[node.type === 'muted' ? styles.authorMuted : styles.postAuthor, { color: node.type === 'muted' ? colors.textSecondary : colors.text }]}
                    onPress={
                      node.taggedUser?.id
                        ? () => handleTaggedUserPress(node.taggedUser!)
                        : node.taggedEvent?.id
                          ? () => handleTaggedEventPress(node.taggedEvent!)
                          : undefined
                    }
                    suppressHighlighting={Boolean(node.taggedUser?.id || node.taggedEvent?.id)}
                  >
                    {node.text}
                  </Text>
                ))}
              </Text>

              <View style={[styles.timeRow, isNormalPost && styles.normalTimeRow]}>
                <Text style={[styles.postTime, isNormalPost && styles.normalPostTime, { color: isNormalPost && isDark ? '#777777' : colors.textSecondary }]}>{post.timeAgo}</Text>
                {post.isPublic && (
                  <>
                    <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}> • </Text>
                    <Feather name="globe" size={10} color={colors.textSecondary} />
                  </>
                )}
              </View>
            </View>
          </View>
          <View style={[styles.postHeaderActions, isNormalPost && styles.normalPostHeaderActions]}>
            {!isPostByCurrentUser && (
              isFollowing ? (
                <TouchableOpacity
                  style={[styles.followingBtn, styles.normalFollowingBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
                  activeOpacity={0.8}
                  disabled={isFollowPending}
                  onPress={toggleFollow}
                >
                  <Text style={[styles.followingBtnText, { color: colors.textSecondary }]}>Following</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.followBtn, styles.normalFollowBtn, { borderColor: isDark ? '#AC86D4' : colors.primary }]}
                  activeOpacity={0.8}
                  disabled={isFollowPending}
                  onPress={toggleFollow}
                >
                  <Feather name="plus" size={12} color={isDark ? '#AC86D4' : colors.primary} />
                  <Text style={[styles.followBtnText, styles.normalFollowBtnText, { color: isDark ? '#AC86D4' : colors.primary }]}>Follow</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity
              ref={moreBtnRef}
              style={[styles.moreBtn, isNormalPost && styles.normalMoreBtn]}
              onPress={handleMorePress}
            >
              <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Text */}
        {post.caption ? (
          <HashtagText
            style={[styles.postCaption, isNormalPost && styles.normalPostCaption, { color: isNormalPost && isDark ? '#B3B3B3' : colors.textSecondary }]}
            hashtagStyle={{ color: colors.primary, fontWeight: '700' }}
          >
            {post.caption}
          </HashtagText>
        ) : null}

        {/* Dynamic Media Section based on Post Type */}
        {post.postType === 'audio' && post.audioDetails && (
          <AudioFeedPlayer details={post.audioDetails} />
        )}

        {(post.postType === 'standard' || post.postType === 'event' || post.postType === 'product') && mediaItems.length > 0 && (
          <View
            style={[
              styles.postMediaContainer,
              !post.caption && !isNormalPost && styles.mediaNoTopMargin,
              isNormalPost && styles.normalPostMediaContainer,
            ]}
            onLayout={handleMediaLayout}
          >
            <ScrollView
              ref={mediaScrollRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              onScrollEndDrag={handleScroll}
              scrollEventThrottle={16}
            >
              {mediaItems.map((item, index) => {
                // Legacy video with no processingStatus, or processingStatus
                // "ready" (or any other/future value), falls straight
                // through to the existing VideoFeedMedia path unchanged —
                // only the three known blocking states ever render the
                // placeholder instead.
                const rawProcessingStatus = item.type === 'video' ? item.processingStatus : undefined;
                const effectiveProcessingStatus = rawProcessingStatus === 'failed' && locallyRetriedIndexes.has(index)
                  ? 'queued'
                  : rawProcessingStatus;
                const isVideoNotYetPlayable = item.type === 'video' && (
                  effectiveProcessingStatus === 'queued'
                  || effectiveProcessingStatus === 'processing'
                  || effectiveProcessingStatus === 'failed'
                );

                return (
                  <View key={`${item.uri}-${index}`} style={[styles.mediaSlide, { width: mediaFrameWidth }]}>
                    {isVideoNotYetPlayable ? (
                      <VideoProcessingPlaceholder
                        status={effectiveProcessingStatus as 'queued' | 'processing' | 'failed'}
                        canRetry={effectiveProcessingStatus === 'failed' && isPostByCurrentUser}
                        isRetrying={retryPendingIndexes.has(index)}
                        onRetry={() => handleRetryVideoProcessing(index)}
                      />
                    ) : item.type === 'video' ? (
                      <VideoFeedMedia uri={item.uri} isActive={Boolean(isActiveVideo && currentMediaIndex === index && !showFullScreenMedia)} />
                    ) : (
                      <TouchableOpacity
                        style={styles.mediaImageButton}
                        activeOpacity={0.92}
                        onPress={() => handleMediaPress(index)}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={`Open image ${index + 1} of ${mediaItems.length} full screen`}
                      >
                        <CroppedFeedImage item={item} frameWidth={mediaFrameWidth} frameHeight={isNormalPost ? mediaFrameWidth : 340} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Conditional Layout: Event Details Overlay */}
            {post.postType === 'event' && post.eventDetails ? (
              <>
                {/* Event Live Badge */}
                {post.eventDetails.isLive && (
                  <View style={styles.liveNowBadge}>
                    <View style={styles.liveNowDot} />
                    <Text style={styles.liveNowText}>Live Now</Text>
                  </View>
                )}

                {/* Event Overlay Bottom Info */}
                <View style={styles.eventOverlayBottom}>
                  <View style={styles.eventTagsRow}>
                    {post.eventDetails.tags?.map((tag, i) => (
                      <View key={i} style={[styles.eventTag, { backgroundColor: tag.bg || '#FFFFFF' }]}>
                        <Text style={[styles.eventTagText, { color: tag.color || '#000000' }]}>{tag.label}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.eventTitle}>{post.eventDetails.title}</Text>
                  <Text style={styles.eventSubtitle}>
                    {post.eventDetails.datetime} • {post.eventDetails.distance}
                  </Text>

                  <View style={styles.eventAttendeesRow}>
                    <TouchableOpacity
                      style={styles.avatarCluster}
                      activeOpacity={0.8}
                      onPress={() => { /* router.push('/event-screen/attendees-list'); */ }}
                    >
                      {post.eventDetails.attendeesAvatars?.map((uri, i) => (
                        <Image
                          key={i}
                          source={{ uri }}
                          style={[
                            styles.avatarSmall,
                            { zIndex: (post.eventDetails?.attendeesAvatars?.length || 0) - i },
                            i > 0 && { marginLeft: -8 }
                          ]}
                        />
                      ))}
                    </TouchableOpacity>
                    <Text style={styles.attendeesText}>{post.eventDetails.attendeesCount} going</Text>
                  </View>

                  {/* Buttons on Right */}
                  <View style={styles.eventActionsCol}>
                    <TouchableOpacity
                      style={styles.viewMapBtn}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onViewMapPress) {
                          onViewMapPress();
                        } else {
                          router.push('/(tabs)/home?view=map' as any);
                        }
                      }}
                    >
                      <Text style={styles.viewMapText}>View Map</Text>
                    </TouchableOpacity>
                    {post.eventDetails.priceLabel && (
                      <TouchableOpacity
                        style={styles.priceBtn}
                        activeOpacity={0.8}
                        onPress={() => router.push('/event-screen/wallet' as any)}
                      >
                        <Text style={styles.priceBtnText}>{post.eventDetails.priceLabel}</Text>
                        <Feather name="chevron-right" size={14} color="#000000" style={{ marginTop: 1 }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </>
            ) : (post.postType === 'standard' || post.postType === 'product') && (
              <>
                {/* Media Counters & Badges (Standard & Product) */}
                {mediaItems.length > 1 && (
                  <View pointerEvents="none" style={[styles.imageCounter, post.isExpandable && styles.imageCounterBottom]}>
                    <Text style={styles.imageCounterText}>
                      {currentMediaIndex + 1}/{mediaItems.length}
                    </Text>
                  </View>
                )}

                {post.isExpandable && (
                  <TouchableOpacity
                    style={styles.expandBtn}
                    activeOpacity={0.8}
                    onPress={() => setShowFullScreenMedia(true)}
                  >
                    <Feather name="maximize-2" size={14} color="#D0D0D8" />
                  </TouchableOpacity>
                )}

                {post.ticketsCount !== undefined && post.ticketsCount > 0 && (
                  <TouchableOpacity style={styles.ticketFab} activeOpacity={0.9}>
                    <Ionicons name="ticket-outline" size={24} color="#FFFFFF" />
                    <View style={styles.ticketBadge}>
                      <Text style={styles.ticketBadgeText}>{post.ticketsCount}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Product Post Footer */}
        {post.postType === 'product' && post.productDetails && (
          <View style={styles.productFooterContainer}>
            <View style={styles.productFooterTextCol}>
              <Text style={[styles.productFooterTitle, { color: colors.textSecondary }]}>{post.productDetails.title}</Text>
              <Text style={[styles.productFooterPrice, { color: colors.text }]}>{post.productDetails.price}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.productViewBtn, { backgroundColor: buttonBackground(colors) }]}
              activeOpacity={0.8}
              onPress={() => router.push('/product-screen/product-details')}
            >
              <Text style={[styles.productViewBtnText, { color: buttonForeground(colors) }]}>{post.productDetails.buttonText}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Normal Post Footer Actions */}
        {post.postType !== 'product' && (post.likesCount !== undefined || post.commentsCount !== undefined || post.sharesCount !== undefined) && (
          <View style={[styles.postFooter, isNormalPost && styles.normalPostFooter]}>
            <PostInteractionBar
              likesCount={post.likesCount !== undefined ? likesCount : undefined}
              commentsCount={post.commentsCount !== undefined ? commentsCount : undefined}
              sharesCount={post.sharesCount !== undefined ? sharesCount : undefined}
              isLiked={isLiked}
              onLikePress={handleLike}
              onCommentPress={() => onCommentPress?.(post)}
              onSharePress={() => onSharePress?.(post)}
              likeIconStyle={heartAnimatedStyle}
              compact={isNormalPost}
            />
          </View>
        )}

        <MoreMenuModal
          visible={showMoreMenu}
          onClose={() => setShowMoreMenu(false)}
          showDelete={canDeletePost}
          deleteLabel={post.postType === 'event' ? 'Cancel Event' : 'Delete'}
          onReport={!isPostByCurrentUser ? () => setShowReportModal(true) : undefined}
          onSave={!isPostByCurrentUser ? handleSave : undefined}
          isSaved={!isPostByCurrentUser ? isSaved : undefined}
          onBlock={!isPostByCurrentUser && Boolean(post.authorId) ? handleBlock : undefined}
          onDelete={canDeletePost ? () => onDeletePress?.(post) : undefined}
          top={menuTop}
        />

        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          onReport={(reason) => {
            console.log('Reported for:', reason);
            setShowReportModal(false);
            // Small delay to ensure the first modal closes before opening the second
            setTimeout(() => setShowReportDetailsModal(true), 300);
          }}
        />

        <ReportDetailsModal
          visible={showReportDetailsModal}
          onClose={() => setShowReportDetailsModal(false)}
          onDone={(details) => {
            console.log('Report details:', details);
            // Final submission logic here
          }}
        />

        <FullScreenMediaModal
          visible={showFullScreenMedia}
          onClose={() => setShowFullScreenMedia(false)}
          onIndexChange={setCurrentMediaIndex}
          mediaItems={fullScreenMediaItems}
          initialIndex={currentMediaIndex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  postWrapper: {
    marginBottom: 20,
  },
  embeddedPostWrapper: {
    marginBottom: 0,
  },
  headerLabelText: {
    color: "#8E8E9B",
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  repostCaption: { fontSize: 14, lineHeight: 19, marginHorizontal: 16, marginBottom: 5 },
  repostTags: { fontSize: 12, marginHorizontal: 16, marginBottom: 8 },
  likedByText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  likedByNormal: {
    fontWeight: "normal",
    color: "#8E8E9B",
  },
  postCard: {
    backgroundColor: "#13131A",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
  },
  normalPostCard: {
    borderRadius: 12,
    padding: 0,
    overflow: "hidden",
  },
  normalPostCardDark: {
    backgroundColor: "rgba(17, 17, 17, 0.85)",
  },
  embeddedPostCard: {
    marginHorizontal: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  embeddedNormalPostCard: {
    borderRadius: 12,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  normalPostHeader: {
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  postAuthorInfo: {
    flexDirection: "row",
    flex: 1,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  normalPostAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  postAvatarFallback: {
    backgroundColor: '#2B2B36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorTextContainer: {
    flex: 1,
    paddingRight: 8,
    justifyContent: "center",
  },
  normalAuthorTextContainer: {
    minHeight: 40,
    paddingRight: 8,
  },
  authorLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  normalAuthorLine: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    letterSpacing: 0,
  },
  postAuthor: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  authorMuted: {
    color: "#8E8E9B",
    fontWeight: "normal",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  normalTimeRow: {
    marginTop: 4,
    minHeight: 16,
  },
  postTime: {
    color: "#8E8E9B",
    fontSize: 11,
  },
  normalPostTime: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: 0,
  },
  dotSeparator: {
    color: "#8E8E9B",
    fontSize: 10,
  },
  postHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  normalPostHeaderActions: {
    height: 20,
    marginTop: 0,
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4B0EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  normalFollowBtn: {
    height: 20,
    paddingHorizontal: 4,
    paddingVertical: 0,
    marginRight: 20,
  },
  followBtnText: {
    color: "#D4B0EB",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  normalFollowBtnText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    letterSpacing: 0,
  },
  followingBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  normalFollowingBtn: {
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
    marginRight: 20,
  },
  followingBtnText: {
    color: "#D0D0D8",
    fontSize: 11,
    fontWeight: "600",
  },
  moreBtn: {
    padding: 2,
  },
  normalMoreBtn: {
    width: 20,
    height: 20,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  postCaption: {
    color: "#D0D0D8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  normalPostCaption: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
    letterSpacing: 0,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  postMediaContainer: {
    width: "100%",
    height: 340,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  normalPostMediaContainer: {
    aspectRatio: 1,
    height: undefined,
    borderRadius: 0,
  },
  mediaNoTopMargin: {
    marginTop: 4,
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  mediaSlide: {
    height: "100%",
  },
  mediaImageButton: {
    flex: 1,
  },
  croppedImageFrame: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    overflow: "hidden",
    position: "relative",
  },
  croppedImage: {
    position: "absolute",
  },
  videoMediaFrame: {
    width: "100%",
    height: "100%",
    position: "relative",
    backgroundColor: "#000000",
  },
  videoTapLayer: {
    flex: 1,
    position: "relative",
  },
  videoStateOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  videoErrorText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  videoProcessingIcon: {
    marginBottom: 8,
  },
  videoProcessingTextSpacing: {
    marginTop: 10,
  },
  videoRetryButton: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  videoRetryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  videoMuteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  videoMuteButtonCollapsed: {
    opacity: 0.72,
  },
  videoControls: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  videoControlsFullscreen: {
    left: 16,
    right: 16,
    bottom: 28,
  },
  videoProgressTrack: {
    height: 20,
    justifyContent: "center",
  },
  videoProgressTrackLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  videoProgressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  videoProgressThumb: {
    position: "absolute",
    width: 10,
    height: 10,
    marginLeft: -5,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  videoControlsRow: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  videoTimeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  videoControlActions: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  videoIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  videoSettingsMenu: {
    position: "absolute",
    right: 50,
    bottom: 48,
    width: 82,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(18,18,22,0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  videoSpeedOption: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  videoSpeedOptionActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  videoSpeedText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  videoFullscreenRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },
  videoFullscreenClose: {
    position: "absolute",
    top: 46,
    right: 18,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  videoFullscreenTapLayer: {
    flex: 1,
  },
  videoFullscreenPlayer: {
    width: "100%",
    height: "100%",
  },
  /* Audio Post Styles */
  audioContainer: {
    marginTop: 0,
    marginBottom: 0,
  },
  waveformRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: 56,
    marginBottom: 12,
    overflow: "hidden",
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  audioControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D0D0D8",
    justifyContent: "center",
    alignItems: "center",
  },
  audioTimeText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  imageCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  imageCounterBottom: {
    top: undefined,
    bottom: 12,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  expandBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  ticketFab: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(14, 13, 18, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ticketBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#F2245C",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  ticketBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'space-between',
    marginTop: 16,
  },
  normalPostFooter: {
    minHeight: 20,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  statBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statBtnText: {
    color: '#0e0d12',
    fontSize: 12,
    fontWeight: 'bold',
  },
  /* Event Overlay Styles */
  liveNowBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 216, 105, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(22, 216, 105, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveNowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16D869',
    marginRight: 6,
  },
  liveNowText: {
    color: '#16D869',
    fontSize: 11,
    fontWeight: 'bold',
  },
  eventOverlayBottom: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#D4B0EB', // Violet matching the screenshot accent
    paddingLeft: 12,
  },
  eventTagsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  eventTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  eventTagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventSubtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 10,
  },
  eventAttendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCluster: {
    flexDirection: 'row',
    marginRight: 8,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  attendeesText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  eventActionsCol: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'flex-end',
  },
  viewMapBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  viewMapText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  priceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#D0D0D8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 2,
  },
  /* Product Footer Styles */
  productFooterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  productFooterTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  productFooterTitle: {
    color: '#8E8E9B', // Grayish descriptive text
    fontSize: 12,
    marginBottom: 4,
  },
  productFooterPrice: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  productViewBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  productViewBtnText: {
    color: '#0e0d12',
    fontSize: 13,
    fontWeight: 'bold',
  },
  /* Modal & More Menu Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingRight: 32,
  },
});

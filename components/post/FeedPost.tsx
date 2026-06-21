import { Feather, Ionicons } from '@expo/vector-icons';
import { Comment02Icon, Share01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { VideoView,
  useVideoPlayer } from 'expo-video';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { toggleMomentReaction, toggleMomentSave, type MomentInteractionSummary } from '@/lib/moments';
import { followUser, unfollowUser } from '@/lib/users';
import { useAuthStore } from '@/stores/authStore';
import FullScreenMediaModal from '../modals/FullScreenMediaModal';
import ReportDetailsModal from '../modals/ReportDetailsModal';
import ReportModal from '../modals/ReportModal';
import MoreMenuModal from "./MoreMenuModal";
const { width } = Dimensions.get('window');

// Hardcoded visual waveform for Audio posts
const WAVEFORM_HEIGHTS = [14, 22, 10, 35, 26, 40, 16, 45, 30, 18, 42, 28, 12, 38, 22, 16, 32, 24, 14, 28, 36, 18, 12, 30, 42, 24, 16, 38, 28, 14, 45, 20, 12, 32, 24, 18, 10, 26, 14, 10];
const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export type PostContextNode = {
  text: string;
  type: 'bold' | 'muted';
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

export type PostMediaItem = {
  uri: string;
  fullUri?: string | null;
  type: 'image' | 'video';
  displayCrop?: MediaDisplayCrop | null;
};

export type PostData = {
  id: string;
  eventId?: string;
  postType: 'standard' | 'audio' | 'event' | 'product';
  authorId?: string;
  authorName: string;
  authorContextNodes?: PostContextNode[];
  authorAvatar: string;
  isFollowing?: boolean;
  timeAgo: string;
  caption?: string;
  mediaUris?: string[];
  mediaItems?: PostMediaItem[];
  ticketsCount?: number;
  likedBy?: string;
  headerLabel?: string;
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

function VideoFeedMedia({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  return (
    <View style={styles.videoMediaFrame}>
      <VideoView
        player={player}
        style={styles.postImage}
        nativeControls
        contentFit="cover"
      />
      <View style={styles.videoBadge}>
        <Feather name="play" size={12} color="#FFFFFF" />
      </View>
    </View>
  );
}

function CroppedFeedImage({ item }: { item: PostMediaItem }) {
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
      <Image
        source={{ uri: item.uri }}
        style={styles.postImage}
        resizeMode="cover"
      />
    );
  }

  const frameWidth = width - 64;
  const frameHeight = 340;
  const cropPixelWidth = Math.max(crop.width * imageSize.width, 1);
  const cropPixelHeight = Math.max(crop.height * imageSize.height, 1);
  const scale = Math.min(frameWidth / cropPixelWidth, frameHeight / cropPixelHeight);
  const renderedWidth = imageSize.width * scale;
  const renderedHeight = imageSize.height * scale;
  const left = (frameWidth - cropPixelWidth * scale) / 2 - crop.x * imageSize.width * scale;
  const top = (frameHeight - cropPixelHeight * scale) / 2 - crop.y * imageSize.height * scale;

  return (
    <View style={styles.croppedImageFrame}>
      <Image
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
        resizeMode="stretch"
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

    try {
      if (status.playing) {
        player.pause();
        return;
      }

      setLoadFailed(false);
      setHasRequestedPlayback(true);

      if (duration > 0 && currentTime >= duration - 0.25) {
        await player.seekTo(0);
      }

      player.play();
    } catch (error) {
      setHasRequestedPlayback(false);
      setLoadFailed(true);
      Alert.alert('Unable to play audio', getAuthErrorMessage(error, 'Please try again.'));
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
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <Ionicons
              name={status.playing ? 'pause' : 'play'}
              size={16}
              color={colors.background}
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
  onDeletePress,
  isOwnPost = false
}: {
  post: PostData;
  onCommentPress?: (post: PostData) => void;
  onSharePress?: (post: PostData) => void;
  onViewMapPress?: () => void;
  onAuthorFollowChange?: (authorId: string, isFollowing: boolean) => void;
  onInteractionChange?: (postId: string, summary: MomentInteractionSummary) => void;
  onDeletePress?: (post: PostData) => void;
  isOwnPost?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportDetailsModal, setShowReportDetailsModal] = useState(false);
  const [showFullScreenMedia, setShowFullScreenMedia] = useState(false);
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(Boolean(post.isFollowing));
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [authorAvatarError, setAuthorAvatarError] = useState(false);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const moreBtnRef = useRef<View>(null);
  const [menuTop, setMenuTop] = useState(0);
  const canCompareAuthorId = Boolean(post.authorId && currentUserId);
  const isPostByCurrentUser = canCompareAuthorId ? post.authorId === currentUserId : isOwnPost;
  const canDeletePost = isPostByCurrentUser && Boolean(onDeletePress);
  const hasMoreMenuActions = !isPostByCurrentUser || canDeletePost;

  // Dynamic Interaction State
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [isLikePending, setIsLikePending] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const mediaItems = post.mediaItems ?? post.mediaUris?.map((uri) => ({ uri, type: 'image' as const, fullUri: uri })) ?? [];
  const fullScreenMediaUris = post.mediaUris || mediaItems.map((item) => item.fullUri || item.uri);
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
    setAuthorAvatarError(false);
  }, [post.id, post.isFollowing]);

  useEffect(() => {
    setIsLiked(Boolean(post.isLiked));
    setIsSaved(Boolean(post.isSaved));
    setLikesCount(post.likesCount || 0);
    setCommentsCount(post.commentsCount || 0);
    setSharesCount(post.sharesCount || 0);
  }, [post.id, post.isLiked, post.isSaved, post.likesCount, post.commentsCount, post.sharesCount]);

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

  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentMediaIndex) {
      setCurrentMediaIndex(roundIndex);
    }
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

  const handleEventPress = () => {
    if (!resolvedEventId) {
      Alert.alert('Unable to load event', 'This event is missing its event id.');
      return;
    }

    router.push({
      pathname: '/event-screen/event',
      params: { eventId: resolvedEventId },
    });
  };

  return (
    <View style={styles.postWrapper}>
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
      {post.likedBy && (
        <Text style={[styles.likedByText, { color: colors.text }]}>
          <Text style={[styles.likedByNormal, { color: colors.textSecondary }]}>liked by </Text>
          {post.likedBy}
        </Text>
      )}

      <View style={[styles.postCard, { backgroundColor: colors.card }]}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.postAuthorInfo}
            activeOpacity={0.7}
            onPress={() => router.push({
              pathname: '/profile-screen/user-profile',
              params: {
                userId: post.authorId ?? post.id,
                name: post.authorName,
                avatar: post.authorAvatar
              }
            } as any)}
          >
            {!authorAvatarError ? (
              <Image
                source={{ uri: post.authorAvatar }}
                style={styles.postAvatar}
                onError={() => setAuthorAvatarError(true)}
              />
            ) : (
              <View style={[styles.postAvatar, styles.postAvatarFallback]}>
                <Feather name="user" size={16} color="#8E8E9B" />
              </View>
            )}
            <View style={styles.authorTextContainer}>
              <Text style={styles.authorLine} numberOfLines={2}>
                <Text style={[styles.postAuthor, { color: colors.text }]}>{post.authorName}</Text>
                {post.authorContextNodes?.map((node, i) => (
                  <Text key={i} style={[node.type === 'muted' ? styles.authorMuted : styles.postAuthor, { color: node.type === 'muted' ? colors.textSecondary : colors.text }]}>
                    {node.text}
                  </Text>
                ))}
              </Text>

              <View style={styles.timeRow}>
                <Text style={[styles.postTime, { color: colors.textSecondary }]}>{post.timeAgo}</Text>
                {post.isPublic && (
                  <>
                    <Text style={[styles.dotSeparator, { color: colors.textSecondary }]}> • </Text>
                    <Feather name="globe" size={10} color={colors.textSecondary} />
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.postHeaderActions}>
            {!isPostByCurrentUser && (
              isFollowing ? (
                <TouchableOpacity
                  style={[styles.followingBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
                  activeOpacity={0.8}
                  disabled={isFollowPending}
                  onPress={toggleFollow}
                >
                  <Text style={[styles.followingBtnText, { color: colors.textSecondary }]}>Following</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.followBtn, { borderColor: colors.primary }]}
                  activeOpacity={0.8}
                  disabled={isFollowPending}
                  onPress={toggleFollow}
                >
                  <Feather name="plus" size={12} color={colors.primary} />
                  <Text style={[styles.followBtnText, { color: colors.primary }]}>Follow</Text>
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity
              ref={moreBtnRef}
              style={styles.moreBtn}
              onPress={handleMorePress}
            >
              <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Text */}
        {post.caption ? (
          <Text style={[styles.postCaption, { color: colors.textSecondary }]}>{post.caption}</Text>
        ) : null}

        {/* Dynamic Media Section based on Post Type */}
        {post.postType === 'audio' && post.audioDetails && (
          <AudioFeedPlayer details={post.audioDetails} />
        )}

        {(post.postType === 'standard' || post.postType === 'event' || post.postType === 'product') && mediaItems.length > 0 && (
          <TouchableOpacity
            activeOpacity={post.postType === 'event' || post.postType === 'standard' ? 0.9 : 1}
            onPress={() => {
              if (post.postType === 'event') {
                handleEventPress();
              }
            }}
            style={[styles.postMediaContainer, !post.caption && styles.mediaNoTopMargin]}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              scrollEventThrottle={16}
            >
              {mediaItems.map((item, index) => (
                item.type === 'video' ? (
                  <VideoFeedMedia key={`${item.uri}-${index}`} uri={item.uri} />
                ) : (
                  <CroppedFeedImage
                    key={`${item.uri}-${index}`}
                    item={item}
                  />
                )
              ))}
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
                  <View style={[styles.imageCounter, post.isExpandable && styles.imageCounterBottom]}>
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
          </TouchableOpacity>
        )}

        {/* Product Post Footer */}
        {post.postType === 'product' && post.productDetails && (
          <View style={styles.productFooterContainer}>
            <View style={styles.productFooterTextCol}>
              <Text style={[styles.productFooterTitle, { color: colors.textSecondary }]}>{post.productDetails.title}</Text>
              <Text style={[styles.productFooterPrice, { color: colors.text }]}>{post.productDetails.price}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.productViewBtn, { backgroundColor: colors.primary }]} 
              activeOpacity={0.8}
              onPress={() => router.push('/product-screen/product-details')}
            >
              <Text style={[styles.productViewBtnText, { color: colors.background }]}>{post.productDetails.buttonText}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Normal Post Footer Actions */}
        {post.postType !== 'product' && (post.likesCount !== undefined || post.commentsCount !== undefined || post.sharesCount !== undefined) && (
          <View style={styles.postFooter}>
            <View style={styles.footerStats}>
              {likesCount !== undefined && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  activeOpacity={0.7}
                  onPress={handleLike}
                >
                  <Animated.View style={heartAnimatedStyle}>
                    <Ionicons
                      name={isLiked ? "heart" : "heart-outline"}
                      size={22}
                      color={isLiked ? "#F2245C" : colors.textSecondary}
                    />
                  </Animated.View>
                  <Text style={[styles.actionText, { color: colors.text }]}>{likesCount}</Text>
                </TouchableOpacity>
              )}
              {post.commentsCount !== undefined && (
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => onCommentPress?.(post)}>
                  <HugeiconsIcon icon={Comment02Icon} size={20} color={colors.textSecondary} />
                  <Text style={[styles.actionText, { color: colors.text }]}>{commentsCount}</Text>
                </TouchableOpacity>
              )}
              {post.sharesCount !== undefined && (
                <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => onSharePress?.(post)}>
                  <HugeiconsIcon icon={Share01Icon} size={20} color={colors.textSecondary} />
                  <Text style={[styles.actionText, { color: colors.text }]}>{sharesCount}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <MoreMenuModal
          visible={showMoreMenu}
          onClose={() => setShowMoreMenu(false)}
          showDelete={canDeletePost}
          onReport={!isPostByCurrentUser ? () => setShowReportModal(true) : undefined}
          onSave={!isPostByCurrentUser ? handleSave : undefined}
          isSaved={!isPostByCurrentUser ? isSaved : undefined}
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
          mediaUris={fullScreenMediaUris}
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
  headerLabelText: {
    color: "#8E8E9B",
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 8,
  },
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
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
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
  authorLine: {
    fontSize: 13,
    lineHeight: 18,
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
  postTime: {
    color: "#8E8E9B",
    fontSize: 11,
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
  followBtnText: {
    color: "#D4B0EB",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  followingBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  followingBtnText: {
    color: "#D0D0D8",
    fontSize: 11,
    fontWeight: "600",
  },
  moreBtn: {
    padding: 2,
  },
  postCaption: {
    color: "#D0D0D8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  postMediaContainer: {
    width: "100%",
    height: 340,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  mediaNoTopMargin: {
    marginTop: 4,
  },
  postImage: {
    width: width - 64,
    height: "100%",
  },
  croppedImageFrame: {
    width: width - 64,
    height: "100%",
    backgroundColor: "#000000",
    overflow: "hidden",
    position: "relative",
  },
  croppedImage: {
    position: "absolute",
  },
  videoMediaFrame: {
    width: width - 64,
    height: "100%",
    position: "relative",
    backgroundColor: "#000000",
  },
  videoBadge: {
    position: "absolute",
    left: 12,
    bottom: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
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
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBtn: {
    backgroundColor: '#B2ABBA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statBtnText: {
    color: '#0e0d12',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
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
    backgroundColor: '#B2ABBA',
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

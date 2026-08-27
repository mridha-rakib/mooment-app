import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EventFeedCard from '@/components/home/EventFeedCard';
import { useTheme } from '@/hooks/useTheme';
import { getEventById, type EventResponse } from '@/lib/events';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { shareMoment, updateShareCaption, type MomentAuthor, type MomentTimelineItem, type RepostPayload } from '@/lib/moments';
import { navigateToProfile } from '@/lib/profileNavigation';
import { getStorageFileUrl } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';
import UserAvatar from '../ui/UserAvatar';
import FeedPost from './FeedPost';
import MoreMenuModal from './MoreMenuModal';
import ShareModal, { type ShareItem } from './ShareModal';

type Props = {
  share: MomentTimelineItem;
  labelOverride?: string;
  onRepostSuccess?: () => void;
  // Fired after the authenticated user edits ONLY their own repost
  // commentary (never the original content). Lets the Feed screen patch its
  // local list by share id instead of refetching.
  onShareUpdated?: (share: MomentTimelineItem) => void;
  showLoadingIndicator?: boolean;
  isActiveVideo?: boolean;
};

function RepostFeedCard({
  share,
  labelOverride,
  onRepostSuccess,
  onShareUpdated,
  showLoadingIndicator = true,
  isActiveVideo = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventUnavailable, setEventUnavailable] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [editCaptionVisible, setEditCaptionVisible] = useState(false);
  const isEvent = share.originalItem?.type === 'event';
  // Edit visibility is the SHARE owner, never the original content's author —
  // a user may always edit their own repost commentary even when they don't
  // own the original Post/Event.
  const isOwnRepost = Boolean(currentUserId && share.sharedBy?.id && currentUserId === share.sharedBy.id);
  const reposterName = share.sharedBy?.name?.trim() || share.sharedBy?.username?.trim() || 'Mooment user';
  const reposterAvatar = useMemo(() => {
    if (share.sharedBy?.avatarKey) {
      try { return getStorageFileUrl(share.sharedBy.avatarKey); } catch { /* fall through */ }
    }
    return share.sharedBy?.avatarUrl ?? null;
  }, [share.sharedBy?.avatarKey, share.sharedBy?.avatarUrl]);
  const sharedTime = formatTimeAgo(share.sharedAt ?? share.createdAt);
  const contextLabel = labelOverride ?? 'Shared';

  useEffect(() => {
    const eventId = isEvent ? share.originalItem?.id : null;
    if (!eventId) return;
    let mounted = true;
    setEventLoading(true);
    setEventUnavailable(false);
    getEventById(eventId)
      .then((value) => { if (mounted) setEvent(value); })
      .catch(() => { if (mounted) setEventUnavailable(true); })
      .finally(() => { if (mounted) setEventLoading(false); });
    return () => { mounted = false; };
  }, [isEvent, share.originalItem?.id]);

  const post = useMemo(() => {
    if (isEvent) return null;
    return mapMomentToPost(share.moment, {
      createdAt: share.moment.createdAt,
      storageUrlResolver: getStorageFileUrl,
    });
  }, [isEvent, share.moment]);

  const handlePostRepost = async (payload: RepostPayload) => {
    await shareMoment(share.moment.id, payload);
    setShareVisible(false);
    onRepostSuccess?.();
  };

  const handleUpdateCaption = async (shareId: string, caption: string | null) => {
    const updated = await updateShareCaption(shareId, caption);
    onShareUpdated?.(updated);
  };

  // Preview shown inside the edit-composer for context only — mirrors the
  // same ShareItem shapes already used by the create-repost flows (FeedPost's
  // post preview above, EventFeedCard's event preview) without duplicating
  // their full rich formatting (category/date/location labels).
  const editPreviewItem: ShareItem | undefined = useMemo(() => {
    if (isEvent) {
      if (!event) return undefined;
      let bannerUri: string | null = null;
      if (event.bannerImageKey) {
        try { bannerUri = getStorageFileUrl(event.bannerImageKey); } catch { /* fall through */ }
      }
      return {
        type: 'event',
        id: event.id,
        preview: event.name,
        imageUrl: bannerUri,
        authorName: event.host?.name ?? null,
      };
    }

    if (!post) return undefined;

    return {
      type: 'post',
      id: post.id,
      preview: post.caption,
      imageUrl: post.mediaItems?.[0]?.uri ?? post.mediaUris?.[0],
      authorName: post.authorName,
    };
  }, [event, isEvent, post]);

  const editModal = (
    <ShareModal
      visible={editCaptionVisible}
      onClose={() => setEditCaptionVisible(false)}
      onUpdateCaption={handleUpdateCaption}
      item={editPreviewItem}
      editing={{ shareId: share.id, caption: share.repostCaption ?? null }}
    />
  );

  const header = (
    <RepostHeader
      reposterId={share.sharedBy?.id}
      reposterName={reposterName}
      reposterAvatar={reposterAvatar}
      contextLabel={contextLabel}
      sharedTime={sharedTime}
      caption={share.repostCaption}
      taggedFriends={share.taggedFriends ?? []}
      isOwnRepost={isOwnRepost}
      onEditPress={() => setEditCaptionVisible(true)}
    />
  );

  if (isEvent) {
    if (eventLoading) {
      return (
        <View
          style={[
            styles.repostCard,
            { backgroundColor: colors.card },
            !isDark && { borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {header}
          <EventRepostLoadingPlaceholder showLoadingIndicator={showLoadingIndicator} />
          {editModal}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.repostCard,
          { backgroundColor: colors.card },
          // Light mode: colors.card === colors.background (both white), so
          // without a border the repost card is invisible against the page.
          // Dark mode is untouched (colors.card already differs from the
          // dark page background).
          !isDark && { borderWidth: 1, borderColor: colors.border },
        ]}
      >
        {header}
        {eventUnavailable || !event ? (
          <UnavailableCard />
        ) : (
          <EventFeedCard event={event} onRepostSuccess={onRepostSuccess} embedded />
        )}
        {editModal}
      </View>
    );
  }

  return (
    <View style={[styles.repostCard, { backgroundColor: colors.card }]}>
      {header}
      {post ? (
        <>
          <FeedPost post={post} onSharePress={() => setShareVisible(true)} embedded isActiveVideo={isActiveVideo} />
          {shareVisible && (
            <ShareModal
              visible={shareVisible}
              onClose={() => setShareVisible(false)}
              onRepost={handlePostRepost}
              shareUrl={`https://mooment.app/moments/${post.id}`}
              item={{
                type: 'post',
                id: post.id,
                preview: post.caption,
                imageUrl: post.mediaItems?.[0]?.uri ?? post.mediaUris?.[0],
                authorName: post.authorName,
              }}
            />
          )}
        </>
      ) : (
        <UnavailableCard />
      )}
      {editModal}
    </View>
  );
}

export default React.memo(RepostFeedCard);

const RepostHeader = React.memo(function RepostHeader({
  reposterId,
  reposterName,
  reposterAvatar,
  contextLabel,
  sharedTime,
  caption,
  taggedFriends,
  isOwnRepost,
  onEditPress,
}: {
  reposterId?: string | null;
  reposterName: string;
  reposterAvatar?: string | null;
  contextLabel: string;
  sharedTime: string;
  caption?: string | null;
  taggedFriends: MomentAuthor[];
  isOwnRepost: boolean;
  onEditPress: () => void;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const validTaggedFriends = taggedFriends.filter((friend) => getTaggedFriendName(friend));
  const moreBtnRef = useRef<View>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuTop, setMenuTop] = useState(0);

  const handleMorePress = () => {
    moreBtnRef.current?.measureInWindow((_x, y, _w, h) => {
      setMenuTop(y + h + 5);
      setShowMoreMenu(true);
    });
  };

  const openReposterProfile = () => {
    navigateToProfile(router, currentUserId, {
      userId: reposterId,
      name: reposterName,
      avatar: reposterAvatar,
    });
  };

  const openTaggedProfile = (friend: MomentAuthor) => {
    if (!friend.id) return;

    navigateToProfile(router, currentUserId, {
      userId: friend.id,
      name: getTaggedFriendName(friend),
      avatar: friend.avatarUrl,
      isFollowing: Boolean(friend.isFollowing),
    });
  };

  return (
    <View style={styles.repostHeader}>
      <TouchableOpacity activeOpacity={0.7} onPress={openReposterProfile} disabled={!reposterId}>
        <UserAvatar uri={reposterAvatar} name={reposterName} size={40} style={styles.reposterAvatar} />
      </TouchableOpacity>
      <View style={styles.repostHeaderText}>
        <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>{contextLabel}</Text>
        <Text style={[styles.reposterLine, { color: colors.text }]} numberOfLines={2}>
          <Text style={styles.reposterName} onPress={openReposterProfile} suppressHighlighting>{reposterName}</Text>
          {validTaggedFriends.length > 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              {' is with '}
              {validTaggedFriends.map((friend, index) => (
                <React.Fragment key={friend.id ?? `${getTaggedFriendName(friend)}-${index}`}>
                  {index > 0 ? (
                    <Text style={{ color: colors.textSecondary }}>
                      {index === validTaggedFriends.length - 1 ? ' and ' : ', '}
                    </Text>
                  ) : null}
                  <Text
                    style={[styles.reposterName, { color: colors.text }]}
                    onPress={() => openTaggedProfile(friend)}
                    suppressHighlighting
                  >
                    {getTaggedFriendName(friend)}
                  </Text>
                </React.Fragment>
              ))}
            </Text>
          ) : null}
        </Text>
        {Boolean(sharedTime) && <Text style={[styles.sharedTime, { color: colors.textSecondary }]}>{sharedTime}</Text>}
        {caption?.trim() ? <Text style={[styles.repostCaption, { color: colors.text }]}>{caption.trim()}</Text> : null}
      </View>
      {isOwnRepost && (
        <>
          <TouchableOpacity ref={moreBtnRef} style={styles.moreBtn} activeOpacity={0.75} onPress={handleMorePress}>
            <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {showMoreMenu && (
            <MoreMenuModal
              visible={showMoreMenu}
              onClose={() => setShowMoreMenu(false)}
              showEdit
              onEdit={onEditPress}
              top={menuTop}
            />
          )}
        </>
      )}
    </View>
  );
});

function UnavailableCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.unavailable, { borderColor: colors.border }]}>
      <Feather name="alert-circle" size={22} color={colors.textSecondary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>The original item is no longer available.</Text>
    </View>
  );
}

function EventRepostLoadingPlaceholder({ showLoadingIndicator }: { showLoadingIndicator: boolean }) {
  const { colors, isDark } = useTheme();
  const blockColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  return (
    <View
      style={[styles.eventLoadingCard, !isDark && { borderColor: colors.border }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.eventLoadingHeader}>
        <View style={[styles.eventLoadingAvatar, { backgroundColor: blockColor }]} />
        <View style={styles.eventLoadingHeaderText}>
          <View style={[styles.eventLoadingTitle, { backgroundColor: blockColor }]} />
          <View style={[styles.eventLoadingSubtitle, { backgroundColor: blockColor }]} />
        </View>
      </View>
      <View style={[styles.eventLoadingImage, { backgroundColor: blockColor }]}>
        {showLoadingIndicator ? <ActivityIndicator color={colors.primary} /> : null}
      </View>
      <View style={styles.eventLoadingActions}>
        <View style={[styles.eventLoadingAction, { backgroundColor: blockColor }]} />
        <View style={[styles.eventLoadingAction, { backgroundColor: blockColor }]} />
        <View style={[styles.eventLoadingAction, { backgroundColor: blockColor }]} />
      </View>
    </View>
  );
}

const TIME_AGO_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const formatTimeAgo = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr as string);
  const time = date.getTime();
  if (Number.isNaN(time)) return '';
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return TIME_AGO_FORMATTER.format(date);
};

const getTaggedFriendName = (friend: MomentAuthor) =>
  friend.name?.trim() || friend.username?.trim() || 'Mooment user';

const styles = StyleSheet.create({
  repostCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 12,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingBottom: 12,
  },
  reposterAvatar: {
    marginTop: 1,
  },
  repostHeaderText: {
    flex: 1,
  },
  moreBtn: {
    padding: 4,
    marginLeft: 4,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  reposterLine: {
    fontSize: 14,
    lineHeight: 19,
  },
  reposterName: {
    fontWeight: '700',
  },
  sharedTime: {
    fontSize: 12,
    marginTop: 1,
  },
  repostCaption: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  unavailable: {
    minHeight: 112,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  message: { fontSize: 13 },
  eventLoadingCard: {
    minHeight: 362,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0,
  },
  eventLoadingHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  eventLoadingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  eventLoadingHeaderText: {
    flex: 1,
    gap: 8,
  },
  eventLoadingTitle: {
    width: '46%',
    height: 12,
    borderRadius: 6,
  },
  eventLoadingSubtitle: {
    width: '28%',
    height: 10,
    borderRadius: 5,
  },
  eventLoadingImage: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventLoadingActions: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 18,
  },
  eventLoadingAction: {
    width: 42,
    height: 14,
    borderRadius: 7,
  },
});

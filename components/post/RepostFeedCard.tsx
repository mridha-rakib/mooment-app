import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EventFeedCard from '@/components/home/EventFeedCard';
import { useTheme } from '@/hooks/useTheme';
import { getEventByIdCached, type EventResponse } from '@/lib/events';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { deleteMomentShare, shareMoment, updateMomentShare, type MomentAuthor, type MomentTimelineItem, type RepostPayload } from '@/lib/moments';
import { navigateToProfile } from '@/lib/profileNavigation';
import { getStorageFileUrl } from '@/lib/storage';
import { useAuthStore } from '@/stores/authStore';
import type { TaggedFriend } from './PeopleTagModal';
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
  onShareDeleted?: (shareId: string) => void;
  showLoadingIndicator?: boolean;
  isActiveVideo?: boolean;
};

function RepostFeedCard({
  share,
  onRepostSuccess,
  onShareUpdated,
  onShareDeleted,
  showLoadingIndicator = true,
  isActiveVideo = false,
}: Props) {
  const { colors, isDark } = useTheme();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const isEvent = share.originalItem?.type === 'event';
  const [event, setEvent] = useState<EventResponse | null>(null);
  // Seed loading=true up front for an event repost that has an original event
  // id to resolve, so the FIRST committed render is the loading placeholder —
  // not the transient "unavailable" frame the old `false`→effect flip briefly
  // rendered before the fetch effect ran (it also re-flashed on every Android
  // virtualization remount). A malformed event repost with no original id
  // still starts `false` and lands on the real UnavailableCard, unchanged.
  const [eventLoading, setEventLoading] = useState(
    () => isEvent && Boolean(share.originalItem?.id),
  );
  const [eventUnavailable, setEventUnavailable] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [editCaptionVisible, setEditCaptionVisible] = useState(false);
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
  const contextLabel = isEvent ? 'shared an event' : 'shared a post';

  useEffect(() => {
    const eventId = isEvent ? share.originalItem?.id : null;
    if (!eventId) return;
    let mounted = true;
    setEventLoading(true);
    setEventUnavailable(false);
    // Cached + in-flight-deduped read (see getEventByIdCached in lib/events):
    // a repost card that scrolls out of the FlatList window and back reuses
    // the already-fetched event instead of re-issuing GET /events/:id, and two
    // reposts of the same event share one request. Same resolved event shape,
    // same unavailable/error handling below, same mounted guard.
    getEventByIdCached(eventId)
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

  const handleUpdateShare = async (shareId: string, payload: { caption: string | null; taggedFriendIds: string[] }) => {
    const updated = await updateMomentShare(shareId, payload);
    onShareUpdated?.(updated);
  };

  const handleDeleteShare = () => {
    Alert.alert(
      'Delete repost?',
      'This will remove your shared post/event. The original content will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteMomentShare(share.id);
                onShareDeleted?.(share.id);
              } catch {
                Alert.alert('Unable to delete repost', 'Please try again.');
              }
            })();
          },
        },
      ],
    );
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
      onUpdateShare={handleUpdateShare}
      item={editPreviewItem}
      editing={{
        shareId: share.id,
        caption: share.repostCaption ?? null,
        taggedFriends: (share.taggedFriends ?? []).map((friend) => toTaggedFriend(friend)),
      }}
    />
  );

  const header = (
    <RepostHeader
      variant={isEvent ? 'event' : 'post'}
      reposterId={share.sharedBy?.id}
      reposterName={reposterName}
      reposterAvatar={reposterAvatar}
      contextLabel={contextLabel}
      sharedTime={sharedTime}
      taggedFriends={share.taggedFriends ?? []}
      isOwnRepost={isOwnRepost}
      onEditPress={() => setEditCaptionVisible(true)}
      onDeletePress={handleDeleteShare}
    />
  );

  // Identical header + caption flow block for EVERY event-repost state
  // (loading, loaded, unavailable) so the row's top region contributes the
  // exact same vertical space before and after the event resolves. The
  // caption is the real `share.repostCaption` — already present in the list
  // payload — rendered with its real style, so its height/wrapping is
  // reserved during loading with no placeholder text.
  const eventHeaderArea = (
    <View style={styles.shareHeaderArea}>
      {header}
      {share.repostCaption?.trim() ? (
        <Text style={[styles.sharedEventMessage, { color: colors.text }]}>{share.repostCaption.trim()}</Text>
      ) : null}
    </View>
  );

  if (isEvent) {
    if (eventLoading) {
      return (
        <View style={styles.sharedEventWrapper}>
          {eventHeaderArea}
          <EventRepostLoadingPlaceholder showLoadingIndicator={showLoadingIndicator} />
          {editModal}
        </View>
      );
    }

    // Premium shared-event presentation: a lightweight, transparent wrapper
    // (no competing card background / outer border / heavy padding) so the
    // reused EventFeedCard below reads as the single card surface instead of
    // a card nested inside another card. The share header + optional share
    // message sit directly on the feed background above it. The EventFeedCard
    // itself — including its engagement row, which already targets the
    // ORIGINAL event's moment — is rendered untouched.
    return (
      <View style={styles.sharedEventWrapper}>
        {eventHeaderArea}
        {eventUnavailable || !event ? (
          // Light mode: colors.card === colors.background (both white), so the
          // fallback needs its own border to be visible against the page.
          <View style={[styles.sharedEventFallbackFrame, !isDark && { borderWidth: 1, borderColor: colors.border }]}>
            <UnavailableCard />
          </View>
        ) : (
          <EventFeedCard event={event} onRepostSuccess={onRepostSuccess} embedded />
        )}
        {editModal}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.repostCard,
        { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : colors.card },
        !isDark && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {header}
      {share.repostCaption?.trim() ? (
        <Text style={[styles.sharedPostMessage, { color: colors.text }]}>{share.repostCaption.trim()}</Text>
      ) : null}
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
  variant = 'post',
  reposterId,
  reposterName,
  reposterAvatar,
  contextLabel,
  sharedTime,
  taggedFriends,
  isOwnRepost,
  onEditPress,
  onDeletePress,
}: {
  variant?: 'event' | 'post';
  reposterId?: string | null;
  reposterName: string;
  reposterAvatar?: string | null;
  contextLabel: string;
  sharedTime: string;
  taggedFriends: MomentAuthor[];
  isOwnRepost: boolean;
  onEditPress: () => void;
  onDeletePress: () => void;
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

  const moreMenu = isOwnRepost ? (
    <>
      <TouchableOpacity ref={moreBtnRef} style={styles.moreBtn} activeOpacity={0.75} onPress={handleMorePress}>
        <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      {showMoreMenu && (
        <MoreMenuModal
          visible={showMoreMenu}
          onClose={() => setShowMoreMenu(false)}
          showEdit
          showDelete
          onEdit={onEditPress}
          onDelete={onDeletePress}
          top={menuTop}
        />
      )}
    </>
  ) : null;

  // Compact, premium share attribution for a shared event:
  //   [avatar]  **K Mbappe** shared an event
  //             1d ago
  // Name carries the emphasis; "shared an event" is muted. No separate
  // "Shared" heading. The optional share message is rendered by the wrapper
  // directly beneath this header (not indented under the name).
  if (variant === 'event') {
    return (
      <View style={styles.shareHeaderRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={openReposterProfile} disabled={!reposterId}>
          <UserAvatar uri={reposterAvatar} name={reposterName} size={36} style={styles.shareHeaderAvatar} />
        </TouchableOpacity>
        <View style={styles.shareHeaderText}>
          <Text style={[styles.shareHeaderLine, { color: colors.text }]} numberOfLines={2}>
            <Text style={styles.reposterName} onPress={openReposterProfile} suppressHighlighting>{reposterName}</Text>
            <Text style={{ color: colors.textSecondary }}>{` ${contextLabel}`}</Text>
            {validTaggedFriends.length > 0 ? (
              <Text style={{ color: colors.textSecondary }}>
                {' with '}
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
        </View>
        {moreMenu}
      </View>
    );
  }

  return (
    <View style={styles.shareHeaderRow}>
      <TouchableOpacity activeOpacity={0.7} onPress={openReposterProfile} disabled={!reposterId}>
        <UserAvatar uri={reposterAvatar} name={reposterName} size={36} style={styles.shareHeaderAvatar} />
      </TouchableOpacity>
      <View style={styles.shareHeaderText}>
        <Text style={[styles.shareHeaderLine, { color: colors.text }]} numberOfLines={2}>
          <Text style={styles.reposterName} onPress={openReposterProfile} suppressHighlighting>{reposterName}</Text>
          <Text style={{ color: colors.textSecondary }}>{` ${contextLabel}`}</Text>
          {validTaggedFriends.length > 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              {' with '}
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
      </View>
      {moreMenu}
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

const toTaggedFriend = (friend: MomentAuthor): TaggedFriend => ({
  id: friend.id,
  name: getTaggedFriendName(friend),
  username: friend.username,
  handle: friend.username ? `@${friend.username}` : `@${getTaggedFriendName(friend).replace(/\s+/g, '').toLowerCase()}`,
  avatar: friend.avatarUrl ?? null,
});

const styles = StyleSheet.create({
  repostCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 18,
    padding: 12,
  },
  // Shared-event presentation: transparent, no outer card fill/border. The
  // reused EventFeedCard supplies its own card surface + horizontal margin
  // (16) + bottom margin (20), so the wrapper only positions the share
  // header above it.
  sharedEventWrapper: {
    marginBottom: 0,
  },
  shareHeaderArea: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sharedEventFallbackFrame: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  shareHeaderAvatar: {
    marginTop: 1,
  },
  shareHeaderText: {
    flex: 1,
    paddingTop: 1,
  },
  shareHeaderLine: {
    fontSize: 15,
    lineHeight: 20,
  },
  moreBtn: {
    padding: 4,
    marginLeft: 4,
  },
  reposterName: {
    fontWeight: '700',
  },
  sharedTime: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  sharedEventMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  sharedPostMessage: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 14,
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
  // Reserves the embedded EventFeedCard's real in-flow (border-box) height so
  // the loading→loaded swap causes no vertical jump. Derived from the current
  // EventFeedCard styles for the embedded-repost path (no headerLabel and no
  // "liked by" row — GET /events/:id carries no socialContext):
  //   1 top border + header 64 (padV 12·2 + avatar 40)
  //   + imageContainer 250
  //   + actionBar 68 (padV 12·2 + PostInteractionBar action minHeight 44)
  //   + 1 bottom border  = 384
  // marginHorizontal/marginBottom mirror EventFeedCard's own `card` style so
  // the skeleton occupies the identical box the real card will.
  eventLoadingCard: {
    minHeight: 384,
    marginHorizontal: 16,
    marginBottom: 20,
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
    // Matches EventFeedCard's actionBar: paddingVertical 12·2 + the
    // PostInteractionBar row (action minHeight 44) = 68.
    minHeight: 68,
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

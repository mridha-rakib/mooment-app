import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import EventFeedCard from '@/components/home/EventFeedCard';
import { useTheme } from '@/hooks/useTheme';
import { getEventById, type EventResponse } from '@/lib/events';
import { mapMomentToPost } from '@/lib/momentPostMapper';
import { shareMoment, type MomentAuthor, type MomentTimelineItem, type RepostPayload } from '@/lib/moments';
import { getStorageFileUrl } from '@/lib/storage';
import UserAvatar from '../ui/UserAvatar';
import FeedPost from './FeedPost';
import ShareModal from './ShareModal';

type Props = {
  share: MomentTimelineItem;
  labelOverride?: string;
  onRepostSuccess?: () => void;
  showLoadingIndicator?: boolean;
  isActiveVideo?: boolean;
};

export default function RepostFeedCard({
  share,
  labelOverride,
  onRepostSuccess,
  showLoadingIndicator = true,
  isActiveVideo = false,
}: Props) {
  const { colors } = useTheme();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventUnavailable, setEventUnavailable] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const isEvent = share.originalItem?.type === 'event';
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

  const header = (
    <RepostHeader
      reposterName={reposterName}
      reposterAvatar={reposterAvatar}
      contextLabel={contextLabel}
      sharedTime={sharedTime}
      caption={share.repostCaption}
      taggedFriends={share.taggedFriends ?? []}
    />
  );

  if (isEvent) {
    if (eventLoading) {
      return showLoadingIndicator
        ? <ActivityIndicator style={styles.loading} color={colors.primary} />
        : <View style={styles.loadingSpacer} />;
    }

    return (
      <View style={[styles.repostCard, { backgroundColor: colors.card }]}>
        {header}
        {eventUnavailable || !event ? (
          <UnavailableCard />
        ) : (
          <EventFeedCard event={event} onRepostSuccess={onRepostSuccess} embedded />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.repostCard, { backgroundColor: colors.card }]}>
      {header}
      {post ? (
        <>
          <FeedPost post={post} onSharePress={() => setShareVisible(true)} embedded isActiveVideo={isActiveVideo} />
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
        </>
      ) : (
        <UnavailableCard />
      )}
    </View>
  );
}

function RepostHeader({
  reposterName,
  reposterAvatar,
  contextLabel,
  sharedTime,
  caption,
  taggedFriends,
}: {
  reposterName: string;
  reposterAvatar?: string | null;
  contextLabel: string;
  sharedTime: string;
  caption?: string | null;
  taggedFriends: MomentAuthor[];
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const validTaggedFriends = taggedFriends.filter((friend) => getTaggedFriendName(friend));

  const openTaggedProfile = (friend: MomentAuthor) => {
    if (!friend.id) return;

    router.push({
      pathname: '/profile-screen/user-profile',
      params: {
        userId: friend.id,
        name: getTaggedFriendName(friend),
        isFollowing: String(Boolean(friend.isFollowing)),
        ...(friend.avatarUrl ? { avatar: friend.avatarUrl } : {}),
      },
    } as any);
  };

  return (
    <View style={styles.repostHeader}>
      <UserAvatar uri={reposterAvatar} name={reposterName} size={40} style={styles.reposterAvatar} />
      <View style={styles.repostHeaderText}>
        <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>{contextLabel}</Text>
        <Text style={[styles.reposterLine, { color: colors.text }]} numberOfLines={2}>
          <Text style={styles.reposterName}>{reposterName}</Text>
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
    </View>
  );
}

function UnavailableCard() {
  const { colors } = useTheme();
  return (
    <View style={[styles.unavailable, { borderColor: colors.border }]}>
      <Feather name="alert-circle" size={22} color={colors.textSecondary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>The original item is no longer available.</Text>
    </View>
  );
}

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
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

const getTaggedFriendName = (friend: MomentAuthor) =>
  friend.name?.trim() || friend.username?.trim() || 'Mooment user';

const styles = StyleSheet.create({
  loading: { marginVertical: 36 },
  loadingSpacer: { height: 72 },
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
});

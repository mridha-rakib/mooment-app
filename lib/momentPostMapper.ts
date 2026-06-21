import type { PostData } from "@/components/post/FeedPost";
import type { Moment, MomentMediaItem } from "@/lib/moments";

const DEFAULT_AUTHOR_NAME = "Mooment User";

const AUDIO_FILE_PATTERN = /\.(aac|aiff|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm|3gp)(\?|#|$)/i;

type MomentPostMapperOptions = {
  fallbackAvatar: string;
  createdAt?: string;
  headerLabel?: string;
  storageUrlResolver?: (storageKey: string, contentType?: string | null) => string;
};

const formatMomentTimeAgo = (createdAt: string) => {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));

  if (elapsedSeconds < 60) {
    return "Just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours} hr ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
};

const formatMomentDuration = (seconds?: number | null) => {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const isAudioMediaItem = (mediaItem: MomentMediaItem) => {
  if (mediaItem.type === "audio") {
    return true;
  }

  if (mediaItem.contentType?.toLowerCase().startsWith("audio/")) {
    return true;
  }

  const storageKey = mediaItem.storageKey?.toLowerCase() ?? "";

  if (storageKey.includes("/audio/")) {
    return true;
  }

  return Boolean(mediaItem.url && AUDIO_FILE_PATTERN.test(mediaItem.url));
};

const isVisualMediaItem = (mediaItem: MomentMediaItem) => (
  mediaItem.type === "image" || mediaItem.type === "video"
);

const resolveMediaUri = (
  mediaItem: MomentMediaItem,
  storageUrlResolver?: (storageKey: string, contentType?: string | null) => string,
) => {
  if (mediaItem.storageKey && storageUrlResolver) {
    try {
      return storageUrlResolver(mediaItem.storageKey, mediaItem.contentType);
    } catch {
      return mediaItem.url ?? undefined;
    }
  }

  return mediaItem.url ?? undefined;
};

export const mapMomentToPost = (moment: Moment, options: MomentPostMapperOptions): PostData | null => {
  const authorName = moment.author?.name ?? DEFAULT_AUTHOR_NAME;
  const authorAvatar = (moment.author?.avatarKey && options.storageUrlResolver)
    ? options.storageUrlResolver(moment.author.avatarKey)
    : (moment.author?.avatarUrl ?? options.fallbackAvatar);
  const visualMedia = moment.mediaItems
    .filter(isVisualMediaItem)
    .map((mediaItem) => ({
      uri: resolveMediaUri(mediaItem, options.storageUrlResolver),
      type: mediaItem.type as "image" | "video",
    }))
    .filter((mediaItem): mediaItem is { uri: string; type: "image" | "video" } => Boolean(mediaItem.uri));
  const audioMedia = moment.mediaItems.find(isAudioMediaItem);
  const audioUri = audioMedia ? resolveMediaUri(audioMedia, options.storageUrlResolver) : undefined;
  const taggedPeople = moment.taggedPeople ?? [];
  const authorContextNodes = [
    ...(taggedPeople.length > 0
      ? [
          { text: " with ", type: "muted" as const },
          { text: taggedPeople.join(", "), type: "bold" as const },
        ]
      : []),
    ...(moment.eventTitle
      ? [
          { text: " at ", type: "muted" as const },
          { text: moment.eventTitle, type: "bold" as const },
        ]
      : []),
  ];
  const basePost = {
    id: moment.id,
    headerLabel: options.headerLabel,
    authorId: moment.author?.id ?? moment.userId,
    authorName,
    authorContextNodes,
    authorAvatar,
    isFollowing: moment.author?.isFollowing ?? false,
    timeAgo: formatMomentTimeAgo(options.createdAt ?? moment.createdAt),
    caption: moment.caption ?? undefined,
    isPublic: moment.audience === "public",
    likesCount: moment.likesCount,
    commentsCount: moment.commentsCount,
    sharesCount: moment.sharesCount,
    isLiked: moment.isLiked,
    isSaved: moment.isSaved,
  };

  if (audioMedia && visualMedia.length === 0) {
    return {
      ...basePost,
      postType: "audio",
      mediaUris: [],
      audioDetails: {
        uri: audioUri,
        duration: formatMomentDuration(audioMedia.durationSeconds),
        currentTime: "0:00",
      },
    };
  }

  if (!moment.caption && visualMedia.length === 0) {
    return null;
  }

  return {
    ...basePost,
    postType: "standard",
    mediaItems: visualMedia,
  };
};

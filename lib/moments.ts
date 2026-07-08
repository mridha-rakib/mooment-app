import { api } from "@/lib/api";

export type MomentMode = "feed" | "event";
export type MomentAudience = "public" | "friends" | "only_me";
export type MomentMediaType = "image" | "video" | "audio";
export type MomentMediaSource = "gallery" | "camera" | "upload" | "external";

export type MomentMediaItem = {
  type: MomentMediaType;
  source: MomentMediaSource;
  url?: string | null;
  storageKey?: string | null;
  contentType?: string | null;
  durationSeconds?: number | null;
};

export type MomentAuthor = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  isFollowing?: boolean;
};

export type Moment = {
  id: string;
  userId: string;
  author?: MomentAuthor | null;
  mode: MomentMode;
  caption?: string | null;
  hashtags: string[];
  audience: MomentAudience;
  taggedPeople: string[];
  eventTitle?: string | null;
  eventCode?: string | null;
  eventId?: string | null;
  mediaItems: MomentMediaItem[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MomentTimelineItem = {
  id: string;
  type: "post" | "share";
  createdAt: string;
  sharedAt?: string | null;
  moment: Moment;
  repostCaption?: string | null;
  taggedFriends?: MomentAuthor[];
  sharedBy?: MomentAuthor | null;
  originalItem?: { type: "post" | "event"; id: string };
};

export type RepostPayload = {
  caption?: string | null;
  taggedFriendIds?: string[];
  clientRequestId?: string | null;
};

export type ProfileTimeline = {
  items: MomentTimelineItem[];
  stats: {
    posts: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type MomentInteractionSummary = {
  momentId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
};

export type MomentCommentAuthor = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
};

export type MomentComment = {
  id: string;
  momentId: string;
  parentCommentId?: string | null;
  author?: MomentCommentAuthor | null;
  text: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
  replies: MomentComment[];
};

export type CreateMomentPayload = {
  mode: MomentMode;
  caption?: string | null;
  audience: MomentAudience;
  taggedPeople?: string[];
  eventTitle?: string | null;
  eventCode?: string | null;
  eventId?: string | null;
  mediaItems?: MomentMediaItem[];
};

export const getEventMoments = async (eventId: string): Promise<Moment[]> => {
  const response = await api.get(`/moments/event/${encodeURIComponent(eventId)}`);
  return (response.data?.data?.moments ?? []) as Moment[];
};

export const createMoment = async (payload: CreateMomentPayload): Promise<Moment> => {
  const response = await api.post("/moments", payload);
  const moment = response.data?.data?.moment as Moment | undefined;

  if (!moment) {
    throw new Error("The moment response was incomplete.");
  }

  return moment;
};

export const getMyMoments = async (): Promise<Moment[]> => {
  const response = await api.get("/moments/mine");

  return (response.data?.data?.moments ?? []) as Moment[];
};

export const getFeedMoments = async (options: { hashtags?: string[]; limit?: number } = {}): Promise<Moment[]> => {
  const response = await api.get("/moments", {
    params: {
      ...(options.hashtags?.length ? { hashtags: options.hashtags.join(',') } : {}),
      ...(options.limit ? { limit: options.limit } : {}),
    },
  });

  return (response.data?.data?.moments ?? []) as Moment[];
};

export const getMoment = async (momentId: string): Promise<Moment> => {
  const response = await api.get(`/moments/${encodeURIComponent(momentId)}`);
  const moment = response.data?.data?.moment as Moment | undefined;
  if (!moment) throw new Error("The moment response was incomplete.");
  return moment;
};

export const getHashtagMoments = async (hashtag: string, limit = 100): Promise<Moment[]> => {
  const response = await api.get(`/moments/hashtags/${encodeURIComponent(hashtag)}`, { params: { limit } });
  return (response.data?.data?.moments ?? []) as Moment[];
};

export const getProfileTimeline = async (
  userId: string,
  options: { page?: number; limit?: number } = {},
): Promise<ProfileTimeline> => {
  const response = await api.get(`/moments/profile/${encodeURIComponent(userId)}/timeline`, { params: options });
  const data = response.data?.data as ProfileTimeline | undefined;

  return {
    items: data?.items ?? [],
    stats: {
      posts: data?.stats?.posts ?? 0,
    },
    pagination: data?.pagination ?? response.data?.meta?.pagination,
  };
};

export const shareMoment = async (momentId: string, payload: RepostPayload = {}): Promise<MomentTimelineItem> => {
  const response = await api.post(`/moments/${encodeURIComponent(momentId)}/share`, payload);
  const share = response.data?.data?.share as MomentTimelineItem | undefined;

  if (!share) {
    throw new Error("The share response was incomplete.");
  }

  return share;
};

export const getFeedReposts = async (limit = 50): Promise<MomentTimelineItem[]> => {
  const response = await api.get("/moments/shares/feed", { params: { limit } });
  const shares = response.data?.data?.shares;
  return Array.isArray(shares) ? (shares as MomentTimelineItem[]) : [];
};

export const deleteMoment = async (momentId: string): Promise<void> => {
  await api.delete(`/moments/${encodeURIComponent(momentId)}`);
};

export const toggleMomentReaction = async (momentId: string): Promise<MomentInteractionSummary> => {
  const response = await api.post(`/moments/${encodeURIComponent(momentId)}/reaction`);
  const summary = response.data?.data?.summary as MomentInteractionSummary | undefined;

  if (!summary) {
    throw new Error("The reaction response was incomplete.");
  }

  return summary;
};

export const toggleCommentReaction = async (
  momentId: string,
  commentId: string,
): Promise<{ isLiked: boolean; likesCount: number }> => {
  const response = await api.post(
    `/moments/${encodeURIComponent(momentId)}/comments/${encodeURIComponent(commentId)}/reaction`,
  );
  const data = response.data?.data as { isLiked: boolean; likesCount: number } | undefined;

  if (!data) {
    throw new Error("The comment reaction response was incomplete.");
  }

  return data;
};

export const getMomentComments = async (momentId: string): Promise<MomentComment[]> => {
  const response = await api.get(`/moments/${encodeURIComponent(momentId)}/comments`);

  return (response.data?.data?.comments ?? []) as MomentComment[];
};

export type MomentSaveSummary = {
  momentId: string;
  isSaved: boolean;
};

export const toggleMomentSave = async (momentId: string): Promise<MomentSaveSummary> => {
  const response = await api.post(`/moments/${encodeURIComponent(momentId)}/save`);
  const summary = response.data?.data?.summary as MomentSaveSummary | undefined;

  if (!summary) {
    throw new Error("The save response was incomplete.");
  }

  return summary;
};

export const getSavedMoments = async (): Promise<Moment[]> => {
  const response = await api.get("/moments/saved");

  return (response.data?.data?.moments ?? []) as Moment[];
};

let _pendingNewMoment: Moment | null = null;

export const setPendingNewMoment = (moment: Moment): void => {
  _pendingNewMoment = moment;
};

export const consumePendingNewMoment = (): Moment | null => {
  const moment = _pendingNewMoment;
  _pendingNewMoment = null;
  return moment;
};

export const createMomentComment = async (
  momentId: string,
  payload: {
    text: string;
    parentCommentId?: string | null;
  },
): Promise<{ comment: MomentComment; summary: MomentInteractionSummary }> => {
  const response = await api.post(`/moments/${encodeURIComponent(momentId)}/comments`, payload);
  const comment = response.data?.data?.comment as MomentComment | undefined;
  const summary = response.data?.data?.summary as MomentInteractionSummary | undefined;

  if (!comment || !summary) {
    throw new Error("The comment response was incomplete.");
  }

  return {
    comment,
    summary,
  };
};

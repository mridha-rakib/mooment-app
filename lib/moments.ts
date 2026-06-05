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
  audience: MomentAudience;
  taggedPeople: string[];
  eventTitle?: string | null;
  eventCode?: string | null;
  mediaItems: MomentMediaItem[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MomentTimelineItem = {
  id: string;
  type: "post" | "share";
  createdAt: string;
  sharedAt?: string | null;
  moment: Moment;
};

export type ProfileTimeline = {
  items: MomentTimelineItem[];
  stats: {
    posts: number;
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
  mediaItems?: MomentMediaItem[];
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

export const getFeedMoments = async (): Promise<Moment[]> => {
  const response = await api.get("/moments");

  return (response.data?.data?.moments ?? []) as Moment[];
};

export const getProfileTimeline = async (userId: string): Promise<ProfileTimeline> => {
  const response = await api.get(`/moments/profile/${encodeURIComponent(userId)}/timeline`);
  const data = response.data?.data as ProfileTimeline | undefined;

  return {
    items: data?.items ?? [],
    stats: {
      posts: data?.stats?.posts ?? 0,
    },
  };
};

export const shareMoment = async (momentId: string): Promise<MomentTimelineItem> => {
  const response = await api.post(`/moments/${encodeURIComponent(momentId)}/share`);
  const share = response.data?.data?.share as MomentTimelineItem | undefined;

  if (!share) {
    throw new Error("The share response was incomplete.");
  }

  return share;
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

export const getMomentComments = async (momentId: string): Promise<MomentComment[]> => {
  const response = await api.get(`/moments/${encodeURIComponent(momentId)}/comments`);

  return (response.data?.data?.comments ?? []) as MomentComment[];
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

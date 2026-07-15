import { api } from "@/lib/api";

export const EVENT_WINDOW_CONTENT_TYPES = ["text", "image", "video", "audio"] as const;

export type EventWindowContentType = (typeof EVENT_WINDOW_CONTENT_TYPES)[number];
export type EventWindowComputedStatus = "scheduled" | "open" | "closed" | "cancelled";
export type EventWindowMediaSource = "gallery" | "camera" | "upload" | "external";

export type EventWindow = {
  id: string;
  eventId: string;
  hostUserId: string;
  title?: string | null;
  details?: string | null;
  startsAt: string;
  endsAt: string;
  allowedContentTypes: EventWindowContentType[];
  maxPosts: number;
  acceptedPostCount: number;
  status: "scheduled" | "cancelled";
  computedStatus: EventWindowComputedStatus;
  cancelledAt?: string | null;
  hasAttended: boolean;
  hasPosted: boolean;
  canPost: boolean;
  canViewPosts: boolean;
  remainingSlots: number;
  createdAt: string;
  updatedAt: string;
};

export type EventWindowPostMedia = {
  type: Exclude<EventWindowContentType, "text">;
  source: EventWindowMediaSource;
  url?: string | null;
  contentType?: string | null;
  durationSeconds?: number | null;
};

export type EventWindowPost = {
  id: string;
  eventId: string;
  windowId: string;
  userId: string;
  contentType: EventWindowContentType;
  text?: string | null;
  mediaItems: EventWindowPostMedia[];
  status: "accepted" | "removed";
  createdAt: string;
  updatedAt: string;
};

export type EventWindowPostsPage = {
  posts: EventWindowPost[];
  nextCursor: string | null;
};

export type CreateEventWindowPostPayload = {
  contentType: EventWindowContentType;
  text?: string | null;
  mediaItems?: (EventWindowPostMedia & { storageKey?: string | null })[];
};

export type EventWindowPayload = {
  title?: string | null;
  details?: string | null;
  startsAt: string;
  endsAt: string;
  allowedContentTypes: EventWindowContentType[];
  maxPosts: number;
};

const getWindowFromResponse = (response: unknown): EventWindow => {
  const window = (response as { data?: { data?: { window?: EventWindow } } })?.data?.data?.window;

  if (!window) {
    throw new Error("The event window response was incomplete.");
  }

  return window;
};

const resolveApiUrl = (url?: string | null) => {
  if (!url || /^https?:\/\//i.test(url)) {
    return url ?? null;
  }

  const baseURL = api.defaults.baseURL?.replace(/\/$/, "");
  return baseURL ? `${baseURL}${url.startsWith("/") ? url : `/${url}`}` : url;
};

const normalizePostMediaUrls = (post: EventWindowPost): EventWindowPost => ({
  ...post,
  mediaItems: post.mediaItems.map((mediaItem) => ({
    ...mediaItem,
    url: resolveApiUrl(mediaItem.url),
  })),
});

export const getEventWindows = async (eventId: string): Promise<EventWindow[]> => {
  const response = await api.get(`/events/${eventId}/windows`);
  const windows = (response as { data?: { data?: { windows?: EventWindow[] } } })?.data?.data?.windows;

  if (!Array.isArray(windows)) {
    throw new Error("The event windows response was incomplete.");
  }

  return windows;
};

export const createEventWindow = async (
  eventId: string,
  payload: EventWindowPayload,
): Promise<EventWindow> => getWindowFromResponse(await api.post(`/events/${eventId}/windows`, payload));

export const updateEventWindow = async (
  eventId: string,
  windowId: string,
  payload: Partial<EventWindowPayload>,
): Promise<EventWindow> => getWindowFromResponse(
  await api.patch(`/events/${eventId}/windows/${windowId}`, payload),
);

export const cancelEventWindow = async (eventId: string, windowId: string): Promise<EventWindow> =>
  getWindowFromResponse(await api.post(`/events/${eventId}/windows/${windowId}/cancel`));

export const createEventWindowPost = async (
  eventId: string,
  windowId: string,
  payload: CreateEventWindowPostPayload,
): Promise<EventWindowPost> => {
  const response = await api.post(`/events/${eventId}/windows/${windowId}/posts`, payload);
  const post = (response as { data?: { data?: { post?: EventWindowPost } } })?.data?.data?.post;

  if (!post) {
    throw new Error("The event window post response was incomplete.");
  }

  return normalizePostMediaUrls(post);
};

export const getEventWindowPosts = async (
  eventId: string,
  windowId: string,
  options: { limit?: number; cursor?: string | null } = {},
): Promise<EventWindowPostsPage> => {
  const response = await api.get(`/events/${eventId}/windows/${windowId}/posts`, {
    params: {
      limit: options.limit ?? 20,
      ...(options.cursor ? { cursor: options.cursor } : {}),
    },
  });
  const data = (response as { data?: { data?: { posts?: EventWindowPost[]; nextCursor?: string | null } } })?.data?.data;
  const posts = data?.posts;

  if (!Array.isArray(posts)) {
    throw new Error("The event window posts response was incomplete.");
  }

  return {
    posts: posts.map(normalizePostMediaUrls),
    nextCursor: data?.nextCursor ?? null,
  };
};

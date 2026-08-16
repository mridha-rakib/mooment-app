import { api } from "@/lib/api";
import type { EventImageDisplay } from "@/lib/events";

export const EVENT_WINDOW_CONTENT_TYPES = ["text", "image", "video", "audio"] as const;

export type EventWindowContentType = (typeof EVENT_WINDOW_CONTENT_TYPES)[number];
export type EventWindowComputedStatus = "scheduled" | "open" | "closed" | "cancelled";
export type EventWindowMediaSource = "gallery" | "camera" | "upload" | "external";

// Who may post: any current valid ticket holder (no check-in required), or
// only attendees who have actually been scanned in.
export const EVENT_WINDOW_POSTING_ELIGIBILITIES = ["ticket_holders", "checked_in_attendees"] as const;
export type EventWindowPostingEligibility = (typeof EVENT_WINDOW_POSTING_ELIGIBILITIES)[number];

// When a participant who has posted can see everyone else's accepted posts
// in that same window.
export const EVENT_WINDOW_PARTICIPANT_POST_VISIBILITIES = ["instant", "end_of_event"] as const;
export type EventWindowParticipantPostVisibility = (typeof EVENT_WINDOW_PARTICIPANT_POST_VISIBILITIES)[number];

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
  postingEligibility: EventWindowPostingEligibility;
  participantPostVisibility: EventWindowParticipantPostVisibility;
  cancelledAt?: string | null;
  hasAttended: boolean;
  hasPosted: boolean;
  isEligibleToPost: boolean;
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
  // Create-time only — the backend rejects these on an edit (PATCH), since
  // changing them after posts exist would silently alter rights a
  // participant already relied on when they posted.
  postingEligibility: EventWindowPostingEligibility;
  participantPostVisibility: EventWindowParticipantPostVisibility;
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

export type UpdateEventWindowPayload = Partial<Omit<EventWindowPayload, "postingEligibility" | "participantPostVisibility">>;

export const updateEventWindow = async (
  eventId: string,
  windowId: string,
  payload: UpdateEventWindowPayload,
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

// Navigation metadata only, never post content — see the backend's
// listParticipatedEvents. The gallery screen independently re-verifies
// access when it calls getEventWindowPosts; canViewPosts here is a UI hint
// only (drives the locked/unlocked card state), never trusted as
// authorization.
export type ParticipatedWindow = {
  id: string;
  title?: string | null;
  details?: string | null;
  startsAt: string;
  endsAt: string;
  computedStatus: EventWindowComputedStatus;
  participantPostVisibility: EventWindowParticipantPostVisibility;
  canViewPosts: boolean;
  lastParticipatedAt: string;
};

export type ParticipatedEvent = {
  id: string;
  name: string;
  bannerImageKey?: string | null;
  bannerImageDisplay?: EventImageDisplay | null;
  scheduledAt?: string | null;
  endAt?: string | null;
  status: string;
  participatedWindows: ParticipatedWindow[];
  lastParticipatedAt: string;
};

export const getParticipatedEvents = async (limit = 20): Promise<ParticipatedEvent[]> => {
  const response = await api.get("/events/windows/participated", { params: { limit } });
  const events = (response as { data?: { data?: { events?: ParticipatedEvent[] } } })?.data?.data?.events;

  if (!Array.isArray(events)) {
    throw new Error("The participated events response was incomplete.");
  }

  return events;
};

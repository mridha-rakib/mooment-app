import { api } from "@/lib/api";
import type { EventCategory } from "@/constants/eventCategories";
import { getMyTicketWallet, type TicketWalletItem } from "@/lib/payments";

export type EventStatus = "draft" | "published" | "live" | "completed" | "cancelled";
export type EventAgeRestriction = "all_ages" | "18_plus" | "21_plus";
export type EventPrivacy = "public" | "locked" | "private";
export type EventTicketType = "free" | "pay";
export type EventRewardType = "ticket" | "product";

export type EventLocation = {
  searchLabel?: string | null;
  venue?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  additionalInfo?: string | null;
};

export type EventTicketPayload = {
  id?: string;
  name: string;
  description?: string | null;
  salesEndAt?: string | null;
  type: EventTicketType;
  price: number;
  capacity: number;
  availableCount?: number | null;
};

export type EventTicketRequestPayload = Omit<EventTicketPayload, "availableCount">;

export type EventRewardPayload = {
  id?: string;
  rewardType: EventRewardType;
  ticketId?: string | null;
  productId?: string | null;
  targetName?: string | null;
  imageKeys?: string[];
  name: string;
  description?: string | null;
  expiresAt?: string | null;
  discountPercent: number;
  buyQuantity: number;
  freeQuantity: number;
  capacity: number;
};

export type EventHost = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  followersCount?: number;
  eventsCount?: number;
  isFollowing?: boolean;
};

export type EventMemberResponse = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
};

export type JoinRequestStatus = "pending" | "accepted" | "declined";

export type JoinRequest = {
  userId: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
  status: JoinRequestStatus;
  createdAt: string;
};

export type EventImageDisplay = {
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
};

export type EventPayload = {
  name?: string | null;
  description?: string | null;
  bannerImageKey?: string | null;
  bannerOriginalImageKey?: string | null;
  bannerImageDisplay?: EventImageDisplay | null;
  ageRestriction?: EventAgeRestriction | null;
  category?: EventCategory | null;
  categories?: EventCategory[];
  scheduledAt?: string | null;
  endAt?: string | null;
  location?: EventLocation | null;
  tickets?: EventTicketRequestPayload[];
  privacy?: EventPrivacy;
};

export type PublishedEventPayload = EventPayload & {
  name: string;
  ageRestriction: EventAgeRestriction;
  categories: EventCategory[];
  scheduledAt: string;
  endAt: string;
  location: EventLocation;
  tickets: EventTicketRequestPayload[];
  privacy: EventPrivacy;
};

export type EventResponse = {
  id: string;
  userId: string;
  host?: EventHost | null;
  interactionMomentId?: string;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  status: EventStatus;
  name?: string | null;
  description?: string | null;
  bannerImageKey?: string | null;
  bannerOriginalImageKey?: string | null;
  bannerImageDisplay?: EventImageDisplay | null;
  ageRestriction?: EventAgeRestriction | null;
  category?: EventCategory | null;
  categories: EventCategory[];
  scheduledAt?: string | null;
  endAt?: string | null;
  location?: EventLocation | null;
  tickets: EventTicketPayload[];
  rewards: EventRewardPayload[];
  privacy: EventPrivacy;
  memberCount?: number;
  isMember?: boolean;
  myJoinRequestStatus?: JoinRequestStatus | null;
  hostReviewEligibility?: {
    canReview: boolean;
    hasReviewed: boolean;
  };
  publishedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const ticketAlreadyHasReward = (
  rewards: EventRewardPayload[] | null | undefined,
  ticketId: string,
  excludeRewardId?: string | null,
): boolean => (rewards ?? []).some((reward) => (
  reward.id !== excludeRewardId
  && reward.rewardType === "ticket"
  && reward.ticketId === ticketId
));

export type EventMapQuery = {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
};

export type EventFeedQuery = {
  category?: EventCategory | string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
};

export type NowEventStatus = "live_now" | "starting_soon" | "last_call";

export type NowModeEventResponse = EventResponse & {
  nowStatus: NowEventStatus;
};

export type NowModeQuery = {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
};

export type RewardClaim = {
  id: string;
  userId: string;
  eventId: string;
  rewardId: string;
  claimedAt: string;
  createdAt: string;
};

export type ProfileEventGroups = {
  active: EventResponse[];
  past: EventResponse[];
};

export type EventHostReviewResponse = {
  id: string;
  author: {
    id: string;
    name: string;
    username?: string;
    avatarKey?: string | null;
    avatarUrl?: string | null;
  } | null;
  text: string;
  liked: boolean;
  event?: {
    id: string;
    name?: string | null;
  } | null;
  createdAt: string;
};

export type PostTagEventStatus = "live" | "active" | "upcoming";

export type PostTagEvent = {
  id: string;
  name: string;
  bannerImageUrl?: string | null;
  scheduledAt: string;
  location?: EventLocation | null;
  postTagStatus: PostTagEventStatus;
};

const getEventFromResponse = (response: unknown): EventResponse => {
  const event = (response as { data?: { data?: { event?: EventResponse } } })?.data?.data?.event;

  if (!event) {
    throw new Error("The event response was incomplete.");
  }

  return event;
};

const getEventsFromResponse = (response: unknown): EventResponse[] => {
  const events = (response as { data?: { data?: { events?: EventResponse[] } } })?.data?.data?.events;

  return Array.isArray(events) ? events : [];
};

export const saveEventDraft = async (payload: EventPayload, eventId?: string | null): Promise<EventResponse> => {
  const response = eventId
    ? await api.patch(`/events/drafts/${encodeURIComponent(eventId)}`, payload)
    : await api.post("/events/drafts", payload);

  return getEventFromResponse(response);
};

export const publishEvent = async (payload: PublishedEventPayload, eventId?: string | null): Promise<EventResponse> => {
  const response = eventId
    ? await api.post(`/events/${encodeURIComponent(eventId)}/publish`, payload)
    : await api.post("/events/publish", payload);

  return getEventFromResponse(response);
};

export const updateEvent = async (eventId: string, payload: EventPayload): Promise<EventResponse> => {
  const response = await api.patch(`/events/${encodeURIComponent(eventId)}`, payload);

  return getEventFromResponse(response);
};

export const deleteEvent = async (eventId: string): Promise<EventResponse> => {
  const response = await api.delete(`/events/${encodeURIComponent(eventId)}`);

  return getEventFromResponse(response);
};

export const getEventTicket = async (eventId: string, ticketId: string): Promise<EventResponse> => {
  const response = await api.get(
    `/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}`,
  );

  return getEventFromResponse(response);
};

export const createEventTicket = async (
  eventId: string,
  payload: EventTicketRequestPayload,
): Promise<EventResponse> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/tickets`, payload);

  return getEventFromResponse(response);
};

export const updateEventTicket = async (
  eventId: string,
  ticketId: string,
  payload: Partial<Omit<EventTicketRequestPayload, "id">>,
): Promise<EventResponse> => {
  const response = await api.patch(
    `/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}`,
    payload,
  );

  return getEventFromResponse(response);
};

export const deleteEventTicket = async (eventId: string, ticketId: string): Promise<EventResponse> => {
  const response = await api.delete(
    `/events/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}`,
  );

  return getEventFromResponse(response);
};

export const createEventReward = async (
  eventId: string,
  payload: EventRewardPayload,
): Promise<EventResponse> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/rewards`, payload);

  return getEventFromResponse(response);
};

export const updateEventReward = async (
  eventId: string,
  rewardId: string,
  payload: Partial<Omit<EventRewardPayload, "id">>,
): Promise<EventResponse> => {
  const response = await api.patch(
    `/events/${encodeURIComponent(eventId)}/rewards/${encodeURIComponent(rewardId)}`,
    payload,
  );

  return getEventFromResponse(response);
};

export const deleteEventReward = async (eventId: string, rewardId: string): Promise<EventResponse> => {
  const response = await api.delete(
    `/events/${encodeURIComponent(eventId)}/rewards/${encodeURIComponent(rewardId)}`,
  );

  return getEventFromResponse(response);
};

export const createDraftTicket = async (
  eventId: string,
  payload: EventTicketRequestPayload,
): Promise<EventResponse> => {
  const response = await api.post(`/events/drafts/${encodeURIComponent(eventId)}/tickets`, payload);

  return getEventFromResponse(response);
};

export const updateDraftTicket = async (
  eventId: string,
  ticketId: string,
  payload: Partial<Omit<EventTicketRequestPayload, "id">>,
): Promise<EventResponse> => {
  const response = await api.patch(
    `/events/drafts/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}`,
    payload,
  );

  return getEventFromResponse(response);
};

export const deleteDraftTicket = async (eventId: string, ticketId: string): Promise<EventResponse> => {
  const response = await api.delete(
    `/events/drafts/${encodeURIComponent(eventId)}/tickets/${encodeURIComponent(ticketId)}`,
  );

  return getEventFromResponse(response);
};

export const createDraftReward = async (
  eventId: string,
  payload: EventRewardPayload,
): Promise<EventResponse> => {
  const response = await api.post(`/events/drafts/${encodeURIComponent(eventId)}/rewards`, payload);

  return getEventFromResponse(response);
};

export const updateDraftReward = async (
  eventId: string,
  rewardId: string,
  payload: Partial<Omit<EventRewardPayload, "id">>,
): Promise<EventResponse> => {
  const response = await api.patch(
    `/events/drafts/${encodeURIComponent(eventId)}/rewards/${encodeURIComponent(rewardId)}`,
    payload,
  );

  return getEventFromResponse(response);
};

export const deleteDraftReward = async (eventId: string, rewardId: string): Promise<EventResponse> => {
  const response = await api.delete(
    `/events/drafts/${encodeURIComponent(eventId)}/rewards/${encodeURIComponent(rewardId)}`,
  );

  return getEventFromResponse(response);
};

export const getEventById = async (eventId: string): Promise<EventResponse> => {
  const response = await api.get(`/events/${encodeURIComponent(eventId)}`);

  return getEventFromResponse(response);
};

export const submitEventHostReview = async (
  eventId: string,
  payload: { liked: boolean; text?: string | null },
): Promise<EventHostReviewResponse> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/host-reviews`, payload);
  const review = response.data?.data?.review as EventHostReviewResponse | undefined;

  if (!review) {
    throw new Error("The review response was incomplete.");
  }

  return review;
};

export const getMyEvents = async (): Promise<EventResponse[]> => {
  const response = await api.get("/events/mine");
  return getEventsFromResponse(response);
};

export const getMyDraftEvents = async (): Promise<EventResponse[]> => {
  const response = await api.get("/events/mine/drafts");
  return getEventsFromResponse(response);
};

export const getFeedEvents = async (params: EventFeedQuery = {}): Promise<EventResponse[]> => {
  const response = await api.get("/events/feed", { params });
  return getEventsFromResponse(response);
};

export const getMyPostTagEvents = async (): Promise<PostTagEvent[]> => {
  const response = await api.get("/events/mine/post-tag");
  const events = response.data?.data?.events;
  return Array.isArray(events) ? (events as PostTagEvent[]) : [];
};

export const getEventTicketAccess = async (eventId: string): Promise<{ hasAccess: boolean }> => {
  const response = await api.get(`/events/${encodeURIComponent(eventId)}/ticket-access`);
  const access = response.data?.data?.access as { hasAccess: boolean } | undefined;
  return access ?? { hasAccess: false };
};

export const getMyProfileEvents = async (): Promise<ProfileEventGroups> => {
  const response = await api.get("/events/mine/profile");
  const events = response.data?.data?.events;

  return {
    active: Array.isArray(events?.active) ? (events.active as EventResponse[]) : [],
    past: Array.isArray(events?.past) ? (events.past as EventResponse[]) : [],
  };
};

const ticketWalletEventToEventResponse = (walletItem: TicketWalletItem): EventResponse | null => {
  const walletEvent = walletItem.event;

  if (!walletEvent?.id) {
    return null;
  }

  return {
    id: walletEvent.id,
    userId: walletEvent.host?.id ?? "",
    host: walletEvent.host
      ? {
          id: walletEvent.host.id,
          name: walletEvent.host.name,
          username: walletEvent.host.username,
          avatarKey: walletEvent.host.avatarKey ?? null,
        }
      : null,
    status: walletEvent.status as EventStatus,
    name: walletEvent.name ?? null,
    bannerImageKey: walletEvent.bannerImageKey ?? null,
    bannerOriginalImageKey: walletEvent.bannerOriginalImageKey ?? null,
    categories: [],
    scheduledAt: walletEvent.scheduledAt ?? null,
    endAt: walletEvent.endAt ?? null,
    location: walletEvent.location ?? null,
    tickets: [],
    rewards: [],
    privacy: "locked",
    createdAt: walletItem.purchasedAt ?? walletEvent.scheduledAt ?? new Date(0).toISOString(),
    updatedAt: walletItem.purchasedAt ?? walletEvent.scheduledAt ?? new Date(0).toISOString(),
  };
};

export const getProfileEventsCount = (events: ProfileEventGroups): number => {
  const eventIds = new Set([...events.active, ...events.past].map((event) => event.id));
  return eventIds.size;
};

export const getMyTicketWalletEvents = async (): Promise<EventResponse[]> => {
  const walletItems = await getMyTicketWallet();
  const eventById = new Map<string, EventResponse>();

  for (const event of walletItems.map(ticketWalletEventToEventResponse)) {
    if (event && !eventById.has(event.id)) {
      eventById.set(event.id, event);
    }
  }

  return [...eventById.values()];
};

export const getProfileEvents = async (userId: string): Promise<ProfileEventGroups> => {
  const response = await api.get(`/events/profile/${encodeURIComponent(userId)}`);
  const events = response.data?.data?.events;

  return {
    active: Array.isArray(events?.active) ? (events.active as EventResponse[]) : [],
    past: Array.isArray(events?.past) ? (events.past as EventResponse[]) : [],
  };
};

export const getMapEvents = async (params: EventMapQuery = {}): Promise<EventResponse[]> => {
  const response = await api.get("/events/map", { params });
  const events = response.data?.data?.events;

  return Array.isArray(events) ? (events as EventResponse[]) : [];
};

export const getNowModeEvents = async (params: NowModeQuery = {}): Promise<NowModeEventResponse[]> => {
  const response = await api.get("/events/now", { params });
  const events = response.data?.data?.events;

  return Array.isArray(events) ? (events as NowModeEventResponse[]) : [];
};

export const claimEventReward = async (eventId: string, rewardId: string): Promise<RewardClaim> => {
  const response = await api.post(
    `/events/${encodeURIComponent(eventId)}/rewards/${encodeURIComponent(rewardId)}/claim`,
  );
  const claim = (response as { data?: { data?: { claim?: RewardClaim } } })?.data?.data?.claim;

  if (!claim) {
    throw new Error("The claim response was incomplete.");
  }

  return claim;
};

export const getMyEventRewardClaims = async (eventId: string): Promise<RewardClaim[]> => {
  const response = await api.get(`/events/${encodeURIComponent(eventId)}/rewards/claims`);
  const claims = (response as { data?: { data?: { claims?: RewardClaim[] } } })?.data?.data?.claims;

  return Array.isArray(claims) ? claims : [];
};

const getMembersFromResponse = (response: unknown): EventMemberResponse[] => {
  const members = (response as { data?: { data?: { members?: EventMemberResponse[] } } })?.data?.data?.members;
  return Array.isArray(members) ? members : [];
};

export const getEventMembers = async (eventId: string): Promise<EventMemberResponse[]> => {
  const response = await api.get(`/events/${encodeURIComponent(eventId)}/members`);
  return getMembersFromResponse(response);
};

export const addEventMember = async (eventId: string, userId: string): Promise<EventMemberResponse[]> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/members`, { userId });
  return getMembersFromResponse(response);
};

export const removeEventMember = async (eventId: string, userId: string): Promise<EventMemberResponse[]> => {
  const response = await api.delete(`/events/${encodeURIComponent(eventId)}/members/${encodeURIComponent(userId)}`);
  return getMembersFromResponse(response);
};

export type EventSaveSummary = {
  eventId: string;
  isSaved: boolean;
};

export const toggleEventSave = async (eventId: string): Promise<EventSaveSummary> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/save`);
  const summary = response.data?.data?.summary as EventSaveSummary | undefined;

  if (!summary) {
    throw new Error("The save response was incomplete.");
  }

  return summary;
};

export const startEvent = async (eventId: string): Promise<EventResponse> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/start`);
  return getEventFromResponse(response);
};

export const completeEvent = async (eventId: string): Promise<EventResponse> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/complete`);
  return getEventFromResponse(response);
};

export const cancelEvent = async (eventId: string): Promise<EventResponse> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/cancel`);
  return getEventFromResponse(response);
};

export const submitJoinRequest = async (eventId: string): Promise<{ status: JoinRequestStatus }> => {
  const response = await api.post(`/events/${encodeURIComponent(eventId)}/join-requests`);
  const data = (response as { data?: { data?: { status?: JoinRequestStatus } } })?.data?.data;
  return { status: data?.status ?? "pending" };
};

export const getJoinRequests = async (eventId: string): Promise<JoinRequest[]> => {
  const response = await api.get(`/events/${encodeURIComponent(eventId)}/join-requests`);
  const requests = (response as { data?: { data?: { requests?: JoinRequest[] } } })?.data?.data?.requests;
  return Array.isArray(requests) ? requests : [];
};

export const acceptJoinRequest = async (eventId: string, requestUserId: string): Promise<void> => {
  await api.post(
    `/events/${encodeURIComponent(eventId)}/join-requests/${encodeURIComponent(requestUserId)}/accept`,
  );
};

export const declineJoinRequest = async (eventId: string, requestUserId: string): Promise<void> => {
  await api.post(
    `/events/${encodeURIComponent(eventId)}/join-requests/${encodeURIComponent(requestUserId)}/decline`,
  );
};

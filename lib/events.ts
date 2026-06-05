import { api } from "@/lib/api";
import type { EventCategory } from "@/constants/eventCategories";

export type EventStatus = "draft" | "published";
export type EventAgeRestriction = "all_ages" | "18_plus" | "21_plus";
export type EventPrivacy = "public" | "private";
export type EventTicketType = "free" | "pay";

export type EventLocation = {
  searchLabel?: string | null;
  venue?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type EventTicketPayload = {
  name: string;
  description?: string | null;
  salesEndAt?: string | null;
  type: EventTicketType;
  price: number;
  capacity: number;
};

export type EventHost = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
};

export type EventPayload = {
  name?: string | null;
  description?: string | null;
  bannerImageKey?: string | null;
  ageRestriction?: EventAgeRestriction | null;
  category?: EventCategory | null;
  scheduledAt?: string | null;
  location?: EventLocation | null;
  tickets?: EventTicketPayload[];
  privacy?: EventPrivacy;
};

export type PublishedEventPayload = EventPayload & {
  name: string;
  ageRestriction: EventAgeRestriction;
  category: EventCategory;
  scheduledAt: string;
  location: EventLocation;
  tickets: EventTicketPayload[];
  privacy: EventPrivacy;
};

export type EventResponse = {
  id: string;
  userId: string;
  host?: EventHost | null;
  status: EventStatus;
  name?: string | null;
  description?: string | null;
  bannerImageKey?: string | null;
  ageRestriction?: EventAgeRestriction | null;
  category?: EventCategory | null;
  scheduledAt?: string | null;
  location?: EventLocation | null;
  tickets: EventTicketPayload[];
  privacy: EventPrivacy;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventMapQuery = {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  limit?: number;
};

const getEventFromResponse = (response: unknown): EventResponse => {
  const event = (response as { data?: { data?: { event?: EventResponse } } })?.data?.data?.event;

  if (!event) {
    throw new Error("The event response was incomplete.");
  }

  return event;
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

export const getMyEvents = async (): Promise<EventResponse[]> => {
  const response = await api.get("/events/mine");
  const events = response.data?.data?.events;

  return Array.isArray(events) ? (events as EventResponse[]) : [];
};

export const getMapEvents = async (params: EventMapQuery = {}): Promise<EventResponse[]> => {
  const response = await api.get("/events/map", { params });
  const events = response.data?.data?.events;

  return Array.isArray(events) ? (events as EventResponse[]) : [];
};

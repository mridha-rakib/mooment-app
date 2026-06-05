import { create } from "zustand";
import type { EventCategory } from "@/constants/eventCategories";
import { publishEvent, saveEventDraft } from "@/lib/events";
import type {
  EventAgeRestriction,
  EventLocation,
  EventPayload,
  EventPrivacy,
  EventResponse,
  EventTicketPayload,
} from "@/lib/events";
import { uploadFileToStorage } from "@/lib/storage";

export type EventDraftTicket = EventTicketPayload & {
  localId: string;
};

type EventDraftState = {
  draftId: string | null;
  name: string;
  description: string;
  bannerImageUri: string | null;
  bannerImageKey: string | null;
  ageRestriction: EventAgeRestriction;
  category: EventCategory | null;
  scheduledAt: string;
  location: EventLocation;
  tickets: EventDraftTicket[];
  privacy: EventPrivacy;
  setStepOne: (payload: { name: string; description: string; bannerImageUri: string | null }) => void;
  setStepTwo: (payload: { ageRestriction: EventAgeRestriction; category: EventCategory | null; scheduledAt: string }) => void;
  setStepThree: (payload: { location: EventLocation }) => void;
  setPrivacy: (privacy: EventPrivacy) => void;
  upsertTicket: (ticket: Partial<EventDraftTicket>) => void;
  deleteTicket: (localId: string) => void;
  saveDraft: () => Promise<EventResponse>;
  publish: () => Promise<EventResponse>;
  resetDraft: () => void;
};

const DEFAULT_TICKET_ID = "default-general-ticket";

const createDefaultTicket = (): EventDraftTicket => ({
  capacity: 42,
  description: "Entry from 9pm. Standing only.",
  localId: DEFAULT_TICKET_ID,
  name: "General Ticket",
  price: 45,
  salesEndAt: new Date("2023-09-09T16:00:00").toISOString(),
  type: "pay",
});

const createInitialState = () => ({
  draftId: null,
  name: "",
  description: "",
  bannerImageUri: null,
  bannerImageKey: null,
  ageRestriction: "all_ages" as EventAgeRestriction,
  category: null,
  scheduledAt: new Date().toISOString(),
  location: {},
  tickets: [createDefaultTicket()],
  privacy: "public" as EventPrivacy,
});

const isRemoteUri = (uri: string) => /^https?:\/\//i.test(uri);

const getImageContentType = (uri: string) => {
  const normalizedUri = uri.toLowerCase().split("?")[0] ?? uri.toLowerCase();

  if (normalizedUri.endsWith(".png")) {
    return "image/png";
  }

  return "image/jpeg";
};

const getImageExtension = (contentType: string) => (contentType === "image/png" ? "png" : "jpg");

export const toAgeRestriction = (value: string): EventAgeRestriction => {
  if (value === "18+") {
    return "18_plus";
  }

  if (value === "21+") {
    return "21_plus";
  }

  return "all_ages";
};

export const fromAgeRestriction = (value: EventAgeRestriction) => {
  if (value === "18_plus") {
    return "18+";
  }

  if (value === "21_plus") {
    return "21+";
  }

  return "All Ages";
};

const stripLocalTicketFields = (tickets: EventDraftTicket[]): EventTicketPayload[] =>
  tickets.map(({ localId: _localId, ...ticket }) => ticket);

const isDraftNotFoundError = (error: unknown) => {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
  const message = response?.data?.message?.toLowerCase() ?? "";

  return response?.status === 404 && message.includes("draft") && message.includes("not found");
};

export const useEventDraftStore = create<EventDraftState>((set, get) => ({
  ...createInitialState(),

  setStepOne: ({ name, description, bannerImageUri }) => {
    set((state) => ({
      name,
      description,
      bannerImageUri,
      bannerImageKey: bannerImageUri === state.bannerImageUri ? state.bannerImageKey : null,
    }));
  },

  setStepTwo: ({ ageRestriction, category, scheduledAt }) => {
    set({ ageRestriction, category, scheduledAt });
  },

  setStepThree: ({ location }) => {
    set({ location });
  },

  setPrivacy: (privacy) => {
    set({ privacy });
  },

  upsertTicket: (ticket) => {
    const currentTickets = get().tickets;
    const localId = ticket.localId ?? DEFAULT_TICKET_ID;
    const nextTicket: EventDraftTicket = {
      ...createDefaultTicket(),
      ...(currentTickets.find((item) => item.localId === localId) ?? {}),
      ...ticket,
      localId,
    };
    const existing = currentTickets.some((item) => item.localId === localId);

    set({
      tickets: existing
        ? currentTickets.map((item) => (item.localId === localId ? nextTicket : item))
        : [...currentTickets, nextTicket],
    });
  },

  deleteTicket: (localId) => {
    set({ tickets: get().tickets.filter((ticket) => ticket.localId !== localId) });
  },

  saveDraft: async () => {
    const payload = await buildEventPayload(get());
    const event = await saveEventDraft(payload, get().draftId);

    set({ draftId: event.id, bannerImageKey: event.bannerImageKey ?? get().bannerImageKey });

    return event;
  },

  publish: async () => {
    const state = get();
    const payload = await buildEventPayload(state);
    const publishedPayload = {
      ...payload,
      ageRestriction: state.ageRestriction,
      category: state.category || "Other",
      location: state.location,
      name: state.name.trim() || "Untitled Event",
      privacy: state.privacy,
      scheduledAt: state.scheduledAt,
      tickets: stripLocalTicketFields(state.tickets),
    };
    let event: EventResponse;

    try {
      event = await publishEvent(publishedPayload, state.draftId);
    } catch (error) {
      if (!state.draftId || !isDraftNotFoundError(error)) {
        throw error;
      }

      set({ draftId: null });
      event = await publishEvent(publishedPayload);
    }

    set({ draftId: event.id, bannerImageKey: event.bannerImageKey ?? state.bannerImageKey });

    return event;
  },

  resetDraft: () => {
    set(createInitialState());
  },
}));

const buildEventPayload = async (state: EventDraftState): Promise<EventPayload> => {
  let bannerImageKey = state.bannerImageKey;

  if (state.bannerImageUri && !isRemoteUri(state.bannerImageUri) && !bannerImageKey) {
    const contentType = getImageContentType(state.bannerImageUri);
    const extension = getImageExtension(contentType);

    bannerImageKey = await uploadFileToStorage({
      contentType,
      key: `events/banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
      uri: state.bannerImageUri,
    });
  }

  return {
    ageRestriction: state.ageRestriction,
    bannerImageKey,
    category: state.category,
    description: state.description.trim() || null,
    location: state.location,
    name: state.name.trim() || null,
    privacy: state.privacy,
    scheduledAt: state.scheduledAt,
    tickets: stripLocalTicketFields(state.tickets),
  };
};

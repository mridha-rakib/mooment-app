import { create } from "zustand";
import type { EventCategory } from "@/constants/eventCategories";
import {
  createDraftTicket,
  createEventTicket,
  deleteEvent,
  deleteDraftTicket,
  deleteEventTicket,
  publishEvent,
  saveEventDraft,
  updateDraftTicket,
  updateEvent,
  updateEventTicket,
} from "@/lib/events";
import type {
  EventAgeRestriction,
  EventLocation,
  EventImageDisplay,
  EventPayload,
  EventPrivacy,
  EventResponse,
  EventTicketPayload,
  EventTicketRequestPayload,
} from "@/lib/events";
import { getStorageFileUrl, uploadFileToStorage } from "@/lib/storage";

export type EventDraftTicket = EventTicketPayload & {
  localId: string;
};

type EventDraftState = {
  draftId: string | null;
  isEditingPublishedEvent: boolean;
  name: string;
  description: string;
  bannerImageUri: string | null;
  bannerImageKey: string | null;
  bannerOriginalImageUri: string | null;
  bannerOriginalImageKey: string | null;
  bannerImageDisplay: EventImageDisplay | null;
  ageRestriction: EventAgeRestriction;
  categories: EventCategory[];
  scheduledAt: string | null;
  endAt: string | null;
  location: EventLocation;
  tickets: EventDraftTicket[];
  privacy: EventPrivacy;
  setStepOne: (payload: {
    name: string;
    description: string;
    bannerImageUri: string | null;
    bannerOriginalImageUri?: string | null;
    bannerImageDisplay?: EventImageDisplay | null;
  }) => void;
  setStepTwo: (payload: {
    ageRestriction: EventAgeRestriction;
    categories: EventCategory[];
    scheduledAt: string | null;
    endAt: string | null;
  }) => void;
  setStepThree: (payload: { location: EventLocation }) => void;
  setPrivacy: (privacy: EventPrivacy) => void;
  upsertTicket: (ticket: Partial<EventDraftTicket>) => void;
  deleteTicket: (localId: string) => void;
  saveTicket: (ticket: Partial<EventDraftTicket>) => Promise<EventResponse>;
  removeTicket: (localId: string) => Promise<EventResponse | null>;
  lastPublishedDraftId: string | null;
  clearLastPublishedDraftId: () => void;
  saveDraft: () => Promise<EventResponse>;
  publish: () => Promise<EventResponse>;
  discardDraft: () => Promise<void>;
  loadFromEvent: (event: EventResponse) => void;
  resetDraft: () => void;
};

const DEFAULT_TICKET_ID = "default-general-ticket";

const createDefaultTicket = (): EventDraftTicket => ({
  capacity: 42,
  description: "Entry from 9pm. Standing only.",
  localId: DEFAULT_TICKET_ID,
  name: "General Ticket",
  price: 45,
  salesEndAt: null,
  type: "pay",
});

const createInitialState = () => {
  return {
    scheduledAt: null,
    draftId: null,
    isEditingPublishedEvent: false,
    name: "",
    description: "",
    bannerImageUri: null,
    bannerImageKey: null,
    bannerOriginalImageUri: null,
    bannerOriginalImageKey: null,
    bannerImageDisplay: null,
    ageRestriction: "all_ages" as EventAgeRestriction,
    categories: [],
    endAt: null,
    location: {},
    tickets: [],
    privacy: "public" as EventPrivacy,
  };
};

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

const stripLocalTicketFields = (tickets: EventDraftTicket[]): EventTicketRequestPayload[] =>
  tickets.map(stripLocalTicketField);

const stripLocalTicketField = ({
  localId: _localId,
  availableCount: _availableCount,
  ...ticket
}: EventDraftTicket): EventTicketRequestPayload => ticket;

const stripTicketIdentity = ({
  id: _id,
  ...ticket
}: EventTicketRequestPayload): Omit<EventTicketRequestPayload, "id"> => ticket;

const createTicketLocalId = (index: number) => `ticket-${Date.now()}-${index}`;

const mergeTicketsFromEvent = (
  eventTickets: EventTicketPayload[],
  currentTickets: EventDraftTicket[],
): EventDraftTicket[] =>
  eventTickets.map((ticket, index) => {
    const currentTicket = currentTickets.find((item) => {
      if (ticket.id && item.id === ticket.id) {
        return true;
      }

      return ticket.id ? item.localId === ticket.id : false;
    });

    return {
      ...ticket,
      localId: currentTicket?.localId ?? ticket.id ?? createTicketLocalId(index),
    };
  });

const getEventSyncState = (event: EventResponse, currentTickets: EventDraftTicket[]) => ({
  draftId: event.id,
  isEditingPublishedEvent: event.status === "published",
  bannerImageKey: event.bannerImageKey ?? null,
  bannerOriginalImageKey: event.bannerOriginalImageKey ?? event.bannerImageKey ?? null,
  bannerImageDisplay: event.bannerImageDisplay ?? null,
  tickets: mergeTicketsFromEvent(event.tickets, currentTickets),
});

const isDraftNotFoundError = (error: unknown) => {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
  const message = response?.data?.message?.toLowerCase() ?? "";

  return response?.status === 404 && message.includes("draft") && message.includes("not found");
};

const assertValidCategories = (categories: EventCategory[]) => {
  if (categories.length === 0) {
    throw new Error("Select at least 1 category before saving the event.");
  }

  if (categories.length > 3) {
    throw new Error("You can select up to 3 categories.");
  }
};

// Save calls can originate from different event steps before the previous
// screen has fully unmounted. Serialize them so two calls cannot both POST a
// new draft or let an older response race a newer update.
let draftSaveQueue: Promise<unknown> = Promise.resolve();
let draftLifecycleVersion = 0;

export const useEventDraftStore = create<EventDraftState>((set, get) => ({
  ...createInitialState(),
  lastPublishedDraftId: null,
  clearLastPublishedDraftId: () => set({ lastPublishedDraftId: null }),

  setStepOne: ({ name, description, bannerImageUri, bannerOriginalImageUri, bannerImageDisplay }) => {
    set((state) => ({
      name,
      description,
      bannerImageUri,
      bannerImageKey: bannerImageUri === state.bannerImageUri ? state.bannerImageKey : null,
      bannerOriginalImageUri: bannerOriginalImageUri ?? bannerImageUri,
      bannerOriginalImageKey:
        (bannerOriginalImageUri ?? bannerImageUri) === state.bannerOriginalImageUri ? state.bannerOriginalImageKey : null,
      bannerImageDisplay: bannerImageDisplay ?? null,
    }));
  },

  setStepTwo: ({ ageRestriction, categories, scheduledAt, endAt }) => {
    set({ ageRestriction, categories, scheduledAt, endAt });
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

  saveTicket: async (ticket) => {
    const state = get();
    const previousTickets = state.tickets;
    const localId = ticket.localId ?? DEFAULT_TICKET_ID;
    const existingTicket = previousTickets.find((item) => item.localId === localId);
    const nextTicket: EventDraftTicket = {
      ...createDefaultTicket(),
      ...(existingTicket ?? {}),
      ...ticket,
      localId,
    };
    const nextTickets = existingTicket
      ? previousTickets.map((item) => (item.localId === localId ? nextTicket : item))
      : [...previousTickets, nextTicket];

    set({ tickets: nextTickets });

    try {
      const currentState = get();

      if (!currentState.draftId) {
        return await currentState.saveDraft();
      }

      if (currentState.isEditingPublishedEvent) {
        const ticketPayload = stripLocalTicketField(nextTicket);
        const event = nextTicket.id
          ? await updateEventTicket(currentState.draftId, nextTicket.id, stripTicketIdentity(ticketPayload))
          : await createEventTicket(currentState.draftId, ticketPayload);

        set(getEventSyncState(event, nextTickets));

        return event;
      }

      const hasUnsavedSiblings = nextTickets.some((t) => !t.id && t.localId !== localId);

      if (hasUnsavedSiblings) {
        return await currentState.saveDraft();
      }

      const ticketPayload = stripLocalTicketField(nextTicket);
      const event = nextTicket.id
        ? await updateDraftTicket(currentState.draftId, nextTicket.id, stripTicketIdentity(ticketPayload))
        : await createDraftTicket(currentState.draftId, ticketPayload);

      set(getEventSyncState(event, nextTickets));

      return event;
    } catch (error) {
      set({ tickets: previousTickets });
      throw error;
    }
  },

  removeTicket: async (localId) => {
    const state = get();
    const previousTickets = state.tickets;
    const ticket = previousTickets.find((item) => item.localId === localId);
    const nextTickets = previousTickets.filter((item) => item.localId !== localId);

    set({ tickets: nextTickets });

    if (!ticket) {
      return null;
    }

    try {
      if (!state.draftId || !ticket.id) {
        return state.draftId ? await get().saveDraft() : null;
      }

      if (state.isEditingPublishedEvent) {
        if (!ticket.id) {
          return await get().saveDraft();
        }

        const event = await deleteEventTicket(state.draftId, ticket.id);

        set(getEventSyncState(event, nextTickets));

        return event;
      }

      const event = await deleteDraftTicket(state.draftId, ticket.id);

      set(getEventSyncState(event, nextTickets));

      return event;
    } catch (error) {
      set({ tickets: previousTickets });
      throw error;
    }
  },

  saveDraft: () => {
    const lifecycleVersion = draftLifecycleVersion;
    const operation = draftSaveQueue
      .catch(() => undefined)
      .then(async () => {
        const payload = await buildEventPayload(get());
        const state = get();
        const event = state.isEditingPublishedEvent && state.draftId
          ? await updateEvent(state.draftId, payload)
          : await saveEventDraft(payload, state.draftId);

        if (lifecycleVersion !== draftLifecycleVersion) {
          return event;
        }

        set({
          ...getEventSyncState(event, get().tickets),
          bannerImageKey: event.bannerImageKey ?? get().bannerImageKey,
          bannerOriginalImageKey: event.bannerOriginalImageKey ?? get().bannerOriginalImageKey,
          bannerImageDisplay: event.bannerImageDisplay ?? get().bannerImageDisplay,
        });

        return event;
      });

    draftSaveQueue = operation;
    return operation;
  },

  publish: async () => {
    await draftSaveQueue.catch(() => undefined);

    const state = get();
    assertValidCategories(state.categories);
    if (!state.scheduledAt || !state.endAt) {
      throw new Error("Select the event start and end dates and times before publishing.");
    }
    const payload = await buildEventPayload(state);

    // Persist newly-uploaded S3 keys immediately so that if the API call fails
    // and the user retries, buildEventPayload sees the keys and skips re-upload.
    if (payload.bannerImageKey && payload.bannerImageKey !== state.bannerImageKey) {
      set({ bannerImageKey: payload.bannerImageKey });
    }
    if (payload.bannerOriginalImageKey && payload.bannerOriginalImageKey !== state.bannerOriginalImageKey) {
      set({ bannerOriginalImageKey: payload.bannerOriginalImageKey });
    }

    const publishedPayload = {
      ...payload,
      ageRestriction: state.ageRestriction,
      category: state.categories[0],
      categories: state.categories,
      location: state.location,
      name: state.name.trim() || "Untitled Event",
      privacy: state.privacy,
      scheduledAt: state.scheduledAt,
      endAt: state.endAt,
      tickets: stripLocalTicketFields(state.tickets),
    };
    let event: EventResponse;

    try {
      event = await publishEvent(publishedPayload, state.draftId);
    } catch (error) {
      if (state.isEditingPublishedEvent || !state.draftId || !isDraftNotFoundError(error)) {
        throw error;
      }

      set({ draftId: null });
      event = await publishEvent(publishedPayload);
    }

    set({
      ...getEventSyncState(event, state.tickets),
      bannerImageKey: event.bannerImageKey ?? state.bannerImageKey,
      bannerOriginalImageKey: event.bannerOriginalImageKey ?? state.bannerOriginalImageKey,
      bannerImageDisplay: event.bannerImageDisplay ?? state.bannerImageDisplay,
      lastPublishedDraftId: state.draftId,
    });

    return event;
  },

  loadFromEvent: (event) => {
    draftLifecycleVersion += 1;

    const bannerImageUri = event.bannerImageKey ? getStorageFileUrl(event.bannerImageKey) : null;
    const bannerOriginalImageUri = event.bannerOriginalImageKey
      ? getStorageFileUrl(event.bannerOriginalImageKey)
      : bannerImageUri;

    set({
      draftId: event.id,
      isEditingPublishedEvent: event.status === "published",
      name: event.name ?? "",
      description: event.description ?? "",
      bannerImageUri,
      bannerImageKey: event.bannerImageKey ?? null,
      bannerOriginalImageUri,
      bannerOriginalImageKey: event.bannerOriginalImageKey ?? event.bannerImageKey ?? null,
      bannerImageDisplay: event.bannerImageDisplay ?? null,
      ageRestriction: event.ageRestriction ?? "all_ages",
      categories: event.categories?.length ? event.categories : event.category ? [event.category] : [],
      scheduledAt: event.scheduledAt ?? null,
      endAt: event.endAt ?? null,
      location: event.location ?? {},
      tickets: event.tickets.length > 0 ? mergeTicketsFromEvent(event.tickets, []) : [],
      privacy: event.privacy,
    });
  },

  discardDraft: async () => {
    await draftSaveQueue.catch(() => undefined);

    const { draftId, isEditingPublishedEvent } = get();
    if (draftId && !isEditingPublishedEvent) {
      await deleteEvent(draftId);
    }
    draftLifecycleVersion += 1;
    set(createInitialState());
  },

  resetDraft: () => {
    draftLifecycleVersion += 1;
    set(createInitialState());
  },
}));

const buildEventPayload = async (state: EventDraftState): Promise<EventPayload> => {
  let bannerImageKey = state.bannerImageKey;
  let bannerOriginalImageKey = state.bannerOriginalImageKey;
  const uploadBanner = async () => {
    if (!state.bannerImageUri || isRemoteUri(state.bannerImageUri) || bannerImageKey) {
      return bannerImageKey;
    }

    const contentType = getImageContentType(state.bannerImageUri);
    const extension = getImageExtension(contentType);

    return uploadFileToStorage({
      contentType,
      key: `events/banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
      uri: state.bannerImageUri,
    });
  };

  const uploadOriginalBanner = async () => {
    if (!state.bannerOriginalImageUri || isRemoteUri(state.bannerOriginalImageUri) || bannerOriginalImageKey) {
      return bannerOriginalImageKey;
    }

    const contentType = getImageContentType(state.bannerOriginalImageUri);
    const extension = getImageExtension(contentType);

    try {
      return await uploadFileToStorage({
        contentType,
        key: `events/banners/originals/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
        uri: state.bannerOriginalImageUri,
      });
    } catch {
      return null;
    }
  };

  [bannerImageKey, bannerOriginalImageKey] = await Promise.all([
    uploadBanner(),
    uploadOriginalBanner(),
  ]);

  return {
    ageRestriction: state.ageRestriction,
    bannerImageKey,
    bannerOriginalImageKey: bannerOriginalImageKey ?? bannerImageKey,
    bannerImageDisplay: state.bannerImageDisplay,
    category: state.categories[0] ?? null,
    categories: state.categories,
    description: state.description.trim() || null,
    location: state.location,
    name: state.name.trim() || null,
    privacy: state.privacy,
    scheduledAt: state.scheduledAt,
    endAt: state.endAt,
    tickets: stripLocalTicketFields(state.tickets),
  };
};

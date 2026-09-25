import { create } from "zustand";
import { createPlan, deletePlan, getPlans, updatePlan as updatePlanRequest } from "@/lib/plans";
import { getStorageFileUrl } from "@/lib/storage";
import type { FriendUserResponse } from "@/lib/users";
import type { GetPlansParams, PlanFriendSummaryResponse, PlanResponse } from "@/lib/plans";

export type PlanFriend = {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
  avatarUrl?: string | null;
};

export type PlanEvent = {
  id: string;
  day: number;
  month: number;
  year: number;
  time: string;
  title: string;
  image: string;
  venue?: string;
  location?: string;
  friends?: string;
  friendIds: string[];
  friendNames: string[];
  friendUsers: PlanFriend[];
  scheduledAt?: string;
  eventId?: string | null;
};

type CreatePlanPayload = {
  name: string;
  date: string;
  dateIso?: string;
  time: string;
  event?: string;
  eventId?: string;
  friends?: string;
  friendIds?: string[];
  latitude?: number;
  location?: string;
  longitude?: number;
};

type PlanState = {
  plans: PlanEvent[];
  isLoading: boolean;
  error: string | null;
  addPlan: (payload: CreatePlanPayload) => Promise<PlanEvent>;
  deletePlan: (planId: string) => Promise<void>;
  restorePlans: (params?: GetPlansParams) => Promise<void>;
  updatePlanFriends: (planId: string, friends: FriendUserResponse[]) => Promise<PlanEvent>;
};

const DEFAULT_PLAN_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop";

const resolveStorageUrl = (key?: string | null, fallback = DEFAULT_PLAN_IMAGE) => {
  if (!key) {
    return fallback;
  }

  try {
    return getStorageFileUrl(key);
  } catch {
    return fallback;
  }
};

const parsePlanDate = (payload: CreatePlanPayload) => {
  const parsedDate = payload.dateIso ? new Date(payload.dateIso) : new Date(`${payload.date} ${payload.time}`);

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
};

const formatPlanTime = (date: Date) =>
  date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    hour12: true,
    minute: "2-digit",
  });

const splitFriendNames = (friends?: string) =>
  friends
    ?.split(",")
    .map((friend) => friend.trim())
    .filter(Boolean) ?? [];

const optionalCoordinate = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toPlanFriend = (friend: PlanFriendSummaryResponse): PlanFriend => ({
  id: friend.id,
  name: friend.name,
  username: friend.username,
  avatarKey: friend.avatarKey ?? null,
  avatarUrl: resolveStorageUrl(friend.avatarKey, ""),
});

const toFallbackPlanFriends = (plan: PlanResponse): PlanFriend[] =>
  plan.friendIds.map((friendId, index) => ({
    id: friendId,
    name: plan.friendNames[index] ?? "Friend",
    avatarKey: null,
    avatarUrl: null,
  }));

let restorePlansRequestId = 0;

const toPlanEvent = (plan: PlanResponse): PlanEvent => {
  const scheduledAt = new Date(plan.scheduledAt);
  const safeScheduledAt = Number.isNaN(scheduledAt.getTime()) ? new Date() : scheduledAt;

  return {
    day: safeScheduledAt.getDate(),
    eventId: plan.eventId ?? plan.event?.id ?? null,
    friends: plan.friendNames.join(", "),
    friendIds: plan.friendIds,
    friendNames: plan.friendNames,
    friendUsers: Array.isArray(plan.friends) && plan.friends.length > 0
      ? plan.friends.map(toPlanFriend)
      : toFallbackPlanFriends(plan),
    id: plan.id,
    image: resolveStorageUrl(plan.event?.bannerImageKey ?? plan.event?.bannerOriginalImageKey),
    location: plan.location.address,
    month: safeScheduledAt.getMonth(),
    scheduledAt: plan.scheduledAt,
    time: plan.timeLabel || formatPlanTime(safeScheduledAt),
    title: plan.title,
    venue: plan.event?.title || plan.eventTitle || plan.location.address,
    year: safeScheduledAt.getFullYear(),
  };
};

export const usePlanStore = create<PlanState>((set, get) => ({
  plans: [],
  isLoading: false,
  error: null,

  addPlan: async (payload) => {
    const scheduledAt = parsePlanDate(payload);
    const plan = await createPlan({
      eventId: payload.eventId || null,
      eventTitle: payload.event || null,
      friendIds: payload.friendIds ?? [],
      friendNames: splitFriendNames(payload.friends),
      location: {
        address: payload.location || "Los Angeles, CA",
        latitude: optionalCoordinate(payload.latitude),
        longitude: optionalCoordinate(payload.longitude),
      },
      scheduledAt: scheduledAt.toISOString(),
      timeLabel: payload.time,
      title: payload.name.trim(),
    });
    const planEvent = toPlanEvent(plan);

    set({
      plans: [...get().plans, planEvent].sort((a, b) => {
        if (a.scheduledAt && b.scheduledAt) return a.scheduledAt.localeCompare(b.scheduledAt);
        return a.year - b.year || a.month - b.month || a.day - b.day;
      }),
      error: null,
    });

    return planEvent;
  },

  deletePlan: async (planId) => {
    await deletePlan(planId);
    set({ plans: get().plans.filter((plan) => plan.id !== planId), error: null });
  },

  updatePlanFriends: async (planId, friends) => {
    const updatedPlan = await updatePlanRequest(planId, {
      friendIds: friends.map((friend) => friend.id),
      friendNames: friends.map((friend) => friend.name),
    });
    const planEvent = toPlanEvent(updatedPlan);

    set({
      plans: get().plans.map((plan) => (plan.id === planId ? planEvent : plan)),
      error: null,
    });

    return planEvent;
  },

  restorePlans: async (params) => {
    const requestId = ++restorePlansRequestId;

    set({ isLoading: true, error: null });

    try {
      const plans = await getPlans(params);

      if (requestId !== restorePlansRequestId) {
        return;
      }

      set({ plans: plans.map(toPlanEvent), isLoading: false, error: null });
    } catch (error) {
      if (requestId !== restorePlansRequestId) {
        return;
      }

      set({
        error: error instanceof Error ? error.message : "Unable to load plans.",
        isLoading: false,
      });
    }
  },
}));

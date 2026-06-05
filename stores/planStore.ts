import { create } from "zustand";
import { createPlan, deletePlan, getPlans } from "@/lib/plans";
import type { PlanResponse } from "@/lib/plans";

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
};

type CreatePlanPayload = {
  name: string;
  date: string;
  dateIso?: string;
  time: string;
  event?: string;
  friends?: string;
  location?: string;
};

type PlanState = {
  plans: PlanEvent[];
  isLoading: boolean;
  error: string | null;
  addPlan: (payload: CreatePlanPayload) => Promise<PlanEvent>;
  deletePlan: (planId: string) => Promise<void>;
  restorePlans: () => Promise<void>;
};

const DEFAULT_PLAN_IMAGE =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=200&auto=format&fit=crop";

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

const toPlanEvent = (plan: PlanResponse): PlanEvent => {
  const scheduledAt = new Date(plan.scheduledAt);
  const safeScheduledAt = Number.isNaN(scheduledAt.getTime()) ? new Date() : scheduledAt;

  return {
    day: safeScheduledAt.getDate(),
    friends: plan.friendNames.join(", "),
    id: plan.id,
    image: DEFAULT_PLAN_IMAGE,
    location: plan.location.address,
    month: safeScheduledAt.getMonth(),
    time: plan.timeLabel || formatPlanTime(safeScheduledAt),
    title: plan.title,
    venue: plan.eventTitle || plan.location.address,
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
      eventTitle: payload.event || null,
      friendNames: splitFriendNames(payload.friends),
      location: {
        address: payload.location || "Los Angeles, CA",
      },
      scheduledAt: scheduledAt.toISOString(),
      timeLabel: payload.time,
      title: payload.name.trim(),
    });
    const planEvent = toPlanEvent(plan);

    set({ plans: [...get().plans, planEvent].sort((a, b) => a.year - b.year || a.month - b.month || a.day - b.day), error: null });

    return planEvent;
  },

  deletePlan: async (planId) => {
    await deletePlan(planId);
    set({ plans: get().plans.filter((plan) => plan.id !== planId), error: null });
  },

  restorePlans: async () => {
    set({ isLoading: true, error: null });

    try {
      const plans = await getPlans();

      set({ plans: plans.map(toPlanEvent), isLoading: false, error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unable to load plans.",
        isLoading: false,
      });
    }
  },
}));

import { api } from "@/lib/api";

export type PlanLocationResponse = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type PlanResponse = {
  id: string;
  userId: string;
  title: string;
  scheduledAt: string;
  timeLabel?: string | null;
  eventTitle?: string | null;
  location: PlanLocationResponse;
  friendIds: string[];
  friendNames: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlanRequest = {
  title: string;
  scheduledAt: string;
  timeLabel?: string | null;
  eventTitle?: string | null;
  location: PlanLocationResponse;
  friendIds?: string[];
  friendNames?: string[];
  notes?: string | null;
};

export const getPlans = async (): Promise<PlanResponse[]> => {
  const response = await api.get("/plans");
  const plans = response.data?.data?.plans;

  return Array.isArray(plans) ? (plans as PlanResponse[]) : [];
};

export const createPlan = async (payload: CreatePlanRequest): Promise<PlanResponse> => {
  const response = await api.post("/plans", payload);
  const plan = response.data?.data?.plan;

  if (!plan) {
    throw new Error("The plan response was incomplete.");
  }

  return plan as PlanResponse;
};

export const deletePlan = async (planId: string): Promise<void> => {
  await api.delete(`/plans/${planId}`);
};

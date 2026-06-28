import { api } from "@/lib/api";

export type PayoutPreference = "manual" | "weekly" | "monthly";
export type WithdrawalMethod = "bank_transfer" | "instant_debit_card";

export type PayoutSettings = {
  payoutPreference: PayoutPreference;
  withdrawalMethod: WithdrawalMethod;
  instantPayoutEligible: boolean;
};

export type CreatorPayoutStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type CreatorPayoutType = "bank_transfer" | "instant_debit_card";

export type CreatorPayout = {
  id: string;
  creatorUserId: string;
  earningIds: string[];
  totalAmount: number;
  currency: string;
  payoutType: CreatorPayoutType;
  status: CreatorPayoutStatus;
  scheduledDate: string;
  processingStartedAt?: string | null;
  stripeTransferId?: string | null;
  failureReason?: string | null;
  processedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const getPayoutSettings = async (): Promise<PayoutSettings> => {
  const response = await api.get("/payments/payout-settings");
  const settings = response.data?.data?.settings as PayoutSettings | undefined;

  if (!settings) {
    throw new Error("Failed to load payout settings.");
  }

  return settings;
};

export const updatePayoutSettings = async (
  payload: Partial<Pick<PayoutSettings, "payoutPreference" | "withdrawalMethod">>,
): Promise<PayoutSettings> => {
  const response = await api.patch("/payments/payout-settings", payload);
  const settings = response.data?.data?.settings as PayoutSettings | undefined;

  if (!settings) {
    throw new Error("Failed to update payout settings.");
  }

  return settings;
};

export const getMyPayouts = async (): Promise<CreatorPayout[]> => {
  const response = await api.get("/payments/creator-payouts");
  const payouts = response.data?.data?.payouts as CreatorPayout[] | undefined;

  return Array.isArray(payouts) ? payouts : [];
};

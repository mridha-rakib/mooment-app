import { api } from "@/lib/api";

export type PayoutPreference = "manual" | "weekly" | "monthly";
export type WithdrawalMethod = "bank_transfer" | "instant_debit_card";
export type InstantPayoutUnavailableReason =
  | "stripe_account_not_ready"
  | "payouts_disabled"
  | "no_external_card"
  | "card_not_instant_eligible"
  | "multiple_eligible_cards"
  | "unsupported_configuration";

export type EligibleInstantDebitCard = {
  id: string;
  brand?: string | null;
  last4: string;
  currency?: string | null;
  country?: string | null;
  availablePayoutMethods: string[];
};

export type PayoutSettings = {
  payoutPreference: PayoutPreference;
  withdrawalMethod: WithdrawalMethod;
  instantPayoutEligible: boolean;
  eligibleInstantDebitCard: EligibleInstantDebitCard | null;
  instantPayoutUnavailableReason: InstantPayoutUnavailableReason | null;
};

const PAYOUT_RESPONSE_ERROR = "The payout settings response was incomplete.";

const PAYOUT_PREFERENCES = new Set<PayoutPreference>(["manual", "weekly", "monthly"]);
const WITHDRAWAL_METHODS = new Set<WithdrawalMethod>(["bank_transfer", "instant_debit_card"]);
const INSTANT_PAYOUT_UNAVAILABLE_REASONS = new Set<InstantPayoutUnavailableReason>([
  "stripe_account_not_ready",
  "payouts_disabled",
  "no_external_card",
  "card_not_instant_eligible",
  "multiple_eligible_cards",
  "unsupported_configuration",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseRequiredBoolean = (value: unknown): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(PAYOUT_RESPONSE_ERROR);
  }

  return value;
};

const parsePayoutPreference = (value: unknown): PayoutPreference => {
  if (typeof value !== "string" || !PAYOUT_PREFERENCES.has(value as PayoutPreference)) {
    throw new Error(PAYOUT_RESPONSE_ERROR);
  }

  return value as PayoutPreference;
};

const parseWithdrawalMethod = (value: unknown): WithdrawalMethod => {
  if (typeof value !== "string" || !WITHDRAWAL_METHODS.has(value as WithdrawalMethod)) {
    throw new Error(PAYOUT_RESPONSE_ERROR);
  }

  return value as WithdrawalMethod;
};

const parseNullableString = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string") {
    return value;
  }

  return null;
};

const parseInstantPayoutUnavailableReason = (
  value: unknown,
): InstantPayoutUnavailableReason | null => {
  if (
    typeof value === "string" &&
    INSTANT_PAYOUT_UNAVAILABLE_REASONS.has(value as InstantPayoutUnavailableReason)
  ) {
    return value as InstantPayoutUnavailableReason;
  }

  return null;
};

export const isEligibleInstantDebitCard = (
  value: EligibleInstantDebitCard | null | undefined,
): value is EligibleInstantDebitCard =>
  Boolean(
    value &&
      typeof value.id === "string" &&
      value.id.trim() &&
      typeof value.last4 === "string" &&
      value.last4.trim() &&
      Array.isArray(value.availablePayoutMethods) &&
      value.availablePayoutMethods.includes("instant"),
  );

const parseEligibleInstantDebitCard = (value: unknown): EligibleInstantDebitCard | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const availablePayoutMethods = value.availablePayoutMethods;

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.last4 !== "string" ||
    !value.last4.trim() ||
    !Array.isArray(availablePayoutMethods) ||
    !availablePayoutMethods.every((method) => typeof method === "string")
  ) {
    return null;
  }

  const card = {
    id: value.id,
    brand: parseNullableString(value.brand) ?? null,
    last4: value.last4,
    currency: parseNullableString(value.currency) ?? null,
    country: parseNullableString(value.country) ?? null,
    availablePayoutMethods,
  };

  return isEligibleInstantDebitCard(card) ? card : null;
};

export const parsePayoutSettingsResponse = (value: unknown): PayoutSettings => {
  if (!isRecord(value)) {
    throw new Error(PAYOUT_RESPONSE_ERROR);
  }

  return {
    payoutPreference: parsePayoutPreference(value.payoutPreference),
    withdrawalMethod: parseWithdrawalMethod(value.withdrawalMethod),
    instantPayoutEligible: parseRequiredBoolean(value.instantPayoutEligible),
    eligibleInstantDebitCard: parseEligibleInstantDebitCard(value.eligibleInstantDebitCard),
    instantPayoutUnavailableReason: parseInstantPayoutUnavailableReason(
      value.instantPayoutUnavailableReason,
    ),
  };
};

export const isInstantDebitCardSelectable = (
  settings: Pick<PayoutSettings, "instantPayoutEligible" | "eligibleInstantDebitCard"> | null | undefined,
): boolean => Boolean(settings?.instantPayoutEligible && isEligibleInstantDebitCard(settings.eligibleInstantDebitCard));

export const formatEligibleInstantDebitCardLabel = (
  card: EligibleInstantDebitCard | null | undefined,
): string | null => {
  if (!isEligibleInstantDebitCard(card)) {
    return null;
  }

  const brand = typeof card.brand === "string" ? card.brand.trim() : "";

  return brand ? `${brand} •••• ${card.last4}` : `Debit Card •••• ${card.last4}`;
};

export const getInstantPayoutUnavailableMessage = (
  reason: InstantPayoutUnavailableReason | null | undefined,
): string => {
  switch (reason) {
    case "stripe_account_not_ready":
    case "payouts_disabled":
      return "Complete Stripe payout setup";
    case "no_external_card":
      return "No eligible debit card connected";
    case "card_not_instant_eligible":
      return "Debit card is not eligible for instant payout";
    default:
      return "Instant payout unavailable";
  }
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
  const settings = response.data?.data?.settings;

  if (!settings) {
    throw new Error("Failed to load payout settings.");
  }

  return parsePayoutSettingsResponse(settings);
};

export const updatePayoutSettings = async (
  payload: Partial<Pick<PayoutSettings, "payoutPreference" | "withdrawalMethod">>,
): Promise<PayoutSettings> => {
  const response = await api.patch("/payments/payout-settings", payload);
  const settings = response.data?.data?.settings;

  if (!settings) {
    throw new Error("Failed to update payout settings.");
  }

  return parsePayoutSettingsResponse(settings);
};

export const getMyPayouts = async (): Promise<CreatorPayout[]> => {
  const response = await api.get("/payments/creator-payouts");
  const payouts = response.data?.data?.payouts as CreatorPayout[] | undefined;

  return Array.isArray(payouts) ? payouts : [];
};

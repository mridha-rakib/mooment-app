import { api } from "@/lib/api";

export type StripeConnectOnboardingStatus = "not_started" | "pending" | "completed" | "restricted";

export type StripeConnectAccount = {
  id: string;
  userId: string;
  stripeAccountId: string;
  email?: string | null;
  country?: string | null;
  livemode: boolean;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingStatus: StripeConnectOnboardingStatus;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    disabledReason?: string | null;
  };
  payoutAccounts: {
    id: string;
    type: "bank_account" | "card";
    name: string;
    bankName?: string | null;
    brand?: string | null;
    last4: string;
    currency?: string | null;
    country?: string | null;
    status?: string | null;
    defaultForCurrency?: boolean | null;
    availablePayoutMethods?: string[] | null;
  }[];
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateStripeConnectOnboardingLinkPayload = {
  returnUrl?: string;
  refreshUrl?: string;
};

export type StripeConnectOnboardingLink = {
  onboardingUrl: string;
  returnUrl: string;
  refreshUrl: string;
  expiresAt?: string | null;
  linkType?: "account_onboarding" | "express_dashboard";
  account: StripeConnectAccount;
};

const ONBOARDING_STATUSES = new Set<StripeConnectOnboardingStatus>([
  "not_started",
  "pending",
  "completed",
  "restricted",
]);

const STRIPE_CONNECT_RESPONSE_ERROR = "The Stripe Connect account response was incomplete.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseRequiredString = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  return value;
};

const parseRequiredBoolean = (value: unknown): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  return value;
};

const parseNullableString = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "string") {
    return value;
  }

  throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
};

const parseStringArray = (value: unknown): string[] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  return value;
};

const parseRequirements = (value: unknown): StripeConnectAccount["requirements"] => {
  if (!isRecord(value)) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  return {
    currentlyDue: parseStringArray(value.currentlyDue),
    eventuallyDue: parseStringArray(value.eventuallyDue),
    pastDue: parseStringArray(value.pastDue),
    disabledReason: parseNullableString(value.disabledReason) ?? null,
  };
};

const parsePayoutAccount = (
  value: unknown,
): StripeConnectAccount["payoutAccounts"][number] => {
  if (!isRecord(value)) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  const type = value.type;

  if (type !== "bank_account" && type !== "card") {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  const defaultForCurrency = value.defaultForCurrency;

  if (
    defaultForCurrency !== undefined &&
    defaultForCurrency !== null &&
    typeof defaultForCurrency !== "boolean"
  ) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  const availablePayoutMethods = value.availablePayoutMethods;

  if (
    availablePayoutMethods !== undefined &&
    availablePayoutMethods !== null &&
    (!Array.isArray(availablePayoutMethods) ||
      !availablePayoutMethods.every((method) => typeof method === "string"))
  ) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  return {
    id: parseRequiredString(value.id),
    type,
    name: parseRequiredString(value.name),
    bankName: parseNullableString(value.bankName),
    brand: parseNullableString(value.brand),
    last4: parseRequiredString(value.last4),
    currency: parseNullableString(value.currency),
    country: parseNullableString(value.country),
    status: parseNullableString(value.status),
    defaultForCurrency: defaultForCurrency ?? null,
    availablePayoutMethods: availablePayoutMethods ?? null,
  };
};

const parsePayoutAccounts = (value: unknown): StripeConnectAccount["payoutAccounts"] => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  return value.map(parsePayoutAccount);
};

export const parseStripeConnectAccountResponse = (
  value: unknown,
): StripeConnectAccount | null => {
  if (value === null) {
    return null;
  }

  if (!isRecord(value)) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  const onboardingStatus = value.onboardingStatus;

  if (
    typeof onboardingStatus !== "string" ||
    !ONBOARDING_STATUSES.has(onboardingStatus as StripeConnectOnboardingStatus)
  ) {
    throw new Error(STRIPE_CONNECT_RESPONSE_ERROR);
  }

  return {
    id: parseRequiredString(value.id),
    userId: parseRequiredString(value.userId),
    stripeAccountId: parseRequiredString(value.stripeAccountId),
    email: parseNullableString(value.email),
    country: parseNullableString(value.country),
    livemode: parseRequiredBoolean(value.livemode),
    detailsSubmitted: parseRequiredBoolean(value.detailsSubmitted),
    chargesEnabled: parseRequiredBoolean(value.chargesEnabled),
    payoutsEnabled: parseRequiredBoolean(value.payoutsEnabled),
    onboardingStatus: onboardingStatus as StripeConnectOnboardingStatus,
    requirements: parseRequirements(value.requirements),
    payoutAccounts: parsePayoutAccounts(value.payoutAccounts),
    lastSyncedAt: parseNullableString(value.lastSyncedAt),
    createdAt: parseRequiredString(value.createdAt),
    updatedAt: parseRequiredString(value.updatedAt),
  };
};

export const getStripeConnectAccount = async () => {
  const response = await api.get("/payments/stripe-connect/account");

  return parseStripeConnectAccountResponse(response.data?.data?.account ?? null);
};

export const createStripeConnectOnboardingLink = async (
  payload: CreateStripeConnectOnboardingLinkPayload = {},
) => {
  const response = await api.post("/payments/stripe-connect/onboarding-link", payload);

  return response.data?.data as StripeConnectOnboardingLink;
};

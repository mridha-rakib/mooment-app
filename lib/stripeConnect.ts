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
  account: StripeConnectAccount;
};

export const getStripeConnectAccount = async () => {
  const response = await api.get("/payments/stripe-connect/account");

  return (response.data?.data?.account ?? null) as StripeConnectAccount | null;
};

export const createStripeConnectOnboardingLink = async (
  payload: CreateStripeConnectOnboardingLinkPayload = {},
) => {
  const response = await api.post("/payments/stripe-connect/onboarding-link", payload);

  return response.data?.data as StripeConnectOnboardingLink;
};

import { api } from "@/lib/api";

export type MoomentCreditPackage = {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  commissionPercent: number;
  sortOrder: number;
};

export type MoomentCreditPaymentMethod = "stripe" | "card" | "apple";

export type MoomentCreditCheckout = {
  creditPackage: MoomentCreditPackage;
  lineItems: {
    itemLabel: string;
    itemAmountUsd: number;
    subtotalUsd: number;
    platformFeeUsd: number;
    taxPercent: number;
    taxUsd: number;
    totalUsd: number;
  };
};

export type MoomentCreditPurchase = {
  id: string;
  packageId: string;
  packageName: string;
  credits: number;
  subtotalUsd: number;
  platformFeeUsd: number;
  taxPercent: number;
  taxUsd: number;
  totalUsd: number;
  paymentMethod: MoomentCreditPaymentMethod;
  status: "completed" | "failed";
  paymentReference: string;
  createdAt: string;
  updatedAt: string;
};

export type MoomentCreditWallet = {
  id: string;
  balance: number;
  purchases: MoomentCreditPurchase[];
  createdAt: string;
  updatedAt: string;
};

export const getMoomentCreditPackages = async (): Promise<MoomentCreditPackage[]> => {
  const response = await api.get("/settings/mooment-credit", {
    skipAuthHeader: true,
    skipAuthRedirect: true,
    skipAuthRefresh: true,
  });

  return (response.data?.data?.settings?.packages ?? []) as MoomentCreditPackage[];
};

export const getMoomentCreditCheckout = async (packageId: string): Promise<MoomentCreditCheckout> => {
  const response = await api.get(`/payments/mooment-credits/checkout/${encodeURIComponent(packageId)}`);
  const checkout = response.data?.data?.checkout as MoomentCreditCheckout | undefined;

  if (!checkout) {
    throw new Error("The credit checkout response was incomplete.");
  }

  return checkout;
};

export const purchaseMoomentCredits = async ({
  packageId,
  paymentMethod,
  acceptedTerms,
}: {
  packageId: string;
  paymentMethod: MoomentCreditPaymentMethod;
  acceptedTerms: boolean;
}): Promise<{ purchase: MoomentCreditPurchase; wallet: MoomentCreditWallet }> => {
  const response = await api.post("/payments/mooment-credits/purchases", {
    packageId,
    paymentMethod,
    acceptedTerms,
  });
  const purchase = response.data?.data?.purchase as MoomentCreditPurchase | undefined;
  const wallet = response.data?.data?.wallet as MoomentCreditWallet | undefined;

  if (!purchase || !wallet) {
    throw new Error("The credit purchase response was incomplete.");
  }

  return { purchase, wallet };
};

export const getMoomentCreditWallet = async (): Promise<MoomentCreditWallet> => {
  const response = await api.get("/payments/mooment-credits/wallet");
  const wallet = response.data?.data?.wallet as MoomentCreditWallet | undefined;

  if (!wallet) {
    throw new Error("The wallet response was incomplete.");
  }

  return wallet;
};

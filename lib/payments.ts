import { api } from "@/lib/api";

export type CheckoutPaymentMethod = "card" | "apple_pay" | "mooment_credits";
export type CheckoutPaymentStatus =
  | "requires_payment"
  | "processing"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export type CheckoutOrder = {
  id: string;
  kind: "ticket" | "product" | "custom";
  paymentMethod: CheckoutPaymentMethod;
  paymentStatus: CheckoutPaymentStatus;
  payoutStatus: "not_ready" | "held" | "eligible" | "transferred" | "failed";
  currency: string;
  subtotalAmount: number;
  platformFeeAmount: number;
  taxAmount: number;
  totalAmount: number;
  stripePaymentIntentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateTicketCheckoutIntentPayload = {
  kind: "ticket";
  paymentMethod: CheckoutPaymentMethod;
  eventId: string;
  ticketId: string;
  quantity: number;
  anonymous?: boolean;
  acceptedTerms: boolean;
};

type CreateProductCheckoutIntentPayload = {
  kind: "product";
  paymentMethod: CheckoutPaymentMethod;
  items: {
    productId: string;
    quantity: number;
  }[];
  acceptedTerms: boolean;
};

type CreateCustomCheckoutIntentPayload = {
  kind: "custom";
  paymentMethod: CheckoutPaymentMethod;
  items: {
    name: string;
    amount: number;
    quantity: number;
  }[];
  acceptedTerms: boolean;
};

export type CreateCheckoutIntentPayload =
  | CreateTicketCheckoutIntentPayload
  | CreateProductCheckoutIntentPayload
  | CreateCustomCheckoutIntentPayload;

export type CheckoutIntent = {
  order: CheckoutOrder;
  paymentIntentClientSecret?: string | null;
  publishableKey?: string | null;
  merchantDisplayName: string;
  merchantCountryCode: string;
};

export type TicketWalletStatus = "active" | "used" | "cancelled";
export type TicketWalletSource = "owned" | "shared";

export type TicketShare = {
  id: string;
  ownerUserId: string;
  recipientUserId: string;
  orderId: string;
  eventId: string;
  ticketId: string;
  status: "active" | "cancelled";
  sharedAt: string;
  cancelledAt?: string | null;
  friend?: {
    id: string;
    name: string;
    username?: string;
    avatarKey?: string | null;
  } | null;
};

export type TicketWalletItem = {
  id: string;
  source: TicketWalletSource;
  orderId: string;
  ticketNo: string;
  ticketId: string;
  ticketName: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: CheckoutPaymentStatus;
  walletStatus: TicketWalletStatus;
  purchasedAt?: string | null;
  currentShare?: TicketShare | null;
  sharedBy?: {
    id: string;
    name: string;
    username?: string;
    avatarKey?: string | null;
  } | null;
  event: {
    id: string;
    name?: string | null;
    bannerImageKey?: string | null;
    bannerOriginalImageKey?: string | null;
    scheduledAt?: string | null;
    location?: {
      searchLabel?: string | null;
      venue?: string | null;
      address?: string | null;
    } | null;
    status: string;
    host?: {
      id: string;
      name: string;
      username?: string;
      avatarKey?: string | null;
    } | null;
  };
};

export const createCheckoutIntent = async (
  payload: CreateCheckoutIntentPayload,
): Promise<CheckoutIntent> => {
  const response = await api.post("/payments/checkout-intents", payload);
  const checkout = response.data?.data?.checkout as CheckoutIntent | undefined;

  if (!checkout?.order) {
    throw new Error("The payment response was incomplete.");
  }

  return checkout;
};

export const confirmCheckoutOrder = async (orderId: string): Promise<CheckoutOrder> => {
  const response = await api.post(`/payments/checkout-orders/${encodeURIComponent(orderId)}/confirm`);
  const order = response.data?.data?.order as CheckoutOrder | undefined;

  if (!order) {
    throw new Error("The payment confirmation response was incomplete.");
  }

  return order;
};

export const refundCheckoutOrder = async (orderId: string): Promise<CheckoutOrder> => {
  const response = await api.post(`/payments/checkout-orders/${encodeURIComponent(orderId)}/refund`);
  const order = response.data?.data?.order as CheckoutOrder | undefined;

  if (!order) {
    throw new Error("The refund response was incomplete.");
  }

  return order;
};

export const getMyTicketPurchaseCounts = async (eventId: string): Promise<Record<string, number>> => {
  const response = await api.get(`/payments/ticket-purchase-counts/${encodeURIComponent(eventId)}`);
  const counts = response.data?.data?.counts as Record<string, number> | undefined;

  return counts ?? {};
};

export const getMyTicketWallet = async (): Promise<TicketWalletItem[]> => {
  const response = await api.get("/payments/ticket-wallet");
  const tickets = response.data?.data?.tickets as TicketWalletItem[] | undefined;

  return Array.isArray(tickets) ? tickets : [];
};

export const shareTicketWithFriend = async ({
  eventId,
  ticketId,
  friendId,
}: {
  eventId: string;
  ticketId: string;
  friendId: string;
}): Promise<TicketShare> => {
  const response = await api.post("/payments/ticket-shares", {
    eventId,
    ticketId,
    friendId,
  });
  const share = response.data?.data?.share as TicketShare | undefined;

  if (!share) {
    throw new Error("The ticket share response was incomplete.");
  }

  return share;
};

export const cancelTicketShare = async (shareId: string): Promise<TicketShare> => {
  const response = await api.delete(`/payments/ticket-shares/${encodeURIComponent(shareId)}`);
  const share = response.data?.data?.share as TicketShare | undefined;

  if (!share) {
    throw new Error("The cancel share response was incomplete.");
  }

  return share;
};

export const startMoomentCreditsCheckout = async (
  payload: CreateCheckoutIntentPayload,
): Promise<CheckoutOrder> => {
  const creditsPayload = { ...payload, paymentMethod: "mooment_credits" as const };
  const checkout = await createCheckoutIntent(creditsPayload);

  if (checkout.order.paymentStatus !== "paid") {
    throw new Error("Mooment Credits payment could not be completed.");
  }

  return checkout.order;
};

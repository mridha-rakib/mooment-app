import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { DeviceEventEmitter } from "react-native";

export type CheckoutPaymentMethod = "card" | "apple_pay";
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
  lineItems: {
    itemType: "ticket" | "product" | "custom";
    itemId?: string | null;
    eventId?: string | null;
    name: string;
    quantity: number;
    paidQuantity?: number;
    freeQuantity?: number;
    totalQuantity?: number;
    rewardId?: string | null;
    unitAmount: number;
    totalAmount: number;
  }[];
  ticketPasses: {
    eventId: string;
    ticketId: string;
    ticketIndex: number;
    checkInCode: string;
  }[];
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
export type TicketPassStatus = "active" | "used";

export type TicketShare = {
  id: string;
  ownerUserId: string;
  recipientUserId: string;
  orderId: string;
  eventId: string;
  ticketId: string;
  ticketIndex: number;
  qrCode: string;
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

export type TicketWalletPass = {
  orderId: string;
  ticketNo: string;
  ticketIndex: number;
  qrCode: string;
  status: TicketPassStatus;
  usedAt?: string | null;
  currentShare?: TicketShare | null;
};

export type ScannedTicket = {
  eventName: string;
  ticketName: string;
  ticketIndex: number;
  ticketNo: string;
  source: TicketWalletSource;
  holderUserId: string;
  holderName: string;
  usedAt: string;
};

export type TicketWalletItem = {
  id: string;
  source: TicketWalletSource;
  orderId: string;
  ticketNo: string;
  ticketId: string;
  ticketName: string;
  quantity: number;
  paidQuantity?: number;
  freeQuantity?: number;
  totalQuantity?: number;
  unitAmount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: CheckoutPaymentStatus;
  walletStatus: TicketWalletStatus;
  purchasedAt?: string | null;
  ticketPasses?: TicketWalletPass[];
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
    endAt?: string | null;
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
      isFollowing?: boolean;
    } | null;
  };
};

export type TicketWalletChangedEvent = {
  activeTicketCount?: number;
};

export const TICKET_WALLET_CHANGED_EVENT = "xenog.ticketWallet.changed";

export const emitTicketWalletChanged = (payload: TicketWalletChangedEvent = {}) => {
  DeviceEventEmitter.emit(TICKET_WALLET_CHANGED_EVENT, payload);
};

export const isTicketWalletItemExpired = (item: TicketWalletItem, nowMs = Date.now()) => {
  if (!item.event.endAt) {
    return false;
  }

  const endDate = new Date(item.event.endAt);

  return Number.isFinite(endDate.getTime()) && endDate.getTime() < nowMs;
};

export const getActiveTicketWalletCount = (tickets: TicketWalletItem[]) =>
  tickets.reduce((total, item) => {
    if (
      item.walletStatus !== "active" ||
      item.paymentStatus === "refunded" ||
      item.paymentStatus === "canceled" ||
      item.event.status === "cancelled" ||
      isTicketWalletItemExpired(item)
    ) {
      return total;
    }

    const passes = item.ticketPasses ?? [];

    if (item.source === "shared") {
      return total + passes.filter((pass) => pass.status === "active").length;
    }

    return total + passes.filter((pass) => pass.status === "active" && !pass.currentShare).length;
  }, 0);

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

  emitTicketWalletChanged();

  return order;
};

export const cancelCheckoutOrder = async (orderId: string): Promise<CheckoutOrder> => {
  const response = await api.post(`/payments/checkout-orders/${encodeURIComponent(orderId)}/cancel`);
  const order = response.data?.data?.order as CheckoutOrder | undefined;

  if (!order) {
    throw new Error("The cancellation response was incomplete.");
  }

  emitTicketWalletChanged();

  return order;
};

export const refundCheckoutOrder = async (orderId: string): Promise<CheckoutOrder> => {
  const response = await api.post(`/payments/checkout-orders/${encodeURIComponent(orderId)}/refund`);
  const order = response.data?.data?.order as CheckoutOrder | undefined;

  if (!order) {
    throw new Error("The refund response was incomplete.");
  }

  emitTicketWalletChanged();

  return order;
};

export type TicketStatEntry = {
  sold: number;
  available: number;
  capacity: number;
};

export const getEventTicketStats = async (eventId: string): Promise<Record<string, TicketStatEntry>> => {
  const response = await api.get(`/payments/event-ticket-stats/${encodeURIComponent(eventId)}`);
  const stats = response.data?.data?.stats as Record<string, TicketStatEntry> | undefined;
  return stats ?? {};
};

export type EventTicketStatItemStatus =
  | "checked_in"
  | "requires_payment"
  | "processing"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export type EventTicketStatItem = {
  id: string;
  attendee?: {
    id: string;
    name: string;
    username?: string;
    avatarKey?: string | null;
  } | null;
  ticketName: string;
  amount: number;
  currency: string;
  status: EventTicketStatItemStatus;
};

export const getEventTicketStatItems = async (eventId: string): Promise<EventTicketStatItem[]> => {
  const response = await api.get(`/payments/event-ticket-stat-items/${encodeURIComponent(eventId)}`);
  const tickets = response.data?.data?.tickets as EventTicketStatItem[] | undefined;

  return Array.isArray(tickets) ? tickets : [];
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
  orderId,
  ticketIndex,
  friendId,
}: {
  eventId: string;
  ticketId: string;
  orderId: string;
  ticketIndex: number;
  friendId: string;
}): Promise<TicketShare> => {
  const response = await api.post("/payments/ticket-shares", {
    eventId,
    ticketId,
    orderId,
    ticketIndex,
    friendId,
  });
  const share = response.data?.data?.share as TicketShare | undefined;

  if (!share) {
    throw new Error("The ticket share response was incomplete.");
  }

  emitTicketWalletChanged();

  return share;
};

export const cancelTicketShare = async (shareId: string): Promise<TicketShare> => {
  const response = await api.delete(`/payments/ticket-shares/${encodeURIComponent(shareId)}`);
  const share = response.data?.data?.share as TicketShare | undefined;

  if (!share) {
    throw new Error("The cancel share response was incomplete.");
  }

  emitTicketWalletChanged();

  return share;
};

export type CreatorEarningStatus = "held" | "eligible" | "withdrawn" | "refunded";

export type CreatorEarningItem = {
  id: string;
  orderId: string;
  eventId?: string | null;
  itemType: "ticket" | "product";
  grossAmount: number;
  platformFeePercent: number;
  platformFeeAmount: number;
  netAmount: number;
  status: CreatorEarningStatus;
  eligibleAt?: string | null;
  payoutId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorEarningsSummary = {
  heldAmount: number;
  eligibleAmount: number;
  pendingWithdrawalAmount: number;
  withdrawnAmount: number;
  totalEarnedAmount: number;
  earnings: CreatorEarningItem[];
};

export type EventEarningsSummary = {
  grossAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  refundedAmount: number;
  ticketNetAmount: number;
  productNetAmount: number;
  earnings: CreatorEarningItem[];
};

export const getMyEarningsSummary = async (): Promise<CreatorEarningsSummary> => {
  const response = await api.get("/payments/creator-earnings");
  const summary = response.data?.data?.summary as CreatorEarningsSummary | undefined;
  return summary ?? {
    heldAmount: 0,
    eligibleAmount: 0,
    pendingWithdrawalAmount: 0,
    withdrawnAmount: 0,
    totalEarnedAmount: 0,
    earnings: [],
  };
};

export const requestWithdrawal = async (params?: { amount?: number }): Promise<import("@/lib/payoutSettings").CreatorPayout> => {
  try {
    const response = await api.post("/payments/creator-earnings/withdraw", params ?? {});
    const payout = response.data?.data?.payout as import("@/lib/payoutSettings").CreatorPayout | undefined;

    if (!payout) {
      throw new Error("Withdrawal response was incomplete.");
    }

    return payout;
  } catch (error) {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;

      if (typeof message === "string" && message.trim()) {
        throw new Error(message);
      }
    }

    throw error;
  }
};

export const getMyEarningsByEvent = async (eventId: string): Promise<EventEarningsSummary> => {
  const response = await api.get(`/payments/creator-earnings/events/${encodeURIComponent(eventId)}`);
  const summary = response.data?.data?.summary as EventEarningsSummary | undefined;
  return summary ?? {
    grossAmount: 0,
    platformFeeAmount: 0,
    netAmount: 0,
    refundedAmount: 0,
    ticketNetAmount: 0,
    productNetAmount: 0,
    earnings: [],
  };
};

export const scanTicketQrCode = async (checkInCode: string, eventId?: string): Promise<ScannedTicket> => {
  const response = await api.post("/payments/ticket-scans", {
    checkInCode: checkInCode.trim().toUpperCase(),
    ...(eventId ? { eventId } : {}),
  });
  const ticket = response.data?.data?.ticket as ScannedTicket | undefined;

  if (!ticket) {
    throw new Error("The ticket scan response was incomplete.");
  }

  emitTicketWalletChanged();

  return ticket;
};

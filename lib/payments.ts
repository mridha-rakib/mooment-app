import { api } from "@/lib/api";

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
  totalAmount: number;
  stripePaymentIntentId: string;
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
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  acceptedTerms: boolean;
};

type CreateCustomCheckoutIntentPayload = {
  kind: "custom";
  paymentMethod: CheckoutPaymentMethod;
  items: Array<{
    name: string;
    amount: number;
    quantity: number;
  }>;
  acceptedTerms: boolean;
};

export type CreateCheckoutIntentPayload =
  | CreateTicketCheckoutIntentPayload
  | CreateProductCheckoutIntentPayload
  | CreateCustomCheckoutIntentPayload;

export type CheckoutIntent = {
  order: CheckoutOrder;
  paymentIntentClientSecret: string;
  publishableKey: string;
  merchantDisplayName: string;
  merchantCountryCode: string;
};

export const createCheckoutIntent = async (
  payload: CreateCheckoutIntentPayload,
): Promise<CheckoutIntent> => {
  const response = await api.post("/payments/checkout-intents", payload);
  const checkout = response.data?.data?.checkout as CheckoutIntent | undefined;

  if (!checkout?.paymentIntentClientSecret || !checkout.order) {
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

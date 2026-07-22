import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import {
  cancelCheckoutOrder,
  confirmCheckoutOrder,
  createCheckoutIntent,
  type CheckoutOrder,
  type CreateCheckoutIntentPayload,
} from "@/lib/payments";

const stripeMerchantIdentifier =
  (Constants.expoConfig?.extra?.stripeMerchantIdentifier as string | undefined)?.trim() ||
  process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER?.trim();

const loadStripeSdk = async () => {
  try {
    return await import("@stripe/stripe-react-native");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("StripeSdk") ||
      message.includes("@stripe/stripe-react-native")
    ) {
      throw new Error(
        "Stripe payments are not available in this dev build. Rebuild the Expo dev client after installing @stripe/stripe-react-native.",
      );
    }

    throw error;
  }
};

export const startStripeCheckout = async (
  payload: CreateCheckoutIntentPayload,
  options?: { isDark?: boolean; onCheckoutCreated?: (checkout: Awaited<ReturnType<typeof createCheckoutIntent>>) => void },
): Promise<CheckoutOrder | null> => {
  if (payload.paymentMethod === "apple_pay" && Platform.OS !== "ios") {
    throw new Error("Apple Pay is only available on iOS devices.");
  }

  if (payload.paymentMethod === "apple_pay" && !stripeMerchantIdentifier) {
    throw new Error("Apple Pay is not configured. Add EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER.");
  }

  const { initPaymentSheet, initStripe, presentPaymentSheet } = await loadStripeSdk();
  const checkout = await createCheckoutIntent(payload);
  options?.onCheckoutCreated?.(checkout);

  if (!checkout.publishableKey || !checkout.paymentIntentClientSecret) {
    throw new Error("Stripe checkout was not initialized by the server.");
  }

  await initStripe({
    publishableKey: checkout.publishableKey,
    merchantIdentifier: stripeMerchantIdentifier,
  });

  const { error: initError } = await initPaymentSheet({
    merchantDisplayName: checkout.merchantDisplayName,
    paymentIntentClientSecret: checkout.paymentIntentClientSecret,
    returnURL: Linking.createURL("stripe-redirect"),
    style: options?.isDark === false ? "automatic" : "alwaysDark",
    allowsDelayedPaymentMethods: false,
    primaryButtonLabel: "Pay now",
    ...(payload.paymentMethod === "apple_pay" && Platform.OS === "ios"
      ? {
          applePay: {
            merchantCountryCode: checkout.merchantCountryCode,
          },
          paymentMethodOrder: ["apple_pay", "card"],
        }
      : {
          paymentMethodOrder: ["card"],
        }),
  });

  if (initError) {
    throw new Error(initError.message);
  }

  const { error: paymentError } = await presentPaymentSheet();

  if (paymentError) {
    if (paymentError.code === "Canceled") {
      // User dismissed the PaymentSheet — not an error; release the reservation server-side
      await cancelCheckoutOrder(checkout.order.id).catch(() => {});
      return null;
    }

    // Genuine payment failure — release the reservation and surface the error
    await cancelCheckoutOrder(checkout.order.id).catch(() => {});
    throw new Error(paymentError.message);
  }

  const order = await confirmCheckoutOrder(checkout.order.id);

  if (order.paymentStatus !== "paid" && order.paymentStatus !== "processing") {
    throw new Error("Payment was not completed.");
  }

  return order;
};

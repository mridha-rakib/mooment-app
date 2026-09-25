import type { Router } from "expo-router";
import { getPurchasedTicket, type TicketWalletItem, type TicketWalletPass } from "@/lib/payments";

const locationLabel = (item: TicketWalletItem) =>
  item.event.location?.venue ?? item.event.location?.searchLabel ?? "Location TBA";

const addressLabel = (item: TicketWalletItem) =>
  item.event.location?.address ?? item.event.location?.searchLabel ?? "Address TBA";

const dateLabel = (value?: string | null) => {
  if (!value) return "Date TBA";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Date TBA";
};

export const getPurchasedTicketDetailParams = (
  item: TicketWalletItem,
  pass: TicketWalletPass,
  remainingPurchasableQuantity?: number,
) => ({
  source: "wallet",
  walletSource: item.source,
  walletStatus: pass.status === "cancelled" ? "cancelled" : pass.status === "used" ? "used" : item.walletStatus,
  cancellationReason: item.event.cancellationDisplayReason ?? (item.event.status === "cancelled" ? "Event canceled" : ""),
  purchaseCount: "1",
  paidQuantity: String(item.paidQuantity ?? 1),
  freeQuantity: String(item.freeQuantity ?? 0),
  totalQuantity: "1",
  ticketNo: pass.ticketNo,
  orderId: pass.orderId,
  eventId: item.event.id,
  eventStatus: item.event.status,
  crowdStatus: item.event.crowdStatus ?? "",
  ticketId: item.ticketId,
  eventTitle: item.event.name ?? item.ticketName,
  ticketName: item.ticketName,
  hostName: item.event.host?.name ?? "Host",
  hostHandle: item.event.host?.username ? `@${item.event.host.username}` : "",
  bannerImageKey: item.event.bannerOriginalImageKey ?? item.event.bannerImageKey ?? "",
  location: locationLabel(item),
  address: addressLabel(item),
  dateTime: dateLabel(item.event.scheduledAt),
  eventStartDateTime: dateLabel(item.event.scheduledAt),
  eventEndDateTime: dateLabel(item.event.endAt),
  amount: String(item.totalAmount),
  currency: item.currency,
  offerClaimed: item.rewardSnapshot ? "true" : "",
  refundStatus: item.refund?.status ?? "",
  ticketPasses: JSON.stringify([pass]),
  walletContextPasses: JSON.stringify(item.walletContextPasses ?? item.ticketPasses ?? [pass]),
  selectedOrderId: pass.orderId,
  selectedTicketIndex: String(pass.ticketIndex),
  ...(typeof remainingPurchasableQuantity === "number"
    ? { remainingPurchasableQuantity: String(remainingPurchasableQuantity) }
    : {}),
});

export const openPurchasedTicket = async (
  router: Router,
  identity: { orderId: string; ticketId: string; ticketIndex: number },
  mode: "push" | "replace" = "push",
) => {
  const result = await getPurchasedTicket(identity);
  const pass = result.ticket.ticketPasses?.[0];
  if (!pass) throw new Error("Purchased ticket details are unavailable.");
  router[mode]({
    pathname: "/event-screen/ticket-detail",
    params: getPurchasedTicketDetailParams(result.ticket, pass, result.remainingPurchasableQuantity),
  } as never);
};

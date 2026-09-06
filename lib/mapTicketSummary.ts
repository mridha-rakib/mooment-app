export type MapTicketSummaryTicket = {
  salesEndAt?: string | null;
  // Server-derived (EventResponse ticket): Boolean(salesEndAt && salesEndAt <= serverNow),
  // the exact rule Checkout enforces. Preferred over the device-clock check below.
  salesEnded?: boolean | null;
  type?: string | null;
  price?: number | null;
  capacity?: number | null;
  availableCount?: number | null;
};

export type MapTicketSummary = {
  ticketTypeCountLabel: string;
  priceLabel: string;
  ticketsAvailableLabel: string;
  salesEndLabel: string | null;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const getTicketAvailability = (ticket: MapTicketSummaryTicket) =>
  Math.max(0, ticket.availableCount ?? ticket.capacity ?? 0);

const isFreeTicket = (ticket: MapTicketSummaryTicket) =>
  ticket.type === "free" || (isFiniteNumber(ticket.price) && ticket.price <= 0);

const getTicketSalesEndTime = (ticket: MapTicketSummaryTicket) => {
  if (!ticket.salesEndAt) {
    return null;
  }

  const time = new Date(ticket.salesEndAt).getTime();

  return Number.isFinite(time) ? time : null;
};

// Shared sales-ended check. Prefers the server-derived `salesEnded` flag
// (same rule Checkout's resolveLineItems enforces); only falls back to the
// device-clock comparison for legacy payloads that don't carry it. A null
// salesEndAt with no flag means "no explicit deadline" -> not ended.
export const isTicketSalesEnded = (
  ticket: MapTicketSummaryTicket,
  nowMs: number = Date.now(),
) => {
  if (typeof ticket.salesEnded === "boolean") {
    return ticket.salesEnded;
  }

  const salesEndTime = getTicketSalesEndTime(ticket);

  return salesEndTime !== null && salesEndTime <= nowMs;
};

// Single source of truth for "purchasable tickets remaining" across surfaces:
// sum of availableCount (legacy `?? capacity` fallback) over tiers that still
// have inventory AND whose sales deadline has not passed. Negative values are
// clamped; null/undefined availableCount keeps the existing capacity fallback.
export const getPurchasableTicketsRemaining = (
  tickets: MapTicketSummaryTicket[],
  nowMs: number = Date.now(),
): number =>
  (tickets ?? [])
    .filter((ticket) => getTicketAvailability(ticket) > 0 && !isTicketSalesEnded(ticket, nowMs))
    .reduce((total, ticket) => total + getTicketAvailability(ticket), 0);

const formatMoney = (price: number) =>
  `$${price.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  })}`;

const formatSalesEndDate = (time: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(time));

export const getMapTicketSummary = (
  tickets: MapTicketSummaryTicket[],
  nowMs = Date.now(),
): MapTicketSummary => {
  const ticketTypeCount = tickets.length;
  const relevantTickets = tickets.filter((ticket) =>
    getTicketAvailability(ticket) > 0 && !isTicketSalesEnded(ticket, nowMs),
  );
  const remainingTickets = relevantTickets.reduce(
    (total, ticket) => total + getTicketAvailability(ticket),
    0,
  );
  const paidPrices = relevantTickets
    .filter((ticket) => !isFreeTicket(ticket))
    .map((ticket) => ticket.price)
    .filter((price): price is number => isFiniteNumber(price) && price > 0);
  const hasFreeTicket = relevantTickets.some(isFreeTicket);

  let priceLabel = "Tickets TBA";
  if (ticketTypeCount > 0 && relevantTickets.length === 0) {
    priceLabel = "Sold out";
  } else if (hasFreeTicket && paidPrices.length > 0) {
    priceLabel = "Free & Paid";
  } else if (hasFreeTicket) {
    priceLabel = "Free";
  } else if (paidPrices.length > 0) {
    priceLabel = `From ${formatMoney(Math.min(...paidPrices))}`;
  }

  let ticketsAvailableLabel = "Tickets TBA";
  if (ticketTypeCount > 0 && remainingTickets <= 0) {
    ticketsAvailableLabel = "Sold out";
  } else if (remainingTickets > 0) {
    ticketsAvailableLabel = `${remainingTickets} ${remainingTickets === 1 ? "Ticket" : "Tickets"} Left`;
  }

  let salesEndLabel: string | null = null;
  if (relevantTickets.length > 0) {
    const salesEndTimes = relevantTickets.map(getTicketSalesEndTime);
    if (salesEndTimes.every((time): time is number => time !== null)) {
      const uniqueTimes = [...new Set(salesEndTimes)];
      salesEndLabel = uniqueTimes.length === 1
        ? `Sales end ${formatSalesEndDate(uniqueTimes[0]!)}`
        : "Sales end dates vary";
    }
  }

  return {
    ticketTypeCountLabel: `${ticketTypeCount} ${ticketTypeCount === 1 ? "Ticket Type" : "Ticket Types"}`,
    priceLabel,
    ticketsAvailableLabel,
    salesEndLabel,
  };
};

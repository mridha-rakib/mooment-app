export type MapTicketSummaryTicket = {
  salesEndAt?: string | null;
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

const isTicketSalesEnded = (ticket: MapTicketSummaryTicket, nowMs: number) => {
  const salesEndTime = getTicketSalesEndTime(ticket);

  return salesEndTime !== null && salesEndTime <= nowMs;
};

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

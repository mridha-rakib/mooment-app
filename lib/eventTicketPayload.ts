import type { EventTicketPayload, EventTicketRequestPayload } from "@/lib/events";

// Explicit allowlist write-model sanitizer for Event tickets.
//
// `EventTicketPayload` (the RESPONSE shape returned by the backend) carries
// server-owned/computed fields — `salesEnded` (derived from salesEndAt vs.
// server time, see the comment on it in app/lib/events.ts) and
// `availableCount` (server-owned inventory) — that must never be echoed back
// into a write request. A ticket loaded via loadFromEvent()/mergeTicketsFromEvent
// spreads the full response object into draft state, so those fields are
// present on `EventDraftTicket` even though the wizard never edits them.
//
// This is deliberately an ALLOWLIST (only known-writable fields are copied
// out), not a blocklist of known-bad fields — a blocklist silently reopens
// this exact bug the moment a new response-only field is added to
// `EventTicketPayload` and someone forgets to also exclude it here.
export const toEventTicketInput = (
  ticket: EventTicketPayload,
): EventTicketRequestPayload => ({
  ...(ticket.id !== undefined ? { id: ticket.id } : {}),
  name: ticket.name,
  description: ticket.description,
  salesEndAt: ticket.salesEndAt,
  type: ticket.type,
  price: ticket.price,
  capacity: ticket.capacity,
});

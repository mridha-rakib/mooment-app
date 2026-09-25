import { isSameLocalCalendarDate } from "./eventDateRange";
import { instantToWallClockPartsForEvent } from "./eventLocalTime";

export const TICKET_CREATION_CUTOFF_MS = 30 * 60 * 1000;
export const TICKET_CREATION_CUTOFF_MESSAGE =
  "New tickets can’t be created within 30 minutes of the event end time.";
export const TICKET_PRICE_EDIT_CUTOFF_MESSAGE =
  "Ticket price can’t be changed within 30 minutes of the event end time.";
export const TICKET_SALES_END_DATE_AFTER_EVENT_END_MESSAGE =
  "Ticket sales end date must be before the event end date.";
export const TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE =
  "Ticket sales end time must be before the event end time.";

export type TicketSalesEndValidationError = {
  field: "salesEndDate" | "salesEndTime";
  message: string;
};

export const getDateTimeMs = (value?: string | Date | null): number | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();

  return Number.isFinite(time) ? time : null;
};

export const isTicketCreationCutoffReached = (
  eventEndAt?: string | Date | null,
  currentTimeMs = Date.now(),
): boolean => {
  const eventEndMs = getDateTimeMs(eventEndAt);

  return eventEndMs !== null && currentTimeMs >= eventEndMs - TICKET_CREATION_CUTOFF_MS;
};

export const isAfterLocalCalendarDate = (left: Date, right: Date) => {
  const leftDay = Date.UTC(left.getFullYear(), left.getMonth(), left.getDate());
  const rightDay = Date.UTC(right.getFullYear(), right.getMonth(), right.getDate());

  return leftDay > rightDay;
};

// Event-timezone-aware calendar-day comparison, used only to CLASSIFY an
// already-invalid instant as a "date" vs "time" error (the pass/fail rule
// itself is always the instant comparison in getTicketSalesEndEventEndError
// below, never this). When an Event IANA timezone is known, both instants are
// read as venue-local calendar dates via the existing edit-hydration helper
// (instantToWallClockPartsForEvent) — the same mechanism EVT-008 already uses
// to reinterpret an absolute instant in the venue's zone — so classification
// matches what the host sees on the Event's own clock, not the device's.
// Falls back to device-local calendar math (the historical behavior) only
// when no Event timezone is available, e.g. a legacy Event with
// `timezone: null` — see EVT-008's documented null-timezone fallback policy.
const getEventCalendarDateKeys = (
  left: Date,
  right: Date,
  eventTimeZone?: string | null,
): [string, string] | null => {
  if (!eventTimeZone) {
    return null;
  }

  const leftParts = instantToWallClockPartsForEvent(left, eventTimeZone);
  const rightParts = instantToWallClockPartsForEvent(right, eventTimeZone);

  if (!leftParts || !rightParts) {
    return null;
  }

  return [leftParts.dateKey, rightParts.dateKey];
};

export const isAfterEventCalendarDate = (left: Date, right: Date, eventTimeZone?: string | null) => {
  const keys = getEventCalendarDateKeys(left, right, eventTimeZone);

  if (keys) {
    return keys[0] > keys[1];
  }

  return isAfterLocalCalendarDate(left, right);
};

export const isSameEventCalendarDate = (left: Date, right: Date, eventTimeZone?: string | null) => {
  const keys = getEventCalendarDateKeys(left, right, eventTimeZone);

  if (keys) {
    return keys[0] === keys[1];
  }

  return isSameLocalCalendarDate(left, right);
};

export const getTicketSalesEndEventEndError = (
  salesEndAt: Date,
  eventEndAt?: Date | null,
  eventTimeZone?: string | null,
): TicketSalesEndValidationError | null => {
  if (!eventEndAt || Number.isNaN(eventEndAt.getTime())) {
    return null;
  }

  // Authoritative pass/fail is always the absolute instant comparison —
  // strictly-less-than, so equality is invalid. Timezone only affects which
  // of the two messages below is chosen, never whether this is an error.
  if (salesEndAt.getTime() < eventEndAt.getTime()) {
    return null;
  }

  if (isAfterEventCalendarDate(salesEndAt, eventEndAt, eventTimeZone)) {
    return {
      field: "salesEndDate",
      message: TICKET_SALES_END_DATE_AFTER_EVENT_END_MESSAGE,
    };
  }

  return {
    field: "salesEndTime",
    message: TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE,
  };
};

export const normalizeTicketPrice = (value: number) =>
  Number.isFinite(value) ? value : 0;

// EVT-013, Part D/F — Event End change dependency check. Given the CURRENT
// set of ticket tiers in the draft and a proposed Event end, reports every
// tier whose salesEndAt would become invalid (checks all tiers, not just the
// first). This never mutates a ticket — it only reports conflicts so the
// caller can block forward progression until the host fixes them explicitly.
export type TicketDeadlineConflict = {
  localId?: string;
  ticketName: string;
};

export const TICKET_DEADLINE_DEPENDENCY_MESSAGE =
  "One or more ticket sales deadlines must be before the Event end time.";

export const getTicketDeadlineConflicts = (
  tickets: { name: string; salesEndAt?: string | Date | null; localId?: string }[],
  eventEndAt: Date | null | undefined,
  eventTimeZone?: string | null,
): TicketDeadlineConflict[] => {
  if (!eventEndAt || Number.isNaN(eventEndAt.getTime())) {
    return [];
  }

  return tickets.reduce<TicketDeadlineConflict[]>((conflicts, ticket) => {
    if (!ticket.salesEndAt) {
      return conflicts;
    }

    const salesEndAt = ticket.salesEndAt instanceof Date ? ticket.salesEndAt : new Date(ticket.salesEndAt);

    if (Number.isNaN(salesEndAt.getTime())) {
      return conflicts;
    }

    if (getTicketSalesEndEventEndError(salesEndAt, eventEndAt, eventTimeZone)) {
      conflicts.push({ localId: ticket.localId, ticketName: ticket.name });
    }

    return conflicts;
  }, []);
};

export const getTicketDeadlineDependencyMessage = (
  conflicts: TicketDeadlineConflict[],
): string | null => {
  if (conflicts.length === 0) {
    return null;
  }

  if (conflicts.length === 1) {
    return `${conflicts[0].ticketName} ticket sales end after the new Event end time.`;
  }

  return TICKET_DEADLINE_DEPENDENCY_MESSAGE;
};

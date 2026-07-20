import { isSameLocalCalendarDate } from "./eventDateRange";

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

export const getTicketSalesEndEventEndError = (
  salesEndAt: Date,
  eventEndAt?: Date | null,
): TicketSalesEndValidationError | null => {
  if (!eventEndAt || Number.isNaN(eventEndAt.getTime())) {
    return null;
  }

  if (isAfterLocalCalendarDate(salesEndAt, eventEndAt)) {
    return {
      field: "salesEndDate",
      message: TICKET_SALES_END_DATE_AFTER_EVENT_END_MESSAGE,
    };
  }

  if (isSameLocalCalendarDate(salesEndAt, eventEndAt) && salesEndAt.getTime() >= eventEndAt.getTime()) {
    return {
      field: "salesEndTime",
      message: TICKET_SALES_END_TIME_NOT_BEFORE_EVENT_END_MESSAGE,
    };
  }

  return null;
};

export const normalizeTicketPrice = (value: number) =>
  Number.isFinite(value) ? value : 0;

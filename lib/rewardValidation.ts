import { isSameLocalCalendarDate } from "./eventDateRange";

export const REWARD_END_DATE_AFTER_TICKET_SALES_END_MESSAGE =
  "Reward end date cannot be after the ticket sales end date.";
export const REWARD_END_TIME_AFTER_TICKET_SALES_END_MESSAGE =
  "Reward end time cannot be after the ticket sales end time.";

export type RewardTicketSalesEndValidationError = {
  field: "endDate" | "endTime";
  message: string;
};

const toValidDate = (value?: Date | string | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getLocalCalendarKey = (date: Date) =>
  date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

export const getRewardTicketSalesEndError = (
  rewardExpiresAt: Date,
  ticketSalesEndAt?: Date | string | null,
): RewardTicketSalesEndValidationError | null => {
  const expiresAt = toValidDate(rewardExpiresAt);
  const salesEndAt = toValidDate(ticketSalesEndAt);

  if (!expiresAt || !salesEndAt) {
    return null;
  }

  const rewardDateKey = getLocalCalendarKey(expiresAt);
  const salesEndDateKey = getLocalCalendarKey(salesEndAt);

  if (rewardDateKey > salesEndDateKey) {
    return {
      field: "endDate",
      message: REWARD_END_DATE_AFTER_TICKET_SALES_END_MESSAGE,
    };
  }

  if (rewardDateKey < salesEndDateKey || !isSameLocalCalendarDate(expiresAt, salesEndAt)) {
    return null;
  }

  if (expiresAt.getTime() > salesEndAt.getTime()) {
    return {
      field: "endTime",
      message: REWARD_END_TIME_AFTER_TICKET_SALES_END_MESSAGE,
    };
  }

  return null;
};

import { combineLocalDateAndTime, getEventDateRangeError } from "./eventDateRange";

export const START_IN_PAST_MESSAGE = "Start date and time cannot be in the past.";
export const ONGOING_START_CHANGED_MESSAGE = "Start date and time cannot be changed after the event has started.";
export const ONGOING_END_IN_PAST_MESSAGE = "End date and time must remain in the future for an ongoing event.";

export type EventStepTwoScheduleValues = {
  startDate: Date;
  endDate: Date;
  startTime: Date;
  endTime: Date;
};

export type EventStepTwoScheduleErrors = Partial<
  Record<keyof EventStepTwoScheduleValues, string>
>;

type OngoingEditInput = {
  isEditingPublishedEvent: boolean;
  originalScheduledAt?: string | null;
  persistedEndAt?: string | null;
  now?: Date;
};

const getValidDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameLocalMinute = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate() &&
  left.getHours() === right.getHours() &&
  left.getMinutes() === right.getMinutes();

export const isOngoingPublishedEventEdit = ({
  isEditingPublishedEvent,
  originalScheduledAt,
  persistedEndAt,
  now = new Date(),
}: OngoingEditInput) => {
  if (!isEditingPublishedEvent) {
    return false;
  }

  const originalStart = getValidDate(originalScheduledAt);
  const persistedEnd = getValidDate(persistedEndAt);

  if (!originalStart || !persistedEnd) {
    return false;
  }

  const nowMs = now.getTime();

  return originalStart.getTime() <= nowMs && nowMs < persistedEnd.getTime();
};

export const isEventEndedByTime = (endAt?: string | null, nowMs = Date.now()) => {
  const end = getValidDate(endAt);

  return Boolean(end && end.getTime() <= nowMs);
};

export const getEventStepTwoScheduleErrors = (
  values: EventStepTwoScheduleValues,
  options: {
    isOngoingEdit: boolean;
    originalScheduledAt?: string | null;
    now?: Date;
  },
): EventStepTwoScheduleErrors => {
  const scheduledAt = combineLocalDateAndTime(values.startDate, values.startTime);
  const endAt = combineLocalDateAndTime(values.endDate, values.endTime);
  const now = options.now ?? new Date();

  if (!options.isOngoingEdit) {
    if (scheduledAt < now) {
      return { startDate: START_IN_PAST_MESSAGE };
    }

    const message = getEventDateRangeError(scheduledAt, endAt);

    return message ? { endDate: message } : {};
  }

  const originalScheduledAt = getValidDate(options.originalScheduledAt);

  if (!originalScheduledAt || !isSameLocalMinute(scheduledAt, originalScheduledAt)) {
    return { startDate: ONGOING_START_CHANGED_MESSAGE };
  }

  const rangeMessage = getEventDateRangeError(originalScheduledAt, endAt);

  if (rangeMessage) {
    return { endDate: rangeMessage };
  }

  if (endAt <= now) {
    return { endDate: ONGOING_END_IN_PAST_MESSAGE };
  }

  return {};
};

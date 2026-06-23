const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

export const isSameLocalCalendarDate = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const getEventDateRangeError = (startAt: Date, endAt: Date): string | null => {
  if (!isValidDate(startAt) || !isValidDate(endAt) || endAt > startAt) {
    return null;
  }

  if (isSameLocalCalendarDate(startAt, endAt)) {
    return 'End time must be after the start time for a single-day event.';
  }

  return 'End date and time must be after the start date and time.';
};

export const getLocalCalendarDaySpan = (startAt: Date, endAt: Date) => {
  const startDay = Date.UTC(startAt.getFullYear(), startAt.getMonth(), startAt.getDate());
  const endDay = Date.UTC(endAt.getFullYear(), endAt.getMonth(), endAt.getDate());

  return Math.max(0, Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)));
};

export const combineLocalDateAndTime = (date: Date, time: Date, dayOffset = 0) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + dayOffset,
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  );

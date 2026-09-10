/**
 * Event venue-local wall-clock transport (Batch 3A, frontend half).
 *
 * Pure, dependency-free. The app NEVER resolves an IANA timezone from
 * coordinates — that is server-only. These helpers only:
 *
 *   1. extract the user's VISIBLE picker wall-clock as "YYYY-MM-DD" + "HH:mm"
 *      (never via `Date#toISOString()`, which shifts through the device zone),
 *   2. rebuild a picker `Date` whose local components equal those parts,
 *   3. for edit hydration only, read an absolute instant back into venue-local
 *      parts using `Intl.DateTimeFormat({ timeZone })` — no DST math here, the
 *      backend already owns gap/fold resolution.
 */

export type EventWallClockParts = {
  /** Calendar date in the venue's local zone, `YYYY-MM-DD`. */
  dateKey: string;
  /** Wall-clock time in the venue's local zone, 24h `HH:mm`. */
  time: string;
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_KEY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isEventDateKey = (value: unknown): value is string =>
  typeof value === "string" && DATE_KEY_PATTERN.test(value);

export const isEventTimeKey = (value: unknown): value is string =>
  typeof value === "string" && TIME_KEY_PATTERN.test(value);

/** Picker date `Date` → `"YYYY-MM-DD"` from its local calendar components. */
export const dateToDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Picker time `Date` → `"HH:mm"` from its local clock components. */
export const dateToTimeKey = (date: Date): string =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/**
 * The two picker `Date`s the user sees (a date picker + a time picker) →
 * a single wall-clock transport pair. Uses only local getters, so the result is
 * independent of the device timezone.
 */
export const pickersToWallClockParts = (date: Date, time: Date): EventWallClockParts => ({
  dateKey: dateToDateKey(date),
  time: dateToTimeKey(time),
});

/**
 * Wall-clock parts → a `Date` whose LOCAL components equal those parts, suitable
 * as a picker `value`. This uses the local `Date` constructor deliberately: it
 * only positions the picker spinner, it is never treated as an absolute instant.
 * Returns `null` for malformed parts.
 */
export const wallClockPartsToPickerDate = (
  parts: EventWallClockParts | null | undefined,
): Date | null => {
  if (!parts || !isEventDateKey(parts.dateKey) || !isEventTimeKey(parts.time)) {
    return null;
  }
  const [year, month, day] = parts.dateKey.split("-").map(Number) as [number, number, number];
  const [hour, minute] = parts.time.split(":").map(Number) as [number, number];
  const built = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(built.getTime()) ? null : built;
};

const hydrationFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getHydrationFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = hydrationFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    hydrationFormatterCache.set(timeZone, formatter);
  }
  return formatter;
};

/**
 * Edit hydration: absolute instant + the Event's IANA `timezone` → the
 * venue-local wall-clock the creator intended. Uses `formatToParts` (no locale
 * string parsing). Returns `null` for a missing/invalid instant or timezone so
 * callers fall back to legacy device-local hydration.
 */
export const instantToWallClockPartsForEvent = (
  isoOrDate: string | Date | null | undefined,
  timeZone: string | null | undefined,
): EventWallClockParts | null => {
  if (!isoOrDate || !timeZone || typeof timeZone !== "string") {
    return null;
  }
  const instant = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = getHydrationFormatter(timeZone);
  } catch {
    return null;
  }

  const lookup: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }

  const year = lookup.year;
  const month = lookup.month;
  const day = lookup.day;
  const hour = lookup.hour === "24" ? "00" : lookup.hour;
  const minute = lookup.minute;
  if (!year || !month || !day || !hour || !minute) {
    return null;
  }

  const parts: EventWallClockParts = {
    dateKey: `${year}-${pad2(Number(month))}-${pad2(Number(day))}`,
    time: `${pad2(Number(hour))}:${pad2(Number(minute))}`,
  };
  return isEventDateKey(parts.dateKey) && isEventTimeKey(parts.time) ? parts : null;
};

/**
 * Pick the picker's initial `Date` with the APPROVED priority:
 *   1. explicit stored wall-clock parts (the user's own selection),
 *   2. absolute instant reinterpreted in the Event's known IANA timezone,
 *   3. legacy device-local interpretation of the absolute instant.
 */
export const resolveInitialPickerDate = (
  storedParts: EventWallClockParts | null | undefined,
  scheduledAt: string | Date | null | undefined,
  timeZone: string | null | undefined,
): Date | null => {
  const fromStored = wallClockPartsToPickerDate(storedParts ?? null);
  if (fromStored) {
    return fromStored;
  }

  const fromZone = wallClockPartsToPickerDate(
    instantToWallClockPartsForEvent(scheduledAt ?? null, timeZone ?? null),
  );
  if (fromZone) {
    return fromZone;
  }

  if (!scheduledAt) {
    return null;
  }
  const legacy = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);
  return Number.isNaN(legacy.getTime()) ? null : legacy;
};

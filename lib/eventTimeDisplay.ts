/**
 * Batch 3C — venue-local primary time + viewer-local secondary equivalent.
 *
 * ONE shared, pure display helper for every active Event-schedule surface
 * (Feed card, Map card, Event Detail, …). It never resolves a timezone from
 * coordinates (server-only) and never mutates data — it only formats
 * `scheduledAt` / `endAt` (absolute UTC instants) for display.
 *
 * Rules:
 *   - `timezone` known  → PRIMARY is the Event's venue-local wall-clock, with a
 *     short zone label from `Intl` (DST-correct for the Event's actual date);
 *     a SECONDARY "…your time" line is added only when the viewer's device
 *     wall-clock (y/m/d/h/min) differs from the Event's.
 *   - `timezone` null / invalid → PRIMARY is the device-local rendering exactly
 *     as before 3C; no zone label, no secondary line.
 */
import { instantToWallClockPartsForEvent } from "@/lib/eventLocalTime";

const DISPLAY_LOCALE = "en-US";

export type EventTimeDisplayInput = {
  scheduledAt: string | Date | null | undefined;
  endAt?: string | Date | null;
  timezone?: string | null;
  /** Injectable for tests; defaults to `new Date()`. Only affects nothing here — reserved. */
  now?: Date;
};

export type EventTimeDisplayModel = {
  /** True when the Event carries a usable IANA timezone. */
  hasKnownZone: boolean;
  /** `"Sun, Sep 20"` — Event-local (or device-local when the zone is unknown). */
  primaryDateText: string;
  /** `"7:00 PM"` — Event-local start. */
  primaryTimeText: string;
  /** `"9:00 PM"` — Event-local end, or `null` when there is no `endAt`. */
  primaryEndTimeText: string | null;
  /** `"7:00 – 9:00 PM"` when `endAt` is on the same Event-local day, else start only. */
  primaryTimeRangeText: string;
  /** `"Sun, Sep 21"` when `endAt` falls on a different Event-local day, else `null`. */
  primaryEndDateText: string | null;
  /** Short zone label for the Event's date, e.g. `"EDT"` / `"GMT+6"`. `null` when unknown. */
  primaryZoneText: string | null;
  /** `"Sun, Sep 20 · 7:00 PM EDT"` — the one-line primary. */
  primaryDateTimeText: string;
  /** True only when the zone is known AND the viewer wall-clock differs. */
  showViewerEquivalent: boolean;
  /** Viewer/device-local equivalents of the SAME instant. `null` unless `showViewerEquivalent`. */
  viewerDateText: string | null;
  viewerTimeText: string | null;
  viewerEndTimeText: string | null;
  viewerEndDateText: string | null;
  /** `"Sep 21 · 5:00 AM your time"` — always carries the viewer date to avoid next-day ambiguity. */
  viewerDateTimeText: string | null;
};

type FormatterKind = "weekday" | "time" | "zone";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const buildFormatter = (kind: FormatterKind, timeZone: string | null): Intl.DateTimeFormat => {
  const zoneOption = timeZone ? { timeZone } : {};
  const options: Intl.DateTimeFormatOptions =
    kind === "weekday"
      ? { ...zoneOption, weekday: "short", month: "short", day: "numeric" }
      : kind === "time"
        ? { ...zoneOption, hour: "numeric", minute: "2-digit" }
        : { ...zoneOption, hour: "numeric", timeZoneName: "short" };
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, options);
};

const getFormatter = (kind: FormatterKind, timeZone: string | null): Intl.DateTimeFormat => {
  // Only zone-pinned formatters are cached — they are deterministic. A
  // device-timezone (no `timeZone`) formatter must be rebuilt every call so it
  // reflects the current runtime timezone.
  if (!timeZone) {
    return buildFormatter(kind, null);
  }
  const key = `${kind}|${timeZone}`;
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }
  const formatter = buildFormatter(kind, timeZone);
  formatterCache.set(key, formatter);
  return formatter;
};

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (value == null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isUsableTimeZone = (timeZone: string | null | undefined): timeZone is string => {
  if (!timeZone || typeof timeZone !== "string") {
    return false;
  }
  try {
    new Intl.DateTimeFormat(DISPLAY_LOCALE, { timeZone });
    return true;
  } catch {
    return false;
  }
};

const shortZoneLabel = (instant: Date, timeZone: string): string | null => {
  try {
    for (const part of getFormatter("zone", timeZone).formatToParts(instant)) {
      if (part.type === "timeZoneName" && part.value) {
        return part.value;
      }
    }
  } catch {
    return null;
  }
  return null;
};

type WallClock = { year: number; month: number; day: number; hour: number; minute: number };

const deviceWallClock = (instant: Date): WallClock => ({
  year: instant.getFullYear(),
  month: instant.getMonth() + 1,
  day: instant.getDate(),
  hour: instant.getHours(),
  minute: instant.getMinutes(),
});

const sameWallClock = (a: WallClock, b: WallClock): boolean =>
  a.year === b.year &&
  a.month === b.month &&
  a.day === b.day &&
  a.hour === b.hour &&
  a.minute === b.minute;

const sameLocalDay = (a: WallClock, b: WallClock): boolean =>
  a.year === b.year && a.month === b.month && a.day === b.day;

const emptyModel: EventTimeDisplayModel = {
  hasKnownZone: false,
  primaryDateText: "",
  primaryTimeText: "",
  primaryEndTimeText: null,
  primaryTimeRangeText: "",
  primaryEndDateText: null,
  primaryZoneText: null,
  primaryDateTimeText: "",
  showViewerEquivalent: false,
  viewerDateText: null,
  viewerTimeText: null,
  viewerEndTimeText: null,
  viewerEndDateText: null,
  viewerDateTimeText: null,
};

/**
 * Build the display model for an Event's schedule. Safe for any global IANA
 * zone and any device timezone; never throws.
 */
export const formatEventTimeDisplay = (input: EventTimeDisplayInput): EventTimeDisplayModel => {
  const start = toDate(input.scheduledAt);
  if (!start) {
    return { ...emptyModel };
  }
  const end = toDate(input.endAt ?? null);
  const knownZone = isUsableTimeZone(input.timezone) ? (input.timezone as string) : null;

  // ── Zone unknown / invalid → device-local rendering, exactly as pre-3C ──
  if (!knownZone) {
    const startDate = getFormatter("weekday", null).format(start);
    const startTime = getFormatter("time", null).format(start);
    const endTime = end ? getFormatter("time", null).format(end) : null;
    const endSameDay = end ? sameLocalDay(deviceWallClock(start), deviceWallClock(end)) : false;
    const endDate = end && !endSameDay ? getFormatter("weekday", null).format(end) : null;
    const range = end && endTime ? (endSameDay ? `${startTime} – ${endTime}` : startTime) : startTime;
    return {
      ...emptyModel,
      primaryDateText: startDate,
      primaryTimeText: startTime,
      primaryEndTimeText: endTime,
      primaryTimeRangeText: range,
      primaryEndDateText: endDate,
      primaryDateTimeText: `${startDate} · ${startTime}`,
    };
  }

  // ── Zone known → Event-local primary + viewer-local secondary ──────────
  const primaryDateText = getFormatter("weekday", knownZone).format(start);
  const primaryTimeText = getFormatter("time", knownZone).format(start);
  const primaryZoneText = shortZoneLabel(start, knownZone);

  const eventStartParts = instantToWallClockPartsForEvent(start, knownZone);
  const eventEndParts = end ? instantToWallClockPartsForEvent(end, knownZone) : null;
  const eventStartWall: WallClock | null = eventStartParts
    ? {
        year: Number(eventStartParts.dateKey.slice(0, 4)),
        month: Number(eventStartParts.dateKey.slice(5, 7)),
        day: Number(eventStartParts.dateKey.slice(8, 10)),
        hour: Number(eventStartParts.time.slice(0, 2)),
        minute: Number(eventStartParts.time.slice(3, 5)),
      }
    : null;
  const eventEndWall: WallClock | null = eventEndParts
    ? {
        year: Number(eventEndParts.dateKey.slice(0, 4)),
        month: Number(eventEndParts.dateKey.slice(5, 7)),
        day: Number(eventEndParts.dateKey.slice(8, 10)),
        hour: Number(eventEndParts.time.slice(0, 2)),
        minute: Number(eventEndParts.time.slice(3, 5)),
      }
    : null;

  const endSameDay = eventStartWall && eventEndWall ? sameLocalDay(eventStartWall, eventEndWall) : false;
  const primaryEndTimeText = end ? getFormatter("time", knownZone).format(end) : null;
  const primaryEndDateText = end && !endSameDay ? getFormatter("weekday", knownZone).format(end) : null;
  const primaryTimeRangeText =
    end && primaryEndTimeText
      ? endSameDay
        ? `${primaryTimeText} – ${primaryEndTimeText}`
        : primaryTimeText
      : primaryTimeText;

  const primaryDateTimeText = [primaryDateText, "·", primaryZoneText ? `${primaryTimeText} ${primaryZoneText}` : primaryTimeText]
    .join(" ")
    .trim();

  // Viewer equivalent — the SAME instant rendered with the device timezone.
  const viewerStartWall = deviceWallClock(start);
  const showViewerEquivalent = eventStartWall ? !sameWallClock(eventStartWall, viewerStartWall) : false;

  if (!showViewerEquivalent) {
    return {
      hasKnownZone: true,
      primaryDateText,
      primaryTimeText,
      primaryEndTimeText,
      primaryTimeRangeText,
      primaryEndDateText,
      primaryZoneText,
      primaryDateTimeText,
      showViewerEquivalent: false,
      viewerDateText: null,
      viewerTimeText: null,
      viewerEndTimeText: null,
      viewerEndDateText: null,
      viewerDateTimeText: null,
    };
  }

  const viewerDateText = getFormatter("weekday", null).format(start);
  const viewerTimeText = getFormatter("time", null).format(start);
  const viewerEndTimeText = end ? getFormatter("time", null).format(end) : null;
  const viewerEndSameDay = end ? sameLocalDay(viewerStartWall, deviceWallClock(end)) : false;
  const viewerEndDateText = end && !viewerEndSameDay ? getFormatter("weekday", null).format(end) : null;

  return {
    hasKnownZone: true,
    primaryDateText,
    primaryTimeText,
    primaryEndTimeText,
    primaryTimeRangeText,
    primaryEndDateText,
    primaryZoneText,
    primaryDateTimeText,
    showViewerEquivalent: true,
    viewerDateText,
    viewerTimeText,
    viewerEndTimeText,
    viewerEndDateText,
    viewerDateTimeText: `${viewerDateText} · ${viewerTimeText} your time`,
  };
};

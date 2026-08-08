import type { EventResponse } from "@/lib/events";

export type ScannerHostedEvent = {
  id: string;
  name?: string | null;
};

export type HostedEventsStatus = "loading" | "ready" | "error";

export type HostedEventsSnapshot = {
  status: HostedEventsStatus;
  events: ScannerHostedEvent[];
  selectedEventId: string;
};

export type HostedEventsFetchOutcome =
  | { ok: true; events: ScannerHostedEvent[] }
  | { ok: false };

export const toScannerHostedEvents = (events: EventResponse[]): ScannerHostedEvent[] =>
  events.map((event) => ({ id: event.id, name: event.name ?? null }));

export const createInitialHostedEventsSnapshot = (
  handoff: ScannerHostedEvent[] | null,
): HostedEventsSnapshot => {
  if (handoff && handoff.length > 0) {
    return { status: "ready", events: handoff, selectedEventId: handoff[0]!.id };
  }

  return { status: "loading", events: [], selectedEventId: "" };
};

/**
 * Pure transition: given a fetch outcome and the previously rendered snapshot,
 * decides the next status/events/selectedEventId without touching React state.
 * `hasLoadedOnce` is what keeps a background/focus failure from ever downgrading
 * already-usable data into the blocking error state (see checked-in scan-qr audit).
 */
export const resolveHostedEventsSnapshot = (
  outcome: HostedEventsFetchOutcome,
  previous: { events: ScannerHostedEvent[]; selectedEventId: string; hasLoadedOnce: boolean },
): HostedEventsSnapshot => {
  if (outcome.ok) {
    const selectionStillEligible =
      previous.selectedEventId.length > 0 &&
      outcome.events.some((event) => event.id === previous.selectedEventId);

    return {
      status: "ready",
      events: outcome.events,
      selectedEventId: selectionStillEligible ? previous.selectedEventId : (outcome.events[0]?.id ?? ""),
    };
  }

  if (previous.hasLoadedOnce) {
    return {
      status: "ready",
      events: previous.events,
      selectedEventId: previous.selectedEventId,
    };
  }

  return { status: "error", events: [], selectedEventId: "" };
};

const HANDOFF_MAX_AGE_MS = 15_000;

let pendingHandoff: { events: ScannerHostedEvent[]; capturedAt: number } | null = null;

export const setPendingScannerHostedEvents = (events: ScannerHostedEvent[]): void => {
  pendingHandoff = { events, capturedAt: Date.now() };
};

export const takePendingScannerHostedEvents = (): ScannerHostedEvent[] | null => {
  if (!pendingHandoff) {
    return null;
  }

  const { events, capturedAt } = pendingHandoff;
  pendingHandoff = null;

  return Date.now() - capturedAt <= HANDOFF_MAX_AGE_MS ? events : null;
};

export const __resetPendingScannerHostedEventsForTests = (): void => {
  pendingHandoff = null;
};

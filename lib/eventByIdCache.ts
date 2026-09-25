import type { EventResponse } from "./events";

// ── Event-by-id read cache + in-flight dedupe (Phase 2A) ───────────────────
// Dependency-free on purpose (only a type import from ./events, which is
// elided at build time) so it can be unit-tested without pulling in React
// Native. `lib/events.ts` binds `getEventByIdCached` to the real
// `getEventById` fetcher; RepostFeedCard is the only caller.
//
// Why it exists: an event repost card scrolled out of the FlatList
// virtualization window unmounts and, on scroll-back, remounts and re-issued
// GET /events/:id every time. Two reposts of the same event mounting together
// also fired duplicate concurrent requests. Proven by the Phase 2 audit.
//
// In-memory, app-session only. No AsyncStorage, no disk cache, no dependency.
// Short TTL keeps an edited / cancelled / now-live / ended event from reading
// stale for long. A monotonic epoch stops a request that was already in
// flight when an invalidation happened from writing pre-mutation data back
// into the cache.

export type EventByIdFetcher = (eventId: string) => Promise<EventResponse>;

// 60s: comfortably longer than a realistic scroll-away-and-back window (so
// remounts hit the cache), but a hard 1-minute ceiling on staleness for the
// event fields a repost card shows. Lifecycle transitions that matter most
// (live / ended) are already re-derived from scheduledAt / endAt on each
// render inside EventFeedCard, and cancel / edit / publish call
// invalidateCachedEventById below, so the TTL only backstops changes with no
// client-side mutation hook. Chosen from the audit's 30–120s guidance; not
// widened without evidence.
export const EVENT_BY_ID_CACHE_TTL_MS = 60_000;

type CachedEventByIdEntry = { event: EventResponse; expiresAt: number };

const eventByIdCache = new Map<string, CachedEventByIdEntry>();
const eventByIdInFlight = new Map<string, Promise<EventResponse>>();
let eventByIdCacheEpoch = 0;

// Drop cached + in-flight state for one event id and bump the epoch, so any
// request currently mid-flight still resolves to its own caller but will NOT
// repopulate the cache with data captured before this invalidation.
export const invalidateCachedEventById = (eventId: string): void => {
  eventByIdCache.delete(eventId);
  eventByIdInFlight.delete(eventId);
  eventByIdCacheEpoch += 1;
};

// Full reset — used by tests and available if a session-wide flush is ever
// needed (e.g. sign-out).
export const clearEventByIdCache = (): void => {
  eventByIdCache.clear();
  eventByIdInFlight.clear();
  eventByIdCacheEpoch += 1;
};

export const getEventByIdCached = (
  eventId: string,
  fetcher: EventByIdFetcher,
): Promise<EventResponse> => {
  const cached = eventByIdCache.get(eventId);

  if (cached) {
    if (cached.expiresAt > Date.now()) {
      // HIT: return the exact event object the fetcher produced earlier — this
      // layer never reshapes / re-normalizes event data.
      return Promise.resolve(cached.event);
    }
    // Expired: fall through to a fresh fetch.
    eventByIdCache.delete(eventId);
  }

  const inFlight = eventByIdInFlight.get(eventId);
  if (inFlight) {
    // A request for this id is already open — reuse its promise instead of
    // starting a second one.
    return inFlight;
  }

  const requestEpoch = eventByIdCacheEpoch;
  const request = fetcher(eventId)
    .then((event) => {
      // Only cache when no invalidation landed while the request was open.
      if (eventByIdCacheEpoch === requestEpoch) {
        eventByIdCache.set(eventId, {
          event,
          expiresAt: Date.now() + EVENT_BY_ID_CACHE_TTL_MS,
        });
      }
      return event;
    })
    .finally(() => {
      // Always release the slot once settled: a failed request must stay
      // retryable, and a newer request must be able to start immediately.
      // A failure never reaches the .then above, so it is never cached.
      eventByIdInFlight.delete(eventId);
    });

  eventByIdInFlight.set(eventId, request);
  return request;
};

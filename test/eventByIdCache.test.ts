import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  EVENT_BY_ID_CACHE_TTL_MS,
  clearEventByIdCache,
  getEventByIdCached,
  invalidateCachedEventById,
} from "../lib/eventByIdCache";

// Minimal stand-in for EventResponse — the cache is data-shape agnostic and
// only ever passes the fetcher's object straight through.
type FakeEvent = { id: string; name: string; eventMedia?: unknown[] };

const makeEvent = (id: string, name = `Event ${id}`): FakeEvent => ({ id, name, eventMedia: [] });

const makeCountingFetcher = (byId: Record<string, FakeEvent>) => {
  const calls: string[] = [];
  const fetcher = (eventId: string) => {
    calls.push(eventId);
    const event = byId[eventId];
    return event ? Promise.resolve(event) : Promise.reject(new Error(`no event ${eventId}`));
  };
  return { fetcher: fetcher as unknown as (id: string) => Promise<any>, calls };
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test.beforeEach(() => {
  clearEventByIdCache();
});

test("1. first request is a cache miss and calls the fetcher exactly once", async () => {
  const { fetcher, calls } = makeCountingFetcher({ a: makeEvent("a") });

  const event = await getEventByIdCached("a", fetcher);

  assert.equal(calls.length, 1);
  assert.equal(event.id, "a");
});

test("2. second request within TTL is a cache hit and does not call the fetcher again", async () => {
  const { fetcher, calls } = makeCountingFetcher({ a: makeEvent("a") });

  const first = await getEventByIdCached("a", fetcher);
  const second = await getEventByIdCached("a", fetcher);

  assert.equal(calls.length, 1);
  assert.equal(second, first); // same object identity — no reshaping
});

test("3. two concurrent calls for the same id share ONE underlying request", async () => {
  const control = deferred<FakeEvent>();
  const calls: string[] = [];
  const fetcher = ((id: string) => {
    calls.push(id);
    return control.promise;
  }) as unknown as (id: string) => Promise<any>;

  const p1 = getEventByIdCached("a", fetcher);
  const p2 = getEventByIdCached("a", fetcher);

  control.resolve(makeEvent("a"));
  const [r1, r2] = await Promise.all([p1, p2]);

  assert.equal(calls.length, 1);
  assert.equal(r1.id, "a");
  assert.equal(r2, r1);
});

test("4. different event ids issue independent requests", async () => {
  const { fetcher, calls } = makeCountingFetcher({ a: makeEvent("a"), b: makeEvent("b") });

  const [a, b] = await Promise.all([
    getEventByIdCached("a", fetcher),
    getEventByIdCached("b", fetcher),
  ]);

  assert.deepEqual(calls.sort(), ["a", "b"]);
  assert.equal(a.id, "a");
  assert.equal(b.id, "b");
});

test("5. an expired cache entry is re-fetched", async (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const { fetcher, calls } = makeCountingFetcher({ a: makeEvent("a") });

  await getEventByIdCached("a", fetcher);
  assert.equal(calls.length, 1);

  // Still fresh just before the TTL boundary.
  t.mock.timers.tick(EVENT_BY_ID_CACHE_TTL_MS - 1);
  await getEventByIdCached("a", fetcher);
  assert.equal(calls.length, 1);

  // Past the TTL boundary → miss → one more fetch.
  t.mock.timers.tick(2);
  await getEventByIdCached("a", fetcher);
  assert.equal(calls.length, 2);
});

test("6. a failed request clears the in-flight slot so a later retry can call the API again", async () => {
  let attempt = 0;
  const fetcher = ((id: string) => {
    attempt += 1;
    return attempt === 1
      ? Promise.reject(new Error("transient"))
      : Promise.resolve(makeEvent(id));
  }) as unknown as (id: string) => Promise<any>;

  await assert.rejects(() => getEventByIdCached("a", fetcher), /transient/);

  const event = await getEventByIdCached("a", fetcher);
  assert.equal(attempt, 2);
  assert.equal(event.id, "a");
});

test("7. an error is never permanently cached", async () => {
  const failing = (() => Promise.reject(new Error("boom"))) as unknown as (id: string) => Promise<any>;

  await assert.rejects(() => getEventByIdCached("a", failing), /boom/);
  await assert.rejects(() => getEventByIdCached("a", failing), /boom/); // still retries, not a cached rejection
});

test("8. the cache passes the fetcher's normalized event through unchanged", async () => {
  const normalized = makeEvent("a", "Normalized Name");
  (normalized as any).eventMedia = [{ url: "https://cdn/x.jpg" }];
  const fetcher = (() => Promise.resolve(normalized)) as unknown as (id: string) => Promise<any>;

  const hit1 = await getEventByIdCached("a", fetcher);
  const hit2 = await getEventByIdCached("a", fetcher);

  assert.equal(hit1, normalized);
  assert.equal(hit2, normalized);
  assert.deepEqual(hit2, {
    id: "a",
    name: "Normalized Name",
    eventMedia: [{ url: "https://cdn/x.jpg" }],
  });
});

test("9. a simulated card remount within TTL does not trigger a second underlying request", async () => {
  const { fetcher, calls } = makeCountingFetcher({ a: makeEvent("a") });

  // mount → fetch
  await getEventByIdCached("a", fetcher);
  // scrolls out of window, unmounts, scrolls back, remounts → effect re-runs
  await getEventByIdCached("a", fetcher);
  await getEventByIdCached("a", fetcher);

  assert.equal(calls.length, 1);
});

test("invalidateCachedEventById forces the next read to re-fetch", async () => {
  const { fetcher, calls } = makeCountingFetcher({ a: makeEvent("a") });

  await getEventByIdCached("a", fetcher);
  invalidateCachedEventById("a");
  await getEventByIdCached("a", fetcher);

  assert.equal(calls.length, 2);
});

test("an invalidation during an in-flight request is not overwritten by that stale request", async () => {
  const staleControl = deferred<FakeEvent>();
  let call = 0;
  const fetcher = ((id: string) => {
    call += 1;
    if (call === 1) return staleControl.promise; // pre-invalidation request
    return Promise.resolve(makeEvent(id, "fresh"));
  }) as unknown as (id: string) => Promise<any>;

  const stalePromise = getEventByIdCached("a", fetcher); // request #1 opens
  invalidateCachedEventById("a"); // epoch bumps while #1 is still open
  staleControl.resolve(makeEvent("a", "stale")); // #1 resolves late
  const staleResult = await stalePromise;
  assert.equal(staleResult.name, "stale"); // caller still gets what it fetched

  // #1 must NOT have populated the cache → this read re-fetches (call #2)
  const next = await getEventByIdCached("a", fetcher);
  assert.equal(call, 2);
  assert.equal(next.name, "fresh");
});

// ── Source-level guards: the wiring the fix depends on stays in place ──────

const repostSource = readFileSync(
  join(process.cwd(), "components/post/RepostFeedCard.tsx"),
  "utf8",
);
const eventsSource = readFileSync(join(process.cwd(), "lib/events.ts"), "utf8");

test("10. RepostFeedCard fetches the event through the cached helper, not the raw getEventById", () => {
  assert.match(repostSource, /getEventByIdCached\(eventId\)/);
  assert.doesNotMatch(repostSource, /\bgetEventById\(eventId\)/);
  assert.match(repostSource, /import \{ getEventByIdCached, type EventResponse \} from '@\/lib\/events'/);
});

test("11. Phase 1 loading placeholder + eventLoading gating are unchanged", () => {
  assert.match(repostSource, /if \(eventLoading\) \{/);
  assert.match(repostSource, /<EventRepostLoadingPlaceholder showLoadingIndicator=\{showLoadingIndicator\} \/>/);
  assert.match(repostSource, /setEventLoading\(true\);/);
  assert.match(repostSource, /\.finally\(\(\) => \{ if \(mounted\) setEventLoading\(false\); \}\)/);
});

test("12. final embedded EventFeedCard render + props are unchanged", () => {
  assert.match(repostSource, /<EventFeedCard event=\{event\} onRepostSuccess=\{onRepostSuccess\} embedded \/>/);
});

test("13. RepostFeedCard unavailable / error handling is unchanged", () => {
  assert.match(repostSource, /\.catch\(\(\) => \{ if \(mounted\) setEventUnavailable\(true\); \}\)/);
  assert.match(repostSource, /eventUnavailable \|\| !event \?/);
  assert.match(repostSource, /<UnavailableCard \/>/);
});

test("14. RepostFeedCard keeps its mounted guard around every setState", () => {
  assert.match(repostSource, /let mounted = true;/);
  assert.match(repostSource, /return \(\) => \{ mounted = false; \};/);
  assert.match(repostSource, /if \(mounted\) setEvent\(value\);/);
});

test("15. event lifecycle mutations invalidate the cached event id", () => {
  const sliceBetween = (from: string, to: string) => {
    const start = eventsSource.indexOf(from);
    const end = eventsSource.indexOf(to, start + 1);
    return start >= 0 && end > start ? eventsSource.slice(start, end) : "";
  };

  // updateEvent / deleteEvent / cancelEvent each take an explicit eventId.
  assert.match(sliceBetween("export const updateEvent", "export const deleteEvent"), /invalidateCachedEventById\(eventId\)/);
  assert.match(sliceBetween("export const deleteEvent", "export const getEventTicket"), /invalidateCachedEventById\(eventId\)/);
  assert.match(sliceBetween("export const cancelEvent", "export const submitJoinRequest"), /invalidateCachedEventById\(eventId\)/);
  // publishEvent invalidates by the returned event id (covers republish).
  assert.match(sliceBetween("export const publishEvent", "export const updateEvent"), /invalidateCachedEventById\(event\.id\)/);
});

test("16. getEventByIdCached is bound to the real getEventById fetcher in lib/events", () => {
  assert.match(eventsSource, /export const getEventByIdCached = \(eventId: string\)/);
  assert.match(eventsSource, /getEventByIdCachedInternal\(eventId, getEventById\)/);
});

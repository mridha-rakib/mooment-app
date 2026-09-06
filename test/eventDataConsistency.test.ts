import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  getPurchasableTicketsRemaining,
  isTicketSalesEnded,
  type MapTicketSummaryTicket,
} from "../lib/mapTicketSummary";

// Event Card / Event Detail / Checkout data-consistency fixes.
// Repo convention: real unit tests for importable pure helpers, source-level
// regex guards for RN components that can't mount under the test runner.

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const mapContainerSource = read("components/home/MapContainer.tsx");
const eventFeedCardSource = read("components/home/EventFeedCard.tsx");
const eventDetailSource = read("app/event-screen/event.tsx");
const accessTabSource = read("components/eventTabs/AccessTab.tsx");
const paymentsSource = read("lib/payments.ts");
const eventsLibSource = read("lib/events.ts");

const ticket = (t: Partial<MapTicketSummaryTicket>): MapTicketSummaryTicket => ({
  type: "paid",
  price: 10,
  capacity: 100,
  availableCount: 10,
  ...t,
});

// ───────────────────────────── Tickets remaining (E–I) ─────────────────────

test("E/G — an active tier with availableCount > 0 contributes its availableCount", () => {
  assert.equal(getPurchasableTicketsRemaining([ticket({ availableCount: 12 })]), 12);
});

test("F — a tier whose sales have ended (server flag) contributes 0, even with availableCount 12", () => {
  assert.equal(
    getPurchasableTicketsRemaining([ticket({ availableCount: 12, salesEnded: true })]),
    0,
  );
});

test("H — a sold-out tier (availableCount 0) is not counted", () => {
  assert.equal(getPurchasableTicketsRemaining([ticket({ availableCount: 0 })]), 0);
});

test("F — device-clock fallback still applies when the server flag is absent (legacy payload)", () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(getPurchasableTicketsRemaining([ticket({ availableCount: 5, salesEndAt: past })]), 0);
});

test("I — null salesEndAt with no server flag is NOT treated as ended", () => {
  assert.equal(isTicketSalesEnded(ticket({ salesEndAt: null })), false);
  assert.equal(getPurchasableTicketsRemaining([ticket({ availableCount: 7, salesEndAt: null })]), 7);
});

test("server-derived salesEnded is preferred over the device-clock comparison", () => {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  // salesEndAt is in the future, but the backend already says ended -> ended.
  assert.equal(isTicketSalesEnded(ticket({ salesEndAt: future, salesEnded: true })), true);
  const past = new Date(Date.now() - 3_600_000).toISOString();
  // salesEndAt is in the past, but the backend says NOT ended -> not ended.
  assert.equal(isTicketSalesEnded(ticket({ salesEndAt: past, salesEnded: false })), false);
});

test("E — multi-tier sum excludes only the ended/sold-out tiers", () => {
  const remaining = getPurchasableTicketsRemaining([
    ticket({ availableCount: 4 }),
    ticket({ availableCount: 9, salesEnded: true }),
    ticket({ availableCount: 0 }),
    ticket({ availableCount: 6, salesEndAt: null }),
  ]);
  assert.equal(remaining, 10);
});

// ─────────────────── Event Detail / AccessTab consume shared helpers ───────

test("Event Detail derives tickets-left and sales-ended from the shared helpers", () => {
  assert.match(
    eventDetailSource,
    /import \{\s*getPurchasableTicketsRemaining,\s*isTicketSalesEnded as isTicketSalesEndedShared,\s*\} from "@\/lib\/mapTicketSummary";/,
  );
  assert.match(eventDetailSource, /getPurchasableTicketsRemaining\(tickets \?\? \[\], nowMs\)/);
  assert.match(eventDetailSource, /isTicketSalesEndedShared\(ticket, nowMs\)/);
  // Old device-clock-only local computations are gone.
  assert.doesNotMatch(eventDetailSource, /total \+ Math\.max\(0, ticket\.availableCount \?\? ticket\.capacity\)/);
  assert.doesNotMatch(eventDetailSource, /const getTicketSalesEndDate =/);
});

test("AccessTab aggregate + sales-ended use the shared helpers; no scheduledAt sales-deadline fallback", () => {
  assert.match(
    accessTabSource,
    /import \{\s*getPurchasableTicketsRemaining,\s*isTicketSalesEnded as isTicketSalesEndedShared,\s*\} from "@\/lib\/mapTicketSummary";/,
  );
  assert.match(accessTabSource, /getPurchasableTicketsRemaining\(tickets, currentTimeMs\)/);
  assert.match(accessTabSource, /isTicketSalesEndedShared\(ticket, nowMs\)/);
  // N / #5 — the misleading `salesEndAt ?? scheduledAt` fallback is removed for
  // the ticket sales deadline.
  assert.doesNotMatch(accessTabSource, /ticket\.salesEndAt \?\? scheduledAt/);
  assert.doesNotMatch(accessTabSource, /formatExpiry\(ticket\.salesEndAt, scheduledAt\)/);
});

// ───────────────────────────── Status follows event.status (J–L) ──────────

test("J/L — EventFeedCard badge is derived from event.status only, not the device clock", () => {
  const badgeFn = eventFeedCardSource.slice(
    eventFeedCardSource.indexOf("const getEventBadgeStatus ="),
    eventFeedCardSource.indexOf("const getNextEventBadgeBoundary ="),
  );
  assert.match(badgeFn, /if \(event\.status === "completed" \|\| event\.status === "cancelled"\) \{\s*return "ended";/);
  assert.match(badgeFn, /if \(event\.status === "live"\) \{\s*return "live";/);
  assert.match(badgeFn, /return "upcoming";/);
  assert.doesNotMatch(badgeFn, /nowMs/);
  assert.doesNotMatch(badgeFn, /parseEventTime/);
  // The badge memo no longer depends on the ticking statusNowMs clock.
  assert.doesNotMatch(eventFeedCardSource, /getEventBadgeStatus\(\{[\s\S]*?\}, statusNowMs\)/);
});

test("K — Map preview live flag follows persisted event.status", () => {
  assert.match(mapContainerSource, /isLive: event\.status === "live"/);
});

// ───────────────────────────── Map attendee count (B–D) ──────────────────

test("C/D — Map marker attendee count is publicGoingSummary.going, never 0, never checkedInCount", () => {
  assert.match(mapContainerSource, /attendeesCount: event\.publicGoingSummary\?\.going \?\? 0,/);
  assert.doesNotMatch(mapContainerSource, /attendeesCount: 0,/);
  // checkedInCount stays only on the marker glow field.
  assert.match(mapContainerSource, /checkedInCount: typeof event\.checkedInCount === "number"/);
  assert.doesNotMatch(mapContainerSource, /attendeesCount: [^\n]*checkedInCount/);
});

// ───────────────────── Purchase / refund cache invalidation (P,Q,S,V) ─────

test("P/S — checkout intent, confirm, cancel and refund all invalidate the event-by-id cache", () => {
  assert.match(paymentsSource, /import \{ invalidateCachedEventById \} from "@\/lib\/eventByIdCache";/);
  assert.match(paymentsSource, /const invalidateEventCachesForOrder =/);
  // createCheckoutIntent: by explicit ticket eventId + by the returned order.
  const intentBody = paymentsSource.slice(
    paymentsSource.indexOf("export const createCheckoutIntent"),
    paymentsSource.indexOf("export const confirmCheckoutOrder"),
  );
  assert.match(intentBody, /invalidateCachedEventById\(payload\.eventId\)/);
  assert.match(intentBody, /invalidateEventCachesForOrder\(checkout\.order\)/);
  // confirm / cancel / refund of an order.
  for (const fn of ["confirmCheckoutOrder", "cancelCheckoutOrder", "refundCheckoutOrder"]) {
    const body = paymentsSource.slice(
      paymentsSource.indexOf(`export const ${fn}`),
      paymentsSource.indexOf(`export const ${fn}`) + 500,
    );
    assert.match(body, /invalidateEventCachesForOrder\(order\)/, `${fn} must invalidate`);
  }
  // single-pass cancellation has eventId in scope.
  const cancelPassBody = paymentsSource.slice(
    paymentsSource.indexOf("export const cancelTicketPass"),
    paymentsSource.indexOf("export const cancelTicketPass") + 900,
  );
  assert.match(cancelPassBody, /invalidateCachedEventById\(eventId\)/);
  // emitTicketWalletChanged is preserved, not replaced.
  assert.match(paymentsSource, /emitTicketWalletChanged\(\);/);
});

// ───────────────────── Ticket-tier edit cache invalidation (W–Z) ──────────

test("W/X/Y — create/update/deleteEventTicket invalidate the event-by-id cache", () => {
  for (const fn of ["createEventTicket", "updateEventTicket", "deleteEventTicket"]) {
    const body = eventsLibSource.slice(
      eventsLibSource.indexOf(`export const ${fn} =`),
      eventsLibSource.indexOf(`export const ${fn} =`) + 700,
    );
    assert.match(body, /invalidateCachedEventById\(eventId\)/, `${fn} must invalidate`);
  }
});

test("Z — existing updateEvent / publishEvent / deleteEvent / cancelEvent invalidation is unchanged", () => {
  assert.match(
    eventsLibSource.slice(
      eventsLibSource.indexOf("export const updateEvent ="),
      eventsLibSource.indexOf("export const deleteEvent ="),
    ),
    /invalidateCachedEventById\(eventId\)/,
  );
  assert.match(
    eventsLibSource.slice(
      eventsLibSource.indexOf("export const cancelEvent ="),
      eventsLibSource.indexOf("export const cancelEvent =") + 400,
    ),
    /invalidateCachedEventById\(eventId\)/,
  );
});

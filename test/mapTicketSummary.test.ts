import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getMapTicketSummary,
  type MapTicketSummaryTicket,
} from "../lib/mapTicketSummary";

const NOW = Date.parse("2026-08-20T00:00:00.000Z");

const salesEnd = (iso: string) => new Date(iso).toISOString();
const formatDay = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

const ticket = (overrides: Partial<MapTicketSummaryTicket> = {}): MapTicketSummaryTicket => ({
  type: "pay",
  price: 45,
  capacity: 100,
  availableCount: 100,
  salesEndAt: salesEnd("2026-08-26T12:00:00.000Z"),
  ...overrides,
});

test("one paid available ticket -> single type label, From $X, actual remaining, single sales-end date", () => {
  const iso = "2026-08-26T12:00:00.000Z";
  const summary = getMapTicketSummary(
    [ticket({ price: 45, capacity: 100, availableCount: 30, salesEndAt: salesEnd(iso) })],
    NOW,
  );

  assert.equal(summary.ticketTypeCountLabel, "1 Ticket Type");
  assert.equal(summary.priceLabel, "From $45");
  assert.equal(summary.ticketsAvailableLabel, "30 Tickets Left");
  assert.equal(summary.salesEndLabel, `Sales end ${formatDay(iso)}`);
});

test("multiple paid tickets -> plural type label and From <lowest>", () => {
  const summary = getMapTicketSummary(
    [
      ticket({ price: 45, availableCount: 10 }),
      ticket({ price: 100, availableCount: 10 }),
    ],
    NOW,
  );

  assert.equal(summary.ticketTypeCountLabel, "2 Ticket Types");
  assert.equal(summary.priceLabel, "From $45");
});

test("sold-out cheapest ticket is excluded from the From price", () => {
  const summary = getMapTicketSummary(
    [
      ticket({ price: 20, capacity: 50, availableCount: 0 }),
      ticket({ price: 45, capacity: 20, availableCount: 20 }),
      ticket({ price: 100, capacity: 10, availableCount: 10 }),
    ],
    NOW,
  );

  assert.equal(summary.priceLabel, "From $45");
});

test("tickets left aggregates actual remaining inventory, not configured capacity", () => {
  const summary = getMapTicketSummary(
    [
      ticket({ capacity: 100, availableCount: 20 }),
      ticket({ capacity: 50, availableCount: 5 }),
    ],
    NOW,
  );

  assert.equal(summary.ticketsAvailableLabel, "25 Tickets Left");
});

test("multiple ticket types with different salesEndAt -> Sales end dates vary", () => {
  const summary = getMapTicketSummary(
    [
      ticket({ salesEndAt: salesEnd("2026-08-24T12:00:00.000Z") }),
      ticket({ salesEndAt: salesEnd("2026-08-26T12:00:00.000Z") }),
      ticket({ salesEndAt: salesEnd("2026-08-28T12:00:00.000Z") }),
    ],
    NOW,
  );

  assert.equal(summary.salesEndLabel, "Sales end dates vary");
});

test("multiple ticket types with identical salesEndAt -> one shared date", () => {
  const iso = "2026-08-26T12:00:00.000Z";
  const summary = getMapTicketSummary(
    [ticket({ salesEndAt: salesEnd(iso) }), ticket({ salesEndAt: salesEnd(iso) })],
    NOW,
  );

  assert.equal(summary.salesEndLabel, `Sales end ${formatDay(iso)}`);
});

test("missing salesEndAt does not fabricate a date", () => {
  const summary = getMapTicketSummary(
    [ticket({ salesEndAt: null }), ticket({ salesEndAt: undefined })],
    NOW,
  );

  assert.equal(summary.salesEndLabel, null);
});

test("all-free event summarizes as Free", () => {
  const summary = getMapTicketSummary(
    [
      ticket({ type: "free", price: 0, salesEndAt: null }),
      ticket({ type: "free", price: 0, salesEndAt: null }),
    ],
    NOW,
  );

  assert.equal(summary.priceLabel, "Free");
  assert.equal(summary.ticketTypeCountLabel, "2 Ticket Types");
});

test("a sales-ended ticket is not counted as relevant inventory or price", () => {
  const summary = getMapTicketSummary(
    [
      ticket({ price: 20, availableCount: 10, salesEndAt: salesEnd("2026-08-10T12:00:00.000Z") }),
      ticket({ price: 45, availableCount: 8, salesEndAt: salesEnd("2026-08-26T12:00:00.000Z") }),
    ],
    NOW,
  );

  assert.equal(summary.priceLabel, "From $45");
  assert.equal(summary.ticketsAvailableLabel, "8 Tickets Left");
  assert.equal(summary.salesEndLabel, `Sales end ${formatDay("2026-08-26T12:00:00.000Z")}`);
});

test("availableCount overrides capacity even when capacity is larger", () => {
  const summary = getMapTicketSummary([ticket({ capacity: 200, availableCount: 1 })], NOW);

  assert.equal(summary.ticketsAvailableLabel, "1 Ticket Left");
});

// --- Wiring / regression guards for the Map Event Preview Card ---

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const mapContainerSource = read("components/home/MapContainer.tsx");
const mapScreenSource = read("components/ui/MapScreen.tsx");
const eventPreviewModalSource = read("components/ui/EventPreviewModal.tsx");

test("MapContainer derives the ticket summary once from existing event.tickets data", () => {
  assert.match(mapContainerSource, /import \{ getMapTicketSummary \} from "@\/lib\/mapTicketSummary"/);
  assert.match(mapContainerSource, /getMapTicketSummary\(event\.tickets\)/);
  assert.match(mapContainerSource, /price:\s*ticketSummary\.priceLabel/);
  assert.match(mapContainerSource, /ticketsAvailable:\s*ticketSummary\.ticketsAvailableLabel/);
  assert.match(mapContainerSource, /ticketSalesEndDate:\s*ticketSummary\.salesEndLabel/);
  assert.match(mapContainerSource, /ticketTypeCount:\s*ticketSummary\.ticketTypeCountLabel/);
  // Old misleading calculations are gone.
  assert.doesNotMatch(mapContainerSource, /ticket\.capacity\), 0\)/);
  assert.doesNotMatch(mapContainerSource, /Buy by/);
});

test("MapScreen forwards the ticket type count into the preview card", () => {
  assert.match(mapScreenSource, /ticketTypeCount\?:\s*string\s*\|\s*null/);
  assert.match(mapScreenSource, /ticketTypeCount:\s*marker\.ticketTypeCount\s*\?\?\s*undefined/);
  assert.match(mapScreenSource, /ticketTypeCount=\{selectedMarker\?\.ticketTypeCount\s*\?\?\s*undefined\}/);
});

test("EventPreviewModal renders the ticket type count without fabricating one", () => {
  assert.match(eventPreviewModalSource, /ticketTypeCount\?:\s*string/);
  assert.match(
    eventPreviewModalSource,
    /\{item\.ticketTypeCount \? \(\s*<View style=\{styles\.ticketInfoItem\}>/,
  );
});

test("Start/End event date rows remain based on scheduledAt/endAt derived values", () => {
  assert.match(mapContainerSource, /eventDate:\s*formatEventDate\(event\.scheduledAt\)/);
  assert.match(mapContainerSource, /eventEndDate:\s*formatEventDate\(event\.endAt\)/);
  assert.match(eventPreviewModalSource, />Start<\/Text>/);
  assert.match(eventPreviewModalSource, />End<\/Text>/);
});

test("LIVE pulse and Busy/Not Busy wiring in the preview card are untouched", () => {
  assert.match(eventPreviewModalSource, /interpolate\(livePulseProgress\.value,\s*\[0,\s*1\]/);
  assert.match(eventPreviewModalSource, /<Text style=\{\[styles\.liveText,\s*\{\s*color:\s*colors\.danger\s*\}\]\}>Live<\/Text>/);
  assert.doesNotMatch(eventPreviewModalSource, /withRepeat|withSequence|withTiming|useSharedValue|setInterval|Animated\.loop/);
  assert.match(
    eventPreviewModalSource,
    /<CrowdStatusBadge eventStatus=\{item\.eventStatus\} crowdStatus=\{item\.crowdStatus\} \/>/,
  );
});

test("View Event navigation button in the preview card is unchanged", () => {
  assert.match(eventPreviewModalSource, />View Event<\/Text>/);
  assert.match(eventPreviewModalSource, /onPress=\{onViewEvent\}/);
});

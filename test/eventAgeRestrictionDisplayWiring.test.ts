import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-010A — display-consistency wiring checks against Feed, Search, Map,
// and Event Detail. These screens/components can't be mounted under the
// plain `bun test` runner (no RN component harness in this repo — see the
// other event*.test.ts files), so these are source-text guards, not runtime
// proof of on-screen rendering; app/test/eventAgeRestriction.test.ts covers
// the actual formatter logic at runtime instead.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const mapContainer = read("components/home/MapContainer.tsx");
const aboutTab = read("components/eventTabs/AboutTab.tsx");
const feedCard = read("components/home/EventFeedCard.tsx");
const search = read("app/discover-screen/search.tsx");
const stepTwo = read("app/create-event/step-2.tsx");
const checkout = read("app/event-screen/checkout.tsx");
const accessTab = read("components/eventTabs/AccessTab.tsx");
const ticketDetail = read("app/event-screen/ticket-detail.tsx");
const scanQr = read("app/event-screen/scan-qr.tsx");
const eventScreen = read("app/event-screen/event.tsx");

// ── 1: Create Event still exposes all three canonical options ──────────────

test("EVT-010A: Create Event still exposes All Ages / 18+ / 21+ (unchanged)", () => {
  assert.match(stepTwo, /AGE_OPTIONS = \['All Ages', '18\+', '21\+'\]/);
});

// ── legacy wording is gone from the active Event Detail screen ─────────────

test("EVT-010A: Event Detail no longer uses the legacy '18+ only' / '21+ only' / 'All ages' wording", () => {
  assert.doesNotMatch(aboutTab, /18\+ only/);
  assert.doesNotMatch(aboutTab, /21\+ only/);
  assert.doesNotMatch(aboutTab, /"All ages"/);
  assert.doesNotMatch(aboutTab, /formatAgeLabel/);
});

test("EVT-010A: Map no longer has its own duplicate age formatter", () => {
  assert.doesNotMatch(mapContainer, /formatAgeLimit/);
});

// ── every display surface uses the one shared, canonical formatter ─────────

const displaySurfaces: Record<string, string> = {
  "Map (MapContainer.tsx)": mapContainer,
  "Event Detail (AboutTab.tsx)": aboutTab,
  "Feed (EventFeedCard.tsx)": feedCard,
  "Search (search.tsx)": search,
};

for (const [name, source] of Object.entries(displaySurfaces)) {
  test(`EVT-010A: ${name} imports the shared canonical age-restriction formatter`, () => {
    assert.match(source, /formatEventAgeRestriction/);
    assert.match(source, /from ['"]@\/lib\/eventAgeRestriction['"]/);
  });
}

// ── Feed: age label is added without touching unrelated card behavior ──────

test("EVT-010A: Feed card's age label reuses the existing meta-row text/dot style (no new visual component)", () => {
  const metaRowBlock = feedCard.slice(
    feedCard.indexOf("{(eventDate || eventTime) ? ("),
    feedCard.indexOf("{(eventDate || eventTime) ? (") + 700,
  );
  assert.match(metaRowBlock, /styles\.metaText/);
  assert.match(metaRowBlock, /styles\.metaDot/);
  assert.match(metaRowBlock, /\{ageLabel\}/);
});

test("EVT-010A regression: Feed card's existing date/time text nodes are unchanged", () => {
  assert.match(feedCard, /Boolean\(eventDate\) && <Text style={styles\.metaText}>{eventDate}<\/Text>/);
  assert.match(feedCard, /Boolean\(eventTime\) && <Text style={styles\.metaText}>{eventTime}<\/Text>/);
});

// ── Search: age label appended to the existing subtitle composition ────────

test("EVT-010A: Search's event subtitle includes the canonical age label alongside existing metadata", () => {
  const subtitleBlock = search.slice(
    search.indexOf("const getEventSubtitle"),
    search.indexOf("const toSearchEvent"),
  );
  assert.match(subtitleBlock, /formatEventAgeRestriction\(event\.ageRestriction\)/);
  assert.match(subtitleBlock, /\[host, formatEventSchedule\(event\), location, ageLabel\]/);
});

// ── EVT-006 regression: category taxonomy was not touched by this batch ────

test("EVT-010A regression: category taxonomy files were not touched (age-only change)", () => {
  // Sanity check that this batch's age-formatter work didn't also alter the
  // category constant import anywhere it touched.
  assert.doesNotMatch(mapContainer, /EVENT_CATEGORY_METADATA/);
});

// ── EVT-010B — MVP admission notice wiring: the same helper is used for the
// notice text everywhere it's needed, no ad-hoc copies of the copy exist,
// and no account-age / DOB / "verified" language was introduced anywhere. ──

test("EVT-010B: checkout screen shows the shared admission notice helper before completion, not a hard-coded copy", () => {
  assert.match(checkout, /getEventAgeAdmissionNotice/);
  assert.match(checkout, /from ["']@\/lib\/eventAgeRestriction["']/);
  // Rendered above the footer CTA (source order), never disabling it.
  const noticeIndex = checkout.indexOf("ageAdmissionNotice");
  const footerIndex = checkout.lastIndexOf("CheckoutFooter");
  assert.ok(noticeIndex > -1 && footerIndex > -1 && noticeIndex < footerIndex);
  assert.doesNotMatch(checkout, /disabled=\{.*ageAdmissionNotice/);
});

test("EVT-010B: the checkout footer's disabled condition is unchanged by the admission notice (still terms/quote-driven only)", () => {
  assert.match(checkout, /disabled=\{!agreed \|\| isPaying \|\| isQuoteLoading \|\| !quote\}/);
});

test("EVT-010B: event.tsx forwards the Event's ageRestriction into the checkout route params", () => {
  const paramsBlock = eventScreen.slice(
    eventScreen.indexOf('pathname: "/event-screen/checkout"'),
    eventScreen.indexOf('pathname: "/event-screen/checkout"') + 900,
  );
  assert.match(paramsBlock, /ageRestriction: event\.ageRestriction/);
});

test("EVT-010B: locked-privacy Join Request flow (AccessTab) shows the shared admission notice, gated on the request not yet being accepted", () => {
  assert.match(accessTab, /getEventAgeAdmissionNotice/);
  assert.match(accessTab, /from ["']@\/lib\/eventAgeRestriction["']/);
  assert.match(accessTab, /isLocked && !hasAcceptedRequest && ageAdmissionNotice/);
});

test("EVT-010B: attendee ticket-detail view shows the Event's age restriction via the canonical formatter", () => {
  assert.match(ticketDetail, /formatEventAgeRestriction/);
  assert.match(ticketDetail, /from ["']@\/lib\/eventAgeRestriction["']/);
  assert.match(ticketDetail, /label: "Age restriction", value: formatEventAgeRestriction\(event\?\.ageRestriction\)/);
});

test("EVT-010B: host check-in scan result surfaces the Event's age restriction via the canonical formatter", () => {
  assert.match(scanQr, /formatEventAgeRestriction/);
  assert.match(scanQr, /Age restriction: \$\{formatEventAgeRestriction\(scannedTicket\.ageRestriction\)\}/);
});

test("EVT-010B: no surface touched by this batch claims an age-verified state", () => {
  for (const [name, source] of [
    ["checkout.tsx", checkout],
    ["AccessTab.tsx", accessTab],
    ["ticket-detail.tsx", ticketDetail],
    ["scan-qr.tsx", scanQr],
  ] as const) {
    assert.doesNotMatch(source, /age[ -]?verified/i, `${name} must not claim an age-verified state`);
    assert.doesNotMatch(source, /\bDOB\b|date of birth/i, `${name} must not introduce a DOB requirement`);
  }
});

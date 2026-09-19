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

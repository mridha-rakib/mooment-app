import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { normalizeSearchText } from "../lib/searchText";

// Source-level wiring assertions (repo convention — there is no RN render
// harness here; see peopleSearchRanking.test.ts / friendsFeedEmptyStateWiring).
const searchSource = readFileSync(join(process.cwd(), "app/discover-screen/search.tsx"), "utf8");
const eventsLibSource = readFileSync(join(process.cwd(), "lib/events.ts"), "utf8");
const momentsLibSource = readFileSync(join(process.cwd(), "lib/moments.ts"), "utf8");

// ── API client ─────────────────────────────────────────────────────────

test("lib/events exports searchEvents hitting the dedicated /events/search endpoint with q", () => {
  assert.match(eventsLibSource, /export const searchEvents = async \(query: string, limit = 50\)/);
  assert.match(eventsLibSource, /api\.get\('\/events\/search', \{ params: \{ q: query, limit \} \}\)/);
});

test("getMapEvents (upcoming list) is left untouched — still /events/map", () => {
  assert.match(eventsLibSource, /api\.get\("\/events\/map"/);
});

test("getHashtagEvents / getHashtagMoments accept an opt-in `expand` flag serialized as '1'", () => {
  assert.match(eventsLibSource, /expand\?: boolean/);
  assert.match(eventsLibSource, /\.\.\.\(expand \? \{ expand: '1' \} : \{\}\)/);
  assert.match(momentsLibSource, /options: \{ expand\?: boolean \} = \{\}/);
  assert.match(momentsLibSource, /\.\.\.\(options\.expand \? \{ expand: '1' \} : \{\}\)/);
});

// ── Screen wiring ──────────────────────────────────────────────────────

test("search screen imports searchEvents and the mirror normalizer", () => {
  assert.match(searchSource, /import \{ getMapEvents, getHashtagEvents, searchEvents, type EventResponse \} from '@\/lib\/events';/);
  assert.match(searchSource, /import \{ normalizeSearchText \} from '@\/lib\/searchText';/);
});

test("Event search is debounced with its own ~250ms constant (People/Hashtag constants unchanged)", () => {
  assert.match(searchSource, /const EVENT_SEARCH_DEBOUNCE_MS = 250;/);
  assert.match(searchSource, /const PEOPLE_SEARCH_DEBOUNCE_MS = 250;/);
  assert.match(searchSource, /const HASHTAG_CHECK_DEBOUNCE_MS = 350;/);
  assert.match(searchSource, /\}, EVENT_SEARCH_DEBOUNCE_MS\);/);
});

test("Event query normalizes client-side and is suppressed under explicit '#' hashtag intent", () => {
  assert.match(
    searchSource,
    /const eventSearchQuery = isExplicitHashtagIntent \? '' : normalizeSearchText\(searchQuery\);/,
  );
});

test("Event search effect is keyed on the normalized query and clears when it is empty", () => {
  assert.match(searchSource, /if \(!eventSearchQuery\) \{\s*eventRequestRef\.current \+= 1;\s*setEventResults\(\[\]\);/);
  // retryToken re-runs the CURRENT query on Retry / re-focus without touching it.
  assert.match(searchSource, /\}, \[eventSearchQuery, retryToken\]\);/);
});

test("stale Event response cannot overwrite a newer query (separate request-id ref)", () => {
  assert.match(searchSource, /const eventRequestRef = useRef\(0\);/);
  assert.match(searchSource, /const requestId = \(eventRequestRef\.current \+= 1\);/);
  assert.match(searchSource, /if \(eventRequestRef\.current !== requestId\) \{\s*return;/);
  // People's own guard is untouched.
  assert.match(searchSource, /const peopleRequestRef = useRef\(0\);/);
});

test("empty query keeps the existing /events/map list; real query shows server order verbatim", () => {
  // Real query => `eventResults` verbatim; empty => the old `events.filter(.includes())`.
  assert.match(
    searchSource,
    /const filteredEvents = useMemo\(\s*\(\) => \(eventSearchQuery\s*\?\s*selectCurrentRows\(eventSearchQuery, eventResultsQuery, eventResults\)\s*:\s*events\.filter\(/,
  );
  // Server search results are never re-sorted or `.includes()`-filtered on the client.
  assert.doesNotMatch(searchSource, /eventResults\.(sort|filter)\(/);
  assert.doesNotMatch(searchSource, /eventResults\)\s*\.\s*(sort|filter)\(/);
});

test("explicit '#' intent still routes through hashtag search, never /events/search", () => {
  assert.match(searchSource, /const eventsSectionList = isExplicitHashtagIntent \? currentHashtagEvents : filteredEvents;/);
});

test("hashtag effect opts into bounded expansion for both posts and events", () => {
  assert.match(searchSource, /getHashtagMoments\(hashtagSectionQuery, SEARCH_RESULT_LIMIT, \{ expand: true \}\)/);
  assert.match(searchSource, /getHashtagEvents\(hashtagSectionQuery, \{\s*limit: SEARCH_RESULT_LIMIT,\s*expand: true,/);
});

test("no ranking metadata is surfaced in the Events UI", () => {
  assert.doesNotMatch(searchSource, /tier|relevanceScore|morphologyVariant|editDistance|fuzzyScore/i);
});

test("FILTERS and search JSX are unchanged (chips, input, result rows)", () => {
  assert.match(searchSource, /const FILTERS: SearchFilter\[\] = \['All', 'People', 'Events', 'Hashtags'\];/);
  assert.match(searchSource, /placeholder="Search"/);
  // Row markup unchanged apart from the added one-line truncation.
  assert.match(searchSource, /<Text style=\{\[styles\.listTitle, \{ color: colors\.text \}\]\} numberOfLines=\{1\} ellipsizeMode="tail">\{event\.title\}<\/Text>/);
  assert.match(searchSource, /pathname: '\/event-screen\/event',/);
});

// ── Mirror normalizer sanity ──────────────────────────────────────────

test("mirror normalizeSearchText: case + punctuation + empty parity with the backend contract", () => {
  assert.equal(normalizeSearchText("PARTY"), "party");
  assert.equal(normalizeSearchText("party!"), "party");
  assert.equal(normalizeSearchText("(party)"), "party");
  for (const q of [".", "...", "!!!", "---", "#", "##", "   "]) {
    assert.equal(normalizeSearchText(q), "");
  }
  assert.equal(normalizeSearchText("পার্টি"), "পার্টি");
});

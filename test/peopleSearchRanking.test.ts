import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Source-level wiring assertions (repo convention — there is no RN render
// harness here; see friendsFeedEmptyStateWiring.test.ts).
const searchSource = readFileSync(join(process.cwd(), "app/discover-screen/search.tsx"), "utf8");
const usersLibSource = readFileSync(join(process.cwd(), "lib/users.ts"), "utf8");

// ── API client ─────────────────────────────────────────────────────────

test("lib/users exports searchPeople hitting the dedicated /users/search endpoint with q", () => {
  assert.match(usersLibSource, /export const searchPeople = async \(query: string, limit = 50\)/);
  assert.match(usersLibSource, /api\.get\("\/users\/search"/);
  assert.match(usersLibSource, /q:\s*query/);
});

test("searchPeople does NOT reuse the recommendations endpoint", () => {
  const searchPeopleBlock = usersLibSource.slice(usersLibSource.indexOf("export const searchPeople"));
  assert.doesNotMatch(searchPeopleBlock.slice(0, 400), /\/users\/suggestions/);
});

test("getSuggestedUsers (recommendations) is left untouched — still /users/suggestions", () => {
  assert.match(usersLibSource, /export const getSuggestedUsers = async \(limit = 10\)/);
  assert.match(usersLibSource, /api\.get\("\/users\/suggestions"/);
});

// ── Screen wiring ──────────────────────────────────────────────────────

test("search screen imports searchPeople alongside getSuggestedUsers", () => {
  assert.match(searchSource, /import \{ getSuggestedUsers, searchPeople \} from '@\/lib\/users';/);
});

test("People search is debounced (~250ms constant)", () => {
  assert.match(searchSource, /const PEOPLE_SEARCH_DEBOUNCE_MS = 250;/);
  assert.match(searchSource, /\},\s*PEOPLE_SEARCH_DEBOUNCE_MS\);/);
  assert.match(searchSource, /const timer = setTimeout\(\(\) => \{/);
});

test("People search effect is keyed on the real query and clears when it is empty", () => {
  assert.match(searchSource, /const peopleQuery = searchQuery\.trim\(\)\.replace\(\/\^@\+\/, ''\)\.trim\(\);/);
  // Effect dependency is the derived query (+ retryToken, which re-runs the
  // CURRENT query on Retry / re-focus without mutating it), not raw keystrokes.
  assert.match(searchSource, /\}, \[peopleQuery, retryToken\]\);/);
  // Empty query path abandons in-flight work and clears server results.
  assert.match(searchSource, /if \(!peopleQuery\) \{[\s\S]{0,200}?setPeopleResults\(\[\]\);/);
});

test("stale response cannot overwrite a newer query (request-id guard)", () => {
  assert.match(searchSource, /const peopleRequestRef = useRef\(0\);/);
  assert.match(searchSource, /const requestId = \(peopleRequestRef\.current \+= 1\);/);
  // Guard runs both after resolve and in the catch branch.
  const guards = searchSource.match(/if \(peopleRequestRef\.current !== requestId\) \{\s*return;\s*\}/g) ?? [];
  assert.ok(guards.length >= 2, `expected >=2 request-id guards, found ${guards.length}`);
});

test("empty query keeps the existing recommendation list; real query shows server order", () => {
  // Real query => server rows, but only while they still belong to the visible
  // query (selectCurrentRows) so an older query's rows never flash; empty query
  // => the existing local recommendation filter, unchanged.
  assert.match(
    searchSource,
    /const filteredPeople = useMemo\(\s*\(\) => \(peopleQuery[\s\S]{0,400}?\?\s*selectCurrentRows\(peopleQuery, peopleResultsQuery, peopleResults\)\s*:\s*people\.filter\(/,
  );
});

test("server-ranked People results are rendered as returned — no client re-sort of them", () => {
  // The only .sort( in the file belongs to StyleSheet/other code, never the People list.
  assert.doesNotMatch(searchSource, /peopleResults[\s\S]{0,40}\.sort\(/);
  assert.doesNotMatch(searchSource, /filteredPeople[\s\S]{0,40}\.sort\(/);
});

// ── Non-regression: row / tabs / other sections ────────────────────────

test("People result row markup is unchanged apart from one-line truncation + real-handle-only", () => {
  assert.match(
    searchSource,
    /<UserAvatar uri=\{person\.avatarUrl\} name=\{person\.name\} size=\{52\} style=\{styles\.personAvatar\} \/>/,
  );
  assert.match(
    searchSource,
    /<Text style=\{\[styles\.listTitle, \{ color: colors\.text \}\]\} numberOfLines=\{1\} ellipsizeMode="tail">\{person\.name\}<\/Text>/,
  );
  // Handle only renders when it exists (no synthetic fallback) and truncates.
  assert.match(searchSource, /\{person\.handle \? \(/);
  assert.match(
    searchSource,
    /<Text style=\{\[styles\.listSubtitle, \{ color: colors\.textSecondary \}\]\} numberOfLines=\{1\} ellipsizeMode="tail">\{person\.handle\}<\/Text>/,
  );
  assert.doesNotMatch(searchSource, /@xenog/);
  assert.match(searchSource, /pathname: '\/profile-screen\/user-profile',/);
});

test("no ranking metadata (score / tier / mutual / activity badge) is surfaced in the UI", () => {
  assert.doesNotMatch(searchSource, /tier|secondaryScore|relevanceScore|sharedConnection|mutualCount|lastActive/i);
});

test("filter tabs are unchanged", () => {
  assert.match(searchSource, /const FILTERS: SearchFilter\[\] = \['All', 'People', 'Events', 'Hashtags'\];/);
});

test("Hashtag search debounce/section-routing unchanged; hashtag calls opt into bounded expansion", () => {
  // Debounce and the section-routing rule are unchanged by the typo-tolerance work.
  assert.match(searchSource, /const HASHTAG_CHECK_DEBOUNCE_MS = 350;/);
  assert.match(searchSource, /getHashtagMoments\(hashtagSectionQuery, SEARCH_RESULT_LIMIT, \{ expand: true \}\)/);
  assert.match(searchSource, /getHashtagEvents\(hashtagSectionQuery, \{/);
  assert.match(searchSource, /const eventsSectionList = isExplicitHashtagIntent \? currentHashtagEvents : filteredEvents;/);
});

test("All tab renders each succeeded section independently — one section's error/loading never hides a sibling with rows", () => {
  // Per-section state, combined by getScreenSearchState (partial failure => the
  // section that has rows still renders; the results list keeps `resultCount > 0`
  // sections).
  assert.match(searchSource, /const peopleSectionState = getSearchSourceState\(/);
  assert.match(searchSource, /const eventSectionState = getSearchSourceState\(/);
  assert.match(searchSource, /const hashtagProbeState = getSearchSourceState\(/);
  assert.match(searchSource, /getScreenSearchState\(visibleSections\.map\(section => sectionStateFor\(section\.filter\)\)\)/);
  assert.match(searchSource, /\.filter\(section => section\.resultCount > 0\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Source-level wiring assertions — repo convention (no RN render harness here;
// see eventSearchWiring.test.ts). Importing the RN component itself would pull
// react-native's Flow-typed entrypoint into the runner, so we read source text.
const search = readFileSync(join(process.cwd(), "app/discover-screen/search.tsx"), "utf8");
const stateMessage = readFileSync(join(process.cwd(), "components/search/SearchStateMessage.tsx"), "utf8");

// --- one shared visible query ---------------------------------------------

test("there is exactly one visible query state and only the TextInput writes it", () => {
  assert.match(search, /const \[searchQuery, setSearchQuery\] = useState\(''\)/);
  // The only setSearchQuery reference is the TextInput's onChangeText.
  const writes = search.match(/setSearchQuery/g) ?? [];
  assert.equal(writes.length, 2); // declaration + onChangeText={setSearchQuery}
  assert.match(search, /onChangeText=\{setSearchQuery\}/);
});

test("no per-tab visible query states are introduced", () => {
  assert.doesNotMatch(search, /peopleInputQuery|eventInputQuery|hashtagInputQuery/);
});

test("switching tabs only sets the active filter — never the query", () => {
  assert.match(search, /onPress=\{\(\) => setActiveFilter\(filter\)\}/);
});

// --- debounce constants unchanged ----------------------------------------

test("debounce constants are preserved (People 250 / Events 250 / Hashtag 350)", () => {
  assert.match(search, /const PEOPLE_SEARCH_DEBOUNCE_MS = 250;/);
  assert.match(search, /const EVENT_SEARCH_DEBOUNCE_MS = 250;/);
  assert.match(search, /const HASHTAG_CHECK_DEBOUNCE_MS = 350;/);
});

// --- stale-request guards preserved ------------------------------------------

test("People / Events request-id refs and Hashtag cancelled guard are all still present", () => {
  assert.match(search, /peopleRequestRef\.current !== requestId/);
  assert.match(search, /eventRequestRef\.current !== requestId/);
  assert.match(search, /if \(cancelled\) \{/);
});

// --- explicit error state, request-safe ------------------------------------

test("each network source tracks its own error keyed to the query it belongs to", () => {
  assert.match(search, /setPeopleErrorQuery\(peopleQuery\)/);
  assert.match(search, /setEventErrorQuery\(eventSearchQuery\)/);
  assert.match(search, /setHashtagErrorQuery\(bothFailed \? hashtagSectionQuery : null\)/);
});

test("error updates obey the same request guards (only applied for the latest query)", () => {
  // people error set is inside the `peopleRequestRef.current !== requestId` guarded block
  assert.match(
    search,
    /if \(peopleRequestRef\.current !== requestId\) \{\s*return;\s*\}\s*setPeopleResults\(\[\]\);\s*setPeopleResultsQuery\(peopleQuery\);\s*setPeopleErrorQuery\(peopleQuery\);/,
  );
});

test("the state machine renders LOADING / ERROR / EMPTY / RESULTS distinctly", () => {
  assert.match(search, /getScreenSearchState/);
  assert.match(search, /getSearchSourceState/);
  assert.match(search, /screenState === 'error'/);
  assert.match(search, /screenState === 'empty'/);
  assert.match(search, /<SearchStateMessage variant="error" onRetry=\{handleRetry\}/);
  assert.match(search, /<SearchStateMessage variant="empty"/);
});

test("a failed request never renders the empty copy", () => {
  assert.doesNotMatch(search, /No Result Found/);
  assert.doesNotMatch(search, /No results? [Ff]ound[^]{0,40}error/i);
});

// --- retry re-runs the CURRENT query, never mutates it -------------------

test("Retry bumps a refresh token and clears errors without touching the query/tab", () => {
  assert.match(search, /const handleRetry = useCallback\(\(\) => \{/);
  assert.match(search, /setRetryToken\(\(token\) => token \+ 1\)/);
  assert.doesNotMatch(search, /handleRetry[^]{0,400}setSearchQuery/);
  assert.doesNotMatch(search, /handleRetry[^]{0,400}setActiveFilter/);
});

test("retryToken is a dependency of every network-driven search effect", () => {
  assert.match(search, /\}, \[hashtagSectionQuery, retryToken\]\);/);
  assert.match(search, /\}, \[peopleQuery, retryToken\]\);/);
  assert.match(search, /\}, \[eventSearchQuery, retryToken\]\);/);
});

// --- All-tab old-result flash fix --------------------------------------------

test("result arrays are gated by the query they were fetched for (no cat rows under party)", () => {
  assert.match(search, /selectCurrentRows\(peopleQuery, peopleResultsQuery, peopleResults\)/);
  assert.match(search, /selectCurrentRows\(eventSearchQuery, eventResultsQuery, eventResults\)/);
  assert.match(search, /selectCurrentRows\(hashtagSectionQuery, hashtagResultsQuery, hashtagMatched/);
});

// --- focus: cold vs background --------------------------------------------

test("focus refresh runs in the background once loaded — no cold full-screen spinner", () => {
  assert.match(search, /const isBackground = hasLoadedRef\.current;/);
  assert.match(search, /void loadSearchData\(\(\) => isMounted, isBackground\)/);
  assert.match(search, /if \(!background\) \{\s*setIsLoading\(true\);/);
  assert.match(search, /hasLoadedRef\.current = true;/);
});

test("re-focus revalidates the active query in the background", () => {
  assert.match(search, /if \(isBackground\) \{\s*setRetryToken\(\(token\) => token \+ 1\);/);
});

// --- People metadata: no synthetic handle, clean truncation -------------------

test("the fake '@xenog' fallback handle is gone from every mapping site", () => {
  assert.doesNotMatch(search, /@xenog/);
  assert.match(search, /handle: user\.username \? `@\$\{user\.username\}` : ''/);
});

test("People and Event rows truncate long metadata to one line with a tail ellipsis", () => {
  assert.match(search, /\{person\.name\}<\/Text>/);
  assert.match(search, /\{person\.handle\}<\/Text>/);
  assert.match(search, /\{event\.title\}<\/Text>/);
  assert.match(search, /\{event\.subtitle\}<\/Text>/);
  const truncated = search.match(/numberOfLines=\{1\} ellipsizeMode="tail"/g) ?? [];
  assert.ok(truncated.length >= 4, `expected >=4 truncated rows, found ${truncated.length}`);
});

test("a missing username renders no handle line at all (not an empty pill)", () => {
  assert.match(search, /\{person\.handle \? \(/);
});

// --- empty copy strings -------------------------------------------------------

test("empty-state copy is the exact required primary + hint, no title case, no 'clear filters'", () => {
  assert.match(stateMessage, /SEARCH_EMPTY_TITLE = 'No results found';/);
  assert.match(stateMessage, /SEARCH_EMPTY_HINT = 'Check your spelling or try another search term\.';/);
  assert.match(stateMessage, /SEARCH_ERROR_TITLE = 'Something went wrong';/);
  assert.match(stateMessage, /SEARCH_RETRY_LABEL = 'Retry';/);
  assert.doesNotMatch(stateMessage, /Clear your filters|clear filters/i);
  assert.doesNotMatch(stateMessage, /No Result Found/);
});

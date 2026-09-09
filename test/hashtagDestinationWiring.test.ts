import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const hashtag = readFileSync(join(process.cwd(), "app/discover-screen/hashtag.tsx"), "utf8");
const eventsLib = readFileSync(join(process.cwd(), "lib/events.ts"), "utf8");
const momentsLib = readFileSync(join(process.cwd(), "lib/moments.ts"), "utf8");

// --- exact-tag only: destination never expands -----------------------------

test("the destination pages the EXACT tag only — it never sends expand=true", () => {
  assert.doesNotMatch(hashtag, /expand/);
  assert.match(hashtag, /getHashtagMomentsPage/);
  assert.match(hashtag, /getHashtagEventsPage/);
});

// --- additive, backward-compatible page fetchers ---------------------------

test("paged fetchers are additive (paginate=1) and keep the old array fetchers intact", () => {
  assert.match(momentsLib, /export const getHashtagMoments = async \(/);
  assert.match(momentsLib, /export const getHashtagMomentsPage = async \(/);
  assert.match(momentsLib, /paginate: '1'/);
  assert.match(momentsLib, /nextCursor: typeof nextCursor === 'string' && nextCursor\.length > 0 \? nextCursor : null/);

  assert.match(eventsLib, /export const getHashtagEvents = async \(/);
  assert.match(eventsLib, /export const getHashtagEventsPage = async \(/);
  assert.match(eventsLib, /paginate: '1'/);
});

// --- stale / overlap guard -------------------------------------------------

test("only the latest first-page / refresh generation may apply results, cursors or error", () => {
  assert.match(hashtag, /const requestRef = useRef\(0\)/);
  assert.match(hashtag, /const generation = \(requestRef\.current \+= 1\)/);
  assert.match(hashtag, /if \(requestRef\.current !== generation\) \{\s*return;\s*\}/);
});

test("a load-more only applies while it belongs to the current generation", () => {
  assert.match(hashtag, /const generation = requestRef\.current;/);
  assert.match(hashtag, /if \(requestRef\.current === generation\) \{[^}]*setPostsLoadMoreError\(true\);/);
  assert.match(hashtag, /if \(requestRef\.current === generation\) \{\s*setPostsLoadingMore\(false\);/);
});

// --- pagination UI --------------------------------------------------------

test("Posts paginate via onEndReached with a footer spinner; Events via a Load more button", () => {
  assert.match(hashtag, /onEndReached=\{\(\) => \{ void loadMorePosts\(\); \}\}/);
  assert.match(hashtag, /onEndReachedThreshold=\{0\.5\}/);
  assert.match(hashtag, /Load more events/);
  assert.match(hashtag, /ListFooterComponent=\{/);
});

test("page merges dedupe by stable entity id", () => {
  assert.match(hashtag, /import \{ mergeById \} from '@\/lib\/pagedList'/);
  assert.match(hashtag, /mergeById\(prev, mapped, \(post\) => post\.id\)/);
  assert.match(hashtag, /mergeById\(prev, page\.events, \(event\) => event\.id\)/);
});

test("a load-more failure keeps the loaded rows and offers Retry — never the empty screen", () => {
  assert.match(hashtag, /Couldn&apos;t load more\. Retry/);
  assert.match(hashtag, /setPostsLoadMoreError\(true\)/);
  // load-more error path does not clear posts/events
  assert.doesNotMatch(hashtag, /setPostsLoadMoreError\(true\);\s*setPosts\(\[\]\)/);
});

// --- loading / empty / error distinct -----------------------------------------

test("initial LOADING, EMPTY and ERROR are distinct on the destination", () => {
  assert.match(hashtag, /if \(isLoading\) \{\s*return <View style=\{styles\.center\}><ActivityIndicator/);
  assert.match(hashtag, /<SearchStateMessage variant="error" onRetry=\{\(\) => \{ void loadFirstPage\(\); \}\}/);
  assert.match(hashtag, /<SearchStateMessage variant="empty"/);
  assert.doesNotMatch(hashtag, /No posts or events found/);
});

test("partial failure keeps the side that succeeded", () => {
  // posts errored but events present -> still renders the list + a posts retry row
  assert.match(hashtag, /postsError && showEvents/);
  assert.match(hashtag, /eventsError && showPosts/);
});

// --- Back navigation is untouched ------------------------------------------

test("Back still uses the existing safeBack(router) — no route-param state migration", () => {
  assert.match(hashtag, /safeBack\(router, '\/\(tabs\)\/explore'\)/);
});

// --- long event metadata truncates --------------------------------------------

test("destination event rows truncate long title / metadata cleanly", () => {
  const truncated = hashtag.match(/numberOfLines=\{1\} ellipsizeMode="tail"/g) ?? [];
  assert.ok(truncated.length >= 2, `expected >=2 truncated event texts, found ${truncated.length}`);
});

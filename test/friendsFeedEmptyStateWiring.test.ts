import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Source-level regex assertions (this repo's convention for screen wiring —
// there is no RN component render harness here; see homeTabActiveState.test.ts).
const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");
const helperSource = readFileSync(join(process.cwd(), "lib/friendsFeedEmptyState.ts"), "utf8");

// ── Exact locked copy / CTA ─────────────────────────────────────────────

test("empty-state message is exactly the locked copy (sentence case, trailing period)", () => {
  assert.match(homeSource, /Follow people to see posts from friends\./);
  // Rendered exactly once — cannot leak into another branch.
  const occurrences = homeSource.split("Follow people to see posts from friends.").length - 1;
  assert.equal(occurrences, 1);
});

test("CTA label is exactly 'People to Follow'", () => {
  assert.match(homeSource, />People to Follow<\/Text>/);
});

test("CTA reuses the existing People to Follow route — no new route", () => {
  assert.match(homeSource, /router\.push\('\/discover-screen\/people-to-follow'\)/);
  assert.doesNotMatch(homeSource, /discover-people|find-friends|find-people|explore-people/i);
});

test("CTA has button accessibility (role + label), no disabled font scaling", () => {
  assert.match(
    homeSource,
    /accessibilityRole="button"\s*\n\s*accessibilityLabel="People to Follow"/,
  );
  assert.doesNotMatch(homeSource, /allowFontScaling=\{false\}/);
});

// ── Predicate + guards ─────────────────────────────────────────────────

test("home imports and uses the pure Friends empty-state predicate", () => {
  assert.match(
    homeSource,
    /import \{ shouldShowFriendsFeedEmptyState, type FriendsFeedLoadState \} from "@\/lib\/friendsFeedEmptyState";/,
  );
  assert.match(homeSource, /const shouldShowFriendsEmpty = shouldShowFriendsFeedEmptyState\(\{/);
});

test("predicate is explicitly guarded to Friends + loaded + not loading + not refreshing + 0 items", () => {
  assert.match(helperSource, /feedAudience === "friends"/);
  assert.match(helperSource, /friendsFeedLoadState === "loaded"/);
  assert.match(helperSource, /!isFeedLoading/);
  assert.match(helperSource, /!isRefreshing/);
  assert.match(helperSource, /itemCount === 0/);
  assert.match(helperSource, /selectedType === "Feed"/);
});

test("empty state is driven by the merged feed item count (events/reposts count too)", () => {
  assert.match(homeSource, /itemCount: feedItems\.length,/);
});

// ── Narrow local load state ────────────────────────────────────────────

test("a narrow local FriendsFeedLoadState is introduced (no global state library)", () => {
  assert.match(homeSource, /useState<FriendsFeedLoadState>\("idle"\)/);
});

test("Friends load is marked loading at start and only for the friends audience", () => {
  assert.match(
    homeSource,
    /setFriendsFeedLoadState\(audience === "friends" \? "loading" : "idle"\)/,
  );
});

test("load is 'loaded' only when all three friends sources fulfilled, else 'error'", () => {
  assert.match(
    homeSource,
    /momentsResult\.status === "fulfilled" &&\s*\n\s*eventsResult\.status === "fulfilled" &&\s*\n\s*repostsResult\.status === "fulfilled"/,
  );
  assert.match(homeSource, /setFriendsFeedLoadState\(allFriendSourcesFulfilled \? "loaded" : "error"\)/);
  // Only evaluated for the latest request (after the existing stale-request guard).
  const guardIdx = homeSource.indexOf("if (!isLatestSettled) {");
  const setIdx = homeSource.indexOf("setFriendsFeedLoadState(allFriendSourcesFulfilled");
  assert.ok(guardIdx !== -1 && setIdx !== -1 && setIdx > guardIdx);
});

test("no follow-count request is introduced", () => {
  assert.doesNotMatch(homeSource, /getUserProfileStats/);
});

// ── Layout / centering (only for the true-empty condition) ─────────────

test("flexGrow content container is applied ONLY for the Friends true-empty state", () => {
  assert.match(
    homeSource,
    /contentContainerStyle=\{shouldShowFriendsEmpty \? styles\.friendsFeedEmptyContentContainer : undefined\}/,
  );
  assert.match(homeSource, /friendsFeedEmptyContentContainer: \{\s*\n\s*flexGrow: 1,/);
  // The FlatList itself must not gain flex: 1 as part of this change.
  assert.doesNotMatch(homeSource, /<FlatList[\s\S]{0,400}style=\{\{ flex: 1 \}\}/);
});

test("empty state is centered and readable", () => {
  assert.match(
    homeSource,
    /friendsFeedEmpty: \{\s*\n\s*flex: 1,\s*\n\s*alignItems: "center",\s*\n\s*justifyContent: "center",/,
  );
  assert.match(homeSource, /friendsFeedEmptyText: \{[\s\S]{0,120}textAlign: "center",/);
});

// ── Regression guards: skeleton / Discover / Scenes / refresh ─────────

test("existing FeedSkeletonList implementation is unchanged (3 cards, shimmer loop)", () => {
  assert.match(homeSource, /\[0, 1, 2\]\.map\(\(item\) => \(\s*\n\s*<FeedSkeletonCard key=\{item\} pulse=\{pulse\} isDark=\{isDark\} \/>/);
  // Skeleton still owns the loading branch of ListEmptyComponent, ahead of the empty state.
  assert.match(
    homeSource,
    /ListEmptyComponent=\{\s*\n\s*shouldShowFeedSkeleton\s*\n\s*\? <FeedSkeletonList \/>\s*\n\s*: shouldShowFriendsEmpty/,
  );
});

test("initial loading still uses the skeleton, gated by isFeedLoading (mutually exclusive with empty)", () => {
  assert.match(
    homeSource,
    /const shouldShowFeedSkeleton = selectedType === 'Feed' && !hasFeedLoadedOnce && isFeedLoading && feedItems\.length === 0 && !isRefreshing;/,
  );
});

test("Discover behavior unchanged — no generic empty message added", () => {
  assert.doesNotMatch(homeSource, /No posts|Nothing here|No moments/i);
});

test("Scenes/windows branch still renders ParticipatedWindowsList untouched", () => {
  assert.match(
    homeSource,
    /homeAudience === 'windows' && selectedType === 'Feed' \? \(\s*\n\s*<ParticipatedWindowsList \/>/,
  );
});

test("RefreshControl remains wired to the feed FlatList", () => {
  assert.match(
    homeSource,
    /refreshControl=\{\s*\n\s*<RefreshControl\s*\n\s*refreshing=\{isRefreshing\}\s*\n\s*onRefresh=\{handleRefresh\}/,
  );
});

test("nearby-event filter subsection copy is untouched", () => {
  assert.match(homeSource, /No nearby active or upcoming events found\./);
});

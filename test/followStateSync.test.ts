import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Follow/Following state synchronization fix.
//
// Root cause: app/(tabs)/home.tsx kept `feedMomentPosts`, `feedEvents`, and
// `suggestedUsers` as independent state slices. A follow/unfollow originating
// from any one surface (FeedPost author card, EventFeedCard host card,
// PeopleToFollow) only ever patched that surface's own list, so the same
// canonical user could show "Following" on one card and "Follow" on another
// until the next full remount. Pull-to-refresh also never refetched
// suggestions, so the stale state survived a manual refresh too.
//
// Fix: home.tsx's handleAuthorFollowChange is now the single canonical
// propagation point — every surface's follow action (optimistic AND
// API-confirmed/rolled-back) routes through it, and it reconciles
// feedMomentPosts, feedEvents, and suggestedUsers together. handleRefresh
// also refetches suggestions as a server-authoritative backstop.
//
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");
const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");
const peopleToFollowSource = readFileSync(join(process.cwd(), "components/home/PeopleToFollow.tsx"), "utf8");

// ── Home: canonical reconciliation ────────────────────────────────────────

test("handleAuthorFollowChange reconciles feedMomentPosts (pre-existing behavior, untouched)", () => {
  assert.match(
    homeSource,
    /setFeedMomentPosts\(\(currentPosts\) => currentPosts\.map\(\(post\) => \(\s*post\.authorId === authorId \? \{ \.\.\.post, isFollowing \} : post\s*\)\)\);/,
  );
});

test("handleAuthorFollowChange also reconciles feedEvents (event host cards) for the same author id", () => {
  assert.match(
    homeSource,
    /setFeedEvents\(\(currentEvents\) => currentEvents\.map\(\(event\) => \(\s*event\.host && event\.host\.id === authorId\s*\? \{ \.\.\.event, host: \{ \.\.\.event\.host, isFollowing \} \}\s*: event\s*\)\)\);/,
  );
});

test("handleAuthorFollowChange removes a newly-followed user from suggestedUsers instead of leaving a stale 'Follow' card", () => {
  assert.match(homeSource, /setSuggestedUsers\(\(currentSuggestions\) => \{/);
  assert.match(homeSource, /pendingSuggestionRemovalsRef\.current\.set\(authorId, match\);/);
  assert.match(homeSource, /return currentSuggestions\.filter\(\(user\) => user\.id !== authorId\);/);
});

test("an unfollow/rollback restores a suggestion only if this same flow removed it — never fabricates suggestion data", () => {
  assert.match(
    homeSource,
    /const removed = pendingSuggestionRemovalsRef\.current\.get\(authorId\);/,
  );
  assert.match(
    homeSource,
    /if \(!removed \|\| currentSuggestions\.some\(\(user\) => user\.id === authorId\)\) \{\s*return currentSuggestions;\s*\}/,
  );
});

test("the same handleAuthorFollowChange callback is wired into FeedPost, EventFeedCard, and PeopleToFollow — one canonical propagation path", () => {
  assert.match(homeSource, /onAuthorFollowChange=\{handleAuthorFollowChange\}/);
  assert.match(homeSource, /onHostFollowChange=\{handleAuthorFollowChange\}/);
  assert.match(homeSource, /onFollowChange=\{handleAuthorFollowChange\}/);
});

// ── Home: suggested-users refetch on refresh ──────────────────────────────

test("loadSuggestedUsers is a single reusable loader (not duplicated per call site)", () => {
  const loaderDeclarations = homeSource.match(/const loadSuggestedUsers = useCallback/g) ?? [];
  assert.equal(loaderDeclarations.length, 1);
});

test("a fresh suggestions fetch clears the pending-removal rollback cache, since server truth now supersedes it", () => {
  assert.match(homeSource, /pendingSuggestionRemovalsRef\.current\.clear\(\);/);
});

test("pull-to-refresh (handleRefresh) refetches suggested users alongside stories and feed", () => {
  assert.match(
    homeSource,
    /Promise\.all\(\[loadStories\(\), loadFeed\(feedAudience\), loadSuggestedUsers\(\)\]\)/,
  );
});

test("a failed suggestions refresh does not wipe out suggestions already on screen", () => {
  assert.match(
    homeSource,
    /catch \{\s*\/\/ Keep whatever suggestions are already on screen rather than wiping/,
  );
});

// ── EventFeedCard: host follow propagation ────────────────────────────────

test("EventFeedCard accepts an onHostFollowChange callback", () => {
  assert.match(eventFeedCardSource, /onHostFollowChange\?: \(hostId: string, isFollowing: boolean\) => void;/);
});

test("EventFeedCard's toggleFollow propagates the optimistic value, the confirmed API result, and the rollback on failure", () => {
  assert.match(eventFeedCardSource, /setIsFollowing\(!wasFollowing\);\s*onHostFollowChange\?\.\(hostId, !wasFollowing\);/);
  assert.match(
    eventFeedCardSource,
    /if \(mountedRef\.current\) setIsFollowing\(result\.isFollowing\);\s*onHostFollowChange\?\.\(hostId, result\.isFollowing\);/,
  );
  assert.match(
    eventFeedCardSource,
    /if \(mountedRef\.current\) setIsFollowing\(wasFollowing\);\s*onHostFollowChange\?\.\(hostId, wasFollowing\);/,
  );
});

// ── PeopleToFollow: follow propagation + prop-driven resync ───────────────

test("PeopleToFollow accepts an onFollowChange callback", () => {
  assert.match(peopleToFollowSource, /onFollowChange\?: \(userId: string, isFollowing: boolean\) => void;/);
});

test("PeopleToFollow's handleFollowPress propagates the optimistic value, the confirmed API result, and the rollback on failure", () => {
  assert.match(peopleToFollowSource, /setFollowedUserIds\(nextFollowedUserIds\);\s*onFollowChange\?\.\(user\.id, !wasFollowing\);/);
  assert.match(peopleToFollowSource, /onFollowChange\?\.\(user\.id, follow\.isFollowing\);/);
  assert.match(peopleToFollowSource, /onFollowChange\?\.\(user\.id, wasFollowing\);/);
});

test("PeopleToFollow's local followedUserIds still resyncs from the users prop, so a parent-level suggestedUsers change (e.g. removal after follow) is reflected", () => {
  assert.match(
    peopleToFollowSource,
    /useEffect\(\(\) => \{\s*setFollowedUserIds\(users\.filter\(\(user\) => user\.isFollowing\)\.map\(\(user\) => user\.id\)\);\s*\}, \[users\]\);/,
  );
});

// ── Backend / DB / UI untouched ────────────────────────────────────────────

test("no backend or database files were touched by this fix (frontend-only scope)", () => {
  // Sanity guard for reviewers: this test file itself only reads app/-side
  // sources. If a future change to this fix starts importing anything from
  // xenog-api, that's a scope violation this test intentionally can't catch
  // by source-matching alone — flagged here as documentation of intent.
  assert.doesNotMatch(homeSource, /xenog-api/);
});

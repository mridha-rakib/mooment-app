import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialAudienceFeedState,
  getAudienceLoadFlags,
  mergeAudienceFeedCommit,
  shouldDeferAudienceFeedCommit,
  type AudienceFeedState,
} from "../lib/audienceFeedState";

type State = AudienceFeedState<string[], string[], string[]>;

const emptyLists = { posts: [] as string[], events: [] as string[], reposts: [] as string[] };

test("initial audience state starts empty and never-loaded", () => {
  const state = createInitialAudienceFeedState(emptyLists, true);

  assert.deepEqual(state.posts, []);
  assert.equal(state.hasLoadedOnce, false);
  assert.equal(state.isInitialLoading, true);
  assert.equal(state.isBackgroundRefreshing, false);
  assert.equal(state.error, null);
  assert.equal(state.friendsLoadState, "idle");
});

test("first-ever load shows the skeleton branch, never background refresh", () => {
  assert.deepEqual(getAudienceLoadFlags(false), {
    isInitialLoading: true,
    isBackgroundRefreshing: false,
  });
});

test("a tab that already loaded once refreshes in the background, never the skeleton again", () => {
  assert.deepEqual(getAudienceLoadFlags(true), {
    isInitialLoading: false,
    isBackgroundRefreshing: true,
  });
});

test("a successful commit fully replaces every resolved source — never merges/prepends", () => {
  const prev: State = {
    ...createInitialAudienceFeedState(emptyLists, false),
    posts: ["old-1", "old-2"],
    events: ["event-old"],
    reposts: ["repost-old"],
    hasLoadedOnce: true,
  };

  const next = mergeAudienceFeedCommit(prev, {
    posts: ["fresh-3", "fresh-1", "fresh-2"], // simulates a reordered smartFeedScore ranking
    events: ["event-fresh"],
    reposts: ["repost-fresh"],
    hasAnyFreshData: true,
  });

  assert.deepEqual(next.posts, ["fresh-3", "fresh-1", "fresh-2"]);
  assert.deepEqual(next.events, ["event-fresh"]);
  assert.deepEqual(next.reposts, ["repost-fresh"]);
  assert.equal(next.hasLoadedOnce, true);
  assert.equal(next.error, null);
});

test("a source that did not resolve keeps its previous cached value untouched", () => {
  const prev: State = {
    ...createInitialAudienceFeedState(emptyLists, false),
    posts: ["cached-1", "cached-2"],
    events: ["cached-event"],
    reposts: ["cached-repost"],
    hasLoadedOnce: true,
  };

  // Only posts resolved this time — events/reposts are omitted from the
  // commit exactly like home.tsx's Promise.allSettled branch does for a
  // rejected source.
  const next = mergeAudienceFeedCommit(prev, {
    posts: ["fresh-1"],
    hasAnyFreshData: true,
  });

  assert.deepEqual(next.posts, ["fresh-1"]);
  assert.deepEqual(next.events, ["cached-event"]);
  assert.deepEqual(next.reposts, ["cached-repost"]);
});

test("a total refresh failure keeps ALL cached content and only records a lightweight error", () => {
  const prev: State = {
    ...createInitialAudienceFeedState(emptyLists, false),
    posts: ["cached-1", "cached-2"],
    events: ["cached-event"],
    reposts: ["cached-repost"],
    hasLoadedOnce: true,
  };

  const next = mergeAudienceFeedCommit(prev, { hasAnyFreshData: false });

  assert.deepEqual(next.posts, prev.posts);
  assert.deepEqual(next.events, prev.events);
  assert.deepEqual(next.reposts, prev.reposts);
  assert.equal(next.hasLoadedOnce, true);
  assert.notEqual(next.error, null);
});

test("a failed FIRST load (never loaded before) stays not-loaded, still with empty cache", () => {
  const prev = createInitialAudienceFeedState(emptyLists, true);

  const next = mergeAudienceFeedCommit(prev, { hasAnyFreshData: false });

  assert.equal(next.hasLoadedOnce, false);
  assert.deepEqual(next.posts, []);
  assert.notEqual(next.error, null);
});

test("mergeAudienceFeedCommit does not mutate its input state", () => {
  const prev: State = {
    ...createInitialAudienceFeedState(emptyLists, false),
    posts: ["a"],
    hasLoadedOnce: true,
  };
  const prevPostsRef = prev.posts;

  mergeAudienceFeedCommit(prev, { posts: ["b"], hasAnyFreshData: true });

  assert.deepEqual(prev.posts, prevPostsRef);
  assert.deepEqual(prev.posts, ["a"]);
});

test("a commit for the currently active audience defers only while scrolling with fresh data", () => {
  assert.equal(shouldDeferAudienceFeedCommit(true, true, true), true);
  assert.equal(shouldDeferAudienceFeedCommit(true, true, false), false);
  assert.equal(shouldDeferAudienceFeedCommit(true, false, true), false);
});

test("a commit for an audience the user has switched away from never defers — nothing on screen to disrupt", () => {
  assert.equal(shouldDeferAudienceFeedCommit(false, true, true), false);
});

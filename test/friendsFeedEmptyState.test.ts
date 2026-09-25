import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldShowFriendsFeedEmptyState,
  type FriendsFeedLoadState,
} from "@/lib/friendsFeedEmptyState";

const base = {
  selectedType: "Feed",
  feedAudience: "friends" as const,
  isFeedLoading: false,
  isRefreshing: false,
  friendsFeedLoadState: "loaded" as FriendsFeedLoadState,
  itemCount: 0,
};

test("Friends + loaded + 0 items + not loading + not refreshing => true", () => {
  assert.equal(shouldShowFriendsFeedEmptyState(base), true);
});

test("Discover + loaded + 0 items => false (never leaks onto Discover)", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, feedAudience: "discover" }),
    false,
  );
});

test("Friends + loading + 0 items => false (not confused with loading)", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, friendsFeedLoadState: "loading", isFeedLoading: true }),
    false,
  );
});

test("Friends + idle + 0 items => false", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, friendsFeedLoadState: "idle" }),
    false,
  );
});

test("Friends + error + 0 items => false (a failure is never shown as empty)", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, friendsFeedLoadState: "error" }),
    false,
  );
});

test("Friends + refreshing + 0 items => false", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, isRefreshing: true }),
    false,
  );
});

test("Friends + loaded + 1 item => false", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, itemCount: 1 }),
    false,
  );
});

test("selectedType !== 'Feed' => false (Map mode etc.)", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, selectedType: "Map" }),
    false,
  );
});

test("still loading flag alone (isFeedLoading true) blocks the empty state", () => {
  assert.equal(
    shouldShowFriendsFeedEmptyState({ ...base, isFeedLoading: true }),
    false,
  );
});

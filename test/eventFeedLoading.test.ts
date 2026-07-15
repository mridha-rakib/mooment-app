import assert from "node:assert/strict";
import test from "node:test";

import {
  getVisibleFeedEvents,
  isLatestEventRequest,
  shouldShowEventFilterEmptyState,
  shouldShowEventFilterSection,
} from "../lib/eventFeedLoading";

test("event filter loading hides previous event results", () => {
  const previousEvents = [{ id: "event-1" }, { id: "event-2" }];

  assert.deepEqual(getVisibleFeedEvents(previousEvents, true), []);
  assert.deepEqual(getVisibleFeedEvents(previousEvents, false), previousEvents);
});

test("event filter section stays visible while loading or filters are active", () => {
  assert.equal(shouldShowEventFilterSection(false, false), false);
  assert.equal(shouldShowEventFilterSection(true, false), true);
  assert.equal(shouldShowEventFilterSection(false, true), true);
  assert.equal(shouldShowEventFilterSection(true, true), true);
});

test("event empty state waits until the latest filter loading finishes", () => {
  assert.equal(shouldShowEventFilterEmptyState({
    hasAppliedEventFilters: true,
    isEventLoading: true,
    isFeedLoading: false,
    eventCount: 0,
  }), false);
  assert.equal(shouldShowEventFilterEmptyState({
    hasAppliedEventFilters: true,
    isEventLoading: false,
    isFeedLoading: false,
    eventCount: 0,
  }), true);
  assert.equal(shouldShowEventFilterEmptyState({
    hasAppliedEventFilters: true,
    isEventLoading: false,
    isFeedLoading: false,
    eventCount: 1,
  }), false);
  assert.equal(shouldShowEventFilterEmptyState({
    hasAppliedEventFilters: false,
    isEventLoading: false,
    isFeedLoading: false,
    eventCount: 0,
  }), false);
});

test("event loading state uses latest request only", () => {
  assert.equal(isLatestEventRequest(4, 5), false);
  assert.equal(isLatestEventRequest(5, 5), true);
});

test("rapid apply and clear cycles keep loading controlled by the latest request", () => {
  let currentRequestId = 0;

  const applyRequestId = ++currentRequestId;
  const clearRequestId = ++currentRequestId;
  const applyAgainRequestId = ++currentRequestId;

  assert.equal(isLatestEventRequest(applyRequestId, currentRequestId), false);
  assert.equal(isLatestEventRequest(clearRequestId, currentRequestId), false);
  assert.equal(isLatestEventRequest(applyAgainRequestId, currentRequestId), true);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  getEventFilterSectionEvents,
  getEventFilterSectionHeading,
  getMixedFeedEvents,
  getVisibleFeedEvents,
  isLatestEventRequest,
  shouldShowEventFilterEmptyState,
  shouldShowEventFilterSection,
} from "../lib/eventFeedLoading";
import type { EventLocationFilter } from "../lib/eventFilters";

const baseLocationFilter: EventLocationFilter = {
  latitude: 23.685,
  longitude: 90.3563,
  radiusMiles: 50,
  label: "Current Location",
  source: "current",
};

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

test("active filters place events in the dedicated section only", () => {
  const events = [{ id: "event-1" }, { id: "event-2" }];

  assert.deepEqual(getEventFilterSectionEvents(events, true, false), events);
  assert.deepEqual(getMixedFeedEvents(events, true, false), []);
});

test("unfiltered feed keeps events in the mixed feed", () => {
  const events = [{ id: "event-1" }, { id: "event-2" }];

  assert.deepEqual(getEventFilterSectionEvents(events, false, false), []);
  assert.deepEqual(getMixedFeedEvents(events, false, false), events);
});

test("event loading withholds stale events from both feed placements", () => {
  const events = [{ id: "event-1" }, { id: "event-2" }];

  assert.deepEqual(getEventFilterSectionEvents(events, true, true), []);
  assert.deepEqual(getMixedFeedEvents(events, true, true), []);
  assert.deepEqual(getMixedFeedEvents(events, false, true), []);
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

test("filter section heading reflects current-location filtering", () => {
  assert.equal(
    getEventFilterSectionHeading({ ...baseLocationFilter, source: "current" }),
    "Nearby Events you can join",
  );
});

test("filter section heading names the manually selected place", () => {
  assert.equal(
    getEventFilterSectionHeading({
      ...baseLocationFilter,
      source: "selected",
      label: "Barisal, Barisal District, Bangladesh",
      shortLabel: "Barisal",
    }),
    "Events around Barisal",
  );
});

test("filter section heading falls back to the full label when no short label exists", () => {
  assert.equal(
    getEventFilterSectionHeading({
      ...baseLocationFilter,
      source: "selected",
      label: "Chattogram, Bangladesh",
      shortLabel: undefined,
    }),
    "Events around Chattogram, Bangladesh",
  );
});

test("filter section heading has no city-specific hardcoding", () => {
  assert.equal(
    getEventFilterSectionHeading({
      ...baseLocationFilter,
      source: "selected",
      label: "Dhaka, Bangladesh",
      shortLabel: "Dhaka",
    }),
    "Events around Dhaka",
  );
});

test("filter section heading is generic when only non-location filters are active", () => {
  assert.equal(getEventFilterSectionHeading(null), "Filtered Events");
  assert.equal(getEventFilterSectionHeading(undefined), "Filtered Events");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  getCarouselIndexByMarkerId,
  getNearestEventSequence,
  getSwipeTargetIndex,
  markerMatchesCategory,
  resolveCarouselSelection,
  type MapCarouselMarker,
} from "../lib/mapEventCarousel";

const marker = (
  id: string,
  longitude: number,
  latitude: number,
  overrides: Partial<MapCarouselMarker> = {},
): MapCarouselMarker => ({
  id,
  longitude,
  latitude,
  ...overrides,
});

test("nearest event sequence uses existing distance order when available", () => {
  const markers = [
    marker("far", -73, 40, { distanceMeters: 3000 }),
    marker("near", -73.01, 40, { distanceMeters: 120 }),
    marker("middle", -73.02, 40, { distanceMeters: 900 }),
  ];

  assert.deepEqual(
    getNearestEventSequence(markers, { userLocation: [-73, 40] }).map((item) => item.id),
    ["near", "middle", "far"],
  );
});

test("nearest event sequence sorts by user location when no existing distance order is available", () => {
  const markers = [
    marker("far", -73.4, 40),
    marker("near", -73.01, 40),
    marker("middle", -73.1, 40),
  ];

  assert.deepEqual(
    getNearestEventSequence(markers, { userLocation: [-73, 40] }).map((item) => item.id),
    ["near", "middle", "far"],
  );
});

test("nearest event sequence falls back to camera centre without user location", () => {
  const markers = [
    marker("west", -74, 40),
    marker("center", -73.02, 40),
    marker("east", -72, 40),
  ];

  assert.deepEqual(
    getNearestEventSequence(markers, { cameraCenter: [-73, 40] }).map((item) => item.id),
    ["center", "west", "east"],
  );
});

test("nearest event sequence preserves existing order as final fallback", () => {
  const markers = [
    marker("first", -74, 40),
    marker("second", -73, 40),
    marker("third", -72, 40),
  ];

  assert.deepEqual(getNearestEventSequence(markers).map((item) => item.id), ["first", "second", "third"]);
});

test("marker tap starts the carousel at that marker index", () => {
  const markers = [
    marker("event-a", -73, 40),
    marker("event-b", -73.1, 40),
    marker("event-c", -73.2, 40),
  ];

  assert.equal(getCarouselIndexByMarkerId(markers, "event-c"), 2);
  assert.equal(resolveCarouselSelection(markers, "event-c")?.id, "event-c");
});

test("swipe left and right are bounded and do not wrap", () => {
  assert.equal(getSwipeTargetIndex(1, "left", 4), 2);
  assert.equal(getSwipeTargetIndex(1, "right", 4), 0);
  assert.equal(getSwipeTargetIndex(0, "right", 4), 0);
  assert.equal(getSwipeTargetIndex(3, "left", 4), 3);
  assert.equal(getSwipeTargetIndex(0, "left", 1), 0);
});

test("selected marker resolves safely after filter or refresh changes", () => {
  const markers = [
    marker("event-a", -73, 40),
    marker("event-b", -73.1, 40),
  ];

  assert.equal(resolveCarouselSelection(markers, "event-b")?.id, "event-b");
  assert.equal(resolveCarouselSelection(markers, "removed")?.id, "event-a");
  assert.equal(resolveCarouselSelection([], "event-b"), null);
});

test("filtered-out events stay out while multi-category matches remain eligible", () => {
  const markers = [
    marker("social-food", -73, 40, {
      category: "Social Meetups",
      categories: ["Social Meetups", "Food & Drinks", "Travel & Experiences"],
    }),
    marker("music", -73.1, 40, {
      category: "Live Music & Concerts",
      categories: ["Live Music & Concerts"],
    }),
  ];
  const filtered = markers.filter((item) => markerMatchesCategory(item, "Food & Drinks"));

  assert.deepEqual(filtered.map((item) => item.id), ["social-food"]);
  assert.equal(markerMatchesCategory(markers[0], "Travel & Experiences"), true);
  assert.equal(markerMatchesCategory(markers[1], "Food & Drinks"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEventFilterRequestParams,
  confirmVisibleEventFilters,
  createEmptyEventFilters,
  hasActiveEventFilters,
  mergeCategoryIntoEventFilters,
  mergeVisibleEventFilters,
  parseLocalDateKey,
  setCategoryInEventFilters,
  toLocalDateKey,
  type SharedEventFilters,
} from "../lib/eventFilters";
import {
  buildMapEventRequestParams,
  getMapViewportPageBudget,
  getMapViewportRequestKey,
  type EventMapViewport,
} from "../lib/mapEventRequests";
import {
  getEventCategoryFeedDestination,
  getEventCategoryMapDestination,
  normalizeEventDetailsSource,
} from "../lib/eventCategoryNavigation";

test("empty shared event filters do not emit event-only request params", () => {
  const filters = createEmptyEventFilters();

  assert.equal(hasActiveEventFilters(filters), false);
  assert.equal(filters.category, null);
  assert.deepEqual(buildEventFilterRequestParams(filters), {});
});

test("real applied event filters drive clear button visibility", () => {
  const empty = createEmptyEventFilters();

  assert.equal(hasActiveEventFilters(empty), false);
  assert.equal(hasActiveEventFilters({ ...empty, ageRestriction: "all_ages" }), true);
  assert.equal(hasActiveEventFilters({ ...empty, priceFilter: "free" }), true);
  assert.equal(hasActiveEventFilters({ ...empty, selectedDate: "2026-07-14" }), true);
  assert.equal(hasActiveEventFilters({ ...empty, timePeriod: "morning" }), true);
  assert.equal(hasActiveEventFilters({ ...empty, hashtags: ["music"] }), true);
  assert.equal(hasActiveEventFilters({ ...empty, category: "Music" }), true);
  assert.equal(hasActiveEventFilters({
    ...empty,
    nearby: {
      latitude: 40,
      longitude: -73,
      radiusMiles: 25,
      label: "New York",
      source: "selected",
    },
  }), true);
});

test("shared event filters build one request contract for feed and map", () => {
  const filters: SharedEventFilters = {
    ageRestriction: "18_plus",
    category: "Food & Drinks",
    priceFilter: "free",
    selectedDate: "2026-07-14",
    timePeriod: "evening",
    hashtags: ["music", "summer"],
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 20,
      label: "Dhaka",
      source: "selected",
    },
  };

  const params = buildEventFilterRequestParams(filters, { limit: 100 });

  assert.equal(params.category, "Food & Drinks");
  assert.equal(params.ageRestriction, "18_plus");
  assert.equal(params.priceFilter, "free");
  assert.equal(params.date, "2026-07-14");
  assert.equal(params.timePeriod, "evening");
  assert.equal(params.hashtags, "music,summer");
  assert.equal(params.latitude, 23.7806);
  assert.equal(params.longitude, 90.4074);
  assert.equal(params.radiusKm, 32.18688);
  assert.equal(params.limit, 100);
});

test("shared category filter normalizes valid values and omits invalid or empty values", () => {
  const filters = mergeCategoryIntoEventFilters(createEmptyEventFilters(), " Food Trucks ");

  assert.equal(filters.category, "Food Trucks");
  assert.equal(hasActiveEventFilters(filters), true);
  assert.equal(buildEventFilterRequestParams(filters).category, "Food Trucks");

  assert.deepEqual(
    buildEventFilterRequestParams({ ...filters, category: "Unknown" as never }),
    {},
  );
  assert.deepEqual(
    buildEventFilterRequestParams({ ...filters, category: "" as never }),
    {},
  );
});

test("category intent merge replaces only the active category", () => {
  const current: SharedEventFilters = {
    ageRestriction: "21_plus",
    category: "Music",
    priceFilter: "lt_50",
    selectedDate: "2026-07-14",
    timePeriod: "late_night",
    hashtags: ["music"],
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 20,
      label: "Dhaka",
      source: "selected",
    },
  };

  const next = mergeCategoryIntoEventFilters(current, "Food & Drinks");

  assert.equal(next.category, "Food & Drinks");
  assert.equal(next.ageRestriction, "21_plus");
  assert.equal(next.priceFilter, "lt_50");
  assert.equal(next.selectedDate, "2026-07-14");
  assert.equal(next.timePeriod, "late_night");
  assert.deepEqual(next.hashtags, ["music"]);
  assert.equal(next.nearby?.radiusMiles, 20);
});

test("map selector category updates replace or clear only category", () => {
  const current: SharedEventFilters = {
    ageRestriction: "21_plus",
    category: "Music",
    priceFilter: "lt_50",
    selectedDate: "2026-07-14",
    timePeriod: "late_night",
    hashtags: ["music"],
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 20,
      label: "Dhaka",
      source: "selected",
    },
  };

  const replaced = setCategoryInEventFilters(current, "Food Trucks");
  assert.equal(replaced.category, "Food Trucks");
  assert.equal(replaced.ageRestriction, "21_plus");
  assert.equal(replaced.priceFilter, "lt_50");
  assert.equal(replaced.nearby?.radiusMiles, 20);

  const cleared = setCategoryInEventFilters(replaced, null);
  assert.equal(cleared.category, null);
  assert.equal(cleared.timePeriod, "late_night");
  assert.deepEqual(cleared.hashtags, ["music"]);
});

test("event details source normalization remains safe but no longer chooses category destination", () => {
  assert.equal(normalizeEventDetailsSource("feed"), "feed");
  assert.equal(normalizeEventDetailsSource("map"), "map");
  assert.equal(normalizeEventDetailsSource(undefined), "feed");
  assert.equal(normalizeEventDetailsSource("other"), "feed");

  const feedDestination = getEventCategoryFeedDestination("Food Trucks");
  assert.deepEqual(feedDestination, {
    pathname: "/discover-screen/event-category",
    params: { category: "Food Trucks" },
  });

  const mapDestination = getEventCategoryMapDestination("Food Trucks");
  assert.deepEqual(mapDestination, {
    pathname: "/(tabs)/home",
    params: { view: "map", category: "Food Trucks" },
  });

  assert.equal(getEventCategoryFeedDestination("Food"), null);
  assert.equal(getEventCategoryMapDestination("Food"), null);
  assert.deepEqual(getEventCategoryFeedDestination(" Food Trucks "), feedDestination);
  assert.deepEqual(getEventCategoryMapDestination(" Food Trucks "), mapDestination);
});

test("visible filter apply preserves hidden category unless reset apply clears it", () => {
  const current: SharedEventFilters = {
    ...createEmptyEventFilters(),
    category: "Social Meetups",
    ageRestriction: "18_plus",
  };
  const visibleDraft: SharedEventFilters = {
    ...createEmptyEventFilters(),
    priceFilter: "free",
    hashtags: ["summer"],
  };

  const applied = mergeVisibleEventFilters(current, visibleDraft);
  assert.equal(applied.category, "Social Meetups");
  assert.equal(applied.priceFilter, "free");
  assert.deepEqual(applied.hashtags, ["summer"]);

  const resetApplied = mergeVisibleEventFilters(current, visibleDraft, { clearCategory: true });
  assert.equal(resetApplied.category, null);
  assert.equal(resetApplied.priceFilter, "free");
});

test("reset confirmation clears every applied event filter and restores unfiltered params", () => {
  const current: SharedEventFilters = {
    ageRestriction: "21_plus",
    category: "Music",
    priceFilter: "lt_50",
    selectedDate: "2026-07-14",
    timePeriod: "late_night",
    hashtags: ["music", "summer"],
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 20,
      label: "Dhaka",
      source: "selected",
    },
  };
  const resetDraftDefaults: SharedEventFilters = {
    ageRestriction: "all_ages",
    priceFilter: "free",
    selectedDate: null,
    timePeriod: "morning",
    hashtags: [],
    nearby: {
      latitude: 34.052235,
      longitude: -118.243683,
      radiusMiles: 75,
      label: "Los Angeles, CA",
      source: "selected",
    },
  };

  const cleared = confirmVisibleEventFilters(current, resetDraftDefaults, { resetAll: true });

  assert.deepEqual(cleared, createEmptyEventFilters());
  assert.equal(hasActiveEventFilters(cleared), false);
  assert.deepEqual(buildEventFilterRequestParams(cleared), {});
});

test("repeated apply and clear cycles do not retain stale event query params", () => {
  const empty = createEmptyEventFilters();
  const filtered = confirmVisibleEventFilters(empty, {
    ...empty,
    ageRestriction: "18_plus",
    priceFilter: "lt_10",
    selectedDate: "2026-07-14",
    timePeriod: "evening",
    hashtags: ["music"],
    nearby: {
      latitude: 40,
      longitude: -73,
      radiusMiles: 50,
      label: "New York",
      source: "selected",
    },
  });
  const firstClear = confirmVisibleEventFilters(filtered, filtered, { resetAll: true });
  const filteredAgain = confirmVisibleEventFilters(firstClear, {
    ...firstClear,
    priceFilter: "free",
    hashtags: ["summer"],
  });
  const secondClear = confirmVisibleEventFilters(filteredAgain, filteredAgain, { resetAll: true });

  assert.deepEqual(buildEventFilterRequestParams(filtered), {
    ageRestriction: "18_plus",
    priceFilter: "lt_10",
    date: "2026-07-14",
    timePeriod: "evening",
    timezoneOffsetMinutes: parseLocalDateKey("2026-07-14")?.getTimezoneOffset(),
    hashtags: "music",
    latitude: 40,
    longitude: -73,
    radiusKm: 80.4672,
  });
  assert.deepEqual(buildEventFilterRequestParams(firstClear), {});
  assert.deepEqual(buildEventFilterRequestParams(filteredAgain), {
    priceFilter: "free",
    hashtags: "summer",
  });
  assert.deepEqual(buildEventFilterRequestParams(secondClear), {});
});

test("map can omit explicit filter location without dropping other filters", () => {
  const filters: SharedEventFilters = {
    ageRestriction: "21_plus",
    priceFilter: "lt_50",
    selectedDate: null,
    timePeriod: "late_night",
    hashtags: [],
    nearby: {
      latitude: 40,
      longitude: -73,
      radiusMiles: 75,
      label: "Current Location",
      source: "current",
    },
  };

  const params = buildEventFilterRequestParams(filters, { includeLocation: false });

  assert.equal(params.ageRestriction, "21_plus");
  assert.equal(params.priceFilter, "lt_50");
  assert.equal(params.timePeriod, "late_night");
  assert.equal(params.latitude, undefined);
  assert.equal(params.longitude, undefined);
  assert.equal(params.radiusKm, undefined);
});

test("map viewport requests do not inject current location radius when nearby is off", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    category: "Music",
  };
  const viewport: EventMapViewport = {
    north: 41.123456,
    south: 39.987654,
    west: -74.555555,
    east: -72.111111,
    zoom: 7.123,
  };

  const params = buildMapEventRequestParams(filters, viewport, 100);

  assert.equal(params?.category, "Music");
  assert.equal(params?.limit, 100);
  assert.equal(params?.north, 41.123);
  assert.equal(params?.south, 39.988);
  assert.equal(params?.west, -74.556);
  assert.equal(params?.east, -72.111);
  assert.equal(params?.latitude, undefined);
  assert.equal(params?.longitude, undefined);
  assert.equal(params?.radiusKm, undefined);
});

test("explicit nearby filter keeps existing radius params and ignores viewport bounds", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    nearby: {
      latitude: 40,
      longitude: -73,
      radiusMiles: 25,
      label: "Current Location",
      source: "current",
    },
  };
  const viewport: EventMapViewport = {
    north: 50,
    south: 20,
    west: 100,
    east: 120,
    zoom: 2,
  };

  const params = buildMapEventRequestParams(filters, viewport, 100);

  assert.equal(params?.latitude, 40);
  assert.equal(params?.longitude, -73);
  assert.equal(params?.radiusKm, 40.2336);
  assert.equal(params?.north, undefined);
  assert.equal(params?.south, undefined);
  assert.equal(params?.west, undefined);
  assert.equal(params?.east, undefined);
});

test("equivalent settled viewport bounds share a stable request key", () => {
  const first: EventMapViewport = {
    north: 40.00001,
    south: 39.00001,
    west: -74.00001,
    east: -73.00001,
    zoom: 6.001,
  };
  const second: EventMapViewport = {
    north: 40.00002,
    south: 39.00002,
    west: -74.00002,
    east: -73.00002,
    zoom: 6.002,
  };

  assert.equal(getMapViewportRequestKey(first), getMapViewportRequestKey(second));
});

test("low zoom globe bounds ignore small jitter but keep meaningful movement distinct", () => {
  const first: EventMapViewport = {
    north: 49.4,
    south: -48.8,
    west: 169.6,
    east: -169.7,
    zoom: 2.04,
  };
  const jittered: EventMapViewport = {
    north: 49.49,
    south: -48.71,
    west: 169.51,
    east: -169.62,
    zoom: 2.18,
  };
  const moved: EventMapViewport = {
    north: 55,
    south: -43,
    west: 150,
    east: -160,
    zoom: 2.04,
  };

  assert.equal(getMapViewportRequestKey(first), getMapViewportRequestKey(jittered));
  assert.notEqual(getMapViewportRequestKey(first), getMapViewportRequestKey(moved));
});

test("low zoom map requests use a bounded page budget while focused views can exhaust pages", () => {
  const filters = createEmptyEventFilters();
  const lowZoom: EventMapViewport = {
    north: 70,
    south: -70,
    west: -180,
    east: 180,
    zoom: 2,
  };
  const midZoom: EventMapViewport = {
    north: 55,
    south: 35,
    west: -12,
    east: 20,
    zoom: 4,
  };
  const focusedZoom: EventMapViewport = {
    north: 41,
    south: 40,
    west: -74,
    east: -73,
    zoom: 8,
  };
  const nearbyFilters: SharedEventFilters = {
    ...filters,
    nearby: {
      latitude: 40,
      longitude: -73,
      radiusMiles: 25,
      label: "Current Location",
      source: "current",
    },
  };

  assert.equal(getMapViewportPageBudget(filters, lowZoom), 1);
  assert.equal(getMapViewportPageBudget(filters, midZoom), 2);
  assert.equal(getMapViewportPageBudget(filters, focusedZoom), null);
  assert.equal(getMapViewportPageBudget(nearbyFilters, lowZoom), null);
});

test("local date keys round trip without formatted string parsing", () => {
  const date = new Date(2026, 6, 14);
  const key = toLocalDateKey(date);

  assert.equal(key, "2026-07-14");
  assert.equal(parseLocalDateKey(key)?.getFullYear(), 2026);
  assert.equal(parseLocalDateKey(key)?.getMonth(), 6);
  assert.equal(parseLocalDateKey(key)?.getDate(), 14);
});

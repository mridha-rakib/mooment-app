import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEventFilterRequestParams,
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
  getEventDetailsCategoryDestination,
  normalizeEventDetailsSource,
} from "../lib/eventCategoryNavigation";

test("empty shared event filters do not emit event-only request params", () => {
  const filters = createEmptyEventFilters();

  assert.equal(hasActiveEventFilters(filters), false);
  assert.equal(filters.category, null);
  assert.deepEqual(buildEventFilterRequestParams(filters), {});
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

test("event details category navigation is source-aware with feed fallback", () => {
  assert.equal(normalizeEventDetailsSource("feed"), "feed");
  assert.equal(normalizeEventDetailsSource("map"), "map");
  assert.equal(normalizeEventDetailsSource(undefined), "feed");
  assert.equal(normalizeEventDetailsSource("other"), "feed");

  const feedDestination = getEventDetailsCategoryDestination("feed", "Food Trucks");
  assert.deepEqual(feedDestination, {
    pathname: "/discover-screen/event-category",
    params: { category: "Food Trucks" },
  });

  const fallbackDestination = getEventDetailsCategoryDestination(undefined, "Food Trucks");
  assert.deepEqual(fallbackDestination, feedDestination);

  const mapDestination = getEventDetailsCategoryDestination("map", "Food Trucks");
  assert.deepEqual(mapDestination, {
    pathname: "/(tabs)/home",
    params: { view: "map", category: "Food Trucks" },
  });

  assert.equal(getEventDetailsCategoryDestination("map", "Food"), null);
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

test("local date keys round trip without formatted string parsing", () => {
  const date = new Date(2026, 6, 14);
  const key = toLocalDateKey(date);

  assert.equal(key, "2026-07-14");
  assert.equal(parseLocalDateKey(key)?.getFullYear(), 2026);
  assert.equal(parseLocalDateKey(key)?.getMonth(), 6);
  assert.equal(parseLocalDateKey(key)?.getDate(), 14);
});

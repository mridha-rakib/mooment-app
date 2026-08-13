import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_EVENT_RADIUS_MILES,
  MAX_EVENT_RADIUS_MILES,
  MIN_EVENT_RADIUS_MILES,
  buildEventFilterRequestParams,
  canApplyEventFilters,
  confirmVisibleEventFilters,
  createEmptyEventFilters,
  getEventLocationFilterKey,
  hasValidSelectedEventFilterLocation,
  hasActiveEventFilters,
  isValidEventLocationFilter,
  mergeCategoryIntoEventFilters,
  mergeVisibleEventFilters,
  normalizeEventRadiusMiles,
  parseLocalDateKey,
  setCategoryInEventFilters,
  toLocalDateKey,
  toggleSingleSelectFilterValue,
  type SharedEventFilters,
} from "../lib/eventFilters";
import {
  buildMapEventRequestParams,
  getMapViewportPageBudget,
  getMapViewportRequestKey,
  getRadiusAwareMapZoom,
  type EventMapViewport,
} from "../lib/mapEventRequests";
import { getCategoryColor, getCategoryMarkerColor } from "../constants/categoryColors";
import { EVENT_CATEGORIES, EVENT_CATEGORY_METADATA, isEventCategory } from "../constants/eventCategories";
import {
  getEventCategoryFeedDestination,
  getEventCategoryMapDestination,
  normalizeEventDetailsSource,
} from "../lib/eventCategoryNavigation";

const FINALIZED_CATEGORIES = [
  ["Parties & Celebrations", "#FF1493", "🎉"],
  ["Nightlife & Clubs", "#8A2BE2", "🍻"],
  ["Social Meetups", "#00F0FF", "💬"],
  ["College & Campus", "#1F51FF", "🎓"],
  ["Live Music & Concerts", "#FF6B00", "🎸"],
  ["Entertainment & Shows", "#E50914", "🎭"],
  ["Arts & Culture", "#DDA0DD", "🎨"],
  ["Community & Movements", "#580F24", "✊"],
  ["Food & Drinks", "#FFC700", "🍹"],
  ["Markets & Shopping", "#FF7F50", "🛍️"],
  ["Sports & Outdoors", "#00A86B", "🏃"],
  ["Games & Recreation", "#39FF14", "🎮"],
  ["Workshops & Classes", "#8B5A2B", "🧶"],
  ["Conferences & Talks", "#708090", "🎤"],
  ["Family & Gathering", "#AAF0D1", "🏡"],
  ["Wellness & Spirituality", "#C0C0C0", "🧘"],
  ["Travel & Experiences", "#008080", "✈️"],
  ["Pop-Ups & Exclusives", "#D4AF37", "✨"],
] as const;

const LEGACY_CATEGORIES = [
  "Music",
  "Nightlife",
  "Shows & Entertainment",
  "Dining Experiences",
  "Food Trucks",
  "Social Pop-ups",
  "Sports & Outdoor",
  "Games & Leisure",
  "Learning & Classes",
  "Markets & Trade",
  "Street Performances",
  "Religious & Spiritual",
  "College Events",
  "Premium Experiences",
  "Family & Community",
  "Other",
] as const;

test("mobile canonical event taxonomy matches the finalized PDF order and colors", () => {
  assert.equal(EVENT_CATEGORY_METADATA.length, 18);
  assert.deepEqual(EVENT_CATEGORIES, FINALIZED_CATEGORIES.map(([name]) => name));
  assert.deepEqual(EVENT_CATEGORY_METADATA.map((category) => category.order), Array.from({ length: 18 }, (_, index) => index + 1));
  assert.deepEqual(EVENT_CATEGORY_METADATA.map((category) => category.hexColor), FINALIZED_CATEGORIES.map(([, hex]) => hex));
  assert.deepEqual(EVENT_CATEGORY_METADATA.map((category) => category.emoji), FINALIZED_CATEGORIES.map(([, , emoji]) => emoji));
  assert.equal(new Set(EVENT_CATEGORIES).size, 18);

  for (const [name, hex] of FINALIZED_CATEGORIES) {
    assert.equal(isEventCategory(name), true);
    assert.equal(getCategoryColor(name), hex);
  }

  for (const legacyCategory of LEGACY_CATEGORIES) {
    assert.equal(isEventCategory(legacyCategory), false);
  }
});

test("mobile map marker colors use primary category by default and active filter category when present", () => {
  for (const [name, hex] of FINALIZED_CATEGORIES) {
    assert.equal(getCategoryMarkerColor({ categories: [name] }), hex);
    assert.equal(getCategoryMarkerColor({ category: name }), hex);
    assert.equal(getCategoryMarkerColor({ categories: ["Social Meetups", name], activeCategory: name }), hex);
  }

  assert.equal(getCategoryMarkerColor({ categories: ["Social Meetups", "Food & Drinks", "Travel & Experiences"] }), "#00F0FF");
  assert.equal(getCategoryMarkerColor({ categories: ["Social Meetups", "Food & Drinks", "Travel & Experiences"], activeCategory: "Food & Drinks" }), "#FFC700");
  assert.equal(getCategoryMarkerColor({ categories: ["Social Meetups", "Food & Drinks", "Travel & Experiences"], activeCategory: "Travel & Experiences" }), "#008080");
  assert.equal(getCategoryMarkerColor({ categories: ["Unknown"] }), "#9CA3AF");
});

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
  assert.equal(hasActiveEventFilters({ ...empty, category: "Live Music & Concerts" }), true);
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

test("location and radius alone omit every optional request constraint", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 75,
      label: "Dhaka",
      source: "selected",
    },
  };

  const feedParams = buildEventFilterRequestParams(filters, { limit: 100, audience: "discover" });
  const mapParams = buildMapEventRequestParams(filters, null, 100);

  assert.equal(feedParams.latitude, 23.7806);
  assert.equal(feedParams.longitude, 90.4074);
  assert.ok(Math.abs((feedParams.radiusKm ?? 0) - 120.7008) < 0.0000001);
  assert.equal(feedParams.ageRestriction, undefined);
  assert.equal(feedParams.priceFilter, undefined);
  assert.equal(feedParams.date, undefined);
  assert.equal(feedParams.timePeriod, undefined);
  assert.equal(feedParams.hashtags, undefined);
  assert.equal(mapParams?.latitude, feedParams.latitude);
  assert.equal(mapParams?.longitude, feedParams.longitude);
  assert.equal(mapParams?.radiusKm, feedParams.radiusKm);
  assert.equal(mapParams?.ageRestriction, undefined);
  assert.equal(mapParams?.priceFilter, undefined);
  assert.equal(mapParams?.date, undefined);
  assert.equal(mapParams?.timePeriod, undefined);
  assert.equal(mapParams?.hashtags, undefined);
});

test("manual location filter keeps the shortLabel as client-only presentation metadata", () => {
  const barisalFilters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    nearby: {
      // Barisal's coordinates — a viewer physically in Dhaka must never have
      // Dhaka's coordinates substituted or merged in here.
      latitude: 22.701,
      longitude: 90.3535,
      radiusMiles: 140,
      label: "Barisal, Barisal District, Bangladesh",
      source: "selected",
      shortLabel: "Barisal",
    },
  };

  const params = buildEventFilterRequestParams(barisalFilters);

  assert.equal(params.latitude, 22.701);
  assert.equal(params.longitude, 90.3535);
  assert.ok(Math.abs((params.radiusKm ?? 0) - 225.30816) < 0.0000001);
  assert.equal("shortLabel" in params, false);
  assert.equal("source" in params, false);
  assert.equal("label" in params, false);
  assert.equal("city" in params, false);
});

test("current-location filters remain unaffected by the shortLabel addition", () => {
  const currentLocationFilters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    nearby: {
      latitude: 23.8103,
      longitude: 90.4125,
      radiusMiles: 50,
      label: "Current Location",
      source: "current",
    },
  };

  const params = buildEventFilterRequestParams(currentLocationFilters);

  assert.equal(params.latitude, 23.8103);
  assert.equal(params.longitude, 90.4125);
  assert.equal("shortLabel" in params, false);
});

test("home filter draft apply eligibility requires a location source", () => {
  const noLocation = {
    useCurrentLocation: false,
    selectedLocationLabel: "",
    selectedLatitude: null,
    selectedLongitude: null,
  };

  assert.equal(canApplyEventFilters(noLocation), false);
  assert.equal(canApplyEventFilters({
    ...noLocation,
    selectedLocationLabel: "Typed but not selected",
  }), false);
  assert.equal(canApplyEventFilters({
    ...noLocation,
    selectedLocationLabel: "Dhaka",
    selectedLatitude: Number.NaN,
    selectedLongitude: 90.4074,
  }), false);
  assert.equal(canApplyEventFilters({
    ...noLocation,
    selectedLocationLabel: "Dhaka",
    selectedLatitude: 23.7806,
    selectedLongitude: 90.4074,
  }), true);
  assert.equal(hasValidSelectedEventFilterLocation({
    ...noLocation,
    selectedLocationLabel: "Dhaka",
    selectedLatitude: 23.7806,
    selectedLongitude: 90.4074,
  }), true);
  assert.equal(canApplyEventFilters({
    ...noLocation,
    useCurrentLocation: true,
  }), true);
});

test("optional single-select filter values can be selected, replaced, and deselected", () => {
  assert.equal(toggleSingleSelectFilterValue<string>(null, "Free"), "Free");
  assert.equal(toggleSingleSelectFilterValue("Free", "< $10"), "< $10");
  assert.equal(toggleSingleSelectFilterValue("Free", "Free"), null);
  assert.equal(toggleSingleSelectFilterValue<string>(null, "Morning"), "Morning");
  assert.equal(toggleSingleSelectFilterValue("Morning", "Noon"), "Noon");
  assert.equal(toggleSingleSelectFilterValue("Morning", "Morning"), null);
});

test("event location filter radius is constrained to the approved mile range", () => {
  assert.equal(MIN_EVENT_RADIUS_MILES, 1);
  assert.equal(MAX_EVENT_RADIUS_MILES, 200);
  assert.equal(DEFAULT_EVENT_RADIUS_MILES, 75);
  assert.equal(normalizeEventRadiusMiles(0), 1);
  assert.equal(normalizeEventRadiusMiles(-10), 1);
  assert.equal(normalizeEventRadiusMiles(Number.NaN), 75);
  assert.equal(normalizeEventRadiusMiles(Number.POSITIVE_INFINITY), 75);
  assert.equal(normalizeEventRadiusMiles(225), 200);
  assert.equal(normalizeEventRadiusMiles(75), 75);
});

test("invalid nearby filters do not emit stale or unsafe location request params", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 0,
      label: "Dhaka",
      source: "selected",
    },
  };

  assert.equal(isValidEventLocationFilter(filters.nearby), false);
  assert.equal(hasActiveEventFilters(filters), false);
  assert.equal(getEventLocationFilterKey(filters.nearby), null);
  assert.deepEqual(buildEventFilterRequestParams(filters), {});

  const mapParams = buildMapEventRequestParams(filters, {
    north: 24,
    south: 23,
    west: 90,
    east: 91,
    zoom: 8,
  }, 100);
  assert.equal(mapParams?.latitude, undefined);
  assert.equal(mapParams?.longitude, undefined);
  assert.equal(mapParams?.radiusKm, undefined);
  assert.equal(mapParams?.north, 24);
});

test("one-mile and two-hundred-mile radii convert to kilometres exactly once", () => {
  const oneMileFilters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 1,
      label: "Dhaka",
      source: "selected",
    },
  };
  const maxMileFilters: SharedEventFilters = {
    ...oneMileFilters,
    nearby: {
      ...oneMileFilters.nearby!,
      radiusMiles: 200,
    },
  };

  assert.equal(buildEventFilterRequestParams(oneMileFilters).radiusKm, 1.609344);
  assert.equal(buildEventFilterRequestParams(maxMileFilters).radiusKm, 321.8688);
  assert.equal(buildMapEventRequestParams(oneMileFilters, null, 100)?.radiusKm, 1.609344);
  assert.equal(buildMapEventRequestParams(maxMileFilters, null, 100)?.radiusKm, 321.8688);
});

test("nearby filter key is stable for map recenter intents", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 75,
      label: "Dhaka",
      source: "selected",
    },
  };

  assert.equal(getEventLocationFilterKey(filters.nearby), "selected:23.780600:90.407400:75.000");
  assert.notEqual(
    getEventLocationFilterKey({ ...filters.nearby!, radiusMiles: 25 }),
    getEventLocationFilterKey(filters.nearby),
  );
});

test("feed event request params include the selected audience without changing filters", () => {
  const filters: SharedEventFilters = {
    ageRestriction: "18_plus",
    category: "Markets & Shopping",
    priceFilter: "lt_50",
    selectedDate: "2026-07-14",
    timePeriod: "evening",
    hashtags: ["food"],
    nearby: null,
  };

  const params = buildEventFilterRequestParams(filters, { limit: 100, audience: "friends" });

  assert.equal(params.audience, "friends");
  assert.equal(params.category, "Markets & Shopping");
  assert.equal(params.ageRestriction, "18_plus");
  assert.equal(params.priceFilter, "lt_50");
  assert.equal(params.date, "2026-07-14");
  assert.equal(params.timePeriod, "evening");
  assert.equal(params.hashtags, "food");
  assert.equal(params.limit, 100);
});

test("shared category filter normalizes valid values and omits invalid or empty values", () => {
  const filters = mergeCategoryIntoEventFilters(createEmptyEventFilters(), " Markets & Shopping ");

  assert.equal(filters.category, "Markets & Shopping");
  assert.equal(hasActiveEventFilters(filters), true);
  assert.equal(buildEventFilterRequestParams(filters).category, "Markets & Shopping");

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
    category: "Live Music & Concerts",
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
    category: "Live Music & Concerts",
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

  const replaced = setCategoryInEventFilters(current, "Markets & Shopping");
  assert.equal(replaced.category, "Markets & Shopping");
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

  const feedDestination = getEventCategoryFeedDestination("Markets & Shopping");
  assert.deepEqual(feedDestination, {
    pathname: "/discover-screen/event-category",
    params: { category: "Markets & Shopping" },
  });

  const mapDestination = getEventCategoryMapDestination("Markets & Shopping");
  assert.deepEqual(mapDestination, {
    pathname: "/(tabs)/home",
    params: { view: "map", category: "Markets & Shopping" },
  });

  assert.equal(getEventCategoryFeedDestination("Food"), null);
  assert.equal(getEventCategoryMapDestination("Food"), null);
  assert.deepEqual(getEventCategoryFeedDestination(" Markets & Shopping "), feedDestination);
  assert.deepEqual(getEventCategoryMapDestination(" Markets & Shopping "), mapDestination);
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
    category: "Live Music & Concerts",
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
    ageRestriction: undefined,
    priceFilter: undefined,
    selectedDate: null,
    timePeriod: undefined,
    hashtags: [],
    nearby: null,
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
    category: "Live Music & Concerts",
  };
  const viewport: EventMapViewport = {
    north: 41.123456,
    south: 39.987654,
    west: -74.555555,
    east: -72.111111,
    zoom: 7.123,
  };

  const params = buildMapEventRequestParams(filters, viewport, 100);

  assert.equal(params?.category, "Live Music & Concerts");
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

test("radius-aware map zoom stays deterministic across the approved range", () => {
  const oneMileZoom = getRadiusAwareMapZoom(1);
  const mediumZoom = getRadiusAwareMapZoom(75);
  const maxZoom = getRadiusAwareMapZoom(200);

  assert.equal(oneMileZoom, 14);
  assert.equal(maxZoom, 6);
  assert.equal(mediumZoom < oneMileZoom, true);
  assert.equal(mediumZoom > maxZoom, true);
  assert.equal(getRadiusAwareMapZoom(0), 14);
  assert.equal(getRadiusAwareMapZoom(300), 6);
});

test("local date keys round trip without formatted string parsing", () => {
  const date = new Date(2026, 6, 14);
  const key = toLocalDateKey(date);

  assert.equal(key, "2026-07-14");
  assert.equal(parseLocalDateKey(key)?.getFullYear(), 2026);
  assert.equal(parseLocalDateKey(key)?.getMonth(), 6);
  assert.equal(parseLocalDateKey(key)?.getDate(), 14);
});

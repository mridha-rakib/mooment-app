import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildEventFilterRequestParams,
  createEmptyEventFilters,
  hasActiveEventFilters,
  summarizeEventFilters,
  type SharedEventFilters,
} from "../lib/eventFilters";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const filterModalSource = read("components/home/FilterModal.tsx");
const homeSource = read("app/(tabs)/home.tsx");
const mapScreenSource = read("components/ui/MapScreen.tsx");
const mapContainerSource = read("components/home/MapContainer.tsx");
const homeHeaderSource = read("components/home/HomeHeader.tsx");
const eventFiltersSource = read("lib/eventFilters.ts");

// ────────────────────────────────────────────────────────────
// 1. ACTIVE-CRITERIA SUMMARY (pure helper, authoritative state)
// ────────────────────────────────────────────────────────────

test("summary: nothing active → empty string", () => {
  assert.equal(summarizeEventFilters(createEmptyEventFilters()), "");
});

test("summary: single price", () => {
  assert.equal(
    summarizeEventFilters({ ...createEmptyEventFilters(), priceFilter: "free" }),
    "Free",
  );
});

test("summary: price + time joined with a middot", () => {
  assert.equal(
    summarizeEventFilters({
      ...createEmptyEventFilters(),
      priceFilter: "free",
      timePeriod: "evening",
    }),
    "Free · Evening",
  );
});

test("summary: single hashtag keeps the # and lowercase canonical form", () => {
  assert.equal(
    summarizeEventFilters({ ...createEmptyEventFilters(), hashtags: ["music"] }),
    "#music",
  );
});

test("summary: multiple hashtags keep their existing order (no reordering / dedupe invented)", () => {
  assert.equal(
    summarizeEventFilters({ ...createEmptyEventFilters(), hashtags: ["music", "party"] }),
    "#music · #party",
  );
});

test("summary: full line uses category · age · price · date · time · tags · radius · place", () => {
  const filters: SharedEventFilters = {
    category: "Live Music & Concerts",
    ageRestriction: "21_plus",
    priceFilter: "free",
    selectedDate: "2026-09-20",
    timePeriod: "evening",
    hashtags: ["music"],
    nearby: {
      latitude: 40.7128,
      longitude: -74.006,
      radiusMiles: 25,
      label: "New York, New York, United States",
      source: "selected",
      shortLabel: "New York",
    },
  };
  assert.equal(
    summarizeEventFilters(filters),
    "Live Music & Concerts · 21+ · Free · Sep 20 · Evening · #music · 25 mi · New York",
  );
});

test("summary: current-location center stays concise", () => {
  assert.equal(
    summarizeEventFilters({
      ...createEmptyEventFilters(),
      nearby: {
        latitude: 23.78,
        longitude: 90.41,
        radiusMiles: 75,
        label: "Current Location",
        source: "current",
      },
    }),
    "75 mi · Current Location",
  );
});

test("summary: an invalid nearby filter contributes nothing", () => {
  assert.equal(
    summarizeEventFilters({
      ...createEmptyEventFilters(),
      nearby: {
        latitude: 23.78,
        longitude: 90.41,
        radiusMiles: 0, // invalid
        label: "Current Location",
        source: "current",
      },
    }),
    "",
  );
});

test("summary is display-only: it does not touch request params or active-state logic", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    priceFilter: "free",
    timePeriod: "evening",
  };
  // buildEventFilterRequestParams / hasActiveEventFilters unchanged by the helper.
  assert.equal(buildEventFilterRequestParams(filters).priceFilter, "free");
  assert.equal(buildEventFilterRequestParams(filters).timePeriod, "evening");
  assert.equal(hasActiveEventFilters(filters), true);
});

test("FilterModal renders the applied summary from the authoritative prop, truncated", () => {
  assert.match(filterModalSource, /const appliedSummary = summarizeEventFilters\(activeFilters\);/);
  assert.match(filterModalSource, /\{appliedSummary \?[\s\S]*numberOfLines=\{1\}[\s\S]*ellipsizeMode="tail"/);
});

// ────────────────────────────────────────────────────────────
// 2. INDEPENDENT DATE REMOVAL
// ────────────────────────────────────────────────────────────

test("date-clear: dedicated draft-only affordance clears just the date", () => {
  assert.match(
    filterModalSource,
    /const handleClearDate = useCallback\(\(\) => \{\s*invalidateResetSnapshot\(\);\s*setSelectedDate\(null\);/,
  );
  assert.match(filterModalSource, /accessibilityLabel="Remove date"/);
  assert.match(filterModalSource, /onPress=\{handleClearDate\}/);
  // It touches nothing else — no time/price/hashtag/location/radius resets nearby.
  const clearDateBlock = filterModalSource.slice(
    filterModalSource.indexOf("const handleClearDate ="),
    filterModalSource.indexOf("const handleRemoveSearchedLocation ="),
  );
  assert.doesNotMatch(clearDateBlock, /setActiveTime|setActivePrice|setHashtags|setRadius|setUseCurrentLocation/);
});

test("date-clear: serializer omits `date` when selectedDate is null; time + price survive", () => {
  const params = buildEventFilterRequestParams({
    ...createEmptyEventFilters(),
    selectedDate: null,
    priceFilter: "free",
    timePeriod: "evening",
  });
  assert.equal(params.date, undefined);
  assert.equal(params.priceFilter, "free");
  assert.equal(params.timePeriod, "evening");
});

test("date-clear: draft-only — Cancel path never commits (only Apply calls onApply)", () => {
  // The X handler mutates local state; nothing in it calls onApply/onClose.
  const clearDateBlock = filterModalSource.slice(
    filterModalSource.indexOf("const handleClearDate ="),
    filterModalSource.indexOf("const handleRemoveSearchedLocation ="),
  );
  assert.doesNotMatch(clearDateBlock, /onApply|onClose/);
  // Hydration still restores the applied date on reopen.
  assert.match(filterModalSource, /setSelectedDate\(parseLocalDateKey\(activeFilters\.selectedDate\)\)/);
});

// ────────────────────────────────────────────────────────────
// 3. SEARCHED-LOCATION REMOVE + "Searching near" LABEL
// ────────────────────────────────────────────────────────────

test("searched-location: box is labelled 'Searching near' and has a dedicated remove", () => {
  assert.match(filterModalSource, /Searching near/);
  assert.match(filterModalSource, /accessibilityLabel="Remove search location"/);
  assert.match(filterModalSource, /onPress=\{handleRemoveSearchedLocation\}/);
});

test("searched-location remove: returns to filter-scoped Current Location, never global sharing / OS", () => {
  const block = filterModalSource.slice(
    filterModalSource.indexOf("const handleRemoveSearchedLocation ="),
    filterModalSource.indexOf("const handleApply ="),
  );
  assert.match(block, /invalidateResetSnapshot\(\)/);
  assert.match(block, /clearSelectedLocationDraft\(\)/);
  assert.match(block, /setUseCurrentLocation\(true\)/);
  assert.match(block, /void runLocationCheck\(\)/);
  // No global sharing, no profile write, no device-coord mutation, no crash-y calls.
  assert.doesNotMatch(block, /enableSharing|disableSharing|enableLocationSharing|disableLocationSharing|api\.patch/);
  assert.doesNotMatch(block, /onApply|onClose/);
});

test("searched-location remove: unavailable device location reuses the existing recovery panel", () => {
  // runLocationCheck already records a recoverable status + keeps the panel;
  // criteria are untouched by handleRemoveSearchedLocation.
  assert.match(filterModalSource, /<LocationRecoveryState/);
  const block = filterModalSource.slice(
    filterModalSource.indexOf("const handleRemoveSearchedLocation ="),
    filterModalSource.indexOf("const handleReset ="),
  );
  assert.doesNotMatch(block, /setActiveAge|setActivePrice|setActiveTime|setHashtags\(|setRadius|setSelectedDate/);
});

test("Batch 2D: Reset preserves BOTH current and searched centres via one helper", () => {
  assert.match(
    filterModalSource,
    /const snapshot = resetEventFiltersPreservingDiscoveryCenter\(activeFilters\);/,
  );
  // handleReset now restores the draft for whichever centre survived.
  const resetBlock = filterModalSource.slice(
    filterModalSource.indexOf("const handleReset ="),
    filterModalSource.indexOf("const handleApply ="),
  );
  assert.match(resetBlock, /center\?\.source === 'current'/);
  assert.match(resetBlock, /center\?\.source === 'selected'/);
  assert.match(resetBlock, /setRadiusEnabled\(false\)/);
});

// ────────────────────────────────────────────────────────────
// 4. FEED NO-MATCH vs LOCATION FAILURE
// ────────────────────────────────────────────────────────────

test("feed no-match: exact copy, shown only on settled + zero + active filters", () => {
  assert.match(homeSource, /No events match these filters nearby/);
  assert.doesNotMatch(homeSource, /No nearby active or upcoming events found/);
  // Gated by the settled/zero/active helper, and behind the loading skeleton.
  assert.match(homeSource, /isEventFilterLoading \?\s*\(\s*<EventFeedSkeletonList \/>\s*\)\s*:\s*showEventFilterEmptyState \?/);
});

test("feed no-match is NOT the location-failure state (that lives in FilterModal recovery)", () => {
  // The feed no-match text is plain copy — no Open Settings / Retry attached.
  const emptyBlock = homeSource.slice(
    homeSource.indexOf("showEventFilterEmptyState ?"),
    homeSource.indexOf("showEventFilterEmptyState ?") + 260,
  );
  assert.doesNotMatch(emptyBlock, /Open Settings|Retry|Turn on location/);
});

test("feed no-match keeps ordinary Posts/Reposts: filter section is separate from the mixed feed", () => {
  // Posts feed request is unfiltered (Batch-1) and feedItems still render below.
  const callSlice = homeSource.slice(homeSource.indexOf("getFeedMoments({"), homeSource.indexOf("getFeedMoments({") + 120);
  assert.match(callSlice, /getFeedMoments\(\{ audience \}\)/);
  assert.match(homeSource, /getMixedFeedEvents\(/);
});

// ────────────────────────────────────────────────────────────
// 5. MAP NO-MATCH
// ────────────────────────────────────────────────────────────

test("map no-match: MapContainer derives it from settled + zero markers + active filters", () => {
  assert.match(mapContainerSource, /const \[eventsSettled, setEventsSettled\] = React\.useState\(false\)/);
  assert.match(mapContainerSource, /noEventMatches=\{hasActiveFilters && eventsSettled && markers\.length === 0\}/);
  // settled flag only drops on a real query change, not a silent focus refresh.
  assert.match(mapContainerSource, /if \(mapRequestKey !== lastSettledKeyRef\.current\) \{\s*setEventsSettled\(false\);/);
});

test("map no-match: same copy, separate from location recovery, reuses onClearFilters", () => {
  assert.match(mapScreenSource, /const showNoEventMatches = noEventMatches && !deviceLocationStatus;/);
  assert.match(mapScreenSource, /No events match these filters nearby/);
  assert.match(mapScreenSource, /\{showNoEventMatches \?/);
  // Clear filters on the Map still calls the shared handler — no Map-local reset.
  assert.match(mapScreenSource, /onPress=\{onClearFilters\}/);
  assert.doesNotMatch(mapScreenSource, /createEmptyEventFilters|setAppliedEventFilters/);
});

test("map stays mounted: the no-match banner is additive inside the existing overlay", () => {
  assert.match(mapScreenSource, /styles\.mapOverlayControls/);
  assert.match(mapScreenSource, /<Mapbox\.MapView/);
});

// ────────────────────────────────────────────────────────────
// 6. NON-REGRESSION — Batch 1 + design locks
// ────────────────────────────────────────────────────────────

test("active-filter dot unchanged: still hasActiveEventFilters(activeFilters)", () => {
  assert.match(homeHeaderSource, /hasActiveEventFilters\(activeFilters\)/);
  assert.match(homeHeaderSource, /filterActiveDot/);
});

test("Batch-1 fixes still present: reset snapshot, generation guard, outer timeout", () => {
  assert.match(filterModalSource, /resetSnapshotRef\.current = snapshot;/);
  assert.match(filterModalSource, /if \(resetSnapshot\) \{\s*onApply\(resetSnapshot\);/);
  assert.match(filterModalSource, /const requestId = \+\+locationCheckIdRef\.current;/);
  assert.match(filterModalSource, /FILTER_LOCATION_CHECK_TIMEOUT_MS = 15000/);
  assert.match(mapScreenSource, /MAP_LOCATION_REQUEST_TIMEOUT_MS = 15000/);
});

test("Increase radius (Batch 2C) uses the LOCKED canonical checkpoint table, never dynamic increments", () => {
  // Deterministic table only — no current+25 / current*2 / arbitrary math.
  assert.match(
    eventFiltersSource,
    /EVENT_RADIUS_CHECKPOINTS = \[1, 5, 10, 25, 50, 75, 100, 150, 200\]/,
  );
  assert.match(eventFiltersSource, /export const getNextEventRadiusMiles/);
  for (const src of [eventFiltersSource, mapScreenSource, homeSource, mapContainerSource, filterModalSource]) {
    assert.doesNotMatch(src, /widenRadius|expandRadius|bumpRadius|current \* 2|currentRadius \* 2|\+ 25\b/);
  }
});

test("radius / hashtag / age semantics untouched by this batch", () => {
  assert.match(eventFiltersSource, /MIN_EVENT_RADIUS_MILES = 1/);
  assert.match(eventFiltersSource, /MAX_EVENT_RADIUS_MILES = 200/);
  assert.match(eventFiltersSource, /DEFAULT_EVENT_RADIUS_MILES = 75/);
  // summary labels are display-only additions, not matching maps.
  assert.match(eventFiltersSource, /Display-only labels for a compact "applied criteria" summary/);
});

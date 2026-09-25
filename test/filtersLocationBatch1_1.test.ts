import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_EVENT_RADIUS_MILES,
  buildEventFilterRequestParams,
  hasActiveEventFilters,
  resetEventFiltersPreservingDiscoveryCenter,
  type SharedEventFilters,
} from "../lib/eventFilters";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const filterModalSource = read("components/home/FilterModal.tsx");
const mapScreenSource = read("components/ui/MapScreen.tsx");

// ────────────────────────────────────────────────────────────
// BUG 1 — Reset → reopen must show 75, and the OUTGOING request
// must use the 75-mile equivalent (not a stale 25).
// ────────────────────────────────────────────────────────────

const appliedCurrentLocation25: SharedEventFilters = {
  ageRestriction: "21_plus",
  priceFilter: "lt_50",
  selectedDate: "2026-07-14",
  timePeriod: "evening",
  hashtags: ["music"],
  nearby: {
    latitude: 23.7806,
    longitude: 90.4074,
    radiusMiles: 25,
    label: "Current Location",
    source: "current",
  },
};

test("BUG1: Reset snapshot keeps the Current Location centre, anchor 75, radius INACTIVE", () => {
  const snapshot = resetEventFiltersPreservingDiscoveryCenter(appliedCurrentLocation25);

  assert.equal(snapshot.nearby?.source, "current");
  assert.equal(snapshot.nearby?.latitude, 23.7806);
  assert.equal(snapshot.nearby?.longitude, 90.4074);
  assert.equal(snapshot.nearby?.radiusMiles, DEFAULT_EVENT_RADIUS_MILES); // 75 anchor
  assert.equal(snapshot.nearby?.radiusEnabled, false); // Batch 2D: "Any distance"

  // Non-location criteria all cleared.
  assert.equal(snapshot.ageRestriction, undefined);
  assert.equal(snapshot.priceFilter, undefined);
  assert.equal(snapshot.selectedDate, undefined);
  assert.equal(snapshot.timePeriod, undefined);
  assert.deepEqual(snapshot.hashtags, []);
  assert.equal(snapshot.category, null);

  // Batch 2D: a discovery centre alone with radius inactive is NOT an active
  // restrictive filter, so the indicator is OFF after Reset.
  assert.equal(hasActiveEventFilters(snapshot), false);
});

test("BUG1: the applied snapshot is what FilterModal re-hydrates from → reopen shows 75", () => {
  // FilterModal's hydration reads activeFilters.nearby.radiusMiles. After Reset
  // + Apply the applied object is the snapshot itself.
  const snapshot = resetEventFiltersPreservingDiscoveryCenter(appliedCurrentLocation25);
  assert.equal(snapshot.nearby?.radiusMiles, 75);
});

test("BUG1: outgoing Event request after Reset has NO hard radius (never the stale 25, never a 75)", () => {
  const snapshot = resetEventFiltersPreservingDiscoveryCenter(appliedCurrentLocation25);
  const params = buildEventFilterRequestParams(snapshot, { limit: 100 });

  // Batch 2D: radius inactive → centre becomes ranking context only.
  assert.equal(params.latitude, undefined);
  assert.equal(params.longitude, undefined);
  assert.equal(params.radiusKm, undefined);
  assert.equal(params.rankingLatitude, 23.7806);
  assert.equal(params.rankingLongitude, 90.4074);
  // Stale criteria are gone from the request too.
  assert.equal(params.ageRestriction, undefined);
  assert.equal(params.priceFilter, undefined);
  assert.equal(params.date, undefined);
  assert.equal(params.timePeriod, undefined);
  assert.equal(params.hashtags, undefined);
});

test("BUG1: FilterModal builds the reset snapshot synchronously and Apply commits it verbatim", () => {
  // The fix must NOT depend on setRadius(75) landing before handleApply reads
  // `radius` (React state is async). Reset writes an authoritative ref, Apply
  // commits it, any later draft edit invalidates it.
  assert.match(
    filterModalSource,
    /const snapshot = resetEventFiltersPreservingDiscoveryCenter\(activeFilters\);\s*resetSnapshotRef\.current = snapshot;/,
  );
  assert.match(
    filterModalSource,
    /const resetSnapshot = resetSnapshotRef\.current;\s*if \(resetSnapshot\) \{\s*onApply\(resetSnapshot\);\s*onClose\(\);\s*return;/,
  );
  // Invalidated on every draft mutation so a post-Reset tweak still applies.
  const invalidations = filterModalSource.match(/invalidateResetSnapshot\(\)/g) ?? [];
  assert.ok(invalidations.length >= 6, `expected >=6 invalidation sites, found ${invalidations.length}`);
  // Cleared on reopen and after Apply so it never leaks across sessions.
  assert.match(filterModalSource, /resetSnapshotRef\.current = null;\s*\/\/ A fresh open supersedes/);
  assert.match(filterModalSource, /finally \{\s*resetSnapshotRef\.current = null;\s*setIsApplying\(false\);/);
});

// ────────────────────────────────────────────────────────────
// BUG 2 — location recovery must never spin forever; concurrent
// AppState / Retry / toggle / Apply checks must not race.
// ────────────────────────────────────────────────────────────

test("BUG2: FilterModal location check has a generation guard; only the newest commits", () => {
  assert.match(filterModalSource, /const locationCheckIdRef = useRef\(0\)/);
  assert.match(filterModalSource, /const requestId = \+\+locationCheckIdRef\.current;/);
  assert.match(filterModalSource, /const isCurrent = \(\) => requestId === locationCheckIdRef\.current;/);
  // Every terminal branch is gated by isCurrent().
  assert.match(filterModalSource, /if \(!isCurrent\(\)\) \{\s*return null;\s*\}/);
  assert.match(filterModalSource, /catch \{\s*if \(isCurrent\(\)\) \{\s*setLocationRecovery\('failed'\);/);
  assert.match(filterModalSource, /finally \{\s*if \(isCurrent\(\)\) \{\s*setIsCheckingLocation\(false\);/);
});

test("BUG2: FilterModal location check has an outer timeout so the spinner always settles", () => {
  assert.match(filterModalSource, /FILTER_LOCATION_CHECK_TIMEOUT_MS = 15000/);
  assert.match(
    filterModalSource,
    /Promise\.race<DeviceLocationResult>\(\[\s*getBestCurrentDeviceLocation\(\{ requestPermission: true \}\),[\s\S]*resolve\(\{ status: 'timeout' \}\), FILTER_LOCATION_CHECK_TIMEOUT_MS/,
  );
});

test("BUG2: AppState recovery does not stack concurrent checks; toggle-off cancels in-flight", () => {
  assert.match(
    filterModalSource,
    /state === 'active' &&\s*useCurrentLocation &&\s*locationRecovery &&\s*!isCheckingLocationRef\.current/,
  );
  // Turning the toggle OFF supersedes any in-flight check and clears the spinner.
  assert.match(
    filterModalSource,
    /if \(!value\) \{\s*\/\/ Cancel any in-flight check[\s\S]*locationCheckIdRef\.current \+= 1;\s*setIsCheckingLocation\(false\);/,
  );
  // Retry stays usable regardless of a stale isCheckingLocation.
  assert.match(filterModalSource, /onRetry=\{\(\) => \{\s*void runLocationCheck\(\);/);
});

test("BUG2: Map location request keeps its generation guard and gains an outer timeout", () => {
  assert.match(mapScreenSource, /MAP_LOCATION_REQUEST_TIMEOUT_MS = 15000/);
  assert.match(
    mapScreenSource,
    /Promise\.race<DeviceLocationResult>\(\[\s*getBestCurrentDeviceLocation\(\{[\s\S]*resolve\(\{ status: "timeout" \}\),\s*MAP_LOCATION_REQUEST_TIMEOUT_MS/,
  );
  // Existing race safety preserved: every commit still gated by isCurrentRequest().
  assert.match(mapScreenSource, /const requestId = \+\+locationRequestIdRef\.current;/);
  assert.match(mapScreenSource, /if \(!isCurrentRequest\(\)\) \{\s*return;\s*\}\s*if \(result\.status === "fresh"/);
  assert.match(mapScreenSource, /finally \{\s*if \(isCurrentRequest\(\)\) \{\s*isLocationRequestInFlightRef\.current = false;/);
});

// ────────────────────────────────────────────────────────────
// REGRESSION — Batch-1 wins must remain intact.
// ────────────────────────────────────────────────────────────

test("REGRESSION: non-location filters still apply with nearby = null", () => {
  const filters: SharedEventFilters = {
    ...resetEventFiltersPreservingDiscoveryCenter({
      hashtags: [],
      nearby: null,
    } as SharedEventFilters),
    priceFilter: "free",
    timePeriod: "evening",
  };
  const params = buildEventFilterRequestParams(filters, { limit: 100 });
  assert.equal(params.priceFilter, "free");
  assert.equal(params.timePeriod, "evening");
  assert.equal(params.latitude, undefined);
  assert.equal(params.longitude, undefined);
  assert.equal(params.radiusKm, undefined);
  assert.match(filterModalSource, /const isApplyDisabled = isApplying;/);
});

test("REGRESSION: Posts feed still ignores Event filters; sharing stays decoupled", () => {
  const homeSource = read("app/(tabs)/home.tsx");
  const callSlice = homeSource.slice(homeSource.indexOf("getFeedMoments({"), homeSource.indexOf("getFeedMoments({") + 120);
  assert.match(callSlice, /getFeedMoments\(\{ audience \}\)/);
  assert.doesNotMatch(filterModalSource, /useLocationSharingStore/);
  assert.doesNotMatch(filterModalSource, /api\.patch/);
});

test("Batch 2D: Reset now PRESERVES a searched ('selected') centre too, radius inactive", () => {
  const searched: SharedEventFilters = {
    hashtags: [],
    priceFilter: "free",
    nearby: {
      latitude: 40,
      longitude: -73,
      radiusMiles: 25,
      label: "New York",
      source: "selected",
    },
  };
  const snapshot = resetEventFiltersPreservingDiscoveryCenter(searched);
  assert.equal(snapshot.nearby?.source, "selected");
  assert.equal(snapshot.nearby?.label, "New York");
  assert.equal(snapshot.nearby?.radiusMiles, DEFAULT_EVENT_RADIUS_MILES);
  assert.equal(snapshot.nearby?.radiusEnabled, false);
  assert.equal(snapshot.priceFilter, undefined);
});

test("REGRESSION: slider value mapping / touch target untouched (Batch 2B only changed the label text)", () => {
  const sliderSource = read("components/home/EventRadiusSlider.tsx");
  assert.match(sliderSource, /hitSlop=\{\{ top: 20, bottom: 20, left: 12, right: 12 \}\}/);
  // Value math is unchanged — still 1 + round(percent * (200 - 1)).
  assert.match(
    sliderSource,
    /MIN_EVENT_RADIUS_MILES \+\s*Math\.round\(percent \* \(MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES\)\)/,
  );
  // The readout now delegates to the shared label helper; the "200+" / singular
  // wording lives in eventFilters.ts, not the slider.
  assert.match(sliderSource, /formatEventRadiusLabel\(liveRadius\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_EVENT_RADIUS_MILES,
  resetEventFiltersPreservingDiscoveryCenter,
  createEmptyEventFilters,
  hasActiveEventFilters,
  type SharedEventFilters,
} from "../lib/eventFilters";

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const filterModalSource = read("components/home/FilterModal.tsx");
const homeSource = read("app/(tabs)/home.tsx");
const sliderSource = read("components/home/EventRadiusSlider.tsx");
const homeHeaderSource = read("components/home/HomeHeader.tsx");
const mapScreenSource = read("components/ui/MapScreen.tsx");
const mapContainerSource = read("components/home/MapContainer.tsx");
const recoverySource = read("components/home/LocationRecoveryState.tsx");

// ── resetEventFiltersPreservingDiscoveryCenter (Reset / Clear filters) ──

test("clear preserves an active Current Location center and resets radius to 75", () => {
  const filters: SharedEventFilters = {
    ageRestriction: "21_plus",
    category: "Live Music & Concerts",
    priceFilter: "lt_50",
    selectedDate: "2026-07-14",
    timePeriod: "late_night",
    hashtags: ["music", "summer"],
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 25,
      label: "Current Location",
      source: "current",
    },
  };

  const cleared = resetEventFiltersPreservingDiscoveryCenter(filters);

  assert.equal(cleared.ageRestriction, undefined);
  assert.equal(cleared.priceFilter, undefined);
  assert.equal(cleared.selectedDate, undefined);
  assert.equal(cleared.timePeriod, undefined);
  assert.deepEqual(cleared.hashtags, []);
  assert.equal(cleared.category, null);
  assert.equal(cleared.nearby?.source, "current");
  assert.equal(cleared.nearby?.latitude, 23.7806);
  assert.equal(cleared.nearby?.longitude, 90.4074);
  assert.equal(cleared.nearby?.radiusMiles, DEFAULT_EVENT_RADIUS_MILES);
  assert.equal(cleared.nearby?.radiusEnabled, false); // Batch 2D: "Any distance"
  assert.equal(cleared.nearby?.label, "Current Location");
});

test("Batch 2D: reset PRESERVES a searched ('selected') centre too, radius inactive", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    priceFilter: "free",
    nearby: {
      latitude: 40,
      longitude: -73,
      radiusMiles: 25,
      label: "New York",
      source: "selected",
    },
  };

  const cleared = resetEventFiltersPreservingDiscoveryCenter(filters);
  assert.equal(cleared.nearby?.source, "selected");
  assert.equal(cleared.nearby?.label, "New York");
  assert.equal(cleared.nearby?.radiusMiles, DEFAULT_EVENT_RADIUS_MILES);
  assert.equal(cleared.nearby?.radiusEnabled, false);
  assert.equal(cleared.priceFilter, undefined);
});

test("clear with no center produces empty filters and inactive indicator", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    priceFilter: "free",
    timePeriod: "evening",
  };

  const cleared = resetEventFiltersPreservingDiscoveryCenter(filters);
  assert.deepEqual(cleared, createEmptyEventFilters());
  assert.equal(hasActiveEventFilters(cleared), false);
});

test("clear with an invalid nearby is treated as no center", () => {
  const filters: SharedEventFilters = {
    ...createEmptyEventFilters(),
    hashtags: ["music"],
    nearby: {
      latitude: 23.7806,
      longitude: 90.4074,
      radiusMiles: 0, // invalid radius
      label: "Current Location",
      source: "current",
    },
  };

  assert.deepEqual(
    resetEventFiltersPreservingDiscoveryCenter(filters),
    createEmptyEventFilters(),
  );
});

// ── FilterModal: Reset keeps Current Location, no global-sharing / OS mutation ──

test("FilterModal Reset builds one authoritative snapshot that keeps the discovery centre", () => {
  assert.match(
    filterModalSource,
    /resetEventFiltersPreservingDiscoveryCenter\(activeFilters\)[\s\S]*resetSnapshotRef\.current = snapshot/,
  );
  assert.match(filterModalSource, /const center = isValidEventLocationFilter\(snapshot\.nearby\)/);
  // Batch 2D: preserves current OR searched centre; distance goes inactive.
  assert.match(filterModalSource, /center\?\.source === 'current'/);
  assert.match(filterModalSource, /center\?\.source === 'selected'/);
  assert.match(filterModalSource, /setRadiusEnabled\(false\)/);
  assert.match(filterModalSource, /setUseCurrentLocation\(true\)/);
  // Apply commits the snapshot verbatim rather than re-deriving from state.
  assert.match(filterModalSource, /if \(resetSnapshot\) \{\s*onApply\(resetSnapshot\);/);
});

test("FilterModal no longer couples the Current Location toggle to global live-location sharing", () => {
  assert.doesNotMatch(filterModalSource, /useLocationSharingStore/);
  assert.doesNotMatch(filterModalSource, /useAuthStore/);
  assert.doesNotMatch(filterModalSource, /import .*enableLocationSharing|const .*enableLocationSharing/);
  assert.doesNotMatch(filterModalSource, /getCurrentLocationForSharing/);
  assert.doesNotMatch(filterModalSource, /user\?\.currentLocationSharingEnabled/);
  // Reads a foreground position without touching the global preference.
  assert.match(filterModalSource, /getBestCurrentDeviceLocation\(\{ requestPermission: true \}\)/);
});

test("FilterModal never applies a location patch or disables sharing on Reset/toggle", () => {
  // No direct profile write and no sharing-store calls (only referenced in
  // explanatory comments, never invoked).
  assert.doesNotMatch(filterModalSource, /api\.patch/);
  assert.doesNotMatch(filterModalSource, /\.disableSharing\(\)|disableLocationSharing\(\)/);
  assert.doesNotMatch(filterModalSource, /\.enableSharing\(\)|enableLocationSharing\(\)/);
});

test("FilterModal Apply no longer requires a location source", () => {
  assert.match(filterModalSource, /const isApplyDisabled = isApplying;/);
  assert.doesNotMatch(filterModalSource, /canApplyCurrentDraft/);
});

test("FilterModal renders the location recovery affordance and rechecks on app focus", () => {
  assert.match(filterModalSource, /<LocationRecoveryState/);
  assert.match(filterModalSource, /AppState\.addEventListener\('change'/);
  assert.match(filterModalSource, /runLocationCheck\(\)/);
});

// ── Home feed: ordinary Posts must ignore Event filters ──

test("home feed does not forward Event hashtag/location/radius into the Posts request", () => {
  const callStart = homeSource.indexOf("getFeedMoments({");
  assert.notEqual(callStart, -1);
  const callSlice = homeSource.slice(callStart, callStart + 200);
  assert.match(callSlice, /getFeedMoments\(\{ audience \}\)/);
  assert.doesNotMatch(callSlice, /hashtags:/);
  assert.doesNotMatch(callSlice, /latitude:/);
  assert.doesNotMatch(callSlice, /radiusKm:/);
});

test("home Clear filters uses the Current-Location-preserving helper", () => {
  assert.match(
    homeSource,
    /handleClearEventFilters[\s\S]*resetEventFiltersPreservingDiscoveryCenter\(current\)/,
  );
});

test("home passes shared clear + active-filter state to the Map", () => {
  assert.match(homeSource, /hasActiveFilters=\{hasAppliedEventFilters\}/);
  assert.match(homeSource, /onClearFilters=\{handleClearEventFilters\}/);
});

// ── Radius slider: touch target + singular grammar, math untouched ──

test("radius slider expands the touch target without changing the value mapping", () => {
  assert.match(sliderSource, /hitSlop=\{\{ top: 20, bottom: 20, left: 12, right: 12 \}\}/);
  assert.match(
    sliderSource,
    /MIN_EVENT_RADIUS_MILES \+\s*Math\.round\(percent \* \(MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES\)\)/,
  );
});

test("radius slider value uses the shared label helper (Batch 2B moved the singular/broad text there)", () => {
  const eventFiltersSource = read("lib/eventFilters.ts");
  assert.match(sliderSource, /formatEventRadiusLabel\(liveRadius\)/);
  // Singular / plural / broad wording now lives in one place.
  assert.match(eventFiltersSource, /radiusMiles === 1 \? "mile" : "miles"/);
  assert.match(eventFiltersSource, /\$\{MAX_EVENT_RADIUS_MILES\}\+ miles/);
});

test("radius slider max end label is '200+ miles' (Batch 2B broad endpoint)", () => {
  assert.match(sliderSource, /\{MAX_EVENT_RADIUS_MILES\}\+ miles/);
});

// ── Active filter indicator on the existing filter control ──

test("HomeHeader shows a minimal active-filter dot driven by hasActiveEventFilters", () => {
  assert.match(homeHeaderSource, /hasActiveEventFilters\(activeFilters\)/);
  assert.match(homeHeaderSource, /filterActiveDot/);
});

// ── Map: shared Clear filters + location recovery ──

test("MapScreen exposes a shared Clear filters affordance and a recovery banner", () => {
  assert.match(mapScreenSource, /onClearFilters\?: \(\) => void/);
  assert.match(mapScreenSource, /accessibilityLabel="Clear filters"/);
  assert.match(mapScreenSource, /<LocationRecoveryState/);
  assert.match(mapScreenSource, /deviceLocationStatus/);
  assert.match(mapScreenSource, /AppState\.addEventListener\("change"/);
});

test("MapContainer forwards the shared clear + active-filter props", () => {
  assert.match(mapContainerSource, /hasActiveFilters\?: boolean/);
  assert.match(mapContainerSource, /onClearFilters\?: \(\) => void/);
  assert.match(mapContainerSource, /hasActiveFilters=\{hasActiveFilters\}/);
  assert.match(mapContainerSource, /onClearFilters=\{onClearFilters\}/);
});

// ── LocationRecoveryState component ──

test("LocationRecoveryState renders the approved copy and actions", () => {
  assert.match(recoverySource, /Turn on location to see events near you/);
  assert.match(recoverySource, /Open Settings/);
  assert.match(recoverySource, /Retry/);
  assert.match(recoverySource, /Linking\.openSettings\(\)/);
  // Covers denied / blocked / services-disabled plus failed/timeout.
  assert.match(recoverySource, /permissionDenied/);
  assert.match(recoverySource, /permissionBlocked/);
  assert.match(recoverySource, /servicesDisabled/);
});

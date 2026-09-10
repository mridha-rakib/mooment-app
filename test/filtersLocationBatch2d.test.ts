import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_EVENT_RADIUS_MILES,
  MILES_TO_KM,
  buildEventFilterRequestParams,
  createEmptyEventFilters,
  hasActiveEventFilters,
  hasActiveRadiusFilter,
  hasBoundedRadiusFilter,
  isEventRadiusEnabled,
  resetEventFiltersPreservingDiscoveryCenter,
  summarizeEventFilters,
  type EventLocationFilter,
  type SharedEventFilters,
} from "../lib/eventFilters";
import {
  buildMapEventRequestParams,
  hasBoundedNearbyFilter,
} from "../lib/mapEventRequests";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const filterModalSource = read("components/home/FilterModal.tsx");
const sliderSource = read("components/home/EventRadiusSlider.tsx");
const homeSource = read("app/(tabs)/home.tsx");
const eventFiltersSource = read("lib/eventFilters.ts");

const NY = { latitude: 40.7128, longitude: -74.006 };

const centre = (
  over: Partial<EventLocationFilter> = {},
  extra: Partial<SharedEventFilters> = {},
): SharedEventFilters => ({
  ...createEmptyEventFilters(),
  ...extra,
  nearby: {
    latitude: NY.latitude,
    longitude: NY.longitude,
    radiusMiles: DEFAULT_EVENT_RADIUS_MILES,
    label: "New York",
    source: "selected",
    shortLabel: "New York",
    ...over,
  },
});

const VIEWPORT = { north: 41.2, south: 40.2, east: -73.5, west: -74.5, zoom: 9 };

// ── §3 / §4 radius-state helpers + legacy compatibility ────────────────────

test("§3 isEventRadiusEnabled: undefined (legacy) = ACTIVE; explicit false = inactive; null = false", () => {
  assert.equal(isEventRadiusEnabled({ radiusMiles: 25, source: "current" } as EventLocationFilter), true);
  assert.equal(isEventRadiusEnabled({ radiusMiles: 25, radiusEnabled: true } as EventLocationFilter), true);
  assert.equal(isEventRadiusEnabled({ radiusMiles: 25, radiusEnabled: false } as EventLocationFilter), false);
  assert.equal(isEventRadiusEnabled(null), false);
  assert.equal(isEventRadiusEnabled(undefined), false);
});

test("§5 three geo states are distinguished", () => {
  const inactive = centre({ radiusEnabled: false });
  const bounded = centre({ radiusMiles: 50, radiusEnabled: true });
  const broad = centre({ radiusMiles: 200, radiusEnabled: true });
  const legacy = centre({ radiusMiles: 25 }); // no radiusEnabled

  assert.equal(hasBoundedRadiusFilter(inactive), false);
  assert.equal(hasActiveRadiusFilter(inactive), false);

  assert.equal(hasBoundedRadiusFilter(bounded), true);
  assert.equal(hasActiveRadiusFilter(bounded), true);

  assert.equal(hasBoundedRadiusFilter(broad), false); // broad ≠ bounded
  assert.equal(hasActiveRadiusFilter(broad), true);

  assert.equal(hasBoundedRadiusFilter(legacy), true); // §49 legacy = active bounded
  assert.equal(hasActiveRadiusFilter(legacy), true);
});

// ── §28 / §66 active-filter dot ────────────────────────────────────────────

test("§28/§66 a discovery centre alone (Any distance) is NOT an active Event filter", () => {
  assert.equal(hasActiveEventFilters(centre({ radiusEnabled: false, source: "current" })), false);
  assert.equal(hasActiveEventFilters(centre({ radiusEnabled: false, source: "selected" })), false);

  assert.equal(hasActiveEventFilters(centre({ radiusEnabled: false }, { priceFilter: "free" })), true);
  assert.equal(hasActiveEventFilters(centre({ radiusMiles: 50, radiusEnabled: true })), true);
  assert.equal(hasActiveEventFilters(centre({ radiusMiles: 200, radiusEnabled: true })), true);
  // Legacy applied object (no radiusEnabled) stays "active".
  assert.equal(hasActiveEventFilters(centre({ radiusMiles: 25 })), true);
});

// ── §23 / §24 / §25 Reset preserves BOTH centres, distance inactive ────────

test("§23 Reset preserves a Current Location centre; distance → inactive, anchor 75", () => {
  const applied = centre(
    { radiusMiles: 25, radiusEnabled: true, source: "current", label: "Current Location" },
    { priceFilter: "free", timePeriod: "evening", hashtags: ["music"] },
  );
  const r = resetEventFiltersPreservingDiscoveryCenter(applied);

  assert.equal(r.nearby?.source, "current");
  assert.equal(r.nearby?.latitude, NY.latitude);
  assert.equal(r.nearby?.radiusMiles, DEFAULT_EVENT_RADIUS_MILES);
  assert.equal(r.nearby?.radiusEnabled, false);
  assert.equal(r.priceFilter, undefined);
  assert.equal(r.timePeriod, undefined);
  assert.deepEqual(r.hashtags, []);
  assert.equal(hasActiveEventFilters(r), false);
});

test("§24 Reset preserves a searched ('selected') centre — approved, no revert to Current Location", () => {
  const applied = centre({ radiusMiles: 50, radiusEnabled: true }, { priceFilter: "free" });
  const r = resetEventFiltersPreservingDiscoveryCenter(applied);

  assert.equal(r.nearby?.source, "selected");
  assert.equal(r.nearby?.label, "New York");
  assert.equal(r.nearby?.shortLabel, "New York");
  assert.equal(r.nearby?.radiusMiles, DEFAULT_EVENT_RADIUS_MILES);
  assert.equal(r.nearby?.radiusEnabled, false);
  assert.equal(r.priceFilter, undefined);
});

test("Reset with no centre → fully empty filters", () => {
  assert.deepEqual(
    resetEventFiltersPreservingDiscoveryCenter({ ...createEmptyEventFilters(), priceFilter: "free" }),
    createEmptyEventFilters(),
  );
});

test("§26 Feed/Map Clear filters use the SAME reset helper", () => {
  assert.match(homeSource, /handleClearEventFilters[\s\S]*resetEventFiltersPreservingDiscoveryCenter\(current\)/);
});

// ── §29 active-criteria summary ───────────────────────────────────────────

test("§29 summary shows the centre even when radius is inactive ('Any distance')", () => {
  assert.equal(
    summarizeEventFilters(centre({ radiusEnabled: false, source: "current", label: "Current Location" })),
    "Any distance · Current Location",
  );
  assert.equal(
    summarizeEventFilters(centre({ radiusEnabled: false })),
    "Any distance · New York",
  );
  assert.equal(
    summarizeEventFilters(
      centre({ radiusMiles: 50, radiusEnabled: true }, { priceFilter: "free", timePeriod: "evening", hashtags: ["music"] }),
    ),
    "Free · Evening · #music · 50 mi · New York",
  );
  assert.equal(
    summarizeEventFilters(centre({ radiusMiles: 200, radiusEnabled: true, source: "current", label: "Current Location" })),
    "200+ mi · Current Location",
  );
});

// ── §9 / §10 / §11 / §12 / §51 Feed request shaping ───────────────────────

test("§9/§10/§51 radius INACTIVE (anchor 75) emits ranking context only — NO hidden 75-mile filter", () => {
  const p = buildEventFilterRequestParams(centre({ radiusMiles: DEFAULT_EVENT_RADIUS_MILES, radiusEnabled: false }));
  assert.equal(p.latitude, undefined);
  assert.equal(p.longitude, undefined);
  assert.equal(p.radiusKm, undefined); // the internal 75 anchor never leaks
  assert.equal(p.rankingLatitude, NY.latitude);
  assert.equal(p.rankingLongitude, NY.longitude);
});

test("§11 radius ACTIVE bounded (1–199) is the unchanged circular request", () => {
  const p = buildEventFilterRequestParams(centre({ radiusMiles: 50, radiusEnabled: true }));
  assert.equal(p.latitude, NY.latitude);
  assert.equal(p.longitude, NY.longitude);
  assert.ok(Math.abs((p.radiusKm ?? 0) - 50 * MILES_TO_KM) < 1e-9);
  assert.equal(p.rankingLatitude, undefined);
});

test("§12 radius ACTIVE broad (200) keeps Batch-2B semantics (ranking only)", () => {
  const p = buildEventFilterRequestParams(centre({ radiusMiles: 200, radiusEnabled: true }));
  assert.equal(p.latitude, undefined);
  assert.equal(p.radiusKm, undefined);
  assert.equal(p.rankingLatitude, NY.latitude);
});

test("§49 legacy nearby (no radiusEnabled) still emits the bounded circular request", () => {
  const p = buildEventFilterRequestParams(centre({ radiusMiles: 25 }));
  assert.ok(Math.abs((p.radiusKm ?? 0) - 25 * MILES_TO_KM) < 1e-9);
  assert.equal(p.latitude, NY.latitude);
});

// ── §13 / §14 / §15 / §52 / §53 Map request shaping ──────────────────────

test("§13/§52/§53 radius INACTIVE → Map viewport path, no circular params", () => {
  const inactive = centre({ radiusEnabled: false });
  assert.equal(hasBoundedNearbyFilter(inactive), false);
  const p = buildMapEventRequestParams(inactive, VIEWPORT, 100);
  assert.equal(p?.latitude, undefined);
  assert.equal(p?.radiusKm, undefined);
  assert.equal(typeof p?.north, "number");
});

test("§14 radius ACTIVE bounded → Map circular nearby request (unchanged)", () => {
  const bounded = centre({ radiusMiles: 50, radiusEnabled: true });
  assert.equal(hasBoundedNearbyFilter(bounded), true);
  const p = buildMapEventRequestParams(bounded, VIEWPORT, 100);
  assert.equal(p?.latitude, NY.latitude);
  assert.ok((p?.radiusKm ?? 0) > 0);
  assert.equal(p?.north, undefined);
});

test("§15 radius ACTIVE broad → Map viewport (Batch-2B), no 200-mile circle", () => {
  const broad = centre({ radiusMiles: 200, radiusEnabled: true });
  assert.equal(hasBoundedNearbyFilter(broad), false);
  const p = buildMapEventRequestParams(broad, VIEWPORT, 100);
  assert.equal(p?.radiusKm, undefined);
  assert.equal(typeof p?.north, "number");
});

// ── §17–§21 slider / FilterModal draft wiring ─────────────────────────────

test("§17/§18/§20 slider gains enabled / onActivate / onClear; shows 'Any distance' when off", () => {
  assert.match(sliderSource, /enabled: boolean;/);
  assert.match(sliderSource, /onActivate: \(\) => void;/);
  assert.match(sliderSource, /onClear\?: \(\) => void;/);
  assert.match(sliderSource, /enabled \? formatEventRadiusLabel\(liveRadius\) : 'Any distance'/);
  // First intentional touch activates — same gesture continues (no confirm tap).
  assert.match(
    sliderSource,
    /onPanResponderGrant: \(evt\) => \{\s*[\s\S]*if \(!enabledRef\.current\) \{\s*onActivateRef\.current\(\);\s*\}\s*updateLiveRadius\(evt\.nativeEvent\.locationX\);/,
  );
  // Radius-only clear affordance.
  assert.match(sliderSource, /accessibilityLabel="Clear distance filter"/);
});

test("§47 activating at the anchor without value movement fires no checkpoint haptic", () => {
  // The haptic is still gated by an actual value change.
  assert.match(
    sliderSource,
    /if \(normalized !== liveRadiusRef\.current\) \{\s*[\s\S]*crossesMajorRadiusCheckpoint\(liveRadiusRef\.current, normalized\)/,
  );
});

test("§46/§23 slider visuals + 1-mile mapping + checkpoint haptic list unchanged", () => {
  assert.match(sliderSource, /height: 4,/); // track
  assert.match(sliderSource, /width: 14,\s*height: 14,/); // thumb
  assert.match(sliderSource, /hitSlop=\{\{ top: 20, bottom: 20, left: 12, right: 12 \}\}/);
  assert.match(
    sliderSource,
    /MIN_EVENT_RADIUS_MILES \+\s*Math\.round\(percent \* \(MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES\)\)/,
  );
  assert.match(eventFiltersSource, /MAJOR_RADIUS_HAPTIC_CHECKPOINTS = \[5, 10, 25, 50, 75, 100, 150, 200\]/);
});

test("§18/§19/§49/§50 FilterModal draft: radiusEnabled state, hydration, activate + radius-only clear", () => {
  assert.match(filterModalSource, /const \[radiusEnabled, setRadiusEnabled\] = useState\(false\)/);
  // Hydration: legacy = active, explicit false = "Any distance".
  assert.match(filterModalSource, /setRadiusEnabled\(isEventRadiusEnabled\(activeFilters\.nearby\)\)/);
  // Draft-only activate / clear helpers (no fetch / commit / GPS).
  assert.match(filterModalSource, /const handleActivateRadius = useCallback\(\(\) => \{\s*invalidateResetSnapshot\(\);\s*setRadiusEnabled\(true\);/);
  assert.match(
    filterModalSource,
    /const handleClearRadiusDraft = useCallback\(\(\) => \{\s*invalidateResetSnapshot\(\);\s*setRadiusEnabled\(false\);\s*setRadius\(DEFAULT_EVENT_RADIUS_MILES\);/,
  );
  // Apply carries radiusEnabled onto both centre kinds (current + searched).
  assert.match(filterModalSource, /source: 'current',\s*radiusEnabled,/);
  assert.match(filterModalSource, /source: 'selected',\s*shortLabel:[^\n]*\n\s*radiusEnabled,/);
  // Nothing committed / fetched / GPS-read from the draft helpers.
  const draftBlock = filterModalSource.slice(
    filterModalSource.indexOf("const handleActivateRadius"),
    filterModalSource.indexOf("const clearSelectedLocationDraft"),
  );
  assert.doesNotMatch(draftBlock, /onApply|getFeedEvents|getBestCurrentDeviceLocation|api\.patch|runLocationCheck/);
});

// ── §31 Increase-radius respects radiusEnabled ───────────────────────────

test("§31 Increase radius is gated on an ACTIVE radius (hidden at 'Any distance')", () => {
  assert.match(
    homeSource,
    /canIncreaseEventRadius = useMemo\([\s\S]*isEventRadiusEnabled\(appliedEventFilters\.nearby\)/,
  );
  assert.match(homeSource, /!isEventRadiusEnabled\(nearby\)[\s\S]*no active radius to widen/);
});

// ── §69 Posts isolation unchanged ────────────────────────────────────────

test("§69 ordinary Posts still get getFeedMoments({ audience }) — no age / hashtag / radius / centre", () => {
  const callSlice = homeSource.slice(homeSource.indexOf("getFeedMoments({"), homeSource.indexOf("getFeedMoments({") + 120);
  assert.match(callSlice, /getFeedMoments\(\{ audience \}\)/);
});

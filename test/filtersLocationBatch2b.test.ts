import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  DEFAULT_EVENT_RADIUS_MILES,
  MAX_EVENT_RADIUS_MILES,
  MILES_TO_KM,
  MIN_EVENT_RADIUS_MILES,
  buildEventFilterRequestParams,
  resetEventFiltersPreservingDiscoveryCenter,
  createEmptyEventFilters,
  formatEventRadiusLabel,
  isBroadEventRadius,
  summarizeEventFilters,
  type SharedEventFilters,
} from "../lib/eventFilters";
import {
  buildMapEventRequestParams,
  getMapViewportPageBudget,
  hasBoundedNearbyFilter,
} from "../lib/mapEventRequests";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const sliderSource = read("components/home/EventRadiusSlider.tsx");
const mapContainerSource = read("components/home/MapContainer.tsx");
const homeSource = read("app/(tabs)/home.tsx");
const eventFiltersSource = read("lib/eventFilters.ts");

const NY = { latitude: 40.7128, longitude: -74.006 };
const DHAKA = { latitude: 23.8103, longitude: 90.4125 };

const nearby = (radiusMiles: number, source: "current" | "selected" = "selected", coords = NY): SharedEventFilters => ({
  ...createEmptyEventFilters(),
  nearby: {
    latitude: coords.latitude,
    longitude: coords.longitude,
    radiusMiles,
    label: source === "current" ? "Current Location" : "New York",
    source,
    ...(source === "selected" ? { shortLabel: "New York" } : {}),
  },
});

const VIEWPORT = { north: 41.2, south: 40.2, east: -73.5, west: -74.5, zoom: 9 };

// ── isBroadEventRadius / slider constants unchanged ──────────────────────────

test("200 endpoint is the internal broad sentinel; MIN/MAX/DEFAULT unchanged", () => {
  assert.equal(MIN_EVENT_RADIUS_MILES, 1);
  assert.equal(MAX_EVENT_RADIUS_MILES, 200); // NOT raised
  assert.equal(DEFAULT_EVENT_RADIUS_MILES, 75);

  assert.equal(isBroadEventRadius(1), false);
  assert.equal(isBroadEventRadius(75), false);
  assert.equal(isBroadEventRadius(199), false);
  assert.equal(isBroadEventRadius(200), true);
  assert.equal(isBroadEventRadius(199.999), false);
});

// ── §18/§39 labels ──────────────────────────────────────────────────────────

test("§39 radius labels: 1 mile / 75 miles / 199 miles / 200+ miles", () => {
  assert.equal(formatEventRadiusLabel(1), "1 mile");
  assert.equal(formatEventRadiusLabel(2), "2 miles");
  assert.equal(formatEventRadiusLabel(75), "75 miles");
  assert.equal(formatEventRadiusLabel(199), "199 miles");
  assert.equal(formatEventRadiusLabel(200), "200+ miles");
});

test("§17 slider axis max label + live readout show 200+ (no other slider change)", () => {
  assert.match(sliderSource, /\{MAX_EVENT_RADIUS_MILES\}\+ miles/); // axis label
  assert.match(sliderSource, /formatEventRadiusLabel\(liveRadius\)/); // live readout
  // Value mapping + touch target untouched.
  assert.match(
    sliderSource,
    /MIN_EVENT_RADIUS_MILES \+\s*Math\.round\(percent \* \(MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES\)\)/,
  );
  assert.match(sliderSource, /hitSlop=\{\{ top: 20, bottom: 20, left: 12, right: 12 \}\}/);
});

// ── §19 active-criteria summary ─────────────────────────────────────────────

test("§19 summary shows '200+ mi' at broad, '25 mi' when bounded — order/layout unchanged", () => {
  assert.equal(
    summarizeEventFilters(nearby(200, "current")),
    "200+ mi · Current Location",
  );
  assert.equal(
    summarizeEventFilters(nearby(25, "selected")),
    "25 mi · New York",
  );
  assert.equal(
    summarizeEventFilters(nearby(200, "selected")),
    "200+ mi · New York",
  );
});

// ── §6 / §7 / §33 Feed request shape ───────────────────────────────────────

test("§6 bounded Feed request (1–199) is byte-for-byte the old shape", () => {
  for (const miles of [1, 25, 75, 150, 199]) {
    const p = buildEventFilterRequestParams(nearby(miles, "selected"));
    assert.equal(p.latitude, NY.latitude);
    assert.equal(p.longitude, NY.longitude);
    assert.ok(Math.abs((p.radiusKm ?? 0) - miles * MILES_TO_KM) < 1e-9);
    assert.equal(p.rankingLatitude, undefined);
    assert.equal(p.rankingLongitude, undefined);
  }
});

test("§7 broad Feed request has NO latitude/longitude/radiusKm — only ranking context", () => {
  const p = buildEventFilterRequestParams(nearby(200, "selected"));
  assert.equal(p.latitude, undefined);
  assert.equal(p.longitude, undefined);
  assert.equal(p.radiusKm, undefined);
  assert.equal(p.north, undefined);
  assert.equal(p.rankingLatitude, NY.latitude);
  assert.equal(p.rankingLongitude, NY.longitude);
});

test("§10 broad Feed with Current Location: ranking = device coords, still no cutoff", () => {
  const p = buildEventFilterRequestParams(nearby(200, "current", DHAKA));
  assert.equal(p.latitude, undefined);
  assert.equal(p.radiusKm, undefined);
  assert.equal(p.rankingLatitude, DHAKA.latitude);
  assert.equal(p.rankingLongitude, DHAKA.longitude);
});

test("§33 199→200 boundary flips bounded → broad in the request", () => {
  const bounded = buildEventFilterRequestParams(nearby(199, "selected"));
  const broad = buildEventFilterRequestParams(nearby(200, "selected"));
  assert.ok((bounded.radiusKm ?? 0) > 0); // 199 → hard radius
  assert.equal(broad.radiusKm, undefined); // 200 → no hard radius
});

test("§22 non-location filters unaffected: nearby=null still emits no geo/ranking coords", () => {
  const p = buildEventFilterRequestParams({
    ...createEmptyEventFilters(),
    priceFilter: "free",
    timePeriod: "evening",
  });
  assert.equal(p.latitude, undefined);
  assert.equal(p.radiusKm, undefined);
  assert.equal(p.rankingLatitude, undefined);
  assert.equal(p.priceFilter, "free");
  assert.equal(p.timePeriod, "evening");
});

test("home feed request lets a broad discovery centre's ranking coords win over passive GPS", () => {
  // rankingLocation (passive) is spread first, params last → params' broad
  // rankingLatitude/Longitude take precedence.
  assert.match(homeSource, /getFeedEvents\(\{ \.\.\.rankingLocation, \.\.\.eventRequestParams \}\)/);
  assert.match(homeSource, /\.\.\.rankingLocation,\s*\.\.\.buildEventFilterRequestParams\(/);
});

// ── §11 / §12 / §37 / §38 Map request shape ────────────────────────────────

test("hasBoundedNearbyFilter: true for 1–199 centre, false for broad, false for none", () => {
  assert.equal(hasBoundedNearbyFilter(nearby(75, "current")), true);
  assert.equal(hasBoundedNearbyFilter(nearby(199, "selected")), true);
  assert.equal(hasBoundedNearbyFilter(nearby(200, "current")), false);
  assert.equal(hasBoundedNearbyFilter(createEmptyEventFilters()), false);
});

test("§12 bounded Map = circular nearby request (unchanged)", () => {
  const p = buildMapEventRequestParams(nearby(75, "current", DHAKA), VIEWPORT, 100);
  assert.equal(p?.latitude, DHAKA.latitude);
  assert.equal(p?.longitude, DHAKA.longitude);
  assert.ok(Math.abs((p?.radiusKm ?? 0) - 75 * MILES_TO_KM) < 1e-9);
  assert.equal(p?.north, undefined); // circular mode ignores viewport
});

test("§11/§12/§37 broad Map = viewport request: north/south/east/west, NO latitude/longitude/radiusKm", () => {
  const p = buildMapEventRequestParams(nearby(200, "current"), VIEWPORT, 100);
  assert.ok(p, "broad map with a viewport must produce a request");
  assert.equal(p?.latitude, undefined);
  assert.equal(p?.longitude, undefined);
  assert.equal(p?.radiusKm, undefined); // no circular cutoff, and no `?? 50`
  assert.equal(typeof p?.north, "number");
  assert.equal(typeof p?.south, "number");
  assert.equal(typeof p?.east, "number");
  assert.equal(typeof p?.west, "number");
});

test("§12 broad Map with no viewport yet → no request (never a circular fallback)", () => {
  assert.equal(buildMapEventRequestParams(nearby(200, "current"), null, 100), null);
});

test("§13 broad Map viewport still gets the zoom-based page budget (goes through viewport path)", () => {
  const lowZoom = { ...VIEWPORT, north: 70, south: -70, west: -180, east: 180, zoom: 2 };
  // bounded centre → nearby mode → no budget
  assert.equal(getMapViewportPageBudget(nearby(75, "current"), lowZoom), null);
  // broad centre → viewport mode → bounded page budget applies
  assert.equal(getMapViewportPageBudget(nearby(200, "current"), lowZoom), 1);
  // no centre → viewport mode → bounded page budget applies
  assert.equal(getMapViewportPageBudget(createEmptyEventFilters(), lowZoom), 1);
});

test("MapContainer routes broad through the viewport branch (not the circular one)", () => {
  assert.match(
    mapContainerSource,
    /const requestViewport = hasBoundedNearbyFilter\(eventFilters\) \? null : debouncedViewport;/,
  );
});

// ── §20 / §21 / §40 Reset & Clear from broad ────────────────────────────────

test("§20/§40 Reset from broad Current Location → centre kept, distance INACTIVE (Batch 2D)", () => {
  const cleared = resetEventFiltersPreservingDiscoveryCenter(nearby(200, "current", DHAKA));
  assert.equal(cleared.nearby?.source, "current");
  assert.equal(cleared.nearby?.latitude, DHAKA.latitude);
  assert.equal(cleared.nearby?.radiusMiles, DEFAULT_EVENT_RADIUS_MILES); // 75 anchor
  assert.equal(cleared.nearby?.radiusEnabled, false);

  // The follow-up request has NO hard radius (not broad, not a bounded 75) —
  // just the centre as ranking context.
  const p = buildEventFilterRequestParams(cleared);
  assert.equal(p.radiusKm, undefined);
  assert.equal(p.latitude, undefined);
  assert.equal(p.rankingLatitude, DHAKA.latitude);
});

test("§21 Clear-from-broad uses the same helper and PRESERVES a searched centre (Batch 2D)", () => {
  const searchedBroad = resetEventFiltersPreservingDiscoveryCenter(nearby(200, "selected"));
  assert.equal(searchedBroad.nearby?.source, "selected");
  assert.equal(searchedBroad.nearby?.radiusEnabled, false);
  assert.match(homeSource, /resetEventFiltersPreservingDiscoveryCenter\(current\)/);
});

// ── non-regression ─────────────────────────────────────────────────────────

test("bounded map/feed conversion constants untouched; MAX not raised", () => {
  assert.match(eventFiltersSource, /MAX_EVENT_RADIUS_MILES = 200;/);
  assert.match(eventFiltersSource, /MILES_TO_KM = 1\.609344;/);
  assert.doesNotMatch(eventFiltersSource, /MAX_EVENT_RADIUS_MILES = (201|500|1000|Infinity)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  EVENT_RADIUS_CHECKPOINTS,
  MAX_EVENT_RADIUS_MILES,
  MILES_TO_KM,
  buildEventFilterRequestParams,
  createEmptyEventFilters,
  crossesMajorRadiusCheckpoint,
  getNextEventRadiusMiles,
  isBroadEventRadius,
  isValidEventLocationFilter,
  summarizeEventFilters,
  type SharedEventFilters,
} from "../lib/eventFilters";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const sliderSource = read("components/home/EventRadiusSlider.tsx");
const homeSource = read("app/(tabs)/home.tsx");
const mapContainerSource = read("components/home/MapContainer.tsx");
const mapScreenSource = read("components/ui/MapScreen.tsx");

const centre = (radiusMiles: number, source: "current" | "selected" = "current"): SharedEventFilters => ({
  ...createEmptyEventFilters(),
  priceFilter: "free",
  timePeriod: "evening",
  hashtags: ["music"],
  nearby: {
    latitude: 40.7128,
    longitude: -74.006,
    radiusMiles,
    label: source === "current" ? "Current Location" : "New York",
    source,
    ...(source === "selected" ? { shortLabel: "New York" } : {}),
  },
});

// Mirrors HomeFeed.handleIncreaseEventRadius' core transform (radius-only).
const applyIncrease = (filters: SharedEventFilters): SharedEventFilters => {
  const nearby = filters.nearby;
  if (!isValidEventLocationFilter(nearby) || isBroadEventRadius(nearby.radiusMiles)) {
    return filters;
  }
  const next = getNextEventRadiusMiles(nearby.radiusMiles);
  if (next <= nearby.radiusMiles) {
    return filters;
  }
  return { ...filters, nearby: { ...nearby, radiusMiles: next } };
};

// ── §35 canonical next-radius helper ────────────────────────────────────────

test("§35 getNextEventRadiusMiles walks the LOCKED checkpoint table exactly", () => {
  assert.deepEqual([...EVENT_RADIUS_CHECKPOINTS], [1, 5, 10, 25, 50, 75, 100, 150, 200]);

  assert.equal(getNextEventRadiusMiles(1), 5);
  assert.equal(getNextEventRadiusMiles(5), 10);
  assert.equal(getNextEventRadiusMiles(10), 25);
  assert.equal(getNextEventRadiusMiles(25), 50);
  assert.equal(getNextEventRadiusMiles(50), 75);
  assert.equal(getNextEventRadiusMiles(75), 100);
  assert.equal(getNextEventRadiusMiles(100), 150);
  assert.equal(getNextEventRadiusMiles(150), 200);
  assert.equal(getNextEventRadiusMiles(200), 200); // §3 — no next beyond broad
});

test("§35 intermediate values jump to the next checkpoint strictly greater", () => {
  assert.equal(getNextEventRadiusMiles(2), 5);
  assert.equal(getNextEventRadiusMiles(9), 10);
  assert.equal(getNextEventRadiusMiles(11), 25);
  assert.equal(getNextEventRadiusMiles(49), 50);
  assert.equal(getNextEventRadiusMiles(76), 100);
  assert.equal(getNextEventRadiusMiles(149), 150);
  assert.equal(getNextEventRadiusMiles(199), 200);
});

test("§3 getNextEventRadiusMiles never invents 201 / Infinity / >200; clamps junk via normalization", () => {
  assert.equal(getNextEventRadiusMiles(250), MAX_EVENT_RADIUS_MILES); // clamps to 200, no next
  assert.equal(getNextEventRadiusMiles(0), 5); // normalizeEventRadiusMiles(0) === 1 → next is 5
  // Non-finite input normalizes to the default (75) → next checkpoint 100.
  assert.equal(getNextEventRadiusMiles(Number.POSITIVE_INFINITY), 100);
  assert.equal(getNextEventRadiusMiles(Number.NaN), 100);
  const result = getNextEventRadiusMiles(199);
  assert.ok(result <= MAX_EVENT_RADIUS_MILES && result === 200);
});

// ── §36 / §37 / §7 / §8 apply behaviour (radius only) ──────────────────────

test("§36 Increase from Current Location: only radius advances; centre + other criteria kept", () => {
  const before = centre(25, "current");
  const after = applyIncrease(before);

  assert.equal(after.nearby?.radiusMiles, 50);
  assert.equal(after.nearby?.source, "current");
  assert.equal(after.nearby?.latitude, before.nearby?.latitude); // coords unchanged (no GPS re-read)
  assert.equal(after.nearby?.longitude, before.nearby?.longitude);
  assert.equal(after.priceFilter, "free");
  assert.equal(after.timePeriod, "evening");
  assert.deepEqual(after.hashtags, ["music"]);
});

test("§37 Increase with a searched centre: place kept, still 'selected', radius advances", () => {
  const before = centre(50, "selected");
  const after = applyIncrease(before);

  assert.equal(after.nearby?.radiusMiles, 75);
  assert.equal(after.nearby?.source, "selected");
  assert.equal(after.nearby?.label, "New York");
  assert.equal(after.nearby?.shortLabel, "New York");
  assert.equal(after.nearby?.latitude, before.nearby?.latitude);
});

test("§15 the active summary reflects the widened radius via the existing helper", () => {
  assert.equal(
    summarizeEventFilters(centre(25, "current")),
    "Free · Evening · #music · 25 mi · Current Location",
  );
  assert.equal(
    summarizeEventFilters(applyIncrease(centre(25, "current"))),
    "Free · Evening · #music · 50 mi · Current Location",
  );
});

// ── §12 / §38 / §39 150 → 200+ transition ─────────────────────────────────

test("§38 Increase is not offered once the centre is at the broad max", () => {
  const canIncrease = (f: SharedEventFilters) =>
    isValidEventLocationFilter(f.nearby) && !isBroadEventRadius(f.nearby.radiusMiles);

  assert.equal(canIncrease(centre(199, "current")), true);
  assert.equal(canIncrease(centre(200, "current")), false); // 200+ → hidden
  assert.equal(canIncrease(createEmptyEventFilters()), false); // no centre → hidden
});

test("§39 Increase 150 → 200 flips the request to Batch-2B broad semantics", () => {
  const broadened = applyIncrease(centre(150, "current"));
  assert.equal(broadened.nearby?.radiusMiles, 200);
  assert.equal(isBroadEventRadius(broadened.nearby!.radiusMiles), true);

  const feed = buildEventFilterRequestParams(broadened);
  assert.equal(feed.latitude, undefined);
  assert.equal(feed.longitude, undefined);
  assert.equal(feed.radiusKm, undefined); // NOT 321.8688 km
  assert.equal(feed.rankingLatitude, broadened.nearby?.latitude);
  assert.equal(feed.rankingLongitude, broadened.nearby?.longitude);
});

test("bounded steps still convert to km normally (25 → 50 → 75)", () => {
  let f = centre(25, "current");
  f = applyIncrease(f);
  assert.ok(Math.abs((buildEventFilterRequestParams(f).radiusKm ?? 0) - 50 * MILES_TO_KM) < 1e-9);
  f = applyIncrease(f);
  assert.ok(Math.abs((buildEventFilterRequestParams(f).radiusKm ?? 0) - 75 * MILES_TO_KM) < 1e-9);
});

// ── §42 / §43 haptic checkpoint logic ──────────────────────────────────────

test("§42 crossesMajorRadiusCheckpoint fires on entering / passing a major checkpoint", () => {
  assert.equal(crossesMajorRadiusCheckpoint(24, 25), true);
  assert.equal(crossesMajorRadiusCheckpoint(25, 26), false);
  assert.equal(crossesMajorRadiusCheckpoint(26, 25), true);
  assert.equal(crossesMajorRadiusCheckpoint(49, 50), true);
  assert.equal(crossesMajorRadiusCheckpoint(74, 75), true);
  assert.equal(crossesMajorRadiusCheckpoint(149, 150), true);
  assert.equal(crossesMajorRadiusCheckpoint(199, 200), true);
  assert.equal(crossesMajorRadiusCheckpoint(31, 32), false);
  assert.equal(crossesMajorRadiusCheckpoint(25, 24), false); // merely leaving a checkpoint
  assert.equal(crossesMajorRadiusCheckpoint(1, 2), false); // 1 is not a haptic checkpoint
  assert.equal(crossesMajorRadiusCheckpoint(50, 50), false); // no movement
});

test("§43 a large flick that skips several checkpoints still reports a single crossing", () => {
  // The slider fires at most ONE tapFeedback() per update regardless.
  assert.equal(crossesMajorRadiusCheckpoint(20, 52), true); // crossed 25 and 50
  assert.equal(crossesMajorRadiusCheckpoint(1, 200), true); // crossed all of them
});

// ── slider wiring: local-only, fire-and-forget, visuals unchanged ──────────

test("§17/§20/§21 slider fires the existing light tapFeedback, locally, without awaiting", () => {
  assert.match(sliderSource, /import \{ tapFeedback \} from '@\/lib\/microFeedback';/);
  assert.match(
    sliderSource,
    /if \(crossesMajorRadiusCheckpoint\(liveRadiusRef\.current, normalized\)\) \{\s*tapFeedback\(\);/,
  );
  // No await on the haptic; it sits inside updateLiveRadius (a local ref/state
  // update), never inside commit.
  assert.doesNotMatch(sliderSource, /await tapFeedback/);
});

test("§23/§24/§44 slider drag stays local — no commit / fetch / recenter on move or checkpoint", () => {
  const updateBlock = sliderSource.slice(
    sliderSource.indexOf("const updateLiveRadius"),
    sliderSource.indexOf("const commitLiveRadius"),
  );
  assert.doesNotMatch(updateBlock, /onChangeCommitted|fetch|getFeedEvents|recenter|getCurrentLocation/);
  // Commit still happens only on release / terminate.
  assert.match(sliderSource, /onPanResponderRelease: \(\) => commitLiveRadius\(\)/);
  assert.match(sliderSource, /onPanResponderTerminate: \(\) => commitLiveRadius\(\)/);
});

test("§25/§26 slider visuals + 1-mile mapping + labels unchanged", () => {
  assert.match(sliderSource, /height: 4,/); // track
  assert.match(sliderSource, /width: 14,\s*height: 14,/); // thumb
  assert.match(sliderSource, /hitSlop=\{\{ top: 20, bottom: 20, left: 12, right: 12 \}\}/);
  assert.match(
    sliderSource,
    /MIN_EVENT_RADIUS_MILES \+\s*Math\.round\(percent \* \(MAX_EVENT_RADIUS_MILES - MIN_EVENT_RADIUS_MILES\)\)/,
  );
  assert.match(sliderSource, /formatEventRadiusLabel\(liveRadius\)/);
  assert.match(sliderSource, /\{MAX_EVENT_RADIUS_MILES\}\+ miles/);
});

// ── §6 / §10 / §22 / §40 / §41 Increase-radius action wiring ───────────────

test("§6 Feed no-match renders an existing-style 'Increase radius' action, gated + double-tap-safe", () => {
  assert.match(homeSource, /accessibilityLabel="Increase radius"/);
  assert.match(homeSource, /onPress=\{handleIncreaseEventRadius\}/);
  assert.match(homeSource, /disabled=\{isEventFilterLoading\}/);
  // Only inside the settled zero-match state, only with a valid non-broad centre.
  assert.match(
    homeSource,
    /showEventFilterEmptyState \? \(\s*<>[\s\S]*canIncreaseEventRadius \?/,
  );
  assert.match(
    homeSource,
    /canIncreaseEventRadius = useMemo\(\s*\(\) =>\s*isValidEventLocationFilter\(appliedEventFilters\.nearby\) &&\s*isEventRadiusEnabled\(appliedEventFilters\.nearby\) &&\s*!isBroadEventRadius/,
  );
  // Reuses the existing small-action style.
  assert.match(homeSource, /styles\.clearEventFiltersButton, styles\.increaseRadiusButton/);
  // Copy unchanged.
  assert.match(homeSource, /No events match these filters nearby/);
});

test("§6/§8/§9 handleIncreaseEventRadius changes ONLY radius, via the shared commit path", () => {
  const fn = homeSource.slice(
    homeSource.indexOf("const handleIncreaseEventRadius"),
    homeSource.indexOf("const handleMapFilterRecenterHandled"),
  );
  assert.match(fn, /if \(isEventFilterLoadingRef\.current\) \{\s*return;/); // double-tap guard
  assert.match(fn, /isBroadEventRadius\(nearby\.radiusMiles\)/); // stop at broad
  assert.match(fn, /getNextEventRadiusMiles\(nearby\.radiusMiles\)/);
  assert.match(fn, /handleFilterChange\(\{\s*\.\.\.appliedEventFiltersRef\.current,\s*nearby: \{ \.\.\.nearby, radiusMiles: nextRadius \}/);
  // No location acquisition, no global-sharing mutation, no extra haptic.
  assert.doesNotMatch(fn, /getBestCurrentDeviceLocation|getCurrentLocationForSharing|enableSharing|disableSharing|api\.patch|tapFeedback/);
});

test("§10/§40 Map uses the SAME handler — no Map-local radius state", () => {
  assert.match(homeSource, /onIncreaseRadius=\{handleIncreaseEventRadius\}/);
  assert.match(homeSource, /canIncreaseRadius=\{canIncreaseEventRadius\}/);
  assert.match(mapContainerSource, /canIncreaseRadius\?: boolean/);
  assert.match(mapContainerSource, /onIncreaseRadius\?: \(\) => void/);
  assert.match(mapContainerSource, /onIncreaseRadius=\{onIncreaseRadius\}/);
  assert.match(mapScreenSource, /accessibilityLabel="Increase radius"/);
  assert.match(
    mapScreenSource,
    /\{showNoEventMatches && canIncreaseRadius && onIncreaseRadius \?/,
  );
  assert.doesNotMatch(mapScreenSource, /useState.*[Rr]adius|setRadius/);
});

test("§13 Increase and Clear stay separate actions (Increase never routes through Clear logic)", () => {
  const fn = homeSource.slice(
    homeSource.indexOf("const handleIncreaseEventRadius"),
    homeSource.indexOf("const handleMapFilterRecenterHandled"),
  );
  assert.doesNotMatch(fn, /clearEventFiltersPreservingCurrentLocation|handleClearEventFilters|createEmptyEventFilters/);
});

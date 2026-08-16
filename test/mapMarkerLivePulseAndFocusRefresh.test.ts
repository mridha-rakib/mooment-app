import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getCategoryMarkerColor } from "../constants/categoryColors";

const mapScreenSource = readFileSync(
  join(process.cwd(), "components/ui/MapScreen.tsx"),
  "utf8",
);
const mapContainerSource = readFileSync(
  join(process.cwd(), "components/home/MapContainer.tsx"),
  "utf8",
);
const mapMarkerGlowSource = readFileSync(
  join(process.cwd(), "constants/mapMarkerGlow.ts"),
  "utf8",
);

const countOccurrences = (source: string, pattern: RegExp) => (source.match(pattern) ?? []).length;

// ── A. Category glow color behavior (must remain unchanged) ────────────────

test("selected category overrides the glow color when the event has that category", () => {
  const color = getCategoryMarkerColor({
    category: "Parties & Celebrations",
    categories: ["Parties & Celebrations", "Nightlife & Clubs"],
    activeCategory: "Nightlife & Clubs",
  });

  assert.equal(color, getCategoryMarkerColor({ category: "Nightlife & Clubs" }));
});

test("'All' (no active category) uses the event's first-category color", () => {
  const color = getCategoryMarkerColor({
    category: "Parties & Celebrations",
    categories: ["Parties & Celebrations", "Nightlife & Clubs"],
    activeCategory: null,
  });

  assert.equal(color, getCategoryMarkerColor({ category: "Parties & Celebrations" }));
});

test("returning the filter to 'All' returns the glow to the first-category color", () => {
  const selected = getCategoryMarkerColor({
    category: "Parties & Celebrations",
    categories: ["Parties & Celebrations", "Nightlife & Clubs"],
    activeCategory: "Nightlife & Clubs",
  });
  const backToAll = getCategoryMarkerColor({
    category: "Parties & Celebrations",
    categories: ["Parties & Celebrations", "Nightlife & Clubs"],
    activeCategory: null,
  });

  assert.notEqual(selected, backToAll);
  assert.equal(backToAll, getCategoryMarkerColor({ category: "Parties & Celebrations" }));
});

test("a selected category the event does not have falls back to the first-category color", () => {
  const color = getCategoryMarkerColor({
    category: "Parties & Celebrations",
    categories: ["Parties & Celebrations"],
    activeCategory: "Food & Drinks",
  });

  assert.equal(color, getCategoryMarkerColor({ category: "Parties & Celebrations" }));
});

// ── B. Authoritative live status (only event.status === "live" may pulse) ──

test("MapContainer sources isLive from the authoritative event.status field", () => {
  assert.match(mapContainerSource, /isLive:\s*event\.status\s*===\s*"live"/);
});

test("MapContainer no longer computes isLive from the scheduled-time/12-hour heuristic", () => {
  assert.doesNotMatch(mapContainerSource, /isLiveEvent/);
  assert.doesNotMatch(mapContainerSource, /ACTIVE_EVENT_WINDOW_MS/);
  assert.doesNotMatch(mapContainerSource, /12\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
});

test("MapContainer still forwards the authoritative status onto the marker for existing consumers", () => {
  assert.match(mapContainerSource, /eventStatus:\s*event\.status/);
});

// ── C. Live pulse gating and shared driver (MapScreen.tsx) ──────────────────

test("marker glow opacity is gated on isLive, not any scheduled-time heuristic", () => {
  assert.doesNotMatch(mapScreenSource, /isLiveEvent/);
  assert.doesNotMatch(mapScreenSource, /ACTIVE_EVENT_WINDOW_MS/);
  assert.match(mapScreenSource, /if\s*\(!isLive\)\s*\{\s*return\s*\{\s*opacity:\s*trafficGlowBaseOpacity\s*\}/);
});

test("exactly one shared pulse driver (useSharedValue) exists at the Map level, not per marker", () => {
  assert.equal(countOccurrences(mapScreenSource, /useSharedValue\(/g), 1);
  assert.match(mapScreenSource, /const livePulseProgress = useSharedValue\(0\);/);
});

test("live markers combine their own base opacity with the shared pulse progress", () => {
  assert.match(
    mapScreenSource,
    /interpolate\(\s*livePulseProgress\.value,\s*\[0,\s*1\],\s*\[trafficGlowBaseOpacity,\s*getLivePulsePeakOpacity\(trafficGlowBaseOpacity\)\]/,
  );
});

test("the live pulse peak opacity helper is workletized before being called on the UI thread", () => {
  assert.match(
    mapMarkerGlowSource,
    /getLivePulsePeakOpacity\s*=\s*\([^)]*\)\s*:\s*number\s*=>\s*\{\s*["']worklet["'];/,
  );
});

test("the shared pulse driver is passed down as a prop, never re-created inside MapMarker or EventMapMarker", () => {
  assert.match(mapScreenSource, /livePulseProgress: SharedValue<number>/);
  assert.match(mapScreenSource, /<EventMapMarker[\s\S]*?livePulseProgress=\{livePulseProgress\}/);
});

test("no marker creates an independent timer, interval, or animation loop", () => {
  assert.doesNotMatch(mapScreenSource, /setInterval/);
  assert.doesNotMatch(mapScreenSource, /Animated\.loop/);
  assert.doesNotMatch(mapContainerSource, /setInterval/);
});

test("the shared pulse animation is cancelled when no live markers remain and on cleanup", () => {
  assert.match(mapScreenSource, /if \(!hasLiveVisibleMarkers\)\s*\{\s*cancelAnimation\(livePulseProgress\);/);
  assert.match(mapScreenSource, /return \(\) => \{\s*cancelAnimation\(livePulseProgress\);\s*\};/);
});

test("live pulse timing matches the approved 900ms brighten/dim configuration", () => {
  assert.match(mapScreenSource, /duration:\s*MAP_MARKER_GLOW_CONFIG\.livePulseBrightenDurationMs/);
  assert.match(mapScreenSource, /duration:\s*MAP_MARKER_GLOW_CONFIG\.livePulseDimDurationMs/);
});

// ── D. Design invariance: only opacity changes ──────────────────────────────

test("marker image and glow-layer dimensions are unchanged", () => {
  assert.match(mapScreenSource, /markerImage:\s*\{\s*width:\s*56,\s*height:\s*56,\s*\}/);
  assert.match(mapScreenSource, /imageWrapper:\s*\{\s*width:\s*56,\s*height:\s*56,\s*borderRadius:\s*28,\s*borderWidth:\s*3,/);
  assert.match(mapScreenSource, /glowLayer:\s*\{\s*position:\s*"absolute",\s*width:\s*56,\s*height:\s*56,\s*borderRadius:\s*28,\s*\}/);
});

test("satellite glow dimensions are unchanged", () => {
  assert.match(mapScreenSource, /satImageGlow:\s*\{[\s\S]*?width:\s*60,\s*height:\s*60,\s*borderRadius:\s*30,/);
  assert.match(mapScreenSource, /satAnchorGlow:\s*\{[\s\S]*?width:\s*20,\s*height:\s*20,\s*borderRadius:\s*10,/);
});

test("glow transform scales are unchanged", () => {
  assert.match(mapScreenSource, /transform:\s*\[\{\s*scale:\s*2\.5\s*\}\]/);
  assert.match(mapScreenSource, /transform:\s*\[\{\s*scale:\s*2\.2\s*\}\]/);
  assert.match(mapScreenSource, /transform:\s*\[\{\s*scale:\s*3\.5\s*\}\]/);
});

test("SVG dimensions and radial-gradient circle radii are unchanged", () => {
  assert.match(mapScreenSource, /<Svg height="56" width="56" viewBox="0 0 56 56">/);
  assert.match(mapScreenSource, /<SvgCircle cx="28" cy="28" r="28" fill="url\(#mainGlow\)" \/>/);
  assert.match(mapScreenSource, /<Svg height="60" width="60" viewBox="0 0 60 60">/);
  assert.match(mapScreenSource, /<SvgCircle cx="30" cy="30" r="30" fill="url\(#satImageGrad\)" \/>/);
  assert.match(mapScreenSource, /<Svg height="20" width="20" viewBox="0 0 20 20">/);
  assert.match(mapScreenSource, /<SvgCircle cx="10" cy="10" r="10" fill="url\(#satAnchorGrad\)" \/>/);
});

test("the animated glow style array only ever merges opacity alongside a static, unchanged transform/scale entry", () => {
  assert.match(
    mapScreenSource,
    /style=\{\[\s*styles\.glowLayer,\s*\{\s*transform:\s*\[\{\s*scale:\s*2\.5\s*\}\]\s*\},\s*animatedTrafficGlowStyle,\s*\]\}/,
  );
});

test("existing base opacity constants (0.5 / 0.7 / 0.4) are preserved as the zero-check-in baseline", () => {
  assert.match(mapScreenSource, /const TRAFFIC_GLOW_BASE_OPACITY = 0\.5;/);
  assert.match(mapScreenSource, /const SATELLITE_IMAGE_GLOW_BASE_OPACITY = 0\.7;/);
  assert.match(mapScreenSource, /const SATELLITE_ANCHOR_GLOW_BASE_OPACITY = 0\.4;/);
});

// ── E. Map focus refresh ────────────────────────────────────────────────────

test("MapContainer refreshes Map data on navigation focus using the existing focus lifecycle API", () => {
  assert.match(mapContainerSource, /import \{ useFocusEffect \} from "@react-navigation\/native";/);
  assert.match(mapContainerSource, /useFocusEffect\(/);
});

test("focus refresh reuses the exact same fetch effect rather than a duplicated fetch implementation", () => {
  assert.match(
    mapContainerSource,
    /\[eventFilters\.category, eventFilters\.nearby, focusRefreshKey, mapRequestKey, mapRequestParams, pageBudget\]/,
  );
  // Only one fetch effect body should exist (one getMapEventPage call site).
  assert.equal(countOccurrences(mapContainerSource, /getMapEventPage\(/g), 1);
});

test("the very first focus callback (initial mount) is skipped to avoid a duplicate initial request", () => {
  assert.match(
    mapContainerSource,
    /if \(!didMountFocusRefreshRef\.current\)\s*\{\s*didMountFocusRefreshRef\.current = true;\s*return;\s*\}/,
  );
});

test("silent focus refresh does not clear already-rendered markers unless the nearby filter value actually changed", () => {
  assert.match(
    mapContainerSource,
    /if \(nearbyClearKey && nearbyClearKey !== lastNearbyClearKeyRef\.current\)\s*\{\s*applyMarkersIfChanged\(setMarkers, \[\]\);\s*\}/,
  );
});

test("no pull-to-refresh, polling, or WebSocket behavior was introduced for the Map", () => {
  assert.doesNotMatch(mapContainerSource, /RefreshControl/);
  assert.doesNotMatch(mapScreenSource, /RefreshControl/);
  assert.doesNotMatch(mapContainerSource, /WebSocket|socket\.io|createRealtimeSocket/);
  assert.doesNotMatch(mapScreenSource, /WebSocket|socket\.io|createRealtimeSocket/);
});

// ── F. Untouched marker press/navigation behavior ───────────────────────────

test("marker press and event-detail navigation are untouched", () => {
  assert.match(mapScreenSource, /router\.push\(\{\s*pathname:\s*"\/event-screen\/event",\s*params:\s*\{\s*eventId:\s*selectedMarker\.id,\s*source:\s*"map"\s*\},\s*\}\);/);
  assert.match(mapScreenSource, /const handleMarkerPress = React\.useCallback\(\(marker: MapMarkerData\) => \{/);
});

// ── G. Live ripple rings + LIVE badge (additive visual enhancement) ────────

test("a live marker renders both ripple rings, gated on isLive", () => {
  assert.match(mapScreenSource, /\{isLive && \(\s*<>\s*<Animated\.View[\s\S]*?styles\.livePulseRingOuter/);
  assert.match(mapScreenSource, /styles\.livePulseRingInner/);
});

test("both ripple rings derive from the single shared livePulseProgress value (no second driver)", () => {
  assert.match(
    mapScreenSource,
    /const animatedLivePulseRingOuterStyle = useAnimatedStyle\(\(\) => \{[\s\S]*?livePulseProgress\.value/,
  );
  assert.match(
    mapScreenSource,
    /const animatedLivePulseRingInnerStyle = useAnimatedStyle\(\(\) => \{[\s\S]*?1 - livePulseProgress\.value/,
  );
  assert.equal(countOccurrences(mapScreenSource, /useSharedValue\(/g), 1);
});

test("ripple rings are transparent-centered (border-only), not filled blobs", () => {
  assert.match(mapScreenSource, /livePulseRingOuter:\s*\{[\s\S]*?borderWidth:\s*2\.5,/);
  assert.match(mapScreenSource, /livePulseRingInner:\s*\{[\s\S]*?borderWidth:\s*2\.5,/);
  assert.doesNotMatch(mapScreenSource, /livePulseRingOuter:\s*\{[^}]*backgroundColor/);
  assert.doesNotMatch(mapScreenSource, /livePulseRingInner:\s*\{[^}]*backgroundColor/);
});

test("a live marker renders a marker-relative LIVE badge; a non-live marker does not", () => {
  assert.match(mapScreenSource, /\{isLive && \(\s*<View pointerEvents="none" style=\{styles\.liveBadge\}>/);
  assert.match(mapScreenSource, /<Text style=\{styles\.liveBadgeText\}>LIVE<\/Text>/);
});

test("the LIVE badge is positioned relative to the marker container, not a screen/device coordinate", () => {
  assert.match(mapScreenSource, /liveBadge:\s*\{\s*position:\s*"absolute",/);
  assert.doesNotMatch(mapScreenSource, /liveBadge:[\s\S]*?Dimensions\.get/);
});

test("the LIVE badge reuses the existing danger color token instead of a new hardcoded hex", () => {
  assert.match(mapScreenSource, /backgroundColor:\s*colors\.danger/);
});

test("no JS timer or animation loop was introduced by the ring/badge enhancement", () => {
  assert.doesNotMatch(mapScreenSource, /setInterval/);
  assert.doesNotMatch(mapScreenSource, /Animated\.loop/);
});

test("ring and badge rendering live inside the per-marker MapMarker component, so every live marker gets them independently (not tied to selectedMarker)", () => {
  const markerComponentMatch = mapScreenSource.match(
    /const MapMarker = React\.memo\(\(\{[\s\S]*?\n\}\);/,
  );
  assert.ok(markerComponentMatch, "MapMarker component body not found");
  const markerComponentBody = markerComponentMatch[0];

  assert.match(markerComponentBody, /styles\.livePulseRingOuter/);
  assert.match(markerComponentBody, /styles\.liveBadge/);
  assert.doesNotMatch(markerComponentBody, /selectedMarker/);
});

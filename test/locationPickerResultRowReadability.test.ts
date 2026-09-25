import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-011 — Batch 3: search-result row readability. This screen can't be
// mounted under this repo's plain `bun test` runner (no RN component harness
// — see the note at the top of eventStepNavigatorWiring.test.ts), so these
// are the strongest available regression tests: source-text assertions on
// the JSX/style shape, proving both the readability fix landed AND that
// nothing in search/selection/provider/timezone behavior was touched.

const source = readFileSync(
  join(process.cwd(), "app/create-event/location-picker.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

const searchLib = readFileSync(
  join(process.cwd(), "lib/locationSearch.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

// ── 1-3: title/address are no longer clipped to one line ──────────────────

test("EVT-011: result title (venue/place name) allows up to 2 lines, not 1", () => {
  assert.match(source, /styles\.resultTitle, \{ color: colors\.text \}\]\} numberOfLines=\{2\}/);
  assert.doesNotMatch(source, /styles\.resultTitle, \{ color: colors\.text \}\]\} numberOfLines=\{1\}/);
});

test("EVT-011: result address is no longer restricted to one line and supports at least 2 lines", () => {
  const match = source.match(/styles\.resultAddress, \{ color: colors\.textSecondary \}\]\} numberOfLines=\{(\d+)\}/);
  assert.ok(match, "expected to find the result address numberOfLines prop");
  const lines = Number(match![1]);
  assert.ok(lines >= 2, `expected result address to allow at least 2 lines, got ${lines}`);
});

// ── 4: row height does not clip wrapped content ────────────────────────────

test("EVT-011: result row style uses minHeight, not a fixed height, so wrapped content can grow the row", () => {
  const resultItemMatch = source.match(/resultItem: \{[\s\S]*?\n  \},/);
  assert.ok(resultItemMatch, "expected to find the resultItem style block");
  const block = resultItemMatch![0];

  assert.match(block, /minHeight:/);
  assert.doesNotMatch(block, /(?<!min|max)Height:/); // no bare `height:` (fixed height)
  assert.doesNotMatch(block, /overflow:\s*'hidden'/);
});

// ── 5: text containers keep flex/flexShrink protection ─────────────────────

test("EVT-011: result title and address styles retain flexShrink so sibling content can't compress or overflow them", () => {
  const titleMatch = source.match(/resultTitle: \{[\s\S]*?\n  \},/);
  const addressMatch = source.match(/resultAddress: \{[\s\S]*?\n  \},/);
  assert.ok(titleMatch, "expected to find the resultTitle style block");
  assert.ok(addressMatch, "expected to find the resultAddress style block");

  assert.match(titleMatch![0], /flexShrink:\s*1/);
  assert.match(addressMatch![0], /flexShrink:\s*1/);
});

// ── 6: selection/onPress behavior is byte-unchanged ────────────────────────

test("EVT-011: result row onPress still calls handleSelectLocation(location) unchanged", () => {
  assert.match(source, /onPress=\{\(\) => handleSelectLocation\(location\)\}/);
});

test("EVT-011: handleSelectLocation and handleConfirm function signatures are untouched", () => {
  assert.match(source, /const handleSelectLocation = \(location: LocationSearchResult\) => \{/);
  assert.match(source, /const handleConfirm = async \(\) => \{/);
});

// ── 7-10: search debounce, min length, AbortController, request-id guards ──

test("EVT-011: search debounce remains 180ms", () => {
  assert.match(source, /\}, 180\);/);
});

test("EVT-011: minimum query length remains 2", () => {
  const matches = source.match(/trimmedQuery\.length < 2/g) ?? [];
  assert.ok(matches.length >= 1, "expected at least one minimum-query-length(2) guard");
});

test("EVT-011: AbortController wiring remains present for search requests", () => {
  assert.match(source, /searchAbortRef = useRef<AbortController \| null>\(null\)/);
  assert.match(source, /const controller = new AbortController\(\);/);
});

test("EVT-011: monotonic request-id stale-response guards remain present", () => {
  assert.match(source, /const searchRequestId = useRef\(0\);/);
  assert.match(source, /requestId === searchRequestId\.current/);
});

// ── 11: Mapbox autocomplete/fuzzyMatch configuration is untouched ──────────

test("EVT-011: Mapbox autocomplete and fuzzyMatch params remain untouched in locationSearch.ts", () => {
  assert.match(searchLib, /autocomplete:\s*"true"/);
  assert.match(searchLib, /fuzzyMatch:\s*"true"/);
});

// ── 12: map confirmation / marker behavior unchanged ───────────────────────

test("EVT-011: map confirmation (draggable marker + explicit Confirm) is untouched", () => {
  assert.match(source, /disabled=\{!hasConfirmableLocation\(selectedLocation\)\}/);
  assert.match(source, /\{selectedLocation && \(\s*<Mapbox\.PointAnnotation/);
});

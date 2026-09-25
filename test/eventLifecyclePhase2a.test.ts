import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const events = read("lib/events.ts");
const mapContainer = read("components/home/MapContainer.tsx");
const mapScreen = read("components/ui/MapScreen.tsx");
const preview = read("components/ui/EventPreviewModal.tsx");
const nowMode = read("components/home/NowModeScreen.tsx");
const picker = read("components/post/EventPickerModal.tsx");
const search = read("app/discover-screen/search.tsx");

test("Map marker stays visually Live-only while lifecycle is its authority", () => {
  assert.match(mapContainer, /isLive:\s*event\.lifecycle === "live"/);
  assert.match(mapContainer, /lifecycle:\s*event\.lifecycle,/);
  assert.doesNotMatch(mapContainer, /isLive:\s*event\.status === "live"/);
  assert.match(mapScreen, /\{isLive && \(/);
  assert.match(mapScreen, />LIVE<\/Text>/);
  assert.match(mapScreen, /markerImage:\s*\{\s*width:\s*56,\s*height:\s*56,/);
});

test("Map preview receives lifecycle and renders all canonical labels without status fallback", () => {
  assert.match(mapScreen, /lifecycle:\s*marker\.lifecycle \?\? null,/);
  assert.match(mapScreen, /lifecycle=\{selectedMarker\?\.lifecycle \?\? null\}/);
  assert.match(preview, /lifecycle\?: EventLifecycle \| null/);
  assert.match(preview, /const itemLifecycle = item\.lifecycle \?\? null;/);
  assert.match(preview, /EVENT_LIFECYCLE_LABELS\[itemLifecycle\]/);
  assert.match(preview, /itemLifecycle \? \(/);
  assert.doesNotMatch(preview, /item\.eventStatus === "live"/);
  assert.match(preview, /statusRow:\s*\{\s*minHeight: MAP_PREVIEW_STATUS_REGION_HEIGHT,/);
});

test("Now Mode accepts only canonical lifecycle values and does not expose legacy lifecycle copy", () => {
  assert.match(events, /export type NowEventStatus = EventLifecycle;/);
  assert.match(nowMode, /\{ key: "live", label: "Live" \}/);
  assert.match(nowMode, /\{ key: "starting_soon", label: "Starting Soon" \}/);
  assert.match(nowMode, /\{ key: "upcoming", label: "Upcoming" \}/);
  assert.match(nowMode, /\{ key: "ended", label: "Ended" \}/);
  assert.doesNotMatch(nowMode, /Live Now|Last Call|live_now|last_call/);
  assert.match(nowMode, /events\.filter\(\(e\) => e\.nowStatus === statusFilter\)/);
});

test("post-tag picker reuses canonical lifecycle and removes Active display", () => {
  assert.match(events, /export type PostTagEventStatus = EventLifecycle;/);
  assert.match(picker, /upcoming:\s*\{ label: 'Upcoming'/);
  assert.match(picker, /starting_soon:\s*\{ label: 'Starting Soon'/);
  assert.match(picker, /live:\s*\{ label: 'Live'/);
  assert.match(picker, /ended:\s*\{ label: 'Ended'/);
  assert.doesNotMatch(picker, /label: 'Active'/);
  assert.match(picker, /onPress=\{\(\) => handleSelect\(item\)\}/);
});

test("Search remains intentionally lifecycle-presentation unchanged", () => {
  assert.doesNotMatch(search, /EVENT_LIFECYCLE_LABELS|event\.lifecycle|lifecycle:\s*/);
  assert.match(search, /pathname: '\/event-screen\/event'/);
});

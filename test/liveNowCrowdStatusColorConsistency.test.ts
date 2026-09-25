import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const crowdStatusBadgeSource = readFileSync(join(process.cwd(), "components/events/CrowdStatusBadge.tsx"), "utf8");
const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");
const eventPreviewModalSource = readFileSync(join(process.cwd(), "components/ui/EventPreviewModal.tsx"), "utf8");
const mapScreenSource = readFileSync(join(process.cwd(), "components/ui/MapScreen.tsx"), "utf8");
const feedPostSource = readFileSync(join(process.cwd(), "components/post/FeedPost.tsx"), "utf8");
const nowModeScreenSource = readFileSync(join(process.cwd(), "components/home/NowModeScreen.tsx"), "utf8");
const eventPickerModalSource = readFileSync(join(process.cwd(), "components/post/EventPickerModal.tsx"), "utf8");
const eventsLibSource = readFileSync(join(process.cwd(), "lib/events.ts"), "utf8");

// --- 1. Authoritative crowd-status values are the ones discovered from source ---
test("CrowdStatus type in lib/events.ts defines exactly not_busy | busy | very_busy", () => {
  assert.match(eventsLibSource, /CrowdStatus\s*=\s*"not_busy"\s*\|\s*"busy"\s*\|\s*"very_busy"/);
});

test("CrowdStatusBadge labels remain unchanged (Not Busy / Busy / Very Busy)", () => {
  assert.match(crowdStatusBadgeSource, /not_busy:\s*"Not Busy"/);
  assert.match(crowdStatusBadgeSource, /busy:\s*"Busy"/);
  assert.match(crowdStatusBadgeSource, /very_busy:\s*"Very Busy"/);
});

// --- 2. Every crowd-status value resolves to the shared red token (colors.danger) ---
test("CrowdStatusBadge resolves every crowd-status value to colors.danger, not per-status colors", () => {
  assert.match(crowdStatusBadgeSource, /const colorStyle = \{ backgroundColor: "rgba\(72, 11, 10, 0\.82\)" \};/);
  assert.match(crowdStatusBadgeSource, /const textColor = colors\.danger;/);
});

test("CrowdStatusBadge no longer maps any crowd status to green/purple/hardcoded non-red colors", () => {
  assert.doesNotMatch(crowdStatusBadgeSource, /colors\.success/);
  assert.doesNotMatch(crowdStatusBadgeSource, /#EDE9F8/);
  assert.doesNotMatch(crowdStatusBadgeSource, /#BB5E30/);
});

// --- 3. Live Now / Live badges use the shared red token everywhere ---
test("Feed card Live badge uses colors.danger", () => {
  assert.match(eventFeedCardSource, /eventLifecycle === "live" && \{ backgroundColor: colors\.danger \}/);
  assert.match(eventFeedCardSource, /eventLifecycle === "live" && \{ color: colors\.danger \}/);
});

test("Event Detail's EventLifecycleBadge uses colors.danger for canonical Live", () => {
  assert.match(crowdStatusBadgeSource, /LiveDot color=\{colors\.danger\}/);
  assert.match(crowdStatusBadgeSource, /lifecycle === "live" \? colors\.danger : "#B8B8C2"/);
  assert.doesNotMatch(crowdStatusBadgeSource, /#18D66B/);
});

test("Map preview modal Live badge uses colors.danger (pre-existing, unchanged)", () => {
  assert.match(eventPreviewModalSource, /colors\.danger/);
});

test("Map marker LIVE badge text now matches the red dot instead of hardcoded white", () => {
  assert.match(mapScreenSource, /<Text style=\{\[styles\.liveBadgeText, \{ color: colors\.danger \}\]\}>LIVE<\/Text>/);
  assert.doesNotMatch(mapScreenSource, /liveBadgeText:\s*\{\s*color:\s*"#FFFFFF"/);
});

test("FeedPost event-overlay Live Now badge now uses the red family instead of hardcoded green", () => {
  assert.match(feedPostSource, /backgroundColor: 'rgba\(255, 59, 48, 0\.15\)'/);
  assert.match(feedPostSource, /borderColor: 'rgba\(255, 59, 48, 0\.4\)'/);
  assert.match(feedPostSource, /liveNowDot:\s*\{[\s\S]*?backgroundColor: '#FF3B30'/);
  assert.match(feedPostSource, /liveNowText:\s*\{\s*color: '#FF3B30'/);
  assert.doesNotMatch(feedPostSource, /#16D869/);
  assert.doesNotMatch(feedPostSource, /rgba\(22, 216, 105/);
});

test("NowModeScreen canonical Live status uses the red family instead of hardcoded green", () => {
  assert.match(nowModeScreenSource, /liveGreen:\s*"#FF3B30"/);
  assert.match(nowModeScreenSource, /liveGreenBg:\s*"rgba\(72, 11, 10, 0\.88\)"/);
  assert.doesNotMatch(nowModeScreenSource, /#0DC143/);
  assert.doesNotMatch(nowModeScreenSource, /rgba\(20,37,22,0\.88\)/);
});

test("NowModeScreen preserves Starting Soon and supplies the canonical Ended treatment", () => {
  assert.match(nowModeScreenSource, /startingSoonColor:\s*"#F59E0B"/);
  assert.match(nowModeScreenSource, /endedColor:\s*"#EF4444"/);
});

test("EventPickerModal (post event-tag picker) 'live' status now uses red instead of hardcoded green", () => {
  assert.match(eventPickerModalSource, /live:\s*\{ label: 'Live',\s*color: '#FF3B30', bg: 'rgba\(255,59,48,0\.12\)', dot: true \}/);
});

test("EventPickerModal uses the canonical non-live statuses", () => {
  assert.match(eventPickerModalSource, /starting_soon:\s*\{ label: 'Starting Soon', color: '#F59E0B'/);
  assert.match(eventPickerModalSource, /upcoming:\s*\{ label: 'Upcoming',\s*color: '#F59E0B'/);
  assert.match(eventPickerModalSource, /ended:\s*\{ label: 'Ended',\s*color: '#8E8E9B'/);
  assert.doesNotMatch(eventPickerModalSource, /label: 'Active'/);
});

// --- 4. Labels / business logic untouched ---
test("migrated Feed no longer uses Live Now lifecycle copy", () => {
  assert.doesNotMatch(eventFeedCardSource, /Live Now/);
  assert.doesNotMatch(nowModeScreenSource, /Live Now|Last Call/);
  assert.match(feedPostSource, />Live Now</);
});

test("Crowd status classification thresholds are not present/modified in mobile app source (backend-owned)", () => {
  // The mobile CrowdStatusBadge component only maps colors; it must not contain
  // any percentage/threshold logic — that stays in api/.../crowd-status.service.ts.
  assert.doesNotMatch(crowdStatusBadgeSource, /34|67/);
});

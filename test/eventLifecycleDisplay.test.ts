import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const events = read("lib/events.ts");
const feed = read("components/home/EventFeedCard.tsx");
const detail = read("app/event-screen/event.tsx");
const badges = read("components/events/CrowdStatusBadge.tsx");

test("frontend EventResponse accepts the exact canonical lifecycle contract and null", () => {
  assert.match(events, /EventLifecycle\s*=\s*"upcoming"\s*\|\s*"starting_soon"\s*\|\s*"live"\s*\|\s*"ended"/);
  assert.match(events, /lifecycle:\s*EventLifecycle \| null/);
  assert.match(events, /upcoming:\s*"Upcoming"/);
  assert.match(events, /starting_soon:\s*"Starting Soon"/);
  assert.match(events, /live:\s*"Live"/);
  assert.match(events, /ended:\s*"Ended"/);
});

test("Feed renders all canonical labels from lifecycle and hides the badge for null", () => {
  assert.match(feed, /eventLifecycle \? <Animated\.View/);
  assert.match(feed, /EVENT_LIFECYCLE_LABELS\[eventLifecycle\]/);
  assert.match(feed, /eventLifecycle === "starting_soon"/);
  assert.doesNotMatch(feed, /Live Now/);
  assert.doesNotMatch(feed, /Ending Soon/);
  assert.doesNotMatch(feed, /getEventBadgeStatus|STARTING_SOON_MS/);
});

test("persisted-status disagreement cannot override Feed's canonical lifecycle display", () => {
  const badgeRegion = feed.slice(feed.indexOf("<View style={styles.statusBadgeGroup}"), feed.indexOf("{/* info section pinned"));
  assert.match(feed, /const eventBadgeLabel = eventLifecycle \? EVENT_LIFECYCLE_LABELS\[eventLifecycle\] : null;/);
  assert.match(badgeRegion, /\{eventBadgeLabel\}/);
  assert.doesNotMatch(badgeRegion, /event\.status|eventStatus/);
});

test("Event Detail renders all canonical labels from lifecycle rather than status", () => {
  assert.match(detail, /<EventLifecycleBadge lifecycle=\{event\?\.lifecycle\} \/>/);
  assert.match(badges, /EVENT_LIFECYCLE_LABELS\[lifecycle\]/);
  assert.doesNotMatch(detail, /<EventLifecycleBadge lifecycle=\{event\?\.status\} \/>/);
  const heroBadgeRegion = detail.slice(detail.indexOf("<View style={[styles.heroStatusStack"), detail.indexOf("<View style={styles.overlaidMeta}"));
  assert.doesNotMatch(heroBadgeRegion, /event\?\.status/);
  assert.doesNotMatch(heroBadgeRegion, /Ending Soon|Live Now/);
});

test("crowd remains separate and is visible only for canonical Live", () => {
  assert.match(badges, /const effectiveLifecycle = eventLifecycle \?\? \(eventStatus === "live" \? "live" : null\);/);
  assert.match(badges, /effectiveLifecycle !== "live" \|\| !isSupportedCrowdStatus/);
  assert.match(detail, /<CrowdStatusBadge eventLifecycle=\{event\?\.lifecycle\} crowdStatus=\{event\?\.crowdStatus\} \/>/);
  assert.match(feed, /<CrowdStatusBadge eventLifecycle=\{event\.lifecycle\} crowdStatus=\{event\.crowdStatus\} \/>/);
  assert.match(badges, /not_busy:\s*"Not Busy"/);
  assert.match(badges, /busy:\s*"Busy"/);
  assert.match(badges, /very_busy:\s*"Very Busy"/);
});

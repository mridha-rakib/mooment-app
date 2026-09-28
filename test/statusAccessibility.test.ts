import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const badges = read("components/events/CrowdStatusBadge.tsx");
const feedCard = read("components/home/EventFeedCard.tsx");
const mapScreen = read("components/ui/MapScreen.tsx");
const events = read("lib/events.ts");

test("lifecycle badges preserve visible canonical copy and expose one explicit status label", () => {
  assert.match(events, /upcoming:\s*"Upcoming"/);
  assert.match(events, /starting_soon:\s*"Starting Soon"/);
  assert.match(events, /live:\s*"Live"/);
  assert.match(events, /ended:\s*"Ended"/);
  assert.match(badges, /\{EVENT_LIFECYCLE_LABELS\[lifecycle\]\}/);
  assert.match(badges, /accessible\s*\n\s*accessibilityRole="text"\s*\n\s*accessibilityLabel=\{`Event status: \$\{EVENT_LIFECYCLE_LABELS\[lifecycle\]\}`\}/);
});

test("crowd badges preserve visible canonical copy, label the status, and omit null/unsupported values", () => {
  assert.match(badges, /not_busy:\s*"Not Busy"/);
  assert.match(badges, /busy:\s*"Busy"/);
  assert.match(badges, /very_busy:\s*"Very Busy"/);
  assert.match(badges, /accessibilityLabel=\{`Crowd status: \$\{CROWD_LABELS\[crowdStatus\]\}`\}/);
  assert.match(badges, /if \(effectiveLifecycle !== "live" \|\| !isSupportedCrowdStatus\(crowdStatus\)\) \{\s*return null;/);
});

test("feed access is visible Public/Locked/Private copy and has one explicit accessible meaning", () => {
  assert.match(feedCard, /const privacyLabel = event\.privacy === "private" \? "Private" : event\.privacy === "locked" \? "Locked" : "Public";/);
  assert.match(feedCard, /<Text style=\{styles\.accessText\}>\{privacyLabel\}<\/Text>/);
  assert.match(feedCard, /accessibilityLabel=\{`View \$\{hostName\} profile\. Event access: \$\{privacyLabel\}`\}/);
  assert.doesNotMatch(feedCard, /<Feather name=\{isPublic \? "globe" : "lock"\} size=\{11\} color="#777" \/>\s*<\/View>\s*<\/View>\s*<\/TouchableOpacity>/);
});

test("map markers name the event and only add Live for live markers", () => {
  assert.match(mapScreen, /accessibilityLabel=\{isLive \? `\$\{label\}, Live` : label\}/);
  assert.match(mapScreen, /\{isLive && \([\s\S]*?<Text style=\{\[styles\.liveBadgeText, \{ color: colors\.danger \}\]\}>LIVE<\/Text>/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const mapContainerSource = readFileSync(
  join(process.cwd(), "components/home/MapContainer.tsx"),
  "utf8",
);
const mapScreenSource = readFileSync(
  join(process.cwd(), "components/ui/MapScreen.tsx"),
  "utf8",
);
const eventPreviewModalSource = readFileSync(
  join(process.cwd(), "components/ui/EventPreviewModal.tsx"),
  "utf8",
);
const eventsSource = readFileSync(
  join(process.cwd(), "lib/events.ts"),
  "utf8",
);

test("map event payload already exposes endAt, so no backend field invention is needed", () => {
  assert.match(eventsSource, /endAt\?:\s*string\s*\|\s*null/);
  assert.match(mapContainerSource, /endAt:\s*event\.endAt\s*\?\?\s*null/);
});

test("MapContainer formats start datetime from existing scheduledAt data", () => {
  assert.match(mapContainerSource, /scheduledAt:\s*event\.scheduledAt\s*\?\?\s*null/);
  assert.match(mapContainerSource, /eventDate:\s*formatEventDate\(event\.scheduledAt\)/);
  assert.match(mapContainerSource, /eventTime:\s*formatEventTime\(event\.scheduledAt\)/);
});

test("MapContainer formats end datetime from existing endAt data with the same helpers", () => {
  assert.match(mapContainerSource, /eventEndDate:\s*formatEventDate\(event\.endAt\)/);
  assert.match(mapContainerSource, /eventEndTime:\s*formatEventTime\(event\.endAt\)/);
});

test("MapScreen forwards formatted end datetime into the map event preview card", () => {
  assert.match(mapScreenSource, /eventEndDate\?:\s*string\s*\|\s*null/);
  assert.match(mapScreenSource, /eventEndTime\?:\s*string\s*\|\s*null/);
  assert.match(mapScreenSource, /eventEndDate:\s*marker\.eventEndDate\s*\?\?\s*undefined/);
  assert.match(mapScreenSource, /eventEndTime:\s*marker\.eventEndTime\s*\?\?\s*undefined/);
  assert.match(mapScreenSource, /eventEndDate=\{selectedMarker\?\.eventEndDate\s*\?\?\s*undefined\}/);
  assert.match(mapScreenSource, /eventEndTime=\{selectedMarker\?\.eventEndTime\s*\?\?\s*undefined\}/);
});

test("map event preview renders explicit Start and End date/time rows", () => {
  assert.match(eventPreviewModalSource, />Start<\/Text>/);
  assert.match(eventPreviewModalSource, />End<\/Text>/);
  assert.match(eventPreviewModalSource, /\{item\.eventDate\s*\?\?\s*"Date TBA"\}/);
  assert.match(eventPreviewModalSource, /\{item\.eventTime\s*\?\?\s*"Time TBA"\}/);
  assert.match(eventPreviewModalSource, /\{item\.eventEndDate\s*\?\?\s*"Date TBA"\}/);
  assert.match(eventPreviewModalSource, /\{item\.eventEndTime\s*\?\?\s*"Time TBA"\}/);
});

test("LIVE map preview uses the existing shared Map pulse progress instead of a new animation driver", () => {
  assert.match(mapScreenSource, /livePulseProgress=\{livePulseProgress\}/);
  assert.match(eventPreviewModalSource, /livePulseProgress\?:\s*SharedValue<number>/);
  assert.match(eventPreviewModalSource, /const liveBadgePulseStyle = useAnimatedStyle\(\(\) => \{/);
  assert.match(eventPreviewModalSource, /const liveDotPulseStyle = useAnimatedStyle\(\(\) => \{/);
  assert.match(eventPreviewModalSource, /interpolate\(livePulseProgress\.value,\s*\[0,\s*1\]/);
  assert.doesNotMatch(eventPreviewModalSource, /withRepeat|withSequence|withTiming|useSharedValue|setInterval|Animated\.loop/);
});

test("LIVE map preview visual is red using the existing danger token", () => {
  assert.match(eventPreviewModalSource, /backgroundColor:\s*'rgba\(255, 59, 48, 0\.16\)'/);
  assert.match(eventPreviewModalSource, /borderColor:\s*'rgba\(255, 59, 48, 0\.28\)'/);
  assert.match(eventPreviewModalSource, /backgroundColor:\s*colors\.danger/);
  assert.match(eventPreviewModalSource, /<Text style=\{\[styles\.liveText,\s*\{\s*color:\s*colors\.danger\s*\}\]\}>Live<\/Text>/);
});

test("non-live map preview does not render the animated LIVE pulse", () => {
  assert.match(eventPreviewModalSource, /const itemIsLive = item\.isLive \|\| item\.eventStatus === "live";/);
  assert.match(
    eventPreviewModalSource,
    /\{itemIsLive && \(\s*<View style=\{styles\.statusRow\}>\s*<Animated\.View style=\{\[styles\.liveBadge,\s*styles\.liveBadgeActive,\s*liveBadgePulseStyle\]\}>/,
  );
});

test("Busy and Not Busy badge rendering remains delegated to the existing component", () => {
  assert.match(
    eventPreviewModalSource,
    /<CrowdStatusBadge eventStatus=\{item\.eventStatus\} crowdStatus=\{item\.crowdStatus\} \/>/,
  );
});

test("existing attending, price, tickets-left, buy-by, and View Event UI remains present", () => {
  assert.match(eventPreviewModalSource, /\{item\.attendeesCount \?\? 0\} attending/);
  assert.match(eventPreviewModalSource, /\{item\.price \?\? "Free"\}/);
  assert.match(eventPreviewModalSource, /\{item\.ticketsAvailable \?\? "Tickets TBA"\}/);
  assert.match(eventPreviewModalSource, /\{item\.ticketSalesEndDate \?\? "Sales end TBA"\}/);
  assert.match(eventPreviewModalSource, />View Event<\/Text>/);
});

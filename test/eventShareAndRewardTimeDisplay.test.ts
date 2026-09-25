import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// EVT-008 — the Share sheet and reward-claim "Expires" line previously
// formatted the Event's raw UTC scheduledAt (or a reward's expiresAt) with
// `toLocaleString`/`toLocaleDateString`/`toLocaleTimeString` — i.e. the
// VIEWER's device-local timezone — instead of the Event's own timezone, so
// the same Event could show a different time on these two surfaces than on
// Feed/Map/Event Detail. Fixed to route through the same
// `formatEventTimeDisplay` helper every primary surface already uses.
//
// event.tsx can't be mounted under the plain `bun test` runner (no RN
// component harness in this repo), so this is a source-text guard — it
// proves the correct helper/inputs are wired in, not a rendered-pixel check.
// app/test/eventTimeDisplay*.test.ts (if present) already covers
// formatEventTimeDisplay's own logic at runtime; this file only proves these
// two call sites use it.

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const eventScreen = read("app/event-screen/event.tsx");

test("formatEventTimeDisplay is imported from the shared Event-local helper", () => {
  assert.match(eventScreen, /import \{ formatEventTimeDisplay \} from "@\/lib\/eventTimeDisplay";/);
});

// ── Share sheet ──────────────────────────────────────────────────────────

test("EVT-008: Share sheet dateTimeLabel no longer formats with the device-local toLocaleString", () => {
  const shareItemBlock = eventScreen.slice(
    eventScreen.indexOf("item={event ? {"),
    eventScreen.indexOf("} : undefined}", eventScreen.indexOf("item={event ? {")),
  );

  assert.doesNotMatch(shareItemBlock, /new Date\(event\.scheduledAt\)\.toLocaleString/);
});

test("EVT-008: Share sheet dateTimeLabel uses formatEventTimeDisplay with the Event's own timezone", () => {
  const shareItemBlock = eventScreen.slice(
    eventScreen.indexOf("item={event ? {"),
    eventScreen.indexOf("} : undefined}", eventScreen.indexOf("item={event ? {")),
  );

  assert.match(shareItemBlock, /dateTimeLabel:/);
  assert.match(shareItemBlock, /formatEventTimeDisplay\(\{\s*\n\s*scheduledAt: event\.scheduledAt,\s*\n\s*timezone: event\.timezone,/);
  assert.match(shareItemBlock, /primaryDateShortText/);
  assert.match(shareItemBlock, /primaryTimeText/);
});

// ── Reward claim "Expires" line ─────────────────────────────────────────────

test("EVT-008: reward-claim Expires line no longer formats with device-local toLocaleDateString/toLocaleTimeString", () => {
  const rewardExpiresBlock = eventScreen.slice(
    eventScreen.indexOf("const src = selectedReward?.expiresAt"),
    eventScreen.indexOf("const src = selectedReward?.expiresAt") + 900,
  );

  assert.doesNotMatch(rewardExpiresBlock, /d\.toLocaleDateString/);
  assert.doesNotMatch(rewardExpiresBlock, /d\.toLocaleTimeString/);
});

test("EVT-008: reward-claim Expires line uses formatEventTimeDisplay with the Event's own timezone", () => {
  const rewardExpiresBlock = eventScreen.slice(
    eventScreen.indexOf("const src = selectedReward?.expiresAt"),
    eventScreen.indexOf("const src = selectedReward?.expiresAt") + 900,
  );

  assert.match(rewardExpiresBlock, /formatEventTimeDisplay\(\{\s*\n\s*scheduledAt: d,\s*\n\s*timezone: event\?\.timezone,/);
  assert.match(rewardExpiresBlock, /primaryDateText/);
  assert.match(rewardExpiresBlock, /primaryTimeText/);
  // "Date TBA" fallback preserved for a missing/invalid date — not replaced
  // by an invented new fallback.
  assert.match(rewardExpiresBlock, /"Date TBA"/);
});

// ── Primary Event surfaces remain unchanged ────────────────────────────────

test("EVT-008 regression: the primary eventTimeModel (Event Detail / hero) usage is unchanged", () => {
  const primaryModelBlock = eventScreen.slice(
    eventScreen.indexOf("const eventTimeModel"),
    eventScreen.indexOf("const eventTimeModel") + 400,
  );

  assert.match(primaryModelBlock, /formatEventTimeDisplay\(\{/);
});

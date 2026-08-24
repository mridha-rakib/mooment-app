import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");
const mapScreenSource = readFileSync(join(process.cwd(), "components/ui/MapScreen.tsx"), "utf8");

test("Feed live badge reuses the Map live pulse timing constants and cancellation pattern", () => {
  assert.match(eventFeedCardSource, /MAP_MARKER_GLOW_CONFIG\.livePulseBrightenDurationMs/);
  assert.match(eventFeedCardSource, /MAP_MARKER_GLOW_CONFIG\.livePulseDimDurationMs/);
  assert.match(eventFeedCardSource, /cancelAnimation\(livePulseProgress\);/);
  assert.match(eventFeedCardSource, /withRepeat\(\s*withSequence\(/);
});

test("Feed live status uses the existing theme danger red instead of the previous green literal", () => {
  assert.match(eventFeedCardSource, /eventBadgeStatus === "live" && \{ backgroundColor: colors\.danger \}/);
  assert.match(eventFeedCardSource, /eventBadgeStatus === "live" && \{ color: colors\.danger \}/);
  assert.doesNotMatch(eventFeedCardSource, /liveStatusDot:\s*\{\s*backgroundColor:\s*"#18D66B"/);
  assert.doesNotMatch(eventFeedCardSource, /liveStatusText:\s*\{\s*color:\s*"#18D66B"/);
});

test("Feed live animation is gated by the existing live badge status only", () => {
  assert.match(eventFeedCardSource, /const isLiveBadge = eventBadgeStatus === "live";/);
  assert.match(eventFeedCardSource, /if \(!isLiveBadge\)\s*\{\s*cancelAnimation\(livePulseProgress\);/);
  assert.match(eventFeedCardSource, /isLiveBadge && animatedLiveStatusBadgeStyle/);
});

test("Map live implementation remains the source pattern and is not modified by Feed badge rendering", () => {
  assert.match(mapScreenSource, /const livePulseProgress = useSharedValue\(0\);/);
  assert.match(mapScreenSource, /duration:\s*MAP_MARKER_GLOW_CONFIG\.livePulseBrightenDurationMs/);
  assert.match(mapScreenSource, /<View style=\{\[styles\.liveBadgeDot, \{ backgroundColor: colors\.danger \}\]\} \/>/);
  assert.doesNotMatch(mapScreenSource, /Live Now/);
});

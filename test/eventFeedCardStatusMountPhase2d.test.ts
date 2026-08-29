import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Phase 2D: EventFeedCard used to guarantee a second full render on every
// mount because `statusNowMs` was seeded with `useState(() => Date.now())` and
// then immediately re-sampled with a standalone `setStatusNowMs(Date.now())`
// in the lifecycle-boundary effect. The two clock reads differ by a few ms,
// so React committed a redundant render — multiplied by FlatList mount/unmount
// churn while scrolling past event cards.
//
// This fix removes ONLY that standalone mount-time update. Upcoming→Live→Ended
// transitions must still be driven by the boundary timer, which re-samples the
// clock (`setStatusNowMs(Date.now())`) only when an actual scheduledAt/endAt
// boundary is reached.
//
// The repo has no component-render harness and EventFeedCard cannot be
// imported under the test runner (it pulls in react-native / expo-image /
// reanimated), so — like eventFeedLiveStatusVisual / feedScrollSmoothnessPhase1
// / feedVideoRuntimeDisabledPhase2b — this is a source-level regression guard.

const source = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");

const sliceBetween = (from: string, to: string) => {
  const start = source.indexOf(from);
  const end = to ? source.indexOf(to, start + 1) : source.length;
  assert.ok(start >= 0 && end > start, `could not slice between ${JSON.stringify(from)} and ${JSON.stringify(to)}`);
  return source.slice(start, end);
};

// The lifecycle-boundary effect body: from its `let timeoutId` declaration to
// its dependency array.
const lifecycleEffect = sliceBetween(
  "let timeoutId: ReturnType<typeof setTimeout> | null = null;",
  "}, [eventEndAt, eventScheduledAt, eventStatus]);",
);
const scheduleFn = sliceBetween("const scheduleNextBoundary = () => {", "return () => {");
const timerCallback = sliceBetween("timeoutId = setTimeout(() => {", "}, delayMs);");
// Everything in the effect body AFTER the scheduleNextBoundary definition
// closes: the standalone `scheduleNextBoundary()` invocation + the cleanup.
// This is exactly where the removed mount-time `setStatusNowMs(Date.now())`
// used to live.
const effectTailAfterScheduleFn = sliceBetween("}, delayMs);", "}, [eventEndAt, eventScheduledAt, eventStatus]);");
const getBadgeStatusFn = sliceBetween("const getEventBadgeStatus =", "const getNextEventBadgeBoundary =");
const getNextBoundaryFn = sliceBetween("const getNextEventBadgeBoundary =", "const normalizeId =");

// ── A. The redundant mount-time update is gone ────────────────────────────

test("1. lifecycle effect no longer performs a standalone mount-time setStatusNowMs before scheduleNextBoundary", () => {
  // The effect body after the scheduleNextBoundary definition (its standalone
  // invocation + the cleanup) must NOT contain any setStatusNowMs — that is
  // exactly where the removed redundant mount-time update lived.
  assert.doesNotMatch(effectTailAfterScheduleFn, /setStatusNowMs/);

  // `scheduleNextBoundary()` is still invoked directly in the effect body
  // (outside the setTimeout callback) so the first boundary is still armed,
  // and it is immediately followed by the cleanup return.
  assert.match(effectTailAfterScheduleFn, /\bscheduleNextBoundary\(\);\s*return \(\) => \{/);

  // Inside the whole effect, `setStatusNowMs(Date.now())` now appears exactly
  // once, and only inside the boundary timer callback.
  const setNowCalls = lifecycleEffect.match(/setStatusNowMs\(Date\.now\(\)\)/g) ?? [];
  assert.equal(setNowCalls.length, 1);
  assert.match(timerCallback, /setStatusNowMs\(Date\.now\(\)\);\s*scheduleNextBoundary\(\);/);
});

// ── B. Initial badge state is correct without a second update ─────────────

test("2. statusNowMs is still seeded from the current wall clock at initialization", () => {
  assert.match(source, /const \[statusNowMs, setStatusNowMs\] = useState\(\(\) => Date\.now\(\)\);/);
});

test("2b. first-render badge status is derived synchronously from the seeded statusNowMs", () => {
  assert.match(source, /const eventBadgeStatus = useMemo\(/);
  assert.match(source, /getEventBadgeStatus\(\{[\s\S]*?\}, statusNowMs\)/);
  assert.match(source, /\[eventEndAt, eventScheduledAt, eventStatus, statusNowMs\],/);
  assert.match(source, /const eventEndedByPersistedTime = isEventEndedByTime\(eventEndAt, statusNowMs\);/);
  assert.match(getBadgeStatusFn, /if \(startMs !== null && startMs <= nowMs\) \{\s*return "live";\s*\}\s*return "upcoming";/);
});

// ── C. Upcoming → Live still works via the boundary timer ────────────────

test("3. Upcoming→Live transition remains driven by the scheduled boundary timer", () => {
  assert.match(scheduleFn, /const nextBoundary = getNextEventBadgeBoundary\(\{[\s\S]*?\}, nowMs\);/);
  assert.match(scheduleFn, /if \(nextBoundary === null\) \{\s*return;\s*\}/);
  assert.match(scheduleFn, /const delayMs = Math\.min\(Math\.max\(nextBoundary - nowMs \+ 250, 0\), 2_147_483_647\);/);
  assert.match(scheduleFn, /timeoutId = setTimeout\(\(\) => \{[\s\S]*?setStatusNowMs\(Date\.now\(\)\);\s*scheduleNextBoundary\(\);[\s\S]*?\}, delayMs\);/);

  // getEventBadgeStatus flips to "live" once the scheduled start is <= now.
  assert.match(getBadgeStatusFn, /const startMs = parseEventTime\(event\.scheduledAt\);\s*if \(startMs !== null && startMs <= nowMs\) \{\s*return "live";/);

  // scheduledAt is offered as a future boundary.
  assert.match(getNextBoundaryFn, /const startMs = parseEventTime\(event\.scheduledAt\);\s*const endMs = parseEventTime\(event\.endAt\);\s*const boundaries = \[startMs, endMs\]\.filter\(\s*\(time\): time is number => time !== null && time > nowMs,\s*\);/);
});

// ── D. Live → Ended still works via the second boundary ─────────────────

test("4. Live→Ended transition remains driven by the endAt boundary", () => {
  assert.match(getBadgeStatusFn, /const endMs = parseEventTime\(event\.endAt\);[\s\S]*?if \(endMs !== null && endMs <= nowMs\) \{\s*return "ended";\s*\}/);
  assert.match(getNextBoundaryFn, /\[startMs, endMs\]\.filter\(/);
  assert.match(getNextBoundaryFn, /return boundaries\.length > 0 \? Math\.min\(\.\.\.boundaries\) : null;/);
});

// ── E. No future boundary (completed / cancelled / final) ───────────────

test("5. completed/cancelled or no-future-boundary events schedule no timer and cannot crash", () => {
  assert.match(getNextBoundaryFn, /if \(event\.status === "completed" \|\| event\.status === "cancelled"\) \{\s*return null;\s*\}/);
  assert.match(getNextBoundaryFn, /return boundaries\.length > 0 \? Math\.min\(\.\.\.boundaries\) : null;/);
  // scheduleNextBoundary bails before setTimeout when there is no boundary.
  assert.match(scheduleFn, /if \(nextBoundary === null\) \{\s*return;\s*\}\s*const delayMs =/);
  // completed/cancelled resolve to "ended" on first render.
  assert.match(getBadgeStatusFn, /if \(event\.status === "completed" \|\| event\.status === "cancelled"\) \{\s*return "ended";\s*\}/);
});

// ── F. Timer cleanup unchanged ─────────────────────────────────────────

test("6. timer cleanup still cancels the pending boundary and guards against stale updates", () => {
  assert.match(
    lifecycleEffect,
    /return \(\) => \{\s*isCancelled = true;\s*if \(timeoutId\) \{\s*clearTimeout\(timeoutId\);\s*\}\s*\};/,
  );
  // The timer callback still no-ops after cancellation (guard is its first
  // statement), so no stale setStatusNowMs runs post-unmount.
  assert.match(timerCallback, /\(\) => \{\s*if \(isCancelled\) \{\s*return;\s*\}/);
});

// ── G. Nothing else in EventFeedCard changed ───────────────────────────

test("7. LIVE Reanimated pulse effect is untouched", () => {
  assert.match(source, /livePulseProgress\.value = withRepeat\(\s*withSequence\(/);
  assert.match(source, /if \(!isLiveBadge\) \{\s*cancelAnimation\(livePulseProgress\);\s*livePulseProgress\.value = 0;\s*return;\s*\}/);
  assert.match(source, /return \(\) => \{\s*cancelAnimation\(livePulseProgress\);\s*\};/);
});

test("8. the lifecycle effect still keys off exactly [eventEndAt, eventScheduledAt, eventStatus]", () => {
  assert.match(source, /\}, \[eventEndAt, eventScheduledAt, eventStatus\]\);/);
});

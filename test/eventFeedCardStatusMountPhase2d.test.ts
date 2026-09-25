import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");

test("Feed lifecycle badge consumes the backend lifecycle field without a local classifier", () => {
  assert.match(source, /const eventLifecycle: EventLifecycle \| null = event\.lifecycle;/);
  assert.match(source, /EVENT_LIFECYCLE_LABELS\[eventLifecycle\]/);
  assert.doesNotMatch(source, /getEventBadgeStatus/);
  assert.doesNotMatch(source, /STARTING_SOON_MS/);
  assert.doesNotMatch(source, /Date\.now\(\).*2 \* 60 \* 60/);
});

test("Feed retains its existing timer only for host-side end-time business behavior", () => {
  assert.match(source, /const eventEndedByPersistedTime = isEventEndedByTime\(eventEndAt, statusNowMs\);/);
  assert.match(source, /const getNextEventTimeBoundary =/);
  assert.match(source, /const \[statusNowMs, setStatusNowMs\] = useState\(\(\) => Date\.now\(\)\);/);
});

test("Feed lifecycle effect does not derive badge state from the timer", () => {
  assert.doesNotMatch(source, /eventLifecycle.*statusNowMs/s);
  assert.match(source, /const isLiveBadge = eventLifecycle === "live";/);
});

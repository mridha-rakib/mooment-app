import assert from "node:assert/strict";
import test from "node:test";

import {
  clampStoryGroupDrag,
  getStoryGroupAdjacentTranslateY,
  getStoryGroupCommitDuration,
  getStoryGroupCommitTranslateY,
  getStoryGroupSwipeDirection,
  getStoryGroupSwipeTarget,
  STORY_GROUP_ACTIVATION_DISTANCE,
  STORY_GROUP_DIRECTION_DOMINANCE,
  STORY_GROUP_DRAG_LIMIT,
  STORY_GROUP_SWIPE_DISTANCE,
  STORY_GROUP_SWIPE_VELOCITY,
  STORY_GROUP_SWIPE_COMMIT_MAX_DURATION_MS,
  STORY_GROUP_SWIPE_COMMIT_MIN_DURATION_MS,
} from "../lib/storyViewerGestures";

test("upward vertical story gesture maps negative dy and vy to next group", () => {
  assert.equal(
    getStoryGroupSwipeDirection({
      dx: 4,
      dy: -(STORY_GROUP_SWIPE_DISTANCE + 4),
      vx: 0,
      vy: -0.1,
    }),
    "next",
  );
  assert.equal(
    getStoryGroupSwipeDirection({
      dx: 4,
      dy: -12,
      vx: 0,
      vy: -(STORY_GROUP_SWIPE_VELOCITY + 0.01),
    }),
    "next",
  );
});

test("downward vertical story gesture maps positive dy and vy to previous group", () => {
  assert.equal(
    getStoryGroupSwipeDirection({
      dx: 4,
      dy: STORY_GROUP_SWIPE_DISTANCE + 4,
      vx: 0,
      vy: 0.1,
    }),
    "previous",
  );
  assert.equal(
    getStoryGroupSwipeDirection({
      dx: 4,
      dy: 12,
      vx: 0,
      vy: STORY_GROUP_SWIPE_VELOCITY + 0.01,
    }),
    "previous",
  );
});

test("horizontal or incomplete movement does not commit a vertical group swipe", () => {
  assert.equal(
    getStoryGroupSwipeDirection({ dx: 90, dy: 70, vx: 0.5, vy: 0.7 }),
    null,
  );
  assert.equal(
    getStoryGroupSwipeDirection({
      dx: 4,
      dy: STORY_GROUP_SWIPE_DISTANCE - 8,
      vx: 0,
      vy: STORY_GROUP_SWIPE_VELOCITY - 0.08,
    }),
    null,
  );
  assert.equal(
    getStoryGroupSwipeDirection({
      dx: 4,
      dy: -(STORY_GROUP_SWIPE_DISTANCE - 8),
      vx: 0,
      vy: -(STORY_GROUP_SWIPE_VELOCITY - 0.08),
    }),
    null,
  );
});

test("short natural distance and flick thresholds are lighter than half-screen drags", () => {
  assert.equal(STORY_GROUP_SWIPE_DISTANCE, 40);
  assert.equal(STORY_GROUP_SWIPE_VELOCITY, 0.35);
  assert.equal(STORY_GROUP_ACTIVATION_DISTANCE, 12);
});

test("slight diagonal vertical swipes commit while horizontal-dominant gestures do not", () => {
  assert.equal(
    getStoryGroupSwipeDirection({ dx: 40, dy: 44, vx: 0, vy: 0.05 }),
    "previous",
  );
  assert.equal(
    getStoryGroupSwipeDirection({ dx: 40, dy: -44, vx: 0, vy: -0.05 }),
    "next",
  );
  assert.equal(
    getStoryGroupSwipeDirection({ dx: 50, dy: 44, vx: 0, vy: 0.7 }),
    null,
  );
  assert.equal(STORY_GROUP_DIRECTION_DOMINANCE, 1.05);
});

test("normal taps do not trigger vertical group navigation", () => {
  assert.equal(
    getStoryGroupSwipeDirection({ dx: 1, dy: 5, vx: 0, vy: 0.01 }),
    null,
  );
});

test("next-group vertical target opens the next group's first story", () => {
  assert.deepEqual(
    getStoryGroupSwipeTarget({
      direction: "next",
      currentGroupIndex: 1,
      groupCount: 4,
      targetGroupStoryCount: 3,
    }),
    { groupIndex: 2, storyIndex: 0 },
  );
});

test("previous-group vertical target opens the previous group's last story", () => {
  assert.deepEqual(
    getStoryGroupSwipeTarget({
      direction: "previous",
      currentGroupIndex: 2,
      groupCount: 4,
      targetGroupStoryCount: 3,
    }),
    { groupIndex: 1, storyIndex: 2 },
  );
});

test("downward vertical group swipe does not depend on current story index", () => {
  const targetFromFirstStory = getStoryGroupSwipeTarget({
    direction: "previous",
    currentGroupIndex: 2,
    groupCount: 4,
    targetGroupStoryCount: 1,
  });
  const targetFromLaterStory = getStoryGroupSwipeTarget({
    direction: "previous",
    currentGroupIndex: 2,
    groupCount: 4,
    targetGroupStoryCount: 1,
  });

  assert.deepEqual(targetFromFirstStory, { groupIndex: 1, storyIndex: 0 });
  assert.deepEqual(targetFromLaterStory, targetFromFirstStory);
});

test("first and last group boundaries do not wrap", () => {
  assert.equal(
    getStoryGroupSwipeTarget({
      direction: "previous",
      currentGroupIndex: 0,
      groupCount: 3,
      targetGroupStoryCount: 2,
    }),
    null,
  );
  assert.equal(
    getStoryGroupSwipeTarget({
      direction: "next",
      currentGroupIndex: 2,
      groupCount: 3,
      targetGroupStoryCount: 2,
    }),
    null,
  );
});

test("vertical drag feedback is bounded symmetrically", () => {
  assert.equal(clampStoryGroupDrag(300), STORY_GROUP_DRAG_LIMIT);
  assert.equal(clampStoryGroupDrag(-300), -STORY_GROUP_DRAG_LIMIT);
  assert.equal(clampStoryGroupDrag(40), 40);
  assert.equal(clampStoryGroupDrag(-40), -40);
});

test("raw release distance and velocity classify intent independently of visual clamping", () => {
  assert.equal(clampStoryGroupDrag(300), STORY_GROUP_DRAG_LIMIT);
  assert.equal(
    getStoryGroupSwipeDirection({ dx: 4, dy: 300, vx: 0, vy: 0.01 }),
    "previous",
  );
  assert.equal(
    getStoryGroupSwipeDirection({
      dx: 4,
      dy: 8,
      vx: 0,
      vy: STORY_GROUP_SWIPE_VELOCITY + 0.08,
    }),
    "previous",
  );
});

test("upward pager positions next group below the viewport during drag", () => {
  assert.equal(
    getStoryGroupAdjacentTranslateY({
      direction: "next",
      dragY: -120,
      viewportHeight: 800,
    }),
    680,
  );
  assert.equal(getStoryGroupCommitTranslateY("next", 800), -800);
});

test("downward pager positions previous group above the viewport during drag", () => {
  assert.equal(
    getStoryGroupAdjacentTranslateY({
      direction: "previous",
      dragY: 120,
      viewportHeight: 800,
    }),
    -680,
  );
  assert.equal(getStoryGroupCommitTranslateY("previous", 800), 800);
});

test("commit duration stays bounded by the short transition convention", () => {
  assert.equal(
    getStoryGroupCommitDuration(800, 800, 800),
    STORY_GROUP_SWIPE_COMMIT_MIN_DURATION_MS,
  );
  assert.equal(
    getStoryGroupCommitDuration(0, 800, 800),
    STORY_GROUP_SWIPE_COMMIT_MAX_DURATION_MS,
  );
  assert.ok(
    getStoryGroupCommitDuration(0, 800, 800, 1.2) <
      STORY_GROUP_SWIPE_COMMIT_MAX_DURATION_MS,
  );
});

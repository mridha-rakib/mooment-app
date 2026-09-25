export const STORY_GROUP_ACTIVATION_DISTANCE = 12;
export const STORY_GROUP_DIRECTION_DOMINANCE = 1.05;
export const STORY_GROUP_SWIPE_DISTANCE = 40;
export const STORY_GROUP_SWIPE_VELOCITY = 0.35;
export const STORY_GROUP_DRAG_LIMIT = 120;
export const STORY_GROUP_SWIPE_COMMIT_MIN_DURATION_MS = 120;
export const STORY_GROUP_SWIPE_COMMIT_MAX_DURATION_MS = 220;

export type StoryGroupSwipeDirection = "next" | "previous";

// -------------------------------------------------------------------------
// Horizontal Story paging (finger-tracked, mirrors the vertical group pager).
// "next" = swipe left (advance), "previous" = swipe right (go back).
// -------------------------------------------------------------------------

// Distance (px) before a horizontal pan claims the PanResponder. Matches the
// pre-existing inline capture distance.
export const STORY_HORIZONTAL_ACTIVATION_DISTANCE = 24;
// A fast flick under the activation distance still claims the pan so it can
// never fall through to the tap zones as a screen-half tap.
export const STORY_HORIZONTAL_ACTIVATION_VELOCITY = 0.5;
// Horizontal movement must dominate vertical by this ratio to be treated as a
// horizontal Story swipe (mirror of STORY_GROUP_DIRECTION_DOMINANCE).
export const STORY_HORIZONTAL_DIRECTION_DOMINANCE = 1.15;
// Commit when the finger has travelled at least this fraction of the Story
// canvas width, OR flicked faster than the velocity threshold below.
export const STORY_HORIZONTAL_COMMIT_DISTANCE_RATIO = 0.25;
export const STORY_HORIZONTAL_COMMIT_VELOCITY = 0.4;
export const STORY_HORIZONTAL_SWIPE_COMMIT_MIN_DURATION_MS = 140;
export const STORY_HORIZONTAL_SWIPE_COMMIT_MAX_DURATION_MS = 220;

export type StoryHorizontalSwipeDirection = "next" | "previous";

type HorizontalGesture = {
  dx: number;
  dy: number;
  vx: number;
};

// Should a still-moving horizontal pan claim the responder? Earlier capture on
// a fast flick is what stops short flicks being mis-read as taps.
export const shouldCaptureHorizontalStorySwipe = ({
  dx,
  dy,
  vx,
}: HorizontalGesture): boolean => {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx <= absDy * STORY_HORIZONTAL_DIRECTION_DOMINANCE) {
    return false;
  }

  return (
    absDx > STORY_HORIZONTAL_ACTIVATION_DISTANCE ||
    Math.abs(vx) > STORY_HORIZONTAL_ACTIVATION_VELOCITY
  );
};

// Axis+direction of an in-progress horizontal drag (used only to pick which
// adjacent Story to preview while the finger is down — never to commit).
export const getHorizontalStorySwipeDirection = ({
  dx,
  dy,
}: {
  dx: number;
  dy: number;
}): StoryHorizontalSwipeDirection | null => {
  if (Math.abs(dx) <= Math.abs(dy) * STORY_HORIZONTAL_DIRECTION_DOMINANCE) {
    return null;
  }

  return dx < 0 ? "next" : "previous";
};

export const clampHorizontalStoryDrag = (dx: number, canvasWidth: number) => {
  const limit = Math.max(canvasWidth, 1);
  return Math.max(-limit, Math.min(limit, dx));
};

export const getHorizontalAdjacentTranslateX = ({
  direction,
  dragX,
  canvasWidth,
}: {
  direction: StoryHorizontalSwipeDirection;
  dragX: number;
  canvasWidth: number;
}) => (direction === "next" ? canvasWidth + dragX : -canvasWidth + dragX);

export const getHorizontalCommitTranslateX = (
  direction: StoryHorizontalSwipeDirection,
  canvasWidth: number,
) => (direction === "next" ? -canvasWidth : canvasWidth);

export const getHorizontalCommitDuration = (
  currentDragX: number,
  targetDragX: number,
  canvasWidth: number,
  releaseVelocity = 0,
) => {
  const travelRatio = Math.min(
    1,
    Math.abs(targetDragX - currentDragX) / Math.max(canvasWidth, 1),
  );
  const velocityRatio = Math.min(1, Math.abs(releaseVelocity) / 1.2);
  const duration =
    STORY_HORIZONTAL_SWIPE_COMMIT_MIN_DURATION_MS +
    (STORY_HORIZONTAL_SWIPE_COMMIT_MAX_DURATION_MS -
      STORY_HORIZONTAL_SWIPE_COMMIT_MIN_DURATION_MS) *
      travelRatio *
      (1 - velocityRatio * 0.45);

  return Math.round(duration);
};

// The one commit decision, on release. Width-aware (not the old absolute 60px
// rule) and can never resolve to more than one adjacent Story.
export const shouldCommitHorizontalStorySwipe = ({
  translationX,
  velocityX,
  translationY,
  canvasWidth,
}: {
  translationX: number;
  velocityX: number;
  translationY: number;
  canvasWidth: number;
}): StoryHorizontalSwipeDirection | null => {
  const absX = Math.abs(translationX);
  const absY = Math.abs(translationY);

  if (absX <= absY * STORY_HORIZONTAL_DIRECTION_DOMINANCE) {
    return null;
  }

  const distanceThreshold =
    Math.max(canvasWidth, 1) * STORY_HORIZONTAL_COMMIT_DISTANCE_RATIO;

  if (
    translationX < -distanceThreshold ||
    velocityX < -STORY_HORIZONTAL_COMMIT_VELOCITY
  ) {
    return "next";
  }

  if (
    translationX > distanceThreshold ||
    velocityX > STORY_HORIZONTAL_COMMIT_VELOCITY
  ) {
    return "previous";
  }

  return null;
};

type StoryGroupGesture = {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
};

type StoryGroupSwipeTargetOptions = {
  direction: StoryGroupSwipeDirection;
  currentGroupIndex: number;
  groupCount: number;
  targetGroupStoryCount: number;
};

export const clampStoryGroupDrag = (dy: number) =>
  Math.max(-STORY_GROUP_DRAG_LIMIT, Math.min(STORY_GROUP_DRAG_LIMIT, dy));

export const clampStoryGroupPagerDrag = (dy: number, viewportHeight: number) =>
  Math.max(-viewportHeight, Math.min(viewportHeight, dy));

export const getStoryGroupAdjacentTranslateY = ({
  direction,
  dragY,
  viewportHeight,
}: {
  direction: StoryGroupSwipeDirection;
  dragY: number;
  viewportHeight: number;
}) => (direction === "next" ? viewportHeight + dragY : -viewportHeight + dragY);

export const getStoryGroupCommitTranslateY = (
  direction: StoryGroupSwipeDirection,
  viewportHeight: number,
) => (direction === "next" ? -viewportHeight : viewportHeight);

export const getStoryGroupCommitDuration = (
  currentDragY: number,
  targetDragY: number,
  viewportHeight: number,
  releaseVelocity = 0,
) => {
  const travelRatio = Math.min(
    1,
    Math.abs(targetDragY - currentDragY) / Math.max(viewportHeight, 1),
  );
  const velocityRatio = Math.min(1, Math.abs(releaseVelocity) / 1.2);
  const duration =
    STORY_GROUP_SWIPE_COMMIT_MIN_DURATION_MS +
    (STORY_GROUP_SWIPE_COMMIT_MAX_DURATION_MS -
      STORY_GROUP_SWIPE_COMMIT_MIN_DURATION_MS) *
      travelRatio *
      (1 - velocityRatio * 0.45);

  return Math.round(duration);
};

export const getStoryGroupSwipeDirection = ({
  dx,
  dy,
  vy,
}: StoryGroupGesture): StoryGroupSwipeDirection | null => {
  if (Math.abs(dy) <= Math.abs(dx) * STORY_GROUP_DIRECTION_DOMINANCE) {
    return null;
  }

  if (dy < -STORY_GROUP_SWIPE_DISTANCE || vy < -STORY_GROUP_SWIPE_VELOCITY) {
    return "next";
  }

  if (dy > STORY_GROUP_SWIPE_DISTANCE || vy > STORY_GROUP_SWIPE_VELOCITY) {
    return "previous";
  }

  return null;
};

export const getStoryGroupSwipeTarget = ({
  direction,
  currentGroupIndex,
  groupCount,
  targetGroupStoryCount,
}: StoryGroupSwipeTargetOptions) => {
  if (direction === "next") {
    if (currentGroupIndex >= groupCount - 1) {
      return null;
    }

    return {
      groupIndex: currentGroupIndex + 1,
      storyIndex: 0,
    };
  }

  if (currentGroupIndex <= 0) {
    return null;
  }

  return {
    groupIndex: currentGroupIndex - 1,
    storyIndex: Math.max(targetGroupStoryCount - 1, 0),
  };
};

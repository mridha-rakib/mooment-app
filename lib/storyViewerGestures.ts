export const STORY_GROUP_ACTIVATION_DISTANCE = 12;
export const STORY_GROUP_DIRECTION_DOMINANCE = 1.05;
export const STORY_GROUP_SWIPE_DISTANCE = 40;
export const STORY_GROUP_SWIPE_VELOCITY = 0.35;
export const STORY_GROUP_DRAG_LIMIT = 120;
export const STORY_GROUP_SWIPE_COMMIT_MIN_DURATION_MS = 120;
export const STORY_GROUP_SWIPE_COMMIT_MAX_DURATION_MS = 220;

export type StoryGroupSwipeDirection = "next" | "previous";

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

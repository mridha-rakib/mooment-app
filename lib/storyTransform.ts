// Normalized transform model for freeform Story image/text placement.
//
// x/y are the normalized position of the object's visual center within its
// canvas (0.5, 0.5 = canvas center), mirroring the coordinate convention
// StoryTextOverlay already shipped with (see lib/stories.ts). Storing
// fractions of the canvas instead of raw pixels keeps a composition
// portable across different phone screen sizes/aspect ratios: both the
// editor and the viewer independently multiply by their own measured
// canvas size.
export type StoryTransform = {
  x: number;
  y: number;
  scale: number;
  /** Degrees, not radians — easier to read/validate than radians. */
  rotation: number;
};

export const DEFAULT_IMAGE_TRANSFORM: StoryTransform = {
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
};

// MIN/MAX_IMAGE_SCALE: 0.5x floor keeps the image from shrinking into an
// unreadable sliver; 4x ceiling gives generous zoom headroom. Neither bound
// triggers a re-decode of the source bitmap — scale is a display-only CSS
// transform applied to the already-decoded image — so both are safe on
// low-memory Android.
export const MIN_IMAGE_SCALE = 0.5;
export const MAX_IMAGE_SCALE = 4;

// Text keeps using its existing S/M/L preset range (0.85–1.2) as the
// practical default, but the gesture-driven ceiling/floor are kept wider so
// a manual pinch-adjacent rotation gesture never feels clamped mid-gesture.
export const MIN_TEXT_SCALE = 0.4;
export const MAX_TEXT_SCALE = 3;

// How far an object's center may be dragged past the canvas edge before
// being clamped, expressed as a fraction of canvas size. 0.6 lets a user
// push most of the object off-canvas for creative framing (e.g. an image
// mostly cropped by the edge) while guaranteeing it never becomes
// completely unreachable/undraggable-back.
export const POSITION_BOUND_MIN = -0.6;
export const POSITION_BOUND_MAX = 1.6;

// These four helpers are called directly from Reanimated/Gesture Handler
// worklets (useDraggableStoryTransform.ts's Pan/Pinch/Rotation
// .onUpdate/.onEnd callbacks run on the UI thread). Reanimated only
// auto-workletizes functions written inline in the same file as those
// callbacks — a helper imported from another module (like this one) must
// carry its own "worklet" directive, or calling it from the UI thread
// throws "Tried to synchronously call a non-worklet function". `clamp`
// needs the directive too even though no callback calls it directly,
// because clampStoryTransformPosition/Scale call it *from inside* what is
// now a worklet — the same error reproduces one level deeper otherwise.
export const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

export const clampStoryTransformPosition = (
  value: number,
  min: number = POSITION_BOUND_MIN,
  max: number = POSITION_BOUND_MAX,
) => {
  "worklet";
  return clamp(value, min, max);
};

export const clampStoryTransformScale = (
  value: number,
  min: number,
  max: number,
) => {
  "worklet";
  return clamp(value, min, max);
};

// Keeps rotation reported/stored within (-180, 180] degrees so repeated
// full turns don't make the persisted value grow without bound.
export const normalizeRotationDegrees = (degrees: number) => {
  "worklet";
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
};

// Lets the publish step omit `imageTransform` entirely when the user never
// touched the image, so an untouched image Story keeps producing exactly
// the same payload (and legacy cover rendering) it always has.
export const isDefaultStoryTransform = (
  transform: StoryTransform,
  reference: StoryTransform = DEFAULT_IMAGE_TRANSFORM,
) =>
  transform.x === reference.x &&
  transform.y === reference.y &&
  transform.scale === reference.scale &&
  (transform.rotation ?? 0) === (reference.rotation ?? 0);

export const isFiniteStoryTransform = (
  value: unknown,
): value is StoryTransform => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoryTransform>;
  return (
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y) &&
    typeof candidate.scale === "number" &&
    Number.isFinite(candidate.scale) &&
    (candidate.rotation === undefined ||
      (typeof candidate.rotation === "number" &&
        Number.isFinite(candidate.rotation)))
  );
};

// Viewer-side gate shared by both transformed-image render sites in
// view-story.tsx: only a fully-valid transform may enter the transformed
// rendering branch. null/undefined (legacy Story, never touched by the
// editor) and any truthy-but-malformed/partial shape both fall back to
// the pre-existing legacy cover rendering — never a partial repair.
export const hasValidStoryImageTransform = (
  value: unknown,
): value is StoryTransform => value != null && isFiniteStoryTransform(value);

// Thin wrappers over expo-haptics for social micro-interactions (like,
// follow, save, join, check-in). Consolidates the ad-hoc `Haptics.*` calls
// already scattered across FeedPost / CommentsModal / SuccessToast into one
// import, and adds the `.catch()` guard those call sites were missing.
//
// Contract, matching lib/successFeedback.ts:
//  - never throws, never blocks the caller, never awaits.
//  - purely additive feedback: touches no state, no navigation, no network.
//
// Visual motion (the scale "pop", crossfades) is what respects Reduce Motion —
// see usePopAnimation. Haptics are a distinct accessibility channel and are
// left to the OS's own haptics setting, preserving the existing unconditional
// behavior of the current call sites.
import * as Haptics from 'expo-haptics';

/** Light tap to accompany an optimistic social toggle. */
export function tapFeedback(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Success notification cue (e.g. a completed check-in). */
export function successFeedback(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => {},
  );
}

/** Error notification cue (e.g. a rejected check-in). */
export function errorFeedback(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
    () => {},
  );
}

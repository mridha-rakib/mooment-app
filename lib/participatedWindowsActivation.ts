// Whether switching INTO the Scenes ("Windows") tab (isActive flips
// false → true) should trigger its own background refresh. The very
// first-ever activation is already covered by ParticipatedWindowsList's
// existing useFocusEffect (whichever of the two fires first on mount), so
// this only ever fires for a RETURN visit, once cached content already
// exists — never a duplicate of the first load.
export const shouldRefreshParticipatedWindowsOnActivate = (
  isActive: boolean,
  wasActive: boolean,
  hasLoadedOnce: boolean,
): boolean => isActive && !wasActive && hasLoadedOnce;

// A background refresh failure must never replace already-cached Scenes
// content with the blocking "Scenes unavailable" error view — only show it
// when there is nothing cached to fall back to.
export const shouldShowParticipatedWindowsBlockingError = (
  loadError: string | null,
  itemCount: number,
): boolean => Boolean(loadError) && itemCount === 0;

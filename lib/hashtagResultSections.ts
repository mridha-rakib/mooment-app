// Section visibility for the hashtag results screen is driven purely by entity-typed
// counts — events only ever come from getHashtagEvents (EventResponse[]), posts only ever
// come from getHashtagMoments mapped to PostData[]. Neither array can contain the other's
// entity type, so "does this section have content" is the whole rule; no per-item type
// inference is needed or should be added here.
export type HashtagResultSections = {
  showEvents: boolean;
  showPosts: boolean;
};

export const getHashtagResultSections = (
  eventCount: number,
  postCount: number,
): HashtagResultSections => ({
  showEvents: eventCount > 0,
  showPosts: postCount > 0,
});

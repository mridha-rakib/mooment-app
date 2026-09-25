// Centralized Smart Feed tuning for the client-side diversity pass. This is
// the mobile-side counterpart to xenog-api's
// src/modules/feed/smart-feed-ranking.ts — that module owns the backend
// scoring formula; this one owns the one post-sort rule applied after the
// backend-ranked Posts/Events/Reposts are merged into the final feed order
// (buildFeedItems in app/app/(tabs)/home.tsx), since only the client sees
// that final mixed order.
export const SMART_FEED_DIVERSITY = {
  // Approved product rule: at most this many consecutive feed items may
  // share the same creator before a lower-ranked item from another creator
  // is pulled forward to interleave.
  maxConsecutiveSameAuthor: 2,
} as const;

// A minimal shape covering post/event/repost content items as merged in
// buildFeedItems — enough to read a creator id without depending on the
// full PostData/EventResponse/MomentTimelineItem types.
type DiversityCandidate = {
  authorId?: string;
  userId?: string;
  moment?: { userId?: string };
};

// Reuses whatever creator-identity field each content type already exposes:
// Posts carry authorId, Events carry userId (the host), and a repost card's
// "creator" is the ORIGINAL content's author (moment.userId) — a repost is
// still that author's content resurfacing in the feed, so it counts toward
// the same repetition budget as their own posts, matching the product goal
// of controlling how often one creator's content shows up, not just how
// often one card type does.
export const getSmartFeedCreatorId = (data: DiversityCandidate): string | undefined =>
  data.authorId ?? data.userId ?? data.moment?.userId;

// Post-sort diversity pass: caps consecutive same-creator items at
// SMART_FEED_DIVERSITY.maxConsecutiveSameAuthor by pulling the next
// highest-ranked alternate-creator item forward. Preserves the incoming
// (score-ranked) relative order otherwise, drops nothing, and never loops
// indefinitely — each pass removes exactly one item from the remaining
// pool, so it always terminates in items.length steps. If every remaining
// item shares the same creator, that creator's items simply continue in
// their existing order (no gap is invented).
export const applySmartFeedAuthorDiversity = <T>(
  items: T[],
  getCreatorId: (item: T) => string | undefined,
  maxConsecutiveSameAuthor: number = SMART_FEED_DIVERSITY.maxConsecutiveSameAuthor,
): T[] => {
  if (items.length <= maxConsecutiveSameAuthor) {
    return items;
  }

  const remaining = [...items];
  const result: T[] = [];
  let lastCreatorId: string | undefined;
  let consecutiveCount = 0;

  while (remaining.length > 0) {
    let pickIndex = 0;

    if (consecutiveCount >= maxConsecutiveSameAuthor) {
      const alternateIndex = remaining.findIndex((item) => getCreatorId(item) !== lastCreatorId);
      pickIndex = alternateIndex === -1 ? 0 : alternateIndex;
    }

    const [picked] = remaining.splice(pickIndex, 1);
    const creatorId = getCreatorId(picked);

    consecutiveCount = creatorId !== undefined && creatorId === lastCreatorId ? consecutiveCount + 1 : 1;
    lastCreatorId = creatorId;
    result.push(picked);
  }

  return result;
};

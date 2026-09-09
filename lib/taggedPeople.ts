import type { MomentAuthor } from '@/lib/moments';

// Single source of truth for tagged-person display + list normalization, shared
// by RepostFeedCard's compact "with ..." header sentence and the read-only
// TaggedPeopleSheet so the two can never drift apart.

// name > username > generic fallback — the exact behaviour the header has always used.
export const getTaggedFriendName = (friend: Pick<MomentAuthor, 'name' | 'username'>) =>
  friend.name?.trim() || friend.username?.trim() || 'Mooment user';

// Defensive dedupe by id — first occurrence wins, authoritative order kept,
// input array never mutated. Creation/validation already dedupes ids server-side;
// this only guards a malformed payload from rendering the same person twice.
export const dedupeTaggedPeople = <T extends { id?: string }>(people: T[]): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const person of people) {
    const key = person.id || `__anon_${result.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(person);
  }
  return result;
};

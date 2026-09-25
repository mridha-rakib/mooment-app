// Append a freshly fetched page onto the rows already on screen, dropping any
// row whose stable id is already present. Existing rows keep their positions;
// only genuinely new ids are appended. Used for hashtag-destination Post/Event
// pagination so an overlapping page (page 1 = A B C, page 2 = C D E) renders
// A B C D E, never A B C C D E, and a row removed between pages is never
// resurrected by a later page.
export const mergeById = <T>(
  existing: T[],
  next: T[],
  getId: (item: T) => string,
): T[] => {
  const seen = new Set(existing.map(getId));
  const merged = existing.slice();

  for (const item of next) {
    const id = getId(item);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(item);
    }
  }

  return merged;
};

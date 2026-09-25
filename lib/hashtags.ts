const HASHTAG_PATTERN = /#[\p{L}\p{N}_]+/gu;

export const normalizeHashtag = (value: string): string => {
  const normalized = value.normalize('NFKC').trim().replace(/^#+/, '').toLocaleLowerCase();
  return (normalized.match(/^[\p{L}\p{N}_]+/u)?.[0] ?? '').slice(0, 64);
};

export const extractHashtags = (value: string, limit = 20): string[] => {
  const hashtags = new Set<string>();

  for (const match of value.matchAll(HASHTAG_PATTERN)) {
    const hashtag = normalizeHashtag(match[0]);
    if (hashtag) hashtags.add(hashtag);
    if (hashtags.size >= limit) break;
  }

  return [...hashtags];
};

export const parseHashtagFilterInput = (value: string, limit = 20): string[] =>
  [...new Set(value.split(/[\s,]+/).map(normalizeHashtag).filter(Boolean))].slice(0, limit);

export const splitHashtagText = (value: string): { text: string; hashtag?: string }[] => {
  const parts: { text: string; hashtag?: string }[] = [];
  let cursor = 0;

  for (const match of value.matchAll(HASHTAG_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ text: value.slice(cursor, index) });
    parts.push({ text: match[0], hashtag: normalizeHashtag(match[0]) });
    cursor = index + match[0].length;
  }

  if (cursor < value.length) parts.push({ text: value.slice(cursor) });
  return parts;
};

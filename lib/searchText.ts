// Tiny mirror of the API's free-text search normalizer
// (xenog-api src/core/utils/search-text.ts). Used ONLY to decide whether a typed
// Event query is "empty" after normalization (so punctuation-only / whitespace
// input falls back to the existing zero-query behaviour instead of hitting the
// server). Ranking/matching still happens entirely on the backend.

const CURLY_APOSTROPHES = /[‘’ʼ]/g;
// Includes \p{M} (combining marks) so Indic / Arabic vowel signs stay attached
// to their base letter instead of being treated as token boundaries.
const WORD_CHAR = /[\p{L}\p{N}\p{M}_]/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

export const normalizeSearchText = (input: string | null | undefined): string => {
  const source = String(input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(CURLY_APOSTROPHES, "'");

  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]!;

    if (WORD_CHAR.test(ch)) {
      out += ch;
      continue;
    }

    if (ch === "'" || ch === '-') {
      const prev = source[i - 1];
      const next = source[i + 1];
      if (prev && next && LETTER_OR_NUMBER.test(prev) && LETTER_OR_NUMBER.test(next)) {
        out += ch;
        continue;
      }
    }

    out += ' ';
  }

  return out.replace(/\s+/g, ' ').trim();
};

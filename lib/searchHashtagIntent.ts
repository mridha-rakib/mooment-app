import { normalizeHashtag } from "./hashtags";

export type SearchFilter = "All" | "People" | "Events" | "Hashtags";
// 'PostsInline' is not a real tab/chip — it's the inline hashtag-matched Posts section on
// the All tab, which needs its own visibility rule (see isSearchSectionVisible below).
export type SearchSectionFilter = Exclude<SearchFilter, "All"> | "PostsInline";

export type HashtagSearchIntent = {
  // A literal leading `#` was typed — this is what the Events section (in any tab) and the
  // inline Posts section key off of. Plain text must never be reinterpreted as this.
  isExplicitHashtagIntent: boolean;
  // Explicit `#` OR the Hashtags tab itself is selected with non-empty text — the Hashtags
  // tab already expresses hashtag intent, so plain text there is treated as a keyword too.
  hashtagSectionIntentActive: boolean;
  // Normalized keyword to search, or '' when there is no hashtag intent at all.
  hashtagSectionQuery: string;
};

export const getHashtagSearchIntent = (
  rawQuery: string,
  activeFilter: SearchFilter,
): HashtagSearchIntent => {
  const trimmedQuery = rawQuery.trim();
  const isExplicitHashtagIntent = trimmedQuery.startsWith("#");
  const hashtagSectionIntentActive =
    isExplicitHashtagIntent || (activeFilter === "Hashtags" && trimmedQuery.length > 0);

  return {
    isExplicitHashtagIntent,
    hashtagSectionIntentActive,
    hashtagSectionQuery: hashtagSectionIntentActive ? normalizeHashtag(trimmedQuery) : "",
  };
};

// Every section is visible under "All" plus its own matching tab, EXCEPT 'PostsInline',
// which has no tab of its own — it must appear only alongside the other All-tab sections,
// never under People/Events/Hashtags where it would look like it belongs to that tab.
export const isSearchSectionVisible = (
  sectionFilter: SearchSectionFilter,
  activeFilter: SearchFilter,
): boolean => {
  if (sectionFilter === "PostsInline") {
    return activeFilter === "All";
  }

  return activeFilter === "All" || sectionFilter === activeFilter;
};

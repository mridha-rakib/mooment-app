import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Event Repost row-height stabilization.
//
// The Feed micro-jitter audit proved the event-repost row changed its
// contributed vertical height across mount/remount:
//   Frame 1  transient "unavailable" fallback  (~195px)
//   Frame 2  loading placeholder               (362px)
//   Frame 3  loaded embedded EventFeedCard      (~384px + caption)
//
// This fix keeps all product behaviour (fetch, cache, error handling, the
// final EventFeedCard, navigation, interactions) and only stabilizes the
// transient geometry:
//   * seed eventLoading=true so the FIRST render is the placeholder, never
//     the false "unavailable" frame;
//   * render one shared header/caption block in every event-repost state;
//   * reserve the placeholder at the real embedded EventFeedCard in-flow
//     height (1 + 64 + 250 + 68 + 1 = 384).
//
// Source-level assertions, matching this repo's established test convention
// (no React Native render harness here).

const repostSource = readFileSync(
  join(process.cwd(), "components/post/RepostFeedCard.tsx"),
  "utf8",
);
const eventFeedCardSource = readFileSync(
  join(process.cwd(), "components/home/EventFeedCard.tsx"),
  "utf8",
);
const feedPostSource = readFileSync(
  join(process.cwd(), "components/post/FeedPost.tsx"),
  "utf8",
);
const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");

// 1. Event repost starts in the loading state when the event must be resolved.
test("1. eventLoading is seeded true for an event repost that has an original event id", () => {
  assert.match(
    repostSource,
    /const \[eventLoading, setEventLoading\] = useState\(\s*\(\) => isEvent && Boolean\(share\.originalItem\?\.id\),?\s*\)/,
  );
});

// 2. First committed render is the loading branch, not the unavailable branch,
//    for a valid-but-unresolved event repost (the `if (eventLoading)` return
//    comes before the `!event` unavailable check, and loading now starts true).
test("2. loading branch returns before the unavailable/!event branch", () => {
  const loadingIdx = repostSource.indexOf("if (eventLoading) {");
  const unavailableIdx = repostSource.indexOf("eventUnavailable || !event ?");
  assert.ok(loadingIdx > 0 && unavailableIdx > 0);
  assert.ok(loadingIdx < unavailableIdx);
});

// 3. Genuine unavailable / error resolution still renders the existing UI.
test("3. real unavailable + error handling is unchanged", () => {
  assert.match(repostSource, /\.catch\(\(\) => \{ if \(mounted\) setEventUnavailable\(true\); \}\)/);
  assert.match(repostSource, /eventUnavailable \|\| !event \?/);
  assert.match(repostSource, /<UnavailableCard \/>/);
  assert.match(repostSource, /styles\.sharedEventFallbackFrame/);
});

// 4. Loading and loaded event-repost branches share the same header/wrapper
//    flow geometry.
test("4. loading and loaded branches use the shared eventHeaderArea + sharedEventWrapper", () => {
  assert.match(repostSource, /const eventHeaderArea = \(\s*<View style=\{styles\.shareHeaderArea\}>/);
  // Rendered in both the loading return and the loaded return.
  assert.equal((repostSource.match(/\{eventHeaderArea\}/g) ?? []).length, 2);
  // Both event-repost returns use the same outer wrapper; the old
  // sharedEventLoadingWrapper is gone.
  assert.equal((repostSource.match(/<View style=\{styles\.sharedEventWrapper\}>/g) ?? []).length, 2);
  assert.doesNotMatch(repostSource, /sharedEventLoadingWrapper/);
});

// 5. Repost caption geometry is reserved consistently (real caption, real
//    style, no placeholder text, no numberOfLines / truncation added).
test("5. caption is rendered once, from the real share.repostCaption, inside the shared header block", () => {
  const headerAreaStart = repostSource.indexOf("const eventHeaderArea = (");
  const renderBranchStart = repostSource.indexOf("if (isEvent) {", headerAreaStart);
  const headerAreaBlock = repostSource.slice(headerAreaStart, renderBranchStart);

  assert.match(headerAreaBlock, /share\.repostCaption\?\.trim\(\) \?/);
  assert.match(headerAreaBlock, /style=\{\[styles\.sharedEventMessage, \{ color: colors\.text \}\]\}/);
  assert.match(headerAreaBlock, /\{share\.repostCaption\.trim\(\)\}/);
  // No truncation controls introduced on the caption.
  assert.doesNotMatch(headerAreaBlock, /numberOfLines/);

  // The caption style is referenced only from the one shared block — the event
  // render branch never renders its own second caption.
  assert.equal((repostSource.match(/sharedEventMessage(?!:)/g) ?? []).length, 1);
});

// 6. Loading placeholder card geometry is based on the documented current
//    EventFeedCard in-flow blocks, not the old shorter placeholder.
test("6. placeholder reserves the real embedded EventFeedCard in-flow height (384) and 68px actions", () => {
  assert.match(repostSource, /eventLoadingCard:\s*\{\s*minHeight:\s*384,/);
  assert.match(repostSource, /eventLoadingCard:[\s\S]*?marginHorizontal:\s*16,/);
  assert.match(repostSource, /eventLoadingCard:[\s\S]*?marginBottom:\s*20,/);
  assert.match(repostSource, /eventLoadingHeader:\s*\{\s*minHeight:\s*64,/);
  assert.match(repostSource, /eventLoadingImage:\s*\{\s*height:\s*250,/);
  assert.match(repostSource, /eventLoadingActions:\s*\{[\s\S]*?minHeight:\s*68,/);
});

test("6b. the EventFeedCard blocks the 384 derivation is based on are still those values", () => {
  // header: paddingVertical 12 + host avatar 40  -> 64
  assert.match(eventFeedCardSource, /header:\s*\{[\s\S]*?paddingTop:\s*12,[\s\S]*?paddingBottom:\s*12,/);
  assert.match(eventFeedCardSource, /avatar:\s*\{\s*\n?\s*width:\s*40,\s*\n?\s*height:\s*40,/);
  // image: fixed 250
  assert.match(eventFeedCardSource, /imageContainer:\s*\{\s*\n?\s*height:\s*250,/);
  // actionBar: paddingVertical 12 (+ PostInteractionBar action minHeight 44 -> 68)
  assert.match(eventFeedCardSource, /actionBar:\s*\{[\s\S]*?paddingVertical:\s*12,/);
  // embedded repost card keeps a 1px border in both themes
  assert.match(eventFeedCardSource, /embeddedCardDark:\s*\{\s*\n?\s*borderWidth:\s*1,/);
  assert.match(eventFeedCardSource, /embedded && \(isDark \? styles\.embeddedCardDark : \{ borderWidth: 1, borderColor: colors\.border \}\)/);
});

// 7 + 8. Normal-post repost and general non-event repost behaviour unchanged.
test("7. normal-post repost still maps synchronously and renders the embedded FeedPost", () => {
  assert.match(repostSource, /const post = useMemo\(\(\) => \{\s*\n\s*if \(isEvent\) return null;\s*\n\s*return mapMomentToPost\(share\.moment,/);
  assert.match(repostSource, /<FeedPost post=\{post\} onSharePress=\{\(\) => setShareVisible\(true\)\} embedded isActiveVideo=\{isActiveVideo\} \/>/);
});

test("8. the event vs non-event split and the non-event repostCard wrapper are unchanged", () => {
  assert.match(repostSource, /const isEvent = share\.originalItem\?\.type === 'event';/);
  assert.match(repostSource, /repostCard:\s*\{\s*\n\s*marginHorizontal:\s*16,\s*\n\s*marginBottom:\s*20,\s*\n\s*borderRadius:\s*18,\s*\n\s*padding:\s*12,/);
});

// 9. Event fetch / cache call behaviour unchanged.
test("9. the cached event fetch + mounted-guarded setState chain is unchanged", () => {
  assert.match(repostSource, /getEventByIdCached\(eventId\)\s*\n\s*\.then\(\(value\) => \{ if \(mounted\) setEvent\(value\); \}\)\s*\n\s*\.catch\(\(\) => \{ if \(mounted\) setEventUnavailable\(true\); \}\)\s*\n\s*\.finally\(\(\) => \{ if \(mounted\) setEventLoading\(false\); \}\)/);
  assert.match(repostSource, /\}, \[isEvent, share\.originalItem\?\.id\]\);/);
  assert.match(repostSource, /setEventLoading\(true\);/); // effect still asserts loading on (re)mount
});

// 10. No new API / backend field / request introduced.
test("10. RepostFeedCard adds no direct network call and no new events import", () => {
  assert.doesNotMatch(repostSource, /\bapi\.(get|post|put|patch|delete)\b/);
  assert.match(repostSource, /import \{ getEventByIdCached, type EventResponse \} from '@\/lib\/events'/);
});

// 11. EventFeedCard is not modified by this fix (final geometry is the source
//     of truth the placeholder adapts to).
test("11. EventFeedCard embedded render + props remain exactly as before", () => {
  assert.match(repostSource, /<EventFeedCard event=\{event\} onRepostSuccess=\{onRepostSuccess\} embedded \/>/);
  assert.match(eventFeedCardSource, /embedded = false \}: Props\)/);
});

// 12. FlatList / home Feed wiring untouched.
test("12. home Feed still renders RepostFeedCard unchanged and keeps its list config", () => {
  assert.match(homeSource, /<RepostFeedCard\s*\n\s*share=\{item\.data\}/);
  assert.match(homeSource, /windowSize=\{7\}/);
  assert.match(homeSource, /removeClippedSubviews=\{Platform\.OS === 'android'\}/);
  assert.match(homeSource, /keyExtractor=\{\(item\) => item\.id\}/);
});

// 13. Image.getSize path untouched.
test("13. CroppedFeedImage Image.getSize path is untouched and RepostFeedCard never touches it", () => {
  assert.match(feedPostSource, /Image\.getSize\(/);
  assert.doesNotMatch(repostSource, /getSize/);
});

// 14. Video flags / dormant Video code untouched.
test("14. dormant Video wiring is untouched — isActiveVideo still passes straight through", () => {
  assert.match(repostSource, /isActiveVideo = false,/);
  assert.match(repostSource, /isActiveVideo=\{isActiveVideo\}/);
  assert.doesNotMatch(repostSource, /VIDEO_PLAYBACK_ENABLED\s*=/);
});

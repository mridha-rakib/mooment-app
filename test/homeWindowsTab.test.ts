import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the new Home "Windows" tab — participated Events/Windows
// navigation surface — at the source level (this repo has no React Native
// component render harness; see videoUploadDisabled.test.ts for the
// established convention this follows).

const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");
const storyCarouselSource = readFileSync(join(process.cwd(), "components/home/StoryCarousel.tsx"), "utf8");
const participatedListSource = readFileSync(join(process.cwd(), "components/home/ParticipatedWindowsList.tsx"), "utf8");
const participatedWindowsScreenSource = readFileSync(join(process.cwd(), "app/event-screen/participated-windows.tsx"), "utf8");
const windowGallerySource = readFileSync(join(process.cwd(), "app/event-screen/window-gallery.tsx"), "utf8");
const eventWindowsLibSource = readFileSync(join(process.cwd(), "lib/eventWindows.ts"), "utf8");

const getFunctionSource = (source: string, name: string, nextMarker: string) => {
  const start = source.indexOf(name);
  assert.notEqual(start, -1, `${name} should exist`);
  const end = source.indexOf(nextMarker, start + 1);
  assert.notEqual(end, -1, `${nextMarker} should exist after ${name}`);
  return source.slice(start, end);
};

// 1 — Home tabs render Discover / Friends / Windows
test("Home renders a third \"Windows\" pill alongside the existing Discover/Friends pills", () => {
  assert.match(storyCarouselSource, /showWindowsTab \? \(/);
  assert.match(storyCarouselSource, />\s*Windows\s*</);
  assert.match(homeSource, /showWindowsTab/);
  assert.match(homeSource, /onWindowsPress=\{\(\) => handleHomeAudienceChange\('windows'\)\}/);
});

// Selector row stays on the same Home surface for all three modes — it must
// be rendered once, above the Feed/Windows content switch, not inside the
// branch that gets swapped out when Windows is selected (that was the bug:
// the pills lived inside StoryCarousel, which only rendered as part of the
// FlatList that Windows mode replaced entirely).
test("HomeTabsRow (the selector) is rendered once, before the Feed-vs-Windows content switch, so it never disappears when Windows is selected", () => {
  assert.match(storyCarouselSource, /export function HomeTabsRow/);

  const tabsRowIndex = homeSource.indexOf("<HomeTabsRow");
  const windowsBranchIndex = homeSource.indexOf("homeAudience === 'windows' && selectedType === 'Feed' ?");
  assert.notEqual(tabsRowIndex, -1, "home.tsx should render HomeTabsRow");
  assert.notEqual(windowsBranchIndex, -1, "home.tsx should branch on homeAudience === 'windows'");
  assert.ok(
    tabsRowIndex < windowsBranchIndex,
    "HomeTabsRow must be rendered before (outside of) the Windows/Feed content branch",
  );

  // Only one <HomeTabsRow — no duplicate selector row for Windows mode.
  const tabsRowOccurrences = homeSource.split("<HomeTabsRow").length - 1;
  assert.equal(tabsRowOccurrences, 1);

  // StoryCarousel itself no longer owns the pills — they were extracted so
  // the row can be shared across content modes without duplication.
  assert.doesNotMatch(storyCarouselSource, /function StoryCarousel\([^)]*onActiveTabChange/);
});

// Windows pill must visually reflect selection, unlike the prior hard-coded
// `isWindowsActive={false}`.
test("the Windows pill reflects the actual active state instead of being hard-coded inactive", () => {
  assert.match(homeSource, /isWindowsActive=\{homeAudience === 'windows'\}/);
  assert.doesNotMatch(homeSource, /isWindowsActive=\{false\}/);
});

// Map mode is untouched: the selector only applies to the Feed surface, so
// switching to Map must not newly show (or hide any differently-positioned
// copy of) the tabs.
test("the selector row only renders in Feed mode, leaving Map behavior untouched", () => {
  assert.match(
    homeSource,
    /\{selectedType === 'Feed' \? \(\s*<HomeTabsRow/,
    "HomeTabsRow should be gated on selectedType === 'Feed'",
  );
});

// Light-mode pill colors must differ from the frozen dark-mode ones, i.e. an
// isDark branch actually exists, and the dark-mode branch preserves the
// original hard-coded hex values exactly.
test("light-mode pill colors are theme-aware while dark-mode pixel values stay exactly as before", () => {
  assert.match(storyCarouselSource, /isDark \? "#23232D" : "#F5F5F7"/);
  assert.match(storyCarouselSource, /isDark \? "#9B9BA8" : "#8E8E9B"/);
  // The active-pill purple and its white text are untouched (approved in both themes).
  assert.match(storyCarouselSource, /activeTab: \{ backgroundColor: "#AC86D4" \}/);
  assert.match(storyCarouselSource, /activeTabText: \{ color: "#FFFFFF" \}/);
});

// 2 & 3 — Discover/Friends unchanged
test("Discover/Friends still flow through the original, unmodified handleAudienceChange / feedAudience state", () => {
  assert.match(homeSource, /const \[feedAudience, setFeedAudience\] = useState<FeedAudience>\("discover"\);/);
  const handleAudienceChangeFn = getFunctionSource(
    homeSource,
    "const handleAudienceChange = useCallback((audience: FeedAudience) => {",
    "// Discover/Friends still flow through",
  );
  // The body is untouched: still guards on feedAudience, still calls
  // beginAudienceTransition/setFeedAudience/loadFeed exactly as before —
  // no reference to homeAudience or "windows" leaked into this function.
  assert.match(handleAudienceChangeFn, /beginAudienceTransition\(\);/);
  assert.match(handleAudienceChangeFn, /setFeedAudience\(audience\);/);
  assert.match(handleAudienceChangeFn, /loadFeed\(audience\);/);
  assert.doesNotMatch(handleAudienceChangeFn, /windows/);
});

test("selecting Discover or Friends still routes through handleAudienceChange unchanged; only \"windows\" is new", () => {
  const handleHomeAudienceChangeFn = getFunctionSource(
    homeSource,
    "const handleHomeAudienceChange = useCallback",
    "}, [handleAudienceChange]);",
  );
  assert.match(handleHomeAudienceChangeFn, /if \(tab !== "windows"\) \{\s*handleAudienceChange\(tab\);/);
});

// 4 — Windows empty state
test("Windows tab shows a clean empty state when the user has never participated", () => {
  assert.match(participatedListSource, /No participated Windows yet\./);
  assert.match(participatedListSource, /Events will appear here after you post in one of their Windows\./);
});

// 5 & 6 — only participated events render, each event appears once
test("the Windows list renders exactly the events array returned by getParticipatedEvents — no client-side event fetching or dedup logic needed beyond the API response", () => {
  assert.match(participatedListSource, /getParticipatedEvents\(\)/);
  assert.match(participatedListSource, /events\.map\(\(event\) => \{/);
  // No separate per-event Window fetch — the whole list, including nested
  // participatedWindows, comes from the single participation endpoint.
  assert.doesNotMatch(participatedListSource, /getEventWindows\(/);
});

// 7 & 8 — tapping an event opens only its participated windows
test("tapping an Event card navigates with only that event's already-scoped participatedWindows, never the full Window list", () => {
  const openEventFn = getFunctionSource(participatedListSource, "const openEvent = (event: ParticipatedEvent) => {", "if (isLoading)");
  assert.match(openEventFn, /pathname: "\/event-screen\/participated-windows"/);
  assert.match(openEventFn, /event: JSON\.stringify\(event\)/);

  // The detail screen only ever iterates event.participatedWindows — it
  // never calls getEventWindows (the full per-event Window list used by the
  // normal Event Details "Window" tab).
  assert.match(participatedWindowsScreenSource, /event\.participatedWindows\.map/);
  assert.doesNotMatch(participatedWindowsScreenSource, /getEventWindows\(/);
});

// 9 & 10 — instant vs end-of-event lock state comes from the server, not local recomputation
test("lock/unlock state is read directly from the server's canViewPosts — no local event-completed recomputation", () => {
  const openWindowFn = getFunctionSource(participatedWindowsScreenSource, "const openWindow = (window: ParticipatedWindow) => {", "};");
  assert.match(openWindowFn, /if \(!window\.canViewPosts\) \{/);
  assert.doesNotMatch(participatedWindowsScreenSource, /event\.status === ["']completed["']/);
});

// 11 & 12 — locked tap shows a message, never opens the gallery
test("tapping a locked Window shows an availability alert and returns before any navigation/gallery call", () => {
  const openWindowFn = getFunctionSource(participatedWindowsScreenSource, "const openWindow = (window: ParticipatedWindow) => {", "};");
  const lockedBranch = openWindowFn.slice(0, openWindowFn.indexOf("router.push"));
  assert.match(lockedBranch, /Alert\.alert\("Locked", "Available after the event ends\."\)/);
  assert.match(lockedBranch, /return;/);
});

// 13 — unlocked tap opens the gallery, backend re-verifies
test("tapping an unlocked Window navigates to the gallery screen, which independently re-fetches via the existing authorized endpoint", () => {
  assert.match(participatedWindowsScreenSource, /pathname: "\/event-screen\/window-gallery"/);
  assert.match(windowGallerySource, /getEventWindowPosts\(params\.eventId, params\.windowId/);
  assert.match(windowGallerySource, /independently re-verif/);
});

// 14 — gallery reuses the existing accepted-post API, not a new content system
test("the gallery screen reuses lib/eventWindows.ts's existing getEventWindowPosts — no new post-fetching endpoint or Moment conversion", () => {
  assert.match(eventWindowsLibSource, /export const getEventWindowPosts = async/);
  assert.match(windowGallerySource, /from "@\/lib\/eventWindows"/);
  assert.doesNotMatch(windowGallerySource, /toMoment|convertToMoment|MomentModel/);
});

// 15 — refresh after new participation
test("the Windows list refetches on focus (covers new participation and returning from a Window)", () => {
  assert.match(participatedListSource, /useFocusEffect\(/);
  assert.match(participatedListSource, /void load\(!hasLoadedOnceRef\.current\)/);
});

test("the Windows tab does not copy the attendee tab's 30-second polling — this is a navigation surface, not a live feed", () => {
  assert.doesNotMatch(participatedListSource, /setInterval/);
});

// 16 — video still disabled
test("the new gallery screen keeps video disabled, matching the project-wide flag, and never renders a video player", () => {
  assert.match(windowGallerySource, /const EVENT_WINDOW_VIDEO_ENABLED = false;/);
  assert.doesNotMatch(windowGallerySource, /useVideoPlayer|<VideoView/);
  assert.match(windowGallerySource, /<GalleryVideoDisabled/);
});

// Additional: no leakage of other participants' posts from the index endpoint's mobile type
test("ParticipatedWindow mobile type carries navigation metadata only — no post content fields", () => {
  const typeStart = eventWindowsLibSource.indexOf("export type ParticipatedWindow = {");
  const typeEnd = eventWindowsLibSource.indexOf("};", typeStart);
  const participatedWindowType = eventWindowsLibSource.slice(typeStart, typeEnd);
  assert.doesNotMatch(participatedWindowType, /text|mediaItems/);
});

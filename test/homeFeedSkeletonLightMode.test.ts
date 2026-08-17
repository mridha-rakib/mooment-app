import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Home Feed loading-skeleton light-mode fix. The skeleton
// (FeedSkeletonBlock/Card/List, EventFeedSkeletonList, PendingVideoPostSkeleton
// in app/(tabs)/home.tsx) previously used fixed dark-mode colors copied from
// the dark post card (rgba(17,17,17,0.85) card + rgba(255,255,255,0.12)
// placeholder blocks) with no useTheme() call at all, so it rendered dark
// regardless of the active theme. Source-level regex assertions, matching
// this repo's established convention (no React Native render harness here).

const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");

test("FeedSkeletonBlock is theme-aware and keeps the exact previous dark placeholder color", () => {
  assert.match(
    homeSource,
    /function FeedSkeletonBlock\(\{ pulse, style, isDark \}: \{ pulse: Animated\.Value; style: object; isDark: boolean \}\)/,
  );
  assert.match(
    homeSource,
    /backgroundColor: isDark \? "rgba\(255, 255, 255, 0\.12\)" : "rgba\(0, 0, 0, 0\.08\)"/,
  );
});

test("FeedSkeletonCard threads isDark to every placeholder block and applies a light-only card surface", () => {
  assert.match(
    homeSource,
    /function FeedSkeletonCard\(\{ pulse, isDark \}: \{ pulse: Animated\.Value; isDark: boolean \}\)/,
  );
  assert.match(homeSource, /styles\.feedSkeletonCard, !isDark && styles\.feedSkeletonCardLight/);
  const blockCalls = homeSource.match(/<FeedSkeletonBlock pulse=\{pulse\}/g) ?? [];
  const blockCallsWithIsDark = homeSource.match(/<FeedSkeletonBlock pulse=\{pulse\} isDark=\{isDark\}/g) ?? [];
  assert.equal(blockCalls.length, blockCallsWithIsDark.length);
  assert.equal(blockCalls.length, 8);
});

test("feedSkeletonCard (dark) keeps its exact approved pixel value; feedSkeletonCardLight is a new, additive style", () => {
  assert.match(
    homeSource,
    /feedSkeletonCard: \{\s*marginHorizontal: 16,\s*marginBottom: 20,\s*borderRadius: 12,\s*overflow: "hidden",\s*backgroundColor: "rgba\(17, 17, 17, 0\.85\)",\s*\}/,
  );
  assert.match(
    homeSource,
    /feedSkeletonCardLight: \{\s*backgroundColor: "#FFFFFF",\s*borderWidth: 1,\s*borderColor: "#ECECEF",\s*\}/,
  );
});

test("FeedSkeletonList, EventFeedSkeletonList, and PendingVideoPostSkeleton all source isDark from useTheme() and pass it down", () => {
  const listFnBody = homeSource.slice(
    homeSource.indexOf("function FeedSkeletonList()"),
    homeSource.indexOf("function EventFeedSkeletonList()"),
  );
  const eventListFnBody = homeSource.slice(
    homeSource.indexOf("function EventFeedSkeletonList()"),
    homeSource.indexOf("function PendingVideoPostSkeleton()"),
  );
  const pendingFnBody = homeSource.slice(
    homeSource.indexOf("function PendingVideoPostSkeleton()"),
    homeSource.indexOf("export default function HomeFeed()"),
  );

  for (const body of [listFnBody, eventListFnBody, pendingFnBody]) {
    assert.match(body, /const \{ isDark \} = useTheme\(\);/);
  }

  assert.match(listFnBody, /<FeedSkeletonCard key=\{item\} pulse=\{pulse\} isDark=\{isDark\} \/>/);
  assert.match(eventListFnBody, /<FeedSkeletonCard key=\{item\} pulse=\{pulse\} isDark=\{isDark\} \/>/);
  assert.match(pendingFnBody, /<FeedSkeletonCard pulse=\{pulse\} isDark=\{isDark\} \/>/);
});

test("skeleton animation timing/loop and layout constants are untouched", () => {
  const pulseTimings = homeSource.match(/duration: 650,/g) ?? [];
  assert.equal(pulseTimings.length, 6, "3 skeleton components x 2 Animated.timing calls each");
  assert.match(homeSource, /feedSkeletonAvatar: \{\s*width: 40,\s*height: 40,\s*borderRadius: 20,/);
  assert.match(homeSource, /feedSkeletonMedia: \{\s*width: "100%",\s*aspectRatio: 1,/);
});

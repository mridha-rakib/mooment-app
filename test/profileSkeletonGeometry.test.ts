import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the new Profile skeleton primitives (components/ui/Skeleton.tsx,
// components/ui/FadeInOnReady.tsx, components/profile/ProfileSkeletons.tsx)
// and their wiring into ProfileHeader/ProfileBio/ProfileContent/ProfileEvents.
// Verifies exact-geometry placeholders, theme-awareness matching the
// established Home Feed skeleton convention, and that no loaded-UI styling
// changed. Source-level regex assertions, matching this repo's convention.

const skeletonSource = readFileSync(join(process.cwd(), "components/ui/Skeleton.tsx"), "utf8");
const fadeSource = readFileSync(join(process.cwd(), "components/ui/FadeInOnReady.tsx"), "utf8");
const profileSkeletonsSource = readFileSync(join(process.cwd(), "components/profile/ProfileSkeletons.tsx"), "utf8");
const headerSource = readFileSync(join(process.cwd(), "components/profile/ProfileHeader.tsx"), "utf8");
const bioSource = readFileSync(join(process.cwd(), "components/profile/ProfileBio.tsx"), "utf8");
const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");

test("SkeletonBlock reuses the exact established pulse timing and color convention", () => {
  assert.match(skeletonSource, /duration: 650/);
  assert.match(skeletonSource, /useNativeDriver: true/);
  assert.match(skeletonSource, /isDark \? "rgba\(255, 255, 255, 0\.12\)" : "rgba\(0, 0, 0, 0\.08\)"/);
});

test("SkeletonBlock is hidden from the accessibility tree, matching the Home Feed skeleton convention", () => {
  assert.match(skeletonSource, /accessibilityElementsHidden/);
  assert.match(skeletonSource, /importantForAccessibility="no-hide-descendants"/);
});

test("ProfileAvatarSkeleton reserves exactly the same 80x80/radius-40 geometry as the real avatar", () => {
  assert.match(profileSkeletonsSource, /avatar: \{\s*width: 80,\s*height: 80,\s*borderRadius: 40,\s*\}/);
  // The real avatar in ProfileHeader is UserAvatar size={80}, and its outer
  // avatarBorder ring (86x86/radius 43) is untouched by the skeleton swap.
  assert.match(headerSource, /size=\{80\}/);
  assert.match(headerSource, /avatarBorder: \{\s*width: 86,\s*height: 86,\s*borderRadius: 43,/);
});

test("ProfileStatsRowSkeleton renders exactly three columns, matching Events/Reviews/Friends", () => {
  assert.match(profileSkeletonsSource, /\[0, 1, 2\]\.map/);
});

test("FadeInOnReady is a one-shot, opacity-only, ~150ms transition (no slide/scale/bounce)", () => {
  assert.match(fadeSource, /FADE_DURATION_MS = 150/);
  assert.match(fadeSource, /toValue: 1/);
  assert.doesNotMatch(fadeSource, /translateX|translateY|scale|rotate/i);
  assert.match(fadeSource, /useNativeDriver: true/);
});

test("no setTimeout/artificial stagger exists anywhere in the new skeleton/fade primitives", () => {
  for (const source of [skeletonSource, fadeSource, profileSkeletonsSource]) {
    assert.doesNotMatch(source, /setTimeout/);
  }
});

test("Profile feed/events card skeleton geometry matches the Home Feed skeleton card convention", () => {
  const homeAvatar = homeSource.match(/feedSkeletonAvatar: \{\s*width: 40,\s*height: 40,\s*borderRadius: 20,/);
  const profileAvatar = profileSkeletonsSource.match(/cardAvatar: \{\s*width: 40,\s*height: 40,\s*borderRadius: 20,/);
  assert.ok(homeAvatar, "Home Feed card-avatar skeleton geometry not found (fixture assumption changed)");
  assert.ok(profileAvatar, "Profile card-avatar skeleton geometry does not match Home Feed's");

  const homeMedia = homeSource.match(/feedSkeletonMedia: \{\s*width: "100%",\s*aspectRatio: 1,/);
  const profileMedia = profileSkeletonsSource.match(/cardMedia: \{\s*width: "100%",\s*aspectRatio: 1,/);
  assert.ok(homeMedia);
  assert.ok(profileMedia);
});

test("Home Feed skeleton source (an out-of-scope file) was not modified by this task", () => {
  // This task creates a new, additive Profile skeleton primitive rather than
  // refactoring the existing Home/AllEvents/AboutTab skeletons.
  assert.match(homeSource, /function FeedSkeletonBlock\(\{ pulse, style, isDark \}: \{ pulse: Animated\.Value; style: object; isDark: boolean \}\)/);
});

test("ProfileHeader avatar and stats row swap to skeletons only while loading, real content is FadeInOnReady-wrapped", () => {
  assert.match(headerSource, /identityLoading \? \(\s*<ProfileAvatarSkeleton \/>/);
  assert.match(headerSource, /statsLoading \? \(\s*<ProfileStatsRowSkeleton \/>/);
  assert.match(headerSource, /<FadeInOnReady>\s*<UserAvatar/);
  assert.match(headerSource, /<FadeInOnReady style=\{styles\.statsContainer\}>/);
});

test("ProfileHeader's real avatar/stat props keep Events/Reviews and aggregate Friends from followers/following", () => {
  assert.match(headerSource, /uri=\{avatar\}/);
  assert.match(headerSource, /\{stats\.events\}/);
  assert.match(headerSource, /\{stats\.reviews\}/);
  assert.match(headerSource, /\{stats\.followers \+ stats\.following\}/);
});

test("ProfileBio swaps to an identity text skeleton only while loading, and its real typography is untouched", () => {
  assert.match(bioSource, /if \(identityLoading\) \{/);
  assert.match(bioSource, /<ProfileIdentityTextSkeleton \/>/);
  // Untouched real styles: name 18/bold, handle 13, bio 13/lineHeight 18.
  assert.match(bioSource, /name: \{\s*fontSize: 18,\s*fontWeight: "bold",\s*\}/);
  assert.match(bioSource, /handle: \{\s*fontSize: 13,/);
  assert.match(bioSource, /bioText: \{\s*fontSize: 13,\s*lineHeight: 18,/);
});

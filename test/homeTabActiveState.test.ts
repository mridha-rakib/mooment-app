import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Home Discover/Friends/Windows selector's "exactly one active
// pill at a time" bug: HomeTabsRow's `activeTab` prop was previously bound
// to `feedAudience` (the Discover/Friends data-fetching state), which is
// never cleared when Windows is selected — so Discover (or Friends) stayed
// visually active at the same time as Windows. Source-level regex
// assertions, matching this repo's established convention (see
// homeWindowsTab.test.ts / videoUploadDisabled.test.ts) since there is no
// React Native component render harness here.

const homeSource = readFileSync(join(process.cwd(), "app/(tabs)/home.tsx"), "utf8");

test("HomeTabsRow's activeTab is derived from the single canonical homeAudience value, not feedAudience", () => {
  assert.match(
    homeSource,
    /<HomeTabsRow[\s\S]{0,600}activeTab=\{homeAudience === 'windows' \? null : homeAudience\}/,
  );
  // The old, buggy binding must be gone from the HomeTabsRow call.
  const homeTabsRowIndex = homeSource.indexOf("<HomeTabsRow");
  const nextTagIndex = homeSource.indexOf("/>", homeTabsRowIndex);
  const homeTabsRowCall = homeSource.slice(homeTabsRowIndex, nextTagIndex);
  assert.doesNotMatch(homeTabsRowCall, /activeTab=\{feedAudience\}/);
});

test("isWindowsActive is always recomputed from homeAudience — no independent/stale boolean", () => {
  assert.match(homeSource, /isWindowsActive=\{homeAudience === 'windows'\}/);
});

test("selecting discover, friends, or windows each activates exactly one pill (mutually exclusive by construction)", () => {
  // activeTab and isWindowsActive both derive from the same homeAudience
  // value, so for any given homeAudience there is exactly one match:
  //   homeAudience === 'discover' -> activeTab === 'discover', isWindowsActive === false
  //   homeAudience === 'friends'  -> activeTab === 'friends',  isWindowsActive === false
  //   homeAudience === 'windows'  -> activeTab === null,       isWindowsActive === true
  const deriveActiveTab = (homeAudience: 'discover' | 'friends' | 'windows') =>
    homeAudience === 'windows' ? null : homeAudience;
  const deriveIsWindowsActive = (homeAudience: 'discover' | 'friends' | 'windows') =>
    homeAudience === 'windows';

  for (const homeAudience of ['discover', 'friends', 'windows'] as const) {
    const activeTab = deriveActiveTab(homeAudience);
    const isWindowsActive = deriveIsWindowsActive(homeAudience);
    const discoverActive = activeTab === 'discover';
    const friendsActive = activeTab === 'friends';
    const activeCount = [discoverActive, friendsActive, isWindowsActive].filter(Boolean).length;
    assert.equal(activeCount, 1, `expected exactly one active pill for homeAudience=${homeAudience}`);
  }
});

test("no duplicate HomeTabsRow — still exactly one selector row", () => {
  const occurrences = homeSource.split("<HomeTabsRow").length - 1;
  assert.equal(occurrences, 1);
});

test("the selector still only renders in Feed mode — Map mode untouched", () => {
  assert.match(homeSource, /\{selectedType === 'Feed' \? \(\s*<HomeTabsRow/);
});

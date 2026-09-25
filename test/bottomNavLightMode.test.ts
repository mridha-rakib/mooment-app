import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the bottom navigation light-mode theme fix. Root cause: the tab
// layout never called useTheme() — NAV_BAR_BACKGROUND/NAV_BAR_ICON_ACTIVE/
// NAV_BAR_ICON_INACTIVE were hard-coded module constants (black bar, white
// active icon, light-gray inactive icon), including inside the custom SVG
// icon paths (a mask trick where the Home icon's inner cutout is filled
// with the bar's own background color). In light mode this rendered a
// black bar with white icons regardless of the theme setting.
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const layoutSource = readFileSync(join(process.cwd(), "app/(tabs)/_layout.tsx"), "utf8");

test("the tab layout is now theme-aware (previously had no useTheme() call at all)", () => {
  assert.match(layoutSource, /import \{ useTheme \} from "@\/hooks\/useTheme";/);
  assert.match(layoutSource, /const \{ colors, isDark \} = useTheme\(\);/);
});

test("dark mode keeps the exact pre-existing pixel values (approved, frozen)", () => {
  assert.match(layoutSource, /const NAV_BAR_BACKGROUND_DARK = "#000000";/);
  assert.match(layoutSource, /const NAV_BAR_ICON_ACTIVE_DARK = "#FFFFFF";/);
  assert.match(layoutSource, /const NAV_BAR_ICON_INACTIVE_DARK = "#B3B3B3";/);
  assert.match(layoutSource, /const NAV_BAR_BACKGROUND = isDark \? NAV_BAR_BACKGROUND_DARK : colors\.backgroundSecondary;/);
  assert.match(layoutSource, /const NAV_BAR_ICON_ACTIVE = isDark \? NAV_BAR_ICON_ACTIVE_DARK : NAV_BAR_ICON_ACTIVE_LIGHT;/);
  assert.match(layoutSource, /const NAV_BAR_ICON_INACTIVE = isDark \? NAV_BAR_ICON_INACTIVE_DARK : colors\.textSecondary;/);
});

test("light mode uses a light bar background (a step off pure white) instead of black", () => {
  assert.match(layoutSource, /const NAV_BAR_BACKGROUND = isDark \? NAV_BAR_BACKGROUND_DARK : colors\.backgroundSecondary;/);
});

test("light mode's active icon uses the app's existing brand accent, not a black/white inversion (which would blank the Messages icon's hard-coded dark dot strokes)", () => {
  assert.match(layoutSource, /const NAV_BAR_ICON_ACTIVE_LIGHT = "#AC86D4";/);
  // The Messages icon's inner dot strokes are hard-coded near-black and
  // expect a light fill behind them — this must stay untouched, since it's
  // exactly why the active fill can't simply flip to black in light mode.
  assert.match(layoutSource, /stroke="#111111"/);
});

test("light mode gets a border + subtle upward shadow for separation from the white page; dark mode's zero-border/zero-shadow treatment is untouched", () => {
  assert.match(layoutSource, /isDark\s*\?\s*\{ elevation: 0, shadowOpacity: 0, shadowColor: "transparent" \}/);
  assert.match(layoutSource, /borderWidth: 1,\s*borderColor: colors\.border,\s*shadowColor: "#000000",\s*shadowOpacity: 0\.08,/);
});

test("notification badge styling is untouched", () => {
  assert.match(layoutSource, /notificationBadge: \{[\s\S]*?backgroundColor: "#F2245C",/);
  assert.match(layoutSource, /notificationBadgeText: \{[\s\S]*?color: "#FFFFFF",/);
});

test("profile avatar rendering is untouched", () => {
  assert.match(layoutSource, /<UserAvatar uri=\{tabAvatarUri\} name=\{tabAvatarName\} size=\{NAV_ICON_SIZE\} \/>/);
});

test("the center Add button's route interception and icon are untouched", () => {
  assert.match(layoutSource, /name="add"/);
  assert.match(layoutSource, /Feather name="plus-circle" size=\{NAV_ICON_SIZE\} color=\{color\}/);
  assert.match(layoutSource, /e\.preventDefault\(\);\s*openAddModal\(\);/);
});

test("tab count and route names are unchanged", () => {
  const screenNames = [...layoutSource.matchAll(/name="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(screenNames, ["home", "explore", "add", "messages", "profile"]);
});

test("tab bar dimensions/spacing/height are untouched", () => {
  assert.match(layoutSource, /const NAV_BAR_BASE_HEIGHT = 72;/);
  assert.match(layoutSource, /const NAV_BAR_MAX_WIDTH = 440;/);
  assert.match(layoutSource, /const NAV_ICON_SIZE = 32;/);
  assert.match(layoutSource, /borderTopLeftRadius: 12,\s*borderTopRightRadius: 12,/);
});

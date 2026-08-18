import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Event feed card overlay containment fix: category chips were
// escaping upward past the image overlay when they wrapped to a second row
// (3 long category names, narrow Android widths). Root cause: infoOverlay
// and infoPanel used a hardcoded `height` sized for a single-line chip
// guess. Content taller than that guess still rendered (justifyContent:
// "flex-end" anchors content to the bottom of the box), so the excess
// pushed up past the box's top edge instead of being contained. The fix
// swaps `height` for `minHeight` (same box size in the common case, but the
// box now grows to fit taller content instead of overflowing it) and makes
// the accent bar stretch to match the panel's real height instead of a
// second independently-hardcoded number.
// Source-level regex assertions, matching this repo's established
// convention (no React Native component render harness here).

const eventFeedCardSource = readFileSync(join(process.cwd(), "components/home/EventFeedCard.tsx"), "utf8");

test("overlayLayout no longer hardcodes a fixed `height` for the overlay/panel (that's what let taller content overflow upward)", () => {
  assert.doesNotMatch(eventFeedCardSource, /overlay:\s*\{\s*bottom:\s*\d+,\s*height:/);
  assert.doesNotMatch(eventFeedCardSource, /panel:\s*\{\s*height:/);
});

test("overlayLayout uses minHeight so the panel can grow to fit wrapped chips instead of clipping/overflowing", () => {
  assert.match(eventFeedCardSource, /overlay:\s*\{\s*bottom:\s*6,\s*minHeight:\s*176,\s*paddingBottom:\s*8\s*\}/);
  assert.match(eventFeedCardSource, /panel:\s*\{\s*minHeight:\s*160,\s*paddingVertical:\s*8,\s*gap:\s*4\s*\}/);
});

test("tagsRow still wraps chips instead of forcing them onto one row (multi-category case)", () => {
  assert.match(eventFeedCardSource, /tagsRow:\s*\{[^}]*flexWrap:\s*"wrap"/);
});

test("accentBar no longer takes an inline height prop computed from overlayLayout.panel.height", () => {
  assert.doesNotMatch(eventFeedCardSource, /styles\.accentBar,\s*\{\s*height:\s*overlayLayout\.panel\.height\s*\}/);
  assert.match(eventFeedCardSource, /<View style={styles\.accentBar} \/>/);
});

test("infoLeft stretches its children (accentBar) to match the panel's real content-driven height", () => {
  assert.match(eventFeedCardSource, /infoLeft:\s*\{[^}]*alignItems:\s*"stretch"/s);
});

test("CTA buttons (View Map / View) are untouched by the overlay containment fix", () => {
  assert.match(eventFeedCardSource, /viewMapBtn:\s*\{\s*backgroundColor:\s*"rgba\(51, 51, 51, 0\.6\)",\s*borderRadius:\s*12,\s*paddingHorizontal:\s*10,\s*paddingVertical:\s*4,\s*width:\s*76,\s*alignItems:\s*"center",\s*\}/);
  assert.match(eventFeedCardSource, /viewBtn:\s*\{\s*backgroundColor:\s*"#FFFFFF",/);
});

test("event lifecycle badge logic (live/upcoming/ended) is untouched by this layout fix", () => {
  assert.match(eventFeedCardSource, /const getEventBadgeStatus = \(event: EventLifecycleStatus, nowMs: number\): EventBadgeStatus =>/);
});

test("dark-mode card background/border branch is untouched (cardDark keeps its frozen pixel value)", () => {
  assert.match(eventFeedCardSource, /cardDark:\s*\{\s*backgroundColor:\s*"rgba\(17, 17, 17, 0\.95\)",\s*\}/);
});

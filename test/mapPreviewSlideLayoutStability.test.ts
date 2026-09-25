import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  EVENT_CARD_HORIZONTAL_INSET,
  MAP_PREVIEW_CONTAINER_PADDING,
  MAP_PREVIEW_SLIDE_MIN_HEIGHT,
  MAP_PREVIEW_STATUS_REGION_HEIGHT,
} from "../constants/eventCardLayout.ts";

// Map swipe card (EventPreviewModal) layout-consistency fixes.
//
// Audit found the map swipe card was the unstable surface: no height budget,
// every row in normal flow, conditional rows (live badge, ticketTypeCount)
// changed slide height, unbounded host/date/ticket text could wrap, and the
// View Event CTA was the last flow element so it drifted between slides — the
// horizontal carousel jumped vertically while swiping.
//
// These source-level assertions (repo convention: no RN render harness) lock
// the surgical fix: one derived height budget + reserved status region + a
// flexible spacer that pins the CTA + deterministic text truncation + the
// approved shared metadata order, with EventFeedCard's own geometry and the
// carousel paging math left byte-for-byte equivalent.

const previewSource = readFileSync(
  join(process.cwd(), "components/ui/EventPreviewModal.tsx"),
  "utf8",
);
const mapScreenSource = readFileSync(
  join(process.cwd(), "components/ui/MapScreen.tsx"),
  "utf8",
);
const eventFeedCardSource = readFileSync(
  join(process.cwd(), "components/home/EventFeedCard.tsx"),
  "utf8",
);
const repostSource = readFileSync(
  join(process.cwd(), "components/post/RepostFeedCard.tsx"),
  "utf8",
);
const constantsSource = readFileSync(
  join(process.cwd(), "constants/eventCardLayout.ts"),
  "utf8",
);

// ── 1. Map slide height stability ─────────────────────────────────────────

test("1. every preview slide reserves the same derived layout budget (live vs non-live cannot differ)", () => {
  assert.match(previewSource, /previewSlide:\s*\{[\s\S]*?flexDirection:\s*'column',[\s\S]*?minHeight:\s*MAP_PREVIEW_SLIDE_MIN_HEIGHT,/);
  assert.ok(Number.isFinite(MAP_PREVIEW_SLIDE_MIN_HEIGHT) && MAP_PREVIEW_SLIDE_MIN_HEIGHT > 300);
  // budget is derived from named row parts, not a single hardcoded literal
  assert.match(constantsSource, /HEADER_BLOCK\s*\+/);
  assert.match(constantsSource, /SECONDARY_BLOCK\s*\+/);
  assert.doesNotMatch(constantsSource, /MAP_PREVIEW_SLIDE_MIN_HEIGHT\s*=\s*\d+/);
});

test("2. ticketTypeCount stays conditional but the slide budget already reserves its worst-case row", () => {
  assert.match(previewSource, /\{item\.ticketTypeCount \? \(/);
  // worst-case secondary block in the budget accounts for 3 ticket sub-rows
  assert.match(constantsSource, /METADATA_ROW \* 3 \+ 8 \* 2/);
});

test("3. host subtitle is single-line + ellipsized so a long name cannot add height", () => {
  assert.match(
    previewSource,
    /styles\.subtitle,[\s\S]{0,80}numberOfLines=\{1\}\s*\n\s*ellipsizeMode="tail"/,
  );
  assert.match(previewSource, /headerInfo:\s*\{[\s\S]*?minWidth:\s*0,/);
});

test("4. Start and End date/time detail text is line-limited", () => {
  const matches = previewSource.match(/styles\.detailText, \{ color: colors\.text \}\]\} numberOfLines=\{1\}>/g) ?? [];
  // 2 (start) + 2 (end) + 1 (location) rows
  assert.ok(matches.length >= 5, `expected >=5 line-limited detailText, got ${matches.length}`);
  assert.match(previewSource, /detailText:\s*\{[\s\S]*?flexShrink:\s*1,[\s\S]*?minWidth:\s*0,/);
});

test("5. badge + ticket-info labels are line-limited and shrink instead of growing the card", () => {
  assert.match(previewSource, /styles\.badgeText, \{ color: colors\.text \}\]\} numberOfLines=\{1\}>/);
  assert.match(previewSource, /styles\.ticketInfoText, \{ color: colors\.text \}\]\} numberOfLines=\{1\}>/);
  assert.match(previewSource, /badge:\s*\{[\s\S]*?flexShrink:\s*1,/);
  assert.match(previewSource, /ticketInfoItem:\s*\{[\s\S]*?flexShrink:\s*1,/);
});

test("6. View Event CTA is pinned to a stable bottom position by a flexible spacer", () => {
  assert.match(previewSource, /<View style=\{styles\.flexSpacer\} \/>\s*\n\s*\{\/\* Buttons \*\/\}\s*\n\s*<View style=\{styles\.buttonRow\}>/);
  assert.match(previewSource, /flexSpacer:\s*\{\s*flex:\s*1,\s*\}/);
  // button label / action / icon unchanged
  assert.match(previewSource, /onPress=\{onViewEvent\}/);
  assert.match(previewSource, />View Event<\/Text>/);
  assert.match(previewSource, /name="arrow-right"/);
});

test("7. status region is always rendered with a reserved height (live badge still gated by itemIsLive)", () => {
  assert.match(previewSource, /<View style=\{styles\.statusRow\}>\s*\{itemIsLive \? \(/);
  assert.match(previewSource, /statusRow:\s*\{\s*minHeight:\s*MAP_PREVIEW_STATUS_REGION_HEIGHT,/);
  assert.ok(MAP_PREVIEW_STATUS_REGION_HEIGHT >= 24);
});

// ── Mixed-content (semantics preserved, no fake states) ───────────────────

test("8. sold-out / available and deadline present / missing are label-only (no structural branch)", () => {
  assert.match(previewSource, /\{item\.price \?\? "Free"\}/);
  assert.match(previewSource, /\{item\.ticketsAvailable \?\? "Tickets TBA"\}/);
  assert.match(previewSource, /\{item\.ticketSalesEndDate \?\? "Sales end TBA"\}/);
  // sales-end row is unconditional now (only its text varies)
  assert.doesNotMatch(previewSource, /item\.ticketSalesEndDate \? \(/);
});

test("9. attendee count is still a plain label; 0 vs >0 does not branch layout", () => {
  assert.match(previewSource, /\{item\.attendeesCount \?\? 0\} attending/);
  assert.doesNotMatch(previewSource, /attendeesCount \? \(/);
});

// ── Carousel geometry: must stay pixel-equivalent ─────────────────────────

test("10. itemWidth is derived from named constants and equals the previous literal width - 72", () => {
  assert.equal(2 * (EVENT_CARD_HORIZONTAL_INSET + MAP_PREVIEW_CONTAINER_PADDING), 72);
  assert.match(
    previewSource,
    /const itemWidth = Math\.max\(\s*\n\s*width - 2 \* \(EVENT_CARD_HORIZONTAL_INSET \+ MAP_PREVIEW_CONTAINER_PADDING\),\s*\n\s*1,\s*\n\s*\);/,
  );
  assert.doesNotMatch(previewSource, /width - 72/);
});

test("11. container margin/padding now reference the same constants the width math uses", () => {
  assert.match(previewSource, /marginHorizontal:\s*EVENT_CARD_HORIZONTAL_INSET,/);
  assert.match(previewSource, /padding:\s*MAP_PREVIEW_CONTAINER_PADDING,/);
});

test("12. paging / getItemLayout / index math / marker-selection wiring are unchanged", () => {
  assert.match(previewSource, /horizontal\s*\n\s*pagingEnabled/);
  assert.match(previewSource, /getItemLayout=\{\(_, index\) => \(\{ length: itemWidth, offset: itemWidth \* index, index \}\)\}/);
  assert.match(previewSource, /initialScrollIndex=\{previewItems\.length > 0 \? requestedIndex : undefined\}/);
  assert.match(previewSource, /onMomentumScrollEnd=\{handleScrollEnd\}/);
  assert.match(previewSource, /onScrollEndDrag=\{handleScrollEnd\}/);
  assert.match(previewSource, /commitVisibleIndex\(event\.nativeEvent\.contentOffset\.x \/ itemWidth\)/);
  assert.match(previewSource, /onVisibleEventChange\?\.\(nextItem\.id\)/);
  // MapScreen still drives selection off the carousel's visible-event change
  assert.match(mapScreenSource, /onVisibleEventChange=\{handlePreviewEventChange\}/);
});

// ── Approved shared metadata order (Option C) ─────────────────────────────

test("13. shared-core then map-specific then CTA order is honoured", () => {
  const order = [
    /item\.eventTitle \?\? "Event"/,          // 1 title (in header)
    /<View style=\{styles\.statusRow\}>/,      // 2 status
    />Start<\/Text>/,                          // 3 start date/time
    /item\.location \?\? "Location TBA"/,      // 4 location
    /\}\s*attending/,                          // 5 attending
    /styles\.secondaryDetails/,                // — map-specific block starts
    />End<\/Text>/,                            // 7 end date/time
    /item\.ageLimit \?\? "All Ages"/,          // 8 age
    /item\.price \?\? "Free"/,                 // 9 price
    /item\.ticketsAvailable \?\? "Tickets TBA"/, // 10 tickets remaining
    /item\.ticketSalesEndDate \?\? "Sales end TBA"/, // 11 sales deadline
    />View Event<\/Text>/,                     // 12 CTA
  ];

  let cursor = -1;
  for (const pattern of order) {
    const idx = previewSource.search(pattern);
    assert.ok(idx > cursor, `out of order: ${pattern}`);
    cursor = idx;
  }
});

test("14. attending lives in the primary block; end/age/price/tickets/deadline in the secondary block", () => {
  const primaryStart = previewSource.indexOf("styles.primaryDetails");
  const secondaryStart = previewSource.indexOf("styles.secondaryDetails");
  const spacerStart = previewSource.indexOf("styles.flexSpacer");
  assert.ok(primaryStart > 0 && secondaryStart > primaryStart && spacerStart > secondaryStart);

  const primaryBlock = previewSource.slice(primaryStart, secondaryStart);
  const secondaryBlock = previewSource.slice(secondaryStart, spacerStart);

  assert.match(primaryBlock, /\}\s*attending/);
  assert.match(primaryBlock, /item\.location \?\? "Location TBA"/);
  assert.match(secondaryBlock, />End<\/Text>/);
  assert.match(secondaryBlock, /item\.ageLimit \?\? "All Ages"/);
  assert.match(secondaryBlock, /item\.price \?\? "Free"/);
  assert.match(secondaryBlock, /item\.ticketsAvailable \?\? "Tickets TBA"/);
  assert.match(secondaryBlock, /item\.ticketSalesEndDate \?\? "Sales end TBA"/);
});

// ── No scope creep on the map card ───────────────────────────────────────

test("15. no banner image was added and no engagement/social payload dependency introduced", () => {
  assert.doesNotMatch(previewSource, /<Image[\s/>]/);
  assert.doesNotMatch(previewSource, /expo-image|bannerImageKey|getStorageFileUrl|resizeMode|contentFit/);
  assert.doesNotMatch(previewSource, /interactionMomentId|likesCount|commentsCount|PostInteractionBar|socialContext|avatarKey/);
});

test("16. distance is not duplicated — it stays in the header subtitle only", () => {
  assert.equal((previewSource.match(/distanceLabel/g) ?? []).length, 2); // const + one render usage
  assert.doesNotMatch(previewSource, /Distance<\/Text>/);
});

test("17. crowd badge + live pulse wiring and the disabled Add-to-Calendar path are untouched", () => {
  assert.match(previewSource, /<CrowdStatusBadge eventStatus=\{item\.eventStatus\} crowdStatus=\{item\.crowdStatus\} \/>/);
  assert.match(previewSource, /const showCalendarAction = false;/);
  assert.doesNotMatch(previewSource, /withRepeat|withSequence|withTiming|useSharedValue|setInterval|Animated\.loop/);
});

// ── EventFeedCard regression: reference geometry must not move ─────────────

test("18. EventFeedCard image box stays height 250 with the same fallback/error behaviour", () => {
  assert.match(eventFeedCardSource, /imageContainer:\s*\{\s*\n?\s*height:\s*250,/);
  assert.match(eventFeedCardSource, /onError=\{\(\) => setBannerFailed\(true\)\}/);
  assert.match(eventFeedCardSource, /styles\.bannerFallback/);
});

test("19. EventFeedCard base geometry (header 12/12, avatar 40, actionBar 12) is unchanged", () => {
  assert.match(eventFeedCardSource, /header:\s*\{[\s\S]*?paddingTop:\s*12,[\s\S]*?paddingBottom:\s*12,/);
  assert.match(eventFeedCardSource, /avatar:\s*\{\s*\n?\s*width:\s*40,\s*\n?\s*height:\s*40,/);
  assert.match(eventFeedCardSource, /actionBar:\s*\{[\s\S]*?paddingVertical:\s*12,/);
  assert.match(eventFeedCardSource, /infoLeft:\s*\{[\s\S]*?alignItems:\s*"stretch"/s);
});

test("20. repost loading placeholder still mirrors EventFeedCard geometry (384 / 250)", () => {
  assert.match(repostSource, /eventLoadingCard:\s*\{\s*minHeight:\s*384,/);
  assert.match(repostSource, /eventLoadingImage:\s*\{\s*height:\s*250,/);
});

test("21. the two audited in-flow EventFeedCard text exceptions now have a deterministic line budget", () => {
  assert.match(eventFeedCardSource, /numberOfLines=\{2\} style=\{\[styles\.socialContextText,/);
  assert.match(eventFeedCardSource, /numberOfLines=\{2\} style=\{\[styles\.repostCaption,/);
  // color hierarchy from earlier fixes preserved
  assert.match(eventFeedCardSource, /styles\.socialContextMuted, \{ color: isDark \? "#AFAFB8" : colors\.textSecondary \}/);
});

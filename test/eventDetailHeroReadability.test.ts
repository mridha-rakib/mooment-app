import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Covers the Event Detail hero overlay-readability fix: the bottom metadata
// cluster (host name/handle/privacy, attendee/ticket stats, interaction
// icons) previously rendered in theme-dependent colors (black/gray in light
// mode) with no scrim behind it, so it could blend into bright/busy banner
// artwork. The fix is overlay-only: a bottom gradient sibling layer above the
// image, static image-safe text/icon colors, and a subtle text shadow as a
// secondary safeguard. No image prop, geometry, or business logic changes.
// Source-level regex assertions, matching this repo's established convention
// (no React Native component render harness here).

const eventScreenSource = readFileSync(join(process.cwd(), "app/event-screen/event.tsx"), "utf8");
const crowdStatusBadgeSource = readFileSync(join(process.cwd(), "components/events/CrowdStatusBadge.tsx"), "utf8");

// --- 1. Banner Image node is untouched ---
test("hero banner Image keeps its existing source/contentFit/contentPosition props, nothing added", () => {
  assert.match(
    eventScreenSource,
    /<Image\s*\n\s*source=\{\{ uri: bannerImageUri \}\}\s*\n\s*style=\{styles\.heroImage\}\s*\n\s*contentFit="cover"\s*\n\s*contentPosition=\{bannerContentPosition\}\s*\n\s*\/>/,
  );
});

test("no blurRadius, tintColor, opacity, or filter prop is applied to the hero Image node", () => {
  const imageBlockMatch = eventScreenSource.match(/<Image\s*\n\s*source=\{\{ uri: bannerImageUri \}\}[\s\S]*?\/>/);
  assert.ok(imageBlockMatch, "hero Image block should exist");
  const imageBlock = imageBlockMatch![0];
  assert.doesNotMatch(imageBlock, /blurRadius/);
  assert.doesNotMatch(imageBlock, /tintColor/);
  assert.doesNotMatch(imageBlock, /opacity/);
  assert.doesNotMatch(imageBlock, /filter/);
});

test("heroImage/imageContainer geometry styles are unchanged", () => {
  assert.match(eventScreenSource, /imageContainer:\s*\{\s*width,\s*height:\s*302,\s*position:\s*"relative",\s*overflow:\s*"hidden",\s*\}/);
  assert.match(eventScreenSource, /heroImage:\s*\{\s*width:\s*"100%",\s*height:\s*"100%",\s*\}/);
});

// --- 2. Existing top gradient remains, new bottom gradient added as a sibling layer ---
test("existing top-shade gradient is unchanged", () => {
  assert.match(eventScreenSource, /topShade:\s*\{\s*position:\s*"absolute",\s*left:\s*0,\s*right:\s*0,\s*top:\s*0,\s*height:\s*130,\s*\}/);
});

test("a new bottom-shade gradient protects the metadata cluster, anchored bottom, not covering the full image", () => {
  assert.match(eventScreenSource, /bottomShade:\s*\{\s*position:\s*"absolute",\s*left:\s*0,\s*right:\s*0,\s*bottom:\s*0,\s*height:\s*200,\s*\}/);
  assert.match(
    eventScreenSource,
    /colors=\{\["rgba\(0, 0, 0, 0\)", "rgba\(0, 0, 0, 0\.15\)", "rgba\(0, 0, 0, 0\.68\)"\]\}\s*\n\s*locations=\{\[0, 0\.4, 1\]\}\s*\n\s*style=\{styles\.bottomShade\}/,
  );
});

test("bottom-shade gradient is progressive (transparent top stop), not a flat/opaque panel", () => {
  assert.match(eventScreenSource, /"rgba\(0, 0, 0, 0\)"/);
  assert.doesNotMatch(eventScreenSource, /bottomShade[\s\S]{0,400}colors=\{\["#000", "#000"\]\}/);
});

// --- 3. Attendee/ticket metadata no longer forced to theme black/gray ---
test("PublicGoingSummaryRow in the hero no longer overrides text/separator/trailing colors to colors.text", () => {
  const callSiteMatch = eventScreenSource.match(/<PublicGoingSummaryRow[\s\S]*?\/>/);
  assert.ok(callSiteMatch, "PublicGoingSummaryRow call site should exist");
  const callSite = callSiteMatch![0];
  assert.doesNotMatch(callSite, /separatorStyle=\{\{\s*color:\s*colors\.text\s*\}\}/);
  assert.doesNotMatch(callSite, /trailingTextStyle=\{\{\s*color:\s*colors\.text\s*\}\}/);
  assert.doesNotMatch(callSite, /textStyle=\{\[styles\.statsText,\s*\{\s*color:\s*colors\.text\s*\}\]\}/);
});

test("PublicGoingSummaryRow call site keeps its data props untouched (going summary logic unchanged)", () => {
  assert.match(eventScreenSource, /eventId=\{event\?\.id \?\? eventId\}/);
  assert.match(eventScreenSource, /summary=\{event\?\.publicGoingSummary\}/);
  assert.match(eventScreenSource, /trailingText=\{ticketsLeftText\}/);
});

// --- 4. Host / handle / privacy text uses static image-safe colors ---
test("hostName uses a static white color, not the theme text token", () => {
  assert.match(eventScreenSource, /hostName:\s*\{\s*color:\s*"#FFFFFF",\s*fontSize:\s*15,\s*fontWeight:\s*"bold",\s*\}/);
});

test("hostUser/dotSeparator/privateText use a static translucent-white color, not colors.textSecondary", () => {
  assert.match(eventScreenSource, /hostUser:\s*\{\s*color:\s*"rgba\(255, 255, 255, 0\.78\)",\s*fontSize:\s*12,\s*\}/);
  assert.match(eventScreenSource, /dotSeparator:\s*\{\s*color:\s*"rgba\(255, 255, 255, 0\.78\)",\s*fontSize:\s*12,\s*\}/);
  assert.match(eventScreenSource, /privateText:\s*\{\s*color:\s*"rgba\(255, 255, 255, 0\.78\)",\s*fontSize:\s*12,\s*\}/);
});

test("privacy icon (Feather lock/globe) next to host row uses a static image-safe color, not colors.textSecondary", () => {
  assert.match(
    eventScreenSource,
    /name=\{event\?\.privacy === "private" \|\| event\?\.privacy === "locked" \? "lock" : "globe"\}\s*\n\s*size=\{10\}\s*\n\s*color="rgba\(255, 255, 255, 0\.78\)"/,
  );
});

// --- 5. Subtle text shadow is a supplement, applied consistently, not a glow ---
test("a restrained heroOnImageShadow style exists and is used only as a small dark shadow", () => {
  assert.match(
    eventScreenSource,
    /heroOnImageShadow:\s*\{\s*textShadowColor:\s*"rgba\(0, 0, 0, 0\.45\)",\s*textShadowOffset:\s*\{\s*width:\s*0,\s*height:\s*1\s*\},\s*textShadowRadius:\s*2,\s*\}/,
  );
});

test("heroOnImageShadow is applied to host name, handle, privacy text, and the attendee/ticket stats row", () => {
  assert.match(eventScreenSource, /styles\.hostName,\s*styles\.heroOnImageShadow/);
  assert.match(eventScreenSource, /styles\.hostUser,\s*styles\.heroOnImageShadow/);
  assert.match(eventScreenSource, /styles\.dotSeparator,\s*styles\.heroOnImageShadow/);
  assert.match(eventScreenSource, /styles\.privateText,\s*styles\.heroOnImageShadow/);
  assert.match(eventScreenSource, /styles\.statsText,\s*styles\.heroOnImageShadow/);
});

// --- 6. Interaction icons use image-safe override colors via the existing prop API ---
test("PostInteractionBar in the hero passes image-safe iconColor/countColor overrides instead of relying on theme defaults", () => {
  const callSiteMatch = eventScreenSource.match(/<PostInteractionBar[\s\S]*?\/>/);
  assert.ok(callSiteMatch, "PostInteractionBar call site should exist");
  const callSite = callSiteMatch![0];
  assert.match(callSite, /iconColor="rgba\(255, 255, 255, 0\.92\)"/);
  assert.match(callSite, /countColor="#FFFFFF"/);
  // Interaction behavior/counts must be untouched
  assert.match(callSite, /likesCount=\{localLikesCount\}/);
  assert.match(callSite, /commentsCount=\{localCommentsCount\}/);
  assert.match(callSite, /sharesCount=\{localSharesCount\}/);
  assert.match(callSite, /onLikePress=\{handleLike\}/);
});

// --- 7. Following pill is image-safe without changing state/position/size ---
test("followingBtnSmall background is a stronger dark translucent fill, not the old faint white", () => {
  assert.match(eventScreenSource, /followingBtnSmall:\s*\{\s*backgroundColor:\s*"rgba\(0, 0, 0, 0\.45\)",\s*borderWidth:\s*0,\s*\}/);
});

test("followingBtnTextSmall uses static white instead of colors.textSecondary", () => {
  assert.match(eventScreenSource, /followingBtnTextSmall:\s*\{\s*color:\s*"#FFFFFF",\s*fontSize:\s*11,\s*fontWeight:\s*"600",\s*\}/);
});

test("follow pill geometry (borderRadius/height/padding) is unchanged", () => {
  assert.match(
    eventScreenSource,
    /followBtnSmall:\s*\{\s*alignItems:\s*"center",\s*borderRadius:\s*8,\s*borderWidth:\s*1,\s*height:\s*20,\s*justifyContent:\s*"center",\s*paddingHorizontal:\s*4,\s*paddingVertical:\s*0,\s*\}/,
  );
});

// --- 8. Category chips / status badges / layout untouched by this task ---
test("category tag styling (translucent white pill, static white text) is untouched", () => {
  assert.match(eventScreenSource, /tag:\s*\{\s*backgroundColor:\s*"rgba\(255, 255, 255, 0\.24\)"/);
  assert.match(eventScreenSource, /tagText:\s*\{\s*color:\s*"#FFFFFF"/);
});

test("hero status stack position is unchanged while lifecycle/crowd consume backend lifecycle", () => {
  assert.match(eventScreenSource, /heroStatusStack,\s*\{\s*top:\s*insets\.top \+ 62\s*\}/);
  assert.match(eventScreenSource, /<EventLifecycleBadge lifecycle=\{event\?\.lifecycle\} \/>/);
  assert.match(eventScreenSource, /<CrowdStatusBadge eventLifecycle=\{event\?\.lifecycle\} crowdStatus=\{event\?\.crowdStatus\} \/>/);
});

test("overlaidMeta/hostRow/attendeesStatsRow layout geometry (position, spacing) is unchanged", () => {
  assert.match(eventScreenSource, /overlaidMeta:\s*\{\s*position:\s*"absolute",\s*bottom:\s*24,\s*left:\s*20,\s*right:\s*20,\s*\}/);
  assert.match(eventScreenSource, /hostRow:\s*\{\s*flexDirection:\s*"row",\s*alignItems:\s*"center",\s*marginBottom:\s*12,\s*\}/);
  assert.match(eventScreenSource, /attendeesStatsRow:\s*\{\s*flexDirection:\s*"row",\s*alignItems:\s*"center",\s*marginBottom:\s*16,\s*\}/);
});

// --- 9. CrowdStatusBadge contrast fix: stronger background, same red family, same labels ---
test("CrowdStatusBadge background is now a near-opaque dark maroon (matching LiveLifecycleBadge), not a 10%-alpha tint", () => {
  assert.match(crowdStatusBadgeSource, /const colorStyle = \{ backgroundColor: "rgba\(72, 11, 10, 0\.82\)" \};/);
  assert.doesNotMatch(crowdStatusBadgeSource, /\$\{colors\.danger\}1A/);
});

test("CrowdStatusBadge text color remains colors.danger (still red family)", () => {
  assert.match(crowdStatusBadgeSource, /const textColor = colors\.danger;/);
});

test("all three crowd-status labels are unchanged", () => {
  assert.match(crowdStatusBadgeSource, /not_busy:\s*"Not Busy"/);
  assert.match(crowdStatusBadgeSource, /busy:\s*"Busy"/);
  assert.match(crowdStatusBadgeSource, /very_busy:\s*"Very Busy"/);
});

test("LiveLifecycleBadge (the contrast reference) is unchanged", () => {
  assert.match(
    crowdStatusBadgeSource,
    /liveBadge:\s*\{\s*alignItems:\s*"center",\s*backgroundColor:\s*"rgba\(72, 11, 10, 0\.82\)",\s*borderRadius:\s*8,/,
  );
});

test("CrowdStatusBadge dimensions (height/minWidth/padding) are unchanged", () => {
  assert.match(
    crowdStatusBadgeSource,
    /badge:\s*\{\s*alignItems:\s*"center",\s*borderRadius:\s*8,\s*flexDirection:\s*"row",\s*height:\s*20,\s*justifyContent:\s*"center",\s*minWidth:\s*41,\s*paddingHorizontal:\s*6,\s*paddingVertical:\s*2,\s*\}/,
  );
});

// --- 10. Other Event surfaces are not referenced/modified by this change ---
test("Feed card / Now Mode / Ticket Detail files are not imported or re-styled from within the hero fix scope", () => {
  assert.doesNotMatch(eventScreenSource, /from ["']@\/components\/home\/EventFeedCard["']/);
  assert.doesNotMatch(eventScreenSource, /from ["']@\/components\/home\/NowModeScreen["']/);
});

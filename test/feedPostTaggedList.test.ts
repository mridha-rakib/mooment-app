import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Regular published Posts must expose the COMPLETE tagged-user list through the
// existing read-only TaggedPeopleSheet (the same interaction RepostFeedCard
// already uses), while individual inline names keep their profile navigation.
//
// Source-string assertions, matching this repo's convention (taggedPeopleSheet /
// peopleTagModalKeyboard / createPostDoubleTapSafety): the app has no RN render
// harness here, so wiring is verified against exact component source.

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const mapperSrc = read("lib/momentPostMapper.ts");
const feedPostSrc = read("components/post/FeedPost.tsx");
const repostSrc = read("components/post/RepostFeedCard.tsx");

// ── momentPostMapper: forward the complete hydrated array ────────────

test("§2/§26 mapper forwards the complete `taggedFriends` array onto the mapped post", () => {
  // The already-computed display-valid, API-ordered list is what gets forwarded.
  assert.match(
    mapperSrc,
    /const taggedFriends = \(moment\.taggedFriends \?\? \[\]\)\.filter\(\(friend\) => friend\.id && getAuthorDisplayName\(friend\)\);/,
  );
  // basePost (spread into every returned post type) now carries it.
  assert.match(mapperSrc, /authorName,\s*\n\s*authorContextNodes,\s*\n(?:\s*\/\/[^\n]*\n)*\s*taggedFriends,\s*\n\s*eventId: moment\.eventId \?\? undefined,/);
  // No reslicing / reordering / id round-trip / refetch.
  assert.doesNotMatch(mapperSrc, /taggedFriends\.slice\(|taggedFriends\.sort\(|getFriendUsers|getUserById/);
});

test("§3/§26 authorContextNodes still built; hydrated connectives flagged, legacy name-only branch NOT flagged", () => {
  // Existing inline sentence is intact.
  assert.match(mapperSrc, /const taggedContextNodes = taggedFriends\.length > 0/);
  assert.match(mapperSrc, /text: getAuthorDisplayName\(friend\),\s*\n\s*type: "bold" as const,\s*\n\s*taggedUser: \{/);
  // Hydrated-friend connectives carry the sheet flag.
  assert.match(mapperSrc, /\{ text: " with ", type: "muted" as const, taggedSummary: true \}/);
  assert.match(mapperSrc, /\{ text: ", ", type: "muted" as const, taggedSummary: true \}/);
  // Legacy taggedPeople branch stays a plain, unflagged, non-interactive string.
  assert.match(
    mapperSrc,
    /taggedPeople\.length > 0\s*\?\s*\[\s*\n\s*\{ text: " with ", type: "muted" as const \},\s*\n\s*\{ text: taggedPeople\.join\(", "\), type: "bold" as const \},/,
  );
});

// ── FeedPost: PostData + PostContextNode + sheet wiring ─────────────

test("§4 PostData carries the optional hydrated tagged list; PostContextNode has the summary flag", () => {
  assert.match(feedPostSrc, /taggedFriends\?: MomentAuthor\[\];/);
  assert.match(feedPostSrc, /taggedSummary\?: boolean;/);
  assert.match(feedPostSrc, /import \{[^}]*\btype MomentAuthor\b[^}]*\} from '@\/lib\/moments';/);
});

test("§5 FeedPost imports and renders the existing TaggedPeopleSheet (no new component)", () => {
  assert.match(feedPostSrc, /import TaggedPeopleSheet from '\.\/TaggedPeopleSheet';/);
  assert.match(feedPostSrc, /<TaggedPeopleSheet\s+visible=\{showTaggedSheet\}\s+people=\{postTaggedFriends\}\s+onClose=\{\(\) => setShowTaggedSheet\(false\)\}\s+onPressPerson=\{handleTaggedPersonPress\}\s*\/>/);
});

test("§1/§5 local, per-card sheet visibility state + complete-list source", () => {
  assert.match(feedPostSrc, /const \[showTaggedSheet, setShowTaggedSheet\] = useState\(false\);/);
  assert.match(feedPostSrc, /const postTaggedFriends = post\.taggedFriends \?\? \[\];/);
  assert.match(feedPostSrc, /const hasTaggedFriends = postTaggedFriends\.length > 0;/);
});

test("§6/§17/§29 the sheet is given the whole post list — never the header's visible subset", () => {
  // people comes straight from post.taggedFriends via postTaggedFriends, not from authorContextNodes.
  assert.match(feedPostSrc, /people=\{postTaggedFriends\}/);
  assert.doesNotMatch(feedPostSrc, /people=\{[^}]*authorContextNodes/);
});

// ── Trigger + press ownership ──────────────────────────────────────

test("§8/§10 the muted tagged connective owns the sheet affordance", () => {
  assert.match(feedPostSrc, /const opensTaggedSheet = Boolean\(node\.taggedSummary && hasTaggedFriends\);/);
  assert.match(feedPostSrc, /opensTaggedSheet\s*\n\s*\?\s*\(\) => setShowTaggedSheet\(true\)\s*\n\s*:\s*undefined/);
});

test("§7/§11/§15/§16 an individual tagged name still navigates to that profile, never the sheet", () => {
  // taggedUser is checked FIRST in the onPress ternary, so a name press wins.
  assert.match(
    feedPostSrc,
    /onPress=\{\s*\n\s*node\.taggedUser\?\.id\s*\n\s*\? \(\) => handleTaggedUserPress\(node\.taggedUser!\)\s*\n\s*: node\.taggedEvent\?\.id\s*\n\s*\? \(\) => handleTaggedEventPress\(node\.taggedEvent!\)\s*\n\s*: opensTaggedSheet/,
  );
  assert.match(feedPostSrc, /const handleTaggedUserPress = \(taggedUser: NonNullable<PostContextNode\['taggedUser'\]>\) => \{/);
});

test("§12 the sheet trigger exposes an accessibility button role + label; names are unaffected", () => {
  assert.match(feedPostSrc, /accessibilityRole=\{opensTaggedSheet \? 'button' : undefined\}/);
  assert.match(feedPostSrc, /View \$\{postTaggedFriends\.length\} tagged \$\{postTaggedFriends\.length === 1 \? 'person' : 'people'\}/);
});

// ── Sheet person press reuses existing navigation ─────────────────

test("§13 sheet row tap reuses handleTaggedUserPress (no duplicated navigation logic)", () => {
  assert.match(
    feedPostSrc,
    /const handleTaggedPersonPress = \(person: MomentAuthor\) => \{\s*\n\s*handleTaggedUserPress\(\{\s*\n\s*id: person\.id,\s*\n\s*name: getTaggedFriendName\(person\),\s*\n\s*avatar: person\.avatarUrl,\s*\n\s*isFollowing: person\.isFollowing,\s*\n\s*\}\);\s*\n\s*\}/,
  );
  assert.match(feedPostSrc, /import \{ getTaggedFriendName \} from '@\/lib\/taggedPeople';/);
});

// ── Zero tags / no fetch ─────────────────────────────────────────

test("§14 no tagged friends → no trigger, no sheet mount", () => {
  // Trigger is gated by hasTaggedFriends (via opensTaggedSheet).
  assert.match(feedPostSrc, /node\.taggedSummary && hasTaggedFriends/);
  // Sheet is only rendered when there are friends.
  assert.match(feedPostSrc, /\{hasTaggedFriends && \(\s*\n\s*<TaggedPeopleSheet/);
});

test("§24/§36 no network request is introduced on the tagged-list path", () => {
  // The only additions reference already-loaded data + existing helpers.
  const addedRegion = feedPostSrc.slice(
    feedPostSrc.indexOf("const [showTaggedSheet"),
    feedPostSrc.indexOf("const isNormalPost = post.postType === 'standard';") + 60,
  );
  assert.doesNotMatch(addedRegion, /\bapi\.(get|post|patch|delete)\(|fetch\(|getFriendUsers|getUserById|getMoment\b/);
});

// ── Repost path untouched (regression guard) ─────────────────────

test("§21/§31 RepostFeedCard still uses share.taggedFriends only — never share.moment.taggedFriends", () => {
  assert.match(repostSrc, /taggedFriends=\{share\.taggedFriends \?\? \[\]\}/);
  assert.match(repostSrc, /people=\{validTaggedFriends\}/);
  assert.doesNotMatch(repostSrc, /share\.moment\.taggedFriends/);
});

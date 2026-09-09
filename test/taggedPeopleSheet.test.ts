import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { dedupeTaggedPeople, getTaggedFriendName } from "../lib/taggedPeople";

// Source-string assertions, matching this repo's convention (repostShareManagement
// / repostTextPostCard / eventRepostRowHeightStabilization): there is no React
// Native render harness, so behaviour is verified against exact component source.
//
// Covers the tagged-people inspection fix for shared/reposted feed headers:
//   RepostFeedCard -> RepostHeader -> share.taggedFriends  ->  TaggedPeopleSheet.

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const sheetSource = read("components/post/TaggedPeopleSheet.tsx");
const repostSource = read("components/post/RepostFeedCard.tsx");

// ── Pure helpers ──────────────────────────────────────────────────────

test("getTaggedFriendName keeps the existing header fallback (name > username > 'Mooment user')", () => {
  assert.equal(getTaggedFriendName({ name: "  Gideon  ", username: "gid" }), "Gideon");
  assert.equal(getTaggedFriendName({ name: "   ", username: "  club20 " }), "club20");
  assert.equal(getTaggedFriendName({ name: "", username: "" }), "Mooment user");
  assert.equal(getTaggedFriendName({ name: "   ", username: "   " }), "Mooment user");
});

test("RepostFeedCard reuses the shared getTaggedFriendName — no second fallback definition", () => {
  assert.match(repostSource, /import \{ getTaggedFriendName \} from '@\/lib\/taggedPeople';/);
  assert.match(repostSource, /import TaggedPeopleSheet from '\.\/TaggedPeopleSheet';/);
  assert.doesNotMatch(repostSource, /const getTaggedFriendName =/);
});

// ── Dedupe + order (§13 / §36 / §37) ─────────────────────────────────

test("dedupeTaggedPeople removes duplicate ids, keeps first occurrence, preserves order, does not mutate", () => {
  const input = [
    { id: "g", name: "Gideon" },
    { id: "c", name: "Club 2-0" },
    { id: "t", name: "Tukai Sarkar" },
    { id: "s", name: "Sarah" },
    { id: "r", name: "Rafi" },
  ];
  const snapshot = JSON.stringify(input);
  const out = dedupeTaggedPeople(input);
  assert.deepEqual(out.map((p) => p.name), ["Gideon", "Club 2-0", "Tukai Sarkar", "Sarah", "Rafi"]);
  assert.equal(JSON.stringify(input), snapshot, "input array must not be mutated");

  const withDupes = [
    { id: "g", name: "Gideon" },
    { id: "c", name: "Club 2-0" },
    { id: "g", name: "Gideon (dupe)" },
    { id: "c", name: "Club 2-0 (dupe)" },
    { id: "t", name: "Tukai" },
  ];
  assert.deepEqual(dedupeTaggedPeople(withDupes).map((p) => p.name), ["Gideon", "Club 2-0", "Tukai"]);
});

test("dedupeTaggedPeople never alphabetically re-sorts", () => {
  const input = [{ id: "z", name: "Zed" }, { id: "a", name: "Aaron" }, { id: "m", name: "Mid" }];
  assert.deepEqual(dedupeTaggedPeople(input).map((p) => p.id), ["z", "a", "m"]);
});

test("TaggedPeopleSheet renders the deduped list verbatim — no .sort in the component", () => {
  assert.match(sheetSource, /useMemo\(\(\) => dedupeTaggedPeople\(people\), \[people\]\)/);
  assert.doesNotMatch(sheetSource, /\.sort\(/);
});

// ── Zero network (§6 / §40) ──────────────────────────────────────────

test("TaggedPeopleSheet performs zero network requests — consumes the passed `people` array only", () => {
  assert.doesNotMatch(sheetSource, /getFriendUsers|getSuggestedUsers|getUserById|getMoment\b|getFeedReposts|searchPeople/);
  assert.doesNotMatch(sheetSource, /from ['"]@\/lib\/api['"]|\bapi\.(get|post|patch|delete)\(/);
  assert.doesNotMatch(sheetSource, /\bfetch\(|\baxios\b|useEffect\(/);
  // The only lib import is a value-free type + the pure helper module.
  assert.match(sheetSource, /import type \{ MomentAuthor \} from '@\/lib\/moments';/);
  // Data comes in exclusively as a prop.
  assert.match(sheetSource, /people: MomentAuthor\[\]/);
});

test("TaggedPeopleSheet does not create a second MomentAuthor type — it imports the existing one", () => {
  assert.match(sheetSource, /import type \{ MomentAuthor \} from '@\/lib\/moments';/);
  assert.match(sheetSource, /import \{ dedupeTaggedPeople, getTaggedFriendName \} from '@\/lib\/taggedPeople';/);
  assert.doesNotMatch(sheetSource, /type MomentAuthor =|interface MomentAuthor/);
});

// ── Row content + read-only (§7) ─────────────────────────────────────

test("sheet rows are read-only: avatar + name + @username, no Add/Follow/checkbox/remove/score", () => {
  assert.match(sheetSource, /<UserAvatar uri=\{item\.avatarUrl\} name=\{name\} size=\{44\}/);
  assert.match(sheetSource, /\{name\}<\/Text>/);
  assert.match(sheetSource, /item\.username \? \(/);
  assert.match(sheetSource, /@\{item\.username\}/);
  assert.doesNotMatch(sheetSource, /Add<\/Text>|Added<\/Text>|Follow|Following|checkbox|Remove<\/Text>|mutual|score/i);
});

test("sheet title is minimal and shows the count", () => {
  assert.match(sheetSource, /title = 'Tagged People'/);
  assert.match(sheetSource, /uniquePeople\.length > 0 \? `\$\{title\} \(\$\{uniquePeople\.length\}\)` : title/);
});

// ── Theme + primitives (§9 / §10 / §11 / §19) ───────────────────────

test("sheet is theme-aware and reuses existing modal/bottom-sheet primitives — no new package, no hardcoded palette", () => {
  assert.match(sheetSource, /useTheme\(\)/);
  assert.match(sheetSource, /colors\.card|colors\.text|colors\.textSecondary|colors\.border/);
  assert.match(sheetSource, /from 'react-native'/);
  assert.match(sheetSource, /useBottomSheetDragDismiss/);
  assert.match(sheetSource, /<Modal /);
  assert.match(sheetSource, /<FlatList/);
  // No third-party bottom sheet.
  assert.doesNotMatch(sheetSource, /@gorhom\/bottom-sheet|react-native-bottom-sheet|reanimated-bottom-sheet/);
  // Not the hardcoded PeopleTagModal palette.
  assert.doesNotMatch(sheetSource, /#1E1E1E|#8E8E9B|#454555/);
});

test("sheet dismisses via close button, backdrop and system back — no navigation route", () => {
  assert.match(sheetSource, /onRequestClose=\{onClose\}/);
  assert.match(sheetSource, /style=\{styles\.backdrop\} activeOpacity=\{1\} onPress=\{onClose\}/);
  assert.match(sheetSource, /<Feather name="x"/);
  // onClose wired to onRequestClose + backdrop + the x button (>= 3 uses).
  assert.ok((sheetSource.match(/onClose\b/g) ?? []).length >= 3);
  assert.doesNotMatch(sheetSource, /router\.push|useRouter/);
});

test("sheet has no confirm/Done action (read-only)", () => {
  assert.doesNotMatch(sheetSource, />Done<\/Text>|>Save<\/Text>|>Confirm<\/Text>/);
});

// ── Row -> existing profile navigation (§14 / §38) ──────────────────

test("sheet row delegates to the caller's profile handler and then closes — reuses navigateToProfile via RepostHeader", () => {
  assert.match(sheetSource, /onPressPerson: \(person: MomentAuthor\) => void/);
  assert.match(sheetSource, /onPress=\{\(\) => \{\s*onPressPerson\(item\);\s*onClose\(\);\s*\}\}/);
  assert.match(sheetSource, /disabled=\{!item\.id\}/);
  // RepostHeader wires the sheet's row handler to its EXISTING openTaggedProfile
  // (which calls navigateToProfile) — no new route, no duplicated helper.
  assert.match(repostSource, /onPressPerson=\{openTaggedProfile\}/);
  assert.match(repostSource, /navigateToProfile\(router, currentUserId, \{\s*userId: friend\.id,/);
});

// ── Header stays compact (§1 / §2 / §34 / §35 / §45) ────────────────

test("both RepostHeader variants keep the 2-line clamp on the compact header", () => {
  assert.equal((repostSource.match(/style=\{\[styles\.shareHeaderLine, \{ color: colors\.text \}\]\} numberOfLines=\{2\}/g) ?? []).length, 2);
  // The clamp value is unchanged.
  assert.doesNotMatch(repostSource, /numberOfLines=\{3\}|numberOfLines=\{0\}/);
});

test("the existing inline 'with A, B and C' sentence is unchanged — no 'and X others' / '+N' / 'View all' copy", () => {
  assert.match(repostSource, /\{' with '\}/);
  assert.match(repostSource, /index === validTaggedFriends\.length - 1 \? ' and ' : ', '/);
  assert.doesNotMatch(repostSource, /others|\+\$\{|View all|See all/i);
});

test("the tagged sentence + sheet only render when there is at least one tagged friend", () => {
  assert.match(repostSource, /const taggedInline = validTaggedFriends\.length > 0 \? \(/);
  assert.match(repostSource, /const taggedSheet = validTaggedFriends\.length > 0 \? \(/);
});

// ── Touch ownership (§15 / §16 / §39) ───────────────────────────────

test("only the muted 'with ...' connective owns the sheet affordance — not the reposter name or 'shared a post'", () => {
  // Wrapper (muted connective) opens the sheet + is an accessible button.
  assert.match(
    repostSource,
    /<Text\s+style=\{\{ color: colors\.textSecondary \}\}\s+onPress=\{\(\) => setShowTaggedSheet\(true\)\}\s+suppressHighlighting\s+accessibilityRole="button"\s+accessibilityLabel=\{`View \$\{validTaggedFriends\.length\} tagged \$\{validTaggedFriends\.length === 1 \? 'person' : 'people'\}`\}/,
  );
  // Reposter name still only opens the reposter profile.
  assert.match(repostSource, /<Text style=\{styles\.reposterName\} onPress=\{openReposterProfile\} suppressHighlighting>\{reposterName\}<\/Text>/);
  // "shared a post" / "shared an event" label has no onPress.
  assert.match(repostSource, /<Text style=\{\{ color: colors\.textSecondary \}\}>\{` \$\{contextLabel\}`\}<\/Text>/);
});

test("a visible tagged NAME tap navigates to that profile only and stops propagation to the sheet wrapper", () => {
  assert.match(repostSource, /onPress=\{\(event\) => handleTaggedNamePress\(event, friend\)\}/);
  assert.match(
    repostSource,
    /const handleTaggedNamePress = \(event: GestureResponderEvent, friend: MomentAuthor\) => \{\s*event\?\.stopPropagation\?\.\(\);\s*openTaggedProfile\(friend\);\s*\}/,
  );
});

test("overflow menu is untouched — separate ref/measure/MoreMenuModal, not wired to the tagged sheet", () => {
  assert.match(repostSource, /const moreMenu = isOwnRepost \? \(/);
  assert.match(repostSource, /<TouchableOpacity ref=\{moreBtnRef\} style=\{styles\.moreBtn\} activeOpacity=\{0\.75\} onPress=\{handleMorePress\}>/);
  assert.match(repostSource, /moreBtnRef\.current\?\.measureInWindow/);
  assert.match(repostSource, /<MoreMenuModal/);
  // moreMenu does not open the tagged sheet.
  const moreMenuBlock = repostSource.slice(repostSource.indexOf("const moreMenu = isOwnRepost"), repostSource.indexOf("const taggedInline") >= 0 ? repostSource.indexOf("const taggedInline") : repostSource.length);
  assert.doesNotMatch(moreMenuBlock, /setShowTaggedSheet/);
});

test("the TaggedPeopleSheet is a sibling of the header row (overlay), never nested inside the <Text> or the measured card layout", () => {
  // Rendered once per variant, as a fragment sibling after </View>.
  assert.equal((repostSource.match(/\{taggedSheet\}\s*\n\s*<\/>/g) ?? []).length, 2);
  assert.equal((repostSource.match(/\{taggedInline\}/g) ?? []).length, 2);
});

// ── State locality (§30 / §31) ─────────────────────────────────────

test("sheet visibility is local component state on RepostHeader — no redux / context / global modal host", () => {
  assert.match(repostSource, /const \[showTaggedSheet, setShowTaggedSheet\] = useState\(false\);/);
  assert.doesNotMatch(repostSource, /useDispatch|useSelector\([\s\S]{0,80}TaggedSheet|TaggedSheetContext|GlobalModal/);
});

// ── Data source (§7 / §21 / §22) ───────────────────────────────────

test("sheet is fed share.taggedFriends (via validTaggedFriends) — NOT the nested original post's tags", () => {
  assert.match(repostSource, /people=\{validTaggedFriends\}/);
  assert.match(repostSource, /taggedFriends=\{share\.taggedFriends \?\? \[\]\}/);
  // The nested original card still gets its own mapMomentToPost(share.moment) — untouched.
  assert.match(repostSource, /mapMomentToPost\(share\.moment/);
  assert.doesNotMatch(repostSource, /share\.moment\.taggedFriends/);
});

// ── No backend / API change (§26) ──────────────────────────────────

test("RepostFeedCard adds no network import for this fix", () => {
  // Still only the pre-existing events cache read; no users/shares fetch added.
  assert.doesNotMatch(repostSource, /getFriendUsers|\/users\/|searchPeople/);
});

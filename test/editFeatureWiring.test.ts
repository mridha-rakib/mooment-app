import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

const feedPostSource = read("components/post/FeedPost.tsx");
const editPostModalSource = read("components/post/EditPostModal.tsx");
const moreMenuSource = read("components/post/MoreMenuModal.tsx");
const eventFeedCardSource = read("components/home/EventFeedCard.tsx");
const repostFeedCardSource = read("components/post/RepostFeedCard.tsx");
const shareModalSource = read("components/post/ShareModal.tsx");
const homeSource = read("app/(tabs)/home.tsx");
const momentsLibSource = read("lib/moments.ts");

// ---------------------------------------------------------------------------
// Shared MoreMenuModal: additive Edit action, same prop-driven pattern as Delete
// ---------------------------------------------------------------------------

test("MoreMenuModal exposes an Edit action following the existing onDelete/showDelete/deleteLabel pattern", () => {
  assert.match(moreMenuSource, /onEdit\?:\s*\(\) => void;/);
  assert.match(moreMenuSource, /showEdit\?:\s*boolean;/);
  assert.match(moreMenuSource, /editLabel\?:\s*string;/);
});

test("Edit row renders before the Delete row so owner menus read Edit, then Delete/Cancel Event", () => {
  const editIndex = moreMenuSource.indexOf("{showEdit && onEdit && (");
  const deleteIndex = moreMenuSource.indexOf("{showDelete && onDelete && (");
  assert.ok(editIndex > -1 && deleteIndex > -1);
  assert.ok(editIndex < deleteIndex);
});

test("MoreMenuModal uses the existing icon library for Edit, no new icon package", () => {
  assert.match(moreMenuSource, /Feather name="edit-2"/);
  assert.doesNotMatch(moreMenuSource, /@hugeicons/);
});

// ---------------------------------------------------------------------------
// Own Post: Edit caption only, existing Delete/Report/Save/Block untouched
// ---------------------------------------------------------------------------

test("FeedPost gates Edit visibility on post ownership and an onPostUpdated callback, mirroring canDeletePost", () => {
  assert.match(feedPostSource, /const canEditPost = isPostByCurrentUser && Boolean\(onPostUpdated\);/);
  assert.match(feedPostSource, /const hasMoreMenuActions = !isPostByCurrentUser \|\| canDeletePost \|\| canEditPost;/);
  assert.match(feedPostSource, /showEdit=\{canEditPost\}/);
  assert.match(feedPostSource, /onEdit=\{canEditPost \? \(\) => setShowEditModal\(true\) : undefined\}/);
});

test("FeedPost still shows Delete for the owner and preserves non-owner Report/Save/Block", () => {
  assert.match(feedPostSource, /showDelete=\{canDeletePost\}/);
  assert.match(feedPostSource, /onDelete=\{canDeletePost \? \(\) => onDeletePress\?\.\(post\) : undefined\}/);
  assert.match(feedPostSource, /onReport=\{!isPostByCurrentUser \? handleOpenReport : undefined\}/);
  assert.match(feedPostSource, /onSave=\{!isPostByCurrentUser \? handleSave : undefined\}/);
  assert.match(feedPostSource, /onBlock=\{!isPostByCurrentUser && Boolean\(post\.authorId\) \? handleBlock : undefined\}/);
});

test("FeedPost opens EditPostModal pre-filled with the post's current caption", () => {
  assert.match(feedPostSource, /<EditPostModal/);
  assert.match(feedPostSource, /postId=\{post\.id\}/);
  assert.match(feedPostSource, /initialCaption=\{post\.caption\}/);
  assert.match(feedPostSource, /onSaved=\{\(updated\) => onPostUpdated\?\.\(updated\)\}/);
});

test("EditPostModal calls the update endpoint, not the create endpoint, and exposes no media controls", () => {
  assert.match(editPostModalSource, /import \{ updateMoment, type Moment \} from '@\/lib\/moments';/);
  assert.doesNotMatch(editPostModalSource, /createMoment/);
  assert.doesNotMatch(editPostModalSource, /mediaItems/);
  assert.doesNotMatch(editPostModalSource, /ImagePicker|expo-image-picker/);
});

test("EditPostModal pre-fills the caption input from the existing post whenever it opens, and has synchronous double-submit protection", () => {
  assert.match(editPostModalSource, /setCaption\(initialCaption \?\? ''\);/);
  assert.match(editPostModalSource, /savingRef\.current/);
});

// ---------------------------------------------------------------------------
// Feed local patch: Post edit updates by id, never inserted as a new item
// ---------------------------------------------------------------------------

test("home.tsx wires onPostUpdated into FeedPost and patches the existing Feed item by id (not prepended as new)", () => {
  assert.match(homeSource, /onPostUpdated=\{handlePostUpdated\}/);
  assert.match(homeSource, /const handlePostUpdated = useCallback\(\(updatedMoment: Moment\) => \{/);
  assert.match(homeSource, /post\.id === mappedPost\.id \? mappedPost : post/);
});

// ---------------------------------------------------------------------------
// Own Event: only a Feed entry point into the EXISTING edit flow
// ---------------------------------------------------------------------------

test("EventFeedCard gates Edit on event ownership and non-terminal status, alongside the unchanged Cancel Event action", () => {
  assert.match(
    eventFeedCardSource,
    /showEdit=\{isOwnEvent && eventStatus !== "completed" && eventStatus !== "cancelled"(?: && !eventEndedByPersistedTime)?\}/,
  );
  assert.match(eventFeedCardSource, /onEdit=\{isOwnEvent \? handleEditEvent : undefined\}/);
  assert.match(eventFeedCardSource, /showDelete=\{isOwnEvent\}/);
  assert.match(eventFeedCardSource, /deleteLabel="Cancel Event"/);
});

test("EventFeedCard's Edit action loads the existing event into the draft store BEFORE navigating to the existing create-event flow", () => {
  assert.match(eventFeedCardSource, /import \{ useEventDraftStore \} from "@\/stores\/eventDraftStore";/);
  assert.match(eventFeedCardSource, /const loadEventForEdit = useEventDraftStore\(\(s\) => s\.loadFromEvent\);/);
  assert.match(eventFeedCardSource, /const handleEditEvent = \(\) => \{/);

  const loadIndex = eventFeedCardSource.indexOf("loadEventForEdit(event);");
  const navigateIndex = eventFeedCardSource.indexOf('router.push("/create-event");');
  assert.ok(loadIndex > -1 && navigateIndex > -1, "expected both loadEventForEdit(event) and router.push(\"/create-event\") to be present");
  assert.ok(loadIndex < navigateIndex, "loadEventForEdit(event) must run before navigating, to avoid a stale-draft duplicate Event");
});

test("EventFeedCard reuses the existing business-account guard used by event-screen/event.tsx's own handleEdit", () => {
  assert.match(eventFeedCardSource, /import \{ requireBusinessAccountForEvent \} from "@\/lib\/eventGuard";/);
  assert.match(eventFeedCardSource, /requireBusinessAccountForEvent\(\{/);
});

// ---------------------------------------------------------------------------
// Own Repost/Share: edit ONLY the share's own commentary, gated on share ownership
// ---------------------------------------------------------------------------

test("RepostFeedCard gates repost Edit visibility on the SHARE owner (share.sharedBy.id), never the original content's author", () => {
  assert.match(
    repostFeedCardSource,
    /const isOwnRepost = Boolean\(currentUserId && share\.sharedBy\?\.id && currentUserId === share\.sharedBy\.id\);/,
  );
  // The ownership check itself must not reference the embedded original
  // content's owner fields — editing a repost must never be gated on who
  // authored the original Post/Event.
  const ownershipLine = repostFeedCardSource
    .split("\n")
    .find((line) => line.includes("const isOwnRepost ="));
  assert.ok(ownershipLine);
  assert.doesNotMatch(ownershipLine as string, /post\.authorId/);
  assert.doesNotMatch(ownershipLine as string, /event\.userId/);
});

test("RepostFeedCard wires its own Edit entry point (not the embedded card's menu) into a real update call", () => {
  assert.match(repostFeedCardSource, /showEdit/);
  assert.match(repostFeedCardSource, /showDelete/);
  assert.match(repostFeedCardSource, /onEdit=\{onEditPress\}/);
  assert.match(repostFeedCardSource, /onDelete=\{onDeletePress\}/);
  assert.match(repostFeedCardSource, /onUpdateShare=\{handleUpdateShare\}/);
  assert.match(repostFeedCardSource, /taggedFriends: \(share\.taggedFriends \?\? \[\]\)\.map\(\(friend\) => toTaggedFriend\(friend\)\)/);
  assert.match(repostFeedCardSource, /const updated = await updateMomentShare\(shareId, payload\);/);
});

test("ShareModal's edit-mode submit branches to the share-update path and never calls the create/repost path", () => {
  assert.match(shareModalSource, /const isEditMode = Boolean\(editing\);/);
  assert.match(shareModalSource, /if \(isEditMode\) \{/);
  assert.match(shareModalSource, /await onUpdateShare\(editing\.shareId, \{/);
  assert.match(shareModalSource, /taggedFriendIds: selectedTaggedFriends\.map\(\(friend\) => friend\.id\)/);
  // The edit-mode branch must never call onRepost/shareMoment's create path.
  const editBranch = shareModalSource.slice(
    shareModalSource.indexOf("if (isEditMode) {"),
    shareModalSource.indexOf("if (!onRepost) return;"),
  );
  assert.doesNotMatch(editBranch, /onRepost\(/);
});

test("ShareModal edit mode hydrates and edits tagged friends through PeopleTagModal", () => {
  assert.match(shareModalSource, /import PeopleTagModal, \{ type TaggedFriend \} from '@\/components\/post\/PeopleTagModal';/);
  assert.match(shareModalSource, /taggedFriends: TaggedFriend\[\];/);
  assert.match(shareModalSource, /setTaggedFriendIds\(new Set\(editing\?\.taggedFriends\.map\(\(friend\) => friend\.id\) \?\? \[\]\)\);/);
  assert.match(shareModalSource, /setSelectedTaggedFriends\(editing\?\.taggedFriends \?\? \[\]\);/);
  assert.match(shareModalSource, /<PeopleTagModal/);
  assert.match(shareModalSource, /onSelect=\{handleEditTaggedFriendsSelection\}/);
});

test("ShareModal edit mode does not regenerate/use a create-time idempotency key", () => {
  assert.match(shareModalSource, /repostRequestId\.current = null;/);
});

// ---------------------------------------------------------------------------
// Feed local patch: repost commentary edit updates by share id, never duplicated
// ---------------------------------------------------------------------------

test("home.tsx wires onShareUpdated into RepostFeedCard and patches the existing repost by share id (not prepended as new)", () => {
  assert.match(homeSource, /onShareUpdated=\{handleShareUpdated\}/);
  assert.match(homeSource, /const handleShareUpdated = useCallback\(\(updatedShare: MomentTimelineItem\) => \{/);
  assert.match(homeSource, /share\.id === updatedShare\.id \? updatedShare : share/);
});

test("home.tsx wires onShareDeleted into RepostFeedCard and removes only the repost wrapper by share id", () => {
  assert.match(homeSource, /onShareDeleted=\{handleShareDeleted\}/);
  assert.match(homeSource, /const handleShareDeleted = useCallback\(\(shareId: string\) => \{/);
  assert.match(homeSource, /current\.filter\(\(share\) => share\.id !== shareId\)/);
});

// ---------------------------------------------------------------------------
// Mobile API client: real update endpoints, matching the backend contract
// ---------------------------------------------------------------------------

test("lib/moments.ts exposes updateMoment against PATCH /moments/:id", () => {
  assert.match(momentsLibSource, /export const updateMoment = async \(momentId: string, caption: string \| null\): Promise<Moment> => \{/);
  assert.match(momentsLibSource, /api\.patch\(`\/moments\/\$\{encodeURIComponent\(momentId\)\}`, \{ caption \}\);/);
});

test("lib/moments.ts exposes updateMomentShare against PATCH /moments/shares/:shareId", () => {
  assert.match(momentsLibSource, /export const updateMomentShare = async \(\s*shareId: string,\s*payload: UpdateMomentSharePayload,/);
  assert.match(momentsLibSource, /api\.patch\(`\/moments\/shares\/\$\{encodeURIComponent\(shareId\)\}`, payload\);/);
});

test("lib/moments.ts exposes deleteMomentShare against DELETE /moments/shares/:shareId", () => {
  assert.match(momentsLibSource, /export const deleteMomentShare = async \(shareId: string\): Promise<void> => \{/);
  assert.match(momentsLibSource, /api\.delete\(`\/moments\/shares\/\$\{encodeURIComponent\(shareId\)\}`\);/);
});

// ---------------------------------------------------------------------------
// Edit Post keyboard avoidance: dynamic, not KeyboardAvoidingView, no magic numbers
// ---------------------------------------------------------------------------

test("EditPostModal tracks the real keyboard height via Keyboard.addListener instead of KeyboardAvoidingView", () => {
  // KeyboardAvoidingView may still be named in an explanatory comment, but
  // must not be imported/rendered as a component anymore.
  assert.doesNotMatch(editPostModalSource, /<KeyboardAvoidingView/);
  assert.doesNotMatch(editPostModalSource, /ActivityIndicator,\s*\n\s*Alert,\s*\n\s*KeyboardAvoidingView/);
  assert.match(editPostModalSource, /Keyboard\.addListener\(/);
  assert.match(editPostModalSource, /const \[keyboardHeight, setKeyboardHeight\] = useState\(0\);/);
  assert.match(editPostModalSource, /paddingBottom: sheetBottomPadding \+ keyboardHeight/);
});

test("EditPostModal's keyboard height comes from the OS event, never a hardcoded pixel value", () => {
  assert.match(editPostModalSource, /e\.endCoordinates\.height/);
  assert.doesNotMatch(editPostModalSource, /\b(250|300|320|350)\b/);
});

test("EditPostModal wraps its content in a scrollable container so long captions keep Save/Cancel reachable above the keyboard", () => {
  assert.match(editPostModalSource, /<ScrollView keyboardShouldPersistTaps="handled"/);
});

// ---------------------------------------------------------------------------
// Feed caption typography: matches the app's existing body-text convention
// ---------------------------------------------------------------------------

test("FeedPost's standard-post caption uses the app's existing body-text size/line-height (matches Comments/Chat), not an oversized one-off value", () => {
  assert.match(feedPostSource, /normalPostCaption: \{\s*fontSize: 14,\s*fontWeight: "400",\s*lineHeight: 20,/);
});

test("EditPostModal's caption input matches the same body-text size as the Feed caption for visual consistency", () => {
  assert.match(editPostModalSource, /captionInput: \{[^}]*fontSize: 14,\s*lineHeight: 20,/);
});

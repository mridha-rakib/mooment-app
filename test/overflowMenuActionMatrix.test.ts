import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Source-scan regression tests for the audited overflow / three-dot action
// menu fixes. These assert the exact wiring/labels that were changed and
// guard the paths that must never regress:
//   - own standard post menu says "Edit Post" / "Delete Post"
//   - other-user standard post keeps Report / Save / Block
//   - own event menu says "Edit Event" / "Cancel Event"
//   - the event detail overflow menu's destructive action routes to the
//     existing cancelEvent() flow, never deleteEvent() / deleteMoment()
//   - the event detail screen (non-host) exposes Block via the existing
//     blockUser() flow
//   - Scene (event-window) post surfaces still expose no Delete
//   - FeedPost's dead postType === 'event' branch can no longer route an
//     event into the standard moment delete / caption-edit paths

const read = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

const feedPostSource = read("components/post/FeedPost.tsx");
const eventFeedCardSource = read("components/home/EventFeedCard.tsx");
const eventScreenSource = read("app/event-screen/event.tsx");
const profileTabSource = read("app/(tabs)/profile.tsx");
const profileViewSource = read("components/profile/ProfileView.tsx");
const profileContentSource = read("components/profile/ProfileContent.tsx");

const sceneSurfaces = [
  "app/profile-screen/window-posts.tsx",
  "components/eventTabs/AttendeeEventWindowsTab.tsx",
  "components/eventTabs/HostEventWindowsTab.tsx",
  "app/event-screen/window-gallery.tsx",
  "app/event-screen/participated-windows.tsx",
].map((path) => ({ path, source: read(path) }));

// ---------------------------------------------------------------------------
// 1. Own standard post: exactly "Edit Post" + "Delete Post"
// ---------------------------------------------------------------------------

test("FeedPost owner menu labels are 'Edit Post' and 'Delete Post'", () => {
  assert.match(feedPostSource, /editLabel="Edit Post"/);
  assert.match(feedPostSource, /deleteLabel="Delete Post"/);
  // The old label ternary that could surface "Cancel Event" from a standard
  // post card must be gone.
  assert.doesNotMatch(
    feedPostSource,
    /deleteLabel=\{post\.postType === 'event' \? 'Cancel Event' : 'Delete'\}/,
  );
});

test("FeedPost owner Edit still opens the existing EditPostModal, Delete still calls the existing onDeletePress", () => {
  assert.match(feedPostSource, /showEdit=\{canEditPost\}/);
  assert.match(feedPostSource, /onEdit=\{canEditPost \? \(\) => setShowEditModal\(true\) : undefined\}/);
  assert.match(feedPostSource, /showDelete=\{canDeletePost\}/);
  assert.match(feedPostSource, /onDelete=\{canDeletePost \? \(\) => onDeletePress\?\.\(post\) : undefined\}/);
  assert.match(feedPostSource, /<EditPostModal/);
});

// ---------------------------------------------------------------------------
// 2. Other-user standard post: Report / Save / Block unchanged
// ---------------------------------------------------------------------------

test("FeedPost keeps non-owner Report / Save / Block wiring untouched", () => {
  assert.match(feedPostSource, /onReport=\{!isPostByCurrentUser \? handleOpenReport : undefined\}/);
  assert.match(feedPostSource, /onSave=\{!isPostByCurrentUser \? handleSave : undefined\}/);
  assert.match(feedPostSource, /onBlock=\{!isPostByCurrentUser && Boolean\(post\.authorId\) \? handleBlock : undefined\}/);
});

// ---------------------------------------------------------------------------
// 3. Latent FeedPost event-delete path is guarded
// ---------------------------------------------------------------------------

test("FeedPost never routes an event postType into the moment delete / caption-edit paths", () => {
  assert.match(
    feedPostSource,
    /const canDeletePost = isPostByCurrentUser && post\.postType !== 'event' && Boolean\(onDeletePress\);/,
  );
  assert.match(
    feedPostSource,
    /const canEditPost = isPostByCurrentUser && post\.postType !== 'event' && Boolean\(onPostUpdated\);/,
  );
});

// ---------------------------------------------------------------------------
// 4. Own standard post on the Profile screen now wires the EXISTING edit flow
// ---------------------------------------------------------------------------

test("Profile screen threads the existing onPostUpdated edit flow through to FeedPost", () => {
  assert.match(profileTabSource, /const handlePostUpdated = useCallback\(\(updatedMoment: Moment\) => \{/);
  assert.match(profileTabSource, /mapMomentToPost\(updatedMoment, \{ storageUrlResolver: getStorageFileUrl \}\)/);
  assert.match(profileTabSource, /onPostUpdated=\{handlePostUpdated\}/);
  assert.match(profileViewSource, /onPostUpdated\?: \(updatedMoment: Moment\) => void;/);
  assert.match(profileViewSource, /onPostUpdated=\{onPostUpdated\}/);
  assert.match(profileContentSource, /onPostUpdated\?: \(updatedMoment: Moment\) => void;/);
  assert.match(profileContentSource, /onPostUpdated=\{onPostUpdated\}/);
  // Reuses the caption-only modal, does not introduce a new edit screen.
  assert.doesNotMatch(profileTabSource, /createMoment|create-post/);
});

// ---------------------------------------------------------------------------
// 5. Own event: "Edit Event" + "Cancel Event"
// ---------------------------------------------------------------------------

test("EventFeedCard owner menu labels are 'Edit Event' and 'Cancel Event' and Cancel routes to the existing cancel flow", () => {
  assert.match(eventFeedCardSource, /editLabel="Edit Event"/);
  assert.match(eventFeedCardSource, /deleteLabel="Cancel Event"/);
  assert.match(eventFeedCardSource, /onDelete=\{isOwnEvent \? handleCancelEvent : undefined\}/);
  assert.match(eventFeedCardSource, /await cancelEvent\(event\.id, payload\)/);
});

test("event-screen overflow menu shows 'Edit Event' and 'Cancel Event' (not a hard Delete)", () => {
  assert.match(eventScreenSource, /Edit Event\s*<\/Text>/);
  assert.match(eventScreenSource, /\{isCancellingEvent \? "Cancelling\.\.\." : "Cancel Event"\}/);
  // The host overflow menu's destructive item invokes the existing
  // cancellation entry point.
  assert.match(eventScreenSource, /setMenuVisible\(false\);\s*handleCancelEvent\(\);/);
});

test("event-screen no longer imports or calls deleteEvent(); Cancel Event cannot reach deleteEvent() or deleteMoment()", () => {
  assert.doesNotMatch(eventScreenSource, /\bdeleteEvent\b/);
  assert.doesNotMatch(eventScreenSource, /\bdeleteMoment\b/);
  assert.doesNotMatch(eventScreenSource, /Delete02Icon/);
  // handleCancelEvent still drives the existing cancelEvent() reason-modal flow.
  assert.match(eventScreenSource, /const handleCancelEvent = \(\) => \{/);
  assert.match(eventScreenSource, /onReady: \(\) => setCancelReasonVisible\(true\)/);
  assert.match(eventScreenSource, /const updated = await cancelEvent\(event\.id, payload\);/);
});

// ---------------------------------------------------------------------------
// 6. Other-user event detail: Block added, reusing the existing blockUser flow
// ---------------------------------------------------------------------------

test("event-screen non-host menu exposes Block via the existing blockUser() flow, leaving Report/Save intact", () => {
  assert.match(eventScreenSource, /const handleBlock = \(\) => \{/);
  assert.match(eventScreenSource, /await blockUser\(targetId\)/);
  assert.match(eventScreenSource, /onPress=\{handleBlock\}[\s\S]*?Block\s*<\/Text>/);
  // Report + Save wiring unchanged.
  assert.match(eventScreenSource, /onPress=\{handleReportPress\}/);
  assert.match(eventScreenSource, /onPress=\{handleSave\}/);
});

// ---------------------------------------------------------------------------
// 7. Scene (event-window) post surfaces: still no Delete, no shared post menu
// ---------------------------------------------------------------------------

test("Scene post surfaces expose no Delete action and no shared post overflow menu", () => {
  for (const { path, source } of sceneSurfaces) {
    assert.doesNotMatch(source, /MoreMenuModal/, `${path} must not use the shared post menu`);
    assert.doesNotMatch(source, /showDelete/, `${path} must not pass showDelete`);
    assert.doesNotMatch(source, /onDeletePress/, `${path} must not wire onDeletePress`);
    assert.doesNotMatch(source, /deleteMoment/, `${path} must not call deleteMoment`);
    assert.doesNotMatch(source, /deleteWindowPost|removeWindowPost/, `${path} must not call a window-post delete`);
  }
});

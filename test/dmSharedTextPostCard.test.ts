import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// Source-string assertions (same convention as the chat*LightMode / chatBlockedState
// tests — no RN render harness here).
//
// Covers the DM / group-chat half of the shared/reposted text-post card fix,
// scoped to app/chat-screen/chat-detail.tsx -> PostBubble:
//   * text-only shares no longer render the fixed 132px media tile;
//   * image / video / audio shares keep the 132px media frame + play badge;
//   * the bare "POST" label becomes "Shared post" (video/audio labels unchanged);
//   * the original author's avatar renders via the existing UserAvatar +
//     avatarKey->getStorageFileUrl / avatarUrl convention (no new resolver);
//   * a visible "View Post" text sits inside the existing pressable bubble;
//   * the bubble still navigates to /post-screen/view-post with postId;
//   * getMoment() rejection -> a distinct "This post is unavailable" state that
//     renders no cached caption / snapshot author / media tile;
//   * a pending fetch shows a loading skeleton, distinguishable from unavailable;
//   * the module-level preview cache + in-flight request dedupe are intact.

const chatSource = readFileSync(join(process.cwd(), "app/chat-screen/chat-detail.tsx"), "utf8");

const postBubbleSource = chatSource.slice(
  chatSource.indexOf("function PostBubble("),
  chatSource.indexOf("const STORY_LINK_REGEX"),
);

const loadingBranch = postBubbleSource.slice(
  postBubbleSource.indexOf("if (isResolving) {"),
  postBubbleSource.indexOf("if (resolvedPreview?.unavailable) {"),
);
const unavailableBranch = postBubbleSource.slice(
  postBubbleSource.indexOf("if (resolvedPreview?.unavailable) {"),
  postBubbleSource.indexOf("const mediaUri ="),
);

// ── Text-only: no 132px media tile ─────────────────────────────────────

test("1. a genuine text-only share omits the 132px media frame entirely", () => {
  assert.match(postBubbleSource, /const isTextOnly = !mediaUri && !isVideoPost && !isAudioPost;/);
  assert.match(
    postBubbleSource,
    /\{isTextOnly \? null : \(\s*\n\s*<View style=\{styles\.sharedPostMediaFrame\}>/,
  );
});

test("2. image / video / audio shares still render the 132px media frame + play badge", () => {
  assert.match(chatSource, /sharedPostMediaFrame: \{ width: '100%', height: 132,/);
  // frame + audio player + image + video-play badge all still present in the non-text branch
  assert.match(postBubbleSource, /<SharedPostAudioPlayer/);
  assert.match(postBubbleSource, /<Image source=\{\{ uri: mediaUri \}\} style=\{styles\.sharedPostImage\} resizeMode="cover" \/>/);
  assert.match(postBubbleSource, /style=\{styles\.sharedPostPlayBadge\}/);
  assert.match(postBubbleSource, /name=\{isVideoPost \? 'play-circle' : isAudioPost \? 'music' : 'file-text'\}/);
});

// ── Labels ────────────────────────────────────────────────────────────

test("3. the bare 'POST' label is replaced with 'Shared post'; video/audio labels unchanged", () => {
  assert.doesNotMatch(postBubbleSource, /'POST'/);
  assert.match(
    postBubbleSource,
    /const postLabel = isVideoPost \? 'Shared video post' : isAudioPost \? 'Shared audio post' : 'Shared post';/,
  );
});

// ── Text excerpt ──────────────────────────────────────────────────────

test("4. the text preview stays capped at 3 lines with an explicit tail ellipsis", () => {
  assert.match(
    postBubbleSource,
    /<Text style=\{styles\.sharedPostPreview\} numberOfLines=\{3\} ellipsizeMode="tail">\{postPreview\}<\/Text>/,
  );
  // caption is rendered once, not duplicated elsewhere in the bubble
  assert.equal((postBubbleSource.match(/\{postPreview\}/g) ?? []).length, 1);
});

// ── Original author name + avatar ─────────────────────────────────────

test("5. the original author name still renders", () => {
  assert.match(postBubbleSource, /const postAuthor = resolvedPreview\?\.authorName \|\| msg\.postAuthor;/);
  assert.match(postBubbleSource, /numberOfLines=\{1\}>\{postAuthor\}<\/Text>/);
});

test("6. the original author avatar renders via the existing UserAvatar + avatar resolution path", () => {
  assert.match(
    postBubbleSource,
    /<UserAvatar uri=\{resolvedPreview\?\.authorAvatarUri \?\? null\} name=\{postAuthor\} size=\{20\} \/>/,
  );
  // resolved once in the existing loader with the standard avatarKey->getStorageFileUrl, else avatarUrl convention
  assert.match(chatSource, /authorAvatarUri = getStorageFileUrl\(moment\.author\.avatarKey\);/);
  assert.match(chatSource, /authorAvatarUri = moment\.author\?\.avatarUrl \?\? null;/);
  // reuses the shared component + storage helper, adds no chat-specific avatar system
  assert.match(chatSource, /import UserAvatar from '@\/components\/ui\/UserAvatar';/);
  assert.match(chatSource, /import \{ getStorageFileUrl, uploadFileToStorage \} from '@\/lib\/storage';/);
});

// ── Visible View Post affordance + navigation ─────────────────────────

test("7. a visible 'View Post' text sits inside the existing pressable bubble (not a nested pressable)", () => {
  assert.match(
    postBubbleSource,
    /\{isTextOnly \? <Text style=\{styles\.sharedPostViewPost\}>View Post<\/Text> : null\}/,
  );
});

test("8. the bubble still navigates to /post-screen/view-post with postId via one shared handler", () => {
  assert.match(
    postBubbleSource,
    /const openPost = useCallback\(\(\) => \{\s*\n\s*if \(postId\) \{\s*\n\s*router\.push\(\{ pathname: '\/post-screen\/view-post', params: \{ postId \} \} as any\);/,
  );
  assert.match(postBubbleSource, /onPress=\{openPost\}/);
  assert.match(postBubbleSource, /accessibilityRole="button"/);
  assert.match(postBubbleSource, /accessibilityLabel="View post"/);
});

// ── Deleted / private / inaccessible ─────────────────────────────────

test("9. getMoment() rejection is cached as a distinct 'unavailable' marker", () => {
  assert.match(chatSource, /unavailable\?: boolean;/);
  assert.match(chatSource, /unavailable: true,/);
  assert.match(postBubbleSource, /if \(resolvedPreview\?\.unavailable\) \{/);
});

test("10. the unavailable state shows safe copy and renders NO caption / snapshot author / media tile", () => {
  assert.match(unavailableBranch, /This post is unavailable/);
  assert.doesNotMatch(unavailableBranch, /postPreview/);
  assert.doesNotMatch(unavailableBranch, /postAuthor/);
  assert.doesNotMatch(unavailableBranch, /msg\.postAuthor/);
  assert.doesNotMatch(unavailableBranch, /msg\.postPreview/);
  assert.doesNotMatch(unavailableBranch, /sharedPostMediaFrame/);
});

// ── Loading vs unavailable ──────────────────────────────────────────

test("11. a pending fetch shows a loading skeleton, distinguishable from the unavailable state", () => {
  assert.match(postBubbleSource, /const isResolving = !msg\.postImage && !resolvedPreview;/);
  assert.match(postBubbleSource, /if \(isResolving\) \{/);
  assert.match(loadingBranch, /styles\.sharedPostLoadingLineSm/);
  assert.doesNotMatch(loadingBranch, /This post is unavailable/);
  assert.doesNotMatch(loadingBranch, /sharedPostMediaFrame/);
});

// ── Cache / dedupe intact ─────────────────────────────────────────

test("12. the module-level preview cache and in-flight request dedupe are unchanged", () => {
  assert.match(chatSource, /const sharedPostPreviewCache = new Map<string, SharedPostPreview>\(\);/);
  assert.match(chatSource, /const sharedPostPreviewRequests = new Map<string, Promise<SharedPostPreview>>\(\);/);
  assert.match(chatSource, /const pending = sharedPostPreviewRequests\.get\(postId\);/);
  assert.match(chatSource, /sharedPostPreviewRequests\.set\(postId, request\);/);
  assert.match(chatSource, /sharedPostPreviewRequests\.delete\(postId\);/);
});

test("13. no new share data flow — the preview loader still only calls getMoment", () => {
  assert.match(chatSource, /import \{ getMoment \} from '@\/lib\/moments';/);
  assert.match(chatSource, /const request = getMoment\(postId\)/);
});

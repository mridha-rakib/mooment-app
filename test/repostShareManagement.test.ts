import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

const repostFeedCardSource = read("components/post/RepostFeedCard.tsx");
const shareModalSource = read("components/post/ShareModal.tsx");
const profileTabSource = read("app/(tabs)/profile.tsx");
const profileViewSource = read("components/profile/ProfileView.tsx");
const profileContentSource = read("components/profile/ProfileContent.tsx");

test("RepostFeedCard delete confirmation explicitly says the original content remains", () => {
  assert.match(repostFeedCardSource, /Alert\.alert\(\s*'Delete repost\?',/);
  assert.match(repostFeedCardSource, /The original content will remain\./);
  assert.match(repostFeedCardSource, /await deleteMomentShare\(share\.id\);/);
  assert.doesNotMatch(repostFeedCardSource, /deleteMoment\(share\.id\)/);
});

test("ShareModal edit mode renders the tagged-friends section and tag-picker trigger", () => {
  assert.match(shareModalSource, /<Text style=\{\[styles\.tagTitle, \{ color: colors\.text \}\]\}>Tagged friends<\/Text>/);
  assert.match(shareModalSource, /No tagged friends/);
  assert.match(shareModalSource, /onPress=\{\(\) => setShowPeopleTagModal\(true\)\}/);
});

test("Profile tab locally patches and deletes reposts by share id", () => {
  assert.match(profileTabSource, /const handleShareUpdated = useCallback\(\(updatedShare: MomentTimelineItem\) => \{/);
  assert.match(profileTabSource, /share\.id === updatedShare\.id \? updatedShare : share/);
  assert.match(profileTabSource, /const handleShareDeleted = useCallback\(\(shareId: string\) => \{/);
  assert.match(profileTabSource, /current\.filter\(\(share\) => share\.id !== shareId\)/);
});

test("ProfileView and ProfileContent pass repost update/delete callbacks through to RepostFeedCard", () => {
  assert.match(profileViewSource, /onShareUpdated=\{onShareUpdated\}/);
  assert.match(profileViewSource, /onShareDeleted=\{onShareDeleted\}/);
  assert.match(profileContentSource, /onShareUpdated=\{onShareUpdated\}/);
  assert.match(profileContentSource, /onShareDeleted=\{onShareDeleted\}/);
});
